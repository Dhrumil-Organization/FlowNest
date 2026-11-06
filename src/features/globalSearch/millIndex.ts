// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/millIndex.ts
//
// MILL HUB search index — completely separate from the ERP index:
//   • built ONLY from the "mill.*" permission resources (mill.permission.ts)
//   • rights = the user's MILL HUB rights (MillSession, from Sudamo), never
//     the Sudamo / Rayons ERP rights
//   • a result opens a page INSIDE the Mill Hub (page key of MILL_RIGHTS)
//
// A new Mill page = a new mill.* resource + its MILL_RIGHTS key (both are
// needed for the page itself anyway) → it is searchable automatically.
// ─────────────────────────────────────────────────────────────
import type { IndexResource } from './erpIndex';
import type { ScreenHelp, SearchEntry } from './types';

export type MillIndexInput = {
  resources: readonly IndexResource[];
  /** MILL_RIGHTS: page key → permission path */
  pageRights: Record<string, string>;
  help: Record<string, ScreenHelp>;
};

const ICON: Record<string, string> = {
  dash: 'dashboard',
  inward: 'move-to-inbox',
  movement: 'swap-horiz',
  lots: 'view-module',
  machines: 'precision-manufacturing',
  lab: 'science',
  recipe: 'biotech',
  dispatch: 'local-shipping',
  expense: 'currency-rupee',
  coal_offers: 'local-offer',
  steam_entry: 'whatshot',
  elec_entry: 'bolt',
  elec_meters: 'speed',
  reports: 'insights',
};

const norm = (v: string) => String(v || '').trim().toLowerCase();

export function buildMillIndex(input: MillIndexInput): SearchEntry[] {
  // permission path → page key that opens it (top-level keys win over "a.b" keys)
  const pageOf = new Map<string, string>();
  const topKeys = Object.keys(input.pageRights).filter((k) => !k.includes('.'));
  for (const k of topKeys) pageOf.set(norm(input.pageRights[k]), k);
  for (const [k, path] of Object.entries(input.pageRights)) {
    if (!k.includes('.') || pageOf.has(norm(path))) continue;
    const top = k.split('.')[0];
    if (topKeys.includes(top)) pageOf.set(norm(path), top);
  }

  const byPath = new Map(input.resources.map((r) => [norm(r.resourcePath), r]));
  const entries: SearchEntry[] = [];
  let order = 0;
  for (const r of input.resources) {
    const path = norm(r.resourcePath);
    if (!/^mill\./.test(path)) continue;
    const page = pageOf.get(path);
    if (!page) continue; // not a page (root, banner switch …)
    order += 1;
    const parent = r.parentPath ? byPath.get(norm(r.parentPath)) : undefined;
    const isTop = topKeys.includes(page) && norm(input.pageRights[page]) === path;
    const pageRes = byPath.get(norm(input.pageRights[page] || ''));
    const help = input.help[page] && isTop ? input.help[page] : r.resource.description ? { summary: r.resource.description } : undefined;
    entries.push({
      id: `mill:${path}`,
      kind: isTop ? 'screen' : 'tab',
      title: r.resource.name,
      breadcrumb: isTop ? 'Mill Hub' : `In ${pageRes?.resource.name || parent?.resource.name || 'Mill Hub'}`,
      icon: ICON[page] || 'factory',
      subtitle: help?.summary,
      requires: [{ resource: path }],
      target: { type: 'mill', page },
      keywords: [page.replace(/_/g, ' '), r.resource.key.replace(/_/g, ' '), ...(parent && !isTop ? [parent.resource.name] : []), ...(help?.keywords || [])],
      screenId: `mill:${norm(input.pageRights[page] || path)}`,
      order,
      help,
      resource: path,
    });
    for (const a of r.resource.actions || []) {
      const key = norm(a.key);
      if (!key || key === 'view') continue;
      entries.push({
        id: `mill:${path}:${key}`,
        kind: 'action',
        title: /^(edit|create|export|add|delete)$/i.test(a.name) ? `${a.name} · ${r.resource.name}` : a.name,
        breadcrumb: `Action in ${r.resource.name}`,
        icon: 'bolt',
        requires: [{ resource: path, action: key }],
        target: { type: 'mill', page },
        keywords: [r.resource.name, key],
        screenId: `mill:${norm(input.pageRights[page] || path)}`,
        order: order + 0.5,
        resource: path,
      });
    }
  }

  entries.push(
    {
      id: 'mill-app:refresh',
      kind: 'app',
      title: 'Refresh Mill data',
      breadcrumb: 'Mill Hub',
      icon: 'refresh',
      subtitle: 'Load the live Mills data and your Mill rights again',
      requires: [],
      target: { type: 'mill', page: '__refresh' },
      keywords: ['reload', 'refresh', 'live data', 'sync'],
      screenId: 'mill-app:refresh',
      order: 9000,
      help: { summary: 'Reloads the live Mills data and your Mill Hub rights (after the admin changed them).' },
    },
    {
      id: 'mill-app:off',
      kind: 'app',
      title: 'Back to ERP (Mills off)',
      breadcrumb: 'Mill Hub',
      icon: 'exit-to-app',
      subtitle: 'Switch Mill mode off and go back to the Sudamo / Rayons ERP',
      requires: [],
      target: { type: 'mill', page: '__mill_off' },
      keywords: ['erp', 'exit', 'mills off', 'switch off', 'sudamo', 'rayons', 'back'],
      screenId: 'mill-app:off',
      order: 9001,
      help: { summary: 'Turns Mill mode off. The app goes back to the normal ERP (Rayons again if Mill was opened from Rayons).' },
    },
  );
  return entries;
}
