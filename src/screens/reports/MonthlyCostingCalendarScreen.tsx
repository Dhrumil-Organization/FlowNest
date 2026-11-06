import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppAlert } from '../../../src/common/utils/appAlert';
import { ExpenseCostingAPI } from '../../../src/api/legacyClient';
import { useBusinessContext } from '../../../src/core/business';
import { usePermission } from '../../../src/core/permissions';
import { T } from '../../../src/theme';

/* ────────────────────────────────────────────────────────────────────────────
 * Salary + Unit consumption — daily entry, one month at a time.
 *
 * This is a port of the Web ERP screens (UnitConsumption / Salary calendars):
 *  - The month loads automatically (first open, and on every year / month change).
 *  - Big screens open in Grid view, small screens in Cards; the user can switch.
 *  - Unit rate is display-only.
 *  - Fields whose LAST name part is "Total" (MW_Total, Sud_Total …) are the main
 *    figures: shown on top of each day card. Everything else is "Details",
 *    grouped as <part1>_<part2>, one card open at a time.
 *  - 0 counts as EMPTY everywhere (badge, status, totals, validation).
 *  - Validation: an edited day must be either fully filled or fully cleared.
 *  - Save payload / action logic (add | delete | '') is the same as web.
 *  - Salary labels from October onward: "Waterjet + 230 cm rapier" and
 *    "190 cm rapiers".
 * ──────────────────────────────────────────────────────────────────────────── */

type ModuleKind = 'salary' | 'unit';
type Row = Record<string, any> & { Date: string; isEmpty?: string };
type Tone = 'blue' | 'copper' | 'green';
type Field = { key: string; label: string; short: string; isTotal: boolean; tone: Tone };
type Section = { key: string; title: string; showTitle: boolean; fields: Field[] };
type Layout = { totals: Field[]; sections: Section[]; keys: string[] };
type Snapshot = { isEmpty: string; values: Record<string, any> };
type Status = 'complete' | 'edited' | 'error' | '';

const MONTHS = [
  { name: 'January', short: 'Jan' }, { name: 'February', short: 'Feb' },
  { name: 'March', short: 'Mar' }, { name: 'April', short: 'Apr' },
  { name: 'May', short: 'May' }, { name: 'June', short: 'Jun' },
  { name: 'July', short: 'Jul' }, { name: 'August', short: 'Aug' },
  { name: 'September', short: 'Sep' }, { name: 'October', short: 'Oct' },
  { name: 'November', short: 'Nov' }, { name: 'December', short: 'Dec' },
];
const SKIP_KEYS = new Set(['prptype', 'yearno', 'txntype', 'expdate', 'monthno', 'datenm', 'action', 'date']);
const TONE_BG: Record<Tone, string> = { blue: '#E7EFF6', copper: '#F8EBDD', green: '#E6F1EA' };
const TONE_FG: Record<Tone, string> = { blue: T.yd, copper: T.pd, green: T.green };
const STATUS_BORDER: Record<string, string> = { complete: '#9BD3A2', edited: '#F1D27A', error: '#E8A29A' };
const TODAY_BG = '#EEF6FF';
const TODAY_FG = '#1565C0';

const FY_START_MONTH = 3; // April
const TABLE_MIN_WIDTH = 900;
const COMPACT_WIDTH = 640;
const CARD_MIN_W = 230;
const CARD_GAP = 12;
const COL_W = 100;
const DATE_W = 80;
const DATE_W_EDIT = 112;
const STATUS_BG: Record<string, string> = { complete: '#EAF5EC', edited: '#FFF8E1', error: '#FFF1EF' };
const ROW_H = 42;

/* ── year / date helpers ─────────────────────────────────────────────────── */
const fyEndFull = (two: number) => 2000 + Number(two);
const fyStartFull = (two: number) => fyEndFull(two) - 1;
const twoDigit = (value: number | string) => String(value).slice(-2);
const calendarYearFor = (fy: number, month: number) => (month >= FY_START_MONTH ? fyStartFull(fy) : fyEndFull(fy));
const currentFyEnd = () => {
  const now = new Date();
  return (now.getMonth() >= FY_START_MONTH ? now.getFullYear() + 1 : now.getFullYear()) % 100;
};

