// FILE: src/registry/modules/beamReport.module.ts
//
// "Beam Report" — Beam Outward / Beam Inward reports (tabs), route `beam-report`.
// Wiring: import in src/registry/index.ts and src/core/ui-registry/index.ts; route app/new/(tabs)/beam-report.tsx.

import { registerUiNodes } from '../../core/ui-registry/uiRegistry';
import { registerPermissionArea } from '../permissionRegistry';

export const BEAM_REPORT = {
  resource: 'beam_report',
  outward: 'beam_report.outward',
  inward: 'beam_report.inward',
} as const;

registerPermissionArea({
  key: 'production',
  name: 'Production',
  icon: 'construct-outline',
  displayOrder: 30,
  resources: [
    {
      key: 'beam_report',
      name: 'Beam Report',
      type: 'report',
      description: 'Beam Outward (all / pending) and Beam Inward with the outward it came back on',
      displayOrder: 63,
      actions: [{ key: 'view', name: 'View', displayOrder: 10 }],
      children: [
        { key: 'outward', name: 'Beam Outward', type: 'tab', displayOrder: 10, actions: [{ key: 'view', name: 'View', displayOrder: 10 }, { key: 'export', name: 'Export', displayOrder: 20 }] },
        { key: 'inward', name: 'Beam Inward', type: 'tab', displayOrder: 20, actions: [{ key: 'view', name: 'View', displayOrder: 10 }, { key: 'export', name: 'Export', displayOrder: 20 }] },
      ],
    },
  ],
});

registerUiNodes([
  { id: 'nav.beam_report', kind: 'navigation', title: 'Beam Report', permission: BEAM_REPORT.resource, action: 'view', route: 'beam-report', icon: 'assessment', order: 63 },
  { id: 'screen.beam_report', kind: 'screen', title: 'Beam Report', permission: BEAM_REPORT.resource, action: 'view', order: 63 },
]);
