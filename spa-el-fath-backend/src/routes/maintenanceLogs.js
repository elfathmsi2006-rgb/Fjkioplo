const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
const MANAGER_ROLES = new Set(['admin', 'production_chief', 'workshop_head']);
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const UPLOAD_DIR = path.resolve(BACKEND_ROOT, process.env.MAINTENANCE_UPLOAD_DIR || 'storage/maintenance');
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const AUDIO_MIMES = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_IMAGES_PER_LOG = 8;
const MAX_AUDIO_PER_LOG = 1;

function userId(req) {
  const id = Number(req.user?.sub);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function isMissingSchema(error) {
  return error && ['ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE', 'ER_CANNOT_ADD_FOREIGN'].includes(error.code);
}
function schemaUnavailable(res) {
  return res.status(503).json({ success: false, message: 'The maintenance workflow migration has not been applied. Back up the database, review sql/202610270001_cmms_workflow_enhancements.sql, and apply it manually before using persistent maintenance logs.' });
}
function matchesMime(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  if (mime === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'image/gif') return buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a';
  if (mime === 'image/webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (mime === 'audio/ogg') return buffer.subarray(0, 4).toString('ascii') === 'OggS';
  if (mime === 'audio/wav' || mime === 'audio/x-wav') return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE';
  if (mime === 'audio/mp4') return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  if (mime === 'audio/mpeg') return buffer.subarray(0, 3).toString('ascii') === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  if (mime === 'audio/webm') return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return false;
}

function safeFilename(value) {
  let decoded = String(value || 'attachment').slice(0, 255);
  try { decoded = decodeURIComponent(decoded); } catch {}
  decoded = path.basename(decoded).replace(/[\u0000-\u001f\u007f]/g, '').replace(/[^\p{L}\p{N}._() -]/gu, '_').trim();
  return decoded || 'attachment';
}
function extForMime(mime) {
  return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'audio/webm': '.webm', 'audio/ogg': '.ogg', 'audio/mp4': '.m4a', 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/x-wav': '.wav' })[mime] || '';
}
async function getTechnician(connection, user) {
  const id = Number(user?.sub);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const [rows] = await connection.execute('SELECT id FROM technicians WHERE user_id = ? LIMIT 1', [id]);
  return rows[0] || null;
}
async function canAccessLog(connection, req, log) {
  if (MANAGER_ROLES.has(req.user?.role)) return true;
  if (req.user?.role !== 'maintenance_worker') return false;
  const technician = await getTechnician(connection, req.user);
  return Boolean(technician && Number(log.technician_id) === Number(technician.id));
}
async function loadLog(connection, id) {
  const [rows] = await connection.execute(
    `SELECT l.*, m.code AS machine_code, t.name AS technician_name
     FROM maintenance_logs l
     LEFT JOIN machines m ON m.id = l.machine_id
     LEFT JOIN technicians t ON t.id = l.technician_id
     WHERE l.id = ? LIMIT 1`, [id]);
  if (!rows.length) return null;
  const log = rows[0];
  const [attachments] = await connection.execute(
    `SELECT id, maintenance_log_id, attachment_type, original_filename, mime_type, size_bytes, created_at
     FROM maintenance_log_attachments WHERE maintenance_log_id = ? ORDER BY id ASC`, [id]);
  log.attachments = attachments.map(item => ({ ...item, url: `/api/maintenance-logs/${id}/attachments/${item.id}` }));
  return log;
}
function normalizedLog(log) {
  return {
    id: String(log.id), machineId: log.machine_id == null ? '' : String(log.machine_id),
    taskId: log.task_id == null ? '' : String(log.task_id), type: String(log.maintenance_type || 'CORRECTIVE').toLowerCase(),
    date: log.maintenance_date ? String(log.maintenance_date instanceof Date ? log.maintenance_date.toISOString().slice(0, 10) : log.maintenance_date).slice(0, 10) : '',
    durationHours: log.downtime_start && log.downtime_end ? Math.max(0, Math.round((new Date(log.downtime_end) - new Date(log.downtime_start)) / 36000) / 100) : Number(log.duration_hours || 0),
    technician: log.technician_name || '', cost: Number(log.cost || 0),
    notes: log.work_performed || log.description || '', status: log.submission_status === 'SUBMITTED' ? 'completed' : 'in-progress',
    outageStart: log.downtime_start || log.started_at || undefined, outageEnd: log.downtime_end || undefined,
    failureCause: log.problem_description || undefined,
    attachments: (log.attachments || []).map(item => ({ id: String(item.id), type: item.attachment_type.toLowerCase(), name: item.original_filename, mimeType: item.mime_type, size: Number(item.size_bytes), url: item.url })),
  };
}

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    let rows;
    if (MANAGER_ROLES.has(req.user?.role)) {
      [rows] = await connection.execute(
        `SELECT l.*, m.code AS machine_code, COALESCE(NULLIF(u.full_name, ''), t.name) AS technician_name
         FROM maintenance_logs l
         LEFT JOIN machines m ON m.id = l.machine_id
         LEFT JOIN technicians t ON t.id = l.technician_id
         LEFT JOIN users u ON u.id = t.user_id
         WHERE l.submission_status = 'SUBMITTED'
         ORDER BY l.maintenance_date DESC, l.id DESC LIMIT 500`);
    } else if (req.user?.role === 'maintenance_worker') {
      const technician = await getTechnician(connection, req.user);
      if (!technician) return res.json({ success: true, data: [] });
      [rows] = await connection.execute(
        `SELECT l.*, m.code AS machine_code, COALESCE(NULLIF(u.full_name, ''), t.name) AS technician_name
         FROM maintenance_logs l
         LEFT JOIN machines m ON m.id = l.machine_id
         LEFT JOIN technicians t ON t.id = l.technician_id
         LEFT JOIN users u ON u.id = t.user_id
         WHERE l.technician_id = ? AND l.submission_status = 'SUBMITTED'
         ORDER BY l.maintenance_date DESC, l.id DESC LIMIT 500`, [technician.id]);
    } else return res.status(403).json({ success: false, message: 'You cannot view maintenance logs.' });

    // Load every attachment in a single query instead of one round trip per log.
    const attachmentsByLog = new Map();
    if (rows.length) {
      const ids = rows.map(row => row.id);
      const [attachments] = await connection.query(
        `SELECT id, maintenance_log_id, attachment_type, original_filename, mime_type, size_bytes, created_at
         FROM maintenance_log_attachments
         WHERE maintenance_log_id IN (${ids.map(() => '?').join(',')})
         ORDER BY id ASC`, ids);
      for (const item of attachments) {
        const list = attachmentsByLog.get(item.maintenance_log_id) || [];
        list.push(item);
        attachmentsByLog.set(item.maintenance_log_id, list);
      }
    }

    const logs = rows.map(row => {
      const attachments = (attachmentsByLog.get(row.id) || []).map(item => ({
        ...item,
        url: `/api/maintenance-logs/${row.id}/attachments/${item.id}`,
      }));
      return normalizedLog({ ...row, attachments });
    });
    return res.json({ success: true, data: logs });
  } catch (error) {
    if (isMissingSchema(error)) return schemaUnavailable(res);
    console.error('Failed to list maintenance logs:', error.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve maintenance logs.' });
  } finally { if (connection) connection.release(); }
});

