// Migration runner with durable tracking.
//
// Usage:
//   node apply-maintenance-migrations.cjs            apply pending migrations
//   node apply-maintenance-migrations.cjs --status   show applied/pending status
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
  const retryFailed = process.argv.includes('--retry-failed');

  try {
    verifyManifest();
    await ensureTrackingTable(db);
    const applied = await appliedMap(db);

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
