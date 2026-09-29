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

  // COMPACT RESPONSIVE HEADER: same content & actions as before (grey-packing
  // back button, eyebrow, title, subtitle, version, property switch, `right`
  // slot, sign out, profile avatar) — just tighter spacing, one-line meta row
  // and icon buttons sized per breakpoint so more of every screen is visible.
  const size = isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile';
  const iconSize = isDesktop ? 20 : 18;
  const showMeta = !isGreyPackingRoute && (!!appVersion || switchUserLogin);

  return <View style={s.safe}>
    <StatusBar barStyle="light-content" backgroundColor={T.nav} />
    <View style={[s.header, size === 'tablet' && s.headerTablet, size === 'desktop' && s.headerDesktop, isGreyPackingRoute && s.headerCompact]}>
      {isGreyPackingRoute && (
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.iconBtn, size === 'desktop' && s.iconBtnDesktop, s.backButton]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="arrow-back-ios-new" size={iconSize - 1} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={s.left}>
        <Text style={[s.eyebrow, size === 'desktop' && s.eyebrowDesktop]} numberOfLines={1}>{displayEyebrow}</Text>

        {displayTitle !== 'Permission Manager' && (
          <Text
            style={[s.title, size === 'tablet' && s.titleTablet, size === 'desktop' && s.titleDesktop, isGreyPackingRoute && s.titleCompact]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {displayTitle}
          </Text>
        )}

        {!isGreyPackingRoute && !!subtitle && <Text style={[s.subtitle, size !== 'mobile' && s.subtitleWide]} numberOfLines={1}>{subtitle}</Text>}

        {showMeta && (
          <View style={s.versionRow}>
            {!!appVersion && (
              <View style={s.versionChip}>
                <Text style={s.versionText} numberOfLines={1}>v{appVersion}</Text>
              </View>
            )}

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

      <View style={[s.right, size !== 'mobile' && s.rightWide]}>
        {right}
        {showSignOut && <TouchableOpacity
          onPress={signOut}
          style={[s.iconBtn, size === 'desktop' && s.iconBtnDesktop]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Icon name="logout" size={iconSize} color="#fff" />
        </TouchableOpacity>}
        <TouchableOpacity
          onPress={() => router.push('/new/profile' as any)}
          style={[s.avatar, size === 'desktop' && s.avatarDesktop]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={[s.avatarText, size === 'desktop' && s.avatarTextDesktop]}>{initials}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
}

// Layout notes: title is single-line + shrink-to-fit, the right cluster is
// flexShrink:0 so it's never squeezed, and the left column has minWidth:0 so
// long titles truncate instead of wrapping. Font sizes below are the design
// sizes — the ERP font hook scales them per screen width.
const s = StyleSheet.create({
  safe: { backgroundColor: T.nav },
  header: {
    backgroundColor: T.nav,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTablet: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10 },
  headerDesktop: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  headerCompact: { paddingTop: 8, paddingBottom: 10 },
  left: { flex: 1, paddingRight: 10, minWidth: 0 },
  eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: '#8EA6BA' },
  eyebrowDesktop: { fontSize: 10, letterSpacing: 1.6 },
  title: { fontSize: 19, lineHeight: 24, fontWeight: '800', color: '#fff', marginTop: 1, letterSpacing: -0.2 },
  titleTablet: { fontSize: 21, lineHeight: 26 },
  titleDesktop: { fontSize: 22, lineHeight: 28 },
  titleCompact: { fontSize: 18, lineHeight: 23 },
  subtitle: { fontSize: 11, fontWeight: '500', color: '#9FB0BF', marginTop: 1 },
  subtitleWide: { fontSize: 12 },
  versionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8, minHeight: 20 },
  versionChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    flexShrink: 0,
  },
  versionText: { fontSize: 10, fontWeight: '600', color: '#A9BBCA' },
  propertySwitchRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0, height: 20 },
  propertySwitchText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '700', flexShrink: 1 },
  propertySwitchToggle: { transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  rightWide: { gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#2A4055',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDesktop: { width: 38, height: 38, borderRadius: 12 },
  backButton: { marginRight: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.copper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarDesktop: { width: 38, height: 38, borderRadius: 19 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },
  avatarTextDesktop: { fontSize: 14 },
});
