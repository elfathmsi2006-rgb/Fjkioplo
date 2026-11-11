# Test report — 2026-11-08 update

## Automated checks completed

- Backend JavaScript syntax checks: passed for all files under `src` and the migration runner.
- Backend Node test suite: **43 passed, 0 failed** (`node --test test/*.test.js`).
- New regression coverage verifies role-ID 1/2 work-order editing/deletion, Operations Hub persistence APIs, HttpOnly cookie sessions, and removal of Operations Hub browser-storage writes.
- New SQL migration parsed by the project's SQL splitter into 10 statements, including the technician-column helper procedure and three new tables.

## Checks not completed

- Frontend production build: **not run successfully**. `npm run build` could not find installed Vite/Node type definitions because frontend dependencies were incomplete. `npm ci` timed out and offline install confirmed the Vite package tarball is not cached.
- Backend dependency installation: `npm ci` timed out; therefore server process startup was not verified in this environment.
- Live MySQL migration: not run. No database credentials or reachable MySQL instance were supplied in the archive/runtime.
- Browser end-to-end tests: not run. No live backend/database session was available.
- Production hosting, HTTPS cookie behavior, backups/restoration, and external Gmail delivery remain deployment acceptance checks.

## Important deployment notes

1. Back up MySQL and test all migrations on a restored clone.
2. Run `npm ci` in backend and frontend on a machine with npm registry access.
3. Apply migrations using `npm run db:migrate`, including `202611080001_operations_hub_persistence.sql`.
4. Set a strong `JWT_SECRET`, exact `FRONTEND_URL`, `NODE_ENV=production`, and HTTPS URLs. The HttpOnly cookie requires the frontend and API to be deployed on the same site where possible; verify the cookie is set, sent, and cleared in the production browser.
5. Keep `VITE_DEMO_MODE=false`.
6. Document metadata stores a URL/path only; binary file storage must be configured separately.
7. Complete the manual work-order role tests with accounts whose database `role_id` values are exactly 1, 2, 3, and 4.

**Conclusion:** backend static checks and regression tests pass. This archive is an updated development candidate, not yet certified production-ready because frontend build, live MySQL migration, and browser acceptance tests are still outstanding.
