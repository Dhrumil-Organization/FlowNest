// FILE: src/screens/weftIssue/WeftIssueModule.tsx
// NEW ERP — Weft Issue (legacy components/WftIssue "Previous Weft Issue" +
// components/WftIssueNew "New Weft Issue") in ONE screen.
//
// Flow (same as legacy):
//   Mode      New Weft Issue / Previous Weft Issue (chosen on open, "Switch" later)
//   List      filters property (get_criterion prp) · year (getyear, default 'yno')
//             · from / to → POST get_yarn_issue_browse; card Edit / Delete (delete_creel_data)
//   Header    GET warpissueshow (defaults, issue-design users) → voucher (checkvoucherno)
//             → Beam (beam_for_weftissue_help) → Stock type In house / Process house
//             → Design (orderdesign_for_weftissue_help) → Issue design (get_weftissuedesign_help,
//             only for users in issuedesignuser).  "Previous" + Process house skips Design Items.
//   Items     GET designwise_mainitem_for_weftissue_help (dsncode = issue design when allowed)
//   Cartons   Scan QR (~ separated) or Manual search (get_carton_search) → chees / qty
//             (≤ available) → expected prod qty (Previous: get_expprodqty_from_issueqty,
//             New: getExpectedWeftIssue) → first carton ADD (add_creel_data), next ones
//             MODIFY with all cartons (modify_creel_data); delete one (delete_creel_single_data)
//             or the whole entry (delete_creel_data). ExpProdQtyType '1' New / '0' Previous.
//
// Fixes vs legacy: list loads on open, property / year default, "Done" works
// (legacy checked an empty d2 list), an item must be picked before Next, the
// voucher check sends the new date, edit restores beam / stock type / design.
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, BackHandler, FlatList, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import {
  Banner, Btn, Card, DateField, EmptyState, ErrorBox, Field, HIT, KV, Loader, MONO, PickerSheet, Pill, SelectBox, useWide, ViewShell,
} from '../inquiry/ui';
import {
  Carton, cartonUidFrom, createWeftIssueApi, dmy, errOf, isoDay, mapShow, Mode, monthOf, normalizeCarton, parseQr, str, toDate, TXN, WeftIssueApi,
} from './weftIssueApi';

type Props = { token: string; API: string; username?: string };
type Step = 'mode' | 'list' | 'header' | 'items' | 'cartons';

type Issue = {
  PrpCode: string; YearNo: string; LngName: string; YearName: string;
  IssDate: string; IssNo: string; suffix: string; month: string; UId: any; yarnstrcode: string;
  BeamNo: string; BeamUId: any; WarpLen: any; TranDate: any; StkType: string;
  DsnCode: any; DsnName: string; IssDsnCode: any; IssDsnName: string;
  ItmCode: any; ItmName: string; srno: any;[k: string]: any;
};

