// FILE: src/components/RollCutScanner/offline/RollCutOfflineBoot.tsx
// Invisible helper mounted ONCE for the whole app (app/new/_layout.tsx). It makes the Roll Cut Scanner
// work without network on every device (web, Android, iOS):
//
//   after login (and on every app start with a saved login)
//     1. loads the offline scan queue of this user from the device
//     2. uploads anything still waiting (sequentially, oldest first)
//     3. downloads Property list + Beam list of every property and keeps them on the device
//   network comes back / app returns to the foreground / every 20 s while something is waiting
//     -> same upload + refresh again, automatically, on whatever screen the user is.
//
// Users without the Roll Cut Scanner permission are skipped completely (no API call).
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useBusinessContext } from '@/src/core/business';
import { usePermission } from '@/src/core/permissions';
import { useErpSession } from '@/src/core/session/erpSession';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { loadMastersStatus, prefetchMasters } from './masters';
import { isOnline, probeServer, refreshNetwork, startNetworkWatch, useOnline } from './network';
import { initQueue, reloadQueue, syncIfNeeded, syncNow } from './queue';
import { makeScope } from './storage';

export const ROLL_CUT_RESOURCE = 'production.roll_cut_scanner';
const RETRY_EVERY = 20000;

/** prptype of the login: business context first, stored `user_prptype` as fallback (same rule as the screen). */
export function useRollCutPrptype() {
  const { prpGroup } = useBusinessContext();
  const [stored, setStored] = useState<string | null>(null);
  useEffect(() => {
    if (prpGroup) return;
    let alive = true;
    AsyncStorage.getItem('user_prptype')
      .then((v: string | null) => alive && setStored(String(v || '').trim()))
      .catch(() => alive && setStored(''));
    return () => {
      alive = false;
    };
  }, [prpGroup]);
  const prptype = String(prpGroup || stored || '').trim();
  return { prptype, prptypeMissing: (!!prpGroup || stored !== null) && !prptype };
}

/** Web only: keep the site itself (page + bundle + fonts) in the browser so it opens without network. */
function registerOfflineShell() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || process.env.NODE_ENV !== 'production') return;
  const sw: any = (window.navigator as any)?.serviceWorker;
  if (!sw?.register) return; // http (not https) or very old browser: the app still works, only cold-start offline is missing
  const sendFiles = () => {
    try {
      const urls = (performance.getEntriesByType('resource') as any[]).map((e) => e.name).filter((u) => String(u).startsWith(window.location.origin));
      sw.controller?.postMessage({ type: 'PRECACHE', urls });
    } catch {
      /* ignore */
    }
  };
  sw.register('/flownest-sw.js')
    .then(() => sw.ready)
    .then(() => setTimeout(sendFiles, 4000))
    .catch((e: any) => console.log('[offline shell] not registered', e?.message));
  sw.addEventListener?.('controllerchange', () => setTimeout(sendFiles, 1500));
}

export function RollCutOfflineBoot() {
  const { session } = useErpSession();
  const { canDo } = usePermission();
  const { prptype } = useRollCutPrptype();
  const online = useOnline();

  const token = session?.token || '';
  const API = session?.API || '';
  const username = session?.username || '';
  const allowed = !!token && !!API && canDo(ROLL_CUT_RESOURCE, 'view');

  useEffect(() => {
    startNetworkWatch();
    registerOfflineShell();
  }, []);

  // login / property switch / network back -> queue first (user data), then the selections
  useEffect(() => {
    if (!allowed) return;
    const scope = makeScope(API, username);
    let alive = true;
    (async () => {
      await initQueue(scope);
      if (!alive) return;
      if (prptype) await loadMastersStatus(scope, prptype);
      if (!alive || !online) return;
      await syncNow({ API, token });
      if (alive && prptype) void prefetchMasters({ API, token, prptype, scope });
    })().catch((e) => console.log('[Roll Cut] offline boot', e?.message));
    return () => {
      alive = false;
    };
  }, [allowed, API, token, username, prptype, online]);

  // keep trying in the background: reconnect detection + pending uploads
  useEffect(() => {
    if (!allowed) return;
    const tick = async () => {
      if (!isOnline()) {
        await refreshNetwork();
        await probeServer(API); // flips the flag -> the effect above uploads + refreshes
      } else {
        syncIfNeeded({ API, token });
      }
    };
    const timer = setInterval(() => void tick(), RETRY_EVERY);
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') void tick();
    });
    // web: another tab changed the queue -> show it here too
    const onStorage = (e: any) => {
      if (String(e?.key || '').startsWith('rollcut_queue_v1:')) void reloadQueue();
    };
    const web = Platform.OS === 'web' && typeof window !== 'undefined';
    if (web) window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(timer);
      app.remove();
      if (web) window.removeEventListener('storage', onStorage);
    };
  }, [allowed, API, token]);

  return null;
}
