// import { AppHeader } from '@/src/components/layout/AppHeader';
// import { useHeaderExtrasStore } from '@/src/core/layout/headerExtras';
// import { APP_NAVIGATION } from '@/src/core/navigation';
// import { usePermission } from '@/src/core/permissions';
// import { useAppSessionStore } from '@/src/stores/AppSessionStore';
// import { T } from '@/src/theme';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import { Tabs, usePathname, useRouter } from 'expo-router';
// import React, { useMemo, useState } from 'react';
// import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// // FEATURE: floating "pill" tab bar (matches the native iOS Phone-app style
// // tab bar — a rounded bar with a soft gap from the screen edges, instead of
// // a bar docked flush along the bottom). Kept as named constants so the
// // floating math below (bar position + the paddingBottom every screen needs
// // so its content isn't hidden behind the bar) stays in one place and can't
// // drift out of sync.
// const TAB_BAR_HEIGHT = 75;
// const TAB_BAR_SIDE_MARGIN = 14;
// const TAB_BAR_GROUND_GAP = 10; // gap between the bar and the home indicator / nav bar

// // FIX: this is now the ONE place a header is rendered for every tab screen.
// // Previously DashboardScreen, DesignsScreen, PermissionManagerScreen and
// // OrdersScreen each rendered their own separate header component — which is
// // why switching tabs could show two stacked navy header blocks (a nav item's
// // previous screen staying mounted-but-hidden underneath, per Expo Router's
// // default tab behavior, plus the new screen's own header on top). With only
// // one AppHeader in the whole tree, that's now structurally impossible.
// //
// // The bottom-tab label from the UI registry (`item.title`, e.g. "Home") is
// // intentionally short for the tab bar icon caption. The main header wants a
// // longer, more descriptive title ("Business Dashboard") — kept here as a
// // small local map rather than a new registry field, since only these
// // screens need the distinction.
// const HEADER_CONTENT: Record<string, { eyebrow?: string; title: string }> = {
//   index: { eyebrow: 'SUDAMO TEXTILE ERP', title: 'Business Dashboard' },
//   designs: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Designs' },
//   costing: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Costing' },
//   orders: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Orders' },
//   reports: { eyebrow: 'SUDAMO TEXTILE ERP', title: 'Reports' },
//   'permissions/index': { eyebrow: 'ADMINISTRATION', title: 'Permission Manager' },
//   'checking-scanner': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Checking Scanner' },
//   'beam-close': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Beam Open/Close' },
//   'beam-gaiting/index': { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Beam Gaiting' },
// };

// // FEATURE: bottom tab bar caps at this many real tabs; anything beyond it
// // (still permission-visible, just past the cap) collapses into a single
// // "More" tab that opens a grid sheet instead of navigating directly. As
// // more screens get registered in the UI registry over time, they
// // automatically flow into "More" rather than the tab bar getting
// // overcrowded — nothing here is hardcoded to today's specific screen list.
// const MAX_PRIMARY_TABS = 4;

// export default function TabsLayout() {
//   const { canAccess, canDo } = usePermission();
//   const hydrated = useAppSessionStore((state) => state.hydrated);
//   const appSession = useAppSessionStore((state) => state.appSession);
//   const pathname = usePathname();
//   const router = useRouter();
//   const insets = useSafeAreaInsets();
//   const ready = hydrated && Boolean(appSession);

//   // Distance from the physical bottom edge to where the pill sits — clears
//   // the home indicator on iOS and the gesture bar on Android either way,
//   // since both report their own value through `insets.bottom` (Android's is
//   // 0 on 3-button nav, ~16-24 on gesture nav; this works for both).
//   const barBottomOffset = insets.bottom + TAB_BAR_GROUND_GAP;
//   // Every screen needs this much bottom padding so its last row of content
//   // never sits underneath the floating (position: 'absolute') bar — React
//   // Navigation doesn't add this automatically for absolute tab bars, so it's
//   // applied once here via `sceneStyle` rather than in every screen file.
//   const sceneBottomPadding = TAB_BAR_HEIGHT + barBottomOffset + 12;
//   const onDashboard = pathname === '/new' || pathname === '/new/' || pathname.endsWith('/new/(tabs)') || pathname.endsWith('/new/(tabs)/');

