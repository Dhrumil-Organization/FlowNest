import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import BeamInOutScreen from '@/src/screens/beamInOut/BeamInOutScreen';

export default function BeamOutwardRoute() {
  return (
    <PermissionRouteGuard resource="beam_outward" action="view">
      <BeamInOutScreen txn="beam_outward" />
    </PermissionRouteGuard>
  );
}
