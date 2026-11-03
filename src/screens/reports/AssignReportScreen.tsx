// FILE: src/screens/reports/AssignReportScreen.tsx
// Reports → Assign Report — the web ERP's "Reports" (src/views/UserDashbord/components/Reports/Reports.js) on
// FlowNest, same functionality, same backend (nothing changed on the server):
//
//   ‹ Reports
//   Assign Report                                            [↻]
//   [Report ⌄]  [Setting ⌄]   from date  to date / as on date   [Load report]
//   rows · columns · groups     [⌕ search every column]  [Filters]  [Group]
//   | COL 1 ▾ | COL 2 | COL 3 |          tap a header -> sort, tap again -> flip
//   | filter  | filter| filter|          (Filters on: one text filter per column, "contains")
//   rows … (grouped by the report's group columns, each group with its own totals, tap to fold)
//   TOTAL   sum / count / average columns of the report
//
//   GET  /api/get_user_saved_report_settings  the reports assigned to the login + their saved settings
//                                              (+ currentdate, week / month start & end for the defaults)
//   POST /api/rpt_gateway                      the whole saved setting, with the dates the user set
//        -> rows + rptsettings (columns, widths, alignment, number format, totals, group columns, hidden columns)
//        -> or a file (export pdf / excel): opened / downloaded on web, shared on the phone
//
//   [Mail schedule]  the web's Mail Scheduler (rptmailscheduleshow / browse / add / edit / delete)
//   [Excel] [PDF]    after a load: the grid exactly as shown (columns, search, filters, sort, groups, sub totals,
//                    TOTAL, colours) → preview → download / share / print. Always a grid, also from "Cards".
//
// Right: management.reports.assign_report (Permission Manager → Management → Reports → Assign Report).
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { DyeingDateField } from '../dyeing/DyeingDateField';
import { AssignReportAPI, GatewayAnswer, SavedReport, SavedSetting, SettingsAnswer } from './assignReport/assignReportApi';
import {
  buildColumns, buildPayload, cellText, cellTint, Col, dateKeysOf, defaultDates, defaultSort, filterRows, fromISO, Group, groupRows,
  Row, rowTint, Sort, sortRows, toISO, totalsOf, totalText,
} from './assignReport/assignReportModel';
import { saveExportFile } from './assignReport/assignReportExport';
import { MailSchedulerSheet } from './assignReport/MailSchedulerSheet';
import { ExportInput } from './assignReport/reportExportModel';
import { ExportKind, ReportExportPreview } from './assignReport/ReportExportPreview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" });
const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
const ROW_H = 32;
const CARD_PAD = 4;

/** date box: web = a real <input type=date> styled with theme tokens (dark theme converts them); phone = the picker */
function DateBox({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type: 'date', value, max: '2099-12-31',
      onChange: (e: any) => { if (e?.target?.value) onChange(String(e.target.value)); },
      style: { borderWidth: 1, borderStyle: 'solid', borderColor: T.border, borderRadius: 8, padding: '7px 9px', fontSize: 12, fontFamily: 'monospace', color: T.ink, backgroundColor: T.surface, outline: 'none', minWidth: 140 },
    });
  }
  return <DyeingDateField value={value} onChange={onChange} max="2099-12-31" compact />;
}

