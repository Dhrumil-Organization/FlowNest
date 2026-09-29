// FILE: src/screens/checkingScannerNew/FaultsSheet.tsx
// NEW ERP port of components/CheckingScanner/ScannerFaultsModal.tsx + FaultSelector.tsx
// ("Faults" of a saved Scanner List row). Same logic:
//   browse  GET  get_checking_fault_help  → default_faults (pickable catalog),
//                                            filterdata (saved, Remark non-blank)
//   add     POST add_checking_fault { ...base, IsEntry:'1', d1: [...filterdata, newRow] }
//           newRow.SubSr: catalog SubSr if RsnCode not yet added, else max(SubSr of same
//           RsnCode)+1; <=0 → 1; bumped until unique among filterdata.
//   remove  POST add_checking_fault { ...base, IsEntry:'1', d1: filterdata with that row's Remark '' }
//   after every success → browse again + onSaved() (parent refreshes the list).
//   Fault Value: digits / '-' / space only; ONE number or ONE range, checked against Meter.
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HIT, MONO, useWide } from '../inquiry/ui';
import { CheckingScannerApi, faultModalBase, str } from './checkingScannerApi';

export interface FaultItem {
  Faults: string;
  RDesc: string;
  Remark?: string;
  RsnCode: string;
  SrNo: string;
  SubSr: string;
  UId: string;
}

const toInt = (v: any) => {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
};
const sanitizeRemarkInput = (text: string) => text.replace(/[^0-9\- ]/g, '');

/** FaultSelector.validateFaultValue — same messages. */
const validateFaultValue = (raw: string, meter: any): string | null => {
  const meterNum = parseFloat(String(meter ?? '').replace(/[^0-9.]/g, ''));
  const meterValue = Number.isFinite(meterNum) ? meterNum : 0;
  const tokens = raw.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
  if (tokens.length === 0) return 'Please enter a Fault Value.';
  if (tokens.length > 1) return 'Only one value or one range is allowed at a time (e.g. "44" or "55-77").';
  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = token.match(/^(\d+)$/);
    if (singleMatch) {
      const n = parseInt(singleMatch[1], 10);
      if (n === 0) return `"${token}" cannot be 0.`;
      if (meterValue > 0 && n > meterValue) return `"${token}" cannot be greater than Meter (${meterValue}).`;
      continue;
    }
    if (rangeMatch) {
      if (meterValue <= 1) return `Range values like "${token}" are not allowed when Meter is ${meterValue}.`;
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start === 0 || end === 0) return `"${token}" cannot contain 0.`;
      if (start > meterValue) return `Start value in "${token}" cannot be greater than Meter (${meterValue}).`;
      if (end > meterValue) return `End value in "${token}" cannot be greater than Meter (${meterValue}).`;
      if (end < 1) return `End value in "${token}" cannot be less than 1.`;
      if (end <= start) return `End value in "${token}" must be greater than the start value.`;
      continue;
    }
    return `"${token}" is not valid. Use a number (e.g. 12) or a range (e.g. 12-34).`;
  }
  return null;
};

