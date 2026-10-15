/**
 * Expense report — React Native port of the ERP Designing artifact's
 * ExpenseModule (same blocks, order, labels, charts and drill-downs).
 * Figures come from xCalc.js (senior's A / B rules on live ERP data).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  T, XC, makeXSEC, makeXU_CARDS, makeXU_METERS, xClosedRates, xCr, xCurrent, xDailySeries, xDayKwhAB, xK0, xM, xPc,
  xR2, xR3, xR4, xSectionMTD, xUtilDaily, xUtilMeters, XUKEYS, xGroupHeads,
} from './xCalc';
import { card, DefaultTip, Grid, hbuzz, MONO, PremiumTip, Sheet, XChart, XDonut, XKPI, XSection, XSecTag, XStat } from './xUi';

const SHARE_TXT = 'A 1/3 : B 2/3';

/* ------------------------------------------------------------------ */
/*  Management summary card                                            */
/* ------------------------------------------------------------------ */
const pcTxt = (v) => { const x = Math.round((+v || 0) * 10000) / 100; return `${Number.isInteger(x) ? x : x.toFixed(2)}%`; };
/** machine-group lines under a head (Electricity / Salary / Stores) — always open, like the production card */
const groupNote = (g, head) => {
  if (head === 'elec') return `own meters ${xCr(g.elec.own)} + ${pcTxt(g.pct)} of Section ${g.sec}'s ${g.sec === 'A' ? '1/3' : '2/3'} warping + misc ${xCr(g.elec.shared)}`;
  return `${pcTxt(g.pct)} of Section ${g.sec} ${head === 'sal' ? 'salary' : 'stores'}`;
};
function XSumCard({ title, d, accent, onTrend, groups }) {
  const sub = (head) => (groups || []).map((g) => (
    <View key={`${head}-${g.k}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingLeft: 16, borderBottomWidth: 1, borderBottomColor: T.alt }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: T.ink }} numberOfLines={1}>{g.lbl}</Text>
        <Text style={{ fontSize: 9, color: T.muted, marginTop: 1 }} numberOfLines={2}>{groupNote(g, head)}</Text>
      </View>
      <Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '600', color: T.ink, minWidth: 62, textAlign: 'right' }}>{xCr(g[head].amt)}</Text>
      <Text style={{ fontFamily: MONO, fontSize: 9.5, color: T.muted, minWidth: 58, textAlign: 'right' }}>{`${xR3(g[head].perPick)}/pk`}</Text>
    </View>
  ));
  const row = (l, b, c, head) => (
    <View key={l}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.alt }}>
        <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c }} />
        <Text style={{ flex: 1, fontSize: 11.5, color: T.ink, fontWeight: head && groups ? '700' : '400' }}>{l}</Text>
        <Text style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink, minWidth: 62, textAlign: 'right', fontWeight: head && groups ? '700' : '400' }}>{b.amt === null ? '—' : xCr(b.amt)}</Text>
        <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 58, textAlign: 'right' }}>{b.perPick === null ? '—' : `${xR3(b.perPick)}/pk`}</Text>
      </View>
      {head && groups && b.amt !== null ? sub(head) : null}
    </View>
  );
  return (
    <View style={[card, { padding: 12, borderTopWidth: 3, borderTopColor: accent, marginBottom: 10 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
        <Pressable onPress={onTrend} disabled={!onTrend} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: T.ink, flexShrink: 1 }}>{title}</Text>
          {onTrend ? (
            <View style={{ backgroundColor: accent + '18', borderWidth: 1, borderColor: accent + '55', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9.5, fontWeight: '800', color: accent }}>daily trend ›</Text>
            </View>
          ) : null}
        </Pressable>
        <Text style={{ fontSize: 10, color: T.muted, fontFamily: MONO }}>{xM(d.prod)} · {(+d.picks || 0).toFixed(0)} pk</Text>
      </View>
      {row('Electricity', d.elec, XC.elec, 'elec')}
      {row('Salary', d.sal, XC.sal, 'sal')}
      {row('Stores', d.store, XC.store, 'store')}
      {d.maint.amt > 0 ? row('Maintenance', d.maint, XC.fixed) : null}
      {d.oth.amt > 0 ? row('Other', d.oth, XC.other) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }}>
        <View>
          <Text style={{ fontSize: 8, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '800' }}>Cost / pick</Text>
          <Text style={{ fontFamily: MONO, fontSize: 14, fontWeight: '700', color: T.copper }}>{d.totPick === null ? '—' : xR3(d.totPick)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 8, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '800' }}>Avg picks</Text>
          <Text style={{ fontFamily: MONO, fontSize: 14, fontWeight: '700', color: T.ink }}>{(+d.picks || 0).toFixed(0)}</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Production vs cost / pick                                          */
/* ------------------------------------------------------------------ */
function XProdExpChart({ months }) {
  const data = months.map((m) => ({ name: m.label.split(' ')[0], prod: +(m.totalProd / 1e5).toFixed(2), cpp: +(+m.costPerPick || 0).toFixed(3) }));
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
      tooltip={(r) => <PremiumTip label={r.name} items={[{ name: 'Prod (L m)', value: r.prod, color: T.copper }, { name: 'Cost/pick ₹', value: r.cpp, color: T.nav }]} />}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Day-wise trend sheet (sections + every meter)                      */
/* ------------------------------------------------------------------ */
function XTrendSheet({ exp, kind, k, onClose }) {
  const S = useMemo(() => xDailySeries(exp), [exp]);
  const XSEC = makeXSEC(exp.counts);
  const XU_METERS = makeXU_METERS(exp.counts);
  const isU = kind === 'util';
  const uDef = isU ? XU_METERS[k] : null;
  const title = isU ? `${uDef.lbl} · ${uDef.sub}` : k === 'A' ? XSEC.A.lbl : k === 'B' ? XSEC.B.lbl : 'Total (Section A + Section B)';
  const data = S.rows.map((r) => (isU
    ? { d: r.d.slice(0, 2), full: r.d, v: +r.util[k].perPick.toFixed(4), units: r.util[k].units, prod: r.util[k].prod, cost: r.util[k].cost, picks: r.util[k].picks }
    : { d: r.d.slice(0, 2), full: r.d, v: +r.cpp[k].toFixed(3), prod: r.prod[k], cost: r.cost[k], elec: r.elec[k], picks: r.picks[k] }));
  const avg = isU ? S.upk[k] : S.avg[k];
  const F = isU ? xR4 : xR3;
  const vals = data.map((x) => x.v).filter((v) => v > 0);
  const hi = vals.length ? Math.max(...vals) : 0, lo = vals.length ? Math.min(...vals) : 0;
  const col = isU ? XC.elec : k === 'A' ? XSEC.A.color : k === 'B' ? XSEC.B.color : T.nav;
  const cell = (wd, txt, extra) => <Text style={[{ width: wd, textAlign: 'right', fontFamily: MONO, fontSize: 10.5, color: T.ink }, extra]} numberOfLines={1}>{txt}</Text>;
  const hcell = (wd, txt) => <Text style={{ width: wd, textAlign: 'right', fontSize: 8.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4 }}>{txt}</Text>;
  const sumProd = data.reduce((a, r) => a + r.prod, 0);
  return (
    <Sheet open onClose={onClose} title={title}>
      <View style={{ paddingTop: 4, paddingHorizontal: 14, paddingBottom: 16 }}>
        <Text style={{ fontSize: 10.5, color: T.muted, lineHeight: 15.75, marginBottom: 8 }}>
          {isU
            ? `Daily electricity cost per pick — that day's ${uDef && uDef.remainder ? 'remaining units (total − the other meters)' : 'units on this meter'} × that day's unit rate ÷ that day's ${uDef ? uDef.basis : 'production'}. `
            : "Daily cost per pick — that day's electricity, wages, maintenance, other and allocated stores ÷ metres ÷ picks. "}
          {exp.label} · {data.length} day{data.length !== 1 ? 's' : ''} · dashed line = month average
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <XStat label="Month avg ₹/pick" value={F(avg)} />
          <XStat label="Best day" value={F(lo)} />
          <XStat label="Worst day" value={F(hi)} />
        </View>
        <XChart
          data={data}
          height={210}
          margin={{ top: 14, right: 10, left: -6, bottom: 2 }}
          xKey="d"
          xTick={{ fontSize: 9 }}
          axes={isU
            ? { v: { side: 'left', domain: 'auto', fmt: (v) => '₹' + v }, u: { side: 'right', domain: 'zero', fmt: (v) => xK0(v) } }
            : { v: { side: 'left', domain: 'auto', fmt: (v) => '₹' + v } }}
          bars={isU ? [{ key: 'units', axis: 'u', fill: XC.elec, opacity: 0.18, radius: 3, name: 'kWh' }] : []}
          lines={[{ key: 'v', axis: 'v', color: col, width: 2.5, dot: { r: 3, fill: col }, activeR: 5, name: '₹ per pick' }]}
          refLines={[{ axis: 'v', y: +avg.toFixed(isU ? 4 : 3), color: col, dash: '4 4', opacity: 0.7 }]}
          tooltip={(r) => (
            <DefaultTip label={r.full} items={[
              ...(isU ? [{ name: 'kWh', value: `${xK0(r.units)} kWh`, color: XC.elec }] : []),
              { name: '₹ per pick', value: `${F(r.v)}/pick`, color: col },
            ]} />
          )}
        />
        <View style={[card, { paddingVertical: 4, marginTop: 10 }]}>
          <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 7, paddingHorizontal: 12 }}>
            <Text style={{ flex: 1, fontSize: 8.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4 }}>DATE</Text>
            {isU ? <>{hcell(54, 'kWh')}{hcell(60, 'PROD m')}{hcell(36, 'PPI')}{hcell(62, '₹/PICK')}</>
              : <>{hcell(64, 'PROD m')}{hcell(36, 'PICKS')}{hcell(66, 'COST')}{hcell(60, '₹/PICK')}</>}
          </View>
          {data.map((r) => (
            <View key={r.full} style={{ flexDirection: 'row', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: T.alt, backgroundColor: r.v === hi && hi > 0 ? '#FCEDEA' : r.v === lo && lo > 0 ? '#E4F1E8' : 'transparent' }}>
              <Text style={{ flex: 1, fontFamily: MONO, fontSize: 10.5, color: T.ink }}>{r.full}</Text>
              {isU ? <>
                {cell(54, xK0(r.units))}{cell(60, xK0(r.prod))}{cell(36, r.picks > 0 ? r.picks.toFixed(1) : '—')}
                {cell(62, r.v ? xR4(r.v) : '—', { fontWeight: '800', color: r.v > avg ? T.red : T.ink })}
              </> : <>
                {cell(64, xK0(r.prod))}{cell(36, r.picks.toFixed(0))}{cell(66, xCr(r.cost))}
                {cell(60, r.v ? xR3(r.v) : '—', { fontWeight: '800', color: r.v > avg ? T.red : T.ink })}
              </>}
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 2, borderTopColor: T.border, backgroundColor: T.sub }}>
            <Text style={{ flex: 1, fontSize: 10.5, fontWeight: '800', color: T.ink }}>MONTH TO DATE</Text>
            {isU ? <>
              {cell(54, xK0(data.reduce((a, r) => a + r.units, 0)), { fontWeight: '800' })}
              {cell(60, xK0(sumProd), { fontWeight: '800' })}
              {cell(36, (() => { const pm = data.reduce((a, r) => a + r.prod * (r.picks || 0), 0); return sumProd > 0 ? (pm / sumProd).toFixed(1) : '—'; })(), { fontWeight: '800' })}
              {cell(62, xR4(avg), { fontWeight: '800' })}
            </> : <>
              {cell(64, xK0(sumProd), { fontWeight: '800' })}
              <View style={{ width: 36 }} />
              {cell(66, xCr(data.reduce((a, r) => a + r.cost, 0)), { fontWeight: '800' })}
              {cell(60, xR3(avg), { fontWeight: '800' })}
            </>}
          </View>
        </View>
        <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 8, lineHeight: 14.25 }}>
          Red = above the month average, green = best day. Days come from the day-wise entries in the input module; the month average is production-weighted, so it matches the monthly figure on the summary card.
        </Text>
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Utilities · electricity cost per pick by meter                     */
/* ------------------------------------------------------------------ */
function XUtilCost({ ub, daily, m, onTrend, counts }) {
  const [work, setWork] = useState(false);
  const XSEC = makeXSEC(counts);
  const XU_CARDS = makeXU_CARDS(counts);
  const colM = { fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 60, textAlign: 'right' };
  const colPk = { fontFamily: MONO, fontWeight: '800', minWidth: 82, textAlign: 'right' };
  const chev = { width: 10, textAlign: 'right', color: onTrend ? XC.elec : 'transparent', fontSize: 12, fontWeight: '800' };
  const secCol = (s) => (s === 'A' ? XSEC.A.color : s === 'B' ? XSEC.B.color : T.nav);
  const row = (r, total, col) => (
    <Pressable key={r.k} onPress={onTrend ? () => onTrend(r.k) : undefined} disabled={!onTrend} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: total ? 6 : 5, paddingBottom: total ? 2 : 5 }}>
      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: total ? 12 : 11.5, fontWeight: total ? '800' : '600', color: T.ink }}>{r.lbl}</Text>
        <Text style={{ fontSize: 9, color: T.muted }}>{r.sub}</Text>
      </View>
      <Text style={colM} numberOfLines={1}>{r.prod > 0 ? `${xR2(r.perM)}/m` : '—'}</Text>
      <Text style={[colPk, { fontSize: total ? 14 : 12.5, color: total ? col : T.ink }]} numberOfLines={1}>{r.picks > 0 ? `${xR4(r.perPick)}/pk` : '—'}</Text>
      <Text style={chev}>›</Text>
    </Pressable>
  );
  const head = (left) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 2 }}>
      {left}
      <Text style={[colM, { fontSize: 8, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' }]}>₹ / m</Text>
      <Text style={[colPk, { fontSize: 8, color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' }]}>₹ / pick</Text>
      <Text style={chev}> </Text>
    </View>
  );
  const cardOf = (c) => (
    <View key={c.k} style={{ backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, borderLeftColor: secCol(c.sec), borderRadius: 10, paddingTop: 8, paddingHorizontal: 11, paddingBottom: 7, marginBottom: 8 }}>
      {head(
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <XSecTag s={c.sec} />
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: T.ink }}>{c.lbl}</Text>
          <Text style={{ fontSize: 9, color: T.muted }}>{c.sub}</Text>
        </View>,
      )}
      {c.keys.map((k) => row(ub.byK[k], false, secCol(c.sec)))}
    </View>
  );
  const tot = ub.byK.total;
  const fm = (n) => `${xK0(n)} m`;
  return (
    <View>
      <Text style={{ fontSize: 10, color: T.muted, lineHeight: 14.5, marginBottom: 8 }}>
        Electricity cost per pick for each meter · {m.label} · {m.days} day{m.days !== 1 ? 's' : ''}{onTrend ? ' · tap a row for its day-wise trend' : ''}
      </Text>
      {XU_CARDS.map(cardOf)}
      <View style={{ backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, borderLeftColor: T.nav, borderRadius: 10, paddingTop: 5, paddingHorizontal: 11, paddingBottom: 8, marginBottom: 4 }}>
        {row(tot, true, T.nav)}
      </View>
      {daily && daily.rows.length > 1 ? (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: T.ink }}>Cost per metre · by day</Text>
            <Text style={{ fontSize: 9.5, color: T.muted }}>{m.label} · {daily.rows.length} days · tap a day for the exact value</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: 5 }}>
            {['A', 'B'].map((k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: XSEC[k].color }} />
                <Text style={{ fontSize: 9.5, color: T.muted }}>{XSEC[k].short} <Text style={{ fontSize: 9.5, fontFamily: MONO, color: T.ink }}>avg {xR2(daily.avg[k])}/m</Text></Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 2 }}>
            <XChart
              data={daily.rows}
              height={170}
              margin={{ top: 12, right: 8, left: -8, bottom: 0 }}
              xKey="d"
              xTick={{ fontSize: 9, fill: T.muted }}
              axes={{ v: { side: 'left', domain: 'zero', fmt: (v) => '₹' + v, fill: T.muted } }}
              lines={[
                { key: 'A', axis: 'v', color: XSEC.A.color, width: 2.5, dot: { r: 2.5, fill: XSEC.A.color, strokeWidth: 0 }, activeR: 5, name: 'Section A' },
                { key: 'B', axis: 'v', color: XSEC.B.color, width: 2.5, dot: { r: 2.5, fill: XSEC.B.color, strokeWidth: 0 }, activeR: 5, name: 'Section B' },
              ]}
              tooltip={(r) => (
                <DefaultTip label={r.full} items={[
                  ...(r.A !== null ? [{ name: 'Section A', value: `${xR2(r.A)}/m`, color: XSEC.A.color }] : []),
                  ...(r.B !== null ? [{ name: 'Section B', value: `${xR2(r.B)}/m`, color: XSEC.B.color }] : []),
                ]} />
              )}
            />
          </View>
          <Text style={{ fontSize: 9, color: T.muted, marginTop: 4, lineHeight: 12.6 }}>
            Section lines use the summary cards’ split of the shared meters (S. Rapier Luwa 100 % to B, warping + misc {SHARE_TXT}).
          </Text>
        </View>
      ) : (
        <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 8 }}>Day-wise figures are shown for the ongoing month.</Text>
      )}
      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: T.border, borderStyle: 'dashed', paddingTop: 7 }}>
        <Pressable onPress={() => setWork(!work)} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 10, color: T.muted }}>Cost / pick = meter kWh × ₹/unit ÷ production of the machines it serves ÷ their average PPI</Text>
          <Text style={{ fontSize: 10, fontWeight: '800', color: XC.elec }}>{work ? 'hide working ▴' : 'show working ▾'}</Text>
        </Pressable>
        {work ? (
          <View style={{ marginTop: 6 }}>
            {ub.rows.map((r) => (
              <Text key={r.k} style={{ fontSize: 9.5, color: T.muted, fontFamily: MONO, paddingVertical: 2, lineHeight: 14.25 }}>
                <Text style={{ color: T.ink, fontWeight: '700' }}>{r.lbl}</Text>
                {' · '}{r.remainder ? `${xK0(ub.unitsAll)} − ${xK0(ub.othersUnits)} = ` : ''}{xK0(r.units)} kWh × {xR2(ub.rate)} = {xCr(r.cost)}
                {' ÷ '}{fm(r.prod)}{r.prod === ub.prodAll ? ' (total)' : ''} ÷ {(+r.ppi || 0).toFixed(1)} PPI{r.pick === 'all' ? ' (weighted)' : ''} = {xR4(r.perPick)}
              </Text>
            ))}
            <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 6, lineHeight: 13.8 }}>
              Each meter is divided only by the production of the machines it serves — nothing is pooled or re-allocated. MW looms and MW Luwa ÷ M Weaves production; S. Rapier looms and Luwa ÷ the {counts.s190} 190 cm looms’ production; the 230 cm looms ÷ their own; warping, miscellaneous and the total ÷ total production and the production-weighted PPI ({(+ub.ppiAll || 0).toFixed(1)}). Miscellaneous = total units − the meters above.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Input modules                                                      */
