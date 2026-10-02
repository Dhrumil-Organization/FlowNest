// FILE: src/screens/reports/BeamShortageScreen.tsx
// Reports → Beam Shortage (READ-ONLY) — the ERP Designing "Beam Shortage"
// report as is:
//
//   ‹ Reports
//   Beam Shortage
//   [from] → [to]  [FY 26-27] [FY 25-26] [Month] [90d]
//   [All items ⌄] [Yarn & piece dyed ⌄] [All machines ⌄] [⌕ find a design or beam no.]  clear filters
//   SORT [Shortage m ▾] [Shortage %] [Design]                    12 designs · 31 beams
//   | Warped | Produced | Shortage m · % |
//   DESIGN              WARPED  PRODUCED  SHORT    %
//   Rib Stop 145 ›      ...
//   GRAND TOTAL
//   tap a design -> beam-wise page (BEAM · date · machine | WARPED | PRODUCED | SHORTAGE (%))
//
//   VIEW [Design › Beam] ⇄ [Beam › Design]   — the flip:
//     Design › Beam (default)  design list, tap a design -> its beams
//     Beam › Design            beam list,   tap a beam   -> its designs
//   Both views are built from the same lines, so their totals are identical.
//
// Rules (beamShortageModel.ts): completed beams only (last taka entered);
// shortage is the beam's (warped − produced) and is distributed over the
// designs the beam ran in the ratio of produced metres; warped = produced +
// shortage; % = shortage ÷ warped. One financial year at a time — the range
// never mixes two April–March years.
//
// Source: POST /reports/beam_shortage  { prptype, prpcode, yearno, fromdate, todate }
// (beamShortageApi.ts — USE_MOCK = true serves the hard-coded test data instead)

