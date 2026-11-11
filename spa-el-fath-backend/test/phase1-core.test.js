const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const { splitSqlScript } = require('../src/utils/sqlScript');
const reset = require('../src/services/passwordReset');

test('password reset tokens are hashed, single-use sized and time-limited', () => {
  const { token, tokenHash } = reset.generateResetToken();
  assert.match(token, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(tokenHash, reset.hashToken(token));
  assert.notEqual(token, tokenHash);
  assert.equal(tokenHash.length, 64);
  assert.equal(reset.hashToken(token), reset.hashToken(token));
  assert.notEqual(reset.generateResetToken().token, token);

  const now = new Date('2026-01-01T00:00:00Z');
  const expiry = reset.expiresAt(now);
  assert.equal(expiry.getTime() - now.getTime(), reset.RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  assert.equal(reset.isExpired(expiry, now), false);
  assert.equal(reset.isExpired(new Date(now.getTime() - 1), now), true);
  assert.equal(reset.isExpired('not-a-date', now), true);

  assert.equal(reset.isValidPassword('123456789012'), true);
  assert.equal(reset.isValidPassword('12345678901'), false);
  assert.equal(reset.isValidPassword('x'.repeat(73)), false);
  assert.equal(reset.buildResetUrl('http://localhost:5173/', token), `http://localhost:5173/reset-password?token=${encodeURIComponent(token)}`);
});

test('phase 1 migration is additive, repeat-safe and registered in the runner', () => {
  const sql = read('spa-el-fath-backend', 'sql', '202611110001_phase1_core_fixes.sql');
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.match(sql, /token_version/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS password_reset_tokens/);
  assert.match(sql, /token_hash CHAR\(64\)/);
  assert.match(sql, /expires_at DATETIME/);
  assert.match(sql, /used_at DATETIME/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_preferences/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS cmms_safety_inspections/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS cmms_machine_documents/);
  assert.match(sql, /information_schema\.COLUMNS/);
  const statements = splitSqlScript(sql);
  assert.ok(statements.length >= 10);
  assert.ok(statements.some(statement => /CREATE TABLE IF NOT EXISTS password_reset_tokens/.test(statement)));
  const runner = read('spa-el-fath-backend', 'apply-maintenance-migrations.cjs');
  assert.match(runner, /202611110001_phase1_core_fixes\.sql/);
});

test('SQL dump now contains the Phase 1 tables and session column', () => {
  const dump = read('NewSchema.sql');
  for (const table of ['password_reset_tokens', 'user_preferences', 'cmms_safety_inspections', 'cmms_machine_documents']) {
    assert.match(dump, new RegExp('CREATE TABLE `' + table + '`'));
  }
  assert.match(dump, /`token_version` int unsigned NOT NULL DEFAULT '0'/);
});

test('technician creation is idempotent and audited transactionally', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'users.js');
  assert.match(route, /INSERT INTO technicians \(user_id,name,email\)/);
  assert.match(route, /ON DUPLICATE KEY UPDATE/);
  assert.match(route, /beginTransaction/);
  assert.match(route, /rollback/);
  assert.match(route, /ER_DUP_ENTRY/);
  assert.match(route, /roleId === 3/);
  assert.match(route, /bcrypt\.hash\(password, 12\)/);
});

test('sessions are derived from current database state and invalidated by token_version', () => {
  const auth = read('spa-el-fath-backend', 'src', 'middleware', 'auth.js');
  assert.match(auth, /cookies\.elfath_session/);
  assert.match(auth, /SELECT id, role_id, active, token_version FROM users/);
  assert.match(auth, /payload\.tv/);
  assert.match(auth, /user\.tokenVersion/);
  assert.match(auth, /role, tv: user\.tokenVersion/);
  assert.match(auth, /ER_BAD_FIELD_ERROR/);
});

test('password change and reset endpoints enforce verification, rotation and rate limits', () => {
  const server = read('spa-el-fath-backend', 'src', 'server.js');
  assert.match(server, /app\.post\('\/api\/auth\/change-password', requireAuth, sensitiveLimiter/);
  assert.match(server, /bcrypt\.compare\(currentPassword, user\.password_hash\)/);
  assert.match(server, /app\.post\('\/api\/auth\/forgot-password', forgotLimiter/);
  assert.match(server, /GENERIC_RESET_MESSAGE/);
  assert.match(server, /app\.post\('\/api\/auth\/reset-password', sensitiveLimiter/);
  assert.match(server, /used_at IS NULL AND prt\.expires_at > NOW\(\)/);
  assert.match(server, /bumpTokenVersion/);
  assert.match(server, /PASSWORD_CHANGE/);
  assert.match(server, /PASSWORD_RESET/);
});

test('frontend wires password change, emailed reset tokens and validation', () => {
  const provider = read('spa-el-fath-frontend', 'src', 'app', 'AppProvider.tsx');
  assert.match(provider, /\/api\/auth\/change-password/);
  assert.match(provider, /\/api\/auth\/forgot-password/);
  assert.match(provider, /\/api\/auth\/reset-password/);
  assert.doesNotMatch(provider, /not available yet/);

  const resetPage = read('spa-el-fath-frontend', 'src', 'pages', 'ResetPasswordPage.tsx');
  assert.match(resetPage, /useSearchParams/);
  assert.match(resetPage, /token/);

  const settings = read('spa-el-fath-frontend', 'src', 'pages', 'SettingsPage.tsx');
  assert.match(settings, /changePassword/);
  assert.match(settings, /currentPassword/);

  const users = read('spa-el-fath-frontend', 'src', 'pages', 'UsersPage.tsx');
  assert.match(users, /confirmPassword/);
  assert.match(users, /new TextEncoder\(\)/);

  const app = read('spa-el-fath-frontend', 'src', 'App.tsx');
  assert.match(app, /return <ResetPasswordPage \/>/);
  assert.match(app, /path="account"/);

  const account = read('spa-el-fath-frontend', 'src', 'pages', 'AccountPage.tsx');
  assert.match(account, /changePassword/);
  assert.match(account, /currentPassword/);
  const permissions = read('spa-el-fath-frontend', 'src', 'utils', 'permissions.ts');
  assert.match(permissions, /'\/account'/);
});
