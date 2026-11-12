
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;

const machinesRouter = require('./routes/machines');
const workshopsRouter = require('./routes/workshops');
const communicationsRouter = require('./routes/communications');
const usersRouter = require('./routes/users');
const tasksRouter = require('./routes/tasks');
const { startNotificationWorkers } = require('./services/maintenanceNotifications');
const { startExportScheduler, stopExportScheduler } = require('./services/maintenanceExportScheduler');
const techniciansRouter = require('./routes/technicians');
const machineFeaturesRouter = require('./routes/machineFeatures');
const maintenanceLogsRouter = require('./routes/maintenanceLogs');
const operationsRouter = require('./routes/operations');
const maintenanceSuiteRouter = require('./routes/maintenanceSuite');
const interventionsRouter = require('./routes/interventions');
const copilotRouter = require('./routes/copilot');
const hiddenFailuresRouter = require('./routes/hiddenFailures');
const maintenanceExportRouter = require('./routes/maintenanceExport');
const settingsRouter = require('./routes/settings');
const { generateDuePreventiveTasks } = require('./services/preventiveScheduler');
const { generateResetToken, hashToken, expiresAt, buildResetUrl, isValidPassword } = require('./services/passwordReset');
const { isConfigured: gmailConfigured, hasSystemGmailConnection, sendNotificationEmail } = require('./services/gmailSender');

const SESSION_MAX_AGE_MS = 60 * 60 * 1000;
const ROLE_NAMES = {
  1: 'admin',
  2: 'production_chief',
  3: 'maintenance_worker',
  4: 'workshop_head',
};

async function readTokenVersion(userId) {
  try {
    const [rows] = await pool.execute('SELECT token_version FROM users WHERE id = ? LIMIT 1', [userId]);
    return rows.length ? Number(rows[0].token_version || 0) : 0;
  } catch (error) {
    if (error.code === 'ER_BAD_FIELD_ERROR') return 0;
    throw error;
  }
}

async function bumpTokenVersion(connection, userId) {
  try {
    await connection.execute('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [userId]);
    const [rows] = await connection.execute('SELECT token_version FROM users WHERE id = ? LIMIT 1', [userId]);
    return Number(rows[0]?.token_version || 0);
  } catch (error) {
    if (error.code !== 'ER_BAD_FIELD_ERROR') throw error;
    // Migration not applied yet: password updates still work, but the version
    // based invalidation is unavailable until 202611110001 is applied.
    return 0;
  }
}

function parseCookies(header) {
  return Object.fromEntries(String(header || '').split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return index < 0 ? [part, ''] : [part.slice(0, index), part.slice(index + 1)];
  }));
}

function readSessionPayload(req) {
  const authorization = req.headers.authorization || '';
  const [scheme, bearerToken] = authorization.split(' ');
  const token = parseCookies(req.headers.cookie).elfath_session || (scheme === 'Bearer' ? bearerToken : null);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: 'spa-el-fath-api', audience: 'spa-el-fath-frontend' });
  } catch {
    return null;
  }
}

// Revocation is best-effort when the Phase 2 migration is not installed yet;
// token_version still invalidates sessions after password changes.
async function revokeSession(payload, reason) {
  if (!payload?.jti) return;
  const userId = Number(payload.sub);
  const expiresAt = new Date(Number(payload.exp || 0) * 1000 || Date.now() + SESSION_MAX_AGE_MS);
  try {
    await pool.execute(
      'INSERT INTO revoked_sessions (jti, user_id, expires_at, reason) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE reason = VALUES(reason)',
      [String(payload.jti).slice(0, 36), userId, expiresAt, String(reason).slice(0, 40)]
    );
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') console.error('Could not revoke session:', error.message);
  }
}

function setSessionCookie(res, token) {
  res.cookie('elfath_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api', maxAge: SESSION_MAX_AGE_MS });
}

