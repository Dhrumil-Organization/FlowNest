// FILE: app/new/(tabs)/process-chemicals.tsx   <-- OUTER app/ folder (project root), NOT src/app/
// Route name must equal `route: 'process-chemicals'` in registry/modules/production.module.ts.
import { PermissionRouteGuard } from '@/src/core/navigation';
import { ProcessChemicals } from '@/src/screens/production/ProcessChemicalsScreen';
import React from 'react';

export default function ProcessChemicalsRoute() {
  return (
    <PermissionRouteGuard resource="production.process_chemicals" action="view">
      <ProcessChemicals />
    </PermissionRouteGuard>
  );
}
