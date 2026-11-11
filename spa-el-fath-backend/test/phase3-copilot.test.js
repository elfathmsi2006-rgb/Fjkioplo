const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const analysis = require('../src/services/copilotAnalysis');

const NOW = new Date(2026, 5, 15, 10, 0, 0);
const hoursAgo = hours => new Date(NOW.getTime() - hours * 3600000);
const inHours = hours => new Date(NOW.getTime() + hours * 3600000);

const machines = [
  { id: 1, code: 'M-001', name: 'Press', state: 'broken' },
  { id: 2, code: 'M-002', name: 'Lathe', state: 'working' },
];
const technicians = [
  { id: 1, name: 'Ali', skill: 'hydraulic press repair', availability_status: 'available', attendance_status: 'present', active: 1 },
  { id: 2, name: 'Sara', skill: 'electrical', availability_status: 'available', attendance_status: 'present', active: 1 },
  { id: 3, name: 'Omar', skill: '', availability_status: 'unavailable', attendance_status: 'absent', active: 1 },
];

test('attention center aggregates overdue, unassigned and blocked state per work order', () => {
  const tasks = [
    { id: 10, title: 'Replace hose', machine_id: 1, technician_id: null, priority: 'CRITICAL', status: 'WAITING_PARTS', due_date: hoursAgo(30), created_at: hoursAgo(50), blocked_reason: 'Hose out of stock' },
    { id: 11, title: 'Inspect guard', machine_id: 2, technician_id: 1, priority: 'HIGH', status: 'IN_PROGRESS', due_date: hoursAgo(2), created_at: hoursAgo(20) },
    { id: 12, title: 'Done task', machine_id: 2, technician_id: 1, priority: 'CRITICAL', status: 'COMPLETED', due_date: hoursAgo(50), created_at: hoursAgo(80) },
  ];
  const items = analysis.buildAttention({ tasks, machines, technicians, breakdowns: [], plans: [], now: NOW });

  assert.equal(items.length, 2);
  const blocked = items.find(item => item.id === 'task-10');
  assert.equal(blocked.category, 'BLOCKED_OPERATION');
  assert.deepEqual(blocked.reasonCodes.sort(), ['BLOCKED', 'OVERDUE', 'UNASSIGNED']);
  assert.equal(blocked.recommendationCode, 'CLEAR_BLOCKER');
  assert.equal(blocked.machine.code, 'M-001');
  assert.deepEqual(blocked.source, { table: 'maintenance_tasks', id: 10 });
  assert.ok(blocked.overdueHours >= 29);

  const delayed = items.find(item => item.id === 'task-11');
  assert.equal(delayed.category, 'DELAYED_WORK_ORDER');
  assert.equal(delayed.technician.name, 'Ali');
});

test('repeated unresolved breakdowns produce one machine-level item and overdue PM is flagged', () => {
  const breakdowns = [
    { id: 1, machine_id: 1, reported_at: hoursAgo(40), severity: 'HIGH', outcome: null },
    { id: 2, machine_id: 1, reported_at: hoursAgo(10), severity: 'CRITICAL', outcome: '' },
    { id: 3, machine_id: 2, reported_at: hoursAgo(5), severity: 'LOW', outcome: 'Repaired' },
  ];
  const plans = [{ id: 7, machine_id: 2, title: 'Lubrication', next_due_at: hoursAgo(48), active: 1 }];
  const items = analysis.buildAttention({ tasks: [], machines, technicians, breakdowns, plans, now: NOW });

  const breakdown = items.filter(item => item.category === 'REPEATED_BREAKDOWN' || item.category === 'CRITICAL_DOWNTIME');
  assert.equal(breakdown.length, 1);
  assert.equal(breakdown[0].category, 'REPEATED_BREAKDOWN');
  assert.equal(breakdown[0].source.table, 'cmms_breakdown_reports');
  assert.equal(breakdown[0].source.id, 2);
  assert.ok(breakdown[0].reasonCodes.includes('MACHINE_STOPPED'));

  const pm = items.find(item => item.category === 'OVERDUE_PREVENTIVE');
  assert.ok(pm);
  assert.equal(pm.recommendationCode, 'SCHEDULE_PM');
});

