const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const { enqueueTaskNotification } = require('../services/maintenanceNotifications');

const router = express.Router();
router.use(requireAuth);

// Write authority matches the frontend: only administrator and production
// chief may create, edit or delete work orders. Workshop heads retain machine/workshop
// write permissions through their own APIs but cannot manage work orders.
const MANAGE_ROLES = new Set(['admin', 'production_chief']);
// Read authority is deliberately wider. Anyone who can open the Maintenance page must
// be able to list work orders, otherwise the breakdown form has no work order to pick
// from and the machine can never be derived from the selected work order.
const VIEW_ROLES = new Set(['admin', 'production_chief', 'workshop_head']);
const TASK_STATUSES = new Set(['PENDING', 'WAITING_PARTS', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const TYPES = new Set(['CORRECTIVE', 'PREVENTIVE']);

function idOrNull(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`Invalid ${label}.`);
  return id;
}

function stringOrNull(value, label, maxLength) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`Invalid ${label}.`);
  const result = value.trim();
  if (!result) return null;
  if (result.length > maxLength) throw new Error(`Invalid ${label}.`);
  return result;
}

function normalizeDueDate(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('Invalid due date.');
  const input = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input);
  const dateTime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(input);
  if (!dateOnly && !dateTime) throw new Error('Due date must be YYYY-MM-DD or YYYY-MM-DD HH:mm:ss.');
  const normalized = dateOnly ? `${input} 23:59:59` : input.replace('T', ' ');
  const iso = normalized.replace(' ', 'T');
  const parsed = new Date((/:\d{2}:\d{2}$/.test(iso) ? iso : `${iso}:00`) + 'Z');
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid due date.');
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

function canManage(req) {
  return MANAGE_ROLES.has(req.user?.role);
}

// Listing and reading work orders is open to every role that may reach the
// Maintenance page. Only writing is restricted to the manage roles.
function canViewTasks(req) {
  return VIEW_ROLES.has(req.user?.role);
}

// Only role IDs 1 (administrator) and 2 (production chief) may edit/delete work orders.
function canEditWorkOrders(req) {
  const roleId = Number(req.user?.roleId);
  return roleId === 1 || roleId === 2 || (!req.user?.roleId && ['admin', 'production_chief'].includes(req.user?.role));
}

