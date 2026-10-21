# Make / Model fix

## What changed
- The Make/Model options are now loaded from the existing `browse-data` endpoint with `type: 'makes'` across pages instead of relying on the short list embedded in `type: 'lookups'`.
- The search list can reach records beyond the first 200 rows.
- Make names are sorted so normal alphanumeric names appear before punctuation-only names. Original API values are retained and are not rewritten.
- The current item-level Make/Model workflow remains Add / Update / Delete. Add and Update edit the draft; Delete removes the row from the draft. The changes are persisted when the Store Item itself is saved.
- The Shift dropdown remains absent and Status remains beside Inward extra qty, defaulting to Active for a new row.

## API data limitation
The supplied response contains records such as `MakCode: "602"`, `MakName: "'"`, `SrNo: 62`, `Model: "5 MTR"`. The UI preserves this exact source data. A frontend cannot safely turn that literal `MakName` into a different database name.

The response shows a Make/Model list/read operation; it does not establish a separate global Make master write endpoint. Therefore the Add / Update / Delete actions here operate on Make/Model rows belonging to the current Store Item and save through the existing Store Item add/modify payload (`makes` / `deleted_makes`). They do not claim to independently create/update/delete global master records.
