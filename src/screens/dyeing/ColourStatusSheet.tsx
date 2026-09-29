// FILE: src/screens/dyeing/ColourStatusSheet.tsx
// Status sheet opened from a Priority card's "Status" button. SHADE-WISE.
//
//   Pink · Sr 2 · 1,200 m · Lot SR-4310                    ● Dying
//   ┌ OUTWARD · LOT NO. ─────────────────────────── 2 lots ⟳ ┐
//   │ [Select Outward 🔍] [Lot No.     ] [+ Add]               │
//   │ Outward No.            | Lot No.                     │
//   │ DC-4101  UId…·Sr 1     | SR-4310                   ✎ │  <- GET /dyeing/lotnos
//   └──────────────────────────────────────────────────────┘
//   [Sent for job] [Dying] [Finish] [Job inward] [✂ Lorry Cut]   <- shade status
//   (29/09/26 Sent for job) → (30/09/26 Dying)                    <- status with date
//
// - Outward · Lot No. block (OutwardLotSection):
//     help            GET /dyeing/outward_details?prptype&chartno&yearno
//     [Advance] ->    GET /dyeing/outward_details_all?prptype&yearno&orderuid&ordersrno (nested help)
//     Add / ✎ update  /dyeing/save_outward_details?prptype&chartno&yearno&uid&srno&lotno
//     table           GET /dyeing/lotnos?prptype&chartno&yearno&orderuid&ordersrno (reloaded after every save)
//   orderuid = chart.OrderUId, ordersrno = shade.OrderSrNo (both from browse).
//   SHADE-WISE (same as status): EVERY shade has its own Outward · Lot block.
//   Shades that share one SO line share the /dyeing/lotnos call, and the rows
//   are split by the row's `soshdcode` (rows with no shade info go to the
//   first shade of the line).
//   Outward identity = uuid + usrno (API `uid` / `srno` are the SO line).
//   Help / Advance list EVERY outward in EVERY shade: an outward already
//   taken in a shade can't be taken again in THAT shade, but another shade
//   of the card can take the same outward (not blocked).
// - Status: FIXED sequence (see NEXT_STATUSES in dyeingModel):
//     Sent for job -> Dying -> Finish -> Job inward  OR  Lorry Cut
//   Only the next step of the latest status is enabled — no skip, no going
//   back, no repeat. Tap it -> Save -> /dyeing/save_status for THIS shade only
//   (own OrderSrNo / ShdCode / AllocationId), dated today, full shade qty.
//   Lorry Cut needs a reason (backend rule).
// - Chips = the shade's status history with date, in sequence (oldest first).
//   Only the LATEST chip has a remove (✕) -> confirm ->
//   POST /dyeing/remove_status { OrderUId, OrderSrNo, ChartNo, ParCode, ShdCode, Status, prptype, yearno }
//   After the browse reloads, the previous status becomes the latest and only
//   that one can be removed next — one at a time, always from the end.
// - Outward lot add / update / remove send the shade code (shdcode).
// - Client priority is shown READ-ONLY (lock).
//
// After every save the parent re-browses and the sheet re-renders from it.

import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { asNum, DyeingService, isSaved, messageOf, RemoveStatusPayload } from './dyeingApi';
import {
  canMoveTo,
  DyeEvent,
  LORRY_CUT_REASONS,
  nextStatusesOf,
  num,
  parseAnyDate,
  PriorityChart,
  PriorityShade,
  qtyLabel,
  SaveStatusPayload,
  ShadeStatus,
  STATUS_COLORS,
  STATUS_LETTER,
  STATUS_SEQ,
  todayISO,
} from './dyeingModel';
import { chipDate, lineKeyOf, OutwardRow, outwardSaveOk, rowShadeMatch, toOutwardRows } from './dyeingOutward';
import { OutwardLotSection, OutwardState } from './OutwardLotSection';

export type SheetPerms = {
  canStatus: boolean; // shade status save
  canLot: boolean; // add / edit outward lot nos.
};

