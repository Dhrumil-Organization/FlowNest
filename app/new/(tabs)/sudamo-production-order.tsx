import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { SudamoProductionOrderScreen } from '@/src/screens/production/SudamoProductionOrderScreen';

export default function SudamoProductionOrderRoute() {
  return (
    <PermissionRouteGuard resource="production.sudamo_production_order" action="view">
      <SudamoProductionOrderScreen />
    </PermissionRouteGuard>
  );
}