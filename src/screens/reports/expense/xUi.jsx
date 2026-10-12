/**
 * Expense report — UI primitives ported from the ERP Designing artifact
 * (card, XSecTag, XKPI, XStat, XSection, XDonut, Sheet) and a small SVG
 * ComposedChart that reproduces the artifact's Recharts charts
 * (category bands, nice ticks, monotone lines, rounded bars, dashed
 * reference line, tap / hover tooltip).
 */
import React, { useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, Line as SvgLine, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { T } from './xCalc';

export const MONO = 'DMMono';
/* SVG text is not touched by the app's Inter font patch — use the loaded Inter faces directly. */
const SVG_FONT = 'Inter-Regular', SVG_FONT_BOLD = 'Inter-Bold';
export const card = { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden' };
export const mono = (o) => ({ fontFamily: MONO, ...(o || {}) });

/** web/haptic-free stand-in for the artifact's hbuzz() */
export const hbuzz = () => {};

export function XSecTag({ s, size }) {
  const c = s === 'A' ? '#3A568A' : s === 'B' ? '#652880' : '#8A8580';
  return (
    <View style={{ backgroundColor: c + '18', borderWidth: 1, borderColor: c + '44', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, flexShrink: 0, alignSelf: 'center' }}>
      <Text style={{ fontSize: size || 8.5, fontWeight: '800', color: c, fontFamily: MONO }}>{s}</Text>
    </View>
  );
}

/** CSS grid "1fr 1fr" / "1fr 1fr 1fr" with a gap */
export function Grid({ cols = 2, gap = 8, style, children }) {
  const items = React.Children.toArray(children).filter(Boolean);
  const rows = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return (
    <View style={[{ gap }, style]}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap, alignItems: 'stretch' }}>
          {r.map((c, j) => <View key={j} style={{ flex: 1, minWidth: 0 }}>{c}</View>)}
          {r.length < cols ? Array.from({ length: cols - r.length }).map((_, j) => <View key={`f${j}`} style={{ flex: 1 }} />) : null}
        </View>
      ))}
    </View>
  );
}

export function XKPI({ label, value, sub, accent }) {
  return (
    <View style={[card, { paddingVertical: 15, paddingHorizontal: 15, borderTopWidth: 4, borderTopColor: accent || T.copper, flex: 1 }]}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ fontSize: 21, fontFamily: MONO, fontWeight: '800', color: T.ink, marginTop: 5 }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 11, color: '#9A9590', marginTop: 3 }}>{sub}</Text> : null}
    </View>
  );
}

export function XStat({ label, value }) {
  return (
    <View style={{ backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 13, flex: 1 }}>
      <Text style={{ fontSize: 9.5, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '800' }}>{label}</Text>
      <Text style={{ fontSize: 16.5, fontFamily: MONO, fontWeight: '800', color: T.ink, marginTop: 3 }}>{value}</Text>
    </View>
  );
}

export function XSection({ title, sub, icon, accent, open, onToggle, children, right }) {
  const a = accent || T.copper;
  return (
    <View style={[card, { marginBottom: 10 }]}>
      <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 }}>
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: a + '18', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Text style={{ color: a, fontSize: 15 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: T.ink }}>{title}</Text>
          {sub ? <Text style={{ fontSize: 10.5, color: T.muted, marginTop: 1 }}>{sub}</Text> : null}
        </View>
        {right}
        <Text style={{ color: '#9A9590', fontSize: 12, transform: [{ rotate: open ? '180deg' : '0deg' }] }}>▾</Text>
      </Pressable>
      {open ? <View style={{ borderTopWidth: 1, borderTopColor: T.border, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: T.sub }}>{children}</View> : null}
    </View>
  );
}

