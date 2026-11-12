const express = require('express');
const fs = require('fs');
const path = require('path');
const requireAuth = require('../middleware/auth');
const { generateMaintenanceExport, SHEET_DEFS } = require('../services/maintenanceExportService');
const {
  EXPORT_DIR,
  FREQUENCIES,
  EXECUTION_STATUSES,
  isValidExportTime,
  isValidFrequency,
  isValidRetention,
  isValidTimezone,
  listExportExecutions,
  listExportSchedules,
  getExportSchedule,
  createExportSchedule,
  updateExportSchedule,
  hasRunningExecution,
  runExportForSchedule,
  downloadExportExecution,
  getExportExecution,
} = require('../services/maintenanceExportScheduler');

const router = express.Router();
const EXPORT_ROLES = new Set(['admin', 'production_chief', 'workshop_head']);

router.use(requireAuth);
router.use((req, res, next) => {
  if (!EXPORT_ROLES.has(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Maintenance manager export access is required.' });
  }
  return next();
});

router.get('/', async (req, res) => {
  try {
    const { buffer, missing, fileName } = await generateMaintenanceExport();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Maintenance Excel export failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not generate the maintenance Excel workbook.' });
  }
});

router.get('/schedules', async (req, res) => {
  try {
    const schedules = await listExportSchedules();
    return res.json({ success: true, data: { schedules } });
  } catch (error) {
    console.error('Scheduled export listing failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load scheduled exports.' });
  }
});

router.post('/schedules', async (req, res) => {
  try {
    const { frequency, exportTime, timezone, enabled, retentionDays } = req.body || {};
    if (!isValidFrequency(frequency)) return res.status(400).json({ success: false, message: 'Export frequency must be daily, weekly or monthly.' });
    if (!isValidExportTime(exportTime)) return res.status(400).json({ success: false, message: 'Export time must be a valid HH:MM value.' });
    if (!isValidTimezone(timezone)) return res.status(400).json({ success: false, message: 'Export timezone must be a valid IANA timezone name.' });
    if (retentionDays !== undefined && !isValidRetention(retentionDays)) return res.status(400).json({ success: false, message: 'Retention days must be between 1 and 365.' });
    const schedule = await createExportSchedule({
      frequency: String(frequency).toLowerCase(),
      exportTime: String(exportTime).padStart(5, '0'),
      timezone: String(timezone).trim(),
      enabled: enabled === undefined ? true : Boolean(enabled),
      retentionDays: retentionDays === undefined ? 30 : Number(retentionDays),
      // The creator is always the authenticated account, never a client-supplied id.
      createdBy: Number(req.user.sub),
    });
    return res.status(201).json({ success: true, data: { schedule } });
  } catch (error) {
    console.error('Scheduled export creation failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not create the scheduled export.' });
  }
});

router.patch('/schedules/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid schedule identifier.' });
    const patch = req.body || {};
    const schedule = await updateExportSchedule(id, patch);
    if (!schedule) return res.status(404).json({ success: false, message: 'Scheduled export not found.' });
    return res.json({ success: true, data: { schedule } });
  } catch (error) {
    console.error('Scheduled export update failed:', error.message);
    if (error.message === 'Invalid export frequency.' || error.message === 'Export time must be a valid HH:MM value.' || error.message === 'Export timezone must be a valid IANA timezone name.' || error.message === 'Retention days must be between 1 and 365.') {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Could not update the scheduled export.' });
  }
});

router.get('/executions', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const executions = await listExportExecutions(status, limit);
    return res.json({ success: true, data: { executions } });
  } catch (error) {
    console.error('Scheduled export history listing failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load scheduled export history.' });
  }
});

router.get('/executions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid execution identifier.' });
    const execution = await getExportExecution(id);
    if (!execution) return res.status(404).json({ success: false, message: 'Scheduled export execution not found.' });
    return res.json({ success: true, data: { execution } });
  } catch (error) {
    console.error('Scheduled export history load failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load scheduled export history.' });
  }
});

router.get('/executions/:id/download', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid execution identifier.' });
    const result = await downloadExportExecution(id);
    if (result.status === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Scheduled export execution not found.' });
    if (result.status === 'FILE_MISSING') return res.status(410).json({ success: false, message: 'The generated export file is no longer available.' });
    if (result.status !== 'OK') return res.status(500).json({ success: false, message: 'Could not download the scheduled export file.' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${result.execution.filename}"`);
    return res.status(200).send(result.content);
  } catch (error) {
    console.error('Scheduled export download failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not download the scheduled export file.' });
  }
});

router.post('/schedules/:id/run', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid schedule identifier.' });
    const schedule = await getExportSchedule(id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Scheduled export not found.' });
    const outcome = await runExportForSchedule(schedule, 'MANUAL');
    if (!outcome.ok) {
      const statusCode = outcome.error?.includes('already running') ? 409 : 500;
      return res.status(statusCode).json({ success: false, message: outcome.error });
    }
    return res.json({ success: true, data: { execution: outcome.execution } });
  } catch (error) {
    console.error('Scheduled export run failed:', error.message);
    return res.status(500).json({ success: false, message: 'Scheduled export failed.' });
  }
});

module.exports = router;
module.exports.EXPORT_ROLES = EXPORT_ROLES;
module.exports.SHEET_DEFS = SHEET_DEFS;
module.exports.FREQUENCIES = FREQUENCIES;
module.exports.EXECUTION_STATUSES = EXECUTION_STATUSES;
