# One ERP · Dark theme · Settings (6 Oct 2026)

## 1. Legacy / New selection removed

There is one ERP now (the routes under `app/new/`). Legacy screen code and Legacy route files are still in the
project, but nothing leads to them any more.

| Where | Before | Now |
|---|---|---|
| `app/(all)/lookup-select.tsx` | "Select ERP Platform" (Legacy / New) | redirect to the ERP sign-in (kept so old links do not break) |
| `app/(all)/lookup-select_new.tsx`, `lookup-select_old1.tsx` | old copies of the selection screen (reachable by URL) | deleted |
| `app/(all)/landing.tsx` | Login -> selection screen; a Legacy session opened the Legacy home | Login -> `/new/property-select`; a signed-in user always opens `/new` |
| `app/_layout.tsx` | boot: NEW -> `/new`, otherwise Legacy home | boot: signed in -> `/new`, otherwise landing |
| `app/embed.tsx` | iframe showed "New ERP / Legacy ERP" | signs in and opens the ERP directly; on failure shows the reason + "Try again" |
| `app/new/property-select.tsx`, `role-login.tsx`, `RoleLoginScreen.tsx` | wording "New ERP" / "Legacy ERP", Back -> selection | wording "ERP", Back -> landing |
| `app/(all)/signup.tsx` | "Sign in" link -> Legacy login | -> `/new/property-select` |
| `notification-access-denied.tsx` (3 copies) | Home depended on the platform | Home = `/new` |
| `CollectionFooter.tsx` (NEW), `HeaderNew.tsx` | Home -> Legacy tabs | Home -> `/new/(tabs)` |

`src/core/singleErp.ts` (`ensureSingleErp`) keeps the stored key `LOOKUP_PLATFORM` at `NEW`. A device that is still
signed in to the Legacy platform (a token but no ERP `app_session`) is signed out once and lands on the landing page —
the user signs in again. Login, property selection, rights and every API call are unchanged.

## 2. Dark theme

- Modes: **Light** (default — the app looks as before), **Dark**, **System**. Saved on the device
  (`AsyncStorage 'erp_theme_mode'`, mirrored in `localStorage` on the web).
- Where it can be changed: Settings; header (tablet / desktop: sun-moon button, phone: gear -> Settings); desktop
  sidebar footer; the sign-in screens.
- How it works (`src/core/theme/`): screens are NOT edited. `themeRuntime.ts` wraps React's element builders
  (`jsx`, `jsxs`, `jsxDEV`, `createElement`). In dark mode every `style` / `…Style` prop and the colour props
  (`color`, `placeholderTextColor`, `colors`, `fill`, `stroke` …) are converted by `themeColors.ts`:
  theme tokens (`T.*`) -> the designed dark palette (`DARK`), any other colour -> by role (background / text / border).
  In light mode the wrapper passes everything through untouched.
- Theme change rebuilds the screens under `app/new/_layout.tsx` once (`ThemeRoot`); the open route is kept.
- To tune the dark colours edit `DARK` in `src/core/theme/themeColors.ts`. Kill switch: `THEME_RUNTIME_ENABLED`
  in `themeRuntime.ts` (false = the app is always light).
- Not converted: content inside a WebView (PDF / HTML report previews), pictures, and colours that are animated
  between two values. Chart lines and tracks drawn with `react-native-svg` are converted (`fill` / `stroke`).

## 3. Settings (`/new/settings`)

Opened from the header gear, the desktop sidebar and Profile. No right is needed — it only changes the user's own view.

- **Appearance** — Light / Dark / System.
- **My screens** — lists exactly the screens the user's rights allow (same list the menu is built from, in
  `src/core/userPrefs/useMyScreens.ts`). Switching one off removes it from the bottom bar, the More sheet and the
  sidebar for that user on that device (`AsyncStorage 'erp_hidden_screens_v1:<property>:<user id>'`). Rights are not
  changed: a hidden screen still opens from a notification or a link. Home is always shown and at least one other
  screen stays on.

## 4. Checked / not checked

- Colour rules: every colour literal in the 646 files the ERP loads (1,275 values x 5 roles) converts without error
  and gives the same result when converted twice; text tokens meet WCAG AA on every dark surface; 1,413
  text / background pairs taken from the project that are readable in light stay readable in dark.
- Browser run (desktop + phone widths): theme change from Settings, saved + restored on reload, System mode follows
  the device, going back to Light gives byte-identical markup to before; My screens list = rights list, hide / show /
  search / Show all, saved per user + property; Yarn Sales Order, Settings, the sign-in shell and an old-style
  (hard-coded colours) sample checked for leftover light surfaces and unreadable text.
- NOT done: a run on a phone or of the full app (dependencies cannot be installed in the build sandbox). Please
  check on Android, iOS and web: theme change, the charts (Expense, Quarter Summary, dashboard), and one sign-in on a
  device that was on Legacy.

## Public pages (landing, sign up, about, contact, pricing)

These pages are outside the NEW ERP navigator, so `ThemeRoot` does not rebuild
them. Each page calls `useTheme()` at the top: when the theme changes the page
is drawn again in the new colours and nothing typed on it is lost.

- Landing: theme button in the top bar (next to Login) on phone, tablet and web.
- Sign up: the theme button in the header now switches the whole page
  (before, only the button itself changed).
