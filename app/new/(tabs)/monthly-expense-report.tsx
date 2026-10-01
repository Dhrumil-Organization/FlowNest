import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { MonthlyExpenseReportScreen } from '@/src/screens/production/MonthlyExpenseReportScreen';

export default function MonthlyExpenseReportRoute() {
  return (
    <PermissionRouteGuard resource="production.monthly_expense_report" action="view">
      <MonthlyExpenseReportScreen />
    </PermissionRouteGuard>
  );
}