export function XDonut({ seg, size = 120, thick = 17, center }) {
  const tot = seg.reduce((s, x) => s + (Number(x.v) || 0), 0) || 1;
  const r = (size - thick) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={T.alt} strokeWidth={thick} />
      {seg.map((s, i) => {
        const len = ((Number(s.v) || 0) / tot) * circ;
        const el = (
          <Circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thick}
            strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-off} rotation={-90} origin={`${cx}, ${cy}`} />
        );
        off += len;
        return el;
      })}
      {center ? <SvgText x={cx} y={cy - 1} textAnchor="middle" fontFamily={SVG_FONT_BOLD} fontSize={15} fill={T.ink}>{center.top}</SvgText> : null}
      {center ? <SvgText x={cx} y={cy + 13} textAnchor="middle" fontFamily={SVG_FONT} fontSize={9} fill={T.muted}>{center.bot}</SvgText> : null}
    </Svg>
  );
}

/** Artifact <Sheet>: bottom sheet on phones, centred dialog from 768 px. */
export function Sheet({ open, onClose, title, children }) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 768;
  if (!open) return null;
  const panel = wide
    ? { width: Math.min(540, width * 0.92), maxHeight: height * 0.82, borderRadius: 16, alignSelf: 'center' }
    : { width: '100%', maxWidth: 480, maxHeight: height * 0.86, borderTopLeftRadius: 16, borderTopRightRadius: 16, alignSelf: 'center' };
  return (
    <Modal transparent visible animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: wide ? 'center' : 'flex-end' }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,27,42,0.45)' }} />
        <View style={[{ backgroundColor: T.surface, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: -8 }, elevation: 16 }, panel]}>
          {!wide ? (
            <View style={{ paddingTop: 10, paddingBottom: 4, alignItems: 'center' }}>
              <View style={{ width: 36, height: 4, backgroundColor: T.border, borderRadius: 4 }} />
            </View>
          ) : null}
          {title ? (
            <View style={{ paddingTop: 6, paddingHorizontal: 18, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.border, gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: T.nav, letterSpacing: 0.3, flex: 1 }}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}><Text style={{ fontSize: 22, color: T.muted, lineHeight: 24 }}>×</Text></TouchableOpacity>
            </View>
          ) : null}
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ================================================================== */
/*  ComposedChart (SVG)                                                */
/* ================================================================== */

/* Recharts' nice-tick algorithm (getNiceTickValues, tickCount 5). */
const dec = (x) => +(+x).toFixed(10);
function formatStep(rough, corr) {
  if (!(rough > 0)) return 1;
  const digit = Math.floor(Math.log10(Math.abs(rough))) + 1;
  const pow = Math.pow(10, digit);
  const ratio = rough / pow;
  const scale = digit !== 1 ? 0.05 : 0.1;
  const amend = (Math.ceil(dec(ratio / scale)) + corr) * scale;
  return dec(amend * pow);
}
function calcStep(min, max, count, corr = 0) {
  if (!Number.isFinite((max - min) / (count - 1))) return { step: 0, tickMin: 0, tickMax: 0 };
  const step = formatStep((max - min) / (count - 1), corr);
  let middle;
  if (min <= 0 && max >= 0) middle = 0;
  else {
    middle = (min + max) / 2;
    middle = dec(middle - (middle % step));
  }
  let below = Math.ceil(dec((middle - min) / step));
  let up = Math.ceil(dec((max - middle) / step));
  const sc = below + up + 1;
  if (sc > count) return calcStep(min, max, count, corr + 1);
  if (sc < count) {
    up = max > 0 ? up + (count - sc) : up;
    below = max > 0 ? below : below + (count - sc);
  }
  return { step, tickMin: dec(middle - below * step), tickMax: dec(middle + up * step) };
}
export function niceTicks(min, max, count = 5) {
  if (min === max) {
    if (min === 0) return [0, 0.25, 0.5, 0.75, 1];
    const a = Math.abs(min);
    const s = formatStep(a / (count - 1), 0);
    const lo = min > 0 ? 0 : min - s * (count - 1);
    return Array.from({ length: count }, (_, i) => dec(lo + i * s));
  }
  const { step, tickMin, tickMax } = calcStep(Math.min(min, max), Math.max(min, max), count);
  if (!step) return [min, max];
  const out = [];
  for (let v = tickMin; v <= tickMax + step / 2; v = dec(v + step)) out.push(v);
  return out;
}

