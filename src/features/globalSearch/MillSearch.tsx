// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/MillSearch.tsx
// MILL HUB Global Search — the search bar on top of the Mill Hub page.
//
//   • Index = ONLY the mill.* pages (millIndex.ts), never an ERP screen.
//   • Rights = the user's MILL HUB rights from Sudamo (MillSession), checked
//     with millCan — the same rights the Mill page itself uses for its menu.
//   • A result opens the page INSIDE the Mill Hub (frame.navigate(page)).
// ─────────────────────────────────────────────────────────────
import { flattenPermissionRegistry } from '@/src/registry';
import { MILL_RIGHTS, millCan, type MillSession } from '@/src/mill/millBridge';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { filterByRights } from './erpIndex';
import { FlowNestMark } from './FlowNestMark';
import { GlobalSearchModal } from './GlobalSearchModal';
import { MILL_HELP } from './helpContent';
import { buildMillIndex } from './millIndex';
import { prepareIndex } from './searchEngine';
import { recentKey, useGlobalSearchStore } from './store';
import type { SearchEntry } from './types';

const ACCENT = '#0f766e';

let cachedMill: SearchEntry[] | null = null;
export function getAllMillEntries(): SearchEntry[] {
  if (!cachedMill) {
    cachedMill = buildMillIndex({
      resources: flattenPermissionRegistry().filter((r) => /^mill(\.|$)/.test(r.resourcePath)),
      pageRights: MILL_RIGHTS,
      help: MILL_HELP,
    });
  }
  return cachedMill;
}

type Props = {
  session: MillSession | null;
  /** open a Mill page (key of MILL_RIGHTS) inside the Mill Hub page */
  onOpenPage: (page: string) => void;
  onRefresh: () => void;
  onMillOff: () => void;
};

export function MillSearchBar({ session, onOpenPage, onRefresh, onMillOff }: Props) {
  const open = useGlobalSearchStore((s) => s.open);
  const initialQuery = useGlobalSearchStore((s) => s.initialQuery);
  const openId = useGlobalSearchStore((s) => s.openId);
  const show = useGlobalSearchStore((s) => s.show);
  const hide = useGlobalSearchStore((s) => s.hide);
  const recents = useGlobalSearchStore((s) => s.recent);
  const loadRecent = useGlobalSearchStore((s) => s.loadRecent);
  const pushRecent = useGlobalSearchStore((s) => s.pushRecent);
  const userId = useAppSessionStore((s) => s.rawLoginResponse?.user?.id ?? s.user?.id ?? null);

  const unfiltered = getAllMillEntries();
  const index = useMemo(
    () =>
      prepareIndex(
        session
          ? filterByRights(unfiltered, {
              canAccess: (p) => millCan(session.permissions, p),
              canDo: (p, a) => millCan(session.permissions, p, a),
            })
          : [],
      ),
    [session, unfiltered],
  );

  const visible = open === 'mill';
  useEffect(() => {
    if (visible) void loadRecent(recentKey('mill', 'mill', userId));
  }, [visible, loadRecent, userId]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (useGlobalSearchStore.getState().open) hide();
        else show('mill');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, hide]);

  // leaving Mill mode never leaves the Mill search open over the ERP
  useEffect(() => () => {
    if (useGlobalSearchStore.getState().open === 'mill') useGlobalSearchStore.getState().hide();
  }, []);

  const onOpen = useCallback(
    (entry: SearchEntry) => {
      hide();
      if (entry.target.type !== 'mill') return;
      const page = entry.target.page;
      if (page === '__refresh') return onRefresh();
      if (page === '__mill_off') return onMillOff();
      pushRecent(entry.id);
      onOpenPage(page);
    },
    [hide, onMillOff, onOpenPage, onRefresh, pushRecent],
  );

  return (
    <>
      <View style={s.bar}>
        <TouchableOpacity onPress={() => show('mill')} style={s.pill} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Search Mill Hub">
          <FlowNestMark size={14} color="#5eead4" />
          <Text style={s.pillText} numberOfLines={1}>Search or speak — Mill Hub…</Text>
          <Icon name="mic" size={16} color="#99f6e4" />
          <Text style={s.hint}>{Platform.OS === 'web' ? 'Ctrl K' : '/help'}</Text>
        </TouchableOpacity>
      </View>
      <GlobalSearchModal
        key={openId}
        visible={visible}
        onClose={hide}
        index={index}
        unfiltered={unfiltered}
        recents={recents}
        contextLabel="Mill Hub"
        placeholder="Search Mill pages, entries…  or /help"
        accent={ACCENT}
        initialQuery={initialQuery}
        onOpen={onOpen}
      />
    </>
  );
}

const s = StyleSheet.create({
  bar: { backgroundColor: '#1e1b4b', paddingHorizontal: 10, paddingVertical: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: 'rgba(94,234,212,.35)',
    backgroundColor: 'rgba(255,255,255,.06)',
  },
  pillText: { flex: 1, color: '#c7d2fe', fontSize: 12.5, fontWeight: '600' },
  hint: { color: '#818cf8', fontSize: 10.5, fontWeight: '800' },
});
