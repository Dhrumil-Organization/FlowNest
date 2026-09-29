// FILE: src/screens/checkingScannerNew/PrinterSheet.tsx
// Printer picker of the Checking Scanner (legacy "Select Printer" bottom modal):
// search by name / status, status colour (Idle/Online green, Offline red, else grey),
// "Print on <printer>" when a row is pending, "Done" otherwise.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Btn, HIT, Loader } from '../inquiry/ui';
import { Printer } from './checkingScannerApi';

/** legacy getPrinterStatusColor */
const statusColor = (st: string) => {
  if (!st || st === 'Idle' || st === 'Online') return T.green;
  if (st === 'Offline') return T.red;
  return T.muted;
};

export function PrinterSheet({
  visible, subtitle, printers, printer, loading, error, pending, printing, onSelect, onReload, onClose, onPrint,
}: {
  visible: boolean;
  subtitle?: string;
  printers: Printer[];
  printer: string;
  loading: boolean;
  error: string;
  pending: boolean;
  printing: boolean;
  onSelect: (p: Printer) => void;
  onReload: () => void;
  onClose: () => void;
  onPrint: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [q, setQ] = useState('');
  useEffect(() => { if (!visible) setQ(''); }, [visible]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return printers;
    return printers.filter((p) => String(p?.Name || '').toLowerCase().includes(t) || String(p?.StatusText || '').toLowerCase().includes(t));
  }, [printers, q]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { maxHeight: Math.round(height * 0.86) }, width >= 760 && { maxWidth: 520 }]}>
          <View style={s.head}>
            <Icon name="print" size={20} color={T.copper} />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Select Printer</Text>
              {!!subtitle && <Text style={s.sub} numberOfLines={1}>{subtitle}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={21} color={T.muted} /></TouchableOpacity>
          </View>
          <View style={s.search}>
            <Icon name="search" size={16} color={T.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search printer..." placeholderTextColor={T.muted} style={s.searchInput} autoCorrect={false} />
            <TouchableOpacity onPress={onReload} hitSlop={HIT}><Icon name="refresh" size={17} color={T.muted} /></TouchableOpacity>
          </View>
          {loading ? <Loader label="Loading printers…" /> : (
            <FlatList
              data={list}
              keyExtractor={(p, i) => `${p.Name}-${i}`}
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              ListEmptyComponent={<Text style={s.empty}>{error || 'No printers'}</Text>}
              renderItem={({ item }) => {
                const on = item.Name === printer;
                return (
                  <TouchableOpacity onPress={() => onSelect(item)} style={[s.row, on && s.rowOn]} activeOpacity={0.7}>
                    <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} size={19} color={on ? T.copper : T.muted} />
                    <Text style={s.name} numberOfLines={1}>{item.Name}</Text>
                    <Text style={[s.status, { color: statusColor(item.StatusText) }]}>{item.StatusText || 'Idle'}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
          <View style={s.foot}>
            {pending ? (
              <Btn title={`Print on ${printer || '...'}`} icon="print" variant="accent" loading={printing} disabled={!printer} onPress={onPrint} style={{ flex: 1 }} />
            ) : printer ? (
              <Btn title="Done" icon="check" variant="accent" onPress={onClose} style={{ flex: 1 }} />
            ) : (
              <Btn title="Close" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(13,27,42,0.5)', justifyContent: 'center', padding: 14 },
  sheet: { backgroundColor: T.bg, borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 520, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 14, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  title: { fontSize: 15, fontWeight: '900', color: T.ink },
  sub: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 42, margin: 12, marginBottom: 6, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 10 },
  searchInput: { flex: 1, fontSize: 13, color: T.ink, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.hair, borderRadius: 6 },
  rowOn: { backgroundColor: `${T.copper}12` },
  name: { flex: 1, fontSize: 13.5, fontWeight: '800', color: T.ink },
  status: { fontSize: 11.5, fontWeight: '800' },
  empty: { textAlign: 'center', color: T.muted, fontWeight: '600', paddingVertical: 20 },
  foot: { flexDirection: 'row', gap: 8, padding: 12 },
});
