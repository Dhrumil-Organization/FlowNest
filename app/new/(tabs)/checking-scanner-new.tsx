import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { CheckingScannerNewScreen } from '@/src/screens/production/CheckingScannerNewScreen';

// NEW ERP — Checking Scanner (QR scan · manual entry · scanner list · faults · print).
// Legacy screen (app/(tabs)) is unchanged; this is the NEW ERP route.
export default function Route() {
  return (
    <PermissionRouteGuard resource="production.checking_scanner_new" action="view">
      <CheckingScannerNewScreen />
    </PermissionRouteGuard>
  );
}
