// FILE: src/features/repacking/components/RepackItemSheet.tsx
// Item Detail Entry for Repacking. The item comes from the Repacking Issue: Item / Merge / Grade / Shade can be
// changed, Qty and Wt stay the issue's. Cartons (taka) like the desktop Re-Packing grid:
//   Taka No | Piece | CalcOn | Meters | Gross Wt | Tare Wt | Weight (= Gross − Tare)
//  - Auto Entry: the issue's cartons are filled in; meters / weight are fixed; rename them, set piece / tare.
//  - Manual: type each taka — Taka No → Meters → Gross → Tare → Enter adds the row and goes back to Taka No.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import { confirmAsync, notify } from '../../repackingIssue/dialog';
import { cleanDecimal, fmt3 } from '../../repackingIssue/logic';
import { C, LABEL, R, SP } from '../../repackingIssue/theme';
import { MasterPicker } from '../../repackingIssue/components/MasterPicker';
import { Sheet } from '../../repackingIssue/components/Sheet';
import { Btn, Card, Field, Input, Row, Segmented, SelectBox, Stat } from '../../repackingIssue/components/ui';
import type { LookupKind, LookupOption } from '../../repackingIssue/types';
import type { RepackingService } from '@/src/api/repackingAPI';
import { balanceOf, calcCarton, EPS, Errors, itemTotals, newCarton, nextTakaNo, takaSeries, validateCarton, validateItem } from '../logic';
import { PACK_TYPES, PIECES, SHIFTS } from '../types';
import type { CalcOn, Opt, RepackContext, RepackMasters, RpCarton, RpItem } from '../types';
import { OptionPicker } from './OptionPicker';

type SelKind = 'item' | 'merge' | 'grade' | 'shade';
const NEEDS: Record<SelKind, SelKind | null> = { item: null, merge: 'item', grade: 'merge', shade: 'grade' };
const AFTER: Record<SelKind, SelKind[]> = { item: ['merge', 'grade', 'shade'], merge: ['grade', 'shade'], grade: ['shade'], shade: [] };
const LABELS: Record<SelKind, string> = { item: 'Item', merge: 'Merge', grade: 'Grade', shade: 'Shade' };
const PIECE_OPTS = PIECES.map(p => ({ code: p, name: p }));

type PickerState = SelKind | 'prodType' | 'checker' | { piece: string } | { operator: string } | null;
const shiftName = (v: string) => SHIFTS.find(x => x.code === v)?.name ?? '';
const nextShift = (v: string) => (v === '' ? '1' : v === '1' ? '2' : '');