import { useBusinessContext } from '@/src/core/business';
import { T } from '@/src/theme';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { DyeingDateField } from '../dyeing/DyeingDateField';
import { addDaysISO, todayISO } from '../dyeing/dyeingModel';
import {
  BeamLine,
  beamKeyOf,
  BeamRow as BeamSummary,
  BeamShortageData,
  buildBeamRows,
  buildDesignRows,
  DesignRow,
  Filters,
  filterLines,
  filterLinesForBeams,
  filterSummaryOnly,
  fyEndOf,
  fyLabel,
  fyStartFromYearName,
  fyStartOf,
  grandTotal,
  hasTypes,
  linesOfBeam,
  linesOfDesign,
  NO_FILTERS,
  normalizeBeamShortage,
  optionsOf,
  SortKey,
  SortState,
  Totals,
  totalsOf,
  yearNoFor,
} from './beamShortage/beamShortageModel';
import { BeamShortageService, USE_MOCK } from './beamShortage/beamShortageApi';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" });
const fm = (v: number) => Math.round(v || 0).toLocaleString('en-IN');
const pct1 = (p: number) => (Math.round(p * 10) / 10).toFixed(1);
const fmtD = (iso: string) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return iso ? `${iso.slice(8, 10)} ${months[Number(iso.slice(5, 7)) - 1]} ${iso.slice(2, 4)}` : '—';
};
/** under 1.5% normal · 1.5–3% review · over 3% investigate */
const pctColor = (p: number) => (p > 3 ? T.red : p > 1.5 ? T.amber : T.ink);
const typeLabel = (t: string) => (t === 'YD' ? 'yarn dyed' : t === 'PD' ? 'piece dyed' : '');
const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`;

const WD = { warped: 62, produced: 62, short: 56, pct: 40 }; // design table
const WB = { warped: 64, produced: 64, short: 86 }; // beam table
const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
const EMPTY: BeamShortageData = { lines: [], summaryOnly: [] };

type Range = { from: string; to: string };
/** which list comes first: designs (tap -> beams) or beams (tap -> designs) */
type ViewMode = 'design' | 'beam';

export default function BeamShortageScreen() {
  const router = useRouter();
  const { prpGroup, prpCode, yearNo, yearName, isReady } = useBusinessContext();
  const today = todayISO();
  const fyNow = fyStartOf(today);
  const fyPrev = `${Number(fyNow.slice(0, 4)) - 1}-04-01`;
  const monthStart = `${today.slice(0, 8)}01`;
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const narrow = width < 420;

  // 1-Apr date of the logged-in ERP year — anchors the year no. sent for other years
  const sessionFy = useMemo(() => fyStartFromYearName(yearName) || fyNow, [yearName, fyNow]);

  const [range, setRangeState] = useState<Range>({ from: fyNow, to: today });
  const [clamped, setClamped] = useState(false);
  const [data, setData] = useState<BeamShortageData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<SortState>({ k: 'short', dir: 'desc' });
  const [picker, setPicker] = useState<null | 'item' | 'type' | 'machine'>(null);
  const [dsel, setDsel] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('design');
  const [bsel, setBsel] = useState<string | null>(null);

  const reqId = useRef(0);

  const load = useCallback(async (r: Range, pull = false) => {
    if (!isReady && !USE_MOCK) { setLoading(false); return; }
    const id = ++reqId.current;
    if (pull) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const body = {
        prptype: prpGroup,
        prpcode: prpCode,
        yearno: yearNoFor(r.from, yearNo, sessionFy),
        fromdate: r.from,
        todate: r.to,
      };
      console.log('[Reports/BeamShortage] request ->', body);
      const response: any = await BeamShortageService.report(body);
      if (id !== reqId.current) return; // a newer request replaced this one
      const body0 = response?.data;
      if (body0 && typeof body0 === 'object' && !Array.isArray(body0) && (body0.success === false || body0.status === false)) {
        throw new Error(body0.message || 'Unable to load beam shortage.');
      }
      setData(normalizeBeamShortage(response));
      setLoaded(true);
    } catch (err: any) {
      if (id !== reqId.current) return;
      setData(EMPTY);
      setError(err?.response?.data?.message || err?.message || 'Unable to load beam shortage.');
    } finally {
      if (id === reqId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [isReady, prpGroup, prpCode, yearNo, sessionFy]);

  const rangeRef = useRef(range);
  rangeRef.current = range;
  useFocusEffect(useCallback(() => { void load(rangeRef.current); }, [load]));

  // Android hardware back: detail page -> list (instead of leaving the report)
  useFocusEffect(useCallback(() => {
    if (!dsel && !bsel) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setDsel(null); setBsel(null); return true; });
    return () => sub.remove();
  }, [dsel, bsel]));

  /** The flip: design-first <-> beam-first. Filters, period and sort order stay. */
  const flipTo = (next: ViewMode) => { setView(next); setDsel(null); setBsel(null); };

  /** Keeps the range inside ONE financial year; the end the user touched wins. */
  const setRange = (from: string, to: string, anchor: 'from' | 'to') => {
    let f = from;
    let t = to;
    if (f > t) { if (anchor === 'from') t = f; else f = t; }
    let cut = false;
    if (fyStartOf(f) !== fyStartOf(t)) {
      cut = true;
      if (anchor === 'from') t = fyEndOf(fyStartOf(f)); else f = fyStartOf(t);
    }
    if (t > today) t = today;
    if (f > t) f = t;
    setClamped(cut);
    const next = { from: f, to: t };
    setRangeState(next);
    void load(next);
  };

  const goReports = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/new/(tabs)/reports' as any);
  };

  /* ------------------------------- derived -------------------------------- */

  const itemOpts = useMemo(() => optionsOf(data.lines, data.summaryOnly, 'item'), [data]);
  const machineOpts = useMemo(() => optionsOf(data.lines, data.summaryOnly, 'machine'), [data]);
  const showType = useMemo(() => hasTypes(data.lines, data.summaryOnly), [data]);

  const lines = useMemo(() => filterLines(data.lines, filters), [data, filters]);
  const summaryOnly = useMemo(() => filterSummaryOnly(data.summaryOnly, filters), [data, filters]);
  const rows = useMemo(() => buildDesignRows(lines, summaryOnly, sort), [lines, summaryOnly, sort]);
  const total = useMemo(() => grandTotal(rows, lines), [rows, lines]);

  // beam-first view — same lines, grouped by beam
  const beamLines = useMemo(() => filterLinesForBeams(data.lines, filters), [data, filters]);
  const beamRows = useMemo(() => buildBeamRows(beamLines, sort), [beamLines, sort]);
  const beamTotal = useMemo(() => totalsOf(beamLines, beamRows.length), [beamLines, beamRows]);
  const beamDesigns = useMemo(() => new Set(beamLines.map((l) => l.designKey)).size, [beamLines]);

  const active = filters.item !== 'ALL' || filters.type !== 'ALL' || filters.machine !== 'ALL' || !!filters.q.trim();
  const toggleSort = (k: SortKey) =>
    setSort((cur) => (cur.k === k ? { k, dir: cur.dir === 'desc' ? 'asc' : 'desc' } : { k, dir: k === 'code' ? 'asc' : 'desc' }));

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => load(range, true)} tintColor={T.copper} colors={[T.copper]} />;

  if (loading && !loaded && !error) {
    return <View style={st.loading}><ActivityIndicator color={T.copper} /></View>;
  }

  /* ------------------------------- beam-wise ------------------------------ */
  if (dsel) {
    // the beam page follows the design-list filters except the text search,
    // so a design opened from a filtered list shows the same beams it counted
    const L2 = linesOfDesign(filterLines(data.lines, { ...filters, q: '' }), dsel);
    const head = L2[0] || data.lines.find((l) => l.designKey === dsel);
    const T2: Totals = totalsOf(L2, new Set(L2.map((l) => l.beamNo)).size);
    const tableMin = narrow ? 380 : undefined;
    const sharedN = L2.filter((l) => l.shared).length;
    return (
      <ScrollView style={st.page} contentContainerStyle={[st.body, wide && st.bodyWide]} refreshControl={refresh}>
        <View>
          <TouchableOpacity onPress={() => setDsel(null)} hitSlop={HIT}><Text style={st.back}>‹ Beam Shortage</Text></TouchableOpacity>
          <Text style={st.title}>{head?.dsnName || dsel}</Text>
          <Text style={st.sub}>
            Completed beams of this design between {fmtD(range.from)} and {fmtD(range.to)} — last piece entered.
            Shortage = warped − produced.
          </Text>
        </View>

        <View style={st.stats}>
          <Stat label="Complete beams" value={String(T2.beams)} />
          <Stat label="Warped" value={`${fm(T2.warped)} m`} />
          <Stat label="Produced" value={`${fm(T2.produced)} m`} />
          <Stat label="Shortage" value={`${fm(T2.shortage)} m · ${pct1(T2.pct)}%`} color={T2.pct > 3 ? T.red : T.amber} />
        </View>

        <HScroll on={!!tableMin}>
          <View style={[st.card, { paddingVertical: 4, minWidth: tableMin, flex: 1 }]}>
            <View style={[st.row, { paddingVertical: 8 }]}>
              <Text style={[st.first, st.head]}>BEAM · DATE · MACHINE</Text>
              <Text style={[st.num, st.head, { width: WB.warped }]}>WARPED</Text>
              <Text style={[st.num, st.head, { width: WB.produced }]}>PRODUCED</Text>
              <Text style={[st.num, st.head, { width: WB.short }]}>SHORTAGE</Text>
            </View>
            {L2.length === 0 && <Text style={st.emptyRow}>No completed beams for this design in this period.</Text>}
            {L2.map((l) => <BeamRow key={l.key} l={l} />)}
            {L2.length > 0 && (
              <View style={[st.row, st.totalRow]}>
                <Text style={[st.first, st.totalLabel]}>GRAND TOTAL · {plural(T2.beams, 'beam')}</Text>
                <Text style={[st.num, st.mono, st.bold, { width: WB.warped }]}>{fm(T2.warped)}</Text>
                <Text style={[st.num, st.mono, st.bold, { width: WB.produced }]}>{fm(T2.produced)}</Text>
                <Text style={[st.num, st.mono, st.bold, { width: WB.short, color: T2.shortage > 0 ? pctColor(T2.pct) : T.ink }]}>
                  {fm(T2.shortage)} <Text style={st.pctSmall}>({pct1(T2.pct)}%)</Text>
                </Text>
              </View>
            )}
          </View>
        </HScroll>

        <Text style={st.footer}>
          {sharedN > 0
            ? `${plural(sharedN, 'beam')} here also ran another design (tagged SHARED BEAM): that beam's shortage is distributed over its designs in the ratio of the metres each produced, and only this design's share is shown. `
            : ''}
          Warped = produced + shortage, so every row and the total reconcile. % is shortage as a share of warped.
        </Text>
      </ScrollView>
    );
  }

  /* --------------------------- beam -> its designs ------------------------ */
  if (bsel) {
    // every design of the beam inside the item / type / machine filters —
    // the same lines the beam's row was built from, so row and page agree
    const base = filterLines(data.lines, { ...filters, q: '' });
    const L3 = linesOfBeam(base, bsel);
    const all = data.lines.filter((l) => beamKeyOf(l) === bsel);
    const head = L3[0] || all[0];
    const T3: Totals = totalsOf(L3, 1);
    const hidden = all.length - L3.length;
    const tableMin = narrow ? 380 : undefined;
    const warpD = all.find((l) => l.warpDate)?.warpDate || '';
    const doneD = all.reduce((a, l) => (l.doneDate > a ? l.doneDate : a), '');
    return (
      <ScrollView style={st.page} contentContainerStyle={[st.body, wide && st.bodyWide]} refreshControl={refresh}>
        <View>
          <TouchableOpacity onPress={() => setBsel(null)} hitSlop={HIT}><Text style={st.back}>‹ Beam Shortage</Text></TouchableOpacity>
          <Text style={st.title}>Beam {head?.beamNo || ''}</Text>
          <Text style={st.sub}>
            {[warpD ? `Warped ${fmtD(warpD)}` : '', doneD ? `last piece ${fmtD(doneD)}` : ''].filter(Boolean).join(' · ') || 'Completed beam'}
            {' — '}designs this beam ran. Shortage = warped − produced.
          </Text>
        </View>

        <View style={st.stats}>
          <Stat label={L3.length === 1 ? 'Design' : 'Designs'} value={String(L3.length)} />
          <Stat label="Warped" value={`${fm(T3.warped)} m`} />
          <Stat label="Produced" value={`${fm(T3.produced)} m`} />
          <Stat label="Shortage" value={`${fm(T3.shortage)} m · ${pct1(T3.pct)}%`} color={T3.pct > 3 ? T.red : T.amber} />
        </View>

        <HScroll on={!!tableMin}>
          <View style={[st.card, { paddingVertical: 4, minWidth: tableMin, flex: 1 }]}>
            <View style={[st.row, { paddingVertical: 8 }]}>
              <Text style={[st.first, st.head]}>DESIGN · GAITING · MACHINE</Text>
              <Text style={[st.num, st.head, { width: WB.warped }]}>WARPED</Text>
              <Text style={[st.num, st.head, { width: WB.produced }]}>PRODUCED</Text>
              <Text style={[st.num, st.head, { width: WB.short }]}>SHORTAGE</Text>
            </View>
            {L3.length === 0 && <Text style={st.emptyRow}>No design of this beam matches the filters in this period.</Text>}
            {L3.map((l) => <BeamDesignRow key={l.key} l={l} />)}
            {L3.length > 0 && (
              <View style={[st.row, st.totalRow]}>
                <Text style={[st.first, st.totalLabel]}>BEAM TOTAL · {plural(L3.length, 'design')}</Text>
                <Text style={[st.num, st.mono, st.bold, { width: WB.warped }]}>{fm(T3.warped)}</Text>
                <Text style={[st.num, st.mono, st.bold, { width: WB.produced }]}>{fm(T3.produced)}</Text>
                <Text style={[st.num, st.mono, st.bold, { width: WB.short, color: T3.shortage > 0 ? pctColor(T3.pct) : T.ink }]}>
                  {fm(T3.shortage)} <Text style={st.pctSmall}>({pct1(T3.pct)}%)</Text>
                </Text>
              </View>
            )}
          </View>
        </HScroll>

        <Text style={st.footer}>
          {hidden > 0 ? `${plural(hidden, 'more design')} of this beam ${hidden === 1 ? 'is' : 'are'} outside the current item / type / machine filters and not counted here. ` : ''}
          {L3.length > 1
            ? "The beam's shortage is distributed over its designs in the ratio of the metres each produced. "
            : ''}
          Warped = produced + shortage, so every row and the total reconcile. % is shortage as a share of warped.
        </Text>
      </ScrollView>
    );
  }

  /* ------------------------------ design-wise ----------------------------- */
  const beamView = view === 'beam';
  const shown: Totals = beamView ? beamTotal : total;
  const listCount = beamView ? beamRows.length : rows.length;
  const tableMin = narrow ? 400 : undefined;
  // a preset that starts before 1 Apr is cut to the financial-year start by setRange
  const inFy = (f: string) => (f < fyNow ? fyNow : f);
  const presetDefs: [string, string, string][] = [
    [fyLabel(fyNow), fyNow, today],
    [fyLabel(fyPrev), fyPrev, fyEndOf(fyPrev)],
    ['Month', monthStart, today],
    ['90d', addDaysISO(today, -90), today],
  ];
  // only the first matching preset is highlighted (in April "Month" equals the FY preset)
  const onPreset = presetDefs.findIndex(([, f, t], i) => range.to === t && range.from === (i === 1 ? f : inFy(f)));

  return (
    <ScrollView style={st.page} contentContainerStyle={[st.body, wide && st.bodyWide]} refreshControl={refresh} keyboardShouldPersistTaps="handled">
      <View>
        <TouchableOpacity onPress={goReports} hitSlop={HIT}><Text style={st.back}>‹ Reports</Text></TouchableOpacity>
        <View style={st.titleRow}>
          <Text style={st.title}>Beam Shortage</Text>
          {USE_MOCK && <Text style={st.mockTag}>MOCK DATA</Text>}
        </View>
        <Text style={st.sub}>
          {beamView ? 'Beam-level' : 'Design-level'} view for the selected period — completed beams only (last piece entered). Shortage = warped −
          metres produced. {beamView ? 'Tap a beam for its design-wise detail.' : 'Tap a design for its beam-wise detail.'}
        </Text>
      </View>

      <ViewFlip view={view} onChange={flipTo} />

      <View style={st.rng}>
        <DyeingDateField value={range.from} onChange={(v) => setRange(v, range.to, 'from')} compact />
        <Text style={st.arrowTxt}>→</Text>
        <DyeingDateField value={range.to} onChange={(v) => setRange(range.from, v, 'to')} compact />
        {presetDefs.map(([l, f, t], i) => {
          const on = onPreset === i;
          return (
            <TouchableOpacity key={l} onPress={() => setRange(f, t, 'to')} style={[st.preset, on && st.presetOn]}>
              <Text style={[st.presetText, on && { color: '#fff' }]}>{l}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {clamped && (
        <Text style={st.note}>
          Range kept inside {fyLabel(fyStartOf(range.from))} — one financial year at a time, so figures never mix across years.
        </Text>
      )}

      <View style={st.filters}>
        {itemOpts.length > 0 && (
          <SelectBox label={filters.item === 'ALL' ? 'All items' : filters.item} dim={filters.item === 'ALL'} onPress={() => setPicker('item')} />
        )}
        {showType && (
          <SelectBox
            label={filters.type === 'ALL' ? 'Yarn & piece dyed' : filters.type === 'YD' ? 'Yarn dyed' : 'Piece dyed'}
            dim={filters.type === 'ALL'}
            onPress={() => setPicker('type')}
          />
        )}
        {machineOpts.length > 1 && (
          <SelectBox label={filters.machine === 'ALL' ? 'All machines' : filters.machine} dim={filters.machine === 'ALL'} onPress={() => setPicker('machine')} />
        )}
        <View style={st.search}>
          <Text style={st.searchIcon}>⌕</Text>
          <TextInput
            value={filters.q}
            onChangeText={(q) => setFilters((f) => ({ ...f, q }))}
            placeholder="find a design or beam no."
            placeholderTextColor={T.muted}
            autoCorrect={false}
            autoCapitalize="none"
            style={[st.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
          />
        </View>
        {active && (
          <TouchableOpacity onPress={() => setFilters(NO_FILTERS)} hitSlop={HIT}>
            <Text style={st.link}>clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={st.sortRow}>
        <Text style={st.sortLabel}>SORT</Text>
        <SortBtn k="short" label="Shortage m" sort={sort} onPress={toggleSort} />
        <SortBtn k="pct" label="Shortage %" sort={sort} onPress={toggleSort} />
        <SortBtn k="code" label={beamView ? 'Beam no.' : 'Design'} sort={sort} onPress={toggleSort} />
        <Text style={st.count}>
          {beamView
            ? `${plural(beamRows.length, 'beam')} · ${plural(beamDesigns, 'design')}`
            : `${plural(rows.length, 'design')} · ${plural(total.beams, 'beam')}`}
        </Text>
      </View>

      {loading && <ActivityIndicator color={T.copper} size="small" />}
      {!!error && (
        <TouchableOpacity onPress={() => load(range)} style={st.errorBox}>
          <Text style={st.errorText}>{error} — tap to retry</Text>
        </TouchableOpacity>
      )}

      <View style={st.stats}>
        <Stat label="Warped" value={`${fm(shown.warped)} m`} />
        <Stat label="Produced" value={`${fm(shown.produced)} m`} />
        <Stat label="Shortage" value={`${fm(shown.shortage)} m · ${pct1(shown.pct)}%`} color={shown.pct > 3 ? T.red : T.amber} />
      </View>

      {filters.item !== 'ALL' && (
        <Text style={st.scope}>
          {beamView ? 'Beam-wise' : 'Design-wise'} breakdown within <Text style={st.scopeBold}>{filters.item}</Text>
          {filters.type !== 'ALL' ? ` · ${typeLabel(filters.type)}` : ''}
        </Text>
      )}

      <HScroll on={!!tableMin}>
        <View style={[st.card, { paddingVertical: 4, minWidth: tableMin, flex: 1 }]}>
          <View style={[st.row, { paddingVertical: 8 }]}>
            <Text style={[st.first, st.head]}>{beamView ? 'BEAM · DATE · MACHINE' : 'DESIGN'}</Text>
            <Text style={[st.num, st.head, { width: WD.warped }]}>WARPED</Text>
            <Text style={[st.num, st.head, { width: WD.produced }]}>PRODUCED</Text>
            <Text style={[st.num, st.head, { width: WD.short }]}>SHORT</Text>
            <Text style={[st.num, st.head, { width: WD.pct }]}>%</Text>
          </View>
          {listCount === 0 && !loading && !error && (
            <Text style={st.emptyRow}>
              {active ? 'No completed beams match this period and these filters.' : 'No completed beams in this period.'}
            </Text>
          )}
          {beamView
            ? beamRows.map((b) => <BeamListLine key={b.beamKey} b={b} onPress={() => setBsel(b.beamKey)} />)
            : rows.map((r) => (
              <DesignLine key={r.designKey} r={r} onPress={r.hasDetail ? () => setDsel(r.designKey) : undefined} />
            ))}
          {listCount > 0 && (
            <View style={[st.row, st.totalRow]}>
              <Text style={[st.first, st.totalLabel]}>
                GRAND TOTAL{beamView ? ` · ${plural(beamRows.length, 'beam')}` : ''}{filters.item !== 'ALL' ? ` · ${filters.item}` : ''}
              </Text>
              <Text style={[st.num, st.mono, st.bold, { width: WD.warped }]}>{fm(shown.warped)}</Text>
              <Text style={[st.num, st.mono, st.bold, { width: WD.produced }]}>{fm(shown.produced)}</Text>
              <Text style={[st.num, st.mono, st.bold, { width: WD.short, color: shown.warped > 0 ? pctColor(shown.pct) : T.ink }]}>{fm(shown.shortage)}</Text>
              <Text style={[st.num, st.mono, st.bold, { width: WD.pct }]}>{shown.warped > 0 ? pct1(shown.pct) : '—'}</Text>
            </View>
          )}
        </View>
      </HScroll>

      {beamView && summaryOnly.length > 0 && (
        <Text style={st.note}>
          {plural(summaryOnly.length, 'design')} came without beam detail and {summaryOnly.length === 1 ? 'is' : 'are'} shown only in the Design › Beam view.
        </Text>
      )}

      <Text style={st.footer}>
        The financial-year presets keep April–March years apart, and a custom range stays inside one year. Filters combine.
        A beam that ran more than one design has its shortage distributed over those designs by metres produced, so
        warped = produced + shortage at every level. % is shortage as a share of warped: under 1.5% normal · 1.5–3%
        review · over 3% investigate.
      </Text>

      <Picker
        visible={picker === 'item'}
        title="Select item"
        value={filters.item}
        options={[['ALL', 'All items'], ...itemOpts.map((o) => [o, o] as [string, string])]}
        onClose={() => setPicker(null)}
        onChange={(item) => { setFilters((f) => ({ ...f, item })); setPicker(null); }}
      />
      <Picker
        visible={picker === 'type'}
        title="Yarn dyed / piece dyed"
        value={filters.type}
        options={[['ALL', 'Yarn & piece dyed'], ['PD', 'Piece dyed'], ['YD', 'Yarn dyed']]}
        onClose={() => setPicker(null)}
        onChange={(type) => { setFilters((f) => ({ ...f, type })); setPicker(null); }}
      />
      <Picker
        visible={picker === 'machine'}
        title="Select machine"
        value={filters.machine}
        options={[['ALL', 'All machines'], ...machineOpts.map((o) => [o, o] as [string, string])]}
        onClose={() => setPicker(null)}
        onChange={(machine) => { setFilters((f) => ({ ...f, machine })); setPicker(null); }}
      />
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */

/** Tables scroll sideways only on narrow phones; elsewhere they fill the width. */
function HScroll({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      {children}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={st.stat}>
      <Text style={[st.statValue, st.mono, !!color && { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function SelectBox({ label, dim, onPress }: { label: string; dim: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={st.select}>
      <Text style={[st.selectText, dim && { color: T.muted }]} numberOfLines={1}>{label}</Text>
      <Text style={st.selectChevron}>⌄</Text>
    </TouchableOpacity>
  );
}

function SortBtn({ k, label, sort, onPress }: { k: SortKey; label: string; sort: SortState; onPress: (k: SortKey) => void }) {
  const on = sort.k === k;
  return (
    <TouchableOpacity onPress={() => onPress(k)} style={[st.sortBtn, on && st.sortBtnOn]} accessibilityHint="tap again to flip the order">
      <Text style={[st.sortText, on && { color: T.copper }]}>{label}{on ? (sort.dir === 'desc' ? ' ▾' : ' ▴') : ''}</Text>
    </TouchableOpacity>
  );
}

function DesignLine({ r, onPress }: { r: DesignRow; onPress?: () => void }) {
  const meta = [r.item, typeLabel(r.type), r.beams > 0 ? plural(r.beams, 'beam') : ''].filter(Boolean).join(' · ');
  const Body = (
    <View style={[st.row, st.line]}>
      <View style={st.first}>
        <Text style={st.designName} numberOfLines={2}>{r.dsnName}{onPress ? ' ›' : ''}</Text>
        {!!meta && <Text style={st.designMeta} numberOfLines={1}>{meta}</Text>}
      </View>
      <Text style={[st.num, st.mono, { width: WD.warped }]}>{fm(r.warped)}</Text>
      <Text style={[st.num, st.mono, { width: WD.produced }]}>{fm(r.produced)}</Text>
      <Text style={[st.num, st.mono, { width: WD.short, fontWeight: r.shortage > 0 ? '800' : '400', color: r.shortage > 0 ? pctColor(r.pct) : T.ink }]}>
        {fm(r.shortage)}
      </Text>
      <Text style={[st.num, st.mono, { width: WD.pct, color: pctColor(r.pct) }]}>{pct1(r.pct)}</Text>
    </View>
  );
  if (!onPress) return Body;
  return <TouchableOpacity onPress={onPress} activeOpacity={0.6}>{Body}</TouchableOpacity>;
}

/** The flip between the two drill-down orders. */
function ViewFlip({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const seg = (k: ViewMode, label: string, hint: string) => {
    const on = view === k;
    return (
      <TouchableOpacity
        onPress={() => onChange(k)}
        activeOpacity={0.75}
        style={[st.seg, on && st.segOn]}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${label} view`}
      >
        <Text style={[st.segText, on && st.segTextOn]} numberOfLines={1}>{label}</Text>
        <Text style={[st.segHint, on && st.segHintOn]} numberOfLines={1}>{hint}</Text>
      </TouchableOpacity>
    );
  };
  return (
    <View style={st.flip}>
      {seg('design', 'Design › Beam', 'designs first')}
      <TouchableOpacity
        onPress={() => onChange(view === 'design' ? 'beam' : 'design')}
        hitSlop={HIT}
        style={st.flipBtn}
        accessibilityRole="button"
        accessibilityLabel="Flip view"
      >
        <Text style={st.flipIcon}>⇄</Text>
      </TouchableOpacity>
      {seg('beam', 'Beam › Design', 'beams first')}
    </View>
  );
}

