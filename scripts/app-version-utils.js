// Small helpers shared by build-web.js / bump-version.js / set-store-version.js.
// app.json contains // comments, so it is edited with regexes, not JSON.parse.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const UPDATE_JSON = path.join(ROOT, 'public', 'app-update.json');

function readAppJson() {
  return fs.readFileSync(APP_JSON, 'utf8');
}

function readVersionInfo(text = readAppJson()) {
  const version = (text.match(/"version"\s*:\s*"([^"]+)"/) || [])[1];
  const versionCode = Number((text.match(/"versionCode"\s*:\s*(\d+)/) || [])[1] || 0);
  const buildNumber = (text.match(/"buildNumber"\s*:\s*"([^"]+)"/) || [])[1] || '0';
  if (!version) throw new Error('expo.version not found in app.json');
  return { version, versionCode, buildNumber };
}

function isVersion(v) {
  return /^\d+(\.\d+){1,3}$/.test(String(v || ''));
}

module.exports = { ROOT, APP_JSON, UPDATE_JSON, readAppJson, readVersionInfo, isVersion };
