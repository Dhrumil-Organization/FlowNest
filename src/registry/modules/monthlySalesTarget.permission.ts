import { registerPermissionArea } from '../permissionRegistry';

// Standalone "Monthly Sales Target" module — its own tab/route/screen,
// independent of the Designs module. Same permission pattern as every
// other top-level screen (design, costing, orders, etc.): register the
// area + resource here, and everything else (nav tab visibility, route
// guard, permission-manager checkboxes) wires up automatically from this
// single definition.
registerPermissionArea({
  key: 'sales_target',
  name: 'Sales Target',
  icon: 'trending-up-outline',
  displayOrder: 25,
  resources: [
    {
      key: 'monthlysalestarget',
      name: 'Monthly Sales Target',
      type: 'screen',
      displayOrder: 10,
      actions: [
        { key: 'add', name: 'Add' },
        { key: 'edit', name: 'Edit' },
        { key: 'delete', name: 'Delete', dangerous: true },
      ],
    },
  ],
});
