import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAppSessionStore } from '../../stores/AppSessionStore';
import { usePermission } from '../permissions';

type Props = {
  resource: string;
  action?: string;
  redirectTo?: any; // retained for backward-compatible call sites; deliberately not auto-redirected
  children: React.ReactNode;
};

/**
 * Production-safe permission guard.
 *
 * Never redirects a denied route back to the tabs index. Doing that while the
 * index itself is denied creates an Expo Router redirect cycle and React's
 * "Maximum update depth exceeded" error. Navigation visibility is handled by
 * the registry; direct denied access renders a stable message instead.
 */
export function PermissionRouteGuard({ resource, action, children }: Props) {
  const hydrated = useAppSessionStore((state) => state.hydrated);
  const appSession = useAppSessionStore((state) => state.appSession);
  const { canAccess, canDo } = usePermission();

  if (!hydrated || !appSession) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const allowed = action ? canDo(resource, action) : canAccess(resource);
  if (!allowed) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Access denied</Text>
        <Text style={styles.message}>This screen is not assigned to your user or role.</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#F7F4EF',
  },
  title: { fontSize: 20, fontWeight: '900', color: '#122033' },
  message: { marginTop: 8, textAlign: 'center', fontSize: 13, lineHeight: 19, color: '#7B7B7B' },
});
