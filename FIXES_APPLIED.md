# FlowNest fixes applied

## 1. Black-screen / RNSnackbar crash
- Removed all active imports of `react-native-snackbar` from application source.
- Added `common/utils/snackbarCompat.ts`, which preserves the existing `Snackbar.show(...)` call shape but routes messages through the app's existing Expo-safe Snackbar component.
- Removed `react-native-snackbar` from `package.json` and `package-lock.json`.
- Existing Snackbar messages/actions remain supported.

## 2. Priority drag
- Priority uses `react-native-draggable-flatlist` for long-press drag/reorder and automatic vertical autoscroll.
- Existing priority API/payload/permission logic is retained.

## 3. ERP property switching
- Common AppHeader contains the Sudamo/Knits <-> Rayons property switch.
- Switching securely re-authenticates using credentials stored in Expo SecureStore, refreshes token/session/permissions, and refreshes the current route.
- API host mapping:
  - Sudamo/Knits: `https://apig.tms-webapp.com`
  - Rayons: `https://apiy.tms-webapp.com`
- `initAPI`, `initAPIForSticker`, and `initAPIForPrinterList` compatibility is retained.

## 4. Cold-start property state
- `selected_property` is restored into `AppSessionStore` during hydration instead of being reset to null.

## After extracting
Run:

```bash
npm install
npx expo start -c
```

For a native/dev build, rebuild the native app after dependency changes:

```bash
npx expo run:android
```

or use your EAS development/preview build profile.
