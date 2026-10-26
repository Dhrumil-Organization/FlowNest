// ─────────────────────────────────────────────────────────────
// FILE: src/core/permissions/newUser.ts
//
// "NEW USER" rule for the New ERP.
//
// When the login API returns `response.role1` empty — '' / [] / null /
// undefined (also [''] / [null], i.e. an array with nothing real in it) — the
// user has no role assigned yet and is treated as a NEW USER. A new user gets
// a FIXED set of modules, whatever the permission payload says:
//
//   Sudamo / Knits login -> Event, Yarn Manufacturing, Feedback, Inquiry
//   Rayons login         -> Event, Yarn Manufacturing, Feedback
//
// Every other screen stays hidden / denied. Platform admins (user id 1 or
// is_superadmin) are never treated as new users.
//
// This file is the ONE place that defines the rule. It is used by:
//   - PermissionProvider   (tabs, More sheet, sidebar, route guard, buttons)
//   - NotificationContext  (push-notification route rights)
//   - app/new/(tabs)/index reads the result through PermissionProvider: a user
//     without the dashboard right lands on the first visible module (Event here)
// To change the fixed modules, edit NEW_USER_RESOURCES below.
// ─────────────────────────────────────────────────────────────
import { getCurrentErpProperty, normalizeErpProperty, type ErpProperty } from '@/common/API/dynamicAPI';

/** Permission resource paths (see src/registry/modules/production.module.ts). */
export const NEW_USER_RESOURCES: Record<ErpProperty, readonly string[]> = {
  sudamo_knits: [
    'production.event',
    'production.yarn_manufacturing',
    'production.feedback',
    'production.inquiry',
  ],
  rayons: [
    'production.event',
    'production.yarn_manufacturing',
    'production.feedback',
  ],
};

/** Key added to the stored login response by performLogin(): the property this login belongs to. */
export const LOGIN_PROPERTY_KEY = '__erp_property';

const normalizePath = (value: unknown) =>
  String(value ?? '').trim().replace(/^\.+|\.+$/g, '').replace(/\.+/g, '.').toLowerCase();

/** true when role1 is '' / [] / null / undefined / only blank entries. */
export function isRole1Empty(role1: unknown): boolean {
  if (role1 === null || role1 === undefined) return true;
  if (typeof role1 === 'string') {
    const text = role1.trim();
    return text === '' || text === '[]' || text.toLowerCase() === 'null';
  }
  if (Array.isArray(role1)) return role1.every((entry) => isRole1Empty(entry));
  if (typeof role1 === 'object') return Object.keys(role1 as object).length === 0;
  return false;
}

function isPlatformAdmin(rawLoginResponse: any, user: any): boolean {
  return (
    Number(user?.id || rawLoginResponse?.user?.id || 0) === 1 ||
    Number(user?.is_superadmin || rawLoginResponse?.user?.is_superadmin || rawLoginResponse?.issuperadmin || 0) !== 0
  );
}

/**
 * Is the logged-in user a "new user"? Needs the stored login response — when
 * it is not available (not logged in / not hydrated yet) the answer is false
 * and the normal permission flow applies.
 */
export function isNewErpUser(rawLoginResponse: any, user?: any): boolean {
  if (!rawLoginResponse || typeof rawLoginResponse !== 'object') return false;
  if (isPlatformAdmin(rawLoginResponse, user)) return false;
  return isRole1Empty(rawLoginResponse.role1);
}

/** Property of the current login: saved at login time, else the live API property. */
export function newUserProperty(rawLoginResponse: any): ErpProperty {
  const saved = rawLoginResponse?.[LOGIN_PROPERTY_KEY];
  if (saved) return normalizeErpProperty(String(saved));
  return getCurrentErpProperty() ?? 'sudamo_knits';
}

/**
 * The fixed resource set for a new user, or null when the user is NOT a new
 * user (normal permissions apply).
 */
export function getNewUserResources(rawLoginResponse: any, user?: any): Set<string> | null {
  if (!isNewErpUser(rawLoginResponse, user)) return null;
  return new Set(NEW_USER_RESOURCES[newUserProperty(rawLoginResponse)].map(normalizePath));
}

/**
 * Access decision for a new user. A fixed module is allowed, and so is its
 * parent container (e.g. `production`) and anything nested under it.
 */
export function newUserCanAccess(allowed: Set<string>, resourcePath: string): boolean {
  const path = normalizePath(resourcePath);
  if (!path) return false;
  for (const resource of allowed) {
    if (path === resource) return true;
    if (path.startsWith(`${resource}.`)) return true; // tab / section inside an allowed module
    if (resource.startsWith(`${path}.`)) return true; // container of an allowed module
  }
  return false;
}
