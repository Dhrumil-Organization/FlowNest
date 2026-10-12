// FILE: src/components/SalesOrderEntryNEW/OrderPanel.tsx
// View / Edit of one sales order from the Auth tab — Legacy AuthOrderModal.
// View = read-only. Edit = due date, remark, qty / rate of each row, remove a row
// (deleted only when Update Order succeeds, "Undo all" brings them back) and
// "Add item combination" (Item -> Design -> Shade + Qty + Rate).
// Rules and texts come from model.ts (toEditRows, validateCombination,
// makeCombinationRow, restoreRows, validateEdit, editConfirmText).
import AppAlert from '@/common/utils/appAlert';
import { Btn, PanelHeader } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as api from './api';
import {
  currentFyNo,
  decimalInput,
  editConfirmText,
  editTotals,
  EditRow,
  makeCombinationRow,
  money,
  parseErpDate,
  parseNum,
  restoreRows,
  Row,
  toEditRows,
  validateCombination,
  validateEdit,
} from './model';
import { Badge, CONTENT, DateInput, SearchPicker, Swatch, ui } from './ui';

export type OrderSave = { dueDate: Date; remark: string; rows: EditRow[]; removedRows: EditRow[] };

type Props = {
  mode: 'view' | 'edit';
  record: Row;
  saving: boolean;
  token: string;
  API: string;
  prpcode: string;
  yearno: string;
  onClose: () => void;
  onSave: (v: OrderSave) => void;
};

type PickerName = 'item' | 'design' | 'shade' | null;

