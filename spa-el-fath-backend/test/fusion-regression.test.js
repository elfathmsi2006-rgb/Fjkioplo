const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const XLSX = require('xlsx');
const exportService = require('../src/services/maintenanceExportService');

// These tests guard the contracts that were broken when the two code bases were
// fused. Every one of them describes a defect that the pre-fusion test suite
// could not detect, so they must stay green for the fused build to be correct.

// 1. The maintenance export router must be reachable under BOTH mount points.
//    The frontend calls /api/maintenance/export/*, the router exposes its routes
//    at the root of the router, so both mounts are required.
test('maintenance export router is mounted under /api/maintenance and /api/maintenance/export', () => {
  const server = read('spa-el-fath-backend', 'src', 'server.js');
  assert.match(server, /app\.use\('\/api\/maintenance', maintenanceExportRouter\)/);
  assert.match(server, /app\.use\('\/api\/maintenance\/export', maintenanceExportRouter\)/);
});

// 2. The export listing endpoints must answer with a bare array.
//    The frontend validates Array.isArray(result.data); wrapping the payload in
//    { schedules } / { executions } silently breaks the whole export panel.
test('export schedules and executions are returned as plain arrays', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'maintenanceExport.js');
  assert.match(route, /res\.json\(\{ success: true, data: schedules \}\)/);
  assert.match(route, /res\.json\(\{ success: true, data: executions \}\)/);
  assert.doesNotMatch(route, /data: \{ schedules \}/);
  assert.doesNotMatch(route, /data: \{ executions \}/);
});

// 3. The workbook builder must tolerate a data set literally named "Summary".
//    collectDataSets() appends one, and the builder appends its own summary sheet,
//    so the incoming one has to be skipped or the writer rejects the duplicate.
test('export workbook builder skips an incoming Summary data set instead of duplicating the sheet', () => {
  const service = read('spa-el-fath-backend', 'src', 'services', 'maintenanceExportService.js');
  assert.match(service, /dataSet\.name\.trim\(\)\.toLowerCase\(\) === 'summary'/);
});

// 3b. The same contract, exercised for real. collectDataSets() appends a data set
//     named "Summary" and buildWorkbook() appends its own summary sheet, so the
//     writer sees the name twice unless the incoming one is skipped. This is the
//     path the pre-fusion test suite never took, which is why the duplicate
//     worksheet error went unnoticed.
test('export workbook builds successfully when a Summary data set is present', () => {
  const dataSets = [
    { name: 'Work Orders', columns: exportService.SHEET_DEFS.find(def => def.name === 'Work Orders').columns, rows: [{ id: 1, title: 'Replace seal' }] },
    { name: 'Breakdown Reports', columns: exportService.SHEET_DEFS.find(def => def.name === 'Breakdown Reports').columns, rows: [{ id: 5, symptom: 'Hydraulic leak' }] },
  ];
  const summary = dataSets.map(dataSet => ({ worksheet: dataSet.name, records: dataSet.rows.length, included: true }));
  dataSets.push({ name: 'Summary', columns: exportService.SUMMARY_COLUMNS, rows: summary });

  const workbook = exportService.buildWorkbook(dataSets);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const parsed = XLSX.read(buffer, { type: 'buffer' });

  assert.deepEqual(parsed.SheetNames, ['Work Orders', 'Breakdown Reports', 'Summary']);
  assert.equal(parsed.SheetNames.filter(name => name === 'Summary').length, 1);
});

// 4. Deleting a preventive plan must cascade to its children.
//    cmms_pm_occurrences.plan_id and cmms_pm_checklist_items.plan_id are
//    ON DELETE RESTRICT, so a bare DELETE fails with a foreign key error as soon
//    as the plan has a checklist item or a generated occurrence.
test('preventive plan deletion cascades to checklist items and occurrences', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'operations.js');
  assert.match(route, /DELETE FROM cmms_work_order_checklist_results WHERE checklist_item_id IN \(SELECT id FROM cmms_pm_checklist_items WHERE plan_id=\?\)/);
  assert.match(route, /DELETE FROM cmms_pm_checklist_items WHERE plan_id=\?/);
  assert.match(route, /DELETE FROM cmms_pm_occurrences WHERE id=\?/);
  assert.match(route, /DELETE FROM cmms_preventive_plans WHERE id=\?/);
});

