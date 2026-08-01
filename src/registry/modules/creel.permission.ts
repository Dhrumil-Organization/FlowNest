import { registerPermissionArea } from '../permissionRegistry';

// TEMPORARY PRODUCTION HOLD:
// Keep Checking Scanner source code available for later validation, but do not
// publish it to the permission registry until the module is production-ready.
registerPermissionArea({
  key: 'production',
  name: 'Production',
  icon: 'construct-outline',
  displayOrder: 30,
  resources: [
    {
      key: 'creel',
      name: 'Creel Management',
      type: 'screen',
      displayOrder: 10,
      actions: [
        { key: 'view', name: 'View' },
        { key: 'add', name: 'Add' },
        { key: 'edit', name: 'Edit' },
        { key: 'delete', name: 'Delete', dangerous: true },
      ],
      children: [
        {
          key: 'browser',
          name: 'Creel Browser',
          type: 'section',
          displayOrder: 10,
          actions: [
            { key: 'view', name: 'View List' },
            { key: 'filter', name: 'Filter' },
            { key: 'search', name: 'Search' },
          ],
        },
        {
          key: 'entry',
          name: 'Creel Entry',
          type: 'dialog',
          displayOrder: 20,
          actions: [
            { key: 'add', name: 'Add' },
            { key: 'edit', name: 'Edit' },
            { key: 'save', name: 'Save' },
          ],
        },
        {
          key: 'scanner',
          name: 'Carton Scanner',
          type: 'dialog',
          displayOrder: 30,
          actions: [
            { key: 'scan', name: 'Scan Carton' },
            { key: 'manual_search', name: 'Manual Search' },
            { key: 'delete_carton', name: 'Delete Carton', dangerous: true },
          ],
        },
      ],
    },
    /*
     * TEMPORARILY DISABLED — CHECKING SCANNER
     *
     * The complete screen and route files remain in the project. The registry
     * resource is intentionally not published, so it cannot appear in app
     * navigation, More, or newly synchronized permission data.
     *
     * Re-enable only after the route and workflow are validated.
     */
  ],
});