/* ------------------------------------------------------------------ */
const bigBox = { width: '100%', paddingVertical: 11, paddingHorizontal: 12, borderWidth: 1, borderColor: T.border, borderRadius: 9, backgroundColor: '#fff' };
const bigTxt = { fontSize: 16, fontFamily: MONO, textAlign: 'right', color: T.ink };
const BackBtn = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
    <Text style={{ color: T.copper, fontSize: 13, fontWeight: '700' }}>‹ Back to report</Text>
  </TouchableOpacity>
);
const SecCards = ({ XSEC, mc }) => (
  <Grid cols={2} gap={8} style={{ marginBottom: 12 }}>
    {['A', 'B'].map((k) => (
      <View key={k} style={[card, { paddingVertical: 9, paddingHorizontal: 11, borderTopWidth: 3, borderTopColor: XSEC[k].color, flex: 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <XSecTag s={k} />
          <Text style={{ fontSize: 11, fontWeight: '800', color: T.ink, flexShrink: 1 }}>{XSEC[k].short} · {XSEC[k].n} {mc}</Text>
        </View>
        <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 3, lineHeight: 12.8 }}>{XSEC[k].lbl.replace(/^[AB] — /, '')}</Text>
      </View>
    ))}
  </Grid>
);
const DayHead = ({ i, r, isOpen, color, sub, empty, onPress }) => (
  <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingHorizontal: 14 }}>
    <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: isOpen ? color : T.sub, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Text style={{ color: isOpen ? '#fff' : T.muted, fontSize: 13, fontWeight: '800' }}>{i + 1}</Text>
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontSize: 13.5, fontWeight: '800', color: T.ink }}>{r.d}</Text>
      <Text style={{ fontSize: 10.5, color: empty ? T.muted : color, fontFamily: MONO, marginTop: 1 }}>{sub}</Text>
    </View>
    <Text style={{ fontSize: 13, color: T.muted }}>{isOpen ? '▾' : '›'}</Text>
  </Pressable>
);

