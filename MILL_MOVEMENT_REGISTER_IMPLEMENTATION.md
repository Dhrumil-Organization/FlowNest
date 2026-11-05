MILL HUB — COMBINED OUTWARD / INWARD MOVEMENT REGISTER

Updated from the latest uploaded FlowNest frontend main(1).zip.

Frontend files changed:
  src/mill/millBridge.ts
  src/mill/MillShell.tsx
  src/mill/millHubHtml.ts
  src/registry/modules/mill.permission.ts

UI:
  - New permission-filtered "Outward / Inward Register" screen in Mill Hub.
  - Combined page with Outward and Inward tabs.
  - Month picker, this month, previous month, current FY, previous FY, and custom dates.
  - Outward list uses outward challan date.
  - Inward list uses actual inward receipt date.
  - Search and challan-level linked history drill-down.
  - Read-only display; no ERP transaction edit/delete controls.

API:
  - Direct authenticated Sudamo endpoints:
      POST /api/dyeing/mill_movement_report
      POST /api/dyeing/mill_movement_lot
  - `prptype` and `yearno` are taken from the existing login storage keys:
      user_prptype, yno
  - Server-side permission check is enforced by the new backend endpoints.

Permissions:
  New resource: mill.movement_register
  Action: View only
  After deploying frontend/backend, run Permission Manager -> Sync Registry
  and grant View to the required roles/users.

Validation:
  - Inline Mill Hub JavaScript passes `node --check`.
  - Backend controller and routes pass `php -l`.
  - Live SQL Server data, route registration and mobile-device runtime tests
    must be verified in the deployed Sudamo environment.
