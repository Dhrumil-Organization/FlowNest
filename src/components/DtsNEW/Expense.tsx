// FILE: src/components/DtsNEW/Expense.tsx
// DTS expense — the Expense module's figures applied to DTS production (the design's "DTS expense" maths).
//
//   cost of a DTS roll = its pick-metres (checked metres x design picks)
//                        x the per-pick cost of the SECTION whose machine wove it
//   Section A = Waterjet + S. Rapier 230 cm, Section B = M Weaves + S. Rapier 190 cm — each at its own rate.
//   DTS = the weighted average: combined expense / DTS pick-metres — never an average of the two rates.
//
// Nothing new is calculated for the rates: they are read from the Expense module itself
//   useExpenseData (same API calls as Reports > Expense & Production) -> buildExp -> xCurrent / abMonth
// so a DTS rupee here always uses the rate the Expense screen shows for that month (live month-to-date for the
// running month, the adjusted / frozen figure for a closed month).
// Pick-metres come from GET /api/getDtsDashboard?section=pickmetres (DtsDashboardController), which counts
// picks and machine groups exactly as the Expense module does.
//
// This file: the data hook, the month maths (dtsMonth) and the dashboard card. The page is ./ExpensePage.tsx.
import { useExpenseData } from '@/src/hooks/useExpenseData';
import { abMonth, buildExp, makeXGROUPS, xCr, xCurrent, xM, xR2, xR3 } from '@/src/screens/reports/expense/xCalc';
import * as xUi from '@/src/screens/reports/expense/xUi';
import { T } from '@/src/theme';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONT } from '../OwnerDashboardNEW/fonts';
import { FYBtn } from './Fy';
import { DTS, DtsItem, mLbl, num } from './model';
import { RefreshBtn, st as ui, StateBox } from './ui';

const { XDonut } = xUi as any;

export const DTS_HEADS: [string, string][] = [['elec', 'Electricity'], ['sal', 'Salary'], ['store', 'Stores'], ['maint', 'Maintenance'], ['oth', 'Other']];
const HEAD_COL: Record<string, string> = { elec: '#3A568A', sal: '#9A4A10', store: '#2A6044', maint: '#652880', oth: '#C98A1A' };
export const dtsHeadCol = (h: string) => HEAD_COL[h] || T.copper;
/** API machine group -> the Expense module's group key */
export const GRP_KEY: Record<string, string> = { WJ: 'wjet', S230: 'sud230', MW: 'mw', S190: 'sud' };

export type DtsExpenseSource = {
  /** the Expense module's figures of the running month (null until loaded / when Section A-B is not active) */
  x: any | null;
  /** 'YYYY-MM' -> the Expense module's month figures (running month + the earlier months it has loaded) */
  byMonth: Record<string, any>;
  /** the months that have Section A / B figures, oldest first, the running month last */
  months: { key: string; x: any }[];
  /** the running month, 'YYYY-MM' */
  cur: string;
  loading: boolean;
  error: string;
};

