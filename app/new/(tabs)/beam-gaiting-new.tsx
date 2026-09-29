import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { BeamGaitingNewScreen } from '@/src/screens/production/BeamGaitingNewScreen';

// NEW ERP — Beam Gaiting (machine list · add gaiting).
// Legacy screen (app/(tabs)) is unchanged; this is the NEW ERP route.
export default function Route() {
  return (
    <PermissionRouteGuard resource="production.beam_gaiting_new" action="view">
      <BeamGaitingNewScreen />
    </PermissionRouteGuard>
  );
}