const dateLabel = (k: string) => {
  const s = k.replace(/_/g, ' ');
  if (/^fromdate$/i.test(k)) return 'From date';
  if (/^todate$/i.test(k)) return 'To date';
  if (/^asondate$/i.test(k)) return 'As on date';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

type Item =
  | { kind: 'row'; key: string; row: Row; depth: number }
  | { kind: 'group'; key: string; group: Group; depth: number; open: boolean }
  | { kind: 'gtotal'; key: string; group: Group; depth: number };

export default function AssignReportScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 700;
  // font size by screen: phone 11.5 · tablet 12.5 · desktop 13 — every value stays fully readable
  const fs = width < 420 ? 11.5 : width < 900 ? 12.5 : 13;
  const [criteriaOpen, setCriteriaOpen] = useState(true);
  const [view, setView] = useState<'grid' | 'cards'>('grid');
  const [mailOpen, setMailOpen] = useState(false);
  // Excel / PDF: Permission Manager → Management → Reports → Assign Report → Export
  const { canDo } = usePermission();
  const canExport = canDo('management.reports.assign_report', 'export');

  /* ------------------------------ settings ------------------------------- */
  const [sv, setSv] = useState<SettingsAnswer | null>(null);
  const [svLoading, setSvLoading] = useState(true);
  const [svError, setSvError] = useState('');
  const [rptid, setRptid] = useState<string>('');
  const [setting, setSetting] = useState<string>('');
  const [dates, setDates] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<'report' | 'setting' | null>(null);

  const loadSettings = useCallback(async () => {
    setSvLoading(true);
    setSvError('');
    try {
      const a = await AssignReportAPI.settings();
      setSv(a);
    } catch (e: any) {
      setSv(null);
      setSvError(e?.message || 'Could not load your reports.');
    } finally {
      setSvLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { if (!sv) void loadSettings(); }, [sv, loadSettings]));

  const reports: SavedReport[] = sv?.reports || [];
  const report = reports.find((r) => String(r.rptid) === rptid) || null;
  const settings: SavedSetting[] = report?.settings || [];
  const sel = settings.find((s) => s.name === setting) || null;
  const dateKeys = useMemo(() => dateKeysOf(sel?.value), [sel]);

  const pickReport = (id: string) => { setRptid(id); setSetting(''); setDates({}); setAnswer(null); setPicker(null); };
  const pickSetting = (name: string) => {
    setSetting(name);
    const s = settings.find((x) => x.name === name);
    setDates(s && sv ? defaultDates(s.value, sv) : {});
    setAnswer(null);
    setPicker(null);
  };

  /* -------------------------------- run ---------------------------------- */
  const [answer, setAnswer] = useState<GatewayAnswer | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [fileMsg, setFileMsg] = useState('');
  /** what was loaded (report · setting · dates) — the export title, even if the criteria change afterwards */
  const [loaded, setLoaded] = useState<{ reportName: string; settingName: string; criteria: string[] } | null>(null);
  const reqId = useRef(0);

  const run = async () => {
    if (!sel) return;
    const id = ++reqId.current;
    setRunning(true);
    setRunError('');
    setFileMsg('');
    setFilters({});
    setSearch('');
    setFolded({});
    try {
      const a = await AssignReportAPI.run(buildPayload(sel.value, dates));
      if (id !== reqId.current) return;
      setAnswer(a);
      setLoaded({
        reportName: report?.rptname || '',
        settingName: sel.name,
        criteria: dateKeys.map((k) => `${dateLabel(k)} ${dates[k] || sel.value[k] || ''}`.trim()),
      });
      setSort(a.settings ? defaultSort(buildColumns(a.settings).cols) : null);
      if (!wide && a.rows.length > 0) setCriteriaOpen(false); // phone: the result gets the screen; "Criteria" opens it again
      if (a.file) setFileMsg(await saveExportFile(a.file));
    } catch (e: any) {
      if (id !== reqId.current) return;
      setAnswer(null);
      setRunError(e?.message || 'Could not run the report.');
    } finally {
      if (id === reqId.current) setRunning(false);
    }
  };

  /* -------------------------------- grid --------------------------------- */
  const grid = useMemo(() => (answer?.settings ? buildColumns(answer.settings) : { cols: [] as Col[], groupBy: [] as string[] }), [answer]);
  const cols = grid.cols;
  const visible = useMemo(() => cols.filter((c) => c.visible), [cols]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<Sort>(null);
  const [grouped, setGrouped] = useState(true);
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const [hideHidden, setHideHidden] = useState(true);
  const shown = hideHidden ? visible : cols;

  const rows = useMemo(() => sortRows(filterRows(answer?.rows || [], cols, filters, search), cols, sort), [answer, cols, filters, search, sort]);
  const totals = useMemo(() => totalsOf(rows, cols), [rows, cols]);
  const groups = useMemo(() => (grouped && grid.groupBy.length ? groupRows(rows, cols, grid.groupBy) : []), [grouped, grid.groupBy, rows, cols]);
  const hasTotals = cols.some((c) => c.total !== null);

  const items = useMemo<Item[]>(() => {
    if (!groups.length) return rows.map((r, i) => ({ kind: 'row', key: `r${i}`, row: r, depth: 0 }));
    const out: Item[] = [];
    const walk = (gs: Group[], depth: number) => {
      gs.forEach((g) => {
        const open = !folded[g.key];
        out.push({ kind: 'group', key: `g:${g.key}`, group: g, depth, open });
        if (!open) return;
        if (g.children) walk(g.children, depth + 1);
        else g.rows.forEach((r, i) => out.push({ kind: 'row', key: `${g.key}:${i}`, row: r, depth: depth + 1 }));
        out.push({ kind: 'gtotal', key: `t:${g.key}`, group: g, depth });
      });
    };
    walk(groups, 0);
    return out;
  }, [groups, rows, folded]);

  // column widths: the report's own; on a wide screen stretched to fill the table
  const avail = (wide ? Math.min(width, 1200) - 32 : width - 24) - 2;
  const natural = shown.reduce((s, c) => s + c.width, 0);
  const scale = natural > 0 && natural < avail ? avail / natural : 1;
  const widthOf = (c: Col) => Math.round(c.width * scale * (fs / 12));
  const tableW = shown.reduce((s, c) => s + widthOf(c), 0);

  const toggleSort = (c: Col) =>
    setSort((cur) => (cur && cur.col === c.name ? { col: c.name, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { col: c.name, dir: 'asc' }));
  const clearAll = () => { setFilters({}); setSearch(''); };
  const activeFilters = Object.values(filters).filter((v) => v.trim() !== '').length + (search.trim() ? 1 : 0);

  /* ------------------------------- export -------------------------------- */
  const [exp, setExp] = useState<{ kind: ExportKind; input: ExportInput } | null>(null);
  const openExport = (kind: ExportKind) => {
    if (!answer || !loaded || !shown.length) return;
    const applied: string[] = [];
    if (search.trim()) applied.push(`Search "${search.trim()}"`);
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) applied.push(`${cols.find((c) => c.name === k)?.header || k} contains "${v.trim()}"`);
    });
    if (sort) applied.push(`Sorted by ${cols.find((c) => c.name === sort.col)?.header || sort.col} (${sort.dir === 'desc' ? 'descending' : 'ascending'})`);
    if (groups.length) applied.push(`Grouped by ${grid.groupBy.map((g) => cols.find((c) => c.name === g)?.header || g).join(' > ')}`);
    setExp({
      kind,
      input: {
        reportName: loaded.reportName, settingName: loaded.settingName, criteria: loaded.criteria, applied,
        cols: shown, rows, groups, totals, hasTotals, totalRows: answer.rows.length, now: new Date(),
      },
    });
  };
  const openMail = () => {
    if (!sv && !svLoading) void loadSettings();
    setMailOpen(true);
  };

  const goReports = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/new/(tabs)/reports' as any);
  };

  /* ------------------------------- render -------------------------------- */
  const Cell = ({ c, v, bold, tint }: { c: Col; v: any; bold?: boolean; tint?: string | null }) => (
    <View style={[st.cell, { width: widthOf(c) }, !!tint && { backgroundColor: tint }]}>
      <Text numberOfLines={1} style={[st.cellText, { textAlign: c.align, fontSize: fs }, (c.numeric || c.digits !== null) && st.mono, bold && st.bold]}>
        {cellText(c, v)}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: Item }) => {
    if (item.kind === 'group') {
      const g = item.group;
      const n = g.rows.length;
      return (
        <TouchableOpacity onPress={() => setFolded((f) => ({ ...f, [g.key]: !f[g.key] }))} activeOpacity={0.7}
          style={[st.groupRow, { width: tableW, paddingLeft: 10 + item.depth * 14 }]}>
          <Text style={st.groupChevron}>{item.open ? '▾' : '▸'}</Text>
          <Text style={st.groupText} numberOfLines={1}>{g.label}</Text>
          <Text style={st.groupCount}>{n} row{n !== 1 ? 's' : ''}</Text>
        </TouchableOpacity>
      );
    }
    if (item.kind === 'gtotal') {
      if (!hasTotals) return null;
      return (
        <View style={[st.row, st.gtotalRow, { width: tableW }]}>
          {shown.map((c, i) => (
            <View key={c.name} style={[st.cell, { width: widthOf(c) }]}>
              <Text numberOfLines={1} style={[st.cellText, st.mono, st.bold, { textAlign: c.align, color: T.copper }]}>
                {i === 0 && c.total === null ? 'Sub total' : totalText(c, item.group.totals)}
              </Text>
            </View>
          ))}
        </View>
      );
    }
    const tint = rowTint(item.row);
    return (
      <View style={[st.row, { width: tableW }, !!tint && { backgroundColor: tint }]}>
        {shown.map((c) => <Cell key={c.name} c={c} v={item.row[c.name]} tint={cellTint(c, item.row[c.name])} />)}
      </View>
    );
  };

  const header = (
    <View style={[st.row, st.headRow, { width: tableW }]}>
      {shown.map((c) => {
        const on = sort && sort.col === c.name;
        return (
          <TouchableOpacity key={c.name} onPress={() => toggleSort(c)} style={[st.cell, { width: widthOf(c) }]} activeOpacity={0.7}>
            <Text numberOfLines={2} style={[st.headText, { textAlign: c.align, fontSize: fs - 2 }, on && { color: T.copper }, !c.visible && { color: T.muted, fontStyle: 'italic' }]}>
              {c.header}{on ? (sort!.dir === 'desc' ? ' ▾' : ' ▴') : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
  const filterRow = showFilters ? (
    <View style={[st.row, st.filterRow, { width: tableW }]}>
      {shown.map((c) => (
        <View key={c.name} style={[st.cell, { width: widthOf(c), paddingVertical: 3 }]}>
          <TextInput
            value={filters[c.name] || ''}
            onChangeText={(v) => setFilters((f) => ({ ...f, [c.name]: v }))}
            placeholder="contains…"
            placeholderTextColor={T.muted}
            style={[st.filterInput, { textAlign: c.align }]}
          />
        </View>
      ))}
    </View>
  ) : null;
  const footer = hasTotals && rows.length > 0 ? (
    <View style={[st.row, st.totalRow, { width: tableW }]}>
      {shown.map((c, i) => (
        <View key={c.name} style={[st.cell, { width: widthOf(c) }]}>
          <Text numberOfLines={1} style={[st.cellText, st.mono, st.bold, { textAlign: c.align }]}>
            {i === 0 && c.total === null ? `TOTAL · ${rows.length}` : totalText(c, totals)}
          </Text>
        </View>
      ))}
    </View>
  ) : null;

  const listH = Math.max(260, Math.min(items.length * ROW_H + 8, 640));

  const cardRows = (
    <View style={{ gap: 8 }}>
      {rows.slice(0, 400).map((r, i) => {
        const tint = rowTint(r);
        const first = shown[0];
        return (
          <View key={i} style={[st.rowCard, !!tint && { borderLeftColor: tint, borderLeftWidth: 4 }]}>
            {first ? <Text style={[st.rowCardTitle, { fontSize: fs + 1 }]} numberOfLines={2}>{cellText(first, r[first.name])}</Text> : null}
            <View style={st.rowCardGrid}>
              {shown.slice(1).map((c) => (
                <View key={c.name} style={[st.rowCardCell, { minWidth: wide ? 160 : 130 }]}>
                  <Text style={st.rowCardLabel} numberOfLines={1}>{c.header}</Text>
                  <Text style={[st.rowCardValue, { fontSize: fs }, (c.numeric || c.digits !== null) && st.mono, !!cellTint(c, r[c.name]) && { color: T.ink, backgroundColor: cellTint(c, r[c.name]) || undefined, paddingHorizontal: 4, borderRadius: 4 }]}>{cellText(c, r[c.name]) || '—'}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
      {rows.length > 400 ? <Text style={st.note}>Showing the first 400 of {rows.length} rows as cards — use the grid or a filter for the rest.</Text> : null}
      {hasTotals && rows.length > 0 ? (
        <View style={[st.rowCard, { borderColor: T.copper }]}>
          <Text style={[st.rowCardTitle, { fontSize: fs + 1, color: T.copper }]}>TOTAL · {rows.length} rows</Text>
          <View style={st.rowCardGrid}>
            {shown.filter((c) => c.total !== null).map((c) => (
              <View key={c.name} style={[st.rowCardCell, { minWidth: wide ? 160 : 130 }]}>
                <Text style={st.rowCardLabel} numberOfLines={1}>{c.header}</Text>
                <Text style={[st.rowCardValue, st.mono, st.bold, { fontSize: fs }]}>{totalText(c, totals)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={st.page}>
    <ScrollView style={st.page} contentContainerStyle={[st.body, wide && st.bodyWide, { paddingBottom: 40 + Math.max(0, insets.bottom) }]} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
      <View>
          <TouchableOpacity onPress={goReports} hitSlop={HIT}><Text style={st.back}>‹ Reports</Text></TouchableOpacity>
          <View style={st.titleRow}>
            <Text style={st.title}>Assign Report</Text>
            <TouchableOpacity onPress={() => void loadSettings()} hitSlop={HIT} style={st.syncBtn} disabled={svLoading} accessibilityLabel="Reload reports">
              {svLoading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={17} color={T.copper} />}
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={openMail} style={st.mailBtn} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Mail schedule">
              <Icon name="schedule-send" size={16} color="#fff" />
              <Text style={st.mailText}>{wide ? 'Mail schedule' : 'Mail'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCriteriaOpen((v) => !v)} style={st.criteriaBtn} activeOpacity={0.75}>
              <Icon name={criteriaOpen ? 'expand-less' : 'tune'} size={15} color={T.copper} />
              <Text style={st.criteriaText}>{criteriaOpen ? 'Hide criteria' : 'Criteria'}</Text>
            </TouchableOpacity>
          </View>
          {criteriaOpen ? <Text style={st.sub}>The reports assigned to you with their saved settings. Pick a report and a setting, set the dates, then load.</Text> : (
            <Text style={st.sub} numberOfLines={2}>{report ? report.rptname : ''}{sel ? ` · ${sel.name}` : ''}{dateKeys.length ? ' · ' + dateKeys.map((k) => dates[k] || sel?.value[k] || '').join(' → ') : ''}</Text>
          )}
        </View>

        {/* -------------------------- controls -------------------------- */}
        <View style={[st.card, !criteriaOpen && { display: 'none' }]}>
          {svError ? (
            <View style={st.errBox}><Text style={st.errText}>{svError}</Text><TouchableOpacity onPress={() => void loadSettings()}><Text style={st.link}>Try again</Text></TouchableOpacity></View>
          ) : null}
          {svLoading && !sv ? (
            <View style={st.loadingRow}><ActivityIndicator color={T.copper} /><Text style={st.loadingText}>Loading the reports assigned to you…</Text></View>
          ) : null}
          {!svLoading && !svError && reports.length === 0 ? (
            <Text style={st.note}>No report is assigned to your login. Reports and their settings are assigned on the web ERP (Reports → save setting).</Text>
          ) : null}
          <View style={st.controls}>
            <SelectBox label={report ? report.rptname : 'Select report'} dim={!report} onPress={() => reports.length && setPicker('report')} />
            <SelectBox label={sel ? sel.name : 'Select report setting'} dim={!sel} onPress={() => settings.length && setPicker('setting')} />
          </View>
          {sel && dateKeys.length > 0 ? (
            <View style={st.dates}>
              {dateKeys.map((k) => (
                <View key={k} style={st.dateBox}>
                  <Text style={st.dateLabel}>{dateLabel(k)} <Text style={{ color: T.red }}>*</Text></Text>
                  <DateBox
                    value={toISO(dates[k]) || toISO(sel.value[k]) || ''}
                    onChange={(iso) => setDates((d) => ({ ...d, [k]: fromISO(iso, sel.value[k] || dates[k]) }))}
                  />
                </View>
              ))}
              {sel.value.schedtype ? <Text style={st.schedTag}>{String(sel.value.schedtype)}</Text> : null}
            </View>
          ) : null}
          {sel ? (
            <View style={st.runRow}>
              <TouchableOpacity onPress={run} disabled={running} style={[st.runBtn, running && { opacity: 0.6 }]} activeOpacity={0.8}>
                {running ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="play-arrow" size={17} color="#fff" />}
                <Text style={st.runText}>{running ? 'Loading…' : 'Load report'}</Text>
              </TouchableOpacity>
              {answer?.settings ? <Text style={st.note}>Report {answer.settings.rptid} · setting {answer.settings.settingsrptid}</Text> : null}
            </View>
          ) : null}
          {runError ? <Text style={[st.errText, { marginTop: 8 }]}>{runError}</Text> : null}
          {fileMsg ? <Text style={[st.note, { marginTop: 8, color: T.green }]}>{fileMsg}</Text> : null}
        </View>

        {/* --------------------------- result --------------------------- */}
        {running ? (
          <View style={[st.card, st.runningCard]}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={st.runningTitle}>Loading report…</Text>
            <Text style={st.note}>{report ? report.rptname : ''}{sel ? ` · ${sel.name}` : ''}{dateKeys.length ? ` · ${dateKeys.map((k) => dates[k] || sel?.value[k] || '').join(' → ')}` : ''}</Text>
            <Text style={st.note}>Big periods can take a minute — the server prepares every row.</Text>
          </View>
        ) : answer && cols.length > 0 ? (
          <>
            <View style={st.toolbar}>
              <Text style={st.stats}>
                <Text style={st.bold}>{rows.length}</Text> row{rows.length !== 1 ? 's' : ''}
                {rows.length !== (answer.rows || []).length ? ` of ${answer.rows.length}` : ''} · {visible.length} column{visible.length !== 1 ? 's' : ''}
                {grid.groupBy.length ? ` · grouped by ${grid.groupBy.map((g) => cols.find((c) => c.name === g)?.header || g).join(' › ')}` : ''}
              </Text>
              {canExport ? <View style={st.exportRow}>
                <TouchableOpacity onPress={() => openExport('excel')} disabled={!rows.length} style={[st.expBtn, { backgroundColor: '#1D6F42' }, !rows.length && { opacity: 0.45 }]} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Export Excel">
                  <Icon name="table-view" size={15} color="#fff" />
                  <Text style={st.expText}>Excel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openExport('pdf')} disabled={!rows.length} style={[st.expBtn, { backgroundColor: '#B23A2A' }, !rows.length && { opacity: 0.45 }]} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Export PDF">
                  <Icon name="picture-as-pdf" size={15} color="#fff" />
                  <Text style={st.expText}>PDF</Text>
                </TouchableOpacity>
              </View> : null}
              <View style={st.search}>
                <Text style={{ color: T.muted, fontSize: 12 }}>⌕</Text>
                <TextInput value={search} onChangeText={setSearch} placeholder="search every column" placeholderTextColor={T.muted} style={st.searchInput} />
                {search ? <TouchableOpacity onPress={() => setSearch('')} hitSlop={HIT}><Text style={{ color: T.muted }}>×</Text></TouchableOpacity> : null}
              </View>
              <View style={st.seg}>
                <TouchableOpacity onPress={() => setView('grid')} style={[st.segBtn, view === 'grid' && st.segOn]}><Text style={[st.segText, view === 'grid' && { color: '#fff' }]}>Grid</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setView('cards')} style={[st.segBtn, view === 'cards' && st.segOn]}><Text style={[st.segText, view === 'cards' && { color: '#fff' }]}>Cards</Text></TouchableOpacity>
              </View>
              {view === 'grid' ? <Chip on={showFilters} label={`Filters${activeFilters ? ` · ${activeFilters}` : ''}`} onPress={() => setShowFilters((v) => !v)} /> : null}
              {grid.groupBy.length ? <Chip on={grouped} label="Group" onPress={() => setGrouped((v) => !v)} /> : null}
              {cols.length !== visible.length ? <Chip on={!hideHidden} label={`+${cols.length - visible.length} hidden`} onPress={() => setHideHidden((v) => !v)} /> : null}
              {activeFilters ? <TouchableOpacity onPress={clearAll} hitSlop={HIT}><Text style={st.link}>clear</Text></TouchableOpacity> : null}
            </View>

            {view === 'cards' ? cardRows : (
            <View style={st.tableCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator bounces={false} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={{ width: tableW }}>
                  {header}
                  {filterRow}
                  {rows.length === 0 ? (
                    <Text style={st.emptyRow}>{answer.rows.length === 0 ? (answer.message || 'No data for this setting and period.') : 'Nothing matches the filters.'}</Text>
                  ) : (
                    <FlatList
                      data={items}
                      keyExtractor={(it) => it.key}
                      renderItem={renderItem}
                      style={{ height: listH }}
                      initialNumToRender={30}
                      maxToRenderPerBatch={40}
                      windowSize={9}
                      removeClippedSubviews={Platform.OS !== 'web'}
                      nestedScrollEnabled
                      getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
                    />
                  )}
                  {footer}
                </View>
              </ScrollView>
            </View>
            )}
            <Text style={st.note}>Tap a column heading to sort · Filters: one "contains" box per column · Group: fold / unfold the report's groups, each with its own sub total · coloured rows as on the web report.</Text>
          </>
        ) : answer && !answer.file ? (
          <View style={st.card}><Text style={st.note}>{answer.message || 'The report answered without a grid.'}</Text></View>
        ) : null}

    </ScrollView>
      <MailSchedulerSheet visible={mailOpen} onClose={() => setMailOpen(false)} settings={sv} reloadSettings={loadSettings} />
      <ReportExportPreview kind={exp?.kind || null} input={exp?.input || null} onClose={() => setExp(null)} />
      <Picker
        visible={picker === 'report'}
        title="Select report"
        value={rptid}
        options={reports.map((r) => [String(r.rptid), r.rptname] as [string, string])}
        onClose={() => setPicker(null)}
        onChange={pickReport}
      />
      <Picker
        visible={picker === 'setting'}
        title="Select report setting"
        value={setting}
        options={settings.map((s) => [s.name, s.name] as [string, string])}
        onClose={() => setPicker(null)}
        onChange={pickSetting}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function SelectBox({ label, dim, onPress }: { label: string; dim: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={st.select}>
      <Text style={[st.selectText, dim && { color: T.muted }]} numberOfLines={1}>{label}</Text>
      <Text style={st.selectChevron}>⌄</Text>
    </TouchableOpacity>
  );
}

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.chip, on && st.chipOn]} activeOpacity={0.75}>
      <Text style={[st.chipText, on && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Picker({ visible, title, value, options, onClose, onChange }: {
  visible: boolean; title: string; value: string; options: [string, string][]; onClose: () => void; onChange: (v: string) => void;
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
            {options.length === 0 && <Text style={[st.note, { padding: 10 }]}>Nothing to choose.</Text>}
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
  criteriaBtn: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: `${T.copper}55`, backgroundColor: '#F8EFE6', borderRadius: 8, paddingHorizontal: 10, height: 32 },
  mailBtn: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.nav, borderRadius: 8, paddingHorizontal: 12, height: 32 },
  mailText: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
  exportRow: { flexDirection: 'row', gap: 6 },
  expBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 12, height: 32 },
  expText: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  loadingText: { fontSize: 12, color: T.muted, fontWeight: '700' },
  runningCard: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  runningTitle: { fontSize: 14, fontWeight: '800', color: T.ink, marginTop: 4 },
  criteriaText: { fontSize: 10.5, fontWeight: '800', color: T.copper },
  seg: { flexDirection: 'row', backgroundColor: T.sub, borderRadius: 8, padding: 2, borderWidth: 1, borderColor: T.border },
  segBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  segOn: { backgroundColor: T.copper },
  segText: { fontSize: 10.5, fontWeight: '800', color: T.ink },
  rowCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 10, gap: 6 },
  rowCardTitle: { fontWeight: '800', color: T.ink },
  rowCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowCardCell: { flexGrow: 1, flexBasis: 130 },
  rowCardLabel: { fontSize: 9, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  rowCardValue: { color: T.ink, marginTop: 1 },
  bodyWide: { maxWidth: 1200, width: '100%', alignSelf: 'center', padding: 16 },
  mono: { fontFamily: MONO },
  bold: { fontWeight: '800' },
  back: { color: T.copper, fontWeight: '800', fontSize: 12.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 19, fontWeight: '800', color: T.ink, marginTop: 4 },
  sub: { fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 16 },
  syncBtn: { marginTop: 4, width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: `${T.copper}55`, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  syncText: { color: T.copper, fontSize: 16, fontWeight: '900', lineHeight: 18 },

  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, gap: 10 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  select: {
    flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9,
  },
  selectText: { flex: 1, fontSize: 12, fontWeight: '700', color: T.ink },
  selectChevron: { marginLeft: 6, fontSize: 13, lineHeight: 13, color: T.copper, fontWeight: '900' },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' },
  dateBox: { gap: 3, minWidth: 140 },
  dateLabel: { fontSize: 9.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  schedTag: { fontSize: 9, fontWeight: '900', color: '#8a5a00', backgroundColor: '#FCF1DC', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, overflow: 'hidden', textTransform: 'uppercase', alignSelf: 'flex-end', marginBottom: 2 },
  runRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  runBtn: { backgroundColor: T.copper, borderRadius: 9, height: 40, paddingHorizontal: 18, minWidth: 140, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  runText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
  note: { fontSize: 10.5, color: T.muted, lineHeight: 15 },
  link: { fontSize: 11, color: T.copper, fontWeight: '800' },
  errBox: { backgroundColor: '#FCEDEA', borderRadius: 8, padding: 10, gap: 4 },
  errText: { fontSize: 12, color: T.red, fontWeight: '700' },

  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  stats: { fontSize: 11, color: T.muted, flexBasis: '100%' },
  search: {
    flexGrow: 1, flexShrink: 1, flexBasis: 180, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6,
  },
  searchInput: { flex: 1, fontSize: 12, color: T.ink, padding: 0, minWidth: 0 },
  chip: { borderWidth: 1, borderColor: `${T.copper}55`, backgroundColor: '#F8EFE6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  chipOn: { backgroundColor: T.copper, borderColor: T.copper },
  chipText: { fontSize: 10.5, fontWeight: '800', color: T.copper },

  tableCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: ROW_H, borderBottomWidth: 1, borderBottomColor: T.hair, backgroundColor: T.surface },
  headRow: { backgroundColor: T.sub, borderBottomColor: T.border, minHeight: 36 },
  filterRow: { backgroundColor: '#FBFAF8', minHeight: 34 },
  cell: { paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center', borderRightWidth: 1, borderRightColor: T.hair },
  cellText: { fontSize: 11.5, color: T.ink },
  headText: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  filterInput: { borderWidth: 1, borderColor: T.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: Platform.OS === 'web' ? 4 : 2, fontSize: 11, color: T.ink, backgroundColor: T.surface },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: ROW_H, backgroundColor: '#F3EEE7', borderBottomWidth: 1, borderBottomColor: T.border, paddingRight: 10 },
  groupChevron: { color: T.copper, fontSize: 12, fontWeight: '900', width: 12 },
  groupText: { flex: 1, fontSize: 11.5, fontWeight: '800', color: T.ink },
  groupCount: { fontSize: 10, color: T.muted, fontWeight: '700' },
  gtotalRow: { backgroundColor: '#FBF6F0' },
  totalRow: { backgroundColor: T.sub, borderTopWidth: 2, borderTopColor: T.border, borderBottomWidth: 0 },
  emptyRow: { padding: 16, fontSize: 11.5, color: T.muted },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: '100%', maxWidth: 430, maxHeight: '72%', backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.alt },
  modalTitle: { fontSize: 12, fontWeight: '900', color: T.ink },
  modalClose: { fontSize: 22, lineHeight: 20, color: T.muted, fontWeight: '700' },
  modalList: { paddingHorizontal: 8, paddingVertical: 8 },
  option: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 3 },
  optionOn: { backgroundColor: '#F8EFE6' },
  optionText: { flex: 1, fontSize: 11, fontWeight: '700', color: T.ink },
  optionTextOn: { color: T.copper, fontWeight: '900' },
  optionCheck: { marginLeft: 10, color: T.copper, fontSize: 14, fontWeight: '900' },
});
