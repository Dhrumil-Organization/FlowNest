# Production modules — legacy vs NEW validation audit (21 Oct 2026)

Every entry / action screen registered in Production was compared rule by rule with its legacy screen
(old app `components/…`, or the web ERP where the NEW screen was ported from the web). Reports / dashboards that only
show data were not in scope. Result per rule: PRESENT (NEW already has it, same or stricter), ADDED (was missing,
restored from legacy), N/A (legacy rule disabled in legacy itself, or the field no longer exists).

## Restored (9 files changed — nothing else touched)

| Screen | Missing legacy protection | Fixed in |
|---|---|---|
| Collection add | Web: a typed future collection date was accepted (phones already blocked it) — now "Only today or past dates are allowed."; start date not before 2000 | `src/components/CollectionNEW/ChequeForm.tsx` |
| Collection edit | Same future-date guard on web | `src/components/CollectionEditNEW/ChequeForm.tsx` |
| Grey Order (purchase) | **Verify tab loaded history records (`atype 'H'`) — already approved / rejected orders could be verified or rejected again.** Legacy loads pending ones (`atype 'A'`) | `src/components/GreyYarnPurchaseOrderNEW/index.tsx` |
| Grey Order (purchase) | 5 "Server error" alerts were commented out (list, party history, history, verify, party list) — restored | same file |
| POY Rate Entry | Web: Enter in the rate box saved even while a save was running (double save) | `src/components/PoyRateEntryNEW/index.tsx` |
| POY Rate Entry | Web: a typed future "applicable from" date was accepted (legacy maximumDate = today) | `src/components/PoyRateEntryNEW/PoyDateField.tsx` (also used by Yarn Rates — same rule there) |
| Production Order | "The selected design must provide an item code." (Stock & sell) | `src/components/ProductionOrderNEW/plan.ts` |
| Production Order | "Greige Rate cannot be negative." | `plan.ts`, `useOrderForm.ts` |
| Production Order | "At least one Sales Order must remain selected in the group." | `useOrderForm.ts` |
| Production Order | Confirm "Change the Design group? Existing selected Sales Orders will be replaced." on a saved order | `useOrderForm.ts` |
| Production Order | Delete blocked when the order is authorised / closed ("Order No X has already been authorised.") | `src/components/ProductionOrderNEW/OrdersList.tsx` |
| Production Order | Load: "Invalid financial year selected. Expected: …" (To date must be in the login FY) | `OrdersList.tsx` |
| Weft Carton Issue | Filter From / To date could be set in the future (legacy maximumDate = today) | `src/screens/WeftCartonIssueNew/WeftCartonIssueScreen.tsx` |

## Already complete in NEW (every legacy rule PRESENT, often stricter)
Credit Limit Request (limit not equal to old / not 0 / not negative / not empty, confirm, processed lock) · New Account
Request · Outstanding Days Request · Collection list (edit/delete only pending, authorise rights, confirms) · Sales Order
(Grey) · Sales Order Entry (required fields, duplicate shade, past delivery date, authorised lock, dispatch ≤ pending) ·
Sales Order Inactive · SO Price List Auth · Yarn Sales Order · Price List · Yarn PO · Purchase Rate / Import / Grade
Auth · Sudamo Production Order · Process Complete · Production Merge · Design / Item Authorization · Packing Grade
Auth · Beam Close (FY check) · Beam Gaiting · Checking Scanner (scan / meter / kgs / delete rules) · Creel Issue Return ·
Creel Management · Weft Issue / Return · Doff Entry · Packing Automation · Warehouse · Yarn / Fabric Stock Verification ·
Event · Inquiry · Feedback.

## Needs your decision (not changed)
1. **Checking Scanner rights** — legacy checked separate rights for Scan, Manual entry, Print and Delete; NEW only has
   "view", so anyone who can open it can do all four. Restoring needs 4 actions in `production.module.ts`
   (`production.checking_scanner_new`) + `canDo` at 6 places. After that, roles must be given those actions in
   Permissions or their users lose scan / print / delete.
2. **Checking Scanner operator** — one legacy screen required Operator, the one NEW was ported from had it switched off;
   NEW has no operator field.
3. **Collection add Save** — not disabled while saving (same in legacy) → a double tap can save twice. One-line fix.
4. **Packing Grade Auth** — a failed approve / reject shows no message (NEW hides server messages on purpose; legacy
   showed them).
5. **Design / Item Authorization** — "Auth Remark cannot be empty" checks the stored remark, not the one typed on the
   card (same in legacy — looks like an old bug).
6. **New Account Request** — Credit Limit / Credit Days edited on the card are not sent (original values are sent).
7. **Yarn Sales Order** — Due Days 0 is allowed (legacy refused Delivery Days 0; NEW notes say this was requested).
8. **Fabric stock manual entry** — Design / Shade optional (legacy app optional; an older copy made them required).
9. **Sales order credit limit / overdue check** — never existed in legacy or in the backend save (`mobappsave`); it
   would be a new rule.

## Backend (for the backend team)
- `BaseController::sendResponse` always returns `success: true`, so when `SalesOrderController::mobappsave` REFUSES an
  order (missing PrpCode / YearNo / StrCode / party / rows) both old and new screens show "saved". Refusals should return
  `success: false`.
- Routes called by NEW but missing in `routes/api.php`: `prodorderwebnew/update`, `prodorderwebnew/delete`
  (Sudamo PO Modify / Delete), `prodorderwebnew/designs` (Stock & sell design picker).
- `authpurchase`, `get_price_list_poy_items`, `save_price_list_poy_items` are not in this `api.php` (served by another
  backend version) — their server-side checks could not be reviewed.
- `save_price_list` accepts any rate (not numeric / negative / no maximum) — same in legacy; the rule belongs there.

Every NEW screen calls the same save / action endpoints as its legacy screen — no new endpoint lost a server-side check.
