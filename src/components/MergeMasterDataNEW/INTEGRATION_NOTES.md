# Merge Master Data (NEW ERP module)

## Files in this zip (copy into the project, same paths)
| File | Purpose |
|---|---|
| `src/components/MergeMasterDataNEW/model.ts` | constants (PRP_CODE=MT, TXN_TYPE), Passive/Delete values, response normalisers, YearNo finder |
| `src/components/MergeMasterDataNEW/api.ts` | **3 endpoints** + GET/POST calls, error handling, login-year reader |
| `src/components/MergeMasterDataNEW/ui.tsx` | responsive container, searchable dropdown, action dropdown, confirm dialog, banner |
| `src/components/MergeMasterDataNEW/MasterPanel.tsx` | Main / Merge panel (search, virtualised list) |
| `src/components/MergeMasterDataNEW/MergeMasterDataScreen.tsx` | the screen |
| `src/screens/production/MergeMasterDataScreen.tsx` | wrapper (ErpSessionGate -> token + API) |
| `app/new/(tabs)/merge-master-data.tsx` | route file (OUTER `app/` folder) |
| `src/registry/modules/production.module.ts` | **patched**: permission resource + nav/screen nodes added (nothing else changed) |

## Must do before testing
1. Endpoints are set: GET `/api/merge-master-data/browse-data` (dropdown + panels), POST `/api/merge-master-data/modify-data`.
   If the controller's `browse_data` needs a different param to return the panel rows, change `fetchRecords` in `api.ts`.
2. Permissions screen: give the role `Merge Master Data -> View` and `Save / Merge`.
   Without `merge` the Save / Merge button stays disabled and shows a message.
3. `model.ts` -> `REMOVED_SIDE`: `'from'` (left record is removed after merge) or `'to'` (legacy desktop style).
   Only the confirmation text uses it. Confirm with the backend developer.

## API contract used
All requests carry: `prptype = login.response.prptypes entry matching the selected PrpCode (PrpOf)`, `yearno` (from the login response), `txntype=mob_merge_master_data`.

* GET  properties  -> first dropdown. Any array shape is accepted (`[]`, `{data:[]}`, `{response:{data:[]}}`).
  Items need a code + name (`Code/Name`, `code/name`, `id/label` ...). Whatever the backend adds appears automatically.
* GET  records     -> extra param `property=<selected code>`; rows `Code/Name/Address` (many aliases accepted).
* POST merge       -> body `{ prpcode, yearno, txntype, property, maincode, mergecode, action }`, `action`: `P` = Passive, `D` = Delete.
* Success/failure message shown to the user = the server's `message`. `success:false`, `error:true`, `_AUTHFAILED` are treated as failure.

YearNo order: `mobile_raw_login_response.year.YearNo` -> `yno` -> any stored login object.

## Behaviour / safety
* Auto-selects the first property (like the desktop ERP), reloads From/To on change.
* Same record cannot be picked on both sides. Confirm dialog before POST; Delete also needs an "I understand" tick.
* Double-tap safe, stale responses ignored, request aborted on unmount, pull-to-refresh.
* Layout: phone < 600 (stacked panels, card rows, bottom-sheet dropdown) · tablet/desktop >= 760 panels side by side with table columns.
* Colours only from `T / S` tokens, so the app dark theme works.