router.get('/:id', async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid maintenance log ID.' });
  let connection;
  try {
    connection = await pool.getConnection();
    const log = await loadLog(connection, id);
    if (!log) return res.status(404).json({ success: false, message: 'Maintenance log not found.' });
    if (!await canAccessLog(connection, req, log)) return res.status(403).json({ success: false, message: 'You cannot view this maintenance log.' });
    return res.json({ success: true, data: { ...normalizedLog(log), raw: { id: String(log.id), taskId: log.task_id == null ? null : String(log.task_id), submissionStatus: log.submission_status, diagnosis: log.diagnosis || '', description: log.description || '' } } });
  } catch (error) {
    if (isMissingSchema(error)) return schemaUnavailable(res);
    console.error('Failed to retrieve maintenance log:', error.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve maintenance log.' });
  } finally { if (connection) connection.release(); }
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  const machineId = validId(body.machineId);
  const taskId = body.taskId ? validId(body.taskId) : null;
  const idempotencyKey = typeof body.idempotencyKey === 'string' && /^[\w:-]{8,100}$/.test(body.idempotencyKey) ? body.idempotencyKey : null;
  if (!machineId) return res.status(400).json({ success: false, message: 'A valid machine is required.' });
  if (body.taskId && !taskId) return res.status(400).json({ success: false, message: 'Invalid task ID.' });
  if (!idempotencyKey) return res.status(400).json({ success: false, message: 'A valid idempotency key is required.' });
  const problem = typeof body.problemDescription === 'string' ? body.problemDescription.trim() : '';
  const work = typeof body.workPerformed === 'string' ? body.workPerformed.trim() : '';
  const diagnosis = typeof body.diagnosis === 'string' ? body.diagnosis.trim() : '';
  const maintenanceType = String(body.maintenanceType || 'CORRECTIVE').toUpperCase();
  const maintenanceDate = typeof body.maintenanceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.maintenanceDate) ? `${body.maintenanceDate} 00:00:00` : null;
  const startedAt = typeof body.startedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(body.startedAt) ? body.startedAt.replace('T', ' ') : null;
  const downtimeStart = typeof body.downtimeStart === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(body.downtimeStart) ? body.downtimeStart.replace('T', ' ') : null;
  const downtimeEnd = typeof body.downtimeEnd === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(body.downtimeEnd) ? body.downtimeEnd.replace('T', ' ') : null;
  if (body.downtimeStart && !downtimeStart || body.downtimeEnd && !downtimeEnd || downtimeStart && downtimeEnd && new Date(downtimeEnd) < new Date(downtimeStart)) return res.status(400).json({ success: false, message: 'Invalid downtime period.' });
  const cost = body.cost === undefined || body.cost === null || body.cost === '' ? 0 : Number(body.cost);
  const durationHours = body.durationHours === undefined || body.durationHours === null || body.durationHours === '' ? 0 : Number(body.durationHours);
  if (body.maintenanceDate && !maintenanceDate || body.startedAt && !startedAt) return res.status(400).json({ success: false, message: 'Invalid maintenance date or start timestamp.' });
  if (!['CORRECTIVE', 'PREVENTIVE'].includes(maintenanceType) || !Number.isFinite(cost) || cost < 0 || cost > 9999999999 || !Number.isFinite(durationHours) || durationHours < 0 || durationHours > 999999) return res.status(400).json({ success: false, message: 'Invalid maintenance type or cost.' });
  if (problem.length > 10000 || work.length > 20000 || diagnosis.length > 10000) return res.status(400).json({ success: false, message: 'Maintenance text exceeds the allowed length.' });
  if (req.user?.role === 'maintenance_worker' && (!taskId || !work)) return res.status(400).json({ success: false, message: 'Technicians must select an assigned task and describe the work performed.' });
  if (!MANAGER_ROLES.has(req.user?.role) && req.user?.role !== 'maintenance_worker') return res.status(403).json({ success: false, message: 'You cannot create maintenance logs.' });

  let connection;
  try {
    connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT id, created_by_user_id FROM maintenance_logs WHERE idempotency_key = ? LIMIT 1', [idempotencyKey]);
    if (existing.length) {
      if (Number(existing[0].created_by_user_id) !== userId(req)) return res.status(409).json({ success: false, message: 'This request key is already in use.' });
      const log = await loadLog(connection, existing[0].id);
      return res.status(200).json({ success: true, data: { id: String(log.id), submissionStatus: log.submission_status }, reused: true });
    }
    await connection.beginTransaction();
    const [machines] = await connection.execute('SELECT id, name, workshop_id, workshop_name FROM machines WHERE id = ? LIMIT 1', [machineId]);
    if (!machines.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Machine not found.' }); }
    const machine = machines[0];
    let technicianId = null;
    let workshopId = body.workshopId ? validId(body.workshopId) : machine.workshop_id;
    if (req.user?.role === 'maintenance_worker') {
      const technician = await getTechnician(connection, req.user);
      if (!technician) { await connection.rollback(); return res.status(403).json({ success: false, message: 'This login is not linked to a technician record.' }); }
      technicianId = technician.id;
    } else if (body.technicianId) {
      technicianId = validId(body.technicianId);
      if (!technicianId) { await connection.rollback(); return res.status(400).json({ success: false, message: 'Invalid technician ID.' }); }
    }
    if (taskId) {
      const [tasks] = await connection.execute('SELECT id, machine_id, technician_id, workshop_id, status FROM maintenance_tasks WHERE id = ? FOR UPDATE', [taskId]);
      if (!tasks.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Maintenance task not found.' }); }
      const task = tasks[0];
      if (Number(task.machine_id) !== machineId) { await connection.rollback(); return res.status(400).json({ success: false, message: 'The task is assigned to a different machine.' }); }
      if (req.user?.role === 'maintenance_worker' && Number(task.technician_id) !== Number(technicianId)) { await connection.rollback(); return res.status(403).json({ success: false, message: 'You can only report work for tasks assigned to you.' }); }
      if (task.status === 'CANCELLED') { await connection.rollback(); return res.status(409).json({ success: false, message: 'A cancelled task cannot receive a completion report.' }); }
      workshopId = task.workshop_id || workshopId;
    }
    const [result] = await connection.execute(
      `INSERT INTO maintenance_logs
       (technician_id, maintenance_date, machine_id, machine_name, workshop_id, description,
        task_id, maintenance_type, cost, duration_hours, problem_description, work_performed, diagnosis, started_at, downtime_start, downtime_end, submission_status,
        idempotency_key, created_by_user_id)
       VALUES (?, COALESCE(?, NOW()), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?, ?, 'DRAFT', ?, ?)`,
      [technicianId, maintenanceDate, machineId, machine.name || '', workshopId || null, work || null, taskId, maintenanceType, cost, durationHours,
       problem || null, work || null, diagnosis || null, startedAt, downtimeStart, downtimeEnd, idempotencyKey, userId(req)]);
    await connection.commit();
    return res.status(201).json({ success: true, data: { id: String(result.insertId), submissionStatus: 'DRAFT' } });
  } catch (error) {
    if (connection) { try { await connection.rollback(); } catch {} }
    if (isMissingSchema(error)) return schemaUnavailable(res);
    if (error.code === 'ER_DUP_ENTRY' && idempotencyKey) {
      try {
        const [rows] = await pool.execute('SELECT id, created_by_user_id, submission_status FROM maintenance_logs WHERE idempotency_key = ? LIMIT 1', [idempotencyKey]);
        if (rows.length && Number(rows[0].created_by_user_id) === userId(req)) return res.json({ success: true, data: { id: String(rows[0].id), submissionStatus: rows[0].submission_status }, reused: true });
      } catch {}
    }
    console.error('Failed to create maintenance draft:', error.message);
    return res.status(500).json({ success: false, message: 'Could not create the maintenance draft.' });
  } finally { if (connection) connection.release(); }
});

router.post('/:id/attachments', express.raw({ type: () => true, limit: '20mb' }), async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid maintenance log ID.' });
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ success: false, message: 'An attachment body is required.' });
  const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const kind = String(req.query.kind || '').toLowerCase();
  const type = kind === 'image' && IMAGE_MIMES.has(mime) ? 'IMAGE' : kind === 'audio' && AUDIO_MIMES.has(mime) ? 'AUDIO' : null;
  if (!type || !matchesMime(req.body, mime)) return res.status(415).json({ success: false, message: 'Unsupported attachment type or the file content does not match its MIME type.' });
  if (req.body.length > (type === 'IMAGE' ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES)) return res.status(413).json({ success: false, message: `The ${kind} file exceeds the allowed size.` });
  let connection;
  let storageKey;
  try {
    connection = await pool.getConnection();
    const log = await loadLog(connection, id);
    if (!log) return res.status(404).json({ success: false, message: 'Maintenance log not found.' });
    if (!await canAccessLog(connection, req, log)) return res.status(403).json({ success: false, message: 'You cannot upload attachments to this log.' });
    if (log.submission_status !== 'DRAFT') return res.status(409).json({ success: false, message: 'Submitted maintenance logs cannot be changed.' });
    const digest = crypto.createHash('sha256').update(req.body).digest('hex');
    const [duplicate] = await connection.execute('SELECT id, original_filename, mime_type, size_bytes FROM maintenance_log_attachments WHERE maintenance_log_id = ? AND attachment_type = ? AND sha256 = ? LIMIT 1', [id, type, digest]);
    if (duplicate.length) return res.json({ success: true, data: { id: String(duplicate[0].id), type: type.toLowerCase(), name: duplicate[0].original_filename, mimeType: duplicate[0].mime_type, size: Number(duplicate[0].size_bytes) }, reused: true });
    const [counts] = await connection.execute('SELECT attachment_type, COUNT(*) AS total FROM maintenance_log_attachments WHERE maintenance_log_id = ? GROUP BY attachment_type', [id]);
    const count = Number(counts.find(item => item.attachment_type === type)?.total || 0);
    if ((type === 'IMAGE' && count >= MAX_IMAGES_PER_LOG) || (type === 'AUDIO' && count >= MAX_AUDIO_PER_LOG)) return res.status(409).json({ success: false, message: type === 'IMAGE' ? `A maximum of ${MAX_IMAGES_PER_LOG} images is allowed per log.` : 'Only one audio recording is allowed per log.' });
    storageKey = `${crypto.randomUUID()}${extForMime(mime)}`;
    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
    const absolutePath = path.resolve(UPLOAD_DIR, storageKey);
    await fs.promises.writeFile(absolutePath, req.body, { flag: 'wx', mode: 0o600 });
    const filename = safeFilename(req.headers['x-file-name']);
    try {
      const [result] = await connection.execute(
        `INSERT INTO maintenance_log_attachments
         (maintenance_log_id, attachment_type, original_filename, storage_key, mime_type, size_bytes, sha256)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, type, filename, storageKey, mime, req.body.length, digest]);
      return res.status(201).json({ success: true, data: { id: String(result.insertId), type: type.toLowerCase(), name: filename, mimeType: mime, size: req.body.length } });
    } catch (error) {
      await fs.promises.unlink(absolutePath).catch(() => {});
      throw error;
    }
  } catch (error) {
    if (isMissingSchema(error)) return schemaUnavailable(res);
    console.error('Failed to save maintenance attachment:', error.message);
    return res.status(500).json({ success: false, message: 'Could not persist the attachment. The draft remains open; retry the upload.' });
  } finally { if (connection) connection.release(); }
});

router.get('/:id/attachments/:attachmentId', async (req, res) => {
  const logId = validId(req.params.id);
  const attachmentId = validId(req.params.attachmentId);
  if (!logId || !attachmentId) return res.status(400).json({ success: false, message: 'Invalid attachment reference.' });
  let connection;
  try {
    connection = await pool.getConnection();
    const log = await loadLog(connection, logId);
    if (!log) return res.status(404).json({ success: false, message: 'Maintenance log not found.' });
    if (!await canAccessLog(connection, req, log)) return res.status(403).json({ success: false, message: 'You cannot view this attachment.' });
    const [rows] = await connection.execute('SELECT storage_key, original_filename, mime_type FROM maintenance_log_attachments WHERE id = ? AND maintenance_log_id = ? LIMIT 1', [attachmentId, logId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Attachment not found.' });
    const row = rows[0];
    const storageKey = path.basename(row.storage_key);
    if (storageKey !== row.storage_key) return res.status(400).json({ success: false, message: 'Invalid attachment reference.' });
    const absolutePath = path.resolve(UPLOAD_DIR, storageKey);
    if (!absolutePath.startsWith(`${UPLOAD_DIR}${path.sep}`)) return res.status(400).json({ success: false, message: 'Invalid attachment reference.' });
    await fs.promises.access(absolutePath, fs.constants.R_OK);
    res.setHeader('Content-Type', row.mime_type);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(row.original_filename)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(absolutePath);
  } catch (error) {
    if (isMissingSchema(error)) return schemaUnavailable(res);
    if (error.code === 'ENOENT') return res.status(404).json({ success: false, message: 'Attachment file is missing from storage.' });
    console.error('Failed to read maintenance attachment:', error.message);
    return res.status(500).json({ success: false, message: 'Could not read the attachment.' });
  } finally { if (connection) connection.release(); }
});

router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  const logId = validId(req.params.id);
  const attachmentId = validId(req.params.attachmentId);
  if (!logId || !attachmentId) return res.status(400).json({ success: false, message: 'Invalid attachment reference.' });
  let connection;
  try {
    connection = await pool.getConnection();
    const log = await loadLog(connection, logId);
    if (!log) return res.status(404).json({ success: false, message: 'Maintenance log not found.' });
    if (!await canAccessLog(connection, req, log)) return res.status(403).json({ success: false, message: 'You cannot remove this attachment.' });
    if (log.submission_status !== 'DRAFT') return res.status(409).json({ success: false, message: 'Submitted maintenance logs cannot be changed.' });
    const [rows] = await connection.execute('SELECT storage_key FROM maintenance_log_attachments WHERE id = ? AND maintenance_log_id = ? LIMIT 1', [attachmentId, logId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Attachment not found.' });
    await connection.execute('DELETE FROM maintenance_log_attachments WHERE id = ? AND maintenance_log_id = ?', [attachmentId, logId]);
    const key = path.basename(rows[0].storage_key);
    if (key === rows[0].storage_key) await fs.promises.unlink(path.resolve(UPLOAD_DIR, key)).catch(error => { if (error.code !== 'ENOENT') console.error('Attachment cleanup failed:', error.message); });
    return res.json({ success: true, message: 'Attachment removed.' });
  } catch (error) {
    if (isMissingSchema(error)) return schemaUnavailable(res);
    console.error('Failed to remove maintenance attachment:', error.message);
    return res.status(500).json({ success: false, message: 'Could not remove the attachment.' });
  } finally { if (connection) connection.release(); }
});

router.post('/:id/submit', async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid maintenance log ID.' });
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [logs] = await connection.execute('SELECT * FROM maintenance_logs WHERE id = ? FOR UPDATE', [id]);
    if (!logs.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Maintenance log not found.' }); }
    const log = logs[0];
    if (log.submission_status === 'SUBMITTED') {
      await connection.commit();
      return res.json({ success: true, message: 'Maintenance log was already submitted.', data: { id: String(id), submissionStatus: 'SUBMITTED' }, reused: true });
    }
    if (!MANAGER_ROLES.has(req.user?.role)) {
      if (req.user?.role !== 'maintenance_worker') { await connection.rollback(); return res.status(403).json({ success: false, message: 'You cannot submit this log.' }); }
      const technician = await getTechnician(connection, req.user);
      if (!technician || Number(log.technician_id) !== Number(technician.id)) { await connection.rollback(); return res.status(403).json({ success: false, message: 'You can only submit your own maintenance log.' }); }
    }
    if (!String(log.work_performed || log.description || '').trim()) { await connection.rollback(); return res.status(400).json({ success: false, message: 'Work performed is required before submission.' }); }
    if (log.task_id) {
      const [tasks] = await connection.execute('SELECT id, status, technician_id, maintenance_type FROM maintenance_tasks WHERE id = ? FOR UPDATE', [log.task_id]);
      if (!tasks.length) { await connection.rollback(); return res.status(409).json({ success: false, message: 'The linked task no longer exists.' }); }
      const task = tasks[0];
      if (req.user?.role === 'maintenance_worker' && Number(task.technician_id) !== Number(log.technician_id)) { await connection.rollback(); return res.status(403).json({ success: false, message: 'This task is not assigned to your technician account.' }); }
      if (task.status === 'CANCELLED') { await connection.rollback(); return res.status(409).json({ success: false, message: 'A cancelled task cannot be completed.' }); }
      if (task.status === 'COMPLETED') {
        const [other] = await connection.execute(`SELECT id FROM maintenance_logs WHERE task_id = ? AND submission_status = 'SUBMITTED' AND id <> ? LIMIT 1`, [log.task_id, id]);
        if (other.length) { await connection.rollback(); return res.status(409).json({ success: false, message: 'This task already has a submitted completion log. Reopen the task through an authorized manager before recording another completion.' }); }
      }
      // Prevent closing a generated preventive task while its required checklist is incomplete.
      // The suite tables are introduced by 202611010001_maintenance_suite.sql.
      if (String(task.maintenance_type || '').toUpperCase() === 'PREVENTIVE') {
        const [occurrences] = await connection.execute('SELECT plan_id FROM cmms_pm_occurrences WHERE task_id = ? LIMIT 1', [log.task_id]);
        if (occurrences.length) {
          const [missing] = await connection.execute(
            `SELECT i.id, i.title, r.result, r.notes, r.measured_value, i.minimum_value, i.maximum_value
             FROM cmms_pm_checklist_items i
             LEFT JOIN cmms_work_order_checklist_results r ON r.checklist_item_id = i.id AND r.task_id = ?
             WHERE i.plan_id = ? AND i.active = 1 AND i.required = 1
               AND (r.id IS NULL OR ((i.minimum_value IS NOT NULL OR i.maximum_value IS NOT NULL) AND r.measured_value IS NULL) OR (r.result = 'FAIL' AND (r.notes IS NULL OR TRIM(r.notes) = '')))
             LIMIT 1`, [log.task_id, occurrences[0].plan_id]
          );
          if (missing.length) {
            await connection.rollback();
            return res.status(409).json({ success: false, message: `Required checklist item is incomplete or failed without notes: ${missing[0].title}` });
          }
          await connection.execute('UPDATE cmms_preventive_plans p JOIN cmms_pm_occurrences o ON o.plan_id = p.id SET p.last_completed_at = NOW() WHERE o.task_id = ?', [log.task_id]);
        }
      }
      await connection.execute(`UPDATE maintenance_tasks SET status = 'COMPLETED', started_at = COALESCE(started_at, ?), completed_at = COALESCE(completed_at, NOW()) WHERE id = ?`, [log.started_at || new Date(), log.task_id]);
      // Auto-set machine back to working when a corrective task is completed
      if (String(task.maintenance_type || '').toUpperCase() === 'CORRECTIVE') {
        await connection.execute("UPDATE machines SET state = 'working' WHERE id = ?", [log.machine_id]);
      }
    }
    await connection.execute(`UPDATE maintenance_logs SET submission_status = 'SUBMITTED', submitted_at = NOW(), completed_at = NOW(), maintenance_date = COALESCE(maintenance_date, NOW()) WHERE id = ?`, [id]);
    await connection.commit();
    return res.json({ success: true, message: 'Maintenance log submitted successfully.', data: { id: String(id), submissionStatus: 'SUBMITTED', taskId: log.task_id == null ? null : String(log.task_id) } });
  } catch (error) {
    if (connection) { try { await connection.rollback(); } catch {} }
    if (isMissingSchema(error)) return schemaUnavailable(res);
    console.error('Failed to submit maintenance log:', error.message);
    return res.status(500).json({ success: false, message: 'Could not submit the maintenance log. The draft remains available for retry.' });
  } finally { if (connection) connection.release(); }
});

module.exports = router;
