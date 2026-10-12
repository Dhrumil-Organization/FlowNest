/**
 * Expense report blocks — same labels and layout as the ERP Designing expense
 * report (artifact), with the senior's section-wise electricity rules:
 *
 *  - ArtSectionHeaderCards : Section A / Section B cards at the top (machines, ranges, metres, ₹, ₹/pk)
 *  - SeniorSectionCards    : Section A / B  "Electricity + Store" cost per pick (tap → daily trend)
 *  - SeniorUtilities       : "Utilities / units consumed" — every meter on its own production basis
 *                            (M Weaves · S. Rapier · Waterjet · Shared meters · Total), tap → daily trend,
 *                            cost per metre by day (A / B), show working
 *  - SectionConversionRates: "Section conversion rates · A / B" (weaving conversion + overheads per pick)
 *  - SeniorTrendSheet      : day-by-day cost per pick, every day calculated on its own
 *
 * All calculation lives in expenseSeniorCalc.js.
 */
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import {
  SEC_COLOR,
  SENIOR_CARDS,
  SENIOR_METERS,
  SENIOR_SECTIONS,
  secCounts,
  secGroups,
  secLbl,
  seniorMonth,
  seniorSeries,
} from './expenseSeniorCalc';

const MONO = undefined; // keep the app's font; numbers use tabular weight only

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const inr = (v, dp = 0) =>
  `₹${num(v).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const cr = (v) => {
  const n = num(v);
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)} L`;
  return `${s}₹${Math.round(a).toLocaleString('en-IN')}`;
};
const qty = (v) => Math.round(num(v)).toLocaleString('en-IN');
const metres = (v) => {
  const n = num(v);
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L m`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} K m`;
  return `${Math.round(n)} m`;
};
const lakh = (v) => `${(num(v) / 1e5).toFixed(2)} L`;
const r2 = (v) => `₹${num(v).toFixed(2)}`;
const pk = (v, dp = 4) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `₹${Number(v).toFixed(dp)}`);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (ymd, fallback) => {
  const s = String(ymd || '');
  if (s.length !== 8) return String(fallback ?? s);
  return `${s.slice(6, 8)} ${MONTHS[Number(s.slice(4, 6)) - 1] || ''}`;
};
const secColor = (s) => (s === 'A' ? SEC_COLOR.A : s === 'B' ? SEC_COLOR.B : SEC_COLOR.T);

/** Memoised month calculation from the report's data object `d`. */
export function useSeniorMonth(d) {
  return useMemo(
    () => seniorMonth(d?.electricity_daily, d?.expense_daily_trend),
    [d?.electricity_daily, d?.expense_daily_trend],
  );
}

