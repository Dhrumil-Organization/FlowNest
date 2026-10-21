# Store Item Master API wiring

The screen's API adapter now uses the supplied Laravel `StoreItemMaster` controller methods and snake_case request fields.

## Endpoints configured
- `POST /api/storeitemmaster/browse_data` with `{ type: 'lookups' }` for dropdown lists
- `POST /api/storeitemmaster/browse_data` with `{ type: 'items', str_code, page, per_page }` for Browse
- `POST /api/storeitemmaster/show_data` with `{ str_code, ItmCode }` for Show
- `POST /api/storeitemmaster/add_data` for Add
- `POST /api/storeitemmaster/modify_data` for Modify (includes `deleted_makes`)
- `POST /api/storeitemmaster/delete_data` with `{ str_code, ItmCode }` for Delete

The provided PHP file contains controller methods, not the Laravel route declarations. If your `routes/api.php` registers a different URL prefix/casing, update `ENDPOINTS` in `api.ts` to match those exact routes. `API` is expected to be the server base URL without a trailing `/api`.

## Backend/UI contract note
The supplied controller requires both `make_code` and `make_srno` (the DAPMake composite key). Since the current UI allows manual make code/name/model entry, the adapter resolves the exact matching `make_srno` through `browse_data` with `type: 'makes'` before saving, and reports a validation error if no matching make/model exists. The PHP file returns only a limited set of columns for Browse, so UOM/subgroup/rate/location may appear blank unless the backend browse query is extended.

## Laravel routes included
A `Laravel_Backend_Integration/` folder is included alongside this frontend folder in the delivered ZIP. It contains the route declarations, the supplied controller copy, a `storeitem.php` config example, and installation notes. Merge the route entries into your existing `routes/api.php`; do not overwrite your application's routes file. Confirm `auth:api` matches your app's existing Bearer-token guard.


## Make & Model Add / Update / Delete behavior
- The `browse-data` response with `type: 'makes'` supplies the Make/Model options. The adapter reads `MakCode`, `MakName`, `Model`, and the row serial key from `MakSrNo` (also supports `make_srno` and `SrNo`).
- **Add make** adds a Make/Model detail row to the current Store Item draft.
- Selecting an existing row opens its details for **Update make**; the row's delete icon / **Remove** button removes it from the draft.
- The changes are persisted through the existing Store Item `add-data` / `modify-data` payload (`makes` and `deleted_makes`) when the user saves the Store Item. They are not saved immediately by the Make modal.
- The supplied API response proves the lookup/list data shape, but does not define a separate global Make master write endpoint. Therefore this implementation does not claim to create/update/delete global `DAPMake` records independently; it uses only the existing Store Item API flow and never calls the parent Store Item delete endpoint for a make row.