/** One beam in the beam-first list. */
function BeamListLine({ b, onPress }: { b: BeamSummary; onPress: () => void }) {
  const when = b.doneDate || b.warpDate;
  const meta = [when ? fmtD(when) : '', b.machine, b.designs === 1 ? b.dsnName : plural(b.designs, 'design')].filter(Boolean).join(' · ');
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
      <View style={[st.row, st.line]}>
        <View style={st.first}>
          <Text style={[st.designName, st.mono]} numberOfLines={1}>{b.beamNo} ›</Text>
          {!!meta && <Text style={st.designMeta} numberOfLines={2}>{meta}</Text>}
        </View>
        <Text style={[st.num, st.mono, { width: WD.warped }]}>{fm(b.warped)}</Text>
        <Text style={[st.num, st.mono, { width: WD.produced }]}>{fm(b.produced)}</Text>
        <Text style={[st.num, st.mono, { width: WD.short, fontWeight: b.shortage > 0 ? '800' : '400', color: b.shortage > 0 ? pctColor(b.pct) : T.ink }]}>
          {fm(b.shortage)}
        </Text>
        <Text style={[st.num, st.mono, { width: WD.pct, color: pctColor(b.pct) }]}>{pct1(b.pct)}</Text>
      </View>
    </TouchableOpacity>
  );
}

