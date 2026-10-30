// FILE: src/screens/dyeing/ColourStatusSheet.tsx
// Status sheet opened from a Priority card's "Status" button. SHADE-WISE.
//
//   Pink · Sr 2 · 1,200 m · Lot SR-4310                    ● Dying
//   ┌ OUTWARD · LOT NO. ─────────────────────────── 2 lots ⟳ ┐
//   │ [Select Outward 🔍] [Lot No.     ] [+ Add]               │
//   │ Outward No.            | Lot No.                     │
//   │ OutNo · OutDate · acc  | SR-4310                   ✎ │  <- GET /dyeing/lotnos
//   └──────────────────────────────────────────────────────┘
//   [Sent for job] [Dying] [Finish] [Job inward] [✂ Lorry Cut]   <- shade status
//   (29/09/26 Sent for job) → (30/09/26 Dying)                    <- status with date
//
// LOT QTY: every outward lot now carries its lot qty (= outward qty of the
// lot). The shade's status is saved with Qty = total lot qty (when every lot
// has a qty), else the shade qty — the backend does the same.
//
// - Outward · Lot No. block (OutwardLotSection):
//     help            GET /dyeing/outward_details?prptype&chartno&yearno
//     [Advance] ->    GET /dyeing/outward_details_all?prptype&yearno&orderuid&ordersrno (nested help)
//     Add / ✎ update  /dyeing/save_outward_details?prptype&chartno&yearno&uid&srno&lotno
//     table           GET /dyeing/lotnos?prptype&chartno&yearno&orderuid&ordersrno (reloaded after every save)
//   orderuid = chart.OrderUId, ordersrno = shade.OrderSrNo (both from browse).
//   SHADE-WISE (same as status): EVERY shade has its own Outward · Lot block
//   and its OWN calls — list (lotnos), help (outward_details), advance
//   (outward_details_all), add / update (save_outward_details) and delete
//   (remove_lotno) all send that shade's `shdcode` + `shdname`.
//   Outward identity = uuid + usrno (API `uid` / `srno` are the SO line).
//   Help / Advance list EVERY outward in EVERY shade: an outward already
//   taken in a shade can't be taken again in THAT shade, but another shade
//   of the card can take the same outward (not blocked).
// - Status: FIXED sequence (see NEXT_STATUSES in dyeingModel):
//     Sent for job -> Dying -> Finish -> Job inward  OR  Lorry Cut
//   Only the next step of the latest status is enabled — no skip, no going
//   back, no repeat. Tap it -> Save -> /dyeing/save_status for THIS outward + shade only
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
  normalizeStatus,
} from './dyeingModel';
import { chipDate, lineKeyOf, OutwardRow, outwardSaveOk, rowShadeMatch, toOutwardRows } from './dyeingOutward';
import { DyeingGuide } from './DyeingGuide';
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
  const [guideOpen, setGuideOpen] = useState(false);

  // SHADE-WISE outward / lot data — every call is made per shade and sends
  // that shade's code + name (shdcode / shdname):
  //   help     GET /dyeing/outward_details      ?prptype&chartno&yearno&shdcode&shdname&dsncode&dsnname
  //   advance  GET /dyeing/outward_details_all  ?prptype&yearno&orderuid&ordersrno&shdcode&shdname&dsncode&dsnname
  //   table    GET /dyeing/lotnos               ?prptype&chartno&yearno&orderuid&ordersrno&shdcode&shdname&dsncode&dsnname
  //   (dsncode / dsnname = the card's design — chart.DesignCode / chart.DesignName)
  // key = shadeKeyOf(shade)
  const [helpByShade, setHelpByShade] = useState<Record<string, OutwardState>>({});
  const [lotsByShade, setLotsByShade] = useState<Record<string, OutwardState>>({});
  const chartNo = chart?.ChartNo ?? '';
  const orderUId = chart?.OrderUId;

  // shades that share one SO line (same OrderSrNo) — only used for the note
  // and for untagged rows (see OutwardLotSection.ownsUntagged)
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

  /**
   * shdcode + shdname of a shade + dsncode + dsnname of the card's design
   * (the design shown outside, on the Priority card), as sent on the
   * outward_details / outward_details_all / lotnos calls.
   */
  const dsnCode = String(chart?.DesignCode ?? '').trim();
  const dsnName = String(chart?.DesignName ?? '').trim();
  const shadeParams = useCallback((shade: PriorityShade) => ({
    shdcode: String(shade.ShdCode ?? '').trim(),
    shdname: String(shade.ShdName ?? '').trim(),
    dsncode: dsnCode,
    dsnname: dsnName,
  }), [dsnCode, dsnName]);

  /** Help — outward lines of the chart for ONE shade (GET /dyeing/outward_details). */
  const loadHelp = useCallback(async (shade: PriorityShade) => {
    if (!chartNo) return;
    const k = shadeKeyOf(shade);
    setHelpByShade((cur) => ({ ...cur, [k]: { rows: cur[k]?.rows ?? [], loading: true, error: null } }));
    try {
      const params = { prptype: prpGroup, chartno: chartNo, yearno: yearNo, ...shadeParams(shade) };
      console.log('[Dyeing] outward_details request ->', params);
      const response: any = await DyeingService.outwardDetails(params);
      if (failed(response)) throw new Error(messageOf(response, 'Unable to load outward list'));
      setHelpByShade((cur) => ({ ...cur, [k]: { rows: toOutwardRows(response), loading: false, error: null } }));
    } catch (err: any) {
      setHelpByShade((cur) => ({
        ...cur,
        [k]: { rows: [], loading: false, error: err?.response?.data?.message || err?.message || 'Unable to load outward list' },
      }));
    }
  }, [chartNo, prpGroup, yearNo, shadeParams]);

  /** Table — saved lot nos of ONE shade (GET /dyeing/lotnos). */
  const loadLots = useCallback(async (shade: PriorityShade) => {
    if (!chartNo || orderUId === undefined || orderUId === null) return;
    const k = shadeKeyOf(shade);
    setLotsByShade((cur) => ({ ...cur, [k]: { rows: cur[k]?.rows ?? [], loading: true, error: null } }));
    try {
      const params = {
        prptype: prpGroup, chartno: chartNo, yearno: yearNo, orderuid: orderUId, ordersrno: shade.OrderSrNo, ...shadeParams(shade),
      };
      console.log('[Dyeing] lotnos request ->', params);
      const response: any = await DyeingService.lotNos(params);
      console.log('[Dyeing] lotnos response ->', response?.data ?? response);
      if (failed(response)) throw new Error(messageOf(response, 'Unable to load lot nos.'));
      setLotsByShade((cur) => ({ ...cur, [k]: { rows: toOutwardRows(response), loading: false, error: null } }));
    } catch (err: any) {
      setLotsByShade((cur) => ({
        ...cur,
        [k]: { rows: [], loading: false, error: err?.response?.data?.message || err?.message || 'Unable to load lot nos.' },
      }));
    }
  }, [chartNo, orderUId, prpGroup, yearNo, shadeParams]);

  /** Nested "Advance" help — every outward of the SO line, for ONE shade (GET /dyeing/outward_details_all). */
  const loadAdvance = useCallback(async (shade: PriorityShade) => {
    const params = { prptype: prpGroup, yearno: yearNo, orderuid: orderUId ?? '', ordersrno: shade.OrderSrNo, ...shadeParams(shade) };
    console.log('[Dyeing] outward_details_all request ->', params);
    const response: any = await DyeingService.outwardDetailsAll(params);
    if (failed(response)) throw new Error(messageOf(response, 'Unable to load outwards'));
    return toOutwardRows(response);
  }, [orderUId, prpGroup, yearNo, shadeParams]);

  const shadesSig = useMemo(
    () => (chart?.shades ?? []).map((sh) => shadeKeyOf(sh)).join(','),
    [chart?.shades],
  );

  useEffect(() => {
    if (!visible) {
      setToast(null);
      setLotsByShade({});
      setHelpByShade({});
      return;
    }
    (chart?.shades ?? []).forEach((sh) => { void loadHelp(sh); void loadLots(sh); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, loadHelp, loadLots, shadesSig]);

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
    (Object.values(helpByShade) as OutwardState[]).flatMap((h) => h.rows).forEach((r) => {
      if (!r.hasChallan) return;
      if (r.uuid) byUuid[r.uuid] = r.challanNo;
      const lk = lineKeyOf(r);
      if (!byLine[lk]) byLine[lk] = r.challanNo;
    });
    return { byUuid, byLine };
  }, [helpByShade]);
  const challanOf = useCallback((row: OutwardRow) => {
    if (row.hasChallan) return row.challanNo;
    return challanMap.byLine[lineKeyOf(row)] || (row.uuid && challanMap.byUuid[row.uuid]) || row.challanNo;
  }, [challanMap]);

  /** Rows of this shade's own call: drop rows explicitly tagged to another shade. */
  const rowsOfShade = useCallback((rows: OutwardRow[], shade: PriorityShade) =>
    rows.filter((r) => rowShadeMatch(r, shade) !== false), []);

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
            <TouchableOpacity
              onPress={() => setGuideOpen(true)}
              style={st.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="How the status sheet works"
            >
              <Icon name="help-outline" size={20} color={T.copper} />
            </TouchableOpacity>
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
              const k = shadeKeyOf(shade);
              const shadeLots = lotsByShade[k] ?? { rows: [], loading: true, error: null };
              // shade-wise: this shade's own lot rows (its own lotnos call)
              const table: OutwardState = { ...shadeLots, rows: rowsOfShade(shadeLots.rows, shade) };
              // this shade's own help list (NOT filtered — the same outward can be taken by every shade, once per shade)
              const shadeHelp: OutwardState = helpByShade[k] ?? { rows: [], loading: true, error: null };
              const outwardLots = table.rows.map((r) => r.lotNo).filter(Boolean);
              const withLot = table.rows.filter((r) => r.lotNo);
              const lotQtyTotal = withLot.length && withLot.every((r) => r.lotQty != null && r.lotQty > 0)
                ? withLot.reduce((sum, r) => sum + (r.lotQty ?? 0), 0)
                : (table.loading ? shade.LotQty : null);
              const others = group.filter((g) => g !== shade).map((g) => g.ShdName).filter(Boolean);
              // Build one independent status block per outward actually assigned
              // to this shade. lotnos rows are the authoritative selected outward
              // lines; group lots by the outward UUID so one outward with multiple
              // lots still gets only one status timeline.
              const statusOutwards = (shade.outwards || []).filter((ow) =>
                String(ow.OutwardUId ?? (ow as any).uuid ?? '').trim() || ow.OutwardNo || ow.Status || (ow.lots || []).length
              );
              const groupedLotOutwards = (() => {
                const groups = new Map<string, any>();
                // Each outward must have its own status card. The API's `uuid`
                // is the outward UID; `uid` is the SO line UID and must NOT be
                // used to merge different outward documents.
                table.rows.filter((row) => !!row.lotNo).forEach((row) => {
                  const uid = String(row.uuid || '').trim();
                  const outwardNo = String(row.outNo || row.challanNo || '').trim();
                  const identity = uid ? `uuid:${uid}` : `outno:${outwardNo}|${row.srno || ''}`;
                  if (!uid && !outwardNo) return;
                  const current = groups.get(identity) || {
                    OutwardUId: uid,
                    uuid: uid,
                    OutwardNo: row.outNo || (row.hasChallan ? row.challanNo : null),
                    OutDate: row.OutDate || row.date || null,
                    Status: null,
                    Details: { Qty: 0 },
                    lots: [],
                    __lotRows: [],
                  };
                  current.__lotRows.push(row);
                  current.lots.push({
                    LotNo: row.lotNo,
                    LotQty: row.lotQty,
                    OutwardUId: uid,
                    history: [],
                  });
                  current.Details.Qty += Number(row.lotQty || 0);
                  groups.set(identity, current);
                });

                const lotTokens = (values: any[]) => Array.from(new Set(
                  (values || []).flatMap((value: any) => String(value ?? '').split('/'))
                    .map((value: string) => value.trim())
                    .filter(Boolean)
                ));

                return Array.from(groups.values()).map((group) => {
                  const groupLotTokens = lotTokens((group.__lotRows || []).map((row: any) => row.lotNo));
                  const groupUid = String(group.OutwardUId ?? '').trim();
                  const groupOutwardNo = String(group.OutwardNo ?? '').trim();
                  // UID is the primary key. Only use outward number/lot matching
                  // when the browse status record has no UID of its own.
                  const matchedStatus = statusOutwards.find((ow: any) => {
                    const statusUid = String(ow.OutwardUId ?? ow.uuid ?? '').trim();
                    return !!groupUid && !!statusUid && statusUid === groupUid;
                  }) || statusOutwards.find((ow: any) => {
                    const statusUid = String(ow.OutwardUId ?? ow.uuid ?? '').trim();
                    const statusNo = String(ow.OutwardNo ?? ow.OutNo ?? '').trim();
                    return !statusUid && !!groupOutwardNo && !!statusNo && statusNo === groupOutwardNo;
                  }) || statusOutwards.find((ow: any) => {
                    const statusUid = String(ow.OutwardUId ?? ow.uuid ?? '').trim();
                    if (statusUid) return false;
                    const statusLotTokens = lotTokens((ow.lots || []).map((lot: any) => lot?.LotNo));
                    return statusLotTokens.length > 0 && groupLotTokens.some((lotNo: string) => statusLotTokens.includes(lotNo));
                  });

                  return matchedStatus ? {
                    ...group,
                    ...matchedStatus,
                    // Preserve the actual outward UID from the selected outward
                    // row even if the browse status response contains an empty UID.
                    OutwardUId: groupUid || matchedStatus.OutwardUId || matchedStatus.uuid || '',
                    uuid: groupUid || matchedStatus.uuid || matchedStatus.OutwardUId || '',
                    OutwardNo: matchedStatus.OutwardNo || matchedStatus.OutNo || group.OutwardNo,
                    lots: (matchedStatus.lots?.length ? matchedStatus.lots : group.lots),
                    Details: { ...(group.Details || {}), ...(matchedStatus.Details || {}), Qty: matchedStatus.Details?.Qty ?? group.Details?.Qty },
                    __lotRows: group.__lotRows,
                  } : group;
                });
              })();

              // Every outward that has at least one saved lot gets its own status
              // card immediately after the lot list refreshes. Also retain browse
              // status entries for older records whose lot rows are not returned.
              const statusTargets = (() => {
                const targets = [...groupedLotOutwards];
                statusOutwards.forEach((ow: any) => {
                  const uid = String(ow.OutwardUId ?? ow.uuid ?? '').trim();
                  const no = String(ow.OutwardNo ?? ow.OutNo ?? '').trim();
                  const exists = targets.some((target: any) => {
                    const targetUid = String(target.OutwardUId ?? target.uuid ?? '').trim();
                    const targetNo = String(target.OutwardNo ?? target.OutNo ?? '').trim();
                    return (uid && targetUid === uid) || (!uid && no && targetNo === no);
                  });
                  if (!exists) targets.push(ow);
                });
                return targets;
              })();
              // props shared by the entry form and every per-outward row table of this shade
              const lotSectionProps = {
                shdCode: shade.ShdCode,
                shdName: shade.ShdName,
                ownsUntagged: group.length === 1,
                chartNo: chart.ChartNo,
                orderUId: chart.OrderUId,
                parCode: chart.ParCode,
                shadeQty: shade.AllocationQty,
                orderSrNo: shade.OrderSrNo,
                prpGroup,
                yearNo,
                help: shadeHelp,
                table,
                loadAdvance: () => loadAdvance(shade),
                challanOf,
                canEdit: perms.canLot,
                onRetry: () => { void loadLots(shade); void loadHelp(shade); },
                onSaved: async (message: string) => {
                  setToast(`${shade.ShdName ? `${shade.ShdName} · ` : ''}${message}`);
                  await Promise.all([loadLots(shade), loadHelp(shade), Promise.resolve(onSaved())]);
                },
              };
              return (
                <View key={shadeKeyOf(shade)} style={st.shadeCard}>
                {/* SHADE header + the ONE add form of this shade */}
                <View style={st.shadeHead}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.shadeName} numberOfLines={1}>{shade.ShdName}</Text>
                    <Text style={st.shadeMeta} numberOfLines={1}>
                      {shade.ShdCode ? `Code ${shade.ShdCode} · ` : ''}Sr {shade.OrderSrNo} · {qtyLabel(shade.AllocationQty)} m
                      {lotQtyTotal != null ? ` · Lot qty ${qtyLabel(lotQtyTotal)} m` : ''}
                    </Text>
                  </View>
                </View>
                <OutwardLotSection
                  {...lotSectionProps}
                  title={`Outward · Lot No. — ${shade.ShdName || shade.ShdCode || `Sr ${shade.OrderSrNo}`}`}
                  note={others.length ? `Sr ${shade.OrderSrNo} is shared with ${others.join(' · ')} — lot nos. here are for ${shade.ShdName} only` : null}
                  showEntry
                  showTable={false}
                />
                {/* ONE BLOCK PER OUTWARD: outward · lot · ✎ 🗑 + its own status buttons + timeline */}
                {statusTargets.map((outwardEntry: any, outwardIndex: number) => {
                  // Browse status rows can have an empty OutwardUId. The outward_details
                  // endpoint provides the actual outward identity as `uuid`; resolve it
                  // from this shade's outward-help rows before building save/remove payloads.
                  const entryLotNos = (outwardEntry.lots || [])
                    .map((lot: any) => String(lot?.LotNo ?? '').trim())
                    .filter(Boolean)
                    .flatMap((lotNo: string) => lotNo.split('/').map((part) => part.trim()).filter(Boolean));
                  const shadeOutwardRows = shadeHelp.rows.filter((row) => rowShadeMatch(row, shade) !== false && !!(row.uuid || row.uid));
                  const outwardNo = String(outwardEntry.OutwardNo ?? outwardEntry.OutNo ?? '').trim();
                  const rowByOutwardNo = outwardNo
                    ? shadeOutwardRows.find((row) => row.outNo === outwardNo || row.challanNo === outwardNo)
                    : undefined;
                  // First resolve from this status/outward's own lot numbers against
                  // the shade's outwardLots (browse response). Those rows carry the
                  // selected outward UID; do not use the SO-line uid/srno instead.
                  const shadeOutwardLots: any[] = Array.isArray((shade as any).outwardLots)
                    ? (shade as any).outwardLots
                    : [];
                  const matchingBrowseLots = shadeOutwardLots.filter((lot: any) => {
                    const lotNo = String(lot?.LotNo ?? '').trim();
                    return lotNo && entryLotNos.includes(lotNo);
                  });
                  const browseLotUids = Array.from(new Set(matchingBrowseLots
                    .map((lot: any) => String(lot?.OutwardUId ?? lot?.uuid ?? '').trim())
                    .filter((uid: string) => uid && uid !== '0')));
                  const allBrowseUids = Array.from(new Set(shadeOutwardLots
                    .map((lot: any) => String(lot?.OutwardUId ?? lot?.uuid ?? '').trim())
                    .filter((uid: string) => uid && uid !== '0')));
                  const rowByLot = entryLotNos.length
                    ? shadeOutwardRows.find((row) => row.lotNo && entryLotNos.includes(row.lotNo))
                    : undefined;
                  const onlyShadeRow = shadeOutwardRows.length === 1 ? shadeOutwardRows[0] : undefined;
                  const resolvedOutwardUid = String(
                    outwardEntry.OutwardUId || outwardEntry.uuid || outwardEntry.outwarduid ||
                    (outwardEntry.lots || []).find((lot: any) => lot?.OutwardUId || lot?.uuid)?.OutwardUId ||
                    (outwardEntry.lots || []).find((lot: any) => lot?.OutwardUId || lot?.uuid)?.uuid ||
                    (browseLotUids.length === 1 ? browseLotUids[0] : '') ||
                    (allBrowseUids.length === 1 ? allBrowseUids[0] : '') ||
                    rowByOutwardNo?.uuid || rowByOutwardNo?.uid || rowByLot?.uuid || rowByLot?.uid || onlyShadeRow?.uuid || onlyShadeRow?.uid || ''
                  );
                  const outwardEvents: DyeEvent[] = (outwardEntry.lots || []).flatMap((lot: any) => (lot.history || []).map((event: any) => ({
                    Id: event.Id ?? `${event.Status}-${event.StatusDate ?? ''}-${outwardEntry.OutwardUId}`,
                    Status: normalizeStatus(event.Status) || normalizeStatus(lot.Status) || 'Sent for job',
                    StatusDate: parseAnyDate(event.StatusDate ?? lot.StatusDate), Qty: num(event.Qty ?? lot.LotQty),
                    IsRework: !!event.IsRework, LorryCutReason: event.LorryCutReason ?? null, Remarks: event.Remarks ?? null,
                    ChallanNo: event.ChallanNo ?? null, AgainstChallanNo: event.AgainstChallanNo ?? null,
                    MillName: event.MillName ?? null, Rate: event.Rate == null ? null : num(event.Rate),
                    CreatedBy: event.CreatedBy ?? null, CreatedAt: event.CreatedAt ?? null,
                  } as DyeEvent)));
                  const outwardQty = Number(outwardEntry?.Details?.Qty ?? (outwardEntry?.lots || []).reduce((sum: number, lot: any) => sum + Number(lot?.LotQty || 0), 0));
                  const statusShade: PriorityShade = {
                    ...shade,
                    // Each card owns only its matching outward's timeline. Never
                    // copy another outward's current status onto this card.
                    Status: normalizeStatus(outwardEntry.Status) || (outwardEvents.length ? outwardEvents[outwardEvents.length - 1].Status : null),
                    colourHistory: outwardEvents,
                    lots: [],
                  };
                  // DELETE RULE: an outward's lot can be deleted only while the outward is at
                  // "Sent for job" (or has no status). Dying / Finish / Job inward / Lorry Cut
                  // -> block, the user must remove those statuses first (latest chip ✕).
                  const outwardTrail = shadeTrail(statusShade);
                  const outwardCurrentStatus: ShadeStatus | null = outwardTrail.length
                    ? outwardTrail[outwardTrail.length - 1].Status
                    : statusShade.Status;
                  const lotRemoveBlock = outwardCurrentStatus && outwardCurrentStatus !== 'Sent for job'
                    ? `This outward is already at "${outwardCurrentStatus}". Remove its status first.`
                    : null;
                  const cardLotNos = Array.from(new Set(
                    (outwardEntry.__lotRows || [])
                      .map((row: any) => String(row.lotNo || '').trim())
                      .filter(Boolean)
                  ));
                  const cardLotQty = Number(outwardEntry?.Details?.Qty ?? (outwardEntry.lots || []).reduce((sum: number, lot: any) => sum + Number(lot?.LotQty || 0), 0));
                  return <ShadeCard
                  key={`${shadeKeyOf(shade)}::outward:${outwardEntry.OutwardUId || outwardEntry.OutwardNo || outwardIndex}`}
                  chart={chart}
                  shade={statusShade}
                  outwardUid={resolvedOutwardUid}
                  outwardLabel={outwardEntry.OutwardNo ? `Outward ${outwardEntry.OutwardNo}` : `Outward ${outwardIndex + 1}`}
                  outwardMeta={[
                    outwardEntry.OutDate ? chipDate(outwardEntry.OutDate) : '',
                    cardLotNos.length ? `Lot ${cardLotNos.join('/')}` : '',
                  ].filter(Boolean).join(' · ')}
                  perms={perms}
                  prpGroup={prpGroup}
                  yearNo={yearNo}
                  outwardLotNos={cardLotNos.length ? cardLotNos : outwardLots}
                  lotQtyTotal={cardLotQty > 0 ? cardLotQty : (outwardQty > 0 ? outwardQty : (lotQtyTotal ?? null))}
                  outward={(outwardEntry.__lotRows || []).length ? (
                    <OutwardLotSection
                      {...lotSectionProps}
                      showEntry={false}
                      compact
                      rows={outwardEntry.__lotRows}
                      removeBlockReason={lotRemoveBlock}
                    />
                  ) : null}
                  onSaved={afterStatusSave}
                />;
                })}
                </View>
              );
            })}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <DyeingGuide visible={guideOpen} section="status" onClose={() => setGuideOpen(false)} />
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  One shade: name + Outward/Lot block + status buttons + status/date chips   */
/* -------------------------------------------------------------------------- */