function userId(req) {
  const value = Number(req.user?.sub);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function getTechnicianForUser(connection, id) {
  const [rows] = await connection.execute(
    'SELECT id FROM technicians WHERE user_id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function validateReferences(connection, values) {
  if (values.machine_id !== null && values.machine_id !== undefined) {
    const [rows] = await connection.execute(
      'SELECT id, code, name, workshop_id, workshop_name FROM machines WHERE id = ? LIMIT 1',
      [values.machine_id]
    );
    if (!rows.length) throw new Error('The selected machine does not exist.');
    values.machine = rows[0];
    if ((values.workshop_id === null || values.workshop_id === undefined) && rows[0].workshop_id) {
      values.workshop_id = rows[0].workshop_id;
    }
  }

  if (values.technician_id !== null && values.technician_id !== undefined) {
    const [rows] = await connection.execute(
      'SELECT id FROM technicians WHERE id = ? LIMIT 1',
      [values.technician_id]
    );
    if (!rows.length) throw new Error('The selected technician does not exist.');
  }

  if (values.workshop_id !== null && values.workshop_id !== undefined) {
    const [rows] = await connection.execute(
      'SELECT id FROM workshops WHERE id = ? LIMIT 1',
      [values.workshop_id]
    );
    if (!rows.length) throw new Error('The selected workshop does not exist.');
  }
  return values;
}

async function getTaskDetails(connection, taskId) {
  const [rows] = await connection.execute(
    `SELECT t.*, m.code AS machine_code, m.name AS machine_name,
            w.name AS workshop_name, tech.name AS technician_name,
            (SELECT 1 FROM maintenance_logs ml WHERE ml.task_id = t.id AND ml.submission_status = 'SUBMITTED' LIMIT 1) AS has_log
     FROM maintenance_tasks t
     LEFT JOIN machines m ON m.id = t.machine_id
     LEFT JOIN workshops w ON w.id = t.workshop_id
     LEFT JOIN technicians tech ON tech.id = t.technician_id
     WHERE t.id = ? LIMIT 1`,
    [taskId]
  );
  return rows[0] || null;
}

// Technicians only see tasks assigned to the technician record linked to their login.
router.get('/', async (req, res) => {
  let connection;
  try {
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 1000));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    connection = await pool.getConnection();
    let rows;
    if (canViewTasks(req)) {
      [rows] = await connection.execute(
        `SELECT t.*, m.code AS machine_code, m.name AS machine_name,
                w.name AS workshop_name, tech.name AS technician_name,
                (SELECT 1 FROM maintenance_logs ml WHERE ml.task_id = t.id AND ml.submission_status = 'SUBMITTED' LIMIT 1) AS has_log
         FROM maintenance_tasks t
         LEFT JOIN machines m ON m.id = t.machine_id
         LEFT JOIN workshops w ON w.id = t.workshop_id
         LEFT JOIN technicians tech ON tech.id = t.technician_id
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
    } else if (req.user?.role === 'maintenance_worker') {
      const technician = await getTechnicianForUser(connection, userId(req));
      if (!technician) return res.json({ success: true, data: [] });
      [rows] = await connection.execute(
        `SELECT t.*, m.code AS machine_code, m.name AS machine_name,
                w.name AS workshop_name, tech.name AS technician_name,
                (SELECT 1 FROM maintenance_logs ml WHERE ml.task_id = t.id AND ml.submission_status = 'SUBMITTED' LIMIT 1) AS has_log
         FROM maintenance_tasks t
         LEFT JOIN machines m ON m.id = t.machine_id
         LEFT JOIN workshops w ON w.id = t.workshop_id
         LEFT JOIN technicians tech ON tech.id = t.technician_id
         WHERE t.technician_id = ?
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT ? OFFSET ?`,
        [technician.id, limit, offset]
      );
    } else {
      return res.status(403).json({ success: false, message: 'You do not have permission to view maintenance tasks.' });
    }
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Failed to fetch maintenance tasks:', error.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve maintenance tasks.' });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid task ID.' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    const task = await getTaskDetails(connection, id);
    if (!task) return res.status(404).json({ success: false, message: 'Maintenance task not found.' });
    if (!canViewTasks(req)) {
      if (req.user?.role !== 'maintenance_worker') {
        return res.status(403).json({ success: false, message: 'You do not have permission to view this task.' });
      }
      const technician = await getTechnicianForUser(connection, userId(req));
      if (!technician || Number(task.technician_id) !== Number(technician.id)) {
        return res.status(403).json({ success: false, message: 'You can only view tasks assigned to you.' });
      }
    }
    return res.json({ success: true, data: task });
  } catch (error) {
    console.error('Failed to fetch maintenance task:', error.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve maintenance task.' });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/', async (req, res) => {
  if (!canManage(req)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to create maintenance tasks.' });
  }

  let connection;
  try {
    const body = req.body || {};
    const title = stringOrNull(body.title, 'task title', 200);
    if (!title) return res.status(400).json({ success: false, message: 'Task title is required.' });
    const description = stringOrNull(body.description, 'description', 10000);
    const maintenanceType = body.maintenanceType ?? body.maintenance_type ?? 'CORRECTIVE';
    const priority = body.priority ?? 'MEDIUM';
    const status = body.status ?? 'PENDING';
    if (!TYPES.has(maintenanceType)) throw new Error('Invalid maintenance type.');
    if (!PRIORITIES.has(priority)) throw new Error('Invalid priority.');
    if (!TASK_STATUSES.has(status)) throw new Error('Invalid task status.');
    if (status === 'COMPLETED') {
      return res.status(409).json({ success: false, message: 'A task cannot be created as completed. Submit a maintenance log to record completed work.' });
    }

    const values = {
      machine_id: idOrNull(body.machineId ?? body.machine_id, 'machine ID'),
      technician_id: idOrNull(body.technicianId ?? body.technician_id, 'technician ID'),
      workshop_id: idOrNull(body.workshopId ?? body.workshop_id, 'workshop ID'),
      due_date: normalizeDueDate(body.dueDate ?? body.due_date),
    };

    connection = await pool.getConnection();
    await connection.beginTransaction();
    await validateReferences(connection, values);
    const [result] = await connection.execute(
      `INSERT INTO maintenance_tasks
       (title, description, maintenance_type, machine_id, technician_id, workshop_id,
        assigned_by, priority, status, due_date, started_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, maintenanceType, values.machine_id, values.technician_id,
       values.workshop_id, userId(req), priority, status, values.due_date,
       status === 'IN_PROGRESS' ? new Date() : null,
       status === 'COMPLETED' ? new Date() : null]
    );
    const task = await getTaskDetails(connection, result.insertId);
    await connection.execute(
      'INSERT INTO audit_trail (table_name, record_id, action, actor_id, old_data, new_data) VALUES (?, ?, ?, ?, NULL, ?)',
      ['maintenance_tasks', String(task.id), 'INSERT', userId(req), JSON.stringify(task)]
    );
    if (task.technician_id) {
      await enqueueTaskNotification(connection, task, 'TASK_ASSIGNED', `task:${task.id}:assigned:${crypto.randomUUID()}`);
    }
    await connection.commit();
    return res.status(201).json({ success: true, message: 'Maintenance task created successfully.', data: task });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    const clientError = error.message.startsWith('Invalid ') || error.message.includes('does not exist');
    console.error('Failed to create maintenance task:', error.message);
    return res.status(clientError ? 400 : 500).json({
      success: false,
      message: clientError ? error.message : 'Could not create maintenance task.',
    });
  } finally {
    if (connection) connection.release();
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid task ID.' });
  }

  if (!canEditWorkOrders(req)) {
    return res.status(403).json({ success: false, message: 'Only role ID 1 or 2 may edit work orders.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [currentRows] = await connection.execute(
      'SELECT * FROM maintenance_tasks WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!currentRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Maintenance task not found.' });
    }
    const current = currentRows[0];

    // Terminal work orders are immutable. Once cancelled or completed, a task
    // must never silently revert to an active state or regain open reservations.
    if (['COMPLETED', 'CANCELLED'].includes(String(current.status)) && (!req.body?.status || String(req.body.status) !== String(current.status))) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Completed or cancelled work orders are final and cannot revert to an active state.' });
    }

    // Completion must go through a submitted maintenance log so the task and its
    // maintenance history are committed together by /api/maintenance-logs/:id/submit.
    if (req.body?.status === 'COMPLETED' && current.status !== 'COMPLETED') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Submit a maintenance log to complete this task. The task cannot be completed by changing status alone.' });
    }


    const body = req.body || {};
    const title = body.title === undefined ? current.title : stringOrNull(body.title, 'task title', 200);
    if (!title) throw new Error('Invalid task title.');
    const description = body.description === undefined ? current.description : stringOrNull(body.description, 'description', 10000);
    const maintenanceType = body.maintenanceType ?? body.maintenance_type ?? current.maintenance_type;
    const priority = body.priority ?? current.priority;
    const status = body.status ?? current.status;
    if (!TYPES.has(maintenanceType)) throw new Error('Invalid maintenance type.');
    if (!PRIORITIES.has(priority)) throw new Error('Invalid priority.');
    if (!TASK_STATUSES.has(status)) throw new Error('Invalid task status.');

    const values = {
      machine_id: body.machineId === undefined && body.machine_id === undefined ? current.machine_id : idOrNull(body.machineId ?? body.machine_id, 'machine ID'),
      technician_id: body.technicianId === undefined && body.technician_id === undefined ? current.technician_id : idOrNull(body.technicianId ?? body.technician_id, 'technician ID'),
      workshop_id: body.workshopId === undefined && body.workshop_id === undefined ? current.workshop_id : idOrNull(body.workshopId ?? body.workshop_id, 'workshop ID'),
      due_date: body.dueDate === undefined && body.due_date === undefined ? current.due_date : normalizeDueDate(body.dueDate ?? body.due_date),
    };
    await validateReferences(connection, values);
    await connection.execute(
      `UPDATE maintenance_tasks SET
       title = ?, description = ?, maintenance_type = ?, machine_id = ?, technician_id = ?,
       workshop_id = ?, priority = ?, status = ?, due_date = ?,
       started_at = CASE WHEN ? = 'IN_PROGRESS' AND started_at IS NULL THEN NOW() ELSE started_at END,
       completed_at = CASE WHEN ? = 'COMPLETED' THEN COALESCE(completed_at, NOW()) WHEN ? = 'CANCELLED' THEN NULL ELSE completed_at END
       WHERE id = ?`,
      [title, description, maintenanceType, values.machine_id, values.technician_id,
       values.workshop_id, priority, status, values.due_date, status, status, status, id]
    );
    if (status === 'CANCELLED' && String(current.status) !== 'CANCELLED') {
      // Release reserved work-order parts back to the open pool. Issued parts stay
      // issued; only reservations that were never collected are cancelled.
      const [released] = await connection.execute(
        "UPDATE cmms_work_order_parts SET status = 'CANCELLED' WHERE task_id = ? AND status = 'RESERVED'",
        [id]
      );
      if (released.affectedRows) {
        await connection.execute(
          'INSERT INTO audit_trail (table_name, record_id, action, actor_id, old_data, new_data) VALUES (?, ?, ?, ?, NULL, ?)',
          ['cmms_work_order_parts', String(id), 'UPDATE', userId(req), JSON.stringify({ event: 'RESERVATIONS_RELEASED_ON_CANCEL', cancelled_reservations: released.affectedRows, task_id: id })]
        );
      }
    }
    const updated = await getTaskDetails(connection, id);
    await connection.execute(
      'INSERT INTO audit_trail (table_name, record_id, action, actor_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
      ['maintenance_tasks', String(id), 'UPDATE', userId(req), JSON.stringify(current), JSON.stringify(updated)]
    );
    if (updated.technician_id && Number(updated.technician_id) !== Number(current.technician_id)) {
      const type = current.technician_id ? 'TASK_REASSIGNED' : 'TASK_ASSIGNED';
      await enqueueTaskNotification(connection, updated, type, `task:${id}:${type.toLowerCase()}:${crypto.randomUUID()}`);
    }
    await connection.commit();
    return res.json({ success: true, message: 'Maintenance task updated successfully.', data: updated });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    const clientError = error.message.startsWith('Invalid ') || error.message.includes('does not exist') || error.message.includes('must be');
    console.error('Failed to update maintenance task:', error.message);
    return res.status(clientError ? 400 : 500).json({
      success: false,
      message: clientError ? error.message : 'Could not update maintenance task.',
    });
  } finally {
    if (connection) connection.release();
  }
});


