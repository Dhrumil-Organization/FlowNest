// FILE: src/components/RollCutAnalysis/index.tsx
// NEW ERP — Roll Cut Analysis
//
//   One taka:  STICKER printed (beam)  →  ROLL CUT scanned  →  CHECKING entry
//   The report shows where every taka is and the TIME FROM ROLL CUT TO CHECKING.
//
//   Filters : Date on (Roll cut / Checking / Sticker) · From · To · Beam (optional) · quick ranges
//             NO property selection — the report is for the login's property GROUP (prptype),
//             i.e. every property of that group (backend: get_prp_from_prp_grp).
//   General : KPI tiles + "roll cut → checking" time buckets (tap a bucket = those takas)
//   Specific: Beams (tap a beam = its takas) · Takas (search + status chips) · Day-wise
//   Detail  : every taka with its 3 steps, times and the gap / waiting time
//
// Phone: one column.  Tablet / web: KPIs in 3–6 columns, Beams and Takas side by side (≥ 1100 px).
// Same building blocks and look as the Roll Cut Scanner (DateField, cards, chips).
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useBusinessContext } from '@/src/core/business';
import { errMsg, fmtShowDate } from '../RollCutScanner/api';
import DateField from '../RollCutScanner/DateField';
import SelectField from '../RollCutScanner/SelectField';
import { bucketOf, createRollCutAnalysisApi, isCancel, type Basis, type BeamRow, type Report, type TakaRow } from './api';

type Props = { token: string; API: string };
type Tab = 'beams' | 'takas' | 'days';
type StatusFilter = 'all' | 'waiting_checking' | 'checked' | 'not_cut' | 'checked_no_cut' | 'late';

const PAGE = 40;
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
type Quick = 'today' | 'yday' | 'd7' | 'month';
const QUICK: [Quick, string][] = [['today', 'Today'], ['yday', 'Yesterday'], ['d7', 'Last 7 days'], ['month', 'This month']];
const quickRange = (k: Quick): [Date, Date] => {
  const t = startOfDay(new Date());
  if (k === 'today') return [t, t];
  if (k === 'yday') return [addDays(t, -1), addDays(t, -1)];
  if (k === 'd7') return [addDays(t, -6), t];
  return [new Date(t.getFullYear(), t.getMonth(), 1), t];
};
const AUTO_DELAY = 350; // ms — several quick taps / date changes → one request
const fmtN = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN'));
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const showDT = (s: string | null) => {
  if (!s) return '—';
  const [d, t] = s.split(' ');
  const [y, m, dd] = (d || '').split('-').map(Number);
  if (!y) return s;
  return `${fmtShowDate(new Date(y, m - 1, dd))}${t ? ' · ' + t : ''}`;
};
const gapColor = (min: number | null) => (min === null ? T.muted : min < 0 ? T.purple : min <= 240 ? T.green : min <= 1440 ? T.amber : T.red);

const BASIS: { k: Basis; label: string; hint: string }[] = [
  { k: 'rollcut', label: 'Roll cut date', hint: 'Takas roll-cut in the range (shows which are still waiting for checking)' },
  { k: 'checking', label: 'Checking date', hint: 'Takas checked in the range (shows how long they took after roll cut)' },
  { k: 'sticker', label: 'Sticker date', hint: 'Takas whose sticker was printed in the range (shows not-cut takas too)' },
];
const STATUS: { k: StatusFilter; label: string; color: string }[] = [
  { k: 'all', label: 'All', color: T.nav },
  { k: 'waiting_checking', label: 'Waiting checking', color: T.amber },
  { k: 'late', label: 'Over 24 hrs', color: T.red },
  { k: 'checked', label: 'Checked', color: T.green },
  { k: 'not_cut', label: 'Not cut', color: T.muted },
  { k: 'checked_no_cut', label: 'Checked without roll cut', color: T.purple },
];
const STAGE_LABEL: Record<string, { t: string; c: string }> = {
  checked: { t: 'CHECKED', c: T.green },
  waiting_checking: { t: 'WAITING CHECKING', c: T.amber },
  not_cut: { t: 'NOT CUT', c: T.muted },
  checked_no_cut: { t: 'CHECKED · NO ROLL CUT', c: T.purple },
};

