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
