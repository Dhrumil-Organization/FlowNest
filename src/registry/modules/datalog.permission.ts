import { registerPermissionArea } from '../permissionRegistry';

// Same 'commercial' area already registered by costing.permission.ts,
// orders.permission.ts and priority.permission.ts — registerPermissionArea
// merges resources by key, so this just adds one more resource ('datalog')
// into that area rather than creating a duplicate area.
registerPermissionArea({
  key: 'commercial',
  name: 'Commercial',
  icon: 'calculator-outline',
  displayOrder: 40,
  resources: [
    {
      key: 'datalog',
      name: 'Datalog',
      type: 'screen',
      displayOrder: 50,
      actions: [
        { key: 'view', name: 'View' },
      ],
    },
  ],
});
