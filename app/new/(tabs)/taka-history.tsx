import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { TakaHistoryScreen } from '@/src/screens/production/TakaHistoryScreen';
import React from 'react';

export default function TakaHistoryRoute() {
  return (
    <PermissionRouteGuard resource="production.taka_history" action="view">
      <TakaHistoryScreen />
    </PermissionRouteGuard>
  );
}
