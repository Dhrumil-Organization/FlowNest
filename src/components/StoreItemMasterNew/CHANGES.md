# Store Item Master – changes

Files changed: `model.ts`, `api.ts`, `StoreItemMasterScreen.tsx`, `BrowseSheet.tsx`. New: `Skeleton.tsx`. (`ui.tsx`, `MakeSheet.tsx` untouched.)

## 1. Property -> Year -> Store — ONE call per list
* `GET /api/getproperty` -> ALL properties in one call. Dropdown shows **LngName**; each row's `PrpOf` is its prptype.
* `GET /api/getyear?prptype=<PrpOf of the property>&prpcode=..` -> years.  `GET /api/getmstore?prpcode=..&yearno=..` -> stores.
* First load: getproperty (1) -> getyear (1) -> getmstore (1). Property changed -> getyear then getmstore. Year changed -> getmstore. Store changed -> none.
* Initial property: saved choice, else `defaultPrpCode`, else first property of the login's type (`defaultPrpType` / `prptypes` storage), else first.
* Skeleton in Year / Store while loading. Locked in Modify. All three required on save.

## 2. Payload (every call: lookups, browse, show, add, modify, delete, makes help)
`scopePayload()` in `api.ts` adds: `prptype, PrpCode, YearNo, StrCode` (Color Item Master style),
`prp_type, prp_code, year_no, str_code` (this controller's style), `txntype: 'store_item_master'`, `action`.
Change `TXN_TYPE` / delete one key style there if your backend differs.

## 3. Show API on Add
Cause: `onAdd` never called the show API (only Browse -> `openItem` did), so no code was fetched.
Fix: `fetchNextCode()` = show with `ItmCode: 0` for the current scope; runs on Add and on scope change while adding.
Code field becomes read-only when the server returns a code; it is not counted as an "unsaved change".

## 4. Skeleton loaders (no more circular loader)
`Skeleton.tsx`: left -> right shimmer, one shared animation, responsive.
Used for: first screen load, opening an item, Next-code field, Browse list.

## 5. browse-data (type=lookups) response mapping
Response is wrapped as `{ success, response: {...} }` — now read from `response` (before, it was read from the wrong level, so lists could come up empty).

| Response key | Used for | Notes |
|---|---|---|
| `groups` (id, label) | Item group | |
| `subgroups` (id, label, group_code) | Item sub group | filtered by the chosen group |
| `uom` (id, label) | Purchase UOM, Sales UOM | default NOS |
| `hsn` (id, label) | HSN code | blank row removed |
| `gst` (id, label) | GST group | repeated ids removed |
| `status` (A / P) | Make status text (Active / Passive) | grid, cards, make sheet |
| `locations` (id, label) | Make > Location dropdown | saved as the location id (`store_loc`); grid shows the label |
| `rate_editable` | Make rates (opening rate, rate 1-4, sale rate) | `false` = read-only |
| `stores` | not used | stores come from `getmstore` for Property + Year |

## 6. Success / error notifications (new `Notice.tsx`)
* `error: true` / `success: false` in the API response -> the server's own message is shown in a red error card. `success: true` on Add / Modify / Delete -> the server's message in a green success card. A fallback text is used only if the API sends no message.
* `api.ts`: `serverMessage()` reads message / Message / msg / errors (Laravel validation too); `saveItem` returns `{ item, message }`, `deleteItem` returns the message.
* Layout: desktop = top-right stack, tablet = top-centre, phone = full-width under the status bar. Countdown bar, hover/long-press pause, swipe to dismiss, Show more / Copy, duplicate merge, max 3 cards.
* `<NoticeHost />` is mounted once in `StoreItemMasterScreen.tsx`; the old `@/common/utils/snackbar` import was replaced.


## Lookup dropdown mapping fix
- Map actual API fields for item group (`ItmGrp`/`IGName`), item subgroup (`ItmSGrp`/`ISGName`), UOM (`UOMCode`/`LngName`), HSN (`HsnCode`/`HsnName`), and GST (`GSTGrpCode`/`GrpName`).
- Preserve existing make API key defaults and explicitly map Make name/model/serial number in save payload.

- Preserve the selected Make/Model lookup option's `SrNo` in the make row's API fields so `SrNo`, `MakSrNo`, and `make_srno` are included in the save payload; clear these values when the make selection changes.

## Requested follow-up fixes (2026-10-20)
- New Make rows now default to Active (`A`); the user can still change the status to Passive.
- Browse item Rate mapping now falls back to `LastRate` / `last_rate` when `rate` and `Rate` are absent, preserving a numeric zero as `0.00`.
- Removed the Shift dropdown from the Make details UI. Moved the Make Status dropdown (Active/Passive) to the Inward tolerance row beside Inward extra qty, as requested. New Make rows continue to default to Active (`A`).


## Make & Model CRUD mapping fix
- Added `MakSrNo` support when mapping Make/Model lookup rows and stable row IDs.
- Existing Add / Update / Remove actions operate on Make/Model rows within the current Store Item draft and are submitted using the existing `makes` / `deleted_makes` fields when the Store Item is saved.
- No Shift dropdown is rendered; Status remains beside Inward extra qty and defaults to Active for new rows.
