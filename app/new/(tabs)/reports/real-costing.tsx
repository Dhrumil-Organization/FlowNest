// Reports -> Real Costing Chain. Gated by its own right `reports.real_costing`
// (registered in src/registry/modules/dashboard.permission.ts). Opens the new
// RealCostChainView (POST /api/real_cost_chain/report — RealCostChainController),
// which replaces the earlier RealCostingReferenceDashboard on this card.
import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { RealCostChainView } from '@/src/screens/reports/realCostChain/RealCostChainView';

export default function RealCostingRoute() {
  return (
    <PermissionRouteGuard resource="reports.real_costing">
      <RealCostChainView />
    </PermissionRouteGuard>
  );
}
