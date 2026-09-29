// FILE: src/screens/creelIssueReturn/CreelIssueReturnModule.tsx
// NEW ERP — Creel Issue Return in ONE screen (list → new entry / modify views).
//
// Legacy source (still routed, untouched):
//   app/(tabs)/creel-issue-return.tsx            → components/CreelIssueReturn/index.tsx (browse)
//   app/(tabs)/CreelIssueReturnEntry.tsx         → components/CreelIssueReturn/CreelIssueReturnEntry.tsx
//   app/(tabs)/CreelIssueReturnModifyEntry.tsx   → components/CreelIssueReturn/CreelIssueReturnModifyEntry.tsx
//   components/CreelIssueReturn/FilterForm.tsx   (placeholder, not used by the list)
//   Legacy list pushed '/CreelIssueReturnEntry' { selectedProperty, selectedYear } and
//   '/CreelIssueReturnModifyEntry' { creelData: row, selectedProperty, selectedYear } —
//   here those are the 'entry' / 'modify' views sharing the list's property + year.
//
// Flow (same rules as legacy):
//   List    : property (GET /api/getproperty, default first), financial year (yearno = last 2
//             digits), issue date range (FY start → today / FY end, DD-MM-YYYY). Search IssRNo,
//             carton type (All/Single/Mix) + status (All/Open/Closed) filters. Card → Modify.
//             Print only when IsCartonStatus = 1 (sticker from the browse row, yearno = FY of
//             IssRDate). Delete with confirmation.
//   Entry   : Link Creel (get_creel_issue_detail) auto-fills item / merge / grade / shade /
//             IssUId / IssSrNo / IssSubSr / IssQty(=Qty) / IssChees(=Pcs) / StkType / Denier.
//             Carton type Single locks item, merge, grade and shade; Mix unlocks them.
//             Validations (order + text as legacy): creel, carton no, item, merge, grade, shade,
//             cheese, weight, cheese ≤ IssChees, weight ≤ IssQty. POST add_creel_issue_return.
//             Saved + status Close → Sticker printing.
//   Modify  : POST get_creel_issue_return_show → main / d1 / d2 / d3. Carton type + carton no
//             read-only, saved item detail (d1). Link Creel + Cheese / Weight + Status →
//             "Add Creel Return Detail" appends a d3 row (duplicate check). d3 rows: editable
//             return qty / cheese, remove row (confirm). POST modify_creel_issue_return
//             { prpcode, yearno, strcode, txntype, uid, d1, d2, d3 }. Status Close → print.
//
// Endpoints (see creelIssueReturnApi.ts): GET /api/getproperty, POST get_creel_issue_return_browse,
//   POST delete_creel_issue_return, POST get_creel_issue_detail, GET itemdrop / mergedrop /
//   gradedrop / shadedrop, POST add_creel_issue_return, POST get_creel_issue_return_show,
//   POST modify_creel_issue_return, GET {API}/api/printers, POST PRINTSTICKER.
//   txntype 'creel_issue_return', strcode '002' everywhere.
//
// Differences vs legacy:
//   1. List loads automatically on open / property / year change and after returning from a
//      saved entry (legacy loaded only on "Apply Filters").
//   2. Carton type / status filters compare IsCartonType / IsCartonStatus as 0/1 (legacy compared
//      the numbers to the strings "Single"/"Mix"/"Open"/"Closed", so a filter never matched).
//   3. Financial-year options are real FYs (April start); legacy built them from the calendar year,
//      which pointed to a future FY in Jan–Mar. The filter sheet "Reset" button is not ported.
//   4. Printing: printer is chosen and printed from one sheet (last printer remembered as before).
//      Entry sticker sends data: [saved add payload] exactly like legacy (legacy built a sticker
//      object but never used it). Legacy's extra header-less duplicate PRINTSTICKER POST is dropped.
//   5. Entry form is locked after a successful save (legacy allowed saving the same form again).
//      Legacy's catch called an undefined showAlert (crash) — the error is now shown.
//   6. Modify: the returned main row is read as main[0][0] or main[0] (legacy re-read it as
//      main[0] after save, which flipped type/status to Mix/Close); d1/d2/d3 are only replaced
//      when the response carries them (legacy cleared d3 on a failed save). Because of that same
//      re-read, a legacy print done after saving sent UId '0' / StkType ''; here the main row's
//      UId / StkType are sent (identical to legacy's print before a save).
//   7. Master dropdown failures leave an empty list (legacy stored undefined → later crash).
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  Banner, Btn, Card, DateField, EmptyState, ErrorBox, Field, HIT, Loader, MONO, PickerSheet, Pill, SelectBox, useWide, ViewShell,
} from '../inquiry/ui';
import { PrinterSheet, usePrinters } from './PrinterSheet';
import {
  CreelIssueReturnApi, createCreelIssueReturnApi, Ctx, currentFY, errOf, fyOfDate, fyOptions, fyRange, Property, str, STRCODE, TXN,
} from './creelIssueReturnApi';

