FlowNest — Dyeing > Mill Hub: Outward/Inward date toggle

Updated files:
  src/screens/dyeing/MillHubTab.tsx
  src/screens/dyeing/dyeingApi.ts

UI:
  - Preserves the existing Mill Hub screen, summary table, filters, status chips,
    item/design hierarchy, challan/lot detail and theme styles.
  - Adds a compact OUTWARD DATE / INWARD DATE toggle above the existing date range.
  - Does not add a new module, sidebar item, screen or permission.

Data behaviour:
  - OUTWARD DATE sends direction=outward. Existing report behaviour remains unchanged:
    outward lots are selected by GRYOut.OutDate and linked inward history is included.
  - INWARD DATE sends direction=inward. The report returns receipts selected by
    GRYInw.InwDate; receipts are grouped by their original outward line and rendered
    through the same HubLot table/grouping UI.
  - Inward quantities and job amounts represent only inward entries in the selected
    date range. Original outward line identifiers are retained for linked detail.
  - Tapping an inward result opens the original outward lot detail using the existing
    mill_hub_lot endpoint.
  - Inward view defaults status filter to ALL so receipts are not hidden by the
    lifetime completion status of their outward lot.

Backend dependency:
  The existing POST /dyeing/mill_hub_report endpoint must accept direction=outward|inward
  using the matching Sudamo DyeingMillHubController patch. No new route is required.
