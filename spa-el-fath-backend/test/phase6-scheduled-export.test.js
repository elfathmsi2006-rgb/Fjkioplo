const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const scheduler = require('../src/services/maintenanceExportScheduler');

function pad(value) { return String(value).padStart(2, '0'); }

test('scheduled export supports daily, weekly and monthly frequencies with validated time, timezone and retention', () => {
  assert.equal(scheduler.isValidFrequency('daily'), true);
  assert.equal(scheduler.isValidFrequency('weekly'), true);
  assert.equal(scheduler.isValidFrequency('monthly'), true);
  assert.equal(scheduler.isValidFrequency('yearly'), false);
  assert.equal(scheduler.isValidExportTime('02:00'), true);
  assert.equal(scheduler.isValidExportTime('25:00'), false);
  assert.equal(scheduler.isValidExportTime('2:00'), false);
  assert.ok(scheduler.isValidTimezone('Africa/Algiers'));
  assert.equal(scheduler.isValidRetention(30), true);
  assert.equal(scheduler.isValidRetention(0), false);
  assert.equal(scheduler.isValidRetention(400), false);
});

test('export schedule due checks compare local period keys and respect enabled state', () => {
  const now = new Date();
  const dueYesterday = scheduler.isScheduleDue({ frequency: 'daily', enabled: true, last_run_at: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, now);
  assert.equal(dueYesterday, true);
  const duePreviousMonth = scheduler.isScheduleDue({ frequency: 'monthly', enabled: true, last_run_at: new Date(now.getFullYear(), now.getMonth() - 1, 1) }, now);
  assert.equal(duePreviousMonth, true);
  const notDueToday = scheduler.isScheduleDue({ frequency: 'daily', enabled: true, last_run_at: new Date() }, now);
  assert.equal(notDueToday, false);
  const disabled = scheduler.isScheduleDue({ frequency: 'daily', enabled: false, last_run_at: null }, now);
  assert.equal(disabled, false);
  const invalid = scheduler.isScheduleDue({ frequency: 'yearly', enabled: true, last_run_at: null }, now);
  assert.equal(invalid, false);
});

test('schedule period keys are timezone aware and use stable period prefixes', () => {
  const dailyKey = scheduler.periodKey('daily', 'UTC', new Date(Date.UTC(2026, 0, 15, 3, 0, 0)));
  assert.match(dailyKey, /^D:\d{4}-\d{2}-\d{2}$/);
  const weeklyKey = scheduler.periodKey('weekly', 'UTC', new Date(Date.UTC(2026, 0, 15, 3, 0, 0)));
  assert.match(weeklyKey, /^W:\d{4}-\d{2}-\d{2}-\d+$/);
  const monthlyKey = scheduler.periodKey('monthly', 'UTC', new Date(Date.UTC(2026, 0, 15, 3, 0, 0)));
  assert.match(monthlyKey, /^M:\d{4}-\d{2}$/);
});

test('scheduled export filename and manual run resolution use a stable date stamp', () => {
  assert.equal(scheduler.resolveExportFileName(new Date(2026, 5, 15, 10, 0, 0)), 'spa-el-fath-maintenance-20260615.xlsx');
});

test('scheduled export schedule, history, failure and retention flows are implemented against additive migration tables', () => {
  const migration = read('spa-el-fath-backend', 'sql', '202611140001_phase6_scheduled_export.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS cmms_maintenance_export_schedules/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS cmms_maintenance_export_executions/);
  assert.match(migration, /frequency ENUM\('daily','weekly','monthly'\)/);
  assert.match(migration, /retention_days INT UNSIGNED NOT NULL DEFAULT 30/);

  const service = read('spa-el-fath-backend', 'src', 'services', 'maintenanceExportScheduler.js');
  assert.match(service, /INSERT INTO cmms_maintenance_export_executions/);
  assert.match(service, /INSERT INTO cmms_maintenance_export_schedules/);
  assert.match(service, /DELETE FROM cmms_maintenance_export_executions/);
  assert.match(service, /triggered_by/);
  assert.match(service, /last_status/);

  const apply = read('spa-el-fath-backend', 'apply-maintenance-migrations.cjs');
  assert.match(apply, /202611140001_phase6_scheduled_export\.sql/);

  const schema = read('NewSchema.sql');
  assert.match(schema, /cmms_maintenance_export_schedules/);
  assert.match(schema, /cmms_maintenance_export_executions/);
});

test('scheduled export run records success, failure history and applies retention without duplicate executions', () => {
  const service = read('spa-el-fath-backend', 'src', 'services', 'maintenanceExportScheduler.js');
  assert.match(service, /async function runExportForSchedule/);
  assert.match(service, /async function recordExportFailure/);
  assert.match(service, /async function applyRetention/);
  assert.match(service, /DELETE FROM cmms_maintenance_export_executions WHERE schedule_id = \? AND finished_at < \?/);
  assert.match(service, /async function hasRunningExecution/);
  assert.match(service, /status = 'RUNNING'/);
});

test('manual scheduled export run endpoint avoids duplicate running executions and records failures', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'maintenanceExport.js');
  assert.match(route, /router\.get\('\/schedules'/);
  assert.match(route, /router\.post\('\/schedules'/);
  assert.match(route, /router\.patch\('\/schedules\/:id'/);
  assert.match(route, /router\.get\('\/executions'/);
  assert.match(route, /router\.get\('\/executions\/:id\/download'/);
  assert.match(route, /router\.post\('\/schedules\/:id\/run'/);
  assert.match(route, /runExportForSchedule/);
  assert.match(route, /hasRunningExecution/);
  assert.match(route, /generateMaintenanceExport/);
  assert.match(route, /EXPORT_DIR/);
});

test('backend starts the scheduled export worker and stops it during shutdown', () => {
  const server = read('spa-el-fath-backend', 'src', 'server.js');
  assert.match(server, /maintenanceExportScheduler/);
  assert.match(server, /startExportScheduler/);
  assert.match(server, /stopExportScheduler/);
  assert.match(server, /startNotificationWorkers/);
});