/** Electricity units — readings come from the Web ERP Unit Consumption screen (view only here). */
function DailyUnitsModule({ exp, close }) {
  const rows = exp.dailyUnits;
  const XSEC = makeXSEC(exp.counts);
  const c = exp.counts;
  const [open, setOpen] = useState(rows.length - 1);
  const [adv, setAdv] = useState(false);
  useEffect(() => { setOpen(rows.length - 1); }, [rows.length]);
  const rowTot = (r) => XUKEYS.reduce((s, k) => s + (+r[k] || 0), 0);
  const grand = rows.reduce((s, r) => s + rowTot(r), 0);
  const cost = rows.reduce((s, r) => s + rowTot(r) * (exp.rateEdited ? exp.rate : r.rate || exp.rate), 0);
  const LOOMS = [
    ['wjetLooms', 'Waterjet — Looms', `W01–W30 · ${c.wj} machines`, 'A'],
    ['sud230Looms', 'S. Rapier (230 cm) — Looms', `R75–R84 · ${c.s230} machines · own sub-meter, never part of the 190 cm reading`, 'A'],
    ['mwLooms', 'M Weaves — Looms', `R01–R48 · ${c.mw} machines`, 'B'],
    ['sudLooms', 'S. Rapier (190 cm) — Looms', `R49–R74, R85–R96 · ${c.s190} machines`, 'B'],
  ];
  const OTHER = [
    ['mwLuwa', 'M Weaves — Humidification (Luwa)', `${c.mw} machines`, 'B'],
    ['sudLuwa', 'S. Rapier — Humidification (Luwa)', 'serves the 190 cm S. Rapier looms · 100 % Section B', 'B'],
    ['warping', 'Warping', `shared · ${SHARE_TXT}`, 'A+B'],
    ['misc', 'Miscellaneous', `shared · total − all meters above · ${SHARE_TXT}`, 'A+B'],
  ];
  const fld = (r, k, label, sub, sec) => (
    <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 12.5, color: T.ink }}>{label}</Text>
          <XSecTag s={sec} />
        </View>
        {sub ? <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 1, lineHeight: 12.8 }}>{sub}</Text> : null}
      </View>
      <View style={{ width: 118, flexShrink: 0 }}>
        <View style={bigBox}><Text style={[bigTxt, { color: r[k] ? T.ink : T.muted }]} numberOfLines={1}>{r[k] ? xK0(r[k]) : '0'}</Text></View>
      </View>
    </View>
  );
  const mtdAB = rows.reduce((a, r) => { const e = xDayKwhAB(r); return { A: a.A + e.A, B: a.B + e.B }; }, { A: 0, B: 0 });
  const rateAvg = grand > 0 ? cost / grand : exp.rate;
  const SecLine = ({ ab, size }) => (
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 3 }}>
      <Text style={{ color: XSEC.A.color, fontWeight: '700', fontFamily: MONO, fontSize: size || 10 }}>A {xK0(ab.A)} kWh</Text>
      <Text style={{ color: XSEC.B.color, fontWeight: '700', fontFamily: MONO, fontSize: size || 10 }}>B {xK0(ab.B)} kWh</Text>
    </View>
  );
  return (
    <View style={{ paddingTop: 12, paddingHorizontal: 12, paddingBottom: 30 }}>
      <BackBtn onPress={close} />
      <Text style={{ fontSize: 17, fontWeight: '800', marginBottom: 2, color: T.ink }}>Electricity units</Text>
      <Text style={{ fontSize: 11.5, color: T.muted, marginBottom: 8, lineHeight: 16.7 }}>
        Tap a day to see its sub-meter readings (kWh), entered in the Web ERP Unit Consumption screen. Looms are the main meters — humidification & utility sit under “More meters”. Each meter is entered once; the section totals follow automatically.
      </Text>
      <SecCards XSEC={XSEC} mc="machines" />
      <View style={[card, { paddingVertical: 13, paddingHorizontal: 15, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 3, borderLeftColor: XC.elec }]}>
        <View>
          <Text style={{ fontSize: 9, color: T.muted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Month to date</Text>
          <Text style={{ fontFamily: MONO, fontSize: 19, fontWeight: '700', color: T.ink }}>{xK0(grand)} kWh</Text>
          <SecLine ab={mtdAB} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, color: T.muted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Electricity @ {xR2(rateAvg)}</Text>
          <Text style={{ fontFamily: MONO, fontSize: 19, fontWeight: '700', color: XC.elec }}>{xCr(cost)}</Text>
          <Text style={{ fontSize: 9.5, color: T.muted, fontFamily: MONO, marginTop: 3 }}>A {xCr(mtdAB.A * rateAvg)} · B {xCr(mtdAB.B * rateAvg)}</Text>
        </View>
      </View>
      {rows.length === 0 ? <Text style={{ fontSize: 11.5, color: T.muted, textAlign: 'center', paddingVertical: 16 }}>No unit readings for this month yet.</Text> : null}
      {rows.map((r, i) => {
        const t = rowTot(r), isOpen = open === i, empty = t === 0;
        return (
          <View key={r.ymd || i} style={[card, { marginBottom: 8, borderColor: isOpen ? XC.elec + '66' : T.border }]}>
            <DayHead i={i} r={r} isOpen={isOpen} color={XC.elec} empty={empty} sub={empty ? 'Not entered' : `${xK0(t)} kWh`} onPress={() => setOpen(isOpen ? -1 : i)} />
            {isOpen ? (
              <View style={{ paddingTop: 2, paddingHorizontal: 15, paddingBottom: 15 }}>
                {LOOMS.map(([k, l, sb, sc]) => fld(r, k, l, sb, sc))}
                <Pressable onPress={() => setAdv((a) => !a)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 9, paddingBottom: 3, borderTopWidth: 1, borderTopColor: T.alt, marginTop: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: T.muted }}>More meters · humidification, warping, misc</Text>
                  <Text style={{ color: T.copper, fontSize: 12, fontWeight: '700' }}>{adv ? 'Hide' : 'Show'}</Text>
                </Pressable>
                {adv ? OTHER.map(([k, l, sb, sc]) => fld(r, k, l, sb, sc)) : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: T.border }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: T.muted }}>Day total</Text>
                    <SecLine ab={xDayKwhAB(r)} size={9.5} />
                  </View>
                  <Text style={{ fontFamily: MONO, fontSize: 15, fontWeight: '800', color: XC.elec }}>{xK0(t)} kWh</Text>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** Salary — wages come from the Web ERP salary entry, split to A / B by the machine map (view only here). */
function DailySalaryModule({ exp, close }) {
  const rows = exp.dailySalary;
  const XSEC = makeXSEC(exp.counts);
  const [open, setOpen] = useState(rows.length - 1);
  useEffect(() => { setOpen(rows.length - 1); }, [rows.length]);
  const tot = (r) => (+r.A || 0) + (+r.B || 0);
  const tA = rows.reduce((s, r) => s + (+r.A || 0), 0), tB = rows.reduce((s, r) => s + (+r.B || 0), 0);
  const fld = (r, k) => (
    <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <XSecTag s={k} />
          <Text style={{ fontSize: 12.5, color: T.ink, fontWeight: '700', flexShrink: 1 }}>{XSEC[k].short} · {XSEC[k].n} machines</Text>
        </View>
        <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 1, lineHeight: 12.8 }}>{XSEC[k].lbl.replace(/^[AB] — /, '')}</Text>
      </View>
      <View style={{ width: 140, flexShrink: 0 }}>
        <View style={bigBox}><Text style={[bigTxt, { color: r[k] ? T.ink : T.muted }]} numberOfLines={1}>{r[k] ? xK0(r[k]) : '0'}</Text></View>
      </View>
    </View>
  );
  return (
    <View style={{ paddingTop: 12, paddingHorizontal: 12, paddingBottom: 30 }}>
      <BackBtn onPress={close} />
      <Text style={{ fontSize: 17, fontWeight: '800', marginBottom: 2, color: T.ink }}>Salary entry</Text>
      <Text style={{ fontSize: 11.5, color: T.muted, marginBottom: 12, lineHeight: 16.7 }}>
        Tap a day to see wage cost per section (₹) — Section A (Waterjet + S. Rapier 230 cm) and Section B (Rapier 190 cm). Wages come from the Web ERP salary entry, split to A / B by the machine map.
      </Text>
      <View style={[card, { paddingVertical: 13, paddingHorizontal: 15, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: XC.sal }]}>
        <Text style={{ fontSize: 9, color: T.muted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Month to date</Text>
        <Text style={{ fontFamily: MONO, fontSize: 19, fontWeight: '700', color: XC.sal }}>{xCr(tA + tB)}</Text>
        <View style={{ marginTop: 2, flexDirection: 'row', gap: 10 }}>
          <Text style={{ color: XSEC.A.color, fontWeight: '700', fontFamily: MONO, fontSize: 10.5 }}>A {xCr(tA)}</Text>
          <Text style={{ color: XSEC.B.color, fontWeight: '700', fontFamily: MONO, fontSize: 10.5 }}>B {xCr(tB)}</Text>
        </View>
      </View>
      {rows.length === 0 ? <Text style={{ fontSize: 11.5, color: T.muted, textAlign: 'center', paddingVertical: 16 }}>No salary entries for this month yet.</Text> : null}
      {rows.map((r, i) => {
        const t = tot(r), isOpen = open === i, empty = t === 0;
        return (
          <View key={r.ymd || i} style={[card, { marginBottom: 8, borderColor: isOpen ? XC.sal + '66' : T.border }]}>
            <DayHead i={i} r={r} isOpen={isOpen} color={XC.sal} empty={empty} sub={empty ? 'Not entered' : xCr(t)} onPress={() => setOpen(isOpen ? -1 : i)} />
            {isOpen ? (
              <View style={{ paddingTop: 2, paddingHorizontal: 15, paddingBottom: 15 }}>
                {fld(r, 'A')}
                {fld(r, 'B')}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: T.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: T.muted }}>Day total</Text>
                  <Text style={{ fontFamily: MONO, fontSize: 15, fontWeight: '800', color: XC.sal }}>{xCr(t)}</Text>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** Maintenance / Other — saved to the ERP (Daily Section Expense). */
function DailyRWCModule({ title, note, color, rows, counts, setCell, addDay, close, status }) {
  const XSEC = makeXSEC(counts);
  const tA = rows.reduce((s, r) => s + (+r.A || 0), 0), tB = rows.reduce((s, r) => s + (+r.B || 0), 0), tC = rows.reduce((s, r) => s + (+r.common || 0), 0);
  const shA = counts.A / (counts.A + counts.B || 1), shB = counts.B / (counts.A + counts.B || 1);
  const aA = tA + shA * tC, aB = tB + shB * tC;
  const inp2 = { width: 72, paddingVertical: 6, paddingHorizontal: 6, fontSize: 11, fontFamily: MONO, textAlign: 'right', borderWidth: 1, borderColor: T.border, borderRadius: 6, backgroundColor: '#fff', color: T.ink };
  const cell = { paddingVertical: 7, paddingHorizontal: 6, fontSize: 10.5, textAlign: 'right', color: T.ink, fontWeight: '700' };
  const fld = (r, i, k) => (
    <View style={{ minWidth: 84, flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 6 }}>
      <TextInput value={r[k] === 0 ? '' : String(r[k])} onChangeText={(t) => setCell(i, k, t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" inputMode="numeric" placeholder="0" placeholderTextColor={T.muted} style={inp2} />
    </View>
  );
  return (
    <View style={{ paddingTop: 12, paddingHorizontal: 12, paddingBottom: 30 }}>
      <BackBtn onPress={close} />
      <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: 2, color: T.ink }}>{title}</Text>
      <Text style={{ fontSize: 11, color: T.muted, marginBottom: 10, lineHeight: 16 }}>
        {note} Enter per section, or under <Text style={{ fontWeight: '800' }}>Common</Text> for shared cost — common auto-splits by machine count, Section A {counts.A} : Section B {counts.B} ({(shA * 100).toFixed(1)} % : {(shB * 100).toFixed(1)} %).
      </Text>
      <SecCards XSEC={XSEC} mc="mc" />
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }} showsHorizontalScrollIndicator={false}>
        <View style={[card, { flex: 1, minWidth: 330 }]}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.sub }}>
            <Text style={[cell, { flex: 1, textAlign: 'left' }]}>Date</Text>
            <Text style={[cell, { minWidth: 84, color: XSEC.A.color }]}>Section A</Text>
            <Text style={[cell, { minWidth: 84, color: XSEC.B.color }]}>Section B</Text>
            <Text style={[cell, { minWidth: 84 }]}>Common</Text>
          </View>
          {rows.map((r, i) => (
            <View key={r.ymd || i} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.alt, paddingVertical: 3 }}>
              <View style={{ flex: 1, paddingLeft: 8 }}>
                <Text style={{ fontSize: 11, fontFamily: MONO, color: T.ink }}>{r.d}</Text>
                {status && status[r.ymd] ? <Text style={{ fontSize: 8.5, color: status[r.ymd] === 'error' ? T.red : T.muted }}>{status[r.ymd] === 'saving' ? 'saving…' : status[r.ymd] === 'error' ? 'not saved' : 'saved'}</Text> : null}
              </View>
              {fld(r, i, 'A')}
              {fld(r, i, 'B')}
              {fld(r, i, 'common')}
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.alt, paddingVertical: 9, borderTopWidth: 1.5, borderTopColor: T.border }}>
            <Text style={{ flex: 1, paddingLeft: 8, fontSize: 10, fontWeight: '800', color: T.ink }}>TOTAL</Text>
            {[tA, tB, tC].map((v, i) => <Text key={i} style={{ minWidth: 84, textAlign: 'right', paddingRight: 6, fontFamily: MONO, fontSize: 11, fontWeight: '800', color }}>{xCr(v)}</Text>)}
          </View>
        </View>
      </ScrollView>
      {addDay ? (
        <TouchableOpacity onPress={addDay} style={{ marginTop: 10, width: '100%', padding: 10, borderRadius: 9, borderWidth: 1.5, borderStyle: 'dashed', borderColor: T.border, alignItems: 'center' }}>
          <Text style={{ color: T.muted, fontSize: 12, fontWeight: '700' }}>+ Add a day</Text>
        </TouchableOpacity>
      ) : null}
      <View style={[card, { paddingVertical: 12, paddingHorizontal: 14, marginTop: 12 }]}>
        <Text style={{ fontSize: 9, color: T.muted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>After allocation · common by machine count (A {counts.A} : B {counts.B})</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 10.5, color: XSEC.A.color, fontWeight: '700' }}>Section A</Text>
            <Text style={{ fontFamily: MONO, fontSize: 15, fontWeight: '700', color }}>{xCr(aA)}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 10.5, color: XSEC.B.color, fontWeight: '700' }}>Section B</Text>
            <Text style={{ fontFamily: MONO, fontSize: 15, fontWeight: '700', color }}>{xCr(aB)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10.5, color: T.muted }}>Total</Text>
            <Text style={{ fontFamily: MONO, fontSize: 15, fontWeight: '700', color: T.ink }}>{xCr(tA + tB + tC)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
export default function ExpenseModule({ exp, months, setSetting, rwc, renderLegacy, onLegacyChange }) {
  const [view, setView] = useState('dash');
  const cur = useMemo(() => xCurrent(exp), [exp]);
  const allMonths = useMemo(() => months.map((x) => (x.key === exp.cur ? cur : x)), [months, cur, exp.cur]);
  const byKey = useMemo(() => Object.fromEntries(allMonths.map((x) => [x.key, x])), [allMonths]);
  const [sel, setSel] = useState(exp.cur);
  const [op, setOp] = useState({ util: false, sal: false, prodx: false, mtx: false, otx: false, final: true, rates: true });
  const [pst, setPst] = useState(null);
  const [trend, setTrend] = useState(null);
  const [draft, setDraft] = useState({});
  const chips = useRef(null);
  useEffect(() => { setDraft({}); }, [exp.cur]);
  const m = byKey[sel] || allMonths[allMonths.length - 1];
  const idx = allMonths.findIndex((x) => x.key === sel), prev = idx > 0 ? allMonths[idx - 1] : null;
  const isCur = sel === exp.cur;
  const XSEC = makeXSEC(m.counts || exp.counts);
  const utilPP = useMemo(() => xUtilMeters(m), [m]);
  const gh = useMemo(() => xGroupHeads(m), [m]);
  const utilDaily = useMemo(() => (isCur ? xUtilDaily(exp) : null), [exp, isCur]);
  const tog = (k) => { hbuzz(7); setOp((o) => ({ ...o, [k]: !o[k] })); };
  const ab = m.ab !== false;
  useEffect(() => { if (onLegacyChange) onLegacyChange(!ab); }, [ab]); // eslint-disable-line react-hooks/exhaustive-deps
  const dash = (v, f) => (v === null || v === undefined ? '—' : f(v));

  if (view === 'units') return <DailyUnitsModule exp={exp} close={() => setView('dash')} />;
  if (view === 'salary') return <DailySalaryModule exp={exp} close={() => setView('dash')} />;
  if (view === 'maint' || view === 'other') {
    const isM = view === 'maint';
    return (
      <DailyRWCModule
        title={isM ? 'Daily maintenance' : 'Daily other expenses'}
        note={isM ? 'Maintenance & repair spend per day (₹).' : 'Other direct / indirect expenses per day (₹).'}
        color={isM ? XC.fixed : XC.other}
        rows={isM ? exp.dailyMaint : exp.dailyOther}
        counts={exp.counts}
        status={rwc.status[isM ? 'maintenance' : 'other']}
        setCell={(i, k, v) => rwc.setCell(isM ? 'maintenance' : 'other', i, k, v)}
        addDay={rwc.canAdd(isM ? 'maintenance' : 'other') ? () => rwc.addDay(isM ? 'maintenance' : 'other') : null}
        close={() => { setView('dash'); rwc.done(); }}
      />
    );
  }

  const comp = [
    { k: 'Electricity', v: m.elecTotal, c: XC.elec }, { k: 'Salary', v: m.salT, c: XC.sal }, { k: 'Stores', v: m.storeT, c: XC.store },
    { k: 'Maintenance', v: m.maintT, c: XC.fixed }, { k: 'Other', v: m.otherT, c: XC.other },
  ].filter((x) => x.v > 0);
  const lbl = { fontSize: 8.5, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '800' };
  const Delta = ({ v }) => (v == null
    ? <Text style={{ fontSize: 10, color: '#9A9590' }}>—</Text>
    : <Text style={{ fontSize: 11, fontFamily: MONO, fontWeight: '700', color: v > 0 ? T.red : T.green }}>{v > 0 ? '▲' : '▼'} {Math.abs(v).toFixed(1)}%</Text>);
  const dlt = (c, p) => (p ? ((c - p) / p) * 100 : null);
  const inp2 = { width: 72, paddingVertical: 6, paddingHorizontal: 7, fontSize: 11.5, fontFamily: MONO, textAlign: 'right', borderWidth: 1, borderColor: T.border, borderRadius: 7, backgroundColor: '#fff', color: T.ink };
  const heading = (t, top = 4) => <Text style={{ fontSize: 11, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: top, marginHorizontal: 2, marginBottom: 8 }}>{t}</Text>;
  const rowsAB = (items, minW = 62, perPickFn) => items.map(([n, a, p, k], i) => (
    <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: T.alt }}>
      <Text style={{ flex: 1, fontSize: 11.5, fontWeight: i === 2 ? '700' : '400', color: T.ink }}>{n}</Text>
      <Text style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: i === 2 ? '700' : '500', color: T.ink }}>{dash(a, xCr)}</Text>
      <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: minW, textAlign: 'right' }}>{a === null || a === undefined ? '—' : `${xR3(perPickFn ? perPickFn(i) : p > 0 && k > 0 ? a / p / k : 0)}/pk`}</Text>
    </View>
  ));
  const inputRow = (icon, iconSize, color, title, sub, action, onPress) => (
    <Pressable onPress={() => { hbuzz(7); onPress(); }} style={[card, { paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Text style={{ color, fontSize: iconSize }}>{icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: T.ink }}>{title}</Text>
        <Text style={{ fontSize: 10.5, color: T.muted, fontFamily: MONO }}>{sub}</Text>
      </View>
      <Text style={{ fontSize: 12, color: T.copper, fontWeight: '700' }}>{action}</Text>
    </Pressable>
  );
  const setRow = (label, key, value, decimal, tag) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        {tag ? <XSecTag s={tag} /> : null}
        <Text style={{ fontSize: 11.5, color: T.ink, flexShrink: 1 }}>{label}</Text>
      </View>
      <TextInput
        value={String(Math.round((+value || 0) * 100) / 100)}
        editable={false}
        selectTextOnFocus={false}
        style={[inp2, { backgroundColor: T.sub, color: T.muted }]}
      />
    </View>
  );

  /* Section conversion rates */
  const rates = (() => {
    const live = isCur;
    const S = isCur ? xSectionMTD(exp) : xClosedRates(m);
    if (!S || !S.A || !S.B) return null;
    const pkA = m.picksA || S.A.picks || 0, pkB = m.picksB || S.B.picks || 0;
    const card4 = (k, sec, pk, col) => (
      <View key={k} style={[card, { paddingVertical: 11, paddingHorizontal: 13, borderTopWidth: 4, borderTopColor: col, flex: 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <XSecTag s={k} size={9.5} />
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: T.ink, flexShrink: 1 }}>{XSEC[k].short} · {XSEC[k].n} mc</Text>
        </View>
        <Text style={{ fontSize: 9.5, color: T.muted, marginBottom: 6, lineHeight: 12.8 }}>{XSEC[k].lbl.replace(/^[AB] — /, '')}</Text>
        {[['Weaving conversion', sec.conv, 'electricity + wages'], ['Overheads', sec.ovh, 'stores + maintenance + other'], ['Total', sec.conv + sec.ovh, 'per pick per metre']].map(([l, v, n], i) => (
          <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingVertical: 3, borderTopWidth: i === 2 ? 1 : 0, borderTopColor: T.border, gap: 6 }}>
            <Text style={{ fontSize: 10.5, fontWeight: i === 2 ? '800' : '600', color: T.ink, flexShrink: 1 }}>{l} <Text style={{ fontSize: 8.5, color: T.muted, fontWeight: '500' }}>· {n}</Text></Text>
            <Text style={{ fontFamily: MONO, fontSize: i === 2 ? 12.5 : 11.5, fontWeight: '800', color: i === 2 ? T.copper : T.ink }}>{xR4(v)}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 4, fontFamily: MONO }}>≈ {xR2((sec.conv + sec.ovh) * pk)}/m at {(+pk || 0).toFixed(1)} picks</Text>
      </View>
    );
    const upto = S.upto ? new Date(`${S.upto}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
    return (
      <XSection
        title="Section conversion rates · A / B"
        sub={live ? `live · month-to-date to ${upto} · ${S.A.days || 0} days` : 'closed month · full-month average'}
        icon="⛓" accent={T.nav} open={op.rates} onToggle={() => tog('rates')}
        right={<View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: (live ? T.amber : T.green) + '18' }}><Text style={{ fontSize: 9, fontWeight: '800', textTransform: 'uppercase', color: live ? T.amber : T.green }}>{live ? 'LIVE' : 'FROZEN'}</Text></View>}
      >
        <Text style={{ fontSize: 10.5, color: T.muted, lineHeight: 15.75, marginBottom: 10 }}>
          Read by every roll’s cost card: a roll checked this month carries the live month-to-date rate of its section — A (Waterjet + S. Rapier 230 cm) or B (Rapier 190 cm) — decided by the machine that wove it; a sale freezes it at that day’s rate; closing the month freezes every unsold roll at the full-month average. Wages are spread over working days and stores follow each day’s production, so early-month rates are not overstated.
        </Text>
        <Grid cols={2} gap={8}>{[card4('A', S.A, pkA, XSEC.A.color), card4('B', S.B, pkB, XSEC.B.color)]}</Grid>
      </XSection>
    );
  })();

  /* month chips (artifact) */
  const chipsEl = (
    <ScrollView ref={chips} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginBottom: 12, flexGrow: 0 }} onContentSizeChange={() => chips.current && chips.current.scrollToEnd && chips.current.scrollToEnd({ animated: false })}>
      {allMonths.map((x) => {
        const a = x.key === sel, c = x.key === exp.cur;
        return (
          <Pressable key={x.key} onPress={() => setSel(x.key)} style={{ flexShrink: 0, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 20, backgroundColor: a ? T.copper : T.surface, borderWidth: a ? 0 : 1, borderColor: T.border }}>
            <Text style={{ fontWeight: '700', fontSize: 11.5, color: a ? '#fff' : T.muted }}>{x.label}{c ? ' •' : ''}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  /* Months before 1 Oct 2026: the previous Rapier / Waterjet report, as it was */
  if (!ab && renderLegacy) {
    return (
      <View style={{ paddingTop: 12, paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 12 }}>{chipsEl}</View>
        <View style={{ paddingHorizontal: 12 }}>{renderLegacy(m.key)}</View>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: 12, paddingHorizontal: 12, paddingBottom: 28 }}>
      {chipsEl}
      {isCur ? (
        <View style={{ alignSelf: 'flex-start', backgroundColor: T.green + '15', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20, marginBottom: 10 }}>
          <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', color: T.green }}>● Ongoing month</Text>
        </View>
      ) : null}
      {!ab ? (
        <View style={{ backgroundColor: T.amber + '14', borderWidth: 1, borderColor: T.amber + '44', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10 }}>
          <Text style={{ fontSize: 9.5, color: T.amber, lineHeight: 13.8 }}>Before 1 Oct 2026 the ERP books this month as Rapier / Waterjet — Section A / B costs start from October, so they show “—” here. Totals, production and picks are the ERP figures.</Text>
        </View>
      ) : null}

      {/* A / B cards */}
      <Grid cols={2} gap={8} style={{ marginBottom: 12 }}>
        {['A', 'B'].map((k) => (
          <View key={k} style={[card, { paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 4, borderTopColor: XSEC[k].color, flex: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <XSecTag s={k} size={10} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: T.ink }}>{XSEC[k].short}</Text>
              <Text style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5, fontWeight: '800', color: XSEC[k].color }}>{XSEC[k].n} mc</Text>
            </View>
            <Text style={{ fontSize: 10, color: T.ink, fontWeight: '600', lineHeight: 14 }}>{XSEC[k].lbl.replace(/^[AB] — /, '')}</Text>
            <Text style={{ fontSize: 9.5, color: T.muted, marginTop: 2, lineHeight: 12.8 }}>{XSEC[k].groups}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: '800', color: T.ink }}>{xM(k === 'A' ? m.prodA : m.prodB)}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted }}>{dash(k === 'A' ? m.costA : m.costB, xCr)}</Text>
              <Text style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5, fontWeight: '800', color: XSEC[k].color }}>{m[k].totPick === null ? '—' : `${xR3(m[k].totPick)}/pk`}</Text>
            </View>
          </View>
        ))}
      </Grid>

      {/* KPIs */}
      <Grid cols={2} gap={8} style={{ marginBottom: 12 }}>
        <XKPI label="Total cost" value={xCr(m.coreTotal)} sub={`${m.label} · ${m.days} days`} accent={T.copper} />
        <XKPI label="Cost / pick" value={xR3(m.costPerPick)} sub="Section A + Section B" accent={T.copper} />
        <XKPI label="Avg picks" value={(+m.totalPicks || 0).toFixed(1)} sub="prod-weighted" accent={XC.sal} />
        <XKPI label="Production" value={xM(m.totalProd)} sub={`${xK0(m.prodPerMcDay)} m / mc·day`} accent={XC.store} />
        <XKPI label="Cost / mc·day" value={xCr(m.costPerMcDay)} sub={`${m.looms.total} looms`} accent={XC.fixed} />
        <XKPI label="Units" value={`${((+m.unitsTotal || 0) / 1e3).toFixed(0)}K kWh`} sub={`@ ${xR2(m.rate)}/unit`} accent={XC.other} />
      </Grid>

      {/* composition */}
      <View style={[card, { padding: 14, marginBottom: 12 }]}>
        <Text style={{ fontSize: 12, fontWeight: '800', marginBottom: 10, color: T.ink }}>Cost composition · {m.label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <XDonut seg={comp.map((c) => ({ v: c.v, color: c.c }))} center={{ top: xCr(m.coreTotal), bot: 'total' }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            {comp.map((c) => (
              <View key={c.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: c.c }} />
                <Text style={{ flex: 1, fontSize: 11.5, color: T.ink }}>{c.k}</Text>
                <Text style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: '700', color: T.ink }}>{xCr(c.v)}</Text>
                <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 38, textAlign: 'right' }}>{xPc((c.v / (m.coreTotal || 1)) * 100)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* inputs (always the ongoing month) */}
      {heading(`Inputs ${isCur ? '' : '· ongoing month'}`)}
      {inputRow('⚡', 17, XC.elec, 'Daily units consumed', `${exp.dailyUnits.length} days · ${xK0(cur.unitsTotal)} kWh`, 'View ›', () => setView('units'))}
      {inputRow('₹', 17, XC.sal, 'Daily salary expenses', `${exp.dailySalary.length} days · ${xCr(cur.salT)}`, 'View ›', () => setView('salary'))}
      {inputRow('▦', 16, XC.fixed, 'Daily maintenance', `${exp.dailyMaint.length} days · ${xCr(cur.maintT)}`, 'Edit ›', () => setView('maint'))}
      {inputRow('＋', 16, XC.other, 'Daily other expenses', `${exp.dailyOther.length} days · ${xCr(cur.otherT)}`, 'Edit ›', () => setView('other'))}

      {/* production */}
      <View style={[card, { paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5 }}>PRODUCTION · FROM PRODUCTION SYSTEM</Text>
          <View style={{ backgroundColor: T.green + '15', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 20 }}>
            <Text style={{ fontSize: 8.5, fontWeight: '800', color: T.green, letterSpacing: 0.4 }}>● AUTO</Text>
          </View>
        </View>
        {['A', 'B'].map((k) => (
          <View key={k} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: T.border }}>
              <XSecTag s={k} />
              <Text style={{ flex: 1, fontSize: 11.5, fontWeight: '800', color: T.ink }}>{XSEC[k].lbl}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: '800', minWidth: 60, textAlign: 'right', color: XSEC[k].color }}>{xM(m[k].prod)}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 46, textAlign: 'right' }}>{(+m[k].picks || 0).toFixed(0)} pk</Text>
            </View>
            {(m.groups || []).filter((g) => g.sec === k).map((g) => (
              <View key={g.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingLeft: 10, borderBottomWidth: 1, borderBottomColor: T.alt }}>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: T.ink }}>{g.lbl} <Text style={{ fontSize: 9.5, color: T.muted, fontWeight: '500' }}>· {g.rng} · {g.n} mc</Text></Text>
                <Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '700', minWidth: 60, textAlign: 'right', color: T.ink }}>{xM(g.prod)}</Text>
                <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 46, textAlign: 'right' }}>{(+g.picks || 0).toFixed(0)} pk</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 2 }}>
          <Text style={{ flex: 1, fontSize: 11.5, fontWeight: '800', color: T.ink }}>Total · {m.looms.total} machines</Text>
          <Text style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: '800', minWidth: 60, textAlign: 'right', color: T.ink }}>{xM(m.totalProd)}</Text>
          <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 46, textAlign: 'right' }}>{(+m.totalPicks || 0).toFixed(0)} pk</Text>
        </View>
        <Text style={{ fontSize: 10, color: T.muted, marginTop: 7, lineHeight: 14 }}>Metres & picks flow in from the production system by machine group and roll up to Section A / Section B — read-only here.</Text>
      </View>

      {/* month settings (always the ongoing month) */}
      <View style={[card, { paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 }]}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5, marginBottom: 9 }}>MONTH SETTINGS {isCur ? '' : '· (ongoing month)'}</Text>
        {setRow('Unit rate (₹/kWh)', 'rate', exp.rate, true)}
        {setRow('Working days', 'days', exp.days, false)}
        {setRow('Stores — Section A (₹/mo)', 'storeA', exp.stores.A, true, 'A')}
        {setRow('Stores — Section B (₹/mo)', 'storeB', exp.stores.B, true, 'B')}
      </View>

      {/* management summary */}
      {heading('Management summary')}
      <XSumCard title={XSEC.A.lbl} d={m.A} accent={XSEC.A.color} groups={gh && gh.bySec.A} onTrend={isCur ? () => setTrend({ kind: 'sec', k: 'A' }) : undefined} />
      <XSumCard title={XSEC.B.lbl} d={m.B} accent={XSEC.B.color} groups={gh && gh.bySec.B} onTrend={isCur ? () => setTrend({ kind: 'sec', k: 'B' }) : undefined} />
      <XSumCard title={`Total · A + B · ${m.looms.total} machines`} d={m.T} accent={T.nav} groups={gh && gh.bySec.T} onTrend={isCur ? () => setTrend({ kind: 'sec', k: 'T' }) : undefined} />
      {gh ? (
        <Text style={{ fontSize: 9.5, color: T.muted, lineHeight: 13.5, marginTop: -2, marginBottom: 10, marginHorizontal: 2 }}>
          Machine-group lines: Warping + Misc → Section A 1/3 (Waterjet 75 % · S. Rapier 230 cm 25 %) · Section B 2/3 (MW Rapier 55 % · Sudamo Rapier 45 %).
          Salary and Stores of each section are divided with the same 75/25 and 55/45. ₹/pick on each group’s own production and PPI.
        </Text>
      ) : null}
      {trend ? <XTrendSheet exp={exp} kind={trend.kind === 'util' ? 'util' : 'sec'} k={trend.k} onClose={() => setTrend(null)} /> : null}

      {/* expense breakdown */}
      {heading('Expense breakdown', 14)}
      <XSection title="Utilities / units consumed" sub={`${xK0(m.unitsTotal)} kWh @ ${xR2(m.rate)}`} icon="⚡" accent={XC.elec} open={op.util} onToggle={() => tog('util')}
        right={<Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '700', color: XC.elec, marginRight: 6 }}>{xCr(m.elecTotal)}</Text>}>
        <XUtilCost ub={utilPP} daily={utilDaily} m={m} counts={m.counts || exp.counts} onTrend={isCur ? (k) => setTrend({ kind: 'util', k }) : null} />
      </XSection>
      <XSection title="Salaries / wages" sub="Section A + Section B" icon="₹" accent={XC.sal} open={op.sal} onToggle={() => tog('sal')}
        right={<Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '700', color: XC.sal, marginRight: 6 }}>{xCr(m.salT)}</Text>}>
        {rowsAB([[XSEC.A.lbl, m.salary.A, m.prodA, m.picksA], [XSEC.B.lbl, m.salary.B, m.prodB, m.picksB], ['Total', m.salT, m.totalProd, m.totalPicks]])}
      </XSection>
      <XSection title="Production-linked expenses" sub="Stores & spares" icon="◧" accent={XC.store} open={op.prodx} onToggle={() => tog('prodx')}
        right={<Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '700', color: XC.store, marginRight: 6 }}>{xCr(m.storeT)}</Text>}>
        {rowsAB([[XSEC.A.lbl, m.stores.A, m.prodA, m.picksA], [XSEC.B.lbl, m.stores.B, m.prodB, m.picksB], ['Total', m.storeT, m.totalProd, m.totalPicks]], 50,
          (i) => (i === 0 ? m.A.store.perPick : i === 1 ? m.B.store.perPick : m.T.store.perPick))}
      </XSection>
      <XSection title="Maintenance" sub={`Section A · Section B · common (by machine count ${m.looms.A} : ${m.looms.B})`} icon="▦" accent={XC.fixed} open={op.mtx} onToggle={() => tog('mtx')}
        right={<Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '700', color: XC.fixed, marginRight: 6 }}>{xCr(m.maintT)}</Text>}>
        {rowsAB([[XSEC.A.lbl, m.maint.A, m.prodA, m.picksA], [XSEC.B.lbl, m.maint.B, m.prodB, m.picksB], ['Total', m.maintT, m.totalProd, m.totalPicks]])}
        <Text style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>Common maintenance auto-splits by machine count — Section A {m.looms.A} : Section B {m.looms.B}. Enter day-wise via the input module above.</Text>
      </XSection>
      <XSection title="Other expenses" sub="Direct / indirect" icon="＋" accent={XC.other} open={op.otx} onToggle={() => tog('otx')}
        right={<Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '700', color: XC.other, marginRight: 6 }}>{xCr(m.otherT)}</Text>}>
        {rowsAB([[XSEC.A.lbl, m.other.A, m.prodA, m.picksA], [XSEC.B.lbl, m.other.B, m.prodB, m.picksB], ['Total', m.otherT, m.totalProd, m.totalPicks]])}
        <Text style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>Common items auto-split by machine count — Section A {m.looms.A} : Section B {m.looms.B}. Enter day-wise via the input module above.</Text>
      </XSection>
      <XSection title="Final derived costing" sub={`${xR3(m.costPerPick)}/pick · ${(+m.totalPicks || 0).toFixed(1)} picks`} icon="∑" accent={T.copper} open={op.final} onToggle={() => tog('final')}
        right={<Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '700', color: T.copper, marginRight: 6 }}>{xR3(m.costPerPick)}/pk</Text>}>
        {comp.map((c) => (
          <View key={c.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c.c }} />
            <Text style={{ flex: 1, fontSize: 11.5, color: T.ink }}>{c.k}</Text>
            <Text style={{ fontFamily: MONO, fontSize: 11.5, color: T.ink }}>{xCr(c.v)}</Text>
            <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted, minWidth: 56, textAlign: 'right' }}>{xR3(m.totalProd > 0 && m.totalPicks > 0 ? c.v / m.totalProd / m.totalPicks : 0)}/pk</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 4, borderTopWidth: 1, borderTopColor: T.border, marginTop: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: T.ink }}>Total cost</Text>
          <Text style={{ fontFamily: MONO, fontSize: 13, fontWeight: '800', color: T.copper }}>{xCr(m.coreTotal)}</Text>
        </View>
        <Grid cols={3} gap={8} style={{ marginTop: 8 }}>
          <XStat label="Cost / pick" value={xR3(m.costPerPick)} />
          <XStat label="Avg picks" value={(+m.totalPicks || 0).toFixed(1)} />
          <XStat label="Cost / mc·day" value={xCr(m.costPerMcDay)} />
        </Grid>
        <Text style={{ fontSize: 10, color: T.muted, marginTop: 8 }}>Cost / pick = total cost ÷ production metres ÷ avg picks ({(+m.totalPicks || 0).toFixed(1)}).</Text>
      </XSection>
      {rates}

      {/* comparative analytics */}
      {heading('Comparative analytics · 6 months', 14)}
      <View style={[card, { padding: 14, paddingTop: 6, marginBottom: 12, overflow: 'visible' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, marginTop: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: T.ink }}>Production vs cost / pick</Text>
          <Text style={{ fontSize: 9.5, color: T.muted }}>last 6 months</Text>
        </View>
        <XProdExpChart months={allMonths} />
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 9, height: 9, backgroundColor: T.copper, borderRadius: 2, marginRight: 4 }} /><Text style={{ fontSize: 10, color: T.muted }}>Production (L m)</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 9, height: 9, backgroundColor: T.nav, borderRadius: 2, marginRight: 4 }} /><Text style={{ fontSize: 10, color: T.muted }}>Cost / pick (₹)</Text></View>
        </View>
      </View>
      <View style={[card, { padding: 14, marginBottom: 12 }]}>
        <Text style={{ fontSize: 12, fontWeight: '800', marginBottom: 10, color: T.ink }}>Efficiency indicators · {m.label}</Text>
        <Grid cols={3} gap={8}>
          <XStat label="Units / metre" value={`${(+m.unitsPerM || 0).toFixed(2)} kWh`} />
          <XStat label="Salary / metre" value={xR2(m.salPerM)} />
          <XStat label="Stores / metre" value={xR2(m.storePerM)} />
          <XStat label="Avg picks" value={(+m.totalPicks || 0).toFixed(1)} />
          <XStat label="Prod / mc·day" value={`${xK0(m.prodPerMcDay)} m`} />
          <XStat label="Cost / mc·day" value={xCr(m.costPerMcDay)} />
        </Grid>
      </View>
      <Grid cols={2} gap={10} style={{ marginBottom: 12 }}>
        {[
          ['Production split · A / B', [{ v: m.prodA, color: XSEC.A.color }, { v: m.prodB, color: XSEC.B.color }], m.prodShareA, m.prodShareB],
          ['Cost split · A / B', ab ? [{ v: m.costA, color: XSEC.A.color }, { v: m.costB, color: XSEC.B.color }] : [], m.shareA, m.shareB],
        ].map(([t, seg, a, b]) => (
          <View key={t} style={[card, { padding: 12, alignItems: 'center', flex: 1 }]}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', marginBottom: 8, color: T.ink, textAlign: 'center' }}>{t}</Text>
            <XDonut size={92} thick={13} seg={seg} center={{ top: a === null ? '—' : xPc(a), bot: 'Section A' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 }}>
              <Text style={{ fontSize: 10, color: XSEC.A.color }}>● A {a === null ? '—' : xPc(a)}</Text>
              <Text style={{ fontSize: 10, color: XSEC.B.color }}>● B {b === null ? '—' : xPc(b)}</Text>
            </View>
          </View>
        ))}
      </Grid>
      <View style={[card, { padding: 14, marginBottom: 12 }]}>
        <Text style={{ fontSize: 12, fontWeight: '800', marginBottom: 2, color: T.ink }}>Month-on-month</Text>
        <Text style={{ fontSize: 10, color: T.muted, marginBottom: 10 }}>{prev ? `${m.label} vs ${prev.label}` : 'no prior month'}</Text>
        <Grid cols={3} gap={8}>
          {[['Total cost', m.coreTotal, prev && prev.coreTotal, xCr], ['Cost / pick', m.costPerPick, prev && prev.costPerPick, xR3], ['Production', m.totalProd, prev && prev.totalProd, xM]].map(([n, c, p, f]) => (
            <View key={n} style={{ backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 10, flex: 1 }}>
              <Text style={lbl}>{n}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 13, fontWeight: '700', marginVertical: 3, color: T.ink }}>{f(c)}</Text>
              <Delta v={dlt(c, p)} />
            </View>
          ))}
        </Grid>
      </View>

      {/* past performance */}
      {heading('Past performance', 14)}
      {[...allMonths].filter((x) => x.key !== exp.cur).reverse().map((x) => {
        const o = pst === x.key;
        return (
          <View key={x.key} style={[card, { marginBottom: 8 }]}>
            <Pressable onPress={() => setPst(o ? null : x.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: T.ink }}>{x.label}</Text>
                <Text style={{ fontSize: 10, color: T.muted, fontFamily: MONO, marginTop: 1 }}>{xM(x.totalProd)} · {x.days} days</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: MONO, fontSize: 13, fontWeight: '700', color: T.copper }}>{xCr(x.coreTotal)}</Text>
                <Text style={{ fontFamily: MONO, fontSize: 10, color: T.muted }}>{xR3(x.costPerPick)}/pk</Text>
              </View>
              <Text style={{ color: '#9A9590', fontSize: 12, transform: [{ rotate: o ? '180deg' : '0deg' }] }}>▾</Text>
            </Pressable>
            {o ? (
              <View style={{ borderTopWidth: 1, borderTopColor: T.border, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: T.sub }}>
                {[{ k: 'Electricity', v: x.elecTotal, c: XC.elec }, { k: 'Salary', v: x.salT, c: XC.sal }, { k: 'Stores', v: x.storeT, c: XC.store }].map((c) => (
                  <View key={c.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c.c }} />
                    <Text style={{ flex: 1, fontSize: 11, color: T.ink }}>{c.k}</Text>
                    <Text style={{ fontFamily: MONO, fontSize: 11, color: T.ink }}>{xCr(c.v)}</Text>
                    <Text style={{ fontFamily: MONO, fontSize: 9.5, color: T.muted, minWidth: 38, textAlign: 'right' }}>{xPc((c.v / (x.coreTotal || 1)) * 100)}</Text>
                  </View>
                ))}
                <Grid cols={2} gap={8} style={{ marginTop: 8 }}>
                  <XStat label="Cost / pick" value={xR3(x.costPerPick)} />
                  <XStat label="Cost / mc·day" value={xCr(x.costPerMcDay)} />
                  {x.ab === false ? [
                    <XStat key="r" label="Rapier" value={`${xCr(x.rapierCost)} · ${xPc(x.rapierPct)}`} />,
                    <XStat key="w" label="W-jet" value={`${xCr(x.wjetCost)} · ${xPc(x.wjetPct)}`} />,
                  ] : [
                    <XStat key="a" label="Section A · Waterjet + S. Rapier 230" value={`${xCr(x.costA)} · ${xPc(x.shareA)}`} />,
                    <XStat key="b" label="Section B · Rapier 190" value={`${xCr(x.costB)} · ${xPc(x.shareB)}`} />,
                  ]}
                </Grid>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