function ShadeCard({
  chart, shade, perms, prpGroup, yearNo, outwardLotNos, lotQtyTotal, outward, onSaved, outwardUid, outwardLabel, outwardMeta,
}: {
  chart: PriorityChart;
  shade: PriorityShade;
  outwardUid: string;
  outwardLabel: string;
  outwardMeta: string;
  perms: SheetPerms;
  prpGroup: string;
  yearNo: string | number;
  outwardLotNos: string[]; // lot nos. saved on this shade's outwards
  lotQtyTotal: number | null; // total lot qty of this shade (null = no lot / a lot without qty)
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
    if (!String(outwardUid ?? '').trim()) {
      setError('Selected outward UUID is missing. Refresh outward details and select the correct outward before saving.');
      return;
    }
    // guard again at save time — never send an out-of-sequence status
    if (!canMoveTo(current, picked)) {
      setError(`Next status can only be ${allowed.join(' or ') || '—'}.`);
      setPicked(null);
      return;
    }
    if (picked === 'Lorry Cut' && !reason) { setError('Select the Lorry Cut reason.'); return; }
    setError(null);
    // /dyeing/save_status — ONLY this shade (its own OrderUId / OrderSrNo /
    // ShdCode / ChartNo), dated today. Qty = the shade's total LOT qty
    // (outward qty of its lots), else the shade's full qty.
    const qty = lotQtyTotal != null && lotQtyTotal > 0 ? lotQtyTotal : num(shade.AllocationQty);
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
      OutwardUId: outwardUid || null,
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
    if (!String(outwardUid ?? '').trim()) {
      setError('Selected outward UUID is missing. Refresh outward details before deleting this status.');
      return;
    }
    setError(null);
    const payload: RemoveStatusPayload = {
      OrderUId: asNum(chart.OrderUId),
      OrderSrNo: asNum(shade.OrderSrNo),
      ChartNo: chart.ChartNo,
      ParCode: String(chart.ParCode ?? ''),
      ShdCode: String(shade.ShdCode ?? ''),
      Status: current,
      OutwardUId: outwardUid || null,
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
    <View style={st.outBlock}>
      <View style={st.outHead}>
        <Icon name="local-shipping" size={14} color={T.copper} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.outTitle} numberOfLines={1}>{outwardLabel}</Text>
          <Text style={st.shadeMeta} numberOfLines={1}>
            {outwardMeta}{outwardMeta && lotQtyTotal != null ? ' · ' : ''}{lotQtyTotal != null ? `Lot qty ${qtyLabel(lotQtyTotal)} m` : ''}
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
            {' '}· {qtyLabel(lotQtyTotal != null && lotQtyTotal > 0 ? lotQtyTotal : shade.AllocationQty)} m · today?
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
  outBlock: {
    marginTop: 10, padding: 9, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, borderLeftColor: T.copper,
    borderRadius: 10, backgroundColor: T.sub,
  },
  outHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  outTitle: { fontSize: 13, fontWeight: '900', color: T.ink },
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
