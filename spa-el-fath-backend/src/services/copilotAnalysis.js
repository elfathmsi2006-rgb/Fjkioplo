// Deterministic maintenance-manager analysis. No external AI service and no
// fabricated values: every insight is derived from database rows supplied by
// the route and points back to its source record.

const OPEN_STATUSES = new Set(['PENDING', 'WAITING_PARTS', 'IN_PROGRESS']);
const DONE_STATUSES = new Set(['COMPLETED', 'CANCELLED']);
const STOPPED_STATES = new Set(['broken', 'stopped', 'down', 'arrete', 'arrêt', 'panne']);
const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function hoursSince(value, now) {
  const date = toDate(value);
  return date ? Math.max(0, Math.round(((now - date) / 3600000) * 10) / 10) : null;
}

function daysUntil(value, now) {
  const date = toDate(value);
  return date ? Math.ceil((date - now) / DAY_MS) : null;
}

function isOpen(task) {
  return !!task && !DONE_STATUSES.has(String(task.status || '').toUpperCase());
}

function isOverdue(task, now) {
  const due = toDate(task?.due_date);
  return isOpen(task) && !!due && due.getTime() < now.getTime();
}

function priorityWeight(priority) {
  return { CRITICAL: 40, HIGH: 25, MEDIUM: 10, LOW: 0 }[String(priority || '').toUpperCase()] ?? 5;
}

function machineOf(task, machineMap) {
  return task?.machine_id ? machineMap.get(Number(task.machine_id)) || null : null;
}

function machineSummary(machine) {
  if (!machine) return null;
  return { id: machine.id, code: machine.code || null, name: machine.name || null };
}

function technicianSummary(technician) {
  if (!technician) return null;
  return { id: technician.id, name: technician.name || null };
}

function categoryScore(category) {
  return {
    BLOCKED_OPERATION: 70,
    CRITICAL_DOWNTIME: 65,
    REPEATED_BREAKDOWN: 60,
    DELAYED_WORK_ORDER: 50,
    OVERDUE_PREVENTIVE: 40,
    UNASSIGNED_TASK: 30,
  }[category] || 10;
}

