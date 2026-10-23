// FILE: src/screens/samplingHub/SamplingHubView.tsx
// Sampling Hub — the ERP Designing artifact's "Sampling hub" on live data (property GROUP wise, login year).
//
//   Dashboard    period · created / dispatches / in inventory / out with executives · search · group by item category
//                or sample type: samples created, customer dispatches, inventory, movement history
//   Samples      + New sample (garment / hanger / booklet / fabric sample / swatch card) · category → design drill ·
//                type + status filters · newest first
//   Scan & move  camera QR scan (phone + browser) or scanner gun / typed ID → the record opens with the movement
//                form ready · recently handled · my movements
//   Sample page  status / where / last movement / singlet · QR sticker preview + print · record / modify / delete
//                movements · modify / delete sample · split a batch into items · booklet contents
//
// Every sample has a permanent type-prefixed ID; the QR holds only that ID. Status is read off the movement log.
// Rights (production.sampling_hub): view · add · edit · delete · move · print — the API checks the same.
// Data: POST /api/sampling_hub/* (SamplingHubController) with { prptype, yearno } of the login.

import AppAlert from '@/common/utils/appAlert';
import { SamplingHubAPI } from '@/src/api/legacyClient';
import QrScanSheet from '@/src/components/StockVerificationNEW/QrScanSheet';
import { useBusinessContext } from '@/src/core/business';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../yarnHub/yarnHubModel';
import {
  addDays, allowedPurposes, catsOf, colourLabel, dateFull, designIds, designLabel, errText, isoToday, ListData, Masters,
  matches, Move, movesOf, normalizeList, normalizeMasters, parseSampleId, plural, PURPOSE, PURPOSES, PurposeKey, Sample,
  searchText, SMP_TYPE, SMP_TYPES, smpState, SmpState, SmpTypeKey, StCode, unwrap,
} from './samplingHubModel';
import { confirmDelete, MoveForm, SampleForm } from './SmpForms';
import { Chip, Empty, Head, MF, MoveRow, SampleRow, Seg, StatCard, StBadge, StickerCard, st as P, TypeIcon, Widget } from './SmpParts';

const RES = 'production.sampling_hub';
type Tab = 'dash' | 'register' | 'scan';
type Preset = 'today' | '7d' | 'month' | 'all';
type Page =
  | { kind: 'sample'; id: string }
  | { kind: 'list'; type: 'all' | SmpTypeKey; st: 'all' | StCode; created?: boolean; cat?: string; md?: string }
  | { kind: 'moves'; purpose: 'all' | PurposeKey; mine?: boolean; all?: boolean; singlet?: string; cat?: string; md?: string };

