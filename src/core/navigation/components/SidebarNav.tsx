// ─────────────────────────────────────────────────────────────
// FILE: src/core/navigation/components/SidebarNav.tsx
//
// The side menu for TABLET and DESKTOP / WEB.
//
//   mode="full"  (desktop)  search + accordion folders. The folder that holds
//                           the open screen opens by itself; what the user
//                           opened / closed is remembered on this device.
//   mode="rail"  (tablet)   icons only. A folder shows its screens in a small
//                           fly-out next to the icon (tap outside to close).
//
// It draws what it is given: `tree` comes from useMyScreens().navTree, which
// is already filtered by the user's rights and "My screens". Navigation is
// done by the parent through `onNavigate(routeName)`, so this file does not
// depend on how the app's router is set up.
// ─────────────────────────────────────────────────────────────
import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { filterNavTree, findActiveGroupKey, isRouteActive, type NavGroupNode, type NavTreeEntry } from '../navTree';
import type { AppNavigationItem } from '../navigationRegistry';
import { CountChip, NAV_DARK, NavIcon } from './NavParts';

export const RAIL_WIDTH = 72;
export const SIDEBAR_WIDTH = 264;

type Props = {
  tree: readonly NavTreeEntry[];
  activeRoute?: string | null;
  onNavigate: (routeName: string) => void;
  mode?: 'full' | 'rail';
  showSearch?: boolean;
  /** touch device: bigger rows */
  coarse?: boolean;
  storageKey?: string;
};

