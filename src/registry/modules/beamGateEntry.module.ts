// FILE: src/registry/modules/beamGateEntry.module.ts
//
// SINGLE-FILE FEATURE MODULE for "Beam Gate Entry" (security: empty beams coming back against a Beam Outward).
//   1. Permission resource -> Access Control (roles / users) after registry sync
//   2. Navigation + screen -> route `beam-gate-entry`
//
// Wiring: import this file in src/registry/index.ts and src/core/ui-registry/index.ts;
// route file app/new/(tabs)/beam-gate-entry.tsx (OUTER app/).

import { registerUiNodes } from '../../core/ui-registry/uiRegistry';
import { registerPermissionArea } from '../permissionRegistry';

export const BEAM_GATE_ENTRY = { resource: 'beam_gate_entry' } as const;

registerPermissionArea({
  key: 'production',
  name: 'Production',
  icon: 'construct-outline',
  displayOrder: 30,
  resources: [
    {
      key: 'beam_gate_entry',
      name: 'Beam Gate Entry',
      type: 'screen',
      description: 'Security: beams coming back against a Beam Outward (GRLog, GRType BMR) - Beam Inward is made from it',
      displayOrder: 63,
      actions: [
        { key: 'view', name: 'View', displayOrder: 10 },
        { key: 'add', name: 'Add Gate Entry', displayOrder: 20 },
        { key: 'edit', name: 'Edit Gate Entry', displayOrder: 30 },
        { key: 'delete', name: 'Delete Gate Entry', dangerous: true, displayOrder: 40 },
      ],
    },
  ],
});

registerUiNodes([
  { id: 'nav.beam_gate_entry', kind: 'navigation', title: 'Beam Gate Entry', permission: BEAM_GATE_ENTRY.resource, action: 'view', route: 'beam-gate-entry', icon: 'login', order: 63 },
  { id: 'screen.beam_gate_entry', kind: 'screen', title: 'Beam Gate Entry', permission: BEAM_GATE_ENTRY.resource, action: 'view', order: 63 },
]);
