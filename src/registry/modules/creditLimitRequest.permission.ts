import { registerPermissionArea } from '../permissionRegistry';

registerPermissionArea({
  key: 'credit',
  name: 'Credit',
  icon: 'card-outline',
  displayOrder: 35,
  resources: [
    {
      key: 'credit_limit_request',
      name: 'Credit Limit Request',
      type: 'screen',
      displayOrder: 10,
      actions: [{ key: 'view', name: 'View' }],
    },
  ],
});
