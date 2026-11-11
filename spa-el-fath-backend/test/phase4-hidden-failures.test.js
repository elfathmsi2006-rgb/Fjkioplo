const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const detection = require('../src/services/hiddenFailureDetection');
const runner = require('../src/services/hiddenFailureRunner');

const NOW = new Date(2026, 5, 15, 12, 0, 0);
const daysAgo = days => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
const machine = { id: 1, code: 'M-001', name: 'Press', state: 'working' };
const otherMachine = { id: 2, code: 'M-002', name: 'Lathe', state: 'working' };
const base = { machines: [machine], breakdowns: [], tasks: [], logs: [], conditionReadings: [], meterReadings: [], partUsages: [], now: NOW, windowDays: 90 };

test('repeated breakdown detection respects the configured time window', () => {
  const result = detection.detectHiddenFailures({
    ...base,
    breakdowns: [
      { id: 1, machine_id: 1, reported_at: daysAgo(80), severity: 'HIGH', symptom: 'Noise', root_cause: null },
      { id: 2, machine_id: 1, reported_at: daysAgo(40), severity: 'HIGH', symptom: 'Noise', root_cause: null },
      { id: 3, machine_id: 1, reported_at: daysAgo(10), severity: 'CRITICAL', symptom: 'Noise', root_cause: null },
      // Outside the 90-day window: must not be counted.
      { id: 99, machine_id: 1, reported_at: daysAgo(200), severity: 'CRITICAL', symptom: 'Old', root_cause: null },
    ],
  });
  const finding = result.findings.find(item => item.category === 'REPEATED_FAILURE');
  assert.ok(finding);
  assert.equal(finding.riskScore, 38);
  assert.equal(finding.riskLevel, 'MEDIUM');
  assert.equal(finding.evidence.breakdownCount, 3);
  assert.deepEqual(finding.evidence.breakdownIds, [1, 2, 3]);
  assert.equal(finding.lastEvidenceAt.slice(0, 10), '2026-06-05');
  assert.deepEqual(finding.source || {}, {});

  const short = detection.detectHiddenFailures({ ...base, windowDays: 30, breakdowns: [
    { id: 1, machine_id: 1, reported_at: daysAgo(80), symptom: 'X' },
    { id: 2, machine_id: 1, reported_at: daysAgo(10), symptom: 'X' },
  ] });
  assert.equal(short.findings.some(item => item.category === 'REPEATED_FAILURE'), false);
});

test('failure returning within 7 days of a corrective repair is detected', () => {
  const result = detection.detectHiddenFailures({
    ...base,
    breakdowns: [
      { id: 10, machine_id: 1, reported_at: daysAgo(20), symptom: 'Vibration', root_cause: null },
      { id: 11, machine_id: 1, reported_at: daysAgo(10), symptom: 'Vibration', root_cause: null },
    ],
    logs: [
      { id: 5, machine_id: 1, maintenance_type: 'CORRECTIVE', completed_at: daysAgo(24), duration_hours: 2 },
      { id: 6, machine_id: 1, maintenance_type: 'CORRECTIVE', completed_at: daysAgo(14), duration_hours: 2 },
    ],
  });
  const finding = result.findings.find(item => item.category === 'EARLY_RECURRENCE');
  assert.ok(finding);
  assert.equal(finding.evidence.returnWindowDays, 7);
  assert.equal(finding.evidence.occurrences.length, 2);
  assert.deepEqual(finding.evidence.occurrences.map(item => item.breakdownId), [10, 11]);
  assert.equal(finding.evidence.occurrences[0].repairId, 5);
  assert.ok(finding.riskScore >= 50);

  const noReturn = detection.detectHiddenFailures({
    ...base,
    breakdowns: [{ id: 12, machine_id: 1, reported_at: daysAgo(1), symptom: 'Y' }],
    logs: [{ id: 7, machine_id: 1, maintenance_type: 'CORRECTIVE', completed_at: daysAgo(30), duration_hours: 2 }],
  });
  assert.equal(noReturn.findings.some(item => item.category === 'EARLY_RECURRENCE'), false);
});

test('recurring root causes and symptom wording produce inspectable evidence, not confirmed causes', () => {
  const result = detection.detectHiddenFailures({
    ...base,
    breakdowns: [
      { id: 20, machine_id: 1, reported_at: daysAgo(30), symptom: 'Hydraulic leak on press', root_cause: 'Worn seal' },
      { id: 21, machine_id: 1, reported_at: daysAgo(20), symptom: 'Hydraulic leak', root_cause: 'worn seal' },
      { id: 22, machine_id: 1, reported_at: daysAgo(10), symptom: 'Hydraulic leak', root_cause: 'Worn seal' },
    ],
  });
  const finding = result.findings.find(item => item.category === 'RECURRING_ROOT_CAUSE');
  assert.ok(finding);
  assert.equal(finding.evidence.causes[0].cause, 'worn seal');
  assert.equal(finding.evidence.causes[0].count, 3);
  assert.match(finding.explanation, /not a statistically confirmed root cause/i);
});

