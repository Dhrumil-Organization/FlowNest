// FILE: src/components/DtsNEW/Outsourcing.tsx
// DTS · Outsourcing hub and Yarn ledger (prompt §8), built like the Dyeing section's Daily Hub.
//   Hub     date range · 4 KPI tiles that switch the view · Suppliers › Design › Challan › Roll · design chips ·
//           date-wise table · reconciliation card
//   Ledger  opening · issued · consumed · closing, by yarn, then every entry with its running balance
//
// Data — ONE call, the whole financial year to today (the screen cuts any range / "as at" date out of it):
//   GET /api/getDtsDashboard?section=jobwork&to=<today>
//     items            fabric inward lines of DTS items            GRYInw / GRYInwD1
//     meta.yarn_out    yarn challans to those job workers          JobOrdOut / JobOrdOutD1          (+kg)
//     meta.yarn_used   yarn used by each inward, yarn by yarn       JobOrdOutD1A                     (−kg)
//     meta.orders      metres ordered on job work                   prodorderjob (TranType 30)
//   GET ...?section=jobwork_rolls&uid=<inward>                      GRYInwD2 — only when a challan is opened
//
// The ERP's own rule is followed: yarn used by an inward = consumed + wastage + shortage of its yarn annexure, the
// figure the ERP itself deducts from the yarn order's balance. So "yarn at supplier" here = the ERP's yarn balance.
// A yarn challan is issued to a job worker, not to a design, so a yarn balance is per supplier and yarn.
// What the ERP does not record (metres reported woven before receipt, a "held" inward, bottoms as their own figure)
// is shown as "not recorded" — never estimated.
import { T } from '@/src/theme';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FONT } from '../OwnerDashboardNEW/fonts';
import {
  addDays, daysBetween, DrillInit, DTS, DtsFetch, fmtD, fmtDY, fyStartOf, mLbl, num, PeriodKey, pl, rangeOf, secKg, secM, todayS,
} from './model';
import { C, RangeBar, st as ui, StateBox } from './ui';

/* ------------------------------------------------------------------ */
/* data                                                                */
/* ------------------------------------------------------------------ */

export type JwIn = {
  id: string; uid: string; date: string; v: number; aux: number; rate: number; rolls: number; no: string; chal: string; bill: string;
  grade: string; shade: string; worker: string; worker_id: string; cat: string; art: string;
};
/** open = the balance carried from last financial year (dated the day before this year starts) */
export type JwOut = { id: string; date: string; no: string; worker: string; worker_id: string; yarn: string; yarn_id: string; kg: number; open?: boolean };
export type JwUsed = {
  inw: string; date: string; no: string; bill: string; out_no: string; worker_id: string; yarn: string; yarn_id: string;
  kg: number; wst: number; sht: number; mtr: number; designs: [string, number][];
};
export type JwOrder = { worker_id: string; art: string; po: string; qty: number };
/** found = what the server read (inward lines, suppliers, yarn challan lines, yarn-used lines) — shown so an empty screen can be traced */
export type JwData = { ins: JwIn[]; outs: JwOut[]; used: JwUsed[]; orders: JwOrder[]; yarnError: string; fyFrom: string; names: Record<string, string>; found: Record<string, number>; prevNote: string };
export type JwState = { data: JwData | null; loading: boolean; error: string; reload: () => void };
export type HubView = 'recv' | 'chg' | 'yout' | 'ybal';
export type Flag = { red: boolean; msg: string };

const str = (v: any) => (v == null ? '' : String(v)).trim();
/** everything an inward takes out of the supplier's yarn: consumed + wastage + shortage (the ERP's own deduction) */
export const usedKg = (u: JwUsed) => u.kg + u.wst + u.sht;

export function useJobWork(fetch: DtsFetch, enabled: boolean, version: number): JwState {
  const [state, setState] = useState<{ data: JwData | null; loading: boolean; error: string }>({ data: null, loading: enabled, error: '' });
  const [tick, setTick] = useState(0);
  const today = todayS();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fetch('jobwork', undefined, today)
      .then((r) => {
        if (!alive) return;
        const m = r.meta || {};
        const ins: JwIn[] = (r.items || []).map((x: any) => ({
          id: str(x.id), uid: str(x.uid), date: str(x.date).slice(0, 10), v: num(x.v), aux: num(x.aux), rate: num(x.rate), rolls: num(x.rolls),
          no: str(x.no), chal: str(x.chal), bill: str(x.bill), grade: str(x.grade), shade: str(x.shade), worker: str(x.worker) || '—',
          worker_id: str(x.worker_id), cat: str(x.cat) || '—', art: str(x.art) || '—',
        }));
        const outs: JwOut[] = (Array.isArray(m.yarn_out) ? m.yarn_out : []).map((x: any) => ({
          id: str(x.id), date: str(x.date).slice(0, 10), no: str(x.no), worker: str(x.worker) || '—', worker_id: str(x.worker_id),
          yarn: str(x.yarn) || '—', yarn_id: str(x.yarn_id), kg: num(x.kg), open: !!x.open,
        }));
        const used: JwUsed[] = (Array.isArray(m.yarn_used) ? m.yarn_used : []).map((x: any) => ({
          inw: str(x.inw), date: str(x.date).slice(0, 10), no: str(x.no), bill: str(x.bill), out_no: str(x.out_no), worker_id: str(x.worker_id),
          yarn: str(x.yarn) || '—', yarn_id: str(x.yarn_id), kg: num(x.kg), wst: num(x.wst), sht: num(x.sht), mtr: num(x.mtr),
          designs: Array.isArray(x.designs) ? x.designs.map((d: any) => [str(d[0]), num(d[1])] as [string, number]) : [],
        }));
        const orders: JwOrder[] = (Array.isArray(m.orders) ? m.orders : []).map((x: any) => ({ worker_id: str(x.worker_id), art: str(x.art), po: str(x.po), qty: num(x.qty) }));
        const names: Record<string, string> = {};
        outs.forEach((o) => { names[o.worker_id] = o.worker; });
        ins.forEach((i) => { names[i.worker_id] = i.worker; });
        setState({ data: { ins, outs, used, orders, yarnError: str(m.yarn_error), fyFrom: str(m.from) || fyStartOf(today), names, found: m.found && typeof m.found === 'object' ? m.found : {}, prevNote: m.previous_year_error ? `Last year's yarn could not be read: ${str(m.previous_year_error).slice(0, 120)}` : '' }, loading: false, error: '' });
      })
      .catch((e: any) => alive && setState({ data: null, loading: false, error: e?.message || 'Unable to load the job-work records.' }));
    return () => { alive = false; };
  }, [fetch, enabled, version, tick, today]);
  return { ...state, reload: () => setTick((n) => n + 1) };
}

