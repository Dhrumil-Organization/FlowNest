// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/erpIndex.ts
//
// Builds EVERYTHING the ERP search can find, straight from the registries
// the app already uses — so a screen added the normal way (permission
// resource + nav node + route file) is searchable with no change here.
//
//   UI registry  'navigation'   → screens (same list as the menu)
//                'group'        → menu folders (Yarn Dyeing …)
//                'tab' / 'dashboard-card' / 'section' → parts of a screen
//   Permission registry          → tabs / cards / reports / sections under a
//                                  screen's resource + every ACTION
//                                  (Add, Approve, Print …) of them
//   generated/routes.generated   → sub-screens inside tab folders
//                                  (reports/real-costing, costing/history …)
//
// Nothing here checks rights. Each entry lists the rights it needs
// (`requires` / `requiresAny`); `filterByRights` keeps only what the user may
// open — exactly the checks the menu and the route guards use.
// ─────────────────────────────────────────────────────────────
import type {
  GeneratedRoute,
  RightsChecker,
  ScreenHelp,
  SearchEntry,
  SearchEntryKind,
  SearchRequirement,
} from './types';
import { tokenize } from './searchText';

/** Loose shape of a UI registry node (the registry also holds 'group' nodes). */
export type IndexUiNode = {
  id: string;
  kind: string;
  title: string;
  permission: string;
  action?: string;
  order?: number;
  parentId?: string;
  route?: string;
  icon?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
};

export type IndexResource = {
  resourcePath: string;
  parentPath: string | null;
  resource: {
    key: string;
    name: string;
    type: string;
    description?: string;
    actions?: Array<{ key: string; name: string; dangerous?: boolean; description?: string }>;
  };
};

export type ErpIndexInput = {
  uiNodes: readonly IndexUiNode[];
  resources: readonly IndexResource[];
  generatedRoutes: readonly GeneratedRoute[];
  help: Record<string, ScreenHelp>;
  /** Resources that never belong to this search (Mill Hub lives in its own search). */
  isExcluded?: (resourcePath: string) => boolean;
};

const KIND_BY_TYPE: Record<string, SearchEntryKind> = {
  tab: 'tab',
  section: 'tab',
  drawer: 'tab',
  dialog: 'tab',
  grid: 'tab',
  workflow: 'tab',
  card: 'card',
  widget: 'card',
  report: 'report',
  screen: 'tab',
  module: 'tab',
};

const KIND_LABEL: Record<SearchEntryKind, string> = {
  screen: 'Screen',
  page: 'Page',
  tab: 'Tab',
  card: 'Card',
  report: 'Report',
  action: 'Action',
  app: 'App',
};
export const kindLabel = (kind: SearchEntryKind) => KIND_LABEL[kind] || 'Screen';

/** A single generic verb needs the screen name next to it ("Add" → "Add · Yarn Rates"). */
const GENERIC_ACTIONS = /^(view|add|new|edit|modify|update|delete|remove|print|export|save|approve|reject|assign|share|preview|sync|compute|scan|create|move|manage|freeze|authorize|authorise)$/i;

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
const isAncestor = (a: string, b: string) => b.startsWith(`${a}.`);
const needView = (action?: string) => (!action || action === 'view' ? undefined : action);

function req(resource: string, action?: string): SearchRequirement {
  const a = needView(action);
  return a ? { resource, action: a } : { resource };
}

function metaStrings(meta: Record<string, unknown> | undefined, key: string): string[] {
  const v = meta?.[key];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
}

/** Curated help → nav node metadata → registry description → nothing. */
function helpFor(
  help: Record<string, ScreenHelp>,
  resourcePath: string,
  node?: IndexUiNode,
  description?: string,
): ScreenHelp | undefined {
  const curated = help[resourcePath] || help[norm(resourcePath)];
  const meta = node?.metadata;
  const metaHelp = meta?.help;
  const fromMeta: ScreenHelp | undefined =
    metaHelp && typeof metaHelp === 'object'
      ? (metaHelp as ScreenHelp)
      : typeof metaHelp === 'string' && metaHelp.trim()
        ? { summary: metaHelp.trim(), steps: metaStrings(meta, 'steps'), tips: metaStrings(meta, 'tips') }
        : undefined;
  const base = curated || fromMeta || (description ? { summary: description } : undefined);
  const extraKeywords = metaStrings(meta, 'keywords');
  if (!base && !extraKeywords.length) return undefined;
  return {
    summary: base?.summary || '',
    steps: base?.steps,
    tips: base?.tips,
    keywords: [...(base?.keywords || []), ...(fromMeta && curated ? fromMeta.keywords || [] : []), ...extraKeywords],
  };
}

