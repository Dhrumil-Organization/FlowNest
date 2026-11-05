// ─────────────────────────────────────────────────────────────
// FILE: src/core/navigation/navTree.ts
//
// Pure functions (no React, no React Native) that turn the FLAT list of
// screens the user may see into the TREE every menu draws:
//
//   Home                       <- plain screen
//   Owner Dashboard            <- plain screen
//   ▸ Yarn Dyeing   (3)        <- group, only if >= 1 child is visible
//       Process Chemicals
//       Shade Recipe
//       Planning
//
// The phone "More" sheet, the tablet rail and the desktop sidebar all use the
// SAME tree, so a new group shows up on every device with no extra work.
// ─────────────────────────────────────────────────────────────
import type { AppNavigationGroup, AppNavigationItem } from './navigationRegistry';

export type NavLeaf = { type: 'item'; key: string; order: number; item: AppNavigationItem };
export type NavGroupNode = {
  type: 'group';
  key: string;
  order: number;
  group: AppNavigationGroup;
  children: AppNavigationItem[];
};
export type NavTreeEntry = NavLeaf | NavGroupNode;

const byOrderThenTitle = (a: { order: number; title: string }, b: { order: number; title: string }) =>
  a.order - b.order || a.title.localeCompare(b.title);

/**
 * @param items   screens the user may see (already filtered by rights / "My screens")
 * @param groups  every registered menu group
 *
 * - An item whose group is unknown is shown as a normal top-level item
 *   (a typo in `parentId` can never hide a screen).
 * - A group with no visible child is dropped.
 * - A group with exactly ONE visible child is shown as that plain item, so
 *   a user who only has "Planning" does not need an extra tap.
 */
export function buildNavTree(
  items: readonly AppNavigationItem[],
  groups: readonly AppNavigationGroup[],
): NavTreeEntry[] {
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const childrenByGroup = new Map<string, AppNavigationItem[]>();
  const entries: NavTreeEntry[] = [];

  for (const item of items) {
    const group = item.groupId ? groupById.get(item.groupId) : undefined;
    if (!group) {
      entries.push({ type: 'item', key: item.routeName, order: item.order, item });
      continue;
    }
    const list = childrenByGroup.get(group.id) || [];
    list.push(item);
    childrenByGroup.set(group.id, list);
  }

  for (const [groupId, children] of childrenByGroup) {
    const group = groupById.get(groupId)!;
    children.sort(byOrderThenTitle);
    if (children.length === 1) {
      const only = children[0];
      entries.push({ type: 'item', key: only.routeName, order: group.order, item: only });
    } else {
      entries.push({ type: 'group', key: group.id, order: group.order, group, children });
    }
  }

  return entries.sort((a, b) => {
    const ta = a.type === 'group' ? a.group.title : a.item.title;
    const tb = b.type === 'group' ? b.group.title : b.item.title;
    return a.order - b.order || ta.localeCompare(tb);
  });
}

/** True when `activeRoute` is this screen or one of its sub-routes. */
export function isRouteActive(activeRoute: string | undefined | null, routeName: string): boolean {
  const active = normalizeRoute(activeRoute);
  const route = normalizeRoute(routeName);
  if (!active || !route) return false;
  return active === route || active.startsWith(`${route}/`);
}

/** The group that contains the open screen (so it can start expanded). */
export function findActiveGroupKey(tree: readonly NavTreeEntry[], activeRoute: string | undefined | null): string | null {
  for (const entry of tree) {
    if (entry.type === 'group' && entry.children.some((c) => isRouteActive(activeRoute, c.routeName))) return entry.key;
  }
  return null;
}

/** Search across screens AND group names; a group hit returns all its children. */
export function filterNavTree(tree: readonly NavTreeEntry[], query: string): NavTreeEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return tree.slice();
  const out: NavTreeEntry[] = [];
  for (const entry of tree) {
    if (entry.type === 'item') {
      if (entry.item.title.toLowerCase().includes(q)) out.push(entry);
      continue;
    }
    if (entry.group.title.toLowerCase().includes(q)) {
      out.push(entry);
      continue;
    }
    const children = entry.children.filter((c) => c.title.toLowerCase().includes(q));
    if (children.length) out.push({ ...entry, children });
  }
  return out;
}

function normalizeRoute(value: string | undefined | null): string {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '').replace(/^new\//, '').replace(/^\(tabs\)\//, '').toLowerCase();
}
