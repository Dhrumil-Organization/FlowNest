import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text,
  useWindowDimensions, View,
} from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { AmountDisplayModeControl, formatDashboardAmount, useDashboardAmountMode } from '@/src/components/dashboard/AmountDisplayModeControl';
import { fetchExpenseDashboardCard } from '@/src/services/Dashboard/expenseDashboardApi';
import {
  CostHead, CostMonth, HEADS, MonthCache, SectionCost, dateYmd,
  fromMonth, fyMonthEnd, fyMonths, fyStageIndex, fyYearNo,
  monthCacheKey, monthSectionRows, num, pad, stageDate, startYearOf,
  summarizeYear, yearLabel,
} from './productionCostFyModel';

const C = {
  bg: '#F5F2EE', card: '#FFFFFF', ink: '#1A1514', muted: '#827B74',
  faint: '#A19992', border: '#E6DFD7', navy: '#0D1B2A', copper: '#C96E16',
  blue: '#355D94', green: '#278366', red: '#BE4433', pale: '#EEE9E3',
};
const selectedColors = [C.copper, '#8494AB', '#BDB5AB'];
const one = (value: unknown): string => String(Array.isArray(value) ? value[0] ?? '' : value ?? '');
const validAnchor = (raw: string): Date => {
  const found = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!found) return new Date();
  const date = new Date(+found[1], +found[2] - 1, +found[3], 12);
  return date.getFullYear() === +found[1] && date.getMonth() === +found[2] - 1 && date.getDate() === +found[3] ? date : new Date();
};
const currency = (value: number | null | undefined, mode: 'compact' | 'actual'): string =>
  value == null || !Number.isFinite(value) ? '—' : formatDashboardAmount(value, mode);
const metres = (value: number | null | undefined): string =>
  value == null ? '—' : `${Math.round(value).toLocaleString('en-IN')} m`;
const rate = (value: number | null | undefined, decimals: number) =>
  value == null || !Number.isFinite(value) ? '—' : `₹${value.toFixed(decimals)}`;
const ymdLabel = (date: string | number) => {
  const raw = String(date).replace(/\D/g, '');
  return raw.length === 8 ? `${raw.slice(6, 8)}-${raw.slice(4, 6)}-${raw.slice(0, 4)}` : '';
};
const deltaPct = (current: number | null, previous: number | null) =>
  current !== null && previous !== null && previous > 0 ? (current / previous - 1) * 100 : null;

// Small, self-contained charts. The invisible pressable columns support hover
// on the web and tap on a phone; details appear immediately below each chart.
function FyGraph({
  chart, labels, data, onPick, hovered,
}: {
  chart: 'line' | 'bar'; labels: string[];
  data: Array<Array<number | null>>; onPick: (i: number) => void; hovered: number;
}) {
  const width = 780, height = 190, left = 24, top = 12, bottom = 28;
  const plotW = width - left - 12, plotH = height - top - bottom;
  const max = Math.max(1, ...data.flat().filter((v): v is number => v != null));
  const x = (i: number) => left + (i * plotW) / 11;
  const y = (v: number) => top + (1 - v / max) * plotH;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
      <View style={{ width, height: height + 4 }}>
        <Svg width={width} height={height}>
          {[0, .5, 1].map(t => <Line key={t} x1={left} x2={width - 12} y1={top + t * plotH} y2={top + t * plotH} stroke="#EEE9E3" strokeWidth="1" />)}
          <Line x1={x(hovered)} x2={x(hovered)} y1={top} y2={height - bottom + 2} stroke="#6C6258" strokeDasharray="4 4" opacity={.5} />
          {data.map((points, yi) => chart === 'line' ? (
            <React.Fragment key={yi}>
              {(() => {
                // Never draw a line across a missing month.
                const chunks: string[][] = []; let chunk: string[] = [];
                points.forEach((v, i) => { if (v == null) { if (chunk.length) chunks.push(chunk); chunk = []; }
                  else chunk.push(`${x(i)},${y(v)}`); });
                if (chunk.length) chunks.push(chunk);
                return chunks.map((path, pi) => path.length === 1
                  ? <Circle key={pi} cx={Number(path[0].split(',')[0])} cy={Number(path[0].split(',')[1])} r={3} fill={selectedColors[yi]} />
                  : <Polyline key={pi} points={path.join(' ')} fill="none" stroke={selectedColors[yi]} strokeWidth={yi === 0 ? 3 : 2} />);
              })()}
              {points.map((v, i) => v == null ? null : <Circle key={i} cx={x(i)} cy={y(v)} r={hovered === i ? 4 : 2.5} fill={selectedColors[yi]} />)}
            </React.Fragment>
          ) : points.map((v, i) => v == null ? null : (
            <Rect key={`${yi}-${i}`} x={x(i) - 18 + yi * 12} y={y(v)} width={10} height={Math.max(0, height - bottom - y(v))} fill={selectedColors[yi]} rx={2}/>
          )))}
          {labels.map((label, i) => <Line key={label} x1={x(i)} x2={x(i)} y1={height-bottom} y2={height-bottom+4} stroke="#C7BFB7" />)}
        </Svg>
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, width, height: height-bottom }}>
          {labels.map((label, i) => (
            <Pressable key={label} accessibilityRole="button" accessibilityLabel={`Show ${label} ${chart} details`}
              onHoverIn={() => onPick(i)} onPress={() => onPick(i)}
              style={{ position: 'absolute', left: Math.max(0, x(i)-plotW/22), top: 0, width: plotW/11, height: height-bottom }} />
          ))}
        </View>
        <View style={{ position: 'absolute', left, right: 12, bottom: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
          {labels.map(lbl => <Text key={lbl} style={s.axisLabel}>{lbl}</Text>)}
        </View>
      </View>
    </ScrollView>
  );
}

