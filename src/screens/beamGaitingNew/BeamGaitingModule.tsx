// FILE: src/screens/beamGaitingNew/BeamGaitingModule.tsx
// NEW ERP — Beam Gaiting (port of the legacy route app/(tabs)/beam-gaiting.tsx →
// ROOT components/BeamGaiting). List + year filter + add entry in ONE screen.
//
// Legacy source files
//   components/BeamGaiting/index.tsx          list (search + status colour filter + table)
//   components/BeamGaiting/CustomDrawer.tsx   "Select Year" drawer (Done = load)
//   components/BeamGaiting/AddBeamGaiting.tsx add form (modal)
//   common/API/Functions.tsx fetchAllYeardata (GET /api/getyear)
//
// Flow (identical to legacy)
//   Mount     : GET /api/getyear?prpcode=SIP → year list (nothing else loads; list is empty
//               with "Please Select Year" until a year is picked).
//   Year      : pick YearNo (shows YearName) → "Done": GET /api/getyear?prpcode=<form PrpCode>
//               (refreshes the year list) then browse, then close the filter.
//   List      : GET /api/prodbeamdetailbrowsesudo {prptype:user_prptype, yearno, txntype}
//               Search (MacName / PrpCode / DsnName case-insensitive, BeamNo case-sensitive).
//               Status multi-filter: Running (Status '0' & BeamNo≠''), Completed ('1'),
//               Beam Gaiting ('-3'), Empty Machine ('0' & BeamNo=''); none selected = all.
//               Row colours: empty = grey, completed = #b2b2ff, beam gaiting = #90ee90;
//               Balance red when BalLen <= 0. Columns SN, Machine, Location, Property, Beam No,
//               Design, Reed, Picks, Length(WarpLen), Balance(BalLen), Taka(CheckedTaka),
//               Meters(CheckedQty), Weight(CheckedWt).
//   Add open  : only when a YearNo is selected → machines (fetch=add_gaiting_machine_help);
//               if any → beams (get_gaiting_beamno) with the currently selected machine;
//               if any beams → get_criterion shift / employee / operator / sprvsr in parallel
//               (prpcode = selected machine's PrpCode, undefined when none).
//   Machine   : sets MacCode / MacName / PrpCode.
//   Beam      : sets BeamNo / UBeamNo / WarpLen / BeamLength(=WarpLen) / PrpCode / BeamUId, then
//               show_beam_gaiting_detail (UId)
//               → checkvoucherno (uid from show). show + voucher use the form values from
//               BEFORE the beam was applied (MacCode/MacName/PrpCode/VouDate) like legacy.
//   Voucher   : month read-only; VouNo digits only; Suffix upper-cased, requires VouDate and
//               VouNo, and re-runs checkvoucherno on every change. validate 'true' → apply
//               VouNo / Suffix / month; 'false' → "Oops!!!" alert, apply on OK.
//   Save      : validate (machine, beam, end ≥ start date, gaiting person, operator, supervisor —
//               shift is NOT required), POST /api/add_beam_gaiting_detail with the full legacy
//               payload; success → "Data Saved Successfully ✅" → clear, close, reload list;
//               success=false → error snackbar; other → alert(message).
//   Clear     : resets form (dates '' → shown & saved as today, times now); UId is kept.
//
// Endpoints (see beamGaitingApi.ts)
//   GET  /api/getyear
//   GET  /api/prodbeamdetailbrowsesudo            (browse)
//   GET  /api/prodbeamdetailbrowsesudo  fetch=add_gaiting_machine_help
//   GET  /api/get_gaiting_beamno
//   GET  /api/get_criterion  fetch=shift|employee|operator|sprvsr
//   GET  /api/show_beam_gaiting_detail
//   GET  /api/checkvoucherno  module=GRYProcess module_no_key=VouNo
//   POST /api/add_beam_gaiting_detail
//
// Differences vs legacy
//   1. (none on the wire) Legacy beam-select also calls fetchshift({PrpCode: beam PrpCode}), but that
//      call always throws before sending (`cancelToken.token` on an undefined per-render variable)
//      and is swallowed, so NO request is made and the shift list is not refreshed. This port
//      reproduces that: no shift re-fetch on beam select.
//   2. Legacy rendered BOTH time pickers at once and the start-time picker always wrote
//      BStTime; here each time field writes its own value.
//   3. Save failure snackbar text: legacy appended a stray '}' to the server message; dropped.
//      A network / exception on save shows an error alert (legacy only console.logged).
//   4. List and add form have their own spinners (legacy shared one isLoading flag that also
//      hid the list table while add-form dropdowns loaded).
//   5. No header of its own (NEW ERP tabs header); add form is an in-screen view instead of a
//      full-screen modal. Header back = legacy close (X: close + clear); hardware back = legacy
//      onRequestClose (close without clearing).
import AppAlert from '@/common/utils/appAlert';
import { showError } from '@/common/utils/snackbar';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, BackHandler, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import {
  Banner, Btn, Card, EmptyState, ErrorBox, Field, HIT, Loader, MONO, PickerSheet, Pill, SelectBox, useWide, ViewShell,
} from '../inquiry/ui';
import { BeamGaitingApi, createBeamGaitingApi, formatDate, formatTime, getPrptype, str, TXN } from './beamGaitingApi';
import { DateInput, TimeInput } from './fields';

type Props = { token: string; API: string; username?: string };

/* -------------------------------------------------------------------------- */
/*  Form (legacy FormState.values subset actually used by AddBeamGaiting)      */
/* -------------------------------------------------------------------------- */

