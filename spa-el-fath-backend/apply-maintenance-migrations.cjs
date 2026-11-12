// Migration runner with durable tracking.
//
// Usage:
//   node apply-maintenance-migrations.cjs            apply pending migrations
//   node apply-maintenance-migrations.cjs --status   show applied/pending status
//   node apply-maintenance-migrations.cjs --verify   read-only schema preflight check (no DDL)
//   node apply-maintenance-migrations.cjs --retry-failed  retry a reviewed FAILED migration
//
// Safety rules:
//   * Migrations are additive and repeat-safe. Never drop tables or data here.
//   * Every applied file is recorded in schema_migrations with a SHA-256 checksum.
//   * An already-applied migration whose file content changed is rejected instead
//     of being silently re-run, because that would hide a partial schema state.
//   * A failed migration is recorded as FAILED with the exact SQL error. Fix the
//     cause, then re-run; only successful files are marked APPLIED.
//
// Rollback guidance (manual, requires a reviewed backup):
//   1. Stop the backend.
//   2. Restore the database backup taken before the deployment.
//   3. Remove the affected filename row from schema_migrations only if the schema
//      was restored independently. Never reverse a migration by dropping columns
//      that may contain production data.
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { splitSqlScript } = require('./src/utils/sqlScript');

// Curated deployment order. Timestamped files are ordered by name; the legacy
// un-timestamped file is pinned where it originally ran to keep upgrades stable.
const MIGRATIONS = [
  '202610270001_cmms_workflow_enhancements.sql',
  '202610310001_phase_2_5_data_modules.sql',
  '202611010001_maintenance_suite.sql',
  'whatsapp_notification_status_migration.sql',
  '202611040001_workshop_details.sql',
  '202611050001_email_notifications.sql',
  '202611080001_operations_hub_persistence.sql',
  '202611090001_phase1_control_center.sql',
  '202611110001_phase1_core_fixes.sql',
  '202611120001_phase2_security.sql',
  '202611130001_phase4_hidden_failures.sql',
  '202611140001_phase6_scheduled_export.sql',
  // Additive, idempotent forward-only recovery; does not alter prior migrations.
  '202611150001_phase1_missing_schema_forward.sql',
];

const checksum = source => crypto.createHash('sha256').update(source, 'utf8').digest('hex');

