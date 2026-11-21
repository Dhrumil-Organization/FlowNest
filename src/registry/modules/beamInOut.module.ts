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

/**
 * Resource + ACTION keys used by the screens.
 * Beam / tax / job-yarn rights are ACTIONS of the screen resource (like without_gate): the Access Control list shows the
 * actions of a resource — the old child sections (beam_detail / tax_detail) never appeared there, so nobody could get them.
 */
export const BEAM_ACTIONS = {
  beams: 'beam_edit',        // Add / change beam rows
  removeBeam: 'remove_beam', // Remove a beam row
  tax: 'tax_edit',           // Change the Tax Detail
  jobYarn: 'job_yarn',       // Beam job: send yarn with the beams (outward) / take it back on the beams (inward)
} as const;

export const BEAM_OUTWARD = { resource: 'beam_outward', ...BEAM_ACTIONS } as const;

export const BEAM_INWARD = {
  resource: 'beam_inward',
  ...BEAM_ACTIONS,
  /** take in our beams without a Beam Gate Entry (gate entry is compulsory otherwise) */
  withoutGate: 'without_gate',
} as const;

type Action = { key: string; name: string; dangerous?: boolean; displayOrder: number };
const resource = (key: string, name: string, description: string, displayOrder: number, jobYarnName: string, extra: Action[] = []) => ({
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
    { key: BEAM_ACTIONS.beams, name: 'Add / Change Beam', displayOrder: 60 },
    { key: BEAM_ACTIONS.removeBeam, name: 'Remove Beam', dangerous: true, displayOrder: 61 },
    { key: BEAM_ACTIONS.tax, name: 'Change Tax Detail', displayOrder: 62 },
    { key: BEAM_ACTIONS.jobYarn, name: jobYarnName, displayOrder: 63 },
    ...extra,
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
    resource('beam_outward', 'Beam Outward', 'Knitting: beams sent to a party (FAMBOut RType O) + job yarn (GRYOut, annexure)', 60,
      'Job yarn — send yarn with the beams'),
    resource('beam_inward', 'Beam Inward', 'Knitting: beams received back from a party (FAMBOut RType I) + yarn back on the beams (GRYInw)', 61,
      'Job yarn — take yarn back on the beams', [
        { key: 'without_gate', name: 'Inward without Gate Entry', dangerous: true, displayOrder: 70 },
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
