import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { BeamCloseNewScreen } from '@/src/screens/production/BeamCloseNewScreen';

// NEW ERP — Beam Open/Close (close beam · load closed beam · open beam).
// Legacy screen (app/(tabs)) is unchanged; this is the NEW ERP route.
export default function Route() {
  return (
    <PermissionRouteGuard resource="production.beam_close_new" action="view">
      <BeamCloseNewScreen />
    </PermissionRouteGuard>
  );
}