function signSession(userId, roleId, roleName, tokenVersion) {
  return jwt.sign(
    { role: roleName, roleId: Number(roleId), tv: Number(tokenVersion || 0) },
    JWT_SECRET,
    {
      subject: String(userId),
      expiresIn: '1h',
      issuer: 'spa-el-fath-api',
      audience: 'spa-el-fath-frontend',
      jwtid: crypto.randomUUID(),
    }
  );
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({
  limit: '1mb',
  verify: (req, res, buffer) => { req.rawBody = Buffer.from(buffer); },
}));
app.use('/api/machines', machinesRouter);
app.use('/api/machines', machineFeaturesRouter);
app.use('/api/maintenance-logs', maintenanceLogsRouter);
app.use('/api/workshops', workshopsRouter);
app.use('/api/communications', communicationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/technicians', techniciansRouter);
app.use('/api/operations', operationsRouter);
app.use('/api/maintenance-suite', maintenanceSuiteRouter);
app.use('/api/interventions', interventionsRouter);
app.use('/api/copilot', copilotRouter);
app.use('/api/hidden-failures', hiddenFailuresRouter);
app.use('/api/maintenance', maintenanceExportRouter);
// Alias: the frontend calls the export module under /api/maintenance/export/*.
// The router above exposes the same routes at the root of /api/maintenance, so mount it
// a second time under /export to keep both path shapes working.
app.use('/api/maintenance/export', maintenanceExportRouter);
app.use('/api/settings', settingsRouter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SPA El Fath backend is running.',
  });
});

app.get('/api/health/database', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    try {
      await connection.ping();

      res.json({
        success: true,
        message: 'MySQL connection successful.',
        database: process.env.DB_NAME,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database connection failed:', error.message);

    res.status(500).json({
      success: false,
      message: 'Could not connect to the database.',
    });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    if (!JWT_SECRET || JWT_SECRET.length < 32) {
      console.error('JWT_SECRET is missing or too short.');

      return res.status(500).json({
        success: false,
        message: 'Authentication is not configured.',
      });
    }

    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';

    const password =
      typeof req.body?.password === 'string'
        ? req.body.password
        : '';

    if (
      !email ||
      email.length > 254 ||
      !password ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email and password.',
      });
    }

    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.password_hash,
         u.role_id,
         u.active,
         CASE
          WHEN r.id = 1 THEN 'admin'
          WHEN r.id = 2 THEN 'production_chief'
          WHEN r.id = 3 THEN 'maintenance_worker'
          WHEN r.id = 4 THEN 'workshop_head'
          ELSE NULL
        END AS role_name
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.email = ?
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches || !user.active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const tokenVersion = await readTokenVersion(user.id);
    const token = signSession(user.id, user.role_id, user.role_name, tokenVersion);

    res.cookie('elfath_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api', maxAge: 60 * 60 * 1000 });
    return res.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: String(user.id),
        full_name: user.full_name,
        email: user.email,
        role: user.role_name,
        
      },
    });
  } catch (error) {
    console.error('Login request failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during login.',
    });
  }
});


const requireAuth = require('./middleware/auth');
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const [rows] = await pool.execute(`SELECT u.id,u.full_name,u.email,u.role_id,u.active,
      CASE WHEN u.role_id=1 THEN 'admin' WHEN u.role_id=2 THEN 'production_chief' WHEN u.role_id=3 THEN 'maintenance_worker' WHEN u.role_id=4 THEN 'workshop_head' ELSE NULL END AS role
      FROM users u WHERE u.id=? LIMIT 1`, [userId]);
    if (!rows.length || !rows[0].active || !rows[0].role) return res.status(401).json({ success: false, message: 'Session is no longer valid.' });
    const user = rows[0];
    return res.json({ success: true, user: { id: String(user.id), full_name: user.full_name, email: user.email, role: user.role, roleId: Number(user.role_id) } });
  } catch (error) { console.error('Session validation failed:', error.message); return res.status(500).json({ success: false, message: 'Could not validate session.' }); }
});
app.post('/api/auth/logout', async (req, res) => {
  // Session logout is idempotent: without a valid token it still clears the cookie.
  const payload = readSessionPayload(req);
  if (payload?.jti) await revokeSession(payload, 'logout');
  res.clearCookie('elfath_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api' });
  return res.json({ success: true, message: 'Logged out.' });
});

// Invalidates every session for the account, including sessions on other devices.
app.post('/api/auth/logout-all', requireAuth, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await bumpTokenVersion(connection, Number(req.user.sub));
    try {
      await connection.execute('DELETE FROM revoked_sessions WHERE user_id = ?', [Number(req.user.sub)]);
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
    }
    await connection.commit();
    res.clearCookie('elfath_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api' });
    return res.json({ success: true, message: 'All sessions have been signed out.' });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Logout-all failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not sign out all sessions.' });
  } finally {
    if (connection) connection.release();
  }
});

// Sliding one-hour session: the frontend refreshes periodically while active.
// The previous token is revoked so a copied token cannot outlive the refresh.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many session refresh attempts.' },
});

