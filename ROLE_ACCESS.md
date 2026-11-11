# Role access review

The frontend role guard keeps restricted page names visible but blocks navigation/direct route access. The reviewed policy is:

| Role | Current page access summary |
|---|---|
| `admin` | All pages, including Users, Settings, Analytics, and Audit Trail. |
| `production_chief` | All operational pages except User Management; Analytics, Settings, and Audit Trail remain admin-only. |
| `maintenance_worker` | Dashboard, Machines, Workshops, Maintenance, Operations, and Warehouse. |
| `workshop_head` | Dashboard, Machines, Workshops, Maintenance, and Warehouse. |

Backend enforcement is separate from frontend navigation and must remain enabled. Machine edit/create is allowed for admin, production chief, and workshop head; machine deletion is restricted to admin and production chief. Workshop edits are allowed to those same three management roles. Work-order management and other maintenance mutations retain their route-level role/ownership checks.

**Deployment check:** create one test account per role and verify both the UI and direct API requests. The role matrix is derived from the current source code; it is not a substitute for a live authorization penetration test.
