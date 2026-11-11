const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('workflow migration conditionally adds existing-schema columns instead of failing on duplicates', () => {
  const sql = read('spa-el-fath-backend', 'sql', '202610270001_cmms_workflow_enhancements.sql');
  assert.match(sql, /information_schema\.COLUMNS/i);
  assert.match(sql, /cmms_add_column_if_missing\('machines','technician_description'/);
  assert.match(sql, /cmms_add_column_if_missing\('maintenance_logs','task_id'/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS maintenance_log_attachments/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS machine_technical_manuals/i);
});

test('maintenance suite FK machine IDs match machines.id INT UNSIGNED', () => {
  const sql = read('spa-el-fath-backend', 'sql', '202611010001_maintenance_suite.sql');
  assert.doesNotMatch(sql, /machine_id BIGINT UNSIGNED/);
  assert.match(sql, /FOREIGN KEY \(machine_id\) REFERENCES machines\(id\)/);
});

test('analytics and audit pages are admin-only while production remains available to production chief', () => {
  const permissions = read('spa-el-fath-frontend', 'src', 'utils', 'permissions.ts');
  assert.match(permissions, /ADMIN_ONLY = new Set\(\['\/users', '\/settings', '\/analytics', '\/audit-trail'\]\)/);
  assert.match(permissions, /if \(role === 'production_chief'\) return true/);
  assert.match(permissions, /if \(path\.startsWith\('\/machines\/'\)\) return true/);
});

test('warehouse and production pages use authenticated server APIs instead of browser-only writes in authenticated sessions', () => {
  const warehouse = read('spa-el-fath-frontend', 'src', 'pages', 'WarehousePage.tsx');
  const production = read('spa-el-fath-frontend', 'src', 'pages', 'ProductionPage.tsx');
  assert.match(warehouse, /\/api\/operations\/spare-parts/);
  assert.match(warehouse, /\/api\/operations\/stock-movements/);
  assert.match(production, /\/api\/operations\/production-records/);
  assert.match(production, /credentials:'include'/);
  assert.doesNotMatch(warehouse, /localStorage\.setItem|indusflow-warehouse-v1/);
  assert.doesNotMatch(production, /localStorage\.setItem|indusflow-production-v1/);
});

test('production record reads and writes are restricted to admin and production chief', () => {
  const operations = read('spa-el-fath-backend', 'src', 'routes', 'operations.js');
  assert.match(operations, /router\.get\('\/production-records', async\(req,res\)=>\{if\(!\['admin','production_chief'\]\.includes\(req\.user\?\.role\)\)/);
  assert.match(operations, /router\.post\('\/production-records', async\(req,res\)=>\{if\(!\['admin','production_chief'\]\.includes\(req\.user\?\.role\)\)/);
  assert.match(operations, /production_records',String\(recordId\),'DELETE'/);
});

test('zero quantity is allowed for exact-stock adjustment but not for inbound/outbound movement', () => {
  const operations = read('spa-el-fath-backend', 'src', 'routes', 'operations.js');
  assert.match(operations, /positive\(b\.quantity,'quantity',type==='ADJUST'\)/);
});

test('breakdown reports are audited and enqueue technician email notifications', () => {
  const suite = read('spa-el-fath-backend', 'src', 'routes', 'maintenanceSuite.js');
  const notifications = read('spa-el-fath-backend', 'src', 'services', 'maintenanceNotifications.js');
  assert.match(suite, /router\.post\('\/breakdowns'/);
  assert.match(suite, /INSERT INTO audit_trail/);
  assert.match(suite, /enqueueBreakdown\(c, machines\[0\]/);
  assert.match(notifications, /type: 'MACHINE_BREAKDOWN'/);
  assert.match(notifications, /recipient_email/);
  assert.match(notifications, /sendNotificationEmail/);
  assert.match(notifications, /Severity: \$\{safeText\(report\.severity/);
});

test('maintenance UI exposes preventive plans, checklist results, breakdowns, meter/condition readings and work-order parts', () => {
  const ui = read('spa-el-fath-frontend', 'src', 'components', 'maintenance', 'MaintenanceSuiteTools.tsx');
  for (const route of ['/api/operations/preventive-plans', '/api/maintenance-suite/breakdowns', '/api/maintenance-suite/meter-readings', '/api/maintenance-suite/condition-readings', '/parts/reserve', '/checklist-results', '/manual-links']) {
    assert.ok(ui.includes(route), `Missing UI integration for ${route}`);
  }
});

test('dashboard analytics charts and manager briefing render only for admin', () => {
  const dashboard = read('spa-el-fath-frontend', 'src', 'pages', 'DashboardPage.tsx');
  assert.match(dashboard, /role === 'admin' && <div className="dashboard-charts">/);
  assert.match(dashboard, /role === 'admin' && <section className="manager-briefing panel"/);
  assert.match(dashboard, /role === 'admin' && <article className="panel"><div className="panel-heading"><div><h2>\{t\('monthlyMaintenance'\)\}/);
});
test('dashboard adds historical intervention charts without replacing current maintenance charts', () => {
  const dashboard = read('spa-el-fath-frontend', 'src', 'pages', 'DashboardPage.tsx');
  assert.match(dashboard, /api\/interventions\/dashboard/);
  assert.match(dashboard, /interventionData\?\.causes/);
  assert.match(dashboard, /interventionData\?\.machines/);
  assert.match(dashboard, /interventionData\?\.workshops/);
  assert.match(dashboard, /interventionData\?\.technicians/);
  assert.match(dashboard, /dataKey="historicalCount"/);
});

test('preventive plan read access is authenticated but creation remains manager-only', () => {
  const operations = read('spa-el-fath-backend', 'src', 'routes', 'operations.js');
  assert.match(operations, /router\.use\(requireAuth\)/);
  assert.match(operations, /router\.get\('\/preventive-plans', async\(req,res\)=>\{try\{/);
  assert.match(operations, /router\.post\('\/preventive-plans'/);
  assert.match(operations, /if\(!canManage\(req\)\)return res\.status\(403\)/);
});


test('manual PDF upload is feature-flagged, size-limited, validated and audited', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'machineFeatures.js');
  assert.match(route, /router\.post\('\/:machineId\/manuals', express\.raw\(\{ type: \['application\/pdf'\], limit: '25mb' \}\)/);
  assert.match(route, /subarray\(0, 5\)\.toString\('ascii'\) !== '%PDF-'/);
  assert.match(route, /INSERT INTO machine_technical_manuals/);
  assert.match(route, /INSERT INTO audit_trail/);
  assert.match(route, /fs\.promises\.unlink\(absolutePath\)/);
});

test('maintenance notifications use Gmail email delivery and keep queued jobs until an admin sender is connected', () => {
  const service = read('spa-el-fath-backend', 'src', 'services', 'maintenanceNotifications.js');
  const sender = read('spa-el-fath-backend', 'src', 'services', 'gmailSender.js');
  const migration = read('spa-el-fath-backend', 'sql', '202611050001_email_notifications.sql');
  const server = read('spa-el-fath-backend', 'src', 'server.js');
  assert.match(service, /recipient_email/);
  assert.match(service, /sendNotificationEmail/);
  assert.match(service, /hasSystemGmailConnection/);
  assert.match(sender, /r\.id = 1/);
  assert.match(migration, /recipient_email/);
  assert.doesNotMatch(server, /whatsappWebhookRouter/);
});

test('email notification settings are administrator-controlled and disabled events are skipped', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'communications.js');
  const service = read('spa-el-fath-backend', 'src', 'services', 'maintenanceNotifications.js');
  const migration = read('spa-el-fath-backend', 'sql', '202611050001_email_notifications.sql');
  assert.match(route, /router\.get\('\/notifications\/settings'/);
  assert.match(route, /router\.put\('\/notifications\/settings\/:type'/);
  assert.match(service, /This notification type is disabled by an administrator/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS maintenance_notification_settings/);
});

test('administrator settings page exposes Gmail connection, delivery test, event switches and email history', () => {
  const page = read('spa-el-fath-frontend', 'src', 'pages', 'SettingsPage.tsx');
  assert.match(page, /gmail\/connect-url/);
  assert.match(page, /gmail\/test/);
  assert.match(page, /notifications\/settings/);
  assert.match(page, /notificationRows\.map/);
  assert.doesNotMatch(page, /\['whatsapp'/i);
});

test('legacy provider-status migration conditionally checks existing columns and index', () => {
  const sql = read('spa-el-fath-backend', 'sql', 'whatsapp_notification_status_migration.sql');
  assert.match(sql, /information_schema\.COLUMNS/i);
  assert.match(sql, /information_schema\.STATISTICS/i);
  assert.match(sql, /cmms_add_notification_column_if_missing/);
});


test('server-side reliability analytics remain administrator-only and report PM compliance, MTTR, downtime and repeat-failure candidates', () => {
  const suite = read('spa-el-fath-backend', 'src', 'routes', 'maintenanceSuite.js');
  assert.match(suite, /router\.get\('\/analytics'/);
  assert.match(suite, /req\.user\?\.role!=='admin'/);
  assert.match(suite, /AVG\(CASE WHEN maintenance_type='CORRECTIVE' AND duration_hours>0 THEN duration_hours END\) AS mttr_hours/);
  assert.match(suite, /preventiveCompliance/);
  assert.match(suite, /recordedDowntimeHours/);
  assert.match(suite, /maintenance_cost/);
  assert.match(suite, /topFailures/);
  assert.match(suite, /Not calculated: this schema does not provide validated machine operating exposure/);
});

test('preventive plans can be paused or reactivated through a manager-only audited update endpoint', () => {
  const operations = read('spa-el-fath-backend', 'src', 'routes', 'operations.js');
  const ui = read('spa-el-fath-frontend', 'src', 'components', 'maintenance', 'MaintenanceSuiteTools.tsx');
  assert.match(operations, /router\.put\('\/preventive-plans\/:id'/);
  assert.match(operations, /SELECT \* FROM cmms_preventive_plans WHERE id=\? FOR UPDATE/);
  assert.match(operations, /INSERT INTO audit_trail .*cmms_preventive_plans/s);
  assert.match(ui, /togglePlan/);
  assert.match(ui, /Pause/);
  assert.match(ui, /Activate/);
});

test('analytics page requests authenticated server metrics and displays a real-data disclaimer for MTBF and availability', () => {
  const ui = read('spa-el-fath-frontend', 'src', 'pages', 'AnalyticsPage.tsx');
  assert.match(ui, /\/api\/maintenance-suite\/analytics\?days=/);
  assert.match(ui, /credentials: 'include'/);
  assert.match(ui, /Verified server maintenance indicators/);
  assert.match(ui, /MTBF and time-based availability remain unavailable/);
});

test('full maintenance scenario has contracts for breakdown reporting, work order, checklist, parts, log submission and analytics', () => {
  const suite = read('spa-el-fath-backend', 'src', 'routes', 'maintenanceSuite.js');
  const tasks = read('spa-el-fath-backend', 'src', 'routes', 'tasks.js');
  const logs = read('spa-el-fath-backend', 'src', 'routes', 'maintenanceLogs.js');
  const operations = read('spa-el-fath-backend', 'src', 'routes', 'operations.js');
  assert.match(suite, /router\.post\('\/breakdowns'/);
  assert.match(tasks, /router\.post\('\/'/);
  assert.match(suite, /router\.post\('\/tasks\/:taskId\/checklist-results'/);
  assert.match(suite, /router\.post\('\/tasks\/:taskId\/parts\/reserve'/);
  assert.match(suite, /router\.post\('\/parts\/:reservationId\/issue'/);
  assert.match(logs, /router\.post\('\/:id\/submit'/);
  assert.match(logs, /Required checklist item is incomplete or failed without notes/);
  assert.match(operations, /router\.post\('\/stock-movements'/);
  assert.match(suite, /router\.get\('\/analytics'/);
});


test('machine status changes in list and detail use the existing authenticated database update service', () => {
  const list = read('spa-el-fath-frontend', 'src', 'pages', 'MachinesPage.tsx');
  const detail = read('spa-el-fath-frontend', 'src', 'pages', 'MachineDetailPage.tsx');
  assert.match(list, /saveMachineRecord\(\{ \.\.\.machine, status \}, workshop\.name, machine\.id\)/);
  assert.match(list, /updateSelectedStatus/);
  assert.match(detail, /saveMachineRecord\(\{ \.\.\.machine, status \}, workshop\.name, machine\.id\)/);
  assert.doesNotMatch(list, /setMachines\(current => current\.map\(item => item\.id === machine\.id \? \{ \.\.\.item, status \} : item\)\)/);
});

test('workshop details are returned by the API and saved server-side with an additive migration', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'workshops.js');
  const ui = read('spa-el-fath-frontend', 'src', 'pages', 'WorkshopsPage.tsx');
  const service = read('spa-el-fath-frontend', 'src', 'services', 'workshops.ts');
  const migration = read('spa-el-fath-backend', 'sql', '202611040001_workshop_details.sql');
  assert.match(route, /router\.put\('\/:id'/);
  assert.match(route, /manager_phone/);
  assert.match(route, /EDIT_ROLES/);
  assert.match(ui, /await saveWorkshopRecord/);
  assert.match(service, /method: 'PUT'/);
  for (const column of ['name_fr', 'name_en', 'manager', 'manager_phone', 'location']) assert.ok(migration.includes(`'${column}'`));
});

test('database migration runner applies all ordered CMMS migrations including workshop details', () => {
  const runner = read('spa-el-fath-backend', 'apply-maintenance-migrations.cjs');
  for (const file of ['202610270001_cmms_workflow_enhancements.sql', '202610310001_phase_2_5_data_modules.sql', '202611010001_maintenance_suite.sql', 'whatsapp_notification_status_migration.sql', '202611040001_workshop_details.sql', '202611050001_email_notifications.sql', '202611080001_operations_hub_persistence.sql']) assert.ok(runner.includes(file));
});


test('workshop heads may edit machine records but cannot delete machines through direct API calls', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'machines.js');
  assert.match(route, /const EDIT_ROLES = new Set\(\['admin', 'production_chief', 'workshop_head'\]\)/);
  assert.match(route, /const DELETE_ROLES = new Set\(\['admin', 'production_chief'\]\)/);
  assert.match(route, /router\.put\('\/:id', canEdit/);
  assert.match(route, /router\.delete\('\/:id', canDelete/);
});


test('migration SQL splitter respects custom DELIMITER blocks and preserves internal semicolons', () => {
  const { splitSqlScript } = require('../src/utils/sqlScript');
  const sql = [
    'DELIMITER //',
    'CREATE PROCEDURE p() BEGIN',
    "  SET @value = 'a;b';",
    '  SELECT 1;',
    'END//',
    'DELIMITER ;',
    'CREATE TABLE t (id INT);',
  ].join('\n');
  const statements = splitSqlScript(sql);
  assert.equal(statements.length, 2);
  assert.match(statements[0], /SELECT 1;/);
  assert.match(statements[1], /CREATE TABLE t/);
});


test('legacy French machine states are normalized instead of being silently displayed as working', () => {
  const provider = read('spa-el-fath-frontend', 'src', 'app', 'AppProvider.tsx');
  const service = read('spa-el-fath-frontend', 'src', 'services', 'machines.ts');
  assert.match(provider, /hors service/);
  assert.match(provider, /en atn/);
  assert.match(service, /hors service/);
  assert.match(service, /en atn/);
});

test('settings backup import cannot falsely overwrite server-backed data in authenticated mode', () => {
  const settings = read('spa-el-fath-frontend', 'src', 'pages', 'SettingsPage.tsx');
  assert.match(settings, /if \(!localPreviewMode\)/);
  assert.match(settings, /Importing a backup into MySQL is not supported by this UI/);
});


test('machine and workshop writes are recorded in the existing audit trail transactionally', () => {
  const machines = read('spa-el-fath-backend', 'src', 'routes', 'machines.js');
  const workshops = read('spa-el-fath-backend', 'src', 'routes', 'workshops.js');
  assert.match(machines, /writeMachineAudit\(connection, req, result\.insertId, 'INSERT'/);
  assert.match(machines, /writeMachineAudit\(connection, req, id, 'UPDATE'/);
  assert.match(machines, /writeMachineAudit\(connection, req, id, 'DELETE'/);
  assert.match(workshops, /INSERT INTO audit_trail/);
  assert.match(workshops, /beginTransaction\(\)/);
  assert.match(workshops, /connection\.commit\(\)/);
});


test('work-order editing and deletion are enforced server-side for role IDs 1 and 2 only', () => {
  const tasks = read('spa-el-fath-backend', 'src', 'routes', 'tasks.js');
  assert.match(tasks, /function canEditWorkOrders\(req\)/);
  assert.match(tasks, /roleId === 1 \|\| roleId === 2/);
  assert.match(tasks, /router\.put\('\/:id'/);
  assert.match(tasks, /router\.delete\('\/:id'/);
  assert.match(tasks, /Only role ID 1 or 2 may edit work orders/);
  assert.match(tasks, /Only role ID 1 or 2 may delete work orders/);
  assert.match(tasks, /INSERT INTO audit_trail/);
});

test('Operations Hub safety, documents, preventive plans and technician profiles expose persistent APIs', () => {
  const operations = read('spa-el-fath-backend', 'src', 'routes', 'operations.js');
  const technicians = read('spa-el-fath-backend', 'src', 'routes', 'technicians.js');
  const migration = read('spa-el-fath-backend', 'sql', '202611080001_operations_hub_persistence.sql');
  for (const route of ['/safety-inspections', '/machine-documents', '/preventive-plans/:id']) assert.ok(operations.includes(route));
  assert.match(technicians, /router\.put\('\/:id'/);
  for (const table of ['cmms_safety_inspections', 'cmms_machine_documents', 'user_preferences']) assert.ok(migration.includes(table));
});

test('session JWT is stored in HttpOnly cookie and frontend does not persist bearer tokens', () => {
  const server = read('spa-el-fath-backend', 'src', 'server.js');
  const auth = read('spa-el-fath-backend', 'src', 'middleware', 'auth.js');
  const app = read('spa-el-fath-frontend', 'src', 'app', 'AppProvider.tsx');
  assert.match(server, /res\.cookie\('elfath_session', token, \{ httpOnly: true/);
  assert.match(server, /credentials: true/);
  assert.match(auth, /cookies\.elfath_session/);
  assert.match(app, /api\/auth\/me/);
  assert.doesNotMatch(app, /localStorage\.setItem\(TOKEN_KEY/);
});

test('Operations Hub no longer stores its records in localStorage', () => {
  const hub = read('spa-el-fath-frontend', 'src', 'pages', 'OperationsHubPage.tsx');
  assert.doesNotMatch(hub, /localStorage|sessionStorage|STORAGE_KEY/);
  assert.match(hub, /api\/operations\/safety-inspections/);
  assert.match(hub, /api\/operations\/machine-documents/);
});


test('dashboard activity feed reads persistent audit events instead of local component state', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'operations.js');
  const app = read('spa-el-fath-frontend', 'src', 'app', 'AppProvider.tsx');
  assert.match(route, /router\.get\('\/recent-activity'/);
  assert.match(route, /FROM audit_trail/);
  assert.match(app, /api\/operations\/recent-activity/);
});


test('administrator can create technician user accounts and a linked technician record transactionally', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'users.js');
  const ui = read('spa-el-fath-frontend', 'src', 'pages', 'UsersPage.tsx');
  assert.match(route, /\[3, 4\]\.includes\(roleId\)/);
  assert.match(route, /INSERT INTO technicians \(user_id,name,email\)/);
  assert.match(route, /connection\.beginTransaction\(\)/);
  assert.match(ui, /roleId: newRole === 'maintenance_worker' \? 3 : 4/);
});
