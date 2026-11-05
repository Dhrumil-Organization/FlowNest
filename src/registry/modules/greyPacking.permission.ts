import { registerPermissionArea } from '../permissionRegistry';

registerPermissionArea({
  key: 'production',
  name: 'Production',
  icon: 'construct-outline',
  displayOrder: 30,
  resources: [
    {
      key: 'grey_packing',
      name: 'Grey Packing',
      type: 'screen',
      displayOrder: 40,
      actions: [
        { key: 'view', name: 'View' },
        { key: 'add', name: 'Start Packing' },
        { key: 'scan', name: 'Scan Taka / Carton' },
        { key: 'remove_scan', name: 'Remove Scanned Taka', dangerous: true },
        { key: 'complete', name: 'Complete Packing' },
      ],
      children: [
        {
          key: 'entry',
          name: 'Packing Header',
          type: 'section',
          displayOrder: 10,
          actions: [
            { key: 'view', name: 'View' },
            { key: 'add', name: 'Start Packing' },
          ],
        },
        {
          key: 'scanner',
          name: 'Live QR Scanner',
          type: 'section',
          displayOrder: 20,
          actions: [
            { key: 'view', name: 'View' },
            { key: 'scan', name: 'Scan' },
            { key: 'remove_scan', name: 'Remove Scanned Taka', dangerous: true },
            { key: 'complete', name: 'Complete Packing' },
          ],
        },
      ],
    },
  ],
});
