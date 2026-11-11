const { google } = require('googleapis');
const pool = require('../db');
const { decryptToken } = require('../utils/gmailSecurity');

function isConfigured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REDIRECT_URI &&
    /^[a-fA-F0-9]{64}$/.test(process.env.GMAIL_TOKEN_ENCRYPTION_KEY || '')
  );
}

function encodeSubject(subject) {
  return /[^\x20-\x7E]/.test(subject)
    ? `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`
    : subject;
}

function buildRawEmail({ to, subject, text }) {
  const clean = (value, label) => {
    if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) {
      throw new Error(`Invalid ${label}.`);
    }
    return value.trim();
  };

  const recipient = clean(to, 'recipient email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error('Recipient email address is invalid.');
  }
  const subjectLine = clean(subject, 'email subject');
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Email message is empty.');
  }

  const lines = [
    `To: ${recipient}`,
    `Subject: ${encodeSubject(subjectLine)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text, 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n').trim(),
  ];
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}


async function hasSystemGmailConnection() {
  if (!isConfigured()) return false;
  const [rows] = await pool.execute(
    `SELECT gc.id
     FROM gmail_connections gc
     INNER JOIN users u ON u.id = gc.user_id
     INNER JOIN roles r ON r.id = u.role_id
     WHERE r.id = 1 AND u.active = 1
     LIMIT 1`
  );
  return rows.length > 0;
}

async function getSystemGmail() {
  if (!isConfigured()) {
    const error = new Error('Gmail sender is not configured. Check Gmail OAuth and token encryption settings.');
    error.code = 'GMAIL_NOT_CONFIGURED';
    throw error;
  }

  // The system sender is the Gmail account connected by an active administrator.
  const [rows] = await pool.execute(
    `SELECT gc.google_email, gc.encrypted_refresh_token
     FROM gmail_connections gc
     INNER JOIN users u ON u.id = gc.user_id
     INNER JOIN roles r ON r.id = u.role_id
     WHERE r.id = 1 AND u.active = 1
     ORDER BY gc.updated_at DESC, gc.id DESC
     LIMIT 1`
  );

  if (!rows.length) {
    const error = new Error('Connect an institutional Gmail account from an administrator account before enabling automatic notifications.');
    error.code = 'GMAIL_SENDER_NOT_CONNECTED';
    throw error;
  }

  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  auth.setCredentials({
    refresh_token: decryptToken(rows[0].encrypted_refresh_token),
  });

  return {
    gmail: google.gmail({ version: 'v1', auth }),
    senderEmail: rows[0].google_email,
  };
}

async function sendNotificationEmail({ to, subject, text }) {
  const { gmail, senderEmail } = await getSystemGmail();
  const raw = buildRawEmail({ to, subject, text });
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return {
    messageId: result.data.id || null,
    threadId: result.data.threadId || null,
    senderEmail,
  };
}

module.exports = {
  isConfigured,
  getSystemGmail,
  hasSystemGmailConnection,
  sendNotificationEmail,
  buildRawEmail,
};