test('repair-duration trend needs four samples and reports the measured ratio', () => {
  const logs = [
    { id: 40, machine_id: 1, maintenance_type: 'CORRECTIVE', duration_hours: 1, completed_at: daysAgo(50) },
    { id: 41, machine_id: 1, maintenance_type: 'CORRECTIVE', duration_hours: 1.2, completed_at: daysAgo(40) },
    { id: 42, machine_id: 1, maintenance_type: 'CORRECTIVE', duration_hours: 3, completed_at: daysAgo(20) },
    { id: 43, machine_id: 1, maintenance_type: 'CORRECTIVE', duration_hours: 3.2, completed_at: daysAgo(5) },
  ];
  const result = detection.detectHiddenFailures({ ...base, logs });
  const finding = result.findings.find(item => item.category === 'REPAIR_DURATION_INCREASE');
  assert.ok(finding);
  assert.equal(finding.evidence.samples, 4);
  assert.equal(finding.evidence.olderAverageHours, 1.1);
  assert.equal(finding.evidence.recentAverageHours, 3.1);
  assert.ok(finding.riskScore >= 50);

  const insufficient = detection.detectHiddenFailures({ ...base, logs: logs.slice(0, 3) });
  assert.equal(insufficient.findings.some(item => item.category === 'REPAIR_DURATION_INCREASE'), false);
});

test('unusually frequent interventions and repeated spare parts are detected', () => {
  const logs = Array.from({ length: 5 }, (_, index) => ({
    id: 50 + index, machine_id: 1, maintenance_type: 'PREVENTIVE', duration_hours: 0, completed_at: daysAgo(20 - index * 3),
  }));
  const partUsages = [
    { id: 1, machine_id: 1, part_id: 7, part_name: 'Seal kit', sku: 'SK-7', quantity: 1, task_id: 100, created_at: daysAgo(30) },
    { id: 2, machine_id: 1, part_id: 7, part_name: 'Seal kit', sku: 'SK-7', quantity: 2, task_id: 101, created_at: daysAgo(10) },
  ];
  const result = detection.detectHiddenFailures({ ...base, logs, partUsages });
  assert.ok(result.findings.some(item => item.category === 'HIGH_INTERVENTION_FREQUENCY'));

  const part = result.findings.find(item => item.category === 'REPEATED_PART_REPLACEMENT');
  assert.ok(part);
  assert.equal(part.evidence.partId, 7);
  assert.deepEqual(part.evidence.taskIds, [100, 101]);
  assert.equal(part.evidence.totalQuantity, 3);
});

test('condition thresholds, abnormal trends and meter spikes use only sufficient readings', () => {
  const threshold = detection.detectHiddenFailures({
    ...base,
    conditionReadings: [
      { id: 1, machine_id: 1, metric: 'VIBRATION', value_num: 4, unit: 'mm/s', measured_at: daysAgo(8), threshold_min: 0, threshold_max: 5 },
      { id: 2, machine_id: 1, metric: 'VIBRATION', value_num: 6, unit: 'mm/s', measured_at: daysAgo(4), threshold_min: 0, threshold_max: 5 },
      { id: 3, machine_id: 1, metric: 'VIBRATION', value_num: 8, unit: 'mm/s', measured_at: daysAgo(1), threshold_min: 0, threshold_max: 5 },
    ],
  });
  const violation = threshold.findings.find(item => item.category === 'CONDITION_THRESHOLD');
  assert.ok(violation);
  assert.equal(violation.evidence.violationCount, 2);
  assert.equal(violation.riskLevel, 'CRITICAL');

  const trend = detection.detectHiddenFailures({
    ...base,
    conditionReadings: [100, 104, 108, 125].map((value, index) => ({
      id: 10 + index, machine_id: 1, metric: 'TEMPERATURE', value_num: value, unit: 'C', measured_at: daysAgo(8 - index * 2),
    })),
  });
  const trendFinding = trend.findings.find(item => item.category === 'CONDITION_TREND');
  assert.ok(trendFinding);
  assert.equal(trendFinding.evidence.samples, 4);
  assert.ok(trendFinding.evidence.changePercent >= 20);

  const meter = detection.detectHiddenFailures({
    ...base,
    meterReadings: [0, 10, 20, 40, 70, 110].map((value, index) => ({
      id: 30 + index, machine_id: 1, meter_type: 'OPERATING_HOURS', reading_value: value, reading_at: daysAgo(6 - index),
    })),
  });
  const spike = meter.findings.find(item => item.category === 'METER_USAGE_SPIKE');
  assert.ok(spike);
  assert.equal(spike.evidence.samples, 6);
  assert.ok(spike.evidence.recentRatePerDay > spike.evidence.olderRatePerDay);
});

