// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/store.ts
// Open / close state, the ERP navigator, and "recent" picks.
//
// Recents are saved on this device per MODE (erp / mill), per PROPERTY
// (sudamo_knits / rayons) and per USER, so Sudamo, Rayons and Mill Hub never
// mix:  AsyncStorage 'erp_global_search_recent_v1:<mode>:<property>:<user>'
// ─────────────────────────────────────────────────────────────
import AsyncStorage from '@/common/utils/compatibleStorage';
import { create } from 'zustand';

const KEY = 'erp_global_search_recent_v1';
const MAX_RECENT = 12;

export const recentKey = (mode: 'erp' | 'mill', property: unknown, userId: unknown) =>
  `${KEY}:${mode}:${String(property || 'default')}:${String(userId ?? 'anon')}`;

type State = {
  /** which search is open ('' = none) */
  open: '' | 'erp' | 'mill';
  initialQuery: string;
  show: (which: 'erp' | 'mill', query?: string) => void;
  hide: () => void;

  /** ERP tabs layout registers its own "open this tab" (fresh screen, closes More). */
  navigate: ((route: string) => void) | null;
  setNavigator: (fn: ((route: string) => void) | null) => void;

  recentOwner: string;
  recent: string[];
  loadRecent: (owner: string) => Promise<void>;
  pushRecent: (id: string) => void;
};

export const useGlobalSearchStore = create<State>((set, get) => ({
  open: '',
  initialQuery: '',
  show: (which, query = '') => set({ open: which, initialQuery: query }),
  hide: () => set({ open: '', initialQuery: '' }),

  navigate: null,
  setNavigator: (fn) => set({ navigate: fn }),

  recentOwner: '',
  recent: [],
  loadRecent: async (owner) => {
    if (!owner || get().recentOwner === owner) return;
    set({ recentOwner: owner, recent: [] });
    try {
      const raw = await AsyncStorage.getItem(owner);
      const list = raw ? JSON.parse(raw) : [];
      if (get().recentOwner === owner && Array.isArray(list)) {
        set({ recent: list.filter((x: unknown) => typeof x === 'string').slice(0, MAX_RECENT) });
      }
    } catch {
      /* keep empty */
    }
  },
  pushRecent: (id) => {
    const owner = get().recentOwner;
    const next = [id, ...get().recent.filter((x) => x !== id)].slice(0, MAX_RECENT);
    set({ recent: next });
    if (owner) AsyncStorage.setItem(owner, JSON.stringify(next)).catch(() => undefined);
  },
}));