router.delete('/:id', async (req, res) => {
  if (!canEditWorkOrders(req)) {
    return res.status(403).json({ success: false, message: 'Only role ID 1 or 2 may delete work orders.' });
  }
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid task ID.' });
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT * FROM maintenance_tasks WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Work order not found.' }); }
    const task = rows[0];
    await connection.execute(
      'INSERT INTO audit_trail (table_name, record_id, action, actor_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, NULL)',
      ['maintenance_tasks', String(id), 'DELETE', userId(req), JSON.stringify(task)]
    );

    // Parts already issued to the workshop consumed real stock. Reversing that
    // movement is a separate workflow, so the work order must stay until then.
    const [issuedParts] = await connection.execute(
      "SELECT id FROM cmms_work_order_parts WHERE task_id=? AND status <> 'RESERVED' LIMIT 1",
      [id]
    );
    if (issuedParts.length) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Spare parts were already issued for this work order. Return the parts before deleting it.' });
    }

    // Rows fully owned by the work order are removed together with it.
    await connection.execute('DELETE FROM cmms_work_order_checklist_results WHERE task_id=?', [id]);
    await connection.execute('DELETE FROM cmms_work_order_parts WHERE task_id=?', [id]);

    // History rows (logs, breakdowns, preventive occurrences, notifications) survive the
    // deletion and are detached instead. Their FK is ON DELETE SET NULL, so the rows
    // stay intact; each detachment is recorded in the audit trail for traceability.
    const detachable = [
      ['maintenance_logs', 'maintenance log'],
      ['cmms_breakdown_reports', 'breakdown report'],
      ['cmms_pm_occurrences', 'preventive occurrence'],
      ['maintenance_notifications', 'notification'],
    ];
    let detached = 0;
    for (const [table] of detachable) {
      let linked;
      try {
        [linked] = await connection.execute(`SELECT id FROM \`${table}\` WHERE task_id=?`, [id]);
      } catch (lookupError) {
        // Optional tables from later migrations: skip them when they are not deployed.
        if (lookupError.code === 'ER_NO_SUCH_TABLE') continue;
        throw lookupError;
      }
      if (!linked.length) continue;
      await connection.execute(`UPDATE \`${table}\` SET task_id=NULL WHERE task_id=?`, [id]);
      for (const row of linked) {
        // audit_trail.action is an enum: the child row was updated, not deleted.
        await connection.execute(
          'INSERT INTO audit_trail (table_name, record_id, action, actor_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, NULL)',
          [table, String(row.id), 'UPDATE', userId(req), JSON.stringify({ detached_from_task_id: id, detached_from_task_title: task.title }), JSON.stringify({ task_id: null })]
        );
        detached += 1;
      }
    }

    await connection.execute('DELETE FROM maintenance_tasks WHERE id = ?', [id]);
    await connection.commit();
    return res.json({
      success: true,
      message: detached
        ? `Work order deleted. ${detached} maintenance history record(s) were preserved and detached from it.`
        : 'Work order deleted.',
    });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Failed to delete work order:', error.message);
    return res.status(500).json({ success: false, message: 'Could not delete work order.' });
  } finally { if (connection) connection.release(); }
});

