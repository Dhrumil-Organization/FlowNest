# Global Search (6 Nov 2026)

One search box for the whole app. It finds screens, sub-screens, tabs, dashboard cards,
reports and actions, and `/help` explains them. It only ever shows what the logged-in
user's rights allow.

## Where it is
- **ERP (Sudamo / Knits and Rayons):** the 🔍 button in the header of every screen (a
  "Search… Ctrl K" pill on tablet and desktop). On web, **Ctrl K / ⌘ K** or **/** opens it.
- **Mill Hub:** a "Search Mill Hub…" bar on top of the Mill page. It searches Mill pages
  only, never ERP screens.

## What you can type
| Type | Result |
|---|---|
| `yarn stock`, `new production order`, `approve`, `print label` | screens, tabs, cards, reports, actions |
| `pot`, `so`, `febric`, `recievables` | short forms and typos work |
| `customer outstanding`, `greige`, `godown` | ERP / textile synonyms |
| `/help` | how the search works, plus every screen you can open |
| `/help visits`, `? visits`, `how to add visitor` | help: what the screen does, where it is, steps, **your rights there** (and what is not given to you) |
| `/recent`, `/all` | your recent picks / all your screens |

## Rights and separation
- ERP index = UI registry + permission registry → `filterByRights(canAccess, canDo)` from the
  PermissionProvider. Those are the same checks the menu and `PermissionRouteGuard` use.
- **Sudamo / Rayons**: grants come from the property you are logged in to. A property switch
  logs in again, so the search rebuilds and only shows that property's screens. Recent picks
  are saved per property and per user.
- **Mill Hub**: `mill.*` resources are left out of the ERP index. The Mill index is built only
  from `mill.*` and checked with the user's **Mill Hub rights** (`millCan` on the MillSession).
  Inside the Mill page, `window.__millNav` only opens pages that are in the page's own
  rights-filtered NAV.

## New screens: nothing to change in the search
Add a screen the normal way (permission resource + nav node + route file). Its title,
menu folder, tabs, cards, reports and actions are found from the registries automatically,
and `/help` builds its help from them.

Sub-screens inside tab folders (`reports/…`, `costing/…`, `designs/…`) are found by
`scripts/build-global-search-index.js`. It runs by itself on `npm start / web / android /
ios / build:web / install` and writes `src/features/globalSearch/generated/routes.generated.ts`.
It reads the rights from `<PermissionRouteGuard resource=…>` or from the hub card. Sub-screens
that need route params (drill-downs) are skipped.

Optional, for nicer help (no search code involved): on the nav node add
`metadata: { help: '…', keywords: ['…'], steps: ['…'] }`. The existing screens'
plain-language help is in `src/features/globalSearch/helpContent.ts`.

## Files
- `src/features/globalSearch/` — `erpIndex.ts`, `millIndex.ts`, `searchEngine.ts`,
  `searchText.ts`, `helpContent.ts`, `GlobalSearchModal.tsx`, `GlobalSearch.tsx`,
  `MillSearch.tsx`, `store.ts`, `useErpSearchIndex.ts`, `types.ts`, `generated/`
- Changed: `src/components/layout/AppHeader.tsx` (button), `app/new/(tabs)/_layout.tsx` (search
  opens tabs the same way the menu does), `src/mill/MillShell.tsx` (Mill bar),
  `src/mill/MillHubFrame.tsx` + `src/mill/millBridge.ts` (open a Mill page),
  `src/mill/millHubHtml.ts` + `tools/build_mill_html.py` (patch 11: `window.__millNav`),
  `package.json` (scanner hooks)

## Update 2 (6 Nov 2026): voice, animated logo, filters, smarter matching
- **Fixed: the list kept scrolling down by itself.** Hovering a row selected it and scrolled the list,
  which put a new row under the mouse, and so on. Now only the ↑ ↓ keys scroll the list. Tested in a
  browser: scroll position stays the same while the mouse moves over the list.
- **Voice search 🎤** (English India / हिंदी, saved per device). There is a live waveform and the
  animated FlowNest logo that grows with your voice, and the words show as you speak. Saying
  "… kholo / open …" opens the best match after 1 second (Cancel or Esc stops it).
  Android / iOS use `expo-speech-recognition` (added to package.json + app.json plugin, so **a new
  dev / store build is needed**). Until that build is installed, the mic button just does not show.
  Web uses the browser speech API (Chrome, Edge, Safari).
- **FlowNest logo, alive:** in the header button, the search box and the voice screen (native-driver
  animation).
- **Filter chips with counts:** All · Screens · Tabs · Cards · Reports · Actions. With an empty box,
  tap a chip to see everything of that kind you can open.
- **Best match card** with Open / How to use (Enter opens it).
- **Smarter matching:** Hindi (Devanagari) text from voice is turned into Latin letters, sound-alike words
  match ("stok" = stock, "prodakshan" = production), Hinglish works ("mujhe yarn ka stock dekhna hai",
  "payable dikhao", "collection kaise karte hain" → help), and word endings match ("sampling" = "samples").
- Accuracy test: 60 real queries (English, Hinglish, Hindi script, typos, short forms, help):
  **59/60 have the expected screen in the top 3.** About 7 ms per search.

## Checked
- Real registries: 89 screens, 36 tabs, 11 cards, 6 reports, 6 sub-pages and 155 actions
  indexed. No `mill.*` entry in the ERP index.
- Rights tests: a Sudamo grant set and a Rayons grant set each see only their own screens.
  Denied actions are hidden. `/help` never explains a screen without rights. The Mill search
  sees only Mill pages with Mill rights. A newly registered screen appears with no search change.
- The Mill page in a browser: `__millNav('lots')` opens Lot Board, and a page without a right
  does not open.
- The search window, rendered with react-native-web at phone and desktop widths: search, help,
  empty and keyboard (Enter) states.
- NOT done: a run on a device or against the real server.
