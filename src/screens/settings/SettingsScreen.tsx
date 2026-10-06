// ─────────────────────────────────────────────────────────────
// FILE: src/screens/settings/SettingsScreen.tsx
// Route: app/new/settings.tsx (opened from the header gear, the desktop
// sidebar and the Profile screen). Every signed-in user can open it — it is
// a personal settings page, there is no right to grant for it.
//
//   APPEARANCE   Light / Dark / System. Saved on this device.
//   MY SCREENS   The screens this user's rights allow (the same list the menu
//                is built from), each with a switch. Off = left out of the
//                bottom bar, the More sheet and the sidebar for THIS user on
//                THIS device. Rights are not changed in either direction:
//                nothing extra appears here, and a hidden screen still opens
//                from a notification or a link. Home is always shown.
//
// No server call: both settings live in AsyncStorage
//   'erp_theme_mode' and 'erp_hidden_screens_v1:<property>:<user id>'.
// ─────────────────────────────────────────────────────────────
import { SubScreenHeader } from '@/src/components/layout/SubScreenHeader';
import { DARK } from '@/src/core/theme/themeColors';
import { ThemeModePicker } from '@/src/core/theme/ThemeControls';
import { useTheme } from '@/src/core/theme/themeMode';
import { isThemeRuntimeInstalled } from '@/src/core/theme/themeRuntime';
import { ALWAYS_SHOWN_ROUTES, isRouteHidden } from '@/src/core/userPrefs/hiddenScreens';
import { useMyScreens } from '@/src/core/userPrefs/useMyScreens';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** How many screens sit directly on the phone's bottom bar (see MAX_PRIMARY_TABS in the tabs layout). */
const BOTTOM_BAR_COUNT = 3;

