import { registerPermissionArea } from '../permissionRegistry';

registerPermissionArea({
  key: 'production',
  name: 'Production',
  icon: 'construct-outline',
  displayOrder: 30,
  resources: [
    {
      key: 'beam_close',
      name: 'Beam Close',
      type: 'screen',
      displayOrder: 20,
      actions: [
        { key: 'view', name: 'View' },
        { key: 'save', name: 'Save Beam Close' },
        { key: 'load_beam', name: 'Load Closed Beam' },
        { key: 'clear', name: 'Clear Form' },
      ],
      children: [
        { key: 'entry', name: 'Beam Close Entry', type: 'section', displayOrder: 10, actions: [{ key: 'view', name: 'View' }, { key: 'save', name: 'Save' }] },
        { key: 'beam_help', name: 'Closed Beam Help', type: 'dialog', displayOrder: 20, actions: [{ key: 'view', name: 'View' }, { key: 'open', name: 'Open Beam' }] },
      ],
    },
    {
      key: 'beam_gaiting',
      name: 'Beam Gaiting',
      type: 'screen',
      displayOrder: 30,
      actions: [
        { key: 'view', name: 'View' },
        { key: 'add', name: 'Add Gaiting' },
        { key: 'edit', name: 'Edit Gaiting' },
        { key: 'delete', name: 'Delete', dangerous: true },
        { key: 'search', name: 'Search' },
      ],
      children: [
        { key: 'browser', name: 'Gaiting Browser', type: 'section', displayOrder: 10, actions: [{ key: 'view', name: 'View' }, { key: 'search', name: 'Search' }, { key: 'filter', name: 'Filter' }] },
        { key: 'entry', name: 'Gaiting Entry', type: 'dialog', displayOrder: 20, actions: [{ key: 'view', name: 'View' }, { key: 'add', name: 'Add' }, { key: 'edit', name: 'Edit' }, { key: 'save', name: 'Save' }] },
      ],
    },
  ],
});
