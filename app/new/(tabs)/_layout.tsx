// ─────────────────────────────────────────────────────────────
// FILE: app/new/(tabs)/_layout.tsx
// Replaces src/navigation/MainTabs.tsx (createBottomTabNavigator).
//
// NOTE: The original MainTabs.tsx had only the "Home" tab active;
// Designs/Costing/Orders/Reports/Permissions were commented out.
// But DashboardScreen and other screens DO call navigation to
// "Designs"/"Costing" etc, so those targets need to exist as real
// routes to work at all. I've enabled them here, permission-gated
// exactly like the commented-out code intended
// (canAccess / canDo / isSuperAdmin). If you want ONLY the Home
// tab visible (matching the literal current MainTabs), just remove
// the extra <Tabs.Screen> blocks below.
// ─────────────────────────────────────────────────────────────
import { usePermission } from '@/src/core/permissions';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  const { canAccess, canDo, isSuperAdmin } = usePermission();
  const hydrated = useAppSessionStore((state) => state.hydrated);
  const appSession = useAppSessionStore((state) => state.appSession);
  const hasRuntimePermissions = Boolean(appSession?.permissions);
  const ready = hydrated && hasRuntimePermissions;
  const canAdmin = ready && (isSuperAdmin || canDo('administration.permission_manager', 'manage'));
  const allow = (path: string) => ready && (isSuperAdmin || canAccess(path));

  return (
    // <Tabs
    //   screenOptions={{
    //     headerShown: false,
    //     tabBarActiveTintColor: T.copper,
    //     tabBarInactiveTintColor: T.muted,
    //     tabBarStyle: { height: 64, backgroundColor: T.surface, borderTopColor: T.border },
    //     tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginBottom: 7 },
    //     tabBarIconStyle: { marginTop: 7 },
    //   }}
    // >
    //   <Tabs.Screen
    //     name="index"
    //     options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ color }}>⌂</Text> }}
    //   />

    //   <Tabs.Screen
    //     name="designs"
    //     options={{
    //       title: 'Designs',
    //       tabBarIcon: ({ color }) => <Text style={{ color }}>□</Text>,
    //       href: allow('designs') ? undefined : null,
    //     }}
    //   />

    //   <Tabs.Screen
    //     name="costing"
    //     options={{
    //       title: 'Costing',
    //       tabBarIcon: ({ color }) => <Text style={{ color }}>₹</Text>,
    //       href: allow('costing') ? undefined : null,
    //     }}
    //   />

    //   <Tabs.Screen
    //     name="orders"
    //     options={{
    //       title: 'Orders',
    //       tabBarIcon: ({ color }) => <Text style={{ color }}>▤</Text>,
    //       href: allow('orders') ? undefined : null,
    //     }}
    //   />

    //   <Tabs.Screen
    //     name="reports"
    //     options={{
    //       title: 'Reports',
    //       tabBarIcon: ({ color }) => <Text style={{ color }}>◫</Text>,
    //       href: allow('management.reports') ? undefined : null,
    //     }}
    //   />

    //   <Tabs.Screen
    //     name="permissions"
    //     options={{
    //       title: 'Permissions',
    //       tabBarIcon: ({ color }) => <Text style={{ color }}>⚙</Text>,
    //       href: canAdmin ? undefined : null,
    //     }}
    //   />
    // </Tabs>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.copper,
        tabBarInactiveTintColor: T.muted,
        tabBarStyle: { height: 64, backgroundColor: T.surface, borderTopColor: T.border },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginBottom: 7 },
        tabBarIconStyle: { marginTop: 7 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home" size={24} color={color} />
        }}
      />

      <Tabs.Screen
        name="designs"
        options={{
          title: 'Designs',
          tabBarIcon: ({ color }) => <Icon name="design-services" size={24} color={color} />,
          href: allow('designs') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="costing"
        options={{
          title: 'Costing',
          tabBarIcon: ({ color }) => <Icon name="attach-money" size={24} color={color} />,
          href: allow('costing') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <Icon name="shopping-cart" size={24} color={color} />,
          href: allow('orders') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <Icon name="assessment" size={24} color={color} />,
          href: allow('management.reports') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="permissions"
        options={{
          title: 'Permissions',
          tabBarIcon: ({ color }) => <Icon name="admin-panel-settings" size={24} color={color} />,
          href: canAdmin ? undefined : null,
        }}
      />
    </Tabs>
  );
}
