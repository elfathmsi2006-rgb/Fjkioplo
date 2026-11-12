// Phase 5 manual maintenance Excel export.
// Builds ONE .xlsx workbook from real database rows collected by
// collectDataSets. Worksheets use explicit column lists so no joined or derived
// column can silently create duplicate rows.

const XLSX = require('xlsx');
const pool = require('../db');

const EXPORT_FILE_PREFIX = 'spa-el-fath-maintenance';

const SHEET_DEFS = [
  { name: 'Maintenance Logs', columns: [
    { key: 'id', label: 'Log ID' }, { key: 'maintenanceDate', label: 'Maintenance date' }, { key: 'machineId', label: 'Machine ID' }, { key: 'machineName', label: 'Machine' }, { key: 'technicianId', label: 'Technician ID' }, { key: 'technicianName', label: 'Technician' }, { key: 'workshopId', label: 'Workshop ID' }, { key: 'maintenanceType', label: 'Maintenance type' }, { key: 'cost', label: 'Cost (DZD)' }, { key: 'durationHours', label: 'Duration (hours)' }, { key: 'problemDescription', label: 'Problem description' }, { key: 'workPerformed', label: 'Work performed' }, { key: 'diagnosis', label: 'Diagnosis' }, { key: 'startedAt', label: 'Started at' }, { key: 'completedAt', label: 'Completed at' }, { key: 'downtimeStart', label: 'Downtime start' }, { key: 'downtimeEnd', label: 'Downtime end' }, { key: 'createdAt', label: 'Created at' }, { key: 'updatedAt', label: 'Updated at' },
  ] },
  { name: 'Work Orders', columns: [
    { key: 'id', label: 'Work order ID' }, { key: 'title', label: 'Title' }, { key: 'maintenanceType', label: 'Maintenance type' }, { key: 'machineId', label: 'Machine ID' }, { key: 'machineCode', label: 'Machine code' }, { key: 'machineName', label: 'Machine' }, { key: 'technicianId', label: 'Technician ID' }, { key: 'technicianName', label: 'Technician' }, { key: 'workshopId', label: 'Workshop ID' }, { key: 'workshopName', label: 'Workshop' }, { key: 'assignedBy', label: 'Assigned by' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }, { key: 'dueDate', label: 'Due date' }, { key: 'startedAt', label: 'Started at' }, { key: 'completedAt', label: 'Completed at' }, { key: 'createdAt', label: 'Created at' }, { key: 'updatedAt', label: 'Updated at' }, { key: 'description', label: 'Description' },
  ] },
  { name: 'Breakdown Reports', columns: [
    { key: 'id', label: 'Breakdown ID' }, { key: 'machineId', label: 'Machine ID' }, { key: 'machineCode', label: 'Machine code' }, { key: 'machineName', label: 'Machine' }, { key: 'taskId', label: 'Work order ID' }, { key: 'reportedAt', label: 'Reported at' }, { key: 'severity', label: 'Severity' }, { key: 'symptom', label: 'Symptom' }, { key: 'rootCause', label: 'Root cause' }, { key: 'correctiveAction', label: 'Corrective action' }, { key: 'outcome', label: 'Outcome' }, { key: 'downtimeMinutes', label: 'Downtime (minutes)' }, { key: 'reportedBy', label: 'Reported by' }, { key: 'createdAt', label: 'Created at' },
  ] },
  { name: 'Preventive Plans', columns: [
    { key: 'id', label: 'Plan ID' }, { key: 'machineId', label: 'Machine ID' }, { key: 'machineCode', label: 'Machine code' }, { key: 'machineName', label: 'Machine' }, { key: 'title', label: 'Title' }, { key: 'description', label: 'Description' }, { key: 'frequencyDays', label: 'Frequency (days)' }, { key: 'lastCompletedAt', label: 'Last completed at' }, { key: 'nextDueAt', label: 'Next due at' }, { key: 'active', label: 'Active' }, { key: 'createdBy', label: 'Created by' }, { key: 'createdAt', label: 'Created at' }, { key: 'updatedAt', label: 'Updated at' },
  ] },
  { name: 'PM Occurrences', columns: [
    { key: 'id', label: 'Occurrence ID' }, { key: 'planId', label: 'Plan ID' }, { key: 'planTitle', label: 'Plan title' }, { key: 'machineId', label: 'Machine ID' }, { key: 'machineCode', label: 'Machine code' }, { key: 'machineName', label: 'Machine' }, { key: 'dueAt', label: 'Due at' }, { key: 'taskId', label: 'Work order ID' }, { key: 'taskStatus', label: 'Work order status' }, { key: 'occurrenceStatus', label: 'Occurrence status' }, { key: 'createdAt', label: 'Created at' },
  ] },
  { name: 'PM Checklist Items', columns: [
    { key: 'id', label: 'Checklist item ID' }, { key: 'planId', label: 'Plan ID' }, { key: 'planTitle', label: 'Plan title' }, { key: 'machineId', label: 'Machine ID' }, { key: 'title', label: 'Checklist item' }, { key: 'required', label: 'Required' }, { key: 'unit', label: 'Unit' }, { key: 'minimumValue', label: 'Minimum value' }, { key: 'maximumValue', label: 'Maximum value' }, { key: 'sortOrder', label: 'Sort order' }, { key: 'active', label: 'Active' }, { key: 'createdAt', label: 'Created at' },
  ] },
  { name: 'Work Order Checklist Results', columns: [
    { key: 'id', label: 'Result ID' }, { key: 'taskId', label: 'Work order ID' }, { key: 'taskTitle', label: 'Work order title' }, { key: 'machineId', label: 'Machine ID' }, { key: 'checklistItemId', label: 'Checklist item ID' }, { key: 'checklistItemTitle', label: 'Checklist item' }, { key: 'result', label: 'Result' }, { key: 'measuredValue', label: 'Measured value' }, { key: 'notes', label: 'Notes' }, { key: 'completedBy', label: 'Completed by' }, { key: 'completedAt', label: 'Completed at' },
  ] },
  { name: 'Spare Parts Used', columns: [
    { key: 'id', label: 'Usage ID' }, { key: 'taskId', label: 'Work order ID' }, { key: 'taskTitle', label: 'Work order title' }, { key: 'machineId', label: 'Machine ID' }, { key: 'partId', label: 'Part ID' }, { key: 'partSku', label: 'Part SKU' }, { key: 'partName', label: 'Part name' }, { key: 'quantity', label: 'Quantity' }, { key: 'unitCost', label: 'Unit cost (DZD)' }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Created at' },
  ] },
  { name: 'Condition Readings', columns: [
    { key: 'id', label: 'Reading ID' }, { key: 'machineId', label: 'Machine ID' }, { key: 'machineCode', label: 'Machine code' }, { key: 'machineName', label: 'Machine' }, { key: 'metric', label: 'Metric' }, { key: 'valueNum', label: 'Value' }, { key: 'unit', label: 'Unit' }, { key: 'measuredAt', label: 'Measured at' }, { key: 'source', label: 'Source' }, { key: 'thresholdMin', label: 'Threshold min' }, { key: 'thresholdMax', label: 'Threshold max' }, { key: 'notes', label: 'Notes' }, { key: 'recordedBy', label: 'Recorded by' }, { key: 'createdAt', label: 'Created at' },
  ] },
  { name: 'Meter Readings', columns: [
    { key: 'id', label: 'Reading ID' }, { key: 'machineId', label: 'Machine ID' }, { key: 'machineCode', label: 'Machine code' }, { key: 'machineName', label: 'Machine' }, { key: 'meterType', label: 'Meter type' }, { key: 'readingValue', label: 'Reading value' }, { key: 'readingAt', label: 'Reading at' }, { key: 'source', label: 'Source' }, { key: 'notes', label: 'Notes' }, { key: 'recordedBy', label: 'Recorded by' }, { key: 'createdAt', label: 'Created at' },
  ] },
  { name: 'Safety Inspections', columns: [
    { key: 'id', label: 'Inspection ID' }, { key: 'title', label: 'Title' }, { key: 'machineId', label: 'Machine ID' }, { key: 'machineCode', label: 'Machine code' }, { key: 'machineName', label: 'Machine' }, { key: 'inspectionDate', label: 'Inspection date' }, { key: 'inspector', label: 'Inspector' }, { key: 'result', label: 'Result' }, { key: 'notes', label: 'Notes' }, { key: 'createdBy', label: 'Created by' }, { key: 'createdAt', label: 'Created at' }, { key: 'updatedAt', label: 'Updated at' },
  ] },
  { name: 'Technicians', columns: [
    { key: 'id', label: 'Technician ID' }, { key: 'userId', label: 'User ID' }, { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'availabilityStatus', label: 'Availability' }, { key: 'skill', label: 'Skill' }, { key: 'shiftName', label: 'Shift' }, { key: 'attendanceStatus', label: 'Attendance' }, { key: 'active', label: 'Active' }, { key: 'hireDate', label: 'Hire date' }, { key: 'createdAt', label: 'Created at' }, { key: 'updatedAt', label: 'Updated at' },
  ] },
  { name: 'Machines', columns: [
    { key: 'id', label: 'Machine ID' }, { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'manufacturer', label: 'Manufacturer' }, { key: 'model', label: 'Model' }, { key: 'serialNumber', label: 'Serial number' }, { key: 'state', label: 'State' }, { key: 'workshopId', label: 'Workshop ID' }, { key: 'workshopName', label: 'Workshop' }, { key: 'productionLineId', label: 'Production line ID' }, { key: 'installDate', label: 'Install date' }, { key: 'nextMaintenanceDate', label: 'Next maintenance date' }, { key: 'technicianDescription', label: 'Technician description' }, { key: 'workshopChiefDescription', label: 'Workshop chief description' }, { key: 'notes', label: 'Notes' },
  ] },
  { name: 'Workshops', columns: [
    { key: 'id', label: 'Workshop ID' }, { key: 'name', label: 'Name' }, { key: 'nameFr', label: 'Name (FR)' }, { key: 'nameEn', label: 'Name (EN)' }, { key: 'manager', label: 'Manager' }, { key: 'managerPhone', label: 'Manager phone' }, { key: 'location', label: 'Location' },
  ] },
  { name: 'Spare Parts Inventory', columns: [
    { key: 'id', label: 'Part ID' }, { key: 'sku', label: 'SKU' }, { key: 'name', label: 'Name' }, { key: 'category', label: 'Category' }, { key: 'location', label: 'Location' }, { key: 'stockQuantity', label: 'Stock quantity' }, { key: 'minimumQuantity', label: 'Minimum quantity' }, { key: 'unitCost', label: 'Unit cost (DZD)' }, { key: 'createdAt', label: 'Created at' }, { key: 'updatedAt', label: 'Updated at' },
  ] },
  { name: 'Warehouse Movements', columns: [
    { key: 'id', label: 'Movement ID' }, { key: 'partId', label: 'Part ID' }, { key: 'partSku', label: 'Part SKU' }, { key: 'partName', label: 'Part name' }, { key: 'movementType', label: 'Movement type' }, { key: 'quantity', label: 'Quantity' }, { key: 'reason', label: 'Reason' }, { key: 'createdByUserId', label: 'Created by user ID' }, { key: 'createdAt', label: 'Created at' },
  ] },
  { name: 'Machine Documents', columns: [
    { key: 'id', label: 'Document ID' }, { key: 'title', label: 'Title' }, { key: 'machineId', label: 'Machine ID' }, { key: 'machineCode', label: 'Machine code' }, { key: 'machineName', label: 'Machine' }, { key: 'documentType', label: 'Document type' }, { key: 'referenceCode', label: 'Reference code' }, { key: 'fileLocation', label: 'File location' }, { key: 'notes', label: 'Notes' }, { key: 'createdBy', label: 'Created by' }, { key: 'createdAt', label: 'Created at' }, { key: 'updatedAt', label: 'Updated at' },
  ] },
  { name: 'Maintenance Log Attachments', columns: [
    { key: 'id', label: 'Attachment ID' }, { key: 'maintenanceLogId', label: 'Maintenance log ID' }, { key: 'machineId', label: 'Machine ID' }, { key: 'machineCode', label: 'Machine code' }, { key: 'logTitle', label: 'Log title' }, { key: 'attachmentType', label: 'Attachment type' }, { key: 'originalFilename', label: 'File name' }, { key: 'storageKey', label: 'Storage key' }, { key: 'mimeType', label: 'MIME type' }, { key: 'sizeBytes', label: 'Size (bytes)' }, { key: 'sha256', label: 'SHA-256' }, { key: 'createdAt', label: 'Created at' },
  ] },
  { name: 'Maintenance Notifications', columns: [
    { key: 'id', label: 'Notification ID' }, { key: 'taskId', label: 'Work order ID' }, { key: 'taskTitle', label: 'Work order title' }, { key: 'machineId', label: 'Machine ID' }, { key: 'machineCode', label: 'Machine code' }, { key: 'machineName', label: 'Machine' }, { key: 'technicianId', label: 'Technician ID' }, { key: 'technicianName', label: 'Technician' }, { key: 'notificationType', label: 'Notification type' }, { key: 'recipientPhone', label: 'Recipient phone' }, { key: 'recipientEmail', label: 'Recipient email' }, { key: 'message', label: 'Message' }, { key: 'status', label: 'Status' }, { key: 'attempts', label: 'Attempts' }, { key: 'sentAt', label: 'Sent at' }, { key: 'scheduledAt', label: 'Scheduled at' }, { key: 'createdAt', label: 'Created at' }, { key: 'updatedAt', label: 'Updated at' },
  ] },
  { name: 'Audit Trail', columns: [
    { key: 'id', label: 'Audit ID' }, { key: 'tableName', label: 'Table' }, { key: 'recordId', label: 'Record ID' }, { key: 'action', label: 'Action' }, { key: 'actorId', label: 'Actor ID' }, { key: 'createdAt', label: 'Created at' }, { key: 'oldData', label: 'Old data' }, { key: 'newData', label: 'New data' },
  ] },
];

