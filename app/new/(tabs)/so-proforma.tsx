import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import SOProformaScreen from '@/src/screens/soProforma/SOProformaScreen';

export default function SOProformaRoute() {
  return (
    <PermissionRouteGuard resource="so_proforma" action="view">
      <SOProformaScreen />
    </PermissionRouteGuard>
  );
}
