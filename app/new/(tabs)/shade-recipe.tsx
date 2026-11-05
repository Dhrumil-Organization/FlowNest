// FILE: app/new/(tabs)/shade-recipe.tsx   <-- OUTER app/ folder (project root), NOT src/app/
// Route name must equal `route: 'shade-recipe'` in registry/modules/production.module.ts.
import { PermissionRouteGuard } from '@/src/core/navigation';
import { ShadeRecipe } from '@/src/screens/production/ShadeRecipeScreen';
import React from 'react';

export default function ShadeRecipeRoute() {
  return (
    <PermissionRouteGuard resource="production.shade_recipe" action="view">
      <ShadeRecipe />
    </PermissionRouteGuard>
  );
}
