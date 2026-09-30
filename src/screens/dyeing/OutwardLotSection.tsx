// FILE: src/screens/dyeing/OutwardLotSection.tsx
// "Outward · Lot No." block of ONE shade inside the Priority status sheet.
//
//   [ Select Outward 🔍 ] [ Lot No. ] [ + Add ]
//   ┌──────────────────────┬──────────┬───┐
//   │ Outward No.          │ Lot No.  │   │   <- GET /dyeing/lotnos
//   │ OutNo · OutDate      │ SR-4310  │ ✎ │      ?prptype&chartno&yearno&orderuid&ordersrno
//   └──────────────────────┴──────────┴───┘
//
// Flow
//   1. "Select Outward" opens the help = GET /dyeing/outward_details
//      ?prptype&chartno&yearno  (the chart's outward lines).
//   2. Inside the help an "Advance" button opens a NESTED help =
//      GET /dyeing/outward_details_all?prptype&yearno&orderuid&ordersrno
//      (every outward line of this shade's SO line). Rows there are outwards
//      too and are selected the same way ("‹ Back" returns to the first help).
//   3. Selected outward + Lot No. -> Add ->
//      /dyeing/save_outward_details?prptype&chartno&yearno&uid&srno&lotno
//   4. After the save the table below reloads from /dyeing/lotnos.
//   5. ✎ on a table row -> edit ONLY the lot no. -> the same
//      /dyeing/save_outward_details -> table reloads.
//   6. 🗑 on a table row -> confirm -> POST /dyeing/remove_lotno
//      { uid, srno, chartno, shdcode, prptype, yearno } (uid + srno from /dyeing/lotnos)
//      -> table + help reload (the outward becomes selectable again).
//   List, help, advance, add, update and remove all send THIS shade's
//   `shdcode` + `shdname`.
//   LOT QTY (m) = the outward qty of that lot. It is entered with the lot no.
//   (pre-filled with the outward's balance / qty), saved with it in the lot
//   table (backend FAMSOAllocationPriorityOutwardLot) and edited with it (✎).
//   Daily Update / Mill Hub count metres from these lot qtys.
//   SHADE-WISE: every shade has its OWN block (like its status) — the table
//   shows only this shade's lot nos. (split on `soshdcode`).
//   OUTWARD on screen = uuid + usrno (unique row). Save / remove send
//   `uid` + `srno` = the API's own `uid` / `srno` of the picked row.
//   ONE OUTWARD = ONE LOT PER SHADE. Help / Advance list every outward. An
//   outward already added in THIS shade (matched on the outward line uuid +
//   usrno — from the table, or the help row's own LotId for this shade) shows
//   "Added · Lot X", can't be picked again here, and Add refuses it (edit it
//   in the table instead). ANOTHER shade can still take the same outward —
//   e.g. outward DC-4101 added in Pink can't be added to Pink again, but Black
//   can add DC-4101. The backend refuses the duplicate too (mode = 'add').

import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { asNum, DyeingService, messageOf } from './dyeingApi';
import { qtyLabel, showDate } from './dyeingModel';
import { OutwardRow, outwardSaveOk, rowShadeMatch, sameOutward } from './dyeingOutward';

export type OutwardState = {
  rows: OutwardRow[];
  loading: boolean;
  error: string | null;
};

type Props = {
  title?: string;
  note?: string | null; // e.g. "Same SO line as Black"
  chartNo: string;
  orderUId?: string | number; // SO uid of the card (lot table key)
  parCode?: string;
  shadeQty?: number; // shade (order) qty — shown against the lot total
  orderSrNo: number;
  shdCode: string; // shade code of this shade — sent as `shdcode` on add / update / remove
  shdName?: string; // shade name of this shade (matching rows that carry only a name)
  ownsUntagged?: boolean; // rows without shade info belong to this shade (only shade of its SO line)
  prpGroup: string;
  yearNo: string | number;
  help: OutwardState; // outward_details (chart)
  table: OutwardState; // lotnos (chart + SO line)
  loadAdvance: () => Promise<OutwardRow[]>; // outward_details_all (SO line)
  challanOf: (row: OutwardRow) => string;
  canEdit: boolean;
  onRetry: () => void;
  onSaved: (message: string) => Promise<void> | void;
};

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
// payload uid / srno = the response's own `uid` / `srno` of the row
const canSaveRow = (r: OutwardRow) => !!r.saveUid && !!r.saveSrNo;
/** Default lot qty for a picked outward: its balance, else its qty. */
const defaultQtyOf = (r: OutwardRow) => {
  const q = r.balance != null && r.balance > 0 ? r.balance : r.qty;
  return q != null && q > 0 ? String(Math.round(q * 1000) / 1000) : '';
};
/**
 * Outward no. shown on screen = API `OutNo`; else the challan no. when the
 * API sent one. The internal UId / SrNo fallback is NEVER shown.
 */
