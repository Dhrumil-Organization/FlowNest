import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { DailyCollectionReportScreen } from '@/src/screens/production/DailyCollectionReportScreen';

export default function DailyPaymentReportRoute() {
  return (
    <PermissionRouteGuard resource="production.daily_payment_report" action="view">
      <DailyCollectionReportScreen />
    </PermissionRouteGuard>
  );
}