// FILE: src/screens/priority/PriorityScreen.tsx
// Chart Priority — reorder the sales-order allocation charts for the
// current property + financial year, then save the new order back.
//
// Conventions match every other migrated tab screen:
//   - theme:             T, S from '@/src/theme'
//   - business context:  useBusinessContext() from '@/src/core/business'
//                         (prpCode / yearNo come from the session set at
//                         login — never a screen-local constant)
//   - permissions:        usePermission() from '@/src/core/permissions'
//                         (resource key 'priority', actions view/edit/save)
//   - API:                 PriorityAPI from '@/src/api/legacyClient'
//                         (axios instance already attaches the bearer token)
//   - header:              this screen renders NO header of its own — the
//                         single AppHeader in (tabs)/_layout.tsx owns that
//                         (HEADER_CONTENT['priority']). This screen only
//                         pushes a small "Unsaved / Saved" badge into the
//                         header's right slot via useHeaderExtrasStore,
//                         exactly like OrdersScreen's "Saved ✓" pill.
//
// ---------------------------------------------------------------------------
// NOTE ON PRIORITY SEMANTICS (read this before touching sort/save logic):
//   - `ClientPriority` is whatever the client originally set. It is DISPLAY
//     ONLY here — we never recompute or overwrite it locally. Whatever value
//     came from the browse API for a shade is the value we send straight
//     back on save, untouched.
//   - `SelfPriority` is OUR priority (this screen). Moving a card up/down
//     updates it, and only SelfPriority is recalculated/sent as the new
//     value on save.
//   - Every card shows BOTH values (a "Client #" meta chip + a "Self" badge)
//     so the user can see what the client asked for vs. what they've set.
//
// NOTE ON DEFAULT ORDERING (decided independently, per chart):
//   1. Self priority present                -> sort by Self priority.
//   2. Self priority missing, Client present -> sort by Client priority
//      (this is exactly the "nothing has been saved from this screen yet"
//      case — the list defaults to the order the client originally asked
//      for, until we save our own order).
//   3. Both missing                          -> no sort key; the chart drops
//      to the bottom (stable, original browse order among such charts) and
//      gets its own fresh Self priority (its position) the next time we
//      save.
//   This is a pure ORDERING decision only — Client priority is NEVER copied
//   into Self priority and vice-versa. Only the real saved value (or the
//   lack of one) is ever shown for each field, and only Self priority is
//   ever sent back as the reordered value on save. After every save the
//   screen re-browses; once the backend returns a real Self priority for a
//   chart, rule (1) takes over for it from then on.
//
// NOTE ON REORDERING (mobile UX):
//   Reorder is started ONLY from the dedicated drag-handle icon. Normal card
//   touches keep their normal behaviour, while the handle uses PanResponder.
//   While holding/moving, the insertion point is shown as a highlighted line;
//   the array is changed only when the handle is released.
//
// NOTE ON SHADE DATA SOURCE:
//   Every browse row can now carry a `shadeDetails` array:
//     { shadeName, shadeCode, status }
//   This is the authoritative source for each shade's name/code/status.
//   `ShadeAllocation` / `Shdcodes` are left completely untouched and are
//   still used only to work out each shade's quantity (by matching name).
//   If a row has no shadeDetails (older data), we fall back to parsing
//   ShadeAllocation/Shdcodes the old way so nothing breaks.
//
// NOTE ON DATA SOURCE:
//   Priority browse/order/status are backend-only. No priority/order/status
//   data is read from AsyncStorage or any browser cache. After each successful
//   save, the screen browses again and renders the backend response.
//
// NOTE ON GROUPING KEY (chart identity):
//   A single browse response can legitimately contain the SAME ChartNo used
//   under more than one party/order (ParCode / OrderUId). Grouping by ChartNo
//   alone can silently merge two unrelated charts into one card and mix their
//   shades. The real identity of a chart for this screen is therefore the
//   triple (ChartNo, ParCode, OrderUId) — every row is grouped by that
//   composite key, so two rows only ever land on the same card when ChartNo,
//   ParCode AND OrderUId all match.
// ---------------------------------------------------------------------------

import { PriorityAPI } from '@/src/api/legacyClient';
import { useBusinessContext } from '@/src/core/business';
// Priority browse, priority order save, and shade-status save use the real API.
import { useHeaderExtrasStore } from '@/src/core/layout/headerExtras';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const numberValue = (value: any) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const qtyLabel = (value: any) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-IN', { maximumFractionDigits: 3 });
};

const normalizeDate = (value: any) => {
  const raw = String(value ?? '').trim();
  return /^\d{8}$/.test(raw) ? raw : '';
};

const formatDate = (value: any) => {
  const raw = String(value ?? '').trim();
  if (!/^\d{8}$/.test(raw)) return raw || '—';
  return `${raw.slice(6, 8)}-${raw.slice(4, 6)}-${raw.slice(0, 4)}`;
};

const normName = (value: any) => String(value ?? '').trim().toUpperCase();

/* -------------------------------------------------------------------------- */
/*  Shade status (hard-coded options — no backend enum for this yet)          */
/* -------------------------------------------------------------------------- */

const STATUS_OPTIONS = ['Sent for job', 'Dying', 'Finish', 'Job inward'] as const;
type ShadeStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_COLORS: Record<ShadeStatus, string> = {
  'Sent for job': T.amber,
  'Dying': T.red,
  'Finish': T.green,
  'Job inward': T.copper,
};

const shadeKeyOf = (shade: { ShdCode: string; ShdName: string }) =>
  shade.ShdCode || shade.ShdName;

type PriorityShade = {
  ShdCode: string;
  ShdName: string;
  AllocationQty: number;
  AllocationId: number | null;
  ClientPriority: number | null;
  SelfPriority: number | null;
  Status: ShadeStatus | null;
};

type PriorityChart = {
  key: string;
  ChartNo: string;
  LastDate: string;
  OrderUId: number;
  OrderSrNo: number;
  ParCode: string;
  PartyName: string;
  DesignCode: string;
  DesignName: string;
  ApcChartName: string;
  qty: number;
  shades: PriorityShade[];
  savedClientPriority: number | null; // what the client originally set — display only
  savedSelfPriority: number | null; // our own priority — drives sort order
  displayPriority: number; // live position in the list (== new SelfPriority)
};

