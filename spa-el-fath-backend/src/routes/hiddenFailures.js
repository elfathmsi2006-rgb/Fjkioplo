const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const {
  ACTIVE_STATUSES,
  listPersistedFindings,
  machineRiskSummary,
  normalizeWindow,
  syncHiddenFailures,
} = require('../services/hiddenFailureRunner');

const router = express.Router();
const MANAGER_ROLES = new Set(['admin', 'production_chief', 'workshop_head']);
const VALID_STATUSES = new Set(['OPEN', 'ACKNOWLEDGED', 'REVIEW', 'RESOLVED']);
const TRANSITIONS = {
  OPEN: new Set(['ACKNOWLEDGED', 'REVIEW', 'RESOLVED']),
  ACKNOWLEDGED: new Set(['REVIEW', 'RESOLVED', 'OPEN']),
  REVIEW: new Set(['ACKNOWLEDGED', 'RESOLVED', 'OPEN']),
  RESOLVED: new Set(['OPEN']),
};

router.use(requireAuth);
router.use((req, res, next) => {
  if (!MANAGER_ROLES.has(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Maintenance manager access is required.' });
  }
  return next();
});

function summarize(findings) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const categories = {};
  for (const finding of findings) {
    if (counts[finding.risk_level] != null) counts[finding.risk_level] += 1;
    categories[finding.category] = (categories[finding.category] || 0) + 1;
  }
  return { total: findings.length, byLevel: counts, byCategory: categories };
}

async function writeAudit({ id, status, note, actorId, previousStatus }) {
  try {
    await pool.execute(
      `INSERT INTO audit_trail (table_name, record_id, action, actor_id, old_data, new_data)
       VALUES ('cmms_hidden_failure_findings', ?, 'UPDATE', ?, ?, ?)`,
      [
        String(id),
        actorId || null,
        JSON.stringify({ event: 'hidden_failure_workflow', previousStatus }),
        JSON.stringify({ event: 'hidden_failure_workflow', status, note: note || null }),
      ]
    );
  } catch (error) {
    // Audit must never block the workflow action itself.
    if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
  }
}

// Detection is expensive (it re-reads every evidence table), so a short-lived
// server cache prevents a full re-scan on every page load. `refresh=true`
// forces an immediate re-scan.
const SYNC_TTL_MS = 60 * 1000;
const lastSyncAt = new Map();

function shouldSync(windowDays, force) {
  if (force) return true;
  const previous = lastSyncAt.get(windowDays);
  const now = Date.now();
  if (previous !== undefined && now - previous < SYNC_TTL_MS) return false;
  lastSyncAt.set(windowDays, now);
  return true;
}

router.get('/', async (req, res) => {
  const windowDays = normalizeWindow(req.query.windowDays);
  const refresh = String(req.query.refresh || '').toLowerCase();
  const skipSync = refresh === 'false';

  try {
    let sync = null;
    if (!skipSync && shouldSync(windowDays, refresh === 'true')) {
      sync = await syncHiddenFailures({ windowDays });
    }

    const [findings, machineRisks] = await Promise.all([
      listPersistedFindings({ statuses: ACTIVE_STATUSES, windowDays }),
      machineRiskSummary(windowDays),
    ]);

    return res.json({
      success: true,
      data: {
        windowDays,
        generatedAt: new Date().toISOString(),
        summary: summarize(findings),
        findings: findings.map(finding => ({
          id: finding.id,
          fingerprint: finding.fingerprint,
          machineId: finding.machine_id,
          machine: {
            id: finding.machine_id,
            code: finding.machine_code,
            name: finding.machine_name,
            state: finding.machine_state,
          },
          category: finding.category,
          key: finding.finding_key,
          riskLevel: finding.risk_level,
          riskScore: finding.risk_score,
          title: finding.title,
          explanation: finding.explanation,
          recommendationCode: finding.recommendation_code,
          recommendation: finding.recommendation,
          evidence: finding.evidence,
          scoreFactors: finding.score_factors,
          windowDays: finding.window_days,
          firstEvidenceAt: finding.first_evidence_at,
          lastEvidenceAt: finding.last_evidence_at,
          detectedAt: finding.detected_at,
          status: finding.status,
          note: finding.note,
          acknowledgedAt: finding.acknowledged_at,
          reviewedAt: finding.reviewed_at,
          resolvedAt: finding.resolved_at,
        })),
        machineRisks,
        coverage: sync?.detection?.coverage || null,
        persistence: sync?.persistence || null,
        dataQuality: sync?.dataQuality || { missing: [], notes: [] },
      },
    });
  } catch (error) {
    console.error('Hidden failure listing failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not build the hidden failure center.' });
  }
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid finding id.' });
  }
  const status = String(req.body?.status || '').toUpperCase();
  // An absent note keeps the stored note; an explicit null clears it.
  const note = req.body && 'note' in req.body
    ? (req.body.note == null ? null : String(req.body.note).trim().slice(0, 1000))
    : undefined;
  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({ success: false, message: 'Status must be OPEN, ACKNOWLEDGED, REVIEW or RESOLVED.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, status, risk_level FROM cmms_hidden_failure_findings WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Finding not found.' });
    const current = rows[0];
    if (current.status === status) {
      return res.json({ success: true, data: { id, status, unchanged: true } });
    }
    if (!TRANSITIONS[current.status]?.has(status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot move a finding from ${current.status} to ${status}.`,
      });
    }

    const now = new Date();
    // The auth middleware exposes the user id as `sub`; `req.user.id` is undefined.
    const actorId = Number(req.user.sub);
    const fields = ['status = ?'];
    const params = [status];
    if (note !== undefined) {
      fields.push('note = ?');
      params.push(note);
    }
    if (status === 'ACKNOWLEDGED') {
      fields.push('acknowledged_by = ?', 'acknowledged_at = ?');
      params.push(actorId, now);
    }
    if (status === 'REVIEW') {
      fields.push('reviewed_by = ?', 'reviewed_at = ?');
      params.push(actorId, now);
    }
    if (status === 'RESOLVED') {
      fields.push('resolved_by = ?', 'resolved_at = ?');
      params.push(actorId, now);
    }
    if (status === 'OPEN') {
      fields.push('resolved_by = NULL', 'resolved_at = NULL', 'reviewed_by = NULL', 'reviewed_at = NULL');
    }
    params.push(id);
    await pool.execute(`UPDATE cmms_hidden_failure_findings SET ${fields.join(', ')} WHERE id = ?`, params);
    await writeAudit({ id, status, note: note ?? null, actorId, previousStatus: current.status });

    return res.json({ success: true, data: { id, status, previousStatus: current.status, note: note ?? null } });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ success: false, message: 'Hidden failure storage is not installed. Apply the Phase 4 migration.' });
    }
    console.error('Hidden failure workflow failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not update the hidden failure finding.' });
  }
});

module.exports = router;
