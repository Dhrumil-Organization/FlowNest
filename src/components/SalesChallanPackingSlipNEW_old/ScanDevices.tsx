// FILE: src/components/SalesChallanPackingSlipNEW/ScanDevices.tsx
// The two scanner device types — same behaviour as WarehouseNEW (HardwareScanStep / CameraScanStep):
//
//   HardwareScanner  1. Urovo scan engine (laser trigger) via WarehouseNEW/useUrovoScanner — Android only,
//                       status pill ACTIVE / listening / not found, on-screen trigger (triggerUrovoScan)
//                    2. keyboard-wedge scanners: an invisible, always re-focused TextInput; text longer
//                       than 5 chars is taken 120 ms after the change, or on Enter
//                    one 800 ms gate for both paths
//   CameraScanner    expo-camera, back camera, torch, qr / ean13 / code128; permission asked on open
//                    (refused → "Camera Permission Required", OK switches back to the hardware scanner);
//                    350 ms processing lock + the same QR is ignored until out of frame for 700 ms
//
// Each one is mounted only while selected, so the Urovo engine / camera start and stop with it.
//
// BROWSER (web build in Chrome on the handheld): there is no Urovo native module, so the hardware tab listens for
// keyboard-wedge input on the whole page (webWedge.ts), and the camera uses Chrome's BarcodeDetector
// (WebCameraScanner.web.tsx) instead of expo-camera's CDN jsQR, which misses dense carton QR codes.
import { AppAlert } from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { cleanScannerValue } from '../WarehouseNEW/model';
import { triggerUrovoScan, useUrovoScanner } from '../WarehouseNEW/useUrovoScanner';
import WebCameraScanner, { hasWebBarcodeDetector } from './WebCameraScanner';
import { isWeb, useWebWedge, wedgeInputProps } from './webWedge';
import type { WedgeDiag } from './webWedge';

export type ScanDevice = 'hardware' | 'camera';

/** Same cleaning as WarehouseNEW (trim, drop \r \n \t). */
export const cleanScan = cleanScannerValue;

const HW_GATE_MS = 800;
const CAM_LOCK_MS = 350;
const SAME_QR_SUPPRESS_MS = 700;

/* ------------------------------ hardware (Urovo + keyboard wedge) ------------------------------ */

