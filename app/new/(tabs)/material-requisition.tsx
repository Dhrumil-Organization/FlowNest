import React from 'react';
import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { MaterialRequisitionScreen } from '@/src/screens/production/MaterialRequisitionScreen';
export default function MaterialRequisitionRoute() {
  return <PermissionRouteGuard resource="production.material_requisition" action="view"><MaterialRequisitionScreen /></PermissionRouteGuard>;
}
