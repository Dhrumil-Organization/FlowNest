// FILE: src/screens/samplingHub/SmpForms.tsx
// New / modify sample form and the movement form of the Sampling Hub (artifact SmpNewSample / SmpMoveForm).
// Selections come from the existing masters: design = Design module catalogue (main_designs, new designs only),
// colourway = that design's colourways (Designs → Colourway tab), customer = Sales Order party list of the group.
import AppAlert from '@/common/utils/appAlert';
import { SamplingHubAPI } from '@/src/api/legacyClient';
import { PoyDateField } from '@/src/components/PoyRateEntryNEW/PoyDateField';
import { Opt, SelectField } from '@/src/components/StockVerificationNEW/ui';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../yarnHub/yarnHubModel';
import {
  allowedPurposes, autoName, Colourway, defaultPurpose, errCode, errText, GARMENTS, Masters, Move, normalizeColourways,
  PURPOSE, PurposeKey, Sample, SIZES, SMP_TYPE, SMP_TYPES, SmpState, SmpTypeKey, unwrap,
} from './samplingHubModel';
import { takeSamplePhoto } from './samplingPhoto';
import { MF, Seg } from './SmpParts';

type Ctx = { prptype: string; yearno: string };
type Row = { md_id: string; sd_ids: string[] };
const isoToDate = (v: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(); };
const dateToIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** colourways of designs, loaded once per design */
function useColourways(ctx: Ctx) {
  const [map, setMap] = useState<Record<string, Colourway[]>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const load = (md: string) => {
    if (!md || map[md] || busy[md]) return;
    setBusy((b) => ({ ...b, [md]: true }));
    SamplingHubAPI.colourways({ ...ctx, md_id: md })
      .then((r) => setMap((m) => ({ ...m, [md]: normalizeColourways(unwrap(r)) })))
      .catch(() => setMap((m) => ({ ...m, [md]: [] })))
      .finally(() => setBusy((b) => ({ ...b, [md]: false })));
  };
  return { map, busy, load };
}

