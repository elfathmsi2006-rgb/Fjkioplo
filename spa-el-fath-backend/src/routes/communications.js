const express = require('express');
const crypto = require('crypto');
const { google } = require('googleapis');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const { encryptToken, decryptToken, hashState } = require('../utils/gmailSecurity');

const router = express.Router();
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

function oauthConfigured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REDIRECT_URI
  );
}

function createOAuthClient() {
  if (!oauthConfigured()) {
    const error = new Error('Gmail OAuth is not configured on the server.');
    error.status = 503;
    throw error;
  }
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

function currentUserId(req) {
  const id = req.user && req.user.sub;
  if (typeof id !== 'string' || !id || id.length > 64) {
    const error = new Error('The authenticated user identity is invalid. Please sign in again.');
    error.status = 401;
    throw error;
  }
  return id;
}

function requireAdmin(req, res) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Administrator permission is required.' });
    return false;
  }
  return true;
}

function safeFrontendRedirect(res, params) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  let target;
  try {
    target = new URL(base);
  } catch {
    return res.status(500).send('Frontend redirect is not configured correctly.');
  }
  target.searchParams.set('gmail_oauth', params.status);
  if (params.reason) target.searchParams.set('reason', params.reason);
  return res.redirect(302, target.toString());
}

function getMessageBody(payload) {
  const decode = (data) => Buffer.from(data || '', 'base64url').toString('utf8');
  let plain = '';
  let html = '';
  function walk(part) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body && part.body.data && !plain) plain = decode(part.body.data);
    if (part.mimeType === 'text/html' && part.body && part.body.data && !html) html = decode(part.body.data);
    for (const child of part.parts || []) walk(child);
  }
  walk(payload);
  return { text: plain, html };
}

function headerValue(headers, name) {
  const header = (headers || []).find((item) => item.name && item.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

function decodeHeader(value) {
  return String(value || '').replace(/\r?\n[ \t]+/g, ' ').trim();
}

function encodeSubject(subject) {
  return /[^\x20-\x7E]/.test(subject)
    ? `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`
    : subject;
}

function buildRawEmail({ to, subject, text, cc, replyTo }) {
  const cleanHeader = (value, label) => {
    if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) {
      const error = new Error(`Please provide a valid ${label}.`);
      error.status = 400;
      throw error;
    }
    return value.trim();
  };
  const toHeader = cleanHeader(to, 'recipient email address');
  const subjectHeader = cleanHeader(subject, 'email subject');
  if (typeof text !== 'string' || !text.trim()) {
    const error = new Error('Email message text is required.');
    error.status = 400;
    throw error;
  }
  if (text.length > 100000) {
    const error = new Error('Email message is too long (maximum 100,000 characters).');
    error.status = 400;
    throw error;
  }
  const lines = [
    `To: ${toHeader}`,
    ...(cc ? [`Cc: ${cleanHeader(cc, 'CC email address')}`] : []),
    ...(replyTo ? [`Reply-To: ${cleanHeader(replyTo, 'reply-to email address')}`] : []),
    `Subject: ${encodeSubject(subjectHeader)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text, 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n').trim(),
  ];
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

async function loadConnectedGmail(userId) {
  const [rows] = await pool.execute(
    `SELECT google_email, encrypted_refresh_token, granted_scopes
     FROM gmail_connections WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) {
    const error = new Error('No Gmail account is connected to this employee.');
    error.status = 404;
    throw error;
  }
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: decryptToken(rows[0].encrypted_refresh_token) });
  return { client, connection: rows[0], gmail: google.gmail({ version: 'v1', auth: client }) };
}

function handleError(res, error, publicMessage) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(`${publicMessage}:`, error.message);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? publicMessage : error.message,
  });
}

// Gmail connection, sending and notification-preference management are
// administrative settings. Operational roles may still read their notifications.
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Administrator access is required for communication settings.' });
  }
  return next();
}

// Google cannot send the CMMS Bearer token to the OAuth callback.
// All other endpoints remain protected by the existing JWT middleware.
router.use((req, res, next) => {
  if (req.method === 'GET' && req.path === '/gmail/oauth/callback') return next();
  return requireAuth(req, res, () => {
    const management = req.path.startsWith('/gmail') || req.path.startsWith('/notifications/settings');
    return management ? requireAdmin(req, res, next) : next();
  });
});

// POST /api/communications/gmail/connect-url
// The frontend calls this with its CMMS bearer token, then opens the returned URL.
router.post('/gmail/connect-url', async (req, res) => {
  let stateHash;
  try {
    const userId = currentUserId(req);
    const oauth2Client = createOAuthClient();
    const state = crypto.randomBytes(32).toString('hex');
    stateHash = hashState(state);
    await pool.execute('DELETE FROM gmail_oauth_states WHERE expires_at < NOW()');
    await pool.execute(
      'INSERT INTO gmail_oauth_states (state_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [stateHash, userId]
    );
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: GMAIL_SCOPES,
      state,
    });
    return res.json({ success: true, url });
  } catch (error) {
    return handleError(res, error, 'Could not start Gmail authorization.');
  }
});

