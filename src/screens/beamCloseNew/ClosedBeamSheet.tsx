// FILE: src/screens/beamCloseNew/ClosedBeamSheet.tsx
// NEW ERP — Beam Close: "Load Beam" sheet (port of legacy components/BeamClose/SelectBeam.tsx).
//   • on open: GET get_checking_help (txntype beam_open_tablet, capital YearNo)
//   • local search across BeamNo / PlanNo / MacCode / MacName / DsnCode / DsnName / WarpLen
//     with the legacy "Matched: …" hint
//   • Open Beam → confirm "Do you want to open this Beam entry X?" → POST add_beam_open
//     → success === true: "Saved successfully.", patch form (BeamNo/Dsn/Mac), close;
//       else Warning with server message; exception → "Something went wrong".
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { EmptyState, HIT, Loader, MONO } from '../inquiry/ui';
import { BeamCloseApi, dmy, str, TXN_CLOSE } from './beamCloseApi';

type Values = Record<string, any>;

const has = (v: any, s: string) => (v === null || v === undefined ? false : v.toString().toLowerCase().includes(s));

/** legacy getMatchType */
const matchOf = (item: any, search: string) => {
  const s = search.toLowerCase();
  if (has(item.BeamNo, s)) return `Matched: Beam No (${item.BeamNo})`;
  if (has(item.PlanNo, s)) return `Matched: Plan No (${item.PlanNo})`;
  if (has(item.MacCode, s)) return `Matched: Machine Code (${item.MacCode})`;
  if (has(item.MacName, s)) return `Matched: Machine Name (${item.MacName})`;
  if (has(item.DsnCode, s)) return `Matched: Design Code (${item.DsnCode})`;
  if (has(item.DsnName, s)) return `Matched: Design Name (${item.DsnName})`;
  if (has(item.WarpLen, s)) return `Matched: Balance (${item.WarpLen})`;
  return '';
};

