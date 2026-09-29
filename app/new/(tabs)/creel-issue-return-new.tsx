import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { CreelIssueReturnScreen } from '@/src/screens/production/CreelIssueReturnScreen';

// NEW ERP — Creel Issue Return (list · new entry · modify · sticker print).
// Legacy screen (app/(tabs)) is unchanged; this is the NEW ERP route.
export default function Route() {
  return (
    <PermissionRouteGuard resource="production.creel_issue_return_new" action="view">
      <CreelIssueReturnScreen />
    </PermissionRouteGuard>
  );
}
