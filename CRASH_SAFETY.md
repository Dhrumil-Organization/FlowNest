# Crash safety (Android / iOS / web)

## 1. Expense report — `src/screens/reports/ExpenseScreen.jsx`

Layout, colours, numbers and API calls are unchanged. What changed:

| Area | Before | Now |
|---|---|---|
| Numbers (`fN`, `fINR`, …) | `toLocaleString("en-IN", …)` (Intl) | built by hand (`formatIN`) — same text (checked on 100,110 values), no Intl, works the same on Hermes and JavaScriptCore |
| Month / date text | `toLocaleString("en-US")`, `toLocaleDateString("en-GB")` | fixed month names (`MONTHS_SHORT`) |
| `.toFixed()` on API fields (`section_a_pct`, `rapier_pct`, `costPct` …) | threw when the API sent text | `fx()` — never throws |
| Donut / mini donut rotation, chart coordinates, % widths | could become `NaN` / `Infinity` (iOS raises on these, Android ignores them) | `num()` / `clampNum()` — always a finite number inside the plot |
| Blanks from the API (`days`, `label`, `unit_rate`, `kwh_total`) | printed `NaN` / `undefined` | printed as `0` / blank |
| Chart, donut, utilities, past month, daily-trend sheet, avg picks | an error closed the screen / app | each sits in `SafeBlock` — only that block shows "Retry" |
| Route `app/new/(tabs)/reports/expense.tsx` | no error screen | `ErrorBoundary` like the other reports |

`src/hooks/useExpenseData.js`: month label without Intl (one line).

## 2. Whole app — `src/core/crash/ScreenErrorBoundary.tsx`

- `ScreenErrorBoundary` / `screenGuard`: every screen is wrapped
  (`app/_layout.tsx`, `app/new/_layout.tsx`, `app/new/(tabs)/_layout.tsx`,
  `app/new/(tabs)/reports/_layout.tsx`). A screen that fails shows
  "Something went wrong on this screen — Try again"; header, menu and the other
  screens keep working. Opening the module again from the menu also clears it.
- `installCrashGuard()` (called in `app/_layout.tsx`): an error outside drawing
  (button handler, timer, promise) is logged and the app stays open. Development
  builds still show the normal red error screen.
- Use `<SafeBlock name="…">` around any risky block (chart, map, PDF preview) in
  other screens.

What this cannot catch: a crash inside native code (out of memory, a native
module). Those need the device crash log.

## 3. Check before the next iOS build

`app.json` → `ios.jsEngine` is `"jsc"`. React Native 0.81 (Expo SDK 54) no longer
ships JavaScriptCore; Android runs Hermes. Running a different engine on iOS is
the usual reason a screen fails only on iOS. Recommended: remove that line (iOS
then uses Hermes, same as Android) and test a build. Not changed here because it
is a build setting.
