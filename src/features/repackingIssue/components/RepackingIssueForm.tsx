// FILE: src/features/repackingIssue/components/RepackingIssueForm.tsx
// Repacking Issue (Knitting Grey) entry form. Pure UI: context, service and rights come from
// src/screens/repackingIssue/RepackingIssueScreen.tsx. The page title is drawn by the FlowNest
// layout from the navigation node, so this form has no header of its own.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import { confirmAsync, notify } from '../dialog';
import {
  cartonsInOtherItems, REMARK_MAX, emptyHeader, emptyItem, Errors, fmt3, formTotals, isValidDMY, maskDMY, toNum, todayDMY, validateHeader
} from '../logic';
import { RepackingService, RepackRights } from '../service';
import { C, R, SP } from '../theme';
import { LookupKind, LookupOption, RepackContext, RepackForm, RepackItem, STOCK_TYPES } from '../types';
import { ItemEntrySheet } from './ItemEntrySheet';
import { MasterPicker } from './MasterPicker';
import { Banner, Btn, Card, Field, Input, Row, Segmented, SelectBox, Stat } from './ui';

export interface RepackingIssueFormProps {
  ctx: RepackContext;
  service: RepackingService;
  rights: RepackRights;
  /** add (default) needs `add`; edit needs `edit`; view is read-only */
  mode?: 'add' | 'edit' | 'view';
  initialForm?: RepackForm;
  /** after a successful save — if omitted the form resets for the next voucher */
  onSaved?: (uid?: number) => void;
  onCancel?: () => void;
}

