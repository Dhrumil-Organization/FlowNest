import { registerPermissionArea } from '../permissionRegistry';

registerPermissionArea({
  key: 'management',
  name: 'Management',
  icon: 'speedometer-outline',
  displayOrder: 10,
  resources: [
    {
      key: 'dashboard',
      name: 'Dashboard',
      type: 'screen',
      displayOrder: 10,
      actions: [],
      children: [
        { key: 'owner_view', name: 'Owner View', type: 'section', displayOrder: 5, actions: [] },

        { key: 'monthly_target', name: 'Monthly Target Summary', type: 'widget', displayOrder: 10, actions: [] },
        { key: 'monthly_report', name: 'Monthly Report', type: 'report', displayOrder: 60, actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },

        { key: 'sales_detail', name: 'Sales Detail Card', type: 'widget', displayOrder: 110, actions: [] },
        { key: 'production_detail', name: 'Production Detail Card', type: 'widget', displayOrder: 120, actions: [] },
        { key: 'collection_detail', name: 'Payment Collection Detail Card', type: 'widget', displayOrder: 130, actions: [] },
        { key: 'outstanding_detail', name: 'Outstanding Detail Card', type: 'widget', displayOrder: 140, actions: [] },
      ],
    },
    {
      key: 'reports',
      name: 'Reports',
      type: 'module',
      displayOrder: 20,
      actions: [],
      children: [
        { key: 'monthly_target', name: 'Monthly Target', type: 'report', displayOrder: 5, actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'monthly_report', name: 'Monthly Report', type: 'report', displayOrder: 10, actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'sales_analysis', name: 'Sales Analysis', type: 'report', displayOrder: 20, actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'collection_analysis', name: 'Collection Analysis', type: 'report', displayOrder: 30, actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'production_report', name: 'Production Report', type: 'report', displayOrder: 40, actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
      ],
    },
  ],
});
