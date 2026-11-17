// FILE: app/new/it-desk/index.tsx — IT Desk (right: support.it_desk; then its own IT login)
import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { usePermission } from '@/src/core/permissions';
import { useErpSession } from '@/src/core/session/erpSession';
import { ItDeskApp } from '@/src/features/support/screens/ItDeskApp';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function ItDeskRoute() {
  const router = useRouter();
  const { session } = useErpSession();
  const { canAccess } = usePermission();
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/new/(tabs)' as any));
  return (
    <PermissionRouteGuard resource="support.it_desk">
      {session ? (
        <ItDeskApp key={session.API} base={session.API} canAccess={canAccess} onExit={exit} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>
      )}
    </PermissionRouteGuard>
  );
}
