import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { WeftIssueScreen } from '@/src/screens/production/WeftIssueScreen';

export default function Route() {
  return (
    <PermissionRouteGuard resource="production.weft_issue" action="view">
      <WeftIssueScreen />
    </PermissionRouteGuard>
  );
}
