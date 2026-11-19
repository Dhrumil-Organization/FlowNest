import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import BeamInOutScreen from '@/src/screens/beamInOut/BeamInOutScreen';

export default function BeamInwardRoute() {
  return (
    <PermissionRouteGuard resource="beam_inward" action="view">
      <BeamInOutScreen txn="beam_inward" />
    </PermissionRouteGuard>
  );
}
