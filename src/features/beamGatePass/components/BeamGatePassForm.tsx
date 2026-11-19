// FILE: src/features/beamGatePass/components/BeamGatePassForm.tsx
// Security gate pass for a Beam Outward — made for a guard, not a clerk:
//   1 type / scan the Beam Outward no. from its print (1 → 00000001/BM) or tap it in the list
//   2 check party + beams, type the vehicle no., one big SAVE (date / time are now)
// Edit: only vehicle no., date, time. The outward can't change — delete the gate pass and make a new one.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { GatePassService } from '@/src/api/beamGatePassAPI';
import { matchesVoucher } from '../logic';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import { confirmAsync, notify } from '../../repackingIssue/dialog';
import { isValidDMY, maskDMY, todayDMY } from '../../repackingIssue/logic';
import { C, LABEL, R, SP } from '../../repackingIssue/theme';
import { Banner, Btn, Field, Input, Row } from '../../repackingIssue/components/ui';
import type { GatePass, GpBeam, GpContext, GpRights, PendingOutward } from '../types';

const nowTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`; };
const validTime = (t: string) => /^([01]?\d|2[0-3])\.[0-5]\d$/.test(t.trim());
const VEH_MAX = 15;

export function BeamGatePassForm({ ctx, service, rights, mode, initial, onSaved, onCancel, onPrint }: {
  ctx: GpContext;
  service: GatePassService;
  rights: GpRights;
  mode: 'add' | 'edit' | 'view';
  initial?: GatePass;
  onSaved: (gp: GatePass, message: string) => void;
  onCancel: () => void;
  onPrint?: (gp: GatePass) => void;
}) {
  const { isPhone } = useDeviceClass();
  const [q, setQ] = useState('');
  const [list, setList] = useState<PendingOutward[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<PendingOutward | null>(null);
  const [beams, setBeams] = useState<GpBeam[]>(initial?.beams ?? []);
  const [vehNo, setVehNo] = useState(initial?.vehNo ?? '');
  const [date, setDate] = useState(initial?.date ?? todayDMY());
  const [time, setTime] = useState(initial?.time ?? nowTime());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const seq = useRef(0);
  const vehRef = useRef<TextInput | null>(null);
  const searchRef = useRef<TextInput | null>(null);

  const adding = mode === 'add';
  const canSave = adding ? rights.add : mode === 'edit' && rights.edit;

  /* ---- pending outwards (server search, debounced) ---- */
  const load = async (search: string) => {
    const my = ++seq.current;
    setLoading(true);
    try {
      const rows = await service.pending(ctx, search);
      if (my === seq.current) setList(rows);
    } catch (e: any) {
      if (my === seq.current) { setList([]); setErr(e?.message || 'Could not load Beam Outwards.'); }
    } finally {
      if (my === seq.current) setLoading(false);
    }
  };
  useEffect(() => {
    if (!adding || picked) return;
    // a number is the outward no.: 1 → search 00000001 (then matched exactly on the device); text searches party / beam
    const t0 = q.trim();
    const m = t0.match(/^(\d+)(\/.*)?$/);
    const t = setTimeout(() => load(m ? m[1].padStart(8, '0') : t0), 300);
    return () => clearTimeout(t);
  }, [q, picked]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = /^\d+(\/\w*)?$/.test(q.trim()) ? list.filter(p => matchesVoucher(p.vouNo, q)) : list;

  const pick = async (p: PendingOutward) => {
    setErr('');
    setPicked(p);
    setBeams([]);
    setTime(nowTime());
    try {
      const o = await service.outward(ctx, p.uid);
      if (o.gatePassUid) {
        setPicked(null);
        return notify('Already passed', o.message || `Beam Outward ${p.vouNo} already has a gate pass.`);
      }
      setBeams(o.beams);
      setTimeout(() => vehRef.current?.focus(), 150);
    } catch (e: any) {
      setErr(e?.message || 'Could not load the beams.');
    }
  };

  const onEnterSearch = () => {
    if (shown.length === 1) pick(shown[0]);
    else if (!shown.length) setErr(`No Beam Outward ${q.trim()} waiting for a gate pass.`);
  };

  const save = async () => {
    setErr('');
    if (!isValidDMY(date)) return setErr('Enter the date (dd-mm-yyyy).');
    if (!validTime(time)) return setErr('Enter the time as HH.MM, e.g. 15.40.');
    if (vehNo.length > VEH_MAX) return setErr(`Vehicle no. max ${VEH_MAX} characters.`);
    if (adding && !picked) return setErr('Select the Beam Outward.');
    if (adding && !vehNo.trim() && !(await confirmAsync('No vehicle no.', 'Save the gate pass without a vehicle no.?', 'Save', false))) {
      vehRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const r = adding
        ? await service.add(ctx, { outUid: picked!.uid, date, time, vehNo: vehNo.trim() })
        : await service.modify(ctx, { uid: initial!.uid, date, time, vehNo: vehNo.trim() });
      if (!r.ok || !r.gatePass) return setErr(r.message || 'Save failed.');
      onSaved(r.gatePass, r.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---- render ---- */
  const party = picked?.party ?? initial?.party ?? '';
  const outNo = picked?.vouNo ?? initial?.outNo ?? '';
  const outDate = picked?.date ?? initial?.outDate ?? '';

  const pickStep = (
    <View style={{ flex: 1 }}>
      <View style={st.searchCard}>
        <Text style={st.bigLabel}>Beam Outward No.</Text>
        <View>
          <Input
            ref={searchRef}
            value={q}
            onChangeText={t => { setQ(t.toUpperCase()); setErr(''); }}
            onSubmitEditing={onEnterSearch}
            placeholder="Type or scan the number on the outward print"
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            style={st.bigInput}
          />
          <Icon name="qr-code-scanner" size={26} color={C.muted} style={st.bigIcon} />
        </View>
        <Text style={st.hint}>Only Beam Outwards without a gate pass are listed. Enter picks a single match.</Text>
        {err ? <Text style={st.err}>{err}</Text> : null}
      </View>
      <FlatList
        data={shown}
        keyExtractor={p => String(p.uid)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: SP.xl }}
        ListEmptyComponent={
          <View style={st.empty}>
            {loading ? <ActivityIndicator color={C.cta} size="large" /> : (
              <>
                <Icon name="inventory" size={36} color={C.muted} />
                <Text style={st.emptyTxt}>{q ? `No Beam Outward ${q} waiting for a gate pass` : 'No Beam Outward is waiting for a gate pass'}</Text>
              </>
            )}
          </View>
        }
        renderItem={({ item: p }) => (
          <Pressable
            onPress={() => pick(p)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.outCard, hovered && { borderColor: C.cta }, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel={`Beam Outward ${p.vouNo}, ${p.party}`}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.outNo}>{p.vouNo}</Text>
              <Text style={st.party} numberOfLines={1}>{p.party}</Text>
              <Text style={st.meta} numberOfLines={2}>{p.date}  •  {p.beams} beam{p.beams === 1 ? '' : 's'}{p.beamNos ? `: ${p.beamNos}` : ''}</Text>
            </View>
            <Icon name="chevron-right" size={28} color={C.cta} />
          </Pressable>
        )}
      />
    </View>
  );

  const confirmStep = (
    <ScrollView contentContainerStyle={{ paddingBottom: SP.xl }} keyboardShouldPersistTaps="handled">
      {mode !== 'add' && !canSave ? <Banner icon="visibility" text="View only." /> : null}
      <View style={st.passCard}>
        <View style={st.passHead}>
          <View style={{ flex: 1 }}>
            <Text style={LABEL}>Beam Outward</Text>
            <Text style={st.outNo}>{outNo}</Text>
            {outDate ? <Text style={st.meta}>{outDate}</Text> : null}
          </View>
          {initial ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={LABEL}>Gate Pass</Text>
              <Text style={st.gpNo}>{initial.no}</Text>
            </View>
          ) : adding ? (
            <Btn small kind="ghost" icon="swap-horiz" title="Change" onPress={() => { setPicked(null); setBeams([]); setErr(''); setTimeout(() => searchRef.current?.focus(), 100); }} />
          ) : null}
        </View>
        <Text style={LABEL}>Party</Text>
        <Text style={st.partyBig}>{party || '—'}</Text>

        <Text style={[LABEL, { marginTop: SP.md }]}>Beams ({beams.length})</Text>
        {!beams.length ? <ActivityIndicator color={C.cta} style={{ marginVertical: SP.md }} /> : (
          <View style={st.chips}>
            {beams.map(b => (
              <View key={b.srNo} style={st.chip}>
                <Text style={st.chipNo}>{b.beamNo}</Text>
                <Text style={st.chipName} numberOfLines={1}>{b.beamName}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={st.vehCard}>
        <Text style={st.bigLabel}>Vehicle No.</Text>
        <Input
          ref={vehRef}
          value={vehNo}
          onChangeText={t => { setVehNo(t.toUpperCase().replace(/\s+/g, ' ').slice(0, VEH_MAX)); setErr(''); }}
          onSubmitEditing={canSave ? save : undefined}
          placeholder="e.g. GJ05AB1234"
          autoCapitalize="characters"
          autoCorrect={false}
          editable={canSave}
          returnKeyType="done"
          style={st.bigInput}
        />
        <Row>
          <Field label="Date">
            <Input value={date} onChangeText={t => setDate(maskDMY(t))} keyboardType="number-pad" maxLength={10} editable={canSave} />
          </Field>
          <Field label="Out Time (HH.MM)">
            <Input value={time} onChangeText={t => setTime(t.replace(/[^0-9.]/g, '').slice(0, 5))} keyboardType="decimal-pad" maxLength={5} editable={canSave} />
          </Field>
        </Row>
        {err ? <Text style={st.err}>{err}</Text> : null}
      </View>
    </ScrollView>
  );

  const step = adding && !picked ? 'pick' : 'confirm';

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[st.body, !isPhone && { paddingHorizontal: SP.xl }]}>
        <View style={st.wrap}>{step === 'pick' ? pickStep : confirmStep}</View>
      </View>
      {step === 'confirm' ? (
        <View style={st.footer}>
          <View style={[st.wrap, { flexDirection: 'row', gap: SP.sm }]}>
            <Btn kind="ghost" title={canSave ? 'Cancel' : 'Close'} onPress={onCancel} style={{ flex: 1 }} />
            {initial && rights.print && onPrint ? <Btn kind="dark" icon="print" title="Print" onPress={() => onPrint(initial)} style={{ flex: 1 }} /> : null}
            {canSave ? <Btn icon="check-circle" title={adding ? 'SAVE GATE PASS' : 'Update'} onPress={save} loading={saving} disabled={adding && !beams.length} style={{ flex: 2, minHeight: 54 }} /> : null}
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, padding: SP.md },
  wrap: { width: '100%', maxWidth: 760, alignSelf: 'center', flex: 1 },
  searchCard: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: SP.lg, marginBottom: SP.md },
  bigLabel: { fontSize: 13, fontWeight: '800', color: C.nav, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: SP.sm },
  bigInput: { fontSize: 22, fontWeight: '800', minHeight: 58, paddingRight: 44, letterSpacing: 1 },
  bigIcon: { position: 'absolute', right: 12, top: 16 },
  hint: { fontSize: 12, color: C.muted, marginTop: SP.sm },
  err: { color: C.danger, fontWeight: '700', fontSize: 14, marginTop: SP.sm },
  outCard: { flexDirection: 'row', alignItems: 'center', gap: SP.md, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: SP.lg, marginBottom: SP.sm, minHeight: 84 },
  outNo: { fontSize: 22, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  gpNo: { fontSize: 20, fontWeight: '800', color: C.cta, fontVariant: ['tabular-nums'] },
  party: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 2 },
  partyBig: { fontSize: 20, fontWeight: '800', color: C.ink, marginTop: 2 },
  meta: { fontSize: 13, color: C.muted, marginTop: 2 },
  empty: { alignItems: 'center', gap: SP.sm, paddingVertical: 48 },
  emptyTxt: { fontSize: 15, color: C.muted, textAlign: 'center' },
  passCard: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 2, borderColor: C.cta, padding: SP.lg, marginBottom: SP.md },
  passHead: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.md, marginBottom: SP.md, paddingBottom: SP.md, borderBottomWidth: 1, borderColor: C.hair },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.sm },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, paddingHorizontal: SP.md, paddingVertical: SP.sm, backgroundColor: C.quiet, minWidth: 96 },
  chipNo: { fontSize: 18, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'] },
  chipName: { fontSize: 11, color: C.muted, maxWidth: 140 },
  vehCard: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: SP.lg },
  footer: { padding: SP.md, backgroundColor: C.card, borderTopWidth: 1, borderColor: C.line },
});