/* ---------- the calculation: one place, used by the widget, the hub, the ledger and Stock ---------- */

export type YarnRow = { id: string; yarn: string; issued: number; used: number; bal: number };
/** a supplier's yarn account as at a date: issued, used and balance by yarn (only issues and inwards up to that date) */
export function yarnAt(d: JwData, worker: string | null, asAt: string): YarnRow[] {
  const g: Record<string, YarnRow> = {};
  const row = (id: string, yarn: string) => g[id] || (g[id] = { id, yarn, issued: 0, used: 0, bal: 0 });
  d.outs.forEach((o) => { if ((!worker || o.worker_id === worker) && o.date <= asAt) row(o.yarn_id, o.yarn).issued += o.kg; });
  d.used.forEach((u) => { if ((!worker || u.worker_id === worker) && u.date <= asAt) row(u.yarn_id, u.yarn).used += usedKg(u); });
  return Object.values(g).map((r) => ({ ...r, bal: r.issued - r.used })).sort((a, b) => b.issued - a.issued);
}
export const balAt = (d: JwData, worker: string | null, asAt: string) => yarnAt(d, worker, asAt).reduce((s, r) => s + r.bal, 0);
export const workersOf = (d: JwData) => Object.keys(d.names).sort((a, b) => d.names[a].localeCompare(d.names[b]));
export const lastInward = (d: JwData, worker: string, asAt: string) =>
  d.ins.reduce((m, i) => (i.worker_id === worker && i.date <= asAt && i.date > m ? i.date : m), '');

/** the flags of a supplier's yarn account (prompt §3). Flags that need records the ERP does not keep are not raised. */
export function flagsOf(d: JwData, worker: string, asAt: string): Flag[] {
  const out: Flag[] = [];
  const rows = yarnAt(d, worker, asAt);
  rows.forEach((r) => {
    if (r.bal < -Math.max(1, r.issued * 0.005)) out.push({ red: true, msg: `${r.yarn}: fabric received needs ${secKg(-r.bal)} more than was issued` });
  });
  const bal = rows.reduce((s, r) => s + Math.max(0, r.bal), 0), last = lastInward(d, worker, asAt);
  const idle = last ? daysBetween(last, asAt) : 0;
  if (bal > 1 && last && idle > 21) out.push({ red: false, msg: `No fabric received for ${idle} days — ${secKg(bal)} lying at the worker` });
  return out;
}

/* ------------------------------------------------------------------ */
/* small pieces                                                        */
/* ------------------------------------------------------------------ */

const Badge = ({ t, color, solid }: { t: string; color: string; solid?: boolean }) => (
  <View style={[s.badge, { borderColor: color, backgroundColor: solid ? color : 'transparent' }]}>
    <Text style={{ fontFamily: FONT, fontSize: 8.5, fontWeight: '800', color: solid ? '#fff' : color, letterSpacing: 0.3 }}>{t}</Text>
  </View>
);
const FlagBadge = ({ flags }: { flags: Flag[] }) =>
  flags.length ? <Badge t={`⚠ ${flags.length}`} color={flags.some((f) => f.red) ? C.over : C.amber} solid /> : null;
