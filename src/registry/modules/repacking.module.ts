// FILE: src/registry/modules/repacking.module.ts
//
// SINGLE-FILE FEATURE MODULE for "Repacking" (Knitting • Grey store).
// Same pattern as production.module.ts:
//   1. Permission resource  -> appears in Access Control (roles / users) after registry sync
//   2. Navigation + screen  -> sidebar / bottom-bar entry, route `repacking`
//
// Wiring (see REPACKING_PATCH.md):
//   - import this file in src/registry/index.ts          (permission registry)
//   - import this file in src/core/ui-registry/index.ts  (before validateUiRegistry)
//   - route file: app/new/(tabs)/repacking.tsx     (OUTER app/, not src/app/)

import { registerUiNodes } from '../../core/ui-registry/uiRegistry';
import { registerPermissionArea } from '../permissionRegistry';

/** Resource paths used by the screen (resource keys only — the area key is not part of the path). */
export const REPACKING = {
  resource: 'repacking',
  cartons: 'repacking.carton_entry',
} as const;

// ---------------------------------------------------------------------------
// 1. PERMISSIONS
// ---------------------------------------------------------------------------
registerPermissionArea({
  key: 'production',
  name: 'Production',
  icon: 'construct-outline',
  displayOrder: 30,
  resources: [
    {
      key: 'repacking',
      name: 'Repacking',
      type: 'screen',
      description: 'Knitting grey repacking from a Repacking Issue (auto or manual entry)',
      displayOrder: 46,
      actions: [
        { key: 'view', name: 'View', displayOrder: 10 },
        { key: 'add', name: 'Add Repacking', displayOrder: 20 },
        { key: 'edit', name: 'Edit Repacking', displayOrder: 30 },
        { key: 'delete', name: 'Delete Repacking', dangerous: true, displayOrder: 40 },
        { key: 'print', name: 'Print', displayOrder: 50 },
      ],
      children: [
        {
          key: 'carton_entry',
          name: 'Carton Detail',
          type: 'section',
          displayOrder: 10,
          actions: [
            { key: 'view', name: 'View', displayOrder: 10 },
            { key: 'edit', name: 'Add / Rename Carton', displayOrder: 20 },
            { key: 'remove_carton', name: 'Remove Carton', dangerous: true, displayOrder: 30 },
          ],
        },
      ],
    },
  ],
});

// ---------------------------------------------------------------------------
// 2. NAVIGATION + SCREEN NODES
// `permission` must equal the resource path above; `route` must equal the route
// file name in app/new/(tabs)/ (without .tsx). The header title comes from `title`.
// ---------------------------------------------------------------------------
registerUiNodes([
  {
    id: 'nav.repacking',
    kind: 'navigation',
    title: 'Repacking',
    permission: REPACKING.resource,
    action: 'view',
    route: 'repacking',
    icon: 'all-inbox',
    order: 57,
  },
  {
    id: 'screen.repacking',
    kind: 'screen',
    title: 'Repacking',
    permission: REPACKING.resource,
    action: 'view',
    order: 57,
  },
]);
