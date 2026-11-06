import { registerPermissionArea } from '../permissionRegistry';

// Salary and Unit Consumption are independent reports under Reports.
// View, edit and save are separate grants so read-only users cannot modify
// monthly operational figures.
const reportActions = [
  { key: 'view', name: 'View' },
  { key: 'edit', name: 'Modify monthly values' },
  { key: 'save', name: 'Save monthly values' },
];

registerPermissionArea({
  key: 'management',
  name: 'Management',
  icon: 'speedometer-outline',
  displayOrder: 10,
  resources: [
    {
      key: 'reports',
      name: 'Reports',
      type: 'module',
      displayOrder: 20,
      actions: [],
      children: [
        {
          key: 'salary',
          name: 'Salary',
          type: 'report',
          displayOrder: 50,
          actions: reportActions,
        },
        {
          key: 'unit_consumption',
          name: 'Unit Consumption',
          type: 'report',
          displayOrder: 60,
          actions: reportActions,
        },
      ],
    },
  ],
});
