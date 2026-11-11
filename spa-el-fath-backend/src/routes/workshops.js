const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

let workshopColumnsPromise;
async function getWorkshopColumns() {
  if (!workshopColumnsPromise) {
    workshopColumnsPromise = pool.query('SHOW COLUMNS FROM workshops')
      .then(([rows]) => new Set(rows.map(row => row.Field)))
      .catch(error => { workshopColumnsPromise = null; throw error; });
  }
  return workshopColumnsPromise;
}
function selectedColumn(columns, name) {
  return columns.has(name) ? `\`${name}\`` : `NULL AS \`${name}\``;
}
const EDIT_ROLES = new Set(['admin', 'production_chief', 'workshop_head']);
function normalizeText(value, field, max = 150, optional = true) {
  if (value === undefined || value === null) {
    if (optional) return null;
    throw new Error(`${field} is required.`);
  }
  const text = String(value).trim();
  if (!text && optional) return null;
  if (!text) throw new Error(`${field} is required.`);
  if (text.length > max) throw new Error(`${field} must be ${max} characters or fewer.`);
  return text;
}
function mapInput(body) {
  const managerPhone = normalizeText(body.managerPhone ?? body.manager_phone, 'Manager phone', 30);
  return {
    name: normalizeText(body.name, 'Workshop name', 50, false),
    name_fr: normalizeText(body.nameFr ?? body.name_fr, 'French name', 150, false),
    name_en: normalizeText(body.nameEn ?? body.name_en, 'English name', 150, false),
    manager: normalizeText(body.manager, 'Manager', 150),
    manager_phone: managerPhone,
    location: normalizeText(body.location, 'Location', 200),
  };
}

router.get('/', async (req, res) => {
  try {
    const columns = await getWorkshopColumns();
    const fields = ['name_fr', 'name_en', 'manager', 'manager_phone', 'location'];
    const select = fields.map(field => selectedColumn(columns, field)).join(', ');
    const [rows] = await pool.execute(`SELECT id, name, ${select} FROM workshops ORDER BY id ASC`);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Failed to fetch workshops:', error.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve workshops.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid workshop ID.' });
    const columns = await getWorkshopColumns();
    const select = ['name_fr', 'name_en', 'manager', 'manager_phone', 'location'].map(field => selectedColumn(columns, field)).join(', ');
    const [rows] = await pool.execute(`SELECT id, name, ${select} FROM workshops WHERE id = ? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Workshop not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Failed to fetch workshop:', error.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve workshop.' });
  }
});

router.put('/:id', async (req, res) => {
  if (!EDIT_ROLES.has(req.user?.role)) return res.status(403).json({ success: false, message: 'You do not have permission to modify workshops.' });
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid workshop ID.' });
  let connection;
  try {
    const columns = await getWorkshopColumns();
    const required = ['name_fr', 'name_en', 'manager', 'manager_phone', 'location'];
    if (!required.every(column => columns.has(column))) {
      return res.status(503).json({ success: false, message: 'Workshop detail columns are missing. Apply sql/202611040001_workshop_details.sql after backing up the database.' });
    }
    const input = mapInput(req.body || {});
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [oldRows] = await connection.execute('SELECT id, name, name_fr, name_en, manager, manager_phone, location FROM workshops WHERE id = ? FOR UPDATE', [id]);
    if (!oldRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Workshop not found.' });
    }
    await connection.execute(
      'UPDATE workshops SET name = ?, name_fr = ?, name_en = ?, manager = ?, manager_phone = ?, location = ? WHERE id = ?',
      [input.name, input.name_fr, input.name_en, input.manager, input.manager_phone, input.location, id]
    );
    const [rows] = await connection.execute('SELECT id, name, name_fr, name_en, manager, manager_phone, location FROM workshops WHERE id = ? LIMIT 1', [id]);
    const actorId = Number(req.user?.sub);
    await connection.execute(
      'INSERT INTO audit_trail (table_name, record_id, action, actor_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
      ['workshops', String(id), 'UPDATE', Number.isSafeInteger(actorId) && actorId > 0 ? actorId : null, JSON.stringify(oldRows[0]), JSON.stringify(rows[0])]
    );
    await connection.commit();
    return res.json({ success: true, message: 'Workshop updated successfully.', data: rows[0] });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    const clientError = /required|characters or fewer/.test(error.message);
    if (!clientError) console.error('Failed to update workshop:', error.message);
    return res.status(clientError ? 400 : 500).json({ success: false, message: clientError ? error.message : 'Could not update workshop.' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
