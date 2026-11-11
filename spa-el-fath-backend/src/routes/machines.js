
const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const { enqueueBreakdown } = require('../services/maintenanceNotifications');

const router = express.Router();

router.use(requireAuth);

let machineColumnsPromise;
async function getMachineColumns() {
  if (!machineColumnsPromise) {
    machineColumnsPromise = pool.query('SHOW COLUMNS FROM machines').then(([rows]) => new Set(rows.map(row => row.Field)));
  }
  return machineColumnsPromise;
}
function optionalColumn(columns, name) { return columns.has(name) ? `m.${name}` : `NULL AS ${name}`; }
async function getMachineById(id, columns) {
  const [rows] = await pool.execute(`SELECT m.id, m.code, m.name, ${optionalColumn(columns, 'name_fr')}, ${optionalColumn(columns, 'name_en')}, m.workshop_id, m.workshop_name, m.manufacturer, m.model, m.serial_number, m.production_line_id, m.production_line_position, m.m_type, m.start_year, ${optionalColumn(columns, 'install_date')}, ${optionalColumn(columns, 'next_maintenance_date')}, m.listed_state, m.state, m.intervention_nbr, m.quantity, m.notes, (SELECT MAX(ml.maintenance_date) FROM maintenance_logs ml WHERE ml.machine_id = m.id) AS last_maintenance_date FROM machines m WHERE m.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}
const OPTIONAL_MACHINE_COLUMNS = ['name_fr', 'name_en', 'install_date', 'next_maintenance_date'];
function requireOptionalColumns(columns, machine, res) {
  const needsColumns = OPTIONAL_MACHINE_COLUMNS.some(column => machine[column] !== null && machine[column] !== undefined);
  if (needsColumns && !OPTIONAL_MACHINE_COLUMNS.every(column => columns.has(column))) {
    res.status(503).json({ success: false, message: 'Multilingual names and installation/next-maintenance dates require the additive CMMS migration. Apply sql/202610270001_cmms_workflow_enhancements.sql after backing up the database.' });
    return false;
  }
  return true;
}

const EDIT_ROLES = new Set(['admin', 'production_chief', 'workshop_head']);
const DELETE_ROLES = new Set(['admin', 'production_chief']);

function canEdit(req, res, next) {
  if (!EDIT_ROLES.has(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to modify machines.',
    });
  }
  next();
}

function canDelete(req, res, next) {
  if (!DELETE_ROLES.has(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to delete machines.',
    });
  }
  next();
}

function isBrokenState(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['broken', 'en panne', 'panne'].includes(normalized);
}


function auditActorId(req) {
  const id = Number(req.user?.sub);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function writeMachineAudit(connection, req, recordId, action, oldData, newData) {
  await connection.execute(
    'INSERT INTO audit_trail (table_name, record_id, action, actor_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
    ['machines', String(recordId), action, auditActorId(req), oldData == null ? null : JSON.stringify(oldData), newData == null ? null : JSON.stringify(newData)]
  );
}

function textOrNull(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value).trim();
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isInteger(number) ? number : NaN;
}

function getMachineInput(body) {
  const status = body.status ?? body.state ?? 'working';

  const allowedStatuses = new Set([
    'working',
    'broken',
    'maintenance',
  ]);

  if (!allowedStatuses.has(status)) {
    throw new Error('Invalid machine status.');
  }

  const workshopValue = body.workshopId ?? body.workshop_id;
  const workshopId = numberOrNull(workshopValue);

  if (Number.isNaN(workshopId) || (workshopId !== null && workshopId < 1)) {
    throw new Error('Invalid workshop ID.');
  }

  const position = numberOrNull(
    body.productionLinePosition ?? body.production_line_position
  );

  const intervention = numberOrNull(
    body.interventionNbr ?? body.intervention_nbr
  );

  const quantity = numberOrNull(body.quantity);
  const productionLineId = numberOrNull(body.productionLineId ?? body.production_line_id);
  const installDateValue = body.installDate ?? body.install_date;
  const nextMaintenanceValue = body.nextMaintenanceDate ?? body.next_maintenance_date;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const installDate = installDateValue ? String(installDateValue).slice(0, 10) : null;
  const nextMaintenanceDate = nextMaintenanceValue ? String(nextMaintenanceValue).slice(0, 10) : null;
  if ((installDate && !datePattern.test(installDate)) || (nextMaintenanceDate && !datePattern.test(nextMaintenanceDate))) throw new Error('Invalid machine date. Use YYYY-MM-DD.');

  if ([position, intervention, quantity, productionLineId].some(Number.isNaN)) {
    throw new Error('Numeric fields must contain whole numbers.');
  }

  const machine = {
    code: textOrNull(body.code),
    name: textOrNull(body.name),
    name_fr: textOrNull(body.nameFr ?? body.name_fr),
    name_en: textOrNull(body.nameEn ?? body.name_en),
    manufacturer: textOrNull(body.manufacturer),
    model: textOrNull(body.model),
    serial_number: textOrNull(body.serialNumber ?? body.serial_number),
    production_line_position: position,
    production_line_id: productionLineId,
    install_date: installDate,
    next_maintenance_date: nextMaintenanceDate,
    m_type: textOrNull(body.category ?? body.m_type),
    start_year: textOrNull(body.startYear ?? body.start_year ?? (installDate ? installDate.slice(0, 4) : null)),
    listed_state: textOrNull(body.listedState ?? body.listed_state),
    state: status,
    intervention_nbr: intervention,
    quantity,
    notes: textOrNull(body.notes),
    workshop_id: workshopId,
    workshop_name: textOrNull(body.workshopName ?? body.workshop_name),
  };

  if (!machine.code || !machine.name) {
    throw new Error('Machine code and name are required.');
  }

  return machine;
}

async function validateWorkshop(machine) {
  if (machine.workshop_id === null) {
    return machine;
  }

  const [rows] = await pool.execute(
    'SELECT id, name FROM workshops WHERE id = ? LIMIT 1',
    [machine.workshop_id]
  );

  if (!rows.length) {
    throw new Error('The selected workshop does not exist.');
  }

  machine.workshop_name = rows[0].name;
  return machine;
}

// GET /api/machines
router.get('/', async (req, res) => {
  try {
    const columns = await getMachineColumns();
    const [rows] = await pool.execute(`
      SELECT m.id, m.code, m.name, ${optionalColumn(columns, 'name_fr')}, ${optionalColumn(columns, 'name_en')},
        m.workshop_id, m.workshop_name, m.manufacturer, m.model, m.serial_number,
        m.production_line_id, m.production_line_position, m.m_type, m.start_year,
        ${optionalColumn(columns, 'install_date')}, ${optionalColumn(columns, 'next_maintenance_date')},
        m.listed_state, m.state, m.intervention_nbr, m.quantity, m.notes,
        (SELECT MAX(ml.maintenance_date) FROM maintenance_logs ml WHERE ml.machine_id = m.id) AS last_maintenance_date
      FROM machines m ORDER BY m.id DESC
    `);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Failed to fetch machines:', error.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve machines.' });
  }
});

// POST /api/machines
router.post('/', canEdit, async (req, res) => {
  let connection;
  try {
    const machine = await validateWorkshop(getMachineInput(req.body));
    const columns = await getMachineColumns();
    if (!requireOptionalColumns(columns, machine, res)) return;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const fieldNames = ['code', 'name', 'workshop_name', 'manufacturer', 'model', 'serial_number', 'production_line_id', 'production_line_position', 'm_type', 'start_year', 'listed_state', 'state', 'intervention_nbr', 'quantity', 'notes', 'workshop_id'];
    const values = [machine.code, machine.name, machine.workshop_name, machine.manufacturer, machine.model, machine.serial_number, machine.production_line_id, machine.production_line_position, machine.m_type, machine.start_year, machine.listed_state, machine.state, machine.intervention_nbr, machine.quantity, machine.notes, machine.workshop_id];
    if (OPTIONAL_MACHINE_COLUMNS.every(column => columns.has(column))) {
      fieldNames.splice(2, 0, 'name_fr', 'name_en');
      values.splice(2, 0, machine.name_fr, machine.name_en);
      const listedIndex = fieldNames.indexOf('listed_state');
      fieldNames.splice(listedIndex, 0, 'install_date', 'next_maintenance_date');
      values.splice(listedIndex, 0, machine.install_date, machine.next_maintenance_date);
    }
    const placeholders = fieldNames.map(() => '?').join(', ');
    const [result] = await connection.execute(`INSERT INTO machines (${fieldNames.join(', ')}) VALUES (${placeholders})`, values);

    await writeMachineAudit(connection, req, result.insertId, 'INSERT', null, machine);

    if (isBrokenState(machine.state)) {
      await enqueueBreakdown(
        connection,
        { ...machine, id: result.insertId },
        `machine:${result.insertId}:breakdown:${crypto.randomUUID()}`
      );
    }

    await connection.commit();
    return res.status(201).json({
      success: true,
      message: 'Machine created successfully.',
      data: await getMachineById(result.insertId, await getMachineColumns()),
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    const clientError = error.message.startsWith('Invalid ') ||
      error.message.includes('required') ||
      error.message.includes('does not exist');

    res.status(clientError ? 400 : 500).json({
      success: false,
      message: clientError ? error.message : 'Could not create machine.',
    });

    if (!clientError) {
      console.error('Failed to create machine:', error.message);
    }
  } finally {
    if (connection) connection.release();
  }
});

// PUT /api/machines/:id
router.put('/:id', canEdit, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: 'Invalid machine ID.',
    });
  }

  let connection;
  try {
    const machine = await validateWorkshop(getMachineInput(req.body));
    const columns = await getMachineColumns();
    if (!requireOptionalColumns(columns, machine, res)) return;
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingRows] = await connection.execute(
      'SELECT * FROM machines WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!existingRows.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Machine not found.',
      });
    }
    const previousMachine = existingRows[0];

    const assignments = ['code = ?', 'name = ?', 'workshop_name = ?', 'manufacturer = ?', 'model = ?', 'serial_number = ?', 'production_line_id = ?', 'production_line_position = ?', 'm_type = ?', 'start_year = ?', 'listed_state = ?', 'state = ?', 'intervention_nbr = ?', 'quantity = ?', 'notes = ?', 'workshop_id = ?'];
    const values = [machine.code, machine.name, machine.workshop_name, machine.manufacturer, machine.model, machine.serial_number, machine.production_line_id, machine.production_line_position, machine.m_type, machine.start_year, machine.listed_state, machine.state, machine.intervention_nbr, machine.quantity, machine.notes, machine.workshop_id];
    if (OPTIONAL_MACHINE_COLUMNS.every(column => columns.has(column))) {
      assignments.splice(2, 0, 'name_fr = ?', 'name_en = ?');
      values.splice(2, 0, machine.name_fr, machine.name_en);
      const listedIndex = assignments.indexOf('listed_state = ?');
      assignments.splice(listedIndex, 0, 'install_date = ?', 'next_maintenance_date = ?');
      values.splice(listedIndex, 0, machine.install_date, machine.next_maintenance_date);
    }
    await connection.execute(`UPDATE machines SET ${assignments.join(', ')} WHERE id = ?`, [...values, id]);

    await writeMachineAudit(connection, req, id, 'UPDATE', previousMachine, machine);

    // Alert only on a transition into a broken state, not on unrelated edits to an already-broken machine.
    if (!isBrokenState(previousMachine.state) && isBrokenState(machine.state)) {
      await enqueueBreakdown(
        connection,
        { ...machine, id },
        `machine:${id}:breakdown:${crypto.randomUUID()}`
      );

      // Phase B integration: automatically open a corrective work order for the broken machine.
      await connection.execute(
        `INSERT INTO maintenance_tasks
          (title, description, maintenance_type, machine_id, workshop_id, assigned_by, priority, status, due_date)
         VALUES (?, ?, 'CORRECTIVE', ?, ?, ?, 'HIGH', 'PENDING', DATE_ADD(NOW(), INTERVAL 1 DAY))`,
        [
          `Breakdown: ${machine.name || machine.code || `Machine ${id}`}`,
          `Automatically created from machine status change to broken.`,
          id,
          machine.workshop_id,
          auditActorId(req),
        ]
      );
    }

    await connection.commit();
    return res.json({
      success: true,
      message: 'Machine updated successfully.',
      data: await getMachineById(id, await getMachineColumns()),
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    const clientError = error.message.startsWith('Invalid ') ||
      error.message.includes('required') ||
      error.message.includes('does not exist');

    res.status(clientError ? 400 : 500).json({
      success: false,
      message: clientError ? error.message : 'Could not update machine.',
    });

    if (!clientError) {
      console.error('Failed to update machine:', error.message);
    }
  } finally {
    if (connection) connection.release();
  }
});

// DELETE /api/machines/:id
router.delete('/:id', canDelete, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: 'Invalid machine ID.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT * FROM machines WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Machine not found.' });
    }
    await connection.execute('DELETE FROM machines WHERE id = ?', [id]);
    await writeMachineAudit(connection, req, id, 'DELETE', rows[0], null);
    await connection.commit();
    return res.json({ success: true, message: 'Machine deleted successfully.' });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    console.error('Failed to delete machine:', error.message);
    return res.status(500).json({ success: false, message: 'Could not delete machine.' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