/** Same date text as the web screens ("01-Oct" stays "01-Oct" — it is sent back to the server as-is). */
const formatDateKey = (raw: any): string => {
  if (raw === null || raw === undefined || raw === '') return '';
  const value = String(raw).trim();
  if (/^\d{8}$/.test(value)) {
    const m = Number(value.slice(4, 6)) - 1;
    return `${Number(value.slice(6, 8))}-${MONTHS[m]?.short || ''}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [, m, d] = value.slice(0, 10).split('-').map(Number);
    return `${d}-${MONTHS[m - 1]?.short || ''}`;
  }
  if (value.includes('-')) {
    const parts = value.split('-').map((p) => p.trim());
    let day = parts[0];
    let mon = parts[1] || parts[0];
    if (!/^\d{1,2}$/.test(day)) {
      if (/^\d{1,2}$/.test(parts[1] || '')) {
        day = parts[1];
        mon = parts[0];
      } else return value;
    }
    const m3 = mon.slice(0, 3);
    return `${day}-${m3.charAt(0).toUpperCase()}${m3.slice(1).toLowerCase()}`;
  }
  return value;
};
const dayOf = (date: string) => Number(String(date || '').split('-')[0]) || 0;

/* ── value helpers (0 == empty, like web) ────────────────────────────────── */
const parseNumeric = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).trim().replace(/,/g, ''));
  return Number.isNaN(n) ? 0 : n;
};
const toNum = (v: any): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const isEmptyValue = (v: any) => {
  const n = toNum(v);
  return n === null || n === 0;
};
const sameValue = (a: any, b: any) => {
  const na = toNum(a);
  const nb = toNum(b);
  return na !== null && nb !== null ? na === nb : String(a ?? '') === String(b ?? '');
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (v: any) => {
  const n = toNum(v);
  return n === null || n === 0 ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};
const inputText = (v: any) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v === 0 ? '' : String(v);
  return String(v);
};

/* ── shared app dialogs (same native + web alert host used by other screens) ── */
const notify = (title: string, message: string) => {
  void AppAlert.alert(title, message);
};

const confirmAction = (
  title: string,
  message: string,
  okText: string,
): Promise<boolean> =>
  new Promise((resolve) => {
    void AppAlert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: okText, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

/* ── rows + layout, same rules as the web calendars ──────────────────────── */
function normalizeRows(rawRows: any[]): Row[] {
  return (Array.isArray(rawRows) ? rawRows : [])
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const row: Row = { Date: formatDateKey(item.datenm ?? item.Date ?? item.date) };
      Object.keys(item).forEach((key) => {
        const lower = key.toLowerCase();
        if (SKIP_KEYS.has(lower)) return;
        if (lower === 'isempty') {
          row.isEmpty = String(item[key] ?? '0');
          return;
        }
        row[key] = parseNumeric(item[key]);
      });
      return row;
    })
    .filter((row) => !!row.Date)
    .sort((a, b) => dayOf(a.Date) - dayOf(b.Date));
}

const toneFor = (key: string): Tone => {
  if (/^mw/i.test(key)) return 'blue';
  if (/^(sud|sip)/i.test(key)) return 'copper';
  return 'green';
};

function buildLayout(rows: Row[], month: number, kind: ModuleKind): Layout {
  const keys: string[] = [];
  rows.forEach((row) =>
    Object.keys(row).forEach((k) => {
      if (k === 'Date' || k === 'isEmpty' || keys.includes(k)) return;
      keys.push(k);
    }),
  );

  // First name part is an acronym when short (MW, SUD, SIP) → upper-case it.
  const acronyms = new Set<string>();
  keys.forEach((k) => {
    const p = k.split('_')[0];
    if (p && p.length <= 4) acronyms.add(p.toUpperCase());
  });
  const titlePart = (p: string) => (acronyms.has(p.toUpperCase()) ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());

  const salaryRelabel = kind === 'salary' && month >= 9; // October onward
  const makeField = (key: string, isTotal: boolean): Field => {
    const parts = key.split('_').filter(Boolean);
    let label = parts.map(titlePart).join(' ');
    if (salaryRelabel) {
      if (label.toLowerCase() === 'waterjet salary') label = 'Waterjet + 230 cm rapier';
      else if (label.toLowerCase() === 'rapier salary') label = '190 cm rapiers';
    }
    const lastRaw = parts[parts.length - 1] || key;
    const lastOnly = ['looms', 'luwa'].includes(lastRaw.toLowerCase());
    const last = lastRaw.charAt(0).toUpperCase() + lastRaw.slice(1).toLowerCase();
    return { key, label, short: lastOnly ? last : label, isTotal, tone: toneFor(key) };
  };

  const totals: Field[] = [];
  const groupMap = new Map<string, string[]>();
  keys.forEach((k) => {
    const parts = k.split('_').filter(Boolean);
    if ((parts[parts.length - 1] || '').toLowerCase() === 'total') {
      totals.push(makeField(k, true));
      return;
    }
    const group = parts.length >= 2 ? `${parts[0]}_${parts[1]}` : parts[0] || k;
    groupMap.set(group, [...(groupMap.get(group) || []), k]);
  });

  const sections: Section[] = Array.from(groupMap.entries()).map(([group, children]) => {
    const hasLoomsChild = children.some((k) => ['looms', 'luwa'].includes((k.split('_').filter(Boolean).pop() || '').toLowerCase()));
    return {
      key: group,
      title: group.split('_').map(titlePart).join(' '),
      showTitle: children.length > 1 || hasLoomsChild,
      fields: children.map((k) => makeField(k, false)),
    };
  });

  return { totals, sections, keys: [...totals.map((f) => f.key), ...sections.flatMap((s) => s.fields.map((f) => f.key))] };
}

const fmtSum = (n: number) => (n === 0 ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
const labelOfField = (layout: Layout, key: string) => [...layout.totals, ...layout.sections.flatMap((section) => section.fields)].find((field) => field.key === key)?.label || key;

/* ═══════════════════════════════════════════════════════════════════════════
 * Screen
 * ═══════════════════════════════════════════════════════════════════════════ */
export function MonthlyCostingCalendarScreen({ kind }: { kind: ModuleKind }) {
  const { prpGroup, yearNo, isReady } = useBusinessContext();
  const { canDo, requireAction } = usePermission();
  const resource = kind === 'salary' ? 'production.salary' : 'production.unit_consumption';
  const title = kind === 'salary' ? 'Salary' : 'Unit consumption';
  const txntype = kind === 'salary' ? 'exp_costing_salary' : 'exp_costing_unit';
  const { width } = useWindowDimensions();
  const compact = width < COMPACT_WIDTH;
  const canTable = width >= TABLE_MIN_WIDTH;

  const now = new Date();
  const initialFy = Number(twoDigit(Number(yearNo) > 99 ? Number(yearNo) : Number(yearNo) + 2000)) || currentFyEnd();
  const [fy, setFy] = useState(initialFy);
  const [month, setMonth] = useState(now.getMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [originalRows, setOriginalRows] = useState<Row[]>([]);
  const [rawMainRows, setRawMainRows] = useState<any[]>([]);
  const [initialRowMap, setInitialRowMap] = useState<Record<string, Snapshot>>({});
  const [initialCompleteMap, setInitialCompleteMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [editedDates, setEditedDates] = useState<Set<string>>(new Set());
  const [showValidation, setShowValidation] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [viewOverride, setViewOverride] = useState<'cards' | 'table' | null>(null);
  // Big screen (web / tablet / large app window) → grid; small screen → cards. The user can switch either way.
  const view: 'cards' | 'table' = viewOverride ?? (canTable ? 'table' : 'cards');
  const requestId = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const gridY = useRef(0);
  const tableY = useRef(0);
  const cardY = useRef<Record<string, number>>({});

  const canEdit = canDo(resource, 'edit');
  const canSave = canDo(resource, 'save');
  const dirty = editing && editedDates.size > 0;
  const layout = useMemo(() => buildLayout(originalRows, month, kind), [originalRows, month, kind]);
  const calendarYear = calendarYearFor(fy, month);
  const monthLabel = `${MONTHS[month].name} ${calendarYear}`;
  const fyLabel = `${fyStartFull(fy)}-${String(fyEndFull(fy)).slice(-2)}`;

  const fyOptions = useMemo(() => {
    const max = Math.max(fyEndFull(currentFyEnd()), 2026);
    return Array.from({ length: 5 }, (_, i) => Number(String(max - i).slice(-2)));
  }, []);

  /* ── load ──────────────────────────────────────────────────────────────── */
  const loadMonth = useCallback(async () => {
    if (!isReady) {
      setError('Business context is not ready yet. Re-open this screen and try again.');
      return;
    }
    const mine = ++requestId.current;
    setLoading(true);
    setLoaded(false);
    setRows([]);
    setOriginalRows([]);
    setRawMainRows([]);
    setEditedDates(new Set());
    setShowValidation(false);
    setExpandedDate(null);
    setError('');
    setEditing(false);
    try {
      const response: any = await ExpenseCostingAPI.crud({
        prptype: prpGroup || 'S',
        yearno: twoDigit(fyEndFull(fy)),
        monthno: String(month + 1).padStart(2, '0'),
        action: 'view',
        txntype,
      });
      if (mine !== requestId.current) return; // year/month changed meanwhile
      const body = response?.data ?? {};
      const dataNode = body?.data ?? body;
      const rawRows = Array.isArray(dataNode?.data)
        ? dataNode.data
        : Array.isArray(dataNode)
          ? dataNode
          : Array.isArray(body?.data?.rows)
            ? body.data.rows
            : [];
      const nextRows = normalizeRows(rawRows);
      const keys = buildLayout(nextRows, month, kind).keys;

      const completeMap: Record<string, boolean> = {};
      const snapshots: Record<string, Snapshot> = {};
      nextRows.forEach((row) => {
        const wasMarkedEmpty = row.isEmpty === '1';
        completeMap[row.Date] = !wasMarkedEmpty && keys.every((k) => row[k] !== '' && row[k] !== null && row[k] !== undefined);
        const values: Record<string, any> = {};
        keys.forEach((k) => { values[k] = row[k] ?? ''; });
        snapshots[row.Date] = {
          isEmpty: row.isEmpty !== undefined ? String(row.isEmpty) : Object.values(values).every(isEmptyValue) ? '1' : '0',
          values,
        };
      });

      setRawMainRows(rawRows);
      setRows(nextRows);
      setOriginalRows(nextRows.map((r) => ({ ...r })));
      setInitialCompleteMap(completeMap);
      setInitialRowMap(snapshots);
      setEditedDates(new Set());
      setExpandedDate(null);
      const rate = dataNode?.UnitRate ?? body?.UnitRate ?? '';
      const rateText = rate === null || rate === undefined ? '' : String(rate).trim();
      setUnitRate(rateText);
      setLoaded(true);
    } catch (e: any) {
      if (mine !== requestId.current) return;
      setRows([]);
      setOriginalRows([]);
      setRawMainRows([]);
      setLoaded(false);
      setError(e?.response?.data?.message || e?.message || `Unable to load ${title.toLowerCase()} data.`);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [isReady, prpGroup, fy, month, txntype, title, kind]);

  // Auto-load: first open, and every time the financial year or month changes.
  useEffect(() => {
    if (isReady) void loadMonth();
  }, [isReady, loadMonth]);

  /** Ask before leaving a month with unsaved edits. */
  const guarded = useCallback(
    async (action: () => void) => {
      if (dirty && !(await confirmAction('Discard changes?', 'You have unsaved changes for this month.', 'Discard'))) return;
      action();
    },
    [dirty],
  );

  /* ── derived ───────────────────────────────────────────────────────────── */
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? rows.filter((r) => String(r.Date || '').toLowerCase().includes(q)) : rows;
    return compact && view === 'cards' ? list.slice().sort((a, b) => dayOf(b.Date) - dayOf(a.Date)) : list; // phone cards: latest day first
  }, [rows, search, compact, view]);

  const validationKeys = useMemo(
    () => kind === 'unit' ? layout.keys.filter((key) => !layout.totals.some((field) => field.key === key)) : layout.keys,
    [kind, layout],
  );
  const validationErrors = useMemo(() => {
    if (!showValidation) return [] as { Date: string; missing: string[] }[];
    return rows.flatMap((row) => {
      if (!editedDates.has(row.Date)) return [];
      const filled = validationKeys.some((key) => !isEmptyValue(row[key]));
      if (!filled) return []; // a completely cleared day is valid
      const missing = validationKeys.filter((key) => isEmptyValue(row[key]));
      return missing.length ? [{ Date: row.Date, missing }] : [];
    });
  }, [showValidation, rows, editedDates, validationKeys]);

  const statusFor = useCallback(
    (row: Row): Status => {
      const keys = validationKeys;
      if (!keys.length) return '';
      const emptyCount = keys.filter((k) => isEmptyValue(row[k])).length;
      if (emptyCount === keys.length) return '';
      if (emptyCount > 0) return validationErrors.some((item) => item.Date === row.Date) ? 'error' : '';
      if (editedDates.has(row.Date)) return 'edited';
      return initialCompleteMap[row.Date] ? 'complete' : '';
    },
    [validationKeys, editedDates, initialCompleteMap, validationErrors],
  );

  const filledDays = useMemo(() => rows.filter((r) => layout.keys.some((k) => !isEmptyValue(r[k]))).length, [rows, layout]);
  const summaryFields: Field[] = layout.totals.length ? layout.totals : layout.sections.flatMap((s) => s.fields);
  const sums = useMemo(() => {
    const out: Record<string, number> = {};
    layout.keys.forEach((k) => { out[k] = round2(rows.reduce((a, r) => a + (toNum(r[k]) ?? 0), 0)); });
    return out;
  }, [rows, layout]);

  const todayDate = now.getDate();
  const isToday = (row: Row) => dayOf(row.Date) === todayDate && month === now.getMonth() && calendarYear === now.getFullYear();

  /* ── editing ───────────────────────────────────────────────────────────── */
  const updateCell = (date: string, key: string, value: string) => {
    if (!/^-?\d*\.?\d*$/.test(value)) return;
    setRows((prev) => prev.map((r) => (r.Date === date ? { ...r, [key]: value } : r)));
    setEditedDates((prev) => new Set(prev).add(date));
  };

  const clearDay = async (date: string) => {
    const ok = await confirmAction(`Clear ${date}?`, 'This will wipe all values for this date and mark it edited.', 'Clear');
    if (!ok) return;
    setRows((prev) => prev.map((r) => {
      if (r.Date !== date) return r;
      const next: Row = { ...r };
      layout.keys.forEach((k) => { next[k] = ''; });
      next.isEmpty = '1';
      return next;
    }));
    setEditedDates((prev) => new Set(prev).add(date));
  };

  const startEditing = () => {
    setShowValidation(false);
    if (!requireAction(resource, 'edit', `You do not have permission to modify ${title.toLowerCase()} data.`)) return;
    setEditing(true);
  };
  const cancelEditing = async () => {
    if (dirty && !(await confirmAction('Discard changes?', 'Your edits for this month will be lost.', 'Discard'))) return;
    setRows(originalRows.map((r) => ({ ...r })));
    setEditedDates(new Set());
    setShowValidation(false);
    setEditing(false);
  };

  const scrollToDate = (date: string) => {
    const inTable = view === 'table';
    if (!inTable) setExpandedDate(date); // cards: open the day so the empty fields are visible
    setTimeout(() => {
      const idx = Math.max(0, filteredRows.findIndex((r) => r.Date === date));
      const y = inTable ? tableY.current + 94 + idx * ROW_H : gridY.current + (cardY.current[date] ?? 0);
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 90), animated: true });
    }, 250);
  };

  const saveMonth = async () => {
    if (!requireAction(resource, 'save', `You do not have permission to save ${title.toLowerCase()} data.`)) return;
    if (!rows.length) {
      notify('No data', 'There are no daily rows to save for this month.');
      return;
    }
    const keys = layout.keys;
    const requiredKeys = validationKeys;
    setShowValidation(true);
    const labelOf = (k: string) => [...layout.totals, ...layout.sections.flatMap((s) => s.fields)].find((f) => f.key === k)?.label || k;

    const errors: { Date: string; missing: string[] }[] = [];
    const payloadRows: Record<string, any>[] = [];

    rows.forEach((row) => {
      const emptyList = requiredKeys.filter((k) => isEmptyValue(row[k]));
      // Unit totals are calculated/read-only; emptiness is determined by editable detail fields.
      const allValuesEmpty = requiredKeys.every((k) => isEmptyValue(row[k]));
      const currentIsEmpty = allValuesEmpty ? '1' : '0';
      const initial = initialRowMap[row.Date];
      const initialIsEmpty = initial ? String(initial.isEmpty) : '1';
      const userEdited = editedDates.has(row.Date) || (initial ? keys.some((k) => !sameValue(initial.values[k], row[k])) : false);

      let action = '';
      if (initialIsEmpty === '1' && currentIsEmpty === '1') action = '';
      else if (initialIsEmpty === '0' && currentIsEmpty === '1') action = 'delete';
      else if (currentIsEmpty === '0') action = initialIsEmpty === '1' ? 'add' : userEdited ? 'add' : '';

      const payloadRow: Record<string, any> = { Date: row.Date };
      keys.forEach((k) => { payloadRow[k] = row[k] === undefined || row[k] === null ? '' : String(row[k]); });
      payloadRow.isEmpty = currentIsEmpty;
      payloadRow.action = action;
      payloadRows.push(payloadRow);

      if (editedDates.has(row.Date) && requiredKeys.some((k) => !isEmptyValue(row[k])) && emptyList.length > 0) {
        errors.push({ Date: row.Date, missing: emptyList });
      }
    });

    if (errors.length) {
      const lines = errors.map((e) => `${e.Date}: ${e.missing.map(labelOf).join(', ')}`);
      scrollToDate(errors[0].Date);
      notify(
        'Validation errors',
        `Please complete the highlighted fields.\n\n${lines.join('\n')}\n\nFill every required field with a value above 0, or clear the whole day.`,
      );
      return;
    }

    // keep the extra backend fields of each day (web merges them back in)
    const rawByDate = new Map<string, any>();
    rawMainRows.forEach((raw) => {
      const k = formatDateKey(raw?.datenm ?? raw?.Date ?? raw?.date);
      if (k) rawByDate.set(k, raw);
    });
    const d1 = payloadRows.map((pr) => ({ ...(rawByDate.get(pr.Date) || {}), ...pr }));

    const payload: Record<string, any> = {
      prptype: prpGroup || 'S',
      yearno: twoDigit(fyEndFull(fy)),
      monthno: String(month + 1).padStart(2, '0'),
      action: 'edit',
      txntype,
      d1,
    };
    if (kind === 'unit') payload.UnitRate = unitRate || '';

    setSaving(true);
    try {
      const response: any = await ExpenseCostingAPI.crud(payload);
      const body = response?.data ?? {};
      const result = body?.data ?? body;
      const ok = body?.success === true || result?.success === true;
      if (!ok) {
        notify('Error', String(body?.message || result?.message || 'The server did not confirm the save.'));
        return;
      }
      notify('Saved', String(result?.message || body?.message || `${title} saved.`));
      await loadMonth();
    } catch (e: any) {
      notify('Save failed', e?.response?.data?.message || e?.message || 'Unable to save data. Your edits are still on screen.');
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving;
  const cellsEditable = editing && canSave;
  const avail = Math.min(width, 1280) - (compact ? 24 : 36);
  const cols = Math.max(1, Math.min(7, Math.floor((avail + CARD_GAP) / (CARD_MIN_W + CARD_GAP))));

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, compact && styles.contentCompact]} keyboardShouldPersistTaps="handled">
        <View style={styles.headingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{monthLabel} · FY {fyLabel}</Text>
          </View>
          {editing && (
            <View style={styles.editingBadge}>
              <Text style={styles.editingBadgeText}>{dirty ? 'Unsaved changes' : 'Editing'}</Text>
            </View>
          )}
        </View>

        {/* controls */}
        <View style={styles.card}>
          <View>
            <Text style={styles.caption}>Financial year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipStrip}>
              {fyOptions.map((two) => {
                const active = two === fy;
                return (
                  <Pressable key={two} accessibilityRole="button" accessibilityState={{ selected: active }}
                    onPress={() => !active && guarded(() => setFy(two))}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{`${fyStartFull(two)}-${String(fyEndFull(two)).slice(-2)}`}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <View>
            <Text style={styles.caption}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipStrip}>
              {MONTHS.map((m, i) => {
                const active = i === month;
                return (
                  <Pressable key={m.short} accessibilityRole="button" accessibilityState={{ selected: active }}
                    onPress={() => !active && guarded(() => setMonth(i))}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.short}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.actionBar}>
            {kind === 'unit' && (
              <View style={styles.rateWrap}>
                <Text style={styles.caption}>Unit rate</Text>
                <Text style={styles.rateValue}>{unitRate || '—'}</Text>
              </View>
            )}
            <View style={styles.actionRow}>
              <Pressable accessibilityRole="button" onPress={() => void guarded(() => void loadMonth())} disabled={busy}
                style={[styles.primaryButton, busy && styles.disabled]}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryButtonText}>Refresh</Text>}
              </Pressable>
              {!editing && loaded && canEdit && canSave && (
                <Pressable accessibilityRole="button" onPress={startEditing} disabled={busy} style={[styles.outlineButton, busy && styles.disabled]}>
                  <Text style={styles.outlineButtonText}>Modify</Text>
                </Pressable>
              )}
              {editing && (
                <>
                  <Pressable accessibilityRole="button" onPress={cancelEditing} disabled={saving} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  {canSave && (
                    <Pressable accessibilityRole="button" onPress={saveMonth} disabled={saving || rows.length === 0}
                      style={[styles.saveButton, (saving || rows.length === 0) && styles.disabled]}>
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save</Text>}
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Couldn’t load {title.toLowerCase()}</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadMonth()} style={styles.retryButton} accessibilityRole="button">
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {loading && !loaded && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={T.copper} size="large" />
            <Text style={styles.loadingText}>Loading {title.toLowerCase()}…</Text>
          </View>
        )}

        {loaded && (
          <>
            {/* month totals */}
            {summaryFields.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Month total · {monthLabel}</Text>
                <View style={styles.tileRow}>
                  {summaryFields.map((f) => (
                    <View key={f.key} style={[styles.bigTile, { backgroundColor: TONE_BG[f.tone] }, compact && styles.bigTileCompact]}>
                      <Text style={[styles.bigTileLabel, { color: TONE_FG[f.tone] }]} numberOfLines={2}>{f.label}</Text>
                      <Text style={styles.bigTileValue} numberOfLines={1} adjustsFontSizeToFit>{fmtSum(sums[f.key] ?? 0)}</Text>
                    </View>
                  ))}
                  <View style={[styles.bigTile, styles.bigTilePlain, compact && styles.bigTileCompact]}>
                    <Text style={[styles.bigTileLabel, { color: T.muted }]}>Days entered</Text>
                    <Text style={styles.bigTileValue}>{filledDays}<Text style={styles.bigTileOf}> / {rows.length}</Text></Text>
                  </View>
                </View>
              </View>
            )}

            {/* toolbar */}
            <View style={[styles.toolbar, compact && { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput value={search} onChangeText={setSearch} placeholder="Search day (date only)"
                  placeholderTextColor={T.muted} style={styles.searchInput} accessibilityLabel="Search by date" />
                {!!search && (
                  <Pressable onPress={() => setSearch('')} accessibilityRole="button"><Text style={styles.clearSearch}>Clear</Text></Pressable>
                )}
              </View>
              <View style={styles.segment}>
                {(['cards', 'table'] as const).map((v) => (
                  <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: view === v }}
                    onPress={() => setViewOverride(v)} style={[styles.segmentItem, view === v && styles.segmentItemActive]}>
                    <Text style={[styles.segmentText, view === v && styles.segmentTextActive]}>{v === 'cards' ? 'Cards' : 'Grid view'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {validationErrors.length > 0 && (
              <View style={styles.validationPanel}>
                <Text style={styles.validationPanelTitle}>Please complete these fields before saving</Text>
                {validationErrors.map((item) => (
                  <View key={item.Date} style={styles.validationItem}>
                    <Text style={styles.validationDate}>{item.Date}</Text>
                    <Text style={styles.validationFields}>{item.missing.map((key) => labelOfField(layout, key)).join(' · ')}</Text>
                  </View>
                ))}
              </View>
            )}

            <Legend />

            {filteredRows.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No rows for selected month/search</Text>
                <Text style={styles.emptyText}>{search ? 'Try a different date.' : `Nothing came back from the server for ${monthLabel}.`}</Text>
              </View>
            ) : view === 'table' ? (
              <View onLayout={(e) => { tableY.current = e.nativeEvent.layout.y; }}>
                <TableView rows={filteredRows} layout={layout} sums={sums} kind={kind} editing={cellsEditable}
                  today={isToday} statusFor={statusFor} onChange={updateCell} onClear={clearDay} />
              </View>
            ) : (
              <View
                style={[styles.grid, { marginHorizontal: -CARD_GAP / 2 }]}
                onLayout={(e) => { gridY.current = e.nativeEvent.layout.y; }}
              >
                {filteredRows.map((row) => (
                  <View
                    key={row.Date}
                    style={{ width: `${100 / cols}%`, padding: CARD_GAP / 2 }}
                    onLayout={(e) => { cardY.current[row.Date] = e.nativeEvent.layout.y; }}
                  >
                    <DayCard
                      row={row}
                      layout={layout}
                      kind={kind}
                      editing={cellsEditable}
                      today={isToday(row)}
                      status={statusFor(row)}
                      expanded={expandedDate === row.Date}
                      onToggle={() => setExpandedDate((cur) => (cur === row.Date ? null : row.Date))}
                      onChange={updateCell}
                      onClear={clearDay}
                    />
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <Text style={styles.footerNote}>Source: exp_costing_crud · {txntype} · property {prpGroup || 'S'}</Text>
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Value (read-only text or numeric input)
 * ═══════════════════════════════════════════════════════════════════════════ */
function Value({ row, field, editing, onChange, big, invalid }: {
  row: Row; field: Field; editing: boolean; onChange: (d: string, k: string, v: string) => void; big?: boolean; invalid?: boolean;
}) {
  if (!editing) return <Text style={[big ? styles.totalValue : styles.valueText, invalid && styles.valueInvalid]}>{fmt(row[field.key])}</Text>;
  return (
    <TextInput
      value={inputText(row[field.key])}
      onChangeText={(v) => onChange(row.Date, field.key, v)}
      keyboardType="decimal-pad"
      selectTextOnFocus
      placeholder="0"
      placeholderTextColor={T.muted}
      accessibilityLabel={`${row.Date} ${field.label}`}
      style={[styles.cellInput, big && styles.cellInputBig, invalid && styles.cellInputInvalid]}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * One day: totals on top, details in a collapsible block
 * ═══════════════════════════════════════════════════════════════════════════ */
function DayCard({ row, layout, kind, editing, today, status, expanded, onToggle, onChange, onClear }: {
  row: Row; layout: Layout; kind: ModuleKind; editing: boolean; today: boolean; status: Status; expanded: boolean;
  onToggle: () => void; onChange: (d: string, k: string, v: string) => void; onClear: (d: string) => void;
}) {
  const total = layout.keys.length;
  const filled = layout.keys.filter((k) => !isEmptyValue(row[k])).length;
  const hasTotals = layout.totals.length > 0;
  // Main totals stay read-only on top. Salary retains its original detail editing; Unit Consumption totals are never duplicated as editable fields.
  const detailSections: Section[] = [
    ...(hasTotals && kind !== 'unit' ? [{ key: '__totals', title: '', showTitle: false, fields: layout.totals }] : []),
    ...layout.sections,
  ];
  const hasDetails = detailSections.length > 0;
  const detailsOpen = !hasTotals || expanded; // e.g. Salary has no totals → fields are the main content

  return (
    <View style={[
      styles.dayCard,
      today && { backgroundColor: TODAY_BG },
      status ? { borderColor: STATUS_BORDER[status], borderWidth: 2 } : null,
    ]}>
      <View style={styles.dayHeader}>
        <View style={styles.dayDateWrap}>
          <Text style={[styles.dayDate, today && { color: TODAY_FG }]}>{row.Date}</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>{filled}/{total}</Text></View>
        </View>
        <View style={styles.dayRight}>
          <View style={[styles.modePill, editing ? styles.modePillEdit : styles.modePillView]}>
            <Text style={[styles.modePillText, { color: editing ? T.green : T.yd }]}>{editing ? 'Editable' : 'View'}</Text>
          </View>
          {editing && (
            <Pressable onPress={() => onClear(row.Date)} accessibilityRole="button" accessibilityLabel={`Clear ${row.Date}`}
              hitSlop={8} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {hasTotals && (
        <View style={styles.totalGrid}>
          {layout.totals.map((f) => (
            <View key={f.key} style={[styles.totalCell, { backgroundColor: TONE_BG[f.tone] }]}>
              <Text style={[styles.totalLabel, { color: TONE_FG[f.tone] }]} numberOfLines={1}>{f.label}</Text>
              <Value row={row} field={f} editing={false} onChange={onChange} big invalid={status === 'error' && !(kind === 'unit' && f.isTotal) && isEmptyValue(row[f.key])} />
            </View>
          ))}
        </View>
      )}

      {hasTotals && hasDetails && (
        <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded }} style={styles.detailToggle}>
          <Text style={styles.detailToggleText}>Details</Text>
          <Text style={styles.detailToggleText}>{expanded ? '▴' : '▾'}</Text>
        </Pressable>
      )}

      {detailsOpen && detailSections.map((s) => (
        <View key={s.key} style={styles.groupBlock}>
          {s.showTitle && <Text style={styles.groupTitle}>{s.title}</Text>}
          <View style={styles.valuesGrid}>
            {s.fields.map((f) => (
              <View key={f.key} style={[styles.valueCell, f.isTotal && { backgroundColor: TONE_BG[f.tone], borderRadius: 9, padding: 6 }]}>
                <Text style={[styles.valueLabel, f.isTotal && { color: TONE_FG[f.tone] }]} numberOfLines={3}>{f.label}</Text>
                <Value row={row} field={f} editing={editing} onChange={onChange} invalid={status === 'error' && !(kind === 'unit' && f.isTotal) && isEmptyValue(row[f.key])} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Grid view: fixed Date column, columns scroll sideways, month total at the end.
 * Same rules as the cards — edit cells, ✕ clears a day, row colour = day status,
 * red cells = fields still missing on an edited day.
 * ═══════════════════════════════════════════════════════════════════════════ */
function TableView({ rows, layout, sums, kind, editing, today, statusFor, onChange, onClear }: {
  rows: Row[]; layout: Layout; sums: Record<string, number>; kind: ModuleKind; editing: boolean;
  today: (r: Row) => boolean; statusFor: (r: Row) => Status;
  onChange: (d: string, k: string, v: string) => void; onClear: (d: string) => void;
}) {
  const columns: Field[] = [...layout.totals, ...layout.sections.flatMap((s) => s.fields)];
  const groups: { key: string; label: string; count: number; main: boolean }[] = [];
  if (layout.totals.length) groups.push({ key: '__main', label: 'Main totals', count: layout.totals.length, main: true });
  layout.sections.forEach((s) => groups.push({ key: s.key, label: s.showTitle ? s.title : '', count: s.fields.length, main: false }));
  const hasData = (r: Row) => layout.keys.some((k) => !isEmptyValue(r[k]));
  const rowBg = (r: Row) => {
    const st = statusFor(r);
    if (st && st !== 'complete') return { backgroundColor: STATUS_BG[st] };
    if (st === 'complete' || hasData(r)) return { backgroundColor: STATUS_BG.complete };
    return null;
  };
  const dateW = editing ? DATE_W_EDIT : DATE_W;
  const columnWidth = (field: Field) => Math.max(COL_W, Math.min(210, 34 + field.label.length * 7));
  const tableWidth = columns.reduce((sum, field) => sum + columnWidth(field), 0);

  return (
    <View style={styles.tableCard}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: dateW }}>
          <View style={[styles.thGroup, { height: 30 }]} />
          <View style={[styles.thCell, { height: 64 }]}><Text style={[styles.thText, { textAlign: 'left' }]}>Date</Text></View>
          {rows.map((r) => (
            <View key={`d-${r.Date}`} style={[styles.tdDate, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, rowBg(r)]}>
              <Text style={[styles.tdDateText, today(r) && { color: TODAY_FG }]}>{r.Date}</Text>
              {editing && (
                <Pressable onPress={() => onClear(r.Date)} accessibilityRole="button" accessibilityLabel={`Clear ${r.Date}`} hitSlop={6} style={styles.clearBtnSm}>
                  <Text style={styles.clearBtnText}>✕</Text>
                </Pressable>
              )}
            </View>
          ))}
          <View style={[styles.tdDate, styles.footRow]}><Text style={styles.footText}>Month</Text></View>
        </View>
        <ScrollView horizontal style={{ flex: 1 }} showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled">
          <View style={{ width: Math.max(tableWidth, 1) }}>
            <View style={{ flexDirection: 'row', height: 30 }}>
              {groups.map((g) => (
                <View key={g.key} style={[styles.thGroup, { width: columns.filter((f) => (g.key === '__main' ? f.isTotal : !f.isTotal && layout.sections.find((section) => section.key === g.key)?.fields.some((sf) => sf.key === f.key))).reduce((sum, f) => sum + columnWidth(f), 0) }, g.main && styles.thGroupMain]}>
                  <Text style={styles.thGroupText} numberOfLines={2}>{g.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', height: 64 }}>
              {columns.map((f) => (
                <View key={f.key} style={[styles.thCell, { width: columnWidth(f), minHeight: 54 }, f.isTotal && { backgroundColor: TONE_BG[f.tone] }]}>
                  <Text style={[styles.thText, f.isTotal && { color: TONE_FG[f.tone] }]} numberOfLines={3}>{f.label}</Text>
                </View>
              ))}
            </View>
            {rows.map((r) => {
              const st = statusFor(r);
              return (
                <View key={`r-${r.Date}`} style={[{ flexDirection: 'row', height: ROW_H }, rowBg(r)]}>
                  {columns.map((f) => {
                    const invalid = st === 'error' && !(kind === 'unit' && f.isTotal) && isEmptyValue(r[f.key]);
                    return (
                      <View key={f.key} style={[styles.tdCell, { width: columnWidth(f) }, invalid && styles.tdCellInvalid]}>
                        {editing && !(kind === 'unit' && f.isTotal) ? (
                          <TextInput
                            value={inputText(r[f.key])}
                            onChangeText={(v) => onChange(r.Date, f.key, v)}
                            keyboardType="decimal-pad"
                            selectTextOnFocus
                            placeholder="0"
                            placeholderTextColor={T.muted}
                            accessibilityLabel={`${r.Date} ${f.label}`}
                            style={[styles.gridInput, f.isTotal && { fontWeight: '800' }, invalid && styles.gridInputInvalid]}
                          />
                        ) : (
                          <Text style={[styles.tdText, f.isTotal && { fontWeight: '800' }]}>{fmt(r[f.key])}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <View style={[{ flexDirection: 'row', height: ROW_H }, styles.footRow]}>
              {columns.map((f) => (
                <View key={f.key} style={[styles.tdCell, { width: columnWidth(f) }]}>
                  <Text style={[styles.footText, { textAlign: 'right' }]}>{fmtSum(sums[f.key] ?? 0)}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

/** Colour key shown above the days. */
function Legend() {
  const items: { color: string; bg: string; label: string }[] = [
    { color: STATUS_BORDER.complete, bg: STATUS_BG.complete, label: 'Complete' },
    { color: STATUS_BORDER.edited, bg: STATUS_BG.edited, label: 'Edited' },
    { color: STATUS_BORDER.error, bg: STATUS_BG.error, label: 'Fields missing' },
    { color: TODAY_FG, bg: TODAY_BG, label: 'Today' },
  ];
  return (
    <View style={styles.legend}>
      {items.map((it) => (
        <View key={it.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: it.bg, borderColor: it.color }]} />
          <Text style={styles.legendText}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Styles — ERP theme tokens
 * ═══════════════════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  content: { padding: 18, paddingBottom: 40, maxWidth: 1280, width: '100%', alignSelf: 'center', gap: 14 },
  contentCompact: { padding: 12, gap: 11 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  title: { color: T.ink, fontSize: 24, fontWeight: '800' },
  subtitle: { color: T.muted, fontSize: 12.5, marginTop: 3 },
  editingBadge: { backgroundColor: '#F8EEDC', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  editingBadgeText: { color: T.amber, fontSize: 11, fontWeight: '800' },

  card: { backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 12 },
  caption: { color: T.muted, fontSize: 11, marginBottom: 6 },
  chipStrip: { flexDirection: 'row', gap: 7, paddingVertical: 1 },
  chip: { borderRadius: 9, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, paddingHorizontal: 14, minHeight: 38, justifyContent: 'center' },
  chipActive: { borderColor: T.copper, backgroundColor: T.copper },
  chipText: { color: T.ink, fontSize: 12.5, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  actionBar: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  primaryButton: { backgroundColor: T.nav, borderRadius: 9, minHeight: 40, minWidth: 84, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  outlineButton: { borderRadius: 9, borderWidth: 1, borderColor: T.copper, minHeight: 40, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  outlineButtonText: { color: T.pd, fontSize: 13, fontWeight: '700' },
  cancelButton: { borderRadius: 9, borderWidth: 1, borderColor: T.border, minHeight: 40, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: T.ink, fontSize: 13, fontWeight: '700' },
  saveButton: { backgroundColor: T.green, borderRadius: 9, minWidth: 96, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  saveButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  rateWrap: { minWidth: 140 },
  rateValue: { color: T.ink, fontSize: 16, fontWeight: '800' },

  validationPanel: { borderRadius: 12, borderWidth: 1, borderColor: '#E8A29A', backgroundColor: '#FFF4F2', padding: 12, gap: 8 },
  validationPanelTitle: { color: '#A52A22', fontSize: 13, fontWeight: '800' },
  validationItem: { borderTopWidth: 1, borderTopColor: '#F0C7C2', paddingTop: 7, gap: 3 },
  validationDate: { color: '#8F211A', fontSize: 12, fontWeight: '800' },
  validationFields: { color: T.ink, fontSize: 12, lineHeight: 18 },
  errorBox: { borderRadius: 12, borderWidth: 1, borderColor: '#E8B4AD', backgroundColor: '#FFF4F2', padding: 14, gap: 5 },
  errorTitle: { color: T.red, fontSize: 14, fontWeight: '800' },
  errorText: { color: T.ink, fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: 'flex-start', marginTop: 5, backgroundColor: T.nav, paddingHorizontal: 14, minHeight: 38, justifyContent: 'center', borderRadius: 9 },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  loadingBox: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  loadingText: { color: T.muted, fontSize: 13 },

  sectionTitle: { color: T.ink, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bigTile: { flexGrow: 1, flexBasis: 190, minWidth: 140, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  bigTileCompact: { flexBasis: '47%', minWidth: 0, paddingHorizontal: 12, paddingVertical: 11 },
  bigTilePlain: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  bigTileLabel: { fontSize: 12, fontWeight: '700' },
  bigTileValue: { color: T.ink, fontSize: 25, fontWeight: '800', marginTop: 4 },
  bigTileOf: { color: T.muted, fontSize: 14, fontWeight: '600' },

  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
  searchIcon: { color: T.muted, fontSize: 20 },
  searchInput: { flex: 1, color: T.ink, fontSize: 14, paddingVertical: 8 },
  clearSearch: { color: T.copper, fontSize: 12, fontWeight: '700' },
  segment: { flexDirection: 'row', backgroundColor: T.alt, borderRadius: 10, padding: 3 },
  segmentItem: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 8 },
  segmentItemActive: { backgroundColor: T.surface },
  segmentText: { color: T.muted, fontSize: 12.5, fontWeight: '700' },
  segmentTextActive: { color: T.ink },

  emptyBox: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 13, padding: 26, alignItems: 'center' },
  emptyTitle: { color: T.ink, fontSize: 15, fontWeight: '800' },
  emptyText: { color: T.muted, fontSize: 13, marginTop: 6, textAlign: 'center', maxWidth: 360 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  dayCard: { backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  dayDateWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  dayDate: { color: T.ink, fontSize: 16, fontWeight: '800' },
  badge: { backgroundColor: '#F2F7FF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: TODAY_FG, fontSize: 11, fontWeight: '800' },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modePill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  modePillEdit: { backgroundColor: '#E8F5E9' },
  modePillView: { backgroundColor: '#E3F2FD' },
  modePillText: { fontSize: 10.5, fontWeight: '800' },
  clearBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDECEA' },
  clearBtnSm: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDECEA' },
  clearBtnText: { color: '#F44336', fontSize: 13, fontWeight: '800' },
  totalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  totalCell: { flexGrow: 1, flexBasis: '45%', minWidth: 0, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, gap: 3 },
  totalLabel: { fontSize: 11.5, fontWeight: '700' },
  totalValue: { color: T.ink, fontSize: 19, fontWeight: '800' },
  detailToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 38, borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 4 },
  detailToggleText: { color: TODAY_FG, fontSize: 12.5, fontWeight: '700' },
  groupBlock: { gap: 7, backgroundColor: '#F7FAFE', borderRadius: 10, padding: 8 },
  groupTitle: { color: TODAY_FG, fontSize: 12, fontWeight: '800' },
  valuesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  valueCell: { flexGrow: 1, flexBasis: '45%', minWidth: 0 },
  valueLabel: { color: T.ink, fontSize: 11.5, fontWeight: '700', marginBottom: 4 },
  valueText: { color: T.ink, fontSize: 14, fontWeight: '600', backgroundColor: '#F6F8FB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  cellInput: { color: T.ink, fontSize: 14, fontWeight: '600', backgroundColor: '#fff', borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, minHeight: 40 },
  cellInputInvalid: { borderColor: T.red, backgroundColor: '#FFF4F2' },
  valueInvalid: { backgroundColor: '#FFF4F2', color: T.red },
  cellInputBig: { fontSize: 18, fontWeight: '800', minHeight: 42 },

  tableCard: { backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  thGroup: { justifyContent: 'center', paddingHorizontal: 10, backgroundColor: T.alt, borderBottomWidth: 1, borderBottomColor: T.border, borderLeftWidth: 1, borderLeftColor: T.border },
  thGroupMain: { backgroundColor: '#EDE6DD' },
  thGroupText: { color: T.muted, fontSize: 11.5, fontWeight: '800' },
  thCell: { paddingHorizontal: 8, paddingVertical: 7, justifyContent: 'center', backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.border },
  thText: { color: T.muted, fontSize: 11.5, fontWeight: '700', textAlign: 'center', flexWrap: 'wrap', lineHeight: 15 },
  tdDate: { height: ROW_H, justifyContent: 'center', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: T.hair },
  tdDateText: { color: T.ink, fontSize: 13, fontWeight: '700' },
  tdCell: { justifyContent: 'center', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: T.hair },
  tdCellInvalid: { backgroundColor: '#FDE3DF' },
  gridInput: { color: T.ink, fontSize: 13, fontWeight: '600', textAlign: 'right', backgroundColor: '#fff', borderWidth: 1, borderColor: T.border, borderRadius: 6, paddingHorizontal: 6, height: 32 },
  gridInputInvalid: { borderColor: T.red, backgroundColor: '#FFF4F2' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 4, borderWidth: 2 },
  legendText: { color: T.muted, fontSize: 12 },
  tdText: { color: T.ink, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  rowFilled: { backgroundColor: '#EAF5EC' },
  footRow: { backgroundColor: T.alt, borderTopWidth: 1, borderTopColor: T.border },
  footText: { color: T.ink, fontSize: 13, fontWeight: '800' },

  footerNote: { color: T.muted, fontSize: 10.5, textAlign: 'center', marginTop: 4 },
});