const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const quoteIdentifier = value => `\`${String(value).replace(/`/g, '``')}\``;
const normalize = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function resolveColumns(fields) {
  const normalized = fields.map(normalize);
  const find = predicate => {
    const index = normalized.findIndex(predicate);
    return index >= 0 ? fields[index] : null;
  };

  const columns = {
    date: find(value => value === 'date'),
    machineId: find(value => value === 'id machine'),
    machineName: find(value => value === 'machine auto'),
    workshop: find(value => value === 'atelier auto'),
    cause: find(value => value === 'cause racine'),
    duration: find(value => value.startsWith('dure')),
    technician: find(value => value === 'technicien' || value === 'technician'),
  };

  // The supplied schema defines these fields in this order. Positional fallback
  // is used only after the first five identifying columns confirm that layout.
  const expectedPrefix = ['date', 'heure', 'id machine', 'machine auto', 'atelier auto'];
  const prefixMatches = expectedPrefix.every((value, index) => normalized[index] === value);
  if (prefixMatches && fields.length >= 13) {
    const positions = { date: 0, machineId: 2, machineName: 3, workshop: 4, cause: 8, technician: 10, duration: 11 };
    for (const [key, index] of Object.entries(positions)) {
      if (!columns[key]) columns[key] = fields[index];
    }
  }

  const missing = Object.entries(columns).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`The interventions table is missing expected columns: ${missing.join(', ')}.`);
  return Object.fromEntries(Object.entries(columns).map(([key, value]) => [key, quoteIdentifier(value)]));
}

router.get('/dashboard', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Administrator access required.' });
  }

  try {
    const [tableRows] = await pool.query("SHOW TABLES LIKE 'interventions'");
    if (!tableRows.length) {
      return res.status(404).json({ success: false, message: 'The interventions table was not found.' });
    }

    const [columnRows] = await pool.query('SHOW COLUMNS FROM `interventions`');
    const c = resolveColumns(columnRows.map(row => row.Field));
    const durationValue = `CASE WHEN TRIM(${c.duration}) REGEXP '^[0-9]+([.,][0-9]+)?$' THEN CAST(REPLACE(TRIM(${c.duration}), ',', '.') AS DECIMAL(12,2)) ELSE NULL END`;
    const category = column => `COALESCE(NULLIF(TRIM(${column}), ''), 'Non renseigné')`;
    const machineLabel = `COALESCE(NULLIF(TRIM(${c.machineName}), ''), NULLIF(TRIM(${c.machineId}), ''), 'Non renseignée')`;
    const parsedDate = `COALESCE(
      STR_TO_DATE(NULLIF(TRIM(${c.date}), ''), '%d/%m/%Y'),
      STR_TO_DATE(NULLIF(TRIM(${c.date}), ''), '%Y-%m-%d'),
      STR_TO_DATE(NULLIF(TRIM(${c.date}), ''), '%d-%m-%Y'),
      STR_TO_DATE(NULLIF(TRIM(${c.date}), ''), '%m/%d/%Y'),
      STR_TO_DATE(NULLIF(TRIM(${c.date}), ''), '%d/%m/%y')
    )`;

    const [[summary]] = await pool.query(
      `SELECT COUNT(*) AS total,
        SUM(${durationValue} IS NOT NULL) AS duration_records,
        COALESCE(SUM(${durationValue}), 0) AS total_duration_minutes,
        AVG(${durationValue}) AS average_duration_minutes
       FROM interventions`
    );
    const [causes] = await pool.query(
      `SELECT ${category(c.cause)} AS label, COUNT(*) AS count
       FROM interventions GROUP BY label ORDER BY count DESC LIMIT 8`
    );
    const [machines] = await pool.query(
      `SELECT ${machineLabel} AS label, COUNT(*) AS count
       FROM interventions GROUP BY label ORDER BY count DESC LIMIT 8`
    );
    const [workshops] = await pool.query(
      `SELECT ${category(c.workshop)} AS label, COUNT(*) AS count
       FROM interventions GROUP BY label ORDER BY count DESC LIMIT 8`
    );
    const [technicians] = await pool.query(
      `SELECT ${category(c.technician)} AS label, COUNT(*) AS count
       FROM interventions
       WHERE NULLIF(TRIM(${c.technician}), '') IS NOT NULL
       GROUP BY label ORDER BY count DESC LIMIT 5`
    );
    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(${parsedDate}, '%Y-%m') AS month, COUNT(*) AS count
       FROM interventions WHERE ${parsedDate} IS NOT NULL
       GROUP BY month ORDER BY month DESC LIMIT 36`
    );

    const number = value => value == null ? 0 : Number(value);
    return res.json({
      success: true,
      data: {
        summary: {
          total: number(summary.total),
          durationRecords: number(summary.duration_records),
          totalDurationMinutes: number(summary.total_duration_minutes),
          averageDurationMinutes: summary.average_duration_minutes == null ? null : number(summary.average_duration_minutes),
        },
        causes: causes.map(row => ({ label: row.label, count: number(row.count) })),
        machines: machines.map(row => ({ label: row.label, count: number(row.count) })),
        workshops: workshops.map(row => ({ label: row.label, count: number(row.count) })),
        technicians: technicians.map(row => ({ label: row.label, count: number(row.count) })),
        monthly: monthly.map(row => ({ month: row.month, count: number(row.count) })).reverse(),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Could not calculate historical intervention dashboard analytics:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load historical intervention analytics. Verify the interventions table schema.' });
  }
});

module.exports = router;
