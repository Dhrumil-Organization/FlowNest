// FILE: src/screens/reports/realCostChain/RealCostChainView.tsx
// Reports → Real Costing Chain — the ERP Designing artifact's "Real costing chain" on live ERP data.
//
//   Top-down: month (or whole login year) total → design → beam. Assumed (the design's latest costing) shown against
//   the actual gathered live: RM · weaving at the conversion rate of the month each taka was checked · warp shortage
//   of closed beams · finish shrink from mill returns · fent 3 % · processing. Tick designs to compare a subset.
//
// Rights: reports.real_costing (view). Data: POST /api/real_cost_chain/report (RealCostChainController) with the
// login's group / property / year from the header.

import { RealCostChainAPI } from '@/src/api/legacyClient';
import { Btn } from '@/src/components/StockVerificationNEW/ui';
import { useBusinessContext } from '@/src/core/business';
import { T } from '@/src/theme';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../../yarnHub/yarnHubModel';
import {
  ChainData,
  compareRows,
  CostHead,
  costTree,
  dateFull,
  dateShort,
  DesignChain,
  errText,
  fm,
  isoOf,
  isRange,
  matches,
  money,
  money2,
  moneyC,
  monthLbl,
  normalizeChain,
  periodBody,
  summaryOf,
  unwrap,
} from './realCostChainModel';

/** label of a period value: month chip, or 'DD Mon YY – DD Mon YY' for a date range */
const periodLbl = (p: string) => (isRange(p) ? `${dateFull(p.slice(2, 12))} – ${dateFull(p.slice(13, 23))}` : monthLbl(p));

