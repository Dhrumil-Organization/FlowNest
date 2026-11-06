# FlowNest — Salary & Unit Consumption

This patch adds two independent New ERP modules to the existing FlowNest app.

## Screens / routes
- Salary: `app/new/(tabs)/salary.tsx` → `/new/(tabs)/salary`
- Unit Consumption: `app/new/(tabs)/unit-consumption.tsx` → `/new/(tabs)/unit-consumption`

Both screens use the shared responsive daily-entry view in:
`src/screens/reports/MonthlyCostingCalendarScreen.tsx`

## API contract (existing Sudamo endpoint; no backend route change)
Both modules call `POST /api/exp_costing_crud` through the authenticated `ExpenseCostingAPI` client.

Salary:
- `txntype: exp_costing_salary`
- `action: view | add | edit`

Unit Consumption:
- `txntype: exp_costing_unit`
- `action: view | add | edit`
- reads `UnitRate` from the response and sends it back when saving.

Request fields:
- `prptype`: current ERP business context property group (falls back to `S`)
- `yearno`: two-digit financial-year ending year
- `monthno`: two-digit calendar month
- `d1`: daily rows on save, preserving extra original API fields and row-level `action` / `isEmpty`

## Permissions
New permission resources:
- `reports.salary`
- `reports.unit_consumption`

Actions:
- `view`
- `edit`
- `save`

The route itself is guarded by `view`. Modify is shown only when both `edit` and `save` are allowed; save is checked again before posting.

After deploying the app, run the existing Platform Admin → Registry Sync workflow so these permission resources are available for role/user assignment. Then grant the required actions to the intended roles/users.

## Validation performed
- TypeScript/TSX transpile syntax checks passed for all changed/new TS/TSX files.
- The live API and SQL Server data were not available here, so verify the response envelope and a real month on your Sudamo environment before enabling edit/save for all users.