function groupChartsForPriority(rows: any[]): PriorityChart[] {
  const grouped = new Map<string, PriorityChart>();

  rows.forEach((row) => {
    const chartNo = String(row?.ChartNo ?? row?.chartno ?? '').trim();
    const date = normalizeDate(row?.LastDate) || String(row?.LastDate ?? '').trim();
    if (!chartNo && !date) return;

    // ParCode + OrderUId are part of a chart's identity (see NOTE ON GROUPING
    // KEY above), so both must be resolved BEFORE building the group key.
    const parCode = String(row?.ParCode ?? row?.parcode ?? '').trim();
    const rowOrderUId = numberValue(row?.OrderUId ?? row?.orderuid ?? row?.OrderUID);

    const rawAllocation = String(
      row?.ShadeAllocation ?? row?.shadeallocation ?? '',
    ).trim();
    if (!rawAllocation) return;

    // qty-by-name map, purely from ShadeAllocation (untouched, as received)
    const qtyByName = new Map<string, number>();
    rawAllocation
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const idx = part.indexOf(':');
        const name = idx === -1 ? part.trim() : part.slice(0, idx).trim();
        const qty = idx === -1 ? 0 : numberValue(part.slice(idx + 1).trim());
        qtyByName.set(normName(name), (qtyByName.get(normName(name)) || 0) + qty);
      });

    const rawCodes = String(
      row?.Shdcodes ?? row?.shdcodes ?? row?.ShdCode ?? row?.shdcode ?? row?.ShadeCode ?? '',
    ).trim();
    const codesArr = rawCodes
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const rowClientPriority =
      row?.ClientPriority ?? row?.Clientpriority ?? row?.clientpriority ?? null
        ? Number(row?.ClientPriority ?? row?.Clientpriority ?? row?.clientpriority)
        : null;
    // Real SelfPriority only — never seeded from ClientPriority here. The
    // Self-vs-Client fallback for ORDERING happens once per chart, further
    // below (see NOTE ON DEFAULT ORDERING). Keeping this field pure means
    // the "Self" badge and the save payload only ever carry a value we
    // actually own, never a borrowed Client value.
    const rowSelfPriority = (() => {
      const rawValue = row?.SelfPriority ?? row?.selfpriority;
      const hasValue = !(rawValue === null || rawValue === undefined || String(rawValue).trim() === '');
      const parsed = hasValue ? Number(rawValue) : null;
      return parsed != null && parsed > 0 ? parsed : null;
    })();
    const rowAllocationId =
      row?.AllocationId ?? row?.allocationid ?? row?.AllocationID ?? null
        ? Number(row?.AllocationId ?? row?.allocationid ?? row?.AllocationID)
        : null;
    const rowApcChartName = String(
      row?.ApcChartName ?? row?.APCChartName ?? row?.apcchartname ?? row?.apcChartName ?? '',
    ).trim();

    const normalizeStatus = (value: any): ShadeStatus | null => {
      if (value === null || value === undefined) return null;
      const trimmed = String(value).trim();
      if (!trimmed || trimmed.toLowerCase() === 'none') return null;
      return (STATUS_OPTIONS as readonly string[]).includes(trimmed)
        ? (trimmed as ShadeStatus)
        : null;
    };

    // --- Chart identity = ChartNo + ParCode + OrderUId (composite key) -----
    // Two rows only ever collapse onto the same card when ALL THREE match.
    // This stops two different parties/orders that happen to reuse the same
    // ChartNo from being merged into one card with mixed shades.
    const groupKey = chartNo
      ? `CHART:${chartNo}::PAR:${parCode}::ORD:${rowOrderUId}`
      : `DATE:${date}::PAR:${parCode}::ORD:${rowOrderUId}`;

    const current =
      grouped.get(groupKey) ||
      ({
        key: groupKey,
        ChartNo: chartNo,
        LastDate: date,
        OrderUId: rowOrderUId,
        OrderSrNo: numberValue(row?.OrderSrNo ?? row?.ordersrno ?? row?.OrderSRNo),
        ParCode: parCode,
        PartyName: String(row?.PartyName ?? row?.partyname ?? '').trim(),
        DesignCode: String(row?.dsncode ?? row?.DsnCode ?? '').trim(),
        DesignName: String(row?.dsnname ?? row?.DsnName ?? '').trim(),
        ApcChartName: rowApcChartName,
        qty: 0,
        shades: [],
        savedClientPriority: null,
        savedSelfPriority: null,
      } as PriorityChart);

    if (!current.ChartNo && chartNo) current.ChartNo = chartNo;
    if (!current.LastDate && date) current.LastDate = date;
    if (!current.OrderUId) current.OrderUId = rowOrderUId;
    if (!current.OrderSrNo) current.OrderSrNo = numberValue(row?.OrderSrNo ?? row?.ordersrno ?? row?.OrderSRNo);
    if (!current.ParCode) current.ParCode = parCode;
    if (!current.PartyName) current.PartyName = String(row?.PartyName ?? row?.partyname ?? '').trim();
    if (!current.DesignCode) current.DesignCode = String(row?.dsncode ?? row?.DsnCode ?? '').trim();
    if (!current.DesignName) current.DesignName = String(row?.dsnname ?? row?.DsnName ?? '').trim();
    if (!current.ApcChartName && rowApcChartName) current.ApcChartName = rowApcChartName;

    // --- Authoritative shade list: prefer `shadeDetails`, fall back to the
    //     old ShadeAllocation/Shdcodes comma-split parsing when absent. ----
    const rawShadeDetails = Array.isArray(row?.shadeDetails ?? row?.ShadeDetails)
      ? (row?.shadeDetails ?? row?.ShadeDetails)
      : null;

    const shadeSeeds: { name: string; code: string; status: ShadeStatus | null }[] =
      rawShadeDetails
        ? rawShadeDetails
          .map((sd: any) => ({
            name: String(sd?.shadeName ?? sd?.ShadeName ?? '').trim(),
            code: String(sd?.shadeCode ?? sd?.ShadeCode ?? '').trim(),
            status: normalizeStatus(sd?.status ?? sd?.Status),
          }))
          .filter((sd: any) => !!sd.name)
        : [...qtyByName.keys()].map((upperName, i) => ({
          name: upperName,
          code: codesArr[i] ?? codesArr[0] ?? '',
          status: null,
        }));

    shadeSeeds.forEach(({ name, code, status }) => {
      if (!name) return;
      const qty = qtyByName.get(normName(name)) ?? 0;

      const shade: PriorityShade = {
        ShdCode: code,
        ShdName: name,
        AllocationQty: qty,
        AllocationId: rowAllocationId,
        ClientPriority: rowClientPriority,
        SelfPriority: rowSelfPriority,
        Status: status,
      };

      const existing = current.shades.find(
        (item) => normName(item.ShdName) === normName(shade.ShdName),
      );
      if (existing) {
        if (shade.ShdCode) existing.ShdCode = shade.ShdCode;
        if (shade.AllocationId != null) existing.AllocationId = shade.AllocationId;
        if (shade.ClientPriority != null) existing.ClientPriority = shade.ClientPriority;
        if (shade.SelfPriority != null) existing.SelfPriority = shade.SelfPriority;
        if (shade.Status != null) existing.Status = shade.Status;
      } else {
        current.shades.push(shade);
      }
    });

    current.qty = current.shades.reduce((sum, item) => sum + item.AllocationQty, 0);
    grouped.set(groupKey, current);
  });

  const charts = Array.from(grouped.values());

  charts.forEach((chart, idx) => {
    (chart as any)._originalOrder = idx;
  });

  charts.forEach((chart) => {
    const clientVals = chart.shades
      .map((item) => item.ClientPriority)
      .filter((value): value is number => value != null && value > 0);
    chart.savedClientPriority = clientVals.length ? Math.min(...clientVals) : null;

    const selfVals = chart.shades
      .map((item) => item.SelfPriority)
      .filter((value): value is number => value != null && value > 0);
    chart.savedSelfPriority = selfVals.length ? Math.min(...selfVals) : null;

    // ORDERING KEY ONLY — see NOTE ON DEFAULT ORDERING at the top of this
    // file. Self wins whenever it exists; Client is used purely to decide
    // order when Self hasn't been saved yet; neither value is ever mutated
    // by this decision.
    (chart as any)._sortPriority =
      chart.savedSelfPriority != null
        ? chart.savedSelfPriority
        : chart.savedClientPriority != null
          ? chart.savedClientPriority
          : null;
  });

  charts.sort((a, b) => {
    const aKey = (a as any)._sortPriority as number | null;
    const bKey = (b as any)._sortPriority as number | null;
    const aHas = aKey != null;
    const bHas = bKey != null;
    if (aHas && bHas) return aKey! - bKey!;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return (a as any)._originalOrder - (b as any)._originalOrder;
  });

  charts.forEach((chart, idx) => {
    chart.displayPriority = idx + 1;
  });

  return charts;
}


