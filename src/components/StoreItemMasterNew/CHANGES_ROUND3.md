# Round 3 changes

1. Item Sub Group, Purchase UOM, HSN code, GST group dropdowns, Stop inward / Stop issue checkboxes removed from the form.
   Their validation is removed too. On save the keys are still sent: string -> "" (blank), number -> 0
   (type is read from the show-data value; for Add: ItmSGrp/PUOM/HsnCode = "", GSTGrpCode/StopIn/StopIss = 0). See `blankByType` in api.ts.
2. "Sales UOM" label is now "UOM".
3. Browse: Item Sub Group, Location, Stop In, Lct Name columns removed; UOM is the last column.
4. Make popup: orange section labels removed; Opening rate + Surplus level removed (sent as ""/0 by data type).
5. Makes & models grid: Op. rate column removed.

## Item code / MItmCode split
- Browse "Code" column shows ItmCode only.
- Opening a row (and Reload / Delete) sends that row's MItmCode in show-data / delete-data.
- Save: ItmCode key <- ItmCode, MItmCode key <- MItmCode (item level and every make row).

## Makes grid: Model column now flexes, so edit and delete icons sit together (no gap).

## GSTGrpCode / gst_group_code always sent as 0 on save.