export function RepackingIssueForm({ ctx: initialCtx, service, rights, mode = 'add', initialForm, onSaved, onCancel }: RepackingIssueFormProps) {
  const { isPhone, isDesktop } = useDeviceClass();
  // Property / Year / Store for this entry — starts from the session selection, changeable here.
  const [ctx, setCtx] = useState<RepackContext>(initialCtx);
  const [ctxBusy, setCtxBusy] = useState(false);

  const [form, setForm] = useState<RepackForm>(initialForm ?? { header: emptyHeader(), items: [] });
  const [errors, setErrors] = useState<Errors>({});
  const [editing, setEditing] = useState<{ item: RepackItem; isNew: boolean } | null>(null);
  const [picker, setPicker] = useState<LookupKind | null>(null);
  const [ctxErr, setCtxErr] = useState<Partial<Record<'property' | 'year' | 'store', string>>>({});
  const [vouBusy, setVouBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  // server rule (modify_data / delete_data): cartons already re-packed → no changes
  const locked = (form.meta?.isRepack ?? 0) > 0;
  const canWrite = mode === 'add' ? rights.add : mode === 'edit' ? rights.edit && !locked : false;
  const readOnly = !canWrite;

  const h = form.header;
  const totals = useMemo(() => formTotals(form.items), [form.items]);
  const dirty = !readOnly && (form.items.length > 0 || !!h.remarks || !!h.stockType || !!h.department);

  const setHeader = (patch: Partial<RepackForm['header']>) => {
    setForm(f => ({ ...f, header: { ...f.header, ...patch } }));
    setErrors(e => {
      const n = { ...e };
      Object.keys(patch).forEach(k => delete n[k]);
      return n;
    });
  };

  // own series (MAX + 1 per property + store) — new entries only, reloaded when property / year / store change
  const loadVoucher = useCallback(async (date: string) => {
    if (mode !== 'add' || !isValidDMY(date)) return;
    setVouBusy(true);
    try {
      const v = await service.nextVoucher(ctx, date);
      setHeader({ vouPrefix: v.prefix, vouNo: v.no, vouSuffix: v.suffix });
    } catch (e: any) {
      setErrors(er => ({ ...er, vouNo: e?.message || 'Unable to get voucher no.' }));
    } finally {
      setVouBusy(false);
    }
  }, [ctx, service, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!canWrite || mode !== 'add') return;
    const t = setTimeout(() => loadVoucher(h.vouDate), 400);
    return () => clearTimeout(t);
  }, [h.vouDate, loadVoucher, canWrite, mode]);

  // user typed / changed the voucher no. or suffix → check it with /checkvoucherno
  const lastChecked = React.useRef('');
  const checkTypedVoucher = async () => {
    const no = h.vouNo.trim();
    const sig = `${h.vouDate}|${no}|${h.vouSuffix}`;
    if (mode !== 'add' || !no || !isValidDMY(h.vouDate) || sig === lastChecked.current) return;
    lastChecked.current = sig;
    setVouBusy(true);
    try {
      const v = await service.nextVoucher(ctx, h.vouDate, { no, suffix: h.vouSuffix });
      setHeader({ vouPrefix: v.prefix, vouNo: v.no, vouSuffix: v.suffix });
      lastChecked.current = `${h.vouDate}|${v.no}|${v.suffix}`;
    } catch (e: any) {
      setErrors(er => ({ ...er, vouNo: e?.message || 'Invalid voucher number.' }));
    } finally {
      setVouBusy(false);
    }
  };

  /* ---------- Property / Year / Store ---------- */
  const nameOf = async (kind: 'property' | 'year' | 'store', c: RepackContext, code: string) => {
    try {
      const list = await service.lookup(kind, c);
      return { list, hit: list.find(o => o.code === code) };
    } catch {
      return { list: [] as LookupOption[], hit: undefined };
    }
  };

  // show names (session only carries codes)
  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, y, s] = await Promise.all([
        nameOf('property', ctx, ctx.prpCode),
        nameOf('year', ctx, String(ctx.yearNo)),
        nameOf('store', ctx, ctx.strCode),
      ]);
      if (!alive) return;
      setCtx(c => ({
        ...c,
        prpName: p.hit?.name || c.prpName,
        yearLabel: y.hit?.name || c.yearLabel,
        strName: s.hit?.name || c.strName,
      }));
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmContextChange = async () =>
    form.items.length === 0 ||
    (await confirmAsync('Change selection?', 'Items and cartons entered for the current property / year / store will be cleared.', 'Change', true));

  const applyContext = (next: RepackContext) => {
    setCtx(next);
    setCtxErr({});
    setForm(f => ({ ...f, items: [], header: { ...f.header, vouPrefix: '', vouNo: '', vouSuffix: '', department: null } }));
  };

  const pickContext = async (kind: 'property' | 'year' | 'store', o: LookupOption) => {
    setPicker(null);
    const same =
      (kind === 'property' && o.code === ctx.prpCode) ||
      (kind === 'year' && o.code === String(ctx.yearNo)) ||
      (kind === 'store' && o.code === ctx.strCode);
    if (same || !(await confirmContextChange())) return;

    if (kind === 'year') return applyContext({ ...ctx, yearNo: Number(o.code) || 0, yearLabel: o.name });
    if (kind === 'store') return applyContext({ ...ctx, strCode: o.code, strName: o.name });

    // property changed → keep year / store when the new property has them, else pick / ask
    setCtxBusy(true);
    try {
      const base: RepackContext = { ...ctx, prpCode: o.code, prpName: o.name };
      const [y, s] = await Promise.all([nameOf('year', base, String(ctx.yearNo)), nameOf('store', base, ctx.strCode)]);
      const year = y.hit ?? y.list[0];
      applyContext({
        ...base,
        yearNo: year ? Number(year.code) || 0 : 0,
        yearLabel: year?.name ?? '',
        strCode: s.hit?.code ?? '',
        strName: s.hit?.name ?? '',
      });
      if (!s.hit) setCtxErr({ store: 'Select store for this property' });
    } finally {
      setCtxBusy(false);
    }
  };

  const openNew = () => {
    if (!ctx.strCode) {
      setCtxErr({ store: 'Select store first' });
      return;
    }
    setEditing({ item: emptyItem(form.items.length + 1), isNew: true });
  };

  const saveItem = (it: RepackItem) => {
    setForm(f => {
      const exists = f.items.some(x => x.key === it.key);
      const items = exists ? f.items.map(x => (x.key === it.key ? it : x)) : [...f.items, it];
      return { ...f, items: items.map((x, i) => ({ ...x, srNo: i + 1 })) };
    });
    setErrors(e => { const n = { ...e }; delete n.items; return n; });
    setEditing(null);
  };

  const removeItem = async (it: RepackItem) => {
    const ok = await confirmAsync('Remove item', `Remove item #${it.srNo} ${it.item?.name ?? ''} with ${it.cartons.length} carton(s)?`, 'Remove', true);
    if (ok) setForm(f => ({ ...f, items: f.items.filter(x => x.key !== it.key).map((x, i) => ({ ...x, srNo: i + 1 })) }));
  };

  const reset = () => {
    setForm({ header: emptyHeader(), items: [] });
    setErrors({});
  };

  const save = async () => {
    if (!canWrite) return;
    const e = validateHeader(h);
    if (!ctx.prpCode) e.property = 'Select property';
    else if (!ctx.yearNo) e.year = 'Select year';
    else if (!ctx.strCode) e.store = 'Select store';
    if (e.property || e.year || e.store) setCtxErr({ property: e.property, year: e.year, store: e.store });
    if (!form.items.length) e.items = 'Add at least one item';
    setErrors(e);
    if (Object.keys(e).length) {
      notify('Check entry', Object.values(e)[0]);
      return;
    }
    const summary =
      `${totals.items} item(s), ${totals.cartons} carton(s)\n` +
      `Qty ${fmt3(totals.qty)}  •  Wt ${fmt3(totals.wt)}\n` +
      `${STOCK_TYPES.find(s => s.value === h.stockType)?.label} • ${h.department?.name}`;
    if (!(await confirmAsync('Save repacking issue?', summary, 'Save'))) return;

    setSaving(true);
    try {
      const r = await service.save(ctx, form);
      if (!r.ok) {
        notify('Not saved', r.message);
        return;
      }
      await notify('Saved', r.message);
      if (onSaved) onSaved(r.uid);
      else {
        reset();
        loadVoucher(todayDMY());
      }
    } catch (err: any) {
      notify('Not saved', err?.message || 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!dirty) return onCancel?.();
    if (await confirmAsync('Discard entry?', 'All items and cartons on this screen will be lost.', 'Discard', true)) {
      onCancel ? onCancel() : reset();
    }
  };

  /* ---------------- sections ---------------- */
  const contextCard = (
    <Card style={st.ctxCard}>
      <View style={[st.ctxRow, isPhone && { flexDirection: 'column', gap: 0 }]}>
        <Field label="Property" required error={ctxErr.property} style={!isPhone ? { flex: 2 } : undefined}>
          <SelectBox
            icon="apartment"
            value={ctx.prpName}
            code={ctx.prpName !== ctx.prpCode ? ctx.prpCode : undefined}
            placeholder="Select property"
            onPress={() => setPicker('property')}
            invalid={!!ctxErr.property}
            disabled={readOnly || mode !== 'add' || ctxBusy}
          />
        </Field>
        <View style={{ flex: isPhone ? undefined : 1.6, flexDirection: 'row', gap: SP.md }}>
          <Field label="Year" required error={ctxErr.year}>
            <SelectBox
              icon="event"
              value={ctx.yearLabel}
              placeholder="Select year"
              onPress={() => setPicker('year')}
              invalid={!!ctxErr.year}
              disabled={readOnly || mode !== 'add' || ctxBusy || !ctx.prpCode}
            />
          </Field>
          <Field label="Store" required error={ctxErr.store}>
            <SelectBox
              icon="warehouse"
              value={ctx.strName}
              code={ctx.strName && ctx.strName !== ctx.strCode ? ctx.strCode : undefined}
              placeholder="Select store"
              onPress={() => setPicker('store')}
              invalid={!!ctxErr.store}
              disabled={readOnly || mode !== 'add' || ctxBusy || !ctx.prpCode}
            />
          </Field>
        </View>
      </View>
      {mode !== 'add' ? <View style={st.modeChip}><Text style={st.modeTxt}>{mode === 'edit' ? 'EDIT' : 'VIEW'}</Text></View> : null}
    </Card>
  );

  const voucherCard = (
    <Card step={1} title="Voucher">
      <View style={isPhone ? undefined : { flexDirection: 'row', gap: SP.md }}>
        <Field label="Vou. Date" required error={errors.vouDate}>
          <View style={{ flexDirection: 'row', gap: SP.sm }}>
            <Input
              value={h.vouDate}
              onChangeText={t => setHeader({ vouDate: maskDMY(t) })}
              keyboardType="number-pad"
              placeholder="dd-mm-yyyy"
              maxLength={10}
              invalid={!!errors.vouDate}
              editable={!readOnly && mode === 'add'}
              style={{ flex: 1 }}
            />
            {!readOnly && mode === 'add' && h.vouDate !== todayDMY() ? (
              <Btn small kind="ghost" title="Today" onPress={() => setHeader({ vouDate: todayDMY() })} />
            ) : null}
          </View>
        </Field>
        <Field label="Vou. No" required error={errors.vouNo}>
          <View style={st.vouRow}>
            {/* prefix / suffix only when the series uses them (server decides) */}
            {h.vouPrefix ? (
              <View style={st.vouPart}><Text style={st.vouPartTxt}>{h.vouPrefix}</Text></View>
            ) : null}
            <Input
              value={h.vouNo}
              onChangeText={t => setHeader({ vouNo: t.replace(/[^0-9]/g, '').slice(0, 10) })}
              onBlur={checkTypedVoucher}
              onSubmitEditing={checkTypedVoucher}
              keyboardType="number-pad"
              placeholder="Auto"
              maxLength={10}
              invalid={!!errors.vouNo}
              editable={!readOnly && mode === 'add' && !vouBusy}
              style={st.vouNo}
            />
            {h.vouSuffix ? (
              <View style={st.vouPart}><Text style={st.vouPartTxt}>{h.vouSuffix}</Text></View>
            ) : null}
            {vouBusy ? <ActivityIndicator color={C.cta} style={{ marginLeft: 4 }} /> : null}
          </View>
        </Field>
      </View>

      <Field label="Stock Type" required error={errors.stockType}>
        <Segmented options={STOCK_TYPES} value={h.stockType} onChange={v => setHeader({ stockType: v })} invalid={!!errors.stockType} disabled={readOnly} />
      </Field>

      <Field label="Department" required error={errors.department}>
        <SelectBox
          icon="groups"
          value={h.department?.name}
          code={h.department?.code}
          placeholder="Select department"
          onPress={() => setPicker('department')}
          invalid={!!errors.department}
          disabled={readOnly}
        />
      </Field>

      <Field label="Remarks" required error={errors.remarks} hint={`${h.remarks.length}/${REMARK_MAX}`}>
        <Input
          value={h.remarks}
          onChangeText={t => setHeader({ remarks: t })}
          placeholder="Reason / reference"
          invalid={!!errors.remarks}
          maxLength={REMARK_MAX}
          multiline
          editable={!readOnly}
          style={{ minHeight: 64, paddingTop: 12, textAlignVertical: 'top' }}
        />
      </Field>
    </Card>
  );

  const itemsCard = (
    <Card
      step={2}
      title={`Items${form.items.length ? ` (${form.items.length})` : ''}`}
      right={!readOnly ? <Btn small kind="dark" icon="add" title="Add Item" onPress={openNew} /> : null}>
      {errors.items ? <Text style={st.err}>{errors.items}</Text> : null}
      {form.items.length === 0 ? (
        readOnly ? (
          <Text style={st.emptyHint}>No items</Text>
        ) : (
          <Pressable onPress={openNew} style={st.empty}>
            <Icon name="add-circle-outline" size={30} color={C.cta} />
            <Text style={st.emptyTxt}>No items yet</Text>
            <Text style={st.emptyHint}>Add the first item and scan its cartons</Text>
          </Pressable>
        )
      ) : (
        <View style={!isPhone ? st.grid : undefined}>
          {form.items.map(it => (
            <Pressable
              key={it.key}
              onPress={() => setEditing({ item: it, isNew: false })}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                st.item, !isPhone && st.itemGrid, hovered && { borderColor: C.cta }, pressed && { opacity: 0.85 }
              ]}>
              <View style={st.itemTop}>
                <View style={st.sn}><Text style={st.snTxt}>{it.srNo}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.itemName} numberOfLines={1}>{it.item?.name}</Text>
                  <Text style={st.itemMeta} numberOfLines={2}>
                    {[it.merge?.name, it.grade?.name, it.shade?.name, it.denier && `Den ${it.denier}`].filter(Boolean).join('  •  ')}
                  </Text>
                </View>
                {!readOnly ? (
                  <Pressable onPress={() => removeItem(it)} hitSlop={10} accessibilityLabel={`Remove item ${it.srNo}`}>
                    <Icon name="delete-outline" size={20} color={C.danger} />
                  </Pressable>
                ) : null}
              </View>
              <View style={st.itemStats}>
                <Stat label="Cartons" value={String(it.cartons.length)} />
                <Stat label="Pieces" value={String(toNum(it.pieces))} />
                <Stat label={`Qty${it.uom ? ` ${it.uom}` : ''}`} value={fmt3(toNum(it.qty))} strong />
                <Stat label="Wt" value={fmt3(toNum(it.wt))} />
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );

  const wrap = { width: '100%' as const, maxWidth: 1280, alignSelf: 'center' as const };

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: SP.md, paddingBottom: SP.xl }} keyboardShouldPersistTaps="handled">
        <View style={wrap}>
          {contextCard}
          {mode !== 'add' && locked ? (
            <Banner text="Cartons of this voucher are already re-packed — it can't be changed or deleted." />
          ) : mode !== 'view' && readOnly ? (
            <Banner text={`View only — you don't have ${mode === 'edit' ? 'edit' : 'add'} permission for Repacking Issue.`} />
          ) : null}
          {isDesktop ? (
            <View style={{ flexDirection: 'row', gap: SP.md, alignItems: 'flex-start' }}>
              <View style={{ width: 420 }}>{voucherCard}</View>
              <View style={{ flex: 1, minWidth: 0 }}>{itemsCard}</View>
            </View>
          ) : (
            <>
              {voucherCard}
              {itemsCard}
            </>
          )}
        </View>
      </ScrollView>

      <View style={st.footer}>
        <View style={[wrap, !isPhone ? st.footerRow : { gap: SP.sm }]}>
          <View style={[st.totals, !isPhone && { flex: 1 }]}>
            <Stat label="Items" value={String(totals.items)} />
            <Stat label="Cartons" value={String(totals.cartons)} />
            <Stat label="Qty" value={fmt3(totals.qty)} strong />
            <Stat label="Wt" value={fmt3(totals.wt)} />
          </View>
          <View style={[{ flexDirection: 'row', gap: SP.sm }, !isPhone && { width: 340 }]}>
            <Btn kind="ghost" title={readOnly ? 'Close' : 'Cancel'} onPress={cancel} style={{ flex: 1 }} />
            {!readOnly ? <Btn title={mode === 'edit' ? 'Update' : 'Save'} icon="save" onPress={save} loading={saving} style={{ flex: 2 }} /> : null}
          </View>
        </View>
      </View>

      {editing ? (
        <ItemEntrySheet
          visible
          initial={editing.item}
          isNew={editing.isNew}
          blocked={cartonsInOtherItems(form.items, editing.item.key)}
          ctx={ctx}
          service={service}
          vouDate={form.header.vouDate}
          readOnly={readOnly}
          canScan={rights.scan}
          canRemove={rights.removeCarton}
          onSave={saveItem}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <MasterPicker
        kind={picker}
        ctx={ctx}
        service={service}
        selected={
          picker === 'property' ? ctx.prpCode : picker === 'year' ? String(ctx.yearNo) : picker === 'store' ? ctx.strCode : h.department?.code
        }
        onPick={(k: LookupKind, o: LookupOption) => {
          if (k === 'property' || k === 'year' || k === 'store') pickContext(k, o);
          else {
            setHeader({ department: o });
            setPicker(null);
          }
        }}
        onClose={() => setPicker(null)}
      />
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  ctxCard: { paddingBottom: SP.xs },
  ctxRow: { flexDirection: 'row', gap: SP.md },
  modeChip: { position: 'absolute', top: SP.sm, right: SP.sm, backgroundColor: C.nav, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  modeTxt: { fontSize: 11, fontWeight: '800', color: C.onNav, letterSpacing: 0.8 },
  vouRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vouPart: { minHeight: 44, minWidth: 44, borderWidth: 1, borderColor: C.line, borderRadius: R.md, backgroundColor: C.track, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SP.sm },
  vouPartTxt: { fontSize: 15, fontWeight: '800', color: C.muted, fontVariant: ['tabular-nums'] },
  vouNo: { flex: 1, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  err: { color: C.danger, marginBottom: SP.sm, fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: SP.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, borderRadius: R.md },
  emptyTxt: { fontSize: 15, fontWeight: '800', color: C.nav, marginTop: 4 },
  emptyHint: { fontSize: 12, color: C.muted, marginTop: 2, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
  item: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: SP.md, marginBottom: SP.sm, backgroundColor: C.card },
  itemGrid: { flexBasis: '48%', flexGrow: 1, marginBottom: 0 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.md },
  sn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.ctaSoft, alignItems: 'center', justifyContent: 'center' },
  snTxt: { color: C.cta, fontWeight: '800', fontSize: 13 },
  itemName: { fontSize: 15, fontWeight: '800', color: C.nav },
  itemMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  itemStats: { flexDirection: 'row', marginTop: SP.md, paddingTop: SP.sm, borderTopWidth: 1, borderColor: C.hair },
  more: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moreTxt: { fontSize: 15, fontWeight: '800', color: C.nav },
  footer: { padding: SP.md, backgroundColor: C.card, borderTopWidth: 1, borderColor: C.line },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: SP.lg },
  totals: { flexDirection: 'row' }
});
