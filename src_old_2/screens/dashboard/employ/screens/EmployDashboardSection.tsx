// screens/dashboard/employ/screens/EmployDashboardSection.tsx
//
// Adapted from the original rn-app/screens/EmployDashboard.js
// ("MainDashboardScreen"). This version is meant to be embedded *inside*
// DashboardScreen.tsx (below the Monthly Report link) instead of being its
// own top-level screen, so:
//   - The old `<HeaderBarwithBack .../>` banner was removed — DashboardScreen
//     already renders the top bar / heading for this screen.
//   - `@/components/theme` (BRAND_GRADIENT_START/END) doesn't exist in this
//     project, so the gradient now uses the local COLORS.primary tones.
//   - childNavigation now pushes routes under `/new/...` to match this app's
//     expo-router layout (see app/new/_layout.tsx).
//
// Everything else — the Owner / My View tab switch, AsyncStorage prptype
// lookup, and the API-backed child screens — is unchanged.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../components/SharedComponents';
import OwnerDashboardScreen from './OwnerDashboardScreen';
import SalesExecDashboardScreen from './SalesExecDashboardScreen';

type Props = {
  username?: string;
  user?: any;
};

export default function EmployDashboardSection({ username, user }: Props) {
  const router = useRouter();
  const [getUserPrptype, setUserPrptype] = useState('');
  const [activeTab, setActiveTab] = useState<'owner' | 'myview'>('owner'); // 'owner' | 'myview'

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

  return (
    <View style={styles.wrap}>
      {/* ─── Section header + tab switcher ─── */}
      <LinearGradient
        colors={[COLORS.primary, '#24406B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.appHeader}>
          <View>
            <Text style={styles.sectionTitle}>Employee Dashboard</Text>
            <Text style={styles.sectionSub}>Manage your dashboard</Text>
          </View>

          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'owner' && styles.tabBtnActive]}
              onPress={() => setActiveTab('owner')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'owner' && styles.tabBtnTextActive]}>Owner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'myview' && styles.tabBtnActive]}
              onPress={() => setActiveTab('myview')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'myview' && styles.tabBtnTextActive]}>My View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* ─── Content ───
          Each child screen manages its own API call + pull-to-refresh, and
          scrolls internally (bounded height) since it sits inside the
          DashboardScreen's outer ScrollView. */}
      <View style={styles.content}>
        {activeTab === 'owner' && (
          <OwnerDashboardScreen
            navigation={childNavigation}
            route={{ params: { user } }}
            getUserPrptype={getUserPrptype}
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
                activeTab,
                username,
              },
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14, borderRadius: 15, overflow: 'hidden' },
  gradient: { borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  appHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12,
  },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
  sectionSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: 2,
  },
  tabBtn: { flex: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  tabBtnActive: { backgroundColor: '#fff' },
  tabBtnText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  tabBtnTextActive: { color: COLORS.primary },
  // Bounded height so the internally-scrolling child dashboards (which each
  // have their own ScrollView + pull-to-refresh) behave inside the parent
  // ScrollView. Adjust to taste — a fixed viewport is the simplest reliable
  // pattern for nested RN ScrollViews.
  content: { height: 900, backgroundColor: COLORS.bg },
});