//   const activeRouteName = onDashboard
//     ? 'index'
//     : APP_NAVIGATION.map((item) => item.routeName).find(
//         (routeName) => routeName !== 'index' && pathname.includes(routeName.replace(/\/index$/, '')),
//       );
//   const header = (activeRouteName && HEADER_CONTENT[activeRouteName]) || HEADER_CONTENT.index;

//   const subtitle = useHeaderExtrasStore((state) => state.subtitle);
//   const right = useHeaderExtrasStore((state) => state.right);

//   // Permission-visible items, in registry order (APP_NAVIGATION is already
//   // sorted by `order` — see navigationRegistry.ts).
//   const visibleItems = useMemo(
//     () =>
//       APP_NAVIGATION.filter((item) => {
//         if (!ready) return false;
//         return item.action && item.action !== 'view' ? canDo(item.resource, item.action) : canAccess(item.resource);
//       }),
//     [ready, canAccess, canDo],
//   );

//   const primaryRouteNames = useMemo(
//     () => new Set(visibleItems.slice(0, MAX_PRIMARY_TABS).map((item) => item.routeName)),
//     [visibleItems],
//   );
//   const overflowItems = useMemo(() => visibleItems.slice(MAX_PRIMARY_TABS), [visibleItems]);
//   const hasOverflow = overflowItems.length > 0;

//   const [moreOpen, setMoreOpen] = useState(false);

//   // FIX: this used to push `/new/(tabs)/${routeName}` directly — for an
//   // item like Permissions, whose registry routeName is 'permissions/index'
//   // (matching the actual file path, which is what Tabs.Screen's `name`
//   // needs), that built '/new/(tabs)/permissions/index'. But Expo Router's
//   // *resolved URL* for an index.tsx file never includes a literal "index"
//   // segment (same reason the header-title matching needed this same fix
//   // earlier) — so that URL doesn't exist, producing the "Unmatched Route"
//   // screen. Stripping a trailing '/index' before building the push target
//   // fixes this for Permissions and any future route with the same shape.
//   const goTo = (routeName: string) => {
//     setMoreOpen(false);
//     const path = routeName === 'index' ? '' : routeName.replace(/\/index$/, '');
//     router.push((path ? `/new/(tabs)/${path}` : '/new/(tabs)') as any);
//   };

