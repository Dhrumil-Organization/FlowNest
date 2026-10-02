// FILE: src/components/VisitorsReportNEW/index.tsx
// NEW ERP — Visitors Report (management view of the gate register). English.
//
//   ┌ [Today][Yesterday][Last 7 days][This month][Last month][This year]… ┐
//   │ ‹  October 2026  ›   (steps a day / month / year)                    │
//   │ 🔍 search      [Filters (2)] [Guide] [⟳]   [Excel] [PDF] [Print]     │
//   │ VISITS · PERSONS · UNIQUE · STILL INSIDE · TOO LONG · AVG STAY       │
//   │ [Summary] [Day / Month / Year] [Register (86)] [Visitors (41)]        │
//   │  Day / Month / Year: day-wise, month-wise and year-wise totals         │
//   │  Summary : visits per day / per hour, purpose, visitor type,          │
//   │            department, whom to meet, top companies, still inside      │
//   │  Register: every visit (table on wide screens, cards on phones)       │
//   │  Visitors: one row per person — visits, first / last visit, time      │
//   └───────────────────────────────────────────────────────────────────────┘
//   - Tap a bar in Summary → that filter is applied and Register opens.
//   - Small photos on every row: tap = full screen. Tap a visit → full details.
//   - Edit (same form as the gate) and Delete from the details. Tap a visitor → history.
//   - Guide button: illustrated help for every part of this screen.
//
// Rights: resource 'production.visitors_report' (production.module.ts).
// `view` opens the screen, `edit` / `delete` show those buttons in the details,
// `export` shows Excel / PDF / Print. Excel and PDF open a preview first
// (ExportPreview.tsx) with the Download button inside.
// Data: the same api.ts as the Visits screen, so every entry made at the gate
// is here immediately.
import AppAlert from '@/common/utils/appAlert';
import { usePermission } from '@/src/core/permissions';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { DateTimeField } from '../DoffEntryNEW/ui';
import { Btn, SelectField, Sheet } from '../StockVerificationNEW/ui';
import { Api, apiErrorText, deleteVisit, fetchPeriodSummary, fetchSuggestions, fetchVisits } from '../VisitorsNEW/api';
import GuideSheet from '../VisitorsNEW/GuideSheet';
import { REPORT_GUIDE_STEPS } from '../VisitorsNEW/i18n';
import {
  addDays, dayKey, displayName, facePhoto, fmtDate, fmtDuration, fmtMobile, fmtTime, labelOf, NO_SUGGESTIONS, PURPOSES,
  startOfDay, statusOf, stayMinutes, Visit, VisitorSuggestions, VisitPhoto,
} from '../VisitorsNEW/model';
import { Avatar, HIT, PhotoThumbs, PhotoViewer, Tag, Toast, ToastMsg } from '../VisitorsNEW/ui';
import VisitDetailSheet from '../VisitorsNEW/VisitDetailSheet';
import VisitForm from '../VisitorsNEW/VisitForm';
import ExportPreview, { PreviewKind } from './ExportPreview';
import { ExportInput, printReport } from './exportReport';
import {
  activeFilterCount, aggregatePeriods, applyFilters, byCompany, byDay, byHost, byHour, byPurpose, Column, distinct, fillPeriods,
  Filters, kpisOf, NO_FILTERS, periodDates, PeriodGroup, periodKeyRange, periodKeyShort, periodLabel, PeriodMode, PeriodRow,
  presetOf, presetPeriod, PRESETS, Slice, SortKey, SORTS, sortVisits, STATUS_OPTIONS, stepAnchor, sumPeriods, VisitorRow,
  visitorsOf,
} from './reportModel';

type Props = { token: string; API: string; username?: string };
type Tab = 'summary' | 'periods' | 'register' | 'visitors';

export const VISITORS_REPORT_RESOURCE = 'production.visitors_report';
const NO_MOBILES = new Set<string>();
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" });
const STATUS = {
  inside: { label: 'Inside', color: T.green, bg: '#E6F1EA' },
  overstay: { label: 'Too long', color: T.red, bg: '#FCEDEA' },
  out: { label: 'Went out', color: '#6B655F', bg: T.alt },
} as const;

