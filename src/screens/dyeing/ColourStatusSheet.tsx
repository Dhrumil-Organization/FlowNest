// FILE: src/screens/dyeing/ColourStatusSheet.tsx
// Status sheet opened from a Priority card's "Status" button.
//
// SHADE-WISE (like the old status sheet) — NOT lot-wise. Every shade card:
//
//   Pink                                   ● Dying
//   ┌ LOT NO. ─────────────────────────────────────────┐
//   │ [Select Outward 🔍] [Lot No.     ] [Add]          │   <- OutwardLotSection
//   │ Outward No. | Lot No.                             │
//   │ 00035/9     | 3365                            ✎   │
//   │ 00038/9     | 3378                            ✎   │
//   └───────────────────────────────────────────────────┘
//   [Sent for job] [Dying] [Finish] [Job inward]          <- shade status
//   (29/09/26 Sent for job) → (30/09/26 Dying)            <- status with date
//
// - Lot No. block: outward help (/dyeing/outward_details) + lot no. + Add
//   (/dyeing/save_outward_details). Saved outward + lot no. shows in the table,
//   ✎ edits it with the same save API.
// - Status: tap a status -> Save -> /dyeing/save_status (same API as before)
//   for THIS shade only (its own OrderSrNo / ShdCode / AllocationId), dated
//   today. The status goes on all of the shade's lots (full qty); a shade
//   without lots gets one lot created from its qty, with its outward lot no.
//   Each shade has its own status: shade 1 can have lots + status, shade 2
//   only a status.
// - Chips = the shade's status history with date (append-only, from browse
//   `colourHistory`). No qty anywhere.
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
  View,
} from 'react-native';
import { DyeingService, isSaved, messageOf } from './dyeingApi';
import {
  DyeEvent,
  LotEntry,
  num,
  parseAnyDate,
  PriorityChart,
  PriorityShade,
  qtyLabel,
  SaveStatusPayload,
  ShadeStatus,
  STATUS_COLORS,
  STATUS_LETTER,
  todayISO,
} from './dyeingModel';
import { chipDate, groupOutwardsByShade, OutwardRow, toOutwardRows } from './dyeingOutward';
import { OutwardLotSection } from './OutwardLotSection';

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

