import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { initAPI } from '../../../common/API/dynamicAPI';
import type { NewErpProperty } from '../../api/client';
import { setNewErpProperty } from '../../api/client';
import { performLogin } from '../../core/authFlow';
import { getCredentialsForPropertySwitch } from '../../lib/biometricAuth';
import { useAppSessionStore } from '../../stores/AppSessionStore';
import { T } from '../../theme';
import { isEmbeddedWeb } from '@/src/core/embeddedAuth';
import { useDashboardResponsive } from '@/src/components/EmployDashboard/rn-app/components/responsive';

type Props = { eyebrow?: string; title: string; subtitle?: string; right?: React.ReactNode; showSignOut?: boolean };

// FEATURE: profile avatar — a small initials "chip" that sits to the right
// of Sign out in every header (this is the ONE AppHeader in the app, so
// adding it here makes it a persistent, common element on every tab screen
// instead of something each screen would need to opt into). Tapping it
// opens the dedicated Profile screen (app/new/profile.tsx), which reads the
// full login response out of AppSessionStore.
function getInitials(u: any): string {
  if (!u) return '?';
  const first = String(u.first_name || '').trim();
  const last = String(u.last_name || '').trim();
  if (first || last) {
    const combined = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    if (combined) return combined;
  }
  const name = String(u.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length > 1) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return '?';
}
// FIX: AppHeader previously wrapped itself in its own <SafeAreaView edges={['top']}>.
// Every screen that renders AppHeader (directly or via ScreenHeader) already wraps
// itself in a SafeAreaView, so this was applying the top inset twice — extra dead
// space under the notch/status bar on screens like Catalog/Orders/Expense/Stock.
// AppHeader now only sets the status bar style and renders a plain View; the
// enclosing screen's own SafeAreaView is the single place safe-area is applied.
export function AppHeader({ eyebrow = 'SUDAMO TEXTILE ERP', title, subtitle, right, showSignOut = true }: Props) {
  const logout = useAppSessionStore(s => s.logout);
  const { isDesktop, isTablet } = useDashboardResponsive();
  const router = useRouter();
  const pathname = usePathname();
  const isGreyPackingRoute = pathname?.includes('grey-packing') || pathname?.includes('greypacking');
  const sessionUser = useAppSessionStore(s => s.user);
  const rawLoginResponse = useAppSessionStore(s => s.rawLoginResponse);
  const profileUser = rawLoginResponse?.user || sessionUser;
  const initials = getInitials(profileUser);
  const [appVersion, setAppVersion] = useState('');
  const [switchingProperty, setSwitchingProperty] = useState(false);
  // FEATURE: which property the current session is actually logged into.
  // Shown as a small label next to "Switch Property" and used to highlight
  // the active option inside the picker modal — previously the modal gave
  // no indication at all of which property you were currently on.
  const [currentProperty, setCurrentProperty] = useState<NewErpProperty | null>(null);
  const embedded = isEmbeddedWeb();
  const switchUserLogin = !embedded && Number(rawLoginResponse?.switchuserlogin ?? 0) === 1;

  const PROPERTY_LABELS: Record<NewErpProperty, string> = {
    sudamo_knits: 'Sudamo / Knits',
    rayons: 'Rayons',
  };

  useEffect(() => {
    const fetchAppVersion = async () => {
      try {
        const appJson = await import('../../../app.json');
        setAppVersion(appJson.expo.version);
      } catch (error) {
        console.error('Error fetching app version:', error);
      }
    };

    fetchAppVersion();
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const stored = await AsyncStorage.getItem('selected_property');
      if (mounted && (stored === 'sudamo_knits' || stored === 'rayons')) {
        setCurrentProperty(stored);
      }
    })();
    return () => {
      mounted = false;
    };
    // Re-check whenever a switch just finished (switchingProperty flips
    // back to false) so the label updates the moment the new property is
    // actually active, not just optimistically.
  }, [switchingProperty]);

  const switchProperty = async (nextProperty: NewErpProperty) => {
    if (switchingProperty) return;

    const storedProperty = (await AsyncStorage.getItem('selected_property')) as NewErpProperty | null;
    console.log('Switching property from', storedProperty, 'to', nextProperty);
    if (storedProperty === nextProperty) return;

    await AsyncStorage.setItem('selected_property', nextProperty);
    setSwitchingProperty(true);

    try {
      const credentials = await getCredentialsForPropertySwitch();
      if (!credentials) {
        throw new Error('Saved login credentials are not available. Please sign in again.');
      }

      await setNewErpProperty(nextProperty);

      // Use the exact same login flow as the normal login screen.
      const result = await performLogin(credentials.username, credentials.password);
      if (!result.success) {
        throw new Error(result.message || 'Unable to switch property.');
      }

      // Update the existing legacy API consumers to the selected host.
      await initAPI();

      // Reflect the new property immediately in the header/modal — don't
      // wait for the next mount-driven AsyncStorage read.
      setCurrentProperty(nextProperty);

      router.replace('/new/(tabs)' as any);
    } catch (error: any) {
      if (storedProperty === 'sudamo_knits' || storedProperty === 'rayons') {
        await setNewErpProperty(storedProperty);
        await initAPI();
        setCurrentProperty(storedProperty);
      }
      AppAlert.alert('Property switch failed', error?.message || 'Unable to switch ERP property.');
    } finally {
      setSwitchingProperty(false);
    }
  };

  const signOut = () => AppAlert.alert('Sign out?', 'This will clear the mobile session on this device.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Sign out',
      style: 'destructive',
      onPress: async () => {
        await logout();
        if (embedded) {
          router.replace('/embed' as any);
        }
      },
    },
  ]);
  const displayTitle = isGreyPackingRoute ? 'Grey Packing' : title;
  const displayEyebrow = isGreyPackingRoute ? 'SUDAMO TEXTILE ERP' : eyebrow;

  return <View style={s.safe}>
    <StatusBar barStyle="light-content" backgroundColor={T.nav} />
    <View style={[s.header, isTablet && s.headerTablet, isDesktop && s.headerDesktop, isGreyPackingRoute && s.headerCompact]}>
      {isGreyPackingRoute && (
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="arrow-back-ios-new" size={19} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={s.left}>
      <Text style={[s.eyebrow, isTablet && s.eyebrowTablet]} numberOfLines={1}>{displayEyebrow}</Text>

      {displayTitle !== 'Permission Manager' && (
        <Text
          style={[s.title, isTablet && s.titleTablet, isDesktop && s.titleDesktop, isGreyPackingRoute && s.titleCompact]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {displayTitle}
        </Text>
      )}

      {!isGreyPackingRoute && !!subtitle && <Text style={[s.subtitle, isTablet && s.subtitleTablet]} numberOfLines={1}>{subtitle}</Text>}
      {!isGreyPackingRoute && (
        <View style={s.versionRow}>
          <Text style={[s.subtitle, s.versionText, isTablet && s.subtitleTablet]} numberOfLines={1}>Version: {appVersion}</Text>

          {switchUserLogin && (
            <View style={s.propertySwitchRow}>
              <Text style={s.propertySwitchText} numberOfLines={1}>
                {switchingProperty
                  ? 'Switching...'
                  : currentProperty
                    ? PROPERTY_LABELS[currentProperty]
                    : 'Switch Property'}
              </Text>
              <Switch
                value={currentProperty === 'rayons'}
                onValueChange={(value) =>
                  void switchProperty(value ? 'rayons' : 'sudamo_knits')
                }
                disabled={switchingProperty || !currentProperty}
                trackColor={{ false: '#3A5068', true: T.copper }}
                thumbColor="#FFFFFF"
                style={s.propertySwitchToggle}
              />
            </View>
          )}
        </View>
      )}
    </View>
      <View style={[s.right, isTablet && s.rightTablet]}>
        {right}
        {showSignOut && <TouchableOpacity onPress={signOut} style={[s.signOut, isTablet && s.signOutTablet]}>
          {/* <Text style={s.signOutText}>Sign out</Text> */}
          <Icon name="logout" size={20} color="#fff" />
        </TouchableOpacity>}
        <TouchableOpacity
          onPress={() => router.push('/new/profile' as any)}
          style={[s.avatar, isTablet && s.avatarTablet]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={s.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View></View>
  </View>
}
// FIX: `title`/`eyebrow` previously had no `numberOfLines`, so a long title
// shown alongside wide `right` content (e.g. the "Sync Registry" pill next
// to "Sign out") could squeeze the left column enough to wrap "Business
// Dashboard" onto 3 lines. `numberOfLines={1}` + `adjustsFontSizeToFit` on
// the title makes it shrink to fit instead of wrapping; `right` gets
// `flexShrink:0` so it can no longer be the thing that gets squeezed
// unpredictably.
const s = StyleSheet.create({
  safe: { backgroundColor: T.nav },
  headerTablet: { paddingHorizontal: 16, paddingTop: 13, paddingBottom: 6 },
  headerDesktop: { paddingHorizontal: 22 },
  safeDummy: {},
  header: { backgroundColor: T.nav, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 5, flexDirection: 'row', alignItems: 'center' }, headerCompact: { paddingTop: 10, paddingBottom: 12, paddingHorizontal: 18 }, left: { flex: 1, paddingRight: 12, minWidth: 0 }, eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: '#8EA6BA' }, title: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 4 }, titleCompact: { fontSize: 22, marginTop: 2 }, subtitle: { fontSize: 13, fontWeight: '700', color: '#9FB0BF', marginTop: 6 },
  eyebrowTablet: { fontSize: 9 },
  titleTablet: { fontSize: 22, marginTop: 3 },
  titleDesktop: { fontSize: 28 },
  subtitleTablet: { fontSize: 11, marginTop: 4 },
  versionRow: { flexDirection: 'row', alignItems: 'center', marginTop: -6, gap: 10 },
  versionText: { marginTop: 0, flexShrink: 0 },
  propertySwitchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  propertySwitchText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  propertySwitchToggle: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  rightTablet: { gap: 6 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2A4055',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  signOut: { borderWidth: 1.5, borderColor: '#2A4055', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12 },
  signOutTablet: { borderRadius: 11, paddingHorizontal: 9, paddingVertical: 9 }, signOutText: { color: '#fff', fontWeight: '900', fontSize: 13 }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' }, avatarText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.3 }
});
