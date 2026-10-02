# Visitor module (NEW ERP) — Visits + Visitors Report

Two screens, same pattern as Fabric Stock / Yarn Stock (route → PermissionRouteGuard → screens/production wrapper → component).

| Screen | Route file | Wrapper | Component | Permission |
|---|---|---|---|---|
| Visits (watchman, English / Hindi) | `app/new/(tabs)/visits.tsx` | `src/screens/production/VisitsScreen.tsx` | `src/components/VisitorsNEW/` | `production.visits` |
| Visitors Report (English) | `app/new/(tabs)/visitors-report.tsx` | `src/screens/production/VisitorsReportScreen.tsx` | `src/components/VisitorsReportNEW/` | `production.visitors_report` |

Existing files changed (additions only):
- `src/registry/modules/production.module.ts` — 2 permission resources + 2 `{ nav, screen }` node pairs.
- `app/new/(tabs)/_layout.tsx` — 2 lines in `HEADER_CONTENT`.

## Rights

| Resource | Action | What it controls |
|---|---|---|
| `production.visits` | `view` | open the screen, see entries and photos |
| | `add` | "New Visitor Entry" button |
| | `edit` | "Edit" in the entry details |
| | `checkout` | "Mark OUT" and "Undo OUT" |
| | `delete` | "Delete" in the entry details and inside the edit form |
| `production.visitors_report` | `view` | open the report |
| | `edit` | "Edit" in the visit details (opens the same form) |
| | `delete` | "Delete" in the visit details / edit form |
| | `export` | Excel, PDF and Print buttons |

After deploying: log in once as Platform Admin (registry auto-sync), then assign these to the roles in Permission Manager.
Typical watchman role: `production.visits` → view + add + checkout (+ edit).

## No masters

Nothing in the form comes from a master table. Everything is typed, and the app helps from EARLIER VISITS:
- mobile / name / company (typed together for every person) → people who came before are listed and fill the form (exact 10-digit mobile fills by itself) — `visitor_search`
- company, whom to meet → words used before are shown as tap-to-fill chips — `visitor_suggestions`
- a person added to the same entry starts with the first person's company (can be changed)

## Entry form

1. Who has come? — mobile, name, company, photos (face / visiting card / other) per person; more details: post, second mobile, gender; "others with them".
2. Why have they come? Whom to meet? — purpose, work details, whom to meet, appointment.
3. Time and note.

## Report periods

- Presets: Today, Yesterday, Last 7 days, This month, Last month, This year, Last year, Custom. ‹ › steps a day / month / year.
- Tab "Day / Month / Year": day-wise (every day of the period, counted from the rows on screen), month-wise (12 months of the period's year) and year-wise (every year) — the last two come from `visitor_period_summary`. Tap a row to drill down: year → months → days → register.
- Excel has the sheets Register, Visitors, Day-wise, Month-wise, Year-wise, Summary; the PDF / print-out has the same tables (day-wise up to 62 days).

## Files

`VisitorsNEW/`
- `model.ts` — types (`Visit`, `VisitPayload`, `VisitorProfile`, `VisitorSuggestions`), choice lists with English + Hindi labels, helpers.
- `i18n.ts` — every English / Hindi text of the Visits screen and both guides. Change wording here only.
- `api.ts` — every HTTP call (Laravel `VisitorController`). `USE_MOCK = false` → real APIs, `true` → sample data.
- `mockData.ts` — sample data, used only when `USE_MOCK = true`.
- `photos.ts` — camera / gallery, photos shrunk to small JPEGs.
- `ui.tsx` — fields, chips, photo strip, small previews (`PhotoThumbs`), full-screen viewer (`PhotoViewer`), suggestions.
- `GuideSheet.tsx` + `GuideArt.tsx` — guide as a grid of cards, each with a small picture of that part of the screen.
- `VisitForm.tsx`, `VisitDetailSheet.tsx`, `index.tsx` — form, details, list.

`VisitorsReportNEW/`
- `reportModel.ts` — period (day / month / year / last 7 / custom), filters, KPIs, breakdowns, day / month / year totals, unique visitors (pure functions).
- `index.tsx` — UI.
- `ExportPreview.tsx` — preview before download (Excel sheets with tabs / PDF) with the Download button.
- `exportReport.ts` — prepare + save Excel, prepare + save PDF, print.
- `exportModel.ts` — what an export is built from, brand colours, KPI tiles.
- `reportSheets.ts` — the 6 Excel sheets as data (used by the file AND the preview).
- `xlsxLite.ts` — writer for real styled .xlsx files (colours, borders, frozen header, filter). No library.
- `reportPdf.ts` + `pdfLite.ts` — the colourful PDF on web (no library; English / Latin letters only).
- `reportHtml.ts` — the same design as HTML: Print, and the PDF + its preview on Android / iOS (all scripts).

## Backend

Laravel code is in the `backend/` folder of the delivery (migration, 2 models, `VisitorController`, routes). The endpoint list is at the top of `api.ts` and of the controller.

Demo without a server: set `USE_MOCK = true` in `api.ts`.
