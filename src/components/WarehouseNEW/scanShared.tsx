// FILE: src/components/WarehouseNEW/scanShared.tsx
// Everything legacy duplicated between WarehouseQRScanner.tsx (hardware / Urovo)
// and WarehouseQRCameraScanner.tsx (expo-camera):
//   - the scanned-rows session (seeded with the rows already selected),
//     duplicate guard by stock-row key, status card texts + animation and its
//     auto reset (1800 ms after success, 2200 ms otherwise)
//   - the screen layout: close / title, scan frame, status card, "Scanned
//     Cartons (n)" list with CLEAR ALL and DONE.
// NEW layout: the scanner lives inside the module (below the global AppHeader)
// instead of a full-screen black stack screen; on tablet / web the scanned list
// sits beside the scan stage.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import {
  getCartonKey,
  getCartonName,
  getStockRowKey,
  NEXT_STATUS,
  READY_STATUS,
  Row,
  ScanStatus,
  ScanStatusType,
} from './model';

export function useScanSession(selected: Record<string, Row>) {
  const [scanned, setScanned] = useState<Record<string, Row>>(selected || {});
  const [status, setStatus] = useState<ScanStatus>(READY_STATUS);
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timers = useRef<any[]>([]);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    };
  }, []);

  /** setTimeout that is cancelled when the scanner step closes. */
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      if (alive.current) fn();
    }, ms);
    timers.current.push(t);
    return t;
  };

  const selectedCartSet = useMemo(() => {
    const set = new Set<string>();
    Object.values(scanned || {}).forEach((row) => {
      const key = getStockRowKey(row);
      if (key) set.add(key);
    });
    return set;
  }, [scanned]);

  const scannedRows = useMemo(() => Object.values(scanned || {}).reverse(), [scanned]);

  const playStatusAnimation = (type: ScanStatusType) => {
    scaleAnim.setValue(0.7);
    opacityAnim.setValue(0);
    const useNativeDriver = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 1, duration: 250, easing: Easing.out(Easing.back(1.5)), useNativeDriver }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 160, useNativeDriver }),
    ]).start();
    later(() => setStatus(NEXT_STATUS), type === 'success' ? 1800 : 2200);
  };

  const setScanStatus = (type: ScanStatusType, title: string, message: string) => {
    setStatus({ type, title, message });
    playStatusAnimation(type);
  };

  const markSelected = (row: Row) => {
    const cartKey = getCartonKey(row);
    const stockRowKey = getStockRowKey(row);
    const displayCarton = getCartonName(row) || cartKey;

    if (!cartKey || !stockRowKey) {
      setScanStatus('error', 'Invalid Carton', 'Carton number missing');
      return false;
    }
    if (selectedCartSet.has(stockRowKey)) {
      setScanStatus('duplicate', 'Already Scanned', `Carton ${displayCarton} already selected`);
      return false;
    }

    setScanned((prev) => ({
      ...prev,
      [stockRowKey]: { ...row, _scanCartonKey: cartKey, _scanStockRowKey: stockRowKey },
    }));
    setScanStatus('success', 'Scan Successful!', `Carton ${displayCarton} added`);
    return true;
  };

  /** Result of findIndexedQrMatch -> status card / selection (legacy processScan tail). */
  const applyMatch = (result: { row: Row | null; ambiguous: boolean }) => {
    if (result.ambiguous) {
      setScanStatus('error', 'Multiple Stock Matches', 'More than one stock row matches this QR');
      return;
    }
    if (!result.row) {
      setScanStatus('error', 'No Match', 'Carton not found in loaded list');
      return;
    }
    markSelected(result.row);
  };

  return { scanned, setScanned, status, scaleAnim, opacityAnim, scannedRows, applyMatch, later };
}

export type ScanSession = ReturnType<typeof useScanSession>;

const statusIconOf = (type: ScanStatusType) =>
  type === 'success' ? 'check-circle' : type === 'duplicate' ? 'error' : type === 'error' ? 'cancel' : 'qr-code-scanner';
const statusColorOf = (type: ScanStatusType) =>
  type === 'success' ? T.green : type === 'duplicate' ? T.amber : type === 'error' ? T.red : T.copper;

