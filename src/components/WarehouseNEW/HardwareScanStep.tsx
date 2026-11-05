// FILE: src/components/WarehouseNEW/HardwareScanStep.tsx
// Scanner step (hardware) — port of legacy Warehouse/WarehouseQRScanner.tsx.
// Three input paths, all through the same gate (800 ms cooldown) and matcher:
//   1. Urovo scan engine (laser trigger) via useUrovoScanner — Android only
//   2. keyboard-wedge scanners: an invisible, always re-focused TextInput;
//      text longer than 5 chars is taken 120 ms after the change, or on Enter
//   3. (same input) Enter / submit
// Matching: QR identity index built from each loaded carton's scancode /
// scancode1 -> exact carton no., else the "O"-prefix fallback; ambiguous and
// unknown codes are rejected with the legacy status texts.
import { T } from '@/src/theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { cleanScannerValue, findIndexedQrMatch, indexCartonRow, QrIndex, ScanParams, searchScanMatch } from './model';
import { ScanLayout, StagePill, useScanSession } from './scanShared';
import { useUrovoScanner } from './useUrovoScanner';

type Props = { params: ScanParams; onClose: () => void };

export default function HardwareScanStep({ params, onClose }: Props) {
  const { mode = 'ASSIGN', cartons = [], selected = {}, onScanResult } = params || ({} as ScanParams);
  const session = useScanSession(selected);
  const { later } = session;

  const processingRef = useRef(false);
  const [lastRawScan, setLastRawScan] = useState('');
  const [scannerMessage, setScannerMessage] = useState('Ready: press orange trigger button');

  const qrIdentityIndex = useMemo(() => {
    const index: QrIndex = new Map();
    cartons.forEach((row) => indexCartonRow(index, row));
    return index;
  }, [cartons]);

  const processScan = (value: any) => {
    const rawInput = cleanScannerValue(value);
    if (!rawInput) return;
    if (mode === 'SEARCH') {
      session.applyMatch(searchScanMatch(rawInput));
      return;
    }
    session.applyMatch(findIndexedQrMatch(qrIdentityIndex, rawInput));
  };

  const handleDone = () => {
    const finalRows = Object.values(session.scanned || {});
    onScanResult?.(finalRows);
    onClose();
  };

  // Urovo hardware scan engine (laser trigger) — same dedupe gate for every path.
  const handleHardwareScan = (value: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    processScan(value);
    later(() => {
      processingRef.current = false;
    }, 800);
  };

  const hwStatus = useUrovoScanner(handleHardwareScan);

  // Keyboard-wedge fallback: scans type into this invisible input (+ Enter).
  const [wedgeBuffer, setWedgeBuffer] = useState('');
  const wedgeRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      wedgeRef.current?.focus?.();
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const handleWedgeChange = (text: string) => {
    setWedgeBuffer(text);
    const clean = cleanScannerValue(text);
    if (clean.length > 5) {
      later(() => {
        const finalValue = cleanScannerValue(text);
        if (finalValue) {
          setWedgeBuffer('');
          setLastRawScan(finalValue);
          setScannerMessage(`Scan received: ${finalValue.substring(0, 40)}`);
          handleHardwareScan(finalValue);
          later(() => wedgeRef.current?.focus?.(), 50);
        }
      }, 120);
    }
  };

  const handleWedgeSubmit = () => {
    const v = cleanScannerValue(wedgeBuffer);
    setWedgeBuffer('');
    if (!v) {
      setScannerMessage('No scan text received. Check Scanner Output Mode.');
      return;
    }
    setLastRawScan(v);
    setScannerMessage(`Scan received: ${v.substring(0, 40)}`);
    handleHardwareScan(v);
    later(() => wedgeRef.current?.focus?.(), 50);
  };

  const pillColor = hwStatus.state === 'active' ? T.green : hwStatus.state === 'listening' ? T.amber : T.muted;
  const pillText =
    hwStatus.state === 'active'
      ? 'HW SCANNER: ACTIVE — use trigger'
      : hwStatus.state === 'listening'
        ? 'HW: listening (check Scanner Settings)'
        : 'CAMERA ONLY';

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        ref={wedgeRef}
        value={wedgeBuffer}
        onChangeText={handleWedgeChange}
        onSubmitEditing={handleWedgeSubmit}
        onKeyPress={({ nativeEvent }: any) => {
          if (nativeEvent.key === 'Enter') handleWedgeSubmit();
        }}
        blurOnSubmit={false}
        autoFocus
        showSoftInputOnFocus={false}
        caretHidden
        style={st.wedgeInput}
        accessibilityLabel="Hardware scanner input"
      />
      <ScanLayout
        title={mode === 'SEARCH' ? 'Search Scan' : mode === 'TRANSFER' ? 'Transfer Scan' : 'Assign Scan'}
        hint="Press orange trigger button"
        session={session}
        onClose={onClose}
        onDone={handleDone}
        stageOverlay={<StagePill text={pillText} color={pillColor} />}
        panelExtra={
          <View style={st.debugBox}>
            <Text style={st.debugText} numberOfLines={1}>{scannerMessage}</Text>
            {lastRawScan ? <Text style={st.debugText} numberOfLines={1}>Last: {lastRawScan.substring(0, 60)}</Text> : null}
          </View>
        }
      />
    </View>
  );
}

const st = StyleSheet.create({
  wedgeInput: { position: 'absolute', top: -100, left: 0, width: 1, height: 1, opacity: 0 },
  debugBox: { backgroundColor: T.alt, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 },
  debugText: { color: T.nav, fontSize: 12, fontWeight: '700' },
});
