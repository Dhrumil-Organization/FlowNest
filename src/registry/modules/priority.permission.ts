import { registerPermissionArea } from '../permissionRegistry';

// DYEING module (was "Priority").
//
// The resource KEY stays 'priority' on purpose: existing role/user grants
// are stored against 'priority', so renaming the key would silently remove
// everyone's access. Only the display name changes to "Dyeing".
//
// Resource paths:
//   priority                   Dyeing module (root; old actions kept for
//                              users who have not been given tab rights yet)
//   priority.chart_priority    Priority tab
//   priority.daily_update      Daily Update tab
//   priority.mill_hub          Mill Hub tab
//
// Same 'commercial' area already registered by costing/orders —
// registerPermissionArea merges resources by key.
registerPermissionArea({
  key: 'commercial',
  name: 'Commercial',
  icon: 'calculator-outline',
  displayOrder: 40,
  resources: [
    {
      key: 'priority',
      name: 'Dyeing',
      type: 'screen',
      displayOrder: 30,
      actions: [
        { key: 'view', name: 'View' },
        { key: 'edit', name: 'Reorder Charts (legacy)' },
        { key: 'save', name: 'Save Priority / Status (legacy)' },
      ],
      children: [
        {
          key: 'chart_priority',
          name: 'Priority',
          type: 'tab',
          displayOrder: 10,
          actions: [
            { key: 'view', name: 'View' },
            { key: 'edit', name: 'Reorder Charts' },
            { key: 'save', name: 'Save Priority' },
            { key: 'status', name: 'Update Status (incl. Lorry Cut)' },
            { key: 'lot', name: 'Add / Edit Lots' },
          ],
        },
        {
          key: 'daily_update',
          name: 'Daily Update',
          type: 'tab',
          displayOrder: 20,
          actions: [{ key: 'view', name: 'View' }],
        },
        {
          key: 'mill_hub',
          name: 'Mill Hub',
          type: 'tab',
          displayOrder: 30,
          actions: [{ key: 'view', name: 'View' }],
        },
      ],
    },
  ],
});
