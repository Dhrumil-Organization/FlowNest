#!/usr/bin/env node
// Web production build WITH update detection.
//   npm run build:web
// 1. Reads the version from app.json (expo.version).
// 2. Creates a unique build id and bakes it into the bundle (EXPO_PUBLIC_WEB_BUILD_ID).
// 3. Runs `npx expo export -p web`  (output: dist/)
// 4. Writes dist/version.json  -> the running website polls this file; when it changes,
//    users see "New update available — Refresh".
// 5. Makes sure dist/app-update.json (mobile store versions) is present.
// Upload the whole dist/ folder to the server as before (version.json included).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ROOT, UPDATE_JSON, readVersionInfo } = require('./app-version-utils');

const { version } = readVersionInfo();
const stamp = new Date();
const buildId = `${version}-${stamp.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;
const notes = process.env.WEB_RELEASE_NOTES || '';

console.log(`\n▶ Building web  version=${version}  buildId=${buildId}\n`);

const extraArgs = process.argv.slice(2).join(' ');
const r = spawnSync(`npx expo export -p web ${extraArgs}`.trim(), {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, EXPO_PUBLIC_WEB_BUILD_ID: buildId },
});
if (r.status !== 0) {
  console.error('\n✖ expo export failed — version.json NOT written.');
  process.exit(r.status || 1);
}

const dist = path.join(ROOT, 'dist');
fs.mkdirSync(dist, { recursive: true });
const info = { version, buildId, builtAt: stamp.toISOString(), ...(notes ? { notes } : {}) };
fs.writeFileSync(path.join(dist, 'version.json'), JSON.stringify(info, null, 2));

const distUpdate = path.join(dist, 'app-update.json');
if (!fs.existsSync(distUpdate) && fs.existsSync(UPDATE_JSON)) fs.copyFileSync(UPDATE_JSON, distUpdate);

console.log(`\n✔ dist/version.json written: ${JSON.stringify(info)}`);
console.log('  Upload the full dist/ folder (index.html, _expo/, version.json, app-update.json).\n');
