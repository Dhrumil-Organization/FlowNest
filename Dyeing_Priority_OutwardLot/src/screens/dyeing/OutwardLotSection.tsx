// FILE: src/screens/dyeing/OutwardLotSection.tsx
// "Lot No." block inside a colour of the Priority status sheet:
//
//   [ Select Outward  ▾ ] [ Lot No.   ] [ Add ]
//   ┌──────────────┬──────────┐
//   │ Outward No.  │ Lot No.  │   <- saved outward lot nos (tap ✎ to edit)
//   │ 00035/9      │ 3365     │
//   └──────────────┴──────────┘
//
// 1. "Select Outward" opens a help list (outward_details) of the chart's
//    outward challan lines for this colour.
// 2. Type the mill's lot no. and tap Add  -> save_outward_details (uid, srno, lotno).
// 3. The list is re-fetched; the saved outward + lot no. shows in the table.
// 4. Edit = tap ✎ on a row -> the same outward is pre-selected with its lot no.,
//    change it and tap Update (same save API).
// No qty is entered here.

import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DyeingService, messageOf } from './dyeingApi';
import { qtyLabel, showDate } from './dyeingModel';
import { OutwardRow, outwardSaveOk } from './dyeingOutward';

type Props = {
  title?: string; // default "Lot No."
  chartNo: string;
  prpGroup: string;
  yearNo: string | number;
  rows: OutwardRow[]; // outward lines of this colour (with / without lot no.)
  loading: boolean;
  loadError: string | null;
  canEdit: boolean;
  onRetry: () => void;
  onSaved: (message: string) => Promise<void> | void;
};

