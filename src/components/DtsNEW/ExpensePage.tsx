// FILE: src/components/DtsNEW/ExpensePage.tsx
// DTS · Expense — the Expense module's page (same layout, order, labels and drill-downs), fed only with DTS rolls.
// Built block for block from the design's DtsExpense page with the Expense module's own building blocks
// (src/screens/reports/expense/xUi.jsx · xCalc.js), so it looks and behaves like Reports > Expense & Production:
//
//   month chips + FY · month status · Section A / Section B cards · DTS weighted average · 6 KPIs ·
//   cost composition · production by machine group · Management summary (daily trend sheets) ·
//   Expense breakdown (utilities, salaries, production-linked, maintenance, other, final derived costing,
//   section conversion rates, cost by design) · Comparative analytics (6 months) · Past performance · Expense module.
//
// Every figure = DTS pick-metres of the month (GET /api/getDtsDashboard?section=pickmetres) x the Expense module's
// per-pick rate of the section whose machines wove them (./Expense.tsx -> dtsMonth). Every drill-down stays inside
// the selected month: scope -> design -> entries (an entry is one day x design x machine group of checked rolls).
import {
  makeXSEC, T, XC, xCr, xK0, xM, xPc, xR2, xR3,
} from '@/src/screens/reports/expense/xCalc';
import * as xUi from '@/src/screens/reports/expense/xUi';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { DTS_HEADS, DtsExpenseSource, GRP_KEY, DtsGroup, dtsHeadCol, dtsMonth, DtsMonth, DtsSec, rollsOf } from './Expense';
import { FYBtn } from './Fy';
import { DTS, DtsItem, fmtD, fmtDY, fyN, monthEnd, num, pl, SEC_MACH } from './model';
import { Spark, StateBox } from './ui';

/* the Expense module's building blocks are plain JS — used as they are, untyped */
const { card, Grid, MONO, PremiumTip, Sheet, XChart, XDonut, XKPI, XSection, XSecTag, XStat } = xUi as any;

type SecK = 'A' | 'B';
type SheetReq = { title: string; filter: ((p: DtsItem) => boolean) | null; sub?: string; head?: string; color?: string };

const R4 = (n: number) => `₹${num(n).toFixed(4)}`;
const kPm = (pm: number) => `${fyN(Math.round(pm / 1e3))} K`;
const lbl8 = { fontSize: 8.5, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: 0.4, fontWeight: '800' as const };
const cellS = { fontFamily: MONO, fontSize: 11, textAlign: 'right' as const };

/* ---- Management summary card (the Expense module's XSumCard) ---- */
function XSumCard({ title, d, accent, onTrend }: { title: string; d: DtsSec; accent: string; onTrend: () => void }) {
  const row = (l: string, b: { amt: number; perPick: number }, c: string) => (
    <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.alt }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c }} />
      <Text style={{ flex: 1, fontSize: 11.5, color: T.ink }}>{l}</Text>
      <Text style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, minWidth: 62, textAlign: 'right' }}>{xCr(b.amt)}</Text>
      <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 58, textAlign: 'right' }}>{`${xR3(b.perPick)}/pk`}</Text>
    </View>
  );
  return (
    <View style={[card, { padding: 12, borderTopWidth: 3, borderTopColor: accent, marginBottom: 10 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
        <Pressable onPress={onTrend} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: T.ink, flexShrink: 1 }}>{title}</Text>
          <View style={{ backgroundColor: accent + '18', borderWidth: 1, borderColor: accent + '55', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '800', color: accent }}>daily trend ›</Text>
          </View>
        </Pressable>
        <Text style={{ fontSize: 10, color: T.muted, fontFamily: MONO }}>{xM(d.prod)} · {num(d.picks).toFixed(0)} pk</Text>
      </View>
      {row('Electricity', d.elec, XC.elec)}
      {row('Salary', d.sal, XC.sal)}
      {row('Stores', d.store, XC.store)}
      {d.maint.amt > 0 ? row('Maintenance', d.maint, XC.fixed) : null}
      {d.oth.amt > 0 ? row('Other', d.oth, XC.other) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }}>
        <View>
          <Text style={{ fontSize: 8, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '800' }}>Cost / pick</Text>
          <Text style={{ fontFamily: MONO, fontSize: 14, fontWeight: '700', color: T.copper }}>{xR3(d.totPick)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 8, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '800' }}>Avg picks</Text>
          <Text style={{ fontFamily: MONO, fontSize: 14, fontWeight: '700', color: T.ink }}>{num(d.picks).toFixed(0)}</Text>
        </View>
      </View>
    </View>
  );
}

/* ---- Production vs cost / pick (the Expense module's XProdExpChart) ---- */
function XProdExpChart({ months }: { months: DtsMonth[] }) {
  const data = months.map((m) => ({ name: m.label.split(' ')[0], prod: +(m.totalProd / 1e5).toFixed(2), cpp: +num(m.costPerPick).toFixed(3) }));
  return (
    <XChart
      data={data}
      height={230}
      margin={{ top: 12, right: 6, left: -8, bottom: 2 }}
      xKey="name"
      xTick={{ fontSize: 11, fill: '#9A9590', dy: 4 }}
      axes={{ l: { side: 'left', width: 30, fontSize: 10, fill: '#9A9590', domain: 'zero' }, r: { side: 'right', width: 30, fontSize: 10, fill: '#9A9590', domain: 'zero' } }}
      bars={[{ key: 'prod', axis: 'l', radius: 5, barSize: 22, gradient: [T.copper, 0.95, T.copper, 0.55], name: 'Prod (L m)' }]}
      lines={[{ key: 'cpp', axis: 'r', color: T.nav, width: 3, dot: { r: 4, fill: T.nav, stroke: '#fff', strokeWidth: 2 }, activeR: 6, name: 'Cost/pick ₹' }]}
      cursor="band"
      tooltip={(r: any) => <PremiumTip label={r.name} items={[{ name: 'Prod (L m)', value: r.prod, color: T.copper }, { name: 'Cost/pick ₹', value: r.cpp, color: T.nav }]} />}
    />
  );
}