/* d3 curveMonotoneX */
function monotonePath(pts) {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  if (n === 2) return `M${pts[0][0]},${pts[0][1]}L${pts[1][0]},${pts[1][1]}`;
  const sign = (x) => (x < 0 ? -1 : 1);
  const slope3 = (x0, y0, x1, y1, x2, y2) => {
    const h0 = x1 - x0, h1 = x2 - x1;
    const s0 = (y1 - y0) / (h0 || (h1 < 0 && -0));
    const s1 = (y2 - y1) / (h1 || (h0 < 0 && -0));
    const p = (s0 * h1 + s1 * h0) / (h0 + h1);
    return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  };
  const slope2 = (x0, y0, x1, y1, t) => {
    const h = x1 - x0;
    return h ? ((3 * (y1 - y0)) / h - t) / 2 : t;
  };
  const t = new Array(n);
  for (let i = 1; i < n - 1; i++) t[i] = slope3(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  t[0] = slope2(pts[0][0], pts[0][1], pts[1][0], pts[1][1], t[1]);
  t[n - 1] = slope2(pts[n - 2][0], pts[n - 2][1], pts[n - 1][0], pts[n - 1][1], t[n - 2]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const dx = (x1 - x0) / 3;
    d += `C${x0 + dx},${y0 + dx * t[i]},${x1 - dx},${y1 - dx * t[i + 1]},${x1},${y1}`;
  }
  return d;
}
/* line split on null values (Recharts connectNulls = false) */
function lineSegments(pts) {
  const out = [];
  let cur = [];
  pts.forEach((p) => {
    if (p) cur.push(p);
    else if (cur.length) { out.push(cur); cur = []; }
  });
  if (cur.length) out.push(cur);
  return out;
}
function roundedTopBar(x, y, w, h, r) {
  if (h <= 0 || w <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}L${x},${y + rr}Q${x},${y} ${x + rr},${y}L${x + w - rr},${y}Q${x + w},${y} ${x + w},${y + rr}L${x + w},${y + h}Z`;
}
const tickText = (v) => String(dec(v));

/**
 * props:
 *  data, height, margin {top,right,left,bottom}, xKey, xTick {fontSize, fill}
 *  axes: { [id]: { side:'left'|'right', domain:'auto'|'zero', width, fmt, fontSize, fill } }
 *  bars: [{ key, axis, fill, opacity, radius, barSize, gradient:[c0,o0,c1,o1], name }]
 *  lines: [{ key, axis, color, width, dot:{r, fill, stroke, strokeWidth}, activeR, name }]
 *  refLines: [{ axis, y, color, dash, opacity }]
 *  tooltip: (row, index) => ReactNode      cursor: 'band' | null
 */
export function XChart({ data, height, margin, xKey, xTick = {}, axes, bars = [], lines = [], refLines = [], tooltip, cursor }) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState(null);
  const box = useRef(null);
  const m = { top: 5, right: 5, left: 5, bottom: 5, ...(margin || {}) };
  const axisIds = Object.keys(axes || {});
  const leftW = axisIds.filter((id) => axes[id].side !== 'right').reduce((a, id) => a + (axes[id].width || 60), 0);
  const rightW = axisIds.filter((id) => axes[id].side === 'right').reduce((a, id) => a + (axes[id].width || 60), 0);
  const xAxisH = 30;
  const plot = { x: m.left + leftW, y: m.top, w: Math.max(10, w - m.left - m.right - leftW - rightW), h: Math.max(10, height - m.top - m.bottom - xAxisH) };
  const n = (data || []).length;
  const band = n > 0 ? plot.w / n : plot.w;
  const cx = (i) => plot.x + band * i + band / 2;

  const scales = useMemo(() => {
    const out = {};
    axisIds.forEach((id) => {
      const ax = axes[id];
      const vals = [];
      bars.filter((b) => b.axis === id).forEach((b) => data.forEach((r) => { const v = Number(r[b.key]); if (Number.isFinite(v)) vals.push(v); }));
      lines.filter((l) => l.axis === id).forEach((l) => data.forEach((r) => { const v = r[l.key]; if (v !== null && v !== undefined && Number.isFinite(Number(v))) vals.push(Number(v)); }));
      let lo = vals.length ? Math.min(...vals) : 0, hi = vals.length ? Math.max(...vals) : 0;
      if (ax.domain !== 'auto') lo = Math.min(0, lo);
      const ticks = niceTicks(lo, hi, 5);
      const t0 = ticks[0], t1 = ticks[ticks.length - 1];
      const span = t1 - t0 || 1;
      out[id] = { ticks, y: (v) => plot.y + plot.h - ((Number(v) - t0) / span) * plot.h };
    });
    return out;
  }, [data, axes, bars, lines, plot.y, plot.h]); // eslint-disable-line react-hooks/exhaustive-deps

  // x tick thinning (Recharts "preserveEnd")
  const fs = xTick.fontSize || 9;
  const labW = Math.max(...(data || []).map((r) => String(r[xKey]).length), 1) * fs * 0.62 + 6;
  const every = band > 0 ? Math.max(1, Math.ceil(labW / band)) : 1;

  const pick = (x) => {
    if (!n || x < plot.x || x > plot.x + plot.w) return;
    const i = Math.min(n - 1, Math.max(0, Math.floor((x - plot.x) / band)));
    setSel(i);
  };
  const webHandlers = Platform.OS === 'web'
    ? {
        onMouseMove: (e) => {
          const t = e.currentTarget;
          const rect = t && t.getBoundingClientRect ? t.getBoundingClientRect() : null;
          if (rect) pick(e.nativeEvent.clientX - rect.left);
        },
        onMouseLeave: () => setSel(null),
      }
    : {};

  const tipW = 200;
  const tipLeft = sel !== null ? Math.min(Math.max(4, cx(sel) + 10 > w - tipW ? cx(sel) - tipW - 10 : cx(sel) + 10), Math.max(4, w - tipW - 4)) : 0;

  return (
    <View
      ref={box}
      style={{ height, position: 'relative' }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => false}
      onResponderTerminationRequest={() => true}
      onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
      onResponderMove={(e) => pick(e.nativeEvent.locationX)}
      {...webHandlers}
    >
      {w > 0 ? (
        <Svg width={w} height={height} pointerEvents="none">
          <Defs>
            {bars.filter((b) => b.gradient).map((b) => (
              <LinearGradient key={b.key} id={`g_${b.key}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={b.gradient[0]} stopOpacity={b.gradient[1]} />
                <Stop offset="100%" stopColor={b.gradient[2]} stopOpacity={b.gradient[3]} />
              </LinearGradient>
            ))}
          </Defs>
          {/* y ticks */}
          {axisIds.map((id) => {
            const ax = axes[id], s = scales[id];
            const right = ax.side === 'right';
            const xx = right ? plot.x + plot.w + 4 : plot.x - 4;
            return (
              <G key={id}>
                {s.ticks.map((t) => (
                  <SvgText key={t} x={xx} y={s.y(t) + 3} textAnchor={right ? 'start' : 'end'} fontFamily={SVG_FONT} fontSize={ax.fontSize || 9} fill={ax.fill || '#666'}>
                    {ax.fmt ? ax.fmt(t) : tickText(t)}
                  </SvgText>
                ))}
              </G>
            );
          })}
          {/* x ticks */}
          {(data || []).map((r, i) => ((n - 1 - i) % every === 0 ? (
            <SvgText key={i} x={cx(i)} y={plot.y + plot.h + 8 + fs + (xTick.dy || 0)} textAnchor="middle" fontFamily={SVG_FONT} fontSize={fs} fill={xTick.fill || '#666'}>
              {String(r[xKey])}
            </SvgText>
          ) : null))}
          {/* cursor */}
          {cursor === 'band' && sel !== null ? <Rect x={plot.x + band * sel} y={plot.y} width={band} height={plot.h} fill="rgba(201,122,26,0.07)" /> : null}
          {/* bars */}
          {bars.map((b) => {
            const s = scales[b.axis];
            const bw = b.barSize ? Math.min(b.barSize, band * 0.9) : band * 0.8;
            return (
              <G key={b.key}>
                {data.map((r, i) => {
                  const v = Number(r[b.key]) || 0;
                  const y0 = s.y(Math.max(0, s.ticks[0])), y1 = s.y(v);
                  const top = Math.min(y0, y1), hh = Math.abs(y0 - y1);
                  return <Path key={i} d={roundedTopBar(cx(i) - bw / 2, top, bw, hh, b.radius || 0)} fill={b.gradient ? `url(#g_${b.key})` : b.fill} fillOpacity={b.gradient ? 1 : b.opacity ?? 1} />;
                })}
              </G>
            );
          })}
          {/* reference lines */}
          {refLines.map((rl, i) => {
            const s = scales[rl.axis];
            const yy = s.y(rl.y);
            if (yy < plot.y - 0.5 || yy > plot.y + plot.h + 0.5) return null;
            return <SvgLine key={i} x1={plot.x} x2={plot.x + plot.w} y1={yy} y2={yy} stroke={rl.color} strokeDasharray={rl.dash || '4 4'} strokeOpacity={rl.opacity ?? 1} />;
          })}
          {/* lines */}
          {lines.map((l) => {
            const s = scales[l.axis];
            const pts = data.map((r, i) => (r[l.key] === null || r[l.key] === undefined ? null : [cx(i), s.y(r[l.key])]));
            return (
              <G key={l.key}>
                {lineSegments(pts).map((seg, k) => <Path key={k} d={monotonePath(seg)} stroke={l.color} strokeWidth={l.width || 2} fill="none" />)}
                {pts.map((p, i) => (p ? (
                  <Circle key={i} cx={p[0]} cy={p[1]} r={sel === i ? (l.activeR || 5) : (l.dot && l.dot.r) || 3} fill={sel === i ? l.color : (l.dot && l.dot.fill) || l.color}
                    stroke={sel === i ? '#fff' : (l.dot && l.dot.stroke) || 'none'} strokeWidth={sel === i ? 2 : (l.dot && l.dot.strokeWidth) || 0} />
                ) : null))}
              </G>
            );
          })}
        </Svg>
      ) : null}
      {sel !== null && tooltip && data[sel] ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 4, left: tipLeft, zIndex: 80 }}>{tooltip(data[sel], sel)}</View>
      ) : null}
    </View>
  );
}