//   return (
//     <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: T.nav }}>
//       <AppHeader eyebrow={header.eyebrow} title={header.title} subtitle={subtitle || undefined} right={right || undefined} />
//       <View style={{ flex: 1, backgroundColor: T.bg }}>
//         <Tabs screenOptions={{
//           headerShown: false,
//           tabBarActiveTintColor: T.copper,
//           tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
//           // `position: 'absolute'` + explicit left/right/bottom is what turns
//           // this from a bar docked flush along the bottom into a floating
//           // pill with a visible gap on all four sides, like the reference
//           // screenshot. `sceneStyle` is the paired fix — see note above.
//           tabBarStyle: {
//             position: 'absolute',
//             left: TAB_BAR_SIDE_MARGIN,
//             right: TAB_BAR_SIDE_MARGIN,
//             bottom: barBottomOffset,
//             height: TAB_BAR_HEIGHT,
//             borderRadius: TAB_BAR_HEIGHT / 2,
//             backgroundColor: T.nav,
//             borderTopWidth: 0,
//             paddingHorizontal: 6,
//             elevation: 12, // Android shadow
//             shadowColor: '#000', // iOS shadow
//             shadowOffset: { width: 0, height: 6 },
//             shadowOpacity: 0.22,
//             shadowRadius: 14,
//             marginHorizontal: 10,
//           },
//           tabBarItemStyle: { paddingVertical: 6, borderRadius: TAB_BAR_HEIGHT / 2 },
//           tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: 1 },
//           tabBarIconStyle: { marginTop: 2 },
//           sceneStyle: { backgroundColor: T.bg, paddingBottom: sceneBottomPadding },
//         }}>
//           {APP_NAVIGATION.map((item) => {
//             const isPrimary = primaryRouteNames.has(item.routeName);
//             return (
//               <Tabs.Screen
//                 key={item.routeName}
//                 name={item.routeName as any}
//                 options={{
//                   title: item.title,
//                   // Hidden from the tab bar if either not permission-visible
//                   // (existing behavior) or visible-but-past the 4-tab cap
//                   // (new behavior) — either way the route itself stays
//                   // valid and reachable via router.push from the More sheet.
//                   href: isPrimary ? undefined : null,
//                   tabBarIcon: ({ color }) => (
//                     <Icon name={item.icon as any} size={24} color={color} />
//                   ),
//                 }}
//               />
//             );
//           })}
//           {/* TEMPORARY PRODUCTION HOLD:
//               Keep route files in the project for later re-testing, but explicitly
//               hide them from Expo Router tabs and deep-link navigation surfaces.
//               These entries do not mount or call any module API. */}
//           <Tabs.Screen name="beam-close" options={{ href: null }} />
//           <Tabs.Screen name="beam-close/index" options={{ href: null }} />
//           <Tabs.Screen name="beam-gaiting/index" options={{ href: null }} />
//           <Tabs.Screen name="checking_scanner" options={{ href: null }} />
//           {/* "More" is a real placeholder route (see more.tsx) purely so
//               Expo Router has something to attach this Tabs.Screen to.
//               Pressing it never navigates there — tabPress is intercepted
//               below to open the grid sheet instead. */}
//           <Tabs.Screen
//             name="more"
//             options={{
//               title: 'More',
//               href: hasOverflow ? undefined : null,
//               tabBarIcon: ({ color }) => (
//                 <Icon name="more-horiz" size={24} color={color} />
//               ),
//             }}
//             listeners={{
//               tabPress: (e) => {
//                 e.preventDefault();
//                 setMoreOpen(true);
//               },
//             }}
//           />
//         </Tabs>
//       </View>

