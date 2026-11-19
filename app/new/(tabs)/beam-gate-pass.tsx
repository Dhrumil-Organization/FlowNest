import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import BeamGatePassScreen from '@/src/screens/beamGatePass/BeamGatePassScreen';

export default function BeamGatePassRoute() {
  return (
    <PermissionRouteGuard resource="beam_gate_pass" action="view">
      <BeamGatePassScreen />
    </PermissionRouteGuard>
  );
}
