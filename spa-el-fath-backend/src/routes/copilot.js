const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const {
  buildAttention,
  buildBriefing,
  buildWorkload,
  buildReport,
} = require('../services/copilotAnalysis');
const { listPersistedFindings } = require('../services/hiddenFailureRunner');

const router = express.Router();
const COPILOT_ROLES = new Set(['admin', 'production_chief', 'workshop_head']);

router.use(requireAuth);
router.use((req, res, next) => {
  if (!COPILOT_ROLES.has(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Maintenance manager access is required.' });
  }
  return next();
});

async function safeQuery(sql, params, dataQuality, label) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
      dataQuality.missing.push(label);
      return [];
    }
    throw error;
  }
}

async function queryTasks(where, params, dataQuality) {
  const columns = 'id, title, description, maintenance_type, machine_id, technician_id, workshop_id, priority, status, due_date, started_at, completed_at, created_at';
  try {
    const [rows] = await pool.execute(
      `SELECT ${columns}, blocked_reason FROM maintenance_tasks WHERE ${where} LIMIT 5000`,
      params
    );
    return rows;
  } catch (error) {
    if (error.code !== 'ER_BAD_FIELD_ERROR') {
      if (error.code === 'ER_NO_SUCH_TABLE') { dataQuality.missing.push('maintenance_tasks'); return []; }
      throw error;
    }
    // Phase 1 control-center columns may not be installed yet.
    const [rows] = await pool.execute(
      `SELECT ${columns}, NULL AS blocked_reason FROM maintenance_tasks WHERE ${where} LIMIT 5000`,
      params
    );
    return rows;
  }
}

function parseReferenceDate(value) {
  if (!value) return new Date();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error('Invalid date. Use YYYY-MM-DD.');
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid date. Use YYYY-MM-DD.');
  return date;
}

function parseRangeDate(value, field) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error(`Invalid ${field} date. Use YYYY-MM-DD.`);
  return String(value);
}

