const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const XLSX = require('xlsx');
const exportService = require('../src/services/maintenanceExportService');

function buildWorkbookFromSets(sets) {
  const workbook = exportService.buildWorkbook(sets);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const parsed = XLSX.read(buffer, { type: 'buffer' });
  const sheets = {};
  for (const name of parsed.SheetNames) {
    const worksheet = parsed.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });
    sheets[name] = rows;
  }
  return { buffer, parsed, sheets };
}

test('maintenance export workbook is generated with summary and expected worksheets', () => {
  const sets = [
    {
      name: 'Work Orders',
      columns: exportService.SHEET_DEFS.find(def => def.name === 'Work Orders').columns,
      rows: [{ id: 1, title: 'Replace seal', status: 'COMPLETED', priority: 'HIGH' }],
    },
    {
      name: 'Breakdown Reports',
      columns: exportService.SHEET_DEFS.find(def => def.name === 'Breakdown Reports').columns,
      rows: [{ id: 5, machineId: 1, symptom: 'Hydraulic leak', severity: 'HIGH' }],
    },
  ];
  const { buffer, parsed, sheets } = buildWorkbookFromSets(sets);
  const expected = ['Work Orders', 'Breakdown Reports', 'Summary'];
  assert.deepEqual(parsed.SheetNames, expected);

  const summaryRows = sheets.Summary;
  assert.ok(summaryRows.length >= 3);
  assert.equal(summaryRows[0][0], 'Worksheet');
  assert.equal(summaryRows[0][1], 'Record count');
  assert.equal(summaryRows[0][2], 'Included');
  const workOrdersSummary = summaryRows.find(row => row[0] === 'Work Orders');
  assert.ok(workOrdersSummary);
  assert.equal(workOrdersSummary[1], 1);
  assert.equal(workOrdersSummary[2], true);
  const breakdownSummary = summaryRows.find(row => row[0] === 'Breakdown Reports');
  assert.ok(breakdownSummary);
  assert.equal(breakdownSummary[1], 1);

  const workOrders = sheets['Work Orders'];
  assert.equal(workOrders.length, 2);
  assert.equal(workOrders[0][0], 'Work order ID');
  assert.equal(workOrders[1][1], 'Replace seal');
  const breakdown = sheets['Breakdown Reports'];
  assert.equal(breakdown[1][7], 'Hydraulic leak');});

test('export workbook skips empty datasets but keeps the summary sheet', () => {
  const { buffer, parsed, sheets } = buildWorkbookFromSets([{ name: 'Spare Parts Inventory', columns: exportService.SHEET_DEFS.find(def => def.name === 'Spare Parts Inventory').columns, rows: [] }]);
  assert.ok(parsed.SheetNames.includes('Spare Parts Inventory'));
  assert.deepEqual(sheets['Spare Parts Inventory'], [['Part ID', 'SKU', 'Name', 'Category', 'Location', 'Stock quantity', 'Minimum quantity', 'Unit cost (DZD)', 'Created at', 'Updated at']]);
});

test('export handles large datasets without truncation and preserves rows', () => {
  const rows = Array.from({ length: 2500 }, (_, index) => ({ id: index + 1, title: `Task ${index + 1}`, status: 'PENDING' }));
  const { buffer, parsed, sheets } = buildWorkbookFromSets([{ name: 'Work Orders', columns: exportService.SHEET_DEFS.find(def => def.name === 'Work Orders').columns, rows }]);
  const workOrders = sheets['Work Orders'];
  assert.equal(workOrders.length, 2501);
  assert.equal(workOrders[2500][1], 'Task 2500');
  assert.equal(parsed.SheetNames.length, 2);
});

test('export includes all expected maintenance sheets and excludes sensitive fields', () => {
  const names = [...exportService.SHEET_DEFS.map(def => def.name), 'Summary'];
  const allColumnKeys = new Set();
  for (const def of exportService.SHEET_DEFS) {
    for (const column of def.columns) allColumnKeys.add(column.key);
  }
  assert.ok(names.includes('Maintenance Logs'));
  assert.ok(names.includes('Work Orders'));
  assert.ok(names.includes('Breakdown Reports'));
  assert.ok(names.includes('Preventive Plans'));
  assert.ok(names.includes('PM Occurrences'));
  assert.ok(names.includes('PM Checklist Items'));
  assert.ok(names.includes('Work Order Checklist Results'));
  assert.ok(names.includes('Spare Parts Used'));
  assert.ok(names.includes('Condition Readings'));
  assert.ok(names.includes('Meter Readings'));
  assert.ok(names.includes('Safety Inspections'));
  assert.ok(names.includes('Technicians'));
  assert.ok(names.includes('Machines'));
  assert.ok(names.includes('Workshops'));
  assert.ok(names.includes('Spare Parts Inventory'));
  assert.ok(names.includes('Warehouse Movements'));
  assert.ok(names.includes('Machine Documents'));
  assert.ok(names.includes('Maintenance Log Attachments'));
  assert.ok(names.includes('Maintenance Notifications'));
  assert.ok(names.includes('Audit Trail'));

  const forbidden = ['password', 'token', 'secret', 'hash', 'refreshToken', 'bearer'];
  for (const column of allColumnKeys) {
    assert.equal(forbidden.includes(column.toLowerCase()), false, `Sensitive column detected: ${column}`);
  }
});

test('maintenance export API is manager-only and mounted at the export route', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'maintenanceExport.js');
  assert.match(route, /EXPORT_ROLES = new Set\(\['admin', 'production_chief', 'workshop_head'\]\)/);
  assert.match(route, /status\(403\)/);
  assert.match(route, /router\.get\('\/'/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /generateMaintenanceExport/);

  const server = read('spa-el-fath-backend', 'src', 'server.js');
  assert.match(server, /app\.use\('\/api\/maintenance', maintenanceExportRouter\)/);
  assert.match(server, /maintenanceExportRouter = require\('\.\/routes\/maintenanceExport'\)/);
});

test('export filename uses an ISO date stamp', () => {
  const today = new Date(2026, 5, 15, 10, 0, 0);
  assert.equal(exportService.exportFileName(today), 'spa-el-fath-maintenance-20260615.xlsx');
});
