// FILE: src/registry/modules/beamGatePass.module.ts
//
// SINGLE-FILE FEATURE MODULE for "Beam Gate Pass" (security: one gate pass for one Beam Outward).
//   1. Permission resource -> Access Control (roles / users) after registry sync
//   2. Navigation + screen -> route `beam-gate-pass`
//
// Wiring: import this file in src/registry/index.ts and src/core/ui-registry/index.ts;
// route file app/new/(tabs)/beam-gate-pass.tsx (OUTER app/).

import { registerUiNodes } from '../../core/ui-registry/uiRegistry';
import { registerPermissionArea } from '../permissionRegistry';

export const BEAM_GATE_PASS = { resource: 'beam_gate_pass' } as const;

registerPermissionArea({
  key: 'production',
  name: 'Production',
  icon: 'construct-outline',
  displayOrder: 30,
  resources: [
    {
      key: 'beam_gate_pass',
      name: 'Beam Gate Pass',
      type: 'screen',
      description: 'Security: gate pass for a Beam Outward (GPOut / GPOutD1)',
      displayOrder: 62,
      actions: [
        { key: 'view', name: 'View', displayOrder: 10 },
        { key: 'add', name: 'Add Gate Pass', displayOrder: 20 },
        { key: 'edit', name: 'Edit Vehicle / Time', displayOrder: 30 },
        { key: 'delete', name: 'Delete Gate Pass', dangerous: true, displayOrder: 40 },
        { key: 'print', name: 'Print', displayOrder: 50 },
      ],
    },
  ],
});

registerUiNodes([
  { id: 'nav.beam_gate_pass', kind: 'navigation', title: 'Beam Gate Pass', permission: BEAM_GATE_PASS.resource, action: 'view', route: 'beam-gate-pass', icon: 'local-shipping', order: 62 },
  { id: 'screen.beam_gate_pass', kind: 'screen', title: 'Beam Gate Pass', permission: BEAM_GATE_PASS.resource, action: 'view', order: 62 },
]);
