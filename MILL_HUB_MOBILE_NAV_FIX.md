FLOWNEST MILL HUB — MOBILE NAVIGATION VISIBILITY FIX

Based on the exact frontend archive uploaded as fron.zip.

Updated:
  src/mill/millHubHtml.ts

Fix:
  - Added the Outward / Inward Movement Register to the fixed mobile bottom navigation.
  - Added movement to the mobile navigation priority list.
  - The existing NAV permission filter is intentionally preserved:
    the item appears only when the logged-in Mill session includes View access
    for mill.movement_register.
  - Existing Mill Hub design, theme, screens and business logic are unchanged.

IMPORTANT PERMISSION ACTIVATION:
  1. Deploy the Sudamo permission registry containing mill.movement_register.
  2. Run Platform Admin / Permission Manager -> Registry Sync.
  3. Grant View access to the required user or role.
  4. Log out and log back into Mill Hub so /api/mill/session/status refreshes rights.
  5. Rebuild/redeploy the frontend bundle / app.

If the permission has not been synced/granted, the screen remains hidden by design.
This frontend fix does not bypass rights or expose the protected API to unauthorized users.

Existing API actions and movement report screen from the previous updated archive
are retained unchanged.
