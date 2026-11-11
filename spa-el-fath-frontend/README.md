# SPA EL FATH CMMS — Frontend

React 19 / TypeScript / Vite interface for the SPA EL FATH CMMS application. This frontend is connected to the Express/MySQL backend; it is not a standalone local-data application.

## Run on Windows

1. Open `spa-el-fath-frontend` in VS Code.
2. Copy `.env.example` to `.env` and set `VITE_API_URL` to the backend URL. Keep `VITE_DEMO_MODE=false`.
3. Run `npm.cmd ci`, then `npm.cmd run build`, then `npm.cmd run dev`.
4. Sign in through the backend. The session is carried in an HttpOnly cookie; frontend API requests use credentials and do not store bearer tokens in localStorage.

## Persistence boundary

- Production records and Warehouse parts/movements are loaded and saved through backend APIs only. There is no localStorage fallback.
- Operations Hub work orders, preventive plans, parts, technician operational profiles, safety inspections, and machine document metadata use MySQL-backed APIs.
- Account preferences are loaded from and saved to `/api/settings/preferences`.
- Document records save metadata and a URL/server path. Uploading actual document bytes requires configured private file/object storage.
- The unused seed data file was removed. `demoData.ts` contains only empty preview record arrays and the known workshop labels used exclusively when `VITE_DEMO_MODE=true`; never enable demo mode in production.

## Known limitations

- A successful production build and browser end-to-end test must be completed on a machine with installed npm dependencies.
- A real MySQL database migration and CRUD acceptance test is required before go-live.
- MTBF and time-based availability remain unavailable without verified operating exposure. OEE is not calculated without validated planned-time, ideal-cycle, and downtime data.
