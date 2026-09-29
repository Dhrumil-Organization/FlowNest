// FILE: src/screens/weftReturn/WeftReturnModule.tsx
// NEW ERP — Weft Issue Return (legacy components/WeftIssueReturn: list +
// WeftIssueReturnEntry + WeftIssueReturnModifyEntry, 3 routes) in ONE screen.
//
// Same rules as legacy:
//   Filters  : property (GET /api/getproperty, default first), financial year
//              (yearno = last 2 digits), issue date range (default FY start →
//              today / FY end), DD-MM-YYYY.
//   List     : POST get_creel_issue_return_browse; search IssRNo; carton type /
//              status filters; card → Modify; print only when IsCartonStatus = 1;
//              delete (delete_creel_issue_return).
//   Entry    : Link Beam (get_creel_issue_detail) auto-fills item / merge / grade /
//              shade / IssUId / IssSrNo / IssSubSr / IssQty / IssChees / StkType /
//              BeamNo / BeamUId. Carton type Single (item & merge locked) / Mix,
//              carton no, cheese (TotPcs) ≤ issued Pcs, weight (TotQty) ≤ issued Qty,
//              status Open / Close. POST add_creel_issue_return with the legacy
//              PascalCase form. Close + saved → sticker print.
//   Modify   : POST get_creel_issue_return_show, only return qty / cheese of d3
//              editable, POST modify_creel_issue_return { d1, d2, d3 }, delete.
//   Print    : POST PRINTSTICKER { data:[sticker], IskgQty:0, printype:'Print',
//              PrintFormat:5, printerName, txntype } with x-api-key.
//
// Fixes vs legacy: list loads on open and refreshes after save / delete,
// FY default correct in Jan–Mar, carton type / status filters compare 0/1,
// save errors are shown, Entry print sends the sticker object (legacy sent
// the raw save payload), Modify print uses the record's year.
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  Banner, Btn, Card, DateField, EmptyState, ErrorBox, Field, HIT, KV, Loader, MONO, PickerSheet, Pill, SelectBox, useWide, ViewShell,
} from '../inquiry/ui';
import { PrinterSheet, usePrinters } from './PrinterSheet';
import {
  createWeftReturnApi, Ctx, currentFY, errOf, fyOfDate, fyOptions, fyRange, Property, str, STRCODE, TXN, WeftReturnApi,
} from './weftReturnApi';

type Props = { token: string; API: string; username?: string };
type View_ = { name: 'list' } | { name: 'entry' } | { name: 'modify'; row: any };

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function WeftReturnModule({ token, API }: Props) {
  const api = useMemo(() => createWeftReturnApi(API, token), [API, token]);
  const [view, setView] = useState<View_>({ name: 'list' });
  const [dirty, setDirty] = useState(0);

  // shared filter state (legacy passed it through router params)
  const [properties, setProperties] = useState<Property[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [fy, setFy] = useState(currentFY());
  const [from, setFrom] = useState(fyRange(currentFY()).from);
  const [to, setTo] = useState(fyRange(currentFY()).to);

  const ctx: Ctx | null = property ? { prpcode: str(property.PrpCode), prptype: str(property.PrpOf), yearno: fy.slice(-2) } : null;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view.name === 'list') return false;
      setView({ name: 'list' });
      return true;
    });
    return () => sub.remove();
  }, [view.name]);

  const back = (changed?: boolean) => { if (changed) setDirty((d) => d + 1); setView({ name: 'list' }); };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={[{ flex: 1 }, view.name !== 'list' && { display: 'none' }]}>
        <ListView
          api={api}
          ctx={ctx}
          properties={properties}
          setProperties={setProperties}
          property={property}
          setProperty={setProperty}
          fy={fy}
          setFy={(y) => { setFy(y); const r = fyRange(y); setFrom(r.from); setTo(r.to); }}
          from={from} setFrom={setFrom} to={to} setTo={setTo}
          dirty={dirty}
          onNew={() => (ctx ? setView({ name: 'entry' }) : AppAlert.alert('Warning', 'Please select Property.'))}
          onOpen={(row) => setView({ name: 'modify', row })}
        />
      </View>
      {view.name === 'entry' && ctx && <EntryView api={api} ctx={ctx} onBack={back} />}
      {view.name === 'modify' && ctx && <ModifyView api={api} ctx={ctx} row={view.row} onBack={back} />}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  List                                                                        */
/* -------------------------------------------------------------------------- */

