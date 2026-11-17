// FILE: src/components/DtsNEW/ui.tsx
// Building blocks of the DTS screen — the owner dashboard's vocabulary (widget card with a coloured title bar,
// totals row, list rows, date-wise scrollable graph, period bar) in the NEW ERP theme.
// Display only: nothing here calls the API or calculates a business figure.
import { T, S } from '@/src/theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { DateField } from '../erpUi';
import { FONT } from '../OwnerDashboardNEW/fonts';
import {
  addDays, dateOf, daysBetween, daysIn, daysInMonth, DtsItem, fmtD, hueOf, initialsOf, isoOf, mLbl, monthEnd,
  num, PeriodKey, PERIODS, rangeOf, selLbl, todayS,
} from './model';

/** the owner dashboard's colours (same values as the artifact's dashboard palette) */
export const C = {
  mut: '#7C746C', faint: T.muted, hair: T.hair, bd: T.border, ink: T.ink,
  owner: T.nav, exec: T.yd, prod: T.purple, out: T.copper, today: T.green, bill: T.blue, over: T.red, amber: T.amber,
};

const NUM: any = { fontVariant: ['tabular-nums'] };

/* ------------------------------------------------------------------ */
/* Widget card                                                         */
/* ------------------------------------------------------------------ */

export function Widget({
  icon, title, accent, time, onTitle, right, onRefresh, children,
}: {
  icon: string; title: string; accent: string; time?: string; onTitle?: () => void; right?: React.ReactNode;
  /** reloads only this widget's figures from the server */
  onRefresh?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={st.card}>
      {/* the title and "Full report" open the report; a pill (FY) on the bar is its own button, never nested in another */}
      <View style={[st.wHead, { backgroundColor: accent }]}>
        <Pressable
          onPress={onTitle}
          disabled={!onTitle}
          accessibilityRole={onTitle ? 'button' : undefined}
          accessibilityLabel={onTitle ? `Open ${title} full report` : title}
          style={st.wHeadMain}
        >
          <Text style={st.wIcon}>{icon}</Text>
          <Text style={st.wTitle} numberOfLines={1}>{title}</Text>
        </Pressable>
        {right}
        {onTitle ? (
          <Pressable onPress={onTitle} accessibilityRole="button" accessibilityLabel={`${title} full report`} hitSlop={8}>
            <Text style={st.wLink}>Full report ›</Text>
          </Pressable>
        ) : null}
        {time ? <Text style={st.wTime}>{time}</Text> : null}
        {onRefresh ? <RefreshBtn onPress={onRefresh} label={`Refresh ${title}`} light /> : null}
      </View>
      <View style={st.wBody}>{children}</View>
    </View>
  );
}

/** ↻ — reload one widget (light = on a coloured title bar) or, with text, everything */
export function RefreshBtn({ onPress, label, light, text }: { onPress: () => void; label: string; light?: boolean; text?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={[st.refresh, light ? st.refreshLight : st.refreshDark, !!text && { paddingHorizontal: 10 }]}>
      <Text style={[st.refreshIcon, { color: light ? '#fff' : T.copper }]}>↻</Text>
      {text ? <Text style={[st.refreshText, { color: light ? '#fff' : T.ink }]}>{text}</Text> : null}
    </Pressable>
  );
}

/** actual against target: amount / target, bar, % achieved and the variance (target null = none entered) */
export function VsRow({ label, actual, target, fmt }: { label: string; actual: number; target: number | null; fmt: (n: number) => string }) {
  const has = target != null && target > 0;
  const p = has ? Math.round((actual / (target as number)) * 100) : 0;
  const col = p >= 90 ? T.green : p >= 60 ? T.blue : T.amber;
  const diff = has ? actual - (target as number) : 0;
  return (
    <View style={st.vs}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginBottom: 7 }}>
        <Text style={st.vsLabel}>{label}</Text>
        <Text style={st.vsActual}>{fmt(actual)}</Text>
        <Text style={st.vsTarget}>{has ? `/ ${fmt(target as number)}` : '· no target entered'}</Text>
      </View>
      {has ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={st.vsTrack}><View style={{ width: `${Math.min(100, p)}%`, height: '100%', backgroundColor: col, borderRadius: 5 }} /></View>
            <Text style={[st.vsPct, { color: col }]}>{p}%</Text>
          </View>
          <Text style={[st.vsVar, { color: diff >= 0 ? T.green : T.red }]}>{diff >= 0 ? `+${fmt(diff)}` : `−${fmt(Math.abs(diff))}`}</Text>
        </>
      ) : null}
    </View>
  );
}

