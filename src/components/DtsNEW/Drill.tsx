// FILE: src/components/DtsNEW/Drill.tsx
// The generic DTS drill report: period -> graph -> level 1 -> level 2 -> ... -> records.
//   General -> Specific -> More specific -> Detailed records, every step a tap; the breadcrumb goes back up.
//   The graph is date-wise and horizontally scrollable; tapping a point narrows the report to that day
//   (month, on ranges longer than 62 days); tapping it again clears.
// Rows come from GET /api/getDtsDashboard (see ./api.ts) for the chosen range; this component only groups,
// filters and adds them up.
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONT } from '../OwnerDashboardNEW/fonts';
import {
  addDays, daysIn, DIM_LBL, DrillInit, DTS, DtsItem, fmtDY, monthEnd, num, PathStep, PeriodKey, pl, rangeOf, selLbl,
  todayS,
} from './model';
import { C, RangeBar, Spark, st as ui, StateBox } from './ui';

export type DrillLoad = (from: string, to: string) => Promise<{ items: DtsItem[]; note?: string }>;

type Props = {
  /** loads the records of a range (cached by the caller) */
  load: DrillLoad;
  levels: string[];
  fmt: (n: number) => string;
  /** false = a position as on today (outstanding): no period bar, no graph */
  periodic: boolean;
  init?: DrillInit;
  auxFmt?: (v: number, aux: number) => string;
  note?: string;
  recLbl?: string;
  chartColor?: string;
  /** remembers the page's state so ‹ back restores it */
  onState?: (s: DrillInit) => void;
};

const PAGE = 200;

