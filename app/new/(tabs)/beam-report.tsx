import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import BeamReportScreen from '@/src/screens/beamReport/BeamReportScreen';

export default function BeamReportRoute() {
  return (
    <PermissionRouteGuard resource="beam_report" action="view">
      <BeamReportScreen />
    </PermissionRouteGuard>
  );
}
