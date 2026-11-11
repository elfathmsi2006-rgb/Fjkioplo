# API documentation (source inventory)

All operational routes except the public health/login and OAuth callback/webhook flows require the authenticated `elfath_session` HttpOnly cookie (same-site frontend/API deployment recommended) unless the route explicitly documents otherwise. Role and record-ownership checks are enforced in backend routes. This is a route inventory, not a complete request/response schema.

| Prefix | Main existing operations |
|---|---|
| `/api/health` | Backend health. |
| `/api/health/database` | MySQL connectivity check. |
| `/api/auth/login` | Login and JWT issue. |
| `/api/machines` | List/create/update/delete machines. |
| `/api/machines/:machineId/descriptions` | Technician/workshop-chief machine notes. |
| `/api/machines/:machineId/manuals` | Private technical manual upload/list/download. |
| `/api/workshops` | List/read workshops; `PUT /:id` updates workshop name, translations, manager, manager phone, and location. |
| `/api/maintenance-logs` | List/read, create drafts, upload/read/delete attachments, submit maintenance logs. |
List/create/update/delete work orders and escalate with role and assignment rules.
| `/api/technicians` | Technician records. |
| `/api/maintenance-suite` | Summary, analytics, breakdowns, preventive checklists, checklist results, meter/condition readings, spare-part reservation/issue/return, manual links, and due-plan execution. |
| `/api/operations` | Spare-parts catalogue, stock movements, production records, preventive plans, audit events. |
| `/api/interventions/dashboard` | Historical intervention dashboard data. |
| `/api/communications/gmail` | Optional Gmail OAuth, send, message read, and disconnect. |

Machine status changes use the existing `PUT /api/machines/:id` endpoint. Workshop updates use the new authenticated `PUT /api/workshops/:id` endpoint.

## Operations Hub persistence additions (2026-11-08)

All endpoints below require the authenticated `elfath_session` HttpOnly cookie (same-site frontend/API deployment recommended). Mutating endpoints are role-gated and audited.

- `GET/POST /api/operations/safety-inspections`
- `PUT/DELETE /api/operations/safety-inspections/:id`
- `GET/POST /api/operations/machine-documents`
- `PUT/DELETE /api/operations/machine-documents/:id`
- `DELETE /api/operations/preventive-plans/:id`
- `PUT /api/operations/spare-parts/:id`
- `POST /api/users` — administrators may create a technician (`roleId: 3`) or workshop chief (`roleId: 4`); technician creation inserts the linked technician record transactionally.
- `PUT /api/technicians/:id` — only role IDs 1 and 2 may update technician operational profiles.
- `GET/PUT /api/settings/preferences` — stores per-user language, theme, accent, density and alert preferences in MySQL.
- `GET /api/operations/recent-activity` — reads the dashboard activity feed from persistent audit events.
- `GET /api/auth/me` and `POST /api/auth/logout` — validate and clear the HttpOnly session cookie.
- `PUT/DELETE /api/tasks/:id` — editing/deleting work orders is restricted to role IDs 1 and 2. Completed or historically linked work orders cannot be deleted; cancel them instead.

Machine document records store metadata plus a URL or server-managed path in MySQL. This endpoint does not upload file bytes; configure private object/file storage before enabling binary uploads.
