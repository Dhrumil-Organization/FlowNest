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
import { AppAlert } from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { cleanScannerValue } from '../WarehouseNEW/model';
import { triggerUrovoScan, useUrovoScanner } from '../WarehouseNEW/useUrovoScanner';

export type ScanDevice = 'hardware' | 'camera';

/** Same cleaning as WarehouseNEW (trim, drop \r \n \t). */
export const cleanScan = cleanScannerValue;

const HW_GATE_MS = 800;
const CAM_LOCK_MS = 350;
const SAME_QR_SUPPRESS_MS = 700;

/* ------------------------------ hardware (Urovo + keyboard wedge) ------------------------------ */

export function HardwareScanner({ onScan, enabled }: { onScan: (code: string) => void; enabled: boolean }) {
  const gate = useRef(false);
  const timers = useRef<any[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const [message, setMessage] = useState('');
  const [lastRaw, setLastRaw] = useState('');

  const take = (value: string) => {
    if (!enabled || gate.current) return;
    const v = cleanScan(value);
    if (!v) return;
    gate.current = true;
    setLastRaw(v);
    setMessage(`Scan received: ${v.substring(0, 40)}`);
    onScan(v);
    later(() => { gate.current = false; }, HW_GATE_MS);
  };

  // 1. Urovo engine (laser trigger)
  const hw = useUrovoScanner(take);

  // 2. keyboard-wedge fallback: invisible input, re-focused every 500 ms
  const [buffer, setBuffer] = useState('');
  const wedge = useRef<TextInput>(null);
  useEffect(() => {
    const t = setInterval(() => wedge.current?.focus?.(), 500);
    return () => clearInterval(t);
  }, []);
  const onWedge = (text: string) => {
    setBuffer(text);
    if (cleanScan(text).length > 5) {
      later(() => {
        const v = cleanScan(text);
        if (v) { setBuffer(''); take(v); later(() => wedge.current?.focus?.(), 50); }
      }, 120);
    }
  };
  const onWedgeSubmit = () => {
    const v = cleanScan(buffer);
    setBuffer('');
    if (!v) { setMessage('No scan text received. Check Scanner Output Mode.'); return; }
    take(v);
    later(() => wedge.current?.focus?.(), 50);
  };

  const pill = hw.state === 'active'
    ? { text: 'HW SCANNER: ACTIVE — use trigger', color: T.green }
    : hw.state === 'listening'
      ? { text: 'HW: listening (check Scanner Settings)', color: T.amber }
      : { text: 'No Urovo engine — keyboard scanner only', color: T.muted };

  return (
    <View>
      <TextInput
        ref={wedge}
        value={buffer}
        onChangeText={onWedge}
        onSubmitEditing={onWedgeSubmit}
        onKeyPress={({ nativeEvent }: any) => { if (nativeEvent.key === 'Enter') onWedgeSubmit(); }}
        blurOnSubmit={false}
        autoFocus
        showSoftInputOnFocus={false}
        caretHidden
        style={st.wedge}
        accessibilityLabel="Hardware scanner input"
      />
      <View style={st.hwBox}>
        <View style={[st.pill, { borderColor: pill.color }]}>
          <View style={[st.dot, { backgroundColor: pill.color }]} />
          <Text style={[st.pillText, { color: pill.color }]} numberOfLines={1}>{pill.text}</Text>
        </View>
        <TouchableOpacity onPress={triggerUrovoScan} disabled={hw.state !== 'active' || !enabled} accessibilityRole="button" accessibilityLabel="Fire scanner"
          style={[st.trigger, (hw.state !== 'active' || !enabled) && { opacity: 0.45 }]}>
          <Icon name="qr-code-scanner" size={34} color="#fff" />
          <Text style={st.triggerText}>{hw.state === 'active' ? 'Press trigger (or tap here)' : 'Scan with the device scanner'}</Text>
        </TouchableOpacity>
        <View style={st.debugBox}>
          <Text style={st.debugText} numberOfLines={1}>
            {!enabled ? 'Loading cartons…' : message || (hw.state === 'active' ? 'Ready: press the orange trigger button' : 'Ready: scan with a Bluetooth / USB keyboard scanner')}
          </Text>
          {lastRaw ? <Text style={st.debugText} numberOfLines={1}>Last: {lastRaw.substring(0, 60)}</Text> : null}
        </View>
      </View>
    </View>
  );
}

/* ------------------------------ camera ------------------------------ */

export function CameraScanner({ onScan, enabled, onRefused }: { onScan: (code: string) => void; enabled: boolean; onRefused: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const granted = !!permission?.granted;
  const [torch, setTorch] = useState<'on' | 'off'>('off');
  const lock = useRef(false);
  const lastQr = useRef({ value: '', seenAt: 0 });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!permission || permission.granted) return;
    const refused = () => {
      if (!mounted.current) return;
      AppAlert.alert('Camera Permission Required', 'Please allow camera permission.', [{ text: 'OK', onPress: onRefused }]);
    };
    requestPermission().then((res: any) => { if (!res?.granted) refused(); }).catch(refused);
  }, [permission]); // eslint-disable-line react-hooks/exhaustive-deps

  const onBarcode = ({ data }: { data: string }) => {
    if (lock.current || !data) return;
    const v = cleanScan(data);
    if (!v) return;
    const now = Date.now();
    const last = lastQr.current;
    if (last.value === v && now - last.seenAt < SAME_QR_SUPPRESS_MS) { lastQr.current = { value: v, seenAt: now }; return; } // still in frame
    lastQr.current = { value: v, seenAt: now };
    lock.current = true;
    onScan(v);
    setTimeout(() => { lock.current = false; }, CAM_LOCK_MS);
  };

  if (!granted) {
    return (
      <View style={[st.camBox, st.center]}>
        <Icon name="photo-camera" size={40} color={T.copper} />
        <Text style={st.waitText}>Waiting for camera permission…</Text>
      </View>
    );
  }
  return (
    <View style={st.camBox}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back" enableTorch={torch === 'on'}
        onBarcodeScanned={enabled ? onBarcode : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'code128'] }} />
      <View pointerEvents="none" style={st.frame} />
      {!enabled ? <View style={st.stagePill}><Text style={st.stagePillText}>Preparing scanner…</Text></View> : null}
      <TouchableOpacity onPress={() => setTorch((t) => (t === 'on' ? 'off' : 'on'))} accessibilityRole="button" accessibilityLabel="Torch" style={st.torch}>
        <Icon name={torch === 'on' ? 'flash-on' : 'flash-off'} size={22} color="#fff" />
      </TouchableOpacity>
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
  camBox: { height: 280, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: T.nav },
  waitText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  frame: { position: 'absolute', top: '16%', bottom: '16%', left: '20%', right: '20%', borderWidth: 3, borderColor: T.copper, borderRadius: 16 },
  stagePill: { position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: T.nav, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  stagePillText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  torch: { position: 'absolute', right: 10, top: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
