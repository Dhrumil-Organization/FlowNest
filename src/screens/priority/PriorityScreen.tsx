// FILE: src/screens/priority/PriorityScreen.tsx
// Dyeing → Priority tab. Reorder the sales-order allocation charts for the
// current property + financial year, save that order back, and track every
// colour's dyeing status LOT-WISE and ROW-WISE.
//
// Conventions match every other migrated tab screen:
//   - theme:             T from '@/src/theme'
//   - business context:  useBusinessContext() (prpGroup / yearNo from session)
//   - permissions:        passed in by DyeingScreen (resource
//                         'priority.chart_priority' — see priority.permission.ts)
//   - API:                 DyeingService from '@/src/screens/dyeing/dyeingApi'
//                         (hard-coded JSON right now; real calls are commented
//                         in that file)
//   - header:              no header of its own — only the "Unsaved / Saved"
//                         badge is pushed into the global AppHeader.
//
// ---------------------------------------------------------------------------
// WHAT CHANGED vs the old Priority screen (and WHY)
//   1. Status is now ROW-WISE. The old sheet saved one payload per chart with
//      the chart's OrderSrNo for every shade, and the old browse matched shade
//      names to codes by position across two un-ordered STRING_AGGs — so a
//      status could land on the wrong shade ("common" status). Every shade now
//      carries its OWN OrderSrNo / AllocationId / ShdCode from the backend,
//      and each save posts exactly one lot of one colour.
//   2. A colour can be split into dyeing LOTS (own lot no., qty, status,
//      append-only dated history). The colour status = its slowest lot.
//   3. New hard-coded status 'Lorry Cut' (re-dye / re-process with a reason).
//   4. Card chips show, per colour, the FIRST LETTER of each lot's status in
//      that status's colour + the lot no. (S / D / F / J / ✂).
//   5. Client priority is display-only everywhere (card + sheet, lock icon);
//      it is sent back unchanged on save.
//
// UNCHANGED: default ordering rules, drag-handle reorder (FlatList + fixed
// row height + O(1) index math + edge auto-scroll), filter-safe reorder,
// search disabling drag, Save → re-browse, save_priority_party payload.
// ---------------------------------------------------------------------------
// NOTE ON DEFAULT ORDERING (decided independently, per chart):
//   1. Self priority present                -> sort by Self priority.
//   2. Self priority missing, Client present -> sort by Client priority.
//   3. Both missing                          -> bottom, original browse order.
//   Client priority is NEVER copied into Self priority and vice-versa.
//
// NOTE ON GROUPING KEY (chart identity): ChartNo + ParCode + OrderUId.
// ---------------------------------------------------------------------------

import { useBusinessContext } from '@/src/core/business';
import { useHeaderExtrasStore } from '@/src/core/layout/headerExtras';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ColourStatusSheet } from '../dyeing/ColourStatusSheet';
import { DyeingService, isSaved, messageOf, unwrapBody } from '../dyeing/dyeingApi';
import {
  deriveColourStatus,
  DyeEvent,
  DyeLot,
  lotsTotalQty,
  normalizeStatus,
  num,
  parseAnyDate,
  PriorityChart,
  PriorityShade,
  qtyLabel,
  ShadeStatus,
  STATUS_COLORS,
  STATUS_LETTER,
  STATUS_OPTIONS,
  toOutwardLotBriefs,
  withVirtualRemainder,
} from '../dyeing/dyeingModel';

