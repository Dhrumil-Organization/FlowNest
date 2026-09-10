// screens/dashboard/employ/screens/EmployDashboardSection.tsx
//
// Adapted from the original rn-app/screens/EmployDashboard.js
// ("MainDashboardScreen"). This version is meant to be embedded *inside*
// DashboardScreen.tsx (below the Monthly Report link) instead of being its
// own top-level screen, so:
//   - The old `<HeaderBarwithBack .../>` banner was removed — DashboardScreen
//     already renders the top bar / heading for this screen.
//   - The old local Owner/My View tab switcher was removed too — DashboardScreen
//     already has its own Owner/My View segment control at the top of the
//     screen, so `activeTab` is now a controlled prop driven by that same
//     state instead of a second, separate switcher.
//   - childNavigation now pushes routes under `/new/...` to match this app's
//     expo-router layout (see app/new/_layout.tsx).
//
// Everything else — the AsyncStorage prptype lookup and the API-backed child
// screens (Owner / My View) — is unchanged.
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../components/SharedComponents';
import OwnerDashboardScreen from './OwnerDashboardScreen';
import SalesExecDashboardScreen from './SalesExecDashboardScreen';

export type DashboardDetailVisibility = {
  sales: boolean;
  production: boolean;
  collection: boolean;
  outstanding: boolean;
};

type Props = {
  activeTab: 'owner' | 'myview';
  username?: string;
  user?: any;
  visibleSections: DashboardDetailVisibility;
};

export default function EmployDashboardSection({ activeTab, username, user, visibleSections }: Props) {
  const router = useRouter();
  const [getUserPrptype, setUserPrptype] = useState('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        setUserPrptype(user_prptype || '');
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    initializeApp();
  }, []);

  // Fake navigation object passed down to child screens so their
  // navigation.navigate('SalesExecDashboard', params) calls keep working —
  // they get translated into real expo-router pushes under /new/...
  const childNavigation = {
    navigate: (screen: string, params: any) =>
      router.push({
        pathname: `/new/${screen}`,
        params: { ...params, user },
      } as any),
    goBack: () => router.back(),
  };

  console.log('activeTab 111', activeTab);

  return (
    <View style={styles.wrap}>
      {/* ─── Content ───
          Each child screen manages its own API call + pull-to-refresh, and
          scrolls internally (bounded height) since it sits inside the
          DashboardScreen's outer ScrollView. Which one renders is driven by
          the same Owner/My View toggle DashboardScreen already has. */}
      {activeTab === 'owner' && (
        <OwnerDashboardScreen
          navigation={childNavigation}
          route={{ params: { user } }}
          getUserPrptype={getUserPrptype}
          visibleSections={visibleSections}
        />
      )}

      {activeTab === 'myview' && (
        <SalesExecDashboardScreen
          navigation={childNavigation}
          route={{
            params: {
              execId: user?.exec_id,
              execName: user?.name,
              execColor: user?.avatar_color,
              date: new Date().toISOString().split('T')[0],
              user,
              activeTab: activeTab,
              username,
            },
          }}
          visibleSections={visibleSections}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14, borderRadius: 15, overflow: 'hidden' },
  // Bounded height so the internally-scrolling child dashboards (which each
  // have their own ScrollView + pull-to-refresh) behave inside the parent
  // ScrollView. Adjust to taste — a fixed viewport is the simplest reliable
  // pattern for nested RN ScrollViews.
  content: { height: 900, backgroundColor: COLORS.bg },
});