function buildAttention({ tasks = [], machines = [], technicians = [], breakdowns = [], plans = [], now = new Date() }) {
  const machineMap = new Map(machines.map(machine => [Number(machine.id), machine]));
  const technicianMap = new Map(technicians.map(technician => [Number(technician.id), technician]));
  const items = [];

  for (const task of tasks) {
    if (!isOpen(task)) continue;
    const overdue = isOverdue(task, now);
    const unassigned = !task.technician_id;
    const status = String(task.status || '').toUpperCase();
    const blocked = status === 'WAITING_PARTS' || Boolean(task.blocked_reason);
    if (!overdue && !unassigned && !blocked) continue;

    const category = blocked ? 'BLOCKED_OPERATION' : overdue ? 'DELAYED_WORK_ORDER' : 'UNASSIGNED_TASK';
    const reasons = [];
    if (overdue) reasons.push({ code: 'OVERDUE', hours: hoursSince(task.due_date, now) });
    if (unassigned) reasons.push({ code: 'UNASSIGNED' });
    if (blocked) reasons.push({ code: 'BLOCKED', detail: task.blocked_reason || null });

    const machine = machineOf(task, machineMap);
    const technician = task.technician_id ? technicianMap.get(Number(task.technician_id)) || null : null;
    const ageHours = hoursSince(task.created_at, now);
    const overdueHours = hoursSince(task.due_date, now);
    const score = categoryScore(category) + priorityWeight(task.priority) + Math.min(30, Math.round((overdueHours || 0) / 24));

    items.push({
      id: `task-${task.id}`,
      category,
      severity: task.priority === 'CRITICAL' || category === 'BLOCKED_OPERATION' || category === 'CRITICAL_DOWNTIME' ? 'CRITICAL'
        : task.priority === 'HIGH' || overdue ? 'HIGH' : 'MEDIUM',
      score,
      reasonCodes: reasons.map(reason => reason.code),
      recommendationCode: blocked ? 'CLEAR_BLOCKER' : unassigned ? (overdue ? 'ASSIGN_AND_ESCALATE' : 'ASSIGN_TECHNICIAN') : 'REVIEW_WORK_ORDER',
      subject: task.title || null,
      what: `Work order #${task.id} “${task.title || ''}” is ${status.replace('_', ' ').toLowerCase()}`,
      why: [overdue ? `overdue by ${overdueHours} hour(s)` : '', unassigned ? 'unassigned' : '', blocked ? `blocked${task.blocked_reason ? `: ${task.blocked_reason}` : ' while waiting for parts'}` : ''].filter(Boolean).join('; '),
      machine: machineSummary(machine),
      technician: technicianSummary(technician),
      ageHours,
      overdueHours,
      recommendation: blocked ? 'Resolve the blocking part or reason before the next shift.'
        : unassigned ? 'Assign a qualified available technician and confirm the due date.'
          : 'Review progress with the technician and confirm the completion date.',
      source: { table: 'maintenance_tasks', id: task.id },
    });
  }

  // One breakdown item per machine: repeated unresolved failures take priority
  // over a single critical downtime item, so the manager is not double-alerted.
  const unresolved = breakdowns.filter(item => !item.outcome || !String(item.outcome).trim());
  const byMachine = new Map();
  for (const item of unresolved) {
    const key = Number(item.machine_id);
    const list = byMachine.get(key) || [];
    list.push(item);
    byMachine.set(key, list);
  }
  for (const [machineId, list] of byMachine) {
    const machine = machineMap.get(machineId) || null;
    const stopped = machine && STOPPED_STATES.has(String(machine.state || '').toLowerCase());
    const repeated = list.length >= 2;
    if (!stopped && !repeated) continue;
    const latest = list.slice().sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at))[0];
    const ageHours = hoursSince(latest.reported_at, now);
    const category = repeated ? 'REPEATED_BREAKDOWN' : 'CRITICAL_DOWNTIME';
    const severity = repeated || String(latest.severity).toUpperCase() === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    items.push({
      id: `machine-breakdown-${machineId}`,
      category,
      severity,
      score: categoryScore(category) + Math.min(30, Math.round((ageHours || 0) / 24)) + (stopped ? 10 : 0),
      reasonCodes: [repeated ? 'REPEATED_BREAKDOWN' : 'OPEN_BREAKDOWN', ...(stopped ? ['MACHINE_STOPPED'] : [])],
      recommendationCode: repeated ? 'INVESTIGATE_ROOT_CAUSE' : 'INSPECT_MACHINE',
      subject: machine?.code || machine?.name || `#${machineId}`,
      what: repeated
        ? `${list.length} unresolved breakdowns were reported for ${machine?.code || `machine ${machineId}`}`
        : `${machine?.code || `machine ${machineId}`} has an unresolved breakdown`,
      why: [repeated ? `${list.length} unresolved reports are still open` : '', stopped ? `machine state is “${machine?.state}”` : '', `latest report is ${ageHours} hour(s) old`].filter(Boolean).join('; '),
      machine: machineSummary(machine),
      technician: null,
      ageHours,
      overdueHours: null,
      recommendation: repeated ? 'Review the failure history, confirm the root cause and escalate a corrective work order.'
        : 'Confirm the machine condition and assign the corrective intervention.',
      source: { table: 'cmms_breakdown_reports', id: latest.id },
    });
  }

  for (const plan of plans) {
    if (!plan.active) continue;
    const due = toDate(plan.next_due_at);
    if (!due || due.getTime() >= now.getTime()) continue;
    const machine = machineMap.get(Number(plan.machine_id)) || null;
    const daysLate = Math.abs(daysUntil(plan.next_due_at, now) || 0);
    items.push({
      id: `plan-${plan.id}`,
      category: 'OVERDUE_PREVENTIVE',
      severity: daysLate > 7 ? 'HIGH' : 'MEDIUM',
      score: categoryScore('OVERDUE_PREVENTIVE') + Math.min(30, daysLate),
      reasonCodes: ['PM_OVERDUE'],
      recommendationCode: 'SCHEDULE_PM',
      subject: plan.title || null,
      what: `Preventive plan #${plan.id} “${plan.title || ''}” is overdue`,
      why: `due ${plan.next_due_at}; ${daysLate} day(s) late`,
      machine: machineSummary(machine),
      technician: null,
      ageHours: hoursSince(plan.next_due_at, now),
      overdueHours: null,
      recommendation: 'Schedule the preventive intervention and confirm the next due date.',
      source: { table: 'cmms_preventive_plans', id: plan.id },
    });
  }

  return items.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
}