/** "By category" style divider */
export const Divider = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4 }}>
    <Text style={st.divText}>{children}</Text>
    <View style={{ flex: 1, height: 1, backgroundColor: T.hair }} />
  </View>
);

/** a pill on a widget's title bar (FY ›) */
export function HeadPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={st.headPill} hitSlop={6}>
      <Text style={st.headPillText}>{label} ›</Text>
    </Pressable>
  );
}

export function TotRow({ items }: { items: { label: string; value: string; color?: string; onPress?: () => void }[] }) {
  return (
    <View style={st.totRow}>
      {items.map((it, i) => (
        <Pressable key={i} style={{ flex: 1, minWidth: 0 }} onPress={it.onPress} disabled={!it.onPress}>
          <Text style={st.totLabel} numberOfLines={2}>{it.label}</Text>
          <Text style={[st.totValue, { color: it.color || C.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {it.value}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* rows                                                                */
/* ------------------------------------------------------------------ */

/** "Name · A · B" list row (head = the small uppercase column titles) */
export function ListRow({
  left, a, b, aColor, bColor, onPress, head, lead,
}: {
  left: React.ReactNode; a?: string; b?: string; aColor?: string; bColor?: string; onPress?: () => void;
  head?: boolean; lead?: React.ReactNode;
}) {
  const txt = head ? st.rowHeadText : st.rowNum;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [st.row, pressed && onPress ? { backgroundColor: '#F9F7F4' } : null]}
    >
      {lead !== undefined ? <View style={st.rowLead}>{lead}</View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof left === 'string' ? <Text style={head ? st.rowHeadText : st.rowName} numberOfLines={1}>{left}</Text> : left}
      </View>
      {a !== undefined ? <Text style={[txt, st.rowCol, !head && { color: aColor || C.ink }]} numberOfLines={1}>{a}</Text> : null}
      {b !== undefined ? <Text style={[txt, st.rowCol, !head && { color: bColor || C.ink }]} numberOfLines={1}>{b}</Text> : null}
      {onPress && !head ? <Text style={st.rowChevron}>›</Text> : a !== undefined || b !== undefined ? <View style={{ width: 8 }} /> : null}
    </Pressable>
  );
}

export const TwoLine = ({ title, sub, bold, indent }: { title: string; sub?: string; bold?: boolean; indent?: boolean }) => (
  <View style={{ minWidth: 0, paddingLeft: indent ? 12 : 0 }}>
    <Text style={[st.rowName, bold && { fontWeight: '800' }, indent && { color: C.mut, fontWeight: '500' }]} numberOfLines={1}>{title}</Text>
    {sub ? <Text style={st.rowSub} numberOfLines={1}>{sub}</Text> : null}
  </View>
);

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hueOf(name)},45%,42%)`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '700', fontFamily: FONT }}>{initialsOf(name)}</Text>
    </View>
  );
}

export const ExecName = ({ name, size = 24 }: { name: string; size?: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 }}>
    <Avatar name={name} size={size} />
    <Text style={[st.rowName, { flexShrink: 1 }]} numberOfLines={1}>{name}</Text>
  </View>
);

export const SecHead = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
    <Text style={st.secHead}>{children}</Text>
    {right || null}
  </View>
);
export const SecHint = ({ children }: { children: React.ReactNode }) => <Text style={st.hint}>{children}</Text>;
export const SecEmpty = ({ children }: { children: React.ReactNode }) => <Text style={st.empty}>{children}</Text>;

/** a day picked on a widget's graph: tap to clear */
export const DayNote = ({ sel, onClear }: { sel: string | null; onClear: () => void }) =>
  sel ? (
    <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear the selected day">
      <Text style={st.dayNote}>{selLbl(sel)} ✕</Text>
    </Pressable>
  ) : null;

export function MLink({ icon, color, title, sub, onPress }: { icon: string; color: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[st.card, st.mlink]}>
      <View style={[st.mlinkIcon, { backgroundColor: `${color}1a` }]}>
        <Text style={{ fontSize: 18, color }}>{icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.mlinkTitle}>{title}</Text>
        <Text style={st.mlinkSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={{ color: C.faint, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}

/** loading / error body of a widget or page */
export function StateBox({ loading, error, onRetry, minHeight = 90 }: { loading?: boolean; error?: string; onRetry?: () => void; minHeight?: number }) {
  if (error) {
    return (
      <Pressable onPress={onRetry} disabled={!onRetry} style={[st.state, { minHeight }]} accessibilityRole="button">
        <Text style={st.stateErr}>{error}</Text>
        {onRetry ? <Text style={st.stateRetry}>Tap to retry</Text> : null}
      </Pressable>
    );
  }
  if (loading) {
    return (
      <View style={[st.state, { minHeight }]}>
        <ActivityIndicator size="small" color={T.copper} />
        <Text style={st.stateText}>Loading…</Text>
      </View>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Target ring                                                         */
/* ------------------------------------------------------------------ */

export function DonutRing({ pct, size = 104, label = 'billed' }: { pct: number; size?: number; label?: string }) {
  const r = size / 2 - 7, cx = size / 2, circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cx} r={r} fill="none" stroke={T.hair} strokeWidth={9} />
        <Circle
          cx={cx} cy={cx} r={r} fill="none" stroke={T.blue} strokeWidth={9} strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - p / 100)}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      <Text style={[st.ringValue, NUM]}>{Math.round(Math.min(999, pct))}%</Text>
      <Text style={st.ringLabel}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Graph: date-wise over a range, horizontally scrollable, a tap selects the day (again clears).
/* Ranges longer than 62 days plot month-wise.                          */
/* ------------------------------------------------------------------ */

export function Spark({
  from, to, entries, color, fmt, sel, onPick, height = 96,
}: {
  from: string; to: string; entries: DtsItem[]; color: string; fmt: (n: number) => string;
  sel?: string | null; onPick?: (key: string | null) => void; height?: number;
}) {
  const [boxW, setBoxW] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const days = useMemo(() => daysIn(from, to), [from, to]);
  const n = days.length, monthly = n > 62;
  const keys = useMemo(() => (monthly ? Array.from(new Set(days.map((d) => d.slice(0, 7)))) : days), [days, monthly]);
  const values = useMemo(() => {
    const by: Record<string, number> = {};
    (entries || []).forEach((x) => {
      const k = monthly ? String(x.date).slice(0, 7) : String(x.date).slice(0, 10);
      by[k] = (by[k] || 0) + num(x.v);
    });
    return keys.map((k) => by[k] || 0);
  }, [entries, keys, monthly]);

  const step = monthly ? 58 : n > 31 ? 30 : 22;
  const PADX = monthly ? 26 : 12, TOP = 22, LABEL = 16;
  const width = Math.max(boxW, keys.length * step + PADX * 2);
  const plotH = height - TOP - LABEL;
  const max = Math.max(...values, 0), min = Math.min(...values, 0), span = max - min || 1;
  const x = (i: number) => (keys.length > 1 ? PADX + (i / (keys.length - 1)) * (width - PADX * 2) : width / 2);
  const y = (v: number) => TOP + plotH - ((v - min) / span) * plotH;
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = values.length ? `${line}L${x(values.length - 1).toFixed(1)},${TOP + plotH}L${x(0).toFixed(1)},${TOP + plotH}Z` : '';
  const lab = (k: string) => (monthly ? mLbl(k) : n > 31 ? fmtD(k) : String(+k.slice(8, 10)));
  const every = monthly ? 1 : n > 31 ? 3 : 2;
  const selIdx = sel ? keys.indexOf(sel) : -1;
  const gid = `dts_${color.replace('#', '')}`;

  /* open with today in view (the days before it visible); a range wholly in the past opens at its end */
  useEffect(() => {
    if (!boxW || width <= boxW) return;
    const t = todayS(), tk = monthly ? t.slice(0, 7) : t;
    let idx = keys.findIndex((k) => k >= tk);
    if (idx < 0) idx = keys.length - 1;
    const px = Math.max(0, Math.min(width - boxW, x(idx) - boxW * 0.72));
    const id = setTimeout(() => scroller.current?.scrollTo({ x: px, animated: false }), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxW, width, from, to]);

  return (
    <View onLayout={(e) => setBoxW(Math.floor(e.nativeEvent.layout.width))} style={{ marginTop: 6 }}>
      <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
        <View style={{ width, height }}>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={color} stopOpacity={0.42} />
                <Stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {area ? <Path d={area} fill={`url(#${gid})`} /> : null}
            {line ? <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /> : null}
            {selIdx >= 0 ? (
              <>
                <Line x1={x(selIdx)} x2={x(selIdx)} y1={TOP - 4} y2={TOP + plotH} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" />
                <Circle cx={x(selIdx)} cy={y(values[selIdx])} r={5} fill={color} stroke="#fff" strokeWidth={2} />
              </>
            ) : null}
          </Svg>
          {/* x labels */}
          {keys.map((k, i) =>
            i % every === 0 ? (
              <Text key={k} style={[st.sparkLabel, { left: x(i) - 24, top: height - LABEL + 2 }]} numberOfLines={1}>{lab(k)}</Text>
            ) : null,
          )}
          {/* the value of the picked point */}
          {selIdx >= 0 ? (
            <View pointerEvents="none" style={[st.sparkTip, { left: Math.max(2, Math.min(width - 112, x(selIdx) - 55)), top: 0 }]}>
              <Text style={[st.sparkTipText, NUM, { color }]} numberOfLines={1}>{fmt(values[selIdx])}</Text>
            </View>
          ) : null}
          {/* tap targets: one column per point */}
          {onPick
            ? keys.map((k, i) => (
                <Pressable
                  key={`hit${k}`}
                  onPress={() => onPick(sel === k ? null : k)}
                  accessibilityRole="button"
                  accessibilityLabel={`${selLbl(k)}: ${fmt(values[i])}`}
                  style={{ position: 'absolute', top: 0, bottom: 0, left: x(i) - step / 2, width: step }}
                />
              ))
            : null}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Period bar: chips · custom dates · ‹ › to step the range             */
/* ------------------------------------------------------------------ */

export function RangeBar({
  period, from, to, onChange, extra,
}: {
  period: PeriodKey; from: string; to: string;
  onChange: (c: { period?: PeriodKey; from?: string; to?: string }) => void; extra?: React.ReactNode;
}) {
  const t = todayS();
  const [f, u, lbl, wholeMonth] = rangeOf(period, from, to);
  /* step the range by its own length: a month to the previous / next month, a day to the previous / next day */
  const step = (dir: number) => {
    if (wholeMonth) {
      const d = dateOf(f);
      d.setMonth(d.getMonth() + dir);
      const k = isoOf(d).slice(0, 7);
      onChange({ period: 'custom', from: `${k}-01`, to: monthEnd(k) });
      return;
    }
    const span = daysBetween(f, u) + 1;
    onChange({ period: 'custom', from: addDays(f, dir * span), to: addDays(u, dir * span) });
  };
  const arrow = (dir: number) => (
    <Pressable onPress={() => step(dir)} accessibilityRole="button" accessibilityLabel={dir < 0 ? 'Previous period' : 'Next period'} style={st.arrow} hitSlop={6}>
      <Text style={st.arrowText}>{dir < 0 ? '‹' : '›'}</Text>
    </Pressable>
  );
  const tail = u > t ? (period === 'fy' ? ' · to year end' : wholeMonth ? ' · to month end' : ' · includes future dates') : '';
  return (
    <View style={[st.card, { padding: 11, marginBottom: 10 }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
        {PERIODS(t).map(([k, l]) => (
          <Pressable key={k} onPress={() => onChange({ period: k })} accessibilityRole="button" style={[st.chip, period === k && st.chipOn]}>
            <Text style={[st.chipText, period === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {period === 'custom' ? (
        <View style={{ flexDirection: 'row', gap: 9, marginTop: 9, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 130 }}>
            <Text style={st.fieldLabel}>From</Text>
            <DateField value={dateOf(from || f)} onChange={(d) => onChange({ from: isoOf(d) })} />
          </View>
          <View style={{ flex: 1, minWidth: 130 }}>
            <Text style={st.fieldLabel}>To</Text>
            <DateField value={dateOf(to || u)} onChange={(d) => onChange({ to: isoOf(d) })} />
          </View>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
        {arrow(-1)}
        <Text style={st.rangeLabel}>
          {lbl}
          <Text style={{ fontSize: 10, fontWeight: '600', color: C.mut }}>{tail}</Text>
        </Text>
        {arrow(1)}
        {extra || null}
      </View>
    </View>
  );
}

export const monthDaysLeft = (today: string) => daysInMonth(today.slice(0, 7)) - +today.slice(8, 10);

export const st = StyleSheet.create({
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 14, overflow: 'hidden', marginBottom: 12, ...S.card },
  wHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 34 },
  wHeadMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  wIcon: { fontSize: 13, color: '#fff' },
  wTitle: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.9, flexShrink: 1 },
  wLink: { fontFamily: FONT, fontSize: 9.5, fontWeight: '700', color: '#fff', opacity: 0.92 },
  wTime: { fontFamily: FONT, fontSize: 9, color: '#fff', opacity: 0.85 },
  wBody: { paddingHorizontal: 12, paddingVertical: 6 },
  headPill: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  headPillText: { fontFamily: FONT, fontSize: 9.5, fontWeight: '700', color: '#fff' },

  refresh: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 26, height: 26, borderRadius: 13, justifyContent: 'center', borderWidth: 1 },
  refreshLight: { borderColor: 'rgba(255,255,255,0.45)' },
  refreshDark: { borderColor: T.border, backgroundColor: '#fff' },
  refreshIcon: { fontSize: 14, fontWeight: '800', lineHeight: 16 },
  refreshText: { fontFamily: FONT, fontSize: 11.5, fontWeight: '700' },
  vs: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.hair },
  vsLabel: { flex: 1, fontFamily: FONT, fontSize: 14, fontWeight: '700', color: T.ink },
  vsActual: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: T.ink, fontVariant: ['tabular-nums'] },
  vsTarget: { fontFamily: FONT, fontSize: 11, color: T.muted, fontVariant: ['tabular-nums'] },
  vsTrack: { flex: 1, height: 10, backgroundColor: '#EFEAE4', borderRadius: 5, overflow: 'hidden' },
  vsPct: { fontFamily: FONT, fontSize: 15, fontWeight: '800', minWidth: 46, textAlign: 'right', fontVariant: ['tabular-nums'] },
  vsVar: { fontFamily: FONT, fontSize: 11, fontWeight: '600', textAlign: 'right', marginTop: 4, fontVariant: ['tabular-nums'] },
  divText: { fontFamily: FONT, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.7 },
  totRow: { flexDirection: 'row', gap: 10, paddingTop: 4, paddingBottom: 8 },
  totLabel: { fontFamily: FONT, fontSize: 8.5, fontWeight: '700', color: C.mut, textTransform: 'uppercase', letterSpacing: 0.4 },
  totValue: { fontFamily: FONT, fontSize: 15, fontWeight: '700', marginTop: 1, fontVariant: ['tabular-nums'] },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: T.hair, minHeight: 36 },
  rowLead: { width: 24, alignItems: 'center' },
  rowHeadText: { fontFamily: FONT, fontSize: 9, fontWeight: '700', color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowName: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.ink },
  rowSub: { fontFamily: FONT, fontSize: 9.5, color: C.faint, marginTop: 1 },
  rowNum: { fontFamily: FONT, fontSize: 11.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  rowCol: { minWidth: 74, textAlign: 'right' },
  rowChevron: { width: 8, fontSize: 12, color: C.faint, textAlign: 'right' },

  secHead: { fontFamily: FONT, fontSize: 8.5, fontWeight: '700', color: C.faint, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 6, marginBottom: 2 },
  hint: { fontFamily: FONT, fontSize: 10, color: C.faint, paddingTop: 7, lineHeight: 15 },
  empty: { fontFamily: FONT, fontSize: 11, color: C.mut, paddingVertical: 6 },
  dayNote: { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: T.blue },

  mlink: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  mlinkIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mlinkTitle: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.ink },
  mlinkSub: { fontFamily: FONT, fontSize: 10.5, color: C.mut },

  state: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  stateText: { fontFamily: FONT, fontSize: 11, color: C.mut },
  stateErr: { fontFamily: FONT, fontSize: 11.5, fontWeight: '700', color: T.red, textAlign: 'center' },
  stateRetry: { fontFamily: FONT, fontSize: 10.5, fontWeight: '700', color: T.blue },

  ringValue: { fontFamily: FONT, fontSize: 21, fontWeight: '700', color: C.ink },
  ringLabel: { fontFamily: FONT, fontSize: 9, color: C.mut },

  sparkLabel: { position: 'absolute', width: 48, textAlign: 'center', fontFamily: FONT, fontSize: 9.5, color: C.faint },
  sparkTip: { position: 'absolute', width: 110, alignItems: 'center' },
  sparkTipText: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800', backgroundColor: '#fff', borderWidth: 1, borderColor: T.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },

  chip: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 16, backgroundColor: '#EFEAE4' },
  chipOn: { backgroundColor: T.nav },
  chipText: { fontFamily: FONT, fontSize: 11.5, fontWeight: '700', color: C.mut },
  fieldLabel: { fontFamily: FONT, fontSize: 8.5, fontWeight: '700', color: C.faint, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  arrow: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 16, fontWeight: '800', color: T.copper, lineHeight: 18 },
  rangeLabel: { flex: 1, minWidth: 120, fontFamily: FONT, fontSize: 12, fontWeight: '800', color: C.ink },
});
