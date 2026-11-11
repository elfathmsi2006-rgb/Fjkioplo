const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const ROLE_NAMES = {
  1: 'admin',
  2: 'production_chief',
  3: 'maintenance_worker',
  4: 'workshop_head',
};

// Only administrators may manage user accounts.
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required.',
    });
  }

  next();
}

// List registered users.
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.role_id,
         u.active
       FROM users u
       ORDER BY u.id DESC`
    );

    return res.json({
      success: true,
      data: rows.map((user) => ({
        id: String(user.id),
        full_name: user.full_name,
        email: user.email,
        role: ROLE_NAMES[Number(user.role_id)] || null,
        active: Boolean(user.active),
      })),
    });
  } catch (error) {
    console.error('List users failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Could not load user accounts.',
    });
  }
});

// Create a user with the Workshop Chief role (role_id = 4).
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const roleId = req.body?.roleId === undefined ? 4 : Number(req.body.roleId);
  if (!fullName || fullName.length > 150 || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72 || ![3, 4].includes(roleId)) {
    return res.status(400).json({ success: false, message: 'Provide a valid name, email, password of at least 12 characters, and account role (technician or workshop chief).' });
  }
  let connection;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    connection = await pool.getConnection(); await connection.beginTransaction();
    const [result] = await connection.execute('INSERT INTO users (full_name,email,password_hash,role_id) VALUES (?,?,?,?)', [fullName,email,passwordHash,roleId]);
    // The users trigger may also create the technician row, so this is
    // an idempotent upsert instead of a duplicate insert that would abort the transaction.
    if (roleId === 3) await connection.execute('INSERT INTO technicians (user_id,name,email) VALUES (?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),email=VALUES(email)', [result.insertId,fullName,email]);
    await connection.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,NULL,?)', ['users',String(result.insertId),'INSERT',Number(req.user.sub),JSON.stringify({full_name:fullName,email,role_id:roleId})]);
    await connection.commit();
    return res.status(201).json({ success:true, message:'Account created successfully.', user:{ id:String(result.insertId),full_name:fullName,email,role:roleId===3?'maintenance_worker':'workshop_head',active:true } });
  } catch (error) {
    if(connection) await connection.rollback().catch(()=>{});
    if(error.code==='ER_DUP_ENTRY') return res.status(409).json({success:false,message:'An account with this email already exists.'});
    console.error('Create user failed:',error.message);
    return res.status(500).json({success:false,message:'Could not create the user account.'});
  } finally { if(connection) connection.release(); }
});


module.exports = router;