function buildBriefing({ tasks = [], machines = [], breakdowns = [], plans = [], attention = [], hiddenFindings = [], now = new Date() }) {
  const openTasks = tasks.filter(isOpen);
  const overdue = openTasks.filter(task => isOverdue(task, now));
  const stopped = machines.filter(machine => STOPPED_STATES.has(String(machine.state || '').toLowerCase()));
  const openBreakdowns = breakdowns.filter(item => !item.outcome || !String(item.outcome).trim());
  const upcoming = plans.filter(plan => {
    if (!plan.active) return false;
    const due = toDate(plan.next_due_at);
    return !!due && due.getTime() >= now.getTime() && due.getTime() <= now.getTime() + 7 * DAY_MS;
  });
  const criticalHigh = openTasks.filter(task => ['CRITICAL', 'HIGH'].includes(String(task.priority || '').toUpperCase()));

  return {
    facts: {
      openBreakdowns: openBreakdowns.length,
      openWorkOrders: openTasks.length,
      overdueWorkOrders: overdue.length,
      stoppedMachines: stopped.length,
      pendingTasks: openTasks.filter(task => String(task.status).toUpperCase() === 'PENDING').length,
      criticalHighInterventions: criticalHigh.length,
      upcomingPreventive: upcoming.length,
      awaitingManagerAction: attention.length,
      hiddenFailureMachines: new Set(hiddenFindings.map(item => Number(item.machineId))).size,
    },
    openBreakdowns: openBreakdowns.slice(0, 5).map(item => ({ id: item.id, machineId: item.machine_id, severity: item.severity, reportedAt: item.reported_at, symptom: item.symptom, source: { table: 'cmms_breakdown_reports', id: item.id } })),
    overdueWorkOrders: overdue.slice(0, 5).map(task => ({ id: task.id, title: task.title, priority: task.priority, dueDate: task.due_date, technicianId: task.technician_id, source: { table: 'maintenance_tasks', id: task.id } })),
    stoppedMachines: stopped.slice(0, 5).map(machine => ({ id: machine.id, code: machine.code, name: machine.name, state: machine.state, source: { table: 'machines', id: machine.id } })),
    pendingTasks: openTasks.filter(task => String(task.status).toUpperCase() === 'PENDING').slice(0, 5).map(task => ({ id: task.id, title: task.title, priority: task.priority, dueDate: task.due_date, source: { table: 'maintenance_tasks', id: task.id } })),
    criticalHighInterventions: criticalHigh.slice(0, 5).map(task => ({ id: task.id, title: task.title, priority: task.priority, status: task.status, machineId: task.machine_id, source: { table: 'maintenance_tasks', id: task.id } })),
    upcomingPreventive: upcoming.slice(0, 5).map(plan => ({ id: plan.id, title: plan.title, nextDueAt: plan.next_due_at, machineId: plan.machine_id, source: { table: 'cmms_preventive_plans', id: plan.id } })),
    hiddenFailureMachines: hiddenFindings.slice(0, 5).map(item => ({
      machineId: item.machineId,
      code: item.machineCode,
      name: item.machineName,
      riskLevel: item.riskLevel,
      riskScore: item.riskScore,
      title: item.title,
      findingId: item.id,
      source: { table: 'cmms_hidden_failure_findings', id: item.id },
    })),
  };
}