const SUMMARY_COLUMNS = [
  { key: 'worksheet', label: 'Worksheet' }, { key: 'records', label: 'Record count' }, { key: 'included', label: 'Included' },
];

function formatValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function buildSheet(name, columns, rows) {
  const aoa = [columns.map(column => column.label)];
  const records = (rows || []).map(row => columns.map(column => formatValue(row ? row[column.key] : null)));
  for (const record of records) aoa.push(record);
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const lastRow = aoa.length - 1;
  const lastCol = columns.length - 1;
  worksheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } });
  worksheet['!cols'] = columns.map(column => ({ wch: Math.max(String(column.label).length + 2, 12) }));
  worksheet['!freezePane'] = 'A2';
  worksheet['!autofilter'] = { ref: worksheet['!ref'] };
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let row = 0; row <= lastRow; row += 1) {
    for (let col = 0; col <= lastCol; col += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (!cell) continue;
      const value = aoa[row][col];
      if (value instanceof Date) {
        cell.t = 'd';
        cell.z = 'yyyy-mm-dd';
        cell.v = Math.floor(value.getTime() / 86400000) + 25569;
      }
    }
  }
  return worksheet;
}

function buildWorkbook(dataSets) {
  const workbook = XLSX.utils.book_new();
  const counts = [];
  for (const dataSet of dataSets) {
    if (!dataSet || !dataSet.name) continue;
    XLSX.utils.book_append_sheet(workbook, buildSheet(dataSet.name, dataSet.columns || SUMMARY_COLUMNS, dataSet.rows), dataSet.name.slice(0, 31));
    counts.push({ worksheet: dataSet.name, records: (dataSet.rows || []).length, included: true });
  }
  XLSX.utils.book_append_sheet(workbook, buildSheet('Summary', SUMMARY_COLUMNS, counts), 'Summary');
  return workbook;
}

