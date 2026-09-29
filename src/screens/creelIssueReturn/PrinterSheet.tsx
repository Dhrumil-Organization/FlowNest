// FILE: src/screens/creelIssueReturn/PrinterSheet.tsx
// Select printer (GET {API}/api/printers) + remember it in 'lastSelectedPrinter'
// (same as legacy getAllPrinters / selectPrinter).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Btn, ErrorBox, HIT, Loader } from '../inquiry/ui';
import { CreelIssueReturnApi, lastPrinter } from './creelIssueReturnApi';

export type Printer = { Name: string; StatusText: string };

/** Loads printers and restores the last used one (legacy getAllPrinters). */
export function usePrinters(api: CreelIssueReturnApi) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.printers();
      setPrinters(list);
      const last = await lastPrinter.get();
      const hit = last ? list.find((p) => p.Name === last) : null;
      if (hit) setPrinter(hit);
    } catch {
      setError('Unable to load printers');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const choose = useCallback((p: Printer) => { setPrinter(p); void lastPrinter.set(p.Name); }, []);
  return { printers, printer, choose, loading, error, load };
}

export function PrinterSheet({ visible, title = 'Select Printer', subtitle, state, onClose, onPrint, printing }: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  state: ReturnType<typeof usePrinters>;
  onClose: () => void;
  onPrint: (p: Printer) => void;
  printing?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const [q, setQ] = useState('');
  useEffect(() => { if (visible) { setQ(''); if (!state.printers.length && !state.loading) void state.load(); } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? state.printers.filter((p) => p.Name.toLowerCase().includes(t)) : state.printers;
  }, [state.printers, q]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { maxHeight: Math.round(height * 0.86) }, width >= 760 && { maxWidth: 520 }]}>
          <View style={s.head}>
            <Icon name="print" size={20} color={T.copper} />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{title}</Text>
              {!!subtitle && <Text style={s.sub} numberOfLines={1}>{subtitle}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={21} color={T.muted} /></TouchableOpacity>
          </View>
          <View style={s.search}>
            <Icon name="search" size={16} color={T.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search printer…" placeholderTextColor={T.muted} style={s.searchInput} autoCorrect={false} />
            <TouchableOpacity onPress={state.load} hitSlop={HIT}><Icon name="refresh" size={17} color={T.muted} /></TouchableOpacity>
          </View>
          {state.loading ? <Loader label="Loading printers…" /> : state.error ? (
            <View style={{ padding: 12 }}><ErrorBox text={state.error} onRetry={state.load} /></View>
          ) : (
            <FlatList
              data={list}
              keyExtractor={(p, i) => `${p.Name}-${i}`}
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              ListEmptyComponent={<Text style={s.empty}>No printer found</Text>}
              renderItem={({ item }) => {
                const on = state.printer?.Name === item.Name;
                const off = item.StatusText === 'Offline';
                return (
                  <TouchableOpacity onPress={() => state.choose(item)} style={[s.row, on && s.rowOn]} activeOpacity={0.7}>
                    <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} size={19} color={on ? T.copper : T.muted} />
                    <Text style={s.name} numberOfLines={1}>{item.Name}</Text>
                    <Text style={[s.status, { color: off ? T.red : T.green }]}>{item.StatusText}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
          <View style={s.foot}>
            <Btn title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Btn
              title={printing ? 'Printing…' : 'Print Sticker'}
              icon="print"
              variant="accent"
              loading={printing}
              disabled={!state.printer}
              onPress={() => state.printer && onPrint(state.printer)}
              style={{ flex: 2 }}
            />
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
