# Database migrations

Run from `spa-el-fath-backend/`:

```
npm run db:migrate            # apply pending migrations
npm run db:migrate -- --status   # show APPLIED / FAILED / PENDING
npm run db:migrate -- --retry-failed   # retry a reviewed FAILED migration
```

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
