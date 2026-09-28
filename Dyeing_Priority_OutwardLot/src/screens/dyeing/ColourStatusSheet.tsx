// FILE: src/screens/dyeing/ColourStatusSheet.tsx
// Status sheet opened from a Priority card's "Status" button.
//
// Chart -> Colour -> Lot -> status history. Everything is ROW-WISE:
//   - every Save posts ONE colour (its own OrderSrNo, AllocationId, ShdCode)
//     — never a whole-chart "common" status like the old sheet did;
//   - history is append-only: a new status adds an event with its date,
//     previous events are never overwritten;
//   - a colour has one or more lots (lot no. comes from the outward
//     challan, see UPDATE below), each with its own status and history.
//     The colour's status = its slowest lot.
//   - Lorry Cut needs a reason; allowed only after the lot has been dyed.
//     A repeated status on the same lot is marked Re-work.
//   - Client priority is shown READ-ONLY (lock) — it cannot be changed here.
//
// The sheet never patches local state from the draft: after a successful
// save it asks the parent to re-browse, and re-renders from that response.
//
// UPDATE (outward lot no.): lot nos. now come from the OUTWARD challan.
// Every colour has a "Lot No." block (OutwardLotSection):
//   Select Outward (help: /dyeing/outward_details) + Lot No. + Add
//   -> /dyeing/save_outward_details (uid, srno, lotno) -> list re-fetched,
//   saved outward + lot no. shown as a table; ✎ edits with the same API.
// Qty is no longer entered anywhere (status saves the full lot qty), and the
// old qty-based "split into lots / edit lot" forms are removed. Status update
// (Sent / Dying / Finish / Job inward / Lorry Cut, re-work, history) is
// unchanged. Each lot shows its status trail as date chips.

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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DyeingService, isSaved, messageOf } from './dyeingApi';
import {
  addDaysISO,
  DyeEvent,
  DyeLot,
  isReworkFor,
  LORRY_CUT_REASONS,
  LotEntry,
  num,
  parseAnyDate,
  PriorityChart,
  PriorityShade,
  qtyLabel,
  ruleHistory,
  SaveStatusPayload,
  ShadeStatus,
  showDate,
  STATUS_COLORS,
  STATUS_LETTER,
  STATUS_OPTIONS,
  todayISO,
} from './dyeingModel';
import { chipDate, groupOutwardsByShade, OutwardRow, toOutwardRows } from './dyeingOutward';
import { OutwardLotSection } from './OutwardLotSection';

export type SheetPerms = {
  canStatus: boolean; // update status / lorry cut (row-wise save)
  canLot: boolean; // add / edit outward lot nos.
};

