import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { WeftCartonIssueNewScreen } from '@/src/screens/production/WeftcartonIssueNew';

// NEW ERP — Beam Gaiting (machine list · add gaiting).
// Legacy screen (app/(tabs)) is unchanged; this is the NEW ERP route.
export default function Route() {
  return (
    <PermissionRouteGuard resource="production.weft_carton_issue_new" action="view">
      <WeftCartonIssueNewScreen />
    </PermissionRouteGuard>
  );
}
