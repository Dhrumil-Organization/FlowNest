// FILE: src/features/repacking/components/RepackingForm.tsx
// Repacking entry, as the desktop: it is written on the Repacking Issue's own POYProd row.
//  1. pick a Repacking Issue (voucher no. / date are the issue's)
//  2. ONE repacked item (header) for the whole issue — defaulted from the issue's first item; the issue's items
//     are shown for reference
//  3. taka: Manual (default) typed like the desktop grid, or Auto from the issue's cartons (rename them)
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RepackingService } from '@/src/api/repackingAPI';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import { confirmAsync, notify } from '../../repackingIssue/dialog';
import { fmt3 } from '../../repackingIssue/logic';
import { C, R, SP } from '../../repackingIssue/theme';
import { MasterPicker } from '../../repackingIssue/components/MasterPicker';
import { Banner, Btn, Card, Field, Input, ReadOnly, Row, Segmented, SelectBox, Stat } from '../../repackingIssue/components/ui';
import {
  autoCartons, balanceOf, emptyForm, EPS, Errors, itemsFromIssue, itemTotals, REMARK_MAX, renumberItems, shortItems,
  validateHeader, validateItem,
} from '../logic';
import { PACK_TYPES } from '../types';
import type { IssueSummary, Opt, RepackContext, RepackMasters, RpForm, RpItem, RpRights } from '../types';
import { IssuePicker } from './IssuePicker';
import { OptionPicker } from './OptionPicker';
import { RepackItemSheet } from './RepackItemSheet';

export interface RepackingFormProps {
  ctx: RepackContext;
  service: RepackingService;
  rights: RpRights;
  mode?: 'add' | 'edit' | 'view';
  initialForm?: RpForm;
  onSaved?: () => void;
  onCancel?: () => void;
}

const STK: Record<string, string> = { I: 'In House', P: 'Process House' };

