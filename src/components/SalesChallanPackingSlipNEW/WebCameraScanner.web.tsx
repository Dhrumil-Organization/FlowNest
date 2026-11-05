// FILE: src/components/SalesChallanPackingSlipNEW/WebCameraScanner.web.tsx
// Camera scanning in the BROWSER with Chrome's built-in BarcodeDetector (Android Chrome 83+).
//
// expo-camera on web decodes QR only, with jsQR fetched at runtime from cdn.jsdelivr.net, one frame every
// 300 ms. Carton labels hold ~20 comma-separated fields → dense QR codes that jsQR often misses, and if the
// CDN is blocked nothing is decoded at all. BarcodeDetector is native, fast and reads QR, Code 128, EAN-13,
// Data Matrix. Where it is missing (desktop Firefox / Safari) ScanDevices falls back to expo-camera.
//
// Needs HTTPS (secure context) for the camera; shows why when it can't start.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const WANT = ['qr_code', 'code_128', 'ean_13', 'data_matrix'];

export const hasWebBarcodeDetector = () => typeof window !== 'undefined' && 'BarcodeDetector' in window;

type State = 'starting' | 'ready' | 'denied' | 'insecure' | 'nocamera' | 'error';

export default function WebCameraScanner({ onScan, enabled, torch, onBack }: { onScan: (code: string) => void; enabled: boolean; torch: boolean; onBack?: () => void }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const scanRef = useRef(onScan);
  scanRef.current = onScan;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const [state, setState] = useState<State>('starting');
  const [detail, setDetail] = useState('');

  // camera
  useEffect(() => {
    let stopped = false;
    if (!window.isSecureContext) { setState('insecure'); return undefined; }
    if (!navigator.mediaDevices?.getUserMedia) { setState('nocamera'); return undefined; }
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(async (s) => {
        if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
        setState('ready');
      })
      .catch((e: any) => {
        setDetail(String(e?.message || e?.name || ''));
        setState(e?.name === 'NotAllowedError' ? 'denied' : e?.name === 'NotFoundError' ? 'nocamera' : 'error');
      });
    return () => {
      stopped = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, []);

  // torch (only where the camera supports it)
  useEffect(() => {
    const track: any = stream.current?.getVideoTracks?.()[0];
    if (!track?.getCapabilities?.()?.torch) return;
    track.applyConstraints({ advanced: [{ torch }] }).catch(() => {});
  }, [torch, state]);

  // decode loop
  useEffect(() => {
    if (state !== 'ready' || !hasWebBarcodeDetector()) return undefined;
    let alive = true;
    let timer: any = null;
    let detector: any = null;
    const BD: any = (window as any).BarcodeDetector;
    (async () => {
      try {
        const supported: string[] = (await BD.getSupportedFormats?.()) || WANT;
        const formats = WANT.filter((f) => supported.includes(f));
        detector = new BD({ formats: formats.length ? formats : ['qr_code'] });
      } catch (e: any) { setDetail(String(e?.message || '')); setState('error'); return; }
      const tick = async () => {
        if (!alive) return;
        const v = video.current;
        if (enabledRef.current && v && v.readyState >= 2) {
          try {
            const found = await detector.detect(v);
            const raw = found?.[0]?.rawValue;
            if (raw) scanRef.current(String(raw));
          } catch { /* frame not ready */ }
        }
        timer = setTimeout(tick, 140);
      };
      tick();
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, [state]);

  const msg =
    state === 'insecure' ? 'The browser blocks the camera on http:// pages. Open the ERP with https:// (or use the hardware scanner).'
      : state === 'denied' ? 'Camera access was blocked. Allow it in Chrome (lock icon → Permissions → Camera), then reopen.'
        : state === 'nocamera' ? 'No camera found on this device.'
          : state === 'error' ? `Camera could not start. ${detail}`.trim()
            : '';

  return (
    <View style={{ height: 280, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' }}>
      {React.createElement('video', {
        ref: video, muted: true, playsInline: true, autoPlay: true,
        style: { width: '100%', height: '100%', objectFit: 'cover', display: state === 'ready' ? 'block' : 'none' },
      })}
      {state === 'ready' ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: '16%', bottom: '16%', left: '20%', right: '20%', borderWidth: 3, borderColor: T.copper, borderRadius: 16 }} />
      ) : (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10, backgroundColor: T.nav }}>
          <Icon name={msg ? 'videocam-off' : 'photo-camera'} size={40} color={T.copper} />
          <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>{msg || 'Starting camera…'}</Text>
          {msg && onBack ? (
            <TouchableOpacity onPress={onBack} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.copper, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 }}>
              <Icon name="qr-code-scanner" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '900' }}>Use hardware scanner</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {state === 'ready' && !enabled ? (
        <View style={{ position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: T.nav, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Preparing scanner…</Text>
        </View>
      ) : null}
    </View>
  );
}
