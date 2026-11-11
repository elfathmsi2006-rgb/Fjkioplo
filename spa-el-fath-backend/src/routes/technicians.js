
const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth');
const db = require('../db');

const ALLOWED_ROLES = [
  'admin',
  'production_chief',
  'workshop_head',
  'maintenance_worker',
];

router.get('/', requireAuth, async (req, res) => {
  try {
    const role =
      req.user.role ||
      req.user.role_name ||
      req.user.roleName;

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view technicians.',
      });
    }

    const sql = `
      SELECT
        t.id AS id,
        t.user_id AS userId,
        u.full_name AS name,
        u.email AS email,
        t.phone AS phone, t.skill AS skill, t.shift_name AS shift,
        t.attendance_status AS attendance, t.active AS active,
        t.availability_status AS availabilityStatus
      FROM technicians t
      INNER JOIN users u ON u.id = t.user_id
      ORDER BY u.full_name ASC
    `;

    const [technicians] = await db.execute(sql);

    return res.json({
      success: true,
      technicians,
    });
  } catch (error) {
    console.error('Get technicians error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve technicians.',
    });
  }
});


router.put('/:id', requireAuth, async (req, res) => {
  const roleId = Number(req.user?.roleId);
  if (![1, 2].includes(roleId)) return res.status(403).json({ success: false, message: 'Only role ID 1 or 2 may edit technician profiles.' });
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid technician ID.' });
  const body = req.body || {};
  const optionalText = (value, max) => value == null || value === '' ? null : (typeof value === 'string' && value.trim().length <= max ? value.trim() : undefined);
  const phone = optionalText(body.phone, 30), skill = optionalText(body.skill, 160), shift = optionalText(body.shift, 80);
  const attendance = body.attendance === undefined ? undefined : String(body.attendance).toLowerCase();
  const active = body.active === undefined ? undefined : (body.active === true || body.active === 1 || body.active === '1' ? 1 : body.active === false || body.active === 0 || body.active === '0' ? 0 : null);
  if (phone === undefined || skill === undefined || shift === undefined || (attendance !== undefined && !['present','absent'].includes(attendance)) || active === null) return res.status(400).json({ success: false, message: 'Invalid technician profile fields.' });
  let connection;
  try {
    connection = await db.getConnection(); await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT * FROM technicians WHERE id=? FOR UPDATE', [id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Technician not found.' }); }
    const old = rows[0];
    const next = { phone: body.phone === undefined ? old.phone : phone, skill: body.skill === undefined ? old.skill : skill, shift_name: body.shift === undefined ? old.shift_name : shift, attendance_status: attendance === undefined ? old.attendance_status : attendance, active: active === undefined ? old.active : active };
    await connection.execute('UPDATE technicians SET phone=?,skill=?,shift_name=?,attendance_status=?,active=? WHERE id=?', [next.phone, next.skill, next.shift_name, next.attendance_status, next.active, id]);
    await connection.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,?,?)', ['technicians', String(id), 'UPDATE', Number(req.user.sub), JSON.stringify(old), JSON.stringify(next)]);
    await connection.commit();
    return res.json({ success: true, data: { id, phone: next.phone, skill: next.skill, shift: next.shift_name, attendance: next.attendance_status, active: next.active } });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Update technician profile error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update technician profile.' });
  } finally { if (connection) connection.release(); }
});

module.exports = router;
