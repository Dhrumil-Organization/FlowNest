// ─────────────────────────────────────────────────────────────
// FILE: src/mill/MillShell.tsx
// MILL MODE — the whole app while the header "Mills" switch is ON.
//
//  1. NO Mills login: it is the same Sudamo user. Sudamo gives his Mill Hub rights
//     (/api/mill/session/status) and fetches the data from the Mills server.
//  2. Rights = his MILL HUB rights (saved on Sudamo, given to his Mills user /
//     Mills roles in Permission Manager → Mills). Not the Sudamo ERP rights.
//  3. The Process House ERP page runs inside with LIVE Mills data only:
//     anything Mills could not give is shown EMPTY with the reason — never the
//     artifact's sample numbers.
// ─────────────────────────────────────────────────────────────
import AppAlert from '@/common/utils/appAlert';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MILL_ACTION_RIGHTS, MILL_LOGIN_REQUIRED, MILL_RIGHTS, MillApi, MillMovementApi, MillSessionApi, buildMillHtml, millCan, millRightsReason } from './millBridge';
import { MillHubFrame, type MillHubFrameHandle, type MillPageMessage } from './MillHubFrame';
import { useMillModeStore } from './millMode';

const NAV = '#1e1b4b';

function displayName(u: any): string {
  if (!u) return 'User';
  const full = `${String(u.first_name || '').trim()} ${String(u.last_name || '').trim()}`.trim();
  return full || String(u.name || u.username || 'User').trim();
}

type Phase = 'session' | 'login' | 'error' | 'norights' | 'loading' | 'ready';

