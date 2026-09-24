import { NotificationProvider } from '@/common/context/NotificationContext';
import { AppHeader } from '@/src/components/layout/AppHeader';
import { useHeaderExtrasStore } from '@/src/core/layout/headerExtras';
import { APP_NAVIGATION } from '@/src/core/navigation';
import { usePermission } from '@/src/core/permissions';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// FEATURE: floating "pill" tab bar (matches the native iOS Phone-app style
// tab bar — a rounded bar with a soft gap from the screen edges, instead of
// a bar docked flush along the bottom). Kept as named constants so the
// floating math below (bar position + the paddingBottom every screen needs
// so its content isn't hidden behind the bar) stays in one place and can't
// drift out of sync.
const TAB_BAR_HEIGHT = 75;
const TAB_BAR_SIDE_MARGIN = 14;
const TAB_BAR_GROUND_GAP = 10; // visual gap above iOS home indicator / Android system navigation

// FIX: this is now the ONE place a header is rendered for every tab screen.
// Previously DashboardScreen, DesignsScreen, PermissionManagerScreen and
// OrdersScreen each rendered their own separate header component — which is
// why switching tabs could show two stacked navy header blocks (a nav item's
// previous screen staying mounted-but-hidden underneath, per Expo Router's
// default tab behavior, plus the new screen's own header on top). With only
// one AppHeader in the whole tree, that's now structurally impossible.
//
// The bottom-tab label from the UI registry (`item.title`, e.g. "Home") is
// intentionally short for the tab bar icon caption. The main header wants a
// longer, more descriptive title ("Business Dashboard") — kept here as a
// small local map rather than a new registry field, since only these
// screens need the distinction.
const HEADER_CONTENT: Record<string, { eyebrow?: string; title: string }> = {
  index: { eyebrow: 'SUDAMO TEXTILE ERP', title: 'Business Dashboard' },
  designs: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Designs' },
  costing: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Costing' },
  monthlysalestarget: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Monthly Sales Target' },
  orders: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Orders' },
  priority: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Chart Priority' },
  datalog: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Datalog' },
  'production-order-tracking': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Production Order Tracking' },
  'sudamo-production-order': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Sudamo Production Order' },
  'credit-limit-request': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Credit Limit Request' },
  'Payable-Screen': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Payable' },
  reports: { eyebrow: 'SUDAMO TEXTILE ERP', title: 'Reports' },
  'permissions/index': { eyebrow: 'ADMINISTRATION', title: 'Permission Manager' },
  'checking-scanner': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Checking Scanner' },
  'beam-close': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Beam Open/Close' },
  'beam-gaiting/index': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Beam Gaiting' },
};

// FEATURE: bottom tab bar caps at this many real tabs; anything beyond it
// (still permission-visible, just past the cap) collapses into a single
// "More" tab that opens a grid sheet instead of navigating directly. As
// more screens get registered in the UI registry over time, they
// automatically flow into "More" rather than the tab bar getting
// overcrowded — nothing here is hardcoded to today's specific screen list.
const MAX_PRIMARY_TABS = 3;

type NavItem = { routeName: string; title: string; icon: string };