function skillTokens(value) {
  return String(value || '').toLowerCase().split(/[^a-z0-9\u0600-\u06ff]+/).filter(token => token.length >= 3);
}

function taskTokens(task) {
  return skillTokens(`${task.title || ''} ${task.description || ''} ${task.maintenance_type || ''}`);
}

function buildWorkload({ tasks = [], technicians = [], now = new Date() }) {
  const unassigned = tasks.filter(task => isOpen(task) && !task.technician_id);
  return technicians
    .filter(technician => technician.active !== 0 && technician.active !== false)
    .map(technician => {
      const assigned = tasks.filter(task => isOpen(task) && Number(task.technician_id) === Number(technician.id));
      const critical = assigned.filter(task => String(task.priority).toUpperCase() === 'CRITICAL').length;
      const overdue = assigned.filter(task => isOverdue(task, now)).length;
      const loadScore = assigned.length * 2 + critical * 2 + overdue * 2;
      const available = String(technician.availability_status || 'available').toLowerCase() === 'available'
        && String(technician.attendance_status || 'present').toLowerCase() === 'present';
      const level = !available ? 'UNAVAILABLE' : assigned.length >= 6 || critical >= 2 ? 'OVERLOADED' : assigned.length <= 1 ? 'UNDERUTILIZED' : 'BALANCED';

      const suggestions = unassigned
        .map(task => {
          const tokens = new Set(taskTokens(task));
          const matched = skillTokens(technician.skill).filter(token => tokens.has(token));
          const skillMatch = technician.skill ? (matched.length ? 'MATCH' : 'UNKNOWN') : 'UNKNOWN';
          return { task, matched, skillMatch, score: matched.length * 10 + priorityWeight(task.priority) + (task.due_date && isOverdue(task, now) ? 15 : 0) };
        })
        .filter(item => available)
        .sort((a, b) => b.score - a.score || Number(a.task.id) - Number(b.task.id))
        .slice(0, 3)
        .map(item => ({
          taskId: item.task.id,
          title: item.task.title,
          priority: item.task.priority,
          dueDate: item.task.due_date,
          skillMatch: item.skillMatch,
          matchedSkills: item.matched,
          reasonCode: item.skillMatch === 'MATCH' ? 'SKILL_AND_AVAILABILITY' : 'AVAILABILITY_ONLY',
          source: { table: 'maintenance_tasks', id: item.task.id },
        }));

      return {
        id: technician.id,
        name: technician.name,
        skill: technician.skill || null,
        shift: technician.shift_name || null,
        availability: technician.availability_status || null,
        attendance: technician.attendance_status || null,
        openTasks: assigned.length,
        criticalTasks: critical,
        overdueTasks: overdue,
        inProgressTasks: assigned.filter(task => String(task.status).toUpperCase() === 'IN_PROGRESS').length,
        loadScore,
        level,
        suggestions,
        source: { table: 'technicians', id: technician.id },
      };
    })
    .sort((a, b) => b.loadScore - a.loadScore || String(a.name).localeCompare(String(b.name)));
}

function resolveRange({ period = 'daily', from = null, to = null, now = new Date() }) {
  const start = from ? new Date(`${from}T00:00:00`) : null;
  const end = to ? new Date(`${to}T23:59:59.999`) : null;
  if ((from && !Number.isFinite(start.getTime())) || (to && !Number.isFinite(end.getTime()))) {
    throw new Error('Invalid report date range.');
  }
  if (start && end && start.getTime() > end.getTime()) throw new Error('Report start date must not be after the end date.');
  if (start || end) return { from: start || new Date(0), to: end || now, period: 'CUSTOM' };

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  if (period === 'weekly') return { from: new Date(now.getTime() - 6 * DAY_MS), to: endOfToday, period: 'WEEKLY' };
  return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to: endOfToday, period: 'DAILY' };
}

function inRange(value, range) {
  const date = toDate(value);
  return !!date && date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime();
}