app.post('/api/auth/refresh', requireAuth, refreshLimiter, async (req, res) => {
  try {
    if (req.user.jti) await revokeSession(req.user, 'refresh');
    const token = signSession(req.user.sub, req.user.roleId, req.user.role, req.user.tv);
    setSessionCookie(res, token);
    return res.json({ success: true, message: 'Session refreshed.' });
  } catch (error) {
    console.error('Session refresh failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not refresh the session.' });
  }
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many password attempts. Please try again later.' },
});

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset requests. Please try again later.' },
});

const GENERIC_RESET_MESSAGE = 'If the email is registered, a password reset link has been generated. Check your inbox or contact your administrator.';

async function emailDeliveryReady() {
  try {
    return Boolean(gmailConfigured() && await hasSystemGmailConnection());
  } catch {
    return false;
  }
}

// Authenticated password change. Requires the current password and rotates the
// session version so every other issued session becomes invalid.
app.post('/api/auth/change-password', requireAuth, sensitiveLimiter, async (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!currentPassword || !isValidPassword(newPassword)) {
    return res.status(400).json({ success: false, message: 'Provide the current password and a new password of at least 12 characters (max 72 bytes).' });
  }

  let connection;
  try {
    const [rows] = await pool.execute('SELECT id, password_hash, role_id, full_name, email FROM users WHERE id = ? LIMIT 1', [Number(req.user.sub)]);
    const user = rows[0];
    if (!user) return res.status(401).json({ success: false, message: 'Session is no longer valid.' });

    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) return res.status(400).json({ success: false, message: 'The current password is incorrect.' });

    const reused = await bcrypt.compare(newPassword, user.password_hash);
    if (reused) return res.status(400).json({ success: false, message: 'The new password must be different from the current password.' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
    const tokenVersion = await bumpTokenVersion(connection, user.id);
    await connection.execute(
      'INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,NULL,?)',
      ['users', String(user.id), 'UPDATE', Number(user.id), JSON.stringify({ event: 'PASSWORD_CHANGE', changed_at: new Date().toISOString() })]
    );
    await connection.commit();

    const role = ROLE_NAMES[Number(user.role_id)];
    if (role) setSessionCookie(res, signSession(user.id, user.role_id, role, tokenVersion));
    return res.json({ success: true, message: 'Password updated. Other sessions have been signed out.' });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Password change failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not update the password.' });
  } finally {
    if (connection) connection.release();
  }
});

// Public, enumeration-safe reset request. A token is only created for an active
// account, but the response is identical for unknown addresses.
app.post('/api/auth/forgot-password', forgotLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const deliveryReady = await emailDeliveryReady();

  try {
    if (email && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const [users] = await pool.execute('SELECT id, full_name, email FROM users WHERE email = ? AND active = 1 LIMIT 1', [email]);
      if (users.length) {
        const user = users[0];
        const { token, tokenHash } = generateResetToken();
        const expires = expiresAt();
        let stored = false;
        try {
          await pool.execute(
            'DELETE FROM password_reset_tokens WHERE user_id = ? AND (used_at IS NOT NULL OR expires_at < NOW())',
            [user.id]
          );
          await pool.execute(
            'INSERT INTO password_reset_tokens (user_id,token_hash,expires_at,request_ip) VALUES (?,?,?,?)',
            [user.id, tokenHash, expires, String(req.ip || '').slice(0, 64)]
          );
          stored = true;
        } catch (error) {
          if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
          console.warn('Password reset table is missing. Apply SQL migration 202611110001_phase1_core_fixes.sql (no token was delivered).');
        }

        const resetUrl = buildResetUrl(process.env.FRONTEND_URL, token);
        if (stored && deliveryReady) {
          // Fire-and-forget keeps the response timing independent of whether
          // the address exists, avoiding an account-enumeration side channel.
          void sendNotificationEmail({
            to: user.email,
            subject: 'SPA El Fath CMMS — password reset',
            text: `Hello ${user.full_name || ''},\n\nA password reset was requested for your account. This link expires in 30 minutes and can be used once:\n\n${resetUrl}\n\nIf you did not request this, ignore this message.`,
          }).catch(error => console.error('Password reset email delivery failed:', error.message));
        } else if (stored) {
          console.warn('Password reset requested but no institutional Gmail sender is configured. No email was sent. Use scripts/issue-password-reset.js to deliver a link securely.');
        }
      }
    }
  } catch (error) {
    console.error('Password reset request failed:', error.message);
  }

  // Equalise obvious timing differences between known and unknown accounts.
  await new Promise(resolve => setTimeout(resolve, 120));
  return res.json({ success: true, message: GENERIC_RESET_MESSAGE, deliveryReady });
});

