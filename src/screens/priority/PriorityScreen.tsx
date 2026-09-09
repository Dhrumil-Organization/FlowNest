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
//   - `SelfPriority` is OUR priority (this screen). The reorderable list is
//     driven entirely by SelfPriority: initial sort order uses it, moving a
//     card up/down updates it, and only SelfPriority is recalculated/sent as
//     the new value on save.
//   - Every card shows BOTH values (a "Client #" meta chip + a "Self" badge)
//     so the user can see what the client asked for vs. what they've set.
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
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
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
    const rowSelfPriority = (() => {
      const rawValue = row?.SelfPriority ?? row?.selfpriority;
      const hasValue = !(rawValue === null || rawValue === undefined || String(rawValue).trim() === '');
      const parsed = hasValue ? Number(rawValue) : null;
      if (parsed != null && parsed > 0) return parsed;
      // --- TEMP fallback (cache-only — remove once real API is wired up) ---
      // Browse didn't give us a usable SelfPriority (missing / blank / 0),
      // so seed it from ClientPriority instead. Once the real API always
      // returns a proper SelfPriority, this fallback is no longer needed —
      // delete it and just `return parsed;` above.
      return rowClientPriority != null && rowClientPriority > 0 ? rowClientPriority : null;
      // --- END TEMP fallback ------------------------------------------------
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
  });

  // Sort is driven by SELF priority only. Client priority is never used to
  // decide order — it is carried along purely for display.
  charts.sort((a, b) => {
    const aHas = a.savedSelfPriority != null;
    const bHas = b.savedSelfPriority != null;
    if (aHas && bHas) return a.savedSelfPriority! - b.savedSelfPriority!;
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
      const payload = body?.response?.data ?? body?.data ?? body ?? {};
      const inner = payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
        ? payload.data
        : payload;
      const rawDetails = Array.isArray(inner?.AllocationDetails) ? inner.AllocationDetails : [];
      setCharts(groupChartsForPriority(rawDetails));
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

  // Reorder happens ONLY through the drag handle.  We do not persist anything
  // locally: the browse API remains the source of truth after a successful save.
  const reorderCharts = useCallback((fromIndex: number, toIndex: number) => {
    setCharts((current) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 ||
        fromIndex >= current.length || toIndex >= current.length) return current;
      const next = current.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
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
      />

      <ChartList
        charts={charts}
        canEdit={canEdit}
        onReorder={reorderCharts}
        onOpenStatus={setStatusModalKey}
      />

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
}: {
  refreshing: boolean;
  onRefresh: () => void;
  canSave: boolean;
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
}) {
  return (
    <View style={s.legendBar}>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {STATUS_OPTIONS.map((option) => (
          <View key={option} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: STATUS_COLORS[option] }]} />
            <Text style={s.legendText}>{option}</Text>
          </View>
        ))}
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
/*  Chart list — precise handle-only drag reorder.                            */
/*                                                                            */
/*  UX rule: the dragged card NEVER gets moved away from its original slot.   */
/*  The user drags only the handle; a strong insertion line moves between     */
/*  cards and shows exactly where the card will land. The actual array is     */
/*  changed only on release. While the handle is held near the top/bottom     */
/*  edge, the list auto-scrolls continuously so long lists remain draggable. */
/* -------------------------------------------------------------------------- */

const AUTO_SCROLL_EDGE = 72;
const AUTO_SCROLL_MAX_STEP = 16;
const AUTO_SCROLL_INTERVAL = 16;

function ChartList({
  charts,
  canEdit,
  onReorder,
  onOpenStatus,
}: {
  charts: PriorityChart[];
  canEdit: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onOpenStatus: (chartKey: string) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const viewportTopRef = useRef(0);
  const cardLayouts = useRef<Map<string, { y: number; height: number }>>(new Map());

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
  // card. `-1` means the line is at the very top (before the first card).
  const [dropAfterIndex, setDropAfterIndex] = useState<number | null>(null);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current != null) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  // Store the absolute initial finger Y separately. This avoids accumulating
  // floating-point/scroll errors when auto-scroll changes the ScrollView offset.
  const updateDropTarget = useCallback((key: string, moveY: number) => {
    const drag = dragRef.current;
    if (!drag) return;

    const currentIndex = charts.findIndex((chart) => chart.key === key);
    const layout = cardLayouts.current.get(key);
    if (currentIndex < 0 || !layout) return;

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
    // is adjusted by the finger movement plus whatever the ScrollView has
    // auto-scrolled since the drag began.
    const movingCenter =
      drag.centerContentY +
      (moveY - drag.startMoveY) +
      (offset - drag.startScrollOffset);

    const otherCenters = charts
      .map((item, index) => {
        if (index === currentIndex) return null;
        const measured = cardLayouts.current.get(item.key);
        if (!measured) return null;
        return {
          index,
          center: measured.y + measured.height / 2,
        };
      })
      .filter((item): item is { index: number; center: number } => item != null);

    // Find the last card whose centre is above the dragged card centre.
    // The insertion line is rendered BELOW that card. This directly matches
    // what the user sees: "drop on this line".
    let afterIndex = -1;
    for (const item of otherCenters) {
      if (movingCenter >= item.center) {
        afterIndex = Math.max(afterIndex, item.index);
      }
    }

    // If the dragged card is below the last card, the line belongs under the
    // last card. If it is above the first card, show a top insertion line.
    setDropAfterIndex(afterIndex);
  }, [charts]);

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
      scrollRef.current?.scrollTo({ y: nextOffset, animated: false });

      // Recalculate immediately after each auto-scroll tick so the highlighted
      // line follows the finger all the way through a long list.
      updateDropTarget(drag.key, drag.lastMoveY);
    }, AUTO_SCROLL_INTERVAL);
  }, [stopAutoScroll, updateDropTarget]);

  const finishDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;

    const afterIndex = dropAfterIndex;
    const fromIndex = drag.fromIndex;

    stopAutoScroll();
    dragRef.current = null;
    setDraggingKey(null);
    setDropAfterIndex(null);

    if (afterIndex == null) return;

    // Convert "line below card X" into the final array index AFTER the dragged
    // card is removed. This is the important part that prevents off-by-one
    // reorder bugs when moving upward vs downward.
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

    targetIndex = Math.max(0, Math.min(charts.length - 1, targetIndex));

    if (targetIndex !== fromIndex) {
      onReorder(fromIndex, targetIndex);
    }
  }, [charts.length, dropAfterIndex, onReorder, stopAutoScroll]);

  const makeHandlePanResponder = useCallback((chartKey: string, index: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => canEdit,
      onMoveShouldSetPanResponder: () => canEdit,
      onPanResponderGrant: (event) => {
        const layout = cardLayouts.current.get(chartKey);
        if (!layout) return;

        dragRef.current = {
          key: chartKey,
          fromIndex: index,
          centerContentY: layout.y + layout.height / 2,
          startMoveY: event.nativeEvent.pageY,
          lastMoveY: event.nativeEvent.pageY,
          startScrollOffset: scrollOffsetRef.current,
          viewportTop: viewportTopRef.current,
          autoScrollDirection: 0,
          autoScrollSpeed: 0,
        };

        setDraggingKey(chartKey);
        setDropAfterIndex(index > 0 ? index - 1 : -1);
        startAutoScroll();
      },
      onPanResponderMove: (event) => {
        const drag = dragRef.current;
        if (!drag) return;

        drag.lastMoveY = event.nativeEvent.pageY;
        updateDropTarget(chartKey, event.nativeEvent.pageY);
      },
      onPanResponderRelease: finishDrag,
      onPanResponderTerminate: finishDrag,
      onPanResponderTerminationRequest: () => false,
    });
  }, [canEdit, finishDrag, startAutoScroll, updateDropTarget]);

  useEffect(() => {
    return () => stopAutoScroll();
  }, [stopAutoScroll]);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={s.listContent}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(event) => {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        const drag = dragRef.current;
        if (drag) {
          // Keep the line correct even when ScrollView emits a native scroll
          // event during an edge-scroll tick.
          updateDropTarget(drag.key, drag.lastMoveY);
        }
      }}
      onLayout={(event) => {
        viewportHeightRef.current = event.nativeEvent.layout.height;
        // ScrollView's onLayout gives us height but not an absolute screen Y.
        // Measure it once so edge auto-scroll uses the real finger position.
        requestAnimationFrame(() => {
          scrollRef.current?.measureInWindow((_x, y, _width, height) => {
            viewportTopRef.current = y;
            viewportHeightRef.current = height;
          });
        });
      }}
      scrollEnabled={!draggingKey}
    >
      {charts.map((chart, index) => {
        const isDragging = draggingKey === chart.key;

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
          <React.Fragment key={chart.key}>
            {showTopLine && <View style={s.dropLineTop} />}

            <View
              onLayout={(event) => {
                cardLayouts.current.set(chart.key, {
                  y: event.nativeEvent.layout.y,
                  height: event.nativeEvent.layout.height,
                });
              }}
              style={[
                s.card,
                { borderColor: T.border },
                isDragging && s.draggingCard,
              ]}
            >
              <View style={s.cardInner}>
                {canEdit ? (
                  <View
                    style={s.dragHandle}
                    {...makeHandlePanResponder(chart.key, index).panHandlers}
                  >
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

                  <View style={s.chipWrap}>
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
                  </View>
                </View>
              </View>
            </View>

            {showBottomLine && <View style={s.dropLine} />}
          </React.Fragment>
        );
      })}
      <View style={{ height: 24 }} />
    </ScrollView>
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

const ROW_GAP = 6;

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
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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

  listContent: { padding: 8, paddingBottom: 20 },

  card: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderRadius: 11,
    padding: 8,
    marginBottom: ROW_GAP,
    minWidth: 0,
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

  chipWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    marginTop: 5, width: '100%',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
    borderColor: T.border, backgroundColor: T.sub,
    maxWidth: '100%',
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