// 5. The checklist item update and delete endpoints must stay available.
//    They are exposed by the Operations Hub / maintenance suite UI.
test('maintenance suite still exposes the checklist item update and delete endpoints', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'maintenanceSuite.js');
  assert.match(route, /router\.put\('\/preventive-plans\/:planId\/checklist\/:itemId'/);
  assert.match(route, /router\.delete\('\/preventive-plans\/:planId\/checklist\/:itemId'/);
  assert.match(route, /UPDATE cmms_pm_checklist_items SET title=\?/);
});

// 6. The Operations Hub must stay translated.
//    Module labels, field labels, enum cell values and kanban headers all go
//    through tx() so the hub follows the language chosen in Settings.
test('Operations Hub module labels are translated instead of hard-coded', () => {
  const page = read('spa-el-fath-frontend', 'src', 'pages', 'OperationsHubPage.tsx');
  assert.match(page, /const buildModules = \(tx: Tx\)/);
  assert.match(page, /const modules = useMemo\(\(\) => buildModules\(tx\), \[language\]\)/);
  assert.match(page, /const kanbanLabels = useMemo/);
  assert.match(page, /field\.options\.find\(option => option\.value === String\(value \?\? ''\)\)/);
});

// 7. The Operations Hub must keep the plan, checklist and breakdown management UI.
test('Operations Hub still offers preventive plan, checklist and breakdown management', () => {
  const tools = read('spa-el-fath-frontend', 'src', 'components', 'maintenance', 'MaintenanceSuiteTools.tsx');
  assert.match(tools, /startEditPlan/);
  assert.match(tools, /deletePlan/);
  assert.match(tools, /startEditItem/);
  assert.match(tools, /deleteChecklistItem/);
  assert.match(tools, /selectBreakdownTask/);
});

// 8. Reading work orders must be wider than writing them.
//    The Maintenance page is reachable by the workshop head, and the breakdown form
//    needs the work-order list to derive the machine from the selected work order.
//    Locking the list behind the write roles empties that dropdown.
test('work orders can be listed by the workshop head while writes stay restricted', () => {
  const tasks = read('spa-el-fath-backend', 'src', 'routes', 'tasks.js');
  assert.match(tasks, /const VIEW_ROLES = new Set\(\['admin', 'production_chief', 'workshop_head'\]\)/);
  assert.match(tasks, /function canViewTasks\(req\)/);
  assert.match(tasks, /if \(canViewTasks\(req\)\) \{/);
  // The write roles stay narrow: only the administrator and the production chief.
  assert.match(tasks, /const MANAGE_ROLES = new Set\(\['admin', 'production_chief'\]\)/);
  assert.match(tasks, /if \(!canEditWorkOrders\(req\)\) \{/);
});

// 9. The breakdown form must derive the machine from the selected work order.
test('breakdown form loads the machine of the selected work order', () => {
  const tools = read('spa-el-fath-frontend', 'src', 'components', 'maintenance', 'MaintenanceSuiteTools.tsx');
  assert.match(tools, /if \(task\?\.machine_id != null\) setMachineId\(String\(task\.machine_id\)\)/);
  assert.match(tools, /onChange=\{e=>selectBreakdownTask\(e\.target\.value\)\}/);
  // The saved breakdown is filed against the work order's machine, not the shared one.
  assert.match(tools, /selected\?\.machine_id != null \? Number\(selected\.machine_id\) : Number\(machineId\)/);
});

// 10. Deleting a work order must be possible for an administrator.
//     The history is detached and audited instead of blocking the deletion.
test('work order deletion is allowed and preserves history by detaching it', () => {
  const tasks = read('spa-el-fath-backend', 'src', 'routes', 'tasks.js');
  assert.doesNotMatch(tasks, /Completed work orders are retained for maintenance history and cannot be deleted/);
  assert.doesNotMatch(tasks, /This work order has maintenance, breakdown, checklist, parts or preventive history and cannot be deleted/);
  assert.match(tasks, /UPDATE \\`\$\{table\}\\` SET task_id=NULL WHERE task_id=\?/);
  assert.match(tasks, /detached_from_task_id/);
  assert.match(tasks, /Work order deleted\./);
  // Stock that was physically issued still blocks the deletion until it is returned.
  assert.match(tasks, /Return the parts before deleting it/);
});

// 11. The same trust domain must be accepted for writes.
//     A browser that opens the app on 127.0.0.1 must still be able to save.
test('allowed origins accept the localhost equivalents of the configured frontend URL', () => {
  const auth = read('spa-el-fath-backend', 'src', 'middleware', 'auth.js');
  assert.match(auth, /function allowedOrigins\(\)/);
  assert.match(auth, /'127\.0\.0\.1'/);
  assert.match(auth, /allowedOrigins\(\)\.has\(requestOrigin\)/);
});
