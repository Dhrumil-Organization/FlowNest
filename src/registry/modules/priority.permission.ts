import { registerPermissionArea } from '../permissionRegistry';

// Same 'commercial' area already registered by costing.permission.ts and
// orders.permission.ts — registerPermissionArea merges resources by key,
// so this just adds one more resource ('priority') into that area rather
// than creating a duplicate area.
registerPermissionArea({
  key: 'commercial',
  name: 'Commercial',
  icon: 'calculator-outline',
  displayOrder: 40,
  resources: [
    {
      key: 'priority',
      name: 'Priority',
      type: 'screen',
      displayOrder: 30,
      actions: [
        { key: 'view', name: 'View' },
        { key: 'edit', name: 'Reorder Charts' },
        { key: 'save', name: 'Save Priority' },
      ],
    },
  ],
});