export default function OrderPanel({ mode, record, saving, token, API, prpcode, yearno, onClose, onSave }: Props) {
  const isEdit = mode === 'edit';
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [remark, setRemark] = useState('');
  const [rows, setRows] = useState<EditRow[]>([]);
  const [removedRows, setRemovedRows] = useState<EditRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [picker, setPicker] = useState<PickerName>(null);

  // "add combination" builder (Legacy names: addDesign = ITEM, addItem = DESIGN)
  const [addDesignList, setAddDesignList] = useState<Row[]>([]);
  const [addDesignLoading, setAddDesignLoading] = useState(false);
  const [addDesign, setAddDesign] = useState<Row | null>(null);
  const [addItemList, setAddItemList] = useState<Row[]>([]);
  const [addItemLoading, setAddItemLoading] = useState(false);
  const [addItem, setAddItem] = useState<Row | null>(null);
  const [addShadeList, setAddShadeList] = useState<Row[]>([]);
  const [addShadeLoading, setAddShadeLoading] = useState(false);
  const [addShade, setAddShade] = useState<Row | null>(null);
  const [addQty, setAddQty] = useState('');
  const [addRate, setAddRate] = useState('');

  const editPrpCode = record?.PrpCode || prpcode || '';
  const editYearNo = record?.yearno || record?.YearNo || yearno || currentFyNo();
  const editStrCode = record?.StrCode || '012';

  const resetBuilder = () => {
    setShowAdd(false);
    setAddDesignList([]);
    setAddDesignLoading(false);
    setAddDesign(null);
    setAddItemList([]);
    setAddItemLoading(false);
    setAddItem(null);
    setAddShadeList([]);
    setAddShadeLoading(false);
    setAddShade(null);
    setAddQty('');
    setAddRate('');
    setPicker(null);
  };

  useEffect(() => {
    if (!record) return;
    setDueDate(parseErpDate(record.DueDate || record.dduedate));
    setRemark(String(record.Remark || ''));
    setRows(toEditRows(record));
    setRemovedRows([]);
    resetBuilder();
  }, [record, mode]);

  // Android back closes the panel (Legacy modal onRequestClose, blocked while saving)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!saving) onClose();
      return true;
    });
    return () => sub.remove();
  }, [saving, onClose]);

  const errText = (e: any) => e?.response?.data?.message || e?.message || 'Please try again.';

  const loadAddDesigns = async () => {
    if (!editPrpCode || !token) {
      AppAlert.alert('Unable to add item', 'Property or login information is missing.');
      return;
    }
    try {
      setAddDesignLoading(true);
      setAddDesignList(await api.getItems(API, token, editPrpCode, editStrCode, editYearNo));
    } catch (e) {
      setAddDesignList([]);
      AppAlert.alert('Unable to load items', errText(e));
    } finally {
      setAddDesignLoading(false);
    }
  };

  const openBuilder = () => {
    if (!isEdit || saving) return;
    setShowAdd(true);
    if (addDesignList.length === 0 && !addDesignLoading) loadAddDesigns();
  };

  const selectAddDesign = async (design: Row) => {
    setAddDesign(design);
    setAddItem(null);
    setAddShade(null);
    setAddItemList([]);
    setAddShadeList([]);
    if (!design?.ItmCode) return;
    try {
      setAddItemLoading(true);
      setAddItemList(await api.getDesigns(API, token, editPrpCode, editStrCode, editYearNo, design));
    } catch (e) {
      setAddItemList([]);
      AppAlert.alert('Unable to load designs', errText(e));
    } finally {
      setAddItemLoading(false);
    }
  };

  const selectAddItem = async (item: Row) => {
    setAddItem(item);
    setAddShade(null);
    setAddShadeList([]);
    if (!addDesign?.ItmCode || !item?.DsnCode) return;
    try {
      setAddShadeLoading(true);
      setAddShadeList(
        await api.getShadesOf(API, token, {
          prpcode: editPrpCode,
          strcode: editStrCode,
          yearno: editYearNo,
          itmcode: addDesign.ItmCode,
          mitmcode: addDesign.MItmCode || addDesign.ItmCode,
          dsncode: item.DsnCode,
        }),
      );
    } catch (e) {
      setAddShadeList([]);
      AppAlert.alert('Unable to load shades', errText(e));
    } finally {
      setAddShadeLoading(false);
    }
  };

  const addCombination = () => {
    const err = validateCombination(rows, addDesign, addItem, addShade, addQty, addRate);
    if (err) {
      AppAlert.alert(err[0], err[1]);
      return;
    }
    const row = makeCombinationRow(rows, editStrCode, addDesign as Row, addItem as Row, addShade as Row, addQty, addRate);
    setRows((prev) => [...prev, row]);
    setShowAdd(false);
    setAddDesign(null);
    setAddItem(null);
    setAddShade(null);
    setAddItemList([]);
    setAddShadeList([]);
    setAddQty('');
    setAddRate('');
  };

  const removeRow = (row: EditRow) => {
    if (!isEdit || saving) return;
    if (row._isNew) {
      setRows((prev) => prev.filter((r) => r._clientKey !== row._clientKey));
      return;
    }
    AppAlert.alert(
      'Remove item row?',
      `${row.ItmName || 'This item'} · ${row.DsnName || 'Design'} · ${row.ShdName || 'Shade'}\n\nThe row will be deleted only after Update Order succeeds.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove row',
          style: 'destructive',
          onPress: () => {
            setRows((prev) => prev.filter((r) => r._clientKey !== row._clientKey));
            setRemovedRows((prev) => (prev.some((r) => r._clientKey === row._clientKey) ? prev : [...prev, row]));
          },
        },
      ],
    );
  };

  const restoreRemoved = () => {
    if (!isEdit || saving || removedRows.length === 0) return;
    setRows((prev) => restoreRows(prev, removedRows));
    setRemovedRows([]);
  };

  const updateRow = (index: number, field: '_qty' | '_rate', value: string) => {
    if (!isEdit) return;
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: decimalInput(value) } : row)));
  };

  const { totalQty, totalAmount } = editTotals(rows);

  const submit = () => {
    if (!isEdit || saving) return;
    const err = validateEdit(rows);
    if (err) {
      AppAlert.alert(err[0], err[1]);
      return;
    }
    const save = () => onSave({ dueDate, remark: remark.trim(), rows, removedRows });
    const confirmText = editConfirmText(rows, removedRows);
    if (confirmText) {
      AppAlert.alert('Update sales order?', confirmText, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update Order', onPress: save },
      ]);
      return;
    }
    save();
  };

  const addReady = !!addDesign && !!addItem && !!addShade && parseNum(addQty) > 0 && parseNum(addRate) > 0;

  return (
    <View style={{ flex: 1 }}>
      <PanelHeader
        onBack={() => !saving && onClose()}
        crumbs={['Auth']}
        title={isEdit ? 'Edit Sales Order' : 'View Sales Order'}
        subtitle={record.SONo || '—'}
        right={<Badge text={isEdit ? 'EDIT' : 'VIEW ONLY'} tone={isEdit ? 'green' : 'blue'} />}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={[CONTENT, { gap: 12 }]}>
          {!isEdit ? (
            <View style={s.roBanner}>
              <Icon name="visibility" size={18} color={T.blue} />
              <Text style={s.roText}>View mode is read-only. No value can be changed or saved.</Text>
            </View>
          ) : null}

          <View style={[ui.card, { paddingHorizontal: 14 }]}>
            <Info label="Customer" value={record.ParName || '—'} />
            <Info label="Sales executive" value={record.SexecName || record.SExeName || '—'} />
            <Info label="Order date" value={record.SODate || '—'} />
            <Info label="Status" value={record.AuthStatus || 'Pending'} last />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={ui.label}>Expected delivery date</Text>
            <DateInput label="Expected delivery date" value={dueDate} onChange={setDueDate} disabled={!isEdit || saving} />
          </View>

          <View style={s.itemsHead}>
            <Text style={s.itemsTitle}>Items</Text>
            <Text style={ui.muted}>
              {rows.length} row{rows.length === 1 ? '' : 's'}
            </Text>
          </View>

          {isEdit && !showAdd ? <Btn label="Add item combination" icon="add-circle-outline" kind="soft" onPress={openBuilder} disabled={saving} /> : null}

          {isEdit && removedRows.length > 0 ? (
            <View style={s.removed}>
              <Icon name="delete-sweep" size={20} color={T.red} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.removedTitle}>
                  {removedRows.length} row{removedRows.length === 1 ? '' : 's'} will be deleted
                </Text>
                <Text style={ui.muted}>Deletion happens only after Update Order succeeds.</Text>
              </View>
              <TouchableOpacity style={s.undo} onPress={restoreRemoved} disabled={saving} accessibilityRole="button" accessibilityLabel="Undo all removed rows">
                <Icon name="undo" size={17} color={T.blue} />
                <Text style={s.undoText}>Undo all</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isEdit && showAdd ? (
            <View style={[ui.card, s.addCard]}>
              <View style={s.addHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.addTitle}>New item combination</Text>
                  <Text style={ui.muted}>Select Item, Design and Shade</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAdd(false)} disabled={saving} style={s.addClose} accessibilityLabel="Close">
                  <Icon name="close" size={20} color={T.muted} />
                </TouchableOpacity>
              </View>

              <Picker label="Item" value={addDesign?.ItmName || ''} placeholder="Select item" loading={addDesignLoading} disabled={saving || addDesignLoading} onPress={() => setPicker('item')} />
              <Picker
                label="Design"
                value={addItem ? `${addItem.DsnCode} · ${addItem.DsnName}` : ''}
                placeholder="Select design"
                loading={addItemLoading}
                disabled={saving || !addDesign || addItemLoading}
                onPress={() => setPicker('design')}
              />
              <Picker
                label="Shade"
                value={addShade?.ShdName || addShade?.ShadeName || ''}
                placeholder="Select shade"
                loading={addShadeLoading}
                disabled={saving || !addItem || addShadeLoading}
                swatch={addShade ? addShade.ShdColor || '#CBD5E1' : undefined}
                onPress={() => setPicker('shade')}
              />

              <View style={s.twoCol}>
                <NumBox label="Quantity" value={addQty} onChange={(v) => setAddQty(decimalInput(v))} editable={!saving} placeholder="0.000" />
                <NumBox label="Rate / M" value={addRate} onChange={(v) => setAddRate(decimalInput(v))} editable={!saving} placeholder="0.00" />
              </View>

              <Btn label="Add to order" icon="add" kind="primary" onPress={addCombination} disabled={saving || !addReady} />
            </View>
          ) : null}

          {rows.map((row, index) => {
            const rowAmount = parseNum(row._qty) * parseNum(row._rate);
            return (
              <View key={row._clientKey || `${row.SrNo || index}_${row.ShdCode || index}`} style={[ui.card, s.rowCard, row._isNew && s.rowCardNew]}>
                <View style={s.rowTop}>
                  <View style={s.rowIdx}>
                    <Text style={s.rowIdxText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.rowDesign}>{row.DsnName || 'Design'}</Text>
                    <Text style={ui.muted} numberOfLines={2}>
                      {row.ItmName || '—'} · {row.ShdName || '—'}
                    </Text>
                  </View>
                  {row._isNew ? <Badge text="NEW" tone="green" /> : null}
                  {isEdit ? (
                    <TouchableOpacity
                      style={s.rowDel}
                      onPress={() => removeRow(row)}
                      disabled={saving}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${row.ItmName || 'item'} from order`}
                    >
                      <Icon name="delete-outline" size={19} color={T.red} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={s.twoCol}>
                  <NumBox label="Quantity" value={row._qty} onChange={(v) => updateRow(index, '_qty', v)} editable={isEdit && !saving} placeholder="0.000" />
                  <NumBox label="Rate / m" value={row._rate} onChange={(v) => updateRow(index, '_rate', v)} editable={isEdit && !saving} placeholder="0.00" />
                </View>
                <View style={s.amtRow}>
                  <Text style={ui.muted}>Amount</Text>
                  <Text style={s.amt}>₹{money(rowAmount)}</Text>
                </View>
              </View>
            );
          })}

          <View style={{ gap: 6 }}>
            <Text style={ui.label}>Remark</Text>
            <TextInput
              value={remark}
              onChangeText={setRemark}
              editable={isEdit && !saving}
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={[s.remark, !isEdit && { backgroundColor: T.alt }]}
              placeholder={isEdit ? 'Add a remark (optional)' : 'No remark'}
              placeholderTextColor={T.muted}
            />
          </View>

          <View style={s.totals}>
            <View>
              <Text style={s.totLabel}>TOTAL QUANTITY</Text>
              <Text style={s.totValue}>{totalQty.toLocaleString('en-IN')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.totLabel}>TOTAL AMOUNT</Text>
              <Text style={s.totValue}>₹{money(totalAmount)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <View style={[CONTENT, s.footerInner]}>
          {isEdit ? (
            <>
              <Btn label="Cancel" kind="ghost" onPress={onClose} disabled={saving} style={{ flex: 1 }} />
              <Btn label="Update Order" icon="save" kind="copper" onPress={submit} loading={saving} style={{ flex: 2 }} />
            </>
          ) : (
            <Btn label="Close" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
          )}
        </View>
      </View>

      <SearchPicker
        open={picker === 'item'}
        title="Item"
        rows={addDesignList}
        keyField="ItmCode"
        labelField="ItmName"
        subOf={(r) => (r.ItmCode ? String(r.ItmCode) : '')}
        loading={addDesignLoading}
        onPick={selectAddDesign}
        onClose={() => setPicker(null)}
      />
      <SearchPicker
        open={picker === 'design'}
        title="Design"
        rows={addItemList}
        keyField="DsnCode"
        labelField="DsnName"
        subOf={(r) => (r.DsnCode ? String(r.DsnCode) : '')}
        loading={addItemLoading}
        onPick={selectAddItem}
        onClose={() => setPicker(null)}
      />
      <SearchPicker
        open={picker === 'shade'}
        title="Shade"
        rows={addShadeList.map((r) => ({ ...r, __label: r.ShdName || r.ShadeName || '' }))}
        keyField="ShdCode"
        labelField="__label"
        subOf={(r) => (r.ShdCode ? String(r.ShdCode) : '')}
        leftOf={(r) => <Swatch color={r.ShdColor || '#CBD5E1'} />}
        loading={addShadeLoading}
        onPick={(r) => {
          const { __label, ...shade } = r;
          setAddShade(shade);
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

function Info({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.info, !last && { borderBottomWidth: 1, borderBottomColor: T.hair }]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function Picker({
  label,
  value,
  placeholder,
  loading,
  disabled,
  swatch,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  loading?: boolean;
  disabled?: boolean;
  swatch?: string;
  onPress: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.label}>{label}</Text>
      <TouchableOpacity style={[s.pick, disabled && !loading && { opacity: 0.55 }]} onPress={onPress} disabled={disabled} activeOpacity={0.8} accessibilityRole="button">
        {swatch ? <Swatch color={swatch} size={20} radius={5} /> : null}
        <Text style={[s.pickText, !value && { color: T.muted, fontWeight: '600' }]} numberOfLines={2}>
          {value || placeholder}
        </Text>
        {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="expand-more" size={21} color={T.muted} />}
      </TouchableOpacity>
    </View>
  );
}

function NumBox({
  label,
  value,
  onChange,
  editable,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  placeholder: string;
}) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        keyboardType="decimal-pad"
        selectTextOnFocus={editable}
        style={[s.num, !editable && { backgroundColor: T.alt, color: T.muted }]}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
      />
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 24 },
  roBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${T.blue}40`,
    backgroundColor: `${T.blue}10`,
  },
  roText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: T.blue },
  info: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11 },
  infoLabel: { fontSize: 12.5, fontWeight: '700', color: T.muted },
  infoValue: { flex: 1, textAlign: 'right', fontSize: 13.5, fontWeight: '800', color: T.ink },
  itemsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  itemsTitle: { fontSize: 15, fontWeight: '900', color: T.ink },

  removed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${T.red}40`,
    backgroundColor: `${T.red}0D`,
  },
  removedTitle: { fontSize: 13.5, fontWeight: '800', color: T.red },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 8, backgroundColor: `${T.blue}12` },
  undoText: { fontSize: 12.5, fontWeight: '800', color: T.blue },

  addCard: { padding: 14, gap: 12, borderColor: `${T.copper}55` },
  addHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  addTitle: { fontSize: 14.5, fontWeight: '900', color: T.ink },
  addClose: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: T.alt },
  pick: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  pickText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
  twoCol: { flexDirection: 'row', gap: 10 },
  num: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
    color: T.ink,
  },

  rowCard: { padding: 14, gap: 12 },
  rowCardNew: { borderColor: `${T.green}66`, backgroundColor: `${T.green}08` },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIdx: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: T.nav },
  rowIdxText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  rowDesign: { fontSize: 14.5, fontWeight: '900', color: T.ink },
  rowDel: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.red}10` },
  amtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  amt: { fontSize: 15, fontWeight: '900', color: T.nav },

  remark: {
    minHeight: 84,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    padding: 12,
    fontSize: 14,
    fontWeight: '600',
    color: T.ink,
  },
  totals: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 14, backgroundColor: T.nav },
  totLabel: { fontSize: 10.5, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.6 },
  totValue: { fontSize: 18, fontWeight: '900', color: '#fff', marginTop: 4 },

  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingVertical: 10 },
  footerInner: { flexDirection: 'row', gap: 10, paddingHorizontal: 12 },
});