/** The Expense module's own data, loaded the way the Expense screen loads it. */
export function useDtsExpense(token: string, API: string): DtsExpenseSource {
  const { months, states } = useExpenseData({ token, apiBase: API }) as any;
  const ymOf = (e: any) => `${e.calYear}-${String(e.calMonth + 1).padStart(2, '0')}`;
  const stamp = (months as any[]).map((e) => `${e.key}:${states[e.key]?.status}`).join('|');
  return useMemo(() => {
    const byMonth: Record<string, any> = {};
    let x: any = null;
    (months as any[]).forEach((e, i) => {
      const d = states[e.key]?.data;
      if (!d || d.section_ab_active !== true) return;
      try {
        const mo = i === 0 ? xCurrent(buildExp(e, d, null)) : abMonth(e, d);
        byMonth[ymOf(e)] = mo;
        if (i === 0) x = mo;
      } catch {
        /* a month the Expense module cannot compute is simply not available here */
      }
    });
    const cur = months[0] ? states[months[0].key] : null;
    const status = cur?.status;
    return {
      x,
      byMonth,
      months: Object.keys(byMonth).sort().map((key) => ({ key, x: byMonth[key] })),
      cur: months[0] ? ymOf(months[0]) : '',
      loading: !!cur && status !== 'done' && status !== 'error',
      error: status === 'error'
        ? String(cur?.error?.message || cur?.error || 'Unable to load the Expense module figures.')
        : status === 'done' && !x
          ? 'Section A / Section B costing is not active for this month in the Expense module.'
          : '',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);
}

/**
 * Six EARLIER months of the Expense module (the six months ending at `anchor`), for the DTS expense FY page.
 * Same API and same month maths as the Expense module (abMonth = the closed / adjusted figure of a month).
 * A month the Expense module has no Section A / B sheet for is simply not returned.
 */
export function useDtsExpenseWindow(token: string, API: string, anchor: Date): { byMonth: Record<string, any>; done: boolean } {
  const { months, states } = useExpenseData({ token, apiBase: API, anchor }) as any;
  const ymOf = (e: any) => `${e.calYear}-${String(e.calMonth + 1).padStart(2, '0')}`;
  const stamp = (months as any[]).map((e) => `${e.key}:${states[e.key]?.status}`).join('|');
  return useMemo(() => {
    const byMonth: Record<string, any> = {};
    let done = true;
    (months as any[]).forEach((e) => {
      const st = states[e.key];
      if (!st || (st.status !== 'done' && st.status !== 'error')) done = false;
      const d = st?.data;
      if (!d || d.section_ab_active !== true) return;
      try {
        byMonth[ymOf(e)] = abMonth(e, d);
      } catch {
        /* a month the Expense module cannot compute is simply not available */
      }
    });
    return { byMonth, done };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);
}

/** per-pick cost of a section in a month: { A, B } or null when the Expense module has no figure for it */
export const sectionRates = (src: DtsExpenseSource, ym: string): { A: number; B: number } | null => {
  const mo = src.byMonth[ym];
  if (!mo || !mo.A || !mo.B) return null;
  return { A: num(mo.A.totPick), B: num(mo.B.totPick) };
};

type Head = { amt: number; perPick: number };
export type DtsSec = {
  k: string; prod: number; pm: number; rolls: number; picks: number; n: number; totPick: number; cost: number; perM: number; mcDays: number;
  conv: number; ovh: number; elec: Head; sal: Head; store: Head; maint: Head; oth: Head; [h: string]: any;
};
export type DtsGroup = {
  k: string; lbl: string; n: number; sec: 'A' | 'B'; rng: string; m: number; pm: number; rolls: number; ppi: number; totPick: number; cost: number;
  elecPick: number; elec: number; elecPerM: number; perM: number;
};
export type DtsMonth = ReturnType<typeof dtsMonth>;

/** rolls behind a pick-metre row (a row is one day x design x machine group) */
export const rollsOf = (p: DtsItem) => num(p.x?.n) || 1;

/** the month's DTS figures against one Expense-module month (x): the design's dtsMonth, field for field */
export function dtsMonth(rows: DtsItem[], x: any, ym: string) {
  const ls = (rows || []).filter((p) => String(p.date).slice(0, 7) === ym);
  const counts = x?.counts || { wj: 30, s230: 10, mw: 48, s190: 38, A: 40, B: 86, T: 126 };
  const by: Record<'A' | 'B', { m: number; pm: number; n: number }> = { A: { m: 0, pm: 0, n: 0 }, B: { m: 0, pm: 0, n: 0 } };
  const gs: Record<string, { k: string; lbl: string; n: number; sec: 'A' | 'B'; rng: string; m: number; pm: number; rolls: number }> = {};
  (makeXGROUPS(counts) as any[]).forEach((g) => { gs[g.k] = { k: g.k, lbl: g.lbl, n: g.n, sec: g.sec, rng: g.rng, m: 0, pm: 0, rolls: 0 }; });
  ls.forEach((p) => {
    const s = by[p.sec === 'A' ? 'A' : 'B'];
    s.m += num(p.v); s.pm += num(p.pm); s.n += rollsOf(p);
    const g = gs[GRP_KEY[p.d.grp] || ''];
    if (g) { g.m += num(p.v); g.pm += num(p.pm); g.rolls += rollsOf(p); }
  });
  const days = x ? num(x.days) || 1 : 1, unitRate = x ? num(x.rate) : 0;
  const pp = (s: 'A' | 'B', h: string) => num(x?.[s]?.[h]?.perPick);
  const mk = (amt: number, pm: number): Head => ({ amt, perPick: pm > 0 ? amt / pm : 0 });
  const sec = (s: 'A' | 'B'): DtsSec => {
    const b = by[s], tp = num(x?.[s]?.totPick), n = s === 'A' ? counts.A : counts.B;
    const o: any = { k: s, prod: b.m, pm: b.pm, rolls: b.n, picks: b.m > 0 ? b.pm / b.m : 0, n, totPick: tp, cost: tp * b.pm };
    DTS_HEADS.forEach(([h]) => { o[h] = mk(pp(s, h) * b.pm, b.pm); });
    o.conv = pp(s, 'elec') + pp(s, 'sal');
    o.ovh = pp(s, 'store') + pp(s, 'maint') + pp(s, 'oth');
    o.perM = b.m > 0 ? o.cost / b.m : 0;
    /* machine time follows picks: the DTS share of the section's pick-metres x its machines x the days entered */
    o.mcDays = num(x?.[s]?.prod) > 0 && num(x?.[s]?.picks) > 0 ? (b.pm * n * days) / (num(x[s].prod) * num(x[s].picks)) : 0;
    return o;
  };
  const A = sec('A'), B = sec('B');
  const m = A.prod + B.prod, pm = A.pm + B.pm, total = A.cost + B.cost;
  const W: any = { k: 'T', prod: m, pm, rolls: A.rolls + B.rolls, picks: m > 0 ? pm / m : 0, n: counts.T, totPick: pm > 0 ? total / pm : 0, cost: total, perM: m > 0 ? total / m : 0, mcDays: A.mcDays + B.mcDays };
  DTS_HEADS.forEach(([h]) => { W[h] = mk(A[h].amt + B[h].amt, pm); });
  W.conv = pm > 0 ? (A.conv * A.pm + B.conv * B.pm) / pm : 0;
  W.ovh = pm > 0 ? (A.ovh * A.pm + B.ovh * B.pm) / pm : 0;
  const heads = DTS_HEADS.map(([h, lbl]) => ({ h, lbl, amt: W[h].amt as number, perPick: W[h].perPick as number }));
  const groups: DtsGroup[] = ['wjet', 'sud230', 'mw', 'sud'].map((k) => gs[k]).filter(Boolean).map((o) => {
    const s = o.sec === 'A' ? A : B;
    return {
      ...o, ppi: o.m > 0 ? o.pm / o.m : 0, totPick: s.totPick, cost: s.totPick * o.pm, elecPick: pp(o.sec, 'elec'), elec: pp(o.sec, 'elec') * o.pm,
      elecPerM: o.m > 0 ? (pp(o.sec, 'elec') * o.pm) / o.m : 0, perM: o.m > 0 ? (s.totPick * o.pm) / o.m : 0,
    };
  });
  const units = unitRate > 0 ? W.elec.amt / unitRate : 0;
  return {
    ym, key: ym, x, has: !!x, label: (x?.label as string) || mLbl(ym), days, unitRate, counts, rolls: ls, n: A.rolls + B.rolls, by, A, B, T: W as DtsSec, heads, groups,
    total, m, pm, perPick: W.totPick as number, ppi: W.picks as number, perM: W.perM as number, expA: A.cost, expB: B.cost, secRate: { A: A.totPick, B: B.totPick } as Record<'A' | 'B', number>,
    mcDays: W.mcDays as number, perMcDay: W.mcDays > 0 ? total / W.mcDays : 0, prodPerMcDay: W.mcDays > 0 ? m / W.mcDays : 0,
    units, unitsPerM: m > 0 ? units / m : 0, salPerM: m > 0 ? W.sal.amt / m : 0, storePerM: m > 0 ? W.store.amt / m : 0,
    shareA: total > 0 ? (A.cost / total) * 100 : 0, shareB: total > 0 ? (B.cost / total) * 100 : 0,
    prodShareA: m > 0 ? (A.prod / m) * 100 : 0, prodShareB: m > 0 ? (B.prod / m) * 100 : 0,
    /* the Expense module's field names, so its chart reads a DTS month like one of its own */
    totalProd: m, costPerPick: W.totPick as number,
  };
}

/* ------------------------------------------------------------------ */
/* dashboard card: THIS MONTH · DTS EXPENSE (the owner dashboard's production-cost card, for DTS) */
/* ------------------------------------------------------------------ */

export function DtsExpCard({
  src, rows, loading, error, onRetry, onOpen, onRefresh, onFy,
}: {
  src: DtsExpenseSource; rows: DtsItem[]; loading: boolean; error: string; onRetry: () => void; onOpen: () => void;
  onRefresh: () => void; onFy: () => void;
}) {
  const cx = useMemo(() => (src.x ? dtsMonth(rows, src.x, src.cur) : null), [rows, src.x, src.cur]);
  const busy = loading || src.loading, err = error || src.error;
  const comp = cx ? cx.heads.map((h) => ({ v: h.amt, color: dtsHeadCol(h.h) })).filter((c) => c.v > 0) : [];
  const cell = (l: string, v: string, c?: string, big?: boolean) => (
    <View style={{ width: '50%', paddingRight: 10, paddingBottom: 8 }}>
      <Text style={s.cellL}>{l}</Text>
      <Text style={[s.cellV, { fontSize: big ? 15 : 13, color: c || T.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{v}</Text>
    </View>
  );
  return (
    <View style={[ui.card, s.expCard]}>
      <View style={s.expHead}>
        <Pressable onPress={onOpen} disabled={!cx} style={{ flex: 1, minWidth: 0 }} accessibilityRole="button" accessibilityLabel="Open the DTS expense report">
          <Text style={s.expKicker} numberOfLines={1}>THIS MONTH · DTS EXPENSE</Text>
        </Pressable>
        <FYBtn onPress={onFy} />
        {cx ? <Pressable onPress={onOpen} hitSlop={8} accessibilityRole="button"><Text style={s.expLink}>Full report ›</Text></Pressable> : null}
        <RefreshBtn onPress={onRefresh} label="Refresh DTS expense" />
      </View>
      {err ? <StateBox error={err} onRetry={error ? onRetry : undefined} minHeight={50} /> : busy || !cx ? <StateBox loading minHeight={50} /> : (
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel="Open the DTS expense report">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <XDonut size={74} thick={11} seg={comp} center={{ top: xCr(cx.total), bot: cx.label }} />
            <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap' }}>
              {cell('COST / PICK', xR3(cx.perPick), T.copper, true)}
              {cell('AVG PICKS', cx.ppi.toFixed(1), undefined, true)}
              {cell('PRODUCTION', xM(cx.m))}
              {cell('COST / MC·DAY', xCr(cx.perMcDay))}
            </View>
          </View>
          <Text style={s.expFoot}>
            {DTS.long} on any machine · Section A {xR3(cx.secRate.A)}/pk on {xCr(cx.expA)} + Section B {xR3(cx.secRate.B)}/pk on {xCr(cx.expB)} · weighted {xR3(cx.perPick)}/pk · {xR2(cx.perM)}/m
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  expCard: { padding: 14, borderLeftWidth: 3, borderLeftColor: DTS.color },
  expHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  expKicker: { fontFamily: FONT, fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  expLink: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: T.copper },
  expFoot: { fontFamily: FONT, fontSize: 9.5, color: T.muted, marginTop: 9, lineHeight: 14 },
  cellL: { fontFamily: FONT, fontSize: 8.5, fontWeight: '800', color: T.muted, letterSpacing: 0.3 },
  cellV: { fontFamily: 'DMMono', fontWeight: '700' },
});