export function SecTag({ s, size = 9 }) {
  const c = secColor(s);
  return (
    <View style={[st.tag, { backgroundColor: `${c}18`, borderColor: `${c}44` }]}>
      <Text style={[st.tagText, { color: c, fontSize: size }]}>{s}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Top: Section A / Section B cards (artifact)                                 */
/* -------------------------------------------------------------------------- */

export function ArtSectionHeaderCards({ d }) {
  const { width } = useWindowDimensions();
  const twoCols = width >= 380;
  if (d?.section_ab_active !== true) return null;
  const c = secCounts(d);
  const rows = [
    { k: 'A', n: c.A, prod: d.section_a_prod, cost: d.section_a_total, cpp: d.section_a_cpp },
    { k: 'B', n: c.B, prod: d.section_b_prod, cost: d.section_b_total, cpp: d.section_b_cpp },
  ];
  return (
    <View style={[st.headGrid, twoCols && { flexDirection: 'row' }]}>
      {rows.map((x) => (
        <View key={x.k} style={[st.headCard, { borderTopColor: secColor(x.k) }, twoCols && { flex: 1 }]}>
          <View style={st.rowCenter}>
            <SecTag s={x.k} size={10} />
            <Text style={st.headTitle}>Section {x.k}</Text>
            <Text style={[st.headMc, { color: secColor(x.k) }]}>{x.n} mc</Text>
          </View>
          <Text style={st.headLbl}>{secLbl(d, x.k).replace(/^[AB] — /, '')}</Text>
          <Text style={st.headGroups}>{secGroups(d, x.k)}</Text>
          <View style={[st.rowCenter, { marginTop: 6, flexWrap: 'wrap' }]}>
            <Text style={st.headNum}>{metres(x.prod)}</Text>
            <Text style={st.headMuted}>{cr(x.cost)}</Text>
            <Text style={[st.headCpp, { color: secColor(x.k) }]}>{pk(x.cpp, 3)}/pk</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section A / B — electricity + store cost per pick (senior)                 */
/* -------------------------------------------------------------------------- */

export function SeniorSectionCards({ d, isLarge, onTrend }) {
  const month = useSeniorMonth(d);
  if (!month.days.length) return null;

  return (
    <View style={[st.grid, isLarge && { flexDirection: 'row' }]}>
      {SENIOR_SECTIONS.map((s) => {
        const x = month.section[s.key];
        const title = secLbl(d, s.tag);
        return (
          <TouchableOpacity
            key={s.key}
            activeOpacity={0.78}
            onPress={() => onTrend?.({ kind: 'senior', key: s.key, title: `${title} · electricity + store`, color: s.color })}
            style={[st.secCard, { borderTopColor: s.color }, isLarge && { flex: 1 }]}
          >
            <View style={st.secHead}>
              <SecTag s={s.tag} size={10} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.secTitle}>{title}</Text>
                <Text style={st.secSub}>{secGroups(d, s.tag)}</Text>
              </View>
              <View style={[st.pill, { borderColor: `${s.color}55` }]}>
                <Text style={[st.pillText, { color: s.color }]}>daily trend ›</Text>
              </View>
            </View>

            {s.tag === 'A' ? (
              <>
                <Line2 label="Waterjet electricity" value={inr(month.meter.wjet_looms.amount)} />
                <Line2 label="S. Rapier (230 cm) electricity" value={inr(month.meter.sud230_looms.amount)} />
                <Line2 label="Warping + Misc · 1/3 share" value={inr((month.meter.warping.amount + month.meter.misc.amount) / 3)} />
                <Line2 label="Store — Waterjet" value={inr(x.store)} />
              </>
            ) : (
              <>
                <Line2 label="MW Rapier + MW Luwa electricity" value={inr(month.meter.mw_looms.amount + month.meter.mw_luwa.amount)} />
                <Line2 label="S. Rapier (190 cm) + S. Rapier Luwa electricity" value={inr(month.meter.sud190_looms.amount + month.meter.sud_luwa.amount)} />
                <Line2 label="Warping + Misc · 2/3 share" value={inr((month.meter.warping.amount + month.meter.misc.amount) * 2 / 3)} />
                <Line2 label="Store — Rapier" value={inr(x.store)} />
              </>
            )}
            <Line2 label="Production · picks" value={`${metres(x.prod)} · ${lakh(x.picks)}`} />

            <View style={st.foot}>
              <View>
                <Text style={st.footLabel}>COST / PICK</Text>
                <Text style={[st.footValue, { color: s.color }]}>{pk(x.cpp)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.footLabel}>ELEC. ONLY</Text>
                <Text style={st.footValueDark}>{pk(x.elecCpp)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.footLabel}>AVG PICKS</Text>
                <Text style={st.footValueDark}>{num(x.avgPicks).toFixed(1)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Line2({ label, value }) {
  return (
    <View style={st.line}>
      <Text style={st.lineLabel}>{label}</Text>
      <Text style={st.lineValue}>{value}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Utilities / units consumed (artifact XUtilCost + senior rules)             */
/* -------------------------------------------------------------------------- */

export function SeniorUtilities({ d, onTrend, monthLabel }) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const month = useSeniorMonth(d);
  if (!month.days.length) return null;

  const byKey = Object.fromEntries(SENIOR_METERS.map((m) => [m.key, m]));
  const total = month.meter.total;
  const avgRate = total.kwh > 0 ? total.amount / total.kwh : 0;
  const chk = month.check;
  const label = monthLabel || '';

  const MeterRow = ({ k, strong }) => {
    const meta = byKey[k];
    const x = month.meter[k];
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onTrend?.({ kind: 'senior', key: k, title: `${meta.label} · ${meta.detail}`, color: '#185FA5' })}
        style={[st.mRow, strong && { paddingTop: 7 }]}
      >
        <View style={st.mLeft}>
          <Text style={[st.mLbl, strong && { fontSize: 12, fontWeight: '800' }]}>{meta.label}</Text>
          <Text style={st.mSub}>{meta.detail}</Text>
        </View>
        <Text style={st.mPerM}>{x.prod > 0 ? `${r2(x.perM)}/m` : '—'}</Text>
        <Text style={[st.mPerPk, strong && { fontSize: 14, color: SEC_COLOR.T }]}>{x.picks > 0 ? `${pk(x.cpp)}/pk` : '—'}</Text>
        <Text style={st.mChev}>›</Text>
      </TouchableOpacity>
    );
  };

  const HeadRow = ({ left }) => (
    <View style={st.mHead}>
      <View style={[st.mLeft, { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }]}>{left}</View>
      <Text style={[st.mPerM, st.mHeadTxt]}>₹ / M</Text>
      <Text style={[st.mPerPk, st.mHeadTxt]}>₹ / PICK</Text>
      <Text style={st.mChev}> </Text>
    </View>
  );

  // Cost per metre · by day — section electricity (senior split) ÷ section production
  const chartRows = month.days.map((x) => ({
    day: String(x.day ?? '').padStart(2, '0'),
    ymd: x.date_ymd,
    A: x.section.secA.prod > 0 ? x.section.secA.elec / x.section.secA.prod : null,
    B: x.section.secB.prod > 0 ? x.section.secB.elec / x.section.secB.prod : null,
  }));
  const avgA = month.section.secA.prod > 0 ? month.section.secA.elec / month.section.secA.prod : 0;
  const avgB = month.section.secB.prod > 0 ? month.section.secB.elec / month.section.secB.prod : 0;

  return (
    <View style={st.box}>
      <TouchableOpacity style={st.boxHead} onPress={() => setOpen((v) => !v)} activeOpacity={0.72}>
        <View style={[st.iconBox, { backgroundColor: '#EAF3FB' }]}><Text style={{ fontSize: 16 }}>⚡</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.boxTitle}>Utilities / units consumed</Text>
          <Text style={st.boxSub}>{qty(total.kwh)} kWh @ {r2(avgRate)}</Text>
        </View>
        <Text style={st.boxAmount}>{cr(total.amount)}</Text>
        <Text style={st.chev}>{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {open ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <Text style={st.explain}>
            Electricity cost per pick for each meter · {label}{label ? ' · ' : ''}{month.days.length} day{month.days.length !== 1 ? 's' : ''} · tap a row for its day-wise trend
          </Text>

          {SENIOR_CARDS.map((c) => (
            <View key={c.k} style={[st.mCard, { borderLeftColor: secColor(c.sec) }]}>
              <HeadRow left={<><SecTag s={c.sec} /><Text style={st.mCardTitle}>{c.lbl}</Text><Text style={st.mSub}>{c.sub}</Text></>} />
              {c.keys.map((k) => <MeterRow key={k} k={k} />)}
            </View>
          ))}
          <View style={[st.mCard, { borderLeftColor: SEC_COLOR.T, paddingTop: 4 }]}>
            <MeterRow k="total" strong />
          </View>

          {chartRows.length > 1 ? (
            <View style={{ marginTop: 12 }}>
              <View style={[st.rowCenter, { flexWrap: 'wrap' }]}>
                <Text style={st.chartTitle}>Cost per metre · by day</Text>
                <Text style={st.mSub}>{label}{label ? ' · ' : ''}{chartRows.length} days · tap a day for the exact value</Text>
              </View>
              <View style={[st.rowCenter, { gap: 14, marginTop: 5, flexWrap: 'wrap' }]}>
                {[['A', avgA], ['B', avgB]].map(([k, v]) => (
                  <View key={k} style={st.rowCenter}>
                    <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: secColor(k) }} />
                    <Text style={st.mSub}>Section {k}  <Text style={{ color: '#111827' }}>avg {r2(v)}/m</Text></Text>
                  </View>
                ))}
              </View>
              <LineChartAB rows={chartRows} />
              <Text style={st.note}>
                Section lines use the section split of the shared meters: S. Rapier Luwa 100% to Section B (190 cm); Warping + Misc A 1/3 : B 2/3.
              </Text>
            </View>
          ) : null}

          <View style={st.workWrap}>
            <TouchableOpacity onPress={() => setWorking((v) => !v)} style={[st.rowCenter, { alignItems: 'flex-start' }]}>
              <Text style={[st.note, { flex: 1, marginTop: 0 }]}>Cost / pick = meter kWh × ₹/unit ÷ production of the machines it serves ÷ their average PPI</Text>
              <Text style={st.link}>{working ? 'hide working ▴' : 'show working ▾'}</Text>
            </TouchableOpacity>
            {working ? (
              <View style={{ marginTop: 6 }}>
                {SENIOR_METERS.map((m) => {
                  const x = month.meter[m.key];
                  const rate = x.kwh > 0 ? x.amount / x.kwh : avgRate;
                  return (
                    <Text key={m.key} style={st.workLine}>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>{m.label}</Text>
                      {' · '}
                      {m.key === 'misc' ? `${qty(total.kwh)} − ${qty(total.kwh - x.kwh)} = ` : ''}
                      {qty(x.kwh)} kWh × {r2(rate)} = {cr(x.amount)} ÷ {qty(x.prod)} m{m.basis === 'total' ? ' (total)' : ''} ÷ {num(x.avgPicks).toFixed(1)} PPI{m.basis === 'total' ? ' (weighted)' : ''} = {pk(x.cpp)}
                    </Text>
                  );
                })}
                <Text style={[st.note, { marginTop: 6 }]}>
                  Each meter is divided only by the production of the machines it serves — nothing is pooled or re-allocated. MW looms and MW Luwa ÷ M Weaves production; S. Rapier looms and Luwa ÷ the 38 190 cm looms' production; the 230 cm looms ÷ their own; warping, miscellaneous and the total ÷ total production and the production-weighted PPI ({num(total.avgPicks).toFixed(1)}). Miscellaneous = total units − the meters above. Each day uses that day's unit rate.
                </Text>
                <Text style={[st.workLine, { marginTop: 6, fontWeight: '800' }]}>
                  Check: all meters incl. misc = {inr(chk.metersAmount)} · total = {inr(chk.totalAmount)} · difference {inr(chk.difference, 2)}
                </Text>
                <Text style={st.workLine}>Check: Section A + Section B electricity = {inr(chk.sectionsElec)} (must equal the total)</Text>
                {chk.negativeMiscDays.length ? (
                  <Text style={[st.workLine, { color: '#B42318', fontWeight: '800' }]}>
                    ⚠ Meters exceed the total units on {chk.negativeMiscDays.map((x) => dayLabel(x)).join(', ')} — misc taken as 0 on those days. Please check the unit entries.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/* Simple, dependency-free two-line chart (react-native-svg) — works on app, web and tablet. */
function LineChartAB({ rows, height = 170 }) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState(-1);
  const padL = 40;
  const padR = 8;
  const padT = 12;
  const padB = 20;
  const vals = rows.flatMap((r) => [r.A, r.B]).filter((v) => v !== null && Number.isFinite(v));
  const max = Math.max(...vals, 0.01) * 1.12;
  const innerW = Math.max(1, w - padL - padR);
  const innerH = height - padT - padB;
  const x = (i) => padL + (rows.length > 1 ? (i * innerW) / (rows.length - 1) : innerW / 2);
  const y = (v) => padT + innerH - (num(v) / max) * innerH;
  const pts = (k) => rows.map((r, i) => (r[k] === null ? null : `${x(i)},${y(r[k])}`)).filter(Boolean).join(' ');
  const ticks = [0, max / 2, max];
  const s = sel >= 0 ? rows[sel] : null;

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height, marginTop: 4 }}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          {ticks.map((t, i) => (
            <React.Fragment key={i}>
              <Line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="#EEE8DF" strokeWidth={1} />
              <SvgText x={padL - 4} y={y(t) + 3} fontSize={9} fill="#8A8177" textAnchor="end">{`₹${t.toFixed(2)}`}</SvgText>
            </React.Fragment>
          ))}
          {['A', 'B'].map((k) => (
            <Polyline key={k} points={pts(k)} fill="none" stroke={secColor(k)} strokeWidth={2.5} />
          ))}
          {rows.map((r, i) => (
            <React.Fragment key={`d${i}`}>
              {r.A !== null ? <Circle cx={x(i)} cy={y(r.A)} r={sel === i ? 4.5 : 2.5} fill={secColor('A')} /> : null}
              {r.B !== null ? <Circle cx={x(i)} cy={y(r.B)} r={sel === i ? 4.5 : 2.5} fill={secColor('B')} /> : null}
              {(rows.length <= 16 || i % Math.ceil(rows.length / 16) === 0) ? (
                <SvgText x={x(i)} y={height - 5} fontSize={9} fill="#8A8177" textAnchor="middle">{r.day}</SvgText>
              ) : null}
            </React.Fragment>
          ))}
        </Svg>
      ) : null}
      {/* tap targets, one per day */}
      {w > 0 ? (
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', paddingLeft: padL - innerW / Math.max(1, rows.length - 1) / 2, paddingRight: padR }]}>
          {rows.map((r, i) => (
            <TouchableOpacity key={`t${i}`} style={{ flex: 1 }} onPress={() => setSel(sel === i ? -1 : i)} />
          ))}
        </View>
      ) : null}
      {s ? (
        <View pointerEvents="none" style={st.tip}>
          <Text style={st.tipTitle}>{dayLabel(s.ymd, s.day)}</Text>
          <Text style={st.tipLine}>Section A  {s.A === null ? '—' : `${r2(s.A)}/m`}</Text>
          <Text style={st.tipLine}>Section B  {s.B === null ? '—' : `${r2(s.B)}/m`}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section conversion rates · A / B (artifact)                                */
/* -------------------------------------------------------------------------- */

export function SectionConversionRates({ d, isLarge }) {
  if (d?.section_ab_active !== true) return null;
  const c = secCounts(d);
  const sec = (k) => {
    const prod = num(k === 'A' ? d.section_a_prod : d.section_b_prod);
    const avg = num(k === 'A' ? d.section_a_avg_picks : d.section_b_avg_picks);
    const picks = prod * avg;
    const per = (v) => (picks > 0 ? num(v) / picks : 0);
    const P = k === 'A' ? 'section_a_' : 'section_b_';
    const conv = per(num(d[`${P}elec`]) + num(d[`${P}salary`]));
    const ovh = per(num(d[`${P}stores`]) + num(d[`${P}maintenance`]) + num(d[`${P}other`]));
    return { conv, ovh, avg };
  };
  const card = (k) => {
    const x = sec(k);
    return (
      <View key={k} style={[st.convCard, { borderTopColor: secColor(k) }, isLarge && { flex: 1 }]}>
        <View style={st.rowCenter}>
          <SecTag s={k} size={9.5} />
          <Text style={st.convTitle}>Section {k} · {k === 'A' ? c.A : c.B} mc</Text>
        </View>
        <Text style={st.headGroups}>{secLbl(d, k).replace(/^[AB] — /, '')}</Text>
        {[['Weaving conversion', x.conv, 'electricity + wages'], ['Overheads', x.ovh, 'stores + maintenance + other'], ['Total', x.conv + x.ovh, 'per pick per metre']].map(([l, v, n], i) => (
          <View key={l} style={[st.convRow, i === 2 && { borderTopWidth: 1, borderTopColor: '#E5DED4' }]}>
            <Text style={[st.convLbl, i === 2 && { fontWeight: '800' }]}>{l} <Text style={st.mSub}>· {n}</Text></Text>
            <Text style={[st.convVal, i === 2 && { color: '#B77932', fontSize: 12.5 }]}>{pk(v)}</Text>
          </View>
        ))}
        <Text style={st.mSub}>≈ {r2((x.conv + x.ovh) * x.avg)}/m at {x.avg.toFixed(1)} picks</Text>
      </View>
    );
  };
  return (
    <View style={st.box}>
      <View style={[st.boxHead, { paddingBottom: 6 }]}>
        <View style={{ flex: 1 }}>
          <Text style={st.boxTitle}>Section conversion rates · A / B</Text>
          <Text style={st.boxSub}>Month to date · per pick · used for roll costing</Text>
        </View>
        <View style={[st.pill, { borderColor: '#C2823A66', backgroundColor: '#FFF4E8' }]}>
          <Text style={[st.pillText, { color: '#B77932' }]}>LIVE</Text>
        </View>
      </View>
      <View style={[{ gap: 8, paddingHorizontal: 12, paddingBottom: 12 }, isLarge && { flexDirection: 'row' }]}>
        {card('A')}
        {card('B')}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Daily trend sheet                                                          */
/* -------------------------------------------------------------------------- */

export function SeniorTrendSheet({ open, onClose, d, trend }) {
  const month = useSeniorMonth(d);
  const { width } = useWindowDimensions();
  const narrow = width < 520;
  const key = trend?.key;
  const isSection = key === 'secA' || key === 'secB';
  const rows = useMemo(() => (key ? seniorSeries(month, key) : []), [month, key]);
  const [selected, setSelected] = useState(-1);
  React.useEffect(() => { setSelected(-1); }, [key, open]);
  const sel = rows[selected >= 0 ? selected : rows.length - 1] || null;

  const valid = rows.filter((r) => r.cpp !== null && Number.isFinite(r.cpp));
  const sumAmt = rows.reduce((t, r) => t + num(r.amount), 0);
  const sumPicks = rows.reduce((t, r) => t + num(r.picks), 0);
  const sumProd = rows.reduce((t, r) => t + num(r.prod), 0);
  const avg = sumPicks > 0 ? sumAmt / sumPicks : null; // Σ ₹ ÷ Σ picks (same as the month card)
  const best = valid.length ? Math.min(...valid.map((r) => r.cpp)) : null;
  const worst = valid.length ? Math.max(...valid.map((r) => r.cpp)) : null;
  const max = Math.max(...valid.map((r) => r.cpp), 0.000001);
  const color = trend?.color || '#185FA5';

  if (!open || !trend) return null;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[st.overlay, narrow && { padding: 8 }]}>
        <View style={st.sheet}>
          <View style={st.sheetHead}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={st.sheetTitle}>{trend.title || 'Daily trend'}</Text>
              <Text style={st.sheetSub}>
                {isSection
                  ? "Each day on its own: that day's electricity (units × that day's rate, incl. its warping + misc share) + that day's store share ÷ that day's production × average picks."
                  : "Each day on its own: that day's units × that day's rate ÷ that day's production × average picks of the machines this meter serves."}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}><Text style={{ fontSize: 22, color: '#6b7280' }}>×</Text></TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 7, marginBottom: 8 }}>
            {[['MONTH AVG', avg], ['BEST DAY', best], ['WORST DAY', worst]].map(([l, v]) => (
              <View key={l} style={st.stat}>
                <Text style={st.statLabel}>{l}</Text>
                <Text style={[st.statValue, narrow && { fontSize: 12 }]}>{pk(v)}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 6 }}>
            {rows.map((r, i) => {
              const active = sel === r;
              const h = r.cpp !== null && r.cpp > 0 ? Math.max(3, (r.cpp / max) * 100) : 0;
              const above = avg !== null && r.cpp !== null && r.cpp > avg;
              return (
                <TouchableOpacity key={`${r.date_ymd}-${i}`} onPress={() => setSelected(i)} style={{ width: 40, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Text style={{ fontSize: 8.5, color: active ? '#111827' : '#9ca3af', marginBottom: 3, minHeight: 12 }}>
                    {active ? pk(r.cpp, 3) : ''}
                  </Text>
                  <View style={{ height: 92, width: 22, justifyContent: 'flex-end', backgroundColor: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                    {h > 0 ? <View style={{ width: '100%', height: `${h}%`, backgroundColor: above ? '#C2823A' : color, opacity: active ? 1 : 0.65 }} /> : null}
                  </View>
                  <Text style={{ fontSize: 9, color: active ? '#111827' : '#6b7280', marginTop: 4 }}>{String(r.day ?? '').padStart(2, '0')}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={st.legend}>Amber bars = above the month average.</Text>

          {sel ? (
            <View style={st.selBox}>
              <Text style={{ fontSize: 11.5, fontWeight: '800' }}>{dayLabel(sel.date_ymd, sel.day)}</Text>
              <Text style={st.selText}>
                {isSection
                  ? `Electricity ${inr(sel.elec)} + Store ${inr(sel.store)} = ${inr(sel.amount)} ÷ (${qty(sel.prod)} m × ${num(sel.avgPicks).toFixed(1)} picks) = ${pk(sel.cpp)}/pick`
                  : `${qty(sel.kwh)} kWh × ₹${num(sel.rate).toFixed(2)} = ${inr(sel.amount)} ÷ (${qty(sel.prod)} m × ${num(sel.avgPicks).toFixed(1)} picks) = ${pk(sel.cpp)}/pick`}
              </Text>
            </View>
          ) : null}

          <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
            <View style={st.tHead}>
              <Text style={[st.th, { flex: 0.9 }]}>DATE</Text>
              <Text style={[st.th, st.r]}>{isSection ? 'ELEC ₹' : 'kWh'}</Text>
              <Text style={[st.th, st.r]}>{isSection ? 'STORE ₹' : 'RATE'}</Text>
              <Text style={[st.th, st.r]}>PROD m</Text>
              {!narrow ? <Text style={[st.th, st.r]}>PICKS</Text> : null}
              <Text style={[st.th, st.r]}>₹/PICK</Text>
            </View>
            {rows.map((r, i) => {
              const isWorst = worst !== null && r.cpp === worst;
              const isBest = best !== null && r.cpp === best;
              return (
                <TouchableOpacity
                  key={`${r.date_ymd}-row-${i}`}
                  onPress={() => setSelected(i)}
                  style={[st.tRow, isWorst && { backgroundColor: '#FCEDEA' }, isBest && { backgroundColor: '#E4F1E8' }]}
                >
                  <Text style={[st.td, { flex: 0.9 }]}>{dayLabel(r.date_ymd, r.day)}</Text>
                  <Text style={[st.td, st.r]}>{isSection ? qty(r.elec) : qty(r.kwh)}</Text>
                  <Text style={[st.td, st.r]}>{isSection ? qty(r.store) : num(r.rate).toFixed(2)}</Text>
                  <Text style={[st.td, st.r]}>{qty(r.prod)}</Text>
                  {!narrow ? <Text style={[st.td, st.r]}>{num(r.avgPicks).toFixed(1)}</Text> : null}
                  <Text style={[st.td, st.r, { fontWeight: '800', color: avg !== null && r.cpp !== null && r.cpp > avg ? '#B42318' : '#111827' }]}>{pk(r.cpp)}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={[st.tRow, st.tRowStrong]}>
              <Text style={[st.td, { flex: 0.9, fontWeight: '800' }]}>MONTH TO DATE</Text>
              <Text style={[st.td, st.r, { fontWeight: '800' }]}>{isSection ? qty(rows.reduce((t, r) => t + num(r.elec), 0)) : qty(rows.reduce((t, r) => t + num(r.kwh), 0))}</Text>
              <Text style={[st.td, st.r, { fontWeight: '800' }]}>{isSection ? qty(rows.reduce((t, r) => t + num(r.store), 0)) : ''}</Text>
              <Text style={[st.td, st.r, { fontWeight: '800' }]}>{qty(sumProd)}</Text>
              {!narrow ? <Text style={[st.td, st.r, { fontWeight: '800' }]}>{sumProd > 0 ? (sumPicks / sumProd).toFixed(1) : '—'}</Text> : null}
              <Text style={[st.td, st.r, { fontWeight: '800', color }]}>{pk(avg)}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontWeight: '800' },

  headGrid: { gap: 8 },
  headCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5DED4', borderTopWidth: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  headTitle: { fontSize: 12, fontWeight: '800', color: '#111827' },
  headMc: { marginLeft: 'auto', fontSize: 10.5, fontWeight: '800' },
  headLbl: { marginTop: 3, fontSize: 10, color: '#111827', fontWeight: '600', lineHeight: 14 },
  headGroups: { marginTop: 2, fontSize: 9.5, color: '#8A8177', lineHeight: 13 },
  headNum: { fontSize: 10.5, fontWeight: '800', color: '#111827' },
  headMuted: { fontSize: 10.5, color: '#8A8177' },
  headCpp: { marginLeft: 'auto', fontSize: 10.5, fontWeight: '800' },

  grid: { gap: 8 },
  secCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5DED4', borderTopWidth: 3, borderRadius: 10, padding: 12 },
  secHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  secTitle: { fontSize: 12, fontWeight: '800', color: '#111827', lineHeight: 16 },
  secSub: { marginTop: 2, fontSize: 9.5, color: '#8A8177', lineHeight: 13 },
  pill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  pillText: { fontSize: 8.5, fontWeight: '800' },
  line: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F4EFE8' },
  lineLabel: { fontSize: 10.5, color: '#111827', flexShrink: 1 },
  lineValue: { fontSize: 10.5, fontWeight: '700', color: '#111827' },
  foot: { marginTop: 9, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  footLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4, color: '#8A8177' },
  footValue: { marginTop: 2, fontSize: 15, fontWeight: '800' },
  footValueDark: { marginTop: 2, fontSize: 13, fontWeight: '800', color: '#111827' },

  box: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5DED4', borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  boxHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  boxTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  boxSub: { marginTop: 2, fontSize: 10, color: '#8A8177' },
  boxAmount: { fontSize: 12.5, fontWeight: '800', color: '#185FA5' },
  chev: { fontSize: 13, color: '#6b7280', marginLeft: 4 },
  explain: { fontSize: 10, lineHeight: 14, color: '#8A8177', marginBottom: 8 },
  note: { fontSize: 9, lineHeight: 13, color: '#8A8177', marginTop: 4 },
  link: { fontSize: 10, fontWeight: '800', color: '#185FA5', marginLeft: 8 },

  mCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5DED4', borderLeftWidth: 3, borderRadius: 10, paddingHorizontal: 11, paddingTop: 8, paddingBottom: 7, marginBottom: 8 },
  mHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  mHeadTxt: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4, color: '#8A8177' },
  mCardTitle: { fontSize: 11.5, fontWeight: '800', color: '#111827' },
  mRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  mLeft: { flex: 1, minWidth: 0 },
  mLbl: { fontSize: 11.5, fontWeight: '600', color: '#111827' },
  mSub: { fontSize: 9, color: '#8A8177' },
  mPerM: { minWidth: 62, textAlign: 'right', fontSize: 10, color: '#8A8177' },
  mPerPk: { minWidth: 86, textAlign: 'right', fontSize: 12.5, fontWeight: '800', color: '#111827' },
  mChev: { width: 10, textAlign: 'right', color: '#185FA5', fontSize: 12, fontWeight: '800' },
  chartTitle: { fontSize: 11.5, fontWeight: '800', color: '#111827' },
  workWrap: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#E5DED4', borderStyle: 'dashed', paddingTop: 7 },
  workLine: { fontSize: 9.5, lineHeight: 15, color: '#6b7280', paddingVertical: 1 },
  tip: { position: 'absolute', top: 4, right: 8, backgroundColor: '#0D1B2A', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  tipTitle: { color: '#fff', fontSize: 10.5, fontWeight: '800', marginBottom: 2 },
  tipLine: { color: '#C9D3DE', fontSize: 10 },

  convCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5DED4', borderTopWidth: 4, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11 },
  convTitle: { fontSize: 11.5, fontWeight: '800', color: '#111827' },
  convRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingVertical: 4 },
  convLbl: { fontSize: 10.5, fontWeight: '600', color: '#111827', flexShrink: 1 },
  convVal: { fontSize: 11.5, fontWeight: '800', color: '#111827' },

  tHead: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 4 },
  th: { flex: 1, fontSize: 9, fontWeight: '800', color: '#6b7280' },
  r: { textAlign: 'right' },
  tRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 4 },
  tRowStrong: { backgroundColor: '#F8FAFC' },
  td: { flex: 1, fontSize: 10, color: '#111827' },

  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.38)', justifyContent: 'center', padding: 14 },
  sheet: { backgroundColor: '#fff', borderRadius: 16, maxHeight: '92%', padding: 14, width: '100%', maxWidth: 760, alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  sheetSub: { fontSize: 10.5, color: '#6b7280', marginTop: 3, lineHeight: 15 },
  stat: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 9, padding: 8 },
  statLabel: { fontSize: 9, color: '#6b7280' },
  statValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  legend: { fontSize: 9, color: '#8A8177', marginBottom: 4 },
  selBox: { backgroundColor: '#f8fafc', borderRadius: 9, padding: 9, marginVertical: 6 },
  selText: { fontSize: 10.5, color: '#4b5563', marginTop: 3, lineHeight: 15 },
});