router.get('/overview', async (req, res) => {
  let now;
  try {
    now = parseReferenceDate(req.query.date);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  const dataQuality = { missing: [], notes: [] };
  try {
    let hiddenFindings = [];
    try {
      hiddenFindings = await listPersistedFindings({ statuses: ['OPEN', 'ACKNOWLEDGED', 'REVIEW'] });
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
      dataQuality.missing.push('cmms_hidden_failure_findings');
    }

    const [tasks, machines, technicians, breakdowns, plans] = await Promise.all([
      queryTasks("status NOT IN ('COMPLETED','CANCELLED') OR created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [], dataQuality),
      safeQuery('SELECT id, code, name, state, workshop_id, next_maintenance_date FROM machines ORDER BY id LIMIT 5000', [], dataQuality, 'machines'),
      safeQuery('SELECT id, name, skill, shift_name, availability_status, attendance_status, active FROM technicians LIMIT 5000', [], dataQuality, 'technicians'),
      safeQuery("SELECT id, machine_id, task_id, reported_at, severity, symptom, outcome, downtime_minutes FROM cmms_breakdown_reports WHERE outcome IS NULL OR TRIM(outcome) = '' OR reported_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) ORDER BY reported_at DESC LIMIT 2000", [], dataQuality, 'cmms_breakdown_reports'),
      safeQuery('SELECT id, machine_id, title, description, frequency_days, last_completed_at, next_due_at, active FROM cmms_preventive_plans WHERE active = 1 ORDER BY next_due_at ASC LIMIT 2000', [], dataQuality, 'cmms_preventive_plans'),
    ]);

    const baseAttention = buildAttention({ tasks, machines, technicians, breakdowns, plans, now });
    // Hidden-failure alerts are merged with a machine-level dedupe so a machine
    // already requiring attention from a live breakdown is not alerted twice.
    const attentionMachines = new Set(baseAttention.map(item => Number(item.machine?.id)).filter(Number.isFinite));
    const hiddenByMachine = new Map();
    for (const finding of hiddenFindings) {
      if (!['CRITICAL', 'HIGH'].includes(finding.risk_level)) continue;
      const machineId = Number(finding.machine_id);
      if (attentionMachines.has(machineId)) continue;
      if (!hiddenByMachine.has(machineId)) hiddenByMachine.set(machineId, finding);
    }
    const hiddenAttention = [...hiddenByMachine.values()].map(finding => ({
      id: `hidden-${finding.id}`,
      category: 'HIDDEN_FAILURE',
      severity: finding.risk_level,
      score: Number(finding.risk_score),
      reasonCodes: ['HIDDEN_FAILURE_RISK'],
      recommendationCode: finding.recommendation_code,
      subject: finding.title,
      what: finding.title,
      why: finding.explanation,
      machine: { id: finding.machine_id, code: finding.machine_code, name: finding.machine_name },
      technician: null,
      ageHours: finding.last_evidence_at ? Math.max(0, Math.round((now - new Date(finding.last_evidence_at)) / 3600000)) : null,
      overdueHours: null,
      recommendation: finding.recommendation,
      source: { table: 'cmms_hidden_failure_findings', id: finding.id },
    }));
    const attention = [...baseAttention, ...hiddenAttention].sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
    const briefing = buildBriefing({ tasks, machines, breakdowns, plans, attention, hiddenFindings, now });
    const workload = buildWorkload({ tasks, technicians, now });

    return res.json({
      success: true,
      data: {
        generatedAt: now.toISOString(),
        referenceDate: now.toISOString().slice(0, 10),
        briefing,
        attention: attention.slice(0, 25),
        actions: attention.slice(0, 10).map((item, index) => ({
          rank: index + 1,
          id: `action-${item.id}`,
          category: item.category,
          severity: item.severity,
          title: item.what,
          subject: item.subject,
          why: item.why,
          recommendationCode: item.recommendationCode,
          recommendation: item.recommendation,
          machine: item.machine,
          technician: item.technician,
          ageHours: item.ageHours,
          source: item.source,
        })),
        workload,
        dataQuality: {
          missing: [...new Set(dataQuality.missing)],
          notes: dataQuality.missing.length ? ['Some source tables are unavailable; affected insights are omitted instead of estimated.'] : [],
        },
      },
    });
  } catch (error) {
    console.error('Copilot overview failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not build the maintenance briefing.' });
  }
});

router.get('/report', async (req, res) => {
  const period = String(req.query.period || 'daily').toLowerCase();
  if (!['daily', 'weekly'].includes(period) && (!req.query.from && !req.query.to)) {
    return res.status(400).json({ success: false, message: 'Report period must be daily or weekly, or provide from/to dates.' });
  }

  let from;
  let to;
  try {
    from = parseRangeDate(req.query.from, 'start');
    to = parseRangeDate(req.query.to, 'end');
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  const now = new Date();
  // Validate before querying so an inverted range is rejected with a clear 400.
  try {
    const { resolveRange } = require('../services/copilotAnalysis');
    resolveRange({ period, from, to, now });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  const dataQuality = { missing: [] };
  try {
    const rangeStart = from ? `${from} 00:00:00` : new Date(now.getTime() - (period === 'weekly' ? 7 : 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const rangeEnd = to ? `${to} 23:59:59` : now.toISOString().slice(0, 19).replace('T', ' ');

    const [tasks, breakdowns, logs, occurrences, plans, technicians] = await Promise.all([
      queryTasks(
        "status NOT IN ('COMPLETED','CANCELLED') OR (created_at BETWEEN ? AND ?) OR (completed_at BETWEEN ? AND ?)",
        [rangeStart, rangeEnd, rangeStart, rangeEnd],
        dataQuality
      ),
      safeQuery('SELECT id, machine_id, task_id, reported_at, severity, symptom, outcome, downtime_minutes FROM cmms_breakdown_reports WHERE reported_at BETWEEN ? AND ? ORDER BY reported_at DESC LIMIT 5000', [rangeStart, rangeEnd], dataQuality, 'cmms_breakdown_reports'),
      safeQuery('SELECT id, technician_id, completed_at, maintenance_date, maintenance_type, cost, downtime_start, downtime_end FROM maintenance_logs WHERE (completed_at BETWEEN ? AND ?) OR (completed_at IS NULL AND maintenance_date BETWEEN ? AND ?) LIMIT 5000', [rangeStart, rangeEnd, rangeStart, rangeEnd], dataQuality, 'maintenance_logs'),
      safeQuery(`SELECT o.id, o.plan_id, o.due_at, o.task_id, t.status AS task_status
         FROM cmms_pm_occurrences o LEFT JOIN maintenance_tasks t ON t.id = o.task_id
         WHERE o.due_at BETWEEN ? AND ? LIMIT 5000`, [rangeStart, rangeEnd], dataQuality, 'cmms_pm_occurrences'),
      safeQuery('SELECT id, machine_id, title, next_due_at, active FROM cmms_preventive_plans WHERE active = 1 LIMIT 5000', [], dataQuality, 'cmms_preventive_plans'),
      safeQuery('SELECT id, name FROM technicians WHERE active = 1 LIMIT 5000', [], dataQuality, 'technicians'),
      ]);

    const report = buildReport({ period, from, to, now, tasks, breakdowns, logs, occurrences, plans, technicians });
    return res.json({
      success: true,
      data: {
        ...report,
        dataQuality: {
          missing: [...new Set(dataQuality.missing)],
          notes: dataQuality.missing.length ? ['Some source tables are unavailable; affected report fields are omitted instead of estimated.'] : [],
        },
      },
    });
  } catch (error) {
    console.error('Copilot report failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not build the maintenance report.' });
  }
});

module.exports = router;
