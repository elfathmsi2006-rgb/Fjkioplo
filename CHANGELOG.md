# Changelog

## Final delivery changes

- Machine status changes from the Machines list and Machine Details page now call the existing authenticated machine update API before updating the UI.
- Bulk machine status changes, workshop moves, and deletions now use backend requests; failed operations trigger a server reload so the UI does not falsely retain unpersisted changes.
- Machine edit permissions now match the frontend's existing workshop-head edit capability while machine deletion remains restricted to admin and production chief.
- Workshop API now returns multilingual names, manager, manager phone, and location; a protected update endpoint persists all existing workshop form fields.
- Workshop page now saves to the server first and only updates local state after a successful response. Machine and workshop mutations are also written to the existing audit trail within the same database transaction.
- Added repeat-safe additive MySQL migration `202611040001_workshop_details.sql`; updated `NewSchema.sql` for new installations.
- Added an ordered migration runner that understands MySQL `DELIMITER` blocks and an `npm run db:migrate` command.
- Replaced credential-looking values in backend `.env.example` with placeholders and strengthened backend `.gitignore`.
- Excluded the historical SQL data backup and a local test attachment from the distributable source archive; original user uploads were left untouched.
- Added project audit, module status, API, role, migration, deployment, and test documentation.

## 2026-11-08 — Database persistence and Operations Hub hardening

- Removed browser-only persistence and local fallback paths from Production and Warehouse.
- Moved authentication from browser-stored bearer tokens to an HttpOnly session cookie and added `/api/auth/me` / `/api/auth/logout`.
- Removed unused seed data and the unused Supabase client; visual preferences, activity feed and account preferences now load from server state/audit data or remain memory-only.
- Added MySQL-backed Operations Hub safety inspections, machine document metadata, technician profile fields, and account preferences.
- Added preventive-plan deletion and spare-part editing APIs.
- Added technician account creation (`roleId: 3`) with a linked technician record.
- Restricted work-order editing and deletion to role IDs 1 and 2 at the API; completed and history-linked orders are protected from deletion.
- Added server-side production aggregates to analytics.
- Backend regression tests: 43 passed. Frontend build and live database/browser checks remain outstanding.
