import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { ProcessCompleteRequestNew } from '@/src/screens/production/ProcessCompleteRequestNewScreen';
import React from 'react';

export default function ProcessCompleteRequestRoute() {
  return (
    <PermissionRouteGuard resource="production.processcompleterequest" action="view">
      <ProcessCompleteRequestNew />
    </PermissionRouteGuard>
  );
}
