import { NotificationProvider } from '@/common/context/NotificationContext';
import { AppHeader } from '@/src/components/layout/AppHeader';
import { useHeaderExtrasStore } from '@/src/core/layout/headerExtras';
import { TopInsetHandled } from '@/src/core/layout/topInset';
import { APP_NAVIGATION } from '@/src/core/navigation';
import { usePermission } from '@/src/core/permissions';
import { ThemeToggleButton } from '@/src/core/theme/ThemeControls';
import { useMyScreens } from '@/src/core/userPrefs/useMyScreens';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScreenErrorBoundary } from '@/src/core/crash/ScreenErrorBoundary';
import {
  Animated,
  Keyboard,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// FEATURE: floating "pill" tab bar (matches the native iOS Phone-app style
// tab bar — a rounded bar with a soft gap from the screen edges, instead of
// a bar docked flush along the bottom). Kept as named constants so the
// floating math below (bar position + the paddingBottom every screen needs
// so its content isn't hidden behind the bar) stays in one place and can't
// drift out of sync.
// COMPACT: 75 -> 62 (phones) / 64 (tablets) so screens get more room, and on
// tablets the bar is centred with a max width instead of stretching edge to edge.
const TAB_BAR_HEIGHT = 62;
const TAB_BAR_HEIGHT_TABLET = 64;
const TAB_BAR_MAX_WIDTH = 560;
const TAB_BAR_SIDE_MARGIN = 12;
const TAB_BAR_GROUND_GAP = 8; // visual gap above iOS home indicator / Android system navigation
const TAB_BAR_CONTENT_GAP = 10; // breathing room between the last row of a screen and the bar
const IS_IOS = Platform.OS === 'ios';

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
  priority: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Dyeing' },
  datalog: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Datalog' },
  'production-order-tracking': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Production Order Tracking' },
  'sudamo-production-order': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Sudamo Production Order' },
  'credit-limit-request': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Credit Limit Request' },
  // 'Payable-Screen': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Payable' },
  'Payable-Screen': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Payable' },
  'receivables-screen': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Receivables' },
  'fabric-stock': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Fabric Stock' },
  'sales-order-entry': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Sales Order Entry' },
  'yarn-stock': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Yarn Stock' },
  'doff-entry': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Doff Entry' },
  'item-authorization': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Item Authorization' },
  'packing-grade-auth': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Packing Grade Auth' },
  'poy-rate-entry': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'POY Rate Entry' },
  'price-list': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Price List' },
  'process-complete-auth': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Process Complete Auth' },
  'production-merge-auth': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Production Merge Auth' },
  'yarnstockverification': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Yarn Stock Verification' },
  'fabric-stock-verification': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Fabric Stock Verification' },
  inquiry: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Inquiry' },
  'inquiry-report': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Inquiry Report' },
  'weft-issue': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Weft Issue' },
  'weft-issue-return': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Weft Issue Return' },
  'creel-issue-return-new': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Creel Issue Return' },
  'creel-management-new': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Creel Management System' },
  'checking-scanner-new': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Checking Scanner' },
  'beam-gaiting-new': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Beam Gaiting' },
  'beam-close-new': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Beam Open/Close' },
  'sales-order-inactive': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Sales Order (Inactive)' },
  'sales-order-price-list-auth': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Sales Order Price List Auth' },
  'purchase-rate-auth': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Purchase Rate Auth' },
  'purchase-import-auth': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Purchase Import Auth' },
  'purchase-grade-auth': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Purchase Grade Auth' },
  'monthly-expense-report': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Monthly Expense Report' },
  visits: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Visits' },
  'visitors-report': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Visitors Report' },
  reports: { eyebrow: 'SUDAMO TEXTILE ERP', title: 'Reports' },
  'permissions/index': { eyebrow: 'ADMINISTRATION', title: 'Permission Manager' },
  'checking-scanner': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Checking Scanner' },
  'beam-close': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Beam Open/Close' },
  'beam-gaiting/index': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Beam Gaiting' },
  'weft-carton-issue-new': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Weft Carton Issue' },
};

