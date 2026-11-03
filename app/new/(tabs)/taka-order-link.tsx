import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { TakaOrderLinkScreen } from '@/src/screens/production/TakaOrderLinkScreen';

// NEW ERP — Taka ↔ Production Order Link (POST /api/taka_order_link).
export default function Route() {
  return (
    <PermissionRouteGuard resource="production.taka_order_link" action="view">
      <TakaOrderLinkScreen />
    </PermissionRouteGuard>
  );
}
