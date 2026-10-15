// FILE: src/screens/outwardScanSticker/OutwardScanStickerView.tsx
// Outward Scan Sticker — grey store JOB INWARD by scanning the fusion (checking) sticker.
//
//   New inward   party (pending job outward) -> G.R.N. / Job A/c / Entry type / Store No / bill -> scan stickers
//                (camera, hardware scanner or typed taka no., or pick from the pending list) -> per taka: shade + qty,
//                shortage tick (auto shortage), "Add to taka" lines with their own shade -> Save
//   Browse       every grey job inward of the period -> view, modify, HARD delete
//
// Backend: GreyScanInwardController (POST /api/grey_scan_inward/*) — writes GRYInw / GRYInwD1 / GRYInwD2, the job
// outward balance (GRYOutD1 / D2), FAMItem, FAMITrans, G.R.N. status exactly like the web "POY Job Inward" (grey store).
// Rights: production.outward_scan_sticker — view / add / edit / delete.

import AsyncStorage from '@/common/utils/compatibleStorage';
import AppAlert from '@/common/utils/appAlert';
import { GreyScanInwardAPI } from '@/src/api/legacyClient';
import { PoyDateField } from '@/src/components/PoyRateEntryNEW/PoyDateField';
import QrScanSheet from '@/src/components/StockVerificationNEW/QrScanSheet';
import { Btn, SelectField, Sheet } from '@/src/components/StockVerificationNEW/ui';
import SearchablePickerModal from '@/src/components/ui/SearchablePickerModal';
import { useBusinessContext } from '@/src/core/business';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import {
  addDays,
  BrowseRow,
  calcEntry,
  cleanQty,
  dateToIso,
  dmy,
  Entry,
  entriesFromShow,
  errText,
  Grn,
  Header,
  isoToDate,
  isoToday,
  lineId,
  Meta,
  newEntry,
  num,
  Opt,
  payload,
  Piece,
  q3,
  r3,
  ShowData,
  StaleRow,
  totals,
  unwrap,
  validate,
} from './model';

const RES = 'production.outward_scan_sticker';
const DRAFT_KEY = 'oss:draft:v1:';
const MF = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" }) as string;

const emptyHeader = (): Header => ({ inwdate: isoToday(), billno: '', billdate: isoToday(), strsr: '', remark: '', acccode: '', enttype: '', gruid: '', grsrno: '' });

type Tab = 'entry' | 'browse';
type Flash = { kind: 'ok' | 'warn' | 'err'; text: string } | null;

/* ================================================================================================= */