type Props = {
  visible: boolean;
  chart: PriorityChart | null;
  perms: SheetPerms;
  prpGroup: string;
  yearNo: string | number;
  knownMills: string[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const lotKeyOf = (lot: DyeLot, idx: number) => (lot.LotId != null ? `L${lot.LotId}` : `V${idx}`);
const shadeKeyOf = (shade: PriorityShade) => `${shade.ShdCode || shade.ShdName}::${shade.OrderSrNo}`;
const lotName = (lot: DyeLot) => (lot.LotNo ? `Lot ${lot.LotNo}` : lot.LotId != null ? `Lot #${lot.LotId}` : 'Balance');

/** Lot nos. already used by the colour's OTHER saved lots (upper-case). */
const takenLotNos = (shade: PriorityShade, exceptLotId: number | null) =>
  shade.lots
    .filter((l) => !l.virtual && l.LotId !== exceptLotId && l.LotNo)
    .map((l) => l.LotNo.trim().toUpperCase());

/** Colour context sent with every save (row-wise). */
const colourContext = (chart: PriorityChart, shade: PriorityShade, prpGroup: string, yearNo: string | number) => ({
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
});

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

export function ColourStatusSheet({
  visible, chart, perms, prpGroup, yearNo, knownMills, onClose, onSaved,
}: Props) {
  const [editing, setEditing] = useState<{ shade: string; lot: string } | null>(null);
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  // outward (challan) lines of this chart + their saved lot nos.
  const [outwards, setOutwards] = useState<OutwardRow[]>([]);
  const [outLoading, setOutLoading] = useState(false);
  const [outError, setOutError] = useState<string | null>(null);
  const chartNo = chart?.ChartNo ?? '';

  const loadOutwards = useCallback(async () => {
    if (!chartNo) return;
    setOutLoading(true);
    setOutError(null);
    try {
      const params = { prptype: prpGroup, chartno: chartNo, yearno: yearNo };
      console.log('[Dyeing] outward_details request ->', params);
      const response: any = await DyeingService.outwardDetails(params);
      console.log('[Dyeing] outward_details response ->', response?.data ?? response);
      setOutwards(toOutwardRows(response));
    } catch (err: any) {
      setOutwards([]);
      setOutError(err?.response?.data?.message || err?.message || 'Unable to load outward list');
    } finally {
      setOutLoading(false);
    }
  }, [chartNo, prpGroup, yearNo]);

  useEffect(() => {
    if (!visible) {
      setEditing(null);
      setOpenHistory({});
      setToast(null);
      setOutwards([]);
      setOutError(null);
      return;
    }
    loadOutwards();
  }, [visible, loadOutwards]);

  const outwardGroups = useMemo(
    () => groupOutwardsByShade(outwards, chart?.shades ?? []),
    [outwards, chart?.shades],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const afterSave = useCallback(async (message: string) => {
    setEditing(null);
    setToast(message);
    await onSaved();
  }, [onSaved]);

  // outward lot saved -> re-fetch the outward list (table) AND re-browse (lots)
  const afterOutwardSave = useCallback(async (message: string) => {
    setToast(message);
    await Promise.all([loadOutwards(), Promise.resolve(onSaved())]);
  }, [loadOutwards, onSaved]);

  if (!chart) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.sheet}>
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
                <Text style={st.prioHint}>{qtyLabel(chart.qty)} m · {chart.shades.length} colours</Text>
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
            {/* outward lines that carry no colour info (chart has several colours) */}
            {outwardGroups.unmatched.length > 0 && (
              <View style={st.colourCard}>
                <OutwardLotSection
                  title="Lot No. — all colours"
                  chartNo={chart.ChartNo}
                  prpGroup={prpGroup}
                  yearNo={yearNo}
                  rows={outwardGroups.unmatched}
                  loading={outLoading}
                  loadError={null}
                  canEdit={perms.canLot}
                  onRetry={loadOutwards}
                  onSaved={afterOutwardSave}
                />
              </View>
            )}
            {chart.shades.map((shade) => {
              const sKey = shadeKeyOf(shade);
              const colourHistOpen = !!openHistory[`${sKey}|colour`];
              const hasSavedLots = shade.lots.some((lot) => !lot.virtual);
              // the un-split balance row is only shown while the colour has no lots
              const lotsShown = shade.lots.filter((lot) => !lot.virtual || !hasSavedLots || !!lot.Status);
              const shadeOutwards = outwardGroups.byShade[sKey] ?? [];
              const showOutward = shadeOutwards.length > 0 || outwardGroups.unmatched.length === 0;
              return (
                <View key={sKey} style={st.colourCard}>
                  <View style={st.colourHead}>
                    <StatusLetter status={shade.Status} size={20} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.colourName} numberOfLines={1}>{shade.ShdName}</Text>
                      <Text style={st.colourMeta} numberOfLines={1}>
                        {shade.ShdCode ? `Code ${shade.ShdCode} · ` : ''}Sr {shade.OrderSrNo} · {qtyLabel(shade.AllocationQty)} m
                        {shade.Status ? ` · ${shade.Status}` : ' · Not started'}
                      </Text>
                    </View>
                    {shade.colourHistory.length > 0 && (
                      <SmallBtn
                        icon={colourHistOpen ? 'expand-less' : 'history'}
                        label={`Colour ${shade.colourHistory.length}`}
                        active={colourHistOpen}
                        onPress={() => setOpenHistory((cur) => ({ ...cur, [`${sKey}|colour`]: !cur[`${sKey}|colour`] }))}
                      />
                    )}
                  </View>
                  {colourHistOpen && (
                    <View style={{ marginLeft: 4 }}>
                      <Text style={st.inheritNote}>Saved for the whole colour (before it was split into lots)</Text>
                      <HistoryList history={shade.colourHistory} inherited={[]} />
                    </View>
                  )}

                  {showOutward && (
                    <OutwardLotSection
                      chartNo={chart.ChartNo}
                      prpGroup={prpGroup}
                      yearNo={yearNo}
                      rows={shadeOutwards}
                      loading={outLoading}
                      loadError={outError}
                      canEdit={perms.canLot}
                      onRetry={loadOutwards}
                      onSaved={afterOutwardSave}
                    />
                  )}

                  {lotsShown.map((lot) => {
                    const li = shade.lots.indexOf(lot);
                    const lKey = lotKeyOf(lot, li);
                    const hKey = `${sKey}|${lKey}`;
                    const isEditingStatus = editing?.shade === sKey && editing?.lot === lKey;
                    const historyOpen = !!openHistory[hKey];
                    const parent = lot.ParentId != null ? shade.lots.find((l) => l.LotId === lot.ParentId) : undefined;
                    const histCount = lot.history.length + lot.inheritedHistory.length;
                    return (
                      <View key={lKey} style={st.lotRow}>
                        <View style={st.lotTop}>
                          <StatusLetter status={lot.Status} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={st.lotTitle} numberOfLines={1}>
                              {lot.virtual ? (hasSavedLots ? 'Unsplit balance' : 'Whole colour') : lotName(lot)}
                              <Text style={st.lotQty}>  {qtyLabel(lot.LotQty)} m</Text>
                            </Text>
                            <Text style={st.lotMeta} numberOfLines={1}>
                              {lot.Status
                                ? `${lot.Status}${lot.StatusDate ? ` · ${showDate(lot.StatusDate)}` : ''}`
                                : 'No status yet'}
                              {lot.LorryCutCount > 0 ? `  ·  ✂ ${lot.LorryCutCount}` : ''}
                              {lot.ParentId != null ? `  ·  ↳ split from ${parent ? lotName(parent) : `#${lot.ParentId}`}` : ''}
                            </Text>
                          </View>
                        </View>

                        {histCount > 0 && <StatusTrail history={lot.history} inherited={lot.inheritedHistory} />}

                        <View style={st.lotActions}>
                          {perms.canStatus && (
                            <SmallBtn
                              icon="edit-note"
                              label="Update status"
                              active={isEditingStatus}
                              onPress={() => setEditing(isEditingStatus ? null : { shade: sKey, lot: lKey })}
                            />
                          )}
                          {histCount > 0 && (
                            <SmallBtn
                              icon={historyOpen ? 'expand-less' : 'history'}
                              label={`History ${histCount}`}
                              active={historyOpen}
                              onPress={() => setOpenHistory((cur) => ({ ...cur, [hKey]: !cur[hKey] }))}
                            />
                          )}
                        </View>

                        {isEditingStatus && (
                          <StatusForm
                            chart={chart}
                            shade={shade}
                            lot={lot}
                            prpGroup={prpGroup}
                            yearNo={yearNo}
                            knownMills={knownMills}
                            onCancel={() => setEditing(null)}
                            onDone={afterSave}
                          />
                        )}

                        {historyOpen && <HistoryList history={lot.history} inherited={lot.inheritedHistory} />}
                      </View>
                    );
                  })}
                </View>
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
/*  Row-wise status form — one lot (+ "also apply to" other lots). No qty:     */
/*  every event is saved for the full lot qty.                                 */
/* -------------------------------------------------------------------------- */

function StatusForm({
  chart, shade, lot, prpGroup, yearNo, knownMills, onCancel, onDone,
}: {
  chart: PriorityChart;
  shade: PriorityShade;
  lot: DyeLot;
  prpGroup: string;
  yearNo: string | number;
  knownMills: string[];
  onCancel: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const rules = useMemo(() => ruleHistory(lot, shade), [lot, shade]);
  const hasDyed = rules.some((h) => h.Status === 'Dying');
  const outwardChallans = useMemo(
    () => Array.from(new Set(
      rules.filter((h) => h.Status === 'Sent for job' && h.ChallanNo).map((h) => String(h.ChallanNo)),
    )),
    [rules],
  );
  const lastMill = useMemo(
    () => [...rules].reverse().find((h) => h.MillName)?.MillName ?? '',
    [rules],
  );
  // other saved lots of the colour — "also apply the same status to"
  const otherLots = useMemo(
    () => shade.lots.filter((l) => !l.virtual && l.LotId != null && l.LotId !== lot.LotId),
    [shade.lots, lot.LotId],
  );
  // lot no. already fixed (comes from the outward) -> read-only here
  const lotNoLocked = !lot.virtual && !!lot.LotNo;
  const [also, setAlso] = useState<number[]>([]);

  const [status, setStatus] = useState<ShadeStatus | null>(null);
  const [date, setDate] = useState(todayISO());
  const [dateText, setDateText] = useState(showDate(todayISO()));
  const [lotNo, setLotNo] = useState(lot.LotNo || '');
  const [challanNo, setChallanNo] = useState('');
  const [against, setAgainst] = useState(outwardChallans[outwardChallans.length - 1] ?? '');
  const [mill, setMill] = useState(lastMill);
  const [rate, setRate] = useState('');
  const [reason, setReason] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shiftDate = (days: number) => {
    const next = addDaysISO(date, days);
    setDate(next);
    setDateText(showDate(next));
  };

  const willBeRework = status ? isReworkFor(rules, status) : false;

  const save = async () => {
    if (saving) return;
    setError(null);
    const iso = parseAnyDate(dateText);
    if (!status) return setError('Select a status.');
    if (!iso) return setError('Enter date as DD-MM-YYYY.');
    if (iso > todayISO()) return setError('Future date is not allowed.');
    if (status === 'Lorry Cut' && !hasDyed) return setError('Lorry Cut is allowed only after the lot has been dyed.');
    if (status === 'Lorry Cut' && !reason) return setError('Select the Lorry Cut reason.');

    const typedLotNo = (lotNoLocked ? lot.LotNo : lotNo).trim();
    if (status !== 'Sent for job' && !typedLotNo) {
      return setError('Lot No. is required from Dying onwards — add it in the Lot No. block (Select Outward + Lot No.).');
    }
    if (!lotNoLocked && typedLotNo && takenLotNos(shade, lot.LotId).includes(typedLotNo.toUpperCase())) {
      return setError(`Lot No. ${typedLotNo.toUpperCase()} already exists on this colour.`);
    }
    // full lot qty — qty is not entered any more
    const lots: LotEntry[] = [{ LotId: lot.LotId, LotNo: typedLotNo, LotQty: num(lot.LotQty), Qty: num(lot.LotQty) }];
    // same status on other lots of the colour (full lot qty each)
    for (const id of also) {
      const other = otherLots.find((l) => l.LotId === id);
      if (!other) continue;
      if (status !== 'Sent for job' && !other.LotNo) return setError(`${lotName(other)}: Lot No. is required from Dying onwards.`);
      if (status === 'Lorry Cut' && !ruleHistory(other, shade).some((h) => h.Status === 'Dying')) {
        return setError(`${lotName(other)}: Lorry Cut is allowed only after the lot has been dyed.`);
      }
      lots.push({ LotId: other.LotId, LotNo: other.LotNo, LotQty: num(other.LotQty), Qty: num(other.LotQty) });
    }
    const label = lots.length > 1 ? `${lots.length} lots` : typedLotNo ? `Lot ${typedLotNo}` : 'lot';

    const first = lots[0];
    const payload: SaveStatusPayload = {
      ...colourContext(chart, shade, prpGroup, yearNo),
      // single-lot fields (old body) — the backend uses `Lots` when present
      LotId: first.LotId,
      LotNo: first.LotNo,
      LotQty: num(first.LotQty ?? lot.LotQty),
      Status: status,
      StatusDate: iso,
      Qty: num(first.Qty),
      LorryCutReason: status === 'Lorry Cut' ? reason : null,
      Remarks: remarks.trim() || null,
      ChallanNo: status === 'Sent for job' || status === 'Job inward' ? challanNo.trim() || null : null,
      AgainstChallanNo: status === 'Job inward' ? against || null : null,
      MillName: status === 'Sent for job' || status === 'Job inward' ? mill.trim() || null : null,
      Rate: status === 'Job inward' && rate.trim() ? num(rate) : null,
      ...(lots.length > 1 ? { Lots: lots, SplitFromLotId: null } : {}),
    };

    setSaving(true);
    try {
      console.log('[Dyeing] save_status request ->', payload);
      const response: any = await DyeingService.saveStatus(payload);
      console.log('[Dyeing] save_status response ->', response);
      if (!isSaved(response)) throw new Error(messageOf(response, 'Unable to save status.'));
      await onDone(`${shade.ShdName} · ${label} → ${status}`);
    } catch (err: any) {
      setError(err?.message || 'Unable to save status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={st.form}>
      <Text style={[st.formLabel, { marginTop: 0 }]}>Status</Text>
      <View style={st.pillWrap}>
        {STATUS_OPTIONS.map((option) => {
          const disabled = option === 'Lorry Cut' && !hasDyed;
          const selected = status === option;
          const color = STATUS_COLORS[option];
          return (
            <TouchableOpacity
              key={option}
              disabled={disabled}
              onPress={() => setStatus(selected ? null : option)}
              style={[
                st.pill,
                { borderColor: selected ? color : T.border, backgroundColor: selected ? `${color}22` : T.surface },
                disabled && { opacity: 0.35 },
              ]}
            >
              <StatusLetter status={option} size={14} />
              <Text style={[st.pillText, { color: selected ? color : T.ink }]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {willBeRework && (
        <Text style={st.reworkNote}>
          ↻ "{status}" already recorded on this lot — this entry will be counted as Re-work (not new production).
        </Text>
      )}

      <View style={st.row2}>
        <View style={{ flex: 1.3 }}>
          <Text style={st.formLabel}>Date</Text>
          <View style={st.dateRow}>
            <TouchableOpacity onPress={() => shiftDate(-1)} style={st.dateArrow}><Icon name="chevron-left" size={18} color={T.ink} /></TouchableOpacity>
            <TextInput
              value={dateText}
              onChangeText={setDateText}
              onBlur={() => { const iso = parseAnyDate(dateText); if (iso) setDate(iso); }}
              style={[st.input, { flex: 1, textAlign: 'center' }]}
              placeholder="DD-MM-YYYY"
              placeholderTextColor={T.muted}
            />
            <TouchableOpacity onPress={() => shiftDate(1)} style={st.dateArrow}><Icon name="chevron-right" size={18} color={T.ink} /></TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.formLabel}>Lot No.{status && status !== 'Sent for job' ? ' *' : ''}</Text>
          {lotNoLocked ? (
            <View style={[st.input, st.lockedInput]}>
              <Icon name="lock-outline" size={12} color={T.muted} />
              <Text style={st.lockedText} numberOfLines={1}>{lot.LotNo}</Text>
            </View>
          ) : (
            <TextInput
              value={lotNo}
              onChangeText={setLotNo}
              style={st.input}
              placeholder="Lot no."
              placeholderTextColor={T.muted}
              autoCapitalize="characters"
            />
          )}
        </View>
      </View>

          {otherLots.length > 0 && (
            <>
              <Text style={st.formLabel}>Also apply this status to</Text>
              <View style={st.pillWrap}>
                {otherLots.map((other) => {
                  const on = also.includes(other.LotId as number);
                  return (
                    <TouchableOpacity
                      key={String(other.LotId)}
                      onPress={() => setAlso((cur) => (on ? cur.filter((x) => x !== other.LotId) : [...cur, other.LotId as number]))}
                      style={[st.pillSm, st.alsoPill, on && { borderColor: T.copper, backgroundColor: `${T.copper}18` }]}
                    >
                      <Icon name={on ? 'check-box' : 'check-box-outline-blank'} size={13} color={on ? T.copper : T.muted} />
                      <StatusLetter status={other.Status} size={12} />
                      <Text style={[st.pillSmText, on && { color: T.copper }]} numberOfLines={1}>
                        {lotName(other)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

      {(status === 'Sent for job' || status === 'Job inward') && (
        <>
          {status === 'Job inward' && outwardChallans.length > 0 && (
            <>
              <Text style={st.formLabel}>Against outward challan</Text>
              <View style={st.pillWrap}>
                {outwardChallans.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setAgainst(c)}
                    style={[st.pill, against === c && { borderColor: T.copper, backgroundColor: `${T.copper}18` }]}
                  >
                    <Text style={[st.pillText, against === c && { color: T.copper }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <View style={st.row2}>
            <View style={{ flex: 1 }}>
              <Text style={st.formLabel}>{status === 'Sent for job' ? 'Outward challan no.' : 'Inward challan no.'}</Text>
              <TextInput value={challanNo} onChangeText={setChallanNo} style={st.input} autoCapitalize="characters" />
            </View>
            {status === 'Job inward' && (
              <View style={{ flex: 0.7 }}>
                <Text style={st.formLabel}>Rate ₹/m</Text>
                <TextInput value={rate} onChangeText={setRate} keyboardType="decimal-pad" style={st.input} placeholder="opt." placeholderTextColor={T.muted} />
              </View>
            )}
          </View>
          <Text style={st.formLabel}>Mill</Text>
          <TextInput value={mill} onChangeText={setMill} style={st.input} placeholder="Process house / mill" placeholderTextColor={T.muted} />
          {knownMills.length > 0 && (
            <View style={[st.pillWrap, { marginTop: 6 }]}>
              {knownMills.map((m) => (
                <TouchableOpacity key={m} onPress={() => setMill(m)} style={[st.pillSm, mill === m && { borderColor: T.blue, backgroundColor: `${T.blue}14` }]}>
                  <Text style={[st.pillSmText, mill === m && { color: T.blue }]} numberOfLines={1}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {status === 'Lorry Cut' && (
        <>
          <Text style={st.formLabel}>Reason *</Text>
          <View style={st.pillWrap}>
            {LORRY_CUT_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setReason(r)}
                style={[st.pillSm, reason === r && { borderColor: T.purple, backgroundColor: `${T.purple}18` }]}
              >
                <Text style={[st.pillSmText, reason === r && { color: T.purple }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={st.formLabel}>Remarks</Text>
      <TextInput value={remarks} onChangeText={setRemarks} style={st.input} placeholder="optional" placeholderTextColor={T.muted} />

      {!!error && <Text style={st.formError}>{error}</Text>}

      <View style={st.formBtns}>
        <TouchableOpacity onPress={onCancel} style={st.cancelBtn} disabled={saving}>
          <Text style={st.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} style={[st.saveBtn, saving && { opacity: 0.6 }]} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="save" size={16} color="#fff" />}
          <Text style={st.saveText}>
            {also.length ? `Save ${also.length + 1} lots` : 'Save this row'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  History (append-only, newest first; inherited = parent lot before split)   */
/* -------------------------------------------------------------------------- */

function HistoryList({ history, inherited }: { history: DyeEvent[]; inherited: DyeEvent[] }) {
  const rows = [
    ...[...history].reverse().map((event) => ({ event, inheritedFrom: null as string | null })),
    ...[...inherited].reverse().map((event) => ({ event, inheritedFrom: event.FromLotNo || 'parent lot' })),
  ];
  return (
    <View style={st.history}>
      {rows.map(({ event, inheritedFrom }, idx) => (
        <View key={`${event.Id}-${idx}`} style={[st.histRow, inheritedFrom != null && { opacity: 0.6 }]}>
          <View style={st.histRail}>
            <StatusLetter status={event.Status} size={14} />
            {idx < rows.length - 1 && <View style={st.histLine} />}
          </View>
          <View style={{ flex: 1, minWidth: 0, paddingBottom: 8 }}>
            <Text style={st.histTitle}>
              {event.Status} · {qtyLabel(event.Qty)} m
              {event.IsRework ? <Text style={st.reworkTag}>  RE-WORK</Text> : null}
              {inheritedFrom != null ? <Text style={st.inheritTag}>  FROM {String(inheritedFrom).toUpperCase()}</Text> : null}
            </Text>
            <Text style={st.histMeta}>
              {showDate(event.StatusDate)}
              {event.ChallanNo ? ` · Ch ${event.ChallanNo}` : ''}
              {event.AgainstChallanNo ? ` ← ${event.AgainstChallanNo}` : ''}
              {event.MillName ? ` · ${event.MillName}` : ''}
              {event.Rate ? ` · ₹${event.Rate}/m` : ''}
            </Text>
            {!!event.LorryCutReason && <Text style={[st.histMeta, { color: T.purple }]}>✂ {event.LorryCutReason}</Text>}
            {!!event.Remarks && <Text style={st.histMeta}>“{event.Remarks}”</Text>}
            {!!event.CreatedBy && <Text style={st.histBy}>by {event.CreatedBy}{event.Source === 'LEGACY' ? ' · old status screen' : ''}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Date → status chips (like "29/09/26 Sent for job → 30/09/26 Dying"), oldest first. */
function StatusTrail({ history, inherited }: { history: DyeEvent[]; inherited: DyeEvent[] }) {
  const events = [...inherited, ...history];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.trail}>
      {events.map((event, idx) => {
        const color = STATUS_COLORS[event.Status] ?? T.muted;
        const old = idx < inherited.length;
        return (
          <View key={`${event.Id}-${idx}`} style={st.trailItem}>
            {idx > 0 && <Icon name="arrow-forward" size={11} color={T.muted} style={{ marginHorizontal: 2 }} />}
            <View style={[st.trailChip, { borderColor: color, backgroundColor: `${color}14` }, old && { opacity: 0.55 }]}>
              <Text style={st.trailDate}>{chipDate(event.StatusDate)}</Text>
              <Text style={[st.trailStatus, { color }]}>{event.Status}{event.IsRework ? ' ↻' : ''}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function SmallBtn({ icon, label, active, onPress }: { icon: any; label: string; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.smallBtn, active && { borderColor: T.copper, backgroundColor: `${T.copper}18` }]}>
      <Icon name={icon} size={13} color={active ? T.copper : T.ink} />
      <Text style={[st.smallBtnText, active && { color: T.copper }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------------------------- */

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: T.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18,
    height: '92%',
  },
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
  colourCard: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
    borderRadius: 12, padding: 10, marginBottom: 10,
  },
  colourHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  colourName: { fontSize: 13.5, fontWeight: '900', color: T.ink },
  colourMeta: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 1 },

  lotRow: {
    borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 8, marginTop: 4,
  },
  lotTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lotTitle: { fontSize: 12, fontWeight: '800', color: T.ink },
  lotQty: { fontSize: 11, fontWeight: '600', color: T.muted },
  lotMeta: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  lotActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7, marginLeft: 24 },

  smallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: T.border, borderRadius: 7,
    paddingHorizontal: 8, paddingVertical: 4, backgroundColor: T.sub,
  },
  smallBtnText: { fontSize: 10.5, fontWeight: '800', color: T.ink },

  splitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    borderWidth: 1, borderStyle: 'dashed', borderColor: `${T.blue}66`, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  splitBtnText: { fontSize: 11, fontWeight: '700', color: T.blue, flex: 1 },

  form: {
    marginTop: 8, marginLeft: 24, padding: 10,
    borderWidth: 1, borderColor: `${T.copper}55`, borderRadius: 10, backgroundColor: T.sub,
  },
  formLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted, marginTop: 8, marginBottom: 4 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: T.border, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5, backgroundColor: T.surface,
  },
  pillText: { fontSize: 11, fontWeight: '700', color: T.ink },
  pillSm: {
    borderWidth: 1, borderColor: T.border, borderRadius: 7,
    paddingHorizontal: 7, paddingVertical: 4, backgroundColor: T.surface, maxWidth: 200,
  },
  pillSmText: { fontSize: 10.5, fontWeight: '700', color: T.ink },
  reworkNote: { fontSize: 10.5, fontWeight: '700', color: T.amber, marginTop: 6 },
  row2: { flexDirection: 'row', gap: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateArrow: {
    width: 30, height: 34, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface,
  },
  input: {
    borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface,
    paddingHorizontal: 10, height: 34, fontSize: 12.5, fontWeight: '600', color: T.ink,
  },
  formError: { color: T.red, fontSize: 11.5, fontWeight: '700', marginTop: 8 },
  formBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  cancelBtn: {
    borderWidth: 1, borderColor: T.border, borderRadius: 8,
    paddingHorizontal: 12, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface,
  },
  cancelText: { fontSize: 12, fontWeight: '800', color: T.ink },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.green, borderRadius: 8, paddingHorizontal: 14, height: 34,
  },
  saveText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  history: { marginTop: 8, marginLeft: 24 },
  histRow: { flexDirection: 'row', gap: 8 },
  histRail: { alignItems: 'center', width: 14 },
  histLine: { flex: 1, width: 2, backgroundColor: T.border, marginTop: 2 },
  histTitle: { fontSize: 11.5, fontWeight: '800', color: T.ink },
  histMeta: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  histBy: { fontSize: 9.5, fontWeight: '600', color: T.muted, marginTop: 1, fontStyle: 'italic' },
  reworkTag: { fontSize: 9, fontWeight: '900', color: T.amber },

  letter: { alignItems: 'center', justifyContent: 'center' },
  letterText: { color: '#fff', fontWeight: '900' },

  // single / multiple lot entry
  lotHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  toggle: {
    flexDirection: 'row', borderWidth: 1, borderColor: T.border, borderRadius: 8,
    overflow: 'hidden', backgroundColor: T.surface,
  },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5 },
  toggleBtnOn: { backgroundColor: T.copper },
  toggleText: { fontSize: 10.5, fontWeight: '800', color: T.ink },
  toggleTextOn: { color: '#fff' },
  inheritNote: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 4, marginBottom: 2 },
  inheritTag: { fontSize: 9, fontWeight: '900', color: T.blue },
  multiBox: {
    marginTop: 6, padding: 8, borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface,
  },
  pasteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  pasteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 10,
    borderRadius: 8, backgroundColor: T.blue,
  },
  pasteBtnText: { color: '#fff', fontSize: 11.5, fontWeight: '900' },
  multiHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  multiHeadText: { fontSize: 9.5, fontWeight: '900', color: T.muted, textTransform: 'uppercase' },
  multiRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  multiIdx: { width: 18, fontSize: 11, fontWeight: '900', color: T.muted, textAlign: 'center' },
  rowDel: { width: 26, height: 34, alignItems: 'center', justifyContent: 'center' },
  multiFoot: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4 },
  linkBtnText: { fontSize: 11, fontWeight: '800', color: T.blue },
  multiTotal: { flex: 1, textAlign: 'right', fontSize: 10.5, fontWeight: '800', color: T.ink, minWidth: 120 },
  alsoPill: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 240 },
  lockedInput: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.alt },
  lockedText: { flex: 1, fontSize: 12.5, fontWeight: '800', color: T.ink },

  // status trail chips
  trail: { alignItems: 'center', paddingLeft: 24, paddingTop: 6, paddingRight: 8 },
  trailItem: { flexDirection: 'row', alignItems: 'center' },
  trailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3,
  },
  trailDate: { fontSize: 10, fontWeight: '800', color: T.ink },
  trailStatus: { fontSize: 10, fontWeight: '900' },
});