/** Shade status buttons (same 4 statuses as the old sheet). */
const SHADE_STATUSES: ShadeStatus[] = ['Sent for job', 'Dying', 'Finish', 'Job inward'];

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
      return String(a.CreatedAt ?? '').localeCompare(String(b.CreatedAt ?? ''));
    })
    .filter((e) => {
      const k = `${parseAnyDate(e.StatusDate)}|${e.Status}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
};

export function ColourStatusSheet({
  visible, chart, perms, prpGroup, yearNo, onClose, onSaved,
}: Props) {
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
      setToast(null);
      setOutwards([]);
      setOutError(null);
      return;
    }
    loadOutwards();
  }, [visible, loadOutwards]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const outwardGroups = useMemo(
    () => groupOutwardsByShade(outwards, chart?.shades ?? []),
    [outwards, chart?.shades],
  );

  const afterStatusSave = useCallback(async (message: string) => {
    setToast(message);
    await onSaved();
  }, [onSaved]);

  // outward lot saved -> re-fetch the outward list (table) AND re-browse
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
            {/* outward lines without shade info on a multi-shade chart — shown once */}
            {outwardGroups.unmatched.length > 0 && (
              <View style={st.shadeCard}>
                <OutwardLotSection
                  title="Lot No. — all shades"
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
              const shadeOutwards = outwardGroups.byShade[sKey] ?? [];
              const showOutward = shadeOutwards.length > 0 || outwardGroups.unmatched.length === 0;
              return (
                <ShadeCard
                  key={sKey}
                  chart={chart}
                  shade={shade}
                  perms={perms}
                  prpGroup={prpGroup}
                  yearNo={yearNo}
                  outwardLotNos={[...shadeOutwards, ...outwardGroups.unmatched].map((r) => r.lotNo).filter(Boolean)}
                  outward={showOutward ? (
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
                  ) : null}
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
/*  One shade: name + Lot No. block + status buttons + status/date chips       */
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
  const current = shade.Status;
  const [picked, setPicked] = useState<ShadeStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trail = useMemo(() => shadeTrail(shade), [shade]);

  // browse refreshed -> drop the pending pick
  useEffect(() => { setPicked(null); setError(null); }, [current, trail.length]);

  const save = async () => {
    if (!picked || saving) return;
    setError(null);
    // /dyeing/save_status — ONLY this shade (its own OrderSrNo / ShdCode),
    // dated today, full qty (Qty null / lot qty).
    const savedLots = shade.lots.filter((l) => !l.virtual && l.LotId != null);
    let lots: LotEntry[];
    if (savedLots.length) {
      // the shade's status = the same status on every lot of the shade
      lots = savedLots.map((l) => ({ LotId: l.LotId, LotNo: l.LotNo, LotQty: num(l.LotQty), Qty: num(l.LotQty) }));
    } else {
      // no lot yet -> backend creates one from the shade qty, with the outward lot no.
      const lotNo = outwardLotNos[0] ?? '';
      lots = [{ LotId: null, LotNo: lotNo, LotQty: num(shade.AllocationQty), Qty: num(shade.AllocationQty) }];
    }
    if (picked !== 'Sent for job' && lots.some((l) => !String(l.LotNo || '').trim())) {
      return setError('Lot No. is required from Dying onwards — add it above (Select Outward + Lot No.).');
    }
    if (lots.some((l) => !(num(l.Qty) > 0))) {
      return setError('Shade qty is 0 — cannot save status.');
    }
    const first = lots[0];
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
      LotId: first.LotId,
      LotNo: first.LotNo,
      LotQty: num(first.LotQty),
      Status: picked,
      StatusDate: todayISO(),
      Qty: num(first.Qty),
      LorryCutReason: null,
      Remarks: null,
      ChallanNo: null,
      AgainstChallanNo: null,
      MillName: null,
      Rate: null,
      ...(lots.length > 1 ? { Lots: lots, SplitFromLotId: null } : {}),
    };
    setSaving(true);
    try {
      console.log('[Dyeing] save_status request ->', payload);
      const response: any = await DyeingService.saveStatus(payload);
      console.log('[Dyeing] save_status response ->', response?.data ?? response);
      if (!isSaved(response)) throw new Error(messageOf(response, 'Unable to save status.'));
      await onSaved(`${shade.ShdName} → ${picked}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={st.shadeCard}>
      <View style={st.shadeHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.shadeName} numberOfLines={1}>{shade.ShdName}</Text>
          <Text style={st.shadeMeta} numberOfLines={1}>
            {shade.ShdCode ? `Code ${shade.ShdCode} · ` : ''}Sr {shade.OrderSrNo} · {qtyLabel(shade.AllocationQty)} m
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

      {/* shade status buttons */}
      <View style={st.statusRow}>
        {SHADE_STATUSES.map((option) => {
          const color = STATUS_COLORS[option];
          const isCurrent = current === option;
          const isPicked = picked === option;
          return (
            <TouchableOpacity
              key={option}
              disabled={!perms.canStatus || saving}
              onPress={() => { setError(null); setPicked(isPicked || isCurrent ? null : option); }}
              style={[
                st.statusBtn,
                { borderColor: isPicked || isCurrent ? color : T.border },
                isCurrent && { backgroundColor: `${color}22` },
                isPicked && { backgroundColor: color },
                !perms.canStatus && { opacity: isCurrent ? 1 : 0.5 },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[st.statusBtnText, { color: isPicked ? '#fff' : isCurrent ? color : T.ink }]}
                numberOfLines={1}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!!picked && (
        <View style={st.confirmRow}>
          <Text style={st.confirmText} numberOfLines={2}>
            Set <Text style={{ color: STATUS_COLORS[picked], fontWeight: '900' }}>{picked}</Text> for {shade.ShdName}?
          </Text>
          <TouchableOpacity onPress={() => setPicked(null)} style={st.cancelBtn} disabled={saving}>
            <Text style={st.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={save} style={[st.saveBtn, saving && { opacity: 0.6 }]} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="check" size={15} color="#fff" />}
            <Text style={st.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!error && <Text style={st.formError}>{error}</Text>}

      {/* status with date */}
      {trail.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.trail}>
          {trail.map((event, idx) => {
            const color = STATUS_COLORS[event.Status] ?? T.muted;
            return (
              <View key={`${event.Id}-${idx}`} style={st.trailItem}>
                {idx > 0 && <Icon name="arrow-forward" size={12} color={T.muted} style={{ marginHorizontal: 3 }} />}
                <View style={[st.trailChip, { borderColor: color, backgroundColor: `${color}14` }]}>
                  <Text style={st.trailDate}>{chipDate(event.StatusDate) || '—'}</Text>
                  <Text style={[st.trailStatus, { color }]}>{event.Status}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={st.noTrail}>No status yet</Text>
      )}
    </View>
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

  statusRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  statusBtn: {
    flex: 1, height: 36, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 8, backgroundColor: T.surface, paddingHorizontal: 2,
  },
  statusBtnText: { fontSize: 11, fontWeight: '800' },

  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  confirmText: { flex: 1, fontSize: 11.5, fontWeight: '700', color: T.ink },
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
