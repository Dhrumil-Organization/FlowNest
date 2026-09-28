# Priority tab — Outward (challan) → Lot No. update

Replace/add these files at the same path in your project:

| File | Change |
|---|---|
| src/api/legacyClient.ts | `DyeingAPI.outwardDetails` + `saveOutwardDetails` added (nothing else touched) |
| src/screens/dyeing/dyeingApi.ts | `DyeingService.outwardDetails` / `saveOutwardDetails` |
| src/screens/dyeing/dyeingOutward.ts | NEW — reads outward_details response, groups rows by colour |
| src/screens/dyeing/OutwardLotSection.tsx | NEW — Select Outward (help) + Lot No. + Add, table, edit |
| src/screens/dyeing/ColourStatusSheet.tsx | Lot No. block in every colour, Qty removed, status trail chips |

## Flow (Status sheet → each colour)
1. **Select Outward** → help list from `GET /dyeing/outward_details?prptype&chartno&yearno`
2. Type **Lot No.** → **Add** → `/dyeing/save_outward_details?prptype&chartno&yearno&uid&srno&lotno`
   (uid + srno = selected outward line; prptype / yearno from session, chartno from browse)
3. outward_details + priority_browse re-fetched → saved rows show in table (Outward No. | Lot No.)
4. **Edit**: tap a row → outward locked, change lot no. → **Update** (same save API)
5. Status (Sent / Dying / Finish / Job inward / Lorry Cut) same as before — **no Qty** (full lot qty is sent).
   Lot No. is read-only in the status form once the lot has one.

## Notes
- save_outward_details is called as GET with query params; if the route answers 405 it re-sends as POST.
- Response keys are read tolerantly (uid/UId, srno/SrNo, ChallanNo/OutwardNo/VouNo, LotNo, Date, Qty, ShdCode/ShdName).
  If a column shows empty, check the console log `[Dyeing] outward_details response ->` and add the key in `dyeingOutward.ts`.
- If rows carry ShdCode/ShdName they appear under that colour; with no shade info and a multi-colour chart they appear once at the top ("Lot No. — all colours").
