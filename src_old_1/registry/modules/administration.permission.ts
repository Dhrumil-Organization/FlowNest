import { registerPermissionArea } from '../permissionRegistry';

registerPermissionArea({
  key: 'administration',
  name: 'Administration',
  icon: 'settings-outline',
  displayOrder: 90,
  resources: [
    {
      key: 'access_control',
      name: 'Access Control',
      type: 'screen',
      displayOrder: 10,
      actions: [{ key: 'view', name: 'View' }, { key: 'manage', name: 'Manage Access' }],
      children: [
        { key: 'roles', name: 'Role Permissions', type: 'tab', displayOrder: 10, actions: [{ key: 'view', name: 'View' }, { key: 'save', name: 'Save Role Permissions' }] },
        { key: 'users', name: 'User Access', type: 'tab', displayOrder: 20, actions: [{ key: 'view', name: 'View' }, { key: 'assign', name: 'Assign Roles' }, { key: 'save', name: 'Save User Overrides' }] },
        { key: 'registry_sync', name: 'Registry Sync', type: 'section', displayOrder: 30, actions: [{ key: 'view', name: 'View Status' }, { key: 'sync', name: 'Synchronize Registry', dangerous: true }] },
      ],
    },
  ],
});