export default function RollCutAnalysis({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 1100;
  const kpiCols = width >= 1100 ? 6 : width >= 700 ? 3 : 2;
  const api = useMemo(() => createRollCutAnalysisApi(API, token), [API, token]);

  /* filters */
  const [basis, setBasis] = useState<Basis>('rollcut');
  const [fromDate, setFromDate] = useState(addDays(startOfDay(new Date()), -6));
  const [toDate, setToDate] = useState(startOfDay(new Date()));
  const [beam, setBeam] = useState('');           // '' = All beams
  const [beamList, setBeamList] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  // property GROUP of the login (prptype) — same source as the other NEW ERP screens
  const { prpGroup } = useBusinessContext();
  const [storedType, setStoredType] = useState<string | null>(null);
  useEffect(() => {
    if (prpGroup) return;
    let alive = true;
    AsyncStorage.getItem('user_prptype')
      .then((v: string | null) => alive && setStoredType(String(v || '').trim()))
      .catch(() => alive && setStoredType(''));
    return () => { alive = false; };
  }, [prpGroup]);
  const prptype = String(prpGroup || storedType || '').trim();
  const prptypeMissing = (!!prpGroup || storedType !== null) && !prptype;

  /* data */
  const [rep, setRep] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* view */
  const [tab, setTab] = useState<Tab>('beams');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [bucket, setBucket] = useState<string | null>(null);
  const [beamPick, setBeamPick] = useState<string | null>(null);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(PAGE);

  const changeFrom = (d: Date) => { const x = startOfDay(d); setFromDate(x); if (x > toDate) setToDate(x); };
  const changeTo = (d: Date) => { const x = startOfDay(d); setToDate(x); if (x < fromDate) setFromDate(x); };
  const quick = (k: Quick) => { const [f, t] = quickRange(k); setFromDate(f); setToDate(t); };
  const fromKey = dayKey(fromDate);
  const toKey = dayKey(toDate);
  const activeQuick = QUICK.find(([k]) => { const [f, t] = quickRange(k); return dayKey(f) === fromKey && dayKey(t) === toKey; })?.[0] ?? null;
  const days = Math.round((startOfDay(toDate).getTime() - startOfDay(fromDate).getTime()) / 86400000) + 1;

  /* auto-load: every filter change (basis, from, to, quick range, beam) → one fresh request.
     Only the newest request may update the screen; older ones are cancelled / ignored. */
  const reqSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const seq = ++reqSeq.current;
    abortRef.current?.abort();
    if (!prptype) { setLoading(false); setRep(null); setError('Property group (prptype) not found for this login — please re-login.'); return; }
    if (days > 92) { setLoading(false); setRep(null); setError(`Please select at most 92 days (selected ${days}).`); return; }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError('');
    setLoading(true);
    try {
      const r = await api.report({ prpcode: '', prptype, from: fromDate, to: toDate, basis, beamno: beam }, ctrl.signal);
      if (seq !== reqSeq.current) return;           // a newer selection is already loading
      setRep(r);
      setLoadedAt(new Date());
      setBeamList((prev) => (Array.isArray(r.beam_list) ? r.beam_list : beam === '' ? r.beams.map((b) => b.beamno).filter(Boolean) : prev));
      // keep the user's view (tab, search, status); drop a beam pick that is not in the new data
      setBeamPick((p) => (p && r.beams.some((b) => b.beamno === p) ? p : null));
    } catch (e: any) {
      if (seq !== reqSeq.current || isCancel(e)) return;
      setRep(null);
      setError(errMsg(e, 'Could not load the report.'));
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, prptype, fromKey, toKey, basis, beam, days]);

  useEffect(() => {
    if (!prptype && !prptypeMissing) return;        // login's prptype still resolving
    setLoading(true);
    const t = setTimeout(() => { void load(); }, AUTO_DELAY);
    return () => clearTimeout(t);
  }, [load, prptype, prptypeMissing]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const beamOptions = useMemo(
    () => [{ label: 'All beams', value: '' }, ...beamList.map((b) => ({ label: b, value: b }))],
    [beamList],
  );

  /* search debounce + paging */
  useEffect(() => { const t = setTimeout(() => setQ(qInput.trim().toLowerCase()), 250); return () => clearTimeout(t); }, [qInput]);

  const takas = useMemo(() => {
    if (!rep) return [] as TakaRow[];
    const words = q.split(/\s+/).filter(Boolean);
    return rep.takas.filter((r) => {
      if (beamPick && r.beamno !== beamPick) return false;
      if (bucket && bucketOf(r.gap_min) !== bucket) return false;
      if (status === 'late') { const m = r.gap_min ?? r.wait_min; if (!(m !== null && m > 1440)) return false; }
      else if (status !== 'all' && r.stage !== status) return false;
      if (!words.length) return true;
      const hay = `${r.takano} ${r.beamno} ${r.rollcut_at || ''} ${r.checking_at || ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [rep, q, status, bucket, beamPick]);
  useEffect(() => setVisible(PAGE), [takas]);

  const openTakas = (opts: { beam?: string | null; bucket?: string | null; status?: StatusFilter }) => {
    setBeamPick(opts.beam ?? null);
    setBucket(opts.bucket ?? null);
    setStatus(opts.status ?? 'all');
    setTab('takas');
  };

  /* ───────────── pieces ───────────── */
  const sm = rep?.summary;
  const filterCard = (
    <View style={st.card}>
      <TouchableOpacity activeOpacity={0.7} style={[st.filterHead, !filtersOpen && { marginBottom: 0 }]} onPress={() => setFiltersOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: filtersOpen }}>
        <Icon name="tune" size={17} color={T.copper} />
        <Text style={st.filterTitle}>Filters</Text>
        {!filtersOpen ? (
          <Text style={st.filterSummary} numberOfLines={1}>
            {BASIS.find((b) => b.k === basis)?.label} · {fmtShowDate(fromDate)} – {fmtShowDate(toDate)} · {beam ? `Beam ${beam}` : 'All beams'}
          </Text>
        ) : <View style={{ flex: 1 }} />}
        {loading ? (
          <View style={st.liveChip}><ActivityIndicator size="small" color={T.copper} /><Text style={st.liveText}>Updating</Text></View>
        ) : loadedAt && !error ? (
          <View style={[st.liveChip, { borderColor: T.green + '55' }]}><View style={st.liveDot} /><Text style={[st.liveText, { color: T.green }]}>Live</Text></View>
        ) : null}
        <Icon name={filtersOpen ? 'expand-less' : 'expand-more'} size={24} color={T.muted} />
      </TouchableOpacity>
      {filtersOpen ? (
        <>
          <View style={st.grid}>
            <SelectField label="Beam No" value={beam} options={beamOptions} onChange={(v) => setBeam(v)} icon="view-column"
              loading={loading && beamList.length === 0} placeholder="All beams" />
          </View>
          <Text style={[st.fieldLabel, { marginTop: 14 }]}>Date range is on</Text>
          <View style={st.segment}>
            {BASIS.map((b) => {
              const on = basis === b.k;
              return (
                <TouchableOpacity key={b.k} style={[st.seg, on && st.segOn]} onPress={() => { if (!on) setBasis(b.k); }} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[st.segText, on && st.segTextOn]} numberOfLines={1}>{b.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={st.hint}>{BASIS.find((b) => b.k === basis)?.hint}</Text>
          <View style={[st.grid, { marginTop: 12 }]}>
            <DateField label="From date" value={fromDate} onChange={changeFrom} />
            <DateField label="To date" value={toDate} onChange={changeTo} />
          </View>
          <View style={st.quickRow}>
            {QUICK.map(([k, l]) => {
              const on = activeQuick === k;
              return (
                <TouchableOpacity key={k} style={[st.quick, on && st.quickOn]} onPress={() => { if (!on) quick(k); }} activeOpacity={0.8}
                  accessibilityRole="button" accessibilityState={{ selected: on }}>
                  {on ? <Icon name="check" size={14} color="#fff" /> : null}
                  <Text style={[st.quickText, on && { color: '#fff' }]}>{l}</Text>
                </TouchableOpacity>
              );
            })}
            <Text style={st.daysText}>{days > 0 ? `${days} day${days > 1 ? 's' : ''}` : ''}</Text>
          </View>
        </>
      ) : null}
      {error ? (
        <View style={st.errBox}>
          <Icon name="error-outline" size={18} color={T.red} />
          <Text style={st.errText}>{error}</Text>
          {!prptypeMissing && days <= 92 ? (
            <TouchableOpacity onPress={() => void load()} style={st.retry} activeOpacity={0.8} accessibilityRole="button"><Icon name="refresh" size={16} color={T.red} /><Text style={st.retryText}>Retry</Text></TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {loading ? <ProgressBar /> : null}
    </View>
  );

  const kpis = sm ? (
    <View style={[st.kpiGrid]}>
      {[
        { l: 'Takas', v: fmtN(sm.takas), s: `${rep?.beams.length || 0} beams`, c: T.nav, on: () => openTakas({}) },
        { l: 'Roll cut done', v: fmtN(sm.rollcut_done), s: `${pct(sm.rollcut_done, sm.takas)}% · ${fmtN(sm.rollcut_pending)} not cut`, c: T.copper, on: () => openTakas({ status: 'not_cut' }) },
        { l: 'Checking done', v: fmtN(sm.checking_done), s: `${pct(sm.checking_done, sm.takas)}% of takas`, c: T.green, on: () => openTakas({ status: 'checked' }) },
        { l: 'Waiting checking', v: fmtN(sm.waiting_checking), s: 'roll-cut, not checked yet', c: T.amber, on: () => openTakas({ status: 'waiting_checking' }) },
        { l: 'Avg cut → checking', v: sm.avg_text || '—', s: sm.median_text ? `median ${sm.median_text}` : 'no checked takas', c: T.blue, on: undefined },
        { l: 'Checked within 24 hrs', v: sm.gap_count ? `${pct(sm.within_24h, sm.gap_count)}%` : '—', s: sm.max_text ? `slowest ${sm.max_text}` : '', c: T.purple, on: () => openTakas({ status: 'late' }) },
      ].map((k) => (
        <TouchableOpacity key={k.l} activeOpacity={k.on ? 0.8 : 1} onPress={k.on} disabled={!k.on}
          style={[st.kpi, { width: `${100 / kpiCols}%` as any }]} accessibilityRole={k.on ? 'button' : undefined}>
          <View style={[st.kpiIn, { borderTopColor: k.c }]}>
            <Text style={st.kpiLabel} numberOfLines={1}>{k.l.toUpperCase()}</Text>
            <Text style={st.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{k.v}</Text>
            {k.s ? <Text style={st.kpiSub} numberOfLines={1}>{k.s}</Text> : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  ) : null;

  const bucketCard = rep && sm ? (
    <View style={st.card}>
      <View style={st.secHead}>
        <Text style={st.secTitle}>Roll cut → Checking time</Text>
        <Text style={st.secMeta}>{fmtN(sm.gap_count)} checked takas</Text>
      </View>
      {rep.buckets.map((b) => {
        const max = Math.max(1, ...rep.buckets.map((x) => x.count));
        const col = b.key === 'h1' || b.key === 'h4' ? T.green : b.key === 'h12' || b.key === 'h24' ? T.amber : T.red;
        const on = bucket === b.key && tab === 'takas';
        return (
          <TouchableOpacity key={b.key} activeOpacity={0.8} style={[st.bRow, on && { backgroundColor: T.alt }]} onPress={() => openTakas({ bucket: b.key })} disabled={!b.count}>
            <Text style={st.bLabel}>{b.label}</Text>
            <View style={st.bTrack}><View style={[st.bFill, { width: `${Math.max(b.count ? 3 : 0, (b.count / max) * 100)}%` as any, backgroundColor: col }]} /></View>
            <Text style={st.bCount}>{fmtN(b.count)}</Text>
            <Text style={st.bPct}>{pct(b.count, sm.gap_count)}%</Text>
          </TouchableOpacity>
        );
      })}
      {sm.checked_before_cut ? (
        <TouchableOpacity onPress={() => openTakas({ status: 'checked_no_cut' })} style={st.note}>
          <Icon name="info-outline" size={15} color={T.purple} />
          <Text style={[st.noteText, { color: T.purple }]}>{fmtN(sm.checked_before_cut)} takas were checked before their roll cut time — check the scans.</Text>
        </TouchableOpacity>
      ) : null}
      {rep.truncated ? <Text style={st.err}>Only the first 30,000 takas are shown — choose a shorter range.</Text> : null}
      {rep.errors?.length ? <Text style={st.err}>{rep.errors.join(' | ')}</Text> : null}
    </View>
  ) : null;

  const tabsBar = rep ? (
    <View style={st.tabs}>
      {([['beams', 'Beams', 'view-column', rep.beams.length], ['takas', 'Takas', 'list-alt', takas.length], ['days', 'Day-wise', 'event-note', rep.daily.length]] as const).map(([k, l, ic, n]) => {
        const on = tab === k;
        return (
          <TouchableOpacity key={k} style={[st.tab, on && st.tabOn]} onPress={() => setTab(k)} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Icon name={ic} size={17} color={on ? '#fff' : T.nav} />
            <Text style={[st.tabText, on && { color: '#fff' }]}>{l}</Text>
            <View style={[st.tabBadge, on && { backgroundColor: '#ffffff33' }]}><Text style={[st.tabBadgeText, on && { color: '#fff' }]}>{n}</Text></View>
          </TouchableOpacity>
        );
      })}
    </View>
  ) : null;

  const beamsList = rep ? (
    <View>
      {rep.beams.length === 0 ? <Empty title="No beams" text="Nothing for these filters." /> : rep.beams.map((b) => <BeamCard key={b.beamno} b={b} onPress={() => openTakas({ beam: b.beamno })} />)}
    </View>
  ) : null;

  const takaHeader = (
    <View>
      <View style={st.searchBox}>
        <Icon name="search" size={19} color={qInput ? T.copper : T.muted} />
        <TextInput value={qInput} onChangeText={setQInput} placeholder="Search taka no, beam no, date…" placeholderTextColor={T.muted} style={st.searchInput} autoCapitalize="none" autoCorrect={false} />
        {qInput ? <TouchableOpacity onPress={() => setQInput('')}><Icon name="cancel" size={18} color={T.muted} /></TouchableOpacity> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {STATUS.map((s2) => {
          const on = status === s2.k;
          return (
            <TouchableOpacity key={s2.k} onPress={() => setStatus(s2.k)} style={[st.chip, on && { backgroundColor: s2.color, borderColor: s2.color }]} activeOpacity={0.8}>
              <Text style={[st.chipText, on && { color: '#fff' }]}>{s2.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {beamPick || bucket ? (
        <View style={st.activeRow}>
          {beamPick ? <Pill text={`Beam ${beamPick}`} onClear={() => setBeamPick(null)} /> : null}
          {bucket ? <Pill text={rep?.buckets.find((b) => b.key === bucket)?.label || bucket} onClear={() => setBucket(null)} /> : null}
        </View>
      ) : null}
    </View>
  );

  const takasList = rep ? (
    <View>
      {takaHeader}
      {takas.length === 0 ? <Empty title="No takas" text="Nothing matches these filters." /> : takas.slice(0, visible).map((r) => <TakaCard key={`${r.prpcode}_${r.takano}`} r={r} />)}
      {visible < takas.length ? (
        <TouchableOpacity style={st.more} onPress={() => setVisible((v) => v + PAGE)}>
          <Text style={st.moreText}>Show more · {fmtN(takas.length - visible)} left</Text>
        </TouchableOpacity>
      ) : takas.length ? <Text style={st.footerText}>Showing all {fmtN(takas.length)}</Text> : null}
    </View>
  ) : null;

  const daysList = rep ? (
    <View style={st.card}>
      <View style={st.dayHead}>
        <Text style={[st.dayH, { flex: 1.4 }]}>DATE</Text>
        <Text style={st.dayH}>ROLL CUT</Text>
        <Text style={st.dayH}>CHECKED</Text>
        <Text style={[st.dayH, { flex: 1.4, textAlign: 'right' }]}>AVG CUT → CHECK</Text>
      </View>
      {rep.daily.length === 0 ? <Text style={st.footerText}>No days.</Text> : rep.daily.map((d) => (
        <View key={d.date} style={st.dayRow}>
          <Text style={[st.dayV, { flex: 1.4 }]}>{showDT(d.date)}</Text>
          <Text style={st.dayV}>{fmtN(d.cut)}</Text>
          <Text style={st.dayV}>{fmtN(d.checked)}</Text>
          <Text style={[st.dayV, { flex: 1.4, textAlign: 'right', color: gapColor(d.avg_min) }]}>{d.avg_text || '—'}</Text>
        </View>
      ))}
    </View>
  ) : null;

  const empty = !rep && !loading ? (
    <Empty title="Roll Cut Analysis" text="Sticker → Roll cut → Checking for every taka, and how long checking took after roll cut. Change any filter and the report updates by itself." />
  ) : null;

  /* ───────────── layout ───────────── */
  if (wide && rep) {
    return (
      <View style={st.screen}>
        <ScrollView contentContainerStyle={st.wrap}>
          {filterCard}
          <View style={loading ? st.stale : null} pointerEvents={loading ? 'none' : 'auto'}>
          {kpis}
          <View style={st.split}>
            <View style={st.colL}>
              {bucketCard}
              <Text style={st.colTitle}>Beams</Text>
              {beamsList}
            </View>
            <View style={st.colR}>
              <View style={st.tabs}>
                {([['takas', 'Takas', 'list-alt', takas.length], ['days', 'Day-wise', 'event-note', rep.daily.length]] as const).map(([k, l, ic, n]) => {
                  const on = tab === k || (tab === 'beams' && k === 'takas');
                  return (
                    <TouchableOpacity key={k} style={[st.tab, on && st.tabOn]} onPress={() => setTab(k)} activeOpacity={0.8}>
                      <Icon name={ic} size={17} color={on ? '#fff' : T.nav} />
                      <Text style={[st.tabText, on && { color: '#fff' }]}>{l}</Text>
                      <View style={[st.tabBadge, on && { backgroundColor: '#ffffff33' }]}><Text style={[st.tabBadgeText, on && { color: '#fff' }]}>{n}</Text></View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {tab === 'days' ? daysList : takasList}
            </View>
          </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={st.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={st.wrap}>
        {filterCard}
        <View style={loading ? st.stale : null} pointerEvents={loading ? 'none' : 'auto'}>
          {kpis}
          {bucketCard}
          {tabsBar}
          {rep ? (tab === 'beams' ? beamsList : tab === 'takas' ? takasList : daysList) : null}
        </View>
        {empty}
        {loading && !rep ? (
          <View style={st.firstLoad}><ActivityIndicator color={T.copper} /><Text style={st.firstLoadText}>Loading report…</Text></View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/* ───────────────────────── small parts ───────────────────────── */

/** thin indeterminate bar shown under the filters while the report refreshes */
function ProgressBar() {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [x]);
  const [w, setW] = useState(0);
  return (
    <View style={st.progressBar} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Animated.View style={[st.progressFill, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-0.4 * w, w] }) }] }]} />
    </View>
  );
}

function BeamCard({ b, onPress }: { b: BeamRow; onPress: () => void }) {
  const cutP = pct(b.cut, b.takas);
  const chkP = pct(b.checked, b.takas);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={st.row} accessibilityRole="button" accessibilityLabel={`Beam ${b.beamno}`}>
      <View style={st.rowTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.rowLabel}>BEAM</Text>
          <Text style={st.rowMain} numberOfLines={1}>{b.beamno || '—'}</Text>
        </View>
        {b.waiting ? <Badge text={`${b.waiting} waiting`} color={T.amber} /> : null}
        <Badge text={`${b.takas} takas`} color={T.nav} />
        <Icon name="chevron-right" size={20} color={T.muted} />
      </View>
      <View style={st.progRow}>
        <Text style={st.progL}>Roll cut</Text>
        <View style={st.track}><View style={[st.fill, { width: `${cutP}%` as any, backgroundColor: T.copper }]} /></View>
        <Text style={st.progV}>{b.cut}/{b.takas}</Text>
      </View>
      <View style={st.progRow}>
        <Text style={st.progL}>Checked</Text>
        <View style={st.track}><View style={[st.fill, { width: `${chkP}%` as any, backgroundColor: T.green }]} /></View>
        <Text style={st.progV}>{b.checked}/{b.takas}</Text>
      </View>
      <View style={st.rowInfo}>
        <Info k="AVG CUT → CHECK" v={b.avg_text || '—'} color={gapColor(b.avg_min)} />
        <Info k="SLOWEST" v={b.max_text || '—'} color={gapColor(b.max_min)} />
        <Info k="FIRST CUT" v={b.first_cut ? showDT(b.first_cut) : '—'} />
      </View>
    </TouchableOpacity>
  );
}

function TakaCard({ r }: { r: TakaRow }) {
  const sl = STAGE_LABEL[r.stage] || { t: r.stage, c: T.muted };
  const steps = [
    { k: 'Sticker', at: r.sticker_at, done: !!r.sticker_at, icon: 'local-offer' },
    { k: 'Roll cut', at: r.rollcut_at, done: r.rollcut === 'Done', icon: 'content-cut' },
    { k: 'Checking', at: r.checking_at, done: r.checking === 'Done', icon: 'fact-check' },
  ];
  return (
    <View style={[st.row, { borderLeftColor: sl.c }]}>
      <View style={st.rowTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.rowLabel}>TAKA NO · BEAM {r.beamno}</Text>
          <Text style={st.rowMain} numberOfLines={1}>{r.takano}</Text>
        </View>
        <Badge text={sl.t} color={sl.c} />
      </View>
      <View style={st.steps}>
        {steps.map((s, i) => (
          <View key={s.k} style={st.step}>
            <View style={st.stepTop}>
              <View style={[st.dot, { backgroundColor: s.done ? (i === 2 ? T.green : T.copper) : T.border }]}>
                <Icon name={s.icon as any} size={12} color={s.done ? '#fff' : T.muted} />
              </View>
              {i < 2 ? <View style={[st.line, { backgroundColor: steps[i + 1].done ? T.copper : T.border }]} /> : null}
            </View>
            <Text style={st.stepK}>{s.k}</Text>
            <Text style={[st.stepV, !s.done && { color: T.muted }]} numberOfLines={2}>{s.done ? showDT(s.at) : 'Pending'}</Text>
          </View>
        ))}
      </View>
      {r.gap_text !== null ? (
        <View style={[st.gapBar, { backgroundColor: `${gapColor(r.gap_min)}14`, borderColor: `${gapColor(r.gap_min)}55` }]}>
          <Icon name="timer" size={15} color={gapColor(r.gap_min)} />
          <Text style={[st.gapText, { color: gapColor(r.gap_min) }]}>
            {r.gap_min !== null && r.gap_min < 0 ? `Checked ${r.gap_text.replace('-', '')} BEFORE roll cut` : `Roll cut → checking: ${r.gap_text}`}
          </Text>
        </View>
      ) : r.wait_text ? (
        <View style={[st.gapBar, { backgroundColor: `${T.amber}14`, borderColor: `${T.amber}55` }]}>
          <Icon name="hourglass-bottom" size={15} color={(r.wait_min || 0) > 1440 ? T.red : T.amber} />
          <Text style={[st.gapText, { color: (r.wait_min || 0) > 1440 ? T.red : T.amber }]}>Waiting for checking since {r.wait_text}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Info({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={st.infoK}>{k}</Text>
      <Text style={[st.infoV, color ? { color } : null]} numberOfLines={1}>{v}</Text>
    </View>
  );
}
function Badge({ text, color }: { text: string; color: string }) {
  return <View style={[st.badge, { backgroundColor: `${color}14`, borderColor: `${color}44` }]}><Text style={[st.badgeText, { color }]} numberOfLines={1}>{text}</Text></View>;
}
function Pill({ text, onClear }: { text: string; onClear: () => void }) {
  return (
    <TouchableOpacity onPress={onClear} style={st.pill} activeOpacity={0.8}>
      <Text style={st.pillText}>{text}</Text>
      <Icon name="close" size={14} color={T.copper} />
    </TouchableOpacity>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <View style={st.empty}>
      <View style={st.emptyIcon}><Icon name="content-cut" size={28} color={T.copper} /></View>
      <Text style={st.emptyTitle}>{title}</Text>
      <Text style={st.emptyText}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  wrap: { padding: 16, paddingBottom: 48, width: '100%', maxWidth: 1400, alignSelf: 'center' },
  split: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  colL: { width: 440 },
  colR: { flex: 1, minWidth: 0 },
  colTitle: { fontSize: 13, fontWeight: '900', color: T.nav, marginBottom: 8, marginTop: 4, letterSpacing: 0.3 },

  card: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 12, ...S.card, shadowOpacity: 0.05, elevation: 1 },
  filterHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  filterTitle: { fontSize: 14, fontWeight: '900', color: T.nav },
  filterSummary: { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 12, fontWeight: '700', color: T.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 12 },
  fieldLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: T.muted, textTransform: 'uppercase', marginBottom: 6 },
  segment: { flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border, gap: 3 },
  seg: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segOn: { backgroundColor: T.nav },
  segText: { fontSize: 12.5, fontWeight: '800', color: T.nav },
  segTextOn: { color: '#fff' },
  hint: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 6 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quick: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickText: { fontSize: 12, fontWeight: '800', color: T.copper },
  err: { fontSize: 12.5, fontWeight: '700', color: T.red, marginTop: 12 },
  quickOn: { backgroundColor: T.copper, borderColor: T.copper },
  daysText: { alignSelf: 'center', marginLeft: 'auto', fontSize: 12, fontWeight: '700', color: T.muted },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.green },
  liveText: { fontSize: 11.5, fontWeight: '800', color: T.copper },
  errBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: T.red + '12', borderWidth: 1, borderColor: T.red + '40' },
  errText: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: '700', color: T.red },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, borderWidth: 1, borderColor: T.red + '55' },
  retryText: { fontSize: 12, fontWeight: '800', color: T.red },
  progressBar: { height: 3, borderRadius: 2, backgroundColor: T.border, overflow: 'hidden', marginTop: 12 },
  progressFill: { width: '40%', height: '100%', backgroundColor: T.copper, borderRadius: 2 },
  stale: { opacity: 0.5 },
  firstLoad: { alignItems: 'center', gap: 10, marginTop: 36 },
  firstLoadText: { fontSize: 13, fontWeight: '700', color: T.muted },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginBottom: 7 },
  kpi: { padding: 5 },
  kpiIn: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, borderTopWidth: 3, padding: 12, minHeight: 92 },
  kpiLabel: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6, color: T.muted },
  kpiValue: { fontSize: 22, fontWeight: '900', color: T.ink, marginTop: 6, fontFamily: MONO },
  kpiSub: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 3 },

  secHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  secTitle: { fontSize: 14, fontWeight: '900', color: T.nav },
  secMeta: { fontSize: 11.5, fontWeight: '700', color: T.muted },
  bRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 8 },
  bLabel: { width: 96, fontSize: 12, fontWeight: '800', color: T.ink },
  bTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: T.alt, overflow: 'hidden' },
  bFill: { height: '100%', borderRadius: 5 },
  bCount: { width: 52, textAlign: 'right', fontSize: 12.5, fontWeight: '900', color: T.ink, fontFamily: MONO },
  bPct: { width: 38, textAlign: 'right', fontSize: 11.5, fontWeight: '700', color: T.muted },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, padding: 8, borderRadius: 10, backgroundColor: `${T.purple}0F` },
  noteText: { flex: 1, fontSize: 12, fontWeight: '700' },

  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12, padding: 4, borderRadius: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  tab: { flex: 1, minHeight: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabOn: { backgroundColor: T.nav },
  tabText: { fontSize: 12.5, fontWeight: '900', color: T.nav },
  tabBadge: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontSize: 11, fontWeight: '900', color: T.copper },

  searchBox: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '700', color: T.ink, paddingVertical: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null) },
  chips: { gap: 7, paddingBottom: 10 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, justifyContent: 'center' },
  chipText: { fontSize: 12, fontWeight: '800', color: T.nav },
  activeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: `${T.copper}14`, borderWidth: 1, borderColor: `${T.copper}55` },
  pillText: { fontSize: 12, fontWeight: '800', color: T.copper },

  row: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, borderLeftColor: T.copper, padding: 12, marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6, color: T.muted },
  rowMain: { fontSize: 14, fontWeight: '900', color: T.ink, fontFamily: MONO, marginTop: 1 },
  badge: { height: 24, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, justifyContent: 'center', maxWidth: 190 },
  badgeText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.3 },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progL: { width: 62, fontSize: 11.5, fontWeight: '700', color: T.muted },
  track: { flex: 1, height: 7, borderRadius: 4, backgroundColor: T.alt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  progV: { width: 64, textAlign: 'right', fontSize: 11.5, fontWeight: '800', color: T.ink, fontFamily: MONO },
  rowInfo: { flexDirection: 'row', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  infoK: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4, color: T.muted },
  infoV: { fontSize: 12.5, fontWeight: '800', color: T.ink, marginTop: 2 },

  steps: { flexDirection: 'row', marginTop: 12 },
  step: { flex: 1, minWidth: 0 },
  stepTop: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, height: 2, marginHorizontal: 4, borderRadius: 1 },
  stepK: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4, color: T.muted, marginTop: 6 },
  stepV: { fontSize: 11.5, fontWeight: '700', color: T.ink, marginTop: 2, paddingRight: 6 },
  gapBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  gapText: { flex: 1, fontSize: 12.5, fontWeight: '800' },

  dayHead: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: T.hair },
  dayH: { flex: 1, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5, color: T.muted },
  dayRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.hair },
  dayV: { flex: 1, fontSize: 12.5, fontWeight: '800', color: T.ink },

  more: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  moreText: { fontSize: 12.5, fontWeight: '800', color: T.copper },
  footerText: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: T.muted, paddingVertical: 12 },

  empty: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 20, backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: T.nav, marginTop: 12 },
  emptyText: { fontSize: 12.5, fontWeight: '600', color: T.muted, textAlign: 'center', marginTop: 5, maxWidth: 460 },
});
