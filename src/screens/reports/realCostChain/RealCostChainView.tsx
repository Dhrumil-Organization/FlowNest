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
  dateFull,
  dateShort,
  DesignChain,
  errText,
  fm,
  matches,
  money,
  moneyC,
  monthLbl,
  normalizeChain,
  summaryOf,
  unwrap,
} from './realCostChainModel';

const MF = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" }) as string;
const GREEN = '#2A6044';

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
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  const [showRates, setShowRates] = useState(false);
  const req = useRef(0);

  /** pull / Refresh = fresh: built again now (else the server may answer from its 10-minute cache — much faster) */
  const load = useCallback(async (m: string, pull = false) => {
    if (!ready) return;
    const id = ++req.current;
    pull ? setRefreshing(true) : setLoading(true);
    setErr('');
    try {
      const d = normalizeChain(unwrap(await RealCostChainAPI.report({ prptype: prpGroup, prpcode: prpCode, yearno, month: m, ...(pull ? { fresh: 1 } : {}) })));
      if (id !== req.current) return;
      setData(d);
      if (m === 'current') setMonth(d.month);   // the chip of the month the server used
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

  const detail = (d: DesignChain) => {
    const A = d.actual;
    const cmp = compareRows(d);
    return (
      <View style={st.detail}>
        <Text style={st.sec}>ASSUMED vs ACTUAL · per metre</Text>
        <View style={st.gRow}>
          <Text style={[st.gHead, { flex: 1.3 }]} />
          <Text style={[st.gHead, st.r]}>ASSUMED</Text>
          <Text style={[st.gHead, st.r]}>ACTUAL</Text>
          <Text style={[st.gHead, st.r, { flex: 0.9 }]}>Δ</Text>
        </View>
        {cmp.map((r, i) => {
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
            ? `Assumed from costing ${d.assumed.code || d.assumed.id} · ${dateFull(d.assumed.ts)} (costing final ${money(d.assumed.costing_final)} incl. brokerage / cut-pack; compared without them). Assumed warp shortage = costing warp wastage ${d.assumed.warp_waste}% — already inside the costing RM, so not added to the assumed final. `
            : 'No costing record for this design — only the actual is shown. '}
          Recipe now learns warp {d.learned_warp != null ? d.learned_warp + '%' : '—'} · finish {d.learned_fin != null ? d.learned_fin + '%' : '—'} (actual + 1% buffer).
        </Text>
        <Text style={st.foot}>
          {A.has_short ? `Warp shortage ${A.short_pct}% on closed beams. ` : ''}
          {d.has_fin ? `Finish shrink ${A.fin_shrink_pct}% ${A.fin_shrink_source === 'mill' && d.mill ? `(mill: ${fm(d.mill.out)} m sent → ${fm(d.mill.in)} m back, ${d.mill.takas} takas)` : '(design value)'} · ` : ''}
          {d.has_fin ? `processing ${A.proc_source === 'mill' ? `from mill bills on ${fm(A.proc_metres)} m` : 'from costing'} · fent ${A.fent_pct}% default.` : ''}
        </Text>
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
              {['BEAM', 'SHED', 'CLOSED', '₹/PK·M', 'METRES', 'COST'].map((h, i) => (
                <Text key={h} style={[st.gHead, { flex: [1.1, 0.7, 0.8, 0.8, 0.8, 0.9][i] }, i > 2 && st.r]}>{h}</Text>
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
                <Text style={[st.bTxt, st.r, { flex: 0.8, fontFamily: MF }]}>{fm(b.metres)}</Text>
                <Text style={[st.bTxt, st.r, { flex: 0.9, fontFamily: MF, fontWeight: '700' }]}>{moneyC(b.cost)}</Text>
              </View>
            ))}
            <Text style={st.foot}>
              Each beam's weaving = its checked metres × picks × the Rapier / Waterjet conversion rate of the month each taka was checked
              (RM {money(A.rm)}/m + weaving). ₹/PK·M = rate per pick-metre.
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

          <View style={st.refRow}>
            <Text style={st.muted}>{data?.built_at ? `Figures as of ${data.built_at.slice(11, 16)}${data.built_at.slice(0, 10) !== todayIso() ? ' · ' + dateShort(data.built_at.slice(0, 10)) : ''} · Refresh builds them again now` : ''}</Text>
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
              <Text style={st.muted}>Gathering beams, conversion rates and mill returns{month === 'current' ? ' for this month' : month ? ` for ${monthLbl(month)}` : ''}…</Text>
            </View>
          ) : null}

          {data && !loading ? (
            <>
              <View style={[st.card, st.sumCard]}>
                <Text style={st.eyebrow}>MONTHLY REAL-COSTING SUMMARY{chosen.length ? ` · ${chosen.length} selected` : ' · all designs'}{data.month ? ` · ${monthLbl(data.month)}` : ''}</Text>
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