export default function Drill({ load, levels, fmt, periodic, init, auxFmt, note, recLbl, chartColor, onState }: Props) {
  const t = todayS();
  const [period, setPeriod] = useState<PeriodKey>(init?.period || 'month');
  const [from, setFrom] = useState(init?.from || addDays(t, -30));
  const [to, setTo] = useState(init?.to || t);
  const [path, setPath] = useState<PathStep[]>(init?.path || []);
  const [sel, setSel] = useState<string | null>(init?.sel || null);
  const [items, setItems] = useState<DtsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apiNote, setApiNote] = useState('');
  const [shown, setShown] = useState(PAGE);
  const seq = useRef(0);

  const [f, u, rangeLbl] = rangeOf(period, from, to);

  const run = useCallback(async () => {
    const my = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const res = await load(f, u);
      if (my !== seq.current) return;
      setItems(res.items);
      setApiNote(res.note || '');
    } catch (e: any) {
      if (my !== seq.current) return;
      setItems([]);
      setError(e?.message || 'Unable to load this report.');
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [load, f, u]);

  useEffect(() => {
    void run();
  }, [run]);

  useEffect(() => {
    onState?.({ period, from, to, path, sel });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, from, to, path, sel]);

  useEffect(() => setShown(PAGE), [path, sel, f, u]);

  const inP = useMemo(() => (periodic ? items.filter((x) => x.date >= f && x.date <= u) : items), [items, periodic, f, u]);
  const scoped0 = useMemo(() => inP.filter((x) => path.every((p) => String((x.d || {})[p.k]) === String(p.v))), [inP, path]);
  const scoped = useMemo(() => (sel ? scoped0.filter((x) => String(x.date).startsWith(sel)) : scoped0), [scoped0, sel]);
  const lvl = levels[path.length];
  const tot = scoped.reduce((s, x) => s + num(x.v), 0);
  const totAux = scoped.reduce((s, x) => s + num(x.aux), 0);

  const rows = useMemo(() => {
    if (!lvl) return [];
    const g: Record<string, { k: string; v: number; n: number; aux: number }> = {};
    scoped.forEach((x) => {
      const k = (x.d || {})[lvl] || '—';
      const r = g[k] || (g[k] = { k, v: 0, n: 0, aux: 0 });
      r.v += num(x.v);
      r.aux += num(x.aux);
      r.n++;
    });
    return Object.values(g).sort((a, b) => b.v - a.v);
  }, [scoped, lvl]);
  const recs = useMemo(() => (lvl ? [] : scoped.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))), [scoped, lvl]);

  /* the graph of a running FY stops at the end of the current month */
  const chartTo = period === 'fy' && t < u ? monthEnd(t.slice(0, 7)) : u;
  const showChart = periodic && !!chartColor;
  const onRange = (c: { period?: PeriodKey; from?: string; to?: string }) => {
    if (c.period) setPeriod(c.period);
    if (c.from) setFrom(c.from);
    if (c.to) setTo(c.to);
    setSel(null);
  };
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.v)), 1);
  const barW = (v: number) => (tot !== 0 ? Math.max(2, Math.min(100, (Math.abs(v) / maxAbs) * 100)) : 0);
  const unit = recLbl || 'records';

  return (
    <View style={{ paddingBottom: 16 }}>
      {periodic ? <RangeBar period={period} from={from} to={to} onChange={onRange} /> : null}

      <View style={[ui.card, { padding: 11, marginBottom: 10 }]}>
        <View style={s.sumHead}>
          <Text style={s.sumText}>
            DTS · {periodic ? `${sel ? selLbl(sel) : rangeLbl} · ` : ''}
            {pl(scoped.length, unit)}
          </Text>
          <Text style={s.sumTotal}>{fmt(tot)}</Text>
        </View>
        {loading || error ? <StateBox loading={loading} error={error} onRetry={run} minHeight={70} /> : null}
        {showChart && !loading && !error ? (
          <>
            <Spark from={f} to={chartTo} entries={scoped0} color={chartColor!} sel={sel} onPick={setSel} fmt={fmt} />
            <View style={s.chartFoot}>
              <Text style={s.chartHint}>
                {sel
                  ? `Showing ${selLbl(sel)} only`
                  : `Tap a point on the graph to narrow the report to that ${daysIn(f, chartTo).length > 62 ? 'month' : 'day'}`}
              </Text>
              {sel ? (
                <Pressable onPress={() => setSel(null)} accessibilityRole="button" style={s.wholeBtn}>
                  <Text style={s.wholeBtnText}>✕ whole period</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}
      </View>

      {/* breadcrumb */}
      <View style={s.crumbs}>
        <Pressable onPress={() => setPath([])} hitSlop={6} accessibilityRole="button">
          <Text style={[s.crumb, { color: path.length ? DTS.color : C.ink }]}>DTS</Text>
        </Pressable>
        {path.map((p, i) => (
          <React.Fragment key={`${p.k}${i}`}>
            <Text style={{ color: C.faint, fontSize: 12 }}>›</Text>
            <Pressable onPress={() => setPath(path.slice(0, i + 1))} hitSlop={6} accessibilityRole="button" style={{ flexShrink: 1 }}>
              <Text style={[s.crumb, { color: i === path.length - 1 ? C.ink : DTS.color }]} numberOfLines={1}>{p.v}</Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>

      <View style={[ui.card, { marginBottom: 0 }]}>
        <View style={s.tableHead}>
          <Text style={s.tableHeadText}>{lvl ? `By ${(DIM_LBL[lvl] || lvl).toLowerCase()}` : unit.charAt(0).toUpperCase() + unit.slice(1)}</Text>
          <Text style={[s.tableHeadText, { fontVariant: ['tabular-nums'] }]}>
            {fmt(tot)}
            {auxFmt && totAux ? ` · ${auxFmt(tot, totAux)}` : ''}
          </Text>
        </View>

        {lvl ? (
          rows.length ? (
            rows.map((r) => (
              <Pressable
                key={r.k}
                onPress={() => setPath([...path, { k: lvl, v: r.k }])}
                accessibilityRole="button"
                accessibilityLabel={`${r.k}, ${fmt(r.v)}. Open`}
                style={({ pressed }) => [s.lvlRow, pressed && { backgroundColor: '#F9F7F4' }]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.lvlName} numberOfLines={1}>{r.k}</Text>
                  <View style={s.barTrack}>
                    <View style={{ width: `${barW(r.v)}%`, height: '100%', backgroundColor: r.v < 0 ? C.over : DTS.color }} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.lvlValue, r.v < 0 && { color: C.over }]}>{fmt(r.v)}</Text>
                  <Text style={s.lvlSub}>
                    {pl(r.n, unit)}
                    {auxFmt && r.aux ? ` · ${auxFmt(r.v, r.aux)}` : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: C.faint, width: 10, textAlign: 'right' }}>›</Text>
              </Pressable>
            ))
          ) : (
            <Text style={s.none}>{loading ? 'Loading…' : periodic ? 'Nothing in this period.' : 'Nothing here.'}</Text>
          )
        ) : recs.length ? (
          <>
            {recs.slice(0, shown).map((x, i) => (
              <View key={`${x.id}${i}`} style={s.recRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <Text style={s.recLabel}>{x.label}</Text>
                    {x.date ? <Text style={s.recDate}>{fmtDY(x.date)}</Text> : null}
                  </View>
                  <Text style={s.recSub}>{x.sub}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.recValue, (x.warn || x.v < 0) && { color: C.over }]}>{fmt(num(x.v))}</Text>
                  {x.aside ? <Text style={[s.lvlSub, x.warn && { color: C.over }]}>{x.aside}</Text> : null}
                </View>
              </View>
            ))}
            {recs.length > shown ? (
              <Pressable onPress={() => setShown(shown + PAGE)} accessibilityRole="button" style={s.more}>
                <Text style={s.moreText}>Show {Math.min(PAGE, recs.length - shown)} more of {pl(recs.length - shown, unit)}</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Text style={s.none}>{loading ? 'Loading…' : 'No records.'}</Text>
        )}
      </View>

      {note ? <Text style={s.note}>{note}</Text> : null}
      {apiNote ? <Text style={s.note}>{apiNote}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  sumHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  sumText: { fontFamily: FONT, fontSize: 11, color: C.mut, flexShrink: 1 },
  sumTotal: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: DTS.color, fontVariant: ['tabular-nums'] },
  chartFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 8 },
  chartHint: { fontFamily: FONT, fontSize: 10, color: C.faint, flex: 1 },
  wholeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: T.border, backgroundColor: '#fff' },
  wholeBtnText: { fontFamily: FONT, fontSize: 10.5, fontWeight: '700', color: C.mut },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginHorizontal: 2, marginBottom: 8 },
  crumb: { fontFamily: FONT, fontSize: 11.5, fontWeight: '800' },
  tableHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: T.nav },
  tableHeadText: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: '#fff', flexShrink: 1 },
  lvlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.hair, minHeight: 44 },
  lvlName: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.ink },
  barTrack: { height: 4, borderRadius: 3, backgroundColor: T.hair, marginTop: 5, overflow: 'hidden' },
  lvlValue: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  lvlSub: { fontFamily: FONT, fontSize: 9.5, color: C.faint, fontVariant: ['tabular-nums'] },
  recRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.hair },
  recLabel: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.ink },
  recDate: { fontFamily: FONT, fontSize: 10.5, color: C.mut },
  recSub: { fontFamily: FONT, fontSize: 10.5, color: C.faint, marginTop: 2 },
  recValue: { fontFamily: FONT, fontSize: 12.5, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  none: { fontFamily: FONT, fontSize: 11.5, color: C.mut, paddingHorizontal: 12, paddingVertical: 16 },
  more: { paddingVertical: 11, alignItems: 'center' },
  moreText: { fontFamily: FONT, fontSize: 11.5, fontWeight: '700', color: T.blue },
  note: { fontFamily: FONT, fontSize: 10.5, color: C.faint, paddingHorizontal: 4, paddingTop: 10, lineHeight: 16 },
});