export function RepackItemSheet({
  visible, initial, auto, masters, blocked, ctx, service, readOnly, canCartons, canRemove, onSave, onClose,
}: {
  visible: boolean;
  initial: RpItem;
  auto: boolean;
  masters: RepackMasters | null;
  /** carton nos used by other items */
  blocked: Set<string>;
  ctx: RepackContext;
  service: { lookup: RepackingService['lookup'] };
  readOnly?: boolean;
  /** repacking.carton_entry:edit */
  canCartons: boolean;
  /** repacking.carton_entry:remove_carton */
  canRemove: boolean;
  onSave: (it: RpItem) => void;
  onClose: () => void;
}) {
  const { isPhone } = useDeviceClass();
  const [it, setIt] = useState<RpItem>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [picker, setPicker] = useState<PickerState>(null);
  const [suffix, setSuffix] = useState('.');
  const [seriesStart, setSeriesStart] = useState('');
  const [allOpr, setAllOpr] = useState<Opt | null>(null);
  const [allShift, setAllShift] = useState('');
  const [draft, setDraft] = useState<RpCarton>(() => newCarton(initial.calcOn));
  const [draftMsg, setDraftMsg] = useState<{ t: 'err' | 'ok'; s: string } | null>(null);
  const takaRef = useRef<TextInput>(null);
  const mtrRef = useRef<TextInput>(null);
  const grossRef = useRef<TextInput>(null);
  const tareRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setIt(initial);
      setErrors({});
      setDraft(newCarton(initial.calcOn, initial.cartons[initial.cartons.length - 1]));
      setDraftMsg(null);
    }
  }, [visible, initial]);

  const tot = itemTotals(it);
  const bal = balanceOf(it);
  const dirty = useMemo(() => JSON.stringify(it) !== JSON.stringify(initial), [it, initial]);
  const editCartons = !readOnly && canCartons;

  const set = (patch: Partial<RpItem>) => {
    setIt(p => ({ ...p, ...patch }));
    setErrors(e => {
      const n = { ...e };
      Object.keys(patch).forEach(k => delete n[k]);
      if (patch.cartons) { delete n.qtyOver; delete n.wtOver; delete n.cartons; }
      return n;
    });
  };
  const setCarton = (key: string, patch: Partial<RpCarton>) => {
    setIt(p => ({ ...p, cartons: p.cartons.map(c => (c.key === key ? { ...c, ...patch } : c)) }));
    setErrors({});
  };

  /* ---- masters ---- */
  const pickMaster = (kind: LookupKind, o: LookupOption) => {
    setPicker(null);
    if (kind !== 'item' && kind !== 'merge' && kind !== 'grade' && kind !== 'shade') return;
    if (it[kind]?.code === o.code) return;
    const patch: Partial<RpItem> = { [kind]: o };
    AFTER[kind].forEach(k => { (patch as any)[k] = null; });
    if (kind === 'item') {
      const den = String(o.extra?.denier ?? '');
      if (den && !it.denier) patch.denier = den;
    }
    set(patch);
  };

  /* ---- cartons ---- */
  const renameAll = () => {
    if (!suffix.trim()) return notify('Rename', 'Enter a suffix — the new carton no. must differ from the old one.');
    setIt(p => ({ ...p, cartons: p.cartons.map(c => (c.origCartNo && !c.used ? { ...c, cartNo: `${c.origCartNo}${suffix.trim().toUpperCase()}` } : c)) }));
    setErrors({});
  };
  /** new numbers for all cartons of this item: start, start+1, … */
  const applySeries = () => {
    const free = it.cartons.filter(c => !c.used);
    const names = takaSeries(seriesStart, free.length, blocked);
    if (!names) return notify('Taka series', 'Enter the first taka no. ending with a number, e.g. TEST10001.');
    let k = 0;
    setIt(p => ({ ...p, cartons: p.cartons.map(c => (c.used ? c : { ...c, cartNo: names[k++] })) }));
    setErrors({});
  };

  const oprShiftAll = () => {
    if (!allOpr && !allShift) return notify('Operator / Shift', 'Pick an operator and / or a shift first.');
    setIt(p => ({ ...p, cartons: p.cartons.map(c => (c.used ? c : { ...c, ...(allOpr ? { operator: allOpr } : {}), ...(allShift ? { shift: allShift } : {}) })) }));
  };

  const tareAll = () => {
    const t = draft.tareWt;
    setIt(p => ({ ...p, cartons: p.cartons.map(c => (c.used ? c : { ...c, tareWt: t || '0' })) }));
  };

  const addDraft = () => {
    const n = draft.cartNo.trim().toUpperCase();
    const c = { ...draft, cartNo: n };
    const err = validateCarton(c)
      ?? (it.cartons.some(x => x.cartNo.trim().toUpperCase() === n) || blocked.has(n) ? `${n} is already entered` : null);
    if (err) {
      setDraftMsg({ t: 'err', s: err });
      if (!n) takaRef.current?.focus();
      return;
    }
    const k = calcCarton(c);
    const after = { qty: tot.qty + k.qty, weight: tot.weight + k.weight };
    if (after.qty > it.issQty + EPS) return setDraftMsg({ t: 'err', s: `Mtr / Pcs would be ${fmt3(after.qty)} — issue is ${fmt3(it.issQty)} (balance ${fmt3(bal.qty)})` });
    set({ cartons: [...it.cartons, c] });
    setDraftMsg({ t: 'ok', s: `Added ${n} • weight ${fmt3(k.weight)} (wt balance ${fmt3(it.issWt - after.weight)})` });
    // next taka follows the one just added (TEST10001 → TEST10002); the user can overwrite it
    const used = new Set([...blocked, ...it.cartons.map(x => x.cartNo.trim().toUpperCase()), n]);
    setDraft({ ...newCarton(it.calcOn, c), cartNo: nextTakaNo(n, used) });
    setTimeout(() => takaRef.current?.focus(), 50);
  };

  const remove = async (c: RpCarton) => {
    if (!(await confirmAsync('Remove carton', `Remove ${c.cartNo || 'this carton'}?`, 'Remove', true))) return;
    set({ cartons: it.cartons.filter(x => x.key !== c.key) });
  };

  const ok = () => {
    const e = validateItem(it, blocked);
    setErrors(e);
    if (Object.keys(e).length) return notify('Check item', Object.values(e)[0]);
    onSave(it);
  };

  const close = async () => {
    if (!dirty || readOnly) return onClose();
    if (await confirmAsync('Discard changes?', 'Changes to this item will be lost.', 'Discard', true)) onClose();
  };

  /* ---- render: item ---- */
  const sel = (k: SelKind) => {
    const need = NEEDS[k];
    const waiting = !!need && !it[need];
    return (
      <Field label={LABELS[k]} required error={errors[k]}>
        <SelectBox
          value={it[k]?.name}
          code={it[k]?.code}
          placeholder={waiting ? `Select ${LABELS[need!].toLowerCase()} first` : `Select ${LABELS[k].toLowerCase()}`}
          onPress={() => setPicker(k)}
          invalid={!!errors[k]}
          disabled={readOnly || waiting}
        />
      </Field>
    );
  };

  const over = (b: number) => (b < -EPS ? C.danger : b > EPS ? C.cta : C.ok);
  const qtyBox = (
    <View style={st.qtyBox}>
      <View style={st.qtyHead}>
        <Text style={st.qtyTitle}>Issue total (all cartons)</Text>
        <Text style={st.calcTag}>{it.calcOn}</Text>
      </View>
      <View style={st.qtyGrid}>
        <Text style={st.qh} />
        <Text style={st.qh}>Mtr / Pcs</Text>
        <Text style={st.qh}>Wt</Text>
        <Text style={st.ql}>Issue</Text>
        <Text style={st.qv}>{fmt3(it.issQty)}</Text>
        <Text style={st.qv}>{fmt3(it.issWt)}</Text>
        <Text style={st.ql}>Cartons</Text>
        <Text style={st.qv}>{fmt3(tot.qty)}</Text>
        <Text style={st.qv}>{fmt3(tot.weight)}</Text>
        <Text style={st.ql}>Balance</Text>
        <Text style={[st.qv, { color: over(bal.qty), fontWeight: '800' }]}>{fmt3(bal.qty)}</Text>
        <Text style={[st.qv, { color: over(bal.weight), fontWeight: '800' }]}>{fmt3(bal.weight)}</Text>
      </View>
      {errors.qtyOver || errors.wtOver ? <Text style={st.err}>{errors.qtyOver || errors.wtOver}</Text> : null}
    </View>
  );

  const itemCard = (
    <Card step={1} title="Item" right={<Text style={st.fromTag}>From issue</Text>}>
      {qtyBox}
      {sel('item')}
      <Row>
        {sel('merge')}
        {sel('grade')}
      </Row>
      {sel('shade')}
      <Row>
        <Field label="Denier">
          <Input value={it.denier} onChangeText={t => set({ denier: t })} editable={!readOnly} placeholder="Denier" />
        </Field>
        <Field label="Packing Type" required error={errors.prodType}>
          <SelectBox value={it.prodType?.name} code={it.prodType?.code} placeholder="Select packing type" onPress={() => setPicker('prodType')} invalid={!!errors.prodType} disabled={readOnly} />
        </Field>
      </Row>
      <Field label="Type" required error={errors.packType}>
        <Segmented
          options={PACK_TYPES.map(p => ({ value: p.code, label: p.name, hint: p.code }))}
          value={it.packType || null}
          onChange={v => set({ packType: v })}
          disabled={readOnly}
          invalid={!!errors.packType}
        />
      </Field>
      <Field label="Checked By">
        <SelectBox icon="verified-user" value={it.checker?.name} code={it.checker?.code} placeholder="Select checker" onPress={() => setPicker('checker')} disabled={readOnly} />
      </Field>
    </Card>
  );

  /* ---- render: cartons ---- */
  const calcChip = (v: CalcOn, onPress?: () => void, locked?: boolean) => (
    <Pressable onPress={onPress} disabled={locked || !onPress} style={[st.chip, v === 'KGS' && st.chipKgs, locked && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={`Calc on ${v}`}>
      <Text style={[st.chipTxt, v === 'KGS' && { color: C.cta }]}>{v}</Text>
    </Pressable>
  );
  const pieceBox = (v: string, onPress?: () => void, locked?: boolean) => (
    <Pressable onPress={onPress} disabled={locked || !onPress} style={[st.cell, st.pieceBox, locked && st.ro]} accessibilityRole="button" accessibilityLabel={`Piece ${v}`}>
      <Text style={st.pieceTxt}>{v}</Text>
      {!locked && onPress ? <Icon name="expand-more" size={14} color={C.muted} /> : null}
    </Pressable>
  );
  const oprBox = (o: Opt | null, onPress?: () => void, locked?: boolean, wide?: boolean) => (
    <Pressable onPress={onPress} disabled={locked || !onPress} style={[st.cell, st.pieceBox, { justifyContent: 'space-between', minWidth: wide ? 140 : 0 }, locked && st.ro]} accessibilityRole="button" accessibilityLabel="Operator">
      <Text style={[st.oprTxt, !o && { color: C.muted }]} numberOfLines={1}>{o ? o.name : 'Operator'}</Text>
      {!locked && onPress ? <Icon name="expand-more" size={14} color={C.muted} /> : null}
    </Pressable>
  );
  const shiftChip = (v: string, onPress?: () => void, locked?: boolean) => (
    <Pressable onPress={onPress} disabled={locked || !onPress} style={[st.chip, { minWidth: 44 }, !!v && st.chipOn, locked && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={`Shift ${shiftName(v) || 'none'}`}>
      <Text style={[st.chipTxt, !!v && { color: C.onNav }]}>{shiftName(v) || '—'}</Text>
    </Pressable>
  );
  const numIn = (value: string, onChange: (t: string) => void, locked: boolean, label: string, extra?: object) => (
    <TextInput
      value={value}
      onChangeText={t => onChange(cleanDecimal(t))}
      editable={!locked}
      keyboardType="decimal-pad"
      style={[st.cell, st.num, locked && st.ro]}
      placeholder="0.000"
      placeholderTextColor={C.muted}
      accessibilityLabel={label}
      {...extra}
    />
  );

  const cartonRow = (c: RpCarton, i: number) => {
    const k = calcCarton(c);
    const err = errors[`c${i}`];
    const locked = readOnly || !canCartons || !!c.used;
    const fromIssue = c.origCartNo !== undefined; // meters / weight / calc fixed
    const taka = (
      <View style={{ flex: isPhone ? 1 : 1.6, minWidth: 0 }}>
        <TextInput
          value={c.cartNo}
          onChangeText={t => setCarton(c.key, { cartNo: t.toUpperCase() })}
          editable={!locked}
          autoCapitalize="characters"
          autoCorrect={false}
          style={[st.cell, { fontWeight: '700' }, !!err && { borderColor: C.danger }, locked && st.ro]}
          placeholder="New taka no."
          placeholderTextColor={C.muted}
          accessibilityLabel={`Carton ${i + 1} number`}
        />
        {c.origCartNo ? <Text style={st.orig} numberOfLines={1}>from {c.origCartNo}</Text> : null}
      </View>
    );
    const piece = pieceBox(c.piece, () => setPicker({ piece: c.key }), locked);
    const calcOn = calcChip(c.calcOn, () => setCarton(c.key, c.calcOn === 'MTR' ? { calcOn: 'KGS', meters: c.meters || '1' } : { calcOn: 'MTR' }), locked || fromIssue);
    const meters = fromIssue ? <Text style={[st.num, st.calc]}>{fmt3(k.meters)}</Text> : numIn(c.meters, t => setCarton(c.key, { meters: t }), locked, `Carton ${i + 1} meters`);
    const gross = fromIssue ? <Text style={[st.num, st.calc]}>{fmt3(k.gross)}</Text> : numIn(c.grossWt, t => setCarton(c.key, { grossWt: t }), locked, `Carton ${i + 1} gross`);
    const tare = numIn(c.tareWt, t => setCarton(c.key, { tareWt: t }), locked, `Carton ${i + 1} tare`);
    const opr = oprBox(c.operator, () => setPicker({ operator: c.key }), locked);
    const shift = shiftChip(c.shift, () => setCarton(c.key, { shift: nextShift(c.shift) }), locked);
    const rm = !fromIssue && !locked && canRemove ? (
      <Pressable onPress={() => remove(c)} hitSlop={8} accessibilityLabel={`Remove ${c.cartNo}`}>
        <Icon name="close" size={18} color={C.danger} />
      </Pressable>
    ) : c.used ? <Icon name="lock" size={16} color={C.cta} /> : <View style={{ width: 18 }} />;

    if (isPhone) {
      return (
        <View key={c.key} style={[st.pCard, i % 2 === 1 && { backgroundColor: C.quiet }]}>
          <View style={st.pRow}>
            <Text style={st.idx}>{i + 1}</Text>
            {taka}
            {piece}
            {calcOn}
            {rm}
          </View>
          <View style={st.pRow}>
            <View style={{ flex: 1 }}><Text style={st.mini}>Mtr / Pcs</Text>{meters}</View>
            <View style={{ flex: 1 }}><Text style={st.mini}>Gross</Text>{gross}</View>
            <View style={{ flex: 1 }}><Text style={st.mini}>Tare</Text>{tare}</View>
            <View style={{ flex: 1 }}><Text style={st.mini}>Weight</Text><Text style={[st.num, st.calc, st.wt]}>{fmt3(k.weight)}</Text></View>
          </View>
          <View style={st.pRow}>
            <View style={{ flex: 1 }}><Text style={st.mini}>Operator</Text>{opr}</View>
            <View><Text style={st.mini}>Shift</Text>{shift}</View>
          </View>
          {err ? <Text style={st.err}>{err}</Text> : null}
        </View>
      );
    }
    return (
      <View key={c.key}>
        <View style={[st.tr, i % 2 === 1 && { backgroundColor: C.quiet }]}>
          <Text style={[st.idx, st.c0]}>{i + 1}</Text>
          {taka}
          <View style={st.cP}>{piece}</View>
          <View style={st.cC}>{calcOn}</View>
          <View style={st.cW}>{meters}</View>
          <View style={st.cW}>{gross}</View>
          <View style={st.cW}>{tare}</View>
          <Text style={[st.cW, st.num, st.calc, st.wt]}>{fmt3(k.weight)}</Text>
          <View style={st.cO}>{opr}</View>
          <View style={st.cS}>{shift}</View>
          <View style={st.cX}>{rm}</View>
        </View>
        {err ? <Text style={[st.err, { paddingHorizontal: SP.sm }]}>{err}</Text> : null}
      </View>
    );
  };

  const dk = calcCarton(draft);
  const entry = !auto && editCartons ? (
    <View style={st.draft}>
      <View style={st.draftHead}>
        <Text style={LABEL}>Add taka</Text>
        <Text style={st.balTxt}>Balance  Mtr/Pcs {fmt3(bal.qty)}  •  Wt {fmt3(bal.weight)}</Text>
      </View>
      <View style={st.draftRow}>
        <View style={{ flexGrow: 1, flexBasis: 180, minWidth: isPhone ? '100%' : 180 }}>
          <Text style={st.mini}>Taka No</Text>
          <Input
            ref={takaRef}
            value={draft.cartNo}
            onChangeText={t => { setDraft(d => ({ ...d, cartNo: t.toUpperCase() })); setDraftMsg(null); }}
            onSubmitEditing={() => (draft.calcOn === 'MTR' ? mtrRef : grossRef).current?.focus()}
            placeholder="Scan / type"
            selectTextOnFocus
            autoCapitalize="characters"
            autoCorrect={false}
            blurOnSubmit={false}
            returnKeyType="next"
          />
        </View>
        <View>
          <Text style={st.mini}>Piece</Text>
          <View style={st.pieces}>
            {PIECES.map(p => (
              <Pressable key={p} onPress={() => setDraft(d => ({ ...d, piece: p }))} style={[st.pc, draft.piece === p && st.pcOn]} accessibilityRole="button" accessibilityState={{ selected: draft.piece === p }}>
                <Text style={[st.pcTxt, draft.piece === p && { color: C.onNav }]}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View>
          <Text style={st.mini}>CalcOn</Text>
          {calcChip(draft.calcOn, () => setDraft(d => (d.calcOn === 'MTR' ? { ...d, calcOn: 'KGS', meters: d.meters || '1' } : { ...d, calcOn: 'MTR' })))}
        </View>
        <View style={{ flexGrow: 1, flexBasis: 90, minWidth: 90 }}>
          <Text style={st.mini}>Mtr / Pcs</Text>
          {numIn(draft.meters, t => setDraft(d => ({ ...d, meters: t })), false, 'Meters', { ref: mtrRef, onSubmitEditing: () => grossRef.current?.focus(), blurOnSubmit: false, returnKeyType: 'next' })}
        </View>
        <View style={{ flexGrow: 1, flexBasis: 90, minWidth: 90 }}>
          <Text style={st.mini}>Gross Wt</Text>
          {numIn(draft.grossWt, t => setDraft(d => ({ ...d, grossWt: t })), false, 'Gross weight', { ref: grossRef, onSubmitEditing: () => tareRef.current?.focus(), blurOnSubmit: false, returnKeyType: 'next' })}
        </View>
        <View style={{ flexGrow: 1, flexBasis: 90, minWidth: 90 }}>
          <Text style={st.mini}>Tare Wt</Text>
          {numIn(draft.tareWt, t => setDraft(d => ({ ...d, tareWt: t })), false, 'Tare weight', { ref: tareRef, onSubmitEditing: addDraft, returnKeyType: 'done' })}
        </View>
        <View style={{ flexGrow: 1, flexBasis: 160, minWidth: isPhone ? '60%' : 160 }}>
          <Text style={st.mini}>Operator</Text>
          {oprBox(draft.operator, () => setPicker({ operator: 'draft' }))}
        </View>
        <View>
          <Text style={st.mini}>Shift</Text>
          {shiftChip(draft.shift, () => setDraft(d => ({ ...d, shift: nextShift(d.shift) })))}
        </View>
        <View style={{ flexGrow: 1, flexBasis: 90, minWidth: 90 }}>
          <Text style={st.mini}>Weight</Text>
          <Text style={[st.num, st.calc, st.wt, { lineHeight: 38 }, dk.weight < 0 && { color: C.danger }]}>{draft.grossWt ? fmt3(dk.weight) : '—'}</Text>
        </View>
        <View style={{ justifyContent: 'flex-end' }}>
          <Text style={st.mini}> </Text>
          <Btn small kind="dark" icon="add" title="Add" onPress={addDraft} />
        </View>
      </View>
      {draftMsg ? (
        <Text style={[st.msg, { color: draftMsg.t === 'err' ? C.danger : C.ok }]}>{draftMsg.s}</Text>
      ) : (
        <Text style={st.hint}>Taka No → Meters → Gross → Tare → Enter adds the taka. Piece, CalcOn, Tare, Operator and Shift stay for the next one.</Text>
      )}
    </View>
  ) : null;

  const tools = editCartons && it.cartons.length ? (
    <View style={[st.tools, isPhone && { justifyContent: 'flex-start' }]}>
      <View style={st.tool}>
        <Text style={st.toolTxt}>Taka series from</Text>
        <TextInput value={seriesStart} onChangeText={t => setSeriesStart(t.toUpperCase())} style={[st.cell, { width: 130 }]} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. TEST10001" placeholderTextColor={C.muted} accessibilityLabel="First taka no." onSubmitEditing={applySeries} />
        <Btn small kind="dark" title="Apply" onPress={applySeries} />
      </View>
      {auto ? (
        <View style={st.tool}>
          <Text style={st.toolTxt}>or old no. +</Text>
          <TextInput value={suffix} onChangeText={setSuffix} style={[st.cell, { width: 64, textAlign: 'center' }]} autoCapitalize="characters" accessibilityLabel="Suffix" />
          <Btn small kind="dark" title="Apply" onPress={renameAll} />
        </View>
      ) : null}
      <View style={st.tool}>
        <Text style={st.toolTxt}>Operator / Shift for all</Text>
        {oprBox(allOpr, () => setPicker({ operator: 'all' }), false, true)}
        {shiftChip(allShift, () => setAllShift(nextShift(allShift)))}
        <Btn small kind="ghost" title="Apply" onPress={oprShiftAll} />
      </View>
      <View style={st.tool}>
        <Text style={st.toolTxt}>Tare for all</Text>
        <TextInput value={draft.tareWt} onChangeText={t => setDraft(d => ({ ...d, tareWt: cleanDecimal(t) }))} keyboardType="decimal-pad" style={[st.cell, st.num, { width: 80 }]} placeholder="0.000" placeholderTextColor={C.muted} accessibilityLabel="Tare for all" />
        <Btn small kind="ghost" title="Apply" onPress={tareAll} />
      </View>
    </View>
  ) : null;

  const cartonCard = (
    <Card step={2} title={`Cartons / Taka (${it.cartons.length})`} right={<Text style={st.fromTag}>{auto ? 'From issue — mtr / pcs and weight fixed' : 'Manual entry'}</Text>}>
      {entry}
      {tools}
      <View style={st.table}>
        {!isPhone ? (
          <View style={[st.tr, st.th]}>
            <Text style={[st.c0, st.thTxt]}>#</Text>
            <Text style={[{ flex: 1.6 }, st.thTxt]}>Taka No</Text>
            <Text style={[st.cP, st.thTxt]}>Piece</Text>
            <Text style={[st.cC, st.thTxt]}>CalcOn</Text>
            <Text style={[st.cW, st.thTxt, st.num]}>Mtr / Pcs</Text>
            <Text style={[st.cW, st.thTxt, st.num]}>Gross Wt</Text>
            <Text style={[st.cW, st.thTxt, st.num]}>Tare Wt</Text>
            <Text style={[st.cW, st.thTxt, st.num]}>Weight</Text>
            <Text style={[st.cO, st.thTxt]}>Operator</Text>
            <Text style={[st.cS, st.thTxt]}>Shift</Text>
            <View style={st.cX} />
          </View>
        ) : null}
        {it.cartons.length ? it.cartons.map(cartonRow) : <Text style={st.empty}>{auto ? 'No cartons in this issue item' : 'No taka yet — add them above'}</Text>}
        <View style={[st.tr, st.tf]}>
          {!isPhone ? <Text style={st.c0} /> : null}
          <Text style={[{ flex: 1.6 }, st.tfTxt]}>{tot.pcs} taka</Text>
          {!isPhone ? <><View style={st.cP} /><View style={st.cC} /></> : null}
          <Text style={[st.cW, st.tfTxt, st.num]}>{fmt3(tot.meters)}</Text>
          <Text style={[st.cW, st.tfTxt, st.num]}>{fmt3(tot.gross)}</Text>
          <Text style={[st.cW, st.tfTxt, st.num]}>{fmt3(tot.tare)}</Text>
          <Text style={[st.cW, st.tfTxt, st.num]}>{fmt3(tot.weight)}</Text>
          {!isPhone ? <><View style={st.cO} /><View style={st.cS} /><View style={st.cX} /></> : null}
        </View>
      </View>
      {errors.cartons ? <Text style={st.err}>{errors.cartons}</Text> : null}
    </Card>
  );

  const masterKind = picker === 'item' || picker === 'merge' || picker === 'grade' || picker === 'shade' ? picker : null;
  const pieceTarget = picker && typeof picker === 'object' && 'piece' in picker ? picker.piece : null;
  const oprTarget = picker && typeof picker === 'object' && 'operator' in picker ? picker.operator : null;
  const pickOperator = (o: Opt) => {
    setPicker(null);
    if (oprTarget === 'draft') setDraft(d => ({ ...d, operator: o }));
    else if (oprTarget === 'all') setAllOpr(o);
    else if (oprTarget) setCarton(oprTarget, { operator: o });
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      maxWidth={1240}
      title="Repacked Item"
      subtitle={it.item?.name || 'Item detail entry'}
      right={<View style={st.modePill}><Text style={st.modeTxt}>{auto ? 'AUTO' : 'MANUAL'}</Text></View>}
      footer={
        <>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <Stat label="Taka" value={String(tot.pcs)} />
            <Stat label={`Mtr/Pcs / ${fmt3(it.issQty)}`} value={fmt3(tot.qty)} strong />
            <Stat label={`Wt / ${fmt3(it.issWt)}`} value={fmt3(tot.weight)} />
          </View>
          {readOnly ? (
            <Btn title="Close" kind="ghost" onPress={onClose} />
          ) : (
            <>
              {!isPhone ? <Btn title="Cancel" kind="ghost" onPress={close} /> : null}
              <Btn title="Update" icon="check" onPress={ok} style={{ minWidth: 130 }} />
            </>
          )}
        </>
      }>
      <ScrollView contentContainerStyle={{ padding: SP.md, paddingBottom: SP.xl }} keyboardShouldPersistTaps="handled">
        {!isPhone ? (
          <View style={{ flexDirection: 'row', gap: SP.md, alignItems: 'flex-start' }}>
            <View style={{ width: 360 }}>{itemCard}</View>
            <View style={{ flex: 1, minWidth: 0 }}>{cartonCard}</View>
          </View>
        ) : (
          <>
            {itemCard}
            {cartonCard}
          </>
        )}
      </ScrollView>

      <MasterPicker
        kind={masterKind}
        ctx={ctx}
        service={service}
        selected={masterKind ? it[masterKind]?.code : undefined}
        filter={{ itmCode: it.item?.code, merCode: it.merge?.code, grdCode: it.grade?.code }}
        onPick={pickMaster}
        onClose={() => setPicker(null)}
      />
      <OptionPicker visible={picker === 'prodType'} title="Packing Type" options={masters?.prodTypes ?? []} selected={it.prodType?.code}
        onPick={o => { setPicker(null); set({ prodType: o }); }} onClose={() => setPicker(null)} />
      <OptionPicker visible={picker === 'checker'} title="Checked By" options={masters?.checkers ?? []} selected={it.checker?.code}
        onPick={o => { setPicker(null); set({ checker: o }); }} onClose={() => setPicker(null)} />
      <OptionPicker visible={!!oprTarget} title="Operator" options={masters?.checkers ?? []}
        selected={oprTarget === 'draft' ? draft.operator?.code : oprTarget === 'all' ? allOpr?.code : it.cartons.find(c => c.key === oprTarget)?.operator?.code}
        onPick={pickOperator} onClose={() => setPicker(null)} />
      <OptionPicker visible={!!pieceTarget} title="Piece" options={PIECE_OPTS} selected={it.cartons.find(c => c.key === pieceTarget)?.piece}
        onPick={o => { setPicker(null); if (pieceTarget) setCarton(pieceTarget, { piece: o.code }); }} onClose={() => setPicker(null)} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  fromTag: { fontSize: 12, fontWeight: '700', color: C.ok },
  modePill: { backgroundColor: C.cta, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  modeTxt: { color: C.onNav, fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },
  qtyBox: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, backgroundColor: C.quiet, padding: SP.sm, marginBottom: SP.md },
  qtyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  qtyTitle: { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  calcTag: { fontSize: 10, fontWeight: '800', color: C.onNav, backgroundColor: C.nav, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  qtyGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  qh: { width: '33.33%', fontSize: 10, fontWeight: '800', color: C.muted, textAlign: 'right', textTransform: 'uppercase' },
  ql: { width: '33.33%', fontSize: 12, fontWeight: '700', color: C.nav, paddingVertical: 2 },
  qv: { width: '33.33%', fontSize: 13, color: C.ink, textAlign: 'right', fontVariant: ['tabular-nums'], paddingVertical: 2 },
  draft: { padding: SP.sm, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.quiet, marginBottom: SP.md },
  draftHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: SP.sm, flexWrap: 'wrap' },
  balTxt: { fontSize: 12, fontWeight: '700', color: C.cta, fontVariant: ['tabular-nums'] },
  draftRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: SP.sm },
  pieces: { flexDirection: 'row', gap: 2 },
  pc: { width: 28, height: 38, borderRadius: 6, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  pcOn: { backgroundColor: C.nav, borderColor: C.nav },
  pcTxt: { fontSize: 13, fontWeight: '800', color: C.nav },
  msg: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  hint: { fontSize: 12, color: C.muted, marginTop: 6 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SP.md, marginBottom: SP.md, justifyContent: 'flex-end' },
  tool: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SP.sm, maxWidth: '100%' },
  toolTxt: { fontSize: 12, fontWeight: '700', color: C.nav },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, minHeight: 50, paddingHorizontal: SP.sm, paddingVertical: 4, borderBottomWidth: 1, borderColor: C.hair, backgroundColor: C.card },
  th: { backgroundColor: C.nav, minHeight: 34, borderBottomWidth: 0 },
  thTxt: { color: C.onNav, fontWeight: '800', fontSize: 12 },
  tf: { backgroundColor: C.ctaSoft, borderBottomWidth: 0, minHeight: 40 },
  tfTxt: { fontWeight: '800', color: C.cta, fontSize: 13, fontVariant: ['tabular-nums'] },
  c0: { width: 24 },
  cP: { width: 52 },
  cC: { width: 56 },
  cW: { flex: 1 },
  cX: { width: 22, alignItems: 'flex-end' },
  cO: { flex: 1.3 },
  cS: { width: 48 },
  oprTxt: { flex: 1, fontSize: 13, color: C.ink },
  chipOn: { backgroundColor: C.nav, borderColor: C.nav },
  idx: { fontSize: 12, fontWeight: '800', color: C.muted, width: 24 },
  cell: { borderWidth: 1, borderColor: C.line, borderRadius: R.sm, paddingHorizontal: 8, height: 38, fontSize: 14, color: C.ink, backgroundColor: C.card },
  ro: { backgroundColor: C.track },
  num: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  calc: { fontSize: 14, color: C.ink, paddingHorizontal: 4 },
  wt: { color: C.cta, fontWeight: '800' },
  orig: { fontSize: 11, color: C.muted, marginTop: 2 },
  pieceBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 4 },
  pieceTxt: { fontSize: 14, fontWeight: '800', color: C.nav },
  chip: { height: 38, minWidth: 52, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: C.track, paddingHorizontal: 6 },
  chipKgs: { backgroundColor: C.ctaSoft, borderColor: C.cta },
  chipTxt: { fontSize: 12, fontWeight: '800', color: C.nav },
  pCard: { padding: SP.sm, borderBottomWidth: 1, borderColor: C.hair, backgroundColor: C.card, gap: 6 },
  pRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.sm },
  mini: { fontSize: 10, fontWeight: '800', color: C.muted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { textAlign: 'center', color: C.muted, paddingVertical: SP.lg },
  err: { fontSize: 12, color: C.danger, fontWeight: '700', marginTop: 4 },
});
