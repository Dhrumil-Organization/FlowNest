# Priority — shade-wise status + Outward Lot No.

Same path pe replace/add karo (pichla zip ki jagah ye use karo):
- src/api/legacyClient.ts            — outwardDetails / saveOutwardDetails
- src/screens/dyeing/dyeingApi.ts    — outwardDetails / saveOutwardDetails / saveShadeStatus
- src/screens/dyeing/ColourStatusSheet.tsx  — REWRITTEN: shade-wise
- src/screens/dyeing/dyeingOutward.ts       — NEW
- src/screens/dyeing/OutwardLotSection.tsx  — NEW

Har shade card:
1. Shade naam + current status
2. Lot No.: [Select Outward] [Lot No.] [Add]  -> /dyeing/save_outward_details ; table Outward No | Lot No (✎ edit, same API)
3. [Sent for job] [Dying] [Finish] [Job inward] -> tap -> Save -> /save_priority_status (sirf us shade ka)
4. Date ke saath status chips: 29/09/26 Sent for job → 30/09/26 Dying

Lot-wise status, qty, split — sab hata diya. Har shade ka status alag.