type Props = { token: string; API: string; username?: string };
type View_ = { name: 'list' } | { name: 'entry' } | { name: 'modify'; row: any };

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function CreelIssueReturnModule({ token, API }: Props) {
  const api = useMemo(() => createCreelIssueReturnApi(API, token), [API, token]);
  const [view, setView] = useState<View_>({ name: 'list' });
  const [dirty, setDirty] = useState(0);

  // shared filter state (legacy passed selectedProperty / selectedYear through router params)
  const [properties, setProperties] = useState<Property[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [fy, setFy] = useState(currentFY());
  const [from, setFrom] = useState(fyRange(currentFY()).from);
  const [to, setTo] = useState(fyRange(currentFY()).to);

  const ctx: Ctx | null = property ? { prpcode: property.PrpCode, prptype: property.PrpOf, yearno: fy.slice(-2) } : null;

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
/*  List (legacy index.tsx)                                                     */
/* -------------------------------------------------------------------------- */

function ListView(p: {
  api: CreelIssueReturnApi; ctx: Ctx | null;
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

  const ctxKey = ctx ? `${ctx.prpcode}|${ctx.yearno}` : '';
  useEffect(() => { if (ctxKey) void load(); }, [ctxKey, p.dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  // legacy filteredCreelData: search on IssRNo only
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!t || str(r.IssRNo).toLowerCase().includes(t))
      && (type === 'all' || String(num(r.IsCartonType)) === type)
      && (status === 'all' || String(num(r.IsCartonStatus)) === status));
  }, [rows, q, type, status]);

  const totals = useMemo(() => ({
    qty: list.reduce((s, r) => s + num(r.TotQty), 0),
    pcs: list.reduce((s, r) => s + num(r.TotPcs), 0),
  }), [list]);

  const remove = (row: any) => {
    AppAlert.alert('Delete Confirmation', `Are you sure you want to delete ${str(row.IssRNo)} ?`, [
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
              AppAlert.alert('Success', res?.message || `${str(row.IssRNo)} deleted successfully`);
            } else if (res?.success === false) {
              AppAlert.alert('Warning', res?.message || 'Delete failed');
            } else {
              AppAlert.alert('Error', res?.message || 'Something went wrong');
            }
          } catch (e) {
            AppAlert.alert('Error', errOf(e, 'Delete failed.'));
          }
        },
      },
    ]);
  };

  // legacy printBrowseSticker — sticker built from the selected browse card
  const print = async (printerName: string) => {
    const item = printRow;
    if (!item || !Object.keys(item).length) { AppAlert.alert('printing sticker data is empty'); return; }
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
    <Card title="Filter Records">
      <SelectBox label="Property" value={p.property?.LngName} placeholder="Select property" onPress={() => setPropSheet(true)} icon="expand-more" />
      <Text style={s.label}>Year</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
        {fyOptions().map((y) => <Seg key={y} label={y} on={p.fy === y} onPress={() => p.setFy(y)} mono />)}
      </ScrollView>
      <Text style={s.label}>Issue Date Range</Text>
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
        <Seg label="Closed" on={status === '1'} onPress={() => setStatus('1')} />
      </View>
      <Btn title="Apply Filters" icon="refresh" variant="accent" onPress={() => { setFiltersOpen(false); void load(); }} loading={loading} style={{ marginTop: 6 }} />
    </Card>
  );

  const header = (
    <View style={{ gap: 8, marginBottom: 8 }}>
      {!wide && filtersOpen && filterCard}
      <View style={s.searchBox}>
        <Icon name="search" size={17} color={T.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search return no" placeholderTextColor={T.muted} style={s.searchInput} autoCorrect={false} />
        {!!q && <TouchableOpacity onPress={() => setQ('')} hitSlop={HIT}><Icon name="close" size={16} color={T.muted} /></TouchableOpacity>}
      </View>
      <View style={s.chipLine}>
        <Pill label={p.property?.LngName || 'Select Property'} fg={T.nav} bg={T.alt} icon="business" />
        <Pill label={p.fy} fg={T.nav} bg={T.alt} icon="event" />
        <Pill label={`${p.from} – ${p.to}`} fg={T.nav} bg={T.alt} icon="date-range" />
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
      title="Creel Issue Return"
      subtitle={p.property ? `${p.property.LngName} · ${p.fy}` : 'Return yarn cartons from creels'}
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
                      <Pill label={closed ? 'Closed' : 'Open'} fg={closed ? T.red : T.green} bg={closed ? `${T.red}14` : `${T.green}14`} />
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
                        <TouchableOpacity onPress={(e: any) => { e?.stopPropagation?.(); setPrintRow(item); }} disabled={printing} style={s.act} hitSlop={HIT}>
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
        placeholder="Search property..."
        remote={false}
        onClose={() => setPropSheet(false)}
        load={async () => p.properties}
        keyOf={(x, i) => `${x.PrpCode}-${i}`}
        render={(x) => ({ title: x.LngName, sub: `${x.PrpCode}${x.PrpOf ? ` · ${x.PrpOf}` : ''}` })}
        onPick={(x) => { p.setProperty(x); setPropSheet(false); }}
      />
      <PrinterSheet
        visible={!!printRow}
        subtitle={printRow ? `${str(printRow.IssRNo)} • ${str(printRow.CartNo)}` : ''}
        state={printers}
        printing={printing}
        onClose={() => setPrintRow(null)}
        onPrint={(pr) => print(pr.Name)}
      />
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Master dropdowns (item / merge / grade / shade) + Link Creel sheet          */
/* -------------------------------------------------------------------------- */

function useMasters(api: CreelIssueReturnApi, ctx: Ctx) {
  const [m, setM] = useState<{ items: any[]; merges: any[]; grades: any[]; shades: any[] }>({ items: [], merges: [], grades: [], shades: [] });
  useEffect(() => {
    let alive = true;
    const safe = (f: Promise<any>) => f.then((d) => (Array.isArray(d) ? d : [])).catch(() => []);
    // legacy loaded them one after another: items, merges, grades, shades
    (async () => {
      const items = await safe(api.items(ctx));
      const merges = await safe(api.merges(ctx));
      const grades = await safe(api.grades(ctx));
      const shades = await safe(api.shades(ctx));
      if (alive) setM({ items, merges, grades, shades });
    })();
    return () => { alive = false; };
  }, [api, ctx.prpcode, ctx.yearno]); // eslint-disable-line react-hooks/exhaustive-deps
  return m;
}

/** legacy getName: name from master, else the code, else '-' */
const nameOf = (list: any[], codeKey: string, nameKey: string, code: any) =>
  list.find((x) => String(x[codeKey]) === String(code))?.[nameKey] || code || '-';

const subSrOf = (x: any) => x?.SubSr || x?.IssSubSr || 1;

/** Legacy "Select Creel" modal — refetched every time it opens (mounted only while open). */
function LinkCreelSheet({ api, ctx, selected, onClose, onPick }: {
  api: CreelIssueReturnApi; ctx: Ctx; selected: any; onClose: () => void; onPick: (x: any) => void;
}) {
  return (
    <PickerSheet<any>
      visible
      title="Select Creel"
      subtitle="Issued creels available for return"
      placeholder="Search item, creel no, grade, shade, merge…"
      remote={false}
      onClose={onClose}
      load={() => api.linkable(ctx)}
      keyOf={(x, i) => `${x.UId}-${x.SrNo}-${subSrOf(x)}-${i}`}
      render={(x) => {
        const on = selected && selected.UId === x.UId && selected.SrNo === x.SrNo && String(selected.SubSr) === String(subSrOf(x));
        return {
          title: `${str(x.ItmName)} · Creel No : ${str(x.BatchNo)}${on ? '  ✓' : ''}`,
          sub: `Grade ${str(x.GrdName)} · Shade ${str(x.ShdName)} · Merge ${str(x.MerName)} · SubSr ${str(subSrOf(x))} · Bal Qty ${str(x.BalQty)}`,
        };
      }}
      onPick={onPick}
      emptyText="No creel available"
    />
  );
}

/** Link-creel auto fill shared by Entry and Modify (legacy onPress of a creel card). */
const linkPatch = (item: any, items: any[]) => {
  const it = items.find((x) => String(x.ItmCode) === String(item.ItmCode));
  return {
    denier: it?.Denier || '',
    patch: {
      ItmCode: String(item.ItmCode), Denier: it?.Denier || '',
      MerCode: String(item.MerCode), GrdCode: String(item.GrdCode), ShdCode: String(item.ShdCode),
      IssUId: item.UId, IssSrNo: item.SrNo, IssSubSr: subSrOf(item),
      IssChees: item.Pcs, IssQty: item.Qty, StkType: item.StkType,
    },
  };
};

/* -------------------------------------------------------------------------- */
/*  New entry (legacy CreelIssueReturnEntry.tsx)                                */
/* -------------------------------------------------------------------------- */

const emptyForm = (ctx: Ctx) => ({
  CartNo: '', ItmCode: null as any, MerCode: null as any, GrdCode: null as any, ShdCode: null as any,
  TotPcs: '', TotQty: '', IssUId: null as any, IssSrNo: null as any,
  IssQty: 0 as any, IssChees: 0 as any, StkType: null as any,
  PrpCode: ctx.prpcode, StrCode: STRCODE, YearNo: ctx.yearno,
  IsCartonType: 0, IsCartonStatus: 0, Denier: '',
} as Record<string, any>);

function EntryView({ api, ctx, onBack }: { api: CreelIssueReturnApi; ctx: Ctx; onBack: (changed?: boolean) => void }) {
  const { wide } = useWide();
  const masters = useMasters(api, ctx);
  const [form, setForm] = useState(() => emptyForm(ctx));
  const [cartonType, setCartonType] = useState<'Single' | 'Mix'>('Single');
  const [status, setStatus] = useState<'Open' | 'Close'>('Open');
  const [selectedCreel, setSelectedCreel] = useState<any>(null);
  const [batchNo, setBatchNo] = useState('');
  const [denier, setDenier] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [pick, setPick] = useState<null | 'item' | 'merge' | 'grade' | 'shade'>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printers = usePrinters(api);

  const set = (patch: Record<string, any>) => setForm((f) => ({ ...f, ...patch }));
  const locked = !!saved;
  const isDisabled = cartonType === 'Single' || locked; // legacy: Single disables item, merge, grade, shade

  const onLink = (item: any) => {
    const { denier: d, patch } = linkPatch(item, masters.items);
    setDenier(d);
    setSelectedCreel({ UId: item.UId, SrNo: item.SrNo, SubSr: subSrOf(item) });
    setBatchNo(str(item.BatchNo));
    set(patch);
    setLinkOpen(false);
    setError(null);
  };

  const validate = () => {
    if (!batchNo) return 'Please select Creel first.';
    if (!form.CartNo) return 'Please enter Carton No.';
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
      if (res?.success === true) {
        setSaved(payload);
        AppAlert.alert('Success', res?.response?.message || '');
        void printers.load(); // legacy getAllPrinters() after every successful save
      } else {
        AppAlert.alert('Warning', res?.response?.message || res?.message || 'Data save failed.');
      }
    } catch (e: any) {
      const st = e?.response?.status;
      let msg = 'An unexpected error occurred while saving.';
      if (e?.response) {
        if (st === 500) msg = 'Server error (500). Please try again later or contact support.';
        else if (st === 400) msg = e.response.data?.message || 'Bad request.';
        else if (st === 404) msg = 'API not found (404).';
        else msg = e.response.data?.message || msg;
      } else if (e?.message) msg = e.message;
      setError(msg);
      AppAlert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const print = async (printerName: string) => {
    const d = saved;
    if (!d || !Object.keys(d).length) { AppAlert.alert('printing sticker data is empty'); return; }
    setPrinting(true);
    try {
      // legacy printSticker built a sticker object but POSTed data: [getSavedData] (the raw
      // add_creel_issue_return payload) — kept identical.
      const res = await api.print(d, printerName);
      if (res?.success) { AppAlert.alert('Print Successful', `✅ ${res.printed ?? 1} label(s) sent to printer.`); setPrintOpen(false); }
      else AppAlert.alert('Print failed', res?.message || 'Operation failed');
    } catch (e: any) {
      AppAlert.alert('Print failed', e?.response?.data?.error || e?.message || 'Print failed');
    } finally {
      setPrinting(false);
    }
  };

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
      title="New Creel Issue Return"
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
      {saved && <Banner tone="success" icon="check-circle" title="Saved" text={status === 'Close' ? 'Carton closed — select printer and print the saved sticker.' : 'Creel issue return saved.'} />}

      <Card title="Selected Creel" right={!locked ? <Btn small title="Link Creel" icon="link" onPress={() => setLinkOpen(true)} /> : null}>
        {batchNo ? (
          <View style={s.beamBox}>
            <View style={{ flex: 1 }}>
              <Text style={s.beamNo}>Creel {batchNo}</Text>
              <Text style={s.beamSub}>
                {val(form.ItmCode, masters.items, 'ItmCode', 'ItmName')} · Sub {str(form.IssSubSr)} · {str(form.StkType)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.qtyLbl}>ISSUED</Text>
              <Text style={s.beamQty}>{str(form.IssQty)} kg · {str(form.IssChees)} pcs</Text>
            </View>
          </View>
        ) : (
          <Text style={s.muted}>No Creel Selected</Text>
        )}
      </Card>

      <Card title="Carton">
        <Text style={s.label}>Carton Type</Text>
        <View style={s.segRow}>
          <Seg label="Single" on={cartonType === 'Single'} onPress={() => !locked && setCartonType('Single')} />
          <Seg label="Mix" on={cartonType === 'Mix'} onPress={() => !locked && setCartonType('Mix')} />
        </View>
        <Field label="Carton No" value={str(form.CartNo)} onChangeText={(t) => set({ CartNo: t || '' })} placeholder="Enter Carton No" editable={!locked} />
        <View style={s.row2}>
          <View style={s.col}>
            <SelectBox label="Select Item" required value={val(form.ItmCode, masters.items, 'ItmCode', 'ItmName')} sub={denier ? `Denier: ${denier}` : null} placeholder="Choose item..." onPress={() => setPick('item')} disabled={isDisabled} icon="expand-more" />
          </View>
          <View style={s.col}>
            <SelectBox label="Select Merge" required value={val(form.MerCode, masters.merges, 'MerCode', 'MerName')} placeholder="Choose merge..." onPress={() => setPick('merge')} disabled={isDisabled} icon="expand-more" />
          </View>
        </View>
        <View style={s.row2}>
          <View style={s.col}>
            <SelectBox label="Select Grade" required value={val(form.GrdCode, masters.grades, 'GrdCode', 'GrdName')} placeholder="Choose grade..." onPress={() => setPick('grade')} disabled={isDisabled} icon="expand-more" />
          </View>
          <View style={s.col}>
            <SelectBox label="Select Shade" required value={val(form.ShdCode, masters.shades, 'ShdCode', 'ShdName')} placeholder="Choose shade..." onPress={() => setPick('shade')} disabled={isDisabled} icon="expand-more" />
          </View>
        </View>
        <View style={s.row2}>
          <Field label={`Cheese${form.IssChees ? ` (max ${form.IssChees})` : ''}`} value={str(form.TotPcs)} onChangeText={(t) => set({ TotPcs: t || '' })} keyboardType="numeric" placeholder="Enter Cheese" style={s.col} editable={!locked} big />
          <Field label={`Weight${form.IssQty ? ` (max ${form.IssQty})` : ''}`} value={str(form.TotQty)} onChangeText={(t) => set({ TotQty: t || '' })} keyboardType="numeric" placeholder="Enter Weight" style={s.col} editable={!locked} big />
        </View>
        <Text style={s.label}>Status</Text>
        <View style={s.segRow}>
          <Seg label="Open" on={status === 'Open'} onPress={() => !locked && setStatus('Open')} />
          <Seg label="Close" on={status === 'Close'} onPress={() => !locked && setStatus('Close')} danger />
        </View>
      </Card>

      {linkOpen && <LinkCreelSheet api={api} ctx={ctx} selected={selectedCreel} onClose={() => setLinkOpen(false)} onPick={onLink} />}
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
            // legacy onSelect: code || '' (item also sets the displayed denier only)
            if (pick === 'item') { set({ ItmCode: x?.ItmCode || '' }); setDenier(x?.Denier || ''); }
            if (pick === 'merge') set({ MerCode: x?.MerCode || '' });
            if (pick === 'grade') set({ GrdCode: x?.GrdCode || '' });
            if (pick === 'shade') set({ ShdCode: x?.ShdCode || '' });
            setPick(null);
          }}
        />
      )}
      <PrinterSheet visible={printOpen} subtitle={`Carton ${str(form.CartNo)}`} state={printers} printing={printing} onClose={() => setPrintOpen(false)} onPrint={(pr) => print(pr.Name)} />
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modify (legacy CreelIssueReturnModifyEntry.tsx)                             */
/* -------------------------------------------------------------------------- */

