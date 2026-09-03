/*
 * Import every permission module exactly once.
 * Adding a new screen requires:
 * 1. Create its *.permission.ts file.
 * 2. Import that file here.
 * 3. The registry auto-sync runs on the next Platform Admin login/app startup.
 */
import './modules/dashboard.permission';
import './modules/designs.permission';
import './modules/monthlySalesTarget.permission';
import './modules/creel.permission';
import './modules/beam.permission';
import './modules/costing.permission';
import './modules/orders.permission';
import './modules/administration.permission';
import './modules/greyPacking.permission';

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
