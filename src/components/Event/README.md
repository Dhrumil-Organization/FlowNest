# Event module — React Native → Expo (updated)

This is the Expo-ready version of your Event enquiry module. Existing behaviour
is fully preserved — the offline-first flow, sync queue, card scan, reports and
edit/delete all work the same. The differences are in *how* the native pieces
are accessed (Expo modules instead of bare-RN modules) plus a UI polish pass.

It runs on **Android and iOS** through Expo (Expo Go or a dev/EAS build).

---

## The one thing that was actually broken: the SQL cache

Your `db.js` had been ported to `expo-sqlite`, but it mixed two **incompatible**
APIs:

```js
// OLD (broken on Expo)
dbInstance = SQLite.openDatabase('bharattex.db');   // legacy WebSQL API
await db.execAsync(INSERT_SQL, [ ...params ]);       // execAsync IGNORES params
```

In modern `expo-sqlite`, `execAsync()` runs a raw SQL string and **does not accept
bind parameters**. So every parameterised write — `insertEnquiry`, `markSynced`,
`markFailed`, `markSyncing`, `updateEnquiryLocally` — was silently doing nothing.
`SELECT`s happened to still return rows, which is why it *looked* half-working.

`db.js` is now rewritten to the correct async API:

| Operation            | Correct method                          |
|----------------------|------------------------------------------|
| Open database        | `await SQLite.openDatabaseAsync(name)`   |
| Schema / migrations  | `db.execAsync(sqlString)`  (no params)   |
| INSERT / UPDATE / DELETE | `db.runAsync(sql, [params])`         |
| SELECT (many rows)   | `db.getAllAsync(sql, [params])`          |
| SELECT (one row)     | `db.getFirstAsync(sql, [params])`        |

Extra robustness added (no behaviour change):
- `PRAGMA journal_mode = WAL` so a background sync can write while the UI reads.
- A single shared connection *promise* so concurrent calls on first launch open
  the DB and create the schema exactly once (no race).
- Idempotent `ADD COLUMN` migrations for older installs.

---

## What changed in each file

| File | Change |
|------|--------|
| **db.js** | Rewritten to the correct `expo-sqlite` async API (the real fix). Caching via AsyncStorage is unchanged. |
| **CardScanService.js** | Connectivity via `expo-network`, camera via `expo-image-picker`. Dead RN code removed. |
| **syncService.js** | `@react-native-community/netinfo` → `expo-network`. Logic unchanged. |
| **syncQueue.js** | Same `expo-network` swap. Retry + progress-callback logic unchanged. |
| **api.js** | No functional change (axios + AsyncStorage are JS-only and already Expo-safe). |
| **index.tsx** | Removed a broken `getDesigns` import (never exported by db.js). Polished stylesheet (design tokens, soft shadows, consistent radii/typography). Fixed an invalid `color: '#0000'`. All logic and JSX untouched. |
| **EnquiryReportScreen.js** | Polished stylesheet only. |
| **EnquiryReportDrilldownScreen.js** | `react-native-vector-icons/MaterialIcons` → `@expo/vector-icons` (bundled with Expo, zero native linking). Polished stylesheet. |

### Module replacement summary
```
react-native-sqlite-storage      ->  expo-sqlite
@react-native-community/netinfo  ->  expo-network
react-native-image-picker        ->  expo-image-picker
react-native-vector-icons        ->  @expo/vector-icons
```

---

## How to drop this in

1. **Copy the 8 files** over your existing ones (same relative paths in your
   project). They keep your original import paths (`@/components/...`,
   `../../common/...`), so nothing else needs to move.

2. **Install dependencies** — see `expo-setup-reference/INSTALL.txt`. Short version:
   ```bash
   npx expo install expo-sqlite expo-network expo-image-picker @expo/vector-icons \
       @react-native-async-storage/async-storage @react-native-picker/picker
   npm install axios
   npm install --save-dev babel-plugin-module-resolver
   npm uninstall react-native-sqlite-storage @react-native-community/netinfo \
       react-native-image-picker react-native-vector-icons
   ```

3. **Merge the config** in `expo-setup-reference/` into your project:
   - `app.json` — add the `expo-image-picker` + `expo-sqlite` plugins and the
     iOS camera/photo permission strings (iOS **requires** these).
   - `babel.config.js` + `tsconfig.json` — register the `@/` alias so the
     `@/components` / `@/common` imports resolve. Point the alias at your real
     source root (`./` or `./src`).

4. **Run it**:
   ```bash
   npx expo start -c        # Expo Go, cache cleared
   # or a dev build:
   npx expo run:android
   npx expo run:ios
   ```
   > If you changed `app.json` plugins or native deps and use a custom dev
   > build, run `npx expo prebuild --clean` first.

---

## Quick sanity check after install

- Turn airplane mode on, create an enquiry, confirm it saves (it should appear
  in the report list / pending queue) — this exercises `runAsync`.
- Turn connectivity back on — the sync queue should push pending rows and the
  banner should report synced/failed counts.
- Scan a visiting card while online — `expo-image-picker` opens the camera,
  `expo-network` confirms connectivity, OCR fields populate the form.

---

## Notes

- The `@/` alias is **not** built into Expo; the babel + tsconfig step above is
  what makes those imports work. If your project already resolves `@/`, just
  make sure the new files use the same root.
- Use `npx expo install` (not `npm install`) for any Expo SDK package so the
  versions always match your installed SDK.
