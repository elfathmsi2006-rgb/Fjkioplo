const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
const DESCRIPTION_ROLES = {
  technician: new Set(['admin', 'maintenance_worker']),
  workshopChief: new Set(['admin', 'workshop_head']),
};
const MANUALS_ENABLED = String(process.env.MACHINE_MANUALS_ENABLED || 'false').toLowerCase() === 'true';
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const MANUALS_DIR = path.resolve(BACKEND_ROOT, process.env.MACHINE_MANUALS_STORAGE_DIR || 'storage/manuals');

function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function missingSchema(error) {
  return error && (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_NO_SUCH_TABLE');
}
function schemaUnavailable(res, feature) {
  return res.status(503).json({ success: false, message: `${feature} is not ready yet. Apply the supplied additive MySQL migration, then restart the backend.` });
}

router.get('/:machineId/descriptions', async (req, res) => {
  const machineId = validId(req.params.machineId);
  if (!machineId) return res.status(400).json({ success: false, message: 'Invalid machine ID.' });
  try {
    const [rows] = await pool.execute(
      `SELECT id, technician_description, technician_description_updated_at,
              workshop_chief_description, workshop_chief_description_updated_at
       FROM machines WHERE id = ? LIMIT 1`, [machineId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Machine not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    if (missingSchema(error)) return schemaUnavailable(res, 'Machine descriptions');
    console.error('Failed to load machine descriptions:', error.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve machine descriptions.' });
  }
});

async function updateDescription(req, res, field, timestampField, allowedRoles, label) {
  const machineId = validId(req.params.machineId);
  if (!machineId) return res.status(400).json({ success: false, message: 'Invalid machine ID.' });
  if (!allowedRoles.has(req.user?.role)) return res.status(403).json({ success: false, message: `You cannot edit the ${label}.` });
  const value = req.body?.description;
  if (typeof value !== 'string' || value.length > 10000) return res.status(400).json({ success: false, message: 'Description must be text up to 10,000 characters.' });
  const normalized = value.trim() || null;
  try {
    const [result] = await pool.execute(
      `UPDATE machines SET ${timestampField} = IF(NOT (${field} <=> ?), NOW(), ${timestampField}), ${field} = ? WHERE id = ?`,
      [normalized, normalized, machineId]);
    if (!result.affectedRows) {
      const [exists] = await pool.execute('SELECT id FROM machines WHERE id = ? LIMIT 1', [machineId]);
      if (!exists.length) return res.status(404).json({ success: false, message: 'Machine not found.' });
    }
    const [rows] = await pool.execute(`SELECT ${field} AS description, ${timestampField} AS updated_at FROM machines WHERE id = ? LIMIT 1`, [machineId]);
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    if (missingSchema(error)) return schemaUnavailable(res, 'Machine descriptions');
    console.error(`Failed to update ${label}:`, error.message);
    return res.status(500).json({ success: false, message: `Could not save the ${label}.` });
  }
}

router.put('/:machineId/descriptions/technician', (req, res) => updateDescription(req, res, 'technician_description', 'technician_description_updated_at', DESCRIPTION_ROLES.technician, 'technician description'));
router.put('/:machineId/descriptions/workshop-chief', (req, res) => updateDescription(req, res, 'workshop_chief_description', 'workshop_chief_description_updated_at', DESCRIPTION_ROLES.workshopChief, 'workshop chief description'));

// Feature flag check is deliberately before every manuals-table query.
router.post('/:machineId/manuals', express.raw({ type: ['application/pdf'], limit: '25mb' }), async (req, res) => {
  if (!MANUALS_ENABLED) return res.status(404).json({ success: false, featureDisabled: true, message: 'Technical manuals are disabled by configuration.' });
  const machineId = validId(req.params.machineId);
  if (!machineId) return res.status(400).json({ success: false, message: 'Invalid machine ID.' });
  if (!new Set(['admin', 'production_chief', 'workshop_head']).has(req.user?.role)) return res.status(403).json({ success: false, message: 'Only authorized maintenance managers can upload technical manuals.' });
  if (!Buffer.isBuffer(req.body) || req.body.length < 8 || req.body.subarray(0, 5).toString('ascii') !== '%PDF-') return res.status(400).json({ success: false, message: 'Upload a valid PDF file.' });
  const decodeHeader = (value, fallback) => {
    try { const decoded = decodeURIComponent(String(value || fallback)); return decoded.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255) || fallback; }
    catch { return fallback; }
  };
  const originalFilename = path.basename(decodeHeader(req.headers['x-manual-filename'], 'technical-manual.pdf'));
  if (!/\.pdf$/i.test(originalFilename)) return res.status(400).json({ success: false, message: 'Technical manuals must use the PDF format.' });
  const title = decodeHeader(req.headers['x-manual-title'], originalFilename.replace(/\.pdf$/i, '')).slice(0, 200);
  const storageKey = `${crypto.randomUUID()}.pdf`;
  let absolutePath; let fileWritten = false; let connection;
  try {
    const [machines] = await pool.execute('SELECT id FROM machines WHERE id=? LIMIT 1', [machineId]);
    if (!machines.length) return res.status(404).json({ success: false, message: 'Machine not found.' });
    await fs.promises.mkdir(MANUALS_DIR, { recursive: true });
    absolutePath = path.resolve(MANUALS_DIR, storageKey);
    if (!absolutePath.startsWith(`${MANUALS_DIR}${path.sep}`)) return res.status(400).json({ success: false, message: 'Invalid storage location.' });
    await fs.promises.writeFile(absolutePath, req.body, { flag: 'wx', mode: 0o640 });
    fileWritten = true;
    connection = await pool.getConnection(); await connection.beginTransaction();
    const [result] = await connection.execute('INSERT INTO machine_technical_manuals (machine_id,title,original_filename,storage_key,mime_type,size_bytes) VALUES (?,?,?,?,?,?)', [machineId, title, originalFilename, storageKey, 'application/pdf', req.body.length]);
    const actorId = Number(req.user?.sub);
    await connection.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,NULL,?)', ['machine_technical_manuals', String(result.insertId), 'INSERT', Number.isSafeInteger(actorId) && actorId > 0 ? actorId : null, JSON.stringify({ machine_id: machineId, title, original_filename: originalFilename, size_bytes: req.body.length })]);
    await connection.commit();
    return res.status(201).json({ success: true, data: { id: result.insertId, machineId, title, originalFilename, sizeBytes: req.body.length }, message: 'Technical manual uploaded.' });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    if (fileWritten && absolutePath) await fs.promises.unlink(absolutePath).catch(() => {});
    if (missingSchema(error)) return schemaUnavailable(res, 'Technical manuals');
    console.error('Failed to upload technical manual:', error.message);
    return res.status(500).json({ success: false, message: 'Could not upload the technical manual.' });
  } finally { if (connection) connection.release(); }
});

router.get('/:machineId/manuals', async (req, res) => {
  if (!MANUALS_ENABLED) return res.status(404).json({ success: false, featureDisabled: true, message: 'Technical manuals are disabled by configuration.' });
  const machineId = validId(req.params.machineId);
  if (!machineId) return res.status(400).json({ success: false, message: 'Invalid machine ID.' });
  try {
    const [rows] = await pool.execute(
      `SELECT id, machine_id, title, original_filename, mime_type, size_bytes, created_at
       FROM machine_technical_manuals WHERE machine_id = ? ORDER BY created_at DESC, id DESC`, [machineId]);
    return res.json({ success: true, data: rows.map(row => ({ ...row, downloadUrl: `/api/machines/${machineId}/manuals/${row.id}/download` })) });
  } catch (error) {
    if (missingSchema(error)) return schemaUnavailable(res, 'Technical manuals');
    console.error('Failed to retrieve technical manuals:', error.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve technical manuals.' });
  }
});

router.get('/:machineId/manuals/:manualId/download', async (req, res) => {
  if (!MANUALS_ENABLED) return res.status(404).json({ success: false, featureDisabled: true, message: 'Technical manuals are disabled by configuration.' });
  const machineId = validId(req.params.machineId);
  const manualId = validId(req.params.manualId);
  if (!machineId || !manualId) return res.status(400).json({ success: false, message: 'Invalid manual or machine ID.' });
  try {
    const [rows] = await pool.execute('SELECT storage_key, original_filename, mime_type FROM machine_technical_manuals WHERE id = ? AND machine_id = ? LIMIT 1', [manualId, machineId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Manual not found.' });
    const storageKey = path.basename(rows[0].storage_key);
    if (storageKey !== rows[0].storage_key) return res.status(400).json({ success: false, message: 'Invalid manual storage reference.' });
    const absolutePath = path.resolve(MANUALS_DIR, storageKey);
    if (!absolutePath.startsWith(`${MANUALS_DIR}${path.sep}`)) return res.status(400).json({ success: false, message: 'Invalid manual storage reference.' });
    await fs.promises.access(absolutePath, fs.constants.R_OK);
    res.setHeader('Content-Type', rows[0].mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(rows[0].original_filename)}`);
    return res.sendFile(absolutePath);
  } catch (error) {
    if (missingSchema(error)) return schemaUnavailable(res, 'Technical manuals');
    if (error.code === 'ENOENT') return res.status(404).json({ success: false, message: 'The manual file is not present in configured storage.' });
    console.error('Failed to open technical manual:', error.message);
    return res.status(500).json({ success: false, message: 'Could not open the technical manual.' });
  }
});

module.exports = router;
