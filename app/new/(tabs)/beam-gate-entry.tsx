import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import BeamGateEntryScreen from '@/src/screens/beamGateEntry/BeamGateEntryScreen';

export default function BeamGateEntryRoute() {
  return (
    <PermissionRouteGuard resource="beam_gate_entry" action="view">
      <BeamGateEntryScreen />
    </PermissionRouteGuard>
  );
}
