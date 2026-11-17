// FILE: src/components/DtsNEW/index.tsx
// NEW ERP — DTS (Dress Material · Technical Textile · Sportswear): the owner's own section in one place.
// The Dashboard's anatomy with DTS figures only — a record belongs to DTS by the item (category) of its
// design, on any loom. Built from the "DTS" tab of the Madhusudhan ERP design (SectionAHub).
//
// Endpoint (see ./api.ts — host = `API` prop, Bearer = `token` prop):
//   GET /api/getDtsDashboard?prptype&section&from&to        (DtsDashboardController, NEW)
//     meta          once, on mount            -> rights of each widget + the items counted as DTS
//     sales / production / collection / payments_made   this month (widgets) and any range (full reports)
//     booked        this month                 -> Target card
//     outstanding   as on today
//     beam_shortage FY to date
//     target        the month's DTS targets    -> Target card and Monthly Report (two light queries)
//     fy            a financial year month-wise (&metric=...) -> the FY page of each widget (./Fy.tsx)
//   Samples widget: the Sampling Hub's own list API (same as the Dashboard's Samples card), DTS categories only.
//
// Blocks (same order as the design):
//   1. Target card      ring SO % · Billed % of the DTS target, collection bar; tap -> the two breakdowns
//   2. Monthly Report   month chips · Sales vs Target · Collection vs Target   tap a row -> its invoices / receipts
//   3. Sales            Today · Month · date-wise graph · Category / Executive / Design / Party table
//   4. Production       Today · Month · graph · Section A / Section B machines and their sheds
//   5. Samples          Created · Dispatched · In store · Out · latest dispatches
//   6. Payment Collection   Today · Month · graph · executive list
//   7. Payments Made    Today · Month · graph · the day's payments
//   8. Outstanding      Total due · overdue · executive list
//   9. Beam Shortage    FY % · completed beams · by design
//  10. DTS Expense      (top card) cost · cost/pick · cost/metre — Expense module rates x DTS pick-metres (./Expense.tsx)
//  11. Outsourcing      fabric received from job workers · charges · yarn at job workers
//  12. Stock            internal (greige / finished fabric) and external (at mills / job workers), kept apart (./Stock.tsx)
//   Every title bar, row and graph point opens the matching filtered report (./Drill.tsx):
//   General -> Specific -> More specific -> records.
//
// Rights: production.dts (screen, route guard) and production.dts.<widget> — a widget the user has no
// right to is not drawn and the API refuses it too.
// The screen only DISPLAYS what the API returns. No own header / SafeAreaView (global AppHeader).
import { formatDashboardAmount, useDashboardAmountMode } from '@/src/components/dashboard/AmountDisplayModeControl';
import { SamplingHubAPI } from '@/src/api/legacyClient';
import { useBusinessContext } from '@/src/core/business';
import { usePermission } from '@/src/core/permissions';
import { sampleDashboardStats, sampleDateLabel, sampleDisplayName } from '@/src/screens/dashboard/samplesDashboardModel';
import { ListData, normalizeList, unwrap } from '@/src/screens/samplingHub/samplingHubModel';
import { T } from '@/src/theme';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CONTENT_MAX } from '../erpUi';
import { FONT, loadOwnerFonts } from '../OwnerDashboardNEW/fonts';
import { useHardwareBack } from '../OwnerDashboardNEW/OrderTracker';
import { getDtsSection } from './api';
import Drill, { DrillLoad } from './Drill';
import { DtsExpCard, DtsExpenseSource, sectionRates, useDtsExpense } from './Expense';
import DtsExpensePage from './ExpensePage';
import FYPage, { FYBtn, FyMetric } from './Fy';
import { StockKind, StockPage, useFabricStock } from './Stock';
import {
  DrillInit, DTS, DtsCategory, DtsFetch, DtsItem, DtsResponse, DtsRightKey, DtsSection, DtsTarget, fmtD, fmtDY, fyEndOf,
  fyStartOf, isDtsCategory, M, mLbl, mLong, monthEnd, num, PathStep, pctTxt, pl, Q, SEC_MACH, secKg, secM, sum, toItems, todayS,
} from './model';
import {
  C, DayNote, Divider, ExecName, ListRow, MLink, monthDaysLeft, RefreshBtn, SecEmpty, SecHead, SecHint, Spark,
  st as ui, StateBox, TotRow, TwoLine, VsRow, Widget,
} from './ui';

type Props = { token: string; API: string; prptype?: string };
type PageType = 'fy' | 'monthly' | 'sales' | 'prod' | 'coll' | 'out' | 'short' | 'pay' | 'exp' | 'cost' | 'outs' | 'outsl' | 'stock' | 'stockk';
type Page = { type: PageType; data: DrillInit };
type Fetch = DtsFetch;
type Money = (n: number) => string;

const PAY_COL = '#8C4A2F';
const PAGE_LBL: Record<PageType, string> = {
  fy: 'FY performance',
  monthly: 'Monthly Report', sales: 'Sales', prod: 'Production', coll: 'Payment Collection', out: 'Outstanding',
  short: 'Beam shortage', pay: 'Payments made', exp: 'Expense', cost: 'Weaving cost', outs: 'Outsourcing', outsl: 'Yarn at job workers',
  stock: 'Stock', stockk: 'Stock',
};

/** the API sections each page shows — its ↻ reloads exactly these */
const PAGE_SECTIONS: Record<PageType, string[]> = {
  fy: ['fy', 'sales', 'production', 'payments_made', 'outsourcing', 'pickmetres', 'expense'],
  monthly: ['target', 'sales', 'collection'], sales: ['sales'], prod: ['production'], coll: ['collection'], out: ['outstanding'],
  short: ['beam_shortage'], pay: ['payments_made'], exp: ['pickmetres', 'expense'], cost: ['pickmetres', 'expense'],
  outs: ['outsourcing', 'outsourcing_yarn'], outsl: ['outsourcing_yarn'], stock: ['mill_stock', 'outsourcing_yarn', 'fabric'],
  stockk: ['mill_stock', 'outsourcing_yarn', 'fabric'],
};

const NO_EXPENSE: DtsExpenseSource = { x: null, byMonth: {}, months: [], cur: '', loading: true, error: '' };
/** the FY metric behind each report page's "FY ›" button */
const PAGE_FY: Partial<Record<PageType, FyMetric>> = { sales: 'sales', monthly: 'sales', prod: 'production', cost: 'seccost', exp: 'dtscost', pay: 'payments', outs: 'jobwork' };

/** Loads the Expense module's figures (only mounted for users with the DTS expense right) and hands them to the hub. */
function ExpenseLoader({ token, API, onData }: { token: string; API: string; onData: (src: DtsExpenseSource) => void }) {
  const src = useDtsExpense(token, API);
  useEffect(() => {
    onData(src);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  return null;
}

/* ------------------------------------------------------------------ */
/* one section of the month, for a widget                              */
/* ------------------------------------------------------------------ */

type SectionState = { loading: boolean; error: string; items: DtsItem[]; meta: Record<string, any> };

function useSection(fetch: Fetch, section: DtsSection, from: string | undefined, to: string | undefined, enabled: boolean, version: number) {
  const [state, setState] = useState<SectionState>({ loading: enabled, error: '', items: [], meta: {} });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fetch(section, from, to)
      .then((r) => alive && setState({ loading: false, error: '', items: toItems(section, r.items), meta: r.meta }))
      .catch((e: any) => alive && setState({ loading: false, error: e?.message || 'Unable to load.', items: [], meta: {} }));
    return () => {
      alive = false;
    };
  }, [fetch, section, from, to, enabled, version, tick]);
  return { ...state, reload: () => setTick((n) => n + 1) };
}

const notesOf = (r: DtsResponse) => {
  const out: string[] = [];
  if (r.fromClamped) out.push(`Dates before ${fmtDY(r.fy.from)} are in the previous financial year's books and are not shown here.`);
  if (r.truncated) out.push('Only the first 20,000 records are shown — choose a shorter period.');
  if (r.meta?.previous_year_bills_included === false) out.push('Bills brought forward from the previous year are not included.');
  return out.join(' ');
};

/* ------------------------------------------------------------------ */
/* Sales table: Category / Executive / Design / Party, tap a row to expand its breakdown */
/* ------------------------------------------------------------------ */

type SalesMode = 'cat' | 'exec' | 'art' | 'party';
const SALES_MODES: [SalesMode, string][] = [['cat', 'Category'], ['exec', 'Executive'], ['art', 'Design'], ['party', 'Party']];
const SALES_LBL: Record<SalesMode, string> = { cat: 'Category', exec: 'Executive', art: 'Design', party: 'Party' };
const SALES_SUB: Record<SalesMode, SalesMode[]> = { cat: ['art', 'exec'], exec: ['cat', 'party'], art: ['exec', 'party'], party: ['art', 'cat'] };
const CAT_COLORS = ['#3A568A', '#C87533', '#2A6044', '#652880', '#1C567A', '#C98A1A', '#B23A2A'];

