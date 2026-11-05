# Planning (Yarn Dyeing › Planning) — integration notes

## Files (same 4-step wiring as Process Chemicals / Shade Recipe)
| # | File | What |
|---|---|---|
| 1 | `src/registry/modules/production.module.ts` | Resource `planning` (view · add · edit/Modify · delete) + `nav.planning` / `screen.planning` (route `planning`, icon `event-note`, order 172) |
| 2 | `app/new/(tabs)/planning.tsx` (OUTER `app/`) | `PermissionRouteGuard resource="production.planning" action="view"` |
| 3 | `src/screens/production/PlanningScreen.tsx` | `ErpSessionGate` wrapper |
| 4 | `src/components/PlanningNEW/*` | the module |

Module files: `model.ts` types · validation · maths · `api.ts` Laravel adapter + demo switch · `mock.ts` demo data ·
`PlanningScreen.tsx` screen · `PlanGrid.tsx` responsive order grid · `SourceSheet.tsx` Item help (SO / JO) ·
`QtyHelpSheet.tsx` Total-quantity help · `PlanBrowseSheet.tsx` Browse. UI kit / toasts / skeletons are REUSED from `StoreItemMasterNew`; column
resizing is REUSED from `ProcessChemicalsNEW/columnSizing`.

## Business rules implemented
* **Type** Dyeing / Coning / Checking (Grading). Fixed once the voucher is added (changing it while adding clears the picked orders, after a confirm).
* **Item help** = pending Sales Orders (SO no + SO date) and Job Orders (JO no + JO date). Multi-select; a plan holds ONE item.
* **Shade help** = unique shades of the picked item(s). If there is only one, it is pre-selected.
* **Total Quantity** = live sum of the grid (never typed). The (?) button opens *Order · Item · Party · Qty*; each order shows what is still free to plan and
  Save refuses a quantity above it (the server must check again).
* **Machine** = the whole machine master (group shown next to the name).
* **Merge** only for Coning / Checking, and only *stock* merges. Dyeing has no merge field. (`MERGE_REQUIRED` in `model.ts` makes it mandatory.)
* **Remarks** Coning / Checking: the sales-order item-wise remarks are pulled into Remarks when orders are picked (never overwrites text the user typed).
* **Removed** the three check-boxes under Machine (AutoClave, Soft Packaging, Coning With Oil).
* **Browse** Edit icon only — NO delete in Browse. **Delete** exists only on the opened plan, and Modify / Delete are blocked once the plan is not `Pending`.

## Demo mode (IMPORTANT before release)
`api.ts` → `USE_MOCK = process.env.EXPO_PUBLIC_PLANNING_MOCK !== '0'`. ON by default (no Planning controller was in the zip); a "Demo data" banner shows.
Set `EXPO_PUBLIC_PLANNING_MOCK=0` in `.env` when the backend is live.

## API contract expected from Laravel (`ENDPOINTS` in api.ts — single place to change)
All `POST`, Bearer token, body also carries `txntype: "planning"`. Envelope `{ success, response: {...}, message }`; a failure's `message` is shown as-is.
| Endpoint | Body | Returns (inside `response`) |
|---|---|---|
| `/api/planning/browse-data` | `{type:'lookups'}` | `processes[{id,label}] machines[{id,label,group}] merges[{id,label,stock}]` |
| same | `{type:'plans'}` | `plans[{voucher_no,prefix,voucher_date,type,process_name,item_name,shade_name,machine_name,qty,party_name,status}]` |
| same | `{type:'sources', plan_type, process_code}` | `sources[{kind:'SO'|'JO', order_no, order_date, party_code, party_name, item_code, item_name, shade_code, shade_name, order_qty, balance, remarks}]` |
| same | `{type:'shades', item_codes:[…]}` | `shades[{id,label}]` (unique) |
| `/api/planning/show-data` | `{voucher_no}` — `0` = next number | `{plan:{prefix, voucher_no, voucher_date, type, process_code/_name, item_code/_name, shade_code/_name, merge_code/_name, machine_code/_name, remarks, status, lines:[{line_id, kind, order_no, order_date, party_code/_name, item_code/_name, shade_code/_name, order_qty, available, qty, remarks}]}}`; for `0`: `{prefix, next_voucher_no}` |
| `/api/planning/add-data` | plan + `lines[]`, `total_qty` | saved plan (optional) |
| `/api/planning/modify-data` | same + `original_voucher_no`, `deleted_lines:[line_id]` | saved plan (optional) |
| `/api/planning/delete-data` | `{voucher_no}` | message |

`available` on a line = balance still free to plan **including that line's own saved qty** (so Modify does not block the same quantity). PascalCase DB-style
aliases (`VchNo`, `PrcCode`, `McnCode`, …) are accepted by the mappers. **These are assumptions** — send me the real routes / columns and only `api.ts` changes.

## Responsive behaviour (measured on the screen's own width, sidebar excluded)
phone < 560: 1-column form, one card per order with a big numeric Qty box, bottom action bar (Add · Modify · Browse · ⋯) ·
tablet ≥ 560: 2 columns, table grid · desktop ≥ 900: 3 columns, resizable table, Ctrl+S, ↑/↓/Enter in Browse. No sideways scrolling of the page at any width.

## Column sizing (Process Chemicals, Shade Recipe, Planning — one shared file)
`ProcessChemicalsNEW/columnSizing.tsx`: drag the header edge to resize · double-click the edge = autosize that column · right-click the header →
**Autosize all columns / Reset columns**. Change in this round: a column can now be dragged much narrower (floor `MIN_COL_W = 28` px, text is clipped with …)
instead of stopping at the header-text width. "Autosize" still keeps the header readable.
