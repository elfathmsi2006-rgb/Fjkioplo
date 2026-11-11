require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');

const dump = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe';
const output = path.join(__dirname, 'spa_el_fath_backup_before_migration.sql');

const args = [
  '--host=' + (process.env.DB_HOST || 'localhost'),
  '--port=' + (process.env.DB_PORT || 3306),
  '--user=' + process.env.DB_USER,
  '--single-transaction',
  '--routines',
  '--triggers',
  '--events',
  '--databases',
  process.env.DB_NAME,
  '--result-file=' + output
];

const result = spawnSync(dump, args, {
  env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' },
  encoding: 'utf8'
});

if (result.status !== 0) {
  console.error('Backup failed:', result.stderr || result.error?.message);
  process.exitCode = 1;
} else {
  const fs = require('fs');
  console.log('Backup created successfully.');
  console.log('File:', output);
  console.log('Size:', fs.statSync(output).size, 'bytes');
}