export function SettingsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const cols = width >= 1180 ? 3 : width >= 700 ? 2 : 1;
  const { scheme } = useTheme();
  const { allowedItems, shownItems, hidden, prefsReady, setHidden, showAll } = useMyScreens();
  const [query, setQuery] = useState('');

  const hiddenCount = allowedItems.length - shownItems.length;
  const hideable = allowedItems.filter((item) => !ALWAYS_SHOWN_ROUTES.includes(item.routeName));
  // keep at least one screen besides Home, so the menu can never end up empty
  const lastShown = hideable.filter((item) => !isRouteHidden(hidden, item.routeName)).length <= 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allowedItems;
    return allowedItems.filter((item) => `${item.title} ${item.routeName}`.toLowerCase().includes(q));
  }, [allowedItems, query]);

  const barRoutes = useMemo(() => new Set(shownItems.slice(0, BOTTOM_BAR_COUNT).map((i) => i.routeName)), [shownItems]);

  return (
    <SafeAreaView style={st.safe} edges={['bottom']}>
      <SubScreenHeader backLabel="Back" title="Settings" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[st.scroll, { paddingHorizontal: isWide ? 28 : 14 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={st.page}>
          {/* ───────── Appearance ───────── */}
          <View style={st.card}>
            <View style={st.cardHead}>
              <View style={st.headIcon}>
                <Icon name="palette" size={18} color={T.copper} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.cardTitle}>Appearance</Text>
                <Text style={st.cardSub}>Choose how the ERP looks on this device. Now showing: {scheme === 'dark' ? 'Dark' : 'Light'}.</Text>
              </View>
            </View>
            <ThemeModePicker />
            {!isThemeRuntimeInstalled() ? (
              <Text style={st.note}>Dark theme is not available on this build — the app stays on the light theme.</Text>
            ) : (
              <Text style={st.note}>Changing the theme redraws the open screens, so an unsaved form on another screen starts fresh.</Text>
            )}
          </View>

          {/* ───────── My screens ───────── */}
          <View style={st.card}>
            <View style={st.cardHead}>
              <View style={st.headIcon}>
                <Icon name="apps" size={18} color={T.copper} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.cardTitle}>My screens</Text>
                <Text style={st.cardSub}>
                  Switch off the screens you do not use and they leave your menu. This is only your view on this device — your rights stay the same.
                </Text>
              </View>
            </View>

            <View style={st.toolbar}>
              <View style={st.search}>
                <Icon name="search" size={18} color={T.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search screens"
                  placeholderTextColor={T.muted}
                  style={st.searchInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  accessibilityLabel="Search screens"
                />
                {query ? (
                  <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                    <Icon name="cancel" size={17} color={T.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={showAll}
                disabled={hiddenCount === 0}
                style={[st.showAll, hiddenCount === 0 && { opacity: 0.45 }]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Show all screens"
              >
                <Icon name="visibility" size={16} color={T.copper} />
                <Text style={st.showAllText}>Show all</Text>
              </TouchableOpacity>
            </View>

            <Text style={st.count}>
              {shownItems.length} of {allowedItems.length} shown{hiddenCount > 0 ? `  ·  ${hiddenCount} hidden` : ''}
            </Text>

            {!prefsReady && allowedItems.length === 0 ? (
              <Text style={st.empty}>Loading your screens…</Text>
            ) : filtered.length === 0 ? (
              <Text style={st.empty}>No screen matches “{query}”.</Text>
            ) : (
              <View style={st.grid}>
                {filtered.map((item) => {
                  const locked = ALWAYS_SHOWN_ROUTES.includes(item.routeName);
                  const off = isRouteHidden(hidden, item.routeName);
                  const blockOff = !off && !locked && lastShown;
                  const disabled = locked || blockOff;
                  return (
                    <View key={item.routeName} style={[st.cell, { width: `${100 / cols}%` as any }]}>
                      <TouchableOpacity
                        style={[st.row, off && st.rowOff]}
                        activeOpacity={0.85}
                        disabled={disabled}
                        onPress={() => setHidden(item.routeName, !off)}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: !off, disabled }}
                        accessibilityLabel={`${item.title}, ${off ? 'hidden' : 'shown'}`}
                      >
                        <View style={[st.rowIcon, off && { backgroundColor: T.alt }]}>
                          <Icon name={item.icon as any} size={18} color={off ? T.muted : T.copper} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[st.rowTitle, off && { color: T.muted }]} numberOfLines={1}>{item.title}</Text>
                          <Text style={st.rowSub} numberOfLines={1}>
                            {locked
                              ? 'Always shown'
                              : off
                                ? 'Hidden from your menu'
                                : blockOff
                                  ? 'Keep at least one screen'
                                  : barRoutes.has(item.routeName)
                                    ? 'On the bottom bar'
                                    : 'In your menu'}
                          </Text>
                        </View>
                        {locked ? (
                          <Icon name="lock-outline" size={18} color={T.muted} />
                        ) : (
                          // the whole row is the button; the switch only shows the state
                          <View pointerEvents="none">
                            <Switch
                              value={!off}
                              disabled={disabled}
                              trackColor={{ false: scheme === 'dark' ? DARK.border : T.border, true: T.copper }}
                              thumbColor="#FFFFFF"
                              {...(Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as any) : null)}
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingTop: 14, paddingBottom: 36 },
  page: { width: '100%', maxWidth: 1200, alignSelf: 'center', gap: 14 },
  card: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16, gap: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.copper}16` },
  cardTitle: { fontSize: 16, fontWeight: '800', color: T.nav },
  cardSub: { fontSize: 12.5, lineHeight: 18, fontWeight: '500', color: T.muted, marginTop: 2 },
  note: { fontSize: 11.5, lineHeight: 17, fontWeight: '500', color: T.muted },

  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  search: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.sub,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    fontSize: 14,
    color: T.ink,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  showAll: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${T.copper}55`,
    backgroundColor: `${T.copper}12`,
  },
  showAllText: { fontSize: 13, fontWeight: '800', color: T.copper },
  count: { fontSize: 11.5, fontWeight: '800', color: T.nav, letterSpacing: 0.5, textTransform: 'uppercase' },
  empty: { textAlign: 'center', paddingVertical: 28, fontSize: 13.5, fontWeight: '600', color: T.muted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  cell: { padding: 4 },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  rowOff: { backgroundColor: T.sub },
  rowIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.copper}14` },
  rowTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  rowSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },
});