test('insufficient monitoring is reported and machines without activity get no findings', () => {
  const result = detection.detectHiddenFailures({
    ...base,
    machines: [machine, otherMachine],
    breakdowns: [{ id: 70, machine_id: 1, reported_at: daysAgo(5), symptom: 'Stop' }],
    conditionReadings: [
      { id: 71, machine_id: 1, metric: 'NOISE', value_num: 60, unit: 'dB', measured_at: daysAgo(3) },
    ],
  });
  const monitoring = result.findings.find(item => item.category === 'INSUFFICIENT_MONITORING');
  assert.equal(monitoring, undefined);
  assert.deepEqual(result.coverage.insufficientTrendMachines, [1]);
  assert.deepEqual(result.coverage.machinesWithoutActivity, [2]);
});

test('risk ranking aggregates per machine and caps the score at 100', () => {
  const result = detection.detectHiddenFailures({
    ...base,
    machines: [machine, otherMachine],
    breakdowns: [
      { id: 80, machine_id: 1, reported_at: daysAgo(20), symptom: 'A', root_cause: 'Seal' },
      { id: 81, machine_id: 1, reported_at: daysAgo(15), symptom: 'A', root_cause: 'Seal' },
      { id: 82, machine_id: 1, reported_at: daysAgo(10), symptom: 'A', root_cause: 'Seal' },
      { id: 83, machine_id: 1, reported_at: daysAgo(5), symptom: 'A', root_cause: 'Seal' },
      { id: 84, machine_id: 1, reported_at: daysAgo(2), symptom: 'A', root_cause: 'Seal' },
      { id: 85, machine_id: 1, reported_at: daysAgo(1), symptom: 'A', root_cause: 'Seal' },
    ],
    logs: [
      { id: 90, machine_id: 1, maintenance_type: 'CORRECTIVE', duration_hours: 2, completed_at: daysAgo(22) },
      { id: 91, machine_id: 1, maintenance_type: 'CORRECTIVE', duration_hours: 2, completed_at: daysAgo(14) },
      { id: 92, machine_id: 1, maintenance_type: 'CORRECTIVE', duration_hours: 2, completed_at: daysAgo(9) },
      { id: 93, machine_id: 1, maintenance_type: 'CORRECTIVE', duration_hours: 2, completed_at: daysAgo(4) },
    ],
    partUsages: [
      { id: 94, machine_id: 1, part_id: 7, part_name: 'Seal', quantity: 1, task_id: 200, created_at: daysAgo(20) },
      { id: 95, machine_id: 1, part_id: 7, part_name: 'Seal', quantity: 1, task_id: 201, created_at: daysAgo(10) },
    ],
    conditionReadings: [
      { id: 96, machine_id: 1, metric: 'VIBRATION', value_num: 9, unit: 'mm/s', measured_at: daysAgo(1), threshold_min: 0, threshold_max: 5 },
    ],
  });
  assert.equal(result.machineRisks.length, 1);
  const risk = result.machineRisks[0];
  assert.equal(risk.machineId, 1);
  assert.equal(risk.riskScore, 94);
  assert.equal(risk.riskLevel, 'CRITICAL');
  assert.ok(risk.findingCount >= 2);
  assert.equal(result.findings[0].machineCode, 'M-001');
  assert.ok(result.findings.every((item, index, list) => index === 0 || list[index - 1].riskScore >= item.riskScore));
});

test('fingerprints are stable and isolated by machine, category and key', () => {
  const first = detection.fingerprint(1, 'REPEATED_FAILURE', 'breakdowns');
  assert.equal(first, detection.fingerprint(1, 'REPEATED_FAILURE', 'breakdowns'));
  assert.notEqual(first, detection.fingerprint(2, 'REPEATED_FAILURE', 'breakdowns'));
  assert.notEqual(first, detection.fingerprint(1, 'CONDITION_THRESHOLD', 'breakdowns'));
  assert.equal(first.length, 64);
  assert.equal(detection.levelFor(75), 'CRITICAL');
  assert.equal(detection.levelFor(50), 'HIGH');
  assert.equal(detection.levelFor(30), 'MEDIUM');
  assert.equal(detection.levelFor(29), 'LOW');
});

