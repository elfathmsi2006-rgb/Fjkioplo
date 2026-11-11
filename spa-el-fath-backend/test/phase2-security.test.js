const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('service worker is versioned, network-first for navigation and never caches API responses', () => {
  const sw = read('spa-el-fath-frontend', 'public', 'sw.js');
  assert.match(sw, /const SW_VERSION = 'v2'/);
  assert.match(sw, /spa-el-fath-static-\$\{SW_VERSION\}/);
  assert.match(sw, /spa-el-fath-runtime-\$\{SW_VERSION\}/);
  assert.match(sw, /isApiRequest/);
  assert.match(sw, /pathname\.startsWith\('\/api\/'\)/);
  assert.match(sw, /!isSameOrigin\(url\) \|\| isApiRequest\(url\)\) return/);
  assert.match(sw, /\.filter\(key => key !== STATIC_CACHE && key !== RUNTIME_CACHE\)/);
  assert.match(sw, /cacheControl\.includes\('no-store'\)/);
  assert.match(sw, /isNavigation\(request\)/);
  assert.match(sw, /caches\.match\(APP_SHELL\)/);
  assert.match(sw, /SKIP_WAITING/);
  // Install must not claim a running session before the page opts in.
  const installBlock = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('activate'"));
  assert.doesNotMatch(installBlock, /skipWaiting\(\)/);
});

test('service worker registration bypasses HTTP cache and reloads once on controller change', () => {
  const main = read('spa-el-fath-frontend', 'src', 'main.tsx');
  assert.match(main, /updateViaCache: 'none'/);
  assert.match(main, /controllerchange/);
  assert.match(main, /refreshing = true/);
  assert.match(main, /SKIP_WAITING/);
});

test('migration runner tracks checksums, status and exact failures and cleans reset tokens', () => {
  const runner = read('spa-el-fath-backend', 'apply-maintenance-migrations.cjs');
  assert.match(runner, /CREATE TABLE IF NOT EXISTS schema_migrations/);
  assert.match(runner, /checksum CHAR\(64\)/);
  assert.match(runner, /status ENUM\('APPLIED','FAILED'\)/);
  assert.match(runner, /crypto\.createHash\('sha256'\)/);
  assert.match(runner, /Checksum mismatch for already-applied/);
  assert.match(runner, /statement \$\{index \+ 1\}\/\$\{statements\.length\}/);
  assert.match(runner, /--status/);
  assert.match(runner, /--retry-failed/);
  assert.match(runner, /printStatus/);
  assert.match(runner, /DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL OR expires_at < NOW\(\)/);
  assert.match(runner, /202611120001_phase2_security\.sql/);
  assert.match(runner, /Duplicate migration in manifest/);
  assert.match(runner, /Rollback guidance/);
});

test('phase 2 migration is additive and creates the session revocation store', () => {
  const sql = read('spa-el-fath-backend', 'sql', '202611120001_phase2_security.sql');
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS revoked_sessions/);
  assert.match(sql, /PRIMARY KEY \(jti\)/);
  assert.match(sql, /FOREIGN KEY \(user_id\) REFERENCES users\(id\)/);
  const dump = read('NewSchema.sql');
  assert.match(dump, /CREATE TABLE `revoked_sessions`/);
  assert.match(dump, /CREATE TABLE `schema_migrations`/);
});

test('sessions carry a jti, are revocable, refreshable and support logout-all', () => {
  const server = read('spa-el-fath-backend', 'src', 'server.js');
  assert.match(server, /jwtid: crypto\.randomUUID\(\)/);
  assert.match(server, /app\.post\('\/api\/auth\/refresh', requireAuth, refreshLimiter/);
  assert.match(server, /app\.post\('\/api\/auth\/logout-all', requireAuth/);
  assert.match(server, /INSERT INTO revoked_sessions \(jti, user_id, expires_at, reason\)/);
  assert.match(server, /revokeSession\(req\.user, 'refresh'\)/);
  assert.match(server, /bumpTokenVersion\(connection, Number\(req\.user\.sub\)\)/);
  assert.match(server, /DELETE FROM revoked_sessions WHERE expires_at < NOW\(\)/);

  const auth = read('spa-el-fath-backend', 'src', 'middleware', 'auth.js');
  assert.match(auth, /SELECT 1 FROM revoked_sessions WHERE jti = \? LIMIT 1/);
  assert.match(auth, /await isRevoked\(payload\.jti\)/);
  assert.match(auth, /This session was signed out/);
});

test('frontend refreshes active sessions and exposes logout-all', () => {
  const provider = read('spa-el-fath-frontend', 'src', 'app', 'AppProvider.tsx');
  assert.match(provider, /\/api\/auth\/refresh/);
  assert.match(provider, /20 \* 60 \* 1000/);
  assert.match(provider, /visibilitychange/);
  assert.match(provider, /\/api\/auth\/logout-all/);
  assert.match(provider, /signOutAll/);
  const account = read('spa-el-fath-frontend', 'src', 'pages', 'AccountPage.tsx');
  assert.match(account, /signOutAll/);
});

test('technician machine history is scoped to the technician own records', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'operations.js');
  assert.match(route, /req\.user\?\.role === 'maintenance_worker'/);
  assert.match(route, /SELECT id FROM technicians WHERE user_id = \?/);
  assert.match(route, /t\.technician_id = \?/);
  assert.match(route, /l\.technician_id = \?/);
  assert.match(route, /ownTaskFilter/);
  assert.match(route, /ownLogFilter/);
});

test('Gmail and notification-setting endpoints require the administrator role', () => {
  const route = read('spa-el-fath-backend', 'src', 'routes', 'communications.js');
  assert.match(route, /function requireAdmin\(req, res, next\)/);
  assert.match(route, /req\.user\?\.role !== 'admin'/);
  assert.match(route, /req\.path\.startsWith\('\/gmail'\) \|\| req\.path\.startsWith\('\/notifications\/settings'\)/);
  assert.match(route, /management \? requireAdmin\(req, res, next\) : next\(\)/);
});