export default function VisitorsReportNEW({ token, API, username }: Props) {
  const api: Api = useMemo(() => ({ API, token, username, screen: 'report' }), [API, token, username]);
  const { canDo } = usePermission();
  const canExport = canDo(VISITORS_REPORT_RESOURCE, 'export');
  const canEdit = canDo(VISITORS_REPORT_RESOURCE, 'edit');
  const canDelete = canDo(VISITORS_REPORT_RESOURCE, 'delete');
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const xl = width >= 1240;
  const table = width >= 1100; // below this the register / visitors lists are cards

  /* ------------------------------- criteria ------------------------------ */
  // period = one day / month / year (‹ › steps it), the last 7 days, or a custom From – To
  const [mode, setMode] = useState<PeriodMode>('month');
  const [anchor, setAnchor] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [custom, setCustom] = useState(() => ({ from: addDays(new Date(), -29), to: new Date() }));
  const [group, setGroup] = useState<PeriodGroup>('day'); // Day / Month / Year tab
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [draft, setDraft] = useState<Filters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('summary');
  const [sort, setSort] = useState<SortKey>('new');

  /* --------------------------------- data -------------------------------- */
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const seq = useRef(0);
  const listRef = useRef<FlatList<any>>(null);

  // the range only moves when the criteria or the calendar day change (not every refresh)
  const todayKey = dayKey(now);
  const today = useMemo(() => new Date(`${todayKey}T12:00:00`), [todayKey]);
  const range = useMemo(() => periodDates({ mode, anchor, from: custom.from, to: custom.to }, today), [mode, anchor, custom, today]);
  const preset = presetOf(mode, anchor, today);
  const stepping = mode === 'day' || mode === 'month' || mode === 'year';
  const canStepNext = stepping && startOfDay(stepAnchor(mode, anchor, 1)) <= startOfDay(today);
  const setPeriod = useCallback((m: PeriodMode, a: Date) => { setMode(m); setAnchor(a); }, []);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const rows = await fetchVisits(api, range.from, range.to);
      if (mine !== seq.current) return;
      setVisits(rows);
      setLoadedAt(new Date());
      setNow(new Date());
    } catch (e) {
      if (mine !== seq.current) return;
      setVisits([]);
      setError(apiErrorText(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [api, range.from, range.to]);

  useEffect(() => { void load(); }, [load]);

  /* ------------------------------- derived ------------------------------- */
  const shown = useMemo(() => applyFilters(visits, filters, query, now), [visits, filters, query, now]);
  const kpis = useMemo(() => kpisOf(shown, now), [shown, now]);
  const sorted = useMemo(() => sortVisits(shown, sort, now), [shown, sort, now]);
  const visitors = useMemo(() => visitorsOf(shown, now), [shown, now]);
  const purposes = useMemo(() => byPurpose(shown), [shown]);
  const hosts = useMemo(() => byHost(shown), [shown]);
  const companies = useMemo(() => byCompany(shown), [shown]);
  const oneDay = dayKey(range.from) === dayKey(range.to);
  const days = useMemo(() => byDay(shown, range.from, range.to), [shown, range.from, range.to]);
  const hours = useMemo(() => byHour(shown), [shown]);
  const stillInside = useMemo(() => shown.filter((x) => !x.outAt).sort((a, b) => (a.inAt > b.inAt ? 1 : -1)), [shown]);

  const hostOpts = useMemo(() => distinct(visits, (x) => x.hostName).map((x) => ({ value: x, label: x })), [visits]);
  const purposeOpts = useMemo(() => PURPOSES.map((c) => ({ value: c.value, label: c.en })), []);

  const periodText = periodLabel({ mode, anchor }, range.from, range.to);

  /* ----------------- day-wise · month-wise · year-wise totals -------------- */
  // Day-wise: every day of the period, counted from the rows on screen (same search + filters).
  const dayRows = useMemo(() => fillPeriods(aggregatePeriods(shown, 'day', now), 'day', range.from, range.to), [shown, now, range.from, range.to]);
  // Month-wise (12 months of the period's year) and year-wise (every year) are counted on the server.
  const monthYear = range.to.getFullYear();
  const [monthRows, setMonthRows] = useState<PeriodRow[]>([]);
  const [yearRows, setYearRows] = useState<PeriodRow[]>([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState('');
  const [periodTick, setPeriodTick] = useState(0);
  const [slowQuery, setSlowQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSlowQuery(query), 350); // do not call the server on every key
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    let alive = true;
    const yearStart = new Date(monthYear, 0, 1);
    const yearEnd = monthYear === today.getFullYear() ? today : new Date(monthYear, 11, 31);
    setPeriodLoading(true);
    setPeriodError('');
    Promise.all([
      fetchPeriodSummary(api, yearStart, yearEnd, 'month', filters, slowQuery),
      fetchPeriodSummary(api, new Date(2000, 0, 1), today, 'year', filters, slowQuery),
    ])
      .then(([m, y]) => {
        if (!alive) return;
        setMonthRows(fillPeriods(m, 'month', yearStart, yearEnd));
        setYearRows(y);
      })
      .catch((e) => { if (alive) { setMonthRows([]); setYearRows([]); setPeriodError(apiErrorText(e)); } })
      .finally(() => { if (alive) setPeriodLoading(false); });
    return () => { alive = false; };
  }, [api, monthYear, today, filters, slowQuery, periodTick]);
  const periodRows = group === 'day' ? dayRows : group === 'month' ? monthRows : yearRows;

  /** Tap a row: year → its months, month → its days, day → the register of that day. */
  const openPeriod = (row: PeriodRow) => {
    const next = periodKeyRange(row.key, group);
    setPeriod(next.mode, next.anchor);
    if (group === 'year') setGroup('month');
    else if (group === 'month') setGroup('day');
    else setTab('register');
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const nFilters = activeFilterCount(filters);
  const filterChips: { key: keyof Filters; text: string }[] = [
    filters.status ? { key: 'status' as const, text: STATUS_OPTIONS.find((o) => o.value === filters.status)?.label || '' } : null,
    filters.purpose ? { key: 'purpose' as const, text: labelOf(PURPOSES, filters.purpose) } : null,
    filters.host ? { key: 'host' as const, text: `To meet: ${filters.host}` } : null,
  ].filter(Boolean) as { key: keyof Filters; text: string }[];

  /* ------------------------------- actions ------------------------------- */
  const [detail, setDetail] = useState<Visit | null>(null);
  const [person, setPerson] = useState<VisitorRow | null>(null);
  const [exporting, setExporting] = useState<'' | 'print'>('');
  // Excel / PDF open a preview first; the snapshot keeps the preview stable while it is open
  const [preview, setPreview] = useState<{ kind: PreviewKind; input: ExportInput } | null>(null);
  const [guide, setGuide] = useState(false);
  const [viewer, setViewer] = useState<{ photos: VisitPhoto[]; index: number } | null>(null);
  const [editing, setEditing] = useState<Visit | null>(null);
  const [suggestions, setSuggestions] = useState<VisitorSuggestions>(NO_SUGGESTIONS);
  const [toast, setToast] = useState<ToastMsg>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const say = (text: string, kind: 'ok' | 'error' = 'ok') => setToast({ text, kind, id: Date.now() });

  const openEdit = (x: Visit) => {
    setDetail(null);
    setPerson(null);
    setEditing(x);
    fetchSuggestions(api).then(setSuggestions).catch(() => undefined);
  };

  const onEdited = (saved: Visit[]) => {
    const map = new Map(saved.map((x) => [x.id, x]));
    setVisits((list) => list.map((x) => map.get(x.id) || x));
    setPeriodTick((n) => n + 1);
    setEditing(null);
    say('Changes saved');
  };

  const askDelete = (x: Visit) => {
    AppAlert.alert('Delete this entry?', `The entry of ${displayName(x)} (${x.visitNo}) and its photos will be removed. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteVisit(api, x.id)
            .then(() => {
              setVisits((list) => list.filter((y) => y.id !== x.id));
              setPeriodTick((n) => n + 1);
              setDetail(null);
              setEditing(null);
              setPerson(null);
              say('Entry deleted');
            })
            .catch((e) => say(apiErrorText(e), 'error'));
        },
      },
    ]);
  };

  const goRegister = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setTab('register');
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const exportInput = (): ExportInput => ({
    title: 'Visitors Report',
    company: 'MADHUSUDHAN FABRICS',
    period: periodText,
    filtersText: [...filterChips.map((c) => c.text), query.trim() ? `Search: ${query.trim()}` : ''].filter(Boolean).join(' · '),
    visits: sorted,
    visitors,
    kpis,
    purposes,
    hosts,
    companies,
    dayRows,
    monthRows,
    yearRows,
    monthYear,
    generatedBy: username || 'User',
    now: new Date(),
  });

  const nothing = () => AppAlert.alert('Nothing to export', 'There are no visits for the selected period and filters.');

  /** Excel / PDF: open the preview (download is inside it). */
  const openPreview = (kind: PreviewKind) => {
    if (!shown.length) { nothing(); return; }
    setPreview({ kind, input: exportInput() });
  };

  const runPrint = async () => {
    if (exporting) return;
    if (!shown.length) { nothing(); return; }
    setExporting('print');
    try {
      await printReport(exportInput());
    } catch (e: any) {
      AppAlert.alert('Print failed', e?.message || 'Could not print. Please try again.');
    } finally {
      setExporting('');
    }
  };

  /* -------------------------------- render ------------------------------- */
  const Head = (
    <View style={st.head}>
      {/* period */}
      <View style={st.card}>
        <View style={st.rowBetween}>
          <Text style={st.eyebrow}>PERIOD</Text>
          <Text style={st.period}>{periodText}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.rangeRow}>
          {PRESETS.map((r) => {
            const on = preset === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[st.chip, on && st.chipOn]}
                onPress={() => { const p = presetPeriod(r.key, today, custom); setPeriod(p.mode, p.anchor); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[st.chipText, on && { color: '#fff' }]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {stepping ? (
          <View style={st.stepRow}>
            <TouchableOpacity style={st.stepBtn} onPress={() => setAnchor(stepAnchor(mode, anchor, -1))} accessibilityRole="button" accessibilityLabel={`Previous ${mode}`}>
              <Icon name="chevron-left" size={24} color={T.nav} />
            </TouchableOpacity>
            <View style={st.stepMid}>
              <Text style={st.stepKind}>{mode === 'day' ? 'DAY' : mode === 'month' ? 'MONTH' : 'YEAR'}</Text>
              <Text style={st.stepLabel} numberOfLines={1}>{periodText}</Text>
            </View>
            <TouchableOpacity
              style={[st.stepBtn, !canStepNext && { opacity: 0.35 }]}
              disabled={!canStepNext}
              onPress={() => setAnchor(stepAnchor(mode, anchor, 1))}
              accessibilityRole="button"
              accessibilityLabel={`Next ${mode}`}
            >
              <Icon name="chevron-right" size={24} color={T.nav} />
            </TouchableOpacity>
          </View>
        ) : null}
        {mode === 'custom' ? (
          <View style={st.customRow}>
            <DateTimeField
              label="From"
              mode="date"
              value={custom.from}
              text={fmtDate(custom.from)}
              maximumDate={new Date()}
              onPick={(d) => { setCustom((c) => ({ from: d, to: d > c.to ? d : c.to })); }}
              style={st.dateField}
            />
            <DateTimeField
              label="To"
              mode="date"
              value={custom.to}
              text={fmtDate(custom.to)}
              maximumDate={new Date()}
              onPick={(d) => { setCustom((c) => ({ from: d < c.from ? d : c.from, to: d })); }}
              style={st.dateField}
            />
          </View>
        ) : null}
      </View>

      {/* search + filters + export */}
      <View style={st.tools}>
        <View style={st.search}>
          <Icon name="search" size={19} color={T.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, mobile, company, pass no…"
            placeholderTextColor={T.muted}
            style={[st.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search visits"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={HIT} accessibilityLabel="Clear search">
              <Icon name="cancel" size={18} color={T.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={st.toolBtns}>
          <TouchableOpacity style={[st.tool, nFilters > 0 && st.toolOn]} onPress={() => { setDraft(filters); setFilterOpen(true); }} accessibilityRole="button">
            <Icon name="filter-list" size={18} color={nFilters ? '#fff' : T.nav} />
            <Text style={[st.toolText, nFilters > 0 && { color: '#fff' }]}>Filters{nFilters ? ` (${nFilters})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.tool} onPress={() => setGuide(true)} accessibilityRole="button" accessibilityLabel="Guide">
            <Icon name="help-outline" size={18} color={T.nav} />
            <Text style={st.toolText}>Guide</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.tool} onPress={load} disabled={loading} accessibilityRole="button" accessibilityLabel="Refresh">
            {loading ? <ActivityIndicator size="small" color={T.nav} /> : <Icon name="refresh" size={18} color={T.nav} />}
            {wide ? <Text style={st.toolText}>Refresh</Text> : null}
          </TouchableOpacity>
          {canExport ? (
            <>
              <TouchableOpacity style={st.tool} onPress={() => openPreview('excel')} accessibilityRole="button" accessibilityLabel="Excel: preview and download">
                <Icon name="table-view" size={18} color={T.green} />
                <Text style={st.toolText}>Excel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.tool} onPress={() => openPreview('pdf')} accessibilityRole="button" accessibilityLabel="PDF: preview and download">
                <Icon name="picture-as-pdf" size={18} color={T.red} />
                <Text style={st.toolText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.tool} onPress={runPrint} disabled={!!exporting} accessibilityRole="button" accessibilityLabel="Print">
                {exporting === 'print' ? <ActivityIndicator size="small" color={T.nav} /> : <Icon name="print" size={18} color={T.nav} />}
                <Text style={st.toolText}>Print</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>

      {filterChips.length ? (
        <View style={st.activeRow}>
          {filterChips.map((c) => (
            <TouchableOpacity key={c.key} style={st.active} onPress={() => setFilters((f) => ({ ...f, [c.key]: '' }))} accessibilityRole="button" accessibilityLabel={`Remove filter ${c.text}`}>
              <Text style={st.activeText} numberOfLines={1}>{c.text}</Text>
              <Icon name="close" size={14} color={T.nav} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setFilters(NO_FILTERS)} hitSlop={HIT} accessibilityRole="button">
            <Text style={st.clearAll}>Clear all</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!!loadedAt && !loading ? (
        <Text style={st.meta}>
          Loaded {fmtTime(loadedAt)} · {visits.length.toLocaleString('en-IN')} visits in period
          {shown.length !== visits.length ? ` · ${shown.length.toLocaleString('en-IN')} match filters` : ''}
        </Text>
      ) : null}

      {/* KPIs */}
      <View style={st.kpiRow}>
        <Kpi label="VISITS" value={kpis.visits.toLocaleString('en-IN')} sub={`${kpis.persons.toLocaleString('en-IN')} persons`} color={T.nav} />
        <Kpi label="UNIQUE VISITORS" value={kpis.unique.toLocaleString('en-IN')} sub={`${kpis.repeat} repeat`} color={T.yd} />
        <Kpi label="STILL INSIDE" value={String(kpis.inside)} sub="not marked OUT" color={T.green} onPress={kpis.inside ? () => goRegister({ status: 'inside' }) : undefined} />
        <Kpi label="INSIDE TOO LONG" value={String(kpis.overstay)} sub="over 8 h / overnight" color={T.red} onPress={kpis.overstay ? () => goRegister({ status: 'overstay' }) : undefined} />
        <Kpi label="AVERAGE STAY" value={fmtDuration(kpis.avgStay)} sub="finished visits" color={T.copper} />
        <Kpi label="WITH PHOTOS" value={String(kpis.withPhoto)} sub={`${kpis.photos} photos in total`} color={T.purple} />
      </View>

      {/* tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={st.tabs}>
        {([
          ['summary', 'Summary'],
          ['periods', 'Day / Month / Year'],
          ['register', `Register (${shown.length})`],
          ['visitors', `Visitors (${visitors.length})`],
        ] as [Tab, string][]).map(([key, label]) => {
          const on = tab === key;
          return (
            <TouchableOpacity key={key} style={[st.tab, on && st.tabOn]} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[st.tabText, on && { color: '#fff' }]} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* day-wise · month-wise · year-wise */}
      {tab === 'periods' && !loading && !error ? (
        <View style={st.card}>
          <View style={st.groupRow}>
            {([['day', 'Day-wise'], ['month', 'Month-wise'], ['year', 'Year-wise']] as [PeriodGroup, string][]).map(([key, label]) => {
              const on = group === key;
              return (
                <TouchableOpacity key={key} style={[st.chip, on && st.chipOn]} onPress={() => setGroup(key)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[st.chipText, on && { color: '#fff' }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={st.groupNote}>
            {group === 'day' ? `Every day of ${periodText}. Tap a day to open its register.`
              : group === 'month' ? `The months of ${monthYear}. Tap a month to see its days.`
                : 'Every year. Tap a year to see its months.'}
            {nFilters || query.trim() ? ' Search and filters are applied.' : ''}
          </Text>
          {group !== 'day' && periodLoading ? (
            <View style={st.state}><ActivityIndicator color={T.copper} /><Text style={st.stateText}>Counting…</Text></View>
          ) : group !== 'day' && periodError ? (
            <TouchableOpacity style={st.state} onPress={() => setPeriodTick((n) => n + 1)} accessibilityRole="button">
              <Icon name="cloud-off" size={28} color={T.red} />
              <Text style={[st.stateText, { color: T.red }]}>{periodError}</Text>
              <Text style={st.link}>Tap to retry</Text>
            </TouchableOpacity>
          ) : (
            <PeriodTable rows={periodRows} group={group} wide={wide} onOpen={openPeriod} />
          )}
        </View>
      ) : null}

      {tab === 'register' && shown.length > 0 ? (
        <View style={st.sortRow}>
          <Text style={st.sortLbl}>SORT</Text>
          {SORTS.map((s) => {
            const on = sort === s.key;
            return (
              <TouchableOpacity key={s.key} style={[st.sortChip, on && st.chipOn]} onPress={() => setSort(s.key)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[st.sortText, on && { color: '#fff' }]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {tab === 'register' && table && shown.length > 0 ? <RegisterHead xl={xl} /> : null}
      {tab === 'visitors' && table && visitors.length > 0 ? <VisitorsHead /> : null}

      {tab === 'summary' && !loading && !error && shown.length > 0 ? (
        <View style={st.grid}>
          <Panel title={oneDay ? 'Visits by hour (in time)' : 'Visits per day'} icon="bar-chart" full>
            <Columns data={oneDay ? hours : days} color={T.yd} />
          </Panel>
          {!oneDay ? (
            <Panel title="Busy hours (in time)" icon="schedule" full={!wide}>
              <Columns data={hours} color={T.copper} />
            </Panel>
          ) : null}
          <Panel title="Purpose of visit" icon="help-outline">
            <Bars data={purposes} color={T.copper} onPress={(s) => goRegister({ purpose: s.key })} />
          </Panel>
          <Panel title="Whom they came to meet (top 8)" icon="support-agent">
            <Bars data={hosts} color={T.nav} onPress={(s) => goRegister({ host: s.key })} />
          </Panel>
          <Panel title="Top companies (top 8)" icon="business">
            <Bars data={companies} color={T.purple} onPress={(s) => { setQuery(s.key); setTab('register'); }} />
          </Panel>
          <Panel title={`Still inside (${stillInside.length})`} icon="login">
            {stillInside.length ? stillInside.slice(0, 8).map((x) => {
              const s = STATUS[statusOf(x, now)];
              return (
                <TouchableOpacity key={x.id} style={st.insideRow} onPress={() => setDetail(x)} accessibilityRole="button">
                  <Avatar uri={facePhoto(x)} name={displayName(x)} size={34} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.insideName} numberOfLines={1}>{displayName(x)}</Text>
                    <Text style={st.insideSub} numberOfLines={1}>{[x.company, x.hostName ? `to meet ${x.hostName}` : ''].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[st.insideDur, { color: s.color }]}>{fmtDuration(stayMinutes(x, now))}</Text>
                    <Text style={st.insideSub}>since {fmtTime(x.inAt)}{dayKey(x.inAt) !== dayKey(now) ? `, ${fmtDate(x.inAt).slice(0, 6)}` : ''}</Text>
                  </View>
                </TouchableOpacity>
              );
            }) : <Text style={st.none}>Everyone in this period has been marked OUT.</Text>}
            {stillInside.length > 8 ? (
              <TouchableOpacity onPress={() => goRegister({ status: 'inside' })} accessibilityRole="button">
                <Text style={st.link}>See all {stillInside.length} in the register</Text>
              </TouchableOpacity>
            ) : null}
          </Panel>
        </View>
      ) : null}
    </View>
  );

  const data: any[] = loading || error ? [] : tab === 'register' ? sorted : tab === 'visitors' ? visitors : [];
  const periodsTab = tab === 'periods'; // has its own content even when the period has no visits

  const Empty = loading ? (
    <View style={st.state}><ActivityIndicator color={T.copper} size="large" /><Text style={st.stateText}>Loading visits…</Text></View>
  ) : error ? (
    <TouchableOpacity style={st.state} onPress={load} accessibilityRole="button">
      <Icon name="cloud-off" size={32} color={T.red} />
      <Text style={[st.stateText, { color: T.red }]}>{error}</Text>
      <Text style={st.link}>Tap to retry</Text>
    </TouchableOpacity>
  ) : shown.length === 0 && !periodsTab ? (
    <View style={st.state}>
      <Icon name={query || nFilters ? 'search-off' : 'event-busy'} size={32} color={T.muted} />
      <Text style={st.stateText}>
        {query || nFilters ? 'No visit matches the search / filters for this period.' : `No visits recorded for ${periodText}.`}
      </Text>
      {query || nFilters ? (
        <TouchableOpacity onPress={() => { setQuery(''); setFilters(NO_FILTERS); }} accessibilityRole="button">
          <Text style={st.link}>Clear search and filters</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  ) : null;

  return (
    <View style={st.root}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(x: any) => (tab === 'visitors' ? `p-${x.key}` : `v-${x.id}`)}
        renderItem={({ item, index }: { item: any; index: number }) => (
          tab === 'visitors'
            ? <VisitorItem row={item} wide={table} index={index} onPress={() => setPerson(item)} />
            : <RegisterItem visit={item} now={now} wide={table} xl={xl} index={index} onPress={() => setDetail(item)} onPhoto={(i) => setViewer({ photos: item.photos, index: i })} />
        )}
        ListHeaderComponent={Head}
        ListEmptyComponent={Empty}
        contentContainerStyle={[st.list, wide && st.listWide]}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={25}
        windowSize={11}
      />

      {/* filters */}
      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        eyebrow="VISITORS REPORT"
        title="Filters"
        wideMax={560}
        footer={(
          <>
            <Btn label="Clear all" kind="ghost" onPress={() => setDraft(NO_FILTERS)} style={{ flex: 1 }} />
            <Btn label="Apply" icon="check" kind="copper" onPress={() => { setFilters(draft); setFilterOpen(false); }} style={{ flex: 2 }} />
          </>
        )}
      >
        <View style={st.filterGrid}>
          <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} onChange={(x) => setDraft((d) => ({ ...d, status: x as Filters['status'] }))} placeholder="All" clearable />
          <SelectField label="Purpose" value={draft.purpose} options={purposeOpts} onChange={(x) => setDraft((d) => ({ ...d, purpose: x }))} placeholder="All" clearable />
          <SelectField label="To meet" value={draft.host} options={hostOpts} onChange={(x) => setDraft((d) => ({ ...d, host: x }))} placeholder="All" clearable />
        </View>
      </Sheet>

      {/* one visitor → history */}
      <Sheet
        open={!!person && !detail}
        onClose={() => setPerson(null)}
        eyebrow="VISITOR HISTORY"
        title={person?.name || ''}
        wideMax={640}
      >
        {person ? (
          <>
            <View style={st.personTop}>
              <Avatar uri={person.photo} name={person.name} size={56} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.personName}>{person.name}</Text>
                <Text style={st.personSub}>{[person.mobile ? fmtMobile(person.mobile) : '', person.company].filter(Boolean).join(' · ') || '—'}</Text>
              </View>
            </View>
            <View style={st.kpiRow}>
              <Kpi label="VISITS" value={String(person.count)} color={T.nav} />
              <Kpi label="AVERAGE STAY" value={fmtDuration(person.avgStay)} color={T.copper} />
              <Kpi label="TOTAL TIME" value={fmtDuration(person.totalStay)} color={T.yd} />
            </View>
            <Text style={st.eyebrow}>VISITS IN THIS PERIOD</Text>
            <View>
              {person.visits.map((x) => {
                const s = STATUS[statusOf(x, now)];
                return (
                  <TouchableOpacity key={x.id} style={st.histRow} onPress={() => setDetail(x)} accessibilityRole="button">
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.histDate}>{fmtDate(x.inAt)} · {fmtTime(x.inAt)}{x.outAt ? ` – ${fmtTime(x.outAt)}` : ''}</Text>
                      <Text style={st.histSub} numberOfLines={1}>
                        {[labelOf(PURPOSES, x.purpose), x.hostName ? `to meet ${x.hostName}` : '', x.photos.length ? `${x.photos.length} photo(s)` : ''].filter(Boolean).join(' · ') || x.visitNo}
                      </Text>
                    </View>
                    <Tag label={x.outAt ? fmtDuration(stayMinutes(x, now)) : s.label} color={s.color} bg={s.bg} />
                    <Icon name="chevron-right" size={20} color={T.muted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </Sheet>

      {/* one visit → everything + photos; Edit / Delete only with those rights */}
      {detail ? (
        <VisitDetailSheet
          visit={detail}
          lang="en"
          now={now}
          group={visits.filter((x) => x.groupId === detail.groupId)}
          onClose={() => setDetail(null)}
          onOpenVisit={setDetail}
          onEdit={canEdit ? openEdit : undefined}
          onDelete={canDelete ? askDelete : undefined}
        />
      ) : null}

      {/* correct an entry in the same form the gate uses */}
      <VisitForm
        open={!!editing}
        api={api}
        lang="en"
        onLang={() => undefined}
        hideLang
        suggestions={suggestions}
        editing={editing}
        insideMobiles={NO_MOBILES}
        onClose={() => setEditing(null)}
        onSaved={onEdited}
        onDelete={canDelete ? askDelete : undefined}
      />

      <ExportPreview kind={preview ? preview.kind : null} input={preview ? preview.input : null} onClose={() => setPreview(null)} />
      <PhotoViewer photos={viewer?.photos || []} index={viewer ? viewer.index : null} onClose={() => setViewer(null)} lang="en" />
      <GuideSheet open={guide} lang="en" onClose={() => setGuide(false)} steps={REPORT_GUIDE_STEPS} title="How to use the Visitors Report" />
      <Toast msg={toast} onDone={clearToast} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function Kpi({ label, value, sub, color, onPress }: { label: string; value: string; sub?: string; color: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[st.kpi, { borderTopColor: color }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={st.kpiLbl} numberOfLines={1}>{label}</Text>
      <Text style={[st.kpiVal, { color }]} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={st.kpiSub} numberOfLines={1}>{sub}{onPress ? '  ›' : ''}</Text> : null}
    </TouchableOpacity>
  );
}

function Panel({ title, icon, children, full }: { title: string; icon: string; children: React.ReactNode; full?: boolean }) {
  return (
    <View style={[st.panel, full && { flexBasis: '100%' }]}>
      <View style={st.panelHead}>
        <Icon name={icon as any} size={17} color={T.copper} />
        <Text style={st.panelTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** Horizontal bars: label · bar · count · %. Tap = filter the register. */
function Bars({ data, color, onPress }: { data: Slice[]; color: string; onPress?: (s: Slice) => void }) {
  if (!data.length) return <Text style={st.none}>No data.</Text>;
  const max = Math.max(...data.map((x) => x.count), 1);
  return (
    <View style={{ gap: 9 }}>
      {data.map((s) => (
        <TouchableOpacity
          key={s.key || '_blank'}
          onPress={() => onPress?.(s)}
          disabled={!onPress || !s.key}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${s.label}: ${s.count} visits, ${s.pct.toFixed(0)} percent`}
        >
          <View style={st.barTop}>
            <Text style={[st.barLabel, !s.key && { color: T.muted, fontStyle: 'italic' }]} numberOfLines={1}>{s.label}</Text>
            <Text style={st.barCount}>{s.count}</Text>
            <Text style={st.barPct}>{s.pct.toFixed(0)}%</Text>
          </View>
          <View style={st.barTrack}>
            <View style={[st.barFill, { width: `${Math.max(2, (s.count / max) * 100)}%`, backgroundColor: s.key ? color : T.muted }]} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Vertical columns (per day / per hour) with the count on top. */
function Columns({ data, color }: { data: Column[]; color: string }) {
  const max = Math.max(...data.map((x) => x.count), 1);
  const dense = data.length > 16;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={st.cols}>
        {data.map((c) => (
          <View key={c.key} style={[st.col, { minWidth: dense ? 20 : 30 }]} accessibilityLabel={`${c.label} ${c.sub}: ${c.count} visits`}>
            <Text style={[st.colVal, dense && { fontSize: 9.5 }]}>{c.count || ''}</Text>
            <View style={st.colTrack}>
              <View style={[st.colFill, { height: `${(c.count / max) * 100}%`, backgroundColor: color }, c.count === 0 && { height: 2, backgroundColor: T.border }]} />
            </View>
            <Text style={st.colLbl}>{c.label}</Text>
            <Text style={st.colSub}>{c.sub}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/* ---------------------- day-wise / month-wise / year-wise ------------------ */

function PeriodTable({ rows, group, wide, onOpen }: { rows: PeriodRow[]; group: PeriodGroup; wide: boolean; onOpen: (row: PeriodRow) => void }) {
  if (!rows.length) return <Text style={st.none}>No visits.</Text>;
  const total = sumPeriods(rows);
  const max = Math.max(...rows.map((r) => r.visits), 1);
  const chart: Column[] = rows.map((r) => ({ key: r.key, ...periodKeyShort(r.key, group), count: r.visits }));
  const first = group === 'day' ? 'DAY' : group === 'month' ? 'MONTH' : 'YEAR';
  // newest first in the table (the chart keeps time order)
  const list = [...rows].reverse();

  const line = (r: PeriodRow, i: number, isTotal: boolean) => {
    const dim = !isTotal && r.visits === 0;
    const num = (v: string, strong?: boolean) => <Text style={[st.pNum, strong && st.pStrong, dim && { color: T.muted }]}>{v}</Text>;
    const body = wide ? (
      <>
        <View style={{ flex: 1.6, minWidth: 0 }}>
          <Text style={[st.pLabel, dim && { color: T.muted, fontWeight: '600' }]} numberOfLines={1}>{r.label}</Text>
          {!isTotal ? <View style={st.barTrack}><View style={[st.barFill, { width: `${(r.visits / max) * 100}%`, backgroundColor: T.yd }]} /></View> : null}
        </View>
        {num(String(r.visits), true)}
        {num(String(r.persons))}
        {num(isTotal ? '' : String(r.unique))}
        {num(String(r.out))}
        {num(String(r.inside))}
        {num(r.out ? fmtDuration(r.avgStay) : '–')}
      </>
    ) : (
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={st.rowBetween}>
          <Text style={[st.pLabel, { flex: 1 }, dim && { color: T.muted, fontWeight: '600' }]} numberOfLines={1}>{r.label}</Text>
          <Text style={[st.pBig, dim && { color: T.muted }]}>{r.visits}</Text>
          <Text style={st.pUnit}>visits</Text>
        </View>
        {!isTotal ? <View style={st.barTrack}><View style={[st.barFill, { width: `${(r.visits / max) * 100}%`, backgroundColor: T.yd }]} /></View> : null}
        {r.visits > 0 ? (
          <Text style={st.pSub} numberOfLines={2}>
            {r.persons} persons{isTotal ? '' : ` · ${r.unique} unique`} · {r.out} went out · {r.inside} inside · avg {r.out ? fmtDuration(r.avgStay) : '–'}
          </Text>
        ) : null}
      </View>
    );
    if (isTotal) return <View key="total" style={[st.pRow, st.pTotal]}>{body}</View>;
    return (
      <TouchableOpacity
        key={r.key}
        style={[st.pRow, i % 2 === 1 && { backgroundColor: '#FCFAF7' }]}
        onPress={() => onOpen(r)}
        accessibilityRole="button"
        accessibilityLabel={`${r.label}: ${r.visits} visits`}
      >
        {body}
        <Icon name="chevron-right" size={18} color={T.muted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ gap: 10 }}>
      <Columns data={chart} color={T.yd} />
      <View>
        {wide ? (
          <View style={st.pHead}>
            <Text style={[st.th, { flex: 1.6 }]}>{first}</Text>
            {['VISITS', 'PERSONS', 'UNIQUE', 'WENT OUT', 'INSIDE', 'AVG STAY'].map((h) => <Text key={h} style={[st.th, st.pNumHead]}>{h}</Text>)}
            <View style={{ width: 18 }} />
          </View>
        ) : null}
        {list.map((r, i) => line(r, i, false))}
        {line(total, 0, true)}
      </View>
      <Text style={st.groupNote}>“Unique” counts each person once inside that {group}; it is not added up in the total because the same person can come in several {group}s.</Text>
    </View>
  );
}

/* ------------------------------- register rows --------------------------- */

const W = { no: 108, date: 92, time: 76, stay: 78, status: 86, photos: 146 };

function RegisterHead({ xl }: { xl: boolean }) {
  return (
    <View style={st.thead}>
      <Text style={[st.th, { width: W.no }]}>PASS NO.</Text>
      <Text style={[st.th, { width: W.date }]}>DATE</Text>
      <Text style={[st.th, { flex: 1.5 }]}>VISITOR</Text>
      <Text style={[st.th, { flex: 1.3 }]}>COMPANY</Text>
      <Text style={[st.th, { flex: 1.2 }]}>PURPOSE</Text>
      <Text style={[st.th, { flex: 1.2 }]}>TO MEET</Text>
      <Text style={[st.th, { width: W.photos }]}>PHOTOS</Text>
      <Text style={[st.th, { width: W.time }]}>IN</Text>
      <Text style={[st.th, { width: W.time }]}>OUT</Text>
      <Text style={[st.th, { width: W.stay, textAlign: 'right' }]}>STAY</Text>
      <Text style={[st.th, { width: W.status, textAlign: 'right' }]}>STATUS</Text>
    </View>
  );
}

function RegisterItem({ visit, now, wide, xl, index, onPress, onPhoto }: {
  visit: Visit; now: Date; wide: boolean; xl: boolean; index: number; onPress: () => void; onPhoto: (index: number) => void;
}) {
  const s = STATUS[statusOf(visit, now)];
  const name = displayName(visit);
  const stay = fmtDuration(stayMinutes(visit, now));
  const purpose = labelOf(PURPOSES, visit.purpose);

  if (wide) {
    return (
      <TouchableOpacity style={[st.tr, index % 2 === 1 && { backgroundColor: '#FCFAF7' }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Visit of ${name}`}>
        <Text style={[st.td, st.mono, { width: W.no }]} numberOfLines={1}>{visit.visitNo}</Text>
        <Text style={[st.td, { width: W.date }]} numberOfLines={1}>{fmtDate(visit.inAt).slice(0, 6)}</Text>
        <View style={{ flex: 1.5, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar uri={facePhoto(visit)} name={name} size={30} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.tdStrong} numberOfLines={1}>{name}</Text>
            <Text style={st.tdSub} numberOfLines={1}>
              {visit.mobile ? fmtMobile(visit.mobile) : '—'}{visit.groupSize > 1 ? ` · group of ${visit.groupSize}` : ''}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1.3, minWidth: 0 }}>
          <Text style={st.td} numberOfLines={2}>{visit.company || '—'}</Text>
        </View>
        <View style={{ flex: 1.2, minWidth: 0 }}>
          <Text style={st.td} numberOfLines={1}>{purpose || '—'}</Text>
          {visit.purposeNote ? <Text style={st.tdSub} numberOfLines={1}>{visit.purposeNote}</Text> : null}
        </View>
        <View style={{ flex: 1.2, minWidth: 0 }}>
          <Text style={st.td} numberOfLines={1}>{visit.hostName || '—'}</Text>
        </View>
        <View style={{ width: W.photos }}>
          {visit.photos.length ? <PhotoThumbs photos={visit.photos} onOpen={onPhoto} max={3} size={30} /> : <Text style={st.tdSub}>—</Text>}
        </View>
        <Text style={[st.td, st.mono, { width: W.time }]} numberOfLines={1}>{fmtTime(visit.inAt)}</Text>
        <Text style={[st.td, st.mono, { width: W.time }]} numberOfLines={1}>{visit.outAt ? fmtTime(visit.outAt) : '—'}</Text>
        <Text style={[st.td, st.mono, { width: W.stay, textAlign: 'right', color: s.color, fontWeight: '700' }]} numberOfLines={1}>{stay}</Text>
        <View style={{ width: W.status, alignItems: 'flex-end' }}><Tag label={s.label} color={s.color} bg={s.bg} /></View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={st.mCard} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Visit of ${name}`}>
      <View style={[st.rail, { backgroundColor: s.color }]} />
      <Avatar uri={facePhoto(visit)} name={name} size={42} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={st.rowBetween}>
          <Text style={[st.tdStrong, { flex: 1, fontSize: 14.5 }]} numberOfLines={1}>{name}</Text>
          <Tag label={s.label} color={s.color} bg={s.bg} />
        </View>
        <Text style={st.tdSub} numberOfLines={1}>{[visit.company, visit.mobile ? fmtMobile(visit.mobile) : ''].filter(Boolean).join(' · ') || '—'}</Text>
        <Text style={[st.td, { marginTop: 3 }]} numberOfLines={1}>
          {[purpose, visit.hostName ? `to meet ${visit.hostName}` : ''].filter(Boolean).join(' · ') || '—'}
        </Text>
        <Text style={[st.tdSub, { marginTop: 3 }]} numberOfLines={2}>
          {fmtDate(visit.inAt).slice(0, 6)} · {fmtTime(visit.inAt)} – {visit.outAt ? fmtTime(visit.outAt) : '…'} · <Text style={{ color: s.color, fontWeight: '800' }}>{stay}</Text>
        </Text>
        {visit.photos.length ? (
          <View style={{ marginTop: 7 }}>
            <PhotoThumbs photos={visit.photos} onOpen={onPhoto} max={5} size={44} />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function VisitorsHead() {
  return (
    <View style={st.thead}>
      <Text style={[st.th, { flex: 1.6 }]}>VISITOR</Text>
      <Text style={[st.th, { flex: 1.4 }]}>COMPANY</Text>
      <Text style={[st.th, { width: 70, textAlign: 'right' }]}>VISITS</Text>
      <Text style={[st.th, { width: 100, textAlign: 'right' }]}>FIRST VISIT</Text>
      <Text style={[st.th, { width: 100, textAlign: 'right' }]}>LAST VISIT</Text>
      <Text style={[st.th, { width: 96, textAlign: 'right' }]}>AVG STAY</Text>
      <Text style={[st.th, { width: 96, textAlign: 'right' }]}>TOTAL TIME</Text>
    </View>
  );
}

function VisitorItem({ row, wide, index, onPress }: { row: VisitorRow; wide: boolean; index: number; onPress: () => void }) {
  if (wide) {
    return (
      <TouchableOpacity style={[st.tr, index % 2 === 1 && { backgroundColor: '#FCFAF7' }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`History of ${row.name}`}>
        <View style={{ flex: 1.6, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar uri={row.photo} name={row.name} size={30} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.tdStrong} numberOfLines={1}>{row.name}</Text>
            <Text style={st.tdSub} numberOfLines={1}>{row.mobile ? fmtMobile(row.mobile) : '—'}{row.insideNow ? ' · inside now' : ''}</Text>
          </View>
        </View>
        <View style={{ flex: 1.4, minWidth: 0 }}>
          <Text style={st.td} numberOfLines={2}>{row.company || '—'}</Text>
        </View>
        <Text style={[st.tdStrong, st.mono, { width: 70, textAlign: 'right' }]}>{row.count}</Text>
        <Text style={[st.td, { width: 100, textAlign: 'right' }]} numberOfLines={1}>{fmtDate(row.firstInAt).slice(0, 6)}</Text>
        <Text style={[st.td, { width: 100, textAlign: 'right' }]} numberOfLines={1}>{fmtDate(row.lastInAt).slice(0, 6)}</Text>
        <Text style={[st.td, st.mono, { width: 96, textAlign: 'right' }]} numberOfLines={1}>{fmtDuration(row.avgStay)}</Text>
        <Text style={[st.td, st.mono, { width: 96, textAlign: 'right' }]} numberOfLines={1}>{fmtDuration(row.totalStay)}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={st.mCard} onPress={onPress} accessibilityRole="button" accessibilityLabel={`History of ${row.name}`}>
      <Avatar uri={row.photo} name={row.name} size={42} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[st.tdStrong, { fontSize: 14.5 }]} numberOfLines={1}>{row.name}</Text>
        <Text style={st.tdSub} numberOfLines={1}>{[row.mobile ? fmtMobile(row.mobile) : '', row.company].filter(Boolean).join(' · ') || '—'}</Text>
        <Text style={[st.tdSub, { marginTop: 3 }]} numberOfLines={1}>
          Last {fmtDate(row.lastInAt).slice(0, 6)} · avg {fmtDuration(row.avgStay)}{row.insideNow ? ' · inside now' : ''}
        </Text>
      </View>
      <View style={st.countBox}>
        <Text style={st.countVal}>{row.count}</Text>
        <Text style={st.countLbl}>{row.count === 1 ? 'visit' : 'visits'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  list: { padding: 12, paddingBottom: 40 },
  listWide: { maxWidth: 1320, width: '100%', alignSelf: 'center', paddingHorizontal: 18 },
  head: { gap: 10, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },

  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, gap: 10 },
  eyebrow: { fontSize: 10, fontWeight: '900', color: T.muted, letterSpacing: 0.8 },
  period: { fontSize: 13.5, fontWeight: '800', color: T.nav },
  rangeRow: { flexDirection: 'row', gap: 7, paddingRight: 4 },
  chip: { height: 38, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: T.nav, borderColor: T.nav },
  chipText: { fontSize: 12.5, fontWeight: '800', color: T.ink },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 44, height: 42, borderRadius: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  stepMid: { flex: 1, minHeight: 42, borderRadius: 10, backgroundColor: T.sub, borderWidth: 1, borderColor: T.hair, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  stepKind: { fontSize: 8.5, fontWeight: '900', color: T.copper, letterSpacing: 1 },
  stepLabel: { fontSize: 14.5, fontWeight: '800', color: T.nav },
  groupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  groupNote: { fontSize: 11.5, color: T.muted, fontWeight: '600' },
  pHead: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.nav, borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingHorizontal: 10, height: 34 },
  pNumHead: { width: 84, textAlign: 'right' },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: T.hair },
  pTotal: { backgroundColor: T.alt, borderTopWidth: 1.5, borderTopColor: T.nav, paddingRight: 36 },
  pLabel: { fontSize: 13, fontWeight: '800', color: T.ink },
  pNum: { width: 84, textAlign: 'right', fontSize: 12.5, fontWeight: '600', color: T.ink, fontFamily: MONO },
  pStrong: { fontWeight: '800', fontSize: 13.5 },
  pBig: { fontSize: 17, fontWeight: '800', color: T.nav, fontFamily: MONO },
  pUnit: { fontSize: 10.5, color: T.muted, fontWeight: '600' },
  pSub: { fontSize: 11, color: T.muted, marginTop: 4 },
  customRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dateField: { flexGrow: 1, flexBasis: 150 },

  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  search: {
    flexGrow: 1, flexBasis: 260, flexDirection: 'row', alignItems: 'center', gap: 7, height: 42, backgroundColor: T.surface,
    borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 11,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 13.5, color: T.ink, paddingVertical: 0, height: 40 },
  toolBtns: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', flexShrink: 1, maxWidth: '100%' },
  tool: {
    flexDirection: 'row', alignItems: 'center', gap: 5, height: 42, minWidth: 44, justifyContent: 'center', paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
  },
  toolOn: { backgroundColor: T.nav, borderColor: T.nav },
  toolText: { fontSize: 12.5, fontWeight: '800', color: T.nav },
  activeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' },
  active: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#E9F1F6', maxWidth: '100%' },
  activeText: { fontSize: 12, fontWeight: '700', color: T.nav, flexShrink: 1 },
  clearAll: { fontSize: 12.5, fontWeight: '800', color: T.copper, paddingHorizontal: 4 },
  meta: { fontSize: 10.5, color: T.muted, fontWeight: '600', marginTop: -3 },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: {
    flexGrow: 1, flexBasis: 138, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border,
    borderTopWidth: 3, paddingHorizontal: 10, paddingVertical: 8,
  },
  kpiLbl: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.4 },
  kpiVal: { fontSize: 19, fontWeight: '800', fontFamily: MONO, marginTop: 2 },
  kpiSub: { fontSize: 10, color: T.muted, marginTop: 1 },

  tabs: { flexGrow: 1, flexDirection: 'row', backgroundColor: T.alt, borderRadius: 10, padding: 3, gap: 3 },
  tab: { flexGrow: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  tabOn: { backgroundColor: T.nav },
  tabText: { fontSize: 12.5, fontWeight: '800', color: T.nav },

  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  sortLbl: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.5, marginRight: 2 },
  sortChip: { height: 34, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  sortText: { fontSize: 11.5, fontWeight: '800', color: T.ink },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  panel: { flexGrow: 1, flexBasis: 330, minWidth: 0, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, gap: 10, ...S.card },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  panelTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: T.nav },
  none: { fontSize: 12.5, color: T.muted },
  link: { fontSize: 12.5, color: T.copper, fontWeight: '800', marginTop: 2 },

  barTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  barLabel: { flex: 1, fontSize: 12.5, fontWeight: '700', color: T.ink },
  barCount: { fontSize: 12.5, fontWeight: '800', color: T.ink, fontFamily: MONO },
  barPct: { width: 36, textAlign: 'right', fontSize: 10.5, color: T.muted, fontFamily: MONO },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: T.alt, marginTop: 4, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },

  cols: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 150 },
  col: { flex: 1, alignItems: 'center' },
  colVal: { fontSize: 10.5, fontWeight: '800', color: T.ink, fontFamily: MONO, height: 14 },
  colTrack: { height: 96, width: '100%', maxWidth: 34, justifyContent: 'flex-end', marginTop: 2 },
  colFill: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 2 },
  colLbl: { fontSize: 10, fontWeight: '800', color: T.ink, marginTop: 4 },
  colSub: { fontSize: 9, color: T.muted },

  insideRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, paddingVertical: 5, borderTopWidth: 1, borderTopColor: T.hair },
  insideName: { fontSize: 13, fontWeight: '800', color: T.ink },
  insideSub: { fontSize: 10.5, color: T.muted },
  insideDur: { fontSize: 12.5, fontWeight: '800', fontFamily: MONO },

  thead: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.nav, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingHorizontal: 12, height: 36, marginBottom: -8 },
  th: { fontSize: 9.5, fontWeight: '900', color: 'rgba(255,255,255,0.86)', letterSpacing: 0.5 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.hair, borderLeftWidth: 1, borderRightWidth: 1, borderLeftColor: T.border, borderRightColor: T.border },
  td: { fontSize: 12.5, color: T.ink, fontWeight: '600' },
  tdStrong: { fontSize: 13, color: T.ink, fontWeight: '800' },
  tdSub: { fontSize: 11, color: T.muted, marginTop: 1 },
  mono: { fontFamily: MONO },

  mCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    padding: 10, paddingLeft: 13, marginTop: 8, overflow: 'hidden',
  },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  countBox: { alignItems: 'center', minWidth: 48, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: T.sub },
  countVal: { fontSize: 18, fontWeight: '900', color: T.nav, fontFamily: MONO },
  countLbl: { fontSize: 9.5, color: T.muted, fontWeight: '700' },

  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, paddingHorizontal: 24, gap: 8 },
  stateText: { fontSize: 13, color: T.muted, textAlign: 'center', fontWeight: '600' },

  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  personTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personName: { fontSize: 17, fontWeight: '800', color: T.ink },
  personSub: { fontSize: 12.5, color: T.muted, marginTop: 2 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingVertical: 7, borderTopWidth: 1, borderTopColor: T.hair },
  histDate: { fontSize: 13, fontWeight: '800', color: T.ink },
  histSub: { fontSize: 11.5, color: T.muted, marginTop: 1 },
});