type Form = {
  VouDate: any; BStTime: any; BEndTime: any; BStDate: any; BEndDate: any;
  MacCode: string; MacName: string; UBeamNo: any; BeamLength: any; BeamUId: any; BeamNo: any; WarpLen: any; PrpCode: any;
  EmpCode: string; EmpName: string; OprCode: string; OprName: string; SupCode: string; SupName: string; ShfCode: string;
  VouNo: any; Suffix: any; month: any;
};

const initialForm = (): Form => {
  const now = new Date().toISOString();
  return {
    VouDate: now, BStTime: now, BEndTime: now, BStDate: now, BEndDate: now,
    MacCode: '', MacName: '', UBeamNo: '', BeamLength: '', BeamUId: '', BeamNo: '', WarpLen: '', PrpCode: '',
    EmpCode: '', EmpName: '', OprCode: '', OprName: '', SupCode: '', SupName: '', ShfCode: '',
    // legacy: `Suffix` (capital) is not in the initial FormState → undefined until voucher check / clear
    VouNo: '', Suffix: undefined, month: '',
  };
};

/** legacy handleClearForm (merged into previous values) */
const clearedForm = (prev: Form): Form => {
  const now = new Date().toISOString();
  return {
    ...prev,
    VouDate: now, MacCode: '', MacName: '', BeamNo: '', UBeamNo: '', BeamLength: '', BeamUId: '', WarpLen: '', PrpCode: '',
    EmpCode: '', EmpName: '', OprCode: '', OprName: '', SupCode: '', SupName: '',
    BStDate: '', BEndDate: '', BStTime: now, BEndTime: now, ShfCode: '', VouNo: '', Suffix: '', month: '',
  };
};

/* -------------------------------------------------------------------------- */
/*  Status (legacy filter keys + colours)                                      */
/* -------------------------------------------------------------------------- */

type StatusKey = 'running' | 'completed' | 'beamGaiting' | 'emptyMachine';
const STATUSES: { key: StatusKey; label: string; color: string }[] = [
  { key: 'running', label: 'Running', color: '#ffffff' },
  { key: 'completed', label: 'Completed', color: '#b2b2ff' },
  { key: 'beamGaiting', label: 'Beam Gaiting', color: '#90ee90' },
  { key: 'emptyMachine', label: 'Empty Machine', color: '#808080' },
];
const statusOf = (item: any): StatusKey | null => {
  if (item.Status === '0' && item.BeamNo !== '') return 'running';
  if (item.Status === '1') return 'completed';
  if (item.Status === '-3') return 'beamGaiting';
  if (item.Status === '0' && item.BeamNo === '') return 'emptyMachine';
  return null;
};
/** legacy getRowStyle colours (empty = grey, completed = rgb(178,178,255), beam gaiting = #90ee90) as tints */
const rowTint = (item: any): { bg?: string; bar: string } => {
  const k = statusOf(item);
  if (k === 'emptyMachine') return { bg: '#80808033', bar: '#808080' };
  if (k === 'completed') return { bg: '#b2b2ff40', bar: '#7c7cf0' };
  if (k === 'beamGaiting') return { bg: '#90ee9040', bar: '#3fae3f' };
  return { bar: T.border };
};

/* -------------------------------------------------------------------------- */

