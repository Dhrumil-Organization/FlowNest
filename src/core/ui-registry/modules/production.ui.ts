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


registerUiNodes([
  {
    id: 'nav.production_order_tracking',
    kind: 'navigation',
    title: 'Production Order Tracking',
    permission: 'production.production_order_tracking',
    action: 'view',
    route: 'production-order-tracking',
    icon: 'assignment',
    order: 90,
  },
  {
    id: 'screen.production_order_tracking',
    kind: 'screen',
    title: 'Production Order Tracking',
    permission: 'production.production_order_tracking',
    action: 'view',
    order: 90,
  },
  {
    id: 'nav.sudamo_production_order',
    kind: 'navigation',
    title: 'Sudamo Production Order',
    permission: 'production.sudamo_production_order',
    action: 'view',
    route: 'sudamo-production-order',
    icon: 'assignment-turned-in',
    order: 100,
  },
  {
    id: 'screen.sudamo_production_order',
    kind: 'screen',
    title: 'Sudamo Production Order',
    permission: 'production.sudamo_production_order',
    action: 'view',
    order: 100,
  },
  {
    id: 'nav.credit_limit_request',
    kind: 'navigation',
    title: 'Credit Limit Request',
    permission: 'production.credit_limit_request',
    action: 'view',
    route: 'credit-limit-request',
    icon: 'credit-card',
    order: 110,
  },  
  {
    id: 'screen.credit_limit_request',
    kind: 'screen',
    title: 'Credit Limit Request',
    permission: 'production.credit_limit_request',
    action: 'view',
    order: 110,
  },
]);