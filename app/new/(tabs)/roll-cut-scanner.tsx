import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { RollCutScannerScreen } from '@/src/screens/production/RollCutScannerScreen';

export default function RollCutRoute() {
  return (
    <PermissionRouteGuard resource="production.roll_cut_scanner" action="view">
      <RollCutScannerScreen />
    </PermissionRouteGuard>
  );
}
