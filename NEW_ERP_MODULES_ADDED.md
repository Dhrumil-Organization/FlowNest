# Legacy -> New ERP: modules added (3 Oct 2026)

## 1. Comparison — Legacy Home (56 modules) vs New ERP

| Status | Count | Modules |
|---|---|---|
| Already in New | 43 | Credit Limit Request, Receivables (+Sudamo), Collection, Yarn Purchase Order, Production Order Tracking, Monthly Expense Report, Snap View, Payable, Daily Collection Report, Sales Order Tracking, Daily Payment Report, Inquiry, Inquiry Report, Sudamo Production Order, Yarn Stock Verification, Fabric Stock Verification, Sales Order (Inactive), Purchase Order Tracking, Item Authorization, Process Complete Auth, Febric Stock, Checking Scanner, Packing Grade Auth, Production Merge Auth, Creel Management System, Creel Issue Return, Beam Gaiting, Beam Close, Weft Issue, Weft Issue Return, Doff Entry, Event, Sales Order, Price List, Sales Order Price List Auth, Poy Rate Entry, Purchase Grade Auth, Purchase Import Auth, Purchase Rate Auth, Profile, Sales Order Entry (= `orders`), Employ Dashboard (= Home dashboard), Sales Order Dashboard (= designs / costing / reports / orders) |
| **Added now** | 10 | New Account Request, Outstanding Days Request, Party Dashboard, Design Authorization, Production Report, Warehouse, Yarn Management System, Quarter Summary, Feedback, Yarn Manufacturing |
| Stay Legacy only | 0 | — (Weft Carton Issue and Yarn Sales Order were added later, see section 8) |
| Not ported | 1 | Sudamo Sales Order Entry — no route file exists in Legacy either |
| Hidden in Legacy | — | Sales Analysis (commented out of Legacy Home) — not ported |

## 2. What was added

| Module | New route (`app/new/(tabs)/`) | Permission | Component (`src/components/`) |
|---|---|---|---|
| New Account Request | `new-account-request` | `production.new_account_request` | `NewAccountRequestNEW` |
| Outstanding Days Request | `outstanding-days-request` | `production.outstanding_days_request` | `OutstandingDaysRequestNEW` |
| Party Dashboard | `party-dashboard` | `production.party_dashboard` | `PartyDashboardNEW` |
| Design Authorization | `design-authorization` | `production.design_authorization` | `DesignAuthorizationNEW` |
| Production Report | `production-report` | `production.production_report` | `ProductionReportNEW` |
| Warehouse | `warehouse` | `production.warehouse` | `WarehouseNEW` |
| Yarn Management System | `yarn-management-system` | `production.yarn_management_system` | `YarnManagementSystemNEW` |
| Quarter Summary | `quarter-summary` | `production.quarter_summary` | `QuarterSummaryNEW` |
| Feedback | `feedback` | `production.feedback` | `FeedbackNEW` |
| Yarn Manufacturing | `yarn-manufacturing` | `production.yarn_manufacturing` | `YarnManufacturingNEW` |

Each one follows the Fabric Stock / Yarn Stock pattern: permission child + `{ nav, screen }` pair in
`src/registry/modules/production.module.ts`, a wrapper in `src/screens/production/<Name>Screen.tsx`
(`ErpSessionGate` gives token + API host), and a route file guarded by `PermissionRouteGuard`.
Legacy screens, routes and files are untouched.

## 3. Rights
The 10 new `production.*` resources appear in Permission Manager after the registry sync (Platform Admin
login / app start). Until a role is granted them, only super-admin sees the new screens.

## 4. Notifications
`common/context/NotificationContext.tsx` (New ERP branch only; Legacy branch unchanged):
- 9 of the 10 new screens use the SAME route name as Legacy, so the same push payload opens them on both ERPs.
- Added `NEW_ROUTE_ALIASES`: when the backend sends a Legacy route/name that is named differently in New
  (e.g. `credit-limit` -> `credit-limit-request`, `snap-view` -> `snapview`, `febric-stock` -> `fabric-stock`,
  `QuarterWiseDispatch` -> `quarter-summary`, 27 entries) it is translated. Direct match still runs first and
  New ERP rights are still checked on the resolved screen.

## 5. Legacy behaviour kept as-is (looks like a Legacy bug — decide if you want it changed)
1. **New Account Request** — Credit Days / Credit Limit edited on the card are NOT sent on Accept; the original
   values go to the server (same as Legacy).
2. **Design Authorization** — History and Verify tabs never load from the server (Legacy has no store selector,
   and both loaders stop on an empty store). Verify only shows rows returned by the last approve/reject.
3. **Warehouse** — "Save Transfer" does not require a To Location (sends `tolocationdetail: [null]`).
4. **Party Dashboard** — list loads only after Filters > OK, and only the first 20 parties.
5. **Production Report** — property / year / store defaults each load after a 2-second delay (~6 s in total).
6. **Outstanding Days Request** — amounts drop the decimal point (`1234.50` shows as `1,23,450`).

## 6. Deliberate differences from Legacy
- **Yarn Management System** — Filament denier: when the count type has no formula Legacy shows and posts
  the text `NaN`; New posts an empty value. One line in `YarnManagementSystemNEW/model.ts` (`calculatefilamentDenier`).
- **Outstanding Days Request** — Legacy crashed silently on Approve if `limit1` came as a number; New approves.
- **Design Authorization** — "Details" and "Party history" links are reachable (in Legacy the buttons were
  commented out), same as the existing Item Authorization port.
- Display-only: `NaN` shown as `—` / `0`; own headers, back buttons and footers removed (global header).

## 7. Verification done
- Every new file passes a TypeScript check of its own code and local imports (packages stubbed).
- Registry validation run in node: 112 permission paths, 63 navigation nodes, no duplicates.
- Independent second review of each port against Legacy for endpoints, payloads, validations and calculations.
- NOT done: running the app on device / web — `npm install` is blocked in the build sandbox. Please run it once
  on Android + web and test each screen with a real login before release.

## 8. Yarn Sales Order added (6 Oct 2026)

| Module | New route (`app/new/(tabs)/`) | Permission | Component (`src/components/`) |
|---|---|---|---|
| Yarn Sales Order | `yarn-sales-order` | `production.yarn_sales_order` | `YarnSalesOrderNEW` |

Same pattern as section 2: permission child + `{ nav, screen }` pair in `production.module.ts`, wrapper
`src/screens/production/YarnSalesOrderScreen.tsx` (`ErpSessionGate`), route file guarded by `PermissionRouteGuard`.
The route name equals the Legacy one, so the same push payload opens it on both ERPs. Legacy screens untouched.

- Endpoints, payloads and response paths: `YarnSalesOrderNEW/api.ts`. Rules (row merge, validation, save payload):
  `YarnSalesOrderNEW/model.ts`.
- "Legacy behaviour kept as-is" and "Deliberate differences from legacy": header comment of `YarnSalesOrderNEW/index.tsx`.
- Checked: the save / row-merge / details rules give byte-identical output to the Legacy functions (3,000+ generated
  cases), and the whole flow was run in a browser against a mock API (requests compared with Legacy params).
  NOT done: a run on a device / against the real server.

Still Legacy only after this: Yarn Management System (its New screen and route file exist, but the permission and
menu entries are commented out in `production.module.ts`), Sudamo Sales Order Entry (no route file in Legacy either),
Sales Analysis (hidden in Legacy Home).

## 9. Legacy selection removed, dark theme, Settings (6 Oct 2026)

See `THEME_AND_SETTINGS.md`.
