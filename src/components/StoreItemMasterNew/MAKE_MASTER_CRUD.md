# Make / Model master CRUD (Add make -> "+" button)

Color Item Master ke inline masters (Purchase UOM, Sales UOM, Fibre ...) jaisa hi flow:
Make sheet me **Make name** ke side me **+** button -> dialog (form + browse list) -> add / edit / delete.

## Files
* `api.ts`  – NEW: `MAKE_MASTER_ENDPOINTS`, `MAKE_TXN_TYPE`, `fetchMakeMasterList`, `fetchMakeMasterNextCode`,
  `addMakeMaster`, `modifyMakeMaster`, `deleteMakeMaster`
* `MakeMasterSheet.tsx` – NEW dialog
* `MakeSheet.tsx` – "+" button, dialog mount, auto-select, stale selection cleanup
* `StoreItemMasterScreen.tsx` – passes API/token/scope and `onMakeOptionsChange` (keeps dropdown cache in sync)

## Behaviour
| Action | Call |
|---|---|
| dialog open | GET browse-data (list, paged) + GET show-data `MakCode=0` (next code) |
| new make name | POST add-data `MakCode=0, SrNo=0` |
| existing make name | POST add-data `MakCode=<existing>, SrNo=0` (new model under that make) |
| tap list row | edit mode -> POST modify-data (rename of make also renames its other models) |
| trash icon | confirm -> POST delete-data |
After each write the list is re-fetched, the Make sheet dropdown is refreshed and the new/updated row is selected.
Server message (success / error) is shown inside the dialog.

## Assumptions to verify (single place: api.ts, `makeMasterPayload` / `toMakeMasterRows`)
* URL prefix `/api/make-model-master/...`
* Request keys sent in BOTH styles: `MakCode, MakName, Model, SrNo, MakSrNo` + `make_code, make_name, model, make_srno`
  + scope (`prptype, PrpCode, YearNo, StrCode`), `txntype = make_model_master`
* Response rows read from: array | `makes` | `items` | `rows` | `data`; row keys `MakCode/make_code`, `MakName/make_name`,
  `Model/model`, `SrNo/MakSrNo/make_srno`; nested `models` list also handled.
