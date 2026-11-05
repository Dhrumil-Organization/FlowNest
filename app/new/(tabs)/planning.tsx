import React from 'react';
import { PermissionRouteGuard } from '@/src/core/navigation';
import { Planning } from '@/src/screens/production/PlanningScreen';

// Yarn Dyeing › Planning — route file (OUTER app/, NOT src/app/). Copy to: app/new/(tabs)/planning.tsx
export default function PlanningRoute() {
  return (
    <PermissionRouteGuard resource="production.planning" action="view">
      <Planning />
    </PermissionRouteGuard>
  );
}