// Google redirects here. The one-time state is tied to the CMMS employee.
router.get('/gmail/oauth/callback', async (req, res) => {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const googleError = typeof req.query.error === 'string' ? req.query.error : '';
  if (googleError) return safeFrontendRedirect(res, { status: 'denied', reason: 'consent_denied' });
  if (!/^[a-f0-9]{64}$/.test(state) || !code) {
    return safeFrontendRedirect(res, { status: 'failed', reason: 'invalid_callback' });
  }

  let userId;
  try {
    const [stateRows] = await pool.execute(
      'SELECT user_id FROM gmail_oauth_states WHERE state_hash = ? AND expires_at > NOW() LIMIT 1',
      [hashState(state)]
    );
    await pool.execute('DELETE FROM gmail_oauth_states WHERE state_hash = ?', [hashState(state)]);
    if (!stateRows.length) return safeFrontendRedirect(res, { status: 'failed', reason: 'expired_state' });
    userId = stateRows[0].user_id;

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    if (tokens.scope) {
      const granted = new Set(tokens.scope.split(/\s+/));
      if (!GMAIL_SCOPES.every((scope) => granted.has(scope))) {
        return safeFrontendRedirect(res, { status: 'failed', reason: 'missing_scopes' });
      }
    }

    const [existingRows] = await pool.execute(
      'SELECT encrypted_refresh_token FROM gmail_connections WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const refreshToken = tokens.refresh_token || (existingRows[0] && decryptToken(existingRows[0].encrypted_refresh_token));
    if (!refreshToken) {
      return safeFrontendRedirect(res, { status: 'failed', reason: 'missing_refresh_token' });
    }

    oauth2Client.setCredentials({ ...tokens, refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const scopes = tokens.scope || GMAIL_SCOPES.join(' ');

    await pool.execute(
      `INSERT INTO gmail_connections
         (user_id, google_email, encrypted_refresh_token, granted_scopes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         google_email = VALUES(google_email),
         encrypted_refresh_token = VALUES(encrypted_refresh_token),
         granted_scopes = VALUES(granted_scopes),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, profile.data.emailAddress || null, encryptToken(refreshToken), scopes]
    );
    return safeFrontendRedirect(res, { status: 'connected' });
  } catch (error) {
    console.error('Gmail OAuth callback failed:', error.message);
    return safeFrontendRedirect(res, { status: 'failed', reason: 'authorization_error' });
  }
});

// GET /api/communications/gmail/status
router.get('/gmail/status', async (req, res) => {
  try {
    const userId = currentUserId(req);
    const [rows] = await pool.execute(
      'SELECT google_email, connected_at, updated_at FROM gmail_connections WHERE user_id = ? LIMIT 1',
      [userId]
    );
    return res.json({ success: true, connected: rows.length > 0, account: rows[0] || null });
  } catch (error) {
    return handleError(res, error, 'Could not check Gmail connection status.');
  }
});

// POST /api/communications/gmail/send
router.post('/gmail/send', async (req, res) => {
  try {
    const userId = currentUserId(req);
    const { to, subject, text, cc, replyTo } = req.body || {};
    const raw = buildRawEmail({ to, subject, text, cc, replyTo });
    const { gmail } = await loadConnectedGmail(userId);
    const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    return res.json({ success: true, message: 'Email sent.', messageId: result.data.id, threadId: result.data.threadId });
  } catch (error) {
    return handleError(res, error, 'Could not send email from the connected Gmail account.');
  }
});

// GET /api/communications/gmail/messages?maxResults=10&q=...
router.get('/gmail/messages', async (req, res) => {
  try {
    const userId = currentUserId(req);
    const maxResults = Math.min(50, Math.max(1, Number.parseInt(req.query.maxResults, 10) || 10));
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 500) : undefined;
    const { gmail } = await loadConnectedGmail(userId);
    const list = await gmail.users.messages.list({ userId: 'me', maxResults, q });
    const messages = await Promise.all((list.data.messages || []).map(async (item) => {
      const result = await gmail.users.messages.get({ userId: 'me', id: item.id, format: 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'] });
      const msg = result.data;
      const headers = msg.payload && msg.payload.headers;
      return {
        id: msg.id,
        threadId: msg.threadId,
        snippet: msg.snippet || '',
        from: decodeHeader(headerValue(headers, 'From')),
        to: decodeHeader(headerValue(headers, 'To')),
        subject: decodeHeader(headerValue(headers, 'Subject')),
        date: headerValue(headers, 'Date'),
        unread: (msg.labelIds || []).includes('UNREAD'),
      };
    }));
    return res.json({ success: true, messages, nextPageToken: list.data.nextPageToken || null, resultSizeEstimate: list.data.resultSizeEstimate || 0 });
  } catch (error) {
    return handleError(res, error, 'Could not retrieve Gmail messages.');
  }
});

// GET /api/communications/gmail/messages/:id
router.get('/gmail/messages/:id', async (req, res) => {
  try {
    const userId = currentUserId(req);
    const id = req.params.id;
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) return res.status(400).json({ success: false, message: 'Invalid Gmail message ID.' });
    const { gmail } = await loadConnectedGmail(userId);
    const result = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
    const msg = result.data;
    const headers = msg.payload && msg.payload.headers;
    const body = getMessageBody(msg.payload);
    return res.json({
      success: true,
      message: {
        id: msg.id,
        threadId: msg.threadId,
        snippet: msg.snippet || '',
        from: decodeHeader(headerValue(headers, 'From')),
        to: decodeHeader(headerValue(headers, 'To')),
        cc: decodeHeader(headerValue(headers, 'Cc')),
        subject: decodeHeader(headerValue(headers, 'Subject')),
        date: headerValue(headers, 'Date'),
        text: body.text,
        html: body.html,
        labelIds: msg.labelIds || [],
      },
    });
  } catch (error) {
    return handleError(res, error, 'Could not retrieve this Gmail message.');
  }
});

// POST /api/communications/gmail/test
// Sends a real test message to the currently connected administrator Gmail account.
router.post('/gmail/test', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const userId = currentUserId(req);
    const { connection, gmail } = await loadConnectedGmail(userId);
    if (!connection.google_email) {
      return res.status(409).json({ success: false, message: 'Connected Gmail address is unavailable.' });
    }
    const raw = buildRawEmail({
      to: connection.google_email,
      subject: '[SPA EL FATH] Gmail notification test',
      text: 'Your SPA EL FATH CMMS Gmail connection is working. This is a test notification.',
    });
    const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    return res.json({
      success: true,
      message: `Test email sent to ${connection.google_email}.`,
      messageId: result.data.id || null,
    });
  } catch (error) {
    return handleError(res, error, 'Could not send the Gmail test message.');
  }
});

const NOTIFICATION_TYPES = [
  'MACHINE_BREAKDOWN',
  'TASK_ASSIGNED',
  'TASK_REASSIGNED',
  'TASK_DUE_SOON',
  'TASK_DUE_TODAY',
  'TASK_OVERDUE',
  'TASK_ESCALATED',
];

// GET /api/communications/notifications/settings
router.get('/notifications/settings', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const [rows] = await pool.execute(
      'SELECT notification_type, enabled, updated_at FROM maintenance_notification_settings ORDER BY notification_type'
    );
    return res.json({ success: true, settings: rows });
  } catch (error) {
    return handleError(res, error, 'Could not retrieve notification settings.');
  }
});

// PUT /api/communications/notifications/settings/:type
router.put('/notifications/settings/:type', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const type = String(req.params.type || '').toUpperCase();
    if (!NOTIFICATION_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid notification type.' });
    }
    const rawEnabled = req.body?.enabled;
    if (![true, false, 1, 0].includes(rawEnabled)) {
      return res.status(400).json({ success: false, message: 'The enabled value must be true or false.' });
    }
    await pool.execute(
      `INSERT INTO maintenance_notification_settings (notification_type, enabled, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_by = VALUES(updated_by)`,
      [type, rawEnabled === true || rawEnabled === 1 ? 1 : 0, currentUserId(req)]
    );
    return res.json({ success: true, notification_type: type, enabled: rawEnabled === true || rawEnabled === 1 });
  } catch (error) {
    return handleError(res, error, 'Could not update notification setting.');
  }
});

// GET /api/communications/notifications
// Administrator-only delivery history for the CMMS email notification queue.
router.get('/notifications', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const [rows] = await pool.execute(
      `SELECT n.id, n.notification_type, n.recipient_email, n.message,
              n.status, n.attempts, n.error_message, n.created_at, n.sent_at,
              n.task_id, n.machine_id, t.name AS technician_name
       FROM maintenance_notifications n
       LEFT JOIN technicians t ON t.id = n.technician_id
       ORDER BY n.id DESC
       LIMIT ?`,
      [limit]
    );
    return res.json({ success: true, notifications: rows });
  } catch (error) {
    return handleError(res, error, 'Could not retrieve notification history.');
  }
});

// DELETE /api/communications/gmail/disconnect
router.delete('/gmail/disconnect', async (req, res) => {
  try {
    const userId = currentUserId(req);
    await pool.execute('DELETE FROM gmail_connections WHERE user_id = ?', [userId]);
    return res.json({ success: true, message: 'Gmail connection removed from this CMMS account.' });
  } catch (error) {
    return handleError(res, error, 'Could not disconnect Gmail.');
  }
});

module.exports = router;
