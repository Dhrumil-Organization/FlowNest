// ─────────────────────────────────────────────────────────────
// FILE: src/core/session/erpSession.tsx
//
// ONE common way for every NEW ERP screen (production folder today, any new
// screen tomorrow) to get the correct TOKEN + API host for the property the
// user is logged into:
//
//   sudamo_knits (Sudamo / Knits) -> https://apig.tms-webapp.com
//   rayons                        -> https://apiy.tms-webapp.com
//
// Why this exists
// ---------------
// Every production wrapper used to read `access_token` / `selected_property`
// ONCE on mount (and some started with API = 'User' / token = '' so the first
// request went out with wrong values). After a property switch from the
// header, or login -> property select, screens that were already mounted kept
// the old token / old host until a full refresh.
//
// This module:
//   1. Loads token + property from storage and SYNCS the shared API host
//      (common/API/dynamicAPI.ts) BEFORE the screen renders, so the first
//      API call is already correct (mobile + web, with or without refresh).
//   2. Re-loads whenever the property/host changes, a new login happens
//      (AppSessionStore.sessionEpoch), or the screen gets focus again.
//   3. Remounts the wrapped screen (fresh state) when the session token
//      changes (new login / property switch), so no stale data from the other property stays on screen.
//
// Usage for a NEW production screen (recommended):
//
//   export const MyNewScreen = withErpSession(MyNewComponent);
//   // MyNewComponent receives: token, username, API, property, deviceId,
//   // isConnected (true) — plus any props you pass to MyNewScreen.
//
// or, when you need custom props:
//
//   export function MyNewScreen() {
//     return (
//       <ErpSessionGate>
//         {(s) => <MyNewComponent token={s.token} API={s.API} username={s.username} />}
//       </ErpSessionGate>
//     );
//   }
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@/common/utils/compatibleStorage';
import { NavigationContext } from '@react-navigation/native';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  normalizeErpProperty,
  setDynamicApiBaseUrl,
  subscribeErpContext,
  type ErpProperty,
} from '../../../common/API/dynamicAPI';
import { useAppSessionStore } from '../../stores/AppSessionStore';

export type ErpSession = {
  /** Bearer token for the currently selected property. */
  token: string;
  /** Display username (same value the old wrappers passed: user_details || 'User'). */
  username: string;
  /** 'sudamo_knits' | 'rayons' */
  property: ErpProperty;
  /** API host for the property: apig (sudamo/knits) or apiy (rayons). */
  API: string;
  /** cache_deviceId (used by SnapView). */
  deviceId: string;
  /**
   * Remount key. Changes when the token changes (every login / property
   * switch issues a new token). Property alone is NOT part of the key so a
   * screen is not remounted in the half-second between "host switched" and
   * "new token saved" during a header switch (that would fire requests with
   * the old token against the new host).
   */
  sessionKey: string;
};

/**
 * Reads the session from storage and makes sure the shared API host used by
 * every `import { API } from '.../common/API/dynamicAPI'` points at the
 * selected property. Safe to call anytime.
 */
export async function loadErpSession(): Promise<ErpSession> {
  const [storedToken, storedUser, storedProperty, storedDeviceId] = await Promise.all([
    AsyncStorage.getItem('access_token'),
    AsyncStorage.getItem('user_details'),
    AsyncStorage.getItem('selected_property'),
    AsyncStorage.getItem('cache_deviceId'),
  ]);

  const property = normalizeErpProperty(storedProperty);
  // Sync the ONE shared host (legacy + NEW) before the screen fires requests.
  const api = setDynamicApiBaseUrl(property);
  const token = storedToken || '';

  return {
    token,
    username: storedUser || 'User',
    property,
    API: api,
    deviceId: storedDeviceId || '',
    sessionKey: token || `no-token|${property}`,
  };
}

function sameSession(a: ErpSession | null, b: ErpSession) {
  return (
    !!a &&
    a.sessionKey === b.sessionKey &&
    a.API === b.API &&
    a.username === b.username &&
    a.deviceId === b.deviceId
  );
}

/**
 * Hook: always-current ERP session (token + API + property).
 * `session` is null until the first load finished — do not call APIs before.
 */
export function useErpSession(): { session: ErpSession | null; reload: () => Promise<void> } {
  const [session, setSession] = useState<ErpSession | null>(null);
  const mountedRef = useRef(true);
  const loadSeq = useRef(0);
  const sessionEpoch = useAppSessionStore((state) => state.sessionEpoch);
  // Optional: works inside or outside a navigator.
  const navigation = useContext(NavigationContext);

  const reload = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const next = await loadErpSession();
      if (!mountedRef.current || seq !== loadSeq.current) return;
      setSession((prev) => (sameSession(prev, next) ? prev : next));
    } catch (e) {
      console.log('useErpSession: failed to load session', e);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial load + every new login / in-app property switch.
  useEffect(() => {
    void reload();
  }, [reload, sessionEpoch]);

  // Header property switch / legacy initAPI / embedded login.
  useEffect(() => subscribeErpContext(() => void reload()), [reload]);

  // Coming back to the screen: re-check (token may have been refreshed).
  useEffect(() => {
    if (!navigation) return undefined;
    return navigation.addListener('focus', () => void reload());
  }, [navigation, reload]);

  return { session, reload };
}

type GateProps = {
  children: (session: ErpSession) => React.ReactNode;
  /** Remount children when property/token changes (default true). */
  remountOnChange?: boolean;
  /** Rendered until the session is loaded. */
  fallback?: React.ReactNode;
};

/**
 * Renders children ONLY after the correct token + API host are known, and
 * remounts them fresh whenever property or token changes.
 */
export function ErpSessionGate({ children, remountOnChange = true, fallback }: GateProps) {
  const { session } = useErpSession();

  if (!session) {
    return (
      <>
        {fallback ?? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" />
          </View>
        )}
      </>
    );
  }

  return (
    <React.Fragment key={remountOnChange ? session.sessionKey : 'erp-session'}>
      {children(session)}
    </React.Fragment>
  );
}

/** Props injected by withErpSession. */
export type ErpSessionInjectedProps = {
  token: string;
  username: string;
  API: string;
  property: ErpProperty;
  deviceId: string;
  isConnected: boolean;
};

/**
 * HOC for production screens: `export const X = withErpSession(Component)`.
 * Component receives token / username / API / property / deviceId /
 * isConnected. Extra props passed to X are forwarded (and win over defaults).
 */
export function withErpSession<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string,
) {
  function WithErpSession(props: Omit<P, keyof ErpSessionInjectedProps> & Partial<ErpSessionInjectedProps>) {
    return (
      <ErpSessionGate>
        {(s) => {
          const injected: ErpSessionInjectedProps = {
            token: s.token,
            username: s.username,
            API: s.API,
            property: s.property,
            deviceId: s.deviceId,
            isConnected: true,
          };
          return <Component {...(injected as any)} {...(props as any)} />;
        }}
      </ErpSessionGate>
    );
  }
  WithErpSession.displayName =
    displayName || `withErpSession(${Component.displayName || Component.name || 'Screen'})`;
  return WithErpSession;
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
});