function exportFileName(date = new Date()) {
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `${EXPORT_FILE_PREFIX}-${stamp}.xlsx`;
}

async function collectDataSets() {
  const dataSets = [];
  const missing = [];
  const defs = new Map(SHEET_DEFS.map(def => [def.name, def]));

  const collect = async (name, sql, params = []) => {
    const def = defs.get(name);
    const index = dataSets.push({ name, columns: def ? def.columns : SUMMARY_COLUMNS, rows: [] }) - 1;
    try {
      const [rows] = await pool.execute(sql, params);
      dataSets[index].rows = rows;
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
        dataSets.splice(index, 1);
        missing.push(name);
        return;
      }
      throw error;
    }
  };

  await collect('Maintenance Logs', `SELECT l.id, l.machine_id AS machineId, l.machine_name AS machineName, l.technician_id AS technicianId,
        COALESCE(NULLIF(u.full_name, ''), th.name) AS technicianName,
        l.workshop_id AS workshopId, l.maintenance_type AS maintenanceType, l.cost, l.duration_hours AS durationHours,
        l.problem_description AS problemDescription, l.work_performed AS workPerformed, l.diagnosis, l.started_at AS startedAt,
        l.completed_at AS completedAt, l.downtime_start AS downtimeStart, l.downtime_end AS downtimeEnd, l.created_at AS createdAt, l.updated_at AS updatedAt
      FROM maintenance_logs l
      LEFT JOIN technicians th ON th.id = l.technician_id
      LEFT JOIN users u ON u.id = th.user_id`);

  await collect('Work Orders', `SELECT t.id, t.title, t.maintenance_type AS maintenanceType, t.machine_id AS machineId,
        m.code AS machineCode, m.name AS machineName, t.technician_id AS technicianId, th.name AS technicianName,
        t.workshop_id AS workshopId, w.name AS workshopName, t.assigned_by AS assignedBy, t.priority, t.status, t.due_date AS dueDate,
        t.started_at AS startedAt, t.completed_at AS completedAt, t.created_at AS createdAt, t.updated_at AS updatedAt, t.description
      FROM maintenance_tasks t
      LEFT JOIN machines m ON m.id = t.machine_id
      LEFT JOIN technicians th ON th.id = t.technician_id
      LEFT JOIN workshops w ON w.id = t.workshop_id`);

  await collect('Breakdown Reports', `SELECT b.id, b.machine_id AS machineId, m.code AS machineCode, m.name AS machineName,
        b.task_id AS taskId, b.reported_at AS reportedAt, b.severity, b.symptom, b.root_cause, b.corrective_action AS correctiveAction,
        b.outcome, b.downtime_minutes AS downtimeMinutes, b.reported_by AS reportedBy, b.created_at AS createdAt
      FROM cmms_breakdown_reports b
      LEFT JOIN machines m ON m.id = b.machine_id`);

  await collect('Preventive Plans', `SELECT p.id, p.machine_id AS machineId, m.code AS machineCode, m.name AS machineName,
        p.title, p.description, p.frequency_days AS frequencyDays, p.last_completed_at AS lastCompletedAt, p.next_due_at AS nextDueAt,
        p.active, p.created_by AS createdBy, p.created_at AS createdAt, p.updated_at AS updatedAt
      FROM cmms_preventive_plans p
      LEFT JOIN machines m ON m.id = p.machine_id`);

  await collect('PM Occurrences', `SELECT o.id, o.plan_id AS planId, p.title AS planTitle, p.machine_id AS machineId,
        m.code AS machineCode, m.name AS machineName, o.due_at AS dueAt, o.task_id AS taskId, t.status AS taskStatus,
        o.occurrence_status AS occurrenceStatus, o.created_at AS createdAt
      FROM cmms_pm_occurrences o
      LEFT JOIN cmms_preventive_plans p ON p.id = o.plan_id
      LEFT JOIN machines m ON m.id = p.machine_id
      LEFT JOIN maintenance_tasks t ON t.id = o.task_id`);

  await collect('PM Checklist Items', `SELECT i.id, i.plan_id AS planId, p.title AS planTitle, p.machine_id AS machineId, i.title,
        i.required, i.unit, i.minimum_value AS minimumValue, i.maximum_value AS maximumValue, i.sort_order AS sortOrder,
        i.active, i.created_at AS createdAt
      FROM cmms_pm_checklist_items i
      LEFT JOIN cmms_preventive_plans p ON p.id = i.plan_id`);

  await collect('Work Order Checklist Results', `SELECT r.id, r.task_id AS taskId, t.title AS taskTitle, t.machine_id AS machineId,
        r.checklist_item_id AS checklistItemId, i.title AS checklistItemTitle, r.result, r.measured_value AS measuredValue,
        r.notes, r.completed_by AS completedBy, r.completed_at AS completedAt
      FROM cmms_work_order_checklist_results r
      LEFT JOIN maintenance_tasks t ON t.id = r.task_id
      LEFT JOIN cmms_pm_checklist_items i ON i.id = r.checklist_item_id`);

  await collect('Spare Parts Used', `SELECT w.id, w.task_id AS taskId, t.title AS taskTitle, t.machine_id AS machineId, w.part_id AS partId,
        p.sku AS partSku, p.name AS partName, w.quantity, w.unit_cost AS unitCost, w.status, w.created_at AS createdAt
      FROM cmms_work_order_parts w
      LEFT JOIN maintenance_tasks t ON t.id = w.task_id
      LEFT JOIN warehouse_parts p ON p.id = w.part_id`);

  await collect('Condition Readings', `SELECT c.id, c.machine_id AS machineId, m.code AS machineCode, m.name AS machineName,
        c.metric, c.value_num AS valueNum, c.unit, c.measured_at AS measuredAt, c.source, c.threshold_min AS thresholdMin,
        c.threshold_max AS thresholdMax, c.notes, c.recorded_by AS recordedBy, c.created_at AS createdAt
      FROM cmms_condition_readings c
      LEFT JOIN machines m ON m.id = c.machine_id`);

  await collect('Meter Readings', `SELECT c.id, c.machine_id AS machineId, m.code AS machineCode, m.name AS machineName,
        c.meter_type AS meterType, c.reading_value AS readingValue, c.reading_at AS readingAt, c.source, c.notes,
        c.recorded_by AS recordedBy, c.created_at AS createdAt
      FROM cmms_machine_meter_readings c
      LEFT JOIN machines m ON m.id = c.machine_id`);

  await collect('Safety Inspections', `SELECT s.id, s.title, s.machine_id AS machineId, m.code AS machineCode, m.name AS machineName,
        s.inspection_date AS inspectionDate, s.inspector, s.result, s.notes, s.created_by AS createdBy, s.created_at AS createdAt, s.updated_at AS updatedAt
      FROM cmms_safety_inspections s
      LEFT JOIN machines m ON m.id = s.machine_id`);

  await collect('Technicians', `SELECT id, user_id AS userId, name, phone, email, availability_status AS availabilityStatus,
        skill, shift_name AS shiftName, attendance_status AS attendanceStatus, active, hire_date AS hireDate,
        created_at AS createdAt, updated_at AS updatedAt FROM technicians`);

  await collect('Machines', `SELECT m.id, m.code, m.name, m.manufacturer, m.model, m.serial_number AS serialNumber, m.state,
        m.workshop_id AS workshopId, w.name AS workshopName, m.production_line_id AS productionLineId, m.install_date AS installDate,
        m.next_maintenance_date AS nextMaintenanceDate, m.technician_description AS technicianDescription,
        m.workshop_chief_description AS workshopChiefDescription, m.notes
      FROM machines m
      LEFT JOIN workshops w ON w.id = m.workshop_id`);

  await collect('Workshops', `SELECT id, name, name_fr AS nameFr, name_en AS nameEn, manager, manager_phone AS managerPhone, location FROM workshops`);

  await collect('Spare Parts Inventory', `SELECT id, sku, name, category, location, stock_quantity AS stockQuantity,
        minimum_quantity AS minimumQuantity, unit_cost AS unitCost, created_at AS createdAt, updated_at AS updatedAt FROM warehouse_parts`);

  await collect('Warehouse Movements', `SELECT m.id, m.part_id AS partId, p.sku AS partSku, p.name AS partName, m.movement_type AS movementType,
        m.quantity, m.reason, m.created_by_user_id AS createdByUserId, m.created_at AS createdAt
      FROM warehouse_movements m
      LEFT JOIN warehouse_parts p ON p.id = m.part_id`);

  await collect('Machine Documents', `SELECT d.id, d.title, d.machine_id AS machineId, m.code AS machineCode, m.name AS machineName,
        d.document_type AS documentType, d.reference_code AS referenceCode, d.file_location AS fileLocation, d.notes,
        d.created_by AS createdBy, d.created_at AS createdAt, d.updated_at AS updatedAt
      FROM cmms_machine_documents d
      LEFT JOIN machines m ON m.id = d.machine_id`);

  await collect('Maintenance Log Attachments', `SELECT a.id, a.maintenance_log_id AS maintenanceLogId, l.machine_id AS machineId,
        m.code AS machineCode, l.description AS logTitle, a.attachment_type AS attachmentType, a.original_filename AS originalFilename,
        a.storage_key AS storageKey, a.mime_type AS mimeType, a.size_bytes AS sizeBytes, a.sha256, a.created_at AS createdAt
      FROM maintenance_log_attachments a
      LEFT JOIN maintenance_logs l ON l.id = a.maintenance_log_id
      LEFT JOIN machines m ON m.id = l.machine_id`);

  await collect('Maintenance Notifications', `SELECT n.id, n.task_id AS taskId, t.title AS taskTitle, n.machine_id AS machineId,
        m.code AS machineCode, m.name AS machineName, n.technician_id AS technicianId, th.name AS technicianName,
        n.notification_type AS notificationType, n.recipient_phone AS recipientPhone, n.recipient_email AS recipientEmail,
        n.message, n.status, n.attempts, n.sent_at AS sentAt, n.scheduled_at AS scheduledAt, n.created_at AS createdAt, n.updated_at AS updatedAt
      FROM maintenance_notifications n
      LEFT JOIN maintenance_tasks t ON t.id = n.task_id
      LEFT JOIN machines m ON m.id = n.machine_id
      LEFT JOIN technicians th ON th.id = n.technician_id`);

  await collect('Audit Trail', `SELECT id, table_name AS tableName, record_id AS recordId, action, actor_id AS actorId,
        created_at AS createdAt, old_data AS oldData, new_data AS newData FROM audit_trail`);

  const summary = dataSets.map(dataSet => ({ worksheet: dataSet.name, records: dataSet.rows.length, included: true }));
  dataSets.push({ name: 'Summary', columns: SUMMARY_COLUMNS, rows: summary });

  return { dataSets, missing };
}

async function generateMaintenanceExport() {
  const { dataSets, missing } = await collectDataSets();
  const workbook = buildWorkbook(dataSets);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const fileName = exportFileName();
  return { buffer, missing, fileName, dataSets };
}

module.exports = {
  SHEET_DEFS,
  SUMMARY_COLUMNS,
  buildSheet,
  buildWorkbook,
  exportFileName,
  collectDataSets,
  generateMaintenanceExport,
};
