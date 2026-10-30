import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { RollCutAnalysisScreen } from '@/src/screens/production/RollCutAnalysisScreen';

export default function RollCutAnalysisRoute() {
  return (
    <PermissionRouteGuard resource="production.roll_cut_analysis" action="view">
      <RollCutAnalysisScreen />
    </PermissionRouteGuard>
  );
}
