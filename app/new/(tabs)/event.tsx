import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { EventScreen } from '@/src/screens/production/EventScreen';

export default function EventRoute() {
  return (
    <PermissionRouteGuard resource="production.event" action="view">
      <EventScreen />
    </PermissionRouteGuard>
  );
}