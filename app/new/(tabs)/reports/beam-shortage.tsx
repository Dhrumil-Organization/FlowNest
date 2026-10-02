// Reports -> Beam Shortage. Gated by its own right `reports.beam_shortage`
// (registered in src/registry/modules/dashboard.permission.ts), so opening the
// route directly without the right shows "Access denied" — same as the card
// being hidden on the Reports hub.
import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import BeamShortageScreen from '@/src/screens/reports/BeamShortageScreen';

export default function BeamShortageRoute() {
  return (
    <PermissionRouteGuard resource="reports.beam_shortage">
      <BeamShortageScreen />
    </PermissionRouteGuard>
  );
}
