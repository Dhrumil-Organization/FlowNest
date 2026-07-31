import { PermissionRouteGuard } from '@/src/core/navigation';
import { DesignsScreen } from '@/src/screens/designs/DesignsScreen';
import React from 'react';

export default function DesignsRoute() {
  return <PermissionRouteGuard resource="designs"><DesignsScreen /></PermissionRouteGuard>;
}
