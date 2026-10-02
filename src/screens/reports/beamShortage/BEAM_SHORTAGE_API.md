# Reports → Beam Shortage — API contract (frontend ↔ backend)

Route (change only `LEGACY_ROUTES.beamShortageReport` in `src/api/legacyClient.ts` if named differently):

    POST /api/reports/beam_shortage
    { "prptype": "S", "prpcode": "SIP", "yearno": 27, "fromdate": "2026-04-01", "todate": "2026-10-02" }

* `yearno` is the ERP year of the selected range (previous-FY preset sends session year − 1).
  The range is always inside ONE financial year.
* Only beams with `islasttaka = 1` (completed).
* `fromdate` / `todate` filter the beams — the date they are applied on is the backend's choice
  (ERP Designing uses the beam completion / last-taka date).

## Response — any ONE of these is accepted (keys are case-insensitive)

A. Summary + detail (as asked in the backend prompt):

    { "success": true, "data": {
        "designs": [ { "dsncode": "D1", "dsnname": "Rib Stop 145", "itmname": "SPORTS",
                       "warpedmtr": 1166.67, "producemtr": 1090, "shortagemtr": 76.67, "shortageper": 6.57 } ],
        "details": [ { "dsncode": "D1", "beamno": "B1", "macname": "R-01", "warpingdate": "01/08/2026",
                       "warpedmtr": 666.67, "producemtr": 600, "shortagemtr": 66.67 } ] } }

B. Detail nested per design: `designs: [ { dsncode, dsnname, ..., beams: [ { beamno, ... } ] } ]`

C. Flat rows straight from the query (one row per beam × design):
   `dsncode, dsnname, itmname, beamno, macname, warpingdate, warplen, productionmtr, balmtr, islasttakadone, yearno`
   — here the screen does the distribution itself with the same rule.

## Calculation rule (same on both sides)

    beam shortage      = warplen − Σ produced of the beam          (= balmtr)
    design share       = beam shortage × design produced ÷ Σ produced of the beam
    warped (design)    = produced + design share
    shortage %         = shortage ÷ warped × 100                    (from summed metres, never an average of %)

When detail rows are sent, the design rows and grand total on screen are summed from the detail rows,
so summary and drill-down always agree. Optional detail fields used if present:
`dsntype` (YD / PD → enables the yarn/piece-dyed filter), `lasttakadate` (shown instead of warping date).

## Final backend (BeamShortageReportController) — what it returns

Shape A above, plus `total` and `context`. Period is applied on the beam's **last-taka date**
(`MAX(ChkDate)` of its `islasttaka` rows); each detail row carries `lasttakadate`, `warpingdate`,
`gaittingdate` as `YYYY-MM-DD`, `shared` (1 when the beam ran more than one design) and `beamuid`.

## Mock / live switch (frontend)

`beamShortageApi.ts` → `USE_MOCK = true` serves `beamShortageMockData.ts` (16 beams over FY 25-26 and
FY 26-27, three of them shared between two designs) in exactly the controller's response shape; the
screen shows a "MOCK DATA" tag. To go live follow the 3 steps at the top of `beamShortageApi.ts`.
