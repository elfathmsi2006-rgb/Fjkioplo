# Database migrations

Run from `spa-el-fath-backend/`:

```
npm run db:migrate            # apply pending migrations
npm run db:migrate -- --status   # show APPLIED / FAILED / PENDING
npm run db:migrate -- --verify   # read-only schema preflight (no DDL is executed)
npm run db:migrate -- --retry-failed   # retry a reviewed FAILED migration
```

## Schema preflight (`--verify`)

`--verify` never executes DDL. It is safe to run before and after a deployment and
reports:

- missing tables and missing columns for every structure the maintenance API depends on;
- missing values in the enums the API writes (`maintenance_tasks.status`,
  `maintenance_tasks.priority`, `maintenance_tasks.maintenance_type`,
  `maintenance_logs.maintenance_type`, `maintenance_logs.submission_status`,
  `cmms_work_order_parts.status`);
- **checksum drift** — a migration that was already applied but whose file content has
  changed since. Refreshing such a file would silently hide schema state problems.

It exits with code `2` and prints `SCHEMA VERIFICATION FAILED` plus one line per
problem, or `SCHEMA VERIFICATION PASSED` when everything is in place.

## Applying a single migration

A database restored from a SQL dump has an empty `schema_migrations` table, so every
migration shows as PENDING even though most of the schema is already in place. Running
the whole list in that situation is not safe. Apply one file at a time instead:

```
npm run db:migrate:one -- 202611140001_phase6_scheduled_export.sql
```

It uses the same splitter, the same SHA-256 checksum and the same `schema_migrations`
bookkeeping as the full runner, so the applied file stays consistent with `--status`.

## Rules

- All migrations are **additive and repeat-safe**. No table or production row is dropped.
- `schema_migrations` records each filename, its SHA-256 checksum, status, duration and the exact error.
- An applied file whose checksum changed is rejected. Do not edit history in place; add a new timestamped migration.
- A failed migration is recorded as `FAILED`. Fix the reported statement and re-run; successful files are skipped.
- The runner verifies the manifest, warns about unregistered `.sql` files, and removes expired/used password-reset tokens.

## Rollback guidance

Automatic rollback is intentionally not provided: reversing additive changes can destroy live data.

1. Stop the backend.
2. Restore the reviewed backup taken before deployment.
3. Only after the schema is restored, remove the affected filename from `schema_migrations` so it can be applied again.
4. Never drop a column or table that may contain production records. Use a new forward migration instead.
