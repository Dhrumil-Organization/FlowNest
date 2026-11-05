import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import GreyPackingScannerScreen from '@/src/screens/greyPacking/GreyPackingScannerScreen';

export default function GreyPackingRoute() {
  return (
    <PermissionRouteGuard resource="grey_packing" action="view">
      <GreyPackingScannerScreen />
    </PermissionRouteGuard>
  );
}
