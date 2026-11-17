// FILE: app/new/support/index.tsx — Raise ticket / My tickets (right: support.raise_ticket)
import { PermissionRouteGuard } from '@/src/core/navigation/PermissionRouteGuard';
import { usePermission } from '@/src/core/permissions';
import { useErpSession } from '@/src/core/session/erpSession';
import { ClientApp } from '@/src/features/support/screens/ClientApp';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function SupportRoute() {
  const router = useRouter();
  const { session } = useErpSession();
  const { canAccess } = usePermission();
  const params = useLocalSearchParams<{ new?: string }>();
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/new/(tabs)' as any));
  return (
    <PermissionRouteGuard resource="support.raise_ticket">
      {session ? (
        <ClientApp key={session.sessionKey} base={session.API} bearer={session.token} property={session.property} canAccess={canAccess} startNew={params.new === '1'} onExit={exit} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>
      )}
    </PermissionRouteGuard>
  );
}
