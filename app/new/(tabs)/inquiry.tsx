import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { InquiryScreen } from '@/src/screens/production/InquiryScreen';

export default function InquiryRoute() {
  return (
    <PermissionRouteGuard resource="production.inquiry" action="view">
      <InquiryScreen />
    </PermissionRouteGuard>
  );
}
