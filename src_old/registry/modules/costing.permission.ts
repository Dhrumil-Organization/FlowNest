import { registerPermissionArea } from '../permissionRegistry';

registerPermissionArea({
  key: 'commercial',
  name: 'Commercial',
  icon: 'calculator-outline',
  displayOrder: 40,
  resources: [
    {
      key: 'costing',
      name: 'Costing',
      type: 'screen',
      displayOrder: 10,
      actions: [{ key: 'view', name: 'View' }, { key: 'add', name: 'Add' }, { key: 'edit', name: 'Edit' }, { key: 'delete', name: 'Delete', dangerous: true }, { key: 'print', name: 'Print' }],
      children: [
        { key: 'calculator', name: 'Calculator', type: 'tab', displayOrder: 10, actions: [{ key: 'view', name: 'View' }, { key: 'compute', name: 'Compute' }, { key: 'preview', name: 'Preview' }, { key: 'share', name: 'Share / WhatsApp' }, { key: 'save', name: 'Save Costing' }] },
        { key: 'yarn_prices', name: 'Yarn Prices', type: 'section', displayOrder: 20, actions: [{ key: 'view', name: 'View' }, { key: 'edit', name: 'Edit Yarn Prices' }, { key: 'edit_dyeing', name: 'Edit Yarn Dyeing' }] },
        { key: 'colourway_tiers', name: 'Colourway Tiers', type: 'section', displayOrder: 30, actions: [{ key: 'view', name: 'View' }, { key: 'add', name: 'Add Tier' }, { key: 'edit', name: 'Edit Tier' }, { key: 'delete', name: 'Delete Tier', dangerous: true }] },
        { key: 'history', name: 'History', type: 'tab', displayOrder: 40, actions: [{ key: 'view', name: 'View History' }, { key: 'print', name: 'Print' }] },
        { key: 'variance', name: 'Variance', type: 'tab', displayOrder: 50, actions: [{ key: 'view', name: 'View Variance' }, { key: 'export', name: 'Export' }] },
      ],
    },
  ],
});
