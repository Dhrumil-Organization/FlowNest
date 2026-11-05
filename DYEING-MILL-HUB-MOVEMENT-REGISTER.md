DYEING -> MILL HUB: COMBINED OUTWARD / INWARD REGISTER

This is the actual React Native Dyeing Mill Hub tab shown in the user's screenshot:
  src/screens/dyeing/MillHubTab.tsx

It is NOT the separate full-screen Mill Hub HTML app under src/mill/.

Frontend changes:
  - Added Outward Challans / Inward Receipts tabs inside Dyeing > Mill Hub.
  - Reuses the existing date range and presets for both directions.
  - Outward continues to use the existing report behaviour and existing item/design/lot drill-down.
  - Inward passes direction='inward' to the existing Dyeing API endpoint.
  - Inward list is grouped as actual receipt rows with inward date, inward number,
    party/item, linked outward challan/date, received quantity and job amount.
  - Tapping an inward row opens the existing full outward lot detail page, including
    linked inward entries, returns and taka-wise reconciliation.
  - Uses the existing Dyeing tab permission priority.mill_hub. No new mill.* permission.
  - Existing theme tokens and styles are reused.

Backend patch:
  Existing POST /dyeing/mill_hub_report now accepts optional direction=outward|inward.
  No new endpoint and no new permission resource are added.
  Outward date filter: GRYOut.OutDate.
  Inward date filter: GRYInw.InwDate.
  Historical outward settlement is cut off at the selected To Date.

Deploy:
  1. Frontend: replace the project with this archive and rebuild/redeploy.
  2. Backend: apply the controller in the separate Sudamo/Mills backend patch.
  3. Existing API route is retained; no new route registration is needed.
  4. Clear Laravel caches after deploying the PHP controller.
  5. Test Inward with a month containing known inward receipts and verify against ERP.
