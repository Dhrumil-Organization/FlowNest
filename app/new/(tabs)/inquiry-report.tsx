import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { InquiryReportScreen } from '@/src/screens/production/InquiryReportScreen';

export default function Route() {
  return (
    <PermissionRouteGuard resource="production.inquiry_report" action="view">
      <InquiryReportScreen />
    </PermissionRouteGuard>
  );
}
