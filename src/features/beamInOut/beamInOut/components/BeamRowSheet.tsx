// FILE: src/features/beamInOut/components/BeamRowSheet.tsx
// One beam row: Weight, Qty, Rate (→ Amount), Beam Info (In House / Process House), Inward No. help, Remarks 1–5.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BeamService } from '@/src/api/beamInOutAPI';
import { cleanDecimal } from '../../repackingIssue/logic';
import { C, SP } from '../../repackingIssue/theme';
import { Sheet } from '../../repackingIssue/components/Sheet';
import { Btn, Field, Input, ReadOnly, Row, Segmented, SelectBox } from '../../repackingIssue/components/ui';
import { OptionPicker } from '../../repacking/components/OptionPicker';
import { fmt2, fmtQ, inwardRequired, REMARK_MAX, rowAmount, validateRow } from '../logic';
import { BEAM_INFO } from '../types';
import type { BeamContext, BeamInfo, BeamRow, BeamTxn, InwardLink } from '../types';

export function BeamRowSheet({ visible, ctx, txn, service, parCode, initial, readOnly, canRemove, onSave, onRemove, onClose }: {
  visible: boolean;
  ctx: BeamContext;
  txn: BeamTxn;
  service: Pick<BeamService, 'inwards'>;
  parCode: string;
  initial: BeamRow;
  readOnly: boolean;
  canRemove: boolean;
  onSave: (r: BeamRow) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [r, setR] = useState<BeamRow>(initial);
  const [err, setErr] = useState('');
  const [inwPick, setInwPick] = useState(false);
  const [moreRemarks, setMoreRemarks] = useState(false);

  useEffect(() => {
    if (visible) {
      setR(initial);
      setErr('');
      setMoreRemarks(initial.remarks.slice(1).some(Boolean));
    }
  }, [visible, initial]);

  const set = (p: Partial<BeamRow>) => { setR(x => ({ ...x, ...p })); setErr(''); };
  const setRemark = (i: number, v: string) => setR(x => {
    const rem = [...x.remarks] as BeamRow['remarks'];
    rem[i] = v;
    return { ...x, remarks: rem };
  });

  /* Enter: Weight → Qty → Rate → Remark 1 (→ Remarks 2–5) → Done */
  const refs = useRef<Record<string, TextInput | null>>({});
  const go = (from: string) => {
    const order = ['weight', 'qty', 'rate', 'r0', ...(moreRemarks ? ['r1', 'r2', 'r3', 'r4'] : [])];
    const k = order[order.indexOf(from) + 1];
    if (k) refs.current[k]?.focus();
    else save();
  };
  const enter = (key: string, last = false) => ({
    ref: (el: TextInput | null) => { refs.current[key] = el; },
    onSubmitEditing: () => go(key),
    blurOnSubmit: false,
    returnKeyType: (last ? 'done' : 'next') as 'done' | 'next',
  });

  const need = inwardRequired(txn, r);
  /** Beam Inward row linked to its Beam Outward line: the link and Beam Info are fixed */
  const fromOutward = txn === 'beam_inward' && r.inward?.tranType === -10;
  const save = () => {
    const m = validateRow(txn, r);
    if (m) return setErr(m);
    onSave(r);
  };

  const searchInwards = async (q: string) => {
    if (!parCode) throw new Error('Select the party first.');
    const list = await service.inwards(ctx, txn, { parCode, beamCode: r.beamCode, beamSrNo: r.beamSrNo, info: r.info });
    const s = q.trim().toUpperCase();
    return list
      .filter(i => !s || i.no.toUpperCase().includes(s) || i.date.includes(s))
      .map(i => ({ code: `${i.uid}|${i.srNo}|${i.tranType}`, name: `${i.no}  •  ${i.date}`, extra: { link: i } }));
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Beam ${r.beamNo || r.beamSrNo}`}
      subtitle={`${r.beamName}  •  Code ${r.beamCode}`}
      maxWidth={720}
      footer={
        <View style={st.foot}>
          {!readOnly && canRemove ? <Btn kind="danger" small icon="delete-outline" title="Remove" onPress={onRemove} /> : null}
          <View style={{ flex: 1 }} />
          <Btn kind="ghost" title={readOnly ? 'Close' : 'Cancel'} onPress={onClose} />
          {!readOnly ? <Btn icon="check" title="Done" onPress={save} /> : null}
        </View>
      }>
      <ScrollView contentContainerStyle={{ padding: SP.lg }} keyboardShouldPersistTaps="handled">
        {err ? <View style={st.err}><Icon name="error-outline" size={18} color={C.danger} /><Text style={st.errTxt}>{err}</Text></View> : null}
        <Row>
          <Field label="Weight">
            <Input {...enter('weight')} value={r.weight} onChangeText={t => set({ weight: cleanDecimal(t, 3) })} keyboardType="decimal-pad" editable={!readOnly} style={st.num} selectTextOnFocus />
          </Field>
          <Field label="Qty" required>
            <Input {...enter('qty')} value={r.qty} onChangeText={t => set({ qty: cleanDecimal(t, 3) })} keyboardType="decimal-pad" editable={!readOnly} style={st.num} selectTextOnFocus />
          </Field>
        </Row>
        <Row>
          <Field label="Rate" required>
            <Input {...enter('rate')} value={r.rate} onChangeText={t => set({ rate: cleanDecimal(t, 2) })} keyboardType="decimal-pad" editable={!readOnly} style={st.num} placeholder="0.00" selectTextOnFocus autoFocus={!readOnly && !r.rate} />
          </Field>
          <Field label="Amount">
            <ReadOnly value={fmt2(rowAmount(r))} emphasis />
          </Field>
        </Row>

        <Field label="Beam Info" required>
          <Segmented<BeamInfo>
            options={BEAM_INFO.map(b => ({ value: b.value, label: b.label }))}
            value={r.info}
            onChange={v => set({ info: v, inward: v === r.info ? r.inward : null })}
            disabled={readOnly || fromOutward}
          />
        </Field>

        <Row>
          <Field label={fromOutward ? 'Beam Outward No.' : 'Inward No.'} required={need} hint={fromOutward ? 'Linked to the outward this beam went on' : need ? undefined : 'Optional for In House'}>
            <SelectBox
              icon="receipt-long"
              value={r.inward?.no}
              placeholder={parCode ? 'Select inward' : 'Select the party first'}
              onPress={() => setInwPick(true)}
              disabled={readOnly || !parCode || fromOutward}
            />
          </Field>
          <Field label="Inward Date">
            <ReadOnly value={r.inward?.date ?? ''} />
          </Field>
        </Row>
        {r.inward?.balQty !== undefined ? <Text style={st.hint}>Open on this voucher: {fmtQ(r.inward.balQty)}</Text> : null}
        {r.inward && !readOnly && !fromOutward ? <Btn small kind="ghost" icon="link-off" title="Clear inward" onPress={() => set({ inward: null })} style={{ alignSelf: 'flex-start', marginBottom: SP.md }} /> : null}

        <Field label="Remark 1" hint={`${r.remarks[0].length}/${REMARK_MAX}`}>
          <Input {...enter('r0', !moreRemarks)} value={r.remarks[0]} onChangeText={t => setRemark(0, t)} maxLength={REMARK_MAX} editable={!readOnly} />
        </Field>
        {moreRemarks ? (
          [1, 2, 3, 4].map(i => (
            <Field key={i} label={`Remark ${i + 1}`}>
              <Input {...enter(`r${i}`, i === 4)} value={r.remarks[i]} onChangeText={t => setRemark(i, t)} maxLength={REMARK_MAX} editable={!readOnly} />
            </Field>
          ))
        ) : (
          <Btn small kind="ghost" icon="add" title="Remarks 2 – 5" onPress={() => setMoreRemarks(true)} style={{ alignSelf: 'flex-start' }} />
        )}
      </ScrollView>

      <OptionPicker
        visible={inwPick}
        title="Inward No."
        search={searchInwards}
        selected={r.inward ? `${r.inward.uid}|${r.inward.srNo}|${r.inward.tranType}` : undefined}
        onPick={o => { setInwPick(false); set({ inward: (o.extra?.link as InwardLink) ?? null }); }}
        onClose={() => setInwPick(false)}
      />
    </Sheet>
  );
}

const st = StyleSheet.create({
  num: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  hint: { fontSize: 12, color: C.muted, marginTop: -SP.sm, marginBottom: SP.md },
  err: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, backgroundColor: C.dangerSoft, padding: SP.sm, borderRadius: 8, marginBottom: SP.md },
  errTxt: { flex: 1, color: C.danger, fontWeight: '700', fontSize: 13 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, flex: 1 },
});