const Th = ({ children, flex = 1, right }: { children: React.ReactNode; flex?: number; right?: boolean }) => (
  <Text style={[ui.rowHeadText, { flex, textAlign: right ? 'right' : 'left' }]} numberOfLines={1}>{children}</Text>
);
const Td = ({ children, flex = 1, right, bold, color }: { children: React.ReactNode; flex?: number; right?: boolean; bold?: boolean; color?: string }) => (
  <Text style={[ui.rowNum, { flex, textAlign: right ? 'right' : 'left', fontWeight: bold ? '700' : '400', color: color || C.ink, fontSize: 11 }]} numberOfLines={1}>{children}</Text>
);
const kgS = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`;

/* ------------------------------------------------------------------ */
/* 8.2  Reconciliation card (a supplier's yarn account)                */
/* ------------------------------------------------------------------ */

export function ReconCard({ d, worker, asAt, L, startOpen, onLedger }: { d: JwData; worker: string; asAt: string; L: (n: number) => string; startOpen?: boolean; onLedger?: () => void }) {
  const [open, setOpen] = useState(!!startOpen);
  const rows = useMemo(() => yarnAt(d, worker, asAt), [d, worker, asAt]);
  const flags = useMemo(() => flagsOf(d, worker, asAt), [d, worker, asAt]);
  const ins = d.ins.filter((i) => i.worker_id === worker && i.date <= asAt);
  const recv = ins.reduce((a, i) => a + i.v, 0), chg = ins.reduce((a, i) => a + i.aux, 0);
  const order = d.orders.filter((o) => o.worker_id === worker).reduce((a, o) => a + o.qty, 0);
  /* every metre the supplier delivered (all categories) — the yarn was used for all of it */
  const seen: Record<string, true> = {};
  let allM = 0, waste = 0;
  d.used.forEach((u) => { if (u.worker_id !== worker || u.date > asAt) return; waste += u.wst + u.sht; if (!seen[u.inw]) { seen[u.inw] = true; allM += u.mtr; } });
  const tI = rows.reduce((a, r) => a + r.issued, 0), tU = rows.reduce((a, r) => a + r.used, 0), bal = tI - tU, last = lastInward(d, worker, asAt);
  const fact = (l: string, v: string) => (
    <View key={l} style={s.fact}><Text style={s.factL}>{l}</Text><Text style={s.factV} numberOfLines={1}>{v}</Text></View>
  );
  return (
    <View style={[ui.card, { marginBottom: 10 }]}>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" style={s.reconHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.rowT} numberOfLines={1}>{d.names[worker] || worker}</Text>
            <FlagBadge flags={flags} />
          </View>
          <Text style={s.rowS} numberOfLines={1}>{secM(recv)} DTS received{order > 0 ? ` of ${secM(order)} ordered` : ''} · as at {fmtDY(asAt)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.rowV, { color: bal < -1 ? C.over : C.ink }]}>{kgS(bal)}</Text>
          <Text style={s.rowS}>yarn balance {open ? '▴' : '▾'}</Text>
        </View>
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          {flags.map((f, i) => <Text key={i} style={[s.flagLine, { color: f.red ? C.over : '#8A5A12', backgroundColor: f.red ? '#FBEDEA' : '#FBF3E4' }]}>⚠ {f.msg}</Text>)}
          <View style={s.tHead}><Th flex={2}>Yarn</Th><Th right>kg / m</Th><Th right>Issued</Th><Th right>Used</Th><Th right>Balance</Th></View>
          {rows.map((r) => (
            <View key={r.id} style={s.tRow}>
              <Td flex={2}>{r.yarn}</Td><Td right>{allM > 0 && r.used > 0 ? (r.used / allM).toFixed(4) : '—'}</Td><Td right>{kgS(r.issued)}</Td><Td right>{kgS(r.used)}</Td>
              <Td right bold color={r.bal < -1 ? C.over : C.ink}>{kgS(r.bal)}</Td>
            </View>
          ))}
          {!rows.length ? <Text style={s.none}>No yarn challan to this supplier in this financial year.</Text> : (
            <View style={[s.tRow, { borderBottomWidth: 0 }]}><Td flex={2} bold>Total</Td><Td right>{' '}</Td><Td right bold>{kgS(tI)}</Td><Td right bold>{kgS(tU)}</Td><Td right bold color={bal < -1 ? C.over : C.ink}>{kgS(bal)}</Td></View>
          )}
          <View style={s.facts}>
            {fact('Order', order > 0 ? secM(order) : 'no job order found')}
            {fact('Woven (reported)', 'not recorded')}
            {fact('Received · DTS', secM(recv))}
            {fact('Greige at worker', 'not recorded')}
            {fact('Wastage + shortage', waste > 0 ? kgS(waste) : 'none recorded')}
            {fact('Fabric the yarn made', allM > 0 ? secM(allM) : '—')}
            {fact('Weaving charges · DTS', L(chg))}
            {fact('Last inward', last ? fmtDY(last) : '—')}
          </View>
          <Text style={s.hint}>kg / m = yarn used ÷ all fabric this supplier delivered. Yarn is issued to the supplier, not to a design, so the account covers every design woven there.</Text>
          {onLedger ? <Pressable onPress={onLedger} hitSlop={6} accessibilityRole="button"><Text style={s.link}>Open the yarn ledger ›</Text></Pressable> : null}
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 8.1  Outsourcing hub                                                */
/* ------------------------------------------------------------------ */

type HubInit = DrillInit;
type Roll = { id: string; no: string; v: number; grade: string; loc: string; remark: string; bal: number | null };

export function OutsourcingHub({
  jw, init, onState, L, fetch, onLedger,
}: {
  jw: JwState; init?: HubInit; onState?: (s: HubInit) => void; L: (n: number) => string; fetch: DtsFetch;
  onLedger: (worker: string, art: string | null, range: { period: PeriodKey; from: string; to: string }) => void;
}) {
  const t = todayS();
  const [period, setPeriod] = useState<PeriodKey>(init?.period || 'month');
  const [from, setFrom] = useState(init?.from || addDays(t, -30));
  const [to, setTo] = useState(init?.to || t);
  const [view, setView] = useState<HubView>(init?.hub?.view || 'recv');
  const [worker, setWorker] = useState<string | null>(init?.hub?.worker || null);
  const [art, setArt] = useState<string | null>(init?.hub?.art || null);
  const [chal, setChal] = useState<string | null>(init?.hub?.chal || null);
  const [chip, setChip] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [rolls, setRolls] = useState<{ uid: string; loading: boolean; error: string; items: Roll[] }>({ uid: '', loading: false, error: '', items: [] });
  const [f, u, rangeLbl] = rangeOf(period, from, to);
  const asAt = u > t ? t : u;

  useEffect(() => {
    onState?.({ period, from, to, hub: { view, worker: worker || undefined, art: art || undefined, chal: chal || undefined } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, from, to, view, worker, art, chal]);

  useEffect(() => {
    if (!chal) return;
    let alive = true;
    setRolls({ uid: chal, loading: true, error: '', items: [] });
    fetch('jobwork_rolls', undefined, t, `uid:${chal}`)
      .then((r) => alive && setRolls({
        uid: chal, loading: false, error: '',
        items: (r.items || []).map((x: any) => ({ id: str(x.id), no: str(x.no), v: num(x.v), grade: str(x.grade), loc: str(x.loc), remark: str(x.remark), bal: x.bal == null ? null : num(x.bal) })),
      }))
      .catch((e: any) => alive && setRolls({ uid: chal, loading: false, error: e?.message || 'Unable to load the rolls.', items: [] }));
    return () => { alive = false; };
  }, [chal, fetch, t]);

  const d = jw.data;
  const inR = useMemo(() => (d ? d.ins.filter((i) => i.date >= f && i.date <= u) : []), [d, f, u]);
  const outR = useMemo(() => (d ? d.outs.filter((o) => o.date >= f && o.date <= u) : []), [d, f, u]);
  const usedR = useMemo(() => (d ? d.used.filter((x) => x.date >= f && x.date <= u) : []), [d, f, u]);
  if (jw.loading || jw.error || !d) return <View style={[ui.card, { padding: 16 }]}><StateBox loading={jw.loading} error={jw.error} onRetry={jw.reload} /></View>;

  const wIn = (ls: JwIn[]) => ls.filter((i) => (!worker || i.worker_id === worker) && (!art || i.art === art));
  const wOut = (ls: JwOut[]) => ls.filter((o) => !worker || o.worker_id === worker);
  const wUsed = (ls: JwUsed[]) => ls.filter((x) => !worker || x.worker_id === worker);
  /* the part of an inward's yarn that belongs to a design (by its share of the inward's metres) */
  const shareOf = (x: JwUsed, a: string | null) => (a ? x.designs.filter((g) => g[0] === a).reduce((s2, g) => s2 + g[1], 0) : 1);
  const sIn = wIn(inR), sOut = wOut(outR), sUsed = wUsed(usedR);
  const recv = sIn.reduce((a, i) => a + i.v, 0), chg = sIn.reduce((a, i) => a + i.aux, 0);
  const issued = sOut.reduce((a, o) => a + o.kg, 0), usedT = sUsed.reduce((a, x) => a + usedKg(x), 0);
  const ws = workersOf(d);
  const closing = worker ? balAt(d, worker, asAt) : ws.reduce((a, w) => a + Math.max(0, balAt(d, w, asAt)), 0);
  const shortAt = (worker ? [worker] : ws).filter((w) => yarnAt(d, w, asAt).some((r) => r.bal < -1)).length;
  const inwardN = new Set(sIn.map((i) => i.uid)).size;

  const go = (w: string | null, a: string | null = null, c: string | null = null) => { setWorker(w); setArt(a); setChal(c); setChip(null); };
  const range = { period, from, to };
  const onRange = (c: { period?: PeriodKey; from?: string; to?: string }) => { if (c.period) setPeriod(c.period); if (c.from) setFrom(c.from); if (c.to) setTo(c.to); setOpenDay(null); };

  const tile = (k: HubView, label: string, value: string, sub: string, color: string, sub2?: string) => (
    <Pressable key={k} onPress={() => setView(k)} accessibilityRole="button" accessibilityState={{ selected: view === k }}
      style={[s.tile, view === k && { borderColor: color, borderWidth: 2 }]}>
      <Text style={s.tileL}>{label}</Text>
      <Text style={[s.tileV, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={s.tileS} numberOfLines={1}>{sub}</Text>
      {sub2 ? <Text style={[s.tileS, { color: C.over, fontWeight: '700' }]} numberOfLines={1}>{sub2}</Text> : null}
    </Pressable>
  );
  const fig = (m: number, c: number, y: number, b: number) =>
    view === 'recv' ? secM(m) : view === 'chg' ? L(c) : view === 'yout' ? kgS(y) : kgS(b);
  const VIEW_LBL: Record<HubView, string> = { recv: 'Received', chg: 'Charges', yout: 'Yarn issued', ybal: 'Yarn at suppliers' };
  const ledgerLine = (w: string, a: string | null) => (
    <Pressable onPress={() => onLedger(w, a, range)} hitSlop={4} accessibilityRole="button">
      <Text style={s.quiet}>Yarn at supplier {kgS(balAt(d, w, asAt))} · <Text style={{ color: C.bill, fontWeight: '700' }}>ledger ›</Text></Text>
    </Pressable>
  );

  /* ---------- the list, by level ---------- */
  let list: React.ReactNode;
  if (!worker) {
    /* Suppliers */
    const rows = ws.map((w) => {
      const li = inR.filter((i) => i.worker_id === w), last = lastInward(d, w, asAt);
      return {
        w, flags: flagsOf(d, w, asAt), designs: new Set(li.map((i) => i.art)).size, chals: new Set(li.map((i) => i.uid)).size, last,
        m: li.reduce((a, i) => a + i.v, 0), c: li.reduce((a, i) => a + i.aux, 0), y: outR.filter((o) => o.worker_id === w).reduce((a, o) => a + o.kg, 0), b: balAt(d, w, asAt),
      };
    }).filter((r) => r.m || r.y || Math.abs(r.b) > 0.5)
      .sort((a, b) => (view === 'recv' ? b.m - a.m : view === 'chg' ? b.c - a.c : view === 'yout' ? b.y - a.y : b.b - a.b));
    list = rows.length ? rows.map((r) => (
      <Pressable key={r.w} onPress={() => go(r.w)} accessibilityRole="button" style={({ pressed }) => [s.row, pressed && { backgroundColor: '#F9F7F4' }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={s.rowT} numberOfLines={1}>{d.names[r.w]}</Text><FlagBadge flags={r.flags} /></View>
          <Text style={s.rowS} numberOfLines={1}>{pl(r.designs, 'designs')} · {pl(r.chals, 'challans')} · last inward {r.last ? fmtD(r.last) : '—'}</Text>
          {ledgerLine(r.w, null)}
        </View>
        <Text style={[s.rowV, view === 'ybal' && r.b < -1 ? { color: C.over } : null]}>{fig(r.m, r.c, r.y, r.b)}</Text>
        <Text style={s.chev}>›</Text>
      </Pressable>
    )) : <Text style={s.none}>No DTS job work in this period.</Text>;
  } else if (!art) {
    /* Designs (jobs) of the supplier */
    if (view === 'ybal') {
      list = <View style={{ padding: 10 }}><ReconCard d={d} worker={worker} asAt={asAt} L={L} startOpen onLedger={() => onLedger(worker, null, range)} /></View>;
    } else if (view === 'yout') {
      list = sOut.length ? sOut.slice().sort((a, b) => b.date.localeCompare(a.date)).map((o) => (
        <View key={o.id} style={s.row}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.rowT} numberOfLines={1}>{o.no || o.id} <Text style={s.rowS}>· {fmtDY(o.date)}</Text></Text>
            <Text style={s.rowS} numberOfLines={1}>{o.yarn}</Text>
          </View>
          <Text style={[s.rowV, { color: C.today }]}>+{kgS(o.kg)}</Text>
        </View>
      )) : <Text style={s.none}>No yarn challan to this supplier in this period.</Text>;
    } else {
      const g: Record<string, { art: string; cat: string; m: number; c: number; uids: Set<string>; y: number }> = {};
      inR.filter((i) => i.worker_id === worker && (!chip || i.art === chip)).forEach((i) => {
        const r = g[i.art] || (g[i.art] = { art: i.art, cat: i.cat, m: 0, c: 0, uids: new Set(), y: 0 });
        r.m += i.v; r.c += i.aux; r.uids.add(i.uid);
      });
      usedR.filter((x) => x.worker_id === worker).forEach((x) => x.designs.forEach(([a, sh]) => { if (g[a]) g[a].y += usedKg(x) * sh; }));
      const rows = Object.values(g).sort((a, b) => (view === 'chg' ? b.c - a.c : b.m - a.m));
      list = rows.length ? rows.map((r) => {
        const ord = d.orders.filter((o) => o.worker_id === worker && o.art === r.art), oq = ord.reduce((a, o) => a + o.qty, 0);
        const all = d.ins.filter((i) => i.worker_id === worker && i.art === r.art).reduce((a, i) => a + i.v, 0);
        return (
          <Pressable key={r.art} onPress={() => go(worker, r.art)} accessibilityRole="button" style={({ pressed }) => [s.row, pressed && { backgroundColor: '#F9F7F4' }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={s.rowT} numberOfLines={1}>{r.art}</Text><Badge t={r.cat} color={DTS.color} /></View>
              <Text style={s.rowS} numberOfLines={1}>{ord.length ? `${ord.map((o) => o.po).join(', ')} · ` : ''}{pl(r.uids.size, 'challans')} · ₹{r.m > 0 ? (r.c / r.m).toFixed(2) : '0'}/m</Text>
              <Text style={s.rowS} numberOfLines={1}>{oq > 0 ? `order ${secM(oq)} · ` : ''}received {secM(all)} in all · yarn used {kgS(r.y)}</Text>
            </View>
            <Text style={s.rowV}>{view === 'chg' ? L(r.c) : secM(r.m)}</Text>
            <Text style={s.chev}>›</Text>
          </Pressable>
        );
      }) : <Text style={s.none}>No DTS fabric received from this supplier in this period.</Text>;
    }
  } else if (!chal) {
    /* Challans of the job */
    const rows = sIn.slice().sort((a, b) => b.date.localeCompare(a.date));
    list = rows.length ? rows.map((i) => {
      const y = usedR.filter((x) => x.inw === i.uid).reduce((a, x) => a + usedKg(x) * shareOf(x, art), 0);
      return (
        <Pressable key={i.id} onPress={() => go(worker, art, i.uid)} accessibilityRole="button" style={({ pressed }) => [s.row, pressed && { backgroundColor: '#F9F7F4' }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.rowT} numberOfLines={1}>Inward {i.no || i.uid}{i.bill ? ` · inv ${i.bill}` : ''}</Text><Badge t="RECEIVED" color={C.today} />
            </View>
            <Text style={s.rowS} numberOfLines={1}>{fmtDY(i.date)}{i.chal ? ` · challan ${i.chal}` : ''} · ₹{i.rate.toFixed(2)} job rate · {pl(i.rolls, 'rolls')}{i.grade ? ` · ${i.grade}` : ''}</Text>
            <Text style={s.rowS} numberOfLines={1}>yarn used {kgS(y)}{i.shade ? ` · ${i.shade}` : ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}><Text style={s.rowV}>{secM(i.v)}</Text><Text style={s.rowS}>{L(i.aux)}</Text></View>
          <Text style={s.chev}>›</Text>
        </Pressable>
      );
    }) : <Text style={s.none}>No inward of this design in this period.</Text>;
  } else {
    /* Rolls of the inward challan */
    const head = d.ins.filter((i) => i.uid === chal && (!art || i.art === art));
    const hm = head.reduce((a, i) => a + i.v, 0), hr = head.reduce((a, i) => a + i.rolls, 0);
    list = (
      <>
        {rolls.uid !== chal || rolls.loading ? <StateBox loading minHeight={60} /> : rolls.error ? <StateBox error={rolls.error} minHeight={60} /> : null}
        {rolls.uid === chal && !rolls.loading && !rolls.error && !rolls.items.length ? (
          <Text style={s.none}>Roll cards are not booked in the ERP for this inward. The challan carries {pl(hr, 'rolls')} · {secM(hm)}{head[0]?.grade ? ` · grade ${head[0].grade}` : ''} — no roll-wise split is shown, because none is recorded.</Text>
        ) : null}
        {rolls.uid === chal ? rolls.items.map((r) => (
          <View key={r.id} style={s.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.rowT} numberOfLines={1}>Roll {r.no}</Text>
                <Badge t={r.grade ? `GRADE ${r.grade}` : 'NOT GRADED'} color={r.grade ? C.today : C.mut} />
              </View>
              <Text style={s.rowS} numberOfLines={1}>{[head[0] ? `received ${fmtDY(head[0].date)}` : '', head[0]?.shade, r.loc ? `location ${r.loc}` : '', r.bal != null ? (r.bal > 0 ? 'in stock' : 'issued') : '', r.remark].filter(Boolean).join(' · ')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}><Text style={s.rowV}>{secM(r.v)}</Text>{hm > 0 ? <Text style={s.rowS}>{L((head.reduce((a, i) => a + i.aux, 0) * r.v) / hm)}</Text> : null}</View>
          </View>
        )) : null}
      </>
    );
  }

  /* ---------- design chips (supplier level) ---------- */
  const chips = worker && !art && (view === 'recv' || view === 'chg') ? (() => {
    const g: Record<string, { m: number; y: number }> = {};
    inR.filter((i) => i.worker_id === worker).forEach((i) => { (g[i.art] || (g[i.art] = { m: 0, y: 0 })).m += i.v; });
    usedR.filter((x) => x.worker_id === worker).forEach((x) => x.designs.forEach(([a, sh]) => { if (g[a]) g[a].y += usedKg(x) * sh; }));
    const ks = Object.keys(g).sort((a, b) => g[b].m - g[a].m);
    return ks.length > 1 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
        {ks.map((k) => (
          <Pressable key={k} onPress={() => setChip(chip === k ? null : k)} accessibilityRole="button" style={[ui.chip, chip === k && ui.chipOn]}>
            <Text style={[ui.chipText, chip === k && { color: '#fff' }]}>{k} · {secM(g[k].m)} · {kgS(g[k].y)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    ) : null;
  })() : null;

  /* ---------- date-wise table ---------- */
  const monthly = daysBetween(f, u) + 1 > 62;
  const keyOf = (dt: string) => (monthly ? dt.slice(0, 7) : dt);
  const days: Record<string, { m: number; c: number; yo: number; yu: number }> = {};
  const day = (k: string) => days[k] || (days[k] = { m: 0, c: 0, yo: 0, yu: 0 });
  sIn.forEach((i) => { const r = day(keyOf(i.date)); r.m += i.v; r.c += i.aux; });
  sOut.forEach((o) => { day(keyOf(o.date)).yo += o.kg; });
  sUsed.forEach((x) => { day(keyOf(x.date)).yu += usedKg(x) * shareOf(x, art); });
  const dayKeys = Object.keys(days).sort().reverse();

  return (
    <View style={{ paddingBottom: 16 }}>
      <RangeBar period={period} from={from} to={to} onChange={onRange} />
      <Text style={s.heading}>OUTSOURCED WEAVING — {rangeLbl}{worker ? ` · ${d.names[worker] || worker}` : ''}{art ? ` · ${art}` : ''}</Text>
      {f < d.fyFrom ? <Text style={s.warn}>Dates before {fmtDY(d.fyFrom)} are in the previous financial year's books and are not shown here.</Text> : null}
      {d.yarnError ? <Text style={s.warn}>The yarn account could not be read ({d.yarnError.slice(0, 140)}) — fabric received and charges are shown; yarn figures are blank.</Text> : null}

      <View style={s.tiles}>
        {tile('recv', 'RECEIVED', secM(recv), pl(inwardN, 'inward challans'), C.today)}
        {tile('chg', 'CHARGES', L(chg), recv > 0 ? `₹${(chg / recv).toFixed(2)} per metre` : '—', T.copper)}
        {tile('yout', 'YARN ISSUED', kgS(issued), `${pl(new Set(sOut.filter((o) => !o.open).map((o) => o.id.split('|')[0])).size, 'yarn challans')} · ${kgS(usedT)} used`, C.bill)}
        {tile('ybal', 'YARN AT SUPPLIERS', kgS(closing), `closing · ${fmtD(asAt)}`, closing < -1 ? C.over : C.prod, shortAt ? `short at ${shortAt}` : undefined)}
      </View>

      <View style={s.crumbs}>
        <Pressable onPress={() => go(null)} hitSlop={6}><Text style={[s.crumb, { color: worker ? DTS.color : C.ink }]}>Suppliers</Text></Pressable>
        {worker ? <><Text style={s.sep}>›</Text><Pressable onPress={() => go(worker)} hitSlop={6} style={{ flexShrink: 1 }}><Text style={[s.crumb, { color: art ? DTS.color : C.ink }]} numberOfLines={1}>{d.names[worker] || worker}</Text></Pressable></> : null}
        {art ? <><Text style={s.sep}>›</Text><Pressable onPress={() => go(worker, art)} hitSlop={6} style={{ flexShrink: 1 }}><Text style={[s.crumb, { color: chal ? DTS.color : C.ink }]} numberOfLines={1}>{art}</Text></Pressable></> : null}
        {chal ? <><Text style={s.sep}>›</Text><Text style={[s.crumb, { color: C.ink }]} numberOfLines={1}>Inward {d.ins.find((i) => i.uid === chal)?.no || chal}</Text></> : null}
      </View>
      {chips}

      <View style={[ui.card, { marginBottom: 10 }]}>
        <View style={s.listHead}>
          <Text style={s.listHeadT}>{chal ? 'Rolls' : art ? 'Inward challans' : worker ? (view === 'yout' ? 'Yarn challans' : view === 'ybal' ? 'Yarn reconciliation' : 'Designs') : 'Suppliers'} · {VIEW_LBL[view]}</Text>
          <Text style={s.listHeadT}>{fig(recv, chg, issued, closing)}</Text>
        </View>
        {list}
        {worker && art && !chal ? <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>{ledgerLine(worker, art)}</View> : null}
      </View>

      {!worker && view === 'ybal' ? ws.filter((w) => Math.abs(balAt(d, w, asAt)) > 0.5 || flagsOf(d, w, asAt).length).map((w) => (
        <ReconCard key={w} d={d} worker={w} asAt={asAt} L={L} onLedger={() => onLedger(w, null, range)} />
      )) : null}

      <View style={[ui.card, { marginBottom: 10 }]}>
        <View style={s.listHead}><Text style={s.listHeadT}>Date-wise{monthly ? ' · by month' : ''}</Text></View>
        <View style={[s.tHead, { paddingHorizontal: 12 }]}><Th flex={1.2}>Date</Th><Th right>Recv m</Th><Th right>Charges</Th><Th right>Yarn out</Th><Th right>Yarn used</Th></View>
        {dayKeys.map((k) => {
          const r = days[k], open = openDay === k;
          return (
            <View key={k}>
              <Pressable onPress={() => setOpenDay(open ? null : k)} accessibilityRole="button" style={[s.tRow, { paddingHorizontal: 12 }]}>
                <Td flex={1.2} bold>{monthly ? mLbl(k) : fmtD(k)} {open ? '▴' : '▾'}</Td><Td right>{r.m ? secM(r.m) : '—'}</Td><Td right>{r.c ? L(r.c) : '—'}</Td>
                <Td right color={C.today}>{r.yo ? `+${kgS(r.yo)}` : '—'}</Td><Td right>{r.yu ? kgS(r.yu) : '—'}</Td>
              </Pressable>
              {open ? (
                <View style={s.dayOpen}>
                  {sIn.filter((i) => keyOf(i.date) === k).map((i) => (
                    <Pressable key={i.id} onPress={() => go(i.worker_id, i.art, i.uid)} hitSlop={2}><Text style={s.dayLine} numberOfLines={1}>▸ Inward {i.no} · {d.names[i.worker_id]} · {i.art} · {secM(i.v)} · {L(i.aux)}</Text></Pressable>
                  ))}
                  {sOut.filter((o) => keyOf(o.date) === k).map((o) => (
                    <Pressable key={o.id} onPress={() => { go(o.worker_id); setView('yout'); }} hitSlop={2}><Text style={s.dayLine} numberOfLines={1}>▸ Yarn out {o.no} · {d.names[o.worker_id]} · {o.yarn} · +{kgS(o.kg)}</Text></Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
        {!dayKeys.length ? <Text style={s.none}>Nothing in this period.</Text> : (
          <View style={[s.tRow, { paddingHorizontal: 12, borderBottomWidth: 0, backgroundColor: T.bg }]}>
            <Td flex={1.2} bold>GRAND TOTAL</Td><Td right bold>{secM(recv)}</Td><Td right bold>{L(chg)}</Td><Td right bold>+{kgS(issued)}</Td>
            <Td right bold>{kgS(sUsed.reduce((a, x) => a + usedKg(x) * shareOf(x, art), 0))}</Td>
          </View>
        )}
      </View>

      {d.prevNote ? <Text style={s.warn}>{d.prevNote}</Text> : null}
      <Text style={s.hint}>
        Read from the ERP this year: {pl(num(d.found.inward_lines), 'DTS job-work inward lines')} · {pl(num(d.found.suppliers), 'suppliers')} ·{' '}
        {pl(num(d.found.yarn_challan_lines), 'yarn challan lines')} · {pl(num(d.found.yarn_used_lines), 'yarn-used lines')}.{'\n'}
        Yarn at a supplier is worked out automatically: what they still held at the end of last financial year (carried in, read from
        that year's books), plus the yarn challans issued to them, less the yarn their fabric inwards used (consumed + wastage +
        shortage of each inward's yarn annexure — the ERP's own deduction), shown as the closing stock at the end of the range. A negative balance
        means the fabric received needed more yarn than was issued. Yarn is issued to a supplier, not to a design, so a balance is per supplier;
        a design's "yarn used" is its share of each inward by metres.
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 8.3  Yarn ledger                                                    */
/* ------------------------------------------------------------------ */

export function YarnLedger({ jw, init, onState }: { jw: JwState; init?: HubInit; onState?: (s: HubInit) => void }) {
  const t = todayS();
  const [period, setPeriod] = useState<PeriodKey>(init?.period || 'month');
  const [from, setFrom] = useState(init?.from || addDays(t, -30));
  const [to, setTo] = useState(init?.to || t);
  const worker = init?.hub?.worker || null, art = init?.hub?.art || null;
  const [f, u, rangeLbl] = rangeOf(period, from, to);
  const asAt = u > t ? t : u;
  useEffect(() => {
    onState?.({ period, from, to, hub: init?.hub });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, from, to]);
  const d = jw.data;
  const calc = useMemo(() => {
    if (!d) return null;
    const mine = <X extends { worker_id: string }>(ls: X[]) => ls.filter((x) => !worker || x.worker_id === worker);
    const open = balAt(d, worker, addDays(f, -1));
    const outs = mine(d.outs).filter((o) => o.date >= f && o.date <= u), used = mine(d.used).filter((x) => x.date >= f && x.date <= u);
    type E = { k: string; date: string; ord: number; title: string; sub: string; kg: number; mine: boolean };
    const es: E[] = [];
    outs.forEach((o) => es.push({ k: `o${o.id}`, date: o.date, ord: 0, title: o.open ? 'Opening · carried from last financial year' : `Yarn out ${o.no}`, sub: `${o.yarn}${worker ? '' : ` · ${d.names[o.worker_id] || ''}`}`, kg: o.kg, mine: false }));
    used.forEach((x, i) => {
      const ds = x.designs.map((g) => g[0]).join(', ');
      es.push({
        k: `u${x.inw}${x.yarn_id}${i}`, date: x.date, ord: 1, title: `Consumed by inward ${x.no}`,
        sub: `${x.yarn} · ${secM(x.mtr)} × ${x.mtr > 0 ? (usedKg(x) / x.mtr).toFixed(4) : '0'} kg/m${ds ? ` · ${ds}` : ''}${x.bill ? ` · inv ${x.bill}` : ''}${x.wst + x.sht > 0 ? ` · incl. ${kgS(x.wst + x.sht)} wastage / shortage` : ''}${worker ? '' : ` · ${d.names[x.worker_id] || ''}`}`,
        kg: -usedKg(x), mine: !!art && x.designs.some((g) => g[0] === art),
      });
    });
    es.sort((a, b) => a.date.localeCompare(b.date) || a.ord - b.ord);
    let run = open;
    const rows = es.map((e) => { run += e.kg; return { ...e, bal: run }; });
    return {
      open, rows, close: run, issued: outs.reduce((a, o) => a + o.kg, 0), outN: new Set(outs.map((o) => o.id.split('|')[0])).size,
      used: used.reduce((a, x) => a + usedKg(x), 0), inwN: new Set(used.map((x) => x.inw)).size, byYarn: yarnAt(d, worker, asAt),
    };
  }, [d, worker, art, f, u, asAt]);
  if (jw.loading || jw.error || !d || !calc) return <View style={[ui.card, { padding: 16 }]}><StateBox loading={jw.loading} error={jw.error} onRetry={jw.reload} /></View>;

  const tile = (l: string, v: string, sub: string, color: string) => (
    <View key={l} style={s.tile}><Text style={s.tileL}>{l}</Text><Text style={[s.tileV, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{v}</Text><Text style={s.tileS} numberOfLines={1}>{sub}</Text></View>
  );
  const tI = calc.byYarn.reduce((a, r) => a + r.issued, 0), tU = calc.byYarn.reduce((a, r) => a + r.used, 0);
  return (
    <View style={{ paddingBottom: 16 }}>
      <RangeBar period={period} from={from} to={to} onChange={(c) => { if (c.period) setPeriod(c.period); if (c.from) setFrom(c.from); if (c.to) setTo(c.to); }} />
      <Text style={s.heading}>YARN AT {worker ? (d.names[worker] || worker).toUpperCase() : 'ALL SUPPLIERS'} · {art ? `${art} marked` : 'all DTS designs'} — {rangeLbl}</Text>
      {f < d.fyFrom ? <Text style={s.warn}>The opening balance counts this financial year's yarn challans and inwards only (from {fmtDY(d.fyFrom)}).</Text> : null}
      {d.yarnError ? <Text style={s.warn}>The yarn account could not be read: {d.yarnError.slice(0, 160)}</Text> : null}
      <View style={s.tiles}>
        {tile('OPENING', kgS(calc.open), `as at ${fmtD(addDays(f, -1))}`, C.ink)}
        {tile('ISSUED', `+${kgS(calc.issued)}`, pl(calc.outN, 'challans'), C.today)}
        {tile('CONSUMED', kgS(calc.used), pl(calc.inwN, 'inwards'), T.copper)}
        {tile('CLOSING', kgS(calc.close), `as at ${fmtD(asAt)}`, calc.close < -1 ? C.over : C.prod)}
      </View>

      <View style={[ui.card, { marginBottom: 10 }]}>
        <View style={s.listHead}><Text style={s.listHeadT}>By yarn · as at {fmtDY(asAt)}</Text></View>
        <View style={[s.tHead, { paddingHorizontal: 12 }]}><Th flex={2}>Yarn</Th><Th right>Issued</Th><Th right>Consumed</Th><Th right>Balance</Th></View>
        {calc.byYarn.map((r) => (
          <View key={r.id} style={[s.tRow, { paddingHorizontal: 12 }]}><Td flex={2}>{r.yarn}</Td><Td right>{kgS(r.issued)}</Td><Td right>{kgS(r.used)}</Td><Td right bold color={r.bal < -1 ? C.over : C.ink}>{kgS(r.bal)}</Td></View>
        ))}
        {calc.byYarn.length ? (
          <View style={[s.tRow, { paddingHorizontal: 12, borderBottomWidth: 0, backgroundColor: T.bg }]}><Td flex={2} bold>Total</Td><Td right bold>{kgS(tI)}</Td><Td right bold>{kgS(tU)}</Td><Td right bold color={tI - tU < -1 ? C.over : C.ink}>{kgS(tI - tU)}</Td></View>
        ) : <Text style={s.none}>No yarn challan in this financial year.</Text>}
      </View>

      <View style={[ui.card, { marginBottom: 10 }]}>
        <View style={s.listHead}><Text style={s.listHeadT}>Ledger</Text></View>
        <View style={[s.tHead, { paddingHorizontal: 12 }]}><Th>Date</Th><Th flex={3.2}>Entry · yarn · design</Th><Th right flex={1.2}>kg</Th><Th right flex={1.2}>Balance</Th></View>
        <View style={[s.tRow, { paddingHorizontal: 12, backgroundColor: T.bg }]}><Td>{fmtD(f)}</Td><Td flex={3.2} bold>Opening balance</Td><Td right flex={1.2}>{' '}</Td><Td right flex={1.2} bold>{kgS(calc.open)}</Td></View>
        {calc.rows.slice(0, 400).map((e) => (
          <View key={e.k} style={[s.tRow, { paddingHorizontal: 12, alignItems: 'flex-start' }, e.mine && { backgroundColor: '#F4F7FB' }]}>
            <Td>{fmtD(e.date)}</Td>
            <View style={{ flex: 3.2, minWidth: 0 }}>
              <Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.ink }} numberOfLines={1}>{e.title}</Text>
              <Text style={s.rowS} numberOfLines={2}>{e.sub}</Text>
            </View>
            <Td right flex={1.2} color={e.kg >= 0 ? C.today : T.copper} bold>{e.kg >= 0 ? '+' : ''}{kgS(e.kg)}</Td>
            <Td right flex={1.2} color={e.bal < -1 ? C.over : C.ink}>{kgS(e.bal)}</Td>
          </View>
        ))}
        {calc.rows.length > 400 ? <Text style={s.none}>+{calc.rows.length - 400} more entries — choose a shorter period to list them.</Text> : null}
        <View style={[s.tRow, { paddingHorizontal: 12, borderBottomWidth: 0, backgroundColor: T.bg }]}><Td>{fmtD(asAt)}</Td><Td flex={3.2} bold>Closing balance</Td><Td right flex={1.2}>{' '}</Td><Td right flex={1.2} bold color={calc.close < -1 ? C.over : C.ink}>{kgS(calc.close)}</Td></View>
      </View>

      <Text style={s.hint}>
        Outward entries are the yarn challans to the supplier. Consumption entries are automatic: each fabric inward's yarn annexure (consumed +
        wastage + shortage), yarn by yarn, as the ERP deducts it. The balance is what the supplier should be holding — negative means the fabric
        received needs more yarn than was issued. Opening + issued − consumed = closing for any range.{art ? ` Lines shaded blue are inwards that carried ${art}; yarn is issued to the supplier, not to a design, so the balance is the supplier's.` : ''}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  heading: { fontFamily: FONT, fontSize: 10, fontWeight: '800', color: C.mut, letterSpacing: 0.6, marginHorizontal: 2, marginBottom: 8 },
  warn: { fontFamily: FONT, fontSize: 10.5, color: '#8A5A12', backgroundColor: '#FBF3E4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8, lineHeight: 15 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tile: { flexGrow: 1, flexBasis: 150, minWidth: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  tileL: { fontFamily: FONT, fontSize: 8.5, fontWeight: '800', color: C.mut, letterSpacing: 0.5 },
  tileV: { fontFamily: FONT, fontSize: 17, fontWeight: '700', marginTop: 3, fontVariant: ['tabular-nums'] },
  tileS: { fontFamily: FONT, fontSize: 9.5, color: C.faint, marginTop: 2 },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginHorizontal: 2, marginBottom: 8 },
  crumb: { fontFamily: FONT, fontSize: 11.5, fontWeight: '800' },
  sep: { color: C.faint, fontSize: 12 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: T.nav },
  listHeadT: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: '#fff', flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.hair, minHeight: 44 },
  rowT: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.ink, flexShrink: 1 },
  rowS: { fontFamily: FONT, fontSize: 10, color: C.faint, marginTop: 2 },
  rowV: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  quiet: { fontFamily: FONT, fontSize: 10, color: C.mut, marginTop: 3 },
  chev: { fontSize: 12, color: C.faint, width: 10, textAlign: 'right' },
  badge: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  none: { fontFamily: FONT, fontSize: 11.5, color: C.mut, paddingHorizontal: 12, paddingVertical: 14, lineHeight: 17 },
  tHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: T.hair },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: T.hair },
  dayOpen: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: T.bg, borderBottomWidth: 1, borderBottomColor: T.hair },
  dayLine: { fontFamily: FONT, fontSize: 10.5, color: C.bill, paddingVertical: 3 },
  reconHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  flagLine: { fontFamily: FONT, fontSize: 10.5, fontWeight: '700', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6, marginBottom: 6, lineHeight: 15 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 6 },
  fact: { width: '50%', paddingVertical: 4, paddingRight: 8 },
  factL: { fontFamily: FONT, fontSize: 8.5, fontWeight: '800', color: C.mut, letterSpacing: 0.3, textTransform: 'uppercase' },
  factV: { fontFamily: FONT, fontSize: 11.5, fontWeight: '700', color: C.ink, marginTop: 1 },
  hint: { fontFamily: FONT, fontSize: 10, color: C.faint, lineHeight: 15, paddingHorizontal: 4, paddingTop: 6 },
  link: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.bill, paddingTop: 8 },
});
