// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/GlobalSearch.tsx
// ERP Global Search: the header button + the search window.
//
//   • Shown in the ONE AppHeader of the ERP (every tab screen has it).
//   • Web / desktop: Ctrl + K (⌘ K) or "/" anywhere opens it.
//   • Finds ONLY what the logged-in user may open in the CURRENT property
//     (Sudamo / Knits or Rayons). Mill Hub is never in here — Mill mode has
//     its own search (src/mill/MillShell.tsx).
// ─────────────────────────────────────────────────────────────
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useId } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlowNestMark } from './FlowNestMark';
import { GlobalSearchModal } from './GlobalSearchModal';
import { recentKey, useGlobalSearchStore } from './store';
import type { SearchEntry } from './types';
import { useErpSearchIndex } from './useErpSearchIndex';

type Props = {
  /** 'icon' on phones, 'pill' (with the Ctrl K hint) on tablet / desktop */
  variant?: 'icon' | 'pill';
  size?: number;
};

/** Several headers may be mounted at once; only the newest one owns the window + keys. */
const owners: string[] = [];
let ownerListeners: Array<() => void> = [];
const notifyOwners = () => ownerListeners.forEach((f) => f());
function useIsOwner(id: string) {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    owners.push(id);
    ownerListeners.push(force);
    notifyOwners();
    return () => {
      const i = owners.lastIndexOf(id);
      if (i >= 0) owners.splice(i, 1);
      ownerListeners = ownerListeners.filter((f) => f !== force);
      notifyOwners();
    };
  }, [id]);
  return owners[owners.length - 1] === id;
}

export function toTabsHref(route: string): string {
  if (route.startsWith('/')) return route;
  const path = route === 'index' ? '' : route.replace(/\/index$/, '');
  return path ? `/new/(tabs)/${path}` : '/new/(tabs)';
}

export function GlobalSearch({ variant = 'icon', size = 36 }: Props) {
  const id = useId();
  const isOwner = useIsOwner(id);
  const router = useRouter();
  const open = useGlobalSearchStore((s) => s.open);
  const initialQuery = useGlobalSearchStore((s) => s.initialQuery);
  const openId = useGlobalSearchStore((s) => s.openId);
  const show = useGlobalSearchStore((s) => s.show);
  const hide = useGlobalSearchStore((s) => s.hide);
  const recents = useGlobalSearchStore((s) => s.recent);
  const loadRecent = useGlobalSearchStore((s) => s.loadRecent);
  const pushRecent = useGlobalSearchStore((s) => s.pushRecent);
  const navigate = useGlobalSearchStore((s) => s.navigate);

  const { ready, index, unfiltered, propertyLabel, ownerKey } = useErpSearchIndex();
  const visible = isOwner && open === 'erp' && ready;

  useEffect(() => {
    if (visible) void loadRecent(recentKey('erp', ownerKey.property, ownerKey.userId));
  }, [visible, loadRecent, ownerKey.property, ownerKey.userId]);

  // Ctrl/⌘ + K, or "/" when not typing in a field (web)
  useEffect(() => {
    if (!isOwner || Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (useGlobalSearchStore.getState().open) hide();
        else show('erp');
      } else if (e.key === '/' && !typing && !useGlobalSearchStore.getState().open) {
        e.preventDefault();
        show('erp');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOwner, show, hide]);

  const onOpen = useCallback(
    (entry: SearchEntry) => {
      pushRecent(entry.id);
      hide();
      if (entry.target.type !== 'route') return;
      const route = entry.target.route;
      // tab routes go through the tabs layout (fresh screen, More sheet closed)
      if (!route.startsWith('/') && navigate) navigate(route);
      else router.push(toTabsHref(route) as any);
    },
    [hide, navigate, pushRecent, router],
  );

  const wide = variant === 'pill';
  return (
    <>
      <TouchableOpacity
        onPress={() => show('erp')}
        style={wide ? [s.pill, { height: size }] : [s.iconBtn, { width: size, height: size }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Search screens"
      >
        {/* the FlowNest mark, gently alive, with a small magnifier = "search" */}
        <View style={s.markWrap}>
          <FlowNestMark size={wide ? 15 : 16} color="#2DD4BF" />
          <View style={s.badge}>
            <Icon name="search" size={10} color="#0D1B2A" />
          </View>
        </View>
        {wide ? (
          <>
            <Text style={s.pillText} numberOfLines={1}>Search or speak…</Text>
            {Platform.OS === 'web' ? (
              <View style={s.kbd}>
                <Text style={s.kbdText}>Ctrl K</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </TouchableOpacity>

      {isOwner ? (
        <GlobalSearchModal
          key={openId}
          visible={visible}
          onClose={hide}
          index={index}
          unfiltered={unfiltered}
          recents={recents}
          contextLabel={propertyLabel}
          accent={T.copper}
          initialQuery={initialQuery}
          onOpen={onOpen}
        />
      ) : null}
    </>
  );
}

const s = StyleSheet.create({
  iconBtn: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#2A4055',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 170,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A4055',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  markWrap: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -2, bottom: -1, width: 14, height: 14, borderRadius: 7, backgroundColor: '#E5EEF5', alignItems: 'center', justifyContent: 'center' },
  pillText: { flex: 1, color: '#9FB0BF', fontSize: 12.5, fontWeight: '600' },
  kbd: { borderWidth: 1, borderColor: '#3A5068', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  kbdText: { color: '#9FB0BF', fontSize: 10, fontWeight: '700' },
});