export function SidebarNav({
  tree,
  activeRoute,
  onNavigate,
  mode = 'full',
  showSearch = true,
  coarse = false,
  storageKey = 'erp_nav_open_groups_v1',
}: Props) {
  const rowH = coarse ? 48 : 40;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [fly, setFly] = useState<{ group: NavGroupNode; x: number; y: number } | null>(null);
  const rowRefs = useRef<Record<string, View | null>>({});
  const { height: winH } = useWindowDimensions();

  const activeGroup = useMemo(() => findActiveGroupKey(tree, activeRoute), [tree, activeRoute]);
  const searching = query.trim().length > 0;
  const visible = useMemo(() => filterNavTree(tree, query), [tree, query]);

  // restore which folders were open (never overrides the one that must be open now)
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(storageKey)
      .then((raw: string | null) => {
        if (!alive || !raw) return;
        const list = JSON.parse(raw);
        if (Array.isArray(list)) setOpen((prev) => ({ ...Object.fromEntries(list.map((k: string) => [k, true])), ...prev }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [storageKey]);

  // opening a screen (from a link, notification, search …) opens its folder
  useEffect(() => {
    if (activeGroup) setOpen((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }));
  }, [activeGroup]);

  const toggle = useCallback(
    (key: string) => {
      setOpen((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        AsyncStorage.setItem(storageKey, JSON.stringify(Object.keys(next).filter((k) => next[k]))).catch(() => {});
        return next;
      });
    },
    [storageKey],
  );

  const go = useCallback(
    (routeName: string) => {
      setFly(null);
      setQuery('');
      onNavigate(routeName);
    },
    [onNavigate],
  );

  const openFlyout = (group: NavGroupNode) => {
    const node = rowRefs.current[group.key];
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, w) => setFly({ group, x: x + w + 8, y }));
    } else {
      setFly({ group, x: RAIL_WIDTH + 8, y: 80 });
    }
  };

  // ───────────────────────── RAIL (tablet) ─────────────────────────
  if (mode === 'rail') {
    return (
      <View style={[styles.rail, { width: RAIL_WIDTH }]}>
        <ScrollView contentContainerStyle={styles.railList} showsVerticalScrollIndicator={false}>
          {tree.map((entry) => {
            if (entry.type === 'item') {
              const active = isRouteActive(activeRoute, entry.item.routeName);
              return (
                <Pressable
                  key={entry.key}
                  onPress={() => go(entry.item.routeName)}
                  accessibilityRole="link"
                  accessibilityLabel={entry.item.title}
                  accessibilityState={{ selected: active }}
                  style={(s: any) => [styles.railBtn, active && styles.railBtnActive, s.hovered && !active && styles.hover]}
                >
                  <NavIcon name={entry.item.icon} size={22} color={active ? '#FFFFFF' : NAV_DARK.muted} />
                  <Text numberOfLines={1} style={[styles.railLabel, active && { color: '#FFFFFF' }]}>
                    {entry.item.title}
                  </Text>
                </Pressable>
              );
            }
            const holdsActive = entry.key === activeGroup;
            return (
              <Pressable
                key={entry.key}
                ref={(r) => {
                  rowRefs.current[entry.key] = r as unknown as View | null;
                }}
                onPress={() => openFlyout(entry)}
                accessibilityRole="button"
                accessibilityLabel={`${entry.group.title}, ${entry.children.length} screens`}
                accessibilityState={{ expanded: fly?.group.key === entry.key, selected: holdsActive }}
                style={(s: any) => [styles.railBtn, holdsActive && styles.railBtnActive, s.hovered && !holdsActive && styles.hover]}
              >
                <NavIcon name={entry.group.icon} size={22} color={holdsActive ? '#FFFFFF' : NAV_DARK.muted} />
                <Text numberOfLines={1} style={[styles.railLabel, holdsActive && { color: '#FFFFFF' }]}>
                  {entry.group.title}
                </Text>
                <View style={styles.railDot} />
              </Pressable>
            );
          })}
        </ScrollView>

        <Modal transparent visible={!!fly} animationType="fade" onRequestClose={() => setFly(null)}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFly(null)} accessibilityLabel="Close menu" />
          {fly ? (
            <View
              style={[
                styles.flyout,
                { left: fly.x, top: Math.max(8, Math.min(fly.y, winH - (60 + fly.group.children.length * 48) - 8)) },
              ]}
            >
              <Text style={styles.flyTitle}>{fly.group.group.title}</Text>
              {fly.group.children.map((child) => (
                <ChildRow key={child.routeName} item={child} active={isRouteActive(activeRoute, child.routeName)} height={48} onPress={go} light />
              ))}
            </View>
          ) : null}
        </Modal>
      </View>
    );
  }

  // ───────────────────────── FULL (desktop / web) ─────────────────────────
  return (
    <View style={[styles.full, { width: '100%' }]}>
      {showSearch ? (
        <View style={styles.searchBox}>
          <NavIcon name="search" size={18} color={NAV_DARK.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search modules"
            placeholderTextColor={NAV_DARK.muted}
            style={styles.searchInput}
            accessibilityLabel="Search modules"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searching ? (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={8}>
              <NavIcon name="close" size={18} color={NAV_DARK.muted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
        {visible.length === 0 ? <Text style={styles.empty}>No module matches “{query.trim()}”.</Text> : null}
        {visible.map((entry) => {
          if (entry.type === 'item') {
            const active = isRouteActive(activeRoute, entry.item.routeName);
            return (
              <Pressable
                key={entry.key}
                onPress={() => go(entry.item.routeName)}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                style={(s: any) => [styles.row, { minHeight: rowH }, active && styles.rowActive, s.hovered && !active && styles.hover]}
              >
                {active ? <View style={styles.bar} /> : null}
                <NavIcon name={entry.item.icon} color={active ? '#FFFFFF' : NAV_DARK.muted} />
                <Text numberOfLines={1} style={[styles.rowText, active && styles.rowTextActive]}>
                  {entry.item.title}
                </Text>
              </Pressable>
            );
          }

          const expanded = searching || !!open[entry.key];
          const holdsActive = entry.key === activeGroup;
          return (
            <View key={entry.key}>
              <Pressable
                onPress={() => toggle(entry.key)}
                accessibilityRole="button"
                accessibilityLabel={`${entry.group.title}, ${entry.children.length} screens`}
                accessibilityState={{ expanded }}
                style={(s: any) => [styles.row, { minHeight: rowH }, s.hovered && styles.hover]}
              >
                <NavIcon name={entry.group.icon} color={holdsActive ? T.copper : NAV_DARK.muted} />
                <Text numberOfLines={1} style={[styles.rowText, { fontWeight: '700' }, holdsActive && { color: '#FFFFFF' }]}>
                  {entry.group.title}
                </Text>
                {holdsActive && !expanded ? <View style={styles.dot} /> : null}
                <CountChip count={entry.children.length} color={NAV_DARK.text} bg={NAV_DARK.line} />
                <NavIcon name={expanded ? 'expand-less' : 'expand-more'} size={20} color={NAV_DARK.muted} />
              </Pressable>
              {expanded ? (
                <View style={styles.children}>
                  {entry.children.map((child) => (
                    <ChildRow
                      key={child.routeName}
                      item={child}
                      active={isRouteActive(activeRoute, child.routeName)}
                      height={rowH}
                      onPress={go}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ChildRow({
  item,
  active,
  height,
  onPress,
  light = false,
}: {
  item: AppNavigationItem;
  active: boolean;
  height: number;
  onPress: (routeName: string) => void;
  /** fly-out card is light (T.surface); the sidebar is dark */
  light?: boolean;
}) {
  const ink = light ? T.ink : active ? '#FFFFFF' : NAV_DARK.text;
  const sub = light ? T.muted : NAV_DARK.muted;
  return (
    <Pressable
      onPress={() => onPress(item.routeName)}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      style={(s: any) => [
        styles.child,
        { minHeight: height },
        active && (light ? styles.childActiveLight : styles.rowActive),
        s.hovered && !active && (light ? styles.hoverLight : styles.hover),
      ]}
    >
      <NavIcon name={item.icon} size={18} color={active && light ? T.copper : sub} />
      <Text numberOfLines={1} style={[styles.rowText, { color: ink }, active && { fontWeight: '700' }]}>
        {item.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: NAV_DARK.bg },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginVertical: 10,
    paddingHorizontal: 12, height: 40, borderRadius: 10, borderWidth: 1, borderColor: NAV_DARK.line,
  },
  searchInput: { flex: 1, color: NAV_DARK.text, fontSize: 14, paddingVertical: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null) },
  empty: { color: NAV_DARK.muted, fontSize: 13, textAlign: 'center', padding: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 8, paddingHorizontal: 10, borderRadius: 10 },
  rowActive: { backgroundColor: NAV_DARK.active },
  rowText: { flex: 1, color: NAV_DARK.text, fontSize: 14, fontWeight: '600' },
  rowTextActive: { color: '#FFFFFF', fontWeight: '700' },
  hover: { backgroundColor: NAV_DARK.hover },
  hoverLight: { backgroundColor: T.alt },
  bar: { position: 'absolute', left: -8, top: 8, bottom: 8, width: 3, borderRadius: 2, backgroundColor: T.copper },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.copper },
  children: { marginLeft: 26, paddingLeft: 6, borderLeftWidth: 1, borderLeftColor: NAV_DARK.line },
  child: { flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 8, paddingHorizontal: 10, borderRadius: 10 },
  childActiveLight: { backgroundColor: T.alt },
  rail: { backgroundColor: NAV_DARK.bg, borderRightWidth: 1, borderRightColor: NAV_DARK.line },
  railList: { alignItems: 'center', paddingVertical: 10, gap: 4 },
  railBtn: { width: 62, minHeight: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 6 },
  railBtnActive: { backgroundColor: NAV_DARK.active },
  railLabel: { fontSize: 10, fontWeight: '600', color: NAV_DARK.muted, maxWidth: 58 },
  railDot: { position: 'absolute', top: 8, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: T.copper },
  flyout: {
    position: 'absolute', width: 248, padding: 8, borderRadius: 14, backgroundColor: T.surface,
    borderWidth: 1, borderColor: T.border, shadowColor: '#0D1B2A', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  flyTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: T.muted, textTransform: 'uppercase', paddingHorizontal: 10, paddingVertical: 8 },
});
