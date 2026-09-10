import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { DatalogScreen } from '@/src/screens/datalog/DatalogScreen';

export default function DatalogRoute() {
  return (
    <PermissionRouteGuard resource="datalog" action="view">
      <DatalogScreen />
    </PermissionRouteGuard>
  );
}
