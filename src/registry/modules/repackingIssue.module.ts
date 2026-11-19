// FILE: src/registry/modules/repackingIssue.module.ts
//
// SINGLE-FILE FEATURE MODULE for "Repacking Issue" (Knitting • Grey store).
// Same pattern as production.module.ts:
//   1. Permission resource  -> appears in Access Control (roles / users) after registry sync
//   2. Navigation + screen  -> sidebar / bottom-bar entry, route `repacking-issue`
//
// Wiring (see REPACKING_ISSUE_PATCH.md):
//   - import this file in src/registry/index.ts          (permission registry)
//   - import this file in src/core/ui-registry/index.ts  (before validateUiRegistry)
//   - route file: app/new/(tabs)/repacking-issue.tsx     (OUTER app/, not src/app/)

import { registerUiNodes } from '../../core/ui-registry/uiRegistry';
import { registerPermissionArea } from '../permissionRegistry';

/** Resource paths used by the screen (resource keys only — the area key is not part of the path). */
export const REPACKING_ISSUE = {
  resource: 'repacking_issue',
  cartons: 'repacking_issue.carton_entry',
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
      key: 'repacking_issue',
      name: 'Repacking Issue',
      type: 'screen',
      description: 'Knitting grey repacking issue with carton scan',
      displayOrder: 45,
      actions: [
        { key: 'view', name: 'View', displayOrder: 10 },
        { key: 'add', name: 'Add Issue', displayOrder: 20 },
        { key: 'edit', name: 'Edit Issue', displayOrder: 30 },
        { key: 'delete', name: 'Delete Issue', dangerous: true, displayOrder: 40 },
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
            { key: 'scan', name: 'Scan / Add Carton', displayOrder: 20 },
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
    id: 'nav.repacking_issue',
    kind: 'navigation',
    title: 'Repacking Issue',
    permission: REPACKING_ISSUE.resource,
    action: 'view',
    route: 'repacking-issue',
    icon: 'move-to-inbox',
    order: 56,
  },
  {
    id: 'screen.repacking_issue',
    kind: 'screen',
    title: 'Repacking Issue',
    permission: REPACKING_ISSUE.resource,
    action: 'view',
    order: 56,
  },
]);
