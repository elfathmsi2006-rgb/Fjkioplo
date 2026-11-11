const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
const userId = req => Number(req.user?.sub);
router.get('/preferences', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT language,theme,accent,density,alert_preferences FROM user_preferences WHERE user_id=? LIMIT 1', [userId(req)]);
    const row = rows[0] || { language: 'ar', theme: 'system', accent: 'blue', density: 'comfortable', alert_preferences: { inApp: true, email: false, maintenanceDue: true, urgentWork: true, lowStock: true, safetyFailure: true } };
    if (typeof row.alert_preferences === 'string') { try { row.alert_preferences = JSON.parse(row.alert_preferences); } catch { row.alert_preferences = {}; } }
    return res.json({ success: true, data: row });
  } catch (error) { console.error('Read preferences failed:', error.message); return res.status(500).json({ success: false, message: 'Could not load preferences. Apply the Operations Hub migration.' }); }
});
router.put('/preferences', async (req, res) => {
  const b=req.body||{};
  const allowed={language:['ar','fr','en'],theme:['light','dark','system'],accent:['blue','teal','violet','amber'],density:['comfortable','compact']};
  for (const [key, values] of Object.entries(allowed)) if (b[key]!==undefined && !values.includes(b[key])) return res.status(400).json({success:false,message:`Invalid ${key}.`});
  const defaults={inApp:true,email:false,maintenanceDue:true,urgentWork:true,lowStock:true,safetyFailure:true};
  const alerts=b.alertPreferences===undefined?defaults:b.alertPreferences;
  if (!alerts || typeof alerts!=='object' || Array.isArray(alerts) || Object.values(alerts).some(v=>typeof v!=='boolean')) return res.status(400).json({success:false,message:'Invalid alert preferences.'});
  try {
    await db.execute(`INSERT INTO user_preferences (user_id,language,theme,accent,density,alert_preferences)
      VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE language=VALUES(language),theme=VALUES(theme),accent=VALUES(accent),density=VALUES(density),alert_preferences=VALUES(alert_preferences)`,
      [userId(req),b.language||'ar',b.theme||'system',b.accent||'blue',b.density||'comfortable',JSON.stringify(alerts)]);
    return res.json({success:true,message:'Preferences saved.'});
  } catch(error) { console.error('Save preferences failed:',error.message); return res.status(500).json({success:false,message:'Could not save preferences. Apply the Operations Hub migration.'}); }
});
module.exports = router;
