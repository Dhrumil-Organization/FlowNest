import { registerUiNodes } from '../uiRegistry';

// FIX: this file had been changed to route: 'checking' / permission:
// 'checking' — neither exists. The real route file is
// app/new/(tabs)/checking-scanner.tsx (not checking.tsx), and the real
// registered permission resource is 'checking_scanner' (see
// registry/modules/creel.permission.ts), not 'checking'. With those
// wrong values, the cross-registry validation in
// core/ui-registry/index.ts should have thrown at startup — if it
// didn't for you, that's worth double-checking separately, since that
// check exists specifically to catch this.
// TEMPORARY PRODUCTION HOLD: module remains available in source but is not
// registered in Home, tabs, More, search, or quick navigation.
const ENABLE_CHECKING_SCANNER_UI = false;

if (ENABLE_CHECKING_SCANNER_UI) registerUiNodes([
    {
        id: 'nav.checking_scanner',
        kind: 'navigation',
        title: 'Checking Scanner',
        permission: 'checking_scanner',
        action: 'view',
        route: 'checking-scanner',
        icon: 'qr-code-scanner',
        order: 50,
    },
]);
