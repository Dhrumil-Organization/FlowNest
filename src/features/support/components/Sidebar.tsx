// FILE: src/features/support/components/Sidebar.tsx
// IT Desk navigation, screen-wise:
//   wide (≥ 1100)   a sidebar with labels and sections (can be folded to a rail)
//   tablet          a slim icon rail with small labels
//   phone           a bottom bar
// Chat shows the number of unread messages; Activity is only for the IT admin.
import Icon from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../../../../src/theme';
import { useLayout } from './ui';

export type Section = 'board' | 'list' | 'history' | 'team' | 'chat' | 'notes' | 'activity' | 'settings' | 'storage' | 'server';
export type NavItem = { key: Section; label: string; short: string; icon: string; group: 'Work' | 'Team' | 'Admin'; badge?: number };

export function navItems(admin: boolean, unread: number): NavItem[] {
  return [
    { key: 'board', label: 'Board', short: 'Board', icon: 'view-kanban', group: 'Work' },
    { key: 'list', label: 'List', short: 'List', icon: 'view-list', group: 'Work' },
    { key: 'history', label: 'History', short: 'History', icon: 'history', group: 'Work' },
    { key: 'team', label: admin ? 'Team report' : 'My report', short: admin ? 'Team' : 'Report', icon: 'groups', group: 'Team' },
    { key: 'chat', label: 'Chat', short: 'Chat', icon: 'forum', group: 'Team', badge: unread },
    { key: 'notes', label: 'Notes', short: 'Notes', icon: 'sticky-note-2', group: 'Team' },
    ...(admin ? [
      { key: 'activity' as Section, label: 'Activity', short: 'Activity', icon: 'insights', group: 'Admin' as const },
      { key: 'server' as Section, label: 'Server', short: 'Server', icon: 'dns', group: 'Admin' as const },
      { key: 'storage' as Section, label: 'Storage', short: 'Storage', icon: 'sd-storage', group: 'Admin' as const },
      { key: 'settings' as Section, label: 'Settings', short: 'Settings', icon: 'tune', group: 'Admin' as const },
    ] : []),
  ];
}

const Badge = ({ n, small }: { n?: number; small?: boolean }) =>
  n ? <View style={[s.badge, small && s.badgeSmall]}><Text style={s.badgeText}>{n > 99 ? '99+' : n}</Text></View> : null;