export function FaultsSheet({ api, visible, row, onClose, onSaved }: {
  api: CheckingScannerApi; visible: boolean; row: any; onClose: () => void; onSaved?: () => void;
}) {
  const { wide } = useWide();
  const [catalog, setCatalog] = useState<FaultItem[]>([]);
  const [added, setAdded] = useState<FaultItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [faultValue, setFaultValue] = useState('');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!row) return;
    setCatalogLoading(true);
    try {
      const data = await api.checkingFaultHelp(faultModalBase(row));
      const payload = data?.response || data || {};
      setCatalog(Array.isArray(payload.default_faults) ? payload.default_faults : []);
      setAdded((Array.isArray(payload.filterdata) ? payload.filterdata : []).filter((i: FaultItem) => String(i.Remark ?? '').trim() !== ''));
    } catch {
      setCatalog([]);
      setAdded([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [api, row]);

  useEffect(() => { if (visible) void load(); }, [visible, row]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!visible) { setQ(''); setFaultValue(''); setMsg(''); } }, [visible]);

  // clear the Fault Value box the instant a save / remove finishes
  const prevBusy = useRef(busy);
  useEffect(() => { if (prevBusy.current && !busy) setFaultValue(''); prevBusy.current = busy; }, [busy]);

  const persist = (d1: FaultItem[]) => api.addCheckingFault({ ...faultModalBase(row), IsEntry: '1', d1 });

  const nextSubSrFor = (fault: FaultItem) => {
    const used = new Set(added.map((e) => e.SubSr));
    const same = added.filter((e) => e.RsnCode === fault.RsnCode);
    let cand = same.length === 0 ? toInt(fault.SubSr) : Math.max(...same.map((e) => toInt(e.SubSr))) + 1;
    if (cand <= 0) cand = 1;
    while (used.has(String(cand))) cand += 1;
    return String(cand);
  };

  const run = async (key: string, d1: FaultItem[], failMsg: string, errMsg: string) => {
    setBusy(true);
    setBusyKey(key);
    try {
      const res = await persist(d1);
      if (res?.success) { await load(); onSaved?.(); } else AppAlert.alert('Error', res?.message || failMsg);
    } catch {
      AppAlert.alert('Error', errMsg);
    } finally {
      setBusy(false);
      setBusyKey(null);
    }
  };

  const add = (fault: FaultItem) => {
    if (busy) return;
    const value = faultValue.trim();
    const err = validateFaultValue(value, row?.Qty || row?.Meter || '');
    if (err) { setMsg(err); return; }
    const newRow: FaultItem = {
      UId: fault.UId, SrNo: fault.SrNo, SubSr: nextSubSrFor(fault), RsnCode: fault.RsnCode,
      RDesc: fault.RDesc, Faults: fault.Faults, Remark: value,
    };
    void run(`${fault.UId}_${fault.SubSr}`, [...added, newRow], 'Fault save failed', 'Unable to save fault.');
  };

  const remove = (entry: FaultItem) => {
    const d1 = added.map((e) => (e.RsnCode === entry.RsnCode && e.SubSr === entry.SubSr ? { ...e, Remark: '' } : e));
    void run(`${entry.RsnCode}_${entry.SubSr}`, d1, 'Unable to remove fault', 'Unable to remove fault.');
  };

  const t = q.trim().toLowerCase();
  const match = (i: FaultItem) => !t || [i.RDesc, i.RsnCode, i.SubSr, i.Faults, i.Remark].some((v) => str(v).toLowerCase().includes(t));
  const fCatalog = useMemo(() => catalog.filter(match), [catalog, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const fAdded = useMemo(() => added.filter(match), [added, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const meter = str(row?.Qty || row?.Meter);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.top}>
          <View style={[s.topInner]}>
            <Icon name="report-problem" size={20} color={T.amber} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>Scanner Faults</Text>
              <Text style={s.sub} numberOfLines={1}>{str(row?.DsnName)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={HIT} style={s.close}><Icon name="close" size={20} color={T.ink} /></TouchableOpacity>
          </View>
        </View>
        <View style={[s.page, wide && { paddingHorizontal: 24 }]}>
          <View style={s.info}>
            <Info k="BEAM NO" v={str(row?.BeamNo) || '-'} />
            <View style={s.div} />
            <Info k="TAKA NO" v={str(row?.TakaNo) || '-'} />
            <View style={s.div} />
            <Info k="METER" v={meter || '-'} />
          </View>

          <Text style={s.label}>Fault Value <Text style={{ color: T.red }}>*</Text></Text>
          <TextInput
            style={[s.input, !!msg && { borderColor: T.red }]}
            placeholder="Enter value (e.g. 44 or 55-77)"
            placeholderTextColor={T.muted}
            value={faultValue}
            onChangeText={(x) => { setMsg(''); setFaultValue(sanitizeRemarkInput(x)); }}
            editable={!busy}
            keyboardType="numbers-and-punctuation"
          />
          {!!msg && <Text style={s.err}>{msg}</Text>}

          <View style={s.search}>
            <Icon name="search" size={17} color={T.muted} />
            <TextInput style={s.searchInput} placeholder="Search by description or code" placeholderTextColor={T.muted} value={q} onChangeText={setQ} autoCorrect={false} />
            {!!q && <TouchableOpacity onPress={() => setQ('')} hitSlop={HIT}><Icon name="close" size={16} color={T.muted} /></TouchableOpacity>}
          </View>

          <Text style={s.section}>SELECT FAULTS <Text style={{ color: T.red }}>*</Text></Text>
          <View style={[s.box, { flex: 3 }]}>
            {catalogLoading ? <ActivityIndicator color={T.copper} style={{ marginVertical: 24 }} /> : (
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                <View style={s.grid}>
                  {fCatalog.map((item, i) => {
                    const key = `${item.UId ?? ''}_${item.SubSr ?? i}`;
                    const saving = busy && busyKey === key;
                    return (
                      <TouchableOpacity key={key} disabled={busy} onPress={() => add(item)} style={[s.chip, wide && { width: '23.5%' }]} activeOpacity={0.75}>
                        {saving ? <ActivityIndicator size="small" color={T.copper} /> : (
                          <Text style={s.chipText} numberOfLines={2}>{item.RDesc || item.Faults || item.RsnCode || `Fault ${i + 1}`}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {fCatalog.length === 0 && <Text style={s.none}>No matching faults found</Text>}
                </View>
              </ScrollView>
            )}
          </View>

          <View style={s.addedHead}>
            <Text style={s.section}>ADDED FAULTS</Text>
            <View style={s.count}><Text style={s.countText}>{added.length}</Text></View>
          </View>
          <View style={[s.box, { flex: 2, backgroundColor: T.sub }]}>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
              <View style={s.grid}>
                {fAdded.length === 0 && <Text style={s.none}>{added.length === 0 ? 'No fault added yet' : 'No matching added faults'}</Text>}
                {fAdded.map((item, i) => {
                  const key = `${item.RsnCode ?? ''}_${item.SubSr ?? i}`;
                  const removing = busy && busyKey === key;
                  return (
                    <View key={key} style={s.entry}>
                      <Text style={s.entryText} numberOfLines={2}>
                        {item.RDesc || item.Faults || item.RsnCode || 'Fault'}
                        <Text style={s.entryRemark}>  · {item.Remark}</Text>
                      </Text>
                      <TouchableOpacity onPress={() => remove(item)} disabled={busy} hitSlop={HIT} style={{ marginLeft: 6 }}>
                        {removing ? <ActivityIndicator size="small" color={T.red} /> : <Icon name="close" size={15} color={T.red} />}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={s.infoK}>{k}</Text>
      <Text style={s.infoV} numberOfLines={1}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  top: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  topInner: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, paddingVertical: 10, width: '100%', maxWidth: 900, alignSelf: 'center' },
  title: { fontSize: 15.5, fontWeight: '900', color: T.ink },
  sub: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  close: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  page: { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center', padding: 14 },
  info: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.nav, borderRadius: 12, padding: 12, marginBottom: 12 },
  div: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 10 },
  infoK: { fontSize: 9.5, fontWeight: '900', color: T.copper, letterSpacing: 0.5 },
  infoV: { fontSize: 14, fontWeight: '900', color: '#fff', fontFamily: MONO, marginTop: 2 },
  label: { fontSize: 11, fontWeight: '800', color: T.ink, marginBottom: 4 },
  input: { height: 44, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 11, fontSize: 15, fontWeight: '800', color: T.ink, fontFamily: MONO },
  err: { color: T.red, fontSize: 11.5, fontWeight: '700', marginTop: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 42, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 10, marginVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: T.ink, paddingVertical: 0 },
  section: { fontSize: 10.5, fontWeight: '900', color: T.muted, letterSpacing: 0.6, marginBottom: 6 },
  box: { minHeight: 110, borderWidth: 1, borderColor: T.border, borderRadius: 12, backgroundColor: T.surface, padding: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { width: '48.5%', minHeight: 42, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12, fontWeight: '700', color: T.ink, textAlign: 'center' },
  none: { width: '100%', textAlign: 'center', color: T.muted, fontWeight: '600', fontSize: 12, marginVertical: 12 },
  addedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  count: { backgroundColor: T.alt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  countText: { fontSize: 11, fontWeight: '900', color: T.ink },
  entry: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%', paddingLeft: 11, paddingRight: 8, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: `${T.copper}55`, backgroundColor: `${T.copper}12` },
  entryText: { fontSize: 12, fontWeight: '700', color: T.pd, maxWidth: 220 },
  entryRemark: { color: T.ink, fontWeight: '900', fontFamily: MONO },
});
