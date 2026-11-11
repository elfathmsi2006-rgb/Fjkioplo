require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [rows] = await db.query(`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('machines','users','maintenance_tasks','warehouse_parts')
      AND COLUMN_NAME = 'id'
    ORDER BY TABLE_NAME
  `);

  console.table(rows);
  await db.end();
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