export function Sidebar({ items, value, onChange, folded, onFold }: { items: NavItem[]; value: Section; onChange: (s: Section) => void; folded: boolean; onFold: () => void }) {
  const { wide, phone } = useLayout();
  if (phone) return null;
  const rail = !wide || folded;
  let lastGroup = '';
  return (
    <View style={[s.side, rail ? s.rail : s.full]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 2 }} showsVerticalScrollIndicator={false}>
      {items.map((it) => {
        const on = it.key === value;
        const head = !rail && it.group !== lastGroup ? it.group : '';
        lastGroup = it.group;
        return (
          <View key={it.key}>
            {head ? <Text style={s.group}>{head.toUpperCase()}</Text> : null}
            <Pressable onPress={() => onChange(it.key)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={it.label}
              style={({ hovered, pressed }: any) => [rail ? s.itemRail : s.item, on && s.itemOn, !on && (hovered || pressed) && s.itemHover]}>
              <View>
                <Icon name={it.icon as any} size={rail ? 22 : 19} color={on ? '#fff' : '#B9C7D4'} />
                {rail ? <View style={s.railBadge}><Badge n={it.badge} small /></View> : null}
              </View>
              {rail ? <Text style={[s.railLabel, on && { color: '#fff' }]} numberOfLines={1}>{it.short}</Text> : (
                <>
                  <Text style={[s.label, on && { color: '#fff' }]} numberOfLines={1}>{it.label}</Text>
                  <Badge n={it.badge} />
                </>
              )}
            </Pressable>
          </View>
        );
      })}
      </ScrollView>
      {wide ? (
        <TouchableOpacity onPress={onFold} style={rail ? s.itemRail : s.item} accessibilityLabel={folded ? 'Open the menu' : 'Fold the menu'}>
          <Icon name={folded ? 'keyboard-double-arrow-right' : 'keyboard-double-arrow-left'} size={20} color="#8EA6BA" />
          {!rail ? <Text style={[s.label, { color: '#8EA6BA' }]}>Fold menu</Text> : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function BottomNav({ items, value, onChange }: { items: NavItem[]; value: Section; onChange: (s: Section) => void }) {
  const { phone } = useLayout();
  const insets = useSafeAreaInsets();
  const [more, setMore] = useState(false);
  if (!phone) return null;
  // phones: 4 tabs + "More" when there are many sections (IT admin)
  const many = items.length > 5;
  // the most used sections stay one tap away; the rest go under "More"
  const PRIORITY: Section[] = ['board', 'chat', 'list', 'notes'];
  const main = many ? PRIORITY.map((k) => items.find((x) => x.key === k)).filter(Boolean) as NavItem[] : items;
  const rest = many ? items.filter((x) => !main.includes(x)) : [];
  const restOn = rest.some((x) => x.key === value);
  const restBadge = rest.reduce((n, x) => n + (x.badge || 0), 0);
  return (
    <View>
      {more ? (
        <View style={[s.moreSheet, { bottom: 64 + insets.bottom }]}>
          {rest.map((it) => (
            <TouchableOpacity key={it.key} onPress={() => { setMore(false); onChange(it.key); }} style={[s.moreItem, it.key === value && { backgroundColor: `${T.copper}22` }]} accessibilityRole="button" accessibilityLabel={it.label}>
              <Icon name={it.icon as any} size={20} color={it.key === value ? T.copper : '#C9D6E2'} />
              <Text style={[s.label, { flex: 1 }]}>{it.label}</Text>
              <Badge n={it.badge} small />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    <View style={[s.bottom, { paddingBottom: 6 + insets.bottom }]}>
      {main.map((it) => {
        const on = it.key === value;
        return (
          <TouchableOpacity key={it.key} onPress={() => onChange(it.key)} style={s.tab} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={it.label}>
            <View style={[s.tabIcon, on && { backgroundColor: `${T.copper}22` }]}>
              <Icon name={it.icon as any} size={21} color={on ? T.copper : '#8EA6BA'} />
              <View style={s.railBadge}><Badge n={it.badge} small /></View>
            </View>
            <Text style={[s.tabLabel, on && { color: '#fff' }]} numberOfLines={1}>{it.short}</Text>
          </TouchableOpacity>
        );
      })}
      {many ? (
        <TouchableOpacity onPress={() => setMore((x) => !x)} style={s.tab} accessibilityRole="button" accessibilityLabel="More sections">
          <View style={[s.tabIcon, (restOn || more) && { backgroundColor: `${T.copper}22` }]}>
            <Icon name={more ? 'close' : 'menu'} size={21} color={restOn || more ? T.copper : '#8EA6BA'} />
            <View style={s.railBadge}><Badge n={restBadge} small /></View>
          </View>
          <Text style={[s.tabLabel, restOn && { color: '#fff' }]} numberOfLines={1}>{restOn ? rest.find((x) => x.key === value)?.short : 'More'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
    </View>
  );
}

const s = StyleSheet.create({
  moreSheet: { position: 'absolute', right: 8, left: 8, backgroundColor: T.nav, borderRadius: 14, padding: 6, gap: 2, zIndex: 50, elevation: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  moreItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 46, paddingHorizontal: 12, borderRadius: 10 },
  side: { backgroundColor: T.nav, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.08)', paddingVertical: 10, gap: 2 },
  full: { width: 214, paddingHorizontal: 10 },
  rail: { width: 72, paddingHorizontal: 6, alignItems: 'stretch' },
  group: { fontSize: 9.5, fontWeight: '900', color: '#6F8AA2', letterSpacing: 1.3, marginTop: 12, marginBottom: 4, paddingHorizontal: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 11, height: 40, paddingHorizontal: 10, borderRadius: 10 },
  itemRail: { alignItems: 'center', justifyContent: 'center', gap: 3, height: 58, borderRadius: 12 },
  itemOn: { backgroundColor: T.copper },
  itemHover: { backgroundColor: 'rgba(255,255,255,0.06)' },
  label: { flex: 1, color: '#C9D6E2', fontSize: 13.5, fontWeight: '800' },
  railLabel: { color: '#9FB0BF', fontSize: 10, fontWeight: '800' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#E5484D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeSmall: { minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10.5, fontWeight: '900' },
  railBadge: { position: 'absolute', top: -7, right: -12 },
  bottom: { flexDirection: 'row', backgroundColor: T.nav, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 6, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { color: '#8EA6BA', fontSize: 10.5, fontWeight: '800' },
});