// Single-use reset completion. The token is consumed and all sessions for the
// account are invalidated by rotating users.token_version.
app.post('/api/auth/reset-password', sensitiveLimiter, async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  const invalidMessage = 'This reset link is invalid or has expired. Request a new one.';

  if (!token || token.length > 200 || !isValidPassword(newPassword)) {
    return res.status(400).json({ success: false, message: 'Provide a valid reset token and a new password of at least 12 characters (max 72 bytes).' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT prt.id, prt.user_id, u.role_id
       FROM password_reset_tokens prt
       INNER JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = ? AND prt.used_at IS NULL AND prt.expires_at > NOW() AND u.active = 1
       LIMIT 1 FOR UPDATE`,
      [hashToken(token)]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: invalidMessage });
    }

    const record = rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, record.user_id]);
    await bumpTokenVersion(connection, record.user_id);
    await connection.execute('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [record.id]);
    await connection.execute('DELETE FROM password_reset_tokens WHERE user_id = ? AND id <> ?', [record.user_id, record.id]);
    await connection.execute(
      'INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,NULL,?)',
      ['users', String(record.user_id), 'UPDATE', null, JSON.stringify({ event: 'PASSWORD_RESET', reset_at: new Date().toISOString() })]
    );
    await connection.commit();
    return res.json({ success: true, message: 'Password reset. Sign in with your new password.' });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ success: false, message: 'Password reset is not configured. Apply the Phase 1 migration.' });
    }
    console.error('Password reset failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not reset the password.' });
  } finally {
    if (connection) connection.release();
  }
});


app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.type === 'entity.too.large' || error?.status === 413) {
    return res.status(413).json({ success: false, message: 'Request payload is too large.' });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ success: false, message: 'Invalid JSON request body.' });
  }
  return res.status(500).json({ success: false, message: 'Unexpected server error.' });
});

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    'Set JWT_SECRET in your backend .env to a random secret of at least 32 characters.'
  );
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(
    `SPA El Fath backend running at http://localhost:${PORT}`
  );
  startNotificationWorkers();
  startExportScheduler();
  // Phase 2 retention cleanup: expired revocation rows and expired/used reset
  // tokens have no value and must not grow unbounded.
  const runSecurityCleanup = async () => {
    try {
      const [revoked] = await pool.execute('DELETE FROM revoked_sessions WHERE expires_at < NOW()');
      if (revoked.affectedRows) console.log(`Removed ${revoked.affectedRows} expired session revocation row(s).`);
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') console.error('Session cleanup failed:', error.message);
    }
    try {
      const [tokens] = await pool.execute('DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL OR expires_at < NOW()');
      if (tokens.affectedRows) console.log(`Removed ${tokens.affectedRows} expired/used password reset token(s).`);
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') console.error('Password reset token cleanup failed:', error.message);
    }
  };
  void runSecurityCleanup();
  const securityCleanupTimer = setInterval(runSecurityCleanup, 60 * 60 * 1000);
  securityCleanupTimer.unref?.();

  // Enable periodic PM generation only when its additive migration is present.
  // This avoids repeated database errors on installations that have not applied it yet.
  void (async () => {
    try {
      await pool.execute('SELECT id FROM cmms_preventive_plans LIMIT 0');
      await pool.execute('SELECT id FROM cmms_pm_occurrences LIMIT 0');
      const runPreventiveScheduler = () => generateDuePreventiveTasks().catch(error => console.error('Preventive scheduler cycle failed:', error.message));
      await runPreventiveScheduler();
      const preventiveTimer = setInterval(runPreventiveScheduler, 15 * 60 * 1000);
      preventiveTimer.unref?.();
    } catch (error) {
      console.warn('Preventive scheduler not started: apply SQL migration 202611010001_maintenance_suite.sql and restart the backend.');
    }

    // Phase 3: periodically escalate overdue work orders.
    void (async () => {
      try {
        if (typeof tasksRouter.escalateOverdueTasks === 'function') {
          const runEscalation = () => tasksRouter.escalateOverdueTasks().then(count => {
            if (count) console.log(`Escalated ${count} overdue work order(s).`);
          }).catch(error => console.error('Work-order escalation cycle failed:', error.message));
          await runEscalation();
          const escalationTimer = setInterval(runEscalation, 15 * 60 * 1000);
          escalationTimer.unref?.();
        }
      } catch (error) {
        console.warn('Work-order escalation scheduler not started.');
      }
    })();
  })();
});

async function shutdown() {
  server.close(async () => {
    stopExportScheduler();
    try {
      await pool.end();
      process.exit(0);
    } catch (error) {
      console.error('Error closing database pool:', error.message);
      process.exit(1);
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