const isIdFallback = (text: string, r: OutwardRow) =>
  !text || text === r.uid || text === `${r.uid}/${r.srno}`;
export const outNoOf = (r: OutwardRow, challanOf: (row: OutwardRow) => string) => {
  if (r.outNo) return r.outNo;
  const c = challanOf(r);
  return isIdFallback(c, r) ? '—' : c;
};
/** "OutDate · accname" line of an outward (no uid). */
const outDateOf = (r: OutwardRow) => (r.OutDate ? showDate(r.OutDate) : r.date ? showDate(r.date) : '');
const accOf = (r: OutwardRow) => r.accName || r.mill || '';

/** '' / invalid -> null, else the positive number. */
const parseQty = (text: string): number | null | 'BAD' => {
  const t = String(text ?? '').trim();
  if (!t) return null;
  const n = Number(t.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : 'BAD';
};

export function OutwardLotSection({
  title = 'Outward · Lot No.', note, chartNo, orderUId, parCode = '', shadeQty, orderSrNo, shdCode, shdName = '', ownsUntagged = true, prpGroup, yearNo, help, table, loadAdvance,
  challanOf, canEdit, onRetry, onSaved,
}: Props) {
  const [selected, setSelected] = useState<OutwardRow | null>(null);
  const [lotNo, setLotNo] = useState('');
  const [lotQty, setLotQty] = useState('');
  const [editQty, setEditQty] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editLot, setEditLot] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null); // 'ADD' or a row key
  const [confirmKey, setConfirmKey] = useState<string | null>(null); // row waiting for remove confirmation
  const [error, setError] = useState<string | null>(null);

  const saved = useMemo(() => table.rows.filter((r) => r.lotNo), [table.rows]);
  const labelOf = useCallback((r: OutwardRow) => outNoOf(r, challanOf), [challanOf]);
  const lotTotal = useMemo(() => saved.reduce((sum, r) => sum + (r.lotQty ?? 0), 0), [saved]);
  const missingQty = useMemo(() => saved.filter((r) => !(r.lotQty != null && r.lotQty > 0)).length, [saved]);
  /**
   * Lot already saved on this outward row FOR THIS SHADE ('' = free).
   * Table (this shade's /dyeing/lotnos rows) is the truth after every save —
   * matched on the outward line (uuid + usrno). The help row's
   * own lot counts when the row is this shade's (or untagged and this shade
   * owns untagged rows).
   */
  const lotOf = useCallback((row: OutwardRow) => {
    const hit = saved.find((r) => sameOutward(r, row));
    if (hit) return hit.lotNo;
    // help row asked with THIS shade's code: backend sends LotId only for this shade's lot
    if (row.lotId != null && row.lotNo) return row.lotNo;
    if (!row.lotNo) return '';
    const m = rowShadeMatch(row, { ShdCode: shdCode, ShdName: shdName });
    return m === true || (m === null && ownsUntagged) ? row.lotNo : '';
  }, [saved, shdCode, shdName, ownsUntagged]);

  // reloaded lists -> a selected outward that got a lot meanwhile is dropped
  useEffect(() => {
    if (selected && lotOf(selected)) setSelected(null);
  }, [lotOf, selected]);

  const save = async (row: OutwardRow, lot: string, qtyText: string, mode: 'ADD' | 'EDIT') => {
    const clean = lot.trim().toUpperCase();
    if (!clean) { setError('Enter Lot No.'); return false; }
    if (!canSaveRow(row)) { setError('This outward has no uid / srno — cannot save.'); return false; }
    const parsed = parseQty(qtyText);
    if (parsed === 'BAD') { setError('Lot Qty must be a number greater than 0.'); return false; }
    // empty qty -> the outward's own qty (backend does the same); unknown -> ask
    const qty = parsed ?? (row.qty != null && row.qty > 0 ? row.qty : null);
    if (qty == null) { setError('Enter Lot Qty (m).'); return false; }
    setError(null);
    setSavingKey(mode === 'ADD' ? 'ADD' : row.key);
    try {
      const params = {
        prptype: prpGroup,
        chartno: row.chartNo || chartNo,
        yearno: yearNo,
        uid: row.saveUid, // API `uid` of the picked row (not uuid)
        srno: row.saveSrNo, // API `srno` of the picked row
        uuid: row.payloadUuid, // API `uuid` as received
        usrno: row.payloadUsrno, // API `usrno` as received
        lotno: clean,
        mode: (mode === 'ADD' ? 'add' : 'edit') as 'add' | 'edit', // add = refuse if this shade already has this outward
        lotqty: qty, // LOT QTY (m) = outward qty of this lot
        lotchartno: chartNo, // chart of THIS shade (the card) — lot table key
        orderuid: orderUId ?? row.saveUid, // SO line of THIS shade
        ordersrno: orderSrNo,
        parcode: parCode,
        shdcode: String(shdCode ?? '').trim(), // THIS shade's code
        shdname: String(shdName ?? '').trim(), // THIS shade's name
      };
      console.log('[Dyeing] save_outward_details request ->', params);
      const response: any = await DyeingService.saveOutwardDetails(params);
      console.log('[Dyeing] save_outward_details response ->', response?.data ?? response);
      if (!outwardSaveOk(response)) throw new Error(messageOf(response, 'Unable to save lot no.'));
      await onSaved(`${labelOf(row)} → Lot ${clean} · ${qtyLabel(qty)} m ${mode === 'ADD' ? 'added' : 'updated'}`);
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save lot no.');
      return false;
    } finally {
      setSavingKey(null);
    }
  };

  const add = async () => {
    if (savingKey) return;
    if (!selected) { setError('Select outward first.'); return; }
    const existing = lotOf(selected);
    if (existing) {
      setError(`${labelOf(selected)} is already added in ${shdName || 'this shade'} (Lot ${existing}) — the same outward can't be added twice in one shade. Edit it in the table.`);
      setSelected(null);
      return;
    }
    if (await save(selected, lotNo, lotQty, 'ADD')) {
      setSelected(null);
      setLotNo('');
      setLotQty('');
    }
  };

  /** POST /dyeing/remove_lotno — uid + srno of the /dyeing/lotnos row. */
  const remove = async (row: OutwardRow) => {
    if (savingKey) return;
    if (!canSaveRow(row)) { setError('This outward has no UId / SrNo — cannot remove.'); return; }
    setError(null);
    setSavingKey(row.key);
    try {
      const payload = {
        uid: asNum(row.saveUid), // API `uid` of the row (not uuid)
        srno: asNum(row.saveSrNo),
        uuid: row.payloadUuid, // API `uuid` as received
        usrno: row.payloadUsrno, // API `usrno` as received
        chartno: row.chartNo || chartNo,
        lotchartno: chartNo, // chart of THIS shade (lot table key)
        orderuid: orderUId ?? row.saveUid,
        ordersrno: orderSrNo,
        lotid: row.lotId ?? undefined, // lot row id when the lot is in the lot table
        shdcode: String(shdCode ?? '').trim(), // THIS shade's code (delete is shade-wise)
        shdname: String(shdName ?? '').trim(), // THIS shade's name
        prptype: prpGroup,
        yearno: asNum(yearNo),
      };
      console.log('[Dyeing] remove_lotno request ->', payload);
      const response: any = await DyeingService.removeLotNo(payload);
      console.log('[Dyeing] remove_lotno response ->', response?.data ?? response);
      if (!outwardSaveOk(response)) throw new Error(messageOf(response, 'Unable to remove lot no.'));
      setConfirmKey(null);
      if (editKey === row.key) setEditKey(null);
      await onSaved(`${labelOf(row)} → Lot ${row.lotNo} removed`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to remove lot no.');
    } finally {
      setSavingKey(null);
    }
  };

  const commitEdit = async (row: OutwardRow) => {
    if (savingKey) return;
    const sameLot = editLot.trim().toUpperCase() === row.lotNo.trim().toUpperCase();
    const q = parseQty(editQty);
    const sameQty = q !== 'BAD' && (q ?? null) === (row.lotQty ?? null);
    if (sameLot && sameQty) { setEditKey(null); return; }
    if (await save(row, editLot, editQty, 'EDIT')) setEditKey(null);
  };

  return (
    <View style={st.box}>
      <View style={st.headRow}>
        <Icon name="local-shipping" size={13} color={T.copper} />
        <Text style={st.head} numberOfLines={1}>{title}</Text>
        {(table.loading || help.loading) && <ActivityIndicator size="small" color={T.copper} style={{ marginLeft: 2 }} />}
        <View style={{ flex: 1 }} />
        {!table.loading && !table.error && (
          <Text style={st.count}>
            {saved.length} lot{saved.length === 1 ? '' : 's'}{saved.length ? ` · ${qtyLabel(lotTotal)} m` : ''}
          </Text>
        )}
        <TouchableOpacity onPress={onRetry} hitSlop={HIT} disabled={table.loading} style={{ marginLeft: 6 }}>
          <Icon name="refresh" size={15} color={table.loading ? T.border : T.muted} />
        </TouchableOpacity>
      </View>
      {!!note && <Text style={st.note}>{note}</Text>}

      {canEdit && (
        <View style={st.entryRow}>
          <TouchableOpacity
            style={[st.picker, !!selected && { borderColor: T.copper }]}
            onPress={() => { setError(null); setHelpOpen(true); }}
            disabled={!!savingKey}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[st.pickerText, !selected && { color: T.muted }]} numberOfLines={1}>
                {selected ? labelOf(selected) : 'Select Outward'}
              </Text>
              {!!selected && (
                <Text style={st.pickerSub} numberOfLines={1}>
                  {[outDateOf(selected),
                    accOf(selected),
                    selected.qty != null ? `Out ${qtyLabel(selected.qty)} m` : '',
                    selected.balance != null && selected.qty != null && selected.balance !== selected.qty ? `Bal ${qtyLabel(selected.balance)} m` : '',
                  ].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
            {selected ? (
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={HIT}>
                <Icon name="close" size={15} color={T.muted} />
              </TouchableOpacity>
            ) : (
              <Icon name="search" size={15} color={T.muted} />
            )}
          </TouchableOpacity>
          <TextInput
            value={lotNo}
            onChangeText={setLotNo}
            style={st.input}
            placeholder="Lot No."
            placeholderTextColor={T.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
            editable={!savingKey}
          />
          <TextInput
            value={lotQty}
            onChangeText={setLotQty}
            style={[st.input, st.qtyInput]}
            placeholder="Lot Qty (m)"
            placeholderTextColor={T.muted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={add}
            editable={!savingKey}
          />
          <TouchableOpacity onPress={add} disabled={!!savingKey} style={[st.addBtn, !!savingKey && { opacity: 0.6 }]}>
            {savingKey === 'ADD'
              ? <ActivityIndicator size="small" color="#fff" />
              : <Icon name="add" size={16} color="#fff" />}
            <Text style={st.addText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!error && <Text style={st.error}>{error}</Text>}

      {/* table — /dyeing/lotnos */}
      {table.error ? (
        <TouchableOpacity onPress={onRetry} style={st.loadErr}>
          <Icon name="refresh" size={13} color={T.red} />
          <Text style={st.loadErrText} numberOfLines={2}>{table.error} — tap to retry</Text>
        </TouchableOpacity>
      ) : saved.length > 0 ? (
        <View style={st.table}>
          <View style={[st.tr, st.th]}>
            <Text style={[st.thText, { flex: 1.3 }]}>Outward No.</Text>
            <Text style={[st.thText, { flex: 1 }]}>Lot No.</Text>
            <Text style={[st.thText, st.qtyCol]}>Lot Qty</Text>
            {canEdit && <View style={st.actCellWide} />}
          </View>
          {saved.map((row, i) => {
            const editing = editKey === row.key;
            const confirming = confirmKey === row.key;
            const busy = savingKey === row.key;
            return (
              <View key={row.key} style={[st.tr, i < saved.length - 1 && st.trLine, editing && st.trEdit, confirming && st.trRemove]}>
                <View style={{ flex: 1.3, minWidth: 0 }}>
                  <Text style={st.tdText} numberOfLines={1}>{labelOf(row)}</Text>
                  <Text style={st.tdSub} numberOfLines={1}>
                    {[outDateOf(row), row.qty != null ? `Out ${qtyLabel(row.qty)} m` : '']
                      .filter(Boolean).join(' · ')}
                  </Text>
                  {!!accOf(row) && <Text style={st.tdSub} numberOfLines={1}>{accOf(row)}</Text>}
                </View>
                <View style={[st.lotCell, { flex: 1 }]}>
                  {editing ? (
                    <TextInput
                      value={editLot}
                      onChangeText={setEditLot}
                      style={st.editInput}
                      autoFocus
                      autoCapitalize="characters"
                      autoCorrect={false}
                      placeholder="Lot No."
                      placeholderTextColor={T.muted}
                      returnKeyType="done"
                      onSubmitEditing={() => commitEdit(row)}
                      editable={!busy}
                    />
                  ) : confirming ? (
                    <Text style={st.removeAsk} numberOfLines={2}>Remove Lot {row.lotNo}?</Text>
                  ) : (
                    <Text style={st.lotText} numberOfLines={1}>{row.lotNo}</Text>
                  )}
                </View>
                <View style={[st.qtyCol, st.qtyCell]}>
                  {editing ? (
                    <TextInput
                      value={editQty}
                      onChangeText={setEditQty}
                      style={[st.editInput, { textAlign: 'right' }]}
                      keyboardType="decimal-pad"
                      placeholder="m"
                      placeholderTextColor={T.muted}
                      returnKeyType="done"
                      onSubmitEditing={() => commitEdit(row)}
                      editable={!busy}
                    />
                  ) : row.lotQty != null && row.lotQty > 0 ? (
                    <Text style={st.qtyText} numberOfLines={1}>{qtyLabel(row.lotQty)}</Text>
                  ) : (
                    <Text style={st.qtyMissing} numberOfLines={1}>set qty</Text>
                  )}
                </View>
                {canEdit && (
                  <View style={st.actCellWide}>
                    {confirming ? (
                      <>
                        <TouchableOpacity onPress={() => remove(row)} disabled={busy} hitSlop={HIT} style={st.iconBtn}>
                          {busy ? <ActivityIndicator size="small" color={T.red} /> : <Icon name="check" size={18} color={T.red} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setConfirmKey(null)} disabled={busy} hitSlop={HIT} style={st.iconBtn}>
                          <Icon name="close" size={18} color={T.muted} />
                        </TouchableOpacity>
                      </>
                    ) : editing ? (
                      <>
                        <TouchableOpacity onPress={() => commitEdit(row)} disabled={busy} hitSlop={HIT} style={st.iconBtn}>
                          {busy ? <ActivityIndicator size="small" color={T.green} /> : <Icon name="check" size={18} color={T.green} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setEditKey(null); setError(null); }} disabled={busy} hitSlop={HIT} style={st.iconBtn}>
                          <Icon name="close" size={18} color={T.muted} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => {
                            setError(null); setConfirmKey(null); setEditKey(row.key); setEditLot(row.lotNo);
                            setEditQty(row.lotQty != null && row.lotQty > 0 ? String(row.lotQty) : defaultQtyOf(row));
                          }}
                          disabled={!!savingKey || !canSaveRow(row)}
                          hitSlop={HIT}
                          style={st.iconBtn}
                        >
                          <Icon name="edit" size={16} color={T.blue} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => { setError(null); setEditKey(null); setConfirmKey(row.key); }}
                          disabled={!!savingKey || !canSaveRow(row)}
                          hitSlop={HIT}
                          style={st.iconBtn}
                        >
                          <Icon name="delete-outline" size={17} color={T.red} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
          <View style={[st.tr, st.totalRow]}>
            <Text style={[st.totalText, { flex: 1 }]} numberOfLines={2}>
              Total lot qty{shadeQty ? ` · shade ${qtyLabel(shadeQty)} m` : ''}
              {missingQty ? ` · ${missingQty} lot${missingQty === 1 ? '' : 's'} without qty` : ''}
            </Text>
            <Text style={[st.qtyCol, st.totalQty]}>{qtyLabel(lotTotal)}</Text>
            {canEdit && <View style={st.actCellWide} />}
          </View>
        </View>
      ) : !table.loading ? (
        <Text style={st.empty}>No lot no. added yet — select an outward, enter its lot no. + lot qty and add.</Text>
      ) : null}

      <OutwardHelp
        visible={helpOpen}
        chartNo={chartNo}
        orderSrNo={orderSrNo}
        help={help}
        loadAdvance={loadAdvance}
        lotOf={lotOf}
        challanOf={challanOf}
        onClose={() => setHelpOpen(false)}
        onPick={(row) => { setHelpOpen(false); setSelected(row); setLotQty(defaultQtyOf(row)); setError(null); }}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Help: outward_details  ->  [Advance]  ->  nested outward_details_all       */
/* -------------------------------------------------------------------------- */

function OutwardHelp({
  visible, chartNo, orderSrNo, help, loadAdvance, lotOf, challanOf, onClose, onPick,
}: {
  visible: boolean;
  chartNo: string;
  orderSrNo: number;
  help: OutwardState;
  loadAdvance: () => Promise<OutwardRow[]>;
  lotOf: (row: OutwardRow) => string;
  challanOf: (row: OutwardRow) => string;
  onClose: () => void;
  onPick: (row: OutwardRow) => void;
}) {
  const { width, height } = useWindowDimensions();
  const [q, setQ] = useState('');
  const [level, setLevel] = useState<'main' | 'advance'>('main');
  const [adv, setAdv] = useState<OutwardState>({ rows: [], loading: false, error: null });

  useEffect(() => {
    if (!visible) { setQ(''); setLevel('main'); }
  }, [visible]);

  const openAdvance = async () => {
    setLevel('advance');
    setQ('');
    setAdv({ rows: [], loading: true, error: null });
    try {
      setAdv({ rows: await loadAdvance(), loading: false, error: null });
    } catch (err: any) {
      setAdv({ rows: [], loading: false, error: err?.response?.data?.message || err?.message || 'Unable to load outwards' });
    }
  };

  const state = level === 'main' ? help : adv;
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = query
      ? state.rows.filter((r) => [outNoOf(r, challanOf), outDateOf(r), r.OutDate, accOf(r), r.chartNo, r.lotNo, r.shdName]
        .join(' ').toLowerCase().includes(query))
      : state.rows;
    // open outwards first, outwards that already have a lot last
    return [...base].sort((a, b) => Number(!!lotOf(a)) - Number(!!lotOf(b)));
  }, [state.rows, q, challanOf, lotOf]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={level === 'advance' ? () => setLevel('main') : onClose}>
      <View style={st.helpOverlay}>
        <View style={[st.helpCard, { maxHeight: Math.round(height * 0.86) }, width >= 700 && { maxWidth: 600 }]}>
          <View style={st.helpHead}>
            {level === 'advance' && (
              <TouchableOpacity onPress={() => { setLevel('main'); setQ(''); }} hitSlop={HIT} style={{ marginRight: 8 }}>
                <Icon name="arrow-back" size={20} color={T.ink} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.helpTitle} numberOfLines={1}>{level === 'main' ? 'Select Outward' : 'Advance — all outwards'}</Text>
              <Text style={st.helpSub} numberOfLines={2}>
                {level === 'main'
                  ? `Outwards of chart ${chartNo} · one outward takes one lot per shade`
                  : `Every outward of this SO line (Sr ${orderSrNo}) · one outward takes one lot per shade`}
              </Text>
            </View>
            {level === 'main' && (
              <TouchableOpacity onPress={openAdvance} style={st.advBtn} activeOpacity={0.75}>
                <Icon name="manage-search" size={15} color="#fff" />
                <Text style={st.advText}>Advance</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} hitSlop={HIT} style={{ marginLeft: 10 }}>
              <Icon name="close" size={20} color={T.muted} />
            </TouchableOpacity>
          </View>

          <View style={st.helpSearch}>
            <Icon name="search" size={15} color={T.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search out no, date, party, chart, lot…"
              placeholderTextColor={T.muted}
              style={st.helpSearchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {state.loading ? (
            <View style={st.helpLoading}><ActivityIndicator color={T.copper} /></View>
          ) : state.error ? (
            <TouchableOpacity onPress={level === 'advance' ? openAdvance : undefined} style={[st.loadErr, { margin: 14 }]}>
              <Icon name="error-outline" size={14} color={T.red} />
              <Text style={st.loadErrText}>{state.error}{level === 'advance' ? ' — tap to retry' : ''}</Text>
            </TouchableOpacity>
          ) : (
            <FlatList
              data={list}
              keyExtractor={(r: OutwardRow) => r.key}
              keyboardShouldPersistTaps="handled"
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 14 }}
              ListEmptyComponent={
                <Text style={[st.empty, { textAlign: 'center', marginTop: 16 }]}>
                  {level === 'main' ? 'No outward on this chart — try Advance.' : 'No outward found for this SO line.'}
                </Text>
              }
              renderItem={({ item }: { item: OutwardRow }) => {
                const lot = lotOf(item); // lot of THIS shade -> blocked here only
                const blocked = !!lot || !canSaveRow(item);
                const otherLot = !lot && item.lotNo ? item.lotNo : ''; // taken by another shade -> still selectable
                return (
                  <TouchableOpacity
                    style={[st.helpRow, blocked && { opacity: 0.55 }]}
                    onPress={() => !blocked && onPick(item)}
                    disabled={blocked}
                    activeOpacity={0.6}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.tdText} numberOfLines={1}>{outNoOf(item, challanOf)}</Text>
                      <Text style={st.tdSub} numberOfLines={1}>
                        {[outDateOf(item),
                          accOf(item),
                          item.chartNo && item.chartNo !== chartNo ? `Chart ${item.chartNo}` : '',
                          item.shdName ? item.shdName : '',
                          item.qty != null ? `Out ${qtyLabel(item.qty)} m` : '',
                          item.balance != null && item.qty != null && item.balance !== item.qty ? `Bal ${qtyLabel(item.balance)} m` : '',
                        ].filter(Boolean).join(' · ')}
                      </Text>
                      {!!item.takenBy && <Text style={st.takenBy} numberOfLines={1}>Taken: {item.takenBy}</Text>}
                    </View>
                    {lot ? (
                      <Text style={st.lotBadge} numberOfLines={1}>Added · Lot {lot}</Text>
                    ) : (
                      <>
                        {!!otherLot && (
                          <Text style={st.otherLot} numberOfLines={1}>
                            Lot {otherLot}{item.shdCode ? ` · Shd ${item.shdCode}` : ''}
                          </Text>
                        )}
                        <Icon name="chevron-right" size={18} color={T.muted} />
                      </>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  box: {
    marginTop: 4, marginBottom: 6, padding: 9,
    borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.sub,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 },
  head: { fontSize: 11, fontWeight: '900', color: T.ink, textTransform: 'uppercase', letterSpacing: 0.3, flexShrink: 1 },
  count: { fontSize: 10, fontWeight: '800', color: T.muted },
  note: { fontSize: 10, fontWeight: '600', color: T.muted, marginTop: -3, marginBottom: 6 },

  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  picker: {
    flexGrow: 1.4, flexBasis: 150, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40,
    borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface, paddingHorizontal: 9, paddingVertical: 4,
  },
  pickerText: { fontSize: 12.5, fontWeight: '700', color: T.ink },
  pickerSub: { fontSize: 9.5, fontWeight: '600', color: T.muted },
  input: {
    flexGrow: 1, flexBasis: 90, height: 40, borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface,
    paddingHorizontal: 9, fontSize: 12.5, fontWeight: '700', color: T.ink,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40, paddingHorizontal: 14,
    borderRadius: 8, backgroundColor: T.copper,
  },
  addText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  qtyInput: { flexGrow: 0.8, flexBasis: 84, textAlign: 'right' },
  qtyCol: { width: 70, textAlign: 'right' },
  qtyCell: { alignSelf: 'stretch', justifyContent: 'center', alignItems: 'flex-end', paddingLeft: 6 },
  qtyText: { fontSize: 12, fontWeight: '800', color: T.ink, textAlign: 'right' },
  qtyMissing: { fontSize: 10, fontWeight: '800', color: T.amber, textAlign: 'right' },
  totalRow: { backgroundColor: T.sub, borderTopWidth: 1, borderTopColor: T.border, minHeight: 36 },
  totalText: { fontSize: 10, fontWeight: '700', color: T.muted },
  totalQty: { fontSize: 12, fontWeight: '900', color: T.ink },
  takenBy: { fontSize: 9.5, fontWeight: '700', color: T.blue, marginTop: 1 },
  error: { color: T.red, fontSize: 11.5, fontWeight: '700', marginTop: 6 },

  table: { marginTop: 8, borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 7, minHeight: 44 },
  trLine: { borderBottomWidth: 1, borderBottomColor: T.hair },
  trEdit: { backgroundColor: `${T.blue}10` },
  th: { backgroundColor: T.alt, paddingVertical: 5, minHeight: 0 },
  thText: { fontSize: 9.5, fontWeight: '900', color: T.muted, textTransform: 'uppercase' },
  tdText: { fontSize: 12, fontWeight: '800', color: T.ink },
  tdSub: { fontSize: 9.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  lotCell: { borderLeftWidth: 1, borderLeftColor: T.hair, paddingLeft: 8, alignSelf: 'stretch', justifyContent: 'center', minWidth: 0 },
  lotText: { fontSize: 12.5, fontWeight: '900', color: T.copper },
  editInput: {
    height: 34, borderWidth: 1, borderColor: T.blue, borderRadius: 6, backgroundColor: T.surface,
    paddingHorizontal: 7, fontSize: 12.5, fontWeight: '800', color: T.ink,
  },
  actCell: { width: 32, alignItems: 'center', justifyContent: 'center' },
  actCellWide: { width: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  trRemove: { backgroundColor: `${T.red}0F` },
  removeAsk: { fontSize: 11.5, fontWeight: '800', color: T.red },
  iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 7 },
  loadErr: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  loadErrText: { flex: 1, fontSize: 10.5, fontWeight: '700', color: T.red },

  helpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 14 },
  helpCard: { backgroundColor: T.bg, borderRadius: 14, overflow: 'hidden', width: '100%', maxWidth: 520, alignSelf: 'center' },
  helpHead: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  helpTitle: { fontSize: 14.5, fontWeight: '900', color: T.ink },
  helpSub: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  advBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.blue, borderRadius: 8,
    paddingHorizontal: 10, height: 32, marginLeft: 8,
  },
  advText: { color: '#fff', fontSize: 11.5, fontWeight: '900' },
  helpSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 6, margin: 12, marginBottom: 8, height: 38,
    borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface, paddingHorizontal: 9,
  },
  helpSearchInput: { flex: 1, fontSize: 12.5, color: T.ink, paddingVertical: 0 },
  helpLoading: { paddingVertical: 36, alignItems: 'center' },
  helpRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 10, minHeight: 48,
    borderBottomWidth: 1, borderBottomColor: T.hair,
  },
  otherLot: { fontSize: 10, fontWeight: '700', color: T.muted, maxWidth: 130 },
  lotBadge: {
    fontSize: 10.5, fontWeight: '900', color: T.copper, maxWidth: 120,
    borderWidth: 1, borderColor: `${T.copper}66`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
});
