// Phase 6 scheduled maintenance Excel exports. Runs the Phase 5 export
// generation on a persisted schedule, records execution history and applies
// retention. Jobs are driven by persisted schedules so they survive restarts.

const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { generateMaintenanceExport } = require('./maintenanceExportService');
const { sendNotificationEmail } = require('./gmailSender');

const EXPORT_DIR = path.join(process.cwd(), 'exports');
const FREQUENCIES = new Set(['daily', 'weekly', 'monthly']);
const EXECUTION_STATUSES = new Set(['RUNNING', 'SUCCESS', 'FAILED']);

function isValidFrequency(value) {
  return FREQUENCIES.has(String(value || '').toLowerCase());
}

function isValidExportTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
}

function isValidTimezone(value) {
  return typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 64;
}

function isValidRetention(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 && number <= 365;
}

function timezoneParts(timeZone, date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = type => Number(parts.find(part => part.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month') - 1, day: get('day'), hour: get('hour'), minute: get('minute') };
}

function periodKey(frequency, timeZone, date) {
  const parts = timezoneParts(timeZone, date);
  if (frequency === 'daily') {
    return `D:${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  }
  if (frequency === 'weekly') {
    const target = Date.UTC(parts.year, parts.month, parts.day);
    const weekIndex = Math.floor((target - Date.UTC(parts.year, 0, 1)) / (7 * 86400000));
    return `W:${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}-${weekIndex}`;
  }
  return `M:${parts.year}-${String(parts.month + 1).padStart(2, '0')}`;
}

function isScheduleDue(schedule, now = new Date()) {
  if (!schedule || !schedule.enabled) return false;
  if (!isValidFrequency(schedule.frequency)) return false;
  const current = periodKey(schedule.frequency, schedule.timezone, now);
  const last = schedule.last_run_at ? periodKey(schedule.frequency, schedule.timezone, new Date(schedule.last_run_at)) : null;
  return last === null || last < current;
}

function resolveExportFileName(date = new Date()) {
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `spa-el-fath-maintenance-${stamp}.xlsx`;
}

async function listExportSchedules() {
  try {
    const [rows] = await pool.execute(
      `SELECT id, frequency, export_time AS exportTime, timezone, enabled, last_run_at AS lastRunAt,
              last_status AS lastStatus, retention_days AS retentionDays, created_by AS createdBy
       FROM cmms_maintenance_export_schedules ORDER BY id ASC LIMIT 200`,
    );
    return rows.map(row => ({ ...row, enabled: Number(row.enabled) === 1 }));
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return [];
    throw error;
  }
}

async function getExportSchedule(id) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, frequency, export_time AS exportTime, timezone, enabled, last_run_at AS lastRunAt,
              last_status AS lastStatus, retention_days AS retentionDays, created_by AS createdBy
       FROM cmms_maintenance_export_schedules WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) return null;
    return { ...rows[0], enabled: Number(rows[0].enabled) === 1 };
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return null;
    throw error;
  }
}

async function createExportSchedule({ frequency, exportTime, timezone, enabled, retentionDays, createdBy }) {
  const [result] = await pool.execute(
    `INSERT INTO cmms_maintenance_export_schedules (frequency, export_time, timezone, enabled, retention_days, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [frequency, exportTime, timezone, enabled ? 1 : 0, retentionDays, createdBy || null],
  );
  const scheduleId = result.insertId;
  const created = await getExportSchedule(Number(scheduleId));
  return { ...created, id: Number(scheduleId) };
}

async function updateExportSchedule(id, patch) {
  const fields = [];
  const values = [];
  if (patch.frequency !== undefined) {
    if (!isValidFrequency(patch.frequency)) throw new Error('Invalid export frequency.');
    fields.push('frequency = ?');
    values.push(patch.frequency);
  }
  if (patch.exportTime !== undefined) {
    if (!isValidExportTime(patch.exportTime)) throw new Error('Export time must be a valid HH:MM value.');
    fields.push('export_time = ?');
    values.push(patch.exportTime);
  }
  if (patch.timezone !== undefined) {
    if (!isValidTimezone(patch.timezone)) throw new Error('Export timezone must be a valid IANA timezone name.');
    fields.push('timezone = ?');
    values.push(patch.timezone);
  }
  if (patch.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(patch.enabled ? 1 : 0);
  }
  if (patch.retentionDays !== undefined) {
    if (!isValidRetention(patch.retentionDays)) throw new Error('Retention days must be between 1 and 365.');
    fields.push('retention_days = ?');
    values.push(patch.retentionDays);
  }
  if (!fields.length) return getExportSchedule(id);
  values.push(id);
  await pool.execute(`UPDATE cmms_maintenance_export_schedules SET ${fields.join(', ')} WHERE id = ?`, values);
  return getExportSchedule(id);
}

async function hasRunningExecution(scheduleId) {
  try {
    const [rows] = await pool.execute(
      `SELECT id FROM cmms_maintenance_export_executions WHERE schedule_id = ? AND status = 'RUNNING' LIMIT 1`,
      [scheduleId],
    );
    return rows.length > 0;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return false;
    throw error;
  }
}

async function recordExportFailure(schedule, error, triggeredBy = 'SCHEDULER') {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const filename = resolveExportFileName();
  try {
    const [result] = await pool.execute(
      `INSERT INTO cmms_maintenance_export_executions (schedule_id, status, filename, file_size, record_count, error_message, triggered_by, started_at, finished_at)
       VALUES (?, 'FAILED', ?, NULL, NULL, ?, ?, ?, NOW())`,
      [schedule.id, filename, errorMessage.slice(0, 1000), triggeredBy, new Date()],
    );
    await pool.execute(
      `UPDATE cmms_maintenance_export_schedules SET last_status = 'FAILED' WHERE id = ?`,
      [schedule.id],
    );
    const recipients = await resolveManagerEmails(schedule);
    for (const email of recipients) {
      await sendNotificationEmail({
        to: email,
        subject: 'Scheduled maintenance Excel export failed',
        text: `Scheduled maintenance export (${schedule.frequency}) failed: ${errorMessage}. Schedule ID: ${schedule.id}.`,
      }).catch(notificationError => console.error('Export failure notification failed:', notificationError.message));
    }
    return Number(result.insertId);
  } catch (recordingError) {
    // History recording is the source of truth; notification must not break it.
    console.error('Could not record scheduled export failure:', recordingError.message);
    throw error;
  }
}

async function resolveManagerEmails(schedule) {
  const emails = new Set();
  try {
    const [rows] = await pool.execute(
      `SELECT COALESCE(NULLIF(u.email, ''), NULLIF(t.email, '')) AS email
       FROM cmms_maintenance_export_schedules s
       LEFT JOIN users u ON u.id = s.created_by
       LEFT JOIN technicians t ON t.user_id = u.id
       WHERE s.id = ? LIMIT 5`,
      [schedule.id],
    );
    for (const row of rows) {
      if (row.email) emails.add(row.email);
    }
  } catch (error) {
    // Email notification is best-effort and never blocks export failure handling.
  }
  return [...emails];
}

async function applyRetention(schedule) {
  if (!isValidRetention(schedule.retentionDays)) return;
  const cutoff = new Date(Date.now() - Number(schedule.retentionDays) * 24 * 60 * 60 * 1000);
  try {
    await pool.execute(
      `DELETE FROM cmms_maintenance_export_executions WHERE schedule_id = ? AND finished_at < ?`,
      [schedule.id, cutoff],
    );
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return;
    throw error;
  }
}

async function runExportSchedule(schedule, triggeredBy = 'SCHEDULER') {
  const startedAt = new Date();
  const fileName = resolveExportFileName();
  const { buffer, missing, fileName: generatedName, dataSets } = await generateMaintenanceExport();
  const filePath = path.join(EXPORT_DIR, fileName);
  const fileSize = buffer ? buffer.length : null;
  const recordCount = (dataSets || []).filter(dataSet => dataSet && dataSet.name !== 'Summary').reduce(
    (sum, dataSet) => sum + (dataSet.rows ? dataSet.rows.length : 0), 0,
  );
  try {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    fs.writeFileSync(filePath, buffer);
  } catch (error) {
    // File storage is best effort; the execution record keeps the truth.
  }

  const [result] = await pool.execute(
    `INSERT INTO cmms_maintenance_export_executions (schedule_id, status, filename, file_size, record_count, error_message, triggered_by, started_at, finished_at)
     VALUES (?, 'SUCCESS', ?, ?, ?, NULL, ?, ?, NOW())`,
    [schedule.id, fileName, fileSize, recordCount, triggeredBy, startedAt],
  );
  await pool.execute(
    `UPDATE cmms_maintenance_export_schedules SET last_run_at = ?, last_status = 'SUCCESS' WHERE id = ?`,
    [startedAt, schedule.id],
  );
  await applyRetention(schedule).catch(() => {});
  return { status: 'SUCCESS', executionId: Number(result.insertId), fileName, fileSize, recordCount };
}

async function runExportForSchedule(schedule, triggeredBy = 'MANUAL') {
  if (await hasRunningExecution(schedule.id)) {
    return { ok: false, error: 'An export execution is already running for this schedule.', failureId: null };
  }
  try {
    const execution = await runExportSchedule(schedule, triggeredBy);
    return { ok: true, execution };
  } catch (error) {
    const failureId = await recordExportFailure(schedule, error, triggeredBy);
    return { ok: false, error: error instanceof Error ? error.message : String(error), failureId };
  }
}

async function runDueExportSchedules() {
  const schedules = await listExportSchedules();
  const now = new Date();
  for (const schedule of schedules) {
    if (!schedule.enabled) continue;
    if (await hasRunningExecution(schedule.id)) continue;
    if (!isScheduleDue(schedule, now)) continue;
    const outcome = await runExportForSchedule(schedule, 'SCHEDULER');
    if (!outcome.ok) {
      console.error(`Scheduled maintenance export failed for schedule ${schedule.id}:`, outcome.error);
    }
  }
}

let schedulerTimer = null;
function startExportScheduler() {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(() => {
    runDueExportSchedules().catch(error => console.error('Scheduled export worker error:', error.message));
  }, 60 * 1000).unref();
}

function stopExportScheduler() {
  if (!schedulerTimer) return;
  clearInterval(schedulerTimer);
  schedulerTimer = null;
}

async function listExportExecutions(status, limit) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  try {
    const [rows] = await pool.execute(
      `SELECT e.id, e.schedule_id AS scheduleId, e.status, e.filename, e.file_size AS fileSize, e.record_count AS recordCount,
              e.error_message AS errorMessage, e.triggered_by AS triggeredBy, e.started_at AS startedAt, e.finished_at AS finishedAt,
              s.frequency AS frequency, s.export_time AS exportTime, s.timezone AS timezone, s.enabled AS enabled
       FROM cmms_maintenance_export_executions e
       LEFT JOIN cmms_maintenance_export_schedules s ON s.id = e.schedule_id
       ${status ? 'WHERE e.status = ?' : ''}
       ORDER BY e.started_at DESC, e.id DESC LIMIT ?`,
      status ? [status, safeLimit] : [safeLimit],
    );
    return rows;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return [];
    throw error;
  }
}

async function getExportExecution(id) {
  try {
    const [rows] = await pool.execute(
      `SELECT e.id, e.schedule_id AS scheduleId, e.status, e.filename, e.file_size AS fileSize, e.record_count AS recordCount,
              e.error_message AS errorMessage, e.triggered_by AS triggeredBy, e.started_at AS startedAt, e.finished_at AS finishedAt,
              s.frequency AS frequency, s.export_time AS exportTime, s.timezone AS timezone, s.enabled AS enabled
       FROM cmms_maintenance_export_executions e
       LEFT JOIN cmms_maintenance_export_schedules s ON s.id = e.schedule_id
       WHERE e.id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return null;
    throw error;
  }
}

async function downloadExportExecution(id) {
  const execution = await getExportExecution(id);
  if (!execution) return { status: 'NOT_FOUND', execution };
  const filePath = path.join(EXPORT_DIR, execution.filename);
  if (!fs.existsSync(filePath)) return { status: 'FILE_MISSING', execution };
  const content = fs.readFileSync(filePath);
  return { status: 'OK', execution, content };
}

module.exports = {
  FREQUENCIES,
  EXECUTION_STATUSES,
  isValidFrequency,
  isValidExportTime,
  isValidTimezone,
  isValidRetention,
  isScheduleDue,
  periodKey,
  resolveExportFileName,
  startExportScheduler,
  stopExportScheduler,
  runDueExportSchedules,
  runExportSchedule,
  runExportForSchedule,
  listExportSchedules,
  getExportSchedule,
  createExportSchedule,
  updateExportSchedule,
  hasRunningExecution,
  listExportExecutions,
  getExportExecution,
  downloadExportExecution,
};
