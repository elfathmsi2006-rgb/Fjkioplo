# Database migration guide

## Existing MySQL database

1. Take a verified database backup and confirm it can be restored.
2. Create a disposable clone of the target schema and data.
3. Configure `spa-el-fath-backend/.env` with the clone credentials.
4. From `spa-el-fath-backend`, run `npm ci`, then `npm run db:migrate`.
5. Check each migration's success output and inspect the resulting columns/tables.
6. Run the API health/database checks and complete the acceptance checks in `TEST_REPORT.md`.
7. Only after clone acceptance, repeat with a new backup on the production database.

## Ordered migrations

1. `202610270001_cmms_workflow_enhancements.sql`
2. `202610310001_phase_2_5_data_modules.sql`
3. `202611010001_maintenance_suite.sql`
4. `whatsapp_notification_status_migration.sql`
5. `202611040001_workshop_details.sql`
6. `202611050001_email_notifications.sql`
7. `202611080001_operations_hub_persistence.sql`

The runner splits scripts using their declared `DELIMITER` commands before sending individual statements to MySQL. It does not wrap all migrations in one global transaction: DDL may implicitly commit. If a migration stops, inspect the database before retrying. These migrations are designed to be additive/repeat-safe where indicated, but must still be reviewed against the exact deployed schema.

## New empty database

## Supported install path

1. Start from NewSchema.sql (new empty database only).
2. Run 
pm run db:migrate to apply the 8 ordered migrations in sequence.
3. Verify each migration's success output and inspect the resulting columns/tables.
4. Run the API health/database checks and complete the acceptance checks in TEST_REPORT.md.
5. Only after clone acceptance, repeat with a new backup on the production database.

`NewSchema.sql` is a MySQL schema dump and contains `DROP TABLE IF EXISTS` statements. Use it only for a new empty database after reviewing it. Then run the additive migrations to create newer workflow tables/columns. Never use it to update an existing production database.

## Required workshop fields

The new workshop migration adds `name_fr`, `name_en`, `manager`, `manager_phone`, and `location`, and keeps `name` at the existing 50-character width to remain compatible with `machines.workshop_name`. Existing workshop rows are preserved; the French and English names are initialized from the current `name` when missing.

## Operations Hub migration

The final migration adds technician profile fields and creates `cmms_safety_inspections`, `cmms_machine_documents`, and `user_preferences`. It is additive and uses an information-schema check for technician columns. Test it on a restored clone first. Document rows store metadata and a URL/server path; they do not upload file bytes.
