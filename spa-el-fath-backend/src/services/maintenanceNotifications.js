const crypto = require('crypto');
const pool = require('../db');
const { sendNotificationEmail, hasSystemGmailConnection } = require('./gmailSender');

const POLL_INTERVAL_MS = 30 * 1000;
const REMINDER_INTERVAL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MINUTES = 5;
let workerStarted = false;
let workerBusy = false;
let remindersBusy = false;

function safeText(value, fallback = '-') {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text || fallback;
}

function notificationKey(eventKey, technicianId) {
  return `${eventKey}:technician:${technicianId}`.slice(0, 191);
}

function validEmail(value) {
  const email = typeof value === 'string' ? value.trim() : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

async function enqueueNotification(connection, item) {
  const email = validEmail(item.email);
  const [settingRows] = await connection.execute(
    'SELECT enabled FROM maintenance_notification_settings WHERE notification_type = ? LIMIT 1',
    [item.type]
  );
  const enabled = settingRows.length === 0 || Number(settingRows[0].enabled) === 1;
  const status = !enabled || !email ? 'SKIPPED' : 'PENDING';
  const errorMessage = !enabled
    ? 'This notification type is disabled by an administrator.'
    : !email
      ? 'Technician has no valid email address; no email notification was queued.'
      : null;

  await connection.execute(
    `INSERT INTO maintenance_notifications
       (task_id, machine_id, technician_id, notification_type, recipient_email,
        recipient_phone, message, status, attempts, error_message, scheduled_at, deduplication_key)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 0, ?, NOW(), ?)
     ON DUPLICATE KEY UPDATE deduplication_key = VALUES(deduplication_key)`,
    [
      item.taskId || null,
      item.machineId || null,
      item.technicianId || null,
      item.type,
      email,
      item.message,
      status,
      errorMessage,
      item.deduplicationKey,
    ]
  );
}

async function enqueueBreakdown(connection, machine, eventKey, report = {}) {
  const [technicians] = await connection.execute(
    `SELECT t.id, COALESCE(NULLIF(u.email, ''), NULLIF(t.email, '')) AS email
     FROM technicians t
     LEFT JOIN users u ON u.id = t.user_id
     ORDER BY t.id ASC`
  );

  for (const technician of technicians) {
    const machineLabel = `${safeText(machine.code, `Machine ${machine.id}`)} — ${safeText(machine.name)}`;
    const details = [
      `Workshop: ${safeText(machine.workshop_name)}.`,
      `Severity: ${safeText(report.severity, 'Not specified')}.`,
      `Symptom: ${safeText(report.symptom, 'Not specified')}.`,
      `Downtime minutes: ${report.downtimeMinutes == null ? 'Not recorded' : report.downtimeMinutes}.`,
    ].join(' ');
    await enqueueNotification(connection, {
      type: 'MACHINE_BREAKDOWN',
      machineId: machine.id,
      technicianId: technician.id,
      email: technician.email,
      message: `Machine breakdown: ${machineLabel}. ${details}`,
      deduplicationKey: notificationKey(eventKey, technician.id),
    });
  }
}

async function enqueueTaskNotification(connection, task, type, eventKey) {
  if (!task.technician_id) return;
  const [rows] = await connection.execute(
    `SELECT t.id, COALESCE(NULLIF(u.email, ''), NULLIF(t.email, '')) AS email
     FROM technicians t
     LEFT JOIN users u ON u.id = t.user_id
     WHERE t.id = ? LIMIT 1`,
    [task.technician_id]
  );
  if (!rows.length) return;

  const technician = rows[0];
  const taskLabel = `${task.title} (#${task.id})`;
  const machineLabel = task.machine_code
    ? `${task.machine_code} — ${safeText(task.machine_name)}`
    : 'Maintenance task';
  const eventTitle = type === 'TASK_REASSIGNED'
    ? 'Maintenance task reassigned'
    : 'Maintenance task assigned';
  const details = `Priority: ${safeText(task.priority)}. Due: ${safeText(task.due_date, 'Not set')}.`;

  await enqueueNotification(connection, {
    type,
    taskId: task.id,
    machineId: task.machine_id,
    technicianId: technician.id,
    email: technician.email,
    message: `${eventTitle}: ${taskLabel}. ${machineLabel}. ${details}`,
    deduplicationKey: notificationKey(eventKey, technician.id),
  });
}

async function enqueueReminder(connection, task, type, dateKey) {
  if (!task.technician_id) return;
  const [rows] = await connection.execute(
    `SELECT t.id, COALESCE(NULLIF(u.email, ''), NULLIF(t.email, '')) AS email
     FROM technicians t
     LEFT JOIN users u ON u.id = t.user_id
     WHERE t.id = ? LIMIT 1`,
    [task.technician_id]
  );
  if (!rows.length) return;

  const label = type === 'TASK_DUE_SOON'
    ? 'Maintenance task due soon'
    : type === 'TASK_DUE_TODAY'
      ? 'Maintenance task due today'
      : 'Maintenance task overdue';
  const machineLabel = task.machine_code
    ? `${task.machine_code} — ${safeText(task.machine_name)}`
    : 'Maintenance task';
  const dueText = task.due_date
    ? String(task.due_date instanceof Date ? task.due_date.toISOString() : task.due_date).replace('T', ' ').slice(0, 16)
    : 'Not set';

  await enqueueNotification(connection, {
    type,
    taskId: task.id,
    machineId: task.machine_id,
    technicianId: task.technician_id,
    email: rows[0].email,
    message: `${label}: ${task.title} (#${task.id}). ${machineLabel}. Due: ${dueText}.`,
    deduplicationKey: `task:${task.id}:${type.toLowerCase()}:${dateKey}`.slice(0, 191),
  });
}

function subjectForType(type) {
  const subjects = {
    MACHINE_BREAKDOWN: '[SPA EL FATH] Machine breakdown alert',
    TASK_ASSIGNED: '[SPA EL FATH] New maintenance task assigned',
    TASK_REASSIGNED: '[SPA EL FATH] Maintenance task reassigned',
    TASK_DUE_SOON: '[SPA EL FATH] Maintenance task due soon',
    TASK_DUE_TODAY: '[SPA EL FATH] Maintenance task due today',
    TASK_OVERDUE: '[SPA EL FATH] Maintenance task overdue',
  };
  return subjects[type] || '[SPA EL FATH] Maintenance notification';
}

async function processQueue() {
  if (workerBusy) return;
  workerBusy = true;
  let connection;

  try {
    // Keep notifications queued until an administrator connects the institutional Gmail sender.
    if (!(await hasSystemGmailConnection())) return;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE maintenance_notifications
       SET status = 'PENDING', scheduled_at = NOW(),
           error_message = 'Recovered after an interrupted email send attempt.'
       WHERE status = 'PROCESSING'
         AND updated_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
    );

    const [jobs] = await connection.execute(
      `SELECT * FROM maintenance_notifications
       WHERE status IN ('PENDING', 'FAILED')
         AND (scheduled_at IS NULL OR scheduled_at <= NOW())
         AND attempts < ?
       ORDER BY id ASC
       LIMIT 10
       FOR UPDATE SKIP LOCKED`,
      [MAX_ATTEMPTS]
    );

    if (jobs.length) {
      const ids = jobs.map(job => job.id);
      await connection.query(
        `UPDATE maintenance_notifications
         SET status = 'PROCESSING', attempts = attempts + 1
         WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
    }
    await connection.commit();

    for (const job of jobs) {
      try {
        const email = validEmail(job.recipient_email);
        if (!email) {
          await pool.execute(
            `UPDATE maintenance_notifications
             SET status = 'SKIPPED', error_message = ?,
                 scheduled_at = NULL
             WHERE id = ? AND status = 'PROCESSING'`,
            ['Recipient email address is missing or invalid.', job.id]
          );
          continue;
        }

        const result = await sendNotificationEmail({
          to: email,
          subject: subjectForType(job.notification_type),
          text: [
            'SPA EL FATH CMMS',
            'Industrial Maintenance Notification',
            '',
            job.message,
            '',
            'This is an automatic notification. Please open the CMMS application for details.',
          ].join('\n'),
        });

        await pool.execute(
          `UPDATE maintenance_notifications
           SET status = 'SENT', provider_message_id = ?,
               provider_status = 'GMAIL_SENT',
               provider_status_at = NOW(),
               error_message = NULL, sent_at = NOW(),
               scheduled_at = NULL
           WHERE id = ?`,
          [result.messageId, job.id]
        );
      } catch (error) {
        const retry = Number(job.attempts) + 1 < MAX_ATTEMPTS;
        const retryAt = retry
          ? new Date(Date.now() + RETRY_DELAY_MINUTES * 60 * 1000)
          : null;
        await pool.execute(
          `UPDATE maintenance_notifications
           SET status = 'FAILED', error_message = ?,
               scheduled_at = ?, provider_status = 'GMAIL_FAILED',
               provider_status_at = NOW()
           WHERE id = ?`,
          [String(error.message || 'Gmail send failed').slice(0, 2000), retryAt, job.id]
        );
        console.error(`Email notification ${job.id} failed:`, error.message);
      }
    }
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    console.error('Email notification queue failed:', error.message);
  } finally {
    if (connection) connection.release();
    workerBusy = false;
  }
}

async function scheduleDueReminders() {
  if (remindersBusy) return;
  remindersBusy = true;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [soonRows] = await connection.execute(
      `SELECT t.id, t.title, t.machine_id, t.technician_id, t.priority, t.due_date,
              m.code AS machine_code, m.name AS machine_name
       FROM maintenance_tasks t
       LEFT JOIN machines m ON m.id = t.machine_id
       WHERE t.status IN ('PENDING', 'IN_PROGRESS')
         AND t.technician_id IS NOT NULL
         AND t.due_date > NOW()
         AND DATE(t.due_date) > CURDATE()
         AND t.due_date <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
       LIMIT 500`
    );
    const [todayRows] = await connection.execute(
      `SELECT t.id, t.title, t.machine_id, t.technician_id, t.priority, t.due_date,
              m.code AS machine_code, m.name AS machine_name
       FROM maintenance_tasks t
       LEFT JOIN machines m ON m.id = t.machine_id
       WHERE t.status IN ('PENDING', 'IN_PROGRESS')
         AND t.technician_id IS NOT NULL
         AND DATE(t.due_date) = CURDATE()
       LIMIT 500`
    );
    const [overdueRows] = await connection.execute(
      `SELECT t.id, t.title, t.machine_id, t.technician_id, t.priority, t.due_date,
              m.code AS machine_code, m.name AS machine_name
       FROM maintenance_tasks t
       LEFT JOIN machines m ON m.id = t.machine_id
       WHERE t.status IN ('PENDING', 'IN_PROGRESS')
         AND t.technician_id IS NOT NULL
         AND t.due_date < CURDATE()
       LIMIT 500`
    );
    const [dateRows] = await connection.query(
      "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS date_key"
    );
    const dateKey = dateRows[0].date_key;

    for (const task of soonRows) await enqueueReminder(connection, task, 'TASK_DUE_SOON', dateKey);
    for (const task of todayRows) await enqueueReminder(connection, task, 'TASK_DUE_TODAY', dateKey);
    for (const task of overdueRows) await enqueueReminder(connection, task, 'TASK_OVERDUE', dateKey);

    await connection.commit();
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    console.error('Could not schedule maintenance email reminders:', error.message);
  } finally {
    if (connection) connection.release();
    remindersBusy = false;
  }
}

function startNotificationWorkers() {
  if (workerStarted) return;
  workerStarted = true;
  const safeRun = fn => fn().catch(error => console.error('Email notification worker error:', error.message));
  safeRun(processQueue);
  safeRun(scheduleDueReminders);
  setInterval(() => safeRun(processQueue), POLL_INTERVAL_MS).unref();
  setInterval(() => safeRun(scheduleDueReminders), REMINDER_INTERVAL_MS).unref();
}

async function enqueueBreakdownEvent(machine, eventKey) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await enqueueBreakdown(connection, machine, eventKey || crypto.randomUUID());
    await connection.commit();
  } catch (error) {
    try { await connection.rollback(); } catch {}
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  enqueueBreakdown,
  enqueueBreakdownEvent,
  enqueueTaskNotification,
  startNotificationWorkers,
};
