import { registerUiNodes } from '../uiRegistry';

registerUiNodes([
  { id: 'nav.beam_close', kind: 'navigation', title: 'Beam Close', permission: 'beam_close', action: 'view', route: 'beam-close/index', icon: 'power-settings-new', order: 60 },
  { id: 'screen.beam_close', kind: 'screen', title: 'Beam Close', permission: 'beam_close', action: 'view', order: 60 },
  { id: 'nav.beam_gaiting', kind: 'navigation', title: 'Beam Gaiting', permission: 'beam_gaiting', action: 'view', route: 'beam-gaiting/index', icon: 'settings-input-component', order: 70 },
  { id: 'screen.beam_gaiting', kind: 'screen', title: 'Beam Gaiting', permission: 'beam_gaiting', action: 'view', order: 70 },
]);
