const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;
const ROLE_NAMES = {
  1: 'admin',
  2: 'production_chief',
  3: 'maintenance_worker',
  4: 'workshop_head',
};

// Older databases may not have users.token_version until the Phase 1 migration
// is applied. Detect that once and keep authentication working meanwhile.
let tokenVersionSupported = true;
// revoked_sessions is created by the Phase 2 migration. Until it exists the
// token_version check still invalidates sessions after password changes.
let revocationSupported = true;

// The browser sends an Origin header on every state-changing request. The configured
// FRONTEND_URL is the trusted origin, but the very same application opened through
// 127.0.0.1 or [::1] instead of localhost is the same trust domain, so those
// equivalents are accepted as well. Without this a browser that opens the app on
// 127.0.0.1 can read everything but silently fails to save anything, which looks
// like a broken feature rather than a rejected origin.
function allowedOrigins() {
  const configured = String(process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const origins = new Set(configured);
  for (const origin of configured) {
    let url;
    try { url = new URL(origin); } catch { continue; }
    const equivalents = ['localhost', '127.0.0.1', '[::1]'];
    for (const host of equivalents) {
      origins.add(`${url.protocol}//${host}${url.port ? `:${url.port}` : ''}`);
    }
  }
  return origins;
}

async function isRevoked(jti) {
  if (!jti || !revocationSupported) return false;
  try {
    const [rows] = await pool.execute(
      'SELECT 1 FROM revoked_sessions WHERE jti = ? LIMIT 1',
      [jti]
    );
    return rows.length > 0;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      revocationSupported = false;
      return false;
    }
    throw error;
  }
}

async function loadUser(userId) {
  if (tokenVersionSupported) {
    try {
      const [rows] = await pool.execute(
        'SELECT id, role_id, active, token_version FROM users WHERE id = ? LIMIT 1',
        [userId]
      );
      return rows[0]
        ? { ...rows[0], tokenVersion: Number(rows[0].token_version || 0) }
        : null;
    } catch (error) {
      if (error.code !== 'ER_BAD_FIELD_ERROR') throw error;
      tokenVersionSupported = false;
    }
  }

  const [rows] = await pool.execute(
    'SELECT id, role_id, active FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0] ? { ...rows[0], tokenVersion: 0 } : null;
}

async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, bearerToken] = authorization.split(' ');
  const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map(part => part.trim()).filter(Boolean).map(part => { const index = part.indexOf('='); return index < 0 ? [part, ''] : [part.slice(0, index), part.slice(index + 1)]; }));
  const token = cookies.elfath_session || (scheme === 'Bearer' ? bearerToken : null);

  if (cookies.elfath_session && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const requestOrigin = req.headers.origin;
    if (requestOrigin && !allowedOrigins().has(requestOrigin)) {
      return res.status(403).json({ success: false, message: 'Request origin is not allowed.' });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET, {
      issuer: 'spa-el-fath-api',
      audience: 'spa-el-fath-frontend',
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }

  const userId = Number(payload.sub);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(401).json({ success: false, message: 'Invalid session. Please log in again.' });
  }

  try {
    const user = await loadUser(userId);
    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'Session is no longer valid. Please log in again.' });
    }

    if (tokenVersionSupported && Number(payload.tv || 0) !== user.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Session expired after a security change. Please log in again.' });
    }

    if (await isRevoked(payload.jti)) {
      return res.status(401).json({ success: false, message: 'This session was signed out. Please log in again.' });
    }

    const role = ROLE_NAMES[Number(user.role_id)] || null;
    if (!role) {
      return res.status(403).json({ success: false, message: 'This account has no assigned role.' });
    }

    // Always derive authorization from current database state, not stale claims.
    req.user = { ...payload, sub: String(user.id), roleId: Number(user.role_id), role, tv: user.tokenVersion };
    return next();
  } catch (error) {
    console.error('Session validation failed:', error.message);
    return res.status(503).json({ success: false, message: 'Could not validate the session. Try again shortly.' });
  }
}

module.exports = requireAuth;