function routeWords(route: string): string[] {
  return tokenize(route.replace(/\/index$/, '').replace(/[-_/]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'));
}

function singular(word: string) {
  return /ies$/i.test(word) ? word.replace(/ies$/i, 'y') : /[^s]s$/i.test(word) ? word.slice(0, -1) : word;
}

/** "New" in Designs → "New Design"; "History" in Costing → "Costing History". */
function subPageTitle(title: string, parentTitle: string) {
  if (/^(new|add|create)$/i.test(title)) return `New ${singular(parentTitle)}`;
  if (title.toLowerCase().includes(parentTitle.toLowerCase())) return title;
  if (title.split(' ').length === 1) return `${parentTitle} ${title}`;
  return title;
}

export function buildErpIndex(input: ErpIndexInput): SearchEntry[] {
  const excluded = (path: string) => !!input.isExcluded?.(norm(path));
  const enabled = input.uiNodes.filter((n) => n.enabled !== false);
  const groups = new Map(enabled.filter((n) => n.kind === 'group').map((n) => [n.id, n]));

  // ── 1. screens (same filter / order / dedupe as the menu) ──
  const navs: IndexUiNode[] = [];
  const seenRoutes = new Set<string>();
  for (const n of enabled
    .filter((x) => x.kind === 'navigation' && x.route)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title))) {
    if (excluded(n.permission) || seenRoutes.has(String(n.route))) continue;
    seenRoutes.add(String(n.route));
    navs.push(n);
  }

  const resourceByPath = new Map(input.resources.map((r) => [norm(r.resourcePath), r]));
  const entries: SearchEntry[] = [];
  const byNavPermission = new Map<string, IndexUiNode>();

  for (const n of navs) {
    const perm = norm(n.permission);
    if (!byNavPermission.has(perm)) byNavPermission.set(perm, n);
    const group = n.parentId ? groups.get(n.parentId) : undefined;
    const res = resourceByPath.get(perm);
    const help = helpFor(input.help, perm, n, res?.resource.description);
    entries.push({
      id: `screen:${n.route}`,
      kind: 'screen',
      title: n.title,
      breadcrumb: group ? `Menu › ${group.title}` : 'Menu',
      icon: n.icon || 'apps',
      subtitle: help?.summary ? firstSentence(help.summary) : res && res.resource.name !== n.title ? res.resource.name : undefined,
      requires: [req(perm, n.action)],
      target: { type: 'route', route: String(n.route) },
      keywords: [
        ...routeWords(String(n.route)),
        ...(res && res.resource.name !== n.title ? [res.resource.name] : []),
        ...(group ? [group.title] : []),
        ...(help?.keywords || []),
      ],
      screenId: `screen:${n.route}`,
      order: n.order || 0,
      help,
      resource: perm,
    });
  }

  /** The menu screen that owns a permission path (longest ancestor-or-self). */
  const ownerNav = (path: string): IndexUiNode | undefined => {
    let best: IndexUiNode | undefined;
    for (const [perm, nav] of byNavPermission) {
      if (perm === path || isAncestor(perm, path)) {
        if (!best || perm.length > norm(best.permission).length) best = nav;
      }
    }
    return best;
  };
  const navReq = (nav: IndexUiNode) => req(norm(nav.permission), nav.action);
  const covered = new Set<string>(byNavPermission.keys());

  // ── 2. UI parts registered under a screen node (tabs, dashboard cards, sections) ──
  const screenNodes = new Map(enabled.filter((n) => n.kind === 'screen').map((n) => [n.id, n]));
  for (const n of enabled) {
    if (!['tab', 'dashboard-card', 'section'].includes(n.kind) || !n.parentId) continue;
    if (excluded(n.permission)) continue;
    const screen = screenNodes.get(n.parentId);
    const owner = screen ? byNavPermission.get(norm(screen.permission)) || ownerNav(norm(screen.permission)) : ownerNav(norm(n.permission));
    if (!owner) continue;
    const perm = norm(n.permission);
    const any = metaStrings(n.metadata, 'anyPermissions').map((p) => req(norm(p)));
    const res = resourceByPath.get(perm);
    entries.push({
      id: `part:${n.id}`,
      kind: n.kind === 'dashboard-card' ? 'card' : 'tab',
      title: n.title,
      breadcrumb: `In ${owner.title}`,
      icon: n.icon || owner.icon || 'apps',
      subtitle: res?.resource.description,
      requires: any.length ? [navReq(owner)] : [navReq(owner), req(perm, n.action)],
      requiresAny: any.length ? any : undefined,
      target: { type: 'route', route: String(owner.route) },
      keywords: [owner.title, ...(res ? [res.resource.name] : []), ...metaStrings(n.metadata, 'keywords')],
      screenId: `screen:${owner.route}`,
      order: (owner.order || 0) + (n.order || 0) / 1000,
      resource: perm,
    });
    covered.add(perm);
  }

  // ── 3. permission resources under a screen (tabs / cards / reports …) + actions ──
  for (const r of input.resources) {
    const path = norm(r.resourcePath);
    if (excluded(path)) continue;
    const owner = ownerNav(path);
    if (!owner) continue;
    const ownerPerm = norm(owner.permission);
    const isScreenItself = path === ownerPerm;

    if (!isScreenItself && !covered.has(path)) {
      // a deeper part's parent chain must be open too (screen → tab → sub-tab)
      const chain: SearchRequirement[] = [navReq(owner)];
      let p = r.parentPath ? norm(r.parentPath) : null;
      const between: string[] = [];
      while (p && p !== ownerPerm && isAncestor(ownerPerm, p)) {
        between.unshift(p);
        const parent = resourceByPath.get(p);
        p = parent?.parentPath ? norm(parent.parentPath) : null;
      }
      for (const b of between) chain.push(req(b));
      chain.push(req(path));
      const parentNames = between.map((b) => resourceByPath.get(b)?.resource.name).filter(Boolean) as string[];
      entries.push({
        id: `res:${path}`,
        kind: KIND_BY_TYPE[r.resource.type] || 'tab',
        title: r.resource.name,
        breadcrumb: `In ${[owner.title, ...parentNames].join(' › ')}`,
        icon: owner.icon || 'apps',
        subtitle: r.resource.description,
        requires: chain,
        target: { type: 'route', route: String(owner.route) },
        keywords: [owner.title, ...parentNames, r.resource.key.replace(/_/g, ' ')],
        screenId: `screen:${owner.route}`,
        order: (owner.order || 0) + 0.5,
        resource: path,
      });
      covered.add(path);
    }

    // actions (View is the screen itself)
    for (const a of r.resource.actions || []) {
      const key = norm(a.key);
      if (!key || key === 'view') continue;
      const where = isScreenItself ? owner.title : r.resource.name;
      const generic = GENERIC_ACTIONS.test(a.name.trim());
      entries.push({
        id: `act:${path}:${key}`,
        kind: 'action',
        title: generic ? `${a.name.trim()} · ${where}` : a.name.trim(),
        breadcrumb: isScreenItself ? `Action in ${owner.title}` : `Action in ${owner.title} › ${r.resource.name}`,
        icon: a.dangerous ? 'delete-outline' : 'bolt',
        subtitle: a.description,
        requires: isScreenItself ? [navReq(owner), req(path, key)] : [navReq(owner), req(path), req(path, key)],
        target: { type: 'route', route: String(owner.route) },
        keywords: [owner.title, where, key, ...(a.dangerous ? ['dangerous'] : [])],
        screenId: `screen:${owner.route}`,
        order: (owner.order || 0) + (a.dangerous ? 0.9 : 0.7),
        resource: path,
      });
    }
  }

  // ── 4. sub-screens found by the route scanner ──
  const navByRoute = new Map(navs.map((n) => [String(n.route).replace(/\/index$/, ''), n]));
  for (const g of input.generatedRoutes) {
    const parent = navByRoute.get(g.parentRoute);
    if (!parent) continue; // folder is not a menu screen (or is switched off)
    if (g.requires.some((x) => excluded(x.resource))) continue;
    const requires = [...(g.inheritParent ? [navReq(parent)] : []), ...g.requires.map((x) => req(norm(x.resource), x.action))];
    if (!requires.length) continue;
    const firstPerm = g.requires[0] ? norm(g.requires[0].resource) : '';
    const help = firstPerm ? helpFor(input.help, firstPerm, undefined, resourceByPath.get(firstPerm)?.resource.description) : undefined;
    entries.push({
      id: `page:${g.route}`,
      kind: 'page',
      title: subPageTitle(g.title, parent.title),
      breadcrumb: `In ${parent.title}`,
      icon: parent.icon || 'description',
      subtitle: g.subtitle || help?.summary,
      requires,
      target: { type: 'route', route: g.route },
      keywords: [parent.title, ...routeWords(g.route), ...(help?.keywords || [])],
      screenId: `screen:${parent.route}`,
      order: (parent.order || 0) + 0.2,
      help: help || (g.subtitle ? { summary: g.subtitle } : undefined),
      resource: firstPerm || norm(parent.permission),
    });
  }

  // a report that has its own page is found once — as the page
  const pagePerms = new Set(entries.filter((e) => e.kind === 'page').flatMap((e) => e.requires.map((r) => r.resource)));
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const e = entries[i];
    if (e.id.startsWith('res:') && e.resource && pagePerms.has(e.resource)) entries.splice(i, 1);
  }

  // ── 5. always there once logged in ──
  entries.push(
    {
      id: 'app:settings',
      kind: 'app',
      title: 'Settings',
      breadcrumb: 'App',
      icon: 'settings',
      subtitle: 'Theme (light / dark), My screens (show / hide menu screens) and app options',
      requires: [],
      target: { type: 'route', route: '/new/settings' },
      keywords: ['theme', 'dark mode', 'light mode', 'my screens', 'hide screens', 'menu', 'preferences'],
      screenId: 'app:settings',
      order: 10000,
      help: {
        summary: 'Settings: switch light / dark theme, choose which screens show in your menu (My screens) and other app options.',
        steps: ['Tap the ⚙ button in the header (or pick Settings here).', 'Change the option — it is saved on this device.'],
      },
    },
    {
      id: 'app:profile',
      kind: 'app',
      title: 'My Profile',
      breadcrumb: 'App',
      icon: 'person',
      subtitle: 'Your login details, roles and property',
      requires: [],
      target: { type: 'route', route: '/new/profile' },
      keywords: ['profile', 'user', 'my account', 'login', 'role'],
      screenId: 'app:profile',
      order: 10001,
      help: { summary: 'Your profile: user name, roles and the property you are logged in to. Open it from the round initials button in the header.' },
    },
  );

  return entries;
}

function firstSentence(text: string): string {
  const t = text.trim();
  const i = t.search(/[.!?](\s|$)/);
  const s = i > 0 ? t.slice(0, i) : t;
  return s.length > 110 ? `${s.slice(0, 107).trimEnd()}…` : s;
}

/** Keep only what this user may open (same checks as the menu and the route guards). */
export function filterByRights(entries: readonly SearchEntry[], rights: RightsChecker): SearchEntry[] {
  const memo = new Map<string, boolean>();
  const ok = (r: SearchRequirement) => {
    const key = `${r.resource}|${r.action || ''}`;
    let v = memo.get(key);
    if (v === undefined) {
      try {
        v = r.action ? rights.canDo(r.resource, r.action) : rights.canAccess(r.resource);
      } catch {
        v = false;
      }
      memo.set(key, v);
    }
    return v;
  };
  return entries.filter((e) => e.requires.every(ok) && (!e.requiresAny?.length || e.requiresAny.some(ok)));
}