/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export function PriorityScreen() {
  const { prpCode, yearNo, isReady, prpGroup } = useBusinessContext();
  console.log('priority prpCode', prpGroup, 'yearNo', yearNo);
  const { canDo } = usePermission();
  const canEdit = canDo('priority', 'edit');
  const canSave = canDo('priority', 'save');

  const setHeaderExtras = useHeaderExtrasStore((state) => state.setHeaderExtras);
  const clearHeaderExtras = useHeaderExtrasStore((state) => state.clearHeaderExtras);

  const [charts, setCharts] = useState<PriorityChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusModalKey, setStatusModalKey] = useState<string | null>(null);
  // Status legend now doubles as a filter: 'ALL' (default) shows every chart;
  // picking a status shows ONLY charts that have at least one shade currently
  // in that status. This is a pure view-level filter — `charts` (the real,
  // full order) is never touched by it, so Self priority numbers and the
  // save payload stay correct regardless of what's filtered on screen.
  const [statusFilter, setStatusFilter] = useState<ShadeStatus | 'ALL'>('ALL');
  // Free-text search across chart no / party / design / APC name / shade
  // names & codes. While the box has text, drag-reorder is disabled (see
  // where `dragEnabled` is computed below) — reordering only makes sense
  // against the real, unfiltered order.
  const [searchText, setSearchText] = useState('');

  // `silent` = true for the manual "Refresh" button: keeps the current list
  // on screen (no full-screen spinner) while re-fetching in the background.
  const loadBrowse = useCallback(async (silent = false) => {

    if (!isReady) {
      setLoading(false);
      return;
    }
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {

      console.log('[Priority] Browse request ->', { prptype: prpGroup, yearno: yearNo });
      // Real API — api/prioritybrowse
      const response: any = await PriorityAPI.browse({ prptype: prpGroup, yearno: yearNo });
      // --- Mock fallback (disabled now that the real API is connected) ------
      // const response: any = await mockBrowsePriority();
      console.log('[Priority] Browse response ->', response);
      const body: any = response?.data ?? response;
      console.log('[Priority] Browse response body ->', body);
      const payload = body?.response?.data ?? body?.data ?? body ?? {};
      const inner = payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
        ? payload.data
        : payload;
      const rawDetails = Array.isArray(inner?.AllocationDetails) ? inner.AllocationDetails : [];
      console.log('[Priority] Browse raw AllocationDetails ->', rawDetails);
      const groupedCharts = groupChartsForPriority(rawDetails);
      console.log('[Priority] Browse grouped & sorted charts ->', groupedCharts);
      setCharts(groupedCharts);
      setDirty(false);
    } catch (err: any) {
      if (!silent) setCharts([]);
      setError(err?.message || 'Unable to load charts for priority.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isReady, prpGroup, yearNo]);

  const handleRefresh = useCallback(() => {
    void loadBrowse(true);
  }, [loadBrowse]);

  useFocusEffect(
    useCallback(() => {
      void loadBrowse();
    }, [loadBrowse]),
  );

  useFocusEffect(
    useCallback(() => {
      setHeaderExtras({
        right: dirty ? (
          <View style={[hs.badge, { backgroundColor: 'rgba(201,138,26,0.18)', borderColor: T.amber }]}>
            <Icon name="error-outline" size={13} color={T.amber} />
            <Text style={[hs.badgeText, { color: T.amber }]}>Unsaved</Text>
          </View>
        ) : (
          <View style={[hs.badge, { backgroundColor: 'rgba(42,96,68,0.18)', borderColor: T.green }]}>
            <Icon name="check-circle" size={13} color={T.green} />
            <Text style={[hs.badgeText, { color: T.green }]}>Saved</Text>
          </View>
        ),
      });
      return () => clearHeaderExtras();
    }, [dirty, setHeaderExtras, clearHeaderExtras]),
  );

  // Reorder happens ONLY through the drag handle. We do not persist anything
  // locally: the browse API remains the source of truth after a successful
  // save.
  //
  // `visibleList` is whatever ChartList was actually given to render — the
  // FULL `charts` array when the status filter is 'ALL', or the FILTERED
  // subset when a status is selected. `fromIndex`/`toIndex` are positions
  // within THAT list, not necessarily within the full `charts` array.
  //
  // To keep this accurate under a filter: work out the new relative order of
  // just the visible charts (a normal splice), then rebuild the full array by
  // walking it once and, at every slot that belongs to a visible chart,
  // pulling the next chart off that new relative order. Charts NOT in the
  // visible list are never touched and keep their exact original position —
  // this is what lets you reorder inside a filtered view without disturbing
  // every other chart's Self priority.
  const reorderCharts = useCallback((fromIndex: number, toIndex: number, visibleList: PriorityChart[]) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 ||
      fromIndex >= visibleList.length || toIndex >= visibleList.length) return;

    setCharts((current) => {
      const reorderedVisible = visibleList.slice();
      const [moved] = reorderedVisible.splice(fromIndex, 1);
      reorderedVisible.splice(toIndex, 0, moved);

      const visibleKeys = new Set(visibleList.map((chart) => chart.key));
      let cursor = 0;
      const next = current.map((chart) =>
        visibleKeys.has(chart.key) ? reorderedVisible[cursor++] : chart,
      );

      next.forEach((chart, idx) => { chart.displayPriority = idx + 1; });
      return next;
    });
    setDirty(true);
  }, []);

  const onSave = useCallback(async (prpGroup, yearNo) => {
    if (saving || !charts.length) return;

    // Never send an incomplete chart. ChartNo is the identity used by the
    // priority backend, so a blank value must stop the save rather than
    // silently sending a partial/wrong record.
    const invalidChart = charts.find(
      (chart) =>
        !String(chart.ChartNo ?? '').trim() ||
        !Number.isFinite(Number(chart.OrderUId)) ||
        !Number.isFinite(Number(chart.OrderSrNo)),
    );
    if (invalidChart) {
      setError(
        `Cannot save priority: ChartNo / OrderUId / OrderSrNo is missing for one chart.`,
      );
      return;
    }

    const orderGroups = new Map<string, {
      orderUId: number;
      orderSrNo: number;
      parCode: string;
      charts: PriorityChart[];
    }>();

    charts.forEach((chart) => {
      const key = `${chart.OrderUId}-${chart.OrderSrNo}`;
      const group = orderGroups.get(key) || {
        orderUId: chart.OrderUId,
        orderSrNo: chart.OrderSrNo,
        parCode: chart.ParCode,
        charts: [],
      };
      group.charts.push(chart);
      orderGroups.set(key, group);
    });

    const payloads = Array.from(orderGroups.values()).map((group) => ({
      OrderUId: group.orderUId,
      OrderSrNo: group.orderSrNo,
      ParCode: group.parCode,
      prptype: prpGroup,
      yearno: Number(yearNo) || yearNo,
      items: group.charts.flatMap((chart) => {
        const selfPriorityForThisChart = chart.displayPriority;

        return chart.shades.map((shade) => ({
          AllocationId: shade.AllocationId ?? null,
          ShdCode: shade.ShdCode,
          ShdName: shade.ShdName,
          Status: shade.Status ? shade.Status : 'none',
          ClientPriority: shade.ClientPriority,
          SelfPriority: selfPriorityForThisChart,
          ChartNo: chart.ChartNo,
          OrderUId: chart.OrderUId,
          OrderSrNo: chart.OrderSrNo,
          ParCode: chart.ParCode,
        }));
      }),
    }));

    if (payloads.some((payload) =>
      payload.items.some((item) => !String(item.ChartNo ?? '').trim()),
    )) {
      setError('Cannot save priority: one or more items has an empty ChartNo.');
      return;
    }

    if (!payloads.length || payloads.some((payload) => !payload.items.length)) {
      setError('There are no shades to prioritise right now.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      console.log('[Priority] Save priority request ->', payloads);
      const response: any = await PriorityAPI.save(payloads);
      console.log('[Priority] Save priority response ->', response);

      const body = response?.data ?? response;
      console.log('[Priority] Save priority response body ->', body);
      const saved =
        body === true ||
        body?.status === true ||
        body?.success === true ||
        body?.response === true ||
        body?.data === true;

      if (!saved) {
        throw new Error(body?.message || 'Priority save failed.');
      }

      // IMPORTANT: do not trust the local reordered array after save.
      // Re-browse the backend and render exactly what was persisted.
      setDirty(false);
      await loadBrowse(true);
    } catch (err: any) {
      setError(err?.message || 'Unable to save priority order.');
    } finally {
      setSaving(false);
    }
  }, [saving, charts, prpGroup, yearNo, loadBrowse]);

  const handleStatusSaved = useCallback(async () => {
    // Status is backend-owned. Once save_priority_status returns true,
    // immediately browse again so the UI shows the server's actual status.
    await loadBrowse(true);
  }, [loadBrowse]);

  const activeStatusChart = useMemo(
    () => charts.find((c) => c.key === statusModalKey) ?? null,
    [charts, statusModalKey],
  );

  // Pure view filter — see the note above `reorderCharts`. `charts` itself
  // (the real, saved order) is never filtered or mutated by this.
  const visibleCharts = useMemo(() => {
    let list = statusFilter === 'ALL'
      ? charts
      : charts.filter((chart) => chart.shades.some((shade) => shade.Status === statusFilter));

    const query = searchText.trim().toLowerCase();
    if (query) {
      list = list.filter((chart) => {
        const haystack = [
          chart.ChartNo,
          chart.PartyName,
          chart.DesignName,
          chart.DesignCode,
          chart.ApcChartName,
          ...chart.shades.map((shade) => shade.ShdName),
          ...chart.shades.map((shade) => shade.ShdCode),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return list;
  }, [charts, statusFilter, searchText]);

  // Reordering only makes sense against the real order — while the person is
  // actively searching, dragging is switched off (the drag handle simply
  // doesn't render; see ChartCard's `canEdit` gate). Clearing the box brings
  // it straight back.
  const dragEnabled = canEdit && searchText.trim() === '';

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: T.bg }]}>
        <ActivityIndicator color={T.copper} />
        <Text style={s.loadingText}>Loading charts…</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[s.center, { backgroundColor: T.bg }]}>
        <Icon name="flag" size={30} color={T.muted} />
        <Text style={s.emptyTitle}>Business context not ready</Text>
        <Text style={s.emptyText}>
          Property / financial year could not be resolved from your session yet.
        </Text>
      </View>
    );
  }

  if (!charts.length) {
    return (
      <View style={[s.center, { backgroundColor: T.bg }]}>
        <Icon name="layers" size={30} color={T.muted} />
        <Text style={s.emptyTitle}>No charts to prioritise</Text>
        <Text style={s.emptyText}>
          No allocation charts were found for this property / year.
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.flex, { backgroundColor: T.bg }]}>
      {!!error && (
        <View style={s.errorBar}>
          <Icon name="error-outline" size={16} color="#fff" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <StatusLegend
        refreshing={refreshing}
        onRefresh={handleRefresh}
        canSave={canSave}
        saving={saving}
        dirty={dirty}
        onSave={() => onSave(prpGroup, yearNo)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <View style={s.searchBar}>
        <Icon name="search" size={16} color={T.muted} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search chart no, party, design, shade…"
          placeholderTextColor={T.muted}
          style={s.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!searchText && (
          <TouchableOpacity
            onPress={() => setSearchText('')}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Icon name="close" size={16} color={T.muted} />
          </TouchableOpacity>
        )}
      </View>

      {visibleCharts.length ? (
        <ChartList
          charts={visibleCharts}
          canEdit={dragEnabled}
          onReorder={reorderCharts}
          onOpenStatus={setStatusModalKey}
        />
      ) : (
        <View style={s.center}>
          <Icon name="filter-list" size={26} color={T.muted} />
          <Text style={s.emptyTitle}>No matching charts</Text>
          <Text style={s.emptyText}>
            {searchText.trim()
              ? `Nothing matches "${searchText.trim()}"${statusFilter !== 'ALL' ? ` with status "${statusFilter}"` : ''}.`
              : `Nothing currently has a shade marked "${statusFilter}". Try a different status or tap All.`}
          </Text>
        </View>
      )}

      <ShadeStatusModal
        visible={!!statusModalKey}
        chart={activeStatusChart}
        canSave={canSave}
        onClose={() => setStatusModalKey(null)}
        onSaved={handleStatusSaved}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status legend — shown once, right under the top error bar / above list.  */
/*  Also hosts the compact Refresh (icon-only) and Save actions.             */
/* -------------------------------------------------------------------------- */

function StatusLegend({
  refreshing,
  onRefresh,
  canSave,
  saving,
  dirty,
  onSave,
  statusFilter,
  onStatusFilterChange,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  canSave: boolean;
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  statusFilter: ShadeStatus | 'ALL';
  onStatusFilterChange: (value: ShadeStatus | 'ALL') => void;
}) {
  return (
    <View style={s.legendBar}>
      <View style={s.legendRow}>
        <TouchableOpacity
          onPress={() => onStatusFilterChange('ALL')}
          style={[
            s.legendPill,
            statusFilter === 'ALL' && { borderColor: T.ink, backgroundColor: `${T.ink}12` },
          ]}
          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
        >
          <Text style={[s.legendText, statusFilter === 'ALL' && { color: T.ink, fontWeight: '900' }]}>
            All
          </Text>
        </TouchableOpacity>

        {STATUS_OPTIONS.map((option) => {
          const active = statusFilter === option;
          const color = STATUS_COLORS[option];
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onStatusFilterChange(active ? 'ALL' : option)}
              style={[
                s.legendPill,
                active && { borderColor: color, backgroundColor: `${color}18` },
              ]}
              hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
            >
              <View style={[s.legendDot, { backgroundColor: color }]} />
              <Text style={[s.legendText, active && { color, fontWeight: '900' }]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.legendActions}>
        <TouchableOpacity
          onPress={onRefresh}
          disabled={refreshing}
          style={s.iconBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={T.copper} />
          ) : (
            <Icon name="refresh" size={16} color={T.copper} />
          )}
        </TouchableOpacity>

        {canSave && (
          <TouchableOpacity
            onPress={onSave}
            disabled={saving || !dirty}
            style={[s.saveSmallBtn, { opacity: saving || !dirty ? 0.5 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="save" size={14} color="#fff" />
            )}
            <Text style={s.saveSmallBtnText}>Save</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shade status modal                                                        */
/* -------------------------------------------------------------------------- */

function ShadeStatusModal({
  visible,
  chart,
  canSave,
  onClose,
  onSaved,
}: {
  visible: boolean;
  chart: PriorityChart | null;
  canSave: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { prpCode, yearNo, isReady, prpGroup } = useBusinessContext();
  const [draft, setDraft] = useState<Record<string, ShadeStatus | null>>({});
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && chart) {
      const initial: Record<string, ShadeStatus | null> = {};
      chart.shades.forEach((shade) => {
        initial[shadeKeyOf(shade)] = shade.Status ?? null;
      });
      setDraft(initial);
      setModalError(null);
    }
  }, [visible, chart]);

  const toggleStatus = useCallback((shadeKey: string, status: ShadeStatus) => {
    setDraft((current) => ({
      ...current,
      [shadeKey]: current[shadeKey] === status ? null : status,
    }));
  }, []);

  const handleSave = useCallback(async (prpGroup, yearNo) => {
    if (!chart || saving) return;
    setSaving(true);
    setModalError(null);

    const payload = {
      ChartNo: chart.ChartNo,
      OrderUId: chart.OrderUId,
      OrderSrNo: chart.OrderSrNo,
      ParCode: chart.ParCode,
      prptype: prpGroup,
      yearno: Number(yearNo) || yearNo,
      shades: chart.shades.map((shade) => {
        const key = shadeKeyOf(shade);
        const selected = draft[key] ?? null;
        return {
          ShdCode: shade.ShdCode,
          ShdName: shade.ShdName,
          AllocationId: shade.AllocationId ?? null,
          Status: selected ? selected : 'none',
        };
      }),
    };

    try {
      console.log('[Priority] save_priority_status request ->', payload);
      const response: any = await PriorityAPI.saveShadeStatus(payload);
      console.log('[Priority] save_priority_status response ->', response);

      const body = response?.data ?? response;
      console.log('[Priority] save_priority_status response body ->', body);
      const saved =
        body === true ||
        body?.status === true ||
        body?.success === true ||
        body?.response === true ||
        body?.data === true;

      if (!saved) {
        throw new Error(body?.message || 'Unable to save shade status.');
      }

      // Do NOT update the card from draft data. The backend is authoritative.
      await onSaved();
      onClose();
    } catch (err: any) {
      setModalError(err?.message || 'Unable to save shade status.');
    } finally {
      setSaving(false);
    }
  }, [chart, draft, saving, onSaved, onClose]);

  if (!chart) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.header}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={ms.title} numberOfLines={1}>{chart.ChartNo || '—'}</Text>
              <Text style={ms.subtitle} numberOfLines={1}>
                {chart.DesignName || chart.ApcChartName || ' '}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Icon name="close" size={20} color={T.muted} />
            </TouchableOpacity>
          </View>

          {!!modalError && (
            <View style={s.errorBar}>
              <Icon name="error-outline" size={16} color="#fff" />
              <Text style={s.errorText}>{modalError}</Text>
            </View>
          )}

          <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.body}>
            {chart.shades.map((shade, idx) => {
              const key = shadeKeyOf(shade);
              const selected = draft[key] ?? null;
              return (
                <View key={`${key}-${idx}`} style={ms.shadeRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={ms.shadeName} numberOfLines={1}>{shade.ShdName}</Text>
                    <Text style={ms.shadeMeta} numberOfLines={1}>
                      {shade.ShdCode ? `Code ${shade.ShdCode} · ` : ''}{qtyLabel(shade.AllocationQty)} m
                    </Text>
                  </View>
                  <View style={ms.statusOptions}>
                    {STATUS_OPTIONS.map((option) => {
                      const isSelected = selected === option;
                      const color = STATUS_COLORS[option];
                      return (
                        <TouchableOpacity
                          key={option}
                          onPress={() => toggleStatus(key, option)}
                          style={[
                            ms.statusPill,
                            {
                              borderColor: isSelected ? color : T.border,
                              backgroundColor: isSelected ? `${color}22` : T.sub,
                            },
                          ]}
                        >
                          <View style={[ms.statusPillDot, { backgroundColor: color }]} />
                          <Text
                            style={[ms.statusPillText, { color: isSelected ? color : T.muted }]}
                            numberOfLines={1}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
            <View style={{ height: 12 }} />
          </ScrollView>

          {canSave && (
            <View style={ms.footer}>
              <TouchableOpacity
                onPress={() => handleSave(prpGroup, yearNo)}
                disabled={saving}
                style={[s.saveBtn, { opacity: saving ? 0.6 : 1 }]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="save" size={18} color="#fff" />
                )}
                <Text style={s.saveBtnText}>Save status</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chart list — precise handle-only drag reorder, virtualized AND accurate   */
/*  at scale (thousands to 1,00,000+ charts).                                */
/*                                                                            */
/*  Two separate problems had to be solved together here:                    */
/*   1. RENDERING: a plain ScrollView mounts every card's full JSX tree up-   */
/*      front, which is what freezes the app once there are a few thousand   */
/*      charts. Fixed with FlatList, which only mounts cards near the        */
/*      viewport (LIST_* tuning below) and recycles the rest.                */
/*   2. DRAG ACCURACY: once rendering is virtualized, a card that isn't      */
/*      currently mounted has no real on-screen position to measure — so any */
/*      drop-target math that depends on *measuring* card layouts (onLayout) */
/*      only ever knows about the small mounted window, and guesses wrong    */
/*      for anything further away. That's what made reordering land in the   */
/*      wrong place with large datasets.                                    */
/*                                                                            */
/*  The fix for (2): every card is given a FIXED height (CARD_BOX_HEIGHT).   */
/*  With a fixed, uniform row height, the on-screen position of ANY chart —  */
/*  mounted or not — is pure arithmetic: `LIST_PADDING_TOP + index *         */
/*  ITEM_HEIGHT`. So the drop-target index is computed with plain division,  */
/*  never by measuring or scanning cards. This is O(1) per pointer-move      */
/*  event and gives an EXACT index regardless of how many charts there are   */
/*  or how many of them are actually mounted right now — the same accuracy  */
/*  as the original (unvirtualized) implementation, but it scales.          */
/*                                                                            */
/*  Trade-off: to keep every card exactly CARD_BOX_HEIGHT tall regardless of */
/*  content, the shade-chip row is a single horizontally-scrollable line —   */
/*  no shade is ever hidden or truncated; you swipe sideways to see the rest.*/
/*                                                                            */
/*  Two more things keep this scaling on the render side:                   */
/*   - Each card is its own React.memo'd component (ChartCard) so moving     */
/*     the drop-line only re-renders the (at most two) cards whose line/     */
/*     dragging flags actually changed.                                     */
/*   - The drag handle's PanResponder is created once per MOUNTED card via   */
/*     useMemo inside ChartCard, not once per chart up-front.                */
/*                                                                            */
/*  UX rule (unchanged): the dragged card NEVER gets moved away from its     */
/*  original slot. The user drags only the handle; a strong insertion line   */
/*  moves between cards and shows exactly where the card will land. The      */
/*  actual array is changed only on release. While the handle is held near   */
/*  the top/bottom edge, the list auto-scrolls continuously so long lists    */
/*  remain draggable.                                                       */
/* -------------------------------------------------------------------------- */

const AUTO_SCROLL_EDGE = 72;
const AUTO_SCROLL_MAX_STEP = 16;
const AUTO_SCROLL_INTERVAL = 16;

// FlatList tuning for very large chart lists — see RENDERING note above.
const LIST_INITIAL_RENDER = 12;
const LIST_WINDOW_SIZE = 10;
const LIST_MAX_PER_BATCH = 10;
const LIST_UPDATE_BATCH_PERIOD = 50;

// --- Fixed row geometry — see DRAG ACCURACY note above. Every card is this ---
// --- exact height; this is what makes drop-target index math exact & O(1). --
const CARD_BOX_HEIGHT = 138; // the card's own box height (its `s.card` style)
const ROW_GAP = 6;           // matches `s.card.marginBottom` below
const ITEM_HEIGHT = CARD_BOX_HEIGHT + ROW_GAP; // total vertical space one row consumes
const LIST_PADDING_TOP = 8;  // matches `s.listContent.padding` below

/* ---------------------------------------------------------------------- */
/*  ChartCard — one row, fixed height. Memoized so unaffected rows never   */
/*  re-render while dragging; only the card being dragged and the (at      */
/*  most two) cards around the current drop-line change props on any       */
/*  given frame.                                                           */
/* ---------------------------------------------------------------------- */

type ChartCardProps = {
  chart: PriorityChart;
  index: number;
  canEdit: boolean;
  isDragging: boolean;
  showTopLine: boolean;
  showBottomLine: boolean;
  onOpenStatus: (chartKey: string) => void;
  onDragStart: (chartKey: string, index: number, pageY: number) => void;
  onDragMove: (pageY: number) => void;
  onDragEnd: () => void;
};

const ChartCard = React.memo(function ChartCard({
  chart,
  index,
  canEdit,
  isDragging,
  showTopLine,
  showBottomLine,
  onOpenStatus,
  onDragStart,
  onDragMove,
  onDragEnd,
}: ChartCardProps) {
  // Created once per MOUNTED card — never once per chart in the whole
  // dataset, since only visible cards ever mount.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canEdit,
        onMoveShouldSetPanResponder: () => canEdit,
        onPanResponderGrant: (event) => onDragStart(chart.key, index, event.nativeEvent.pageY),
        onPanResponderMove: (event) => onDragMove(event.nativeEvent.pageY),
        onPanResponderRelease: onDragEnd,
        onPanResponderTerminate: onDragEnd,
        onPanResponderTerminationRequest: () => false,
      }),
    [canEdit, chart.key, index, onDragStart, onDragMove, onDragEnd],
  );

  return (
    <React.Fragment>
      {showTopLine && <View style={s.dropLineTop} />}

      <View
        style={[
          s.card,
          { borderColor: T.border },
          isDragging && s.draggingCard,
        ]}
      >
        <View style={s.cardInner}>
          {canEdit ? (
            <View style={s.dragHandle} {...panResponder.panHandlers}>
              <Icon name="drag-handle" size={22} color={T.muted} />
            </View>
          ) : null}

          <View style={s.cardBody}>
            <View style={s.topRow}>
              <View style={s.priorityInline}>
                <View style={s.priorityItem}>
                  <View style={[s.numBadge, { borderColor: T.green }]}>
                    <Text style={s.numText}>{chart.displayPriority}</Text>
                  </View>
                  <Text style={[s.priorityLabel, { color: T.green }]}>Self</Text>
                </View>

                <View style={s.priorityItem}>
                  <View style={s.numBadgeSmall}>
                    <Text style={s.numTextSmall}>{chart.savedClientPriority ?? '—'}</Text>
                  </View>
                  <Text style={s.priorityLabel}>Client</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => onOpenStatus(chart.key)}
                style={s.statusOpenBtn}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Icon name="assignment" size={12} color={T.copper} />
                <Text style={s.statusOpenBtnText}>Status</Text>
              </TouchableOpacity>
            </View>

            <View style={s.chartInfoRow}>
              <View style={s.chartIdentity}>
                <Text style={s.chartNo} numberOfLines={1}>
                  {chart.DesignName || '—'}
                </Text>
                {!!chart.PartyName && (
                  <Text style={s.partyName} numberOfLines={1}>
                    {chart.PartyName}
                  </Text>
                )}
              </View>

              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Icon name="local-offer" size={11} color={T.muted} />
                  <Text style={s.metaText}>
                    {chart.qty ? `${qtyLabel(chart.qty)} m` : '—'}
                  </Text>
                </View>
                <View style={s.metaItem}>
                  <Icon name="event" size={11} color={T.muted} />
                  <Text style={s.metaText}>{formatDate(chart.LastDate)}</Text>
                </View>
              </View>
            </View>

            <View style={s.secondaryRow}>
              {!!chart.DesignName && (
                <Text style={s.designName} numberOfLines={1}>
                  {chart.ChartNo}
                </Text>
              )}
              {!!chart.ApcChartName && (
                <View style={s.apcBadge}>
                  <Icon name="palette" size={10} color={T.amber} />
                  <Text style={s.apcBadgeText} numberOfLines={1}>
                    {chart.ApcChartName}
                  </Text>
                </View>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.chipScroll}
              contentContainerStyle={s.chipScrollContent}
            >
              {chart.shades.map((shade, si) => {
                const statusColor = shade.Status ? STATUS_COLORS[shade.Status] : null;
                return (
                  <View
                    key={`${shade.ShdCode || shade.ShdName}-${si}`}
                    style={[
                      s.chip,
                      statusColor
                        ? {
                          borderColor: statusColor,
                          backgroundColor: `${statusColor}18`,
                        }
                        : null,
                    ]}
                  >
                    {!!statusColor && (
                      <View style={[s.chipDot, { backgroundColor: statusColor }]} />
                    )}
                    <Text style={s.chipText} numberOfLines={1}>
                      {shade.ShdName}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>

      {showBottomLine && <View style={s.dropLine} />}
    </React.Fragment>
  );
}, (prev, next) =>
  prev.chart === next.chart &&
  prev.index === next.index &&
  prev.canEdit === next.canEdit &&
  prev.isDragging === next.isDragging &&
  prev.showTopLine === next.showTopLine &&
  prev.showBottomLine === next.showBottomLine &&
  prev.onOpenStatus === next.onOpenStatus &&
  prev.onDragStart === next.onDragStart &&
  prev.onDragMove === next.onDragMove &&
  prev.onDragEnd === next.onDragEnd,
);

/* ---------------------------------------------------------------------- */
/*  ChartList — the FlatList shell + all drag/auto-scroll bookkeeping.     */
/*  See the big comment above: drop-target detection is pure index math,   */
/*  not layout measurement, so it is exact for any chart count.            */
/* ---------------------------------------------------------------------- */

function ChartList({
  charts,
  canEdit,
  onReorder,
  onOpenStatus,
}: {
  charts: PriorityChart[];
  canEdit: boolean;
  onReorder: (fromIndex: number, toIndex: number, list: PriorityChart[]) => void;
  onOpenStatus: (chartKey: string) => void;
}) {
  const listRef = useRef<FlatList<PriorityChart>>(null);
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const viewportTopRef = useRef(0);

  // Drag callbacks below are created ONCE (stable useCallback identities) so
  // ChartCard's per-card PanResponder memoization isn't invalidated on every
  // render. They read the live chart list through this ref instead of
  // closing over the `charts` prop directly.
  const chartsRef = useRef(charts);
  useEffect(() => { chartsRef.current = charts; }, [charts]);

  const dragRef = useRef<{
    key: string;
    fromIndex: number;
    centerContentY: number;
    startMoveY: number;
    lastMoveY: number;
    startScrollOffset: number;
    viewportTop: number;
    autoScrollDirection: -1 | 0 | 1;
    autoScrollSpeed: number;
  } | null>(null);

  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  // `dropAfterIndex` means: show the insertion line immediately BELOW this
  // index. `-1` means the line is at the very top (before the first card).
  // Mirrored into a ref so `handleDragEnd` (a stable callback) always reads
  // the latest value without needing to be recreated on every change.
  const [dropAfterIndex, setDropAfterIndexState] = useState<number | null>(null);
  const dropAfterIndexRef = useRef<number | null>(null);
  const setDropAfterIndex = useCallback((value: number | null) => {
    dropAfterIndexRef.current = value;
    setDropAfterIndexState(value);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current != null) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  // Exact content-space top-of-card for any index — pure arithmetic, valid
  // for a card whether it's currently mounted or not (see the big comment
  // above). This is what removes any dependency on measuring layouts.
  const centerContentYForIndex = useCallback(
    (index: number) => LIST_PADDING_TOP + index * ITEM_HEIGHT + CARD_BOX_HEIGHT / 2,
    [],
  );

  // Store the absolute initial finger Y separately. This avoids accumulating
  // floating-point/scroll errors when auto-scroll changes the list's offset.
  const updateDropTarget = useCallback((moveY: number) => {
    const drag = dragRef.current;
    if (!drag) return;

    const list = chartsRef.current;
    const viewport = viewportHeightRef.current;
    const offset = scrollOffsetRef.current;

    // Auto-scroll is based on the actual finger position in the visible
    // viewport, not on the dragged card. This remains accurate while the
    // list itself is scrolling.
    const screenY = moveY - drag.viewportTop;

    if (viewport > 0) {
      if (screenY < AUTO_SCROLL_EDGE) {
        const strength = Math.min(
          1,
          Math.max(0, (AUTO_SCROLL_EDGE - screenY) / AUTO_SCROLL_EDGE),
        );
        drag.autoScrollDirection = -1;
        drag.autoScrollSpeed = Math.max(2, Math.round(AUTO_SCROLL_MAX_STEP * strength));
      } else if (screenY > viewport - AUTO_SCROLL_EDGE) {
        const strength = Math.min(
          1,
          Math.max(0, (screenY - (viewport - AUTO_SCROLL_EDGE)) / AUTO_SCROLL_EDGE),
        );
        drag.autoScrollDirection = 1;
        drag.autoScrollSpeed = Math.max(2, Math.round(AUTO_SCROLL_MAX_STEP * strength));
      } else {
        drag.autoScrollDirection = 0;
        drag.autoScrollSpeed = 0;
      }
    }

    // Finger position -> content position. The dragged card's original centre
    // is adjusted by the finger movement plus whatever the list has
    // auto-scrolled since the drag began.
    const movingCenter =
      drag.centerContentY +
      (moveY - drag.startMoveY) +
      (offset - drag.startScrollOffset);

    // Pure index math — O(1), exact for any chart count, and independent of
    // which cards happen to be mounted. This is what makes drag-to-position
    // land exactly where the finger is, even with lakhs of charts. Every
    // card's centre sits at `LIST_PADDING_TOP + i*ITEM_HEIGHT +
    // CARD_BOX_HEIGHT/2`, evenly spaced by ITEM_HEIGHT — so the index of the
    // last card whose centre is at/above `movingCenter` is a single division.
    const relative = movingCenter - LIST_PADDING_TOP - CARD_BOX_HEIGHT / 2;
    let afterIndex = Math.floor(relative / ITEM_HEIGHT);
    afterIndex = Math.max(-1, Math.min(list.length - 1, afterIndex));

    setDropAfterIndex(afterIndex);
  }, [setDropAfterIndex]);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();

    autoScrollTimerRef.current = setInterval(() => {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.autoScrollDirection === 0) return;

      const currentOffset = scrollOffsetRef.current;
      const nextOffset = Math.max(
        0,
        currentOffset + drag.autoScrollDirection * drag.autoScrollSpeed,
      );

      if (nextOffset === currentOffset) return;

      scrollOffsetRef.current = nextOffset;
      listRef.current?.scrollToOffset({ offset: nextOffset, animated: false });

      // Recalculate immediately after each auto-scroll tick so the highlighted
      // line follows the finger all the way through a long list.
      updateDropTarget(drag.lastMoveY);
    }, AUTO_SCROLL_INTERVAL);
  }, [stopAutoScroll, updateDropTarget]);

  const handleDragEnd = useCallback(() => {
    const drag = dragRef.current;

    stopAutoScroll();
    dragRef.current = null;
    setDraggingKey(null);

    if (!drag) {
      setDropAfterIndex(null);
      return;
    }

    const afterIndex = dropAfterIndexRef.current;
    const fromIndex = drag.fromIndex;
    const list = chartsRef.current;

    setDropAfterIndex(null);

    if (afterIndex == null) return;

    // Convert "line below index X" into the final array index AFTER the
    // dragged card is removed. This is the important part that prevents
    // off-by-one reorder bugs when moving upward vs downward.
    let targetIndex: number;
    if (afterIndex < 0) {
      targetIndex = 0;
    } else if (afterIndex < fromIndex) {
      targetIndex = afterIndex + 1;
    } else if (afterIndex > fromIndex) {
      targetIndex = afterIndex;
    } else {
      targetIndex = fromIndex;
    }

    targetIndex = Math.max(0, Math.min(list.length - 1, targetIndex));

    if (targetIndex !== fromIndex) {
      onReorder(fromIndex, targetIndex, list);
    }
  }, [onReorder, setDropAfterIndex, stopAutoScroll]);

  const handleDragStart = useCallback((chartKey: string, index: number, pageY: number) => {
    dragRef.current = {
      key: chartKey,
      fromIndex: index,
      centerContentY: centerContentYForIndex(index),
      startMoveY: pageY,
      lastMoveY: pageY,
      startScrollOffset: scrollOffsetRef.current,
      viewportTop: viewportTopRef.current,
      autoScrollDirection: 0,
      autoScrollSpeed: 0,
    };

    setDraggingKey(chartKey);
    setDropAfterIndex(index > 0 ? index - 1 : -1);
    startAutoScroll();
  }, [centerContentYForIndex, setDropAfterIndex, startAutoScroll]);

  const handleDragMove = useCallback((pageY: number) => {
    const drag = dragRef.current;
    if (!drag) return;

    drag.lastMoveY = pageY;
    updateDropTarget(pageY);
  }, [updateDropTarget]);

  useEffect(() => {
    return () => stopAutoScroll();
  }, [stopAutoScroll]);

  const keyExtractor = useCallback((item: PriorityChart) => item.key, []);

  // Fixed row height means FlatList never has to measure anything to know
  // where an item sits — this also makes scrolling/virtualization itself
  // cheaper and more accurate for very large lists.
  const getItemLayout = useCallback(
    (_data: ArrayLike<PriorityChart> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: LIST_PADDING_TOP + index * ITEM_HEIGHT,
      index,
    }),
    [],
  );

  const renderItem = useCallback(({ item, index }: { item: PriorityChart; index: number }) => {
    const isDragging = draggingKey === item.key;

    // The line is intentionally BELOW the selected card, never floating
    // over the card. For the first insertion position it is shown above
    // the first card.
    const showTopLine =
      draggingKey != null &&
      dropAfterIndex === -1 &&
      index === 0 &&
      !isDragging;

    const showBottomLine =
      draggingKey != null &&
      dropAfterIndex === index &&
      !isDragging;

    return (
      <ChartCard
        chart={item}
        index={index}
        canEdit={canEdit}
        isDragging={isDragging}
        showTopLine={showTopLine}
        showBottomLine={showBottomLine}
        onOpenStatus={onOpenStatus}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />
    );
  }, [draggingKey, dropAfterIndex, canEdit, onOpenStatus, handleDragStart, handleDragMove, handleDragEnd]);

  return (
    <FlatList
      ref={listRef}
      data={charts}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      contentContainerStyle={s.listContent}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(event) => {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        const drag = dragRef.current;
        if (drag) {
          // Keep the line correct even when the list emits a native scroll
          // event during an edge-scroll tick.
          updateDropTarget(drag.lastMoveY);
        }
      }}
      onLayout={(event) => {
        viewportHeightRef.current = event.nativeEvent.layout.height;
        // onLayout gives us height but not an absolute screen Y. Measure it
        // once so edge auto-scroll uses the real finger position.
        requestAnimationFrame(() => {
          const node: any = (listRef.current as any)?.getNativeScrollRef?.() ?? listRef.current;
          node?.measureInWindow?.((_x: number, y: number, _width: number, height: number) => {
            viewportTopRef.current = y;
            viewportHeightRef.current = height;
          });
        });
      }}
      scrollEnabled={!draggingKey}
      // --- large-dataset tuning (see RENDERING note above) -----------------
      initialNumToRender={LIST_INITIAL_RENDER}
      windowSize={LIST_WINDOW_SIZE}
      maxToRenderPerBatch={LIST_MAX_PER_BATCH}
      updateCellsBatchingPeriod={LIST_UPDATE_BATCH_PERIOD}
      removeClippedSubviews
      ListFooterComponent={<View style={{ height: 24 }} />}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

const hs = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700', marginLeft: 4 },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: T.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '86%',
    minHeight: '55%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  title: { fontSize: 16, fontWeight: '900', color: T.ink },
  subtitle: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
  closeBtn: { padding: 6, marginLeft: 8 },
  body: { padding: 14 },
  shadeRow: {
    borderWidth: 1, borderColor: T.border, borderRadius: 12,
    padding: 12, marginBottom: 10, backgroundColor: T.surface,
  },
  shadeName: { fontSize: 13, fontWeight: '800', color: T.ink },
  shadeMeta: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 2 },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  statusPillDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  footer: {
    padding: 14, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.bg,
  },
});

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText: { marginTop: 8, fontSize: 12, color: T.muted, fontWeight: '600' },
  emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: '900', color: T.ink },
  emptyText: { marginTop: 4, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 300, color: T.muted },

  errorBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.red, paddingHorizontal: 14, paddingVertical: 9,
  },
  errorText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6, flex: 1 },

  legendBar: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: T.border,
    backgroundColor: T.surface,
  },
  legendRow: {
    flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6,
    minWidth: 0,
  },
  legendPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'transparent', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '700', color: T.muted },

  legendActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: `${T.copper}55`, backgroundColor: `${T.copper}18`,
  },
  saveSmallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.green, borderRadius: 8,
    paddingHorizontal: 12, height: 30,
  },
  saveSmallBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: T.border,
    backgroundColor: T.surface,
  },
  searchInput: {
    flex: 1, fontSize: 13, fontWeight: '600', color: T.ink,
    padding: 0,
  },

  listContent: { padding: 8, paddingBottom: 20 },

  card: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderRadius: 11,
    padding: 8,
    marginBottom: ROW_GAP,
    minWidth: 0,
    height: CARD_BOX_HEIGHT,
    overflow: 'hidden',
  },
  cardInner: { flexDirection: 'row', alignItems: 'stretch', minWidth: 0 },
  dragHandle: {
    width: 26,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    borderRadius: 8,
    // backgroundColor: T.sub,
  },
  cardBody: { flex: 1, minWidth: 0 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
    gap: 8,
  },
  priorityInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  numBadge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F4E3DC',
    borderWidth: 1.5,
  },
  numBadgeSmall: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.sub, borderWidth: 1, borderColor: T.border,
  },
  priorityLabel: { fontSize: 9.5, fontWeight: '800', color: T.muted },

  statusOpenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4,
    borderWidth: 1, borderColor: `${T.copper}55`, backgroundColor: `${T.copper}18`,
    borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4,
    flexShrink: 0,
  },
  statusOpenBtnText: { fontSize: 9.5, fontWeight: '800', color: T.copper },

  chartInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 5,
    minWidth: 0,
  },
  chartIdentity: { flex: 1, minWidth: 0 },
  chartNo: { fontSize: 13, fontWeight: '900', color: T.ink, flexShrink: 1 },
  partyName: {
    fontSize: 10.5, fontWeight: '700', color: T.muted,
    marginTop: 1, flexShrink: 1,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 9.5, fontWeight: '600', color: T.muted },

  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
  },
  designName: { fontSize: 9.5, fontWeight: '700', color: T.ink, flexShrink: 1 },
  apcBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
    backgroundColor: `${T.amber}22`, borderColor: `${T.amber}55`,
    maxWidth: '100%',
  },
  apcBadgeText: {
    fontSize: 9.5, fontWeight: '800', color: T.amber, marginLeft: 3, flexShrink: 1,
  },

  chipScroll: {
    marginTop: 5, width: '100%',
  },
  chipScrollContent: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 4,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
    borderColor: T.border, backgroundColor: T.sub,
    maxWidth: 220,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 9.5, fontWeight: '600', color: T.ink, maxWidth: 180 },

  draggingCard: {
    borderColor: T.copper,
    opacity: 0.78,
  },
  dropLine: {
    height: 4,
    borderRadius: 2,
    backgroundColor: T.copper,
    marginHorizontal: 2,
    marginTop: 1,
    marginBottom: 5,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  dropLineTop: {
    height: 4,
    borderRadius: 2,
    backgroundColor: T.copper,
    marginHorizontal: 2,
    marginTop: -3,
    marginBottom: 5,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.green, borderRadius: 10, paddingVertical: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});