function DashSales({ lines, L, onFull }: { lines: DtsItem[]; L: Money; onFull: (mode: SalesMode, value: string) => void }) {
  const [mode, setMode] = useState<SalesMode>('cat');
  const [open, setOpen] = useState<string | null>(null);
  const catColor = useMemo(() => {
    const names = Array.from(new Set(lines.map((l) => l.d.cat))).sort();
    return (name: string) => CAT_COLORS[Math.max(0, names.indexOf(name)) % CAT_COLORS.length];
  }, [lines]);
  const pivot = (ls: DtsItem[], m: SalesMode) => {
    const g: Record<string, { k: string; qty: number; amt: number }> = {};
    ls.forEach((l) => {
      const k = l.d[m] || '—';
      const r = g[k] || (g[k] = { k, qty: 0, amt: 0 });
      r.qty += num(l.q);
      r.amt += num(l.v);
    });
    return Object.values(g).sort((a, b) => b.amt - a.amt);
  };
  const rows = pivot(lines, mode);
  const grand = sum(lines), grandQ = sum(lines, 'q');
  const mark = (m: SalesMode, k: string, size: number) =>
    m === 'cat' ? <View style={{ width: size, height: size, borderRadius: 2, backgroundColor: catColor(k) }} /> : null;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5, paddingTop: 4, paddingBottom: 8 }}>
        {SALES_MODES.map(([k, l]) => (
          <Pressable key={k} accessibilityRole="button" onPress={() => { setMode(k); setOpen(null); }} style={[ui.chip, mode === k && ui.chipOn]}>
            <Text style={[ui.chipText, mode === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={[s.salesRow, { minHeight: 0, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.hair }]}>
        <View style={{ width: 14 }} />
        <Text style={[ui.rowHeadText, { flex: 1 }]}>{SALES_LBL[mode]}</Text>
        <Text style={[ui.rowHeadText, { minWidth: 62, textAlign: 'right' }]}>Qty</Text>
        <Text style={[ui.rowHeadText, { minWidth: 78, textAlign: 'right' }]}>Amount</Text>
      </View>
      {rows.map((r) => {
        const isOpen = open === r.k;
        const ol = isOpen ? lines.filter((l) => (l.d[mode] || '—') === r.k) : [];
        return (
          <View key={r.k} style={{ borderBottomWidth: 1, borderBottomColor: T.hair }}>
            <Pressable
              onPress={() => setOpen(isOpen ? null : r.k)}
              accessibilityRole="button"
              accessibilityLabel={`${r.k}, ${L(r.amt)}. ${isOpen ? 'Collapse' : 'Expand'}`}
              style={s.salesRow}
            >
              <Text style={{ width: 14, fontSize: 9, color: C.faint }}>{isOpen ? '▾' : '▸'}</Text>
              <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                {mode === 'exec' ? <ExecName name={r.k} size={22} /> : (
                  <>
                    {mark(mode, r.k, 9)}
                    <Text style={[ui.rowName, { fontSize: 13, flexShrink: 1 }]} numberOfLines={1}>{r.k}</Text>
                  </>
                )}
              </View>
              <Text style={[ui.rowNum, { color: C.mut, fontSize: 11, minWidth: 62, textAlign: 'right' }]}>{Q(r.qty)}</Text>
              <Text style={[ui.rowNum, { fontSize: 12, fontWeight: '700', minWidth: 78, textAlign: 'right' }]}>{L(r.amt)}</Text>
            </Pressable>
            {isOpen ? (
              <View style={s.salesOpen}>
                {SALES_SUB[mode].map((dim) => (
                  <View key={dim} style={{ paddingBottom: 4 }}>
                    <Text style={ui.secHead}>By {SALES_LBL[dim]}</Text>
                    {pivot(ol, dim).map((x) => (
                      <View key={x.k} style={s.salesSubRow}>
                        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {mark(dim, x.k, 7)}
                          <Text style={{ fontFamily: FONT, fontSize: 11.5, color: C.mut, flexShrink: 1 }} numberOfLines={1}>{x.k}</Text>
                        </View>
                        <Text style={[ui.rowNum, { fontSize: 10, color: C.faint, minWidth: 58, textAlign: 'right' }]}>{Q(x.qty)}</Text>
                        <Text style={[ui.rowNum, { fontSize: 11, fontWeight: '700', minWidth: 74, textAlign: 'right' }]}>{L(x.amt)}</Text>
                      </View>
                    ))}
                  </View>
                ))}
                <Pressable onPress={() => onFull(mode, r.k)} accessibilityRole="button" hitSlop={6}>
                  <Text style={s.viewFull}>View full report ›</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
      {!rows.length ? <SecEmpty>No DTS invoices in this period.</SecEmpty> : null}
      <View style={s.salesTotal}>
        <Text style={{ fontFamily: FONT, fontSize: 11, color: C.mut }}>Total</Text>
        <Text style={[ui.rowNum, { fontSize: 11 }]}>
          <Text style={{ color: C.faint }}>{Q(grandQ)}   </Text>
          <Text style={{ fontWeight: '700' }}>{L(grand)}</Text>
        </Text>
      </View>
      <SecHint>Toggle the view · tap any row to expand its breakdown. Qty in metres, amount in ₹.</SecHint>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Samples of DTS designs (Sampling Hub data, DTS categories only)      */
/* ------------------------------------------------------------------ */

function DtsSamples({ prptype, patterns, version }: { prptype: string; patterns: string[]; version: number }) {
  const router = useRouter();
  const { yearNo, prpCode } = useBusinessContext();
  const { canAccess } = usePermission();
  const canOpenHub = canAccess('production.sampling_hub');
  const [data, setData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = todayS();

  const load = useCallback(async () => {
    if (!prptype || !yearNo) return;
    setLoading(true);
    setError('');
    try {
      const res = await SamplingHubAPI.list({ prptype, yearno: String(yearNo), prpcode: String(prpCode || ''), dashboard_card: 1 });
      setData(normalizeList(unwrap(res)));
    } catch (e: any) {
      setData(null);
      setError(e?.response?.data?.message || e?.message || 'Samples unavailable.');
    } finally {
      setLoading(false);
    }
  }, [prptype, yearNo, prpCode]);
  useEffect(() => {
    void load();
  }, [load, version]);

  /* the Dashboard's own sample statistics, over the samples whose category is DTS */
  const stats = useMemo(() => {
    if (!data) return null;
    const samples = data.samples.filter((sm) => isDtsCategory(sm.category, patterns));
    const ids = new Set(samples.map((sm) => sm.id));
    return sampleDashboardStats({ ...data, samples, moves: data.moves.filter((m) => ids.has(m.sample)) }, today);
  }, [data, patterns, today]);

  const open = (params: Record<string, string>) => {
    if (!canOpenHub) return;
    router.push({ pathname: '/new/(tabs)/sampling-hub', params: { from_dashboard: 'samples', date: today, ...params } } as any);
  };

  return (
    <Widget icon="▣" title="Samples" accent={T.purple} time="live" onTitle={canOpenHub ? () => open({ stage: 'overview' }) : undefined} onRefresh={() => void load()}>
      {loading && !stats ? <StateBox loading /> : null}
      {error ? <StateBox error={error} onRetry={load} /> : null}
      {stats ? (
        <>
          <TotRow
            items={[
              { label: 'Created · month', value: String(stats.created), color: C.prod, onPress: () => open({ stage: 'created' }) },
              { label: 'Dispatched · month', value: String(stats.dispatched), color: T.purple, onPress: () => open({ stage: 'dispatches' }) },
              { label: 'In store', value: String(stats.inStore), color: C.bill, onPress: () => open({ stage: 'inventory' }) },
              { label: 'Out', value: String(stats.out), color: C.today, onPress: () => open({ stage: 'out' }) },
            ]}
          />
          <ListRow head left="Latest dispatches" />
          {stats.latestDispatches.slice(0, 4).map(({ move, sample }) => (
            <ListRow
              key={move.id}
              onPress={canOpenHub ? () => open({ stage: 'sample', sample_id: move.sample }) : undefined}
              left={<TwoLine title={`${move.sample} ${sampleDisplayName(sample)}`} sub={`→ ${move.party || 'Customer'} · ${move.by || 'Recorded'} · ${sampleDateLabel(move.date)}`} />}
            />
          ))}
          {!stats.latestDispatches.length ? <SecEmpty>No dispatches of DTS samples this month.</SecEmpty> : null}
          <SecHint>Samples whose category is DTS. Status and balances reflect recorded sample movements.</SecHint>
        </>
      ) : null}
    </Widget>
  );
}

/* ------------------------------------------------------------------ */
/* Monthly Report — the owner's Monthly Report for DTS: month chips, Sales vs Target (amount, qty, graph,   */
/* by category, by executive) and Collection vs Target (amount, graph, by executive).                        */
/* Target rule (backend): the month's company billing target x DTS share of this year's billing.             */
/* ------------------------------------------------------------------ */

const achColor = (p: number) => (p >= 90 ? T.green : p >= 60 ? T.blue : T.amber);
const achOf = (actual: number, target: number | undefined) => (target && target > 0 ? Math.round((actual / target) * 100) : null);

function Monthly({
  fetch, L, version, onRefresh, onSales, onColl, onFy, init, onMonth,
}: {
  fetch: Fetch; L: Money; version: number; onRefresh: () => void; onFy: () => void;
  /** the month to open on (remembered when you come back from a report) and its setter */
  init?: string | null; onMonth: (ym: string) => void;
  onSales: (ym: string, path: PathStep[], day: string | null) => void;
  onColl: (ym: string, path: PathStep[]) => void;
}) {
  const today = todayS();
  const [row, setRow] = useState<DtsTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /* the design's month selector: the last 12 months, built here so it never waits for the server; opens on the last closed month */
  const months12 = useMemo(() => {
    const y = +today.slice(0, 4), mo = +today.slice(5, 7);
    return Array.from({ length: 12 }, (_, i) => { const d = new Date(y, mo - 12 + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  }, [today]);
  const [mk, setMk] = useState(init && months12.includes(init) ? init : months12[months12.length - 2] || today.slice(0, 7));
  const [sel, setSel] = useState<string | null>(null);
  const chips = useRef<ScrollView>(null);
  const mFrom = `${mk}-01`, mTo = monthEnd(mk);
  /* the targets of the chosen month only (section=target): the DTS share is that of the financial year the month belongs to */
  const fyEnd = fyEndOf(mFrom), tgtTo = fyEnd > today ? today : fyEnd;
  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setRow(null);
    fetch('target', mFrom, tgtTo)
      .then((r) => alive && setRow(r.meta as DtsTarget))
      .catch((e: any) => alive && setError(e?.message || 'Unable to load the targets.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [fetch, mFrom, tgtTo]);
  useEffect(load, [load, version]);

  const sales = useSection(fetch, 'sales', mFrom, mTo, true, version);
  const coll = useSection(fetch, 'collection', mFrom, mTo, true, version);
  const meta: Partial<DtsTarget> = row || {};

  const amt = sum(sales.items);
  const catColor = (name: string) => {
    const names = Array.from(new Set(sales.items.map((l) => l.d.cat))).sort();
    return CAT_COLORS[Math.max(0, names.indexOf(name)) % CAT_COLORS.length];
  };
  const group = (ls: DtsItem[], dim: string) => {
    const g: Record<string, number> = {};
    ls.forEach((x) => { g[x.d[dim] || '—'] = (g[x.d[dim] || '—'] || 0) + num(x.v); });
    return g;
  };
  const tgtOf = (list: { name: string; target: number }[] | undefined, name: string) => (list || []).find((t) => t.name === name)?.target;
  const catRows = Object.entries(group(sales.items, 'cat'))
    .map(([name, act]) => ({ name, act, ach: achOf(act, tgtOf(row?.category_targets, name)) }))
    .sort((x, y) => y.act - x.act);
  const execRows = Object.entries(group(sales.items, 'exec'))
    .map(([name, act]) => ({ name, act, ach: achOf(act, tgtOf(row?.exec_targets, name)) }))
    .sort((x, y) => (y.ach ?? -1) - (x.ach ?? -1) || y.act - x.act);
  const collExec = Object.entries(group(coll.items, 'exec')).sort((x, y) => y[1] - x[1]);
  const pct = (p: number | null) => <Text style={[ui.rowNum, { minWidth: 44, textAlign: 'right', fontWeight: '700', color: p == null ? C.faint : achColor(p) }]}>{p == null ? '—' : `${p}%`}</Text>;
  const share = num(meta.dts_share);

  return (
    <View style={{ paddingBottom: 16 }}>
      {/* month chips */}
      <ScrollView ref={chips} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 10, paddingTop: 2 }}
        onContentSizeChange={() => chips.current?.scrollToEnd({ animated: false })}>
        {months12.map((k) => (
          <Pressable key={k} onPress={() => { setMk(k); setSel(null); onMonth(k); }} accessibilityRole="button" accessibilityState={{ selected: mk === k }} style={[s.mChip, mk === k && s.mChipOn]}>
            <Text style={[s.mChipText, mk === k && { color: '#fff' }]}>{mLbl(k)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Widget icon="🎯" title={`Sales vs Target · ${mLbl(mk)}`} accent={C.owner} onRefresh={onRefresh} right={<FYBtn dark onPress={onFy} />}>
        {sales.loading || sales.error ? <StateBox loading={sales.loading} error={sales.error} onRetry={sales.reload} /> : (
          <>
            <VsRow label="Sales Amount" actual={amt} target={loading ? null : row?.target ?? null} fmt={L} />
            <Spark from={mFrom} to={mTo} entries={sales.items} color={C.bill} fmt={L} sel={sel} onPick={setSel} />
            <Divider>By category</Divider>
            <View style={s.mHead}>
              <View style={{ width: 14 }} /><Text style={[ui.rowHeadText, { flex: 1 }]}>Category</Text>
              <Text style={[ui.rowHeadText, s.mCol]}>Actual</Text><Text style={[ui.rowHeadText, { minWidth: 44, textAlign: 'right' }]}>Ach</Text>
            </View>
            {catRows.map((r) => (
              <Pressable key={r.name} onPress={() => onSales(mk, [{ k: 'cat', v: r.name }], sel)} accessibilityRole="button" style={({ pressed }) => [s.mRow, pressed && { backgroundColor: '#F9F7F4' }]}>
                <View style={{ width: 14 }}><View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: catColor(r.name) }} /></View>
                <Text style={[ui.rowName, { flex: 1 }]} numberOfLines={1}>{r.name}</Text>
                <Text style={[ui.rowNum, s.mCol]}>{L(r.act)}</Text>
                {pct(r.ach)}
              </Pressable>
            ))}
            <Divider>By executive</Divider>
            <View style={s.mHead}>
              <View style={{ width: 14 }} /><Text style={[ui.rowHeadText, { flex: 1 }]}>Executive</Text>
              <Text style={[ui.rowHeadText, s.mCol]}>Sales</Text><Text style={[ui.rowHeadText, { minWidth: 44, textAlign: 'right' }]}>Ach</Text>
            </View>
            {execRows.map((r, i) => (
              <Pressable key={r.name} onPress={() => onSales(mk, [{ k: 'exec', v: r.name }], sel)} accessibilityRole="button" style={({ pressed }) => [s.mRow, pressed && { backgroundColor: '#F9F7F4' }]}>
                <Text style={{ width: 14, fontFamily: FONT, fontSize: 11, color: C.faint }}>{i + 1}</Text>
                <View style={{ flex: 1, minWidth: 0 }}><ExecName name={r.name} /></View>
                <Text style={[ui.rowNum, s.mCol]}>{L(r.act)}</Text>
                {pct(r.ach)}
              </Pressable>
            ))}
            {!sales.items.length ? <SecEmpty>No DTS invoices in {mLong(mk)}.</SecEmpty> : null}
            <SecHint>
              {row?.company_target
                ? `DTS target = the month's company billing target ${L(row.company_target)} × DTS share ${(share * 100).toFixed(1)}% (DTS ${L(num(meta.dts_billed_fy))} of ${L(num(meta.all_billed_fy))} billed this year). An executive's DTS target is the same share of theirs; a category's is its own share. Tap a row for its invoices.`
                : error || meta.targets_available === false
                  ? 'Sales targets could not be read from Monthly Sales Target, so only actual figures are shown. Tap a row for its invoices.'
                  : `No billing target is entered for ${mLong(mk)} in Monthly Sales Target, so only actual figures are shown. Tap a row for its invoices.`}
              {' '}The ERP holds no sales-quantity target, so the Sales Qty bar is left out rather than estimated.
            </SecHint>
          </>
        )}
      </Widget>

      <Widget icon="💰" title={`Collection vs Target · ${mLbl(mk)}`} accent={C.exec} onRefresh={onRefresh}>
        {coll.loading || coll.error ? <StateBox loading={coll.loading} error={coll.error} onRetry={coll.reload} /> : (
          <>
            <VsRow label="Amount Collected" actual={sum(coll.items)} target={loading ? null : row?.collection_target ?? null} fmt={L} />
            <Spark from={mFrom} to={mTo} entries={coll.items} color={C.today} fmt={L} />
            <Divider>By executive</Divider>
            <View style={s.mHead}>
              <View style={{ width: 14 }} /><Text style={[ui.rowHeadText, { flex: 1 }]}>Executive</Text>
              <Text style={[ui.rowHeadText, s.mCol]}>Collected</Text>
            </View>
            {collExec.map(([name, v], i) => (
              <Pressable key={name} onPress={() => onColl(mk, [{ k: 'exec', v: name }])} accessibilityRole="button" style={({ pressed }) => [s.mRow, pressed && { backgroundColor: '#F9F7F4' }]}>
                <Text style={{ width: 14, fontFamily: FONT, fontSize: 11, color: C.faint }}>{i + 1}</Text>
                <View style={{ flex: 1, minWidth: 0 }}><ExecName name={name} /></View>
                <Text style={[ui.rowNum, s.mCol]}>{L(v)}</Text>
              </Pressable>
            ))}
            {!coll.items.length ? <SecEmpty>No receipts against DTS bills in {mLong(mk)}.</SecEmpty> : null}
            <SecHint>Receipts against DTS bills, bill by bill as the Outstanding module settles them; the part that lands on DTS bills is DTS's collection. Collection target = 92% of the DTS sales target.</SecHint>
          </>
        )}
      </Widget>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Target ring: outer = SO booked %, inner = Billed % of the DTS sales target (null = no target entered) */
/* ------------------------------------------------------------------ */

function TargetRing({ so, billed, size = 104 }: { so: number | null; billed: number | null; size?: number }) {
  const c = size / 2;
  const arc = (r: number, pct: number | null, color: string) => {
    const circ = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
    return (
      <>
        <Circle cx={c} cy={c} r={r} fill="none" stroke={T.hair} strokeWidth={7} />
        {p > 0 ? <Circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - p / 100)} transform={`rotate(-90 ${c} ${c})`} /> : null}
      </>
    );
  };
  const txt = (p: number | null) => (p == null ? '—' : `${Math.round(Math.min(999, p))}%`);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`SO booked ${txt(so)} and billed ${txt(billed)} of the DTS target`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {arc(c - 6, so, T.copper)}
        {arc(c - 16, billed, T.blue)}
      </Svg>
      <Text style={{ fontFamily: FONT, fontSize: 10, fontWeight: '700', color: T.copper, fontVariant: ['tabular-nums'] }}>SO {txt(so)}</Text>
      <Text style={{ fontFamily: FONT, fontSize: 10, fontWeight: '700', color: T.blue, fontVariant: ['tabular-nums'], marginTop: 1 }}>Billed {txt(billed)}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* the hub                                                             */
/* ------------------------------------------------------------------ */

export default function DtsNEW({ token, API, prptype = 'S' }: Props) {
  const { width } = useWindowDimensions();
  const { mode } = useDashboardAmountMode();
  const L: Money = useCallback((n: number) => formatDashboardAmount(n, mode), [mode]);
  const today = todayS(), ym = today.slice(0, 7), mFrom = `${ym}-01`, mTo = monthEnd(ym);

  useEffect(() => {
    loadOwnerFonts();
  }, []);

  /* ---- API with a per-range cache (a report re-opened for the same range does not hit the server again) ---- */
  const cache = useRef(new Map<string, Promise<DtsResponse>>());
  const fetch: Fetch = useCallback(
    (section, from, to, metric) => {
      const key = `${section}|${from || ''}|${to || ''}|${metric || ''}`;
      let p = cache.current.get(key);
      if (!p) {
        p = getDtsSection(API, token, { prptype, section, from, to, metric });
        cache.current.set(key, p);
        p.catch(() => cache.current.delete(key));
      }
      return p;
    },
    [API, token, prptype],
  );

  /* ---- rights + the items counted as DTS ---- */
  const [version, setVersion] = useState(0);
  const [rights, setRights] = useState<Partial<Record<DtsRightKey, boolean>> | null>(null);
  const [cats, setCats] = useState<DtsCategory[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [metaError, setMetaError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    let alive = true;
    setMetaError('');
    fetch('meta')
      .then((r) => {
        if (!alive) return;
        setRights(r.permissions.sections || {});
        setCats(Array.isArray(r.meta.categories) ? r.meta.categories : []);
        setPatterns(Array.isArray(r.meta.patterns) ? r.meta.patterns : []);
      })
      .catch((e: any) => alive && setMetaError(e?.message || 'Unable to load DTS.'))
      .finally(() => alive && setRefreshing(false));
    return () => {
      alive = false;
    };
  }, [fetch, version]);
  const can = (k: DtsRightKey) => !!rights && !!rights[k];
  /* refresh one part: forget what was loaded for those sections and load them again from the server */
  const [secVer, setSecVer] = useState<Record<string, number>>({});
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const ver = (...keys: string[]) => version * 1000 + keys.reduce((a, k) => a + (secVer[k] || 0), 0);
  const bump = (...keys: string[]) => {
    Array.from(cache.current.keys()).forEach((k) => { if (keys.includes(k.split('|')[0])) cache.current.delete(k); });
    setSecVer((v) => { const n = { ...v }; keys.forEach((k) => { n[k] = (n[k] || 0) + 1; }); return n; });
    setUpdatedAt(new Date());
  };
  const refresh = () => {
    setUpdatedAt(new Date());
    cache.current.clear();
    setRefreshing(true);
    setVersion((v) => v + 1);
  };

  /* ---- the month's records of each widget ---- */
  const sales = useSection(fetch, 'sales', mFrom, mTo, can('sales'), ver('sales'));
  const prod = useSection(fetch, 'production', mFrom, mTo, can('production'), ver('production'));
  const coll = useSection(fetch, 'collection', mFrom, mTo, can('collection'), ver('collection'));
  const pay = useSection(fetch, 'payments_made', mFrom, mTo, can('payments_made'), ver('payments_made'));
  const booked = useSection(fetch, 'booked', mFrom, mTo, can('target'), ver('booked'));
  const tgt = useSection(fetch, 'target', mFrom, today, can('target'), ver('target'));
  const outs = useSection(fetch, 'outstanding', undefined, today, can('outstanding'), ver('outstanding'));
  const short = useSection(fetch, 'beam_shortage', undefined, today, can('beam_shortage'), ver('beam_shortage'));
  const picks = useSection(fetch, 'pickmetres', mFrom, mTo, can('expense'), ver('pickmetres'));
  const jobIn = useSection(fetch, 'outsourcing', mFrom, mTo, can('outsourcing'), ver('outsourcing'));
  const jobYarn = useSection(fetch, 'outsourcing_yarn', undefined, today, can('outsourcing'), ver('outsourcing_yarn'));
  const mill = useSection(fetch, 'mill_stock', undefined, today, can('stock'), ver('mill_stock'));
  const fabric = useFabricStock(token, API, prptype, patterns, can('stock'), ver('fabric'));
  const [expSrc, setExpSrc] = useState<DtsExpenseSource>(NO_EXPENSE);

  /* ---- pages (‹ back restores the page you came from) ---- */
  const [stack, setStack] = useState<Page[]>([]);
  const scroll = useRef<ScrollView>(null);
  const push = (type: PageType, data: DrillInit = {}) => {
    setStack((st) => [...st, { type, data }]);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  /* a page that has steps of its own (FY: records -> breakdown -> overview) steps back inside itself first */
  const pageBack = useRef<(() => boolean) | null>(null);
  const back = useCallback(() => {
    if (pageBack.current && pageBack.current()) return;
    setStack((st) => st.slice(0, -1));
  }, []);
  const openFy = (metric: FyMetric) => push('fy', { kind: metric });
  const home = () => setStack([]);
  useHardwareBack(back, stack.length > 0);
  const remember = (i: number) => (state: DrillInit) =>
    setStack((st) => (st[i] ? st.map((p, k) => (k === i ? { ...p, data: state } : p)) : st));

  /* ---- day picked on a widget's graph ---- */
  const [selS, setSelS] = useState<string | null>(null);
  const [selP, setSelP] = useState<string | null>(null);
  const [selC, setSelC] = useState<string | null>(null);
  const [selPay, setSelPay] = useState<string | null>(null);
  const onDay = (ls: DtsItem[], d: string) => ls.filter((x) => x.date === d);
  const dayLbl = (sel: string | null) => (sel ? fmtD(sel) : 'Today');
  const dayInit = (sel: string | null, path?: PathStep[]): DrillInit =>
    sel ? { period: 'custom', from: sel, to: sel, path } : { period: 'month', path };

  const loaders = useMemo(() => {
    const mk = (section: DtsSection, ranged: boolean): DrillLoad => (from, to) =>
      fetch(section, ranged ? from : undefined, ranged ? to : today).then((r) => ({ items: toItems(section, r.items), note: notesOf(r) }));
    /* outstanding: the note shows where the DTS figure sits inside the Dashboard's Outstanding card */
    const out: DrillLoad = () =>
      fetch('outstanding', undefined, today).then((r) => {
        const rc = r.meta?.reconciliation;
        const tie = rc?.available
          ? `Check against the Dashboard: Outstanding card ${L(rc.dashboard_total)} (all categories, net of on-account receipts and credits) = open bills ${L(rc.all_open_bills)} ${rc.unadjusted_and_other < 0 ? '−' : '+'} ${L(Math.abs(rc.unadjusted_and_other))} unadjusted receipts / credits. Of the open bills, DTS is ${L(rc.dts_open_bills)} and other categories ${L(rc.other_open_bills)}.`
          : '';
        return { items: toItems('outstanding', r.items), note: [tie, notesOf(r)].filter(Boolean).join(' ') };
      });
    /* weaving cost: every pick-metre row at the Expense module's rate of its section for its month */
    const cost: DrillLoad = (from, to) =>
      fetch('pickmetres', from, to).then((r) => {
        let skipped = 0;
        const items: DtsItem[] = [];
        toItems('pickmetres', r.items).forEach((p) => {
          const rt = sectionRates(expSrc, p.date.slice(0, 7));
          if (!rt) {
            skipped += num(p.v);
            return;
          }
          const k = p.sec === 'A' ? 'A' : 'B';
          items.push({ ...p, v: num(p.pm) * rt[k], aux: num(p.pm), sub: `${p.sub} · ₹${rt[k].toFixed(4)}/pick·m · Section ${k}` });
        });
        const miss = skipped > 0 ? `${secM(skipped)} fall in months for which the Expense module has no Section A / B rate loaded and are not costed.` : '';
        return { items, note: [miss, notesOf(r)].filter(Boolean).join(' ') };
      });
    return {
      sales: mk('sales', true), prod: mk('production', true), coll: mk('collection', true), pay: mk('payments_made', true),
      out, short: mk('beam_shortage', false), cost, outs: mk('outsourcing', true), outsl: mk('outsourcing_yarn', false),
    };
  }, [fetch, today, L, expSrc]);

  const loadPickRows = useCallback((m: string) => fetch('pickmetres', `${m}-01`, monthEnd(m)).then((r) => toItems('pickmetres', r.items)), [fetch]);
  const router = useRouter();

  const cols = width >= 1180 ? 3 : width >= 760 ? 2 : 1;
  const pad = width < 420 ? 10 : 12;

  /* ================================================================== */
  /* a page                                                             */
  /* ================================================================== */
  const renderPage = (p: Page, i: number) => {
    const d = p.data || {};
    const keep = remember(i);
    switch (p.type) {
      case 'monthly':
        return (
          <Monthly fetch={fetch} L={L} onFy={() => openFy('sales')} init={d.sel} onMonth={(m) => keep({ sel: m })} version={ver('target', 'sales', 'collection')} onRefresh={() => bump('target', 'sales', 'collection')}
            onSales={(m, path, day) => push('sales', day ? { period: 'custom', from: day, to: day, path } : { period: 'custom', from: `${m}-01`, to: monthEnd(m), path })}
            onColl={(m, path) => push('coll', { period: 'custom', from: `${m}-01`, to: monthEnd(m), path })} />
        );
      case 'sales':
        return (
          <Drill load={loaders.sales} levels={['cat', 'art', 'party']} fmt={L} periodic init={d} onState={keep} recLbl="invoices" chartColor={C.bill}
            note="Invoices whose line item is Dress Material, Technical Textile or Sportswear. Category › design › party › invoices." />
        );
      case 'prod':
        return (
          <Drill load={loaders.prod} levels={['cat', 'art', 'shed']} fmt={secM} periodic init={d} onState={keep} recLbl="entries" chartColor={C.prod}
            note="Checked metres of DTS designs on any loom. Category › design › shed › machine / beam. Tap a point on the graph to narrow to that day. Ranges longer than 62 days are shown shed-wise without the machine level." />
        );
      case 'coll':
        return (
          <Drill load={loaders.coll} levels={['exec', 'party', 'art']} fmt={L} periodic init={d} onState={keep} recLbl="receipts" chartColor={C.exec}
            note="The part of each receipt that is adjusted against a DTS bill, on the receipt's clearing date — so a receipt appears once per bill it cleared. Executive › party › design › bills. On-account receipts belong to no bill and are not counted." />
        );
      case 'out':
        return (
          <Drill load={loaders.out} levels={['exec', 'party', 'art']} fmt={L} periodic={false} init={d} onState={keep} recLbl="open bills"
            note="The open balance of DTS bills as on today. A bill that also carries other categories counts by the DTS share of its amount. Executive › party › design › bills." />
        );
      case 'short':
        return (
          <Drill load={loaders.short} levels={['cat', 'art', 'mc']} fmt={secM} periodic init={{ period: 'fy', ...d }} onState={keep} recLbl="beams" chartColor={C.over}
            auxFmt={(v, w) => `${pctTxt(v, w)} of ${Q(w)} warped`}
            note="Completed beams of DTS designs (last taka entered) — warp issued minus checked metres, the same figures as Reports › Beam Shortage. Beams over 3% short are marked." />
        );
      case 'fy':
        return <FYPage metric={(d.kind as FyMetric) || 'sales'} fetch={fetch} exp={expSrc} L={L} backRef={pageBack} />;
      case 'exp':
        return (
          <DtsExpensePage src={expSrc} loadRows={loadPickRows} init={d.sel} onMonth={(m) => keep({ sel: m })} onFy={() => openFy('dtscost')}
            goExpense={() => router.push('/new/(tabs)/reports/expense' as any)} scrollTop={() => scroll.current?.scrollTo({ y: 0, animated: true })} />
        );
      case 'cost':
        return (
          <Drill load={loaders.cost} levels={['cat', 'art', 'shed']} fmt={L} periodic init={d} onState={keep} recLbl="entries" chartColor={T.copper}
            auxFmt={(v, a) => `₹${a > 0 ? (v / a).toFixed(4) : '0'}/pick·m`}
            note="Every DTS roll costed at the Expense module's rate (electricity + wages + stores + maintenance + other, per pick) of the section whose machine wove it × the design's picks × metres. Category › design › shed › entries." />
        );
      case 'outs':
        return (
          <>
            <MLink icon="🧶" color={C.out} title="Yarn at job workers" sub={`${secKg(jobYarnBal)} · issued, consumed and balance by job worker and yarn`} onPress={() => push('outsl')} />
            <Drill load={loaders.outs} levels={['worker', 'art']} fmt={secM} periodic init={d} onState={keep} recLbl="inwards" chartColor={C.out}
              auxFmt={(_v, a) => `${L(a)} charges`}
              note="Fabric received from job workers for DTS items, on the inward date: job inwards that have no grey outward behind them (dyeing-mill inwards are in the Mill Hub). Charges are the job amount of the inward. Job worker › design › inwards." />
          </>
        );
      case 'outsl':
        return (
          <Drill load={loaders.outsl} levels={['worker']} fmt={secKg} periodic={false} init={d} onState={keep} recLbl="yarns"
            note="The yarn job orders of every job worker who delivered DTS fabric this year: issued − consumed − shortage − wastage = balance, as the ERP carries them. Yarn is common to both sections and a yarn challan is not tied to a design, so this is each worker's whole yarn account. A negative balance means more yarn was consumed than issued." />
        );
      case 'stock':
        return <StockPage kinds={stockKinds} onKind={(key) => push('stockk', { kind: key })} />;
      case 'stockk': {
        const k = stockKinds.find((x) => x.key === d.kind) || stockKinds[0];
        if (!k) return null;
        return (
          <Drill load={() => Promise.resolve({ items: k.items })} levels={k.key === 'jwyarn' ? ['worker'] : ['where', 'art']} fmt={k.fmt} periodic={false}
            init={d} onState={(st2) => keep({ ...st2, kind: k.key })} recLbl={k.unit}
            note={`${k.lbl} — DTS only. ${k.key === 'jwyarn' ? 'Job worker › yarns.' : 'Location › design › records.'}`} />
        );
      }
      case 'pay':
        return (
          <Drill load={loaders.pay} levels={['vendor']} fmt={L} periodic init={d} onState={keep} recLbl="bill payments" chartColor={PAY_COL}
            note="The part of each cleared payment that is adjusted against a purchase bill carrying DTS items (job work, greige, processing). Yarn bills serve both sections and are left out. Vendor › bills." />
        );
    }
  };

  /* ================================================================== */
  /* widgets                                                            */
  /* ================================================================== */
  const salesToday = sum(onDay(sales.items, today)), salesMonth = sum(sales.items);
  const collToday = sum(onDay(coll.items, today)), collMonth = sum(coll.items);
  const bookedMonth = sum(booked.items);

  /* Target card (4.2): ring = SO % and Billed % of the DTS sales target · collection bar · tap -> the two breakdowns */
  const [tgtOpen, setTgtOpen] = useState(false);
  const tg = tgt.meta as Partial<DtsTarget>;
  const salesTgt = num(tg.target), collTgt = num(tg.collection_target), hasTgt = salesTgt > 0;
  const pctOf = (a: number, t: number) => (t > 0 ? (a / t) * 100 : 0);
  const tgtBusy = tgt.loading || booked.loading || sales.loading;
  const brk = (label: string, value: string, color?: string) => (
    <View key={label} style={s.tgtBrkRow}>
      <Text style={s.tgtBrkLabel}>{label}</Text>
      <Text style={[ui.rowNum, { fontWeight: '700', color: color || C.ink }]}>{value}</Text>
    </View>
  );
  const wTarget = can('target') || can('sales') ? (
    <View key="target" style={ui.card}>
      <View style={s.tgtHead}>
        <Pressable onPress={() => setTgtOpen((v) => !v)} accessibilityRole="button" accessibilityLabel={tgtOpen ? 'Hide the target breakdown' : 'Show the target breakdown'} style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.tgtTitle} numberOfLines={1}>{mLong(ym)} Target · DTS</Text>
          <Text style={s.tgtSub}>{monthDaysLeft(today)} days remaining</Text>
        </Pressable>
        {can('sales') ? <FYBtn dark onPress={() => openFy('sales')} /> : null}
        <RefreshBtn onPress={() => bump('target', 'booked', 'sales', 'collection')} label="Refresh the target card" light />
      </View>
      <Pressable onPress={() => setTgtOpen((v) => !v)} accessibilityRole="button" style={s.tgtBody}>
        <TargetRing so={hasTgt ? pctOf(bookedMonth, salesTgt) : null} billed={hasTgt ? pctOf(salesMonth, salesTgt) : null} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.kicker}>Sales{hasTgt ? ` · target ${L(salesTgt)}` : ''}</Text>
          <Text style={s.tgtLine}>SO booked <Text style={{ color: T.copper, fontWeight: '700' }}>{can('target') ? (booked.loading ? '…' : L(bookedMonth)) : '—'}</Text></Text>
          <Text style={s.tgtLine}>Billed <Text style={{ color: C.bill, fontWeight: '700' }}>{can('sales') ? (sales.loading ? '…' : L(salesMonth)) : '—'}</Text></Text>
          <Text style={[s.kicker, { marginTop: 8 }]}>Collection</Text>
          <View style={s.tgtBar}><View style={{ width: `${Math.min(100, pctOf(collMonth, collTgt))}%`, height: '100%', backgroundColor: C.today, borderRadius: 4 }} /></View>
          <Text style={s.tgtLine}>
            <Text style={{ color: C.today, fontWeight: '700' }}>{can('collection') ? (coll.loading ? '…' : L(collMonth)) : '—'}</Text>
            {collTgt > 0 ? <Text style={{ color: C.mut }}> / {L(collTgt)} · {Math.round(pctOf(collMonth, collTgt))}%</Text> : null}
          </Text>
        </View>
        <Text style={{ fontSize: 10, color: C.faint }}>{tgtOpen ? '▴' : '▾'}</Text>
      </Pressable>
      {tgtOpen ? (
        <View style={s.tgtBrk}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Text style={ui.secHead}>Sales</Text>
            {brk('Target', hasTgt ? L(salesTgt) : '—')}
            {brk('SO confirmed', L(bookedMonth), T.copper)}
            {brk('Billed', L(salesMonth), C.bill)}
            {brk('Gap to target', hasTgt ? L(Math.max(0, salesTgt - salesMonth)) : '—', hasTgt && salesMonth < salesTgt ? C.over : C.today)}
          </View>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Text style={ui.secHead}>Collection</Text>
            {brk('Target', collTgt > 0 ? L(collTgt) : '—')}
            {brk('Collected', L(collMonth), C.today)}
            {brk('Pending', collTgt > 0 ? L(Math.max(0, collTgt - collMonth)) : '—', collTgt > 0 && collMonth < collTgt ? C.over : C.today)}
          </View>
        </View>
      ) : null}
      {booked.error ? <View style={{ paddingHorizontal: 12 }}><StateBox error={booked.error} onRetry={booked.reload} minHeight={40} /></View> : null}
      {tgt.error ? <View style={{ paddingHorizontal: 12 }}><StateBox error={tgt.error} onRetry={tgt.reload} minHeight={40} /></View> : null}
      <Text style={s.tgtFoot}>
        {tgtBusy ? 'Loading…' : hasTgt
          ? `DTS target = company billing target ${L(num(tg.company_target))} × DTS share ${(num(tg.dts_share) * 100).toFixed(1)}% of this year's billing · collection target = 92% of it`
          : `No billing target is entered for ${mLong(ym)} in Monthly Sales Target — only actual figures are shown`}
      </Text>
    </View>
  ) : null;

  const wMonthly = can('target') ? (
    <MLink key="monthly" icon="📈" color={C.owner} title="Monthly Report" sub="DTS · target vs actual · by month" onPress={() => push('monthly')} />
  ) : null;

  const salesLines = selS ? onDay(sales.items, selS) : sales.items;
  const wSales = can('sales') ? (
    <Widget key="sales" onRefresh={() => bump('sales')} icon="🧵" title="Sales" accent={C.owner} time="live" onTitle={() => push('sales', { period: 'month' })}
      right={<FYBtn dark onPress={() => openFy('sales')} />}>
      {sales.loading || sales.error ? <StateBox loading={sales.loading} error={sales.error} onRetry={sales.reload} /> : (
        <>
          <TotRow items={[{ label: 'Today', value: L(salesToday), color: C.today }, { label: 'This month', value: L(salesMonth) }]} />
          <Spark from={mFrom} to={mTo} entries={sales.items} color={C.owner} fmt={L} sel={selS} onPick={setSelS} />
          {selS ? <SecHead right={<DayNote sel={selS} onClear={() => setSelS(null)} />}>Invoices of {fmtDY(selS)}</SecHead> : null}
          <DashSales lines={salesLines} L={L} onFull={(m, v) => push('sales', dayInit(selS, [{ k: m, v }]))} />
        </>
      )}
    </Widget>
  ) : null;

  /* production: Section A / Section B machines, then the sheds of each */
  const prodDay = selP ? onDay(prod.items, selP) : onDay(prod.items, today);
  const shedRows = useMemo(() => {
    const aKeys: string[] = Array.isArray(prod.meta.section_a_sheds) ? prod.meta.section_a_sheds : ['WJ', 'S230'];
    const catalog: { key: string; label: string }[] = Array.isArray(prod.meta.shed_catalog) ? prod.meta.shed_catalog : [];
    const sheds: Record<'A' | 'B', string[]> = { A: [], B: [] };
    catalog.forEach((c) => sheds[aKeys.includes(String(c.key)) ? 'A' : 'B'].push(String(c.label)));
    prod.items.forEach((x) => {
      const k = x.sec === 'A' ? 'A' : 'B';
      if (!sheds[k].includes(x.d.shed)) sheds[k].push(x.d.shed);
    });
    return sheds;
  }, [prod.items, prod.meta]);
  const wProd = can('production') ? (
    <Widget key="prod" onRefresh={() => bump('production')} icon="⚙️" title="Production" accent={C.prod} time="live" onTitle={() => push('prod', { period: 'month' })}
      right={<FYBtn dark onPress={() => openFy('production')} />}>
      {prod.loading || prod.error ? <StateBox loading={prod.loading} error={prod.error} onRetry={prod.reload} /> : (
        <>
          <TotRow items={[{ label: 'Today', value: M(sum(onDay(prod.items, today))), color: C.prod }, { label: 'This month', value: M(sum(prod.items)) }]} />
          <Spark from={mFrom} to={mTo} entries={prod.items} color={C.prod} fmt={M} sel={selP} onPick={setSelP} />
          {selP ? <SecHead right={<DayNote sel={selP} onClear={() => setSelP(null)} />}>DTS on {fmtDY(selP)}</SecHead> : null}
          <ListRow head left="Woven on" a={dayLbl(selP)} b="Month" />
          {(['A', 'B'] as const).map((k) => (
            <React.Fragment key={k}>
              <ListRow
                left={<TwoLine title={SEC_MACH[k].lbl} sub={SEC_MACH[k].sub} bold />}
                a={M(sum(prodDay.filter((x) => x.sec === k)))} aColor={C.prod}
                b={M(sum(prod.items.filter((x) => x.sec === k)))}
                onPress={() => push('prod', dayInit(selP, [{ k: 'secm', v: SEC_MACH[k].lbl }]))}
              />
              {shedRows[k].map((shed) => (
                <ListRow
                  key={shed}
                  left={<TwoLine title={shed} indent />}
                  a={M(sum(prodDay.filter((x) => x.d.shed === shed)))} aColor={C.prod}
                  b={M(sum(prod.items.filter((x) => x.d.shed === shed)))}
                  onPress={() => push('prod', dayInit(selP, [{ k: 'shed', v: shed }]))}
                />
              ))}
            </React.Fragment>
          ))}
          <SecHint>Checked metres of DTS designs by the machines that wove them — other categories on the same looms are not counted.</SecHint>
        </>
      )}
    </Widget>
  ) : null;

  const wSamples = can('samples') ? <DtsSamples key="samples" prptype={prptype} patterns={patterns} version={version} /> : null;

  const collDay = selC ? onDay(coll.items, selC) : onDay(coll.items, today);
  const collExec = useMemo(() => {
    const g: Record<string, number> = {};
    coll.items.forEach((x) => { g[x.d.exec] = (g[x.d.exec] || 0) + num(x.v); });
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  }, [coll.items]);
  const wColl = can('collection') ? (
    <Widget key="coll" onRefresh={() => bump('collection')} icon="💰" title="Payment Collection" accent={C.exec} time="live" onTitle={() => push('coll', { period: 'month' })}>
      {coll.loading || coll.error ? <StateBox loading={coll.loading} error={coll.error} onRetry={coll.reload} /> : (
        <>
          <TotRow items={[{ label: 'Today', value: L(collToday), color: C.today }, { label: 'This month', value: L(collMonth) }]} />
          <Spark from={mFrom} to={mTo} entries={coll.items} color={C.exec} fmt={L} sel={selC} onPick={setSelC} />
          {selC ? <SecHead right={<DayNote sel={selC} onClear={() => setSelC(null)} />}>Collected on {fmtDY(selC)}</SecHead> : null}
          <ListRow head left="Executive" a={dayLbl(selC)} b="Total" />
          {collExec.map(([name, total]) => (
            <ListRow
              key={name}
              left={<ExecName name={name} />}
              a={L(sum(collDay.filter((x) => x.d.exec === name)))} aColor={C.today}
              b={L(total)}
              onPress={() => push('coll', dayInit(selC, [{ k: 'exec', v: name }]))}
            />
          ))}
          {!collExec.length ? <SecEmpty>No receipts against DTS bills this month.</SecEmpty> : null}
          <SecHint>Receipts against DTS bills, settled bill by bill like the Outstanding module, on their clearing date.</SecHint>
        </>
      )}
    </Widget>
  ) : null;

  const payList = selPay ? onDay(pay.items, selPay) : onDay(pay.items, today);
  const payVendors = useMemo(() => {
    const g: Record<string, { k: string; v: number; n: number }> = {};
    payList.forEach((x) => {
      const r = g[x.d.vendor] || (g[x.d.vendor] = { k: x.d.vendor, v: 0, n: 0 });
      r.v += num(x.v);
      r.n++;
    });
    return Object.values(g).sort((a, b) => b.v - a.v);
  }, [payList]);
  const wPay = can('payments_made') ? (
    <Widget key="pay" onRefresh={() => bump('payments_made')} icon="💸" title="Payments Made" accent={PAY_COL} time="from accounts" onTitle={() => push('pay', { period: 'month' })}
      right={<FYBtn dark onPress={() => openFy('payments')} />}>
      {pay.loading || pay.error ? <StateBox loading={pay.loading} error={pay.error} onRetry={pay.reload} /> : (
        <>
          <TotRow items={[{ label: 'Today', value: L(sum(onDay(pay.items, today))), color: C.today }, { label: 'This month', value: L(sum(pay.items)) }]} />
          <Spark from={mFrom} to={mTo} entries={pay.items} color={PAY_COL} fmt={L} sel={selPay} onPick={setSelPay} />
          <SecHead right={<DayNote sel={selPay} onClear={() => setSelPay(null)} />}>
            {selPay ? fmtDY(selPay) : 'Today'} · {pl(payVendors.length, 'vendors')}
          </SecHead>
          {payVendors.slice(0, 5).map((r) => (
            <ListRow
              key={r.k}
              left={<TwoLine title={r.k} sub={pl(r.n, 'bills')} />}
              b={L(r.v)}
              onPress={() => push('pay', selPay ? { period: 'custom', from: selPay, to: selPay, path: [{ k: 'vendor', v: r.k }] } : { period: 'today', path: [{ k: 'vendor', v: r.k }] })}
            />
          ))}
          {!payVendors.length ? <SecEmpty>{selPay ? 'No payments on this day.' : 'No payments today.'}</SecEmpty> : null}
          {payVendors.length > 5 ? (
            <Pressable onPress={() => push('pay', selPay ? { period: 'custom', from: selPay, to: selPay } : { period: 'today' })} accessibilityRole="button" hitSlop={6}>
              <Text style={[s.viewFull, { color: PAY_COL }]}>+{payVendors.length - 5} more ›</Text>
            </Pressable>
          ) : null}
          <SecHint>Payments adjusted against purchase bills that carry DTS items; yarn bills serve both sections and are left out. Tap a day on the graph for its payments.</SecHint>
        </>
      )}
    </Widget>
  ) : null;

  const outT = sum(outs.items), outOd = sum(outs.items.filter((x) => x.warn));
  const outExec = useMemo(() => {
    const g: Record<string, number> = {};
    outs.items.forEach((x) => { g[x.d.exec] = (g[x.d.exec] || 0) + num(x.v); });
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  }, [outs.items]);
  const wOut = can('outstanding') ? (
    <Widget key="out" onRefresh={() => bump('outstanding')} icon="⏳" title="Outstanding" accent={C.out} onTitle={() => push('out')}>
      {outs.loading || outs.error ? <StateBox loading={outs.loading} error={outs.error} onRetry={outs.reload} /> : (
        <>
          <View style={{ paddingTop: 4, paddingBottom: 8 }}>
            <Text style={ui.totLabel}>Total due</Text>
            <Text style={s.outTotal}>{L(outT)}</Text>
            {outOd > 0 ? <Text style={s.outOver}>{L(outOd)} overdue</Text> : null}
          </View>
          <ListRow head left="Executive" b="Outstanding" />
          {outExec.map(([name, v]) => (
            <ListRow key={name} left={<ExecName name={name} />} b={L(v)} bColor={C.over} onPress={() => push('out', { path: [{ k: 'exec', v: name }] })} />
          ))}
          {!outExec.length ? <SecEmpty>No open DTS bills.</SecEmpty> : null}
          {outs.meta.reconciliation?.available ? (
            <View style={s.tie}>
              <Text style={ui.secHead}>Against the Dashboard</Text>
              {([
                ['Dashboard · Outstanding card (all categories)', outs.meta.reconciliation.dashboard_total, C.ink],
                ['Open bills · all categories', outs.meta.reconciliation.all_open_bills, C.ink],
                ['  of which DTS bills (this card)', outs.meta.reconciliation.dts_open_bills, C.over],
                ['  other categories', outs.meta.reconciliation.other_open_bills, C.mut],
                ['Unadjusted receipts / credits', outs.meta.reconciliation.unadjusted_and_other, C.mut],
              ] as [string, number, string][]).map(([label, value, color]) => (
                <View key={label} style={s.tieRow}>
                  <Text style={s.tieLabel} numberOfLines={1}>{label}</Text>
                  <Text style={[ui.rowNum, { color }]}>{L(value)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <SecHint>The open balance of DTS bills as on today — a part of the Dashboard's Outstanding, not equal to it.</SecHint>
        </>
      )}
    </Widget>
  ) : null;

  const fyFrom = fyStartOf(today);
  const shortFy = useMemo(() => short.items.filter((x) => x.date >= fyFrom), [short.items, fyFrom]);
  const sW = sum(shortFy, 'aux'), sS = sum(shortFy);
  const shortTop = useMemo(() => {
    const g: Record<string, { k: string; cat: string; v: number; aux: number; n: number }> = {};
    shortFy.forEach((x) => {
      const r = g[x.d.art] || (g[x.d.art] = { k: x.d.art, cat: x.d.cat, v: 0, aux: 0, n: 0 });
      r.v += num(x.v);
      r.aux += num(x.aux);
      r.n++;
    });
    return Object.values(g).sort((a, b) => b.v - a.v).slice(0, 5);
  }, [shortFy]);
  const wShort = can('beam_shortage') ? (
    <Widget key="short" onRefresh={() => bump('beam_shortage')} icon="⚠️" title="Beam Shortage" accent={C.over} onTitle={() => push('short', { period: 'fy' })}>
      {short.loading || short.error ? <StateBox loading={short.loading} error={short.error} onRetry={short.reload} /> : (
        <>
          <TotRow items={[{ label: 'Shortage · FY to date', value: pctTxt(sS, sW), color: sS / (sW || 1) > 0.03 ? C.over : C.today }, { label: 'Completed beams', value: String(shortFy.length) }]} />
          <SecHead>By design · FY to date</SecHead>
          {shortTop.map((r) => (
            <ListRow
              key={r.k}
              left={<TwoLine title={r.k} sub={`${pctTxt(r.v, r.aux)} of ${Q(r.aux)} warped · ${pl(r.n, 'beams')}`} />}
              b={secM(r.v)} bColor={r.v / (r.aux || 1) > 0.03 ? C.over : C.ink}
              onPress={() => push('short', { period: 'fy', path: [{ k: 'cat', v: r.cat }, { k: 'art', v: r.k }] })}
            />
          ))}
          {!shortFy.length ? <SecEmpty>No completed DTS beams this year.</SecEmpty> : null}
          <SecHint>Warp issued minus checked metres on completed DTS beams.</SecHint>
        </>
      )}
    </Widget>
  ) : null;

  /* ---- DTS expense (top card) ---- */
  const wExp = can('expense') ? (
    <DtsExpCard key="exp" src={expSrc} rows={picks.items} loading={picks.loading} error={picks.error} onRetry={picks.reload} onOpen={() => push('exp')} onRefresh={() => bump('pickmetres', 'expense')} onFy={() => openFy('dtscost')} />
  ) : null;

  /* ---- outsourcing: fabric received from job workers ---- */
  const [selO, setSelO] = useState<string | null>(null);
  const jobYarnBal = sum(jobYarn.items.filter((x) => x.v > 0));
  const jobSel = selO ? onDay(jobIn.items, selO) : jobIn.items;
  const jobWorkers = useMemo(() => {
    const g: Record<string, { k: string; m: number; amt: number; bal: number }> = {};
    const row = (k: string) => g[k] || (g[k] = { k, m: 0, amt: 0, bal: 0 });
    jobSel.forEach((x) => { const r = row(x.d.worker); r.m += num(x.v); r.amt += num(x.aux); });
    jobYarn.items.forEach((x) => { row(x.d.worker).bal += num(x.v); });
    return Object.values(g).sort((a, b) => b.m - a.m || b.bal - a.bal);
  }, [jobSel, jobYarn.items]);
  const wOuts = can('outsourcing') ? (
    <Widget key="outs" onRefresh={() => bump('outsourcing', 'outsourcing_yarn')} icon="🧶" title="Outsourcing" accent={C.out} time="live" onTitle={() => push('outs', { period: 'month' })}
      right={<FYBtn dark onPress={() => openFy('jobwork')} />}>
      {jobIn.loading || jobIn.error ? <StateBox loading={jobIn.loading} error={jobIn.error} onRetry={jobIn.reload} /> : (
        <>
          <TotRow items={[
            { label: 'Received · month', value: secM(sum(jobIn.items)), color: C.today },
            { label: 'Charges · month', value: L(sum(jobIn.items, 'aux')) },
            { label: 'Yarn at job workers', value: jobYarn.loading ? '…' : jobYarn.error ? '—' : secKg(jobYarnBal), color: C.out, onPress: () => push('outsl') },
          ]} />
          <Spark from={mFrom} to={mTo} entries={jobIn.items} color={C.out} fmt={secM} sel={selO} onPick={setSelO} />
          <SecHead right={<DayNote sel={selO} onClear={() => setSelO(null)} />}>{selO ? fmtDY(selO) : 'This month'} · by job worker</SecHead>
          {jobWorkers.map((r) => (
            <ListRow
              key={r.k}
              left={<TwoLine title={r.k} sub={`${L(r.amt)} charges · yarn there ${secKg(r.bal)}`} />}
              b={secM(r.m)}
              onPress={() => push('outs', dayInit(selO, [{ k: 'worker', v: r.k }]))}
            />
          ))}
          {!jobWorkers.length ? <SecEmpty>No DTS fabric received from job workers this month.</SecEmpty> : null}
          {jobYarn.error ? <StateBox error={jobYarn.error} onRetry={jobYarn.reload} minHeight={36} /> : null}
          <SecHint>Fabric received from job workers for DTS items. Job worker › design › inwards; yarn is each worker's whole yarn account (yarn is common to both sections).</SecHint>
        </>
      )}
    </Widget>
  ) : null;

  /* ---- stock: internal and external, never added together ---- */
  const stockKinds: StockKind[] = useMemo(() => {
    const kinds: StockKind[] = [
      { key: 'greige', side: 'in', lbl: 'Greige fabric', fmt: secM, items: fabric.greige, unit: 'stock lines', loading: fabric.loading, error: fabric.error, reload: fabric.reload },
      { key: 'finished', side: 'in', lbl: 'Finished fabric', fmt: secM, items: fabric.finished, unit: 'stock lines', loading: fabric.loading, error: fabric.error, reload: fabric.reload },
      { key: 'mill', side: 'out', lbl: 'Greige at dyeing mills', fmt: secM, items: mill.items, unit: 'challans', loading: mill.loading, error: mill.error, reload: mill.reload },
    ];
    if (rights && rights.outsourcing) {
      kinds.push({
        key: 'jwyarn', side: 'out', lbl: 'Yarn at job workers', fmt: secKg, items: jobYarn.items.filter((x) => Math.abs(x.v) > 0.5), unit: 'yarn lines',
        loading: jobYarn.loading, error: jobYarn.error, reload: jobYarn.reload, note: 'whole account',
      });
    }
    return kinds;
  }, [fabric, mill.items, mill.loading, mill.error, mill.reload, jobYarn.items, jobYarn.loading, jobYarn.error, jobYarn.reload, rights]);
  const stockRow = (k: StockKind) => (
    <ListRow
      key={k.key}
      left={k.lbl}
      b={k.loading ? '…' : k.error ? 'retry' : k.items.length ? k.fmt(sum(k.items)) : '—'} bColor={k.error ? C.over : C.ink}
      onPress={k.error ? k.reload : k.items.length ? () => push('stockk', { kind: k.key }) : undefined}
    />
  );
  const wStock = can('stock') ? (
    <Widget key="stock" onRefresh={() => bump('mill_stock', 'outsourcing_yarn', 'fabric')} icon="▦" title="Stock" accent={C.owner} onTitle={() => push('stock')}>
      <SecHead>Internal</SecHead>
      {stockKinds.filter((k) => k.side === 'in').map(stockRow)}
      <SecHead>External · kept apart</SecHead>
      {stockKinds.filter((k) => k.side === 'out').map(stockRow)}
      <SecHint>DTS designs only. Internal and external stock are never added together.</SecHint>
    </Widget>
  ) : null;

  const widgets = [wExp, wTarget, wMonthly, wSales, wProd, wSamples, wColl, wPay, wOut, wShort, wOuts, wStock];
  const names = ['exp', 'target', 'monthly', 'sales', 'prod', 'samples', 'coll', 'pay', 'out', 'short', 'outs', 'stock'];
  const byName = Object.fromEntries(names.map((n, i) => [n, widgets[i]]));
  /* the owner dashboard's column plans: 1 column on a phone, 2 on a tablet, 3 on a desktop */
  const LAYOUT: Record<number, string[][]> = {
    1: [names],
    2: [['exp', 'target', 'monthly', 'sales', 'pay', 'stock'], ['prod', 'samples', 'coll', 'out', 'short', 'outs']],
    3: [['exp', 'target', 'monthly', 'sales'], ['prod', 'samples', 'coll', 'outs'], ['pay', 'out', 'short', 'stock']],
  };

  /* ================================================================== */
  /* render                                                             */
  /* ================================================================== */
  const top = stack.length ? stack[stack.length - 1] : null;
  const anyRight = rights ? Object.values(rights).some(Boolean) : false;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {can('expense') ? <ExpenseLoader key={`exp${ver('expense')}`} token={token} API={API} onData={setExpSrc} /> : null}
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: pad, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.copper} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
          {metaError ? (
            <View style={[ui.card, { padding: 16 }]}><StateBox error={metaError} onRetry={refresh} /></View>
          ) : !rights ? (
            <View style={[ui.card, { padding: 16 }]}><StateBox loading /></View>
          ) : top ? (
            <View style={{ width: '100%', maxWidth: 860, alignSelf: 'center' }}>
              <View style={s.pageHead}>
                <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" style={s.backBtn} hitSlop={6}>
                  <Text style={{ fontSize: 18, color: C.ink, lineHeight: 20 }}>‹</Text>
                </Pressable>
                <View style={s.pageCrumbs}>
                  <Pressable onPress={home} hitSlop={6} accessibilityRole="button"><Text style={[s.pageCrumb, { color: DTS.color }]}>DTS</Text></Pressable>
                  {stack.map((p, i) => (
                    <React.Fragment key={`${p.type}${i}`}>
                      <Text style={{ color: C.faint }}>›</Text>
                      <Pressable onPress={() => setStack(stack.slice(0, i + 1))} disabled={i === stack.length - 1} hitSlop={6} accessibilityRole="button">
                        <Text style={[s.pageCrumb, { color: i === stack.length - 1 ? C.ink : DTS.color }]}>{PAGE_LBL[p.type]}</Text>
                      </Pressable>
                    </React.Fragment>
                  ))}
                </View>
                {PAGE_FY[top.type] && top.type !== 'exp' && top.type !== 'monthly' ? <FYBtn onPress={() => openFy(PAGE_FY[top.type]!)} big /> : null}
                <RefreshBtn onPress={() => bump(...PAGE_SECTIONS[top.type])} label={`Refresh ${PAGE_LBL[top.type]}`} text="Refresh" />
              </View>
              <View key={`${top.type}|${stack.length}|${ver(...PAGE_SECTIONS[top.type])}`}>{renderPage(top, stack.length - 1)}</View>
            </View>
          ) : !anyRight ? (
            <View style={[ui.card, { padding: 16 }]}>
              <Text style={s.noRight}>No DTS widget is allowed for your login. Ask an administrator to allow them under Production → DTS in the Permission Registry.</Text>
            </View>
          ) : (
            <>
              <View style={s.topBar}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.topTitle} numberOfLines={1}>DTS · {DTS.long}</Text>
                  <Text style={s.topSub}>Updated {updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · ↻ on a card refreshes only that card</Text>
                </View>
                <RefreshBtn onPress={refresh} label="Refresh everything" text="Refresh all" />
              </View>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                {(LAYOUT[cols] || LAYOUT[1]).map((col, i) => (
                  <View key={i} style={{ flex: 1, minWidth: 0 }}>
                    {col.map((n) => byName[n])}
                  </View>
                ))}
              </View>
              <Text style={s.foot}>
                Counted as DTS ({pl(cats.length, 'items')}): {cats.length ? cats.map((c) => c.name).join(' · ') : 'no item name matches yet'}.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  salesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, minHeight: 40 },
  salesOpen: { paddingLeft: 16, paddingBottom: 8, marginLeft: 4, borderLeftWidth: 2, borderLeftColor: `${T.nav}33` },
  salesSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  salesTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 2, borderTopWidth: 1, borderTopColor: T.border, marginTop: 2 },
  viewFull: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: T.blue, paddingTop: 5, paddingBottom: 2 },

  tgtHead: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.nav, paddingHorizontal: 14, paddingVertical: 10 },
  tgtTitle: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: '#fff' },
  tgtSub: { fontFamily: FONT, fontSize: 9, color: '#fff', opacity: 0.85 },
  tgtBody: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12 },
  tgtLine: { fontFamily: FONT, fontSize: 11.5, color: C.ink, marginBottom: 3, fontVariant: ['tabular-nums'] },
  tgtFoot: { fontFamily: FONT, fontSize: 9.5, color: C.faint, paddingHorizontal: 14, paddingBottom: 10, lineHeight: 14 },
  tgtBar: { height: 7, borderRadius: 4, backgroundColor: T.hair, overflow: 'hidden', marginTop: 2, marginBottom: 4 },
  tgtBrk: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 14, paddingBottom: 10, paddingTop: 2, borderTopWidth: 1, borderTopColor: T.hair },
  tgtBrkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingVertical: 3 },
  tgtBrkLabel: { fontFamily: FONT, fontSize: 11, color: C.mut },
  kicker: { fontFamily: FONT, fontSize: 9, color: C.mut, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },

  outTotal: { fontFamily: FONT, fontSize: 22, fontWeight: '700', color: C.over, marginTop: 1, fontVariant: ['tabular-nums'] },
  outOver: { fontFamily: FONT, fontSize: 10, color: C.over, marginTop: 2, fontVariant: ['tabular-nums'] },
  tie: { marginTop: 8, paddingTop: 2, borderTopWidth: 1, borderTopColor: T.border },
  tieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingVertical: 3 },
  tieLabel: { fontFamily: FONT, fontSize: 10.5, color: C.mut, flex: 1 },

  monthHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: T.hair, minHeight: 44 },
  monthCol: { width: 76, textAlign: 'right' },
  monthBar: { height: 4, borderRadius: 3, backgroundColor: T.hair, marginTop: 5, overflow: 'hidden' },

  pageHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 9, borderWidth: 1, borderColor: T.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pageCrumbs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  pageCrumb: { fontFamily: FONT, fontSize: 12.5, fontWeight: '800' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  topTitle: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: T.ink },
  topSub: { fontFamily: FONT, fontSize: 10, color: T.muted, marginTop: 1 },
  mChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: T.border },
  mChipOn: { backgroundColor: T.nav, borderColor: T.nav },
  mChipText: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.mut },
  mHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  mRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: T.hair, minHeight: 40 },
  mCol: { minWidth: 78, textAlign: 'right' },
  noRight: { fontFamily: FONT, fontSize: 12.5, color: C.mut, lineHeight: 18 },
  foot: { fontFamily: FONT, fontSize: 10, color: C.faint, lineHeight: 15, paddingHorizontal: 4, paddingTop: 2 },
});