type Props = {
  visible: boolean;
  chart: PriorityChart | null;
  perms: SheetPerms;
  prpGroup: string;
  yearNo: string | number;
  knownMills?: string[]; // kept for the parent's props — not used any more
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

/** Shade status buttons — shown in the FIXED sequence order. */
const SHADE_STATUSES: ShadeStatus[] = ['Sent for job', 'Dying', 'Finish', 'Job inward', 'Lorry Cut'];

const shadeKeyOf = (shade: PriorityShade) => `${shade.ShdCode || shade.ShdName}::${shade.OrderSrNo}`;

export function StatusLetter({ status, size = 16 }: { status: ShadeStatus | null; size?: number }) {
  if (!status) {
    return (
      <View style={[st.letter, { width: size, height: size, borderRadius: size / 2, backgroundColor: T.alt }]}>
        <Text style={[st.letterText, { color: T.muted, fontSize: size * 0.58 }]}>–</Text>
      </View>
    );
  }
  return (
    <View style={[st.letter, { width: size, height: size, borderRadius: size / 2, backgroundColor: STATUS_COLORS[status] }]}>
      <Text style={[st.letterText, { fontSize: size * 0.58 }]}>{STATUS_LETTER[status]}</Text>
    </View>
  );
}

/**
 * The shade's status trail (oldest first): colour-level events, plus — for
 * data saved earlier through the lot screen — the lots' events, de-duplicated
 * so one day's status shows once.
 */
const shadeTrail = (shade: PriorityShade): DyeEvent[] => {
  const all: DyeEvent[] = [
    ...(shade.colourHistory || []),
    ...shade.lots.flatMap((lot) => lot.history || []),
  ];
  const seen = new Set<string>();
  return all
    .filter((e) => e && e.Status)
    .sort((a, b) => {
      const da = parseAnyDate(a.StatusDate);
      const db = parseAnyDate(b.StatusDate);
      if (da !== db) return da < db ? -1 : 1;
      const ca = String(a.CreatedAt ?? '');
      const cb = String(b.CreatedAt ?? '');
      if (ca && cb && ca !== cb) return ca.localeCompare(cb);
      const ia = Number(a.Id);
      const ib = Number(b.Id);
      if (Number.isFinite(ia) && Number.isFinite(ib) && ia !== ib) return ia - ib;
      // same day, no time / id -> keep the fixed sequence order
      return (STATUS_SEQ[a.Status] ?? 9) - (STATUS_SEQ[b.Status] ?? 9);
    })
    .filter((e) => {
      // same event reached twice (colour + lot history) -> once
      const id = `id:${e.Id}`;
      if (e.Id !== undefined && e.Id !== null && seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .filter((e, i, arr) => {
      // same status saved twice in a row on the same day -> one chip
      const prev = arr[i - 1];
      return !(prev && prev.Status === e.Status && parseAnyDate(prev.StatusDate) === parseAnyDate(e.StatusDate));
    });
};

export function ColourStatusSheet({
  visible, chart, perms, prpGroup, yearNo, onClose, onSaved,
}: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const [toast, setToast] = useState<string | null>(null);

  // help: outward lines of the chart (GET /dyeing/outward_details) — also gives ChalNo
  const [help, setHelp] = useState<OutwardState>({ rows: [], loading: false, error: null });
  // table: saved lot nos per SO line (GET /dyeing/lotnos, key = OrderSrNo)
  const [lotsByLine, setLotsByLine] = useState<Record<string, OutwardState>>({});
  const chartNo = chart?.ChartNo ?? '';
  const orderUId = chart?.OrderUId;

  // shades that share one SO line (same OrderSrNo) share one outward/lot table
  const lines = useMemo(() => {
    const map = new Map<number, PriorityShade[]>();
    (chart?.shades ?? []).forEach((sh) => {
      const list = map.get(sh.OrderSrNo);
      if (list) list.push(sh);
      else map.set(sh.OrderSrNo, [sh]);
    });
    return map;
  }, [chart?.shades]);

  const failed = (response: any) => {
    const body = response?.data ?? response;
    return !!body && typeof body === 'object' && (body.success === false || body.status === false);
  };

  const loadHelp = useCallback(async () => {
    if (!chartNo) return;
    setHelp((cur) => ({ ...cur, loading: true, error: null }));
    try {
      const params = { prptype: prpGroup, chartno: chartNo, yearno: yearNo };
      console.log('[Dyeing] outward_details request ->', params);
      const response: any = await DyeingService.outwardDetails(params);
      if (failed(response)) throw new Error(messageOf(response, 'Unable to load outward list'));
      setHelp({ rows: toOutwardRows(response), loading: false, error: null });
    } catch (err: any) {
      setHelp({ rows: [], loading: false, error: err?.response?.data?.message || err?.message || 'Unable to load outward list' });
    }
  }, [chartNo, prpGroup, yearNo]);

  const loadLots = useCallback(async (srNo: number) => {
    if (!chartNo || orderUId === undefined || orderUId === null) return;
    const k = String(srNo);
    setLotsByLine((cur) => ({ ...cur, [k]: { rows: cur[k]?.rows ?? [], loading: true, error: null } }));
    try {
      const params = { prptype: prpGroup, chartno: chartNo, yearno: yearNo, orderuid: orderUId, ordersrno: srNo };
      console.log('[Dyeing] lotnos request ->', params);
      const response: any = await DyeingService.lotNos(params);
      console.log('[Dyeing] lotnos response ->', response?.data ?? response);
      if (failed(response)) throw new Error(messageOf(response, 'Unable to load lot nos.'));
      setLotsByLine((cur) => ({ ...cur, [k]: { rows: toOutwardRows(response), loading: false, error: null } }));
    } catch (err: any) {
      setLotsByLine((cur) => ({
        ...cur,
        [k]: { rows: [], loading: false, error: err?.response?.data?.message || err?.message || 'Unable to load lot nos.' },
      }));
    }
  }, [chartNo, orderUId, prpGroup, yearNo]);

  /** Nested "Advance" help — every outward of the SO line (GET /dyeing/outward_details_all). */
  const loadAdvance = useCallback(async (srNo: number) => {
    const params = { prptype: prpGroup, yearno: yearNo, orderuid: orderUId ?? '', ordersrno: srNo };
    console.log('[Dyeing] outward_details_all request ->', params);
    const response: any = await DyeingService.outwardDetailsAll(params);
    if (failed(response)) throw new Error(messageOf(response, 'Unable to load outwards'));
    return toOutwardRows(response);
  }, [orderUId, prpGroup, yearNo]);

  const lineKeys = useMemo(() => Array.from(lines.keys()).join(','), [lines]);

  useEffect(() => {
    if (!visible) {
      setToast(null);
      setLotsByLine({});
      setHelp({ rows: [], loading: false, error: null });
      return;
    }
    void loadHelp();
    lineKeys.split(',').filter(Boolean).forEach((k) => { void loadLots(Number(k)); });
  }, [visible, loadHelp, loadLots, lineKeys]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // ChalNo: the row's own; else from the chart's outward list (same outward
  // line uuid|usrno, else same challan uuid); else UId/SrNo
  const challanMap = useMemo(() => {
    const byUuid: Record<string, string> = {};
    const byLine: Record<string, string> = {};
    help.rows.forEach((r) => {
      if (!r.hasChallan) return;
      if (r.uuid) byUuid[r.uuid] = r.challanNo;
      const lk = lineKeyOf(r);
      if (!byLine[lk]) byLine[lk] = r.challanNo;
    });
    return { byUuid, byLine };
  }, [help.rows]);
  const challanOf = useCallback((row: OutwardRow) => {
    if (row.hasChallan) return row.challanNo;
    return challanMap.byLine[lineKeyOf(row)] || (row.uuid && challanMap.byUuid[row.uuid]) || row.challanNo;
  }, [challanMap]);

  /** Rows of one SO line that belong to `shade` (untagged rows -> first shade of the line). */
  const rowsOfShade = useCallback((rows: OutwardRow[], shade: PriorityShade, ownsUntagged: boolean) =>
    rows.filter((r) => {
      const m = rowShadeMatch(r, shade);
      return m === null ? ownsUntagged : m;
    }), []);

  const afterStatusSave = useCallback(async (message: string) => {
    setToast(message);
    await onSaved();
  }, [onSaved]);

  if (!chart) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[st.sheet, wide && st.sheetWide]}>
          <View style={st.header}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.title} numberOfLines={1}>{chart.DesignName || '—'}</Text>
              <Text style={st.subtitle} numberOfLines={1}>
                {chart.ChartNo}{chart.PartyName ? ` · ${chart.PartyName}` : ''}{chart.ApcChartName ? ` · ${chart.ApcChartName}` : ''}
              </Text>
              <View style={st.prioRow}>
                <View style={[st.prioChip, { borderColor: T.green }]}>
                  <Text style={[st.prioChipText, { color: T.green }]}>Self #{chart.displayPriority}</Text>
                </View>
                {/* Client priority: display only — deliberately no input / no handler */}
                <View style={[st.prioChip, { borderColor: T.border, backgroundColor: T.sub }]}>
                  <Icon name="lock" size={10} color={T.muted} />
                  <Text style={[st.prioChipText, { color: T.muted }]}>
                    Client #{chart.savedClientPriority ?? '—'}
                  </Text>
                </View>
                <Text style={st.prioHint}>{qtyLabel(chart.qty)} m · {chart.shades.length} shades</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={st.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={T.muted} />
            </TouchableOpacity>
          </View>

          {!!toast && (
            <View style={st.toast}>
              <Icon name="check-circle" size={14} color="#fff" />
              <Text style={st.toastText}>{toast}</Text>
            </View>
          )}

          <ScrollView style={{ flex: 1 }} contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
            {chart.shades.map((shade) => {
              const group = lines.get(shade.OrderSrNo) ?? [shade];
              const first = group[0] === shade;
              const k = String(shade.OrderSrNo);
              const lineTable = lotsByLine[k] ?? { rows: [], loading: true, error: null };
              // shade-wise: this shade's own lot rows + its own outward help
              const table: OutwardState = { ...lineTable, rows: rowsOfShade(lineTable.rows, shade, first) };
              // help is NOT filtered by shade: the same outward can be taken by every shade (once per shade)
              const shadeHelp: OutwardState = help;
              const outwardLots = table.rows.map((r) => r.lotNo).filter(Boolean);
              const others = group.filter((g) => g !== shade).map((g) => g.ShdName).filter(Boolean);
              return (
                <ShadeCard
                  key={shadeKeyOf(shade)}
                  chart={chart}
                  shade={shade}
                  perms={perms}
                  prpGroup={prpGroup}
                  yearNo={yearNo}
                  outwardLotNos={outwardLots}
                  outward={(
                    <OutwardLotSection
                      title={`Outward · Lot No. — ${shade.ShdName || shade.ShdCode || `Sr ${shade.OrderSrNo}`}`}
                      shdCode={shade.ShdCode}
                      shdName={shade.ShdName}
                      ownsUntagged={first}
                      note={others.length ? `Sr ${shade.OrderSrNo} is shared with ${others.join(' · ')} — lot nos. here are for ${shade.ShdName} only` : null}
                      chartNo={chart.ChartNo}
                      orderSrNo={shade.OrderSrNo}
                      prpGroup={prpGroup}
                      yearNo={yearNo}
                      help={shadeHelp}
                      table={table}
                      loadAdvance={() => loadAdvance(shade.OrderSrNo)}
                      challanOf={challanOf}
                      canEdit={perms.canLot}
                      onRetry={() => { void loadLots(shade.OrderSrNo); void loadHelp(); }}
                      onSaved={async (message) => {
                        setToast(`${shade.ShdName ? `${shade.ShdName} · ` : ''}${message}`);
                        await Promise.all([loadLots(shade.OrderSrNo), loadHelp(), Promise.resolve(onSaved())]);
                      }}
                    />
                  )}
                  onSaved={afterStatusSave}
                />
              );
            })}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  One shade: name + Outward/Lot block + status buttons + status/date chips   */
/* -------------------------------------------------------------------------- */

function ShadeCard({
  chart, shade, perms, prpGroup, yearNo, outwardLotNos, outward, onSaved,
}: {
  chart: PriorityChart;
  shade: PriorityShade;
  perms: SheetPerms;
  prpGroup: string;
  yearNo: string | number;
  outwardLotNos: string[]; // lot nos. saved on this shade's outwards
  outward: React.ReactNode;
  onSaved: (message: string) => Promise<void>;
}) {
  const trail = useMemo(() => shadeTrail(shade), [shade]);
  // Timeline shown under the buttons. Old rows that have a status but no
  // history still show (and can remove) that one status.
  const timeline: DyeEvent[] = useMemo(() => {
    if (trail.length) return trail;
    if (!shade.Status) return [];
    return [{
      Id: 'current', Status: shade.Status, StatusDate: '', Qty: num(shade.AllocationQty), IsRework: false,
      LorryCutReason: null, Remarks: null, ChallanNo: null, AgainstChallanNo: null, MillName: null, Rate: null,
      CreatedBy: null, CreatedAt: null,
    } as DyeEvent];
  }, [trail, shade.Status, shade.AllocationQty]);
  // LATEST status = last event of the sequence (it decides what can come next)
  const current: ShadeStatus | null = timeline.length ? timeline[timeline.length - 1].Status : null;
  const allowed = useMemo(() => nextStatusesOf(current), [current]);
  const reached = useMemo(() => new Set(timeline.map((e) => e.Status)), [timeline]);
  const [picked, setPicked] = useState<ShadeStatus | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeAsk, setRemoveAsk] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // browse refreshed -> drop the pending pick / remove confirmation
  useEffect(() => { setPicked(null); setReason(null); setError(null); setRemoveAsk(false); }, [current, timeline.length]);

  const pick = (option: ShadeStatus) => {
    setError(null);
    setReason(null);
    setRemoveAsk(false);
    if (!canMoveTo(current, option)) {
      setError(allowed.length
        ? `Next status can only be ${allowed.join(' or ')}.`
        : `${current} is the final status — remove it first to change.`);
      setPicked(null);
      return;
    }
    setPicked(picked === option ? null : option);
  };

  const save = async () => {
    if (!picked || saving || removing) return;
    // guard again at save time — never send an out-of-sequence status
    if (!canMoveTo(current, picked)) {
      setError(`Next status can only be ${allowed.join(' or ') || '—'}.`);
      setPicked(null);
      return;
    }
    if (picked === 'Lorry Cut' && !reason) { setError('Select the Lorry Cut reason.'); return; }
    setError(null);
    // /dyeing/save_status — ONLY this shade (its own OrderUId / OrderSrNo /
    // ShdCode / ChartNo), dated today, the shade's full qty.
    const qty = num(shade.AllocationQty);
    const lotNo = outwardLotNos.join('/');
    const payload: SaveStatusPayload = {
      prptype: prpGroup,
      yearno: Number(yearNo) || yearNo,
      OrderUId: chart.OrderUId,
      OrderSrNo: shade.OrderSrNo,
      ChartNo: chart.ChartNo,
      ParCode: chart.ParCode,
      ShdCode: shade.ShdCode,
      ShdName: shade.ShdName,
      AllocationId: shade.AllocationId ?? null,
      DsnCode: chart.DesignCode,
      DsnName: chart.DesignName,
      PartyName: chart.PartyName,
      LotId: null,
      LotNo: lotNo,
      LotQty: qty,
      Status: picked,
      StatusDate: todayISO(),
      Qty: qty,
      LorryCutReason: picked === 'Lorry Cut' ? reason : null,
      Remarks: null,
      ChallanNo: null,
      AgainstChallanNo: null,
      MillName: null,
      Rate: null,
    };
    setSaving(true);
    try {
      console.log('[Dyeing] save_status request ->', payload);
      const response: any = await DyeingService.saveStatus(payload);
      console.log('[Dyeing] save_status response ->', response?.data ?? response);
      if (!isSaved(response)) throw new Error(messageOf(response, 'Unable to save status.'));
      const done = picked;
      setPicked(null);
      setReason(null);
      await onSaved(`${shade.ShdName} → ${done}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save status.');
    } finally {
      setSaving(false);
    }
  };

  /** POST /dyeing/remove_status — ONLY the latest status of this shade. */
  const removeLatest = async () => {
    if (!current || removing || saving) return;
    setError(null);
    const payload: RemoveStatusPayload = {
      OrderUId: asNum(chart.OrderUId),
      OrderSrNo: asNum(shade.OrderSrNo),
      ChartNo: chart.ChartNo,
      ParCode: String(chart.ParCode ?? ''),
      ShdCode: String(shade.ShdCode ?? ''),
      Status: current,
      prptype: prpGroup,
      yearno: asNum(yearNo),
    };
    setRemoving(true);
    try {
      console.log('[Dyeing] remove_status request ->', payload);
      const response: any = await DyeingService.removeStatus(payload);
      console.log('[Dyeing] remove_status response ->', response?.data ?? response);
      if (!outwardSaveOk(response)) throw new Error(messageOf(response, 'Unable to remove status.'));
      setRemoveAsk(false);
      await onSaved(`${shade.ShdName} · ${current} removed`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to remove status.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <View style={st.shadeCard}>
      <View style={st.shadeHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.shadeName} numberOfLines={1}>{shade.ShdName}</Text>
          <Text style={st.shadeMeta} numberOfLines={1}>
            {shade.ShdCode ? `Code ${shade.ShdCode} · ` : ''}Sr {shade.OrderSrNo} · {qtyLabel(shade.AllocationQty)} m
            {outwardLotNos.length ? ` · Lot ${outwardLotNos.join('/')}` : ''}
          </Text>
        </View>
        <View style={[st.curChip, { borderColor: current ? STATUS_COLORS[current] : T.border }]}>
          <StatusLetter status={current} size={14} />
          <Text style={[st.curText, { color: current ? STATUS_COLORS[current] : T.muted }]}>
            {current ?? 'Not started'}
          </Text>
        </View>
      </View>

      {outward}

      {/* shade status buttons — fixed sequence; only the next step is enabled */}
      <View style={st.statusRow}>
        {SHADE_STATUSES.map((option) => {
          const color = STATUS_COLORS[option];
          const isCurrent = current === option;
          const isPicked = picked === option;
          const isNext = allowed.includes(option);
          const isDone = !isCurrent && reached.has(option);
          const enabled = perms.canStatus && isNext && !saving && !removing;
          return (
            <TouchableOpacity
              key={option}
              disabled={!enabled}
              onPress={() => pick(option)}
              style={[
                st.statusBtn,
                { borderColor: isPicked || isCurrent || (isNext && perms.canStatus) ? color : T.border },
                isCurrent && !isPicked && { backgroundColor: `${color}22` },
                isNext && perms.canStatus && !isPicked && { borderStyle: 'dashed' },
                isPicked && { backgroundColor: color },
                !isNext && !isCurrent && { opacity: isDone ? 0.75 : 0.4 },
              ]}
              activeOpacity={0.7}
            >
              {isDone && <Icon name="check" size={12} color={color} style={{ marginRight: 2 }} />}
              {!isNext && !isCurrent && !isDone && <Icon name="lock-outline" size={11} color={T.muted} style={{ marginRight: 2 }} />}
              <Text
                style={[st.statusBtnText, { color: isPicked ? '#fff' : isCurrent || isDone ? color : T.ink }]}
                numberOfLines={1}
              >
                {option === 'Lorry Cut' ? '✂ Lorry Cut' : option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {perms.canStatus && !picked && (
        <Text style={st.nextHint} numberOfLines={2}>
          {allowed.length
            ? `Next: ${allowed.join(' or ')}`
            : `${current} is the final status · remove it from the timeline to change`}
        </Text>
      )}

      {picked === 'Lorry Cut' && (
        <View style={st.cutBox}>
          <Text style={st.cutTitle}>Lorry cut reason</Text>
          <View style={st.reasonWrap}>
            {LORRY_CUT_REASONS.map((r) => {
              const on = reason === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => { setReason(on ? null : r); setError(null); }}
                  style={[st.reasonChip, on && { backgroundColor: STATUS_COLORS['Lorry Cut'], borderColor: STATUS_COLORS['Lorry Cut'] }]}
                  activeOpacity={0.7}
                >
                  <Text style={[st.reasonText, on && { color: '#fff' }]}>{r}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {!!picked && (
        <View style={st.confirmRow}>
          <Text style={st.confirmText} numberOfLines={2}>
            Set <Text style={{ color: STATUS_COLORS[picked], fontWeight: '900' }}>{picked}</Text> for {shade.ShdName}
            {' '}· today?
          </Text>
          <TouchableOpacity onPress={() => { setPicked(null); setReason(null); }} style={st.cancelBtn} disabled={saving}>
            <Text style={st.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={save} style={[st.saveBtn, saving && { opacity: 0.6 }]} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="check" size={15} color="#fff" />}
            <Text style={st.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!error && <Text style={st.formError}>{error}</Text>}

      {/* status with date — oldest → latest; only the latest can be removed */}
      {timeline.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.trail}>
          {timeline.map((event, idx) => {
            const color = STATUS_COLORS[event.Status] ?? T.muted;
            const isLast = idx === timeline.length - 1;
            return (
              <View key={`${event.Id}-${idx}`} style={st.trailItem}>
                {idx > 0 && <Icon name="arrow-forward" size={12} color={T.muted} style={{ marginHorizontal: 3 }} />}
                <View style={[st.trailChip, { borderColor: color, backgroundColor: `${color}14` }, isLast && st.trailChipLast]}>
                  <Text style={st.trailDate}>{chipDate(event.StatusDate) || '—'}</Text>
                  <Text style={[st.trailStatus, { color }]}>{event.Status}</Text>
                  {!!event.LorryCutReason && <Text style={st.trailReason} numberOfLines={1}>{event.LorryCutReason}</Text>}
                  {isLast && perms.canStatus && (
                    <TouchableOpacity
                      onPress={() => { setError(null); setPicked(null); setRemoveAsk(true); }}
                      disabled={removing || saving}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
                      style={st.trailRemove}
                    >
                      <Icon name="close" size={12} color={T.red} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={st.noTrail}>No status yet</Text>
      )}

      {removeAsk && !!current && (
        <View style={[st.confirmRow, st.removeRow]}>
          <Text style={st.confirmText} numberOfLines={2}>
            Remove latest status{' '}
            <Text style={{ color: STATUS_COLORS[current], fontWeight: '900' }}>{current}</Text> of {shade.ShdName}?
          </Text>
          <TouchableOpacity onPress={() => setRemoveAsk(false)} style={st.cancelBtn} disabled={removing}>
            <Text style={st.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={removeLatest} style={[st.saveBtn, { backgroundColor: T.red }, removing && { opacity: 0.6 }]} disabled={removing}>
            {removing ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="delete-outline" size={15} color="#fff" />}
            <Text style={st.saveText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: T.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18,
    height: '92%', width: '100%',
  },
  sheetWide: { maxWidth: 760, alignSelf: 'center' },
  sharedNote: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 2, marginBottom: 4 },
  cutBox: {
    marginTop: 8, padding: 8, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed',
    borderColor: `${T.purple}88`, backgroundColor: '#FBF7FD',
  },
  cutTitle: { fontSize: 10, fontWeight: '900', color: T.purple, textTransform: 'uppercase', marginBottom: 6 },
  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  reasonChip: {
    borderWidth: 1, borderColor: T.border, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: T.surface,
  },
  reasonText: { fontSize: 10.5, fontWeight: '800', color: T.ink },
  trailReason: { fontSize: 9.5, fontWeight: '700', color: T.muted, maxWidth: 140 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
  title: { fontSize: 16, fontWeight: '900', color: T.ink },
  subtitle: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },
  prioRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  prioChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
  },
  prioChipText: { fontSize: 10.5, fontWeight: '800' },
  prioHint: { fontSize: 10.5, fontWeight: '600', color: T.muted },
  closeBtn: { padding: 4, marginLeft: 8 },

  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.green, paddingHorizontal: 14, paddingVertical: 7,
  },
  toastText: { color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 },

  body: { padding: 12 },
  shadeCard: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
    borderRadius: 12, padding: 10, marginBottom: 10,
  },
  shadeHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  shadeName: { fontSize: 15, fontWeight: '900', color: T.ink },
  shadeMeta: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  curChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3,
  },
  curText: { fontSize: 10.5, fontWeight: '900' },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  statusBtn: {
    flexGrow: 1, flexBasis: 88, height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 8, backgroundColor: T.surface, paddingHorizontal: 2,
  },
  statusBtnText: { fontSize: 11, fontWeight: '800' },
  nextHint: { fontSize: 10.5, fontWeight: '700', color: T.muted, marginTop: 6 },
  removeRow: {
    padding: 8, borderRadius: 8, borderWidth: 1, borderColor: `${T.red}55`, backgroundColor: `${T.red}0D`,
  },
  trailChipLast: { borderWidth: 1.5 },
  trailRemove: {
    marginLeft: 2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${T.red}1A`,
  },

  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  confirmText: { flex: 1, minWidth: 160, fontSize: 11.5, fontWeight: '700', color: T.ink },
  cancelBtn: {
    borderWidth: 1, borderColor: T.border, borderRadius: 8,
    paddingHorizontal: 12, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface,
  },
  cancelText: { fontSize: 12, fontWeight: '800', color: T.ink },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.green, borderRadius: 8, paddingHorizontal: 14, height: 32,
  },
  saveText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  formError: { color: T.red, fontSize: 11.5, fontWeight: '700', marginTop: 6 },

  trail: { alignItems: 'center', paddingTop: 10, paddingRight: 8 },
  trailItem: { flexDirection: 'row', alignItems: 'center' },
  trailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4,
  },
  trailDate: { fontSize: 10.5, fontWeight: '800', color: T.ink },
  trailStatus: { fontSize: 10.5, fontWeight: '900' },
  noTrail: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 8 },

  letter: { alignItems: 'center', justifyContent: 'center' },
  letterText: { color: '#fff', fontWeight: '900' },
});
