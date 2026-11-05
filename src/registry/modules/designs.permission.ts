import { registerPermissionArea } from '../permissionRegistry';

const standardActions = [
  { key: 'add', name: 'Add' },
  { key: 'edit', name: 'Edit' },
  { key: 'delete', name: 'Delete', dangerous: true },
  { key: 'assign', name: 'Assign' },
  { key: 'authorize', name: 'Authorize', dangerous: true },
  { key: 'print', name: 'Print' },
];

registerPermissionArea({
  key: 'design',
  name: 'Design',
  icon: 'color-palette-outline',
  displayOrder: 20,
  resources: [
    {
      key: 'designs',
      name: 'Designs',
      type: 'screen',
      displayOrder: 10,
      actions: standardActions,
      children: [
        { key: 'monthlysalestarget', name: 'monthlysalestarget', type: 'tab', displayOrder: 5, actions: [{ key: 'add', name: 'Add' }, { key: 'edit', name: 'Edit' }, { key: 'delete', name: 'Delete', dangerous: true }] },
        { key: 'aliases', name: 'Aliases', type: 'tab', displayOrder: 5, actions: [{ key: 'add', name: 'Add' }, { key: 'edit', name: 'Edit' }, { key: 'delete', name: 'Delete', dangerous: true }] },
        { key: 'catalog', name: 'Catalog', type: 'tab', displayOrder: 10, actions: [{ key: 'print', name: 'Print' }] },
        { key: 'design', name: 'Design', type: 'tab', displayOrder: 20, actions: standardActions },
        { key: 'colourway', name: 'Colourway', type: 'tab', displayOrder: 30, actions: standardActions },
        { key: 'yarns', name: 'Yarns', type: 'tab', displayOrder: 40, actions: [{ key: 'add', name: 'Add' }, { key: 'edit', name: 'Edit' }, { key: 'delete', name: 'Delete', dangerous: true }] },
        { key: 'dyeing', name: 'Dyeing', type: 'tab', displayOrder: 50, actions: [{ key: 'add', name: 'Add' }, { key: 'edit', name: 'Edit' }] },
      ],
    },
  ],
});
