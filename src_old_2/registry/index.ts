/*
 * Import every permission module exactly once.
 * Adding a new screen requires:
 * 1. Create its *.permission.ts file.
 * 2. Import that file here.
 * 3. Run Registry Sync from Access Control.
 */
import './modules/dashboard.permission';
import './modules/designs.permission';
import './modules/creel.permission';
import './modules/costing.permission';
import './modules/orders.permission';
import './modules/administration.permission';

import { validatePermissionRegistry } from './permissionRegistry';

validatePermissionRegistry();

export {
  clearPermissionRegistryForTests,
  createPermissionRegistrySyncPayload,
  findPermissionResource,
  flattenPermissionRegistry,
  getPermissionRegistry,
  registerPermissionArea,
  validatePermissionRegistry,
} from './permissionRegistry';

export { PermissionActions, PermissionKeys } from './permissionKeys';