function buildReport({ period = 'daily', from = null, to = null, now = new Date(), tasks = [], breakdowns = [], logs = [], occurrences = [], plans = [], technicians = [] }) {
  const range = resolveRange({ period, from, to, now });
  const created = tasks.filter(task => inRange(task.created_at, range));
  const completed = tasks.filter(task => inRange(task.completed_at, range));
  const open = tasks.filter(isOpen);
  const overdue = open.filter(task => isOverdue(task, now));
  const dueTasks = tasks.filter(task => inRange(task.due_date, range));
  const dueCompleted = dueTasks.filter(task => String(task.status).toUpperCase() === 'COMPLETED');
  const periodLogs = logs.filter(log => inRange(log.completed_at || log.maintenance_date, range));
  const periodBreakdowns = breakdowns.filter(item => inRange(item.reported_at, range));
  const dueOccurrences = occurrences.filter(item => inRange(item.due_at, range));
  const completedOccurrences = dueOccurrences.filter(item => String(item.task_status || '').toUpperCase() === 'COMPLETED');
  const downtimeMinutes = periodBreakdowns.reduce((sum, item) => sum + Number(item.downtime_minutes || 0), 0);
  const logDowntimeMinutes = periodLogs.reduce((sum, log) => {
    const start = toDate(log.downtime_start);
    const end = toDate(log.downtime_end);
    return sum + (start && end ? Math.max(0, (end - start) / 60000) : 0);
  }, 0);
  // Breakdown reports are the primary downtime source. Maintenance logs often
  // describe the same event, so they are used only when no breakdown downtime
  // was recorded, preventing double counting.
  const totalDowntimeMinutes = Math.round(downtimeMinutes || logDowntimeMinutes);

  const technicianSummary = technicians.map(technician => ({
    id: technician.id,
    name: technician.name,
    completedTasks: completed.filter(task => Number(task.technician_id) === Number(technician.id)).length,
    loggedInterventions: periodLogs.filter(log => Number(log.technician_id) === Number(technician.id)).length,
    openTasks: open.filter(task => Number(task.technician_id) === Number(technician.id)).length,
    source: { table: 'technicians', id: technician.id },
  })).sort((a, b) => b.completedTasks - a.completedTasks || String(a.name).localeCompare(String(b.name)));

  return {
    period: range.period,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    facts: {
      createdAt: now.toISOString(),
      tasksCreated: created.length,
      tasksCompleted: completed.length,
      tasksDue: dueTasks.length,
      dueTasksCompleted: dueCompleted.length,
      openWorkOrders: open.length,
      overdueWorkOrders: overdue.length,
      breakdowns: periodBreakdowns.length,
      unresolvedBreakdowns: periodBreakdowns.filter(item => !item.outcome || !String(item.outcome).trim()).length,
      downtimeMinutes: totalDowntimeMinutes,
      breakdownDowntimeMinutes: Math.round(downtimeMinutes),
      maintenanceLogDowntimeMinutes: Math.round(logDowntimeMinutes),
      downtimeSource: downtimeMinutes ? 'BREAKDOWN_REPORTS' : logDowntimeMinutes ? 'MAINTENANCE_LOGS' : 'NONE',
      interventionsLogged: periodLogs.length,
      maintenanceCost: Number(periodLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0).toFixed(2)),
      preventiveDue: dueOccurrences.length,
      preventiveCompleted: completedOccurrences.length,
      preventiveCompletionRate: dueOccurrences.length ? Math.round((completedOccurrences.length / dueOccurrences.length) * 1000) / 10 : null,
      overduePreventivePlans: plans.filter(plan => plan.active && toDate(plan.next_due_at) && toDate(plan.next_due_at).getTime() < now.getTime()).length,
    },
    technicianSummary,
  };
}

module.exports = {
  OPEN_STATUSES,
  DONE_STATUSES,
  STOPPED_STATES,
  isOpen,
  isOverdue,
  buildAttention,
  buildBriefing,
  buildWorkload,
  buildReport,
  resolveRange,
};