//       {/* FIX: this was originally built with the app's existing
//           BottomSheet component (@gorhom/bottom-sheet under the hood).
//           That library renders itself high in the tree — even while
//           "closed" — via its own internal Animated/Portal machinery. That
//           was fine everywhere else it's used (nested deep inside a single
//           screen's content), but placed here, as a sibling of the header
//           and the Tab navigator itself, it ended up clipping/hiding both
//           the header and the bottom tab bar entirely. Replaced with a
//           plain Modal — a real OS-level overlay that can't interfere with
//           sibling layout the way an in-tree animated sheet can. Same
//           pattern already used safely elsewhere in this app (the
//           SearchableDropdown component, and Permission Manager's
//           role/user picker). */}
//       <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={() => setMoreOpen(false)}>
//         <View style={moreStyles.shade}>
//           <View style={[moreStyles.sheet, { paddingBottom: 20 + insets.bottom }]}>
//             <View style={moreStyles.handle} />
//             <View style={moreStyles.sheetHeader}>
//               <Text style={moreStyles.sheetTitle}>More</Text>
//               <TouchableOpacity onPress={() => setMoreOpen(false)}>
//                 <Text style={moreStyles.closeX}>✕</Text>
//               </TouchableOpacity>
//             </View>
//             <ScrollView contentContainerStyle={moreStyles.grid}>
//               {overflowItems.map((item) => (
//                 <TouchableOpacity key={item.routeName} style={moreStyles.cell} onPress={() => goTo(item.routeName)} activeOpacity={0.7}>
//                   <View style={moreStyles.iconWrap}>
//                     <Icon name={item.icon as any} size={22} color={T.copper} />
//                   </View>
//                   <Text style={moreStyles.label} numberOfLines={1}>{item.title}</Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const moreStyles = StyleSheet.create({
//   shade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
//   sheet: {
//     backgroundColor: T.surface, maxHeight: '75%',
//     borderTopLeftRadius: 18, borderTopRightRadius: 18,
//     paddingTop: 10, paddingBottom: 20,
//   },
//   handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 10 },
//   sheetHeader: {
//     flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
//     paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.border,
//   },
//   sheetTitle: { fontSize: 16, fontWeight: '900', color: T.nav },
//   closeX: { fontSize: 18, color: T.muted },
//   grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
//   cell: { width: '25%', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
//   iconWrap: {
//     width: 56, height: 56, borderRadius: 16,
//     backgroundColor: T.sub, borderWidth: 1, borderColor: T.border,
//     alignItems: 'center', justifyContent: 'center', marginBottom: 6,
//   },
//   label: { fontSize: 11, fontWeight: '700', color: T.ink, textAlign: 'center' },
// });

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
  TouchableOpacity,
  View,
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
const TAB_BAR_BOTTOM = 40; // matches the exact base file's hardcoded `bottom: 40`

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
  // orders: { eyebrow: 'MADHUSUDHAN FABRICS', title: 'Orders' },
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
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ready = hydrated && Boolean(appSession);

  const barBottomOffset = TAB_BAR_BOTTOM;
  const sceneBottomPadding = TAB_BAR_HEIGHT + barBottomOffset + 12;
  const onDashboard = pathname === '/new' || pathname === '/new/' || pathname.endsWith('/new/(tabs)') || pathname.endsWith('/new/(tabs)/');

  const activeRouteName = onDashboard
    ? 'index'
    : APP_NAVIGATION.map((item) => item.routeName).find(
      (routeName) => routeName !== 'index' && pathname.includes(routeName.replace(/\/index$/, '')),
    );
  const header = (activeRouteName && HEADER_CONTENT[activeRouteName]) || HEADER_CONTENT.index;

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
      if (item.routeName === 'orders') return false;
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

  const goTo = (routeName: string) => {
    setMoreOpen(false);
    const path = routeName === 'index' ? '' : routeName.replace(/\/index$/, '');
    router.push((path ? `/new/(tabs)/${path}` : '/new/(tabs)') as any);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: T.nav }}>
      <AppHeader eyebrow={header.eyebrow} title={header.title} subtitle={subtitle || undefined} right={right || undefined} />
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: {
              backgroundColor: 'rgba(255,255,255,0)',
              paddingBottom: sceneBottomPadding,
            },
          }}
          tabBar={(props) => (
            <GlassTabBar
              {...props}
              primaryItems={primaryItems}
              overflowItems={overflowItems}
              hasOverflow={hasOverflow}
              barBottom={TAB_BAR_BOTTOM}
              onMorePress={() => setMoreOpen(true)}
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
                  href: isPrimary ? undefined : null,
                }}
              />
            );
          })}
          <Tabs.Screen
            name="more"
            options={{
              title: 'More',
              href: hasOverflow ? undefined : null,
            }}
          />
        </Tabs>
      </View>

      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        <View style={moreStyles.shade}>
          <BlurView tint="dark" intensity={25} style={StyleSheet.absoluteFill} />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMoreOpen(false)} />
          <View style={moreStyles.sheet}>
            <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
            <View style={moreStyles.handle} />
            <View style={moreStyles.sheetHeader}>
              <Text style={moreStyles.sheetTitle}>More</Text>
              <TouchableOpacity onPress={() => setMoreOpen(false)}>
                <Text style={moreStyles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={moreStyles.scrollArea}
              contentContainerStyle={moreStyles.grid}
              showsVerticalScrollIndicator={true}
              bounces={overflowItems.length > 8}
            >
              {overflowItems.map((item) => (
                <TouchableOpacity key={item.routeName} style={moreStyles.cell} onPress={() => goTo(item.routeName)} activeOpacity={0.7}>
                  <View style={moreStyles.iconWrap}>
                    <Icon name={item.icon as any} size={22} color={T.copper} />
                  </View>
                  <Text style={moreStyles.label} numberOfLines={1}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  onMorePress: () => void;
};

function GlassTabBar({
  state,
  navigation,
  primaryItems,
  overflowItems,
  hasOverflow,
  barBottom,
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
    <View pointerEvents="box-none" style={[styles.barWrap, { bottom: barBottom }]}>
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

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    left: TAB_BAR_SIDE_MARGIN,
    right: TAB_BAR_SIDE_MARGIN,
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
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 10 },
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
  label: { fontSize: 11, fontWeight: '700', color: T.ink, textAlign: 'center' },
});