export function OutwardScanStickerView() {
  const { prpCode, yearNo } = useBusinessContext();
  const { canDo } = usePermission();
  const canAdd = canDo(RES, 'add');
  const canEdit = canDo(RES, 'edit');
  const canDelete = canDo(RES, 'delete');
  const { width } = useWindowDimensions();
  // layout follows the space this screen really gets (side menu on web, iPad split view), not the window
  const [cw, setCw] = useState(width);
  const wide = cw >= 1000;        // desktop / iPad landscape: 2 taka cards per row, 4 header fields per row
  const tablet = cw >= 600;       // iPad portrait / phone landscape: 3 header fields per row
  const narrow = cw < 380;        // small phones
  const grid = useMemo(() => makeGrid(cw, wide ? 4 : tablet ? 3 : 2, 26), [cw, wide, tablet]);
  const cardW = wide ? Math.floor((Math.min(cw - 24, 1200) - 10) / 2) : undefined;

  const [tab, setTab] = useState<Tab>(canAdd ? 'entry' : 'browse');
  const [ctx, setCtx] = useState<{ prpcode: string; yearno: string } | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaErr, setMetaErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [shades, setShades] = useState<Opt[]>([]);
  const [shadesLoading, setShadesLoading] = useState(false);

  /* entry state */
  const [editUid, setEditUid] = useState('');
  const [editNo, setEditNo] = useState('');
  const [party, setParty] = useState('');
  const [hdr, setHdr] = useState<Header>(emptyHeader());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [grns, setGrns] = useState<Grn[]>([]);
  const [grnLoading, setGrnLoading] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [typed, setTyped] = useState('');
  const [picks, setPicks] = useState<Piece[] | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [shadeTarget, setShadeTarget] = useState<{ key: string; id: string } | null>(null);
  const [showProblems, setShowProblems] = useState(false);
  const [hiKey, setHiKey] = useState('');
  const scrollRef = useRef<any>(null);
  const typeRef = useRef<any>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const flashTimer = useRef<any>(null);

  const say = useCallback((kind: 'ok' | 'warn' | 'err', text: string) => {
    setFlash({ kind, text });
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), kind === 'err' ? 7000 : 3500);
    if (kind !== 'ok' && Platform.OS !== 'web') Vibration.vibrate(kind === 'err' ? 300 : 120);
  }, []);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  /* ------------------------------ context + masters ------------------------------ */

  const resolveCtx = useCallback(async () => {
    let prpcode = String(prpCode || '').trim();
    let yearno = String(yearNo || '').trim();
    try {
      if (!prpcode) prpcode = String((await AsyncStorage.getItem('selected_prpcode')) || '').trim();
      if (!yearno) yearno = String((await AsyncStorage.getItem('yno')) || '').trim();
    } catch {
      // storage unavailable
    }
    return { prpcode: prpcode.toUpperCase(), yearno };
  }, [prpCode, yearNo]);

  const body = useCallback((extra: Record<string, any> = {}) => ({ ...(ctx || {}), ...extra }), [ctx]);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setMetaErr('');
    try {
      const c = await resolveCtx();
      if (!c.prpcode || !c.yearno) throw new Error('Property / year not found in the login — please log in again.');
      setCtx(c);
      const m: Meta = unwrap(await GreyScanInwardAPI.meta(c));
      setMeta(m);
      setHdr((h) => ({ ...h, enttype: h.enttype || (m.ent_types.length === 1 ? m.ent_types[0].code : '') }));
      // shade master of THIS property (reloaded whenever the property / year changes)
      setShades([]);
      setShadesLoading(true);
      GreyScanInwardAPI.shades({ ...c, all: 1 })
        .then((r) => setShades((unwrap(r)?.shades || []).map((s: any) => ({ value: String(s.code), label: s.name || String(s.code), searchText: `${s.name} ${s.code}` }))))
        .catch(() => undefined)
        .finally(() => setShadesLoading(false));
    } catch (err) {
      setMetaErr(errText(err, 'Unable to open Outward Scan Sticker.'));
    } finally {
      setLoading(false);
    }
  }, [resolveCtx]);

  const keyRef = useRef('');
  useFocusEffect(useCallback(() => {
    const k = `${prpCode}|${yearNo}`;
    if (keyRef.current !== k) {
      keyRef.current = k;
      void loadMeta();
    }
  }, [loadMeta, prpCode, yearNo]));

  /* draft: the unsaved new inward survives an app restart (per property / year) */
  const draftKey = ctx ? DRAFT_KEY + ctx.prpcode + '|' + ctx.yearno : '';
  const draftLoaded = useRef('');
  useEffect(() => {
    if (!draftKey || draftLoaded.current === draftKey) return;
    const first = draftLoaded.current === '';
    draftLoaded.current = draftKey;
    if (!first) {
      // property / year switched: the takas on screen belong to the old one — start clean for the new one
      setEditUid(''); setEditNo(''); setParty(''); setEntries([]); setHdr(emptyHeader()); setGrns([]);
    }
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(draftKey);
        const d = raw ? JSON.parse(raw) : null;
        if (d && Array.isArray(d.entries) && d.entries.length && d.party) {
          setParty(d.party);
          setHdr({ ...emptyHeader(), ...d.hdr });
          setEntries(d.entries.map((e: Entry) => ({ ...e, stale: undefined, note: undefined })));
          say('warn', `Unsaved inward restored — ${d.entries.length} taka(s). Checking their balances…`);
          void recheckRef.current?.(d.party, d.entries);
        }
      } catch {
        // no draft
      }
    })();
  }, [draftKey, say]);
  useEffect(() => {
    if (!draftKey || draftLoaded.current !== draftKey || editUid) return;
    const t = setTimeout(() => {
      const v = entries.length ? JSON.stringify({ party, hdr, entries }) : '';
      (v ? AsyncStorage.setItem(draftKey, v) : AsyncStorage.removeItem(draftKey)).catch(() => undefined);
    }, 600);
    return () => clearTimeout(t);
  }, [draftKey, party, hdr, entries, editUid]);

  /**
   * Takas kept on this phone (restored draft, or a save refused because someone else received them meanwhile):
   * take the server's current balance, mark what changed, so the user corrects the kg before saving.
   */
  const applyStale = useCallback((rows: StaleRow[]) => {
    const m: Record<string, StaleRow> = {};
    rows.forEach((x) => { m[x.key] = x; });
    setEntries((list) => list.map((e) => {
      const x = m[e.key];
      if (!x) return e;
      const by = x.inwno ? ` in inward ${x.inwno}${x.inwdate ? ' (' + dmy(x.inwdate) + ')' : ''}${x.user ? ' by ' + x.user : ''}` : '';
      if (x.status === 'used' || (x.status === undefined && x.bal <= 0.0005)) {
        return { ...e, bal: 0, stale: 'used', note: `Already fully received${by}. Remove this taka.` };
      }
      if (x.status === 'missing' || x.status === 'party') {
        return { ...e, stale: 'used', note: x.status === 'party' ? 'This taka is no longer pending with this party. Remove it.' : 'Outward taka not found any more. Remove it.' };
      }
      if (x.status === 'ok') return { ...e, stale: undefined, note: undefined, bal: x.bal };
      return { ...e, bal: x.bal, stale: 'changed', note: `Balance changed ${q3(x.seen ?? e.bal)} → ${q3(x.bal)}${by}. Check the kg.` };
    }));
  }, []);
  const recheckRef = useRef<((par: string, list: Entry[]) => Promise<void>) | null>(null);
  recheckRef.current = async (par: string, list: Entry[]) => {
    if (!list.length) return;
    try {
      const d = unwrap(await GreyScanInwardAPI.recheck(body({ parcode: par, uid: editUid || 0, pieces: list.map((e) => ({ outuid: e.outuid, outsrno: e.outsrno, outsubsr: e.outsubsr, bal: e.bal })) })));
      const rows: StaleRow[] = d?.pieces || [];
      applyStale(rows);
      const bad = rows.filter((x) => x.status !== 'ok').length;
      if (bad) say('err', `${bad} taka(s) were received elsewhere after scanning — see the marked cards.`);
      else say('ok', 'All restored takas are still pending with the same balance.');
    } catch {
      // offline: the save will check again on the server
    }
  };

  /* G.R.N. of the party */
  const applyGrn = useCallback((g: Grn | null) => {
    if (!g) { setHdr((h) => ({ ...h, gruid: '', grsrno: '' })); return; }
    setHdr((h) => ({
      ...h,
      gruid: g.uid,
      grsrno: String(g.srno),
      acccode: g.acccode || h.acccode,
      billno: g.docno || h.billno,
      billdate: g.docdate || h.billdate,
      inwdate: h.inwdate < g.grdate ? g.grdate : h.inwdate,
    }));
  }, []);
  const loadGrn = useCallback(async (par: string, uid = '') => {
    if (!par || !ctx) { setGrns([]); return; }
    setGrnLoading(true);
    try {
      const d = unwrap(await GreyScanInwardAPI.grn(body({ parcode: par, uid })));
      const list: Grn[] = d?.grn || [];
      setGrns(list);
      // only one pending G.R.N. for the party: take it (it can still be cleared — G.R.N. is optional)
      if (!uid && list.length === 1) applyGrn(list[0]);
    } catch (err) {
      setGrns([]);
      say('err', errText(err, 'Unable to load G.R.N.'));
    } finally {
      setGrnLoading(false);
    }
  }, [ctx, body, say, applyGrn]);
  useEffect(() => { void loadGrn(party, editUid); }, [party, editUid, loadGrn]);

  useEffect(() => {
    if (party && Platform.OS === 'web') setTimeout(() => typeRef.current?.focus?.(), 150);
  }, [party]);

  /* ------------------------------ entry actions ------------------------------ */

  const resetEntry = useCallback((keepParty = false) => {
    setEditUid('');
    setEditNo('');
    if (!keepParty) setParty('');
    setEntries([]);
    setHdr((h) => ({ ...emptyHeader(), enttype: meta?.ent_types.length === 1 ? meta.ent_types[0].code : h.enttype, strsr: keepParty ? h.strsr : '' }));
    setShowProblems(false);
  }, [meta]);

  const chooseParty = (v: string) => {
    if (v === party) return;
    if (entries.length) {
      AppAlert.alert('Change party?', `${entries.length} scanned taka(s) of the current party will be removed.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change', style: 'destructive', onPress: () => { setEntries([]); setParty(v); setHdr((h) => ({ ...h, gruid: '', grsrno: '' })); } },
      ]);
      return;
    }
    setParty(v);
    setHdr((h) => ({ ...h, gruid: '', grsrno: '' }));
  };

  const chooseGrn = (key: string) => applyGrn(grns.find((x) => x.key === key) || null);

  const entriesRef = useRef<Entry[]>([]);
  entriesRef.current = entries;
  const addPiece = useCallback((p: Piece) => {
    setHiKey(p.key);
    setTimeout(() => setHiKey(''), 2500);
    if (entriesRef.current.some((e) => e.key === p.key)) {
      say('warn', `Taka ${p.takano} is already in the list.`);
      return;
    }
    entriesRef.current = [newEntry(p), ...entriesRef.current];
    setEntries((list) => (list.some((e) => e.key === p.key) ? list : [newEntry(p), ...list]));
    say('ok', `Taka ${p.takano} added — balance ${q3(p.bal)}. Now choose the shade and enter the kg.`);
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }, [say]);

  const runScan = useCallback(async (raw: string) => {
    const code = String(raw || '').trim();
    if (!code) return;
    if (!party) { say('err', 'Select the party first.'); return; }
    setBusy(true);
    try {
      const d = unwrap(await GreyScanInwardAPI.scan(body({ parcode: party, code, uid: editUid || 0 })));
      const pieces: Piece[] = d?.pieces || [];
      if (pieces.length === 1) addPiece(pieces[0]);
      else if (pieces.length > 1) { setPicks(pieces); if (d.message) say('warn', d.message); }
      else say('err', 'Nothing pending for this sticker.');
    } catch (err) {
      say('err', errText(err, 'Scan failed.'));
    } finally {
      setBusy(false);
    }
  }, [party, body, editUid, addPiece, say]);

  const patch = (key: string, fn: (e: Entry) => Entry) => setEntries((list) => list.map((e) => (e.key === key ? fn(e) : e)));
  const patchLine = (key: string, id: string, f: Partial<Entry['lines'][0]>) =>
    patch(key, (e) => ({ ...e, lines: e.lines.map((l) => (l.id === id ? { ...l, ...f } : l)) }));
  const removeEntry = (e: Entry) =>
    AppAlert.alert('Remove taka?', `Taka ${e.takano} will be taken out of this inward.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setEntries((list) => list.filter((x) => x.key !== e.key)) },
    ]);
  const addLine = (e: Entry) => {
    const c = calcEntry(e, meta?.max_excess_factor);
    const left = c.entered > 0 && c.remain > 0 ? String(r3(c.remain)) : '';
    patch(e.key, (x) => ({ ...x, lines: [...x.lines, { id: lineId(), shdcode: '', shdname: '', qty: left, remark: '' }] }));
  };
  const fillBalance = (e: Entry) => {
    const others = e.lines.slice(1).reduce((s, l) => s + num(l.qty), 0);
    const v = r3(Math.max(0, e.bal - others));
    patchLine(e.key, e.lines[0].id, { qty: v > 0 ? String(v) : '' });
  };

  const problems = useMemo(() => validate(meta, party, hdr, entries), [meta, party, hdr, entries]);
  const tot = useMemo(() => totals(entries, meta?.max_excess_factor), [entries, meta]);
  const badKeys = useMemo(() => new Set(problems.filter((p) => p.key).map((p) => p.key as string)), [problems]);
  const hintEl = entries.length && problems.length
    ? <Text style={[st.footHint, tablet && { flexBasis: '100%' }]} numberOfLines={2}>Next: {problems[0].text}</Text>
    : null;

  const doSave = async () => {
    setShowProblems(true);
    if (problems.length) {
      say('err', problems[0].text + (problems.length > 1 ? ` (+${problems.length - 1} more)` : ''));
      return;
    }
    if (!(editUid ? canEdit : canAdd)) { say('err', 'You do not have permission for this action.'); return; }
    const t = tot;
    const lines = [
      `${t.takas} taka(s) · ${q3(t.entered)} received`,
      t.shortage ? `Shortage ${q3(t.shortage)}` : '',
      t.excess ? `Excess ${q3(t.excess)}` : '',
      t.remain ? `${q3(t.remain)} stays pending on the outward` : '',
    ].filter(Boolean).join('\n');
    AppAlert.alert(editUid ? `Modify inward ${editNo}?` : 'Save job inward?', lines, [
      { text: 'Cancel', style: 'cancel' },
      { text: editUid ? 'Modify' : 'Save', onPress: () => void reallySave() },
    ]);
  };

  const reallySave = async () => {
    setSaving(true);
    try {
      const res: any = await GreyScanInwardAPI.save(body({ ...payload(editUid, party, hdr, entries), source: Platform.OS }));
      const d = unwrap(res);
      const msg = res?.data?.message || `Inward ${d?.inwno} saved.`;
      if (draftKey) AsyncStorage.removeItem(draftKey).catch(() => undefined);
      const wasEdit = !!editUid;
      resetEntry(true);
      void loadGrn(party);
      GreyScanInwardAPI.parties(body()).then((r) => { const p = unwrap(r)?.parties; if (p && meta) setMeta({ ...meta, parties: p }); }).catch(() => undefined);
      setBrowseTick((n) => n + 1);
      AppAlert.alert(wasEdit ? 'Modified' : 'Saved', msg);
      say('ok', msg);
      if (wasEdit) setTab('browse');
    } catch (err: any) {
      const m = errText(err, 'Save failed.');
      const stale: StaleRow[] | undefined = err?.response?.data?.code === 'stale' ? err.response.data.stale : undefined;
      if (stale && stale.length) {
        // someone else received these takas after they were scanned here: update balances, mark the cards, nothing was saved
        applyStale(stale.map((x) => ({ ...x, status: x.bal <= 0.0005 ? 'used' : 'changed' })));
        setShowProblems(true);
        const used = stale.filter((x) => x.bal <= 0.0005).map((x) => x.key);
        AppAlert.alert('Not saved — takas changed', m, used.length
          ? [{ text: 'Check myself', style: 'cancel' }, { text: `Remove ${used.length} received taka(s)`, onPress: () => setEntries((list) => list.filter((e) => !used.includes(e.key))) }]
          : [{ text: 'OK' }]);
        say('err', 'Not saved — ' + stale.length + ' taka(s) changed meanwhile. Marked cards show the new balance.');
      } else {
        AppAlert.alert('Not saved', m);
        say('err', m.split('\n')[0]);
      }
    } finally {
      setSaving(false);
    }
  };

  /* modify an inward from browse */
  const startEdit = (d: ShowData) => {
    if (entries.length && !editUid) {
      AppAlert.alert('Discard scanned takas?', 'The new inward you are making will be cleared to modify this entry.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => loadEdit(d) },
      ]);
      return;
    }
    loadEdit(d);
  };
  const loadEdit = (d: ShowData) => {
    const h = d.header;
    setEditUid(d.uid);
    setEditNo(h.inwno);
    setParty(h.parcode);
    setHdr({ inwdate: h.inwdate, billno: h.billno, billdate: h.billdate || h.inwdate, strsr: h.strsr, remark: h.remark, acccode: h.acccode, enttype: h.enttype, gruid: h.gruid !== '0' ? h.gruid : '', grsrno: h.gruid !== '0' ? String(h.grsrno) : '' });
    setEntries(entriesFromShow(d));
    setShowProblems(false);
    setTab('entry');
  };
  const cancelEdit = () =>
    AppAlert.alert('Cancel modify?', 'Changes to this inward will be discarded.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { resetEntry(); setTab('browse'); } },
    ]);

  /* ------------------------------ browse ------------------------------ */
  const [browseTick, setBrowseTick] = useState(0);

  /* ------------------------------ options ------------------------------ */

  const partyOpts: Opt[] = useMemo(() => {
    const list = (meta?.parties || []).map((p) => ({ value: p.code, label: `${p.name}  ·  ${p.pieces} takas · ${q3(p.bal)}`, searchText: `${p.name} ${p.code}` }));
    if (party && !list.some((o) => o.value === party)) list.unshift({ value: party, label: party, searchText: party });
    return list;
  }, [meta, party]);
  const grnOpts: Opt[] = useMemo(() => grns.map((g) => ({ value: g.key, label: `${g.grno} · ${dmy(g.grdate)} · ${g.docno || '—'} · ${q3(g.qty)}`, searchText: `${g.grno} ${g.docno} ${g.itmname}` })), [grns]);
  const accOpts: Opt[] = useMemo(() => {
    const list = (meta?.job_accounts || []).map((a) => ({ value: a.code, label: a.name, searchText: `${a.name} ${a.code}` }));
    const g = grns.find((x) => x.uid === hdr.gruid);
    if (hdr.acccode && !list.some((o) => o.value === hdr.acccode)) list.unshift({ value: hdr.acccode, label: g?.accname || hdr.acccode, searchText: hdr.acccode });
    return list;
  }, [meta, grns, hdr.acccode, hdr.gruid]);
  const entOpts: Opt[] = useMemo(() => (meta?.ent_types || []).map((e) => ({ value: e.code, label: `${e.name} (${e.code})` })), [meta]);
  const partyName = (meta?.parties || []).find((p) => p.code === party)?.name || party;

  /* ------------------------------ render ------------------------------ */

  if (loading && !meta) {
    return <View style={st.center}><ActivityIndicator color={T.copper} /><Text style={st.muted}>Opening Outward Scan Sticker…</Text></View>;
  }
  if (!meta) {
    return (
      <View style={st.center}>
        <Icon name="error-outline" size={34} color={T.red} />
        <Text style={st.errTitle}>Could not open</Text>
        <Text style={[st.muted, { maxWidth: 420 }]}>{metaErr}</Text>
        <Btn label="Retry" icon="refresh" onPress={() => void loadMeta()} style={{ marginTop: 10 }} />
      </View>
    );
  }

  const header = (
    <View style={st.topBar}>
      <View style={st.tabs}>
        {canAdd || editUid ? (
          <TouchableOpacity style={[st.tab, tab === 'entry' && st.tabOn]} onPress={() => setTab('entry')}>
            <Icon name="qr-code-scanner" size={16} color={tab === 'entry' ? '#fff' : T.nav} />
            <Text style={[st.tabText, tab === 'entry' && { color: '#fff' }]}>{editUid ? `Modify ${editNo}` : 'New inward'}</Text>
            {!!entries.length && <View style={st.badge}><Text style={st.badgeText}>{entries.length}</Text></View>}
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[st.tab, tab === 'browse' && st.tabOn]} onPress={() => setTab('browse')}>
          <Icon name="list-alt" size={16} color={tab === 'browse' ? '#fff' : T.nav} />
          <Text style={[st.tabText, tab === 'browse' && { color: '#fff' }]}>Browse</Text>
        </TouchableOpacity>
      </View>
      <Text style={st.ctxText} numberOfLines={1}>{meta.prpcode} · FY {meta.yearno} · {meta.grey_store_name || 'Grey store'} ({meta.grey_store})</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      onLayout={(ev: any) => { const w = Math.round(ev?.nativeEvent?.layout?.width || 0); if (w && Math.abs(w - cw) > 2) setCw(w); }}>
      {header}
      {flash ? (
        <View style={[st.flash, flash.kind === 'ok' ? st.flashOk : flash.kind === 'warn' ? st.flashWarn : st.flashErr]}>
          <Icon name={flash.kind === 'ok' ? 'check-circle' : flash.kind === 'warn' ? 'info' : 'error'} size={18} color="#fff" />
          <Text style={st.flashText}>{flash.text}</Text>
          <TouchableOpacity onPress={() => setFlash(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Icon name="close" size={16} color="#fff" /></TouchableOpacity>
        </View>
      ) : null}

      {tab === 'browse' ? (
        <BrowsePane
          meta={meta}
          body={body}
          tick={browseTick}
          wide={wide}
          tablet={tablet}
          cw={cw}
          canEdit={canEdit}
          canDelete={canDelete}
          editingUid={editUid}
          onEdit={startEdit}
          onDeleted={(no) => {
            say('ok', `Inward ${no} deleted.`);
            GreyScanInwardAPI.parties(body()).then((r) => { const p = unwrap(r)?.parties; if (p) setMeta((m) => (m ? { ...m, parties: p } : m)); }).catch(() => undefined);
          }}
        />
      ) : (
        <>
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={[st.pad, { paddingBottom: 24 }]} keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={false} onRefresh={() => { void loadMeta(); void loadGrn(party, editUid); }} />}>
            <View style={st.wrap}>
              {editUid ? (
                <View style={st.editBar}>
                  <Icon name="edit" size={18} color={T.amber} />
                  <Text style={st.editText}>Modifying inward {editNo} — saving rewrites it with the same number.</Text>
                  <TouchableOpacity onPress={cancelEdit}><Text style={st.link}>Cancel</Text></TouchableOpacity>
                </View>
              ) : null}

              {/* ----------------------------- steps (what to do next) ----------------------------- */}
              {(() => {
                const detailsOk = !!(hdr.acccode && hdr.enttype && hdr.strsr.trim() && hdr.billno.trim() && hdr.inwdate);
                const filled = entries.filter((e) => e.lines.every((l) => l.shdcode && num(l.qty) > 0)).length;
                const steps = [
                  { n: 1, t: 'Party', d: party ? partyName : 'Choose mill', ok: !!party },
                  { n: 2, t: 'Details', d: detailsOk ? (hdr.gruid ? 'With G.R.N.' : 'Without G.R.N.') : 'Job A/c · Store · Bill', ok: detailsOk },
                  { n: 3, t: 'Scan takas', d: entries.length ? `${entries.length} scanned` : 'Camera / gun / type', ok: entries.length > 0 },
                  { n: 4, t: 'Shade & kg', d: entries.length ? `${filled} of ${entries.length} done` : 'For each taka', ok: entries.length > 0 && filled === entries.length },
                  { n: 5, t: 'Save', d: problems.length ? 'Waiting' : 'Ready', ok: false },
                ];
                const cur = steps.find((x) => !x.ok)?.n || 5;
                const curStep = steps[cur - 1];
                const helpBtn = (
                  <TouchableOpacity style={st.helpBtn} onPress={() => setHelpOpen((v) => !v)} accessibilityLabel="How to enter">
                    <Icon name={helpOpen ? 'close' : 'help-outline'} size={18} color={T.blue} />
                    <Text style={st.helpBtnText}>{helpOpen ? 'Close' : tablet ? 'How to enter' : 'Help'}</Text>
                  </TouchableOpacity>
                );
                if (!tablet) {
                  // phone: one clear line — which step, what it needs — and a 5-part progress bar
                  return (
                    <View style={st.stepsPhone}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.stepPhoneT} numberOfLines={1}>{'Step ' + cur + ' of 5 · ' + curStep.t}</Text>
                        <Text style={st.stepD} numberOfLines={1}>{curStep.d}</Text>
                        <View style={st.progress}>
                          {steps.map((x) => (
                            <View key={x.n} style={[st.progSeg, x.ok && { backgroundColor: T.green }, x.n === cur && { backgroundColor: T.copper }]} />
                          ))}
                        </View>
                      </View>
                      {helpBtn}
                    </View>
                  );
                }
                return (
                  <View style={st.steps}>
                    {steps.map((x) => {
                      const on = x.n === cur;
                      return (
                        <View key={x.n} style={[st.step, on && st.stepOn, x.ok && st.stepOk]}>
                          <View style={[st.stepDot, on && { backgroundColor: T.copper }, x.ok && { backgroundColor: T.green }]}>
                            {x.ok ? <Icon name="check" size={13} color="#fff" /> : <Text style={st.stepNum}>{x.n}</Text>}
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[st.stepT, on && { color: T.copper }]} numberOfLines={1}>{x.t}</Text>
                            {wide ? <Text style={st.stepD} numberOfLines={1}>{x.d}</Text> : null}
                          </View>
                        </View>
                      );
                    })}
                    {helpBtn}
                  </View>
                );
              })()}
              {helpOpen ? <HelpCard /> : null}

              {/* ----------------------------- header ----------------------------- */}
              <View style={st.card}>
                <Text style={st.cardEyebrow}>JOB INWARD · GREY STORE</Text>
                <View style={st.grid}>
                  <SelectField label="Party (pending outward)" required value={party} options={partyOpts} onChange={(v) => chooseParty(v)}
                    placeholder="Select party…" disabled={!!editUid} onRefresh={() => void loadMeta()} style={grid.w(2, 1, 1)} />
                  <SelectField label={meta.require_grn ? 'G.R.N.' : 'G.R.N. (optional)'} required={meta.require_grn} value={hdr.gruid ? `${hdr.gruid}-${hdr.grsrno}` : ''} options={grnOpts}
                    onChange={(v) => chooseGrn(v)} loading={grnLoading} disabled={!party || (!grnLoading && !grns.length)} disabledHint={!party ? 'Select party first' : 'No pending G.R.N. — not needed'}
                    clearable={!meta.require_grn}
                    placeholder={party && !grnLoading && !grns.length ? 'No pending G.R.N. — not needed' : 'Select G.R.N. (optional)…'} onRefresh={() => void loadGrn(party, editUid)} style={grid.w(2, 1, 1)} />
                  <SelectField label="Job A/c" required value={hdr.acccode} options={accOpts} onChange={(v) => setHdr((h) => ({ ...h, acccode: v }))} style={grid.w(2, 1, 1)} />
                  <SelectField label="Entry type" required value={hdr.enttype} options={entOpts} onChange={(v) => setHdr((h) => ({ ...h, enttype: v }))} style={grid.w(1, 1, 1)} />
                  <Field label="Store No" required value={hdr.strsr} onChange={(v) => setHdr((h) => ({ ...h, strsr: v.slice(0, 20) }))} placeholder="e.g. R-12" style={grid.w(1, 1, 1)} />
                  <Field label="Bill / challan no." required value={hdr.billno} onChange={(v) => setHdr((h) => ({ ...h, billno: v.slice(0, 30) }))} placeholder="Party challan" style={grid.w(1, 1, 1)} />
                  <View style={grid.w(1, 1, 1)}>
                    <Text style={st.label}>Bill date</Text>
                    <PoyDateField value={isoToDate(hdr.billdate)} onChange={(d) => setHdr((h) => ({ ...h, billdate: dateToIso(d) }))} />
                  </View>
                  <View style={grid.w(1, 1, 1)}>
                    <Text style={st.label}>Inward date<Text style={{ color: T.red }}> *</Text></Text>
                    <PoyDateField value={isoToDate(hdr.inwdate)} onChange={(d) => setHdr((h) => ({ ...h, inwdate: dateToIso(d) }))} />
                  </View>
                  <Field label="Remark" value={hdr.remark} onChange={(v) => setHdr((h) => ({ ...h, remark: v.slice(0, 100) }))} placeholder="Optional" style={grid.w(1, 1, 4)} />
                </View>
                {party ? (() => {
                  const p = meta.parties.find((x) => x.code === party);
                  const g = grns.find((x) => x.uid === hdr.gruid && String(x.srno) === hdr.grsrno);
                  return (
                    <View style={st.infoRow}>
                      {p ? <Chip icon="local-shipping" text={`${p.pieces} takas pending · ${q3(p.bal)}`} /> : null}
                      {g ? <Chip icon="receipt-long" text={`G.R.N. qty ${q3(g.qty)}${g.pcs ? ` · ${g.pcs} pcs` : ''} — scanned ${q3(tot.entered)}`} color={Math.abs(g.qty - tot.entered) < 0.0005 || !tot.entered ? T.green : T.amber} /> : null}
                      {!g && !grnLoading ? <Chip icon="info-outline" text={grns.length ? `${grns.length} pending G.R.N. — pick one if this lot came with it` : 'No gate G.R.N. for this party — saving without G.R.N. is fine'} color={T.blue} /> : null}
                      {!hdr.billno.trim() ? <Chip icon="edit-note" text="Type the party's challan no. in Bill / challan no." color={T.amber} /> : null}
                    </View>
                  );
                })() : null}
              </View>

              {/* ----------------------------- scan bar ----------------------------- */}
              <View style={[st.card, st.scanCard, !tablet && { flexDirection: 'column', alignItems: 'stretch' }]}>
                <TouchableOpacity style={[st.scanBtn, !tablet && { minWidth: 0 }, (!party || busy) && { opacity: 0.5 }]} disabled={!party || busy} onPress={() => setScanOpen(true)} accessibilityLabel="Scan sticker with camera">
                  {busy ? <ActivityIndicator color="#fff" /> : <Icon name="qr-code-scanner" size={26} color="#fff" />}
                  <View>
                    <Text style={st.scanBtnText}>Scan sticker</Text>
                    <Text style={st.scanBtnSub}>{party ? partyName : 'Select party first'}</Text>
                  </View>
                </TouchableOpacity>
                <View style={[st.typeWrap, !tablet && { minWidth: 0 }]}>
                  <TextInput
                    ref={typeRef}
                    value={typed}
                    onChangeText={setTyped}
                    editable={!!party}
                    placeholder={party ? 'Scanner / taka no. ↵' : 'Select party first'}
                    placeholderTextColor={T.muted}
                    style={st.typeInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    blurOnSubmit={false}
                    returnKeyType="search"
                    onSubmitEditing={() => { const v = typed; setTyped(''); void runScan(v); }}
                  />
                  <TouchableOpacity style={[st.typeGo, (!typed.trim() || !party) && { opacity: 0.4 }]} disabled={!typed.trim() || !party} onPress={() => { const v = typed; setTyped(''); void runScan(v); }}>
                    <Icon name="arrow-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Btn label="Pending list" icon="playlist-add" kind="ghost" compact disabled={!party} onPress={() => setPendingOpen(true)} style={{ alignSelf: 'stretch' }} />
              </View>

              {/* ----------------------------- problems ----------------------------- */}
              {showProblems && problems.length ? (
                <View style={st.probBox}>
                  {problems.slice(0, 8).map((p, i) => <Text key={i} style={st.probText}>• {p.text}</Text>)}
                  {problems.length > 8 ? <Text style={st.probText}>… {problems.length - 8} more</Text> : null}
                </View>
              ) : null}

              {/* ----------------------------- takas ----------------------------- */}
              {!entries.length ? (
                <View style={st.empty}>
                  <Text style={st.emptyTitle}>{party ? 'Add the takas — 3 ways' : 'Step 1 — choose the party (mill) above'}</Text>
                  <View style={[st.ways, tablet && { flexDirection: 'row' }]}>
                    <Way icon="photo-camera" title="Camera" text="Press “Scan sticker” and point at the fusion sticker QR." onPress={party ? () => setScanOpen(true) : undefined} />
                    <Way icon="qr-code-scanner" title="Scanner gun" text="Click the “Scanner / taka no.” box once, then shoot each sticker." onPress={party ? () => typeRef.current?.focus?.() : undefined} />
                    <Way icon="keyboard" title="Manual" text="Type the taka no. + Enter, or open “Pending list” and tap a taka." onPress={party ? () => setPendingOpen(true) : undefined} />
                  </View>
                  <Text style={st.muted}>Every taka then asks for its shade and the kg received.</Text>
                </View>
              ) : (
                <View style={[st.list, wide && st.listWide]}>
                  {entries.map((e) => (
                    <EntryCard
                      key={e.key}
                      e={e}
                      wide={wide}
                      cardW={cardW}
                      narrow={narrow}
                      maxF={meta.max_excess_factor}
                      hi={hiKey === e.key}
                      bad={showProblems && badKeys.has(e.key)}
                      onQty={(id, v) => patch(e.key, (x) => ({ ...x, ...(x.stale === 'changed' ? { stale: undefined } : {}), lines: x.lines.map((l) => (l.id === id ? { ...l, qty: cleanQty(v) } : l)) }))}
                      onShade={(id) => setShadeTarget({ key: e.key, id })}
                      onRemoveLine={(id) => patch(e.key, (x) => ({ ...x, lines: x.lines.filter((l) => l.id !== id) }))}
                      onShortage={() => patch(e.key, (x) => ({ ...x, ...(x.stale === 'changed' ? { stale: undefined } : {}), shortage: !x.shortage }))}
                      onAddLine={() => addLine(e)}
                      onFill={() => fillBalance(e)}
                      onRemove={() => removeEntry(e)}
                    />
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* ----------------------------- footer ----------------------------- */}
          <View style={st.footer}>
            <View style={[st.footInner, st.wrap, !tablet && st.footCol]}>
              <View style={[st.footStats, !tablet && { minWidth: 0, alignSelf: 'stretch' }]}>
                <Stat label="Takas" value={String(tot.takas)} sub={tot.lines > tot.takas ? `${tot.lines} lines` : undefined} />
                <Stat label="Received" value={q3(tot.entered)} />
                <Stat label="Shortage" value={q3(tot.shortage)} color={tot.shortage ? T.red : undefined} />
                {tablet || tot.excess ? <Stat label="Excess" value={q3(tot.excess)} color={tot.excess ? T.blue : undefined} /> : null}
                {tablet || tot.remain ? <Stat label={tablet ? 'Stays pending' : 'Pending'} value={q3(tot.remain)} color={tot.remain ? T.amber : undefined} /> : null}
              </View>
              {!tablet ? hintEl : null}
              <View style={[st.footBtns, !tablet && { alignSelf: 'stretch', marginLeft: 0 }]}>
                {entries.length && !editUid ? <Btn label="Clear" kind="ghost" compact onPress={() => AppAlert.alert('Clear all?', 'Every scanned taka will be removed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: () => resetEntry(true) }])} /> : null}
                <Btn label={editUid ? 'Modify' : 'Save'} icon="save" kind="copper" loading={saving} disabled={!entries.length || !(editUid ? canEdit : canAdd)} onPress={() => void doSave()} style={tablet ? { minWidth: 120 } : { flex: 1 }} />
              </View>
              {tablet ? hintEl : null}
            </View>
          </View>
        </>
      )}

      {/* ----------------------------- sheets ----------------------------- */}
      <QrScanSheet
        visible={scanOpen}
        title="Fusion sticker"
        subtitle={partyName || ''}
        footer="Reads the checking scanner sticker (PRPCODE~UID~SRNO…). The taka is checked against this party's pending job outward before it is added."
        manualPlaceholder="Taka no. or QR text"
        onClose={() => setScanOpen(false)}
        onScanned={(v) => { setScanOpen(false); void runScan(v); }}
      />

      <SearchablePickerModal
        visible={!!shadeTarget}
        title="Shade"
        placeholder="Search shade…"
        options={shades}
        selectedValue={shadeTarget ? entries.find((e) => e.key === shadeTarget.key)?.lines.find((l) => l.id === shadeTarget.id)?.shdcode : ''}
        loading={shadesLoading}
        onClose={() => setShadeTarget(null)}
        onSelect={(o: Opt) => { if (shadeTarget) patchLine(shadeTarget.key, shadeTarget.id, { shdcode: o.value, shdname: o.label }); setShadeTarget(null); }}
        onRefresh={() => {
          if (!ctx) return;
          setShadesLoading(true);
          GreyScanInwardAPI.shades({ ...ctx, all: 1 })
            .then((r) => setShades((unwrap(r)?.shades || []).map((s: any) => ({ value: String(s.code), label: s.name || String(s.code), searchText: `${s.name} ${s.code}` }))))
            .catch(() => undefined)
            .finally(() => setShadesLoading(false));
        }}
      />

      <Sheet open={!!picks} onClose={() => setPicks(null)} eyebrow="SEVERAL PIECES" title="Pick the taka">
        {(picks || []).map((p) => (
          <PieceRow key={p.key} p={p} added={entries.some((e) => e.key === p.key)} onPress={() => { setPicks(null); addPiece(p); }} />
        ))}
      </Sheet>

      <PendingSheet
        open={pendingOpen}
        onClose={() => setPendingOpen(false)}
        body={body}
        party={party}
        partyName={partyName}
        addedKeys={entries.map((e) => e.key)}
        onPick={(p) => addPiece(p)}
      />
    </KeyboardAvoidingView>
  );
}

/* ================================================================================================= */
/*  pieces                                                                                           */
/* ================================================================================================= */

function EntryCard({ e, wide, cardW, narrow, maxF, hi, bad, onQty, onShade, onRemoveLine, onShortage, onAddLine, onFill, onRemove }: {
  e: Entry; wide: boolean; cardW?: number; narrow?: boolean; maxF: number; hi: boolean; bad: boolean;
  onQty: (id: string, v: string) => void; onShade: (id: string) => void; onRemoveLine: (id: string) => void;
  onShortage: () => void; onAddLine: () => void; onFill: () => void; onRemove: () => void;
}) {
  const c = calcEntry(e, maxF);
  const status =
    c.status === 'empty' ? { t: 'Enter qty', col: T.muted, bg: T.sub } :
    c.status === 'full' ? { t: 'Full · closes', col: T.green, bg: '#E8F1EC' } :
    c.status === 'shortage' ? { t: `Shortage ${q3(c.sht)} · closes`, col: T.red, bg: '#F8E9E6' } :
    c.status === 'excess' ? { t: `Excess ${q3(-c.sht)} · closes`, col: T.blue, bg: '#E9EEF6' } :
    { t: `${q3(c.remain)} stays pending`, col: T.amber, bg: '#FBF3E2' };
  return (
    <View style={[st.entry, cardW ? { width: cardW } : null, hi && st.entryHi, (bad || e.stale === 'used') && st.entryBad, e.stale === 'changed' && st.entryChanged]}>
      {e.note && e.stale ? (
        <View style={[st.staleBox, e.stale === 'used' ? st.staleUsed : st.staleChanged]}>
          <Icon name={e.stale === 'used' ? 'block' : 'sync-problem'} size={16} color={e.stale === 'used' ? T.red : T.amber} />
          <Text style={[st.staleText, { color: e.stale === 'used' ? T.red : T.ink }]}>{e.note}</Text>
        </View>
      ) : null}
      <View style={st.entryHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.taka}>TAKA {e.takano}</Text>
          <Text style={st.entrySub} numberOfLines={1}>{e.dsnname || e.dsncode} · {e.itmname || e.itmcode}{e.lotno ? ` · Lot ${e.lotno}` : ''}</Text>
          <Text style={st.entryMeta} numberOfLines={1}>Outward {e.outno} · {dmy(e.outdate)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={st.balLbl}>BALANCE</Text>
          <Text style={st.balVal}>{q3(e.bal)}</Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={st.iconBtn} accessibilityLabel={`Remove taka ${e.takano}`}><Icon name="delete-outline" size={20} color={T.red} /></TouchableOpacity>
      </View>

      {e.lines.map((l, i) => (
        <View key={l.id} style={st.line}>
          <Text style={[st.lineTag, narrow && { width: 30 }, i > 0 && { color: T.purple }]}>{i === 0 ? 'MAIN' : narrow ? `+${i}` : `ADD ${i}`}</Text>
          <TouchableOpacity style={[st.shadeBtn, !l.shdcode && { borderColor: T.amber }]} onPress={() => onShade(l.id)} accessibilityLabel="Select shade">
            <Icon name="palette" size={15} color={l.shdcode ? T.nav : T.amber} />
            <Text style={[st.shadeText, !l.shdcode && { color: T.amber }]} numberOfLines={1}>{l.shdcode ? l.shdname || l.shdcode : 'Select shade'}</Text>
          </TouchableOpacity>
          <TextInput
            value={l.qty}
            onChangeText={(v: string) => onQty(l.id, v)}
            placeholder={i === 0 ? q3(e.bal) : 'qty'}
            placeholderTextColor={T.muted}
            keyboardType="decimal-pad"
            style={[st.qty, narrow && st.qtyNarrow, !!l.qty && { borderColor: T.nav }]}
            selectTextOnFocus
            accessibilityLabel={`Qty ${i === 0 ? 'main' : 'add ' + i}`}
          />
          {i === 0 ? (
            <TouchableOpacity onPress={onFill} style={st.fillBtn} accessibilityLabel="Fill balance"><Text style={st.fillText}>=BAL</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => onRemoveLine(l.id)} style={st.fillBtn} accessibilityLabel="Remove line"><Icon name="close" size={16} color={T.red} /></TouchableOpacity>
          )}
        </View>
      ))}

      <View style={st.entryFoot}>
        <TouchableOpacity style={st.check} onPress={onShortage} accessibilityRole="checkbox" accessibilityState={{ checked: e.shortage }}>
          <Icon name={e.shortage ? 'check-box' : 'check-box-outline-blank'} size={20} color={e.shortage ? T.red : T.muted} />
          <Text style={[st.checkText, e.shortage && { color: T.red }]}>Shortage</Text>
        </TouchableOpacity>
        {wide ? <View style={[st.status, { backgroundColor: status.bg }]}><Text style={[st.statusText, { color: status.col }]} numberOfLines={1}>{status.t}</Text></View> : <View style={{ flex: 1 }} />}
        <TouchableOpacity style={st.addLine} onPress={onAddLine} disabled={e.lines.length >= 10}>
          <Icon name="add" size={16} color={T.purple} />
          <Text style={st.addLineText}>Add to taka</Text>
        </TouchableOpacity>
      </View>
      {!wide ? <View style={[st.status, st.statusRow, { backgroundColor: status.bg }]}><Text style={[st.statusText, { color: status.col }]} numberOfLines={1}>{status.t}</Text></View> : null}
      {c.over ? <Text style={st.warnText}>More than {maxF}× the balance — check the qty.</Text> : c.status === 'excess' && -c.sht > c.bal * 0.1 ? <Text style={st.warnText}>Excess is more than 10% of the balance.</Text> : null}
      {e.lines.length > 1 ? <Text style={st.entryMeta}>Received {q3(c.entered)} in {e.lines.length} lines</Text> : null}
    </View>
  );
}

function PieceRow({ p, added, onPress }: { p: Piece; added?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={added} style={(s: any) => [st.pRow, (s.hovered || s.pressed) && { backgroundColor: T.sub }, added && { opacity: 0.45 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.pTaka}>Taka {p.takano}{added ? '  ✓ added' : ''}</Text>
        <Text style={st.entrySub} numberOfLines={1}>{p.dsnname || p.dsncode} · {p.shdname || 'no shade'} · {p.itmname}</Text>
        <Text style={st.entryMeta} numberOfLines={1}>Outward {p.outno} · {dmy(p.outdate)}</Text>
      </View>
      <Text style={st.pBal}>{q3(p.bal)}</Text>
    </Pressable>
  );
}

function PendingSheet({ open, onClose, body, party, partyName, addedKeys, onPick }: {
  open: boolean; onClose: () => void; body: (x?: Record<string, any>) => any; party: string; partyName: string; addedKeys: string[]; onPick: (p: Piece) => void;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Piece[]>([]);
  const [info, setInfo] = useState<{ total: number; total_bal: number; page: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(async (page = 1, search = q) => {
    if (!party) return;
    setLoading(true);
    setErr('');
    try {
      const d = unwrap(await GreyScanInwardAPI.pending(body({ parcode: party, search, page })));
      setRows((r) => (page === 1 ? d.pieces : [...r, ...d.pieces]));
      setInfo({ total: d.total, total_bal: d.total_bal, page: d.page, pages: d.pages });
    } catch (e) {
      setErr(errText(e, 'Unable to load pending takas.'));
    } finally {
      setLoading(false);
    }
  }, [party, body, q]);
  useEffect(() => { if (open) void load(1, q); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, party]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void load(1, q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const added = new Set(addedKeys);
  return (
    <Sheet open={open} onClose={onClose} eyebrow="PENDING JOB OUTWARD" title={partyName || 'Pending'} wideMax={680}>
      <TextInput value={q} onChangeText={setQ} placeholder="Search taka / outward / design / shade…" placeholderTextColor={T.muted} style={st.search} autoCorrect={false} />
      {info ? <Text style={st.muted}>{info.total} takas pending · {q3(info.total_bal)}</Text> : null}
      {err ? <Text style={[st.muted, { color: T.red }]}>{err}</Text> : null}
      {rows.map((p) => <PieceRow key={p.key} p={p} added={added.has(p.key)} onPress={() => onPick(p)} />)}
      {loading ? <ActivityIndicator color={T.copper} style={{ marginVertical: 10 }} /> : null}
      {info && info.page < info.pages && !loading ? <Btn label="Load more" kind="ghost" compact onPress={() => void load(info.page + 1)} /> : null}
      {!loading && info && !rows.length ? <Text style={st.muted}>Nothing pending.</Text> : null}
    </Sheet>
  );
}

/* ================================================================================================= */
/*  browse                                                                                           */
/* ================================================================================================= */

function BrowsePane({ meta, body, tick, wide, tablet, cw, canEdit, canDelete, editingUid, onEdit, onDeleted }: {
  meta: Meta; body: (x?: Record<string, any>) => any; tick: number; wide: boolean; tablet: boolean; cw: number; canEdit: boolean; canDelete: boolean;
  editingUid: string; onEdit: (d: ShowData) => void; onDeleted: (inwno: string) => void;
}) {
  const grid = makeGrid(cw, wide ? 4 : 2, 26);
  const rowW = wide ? Math.floor((Math.min(cw - 24, 1200) - 10) / 2) : undefined;
  const today = isoToday();
  const [from, setFrom] = useState(today.slice(0, 8) + '01');
  const [to, setTo] = useState(today);
  const [party, setParty] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [info, setInfo] = useState<{ total: number; total_qty: number; total_takas: number; page: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string>('');
  const [detail, setDetail] = useState<ShowData | null>(null);
  const [detailErr, setDetailErr] = useState('');
  const [deleting, setDeleting] = useState(false);
  const req = useRef(0);

  const load = useCallback(async (page = 1) => {
    const id = ++req.current;
    setLoading(true);
    setErr('');
    try {
      const d = unwrap(await GreyScanInwardAPI.browse(body({ fromdate: from, todate: to, parcode: party, search: q.trim(), page })));
      if (id !== req.current) return;
      setRows((r) => (page === 1 ? d.rows : [...r, ...d.rows]));
      setInfo({ total: d.total, total_qty: d.total_qty ?? 0, total_takas: d.total_takas ?? 0, page: d.page, pages: d.pages });
    } catch (e) {
      if (id === req.current) setErr(errText(e, 'Unable to load inwards.'));
    } finally {
      if (id === req.current) setLoading(false);
    }
  }, [body, from, to, party, q]);
  useEffect(() => {
    const t = setTimeout(() => void load(1), 300);
    return () => clearTimeout(t);
  }, [load, tick]);

  const openDetail = async (uid: string) => {
    setOpen(uid);
    setDetail(null);
    setDetailErr('');
    try {
      setDetail(unwrap(await GreyScanInwardAPI.show(body({ uid }))));
    } catch (e) {
      setDetailErr(errText(e, 'Unable to open the inward.'));
    }
  };

  const del = (d: ShowData) =>
    AppAlert.alert(
      `Delete inward ${d.header.inwno}?`,
      `This permanently removes the inward from the database (not a soft delete). ${d.pieces.length} taka(s) go back to pending on the job outward, stock and G.R.N. are reversed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently', style: 'destructive', onPress: async () => {
            setDeleting(true);
            try {
              const res: any = await GreyScanInwardAPI.remove(body({ uid: d.uid }));
              unwrap(res);
              setOpen('');
              setDetail(null);
              onDeleted(d.header.inwno);
              void load(1);
            } catch (e) {
              AppAlert.alert('Not deleted', errText(e, 'Delete failed.'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );

  const partyOpts: Opt[] = useMemo(() => [{ value: '', label: 'All parties' }, ...meta.parties.map((p) => ({ value: p.code, label: p.name, searchText: `${p.name} ${p.code}` }))], [meta]);
  const quick = [
    { l: 'Today', f: today, t: today },
    { l: '7 days', f: addDays(today, -6), t: today },
    { l: 'This month', f: today.slice(0, 8) + '01', t: today },
    { l: 'Year', f: meta.fy_from, t: today < meta.fy_to ? today : meta.fy_to },
  ];
  const sum = rows.reduce((a, r) => ({ takas: a.takas + r.takas, qty: a.qty + r.qty, sht: a.sht + r.sht }), { takas: 0, qty: 0, sht: 0 });

  return (
    <>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[st.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading && !!rows.length} onRefresh={() => void load(1)} />}>
        <View style={st.wrap}>
          <View style={st.card}>
            <View style={st.quickRow}>
              {quick.map((x) => {
                const on = from === x.f && to === x.t;
                return <TouchableOpacity key={x.l} style={[st.quick, on && st.quickOn]} onPress={() => { setFrom(x.f); setTo(x.t); }}><Text style={[st.quickText, on && { color: '#fff' }]}>{x.l}</Text></TouchableOpacity>;
              })}
            </View>
            <View style={st.grid}>
              <View style={grid.w(1, 1, 1)}><Text style={st.label}>From</Text><PoyDateField value={isoToDate(from)} onChange={(d) => setFrom(dateToIso(d))} /></View>
              <View style={grid.w(1, 1, 1)}><Text style={st.label}>To</Text><PoyDateField value={isoToDate(to)} onChange={(d) => setTo(dateToIso(d))} /></View>
              <SelectField label="Party" value={party} options={partyOpts} onChange={(v) => setParty(v)} style={grid.w(2, 2, 1)} />
              <Field label="Search" value={q} onChange={setQ} placeholder="Inward / bill / taka no." style={grid.w(2, 2, 1)} />
            </View>
          </View>

          <Text style={[st.muted, { textAlign: 'left', marginBottom: 8 }]}>Only inwards made from Outward Scan Sticker (web, mobile app, iPad) are listed here.</Text>
          {err ? <View style={st.probBox}><Text style={st.probText}>{err}</Text></View> : null}
          {info ? (
            <View style={st.infoRow}>
              <Chip icon="inventory" text={`${info.total} inwards`} />
              <Chip icon="straighten" text={`${q3(info.total_qty || sum.qty)} · ${info.total_takas || sum.takas} takas`} />
              {sum.sht ? <Chip icon="trending-down" text={`Shortage ${q3(sum.sht)}`} color={T.red} /> : null}
            </View>
          ) : null}

          <View style={[st.list, wide && st.listWide]}>
            {rows.map((r) => (
              <Pressable key={r.uid} onPress={() => void openDetail(r.uid)} style={(s: any) => [st.bRow, rowW ? { width: rowW } : null, (s.hovered || s.pressed) && { backgroundColor: T.sub }, r.uid === editingUid && { borderColor: T.amber }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={st.bNo}>{r.inwno}</Text>
                    <Text style={st.entryMeta}>{dmy(r.inwdate)}</Text>
                    {r.lock ? <View style={st.lockTag}><Text style={st.lockText}>{r.lock}</Text></View> : null}
                    {r.source ? <Text style={st.srcTag}>{srcLabel(r.source)}{r.modified ? ' · edited' : ''}</Text> : null}
                  </View>
                  <Text style={st.entrySub} numberOfLines={1}>{r.parname || r.parcode}</Text>
                  <Text style={st.entryMeta} numberOfLines={1}>Bill {r.billno || '—'} · {r.shade}{r.shades > 1 ? ` +${r.shades - 1}` : ''}{r.remark ? ` · ${r.remark}` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={st.bQty}>{q3(r.qty)}</Text>
                  <Text style={st.entryMeta}>{r.takas} takas</Text>
                  {r.sht ? <Text style={[st.entryMeta, { color: r.sht > 0 ? T.red : T.blue }]}>{r.sht > 0 ? 'Sht' : 'Exc'} {q3(Math.abs(r.sht))}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
          {loading ? <ActivityIndicator color={T.copper} style={{ marginVertical: 14 }} /> : null}
          {!loading && info && !rows.length ? <View style={st.empty}><Icon name="inbox" size={40} color={T.border} /><Text style={st.muted}>No grey job inward in this period.</Text></View> : null}
          {info && info.page < info.pages && !loading ? <Btn label={`Load more (${info.total - rows.length} left)`} kind="ghost" onPress={() => void load(info.page + 1)} style={{ marginTop: 10 }} /> : null}
        </View>
      </ScrollView>

      <Sheet
        open={!!open}
        onClose={() => setOpen('')}
        eyebrow="GREY JOB INWARD"
        title={detail ? `${detail.header.inwno} · ${dmy(detail.header.inwdate)}` : 'Inward'}
        wideMax={760}
        notice={detail?.lock ? <View style={st.lockBox}><Icon name="lock" size={16} color={T.amber} /><Text style={st.lockBoxText}>{detail.lock}</Text></View> : undefined}
        footer={detail ? (
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
            {canDelete ? <Btn label="Delete" icon="delete-forever" kind="danger" compact loading={deleting} disabled={!!detail.lock} onPress={() => del(detail)} style={!tablet ? { flex: 1 } : undefined} /> : null}
            {canEdit ? <Btn label="Modify" icon="edit" compact disabled={!!detail.lock} onPress={() => { setOpen(''); onEdit(detail); }} style={!tablet ? { flex: 1 } : undefined} /> : null}
          </View>
        ) : undefined}
      >
        {!detail && !detailErr ? <ActivityIndicator color={T.copper} /> : null}
        {detailErr ? <Text style={[st.muted, { color: T.red }]}>{detailErr}</Text> : null}
        {detail ? <Detail d={detail} /> : null}
      </Sheet>
    </>
  );
}

function Detail({ d }: { d: ShowData }) {
  const h = d.header;
  const kv: [string, string][] = [
    ['Party', h.parname || h.parcode],
    ['Job A/c', h.accname || h.acccode],
    ['G.R.N.', h.grn ? `${h.grn.grno} · ${dmy(h.grn.grdate)}` : '—'],
    ['Entry type', h.entname || h.enttype],
    ['Store No', h.strsr || '—'],
    ['Bill', `${h.billno || '—'} · ${dmy(h.billdate)}`],
    ['Department', h.dptname || h.dptcode],
    ['Total', `${h.nettaka} takas · ${q3(h.netqty)}`],
    ['Made on', d.source ? srcLabel(d.source) + (d.updated ? ' · edited' : '') : '—'],
  ];
  if (h.remark) kv.push(['Remark', h.remark]);
  return (
    <View style={{ gap: 12 }}>
      <View style={st.kvGrid}>
        {kv.map(([k, v]) => (
          <View key={k} style={st.kv}><Text style={st.kvK}>{k.toUpperCase()}</Text><Text style={st.kvV} numberOfLines={2}>{v}</Text></View>
        ))}
      </View>
      {d.pieces.map((p) => (
        <View key={p.key} style={st.dPiece}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={st.pTaka}>Taka {p.takano}</Text>
            <Text style={[st.entryMeta, { flex: 1 }]} numberOfLines={1}>{p.dsnname || p.dsncode} · Out {p.outno}</Text>
            <Text style={st.entryMeta}>bal {q3(p.bal)}</Text>
          </View>
          {p.lines.map((l, i) => (
            <View key={i} style={st.dLine}>
              <Text style={[st.lineTag, i > 0 && { color: T.purple }]}>{i === 0 ? 'MAIN' : `ADD ${i}`}</Text>
              <Text style={[st.entrySub, { flex: 1 }]} numberOfLines={1}>{l.shdname || l.shdcode}</Text>
              <Text style={st.dQty}>{q3(l.qty)}</Text>
            </View>
          ))}
          {p.sht ? <Text style={[st.entryMeta, { color: p.sht > 0 ? T.red : T.blue }]}>{p.sht > 0 ? `Shortage ${q3(p.sht)}` : `Excess ${q3(-p.sht)}`}</Text> : null}
          {!p.sht && p.outbal_now > 0 ? <Text style={[st.entryMeta, { color: T.amber }]}>{q3(p.outbal_now)} still pending on the outward</Text> : null}
        </View>
      ))}
    </View>
  );
}

/* ================================================================================================= */
/*  small parts                                                                                      */
/* ================================================================================================= */

const srcLabel = (s: string) => ({ web: 'Web', android: 'Android app', ios: 'iPhone / iPad', windows: 'Windows', macos: 'Mac' } as Record<string, string>)[s] || 'App';

function HelpCard() {
  const rows: [string, string, string][] = [
    ['looks-one', 'Party', 'Choose the dyeing mill. Only mills with takas still out (pending job outward) are listed, with count and kg.'],
    ['looks-two', 'Details', 'G.R.N. is optional — pick it when the lot came through the gate G.R.N.; it fills Job A/c and Bill. Then Job A/c, Entry type, Store No, Bill / challan no. and dates.'],
    ['looks-3', 'Scan', 'Camera (Scan sticker), scanner gun (click the box, then shoot) or manual (type taka no. / Pending list). A taka of another mill or already received is refused with the reason.'],
    ['looks-4', 'Shade & kg', 'The outward shade is pre-selected — change it if needed. Enter kg received. =BAL fills the full balance.'],
    ['check-box', 'Shortage ✓', 'Tick when the mill will not send more: balance − kg is booked as shortage and the taka closes.'],
    ['trending-up', 'More kg', 'Kg above the balance (100 vs 98) is saved as excess; the taka closes.'],
    ['hourglass-empty', 'Less kg', 'Not ticked: the rest stays pending on the outward and can be received later.'],
    ['add', 'Add to taka', 'Same taka, different shade for the extra / leftover kg — its own line.'],
    ['save', 'Save', 'Shows totals first. Browse lists every inward made from this screen (web, app, iPad): open, Modify or Delete (permanent).'],
  ];
  return (
    <View style={[st.card, { gap: 8 }]}>
      <Text style={st.cardEyebrow}>HOW TO ENTER</Text>
      {rows.map(([ic, t, d]) => (
        <View key={t} style={st.helpRow}>
          <Icon name={ic as any} size={18} color={T.copper} />
          <Text style={st.helpT}>{t}</Text>
          <Text style={st.helpD}>{d}</Text>
        </View>
      ))}
    </View>
  );
}

function Way({ icon, title, text, onPress }: { icon: string; title: string; text: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={[st.way, !onPress && { opacity: 0.5 }]} onPress={onPress} disabled={!onPress} accessibilityLabel={title}>
      <Icon name={icon as any} size={26} color={T.nav} />
      <Text style={st.wayT}>{title}</Text>
      <Text style={st.wayD}>{text}</Text>
    </TouchableOpacity>
  );
}

/** fixed-width grid: identical on web, Android, iOS (no %-flex guessing). spans = columns on phone(2) / tablet(3) / desktop(4) */
function makeGrid(cw: number, cols: number, cardInset: number) {
  const gap = 10;
  const inner = Math.max(240, Math.min(cw - 24, 1200) - cardInset);
  const colW = (inner - gap * (cols - 1)) / cols;
  return {
    w: (phone: number, tab: number, desk: number) => {
      const n = Math.min(cols, cols === 2 ? phone : cols === 3 ? tab : desk);
      const w = Math.floor(n * colW + (n - 1) * gap);
      // overrides SelectField's own `flex: 1, minWidth: 150` — fixed width, never grows / shrinks
      return { width: w, flexBasis: w, flexGrow: 0, flexShrink: 0, minWidth: 0, maxWidth: w };
    },
  };
}

function Field({ label, value, onChange, placeholder, required, style }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; style?: any }) {
  return (
    <View style={style}>
      <Text style={st.label}>{label}{required ? <Text style={{ color: T.red }}> *</Text> : null}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={T.muted} style={[st.input, !!value && { borderColor: T.nav }]} autoCorrect={false} />
    </View>
  );
}

function Chip({ icon, text, color }: { icon: string; text: string; color?: string }) {
  return (
    <View style={st.chip}>
      <Icon name={icon as any} size={14} color={color || T.nav} />
      <Text style={[st.chipText, color ? { color } : null]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function Stat({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <View style={st.stat}>
      <Text style={st.statLbl} numberOfLines={1}>{label.toUpperCase()}</Text>
      <Text style={[st.statVal, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={st.statSub}>{sub}</Text> : null}
    </View>
  );
}

/* ================================================================================================= */

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, backgroundColor: T.bg },
  errTitle: { fontSize: 15, fontWeight: '800', color: T.red },
  muted: { fontSize: 12, color: T.muted, textAlign: 'center', lineHeight: 17 },
  pad: { padding: 12 },
  wrap: { width: '100%', maxWidth: 1200, alignSelf: 'center' },

  topBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  tabOn: { backgroundColor: T.nav, borderColor: T.nav },
  tabText: { fontSize: 13, fontWeight: '800', color: T.nav },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  ctxText: { flex: 1, minWidth: 160, textAlign: 'right', fontSize: 11, color: T.muted, fontWeight: '600' },

  flash: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  flashOk: { backgroundColor: T.green },
  flashWarn: { backgroundColor: T.amber },
  flashErr: { backgroundColor: T.red },
  flashText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' },

  editBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: '#FBF3E2', borderWidth: 1, borderColor: '#EED9AE', marginBottom: 10 },
  editText: { flex: 1, fontSize: 12.5, color: T.ink, fontWeight: '600' },
  link: { color: T.blue, fontWeight: '800', fontSize: 13 },

  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, marginBottom: 10 },
  cardEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, color: T.copper, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' },
  gridWide: { gap: 12 },
  colFull: { flexBasis: '100%', flexGrow: 1, minWidth: 0 },
  colHalf: { flexBasis: '46%', flexGrow: 1, minWidth: 140 },
  col3: { flexBasis: '31%', flexGrow: 1, minWidth: 200 },
  col4: { flexBasis: '23%', flexGrow: 1, minWidth: 160 },
  label: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.4, marginBottom: 5, textTransform: 'uppercase' },
  input: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12, fontSize: 14, color: T.ink },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: T.sub, borderWidth: 1, borderColor: T.hair, maxWidth: '100%' },
  chipText: { fontSize: 12, fontWeight: '700', color: T.nav, flexShrink: 1 },

  scanCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, paddingHorizontal: 16, borderRadius: 12, backgroundColor: T.nav, flexGrow: 1, minWidth: 220 },
  scanBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  scanBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11.5, maxWidth: 220 },
  typeWrap: { flexDirection: 'row', gap: 6, flexGrow: 1, minWidth: 220 },
  typeInput: { flex: 1, height: 48, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, fontSize: 15, color: T.ink, backgroundColor: T.surface, fontFamily: MF },
  typeGo: { width: 48, height: 48, borderRadius: 10, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },

  probBox: { backgroundColor: '#F8E9E6', borderColor: '#EBC6BE', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10, gap: 3 },
  probText: { color: T.red, fontSize: 12.5, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 8, gap: 10 },
  ways: { alignSelf: 'stretch', gap: 10 },
  way: { flex: 1, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14, gap: 4, alignItems: 'flex-start' },
  wayT: { fontSize: 14, fontWeight: '900', color: T.nav },
  wayD: { fontSize: 12, color: T.muted, lineHeight: 17 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  stepsPhone: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, padding: 10, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  stepPhoneT: { fontSize: 13, fontWeight: '900', color: T.copper },
  progress: { flexDirection: 'row', gap: 4, marginTop: 6 },
  progSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: T.alt },
  step: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  stepOn: { borderColor: T.copper, backgroundColor: '#FCF6F1' },
  stepMini: { flex: 0, paddingHorizontal: 6 },
  stepOk: { borderColor: '#CFE2D6' },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: T.muted, alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: '#fff', fontSize: 11, fontWeight: '900' },
  stepT: { fontSize: 12, fontWeight: '800', color: T.nav },
  stepD: { fontSize: 10.5, color: T.muted },
  helpBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 38, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#C9D4E6', backgroundColor: '#EEF2F8' },
  helpBtnText: { fontSize: 12, fontWeight: '800', color: T.blue },
  helpRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  helpT: { width: 92, fontSize: 12.5, fontWeight: '900', color: T.nav },
  helpD: { flex: 1, minWidth: 200, fontSize: 12.5, color: T.ink, lineHeight: 18 },
  footHint: { fontSize: 11.5, color: T.amber, fontWeight: '700' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: T.nav, textAlign: 'center' },

  list: { gap: 10 },
  listWide: { flexDirection: 'row', flexWrap: 'wrap' },
  entry: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, gap: 8 },
  entryWide: { flexBasis: '48%', flexGrow: 1, minWidth: 360 },
  entryHi: { borderColor: T.green, borderWidth: 2 },
  entryBad: { borderColor: T.red, borderWidth: 2 },
  entryChanged: { borderColor: T.amber, borderWidth: 2 },
  staleBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 8, borderRadius: 8 },
  staleUsed: { backgroundColor: '#F8E9E6' },
  staleChanged: { backgroundColor: '#FBF3E2' },
  staleText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  entryHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  taka: { fontSize: 17, fontWeight: '900', color: T.nav, fontFamily: MF },
  entrySub: { fontSize: 12.5, color: T.ink, fontWeight: '600', marginTop: 1 },
  entryMeta: { fontSize: 11.5, color: T.muted, marginTop: 1 },
  balLbl: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 0.8 },
  balVal: { fontSize: 16, fontWeight: '900', color: T.ink, fontFamily: MF },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub },

  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineTag: { width: 38, fontSize: 10, fontWeight: '900', color: T.copper, letterSpacing: 0.6 },
  shadeBtn: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  shadeText: { flex: 1, fontSize: 13, fontWeight: '700', color: T.ink },
  qtyNarrow: { width: 92, fontSize: 15 },
  qty: { width: 110, height: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 10, fontSize: 16, fontWeight: '800', textAlign: 'right', color: T.ink, fontFamily: MF, backgroundColor: T.surface },
  fillBtn: { width: 46, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, borderWidth: 1, borderColor: T.hair },
  fillText: { fontSize: 10.5, fontWeight: '900', color: T.nav },

  entryFoot: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingRight: 6 },
  checkText: { fontSize: 13, fontWeight: '800', color: T.ink },
  status: { flex: 1, minWidth: 120, minHeight: 30, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center' },
  statusRow: { flex: 0, flexGrow: 0, minWidth: 0, alignSelf: 'stretch' },
  statusText: { fontSize: 12, fontWeight: '800' },
  addLine: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 10, borderRadius: 17, borderWidth: 1, borderColor: '#D9C6E3', backgroundColor: '#F6F0F9' },
  addLineText: { fontSize: 12, fontWeight: '800', color: T.purple },
  warnText: { fontSize: 11.5, color: T.amber, fontWeight: '700' },

  pRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: T.hair, borderRadius: 8 },
  pTaka: { fontSize: 14, fontWeight: '900', color: T.nav, fontFamily: MF },
  pBal: { fontSize: 14, fontWeight: '800', color: T.ink, fontFamily: MF },
  search: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, fontSize: 14, color: T.ink, backgroundColor: T.surface },

  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 12, paddingVertical: 8 },
  footCol: { flexDirection: 'column', alignItems: 'stretch', gap: 6 },
  footInner: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  footStats: { flex: 1, flexDirection: 'row', gap: 6, minWidth: 240 },
  footBtns: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  stat: { flex: 1, minWidth: 0 },
  statLbl: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  statVal: { fontSize: 15, fontWeight: '900', color: T.ink, fontFamily: MF },
  statSub: { fontSize: 10, color: T.muted },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  quick: { height: 30, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: T.border, justifyContent: 'center' },
  quickOn: { backgroundColor: T.nav, borderColor: T.nav },
  quickText: { fontSize: 12, fontWeight: '800', color: T.nav },
  bRow: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  bNo: { fontSize: 15, fontWeight: '900', color: T.nav, fontFamily: MF },
  bQty: { fontSize: 15, fontWeight: '900', color: T.ink, fontFamily: MF },
  lockTag: { paddingHorizontal: 7, height: 18, borderRadius: 9, backgroundColor: '#FBF3E2', justifyContent: 'center' },
  lockText: { fontSize: 10, fontWeight: '800', color: T.amber },
  srcTag: { fontSize: 10, fontWeight: '800', color: T.blue },
  lockBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: '#FBF3E2' },
  lockBoxText: { flex: 1, fontSize: 12.5, color: T.ink, fontWeight: '600' },

  kvGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kv: { flexBasis: '46%', flexGrow: 1, minWidth: 140 },
  kvK: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  kvV: { fontSize: 13, fontWeight: '700', color: T.ink },
  dPiece: { borderWidth: 1, borderColor: T.hair, borderRadius: 10, padding: 10, gap: 4 },
  dLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dQty: { fontSize: 13.5, fontWeight: '800', color: T.ink, fontFamily: MF },
});
