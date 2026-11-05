import { PermissionRouteGuard } from '@/src/core/navigation';
import { ProcessingScreen } from '@/src/screens/production/ProcessingScreen';
import React from 'react';
export default function ProcessingRoute() {
  return <PermissionRouteGuard resource="production.processing" action="view"><ProcessingScreen /></PermissionRouteGuard>;
}
