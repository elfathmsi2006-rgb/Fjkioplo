// Collects real database evidence and persists deterministic hidden-failure
// findings. Workflow status is owned by managers: detection refreshes evidence
// but never silently resolves or reopens a finding without newer evidence.

const pool = require('../db');
const {
  DEFAULT_WINDOW_DAYS,
  detectHiddenFailures,
  levelFor,
} = require('./hiddenFailureDetection');

const ACTIVE_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'REVIEW'];

function normalizeWindow(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 7 || number > 365) return DEFAULT_WINDOW_DAYS;
  return Math.round(number);
}

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

async function collectEvidence(windowDays, now = new Date(), dataQuality = { missing: [] }) {
  const start = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const startSql = start.toISOString().slice(0, 19).replace('T', ' ');
  const endSql = now.toISOString().slice(0, 19).replace('T', ' ');

  const [machines, breakdowns, tasks, logs, conditionReadings, meterReadings, partUsages] = await Promise.all([
    safeQuery('SELECT id, code, name, state FROM machines ORDER BY id LIMIT 5000', [], dataQuality, 'machines'),
    safeQuery(
      `SELECT id, machine_id, task_id, reported_at, severity, symptom, root_cause, corrective_action, outcome, downtime_minutes
       FROM cmms_breakdown_reports WHERE reported_at BETWEEN ? AND ? ORDER BY reported_at ASC LIMIT 5000`,
      [startSql, endSql], dataQuality, 'cmms_breakdown_reports'
    ),
    safeQuery(
      `SELECT id, title, maintenance_type, machine_id, status, created_at, completed_at
       FROM maintenance_tasks WHERE (completed_at BETWEEN ? AND ?) OR (created_at BETWEEN ? AND ?)
       ORDER BY created_at ASC LIMIT 5000`,
      [startSql, endSql, startSql, endSql], dataQuality, 'maintenance_tasks'
    ),
    safeQuery(
      `SELECT id, machine_id, task_id, maintenance_type, duration_hours, completed_at, maintenance_date
       FROM maintenance_logs WHERE (completed_at BETWEEN ? AND ?) OR (completed_at IS NULL AND maintenance_date BETWEEN ? AND ?)
       ORDER BY maintenance_date ASC LIMIT 5000`,
      [startSql, endSql, startSql, endSql], dataQuality, 'maintenance_logs'
    ),
    safeQuery(
      `SELECT id, machine_id, metric, value_num, unit, measured_at, threshold_min, threshold_max
       FROM cmms_condition_readings WHERE measured_at BETWEEN ? AND ? ORDER BY measured_at ASC LIMIT 20000`,
      [startSql, endSql], dataQuality, 'cmms_condition_readings'
    ),
    safeQuery(
      `SELECT id, machine_id, meter_type, reading_value, reading_at
       FROM cmms_machine_meter_readings WHERE reading_at BETWEEN ? AND ? ORDER BY reading_at ASC LIMIT 20000`,
      [startSql, endSql], dataQuality, 'cmms_machine_meter_readings'
    ),
    safeQuery(
      `SELECT wop.id, wop.part_id, wop.quantity, wop.created_at, t.machine_id, wop.task_id,
              p.name AS part_name, p.sku
       FROM cmms_work_order_parts wop
       JOIN maintenance_tasks t ON t.id = wop.task_id
       JOIN warehouse_parts p ON p.id = wop.part_id
       WHERE wop.created_at BETWEEN ? AND ? AND wop.status IN ('RESERVED','ISSUED')
       ORDER BY wop.created_at ASC LIMIT 10000`,
      [startSql, endSql], dataQuality, 'cmms_work_order_parts'
    ),
  ]);

  return { machines, breakdowns, tasks, logs, conditionReadings, meterReadings, partUsages };
}

function computeFindings(windowDays, now, evidence) {
  return detectHiddenFailures({ ...evidence, windowDays, now });
}

async function ensureTable(dataQuality) {
  try {
    await pool.query('SELECT 1 FROM cmms_hidden_failure_findings LIMIT 1');
    return true;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      dataQuality.missing.push('cmms_hidden_failure_findings');
      return false;
    }
    throw error;
  }
}