test('daily briefing reports only real counts and empty states stay zero', () => {
  const tasks = [
    { id: 1, title: 'A', status: 'PENDING', priority: 'CRITICAL', due_date: hoursAgo(1), created_at: hoursAgo(5), technician_id: null },
    { id: 2, title: 'B', status: 'IN_PROGRESS', priority: 'LOW', due_date: inHours(5), created_at: hoursAgo(5), technician_id: 1 },
  ];
  const briefing = analysis.buildBriefing({ tasks, machines, breakdowns: [{ id: 9, machine_id: 1, outcome: null, reported_at: hoursAgo(2) }], plans: [], attention: [{ id: 'x' }], now: NOW });
  assert.equal(briefing.facts.overdueWorkOrders, 1);
  assert.equal(briefing.facts.stoppedMachines, 1);
  assert.equal(briefing.facts.openBreakdowns, 1);
  assert.equal(briefing.facts.criticalHighInterventions, 1);
  assert.equal(briefing.facts.awaitingManagerAction, 1);

  const empty = analysis.buildBriefing({ now: NOW });
  assert.deepEqual(empty.facts, {
    openBreakdowns: 0, openWorkOrders: 0, overdueWorkOrders: 0, stoppedMachines: 0,
    pendingTasks: 0, criticalHighInterventions: 0, upcomingPreventive: 0, awaitingManagerAction: 0,
    hiddenFailureMachines: 0,
  });
  assert.deepEqual(empty.overdueWorkOrders, []);
});

test('workload assistant classifies load and suggests only available skill matches', () => {
  const tasks = Array.from({ length: 6 }, (_, index) => ({
    id: 20 + index, title: index === 0 ? 'Hydraulic press repair' : 'General inspection',
    status: 'PENDING', priority: index === 0 ? 'HIGH' : 'LOW', technician_id: 1, created_at: hoursAgo(5), due_date: inHours(5),
  }));
  tasks.push({ id: 30, title: 'Hydraulic press adjustment', status: 'PENDING', priority: 'HIGH', technician_id: null, created_at: hoursAgo(2), due_date: inHours(2) });
  const workload = analysis.buildWorkload({ tasks, technicians, now: NOW });

  const ali = workload.find(item => item.id === 1);
  assert.equal(ali.level, 'OVERLOADED');
  assert.equal(ali.openTasks, 6);
  assert.ok(ali.suggestions.length >= 0);

  const sara = workload.find(item => item.id === 2);
  assert.equal(sara.level, 'UNDERUTILIZED');
  assert.equal(sara.suggestions[0].taskId, 30);
  assert.equal(sara.suggestions[0].skillMatch, 'UNKNOWN');

  const omar = workload.find(item => item.id === 3);
  assert.equal(omar.level, 'UNAVAILABLE');
  assert.deepEqual(omar.suggestions, []);

  const matching = analysis.buildWorkload({
    tasks: [{ id: 31, title: 'Hydraulic press seal', status: 'PENDING', technician_id: null, priority: 'HIGH', created_at: hoursAgo(1) }],
    technicians: [technicians[0]],
    now: NOW,
  });
  assert.equal(matching[0].suggestions[0].skillMatch, 'MATCH');
  assert.equal(matching[0].suggestions[0].reasonCode, 'SKILL_AND_AVAILABILITY');
  assert.deepEqual(matching[0].suggestions[0].matchedSkills, ['hydraulic', 'press']);
});

