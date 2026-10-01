# FlowNest — "New Update Available" system (Web + Android + iOS)

Version ka **ek hi source** hai: `app.json` → `expo.version` (abhi `1.0.48`).

| Platform | User ko kya dikhega | Kab |
|---|---|---|
| **Web** | Upar banner: *"New update available · v1.0.49"* + **Refresh** button | Naya build upload karte hi — page khula ho to 5 min ke andar, ya tab par wapas aate hi |
| **Android** | Popup: Installed 1.0.48 → Latest 1.0.49 + **Update on Play Store** (Play Store app seedha khulta hai) | App open / background se wapas aane par |
| **iOS** | Popup + **Update on App Store** (App Store app seedha khulta hai) | Same. Apple par version live hote hi **automatic** |
| Force update | Popup me "Later" nahi hota — update karna hi padega | Jab `minVersion` set karo |

Code: `src/core/appUpdate/` (root `app/_layout.tsx` me `<AppUpdateGate />` mounted — Legacy + NEW ERP dono me chalega).

---

## 1. Web release (har baar)

```bash
npm run version:bump        # optional: 1.0.48 -> 1.0.49 (+ versionCode, buildNumber)
npm run build:web           # expo export + dist/version.json likhta hai
```
Phir **poora `dist/` folder** server par upload karo (jaise pehle karte the).
`dist/version.json` upload hona zaroori hai — isi se chalu browser ko pata chalta hai.

- Version change na bhi karo aur sirf dobara `npm run build:web` karke upload karo, tab bhi banner aayega (har build ka alag `buildId` hota hai).
- Release notes dikhana ho: `WEB_RELEASE_NOTES="Naye reports add hue" npm run build:web`
  (Windows cmd: `set WEB_RELEASE_NOTES=Naye reports add hue && npm run build:web`).
- ⚠️ Sirf `npx expo export -p web` chalaoge to `version.json` nahi banegi → banner nahi aayega. Hamesha `npm run build:web` use karo.

## 2. Android / iOS release (har baar)

1. `npm run version:bump` → `app.json` me version + `android.versionCode` + `ios.buildNumber` teeno badh jaate hai.
2. Build + submit (jaise abhi karte ho):
   `eas build -p android --profile production` / `eas build -p ios --profile production` → Play Console / App Store Connect.
3. **Store par LIVE hone ke baad** (Android: rollout 100% hone ke baad):
   ```bash
   npm run store:live -- android     # ya: ios / both
   ```
   Ye `public/app-update.json` me `latestVersion` set karta hai.
4. Ye file server par pahuchao: `npm run build:web` + `dist/` upload, **ya** sirf `public/app-update.json` ko web root me upload kar do.
   Iske baad jo bhi user purana app kholega, use popup aayega → button → seedha Play Store / App Store.

**iOS bonus:** App Apple se khud check karta hai (iTunes lookup, bundle id `com.dhrumil.FlowNest`), isliye App Store par version live hote hi popup aa jaata hai — step 3 bhool gaye tab bhi. Aur Apple par jo version abhi live nahi hai, uske liye popup kabhi nahi aata.

**Android:** Play Store ka koi official public version API nahi hai, isliye Android ke liye step 3 zaroori hai. Step 3 hamesha live hone ke **baad** hi karna, warna user Play Store pe jaake "Update" button nahi dekhega.

## 3. Force update (purana version band karna)

```bash
npm run store:live -- both --force          # latestVersion + minVersion = app.json version
npm run store:live -- android 1.0.50 --force # specific version
```
Jinka installed version `minVersion` se chhota hai unko blocking popup aayega (Later nahi). Force hatane ke liye `public/app-update.json` me `"minVersion": ""` kar do aur file dobara upload karo.

`public/app-update.json` format (haath se bhi edit kar sakte ho):
```json
{
  "android": { "latestVersion": "1.0.49", "minVersion": "", "storeUrl": "", "message": "" },
  "ios":     { "latestVersion": "1.0.49", "minVersion": "", "storeUrl": "", "message": "" }
}
```
- `message` — popup me apna text (khaali = default text).
- `storeUrl` — khaali chhodo (Android: `market://details?id=com.anonymous.FlowNest` apne aap; iOS: Apple se aata hai).
- `"enabled": false` — us platform ka popup band.

## 4. Zaroori baatein

- **Pehla release:** ye checker jis version me pehli baar jaayega (1.0.49), usse **pehle** ke installed apps (1.0.48 ya purane) me ye code nahi hai — unko popup nahi aayega. Next release (1.0.50) se sab accurate chalega. Web par ye turant kaam karega (next deploy se).
- **Config URL:** app `https://flownest.tms-webapp.com/app-update.json` padhta hai. Web kisi aur domain par host hai to build ke time `EXPO_PUBLIC_UPDATE_CONFIG_URL=https://<domain>/app-update.json` set karo (ya `src/core/appUpdate/version.ts` me default badlo).
- "Later" dabane par optional popup 12 ghante tak dobara nahi aata (usi version ke liye). Web banner "Later" ke baad agle naye build tak chhup jaata hai.
- Play Store kabhi kabhi naya version dikhane me thoda time leta hai (Play cache). User ko "Update" button na dikhe to Play Store me pull-to-refresh karna hota hai.

## 5. (Optional, recommended) Apache cache headers

Web root ke `.htaccess` me ye add karoge to purana `index.html` browser cache se kabhi nahi aayega:
```apache
<FilesMatch "^(index\.html|version\.json|app-update\.json)$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>
<IfModule mod_headers.c>
  <FilesMatch "\.(js|css|woff2?|ttf|png|jpg|svg)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
```
(Iske bina bhi chalega — Refresh button `?_v=<buildId>` laga ke fresh `index.html` laata hai.)

## 6. Test kaise kare

- **Web:** `npm run build:web` → upload → site kholo → `npm run build:web` dobara → upload → 5 min wait ya tab switch karke wapas aao → banner → Refresh.
- **Android/iOS:** `public/app-update.json` me `latestVersion` ko installed se bada (jaise `9.9.9`) karke upload karo → app ko band (kill) karke dobara kholo → 3 sec me popup. Test ke baad wapas sahi version daal do.
