// ─────────────────────────────────────────────────────────────
// FILE: src/mill/MillShell.tsx
// MILL MODE — the whole app while the header "Mills" switch is ON.
//
//  1. The same Sudamo user is logged into the MILLS server (through Sudamo,
//     /api/mill/session/*) — silently with the saved login; if that is not
//     possible a small password box is shown (Mill colours).
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
import { ActivityIndicator, Platform, Share, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MILL_LOGIN_REQUIRED, MILL_RIGHTS, MillApi, MillSessionApi, buildMillHtml, millCan, millRightsReason } from './millBridge';
import { MillHubFrame, type MillHubFrameHandle, type MillPageMessage } from './MillHubFrame';
import { useMillModeStore } from './millMode';

const NAV = '#1e1b4b';

function displayName(u: any): string {
  if (!u) return 'User';
  const full = `${String(u.first_name || '').trim()} ${String(u.last_name || '').trim()}`.trim();
  return full || String(u.name || u.username || 'User').trim();
}

type Phase = 'session' | 'login' | 'norights' | 'loading' | 'ready';

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
  const [loginName, setLoginName] = useState(() => String(((rawLoginResponse as any)?.user || sessionUser)?.name || ''));
  const [loginPass, setLoginPass] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
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
        setLoginMsg(r.message || 'Please log in to Mills.');
        setPhase('login');
      }
    })();
    return () => { alive = false; };
  }, [millSession, setMillSession, loginError]);

  // ── 2. Mill Hub rights of the Mills user ──
  const rights = useMemo(() => {
    const r: Record<string, boolean> = {};
    for (const [k, path] of Object.entries(MILL_RIGHTS)) r[k] = millCan(millSession?.permissions, path);
    return r;
  }, [millSession]);
  const anyScreen = ['dash', 'inward', 'lots', 'machines', 'lab', 'recipe', 'dispatch', 'expense', 'reports'].some((k) => rights[k]);

  const user = useMemo(() => {
    const mu: any = millSession?.millUser;
    return { name: displayName(mu), role: mu?.is_superadmin ? 'Mills · Super Admin' : 'Mills user' };
  }, [millSession]);

  // ── 3. live data ──
  const load = useCallback(async () => {
    setPhase('loading');
    const res = await MillApi.bootstrap();
    if (!res.success && res.code === MILL_LOGIN_REQUIRED) {
      // saved login no longer works on Mills (password changed …) → ask for it
      setLoginMsg('Mills login expired or the password changed. Enter your Mills user name and password.');
      setPhase('login');
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

  const doLogin = useCallback(async () => {
    if (!loginName.trim() || !loginPass.trim()) { setLoginMsg('Enter user name and password.'); return; }
    setLoggingIn(true);
    const r = await MillSessionApi.login(loginName, loginPass);
    setLoggingIn(false);
    if (r.session) { setLoginPass(''); setMillSession(r.session); }
    else setLoginMsg(r.message || 'Mills login failed.');
  }, [loginName, loginPass, setMillSession]);

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
        // the page asks for data → apig → Sudamo (checks the Mill right) → Mills
        const allowed = ['expense/summary', 'expense/ledger', 'expense/issues', 'reports/summary', 'reports/party', 'discover', 'schema', 'lots', 'inward', 'machines', 'dispatch', 'lab', 'ping'];
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

  if (phase === 'login') {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={NAV} />
        <View style={s.center}>
          <Text style={s.small}>MADHUSUDHAN PROCESS HOUSE</Text>
          <Text style={s.title}>Mills login</Text>
          <Text style={s.sub}>{loginMsg}</Text>
          <TextInput style={s.input} value={loginName} onChangeText={setLoginName} placeholder="User name" placeholderTextColor="#818cf8" autoCapitalize="none" autoCorrect={false} />
          <TextInput style={s.input} value={loginPass} onChangeText={setLoginPass} placeholder="Password" placeholderTextColor="#818cf8" secureTextEntry autoCapitalize="none" onSubmitEditing={() => void doLogin()} />
          <TouchableOpacity style={[s.btn, s.btnSolid]} disabled={loggingIn} onPress={() => void doLogin()}>
            {loggingIn ? <ActivityIndicator color={NAV} /> : <Text style={[s.btnText, { color: NAV }]}>Log in to Mills</Text>}
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
        <MillHubFrame ref={frameRef} key={nonce} html={html} onMessage={onMessage} />
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
});
