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
        { key: 'production_summary', name: 'Production Summary', type: 'widget', displayOrder: 10, actions: [{ key: 'view', name: 'View' }] },
        { key: 'sales_summary', name: 'Sales Summary', type: 'widget', displayOrder: 20, actions: [{ key: 'view', name: 'View' }] },
        { key: 'costing_summary', name: 'Costing Summary', type: 'widget', displayOrder: 30, actions: [{ key: 'view', name: 'View' }] },
        { key: 'pending_authorizations', name: 'Pending Authorizations', type: 'widget', displayOrder: 40, actions: [{ key: 'view', name: 'View' }] },
      ],
    },
    {
      key: 'reports',
      name: 'Reports',
      type: 'module',
      displayOrder: 20,
      actions: [{ key: 'view', name: 'View Reports' }],
      children: [
        { key: 'sales_analysis', name: 'Sales Analysis', type: 'report', displayOrder: 10, actions: [{ key: 'view', name: 'View' }, { key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'production_report', name: 'Production Report', type: 'report', displayOrder: 20, actions: [{ key: 'view', name: 'View' }, { key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
      ],
    },
  ],
});
