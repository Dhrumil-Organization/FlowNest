# Changes (round 2)
1. Save validation: Item sub group is required when the selected Item group has sub groups (model.ts validateItem + Screen).
2. Add make dialog: R.O. level, R.O. qty, Inward extra qty (%), Inward extra qty, Short name, Location removed. Save payload sends 0 (numbers) / '' (text) for these keys (api.ts).
3. Browse: resizable columns (drag the handle at the right edge of a header), horizontal scroll; only the leading Code column is kept, other code-only columns (e.g. ItmGrp) hidden.
4. Make name dropdown shows make name only (no make code).
5. Browse labels: "Item Group", "Item Sub Group".
6. Makes & models grid (desktop/tablet) and phone cards: R.O. level, R.O. qty, Short name, Location, Inward Extra Qty (%), Inward Extra Qty columns removed.
7. Browse: Item Sub Group now reads ISGName (was ItmSGrp code); ISGName no longer repeated as an extra column. Item Group already reads IGName.
