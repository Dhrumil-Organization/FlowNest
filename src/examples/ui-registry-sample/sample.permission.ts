import { registerPermissionArea } from '../../registry/permissionRegistry';

registerPermissionArea({
  key: 'sales',
  name: 'Sales',
  displayOrder: 30,
  resources: [{
    key: 'forecast',
    name: 'Sales Forecast',
    type: 'screen',
    actions: [{ key: 'view', name: 'View' }, { key: 'create', name: 'Create' }],
    children: [
      { key: 'summary', name: 'Summary Card', type: 'widget', actions: [{ key: 'view', name: 'View' }] },
      { key: 'filters', name: 'Filters', type: 'section', actions: [{ key: 'view', name: 'View' }] },
      { key: 'create_dialog', name: 'Create Forecast Dialog', type: 'dialog', actions: [{ key: 'open', name: 'Open' }] },
    ],
  }],
});
