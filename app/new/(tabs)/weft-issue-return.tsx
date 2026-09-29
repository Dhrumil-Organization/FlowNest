import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { WeftIssueReturnScreen } from '@/src/screens/production/WeftIssueReturnScreen';

export default function Route() {
  return (
    <PermissionRouteGuard resource="production.weft_issue_return" action="view">
      <WeftIssueReturnScreen />
    </PermissionRouteGuard>
  );
}