/** One design of a beam (beam -> designs page). */
function BeamDesignRow({ l }: { l: BeamLine }) {
  const p = l.warped > 0 ? (l.shortage / l.warped) * 100 : 0;
  const info = [l.item, typeLabel(l.type), l.gaitDate ? `gaited ${fmtD(l.gaitDate)}` : '', l.machine].filter(Boolean).join(' · ');
  return (
    <View style={[st.row, st.line]}>
      <View style={st.first}>
        <Text style={[st.designName, { color: T.ink }]} numberOfLines={2}>{l.dsnName}</Text>
        {!!info && <Text style={st.designMeta} numberOfLines={2}>{info}</Text>}
      </View>
      <Text style={[st.num, st.mono, { width: WB.warped }]}>{fm(l.warped)}</Text>
      <Text style={[st.num, st.mono, { width: WB.produced }]}>{fm(l.produced)}</Text>
      <Text style={[st.num, st.mono, { width: WB.short, color: l.shortage > 0 ? pctColor(p) : T.ink, fontWeight: l.shortage > 0 ? '800' : '400' }]}>
        {fm(l.shortage)} <Text style={st.pctSmall}>({pct1(p)}%)</Text>
      </Text>
    </View>
  );
}

function BeamRow({ l }: { l: BeamLine }) {
  const p = l.warped > 0 ? (l.shortage / l.warped) * 100 : 0;
  const when = l.doneDate || l.warpDate;
  const info = [when ? fmtD(when) : '', l.machine].filter(Boolean).join(' · ');
  return (
    <View style={[st.row, st.line]}>
      <View style={st.first}>
        <Text style={[st.mono, st.beamNo]} numberOfLines={2}>
          <Text style={st.bold}>{l.beamNo}</Text>{info ? <Text style={st.beamInfo}>  {info}</Text> : null}
        </Text>
        {l.shared && (
          <View style={st.tags}><Text style={[st.tag, { color: '#1C567A', backgroundColor: '#E3EEF5' }]}>SHARED BEAM</Text></View>
        )}
      </View>
      <Text style={[st.num, st.mono, { width: WB.warped }]}>{fm(l.warped)}</Text>
      <Text style={[st.num, st.mono, { width: WB.produced }]}>{fm(l.produced)}</Text>
      <Text style={[st.num, st.mono, { width: WB.short, color: l.shortage > 0 ? pctColor(p) : T.ink, fontWeight: l.shortage > 0 ? '800' : '400' }]}>
        {fm(l.shortage)} <Text style={st.pctSmall}>({pct1(p)}%)</Text>
      </Text>
    </View>
  );
}

