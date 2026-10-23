# Model dropdown — overlay fix
Files: MakeMasterSheet.tsx, ui.tsx (Field got optional `onFocus`).
- Dropdown ab nested <Modal> nahi; sheet body ka LAST child absolute layer hai -> grid ke upar, grid height same.
- Position sheet-relative (measureInWindow), resize/rotate par re-measure, jagah kam ho to field ke upar open.
- Button Model field ke saath ek hi line (nowrap), 46px, copper highlight jab open.
- Typing filter, focus par auto-open, selected row highlight, empty-state message, 44px touch rows.
- Outside tap se close (field + button active rehte hain). Add/Update/Delete APIs unchanged.

## v5 — see-through list fix
Root cause: `T.card` is not a colour used anywhere else in the theme (rest of the app uses `T.surface`), so the dropdown had NO background and the grid showed through. All `T.card` -> `T.surface` in MakeMasterSheet.tsx.

## v6 — labels inside grid rows
Every value in the make grid (and expanded model rows) now has its own small label above it: Make code, Make name, Short name, Status, Edit, Delete / Model code, Model name. Works on phone, tablet and web; separate header row removed (it was unreadable/misaligned on phones).

## v7 — labels never cut off
v6 squeezed 6 labelled columns into one line, so labels showed as "Make c…", "Short …". Now: width >= 700 -> one line per row (full labels, fixed widths); phone / narrow -> two lines (make name + Edit/Delete on top, Make code / Short name / Status wrapping below). Expanded model rows: model name on top, Model code / Make name / Status below. No numberOfLines on labels.

## v8 — aligned header (web / tablet >= 700px)
Header row + expanded sub-header now use the SAME column spec (COL / ROW_GAP) as the data rows, so every label sits exactly over its values. Main header is sticky (ListHeaderComponent) so it also lines up with the list's scrollbar. Phone (<700px): label above each value (v7 layout).

## v9 — add-data sends the real MakCode
Cause: submit() hard-coded `makeCode: '0'` for a new make, so add-data always went with MakCode 0 / make_code 0 even though show-data had returned the next code (2083) and the form displayed it.
Fix: new make -> MakCode = next code from show-data (re-fetched just before saving); existing make -> its own code (unchanged). 0 only if the server returned no code.

## v10 — SrNo + `models` object in add-data
* New make: MakCode = next code from show-data (e.g. 2086), model SrNo = 1.  New model under an existing make: that make's MakCode, SrNo = highest existing SrNo + 1.  (api.ts no longer forces SrNo to 0 on add.)
* Every make-master write (add / modify / delete) now also sends `models: { PrpCode, MakCode, SrNo, Model }` — same shape as the show-data response. Flat keys (MakCode, SrNo, MakSrNo, make_code, make_srno ...) are still sent.

## v11
* MAKE_TXN_TYPE stays 'store_item_master' (api.ts taken from your zip, untouched).
* Multiple models: type them in "Model name" separated by comma / semicolon / new line -> button becomes "Add N models"; each goes with the same MakCode and SrNo +1, +2 ... After saving, the MAKE STAYS in the form (only the model is cleared) so the next model can be added straight away.
* Model grid: Status column removed (make rows keep Status).
* Speed: (1) Cell / IconAct were components defined inside render -> every cell remounted on every render; now plain helper functions. (2) make + model rows are ONE flat virtualized list, so expanding a make with thousands of models renders only what is visible. (3) search is debounced (250 ms, input itself stays instant) and row search text is precomputed. Searching a model name auto-opens its parent make.

## v12 — models array in add-data
Cause: several models were sent one add-data call each and `models` was a single object, so the server (which reads `models` as an ARRAY of objects) answered "Model cannot be blank!".
Fix: ONE add-data call with `models: [ {PrpCode, MakCode, SrNo:1, Model}, {PrpCode, MakCode, SrNo:2, Model}, ... ]`. modify / delete also send `models` as an array (1 object). Flat keys still sent (first model).

## v13
* Search results stay COLLAPSED — a make opens only when the user taps it.
* Pencil on a make row (grid) loads the MAKE only: model field empty, nothing pre-selected in the model dropdown (new `editKind`). Update saves the make using its own first record (model / SrNo unchanged). Pencil inside the model dropdown still loads that exact model.

## v14 — modify-data carries ALL models
Updating a make now sends ONE modify-data call whose `models` array holds every existing model of that make (PrpCode, MakCode, SrNo, Model) plus any new model(s) typed in "Model name" (SrNo = last + 1 ...). Picking a model from the dropdown and editing it sends the full array with that model renamed. The old per-model rename loop is gone (one call does it). Button reads "Update + add N models" when new models are typed.
