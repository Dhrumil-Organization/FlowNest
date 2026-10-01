#!/usr/bin/env node
// Tell installed apps that a new store version is LIVE (run only after Play/App Store published it):
//   npm run store:live -- android            -> android.latestVersion = app.json version
//   npm run store:live -- ios 1.0.49         -> ios.latestVersion = 1.0.49
//   npm run store:live -- both --force       -> latest AND minVersion (blocking update)
// Edits public/app-update.json. Then deploy it (npm run build:web + upload dist/,
// or just upload public/app-update.json to the web root).
const fs = require('fs');
const path = require('path');
const { UPDATE_JSON, readVersionInfo, isVersion } = require('./app-version-utils');

const args = process.argv.slice(2);
const target = (args.find((a) => ['android', 'ios', 'both'].includes(a)) || '').trim();
const force = args.includes('--force');
const version = args.find((a) => isVersion(a)) || readVersionInfo().version;

if (!target) {
  console.error('Usage: npm run store:live -- <android|ios|both> [x.y.z] [--force]');
  process.exit(1);
}

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(UPDATE_JSON, 'utf8')); } catch { cfg = {}; }
for (const p of target === 'both' ? ['android', 'ios'] : [target]) {
  cfg[p] = cfg[p] || {};
  cfg[p].latestVersion = version;
  if (force) cfg[p].minVersion = version;
  console.log(`✔ ${p}: latestVersion=${version}${force ? `, minVersion=${version} (force)` : ''}`);
}
cfg.updatedAt = new Date().toISOString();
fs.mkdirSync(path.dirname(UPDATE_JSON), { recursive: true });
fs.writeFileSync(UPDATE_JSON, JSON.stringify(cfg, null, 2) + '\n');
console.log(`  Saved ${path.relative(process.cwd(), UPDATE_JSON)} — now deploy it to the web root.`);
