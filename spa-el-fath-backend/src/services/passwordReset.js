const crypto = require('crypto');

// Reset tokens are single-use, expire after 30 minutes, and are stored only as
// SHA-256 hashes. The plain token is returned once to the caller for delivery.
const RESET_TOKEN_TTL_MINUTES = 30;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');
}

function generateResetToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

function expiresAt(now = new Date(), ttlMinutes = RESET_TOKEN_TTL_MINUTES) {
  return new Date(now.getTime() + ttlMinutes * 60 * 1000);
}

function isExpired(date, now = new Date()) {
  const value = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return !Number.isFinite(value) || value <= now.getTime();
}

function buildResetUrl(frontendUrl, token) {
  const base = String(frontendUrl || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

function isValidPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 12 &&
    Buffer.byteLength(password, 'utf8') <= 72
  );
}

module.exports = {
  RESET_TOKEN_TTL_MINUTES,
  hashToken,
  generateResetToken,
  expiresAt,
  isExpired,
  buildResetUrl,
  isValidPassword,
};
