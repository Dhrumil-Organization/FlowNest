// ─────────────────────────────────────────────────────────────
// FILE: src/core/userPrefs/hiddenScreens.ts
//
// "My screens" — a personal show / hide list for the menu.
//
// A user may have rights to many screens but use only a few every day. In
// Settings they can switch off the ones they do not want to see. This is a
// comfort setting only:
//   - it never gives access to anything (the list only contains screens the
//     user's rights already allow), and
//   - it never takes access away (a hidden screen still opens from a
//     notification or a link; rights are checked exactly as before).
// Hidden screens are simply left out of the bottom bar, the More sheet and
// the desktop sidebar.
//
// Saved on this device, per user and per property:
//   AsyncStorage 'erp_hidden_screens_v1:<property>:<user id>' = ["route", …]
// Home ('index') can never be hidden.
// ─────────────────────────────────────────────────────────────
import AsyncStorage from '@/common/utils/compatibleStorage';
import { create } from 'zustand';

const KEY_PREFIX = 'erp_hidden_screens_v1';

export const ALWAYS_SHOWN_ROUTES: readonly string[] = ['index'];

export const hiddenScreensKey = (property: unknown, userId: unknown) =>
  `${KEY_PREFIX}:${String(property || 'default')}:${String(userId ?? 'anon')}`;

type HiddenScreensState = {
  /** Storage key of the user the list belongs to ('' until loaded). */
  ownerKey: string;
  loaded: boolean;
  /** routeName -> true when the user switched it off. */
  hidden: Record<string, true>;
  load: (ownerKey: string) => Promise<void>;
  setHidden: (routeName: string, hide: boolean) => void;
  showAll: () => void;
};

const persist = (ownerKey: string, hidden: Record<string, true>) => {
  if (!ownerKey) return;
  AsyncStorage.setItem(ownerKey, JSON.stringify(Object.keys(hidden))).catch((error: unknown) => {
    console.log('[my screens] could not save', error);
  });
};

export const useHiddenScreensStore = create<HiddenScreensState>((set, get) => ({
  ownerKey: '',
  loaded: false,
  hidden: {},

  load: async (ownerKey) => {
    if (!ownerKey || (get().ownerKey === ownerKey && get().loaded)) return;
    // another user / property: start clean so nothing leaks between accounts
    set({ ownerKey, loaded: false, hidden: {} });
    let hidden: Record<string, true> = {};
    try {
      const raw = await AsyncStorage.getItem(ownerKey);
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) {
        list.forEach((route) => {
          if (typeof route === 'string' && route && !ALWAYS_SHOWN_ROUTES.includes(route)) hidden[route] = true;
        });
      }
    } catch (error) {
      console.log('[my screens] could not read', error);
      hidden = {};
    }
    // ignore a late answer for a user that is no longer the current one
    if (get().ownerKey !== ownerKey) return;
    set({ hidden, loaded: true });
  },

  setHidden: (routeName, hide) => {
    if (!routeName || ALWAYS_SHOWN_ROUTES.includes(routeName)) return;
    const { ownerKey, hidden } = get();
    const next = { ...hidden };
    if (hide) next[routeName] = true;
    else delete next[routeName];
    set({ hidden: next });
    persist(ownerKey, next);
  },

  showAll: () => {
    const { ownerKey } = get();
    set({ hidden: {} });
    persist(ownerKey, {});
  },
}));

/** true when the user chose to hide this route from their menu. */
export const isRouteHidden = (hidden: Record<string, true>, routeName: string) =>
  !ALWAYS_SHOWN_ROUTES.includes(routeName) && hidden[routeName] === true;

/** Leaves out the routes the user switched off. */
export function withoutHidden<I extends { routeName: string }>(items: readonly I[], hidden: Record<string, true>): I[] {
  return items.filter((item) => !isRouteHidden(hidden, item.routeName));
}
