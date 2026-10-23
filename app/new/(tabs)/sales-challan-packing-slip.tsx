import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SalesChallanPackingSlipScreen } from '@/src/screens/production/SalesChallanPackingSlipScreen';

export default function SalesChallanPackingSlipRoute() {
  return (
    <PermissionRouteGuard resource="production.sales_challan_packing_slip" action="view">
      <SalesChallanPackingSlipScreen />
    </PermissionRouteGuard>
  );
}
