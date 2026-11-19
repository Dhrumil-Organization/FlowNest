// FILE: src/features/repackingIssue/components/ItemEntrySheet.tsx
// Item Detail Entry: Item / Merge / Grade / Shade / Denier, UOM (read-only from AmtCalc),
// Pieces / Qty / Wt, and the Carton Detail grid.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import { confirmAsync, notify } from '../dialog';
import { cartonTotals, cleanDecimal, cleanInt, Errors, fmt3, toNum, validateItem } from '../logic';
import { RepackingService } from '../service';
import { C, SP } from '../theme';
import { CartonRow, ItemLookupKind, LookupKind, LookupOption, RepackContext, RepackItem, StockCarton } from '../types';
import { CartonEntry } from './CartonEntry';
import { MasterPicker } from './MasterPicker';
import { Sheet } from './Sheet';
import type { StockState } from './StockPicker';
import { Btn, Card, Field, Input, ReadOnly, Row, SelectBox, Stat } from './ui';

type SelKind = ItemLookupKind;

/** what each master needs first, and what changes when it changes */
const NEEDS: Record<SelKind, SelKind | null> = { item: null, merge: 'item', grade: 'merge', shade: 'grade' };
const AFTER: Record<SelKind, SelKind[]> = { item: ['merge', 'grade', 'shade'], merge: ['grade', 'shade'], grade: ['shade'], shade: [] };
const LABELS: Record<SelKind, string> = { item: 'Item', merge: 'Merge', grade: 'Grade', shade: 'Shade' };

