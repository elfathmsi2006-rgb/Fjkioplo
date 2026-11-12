const pool = require('../db');
const { enqueueTaskNotification } = require('./maintenanceNotifications');

// Idempotent scheduler. The unique (plan_id,due_at) key prevents duplicate work orders
// when multiple workers or manual runs overlap. Only calendar-day plans are scheduled here.
async function generateDuePreventiveTasks() {
  const connection = await pool.getConnection();
  const summary = { scanned: 0, created: 0, skipped: 0, unassigned: 0, errors: 0 };
  try {
    const [plans] = await connection.execute(
      `SELECT id,machine_id,title,description,frequency_days,DATE_FORMAT(next_due_at,'%Y-%m-%d %H:%i:%s') AS next_due_at
       FROM cmms_preventive_plans WHERE active=1 AND next_due_at<=NOW() ORDER BY next_due_at LIMIT 100`
    );
    summary.scanned = plans.length;
    for (const plan of plans) {
      await connection.beginTransaction();
      try {
        const [locked] = await connection.execute(
          `SELECT id,machine_id,title,description,frequency_days,DATE_FORMAT(next_due_at,'%Y-%m-%d %H:%i:%s') AS next_due_at,(next_due_at<=NOW()) AS is_due FROM cmms_preventive_plans WHERE id=? AND active=1 FOR UPDATE`,
          [plan.id]
        );
        if (!locked.length || Number(locked[0].is_due) !== 1) { await connection.commit(); summary.skipped++; continue; }
        const current = locked[0];
        const due = current.next_due_at instanceof Date
          ? current.next_due_at.toISOString().slice(0,19).replace('T',' ')
          : String(current.next_due_at).replace('T',' ').slice(0,19);
        const [existing] = await connection.execute('SELECT id FROM cmms_pm_occurrences WHERE plan_id=? AND due_at=? LIMIT 1', [current.id,due]);
        if (existing.length) {
          await connection.execute('UPDATE cmms_preventive_plans SET next_due_at=DATE_ADD(next_due_at, INTERVAL frequency_days DAY) WHERE id=?', [current.id]);
          await connection.commit(); summary.skipped++; continue;
        }
        const [machineRows] = await connection.execute('SELECT id,workshop_id FROM machines WHERE id=? LIMIT 1', [current.machine_id]);
        if (!machineRows.length) throw new Error(`Preventive plan ${current.id} refers to a missing machine.`);
        const [technicians] = await connection.execute(
          `SELECT t.id FROM technicians t
           LEFT JOIN (SELECT technician_id,COUNT(*) AS open_count FROM maintenance_tasks
                      WHERE status IN ('PENDING','IN_PROGRESS') AND technician_id IS NOT NULL GROUP BY technician_id) w
             ON w.technician_id=t.id
           WHERE t.availability_status='available' AND t.active<>0 AND t.attendance_status='present'
           ORDER BY COALESCE(w.open_count,0) ASC,t.id ASC LIMIT 1 FOR UPDATE`
        );
        const technicianId = technicians.length ? technicians[0].id : null;
        if (technicianId === null) summary.unassigned++;
        const [taskResult] = await connection.execute(
          `INSERT INTO maintenance_tasks (title,description,maintenance_type,machine_id,technician_id,workshop_id,assigned_by,priority,status,due_date,started_at,completed_at)
           VALUES (?,?,'PREVENTIVE',?,?,?,NULL,'MEDIUM','PENDING',?,NULL,NULL)`,
          [`PM: ${current.title}`, current.description || `Automatically generated from preventive plan #${current.id}.`, current.machine_id, technicianId, machineRows[0].workshop_id || null, due]
        );
        await connection.execute('INSERT INTO cmms_pm_occurrences (plan_id,due_at,task_id) VALUES (?,?,?)', [current.id,due,taskResult.insertId]);
        await connection.execute('UPDATE cmms_preventive_plans SET next_due_at=DATE_ADD(next_due_at, INTERVAL frequency_days DAY) WHERE id=?', [current.id]);
        const [taskRows] = await connection.execute('SELECT * FROM maintenance_tasks WHERE id=?', [taskResult.insertId]);
        if (taskRows[0]) await enqueueTaskNotification(connection, taskRows[0], 'TASK_ASSIGNED', `pm:${current.id}:${due}`);
        await connection.commit(); summary.created++;
      } catch (error) {
        await connection.rollback().catch(()=>{}); summary.errors++;
        console.error('Preventive scheduler failed for plan', plan.id, error.message);
      }
    }
    return summary;
  } finally { connection.release(); }
}
module.exports = { generateDuePreventiveTasks };
