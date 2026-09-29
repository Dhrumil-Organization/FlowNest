// FILE: src/screens/creelManagement/CreelParts.tsx
// NEW ERP — Creel Management: QR scanner modal + manual carton search sheet.
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { Btn, HIT, MONO } from '../inquiry/ui';
import { str } from './creelManagementApi';

/** Camera QR scanner (legacy: expo-camera CameraView, qr only, 2s scan lock). */
export function ScannerModal({ visible, onClose, onScan }: { visible: boolean; onClose: () => void; onScan: (v: string) => void }) {
  const [perm, requestPerm] = useCameraPermissions();
  const lock = useRef(false);
  useEffect(() => {
    if (visible) { lock.current = false; if (perm && !perm.granted && perm.canAskAgain) void requestPerm(); }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={s.scanTop}>
          <Text style={s.scanTitle}>Scan QR Code</Text>
          <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={24} color="#fff" /></TouchableOpacity>
        </View>
        {perm?.granted ? (
          <View style={{ flex: 1 }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }: { data: string }) => {
                if (lock.current) return;
                lock.current = true;
                setTimeout(() => { lock.current = false; }, 2000);
                onScan(data || '');
              }}
            />
            <View style={s.frameWrap} pointerEvents="none"><View style={s.frame} /></View>
          </View>
        ) : (
          <View style={s.scanNo}>
            <Icon name="no-photography" size={36} color="#fff" />
            <Text style={s.scanNoText}>No camera permission or device not available</Text>
            <Btn title="Allow camera" icon="photo-camera" variant="accent" onPress={() => requestPerm()} />
          </View>
        )}
        <View style={{ padding: 16 }}><Btn title="Close Scanner" variant="secondary" onPress={onClose} /></View>
      </View>
    </Modal>
  );
}

/** Manual carton search (legacy: get_carton_search, pick a row, OK). */
export function CartonSearchSheet({ visible, onClose, search, onPick }: {
  visible: boolean; onClose: () => void; search: (t: string) => Promise<any[]>; onPick: (r: any) => void;
}) {
  const { width, height } = useWindowDimensions();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (!visible) { setQ(''); setRows([]); setSel(null); } }, [visible]);

  const run = async () => {
    if (!q) { AppAlert.alert('Enter carton number'); return; }
    setLoading(true);
    try {
      const list = await search(q.trim());
      setRows(list);
      setSel(null);
      if (!list.length) AppAlert.alert('No data found');
    } catch {
      AppAlert.alert('Error while searching');
    } finally {
      setLoading(false);
    }
  };

  const ok = () => {
    if (!sel) { AppAlert.alert('Select carton first'); return; }
    onPick(sel);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { maxHeight: Math.round(height * 0.86) }, width >= 760 && { maxWidth: 560 }]}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>Manual Search</Text>
            <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={21} color={T.muted} /></TouchableOpacity>
          </View>
          <View style={s.searchRow}>
            <TextInput value={q} onChangeText={setQ} placeholder="Enter Carton No" placeholderTextColor={T.muted} style={s.sheetInput} autoFocus onSubmitEditing={run} returnKeyType="search" autoCapitalize="characters" />
            <Btn title="Search" icon="search" onPress={run} loading={loading} />
          </View>
          <FlatList
            data={rows}
            keyExtractor={(r, i) => `${str(r.CartNo)}-${i}`}
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
            ListEmptyComponent={loading ? <ActivityIndicator color={T.copper} style={{ padding: 16 }} /> : null}
            renderItem={({ item }) => {
              const on = sel?.CartNo === item.CartNo;
              return (
                <TouchableOpacity onPress={() => setSel(item)} style={[s.sRow, on && s.sRowOn]} activeOpacity={0.7}>
                  <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} size={18} color={on ? T.copper : T.muted} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.cNo}>{str(item.CartNo)}</Text>
                    <Text style={s.cSub} numberOfLines={1}>{str(item.ItmName)} / {str(item.MerName)} / {str(item.ShdName)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.cQty}>Wt {str(item.Wt)}</Text>
                    <Text style={s.cSub}>Chees {str(item.Chees)}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          <View style={s.sheetFoot}>
            <Btn title="Close" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Btn title="OK" icon="check" variant="accent" onPress={ok} disabled={!rows.length} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(13,27,42,0.5)', justifyContent: 'center', padding: 14 },
  sheet: { backgroundColor: T.bg, borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 560, alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontSize: 15, fontWeight: '900', color: T.ink },
  searchRow: { flexDirection: 'row', gap: 8, padding: 12 },
  sheetInput: { flex: 1, height: 44, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 11, fontSize: 14, fontWeight: '800', color: T.ink, fontFamily: MONO },
  sheetFoot: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surface },
  sRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.hair, borderRadius: 8 },
  sRowOn: { backgroundColor: `${T.copper}12` },
  cNo: { fontSize: 14, fontWeight: '900', color: T.ink, fontFamily: MONO },
  cSub: { fontSize: 11.5, fontWeight: '600', color: T.muted },
  cQty: { fontSize: 13, fontWeight: '900', color: T.copper, fontFamily: MONO },
  scanTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 44 },
  scanTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 220, height: 220, borderWidth: 2, borderColor: '#00ffcc', borderRadius: 12 },
  scanNo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  scanNoText: { color: '#fff', fontSize: 13.5, fontWeight: '700', textAlign: 'center' },
});