function Picker({
  visible, title, value, options, onClose, onChange,
}: {
  visible: boolean;
  title: string;
  value: string;
  options: [string, string][];
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={st.overlay}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={st.modal}>
          <View style={st.modalHead}>
            <Text style={st.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={HIT}><Text style={st.modalClose}>×</Text></TouchableOpacity>
          </View>
          <ScrollView style={st.modalList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {options.map(([k, l]) => {
              const on = value === k;
              return (
                <TouchableOpacity key={k} onPress={() => onChange(k)} style={[st.option, on && st.optionOn]}>
                  <Text style={[st.optionText, on && st.optionTextOn]} numberOfLines={2}>{l}</Text>
                  {on && <Text style={st.optionCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  body: { padding: 12, paddingBottom: 40, gap: 10 },
  bodyWide: { maxWidth: 1000, width: '100%', alignSelf: 'center', padding: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg },
  mono: { fontFamily: MONO },
  bold: { fontWeight: '800' },

  back: { color: T.copper, fontWeight: '800', fontSize: 12.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mockTag: { fontSize: 8.5, fontWeight: '900', color: '#8a5a00', backgroundColor: '#FCF1DC', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4, overflow: 'hidden' },
  title: { fontSize: 19, fontWeight: '800', color: T.ink, marginTop: 4 },
  sub: { fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 16 },

  flip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.sub, borderRadius: 10, padding: 3,
    alignSelf: 'stretch', maxWidth: 420,
  },
  seg: { flex: 1, minWidth: 0, alignItems: 'center', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 6 },
  segOn: { backgroundColor: T.copper },
  segText: { fontSize: 11, fontWeight: '800', color: T.ink },
  segTextOn: { color: '#fff' },
  segHint: { fontSize: 8.5, color: T.muted, marginTop: 1 },
  segHintOn: { color: '#ffffffcc' },
  flipBtn: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.surface, borderWidth: 1, borderColor: `${T.copper}55`,
  },
  flipIcon: { fontSize: 14, lineHeight: 16, color: T.copper, fontWeight: '900' },

  rng: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  arrowTxt: { color: T.muted, fontSize: 11 },
  preset: {
    borderWidth: 1, borderColor: `${T.copper}55`, backgroundColor: '#F8EFE6', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  presetOn: { backgroundColor: T.copper, borderColor: T.copper },
  presetText: { fontSize: 9.5, fontWeight: '800', color: T.copper },
  note: { fontSize: 10, color: T.muted, lineHeight: 14 },

  filters: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  select: {
    flexGrow: 1, flexShrink: 1, flexBasis: 110, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7,
  },
  selectText: { flex: 1, fontSize: 11, fontWeight: '700', color: T.ink },
  selectChevron: { marginLeft: 6, fontSize: 13, lineHeight: 13, color: T.copper, fontWeight: '900' },
  search: {
    flexGrow: 2, flexShrink: 1, flexBasis: 150, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 8,
  },
  searchIcon: { color: T.muted, fontSize: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 11, paddingVertical: 6, color: T.ink },
  link: { fontSize: 9.5, fontWeight: '800', color: T.copper },

  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sortLabel: { fontSize: 9.5, fontWeight: '800', color: T.muted },
  sortBtn: { borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  sortBtnOn: { borderColor: T.copper, backgroundColor: '#F8EFE6' },
  sortText: { fontSize: 10, fontWeight: '800', color: T.ink },
  count: { marginLeft: 'auto', fontSize: 10, color: T.muted },

  errorBox: { backgroundColor: '#FCEDEA', borderRadius: 8, padding: 9 },
  errorText: { color: T.red, fontSize: 11.5, fontWeight: '700' },

  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minWidth: 0, backgroundColor: T.sub, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '800', color: T.ink },
  statLabel: { fontSize: 7.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },

  scope: { fontSize: 10.5, color: T.muted },
  scopeBold: { color: T.ink, fontWeight: '800' },

  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 13 },
  line: { paddingVertical: 9, borderTopWidth: 1, borderTopColor: T.alt },
  totalRow: { borderTopWidth: 2, borderTopColor: T.border, backgroundColor: T.sub, paddingVertical: 10 },
  totalLabel: { fontSize: 11, fontWeight: '800', color: T.ink },
  head: { fontSize: 8.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
  first: { flex: 1, minWidth: 0 },
  num: { textAlign: 'right', fontSize: 11, color: T.ink },
  pctSmall: { fontSize: 9, fontWeight: '600' },
  designName: { fontSize: 11.5, fontWeight: '800', color: T.copper },
  designMeta: { fontSize: 9.5, color: T.muted, marginTop: 1 },
  beamNo: { fontSize: 11, color: T.ink },
  beamInfo: { color: T.muted, fontSize: 9.5 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tag: { fontSize: 8, fontWeight: '900', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  emptyRow: { padding: 16, textAlign: 'center', color: T.muted, fontSize: 12 },

  footer: { fontSize: 9.5, color: T.muted, lineHeight: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: {
    width: '100%', maxWidth: 430, maxHeight: '72%', backgroundColor: T.surface, borderRadius: 12,
    borderWidth: 1, borderColor: T.border, overflow: 'hidden',
  },
  modalHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.alt,
  },
  modalTitle: { fontSize: 12, fontWeight: '900', color: T.ink },
  modalClose: { fontSize: 22, lineHeight: 20, color: T.muted, fontWeight: '700' },
  modalList: { paddingHorizontal: 8, paddingVertical: 8 },
  option: {
    minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 3,
  },
  optionOn: { backgroundColor: '#F8EFE6' },
  optionText: { flex: 1, fontSize: 11, fontWeight: '700', color: T.ink },
  optionTextOn: { color: T.copper, fontWeight: '900' },
  optionCheck: { marginLeft: 10, color: T.copper, fontSize: 14, fontWeight: '900' },
});