// FEATURE: bottom tab bar caps at this many real tabs; anything beyond it
// (still permission-visible, just past the cap) collapses into a single
// "More" tab that opens a grid sheet instead of navigating directly. As
// more screens get registered in the UI registry over time, they
// automatically flow into "More" rather than the tab bar getting
// overcrowded — nothing here is hardcoded to today's specific screen list.
const MAX_PRIMARY_TABS = 3;

type NavItem = { routeName: string; title: string; icon: string };

function routeMatchesPath(pathname: string, routeName: string) {
  const r = routeName.replace(/\/index$/, '');
  if (!r) return false;
  return pathname === `/${r}` || pathname.endsWith(`/${r}`) || pathname.includes(`/${r}/`);
}

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
  const isTabletWidth = !isDesktop && windowWidth >= 768;
  const tabBarHeight = isTabletWidth ? TAB_BAR_HEIGHT_TABLET : TAB_BAR_HEIGHT;
  const ready = hydrated && Boolean(appSession);

  // Hide the floating bar while the keyboard is open, so it never sits on
  // top of the input being typed into (Android resizes the window upward).
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const showEvt = IS_IOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = IS_IOS ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, () => setKeyboardOpen(true));
    const b = Keyboard.addListener(hideEvt, () => setKeyboardOpen(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  // SYSTEM-SAFE FLOATING TAB BAR:
  // safe-area-context reports the physical bottom obstruction for both
  // platforms (iOS home indicator, Android gesture/3-button navigation).
  // Add only a small visual ground gap above that obstruction.
  const barBottomOffset = Math.max(0, insets.bottom) + TAB_BAR_GROUND_GAP;
  const centeredGutter = Math.max(0, (windowWidth - TAB_BAR_MAX_WIDTH) / 2);
  const barLeftOffset = Math.max(TAB_BAR_SIDE_MARGIN, insets.left + 8, centeredGutter);
  const barRightOffset = Math.max(TAB_BAR_SIDE_MARGIN, insets.right + 8, centeredGutter);

  // The tab bar is absolute, so reserve its full footprint in every scene.
  // This prevents the last report/list row from sitting behind the pill on
  // either iOS or Android.
  const sceneBottomPadding = isDesktop
    ? 24
    : keyboardOpen
      ? 0
      : tabBarHeight + barBottomOffset + TAB_BAR_CONTENT_GAP;
  const onDashboard = pathname === '/new' || pathname === '/new/' || pathname.endsWith('/new/(tabs)') || pathname.endsWith('/new/(tabs)/');

  // Match a route by whole path segment and prefer the LONGEST matching route.
  // (A plain `pathname.includes(route)` made '/new/weft-issue-return' resolve to
  // 'weft-issue', '/new/sales-order-inactive' to 'sales-order' and
  // '/new/sales-order-price-list-auth' to 'price-list' — wrong header title.)
  const activeNavItem = !onDashboard
    ? APP_NAVIGATION
      .filter((item) => item.routeName !== 'index' && routeMatchesPath(pathname, item.routeName))
      .sort((a, b) => b.routeName.length - a.routeName.length)[0]
    : undefined;
  const activeRouteName = onDashboard ? 'index' : activeNavItem?.routeName;

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
  // The permission-visible list is built in ONE place now (useMyScreens — same
  // rule as before: registry order, rights filter, dedupe by routeName).
  // `visibleItems` is that list minus the screens the user switched off in
  // Settings > My screens. Rights are not involved in that second step.
  const { shownItems: visibleItems } = useMyScreens();

  const primaryItems = useMemo(() => visibleItems.slice(0, MAX_PRIMARY_TABS), [visibleItems]);
  const primaryRouteNames = useMemo(
    () => new Set(primaryItems.map((item) => item.routeName)),
    [primaryItems],
  );
  const overflowItems = useMemo(() => visibleItems.slice(MAX_PRIMARY_TABS), [visibleItems]);
  const hasOverflow = overflowItems.length > 0;

  const [moreOpen, setMoreOpen] = useState(false);
  // More sheet grid: 4 columns on phones, 6 on tablets / phones in landscape.
  const moreCellWidth = windowWidth >= 700 ? '16.66%' : '25%';
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

  // FRESH SCREEN ON MENU NAVIGATION:
  // Tabs keep every visited screen mounted, so opening a module again from
  // the sidebar / footer / More sheet used to show whatever was left there
  // last time (old filters, old list, old token). Every menu tap now bumps
  // that route's "visit" counter; `screenLayout` below keys the screen on
  // it, so the screen fully remounts and loads fresh — same as a refresh,
  // on both mobile and web. Drill-downs (router.push from inside a screen)
  // and router.back() are NOT affected, so their state is kept as before.
  const [routeVisits, setRouteVisits] = useState<Record<string, number>>({});
  const markFreshVisit = (routeName: string) => {
    setRouteVisits((prev) => ({ ...prev, [routeName]: (prev[routeName] || 0) + 1 }));
  };

  const goTo = (routeName: string) => {
    setMoreOpen(false);
    markFreshVisit(routeName);
    const path = routeName === 'index' ? '' : routeName.replace(/\/index$/, '');
    router.push((path ? `/new/(tabs)/${path}` : '/new/(tabs)') as any);
  };

  return (
    <TopInsetHandled.Provider value={true}>
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: T.nav }}>
      <View style={layoutStyles.root}>
        {isDesktop ? (
          <DesktopSidebar
            windowWidth={windowWidth}
            items={filteredSidebarItems}
            activeRouteName={activeRouteName || 'index'}
            search={sidebarSearch}
            onSearchChange={setSidebarSearch}
            onNavigate={goTo}
            onClearSearch={() => setSidebarSearch('')}
            onOpenSettings={() => router.push('/new/settings' as any)}
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
              screenLayout={({ children, route }: { children: React.ReactNode; route: { name: string } }) => (
                // ScreenErrorBoundary: a screen that fails shows "Try again" in
                // its own area — header, menu and every other screen keep
                // working. Opening the module again from the menu clears it.
                <ScreenErrorBoundary key={`${route.name}:${routeVisits[route.name] || 0}`}>
                  {children}
                </ScreenErrorBoundary>
              )}
              screenOptions={{
                headerShown: false,
                // Nested stacks (reports, designs, costing) go back to their
                // first screen when you leave the tab, so re-opening them
                // from the menu starts clean.
                popToTopOnBlur: true,
                sceneStyle: {
                  backgroundColor: 'rgba(255,255,255,0)',
                  paddingBottom: sceneBottomPadding,
                },
              }}
              tabBar={isDesktop || keyboardOpen ? () => null : (props) => (
                <GlassTabBar
                  {...props}
                  barHeight={tabBarHeight}
                  primaryItems={primaryItems}
                  overflowItems={overflowItems}
                  hasOverflow={hasOverflow}
                  barBottom={barBottomOffset}
                  barLeft={barLeftOffset}
                  barRight={barRightOffset}
                  onMorePress={() => { setMoreSearch(''); setMoreOpen(true); }}
                  onNavigateRoute={markFreshVisit}
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
                windowWidth >= 700 && moreStyles.sheetWide,
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
                  <TouchableOpacity key={item.routeName} style={[moreStyles.cell, { width: moreCellWidth as any }]} onPress={() => goTo(item.routeName)} activeOpacity={0.7}>
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
    </TopInsetHandled.Provider>
  );
}


type DesktopSidebarProps = {
  windowWidth: number;
  items: NavItem[];
  activeRouteName: string;
  search: string;
  onSearchChange: (value: string) => void;
  onNavigate: (routeName: string) => void;
  onClearSearch: () => void;
  onOpenSettings: () => void;
};

// DESKTOP SIDEBAR (web >= 1180px): compact rows, width follows the window
// (224px on laptops, 248px on wide monitors) and it can be collapsed to an
// icon rail to give tables more room. Same items, search and navigation as before.
function DesktopSidebar({
  windowWidth,
  items,
  activeRouteName,
  search,
  onSearchChange,
  onNavigate,
  onClearSearch,
  onOpenSettings,
}: DesktopSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const width = collapsed ? 68 : windowWidth >= 1440 ? 248 : 224;

  return (
    <View style={[desktopStyles.sidebar, { width }]}>
      <View style={[desktopStyles.brandBlock, collapsed && desktopStyles.brandBlockCollapsed]}>
        {!collapsed ? (
          <View style={desktopStyles.brandText}>
            <Text style={desktopStyles.brandEyebrow} numberOfLines={1}>MADHUSUDHAN FABRICS</Text>
            <Text style={desktopStyles.brandTitle} numberOfLines={1}>Mini ERP</Text>
          </View>
        ) : null}
        <TouchableOpacity
          onPress={() => setCollapsed((v) => !v)}
          style={desktopStyles.collapseBtn}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={18} color="#B4C5D2" />
        </TouchableOpacity>
      </View>

      {!collapsed ? (
        <>
          <View style={desktopStyles.sectionLabelRow}>
            <Icon name="tune" size={14} color="#7C9BB5" />
            <Text style={desktopStyles.sectionLabel}>WORKFLOW</Text>
          </View>
          <View style={desktopStyles.sidebarSearch}>
            <Icon name="search" size={16} color="#7C93A8" />
            <TextInput
              value={search}
              onChangeText={onSearchChange}
              placeholder="Search modules"
              placeholderTextColor="#6E8498"
              style={desktopStyles.sidebarSearchInput}
            />
            {search ? (
              <TouchableOpacity onPress={onClearSearch} hitSlop={8}>
                <Icon name="close" size={15} color="#8EA5B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      ) : (
        <TouchableOpacity
          onPress={() => setCollapsed(false)}
          style={desktopStyles.railSearch}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Search modules"
        >
          <Icon name="search" size={18} color="#8EA5B8" />
        </TouchableOpacity>
      )}

      <ScrollView
        style={desktopStyles.navScroll}
        contentContainerStyle={[desktopStyles.navContent, collapsed && desktopStyles.navContentCollapsed]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item) => {
          const active = activeRouteName === item.routeName;
          return (
            <TouchableOpacity
              key={item.routeName}
              onPress={() => onNavigate(item.routeName)}
              style={[
                desktopStyles.navItem,
                collapsed && desktopStyles.navItemCollapsed,
                active && desktopStyles.navItemActive,
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              {active && !collapsed ? <View style={desktopStyles.activeMarker} /> : null}
              <Icon name={item.icon as any} size={18} color={active ? T.copper : '#83A0B6'} />
              {!collapsed ? (
                <Text style={[desktopStyles.navText, active && desktopStyles.navTextActive]} numberOfLines={1}>
                  {item.title}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
        {items.length === 0 && !collapsed ? (
          <Text style={desktopStyles.emptyNavText}>No modules found</Text>
        ) : null}
      </ScrollView>
      {!collapsed ? (
        <View style={desktopStyles.sidebarFooter}>
          {/* Theme (Light / Dark) + Settings — same controls as the header. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ThemeToggleButton onDark size={34} label />
            <TouchableOpacity
              onPress={onOpenSettings}
              style={{ height: 34, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.06)' }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Icon name="settings" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>Settings</Text>
            </TouchableOpacity>
          </View>
          <Text style={desktopStyles.footerHint}>ERP workspace</Text>
          <Text style={desktopStyles.footerHintMuted} numberOfLines={2}>Use the search to jump to any module.</Text>
        </View>
      ) : null}
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
  barHeight?: number;
  barBottom: number;
  barLeft: number;
  barRight: number;
  onMorePress: () => void;
  /** Called right before a footer tab navigates, so the screen opens fresh. */
  onNavigateRoute?: (routeName: string) => void;
};

// LIQUID-GLASS FLOATING TAB BAR
// iOS: real system material blur (systemChromeMaterialDark) + light navy
// tint + a specular top highlight + a sliding glass "lens" that stretches
// while it moves between tabs (like iOS 26 tab bars). Android can't blur
// cheaply, so it gets a denser tint of the same look; web uses CSS
// backdrop-filter through expo-blur. Navigation logic is unchanged.
const GLASS_TINT = Platform.select({
  ios: 'rgba(13,27,42,0.42)',
  android: 'rgba(13,27,42,0.93)',
  default: 'rgba(13,27,42,0.62)',
});

function GlassTabBar({
  state,
  navigation,
  primaryItems,
  overflowItems,
  hasOverflow,
  barHeight = TAB_BAR_HEIGHT,
  barBottom,
  barLeft,
  barRight,
  onMorePress,
  onNavigateRoute,
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
  // 1 = resting; briefly > 1 while the lens slides (liquid stretch).
  const pillStretch = useRef(new Animated.Value(1)).current;
  const firstPlacement = useRef(true);

  useEffect(() => {
    const l = activeKey ? layouts[activeKey] : undefined;
    if (!l) return;
    const lensInset = 4;
    const toX = l.x + lensInset;
    const toW = Math.max(0, l.width - lensInset * 2);
    if (firstPlacement.current) {
      // First layout: place the lens without sliding in from x = 0.
      firstPlacement.current = false;
      pillX.setValue(toX);
      pillW.setValue(toW);
      Animated.timing(pillOpacity, { toValue: 1, duration: 160, useNativeDriver: false }).start();
      return;
    }
    Animated.parallel([
      Animated.spring(pillX, { toValue: toX, useNativeDriver: false, damping: 18, stiffness: 220, mass: 0.8 }),
      Animated.spring(pillW, { toValue: toW, useNativeDriver: false, damping: 18, stiffness: 220, mass: 0.8 }),
      Animated.timing(pillOpacity, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(pillStretch, { toValue: 1.1, duration: 110, useNativeDriver: false }),
        Animated.spring(pillStretch, { toValue: 1, useNativeDriver: false, damping: 9, stiffness: 180, mass: 0.6 }),
      ]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, layouts]);

  const lensVertical = 6;
  const pillStyle = {
    top: lensVertical,
    bottom: lensVertical,
    borderRadius: (barHeight - lensVertical * 2) / 2,
    transform: [
      { translateX: pillX },
      { scaleX: pillStretch },
      { scaleY: pillStretch.interpolate({ inputRange: [1, 1.1], outputRange: [1, 0.9] }) },
    ],
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
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => undefined);
    }
    if (item.routeName === 'more') {
      onMorePress();
      return;
    }
    const targetRoute = state.routes.find((r) => r.name === item.routeName);
    const event = navigation.emit({ type: 'tabPress', target: targetRoute?.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      onNavigateRoute?.(item.routeName);
      navigation.navigate(item.routeName as never);
    }
  };

  const radius = barHeight / 2;

  return (
    <NotificationProvider>
      <View
        pointerEvents="box-none"
        style={[
          styles.barWrap,
          { bottom: barBottom, left: barLeft, right: barRight, height: barHeight },
        ]}
      >
        <View style={[styles.barShadow, { borderRadius: radius }]}>
          <View style={[styles.barClip, { borderRadius: radius }]}>
            <BlurView
              tint={IS_IOS ? 'systemChromeMaterialDark' : 'dark'}
              intensity={IS_IOS ? 85 : 60}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: GLASS_TINT }]} />
            {/* specular highlight: light falling on the top half of the glass */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View pointerEvents="none" style={[styles.glassBorder, { borderRadius: radius }]} />
            <View pointerEvents="none" style={[styles.glassRimTop, { left: radius * 0.6, right: radius * 0.6 }]} />

            <View style={styles.row}>
              <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]}>
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
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
        Animated.timing(scale, { toValue: 0.9, duration: 90, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, { toValue: 1, damping: 14, stiffness: 260, useNativeDriver: true }).start();
      }}
      style={styles.tabBtn}
      hitSlop={4}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={item.title}
    >
      <Animated.View style={[styles.tabBtnInner, { transform: [{ scale }] }]}>
        <Icon name={item.icon as any} size={22} color={focused ? T.copper : 'rgba(255,255,255,0.62)'} />
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
  sidebar: { backgroundColor: T.nav, borderRightWidth: 1, borderRightColor: '#193149', paddingTop: 12, paddingBottom: 10 },
  brandBlock: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#193149', gap: 8 },
  brandBlockCollapsed: { paddingLeft: 10, justifyContent: 'center' },
  brandText: { flex: 1, minWidth: 0 },
  brandEyebrow: { color: '#7895AD', fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  brandTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 2 },
  collapseBtn: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#294258', backgroundColor: '#112638' },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  sectionLabel: { color: '#7895AD', fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2 },
  sidebarSearch: { marginHorizontal: 12, marginBottom: 8, borderWidth: 1, borderColor: '#294258', borderRadius: 9, minHeight: 34, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 6, backgroundColor: '#112638' },
  sidebarSearchInput: { flex: 1, color: '#EAF2F7', fontSize: 12, paddingVertical: 6, minWidth: 0 },
  railSearch: { alignSelf: 'center', width: 40, height: 36, marginTop: 10, marginBottom: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#294258', backgroundColor: '#112638' },
  navScroll: { flex: 1 },
  navContent: { paddingHorizontal: 8, paddingBottom: 10 },
  navContentCollapsed: { paddingHorizontal: 10, paddingTop: 4, alignItems: 'stretch' },
  navItem: { minHeight: 36, borderRadius: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2, position: 'relative' },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0, minHeight: 40, marginBottom: 4 },
  navItemActive: { backgroundColor: '#1F3549' },
  activeMarker: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2, backgroundColor: T.copper },
  navText: { flex: 1, color: '#B4C5D2', fontSize: 12.5, fontWeight: '500' },
  navTextActive: { color: '#FFFFFF', fontWeight: '700' },
  emptyNavText: { color: '#8098AA', fontSize: 12, textAlign: 'center', paddingVertical: 18 },
  sidebarFooter: { borderTopWidth: 1, borderTopColor: '#193149', paddingHorizontal: 16, paddingTop: 9 },
  footerHint: { color: '#AFC1CE', fontSize: 10, fontWeight: '700' },
  footerHintMuted: { color: '#6F879B', fontSize: 9.5, marginTop: 2 },
});

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    height: TAB_BAR_HEIGHT,
  },
  barShadow: {
    flex: 1,
    borderRadius: TAB_BAR_HEIGHT / 2,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 20,
  },
  barClip: {
    flex: 1,
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  glassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  // thin bright rim on the top edge — the "glass edge catching light"
  glassRimTop: {
    position: 'absolute',
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 4,
  },
  pill: {
    position: 'absolute',
    left: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingHorizontal: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.62)',
    marginTop: 1,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: T.copper,
    fontWeight: '700',
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
  // tablets / landscape: centred card instead of a full-width sheet
  sheetWide: { width: '100%', maxWidth: 720, alignSelf: 'center', height: '62%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 10 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 8, minHeight: 42, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 10, gap: 8, backgroundColor: 'rgba(255,255,255,0.72)' },
  searchInput: { flex: 1, minWidth: 0, color: T.ink, fontSize: 12, fontWeight: '700', paddingVertical: 9 },
  emptySearch: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  emptySearchText: { marginTop: 8, color: T.muted, fontSize: 12, fontWeight: '700' },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: T.nav },
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
  label: { fontSize: 10.5, lineHeight: 13, fontWeight: '600', color: T.ink, textAlign: 'center', minHeight: 26, width: '100%', paddingHorizontal: 3 },
});