export function HardwareScanner({ onScan, enabled, compact }: { onScan: (code: string) => void; enabled: boolean; compact?: boolean }) {
  const gate = useRef(false);
  const timers = useRef<any[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // latest props for callbacks fired by native events / timers (never a stale closure)
  const scanRef = useRef(onScan); scanRef.current = onScan;
  const enabledRef = useRef(enabled); enabledRef.current = enabled;

  const [message, setMessage] = useState('');
  const [lastRaw, setLastRaw] = useState('');

  const take = (value: string) => {
    const v = cleanScan(value);
    if (!v) return;
    if (!enabledRef.current) { setMessage('Cartons are still loading — scan again in a moment.'); return; }
    if (gate.current) return;
    gate.current = true;
    setLastRaw(v);
    setMessage(`Scan received: ${v.substring(0, 40)}`);
    scanRef.current(v);
    later(() => { gate.current = false; }, HW_GATE_MS);
  };

  // 1. Urovo engine (laser trigger) — Android app only; a no-op in the browser
  const hw = useUrovoScanner(take);

  // 2a. Browser: page-level keyboard-wedge listener (see webWedge.ts)
  const webInput = useRef<HTMLInputElement | null>(null);
  useWebWedge(isWeb, webInput, take, (d: WedgeDiag) => {
    if (d.chars === 0) setMessage(`${d.ended === 'tab' ? 'Tab' : 'Enter'} received without text — set Urovo Output mode to Keyboard.`);
  });

  // 2b. App: invisible TextInput, re-focused every 500 ms (WarehouseNEW). Text is kept in a ref, so a fast
  //     scanner's Enter never reads an old value, and Enter is handled once (onSubmitEditing).
  const text = useRef('');
  const [shown, setShown] = useState('');
  const wedge = useRef<TextInput>(null);
  const idle = useRef<any>(null);
  useEffect(() => {
    if (isWeb) return undefined;
    const t = setInterval(() => wedge.current?.focus?.(), 500);
    return () => clearInterval(t);
  }, []);
  const submit = () => {
    clearTimeout(idle.current);
    const v = cleanScan(text.current);
    text.current = ''; setShown('');
    if (!v) { setMessage('No scan text received. Check Scanner Output Mode.'); return; }
    take(v);
    later(() => wedge.current?.focus?.(), 50);
  };
  const onWedge = (t: string) => {
    text.current = t; setShown(t);
    clearTimeout(idle.current);
    if (cleanScan(t).length > 5) idle.current = setTimeout(submit, 120); // scanners without an Enter suffix
  };

  const pill = isWeb
    ? { text: 'BROWSER: keyboard scanner mode', color: T.blue }
    : hw.state === 'active'
      ? { text: 'HW SCANNER: ACTIVE — use trigger', color: T.green }
      : hw.state === 'listening'
        ? { text: 'HW: listening (check Scanner Settings)', color: T.amber }
        : { text: 'No Urovo engine — keyboard scanner only', color: T.muted };
  const canTrigger = !isWeb && hw.state === 'active' && enabled;

  const hiddenInput = (
    <>
      {isWeb ? React.createElement('input', wedgeInputProps(webInput)) : null}
      {!isWeb ? (
        <TextInput ref={wedge} value={shown} onChangeText={onWedge} onSubmitEditing={submit} blurOnSubmit={false} autoFocus
          showSoftInputOnFocus={false} inputMode="none" caretHidden style={st.wedge} accessibilityLabel="Hardware scanner input" />
      ) : null}
    </>
  );

  if (compact) {
    // Slim "always listening" bar for the carton list screen.
    return (
      <View style={st.slim}>
        {hiddenInput}
        <View style={[st.dot, { backgroundColor: enabled ? pill.color : T.muted, width: 10, height: 10, borderRadius: 5 }]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.slimTitle} numberOfLines={1}>{pill.text}</Text>
          <Text style={st.slimText} numberOfLines={1}>
            {!enabled ? 'Loading cartons…' : message || (canTrigger ? 'Press the trigger to scan' : 'Press the scan key on the device')}
          </Text>
        </View>
        {canTrigger ? (
          <TouchableOpacity onPress={triggerUrovoScan} accessibilityRole="button" accessibilityLabel="Fire scanner" style={st.slimBtn}>
            <Icon name="qr-code-scanner" size={22} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      {isWeb ? React.createElement('input', wedgeInputProps(webInput)) : null}
      {!isWeb ? (
        <TextInput
          ref={wedge}
          value={shown}
          onChangeText={onWedge}
          onSubmitEditing={submit}
          blurOnSubmit={false}
          autoFocus
          showSoftInputOnFocus={false}
          inputMode="none"
          caretHidden
          style={st.wedge}
          accessibilityLabel="Hardware scanner input"
        />
      ) : null}
      <View style={st.hwBox}>
        <View style={[st.pill, { borderColor: pill.color }]}>
          <View style={[st.dot, { backgroundColor: pill.color }]} />
          <Text style={[st.pillText, { color: pill.color }]} numberOfLines={1}>{pill.text}</Text>
        </View>
        <TouchableOpacity onPress={triggerUrovoScan} disabled={!canTrigger} accessibilityRole="button" accessibilityLabel="Fire scanner"
          style={[st.trigger, !canTrigger && { opacity: isWeb ? 0.85 : 0.45 }]}>
          <Icon name="qr-code-scanner" size={34} color="#fff" />
          <Text style={st.triggerText}>{canTrigger ? 'Press trigger (or tap here)' : 'Press the scan key on the device'}</Text>
        </TouchableOpacity>
        <View style={st.debugBox}>
          <Text style={st.debugText} numberOfLines={2}>
            {!enabled ? 'Loading cartons…' : message || (canTrigger ? 'Ready: press the orange trigger button' : 'Ready: scan a carton label')}
          </Text>
          {lastRaw ? <Text style={st.debugText} numberOfLines={1}>Last: {lastRaw.substring(0, 60)}</Text> : null}
        </View>
        {isWeb ? (
          <Text style={st.tip}>
            Urovo in Chrome: Scanner Settings → Output mode = Keyboard (input method), Enter suffix on. The laser engine
            (orange trigger) works only in the Android app.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------ camera ------------------------------ */

export function CameraScanner({ onScan, enabled, onRefused }: { onScan: (code: string) => void; enabled: boolean; onRefused: () => void }) {
  const scanRef = useRef(onScan); scanRef.current = onScan;
  const [torch, setTorch] = useState<'on' | 'off'>('off');
  const lock = useRef(false);
  const lastQr = useRef({ value: '', seenAt: 0 });

  /** Same guards for every camera: 350 ms lock + the same QR ignored until out of frame for 700 ms. */
  const onCode = (data: string) => {
    if (lock.current || !data) return;
    const v = cleanScan(data);
    if (!v) return;
    const now = Date.now();
    const last = lastQr.current;
    if (last.value === v && now - last.seenAt < SAME_QR_SUPPRESS_MS) { lastQr.current = { value: v, seenAt: now }; return; } // still in frame
    lastQr.current = { value: v, seenAt: now };
    lock.current = true;
    scanRef.current(v);
    setTimeout(() => { lock.current = false; }, CAM_LOCK_MS);
  };

  const torchBtn = (
    <TouchableOpacity onPress={() => setTorch((t) => (t === 'on' ? 'off' : 'on'))} accessibilityRole="button" accessibilityLabel="Torch" style={st.torch}>
      <Icon name={torch === 'on' ? 'flash-on' : 'flash-off'} size={22} color="#fff" />
    </TouchableOpacity>
  );

  // Browser with Chrome's BarcodeDetector (Android Chrome): native decoding, QR + Code 128 + EAN-13.
  if (isWeb && hasWebBarcodeDetector()) {
    return (
      <View>
        <WebCameraScanner onScan={onCode} enabled={enabled} torch={torch === 'on'} onBack={onRefused} />
        {torchBtn}
      </View>
    );
  }
  return <ExpoCameraScanner onCode={onCode} enabled={enabled} onRefused={onRefused} torch={torch} torchBtn={torchBtn} />;
}

/** App (and browsers without BarcodeDetector): expo-camera, exactly like WarehouseNEW CameraScanStep. */
function ExpoCameraScanner({ onCode, enabled, onRefused, torch, torchBtn }: {
  onCode: (data: string) => void; enabled: boolean; onRefused: () => void; torch: 'on' | 'off'; torchBtn: React.ReactNode;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const granted = !!permission?.granted;
  const mounted = useRef(true);
  const asked = useRef(false); // ask ONCE — requestPermission() updates `permission`, which used to re-run the ask → endless alerts
  const refusedRef = useRef(onRefused); refusedRef.current = onRefused;
  const [blocked, setBlocked] = useState<'' | 'insecure' | 'denied'>(
    isWeb && (typeof window !== 'undefined' && (!window.isSecureContext || !(navigator as any)?.mediaDevices?.getUserMedia)) ? 'insecure' : '',
  );
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (blocked || !permission || permission.granted || asked.current) return;
    asked.current = true;
    const refused = () => {
      if (!mounted.current) return;
      setBlocked('denied');
      // On web the browser shows its own prompt; an extra popup only gets in the way.
      if (!isWeb) AppAlert.alert('Camera Permission Required', 'Please allow camera permission.', [{ text: 'OK', onPress: () => refusedRef.current() }]);
    };
    requestPermission().then((res: any) => { if (!res?.granted) refused(); }).catch(refused);
  }, [permission, blocked]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!granted) {
    const msg = blocked === 'insecure'
      ? 'The browser blocks the camera on http:// pages. Open the ERP with https:// (or use the hardware scanner).'
      : blocked === 'denied'
        ? (isWeb ? 'Camera access was blocked. Allow it in the browser (lock icon → Camera), then reopen.' : 'Camera permission was refused.')
        : 'Waiting for camera permission…';
    return (
      <View style={[st.camBox, st.center, { padding: 20 }]}>
        <Icon name={blocked ? 'videocam-off' : 'photo-camera'} size={40} color={T.copper} />
        <Text style={[st.waitText, { textAlign: 'center' }]}>{msg}</Text>
        {blocked ? (
          <TouchableOpacity onPress={() => refusedRef.current()} accessibilityRole="button" style={st.camBack}>
            <Icon name="qr-code-scanner" size={18} color="#fff" />
            <Text style={st.camBackText}>Use hardware scanner</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }
  return (
    <View style={st.camBox}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back" enableTorch={torch === 'on'}
        onBarcodeScanned={enabled ? ({ data }: { data: string }) => onCode(data) : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'code128'] }} />
      <View pointerEvents="none" style={st.frame} />
      {!enabled ? <View style={st.stagePill}><Text style={st.stagePillText}>Preparing scanner…</Text></View> : null}
      {torchBtn}
    </View>
  );
}

const st = StyleSheet.create({
  wedge: { position: 'absolute', top: -100, left: 0, width: 1, height: 1, opacity: 0 },
  hwBox: { backgroundColor: T.nav, borderRadius: 16, padding: 14, gap: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#fff' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: '900' },
  trigger: { minHeight: 96, borderRadius: 14, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', gap: 6 },
  triggerText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  debugBox: { backgroundColor: T.alt, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  debugText: { color: T.nav, fontSize: 12, fontWeight: '700' },
  tip: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, lineHeight: 16 },
  slim: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.nav, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  slimTitle: { color: '#fff', fontSize: 12.5, fontWeight: '900' },
  slimText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 1 },
  slimBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  camBox: { height: 280, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: T.nav },
  waitText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  frame: { position: 'absolute', top: '16%', bottom: '16%', left: '20%', right: '20%', borderWidth: 3, borderColor: T.copper, borderRadius: 16 },
  camBack: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.copper, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 },
  camBackText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  stagePill: { position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: T.nav, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  stagePillText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  torch: { position: 'absolute', right: 10, top: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