export function RepackingForm({ ctx, service, rights, mode = 'add', initialForm, onSaved, onCancel }: RepackingFormProps) {
  const { isPhone, isDesktop } = useDeviceClass();
  const [form, setForm] = useState<RpForm>(() => initialForm ?? emptyForm());
  const [masters, setMasters] = useState<RepackMasters | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [picker, setPicker] = useState<'issue' | 'party' | 'department' | null>(null);
  const [editing, setEditing] = useState<{ item: RpItem } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingIssue, setLoadingIssue] = useState(false);
  const [seriesStart, setSeriesStart] = useState('');

  const locked = (form.meta?.used ?? 0) > 0;
  const canWrite = mode === 'add' ? rights.add : mode === 'edit' ? rights.edit && !locked : false;
  const readOnly = !canWrite;
  const h = form.header;
  const item = form.items[0] ?? null;
  const tot = item ? itemTotals(item) : { pcs: 0, qty: 0, weight: 0, gross: 0, tare: 0, meters: 0 };
  const issDpt = form.issue?.summary.dptCode ?? '';

  /* ---- masters ---- */
  useEffect(() => {
    let alive = true;
    service.masters(ctx)
      .then(m => {
        if (!alive) return;
        setMasters(m);
        if (m.errors.length) notify('Some lists did not load', m.errors.join('\n'));
      })
      .catch(e => notify('Lists', e?.message || 'Could not load the lists.'));
    return () => { alive = false; };
  }, [service, ctx.prpCode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- department name (code from the issue row) ---- */
  const dptCode = h.department?.code ?? '';
  useEffect(() => {
    let alive = true;
    if (!dptCode || (h.department && h.department.name !== h.department.code)) return;
    service.lookup('department', ctx)
      .then(list => {
        const hit = list.find(o => o.code === dptCode);
        if (alive && hit) setForm(f => ({ ...f, header: { ...f.header, department: hit } }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [dptCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const setHeader = (patch: Partial<RpForm['header']>) => {
    setForm(f => ({ ...f, header: { ...f.header, ...patch } }));
    setErrors(e => {
      const n = { ...e };
      Object.keys(patch).forEach(k => delete n[k]);
      return n;
    });
  };

  /* ---- issue ---- */
  const applyIssue = useCallback(async (s: IssueSummary, auto: boolean) => {
    setLoadingIssue(true);
    try {
      const [detail, m] = await Promise.all([service.issueDetail(ctx, s.uid), masters ? Promise.resolve(masters) : service.masters(ctx)]);
      setMasters(m);
      setForm(f => ({
        ...f,
        issue: detail,
        items: itemsFromIssue(detail, m, auto),
        header: {
          ...f.header,
          auto,
          vouDate: detail.summary.date,
          vouPrefix: '',
          vouNo: detail.summary.vouNo,
          vouSuffix: '',
          remark: detail.summary.remark.slice(0, REMARK_MAX),
          department: detail.summary.dptCode ? { code: detail.summary.dptCode, name: detail.summary.dptCode } : null,
        },
      }));
      setErrors({});
    } catch (e: any) {
      notify('Repacking Issue', e?.message || 'Could not load the issue.');
    } finally {
      setLoadingIssue(false);
    }
  }, [service, ctx, masters]);

  const pickIssue = async (s: IssueSummary) => {
    setPicker(null);
    if (form.issue?.summary.uid === s.uid) return;
    if (item?.cartons.length && !(await confirmAsync('Change Repacking Issue?', 'The taka entered so far will be removed.', 'Change', true))) return;
    applyIssue(s, h.auto);
  };

  const setMode = async (auto: boolean) => {
    if (auto === h.auto) return;
    if (item?.cartons.length && !(await confirmAsync(auto ? 'Switch to Auto Entry?' : 'Switch to Manual?', auto ? 'Taka entered so far will be replaced by the issue cartons.' : 'The issue cartons will be removed — you type the taka.', 'Switch', true))) return;
    setForm(f => ({
      ...f,
      header: { ...f.header, auto },
      items: f.items.map(it => ({ ...it, cartons: auto && f.issue ? autoCartons(f.issue) : [] })),
    }));
  };

  /** Auto Entry: new taka series for all taka */
  const applySeries = () => {
    const items = renumberItems(form.items, seriesStart);
    if (!items) return notify('Taka series', 'Enter the first taka no. ending with a number, e.g. TEST10001.');
    setForm(f => ({ ...f, items }));
    setErrors({});
  };

  const saveItem = (it: RpItem) => {
    setForm(f => ({ ...f, items: [it] }));
    setErrors(e => { const n = { ...e }; delete n.item0; return n; });
    setEditing(null);
  };

  /* ---- save ---- */
  const save = async () => {
    const e = validateHeader(form);
    if (item) {
      const first = Object.values(validateItem(item, new Set()))[0];
      if (first) e.item0 = first;
    }
    setErrors(e);
    if (Object.keys(e).length) return notify('Check entry', Object.values(e).slice(0, 4).join('\n'));
    if (shortItems(form).length && item) {
      const b = balanceOf(item);
      const lines = [
        b.qty > EPS ? `Meters / pcs ${fmt3(b.qty)} not repacked (issue ${fmt3(item.issQty)}).` : '',
        Math.abs(b.weight) > EPS ? `Weight is ${fmt3(tot.weight)} — issue ${fmt3(item.issWt)} (${b.weight > 0 ? 'less' : 'more'} by ${fmt3(Math.abs(b.weight))}).` : '',
      ].filter(Boolean);
      if (!(await confirmAsync('Taka differ from the issue', `${lines.join('\n')}\n\nSave anyway?`, 'Save', false))) return;
    }
    setSaving(true);
    try {
      const r = await service.save(ctx, form);
      if (!r.ok) return notify('Not saved', r.message);
      notify('Saved', r.message);
      if (onSaved) onSaved();
      else setForm(emptyForm());
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!readOnly && item?.cartons.length && !(await confirmAsync('Discard entry?', 'Changes will be lost.', 'Discard', true))) return;
    onCancel?.();
  };

  /* ---- render ---- */
  const issueCard = (
    <Card step={1} title="Repacking Issue" right={form.issue && mode === 'add' && !readOnly ? (
      <Btn small kind="ghost" icon="swap-horiz" title="Change" onPress={() => setPicker('issue')} />
    ) : null}>
      {loadingIssue ? (
        <View style={st.empty}><ActivityIndicator color={C.cta} /><Text style={st.emptyHint}>Loading issue…</Text></View>
      ) : !form.issue ? (
        <Pressable onPress={() => !readOnly && setPicker('issue')} style={[st.empty, errors.issue && { borderColor: C.danger }]} accessibilityRole="button">
          <Icon name="playlist-add" size={30} color={C.cta} />
          <Text style={st.emptyTxt}>Select Repacking Issue</Text>
          <Text style={st.emptyHint}>Only issues that are not repacked yet are listed</Text>
        </Pressable>
      ) : (
        <View>
          <View style={st.issTop}>
            <View style={{ flex: 1 }}>
              <Text style={st.lbl}>Vou. No</Text>
              <Text style={st.issNo}>{h.vouNo || form.issue.summary.vouNo}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={st.lbl}>Date</Text>
              <Text style={st.issDate}>{h.vouDate || form.issue.summary.date}</Text>
            </View>
          </View>
          <View style={st.issStats}>
            <Stat label="Items" value={String(form.issue.items.length)} />
            <Stat label="Cartons" value={String(form.issue.cartons.length)} />
            <Stat label="Mtr / Pcs" value={fmt3(item?.issQty ?? 0)} strong />
            <Stat label="Wt" value={fmt3(item?.issWt ?? 0)} />
          </View>
          {form.issue.items.map(ii => (
            <View key={ii.srNo} style={st.issItem}>
              <Text style={st.issItemNo}>{ii.srNo}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.issItemName} numberOfLines={1}>{ii.item?.name || '—'}</Text>
                <Text style={st.itemMeta} numberOfLines={1}>{[ii.merge?.name, ii.grade?.name, ii.shade?.name].filter(Boolean).join('  •  ')}</Text>
              </View>
              <Text style={st.issItemQty}>{ii.totPcs} pcs{'\n'}{fmt3(ii.totWt)}</Text>
            </View>
          ))}
          <Row>
            <Field label="Stock Type" hint="From the issue">
              <ReadOnly value={STK[form.issue.summary.stkType] ?? form.issue.summary.stkType} placeholder="—" />
            </Field>
            <Field label="Department" hint={issDpt ? 'From the issue' : undefined} error={errors.department}>
              {issDpt || readOnly ? (
                <ReadOnly value={h.department?.name ?? ''} placeholder="—" />
              ) : (
                <SelectBox value={h.department?.name} code={h.department?.code} placeholder="Select" onPress={() => setPicker('department')} />
              )}
            </Field>
          </Row>
        </View>
      )}
    </Card>
  );

  const voucherCard = (
    <Card step={3} title="Repacking">
      <Field label="Party Name" hint="Optional" error={errors.party}>
        <SelectBox icon="business" value={h.party?.name} code={h.party?.code} placeholder="Select party" onPress={() => setPicker('party')} disabled={readOnly} />
      </Field>
      <Field label="Entry" hint={h.auto ? 'Issue cartons are filled in — rename them' : 'Type each taka (like the desktop)'}>
        <Segmented
          options={[{ value: 'manual', label: 'Manual', hint: 'Type taka' }, { value: 'auto', label: 'Auto', hint: 'Issue cartons' }]}
          value={h.auto ? 'auto' : 'manual'}
          onChange={v => setMode(v === 'auto')}
          disabled={readOnly || mode !== 'add'}
        />
      </Field>
      <Field label="Remark" error={errors.remark} hint={`${h.remark.length}/${REMARK_MAX}`}>
        <Input value={h.remark} onChangeText={t => setHeader({ remark: t })} maxLength={REMARK_MAX} editable={!readOnly} placeholder="Remark" />
      </Field>
    </Card>
  );

  const pending = !!item && h.auto && item.cartons.some(c => c.origCartNo && c.cartNo.trim().toUpperCase() === c.origCartNo.trim().toUpperCase());
  const b = item ? balanceOf(item) : { qty: 0, weight: 0 };
  const itemCard = (
    <Card step={2} title="Repacked Item">
      {!item ? (
        <Pressable onPress={!readOnly ? () => setPicker('issue') : undefined} style={st.empty} accessibilityRole="button">
          <Icon name="inventory-2" size={28} color={C.cta} />
          <Text style={st.emptyTxt}>Select a Repacking Issue first</Text>
          <Text style={st.emptyHint}>The repacked item starts as the issue's first item — change item, merge, grade or shade if needed.</Text>
        </Pressable>
      ) : (
        <>
          {h.auto && !readOnly && rights.cartons && item.cartons.length ? (
            <View style={st.series}>
              <Icon name="format-list-numbered" size={18} color={C.nav} />
              <Text style={st.seriesTxt}>New taka series from</Text>
              <View style={{ flex: 1, minWidth: 140 }}>
                <Input value={seriesStart} onChangeText={t => setSeriesStart(t.toUpperCase())} placeholder="e.g. TEST10001" autoCapitalize="characters" autoCorrect={false} onSubmitEditing={applySeries} />
              </View>
              <Btn small kind="dark" icon="done-all" title="Apply" onPress={applySeries} />
            </View>
          ) : null}
          <Pressable onPress={() => setEditing({ item })} style={[st.item, !!errors.item0 && { borderColor: C.danger }]} accessibilityRole="button">
            <View style={st.itemTop}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.itemName} numberOfLines={1}>{item.item?.name || 'Select item'}</Text>
                <Text style={st.itemMeta} numberOfLines={2}>
                  {[item.merge?.name, item.grade?.name, item.shade?.name, item.denier && `Den ${item.denier}`].filter(Boolean).join('  •  ')}
                </Text>
                <Text style={st.itemMeta} numberOfLines={1}>
                  {[PACK_TYPES.find(p => p.code === item.packType)?.name ?? item.packType, item.prodType?.name, item.checker && `Chk ${item.checker.name}`].filter(Boolean).join('  •  ')}
                </Text>
              </View>
              <View style={st.openBtn}><Text style={st.openTxt}>{readOnly ? 'View taka' : item.cartons.length ? 'Edit taka' : 'Enter taka'}</Text><Icon name="chevron-right" size={20} color={C.cta} /></View>
            </View>
            {!readOnly && (pending || !item.cartons.length) ? (
              <View style={st.todo}><Icon name="edit" size={14} color={C.cta} /><Text style={st.todoTxt}>{item.cartons.length ? 'Rename the taka' : 'Enter the taka'}</Text></View>
            ) : null}
            {errors.item0 ? <Text style={st.err} numberOfLines={2}>{errors.item0}</Text> : null}
            <View style={st.itemStats}>
              <Stat label="Taka" value={String(tot.pcs)} />
              <Stat label="Mtr / Pcs" value={fmt3(tot.qty)} strong />
              <Stat label="Wt" value={fmt3(tot.weight)} />
              <Stat label="Bal. Mtr/Pcs" value={fmt3(b.qty)} />
              <Stat label="Wt diff." value={fmt3(-b.weight)} />
            </View>
          </Pressable>
        </>
      )}
    </Card>
  );

  const wrap = { width: '100%' as const, maxWidth: 1280, alignSelf: 'center' as const };
  const ctxLine = `${ctx.prpName}  •  ${ctx.yearLabel}  •  ${ctx.strName}`;

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: SP.md, paddingBottom: SP.xl }} keyboardShouldPersistTaps="handled">
        <View style={wrap}>
          <View style={st.ctx}>
            <Icon name="warehouse" size={16} color={C.cta} />
            <Text style={st.ctxTxt} numberOfLines={1}>{ctxLine}</Text>
            <View style={st.modeChip}><Text style={st.modeTxt}>{mode.toUpperCase()}</Text></View>
          </View>
          {mode !== 'add' && locked ? (
            <Banner text="Taka of this Repacking are already used — it can't be changed or deleted." />
          ) : mode !== 'view' && readOnly ? (
            <Banner text={`View only — you don't have ${mode === 'edit' ? 'edit' : 'add'} permission for Repacking.`} />
          ) : null}
          {isDesktop ? (
            <View style={{ flexDirection: 'row', gap: SP.md, alignItems: 'flex-start' }}>
              <View style={{ width: 440 }}>{issueCard}</View>
              <View style={{ flex: 1, minWidth: 0 }}>{itemCard}{voucherCard}</View>
            </View>
          ) : (
            <>
              {issueCard}
              {itemCard}
              {voucherCard}
            </>
          )}
        </View>
      </ScrollView>

      <View style={st.footer}>
        <View style={[wrap, !isPhone ? st.footerRow : { gap: SP.sm }]}>
          <View style={[st.totals, !isPhone && { flex: 1 }]}>
            <Stat label="Taka" value={String(tot.pcs)} />
            <Stat label={item ? `Mtr/Pcs / ${fmt3(item.issQty)}` : 'Mtr/Pcs'} value={fmt3(tot.qty)} strong />
            <Stat label={item ? `Wt / ${fmt3(item.issWt)}` : 'Wt'} value={fmt3(tot.weight)} />
          </View>
          <View style={[{ flexDirection: 'row', gap: SP.sm }, !isPhone && { width: 340 }]}>
            <Btn kind="ghost" title={readOnly ? 'Close' : 'Cancel'} onPress={cancel} style={{ flex: 1 }} />
            {!readOnly ? <Btn title={mode === 'edit' ? 'Update' : 'Save'} icon="save" onPress={save} loading={saving} style={{ flex: 2 }} /> : null}
          </View>
        </View>
      </View>

      {editing ? (
        <RepackItemSheet
          visible
          initial={editing.item}
          auto={h.auto}
          masters={masters}
          blocked={new Set()}
          ctx={ctx}
          service={service}
          readOnly={readOnly}
          canCartons={rights.cartons}
          canRemove={rights.removeCarton}
          onSave={saveItem}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <IssuePicker
        visible={picker === 'issue'}
        ctx={ctx}
        service={service}
        currentUid={form.issue?.summary.uid}
        onPick={pickIssue}
        onClose={() => setPicker(null)}
      />
      <OptionPicker
        visible={picker === 'party'}
        title="Party"
        search={(q: string): Promise<Opt[]> => service.parties(ctx, q)}
        selected={h.party?.code}
        onPick={o => { setPicker(null); setHeader({ party: o }); }}
        onClose={() => setPicker(null)}
      />
      <MasterPicker
        kind={picker === 'department' ? 'department' : null}
        ctx={ctx}
        service={service}
        selected={h.department?.code}
        onPick={(_k, o) => { setPicker(null); setHeader({ department: o }); }}
        onClose={() => setPicker(null)}
      />
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  ctx: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.xs, marginBottom: SP.md },
  ctxTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: C.nav },
  modeChip: { backgroundColor: C.nav, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  modeTxt: { fontSize: 11, fontWeight: '800', color: C.onNav, letterSpacing: 0.8 },
  lbl: { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  issTop: { flexDirection: 'row', gap: SP.md },
  issNo: { fontSize: 20, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'], marginTop: 2 },
  issDate: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 4, fontVariant: ['tabular-nums'] },
  issStats: { flexDirection: 'row', marginVertical: SP.md, paddingVertical: SP.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.hair },
  issItem: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingVertical: 6, borderBottomWidth: 1, borderColor: C.hair },
  issItemNo: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.track, textAlign: 'center', lineHeight: 22, fontSize: 11, fontWeight: '800', color: C.nav, overflow: 'hidden' },
  issItemName: { fontSize: 13, fontWeight: '700', color: C.ink },
  issItemQty: { fontSize: 12, color: C.nav, fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] },
  err: { color: C.danger, marginTop: SP.sm, fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: SP.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, borderRadius: R.md, gap: 2 },
  emptyTxt: { fontSize: 15, fontWeight: '800', color: C.nav, marginTop: 4 },
  emptyHint: { fontSize: 12, color: C.muted, marginTop: 2, textAlign: 'center', paddingHorizontal: SP.md },
  series: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SP.sm, padding: SP.sm, marginBottom: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.quiet },
  seriesTxt: { fontSize: 13, fontWeight: '700', color: C.nav },
  item: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: SP.md, backgroundColor: C.card },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.md },
  itemName: { fontSize: 16, fontWeight: '800', color: C.nav },
  itemMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: C.ctaSoft, borderRadius: 999, paddingLeft: SP.sm, paddingVertical: 4, paddingRight: 4 },
  openTxt: { fontSize: 12, fontWeight: '800', color: C.cta },
  todo: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: SP.sm, backgroundColor: C.ctaSoft, borderRadius: 999, paddingHorizontal: SP.sm, paddingVertical: 3 },
  todoTxt: { fontSize: 11, fontWeight: '800', color: C.cta },
  itemStats: { flexDirection: 'row', marginTop: SP.md, paddingTop: SP.sm, borderTopWidth: 1, borderColor: C.hair },
  footer: { padding: SP.md, backgroundColor: C.card, borderTopWidth: 1, borderColor: C.line },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: SP.lg },
  totals: { flexDirection: 'row' },
});
