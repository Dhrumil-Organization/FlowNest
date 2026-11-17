// FILE: src/features/support/modules.ts
// "Which part of FlowNest / Mill Hub is this about?" — built from the app's own permission registry,
// so every module that exists (now and in future) is in the list automatically, and only the
// ones this user has rights to are offered. The screen the ticket was started from is preselected.
import { getUiNodes } from '@/src/core/ui-registry/uiRegistry';
import { flattenPermissionRegistry } from '@/src/registry';

export type ModuleOption = { value: string; label: string; area: string; depth: number };

export const GENERAL: ModuleOption = { value: 'general', label: 'General / whole app', area: 'Other', depth: 0 };
export const NEW_MODULE: ModuleOption = { value: 'new_module', label: 'New module (not in FlowNest yet)', area: 'Other', depth: 0 };

const SKIP = /^(access_control|support)(\.|$)/;

export function moduleOptions(canAccess: (path: string) => boolean): ModuleOption[] {
  const out: ModuleOption[] = [];
  const seen = new Set<string>();
  for (const r of flattenPermissionRegistry()) {
    if (r.depth > 2 || SKIP.test(r.resourcePath)) continue;
    const type = String((r.resource as any).type || '');
    if (type === 'action' || type === 'button' || type === 'field') continue;
    if (!canAccess(r.resourcePath) || seen.has(r.resourcePath)) continue;
    seen.add(r.resourcePath);
    const name = String(r.resource.name || r.resourcePath);
    out.push({ value: r.resourcePath, label: r.depth === 0 ? name : name, area: r.areaName || '', depth: r.depth });
  }
  return [...out, GENERAL, NEW_MODULE];
}

/** route of the current screen -> its module (permission path) */
export function moduleForRoute(route: string, options: ModuleOption[]): ModuleOption | null {
  const path = String(route || '').toLowerCase().replace(/\?.*$/, '');
  if (!path) return null;
  if (path.includes('/mill')) return options.find((o) => o.value === 'mill.dashboard') || options.find((o) => o.value === 'mill') || null;
  const last = path.split('/').filter(Boolean).pop() || '';
  try {
    const nodes = [...getUiNodes('navigation'), ...getUiNodes('screen'), ...getUiNodes('tab')];
    const hit = nodes.find((n) => n.route && (String(n.route).toLowerCase() === last || path.endsWith(`/${String(n.route).toLowerCase()}`)));
    if (hit) return options.find((o) => o.value === hit.permission) || null;
  } catch { /* registry not ready */ }
  return options.find((o) => o.value.split('.').pop() === last.replace(/-/g, '_')) || null;
}

export const moduleLabel = (o: ModuleOption | null) => (!o ? '' : o.depth === 0 || !o.area ? o.label : `${o.area} › ${o.label}`);