export function ScanLayout({
  title,
  hint,
  session,
  onClose,
  onDone,
  torch,
  onToggleTorch,
  stage,
  stageOverlay,
  panelExtra,
}: {
  title: string;
  hint: string;
  session: ScanSession;
  onClose: () => void;
  onDone: () => void;
  torch?: 'on' | 'off';
  onToggleTorch?: () => void;
  /** fills the scan stage (camera preview) */
  stage?: React.ReactNode;
  /** small pills drawn above the stage (scanner mode, "Preparing scanner...") */
  stageOverlay?: React.ReactNode;
  /** extra block above DONE (hardware scanner debug lines) */
  panelExtra?: React.ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 768;
  // legacy sizes: sheet = min(300, 32% of height), frame = min(285, 72% of width)
  const panelHeight = Math.min(300, Math.round(height * 0.32));
  const frame = Math.max(110, Math.min(285, Math.round((wide ? width * 0.4 : width) * 0.72), Math.round(height * 0.26)));
  const { status, scannedRows } = session;
  const color = statusColorOf(status.type);

  return (
    <View style={st.root}>
      <View style={st.header}>
        <TouchableOpacity onPress={onClose} style={st.iconCircle} accessibilityRole="button" accessibilityLabel="Close scanner">
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle} numberOfLines={1}>{title}</Text>
        {onToggleTorch ? (
          <TouchableOpacity onPress={onToggleTorch} style={st.iconCircle} accessibilityRole="button" accessibilityLabel="Toggle torch">
            <Icon name={torch === 'on' ? 'flash-off' : 'flash-on'} size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <View style={[st.body, wide && { flexDirection: 'row' }]}>
        <View style={st.stage}>
          {stage}
          <View pointerEvents="none" style={st.stageCenter}>
            <Text style={st.hint} numberOfLines={2}>{hint}</Text>
            <View style={{ width: frame, height: frame }}>
              <View style={[st.corner, st.tl]} />
              <View style={[st.corner, st.tr]} />
              <View style={[st.corner, st.bl]} />
              <View style={[st.corner, st.br]} />
            </View>
          </View>
          {stageOverlay ? <View pointerEvents="none" style={st.overlayTop}>{stageOverlay}</View> : null}
          {status.type !== 'ready' ? (
            <Animated.View
              pointerEvents="none"
              style={[st.statusCard, { borderColor: color, transform: [{ scale: session.scaleAnim }], opacity: session.opacityAnim }]}
            >
              <Icon name={statusIconOf(status.type) as any} size={40} color={color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.statusTitle} numberOfLines={1}>{status.title}</Text>
                <Text style={st.statusMessage} numberOfLines={2}>{status.message}</Text>
              </View>
            </Animated.View>
          ) : null}
        </View>

        <View style={[st.panel, wide ? st.panelWide : { height: panelHeight }]}>
          <View style={st.panelTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.panelTitle} numberOfLines={1}>Scanned Cartons ({scannedRows.length})</Text>
              <Text style={st.panelSub} numberOfLines={1}>{scannedRows.length} carton(s) selected</Text>
            </View>
            {scannedRows.length > 0 ? (
              <TouchableOpacity onPress={() => session.setScanned({})} style={st.clearBtn} accessibilityRole="button">
                <Text style={st.clearText}>CLEAR ALL</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={scannedRows}
            keyExtractor={(item, index) => `${index}_${getCartonKey(item)}_${item?.cartno || item?.CartNo || ''}`}
            style={{ flex: 1, minHeight: 0 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View style={st.cartRow}>
                <View style={st.serial}>
                  <Text style={st.serialText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.cartTitle} numberOfLines={1}>{getCartonName(item)}</Text>
                  <Text style={st.cartLine} numberOfLines={1}>
                    {item?.TranName || item?.tranname || 'Packing'} | {item?.vouno || item?.VouNo || '-'}
                  </Text>
                  <Text style={st.cartLine} numberOfLines={1}>
                    {item?.ItmName || item?.itmname || ''} {item?.GrdName ? `| Grade: ${item.GrdName}` : ''}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={st.empty}>No cartons scanned yet</Text>}
          />

          {panelExtra}

          <TouchableOpacity onPress={onDone} style={st.done} accessibilityRole="button" accessibilityLabel="Done">
            <Text style={st.doneText}>DONE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/** Small rounded label drawn over the scan stage. */
export function StagePill({ text, color }: { text: string; color: string }) {
  return (
    <View style={[st.pill, { backgroundColor: color }]}>
      <Text style={st.pillText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.nav },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, minWidth: 0, textAlign: 'center', color: '#fff', fontSize: 17, fontWeight: '900' },
  body: { flex: 1, minHeight: 0, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  stage: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: T.ink,
  },
  stageCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 10 },
  hint: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 14, textAlign: 'center' },
  corner: { position: 'absolute', width: 44, height: 44, borderColor: T.copper },
  tl: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 },
  overlayTop: { position: 'absolute', top: 10, left: 10, right: 10, alignItems: 'center', gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, maxWidth: '100%' },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  statusCard: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    minHeight: 68,
    borderRadius: 16,
    backgroundColor: T.surface,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...S.card,
  },
  statusTitle: { fontSize: 16, fontWeight: '900', color: T.ink },
  statusMessage: { marginTop: 2, fontSize: 13, fontWeight: '700', color: T.nav },
  panel: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  panelWide: { width: 380, borderRadius: 16, marginRight: 12, marginBottom: 10 },
  panelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  panelTitle: { fontSize: 16, fontWeight: '900', color: T.ink },
  panelSub: { marginTop: 2, fontSize: 12.5, fontWeight: '700', color: T.muted },
  clearBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  clearText: { color: T.copper, fontSize: 13, fontWeight: '900' },
  cartRow: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serial: { width: 34, height: 34, borderRadius: 9, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  serialText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  cartTitle: { color: T.ink, fontSize: 15, fontWeight: '900' },
  cartLine: { color: T.nav, fontSize: 12.5, fontWeight: '600', marginTop: 1 },
  empty: { color: T.muted, textAlign: 'center', marginTop: 16, fontWeight: '800' },
  done: { height: 48, borderRadius: 12, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