export type PriorityPerms = {
  canEdit: boolean; // drag / reorder
  canSave: boolean; // save priority order
  canStatus: boolean; // row-wise status update (incl. Lorry Cut)
  canLot: boolean; // add / edit / remove lots
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const numberValue = num;

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

const positiveOrNull = (value: any) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/* -------------------------------------------------------------------------- */
/*  Normalisers for the backend lot / event shapes                             */
/* -------------------------------------------------------------------------- */

const toEvent = (raw: any): DyeEvent | null => {
  const status = normalizeStatus(raw?.Status ?? raw?.status);
  if (!status) return null;
  return {
    Id: raw?.Id ?? raw?.id ?? `${status}-${raw?.StatusDate}`,
    Status: status,
    StatusDate: parseAnyDate(raw?.StatusDate ?? raw?.statusdate),
    Qty: num(raw?.Qty ?? raw?.qty),
    IsRework: !!Number(raw?.IsRework ?? raw?.isrework ?? 0),
    LorryCutReason: raw?.LorryCutReason ?? raw?.lorrycutreason ?? null,
    Remarks: raw?.Remarks ?? raw?.remarks ?? null,
    ChallanNo: raw?.ChallanNo ?? raw?.challanno ?? null,
    AgainstChallanNo: raw?.AgainstChallanNo ?? raw?.againstchallanno ?? null,
    MillName: raw?.MillName ?? raw?.millname ?? null,
    Rate: raw?.Rate != null && raw?.Rate !== '' ? num(raw.Rate) : null,
    CreatedBy: raw?.CreatedBy ?? raw?.createdby ?? null,
    CreatedAt: raw?.CreatedAt ?? raw?.createdat ?? null,
    FromLotNo: raw?.FromLotNo ?? undefined,
    Source: raw?.Source ?? null,
  };
};

const toEvents = (list: any): DyeEvent[] =>
  (Array.isArray(list) ? list : []).map(toEvent).filter(Boolean) as DyeEvent[];

const toLot = (raw: any): DyeLot => {
  const history = toEvents(raw?.history);
  return {
    LotId: raw?.LotId != null ? Number(raw.LotId) : null,
    LotNo: String(raw?.LotNo ?? '').trim(),
    LotQty: num(raw?.LotQty),
    Status: normalizeStatus(raw?.Status),
    StatusDate: parseAnyDate(raw?.StatusDate) || null,
    LorryCutCount: num(raw?.LorryCutCount) || history.filter((h) => h.Status === 'Lorry Cut').length,
    ParentId: raw?.ParentId != null && raw?.ParentId !== '' ? Number(raw.ParentId) : null,
    history,
    inheritedHistory: toEvents(raw?.inheritedHistory),
  };
};

/* -------------------------------------------------------------------------- */
/*  Ordering (unchanged rules)                                                 */
/* -------------------------------------------------------------------------- */

function sortAndNumber(charts: PriorityChart[]) {
  charts.forEach((chart, idx) => {
    (chart as any)._originalOrder = idx;
    const clientVals = chart.shades
      .map((item) => item.ClientPriority)
      .filter((value): value is number => value != null && value > 0);
    chart.savedClientPriority = clientVals.length ? Math.min(...clientVals) : null;

    const selfVals = chart.shades
      .map((item) => item.SelfPriority)
      .filter((value): value is number => value != null && value > 0);
    chart.savedSelfPriority = selfVals.length ? Math.min(...selfVals) : null;

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
    if (aKey != null && bKey != null) return aKey - bKey;
    if (aKey != null) return -1;
    if (bKey != null) return 1;
    return (a as any)._originalOrder - (b as any)._originalOrder;
  });

  charts.forEach((chart, idx) => { chart.displayPriority = idx + 1; });
  return charts;
}

/* -------------------------------------------------------------------------- */
/*  NEW browse shape: { Charts: [{..., shades: [{..., lots: [{..., history}]}]}]} */
/* -------------------------------------------------------------------------- */

export function chartsFromDyeingBrowse(rawCharts: any[]): PriorityChart[] {
  const grouped = new Map<string, PriorityChart>();

  rawCharts.forEach((row) => {
    const chartNo = String(row?.ChartNo ?? row?.chartno ?? '').trim();
    const parCode = String(row?.ParCode ?? row?.parcode ?? '').trim();
    const orderUId = numberValue(row?.OrderUId ?? row?.orderuid);
    const date = normalizeDate(row?.LastDate) || String(row?.LastDate ?? '').trim();
    const key = chartNo
      ? `CHART:${chartNo}::PAR:${parCode}::ORD:${orderUId}`
      : `DATE:${date}::PAR:${parCode}::ORD:${orderUId}`;

    const current = grouped.get(key) || ({
      key,
      ChartNo: chartNo,
      LastDate: date,
      OrderUId: orderUId,
      OrderSrNo: numberValue(row?.OrderSrNo ?? row?.ordersrno),
      ParCode: parCode,
      PartyName: String(row?.PartyName ?? row?.partyname ?? '').trim(),
      DesignCode: String(row?.dsncode ?? row?.DsnCode ?? '').trim(),
      DesignName: String(row?.dsnname ?? row?.DsnName ?? '').trim(),
      ApcChartName: String(row?.apcchartname ?? row?.ApcChartName ?? '').trim(),
      qty: 0,
      shades: [],
      savedClientPriority: null,
      savedSelfPriority: null,
      displayPriority: 0,
    } as PriorityChart);

    const chartClient = positiveOrNull(row?.ClientPriority ?? row?.Clientpriority ?? row?.clientpriority);
    const chartSelf = positiveOrNull(row?.SelfPriority ?? row?.selfpriority);

    (Array.isArray(row?.shades) ? row.shades : []).forEach((sd: any) => {
      const shdCode = String(sd?.ShdCode ?? sd?.shadeCode ?? '').trim();
      const shdName = String(sd?.ShdName ?? sd?.shadeName ?? '').trim();
      if (!shdCode && !shdName) return;
      const orderSrNo = numberValue(sd?.OrderSrNo ?? row?.OrderSrNo ?? 1) || 1;
      const qty = num(sd?.Qty ?? sd?.AllocationQty);
      const legacy = normalizeStatus(sd?.Status ?? sd?.status);
      const savedLots = (Array.isArray(sd?.lots) ? sd.lots : []).map(toLot);
      const colourHistory = toEvents(sd?.colourHistory);
      const outwardLots = toOutwardLotBriefs(sd?.outwardLots);
      const lotNos = String(sd?.LotNos ?? '').trim() || outwardLots.map((l) => l.LotNo).join('/');

      // identity of a shade row inside a chart = ShdCode + OrderSrNo
      const existing = current.shades.find(
        (x) => x.ShdCode === shdCode && x.OrderSrNo === orderSrNo && normName(x.ShdName) === normName(shdName),
      );
      if (existing) {
        existing.AllocationQty += qty;
        existing.colourHistory = [...existing.colourHistory, ...colourHistory];
        existing.lots = withVirtualRemainder(
          [...existing.lots.filter((l) => !l.virtual), ...savedLots],
          existing.AllocationQty,
          existing.Status,
        );
        existing.Status = deriveColourStatus(existing.lots) ?? existing.Status;
        existing.outwardLots = [...existing.outwardLots, ...outwardLots];
        existing.LotNos = Array.from(new Set(existing.outwardLots.map((l) => l.LotNo))).join('/') || existing.LotNos;
        existing.LotQty = lotsTotalQty(existing.outwardLots);
        return;
      }

      const lots = withVirtualRemainder(savedLots, qty, legacy);
      current.shades.push({
        ShdCode: shdCode,
        ShdName: shdName || shdCode,
        OrderSrNo: orderSrNo,
        AllocationId: sd?.AllocationId != null && sd?.AllocationId !== '' ? Number(sd.AllocationId) : null,
        AllocationQty: qty,
        ClientPriority: positiveOrNull(sd?.ClientPriority) ?? chartClient,
        SelfPriority: positiveOrNull(sd?.SelfPriority) ?? chartSelf,
        Status: savedLots.length ? deriveColourStatus(lots) : legacy,
        colourHistory,
        lots,
        outwardLots,
        LotNos: lotNos,
        LotQty: sd?.LotQty != null && sd?.LotQty !== '' && Number(sd.LotQty) > 0 ? Number(sd.LotQty) : lotsTotalQty(outwardLots),
      });
    });

    current.qty = current.shades.reduce((sum, s) => sum + s.AllocationQty, 0);
    if (current.shades.length) grouped.set(key, current);
  });

  return sortAndNumber(Array.from(grouped.values()));
}

/* -------------------------------------------------------------------------- */
/*  OLD browse shape (prioritybrowseparty → AllocationDetails) — kept so the   */
/*  tab still works if the old endpoint is switched back on. No lots there:    */
/*  each colour becomes one un-split lot carrying the old status.              */
/* -------------------------------------------------------------------------- */

function chartsFromLegacyBrowse(rows: any[]): PriorityChart[] {
  const rawCharts: any[] = [];
  const byKey = new Map<string, any>();
  rows.forEach((row) => {
    const chartNo = String(row?.ChartNo ?? row?.chartno ?? '').trim();
    const parCode = String(row?.ParCode ?? row?.parcode ?? '').trim();
    const orderUId = numberValue(row?.OrderUId ?? row?.orderuid);
    const key = `${chartNo}|${parCode}|${orderUId}`;
    let target = byKey.get(key);
    if (!target) {
      target = { ...row, ChartNo: chartNo, ParCode: parCode, OrderUId: orderUId, shades: [] };
      byKey.set(key, target);
      rawCharts.push(target);
    }
    const qtyByName = new Map<string, number>();
    String(row?.ShadeAllocation ?? '').split(',').map((p) => p.trim()).filter(Boolean).forEach((part) => {
      const idx = part.lastIndexOf(':');
      const name = idx === -1 ? part : part.slice(0, idx).trim();
      qtyByName.set(normName(name), (qtyByName.get(normName(name)) || 0) + (idx === -1 ? 0 : num(part.slice(idx + 1))));
    });
    const details = Array.isArray(row?.shadeDetails) ? row.shadeDetails : [];
    details.forEach((sd: any) => {
      const name = String(sd?.shadeName ?? '').trim();
      target.shades.push({
        ShdCode: String(sd?.shadeCode ?? '').trim(),
        ShdName: name,
        OrderSrNo: numberValue(row?.OrderSrNo) || 1,
        Qty: qtyByName.get(normName(name)) ?? 0,
        Status: sd?.status ?? null,
        ClientPriority: row?.ClientPriority ?? row?.Clientpriority,
        SelfPriority: row?.SelfPriority,
        lots: [],
      });
    });
  });
  return chartsFromDyeingBrowse(rawCharts);
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

type StatusFilter = ShadeStatus | 'ALL' | 'NONE';

export function PriorityScreen({ perms }: { perms: PriorityPerms }) {
  const { yearNo, isReady, prpGroup } = useBusinessContext();
  const { canEdit, canSave } = perms;

  const setHeaderExtras = useHeaderExtrasStore((state) => state.setHeaderExtras);
  const clearHeaderExtras = useHeaderExtrasStore((state) => state.clearHeaderExtras);

  const [charts, setCharts] = useState<PriorityChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusModalKey, setStatusModalKey] = useState<string | null>(null);
  // View-only filter: a chart matches when any of its lots is CURRENTLY at
  // that status ('NONE' = has a colour/lot with no status yet). `charts`
  // itself is never filtered, so Self priority + save payload stay correct.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchText, setSearchText] = useState('');

  const loadBrowse = useCallback(async (silent = false) => {
    if (!isReady) {
      setLoading(false);
      return;
    }
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      console.log('[Dyeing/Priority] Browse request ->', { prptype: prpGroup, yearno: yearNo });
      const response: any = await DyeingService.browse({ prptype: prpGroup, yearno: yearNo });
      const inner = unwrapBody(response);
      const grouped = Array.isArray(inner?.Charts)
        ? chartsFromDyeingBrowse(inner.Charts)
        : chartsFromLegacyBrowse(Array.isArray(inner?.AllocationDetails) ? inner.AllocationDetails : []);
      console.log('[Dyeing/Priority] grouped & sorted charts ->', grouped.length);
      setCharts(grouped);
      setDirty(false);
    } catch (err: any) {
      if (!silent) setCharts([]);
      setError(err?.message || 'Unable to load charts for priority.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isReady, prpGroup, yearNo]);

  const handleRefresh = useCallback(() => { void loadBrowse(true); }, [loadBrowse]);

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

  // Filter-safe reorder (unchanged): only the visible charts are permuted,
  // every hidden chart keeps its exact slot.
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

  const onSave = useCallback(async () => {
    if (saving || !charts.length) return;

    const invalidChart = charts.find(
      (chart) =>
        !String(chart.ChartNo ?? '').trim() ||
        !Number.isFinite(Number(chart.OrderUId)),
    );
    if (invalidChart) {
      setError('Cannot save priority: ChartNo / OrderUId is missing for one chart.');
      return;
    }

    // Grouped by OrderUId + the SHADE's own OrderSrNo (a chart's colours can
    // come from different SO lines), same payload shape as before.
    const orderGroups = new Map<string, {
      OrderUId: number; OrderSrNo: number; ParCode: string; items: any[];
    }>();

    charts.forEach((chart) => {
      const selfPriorityForThisChart = chart.displayPriority;
      chart.shades.forEach((shade) => {
        const srNo = shade.OrderSrNo || chart.OrderSrNo;
        const key = `${chart.OrderUId}-${srNo}-${chart.ParCode}`;
        const group = orderGroups.get(key) || {
          OrderUId: chart.OrderUId, OrderSrNo: srNo, ParCode: chart.ParCode, items: [],
        };
        group.items.push({
          AllocationId: shade.AllocationId ?? null,
          ShdCode: shade.ShdCode,
          ShdName: shade.ShdName,
          Status: shade.Status ? shade.Status : 'none',
          ClientPriority: shade.ClientPriority ?? 0, // unchanged, as received
          SelfPriority: selfPriorityForThisChart,
          ChartNo: chart.ChartNo,
          OrderUId: chart.OrderUId,
          OrderSrNo: srNo,
          ParCode: chart.ParCode,
        });
        orderGroups.set(key, group);
      });
    });

    const payloads = Array.from(orderGroups.values()).map((group) => ({
      ...group,
      prptype: prpGroup,
      yearno: Number(yearNo) || yearNo,
    }));

    if (!payloads.length || payloads.some((payload) => !payload.items.length)) {
      setError('There are no shades to prioritise right now.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      console.log('[Dyeing/Priority] Save priority request ->', payloads);
      const response: any = await DyeingService.savePriorityOrder(payloads);
      console.log('[Dyeing/Priority] Save priority response ->', response);
      if (!isSaved(response)) throw new Error(messageOf(response, 'Priority save failed.'));
      setDirty(false);
      await loadBrowse(true); // backend is the source of truth
    } catch (err: any) {
      setError(err?.message || 'Unable to save priority order.');
    } finally {
      setSaving(false);
    }
  }, [saving, charts, prpGroup, yearNo, loadBrowse]);

  const handleStatusSaved = useCallback(async () => {
    // Unsaved reorder must not be lost by a status save: only re-browse when
    // the order is clean; otherwise keep the local order and just refresh
    // the one chart's data from the backend.
    if (!dirty) {
      await loadBrowse(true);
      return;
    }
    try {
      const response: any = await DyeingService.browse({ prptype: prpGroup, yearno: yearNo });
      const inner = unwrapBody(response);
      const fresh = Array.isArray(inner?.Charts) ? chartsFromDyeingBrowse(inner.Charts) : [];
      const byKey = new Map(fresh.map((c) => [c.key, c]));
      setCharts((current) => current.map((chart) => {
        const f = byKey.get(chart.key);
        return f ? { ...f, displayPriority: chart.displayPriority } : chart;
      }));
    } catch (err: any) {
      setError(err?.message || 'Status saved, but refresh failed — tap refresh.');
    }
  }, [dirty, loadBrowse, prpGroup, yearNo]);

  const activeStatusChart = useMemo(
    () => charts.find((c) => c.key === statusModalKey) ?? null,
    [charts, statusModalKey],
  );

  const knownMills = useMemo(() => {
    const set = new Set<string>();
    charts.forEach((c) => c.shades.forEach((s) => {
      s.colourHistory.forEach((h) => { if (h.MillName) set.add(h.MillName); });
      s.lots.forEach((l) => l.history.forEach((h) => { if (h.MillName) set.add(h.MillName); }));
    }));
    return Array.from(set).sort();
  }, [charts]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: charts.length, NONE: 0 };
    STATUS_OPTIONS.forEach((o) => { counts[o] = 0; });
    charts.forEach((chart) => {
      const seen = new Set<string>();
      chart.shades.forEach((s) => s.lots.forEach((l) => seen.add(l.Status ?? 'NONE')));
      seen.forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
    });
    return counts;
  }, [charts]);

  const visibleCharts = useMemo(() => {
    let list = statusFilter === 'ALL'
      ? charts
      : charts.filter((chart) =>
        chart.shades.some((shade) =>
          shade.lots.some((lot) => (statusFilter === 'NONE' ? !lot.Status : lot.Status === statusFilter)),
        ),
      );

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
          ...chart.shades.flatMap((shade) => shade.lots.map((lot) => lot.LotNo)),
          ...chart.shades.map((shade) => shade.LotNos),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    return list;
  }, [charts, statusFilter, searchText]);

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
          {error || 'No allocation charts were found for this property / year.'}
        </Text>
        <TouchableOpacity onPress={() => loadBrowse()} style={[s.iconBtn, { marginTop: 12, width: 'auto', paddingHorizontal: 12 }]}>
          <Text style={{ color: T.copper, fontWeight: '800', fontSize: 12 }}>Retry</Text>
        </TouchableOpacity>
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
        onSave={onSave}
        statusFilter={statusFilter}
        counts={statusCounts}
        onStatusFilterChange={setStatusFilter}
      />

      <View style={s.searchBar}>
        <Icon name="search" size={16} color={T.muted} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search chart, party, design, colour, lot no…"
          placeholderTextColor={T.muted}
          style={s.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!searchText && (
          <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
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
              ? `Nothing matches "${searchText.trim()}".`
              : 'Nothing is currently at this status. Try a different status or tap All.'}
          </Text>
        </View>
      )}

      <ColourStatusSheet
        visible={!!statusModalKey}
        chart={activeStatusChart}
        perms={{ canStatus: perms.canStatus, canLot: perms.canLot }}
        prpGroup={prpGroup}
        yearNo={yearNo}
        knownMills={knownMills}
        onClose={() => setStatusModalKey(null)}
        onSaved={handleStatusSaved}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status legend = filter chips (with counts) + Refresh + Save                */
/* -------------------------------------------------------------------------- */

function StatusLegend({
  refreshing, onRefresh, canSave, saving, dirty, onSave, statusFilter, counts, onStatusFilterChange,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  canSave: boolean;
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  statusFilter: StatusFilter;
  counts: Record<string, number>;
  onStatusFilterChange: (value: StatusFilter) => void;
}) {
  return (
    <View style={s.legendBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={s.legendRow}>
        <TouchableOpacity
          onPress={() => onStatusFilterChange('ALL')}
          style={[s.legendPill, statusFilter === 'ALL' && { borderColor: T.ink, backgroundColor: `${T.ink}12` }]}
        >
          <Text style={[s.legendText, statusFilter === 'ALL' && { color: T.ink, fontWeight: '900' }]}>
            All {counts.ALL ?? 0}
          </Text>
        </TouchableOpacity>

        {STATUS_OPTIONS.map((option) => {
          const active = statusFilter === option;
          const color = STATUS_COLORS[option];
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onStatusFilterChange(active ? 'ALL' : option)}
              style={[s.legendPill, active && { borderColor: color, backgroundColor: `${color}18` }]}
            >
              <View style={[s.legendLetter, { backgroundColor: color }]}>
                <Text style={s.legendLetterText}>{STATUS_LETTER[option]}</Text>
              </View>
              <Text style={[s.legendText, active && { color, fontWeight: '900' }]}>
                {option} {counts[option] ?? 0}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => onStatusFilterChange(statusFilter === 'NONE' ? 'ALL' : 'NONE')}
          style={[s.legendPill, statusFilter === 'NONE' && { borderColor: T.muted, backgroundColor: `${T.muted}18` }]}
        >
          <View style={[s.legendLetter, { backgroundColor: T.alt }]}>
            <Text style={[s.legendLetterText, { color: T.muted }]}>–</Text>
          </View>
          <Text style={[s.legendText, statusFilter === 'NONE' && { color: T.ink, fontWeight: '900' }]}>
            Not started {counts.NONE ?? 0}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={s.legendActions}>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={s.iconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          {refreshing ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={16} color={T.copper} />}
        </TouchableOpacity>

        {canSave && (
          <TouchableOpacity
            onPress={onSave}
            disabled={saving || !dirty}
            style={[s.saveSmallBtn, { opacity: saving || !dirty ? 0.5 : 1 }]}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="save" size={14} color="#fff" />}
            <Text style={s.saveSmallBtnText}>Save</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Colour chip on the card:                                                   */
/*    NAME  [S][D][F][J][✂]  L·3365/3378 · 1,200 m                            */
/*  Every status is shown by its first letter in the fixed sequence. A status  */
/*  that HAS happened on the shade (in its history) is filled in its colour;   */
/*  the CURRENT (latest) one also gets a ring; the rest stay grey = disabled.  */
/* -------------------------------------------------------------------------- */

const CHIP_STATUSES: ShadeStatus[] = ['Sent for job', 'Dying', 'Finish', 'Job inward', 'Lorry Cut'];

const shadeReached = (shade: PriorityShade): Set<ShadeStatus> => {
  const set = new Set<ShadeStatus>();
  (shade.colourHistory || []).forEach((e) => set.add(e.Status));
  shade.lots.forEach((lot) => {
    (lot.history || []).forEach((e) => set.add(e.Status));
    if (lot.Status && !lot.virtual) set.add(lot.Status);
  });
  if (shade.Status) set.add(shade.Status);
  return set;
};

const ShadeChip = React.memo(function ShadeChip({ shade }: { shade: PriorityShade }) {
  const current = shade.Status;
  const colourColor = current ? STATUS_COLORS[current] : null;
  const reached = useMemo(() => shadeReached(shade), [shade]);
  const cuts = shade.lots.reduce((sum, lot) => sum + lot.LorryCutCount, 0);
  const lotNos = shade.LotNos || Array.from(new Set(shade.lots.map((l) => l.LotNo).filter(Boolean))).join('/');
  return (
    <View
      style={[
        s.chip,
        colourColor ? { borderColor: colourColor, backgroundColor: `${colourColor}12` } : null,
      ]}
    >
      <Text style={s.chipText} numberOfLines={1}>{shade.ShdName}</Text>
      <View style={s.letterRow}>
        {CHIP_STATUSES.map((option) => {
          const done = reached.has(option);
          const isCurrent = current === option;
          const color = STATUS_COLORS[option];
          return (
            <View
              key={option}
              style={[
                s.lotLetter,
                done ? { backgroundColor: color } : s.letterOff,
                isCurrent && { borderWidth: 1.5, borderColor: T.ink },
              ]}
            >
              {/* <Text style={[s.lotLetterText, !done && s.letterOffText]}>{STATUS_LETTER[option]}</Text> */}
              <Text style={[s.lotLetterText, !done && s.letterOffText]}>{STATUS_LETTER[option]}</Text>
            </View>
          );
        })}
      </View>
      {/* {!!lotNos && (
        <Text style={[s.lotNoText, { color: colourColor || T.muted }]} numberOfLines={1}>
          L·{lotNos}{shade.LotQty != null ? ` · ${qtyLabel(shade.LotQty)} m` : ''}
        </Text>
      )} */}
      {cuts > 1 && <Text style={s.cutText}>✂{cuts}</Text>}
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/*  Chart list — precise handle-only drag reorder, virtualized AND accurate   */
/*  at scale. (Unchanged mechanics — see comments below.)                    */
/* -------------------------------------------------------------------------- */
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
const CARD_BOX_HEIGHT = 146; // the card's own box height (its `s.card` style)
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
              {chart.shades.map((shade, si) => (
                <ShadeChip key={`${shade.ShdCode || shade.ShdName}-${shade.OrderSrNo}-${si}`} shade={shade} />
              ))}
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
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: T.border,
    backgroundColor: T.surface,
  },
  legendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 6,
  },
  legendLetter: {
    width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
  },
  legendLetterText: { color: '#fff', fontSize: 8.5, fontWeight: '900' },
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
  numText: { fontSize: 11, fontWeight: '900', color: T.ink },
  numTextSmall: { fontSize: 10, fontWeight: '800', color: T.muted },
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
    maxWidth: 360,
  },
  chipText: { fontSize: 9.5, fontWeight: '700', color: T.ink, maxWidth: 150 },
  lotPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: 9, paddingLeft: 1, paddingRight: 4, paddingVertical: 1,
    backgroundColor: T.surface,
  },
  lotLetter: {
    width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
  },
  lotLetterText: { color: '#fff', fontSize: 8.5, fontWeight: '900' },
  lotNoText: { fontSize: 9, fontWeight: '800', maxWidth: 150 },
  letterRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  letterOff: { backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  letterOffText: { color: '#BDB6AE' },
  cutText: { fontSize: 9.5, fontWeight: '900', color: T.purple },

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