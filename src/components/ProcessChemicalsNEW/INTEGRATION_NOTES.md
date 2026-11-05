# Process Chemicals (Define Recipe) — integration notes

## Files (same 4-step wiring as every NEW screen, see header of `registry/modules/production.module.ts`)
| # | File | What |
|---|---|---|
| 1 | `src/registry/modules/production.module.ts` | Resource `process_chemicals` (view · add · edit/Modify · delete) + `nav.process_chemicals` / `screen.process_chemicals` nodes (route `process-chemicals`, icon `science`, order 170) |
| 2 | `app/new/(tabs)/process-chemicals.tsx` (OUTER `app/`) | `PermissionRouteGuard resource="production.process_chemicals" action="view"` |
| 3 | `src/screens/production/ProcessChemicalsScreen.tsx` | `ErpSessionGate` wrapper |
| 4 | `src/components/ProcessChemicalsNEW/*` | the module |

The new resource reaches the backend through the registry auto-sync on the next Platform Admin login. SuperAdmin sees it at once; other roles need a grant in Permission Manager. Buttons for a missing right (Add / Modify / Delete) are hidden, not disabled.

## Module files
`model.ts` types, validation, cost maths · `api.ts` Laravel adapter + demo switch · `mock.ts` demo data (from the reference screens) ·
`ProcessChemicalsScreen.tsx` screen · `RecipeGrid.tsx` grouped responsive grid · `LineSheet.tsx` add/edit chemical ·
`RecipeHelpSheet.tsx` Browse **and** Copy Recipe.
UI kit (`Btn`, `Field`, `SelectField`, `Sheet`, `Card`, `Banner`…), `Notice` (toasts) and `Skeleton` are **reused** from `StoreItemMasterNew` — nothing duplicated.

## Demo mode  (IMPORTANT before release)
`api.ts` → `USE_MOCK = process.env.EXPO_PUBLIC_PROCESS_CHEMICALS_MOCK !== '0'`.
It is **ON by default** because no Process Chemicals controller was supplied, and the screen shows a "Demo data" banner while it is on.
When the backend is live set `EXPO_PUBLIC_PROCESS_CHEMICALS_MOCK=0` in `.env` (or change the default).

## Removed on purpose (blue marks in the last reference image)
Recipe Group All/Selected · Load Recipe Groups · Temperature Details · Prepared By · Recipe Status · Approval Date · Approved By.
Kept: Recipe No, Date, Description, Process, Item, Location, Page No, **Status** (it was not marked), the grid and the buttons.

## API contract expected from Laravel  (`ENDPOINTS` in api.ts — single place to change)
All `POST`, Bearer token, every body also carries `txntype: "process_chemicals"`. Envelope `{ success, response: {...}, message }`.
`success:false` / `error:true` → the server's `message` is shown to the user as-is.

| Endpoint | Body | Returns (inside `response`) |
|---|---|---|
| `/api/process-chemicals/browse-data` | `{type:'lookups'}` | `processes[{id,label}] items[{id,label}] locations[{id,label}] groups[{id,code,name,calc}] chemicals[{item_code,item_name,make,model,uom,rate}] status[{id,label}]` |
| same | `{type:'recipes'}` | `recipes[{recipe_no, recipe_date, description, process_name, item_name}]` |
| `/api/process-chemicals/show-data` | `{recipe_no}` — `0` = next free number | `{recipe:{recipe_no, recipe_date, description, process_code, process_name, item_code, item_name, location, page_no, status, lines:[{line_id, group_code, group_name, calc, item_code, item_name, make, model, uom, qty, rate}]}}`; for `0`: `{next_recipe_no}` |
| `/api/process-chemicals/add-data` | recipe + `lines[]` (each with `cost`) | saved recipe (optional) |
| `/api/process-chemicals/modify-data` | same + `deleted_lines:[line_id]` | saved recipe (optional) |
| `/api/process-chemicals/delete-data` | `{recipe_no}` | message |

Field-name aliases (PascalCase DB-style names such as `RecipeNo`, `RcpDesc`, `PrcCode`, `GrpCode`, `ItmCode`) are also accepted by the mappers in `api.ts`.
**These are assumptions** — no Laravel controller/table for Define Recipe was in the zip. Tell me the real routes/columns and only `api.ts` changes.

## Cost rule (assumption, one function)
`lineCost()` in `model.ts`: for `GMS` / `GMS%` → `qty / 1000 × rate (per kg)`, otherwise `qty × rate`.
Checked against the reference: 500 GMS% × 210/kg = 105.00. Change only that function if the server uses another rule.

## Copy Recipe
Add mode only. Opens the Recipe-help list (own recipe excluded), copies description, process, item, location, page no. and **all chemicals** into the new recipe (new number / today's date / status stay). Asks before replacing chemicals already entered. Nothing is saved until Save.

## Responsive behaviour (measured on the screen's own width, sidebar excluded)
phone < 560: 1-column form, chemical cards, bottom action bar (Add · Modify · Browse · ⋯) · tablet ≥ 560: 2 columns, Make/Model share a column ·
desktop ≥ 900: 3 columns, full grid, Ctrl+S, ↑/↓/Enter in Browse. No horizontal scrolling at any width.

## Recipe no. and Date are editable (Add and Modify)
Recipe no. (digits only, required) and Date (calendar picker, required) are normal input fields while adding / modifying — never greyed out. Add pre-fills the next free number from `show-data` (recipe_no 0); the user may overwrite it. In Modify the number the recipe had when opened is also sent as `original_recipe_no`, so the server can rename it; the server must reject a number that already exists. Copy Recipe never overwrites them.
