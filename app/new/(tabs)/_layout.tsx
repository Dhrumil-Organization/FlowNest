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
import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';

export default function TabsLayout() {
  const { canAccess, canDo, isSuperAdmin } = usePermission();
  const canAdmin = isSuperAdmin || canDo('administration.permission_manager', 'manage');

  return (
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
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ color }}>⌂</Text> }}
      />

      <Tabs.Screen
        name="designs"
        options={{
          title: 'Designs',
          tabBarIcon: ({ color }) => <Text style={{ color }}>□</Text>,
          href: canAccess('designs') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="costing"
        options={{
          title: 'Costing',
          tabBarIcon: ({ color }) => <Text style={{ color }}>₹</Text>,
          href: canAccess('costing') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <Text style={{ color }}>▤</Text>,
          href: canAccess('orders') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <Text style={{ color }}>◫</Text>,
          href: canAccess('management.reports') || isSuperAdmin ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="permissions"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color }) => <Text style={{ color }}>⚙</Text>,
          href: canAdmin ? undefined : null,
        }}
      />
    </Tabs>
  );
}
