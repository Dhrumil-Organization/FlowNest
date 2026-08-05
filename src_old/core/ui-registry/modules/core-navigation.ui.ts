import { registerUiNodes } from '../uiRegistry';

registerUiNodes([
  { id: 'nav.costing', kind: 'navigation', title: 'Costing', permission: 'costing', action: 'view', route: 'costing', icon: 'attach-money', order: 30 },
  { id: 'nav.orders', kind: 'navigation', title: 'Orders', permission: 'orders', action: 'view', route: 'orders', icon: 'shopping-cart', order: 40 },
  // FIX: was 'management.reports' — resourcePath is built purely from resource
  // nesting (see permissionRegistry.ts flattenPermissionRegistry), never
  // prefixed with the area key ('management'). The real registered path for
  // this resource (dashboard.permission.ts, area 'management', resource key
  // 'reports') is just 'reports'. The old string matched nothing, so this
  // tab was only ever visible to a superadmin — no role/user grant could
  // reach it.
  { id: 'nav.reports', kind: 'navigation', title: 'Reports', permission: 'reports', action: 'view', route: 'reports', icon: 'assessment', order: 50 },
  // FIX: was 'administration.permission_manager' — no such resource key
  // exists anywhere in the registry. The actual registered resource that
  // gates this screen (administration.permission.ts) is 'access_control',
  // which already has a 'manage' action defined — matching the `action`
  // below. Same bug as above: this tab was only ever visible to a
  // superadmin in practice.
  { id: 'nav.permissions', kind: 'navigation', title: 'Permissions', permission: 'access_control', action: 'manage', route: 'permissions/index', icon: 'admin-panel-settings', order: 90 },
]);
