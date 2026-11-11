const crypto = require('crypto');

function getEncryptionKey() {
  const raw = process.env.GMAIL_TOKEN_ENCRYPTION_KEY || '';
  if (!/^[a-fA-F0-9]{64}$/.test(raw)) {
    throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY must be 64 hexadecimal characters.');
  }
  return Buffer.from(raw, 'hex');
}

function encryptToken(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}

function decryptToken(payload) {
  const parts = String(payload || '').split('.');
  if (parts.length !== 3) throw new Error('Stored Gmail token has an invalid format.');
  const [ivPart, tagPart, dataPart] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivPart, 'base64'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function hashState(state) {
  return crypto.createHash('sha256').update(state).digest('hex');
}

module.exports = { encryptToken, decryptToken, hashState };
