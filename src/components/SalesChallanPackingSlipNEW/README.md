# SalesChallanPackingSlipNEW

The React Native rebuild of the web `SalesChallanPackingSlip.js`, written to match `PackingAutomationNEW`. It uses the same theme (`T`), the same building blocks, the same layout (step bar, sections, footer of `Btn`s, carried-forward summary, two columns on tablet and web) and the same shared pieces. It calls the same Laravel endpoints with the same params.

Drop the folder into `src/components/`.

## Uses from your app (nothing new to install)

| From | What |
|---|---|
| `@/src/theme` | `T`, `S` |
| `../PackingAutomationNEW/ui` | `Section`, `PickerField`, `TextField`, `Btn`, `LinkBtn`, `Notice`, `ErrorText`, `Hint`, `FieldLabel`, `u`, `tab` |
| `../PackingAutomationNEW/RouteStep` | `FacilitySheet` (property / year / store) |
| `../ProductionOrderNEW/ui` | `ServerPicker` (party), `confirmAsync` |
| `../StockVerificationNEW/ui` | `Sheet`, `Btn` (pending orders, production type) |
| `@/src/core/business` · `@/src/core/permissions` | `useBusinessContext`, `usePermission().canDo` |
| `@/common/utils/compatibleStorage` | last facility used |
| `../WarehouseNEW/useUrovoScanner` · `../WarehouseNEW/model` | Urovo scan engine (`useUrovoScanner`, `triggerUrovoScan`) and `cleanScannerValue` |
| `../ProductionOrderNEW/DateField` | From / To date on the list |
| `expo-camera`, `@expo/vector-icons/MaterialIcons`, `axios` | already used by PackingAutomationNEW |

## Wiring: same 4 steps as every NEW screen (see the header of production.module.ts)

| # | File | What |
|---|---|---|
| 1 | `src/registry/modules/production.module.ts` | Resource `sales_challan_packing_slip` under `production` (displayOrder 165), with actions view · add · edit (Modify) · delete (dangerous) · scan · assign |
| 2 | same file, `registerUiNodes` | `nav.sales_challan_packing_slip` (route `sales-challan-packing-slip`, icon `local-shipping`) + `screen.sales_challan_packing_slip` |
| 3 | `app/new/(tabs)/sales-challan-packing-slip.tsx` | `PermissionRouteGuard resource="production.sales_challan_packing_slip" action="view"` |
| 4 | `src/screens/production/SalesChallanPackingSlipScreen.tsx` | `ErpSessionGate` wrapper → `<SalesChallanPackingSlipNEW token API />` |

- No `_layout.tsx` edit is needed. The header title comes from the nav node.
- No `registry/index.ts` edit is needed either, because `production.module` is already imported there.
- The new resource reaches the backend through the registry auto-sync on the next Platform Admin login. A SuperAdmin sees it right away. Other roles need a grant in Permission Manager.

## Screens (same shape as ProductionOrderNEW)

| File | Web | What |
|---|---|---|
| `SlipList.tsx` | SalesChallanPackingSlipBrowse.js | The list. It shows the facility, **+ New packing slip**, a search box, period pills (Today · 7 days · This month · This FY · All) and a ⚙ panel for From/To dates, "Search in" and Sort. There is one card per slip with View · Scan · Modify · Delete, pull-to-refresh, and "Show more" after 30 slips. |
| `SlipForm.tsx` | SalesChallanPackingSlip.js | One slip in add, view, edit or scan mode. "← Packing slips" goes back to the list, and the list reloads after a save or delete. |
| `index.tsx` | — | Switches between the list and the form, and owns the facility and rights. |

`packslipbrowse` returns every slip of the facility, the same as the web's "Load data". All filtering happens on the device. The browse sends one row per slip line, and the list groups them into one card per UId.

## Rights inside the screen (like ProductionOrderNEW)

The screen never checks `view` itself, because the route guard already did. It reads a `rights` object from `canDo('production.sales_challan_packing_slip', …)`:

| Action | Controls |
|---|---|
| `add` | + New packing slip, and its Save. |
| `edit` | Modify (on the list card and in view), and its Save. |
| `delete` | Delete (on the list card and in view). Uses `confirmAsync(…, true)` (destructive). |
| `scan` | Scan (on the list card and in view), and Save cartons. |
| `assign` | Web `rights[0].assign`. When set, pending orders are added without the print party. |

- Buttons for missing rights are hidden, not shown disabled.
- A mode the user can't use (for example `mode="scan"` without `scan`) falls back to view.

## Party = AllPartyDataSCPS (`PartyField.tsx`)

1. The help list calls `accountbasic`. It is searched on the server, 20 at a time. Each row shows code, city, GSTIN, MH and SH.
2. On pick, `accountget` fills the form: `ParCode`, `ParName`, `BADDRESS`, broker, D-address, `DueDay`, `GSTIN`, `PanNo`, `DlvAcc` and the rest, the same as the web's hasDueDay branch.
3. If GSTIN is blank, it shows "Party GSTIN cannot be blank." and clears the party.
4. `getlimit` merges `crlimit[0]` into the form.
5. Pending orders open by themselves when the property type is R, U, I, T, S or K and the store is not 0.
6. Changing to a different party asks first, then clears the order lines, stock and cartons.

## Fixes vs the web (kept out on purpose)

- Balance cartons after removing a carton is now `TotCarton − scanned`. The web showed the scanned count.
- A QR string that is not valid JSON no longer crashes the scanner.
- An invalid assign qty shows its reason under the field and keeps the last good value. The web used a popup and reverted silently.
- Save can't be tapped twice.
- Modify, Scan and Delete only show in the modes where they make sense. On the web, Modify was always hidden, and Scan/Delete showed on a new slip.