export function OutwardLotSection({
  title = 'Lot No.', chartNo, prpGroup, yearNo, rows, loading, loadError, canEdit, onRetry, onSaved,
}: Props) {
  const [selected, setSelected] = useState<OutwardRow | null>(null);
  const [lotNo, setLotNo] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saved = useMemo(() => rows.filter((r) => r.lotNo), [rows]);

  const reset = () => {
    setSelected(null);
    setLotNo('');
    setEditingKey(null);
    setError(null);
  };

  const choose = (row: OutwardRow) => {
    setHelpOpen(false);
    setSelected(row);
    setError(null);
    // an outward that already has a lot no. -> edit it
    if (row.lotNo) {
      setEditingKey(row.key);
      setLotNo(row.lotNo);
    } else {
      setEditingKey(null);
    }
  };

  const startEdit = (row: OutwardRow) => {
    setSelected(row);
    setLotNo(row.lotNo);
    setEditingKey(row.key);
    setError(null);
  };

  const submit = async () => {
    if (saving) return;
    setError(null);
    const lot = lotNo.trim();
    if (!selected) return setError('Select outward (challan) first.');
    if (!selected.uid) return setError('This outward has no UId — cannot save.');
    if (!lot) return setError('Enter Lot No.');
    const dup = saved.find((r) => r.key !== selected.key && r.lotNo.trim().toUpperCase() === lot.toUpperCase());
    if (dup) return setError(`Lot No. ${lot} is already on outward ${dup.challanNo}.`);
    if (editingKey && selected.lotNo.trim() === lot) return setError('Lot No. is unchanged.');

    const params = {
      prptype: prpGroup,
      chartno: chartNo,
      yearno: yearNo,
      uid: selected.uid,
      srno: selected.srno,
      lotno: lot,
    };
    setSaving(true);
    try {
      console.log('[Dyeing] save_outward_details request ->', params);
      const response: any = await DyeingService.saveOutwardDetails(params);
      console.log('[Dyeing] save_outward_details response ->', response?.data ?? response);
      if (!outwardSaveOk(response)) throw new Error(messageOf(response, 'Unable to save lot no.'));
      const wasEdit = !!editingKey;
      const challan = selected.challanNo;
      reset();
      await onSaved(wasEdit ? `Outward ${challan} → Lot ${lot} updated` : `Outward ${challan} → Lot ${lot} added`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save lot no.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={st.box}>
      <View style={st.headRow}>
        <Icon name="local-shipping" size={13} color={T.copper} />
        <Text style={st.head}>{title}</Text>
        {loading && <ActivityIndicator size="small" color={T.copper} style={{ marginLeft: 4 }} />}
      </View>

      {canEdit && (
        <View style={st.entryRow}>
          <TouchableOpacity
            style={[st.picker, editingKey && { borderColor: T.blue }]}
            onPress={() => setHelpOpen(true)}
            disabled={!!editingKey || saving}
            activeOpacity={0.7}
          >
            <Text style={[st.pickerText, !selected && { color: T.muted }]} numberOfLines={1}>
              {selected ? selected.challanNo : 'Select Outward'}
            </Text>
            <Icon name={editingKey ? 'lock-outline' : 'search'} size={15} color={editingKey ? T.blue : T.muted} />
          </TouchableOpacity>
          <TextInput
            value={lotNo}
            onChangeText={setLotNo}
            style={[st.input, editingKey && { borderColor: T.blue }]}
            placeholder="Lot No."
            placeholderTextColor={T.muted}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={submit}
            editable={!saving}
          />
          <TouchableOpacity
            onPress={submit}
            disabled={saving}
            style={[st.addBtn, editingKey && { backgroundColor: T.blue }, saving && { opacity: 0.6 }]}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Icon name={editingKey ? 'check' : 'add'} size={16} color="#fff" />}
            <Text style={st.addText}>{editingKey ? 'Update' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {canEdit && !!selected && (
        <View style={st.selMeta}>
          <Text style={st.selMetaText} numberOfLines={1}>
            {[
              selected.date ? showDate(selected.date) : '',
              selected.qty != null ? `${qtyLabel(selected.qty)} m` : '',
              selected.mill,
              editingKey ? `editing lot ${selected.lotNo}` : '',
            ].filter(Boolean).join(' · ') || `Sr ${selected.srno || '—'}`}
          </Text>
          <TouchableOpacity onPress={reset} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={st.clear}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!error && <Text style={st.error}>{error}</Text>}

      {loadError ? (
        <TouchableOpacity onPress={onRetry} style={st.loadErr}>
          <Icon name="refresh" size={13} color={T.red} />
          <Text style={st.loadErrText} numberOfLines={2}>{loadError} — tap to retry</Text>
        </TouchableOpacity>
      ) : saved.length > 0 ? (
        <View style={st.table}>
          <View style={[st.tr, st.th]}>
            <Text style={[st.thText, { flex: 1.3 }]}>Outward No.</Text>
            <Text style={[st.thText, { flex: 1 }]}>Lot No.</Text>
            {canEdit && <View style={{ width: 28 }} />}
          </View>
          {saved.map((row, i) => {
            const on = editingKey === row.key;
            return (
              <TouchableOpacity
                key={row.key}
                style={[st.tr, i < saved.length - 1 && st.trLine, on && { backgroundColor: `${T.blue}14` }]}
                onPress={() => canEdit && startEdit(row)}
                activeOpacity={canEdit ? 0.6 : 1}
              >
                <View style={[st.td, { flex: 1.3 }]}>
                  <Text style={st.tdText} numberOfLines={1}>{row.challanNo}</Text>
                  {!!row.date && <Text style={st.tdSub}>{showDate(row.date)}{row.qty != null ? ` · ${qtyLabel(row.qty)} m` : ''}</Text>}
                </View>
                <View style={[st.td, st.tdLot, { flex: 1 }]}>
                  <Text style={[st.tdText, { fontWeight: '900' }]} numberOfLines={1}>{row.lotNo}</Text>
                </View>
                {canEdit && (
                  <View style={st.editCell}>
                    <Icon name="edit" size={14} color={on ? T.blue : T.muted} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : !loading ? (
        <Text style={st.empty}>
          {rows.length ? 'No lot no. added yet — select an outward and add its lot no.' : 'No outward found for this chart.'}
        </Text>
      ) : null}

      <OutwardHelp
        visible={helpOpen}
        rows={rows}
        onClose={() => setHelpOpen(false)}
        onPick={choose}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Help list — searchable outward challan lines                               */
/* -------------------------------------------------------------------------- */

function OutwardHelp({
  visible, rows, onClose, onPick,
}: {
  visible: boolean;
  rows: OutwardRow[];
  onClose: () => void;
  onPick: (row: OutwardRow) => void;
}) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = query
      ? rows.filter((r) => [r.challanNo, r.lotNo, r.mill, r.shdName, r.srno, showDate(r.date)].join(' ').toLowerCase().includes(query))
      : rows;
    // open outwards (no lot yet) first
    return [...filtered].sort((a, b) => Number(!!a.lotNo) - Number(!!b.lotNo));
  }, [rows, q]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.helpOverlay}>
        <View style={st.helpCard}>
          <View style={st.helpHead}>
            <Text style={st.helpTitle}>Select Outward</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={T.muted} />
            </TouchableOpacity>
          </View>
          <View style={st.helpSearch}>
            <Icon name="search" size={15} color={T.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search outward no, lot no, mill…"
              placeholderTextColor={T.muted}
              style={st.helpSearchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={[st.tr, st.th, { marginHorizontal: 12 }]}>
            <Text style={[st.thText, { flex: 1.4 }]}>Outward No.</Text>
            <Text style={[st.thText, { flex: 1 }]}>Date</Text>
            <Text style={[st.thText, { flex: 0.9, textAlign: 'right' }]}>Qty</Text>
            <Text style={[st.thText, { flex: 0.9, textAlign: 'right' }]}>Lot</Text>
          </View>
          <FlatList
            data={list}
            keyExtractor={(r: OutwardRow) => r.key}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 380 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
            ListEmptyComponent={<Text style={[st.empty, { textAlign: 'center', marginTop: 16 }]}>No outward found.</Text>}
            renderItem={({ item }: { item: OutwardRow }) => (
              <TouchableOpacity style={[st.tr, st.trLine, st.helpRow]} onPress={() => onPick(item)} activeOpacity={0.6}>
                <View style={{ flex: 1.4, minWidth: 0 }}>
                  <Text style={st.tdText} numberOfLines={1}>{item.challanNo}</Text>
                  {(!!item.mill || !!item.shdName) && (
                    <Text style={st.tdSub} numberOfLines={1}>{[item.shdName, item.mill].filter(Boolean).join(' · ')}</Text>
                  )}
                </View>
                <Text style={[st.tdText, { flex: 1 }]} numberOfLines={1}>{item.date ? showDate(item.date) : '—'}</Text>
                <Text style={[st.tdText, { flex: 0.9, textAlign: 'right' }]} numberOfLines={1}>
                  {item.qty != null ? qtyLabel(item.qty) : '—'}
                </Text>
                <View style={{ flex: 0.9, alignItems: 'flex-end' }}>
                  {item.lotNo
                    ? <Text style={st.lotBadge} numberOfLines={1}>{item.lotNo}</Text>
                    : <Text style={[st.tdSub, { marginTop: 0 }]}>open</Text>}
                </View>
              </TouchableOpacity>
            )}
          />
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
  head: { fontSize: 11, fontWeight: '900', color: T.ink, textTransform: 'uppercase', letterSpacing: 0.3 },

  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  picker: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: 4, height: 36,
    borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface, paddingHorizontal: 9,
  },
  pickerText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: T.ink },
  input: {
    flex: 1, height: 36, borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface,
    paddingHorizontal: 9, fontSize: 12.5, fontWeight: '700', color: T.ink,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3, height: 36, paddingHorizontal: 10,
    borderRadius: 8, backgroundColor: T.copper,
  },
  addText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  selMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  selMetaText: { flex: 1, fontSize: 10.5, fontWeight: '600', color: T.muted },
  clear: { fontSize: 11, fontWeight: '800', color: T.blue },
  error: { color: T.red, fontSize: 11.5, fontWeight: '700', marginTop: 6 },

  table: {
    marginTop: 8, borderWidth: 1, borderColor: T.border, borderRadius: 8,
    backgroundColor: T.surface, overflow: 'hidden',
  },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 7 },
  trLine: { borderBottomWidth: 1, borderBottomColor: T.hair },
  th: { backgroundColor: T.alt, paddingVertical: 5 },
  thText: { fontSize: 9.5, fontWeight: '900', color: T.muted, textTransform: 'uppercase' },
  td: { minWidth: 0 },
  tdLot: { borderLeftWidth: 1, borderLeftColor: T.hair, paddingLeft: 8, alignSelf: 'stretch', justifyContent: 'center' },
  tdText: { fontSize: 12, fontWeight: '700', color: T.ink },
  tdSub: { fontSize: 9.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  editCell: { width: 28, alignItems: 'flex-end' },
  empty: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 7 },
  loadErr: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  loadErrText: { flex: 1, fontSize: 10.5, fontWeight: '700', color: T.red },

  helpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  helpCard: { backgroundColor: T.bg, borderRadius: 14, overflow: 'hidden' },
  helpHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: T.surface,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  helpTitle: { fontSize: 14.5, fontWeight: '900', color: T.ink },
  helpSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 6, margin: 12, marginBottom: 8, height: 36,
    borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface, paddingHorizontal: 9,
  },
  helpSearchInput: { flex: 1, fontSize: 12.5, color: T.ink, paddingVertical: 0 },
  helpRow: { paddingVertical: 9 },
  lotBadge: {
    fontSize: 10.5, fontWeight: '900', color: T.copper,
    borderWidth: 1, borderColor: `${T.copper}66`, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
  },
});