const MF = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" }) as string;
const GREEN = '#2A6044';
/** cost breakup column widths (label · estimated · actual · Δ) */
const CW = { l: 2.6, lNarrow: 1.5, n: 1, d: 0.8 };

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function RealCostChainView() {
  const { prpGroup, prpCode, yearNo } = useBusinessContext();
  const yearno = String(parseInt(String(yearNo), 10) || '');
  const ready = !!(prpGroup && prpCode && yearno);

  const [cw, setCw] = useState(0);
  const narrow = cw > 0 && cw < 560;
  // default: the CURRENT month ('current' → the server answers with that month, or the login year's last month)
  const [month, setMonth] = useState('current');
  const [data, setData] = useState<ChainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** the shown figures are the last ones built; new ones are being built in the background */
  const [updating, setUpdating] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  /** expanded cost heads: "designKey|head" → open */
  const [exp, setExp] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  const [showRates, setShowRates] = useState(false);
  /** last-taka date range typed by the user (DD-MM-YYYY or YYYY-MM-DD) */
  const [rFrom, setRFrom] = useState('');
  const [rTo, setRTo] = useState('');
  const [rErr, setRErr] = useState('');
  const req = useRef(0);

  /**
   * Opening a period: the server answers at once — figures of the last 10 minutes, or the LAST figures built for that
   * period (stale) — and if stale, new figures are built in the background (rebuild) and swapped in when ready.
   * pull / Refresh = fresh: everything built again now, no cache at all.
   */
  const load = useCallback(async (m: string, pull = false) => {
    if (!ready) return;
    const id = ++req.current;
    pull ? setRefreshing(true) : setLoading(true);
    setErr('');
    setUpdating(false);
    try {
      const d = normalizeChain(unwrap(await RealCostChainAPI.report({ prptype: prpGroup, prpcode: prpCode, yearno, ...periodBody(m), ...(pull ? { fresh: 1 } : {}) })));
      if (id !== req.current) return;
      setData(d);
      if (m === 'current') setMonth(d.month);   // the chip of the month the server used
      if (d.stale) {
        // shown at once; the new figures come in the background (another period picked meanwhile → dropped)
        setUpdating(true);
        RealCostChainAPI.report({ prptype: prpGroup, prpcode: prpCode, yearno, ...(isRange(m) ? periodBody(m) : { month: d.month }), rebuild: 1 })
          .then((r) => { if (id === req.current) setData(normalizeChain(unwrap(r))); })
          .catch(() => { /* keep the last figures; Refresh can try again */ })
          .finally(() => { if (id === req.current) setUpdating(false); });
      }
    } catch (e) {
      if (id === req.current) setErr(errText(e, 'Unable to load the real cost chain.'));
    } finally {
      if (id === req.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [prpGroup, prpCode, yearno, ready]);

  useFocusEffect(
    useCallback(() => {
      setData(null);
      setOpen(null);
      setSel({});
      setMonth('current');
      void load('current');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpGroup, prpCode, yearno]),
  );

  const pickMonth = (m: string) => {
    if (m === month) return;
    setMonth(m);
    setOpen(null);
    void load(m);
  };

  /** Apply the From–To range: beams whose LAST TAKA was checked in it */
  const applyRange = () => {
    const f = isoOf(rFrom);
    const t = isoOf(rTo);
    if (!f || !t) { setRErr('Enter both dates as DD-MM-YYYY.'); return; }
    if (f > t) { setRErr('From date is after To date.'); return; }
    setRErr('');
    const p = `R:${f}:${t}`;
    setMonth(p);
    setOpen(null);
    void load(p);
  };

  const rows = useMemo(() => (data ? data.designs.filter((d) => matches(`${d.dsncode} ${d.name}`, q)) : []), [data, q]);
  const chosen = rows.filter((r) => sel[r.key]);
  const shown = chosen.length ? chosen : rows;
  const sum = summaryOf(shown);
  const noCosting = rows.filter((r) => !r.has_costing && r.made > 0).length;

  if (!ready) {
    return <View style={st.center}><Text style={st.muted}>Select the group and year in the header first.</Text></View>;
  }

  /* ------------------------------ pieces ------------------------------ */
  const Cmp = ({ asm, act, unit }: { asm: number; act: number; unit?: 'cr' }) => {
    const d = act - asm;
    const up = d > 0;
    const f = unit === 'cr' ? moneyC : money;
    return (
      <View style={st.cmp}>
        <Text style={st.cmpAsm}>{f(asm)}</Text>
        <Text style={st.cmpArrow}>→</Text>
        <Text style={st.cmpAct}>{f(act)}</Text>
        <View style={{ flex: 1 }} />
        <Text style={[st.cmpDelta, { color: up ? T.red : GREEN }]}>{up ? '▲' : '▼'} {f(Math.abs(d))}</Text>
      </View>
    );
  };
  const stat = (label: string, value: string, color?: string) => (
    <View style={st.stat}>
      <Text style={[st.statVal, color ? { color } : null]} numberOfLines={1}>{value}</Text>
      <Text style={st.statLbl}>{label}</Text>
    </View>
  );

  /** Δ cell: actual − estimated (red = costlier than estimated, green = cheaper, — = no difference / no estimate) */
  const deltaCell = (asm: number | null, act: number | null, has: boolean, small = false) => {
    const ok = has && asm != null && act != null;
    const dd = ok ? (act as number) - (asm as number) : 0;
    const zero = !ok || Math.abs(dd) < 0.005;
    return (
      <Text style={[st.cNum, st.r, { flex: CW.d, fontSize: small ? 10 : 10.5, fontWeight: '800', color: zero ? C.faint : dd > 0 ? T.red : GREEN }]}>
        {zero ? '—' : (dd > 0 ? '+' : '−') + money2(Math.abs(dd)).replace('₹', '')}
      </Text>
    );
  };

  /** expandable cost heads: Raw material → Weaving → Greige → Dyeing → Brokerage / packing → Final */
  const costBreakup = (d: DesignChain, heads: CostHead[]) => {
    const has = !!d.assumed;
    const lw = narrow ? CW.lNarrow : CW.l;
    return (
      <View>
        <View style={[st.gRow, st.cHeadRow]}>
          <Text style={[st.cTitle, { flex: lw }]}>COST BREAKUP <Text style={st.cTitleSub}>· per metre</Text></Text>
          <Text style={[st.gHead, st.r, { flex: CW.n }]}>ESTIMATED</Text>
          <Text style={[st.gHead, st.r, { flex: CW.n }]}>ACTUAL</Text>
          <Text style={[st.gHead, st.r, { flex: CW.d }]}>Δ</Text>
        </View>
        {heads.map((h) => {
          const k = `${d.key}|${h.key}`;
          const canOpen = !!(h.subs?.length || h.days?.length || h.lines?.length);
          const isOpen = canOpen && !!exp[k];
          const total = h.kind === 'total';
          const strong = h.kind !== 'head';
          return (
            <View key={h.key} style={[st.cBlock, total && st.cTotal, isOpen && st.cBlockOpen]}>
              <Pressable
                disabled={!canOpen}
                onPress={() => setExp((x) => ({ ...x, [k]: !x[k] }))}
                style={({ pressed }: { pressed: boolean }) => [st.gRow, st.cRow, pressed && canOpen ? { opacity: 0.7 } : null]}
                accessibilityRole={canOpen ? 'button' : undefined}
                accessibilityLabel={canOpen ? `${h.label} — ${isOpen ? 'hide' : 'show'} detail` : h.label}
              >
                <View style={[st.cLblWrap, { flex: lw }]}>
                  {canOpen ? <Text style={st.cChev}>{isOpen ? '▾' : '▸'}</Text> : null}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[st.cLbl, strong && st.cLblStrong, total && { color: T.copper }]} numberOfLines={1}>{h.label}</Text>
                      {h.chip ? <Text style={st.cChip}>{h.chip}</Text> : null}
                    </View>
                    {h.hint ? <Text style={st.cHint} numberOfLines={2}>{h.hint}</Text> : null}
                  </View>
                </View>
                <Text style={[st.cNum, st.r, { flex: CW.n, color: C.faint }]}>{has && h.asm != null ? money2(h.asm) : '—'}</Text>
                <Text style={[st.cNum, st.r, { flex: CW.n, fontWeight: '800', color: total ? T.copper : T.ink }, total && { fontSize: 13 }]}>{money2(h.act)}</Text>
                {deltaCell(h.asm, h.act, has)}
              </Pressable>

              {isOpen && h.subs ? (
                <View style={st.cPanel}>
                  {h.subs.map((s, i) => (
                    <View key={i} style={[st.gRow, st.cSubRow]}>
                      <View style={{ flex: lw, minWidth: 0, paddingLeft: 18 }}>
                        <Text style={st.cSubLbl} numberOfLines={1}>{s.label}</Text>
                        {s.note ? <Text style={st.cHint} numberOfLines={2}>{s.note}</Text> : null}
                      </View>
                      <Text style={[st.cNum, st.r, st.cSubNum, { flex: CW.n, color: C.faint }]}>{has && s.asm != null ? money2(s.asm) : '—'}</Text>
                      <Text style={[st.cNum, st.r, st.cSubNum, { flex: CW.n, fontWeight: '800', color: T.ink }]}>{s.act != null ? money2(s.act) : '—'}</Text>
                      {deltaCell(s.asm, s.act, has, true)}
                    </View>
                  ))}
                  {h.foot ? <Text style={st.cFoot}>{h.foot}</Text> : null}
                </View>
              ) : null}

              {isOpen && h.days ? (
                <View style={st.cPanel}>
                  <View style={[st.dRow, { paddingLeft: 18 }]}>
                    {['WOVEN', ...(narrow ? [] : ['SHED']), 'METRES', '₹/PICK·M', '₹/M', 'AMOUNT'].map((t, i) => (
                      <Text key={t} style={[st.gHead, { flex: t === 'WOVEN' ? 1 : 0.9 }, i > (narrow ? 0 : 1) && st.r]}>{t}</Text>
                    ))}
                  </View>
                  {h.days.map((x) => (
                    <View key={x.date} style={[st.dRow, { paddingLeft: 18 }]}>
                      <Text style={[st.dTxt, { flex: 1 }]}>{dateShort(x.date)}</Text>
                      {narrow ? null : <Text style={[st.dTxt, { flex: 0.9, color: C.mut }]} numberOfLines={1}>{x.shed || '—'}</Text>}
                      <Text style={[st.dTxt, st.r, { flex: 0.9 }]}>{fm(x.metres)}</Text>
                      <Text style={[st.dTxt, st.r, { flex: 0.9, color: x.rate != null ? T.ink : C.faint }]}>
                        {x.rate != null ? x.rate.toFixed(4) : '—'}{x.rate != null && x.status && x.status !== 'LIVE' ? ' F' : ''}
                      </Text>
                      <Text style={[st.dTxt, st.r, { flex: 0.9 }]}>{x.per_m.toFixed(2)}{x.costing_m > 0 ? '*' : ''}</Text>
                      <Text style={[st.dTxt, st.r, { flex: 0.9, fontWeight: '800' }]}>{moneyC(x.amount)}</Text>
                    </View>
                  ))}
                  <View style={[st.dRow, { paddingLeft: 18, borderBottomWidth: 0 }]}>
                    <Text style={[st.dTxt, { flex: 1, fontWeight: '800' }]}>Total</Text>
                    {narrow ? null : <Text style={[st.dTxt, { flex: 0.9 }]} />}
                    <Text style={[st.dTxt, st.r, { flex: 0.9, fontWeight: '800' }]}>{fm(d.breakup?.weave.metres || d.made)}</Text>
                    <Text style={[st.dTxt, st.r, { flex: 0.9 }]} />
                    <Text style={[st.dTxt, st.r, { flex: 0.9, fontWeight: '800' }]}>{h.act.toFixed(2)}</Text>
                    <Text style={[st.dTxt, st.r, { flex: 0.9, fontWeight: '800' }]}>{moneyC(d.breakup?.weave.amt || h.act * d.made)}</Text>
                  </View>
                  <Text style={st.cFoot}>
                    Amount = metres × picks × that month's conversion rate (₹ per pick-metre; F = month frozen, else live).
                    {h.days.some((x) => x.costing_m > 0) ? ` * part of the day's metres had no rate / picks — charged at the costing ${money(d.breakup?.weave.costing_rate || 0)}/m.` : ''}
                  </Text>
                </View>
              ) : null}

              {isOpen && h.lines ? (
                <View style={st.cPanel}>
                  {h.lines.map((l, i) => <Text key={i} style={[st.cLine, { paddingLeft: 18 }]}>{l}</Text>)}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  };

  const detail = (d: DesignChain) => {
    const A = d.actual;
    const tree = costTree(d);
    const cmp = compareRows(d);
    return (
      <View style={st.detail}>
        {d.breakup ? null : (
          <Text style={[st.warn, { marginTop: 0, marginBottom: 8 }]}>
            The server is still on the old Real Costing code — deploy the new RealCostChainController.php (cache rcc:v6) to see
            warp / weft shortage, date-wise weaving and brokerage here.
          </Text>
        )}
        {costBreakup(d, tree)}
        {tree ? null : <Text style={st.sec}>ASSUMED vs ACTUAL · per metre</Text>}
        {tree ? null : (
          <View style={st.gRow}>
            <Text style={[st.gHead, { flex: 1.3 }]} />
            <Text style={[st.gHead, st.r]}>ASSUMED</Text>
            <Text style={[st.gHead, st.r]}>ACTUAL</Text>
            <Text style={[st.gHead, st.r, { flex: 0.9 }]}>Δ</Text>
          </View>
        )}
        {(tree ? [] : cmp).map((r, i) => {
          const dd = r.act - r.asm;
          return (
            <View key={i} style={st.gRow}>
              <Text style={[st.gLbl, r.bold && { fontWeight: '800', color: T.copper, fontSize: 12 }]} numberOfLines={2}>{r.label}</Text>
              <Text style={[st.gNum, st.r, { color: C.mut }, r.bold && { fontWeight: '800' }]}>{d.assumed ? money(r.asm) : '—'}</Text>
              <Text style={[st.gNum, st.r, { fontWeight: r.bold ? '800' : '700', color: r.bold ? T.copper : T.ink }]}>{money(r.act)}</Text>
              <Text style={[st.gNum, st.r, { flex: 0.9, fontSize: 10, fontWeight: '800', color: !d.assumed || Math.abs(dd) < 0.005 ? C.mut : dd > 0 ? T.red : GREEN }]}>
                {d.assumed ? (dd > 0 ? '+' : '') + money(dd).replace('₹', '') : ''}
              </Text>
            </View>
          );
        })}
        <Text style={st.foot}>
          {d.assumed
            ? tree
              ? `Tap a cost head for its detail. Estimated from ${d.assumed.code || d.assumed.id} · generated ${dateFull(d.assumed.ts)}.${d.breakup && !d.breakup.rm_asm ? ' This costing has no warp / weft split, so the raw material lines show actual only.' : ''} `
              : `Assumed from costing ${d.assumed.code || d.assumed.id} · ${dateFull(d.assumed.ts)} (costing final ${money(d.assumed.costing_final)} incl. brokerage / cut-pack; compared without them). Assumed warp shortage = costing warp wastage ${d.assumed.warp_waste}% — already inside the costing RM, so not added to the assumed final. `
            : 'No costing record for this design — only the actual is shown. '}
          Recipe now learns warp {d.learned_warp != null ? d.learned_warp + '%' : '—'} · finish {d.learned_fin != null ? d.learned_fin + '%' : '—'} (actual + 1% buffer).
        </Text>
        {tree ? null : <Text style={st.foot}>
          {A.rm_source === 'actual' || A.rm_source === 'mixed'
            ? `RM from yarn really issued: warp ${money(A.rm_warp)}/m (creel cartons − returns, split by warp length) + weft ${money(A.rm_weft)}/m (beam cartons − returns) on ${fm(A.rm_metres)} m` +
              (A.rm_fb_metres > 0 ? ` · ${fm(A.rm_fb_metres)} m had no creel issue → costing RM ${money(A.rm_costing)}/m added` : '') +
              '. Each carton priced from its reference: purchase, job inward (rate + job rate), or the issue it was returned from. Warp shortage yarn is inside this RM. '
            : 'RM from the costing — no creel issue found for these beams. '}
        </Text>}
        {A.rm_fallback_kg > 0 || A.rm_missing_kg > 0 || A.rm_no_weft_beams > 0 ? (
          <Text style={st.warn}>
            {A.rm_fallback_kg > 0 ? `${fm(A.rm_fallback_kg)} kg cartons had no traceable reference — priced at the item's latest purchase rate. ` : ''}
            {A.rm_missing_kg > 0 ? `${fm(A.rm_missing_kg)} kg had no rate at all (counted at ₹0). ` : ''}
            {A.rm_no_weft_beams > 0 ? `${A.rm_no_weft_beams} beam(s) had no weft issue on them.` : ''}
          </Text>
        ) : null}
        {tree ? null : <Text style={st.foot}>
          {A.has_short ? `Warp shortage ${A.short_pct}% on closed beams. ` : ''}
          {d.has_fin ? `Finish shrink ${A.fin_shrink_pct}% ${A.fin_shrink_source === 'mill' && d.mill ? `(mill: ${fm(d.mill.out)} m sent → ${fm(d.mill.in)} m back, ${d.mill.takas} takas)` : '(design value)'} · ` : ''}
          {d.has_fin ? `processing ${A.proc_source === 'mill' ? `from mill bills on ${fm(A.proc_metres)} m` : 'from costing'} · fent ${A.fent_pct}% default.` : ''}
        </Text>}
        {d.flags.no_rate_metres > 0 || d.flags.no_pick_metres > 0 ? (
          <Text style={st.warn}>
            {d.flags.no_rate_metres > 0 ? `${fm(d.flags.no_rate_metres)} m had no conversion rate (month / loom section) ` : ''}
            {d.flags.no_pick_metres > 0 ? `${fm(d.flags.no_pick_metres)} m had no picks in plan / design ` : ''}
            — weaving for those metres taken from the costing.
          </Text>
        ) : null}

        {d.beams.length ? (
          <>
            <Text style={[st.sec, { marginTop: 14 }]}>BEAM-WISE · woven-month conversion rate</Text>
            <View style={st.bRow}>
              {['BEAM', 'SHED', 'CLOSED', '₹/PK·M', 'RM/M', 'METRES', 'COST'].map((h, i) => (
                <Text key={h} style={[st.gHead, { flex: [1.1, 0.7, 0.8, 0.8, 0.8, 0.8, 0.9][i] }, i > 2 && st.r]}>{h}</Text>
              ))}
            </View>
            {d.beams.map((b) => (
              <View key={b.beamuid} style={st.bRow}>
                <Text style={[st.bTxt, { flex: 1.1, fontFamily: MF, fontWeight: '700' }]} numberOfLines={1}>{b.beam}{narrow ? '' : <Text style={st.bLoom}> · {b.loom}</Text>}</Text>
                <View style={{ flex: 0.7 }}>
                  <Text style={[st.shed, b.shed === 'Waterjet' ? st.shedW : b.shed === 'Rapier' ? st.shedR : st.shedO]}>{b.shed === 'Waterjet' ? 'WJET' : b.shed === 'Rapier' ? 'RAP' : '—'}</Text>
                </View>
                <Text style={[st.bTxt, { flex: 0.8, fontFamily: MF, color: C.mut, fontSize: 10 }]}>{dateShort(b.date)}</Text>
                <Text style={[st.bTxt, st.r, { flex: 0.8, fontFamily: MF }]}>{b.rate != null ? b.rate.toFixed(4) : '—'}</Text>
                <Text style={[st.bTxt, st.r, { flex: 0.8, fontFamily: MF, color: b.rm_source === 'actual' ? T.ink : C.mut }]}>{b.rm_per_m.toFixed(2)}{b.rm_source === 'actual' ? '' : '*'}</Text>
                <Text style={[st.bTxt, st.r, { flex: 0.8, fontFamily: MF }]}>{fm(b.metres)}</Text>
                <Text style={[st.bTxt, st.r, { flex: 0.9, fontFamily: MF, fontWeight: '700' }]}>{moneyC(b.cost)}</Text>
              </View>
            ))}
            <Text style={st.foot}>
              Each beam's weaving = its checked metres × picks × the Rapier / Waterjet conversion rate of the month each taka was checked
              (+ RM/M of that beam from its own creel share and weft issue; * = costing RM, no creel issue found). ₹/PK·M = rate per pick-metre.
            </Text>
          </>
        ) : (
          <Text style={[st.foot, { marginTop: 10 }]}>No beam of this design closed in the period — mill / finishing figures only.</Text>
        )}
      </View>
    );
  };

  const designRow = (d: DesignChain) => {
    const on = !!sel[d.key];
    const isOpen = open === d.key;
    const dPerM = d.actual.final - (d.assumed ? d.assumed.final : d.actual.final);
    return (
      <View key={d.key} style={[st.card, { padding: 0, overflow: 'hidden', marginBottom: 10 }]}>
        <View style={st.dHead}>
          <Pressable onPress={() => setSel((x) => ({ ...x, [d.key]: !x[d.key] }))} style={[st.tick, on && st.tickOn]} accessibilityLabel={`Compare ${d.name}`}>
            <Text style={st.tickTxt}>{on ? '✓' : ''}</Text>
          </Pressable>
          <Pressable onPress={() => setOpen(isOpen ? null : d.key)} style={{ flex: 1, minWidth: 0 }} accessibilityLabel={`Design ${d.name}`}>
            <Text style={st.dName} numberOfLines={1}>{d.name}</Text>
            <Text style={st.dSub} numberOfLines={1}>
              {d.dsncode} · {d.has_fin ? 'Finished' : 'Greige'} · {fm(d.made)} m · {d.nbeams} beam{d.nbeams !== 1 ? 's' : ''}{d.has_costing ? '' : ' · no costing'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setOpen(isOpen ? null : d.key)} style={{ alignItems: 'flex-end' }}>
            <Text style={st.dFinal}>{!d.has_costing && d.actual.final === 0 ? '—' : money(d.actual.final)}<Text style={st.dUnit}>/m</Text></Text>
            {d.assumed ? (
              <Text style={[st.dVs, { color: dPerM > 0 ? T.red : GREEN }]}>{dPerM > 0 ? '▲' : '▼'} {money(Math.abs(dPerM))} vs est</Text>
            ) : <Text style={[st.dVs, { color: C.mut }]}>no estimate</Text>}
          </Pressable>
          <Text onPress={() => setOpen(isOpen ? null : d.key)} style={st.chev}>{isOpen ? '⌄' : '›'}</Text>
        </View>
        {isOpen ? detail(d) : null}
      </View>
    );
  };

  /* ------------------------------ render ------------------------------ */
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }} onLayout={(e) => setCw(e.nativeEvent.layout.width)}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.pad}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(month, true)} />}
      >
        <View style={st.wrap}>
          <Text style={st.h1}>Real costing chain</Text>
          <Text style={st.intro}>
            Top-down: month total → design → beam. Assumed (at costing creation) shown against actual gathered live. Tick designs to compare a subset.
            {data ? `  ·  ${data.fy.name}` : ''}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow}>
            <Text onPress={() => pickMonth('')} numberOfLines={1} style={[st.chip, month === '' && st.chipOn]} accessibilityLabel="Period year">{data ? `Whole ${data.fy.name}` : 'Whole year'}</Text>
            {(data?.months || []).slice().reverse().map((m) => (
              <Text key={m} onPress={() => pickMonth(m)} numberOfLines={1} style={[st.chip, month === m && st.chipOn]} accessibilityLabel={`Period ${m}`}>{monthLbl(m)}</Text>
            ))}
          </ScrollView>

          <View style={st.rangeRow}>
            <Text style={st.rangeLbl}>Last taka</Text>
            <TextInput
              value={rFrom} onChangeText={setRFrom} placeholder="From DD-MM-YYYY" placeholderTextColor={T.muted}
              style={[st.input, st.rangeIn, isRange(month) && { borderColor: T.copper }]} autoCorrect={false} autoCapitalize="none" accessibilityLabel="From date"
            />
            <TextInput
              value={rTo} onChangeText={setRTo} placeholder="To DD-MM-YYYY" placeholderTextColor={T.muted} onSubmitEditing={applyRange}
              style={[st.input, st.rangeIn, isRange(month) && { borderColor: T.copper }]} autoCorrect={false} autoCapitalize="none" accessibilityLabel="To date"
            />
            <Btn label="Apply" icon="refresh" kind="ghost" compact onPress={applyRange} />
          </View>
          {rErr ? <Text style={[st.warn, { marginBottom: 6 }]}>{rErr}</Text> : null}

          <View style={st.refRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {updating ? <ActivityIndicator size="small" color={T.copper} /> : null}
              <Text style={[st.muted, { textAlign: 'left', flexShrink: 1 }]}>
                {data?.built_at ? `Figures as of ${data.built_at.slice(11, 16)}${data.built_at.slice(0, 10) !== todayIso() ? ' · ' + dateShort(data.built_at.slice(0, 10)) : ''}` : ''}
                {updating ? ' · updating to the latest figures…' : data?.build_secs ? ` · built in ${Math.round(data.build_secs)} s` : ''}
              </Text>
            </View>
            <Btn label={refreshing ? 'Refreshing…' : 'Refresh'} icon="refresh" kind="ghost" compact onPress={() => void load(month, true)} />
          </View>
          {err ? (
            <View style={[st.card, { padding: 14, gap: 8 }]}>
              <Text style={{ color: T.red, fontWeight: '700' }}>{err}</Text>
              <Btn label="Retry" icon="refresh" kind="ghost" compact onPress={() => void load(month)} />
            </View>
          ) : null}
          {loading && !refreshing ? (
            <View style={[st.card, st.loadingCard]}>
              <ActivityIndicator color={T.copper} />
              <Text style={st.muted}>Gathering beams, conversion rates and mill returns{month === 'current' ? ' for this month' : month ? ` for ${periodLbl(month)}` : ''}…</Text>
            </View>
          ) : null}

          {data && !loading ? (
            <>
              <View style={[st.card, st.sumCard]}>
                <Text style={st.eyebrow}>MONTHLY REAL-COSTING SUMMARY{chosen.length ? ` · ${chosen.length} selected` : ' · all designs'}{data.range ? ` · last taka ${dateFull(data.period.from)} – ${dateFull(data.period.to)}` : data.month ? ` · ${monthLbl(data.month)}` : ''}</Text>
                <View style={st.stats}>
                  {stat('Designs', String(sum.designs))}
                  {stat('Costed output', fm(sum.made) + ' m')}
                  {stat('vs assumed', sum.pct == null ? '—' : (sum.pct >= 0 ? '+' : '') + sum.pct.toFixed(1) + '%', sum.pct == null ? undefined : sum.act > sum.asm ? T.red : GREEN)}
                </View>
                <View style={st.subBox}>
                  <Text style={st.subLbl}>TOTAL COST · assumed → actual</Text>
                  <Cmp asm={sum.asm} act={sum.act} unit="cr" />
                  <View style={st.hr} />
                  <Text style={st.subLbl}>BLENDED ₹/METRE · assumed → actual</Text>
                  <Cmp asm={sum.asmPerM} act={sum.actPerM} />
                </View>
                {chosen.length ? <Text onPress={() => setSel({})} style={[st.link, { alignSelf: 'flex-start', marginTop: 8 }]}>Clear selection</Text> : null}
              </View>

              <View style={st.fRow}>
                <TextInput
                  value={q} onChangeText={setQ} placeholder="Search design code or name…" placeholderTextColor={T.muted}
                  style={[st.input, { flex: 1 }, !!q && { borderColor: T.copper }]} autoCorrect={false} autoCapitalize="none" accessibilityLabel="Search design"
                />
                {q ? <Text onPress={() => setQ('')} style={st.link}>Clear</Text> : null}
              </View>

              <Text style={st.head}>DESIGN-WISE REAL COSTING · {rows.length}</Text>
              {noCosting ? <Text style={st.note}>{noCosting} design{noCosting !== 1 ? 's have' : ' has'} production but no costing record — shown as actual only (counted at actual on both sides of the total).</Text> : null}
              {!rows.length ? (
                <View style={[st.card, { padding: 22, alignItems: 'center' }]}>
                  <Text style={st.muted}>{q ? 'No design matches.' : 'No closed beams or mill movements in this period — the chain builds itself as production and finishing data arrive.'}</Text>
                </View>
              ) : rows.map(designRow)}

              <View style={[st.card, { padding: 12, marginTop: 6 }]}>
                <Pressable onPress={() => setShowRates((x) => !x)} style={st.ratesHead} accessibilityLabel="Weaving rates used">
                  <Text style={st.eyebrow}>WEAVING CONVERSION RATES USED · {data.rates.length}</Text>
                  <Text style={st.chev}>{showRates ? '⌄' : '›'}</Text>
                </Pressable>
                {showRates ? (
                  <View style={{ marginTop: 8 }}>
                    {data.rates.map((r) => (
                      <View key={r.ym + r.section} style={st.rateRow}>
                        <Text style={[st.bTxt, { flex: 0.9 }]}>{monthLbl(r.ym)}</Text>
                        <Text style={[st.bTxt, { flex: 1 }]}>{r.section === 'WATERJET' ? 'Waterjet' : 'Rapier'}</Text>
                        <Text style={[st.bTxt, st.r, { flex: 1, fontFamily: MF }]}>{r.rate != null ? '₹' + r.rate.toFixed(4) : '—'}</Text>
                        <Text style={[st.rateTag, r.status === 'CLOSED' ? st.tagClosed : r.status === 'LIVE' ? st.tagLive : st.tagNa]}>{r.status === 'CLOSED' ? 'FROZEN' : r.status === 'LIVE' ? 'LIVE' : 'N/A'}</Text>
                      </View>
                    ))}
                    <Text style={st.foot}>₹ per pick-metre = (electricity + wages) ÷ (metres × average picks) of the section. FROZEN = month closed in conversion costing; LIVE = computed now from the expense dashboard.</Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  refRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  pad: { padding: 12, paddingBottom: 40 },
  wrap: { width: '100%', maxWidth: 900, alignSelf: 'center', gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: T.bg },
  muted: { color: C.mut, fontSize: 12.5, textAlign: 'center' },
  h1: { fontSize: 20, fontWeight: '800', color: T.ink },
  intro: { fontSize: 12, color: C.mut, lineHeight: 18, marginTop: -4 },
  chipRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 4 },
  rangeLbl: { fontSize: 11, fontWeight: '800', color: C.mut, letterSpacing: 0.4 },
  rangeIn: { flexGrow: 1, flexBasis: 120, minWidth: 110, paddingVertical: 6, fontSize: 12.5 },
  chip: { flexShrink: 0, fontSize: 12, fontWeight: '700', color: C.mut, borderWidth: 1, borderColor: C.bd, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 5, overflow: 'hidden', backgroundColor: T.surface },
  chipOn: { backgroundColor: T.copper, borderColor: T.copper, color: '#fff' },
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: C.bd },
  loadingCard: { padding: 22, alignItems: 'center', gap: 10 },
  sumCard: { padding: 15, borderLeftWidth: 4, borderLeftColor: T.copper },
  eyebrow: { fontSize: 10, fontWeight: '800', color: C.mut, letterSpacing: 0.6 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 10 },
  stat: { flex: 1, backgroundColor: T.alt, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  statVal: { fontFamily: MF, fontSize: 14, fontWeight: '800', color: T.ink },
  statLbl: { fontSize: 8, fontWeight: '800', color: C.mut, marginTop: 2, letterSpacing: 0.4, textTransform: 'uppercase' },
  subBox: { backgroundColor: T.alt, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11 },
  subLbl: { fontSize: 9, fontWeight: '800', color: C.mut, marginBottom: 5 },
  hr: { height: 1, backgroundColor: C.bd, marginVertical: 9 },
  cmp: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  cmpAsm: { fontFamily: MF, fontSize: 13, fontWeight: '700', color: C.mut },
  cmpArrow: { fontSize: 10, color: C.mut },
  cmpAct: { fontFamily: MF, fontSize: 14, fontWeight: '800', color: T.ink },
  cmpDelta: { fontSize: 10.5, fontWeight: '800' },
  fRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, fontSize: 14, color: T.ink, backgroundColor: T.surface, minHeight: 42 },
  link: { fontSize: 12.5, fontWeight: '800', color: T.copper, paddingHorizontal: 6, paddingVertical: 4 },
  head: { fontSize: 10, fontWeight: '800', color: C.mut, letterSpacing: 0.6, marginTop: 6 },
  note: { fontSize: 11.5, color: C.mut, lineHeight: 17 },
  dHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  tick: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: T.copper, borderColor: T.copper },
  tickTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  dName: { fontSize: 14, fontWeight: '800', color: T.ink },
  dSub: { fontSize: 10.5, color: C.mut, marginTop: 1 },
  dFinal: { fontFamily: MF, fontSize: 15, fontWeight: '800', color: T.copper },
  dUnit: { fontSize: 9, color: C.mut },
  dVs: { fontSize: 9.5, fontWeight: '800' },
  chev: { fontSize: 16, color: C.mut, paddingHorizontal: 2 },
  detail: { borderTopWidth: 1, borderTopColor: T.alt, paddingHorizontal: 14, paddingVertical: 12 },
  sec: { fontSize: 9, fontWeight: '800', color: T.nav, letterSpacing: 0.6, marginBottom: 8 },
  gRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  gHead: { flex: 1, fontSize: 8.5, fontWeight: '800', color: C.mut },
  gLbl: { flex: 1.3, fontSize: 11, fontWeight: '600', color: T.ink },
  gNum: { flex: 1, fontFamily: MF, fontSize: 11 },
  r: { textAlign: 'right' },
  foot: { fontSize: 9.5, color: C.mut, marginTop: 7, lineHeight: 14 },
  // cost breakup (expandable heads) — screenshot layout
  cHeadRow: { paddingHorizontal: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.bd, marginBottom: 2 },
  cTitle: { fontSize: 9, fontWeight: '800', color: T.nav, letterSpacing: 0.6 },
  cTitleSub: { fontWeight: '600', color: C.mut, letterSpacing: 0 },
  cBlock: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.bd },
  cBlockOpen: { backgroundColor: '#F6F1EA', borderRadius: 8, borderBottomColor: 'transparent', marginVertical: 2 },
  cTotal: { borderBottomWidth: 0, borderTopWidth: 1.5, borderTopColor: T.copper, marginTop: 6 },
  cRow: { paddingVertical: 9, paddingHorizontal: 8, gap: 8 },
  cLblWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, minWidth: 0 },
  cChev: { width: 10, fontSize: 9, lineHeight: 16, color: C.mut, fontWeight: '800' },
  cLbl: { fontSize: 12.5, fontWeight: '700', color: T.ink },
  cLblStrong: { fontWeight: '800' },
  cChip: { fontSize: 8.5, fontWeight: '700', color: C.mut, backgroundColor: '#EFE9E1', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  cHint: { fontFamily: MF, fontSize: 9, color: C.faint, marginTop: 2, lineHeight: 13 },
  cNum: { fontFamily: MF, fontSize: 11.5 },
  cPanel: { paddingHorizontal: 8, paddingBottom: 10 },
  cSubRow: { paddingVertical: 6, gap: 8 },
  cSubLbl: { fontSize: 11, fontWeight: '700', color: T.ink },
  cSubNum: { fontSize: 10.5 },
  cFoot: { fontSize: 9, color: C.mut, lineHeight: 13, marginTop: 6, paddingLeft: 18 },
  cLine: { fontFamily: MF, fontSize: 10, color: T.ink, lineHeight: 16 },
  dRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8DFD3' },
  dTxt: { fontSize: 10, fontFamily: MF, color: T.ink },
  warn: { fontSize: 10.5, color: '#9A6B12', backgroundColor: '#FBF1DC', borderWidth: 1, borderColor: '#EAD9A8', borderRadius: 8, padding: 8, marginTop: 8, lineHeight: 15 },
  bRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderTopWidth: 1, borderTopColor: T.alt },
  bTxt: { fontSize: 10.5, color: T.ink },
  bLoom: { fontSize: 9.5, color: C.mut, fontWeight: '500' },
  shed: { alignSelf: 'flex-start', fontSize: 7.5, fontWeight: '800', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 7, overflow: 'hidden' },
  shedW: { color: T.nav, backgroundColor: 'rgba(58,86,138,0.12)' },
  shedR: { color: '#8a5a00', backgroundColor: '#FCF1DC' },
  shedO: { color: C.mut, backgroundColor: T.alt },
  ratesHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderTopWidth: 1, borderTopColor: T.alt },
  rateTag: { fontSize: 8, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden', minWidth: 46, textAlign: 'center' },
  tagClosed: { color: T.nav, backgroundColor: 'rgba(58,86,138,0.12)' },
  tagLive: { color: GREEN, backgroundColor: 'rgba(42,96,68,0.12)' },
  tagNa: { color: C.mut, backgroundColor: T.alt },
});
