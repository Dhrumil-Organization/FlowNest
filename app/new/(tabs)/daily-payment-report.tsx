import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { DailyPaymentReportScreen } from '@/src/screens/production/DailyPaymentReportScreen';

export default function DailyPaymentReportRoute() {
  return (
    <PermissionRouteGuard resource="production.daily_payment_report" action="view">
      <DailyPaymentReportScreen />
    </PermissionRouteGuard>
  );
}