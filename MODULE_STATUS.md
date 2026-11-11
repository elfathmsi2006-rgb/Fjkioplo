# Module status and boundaries

This assessment reflects source code in this delivery. It does not claim live database acceptance.

| Module | Source-level status | Important boundary / action before operational use |
|---|---|---|
| Dashboard | Connected to current machine/maintenance data and dashboard APIs. | Validate real data freshness and role visibility against MySQL. |
| Machines & Equipment | CRUD API exists; list/detail/bulk status, move, and bulk delete now use server persistence. | Machine optional fields require the existing CMMS workflow migration. Machine changes are audited. Confirm real DB schema and workshop-head permissions. |
| Workshops | Read API plus new update API for all existing form fields. | Apply `202611040001_workshop_details.sql` before editing details; successful updates are audited. |
| Maintenance | Server-backed maintenance logs, work orders, attachments, breakdowns, preventive plans, checklist results, readings, spare-part reservations/issue/return, and technical manuals are present in source. | Apply all ordered migrations; test end-to-end assignment/ownership, attachments, checklist completion, inventory quantities, and scheduler on a clone. |
| Warehouse | Server-backed parts catalogue and stock movements; no browser fallback. | Requires authentication and the phase 2.5 MySQL migration. |
| Production | Server-backed production record read/create/delete; no browser fallback. | Requires admin/production-chief authorization; entered shift duration is an estimate and does not deduct breaks/downtime. |
| Operations Hub | Work orders, preventive plans, spare parts, technician operational profiles, safety inspections and machine document metadata use authenticated APIs and MySQL. | Apply `202611080001_operations_hub_persistence.sql`. Technician accounts are created in User Management with a linked technician record. Document records store a path/URL only; binary file storage must be configured separately. |
| Analytics | Server maintenance analytics API; admin-only. | MTBF and time-based availability are not validated without machine operating exposure data. |
| Audit Trail | Admin-only audit API and page exist. | Confirm all critical write routes create audit events and validate records in the live database. |
| Users & Permissions | User API and frontend route policy exist. | Verify direct API access for every role; role UI restrictions alone are not security. |
| Settings | Account language/theme/accent/density and alert preferences are stored in MySQL. | Backup export is not a server-side restore mechanism; do not use it as a production data migration. |
| Gmail / WhatsApp | Optional integration code exists. | Requires provider credentials, callback/webhook configuration, consent, and production security review. WhatsApp Cloud API is not used in this delivery (see EMAIL_NOTIFICATIONS_SETUP.md).

## Not introduced in this delivery

The 2026-11-08 update adds server-backed Operations Hub safety/document metadata and technician profile fields, HttpOnly session cookies, role-ID work-order controls, account preferences, and server-side production analytics.

## 2026-11-08 persistence and Operations Hub update

- Replaced browser persistence for production records and warehouse parts/movements with server-only API writes and reads; no local fallback remains.
- Migrated login sessions from localStorage bearer tokens to an HttpOnly `elfath_session` cookie. Frontend API requests now use `credentials: include`; legacy token/profile keys are removed on session initialization/clear.
- Removed unused seed data and browser persistence for app activity, machine views, language, and visual preferences; the dashboard activity feed now reads from the MySQL audit trail. Account preferences and alert preferences are stored through `/api/settings/preferences`.
- Operations Hub now reads work orders, preventive plans, parts, technicians, safety inspections and machine document metadata from APIs. Safety inspections and document metadata use new MySQL tables.
- Work-order PUT/DELETE is enforced by the backend for role IDs 1 and 2. Completed/history-linked orders are protected from deletion. Work-order create/update/delete are audited.
- Analytics production totals are queried from `production_records` in MySQL, not the browser's former production key.
- Frontend production build and live MySQL integration remain pending verification in an environment with dependencies and a configured database.
