// FILE: src/components/StockVerificationNEW/WebQrCamera.tsx
// QR camera for the WEB build (phone / tablet / laptop browser). Used by QrScanSheet when `webCamera` is set.
// - opens the back camera with getUserMedia (asks the browser permission), works on Android Chrome, iPhone Safari, desktop
// - reads the QR with the browser's BarcodeDetector when it has one, otherwise with jsQR (bundled, no CDN)
// - every failure has a clear reason + what to do: not https, permission blocked, no camera, camera busy
// - torch (when the phone supports it) and camera switch (when there is more than one)
// Native app builds never render this (they keep expo-camera).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import jsQR from 'jsqr';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = { active: boolean; onScanned: (value: string) => void };
type Fail = { icon: string; title: string; text: string; steps?: string[]; retry: boolean };

const SCAN_EVERY_MS = 140;
const MAX_W = 720;

function browserKind() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
  const android = /Android/i.test(ua);
  const inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|wv\)/i.test(ua);
  return { ios, android, inApp };
}

function permissionSteps(): string[] {
  const b = browserKind();
  const out: string[] = [];
  if (b.inApp) out.push('This link is open inside another app (WhatsApp etc.). Open it in Chrome / Safari.');
  if (b.ios) {
    out.push('Safari: tap “aA” in the address bar → Website Settings → Camera → Allow.');
    out.push('Or iPhone Settings → Safari → Camera → Allow (Chrome: Settings → Chrome → Camera on).');
  } else if (b.android) {
    out.push('Chrome: tap the 🔒 / ⓘ icon left of the address → Permissions → Camera → Allow.');
    out.push('If there is no Allow: phone Settings → Apps → Chrome → Permissions → Camera → Allow.');
  } else {
    out.push('Click the 🔒 / camera icon in the address bar → Camera → Allow, then press Try again.');
  }
  out.push('Then press “Try again”.');
  return out;
}

function failFor(err: any): Fail {
  const name = String(err?.name || '');
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return { icon: 'no-photography', title: 'Camera is blocked for this site', text: 'The browser did not allow the camera. Allow it once and scanning works every time.', steps: permissionSteps(), retry: true };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return { icon: 'videocam-off', title: 'No camera on this device', text: 'Use the scanner gun or type the taka no. / QR text below.', retry: true };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return { icon: 'videocam-off', title: 'Camera is busy', text: 'Another app or browser tab is using the camera. Close it and press Try again.', retry: true };
  }
  return { icon: 'error-outline', title: 'Camera could not start', text: String(err?.message || err || 'Unknown error') + ' — press Try again, or type the number below.', retry: true };
}

function insecureFail(): Fail | null {
  if (typeof window === 'undefined') return null;
  const secure = (window as any).isSecureContext !== false;
  const md = typeof navigator !== 'undefined' ? (navigator as any).mediaDevices : undefined;
  if (secure && md && typeof md.getUserMedia === 'function') return null;
  const host = window.location?.host || '';
  if (!secure) {
    return {
      icon: 'lock-open', title: 'Camera needs the https:// link',
      text: `Browsers give the camera only to secure pages. This page is open as ${window.location?.protocol || 'http:'}//${host}.`,
      steps: [`Open https://${host}${window.location?.pathname || ''} instead (ask IT to enable https if it does not open).`, 'Until then: scanner gun or type the taka no. below.'],
      retry: false,
    };
  }
  return { icon: 'videocam-off', title: 'This browser has no camera access', text: 'Open the link in Chrome (Android) or Safari (iPhone), or use the app.', steps: browserKind().inApp ? ['This link is open inside another app — open it in Chrome / Safari.'] : undefined, retry: false };
}