/* ---- "daily trend ›" of a management-summary card: DTS expense per day for that scope ---- */
function DtsTrendSheet({ cx, k, XSEC, onClose }: { cx: DtsMonth; k: 'A' | 'B' | 'T'; XSEC: any; onClose: () => void }) {
  const scope = k === 'T' ? cx.rolls : cx.rolls.filter((p) => p.sec === k);
  const rate = (p: DtsItem) => cx.secRate[p.sec === 'A' ? 'A' : 'B'] || 0;
  const entries = scope.map((p) => ({ date: p.date, v: num(p.pm) * rate(p) })) as any as DtsItem[];
  const byDay: Record<string, { d: string; m: number; pm: number; v: number; n: number }> = {};
  scope.forEach((p) => {
    const o = byDay[p.date] || (byDay[p.date] = { d: p.date, m: 0, pm: 0, v: 0, n: 0 });
    o.m += num(p.v); o.pm += num(p.pm); o.v += num(p.pm) * rate(p); o.n += rollsOf(p);
  });
  const days = Object.values(byDay).sort((a, b) => (a.d < b.d ? 1 : -1));
  const tot = days.reduce((a, d) => a + d.v, 0), totPm = days.reduce((a, d) => a + d.pm, 0);
  const col = k === 'A' ? XSEC.A.color : k === 'B' ? XSEC.B.color : T.nav;
  const title = k === 'A' ? `${XSEC.A.lbl} · DTS` : k === 'B' ? `${XSEC.B.lbl} · DTS` : 'Total · weighted · DTS';
  return (
    <Sheet open onClose={onClose} title={title}>
      <View style={{ paddingTop: 4, paddingHorizontal: 14, paddingBottom: 16 }}>
        <Text style={{ fontSize: 10.5, color: T.muted, lineHeight: 15.5, marginBottom: 8 }}>
          Day-wise DTS expense — the rolls of the three categories checked that day × their picks × {k === 'T' ? 'the per-pick cost of the section whose machines wove them' : "the section's cost per pick"} ({cx.label}). {days.length} day{days.length !== 1 ? 's' : ''} with rolls · {xCr(tot)} · {xR3(totPm > 0 ? tot / totPm : 0)}/pk
        </Text>
        <Spark from={`${cx.ym}-01`} to={monthEnd(cx.ym)} entries={entries} color={col} fmt={xCr} />
        <View style={[card, { paddingVertical: 4, marginTop: 10 }]}>
          <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 7, paddingHorizontal: 12 }}>
            <Text style={[lbl8, { flex: 1 }]}>Date</Text>
            <Text style={[lbl8, { width: 62, textAlign: 'right' }]}>Metres</Text>
            <Text style={[lbl8, { width: 58, textAlign: 'right' }]}>Pick·m</Text>
            <Text style={[lbl8, { width: 66, textAlign: 'right' }]}>₹</Text>
            <Text style={[lbl8, { width: 58, textAlign: 'right' }]}>₹/pk</Text>
          </View>
          {days.map((d) => (
            <View key={d.d} style={{ flexDirection: 'row', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: T.alt }}>
              <Text style={{ flex: 1, fontSize: 11.5, color: T.ink }} numberOfLines={1}>{fmtD(d.d)}<Text style={{ fontSize: 9.5, color: T.muted }}> · {pl(d.n, 'rolls')}</Text></Text>
              <Text style={[cellS, { width: 62, color: T.ink }]}>{xM(d.m)}</Text>
              <Text style={[cellS, { width: 58, color: T.muted }]}>{kPm(d.pm)}</Text>
              <Text style={[cellS, { width: 66, fontWeight: '700', color: T.ink }]}>{xCr(d.v)}</Text>
              <Text style={[cellS, { width: 58, color: T.muted }]}>{xR3(d.pm > 0 ? d.v / d.pm : 0)}</Text>
            </View>
          ))}
          {!days.length ? <Text style={{ padding: 12, fontSize: 11, color: T.muted }}>No DTS rolls in {cx.label}.</Text> : null}
        </View>
      </View>
    </Sheet>
  );
}

