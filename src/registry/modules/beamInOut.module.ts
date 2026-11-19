// FILE: src/registry/modules/beamInOut.module.ts
//
// SINGLE-FILE FEATURE MODULE for "Beam Outward" and "Beam Inward" (Knitting) — two separate menu entries.
//   1. Permission resources -> Access Control (roles / users) after registry sync
//   2. Navigation + screens -> routes `beam-outward` and `beam-inward`
//
// Wiring (see BEAM_INOUT_PATCH.md):
//   - import this file in src/registry/index.ts          (permission registry)
//   - import this file in src/core/ui-registry/index.ts  (before validateUiRegistry)
//   - route files: app/new/(tabs)/beam-outward.tsx, app/new/(tabs)/beam-inward.tsx (OUTER app/)

import { registerUiNodes } from '../../core/ui-registry/uiRegistry';
import { registerPermissionArea } from '../permissionRegistry';

/** Resource paths used by the screens */
export const BEAM_OUTWARD = {
  resource: 'beam_outward',
  beams: 'beam_outward.beam_detail',
  tax: 'beam_outward.tax_detail',
} as const;

export const BEAM_INWARD = {
  resource: 'beam_inward',
  /** action on beam_inward: take in our beams without a Beam Gate Entry (gate entry is compulsory otherwise) */
  withoutGate: 'without_gate',
  beams: 'beam_inward.beam_detail',
  tax: 'beam_inward.tax_detail',
} as const;

type Action = { key: string; name: string; dangerous?: boolean; displayOrder: number };
const resource = (key: string, name: string, description: string, displayOrder: number, extra: Action[] = []) => ({
  key,
  name,
  type: 'screen' as const,
  description,
  displayOrder,
  actions: [
    { key: 'view', name: 'View', displayOrder: 10 },
    { key: 'add', name: `Add ${name}`, displayOrder: 20 },
    { key: 'edit', name: `Edit ${name}`, displayOrder: 30 },
    { key: 'delete', name: `Delete ${name}`, dangerous: true, displayOrder: 40 },
    { key: 'print', name: 'Print', displayOrder: 50 },
    ...extra,
  ],
  children: [
    {
      key: 'beam_detail',
      name: 'Beam Detail',
      type: 'section' as const,
      displayOrder: 10,
      actions: [
        { key: 'view', name: 'View', displayOrder: 10 },
        { key: 'edit', name: 'Add / Change Beam', displayOrder: 20 },
        { key: 'remove_beam', name: 'Remove Beam', dangerous: true, displayOrder: 30 },
      ],
    },
    {
      key: 'tax_detail',
      name: 'Tax Detail',
      type: 'dialog' as const,
      displayOrder: 20,
      actions: [
        { key: 'view', name: 'View', displayOrder: 10 },
        { key: 'edit', name: 'Change Tax', displayOrder: 20 },
      ],
    },
  ],
});

// ---------------------------------------------------------------------------
// 1. PERMISSIONS
// ---------------------------------------------------------------------------
registerPermissionArea({
  key: 'production',
  name: 'Production',
  icon: 'construct-outline',
  displayOrder: 30,
  resources: [
    resource('beam_outward', 'Beam Outward', 'Knitting: beams sent to a party (FAMBOut RType O)', 60),
    resource('beam_inward', 'Beam Inward', 'Knitting: beams received back from a party (FAMBOut RType I)', 61, [
      { key: 'without_gate', name: 'Inward without Gate Entry', dangerous: true, displayOrder: 60 },
    ]),
  ],
});

// ---------------------------------------------------------------------------
// 2. NAVIGATION + SCREEN NODES (separate menu entries)
// ---------------------------------------------------------------------------
registerUiNodes([
  { id: 'nav.beam_outward', kind: 'navigation', title: 'Beam Outward', permission: BEAM_OUTWARD.resource, action: 'view', route: 'beam-outward', icon: 'north-east', order: 60 },
  { id: 'screen.beam_outward', kind: 'screen', title: 'Beam Outward', permission: BEAM_OUTWARD.resource, action: 'view', order: 60 },
  { id: 'nav.beam_inward', kind: 'navigation', title: 'Beam Inward', permission: BEAM_INWARD.resource, action: 'view', route: 'beam-inward', icon: 'south-west', order: 61 },
  { id: 'screen.beam_inward', kind: 'screen', title: 'Beam Inward', permission: BEAM_INWARD.resource, action: 'view', order: 61 },
]);