function ListView(p: {
  api: WeftReturnApi; ctx: Ctx | null;
  properties: Property[]; setProperties: (p: Property[]) => void;
  property: Property | null; setProperty: (p: Property | null) => void;
  fy: string; setFy: (y: string) => void;
  from: string; setFrom: (v: string) => void; to: string; setTo: (v: string) => void;
  dirty: number; onNew: () => void; onOpen: (row: any) => void;
}) {
  const { api, ctx } = p;
  const { wide, xwide } = useWide();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | '0' | '1'>('all');
  const [status, setStatus] = useState<'all' | '0' | '1'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [propSheet, setPropSheet] = useState(false);
  const [printRow, setPrintRow] = useState<any>(null);
  const [printing, setPrinting] = useState(false);
  const printers = usePrinters(api);

  useEffect(() => {
    let alive = true;
    api.properties().then((list) => {
      if (!alive) return;
      p.setProperties(list);
      if (list.length && !p.property) p.setProperty(list[0]);
    }).catch((e) => alive && setError(errOf(e, 'Unable to load properties')));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const reqId = useRef(0);
  const load = useCallback(async (spinner = true) => {
    if (!ctx) return;
    const id = ++reqId.current;
    if (spinner) setLoading(true);
    setError(null);
    try {
      const list = await api.browse(ctx, p.from, p.to);
      if (id === reqId.current) setRows(list);
    } catch (e) {
      if (id === reqId.current) { setRows([]); setError(errOf(e, 'Unable to load data')); }
    } finally {
      if (id === reqId.current) { setLoading(false); setRefreshing(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, ctx?.prpcode, ctx?.prptype, ctx?.yearno, p.from, p.to]);

  // load on open / property change and after every save or delete
  const ctxKey = ctx ? `${ctx.prpcode}|${ctx.yearno}` : '';
  useEffect(() => { if (ctxKey) void load(); }, [ctxKey, p.dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!t || str(r.IssRNo).toLowerCase().includes(t) || str(r.CartNo).toLowerCase().includes(t))
      && (type === 'all' || String(num(r.IsCartonType)) === type)
      && (status === 'all' || String(num(r.IsCartonStatus)) === status));
  }, [rows, q, type, status]);

  const totals = useMemo(() => ({
    qty: list.reduce((s, r) => s + num(r.TotQty), 0),
    pcs: list.reduce((s, r) => s + num(r.TotPcs), 0),
  }), [list]);

  const remove = (row: any) => {
    AppAlert.alert('Delete Confirmation', `Are you sure you want to delete ${row.IssRNo} ?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          if (!ctx) return;
          try {
            const res = await api.remove(ctx, row.UId);
            if (res?.success === true) {
              setRows((cur) => cur.filter((x) => x.UId !== row.UId));
              AppAlert.alert('Success', res?.message || `${row.IssRNo} deleted successfully`);
            } else AppAlert.alert(res?.success === false ? 'Warning' : 'Error', res?.message || 'Delete failed');
          } catch (e) {
            AppAlert.alert('Error', errOf(e, 'Delete failed.'));
          }
        },
      },
    ]);
  };

  const print = async (printerName: string) => {
    const item = printRow;
    if (!item) return;
    setPrinting(true);
    try {
      const res = await api.print({
        UId: item.UId ?? '0', TranDate: '0', PrpCode: item.PrpCode ?? '', StrCode: item.StrCode ?? '0',
        ItmCode: item.ItmCode ?? '0', MerCode: item.MerCode ?? '0', ShdCode: item.ShdCode ?? '0',
        GrdCode: item.GrdCode ?? '0', Denier: item.Denier ?? '0', DsnCode: '0', CartNo: item.CartNo ?? '',
        Wt: item.TotQty ?? '0', Chees: item.TotPcs ?? '', IsAuto: '0', GrossWt: '0',
        PUId: item.UId ?? '0', PSrNo: item.IssSrNo ?? '0', PSubSr: item.IssSubSr ?? '0',
        TranType: '', TranName: ' ', StkType: item.StkType ?? '', StkDate: '0', SrNo: item.IssSrNo ?? '0',
        UsrCode: '0', StrName: '', ItmName: item.ItmName ?? '', MerName: item.MerName ?? '',
        ShdName: item.ShdName ?? '', GrdName: item.GrdName ?? '', DnsName: '', Stktype: item.StkType ?? '',
        nStkDate: '', yearno: fyOfDate(item.IssRDate), IskgQty: '0', Rate: '0', MItmCode: '0', MItmName: '',
      }, printerName);
      if (res?.success) { AppAlert.alert('Print Successful', `✅ ${res.printed ?? 1} label(s) sent to printer.`); setPrintRow(null); }
      else AppAlert.alert('Print failed', res?.message || 'Operation failed');
    } catch (e: any) {
      AppAlert.alert('Print failed', e?.response?.data?.error || errOf(e, 'Print failed'));
    } finally {
      setPrinting(false);
    }
  };

  const cols = xwide ? 3 : wide ? 2 : 1;

  const filterCard = (
    <Card title="Filters">
      <SelectBox label="Property" value={p.property?.LngName} placeholder="Select property" onPress={() => setPropSheet(true)} icon="expand-more" />
      <Text style={s.label}>Financial Year</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
        {fyOptions().map((y) => <Seg key={y} label={y} on={p.fy === y} onPress={() => p.setFy(y)} mono />)}
      </ScrollView>
      <View style={s.row2}>
        <View style={s.col}><DateField label="From Date" value={p.from} onChange={p.setFrom} minToday={false} /></View>
        <View style={s.col}><DateField label="To Date" value={p.to} onChange={p.setTo} minToday={false} /></View>
      </View>
      <Text style={s.label}>Carton Type</Text>
      <View style={s.segRow}>
        <Seg label="All" on={type === 'all'} onPress={() => setType('all')} />
        <Seg label="Single" on={type === '0'} onPress={() => setType('0')} />
        <Seg label="Mix" on={type === '1'} onPress={() => setType('1')} />
      </View>
      <Text style={s.label}>Carton Status</Text>
      <View style={s.segRow}>
        <Seg label="All" on={status === 'all'} onPress={() => setStatus('all')} />
        <Seg label="Open" on={status === '0'} onPress={() => setStatus('0')} />
        <Seg label="Close" on={status === '1'} onPress={() => setStatus('1')} />
      </View>
      <Btn title="Apply Filters" icon="refresh" variant="accent" onPress={() => { setFiltersOpen(false); void load(); }} loading={loading} style={{ marginTop: 6 }} />
    </Card>
  );

  const header = (
    <View style={{ gap: 8, marginBottom: 8 }}>
      {!wide && filtersOpen && filterCard}
      <View style={s.searchBox}>
        <Icon name="search" size={17} color={T.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search return no / carton no" placeholderTextColor={T.muted} style={s.searchInput} autoCorrect={false} />
        {!!q && <TouchableOpacity onPress={() => setQ('')} hitSlop={HIT}><Icon name="close" size={16} color={T.muted} /></TouchableOpacity>}
      </View>
      <View style={s.chipLine}>
        <Pill label={p.property?.LngName || 'Select Property'} fg={T.nav} bg={T.alt} icon="business" />
        <Pill label={p.fy} fg={T.nav} bg={T.alt} icon="event" />
        <Pill label={`${p.from.replace(/-/g, '/')} – ${p.to.replace(/-/g, '/')}`} fg={T.nav} bg={T.alt} icon="date-range" />
      </View>
      {list.length > 0 && (
        <View style={s.kpiRow}>
          <Kpi label="ENTRIES" value={String(list.length)} color={T.blue} />
          <Kpi label="TOTAL QTY" value={totals.qty.toFixed(3)} color={T.copper} />
          <Kpi label="TOTAL PCS" value={String(totals.pcs)} color={T.green} />
        </View>
      )}
      {!!error && <ErrorBox text={error} onRetry={() => load()} />}
    </View>
  );

  return (
    <ViewShell
      title="Weft Issue Return"
      subtitle={p.property ? `${p.property.LngName} · ${p.fy}` : 'Return weft cartons from beams'}
      hideBack
      scroll={false}
      right={!wide ? (
        <TouchableOpacity onPress={() => setFiltersOpen((v) => !v)} style={[s.tune, filtersOpen && { backgroundColor: T.nav }]} hitSlop={HIT}>
          <Icon name="tune" size={18} color={filtersOpen ? '#fff' : T.ink} />
        </TouchableOpacity>
      ) : null}
    >
      <View style={[{ flex: 1 }, wide && s.wideRow]}>
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
              ListEmptyComponent={!error ? <EmptyState icon="assignment-return" title="No Data Found" subtitle={ctx ? 'Change filters or add a new return' : 'Select a property'} /> : null}
              renderItem={({ item }) => {
                const closed = num(item.IsCartonStatus) === 1;
                return (
                  <TouchableOpacity style={[s.card, { flex: 1 / cols }]} activeOpacity={0.8} onPress={() => p.onOpen(item)}>
                    <View style={s.cardHead}>
                      <Text style={s.no}>{str(item.IssRNo)}</Text>
                      <Pill label={closed ? 'Close' : 'Open'} fg={closed ? T.red : T.green} bg={closed ? `${T.red}14` : `${T.green}14`} />
                    </View>
                    <Text style={s.date}>{str(item.IssRDate)}</Text>
                    <View style={s.meta}>
                      <Meta k="Stock Type" v={str(item.StkType) || '-'} />
                      <Meta k="Carton No" v={str(item.CartNo) || '0'} />
                      <Meta k="Type" v={num(item.IsCartonType) === 1 ? 'Mix' : 'Single'} />
                    </View>
                    <View style={s.qtyRow}>
                      <View style={s.qtyBox}><Text style={s.qtyLbl}>QTY</Text><Text style={s.qtyVal}>{str(item.TotQty) || '0'}</Text></View>
                      <View style={s.qtyBox}><Text style={s.qtyLbl}>PCS</Text><Text style={s.qtyVal}>{str(item.TotPcs) || '0'}</Text></View>
                      <View style={{ flex: 1 }} />
                      {closed && (
                        <TouchableOpacity onPress={(e: any) => { e?.stopPropagation?.(); setPrintRow(item); }} style={s.act} hitSlop={HIT}>
                          <Icon name="print" size={18} color={T.blue} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={(e: any) => { e?.stopPropagation?.(); remove(item); }} style={[s.act, { backgroundColor: `${T.red}10` }]} hitSlop={HIT}>
                        <Icon name="delete-outline" size={18} color={T.red} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>

      <TouchableOpacity style={s.fab} onPress={p.onNew} activeOpacity={0.85}>
        <Icon name="add" size={22} color="#fff" />
        {wide && <Text style={s.fabText}>New Return</Text>}
      </TouchableOpacity>

      <PickerSheet<Property>
        visible={propSheet}
        title="Select Property"
        placeholder="Search property"
        remote={false}
        onClose={() => setPropSheet(false)}
        load={async () => p.properties}
        keyOf={(x, i) => `${x.PrpCode}-${i}`}
        render={(x) => ({ title: x.LngName, sub: `${x.PrpCode}${x.PrpOf ? ` · ${x.PrpOf}` : ''}` })}
        onPick={(x) => { p.setProperty(x); setPropSheet(false); }}
      />
      <PrinterSheet
        visible={!!printRow}
        subtitle={printRow ? `${str(printRow.IssRNo)} · ${str(printRow.CartNo)}` : ''}
        state={printers}
        printing={printing}
        onClose={() => setPrintRow(null)}
        onPrint={(pr) => print(pr.Name)}
      />
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Master dropdowns (item / merge / grade / shade)                            */
/* -------------------------------------------------------------------------- */

function useMasters(api: WeftReturnApi, ctx: Ctx) {
  const [m, setM] = useState<{ items: any[]; merges: any[]; grades: any[]; shades: any[] }>({ items: [], merges: [], grades: [], shades: [] });
  useEffect(() => {
    let alive = true;
    const safe = (f: Promise<any>) => f.then((d) => (Array.isArray(d) ? d : [])).catch(() => []);
    Promise.all([safe(api.items(ctx)), safe(api.merges(ctx)), safe(api.grades(ctx)), safe(api.shades(ctx))])
      .then(([items, merges, grades, shades]) => { if (alive) setM({ items, merges, grades, shades }); });
    return () => { alive = false; };
  }, [api, ctx.prpcode, ctx.yearno]); // eslint-disable-line react-hooks/exhaustive-deps
  return m;
}

const nameOf = (list: any[], codeKey: string, nameKey: string, code: any) =>
  list.find((x) => String(x[codeKey]) === String(code))?.[nameKey] || (code !== null && code !== undefined && code !== '' ? String(code) : '-');

/* -------------------------------------------------------------------------- */
/*  New entry                                                                   */
/* -------------------------------------------------------------------------- */

const emptyForm = (ctx: Ctx) => ({
  CartNo: '', ItmCode: null as any, MerCode: null as any, GrdCode: null as any, ShdCode: null as any,
  TotPcs: '', TotQty: '', IssUId: null as any, IssSrNo: null as any, IssSubSr: null as any,
  IssQty: 0, IssChees: 0, StkType: null as any,
  PrpCode: ctx.prpcode, StrCode: STRCODE, YearNo: ctx.yearno,
  IsCartonType: 0, IsCartonStatus: 0, Denier: '', BeamNo: '', BeamUId: '',
});

function EntryView({ api, ctx, onBack }: { api: WeftReturnApi; ctx: Ctx; onBack: (changed?: boolean) => void }) {
  const { wide } = useWide();
  const masters = useMasters(api, ctx);
  const [form, setForm] = useState(() => emptyForm(ctx));
  const [cartonType, setCartonType] = useState<'Single' | 'Mix'>('Single');
  const [status, setStatus] = useState<'Open' | 'Close'>('Open');
  const [beam, setBeam] = useState<any>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [pick, setPick] = useState<null | 'item' | 'merge' | 'grade' | 'shade'>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printers = usePrinters(api);

  const set = (patch: Partial<ReturnType<typeof emptyForm>>) => setForm((f) => ({ ...f, ...patch }));
  const locked = !!saved;
  const itemLocked = cartonType === 'Single' || locked;

  const onLink = (item: any) => {
    const it = masters.items.find((x) => String(x.ItmCode) === String(item.ItmCode));
    setBeam(item);
    set({
      ItmCode: String(item.ItmCode), Denier: it?.Denier || '',
      MerCode: String(item.MerCode), GrdCode: String(item.GrdCode), ShdCode: String(item.ShdCode),
      IssUId: item.UId, IssSrNo: item.SrNo, IssSubSr: item.SubSr || item.IssSubSr || 1,
      IssChees: item.Pcs, IssQty: item.Qty, StkType: item.StkType,
      BeamNo: item.BeamNo, BeamUId: item.BeamUId,
    });
    setLinkOpen(false);
    setError(null);
  };

  const validate = () => {
    if (!beam || !form.IssUId) return 'Please select Beam first.';
    if (!String(form.CartNo).trim()) return 'Please enter Carton No.';
    if (!form.ItmCode) return 'Please select Item.';
    if (!form.MerCode) return 'Please select Merge.';
    if (!form.GrdCode) return 'Please select Grade.';
    if (!form.ShdCode) return 'Please select Shade.';
    if (!form.TotPcs) return 'Please enter Cheese.';
    if (!form.TotQty) return 'Please enter Weight.';
    const pcs = Number(form.TotPcs || 0); const qty = Number(form.TotQty || 0);
    const maxPcs = Number(form.IssChees || 0); const maxQty = Number(form.IssQty || 0);
    if (pcs > maxPcs) return `The entered Cheese (${pcs}) exceeds the allowed limit of ${maxPcs}.`;
    if (qty > maxQty) return `The entered Weight (${qty}) exceeds the allowed limit of ${maxQty}.`;
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) { setError(problem); AppAlert.alert('Warning', problem); return; }
    setError(null);
    const payload = { ...form, IsCartonType: cartonType === 'Single' ? 0 : 1, IsCartonStatus: status === 'Open' ? 0 : 1 };
    setSaving(true);
    try {
      const res = await api.add(payload);
      if (res?.message === false || res?.response?.error === true) {
        AppAlert.alert('Warning', res?.response?.message || 'Unable to save.');
      } else if (res?.success === true) {
        setSaved(payload);
        AppAlert.alert('Success', res?.response?.message || 'Saved successfully.');
        if (status === 'Close') void printers.load();
      } else {
        AppAlert.alert('Error', typeof res?.message === 'string' ? res.message : 'Unable to save.');
      }
    } catch (e: any) {
      const st = e?.response?.status;
      const msg = st === 500 ? 'Server error (500). Please try again later or contact support.'
        : st === 404 ? 'API not found (404).'
          : e?.response?.data?.message || (st === 400 ? 'Bad request.' : e?.message || 'An unexpected error occurred while saving.');
      setError(msg);
      AppAlert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const print = async (printerName: string) => {
    if (!saved) return;
    setPrinting(true);
    try {
      const d = saved;
      const res = await api.print({
        UId: d.IssUId ?? '0', TranDate: '0', PrpCode: d.PrpCode ?? '', StrCode: d.StrCode ?? '0',
        ItmCode: d.ItmCode ?? '0', MerCode: d.MerCode ?? '0', ShdCode: d.ShdCode ?? '0', GrdCode: d.GrdCode ?? '0',
        Denier: d.Denier ?? '0', DsnCode: '0', CartNo: d.CartNo ?? '', Wt: d.TotQty ?? '0', Chees: d.TotPcs ?? '',
        IsAuto: '0', GrossWt: '0', PUId: d.IssUId ?? '0', PSrNo: d.IssSrNo ?? '0', PSubSr: d.IssSubSr ?? '0',
        TranType: '', TranName: ' ', StkType: d.StkType ?? '', StkDate: '0', SrNo: d.IssSrNo ?? '0', UsrCode: '0',
        StrName: '',
        ItmName: nameOf(masters.items, 'ItmCode', 'ItmName', d.ItmCode), MerName: nameOf(masters.merges, 'MerCode', 'MerName', d.MerCode),
        ShdName: nameOf(masters.shades, 'ShdCode', 'ShdName', d.ShdCode), GrdName: nameOf(masters.grades, 'GrdCode', 'GrdName', d.GrdCode),
        DnsName: '', Stktype: d.StkType ?? '', nStkDate: '', yearno: d.YearNo ?? '0', IskgQty: '0', Rate: '0', MItmCode: '0', MItmName: '',
      }, printerName);
      if (res?.success) { AppAlert.alert('Print Successful', `✅ ${res.printed ?? 1} label(s) sent to printer.`); setPrintOpen(false); }
      else AppAlert.alert('Print failed', res?.message || 'Operation failed');
    } catch (e: any) {
      AppAlert.alert('Print failed', e?.response?.data?.error || errOf(e, 'Print failed'));
    } finally {
      setPrinting(false);
    }
  };

  const denier = masters.items.find((x) => String(x.ItmCode) === String(form.ItmCode))?.Denier ?? form.Denier;

  const pickCfg = {
    item: { title: 'Select Item', list: masters.items, code: 'ItmCode', name: 'ItmName' },
    merge: { title: 'Select Merge', list: masters.merges, code: 'MerCode', name: 'MerName' },
    grade: { title: 'Select Grade', list: masters.grades, code: 'GrdCode', name: 'GrdName' },
    shade: { title: 'Select Shade', list: masters.shades, code: 'ShdCode', name: 'ShdName' },
  } as const;
  const cfg = pick ? pickCfg[pick] : null;
  const val = (code: any, list: any[], ck: string, nk: string) => (code ? nameOf(list, ck, nk, code) : '');

  return (
    <ViewShell
      title="New Weft Issue Return"
      subtitle={`${ctx.prpcode} · Year ${ctx.yearno}`}
      onBack={() => onBack(!!saved)}
      maxWidth={960}
      footer={
        <View style={s.footer}>
          <View style={[s.footerInner, wide && { maxWidth: 960 }]}>
            {saved ? (
              <>
                <Btn title="Back to List" variant="secondary" icon="list" onPress={() => onBack(true)} style={{ flex: 1 }} />
                {status === 'Close' && <Btn title="Print Sticker" icon="print" variant="accent" onPress={() => setPrintOpen(true)} style={{ flex: 1 }} />}
              </>
            ) : (
              <>
                <Btn title="Cancel" variant="secondary" onPress={() => onBack(false)} style={{ flex: 1 }} />
                <Btn title="Save Entry" icon="save" variant="accent" onPress={save} loading={saving} style={{ flex: 2 }} />
              </>
            )}
          </View>
        </View>
      }
    >
      {!!error && <Banner tone="danger" icon="error-outline" text={error} />}
      {saved && <Banner tone="success" icon="check-circle" title="Saved" text={status === 'Close' ? 'Carton closed — you can print the sticker now.' : 'Weft issue return saved.'} />}

      <Card title="Beam" right={!locked ? <Btn small title={beam ? 'Change Beam' : 'Link Beam'} icon="link" onPress={() => setLinkOpen(true)} /> : null}>
        {beam ? (
          <View style={s.beamBox}>
            <View style={{ flex: 1 }}>
              <Text style={s.beamNo}>Beam {str(beam.BeamNo)}</Text>
              <Text style={s.beamSub}>{str(beam.ItmName)} · {str(beam.MerName)} · {str(beam.ShdName)} · {str(beam.GrdName)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.qtyLbl}>ISSUED</Text>
              <Text style={s.beamQty}>{str(form.IssQty)} kg · {str(form.IssChees)} pcs</Text>
            </View>
          </View>
        ) : (
          <Text style={s.muted}>No beam selected — tap Link Beam</Text>
        )}
      </Card>

      <Card title="Carton">
        <Text style={s.label}>Carton Type</Text>
        <View style={s.segRow}>
          <Seg label="Single" on={cartonType === 'Single'} onPress={() => !locked && setCartonType('Single')} />
          <Seg label="Mix" on={cartonType === 'Mix'} onPress={() => !locked && setCartonType('Mix')} />
        </View>
        <Field label="Carton No" required value={String(form.CartNo)} onChangeText={(t) => set({ CartNo: t })} placeholder="Enter Carton No" editable={!locked} />
        <View style={s.row2}>
          <View style={s.col}>
            <SelectBox label="Item" required value={val(form.ItmCode, masters.items, 'ItmCode', 'ItmName')} sub={denier ? `Denier: ${denier}` : null} placeholder="Choose item..." onPress={() => setPick('item')} disabled={itemLocked} icon="expand-more" />
          </View>
          <View style={s.col}>
            <SelectBox label="Merge" required value={val(form.MerCode, masters.merges, 'MerCode', 'MerName')} placeholder="Choose merge..." onPress={() => setPick('merge')} disabled={itemLocked} icon="expand-more" />
          </View>
        </View>
        <View style={s.row2}>
          <View style={s.col}>
            <SelectBox label="Grade" required value={val(form.GrdCode, masters.grades, 'GrdCode', 'GrdName')} placeholder="Choose grade..." onPress={() => setPick('grade')} disabled={locked} icon="expand-more" />
          </View>
          <View style={s.col}>
            <SelectBox label="Shade" required value={val(form.ShdCode, masters.shades, 'ShdCode', 'ShdName')} placeholder="Choose shade..." onPress={() => setPick('shade')} disabled={locked} icon="expand-more" />
          </View>
        </View>
        <View style={s.row2}>
          <Field label={`Cheese${form.IssChees ? ` (max ${form.IssChees})` : ''}`} required value={String(form.TotPcs)} onChangeText={(t) => set({ TotPcs: t })} keyboardType="numeric" placeholder="Enter Cheese" style={s.col} editable={!locked} big />
          <Field label={`Weight${form.IssQty ? ` (max ${form.IssQty})` : ''}`} required value={String(form.TotQty)} onChangeText={(t) => set({ TotQty: t })} keyboardType="decimal-pad" placeholder="Enter Weight" style={s.col} editable={!locked} big />
        </View>
        <Text style={s.label}>Status</Text>
        <View style={s.segRow}>
          <Seg label="Open" on={status === 'Open'} onPress={() => !locked && setStatus('Open')} />
          <Seg label="Close" on={status === 'Close'} onPress={() => !locked && setStatus('Close')} danger />
        </View>
      </Card>

      <LinkBeamSheet api={api} ctx={ctx} visible={linkOpen} selected={beam} onClose={() => setLinkOpen(false)} onPick={onLink} />
      {cfg && (
        <PickerSheet<any>
          visible
          title={cfg.title}
          placeholder="Search…"
          remote={false}
          onClose={() => setPick(null)}
          load={async () => cfg.list}
          keyOf={(x, i) => `${x[cfg.code]}-${i}`}
          render={(x) => ({ title: str(x[cfg.name]), sub: `Code ${str(x[cfg.code])}${pick === 'item' && x.Denier ? ` · Denier ${x.Denier}` : ''}` })}
          onPick={(x) => {
            const code = String(x[cfg.code] ?? '');
            if (pick === 'item') set({ ItmCode: code });
            if (pick === 'merge') set({ MerCode: code });
            if (pick === 'grade') set({ GrdCode: code });
            if (pick === 'shade') set({ ShdCode: code });
            setPick(null);
          }}
        />
      )}
      <PrinterSheet visible={printOpen} subtitle={`Carton ${str(form.CartNo)}`} state={printers} printing={printing} onClose={() => setPrintOpen(false)} onPrint={(pr) => print(pr.Name)} />
    </ViewShell>
  );
}

function LinkBeamSheet({ api, ctx, visible, selected, onClose, onPick }: {
  api: WeftReturnApi; ctx: Ctx; visible: boolean; selected: any; onClose: () => void; onPick: (x: any) => void;
}) {
  return (
    <PickerSheet<any>
      visible={visible}
      title="Select Beam"
      subtitle="Issued beams available for return"
      placeholder="Search beam, item, merge, shade, grade…"
      remote={false}
      onClose={onClose}
      load={() => api.linkable(ctx)}
      keyOf={(x, i) => `${x.UId}-${x.SrNo}-${x.SubSr ?? x.IssSubSr}-${i}`}
      render={(x) => ({
        title: `Beam ${str(x.BeamNo)} · ${str(x.ItmName)}${selected && selected.UId === x.UId && selected.SrNo === x.SrNo ? '  ✓' : ''}`,
        sub: `${str(x.MerName)} · ${str(x.ShdName)} · ${str(x.GrdName)} · Sub ${str(x.SubSr || x.IssSubSr || 1)} · Bal ${str(x.BalQty)}`,
      })}
      onPick={onPick}
      emptyText="No beam available"
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Modify                                                                      */
/* -------------------------------------------------------------------------- */

const mainOf = (m: any) => (Array.isArray(m?.[0]) ? m[0][0] : m?.[0]) || null;

function ModifyView({ api, ctx, row, onBack }: { api: WeftReturnApi; ctx: Ctx; row: any; onBack: (changed?: boolean) => void }) {
  const { wide } = useWide();
  const masters = useMasters(api, ctx);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [main, setMain] = useState<any>(null);
  const [d1, setD1] = useState<any[]>([]);
  const [d2, setD2] = useState<any[]>([]);
  const [d3, setD3] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changed, setChanged] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printers = usePrinters(api);

  const apply = (resp: any) => {
    const m = mainOf(resp?.main);
    if (m) setMain(m);
    setD1(Array.isArray(resp?.d1) ? resp.d1 : []);
    setD2(Array.isArray(resp?.d2) ? resp.d2 : []);
    if (Array.isArray(resp?.d3)) setD3(resp.d3);
  };

  useEffect(() => {
    let alive = true;
    api.show(ctx, row?.UId)
      .then((res) => { if (alive) apply(res?.response || {}); })
      .catch((e) => { if (alive) setError(errOf(e, 'Unable to load entry')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [api, ctx.prpcode, ctx.yearno, row?.UId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMix = main ? str(main.IsCartonType) !== '0' : num(row?.IsCartonType) === 1;
  const closed = main ? str(main.IsCartonStatus) !== '0' : num(row?.IsCartonStatus) === 1;

  const upd = (i: number, k: 'IssRQty' | 'IssRChees', v: string) => setD3((cur) => cur.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const save = async () => {
    if (!d3.length) { AppAlert.alert('Warning', 'Please add at least one creel return detail.'); return; }
    const bad = d3.findIndex((r) => r.IssRQty === '' || r.IssRChees === '' || Number.isNaN(Number(r.IssRQty)) || Number.isNaN(Number(r.IssRChees)) || Number(r.IssRQty) < 0 || Number(r.IssRChees) < 0);
    if (bad >= 0) { AppAlert.alert('Warning', `Enter valid return qty and cheese for row #${bad + 1}.`); return; }
    setSaving(true);
    try {
      const res = await api.modify({
        prpcode: ctx.prpcode, yearno: ctx.yearno, strcode: STRCODE, txntype: TXN, uid: row?.UId,
        d1, d2,
        d3: d3.map((r) => ({
          UId: r.UId, SrNo: r.SrNo, IssUId: r.IssUId, IssSrNo: r.IssSrNo, IssSubSr: r.IssSubSr || 1,
          IssQty: r.IssQty, IssChees: r.IssChees, IssRQty: r.IssRQty, IssRChees: r.IssRChees, IsCartonStatus: r.IsCartonStatus,
        })),
      });
      const resp = res?.response || {};
      if (res?.success === true) {
        apply(resp);
        setChanged(true);
        AppAlert.alert('Success', typeof res?.message === 'string' ? res.message : typeof resp?.message === 'string' ? resp.message : 'Weft issue return updated successfully.');
      } else if (res?.message === false) {
        AppAlert.alert('Warning', typeof resp?.message === 'string' ? resp.message : 'Unable to update Weft issue return.');
      } else if (resp?.error === true) {
        AppAlert.alert('Error', resp?.message || 'Unable to update Weft issue return.');
      } else {
        AppAlert.alert('Error', typeof res?.message === 'string' ? res.message : 'Something went wrong while updating.');
      }
    } catch (e) {
      AppAlert.alert('Error', errOf(e, 'Update failed.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    AppAlert.alert('Delete Entry', `Are you sure you want to delete this entry?\n${str(row?.IssRNo)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            const res = await api.remove(ctx, row?.UId);
            if (res?.success === true) {
              AppAlert.alert('Success', res?.response?.message || res?.message || 'Delete Successfully.', [{ text: 'OK', onPress: () => onBack(true) }]);
            } else AppAlert.alert(res?.success === false ? 'Warning' : 'Error', res?.message || 'Delete failed');
          } catch (e) {
            AppAlert.alert('Error', errOf(e, 'Delete failed.'));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const print = async (printerName: string) => {
    const a = d1[0] || {}; const b = d2[0] || {}; const c = d3[0] || {}; const m = main || {};
    if (!Object.keys(a).length) { AppAlert.alert('printing sticker data is empty'); return; }
    setPrinting(true);
    try {
      const res = await api.print({
        UId: m.UId ?? '0', TranDate: '0', PrpCode: m.PrpCode ?? ctx.prpcode, StrCode: a.StrCode ?? '0',
        ItmCode: a.ItmCode ?? '0', MerCode: a.MerCode ?? '0', ShdCode: a.ShdCode ?? '0', GrdCode: a.GrdCode ?? '0',
        Denier: a.Denier ?? '0', DsnCode: '0', CartNo: b.CartNo ?? '', Wt: a.TotQty ?? '0', Chees: b.Chees ?? '0',
        IsAuto: '0', GrossWt: '0', PUId: a.IssUId ?? '0', PSrNo: a.IssSrNo ?? '0', PSubSr: c.IssSubSr ?? '0',
        TranType: '0', TranName: '', StkType: m.StkType ?? '', StkDate: '', SrNo: a.IssSrNo ?? '0', UsrCode: '0',
        StrName: '', ItmName: a.ItmName ?? '', MerName: a.MerName ?? '', ShdName: a.ShdName ?? '', GrdName: a.GrdName ?? '',
        DnsName: '', Stktype: m.StkType ?? '', nStkDate: '0', yearno: ctx.yearno, IskgQty: '0', Rate: '0', MItmCode: '', MItmName: '',
      }, printerName);
      if (res?.success) { AppAlert.alert('Print Successful', `✅ ${res.printed ?? 1} label(s) sent to printer.`); setPrintOpen(false); }
      else AppAlert.alert('Print failed', res?.message || 'Operation failed');
    } catch (e: any) {
      AppAlert.alert('Print failed', e?.response?.data?.error || errOf(e, 'Print failed'));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <ViewShell
      title={`Modify ${str(row?.IssRNo)}`}
      subtitle={`${str(row?.IssRDate)} · ${ctx.prpcode} · Year ${ctx.yearno}`}
      onBack={() => onBack(changed)}
      maxWidth={1000}
      footer={!loading && !error ? (
        <View style={s.footer}>
          <View style={[s.footerInner, wide && { maxWidth: 1000 }]}>
            <Btn title="Delete" icon="delete-outline" variant="danger" onPress={remove} loading={deleting} disabled={saving} />
            {closed && <Btn title="Print" icon="print" variant="secondary" onPress={() => setPrintOpen(true)} />}
            <Btn title="Save Entry" icon="save" variant="accent" onPress={save} loading={saving} disabled={deleting} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    >
      {loading ? <Loader label="Loading entry…" /> : error ? <ErrorBox text={error} /> : (
        <>
          <View style={s.hero}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroEyebrow}>BEAM</Text>
              <Text style={s.heroTitle}>{str(main?.beamno ?? main?.BeamNo) || '—'}</Text>
              <Text style={s.heroSub}>Carton {str(d2[0]?.CartNo || row?.CartNo) || '-'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 5 }}>
              <Pill label={isMix ? 'Mix' : 'Single'} fg="#fff" bg="rgba(255,255,255,0.18)" />
              <Pill label={closed ? 'Close' : 'Open'} fg="#fff" bg={closed ? T.red : T.green} />
            </View>
          </View>

          <View style={[wide && s.wideRow2]}>
            <View style={[wide && { flex: 1 }]}>
              <Card title="Saved item detail">
                {d1.length === 0 ? <Text style={s.muted}>No item rows</Text> : d1.map((r, i) => (
                  <View key={i} style={i > 0 ? { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: T.hair } : undefined}>
                    <KV k="Item" v={nameOf(masters.items, 'ItmCode', 'ItmName', r.ItmCode)} />
                    <KV k="Merge" v={nameOf(masters.merges, 'MerCode', 'MerName', r.MerCode)} />
                    <KV k="Grade" v={nameOf(masters.grades, 'GrdCode', 'GrdName', r.GrdCode)} />
                    <KV k="Shade" v={nameOf(masters.shades, 'ShdCode', 'ShdName', r.ShdCode)} last />
                  </View>
                ))}
              </Card>
            </View>
            <View style={[wide && { flex: 1.3 }]}>
              <Card title={`Creel return detail (${d3.length})`}>
                {d3.length === 0 ? <Text style={s.muted}>No return rows</Text> : d3.map((r, i) => (
                  <View key={`${r.UId}-${r.SrNo}-${i}`} style={s.d3Row}>
                    <View style={s.d3Head}>
                      <Text style={s.d3No}>#{i + 1}</Text>
                      <Text style={s.d3Meta}>UId {str(r.IssUId)} · Sr {str(r.IssSrNo)}</Text>
                    </View>
                    <View style={s.d3Issued}>
                      <Text style={s.d3Iss}>Issued qty <Text style={s.mono}>{str(r.IssQty)}</Text></Text>
                      <Text style={s.d3Iss}>Issued cheese <Text style={s.mono}>{str(r.IssChees)}</Text></Text>
                    </View>
                    <View style={s.row2}>
                      <Field label="Return Qty" value={str(r.IssRQty)} onChangeText={(v) => upd(i, 'IssRQty', v)} keyboardType="decimal-pad" style={s.col} />
                      <Field label="Return Cheese" value={str(r.IssRChees)} onChangeText={(v) => upd(i, 'IssRChees', v)} keyboardType="numeric" style={s.col} />
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          </View>
        </>
      )}
      <PrinterSheet visible={printOpen} subtitle={`${str(row?.IssRNo)} · ${str(d2[0]?.CartNo)}`} state={printers} printing={printing} onClose={() => setPrintOpen(false)} onPrint={(pr) => print(pr.Name)} />
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */

function Seg({ label, on, onPress, mono, danger }: { label: string; on: boolean; onPress: () => void; mono?: boolean; danger?: boolean }) {
  const c = danger ? T.red : T.nav;
  return (
    <TouchableOpacity onPress={onPress} style={[s.seg, on && { backgroundColor: c, borderColor: c }]} activeOpacity={0.75}>
      <Text style={[s.segText, mono && { fontFamily: MONO }, on && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}
function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.kpi, { borderTopColor: color }]}>
      <Text style={s.kpiLbl}>{label}</Text>
      <Text style={[s.kpiVal, { color }]}>{value}</Text>
    </View>
  );
}
function Meta({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.metaItem}>
      <Text style={s.metaK}>{k}</Text>
      <Text style={s.metaV} numberOfLines={1}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { padding: 12 },
  wideRow: { flexDirection: 'row' },
  wideRow2: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  side: { width: 330, flexGrow: 0 },
  label: { fontSize: 11, fontWeight: '800', color: T.ink, marginBottom: 5 },
  row2: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  col: { flex: 1, minWidth: 140 },
  segRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  seg: { minWidth: 70, height: 34, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 12, fontWeight: '800', color: T.ink },
  tune: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 44, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 11 },
  searchInput: { flex: 1, fontSize: 13.5, color: T.ink, paddingVertical: 0 },
  chipLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, borderTopWidth: 3, padding: 9 },
  kpiLbl: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.4 },
  kpiVal: { fontSize: 16, fontWeight: '900', fontFamily: MONO, marginTop: 2 },
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, borderLeftColor: T.yd, padding: 12, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  no: { fontSize: 15, fontWeight: '900', color: T.ink, fontFamily: MONO },
  date: { fontSize: 11.5, fontWeight: '700', color: T.muted, marginTop: 2 },
  meta: { flexDirection: 'row', gap: 8, marginTop: 9 },
  metaItem: { flex: 1, minWidth: 0 },
  metaK: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.3 },
  metaV: { fontSize: 13, fontWeight: '800', color: T.ink, marginTop: 1 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  qtyBox: { backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  qtyLbl: { fontSize: 9, fontWeight: '900', color: T.muted },
  qtyVal: { fontSize: 14, fontWeight: '900', color: T.ink, fontFamily: MONO },
  act: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.blue}10` },
  fab: {
    position: 'absolute', right: 18, bottom: 22, minWidth: 54, height: 54, borderRadius: 27, paddingHorizontal: 16,
    backgroundColor: T.copper, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 13.5, fontWeight: '900' },
  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, width: '100%', alignSelf: 'center' },
  beamBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: `${T.copper}0D`, borderRadius: 10, padding: 10 },
  beamNo: { fontSize: 15, fontWeight: '900', color: T.ink, fontFamily: MONO },
  beamSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },
  beamQty: { fontSize: 12.5, fontWeight: '900', color: T.copper, fontFamily: MONO },
  muted: { fontSize: 12.5, fontWeight: '600', color: T.muted },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.nav, borderRadius: 14, padding: 14, marginBottom: 10 },
  heroEyebrow: { fontSize: 10, fontWeight: '900', color: T.copper, letterSpacing: 0.8 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#fff', fontFamily: MONO },
  heroSub: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  d3Row: { borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: T.sub },
  d3Head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  d3No: { fontSize: 12, fontWeight: '900', color: T.copper },
  d3Meta: { fontSize: 11.5, fontWeight: '700', color: T.muted, fontFamily: MONO },
  d3Issued: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  d3Iss: { fontSize: 11.5, fontWeight: '600', color: T.muted },
  mono: { fontFamily: MONO, color: T.ink, fontWeight: '900' },
});
