// FILE: src/components/RollCutScanner/index.tsx
// NEW ERP — Roll Cut Scanner  (txntype 'roll_cut_scanner').
//
//   SCAN   : [Scan QR] -> Beam No + Taka No text boxes fill from the QR -> [Save] -> POST { prpcode, yearno, scannedString }
//   LIST   : filters Property · From date · To date · Beam No  -> how many scans were done + the scanned takas
//
// Phone : two tabs (Scan / Scanned List).   Web / tablet (>= 980 px) : both side by side.
// `token` and `API` come from ErpSessionGate (same as every other NEW ERP module).
import AppAlert from '@/common/utils/appAlert';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { createRollCutApi, errMsg, fmtShowDate, getCurrentFinancialYear, parseQr, str, type Opt, type QrData } from './api';
import { useRollCutCriteria } from './criteria';
import DateField from './DateField';
import ScanCamera from './ScanCamera';
import SelectField from './SelectField';

type Props = { token: string; API: string };
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function RollCutScanner({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const api = useMemo(() => createRollCutApi(API, token), [API, token]);

  const [tab, setTab] = useState<'scan' | 'list'>('scan');
  const [camOpen, setCamOpen] = useState(false);

  /* ----------------------------- scan state ------------------------------ */
  const [raw, setRaw] = useState('');
  const [qr, setQr] = useState<QrData | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ beam: string; taka: string; at: string } | null>(null);

  /* ----------------------------- list state ------------------------------ */
  const [prpCode, setPrpCode] = useState('');
  const [fromDate, setFromDate] = useState(startOfDay(new Date()));
  const [toDate, setToDate] = useState(startOfDay(new Date()));
  const [beamFilter, setBeamFilter] = useState('');
  const [beamList, setBeamList] = useState<Opt[]>([]);
  const [beamLoading, setBeamLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const autoLoaded = useRef(false);

  const c = useRollCutCriteria({ token, API, onAutoProperty: (code) => setPrpCode((p) => p || code) });
  const prptype = c.prptype;

  /* ------------------------------ beam list ------------------------------ */
  const loadBeams = useCallback(() => {
    setBeamList([]);
    if (!prpCode || !prptype) return () => {};
    let alive = true;
    setBeamLoading(true);
    api
      .beams(prpCode, prptype)
      .then((l) => alive && setBeamList(l))
      .catch(() => alive && setBeamList([]))
      .finally(() => alive && setBeamLoading(false));
    return () => {
      alive = false;
    };
  }, [api, prpCode, prptype]);
  useEffect(() => loadBeams(), [loadBeams]);

  const beamOpts: Opt[] = useMemo(() => [{ label: 'All beams', value: '' }, ...beamList], [beamList]);

  /* -------------------------------- list --------------------------------- */
  const loadList = useCallback(async () => {
    if (!prpCode) return setListError('Select a property.');
    if (!prptype) return setListError('Property group (prptype) not found for this login — please re-login.');
    setListError('');
    setListLoading(true);
    try {
      const r = await api.list({ prptype, prpCode, beamNo: beamFilter, from: fromDate, to: toDate });
      setRows(Array.isArray(r) ? r : []);
      setLoaded(true);
    } catch (e: any) {
      setRows([]);
      setListError(errMsg(e, 'Could not load the list.'));
    } finally {
      setListLoading(false);
    }
  }, [api, prpCode, prptype, beamFilter, fromDate, toDate]);

  // first time a property is known -> show today's scans without asking
  useEffect(() => {
    if (prpCode && prptype && !autoLoaded.current) {
      autoLoaded.current = true;
      void loadList();
    }
  }, [prpCode, prptype, loadList]);

  const changeFrom = (d: Date) => {
    setFromDate(d);
    if (d > toDate) setToDate(d);
  };
  const changeTo = (d: Date) => {
    setToDate(d);
    if (d < fromDate) setFromDate(d);
  };

  /* -------------------------------- scan --------------------------------- */
  const clearScan = () => {
    setRaw('');
    setQr(null);
  };

  const onScan = (value: string) => {
    setCamOpen(false);
    const parsed = parseQr(value);
    if (!parsed || !parsed.beamno || !parsed.takano) {
      clearScan();
      AppAlert.alert('Invalid QR', 'QR format not valid');
      return;
    }
    setRaw(value);
    setQr(parsed);
  };

  const onSave = async () => {
    if (saving) return;
    if (!qr || !raw) return AppAlert.alert('Scan required', 'Please scan the taka QR first.');
    setSaving(true);
    try {
      const r = await api.save({ prpcode: qr.prpcode, yearno: qr.yearno || getCurrentFinancialYear(), scannedString: raw });
      if (r?.success === true) {
        const now = new Date();
        setLastSaved({ beam: qr.beamno, taka: qr.takano, at: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
        clearScan();
        if (prpCode) void loadList();
      } else {
        AppAlert.alert('Error', r?.message || 'Save failed');
      }
    } catch (e: any) {
      AppAlert.alert('Error', errMsg(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------- panels -------------------------------- */
  const ready = !!qr;

  const scanPanel = (
    <View style={st.panelPad}>
      <View style={st.card}>
        <View style={st.scanTop}>
          <TouchableOpacity activeOpacity={0.85} style={[st.scanBtn, ready && st.scanBtnOk]} onPress={() => setCamOpen(true)} accessibilityRole="button" accessibilityLabel="Scan QR">
            <Icon name={ready ? 'check' : 'qr-code-scanner'} size={44} color="#fff" />
          </TouchableOpacity>
          <Text style={st.scanTitle}>{ready ? 'QR scanned' : 'Scan taka QR'}</Text>
          <Text style={st.scanHint}>{ready ? 'Check the details below and press Save' : 'Tap the button and point the camera at the QR code'}</Text>
          <TouchableOpacity style={st.rescan} onPress={() => setCamOpen(true)} accessibilityRole="button">
            <Icon name={ready ? 'refresh' : 'photo-camera'} size={15} color={T.copper} />
            <Text style={st.rescanText}>{ready ? 'Scan again' : 'Open camera'}</Text>
          </TouchableOpacity>
        </View>

        <ReadBox label="Beam No" icon="view-column" value={qr?.beamno || ''} onClear={ready ? clearScan : undefined} />
        <ReadBox label="Taka No" icon="confirmation-number" value={qr?.takano || ''} />

        <TouchableOpacity
          activeOpacity={0.85}
          style={[st.saveBtn, !ready && !saving && st.saveBtnOff, saving && { opacity: 0.8 }]}
          onPress={onSave}
          disabled={!ready || saving}
          accessibilityRole="button"
          accessibilityLabel="Save"
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Icon name="check-circle" size={22} color={ready ? '#fff' : T.muted} />}
          <Text style={[st.saveText, !ready && !saving && { color: T.muted }]}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      {lastSaved ? (
        <View style={st.okBox}>
          <View style={st.okIcon}><Icon name="check" size={18} color="#fff" /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.okTitle}>Saved successfully</Text>
            <Text style={st.okSub} numberOfLines={1}>Beam {lastSaved.beam} · Taka {lastSaved.taka} · {lastSaved.at}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );

  const listHeader = (
    <View>
      <View style={st.card}>
        <View style={st.filterHead}>
          <Icon name="tune" size={17} color={T.copper} />
          <Text style={st.filterTitle}>Filters</Text>
        </View>
        <View style={st.grid}>
          <SelectField
            label="Property"
            required
            icon="apartment"
            value={prpCode}
            options={c.propOpts}
            loading={c.propLoading}
            onRefresh={c.reloadProps}
            onChange={(v) => {
              setPrpCode(v);
              setBeamFilter('');
            }}
          />
          <SelectField
            label="Beam No"
            icon="view-column"
            value={beamFilter}
            options={beamOpts}
            loading={beamLoading}
            onRefresh={loadBeams}
            disabled={!prpCode}
            disabledHint="Select property first"
            onChange={setBeamFilter}
          />
        </View>
        <View style={[st.grid, { marginTop: 12 }]}>
          <DateField label="From date" value={fromDate} onChange={changeFrom} />
          <DateField label="To date" value={toDate} onChange={changeTo} />
        </View>
        {c.prptypeMissing ? <Text style={st.err}>Property group (prptype) not found for this login — please re-login.</Text> : null}
        {listError ? <Text style={st.err}>{listError}</Text> : null}
        <TouchableOpacity activeOpacity={0.85} style={[st.loadBtn, listLoading && { opacity: 0.8 }]} onPress={loadList} disabled={listLoading} accessibilityRole="button">
          {listLoading ? <ActivityIndicator color="#fff" /> : <Icon name="search" size={18} color="#fff" />}
          <Text style={st.loadText}>{listLoading ? 'Loading…' : 'Show list'}</Text>
        </TouchableOpacity>
      </View>

      {loaded ? (
        <View style={st.countCard}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.countLabel}>TOTAL SCANS</Text>
            <Text style={st.countRange} numberOfLines={1}>
              {fmtShowDate(fromDate)} – {fmtShowDate(toDate)}{beamFilter ? ` · Beam ${beamFilter}` : ''}
            </Text>
          </View>
          <Text style={st.countValue}>{rows.length}</Text>
        </View>
      ) : null}
    </View>
  );

  const listPanel = (
    <FlatList
      data={rows}
      keyExtractor={(r, i) => `${str(r?.UId)}_${str(r?.SrNo)}_${str(r?.TakaNo)}_${i}`}
      contentContainerStyle={[st.panelPad, { paddingBottom: 40 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={listLoading && loaded} onRefresh={loadList} colors={[T.copper]} tintColor={T.copper} />}
      ListHeaderComponent={listHeader}
      renderItem={({ item, index }) => <ScanRow item={item} no={rows.length - index} />}
      ListEmptyComponent={
        listLoading ? null : (
          <View style={st.empty}>
            <View style={st.emptyIcon}><Icon name="qr-code-2" size={30} color={T.copper} /></View>
            <Text style={st.emptyTitle}>{loaded ? 'No scans found' : 'No data yet'}</Text>
            <Text style={st.emptyText}>{loaded ? 'Nothing was scanned for these filters.' : 'Select a property and tap Show list.'}</Text>
          </View>
        )
      }
    />
  );

  return (
    <View style={st.screen}>
      {wide ? (
        <View style={st.split}>
          <ScrollView style={st.left} keyboardShouldPersistTaps="handled">{scanPanel}</ScrollView>
          <View style={st.right}>{listPanel}</View>
        </View>
      ) : (
        <>
          <View style={st.tabs}>
            {([['scan', 'Scan', 'qr-code-scanner'], ['list', 'Scanned List', 'list-alt']] as const).map(([k, label, icon]) => {
              const on = tab === k;
              return (
                <TouchableOpacity key={k} activeOpacity={0.8} style={[st.tab, on && st.tabOn]} onPress={() => setTab(k)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Icon name={icon} size={18} color={on ? '#fff' : T.nav} />
                  <Text style={[st.tabText, on && { color: '#fff' }]}>{label}</Text>
                  {k === 'list' && loaded ? (
                    <View style={[st.tabBadge, on && { backgroundColor: '#ffffff33' }]}><Text style={[st.tabBadgeText, on && { color: '#fff' }]}>{rows.length}</Text></View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
          {tab === 'scan' ? <ScrollView keyboardShouldPersistTaps="handled">{scanPanel}</ScrollView> : <View style={{ flex: 1 }}>{listPanel}</View>}
        </>
      )}

      <ScanCamera visible={camOpen} onClose={() => setCamOpen(false)} onScan={onScan} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function ReadBox({ label, icon, value, onClear }: { label: string; icon: string; value: string; onClear?: () => void }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={st.fieldLabel}>{label}</Text>
      <View style={[st.readBox, !!value && st.readBoxOn]}>
        <Icon name={icon as any} size={19} color={value ? T.copper : T.muted} />
        <TextInput
          value={value}
          editable={false}
          placeholder="Scan to fill"
          placeholderTextColor={T.muted}
          style={st.readInput}
          accessibilityLabel={label}
        />
        {value && onClear ? (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={`Clear ${label}`}>
            <Icon name="cancel" size={18} color={T.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={st.infoK}>{k}</Text>
      <Text style={st.infoV} numberOfLines={1}>{v || '-'}</Text>
    </View>
  );
}

function ScanRow({ item, no }: { item: any; no: number }) {
  const date = str(item.ChkDate || item.ScanDate || item.EntryDate || item.CrtDate);
  const design = str(item.DsnName || item.OrdDsnName);
  const qty = str(item.Qty);
  const wt = str(item.Wt);
  const grade = str(item.GrdName);
  return (
    <View style={st.row}>
      <View style={st.rowTop}>
        <View style={st.rowNo}><Text style={st.rowNoText}>{no}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.rowLabel}>TAKA NO</Text>
          <Text style={st.rowTaka} numberOfLines={1}>{str(item.TakaNo) || '-'}</Text>
        </View>
        {date ? (
          <View style={st.datePill}>
            <Icon name="event" size={13} color={T.copper} />
            <Text style={st.datePillText}>{date}</Text>
          </View>
        ) : null}
      </View>
      <View style={st.rowInfo}>
        <Info k="BEAM NO" v={str(item.BeamNo)} />
        {qty ? <Info k="METER" v={qty} /> : null}
        {wt ? <Info k="WEIGHT" v={wt} /> : null}
        {grade ? <Info k="GRADE" v={grade} /> : null}
      </View>
      {design ? <Text style={st.rowDesign} numberOfLines={1}>Design: {design}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },

  tabs: { flexDirection: 'row', gap: 6, margin: 16, marginBottom: 0, padding: 4, borderRadius: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  tab: { flex: 1, minHeight: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabOn: { backgroundColor: T.nav },
  tabText: { fontSize: 13, fontWeight: '900', color: T.nav },
  tabBadge: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontSize: 11, fontWeight: '900', color: T.copper },

  split: { flex: 1, flexDirection: 'row' },
  left: { width: 420, flexGrow: 0, borderRightWidth: 1, borderRightColor: T.hair, backgroundColor: T.bg },
  right: { flex: 1, minWidth: 0 },
  panelPad: { padding: 16, width: '100%', maxWidth: 900, alignSelf: 'center' },

  card: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 12, ...S.card, shadowOpacity: 0.05, elevation: 1 },

  scanTop: { alignItems: 'center', paddingBottom: 16, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: T.hair },
  scanBtn: { width: 96, height: 96, borderRadius: 28, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', shadowColor: T.copper, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  scanBtnOk: { backgroundColor: T.green, shadowColor: T.green },
  scanTitle: { fontSize: 17, fontWeight: '900', color: T.nav, marginTop: 12 },
  scanHint: { fontSize: 12.5, fontWeight: '600', color: T.muted, marginTop: 4, textAlign: 'center' },
  rescan: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, height: 34, paddingHorizontal: 14, borderRadius: 16, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  rescanText: { fontSize: 12.5, fontWeight: '800', color: T.copper },

  fieldLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: T.muted, textTransform: 'uppercase', marginBottom: 6 },
  readBox: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, paddingHorizontal: 12 },
  readBoxOn: { backgroundColor: `${T.copper}0D`, borderColor: `${T.copper}66` },
  readInput: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '900', color: T.ink, fontFamily: MONO, paddingVertical: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null) },

  saveBtn: { height: 56, borderRadius: 14, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 6 },
  saveBtnOff: { backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },

  okBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: `${T.green}55`, backgroundColor: `${T.green}12` },
  okIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  okTitle: { fontSize: 13.5, fontWeight: '900', color: T.green },
  okSub: { fontSize: 12, fontWeight: '700', color: T.ink, marginTop: 1 },

  filterHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  filterTitle: { fontSize: 14, fontWeight: '900', color: T.nav },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 12 },
  err: { fontSize: 12.5, fontWeight: '700', color: T.red, marginTop: 12 },
  loadBtn: { height: 46, borderRadius: 12, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  loadText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },

  countCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: T.nav, marginBottom: 12 },
  countLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: '#ffffffAA' },
  countRange: { fontSize: 12.5, fontWeight: '700', color: '#fff', marginTop: 3 },
  countValue: { fontSize: 34, fontWeight: '900', color: '#fff', fontFamily: MONO },

  row: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, borderLeftColor: T.copper, padding: 12, marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowNo: { minWidth: 30, height: 30, paddingHorizontal: 6, borderRadius: 15, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  rowNoText: { fontSize: 12, fontWeight: '900', color: T.copper },
  rowLabel: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6, color: T.muted },
  rowTaka: { fontSize: 16, fontWeight: '900', color: T.ink, fontFamily: MONO, marginTop: 1 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, height: 26, borderRadius: 13, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  datePillText: { fontSize: 11.5, fontWeight: '800', color: T.nav },
  rowInfo: { flexDirection: 'row', gap: 10, marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  infoK: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4, color: T.muted },
  infoV: { fontSize: 13.5, fontWeight: '800', color: T.ink, fontFamily: MONO, marginTop: 1 },
  rowDesign: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 8 },

  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20, backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border },
  emptyIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: T.nav, marginTop: 12 },
  emptyText: { fontSize: 12.5, fontWeight: '600', color: T.muted, textAlign: 'center', marginTop: 5 },
});
