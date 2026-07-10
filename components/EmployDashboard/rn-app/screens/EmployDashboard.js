// screens/MainDashboardScreen.js
import HeaderBarwithBack from '@/components/Header';
import theme from '@/components/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../components/SharedComponents';
import OwnerDashboardScreen from './OwnerDashboardScreen';
import SalesExecDashboardScreen from './SalesExecDashboardScreen';

/**
 * MainDashboardScreen
 *
 * This is the app's root screen after login.
 * It fetches /auth/me to determine role, then renders tabs accordingly.
 *
 * ROLE LOGIC:
 *   is_owner=T, is_sales_exec=F  → "Owner" tab only (no tabs shown)
 *   is_owner=F, is_sales_exec=T  → "My View" tab only (no tabs shown)
 *   is_owner=T, is_sales_exec=T  → Both tabs
 *
 * Tab "Owner"   → OwnerDashboardScreen (all execs, aggregate)
 * Tab "My View" → SalesExecDashboardScreen (this exec's data only)
 *
 * NOTE: This screen is self-contained — it does NOT use React Navigation
 * stacks for the tab switch, just local state. The drill-down navigation
 * (exec → party) still uses the parent Stack Navigator.
 */
export default function MainDashboardScreen({ navigation, username }) {
  const router = useRouter();
  const [getUserPrptype, setUserPrptype] = useState('');
  const [user, setUser] = useState(null);
  // const [loading, setLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('owner'); // 'owner' | 'myview'

  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const res = await api.getMe();
  //       console.log('res api.getMe', res);
  //       if (res.success) {
  //         setUser(res.user);
  //         // Default tab: if not owner, start on My View
  //         if (!res.user.is_owner) setActiveTab('myview');
  //       }
  //     } catch (e) {
  //       console.error('Auth error:', e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        console.log('user_prptype', user_prptype);
        setUserPrptype(user_prptype);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
      }
    };

    initializeApp();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </View>
    );
  }

  // if (!user) {
  //   return (
  //     <View style={styles.center}>
  //       <Text style={{ color: COLORS.red }}>
  //         Session expired. Please login again.
  //       </Text>
  //     </View>
  //   );
  // }

  const showOwnerTab = user?.is_owner || null;
  const showMyView = user?.is_sales_exec || null;
  const showTabs = showOwnerTab && showMyView; // show tabs only when both roles

  // Fake navigation object to pass down to child screens
  // They call navigation.navigate('SalesExecDashboard', params) etc.
  // const childNavigation = {
  //   navigate: (screen, params) =>
  //     navigation.navigate(screen, { ...params, user }),
  //   goBack: () => navigation.goBack(),
  // };

  const childNavigation = {
    navigate: (screen, params) =>
      // navigation.navigate(screen, { ...params, user }),
      router.push({
        pathname: `/${screen}`,
        params: {
          ...params,
          user
        }
      }),
    goBack: () => router.back(),
  };

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Employee Dashboard'}
        subHeader={'Manage your dashboard'}
        noBorderRadius={true}
        breadcrumb={'Employee Dashboard'}
        SearchBar={false}
      />
      <SafeAreaView style={styles.safe}>
        {/* ─── App Header ─── */}
        <LinearGradient
          colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        // style={
        //   noBorderRadius === true ? styles.noBordergradient : styles.gradient
        // }
        >
          <View style={styles.appHeader}>
            {/* <View style={styles.appHeaderLeft}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>
                  {user?.company ? user?.company.charAt(0) : username.charAt(0)}
                </Text>
              </View>
              <View>
                <Text style={styles.companyName}>
                  {user?.company || user?.name}
                </Text>
                <Text style={styles.userSubtitle}>{user?.subtitle}</Text>
              </View>
            </View> */}

            {/* Tab switcher (only when both roles) */}
            {/* {showTabs && ( */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'owner' && styles.tabBtnActive,
                ]}
                onPress={() => setActiveTab('owner')}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'owner' && styles.tabBtnTextActive,
                  ]}
                >
                  Owner
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'myview' && styles.tabBtnActive,
                ]}
                onPress={() => setActiveTab('myview')}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'myview' && styles.tabBtnTextActive,
                  ]}
                >
                  My View
                </Text>
              </TouchableOpacity>
            </View>
            {/* )} */}
          </View>
        </LinearGradient>

        {/* ─── Content ─── */}
        {/* Owner tab (or only-owner role) */}
        {/* {(showOwnerTab && (!showTabs || activeTab === 'owner')) && (
        <OwnerDashboardScreen
          navigation={childNavigation}
          route={{ params: { user } }}
        />
      )} */}
        {activeTab === 'owner' && (
          <OwnerDashboardScreen
            navigation={childNavigation}
            route={{ params: { user } }}
            getUserPrptype={getUserPrptype}
          />
        )}

        {/* My View tab (or only-sales-exec role) */}
        {/* {(showMyView && (!showTabs || activeTab === 'myview')) && (
        <SalesExecDashboardScreen
          navigation={childNavigation}
          route={{
            params: {
              execId:    user.exec_id,
              execName:  user.name,
              execColor: user.avatar_color,
              date:      new Date().toISOString().split('T')[0],
              user,
            }
          }}
        />
      )} */}
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
                username
              },
            }}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg, marginTop: 5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  appHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  ownerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ownerAvatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  companyName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  userSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 1 },

  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: 2,
    width: '50%'
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
    width: '100%'
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    width: '100%'
  },
  tabBtnText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  tabBtnTextActive: {
    color: COLORS.primary,
  },
});
