# Coal Supplier Offers module update

## What changed
- Added a dedicated **Coal Supplier Offers** page to the Mill Hub navigation (desktop and mobile).
- Moved offer entry out of the Coal Mix Optimiser. The optimiser keeps a date-wise, read-only offer browser and its calculation/constraint logic.
- Added a standalone entry form with date, coal quality, supplier, rate per ton, available tons, optional remark, edit, delete (two-step confirmation), and supplier-master creation.
- Added a separate permission resource: `mill.expense.coal_offers` with `view` and `edit` actions.
- Kept the existing backend API and database tables; no duplicate backend endpoint/table was added.

## Existing backend APIs reused
- `expense/coal/offers`
- `expense/coal/offers/save`
- `expense/coal/offers/delete`
- `expense/coal/suppliers/save`
- `expense/coal` (to load coal-quality options)

## Permission setup
In Permission Manager → Mills → Monthly Expense → Coal Supplier Offers:
- Grant **View** to users who should see the module.
- Grant **Edit** to users who may add, edit, delete offers, or maintain suppliers.

The optimiser's existing `mill.expense.coal_optimiser` permission remains separate and continues to control optimiser access/constraint editing.

## Main files changed
- `src/mill/millHubHtml.ts`
- `tools/mill_live_screens.js`
- `tools/build_mill_html.py`
- `src/mill/millBridge.ts`
- `src/mill/MillShell.tsx`
- `src/registry/modules/mill.permission.ts`

## Validation
- Inline Mill Hub JavaScript passed `node --check`.
- Build script passed Python AST syntax parsing.
- The uploaded backend already contains the offer CRUD and supplier-save routes/controller methods, so the backend archive was not modified.
