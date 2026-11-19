// FILE: src/features/beamGateEntry/components/BeamGateEntryForm.tsx
// Security: empty beams coming back from a party. The guard starts from what he has in front of him:
//   1 the party (from the challan / driver) — or a beam no. painted on a beam → its party opens with that beam ticked
//   2 tick the beams on the vehicle (or keep scanning beam nos.), pick the vehicle entry, party challan (optional), SAVE
// The beams can belong to several Beam Outwards of the party; each saved row keeps its outward line for Beam Inward.
// A gate entry whose beams are already taken in by Beam Inward is view only.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { GateEntryService } from '@/src/api/beamGateEntryAPI';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import { isValidDMY, maskDMY, todayDMY } from '../../repackingIssue/logic';
import { C, LABEL, R, SP } from '../../repackingIssue/theme';
import { Banner, Btn, Field, Input, Row } from '../../repackingIssue/components/ui';
import { beamKey } from '../types';
import type { GateEntry, GeBeam, GeBeamHit, GeContext, GeParty, GeRights, GeVehicle } from '../types';

const REMARK_MAX = 50;
const DOC_MAX = 20;
const sameNo = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();

export function BeamGateEntryForm({ ctx, service, rights, mode, initial, onSaved, onCancel }: {
  ctx: GeContext;
  service: GateEntryService;
  rights: GeRights;
  mode: 'add' | 'edit' | 'view';
  initial?: GateEntry;
  onSaved: (e: GateEntry, message: string) => void;
  onCancel: () => void;
}) {
  const { isPhone } = useDeviceClass();
  const adding = mode === 'add';
  const locked = !!initial && initial.inwarded > 0;
  const canSave = !locked && (adding ? rights.add : mode === 'edit' && rights.edit);

  // step 1: search party / beam no.
  const [q, setQ] = useState('');
  const [parties, setParties] = useState<GeParty[]>([]);
  const [hits, setHits] = useState<GeBeamHit[]>([]);
  const [loading, setLoading] = useState(false);
  // step 2
  const [party, setParty] = useState<{ code: string; name: string } | null>(initial ? { code: initial.parCode, name: initial.party } : null);
  const [beams, setBeams] = useState<GeBeam[]>(initial?.beams ?? []);
  const [beamsBusy, setBeamsBusy] = useState(false);
  const [scan, setScan] = useState('');
  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [vehicles, setVehicles] = useState<GeVehicle[]>([]);
  const [vehUid, setVehUid] = useState(initial?.vehUid ?? 0);
  const [docNo, setDocNo] = useState(initial?.docNo ?? '');
  const [docDate, setDocDate] = useState(initial?.docDate ?? '');
  const [remark, setRemark] = useState(initial?.remark ?? '');
  const [date, setDate] = useState(initial?.date ?? todayDMY());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const seq = useRef(0);
  const searchRef = useRef<TextInput | null>(null);
  const scanRef = useRef<TextInput | null>(null);

  /* ---- step 1: parties + beam no. lookup (debounced) ---- */
  const search = async (text: string) => {
    const my = ++seq.current;
    setLoading(true);
    try {
      const t = text.trim();
      const [p, h] = await Promise.all([
        service.parties(ctx, t),
        /\d/.test(t) ? service.findBeam(ctx, t).catch(() => [] as GeBeamHit[]) : Promise.resolve([] as GeBeamHit[]),
      ]);
      if (my !== seq.current) return;
      setParties(p);
      setHits(h);
    } catch (e: any) {
      if (my === seq.current) { setParties([]); setHits([]); setErr(e?.message || 'Could not load parties.'); }
    } finally {
      if (my === seq.current) setLoading(false);
    }
  };
  useEffect(() => {
    if (!adding || party) return;
    const t = setTimeout(() => search(q), 300);
    return () => clearTimeout(t);
  }, [q, party]); // eslint-disable-line react-hooks/exhaustive-deps

  /* open vehicle entries (VehLog) — the current one stays in the list when editing */
  useEffect(() => {
    if (!canSave && !initial?.vehUid) return;
    service.vehicles(ctx, '').then(v => {
      if (initial?.vehUid && !v.some(x => x.uid === initial.vehUid)) {
        v = [{ uid: initial.vehUid, vouNo: '', date: '', vehNo: initial.vehNo || `#${initial.vehUid}`, driver: '', transport: '', inTime: '' }, ...v];
      }
      setVehicles(v);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** open the party; tickKey = the beam the guard scanned first */
  const openParty = async (code: string, name: string, tickKey?: string) => {
    setErr('');
    setParty({ code, name });
    setBeams([]);
    setScanMsg(null);
    setBeamsBusy(true);
    try {
      const r = await service.partyBeams(ctx, code, 0);
      if (r.party) setParty({ code, name: r.party });
      setBeams(r.beams.map(b => ({ ...b, picked: !!tickKey && beamKey(b) === tickKey })));
      if (tickKey) {
        const b = r.beams.find(x => beamKey(x) === tickKey);
        if (b) setScanMsg({ ok: true, text: `Beam ${b.beamNo} ticked. Scan the next beam.` });
      }
      setTimeout(() => scanRef.current?.focus(), 200);
    } catch (e: any) {
      setErr(e?.message || 'Could not load the beams.');
    } finally {
      setBeamsBusy(false);
    }
  };

  const pickHit = (h: GeBeamHit) => openParty(h.parCode, h.party, beamKey(h));

  const onEnterSearch = () => {
    const t = q.trim();
    if (!t) return;
    const exact = hits.filter(h => sameNo(h.beamNo, t));
    if (exact.length === 1) return pickHit(exact[0]);
    if (!exact.length && hits.length === 1 && !parties.length) return pickHit(hits[0]);
    if (!hits.length && parties.length === 1) return openParty(parties[0].parCode, parties[0].party);
    if (!hits.length && !parties.length) setErr(`Nothing out for "${t}" - check the party name or the beam no.`);
  };

  /* ---- step 2: tick beams ---- */
  const canTick = (b: GeBeam) => canSave && !b.inwarded && b.openQty > 0;
  const toggle = (b: GeBeam) => canTick(b) && setBeams(bs => bs.map(x => (beamKey(x) === beamKey(b) ? { ...x, picked: !x.picked } : x)));
  const tickAll = (on: boolean) => setBeams(bs => bs.map(x => (canTick(x) ? { ...x, picked: on } : x)));
  const tickedCount = beams.filter(b => b.picked).length;

  /** scanned / typed beam no. → tick it */
  const onScan = () => {
    const t = scan.trim();
    if (!t) return;
    const found = beams.filter(b => sameNo(b.beamNo, t));
    if (!found.length) {
      setScanMsg({ ok: false, text: `Beam ${t} is not out at ${party?.name ?? 'this party'}.` });
    } else {
      const b = found.find(canTick) ?? found[0];
      if (!canTick(b)) setScanMsg({ ok: false, text: b.inwarded ? `Beam ${b.beamNo} is already taken in.` : `Beam ${b.beamNo} is not out any more.` });
      else if (b.picked) setScanMsg({ ok: true, text: `Beam ${b.beamNo} is already ticked.` });
      else {
        setBeams(bs => bs.map(x => (beamKey(x) === beamKey(b) ? { ...x, picked: true } : x)));
        setScanMsg({ ok: true, text: `Beam ${b.beamNo} ticked (outward ${b.outNo}).` });
      }
    }
    setScan('');
    setTimeout(() => scanRef.current?.focus(), 50);
  };

  /** beams grouped by their Beam Outward (oldest first, as the server sends them) */
  const groups = useMemo(() => {
    const m = new Map<number, { outNo: string; outDate: string; beams: GeBeam[] }>();
    beams.forEach(b => {
      const g = m.get(b.outUid) ?? { outNo: b.outNo, outDate: b.outDate, beams: [] };
      g.beams.push(b);
      m.set(b.outUid, g);
    });
    return [...m.entries()].map(([uid, g]) => ({ uid, ...g }));
  }, [beams]);

  const save = async () => {
    setErr('');
    if (!party) return setErr('Select the party.');
    if (!isValidDMY(date)) return setErr('Enter the date (dd-mm-yyyy).');
    if (docDate && !isValidDMY(docDate)) return setErr('Enter the challan date as dd-mm-yyyy, or leave it blank.');
    if (!tickedCount) return setErr('Tick the beams that came in.');
    setSaving(true);
    try {
      const r = await service.save(ctx, {
        uid: initial?.uid ?? 0, parCode: party.code, date, vehUid, docNo: docNo.trim(), docDate, remark: remark.trim(),
        beams: beams.filter(b => b.picked).map(b => ({ outUid: b.outUid, outSrNo: b.outSrNo, qty: b.openQty })),
      });
      if (!r.ok || !r.entry) return setErr(r.message || 'Save failed.');
      onSaved(r.entry, r.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---- render ---- */
  const pickStep = (
    <ScrollView contentContainerStyle={{ paddingBottom: SP.xl }} keyboardShouldPersistTaps="handled">
      <View style={st.card}>
        <Text style={st.bigLabel}>Party or Beam No.</Text>
        <View>
          <Input
            ref={searchRef}
            value={q}
            onChangeText={t => { setQ(t.toUpperCase()); setErr(''); }}
            onSubmitEditing={onEnterSearch}
            placeholder="Party name, or scan / type a beam no."
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            style={st.bigInput}
          />
          <Icon name="qr-code-scanner" size={26} color={C.muted} style={st.bigIcon} />
        </View>
        <Text style={st.hint}>Pick the party the beams came from, or type a beam no. painted on a beam — its party opens with that beam ticked.</Text>
        {err ? <Text style={st.err}>{err}</Text> : null}
      </View>

      {loading && !parties.length && !hits.length ? <ActivityIndicator color={C.cta} size="large" style={{ marginTop: SP.xl }} /> : null}

      {hits.length ? (
        <>
          <Text style={st.section}>Beam no. found</Text>
          {hits.map(h => (
            <Pressable
              key={beamKey(h)}
              onPress={() => pickHit(h)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.rowCard, hovered && { borderColor: C.cta }, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={`Beam ${h.beamNo}, ${h.party}`}>
              <View style={st.beamBadge}><Text style={st.beamBadgeTxt}>{h.beamNo}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.party} numberOfLines={1}>{h.party}</Text>
                <Text style={st.meta} numberOfLines={1}>{h.beamName ? `${h.beamName}  •  ` : ''}Outward {h.outNo}  •  {h.outDate}</Text>
              </View>
              <Icon name="chevron-right" size={28} color={C.cta} />
            </Pressable>
          ))}
        </>
      ) : null}

      {parties.length ? <Text style={st.section}>Parties with beams out</Text> : null}
      {parties.map(p => (
        <Pressable
          key={p.parCode}
          onPress={() => openParty(p.parCode, p.party)}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.rowCard, hovered && { borderColor: C.cta }, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={`Party ${p.party}`}>
          <View style={st.countBadge}>
            <Text style={st.countTxt}>{p.openBeams}</Text>
            <Text style={st.countLbl}>beam{p.openBeams === 1 ? '' : 's'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.party} numberOfLines={1}>{p.party || p.parCode}</Text>
            <Text style={st.meta} numberOfLines={2}>
              {p.outwards} outward{p.outwards === 1 ? '' : 's'} since {p.firstOut}{p.beamNos ? `  •  ${p.beamNos}` : ''}
            </Text>
          </View>
          <Icon name="chevron-right" size={28} color={C.cta} />
        </Pressable>
      ))}

      {!loading && !parties.length && !hits.length ? (
        <View style={st.empty}>
          <Icon name="inventory" size={36} color={C.muted} />
          <Text style={st.emptyTxt}>{q ? `Nothing out for "${q}"` : 'No beams are out at any party'}</Text>
        </View>
      ) : null}
    </ScrollView>
  );

  const confirmStep = (
    <ScrollView contentContainerStyle={{ paddingBottom: SP.xl }} keyboardShouldPersistTaps="handled">
      {locked ? <Banner icon="lock" text={`${initial!.inwarded} beam${initial!.inwarded === 1 ? ' is' : 's are'} already taken in by Beam Inward - this gate entry can't be changed.`} /> : null}
      {!locked && mode !== 'add' && !canSave ? <Banner icon="visibility" text="View only." /> : null}

      <View style={st.passCard}>
        <View style={st.passHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={LABEL}>Party</Text>
            <Text style={st.partyBig}>{party?.name || party?.code || '—'}</Text>
          </View>
          {initial ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={LABEL}>Gate Entry</Text>
              <Text style={st.geNo}>{initial.no}</Text>
              {initial.time ? <Text style={st.meta}>In {initial.time}</Text> : null}
            </View>
          ) : adding ? (
            <Btn small kind="ghost" icon="swap-horiz" title="Change" onPress={() => { setParty(null); setBeams([]); setErr(''); setTimeout(() => searchRef.current?.focus(), 100); }} />
          ) : null}
        </View>

        {canSave ? (
          <View style={{ marginBottom: SP.sm }}>
            <View>
              <Input
                ref={scanRef}
                value={scan}
                onChangeText={t => { setScan(t.toUpperCase()); setScanMsg(null); }}
                onSubmitEditing={onScan}
                blurOnSubmit={false}
                placeholder="Scan / type a beam no. and Enter to tick it"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                style={st.scanInput}
              />
              <Icon name="qr-code-scanner" size={22} color={C.muted} style={st.scanIcon} />
            </View>
            {scanMsg ? <Text style={[st.scanMsg, { color: scanMsg.ok ? C.ok : C.danger }]}>{scanMsg.text}</Text> : null}
          </View>
        ) : null}

        <View style={st.beamHead}>
          <Text style={[LABEL, { flex: 1 }]}>Beams on the vehicle ({tickedCount} of {beams.length} out)</Text>
          {canSave && beams.some(canTick) ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Btn small kind="ghost" title="All" onPress={() => tickAll(true)} />
              <Btn small kind="ghost" title="None" onPress={() => tickAll(false)} />
            </View>
          ) : null}
        </View>
        {beamsBusy ? <ActivityIndicator color={C.cta} style={{ marginVertical: SP.md }} /> : !beams.length ? (
          <Text style={st.hint}>No beams are out at this party.</Text>
        ) : (
          groups.map(g => (
            <View key={g.uid} style={{ marginTop: SP.sm }}>
              <Text style={st.groupHead}>
                Outward {g.outNo || '—'}{g.outDate ? `  •  ${g.outDate}` : ''}  •  {g.beams.length} beam{g.beams.length === 1 ? '' : 's'}
              </Text>
              <View style={st.tiles}>
                {g.beams.map(b => {
                  const can = canTick(b);
                  const why = b.inwarded ? 'Taken in' : b.openQty <= 0 && !b.picked ? 'Not out' : '';
                  return (
                    <Pressable
                      key={beamKey(b)}
                      onPress={() => toggle(b)}
                      disabled={!can}
                      style={[st.tile, isPhone && { width: '47%' }, b.picked && st.tileOn, !can && !b.picked && st.tileOff]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: b.picked, disabled: !can }}
                      accessibilityLabel={`Beam ${b.beamNo}`}>
                      <View style={st.tileTop}>
                        <Icon name={b.picked ? 'check-box' : 'check-box-outline-blank'} size={24} color={b.picked ? C.cta : C.muted} />
                        {why ? <Text style={st.why}>{why}</Text> : null}
                      </View>
                      <Text style={st.tileNo}>{b.beamNo}</Text>
                      <Text style={st.tileName} numberOfLines={1}>{b.beamName}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>

      <View style={st.card}>
        <Text style={st.bigLabel}>Vehicle</Text>
        {vehicles.length ? (
          <View style={st.vehWrap}>
            <VehChip label="No vehicle entry" sub="" on={!vehUid} onPress={() => canSave && setVehUid(0)} disabled={!canSave} />
            {vehicles.map(v => (
              <VehChip key={v.uid} label={v.vehNo || v.vouNo} sub={[v.vouNo && `No. ${v.vouNo}`, v.inTime && `in ${v.inTime}`, v.driver].filter(Boolean).join(' • ')}
                on={vehUid === v.uid} onPress={() => canSave && setVehUid(v.uid)} disabled={!canSave} />
            ))}
          </View>
        ) : (
          <Text style={st.hint}>No open vehicle entry of the last 3 days - the gate entry is saved without a vehicle.</Text>
        )}

        <Row>
          <Field label="Party challan no. (optional)">
            <Input value={docNo} onChangeText={t => setDocNo(t.toUpperCase().slice(0, DOC_MAX))} editable={canSave} autoCapitalize="characters" />
          </Field>
          <Field label="Challan date">
            <Input value={docDate} onChangeText={t => setDocDate(maskDMY(t))} placeholder="dd-mm-yyyy" keyboardType="number-pad" maxLength={10} editable={canSave} />
          </Field>
        </Row>
        <Row>
          <Field label="Date">
            <Input value={date} onChangeText={t => setDate(maskDMY(t))} keyboardType="number-pad" maxLength={10} editable={canSave} />
          </Field>
          <Field label={`Remark (${remark.length}/${REMARK_MAX})`}>
            <Input value={remark} onChangeText={t => setRemark(t.slice(0, REMARK_MAX))} editable={canSave} />
          </Field>
        </Row>
        {err ? <Text style={st.err}>{err}</Text> : null}
      </View>
    </ScrollView>
  );

  const step = adding && !party ? 'pick' : 'confirm';

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[st.body, !isPhone && { paddingHorizontal: SP.xl }]}>
        <View style={st.wrap}>{step === 'pick' ? pickStep : confirmStep}</View>
      </View>
      {step === 'confirm' ? (
        <View style={st.footer}>
          <View style={[st.wrap, { flexDirection: 'row', gap: SP.sm }]}>
            <Btn kind="ghost" title={canSave ? 'Cancel' : 'Close'} onPress={onCancel} style={{ flex: 1 }} />
            {canSave ? (
              <Btn icon="check-circle" title={adding ? `SAVE GATE ENTRY (${tickedCount})` : 'Update'} onPress={save} loading={saving}
                disabled={!tickedCount || beamsBusy} style={{ flex: 2, minHeight: 54 }} />
            ) : null}
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function VehChip({ label, sub, on, onPress, disabled }: { label: string; sub: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[st.veh, on && st.vehOn]} accessibilityRole="radio" accessibilityState={{ checked: on, disabled }} accessibilityLabel={`Vehicle ${label}`}>
      <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={on ? C.cta : C.muted} />
      <View style={{ flexShrink: 1 }}>
        <Text style={st.vehNo}>{label}</Text>
        {sub ? <Text style={st.vehSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, padding: SP.md },
  wrap: { width: '100%', maxWidth: 820, alignSelf: 'center', flex: 1 },
  card: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: SP.lg, marginBottom: SP.md, gap: SP.sm },
  bigLabel: { fontSize: 13, fontWeight: '800', color: C.nav, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  bigInput: { fontSize: 22, fontWeight: '800', minHeight: 58, paddingRight: 44, letterSpacing: 1 },
  bigIcon: { position: 'absolute', right: 12, top: 16 },
  hint: { fontSize: 12, color: C.muted },
  err: { color: C.danger, fontWeight: '700', fontSize: 14 },
  section: { fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: SP.sm, marginBottom: SP.sm },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: SP.md, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: SP.md, marginBottom: SP.sm, minHeight: 76 },
  beamBadge: { minWidth: 76, paddingHorizontal: SP.sm, paddingVertical: 10, borderRadius: R.md, backgroundColor: C.ctaSoft, borderWidth: 1, borderColor: C.cta, alignItems: 'center' },
  beamBadgeTxt: { fontSize: 18, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'] },
  countBadge: { width: 64, paddingVertical: 8, borderRadius: R.md, backgroundColor: C.quiet, alignItems: 'center' },
  countTxt: { fontSize: 22, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'] },
  countLbl: { fontSize: 10, fontWeight: '800', color: C.muted, textTransform: 'uppercase' },
  geNo: { fontSize: 20, fontWeight: '800', color: C.cta, fontVariant: ['tabular-nums'] },
  party: { fontSize: 17, fontWeight: '800', color: C.ink },
  partyBig: { fontSize: 22, fontWeight: '800', color: C.ink, marginTop: 2 },
  meta: { fontSize: 13, color: C.muted, marginTop: 2 },
  empty: { alignItems: 'center', gap: SP.sm, paddingVertical: 48 },
  emptyTxt: { fontSize: 15, color: C.muted, textAlign: 'center' },
  passCard: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 2, borderColor: C.cta, padding: SP.lg, marginBottom: SP.md },
  passHead: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.md, marginBottom: SP.md, paddingBottom: SP.md, borderBottomWidth: 1, borderColor: C.hair },
  scanInput: { fontSize: 18, fontWeight: '700', minHeight: 50, paddingRight: 40 },
  scanIcon: { position: 'absolute', right: 12, top: 14 },
  scanMsg: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  beamHead: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.sm },
  groupHead: { fontSize: 12, fontWeight: '800', color: C.nav, backgroundColor: C.quiet, paddingHorizontal: SP.sm, paddingVertical: 4, borderRadius: R.sm, alignSelf: 'flex-start' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.sm },
  tile: { width: 150, minHeight: 92, borderWidth: 2, borderColor: C.line, borderRadius: R.md, padding: SP.sm, backgroundColor: C.card },
  tileOn: { borderColor: C.cta, backgroundColor: C.ctaSoft },
  tileOff: { opacity: 0.45, backgroundColor: C.quiet },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  why: { fontSize: 10, fontWeight: '800', color: C.muted, textTransform: 'uppercase' },
  tileNo: { fontSize: 20, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'], marginTop: 4 },
  tileName: { fontSize: 11, color: C.muted },
  vehWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.sm },
  veh: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, borderWidth: 1, borderColor: C.line, borderRadius: R.md, paddingHorizontal: SP.md, paddingVertical: SP.sm, minHeight: 48, backgroundColor: C.card },
  vehOn: { borderColor: C.cta, borderWidth: 2, backgroundColor: C.ctaSoft },
  vehNo: { fontSize: 15, fontWeight: '800', color: C.nav },
  vehSub: { fontSize: 11, color: C.muted, maxWidth: 220 },
  footer: { padding: SP.md, backgroundColor: C.card, borderTopWidth: 1, borderColor: C.line },
});
