// Applies a single additive migration file and records it in schema_migrations,
// using the same checksum + splitter as apply-maintenance-migrations.cjs.
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { splitSqlScript } = require('./src/utils/sqlScript');

const FILE = process.argv[2];
if (!FILE) { console.error('usage: node __apply-one-migration.cjs <sql file>'); process.exit(1); }

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });

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

  const source = fs.readFileSync(path.join(__dirname, 'sql', FILE), 'utf8');
  const checksum = crypto.createHash('sha256').update(source, 'utf8').digest('hex');
  const statements = splitSqlScript(source);

  const started = Date.now();
  try {
    for (const statement of statements) await db.query(statement);
    await db.query(
      `INSERT INTO schema_migrations (filename, checksum, status, applied_at, execution_ms, error)
       VALUES (?, ?, 'APPLIED', NOW(), ?, NULL)
       ON DUPLICATE KEY UPDATE checksum=VALUES(checksum), status='APPLIED', applied_at=NOW(), execution_ms=VALUES(execution_ms), error=NULL`,
      [FILE, checksum, Date.now() - started]
    );
    console.log(`APPLIED ${FILE} (${statements.length} statements, ${Date.now() - started} ms)`);
  } catch (error) {
    await db.query(
      `INSERT INTO schema_migrations (filename, checksum, status, applied_at, execution_ms, error)
       VALUES (?, ?, 'FAILED', NOW(), ?, ?)
       ON DUPLICATE KEY UPDATE checksum=VALUES(checksum), status='FAILED', error=VALUES(error)`,
      [FILE, checksum, Date.now() - started, String(error.message).slice(0, 1000)]
    );
    console.error(`FAILED ${FILE}: ${error.code} ${error.message}`);
    await db.end();
    process.exit(1);
  }

  const [tables] = await db.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'cmms_maintenance_export%'"
  );
  console.log('export tables now present:', tables.map(t => t.TABLE_NAME).join(', ') || 'NONE');
  await db.end();
})().catch(e => { console.error('ERROR:', e.code, e.message); process.exit(1); });
