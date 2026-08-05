import { registerUiNodes } from '../uiRegistry';

// NEW: Beam Close — migrated from the old BeamClose/index.tsx +
// BeamClose/SelectBeam.tsx screens. permission path matches
// registry/modules/creel.permission.ts's new 'beam_close' resource.
// TEMPORARY PRODUCTION HOLD: module remains available in source but is not
// registered in Home, tabs, More, search, or quick navigation.
const ENABLE_BEAM_CLOSE_UI = false;

if (ENABLE_BEAM_CLOSE_UI) registerUiNodes([
  {
    id: 'nav.beam_close',
    kind: 'navigation',
    title: 'Beam Close',
    permission: 'beam_close',
    action: 'view',
    route: 'beam-close',
    icon: 'layers',
    order: 70,
  },
]);