export default function WebQrCamera({ active, onScanned }: Props) {
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const busyRef = useRef(false);
  const doneRef = useRef(false);
  const detectorRef = useRef<any>(undefined);
  const [phase, setPhase] = useState<'starting' | 'live' | 'fail'>('starting');
  const [fail, setFail] = useState<Fail | null>(null);
  const [cams, setCams] = useState<{ id: string; label: string }[]>([]);
  const [camIdx, setCamIdx] = useState(-1);
  const [torch, setTorch] = useState<null | boolean>(null); // null = not supported
  const aliveRef = useRef(true);
  const runRef = useRef(0); // each start() gets a number — a slower, older start never takes over the camera
  const cbRef = useRef(onScanned);
  cbRef.current = onScanned;

  const stop = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const s = streamRef.current;
    streamRef.current = null;
    if (s) s.getTracks().forEach((t: any) => { try { t.stop(); } catch { /* already stopped */ } });
    const v = videoRef.current;
    if (v) { try { v.pause(); v.srcObject = null; } catch { /* element gone */ } }
  }, []);

  const decode = useCallback(async (): Promise<string> => {
    const v = videoRef.current;
    if (!v || v.readyState < 2 || !v.videoWidth) return '';
    // 1) native BarcodeDetector (Android Chrome, new Safari) — fast
    if (detectorRef.current === undefined) {
      detectorRef.current = null;
      try {
        const BD = (window as any).BarcodeDetector;
        if (BD) {
          const fm: string[] = typeof BD.getSupportedFormats === 'function' ? await BD.getSupportedFormats() : ['qr_code'];
          if (fm.includes('qr_code')) detectorRef.current = new BD({ formats: ['qr_code'] });
        }
      } catch { detectorRef.current = null; }
    }
    if (detectorRef.current) {
      try {
        const r = await detectorRef.current.detect(v);
        const t = r && r[0] ? String(r[0].rawValue || '') : '';
        if (t) return t;
        return ''; // detector works; nothing in frame
      } catch { detectorRef.current = null; /* fall back to jsQR */ }
    }
    // 2) jsQR on a scaled frame
    const scale = Math.min(1, MAX_W / v.videoWidth);
    const w = Math.max(1, Math.round(v.videoWidth * scale));
    const h = Math.max(1, Math.round(v.videoHeight * scale));
    let c = canvasRef.current;
    if (!c) { c = document.createElement('canvas'); canvasRef.current = c; }
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '';
    ctx.drawImage(v, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const q = jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' });
    return q?.data ? String(q.data) : '';
  }, []);

  const loop = useCallback(() => {
    timerRef.current = setTimeout(async () => {
      if (!streamRef.current || doneRef.current) return;
      if (!busyRef.current) {
        busyRef.current = true;
        try {
          const t = (await decode()).trim();
          if (t && !doneRef.current) {
            doneRef.current = true;
            try { (navigator as any).vibrate?.(60); } catch { /* no vibration */ }
            stop();
            cbRef.current(t);
            return;
          }
        } catch { /* a bad frame — keep going */ }
        busyRef.current = false;
      }
      loop();
    }, SCAN_EVERY_MS);
  }, [decode, stop]);

  const start = useCallback(async (deviceId?: string) => {
    const run = ++runRef.current;
    stop();
    doneRef.current = false;
    busyRef.current = false;
    setFail(null);
    setTorch(null);
    const ins = insecureFail();
    if (ins) { setFail(ins); setPhase('fail'); return; }
    setPhase('starting');
    const md = (navigator as any).mediaDevices;
    const base = { width: { ideal: 1280 }, height: { ideal: 720 } };
    let stream: any = null;
    try {
      stream = await md.getUserMedia({ audio: false, video: deviceId ? { ...base, deviceId: { exact: deviceId } } : { ...base, facingMode: { ideal: 'environment' } } });
    } catch (e: any) {
      if (e?.name === 'OverconstrainedError' || (deviceId && e?.name === 'NotFoundError')) {
        try { stream = await md.getUserMedia({ audio: false, video: true }); } catch (e2) { if (aliveRef.current && run === runRef.current) { setFail(failFor(e2)); setPhase('fail'); } return; }
      } else { if (aliveRef.current && run === runRef.current) { setFail(failFor(e)); setPhase('fail'); } return; }
    }
    if (!aliveRef.current || run !== runRef.current) { stream.getTracks().forEach((t: any) => t.stop()); return; } // closed meanwhile
    streamRef.current = stream;
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.setAttribute('playsinline', 'true');
      v.setAttribute('muted', 'true');
      v.srcObject = stream;
      try { await v.play(); } catch { /* autoplay blocked: the stream still renders after a tap */ }
    }
    const track = stream.getVideoTracks()[0];
    try {
      const caps = track?.getCapabilities?.();
      if (caps && caps.torch) setTorch(false);
    } catch { /* no capabilities api */ }
    try {
      const list = (await md.enumerateDevices()).filter((d: any) => d.kind === 'videoinput').map((d: any, i: number) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` }));
      setCams(list);
      const cur = track?.getSettings?.().deviceId;
      setCamIdx(Math.max(0, list.findIndex((d: any) => d.id === cur)));
    } catch { setCams([]); }
    if (!aliveRef.current || run !== runRef.current) return;
    setPhase('live');
    loop();
  }, [active, loop, stop]);

  useEffect(() => {
    aliveRef.current = true;
    // a short delay: the sheet re-mounts the camera right after opening — start only the one that stays
    const t = active ? setTimeout(() => { if (aliveRef.current) void start(); }, 60) : null;
    if (!active) stop();
    return () => { aliveRef.current = false; runRef.current++; if (t) clearTimeout(t); stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const switchCam = () => {
    if (cams.length < 2) return;
    const n = (camIdx + 1) % cams.length;
    setCamIdx(n);
    void start(cams[n].id);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track || torch === null) return;
    try { await track.applyConstraints({ advanced: [{ torch: !torch }] }); setTorch(!torch); } catch { setTorch(null); }
  };

  const video = React.createElement('video' as any, {
    ref: videoRef, autoPlay: true, playsInline: true, muted: true,
    style: { width: '100%', height: '100%', objectFit: 'cover', display: phase === 'fail' ? 'none' : 'block', background: '#000' },
  });

  return (
    <View style={st.root}>
      {video}
      {phase === 'fail' && fail ? (
        <View style={st.failCard}>
          <Icon name={fail.icon as any} size={44} color={T.copper} />
          <Text style={st.failTitle}>{fail.title}</Text>
          <Text style={st.failText}>{fail.text}</Text>
          {fail.steps?.length ? (
            <View style={st.steps}>
              {fail.steps.map((s, i) => (
                <View key={i} style={st.stepRow}>
                  <Text style={st.stepNo}>{i + 1}</Text>
                  <Text style={st.stepText}>{s}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {fail.retry ? (
            <TouchableOpacity style={st.retry} onPress={() => void start()} accessibilityLabel="Try camera again">
              <Icon name="refresh" size={18} color="#fff" />
              <Text style={st.retryText}>Try again</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View pointerEvents="box-none" style={st.overlay}>
          <View pointerEvents="none" style={st.box}>
            <View style={[st.corner, st.tl]} />
            <View style={[st.corner, st.tr]} />
            <View style={[st.corner, st.bl]} />
            <View style={[st.corner, st.br]} />
          </View>
          <View pointerEvents="none" style={st.hint}>
            {phase !== 'live' ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="qr-code-scanner" size={16} color="#fff" />}
            <Text style={st.hintText}>{phase === 'live' ? 'Point at the sticker QR' : 'Starting camera… allow it if the browser asks'}</Text>
          </View>
          {phase === 'live' && (torch !== null || cams.length > 1) ? (
            <View style={st.tools}>
              {torch !== null ? (
                <TouchableOpacity style={[st.tool, torch && { backgroundColor: T.copper }]} onPress={toggleTorch} accessibilityLabel={torch ? 'Torch off' : 'Torch on'}>
                  <Icon name={torch ? 'flash-on' : 'flash-off'} size={20} color="#fff" />
                </TouchableOpacity>
              ) : null}
              {cams.length > 1 ? (
                <TouchableOpacity style={st.tool} onPress={switchCam} accessibilityLabel="Switch camera">
                  <Icon name="cameraswitch" size={20} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  box: { width: '70%', aspectRatio: 1, maxWidth: 300 },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: T.copper },
  tl: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 12 },
  tr: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 12 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 12 },
  br: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 12 },
  hint: { position: 'absolute', bottom: 20, left: 16, right: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  hintText: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  tools: { position: 'absolute', top: 12, right: 12, gap: 10 },
  tool: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  failCard: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, padding: 24 },
  failTitle: { marginTop: 12, color: T.nav, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  failText: { marginTop: 6, color: T.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 380 },
  steps: { marginTop: 14, width: '100%', maxWidth: 420, gap: 8 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNo: { width: 22, height: 22, borderRadius: 11, backgroundColor: T.nav, color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
  stepText: { flex: 1, color: T.ink, fontSize: 13, lineHeight: 19 },
  retry: { marginTop: 18, height: 44, paddingHorizontal: 22, borderRadius: 10, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', gap: 8 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
