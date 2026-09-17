import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { DailyCollectionReportScreen } from '@/src/screens/production/DailyCollectionReportScreen';

export default function DailyCollectionReportRoute() {
  return (
    <PermissionRouteGuard resource="production.daily_collection_report" action="view">
      <DailyCollectionReportScreen />
    </PermissionRouteGuard>
  );
}