export default function BeamGaitingModule({ token, API }: Props) {
  const api = useMemo(() => createBeamGaitingApi(API, token), [API, token]);
  const [view, setView] = useState<'list' | 'add'>('list');

  // shared legacy FormState: YearNo (list/drawer) + add form values
  const [years, setYears] = useState<any[]>([]);
  const [yearNo, setYearNo] = useState('');
  const [form, setForm] = useState<Form>(initialForm);
  const [uid, setUid] = useState<any>('');
  const [sel, setSel] = useState<{ machine: any; beam: any; shift: any; emp: any; opr: any; sup: any }>({
    machine: null, beam: null, shift: null, emp: null, opr: null, sup: null,
  });

  // list
  const [rows, setRows] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // legacy: fetchAllYeardata(token, 'SIP') on mount
  useEffect(() => {
    if (!token) return;
    let alive = true;
    api.years('SIP').then((y) => { if (alive) setYears(y); });
    return () => { alive = false; };
  }, [api, token]);

  const reqId = useRef(0);
  /** legacy fatchAllBeamDetailData */
  const loadList = useCallback(async (yno: string) => {
    const id = ++reqId.current;
    const prptype = await getPrptype();
    setListLoading(true);
    setListError(null);
    try {
      const data = await api.browse({ prptype, yearno: yno });
      if (id === reqId.current) setRows(data);
    } catch (e: any) {
      // legacy: logged, list left as it was
      console.log('prodbeamdetailbrowsesudo error', e);
      if (id === reqId.current) setListError(e?.response?.data?.message || e?.message || 'Unable to load data');
    } finally {
      if (id === reqId.current) setListLoading(false);
    }
  }, [api]);

  const clearForm = () => {
    setForm((f) => clearedForm(f));
    setSel({ machine: null, beam: null, shift: null, emp: null, opr: null, sup: null });
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view === 'list') return false;
      setView('list'); // legacy Modal onRequestClose → onClose only (no clear)
      return true;
    });
    return () => sub.remove();
  }, [view]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={[{ flex: 1 }, view !== 'list' && { display: 'none' }]}>
        <ListView
          api={api}
          years={years}
          setYears={setYears}
          yearNo={yearNo}
          setYearNo={setYearNo}
          formPrpCode={form.PrpCode}
          rows={rows}
          loading={listLoading}
          error={listError}
          load={loadList}
          onAdd={() => setView('add')}
        />
      </View>
      {view === 'add' && (
        <AddView
          api={api}
          yearNo={yearNo}
          yearName={str(years.find((y) => str(y.YearNo) === str(yearNo))?.YearName)}
          form={form}
          setForm={setForm}
          uid={uid}
          setUid={setUid}
          sel={sel}
          setSel={setSel}
          clearForm={clearForm}
          onClose={(clear) => { if (clear) clearForm(); setView('list'); }}
          onSaved={() => { clearForm(); setView('list'); void loadList(yearNo); }}
        />
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  List                                                                        */
/* -------------------------------------------------------------------------- */

const COLS: { key: string; label: string; w: number; get: (r: any, i: number) => any }[] = [
  { key: 'sn', label: 'SN', w: 45, get: (_r, i) => i + 1 },
  { key: 'machine', label: 'Machine', w: 130, get: (r) => r.MacName },
  { key: 'location', label: 'Location', w: 80, get: (r) => r.Location },
  { key: 'property', label: 'Property', w: 80, get: (r) => r.PrpCode },
  { key: 'beam', label: 'Beam No', w: 85, get: (r) => r.BeamNo },
  { key: 'design', label: 'Design', w: 130, get: (r) => r.DsnName },
  { key: 'reed', label: 'Reed', w: 60, get: (r) => r.ReedCount },
  { key: 'picks', label: 'Picks', w: 60, get: (r) => r.Picks },
  { key: 'length', label: 'Length', w: 90, get: (r) => r.WarpLen },
  { key: 'balance', label: 'Balance', w: 95, get: (r) => r.BalLen },
  { key: 'taka', label: 'Taka', w: 70, get: (r) => r.CheckedTaka },
  { key: 'meters', label: 'Meters', w: 90, get: (r) => r.CheckedQty },
  { key: 'weight', label: 'Weight', w: 90, get: (r) => r.CheckedWt },
];
const TABLE_W = COLS.reduce((s, c) => s + c.w, 0) + 4;
// legacy: `item.BalLen <= 0` (loose comparison on whatever the API sends)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const balNeg = (r: any) => (r.BalLen as any) <= 0;

function ListView(p: {
  api: BeamGaitingApi;
  years: any[]; setYears: (y: any[]) => void;
  yearNo: string; setYearNo: (y: string) => void;
  formPrpCode: any;
  rows: any[]; loading: boolean; error: string | null;
  load: (yearNo: string) => Promise<void>;
  onAdd: () => void;
}) {
  const { wide } = useWide();
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<StatusKey[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /** legacy handleConfirmAction (drawer "Done") */
  const confirm = async () => {
    setConfirming(true);
    try {
      const y = await p.api.years(str(p.formPrpCode));
      p.setYears(y);
      await p.load(p.yearNo);
    } catch (e) {
      console.log('Error', e);
    } finally {
      setConfirming(false);
      setFiltersOpen(false);
    }
  };

  // legacy filteredData — same expression (incl. BeamNo case-sensitive and the
  // "all four fields missing → excluded" behaviour of the optional chaining)
  const filtered = useMemo(() => p.rows.filter((item: any) => {
    const t = searchText.toLowerCase();
    const matchesSearch =
      item.MacName?.toLowerCase().includes(t) ||
      item.BeamNo?.toString().includes(searchText) ||
      item.PrpCode?.toLowerCase().includes(t) ||
      item.DsnName?.toLowerCase().includes(t);
    if (!matchesSearch) return false;
    const isRunning = item.Status === '0' && item.BeamNo !== '';
    const isCompleted = item.Status === '1';
    const isBeamGaiting = item.Status === '-3';
    const isEmptyMachine = item.Status === '0' && item.BeamNo === '';
    if (!selectedFilter || selectedFilter.length === 0) return true;
    return (
      (selectedFilter.includes('running') && isRunning) ||
      (selectedFilter.includes('completed') && isCompleted) ||
      (selectedFilter.includes('beamGaiting') && isBeamGaiting) ||
      (selectedFilter.includes('emptyMachine') && isEmptyMachine)
    );
  }), [p.rows, searchText, selectedFilter]);

  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = { running: 0, completed: 0, beamGaiting: 0, emptyMachine: 0 };
    p.rows.forEach((r) => { const k = statusOf(r); if (k) c[k] += 1; });
    return c;
  }, [p.rows]);

  const toggle = (k: StatusKey) =>
    setSelectedFilter((prev) => (prev.includes(k) ? prev.filter((f) => f !== k) : [...prev, k]));

  const yearName = str(p.years.find((y) => str(y.YearNo) === str(p.yearNo))?.YearName);

  const yearCard = (
    <Card title="Select Year">
      {p.years.length > 0 ? (
        <View style={{ gap: 6 }}>
          {p.years.map((y, i) => {
            const on = p.yearNo === y.YearNo;
            return (
              <TouchableOpacity
                key={`${str(y.YearNo)}-${i}`}
                onPress={() => p.setYearNo(y?.YearNo || '')}
                style={[s.yearRow, on && { borderColor: T.copper, backgroundColor: `${T.copper}10` }]}
                activeOpacity={0.75}
              >
                <View style={[s.radio, on && { borderColor: T.copper }]}>{on && <View style={s.radioIn} />}</View>
                <Text style={[s.yearText, on && { fontWeight: '900' }]}>{str(y.YearName)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={s.muted}>No Year Found</Text>
      )}
      <Btn title="Done" icon="check" variant="accent" onPress={confirm} loading={confirming} style={{ marginTop: 10 }} />
    </Card>
  );

  const header = (
    <View style={{ gap: 8, marginBottom: 8 }}>
      {!wide && filtersOpen && yearCard}
      <View style={s.searchBox}>
        <Icon name="search" size={17} color={T.muted} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search Machine / Beam / Property"
          placeholderTextColor={T.muted}
          style={s.searchInput}
          autoCorrect={false}
        />
        {!!searchText && <TouchableOpacity onPress={() => setSearchText('')} hitSlop={HIT}><Icon name="close" size={16} color={T.muted} /></TouchableOpacity>}
      </View>
      {p.rows.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {STATUSES.map((x) => {
            const on = selectedFilter.includes(x.key);
            return (
              <TouchableOpacity key={x.key} onPress={() => toggle(x.key)} style={[s.chip, on && { backgroundColor: T.nav, borderColor: T.nav }]} activeOpacity={0.75}>
                <View style={[s.chipDot, { backgroundColor: x.color }]} />
                <Text style={[s.chipText, on && { color: '#fff' }]}>{x.label}</Text>
                <Text style={[s.chipCount, on && { color: 'rgba(255,255,255,0.75)' }]}>{counts[x.key]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <View style={s.chipLine}>
        <Pill label={yearName || 'Select Year'} fg={p.yearNo ? T.nav : T.red} bg={p.yearNo ? T.alt : `${T.red}14`} icon="event" />
        {p.rows.length > 0 && <Pill label={`${filtered.length} of ${p.rows.length} machines`} fg={T.nav} bg={T.alt} icon="precision-manufacturing" />}
      </View>
      {!!p.error && <ErrorBox text={p.error} onRetry={() => p.load(p.yearNo)} />}
    </View>
  );

  const empty = !p.loading && p.rows.length === 0 ? (
    <EmptyState
      icon="view-week"
      title="No request data found!"
      subtitle={!p.yearNo ? 'Please Select Year' : undefined}
      action={!p.yearNo && !wide ? <Btn small title="Select Year" icon="event" onPress={() => setFiltersOpen(true)} /> : undefined}
    />
  ) : null;

  const refresh = () => { if (!p.yearNo) return; setRefreshing(true); p.load(p.yearNo).finally(() => setRefreshing(false)); };

  const renderCard = ({ item, index }: { item: any; index: number }) => {
    const tint = rowTint(item);
    const k = statusOf(item);
    const meta = STATUSES.find((x) => x.key === k);
    return (
      <View style={[s.card, { borderLeftColor: tint.bar }, !!tint.bg && { backgroundColor: tint.bg }]}>
        <View style={s.cardHead}>
          <Text style={s.sn}>{index + 1}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.mac} numberOfLines={1}>{str(item.MacName) || '—'}</Text>
            <Text style={s.sub} numberOfLines={1}>{[str(item.Location), str(item.PrpCode)].filter(Boolean).join(' · ') || '-'}</Text>
          </View>
          {!!meta && <Pill label={meta.label} fg={T.ink} bg={`${meta.color === '#ffffff' ? T.alt : meta.color}`} />}
        </View>
        <View style={s.meta}>
          <Meta k="BEAM NO" v={str(item.BeamNo) || '-'} mono />
          <Meta k="DESIGN" v={str(item.DsnName) || '-'} />
          <Meta k="REED" v={str(item.ReedCount) || '-'} mono />
          <Meta k="PICKS" v={str(item.Picks) || '-'} mono />
        </View>
        <View style={s.qtyRow}>
          <Qty k="LENGTH" v={str(item.WarpLen)} />
          <Qty k="BALANCE" v={str(item.BalLen)} bad={balNeg(item)} />
          <Qty k="TAKA" v={str(item.CheckedTaka)} />
          <Qty k="METERS" v={str(item.CheckedQty)} />
          <Qty k="WEIGHT" v={str(item.CheckedWt)} />
        </View>
      </View>
    );
  };

  const table = (
    <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ width: Math.max(TABLE_W, 0), flex: 1 }}>
        <View style={s.tHead}>
          {COLS.map((c) => <Text key={c.key} style={[s.th, { width: c.w }]} numberOfLines={1}>{c.label}</Text>)}
        </View>
        <FlatList
          data={filtered}
          style={{ flex: 1 }}
          keyExtractor={(_r, i) => String(i)}
          initialNumToRender={40}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item, index }) => {
            const tint = rowTint(item);
            return (
              <View style={[s.tr, !!tint.bg && { backgroundColor: tint.bg }]}>
                {COLS.map((c) => {
                  const bal = c.key === 'balance';
                  return (
                    <Text
                      key={c.key}
                      numberOfLines={1}
                      style={[s.td, { width: c.w }, c.key !== 'machine' && c.key !== 'design' && c.key !== 'location' && { fontFamily: MONO },
                        bal && { backgroundColor: balNeg(item) ? '#ff7272' : T.surface, fontWeight: '900' }]}
                    >
                      {str(c.get(item, index))}
                    </Text>
                  );
                })}
              </View>
            );
          }}
        />
      </View>
    </ScrollView>
  );

  return (
    <ViewShell
      title="Beam Gaiting"
      subtitle={yearName ? `Manage Your Beam · ${yearName}` : 'Manage Your Beam'}
      hideBack
      scroll={false}
      right={!wide ? (
        <TouchableOpacity onPress={() => setFiltersOpen((v) => !v)} style={[s.tune, filtersOpen && { backgroundColor: T.nav }]} hitSlop={HIT}>
          <Icon name="event" size={18} color={filtersOpen ? '#fff' : T.ink} />
        </TouchableOpacity>
      ) : null}
    >
      <View style={[{ flex: 1 }, wide && s.wideRow]}>
        {wide && <ScrollView style={s.side} contentContainerStyle={{ padding: 16, paddingRight: 0 }}>{yearCard}</ScrollView>}
        <View style={{ flex: 1 }}>
          {wide ? (
            <View style={{ flex: 1, padding: 16 }}>
              {header}
              {p.loading ? <Loader label="Loading…" /> : p.rows.length === 0 ? empty : (
                <View style={s.tableWrap}>{table}</View>
              )}
            </View>
          ) : p.loading ? (
            <View style={s.pad}>{header}<Loader label="Loading…" /></View>
          ) : (
            <FlatList
              data={p.rows.length ? filtered : []}
              keyExtractor={(_r, i) => String(i)}
              contentContainerStyle={[s.pad, { paddingBottom: 100 }]}
              ListHeaderComponent={header}
              ListEmptyComponent={empty ?? <EmptyState icon="filter-alt" title="No match" subtitle="Change search or status filter" />}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
              initialNumToRender={15}
              renderItem={renderCard}
            />
          )}
        </View>
      </View>

      <TouchableOpacity style={s.fab} onPress={p.onAdd} activeOpacity={0.85}>
        <Icon name="add" size={22} color="#fff" />
        {wide && <Text style={s.fabText}>New Beam Gaiting</Text>}
      </TouchableOpacity>
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Add                                                                         */
/* -------------------------------------------------------------------------- */

type Sel = { machine: any; beam: any; shift: any; emp: any; opr: any; sup: any };
type PickKind = 'machine' | 'beam' | 'shift' | 'emp' | 'opr' | 'sup';

const digits = /^[0-9\b]+$/;

function AddView(p: {
  api: BeamGaitingApi; yearNo: string; yearName: string;
  form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>;
  uid: any; setUid: (u: any) => void;
  sel: Sel; setSel: React.Dispatch<React.SetStateAction<Sel>>;
  clearForm: () => void;
  onClose: (clear: boolean) => void;
  onSaved: () => void;
}) {
  const { api, yearNo, form, setForm, uid, setUid, sel, setSel } = p;
  const { wide } = useWide();
  const [machines, setMachines] = useState<any[]>([]);
  const [beams, setBeams] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [busy, setBusy] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pick, setPick] = useState<PickKind | null>(null);

  const track = async <R,>(f: () => Promise<R>): Promise<R> => {
    setBusy((b) => b + 1);
    try { return await f(); } finally { setBusy((b) => b - 1); }
  };
  const patch = (x: Partial<Form>) => setForm((f) => ({ ...f, ...x }));

  /** legacy fetchshift / fetchemployee / fetchoperator / fetchsupervisior (errors keep old list) */
  const loadCriterion = async (kind: 'shift' | 'employee' | 'operator' | 'sprvsr', prpcode: string | undefined, prptype: string | null) => {
    try {
      const data = await api.criterion(kind, { prptype, yearno: yearNo, prpcode });
      ({ shift: setShifts, employee: setEmployees, operator: setOperators, sprvsr: setSupervisors })[kind](data);
    } catch (e) {
      console.log(`${kind} error`, e);
    }
  };

  /** legacy fetchbeam(machine) */
  const fetchBeam = async (machine: any) => {
    const prptype = await getPrptype();
    try {
      const data = await api.beams({ prptype, yearno: yearNo });
      if (data.length > 0) {
        setBeams(data);
        // legacy: shift uses `machine?.PrpCode || FormState.values.prpcode` (lower-case key, never set →
        // undefined); the other three send `machine?.PrpCode` as-is ('' stays '').
        const prp = machine?.PrpCode;
        await Promise.all([
          loadCriterion('shift', prp || undefined, prptype),
          loadCriterion('operator', prp, prptype),
          loadCriterion('sprvsr', prp, prptype),
          loadCriterion('employee', prp, prptype),
        ]);
      } else {
        setBeams([]);
      }
    } catch (e) {
      console.log('get_gaiting_beamno error', e);
    }
  };

  /** legacy fetchmachine — runs every time the add form opens with a YearNo */
  useEffect(() => {
    if (!yearNo) return;
    const machineAtOpen = sel.machine;
    void track(async () => {
      const prptype = await getPrptype();
      try {
        const data = await api.machines({ prptype, yearno: yearNo });
        if (data.length > 0) {
          setMachines(data);
          await fetchBeam(machineAtOpen);
        } else {
          setMachines([]);
        }
      } catch (e) {
        console.log('add_gaiting_machine_help error', e);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** legacy checkvoucher(values) — `base` = the render-time FormState.values legacy read */
  const checkVoucher = async (values: Form & { uid?: any }, base: Form) => {
    try {
      const d = new Date(values.VouDate);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const res = await api.voucher({
        prpcode: base.PrpCode,
        yearno: yearNo,
        vouno: values.VouNo,
        suffix: values.Suffix || '',
        month,
        uid: values.uid || uid,
        date: formatDate(base.VouDate),
      });
      const apply = () => setForm((f) => ({ ...f, VouNo: res.VouNo, Suffix: res.suffix, month: res.month }));
      if (res?.validate === 'true') apply();
      else if (res?.validate === 'false') {
        AppAlert.alert('Oops!!!', res?.message || 'Something went wrong!', [{ text: 'OK', onPress: apply }]);
      }
    } catch (e) {
      console.log('Check voucher error:', e);
    }
  };

  /** legacy Soshow(values) → UId ('0' on failure) */
  const showUid = async (values: Form, base: Form) => {
    const prptype = await getPrptype();
    try {
      const r = await api.show({
        MacCode: base.MacCode, MacName: base.MacName,
        UBeamNo: values.UBeamNo, WarpLen: values.WarpLen, BeamNo: values.BeamNo, BeamUId: values.BeamUId,
        prpcode: base.PrpCode, prptype, yearno: yearNo,
      });
      if (r.success && r.uid) setUid(r.uid);
      return r.uid || '0';
    } catch (e) {
      console.log('show_beam_gaiting_detail error', e);
      return '0';
    }
  };

  const onMachine = (item: any) => {
    setSel((x) => ({ ...x, machine: item }));
    patch({ MacCode: item?.MacCode || '', MacName: item?.MacName || '', PrpCode: item?.PrpCode || '' });
  };

  const onBeam = (item: any) => {
    const base = form;
    setSel((x) => ({ ...x, beam: item }));
    const updated: Form = {
      ...base,
      BeamNo: item?.BeamNo || '', UBeamNo: item?.UBeamNo || '', WarpLen: item?.WarpLen || '',
      BeamLength: item?.WarpLen || '', PrpCode: item?.PrpCode || '', BeamUId: item?.BeamUId || '',
    };
    setForm(updated);
    void track(async () => {
      // legacy fetchshift({PrpCode}) here never reaches the network (see Differences #1)
      const u = await showUid(updated, base);
      setUid(u);
      await checkVoucher({ ...updated, uid: u }, base);
    });
  };

  const onSuffix = (text: string) => {
    if (!form.VouDate) { AppAlert.alert('Please select Voucher Date first'); return; }
    if (!form.VouNo) { AppAlert.alert('Please enter Voucher No'); return; }
    const updated: Form = { ...form, Suffix: text.toUpperCase() };
    setForm(updated);
    void checkVoucher(updated, form);
  };

  const showAlert = (message: string) => new Promise<void>((resolve) => {
    AppAlert.alert('Validation Error', message, [{ text: 'OK', onPress: () => resolve() }], { cancelable: false });
  });

  /** legacy validateForm */
  const validate = async () => {
    if (!form.MacCode) { await showAlert('Please select a valid machine'); return false; }
    if (!form.BeamNo) { await showAlert('Please select Beam'); return false; }
    if (form.BStDate && form.BEndDate) {
      if (new Date(form.BEndDate) < new Date(form.BStDate)) {
        await showAlert('End Date must be greater than or equal to Start Date');
        return false;
      }
    }
    if (!form.EmpCode) { await showAlert('Please select a Gaiting Person'); return false; }
    if (!form.OprCode) { await showAlert('Please select an Operator'); return false; }
    if (!form.SupCode) { await showAlert('Please select a Supervisor'); return false; }
    return true;
  };

  /** legacy handlesave payloadObj */
  const buildPayload = (prptype: string | null) => ({
    BStTime: formatTime(form.BStTime),
    VouDate: formatDate(form.VouDate),
    BEndTime: formatTime(form.BEndTime),
    MacCode: form.MacCode,
    MacName: form.MacName,
    UBeamNo: form.UBeamNo,
    BeamLength: form.BeamLength,
    BeamUId: form.BeamUId,
    PrpCodefromBeam: form.PrpCode,
    EmpCode: form.EmpCode,
    EmpName: form.EmpName,
    OprCode: form.OprCode,
    OprName: form.OprName,
    SupCode: form.SupCode,
    SupName: form.SupName,
    BeamNo: form.BeamNo,
    WarpLen: form.WarpLen,
    PrpCode: form.PrpCode,
    UId: uid,
    VouNo: form.VouNo,
    PlanUId: null,
    PlanSrNo: null,
    BeamSrNo: null,
    BStDate: formatDate(form.BStDate),
    BEndDate: formatDate(form.BEndDate),
    BEmpCode: form.EmpCode,
    ShfCode: form.ShfCode,
    CutLen: null,
    Status: null,
    UsrCode: null,
    LastDate: null,
    LastTime: null,
    CAuthBy: null,
    CUsrCode: null,
    CLastDate: null,
    CLastTime: null,
    UUsrCode: null,
    ULastDate: null,
    ULastTime: null,
    ExTag: null,
    ImTag: null,
    SiteCode: null,
    USiteCode: null,
    IsAuth: null,
    AUsrCode: null,
    ALastDate: null,
    ALastTime: null,
    lycuidcnt: null,
    lytotcqty: null,
    lytotcwt: null,
    month: form.month,
    suffix: form.Suffix,
    yearno: yearNo,
    prptype,
    strcode: '',
    txntype: TXN,
    BEmpName: form.EmpName,
  });

  const save = async () => {
    const prptype = await getPrptype();
    const ok = await validate();
    if (!ok) return;
    setSaving(true);
    try {
      const res = await api.add(buildPayload(prptype));
      if (res?.success === true) {
        AppAlert.alert('Success', 'Data Saved Successfully ✅', [{ text: 'OK', onPress: () => p.onSaved() }]);
      } else if (res?.success === false) {
        showError(`${res?.message}`, { text: 'OK', onPress: () => { } });
      } else {
        AppAlert.alert(`${res?.message}`);
      }
    } catch (e: any) {
      console.log('add_beam_gaiting_detail error', e);
      AppAlert.alert('Error', e?.response?.data?.message || e?.message || 'Unable to save.');
    } finally {
      setSaving(false);
    }
  };

  const pickCfg: Record<PickKind, {
    title: string; list: any[]; key: (x: any) => string; render: (x: any) => { title: string; sub?: string }; onPick: (x: any) => void;
  }> = {
    machine: {
      title: 'Choose machine', list: machines, key: (x) => `${str(x.MacCode)}_${str(x.PrpCode)}`,
      render: (x) => ({ title: str(x.MacName) || str(x.MacCode), sub: [str(x.MacCode), str(x.PrpCode)].filter(Boolean).join(' · ') }),
      onPick: onMachine,
    },
    beam: {
      title: 'Choose beam', list: beams, key: (x) => `${str(x.BeamUId)}_${str(x.BeamNo)}`,
      render: (x) => ({
        title: str(x.BeamNo),
        sub: [x.UBeamNo ? `Unique ${str(x.UBeamNo)}` : '', x.WarpLen ? `Len ${str(x.WarpLen)}` : '', str(x.PrpCode)].filter(Boolean).join(' · '),
      }),
      onPick: onBeam,
    },
    shift: {
      title: 'Choose shift', list: shifts, key: (x) => str(x.ShfCode),
      render: (x) => ({ title: str(x.ShfName) || str(x.ShfCode), sub: str(x.ShfCode) }),
      onPick: (x) => { setSel((s0) => ({ ...s0, shift: x })); patch({ ShfCode: x?.ShfCode || '' }); },
    },
    emp: {
      title: 'Choose Gaiting Person', list: employees, key: (x) => str(x.EmpCode),
      render: (x) => ({ title: str(x.EmpName) || str(x.EmpCode), sub: str(x.EmpCode) }),
      onPick: (x) => { setSel((s0) => ({ ...s0, emp: x })); patch({ EmpCode: x?.EmpCode || '', EmpName: x?.EmpName || '' }); },
    },
    opr: {
      title: 'Choose operator', list: operators, key: (x) => str(x.OprCode),
      render: (x) => ({ title: str(x.OprName) || str(x.OprCode), sub: str(x.OprCode) }),
      onPick: (x) => { setSel((s0) => ({ ...s0, opr: x })); patch({ OprCode: x?.OprCode || '', OprName: x?.OprName || '' }); },
    },
    sup: {
      title: 'Choose Supervisior', list: supervisors, key: (x) => str(x.SupCode),
      render: (x) => ({ title: str(x.SupName) || str(x.SupCode), sub: str(x.SupCode) }),
      onPick: (x) => { setSel((s0) => ({ ...s0, sup: x })); patch({ SupCode: x?.SupCode || '', SupName: x?.SupName || '' }); },
    },
  };
  const cfg = pick ? pickCfg[pick] : null;

  const loading = busy > 0;
  const shiftName = sel.shift?.ShfName || form.ShfCode;

  return (
    <ViewShell
      title="Beam Gaiting"
      subtitle={p.yearName ? `New entry · ${p.yearName}` : 'New entry'}
      onBack={() => p.onClose(true)}
      maxWidth={980}
      right={loading ? <ActivityIndicator color={T.copper} /> : null}
      footer={
        <View style={s.footer}>
          <View style={[s.footerInner, wide && { maxWidth: 980 }]}>
            <Btn title="Clear" icon="delete-sweep" variant="danger" onPress={p.clearForm} style={{ flex: 1 }} />
            <Btn title="Submit" icon="send" variant="accent" onPress={save} loading={saving} style={{ flex: 2 }} />
          </View>
        </View>
      }
    >
      {!yearNo && <Banner tone="warn" icon="event" title="No year selected" text="Select a year in the Beam Gaiting list to load machines and beams." />}

      <View style={[wide && s.wideRow2]}>
        <View style={[wide && { flex: 1 }]}>
          <Card title="Machine & Beam">
            <SelectBox
              label="Machine" required icon="expand-more"
              value={form.MacCode ? str(form.MacName) || str(form.MacCode) : null}
              sub={form.MacCode ? [str(form.MacCode), str(form.PrpCode)].filter(Boolean).join(' · ') : null}
              placeholder={loading && !machines.length ? 'Loading…' : 'Choose machine...'}
              onPress={() => setPick('machine')}
              onClear={() => { setSel((x) => ({ ...x, machine: null })); patch({ MacCode: '', MacName: '', PrpCode: '' }); }}
            />
            <SelectBox
              label="Beam" required icon="expand-more"
              value={form.BeamNo ? str(form.BeamNo) : null}
              placeholder="Choose beam..."
              onPress={() => setPick('beam')}
              onClear={() => {
                setSel((x) => ({ ...x, beam: null }));
                patch({ BeamNo: '', UBeamNo: '', WarpLen: '', BeamLength: '', PrpCode: '', BeamUId: '' });
              }}
            />
            <View style={s.row2}>
              <Field label="Unique Beam" required value={str(form.UBeamNo)} placeholder="Unique No" editable={false} style={s.col} />
              <Field label="Beam Length" required value={str(form.WarpLen)} placeholder="Beam Length" editable={false} style={s.col} />
            </View>
          </Card>

          <Card title="Voucher">
            <DateInput label="Voucher Date" required value={form.VouDate} onChange={(v) => patch({ VouDate: v })} />
            <Text style={s.label}>Voucher No <Text style={{ color: T.red }}>*</Text></Text>
            <View style={s.row3}>
              <Field value={str(form.month)} placeholder="Month" editable={false} style={s.col3} />
              <Field
                value={str(form.VouNo)}
                placeholder="Vou No"
                keyboardType="number-pad"
                onChangeText={(t) => { if (t === '' || digits.test(t)) patch({ VouNo: t }); }}
                style={s.col3}
                inputStyle={{ fontFamily: MONO, fontWeight: '800' }}
              />
              <Field value={str(form.Suffix)} placeholder="Suffix" autoCapitalize="characters" onChangeText={onSuffix} style={s.col3} />
            </View>
          </Card>
        </View>

        <View style={[wide && { flex: 1 }]}>
          <Card title="Gaiting Time">
            <View style={s.row2}>
              <View style={s.col}><DateInput label="Gaiting Start date" required value={form.BStDate} onChange={(v) => patch({ BStDate: v })} /></View>
              <View style={s.col}><TimeInput label="Start Time" required value={form.BStTime} onChange={(v) => patch({ BStTime: v })} /></View>
            </View>
            <View style={s.row2}>
              <View style={s.col}><DateInput label="Gaiting End date" required value={form.BEndDate} onChange={(v) => patch({ BEndDate: v })} /></View>
              <View style={s.col}><TimeInput label="End Time" required value={form.BEndTime} onChange={(v) => patch({ BEndTime: v })} /></View>
            </View>
          </Card>

          <Card title="People">
            <SelectBox
              label="Shift" required icon="expand-more"
              value={form.ShfCode ? str(shiftName) : null} sub={form.ShfCode ? str(form.ShfCode) : null}
              placeholder="Choose shift..."
              onPress={() => setPick('shift')}
              onClear={() => { setSel((x) => ({ ...x, shift: null })); patch({ ShfCode: '' }); }}
            />
            <SelectBox
              label="Gaiting Person" required icon="expand-more"
              value={form.EmpCode ? str(form.EmpName) || str(form.EmpCode) : null} sub={form.EmpCode ? str(form.EmpCode) : null}
              placeholder="Choose Gaiting Person..."
              onPress={() => setPick('emp')}
              onClear={() => { setSel((x) => ({ ...x, emp: null })); patch({ EmpCode: '', EmpName: '' }); }}
            />
            <SelectBox
              label="Operator" required icon="expand-more"
              value={form.OprCode ? str(form.OprName) || str(form.OprCode) : null} sub={form.OprCode ? str(form.OprCode) : null}
              placeholder="Choose operator..."
              onPress={() => setPick('opr')}
              onClear={() => { setSel((x) => ({ ...x, opr: null })); patch({ OprCode: '', OprName: '' }); }}
            />
            <SelectBox
              label="Supervisior" required icon="expand-more"
              value={form.SupCode ? str(form.SupName) || str(form.SupCode) : null} sub={form.SupCode ? str(form.SupCode) : null}
              placeholder="Choose Supervisior..."
              onPress={() => setPick('sup')}
              onClear={() => { setSel((x) => ({ ...x, sup: null })); patch({ SupCode: '', SupName: '' }); }}
            />
          </Card>
        </View>
      </View>

      {cfg && (
        <PickerSheet<any>
          key={pick || ''}
          visible
          title={cfg.title}
          placeholder="Search…"
          remote={false}
          onClose={() => setPick(null)}
          load={async () => cfg.list}
          keyOf={(x, i) => `${cfg.key(x)}-${i}`}
          render={cfg.render}
          onPick={(x) => { setPick(null); cfg.onPick(x); }}
          emptyText="No items"
        />
      )}
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <View style={s.metaItem}>
      <Text style={s.metaK}>{k}</Text>
      <Text style={[s.metaV, mono && { fontFamily: MONO }]} numberOfLines={1}>{v}</Text>
    </View>
  );
}
function Qty({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <View style={[s.qtyBox, bad && { backgroundColor: '#ff7272' }]}>
      <Text style={[s.qtyLbl, bad && { color: '#fff' }]}>{k}</Text>
      <Text style={[s.qtyVal, bad && { color: '#fff' }]} numberOfLines={1}>{v || '-'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { padding: 12 },
  wideRow: { flexDirection: 'row' },
  wideRow2: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  side: { width: 300, flexGrow: 0 },
  label: { fontSize: 11, fontWeight: '800', color: T.ink, marginBottom: 4 },
  row2: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  col: { flex: 1, minWidth: 140 },
  row3: { flexDirection: 'row', gap: 8 },
  col3: { flex: 1, minWidth: 0 },
  muted: { fontSize: 12.5, fontWeight: '600', color: T.muted, textAlign: 'center', paddingVertical: 8 },
  tune: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  yearRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: T.border, borderRadius: 10,
    backgroundColor: T.surface, paddingHorizontal: 12, paddingVertical: 10,
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  radioIn: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.copper },
  yearText: { fontSize: 13, fontWeight: '700', color: T.ink, fontFamily: MONO },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 44, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 11 },
  searchInput: { flex: 1, fontSize: 13.5, color: T.ink, paddingVertical: 0 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 11,
    borderRadius: 16, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
  },
  chipDot: { width: 11, height: 11, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' },
  chipText: { fontSize: 12, fontWeight: '800', color: T.ink },
  chipCount: { fontSize: 11, fontWeight: '900', color: T.muted, fontFamily: MONO },
  chipLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  card: {
    backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4,
    padding: 12, marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sn: { fontSize: 11, fontWeight: '900', color: T.muted, fontFamily: MONO, minWidth: 22 },
  mac: { fontSize: 15, fontWeight: '900', color: T.ink },
  sub: { fontSize: 11.5, fontWeight: '700', color: T.muted, marginTop: 1 },
  meta: { flexDirection: 'row', gap: 8, marginTop: 10 },
  metaItem: { flex: 1, minWidth: 0 },
  metaK: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.3 },
  metaV: { fontSize: 13, fontWeight: '800', color: T.ink, marginTop: 1 },
  qtyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  qtyBox: { backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, minWidth: 64 },
  qtyLbl: { fontSize: 9, fontWeight: '900', color: T.muted },
  qtyVal: { fontSize: 13, fontWeight: '900', color: T.ink, fontFamily: MONO },
  tableWrap: { flex: 1, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden' },
  tHead: { flexDirection: 'row', backgroundColor: T.nav },
  th: { paddingHorizontal: 8, paddingVertical: 10, color: '#fff', fontWeight: '900', fontSize: 11.5 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.hair },
  td: { paddingHorizontal: 8, paddingVertical: 9, color: T.ink, fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute', right: 18, bottom: 22, minWidth: 54, height: 54, borderRadius: 27, paddingHorizontal: 16,
    backgroundColor: T.copper, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 13.5, fontWeight: '900' },
  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, width: '100%', alignSelf: 'center' },
});
