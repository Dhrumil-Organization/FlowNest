# Shade Recipe (Define Recipe with Shade / Color / Shade range) — integration notes

## Wiring (same 4 steps as every NEW screen — see header of `registry/modules/production.module.ts`)
| # | File | What |
|---|---|---|
| 1 | `src/registry/modules/production.module.ts` | Resource `shade_recipe` (view · add · edit/Modify · delete) + `nav.shade_recipe` / `screen.shade_recipe` (route `shade-recipe`, icon `palette`, order 171) |
| 2 | `app/new/(tabs)/shade-recipe.tsx` (OUTER `app/`) | `PermissionRouteGuard resource="production.shade_recipe" action="view"` |
| 3 | `src/screens/production/ShadeRecipeScreen.tsx` | `ErpSessionGate` wrapper |
| 4 | `src/components/ShadeRecipeNEW/*` | the module |

The new resource reaches the backend through the registry auto-sync on the next Platform Admin login; other roles need a grant in Permission Manager. Add / Modify / Delete buttons are hidden when the right is missing.

## What is reused from ProcessChemicalsNEW (no copies)
`RecipeGrid` (grouped chemical grid) · `LineSheet` (add / edit chemical) · `columnSizing` (column resize + autosize) · model helpers (cost, grouping, totals) · API mappers (`toLine`, `toChem`, `toGroup`, `uniq` — only the word `export` was added to them in `ProcessChemicalsNEW/api.ts`).
Shade-specific: `model.ts`, `api.ts`, `mock.ts`, `ShadeRecipeHelpSheet.tsx`, `ShadeRecipeScreen.tsx`.

## Behaviour
- **Fields**: Recipe no., Date, Status, Description*, Shade*, Item, Shade range, Color (read-only), Location, Page no.
  Choosing a Shade fills Item / Shade range / Color (when the server sends them) and the Description if still empty.
- **Removed on purpose**: Recipe Group All/Selected, Load Recipe Groups, Temperature Details, Prepared By, Recipe Status, Approval Date, Approved By.
- **Browse**: RECIPE NO · DATE · DESCRIPTION · SHADE NAME · RANGE · ITEM NAME, per-column filters, sorting. Row action = **Edit only** (no delete in Browse). Delete exists only for the open recipe (confirmation dialog).
- **Copy recipe** (Add and Modify): opens the same Recipe-help list; clicking a recipe copies description, shade, item, color, range, location, page no. and all chemicals. Recipe no. / date / status stay. In Modify the already-saved chemicals are sent as `deleted_lines` on Save. Asks before replacing chemicals already entered.
- **Grid columns** (Recipe grid + Browse/Copy list): drag a header edge to resize (never below the header text), double-click the edge = autosize that column, right-click a header = *Autosize all columns* / *Reset columns*.
- **Responsive**: phone < 560 cards + bottom action bar · tablet ≥ 560 · desktop ≥ 900 (Ctrl+S, ↑/↓/Enter in lists). No horizontal overflow of the page.

## Demo mode (IMPORTANT before release)
`api.ts` → `USE_MOCK = process.env.EXPO_PUBLIC_SHADE_RECIPE_MOCK !== '0'` — ON by default (no controller was supplied); a "Demo data" banner shows while on.

## API contract assumed  (`ENDPOINTS` in api.ts)
All `POST`, Bearer, every body carries `txntype: "shade_recipe"`, envelope `{ success, response, message }`.
| Endpoint | Body | Returns |
|---|---|---|
| `/api/shade-recipe/browse-data` | `{type:'lookups'}` | `shades[{id,label,item_code,item_name,range,color}] items ranges locations groups[{id,code,name,calc}] chemicals[{item_code,item_name,make,model,uom,rate}] status` |
| same | `{type:'recipes'}` | `recipes[{recipe_no, recipe_date, description, shade_name, range, item_name}]` |
| `/api/shade-recipe/show-data` | `{recipe_no}` (0 = next number) | `{recipe:{recipe_no, recipe_date, description, shade_code, shade_name, item_code, item_name, color, shade_range, location, page_no, status, lines:[…]}}` / `{next_recipe_no}` |
| `/api/shade-recipe/add-data` · `modify-data` | recipe + `lines[]` (+ `deleted_lines`) | saved recipe (optional) |
| `/api/shade-recipe/delete-data` | `{recipe_no}` | message |
These are **assumptions** (no Define-Recipe controller/table was provided); only `api.ts` changes once the real routes/columns are known.
Cost rule is the shared `lineCost()` (GMS / GMS% → qty ÷ 1000 × rate per kg); it reproduces the reference (0.2907 + 0.0101 + 0.0069 = 0.3077).

## Recipe no. and Date are editable (Add and Modify)
Recipe no. (digits only, required) and Date (calendar picker, required) are normal input fields while adding / modifying — never greyed out. Add pre-fills the next free number from `show-data` (recipe_no 0); the user may overwrite it. In Modify the number the recipe had when opened is also sent as `original_recipe_no`, so the server can rename it; the server must reject a number that already exists. Copy Recipe never overwrites them.