export function SamplingHubView() {
  const { prpGroup, yearNo, prpCode } = useBusinessContext();
  const { canDo } = usePermission();
  // login group + year; prpcode = login property (stored on new rows)
  const ctx = useMemo(() => ({ prptype: String(prpGroup || ''), yearno: String(yearNo || ''), prpcode: String(prpCode || '') }), [prpGroup, yearNo, prpCode]);
  const [data, setData] = useState<ListData | null>(null);
  const [masters, setMasters] = useState<Masters | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [tab, setTab] = useState<Tab | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [preset, setPreset] = useState<Preset>('month');
  const [q, setQ] = useState('');
  const [typeF, setTypeF] = useState<'all' | SmpTypeKey>('all');
  const [stF, setStF] = useState<'all' | StCode>('all');
  const [catF, setCatF] = useState('');
  const [desF, setDesF] = useState('');
  const [dashBy, setDashBy] = useState<'cat' | 'type'>('cat');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Sample | null>(null);
  const [moveOpen, setMoveOpen] = useState<{ edit: Move | null } | null>(null);
  const [sticker, setSticker] = useState<string[] | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanTxt, setScanTxt] = useState('');
  const [scanMsg, setScanMsg] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const gunRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  // rights: the registry (screen) and the API's answer must both allow
  const R = data?.rights;
  const can = (a: 'add' | 'edit' | 'delete' | 'move' | 'print') => canDo(RES, a) && (!R || R[a]);
  const canAdd = can('add'), canEdit = can('edit'), canDel = can('delete'), canMove = can('move'), canPrint = can('print');
  const salesOnly = canMove && !canAdd && !canEdit && !canDel;
  const tabs: [Tab, string][] = salesOnly ? [['scan', 'Scan & move']] : [['dash', 'Dashboard'], ['register', 'Samples'], ['scan', 'Scan & move']];
  const curTab: Tab = tab || (salesOnly ? 'scan' : canAdd && !(canEdit && canDel) ? 'register' : 'dash');


  const load = useCallback(async () => {
    if (!ctx.prptype || !ctx.yearno) { setError('Select the property group and year in the header.'); return; }
    setLoading(true); setError('');
    try {
      setData(normalizeList(unwrap(await SamplingHubAPI.list(ctx))));
    } catch (e: any) {
      setError(errText(e, 'Could not load the Sampling Hub.'));
    } finally {
      setLoading(false);
    }
  }, [ctx]);
  const loadMasters = useCallback(async () => {
    if (masters || !ctx.prptype) return;
    try { setMasters(normalizeMasters(unwrap(await SamplingHubAPI.masters(ctx)))); } catch (e: any) { setFlash('⚠ ' + errText(e, 'Could not load designs / customers.')); }
  }, [ctx, masters]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { setMasters(null); }, [ctx]);
  // the masters (designs, customers) are needed for the forms
  useEffect(() => { if (creating || editing || moveOpen) void loadMasters(); }, [creating, editing, moveOpen, loadMasters]);

  const samples = data?.samples || [];
  const moves = data?.moves || [];
  const me = data?.me.name || 'User';
  const today = data?.today || isoToday();
  const byId = useMemo(() => Object.fromEntries(samples.map((s) => [s.id, s])), [samples]);
  const withSt = useMemo(() => samples.map((s) => ({ s, st: smpState(s, moves) })), [samples, moves]);
  const stOf = (s: Sample) => smpState(s, moves);
  const range: [string, string] = preset === 'today' ? [today, today] : preset === '7d' ? [addDays(today, -6), today] : preset === 'month' ? [today.slice(0, 8) + '01', today] : ['0000-00-00', '9999-99-99'];
  const inR = (d: string) => d.slice(0, 10) >= range[0] && d.slice(0, 10) <= range[1];
  const rangeLbl = { today: 'Today', '7d': 'Last 7 days', month: 'This month', all: 'All time' }[preset];
  const catOrder = useMemo(() => [...new Set(samples.flatMap((s) => catsOf(s)))].sort((a, b) => a.localeCompare(b)), [samples]);
  const inCat = (s: Sample, c?: string) => !c || catsOf(s).includes(c);
  const hasDes = (s: Sample, id?: string) => !id || designIds(s).includes(id);
  const desName = (id: string) => { for (const s of samples) { if (s.md_id === id && s.design) return s.design; for (const c of s.contents) if (c.md_id === id && c.design) return c.design; } return id; };
  const desCat = (id: string) => { for (const s of samples) { if (s.md_id === id) return s.category; for (const c of s.contents) if (c.md_id === id) return c.category; } return ''; };

  /** apply a server answer (every write returns the fresh list) */
  const applyAnswer = (d: any) => { if (d && Array.isArray(d.samples)) setData(normalizeList(d)); };
  const openSample = (id: string, opts?: { move?: boolean }) => {
    setPage({ kind: 'sample', id }); setMoveOpen(opts?.move ? { edit: null } : null); setSticker(null); setEditing(null); setFlash('');
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  };
  const goPage = (p: Page | null) => { setPage(p); setMoveOpen(null); setSticker(null); setEditing(null); scrollRef.current?.scrollTo?.({ y: 0, animated: false }); };
  const fail = (e: any, what: string) => AppAlert.alert('Sampling Hub', errText(e, what));

  // garment photos are fetched when the sample page opens
  useEffect(() => {
    if (page?.kind !== 'sample') return;
    const s = byId[page.id];
    if (!s || !s.photo || photos[s.id] !== undefined) return;
    SamplingHubAPI.photo({ ...ctx, id: s.id }).then((r) => { const d = unwrap(r); setPhotos((p) => ({ ...p, [s.id]: d?.photo || '' })); }).catch(() => setPhotos((p) => ({ ...p, [s.id]: '' })));
  }, [page, byId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------ scan ------------------------------ */
  const runScan = (raw: string) => {
    const t = String(raw || '').trim();
    if (!t) return;
    const id = parseSampleId(t);
    if (!id) { setScanMsg(`“${t.slice(0, 40)}” is not a Sample ID (e.g. HNG-0001).`); return; }
    if (!byId[id]) { setScanMsg(`No sample with ID ${id} in your group.`); return; }
    setScanMsg(''); setScanTxt('');
    if (Platform.OS !== 'web') { try { require('react-native').Vibration.vibrate(40); } catch {} }
    openSample(id, { move: canMove && allowedPurposes(byId[id], stOf(byId[id])).length > 0 });
  };
  useEffect(() => {
    if (curTab === 'scan' && !page && Platform.OS === 'web') { const t = setTimeout(() => gunRef.current?.focus?.(), 150); return () => clearTimeout(t); }
  }, [curTab, page]);

  /* ------------------------------ actions ------------------------------ */
  const delSample = (s: Sample) => {
    const n = movesOf(moves, s.id).length;
    confirmDelete(`Delete ${s.id}?`, `${s.name}\n\nThis removes the sample${n ? ` and its ${plural(n, 'movement')}` : ''} permanently from the database. Its QR sticker will no longer open anything.`, async () => {
      try {
        const r = await SamplingHubAPI.remove({ ...ctx, id: s.id });
        applyAnswer(unwrap(r)); goPage(null); setFlash('✓ ' + (r?.data?.message || 'Deleted.'));
      } catch (e) { fail(e, 'Could not delete the sample.'); }
    });
  };
  const delMove = (m: Move) => {
    const s = byId[m.sample];
    confirmDelete(`Delete movement ${m.no}?`, `${PURPOSE[m.purpose].lbl}${m.party ? ' → ' + m.party : ''} · ${dateFull(m.date)} · singlet #${m.singlet || '—'}${s ? `\n${s.id} ${s.name}` : ''}\n\nRemoved permanently; the sample's status is read again from the remaining movements.`, async () => {
      try {
        const r = await SamplingHubAPI.moveRemove({ ...ctx, id: m.id });
        applyAnswer(unwrap(r)); setFlash('✓ ' + (r?.data?.message || 'Deleted.'));
      } catch (e) { fail(e, 'Could not delete the movement.'); }
    });
  };
  const split = (s: Sample) => {
    AppAlert.alert('Split 1 item out?', `One ${SMP_TYPE[s.type].unit} of ${s.id} gets its own Sample ID and QR.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Split', onPress: async () => {
        try {
          const r = await SamplingHubAPI.split({ ...ctx, id: s.id, n: 1 });
          const d = unwrap(r); applyAnswer(d); setFlash('✓ ' + (r?.data?.message || 'Split.'));
          if (Array.isArray(d?.saved) && d.saved.length) setSticker(d.saved.map(String));
        } catch (e) { fail(e, 'Could not split.'); }
      } },
    ]);
  };

  /* ------------------------------ helpers ------------------------------ */
  const Tag = ({ s }: { s: Sample }) => <>{catsOf(s).map((c) => <Chip key={c} t={c} c={C.prod} />)}</>;
  const search = (
    <TextInput value={q} onChangeText={setQ} placeholder="Search sample ID, name, design, colourway, category or singlet no.…" style={st.search} accessibilityLabel="Search samples" />
  );
  const ql = q.trim().toLowerCase();
  const found = ql ? withSt.filter(({ s }) => matches(searchText(s), ql) || s.id.toLowerCase().includes(ql)) : [];
  const foundMv = ql ? moves.filter((m) => m.singlet && (m.singlet.toLowerCase() === ql || (ql.length >= 3 && m.singlet.toLowerCase().includes(ql)))) : [];
  const results = ql ? (
    <View style={P.card}>
      <Head t={`${plural(found.length, 'sample')}${foundMv.length ? ` · ${plural(foundMv.length, 'movement')} on singlet` : ''}`} />
      {found.slice(0, 20).map(({ s, st: x }) => <SampleRow key={s.id} s={s} state={x} onPress={() => openSample(s.id)} />)}
      {foundMv.slice(0, 20).map((m) => <MoveRow key={m.id} m={m} sample={byId[m.sample]} onPress={byId[m.sample] ? () => openSample(m.sample) : undefined} />)}
      {!found.length && !foundMv.length ? <Empty t="No sample or singlet number matches." /> : null}
    </View>
  ) : null;
  /** item category → design drill (General → Specific), counts on each chip */
  const catDrill = (items: { s: Sample }[], cat: string, md: string, onCat: (c: string) => void, onDes: (id: string) => void) => {
    if (!catOrder.length) return null;
    const inC = cat ? items.filter(({ s }) => inCat(s, cat)) : [];
    const des: { id: string; n: number }[] = [];
    inC.forEach(({ s }) => designIds(s).forEach((id) => { if (desCat(id) === cat && !des.some((x) => x.id === id)) des.push({ id, n: 0 }); }));
    des.forEach((x) => { x.n = inC.filter(({ s }) => hasDes(s, x.id)).length; });
    des.sort((a, b) => b.n - a.n || desName(a.id).localeCompare(desName(b.id)));
    return (
      <>
        <View style={st.wrap}>
          <Seg on={!cat} label="All categories" onPress={() => onCat('')} />
          {catOrder.map((c) => { const n = items.filter(({ s }) => inCat(s, c)).length; return n || cat === c ? <Seg key={c} on={cat === c} label={`${c} · ${n}`} onPress={() => onCat(c)} /> : null; })}
        </View>
        {cat ? (
          <View style={[st.wrap, st.subWrap]}>
            <Text style={P.lbl}>DESIGNS</Text>
            <Seg on={!md} label={`All ${cat}`} onPress={() => onDes('')} />
            {des.map((x) => <Seg key={x.id} on={md === x.id} label={`${desName(x.id)} · ${x.n}`} onPress={() => onDes(x.id)} />)}
          </View>
        ) : null}
      </>
    );
  };
  const crumbs = (items: { l: string; fn?: () => void }[]) => (
    <View style={st.crumbs}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <Text style={{ color: C.mut }}>›</Text> : null}
          <Text onPress={it.fn} style={[st.crumb, { color: it.fn ? C.prod : C.ink }]}>{it.l}</Text>
        </React.Fragment>
      ))}
      <Text onPress={() => goPage(null)} style={[st.crumb, { marginLeft: 'auto', color: C.prod }]} accessibilityRole="button" accessibilityLabel="Back">‹ back</Text>
    </View>
  );

  /* ================================ sample page ================================ */
  const samplePage = (id: string) => {
    const s = byId[id];
    if (!s) return <View style={P.card}><Text style={P.note}>Sample {id} not found (it may have been deleted). <Text onPress={() => goPage(null)} style={P.link}>‹ back</Text></Text></View>;
    const x = stOf(s);
    const t = SMP_TYPE[s.type];
    const hist = movesOf(moves, s.id).slice().reverse();
    const allowed = allowedPurposes(s, x);
    const kids = samples.filter((k) => k.parent === s.id);
    return (
      <>
        {crumbs([{ l: 'Sampling', fn: () => goPage(null) }, { l: t.lbl + 's', fn: () => goPage({ kind: 'list', type: s.type, st: 'all' }) }, { l: s.id }])}
        <View style={P.card}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <TypeIcon s={s} size={64} photo={photos[s.id] || undefined} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={st.wrapC}><Text style={st.bigId}>{s.id}</Text><Chip t={t.lbl} c={t.color} /><Tag s={s} /><StBadge s={x} /></View>
              <Text style={st.sName}>{s.name}</Text>
              <Text style={P.rowSub}>
                {designLabel(s)}{s.dsn_code ? ` (${s.dsn_code})` : ''}{s.design_gone ? ' · design no longer in the master' : ''}{colourLabel(s) ? ' · ' + colourLabel(s) : ''}{s.size ? ' · size ' + s.size : ''}{s.metres ? ` · ${s.metres} m each` : ''}{s.range ? ' · ' + s.range : ''}
                {' · created '}{dateFull(s.created)} by {s.by}{s.parent ? ' · from ' + s.parent : ''}{s.edited_by ? ` · modified by ${s.edited_by}${s.edited_at ? ' ' + s.edited_at : ''}` : ''}
              </Text>
              {s.note ? <Text style={[P.rowSub, { fontStyle: 'italic' }]}>{s.note}</Text> : null}
            </View>
          </View>
          <View style={[st.wrap, { marginTop: 12 }]}>
            <StatCard label="Status" value={x.label} color={x.color} />
            <StatCard label="Where" value={x.where} />
            {s.tracked ? <StatCard label={x.code === 'sent' ? 'Dispatched' : 'Last movement'} value={x.last ? dateFull(x.last.date) : '—'} color={C.mut} />
              : <StatCard label="Balance" value={`${x.bal} / ${s.qty} ${t.unit}${s.qty !== 1 ? 's' : ''}`} color={C.prod} />}
            <StatCard label={x.last ? 'Singlet · ' + x.last.by : 'Singlet'} value={x.last?.singlet ? '#' + x.last.singlet : '—'} color={T.copper} />
          </View>
          {!s.tracked ? (
            <View style={{ marginTop: 8 }}>
              <View style={st.bar}><View style={[st.barIn, { width: `${s.qty ? Math.min(100, (x.bal / s.qty) * 100) : 0}%`, backgroundColor: t.color }]} /></View>
              <Text style={P.note}>{x.bal} left · {x.out} out · {x.sent} sent to customers{kids.length ? ` · ${kids.length} split out as items` : ''}</Text>
            </View>
          ) : null}
          {s.type === 'booklet' && s.contents.length ? (
            <Text style={[P.rowSub, { marginTop: 8 }]}>
              <Text style={{ fontWeight: '800', color: C.ink }}>Contents: </Text>
              {s.contents.map((c, i) => `${i ? ' · ' : ''}${c.design || c.md_id}${c.colourways.length ? ` (${c.colourways.join(', ')})` : ''}${c.category ? ' · ' + c.category : ''}`).join('')}
              {catsOf(s).length > 1 ? ` — filed under ${catsOf(s).join(' and ')}` : ''}
            </Text>
          ) : null}
          <View style={[st.wrap, { marginTop: 12 }]}>
            {canMove && !moveOpen && allowed.length ? <ActBtn label="Record movement" icon="swap-horiz" kind="primary" onPress={() => { setMoveOpen({ edit: null }); setEditing(null); }} /> : null}
            <ActBtn label={sticker ? 'Hide QR sticker' : 'QR sticker'} icon="qr-code-2" onPress={() => setSticker(sticker ? null : [s.id])} />
            {canAdd && !s.tracked && x.bal > 0 ? <ActBtn label="Split 1 out as an item" icon="call-split" onPress={() => split(s)} /> : null}
            {canEdit && !editing ? <ActBtn label="Modify" icon="edit" onPress={() => { setEditing(s); setMoveOpen(null); }} /> : null}
            {canDel ? <ActBtn label="Delete" icon="delete-outline" danger onPress={() => delSample(s)} /> : null}
          </View>
          {flash ? <Text style={st.flash}>{flash}</Text> : null}
        </View>
        {sticker ? <StickerCard key={sticker.join(',')} samples={sticker.map((k) => byId[k]).filter(Boolean)} ctx={ctx} canPrint={canPrint} onDone={(m) => setFlash('✓ ' + m)} onError={(m) => AppAlert.alert('Print', m)} /> : null}
        {editing ? (
          <SampleForm key={'e' + s.id} ctx={ctx} masters={masters} edit={editing} onOpen={(k) => openSample(k)}
            onDone={(d, m) => { setEditing(null); if (d) { applyAnswer(d); setFlash('✓ ' + m); } }} />
        ) : null}
        {moveOpen ? (
          <MoveForm key={'m' + s.id + (moveOpen.edit?.id || '')} ctx={ctx} sample={s} state={x} me={me} today={today} masters={masters} edit={moveOpen.edit}
            onDone={(d, m) => { setMoveOpen(null); if (d) { applyAnswer(d); setFlash('✓ ' + m); } }} />
        ) : null}
        <View style={P.card}>
          <Head t={`MOVEMENT HISTORY · ${hist.length}`} right={<Text style={P.lbl}>SINGLET</Text>} />
          {hist.map((m) => (
            <MoveRow key={m.id} m={m}
              onEdit={canEdit && m.purpose !== 'split' ? () => { setMoveOpen({ edit: m }); setEditing(null); } : undefined}
              onDelete={canDel ? () => delMove(m) : undefined} />
          ))}
          {!hist.length ? <Empty t="No movements yet — the sample is in the sampling store." /> : null}
          {kids.length ? <Text style={[P.note, { marginTop: 6 }]}>Split out: {kids.map((k) => <Text key={k.id} onPress={() => openSample(k.id)} style={{ fontFamily: MF, fontWeight: '800', color: C.prod }}>{k.id} </Text>)}</Text> : null}
        </View>
      </>
    );
  };

  /* ================================ list pages ================================ */
  const listPage = (f: Extract<Page, { kind: 'list' }>) => {
    const pool = withSt.filter(({ s, st: x }) => (f.type === 'all' || s.type === f.type) && (f.st === 'all' || x.code === f.st) && (!f.created || inR(s.created)));
    const rows = pool.filter(({ s }) => inCat(s, f.cat) && hasDes(s, f.md)).slice().sort((a, b) => b.s.created.localeCompare(a.s.created) || b.s.id.localeCompare(a.s.id));
    const title = (f.type === 'all' ? 'All samples' : SMP_TYPE[f.type].lbl + 's') + (f.st !== 'all' ? ' · ' + f.st : '') + (f.created ? ' · created ' + rangeLbl.toLowerCase() : '');
    return (
      <>
        {crumbs([{ l: 'Sampling', fn: () => goPage(null) }, { l: title, fn: f.cat ? () => goPage({ ...f, cat: '', md: '' }) : undefined }, ...(f.cat ? [{ l: f.cat, fn: f.md ? () => goPage({ ...f, md: '' }) : undefined }] : []), ...(f.md ? [{ l: desName(f.md) }] : [])])}
        {catDrill(pool, f.cat || '', f.md || '', (c) => goPage({ ...f, cat: c, md: '' }), (id) => goPage({ ...f, md: id }))}
        <View style={P.card}>
          <Head t={`${plural(rows.length, 'sample')}${f.cat ? ' · ' + f.cat : ''}${f.md ? ' · ' + desName(f.md) : ''}`} right={<Text style={P.lbl}>STATUS</Text>} />
          {rows.map(({ s, st: x }) => <SampleRow key={s.id} s={s} state={x} onPress={() => openSample(s.id)} />)}
          {!rows.length ? <Empty t="Nothing here." /> : null}
        </View>
      </>
    );
  };
  const movesPage = (f: Extract<Page, { kind: 'moves' }>) => {
    const pool = moves.filter((m) => (f.purpose === 'all' || m.purpose === f.purpose) && (!f.mine || m.by_id === data?.me.id) && (f.all || f.singlet || inR(m.date)) && (!f.singlet || m.singlet === f.singlet))
      .slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const rows = pool.filter((m) => { const s = byId[m.sample]; return s ? inCat(s, f.cat) && hasDes(s, f.md) : !f.cat && !f.md; });
    const title = f.singlet ? 'Singlet #' + f.singlet : f.purpose === 'dispatch' ? 'Customer dispatches · ' + rangeLbl : f.mine ? 'My movements' : 'Movement history · ' + (f.all ? 'all time' : rangeLbl);
    const items = pool.map((m) => ({ s: byId[m.sample] })).filter((x) => x.s) as { s: Sample }[];
    return (
      <>
        {crumbs([{ l: 'Sampling', fn: () => goPage(null) }, { l: title, fn: f.cat ? () => goPage({ ...f, cat: '', md: '' }) : undefined }, ...(f.cat ? [{ l: f.cat }] : [])])}
        {!f.singlet ? catDrill(items, f.cat || '', f.md || '', (c) => goPage({ ...f, cat: c, md: '' }), (id) => goPage({ ...f, md: id })) : null}
        <View style={P.card}>
          <Head t={plural(rows.length, 'movement')} right={<Text style={P.lbl}>SINGLET</Text>} />
          {rows.map((m) => <MoveRow key={m.id} m={m} sample={byId[m.sample]} onPress={byId[m.sample] ? () => openSample(m.sample) : undefined} />)}
          {!rows.length ? <Empty t="No movements." /> : null}
        </View>
      </>
    );
  };

  /* ================================ dashboard ================================ */
  const dashTab = () => {
    const created = withSt.filter(({ s }) => inR(s.created));
    const disp = moves.filter((m) => m.purpose === 'dispatch' && inR(m.date)).slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const recent = moves.filter((m) => inR(m.date)).slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const inv = withSt.filter(({ st: x }) => x.code === 'in'), out = withSt.filter(({ st: x }) => x.code === 'out' || x.code === 'use'), sent = withSt.filter(({ st: x }) => x.code === 'sent');
    const units = (a: { s: Sample }[]) => a.reduce((t, { s }) => t + (s.tracked ? 1 : s.qty), 0);
    const byCat = dashBy === 'cat';
    const groups = (a: { s: Sample; st: SmpState }[]) => byCat
      ? catOrder.map((c) => ({ k: c, lbl: c, icon: 'category', list: a.filter(({ s }) => inCat(s, c)), nav: { cat: c } as any })).filter((g) => g.list.length)
      : SMP_TYPES.map((t) => ({ k: t.k, lbl: t.lbl + 's', icon: t.icon, list: a.filter(({ s }) => s.type === t.k), nav: { type: t.k } as any })).filter((g) => g.list.length);
    const gRow = (g: { k: string; lbl: string; icon: string; list: any[] }, sub: string, right: string, rsub: string, onPress: () => void) => (
      <Pressable key={g.k} onPress={onPress} style={P.row} accessibilityRole="button" accessibilityLabel={g.lbl}>
        <Icon name={g.icon as any} size={16} color={C.prod} />
        <View style={{ flex: 1, minWidth: 0 }}><Text style={st.gT}>{g.lbl} · {g.list.length}</Text><Text style={P.rowSub}>{sub}</Text></View>
        <View style={{ alignItems: 'flex-end' }}><Text style={st.gN}>{right}</Text><Text style={P.singletL}>{rsub}</Text></View>
      </Pressable>
    );
    const designsIn = (l: { s: Sample }[], c?: string) => new Set(l.flatMap(({ s }) => designIds(s).filter((id) => !c || desCat(id) === c))).size;
    return (
      <>
        <View style={P.card}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={st.logo}><Icon name="qr-code-2" size={22} color={C.prod} /></View>
            <View style={{ flex: 1 }}><Text style={st.h1}>Sampling</Text><Text style={P.note}>{rangeLbl} · {plural(samples.length, 'sample')} on record · status read from every movement</Text></View>
          </View>
          <View style={[st.wrap, { marginTop: 12 }]}>
            <StatCard label={'Created · ' + rangeLbl.toLowerCase()} value={String(created.length)} color={C.prod} />
            <StatCard label="Dispatches" value={String(disp.length)} color="#652880" />
            <StatCard label="In inventory" value={String(inv.length)} color={T.green} />
            <StatCard label="Out with executives" value={String(out.length)} color={T.copper} />
          </View>
          <View style={{ marginTop: 12 }}>{search}</View>
        </View>
        {results}
        {!ql ? (
          <>
            <View style={[st.wrap, { alignItems: 'center', marginBottom: 10 }]}>
              <Text style={P.lbl}>GROUP BY</Text>
              <Seg on={byCat} label="Item category" onPress={() => setDashBy('cat')} />
              <Seg on={!byCat} label="Sample type" onPress={() => setDashBy('type')} />
            </View>
            <Widget icon="add-box" title={'Samples created · ' + created.length} accent={C.prod} onTitle={() => goPage({ kind: 'list', type: 'all', st: 'all', created: true })}>
              {groups(created).map((g) => gRow(g, byCat ? `${plural(designsIn(g.list, g.k), 'design')}` : `${g.list.filter(({ s }) => s.tracked).length} individual · ${g.list.filter(({ s }) => !s.tracked).length} batch`, String(g.list.length), plural(units(g.list), 'unit'), () => goPage({ kind: 'list', type: 'all', st: 'all', created: true, ...g.nav })))}
              {!created.length ? <Empty t="No samples created in this period." /> : null}
            </Widget>
            <Widget icon="local-shipping" title={'Customer dispatches · ' + disp.length} accent="#652880" onTitle={() => goPage({ kind: 'moves', purpose: 'dispatch' })}>
              <Text style={P.note}>{plural(new Set(disp.map((m) => m.party)).size, 'customer')} · {plural(new Set(disp.map((m) => m.singlet)).size, 'singlet')}</Text>
              {disp.slice(0, 4).map((m) => <MoveRow key={m.id} m={m} sample={byId[m.sample]} onPress={byId[m.sample] ? () => openSample(m.sample) : undefined} />)}
              {!disp.length ? <Empty t="No dispatches in this period." /> : null}
            </Widget>
            <Widget icon="inventory-2" title="Sample inventory" accent={T.green} onTitle={() => goPage({ kind: 'list', type: 'all', st: 'in' })}>
              <Text style={P.note}>{inv.length} in store · {out.length} out / in use · {sent.length} with customers</Text>
              {groups(withSt).map((g) => {
                const i = g.list.filter(({ st: x }) => x.code === 'in');
                const o = g.list.filter(({ st: x }) => x.code === 'out' || x.code === 'use');
                const se = g.list.filter(({ st: x }) => x.code === 'sent');
                const stock = i.filter(({ s }) => !s.tracked).reduce((t, { st: x }) => t + x.bal, 0);
                return gRow(g, `${o.length} out · ${se.length} with customers${stock ? ` · ${stock} batch units in stock` : ''}`, String(i.length), 'in store', () => goPage({ kind: 'list', type: 'all', st: 'all', ...g.nav }));
              })}
              {byCat && withSt.some(({ s }) => catsOf(s).length > 1) ? <Text style={P.note}>A booklet with designs from several categories is listed under each of them.</Text> : null}
            </Widget>
            <Widget icon="swap-horiz" title={'Movement history · ' + recent.length} accent={T.copper} onTitle={() => goPage({ kind: 'moves', purpose: 'all' })}>
              <Text style={P.note}>{PURPOSES.filter((p) => p.k !== 'split').slice(0, 3).map((p) => `${recent.filter((m) => m.purpose === p.k).length} ${p.short.toLowerCase()}`).join(' · ')}</Text>
              {recent.slice(0, 6).map((m) => <MoveRow key={m.id} m={m} sample={byId[m.sample]} onPress={byId[m.sample] ? () => openSample(m.sample) : undefined} />)}
              {!recent.length ? <Empty t="No movements in this period." /> : null}
            </Widget>
          </>
        ) : null}
      </>
    );
  };

  /* ================================ samples (register) ================================ */
  const registerTab = () => {
    const pool = withSt.filter(({ s, st: x }) => (typeF === 'all' || s.type === typeF) && (stF === 'all' || x.code === stF));
    const rows = pool.filter(({ s }) => inCat(s, catF) && hasDes(s, desF)).slice().sort((a, b) => b.s.created.localeCompare(a.s.created) || b.s.id.localeCompare(a.s.id));
    return (
      <>
        {canAdd ? (creating ? (
          <SampleForm key="new" ctx={ctx} masters={masters} edit={null} onOpen={(k) => { setCreating(false); openSample(k); }}
            onDone={(d, m) => {
              setCreating(false);
              if (!d) return;
              applyAnswer(d);
              const ids: string[] = Array.isArray(d.saved) ? d.saved.map(String) : [];
              if (ids.length) { openSample(ids[0]); setSticker(ids); setFlash('✓ ' + m); }
            }} />
        ) : (
          <Pressable onPress={() => setCreating(true)} style={st.newBtn} accessibilityRole="button" accessibilityLabel="New sample">
            <Icon name="add" size={18} color="#fff" /><Text style={st.newT}>New sample</Text>
          </Pressable>
        )) : null}
        {flash && !page ? <Text style={st.flash}>{flash}</Text> : null}
        {search}
        {results}
        {!ql ? (
          <>
            {catDrill(pool, catF, desF, (c) => { setCatF(c); setDesF(''); }, setDesF)}
            <View style={st.wrap}>
              <Seg on={typeF === 'all'} label="All types" onPress={() => setTypeF('all')} />
              {SMP_TYPES.map((t) => <Seg key={t.k} on={typeF === t.k} label={t.lbl} icon={t.icon} color={t.color} onPress={() => setTypeF(t.k)} />)}
            </View>
            <View style={[st.wrap, { marginBottom: 10 }]}>
              {([['all', 'Any status'], ['in', 'In inventory'], ['out', 'Out with executives'], ['sent', 'With customers'], ['gone', 'Consumed / issued']] as ['all' | StCode, string][]).map(([k, l]) => <Seg key={k} on={stF === k} label={l} onPress={() => setStF(k)} />)}
            </View>
            <View style={P.card}>
              <Head t={`${plural(rows.length, 'sample')}${catF ? ' · ' + catF : ''}${desF ? ' · ' + desName(desF) : ''} · newest first`} right={<Text style={P.lbl}>STATUS</Text>} />
              {rows.map(({ s, st: x }) => <SampleRow key={s.id} s={s} state={x} onPress={() => openSample(s.id)} />)}
              {!rows.length ? <Empty t={samples.length ? 'No samples match.' : canAdd ? 'No samples yet — create the first one above.' : 'No samples yet.'} /> : null}
            </View>
          </>
        ) : null}
      </>
    );
  };

  /* ================================ scan & move ================================ */
  const scanTab = () => {
    const mine = moves.filter((m) => m.by_id === data?.me.id).slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const latest = moves.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const recentIds = [...new Set(latest.map((m) => m.sample))].filter((k) => byId[k]).slice(0, 6);
    const list = salesOnly ? mine : latest;
    return (
      <>
        <View style={P.card}>
          <Text style={st.h1}>Scan a sample</Text>
          <Text style={[P.note, { marginBottom: 10 }]}>Scan the QR sticker with the camera, shoot it with the scanner gun, or type the Sample ID. The record opens with the movement form ready — purpose, party, singlet no., date.</Text>
          <Pressable onPress={() => setScanOpen(true)} style={st.camBtn} accessibilityRole="button" accessibilityLabel="Scan QR with camera">
            <Icon name="qr-code-scanner" size={22} color="#fff" /><Text style={st.newT}>Scan QR (camera)</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput ref={gunRef} value={scanTxt} onChangeText={(v) => { setScanTxt(v); setScanMsg(''); }}
              onSubmitEditing={() => { const v = scanTxt; runScan(v); }} blurOnSubmit={false} autoCapitalize="characters" autoCorrect={false}
              placeholder="Scanner gun / type ID e.g. HNG-0001" style={st.gun} accessibilityLabel="Scanner or Sample ID" returnKeyType="go" />
            <Pressable onPress={() => runScan(scanTxt)} style={st.openBtn} accessibilityRole="button" accessibilityLabel="Open sample"><Text style={st.newT}>Open</Text></Pressable>
          </View>
          {scanMsg ? <Text style={[st.flash, { color: T.red }]}>{scanMsg}</Text> : null}
          <Text style={[P.note, { marginTop: 8 }]}>Scanner gun: click the box once, then shoot each sticker (it types the ID and presses Enter).</Text>
        </View>
        {search}
        {results}
        {!ql ? (
          <>
            {recentIds.length ? (
              <Widget icon="history" title="Recently handled" accent={C.prod}>
                {recentIds.map((k) => <SampleRow key={k} s={byId[k]} state={stOf(byId[k])} onPress={() => openSample(k)} />)}
              </Widget>
            ) : null}
            <Widget icon="swap-horiz" title={(salesOnly ? 'My movements' : 'Latest movements') + ' · ' + list.length} accent={T.copper} onTitle={() => goPage({ kind: 'moves', purpose: 'all', mine: salesOnly, all: true })}>
              {list.slice(0, 6).map((m) => <MoveRow key={m.id} m={m} sample={byId[m.sample]} onPress={byId[m.sample] ? () => openSample(m.sample) : undefined} />)}
              {!list.length ? <Empty t="Nothing recorded yet." /> : null}
            </Widget>
          </>
        ) : null}
      </>
    );
  };

  /* ================================ render ================================ */
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView ref={scrollRef} contentContainerStyle={st.body} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={load} />}>
        <View style={[st.wrap, { alignItems: 'center', marginBottom: 10 }]}>
          {tabs.map(([k, l]) => <Seg key={k} on={curTab === k && !page} label={l} onPress={() => { setTab(k); goPage(null); setQ(''); setFlash(''); }} />)}
          {curTab === 'dash' && !page ? (
            <>
              <View style={{ flexGrow: 1 }} />
              {(['today', '7d', 'month', 'all'] as Preset[]).map((k) => <Seg key={k} on={preset === k} label={{ today: 'Today', '7d': '7 days', month: 'This month', all: 'All time' }[k]} onPress={() => setPreset(k)} />)}
            </>
          ) : null}
        </View>
        {error ? (
          <View style={[P.card, { borderColor: T.red }]}>
            <Text style={{ color: T.red, fontWeight: '700' }}>{error}</Text>
            <Text onPress={load} style={[P.link, { marginTop: 6 }]}>Try again</Text>
          </View>
        ) : null}
        {!data && loading ? <ActivityIndicator style={{ marginTop: 40 }} color={T.nav} /> : null}
        {data ? (page ? (page.kind === 'sample' ? samplePage(page.id) : page.kind === 'list' ? listPage(page) : movesPage(page))
          : curTab === 'dash' ? dashTab() : curTab === 'register' ? registerTab() : scanTab()) : null}
      </ScrollView>
      <QrScanSheet
        visible={scanOpen}
        title="Sample QR"
        subtitle="Point at the sample sticker"
        footer="Reads the Sample ID on the sticker (e.g. HNG-0001) and opens the record with the movement form."
        manualPlaceholder="Sample ID e.g. HNG-0001"
        webCamera
        onClose={() => setScanOpen(false)}
        onScanned={(v) => { setScanOpen(false); runScan(v); }}
      />
    </View>
  );
}

function ActBtn({ label, icon, onPress, kind, danger }: { label: string; icon: string; onPress: () => void; kind?: 'primary'; danger?: boolean }) {
  const prim = kind === 'primary';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={[st.act, prim ? { backgroundColor: C.prod, borderColor: C.prod } : null, danger ? { borderColor: T.red + '55' } : null]}>
      <Icon name={icon as any} size={16} color={prim ? '#fff' : danger ? T.red : T.nav} />
      <Text style={[st.actT, { color: prim ? '#fff' : danger ? T.red : T.nav }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  body: { padding: 14, paddingBottom: 40, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  wrapC: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  subWrap: { paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: C.hair, alignItems: 'center' },
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: T.border, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: T.ink, marginBottom: 10 },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  crumb: { fontWeight: '800', fontSize: 12 },
  bigId: { fontFamily: MF, fontSize: 16, fontWeight: '800', color: C.ink },
  sName: { fontSize: 14, fontWeight: '700', color: C.ink, marginTop: 3 },
  bar: { height: 8, borderRadius: 4, backgroundColor: T.alt, overflow: 'hidden', marginBottom: 4 },
  barIn: { height: 8, borderRadius: 4 },
  act: { flexGrow: 1, flexBasis: 150, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: T.border, backgroundColor: '#fff' },
  actT: { fontSize: 12.5, fontWeight: '800' },
  flash: { fontSize: 11.5, color: T.green, marginTop: 8, fontWeight: '600' },
  newBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: T.copper, borderRadius: 10, paddingVertical: 12, marginBottom: 12 },
  camBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.prod, borderRadius: 10, paddingVertical: 13 },
  newT: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
  gun: { flex: 1, borderWidth: 1, borderColor: T.border, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, fontFamily: MF, color: T.ink, backgroundColor: '#fff' },
  openBtn: { paddingHorizontal: 18, borderRadius: 9, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 15, fontWeight: '800', color: C.ink },
  logo: { width: 44, height: 44, borderRadius: 11, backgroundColor: C.prod + '18', alignItems: 'center', justifyContent: 'center' },
  gT: { fontWeight: '700', fontSize: 12.5, color: C.ink },
  gN: { fontFamily: MF, fontWeight: '800', fontSize: 13, color: C.ink },
});