/* ---- the records of a scope within the selected month: month -> scope -> design -> entries ---- */
function DtsRollsSheet({ cx, req, onClose }: { cx: DtsMonth; req: SheetReq; onClose: () => void }) {
  const [art, setArt] = useState<string | null>(null);
  const { head } = req, col = req.color || DTS.color;
  const rateOf = (p: DtsItem) => { const s = cx.x?.[p.sec === 'A' ? 'A' : 'B']; return s ? (head ? num(s[head]?.perPick) : num(s.totPick)) : 0; };
  const amt = (p: DtsItem) => num(p.pm) * rateOf(p);
  const base = req.filter ? cx.rolls.filter(req.filter) : cx.rolls, ls = art ? base.filter((p) => p.d.art === art) : base;
  const sum = (f: (p: DtsItem) => number) => ls.reduce((a, p) => a + f(p), 0);
  const tot = sum(amt), totM = sum((p) => num(p.v)), totPm = sum((p) => num(p.pm)), nRolls = sum(rollsOf);
  const byArt = Object.values(base.reduce((g: Record<string, { k: string; cat: string; n: number; m: number; v: number }>, p) => {
    const o = g[p.d.art] || (g[p.d.art] = { k: p.d.art, cat: p.d.cat, n: 0, m: 0, v: 0 });
    o.n += rollsOf(p); o.m += num(p.v); o.v += amt(p);
    return g;
  }, {})).sort((a, b) => b.v - a.v);
  const entries = ls.map((p) => ({ date: p.date, v: amt(p) })) as any as DtsItem[];
  const rows = ls.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : String(a.id).localeCompare(String(b.id))));
  const headLbl = head ? (DTS_HEADS.find((h) => h[0] === head) || [])[1] : null;
  return (
    <Sheet open onClose={onClose} title={req.title}>
      <View style={{ paddingTop: 4, paddingHorizontal: 14, paddingBottom: 16 }}>
        <Text style={{ fontSize: 10.5, color: T.muted, lineHeight: 15.5, marginBottom: 8 }}>
          {req.sub ? `${req.sub} · ` : ''}{cx.label} · {pl(nRolls, 'rolls')} · {xM(totM)} · {kPm(totPm)} pick·m · <Text style={{ color: T.ink, fontWeight: '700' }}>{xCr(tot)}</Text> · {xR3(totPm > 0 ? tot / totPm : 0)}/pk{headLbl ? ` · ${headLbl.toLowerCase()} only` : ''}
        </Text>
        <Spark from={`${cx.ym}-01`} to={monthEnd(cx.ym)} entries={entries} color={col} fmt={xCr} />
        {byArt.length > 1 ? (
          <View style={[card, { paddingTop: 8, paddingHorizontal: 12, paddingBottom: 4, marginTop: 10 }]}>
            <Text style={[lbl8, { marginBottom: 2 }]}>By design · tap to narrow</Text>
            {byArt.map((a) => (
              <Pressable key={a.k} onPress={() => setArt(art === a.k ? null : a.k)} accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: T.alt, opacity: art && art !== a.k ? 0.45 : 1 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: art === a.k ? '800' : '600', color: T.ink }} numberOfLines={1}>{a.k}</Text>
                  <Text style={{ fontSize: 9.5, color: T.muted, fontFamily: MONO }} numberOfLines={1}>{a.cat} · {pl(a.n, 'rolls')} · {xM(a.m)}</Text>
                </View>
                <Text style={[cellS, { fontWeight: '700', color: T.ink }]}>{xCr(a.v)}</Text>
                <Text style={{ fontSize: 11, color: art === a.k ? col : T.muted }}>{art === a.k ? '✕' : '›'}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={[card, { paddingVertical: 4, marginTop: 10 }]}>
          <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 7, paddingHorizontal: 12 }}>
            <Text style={[lbl8, { flex: 1 }]} numberOfLines={1}>Entry{art ? ` · ${art}` : ''}</Text>
            <Text style={[lbl8, { width: 60, textAlign: 'right' }]}>Metres</Text>
            <Text style={[lbl8, { width: 58, textAlign: 'right' }]}>₹/pk</Text>
            <Text style={[lbl8, { width: 66, textAlign: 'right' }]}>₹</Text>
          </View>
          {rows.slice(0, 200).map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: T.alt, alignItems: 'center' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: '700', color: T.ink }} numberOfLines={1}>{p.label}<Text style={{ fontSize: 10, color: T.muted, fontWeight: '400' }}>  {fmtDY(p.date)}</Text></Text>
                <Text style={{ fontSize: 9.5, color: T.muted, fontFamily: MONO }} numberOfLines={1}>{p.sub}</Text>
              </View>
              <Text style={[cellS, { width: 60, color: T.ink }]}>{xM(num(p.v))}</Text>
              <Text style={[cellS, { width: 58, color: T.muted }]}>{xR3(rateOf(p))}</Text>
              <Text style={[cellS, { width: 66, fontWeight: '700', color: T.ink }]}>{xCr(amt(p))}</Text>
            </View>
          ))}
          {rows.length > 200 ? <Text style={{ paddingVertical: 8, paddingHorizontal: 12, fontSize: 10.5, color: T.muted }}>… and {rows.length - 200} more entries this month — narrow by design above.</Text> : null}
          {!rows.length ? <Text style={{ padding: 12, fontSize: 11, color: T.muted }}>No DTS rolls in {cx.label}.</Text> : null}
        </View>
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* the page                                                             */
/* ------------------------------------------------------------------ */