## Still to confirm

- **Store name** is read from `getstore` as `StrName` / `SName` / `StrDesc`. Only the code shows if none of these exist.

## Scanner devices (same as WarehouseNEW)

In scan mode, every line has two buttons: **Hardware scanner** and **Mobile camera**. The one you tap is the scanner type for that line's carton screen.

The carton screen has two views:

1. **Locations** — the Summary card, the scanner bar, and a table with one row per warehouse location (`WarehouseLoction` from `getcartondetail`): **Location · Cartons · Net wt. · Selected (n · qty)**, with a **Total** row. Locked cartons and cartons already on other lines of this slip are counted under the row.
   - **Tap a location** to open its cartons.
   - **Tick a location** to select every free carton there (it asks first if that goes over the balance qty). Tick it again to take them all off (asks first).
   - **All cartons** at the bottom opens every location together.
   - **Back to slip · n cartons** is the only way back to the slip with the selection (Done of the web).
2. **Cartons** (one location, or all) — search, chips (All · Selected · To pick · Locked), and the cartons. There is no Scan button per carton:
   - **Tap a carton** (○) to pick it by hand; it is tagged *Picked by hand*. Tap ✓ to take it off (asks first).
   - **Scanning works on both views.** With the hardware scanner, the scanner bar is always listening and a scanned label is selected straight away, from any location. With the mobile camera, **Scan QR** opens the camera; a good scan selects the carton and comes back.
   - **Type a label** is there for a damaged sticker.
   - **Done · n in <location>** goes back to the Locations summary.

A carton on this slip is no longer returned by `getcartondetail`, so its location is remembered for the app session and it stays under its location after Done or a save. A carton saved in an earlier session whose location is not known shows under **Saved earlier**.

Every selection — scan, hand pick or a whole location — goes through the same checks (`pickCarton` in `rules.ts`): locked or already on a line → refused, with the reason in a red strip. Cartons already saved on a saved line (`D1Flag = 1`) stay, as on the web. Back goes camera → cartons → locations → slip.

| Device | Behaviour (copied from WarehouseNEW HardwareScanStep / CameraScanStep) |
|---|---|
| Hardware scanner | **Urovo engine:** uses `useUrovoScanner`. A status pill shows *ACTIVE — use trigger*, *listening (check Scanner Settings)* or *no Urovo engine*, and the on-screen button fires `triggerUrovoScan`. **Keyboard-wedge scanners:** a hidden input re-focused every 500 ms. Text over 5 characters is taken after 120 ms, or on Enter. Both paths share one 800 ms gate. |
| Mobile camera | expo-camera with the back camera, a torch, and qr / ean13 / code128. On refusal it shows "Camera Permission Required", and OK switches back to the hardware scanner. A 350 ms lock applies, and the same QR is ignored until it has been out of frame for 700 ms. |

The Urovo engine and the camera only run while their tab is open.

### In the browser (web build in Chrome on the handheld)

There is no Urovo native module in Chrome, so:

- **Hardware tab:** shows the pill *"BROWSER: keyboard scanner mode"*. `webWedge.ts` listens on the page and fills a hidden `<input inputmode="none">` inside the scanner. It catches characters sent as key presses and text committed by the scanner's keyboard app. A scan ends on Enter or Tab, or after 150 ms with no suffix. A bare Enter or Tab never "clicks" a focused button.
- **Camera tab:** `WebCameraScanner.web.tsx` uses Chrome's built-in `BarcodeDetector` (QR, Code 128, EAN-13, Data Matrix). Browsers without it fall back to expo-camera, which on web reads only QR, using jsQR fetched from cdn.jsdelivr.net. The camera needs **HTTPS**.

**Urovo setting for Chrome:** Scanner Settings → Output mode = **Keyboard / input method** (not Broadcast / Intent), with the **Enter** suffix on. The orange laser trigger button only works in the Android app build.

## Carton selection (scan screen)

`getcartondetail` is now called the same way as the web carton help (`CartonDetail/components/CartonSelect.fetchCarton`):

- `limit: ''` loads **all** cartons of the ItmCode + MerCode + GrdCode + ShdCode combination.
- `planninguid` / `planningsrno` link it to the order line.
- `TxnDate` (packing date), `txntype`, ttype `… '994', '992'`, and `selectedcarton` (this line's cartons) are sent too.

Each carton row returns `cartno`, `qty`, `chees`, **`WarehouseLoction`** (sic), `ProdType`, `GrdName`, `TranName`, `LotNo`, `lock`, `lockreason` and the QR strings.

The screen has these parts:

- **Summary:** cartons selected, net weight against the balance qty, location (the aisle, or "B-03 +1"), production type, then item, merge, shade and grade.
- **Carton list:** sorted by location so the picker walks the aisle. It has a search box (carton no., location or lot) and filters for All, Selected, To scan and Locked.
- **Selecting a carton** only happens by scanning its label:
  - The hardware scanner listens the whole time, in a slim bar above the list.
  - **Scan QR** in the app bar opens the scanner panel, where you can switch to the mobile camera or type a label.
  - **Scan / Scan QR** on a row asks for *that* carton. Any other label is reported as "Wrong carton" and not added.
- **Locked cartons** (`lock = 1`) are greyed out with their `lockreason`, and scanning one shows "Locked carton".
- **Saved cartons:** cartons already saved on this line stay in the list even if the stock call no longer returns them.
- **Footer:** "View selected (n)" and "Done · n". Done is still blocked when the selected qty is more than the balance qty, or when a carton is listed twice.