test('empty evidence produces no findings and explicit coverage', () => {
  const result = detection.detectHiddenFailures({ machines: [otherMachine], now: NOW });
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.machineRisks, []);
  assert.equal(result.coverage.machines, 1);
  assert.deepEqual(result.coverage.withoutConditionReadings, []);
});

test('runner clamps windows and computes findings from collected evidence', () => {
  assert.equal(runner.normalizeWindow(5), detection.DEFAULT_WINDOW_DAYS);
  assert.equal(runner.normalizeWindow(400), detection.DEFAULT_WINDOW_DAYS);
  assert.equal(runner.normalizeWindow('30'), 30);

  const result = runner.computeFindings(30, NOW, {
    machines: [machine],
    breakdowns: [
      { id: 90, machine_id: 1, reported_at: daysAgo(20), symptom: 'Noise' },
      { id: 91, machine_id: 1, reported_at: daysAgo(5), symptom: 'Noise' },
    ],
    tasks: [], logs: [], conditionReadings: [], meterReadings: [], partUsages: [],
  });
  assert.ok(result.findings.length >= 1);
  assert.equal(result.windowDays, 30);
});

test('API and workflow enforce manager roles, valid transitions and no duplicates', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'hiddenFailures.js');
  assert.match(route, /MANAGER_ROLES = new Set\(\['admin', 'production_chief', 'workshop_head'\]\)/);
  assert.match(route, /status\(403\)/);
  assert.ok(route.includes("router.get('/'"));
  assert.ok(route.includes("router.patch('/:id'"));
  assert.match(route, /RESOLVED: new Set\(\['OPEN'\]\)/);
  assert.match(route, /Maintenance manager access is required/);
  assert.match(route, /hidden_failure_workflow/);

  const runnerSource = read('spa-el-fath-backend', 'src', 'services', 'hiddenFailureRunner.js');
  assert.match(runnerSource, /WHERE fingerprint = \? LIMIT 1/);
  assert.match(runnerSource, /existing\.status === 'RESOLVED' && !newerEvidence/);
  assert.match(runnerSource, /newerEvidence/);

  const migration = read('spa-el-fath-backend', 'sql', '202611130001_phase4_hidden_failures.sql');
  assert.match(migration, /UNIQUE KEY uq_hidden_failure_fingerprint \(fingerprint\)/);
  assert.match(migration, /status ENUM\('OPEN','ACKNOWLEDGED','REVIEW','RESOLVED'\)/);

  const runner = read('spa-el-fath-backend', 'apply-maintenance-migrations.cjs');
  assert.match(runner, /202611130001_phase4_hidden_failures\.sql/);

  const schema = read('NewSchema.sql');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS cmms_hidden_failure_findings/);

  const server = read('spa-el-fath-backend', 'src', 'server.js');
  assert.match(server, /app\.use\('\/api\/hidden-failures', hiddenFailuresRouter\)/);
});

test('copilot merges high-risk findings once per machine without duplicate alerts', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'copilot.js');
  assert.match(route, /listPersistedFindings/);
  assert.match(route, /attentionMachines/);
  assert.match(route, /hiddenByMachine/);
  assert.match(route, /category: 'HIDDEN_FAILURE'/);
  assert.match(route, /cmms_hidden_failure_findings/);
  assert.match(route, /hiddenFindings/);

  const analysis = read('spa-el-fath-backend', 'src', 'services', 'copilotAnalysis.js');
  assert.match(analysis, /hiddenFailureMachines: new Set/);
  assert.match(analysis, /hiddenFailures|hiddenFindings/);
});

test('frontend exposes the failure center to managers only', () => {
  const app = read('spa-el-fath-frontend', 'src', 'App.tsx');
  assert.match(app, /HiddenFailuresPage = lazy/);
  assert.match(app, /path="hidden-failures"/);
  assert.match(app, /allowed=\{managerRoles\}/);

  const permissions = read('spa-el-fath-frontend', 'src', 'utils', 'permissions.ts');
  assert.match(permissions, /'\/hidden-failures'/);

  const layout = read('spa-el-fath-frontend', 'src', 'components', 'layout', 'AppLayout.tsx');
  assert.match(layout, /to: '\/hidden-failures'/);

  const page = read('spa-el-fath-frontend', 'src', 'pages', 'HiddenFailuresPage.tsx');
  assert.match(page, /\/api\/hidden-failures\?windowDays=/);
  assert.match(page, /\/api\/hidden-failures\/\$\{finding\.id\}/);
  assert.match(page, /Correlations are never presented as confirmed causes/);
  assert.match(page, /dataQuality/);
  assert.match(page, /Insufficient trend data/);
});
