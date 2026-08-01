import type { UiNodeKind, UiRegistryNode } from './types';

const nodes = new Map<string, UiRegistryNode>();
const ID_PATTERN = /^[a-z][a-z0-9_.-]*$/;

function normalize(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function stableNode(node: UiRegistryNode): string {
  return JSON.stringify({
    ...node,
    metadata: node.metadata || {},
  });
}

export function registerUiNodes(definitions: UiRegistryNode[]): void {
  for (const raw of definitions) {
    const id = normalize(raw.id);
    const permission = normalize(raw.permission);
    const parentId = raw.parentId ? normalize(raw.parentId) : undefined;
    const route = raw.route ? String(raw.route).trim() : undefined;

    if (!ID_PATTERN.test(id)) throw new Error(`Invalid UI registry id: ${raw.id}`);
    if (!raw.title?.trim()) throw new Error(`UI registry node ${id} requires a title.`);
    if (!permission) throw new Error(`UI registry node ${id} requires a permission.`);
    if (raw.kind === 'navigation' && !route) {
      throw new Error(`Navigation registry node ${id} requires a route.`);
    }

    const next: UiRegistryNode = {
      ...raw,
      id,
      permission,
      parentId,
      route,
      enabled: raw.enabled !== false,
    };

    const current = nodes.get(id);
    if (current) {
      // Expo Fast Refresh can evaluate registration modules again. Identical
      // registration is safe; conflicting registration remains a hard error.
      if (stableNode(current) === stableNode(next)) continue;
      throw new Error(`Conflicting duplicate UI registry node: ${id}`);
    }

    nodes.set(id, next);
  }
}

export function getUiNodes(kind?: UiNodeKind, parentId?: string): UiRegistryNode[] {
  const normalizedParent = parentId === undefined ? undefined : normalize(parentId);
  return Array.from(nodes.values())
    .filter((node) => node.enabled !== false)
    .filter((node) => !kind || node.kind === kind)
    .filter((node) => normalizedParent === undefined || node.parentId === normalizedParent)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title));
}

export function getUiNode(id: string): UiRegistryNode | undefined {
  return nodes.get(normalize(id));
}

// FIX: previously this only checked parentId links and duplicate routes.
// It never checked that a node's `permission` string (e.g.
// 'management.reports') actually exists in the permission registry.
// A typo there used to fail silently — the nav item/card just never
// appeared for anyone except a superadmin, with no error anywhere.
// `knownPermissionPaths` is optional so any existing test/call site that
// calls validateUiRegistry() with no arguments keeps working unchanged;
// the real cross-check is wired in from `core/ui-registry/index.ts`,
// which is the one place that can see both registries without a
// circular import.
export function validateUiRegistry(knownPermissionPaths?: Set<string> | string[]): void {
  const routes = new Set<string>();
  const knownPaths = knownPermissionPaths
    ? (knownPermissionPaths instanceof Set ? knownPermissionPaths : new Set(knownPermissionPaths))
    : null;

  for (const node of nodes.values()) {
    if (node.parentId && !nodes.has(node.parentId)) {
      throw new Error(`UI registry node ${node.id} has missing parent ${node.parentId}.`);
    }

    if (node.kind === 'navigation') {
      const route = String(node.route || '');
      if (routes.has(route)) throw new Error(`Duplicate navigation route: ${route}`);
      routes.add(route);
    }

    if (knownPaths && !knownPaths.has(node.permission)) {
      throw new Error(
        `UI registry node "${node.id}" references permission "${node.permission}", which is not ` +
        `registered in the permission registry. Check for a typo, or register that resource path ` +
        `in a *.permission.ts module first. (Without this check, this mismatch used to fail silently ` +
        `— the item would just be invisible to every non-superadmin user.)`,
      );
    }
  }
}

export function clearUiRegistryForTests(): void {
  nodes.clear();
}