/* ====================================================================== */
/*  new / modify sample                                                    */
/* ====================================================================== */
export function SampleForm({ ctx, masters, edit, savedPhoto, onDone, onOpen }: {
  ctx: Ctx; masters: Masters | null; edit: Sample | null;
  /** modify: the photo already saved (data URL), shown until replaced / removed */
  savedPhoto?: string;
  onDone: (data: any | null, msg: string) => void; onOpen: (id: string) => void;
}) {
  const [type, setType] = useState<SmpTypeKey>(edit?.type || 'garment');
  const [catF, setCatF] = useState('');
  const [md, setMd] = useState(edit?.md_id || '');
  const [sd, setSd] = useState(edit?.sd_id || '');
  const [colour, setColour] = useState(edit?.colour || '');
  const [garment, setGarment] = useState(edit?.garment || 'Shirt');
  const [size, setSize] = useState(edit?.size || 'M');
  const [metres, setMetres] = useState(edit ? String(edit.metres || '') : '1');
  const [range, setRange] = useState(edit?.range || '');
  const [rows, setRows] = useState<Row[]>(edit?.contents.map((c) => ({ md_id: c.md_id, sd_ids: c.sd_ids })) || []);
  const [qty, setQty] = useState(String(edit?.qty || 1));
  const [tracked, setTracked] = useState(edit ? edit.tracked : true);
  const [name, setName] = useState(edit?.name || '');
  // modify: a name that is still the automatic one keeps following the fields (size, design, colourway…);
  // only a name the user typed himself stays as it is
  const [touched, setTouched] = useState(() => !!edit && edit.name !== autoName({
    type: edit.type, design: edit.design, colourway: edit.colourway, colour: edit.sd_id ? '' : edit.colour, garment: edit.garment,
    size: edit.size, metres: edit.metres, range: edit.range, nContents: edit.contents.length,
  }));
  const [note, setNote] = useState(edit?.note || '');
  const [photo, setPhoto] = useState<string | null>(null);     // null = unchanged (edit) / none (new)
  const [photoCleared, setPhotoCleared] = useState(false);
  const [similar, setSimilar] = useState<string[]>([]);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const cw = useColourways(ctx);
  const T0 = SMP_TYPE[type];
  const designs = masters?.designs || [];
  const dById = useMemo(() => Object.fromEntries(designs.map((d) => [d.id, d])), [designs]);

  useEffect(() => { if (md) cw.load(md); }, [md]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { rows.forEach((r) => r.md_id && cw.load(r.md_id)); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const designOpts: Opt[] = designs
    .filter((d) => !catF || d.category === catF)
    .map((d) => ({ value: d.id, label: d.code + (d.dsn_code ? ` · ${d.dsn_code}` : ''), searchText: `${d.code} ${d.dsn_code} ${d.category}` }));
  // a design deactivated since the sample was made stays selectable on modify
  if (edit && edit.md_id && !dById[edit.md_id]) designOpts.unshift({ value: edit.md_id, label: `${edit.design || edit.md_id} (inactive)`, searchText: edit.design });
  const cwsOf = (id: string) => cw.map[id] || [];
  const cwOpts: Opt[] = cwsOf(md).map((c) => ({ value: c.id, label: c.code, searchText: `${c.code} ${c.commercial} ${c.colours.join(' ')}` }));
  if (edit && edit.sd_id && md === edit.md_id && cw.map[md] && !cwsOf(md).some((c) => c.id === edit.sd_id)) cwOpts.unshift({ value: edit.sd_id, label: `${edit.colourway} (inactive)` });
  const cwCode = (id: string, mdId: string) => cwsOf(mdId).find((c) => c.id === id)?.code || (edit && edit.sd_id === id ? edit.colourway : '');
  const designCode = (id: string) => dById[id]?.code || (edit && edit.md_id === id ? edit.design : '');
  const filled = rows.filter((r) => r.md_id);
  const auto = autoName({ type, design: designCode(md), colourway: sd ? cwCode(sd, md) : '', colour, garment, size, metres, range, nContents: filled.length });
  const nameNow = touched ? name : auto;
  const n = !edit && tracked ? Math.max(1, +qty || 1) : 1;
  const catOrder = masters?.categories || [];
  const detected = type === 'booklet' ? [...new Set(filled.map((r) => dById[r.md_id]?.category).filter(Boolean) as string[])] : md && dById[md]?.category ? [dById[md].category] : [];

  const pickType = (k: SmpTypeKey) => {
    setType(k); setTracked(SMP_TYPE[k].tracked !== false); setQty('1'); setRows([]); setTouched(false); setSimilar([]); setAck(false);
  };
  const resize = (k: number) => {
    const want = Math.max(0, Math.min(60, k));
    setRows((cur) => {
      let r = cur.slice();
      if (want > r.length) r = [...r, ...Array.from({ length: want - r.length }, () => ({ md_id: '', sd_ids: [] }))];
      while (r.length > want) { const i = r.map((x) => !x.md_id).lastIndexOf(true); r.splice(i >= 0 ? i : r.length - 1, 1); }
      return r;
    });
  };
  const choosePhoto = async (gallery = false) => {
    try {
      const p = await takeSamplePhoto(gallery);
      if (p) { setPhoto(p); setPhotoCleared(false); }
    } catch (e: any) {
      setErr(e?.message || 'Could not take the photo.');
    }
  };

  const save = async (ackSimilar = ack) => {
    setErr('');
    const e: string[] = [];
    if (type === 'booklet' ? !filled.length : !md) e.push(type === 'booklet' ? 'Fill the design of at least one sample in the booklet.' : 'Select the design.');
    if (type === 'fabric' && !(+metres > 0)) e.push('Enter metres per cutting.');
    if (!(+qty >= 1)) e.push('Enter the quantity.');
    if (!nameNow.trim()) e.push('Enter the sample name.');
    if (e.length) { setErr(e.join('\n')); return; }
    setBusy(true);
    const body: Record<string, any> = {
      ...ctx, type, md_id: type === 'booklet' ? '' : md, sd_id: type === 'booklet' ? '' : sd, colour: sd ? '' : colour.trim(),
      garment, size, metres, range: range.trim(), contents: type === 'booklet' ? filled : [], qty: +qty, tracked: tracked ? 1 : 0,
      name: nameNow.trim(), note: note.trim(), ack_similar: ackSimilar ? 1 : 0,
    };
    if (edit) body.id = edit.id;
    if (T0.photo && photo) body.photo = photo;
    else if (T0.photo && edit && photoCleared) body.photo = '';
    try {
      const r = await SamplingHubAPI.save(body);
      const d = unwrap(r);
      onDone(d, r?.data?.message || (edit ? 'Sample updated.' : 'Sample created.'));
    } catch (ex: any) {
      if (errCode(ex) === 'similar') {
        setSimilar((ex?.response?.data?.similar || []).map(String));
        setErr('');
      } else setErr(errText(ex, 'Could not save the sample.'));
    } finally {
      setBusy(false);
    }
  };

  const L = ({ t, req }: { t: string; req?: boolean }) => <Text style={f.lbl}>{t}{req ? <Text style={{ color: T.red }}> *</Text> : null}</Text>;
  return (
    <View style={f.card} testID="sample-form">
      <Text style={f.title}>{edit ? `Modify ${edit.id}` : 'New sample'}{!edit ? <Text style={{ color: T.copper, fontFamily: MF }}>{'  '}{T0.pfx}-…{n > 1 ? ` × ${n}` : ''}</Text> : null}</Text>
      {!edit ? (
        <View style={f.wrap}>{SMP_TYPES.map((t) => <Seg key={t.k} on={type === t.k} label={t.lbl} icon={t.icon} color={t.color} onPress={() => pickType(t.k)} />)}</View>
      ) : <Text style={f.hint}>{T0.lbl}{edit.tracked ? '' : ' · batch'} — type and tracking cannot change (the ID / QR is permanent).</Text>}

      {catOrder.length ? (
        <>
          <L t="ITEM CATEGORY · SHORTLISTS THE DESIGNS" />
          <View style={f.wrap}>
            <Seg on={!catF} label="Any category" onPress={() => setCatF('')} />
            {catOrder.map((c) => <Seg key={c} on={catF === c} label={(detected.includes(c) ? '✓ ' : '') + c} onPress={() => setCatF(catF === c ? '' : c)} />)}
          </View>
          <Text style={f.hint}>{detected.length ? 'Category read from the design: ' + detected.join(' · ') + (type === 'booklet' && detected.length > 1 ? ' — a booklet is filed under every category of its designs' : '') : 'Optional — the sample’s category always comes from the design chosen.'}</Text>
        </>
      ) : null}

      {type !== 'booklet' ? (
        <>
          <SelectField label="Design" required value={md} options={designOpts} loading={!masters}
            placeholder={catF ? `Select ${catF} design` : 'Select design'}
            onChange={(v) => { setMd(v); setSd(''); setTouched(!!edit && touched); setSimilar([]); }} />
          {md ? (
            <SelectField label="Colourway / shade" value={sd} options={cwOpts} loading={!!cw.busy[md]} clearable
              placeholder={cw.map[md] && !cwOpts.length ? 'No colourways on this design — type the colour below' : 'Select colourway (optional)'}
              disabled={!!cw.map[md] && !cwOpts.length}
              onChange={(v) => { setSd(v); setSimilar([]); }} />
          ) : null}
          {md && sd ? <Text style={f.hint}>{(() => { const c = cwsOf(md).find((x) => x.id === sd); return c ? (c.commercial ? 'piece-dyed · ' + c.commercial : c.colours.join(' / ')) || 'colourway ' + c.code : ''; })()}</Text> : null}
        </>
      ) : (
        <>
          <L t="RANGE / TITLE" />
          <TextInput value={range} onChangeText={setRange} placeholder="e.g. Linen Shirting AW26" style={f.inp} accessibilityLabel="Range" maxLength={100} />
          <L t="SAMPLES IN THIS BOOKLET" req />
          <View style={[f.wrap, { alignItems: 'center' }]}>
            <View style={f.stepper}>
              <Pressable onPress={() => resize(rows.length - 1)} style={f.stepBtn} accessibilityLabel="One less sample"><Text style={f.stepT}>−</Text></Pressable>
              <TextInput value={String(rows.length)} onChangeText={(v) => resize(+v.replace(/[^0-9]/g, '') || 0)} keyboardType="number-pad" style={f.stepInp} accessibilityLabel="Number of samples" />
              <Pressable onPress={() => resize(rows.length + 1)} style={f.stepBtn} accessibilityLabel="One more sample"><Text style={f.stepT}>+</Text></Pressable>
            </View>
            <Text style={f.hint}>{filled.length} of {rows.length} filled — fill the design (and shades) of each</Text>
          </View>
          {rows.map((r, i) => {
            const cws = cwsOf(r.md_id);
            const dup = r.md_id && rows.some((x, j) => j !== i && x.md_id === r.md_id);
            return (
              <View key={i} style={f.bRow}>
                <View style={[f.num, r.md_id && { backgroundColor: T.copper }]}><Text style={[f.numT, r.md_id && { color: '#fff' }]}>{i + 1}</Text></View>
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <SelectField label={`Design ${i + 1}`} value={r.md_id} options={designOpts} loading={!masters}
                    onChange={(v) => setRows((cur) => cur.map((x, j) => (j === i ? { md_id: v, sd_ids: [] } : x)))} />
                  {dup ? <Text style={[f.hint, { color: T.amber }]}>already in this booklet</Text> : null}
                  {r.md_id && cws.length ? (
                    <View style={f.wrap}>
                      {cws.map((c) => {
                        const on = r.sd_ids.includes(c.id);
                        return (
                          <Pressable key={c.id} onPress={() => setRows((cur) => cur.map((x, j) => (j === i ? { ...x, sd_ids: on ? x.sd_ids.filter((z) => z !== c.id) : [...x.sd_ids, c.id] } : x)))}
                            style={[f.cw, on && { borderColor: T.copper, backgroundColor: T.copper + '14' }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                            <Text style={[f.cwT, on && { color: T.copper }]}>{on ? '✓ ' : ''}{c.code}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : r.md_id && cw.map[r.md_id] ? <Text style={f.hint}>no colourways on this design — greige / single shade</Text> : null}
                </View>
                <Pressable onPress={() => setRows((cur) => cur.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel={`Remove sample ${i + 1}`}><Icon name="close" size={18} color={T.muted} /></Pressable>
              </View>
            );
          })}
          <Pressable onPress={() => resize(rows.length + 1)} style={f.addRow}><Text style={{ color: T.copper, fontWeight: '800' }}>+ 1 more sample</Text></Pressable>
        </>
      )}

      {type === 'garment' ? (
        <>
          <L t="GARMENT TYPE" req />
          <View style={f.wrap}>{(masters?.garments || GARMENTS).map((g) => <Seg key={g} on={garment === g} label={g} onPress={() => setGarment(g)} />)}</View>
          <L t="SIZE" req />
          <View style={f.wrap}>{(masters?.sizes || SIZES).map((g) => <Seg key={g} on={size === g} label={g} onPress={() => setSize(g)} />)}</View>
        </>
      ) : null}
      {type !== 'booklet' && !sd ? (
        <>
          <L t="COLOUR" />
          <TextInput value={colour} onChangeText={setColour} placeholder="e.g. Navy / White" style={f.inp} accessibilityLabel="Colour" maxLength={100} />
        </>
      ) : null}
      {type === 'fabric' ? (
        <>
          <L t="METRES PER CUTTING" req />
          <TextInput value={metres} onChangeText={(v) => setMetres(v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2}).+/, '$1'))} keyboardType="decimal-pad" style={[f.inp, { maxWidth: 140, fontFamily: MF }]} accessibilityLabel="Metres per cutting" />
        </>
      ) : null}
      {type !== 'booklet' && (!edit || !edit.tracked) ? (
        <>
          <L t={edit ? 'QUANTITY IN THE BATCH' : 'QUANTITY & TRACKING'} req />
          <View style={[f.wrap, { alignItems: 'center' }]}>
            <TextInput value={qty} onChangeText={(v) => setQty(v.replace(/[^0-9]/g, '').slice(0, 5))} keyboardType="number-pad" style={[f.inp, { width: 90, fontFamily: MF }]} accessibilityLabel="Quantity" />
            <Text style={f.hint}>{T0.unit}{+qty !== 1 ? 's' : ''}</Text>
            {!edit && T0.tracked === null ? (
              <View style={f.toggle}>
                {([[false, 'One batch · one QR'], [true, 'Each item its own ID & QR']] as [boolean, string][]).map(([v, l]) => (
                  <Pressable key={String(v)} onPress={() => setTracked(v)} style={[f.tgl, tracked === v && { backgroundColor: C.prod }]} accessibilityRole="button" accessibilityState={{ selected: tracked === v }}>
                    <Text style={[f.tglT, tracked === v && { color: '#fff' }]}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          {!edit ? <Text style={f.hint}>{tracked ? (n > 1 ? `${n} records will be created, each with its own Sample ID and QR.` : 'One record with its own Sample ID and QR.') : 'One batch record: a batch QR; issued and remaining quantities tracked on each movement; items can be split out later.'}</Text> : null}
        </>
      ) : null}
      {T0.photo ? (
        <>
          <L t="PHOTO · FOR IDENTIFICATION" />
          <View style={[f.wrap, { alignItems: 'center' }]}>
            {photo || (savedPhoto && !photoCleared) ? <Image source={{ uri: photo || savedPhoto }} style={f.photo} accessibilityLabel={photo ? 'New photo' : 'Saved photo'} /> : <View style={[f.photo, f.noPhoto]}><Icon name="photo-camera" size={22} color={T.muted} /></View>}
            <Pressable onPress={() => choosePhoto(false)} style={f.ghost} accessibilityRole="button"><Text style={f.ghostT}>{photo || (edit?.photo && !photoCleared) ? 'Replace photo' : Platform.OS === 'web' ? 'Choose photo' : 'Take photo'}</Text></Pressable>
            {Platform.OS !== 'web' ? <Pressable onPress={() => choosePhoto(true)} style={f.ghost}><Text style={f.ghostT}>Gallery</Text></Pressable> : null}
            {photo || (edit?.photo && !photoCleared) ? <Text onPress={() => { setPhoto(null); setPhotoCleared(true); }} style={[f.ghostT, { color: T.red }]}>Remove</Text> : null}
          </View>
          {edit?.photo && !photo && !photoCleared ? <Text style={f.hint}>The saved photo is kept unless you replace or remove it.</Text> : null}
        </>
      ) : null}

      <L t="SAMPLE NAME · WRITTEN BY THE ERP, EDIT IF NEEDED" req />
      <TextInput value={nameNow} onChangeText={(v) => { setTouched(true); setName(v); }} style={[f.inp, { fontWeight: '700' }]} accessibilityLabel="Sample name" maxLength={150} />
      {touched ? <Text onPress={() => { setTouched(false); setName(''); }} style={[f.hint, { color: T.nav, fontWeight: '700' }]}>↺ use the automatic name</Text> : null}
      <L t="NOTE" />
      <TextInput value={note} onChangeText={setNote} placeholder="optional" style={f.inp} accessibilityLabel="Note" maxLength={200} />

      {similar.length ? (
        <View style={f.warn} testID="similar-box">
          <Text style={f.warnT}><Text style={{ fontWeight: '800' }}>{similar.length} similar sample{similar.length !== 1 ? 's' : ''} already on record</Text> — review before creating another: {' '}
            {similar.slice(0, 6).map((id, i) => <Text key={id} onPress={() => onOpen(id)} style={{ fontFamily: MF, fontWeight: '800', textDecorationLine: 'underline' }}>{i ? ', ' : ''}{id}</Text>)}{similar.length > 6 ? ' …' : ''}
          </Text>
          <Pressable onPress={() => setAck(!ack)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }} accessibilityRole="checkbox" accessibilityState={{ checked: ack }} accessibilityLabel="Physically different item">
            <Icon name={ack ? 'check-box' : 'check-box-outline-blank'} size={18} color="#7A5A12" />
            <Text style={f.warnT}>This is a physically different item — create it with its own Sample ID</Text>
          </Pressable>
        </View>
      ) : null}
      {err ? <Text style={f.err}>{err}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Pressable onPress={() => onDone(null, '')} style={[f.btn, f.btnGhost]} accessibilityRole="button"><Text style={[f.btnT, { color: T.muted }]}>Cancel</Text></Pressable>
        <Pressable onPress={() => save()} disabled={busy || (similar.length > 0 && !ack)} accessibilityRole="button" accessibilityLabel={edit ? 'Save sample' : 'Create sample'}
          style={[f.btn, { flex: 1.6, backgroundColor: busy || (similar.length > 0 && !ack) ? T.alt : T.green }]}>
          <Text style={f.btnT}>{busy ? 'Saving…' : edit ? 'Save changes' : type === 'booklet' ? `Create booklet${filled.length ? ` · ${filled.length} sample${filled.length !== 1 ? 's' : ''}` : ''}` : n > 1 ? `Create ${n} samples` : 'Create sample'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ====================================================================== */
/*  movement (record / modify)                                             */
/* ====================================================================== */
export function MoveForm({ ctx, sample, state, me, today, masters, edit, onDone }: {
  ctx: Ctx; sample: Sample; state: SmpState; me: string; today: string; masters: Masters | null; edit: Move | null;
  onDone: (data: any | null, msg: string) => void;
}) {
  const allowed = useMemo(() => {
    if (edit) return (['dispatch', 'show', 'return', 'internal', 'consume'] as PurposeKey[]); // API checks the whole log
    return allowedPurposes(sample, state);
  }, [edit, sample, state]);
  const [purpose, setPurpose] = useState<PurposeKey>(edit ? edit.purpose : defaultPurpose(sample, state));
  const custs = masters?.customers || [];
  const [par, setPar] = useState(edit ? edit.parcode : '');
  const [other, setOther] = useState(edit ? !!edit.party && !edit.parcode : false);
  const [party, setParty] = useState(edit && !edit.parcode ? edit.party : '');
  const [singlet, setSinglet] = useState(edit?.singlet || '');
  const [date, setDate] = useState(edit?.date || today);
  const [qty, setQty] = useState(String(edit?.qty || 1));
  const [note, setNote] = useState(edit?.note || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const P = PURPOSE[purpose];
  const maxQ = sample.tracked ? 1 : edit ? sample.qty : purpose === 'return' ? state.out : state.bal;
  const partyOk = P.party !== 'required' || (other ? !!party.trim() : !!par);
  const qtyOk = sample.tracked || (+qty > 0 && +qty <= maxQ);
  const ok = !!singlet.trim() && partyOk && qtyOk && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;
  const custOpts: Opt[] = custs.map((c) => ({ value: c.code, label: c.name, searchText: `${c.name} ${c.city} ${c.code}` }));
  if (par && !custs.some((c) => c.code === par) && edit?.parcode === par) custOpts.unshift({ value: par, label: edit.party || par });

  if (!allowed.length) return <View style={f.card}><Text style={f.hint}>Nothing more can be recorded — the sample is {state.label.toLowerCase()}.</Text></View>;

  const save = async () => {
    if (!ok) {
      setErr(!singlet.trim() ? 'Enter the singlet number — every movement needs it.' : !partyOk ? 'Select the customer / party.' : !qtyOk ? `Quantity must be 1 to ${maxQ}.` : 'Check the date.');
      return;
    }
    setBusy(true); setErr('');
    const body: Record<string, any> = {
      ...ctx, sample: sample.id, date, purpose, singlet: singlet.trim(), qty: sample.tracked ? 1 : +qty, note: note.trim(),
      parcode: P.party === 'none' || other ? '' : par, party: P.party === 'none' ? '' : other ? party.trim() : '',
    };
    if (edit) body.id = edit.id;
    try {
      const r = await SamplingHubAPI.moveSave(body);
      onDone(unwrap(r), r?.data?.message || 'Recorded.');
    } catch (e: any) {
      setErr(errText(e, 'Could not save the movement.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[f.card, { borderLeftWidth: 4, borderLeftColor: C.prod }]} testID="move-form">
      <Text style={f.title}>{edit ? `Modify movement ${edit.no}` : 'Record movement'} · <Text style={{ fontFamily: MF }}>{sample.id}</Text> · by {edit ? edit.by : me}</Text>
      <View style={f.wrap}>{allowed.map((k) => <Seg key={k} on={purpose === k} label={PURPOSE[k].lbl} color={PURPOSE[k].color} onPress={() => setPurpose(k)} />)}</View>
      {P.party !== 'none' ? (
        <>
          <Text style={f.lbl}>CUSTOMER / PARTY{P.party === 'required' ? <Text style={{ color: T.red }}> * required</Text> : ' · optional'}</Text>
          {other ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TextInput value={party} onChangeText={setParty} placeholder="New party / prospect name" style={[f.inp, { flex: 1 }]} accessibilityLabel="Party name" maxLength={150} autoFocus />
              <Pressable onPress={() => { setOther(false); setParty(''); }} style={f.ghost} accessibilityLabel="Back to customer list"><Icon name="close" size={16} color={T.muted} /></Pressable>
            </View>
          ) : (
            <>
              <SelectField label="Customer" value={par} options={custOpts} loading={!masters} clearable placeholder="Select customer" onChange={(v) => setPar(v)} />
              <Text onPress={() => { setOther(true); setPar(''); }} style={[f.hint, { color: T.nav, fontWeight: '700' }]}>Other party / new prospect…</Text>
            </>
          )}
        </>
      ) : null}
      <View style={[f.wrap, { alignItems: 'flex-end' }]}>
        <View style={{ flexGrow: 1, flexBasis: 140 }}>
          <Text style={[f.lbl, { color: T.copper }]}>SINGLET NO. <Text style={{ color: T.red }}>*</Text></Text>
          <TextInput value={singlet} onChangeText={(v) => setSinglet(v.slice(0, 20))} placeholder="from the singlet book" style={[f.inp, { fontFamily: MF, borderColor: singlet.trim() ? T.border : T.copper }]} accessibilityLabel="Singlet number" />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 150 }}>
          <Text style={f.lbl}>DATE</Text>
          <PoyDateField value={isoToDate(date)} onChange={(d) => setDate(dateToIso(d))} />
        </View>
        {!sample.tracked ? (
          <View style={{ flexBasis: 100 }}>
            <Text style={f.lbl}>QTY · MAX {maxQ}</Text>
            <TextInput value={qty} onChangeText={(v) => setQty(v.replace(/[^0-9]/g, '').slice(0, 5))} keyboardType="number-pad" style={[f.inp, { fontFamily: MF, borderColor: qtyOk ? T.border : T.red }]} accessibilityLabel="Movement quantity" />
          </View>
        ) : null}
      </View>
      <TextInput value={note} onChangeText={setNote} placeholder="Note (optional) — purpose, courier, meeting…" style={[f.inp, { marginTop: 8 }]} accessibilityLabel="Movement note" maxLength={200} />
      {!singlet.trim() ? <Text style={[f.hint, { color: T.copper }]}>Every movement needs the singlet number, whatever its purpose or destination.</Text> : null}
      {err ? <Text style={f.err}>{err}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Pressable onPress={() => onDone(null, '')} style={[f.btn, f.btnGhost]}><Text style={[f.btnT, { color: T.muted }]}>Cancel</Text></Pressable>
        <Pressable onPress={save} disabled={busy} style={[f.btn, { flex: 1.6, backgroundColor: ok && !busy ? C.prod : T.alt }]} accessibilityRole="button" accessibilityLabel={edit ? 'Save movement' : 'Record movement'}>
          <Text style={f.btnT}>{busy ? 'Saving…' : edit ? 'Save movement' : 'Record ' + P.short.toLowerCase()}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** ask, then hard delete (sample or movement) */
export function confirmDelete(title: string, message: string, run: () => void) {
  AppAlert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete permanently', style: 'destructive', onPress: run },
  ]);
}

const f = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 13, marginBottom: 12, gap: 4 },
  title: { fontSize: 11.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  lbl: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4, marginTop: 10, marginBottom: 4 },
  hint: { fontSize: 10.5, color: T.muted, marginTop: 3 },
  inp: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13, color: T.ink, backgroundColor: '#fff' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: T.border, borderRadius: 9 },
  stepBtn: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center' },
  stepT: { fontSize: 18, color: T.nav },
  stepInp: { width: 54, textAlign: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: T.border, paddingVertical: 8, fontSize: 15, fontWeight: '800', fontFamily: MF, color: T.ink },
  bRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.alt },
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  numT: { fontSize: 10, fontWeight: '800', color: T.muted, fontFamily: MF },
  cw: { borderWidth: 1, borderColor: T.border, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 3 },
  cwT: { fontSize: 10.5, fontWeight: '700', color: T.muted },
  addRow: { borderWidth: 1, borderColor: T.border, borderRadius: 8, padding: 10, marginTop: 6 },
  toggle: { flexDirection: 'row', gap: 4, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, borderRadius: 9, padding: 3 },
  tgl: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 },
  tglT: { fontSize: 10.5, fontWeight: '800', color: T.muted },
  photo: { width: 72, height: 72, borderRadius: 10, borderWidth: 1, borderColor: T.border },
  noPhoto: { backgroundColor: T.sub, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  ghost: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#fff', justifyContent: 'center' },
  ghostT: { color: T.copper, fontWeight: '700', fontSize: 12.5 },
  warn: { marginTop: 10, backgroundColor: '#FBF1DC', borderWidth: 1, borderColor: '#EAD9A8', borderRadius: 8, padding: 10 },
  warnT: { fontSize: 11.5, color: '#7A5A12' },
  err: { color: T.red, fontSize: 12, marginTop: 8, fontWeight: '600' },
  btn: { flex: 1, borderRadius: 9, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { borderWidth: 1, borderColor: T.border, backgroundColor: '#fff' },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