export default function TabsLayout() {
  const { canAccess, canDo } = usePermission();
  const hydrated = useAppSessionStore((state) => state.hydrated);
  const appSession = useAppSessionStore((state) => state.appSession);
  // Bumped by setLoggedIn() on every login AND every in-app property
  // switch (see AppHeader.switchProperty -> performLogin()). Keying the
  // <Tabs> tree on it forces every tab screen to fully unmount/remount on
  // switch, so per-screen state fetched only once on mount (token,
  // dashboard cards, list data, etc.) is thrown away and re-fetched
  // against the newly-selected property's API — exactly what happens the
  // very first time /new/(tabs) mounts after a fresh RoleLoginScreen login.
  const sessionEpoch = useAppSessionStore((state) => state.sessionEpoch);
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= 1180;
  const ready = hydrated && Boolean(appSession);

  // SYSTEM-SAFE FLOATING TAB BAR:
  // safe-area-context reports the physical bottom obstruction for both
  // platforms (iOS home indicator, Android gesture/3-button navigation).
  // Add only a small visual ground gap above that obstruction.
  const barBottomOffset = Math.max(0, insets.bottom) + TAB_BAR_GROUND_GAP;
  const barLeftOffset = Math.max(TAB_BAR_SIDE_MARGIN, insets.left + 8);
  const barRightOffset = Math.max(TAB_BAR_SIDE_MARGIN, insets.right + 8);

  // The tab bar is absolute, so reserve its full footprint in every scene.
  // This prevents the last report/list row from sitting behind the pill on
  // either iOS or Android.
  const sceneBottomPadding = isDesktop ? 24 : TAB_BAR_HEIGHT + barBottomOffset + 16;
  const onDashboard = pathname === '/new' || pathname === '/new/' || pathname.endsWith('/new/(tabs)') || pathname.endsWith('/new/(tabs)/');

  const activeRouteName = onDashboard
    ? 'index'
    : APP_NAVIGATION.map((item) => item.routeName).find(
      (routeName) => routeName !== 'index' && pathname.includes(routeName.replace(/\/index$/, '')),
    );
  const activeNavItem = !onDashboard
    ? APP_NAVIGATION.find(
      (item) => item.routeName !== 'index' && pathname.includes(item.routeName.replace(/\/index$/, '')),
    )
    : undefined;

  // Falls back to the nav node's own `title` (from the ui-registry) when this
  // route has no explicit HEADER_CONTENT override — so adding a brand-new
  // feature to the ui-registry is enough to get a correct header out of the
  // box, without also having to add an entry here.
  const header =
    (activeRouteName && HEADER_CONTENT[activeRouteName]) ||
    (activeNavItem && { eyebrow: 'MADHUSUDHAN FABRICS', title: activeNavItem.title }) ||
    HEADER_CONTENT.index;

  // Drill-down report screens render their own compact SubScreenHeader.
  // Do not stack the large tab-level AppHeader above them, otherwise the
  // screen gets the large empty navy block marked in the screenshots.
  // The parent SafeAreaView still owns the top system inset/background.
  const ownsSubScreenHeader =
    pathname.includes('/reports/sales-flow') ||
    pathname.includes('/reports/collection-flow');

  const subtitle = useHeaderExtrasStore((state) => state.subtitle);
  const right = useHeaderExtrasStore((state) => state.right);

  // Permission-visible items, in registry order (APP_NAVIGATION is already
  // sorted by `order` — see navigationRegistry.ts). Deduped by routeName as
  // a defensive measure: if the registry ever ends up with the same
  // routeName listed twice (a copy-paste duplicate entry, for example),
  // that item would otherwise land in both the primary bar AND the
  // overflow "More" sheet at once, showing up twice.
  // const visibleItems = useMemo(() => {
  //   const filtered = APP_NAVIGATION.filter((item) => {
  //     if (!ready) return false;
  //     return item.action && item.action !== 'view' ? canDo(item.resource, item.action) : canAccess(item.resource);
  //   });
  //   const seen = new Set<string>();
  //   return filtered.filter((item) => {
  //     if (seen.has(item.routeName)) return false;
  //     seen.add(item.routeName);
  //     return true;
  //   });
  // }, [ready, canAccess, canDo]);
  const visibleItems = useMemo(() => {
    const filtered = APP_NAVIGATION.filter((item) => {
      if (!ready) return false;
      // Skip "Orders" tab
      // if (item.routeName === 'orders') return false;
      return item.action && item.action !== 'view'
        ? canDo(item.resource, item.action)
        : canAccess(item.resource);
    });
    const seen = new Set<string>();
    return filtered.filter((item) => {
      if (seen.has(item.routeName)) return false;
      seen.add(item.routeName);
      return true;
    });
  }, [ready, canAccess, canDo]);

  const primaryItems = useMemo(() => visibleItems.slice(0, MAX_PRIMARY_TABS), [visibleItems]);
  const primaryRouteNames = useMemo(
    () => new Set(primaryItems.map((item) => item.routeName)),
    [primaryItems],
  );
  const overflowItems = useMemo(() => visibleItems.slice(MAX_PRIMARY_TABS), [visibleItems]);
  const hasOverflow = overflowItems.length > 0;

  const [moreOpen, setMoreOpen] = useState(false);
  const [moreSearch, setMoreSearch] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');

  const filteredOverflowItems = useMemo(() => {
    const query = moreSearch.trim().toLowerCase();
    if (!query) return overflowItems;
    return overflowItems.filter((item) => `${item.title} ${item.routeName}`.toLowerCase().includes(query));
  }, [moreSearch, overflowItems]);

  const filteredSidebarItems = useMemo(() => {
    const query = sidebarSearch.trim().toLowerCase();
    if (!query) return visibleItems;
    return visibleItems.filter((item) => `${item.title} ${item.routeName}`.toLowerCase().includes(query));
  }, [sidebarSearch, visibleItems]);

  const goTo = (routeName: string) => {
    setMoreOpen(false);
    const path = routeName === 'index' ? '' : routeName.replace(/\/index$/, '');
    router.push((path ? `/new/(tabs)/${path}` : '/new/(tabs)') as any);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: T.nav }}>
      <View style={layoutStyles.root}>
        {isDesktop ? (
          <DesktopSidebar
            items={filteredSidebarItems}
            activeRouteName={activeRouteName || 'index'}
            search={sidebarSearch}
            onSearchChange={setSidebarSearch}
            onNavigate={goTo}
            onClearSearch={() => setSidebarSearch('')}
          />
        ) : null}

        <View style={layoutStyles.main}>
          {!ownsSubScreenHeader ? (
            <AppHeader
              eyebrow={header.eyebrow}
              title={header.title}
              subtitle={subtitle || undefined}
              right={right || undefined}
            />
          ) : null}

          <View style={{ flex: 1, backgroundColor: T.bg }}>
            <Tabs
              key={sessionEpoch}
              screenOptions={{
                headerShown: false,
                sceneStyle: {
                  backgroundColor: 'rgba(255,255,255,0)',
                  paddingBottom: sceneBottomPadding,
                },
              }}
              tabBar={isDesktop ? () => null : (props) => (
                <GlassTabBar
                  {...props}
                  primaryItems={primaryItems}
                  overflowItems={overflowItems}
                  hasOverflow={hasOverflow}
                  barBottom={barBottomOffset}
                  barLeft={barLeftOffset}
                  barRight={barRightOffset}
                  onMorePress={() => { setMoreSearch(''); setMoreOpen(true); }}
                />
              )}
            >
              {APP_NAVIGATION.map((item) => {
                const isPrimary = primaryRouteNames.has(item.routeName);
                return (
                  <Tabs.Screen
                    key={item.routeName}
                    name={item.routeName as any}
                    options={{
                      title: item.title,
                      href: isDesktop ? undefined : (isPrimary ? undefined : null),
                    }}
                  />
                );
              })}
              <Tabs.Screen
                name="more"
                options={{
                  title: 'More',
                  href: isDesktop ? null : (hasOverflow ? undefined : null),
                }}
              />
            </Tabs>
          </View>
        </View>
      </View>

      {!isDesktop ? (
        <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
          <View style={moreStyles.shade}>
            <BlurView tint="dark" intensity={25} style={StyleSheet.absoluteFill} />
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMoreOpen(false)} />
            <View
              style={[
                moreStyles.sheet,
                { paddingBottom: 12 + Math.max(0, insets.bottom) },
              ]}
            >
              <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
              <View style={moreStyles.handle} />
              <View style={moreStyles.sheetHeader}>
                <Text style={moreStyles.sheetTitle}>More</Text>
                <TouchableOpacity onPress={() => setMoreOpen(false)}>
                  <Text style={moreStyles.closeX}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={moreStyles.searchWrap}>
                <Icon name="search" size={19} color={T.muted} />
                <TextInput
                  value={moreSearch}
                  onChangeText={setMoreSearch}
                  placeholder="Search modules..."
                  placeholderTextColor={T.muted}
                  style={moreStyles.searchInput}
                  returnKeyType="search"
                  clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
                />
                {moreSearch ? (
                  <TouchableOpacity onPress={() => setMoreSearch('')} hitSlop={8}>
                    <Icon name="close" size={18} color={T.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <ScrollView
                style={moreStyles.scrollArea}
                contentContainerStyle={moreStyles.grid}
                showsVerticalScrollIndicator={true}
                bounces={filteredOverflowItems.length > 8}
                keyboardShouldPersistTaps="handled"
              >
                {filteredOverflowItems.length > 0 ? filteredOverflowItems.map((item) => (
                  <TouchableOpacity key={item.routeName} style={moreStyles.cell} onPress={() => goTo(item.routeName)} activeOpacity={0.7}>
                    <View style={moreStyles.iconWrap}>
                      <Icon name={item.icon as any} size={22} color={T.copper} />
                    </View>
                    <Text style={moreStyles.label} numberOfLines={2}>{item.title}</Text>
                  </TouchableOpacity>
                )) : (
                  <View style={moreStyles.emptySearch}>
                    <Icon name="search-off" size={30} color={T.muted} />
                    <Text style={moreStyles.emptySearchText}>No modules found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}


type DesktopSidebarProps = {
  items: NavItem[];
  activeRouteName: string;
  search: string;
  onSearchChange: (value: string) => void;
  onNavigate: (routeName: string) => void;
  onClearSearch: () => void;
};

function DesktopSidebar({
  items,
  activeRouteName,
  search,
  onSearchChange,
  onNavigate,
  onClearSearch,
}: DesktopSidebarProps) {
  return (
    <View style={desktopStyles.sidebar}>
      <View style={desktopStyles.brandBlock}>
        <Text style={desktopStyles.brandEyebrow}>MADHUSUDHAN FABRICS</Text>
        <Text style={desktopStyles.brandTitle}>Mini ERP</Text>
      </View>
      <View style={desktopStyles.sectionLabelRow}>
        <Icon name="tune" size={16} color="#7C9BB5" />
        <Text style={desktopStyles.sectionLabel}>WORKFLOW</Text>
      </View>
      <View style={desktopStyles.sidebarSearch}>
        <Icon name="search" size={17} color="#7C93A8" />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search modules"
          placeholderTextColor="#6E8498"
          style={desktopStyles.sidebarSearchInput}
        />
        {search ? (
          <TouchableOpacity onPress={onClearSearch} hitSlop={8}>
            <Icon name="close" size={16} color="#8EA5B8" />
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView
        style={desktopStyles.navScroll}
        contentContainerStyle={desktopStyles.navContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item) => {
          const active = activeRouteName === item.routeName;
          return (
            <TouchableOpacity
              key={item.routeName}
              onPress={() => onNavigate(item.routeName)}
              style={[desktopStyles.navItem, active && desktopStyles.navItemActive]}
              activeOpacity={0.8}
            >
              <Icon name={item.icon as any} size={18} color={active ? '#FFFFFF' : '#83A0B6'} />
              <Text style={[desktopStyles.navText, active && desktopStyles.navTextActive]} numberOfLines={1}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
        {items.length === 0 ? (
          <Text style={desktopStyles.emptyNavText}>No modules found</Text>
        ) : null}
      </ScrollView>
      <View style={desktopStyles.sidebarFooter}>
        <Text style={desktopStyles.footerHint}>ERP workspace</Text>
        <Text style={desktopStyles.footerHintMuted}>Use the search to jump to any module.</Text>
      </View>
    </View>
  );
}

type GlassTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    navigate: (name: never) => void;
    emit: (event: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
  };
  primaryItems: NavItem[];
  overflowItems: NavItem[];
  hasOverflow: boolean;
  barBottom: number;
  barLeft: number;
  barRight: number;
  onMorePress: () => void;
};

function GlassTabBar({
  state,
  navigation,
  primaryItems,
  overflowItems,
  hasOverflow,
  barBottom,
  barLeft,
  barRight,
  onMorePress,
}: GlassTabBarProps) {
  const items: NavItem[] = useMemo(
    () => (hasOverflow ? [...primaryItems, { routeName: 'more', title: 'More', icon: 'more-horiz' }] : primaryItems),
    [primaryItems, hasOverflow],
  );

  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});

  const activeRouteFull = state.routes[state.index]?.name;
  const activeIsOverflow = overflowItems.some((i) => i.routeName === activeRouteFull);
  const activeKey = activeIsOverflow
    ? 'more'
    : items.find((i) => i.routeName === activeRouteFull)
      ? activeRouteFull
      : items[0]?.routeName;

  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const l = activeKey ? layouts[activeKey] : undefined;
    if (l) {
      Animated.parallel([
        Animated.spring(pillX, { toValue: l.x, useNativeDriver: false, damping: 20, stiffness: 260, mass: 0.7 }),
        Animated.spring(pillW, { toValue: l.width, useNativeDriver: false, damping: 20, stiffness: 260, mass: 0.7 }),
        Animated.timing(pillOpacity, { toValue: 1, duration: 150, useNativeDriver: false }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, layouts]);

  const pillStyle = {
    transform: [{ translateX: pillX }],
    width: pillW,
    opacity: pillOpacity,
  };

  const handleLayout = (routeName: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const existing = prev[routeName];
      if (existing && existing.x === x && existing.width === width) return prev;
      return { ...prev, [routeName]: { x, width } };
    });
  };

  const handlePress = (item: NavItem) => {
    if (item.routeName === 'more') {
      onMorePress();
      return;
    }
    const targetRoute = state.routes.find((r) => r.name === item.routeName);
    const event = navigation.emit({ type: 'tabPress', target: targetRoute?.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      navigation.navigate(item.routeName as never);
    }
  };

  return (
    <NotificationProvider>
      <View
        pointerEvents="box-none"
        style={[
          styles.barWrap,
          { bottom: barBottom, left: barLeft, right: barRight },
        ]}
      >
        <View style={styles.barShadow}>
          <View style={styles.barClip}>
            <BlurView tint="dark" intensity={55} style={StyleSheet.absoluteFillObject} />
            <View style={[StyleSheet.absoluteFillObject, styles.tintOverlay]} />
            <LinearGradient
              pointerEvents="none"
              colors={[T.nav, T.nav, T.nav]}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View pointerEvents="none" style={styles.glassBorder} />

            <View style={styles.row}>
              <Animated.View style={[styles.pill, pillStyle]} />
              {items.map((item) => {
                const focused = item.routeName === activeKey;
                return (
                  <TabButton
                    key={item.routeName}
                    item={item}
                    focused={!!focused}
                    onLayout={handleLayout(item.routeName)}
                    onPress={() => handlePress(item)}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </NotificationProvider>
  );
}

function TabButton({
  item,
  focused,
  onPress,
  onLayout,
}: {
  item: NavItem;
  focused: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      onPressIn={() => {
        Animated.timing(scale, { toValue: 0.88, duration: 90, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, { toValue: 1, damping: 14, stiffness: 260, useNativeDriver: true }).start();
      }}
      style={styles.tabBtn}
      hitSlop={6}
    >
      <Animated.View style={[styles.tabBtnInner, { transform: [{ scale }] }]}>
        <Icon name={item.icon as any} size={24} color={focused ? T.copper : 'rgba(255,255,255,0.55)'} />
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
          {item.title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const layoutStyles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, minWidth: 0 },
});

const desktopStyles = StyleSheet.create({
  sidebar: { width: 250, backgroundColor: T.nav, borderRightWidth: 1, borderRightColor: '#193149', paddingTop: 18, paddingBottom: 14 },
  brandBlock: { paddingHorizontal: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#193149' },
  brandEyebrow: { color: '#7895AD', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  brandTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 4 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10 },
  sectionLabel: { color: '#7895AD', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  sidebarSearch: { marginHorizontal: 14, marginBottom: 9, borderWidth: 1, borderColor: '#294258', borderRadius: 10, minHeight: 38, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 7, backgroundColor: '#112638' },
  sidebarSearchInput: { flex: 1, color: '#EAF2F7', fontSize: 12, paddingVertical: 7, minWidth: 0 },
  navScroll: { flex: 1 },
  navContent: { paddingHorizontal: 9, paddingBottom: 12 },
  navItem: { minHeight: 42, borderRadius: 9, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 3 },
  navItemActive: { backgroundColor: '#2A3F52' },
  navText: { flex: 1, color: '#B4C5D2', fontSize: 12, fontWeight: '700' },
  navTextActive: { color: '#FFFFFF', fontWeight: '900' },
  emptyNavText: { color: '#8098AA', fontSize: 12, textAlign: 'center', paddingVertical: 18 },
  sidebarFooter: { borderTopWidth: 1, borderTopColor: '#193149', paddingHorizontal: 16, paddingTop: 11 },
  footerHint: { color: '#AFC1CE', fontSize: 10, fontWeight: '800' },
  footerHintMuted: { color: '#6F879B', fontSize: 9, marginTop: 3 },
});

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    height: TAB_BAR_HEIGHT,
  },
  barShadow: {
    flex: 1,
    borderRadius: TAB_BAR_HEIGHT / 2,
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  barClip: {
    flex: 1,
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  tintOverlay: {
    backgroundColor: 'rgba(13,27,42,0.55)',
  },
  glassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 6,
  },
  pill: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    borderRadius: (TAB_BAR_HEIGHT - 16) / 2,
    backgroundColor: 'rgba(200,117,51,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(200,117,51,0.4)',
    shadowColor: T.copper,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  tabLabelActive: {
    color: T.copper,
  },
});

// ─────────────────────────────────────────────────────────────────────────
// MORE SHEET — now a centered, fixed-height glass card instead of a
// bottom-docked sheet. `shade` centers its child both ways; the card itself
// has an explicit `maxHeight` (capped to the screen, via percentage) so it
// never grows unpredictably tall or gets clipped to nothing the way
// `height: 'auto'` with no `maxHeight` could. The grid lives inside a
// `ScrollView` that is given a bounded parent (`flexShrink: 1` on the
// sheet's content area) so it can actually scroll instead of silently
// refusing to when the parent has no fixed height to measure against.
// ─────────────────────────────────────────────────────────────────────────
const moreStyles = StyleSheet.create({
  shade: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  // `height: '50%'` (fixed, not maxHeight) — an exact half-screen card.
  // Full edge-to-edge width: no side padding on `shade`, no `maxWidth` cap
  // here. `flexDirection: 'column'` is explicit because `scrollArea` below
  // needs `flex: 1` to correctly claim "everything left over after the
  // handle + header row" — that only resolves predictably inside a flex
  // column with a fixed-height parent, which is exactly what this now is.
  sheet: {
    width: '100%',
    height: '70%',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 10 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 8, minHeight: 42, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 10, gap: 8, backgroundColor: 'rgba(255,255,255,0.72)' },
  searchInput: { flex: 1, minWidth: 0, color: T.ink, fontSize: 12, fontWeight: '700', paddingVertical: 9 },
  emptySearch: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  emptySearchText: { marginTop: 8, color: T.muted, fontSize: 12, fontWeight: '700' },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: T.nav },
  closeX: { fontSize: 18, color: '#000' },
  // `flex: 1` — claims all remaining height inside the fixed-height `sheet`
  // (the 50% minus the handle + header above it), so the grid scrolls
  // within that bounded space instead of pushing the sheet taller or
  // silently refusing to scroll.
  scrollArea: {
    flex: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  cell: { width: '25%', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: T.sub, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  label: { fontSize: 10.5, lineHeight: 13, fontWeight: '800', color: T.ink, textAlign: 'center', minHeight: 26, width: '100%', paddingHorizontal: 3 },
});