/** Recharts default tooltip with the artifact's contentStyle */
export function DefaultTip({ label, items }) {
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minWidth: 120 }}>
      <Text style={{ fontFamily: MONO, fontSize: 11, color: T.ink, marginBottom: 4 }}>{label}</Text>
      {items.map((it, i) => (
        <Text key={i} style={{ fontFamily: MONO, fontSize: 11, color: it.color, paddingVertical: 2 }}>{it.name} : {it.value}</Text>
      ))}
    </View>
  );
}

/** Artifact PremiumTip (Production vs cost / pick) */
export function PremiumTip({ label, items }) {
  const single = items.length === 1;
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.99)', borderWidth: 1.5, borderColor: T.border, borderRadius: 16, paddingVertical: single ? 14 : 15, paddingHorizontal: 18, minWidth: single ? 132 : 172, shadowColor: '#0D1B2A', shadowOpacity: 0.32, shadowRadius: 22, shadowOffset: { width: 0, height: 18 }, elevation: 12 }}>
      {label != null ? <Text style={{ fontSize: 13, fontWeight: '800', color: T.muted, marginBottom: single ? 7 : 10, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</Text> : null}
      {items.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 5 }}>
          <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: p.color || T.copper }} />
          <Text style={{ flex: 1, fontSize: 13.5, color: T.ink, fontWeight: '600' }}>{p.name}</Text>
          <Text style={{ fontFamily: MONO, fontSize: 17, fontWeight: '800', color: T.ink }}>{p.value}</Text>
        </View>
      ))}
    </View>
  );
}