const STOCK_TYPES = [{ StkType: 'I', stktypename: 'In house' }, { StkType: 'P', stktypename: 'Process house' }];
const emptyIssue = (prp: string, year: string, lng = '', yearName = ''): Issue => ({
  PrpCode: prp, YearNo: year, LngName: lng, YearName: yearName,
  IssDate: dmy(new Date()), IssNo: '', suffix: '', month: monthOf(new Date()), UId: '', yarnstrcode: '',
  BeamNo: '', BeamUId: '', WarpLen: '', TranDate: '', StkType: '',
  DsnCode: '', DsnName: '', IssDsnCode: '', IssDsnName: '', ItmCode: '', ItmName: '', srno: '',
});
const blank = (v: any) => v === undefined || v === null || v === '' || v === '0' || v === 0;
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function WeftIssueModule({ token, API }: Props) {
  const api = useMemo(() => createWeftIssueApi(API, token), [API, token]);
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<Mode>('new');

  // session bits (legacy: user_prptype, yno, user_id)
  const [prptype, setPrptype] = useState<string | null>(null);
  const [yno, setYno] = useState('');
  const [userId, setUserId] = useState('');
  useEffect(() => {
    Promise.all(['user_prptype', 'yno', 'user_id'].map((k) => AsyncStorage.getItem(k).catch(() => null))).then(([p, y, u]) => {
      setPrptype(str(p).trim());
      setYno(str(y).trim());
      setUserId(str(u).replace(/^"+|"+$/g, '').trim());
    });
  }, []);

  // filters (shared with the entry — legacy FormState)
  const [properties, setProperties] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [prp, setPrp] = useState<any>(null);
  const [year, setYear] = useState<any>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate_, setToDate] = useState('');

  // entry
  const [issue, setIssue] = useState<Issue>(() => emptyIssue('', ''));
  const [cartons, setCartons] = useState<Carton[]>([]);
  const [entryUId, setEntryUId] = useState<any>(''); // saved / edited entry UId
  const [editMode, setEditMode] = useState(false);
  const [issueDesignAccess, setIssueDesignAccess] = useState(false);
  const [dirty, setDirty] = useState(0);

  const patch = useCallback((p: Partial<Issue>) => setIssue((cur) => ({ ...cur, ...p })), []);

  useEffect(() => {
    if (prptype === null) return;
    api.properties(prptype).then((list) => {
      setProperties(list);
      setPrp((cur: any) => cur || list[0] || null);
    }).catch(() => undefined);
  }, [api, prptype]);

  useEffect(() => {
    if (!prp?.PrpCode) return;
    api.years(prp.PrpCode).then((list) => {
      setYears(list);
      setYear((cur: any) => (cur && list.some((y) => String(y.YearNo) === String(cur.YearNo))
        ? cur
        : list.find((y) => String(y.YearNo) === String(yno)) || list[0] || null));
    }).catch(() => undefined);
  }, [api, prp?.PrpCode, yno]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'mode' || step === 'list') return false;
      setStep(step === 'cartons' ? 'list' : step === 'items' ? (editMode ? 'list' : 'header') : 'list');
      return true;
    });
    return () => sub.remove();
  }, [step, editMode]);

  const startNew = () => {
    if (!prp || !year) { AppAlert.alert('Please select Property and Year'); return; }
    setIssue(emptyIssue(str(prp.PrpCode), str(year.YearNo), str(prp.LngName), str(year.YearName)));
    setCartons([]); setEntryUId(''); setEditMode(false); setIssueDesignAccess(false);
    setStep('header');
  };

  const openEdit = async (row: any) => {
    if (!prp || !year) return;
    try {
      const res = await api.show({ uid: row.UId, prpcode: str(prp.PrpCode) || str(row.PrpCode), yearno: str(year.YearNo) });
      if (!res?.success) { AppAlert.alert('Error', 'No data found'); return; }
      const { main, cartons: list } = mapShow(res.response, str(year.YearNo));
      const m = main || {};
      const d = toDate(m.IssDate);
      setIssue({
        ...emptyIssue(str(m.PrpCode || prp.PrpCode), str(year.YearNo), str(prp.LngName), str(year.YearName)),
        UId: m.UId ?? row.UId, IssNo: str(m.IssNo ?? row.IssNo), IssDate: d ? dmy(d) : dmy(new Date()),
        Remark: m.Remark, BatchNo: m.BatchNo, RecipeUId: m.RecipeUId, BeamUId: m.BeamUId ?? '', BeamNo: str(m.BeamNo ?? row.BeamNo),
        DsnCode: m.DsnCode ?? '', DsnName: str(m.DsnName ?? row.DsnName), StkType: str(m.StkType ?? ''), WarpLen: m.WarpLen ?? '',
        month: str(m.month) || monthOf(d), suffix: str(m.suffix), yarnstrcode: str(m.yarnstrcode),
      });
      setCartons(list);
      setEntryUId(row.UId);
      setEditMode(true);
      setStep('items');
    } catch (e) {
      AppAlert.alert('Error', errOf(e, 'No data found'));
    }
  };

  const finish = () => { setDirty((d) => d + 1); setStep('list'); };

  if (step === 'mode') {
    return <ModeView onPick={(m) => { setMode(m); setStep('list'); }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={[{ flex: 1 }, step !== 'list' && { display: 'none' }]}>
        <ListView
          api={api}
          mode={mode}
          prptype={prptype ?? ''}
          properties={properties} years={years}
          prp={prp} setPrp={(p) => { setPrp(p); setYear(null); }}
          year={year} setYear={setYear}
          fromDate={fromDate} setFromDate={setFromDate} toDate={toDate_} setToDate={setToDate}
          dirty={dirty}
          onSwitch={() => setStep('mode')}
          onNew={startNew}
          onEdit={openEdit}
        />
      </View>
      {step === 'header' && (
        <HeaderView
          api={api}
          mode={mode}
          issue={issue}
          patch={patch}
          properties={properties}
          userId={userId}
          onAccess={setIssueDesignAccess}
          onBack={() => setStep('list')}
          onNext={() => setStep(mode === 'old' && issue.StkType === 'P' ? 'cartons' : 'items')}
        />
      )}
      {step === 'items' && (
        <ItemsView
          api={api}
          issue={issue}
          patch={patch}
          access={issueDesignAccess}
          preselect={editMode ? cartons[0]?.ItmCode : undefined}
          onBack={() => setStep(editMode ? 'list' : 'header')}
          onNext={() => setStep('cartons')}
        />
      )}
      {step === 'cartons' && (
        <CartonsView
          api={api}
          mode={mode}
          issue={issue}
          patch={patch}
          cartons={cartons}
          setCartons={setCartons}
          entryUId={entryUId}
          setEntryUId={setEntryUId}
          editMode={editMode}
          onBack={() => setStep(mode === 'old' && issue.StkType === 'P' && !editMode ? 'header' : 'items')}
          onFinish={finish}
        />
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mode chooser                                                               */
/* -------------------------------------------------------------------------- */

function ModeView({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <ViewShell title="Weft Issue" subtitle="Issue and manage weft yarn for production" hideBack maxWidth={620}>
      <View style={s.modeIcon}><Icon name="precision-manufacturing" size={30} color={T.copper} /></View>
      <Text style={s.modeTitle}>How do you want to open Weft Issue?</Text>
      <TouchableOpacity style={[s.modeCard, { backgroundColor: T.nav, borderColor: T.nav }]} onPress={() => onPick('new')} activeOpacity={0.85}>
        <View style={[s.modeBadge, { backgroundColor: T.copper }]}><Icon name="add-circle-outline" size={24} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={[s.modeName, { color: '#fff' }]}>New Weft Issue</Text>
          <Text style={[s.modeDesc, { color: 'rgba(255,255,255,0.75)' }]}>Continue with the new flow (expected weft issue)</Text>
        </View>
        <Icon name="chevron-right" size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={s.modeCard} onPress={() => onPick('old')} activeOpacity={0.85}>
        <View style={[s.modeBadge, { backgroundColor: `${T.yd}18` }]}><Icon name="history" size={24} color={T.yd} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.modeName}>Previous Weft Issue</Text>
          <Text style={s.modeDesc}>Continue with the existing flow</Text>
        </View>
        <Icon name="chevron-right" size={24} color={T.muted} />
      </TouchableOpacity>
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  List                                                                        */
/* -------------------------------------------------------------------------- */

function ListView(p: {
  api: WeftIssueApi; mode: Mode; prptype: string; properties: any[]; years: any[];
  prp: any; setPrp: (x: any) => void; year: any; setYear: (x: any) => void;
  fromDate: string; setFromDate: (v: string) => void; toDate: string; setToDate: (v: string) => void;
  dirty: number; onSwitch: () => void; onNew: () => void; onEdit: (row: any) => Promise<void>;
}) {
  const { api, prp, year } = p;
  const { wide, xwide } = useWide();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheet, setSheet] = useState<null | 'prp' | 'year'>(null);
  const [opening, setOpening] = useState<any>(null);

  const dmyToIso = (v: string) => { const d = toDate(v); return d ? isoDay(d) : ''; };

  const reqId = useRef(0);
  const load = useCallback(async (spinner = true) => {
    if (!prp?.PrpCode || !year?.YearNo) return;
    const id = ++reqId.current;
    if (spinner) setLoading(true);
    setError(null);
    try {
      const list = await api.browse({
        prptype: p.prptype, prpcode: str(prp.PrpCode), yearno: str(year.YearNo),
        fromdate: dmyToIso(p.fromDate), todate: dmyToIso(p.toDate), ExpProdQtyType: p.mode === 'new' ? '1' : '0',
      });
      if (id === reqId.current) setRows(list);
    } catch (e) {
      if (id === reqId.current) { setRows([]); setError(errOf(e, 'Unable to load weft issues')); }
    } finally {
      if (id === reqId.current) { setLoading(false); setRefreshing(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, prp?.PrpCode, year?.YearNo, p.fromDate, p.toDate, p.prptype]);

  const key = `${str(prp?.PrpCode)}|${str(year?.YearNo)}`;
  useEffect(() => { if (prp?.PrpCode && year?.YearNo) void load(); }, [key, p.dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => [r.IssNo, r.CreelId, r.Remark, r.BeamNo, r.DsnName].some((v) => str(v).toLowerCase().includes(t)));
  }, [rows, q]);

  const remove = (row: any) => {
    AppAlert.alert('Delete Weft Issue', `Are you sure you want to delete ${str(row.IssNo)} (Beam ${str(row.BeamNo)})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await api.deleteEntry({ prpcode: str(prp?.PrpCode), yearno: str(year?.YearNo), uid: row.UId });
            if (res?.success === true) {
              setRows((cur) => cur.filter((x) => x.UId !== row.UId));
              AppAlert.alert('Success', 'Data deleted Successfully ✅');
            } else AppAlert.alert('Error', res?.message || 'Delete failed');
          } catch (e) {
            AppAlert.alert('Error', errOf(e, 'Delete failed'));
          }
        },
      },
    ]);
  };

  const cols = xwide ? 3 : wide ? 2 : 1;

  const filterCard = (
    <Card title="Filters">
      <SelectBox label="Property" required value={prp?.LngName} placeholder="Select Property" onPress={() => setSheet('prp')} icon="expand-more" />
      <SelectBox label="Year" required value={year?.YearName} placeholder="Select Year" onPress={() => setSheet('year')} icon="expand-more" disabled={!prp} />
      <View style={s.row2}>
        <View style={s.col}><DateField label="From Date" value={p.fromDate} onChange={p.setFromDate} minToday={false} /></View>
        <View style={s.col}><DateField label="To Date" value={p.toDate} onChange={p.setToDate} minToday={false} /></View>
      </View>
      <View style={s.row2}>
        <Btn title="Clear dates" variant="secondary" small onPress={() => { p.setFromDate(''); p.setToDate(''); }} style={{ flex: 1 }} />
        <Btn title="Apply Filters" icon="refresh" variant="accent" small onPress={() => { setFiltersOpen(false); void load(); }} loading={loading} style={{ flex: 2 }} />
      </View>
    </Card>
  );

  const header = (
    <View style={{ gap: 8, marginBottom: 8 }}>
      {!wide && filtersOpen && filterCard}
      <View style={s.searchBox}>
        <Icon name="search" size={17} color={T.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search issue no, beam, design, remark…" placeholderTextColor={T.muted} style={s.searchInput} autoCorrect={false} />
        {!!q && <TouchableOpacity onPress={() => setQ('')} hitSlop={HIT}><Icon name="close" size={16} color={T.muted} /></TouchableOpacity>}
      </View>
      <View style={s.chipLine}>
        <Pill label={prp?.LngName || 'Select Property'} fg={T.nav} bg={T.alt} icon="business" />
        <Pill label={year?.YearName || 'Select Year'} fg={T.nav} bg={T.alt} icon="event" />
        {(!!p.fromDate || !!p.toDate) && <Pill label={`${p.fromDate || '…'} – ${p.toDate || '…'}`} fg={T.nav} bg={T.alt} icon="date-range" />}
        <Pill label={p.mode === 'new' ? 'New Weft Issue' : 'Previous Weft Issue'} fg="#fff" bg={p.mode === 'new' ? T.copper : T.yd} />
      </View>
      {!!error && <ErrorBox text={error} onRetry={() => load()} />}
    </View>
  );

  return (
    <ViewShell
      title="Weft Issue"
      subtitle={p.mode === 'new' ? 'New Weft Issue' : 'Previous Weft Issue'}
      hideBack
      scroll={false}
      right={
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={p.onSwitch} style={s.iconBtn} hitSlop={HIT}><Icon name="swap-horiz" size={18} color={T.ink} /></TouchableOpacity>
          {!wide && (
            <TouchableOpacity onPress={() => setFiltersOpen((v) => !v)} style={[s.iconBtn, filtersOpen && { backgroundColor: T.nav }]} hitSlop={HIT}>
              <Icon name="tune" size={18} color={filtersOpen ? '#fff' : T.ink} />
            </TouchableOpacity>
          )}
        </View>
      }
    >
      <View style={[{ flex: 1 }, wide && { flexDirection: 'row' }]}>
        {wide && <ScrollView style={s.side} contentContainerStyle={{ padding: 16, paddingRight: 0 }}>{filterCard}</ScrollView>}
        <View style={{ flex: 1 }}>
          {loading && !rows.length ? <View style={s.pad}>{header}<Loader label="Loading…" /></View> : (
            <FlatList
              key={`c${cols}`}
              data={list}
              numColumns={cols}
              columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
              keyExtractor={(r, i) => `${str(r.UId)}-${i}`}
              contentContainerStyle={[s.pad, { paddingBottom: 100 }]}
              ListHeaderComponent={header}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(false); }} />}
              ListEmptyComponent={!error ? <EmptyState icon="precision-manufacturing" title="No Data Found" subtitle={prp && year ? 'Change filters or add a new weft issue' : 'Select property and year'} /> : null}
              renderItem={({ item }) => (
                <View style={[s.card, { flex: 1 / cols }]}>
                  <View style={s.cardHead}>
                    <Text style={s.no}>{str(item.IssNo)}</Text>
                    <Text style={s.date}>{str(item.IssDate)}</Text>
                  </View>
                  <Text style={s.beam}>Beam No: <Text style={s.mono}>{str(item.BeamNo) || '-'}</Text></Text>
                  <View style={s.dsn}><Text style={s.dsnText} numberOfLines={2}>Design: {str(item.DsnName) || '-'}</Text></View>
                  <View style={s.cardFoot}>
                    <View style={s.qtyBox}><Text style={s.qtyLbl}>QTY</Text><Text style={s.qtyVal}>{str(item.CreelQty) || '0'}</Text></View>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      onPress={async () => { setOpening(item.UId); await p.onEdit(item); setOpening(null); }}
                      style={s.actBtn}
                      disabled={!!opening}
                    >
                      {opening === item.UId ? <ActivityIndicator size="small" color={T.blue} /> : <Icon name="edit" size={16} color={T.blue} />}
                      <Text style={[s.actText, { color: T.blue }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(item)} style={[s.actBtn, { backgroundColor: `${T.red}10` }]}>
                      <Icon name="delete-outline" size={16} color={T.red} />
                      <Text style={[s.actText, { color: T.red }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>

      <TouchableOpacity style={s.fab} onPress={p.onNew} activeOpacity={0.85}>
        <Icon name="add" size={22} color="#fff" />
        {wide && <Text style={s.fabText}>New Weft Issue</Text>}
      </TouchableOpacity>

      <PickerSheet<any>
        visible={sheet === 'prp'}
        title="Select Property"
        placeholder="Search property"
        remote={false}
        onClose={() => setSheet(null)}
        load={async () => p.properties}
        keyOf={(x, i) => `${x.PrpCode}-${i}`}
        render={(x) => ({ title: str(x.LngName), sub: str(x.PrpCode) })}
        onPick={(x) => { p.setPrp(x); setSheet(null); }}
      />
      <PickerSheet<any>
        key={`yr-${str(prp?.PrpCode)}-${p.years.length}`}
        visible={sheet === 'year'}
        title="Select Year"
        placeholder="Search year"
        remote={false}
        onClose={() => setSheet(null)}
        load={async () => p.years}
        keyOf={(x, i) => `${x.YearNo}-${i}`}
        render={(x) => ({ title: str(x.YearName), sub: `Year no ${str(x.YearNo)}` })}
        onPick={(x) => { p.setYear(x); setSheet(null); }}
      />
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Header (Weft Issue Detail)                                                 */
/* -------------------------------------------------------------------------- */

function HeaderView({ api, mode, issue, patch, properties, userId, onAccess, onBack, onNext }: {
  api: WeftIssueApi; mode: Mode; issue: Issue; patch: (p: Partial<Issue>) => void; properties: any[]; userId: string;
  onAccess: (v: boolean) => void; onBack: () => void; onNext: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [beams, setBeams] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [issueDesigns, setIssueDesigns] = useState<any[]>([]);
  const [access, setAccess] = useState(false);
  const [sheet, setSheet] = useState<null | 'beam' | 'stk' | 'dsn' | 'iss'>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef(issue);
  ref.current = issue;

  const ctx = { prpcode: issue.PrpCode, yearno: issue.YearNo };

  const checkVoucher = useCallback(async (v: Issue) => {
    const d = toDate(v.IssDate);
    if (!d) return;
    try {
      const res = await api.voucher({
        ...ctx, vouno: v.IssNo || '', suffix: v.suffix || '', month: monthOf(d), uid: v.UId, date: dmy(d),
      });
      const apply = () => patch({ IssNo: str(res.IssNo ?? v.IssNo), suffix: str(res.suffix ?? v.suffix), month: str(res.month || monthOf(d)) });
      if (res?.validate === 'true') apply();
      else if (res?.validate === 'false') AppAlert.alert('Oops!!!', res?.message || 'Something went wrong!', [{ text: 'OK', onPress: apply }]);
    } catch {
      // ignore (legacy)
    }
  }, [api, ctx.prpcode, ctx.yearno, patch]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBeams = useCallback(async (v: Issue) => {
    setBusy('beam');
    try { setBeams(await api.beams({ ...ctx, strcode: v.yarnstrcode, date: v.IssDate, uid: v.UId })); } catch { setBeams([]); } finally { setBusy(null); }
  }, [api, ctx.prpcode, ctx.yearno]); // eslint-disable-line react-hooks/exhaustive-deps

  // defaults: warpissueshow -> voucher + beams
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.defaults(ctx);
        if (!alive) return;
        const main = data?.main?.[0] || {};
        const clean = Object.fromEntries(Object.entries(main).filter(([, v]) => v !== null && v !== ''));
        const users: any[] = Array.isArray(data?.issuedesignuser) ? data.issuedesignuser : [];
        const ok = users.some((u) => String(u) === String(userId));
        setAccess(ok);
        onAccess(ok);
        const next: Issue = { ...ref.current, ...clean, PrpCode: ref.current.PrpCode, YearNo: ref.current.YearNo } as Issue;
        const d = toDate(next.IssDate) || new Date();
        next.IssDate = dmy(d);
        next.month = monthOf(d);
        patch(next);
        await Promise.all([checkVoucher(next), loadBeams(next)]);
      } catch (e) {
        if (alive) setError(errOf(e, 'Unable to load defaults'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [api, ctx.prpcode, ctx.yearno, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDate = (v: string) => {
    const d = toDate(v);
    const next = { ...ref.current, IssDate: v, month: monthOf(d) };
    patch({ IssDate: v, month: monthOf(d) });
    void checkVoucher(next);
    void loadBeams(next);
  };

  const pickStk = async (stk: string) => {
    patch({ StkType: stk, DsnCode: '', DsnName: '', IssDsnCode: '', IssDsnName: '' });
    setSheet(null);
    setBusy('dsn');
    try {
      setDesigns(await api.designs({ ...ctx, date: ref.current.IssDate, uid: ref.current.UId, stktype: stk, beamuid: ref.current.BeamUId }));
    } catch { setDesigns([]); } finally { setBusy(null); }
  };

  const pickDesign = async (d: any) => {
    patch({ DsnCode: d.DsnCode, DsnName: str(d.DsnName), IssDsnCode: '', IssDsnName: '' });
    setSheet(null);
    try { setIssueDesigns(await api.issueDesigns({ ...ctx, dsncode: str(d.DsnCode) })); } catch { setIssueDesigns([]); }
  };

  const next = () => {
    const v = ref.current;
    const rules: [any, string][] = [
      [v.PrpCode, 'Please select Property'], [v.YearNo, 'Please select Year'], [v.BeamNo, 'Please select Beam'],
      [v.StkType, 'Please select Stock Type'], [v.DsnCode, 'Please select Design'],
    ];
    const bad = rules.find(([val]) => blank(val));
    if (bad) { setError(bad[1]); AppAlert.alert(bad[1]); return; }
    setError(null);
    onNext();
  };

  const prpName = properties.find((x) => String(x.PrpCode) === String(issue.PrpCode))?.LngName || issue.LngName || issue.PrpCode;
  const stkName = STOCK_TYPES.find((x) => x.StkType === issue.StkType)?.stktypename;

  return (
    <ViewShell
      title="Weft Issue Detail"
      subtitle={`${mode === 'new' ? 'New' : 'Previous'} · ${prpName} · ${issue.YearName || issue.YearNo}`}
      onBack={onBack}
      maxWidth={900}
      footer={
        <View style={s.footer}>
          <View style={s.footerInner}>
            <Btn title="Cancel" variant="secondary" onPress={onBack} style={{ flex: 1 }} />
            <Btn title="Next" icon="arrow-forward" variant="accent" onPress={next} disabled={loading} style={{ flex: 2 }} />
          </View>
        </View>
      }
    >
      {loading && <Banner tone="info" icon="hourglass-top" text="Loading defaults, voucher no and beams…" />}
      {!!error && <Banner tone="danger" icon="error-outline" text={error} />}

      <Card title="Voucher">
        <View style={s.row2}>
          <View style={s.col}><KV k="Property" v={prpName} /><KV k="Year" v={issue.YearName || issue.YearNo} last /></View>
          <View style={s.col}><DateField label="Issue Date" value={issue.IssDate} onChange={onDate} minToday={false} /></View>
        </View>
        <Text style={s.label}>Voucher No <Text style={{ color: T.red }}>*</Text></Text>
        <View style={s.vouRow}>
          <View style={s.vouMonth}><Text style={s.vouLbl}>MONTH</Text><Text style={s.vouVal}>{issue.month || '--'}</Text></View>
          <TextInput value={str(issue.IssNo)} onChangeText={(t) => patch({ IssNo: t })} placeholder="No" placeholderTextColor={T.muted} style={[s.vouInput, { flex: 2 }]} keyboardType="numeric" />
          <TextInput value={str(issue.suffix)} onChangeText={(t) => patch({ suffix: t.toUpperCase() })} placeholder="Suffix" placeholderTextColor={T.muted} style={[s.vouInput, { flex: 1 }]} autoCapitalize="characters" />
        </View>
      </Card>

      <Card title="Beam & design">
        <SelectBox
          label="Beam" required
          value={issue.BeamNo}
          sub={issue.TranDate ? `Warping ${str(issue.TranDate)}${issue.WarpLen ? ` · Warp len ${str(issue.WarpLen)}` : ''}` : null}
          placeholder={busy === 'beam' ? 'Loading beams…' : 'Select beam'}
          onPress={() => setSheet('beam')}
          onClear={issue.BeamNo ? () => patch({ BeamNo: '', BeamUId: '', WarpLen: '', TranDate: '' }) : undefined}
        />
        <SelectBox label="Stock Type" required value={stkName} placeholder="Select stock type" onPress={() => setSheet('stk')} icon="expand-more" />
        <SelectBox
          label="Design" required
          value={issue.DsnName}
          sub={issue.DsnCode ? `Code ${str(issue.DsnCode)}` : null}
          placeholder={!issue.StkType ? 'Select stock type first' : busy === 'dsn' ? 'Loading designs…' : 'Select design'}
          onPress={() => (issue.StkType ? setSheet('dsn') : AppAlert.alert('Please select Stock Type'))}
        />
        {access && (
          <SelectBox
            label="Issue Design"
            value={issue.IssDsnName}
            sub={issue.IssDsnCode ? `Code ${str(issue.IssDsnCode)}` : null}
            placeholder={issue.DsnCode ? 'Select issue design' : 'Select design first'}
            onPress={() => (issue.DsnCode ? setSheet('iss') : undefined)}
            onClear={issue.IssDsnCode ? () => patch({ IssDsnCode: '', IssDsnName: '' }) : undefined}
          />
        )}
        {mode === 'old' && issue.StkType === 'P' && (
          <Banner tone="info" icon="info-outline" text="Process house (Previous flow): Next goes straight to carton entry." />
        )}
      </Card>

      <PickerSheet<any>
        key={`beams-${beams.length}`}
        visible={sheet === 'beam'}
        title="Select Beam"
        placeholder="Search beam no"
        remote={false}
        onClose={() => setSheet(null)}
        load={async () => beams}
        keyOf={(x, i) => `${x.UId}-${i}`}
        render={(x) => ({ title: `Beam ${str(x.BeamNo)}`, sub: `${str(x.TranDate)}${x.BeamBalance !== undefined ? ` · Balance ${str(x.BeamBalance)}` : ''}` })}
        onPick={(x) => { patch({ BeamNo: str(x.BeamNo), BeamUId: x.UId, WarpLen: x.WarpLen, TranDate: x.TranDate }); setSheet(null); }}
        emptyText="No beam available for this date"
      />
      <PickerSheet<any>
        visible={sheet === 'stk'}
        title="Select Stock Type"
        placeholder="Search"
        remote={false}
        onClose={() => setSheet(null)}
        load={async () => STOCK_TYPES}
        keyOf={(x) => x.StkType}
        render={(x) => ({ title: x.stktypename, sub: x.StkType })}
        onPick={(x) => pickStk(x.StkType)}
      />
      <PickerSheet<any>
        key={`dsn-${designs.length}`}
        visible={sheet === 'dsn'}
        title="Select Design"
        placeholder="Search design"
        remote={false}
        onClose={() => setSheet(null)}
        load={async () => designs}
        keyOf={(x, i) => `${x.DsnCode}-${i}`}
        render={(x) => ({ title: str(x.DsnName), sub: `Code ${str(x.DsnCode)}` })}
        onPick={pickDesign}
        emptyText="No design for this beam / stock type"
      />
      <PickerSheet<any>
        key={`iss-${issueDesigns.length}`}
        visible={sheet === 'iss'}
        title="Select Issue Design"
        placeholder="Search design"
        remote={false}
        onClose={() => setSheet(null)}
        load={async () => issueDesigns}
        keyOf={(x, i) => `${x.IssDsnCode}-${i}`}
        render={(x) => ({ title: str(x.IssDsnName), sub: `Code ${str(x.IssDsnCode)}` })}
        onPick={(x) => { patch({ IssDsnCode: x.IssDsnCode, IssDsnName: str(x.IssDsnName) }); setSheet(null); }}
      />
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Design items                                                                */
/* -------------------------------------------------------------------------- */

function ItemsView({ api, issue, patch, access, preselect, onBack, onNext }: {
  api: WeftIssueApi; issue: Issue; patch: (p: Partial<Issue>) => void; access: boolean; preselect?: any;
  onBack: () => void; onNext: () => void;
}) {
  const { wide } = useWide();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    const iss = str(issue.IssDsnCode).trim();
    const dsn = str(issue.DsnCode).trim();
    if (!issue.PrpCode || !issue.YearNo || !dsn) { setLoading(false); return; }
    api.designItems({ prpcode: issue.PrpCode, yearno: issue.YearNo, dsncode: access && iss ? iss : dsn })
      .then((list) => {
        if (!alive) return;
        setItems(list);
        const cur = list.find((x) => (issue.ItmCode && String(x.mitmcode) === String(issue.ItmCode) && String(x.srno) === String(issue.srno)))
          || (preselect ? list.find((x) => String(x.mitmcode) === String(preselect)) : null);
        if (cur) setSel(cur);
      })
      .catch((e) => alive && setError(errOf(e, 'Unable to load design items')))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [api, issue.PrpCode, issue.YearNo, issue.DsnCode, issue.IssDsnCode, access]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    if (!sel) { AppAlert.alert('Please select an item'); return; }
    patch({ ItmCode: sel.mitmcode, ItmName: str(sel.mitmname), srno: sel.srno });
    onNext();
  };

  return (
    <ViewShell
      title="Design Items"
      subtitle={`${str(issue.IssNo) ? `Issue ${str(issue.IssNo)} · ` : ''}Beam ${str(issue.BeamNo) || '-'}`}
      onBack={onBack}
      maxWidth={900}
      footer={
        <View style={s.footer}>
          <View style={s.footerInner}>
            <Btn title="Back" variant="secondary" onPress={onBack} style={{ flex: 1 }} />
            <Btn title="Save & Next" icon="arrow-forward" variant="accent" onPress={next} disabled={!sel} style={{ flex: 2 }} />
          </View>
        </View>
      }
    >
      <View style={s.dsnHero}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroEyebrow}>DESIGN</Text>
          <Text style={s.heroTitle} numberOfLines={2}>{str(issue.DsnName) || '—'}</Text>
          <Text style={s.heroSub}>Code {str(issue.DsnCode) || '-'}{access && issue.IssDsnCode ? ` · Issue design ${str(issue.IssDsnName || issue.IssDsnCode)}` : ''}</Text>
        </View>
      </View>
      {!!error && <ErrorBox text={error} />}
      {loading ? <Loader label="Loading items…" /> : items.length === 0 ? (
        <EmptyState icon="inventory-2" title="No items for this design" />
      ) : (
        <View style={[wide && s.grid]}>
          {items.map((it, i) => {
            const on = sel && String(sel.srno) === String(it.srno) && String(sel.mitmcode) === String(it.mitmcode);
            return (
              <TouchableOpacity key={`${it.srno}-${i}`} onPress={() => setSel(it)} style={[s.itemRow, on && s.itemOn, wide && s.gridItem]} activeOpacity={0.75}>
                <View style={[s.itemNo, on && { backgroundColor: T.copper }]}><Text style={[s.itemNoText, on && { color: '#fff' }]}>{str(it.srno)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemCode}>{str(it.mitmcode)}</Text>
                  <Text style={s.itemName} numberOfLines={2}>{str(it.mitmname)}</Text>
                </View>
                <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={on ? T.copper : T.muted} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Carton entry + list                                                         */
/* -------------------------------------------------------------------------- */

function CartonsView({ api, mode, issue, patch, cartons, setCartons, entryUId, setEntryUId, editMode, onBack, onFinish }: {
  api: WeftIssueApi; mode: Mode; issue: Issue; patch: (p: Partial<Issue>) => void;
  cartons: Carton[]; setCartons: (c: Carton[]) => void; entryUId: any; setEntryUId: (v: any) => void; editMode: boolean;
  onBack: () => void; onFinish: () => void;
}) {
  const { wide } = useWide();
  const [tab, setTab] = useState<'entry' | 'list'>(cartons.length ? 'list' : 'entry');
  const [scanned, setScanned] = useState<Record<string, any> | null>(null);
  const [chees, setChees] = useState('');
  const [qty, setQty] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ctx = { prpcode: issue.PrpCode, yearno: issue.YearNo };
  const qtyType = mode === 'new' ? '1' : '0';

  const applyCarton = async (obj: Record<string, any>) => {
    setScanned(obj);
    setChees('');
    setQty('');
    setError(null);
    if (!obj.ItmName && obj.ItmCode) {
      try {
        const names = await api.itemNames({ ...ctx, strcode: issue.yarnstrcode, itmcode: obj.ItmCode, mercode: obj.MerCode, grdcode: obj.GrdCode, shdcode: obj.ShdCode });
        if (names) setScanned((cur) => (cur && cur.CartNo === obj.CartNo ? { ...cur, ItmName: names.ItmName, MerName: names.MerName, ShdName: names.ShdName, GrdName: names.GrdName } : cur));
      } catch {
        // names are display only
      }
    }
  };

  const onScan = (raw: string) => {
    const parsed = parseQr(raw);
    setScanOpen(false);
    if (!parsed) { AppAlert.alert('Invalid QR', 'QR format not valid'); return; }
    void applyCarton(parsed);
  };

  const availChees = scanned ? num(scanned.Chees) : 0;
  const availQty = scanned ? num(scanned.Wt) : 0;

  /** full MODIFY payload (legacy handleSubmitScan) */
  const modifyPayload = (list: Carton[], uid: any) => ({
    PrpCode: issue.PrpCode, YearNo: issue.YearNo, CreelId: '', SetupDate: isoDay(new Date()),
    Issdate: dmy(toDate(issue.IssDate)), Shift: '', Remark: str(issue.Remark), StkType: issue.StkType || '',
    uid, DsnCode: issue.DsnCode, txntype: TXN, RecipeUId: '2',
    Cartons: list.map((c) => ({
      uid: c.UId || uid, CartNo: c.cartonNo || '', Chees: c.chees || '', Wt: c.qty || '',
      PUId: c.PUId || '', PSrNo: c.PSrNo || '', PSubSr: c.PSubSr || '', TranType: c.TranType || '',
      ItmCode: c.ItmCode || '', ItmName: c.ItmName || '', MerCode: c.MerCode || '', MerName: c.MerName || '',
      GrdCode: c.GrdCode || '', GrdName: c.GrdName || '', ShdCode: c.ShdCode || '', ShdName: c.ShdName || '',
      Denier: c.Denier || '', yearno: c.yearNo || '', ExpProdQty: c.ExpProdQty || 0,
      DsnRcpSrNo: issue.srno, DsnCode: issue.DsnCode,
      ...(mode === 'new' ? { ExpProdQtyType: qtyType } : {}),
    })),
    ExpProdQtyType: qtyType,
  });

  const submit = async () => {
    if (!scanned) { AppAlert.alert('Validation Error', 'Please scan or select carton first.'); return; }
    const cartonNo = str(scanned.CartNo).trim();
    if (!chees && !qty) { AppAlert.alert('Validation Error', 'Please enter Chees and Quantity.'); return; }
    if (!chees) { AppAlert.alert('Validation Error', 'Please enter Chees.'); return; }
    if (!qty) { AppAlert.alert('Validation Error', 'Please enter Quantity.'); return; }
    if (cartons.some((c) => str(c.cartonNo).trim() === cartonNo)) { AppAlert.alert('Duplicate Error', `Carton No ${cartonNo} already added.`); return; }
    const ch = Number(chees); const q = Number(qty);
    if (Number.isNaN(ch) || ch <= 0) { AppAlert.alert('Validation Error', 'Chees must be greater than 0.'); return; }
    if (Number.isNaN(q) || q <= 0) { AppAlert.alert('Validation Error', 'Quantity must be greater than 0.'); return; }
    if (scanned.Chees !== undefined && scanned.Chees !== '' && !Number.isNaN(Number(scanned.Chees)) && ch > availChees) {
      AppAlert.alert('Validation Error', `Entered Chees (${ch}) cannot be greater than Available Chees (${availChees}).`); return;
    }
    if (scanned.Wt !== undefined && scanned.Wt !== '' && !Number.isNaN(Number(scanned.Wt)) && q > availQty) {
      AppAlert.alert('Validation Error', `Entered Quantity (${q}) cannot be greater than Available Quantity (${availQty}).`); return;
    }

    const o = scanned;
    const carton: Carton = {
      cartonNo, chees, qty,
      PUId: o.PUId || '', PSrNo: o.PSrNo || '', PSubSr: o.PSubSr || '',
      SrNo: o.SrNo || o.PSrNo || '', SubSr: o.SubSr || o.PSubSr || '', TranType: o.TranType || '',
      ItmCode: o.ItmCode || '', ItmName: o.ItmName || '', MerCode: o.MerCode || '', MerName: o.MerName || '',
      GrdCode: o.GrdCode || '', GrdName: o.GrdName || '', ShdCode: o.ShdCode || '', ShdName: o.ShdName || '',
      Denier: o.Denier || '', yearNo: o.yearNo || '', DsnRcpSrNo: o.DsnRcpSrNo || cartons[0]?.DsnRcpSrNo || '',
      UId: o.UId || '',
    };

    setSaving(true);
    setError(null);
    try {
      carton.ExpProdQty = await api.expQty(mode, {
        ...ctx, qty: carton.qty, itmcode: carton.ItmCode, shdcode: carton.ShdCode,
        srno: issue.srno || carton.DsnRcpSrNo || '', beamuid: issue.BeamUId, dsncode: issue.DsnCode, issuid: entryUId || issue.UId,
      }).catch(() => 0);

      if (entryUId) {
        // entry exists (edit / add more) -> MODIFY with every carton
        const list = [...cartons, carton];
        const res = await api.modify(modifyPayload(list, entryUId));
        if (res?.success === true && res?.response?.error !== true) {
          setCartons(list);
          AppAlert.alert('Success', res?.response?.message || res?.message || 'Data Updated Successfully ✅');
          resetEntry();
          setTab('list');
        } else {
          throw { message: res?.response?.message || res?.message || 'Unable to update data.' };
        }
      } else {
        // first carton -> ADD
        const payload = {
          PrpCode: issue.PrpCode, YearNo: issue.YearNo, BeamNo: issue.BeamNo, BeamUId: issue.BeamUId, StkType: issue.StkType,
          IssNo: issue.IssNo, WarpLen: issue.WarpLen, Issdate: dmy(toDate(issue.IssDate)), SetupDate: dmy(toDate(issue.IssDate)),
          uid: '', month: issue.month, suffix: issue.suffix, strcode: issue.yarnstrcode, txntype: TXN, RecipeUId: '2', DsnCode: issue.DsnCode,
          Cartons: [{
            uid: '', CartNo: carton.cartonNo, Chees: carton.chees, Wt: carton.qty,
            PUId: carton.PUId, PSrNo: carton.PSrNo, PSubSr: carton.PSubSr, TranType: carton.TranType,
            ItmCode: carton.ItmCode, ItmName: carton.ItmName, MerCode: carton.MerCode, MerName: carton.MerName,
            GrdCode: carton.GrdCode, GrdName: carton.GrdName, ShdCode: carton.ShdCode, ShdName: carton.ShdName,
            Denier: carton.Denier, yearno: carton.yearNo, ExpProdQty: carton.ExpProdQty || 0,
            DsnRcpSrNo: issue.srno, DsnCode: issue.DsnCode, ExpProdQtyType: qtyType,
          }],
          ExpProdQtyType: qtyType,
        };
        const res = await api.add(payload);
        if (res?.success && res?.response?.error !== true) {
          const uid = res.response?.data?.UId ?? res.response?.data?.uid ?? res.response?.UId ?? res.response?.uid
            ?? res.data?.UId ?? res.data?.uid ?? res.UId ?? res.uid ?? '';
          const cUid = cartonUidFrom(res, carton.cartonNo);
          setEntryUId(uid);
          patch({ UId: uid });
          setCartons([...cartons, normalizeCarton({ ...carton, UId: cUid || carton.UId })]);
          AppAlert.alert('Success', res?.response?.message || res?.message || 'Data Saved Successfully ✅');
          resetEntry();
          setTab('list');
        } else {
          throw { message: res?.response?.message || res?.message || 'Unable to save data.' };
        }
      }
    } catch (e: any) {
      const m = errOf(e, 'Unable to save data.');
      setError(m);
      AppAlert.alert('Unable to Save', m);
    } finally {
      setSaving(false);
    }
  };

  const resetEntry = () => { setScanned(null); setChees(''); setQty(''); };

  /** reload cartons of the entry (legacy refreshAfterSingleDelete) */
  const reload = async () => {
    try {
      const res = await api.show({ uid: entryUId, prpcode: issue.PrpCode, yearno: issue.YearNo });
      if (res?.success) {
        const { cartons: list } = mapShow(res.response, issue.YearNo);
        setCartons(list);
        return list;
      }
    } catch {
      // keep local list
    }
    return null;
  };

  const resolveUid = async (c: Carton) => {
    const own = c.UId ?? c.uid ?? c.CartonUId ?? c.cartonuid;
    if (own) return own;
    const list = await reload();
    const hit = list?.find((x) => str(x.cartonNo) === str(c.cartonNo));
    return hit?.UId || '';
  };

  const deleteCarton = (c: Carton) => {
    AppAlert.alert('Delete Carton', `Are you sure you want to delete this Carton ${c.cartonNo}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyKey(c.cartonNo);
          try {
            const uid = await resolveUid(c);
            if (!uid) { AppAlert.alert('Error', 'Carton UID is missing. Cannot delete this carton.'); return; }
            const res = await api.deleteCarton({
              cartonno: c.cartonNo || '', srno: c.SrNo || c.PSrNo || '', subsrno: c.SubSr || c.PSubSr || '', uid,
              prpcode: issue.PrpCode, yearno: issue.YearNo, txntype: TXN,
            });
            if (res?.success === true && res?.response?.error !== true) {
              const left = cartons.filter((x) => str(x.cartonNo) !== str(c.cartonNo));
              setCartons(left);
              if (!left.length) {
                AppAlert.alert('Success', 'Data deleted Successfully ✅', [{ text: 'OK', onPress: onFinish }]);
              } else {
                AppAlert.alert('Success', 'Data deleted Successfully ✅');
                void reload();
              }
            } else {
              AppAlert.alert('Error', res?.response?.message || res?.message || 'Delete failed');
            }
          } catch (e) {
            AppAlert.alert('Error', errOf(e, 'Delete failed'));
          } finally {
            setBusyKey(null);
          }
        },
      },
    ]);
  };

  const deleteEntry = () => {
    if (!entryUId) { AppAlert.alert('Delete Error', 'Entry UID not found.'); return; }
    AppAlert.alert('Delete Complete Entry', 'Are you sure you want to delete the complete Weft Issue entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyKey('ENTRY');
          try {
            const res = await api.deleteEntry({ prpcode: issue.PrpCode, yearno: issue.YearNo, uid: entryUId });
            if (res?.success === true) AppAlert.alert('Success', 'Data deleted Successfully ✅', [{ text: 'OK', onPress: onFinish }]);
            else AppAlert.alert('Error', res?.message || 'Delete failed');
          } catch {
            AppAlert.alert('Error', 'Error while deleting entry');
          } finally {
            setBusyKey(null);
          }
        },
      },
    ]);
  };

  const done = () => {
    if (!cartons.length) { AppAlert.alert('Validation', 'Please add at least one carton.'); return; }
    onFinish();
  };

  const totalQty = cartons.reduce((sum, c) => sum + Number(c.qty || 0), 0);

  return (
    <ViewShell
      title="Weft Issue Entry"
      subtitle={`${str(issue.IssNo) ? `Issue ${str(issue.IssNo)} · ` : ''}Beam ${str(issue.BeamNo) || '-'} · ${str(issue.ItmName) || str(issue.DsnName)}`}
      onBack={onBack}
      maxWidth={1000}
      footer={
        <View style={s.footer}>
          <View style={[s.footerInner, wide && { maxWidth: 1000 }]}>
            {tab === 'entry' ? (
              <>
                <Btn title={cartons.length ? `Cartons (${cartons.length})` : 'Close'} variant="secondary" icon={cartons.length ? 'list' : undefined} onPress={() => (cartons.length ? setTab('list') : onBack())} style={{ flex: 1 }} />
                <Btn title="Submit" icon="check" variant="accent" onPress={submit} loading={saving} style={{ flex: 2 }} />
              </>
            ) : (
              <>
                {!!entryUId && <Btn title="Delete" icon="delete-outline" variant="danger" onPress={deleteEntry} loading={busyKey === 'ENTRY'} />}
                <Btn title="Add More" icon="add" variant="secondary" onPress={() => setTab('entry')} style={{ flex: 1 }} />
                <Btn title="Done" icon="check" variant="accent" onPress={done} style={{ flex: 1 }} />
              </>
            )}
          </View>
        </View>
      }
    >
      <View style={s.tabs}>
        <TouchableOpacity onPress={() => setTab('entry')} style={[s.tab, tab === 'entry' && s.tabOn]}><Text style={[s.tabText, tab === 'entry' && { color: '#fff' }]}>Add Carton</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('list')} style={[s.tab, tab === 'list' && s.tabOn]}><Text style={[s.tabText, tab === 'list' && { color: '#fff' }]}>Cartons ({cartons.length})</Text></TouchableOpacity>
      </View>
      {!!error && <Banner tone="danger" icon="error-outline" text={error} />}

      {tab === 'entry' ? (
        <View style={[wide && s.wideRow2]}>
          <View style={[wide && { flex: 1 }]}>
            <Card title="Find carton">
              <View style={s.row2}>
                <Btn title="Scan QR" icon="qr-code-scanner" onPress={() => setScanOpen(true)} style={{ flex: 1 }} />
                <Btn title="Manual" icon="search" variant="secondary" onPress={() => setSearchOpen(true)} style={{ flex: 1 }} />
              </View>
              {Platform.OS === 'web' && <Text style={[s.muted, { marginTop: 8 }]}>On web, use Manual search if the camera is not available.</Text>}
            </Card>
            <Card title="Carton details">
              {!scanned ? <Text style={s.muted}>Scan or search a carton to continue.</Text> : (
                <>
                  <KV k="Carton Number" v={str(scanned.CartNo)} strong />
                  <KV k="Item" v={str(scanned.ItmName) || str(scanned.ItmCode) || '-'} />
                  <KV k="Merge" v={str(scanned.MerName) || str(scanned.MerCode) || '-'} />
                  <KV k="Shade" v={str(scanned.ShdName) || str(scanned.ShdCode) || '-'} />
                  <KV k="Grade" v={str(scanned.GrdName) || str(scanned.GrdCode) || '-'} last />
                </>
              )}
            </Card>
          </View>
          <View style={[wide && { flex: 1 }]}>
            <Card title="Issue quantity">
              <View style={s.row2}>
                <View style={s.col}>
                  <Field label={`Chees${scanned ? ` (avail ${str(scanned.Chees) || 0})` : ''}`} required value={chees} onChangeText={setChees} keyboardType="numeric" placeholder="0" big editable={!!scanned} />
                </View>
                <View style={s.col}>
                  <Field label={`Quantity${scanned ? ` (avail ${str(scanned.Wt) || 0})` : ''}`} required value={qty} onChangeText={setQty} keyboardType="decimal-pad" placeholder="0.000" big editable={!!scanned} />
                </View>
              </View>
              {!!scanned && (
                <TouchableOpacity onPress={() => { setChees(str(scanned.Chees)); setQty(str(scanned.Wt)); }} style={s.fullBtn}>
                  <Icon name="call-made" size={14} color={T.blue} />
                  <Text style={s.fullText}>Use full available</Text>
                </TouchableOpacity>
              )}
            </Card>
          </View>
        </View>
      ) : cartons.length === 0 ? (
        <EmptyState icon="inventory-2" title="No cartons yet" subtitle="Add the first carton" />
      ) : (
        <>
          <View style={s.sumBar}>
            <View style={{ flex: 1 }}><Text style={s.qtyLbl}>ITEMS</Text><Text style={s.sumVal}>{cartons.length}</Text></View>
            <View style={{ flex: 1 }}><Text style={s.qtyLbl}>TOTAL QTY</Text><Text style={s.sumVal}>{totalQty.toFixed(3)}</Text></View>
          </View>
          <View style={[wide && s.grid]}>
            {cartons.map((c, i) => (
              <View key={`${c.cartonNo}-${i}`} style={[s.cRow, wide && s.gridItem]}>
                <Text style={s.cIdx}>{i + 1}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cNo}>{str(c.cartonNo)}</Text>
                  <Text style={s.cSub} numberOfLines={1}>{str(c.ItmName)} / {str(c.MerName)}</Text>
                  <Text style={s.cSub} numberOfLines={1}>{str(c.ShdName)} / {str(c.GrdName)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={s.cQty}>Qty {str(c.qty)}</Text>
                  <Text style={s.cSub}>Chees {str(c.chees)}</Text>
                  {!!c.ExpProdQty && <Text style={s.cSub}>Exp {str(c.ExpProdQty)}</Text>}
                </View>
                <TouchableOpacity onPress={() => deleteCarton(c)} style={s.cDel} hitSlop={HIT} disabled={!!busyKey}>
                  {busyKey === c.cartonNo ? <ActivityIndicator size="small" color={T.red} /> : <Icon name="delete-outline" size={18} color={T.red} />}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      <ScannerModal visible={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />
      <CartonSearchSheet
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        search={(t) => api.searchCarton({ ...ctx, strcode: issue.yarnstrcode, mitmcode: str(issue.ItmCode), searchcarton: t })}
        onPick={(r) => {
          setSearchOpen(false);
          void applyCarton({
            CartNo: r.CartNo, ItmName: r.ItmName, MerName: r.MerName, ShdName: r.ShdName, GrdName: r.GrdName,
            Chees: r.Chees, Wt: r.Wt, PUId: r.PUId, PSrNo: r.PSrNo, PSubSr: r.PSubSr, TranType: r.TranType,
            ItmCode: r.ItmCode, MerCode: r.MerCode, GrdCode: r.GrdCode, ShdCode: r.ShdCode, Denier: r.Denier,
            yearNo: r.yearno, SrNo: r.SrNo, SubSr: r.SubSr ?? r.subsrno ?? r.PSubSr, UId: r.UId ?? r.uid ?? r.CartonUId ?? r.cartonuid,
          });
        }}
      />
    </ViewShell>
  );
}

function CartonSearchSheet({ visible, onClose, search, onPick }: {
  visible: boolean; onClose: () => void; search: (t: string) => Promise<any[]>; onPick: (r: any) => void;
}) {
  const { width, height } = useWindowDimensions();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { if (!visible) { setRows([]); setMsg(null); } }, [visible]);

  const run = async () => {
    const t = q.trim();
    if (!t) { AppAlert.alert('Enter carton number'); return; }
    setLoading(true);
    setMsg(null);
    try {
      const list = await search(t);
      setRows(list);
      if (!list.length) setMsg('No data found');
    } catch {
      setMsg('Error while searching');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { maxHeight: Math.round(height * 0.86) }, width >= 760 && { maxWidth: 560 }]}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>Search Carton</Text>
            <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={21} color={T.muted} /></TouchableOpacity>
          </View>
          <View style={s.searchRow}>
            <TextInput value={q} onChangeText={setQ} placeholder="Enter carton no" placeholderTextColor={T.muted} style={s.sheetInput} autoFocus onSubmitEditing={run} returnKeyType="search" autoCapitalize="characters" />
            <Btn title="Search" icon="search" onPress={run} loading={loading} />
          </View>
          {!!msg && <Text style={[s.muted, { textAlign: 'center', padding: 14 }]}>{msg}</Text>}
          <FlatList
            data={rows}
            keyExtractor={(r, i) => `${str(r.CartNo)}-${i}`}
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => onPick(item)} style={s.sRow} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cNo}>{str(item.CartNo)}</Text>
                  <Text style={s.cSub} numberOfLines={1}>{str(item.ItmName)} / {str(item.MerName)} / {str(item.ShdName)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.cQty}>Wt {str(item.Wt)}</Text>
                  <Text style={s.cSub}>Chees {str(item.Chees)}</Text>
                </View>
                <Icon name="chevron-right" size={18} color={T.muted} />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function ScannerModal({ visible, onClose, onScan }: { visible: boolean; onClose: () => void; onScan: (v: string) => void }) {
  const [perm, requestPerm] = useCameraPermissions();
  const lock = useRef(false);
  useEffect(() => {
    if (visible) { lock.current = false; if (perm && !perm.granted && perm.canAskAgain) void requestPerm(); }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={s.scanTop}>
          <Text style={s.scanTitle}>Scan QR Code</Text>
          <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={24} color="#fff" /></TouchableOpacity>
        </View>
        {perm?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }: { data: string }) => {
              if (lock.current || !data) return;
              lock.current = true;
              onScan(data);
              setTimeout(() => { lock.current = false; }, 2000);
            }}
          />
        ) : (
          <View style={s.scanNo}>
            <Icon name="no-photography" size={36} color="#fff" />
            <Text style={s.scanNoText}>Camera permission is needed to scan cartons.</Text>
            <Btn title="Allow camera" icon="photo-camera" variant="accent" onPress={() => requestPerm()} />
          </View>
        )}
        <View style={{ padding: 16 }}><Btn title="Close Scanner" variant="secondary" onPress={onClose} /></View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  pad: { padding: 12 },
  side: { width: 330, flexGrow: 0 },
  wideRow2: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  row2: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  col: { flex: 1, minWidth: 140 },
  label: { fontSize: 11, fontWeight: '800', color: T.ink, marginBottom: 5 },
  muted: { fontSize: 12.5, fontWeight: '600', color: T.muted },
  mono: { fontFamily: MONO, color: T.ink, fontWeight: '900' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 44, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 11 },
  searchInput: { flex: 1, fontSize: 13.5, color: T.ink, paddingVertical: 0 },
  chipLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  modeIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${T.copper}1A`, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 20 },
  modeTitle: { fontSize: 16, fontWeight: '900', color: T.ink, textAlign: 'center', marginVertical: 16 },
  modeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  modeBadge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  modeName: { fontSize: 15.5, fontWeight: '900', color: T.ink },
  modeDesc: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },

  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, borderLeftColor: T.copper, padding: 12, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  no: { fontSize: 15, fontWeight: '900', color: T.ink, fontFamily: MONO },
  date: { fontSize: 11.5, fontWeight: '700', color: T.muted },
  beam: { fontSize: 12.5, fontWeight: '700', color: T.muted, marginTop: 4 },
  dsn: { backgroundColor: T.sub, borderRadius: 8, padding: 8, marginTop: 8 },
  dsnText: { fontSize: 12.5, fontWeight: '800', color: T.yd },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  qtyBox: { backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  qtyLbl: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.3 },
  qtyVal: { fontSize: 14, fontWeight: '900', color: T.ink, fontFamily: MONO },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 10, borderRadius: 8, backgroundColor: `${T.blue}10` },
  actText: { fontSize: 12, fontWeight: '800' },
  fab: {
    position: 'absolute', right: 18, bottom: 22, minWidth: 54, height: 54, borderRadius: 27, paddingHorizontal: 16,
    backgroundColor: T.copper, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 13.5, fontWeight: '900' },
  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, width: '100%', maxWidth: 900, alignSelf: 'center' },

  vouRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  vouMonth: { width: 72, borderRadius: 10, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  vouLbl: { fontSize: 8.5, fontWeight: '900', color: T.muted },
  vouVal: { fontSize: 15, fontWeight: '900', color: T.ink, fontFamily: MONO },
  vouInput: { height: 44, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 11, fontSize: 14, fontWeight: '800', color: T.ink, fontFamily: MONO },

  dsnHero: { flexDirection: 'row', backgroundColor: T.nav, borderRadius: 14, padding: 14, marginBottom: 10 },
  heroEyebrow: { fontSize: 10, fontWeight: '900', color: T.copper, letterSpacing: 0.8 },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { flexBasis: '48%', flexGrow: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  itemOn: { borderColor: T.copper, backgroundColor: `${T.copper}0D` },
  itemNo: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  itemNoText: { fontSize: 12, fontWeight: '900', color: T.ink },
  itemCode: { fontSize: 13.5, fontWeight: '900', color: T.ink, fontFamily: MONO },
  itemName: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 1 },

  tabs: { flexDirection: 'row', gap: 6, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 11, padding: 3, marginBottom: 10 },
  tab: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: T.nav },
  tabText: { fontSize: 12.5, fontWeight: '900', color: T.ink },
  fullBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  fullText: { fontSize: 12, fontWeight: '900', color: T.blue },
  sumBar: { flexDirection: 'row', backgroundColor: T.nav, borderRadius: 12, padding: 12, marginBottom: 10 },
  sumVal: { fontSize: 18, fontWeight: '900', color: '#fff', fontFamily: MONO },
  cRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 10, marginBottom: 8 },
  cIdx: { width: 26, height: 26, borderRadius: 13, backgroundColor: T.alt, textAlign: 'center', lineHeight: 26, fontSize: 11.5, fontWeight: '900', color: T.muted, overflow: 'hidden' },
  cNo: { fontSize: 14, fontWeight: '900', color: T.ink, fontFamily: MONO },
  cSub: { fontSize: 11.5, fontWeight: '600', color: T.muted },
  cQty: { fontSize: 13, fontWeight: '900', color: T.copper, fontFamily: MONO },
  cDel: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.red}10` },

  overlay: { flex: 1, backgroundColor: 'rgba(13,27,42,0.5)', justifyContent: 'center', padding: 14 },
  sheet: { backgroundColor: T.bg, borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 560, alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontSize: 15, fontWeight: '900', color: T.ink },
  searchRow: { flexDirection: 'row', gap: 8, padding: 12 },
  sheetInput: { flex: 1, height: 44, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 11, fontSize: 14, fontWeight: '800', color: T.ink, fontFamily: MONO },
  sRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.hair },
  scanTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 44 },
  scanTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  scanNo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  scanNoText: { color: '#fff', fontSize: 13.5, fontWeight: '700', textAlign: 'center' },
});
