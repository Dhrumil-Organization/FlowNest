// FILE: src/components/WarehouseNEW/CameraScanStep.tsx
// Scanner step (camera) — port of legacy Warehouse/WarehouseQRCameraScanner.tsx.
//   - expo-camera CameraView, back camera, torch toggle, types qr / ean13 / code128
//   - permission is requested on open; if refused: "Camera Permission Required"
//     alert, OK closes the scanner
//   - the QR index is built in 250-row batches AFTER the camera has painted;
//     scanning is enabled only when it is ready ("Preparing scanner...")
//   - guards: 350 ms processing lock + the same continuously visible QR is
//     suppressed until it has been out of frame for 700 ms (sliding window)
// expo-camera is imported directly, exactly like the other NEW scanners
// (StockVerificationNEW/QrScanSheet, greyPacking scanner) — it has a web build.
import { AppAlert } from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { cleanScannerValue, findIndexedQrMatch, indexCartonRow, QrIndex, ScanParams } from './model';
import { ScanLayout, StagePill, useScanSession } from './scanShared';

type Props = { params: ScanParams; onClose: () => void };

const SAME_QR_SUPPRESS_MS = 700;

export default function CameraScanStep({ params, onClose }: Props) {
  const { mode = 'ASSIGN', cartons = [], selected = {}, onScanResult } = params || ({} as ScanParams);
  const session = useScanSession(selected);
  const { later } = session;

  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = !!permission?.granted;
  const [torch, setTorch] = useState<'on' | 'off'>('off');

  const processingRef = useRef(false);
  const lastCameraQrRef = useRef({ value: '', seenAt: 0 });

  // No permission alert once this step is closed (CLOSE / hardware back while the
  // permission request was still pending).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      const refused = () => {
        if (!mountedRef.current) return;
        AppAlert.alert('Camera Permission Required', 'Please allow camera permission.', [
          { text: 'OK', onPress: () => onClose() },
        ]);
      };
      requestPermission()
        .then((res: any) => {
          if (!res?.granted) refused();
        })
        .catch(refused);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  // Build the exact-match map after the camera screen has painted (batched).
  const qrIndexRef = useRef<QrIndex>(new Map());
  const [scanIndexReady, setScanIndexReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: any = null;
    const map: QrIndex = new Map();
    let index = 0;
    const batchSize = 250;

    qrIndexRef.current = map;
    setScanIndexReady(false);

    if (!hasPermission) {
      return () => {
        cancelled = true;
      };
    }

    const buildBatch = () => {
      if (cancelled) return;
      const end = Math.min(index + batchSize, cartons.length);
      for (; index < end; index += 1) indexCartonRow(map, cartons[index]);

      if (index < cartons.length) {
        timer = setTimeout(buildBatch, 0);
      } else {
        qrIndexRef.current = map;
        if (!cancelled) setScanIndexReady(true);
      }
    };

    timer = setTimeout(buildBatch, 50);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [cartons, hasPermission]);

  const processScan = (value: any) => {
    const rawInput = cleanScannerValue(value);
    if (!rawInput) return;
    session.applyMatch(findIndexedQrMatch(qrIndexRef.current, rawInput));
  };

  const handleDone = () => {
    const finalRows = Object.values(session.scanned || {});
    onScanResult?.(finalRows);
    onClose();
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (processingRef.current) return;
    if (!data) return;

    const cleanData = cleanScannerValue(data);
    if (!cleanData) return;

    const now = Date.now();
    const last = lastCameraQrRef.current;

    // Same QR still in frame: keep extending the suppression window.
    if (last.value === cleanData && now - last.seenAt < SAME_QR_SUPPRESS_MS) {
      lastCameraQrRef.current = { value: cleanData, seenAt: now };
      return;
    }

    lastCameraQrRef.current = { value: cleanData, seenAt: now };
    processingRef.current = true;
    processScan(cleanData);

    later(() => {
      processingRef.current = false;
    }, 350);
  };

  if (!hasPermission) {
    return (
      <View style={st.center}>
        <Icon name="photo-camera" size={40} color={T.copper} />
        <Text style={st.waitText}>Waiting for camera permission...</Text>
        <TouchableOpacity onPress={onClose} style={st.closeBtn} accessibilityRole="button" accessibilityLabel="Close scanner">
          <Text style={st.closeText}>CLOSE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScanLayout
      title={mode === 'TRANSFER' ? 'Transfer Scan' : 'Assign Scan'}
      hint="Scan Carton QR Code"
      session={session}
      onClose={onClose}
      onDone={handleDone}
      torch={torch}
      onToggleTorch={() => setTorch((prev) => (prev === 'on' ? 'off' : 'on'))}
      stage={
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torch === 'on'}
          onBarcodeScanned={scanIndexReady ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'code128'] }}
        />
      }
      stageOverlay={!scanIndexReady ? <StagePill text="Preparing scanner..." color={T.nav} /> : null}
    />
  );
}

const st = StyleSheet.create({
  center: { flex: 1, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  waitText: { color: '#fff', fontWeight: '900', fontSize: 15, textAlign: 'center' },
  closeBtn: {
    minHeight: 44,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: T.copper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontWeight: '900' },
});
