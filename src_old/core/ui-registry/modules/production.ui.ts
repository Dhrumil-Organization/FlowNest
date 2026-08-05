import { registerUiNodes } from '../uiRegistry';

// NOTE: this file previously also registered 'nav.beam_close' /
// 'screen.beam_close' — that's a duplicate of core/ui-registry/modules/
// beam-close.ui.ts, which already registers the same nav id, pointing at
// the properly-migrated screen (screens/beamClose/BeamCloseScreen.tsx).
// This file's route ('beam-close/index', pointing at a raw/unconverted
// duplicate screen under screens/production/beam-close/) was the
// conflicting one — removed here. Only 'beam_gaiting' (a genuinely new
// feature, not a duplicate of anything) stays.
// TEMPORARY PRODUCTION HOLD: module remains available in source but is not
// registered in Home, tabs, More, search, or quick navigation.
const ENABLE_BEAM_GAITING_UI = false;

if (ENABLE_BEAM_GAITING_UI) registerUiNodes([
  { id: 'nav.beam_gaiting', kind: 'navigation', title: 'Beam Gaiting', permission: 'beam_gaiting', action: 'view', route: 'beam-gaiting/index', icon: 'settings-input-component', order: 80 },
  { id: 'screen.beam_gaiting', kind: 'screen', title: 'Beam Gaiting', permission: 'beam_gaiting', action: 'view', order: 80 },
]);

