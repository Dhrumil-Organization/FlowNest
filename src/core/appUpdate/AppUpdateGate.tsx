// FILE: src/core/appUpdate/AppUpdateGate.tsx
// Mounted ONCE in app/_layout.tsx (covers Legacy ERP, NEW ERP, login, embed).
//   WEB     : floating banner "New update available — Refresh" when a new build is deployed.
//   ANDROID : popup with "Update now" -> Play Store (blocking when below minVersion).
//   iOS     : popup with "Update now" -> App Store  (blocking when below minVersion).
import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { checkStoreUpdate, openStore, StoreUpdateResult } from './storeUpdate';
import { getInstalledVersion } from './version';
import { checkWebUpdate, cleanReloadParam, reloadToLatest, WebVersionInfo } from './webUpdate';

const isWeb = Platform.OS === 'web';

const WEB_POLL_MS = 5 * 60 * 1000; // every 5 min while the tab is open
const WEB_FOCUS_THROTTLE_MS = 60 * 1000; // and when the tab comes back (max once a minute)
const NATIVE_THROTTLE_MS = 30 * 60 * 1000; // app foreground: max once per 30 min
const LATER_SNOOZE_MS = 12 * 60 * 60 * 1000; // "Later" hides an optional update for 12 h

/* ============================== WEB ============================== */

function WebUpdateBanner() {
  const [info, setInfo] = useState<WebVersionInfo | null>(null);
  const [hiddenFor, setHiddenFor] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const lastCheck = useRef(0);

  const run = useCallback(async () => {
    lastCheck.current = Date.now();
    const next = await checkWebUpdate();
    if (next) setInfo(next);
  }, []);

  useEffect(() => {
    cleanReloadParam();
    const first = setTimeout(run, 4000);
    const poll = setInterval(run, WEB_POLL_MS);
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheck.current > WEB_FOCUS_THROTTLE_MS) void run();
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    if (typeof window !== 'undefined') window.addEventListener('focus', onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
      if (typeof window !== 'undefined') window.removeEventListener('focus', onVisible);
    };
  }, [run]);

  const key = info ? `${info.version}|${info.buildId}` : '';
  if (!info || hiddenFor === key) return null;

  return (
    <View style={w.wrap} pointerEvents="box-none">
      <View style={w.card} accessibilityRole="alert">
        <View style={w.iconBox}>
          <Icon name="system-update" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={w.title}>New update available · v{info.version}</Text>
          <Text style={w.sub} numberOfLines={2}>
            {info.notes || 'Latest features & fixes ke liye page refresh karein.'}
          </Text>
        </View>
        <TouchableOpacity style={w.later} onPress={() => setHiddenFor(key)} accessibilityLabel="Later">
          <Text style={w.laterText}>Later</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[w.btn, busy && { opacity: 0.6 }]}
          disabled={busy}
          onPress={() => { setBusy(true); void reloadToLatest(info); }}
          accessibilityLabel="Refresh now"
        >
          <Icon name="refresh" size={18} color="#fff" />
          <Text style={w.btnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ============================ NATIVE ============================= */

function StoreUpdateModal() {
  const [res, setRes] = useState<StoreUpdateResult | null>(null);
  const lastCheck = useRef(0);
  const running = useRef(false);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    lastCheck.current = Date.now();
    try {
      const r = await checkStoreUpdate();
      if (!r) { setRes(null); return; }
      if (r.kind === 'optional') {
        const snoozed = Number(await AsyncStorage.getItem(`app_update_later_${r.latestVersion}`)) || 0;
        if (Date.now() - snoozed < LATER_SNOOZE_MS) return;
      }
      setRes(r);
    } catch (e) {
      console.log('[AppUpdate] check failed', e);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(run, 2500);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && Date.now() - lastCheck.current > NATIVE_THROTTLE_MS) void run();
    });
    return () => { clearTimeout(first); sub.remove(); };
  }, [run]);

  if (!res) return null;
  const force = res.kind === 'force';
  const store = Platform.OS === 'ios' ? 'App Store' : 'Play Store';

  const later = async () => {
    try { await AsyncStorage.setItem(`app_update_later_${res.latestVersion}`, String(Date.now())); } catch { /* ignore */ }
    setRes(null);
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={force ? () => undefined : later}>
      <View style={n.backdrop}>
        <View style={n.card}>
          <View style={n.iconBox}>
            <Icon name="system-update" size={30} color="#fff" />
          </View>
          <Text style={n.title}>{force ? 'Update required' : 'New update available'}</Text>
          <Text style={n.text}>
            {res.message ||
              (force
                ? `Is version ko use karne ke liye app update karna zaroori hai. ${store} se latest version install karein.`
                : `FlowNest ka naya version ${store} par available hai.`)}
          </Text>
          <View style={n.versions}>
            <View style={n.vCol}>
              <Text style={n.vLabel}>INSTALLED</Text>
              <Text style={n.vVal}>{res.installedVersion || getInstalledVersion()}</Text>
            </View>
            <Icon name="arrow-forward" size={18} color={T.muted} />
            <View style={n.vCol}>
              <Text style={n.vLabel}>LATEST</Text>
              <Text style={[n.vVal, { color: T.green }]}>{res.latestVersion}</Text>
            </View>
          </View>
          <TouchableOpacity style={n.primary} onPress={() => void openStore(res)} accessibilityLabel={`Update on ${store}`}>
            <Icon name={Platform.OS === 'ios' ? 'apple' : 'shop'} size={20} color="#fff" />
            <Text style={n.primaryText}>Update on {store}</Text>
          </TouchableOpacity>
          {!force ? (
            <TouchableOpacity style={n.secondary} onPress={later} accessibilityLabel="Later">
              <Text style={n.secondaryText}>Later</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export default function AppUpdateGate() {
  if (isWeb) return <WebUpdateBanner />;
  if (Platform.OS === 'android' || Platform.OS === 'ios') return <StoreUpdateModal />;
  return null;
}

const w = StyleSheet.create({
  wrap: { position: 'absolute', top: 12, left: 12, right: 12, alignItems: 'center', zIndex: 99999 },
  card: {
    width: '100%', maxWidth: 620, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    backgroundColor: T.nav, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 14, fontWeight: '800' },
  sub: { color: '#B9C7D4', fontSize: 12.5, marginTop: 2 },
  later: { height: 38, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  laterText: { color: '#B9C7D4', fontWeight: '700', fontSize: 13 },
  btn: { height: 38, paddingHorizontal: 14, borderRadius: 10, backgroundColor: T.copper, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
});

const n = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(13,27,42,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: T.surface, borderRadius: 18, padding: 22, alignItems: 'center', gap: 10 },
  iconBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '800', color: T.nav, textAlign: 'center' },
  text: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20 },
  versions: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.sub, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18, marginVertical: 4 },
  vCol: { alignItems: 'center' },
  vLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  vVal: { fontSize: 16, fontWeight: '800', color: T.nav, marginTop: 2 },
  primary: { alignSelf: 'stretch', height: 48, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondary: { alignSelf: 'stretch', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: T.muted, fontSize: 14, fontWeight: '700' },
});