export default function DtsExpensePage({
  src, loadRows, init, onMonth, onFy, goExpense, scrollTop,
}: {
  src: DtsExpenseSource;
  /** DTS pick-metre rows of one month ('YYYY-MM') */
  loadRows: (ym: string) => Promise<DtsItem[]>;
  init?: string | null;
  onMonth?: (ym: string) => void;
  onFy: () => void;
  goExpense?: () => void;
  scrollTop: () => void;
}) {
  const keys = src.months.map((m) => m.key).join(',');
  const [rowsBy, setRowsBy] = useState<Record<string, DtsItem[]>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    src.months.forEach(({ key }) => {
      loadRows(key)
        .then((r) => alive && setRowsBy((o) => ({ ...o, [key]: r })))
        .catch((e: any) => alive && setErrs((o) => ({ ...o, [key]: e?.message || 'Unable to load.' })));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, loadRows, tick]);

  const dm = useMemo(() => src.months.map(({ key, x }) => dtsMonth(rowsBy[key] || [], x, key)), [src.months, rowsBy]);
  const [sel, setSel] = useState<string | null>(init || null);
  const [op, setOp] = useState<Record<string, boolean>>({ util: false, sal: false, prodx: false, mtx: false, otx: false, art: false, final: true, rates: true });
  const [trend, setTrend] = useState<'A' | 'B' | 'T' | null>(null);
  const [pst, setPst] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetReq | null>(null);
  const chipRef = useRef<ScrollView>(null);
  const tog = (k: string) => setOp((o) => ({ ...o, [k]: !o[k] }));

  if (src.error) return <View style={[card, { padding: 16 }]}><StateBox error={src.error} /></View>;
  if (src.loading && !dm.length) return <View style={[card, { padding: 16 }]}><StateBox loading /></View>;
  const m = dm.find((q) => q.key === (sel || src.cur)) || dm[dm.length - 1];
  if (!m) return <View style={[card, { padding: 16 }]}><Text style={{ fontSize: 12, color: T.muted }}>No expense sheet yet.</Text></View>;

  const XSEC = makeXSEC(m.counts);
  const idx = dm.findIndex((q) => q.key === m.key), prev = idx > 0 ? dm[idx - 1] : null, isCur = m.key === src.cur;
  const rowsLoading = !rowsBy[m.key] && !errs[m.key];
  const comp = m.heads.map((h) => ({ k: h.lbl, v: h.amt, c: dtsHeadCol(h.h), pk: h.perPick })).filter((c) => c.v > 0);
  const dlt = (c: number, p: number | null | undefined) => (p ? ((c - p) / p) * 100 : null);
  const Delta = ({ v }: { v: number | null }) => (v == null
    ? <Text style={{ fontSize: 10, color: '#9A9590' }}>—</Text>
    : <Text style={{ fontSize: 11, fontFamily: MONO, fontWeight: '700', color: v > 0 ? T.red : T.green }}>{v > 0 ? '▲' : '▼'} {Math.abs(v).toFixed(1)}%</Text>);

  /* every drill-down stays inside the selected month, like the module's sheets: scope -> design -> entries */
  const openRolls = (title: string, filter: SheetReq['filter'], o?: Partial<SheetReq>) => setSheet({ title, filter, ...(o || {}) });
  const secRolls = (k: SecK, o?: Partial<SheetReq>) => openRolls(`${XSEC[k].short} · DTS`, (p) => p.sec === k, { sub: SEC_MACH[k].sub, color: XSEC[k].color, ...(o || {}) });
  const groupRolls = (g: DtsGroup, o?: Partial<SheetReq>) => openRolls(`${g.lbl} · DTS`, (p) => GRP_KEY[p.d.grp] === g.k, { sub: `${g.rng} · ${g.n} mc`, color: XSEC[g.sec].color, ...(o || {}) });
  const sectionTitle = (t: string) => <Text style={{ fontSize: 11, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginHorizontal: 2, marginBottom: 8 }}>{t}</Text>;
  const headName = (h: string) => (DTS_HEADS.find((q) => q[0] === h) || [])[1] || h;

  /* the three-row table of a head: Section A machines · Section B machines · DTS weighted */
  const headRows = (h: string) => ([[XSEC.A.lbl, m.A[h].amt, m.A[h].perPick, 'A'], [XSEC.B.lbl, m.B[h].amt, m.B[h].perPick, 'B'], ['Total · DTS weighted', m.T[h].amt, m.T[h].perPick, null]] as [string, number, number, SecK | null][]).map(([n, a, pk, s], i) => (
    <Pressable key={n} accessibilityRole="button"
      onPress={() => (s ? secRolls(s, { head: h, color: dtsHeadCol(h) }) : openRolls(`${headName(h)} · DTS weighted`, null, { head: h, color: dtsHeadCol(h) }))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: T.alt }}>
      {s ? <XSecTag s={s} /> : null}
      <Text style={{ flex: 1, fontSize: 11.5, fontWeight: i === 2 ? '700' : '400', color: T.ink }}>
        {n}{s ? <Text style={{ fontSize: 9.5, color: T.muted }}> · {xM(m[s].prod)} · {kPm(m[s].pm)} pick·m</Text> : null}
      </Text>
      <Text style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: i === 2 ? '700' : '400', color: T.ink, minWidth: 62, textAlign: 'right' }}>{xCr(a)}</Text>
      <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 58, textAlign: 'right' }}>{xR3(pk)}/pk</Text>
    </Pressable>
  ));
  const rightAmt = (v: string, c: string, suffix?: string) => <Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '700', color: c, marginRight: 6 }}>{v}{suffix || ''}</Text>;
  const rateRows = (rows3: [string, number, string][]) => rows3.map(([l, v, n], i) => (
    <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 3, borderTopWidth: i === 2 ? 1 : 0, borderTopColor: T.border, gap: 6 }}>
      <Text style={{ fontSize: 10.5, fontWeight: i === 2 ? '800' : '600', color: T.ink, flexShrink: 1 }}>{l} <Text style={{ fontSize: 8.5, color: T.muted, fontWeight: '500' }}>· {n}</Text></Text>
      <Text style={{ fontFamily: MONO, fontSize: i === 2 ? 12.5 : 11.5, fontWeight: '800', color: i === 2 ? T.copper : T.ink }}>{R4(v)}</Text>
    </View>
  ));
  /* a section's conversion-rate card, as in the Expense module, at DTS picks */
  const rateCard = (k: SecK, sec: DtsSec) => (
    <View key={k} style={[card, { paddingVertical: 11, paddingHorizontal: 13, borderTopWidth: 4, borderTopColor: XSEC[k].color, flex: 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <XSecTag s={k} size={9.5} />
        <Text style={{ fontSize: 11.5, fontWeight: '800', color: T.ink, flexShrink: 1 }}>{XSEC[k].short} · {XSEC[k].n} mc</Text>
      </View>
      <Text style={{ fontSize: 9.5, color: T.muted, marginBottom: 6, lineHeight: 12.8 }}>{XSEC[k].lbl.replace(/^[AB] — /, '')}</Text>
      {rateRows([['Weaving conversion', sec.conv, 'electricity + wages'], ['Overheads', sec.ovh, 'stores + maintenance + other'], ['Total', sec.conv + sec.ovh, 'per pick per metre']])}
      <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 4, fontFamily: MONO }}>≈ {xR2((sec.conv + sec.ovh) * sec.picks)}/m at {num(sec.picks).toFixed(1)} DTS picks · {xM(sec.prod)}</Text>
    </View>
  );
  const dtsTag = (
    <View style={{ backgroundColor: DTS.color + '18', borderWidth: 1, borderColor: DTS.color + '44', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: DTS.color, fontFamily: MONO }}>DTS</Text>
    </View>
  );
  const status = isCur
    ? { t: '● Ongoing month', c: T.green }
    : m.x?.frozen ? { t: `🔒 Frozen${m.x.frozen.at ? ` · ${fmtDY(String(m.x.frozen.at).slice(0, 10))}` : ''}`, c: T.green }
      : m.x?.adjusted ? { t: '≈ Adjusted · awaiting freeze', c: T.amber }
        : { t: 'Awaiting actuals · open for adjustment', c: T.muted };
  const byArt = Object.values(m.rolls.reduce((g: Record<string, { k: string; cat: string; m: number; pm: number; v: number }>, p) => {
    const o = g[p.d.art] || (g[p.d.art] = { k: p.d.art, cat: p.d.cat, m: 0, pm: 0, v: 0 });
    o.m += num(p.v); o.pm += num(p.pm); o.v += num(p.pm) * (m.secRate[p.sec === 'A' ? 'A' : 'B'] || 0);
    return g;
  }, {})).sort((a, b) => b.v - a.v);
  const pickMonth = (k: string) => { setSel(k); setPst(null); setSheet(null); setTrend(null); onMonth?.(k); };

  return (
    <View style={{ paddingBottom: 16 }}>
      {/* months and the FY button */}
      <ScrollView ref={chipRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }} style={{ marginBottom: 12 }}
        onContentSizeChange={() => chipRef.current?.scrollToEnd({ animated: false })}>
        <FYBtn onPress={onFy} big />
        {dm.map((x) => {
          const a = x.key === m.key, c = x.key === src.cur;
          return (
            <Pressable key={x.key} onPress={() => pickMonth(x.key)} accessibilityRole="button"
              style={{ paddingVertical: 7, paddingHorizontal: 13, borderRadius: 20, backgroundColor: a ? T.copper : T.surface, borderWidth: 1, borderColor: a ? T.copper : T.border }}>
              <Text style={{ fontWeight: '700', fontSize: 11.5, color: a ? '#fff' : T.muted }}>{x.label}{c ? ' •' : x.x?.frozen ? ' 🔒' : x.x?.adjusted ? ' ≈' : ''}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <View style={{ backgroundColor: status.c + '15', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20 }}>
          <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', color: status.c }}>{status.t}</Text>
        </View>
        <Text style={{ fontSize: 9.5, color: T.muted, flexShrink: 1 }}>{DTS.long} · {rowsLoading ? 'loading rolls…' : `${pl(m.n, 'rolls')} on any machine`}</Text>
      </View>
      {errs[m.key] ? <View style={[card, { padding: 12, marginBottom: 10 }]}><StateBox error={errs[m.key]} onRetry={() => { setErrs({}); setTick((t) => t + 1); }} minHeight={40} /></View> : null}

      {/* Section A · Section B, each at its own rate, then the DTS weighted average */}
      <Grid cols={2} gap={8} style={{ marginBottom: 8 }}>
        {(['A', 'B'] as SecK[]).map((k) => (
          <Pressable key={k} onPress={() => secRolls(k)} accessibilityRole="button" style={[card, { paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 4, borderTopColor: XSEC[k].color, flex: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <XSecTag s={k} size={10} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: T.ink, flex: 1 }} numberOfLines={1}>{XSEC[k].short}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: '800', color: XSEC[k].color }}>{XSEC[k].n} mc</Text>
            </View>
            <Text style={{ fontSize: 10, color: T.ink, fontWeight: '600', lineHeight: 14 }}>{XSEC[k].lbl.replace(/^[AB] — /, '')}</Text>
            <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 2, lineHeight: 12.8 }}>{XSEC[k].groups}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, marginTop: 6 }}>
              <Text style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: '700', color: T.ink }}>{xM(m[k].prod)}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted }}>{xCr(m[k].cost)}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: '800', color: XSEC[k].color, marginLeft: 'auto' }}>{xR3(m[k].totPick)}/pk</Text>
            </View>
            <Text style={{ fontSize: 9, color: T.muted, marginTop: 3, fontFamily: MONO }}>DTS rolls on these machines · {pl(m[k].rolls, 'rolls')}</Text>
          </Pressable>
        ))}
      </Grid>
      <Pressable onPress={() => openRolls('DTS · weighted · all rolls', null, { sub: DTS.long })} accessibilityRole="button"
        style={[card, { paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 4, borderTopColor: DTS.color, marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          {dtsTag}
          <Text style={{ fontSize: 12, fontWeight: '800', color: T.ink, flex: 1 }}>DTS · weighted average</Text>
          <Text style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: '800', color: DTS.color }}>A + B</Text>
        </View>
        <Text style={{ fontSize: 10, color: T.ink, fontWeight: '600', lineHeight: 14 }}>{DTS.long} · on any machine</Text>
        <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 2, lineHeight: 12.8 }}>
          combined expense ÷ metres ÷ avg picks = {xCr(m.total)} ÷ {xM(m.m)} ÷ {m.ppi.toFixed(1)} — weighted by pick·metres, never an average of the two rates
        </Text>
        <View style={{ flexDirection: 'row', columnGap: 10, marginTop: 6, alignItems: 'baseline' }}>
          <Text style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: '700', color: T.ink }}>{xM(m.m)}</Text>
          <Text style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted }}>{xCr(m.total)}</Text>
          <Text style={{ fontFamily: MONO, fontSize: 12, fontWeight: '800', color: T.copper, marginLeft: 'auto' }}>{xR3(m.perPick)}/pk</Text>
        </View>
      </Pressable>

      {/* KPIs */}
      <Grid cols={2} gap={8} style={{ marginBottom: 12 }}>
        <XKPI label="Total cost" value={xCr(m.total)} sub={`${m.label} · ${m.days} days · DTS`} accent={T.copper} />
        <XKPI label="Cost / pick" value={xR3(m.perPick)} sub="Section A + Section B · weighted" accent={T.copper} />
        <XKPI label="Avg picks" value={m.ppi.toFixed(1)} sub="prod-weighted · DTS rolls" accent={XC.sal} />
        <XKPI label="Production" value={xM(m.m)} sub={`${xK0(m.prodPerMcDay)} m / mc·day`} accent={XC.store} />
        <XKPI label="Cost / mc·day" value={xCr(m.perMcDay)} sub={`≈ ${xK0(m.mcDays)} machine-days`} accent={XC.fixed} />
        <XKPI label="Units" value={`${(m.units / 1e3).toFixed(1)}K kWh`} sub={`@ ${xR2(m.unitRate)}/unit · DTS share`} accent={XC.other} />
      </Grid>

      {/* composition */}
      <View style={[card, { padding: 14, marginBottom: 12 }]}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: T.ink, marginBottom: 10 }}>Cost composition · {m.label} · DTS</Text>
        {comp.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <XDonut seg={comp.map((c) => ({ v: c.v, color: c.c }))} center={{ top: xCr(m.total), bot: 'total' }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              {comp.map((c) => (
                <View key={c.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: c.c }} />
                  <Text style={{ flex: 1, fontSize: 11.5, color: T.ink }} numberOfLines={1}>{c.k}</Text>
                  <Text style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: '700', color: T.ink }}>{xCr(c.v)}</Text>
                  <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 38, textAlign: 'right' }}>{xPc((c.v / m.total) * 100)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : <Text style={{ fontSize: 11, color: T.muted }}>{rowsLoading ? 'Loading the DTS rolls…' : `No DTS rolls checked in ${m.label}.`}</Text>}
      </View>

      {/* production of the three categories by the machines that wove them */}
      <View style={[card, { paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5, flexShrink: 1 }}>PRODUCTION · DTS ROLLS · FROM PRODUCTION SYSTEM</Text>
          <View style={{ backgroundColor: T.green + '15', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 20 }}><Text style={{ fontSize: 8.5, fontWeight: '800', color: T.green, letterSpacing: 0.4 }}>● AUTO</Text></View>
        </View>
        {(['A', 'B'] as SecK[]).map((k) => (
          <View key={k} style={{ marginBottom: 4 }}>
            <Pressable onPress={() => secRolls(k)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: T.border }}>
              <XSecTag s={k} />
              <Text style={{ flex: 1, fontSize: 11.5, fontWeight: '800', color: T.ink }}>{XSEC[k].lbl}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: '800', minWidth: 60, textAlign: 'right', color: XSEC[k].color }}>{xM(m[k].prod)}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 46, textAlign: 'right' }}>{m[k].picks.toFixed(0)} pk</Text>
            </Pressable>
            {m.groups.filter((g) => g.sec === k).map((g) => (
              <Pressable key={g.k} onPress={() => groupRolls(g)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingLeft: 10, borderBottomWidth: 1, borderBottomColor: T.alt }}>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: T.ink }}>{g.lbl} <Text style={{ fontSize: 9.5, color: T.muted, fontWeight: '500' }}>· {g.rng} · {g.n} mc · {pl(g.rolls, 'rolls')}</Text></Text>
                <Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '700', minWidth: 60, textAlign: 'right', color: T.ink }}>{xM(g.m)}</Text>
                <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 46, textAlign: 'right' }}>{g.ppi.toFixed(0)} pk</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 2 }}>
          <Text style={{ flex: 1, fontSize: 11.5, fontWeight: '800', color: T.ink }}>Total · DTS · any machine</Text>
          <Text style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: '800', minWidth: 60, textAlign: 'right', color: T.ink }}>{xM(m.m)}</Text>
          <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 46, textAlign: 'right' }}>{m.ppi.toFixed(0)} pk</Text>
        </View>
        <Text style={{ fontSize: 10, color: T.muted, marginTop: 7, lineHeight: 14 }}>
          Checked rolls of Dress Material, Technical Textile and Sportswear by the machine group that wove them, rolled up to Section A / Section B machines. Other categories woven on the same machines are left out. Tap a row for its rolls.
        </Text>
      </View>

      {/* management summary */}
      {sectionTitle('Management summary · DTS')}
      <XSumCard title={XSEC.A.lbl} d={m.A} accent={XSEC.A.color} onTrend={() => setTrend('A')} />
      <XSumCard title={XSEC.B.lbl} d={m.B} accent={XSEC.B.color} onTrend={() => setTrend('B')} />
      <XSumCard title="Total · DTS weighted · A + B" d={m.T} accent={T.nav} onTrend={() => setTrend('T')} />
      {trend ? <DtsTrendSheet cx={m} k={trend} XSEC={XSEC} onClose={() => setTrend(null)} /> : null}
      {sheet ? <DtsRollsSheet key={sheet.title + m.key} cx={m} req={sheet} onClose={() => setSheet(null)} /> : null}

      {/* expense breakdown */}
      {sectionTitle('Expense breakdown · DTS')}
      <XSection title="Utilities / units consumed" sub={`${xK0(m.units)} kWh @ ${xR2(m.unitRate)} · DTS share`} icon="⚡" accent={XC.elec} open={op.util} onToggle={() => tog('util')} right={rightAmt(xCr(m.T.elec.amt), XC.elec)}>
        <Text style={{ fontSize: 10.5, color: T.muted, lineHeight: 15.5, marginBottom: 6 }}>
          Electricity per pick is the Expense module's section rate (its meters allocated as there); each machine group carries its section's rate × the DTS pick·metres woven on it. Tap a group for its rolls of the month.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 2, paddingBottom: 4 }}>
          <Text style={[lbl8, { flex: 1 }]}>Machine group</Text>
          <Text style={[lbl8, { minWidth: 56, textAlign: 'right' }]}>₹/m</Text>
          <Text style={[lbl8, { minWidth: 70, textAlign: 'right' }]}>₹/pick</Text>
          <Text style={[lbl8, { minWidth: 64, textAlign: 'right' }]}>₹</Text>
        </View>
        {m.groups.map((g) => (
          <Pressable key={g.k} onPress={() => groupRolls(g, { head: 'elec', color: XC.elec })} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: T.alt }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: T.ink }}>{g.lbl}</Text>
              <Text style={{ fontSize: 9, color: T.muted }}>{g.rng} · {g.n} mc · {xM(g.m)} · {pl(g.rolls, 'rolls')}</Text>
            </View>
            <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 56, textAlign: 'right' }}>{g.m > 0 ? xR2(g.elecPerM) : '—'}</Text>
            <Text style={{ fontFamily: MONO, fontWeight: '800', fontSize: 12, minWidth: 70, textAlign: 'right', color: T.ink }}>{g.pm > 0 ? R4(g.elecPick) : '—'}</Text>
            <Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '700', minWidth: 64, textAlign: 'right', color: T.ink }}>{xCr(g.elec)}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => openRolls('Electricity · DTS weighted', null, { head: 'elec', color: XC.elec })} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 6, paddingBottom: 2 }}>
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: T.ink }}>Total · DTS weighted</Text>
          <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 56, textAlign: 'right' }}>{m.m > 0 ? xR2(m.T.elec.amt / m.m) : '—'}</Text>
          <Text style={{ fontFamily: MONO, fontWeight: '800', fontSize: 14, minWidth: 70, textAlign: 'right', color: XC.elec }}>{R4(m.T.elec.perPick)}</Text>
          <Text style={{ fontFamily: MONO, fontSize: 12, fontWeight: '800', minWidth: 64, textAlign: 'right', color: XC.elec }}>{xCr(m.T.elec.amt)}</Text>
        </Pressable>
      </XSection>
      <XSection title="Salaries / wages" sub="Section A + Section B · DTS share" icon="₹" accent={XC.sal} open={op.sal} onToggle={() => tog('sal')} right={rightAmt(xCr(m.T.sal.amt), XC.sal)}>{headRows('sal')}</XSection>
      <XSection title="Production-linked expenses" sub="Stores & spares · DTS share" icon="◧" accent={XC.store} open={op.prodx} onToggle={() => tog('prodx')} right={rightAmt(xCr(m.T.store.amt), XC.store)}>{headRows('store')}</XSection>
      <XSection title="Maintenance" sub={`Section A · Section B · common (by machine count ${m.counts.A} : ${m.counts.B}) · DTS share`} icon="▦" accent={XC.fixed} open={op.mtx} onToggle={() => tog('mtx')} right={rightAmt(xCr(m.T.maint.amt), XC.fixed)}>
        {headRows('maint')}
        <Text style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>The section's maintenance per pick (common items split by machine count, Section A {m.counts.A} : Section B {m.counts.B}) × the DTS pick·metres on its machines.</Text>
      </XSection>
      <XSection title="Other expenses" sub="Direct / indirect · DTS share" icon="＋" accent={XC.other} open={op.otx} onToggle={() => tog('otx')} right={rightAmt(xCr(m.T.oth.amt), XC.other)}>
        {headRows('oth')}
        <Text style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>The section's other expenses per pick × the DTS pick·metres on its machines.</Text>
      </XSection>
      <XSection title="Final derived costing" sub={`${xR3(m.perPick)}/pick · ${m.ppi.toFixed(1)} picks · DTS`} icon="∑" accent={T.copper} open={op.final} onToggle={() => tog('final')} right={rightAmt(xR3(m.perPick), T.copper, '/pk')}>
        {comp.map((c) => (
          <View key={c.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c.c }} />
            <Text style={{ flex: 1, fontSize: 11.5, color: T.ink }}>{c.k}</Text>
            <Text style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink }}>{xCr(c.v)}</Text>
            <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 56, textAlign: 'right' }}>{xR3(c.pk)}/pk</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 4, borderTopWidth: 1, borderTopColor: T.border, marginTop: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: T.ink }}>Total cost</Text>
          <Text style={{ fontFamily: MONO, fontSize: 13, fontWeight: '800', color: T.copper }}>{xCr(m.total)}</Text>
        </View>
        <Grid cols={3} gap={8} style={{ marginTop: 8 }}>
          <XStat label="Cost / pick" value={xR3(m.perPick)} />
          <XStat label="Avg picks" value={m.ppi.toFixed(1)} />
          <XStat label="Cost / mc·day" value={xCr(m.perMcDay)} />
        </Grid>
        <Text style={{ fontSize: 10, color: T.muted, marginTop: 8 }}>
          Cost / pick = DTS expense ÷ DTS metres ÷ avg picks ({m.ppi.toFixed(1)}) — the two section rates weighted by the DTS pick·metres woven on each: {xR3(m.secRate.A)} × {kPm(m.A.pm)} + {xR3(m.secRate.B)} × {kPm(m.B.pm)} ÷ {kPm(m.pm)}.
        </Text>
      </XSection>
      <XSection title="Section conversion rates · A / B · DTS weighted" sub={isCur ? `live · month-to-date · ${m.days} days` : 'closed month · full-month average'} icon="⛓" accent={T.nav} open={op.rates} onToggle={() => tog('rates')}
        right={<View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20, backgroundColor: (isCur ? T.amber : T.green) + '18', marginRight: 6 }}><Text style={{ fontSize: 9, fontWeight: '800', color: isCur ? T.amber : T.green }}>{isCur ? 'LIVE' : 'FROZEN'}</Text></View>}>
        <Text style={{ fontSize: 10.5, color: T.muted, lineHeight: 15.5, marginBottom: 10 }}>
          The rates every DTS roll carries — Section A for a roll woven on Waterjet or S. Rapier 230 cm, Section B for one woven on M Weaves or S. Rapier 190 cm — exactly as the Expense module sets them. The DTS card below weights the two by the DTS pick·metres woven on each section.
        </Text>
        <Grid cols={2} gap={8}>{rateCard('A', m.A)}{rateCard('B', m.B)}</Grid>
        <View style={[card, { paddingVertical: 11, paddingHorizontal: 13, borderTopWidth: 4, borderTopColor: DTS.color, marginTop: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            {dtsTag}
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: T.ink, flexShrink: 1 }}>DTS · weighted average · {pl(m.n, 'rolls')}</Text>
          </View>
          <Text style={{ fontSize: 9.5, color: T.muted, marginBottom: 6, lineHeight: 12.8 }}>Section A {kPm(m.A.pm)} pick·m + Section B {kPm(m.B.pm)} pick·m</Text>
          {rateRows([['Weaving conversion', m.T.conv, 'electricity + wages'], ['Overheads', m.T.ovh, 'stores + maintenance + other'], ['Total', m.T.conv + m.T.ovh, 'per pick per metre · weighted']])}
          <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 4, fontFamily: MONO }}>≈ {xR2(m.perM)}/m at {m.ppi.toFixed(1)} DTS picks</Text>
        </View>
      </XSection>
      <XSection title="Cost by design" sub="DTS designs · the mix of the sections each was woven on" icon="🧵" accent={T.blue} open={op.art} onToggle={() => tog('art')} right={rightAmt(pl(byArt.length, 'designs'), T.blue)}>
        {byArt.length ? byArt.map((a, i) => (
          <Pressable key={a.k} onPress={() => openRolls(`${a.k} · ${a.cat}`, (p) => p.d.art === a.k, { color: T.blue })} accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: i < byArt.length - 1 ? 1 : 0, borderBottomColor: T.alt }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: T.ink }} numberOfLines={1}>{a.k}</Text>
              <Text style={{ fontSize: 9.5, color: T.muted, fontFamily: MONO }} numberOfLines={1}>{a.cat} · {xM(a.m)} · {xR2(a.m > 0 ? a.v / a.m : 0)}/m</Text>
            </View>
            <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 56, textAlign: 'right' }}>{xR3(a.pm > 0 ? a.v / a.pm : 0)}/pk</Text>
            <Text style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: '700', minWidth: 64, textAlign: 'right', color: T.ink }}>{xCr(a.v)}</Text>
          </Pressable>
        )) : <Text style={{ fontSize: 11, color: T.muted }}>No DTS rolls in {m.label}.</Text>}
        <Text style={{ fontSize: 10, color: T.muted, marginTop: 8 }}>Tap a design for its rolls of the month.</Text>
      </XSection>

      {/* comparative analytics */}
      {sectionTitle('Comparative analytics · 6 months · DTS')}
      <View style={[card, { padding: 14, marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: T.ink }}>Production vs cost / pick</Text>
          <Text style={{ fontSize: 9.5, color: T.muted }}>last 6 months · DTS</Text>
        </View>
        <XProdExpChart months={dm.slice(-6)} />
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 9, height: 9, backgroundColor: T.copper, borderRadius: 2 }} /><Text style={{ fontSize: 10, color: T.muted }}>Production (L m)</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 9, height: 9, backgroundColor: T.nav, borderRadius: 2 }} /><Text style={{ fontSize: 10, color: T.muted }}>Cost / pick (₹)</Text></View>
        </View>
      </View>
      <View style={[card, { padding: 14, marginBottom: 12 }]}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: T.ink, marginBottom: 10 }}>Efficiency indicators · {m.label} · DTS</Text>
        <Grid cols={3} gap={8}>
          <XStat label="Units / metre" value={`${m.unitsPerM.toFixed(2)} kWh`} />
          <XStat label="Salary / metre" value={xR2(m.salPerM)} />
          <XStat label="Stores / metre" value={xR2(m.storePerM)} />
          <XStat label="Avg picks" value={m.ppi.toFixed(1)} />
          <XStat label="Prod / mc·day" value={`${xK0(m.prodPerMcDay)} m`} />
          <XStat label="Cost / mc·day" value={xCr(m.perMcDay)} />
        </Grid>
      </View>
      <Grid cols={2} gap={10} style={{ marginBottom: 12 }}>
        {([['Production split · A / B', m.A.prod, m.B.prod, m.prodShareA, m.prodShareB], ['Cost split · A / B', m.A.cost, m.B.cost, m.shareA, m.shareB]] as [string, number, number, number, number][]).map(([t, a, b, pa, pb]) => (
          <View key={t} style={[card, { padding: 12, alignItems: 'center', flex: 1 }]}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: T.ink, marginBottom: 8 }}>{t}</Text>
            <XDonut size={92} thick={13} seg={[{ v: a, color: XSEC.A.color }, { v: b, color: XSEC.B.color }]} center={{ top: xPc(pa), bot: 'Section A' }} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Text style={{ fontSize: 10, color: XSEC.A.color }}>● A {xPc(pa)}</Text>
              <Text style={{ fontSize: 10, color: XSEC.B.color }}>● B {xPc(pb)}</Text>
            </View>
          </View>
        ))}
      </Grid>
      <View style={[card, { padding: 14, marginBottom: 12 }]}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: T.ink, marginBottom: 2 }}>Month-on-month · DTS</Text>
        <Text style={{ fontSize: 10, color: T.muted, marginBottom: 10 }}>{prev ? `${m.label} vs ${prev.label}` : 'no prior month'}</Text>
        <Grid cols={3} gap={8}>
          {([['Total cost', m.total, prev?.total, xCr], ['Cost / pick', m.perPick, prev?.perPick, xR3], ['Production', m.m, prev?.m, xM]] as [string, number, number | undefined, (n: number) => string][]).map(([n, c, p, f]) => (
            <View key={n} style={{ backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 10, flex: 1 }}>
              <Text style={lbl8}>{n}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 13, fontWeight: '700', color: T.ink, marginVertical: 3 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{f(c)}</Text>
              <Delta v={dlt(c, p)} />
            </View>
          ))}
        </Grid>
      </View>

      {/* past performance */}
      {sectionTitle('Past performance · DTS')}
      {dm.filter((x) => x.key !== src.cur).reverse().map((x) => {
        const o = pst === x.key;
        return (
          <View key={x.key} style={[card, { marginBottom: 8 }]}>
            <Pressable onPress={() => setPst(o ? null : x.key)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: T.ink }}>{x.label}</Text>
                <Text style={{ fontSize: 10, color: T.muted, fontFamily: MONO, marginTop: 1 }}>{xM(x.m)} · {pl(x.n, 'rolls')} · {x.days} days</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: MONO, fontSize: 13, fontWeight: '700', color: T.copper }}>{xCr(x.total)}</Text>
                <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted }}>{xR3(x.perPick)}/pk</Text>
              </View>
              <Text style={{ color: '#9A9590', fontSize: 12, transform: [{ rotate: o ? '180deg' : '0deg' }] }}>▾</Text>
            </Pressable>
            {o ? (
              <View style={{ borderTopWidth: 1, borderTopColor: T.border, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: T.sub }}>
                {x.heads.filter((h) => h.amt > 0).map((h) => (
                  <View key={h.h} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: dtsHeadCol(h.h) }} />
                    <Text style={{ flex: 1, fontSize: 11, color: T.ink }}>{h.lbl}</Text>
                    <Text style={{ fontFamily: MONO, fontSize: 11, color: T.ink }}>{xCr(h.amt)}</Text>
                    <Text style={{ fontFamily: MONO, fontSize: 9.5, color: T.muted, minWidth: 38, textAlign: 'right' }}>{xPc(x.total > 0 ? (h.amt / x.total) * 100 : 0)}</Text>
                  </View>
                ))}
                {!x.n ? <Text style={{ fontSize: 11, color: T.muted }}>{!rowsBy[x.key] && !errs[x.key] ? 'Loading the DTS rolls…' : `No DTS rolls checked in ${x.label}.`}</Text> : null}
                <Grid cols={2} gap={8} style={{ marginTop: 8 }}>
                  <XStat label="Cost / pick" value={xR3(x.perPick)} />
                  <XStat label="Cost / mc·day" value={xCr(x.perMcDay)} />
                  <XStat label="Section A · Waterjet + S. Rapier 230" value={`${xCr(x.A.cost)} · ${xPc(x.shareA)} · ${xR3(x.A.totPick)}/pk`} />
                  <XStat label="Section B · Rapier 190" value={`${xCr(x.B.cost)} · ${xPc(x.shareB)} · ${xR3(x.B.totPick)}/pk`} />
                </Grid>
                <Pressable onPress={() => { pickMonth(x.key); scrollTop(); }} accessibilityRole="button"
                  style={{ alignSelf: 'flex-start', marginTop: 10, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface }}>
                  <Text style={{ color: T.copper, fontSize: 11, fontWeight: '800' }}>Open {x.label} ›</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
      {goExpense ? (
        <Pressable onPress={goExpense} accessibilityRole="button" style={[card, { paddingVertical: 12, paddingHorizontal: 14, marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: T.copper + '1a', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: T.copper, fontSize: 18 }}>Σ</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: T.ink }}>Expense module</Text>
            <Text style={{ fontSize: 10.5, color: T.muted }}>the machine-based accounting · Section A's {m.counts.A} machines and Section B's {m.counts.B}, all categories · entries, adjustments and month close</Text>
          </View>
          <Text style={{ color: T.muted, fontSize: 18 }}>›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