export function MillShell() {
  const router = useRouter();
  const logout = useAppSessionStore((s) => s.logout);
  const sessionUser = useAppSessionStore((s) => s.user);
  const rawLoginResponse = useAppSessionStore((s) => s.rawLoginResponse);
  const millSession = useMillModeStore((s) => s.session);
  const setMillSession = useMillModeStore((s) => s.setSession);
  const loginError = useMillModeStore((s) => s.loginError);
  const turnOff = useMillModeStore((s) => s.turnOff);
  const reset = useMillModeStore((s) => s.reset);

  const [phase, setPhase] = useState<Phase>(millSession ? 'loading' : loginError ? 'login' : 'session');
  const [loginMsg, setLoginMsg] = useState(loginError || '');
  const [boot, setBoot] = useState<{ data: Record<string, any>; today?: string; live: boolean; offline: boolean; note: string } | null>(null);
  const [nonce, setNonce] = useState(0);
  const frameRef = useRef<MillHubFrameHandle>(null);

  // ── 1. Mills login (same user) ──
  useEffect(() => {
    if (millSession) return;
    if (loginError) { setLoginMsg(loginError); setPhase('login'); return; } // switch ON already failed → ask
    let alive = true;
    void (async () => {
      const r = await MillSessionApi.ensure();
      if (!alive) return;
      if (r.session) {
        setMillSession(r.session);
      } else {
        // no password box any more — show why, with Try again
        setLoginMsg(r.message || 'Could not read the Mill rights from Sudamo.');
        setPhase('error');
      }
    })();
    return () => { alive = false; };
  }, [millSession, setMillSession, loginError]);

  // ── 2. Mill Hub rights of the Mills user ──
  const rights = useMemo(() => {
    const r: Record<string, boolean> = {};
    for (const [k, path] of Object.entries(MILL_RIGHTS)) r[k] = millCan(millSession?.permissions, path);
    for (const [k, [path, action]] of Object.entries(MILL_ACTION_RIGHTS)) r[k] = millCan(millSession?.permissions, path, action);
    return r;
  }, [millSession]);
  const anyScreen = ['dash', 'inward', 'movement', 'lots', 'machines', 'lab', 'recipe', 'dispatch', 'expense', 'coal_offers', 'steam_entry', 'elec_entry', 'elec_meters', 'reports'].some((k) => rights[k]);

  const user = useMemo(() => {
    const mu: any = millSession?.millUser;
    return { name: displayName(mu), role: mu?.is_superadmin ? 'Super Admin' : 'Sudamo user' };
  }, [millSession]);

  // ── 3. live data ──
  const load = useCallback(async () => {
    setPhase('loading');
    const res = await MillApi.bootstrap();
    if (!res.success && (res.code === MILL_LOGIN_REQUIRED || res.code === 'MILL_BRIDGE_CONFIG')) {
      setLoginMsg(res.message || 'Mills data is not available right now.');
      setPhase('error');
      return;
    }
    const d: any = res.data || {};
    const datasets = d && typeof d === 'object' && d.datasets && typeof d.datasets === 'object' ? d.datasets : {};
    const errs: string[] = Array.isArray(d?.errors) ? d.errors : [];
    setBoot({
      data: datasets,
      today: d?.today,
      live: res.success && res.live,
      offline: !res.success,
      note: res.success ? `${d?.database || 'Mills'}${errs.length ? ' · ' + errs.join(' | ') : ''}` : res.message,
    });
    if (__DEV__ && (errs.length || !res.success)) console.log('[MillHub] bootstrap', res.message, errs);
    setNonce((n) => n + 1);
    setPhase('ready');
  }, []);

  useEffect(() => {
    if (!millSession) return;
    if (!anyScreen) { setPhase('norights'); return; }
    void load();
  }, [millSession, anyScreen, load]);

  const html = useMemo(
    () => (boot && phase === 'ready' ? buildMillHtml({ user, rights, ...boot }) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boot, user, rights, nonce, phase],
  );

  const exitMill = useCallback(async () => {
    try {
      await turnOff();
    } finally {
      router.replace('/new/(tabs)' as any);
    }
  }, [router, turnOff]);


  const onMessage = useCallback(
    (m: MillPageMessage) => {
      if (m.type === 'mill_off') {
        void exitMill();
      } else if (m.type === 'refresh') {
        void (async () => {
          // rights may have been changed by the admin → reload them too
          const r = await MillSessionApi.ensure();
          if (r.session) setMillSession(r.session); // → reloads the data (effect above)
          else await load();
        })();
      } else if (m.type === 'api') {
        // Movement Register uses the Sudamo DyeingMillHubController directly:
        // its endpoints enforce mill.movement_register on the server.
        if (m.action === 'movement/report' || m.action === 'movement/lot') {
          const request = m.action === 'movement/report'
            ? MillMovementApi.report(m.body as any)
            : MillMovementApi.lot(m.body as any);
          void request.then((r) => frameRef.current?.reply(m.id, r));
          return;
        }
        // the page asks for data → apig → Sudamo (checks the Mill right) → Mills
        const allowed = ['expense/summary', 'expense/ledger', 'expense/issues', 'reports/summary', 'reports/party', 'discover', 'schema', 'lots', 'inward', 'machines', 'dispatch', 'lab', 'ping',
          'expense/coal', 'expense/coal/split/save', 'expense/coal/steam', 'expense/coal/steam/save', 'expense/coal/steam/delete',
          'expense/coal/offers', 'expense/coal/offers/save', 'expense/coal/offers/delete', 'expense/coal/constraints/save', 'expense/coal/suppliers/save',
          'expense/dyeing', 'expense/chemicals', 'expense/electricity', 'expense/electricity/save', 'expense/electricity/meters/save',
          'expense/electricity/daily-entry', 'expense/electricity/daily-entry/save',
          'expense/electricity/meters', 'expense/electricity/meters/save-scoped'];
        if (!allowed.includes(m.action)) {
          frameRef.current?.reply(m.id, { success: false, message: 'Not allowed: ' + m.action });
          return;
        }
        void MillApi.call(m.action, m.body || {}).then((r) => frameRef.current?.reply(m.id, r));
      } else if (m.type === 'share') {
        if (Platform.OS === 'web') {
          try { void (navigator as any).clipboard?.writeText(m.text); AppAlert.alert('Mill Hub', 'Copied. Paste it in the chat.'); } catch { /* ignore */ }
        } else {
          void Share.share({ message: m.text });
        }
      } else if (m.type === 'toast') {
        AppAlert.alert('Mill Hub', m.text);
      } else if (m.type === 'logout') {
        AppAlert.alert('Sign out?', 'This will clear the mobile session on this device.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign out',
            style: 'destructive',
            onPress: async () => {
              try { await MillSessionApi.logout(); } catch { /* ignore */ }
              await reset();
              await logout();
              router.replace('/new' as any);
            },
          },
        ]);
      }
    },
    [exitMill, load, logout, reset, router, setMillSession],
  );

  if (phase === 'error' || phase === 'login') {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={NAV} />
        <View style={s.center}>
          <Text style={s.small}>MADHUSUDHAN PROCESS HOUSE</Text>
          <Text style={s.title}>Mill Hub not available</Text>
          <Text style={s.sub}>{loginMsg}</Text>
          <TouchableOpacity
            style={[s.btn, s.btnSolid]}
            onPress={() => {
              setPhase('session');
              void MillSessionApi.status().then((r) => {
                if (r.session) setMillSession(r.session);
                else { setLoginMsg(r.message || 'Could not read the Mill rights from Sudamo.'); setPhase('error'); }
              });
            }}
          >
            <Text style={[s.btnText, { color: NAV }]}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={() => void exitMill()}>
            <Text style={s.btnText}>Back to ERP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'norights') {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={NAV} />
        <View style={s.center}>
          <Text style={s.brand}>MADHUSUDHAN</Text>
          <Text style={s.title}>No Mill Hub rights</Text>
          <Text style={s.sub}>
            {millRightsReason(millSession)}
          </Text>
          <TouchableOpacity
            style={[s.btn, s.btnSolid]}
            onPress={() => {
              // rights changed in Permission Manager → read them again (no app restart needed)
              void MillSessionApi.status().then((r) => { if (r.session) setMillSession(r.session); });
            }}
          >
            <Text style={[s.btnText, { color: NAV }]}>Check again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={() => void exitMill()}>
            <Text style={s.btnText}>Back to ERP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={NAV} />
      {phase !== 'ready' || !html ? (
        <View style={s.center}>
          <Text style={s.small}>MADHUSUDHAN PROCESS HOUSE</Text>
          <Text style={s.title}>Dye & Finish ERP</Text>
          <Text style={s.sub}>{phase === 'session' ? 'Logging in to Mills…' : 'Loading Mills data…'}</Text>
          <ActivityIndicator color="#5eead4" style={{ marginTop: 14 }} />
        </View>
      ) : (
        <>
          {millSession?.underDevelopment ? (
            <View style={s.devBar} accessibilityRole="text">
              <Text style={s.devText} numberOfLines={2}>
                🚧 UNDER DEVELOPMENT — Mill Hub screens and figures are still being built and checked. Please do not rely on them yet.
              </Text>
            </View>
          ) : null}
          <MillHubFrame ref={frameRef} key={nonce} html={html} onMessage={onMessage} />
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAV },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: NAV },
  small: { fontSize: 10, letterSpacing: 1.4, color: '#818cf8', fontWeight: '700' },
  brand: { fontSize: 20, color: '#fff', letterSpacing: 0.5, fontWeight: '700' },
  title: { fontSize: 16, color: '#fff', fontWeight: '700', marginTop: 6 },
  sub: { fontSize: 12.5, color: '#c7d2fe', marginTop: 8, textAlign: 'center', maxWidth: 340 },
  input: { width: '100%', maxWidth: 320, marginTop: 12, borderWidth: 1, borderColor: '#4338ca', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', backgroundColor: 'rgba(255,255,255,.06)' },
  btn: { marginTop: 14, borderWidth: 1, borderColor: '#818cf8', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 9, minWidth: 180, alignItems: 'center' },
  btnSolid: { backgroundColor: '#5eead4', borderColor: '#5eead4' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // "Under development" strip — shown on every Mill page while that right is ON
  devBar: { backgroundColor: '#f59e0b', paddingHorizontal: 14, paddingVertical: 7, alignItems: 'center' },
  devText: { color: '#1e1b4b', fontSize: 12, fontWeight: '800', textAlign: 'center', letterSpacing: 0.2 },
});