const mainOf = (m: any) => (Array.isArray(m?.[0]) ? m[0][0] : m?.[0]) || null;

function ModifyView({ api, ctx, row, onBack }: { api: CreelIssueReturnApi; ctx: Ctx; row: any; onBack: (changed?: boolean) => void }) {
  const { wide } = useWide();
  const masters = useMasters(api, ctx);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [main, setMain] = useState<any>(null);
  const [prpCode, setPrpCode] = useState('');
  const [cartonType, setCartonType] = useState<'Single' | 'Mix'>('Single');
  const [status, setStatus] = useState<'Open' | 'Close'>('Open');
  const [d1, setD1] = useState<any[]>([]);
  const [d2, setD2] = useState<any[]>([]);
  const [d3, setD3] = useState<any[]>([]);
  // creel being added as a new d3 row
  const [selectedCreel, setSelectedCreel] = useState<any>(null);
  const [batchNo, setBatchNo] = useState('');
  const [form, setForm] = useState<Record<string, any>>({ TotPcs: '', TotQty: '', IssUId: null, IssSrNo: null, IssSubSr: null, IssQty: 0, IssChees: 0 });
  const [linkOpen, setLinkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printers = usePrinters(api);

  const applyMain = (m: any) => {
    if (!m) return;
    setMain(m);
    setCartonType(String(m.IsCartonType) === '0' ? 'Single' : 'Mix');
    setStatus(String(m.IsCartonStatus) === '0' ? 'Open' : 'Close');
    setPrpCode(str(m.PrpCode));
  };

  useEffect(() => {
    let alive = true;
    api.show(ctx, row?.UId)
      .then((res) => {
        if (!alive) return;
        const resp = res?.response || {};
        applyMain(mainOf(resp.main));
        setD1(Array.isArray(resp.d1) ? resp.d1 : []);
        setD2(Array.isArray(resp.d2) ? resp.d2 : []);
        setD3(Array.isArray(resp.d3) ? resp.d3 : []);
        void printers.load(); // legacy getAllPrinters() after show
      })
      .catch((e) => {
        if (!alive) return;
        const msg = e?.response?.data?.message || e?.message || 'An unexpected error occurred while saving.';
        setError(msg);
        AppAlert.alert('Error', msg);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [api, ctx.prpcode, ctx.yearno, row?.UId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onLink = (item: any) => {
    const { patch } = linkPatch(item, masters.items);
    setSelectedCreel({ UId: item.UId, SrNo: item.SrNo, SubSr: subSrOf(item) });
    setBatchNo(str(item.BatchNo));
    setForm((f) => ({ ...f, ...patch }));
    setLinkOpen(false);
  };

  // legacy handleAddD3Row
  const addRow = () => {
    if (!form.IssUId || !form.IssSrNo) { AppAlert.alert('Warning', 'Please select Creel first.'); return; }
    const dup = d3.some((r) =>
      String(r.IssUId) === String(form.IssUId)
      && String(r.IssSrNo) === String(form.IssSrNo)
      && String(r.IssSubSr || 1) === String(form.IssSubSr || 1));
    if (dup) { AppAlert.alert('Warning', 'This creel is already added.'); return; }
    const newRow = {
      UId: row?.UId || d1[0]?.UId || '',
      SrNo: d1[0]?.SrNo || '1',
      IssUId: form.IssUId, IssSrNo: form.IssSrNo, IssSubSr: form.IssSubSr || 1,
      IssQty: form.IssQty || 0, IssChees: form.IssChees || 0,
      IssRQty: form.TotQty || '', IssRChees: form.TotPcs || '',
      IsCartonStatus: status === 'Open' ? 0 : 1,
      BatchNo: batchNo,
    };
    setD3((cur) => [...cur, newRow]);
    setSelectedCreel(null);
    setBatchNo('');
    setForm((f) => ({ ...f, TotQty: '', TotPcs: '', IssUId: null, IssSrNo: null, IssSubSr: null, IssQty: 0, IssChees: 0 }));
  };

  const removeRow = (i: number) => {
    AppAlert.alert('Delete Row?', 'Are you sure you want to remove this creel return detail?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: () => setD3((cur) => cur.filter((_, j) => j !== i)) },
    ]);
  };

  const upd = (i: number, k: 'IssRQty' | 'IssRChees', v: string) => setD3((cur) => cur.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const save = async () => {
    if (!d3.length) { AppAlert.alert('Warning', 'Please add at least one creel return detail.'); return; }
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
      applyMain(mainOf(resp.main));
      if (Array.isArray(resp.d1)) setD1(resp.d1);
      if (Array.isArray(resp.d2)) setD2(resp.d2);
      if (Array.isArray(resp.d3)) setD3(resp.d3);
      if (res?.success === true) {
        setChanged(true);
        void printers.load();
        AppAlert.alert('Success', typeof res?.message === 'string' ? res.message : typeof resp?.message === 'string' ? resp.message : 'Creel issue return updated successfully.');
      } else if (res?.message === false) {
        AppAlert.alert('Warning', typeof resp?.message === 'string' ? resp.message : 'Unable to update creel issue return.');
      } else if (resp?.error === true) {
        AppAlert.alert('Error', typeof resp?.message === 'string' ? resp.message : 'Unable to update creel issue return.');
      } else {
        AppAlert.alert('Error', typeof res?.message === 'string' ? res.message : 'Something went wrong while updating.');
      }
    } catch (e: any) {
      const ed = e?.response?.data;
      AppAlert.alert('Error', ed?.response?.message || ed?.message || e?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  // legacy printSticker (modify): d1[0] / d2[0] / d3[0] / main
  const print = async (printerName: string) => {
    const a = d1[0] || {}; const b = d2[0] || {}; const c = d3[0] || {}; const m = main || {};
    if (!Object.keys(a).length) { AppAlert.alert('printing sticker data is empty'); return; }
    setPrinting(true);
    try {
      const res = await api.print({
        UId: m.UId ?? '0', TranDate: '0', PrpCode: prpCode ?? '', StrCode: a.StrCode ?? '0',
        ItmCode: a.ItmCode ?? '0', MerCode: a.MerCode ?? '0', ShdCode: a.ShdCode ?? '0', GrdCode: a.GrdCode ?? '0',
        Denier: a.Denier ?? '0', DsnCode: '0', CartNo: b.CartNo ?? '', Wt: a.TotQty ?? '0', Chees: b.Chees ?? '0',
        IsAuto: '0', GrossWt: '0', PUId: a.IssUId ?? '0', PSrNo: a.IssSrNo ?? '0', PSubSr: c.IssSubSr ?? '0',
        TranType: '0', TranName: '', StkType: m.StkType ?? '', StkDate: '', SrNo: a.IssSrNo ?? '0', UsrCode: '0',
        StrName: '', ItmName: a.ItmName ?? '', MerName: a.MerName ?? '', ShdName: a.ShdName ?? '', GrdName: a.GrdName ?? '',
        DnsName: '', Stktype: m.StkType ?? '', nStkDate: '0', yearno: '', IskgQty: '0', Rate: '0', MItmCode: '', MItmName: '',
      }, printerName);
      if (res?.success) { AppAlert.alert('Print Successful', `✅ ${res.printed ?? 1} label(s) sent to printer.`); setPrintOpen(false); }
      else AppAlert.alert('Print failed', res?.message || 'Operation failed');
    } catch (e: any) {
      AppAlert.alert('Print failed', e?.response?.data?.error || e?.message || 'Print failed');
    } finally {
      setPrinting(false);
    }
  };

  const closed = status === 'Close';

  return (
    <ViewShell
      title={`Modify ${str(row?.IssRNo)}`}
      subtitle={`${str(row?.IssRDate)} · ${ctx.prpcode} · Year ${ctx.yearno}`}
      onBack={() => onBack(changed)}
      maxWidth={1000}
      footer={!loading && !error ? (
        <View style={s.footer}>
          <View style={[s.footerInner, wide && { maxWidth: 1000 }]}>
            {closed && <Btn title="Print Sticker" icon="print" variant="secondary" onPress={() => setPrintOpen(true)} />}
            <Btn title="Save Entry" icon="save" variant="accent" onPress={save} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    >
      {loading ? <Loader label="Loading entry…" /> : error ? <ErrorBox text={error} /> : (
        <>
          <View style={s.hero}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroEyebrow}>CARTON NO</Text>
              <Text style={s.heroTitle}>{str(d2[0]?.CartNo) || '—'}</Text>
              <Text style={s.heroSub}>{str(main?.StkType || row?.StkType) || ' '}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 5 }}>
              <Pill label={cartonType} fg="#fff" bg="rgba(255,255,255,0.18)" />
              <Pill label={status} fg="#fff" bg={closed ? T.red : T.green} />
            </View>
          </View>

          <View style={[wide && s.wideRow2]}>
            <View style={[wide && { flex: 1 }]}>
              <Card title="Selected Creel" right={<Btn small title="Link Creel" icon="link" onPress={() => setLinkOpen(true)} />}>
                {batchNo ? (
                  <View style={[s.beamBox, { marginBottom: 10 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.beamNo}>Creel {batchNo}</Text>
                      <Text style={s.beamSub}>UId {str(form.IssUId)} · Sr {str(form.IssSrNo)} · Sub {str(form.IssSubSr)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.qtyLbl}>ISSUED</Text>
                      <Text style={s.beamQty}>{str(form.IssQty)} kg · {str(form.IssChees)} pcs</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[s.muted, { marginBottom: 10 }]}>No Creel Selected</Text>
                )}
                <Text style={s.label}>Carton Type</Text>
                <View style={[s.segRow, { opacity: 0.6 }]}>
                  <Seg label="Single" on={cartonType === 'Single'} onPress={() => undefined} />
                  <Seg label="Mix" on={cartonType === 'Mix'} onPress={() => undefined} />
                </View>
                <Field label="Carton No" value={str(d2[0]?.CartNo)} editable={false} placeholder="Carton No" />
                <View style={s.row2}>
                  <Field label="Cheese" value={str(form.TotPcs)} onChangeText={(v) => setForm((f) => ({ ...f, TotPcs: v || '' }))} keyboardType="numeric" placeholder="Enter Cheese" style={s.col} />
                  <Field label="Weight" value={str(form.TotQty)} onChangeText={(v) => setForm((f) => ({ ...f, TotQty: v || '' }))} keyboardType="numeric" placeholder="Enter Weight" style={s.col} />
                </View>
                <Text style={s.label}>Status</Text>
                <View style={s.segRow}>
                  <Seg label="Open" on={status === 'Open'} onPress={() => setStatus('Open')} />
                  <Seg label="Close" on={status === 'Close'} onPress={() => setStatus('Close')} danger />
                </View>
                <Btn title="Add Creel Return Detail" icon="add-circle" variant="primary" onPress={addRow} />
              </Card>

              {d1.length > 0 && (
                <Card title="Saved Item Detail">
                  {d1.map((r, i) => (
                    <View key={i} style={[s.grid, i > 0 && { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: T.hair }]}>
                      <Meta k="Item" v={str(nameOf(masters.items, 'ItmCode', 'ItmName', r.ItmCode))} />
                      <Meta k="Merge" v={str(nameOf(masters.merges, 'MerCode', 'MerName', r.MerCode))} />
                      <Meta k="Grade" v={str(nameOf(masters.grades, 'GrdCode', 'GrdName', r.GrdCode))} />
                      <Meta k="Shade" v={str(nameOf(masters.shades, 'ShdCode', 'ShdName', r.ShdCode))} />
                    </View>
                  ))}
                </Card>
              )}
            </View>
            <View style={[wide && { flex: 1.2 }]}>
              <Card title={`Creel Return Detail (${d3.length})`}>
                {d3.length === 0 ? <Text style={s.muted}>No return rows</Text> : d3.map((r, i) => (
                  <View key={`${str(r.UId)}-${str(r.IssUId)}-${str(r.IssSrNo)}-${i}`} style={s.d3Row}>
                    <View style={s.d3Head}>
                      <Text style={s.d3No}># {i + 1}</Text>
                      {!!r.BatchNo && <Text style={s.d3Meta}>Creel {str(r.BatchNo)}</Text>}
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity onPress={() => removeRow(i)} hitSlop={HIT}>
                        <Icon name="delete-outline" size={19} color={T.red} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.d3Issued}>
                      <Text style={s.d3Iss}>SrNo <Text style={s.mono}>{str(r.IssSrNo)}</Text></Text>
                      <Text style={s.d3Iss}>Qty <Text style={s.mono}>{str(r.IssQty)}</Text></Text>
                      <Text style={s.d3Iss}>Cheese <Text style={s.mono}>{str(r.IssChees)}</Text></Text>
                    </View>
                    <View style={s.row2}>
                      <Field label="Return Qty" placeholder="Return Qty" value={str(r.IssRQty)} onChangeText={(v) => upd(i, 'IssRQty', v)} keyboardType="numeric" style={s.col} />
                      <Field label="Return Cheese" placeholder="Return Cheese" value={str(r.IssRChees)} onChangeText={(v) => upd(i, 'IssRChees', v)} keyboardType="numeric" style={s.col} />
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          </View>
        </>
      )}
      {linkOpen && <LinkCreelSheet api={api} ctx={ctx} selected={selectedCreel} onClose={() => setLinkOpen(false)} onPick={onLink} />}
      <PrinterSheet visible={printOpen} subtitle={`${str(row?.IssRNo)} • ${str(d2[0]?.CartNo)}`} state={printers} printing={printing} onClose={() => setPrintOpen(false)} onPrint={(pr) => print(pr.Name)} />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