// Phase 2: escalate an overdue work order (managers only).
router.post('/:id/escalate', async (req, res) => {
  if (!['admin', 'production_chief'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only role ID 1 or 2 may escalate work orders.' });
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid task ID.' });
  let connection;
  try {
    const [rows] = await pool.execute('SELECT id, status, due_date, escalated_at, technician_id, title, priority, machine_id FROM maintenance_tasks WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Maintenance task not found.' });
    const task = rows[0];
    if (['COMPLETED', 'CANCELLED'].includes(String(task.status))) {
      return res.status(409).json({ success: false, message: 'Completed or cancelled tasks cannot be escalated.' });
    }
    if (!task.due_date || new Date(task.due_date) >= new Date()) {
      return res.status(409).json({ success: false, message: 'Only overdue work orders can be escalated.' });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.execute('UPDATE maintenance_tasks SET escalated_at = COALESCE(escalated_at, NOW()), status = IF(status = "PENDING", "IN_PROGRESS", status) WHERE id = ?', [id]);
    const [machineRows] = await connection.execute('SELECT code, name FROM machines WHERE id = ? LIMIT 1', [task.machine_id]);
    const machine = machineRows[0] || {};
    await enqueueTaskNotification(connection, { ...task, machine_code: machine.code, machine_name: machine.name }, 'TASK_ESCALATED', `task:${id}:escalated:${Date.now()}`);
    await connection.commit();
    return res.json({ success: true, message: 'Work order escalated.' });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Escalate work order failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not escalate work order.' });
  } finally {
    if (connection) connection.release();
  }
});

// Phase 3: automatically mark overdue work orders as escalated.
async function escalateOverdueTasks() {
  const [result] = await pool.execute(
    `UPDATE maintenance_tasks
     SET escalated_at = COALESCE(escalated_at, NOW()),
         status = IF(status = 'PENDING', 'IN_PROGRESS', status)
     WHERE due_date IS NOT NULL
       AND due_date < NOW()
       AND status NOT IN ('COMPLETED', 'CANCELLED')
       AND escalated_at IS NULL`
  );
  return result.affectedRows || 0;
}

router.escalateOverdueTasks = escalateOverdueTasks;

module.exports = router;