type FetchSpec = { year: number; index: number; stage: boolean; date: string };
type SectionLine = { name: string; amount: number; month: CostMonth; days: SectionCost['days'] };

export default function FyProductionCostScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const token = useAppSessionStore(st => st.token) || '';
  const rawDate = one(params.date);
  const anchor = useMemo(() => validAnchor(rawDate), [rawDate]);
  const today = useMemo(() => dateYmd(anchor), [anchor]);
  const currentFY = startYearOf(anchor);
  const stageIdx = fyStageIndex(anchor);
  const stageDay = anchor.getDate();
  const prptype = (one(params.prptype) || 'S').toUpperCase();
  const view = (one(params.view) || 'owner').toLowerCase();
  const years = useMemo(() => [currentFY, currentFY-1, currentFY-2], [currentFY]);
  const [year, setYear] = useState(currentFY);
  const [month, setMonth] = useState<number | null>(null);
  const [hover, setHover] = useState(stageIdx);
  const [detail, setDetail] = useState(false);
  const [head, setHead] = useState<CostHead | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [expandedTile, setExpandedTile] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [reload, setReload] = useState(0);
  const { width } = useWindowDimensions();
  const { mode: amountMode, setMode: setAmountMode } = useDashboardAmountMode();
  const store = useRef<MonthCache>({});
  const pending = useRef<FetchSpec[]>([]);
  const active = useRef(0);
  const generation = useRef(0);
  const mounted = useRef(true);
  const scheduled = useRef(new Set<string>());
  const pumpRef = useRef<() => void>(() => undefined);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    generation.current += 1;
    store.current = {};
    pending.current = [];
    scheduled.current.clear();
    active.current = 0;
    setRevision(n => n + 1);
    setReload(n => n + 1);
  }, []);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current += 1; }; }, []);
  const pump = useCallback(() => {
    while (active.current < 2 && pending.current.length > 0) {
      const spec = pending.current.shift()!;
      const key = monthCacheKey(spec.year, spec.index, spec.stage);
      const gen = generation.current;
      active.current += 1;
      void fetchExpenseDashboardCard({
        token, prptype, yearno: fyYearNo(spec.year), monthno: fyMonths(spec.year)[spec.index].month,
        date: spec.date,
      }).then(data => {
        // Never accept a wrong-year result, even if a stale server connection
        // or historical FY database mapping returns HTTP 200.
        const monthDate = fyMonths(spec.year)[spec.index];
        const expectedStart = Number(`${monthDate.year}${pad(monthDate.month)}01`);
        const actualStart = Number(data?.period?.month_start_ymd || 0);
        if (actualStart !== expectedStart || Number(data?.period?.yearno) !== fyYearNo(spec.year)) {
          throw new Error('Historical month does not match the selected financial year.');
        }
        if (mounted.current && gen === generation.current) {
          store.current[key] = { status: 'ready', data };
          setRevision(n => n + 1);
        }
      }).catch(error => {
        if (mounted.current && gen === generation.current) {
          store.current[key] = { status: 'error', reason: error instanceof Error ? error.message : 'Could not load this month' };
          setRevision(n => n + 1);
        }
      }).finally(() => {
        if (gen !== generation.current || !mounted.current) return;
        active.current -= 1;
        setBusy(active.current > 0 || pending.current.length > 0);
        pumpRef.current();
      });
    }
  }, [token, prptype]);
  pumpRef.current = pump;

  const enqueue = useCallback((yearValue: number, index: number, stage = false) => {
    const key = monthCacheKey(yearValue, index, stage);
    if (scheduled.current.has(key)) return;
    scheduled.current.add(key);
    const date = stage ? stageDate(yearValue, index, stageDay) : fyMonthEnd(yearValue, index);
    store.current[key] = { status: 'loading' };
    pending.current.push({ year: yearValue, index, stage, date });
    setBusy(true);
    pumpRef.current();
  }, [stageDay]);

  // Load the current year first, then two like-for-like historical years.
  // Only months which have elapsed are requested initially (never the future).
  useEffect(() => {
    if (!token || view !== 'owner') return;
    const jobs: FetchSpec[] = [];
    years.forEach(y => {
      for (let i=0; i<=stageIdx; i++) {
        const stage = i === stageIdx;
        jobs.push({ year: y, index: i, stage, date: '' });
      }
    });
    jobs.forEach(j => enqueue(j.year, j.index, j.stage));
  }, [token, view, years, stageIdx, enqueue, reload]);
  // Selecting a completed year loads all its months, including the whole
  // comparison-stage month. Current FY never requests a future month.
  useEffect(() => {
    if (!token || view !== 'owner' || year === currentFY) return;
    for (let i=0; i<12; i++) enqueue(year, i, false);
  }, [token, view, year, currentFY, enqueue, reload]);

  const getMonth = useCallback((y: number, i: number, stageComparison: boolean): CostMonth => {
    const stage = stageComparison && i === stageIdx;
    const k = monthCacheKey(y, i, stage);
    return fromMonth(y, i, store.current[k]);
  }, [revision, stageIdx]);
  const isCurrent = year === currentFY;
  const visibleIndexes = isCurrent ? stageIdx + 1 : 12;
  const selectedMonths = useMemo(() => Array.from({ length: visibleIndexes }, (_, i) => getMonth(year, i, isCurrent)), [getMonth, year, visibleIndexes, isCurrent]);
  const selectedStats = useMemo(() => summarizeYear(year, selectedMonths), [year, selectedMonths]);
  const stageStats = useMemo(() => years.map(y => summarizeYear(y, Array.from({length:stageIdx+1},(_,i)=>getMonth(y,i,true)))), [years, stageIdx, getMonth]);
  const requestedCount = visibleIndexes;
  const baseline = stageStats[years.indexOf(year)+1] || null;
  // FY comparisons always use the same elapsed months; never compare
  // a full historical year with a seven-month historical year.
  const compareFocus = stageStats[years.indexOf(year)];
  const comparePrevious = baseline;
  const compareReady = compareFocus.verified && (comparePrevious?.verified ?? false);
  const change = compareReady ? deltaPct(compareFocus.total, comparePrevious!.total) : null;
  const compareGap = compareReady ? compareFocus.total - comparePrevious!.total : null;
  const monthList = fyMonths(year);
  const title = yearLabel(year);
  const totalShow = selectedStats.ready > 0 ? selectedStats.total : null;
  const selectedMonthData = month == null ? null : selectedMonths[month];
  const scopedMonths = month == null ? selectedMonths : selectedMonths.filter(m => m.index === month);

  const heads = useMemo(() => HEADS.map(item => ({ ...item, amount: scopedMonths.reduce((sum, m) => sum + (m.available && m.amount !== null ? m.heads[item.key] : 0), 0) })), [scopedMonths]);
  const sectionLines = useMemo<SectionLine[]>(() => {
    if (!head) return [];
    return scopedMonths.flatMap(m => (monthSectionRows(m, head) || []).map(line => ({...line, month: m})));
  }, [scopedMonths, head]);
  const groupedSections = useMemo(() => {
    const byName: Record<string, {amount: number; entries: number}> = {};
    sectionLines.forEach(l => {
      if (!byName[l.name]) byName[l.name] = {amount:0, entries:0};
      byName[l.name].amount += l.amount; byName[l.name].entries++;
    });
    return Object.entries(byName).map(([name, v]) => ({name, ...v})).sort((a,b) => b.amount-a.amount);
  }, [sectionLines]);
  const sectionReconciled = head != null && scopedMonths
    .filter(m => m.available && m.amount !== null && Math.abs(m.heads[head]) > .005)
    .every(m => monthSectionRows(m, head) !== null);
  const focusSections = sectionLines.filter(line => line.name === section);
  const selectedDates = focusSections.flatMap(line => line.days.map(day => ({ ...day, month: line.month }))).sort((a,b) => b.date-a.date);

  const chartRows = useMemo(() => years.map(y => {
    const series: Array<number|null> = [];
    let running = 0;
    let continuous = true;
    for (let i=0; i<12; i++) {
      if (y === currentFY && i>stageIdx) { series.push(null); continue; }
      const m = getMonth(y,i,y === currentFY || y !== year);
      if (m.amount === null || !m.available || !continuous) { continuous = false; series.push(null); continue; }
      running += m.amount;
      series.push(running);
    }
    return series;
  }), [years, currentFY, stageIdx, year, getMonth]);
  const monthlyBars = useMemo(() => years.map(y => Array.from({length:12},(_,i) => y === currentFY && i>stageIdx ? null : getMonth(y,i,y === currentFY || y !== year).amount)), [years, currentFY, stageIdx, year, getMonth]);
  const pointData = years.map((y, i) => ({ year:y, cost:monthlyBars[i][hover], cumulative:chartRows[i][hover] }));

  const pickYear = (y: number) => {setYear(y);setMonth(null);setHead(null);setSection(null);setDetail(false);setExpandedTile(null);};
  const pickMonth = (i: number) => { setHover(i); setMonth(i); setHead(null); setSection(null); setDetail(false); };
  const openBreakdown = (i?: number) => { if (i !== undefined) setMonth(i); setDetail(true); setHead(null); setSection(null); };
  const back = () => {
    if (detail && section) {setSection(null);return;}
    if (detail && head) {setHead(null);return;}
    if (detail) {setDetail(false);return;}
    if (month != null) {setMonth(null);return;}
    router.back();
  };
  const sectionTotal = groupedSections.reduce((a,b)=>a+b.amount,0);
  const headTotal = heads.find(h=>h.key===head)?.amount ?? 0;
  const missingSplit = !sectionReconciled || Math.abs(sectionTotal-headTotal)>1;
  const chartHovered = hover;
  const columns = width > 680 ? 4 : 2;

  // The Production Cost card is an Owner-only expense report. Avoid requests
  // when My View's route or a bookmarked URL attempts to open this screen.
  if (Platform.OS === 'web' && !pathname.replace(/\/$/,'').endsWith('/reports/financial-year')) return null;
  if (view !== 'owner') return <View style={s.access}><Text style={s.accessText}>Production Cost FY is available in Owner View only.</Text><Pressable onPress={() => router.back()}><Text style={s.link}>‹ Back</Text></Pressable></View>;
  if (!token) return <View style={s.access}><Text style={s.accessText}>Please sign in to view Production Cost.</Text></View>;

  return (
    <View style={[s.root, Platform.OS === 'web' ? s.webOverlay as any : undefined]}>
      <View style={s.header}>
        <Pressable onPress={back} style={s.back} accessibilityLabel="Back"><Text style={s.backText}>‹</Text></Pressable>
        <View style={{flex:1,minWidth:0}}><Text style={s.headerTitle}>⚡ Production Cost</Text>
          <Text style={s.headerSub}>{title} · Apr {year}–Mar {year+1}{isCurrent ? ` · through ${today}` : ''}</Text></View>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close FY report" style={s.close}><Text style={s.backText}>×</Text></Pressable>
      </View>
      <ScrollView style={s.scroller} contentContainerStyle={s.scrollContent}>
        <View style={s.frame}>
          <View style={s.toolbar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
              {years.map(y => <Pressable key={y} onPress={()=>pickYear(y)} style={[s.chip, y===year && s.chipSelected]}>
                <Text style={[s.chipText, y===year && s.chipSelectedText]}>{yearLabel(y)}{y===currentFY?' · current':''}</Text>
              </Pressable>)}
            </ScrollView>
            <AmountDisplayModeControl compact mode={amountMode} onChange={setAmountMode}/>
          </View>
          {detail ? (
            <>
              <View style={s.detailCard}>
                <View style={s.detailHead}>
                  <Pressable onPress={()=>{setHead(null);setSection(null);setDetail(false)}}><Text style={s.detailCrumb}>{title}</Text></Pressable>
                  {month!=null && <Text style={s.detailCrumb}>› {selectedMonthData?.label}</Text>}
                  {head && <Pressable onPress={()=>setSection(null)}><Text style={s.detailCrumb}>› {HEADS.find(h=>h.key===head)?.label}</Text></Pressable>}
                  {section && <Text style={s.detailCrumb}>› {section}</Text>}
                </View>
                <View style={s.detailBody}>
                  <View style={s.summaryRow}><Text style={s.eyebrow}>{section ? section.toUpperCase() : head ? HEADS.find(h=>h.key===head)?.label.toUpperCase() : 'EXPENSE HEADS'}</Text>
                    <Text style={s.detailTotal}>{currency(section ? focusSections.reduce((a,b)=>a+b.amount,0) : head ? headTotal : scopedMonths.reduce((a,m)=>a+num(m.amount),0), amountMode)}</Text></View>
                  {month===null && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.monthRow}>
                    {monthList.slice(0,visibleIndexes).map(m=><Pressable key={m.index} style={s.miniChip} onPress={()=>{setMonth(m.index);setHead(null);setSection(null)}}><Text style={s.miniChipText}>{m.label}</Text></Pressable>)}
                  </ScrollView>}
                  {section ? (
                    <>
                      <Text style={s.note}>{section.includes('historical')?'This period uses the historical Rapier/Waterjet allocation.':'Daily entries from the existing expense costing report.'}</Text>
                      {selectedDates.length ? selectedDates.map((d,i) => <View key={`${d.date}-${i}`} style={s.lineRow}>
                        <View style={{flex:1}}><Text style={s.lineName}>{ymdLabel(d.date)}</Text><Text style={s.small}>{d.month.label} · {d.month.year}</Text></View>
                        <Text style={s.value}>{currency(d.amount,amountMode)}</Text>
                      </View>) : <Text style={s.note}>A reconciled daily section breakdown is not available for this period. Monthly amounts above remain unchanged.</Text>}
                      <Pressable style={s.action} onPress={()=>setSection(null)}><Text style={s.link}>‹ Back to sections</Text></Pressable>
                    </>
                  ) : head ? (
                    <>
                      {missingSplit && <Text style={s.warning}>Section-wise figures are not fully reconciled for this period. Use the verified expense-head total above.</Text>}
                      {groupedSections.map((r,i)=><Pressable key={r.name} onPress={()=>setSection(r.name)} style={s.lineRow}>
                        <Text style={s.rank}>{i+1}</Text><View style={{flex:1}}><Text style={s.lineName}>{r.name}</Text><Text style={s.small}>{r.entries} month{r.entries===1?'':'s'}</Text></View>
                        <Text style={s.value}>{currency(r.amount,amountMode)} ›</Text>
                      </Pressable>)}
                      {groupedSections.length===0 && <Text style={s.note}>The monthly report does not provide a reliable Section A/B or legacy division split for this expense head.</Text>}
                      <Pressable style={s.action} onPress={()=>setHead(null)}><Text style={s.link}>‹ All expense heads</Text></Pressable>
                    </>
                  ) : (
                    <>
                      {heads.map((h,i)=><Pressable key={h.key} style={s.lineRow} onPress={()=>{setHead(h.key);setSection(null)}}>
                        <Text style={s.rank}>{i+1}</Text><View style={{flex:1}}><Text style={s.lineName}>{h.label}</Text>
                          <View style={[s.track,{maxWidth:240}]}><View style={{width:`${Math.min(100, selectedStats.total>0?h.amount/selectedStats.total*100:0)}%`,height:5,backgroundColor:h.color,borderRadius:3}}/></View>
                        </View><Text style={s.value}>{currency(h.amount, amountMode)} ›</Text>
                      </Pressable>)}
                      <View style={s.sumRow}><Text style={s.sumLabel}>Total · {scopedMonths.filter(m=>m.available).length} months with data</Text><Text style={s.value}>{currency(heads.reduce((a,b)=>a+b.amount,0),amountMode)}</Text></View>
                      {scopedMonths.some(m=>!m.available || !m.complete) && <Text style={s.warning}>Some months are missing or incomplete. The displayed sum covers available values only.</Text>}
                    </>
                  )}
                </View>
              </View>
              <Pressable style={s.return} onPress={()=>{setDetail(false);setHead(null);setSection(null)}}><Text style={s.link}>‹ Back to FY overview</Text></Pressable>
            </>
          ) : (
            <>
              <View style={s.hero}>
                <View style={s.heroTop}>
                  <View style={{flex:1,minWidth:210}}><Text style={s.eyebrow}>COST · {title} · {isCurrent?'TO DATE':'FULL YEAR'}</Text>
                    <Text style={s.heroAmount}>{currency(totalShow,amountMode)}</Text>
                    <Text style={s.heroHint}>{selectedStats.verified ? (isCurrent ? 'All elapsed months available' : 'Complete FY data') : `${selectedStats.ready} of ${requestedCount} months with figures${selectedStats.pending ? ` · ${selectedStats.pending} loading` : ''}`}</Text>
                    {change!=null && <Text style={[s.delta,{color:change<=0?C.green:C.red}]}>{change>=0?'▲':'▼'} {Math.abs(change).toFixed(1)}% cost vs {yearLabel(year-1)} · comparable months</Text>}
                  </View>
                  <View style={s.insights}>
                    {compareGap!=null && <Text style={s.insight}>{compareGap>=0?'Higher':'Lower'} than the previous FY by {currency(Math.abs(compareGap),amountMode)}{isCurrent?' at the comparable stage':''}</Text>}
                    <Text style={s.insight}>{selectedStats.bestMonth ? `Highest-cost month: ${selectedStats.bestMonth.label} · ${currency(selectedStats.bestMonth.amount,amountMode)}` : 'Monthly costs will appear as ERP data loads.'}</Text>
                    {selectedStats.partial+selectedStats.missing > 0 && <Text style={s.warning}>{selectedStats.missing} unavailable · {selectedStats.partial} incomplete month(s)</Text>}
                    {!selectedStats.pending && !selectedStats.verified && <Text style={s.small}>Totals cover available months and are not confirmed full-year figures.</Text>}
                  </View>
                </View>
                <View style={s.years}>
                  {years.slice().reverse().map((y)=>{
                    const row=stageStats[years.indexOf(y)]; const selected=y===year;
                    return <Pressable key={y} style={[s.yearCard,selected&&s.yearActive]} onPress={()=>pickYear(y)}>
                      <Text style={[s.yearName,selected&&s.yearActiveText]}>{yearLabel(y)}{y===currentFY?' · to date':''}</Text>
                      <Text style={[s.yearValue,selected&&s.yearActiveText]}>{row.ready?currency(row.total,amountMode):'—'}</Text>
                      <Text style={[s.small,selected&&s.yearActiveText]}>{row.pending?`${row.pending} loading · `:''}{row.ready}/{stageIdx+1} months · comparable</Text>
                      {y !== currentFY && <Text style={[s.small,selected&&s.yearActiveText]}>
                        {y === year && selectedStats.ready > stageIdx+1
                          ? `${selectedStats.verified ? 'Full FY' : 'Available total'}: ${currency(selectedStats.total,amountMode)} · ${selectedStats.ready}/12 months`
                          : 'Tap for full FY'}
                      </Text>}
                    </Pressable>;
                  })}
                </View>
              </View>
              {busy && <View style={s.loadStrip}><ActivityIndicator size="small" color={C.copper}/><Text style={s.small}>Loading historical production-cost records…</Text></View>}
              <View style={s.tiles}>
                {[
                  {key:'avg',label:'MONTHLY AVERAGE',value:currency(selectedStats.monthlyAverage,amountMode),note:`${selectedStats.ready} recorded months`},
                  {key:'best',label:'HIGHEST MONTH',value:currency(selectedStats.bestMonth?.amount,amountMode),note:selectedStats.bestMonth?.label||'—'},
                  {key:'pick',label:'COST / PICK',value:rate(selectedStats.costPerPick,3),note:'Annual cost ÷ weighted picks'},
                  {key:'metre',label:'COST / METRE',value:rate(selectedStats.costPerMetre,2),note:'Annual cost ÷ metres'},
                  {key:'prod',label:'PRODUCTION',value:metres(selectedStats.metres),note:'Expense report production'},
                  {key:'mcday',label:'COST / MC·DAY',value:rate(selectedStats.costPerMcDay,2),note:'Annual cost ÷ machine-days'},
                ].map(tile=><Pressable key={tile.key} style={[s.tile,{width:columns===4?'32.2%':'48.5%'}]} onPress={()=>setExpandedTile(expandedTile===tile.key?null:tile.key)}>
                  <Text style={s.tileLabel}>{tile.label} <Text style={{color:C.faint}}>⌄</Text></Text>
                  <Text style={s.tileValue} numberOfLines={1} adjustsFontSizeToFit>{tile.value}</Text>
                  <Text style={s.small}>{tile.note}</Text>
                  {expandedTile===tile.key && <Text style={s.tileExtra}>{tile.key==='pick'||tile.key==='metre'?'Rates are calculated from annual totals, not averaged across months.':`Based on ${selectedStats.ready} months with actual expense records.`}</Text>}
                </Pressable>)}
              </View>
              <View style={s.sectionHead}><Text style={s.sectionLabel}>CUMULATIVE · THE CHASE</Text><Text style={s.small}>Hover or tap a month</Text></View>
              <View style={s.chartCard}>
                <FyGraph chart="line" labels={monthList.map(m=>m.label)} data={chartRows} hovered={chartHovered} onPick={setHover}/>
                <View style={s.legend}>{years.map((y,i)=><View key={y} style={s.legendItem}><View style={[s.legendDot,{backgroundColor:selectedColors[i]}]}/><Text style={s.small}>{yearLabel(y)}</Text></View>)}</View>
                <View style={s.hoverBox}><Text style={s.hoverTitle}>{monthList[hover].label} · cumulative</Text>
                  {pointData.map(item=><Text key={item.year} style={s.hoverRow}>{yearLabel(item.year)}  {currency(item.cumulative,amountMode)}</Text>)}
                </View>
              </View>
              <View style={s.sectionHead}><Text style={s.sectionLabel}>MONTH BY MONTH · THREE YEARS</Text><Text style={s.small}>Tap a bar or month to open</Text></View>
              <View style={s.chartCard}>
                <FyGraph chart="bar" labels={monthList.map(m=>m.label)} data={monthlyBars} hovered={hover} onPick={setHover}/>
                <View style={s.hoverBox}><Text style={s.hoverTitle}>{monthList[hover].label} · monthly cost</Text>
                  {pointData.map(item=><Text key={item.year} style={s.hoverRow}>{yearLabel(item.year)}  {currency(item.cost,amountMode)}</Text>)}
                  {hover<visibleIndexes && <Pressable onPress={()=>pickMonth(hover)}><Text style={s.link}>Open {monthList[hover].label} breakdown ›</Text></Pressable>}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.monthRow}>
                  {monthList.slice(0,visibleIndexes).map(m=><Pressable key={m.index} style={[s.miniChip,month===m.index&&s.miniActive]} onPress={()=>pickMonth(m.index)}><Text style={[s.miniChipText,month===m.index&&s.miniActiveText]}>{m.label}</Text></Pressable>)}
                </ScrollView>
                {selectedMonthData && <View style={s.monthPanel}>
                  <View style={s.summaryRow}><Text style={s.lineName}>{selectedMonthData.label} {selectedMonthData.year}</Text><Text style={s.value}>{currency(selectedMonthData.amount,amountMode)}</Text></View>
                  <Text style={s.small}>{selectedMonthData.reason || (selectedMonthData.complete?'Expense data complete':'Month is incomplete · available figures only')}</Text>
                  {HEADS.map(h=><View key={h.key} style={s.inlineHead}><Text style={s.small}>{h.label}</Text><Text style={s.small}>{selectedMonthData.available?currency(selectedMonthData.heads[h.key],amountMode):'—'}</Text></View>)}
                  <Pressable onPress={()=>openBreakdown(month!)} style={s.action}><Text style={s.link}>Full month breakdown ›</Text></Pressable>
                </View>}
              </View>
              <View style={s.sectionHead}><Text style={s.sectionLabel}>COST BREAKDOWN · {title}</Text><Text style={s.small}>Expense heads</Text></View>
              <View style={s.listCard}>
                {selectedStats.ready===0 && <Text style={s.note}>No ERP expense records available for this financial year yet.</Text>}
                {selectedStats.ready>0 && heads.map((h,i)=><Pressable key={h.key} style={s.lineRow} onPress={()=>{setDetail(true);setHead(h.key);setSection(null)}}>
                  <Text style={s.rank}>{i+1}</Text><View style={{flex:1}}><Text style={s.lineName}>{h.label}</Text><View style={s.track}><View style={{width:`${selectedStats.total>0?Math.min(100,h.amount/selectedStats.total*100):0}%`,height:5,backgroundColor:h.color,borderRadius:3}} /></View></View>
                  <Text style={s.value}>{currency(h.amount,amountMode)} ›</Text>
                </Pressable>)}
                <Pressable onPress={()=>openBreakdown()} style={s.action}><Text style={s.link}>Full breakdown · Heads / Sections / Entries ›</Text></Pressable>
              </View>
            </>
          )}
          <View style={s.footer}>
            <Text style={s.small}>Production cost comes from the same monthly Expense report as the Owner dashboard. Months without valid expense data are not treated as zero. Before October 2026, the legacy Rapier/Waterjet costing is retained; Section A/B starts in October 2026.</Text>
            <Pressable onPress={reset} style={s.refresh}><Text style={s.link}>↻ Refresh FY data</Text></Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg}, webOverlay:{position:'fixed' as any,top:0,left:0,right:0,bottom:0,zIndex:9999},
  header:{backgroundColor:C.navy,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',gap:10,alignItems:'center'},
  back:{width:34,height:34,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#ffffff55',borderRadius:8},
  backText:{fontSize:24,color:'#fff',lineHeight:27}, headerTitle:{fontSize:15,fontWeight:'800',color:'#fff'},headerSub:{fontSize:10,color:'#ffffffbf',marginTop:3},close:{padding:6},
  scroller:{flex:1},scrollContent:{paddingHorizontal:12,paddingBottom:44,paddingTop:12},frame:{width:'100%',maxWidth:860,alignSelf:'center'},
  toolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:10},chipRow:{gap:7},
  chip:{borderWidth:1,borderColor:C.border,backgroundColor:'#fff',borderRadius:8,paddingHorizontal:10,paddingVertical:7},
  chipSelected:{backgroundColor:C.copper,borderColor:C.copper},chipText:{fontSize:11,fontWeight:'700',color:C.ink},chipSelectedText:{color:'#fff'},
  hero:{backgroundColor:'#fff',padding:14,borderRadius:12,borderWidth:1,borderColor:C.border,borderLeftWidth:3,borderLeftColor:C.copper,marginBottom:10},
  heroTop:{flexDirection:'row',gap:12,flexWrap:'wrap'},eyebrow:{fontSize:10,fontWeight:'800',color:C.muted,letterSpacing:.8},
  heroAmount:{fontSize:29,fontWeight:'800',color:C.ink,marginTop:5},heroHint:{fontSize:10,color:C.muted,marginTop:5},delta:{fontSize:11,fontWeight:'700',marginTop:7},
  insights:{flex:1,minWidth:190,padding:10,backgroundColor:C.bg,borderRadius:9,gap:5},insight:{fontSize:11,color:C.ink,lineHeight:16},warning:{fontSize:10,color:'#AE6021',lineHeight:16,marginTop:6},
  years:{flexDirection:'row',gap:6,marginTop:12},yearCard:{flex:1,minWidth:0,padding:9,borderRadius:9,backgroundColor:C.bg,borderWidth:1,borderColor:C.border},yearActive:{backgroundColor:C.copper,borderColor:C.copper},
  yearName:{fontSize:9,color:C.ink,fontWeight:'800'},yearActiveText:{color:'#fff'},yearValue:{fontSize:15,color:C.ink,fontWeight:'800',marginVertical:4},
  loadStrip:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:7},small:{fontSize:10,color:C.muted,lineHeight:15},
  tiles:{flexDirection:'row',gap:8,flexWrap:'wrap',justifyContent:'space-between'},tile:{backgroundColor:'#fff',borderRadius:10,borderColor:C.border,borderWidth:1,padding:10,minHeight:91},
  tileLabel:{fontSize:9,color:C.muted,fontWeight:'800'},tileValue:{fontSize:18,color:C.ink,fontWeight:'800',marginTop:5,marginBottom:3},tileExtra:{fontSize:10,color:C.muted,marginTop:9,borderTopColor:C.border,borderTopWidth:1,paddingTop:8},
  sectionHead:{marginTop:16,marginBottom:7,flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',gap:8},sectionLabel:{fontSize:10,fontWeight:'800',color:C.muted,letterSpacing:.8},
  chartCard:{backgroundColor:'#fff',borderRadius:11,borderWidth:1,borderColor:C.border,paddingHorizontal:8,paddingVertical:10,marginBottom:9},axisLabel:{fontSize:10,color:C.muted,minWidth:18,textAlign:'center'},
  legend:{flexDirection:'row',gap:15,paddingHorizontal:9,paddingTop:5,flexWrap:'wrap'},legendItem:{flexDirection:'row',gap:5,alignItems:'center'},legendDot:{width:11,height:3,borderRadius:2},
  hoverBox:{marginTop:10,marginHorizontal:5,backgroundColor:C.bg,borderRadius:8,padding:10,gap:4},hoverTitle:{fontSize:11,fontWeight:'800',color:C.ink},hoverRow:{fontSize:10,color:C.muted},
  monthRow:{gap:6,paddingTop:10,paddingBottom:6},miniChip:{backgroundColor:'#fff',borderWidth:1,borderColor:C.border,borderRadius:8,paddingVertical:6,paddingHorizontal:9},
  miniActive:{backgroundColor:C.copper,borderColor:C.copper},miniChipText:{fontSize:10,fontWeight:'700',color:C.ink},miniActiveText:{color:'#fff'},
  monthPanel:{marginTop:8,borderTopWidth:1,borderTopColor:C.border,paddingTop:10,paddingHorizontal:4},summaryRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
  inlineHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:6},lineName:{fontSize:12,color:C.ink,fontWeight:'700'},value:{fontSize:12,color:C.ink,fontWeight:'800'},
  action:{paddingVertical:12},link:{fontSize:11,color:'#187A62',fontWeight:'800'},
  listCard:{backgroundColor:'#fff',borderWidth:1,borderColor:C.border,borderRadius:11,paddingHorizontal:12},lineRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:11,borderBottomColor:C.border,borderBottomWidth:1},rank:{fontSize:11,color:C.muted,width:15},
  track:{height:5,backgroundColor:C.pale,marginTop:5,borderRadius:3,maxWidth:260},
  detailCard:{backgroundColor:'#fff',borderRadius:12,overflow:'hidden',borderColor:C.border,borderWidth:1},detailHead:{backgroundColor:C.copper,padding:12,flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'},detailCrumb:{fontSize:11,fontWeight:'800',color:'#fff'},
  detailBody:{padding:12},detailTotal:{fontSize:16,fontWeight:'800',color:C.ink},note:{fontSize:10,color:C.muted,lineHeight:16,marginVertical:8},sumRow:{paddingVertical:12,flexDirection:'row',justifyContent:'space-between'},sumLabel:{fontSize:11,fontWeight:'700',color:C.muted},return:{padding:12},
  footer:{padding:10,marginTop:10},refresh:{alignSelf:'center',padding:9},access:{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center',padding:20},accessText:{fontSize:14,color:C.ink,fontWeight:'700',textAlign:'center'},
});