async function ensureTrackingTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(200) NOT NULL,
      checksum CHAR(64) NOT NULL,
      status ENUM('APPLIED','FAILED') NOT NULL DEFAULT 'APPLIED',
      applied_at DATETIME NULL,
      execution_ms INT UNSIGNED NOT NULL DEFAULT 0,
      error TEXT NULL,
      PRIMARY KEY (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function appliedMap(db) {
  const [rows] = await db.query('SELECT filename, checksum, status, applied_at, execution_ms, error FROM schema_migrations');
  return new Map(rows.map(row => [row.filename, row]));
}

// Expired and already-used reset tokens have no operational value. Active,
// unexpired tokens are never touched.
async function cleanupExpiredResetTokens(db) {
  try {
    const [result] = await db.query(
      'DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL OR expires_at < NOW()'
    );
    if (result.affectedRows) console.log(`Cleanup: removed ${result.affectedRows} expired/used password reset token(s).`);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return;
    throw error;
  }
}

function verifyManifest() {
  const seen = new Set();
  for (const file of MIGRATIONS) {
    if (seen.has(file)) throw new Error(`Duplicate migration in manifest: ${file}`);
    seen.add(file);
    if (!fs.existsSync(path.join(__dirname, 'sql', file))) {
      throw new Error(`Migration listed in manifest but missing on disk: sql/${file}`);
    }
  }

  const unregistered = fs.readdirSync(path.join(__dirname, 'sql'))
    .filter(file => file.endsWith('.sql') && !seen.has(file));
  if (unregistered.length) {
    console.warn(`WARNING: SQL files on disk are not registered and will not run: ${unregistered.join(', ')}`);
  }
}

// Read-only preflight. Checks the structures every maintenance API path depends on.
// Never executes DDL; for use before and after deployment.
const REQUIRED_SCHEMA = [
  ['maintenance_tasks', ['id', 'title', 'maintenance_type', 'machine_id', 'technician_id', 'workshop_id', 'assigned_by', 'priority', 'status', 'due_date', 'started_at', 'completed_at', 'blocked_reason', 'escalated_at', 'created_at', 'updated_at']],
  ['maintenance_logs', ['id', 'technician_id', 'maintenance_date', 'machine_id', 'machine_name', 'workshop_id', 'description', 'task_id', 'maintenance_type', 'cost', 'duration_hours', 'problem_description', 'work_performed', 'diagnosis', 'started_at', 'completed_at', 'downtime_start', 'downtime_end', 'submitted_at', 'submission_status', 'idempotency_key', 'created_by_user_id', 'updated_at']],
  ['maintenance_log_attachments', ['id', 'maintenance_log_id', 'attachment_type', 'original_filename', 'storage_key', 'mime_type', 'size_bytes', 'sha256', 'created_at']],
  ['cmms_preventive_plans', ['id', 'machine_id', 'title', 'frequency_days', 'next_due_at', 'active', 'created_by', 'created_at', 'updated_at']],
  ['cmms_pm_occurrences', ['id', 'plan_id', 'due_at', 'task_id', 'occurrence_status', 'created_at']],
  ['cmms_pm_checklist_items', ['id', 'plan_id', 'title', 'required', 'minimum_value', 'maximum_value', 'active']],
  ['cmms_work_order_checklist_results', ['id', 'task_id', 'checklist_item_id', 'result', 'measured_value', 'notes']],
  ['cmms_breakdown_reports', ['id', 'machine_id', 'task_id', 'reported_at', 'severity', 'symptom', 'root_cause', 'corrective_action', 'outcome', 'downtime_minutes', 'reported_by']],
  ['cmms_work_order_parts', ['id', 'task_id', 'part_id', 'quantity', 'unit_cost', 'status', 'created_by', 'created_at']],
  ['cmms_machine_meter_readings', ['id', 'machine_id', 'meter_type', 'reading_value', 'reading_at', 'source', 'recorded_by']],
  ['cmms_condition_readings', ['id', 'machine_id', 'metric', 'value_num', 'unit', 'measured_at', 'source', 'threshold_min', 'threshold_max', 'recorded_by']],
  ['cmms_maintenance_manual_links', ['id', 'machine_id', 'title', 'document_url', 'document_type', 'active', 'created_by']],
  ['cmms_safety_inspections', ['id', 'title', 'machine_id', 'inspection_date', 'result', 'created_by']],
  ['cmms_machine_documents', ['id', 'title', 'machine_id', 'document_type', 'file_location', 'created_by']],
  ['cmms_hidden_failure_findings', ['id', 'fingerprint', 'machine_id', 'category', 'risk_level', 'risk_score', 'status', 'detected_at']],
  ['cmms_maintenance_export_schedules', ['id', 'frequency', 'export_time', 'timezone', 'enabled', 'last_run_at', 'retention_days']],
  ['cmms_maintenance_export_executions', ['id', 'schedule_id', 'status', 'filename', 'triggered_by', 'started_at']],
  ['warehouse_parts', ['id', 'sku', 'name', 'stock_quantity', 'minimum_quantity', 'unit_cost', 'created_by_user_id']],
  ['warehouse_movements', ['id', 'part_id', 'movement_type', 'quantity', 'reason', 'created_by_user_id']],
  ['technicians', ['id', 'name', 'user_id', 'skill', 'shift_name', 'attendance_status', 'active']],
  ['machines', ['id', 'code', 'name', 'workshop_id', 'state']],
  ['workshops', ['id', 'name']],
  ['users', ['id', 'full_name', 'email', 'password_hash', 'role_id', 'active', 'token_version']],
  ['password_reset_tokens', ['id', 'user_id', 'token_hash', 'expires_at', 'used_at']],
  ['revoked_sessions', ['jti', 'user_id', 'expires_at']],
  ['audit_trail', ['id', 'table_name', 'record_id', 'action', 'actor_id', 'created_at']],
];
const REQUIRED_ENUMS = [
  ['maintenance_tasks', 'status', ['PENDING', 'WAITING_PARTS', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']],
  ['maintenance_tasks', 'priority', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']],
  ['maintenance_tasks', 'maintenance_type', ['CORRECTIVE', 'PREVENTIVE']],
  ['maintenance_logs', 'maintenance_type', ['CORRECTIVE', 'PREVENTIVE']],
  ['maintenance_logs', 'submission_status', ['DRAFT', 'SUBMITTED']],
  ['cmms_work_order_parts', 'status', ['RESERVED', 'ISSUED', 'RETURNED', 'CANCELLED']],
];

async function verifySchema(db) {
  const [tables] = await db.query(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
  );
  const present = new Set(tables.map(row => row.TABLE_NAME));
  const failures = [];
  // Deployed-file drift: if a file changed after it was applied, refreshing it would
  // silently hide schema state problems. Report before any migration is run.
  try {
    const applied = await appliedMap(db);
    for (const file of MIGRATIONS) {
      const record = applied.get(file);
      if (!record) continue;
      const sql = fs.readFileSync(path.join(__dirname, 'sql', file), 'utf8');
      if (checksum(sql) !== record.checksum) {
        failures.push(`checksum drift: ${file} (record says ${record.status}, applied file content differs)`);
      }
    }
  } catch (error) {
    failures.push(`could not verify migration checksums: ${error.message}`);
  }
  for (const [table, columns] of REQUIRED_SCHEMA) {
    if (!present.has(table)) {
      failures.push(`missing table: ${table}`);
      continue;
    }
    const [cols] = await db.query(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      [table]
    );
    const names = new Set(cols.map(row => row.COLUMN_NAME));
    for (const column of columns) {
      if (!names.has(column)) failures.push(`missing column: ${table}.${column}`);
    }
  }
  for (const [table, column, expected] of REQUIRED_ENUMS) {
    if (!present.has(table)) continue;
    const [rows] = await db.query(
      'SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [table, column]
    );
    const actual = rows.length ? rows[0].COLUMN_TYPE : '';
    if (!expected.every(value => actual.includes(`'${value}'`))) {
      failures.push(`enum ${table}.${column} missing value(s): ${expected.join(', ')} (actual: ${actual || 'column missing'})`);
    }
  }
  if (failures.length) {
    console.error('SCHEMA VERIFICATION FAILED:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 2;
    return;
  }
  console.log('SCHEMA VERIFICATION PASSED: all required maintenance tables, columns and enum values are present.');
}

function printStatus(rows) {
  const width = Math.max(20, ...MIGRATIONS.map(file => file.length));
  console.log(`${'MIGRATION'.padEnd(width)}  STATUS   APPLIED AT`);
  for (const file of MIGRATIONS) {
    const row = rows.get(file);
    const status = row ? row.status : 'PENDING';
    const appliedAt = row?.applied_at ? new Date(row.applied_at).toISOString() : '-';
    console.log(`${file.padEnd(width)}  ${status.padEnd(7)}  ${appliedAt}`);
  }
}

(async () => {
  if (!process.env.DB_NAME || !process.env.DB_USER) {
    throw new Error('DB_NAME and DB_USER must be configured in spa-el-fath-backend/.env.');
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false,
  });

  const statusOnly = process.argv.includes('--status');
  const verifyOnly = process.argv.includes('--verify');
  const retryFailed = process.argv.includes('--retry-failed');

  try {
    verifyManifest();
    await ensureTrackingTable(db);
    const applied = await appliedMap(db);

    if (verifyOnly) {
      await verifySchema(db);
      return;
    }

    if (statusOnly) {
      printStatus(applied);
      return;
    }

    for (const file of MIGRATIONS) {
      const sql = fs.readFileSync(path.join(__dirname, 'sql', file), 'utf8');
      const fileChecksum = checksum(sql);
      const record = applied.get(file);

      if (record && record.status === 'APPLIED') {
        if (record.checksum !== fileChecksum) {
          throw new Error(
            `Checksum mismatch for already-applied ${file}. The file changed after deployment. ` +
            'Restore the previously deployed copy or add a new migration; do not edit history in place.'
          );
        }
        console.log(`SKIP: ${file} (already applied)`);
        continue;
      }

      if (record && record.status === 'FAILED' && !retryFailed) {
        throw new Error(
          `${file} previously failed: ${record.error || 'unknown error'}. ` +
          'Review the partial schema state, then re-run with --retry-failed once it is safe to continue.'
        );
      }

      const statements = splitSqlScript(sql);
      const startedAt = Date.now();
      let index = -1;
      try {
        for (index = 0; index < statements.length; index += 1) {
          await db.query(statements[index]);
        }
      } catch (error) {
        const message = `statement ${index + 1}/${statements.length}: ${error.message}`;
        await db.query(
          `INSERT INTO schema_migrations (filename, checksum, status, applied_at, execution_ms, error)
           VALUES (?, ?, 'FAILED', NULL, ?, ?)
           ON DUPLICATE KEY UPDATE checksum = VALUES(checksum), status = 'FAILED',
             applied_at = NULL, execution_ms = VALUES(execution_ms), error = VALUES(error)`,
          [file, fileChecksum, Date.now() - startedAt, message.slice(0, 4000)]
        );
        console.error(`FAILED: ${file} (${message})`);
        console.error('Fix the reported statement, then re-run. Restore a reviewed backup if a partial schema change must be undone.');
        throw error;
      }

      await db.query(
        `INSERT INTO schema_migrations (filename, checksum, status, applied_at, execution_ms, error)
         VALUES (?, ?, 'APPLIED', NOW(), ?, NULL)
         ON DUPLICATE KEY UPDATE checksum = VALUES(checksum), status = 'APPLIED',
           applied_at = NOW(), execution_ms = VALUES(execution_ms), error = NULL`,
        [file, fileChecksum, Date.now() - startedAt]
      );
      console.log(`SUCCESS: ${file} (${statements.length} SQL statements)`);
    }

    await cleanupExpiredResetTokens(db);
    console.log('ALL MIGRATIONS COMPLETED.');
  } finally {
    await db.end();
  }
})().catch(error => {
  console.error('MIGRATION FAILED:', error.message);
  process.exitCode = 1;
});
