// FILE: src/features/soProforma/components/ProformaForm.tsx
// Step 3: New / Edit proforma — qty per SO line (capped at the balance), quick 30% / 50% / Balance,
// Tax Detail (the Entry Type of the SO, % of the previous proforma), valid till, terms; Save / Save & Print.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import type { ProformaService } from '../../../api/soProformaAPI';
import { fmt2, fmtQ, num, r3 } from '../../beamInOut/logic';
import { TaxSheet } from '../../beamInOut/components/TaxSheet';
import type { TaxLine } from '../../beamInOut/types';
import { cleanDecimal, maskDMY } from '../../repackingIssue/logic';
import { C, LABEL, R, SP } from '../../repackingIssue/theme';
import { Banner, Btn, Card, Field, Input, ReadOnly } from '../../repackingIssue/components/ui';
import { QUICK_PCT, REMARK_MAX, lineAmount, lineBalance, mergeSavedTax, mergeTaxDefaults, piTotals, quickFill, validateProforma } from '../logic';
import type { Errors } from '../logic';
import type { PiContext, PiRights, Proforma, SalesOrder } from '../types';

export function ProformaForm({ ctx, so, service, rights, mode, initial, onSaved, onCancel, onPrint }: {
  ctx: PiContext;
  so: SalesOrder;
  service: ProformaService;
  rights: PiRights;
  mode: 'add' | 'edit' | 'view';
  initial: Proforma;
  onSaved: (p: Proforma, message: string, print: boolean, sameState: boolean | null) => void;
  onCancel: () => void;
  onPrint: (p: Proforma, sameState: boolean | null) => void;
}) {
  const { isPhone } = useDeviceClass();
  const readOnly = mode === 'view';
  const [p, setP] = useState<Proforma>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [sameState, setSameState] = useState<boolean | null>(null);
  const [taxBusy, setTaxBusy] = useState(false);
  const [taxNote, setTaxNote] = useState('');
  const [taxOpen, setTaxOpen] = useState(false);
  const [nextNo, setNextNo] = useState('');
  const [saving, setSaving] = useState<'' | 'save' | 'print'>('');
  const qtyRefs = useRef<Record<number, TextInput | null>>({});

  /* full tax structure + which GST applies (gettaxtable taxacc), next no.; saved values filled in when editing */
  useEffect(() => {
    let live = true;
    if (mode === 'add') service.nextNo(ctx, initial.date).then(n => live && setNextNo(n)).catch(() => undefined);
    setTaxBusy(true);
    service
      .taxDefaults(ctx, so)
      .then(d => {
        if (!live) return;
        setSameState(d.sameState);
        if (initial.tax.length || mode !== 'add') {
          setP(x => ({ ...x, tax: mergeSavedTax(d.lines, initial.tax) }));
          setTaxNote(!d.lines.length ? `Tax structure of entry type ${so.entType || '(blank)'} not found - showing the saved lines.` : '');
          return;
        }
        const lines = mergeTaxDefaults(d.lines, d.previous);
        setP(x => ({ ...x, tax: lines, remark: x.remark || d.remark }));
        setTaxNote(
          !lines.length
            ? `No tax lines for entry type ${so.entType || '(blank)'} - the proforma will be without tax.`
            : d.previous.length ? 'Tax % taken from the previous proforma of this Sales Order.' : '',
        );
      })
      .finally(() => live && setTaxBusy(false));
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const t = useMemo(() => piTotals(p, sameState), [p, sameState]);

  const set = (patch: Partial<Proforma>) => {
    setP(x => ({ ...x, ...patch }));
    setErrors(e => {
      const n = { ...e };
      Object.keys(patch).forEach(k => delete n[k]);
      return n;
    });
  };
  const setQty = (sr: number, v: string) => {
    setP(x => ({ ...x, lines: x.lines.map(l => (l.soSrNo === sr ? { ...l, qty: cleanDecimal(v, 3) } : l)) }));
    setErrors(e => {
      const n = { ...e };
      delete n[`q${sr}`];
      delete n.lines;
      return n;
    });
  };
  const fill = (how: number | 'balance' | 'clear') => {
    setP(x => ({ ...x, lines: quickFill(x.lines, how) }));
    setErrors({});
  };

  const save = async (print: boolean) => {
    const e = validateProforma(p);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(print ? 'print' : 'save');
    try {
      const res = await service.save(ctx, so, p, sameState);
      if (!res.ok || !res.proforma) {
        setErrors({ form: res.message });
        return;
      }
      onSaved(res.proforma, res.message, print, sameState);
    } finally {
      setSaving('');
    }
  };

  const chips = (
    <View style={[st.quick, isPhone && { justifyContent: 'flex-start' }]}>
      {QUICK_PCT.map(q => <Chip key={q} label={`${q}%`} onPress={() => fill(q)} />)}
      <Chip label="Balance" onPress={() => fill('balance')} />
      <Chip label="Clear" onPress={() => fill('clear')} muted />
    </View>
  );

  const qtyOrder = p.lines.filter(l => lineBalance(l) > 0 || num(l.qty) > 0).map(l => l.soSrNo);
  const nextQty = (sr: number) => {
    const i = qtyOrder.indexOf(sr);
    const n = qtyOrder[i + 1];
    if (n !== undefined) qtyRefs.current[n]?.focus();
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: isPhone ? SP.sm : SP.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {errors.form ? <View style={st.err}><Icon name="error-outline" size={18} color={C.danger} /><Text style={st.errTxt}>{errors.form}</Text></View> : null}
        {readOnly ? <Banner icon="visibility" text="View only." /> : null}

        <Card title="Proforma" step={1} right={isPhone ? undefined : <Text style={st.against}>Against SO {so.soNo} • {so.party || so.parCode}</Text>}>
          {isPhone ? <Text style={[st.against, { marginBottom: SP.sm }]}>Against SO {so.soNo} • {so.party || so.parCode}</Text> : null}
          <View style={[st.grid, isPhone && st.gridPhone]}>
            <Field label="Proforma No." style={isPhone ? undefined : st.cell} hint={mode === 'add' ? 'Given on save (next free no.)' : undefined}>
              <ReadOnly value={p.no || nextNo} placeholder="Auto" emphasis />
            </Field>
            <Field label="Date" required error={errors.date} style={isPhone ? undefined : st.cell}>
              <Input value={p.date} onChangeText={v => set({ date: maskDMY(v) })} placeholder="dd-mm-yyyy" keyboardType="number-pad" maxLength={10} editable={!readOnly} invalid={!!errors.date} />
            </Field>
            <Field label="Valid till" error={errors.validTill} style={isPhone ? undefined : st.cell} hint="Optional">
              <Input value={p.validTill} onChangeText={v => set({ validTill: maskDMY(v) })} placeholder="dd-mm-yyyy" keyboardType="number-pad" maxLength={10} editable={!readOnly} invalid={!!errors.validTill} />
            </Field>
          </View>
        </Card>

        <Card title="Qty in this proforma" step={2} right={!readOnly && !isPhone ? chips : undefined}>
          {!readOnly && isPhone ? <View style={{ marginBottom: SP.sm }}>{chips}</View> : null}
          {errors.lines ? <Text style={st.lineErr}>{errors.lines}</Text> : null}
          <View style={st.table}>
            {!isPhone ? (
              <View style={[st.tr, st.th]}>
                <Text style={[st.thTxt, { flex: 1 }]}>Item</Text>
                <Text style={[st.thTxt, st.cNum]}>Ordered</Text>
                <Text style={[st.thTxt, st.cNum]}>Balance</Text>
                <Text style={[st.thTxt, st.cQty, { textAlign: 'right' }]}>Qty</Text>
                <Text style={[st.thTxt, st.cNum]}>Rate</Text>
                <Text style={[st.thTxt, st.cAmt]}>Amount</Text>
              </View>
            ) : null}
            {p.lines.map((l, i) => {
              const bal = lineBalance(l);
              const err = errors[`q${l.soSrNo}`];
              const locked = readOnly || (bal <= 0 && !num(l.qty));
              const qtyInput = (
                <Input
                  ref={el => { qtyRefs.current[l.soSrNo] = el; }}
                  value={l.qty}
                  onChangeText={v => setQty(l.soSrNo, v)}
                  onSubmitEditing={() => nextQty(l.soSrNo)}
                  blurOnSubmit={false}
                  returnKeyType="next"
                  keyboardType="decimal-pad"
                  placeholder="0"
                  editable={!locked}
                  invalid={!!err}
                  selectTextOnFocus
                  style={st.inNum}
                />
              );
              if (isPhone) {
                return (
                  <View key={l.soSrNo} style={[st.pl, i > 0 && { borderTopWidth: 1, borderColor: C.line }, locked && !readOnly && { opacity: 0.5 }]}>
                    <Text style={st.item}>{l.name}</Text>
                    <Text style={st.sub}>Ordered {fmtQ(l.ordered)} • Balance <Text style={{ color: bal > 0 ? C.cta : C.muted, fontWeight: '800' }}>{fmtQ(bal)}</Text> • ₹ {fmt2(l.rate)}</Text>
                    <View style={st.plRow}>
                      <View style={{ flex: 1 }}>{qtyInput}</View>
                      <Text style={[st.num, st.b, { minWidth: 110, textAlign: 'right' }]}>₹ {fmt2(lineAmount(l))}</Text>
                    </View>
                    {err ? <Text style={st.lineErr}>{err}</Text> : null}
                  </View>
                );
              }
              return (
                <View key={l.soSrNo} style={[st.tr, i % 2 === 1 && { backgroundColor: C.quiet }, locked && !readOnly && { opacity: 0.5 }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.item} numberOfLines={2}>{l.name}</Text>
                    {err ? <Text style={st.lineErr}>{err}</Text> : null}
                  </View>
                  <Text style={[st.num, st.cNum]}>{fmtQ(l.ordered)}</Text>
                  <Text style={[st.num, st.cNum, { color: bal > 0 ? C.cta : C.muted }]}>{fmtQ(bal)}</Text>
                  <View style={st.cQty}>{qtyInput}</View>
                  <Text style={[st.num, st.cNum]}>{fmt2(l.rate)}</Text>
                  <Text style={[st.num, st.cAmt, st.b]}>{fmt2(lineAmount(l))}</Text>
                </View>
              );
            })}
          </View>

          <View style={st.after}>
            <Icon name="call-split" size={18} color={C.nav} />
            <Text style={st.afterTxt}>
              Ordered <Text style={st.b}>{fmtQ(t.ordered)}</Text>  •  other proformas <Text style={st.b}>{fmtQ(t.other)}</Text>  •  this one{' '}
              <Text style={[st.b, { color: C.cta }]}>{fmtQ(t.qty)}</Text>  →  left on the SO after this <Text style={st.b}>{fmtQ(t.after)}</Text>
            </Text>
          </View>
        </Card>

        <Card title="Amount" step={3}>
          {taxNote ? <Text style={st.note}>{taxNote}</Text> : null}
          <View style={st.grid}>
            <Sum label="Qty" value={fmtQ(t.qty)} />
            <Sum label="Gross" value={`₹ ${fmt2(t.gross)}`} />
            <Pressable onPress={() => setTaxOpen(true)} disabled={!p.tax.length} style={st.taxBtn} accessibilityRole="button" accessibilityLabel="Tax detail">
              <Text style={LABEL}>Tax {taxBusy ? '…' : p.tax.length ? '(tap for detail)' : '(none)'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={st.sumVal}>₹ {fmt2(r3(t.net - t.gross))}</Text>
                {taxBusy ? <ActivityIndicator size="small" color={C.cta} /> : p.tax.length ? <Icon name="tune" size={16} color={C.cta} /> : null}
              </View>
            </Pressable>
            <Sum label="Net amount" value={`₹ ${fmt2(t.net)}`} strong />
          </View>
          {t.tax.lines.filter(l => !l.off && l.signed !== 0).length ? (
            <View style={st.taxList}>
              {t.tax.lines.filter(l => !l.off && l.signed !== 0).map(l => (
                <Text key={l.taxSr} style={st.taxLine}>
                  {l.taxName}{!l.manual && num(l.per) ? ` @ ${num(l.per)}%` : ''}: <Text style={st.b}>{fmt2(l.signed)}</Text>
                </Text>
              ))}
            </View>
          ) : null}
        </Card>

        <Card title="Terms / remarks" step={4}>
          <Field label={`Printed on the proforma (${p.remark.length}/${REMARK_MAX})`} error={errors.remark}>
            <Input
              value={p.remark}
              onChangeText={v => set({ remark: v.slice(0, REMARK_MAX) })}
              placeholder="e.g. 50% advance, balance against delivery. Delivery 15 days from advance."
              multiline
              editable={!readOnly}
              style={{ minHeight: 84, textAlignVertical: 'top' }}
            />
          </Field>
        </Card>
      </ScrollView>

      <View style={[st.footer, isPhone && { flexWrap: 'wrap' }]}>
        <View style={isPhone ? { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' } : { flex: 1 }}>
          <Text style={LABEL}>Net • {fmtQ(t.qty)} qty</Text>
          <Text style={st.net}>₹ {fmt2(t.net)}</Text>
        </View>
        {isPhone ? <View style={{ flex: 1 }} /> : null}
        <Btn kind="ghost" title={readOnly ? 'Close' : 'Cancel'} onPress={onCancel} />
        {readOnly && rights.print ? <Btn kind="dark" icon="print" title="Print" onPress={() => onPrint(p, sameState)} /> : null}
        {!readOnly ? (
          <>
            {rights.print ? <Btn kind="dark" icon="print" title={isPhone ? 'Save+Print' : 'Save & Print'} loading={saving === 'print'} disabled={!!saving} onPress={() => save(true)} /> : null}
            <Btn icon="check" title={mode === 'edit' ? 'Update' : 'Save'} loading={saving === 'save'} disabled={!!saving} onPress={() => save(false)} />
          </>
        ) : null}
      </View>

      <TaxSheet
        visible={taxOpen}
        gross={t.gross}
        lines={p.tax}
        sameState={sameState}
        taxAccNote={sameState === null ? 'GST accounts for this party not known - all GST lines are open.' : undefined}
        readOnly={readOnly}
        onApply={(lines: TaxLine[]) => { set({ tax: lines }); setTaxOpen(false); }}
        onClose={() => setTaxOpen(false)}
      />
    </View>
  );
}

function Chip({ label, onPress, muted }: { label: string; onPress: () => void; muted?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.chip, muted && st.chipMuted, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={`Fill ${label}`}>
      <Text style={[st.chipTxt, muted && { color: C.muted }]}>{label}</Text>
    </Pressable>
  );
}

function Sum({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={st.sumCell}>
      <Text style={LABEL}>{label}</Text>
      <Text style={[st.sumVal, strong && { color: C.cta, fontSize: 18 }]}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  against: { fontSize: 12, color: C.muted, fontWeight: '700', flexShrink: 1 },
  grid: { flexDirection: 'row', gap: SP.md, flexWrap: 'wrap' },
  gridPhone: { flexDirection: 'column' },
  cell: { flex: 1, minWidth: 150 },
  sumCell: { flex: 1, minWidth: 130 },
  quick: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: C.ctaSoft, borderWidth: 1, borderColor: C.cta },
  chipMuted: { backgroundColor: C.card, borderColor: C.line },
  chipTxt: { fontSize: 12, fontWeight: '800', color: C.cta },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.md, paddingVertical: 6 },
  th: { backgroundColor: C.nav, paddingVertical: 10 },
  thTxt: { color: C.onNav, fontWeight: '800', fontSize: 12 },
  cNum: { width: 92, textAlign: 'right' },
  cQty: { width: 110 },
  cAmt: { width: 110, textAlign: 'right' },
  item: { fontSize: 13, fontWeight: '700', color: C.ink },
  sub: { fontSize: 11, color: C.muted, marginTop: 2 },
  num: { fontSize: 13, color: C.ink, fontVariant: ['tabular-nums'] },
  b: { fontWeight: '800' },
  inNum: { textAlign: 'right', fontVariant: ['tabular-nums'], minHeight: 38, paddingVertical: 6 },
  lineErr: { color: C.danger, fontSize: 12, fontWeight: '700', marginTop: 2, marginBottom: 4 },
  pl: { paddingHorizontal: SP.md, paddingVertical: SP.sm, gap: 4 },
  plRow: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: 4 },
  after: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.md, padding: SP.sm, borderRadius: R.sm, backgroundColor: C.track },
  afterTxt: { flex: 1, fontSize: 13, color: C.ink },
  note: { fontSize: 12, color: C.muted, marginBottom: SP.sm },
  taxBtn: { flex: 1, minWidth: 130, padding: SP.sm, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' },
  sumVal: { fontSize: 15, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'], marginTop: 2 },
  taxList: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginTop: SP.sm },
  taxLine: { fontSize: 12, color: C.muted },
  footer: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, padding: SP.md, backgroundColor: C.card, borderTopWidth: 1, borderColor: C.line },
  net: { fontSize: 20, fontWeight: '800', color: C.cta, fontVariant: ['tabular-nums'] },
  err: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, backgroundColor: C.dangerSoft, padding: SP.sm, borderRadius: R.sm, marginBottom: SP.md },
  errTxt: { flex: 1, color: C.danger, fontWeight: '700', fontSize: 13 },
});
