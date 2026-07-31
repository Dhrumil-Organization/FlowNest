import type {
  FlattenedPermissionResource,
  PermissionActionDefinition,
  PermissionAreaDefinition,
  PermissionRegistrySyncPayload,
  PermissionResourceDefinition,
} from '../core/permissions/types';

const areas = new Map<string, PermissionAreaDefinition>();
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

const normalizeKey = (value: string): string => value.trim().toLowerCase();
const orderOf = (value?: number): number => Number.isFinite(value) ? Number(value) : 0;

function assertKey(key: string, label: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(
      `${label} key "${key}" is invalid. Use lowercase letters, numbers and underscore only; it must start with a letter.`,
    );
  }
}

function normalizeAction(action: PermissionActionDefinition): PermissionActionDefinition {
  const key = normalizeKey(action.key);
  assertKey(key, 'Action');
  if (!action.name?.trim()) throw new Error(`Action "${key}" must have a name.`);
  return { ...action, key, name: action.name.trim() };
}

function normalizeResource(resource: PermissionResourceDefinition): PermissionResourceDefinition {
  const key = normalizeKey(resource.key);
  assertKey(key, 'Resource');
  if (!resource.name?.trim()) throw new Error(`Resource "${key}" must have a name.`);

  const actionMap = new Map<string, PermissionActionDefinition>();
  for (const rawAction of resource.actions || []) {
    const action = normalizeAction(rawAction);
    actionMap.set(action.key, { ...actionMap.get(action.key), ...action });
  }

  const childMap = new Map<string, PermissionResourceDefinition>();
  for (const rawChild of resource.children || []) {
    const child = normalizeResource(rawChild);
    const current = childMap.get(child.key);
    childMap.set(child.key, current ? mergeResource(current, child) : child);
  }

  return {
    ...resource,
    key,
    name: resource.name.trim(),
    actions: Array.from(actionMap.values()).sort(
      (a, b) => orderOf(a.displayOrder) - orderOf(b.displayOrder) || a.name.localeCompare(b.name),
    ),
    children: Array.from(childMap.values()).sort(
      (a, b) => orderOf(a.displayOrder) - orderOf(b.displayOrder) || a.name.localeCompare(b.name),
    ),
  };
}

function mergeResource(
  current: PermissionResourceDefinition,
  incoming: PermissionResourceDefinition,
): PermissionResourceDefinition {
  if (current.type !== incoming.type) {
    throw new Error(
      `Permission resource "${current.key}" was registered with two different types: "${current.type}" and "${incoming.type}".`,
    );
  }

  const actions = new Map<string, PermissionActionDefinition>();
  for (const action of current.actions || []) actions.set(action.key, action);
  for (const action of incoming.actions || []) {
    actions.set(action.key, { ...actions.get(action.key), ...action });
  }

  const children = new Map<string, PermissionResourceDefinition>();
  for (const child of current.children || []) children.set(child.key, child);
  for (const child of incoming.children || []) {
    const existing = children.get(child.key);
    children.set(child.key, existing ? mergeResource(existing, child) : child);
  }

  return normalizeResource({
    ...current,
    ...incoming,
    actions: Array.from(actions.values()),
    children: Array.from(children.values()),
  });
}

export function registerPermissionArea(definition: PermissionAreaDefinition): void {
  const key = normalizeKey(definition.key);
  assertKey(key, 'Business area');
  if (!definition.name?.trim()) throw new Error(`Business area "${key}" must have a name.`);

  const incoming: PermissionAreaDefinition = {
    ...definition,
    key,
    name: definition.name.trim(),
    resources: (definition.resources || []).map(normalizeResource),
  };

  const current = areas.get(key);
  if (!current) {
    areas.set(key, incoming);
    return;
  }

  const resources = new Map<string, PermissionResourceDefinition>();
  for (const resource of current.resources) resources.set(resource.key, resource);
  for (const resource of incoming.resources) {
    const existing = resources.get(resource.key);
    resources.set(resource.key, existing ? mergeResource(existing, resource) : resource);
  }

  areas.set(key, {
    ...current,
    ...incoming,
    resources: Array.from(resources.values()),
  });
}

export function getPermissionRegistry(): PermissionAreaDefinition[] {
  return Array.from(areas.values())
    .map((area) => ({
      ...area,
      resources: area.resources.map(normalizeResource),
    }))
    .sort(
      (a, b) => orderOf(a.displayOrder) - orderOf(b.displayOrder) || a.name.localeCompare(b.name),
    );
}

export function flattenPermissionRegistry(): FlattenedPermissionResource[] {
  const result: FlattenedPermissionResource[] = [];

  const visit = (
    area: PermissionAreaDefinition,
    parentPath: string | null,
    resource: PermissionResourceDefinition,
    depth: number,
  ) => {
    const resourcePath = parentPath ? `${parentPath}.${resource.key}` : resource.key;
    result.push({
      areaKey: area.key,
      areaName: area.name,
      resourcePath,
      parentPath,
      depth,
      resource,
    });
    for (const child of resource.children || []) {
      visit(area, resourcePath, child, depth + 1);
    }
  };

  for (const area of getPermissionRegistry()) {
    for (const resource of area.resources) visit(area, null, resource, 0);
  }
  return result;
}

export function findPermissionResource(resourcePath: string): FlattenedPermissionResource | undefined {
  const normalized = resourcePath.trim().toLowerCase().replace(/^\.+|\.+$/g, '');
  return flattenPermissionRegistry().find((item) => item.resourcePath === normalized);
}

export function createPermissionRegistrySyncPayload(
  clientVersion = 'sudamo-mobile-registry-v1',
): PermissionRegistrySyncPayload {
  return {
    client_version: clientVersion,
    areas: getPermissionRegistry(),
  };
}

export function validatePermissionRegistry(): void {
  const paths = new Set<string>();
  for (const item of flattenPermissionRegistry()) {
    if (paths.has(item.resourcePath)) {
      throw new Error(`Duplicate permission path detected: "${item.resourcePath}".`);
    }
    paths.add(item.resourcePath);
  }
}

export function clearPermissionRegistryForTests(): void {
  areas.clear();
}