async function persistFindings(findings, now) {
  let inserted = 0;
  let updated = 0;
  let reopened = 0;
  let preserved = 0;

  for (const finding of findings) {
    const [existingRows] = await pool.execute(
      'SELECT id, status, last_evidence_at, resolved_at FROM cmms_hidden_failure_findings WHERE fingerprint = ? LIMIT 1',
      [finding.fingerprint]
    );
    const existing = existingRows[0];
    const evidenceAt = finding.lastEvidenceAt ? new Date(finding.lastEvidenceAt) : null;
    const resolvedAt = existing?.resolved_at ? new Date(existing.resolved_at) : null;
    const newerEvidence = evidenceAt && (!resolvedAt || evidenceAt.getTime() > resolvedAt.getTime());

    if (!existing) {
      await pool.execute(
        `INSERT INTO cmms_hidden_failure_findings
          (fingerprint, machine_id, category, finding_key, risk_level, risk_score, title, explanation,
           recommendation_code, recommendation, evidence, score_factors, window_days,
           first_evidence_at, last_evidence_at, detected_at, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'OPEN')`,
        [
          finding.fingerprint, finding.machineId, finding.category, finding.key,
          finding.riskLevel, finding.riskScore, finding.title, finding.explanation,
          finding.recommendationCode, finding.recommendation,
          JSON.stringify(finding.evidence), JSON.stringify(finding.scoreFactors),
          finding.windowDays, finding.firstEvidenceAt, finding.lastEvidenceAt, now,
        ]
      );
      inserted += 1;
      continue;
    }

    // A resolved finding is only reopened when the latest evidence is newer
    // than the resolution time. Otherwise its workflow state is preserved.
    const nextStatus = existing.status === 'RESOLVED' && !newerEvidence ? 'RESOLVED' : existing.status === 'RESOLVED' ? 'OPEN' : existing.status;
    await pool.execute(
      `UPDATE cmms_hidden_failure_findings
       SET machine_id=?, category=?, finding_key=?, risk_level=?, risk_score=?, title=?, explanation=?,
           recommendation_code=?, recommendation=?, evidence=?, score_factors=?, window_days=?,
           first_evidence_at=?, last_evidence_at=?, detected_at=?, status=?,
           resolved_by=IF(?='RESOLVED', resolved_by, NULL), resolved_at=IF(?='RESOLVED', resolved_at, NULL)
       WHERE id=?`,
      [
        finding.machineId, finding.category, finding.key, finding.riskLevel, finding.riskScore,
        finding.title, finding.explanation, finding.recommendationCode, finding.recommendation,
        JSON.stringify(finding.evidence), JSON.stringify(finding.scoreFactors), finding.windowDays,
        finding.firstEvidenceAt, finding.lastEvidenceAt, now, nextStatus, nextStatus, nextStatus,
        existing.id,
      ]
    );
    updated += 1;
    if (nextStatus === 'OPEN' && existing.status === 'RESOLVED') reopened += 1;
    if (nextStatus === 'RESOLVED') preserved += 1;
  }

  return { inserted, updated, reopened, preserved };
}

async function syncHiddenFailures({ windowDays = DEFAULT_WINDOW_DAYS, now = new Date() } = {}) {
  const days = normalizeWindow(windowDays);
  const dataQuality = { missing: [] };
  const evidence = await collectEvidence(days, now, dataQuality);
  const detection = computeFindings(days, now, evidence);
  const hasTable = await ensureTable(dataQuality);

  let persistence = { inserted: 0, updated: 0, reopened: 0, preserved: 0, skipped: true };
  if (hasTable) persistence = await persistFindings(detection.findings, now);

  return {
    windowDays: days,
    generatedAt: now.toISOString(),
    detection,
    persistence,
    dataQuality: {
      missing: [...new Set(dataQuality.missing)],
      notes: dataQuality.missing.length
        ? ['Some source tables are unavailable; affected detection rules were skipped instead of estimated.']
        : [],
    },
  };
}

async function listPersistedFindings({ statuses = ACTIVE_STATUSES, windowDays = null, minScore = 0 } = {}) {
  const placeholders = statuses.map(() => '?').join(',');
  const params = [...statuses];
  let where = `status IN (${placeholders})`;
  if (windowDays) {
    where += ' AND window_days = ?';
    params.push(windowDays);
  }
  if (minScore) {
    where += ' AND risk_score >= ?';
    params.push(minScore);
  }
  try {
    const [rows] = await pool.execute(
      `SELECT f.*, m.code AS machine_code, m.name AS machine_name, m.state AS machine_state
       FROM cmms_hidden_failure_findings f
       JOIN machines m ON m.id = f.machine_id
       WHERE ${where}
       ORDER BY f.risk_score DESC, f.last_evidence_at DESC, f.id ASC LIMIT 500`,
      params
    );
    return rows.map(row => ({
      ...row,
      evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence || '{}') : row.evidence,
      score_factors: typeof row.score_factors === 'string' ? JSON.parse(row.score_factors || '[]') : row.score_factors,
    }));
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return [];
    throw error;
  }
}

async function machineRiskSummary(windowDays = null) {
  try {
    const params = [];
    let filter = '';
    if (windowDays) {
      filter = 'AND f.window_days = ?';
      params.push(windowDays);
    }
    const [rows] = await pool.execute(
      `SELECT f.machine_id, m.code, m.name, m.state,
              MAX(f.risk_score) AS max_score,
              SUM(CASE WHEN f.risk_score >= 50 THEN 1 ELSE 0 END) AS supporting,
              COUNT(*) AS finding_count,
              MAX(f.last_evidence_at) AS last_evidence_at
       FROM cmms_hidden_failure_findings f
       JOIN machines m ON m.id = f.machine_id
       WHERE f.status IN ('OPEN','ACKNOWLEDGED','REVIEW') ${filter}
       GROUP BY f.machine_id, m.code, m.name, m.state
       ORDER BY max_score DESC, f.machine_id ASC LIMIT 500`,
      params
    );
    return rows.map(row => {
      const score = Math.min(100, Number(row.max_score) + Math.max(0, Number(row.supporting) - 1) * 4);
      return {
        machineId: Number(row.machine_id),
        code: row.code,
        name: row.name,
        state: row.state,
        riskScore: score,
        riskLevel: levelFor(score),
        findingCount: Number(row.finding_count),
        lastEvidenceAt: row.last_evidence_at,
      };
    });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return [];
    throw error;
  }
}

module.exports = {
  ACTIVE_STATUSES,
  normalizeWindow,
  collectEvidence,
  computeFindings,
  syncHiddenFailures,
  listPersistedFindings,
  machineRiskSummary,
};
