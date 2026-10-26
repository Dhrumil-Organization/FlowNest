// ─────────────────────────────────────────────────────────────
// FILE: src/core/userPrefs/useMyScreens.ts
//
// ONE definition of "the screens this user sees in the menu", shared by the
// tab bar / More sheet / sidebar (app/new/(tabs)/_layout.tsx), the first
// screen after login (app/new/(tabs)/index.tsx) and Settings > My screens.
//
//   allowedItems : every menu screen the user's RIGHTS allow, in registry
//                  order, without duplicates (unchanged rule — this is the
//                  list the menu showed before "My screens" existed)
//   shownItems   : allowedItems minus the ones the user switched off
// ─────────────────────────────────────────────────────────────
import { getCurrentErpProperty } from '@/common/API/dynamicAPI';
import { APP_NAVIGATION, AppNavigationItem } from '@/src/core/navigation/navigationRegistry';
import { usePermission } from '@/src/core/permissions';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { useEffect, useMemo } from 'react';
import { hiddenScreensKey, useHiddenScreensStore, withoutHidden } from './hiddenScreens';

export function useMyScreens() {
  const { canAccess, canDo } = usePermission();
  const hydrated = useAppSessionStore((state) => state.hydrated);
  const appSession = useAppSessionStore((state) => state.appSession);
  const sessionUser = useAppSessionStore((state) => state.user);
  const rawLoginResponse = useAppSessionStore((state) => state.rawLoginResponse);
  const ready = hydrated && Boolean(appSession);

  const userId = rawLoginResponse?.user?.id ?? sessionUser?.id ?? null;
  const property = rawLoginResponse?.__erp_property || getCurrentErpProperty() || 'default';
  const ownerKey = ready && userId !== null && userId !== undefined ? hiddenScreensKey(property, userId) : '';

  const hidden = useHiddenScreensStore((state) => state.hidden);
  const loadedKey = useHiddenScreensStore((state) => state.ownerKey);
  const loaded = useHiddenScreensStore((state) => state.loaded);
  const load = useHiddenScreensStore((state) => state.load);
  const setHidden = useHiddenScreensStore((state) => state.setHidden);
  const showAll = useHiddenScreensStore((state) => state.showAll);

  useEffect(() => {
    if (ownerKey) void load(ownerKey);
  }, [ownerKey, load]);

  // Permission-visible items, in registry order, deduped by routeName.
  const allowedItems = useMemo<AppNavigationItem[]>(() => {
    const filtered = APP_NAVIGATION.filter((item) => {
      if (!ready) return false;
      return item.action && item.action !== 'view' ? canDo(item.resource, item.action) : canAccess(item.resource);
    });
    const seen = new Set<string>();
    return filtered.filter((item) => {
      if (seen.has(item.routeName)) return false;
      seen.add(item.routeName);
      return true;
    });
  }, [ready, canAccess, canDo]);

  // The saved list belongs to this user only once it has been loaded for them.
  const mine = ownerKey !== '' && loadedKey === ownerKey && loaded;
  const activeHidden = useMemo(() => (mine ? hidden : {}), [mine, hidden]);

  const shownItems = useMemo(() => withoutHidden(allowedItems, activeHidden), [allowedItems, activeHidden]);

  return { ready, allowedItems, shownItems, hidden: activeHidden, prefsReady: mine, setHidden, showAll };
}
