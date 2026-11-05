#!/usr/bin/env node
// Bump the app version everywhere it is needed (app.json only — single source of truth):
//   npm run version:bump            -> 1.0.48 -> 1.0.49 (patch)
//   npm run version:bump -- minor   -> 1.0.48 -> 1.1.0
//   npm run version:bump -- 1.2.0   -> exact version
// Also increments android.versionCode and ios.buildNumber (both required by the stores).
const fs = require('fs');
const { APP_JSON, readAppJson, readVersionInfo, isVersion } = require('./app-version-utils');

const arg = (process.argv[2] || 'patch').trim();
let text = readAppJson();
const cur = readVersionInfo(text);

let next;
if (isVersion(arg)) next = arg;
else {
  const [ma = 0, mi = 0, pa = 0] = cur.version.split('.').map((x) => parseInt(x, 10) || 0);
  if (arg === 'major') next = `${ma + 1}.0.0`;
  else if (arg === 'minor') next = `${ma}.${mi + 1}.0`;
  else if (arg === 'patch') next = `${ma}.${mi}.${pa + 1}`;
  else {
    console.error(`Unknown argument "${arg}". Use patch | minor | major | x.y.z`);
    process.exit(1);
  }
}

const nextCode = cur.versionCode + 1;
const nextBuild = String((parseInt(cur.buildNumber, 10) || 0) + 1);

text = text.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`);
text = text.replace(/("versionCode"\s*:\s*)\d+/, `$1${nextCode}`);
text = text.replace(/("buildNumber"\s*:\s*")[^"]+(")/, `$1${nextBuild}$2`);
fs.writeFileSync(APP_JSON, text);

console.log(`✔ app.json  version ${cur.version} -> ${next}`);
console.log(`            android.versionCode ${cur.versionCode} -> ${nextCode}`);
console.log(`            ios.buildNumber ${cur.buildNumber} -> ${nextBuild}`);
