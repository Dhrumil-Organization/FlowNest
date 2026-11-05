// ─────────────────────────────────────────────────────────────
// FILE: src/core/navigation/components/MoreMenuNav.tsx
//
// The "More" menu for PHONES (put it inside the existing More bottom sheet).
//
//   level 1  plain screens + folders  ("Yarn Dyeing  ›  3")
//   level 2  tap a folder -> its screens, with a Back button
//
// Why drill-in and not an accordion: on a phone an open accordion pushes the
// rest of the list off-screen. Drill-in keeps every row big, one thumb-tap
// away, and the Android hardware Back button closes the folder first.
// Searching shows matching screens directly (a folder name is shown as a
// "Folder › Screen" hint), so nothing is hidden behind a tap.
// ─────────────────────────────────────────────────────────────
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { filterNavTree, findActiveGroupKey, isRouteActive, type NavGroupNode, type NavTreeEntry } from '../navTree';
import type { AppNavigationItem } from '../navigationRegistry';
import { CountChip, NavIcon } from './NavParts';

type Props = {
  tree: readonly NavTreeEntry[];
  activeRoute?: string | null;
  onNavigate: (routeName: string) => void;
  /** called after a screen is chosen, so the host sheet can close */
  onClose?: () => void;
  showSearch?: boolean;
};

export function MoreMenuNav({ tree, activeRoute, onNavigate, onClose, showSearch = true }: Props) {
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;

  const group = useMemo<NavGroupNode | null>(() => {
    const hit = groupKey ? tree.find((e) => e.type === 'group' && e.key === groupKey) : null;
    return hit && hit.type === 'group' ? hit : null;
  }, [tree, groupKey]);

  // if rights change and the folder disappears, fall back to level 1
  useEffect(() => {
    if (groupKey && !group) setGroupKey(null);
  }, [groupKey, group]);

  // hardware Back (Android): close the folder first, then the sheet
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (groupKey) {
        setGroupKey(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [groupKey]);

  const go = useCallback(
    (routeName: string) => {
      onNavigate(routeName);
      setQuery('');
      setGroupKey(null);
      onClose?.();
    },
    [onNavigate, onClose],
  );

  const activeGroup = useMemo(() => findActiveGroupKey(tree, activeRoute), [tree, activeRoute]);
  const results = useMemo(() => filterNavTree(tree, query), [tree, query]);

  const searchBox = showSearch ? (
    <View style={styles.search}>
      <NavIcon name="search" size={20} color={T.muted} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search modules"
        placeholderTextColor={T.muted}
        style={styles.searchInput}
        accessibilityLabel="Search modules"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {searching ? (
        <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={12}>
          <NavIcon name="close" size={20} color={T.muted} />
        </Pressable>
      ) : null}
    </View>
  ) : null;

  // ── level 2: inside a folder ──
  if (group && !searching) {
    return (
      <View style={styles.wrap}>
        <Pressable onPress={() => setGroupKey(null)} accessibilityRole="button" accessibilityLabel="Back to all modules" style={styles.back}>
          <NavIcon name="arrow-back" size={22} color={T.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.backTitle}>{group.group.title}</Text>
            {group.group.subtitle ? <Text style={styles.sub}>{group.group.subtitle}</Text> : null}
          </View>
        </Pressable>
        <ScrollView contentContainerStyle={styles.list}>
          {group.children.map((child) => (
            <ScreenRow key={child.routeName} item={child} active={isRouteActive(activeRoute, child.routeName)} onPress={go} />
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── level 1: everything (or search results) ──
  return (
    <View style={styles.wrap}>
      {searchBox}
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {results.length === 0 ? <Text style={styles.empty}>No module matches “{query.trim()}”.</Text> : null}
        {results.map((entry) => {
          if (entry.type === 'item') {
            return <ScreenRow key={entry.key} item={entry.item} active={isRouteActive(activeRoute, entry.item.routeName)} onPress={go} />;
          }
          if (searching) {
            // matching screens shown directly, tagged with their folder
            return entry.children.map((child) => (
              <ScreenRow
                key={child.routeName}
                item={child}
                hint={entry.group.title}
                active={isRouteActive(activeRoute, child.routeName)}
                onPress={go}
              />
            ));
          }
          const holdsActive = entry.key === activeGroup;
          return (
            <Pressable
              key={entry.key}
              onPress={() => setGroupKey(entry.key)}
              accessibilityRole="button"
              accessibilityLabel={`${entry.group.title}, ${entry.children.length} screens`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.tile, holdsActive && styles.tileActive]}>
                <NavIcon name={entry.group.icon} size={22} color={holdsActive ? '#FFFFFF' : T.copper} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.title}>{entry.group.title}</Text>
                {entry.group.subtitle ? <Text numberOfLines={1} style={styles.sub}>{entry.group.subtitle}</Text> : null}
              </View>
              <CountChip count={entry.children.length} color={T.ink} bg={T.alt} />
              <NavIcon name="chevron-right" size={22} color={T.muted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ScreenRow({
  item,
  active,
  hint,
  onPress,
}: {
  item: AppNavigationItem;
  active: boolean;
  hint?: string;
  onPress: (routeName: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(item.routeName)}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.pressed]}
    >
      <View style={[styles.tile, active && styles.tileActive]}>
        <NavIcon name={item.icon} size={22} color={active ? '#FFFFFF' : T.copper} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
        {hint ? <Text numberOfLines={1} style={styles.sub}>{hint}</Text> : null}
      </View>
      {active ? <NavIcon name="check" size={20} color={T.copper} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 4 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginVertical: 10,
    paddingHorizontal: 14, height: 48, borderRadius: 12, backgroundColor: T.alt,
  },
  searchInput: { flex: 1, fontSize: 16, color: T.ink, paddingVertical: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  rowActive: { backgroundColor: T.alt },
  pressed: { opacity: 0.7 },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, borderWidth: 1, borderColor: T.hair },
  tileActive: { backgroundColor: T.copper, borderColor: T.copper },
  title: { fontSize: 16, fontWeight: '600', color: T.ink },
  sub: { fontSize: 12, color: T.muted, marginTop: 1 },
  empty: { textAlign: 'center', color: T.muted, fontSize: 14, padding: 32 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: T.hair, marginBottom: 8 },
  backTitle: { fontSize: 18, fontWeight: '800', color: T.ink },
});
