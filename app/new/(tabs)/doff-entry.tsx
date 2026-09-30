import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { DoffEntryScreen } from '@/src/screens/production/DoffEntryScreen';

export default function DoffEntryRoute() {
  return (
    <PermissionRouteGuard resource="production.doff_entry" action="view">
      <DoffEntryScreen />
    </PermissionRouteGuard>
  );
}
