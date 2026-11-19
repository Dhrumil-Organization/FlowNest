import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import RepackingIssueScreen from '@/src/screens/repackingIssue/RepackingIssueScreen';

export default function RepackingIssueRoute() {
  return (
    <PermissionRouteGuard resource="repacking_issue" action="view">
      <RepackingIssueScreen />
    </PermissionRouteGuard>
  );
}
