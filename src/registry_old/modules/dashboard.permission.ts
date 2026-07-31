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
      actions: [{ key: 'view', name: 'View Dashboard' }],
      children: [
        { key: 'owner_view', name: 'Owner View', type: 'widget', displayOrder: 5, actions: [{ key: 'view', name: 'View all executives' }] },
        { key: 'monthly_target', name: 'Monthly Target', type: 'widget', displayOrder: 10, actions: [{ key: 'view', name: 'View' }] },
        { key: 'monthly_report', name: 'Monthly Report', type: 'report', displayOrder: 20, actions: [{ key: 'view', name: 'View' }, { key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'sales_summary', name: 'Sales Summary', type: 'widget', displayOrder: 30, actions: [{ key: 'view', name: 'View' }] },
        { key: 'collection_summary', name: 'Collection Summary', type: 'widget', displayOrder: 40, actions: [{ key: 'view', name: 'View' }] },
        { key: 'outstanding_summary', name: 'Outstanding Summary', type: 'widget', displayOrder: 50, actions: [{ key: 'view', name: 'View' }] },
        { key: 'production_summary', name: 'Production Summary', type: 'widget', displayOrder: 60, actions: [{ key: 'view', name: 'View' }] },
      ],
    },
    {
      key: 'reports',
      name: 'Reports',
      type: 'module',
      displayOrder: 20,
      actions: [{ key: 'view', name: 'View Reports' }],
      children: [
        { key: 'monthly_target', name: 'Monthly Target', type: 'report', displayOrder: 5, actions: [{ key: 'view', name: 'View' }, { key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'monthly_report', name: 'Monthly Report', type: 'report', displayOrder: 10, actions: [{ key: 'view', name: 'View' }, { key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'sales_analysis', name: 'Sales Analysis', type: 'report', displayOrder: 20, actions: [{ key: 'view', name: 'View' }, { key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'collection_analysis', name: 'Collection Analysis', type: 'report', displayOrder: 30, actions: [{ key: 'view', name: 'View' }, { key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'production_report', name: 'Production Report', type: 'report', displayOrder: 40, actions: [{ key: 'view', name: 'View' }, { key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
      ],
    },
  ],
});
