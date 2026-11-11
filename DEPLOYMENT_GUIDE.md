# Deployment guide

## Before deployment

- Use supported Node.js 20.19+ or 22.12+ and MySQL 8.x.
- Create a production database and least-privilege database user.
- Back up and test all SQL migrations on a clone.
- Set a unique random `JWT_SECRET` (32+ characters).
- Set `FRONTEND_URL` to the exact production frontend origin.
- Set frontend `VITE_API_URL` to the HTTPS backend origin.
- Keep `VITE_DEMO_MODE=false`.
- Use HTTPS for frontend and API. Authentication is carried in an HttpOnly, Secure production cookie; serve the frontend and API on the same site where possible and set the exact `FRONTEND_URL` origin.
- Store maintenance attachments outside the public web root with restrictive filesystem permissions and backups.
- Configure reverse proxy, request-size limits, process supervision, log rotation, and database backups.
- Do not deploy `.env.example` as `.env`; create real secrets independently.
- Rotate any credential that may have been copied from the previous archive's example file.

## Build and run

```bash
# backend
cd spa-el-fath-backend
npm ci
npm run db:migrate  # only after approved backup/clone rehearsal
npm start

# frontend, in another terminal
cd spa-el-fath-frontend
npm ci
npm run build
```

Deploy the frontend build output using the chosen static hosting platform. Run the backend behind an HTTPS reverse proxy. Configure database health checks and a restart policy.

## Go-live acceptance

- `/api/health` returns success.
- `/api/health/database` confirms the production database connection.
- Admin login and all role-specific test accounts work.
- Login persists in an HttpOnly cookie, not localStorage; logout clears the cookie.
- Work-order create/edit/delete is verified against the API; only role IDs 1 and 2 may edit/delete, and completed or historically linked orders cannot be deleted.
- Operations Hub preventive plans, spare parts, technician profiles, safety inspections and document metadata persist in MySQL.
- Production and warehouse records cannot fall back to browser-only storage.
- Machine status changes survive a browser reload and are reflected in MySQL.
- Workshop fields survive a browser reload and are reflected in MySQL.
- Maintenance task creation, assignment, checklist, parts issue/return, log submission, and attachments work against the production schema.
- Apply `202611080001_operations_hub_persistence.sql` through `npm run db:migrate`; verify new technician columns and the `cmms_safety_inspections`, `cmms_machine_documents`, and `user_preferences` tables.
- Document records store a URL or server path; configure and test secure object/file storage separately before using actual binary uploads.
- Backup restore is rehearsed.
- Gmail/WhatsApp are tested only if enabled and explicitly approved.
