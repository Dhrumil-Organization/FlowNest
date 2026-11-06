#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// FILE: scripts/build-global-search-index.js
//
// GLOBAL SEARCH — route scanner.  Runs by itself before every start / build
// (package.json: prestart, preandroid, preios, preweb, prebuild:web,
// postinstall).  Nobody has to edit it when a screen is added.
//
// The menu screens come from the UI registry at runtime, so they never need
// this file.  This scanner only finds the SUB-SCREENS that live inside a tab
// folder (reports/real-costing, costing/history, designs/new …), which the
// registry does not list, and writes them to
//   src/features/globalSearch/generated/routes.generated.ts
//
// Rights are read from the code itself, so the search can never show a
// sub-screen the user is not allowed to open:
//   1. <PermissionRouteGuard resource="…" action="…">  in the route file
//   2. the hub card that opens it  ({ key, title, sub, route } in <folder>/index.tsx)
//   3. nothing of the above, folder is NOT a hub -> same right as the folder
//   A sub-screen that needs route params (a drill-down that only works when
//   opened from another screen) is skipped — it would open empty.
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TABS = path.join(ROOT, 'app', 'new', '(tabs)');
const OUT = path.join(ROOT, 'src', 'features', 'globalSearch', 'generated', 'routes.generated.ts');

const SKIP_FILE = /(^_|\s|copy|backup|bkp|_old|old\d*\.|\.patch|\.test\.|^test_)/i;
const PARAMS = /useLocalSearchParams|useGlobalSearchParams|route\??\.params|useRoute\s*\(/;

const read = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
};

/** Code without // and /* *\/ comments (so commented-out code is never read as real). */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      const i = line.indexOf('//');
      if (i < 0) return line;
      // keep "//" that is part of a URL inside a string
      const before = line.slice(0, i);
      const quotes = (before.match(/['"`]/g) || []).length;
      return quotes % 2 === 1 ? line : before;
    })
    .join('\n');
}

function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.js']) {
    const f = base + ext;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}

function humanize(name) {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Hub cards of a folder index: { key, title, sub, route } objects + ROUTE_MAP. */
function readHubCards(indexFile, folder) {
  const code = stripComments(read(indexFile));
  const routeMap = {};
  const mapRe = /([A-Za-z0-9_]+)\s*:\s*['"`]\/new\/\(tabs\)\/([^'"`]+)['"`]/g;
  let m;
  while ((m = mapRe.exec(code))) routeMap[m[1]] = m[2];

  const cards = {};
  const objRe = /\{[^{}]*\btitle\s*:\s*['"`]([^'"`]+)['"`][^{}]*\}/g;
  while ((m = objRe.exec(code))) {
    const body = m[0];
    const route = (body.match(/\broute\s*:\s*['"`]([^'"`]+)['"`]/) || [])[1];
    if (!route) continue;
    let target = routeMap[route] || route.replace(/^\/?new\/\(tabs\)\//, '').replace(/^\//, '');
    if (!target.includes('/')) target = `${folder}/${target}`;
    cards[target.replace(/\/index$/, '')] = {
      title: m[1],
      sub: (body.match(/\bsub(?:title)?\s*:\s*['"`]([^'"`]+)['"`]/) || [])[1] || '',
      key: (body.match(/\bkey\s*:\s*['"`]([^'"`]+)['"`]/) || [])[1] || '',
      action: (body.match(/\baction\s*:\s*['"`]([^'"`]+)['"`]/) || [])[1] || '',
    };
  }
  return cards;
}

function readGuard(code) {
  const m = code.match(/<PermissionRouteGuard\b[^>]*?\bresource\s*=\s*\{?\s*['"`]([^'"`]+)['"`]/);
  if (!m) return null;
  const tag = code.slice(m.index, code.indexOf('>', m.index) + 1);
  const action = (tag.match(/\baction\s*=\s*\{?\s*['"`]([^'"`]+)['"`]/) || [])[1];
  return { resource: m[1], action: action && action !== 'view' ? action : undefined };
}

function needsParams(file, code) {
  if (PARAMS.test(code)) return true;
  // one level down: the screen component the route file renders
  const imports = [...code.matchAll(/import\s+[^'"]*?from\s+['"]([^'"]+)['"]/g)].map((x) => x[1]);
  for (const spec of imports) {
    if (!/screens|components/i.test(spec)) continue;
    const target = resolveImport(file, spec);
    if (target && PARAMS.test(stripComments(read(target)))) return true;
  }
  return false;
}

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (/\.(tsx|jsx|ts|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function scan() {
  const routes = [];
  if (!fs.existsSync(TABS)) return routes;
  for (const entry of fs.readdirSync(TABS, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('(') || entry.name.startsWith('[')) continue;
    const folder = entry.name;
    const dir = path.join(TABS, folder);
    const indexFile = ['index.tsx', 'index.ts', 'index.jsx', 'index.js'].map((f) => path.join(dir, f)).find((f) => fs.existsSync(f));
    if (!indexFile) continue;
    const cards = readHubCards(indexFile, folder);
    const isHub = Object.keys(cards).length > 0;

    for (const file of listFiles(dir)) {
      const rel = path.relative(TABS, file).replace(/\\/g, '/');
      const base = path.basename(file);
      if (SKIP_FILE.test(base) || /\[.*\]/.test(rel)) continue;
      const route = rel.replace(/\.(tsx|jsx|ts|js)$/, '');
      if (/\/index$/.test(route)) continue; // folder home = the menu screen itself
      const code = stripComments(read(file));
      if (!/export\s+default/.test(code)) continue;
      if (needsParams(file, code)) continue;

      const guard = readGuard(code);
      const card = cards[route];
      const requires = [];
      if (guard) requires.push(guard);
      if (card && card.key && !requires.some((r) => r.resource === card.key)) {
        requires.push({ resource: card.key, action: card.action && card.action !== 'view' ? card.action : undefined });
      }
      let inherit = false;
      if (!requires.length) {
        if (isHub) continue; // a hub only opens what its cards open
        inherit = true;
      }
      routes.push({
        route,
        parentRoute: folder,
        title: (card && card.title) || humanize(path.basename(route)),
        subtitle: (card && card.sub) || '',
        requires: requires.map((r) => (r.action ? r : { resource: r.resource })),
        inheritParent: inherit,
      });
    }
  }
  return routes.sort((a, b) => a.route.localeCompare(b.route));
}

function main() {
  const routes = scan();
  const body = `// AUTO-GENERATED by scripts/build-global-search-index.js — do not edit by hand.
// Regenerated before every start / build. Lists the sub-screens inside tab folders
// with the rights read from their route files (see the script header).
/* eslint-disable */
import type { GeneratedRoute } from '../types';

export const GENERATED_ROUTES: readonly GeneratedRoute[] = ${JSON.stringify(routes, null, 2)};
`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  if (read(OUT) !== body) fs.writeFileSync(OUT, body);
  console.log(`[global-search] ${routes.length} sub-screens indexed -> ${path.relative(ROOT, OUT)}`);
}

try {
  main();
} catch (error) {
  // never block a start / build: the previous generated file keeps working
  console.warn('[global-search] route scan skipped:', error && error.message);
}