export function ItemEntrySheet({ visible, initial, isNew, blocked, ctx, service, vouDate, readOnly, canScan, canRemove, onSave, onClose }: {
  visible: boolean;
  /** voucher date (dd-mm-yyyy) — stock up to this date */
  vouDate: string;
  initial: RepackItem;
  isNew: boolean;
  blocked: Set<string>;
  ctx: RepackContext;
  service: RepackingService;
  readOnly?: boolean;
  canScan: boolean;
  canRemove: boolean;
  onSave: (it: RepackItem) => void;
  onClose: () => void;
}) {
  const { isPhone } = useDeviceClass();
  const [it, setIt] = useState<RepackItem>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [picker, setPicker] = useState<SelKind | null>(null);

  useEffect(() => {
    if (visible) {
      setIt(initial);
      setErrors({});
    }
  }, [visible, initial]);

  /* ---- stock for Item / Merge / Grade / Shade ---- */
  const [stockRows, setStockRows] = useState<StockCarton[] | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState('');
  const stockKey = [it.item?.code, it.merge?.code, it.grade?.code, it.shade?.code].every(Boolean)
    ? `${it.item!.code}|${it.merge!.code}|${it.grade!.code}|${it.shade!.code}|${vouDate}`
    : '';

  const loadStock = useCallback(async () => {
    if (!stockKey || readOnly || !canScan) {
      setStockRows(null);
      return;
    }
    setStockLoading(true);
    setStockError('');
    setStockRows([]);
    try {
      setStockRows(await service.stock(ctx, it, vouDate));
    } catch (e: any) {
      setStockError(e?.response?.status ? `HTTP ${e.response.status} — ${e?.response?.data?.message || e.message}` : e?.message || 'Could not load stock.');
    } finally {
      setStockLoading(false);
    }
  }, [stockKey, readOnly, canScan]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (visible) loadStock();
  }, [visible, loadStock]);

  const stock: StockState = { rows: stockRows, loading: stockLoading, error: stockError, reload: loadStock };

  const dirty = useMemo(() => JSON.stringify(it) !== JSON.stringify(initial), [it, initial]);
  const hasCartons = it.cartons.length > 0;
  const tot = cartonTotals(it.cartons, it.uom);

  const set = (patch: Partial<RepackItem>) => {
    setIt(p => ({ ...p, ...patch }));
    setErrors(e => {
      const n = { ...e };
      Object.keys(patch).forEach(k => delete n[k]);
      return n;
    });
  };

  const setCartons = (rows: CartonRow[]) => {
    const t = cartonTotals(rows, it.uom);
    // cartons drive Pieces / Qty / Wt; with no cartons the fields become editable again
    set({
      cartons: rows,
      pieces: rows.length ? String(t.count) : it.pieces,
      qty: rows.length ? t.qty.toFixed(3) : it.qty,
      wt: rows.length ? t.wt.toFixed(3) : it.wt
    });
  };

  const pick = async (kind: LookupKind, o: LookupOption) => {
    setPicker(null);
    if (kind !== 'item' && kind !== 'merge' && kind !== 'grade' && kind !== 'shade') return;
    if (it[kind]?.code === o.code) return;
    // cartons come from the stock of the old Item / Merge / Grade / Shade → they must go
    if (it.cartons.length) {
      const ok = await confirmAsync(
        `Change ${LABELS[kind].toLowerCase()}?`,
        `The ${it.cartons.length} carton(s) entered belong to the current selection and will be removed.`,
        'Change',
        true
      );
      if (!ok) return;
    }
    const patch: Partial<RepackItem> = { [kind]: o };
    AFTER[kind].forEach(k => { (patch as any)[k] = null; });
    if (it.cartons.length) Object.assign(patch, { cartons: [], pieces: '', qty: '', wt: '' });
    if (kind === 'item') {
      patch.uom = String(o.extra?.amtCalc ?? '').toUpperCase();
      const denier = String(o.extra?.denier ?? '');
      if (denier && !it.denier) patch.denier = denier;
    }
    set(patch);
  };

  const ok = () => {
    const e = validateItem(it);
    setErrors(e);
    if (Object.keys(e).length) {
      notify('Check item', Object.values(e)[0]);
      return;
    }
    onSave(it);
  };

  const close = async () => {
    if (!dirty || readOnly) return onClose();
    if (await confirmAsync('Discard changes?', 'Changes to this item will be lost.', 'Discard', true)) onClose();
  };

  const sel = (k: SelKind, label: string) => {
    const need = NEEDS[k];
    const waiting = !!need && !it[need];
    return (
      <Field label={label} required error={errors[k]}>
        <SelectBox
          value={it[k]?.name}
          code={it[k]?.code}
          placeholder={waiting ? `Select ${LABELS[need!].toLowerCase()} first` : `Select ${label.toLowerCase()}`}
          onPress={() => setPicker(k)}
          invalid={!!errors[k]}
          disabled={readOnly || waiting}
        />
      </Field>
    );
  };

  const itemCard = (
    <Card step={1} title="Item">
      {sel('item', 'Item')}
      <Row>
        {sel('merge', 'Merge')}
        {sel('grade', 'Grade')}
      </Row>
      {sel('shade', 'Shade')}
      <Row>
        <Field label="Denier" required error={errors.denier}>
          <Input value={it.denier} onChangeText={t => set({ denier: t })} invalid={!!errors.denier} editable={!readOnly} placeholder="e.g. 150/48" />
        </Field>
        <Field label="UOM" hint="From item (AmtCalc)">
          <ReadOnly value={it.uom} placeholder="Select item" emphasis />
        </Field>
      </Row>
    </Card>
  );

  const qtyCard = (
    <Card step={2} title="Quantity" right={hasCartons ? <Text style={st.auto}>Auto from cartons</Text> : null}>
      <Row>
        <Field label="Pieces" required error={errors.pieces}>
          {hasCartons ? <ReadOnly value={String(tot.count)} /> : (
            <Input value={it.pieces} onChangeText={t => set({ pieces: cleanInt(t) })} keyboardType="number-pad" invalid={!!errors.pieces} editable={!readOnly} placeholder="0" />
          )}
        </Field>
        <Field label={`Qty${it.uom ? ` (${it.uom})` : ''}`} required error={errors.qty}>
          {hasCartons ? <ReadOnly value={fmt3(tot.qty)} emphasis /> : (
            <Input value={it.qty} onChangeText={t => set({ qty: cleanDecimal(t) })} keyboardType="decimal-pad" invalid={!!errors.qty} editable={!readOnly} placeholder="0.000" style={{ textAlign: 'right' }} />
          )}
        </Field>
        <Field label="Wt.">
          {hasCartons ? <ReadOnly value={fmt3(tot.wt)} emphasis /> : (
            <Input value={it.wt} onChangeText={t => set({ wt: cleanDecimal(t) })} keyboardType="decimal-pad" editable={!readOnly} placeholder="0.000" style={{ textAlign: 'right' }} />
          )}
        </Field>
      </Row>
    </Card>
  );

  const cartonCard = (
    <Card step={3} title="Carton Detail">
      <CartonEntry
        cartons={it.cartons}
        onChange={setCartons}
        blocked={blocked}
        stock={stock}
        uom={it.uom}
        readOnly={readOnly}
        canScan={canScan}
        canRemove={canRemove}
      />
    </Card>
  );

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={readOnly ? `Item #${it.srNo}` : isNew ? 'Add Item' : `Edit Item #${it.srNo}`}
      subtitle={it.item?.name || 'Item detail entry'}
      right={it.uom ? <View style={st.uomPill}><Text style={st.uomTxt}>{it.uom}</Text></View> : null}
      footer={
        <>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <Stat label="Cartons" value={String(it.cartons.length)} />
            <Stat label="Qty" value={fmt3(toNum(hasCartons ? tot.qty : it.qty))} strong />
            <Stat label="Wt" value={fmt3(toNum(hasCartons ? tot.wt : it.wt))} />
          </View>
          {readOnly ? (
            <Btn title="Close" kind="ghost" onPress={onClose} />
          ) : (
            <>
              {!isPhone ? <Btn title="Cancel" kind="ghost" onPress={close} /> : null}
              <Btn title={isNew ? 'Add item' : 'Update'} icon="check" onPress={ok} style={{ minWidth: 130 }} />
            </>
          )}
        </>
      }>
      <ScrollView contentContainerStyle={{ padding: SP.md, paddingBottom: SP.xl }} keyboardShouldPersistTaps="handled">
        {!isPhone ? (
          <View style={{ flexDirection: 'row', gap: SP.md, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, minWidth: 0 }}>{itemCard}{qtyCard}</View>
            <View style={{ flex: 1.1, minWidth: 0 }}>{cartonCard}</View>
          </View>
        ) : (
          <>
            {itemCard}
            {qtyCard}
            {cartonCard}
          </>
        )}
      </ScrollView>

      <MasterPicker
        kind={picker}
        ctx={ctx}
        service={service}
        selected={picker ? it[picker]?.code : undefined}
        filter={{ itmCode: it.item?.code, merCode: it.merge?.code, grdCode: it.grade?.code }}
        onPick={pick}
        onClose={() => setPicker(null)}
      />
    </Sheet>
  );
}

const st = StyleSheet.create({
  uomPill: { backgroundColor: C.cta, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  uomTxt: { color: C.onNav, fontWeight: '800', fontSize: 12 },
  auto: { fontSize: 12, color: C.ok, fontWeight: '700' }
});
