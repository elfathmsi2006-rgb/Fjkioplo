const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('maintenance suite migration has idempotent preventive occurrence key', () => {
  const sql = read('sql/202611010001_maintenance_suite.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS cmms_pm_occurrences/);
  assert.match(sql, /UNIQUE KEY uq_cmms_pm_occurrence \(plan_id,due_at\)/);
});
test('preventive scheduler uses existing work-order workflow and occurrence ledger', () => {
  const scheduler = read('src/services/preventiveScheduler.js');
  assert.match(scheduler, /INSERT INTO maintenance_tasks/);
  assert.match(scheduler, /cmms_pm_occurrences/);
  assert.match(scheduler, /beginTransaction/);
  assert.match(scheduler, /rollback/);
});
test('maintenance suite protects manager-only mutations and validates readings', () => {
  const route = read('src/routes/maintenanceSuite.js');
  assert.match(route, /if\(!manager\(req\)\)return res\.status\(403\)/);
  assert.match(route, /Invalid meter value/);
  assert.match(route, /Invalid condition reading/);
  assert.match(route, /Permission denied/);
});
test('backend mounts suite router and periodic scheduler', () => {
  const server = read('src/server.js');
  assert.match(server, /app\.use\('\/api\/maintenance-suite', maintenanceSuiteRouter\)/);
  assert.match(server, /setInterval\(runPreventiveScheduler, 15 \* 60 \* 1000\)/);
});
test('historical interventions dashboard is read-only, admin-protected and mounted', () => {
  const server = read('src/server.js');
  const route = read('src/routes/interventions.js');
  assert.match(server, /app\.use\('\/api\/interventions', interventionsRouter\)/);
  assert.match(route, /router\.use\(requireAuth\)/);
  assert.match(route, /router\.get\('\/dashboard'/);
  assert.match(route, /req\.user\?\.role !== 'admin'/);
  assert.match(route, /FROM interventions/);
  assert.doesNotMatch(route, /\b(?:INSERT|UPDATE|DELETE|DROP|TRUNCATE)\s+INTO?\s+interventions\b/i);
});
test('preventive task closure checks required checklist results before completing', () => {
  const route = read('src/routes/maintenanceLogs.js');
  assert.match(route, /SELECT id, status, technician_id, maintenance_type FROM maintenance_tasks/);
  assert.match(route, /cmms_pm_occurrences WHERE task_id/);
  assert.match(route, /cmms_work_order_checklist_results/);
  assert.match(route, /Required checklist item is incomplete or failed without notes/);
});
test('checklist results must belong to the generated occurrence plan for the task', () => {
  const route = read('src/routes/maintenanceSuite.js');
  assert.match(route, /JOIN cmms_pm_occurrences o ON o\.task_id=t\.id AND o\.plan_id=i\.plan_id/);
});


test('operations reuses the live warehouse, production, and audit tables instead of parallel copies', () => {
  const route = read('src/routes/operations.js');
  const migration = read('sql/202610310001_phase_2_5_data_modules.sql');
  assert.match(route, /FROM warehouse_parts/);
  assert.match(route, /INSERT INTO warehouse_movements/);
  assert.match(route, /FROM production_records/);
  assert.match(route, /INSERT INTO audit_trail/);
  assert.doesNotMatch(migration, /CREATE TABLE IF NOT EXISTS cmms_spare_parts/);
  assert.doesNotMatch(migration, /CREATE TABLE IF NOT EXISTS cmms_stock_movements/);
  assert.doesNotMatch(migration, /CREATE TABLE IF NOT EXISTS cmms_production_records/);
  assert.doesNotMatch(migration, /CREATE TABLE IF NOT EXISTS cmms_audit_events/);
});

test('maintenance work-order parts use the existing warehouse parts catalogue', () => {
  const route = read('src/routes/maintenanceSuite.js');
  assert.match(route, /FROM warehouse_parts WHERE id=\? FOR UPDATE/);
  assert.match(route, /JOIN warehouse_parts sp ON sp.id=wp.part_id/);
  assert.match(route, /INSERT INTO warehouse_movements/);
  assert.doesNotMatch(route, /FROM cmms_spare_parts/);
});
