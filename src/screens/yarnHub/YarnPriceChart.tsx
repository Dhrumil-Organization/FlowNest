// FILE: src/screens/yarnHub/YarnPriceChart.tsx
// Yarn Hub → yarn detail → "Price trend" — the artifact's YarnPriceChart:
// one line per party (purchase rate ₹/kg over time, gaps joined), each party a fixed colour,
// touch / drag (or hover on web) shows the exact entries of that date, legend with each party's latest rate.
// Points come from the purchase entries (FAMPur / FAMPurD1, POST /yarn_hub/item -> prices).
// Long histories: every entry keeps a fixed width and the plot scrolls sideways (opens at the latest date),
// the ₹ axis stays fixed on the left, a year marker shows where each year starts, "Fit" squeezes everything
// into the card, and tapping a party in the legend shows only that party's line.

import { T } from '@/src/theme';
import React, { useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { chartRows, PricePoint, ymsDateLbl, ymsSuppliers } from './yarnHubModel';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" }) as string;
const PAD = { top: 18, right: 16, bottom: 20, left: 14 };
const AXIS_W = 46; // fixed ₹ axis
const STEP = 34; // px per entry when scrolling

/** monotone cubic through the points (same shape as recharts type="monotone") */
function monotonePath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  if (n === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    m.push(dx[i] === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

const niceTicks = (lo: number, hi: number, count = 4) => {
  const span = hi - lo || Math.abs(hi) || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) || raw;
  const a = Math.floor(lo / step) * step;
  const b = Math.ceil(hi / step) * step;
  const out: number[] = [];
  for (let v = a; v <= b + step / 2; v += step) out.push(Math.round(v * 100) / 100);
  return out;
};

type Geo = {
  ticks: number[]; lo: number; hi: number; ih: number; viewW: number; scrolls: boolean; cw: number; iw: number;
  gap: number; lastI: number; xLabels: Set<number>; yearStarts: number[];
  xOf: (i: number) => number; yOf: (v: number) => number;
};

/**
 * Price trend. `title` + `onClose` turn it into the full-screen view (opened from the ⤢ button of the card chart).
 * The heavy part (grid, lines, every point) is drawn once per data / size / party filter; moving over the chart
 * only redraws the thin marker layer on top, so long histories stay smooth.
 */
export function YarnPriceChart({
  points, height = 220, showLegend = true, title, onClose,
}: { points: PricePoint[]; height?: number; showLegend?: boolean; title?: string; onClose?: () => void }) {
  const [w, setW] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [fit, setFit] = useState(false);
  const [full, setFull] = useState(false);
  const scrollRef = useRef<any>(null);
  const win = useWindowDimensions();
  const sups = useMemo(() => ymsSuppliers(points), [points]);
  const data = useMemo(() => chartRows(points, sups), [points, sups]);
  const shownSups = useMemo(() => (focus ? sups.filter((s) => s.key === focus) : sups), [sups, focus]);
  const isFull = !!onClose;
  const step = isFull ? STEP + 10 : STEP;

  const geo = useMemo<Geo | null>(() => {
    if (data.length < 2 || !w) return null;
    const vals = data.flatMap((r) => shownSups.map((s) => r.vals[s.key]).filter((v) => v != null)) as number[];
    const lo0 = Math.min(...vals);
    const hi0 = Math.max(...vals);
    const padV = (hi0 - lo0) * 0.12 || Math.max(1, hi0 * 0.05);
    const ticks = niceTicks(lo0 - padV, hi0 + padV, isFull ? 6 : 4);
    const lo = ticks[0];
    const hi = ticks[ticks.length - 1];
    const ih = height - PAD.top - PAD.bottom;
    const viewW = Math.max(1, w - AXIS_W);
    const scrolls = !fit && (data.length - 1) * step + PAD.left + PAD.right > viewW;
    const cw = scrolls ? (data.length - 1) * step + PAD.left + PAD.right : viewW;
    const iw = Math.max(1, cw - PAD.left - PAD.right);
    const xOf = (i: number) => PAD.left + (i * iw) / (data.length - 1);
    const yOf = (v: number) => PAD.top + ih - ((v - lo) / (hi - lo || 1)) * ih;
    const gap = iw / (data.length - 1);
    const every = Math.max(1, Math.ceil(52 / Math.max(gap, 1)));
    const lastI = data.length - 1;
    const xLabels = new Set<number>();
    data.forEach((_, i) => { if (i % every === 0) xLabels.add(i); });
    xLabels.forEach((i) => { if (i !== lastI && xOf(lastI) - xOf(i) < 56) xLabels.delete(i); });
    xLabels.add(lastI);
    const yearStarts = data.map((r, i) => (i === 0 || r.date.slice(0, 4) !== data[i - 1].date.slice(0, 4) ? i : -1)).filter((i) => i >= 0);
    return { ticks, lo, hi, ih, viewW, scrolls, cw, iw, gap, lastI, xLabels, yearStarts, xOf, yOf };
  }, [data, shownSups, w, fit, height, step, isFull]);

  // static layer — grid, year markers, dates, every party line and point
  const plot = useMemo(() => {
    if (!geo) return null;
    const { ticks, cw, ih, gap, xLabels, yearStarts, lastI, xOf, yOf } = geo;
    return (
      <Svg width={cw} height={height} pointerEvents="none">
        {ticks.map((v) => (
          <Line key={'t' + v} x1={0} x2={cw} y1={yOf(v)} y2={yOf(v)} stroke={T.hair} strokeWidth={1} />
        ))}
        {yearStarts.map((i) => (
          <G key={'y' + i}>
            {i > 0 && <Line x1={xOf(i) - gap / 2} x2={xOf(i) - gap / 2} y1={4} y2={PAD.top + ih} stroke={T.border} strokeWidth={1} strokeDasharray="2 3" />}
            <SvgText x={(i > 0 ? xOf(i) - gap / 2 : 0) + 4} y={11} fontSize={9} fontFamily={MONO} fill={T.muted} fontWeight="700">
              {data[i].date.slice(0, 4)}
            </SvgText>
          </G>
        ))}
        {data.map((r, i) =>
          xLabels.has(i) ? (
            <SvgText key={'x' + i} x={xOf(i)} y={height - 5} fontSize={9} fontFamily={MONO} fill={T.muted} textAnchor={i === 0 ? 'start' : i === lastI ? 'end' : 'middle'}>
              {r.d}
            </SvgText>
          ) : null,
        )}
        {shownSups.map((s) => {
          const pts = data.map((r, i) => (r.vals[s.key] != null ? { x: xOf(i), y: yOf(r.vals[s.key]), i } : null)).filter(Boolean) as { x: number; y: number; i: number }[];
          return (
            <G key={s.key}>
              {pts.length > 1 && <Path d={monotonePath(pts)} stroke={s.color} strokeWidth={2.2} fill="none" />}
              {pts.map((p) => <Circle key={p.i} cx={p.x} cy={p.y} r={3.5} fill={s.color} />)}
            </G>
          );
        })}
      </Svg>
    );
  }, [geo, data, shownSups, height]);

  const axis = useMemo(() => {
    if (!geo) return null;
    return (
      <Svg width={AXIS_W} height={height}>
        {geo.ticks.map((v) => (
          <SvgText key={'a' + v} x={AXIS_W - 6} y={geo.yOf(v) + 3} fontSize={9} fontFamily={MONO} fill={T.muted} textAnchor="end">
            {'₹' + v}
          </SvgText>
        ))}
      </Svg>
    );
  }, [geo, height]);

  if (data.length < 2) {
    return (
      <Text style={st.empty}>
        {data.length ? 'One entry so far — the trend appears from the second entry.' : 'No purchase rates entered yet.'}
      </Text>
    );
  }

  const lastI = data.length - 1;
  const pick = (x: number) => {
    if (!geo) return;
    const i = Math.round(((x - PAD.left) / geo.iw) * (data.length - 1));
    const next = Math.max(0, Math.min(data.length - 1, i));
    if (next !== active) setActive(next);
  };
  const domX = (e: any) => {
    const ne = e?.nativeEvent || {};
    const rect = e?.currentTarget?.getBoundingClientRect?.();
    if (rect && typeof ne.clientX === 'number') return ne.clientX - rect.left;
    return ne.locationX ?? 0;
  };
  // web: hover / click (x against the scrolled content box); phone: tap a point (the drag scrolls the chart)
  const webTouch: any = Platform.OS === 'web'
    ? { onPointerMove: (e: any) => pick(domX(e)), onPointerDown: (e: any) => pick(domX(e)), onPointerLeave: () => setActive(null) }
    : {};

  const row = active !== null ? data[active] : null;
  const tipItems = row ? shownSups.filter((s) => row.meta[s.key]) : [];
  const latestOf = (mill: string) => points.filter((p) => p.party === mill).slice(-1)[0] || null;

  let content: React.ReactNode = null;
  if (geo) {
    const { cw, viewW, ih, xOf, yOf } = geo;
    const tipW = Math.max(170, Math.min(viewW - 8, 270));
    const ax = active !== null ? xOf(active) : 0;
    const tipX = Math.max(0, Math.min(cw - tipW, ax > cw / 2 ? ax - 12 - tipW : ax + 12));
    content = (
      <View style={{ width: cw, height, position: 'relative' }} {...webTouch}>
        {Platform.OS === 'web' ? plot : (
          <Pressable onPress={(e: any) => pick(e.nativeEvent.locationX)} style={{ width: cw, height }}>{plot}</Pressable>
        )}
        {active !== null && (
          // marker layer: only this redraws while moving over the chart
          <Svg width={cw} height={height} pointerEvents="none" style={StyleSheet.absoluteFill as any}>
            <Line x1={xOf(active)} x2={xOf(active)} y1={PAD.top} y2={PAD.top + ih} stroke={T.muted} strokeWidth={1} strokeDasharray="3 3" />
            {tipItems.map((s) => (
              <Circle key={s.key} cx={xOf(active)} cy={yOf(row!.vals[s.key])} r={5.5} fill={s.color} stroke="#fff" strokeWidth={2} />
            ))}
          </Svg>
        )}
        {row && tipItems.length > 0 && (
          <View pointerEvents="none" style={[st.tip, { left: tipX, width: tipW }]}>
            <Text style={st.tipDate}>{row.full}</Text>
            {tipItems.map((s) => {
              const m = row.meta[s.key];
              return (
                <View key={s.key} style={{ paddingVertical: 2 }}>
                  <View style={st.tipRow}>
                    <View style={[st.tipDot, { borderColor: s.color, backgroundColor: s.color }]} />
                    <Text style={st.tipMill} numberOfLines={1}>{m.party}</Text>
                    <Text style={[st.tipVal, { color: s.color }]}>{'₹' + m.rate.toLocaleString('en-IN') + '/kg'}</Text>
                  </View>
                  <Text style={st.tipSub} numberOfLines={1}>
                    {'purchase' + (m.qty ? ' · ' + m.qty.toLocaleString('en-IN') + ' kg' : '') + (m.inwno ? ' · ' + m.inwno : '') + (m.itmcode ? ' · item ' + m.itmcode : '')}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  const chart = (
    <View>
      <View style={st.bar}>
        {isFull && <Text style={st.fullTitle} numberOfLines={1}>{title}</Text>}
        <Text style={st.barTxt} numberOfLines={2}>
          {data.length + ' dates · ' + ymsDateLbl(data[0].date) + ' ' + data[0].date.slice(0, 4) + ' → ' + ymsDateLbl(data[lastI].date) + ' ' + data[lastI].date.slice(0, 4)}
          {focus ? ' · ' + (sups.find((s) => s.key === focus)?.mill || '') : ''}
        </Text>
        {focus && <Text onPress={() => { setFocus(null); setActive(null); }} style={st.barBtn}>All parties</Text>}
        <TouchableOpacity onPress={() => { setFit((f) => !f); setActive(null); }} style={[st.chip, fit && st.chipOn]}>
          <Text style={[st.chipTxt, fit && { color: '#fff' }]}>{fit ? 'Scroll' : 'Fit'}</Text>
        </TouchableOpacity>
        {isFull ? (
          <TouchableOpacity onPress={onClose} style={[st.chip, st.chipOn]}>
            <Text style={[st.chipTxt, { color: '#fff' }]}>✕ Close</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setFull(true)} style={st.chip}>
            <Text style={st.chipTxt}>⤢ Full screen</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={{ flexDirection: 'row', height }} onLayout={(e: any) => setW(e.nativeEvent.layout.width)}>
        {axis}
        {geo && (
          geo.scrolls ? (
            <ScrollView
              ref={scrollRef}
              horizontal
              style={{ width: geo.viewW }}
              showsHorizontalScrollIndicator
              onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: false })}
            >
              {content}
            </ScrollView>
          ) : content
        )}
      </View>
      {showLegend && (
        <View style={st.legend}>
          {sups.map((s) => {
            const lf = latestOf(s.mill);
            const off = !!focus && focus !== s.key;
            return (
              <TouchableOpacity key={s.key} onPress={() => { setFocus(focus === s.key ? null : s.key); setActive(null); }} style={[st.legItem, off && { opacity: 0.35 }]}>
                <View style={[st.legDash, { backgroundColor: s.color }]} />
                <Text style={st.legName}>{s.mill}</Text>
                {lf && <Text style={st.legRate}>{'₹' + lf.rate.toLocaleString('en-IN') + ' · ' + ymsDateLbl(lf.date)}</Text>}
              </TouchableOpacity>
            );
          })}
          <Text style={st.legNote}>
            {points.length + ' rate' + (points.length !== 1 ? 's' : '') + (geo?.scrolls ? ' · scroll sideways for older dates' : '') + ' · tap a point for the exact entry · tap a party to show only its line'}
          </Text>
        </View>
      )}
    </View>
  );

  if (isFull) return chart;

  return (
    <>
      {chart}
      {full && (
        <Modal visible transparent={false} animationType="fade" onRequestClose={() => setFull(false)} supportedOrientations={['portrait', 'landscape']}>
          <View style={st.fullPage}>
            <ScrollView contentContainerStyle={st.fullBody}>
              <YarnPriceChart
                points={points}
                title={title || 'Price trend'}
                height={Math.max(260, Math.min(win.height - 230, 640))}
                onClose={() => setFull(false)}
              />
            </ScrollView>
          </View>
        </Modal>
      )}
    </>
  );
}

const st = StyleSheet.create({
  empty: { fontSize: 10.5, color: T.muted, paddingVertical: 10 },
  tip: {
    position: 'absolute',
    top: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: '#0D1B2A',
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 80,
  },
  tipDate: { fontSize: 10, color: T.muted, marginBottom: 4, fontFamily: MONO },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  tipDot: { width: 9, height: 9, borderRadius: 2, borderWidth: 2 },
  tipMill: { color: T.ink, fontWeight: '700', fontSize: 11, flex: 1, minWidth: 0 },
  tipSub: { color: T.muted, fontSize: 9.5, fontFamily: MONO, paddingLeft: 15 },
  tipVal: { fontWeight: '800', fontSize: 11, fontFamily: MONO, paddingLeft: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4, paddingTop: 4, paddingBottom: 2 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legDash: { width: 12, height: 3, borderRadius: 2 },
  legName: { fontSize: 9.5, fontWeight: '800', color: T.ink },
  legRate: { fontSize: 9.5, color: T.muted, fontFamily: MONO },
  legNote: { fontSize: 9.5, color: T.muted, marginLeft: 'auto' },
  bar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 4, paddingBottom: 4 },
  barTxt: { flex: 1, minWidth: 150, fontSize: 9.5, color: T.muted, fontFamily: MONO },
  barBtn: { fontSize: 10, fontWeight: '800', color: T.copper },
  chip: { borderWidth: 1, borderColor: `${T.copper}55`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  chipOn: { backgroundColor: T.copper, borderColor: T.copper },
  chipTxt: { fontSize: 9.5, fontWeight: '800', color: T.copper },
  fullPage: { flex: 1, backgroundColor: T.bg },
  fullBody: { padding: 16, paddingTop: 20, maxWidth: 1600, width: '100%', alignSelf: 'center' },
  fullTitle: { fontSize: 13, fontWeight: '800', color: T.ink, marginRight: 6, flexShrink: 1 },
});