test('daily and weekly reports filter by date and compute real completion rates', () => {
  const base = {
    now: NOW,
    tasks: [
      { id: 1, status: 'COMPLETED', created_at: new Date(2026, 5, 15, 8), completed_at: new Date(2026, 5, 15, 9), technician_id: 1, due_date: new Date(2026, 5, 15, 9) },
      { id: 2, status: 'PENDING', created_at: new Date(2026, 5, 13, 8), completed_at: null, technician_id: 2, due_date: new Date(2026, 5, 15, 9) },
      { id: 3, status: 'COMPLETED', created_at: new Date(2026, 5, 1, 8), completed_at: new Date(2026, 5, 1, 9), technician_id: 1, due_date: new Date(2026, 5, 1, 9) },
    ],
    breakdowns: [
      { id: 1, reported_at: new Date(2026, 5, 15, 7), outcome: null, downtime_minutes: 45 },
      { id: 2, reported_at: new Date(2026, 5, 10, 7), outcome: 'Fixed', downtime_minutes: 20 },
    ],
    logs: [
      { id: 1, completed_at: new Date(2026, 5, 15, 9), cost: 120, technician_id: 1, downtime_start: new Date(2026, 5, 15, 8), downtime_end: new Date(2026, 5, 15, 9) },
      { id: 2, completed_at: new Date(2026, 5, 1, 9), cost: 80, technician_id: 1 },
    ],
    occurrences: [
      { id: 1, due_at: new Date(2026, 5, 15, 8), task_status: 'COMPLETED' },
      { id: 2, due_at: new Date(2026, 5, 15, 8), task_status: 'PENDING' },
      { id: 3, due_at: new Date(2026, 5, 10, 8), task_status: 'COMPLETED' },
    ],
    plans: [{ id: 1, active: 1, next_due_at: new Date(2026, 5, 1) }],
    technicians,
  };

  const daily = analysis.buildReport({ period: 'daily', ...base });
  assert.equal(daily.period, 'DAILY');
  assert.equal(daily.facts.tasksCreated, 1);
  assert.equal(daily.facts.tasksCompleted, 1);
  assert.equal(daily.facts.breakdowns, 1);
  assert.equal(daily.facts.downtimeMinutes, 45);
  assert.equal(daily.facts.breakdownDowntimeMinutes, 45);
  assert.equal(daily.facts.maintenanceLogDowntimeMinutes, 60);
  assert.equal(daily.facts.downtimeSource, 'BREAKDOWN_REPORTS');
  assert.equal(daily.facts.interventionsLogged, 1);
  assert.equal(daily.facts.maintenanceCost, 120);
  assert.equal(daily.facts.preventiveDue, 2);
  assert.equal(daily.facts.preventiveCompleted, 1);
  assert.equal(daily.facts.preventiveCompletionRate, 50);
  assert.equal(daily.technicianSummary.find(item => item.id === 1).completedTasks, 1);

  const weekly = analysis.buildReport({ period: 'weekly', ...base });
  assert.equal(weekly.period, 'WEEKLY');
  assert.equal(weekly.facts.tasksCreated, 2);
  assert.equal(weekly.facts.breakdowns, 2);
  assert.equal(weekly.facts.preventiveDue, 3);

  const custom = analysis.buildReport({ period: 'daily', from: '2026-06-01', to: '2026-06-01', ...base });
  assert.equal(custom.period, 'CUSTOM');
  assert.equal(custom.facts.tasksCompleted, 1);
  assert.equal(custom.facts.breakdowns, 0);
  assert.throws(() => analysis.buildReport({ period: 'daily', from: '2026-06-10', to: '2026-06-01', ...base }), /must not be after/);
});

test('empty database produces documented empty report values, not estimates', () => {
  const report = analysis.buildReport({ period: 'daily', now: NOW });
  assert.equal(report.facts.tasksCreated, 0);
  assert.equal(report.facts.downtimeMinutes, 0);
  assert.equal(report.facts.preventiveCompletionRate, null);
  assert.deepEqual(report.technicianSummary, []);
});

test('copilot API is manager-only and mounted in the backend', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'copilot.js');
  assert.match(route, /COPILOT_ROLES = new Set\(\['admin', 'production_chief', 'workshop_head'\]\)/);
  assert.match(route, /status\(403\)/);
  assert.match(route, /router\.get\('\/overview'/);
  assert.match(route, /router\.get\('\/report'/);
  assert.match(route, /Maintenance manager access is required/);
  assert.match(route, /dataQuality/);
  assert.doesNotMatch(route, /openai|anthropic|api\.openai/i);

  const server = read('spa-el-fath-backend', 'src', 'server.js');
  assert.match(server, /app\.use\('\/api\/copilot', copilotRouter\)/);
});

test('frontend integrates the copilot into navigation, permissions and role-guarded route', () => {
  const app = read('spa-el-fath-frontend', 'src', 'App.tsx');
  assert.match(app, /const CopilotPage = lazy\(\(\) => import\('\.\/pages\/CopilotPage'\)\)/);
  assert.match(app, /managerRoles: Role\[\] = \['admin', 'production_chief', 'workshop_head'\]/);
  assert.match(app, /path="copilot"/);

  const permissions = read('spa-el-fath-frontend', 'src', 'utils', 'permissions.ts');
  assert.match(permissions, /'\/copilot'/);
  const layout = read('spa-el-fath-frontend', 'src', 'components', 'layout', 'AppLayout.tsx');
  assert.match(layout, /to: '\/copilot'/);

  const page = read('spa-el-fath-frontend', 'src', 'pages', 'CopilotPage.tsx');
  assert.match(page, /\/api\/copilot\/overview/);
  assert.match(page, /\/api\/copilot\/report/);
  assert.match(page, /never applied automatically/);
  assert.match(page, /dataQuality/);

  const dashboard = read('spa-el-fath-frontend', 'src', 'pages', 'DashboardPage.tsx');
  assert.match(dashboard, /canAccessPath\(role, '\/copilot'\)/);
  assert.match(dashboard, /to="\/copilot"/);
});
