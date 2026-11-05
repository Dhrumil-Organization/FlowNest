import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import PaymentsMadeReportScreen from '@/src/screens/dashboard/employ/screens/PaymentsMadeReportScreen';

export default function PaymentsMadeReportRoute() {
  return (
    <PermissionRouteGuard resource="dashboard.payments_made_detail">
      <PaymentsMadeReportScreen />
    </PermissionRouteGuard>
  );
}
