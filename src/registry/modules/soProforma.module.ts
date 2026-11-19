// FILE: src/registry/modules/soProforma.module.ts
//
// SINGLE-FILE FEATURE MODULE for "Proforma Invoice" (split an authorized Grey Sales Order into proformas).
//   1. Permission resource -> Access Control (roles / users) after registry sync
//   2. Navigation + screen -> route `so-proforma`
//
// Wiring: import this file in src/registry/index.ts and src/core/ui-registry/index.ts;
// route file app/new/(tabs)/so-proforma.tsx (OUTER app/).

import { registerUiNodes } from '../../core/ui-registry/uiRegistry';
import { registerPermissionArea } from '../permissionRegistry';

export const SO_PROFORMA = { resource: 'so_proforma' } as const;

registerPermissionArea({
  key: 'commercial',
  name: 'Commercial',
  icon: 'cart-outline',
  displayOrder: 40,
  resources: [
    {
      key: 'so_proforma',
      name: 'Proforma Invoice',
      type: 'screen',
      description: 'Split an authorized Sales Order (Grey) into proforma invoices (FAMSOProforma)',
      displayOrder: 40,
      actions: [
        { key: 'view', name: 'View', displayOrder: 10 },
        { key: 'add', name: 'Add Proforma', displayOrder: 20 },
        { key: 'edit', name: 'Edit Proforma', displayOrder: 30 },
        { key: 'delete', name: 'Delete Proforma', dangerous: true, displayOrder: 40 },
        { key: 'print', name: 'Print', displayOrder: 50 },
      ],
    },
  ],
});

registerUiNodes([
  { id: 'nav.so_proforma', kind: 'navigation', title: 'Proforma Invoice', permission: SO_PROFORMA.resource, action: 'view', route: 'so-proforma', icon: 'request-quote', order: 40 },
  { id: 'screen.so_proforma', kind: 'screen', title: 'Proforma Invoice', permission: SO_PROFORMA.resource, action: 'view', order: 40 },
]);
