// Safe manual delivery point for password reset links when no institutional
// Gmail sender is configured. Run on the backend host by an administrator:
//
//   node scripts/issue-password-reset.js
//
// The generated link is printed once. A SHA-256 hash is stored; the raw token
// is never written to the database or logs. The link expires in 30 minutes.
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const readline = require('readline');
const pool = require('../src/db');
const { generateResetToken, expiresAt, buildResetUrl } = require('../src/services/passwordReset');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = question => new Promise(resolve => rl.question(question, resolve));

(async () => {
  try {
    const email = (await ask('Account email: ')).trim().toLowerCase();
    if (!email) throw new Error('Email is required.');

    const [users] = await pool.execute('SELECT id, full_name, email FROM users WHERE email = ? AND active = 1 LIMIT 1', [email]);
    if (!users.length) {
      // Do not reveal whether the account exists to an unauthenticated caller;
      // this script is run directly by an administrator, so a clear message is safe.
      console.log('No active account matches that email.');
      return;
    }

    const user = users[0];
    const { token, tokenHash } = generateResetToken();
    await pool.execute('DELETE FROM password_reset_tokens WHERE user_id = ? AND (used_at IS NOT NULL OR expires_at < NOW())', [user.id]);
    await pool.execute(
      'INSERT INTO password_reset_tokens (user_id,token_hash,expires_at,request_ip) VALUES (?,?,?,?)',
      [user.id, tokenHash, expiresAt(), 'admin-cli']
    );
    console.log(`Reset link for ${user.email} (valid 30 minutes, single use):`);
    console.log(buildResetUrl(process.env.FRONTEND_URL || 'http://localhost:5173', token));
    console.log('Deliver this link over a trusted channel. It cannot be displayed again.');
  } catch (error) {
    console.error('Could not issue a reset link:', error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await pool.end().catch(() => {});
  }
})();