export function ClosedBeamSheet({ visible, onClose, api, values, onOpened }: {
  visible: boolean;
  onClose: () => void;
  api: BeamCloseApi;
  values: Values;
  /** legacy setFormState patch after a successful add_beam_open */
  onOpened: (patch: Values) => void;
}) {
  const { width, height } = useWindowDimensions();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await api.closedBeams({ yearNo: values.YearNo, chkDate: dmy(values.CheckingDate) }));
    } catch (e: any) {
      // legacy only logged the error and kept the previous list
      setError(e?.response?.data?.message || e?.message || 'Unable to load beams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return list.filter((i) =>
      has(i.BeamNo, s) || has(i.PlanNo, s) || has(i.MacCode, s) || has(i.MacName, s)
      || has(i.DsnCode, s) || has(i.DsnName, s) || has(i.WarpLen, s));
  }, [list, q]);

  const save = async (row: any) => {
    setLoading(true);
    try {
      const d1obj = {
        font: 0,
        PrpCode: row.PrpCode,
        UId: row.UId,
        PlanUId: row.PlanUId,
        BeamUId: row.BeamUId,
        MacCode: row.MacCode,
        MacName: row.MacName,
        BeamNo: row.BeamNo,
        PlanNo: row.PlanNo,
        DsnCode: row.DsnCode,
        DsnName: row.DsnName,
        TakaNo: row.TakaNo,
        WarpLen: row.WarpLen,
        QltWt: row.QltWt,
        islasttakatrack: row.islasttakatrack,
        Status: row.Status,
        ShfCode: 0,
        YearNo: values.YearNo,
        ChkDate: dmy(values.CheckingDate),
        txntype: TXN_CLOSE,
        islasttaka: row.islasttaka || '',
        SrNo: 0,
        isalldata: 0,
      };
      const payload = {
        ShfCode: 0,
        ChkDate: dmy(values.CheckingDate),
        MacGrp: values.MacGrp || '',
        PrpCode: row.PrpCode,
        prpcode: row.PrpCode,
        YearNo: values.YearNo,
        yearno: values.YearNo,
        d1: [d1obj],
        d2: values.d2 || [],
        txntype: TXN_CLOSE,
      };
      const res = await api.addOpen(payload);
      if (res?.success === true) {
        AppAlert.alert('Success', 'Saved successfully.');
        onOpened({ BeamNo: row.BeamNo, DsnCode: row.DsnCode, DsnName: row.DsnName, MacCode: row.MacCode, MacName: row.MacName });
        onClose();
      } else {
        AppAlert.alert('Warning', str(res?.message));
      }
    } catch {
      AppAlert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const confirm = (row: any) => {
    if (!row) return;
    AppAlert.alert('Confirm', `Do you want to open this Beam entry ${row.BeamNo}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: () => { void save(row); } },
    ], { cancelable: true });
  };

  const cols = width >= 1100 ? 2 : 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { height: Math.round(height * 0.9) }, width >= 760 && { maxWidth: cols > 1 ? 980 : 680 }]}>
          <View style={s.head}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>Closed Beam List</Text>
              <Text style={s.sub} numberOfLines={1}>{dmy(values.CheckingDate)} · tap Open Beam to re-open</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={21} color={T.muted} /></TouchableOpacity>
          </View>
          <View style={s.search}>
            <Icon name="search" size={16} color={T.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search beam, plan, machine, design, balance…"
              placeholderTextColor={T.muted}
              style={s.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {!!q && (
              <TouchableOpacity onPress={() => { setQ(''); Keyboard.dismiss(); }} hitSlop={HIT}>
                <Icon name="close" size={15} color={T.muted} />
              </TouchableOpacity>
            )}
          </View>
          {loading ? <Loader label="Loading…" /> : (
            <FlatList
              key={`c${cols}`}
              data={filtered}
              numColumns={cols}
              columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
              keyExtractor={(_, i) => String(i)}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 12, paddingTop: 4 }}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={error ? (
                <TouchableOpacity onPress={fetchList} style={s.err}><Icon name="error-outline" size={15} color={T.red} /><Text style={s.errText}>{error} — tap to retry</Text></TouchableOpacity>
              ) : null}
              ListEmptyComponent={<EmptyState icon="view-week" title="No Beam Found" subtitle={q ? 'Try a different search' : undefined} />}
              renderItem={({ item }) => {
                const m = q ? matchOf(item, q) : '';
                return (
                  <View style={[s.card, { flex: 1 / cols }]}>
                    <View style={s.cardHead}>
                      <Text style={s.beamNo}>Beam {str(item.BeamNo)}</Text>
                      <Text style={s.plan}>Plan {str(item.PlanNo)}</Text>
                    </View>
                    <Text style={s.line}><Text style={s.k}>Machine  </Text>{str(item.MacCode)} - {str(item.MacName)}</Text>
                    <Text style={s.line}><Text style={s.k}>Design  </Text>{str(item.DsnCode)} - {str(item.DsnName)}</Text>
                    {!!m && <Text style={s.match}>{m}</Text>}
                    <View style={s.foot}>
                      <View>
                        <Text style={s.k}>BALANCE</Text>
                        <Text style={s.bal}>{str(item.WarpLen)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => confirm(item)} style={s.openBtn} activeOpacity={0.8}>
                        <Icon name="lock-open" size={15} color="#fff" />
                        <Text style={s.openText}>Open Beam</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  sheet: { width: '100%', backgroundColor: T.bg, borderRadius: 16, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  title: { fontSize: 16, fontWeight: '900', color: T.ink },
  sub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 42, margin: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 11 },
  searchInput: { flex: 1, fontSize: 13.5, color: T.ink, paddingVertical: 0 },
  err: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, backgroundColor: `${T.red}10`, marginBottom: 8 },
  errText: { flex: 1, fontSize: 12, fontWeight: '700', color: T.red },
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, borderLeftColor: T.copper, padding: 12, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  beamNo: { fontSize: 15, fontWeight: '900', color: T.ink, fontFamily: MONO },
  plan: { fontSize: 12, fontWeight: '800', color: T.muted, fontFamily: MONO },
  line: { fontSize: 13, fontWeight: '700', color: T.ink, marginBottom: 3 },
  k: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.3 },
  match: { fontSize: 11.5, fontStyle: 'italic', fontWeight: '600', color: T.blue, marginTop: 2 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: T.hair },
  bal: { fontSize: 15, fontWeight: '900', color: T.green, fontFamily: MONO },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.blue, borderRadius: 18, paddingHorizontal: 14, height: 34 },
  openText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
});
