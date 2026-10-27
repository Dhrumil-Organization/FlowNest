// FILE: src/components/SalesChallanPackingSlipNEW/CartonScanSheet.tsx
// Carton selection for ONE allocation line — replaces CartonDetail ("Scan data") + its carton help (CartonSelect).
//
//   Summary screen (no scanner on it — the list stays in view):
//   ┌ ← Scan cartons · Sr 1 · SO …                                [Scan QR] ┐
//   │ Summary   Cartons 3/12 · Net weight 61.5 kg · Location T20 · Prod. type LC │
//   │           Item · Merge · Shade · Grade                    ▓▓░░ of balance qty │
//   │ Scanner: Hardware scanner                                      Change     │
//   │ ✓ SA98935 selected · 18.080 · T20                                         │
//   │ Carton list   [search]   All 12 · Selected 3 · To scan 8 · Locked 1   │
//   │ ✓ C-001   20.000   B-03-01                                    ✕ remove │
//   │ ○ C-002   20.000   B-03-02                                    [Scan]   │
//   └ [View selected (3)]                              [Done · 3 cartons]   ┘
//
//   Scanner screen (opens on "Scan QR" / a row's Scan, uses the scanner type picked on the line):
//   a good scan selects the carton and goes straight back to the summary; a bad scan (not found, locked,
//   already scanned, wrong carton) stays on the scanner with the reason, so the user just scans again.
//
// The scanner type (hardware / mobile camera) is chosen on the line before this screen opens and is kept for
// every scan here; "Change" switches it. A carton scanned by mistake is removed with ✕ (confirm). Cartons that
// were already saved on a saved line (D1Flag = 1) stay locked, as on the web.
//
// Cartons come from getcartondetail with limit '' (all cartons of ItmCode + MerCode + GrdCode + ShdCode, like the
// web carton help) and carry the warehouse location. Done is blocked while the selected qty is more than the
// balance qty or a carton is there twice (web handleItemOk).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, Vibration, View, useWindowDimensions } from 'react-native';
import { confirmAsync } from '../ProductionOrderNEW/ui';
import { Btn, LinkBtn, Notice, tab, u } from '../PackingAutomationNEW/ui';
import { apiErrorText } from './api';
import type { Row } from './api';
import { cartonsIssue, cartonsOf, cartonView, matchCarton, n3, qty, sum } from './rules';
import type { ScanResult } from './rules';
import { CameraScanner, HardwareScanner } from './ScanDevices';
import type { ScanDevice } from './ScanDevices';
import { Bar } from './ui';
import { isWeb } from './webWedge';

type Filter = 'all' | 'selected' | 'open' | 'locked';
const PAGE = 60;

type ListRow = { key: string; no: string; qty: number; chees: string; location: string; prodType: string; lot: string;
  locked: boolean; lockReason: string; selected: boolean; savedOnly: boolean };

export default function CartonScanSheet({ open, row, d2, uid, device: startDevice, loadCartons, onDone, onClose }: {
  open: boolean; row: Row | null; d2: Row[]; uid: any; device: ScanDevice;
  loadCartons: (row: Row) => Promise<Row[]>; onDone: (srNo: any, cartons: Row[]) => void; onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const [list, setList] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [scanned, setScanned] = useState<Row[]>([]);
  const [device, setDevice] = useState<ScanDevice>(startDevice);
  const [scanning, setScanning] = useState(false); // scanner screen open
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [expect, setExpect] = useState<string>(''); // carton no. asked for by a row's Scan
  const [last, setLast] = useState<(ScanResult & { at: number }) | null>(null); // shown on the summary
  const [miss, setMiss] = useState<(ScanResult & { at: number }) | null>(null); // bad scan, shown on the scanner
  const [doneErr, setDoneErr] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const scroll = useRef<ScrollView>(null);

  const srNo = row?.SrNo;
  const initial = useMemo(() => cartonsOf(d2, srNo), [d2, srNo]);
  const others = useMemo(() => (d2 || []).filter((c) => parseInt(c.SrNo, 10) !== parseInt(srNo, 10)), [d2, srNo]);

  const fetch = async () => {
    if (!row) return;
    setBusy(true); setErr('');
    try { setList(await loadCartons(row)); } catch (e) { setList([]); setErr(apiErrorText(e, 'Cartons could not be loaded.')); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (!open || !row) return;
    setScanned(initial); setLast(null); setMiss(null); setText(''); setDoneErr(''); setDevice(startDevice); setTyping(false);
    setScanning(false); setExpect(''); setFilter('all'); setQ(''); setLimit(PAGE);
    fetch();
  }, [open, row]); // eslint-disable-line react-hooks/exhaustive-deps

  // Browser: a hardware scan pressed on the summary ends with Enter / Tab, which would "click" the focused button
  // (Back → closes the screen). Swallow them here; scanning happens on the scanner screen only.
  useEffect(() => {
    if (!isWeb || !open || scanning) return undefined;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, scanning]);

  /* ---------- list = stock cartons + cartons already on this line that the stock call no longer returns ---------- */
  const rows: ListRow[] = useMemo(() => {
    const picked = new Set(scanned.map((c) => String(c.CartNo)));
    const out: ListRow[] = list.map((r) => {
      const v = cartonView(r);
      return { key: `s-${v.no}`, no: v.no, qty: v.qty, chees: v.chees, location: v.location, prodType: v.prodType, lot: v.lot,
        locked: v.locked, lockReason: v.lockReason, selected: picked.has(v.no), savedOnly: false };
    });
    const inStock = new Set(out.map((r) => r.no));
    scanned.filter((c) => !inStock.has(String(c.CartNo))).forEach((c) => out.push({
      key: `p-${c.CartNo}`, no: String(c.CartNo), qty: n3(c.QtyWt), chees: String(c.Chees ?? ''), location: String(c.WarehouseLoction ?? ''),
      prodType: String(c.ProdType ?? ''), lot: String(c.LotNo ?? ''), locked: false, lockReason: '', selected: true, savedOnly: true,
    }));
    // location order — the picker walks the aisle; selected first inside "All" is not done on purpose (rows would jump)
    return out.sort((a, b) => a.location.localeCompare(b.location, undefined, { numeric: true }) || a.no.localeCompare(b.no, undefined, { numeric: true }));
  }, [list, scanned]);

  const counts = useMemo(() => ({
    all: rows.length,
    selected: rows.filter((r) => r.selected).length,
    open: rows.filter((r) => !r.selected && !r.locked).length,
    locked: rows.filter((r) => r.locked).length,
  }), [rows]);

  const shown = useMemo(() => {
    const s = q.trim().toUpperCase();
    return rows.filter((r) => {
      if (filter === 'selected' && !r.selected) return false;
      if (filter === 'open' && (r.selected || r.locked)) return false;
      if (filter === 'locked' && !r.locked) return false;
      return !s || `${r.no} ${r.location} ${r.lot} ${r.prodType}`.toUpperCase().includes(s);
    });
  }, [rows, filter, q]);

  if (!row) return null;

  const target = n3(row.BQty);
  const sQty = sum(scanned, 'QtyWt');
  const over = n3(sQty) > target;
  const savedLine = String(row.D1Flag) === '1'; // web: cartons of a saved line can't be removed here
  const dirty = scanned.length !== initial.length || scanned.some((c, i) => c !== initial[i]);
  const ready = !busy && list.length > 0;

  const selRows = rows.filter((r) => r.selected);
  const locBase = selRows.length ? selRows : rows; // before any scan: where the stock is
  const locs = Array.from(new Set(locBase.map((r) => r.location).filter(Boolean)));
  const aisles = Array.from(new Set(locs.map(aisleOf)));
  const locText = locs.length === 0 ? '—' : locs.length === 1 ? locs[0] : aisles.length === 1 ? aisles[0] : `${aisles[0]} +${aisles.length - 1}`;
  const types = Array.from(new Set((selRows.length ? selRows : rows).map((r) => r.prodType).filter(Boolean)));

  /* ---------- scanning ---------- */
  const fail = (r: ScanResult) => { setMiss({ ...r, at: Date.now() }); Vibration.vibrate([0, 120, 80, 120]); };
  const read = (raw: string) => {
    const code = String(raw || '').trim();
    if (!code || busy) return;
    const res = matchCarton(code, { list, scanned, others, srNo, uid });
    if (expect && (res.status === 'added' || res.status === 'locked') && String(res.source?.cartno) !== expect) {
      fail({ status: 'mismatch', message: `That label is ${res.source?.cartno}, not ${expect}. Scan ${expect}.` });
      return;
    }
    setText('');
    if (res.status === 'added' && res.carton) {
      // good scan → select it and go back to the summary
      setScanned((s) => [...s, res.carton as Row]);
      setLast({ ...res, at: Date.now() });
      setDoneErr(''); setMiss(null); setExpect(''); setTyping(false); setScanning(false);
      Vibration.vibrate(40);
    } else fail(res);
  };
  const openScanner = (no = '') => { setExpect(no); setMiss(null); setTyping(false); setScanning(true); };
  const closeScanner = () => { setScanning(false); setExpect(''); setMiss(null); setTyping(false); };
  const changeDevice = () => { setDevice((d) => (d === 'hardware' ? 'camera' : 'hardware')); setMiss(null); };

  const canRemove = (no: string) => !savedLine || !initial.some((c) => String(c.CartNo) === no);
  const remove = async (no: string) => {
    if (!canRemove(no)) return;
    const c = scanned.find((x) => String(x.CartNo) === no);
    if (!c) return;
    if (await confirmAsync('Remove carton?', `${c.CartNo} (${qty(c.QtyWt)}) comes off this line.`, 'Remove', true)) {
      setScanned((s) => s.filter((x) => x !== c));
      setLast(null); setDoneErr('');
    }
  };
  const close = async () => {
    if (scanning) { closeScanner(); return; } // Android back on the scanner → summary
    if (dirty && !(await confirmAsync('Leave without adding?', 'Cartons scanned now will not be added to the packing slip.', 'Leave'))) return;
    onClose();
  };
  const done = () => {
    const issue = cartonsIssue(row, scanned, others);
    if (issue) { setDoneErr(issue); Vibration.vibrate([0, 120, 80, 120]); return; }
    onDone(srNo, scanned);
  };

  const lastRow = last?.status === 'added' ? rows.find((r) => r.no === String(last.carton?.CartNo)) : undefined;
  const expRow = expect ? rows.find((r) => r.no === expect) : undefined;

  return (
    <Modal visible={open} animationType="slide" onRequestClose={close} presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        {/* ---------- app bar ---------- */}
        <View style={{ backgroundColor: T.nav, paddingTop: Platform.OS === 'ios' ? 52 : 14, paddingBottom: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel="Back" style={st.navBtn}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800' }} numberOfLines={1}>Scan cartons</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>Sr {srNo} · {row.SONo ? `SO ${row.SONo} · ` : ''}Carton selection</Text>
          </View>
          <TouchableOpacity onPress={() => openScanner()} disabled={!ready} accessibilityRole="button" accessibilityLabel="Scan QR"
            style={{ alignItems: 'center', paddingHorizontal: 6, opacity: ready ? 1 : 0.5 }}>
            <Icon name="qr-code-scanner" size={28} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 2 }}>Scan QR</Text>
          </TouchableOpacity>
        </View>

        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 24, alignItems: 'center' }} keyboardShouldPersistTaps="always">
          <View style={{ width: '100%', maxWidth: 900 }}>
            {/* ---------- summary ---------- */}
            <View style={[u.card, { padding: 0, overflow: 'hidden' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: T.sub }}>
                <View style={[st.badge, { backgroundColor: '#F2A93B' }]}><Icon name="list-alt" size={18} color="#fff" /></View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: T.ink }}>Summary</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 12 }}>
                <Tile icon="inventory-2" color={T.copper} label="No. of cartons" value={String(scanned.length)} sub={`of ${parseInt(row.TotCarton, 10) || rows.length} (selected)`} wide={wide} />
                <Tile icon="scale" color={T.blue} label="Net weight" value={qty(sQty)} sub={`of ${qty(target)} bal.`} warn={over} wide={wide} />
                <Tile icon="place" color={T.green} label="Location" value={locText} sub={`${selRows.length ? '(selected' : '(in stock'}${locs.length > 1 ? ` · ${locs.length} places)` : ')'}`} wide={wide} />
                <Tile icon="settings-suggest" color="#8B5CF6" label="Production type" value={types.join(', ') || '—'} sub={types.length > 1 ? 'mixed' : ' '} wide={wide} last />
              </View>
              <View style={{ marginHorizontal: 14, marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: T.blue + '12', borderRadius: 12, paddingVertical: 10 }}>
                <Info label="Item name" value={row.ItmName} />
                <Info label="Merge name" value={row.MerName} />
                <Info label="Shade name" value={row.ShdName} />
                <Info label="Grade" value={row.GrdName} last />
              </View>
              <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                <Bar value={target ? sQty / target : 0} tone={over ? 'red' : 'green'} height={8} />
                {over ? <Text style={{ color: T.red, fontSize: 12.5, fontWeight: '700', marginTop: 6 }}>Selected {qty(sQty)} is more than the balance {qty(target)} — remove a carton.</Text> : null}
              </View>
            </View>

            {/* ---------- scanner type (picked on the line) ---------- */}
            <View style={st.devBar}>
              <View style={[st.badge, { backgroundColor: T.nav }]}>
                <Icon name={device === 'hardware' ? 'qr-code-scanner' : 'photo-camera'} size={18} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 11.5, color: T.muted, fontWeight: '600' }}>Scanner</Text>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: T.ink }} numberOfLines={1}>{device === 'hardware' ? 'Hardware scanner' : 'Mobile camera'}</Text>
              </View>
              <LinkBtn label="Change" icon="swap-horiz" onPress={changeDevice} />
            </View>

            {last?.status === 'added' ? (
              <View key={last.at} accessibilityLiveRegion="polite" style={[st.result, { backgroundColor: T.green }]}>
                <Icon name="check-circle" size={22} color="#fff" />
                <Text style={[{ flex: 1, color: '#fff', fontSize: 14.5, fontWeight: '800' }, tab]} numberOfLines={2}>
                  {lastRow ? `${lastRow.no} selected · ${qty(lastRow.qty)}${lastRow.location ? ` · ${lastRow.location}` : ''}` : last.message}
                </Text>
                <TouchableOpacity onPress={() => setLast(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss"><Icon name="close" size={18} color="#fff" /></TouchableOpacity>
              </View>
            ) : null}
            {doneErr ? <Notice tone="err" text={doneErr} /> : null}

            {/* ---------- carton list ---------- */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6, marginBottom: 8 }}>
              <Text style={{ fontSize: 19, fontWeight: '800', color: T.ink }}>Carton list</Text>
              <Text style={[u.hint, { marginTop: 0 }]}>Scan QR to select carton(s)</Text>
            </View>
            <View style={[u.field, { minHeight: 46, marginBottom: 8 }]}>
              <Icon name="search" size={20} color={T.muted} />
              <TextInput value={q} onChangeText={(t) => { setQ(t); setLimit(PAGE); }} placeholder="Carton no., location or lot" placeholderTextColor={T.muted}
                autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Find carton"
                style={[u.input, { fontSize: 15, minHeight: 40, paddingVertical: 6, minWidth: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} />
              {q ? <TouchableOpacity onPress={() => setQ('')} hitSlop={10}><Icon name="close" size={18} color={T.muted} /></TouchableOpacity> : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
              {([['all', 'All'], ['selected', 'Selected'], ['open', 'To scan'], ['locked', 'Locked']] as const).map(([k, l]) => (
                <Pressable key={k} onPress={() => { setFilter(k); setLimit(PAGE); }} accessibilityRole="button"
                  style={[st.chip, filter === k && { borderColor: T.copper, backgroundColor: T.copper + '14' }]}>
                  <Text style={[st.chipText, filter === k && { color: T.copper }]}>{l} · {counts[k]}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {err ? <Notice tone="err" text={err} action={{ label: 'Retry', onPress: fetch }} /> : null}
            {busy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, justifyContent: 'center' }}>
                <ActivityIndicator color={T.copper} />
                <Text style={[u.hint, { marginTop: 0 }]}>Loading cartons in stock…</Text>
              </View>
            ) : !rows.length && !err ? (
              <Notice tone="info" text="No cartons in stock for this item, merge, grade and shade." />
            ) : !shown.length ? (
              <Notice tone="info" text="No carton matches this filter." />
            ) : null}

            {shown.slice(0, limit).map((r) => (
              <CartonRow key={r.key} r={r} wide={wide} expecting={false} canRemove={canRemove(r.no)} canScan={ready}
                onScan={() => openScanner(r.no)} onRemove={() => remove(r.no)} />
            ))}
            {shown.length > limit ? (
              <Btn kind="ghost" label={`Show ${Math.min(PAGE, shown.length - limit)} more · ${shown.length - limit} left`} onPress={() => setLimit((l) => l + PAGE)} />
            ) : null}
          </View>
        </ScrollView>

        {/* ---------- footer ---------- */}
        <View style={{ backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 14, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 14, alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 900, flexDirection: 'row', gap: 10 }}>
            <Btn kind="ghost" icon={filter === 'selected' ? 'list' : 'check-circle'} label={filter === 'selected' ? 'All cartons' : `View selected (${counts.selected})`}
              onPress={() => { setFilter((f) => (f === 'selected' ? 'all' : 'selected')); scroll.current?.scrollTo({ y: 0, animated: true }); }} />
            <Btn flex kind="copper" icon="check" label={`Done · ${scanned.length}`} onPress={done} />
          </View>
        </View>

        {/* ---------- scanner screen (over the summary, same Modal — no nested modal / focus trap on web) ---------- */}
        {scanning ? (
          <View style={st.overlay}>
            <View style={{ backgroundColor: T.nav, paddingTop: Platform.OS === 'ios' ? 52 : 14, paddingBottom: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={closeScanner} accessibilityRole="button" accessibilityLabel="Back to summary" style={st.navBtn}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800' }} numberOfLines={1}>{expect ? `Scan carton ${expect}` : 'Scan any carton'}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                  {device === 'hardware' ? 'Hardware scanner' : 'Mobile camera'} · {scanned.length} selected · {qty(sQty)} of {qty(target)}
                </Text>
              </View>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, alignItems: 'center' }} keyboardShouldPersistTaps="always">
              <View style={{ width: '100%', maxWidth: 640, gap: 12 }}>
                {expRow ? (
                  <View style={[u.card, { marginBottom: 0, flexDirection: 'row', paddingVertical: 12 }]}>
                    <Col label="Carton no." value={expRow.no} />
                    <Col label="Net wt." value={qty(expRow.qty)} divider />
                    <Col label="Location" value={expRow.location || '—'} divider />
                  </View>
                ) : null}

                {typing ? (
                  <View style={u.field}>
                    <Icon name="keyboard" size={22} color={T.muted} />
                    <TextInput value={text} onChangeText={setText} onSubmitEditing={() => read(text)} blurOnSubmit={false} autoFocus
                      autoCorrect={false} autoCapitalize="none" placeholder="Type or paste the label" placeholderTextColor={T.muted} accessibilityLabel="Carton label"
                      style={[u.input, { fontSize: 15, fontWeight: '600', minWidth: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} />
                    <Btn label="Add" onPress={() => read(text)} disabled={!text} style={{ height: 40, paddingHorizontal: 16 }} />
                  </View>
                ) : device === 'hardware' ? (
                  <HardwareScanner onScan={read} enabled={ready} />
                ) : (
                  <CameraScanner onScan={read} enabled={ready} onRefused={() => setDevice('hardware')} />
                )}

                {miss ? (
                  <View key={miss.at} accessibilityLiveRegion="assertive" style={[st.result, { marginBottom: 0, backgroundColor: miss.status === 'duplicate' || miss.status === 'mismatch' ? T.amber : T.red }]}>
                    <Icon name={miss.status === 'locked' ? 'lock' : miss.status === 'notfound' ? 'cancel' : 'error-outline'} size={22} color="#fff" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                        {miss.status === 'duplicate' ? 'Already scanned' : miss.status === 'locked' ? 'Locked carton' : miss.status === 'mismatch' ? 'Wrong carton' : 'Not found'}
                      </Text>
                      <Text style={[{ color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 1 }, tab]}>{miss.message} Scan again.</Text>
                    </View>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <LinkBtn label={device === 'hardware' ? 'Use mobile camera' : 'Use hardware scanner'} icon="swap-horiz" onPress={changeDevice} />
                  <LinkBtn label={typing ? 'Back to scanner' : 'Type a label'} icon={typing ? 'qr-code-scanner' : 'keyboard'} onPress={() => setTyping((t) => !t)} />
                </View>
              </View>
            </ScrollView>
            <View style={{ backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 14, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 14, alignItems: 'center' }}>
              <View style={{ width: '100%', maxWidth: 640 }}>
                <Btn kind="ghost" icon="arrow-back" label="Back to summary" onPress={closeScanner} />
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

/* ------------------------------ pieces ------------------------------ */

function CartonRow({ r, wide, expecting, canRemove, canScan, onScan, onRemove }: {
  r: ListRow; wide: boolean; expecting: boolean; canRemove: boolean; canScan: boolean; onScan: () => void; onRemove: () => void;
}) {
  const border = r.selected ? T.green : expecting ? T.copper : T.border;
  return (
    <View style={[st.row, { borderColor: border }, r.selected && { backgroundColor: T.green + '10' }, r.locked && { backgroundColor: T.sub }]}>
      <View style={[st.tick, r.selected && { backgroundColor: T.green, borderColor: T.green }, r.locked && { borderColor: T.border }]}>
        {r.selected ? <Icon name="check" size={18} color="#fff" /> : r.locked ? <Icon name="lock" size={15} color={T.muted} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row' }}>
          <Col label="Carton no." value={r.no} />
          <Col label="Net wt." value={qty(r.qty)} divider />
          <Col label="Location" value={r.location || '—'} divider />
          {wide ? <Col label="Chees · type" value={[r.chees, r.prodType].filter(Boolean).join(' · ') || '—'} divider /> : null}
        </View>
        {r.locked ? (
          <Text style={{ color: T.red, fontSize: 12, fontWeight: '700', marginTop: 4 }} numberOfLines={2}>Locked{r.lockReason ? `: ${r.lockReason}` : ''}</Text>
        ) : !wide && (r.chees || r.prodType || r.lot) ? (
          <Text style={[u.code, tab, { marginTop: 4 }]} numberOfLines={1}>{[r.chees && `${r.chees} chees`, r.prodType, r.lot && `Lot ${r.lot}`].filter(Boolean).join(' · ')}</Text>
        ) : null}
        {r.savedOnly ? <Text style={[u.code, { marginTop: 2 }]}>Saved on this line</Text> : null}
      </View>
      {r.selected ? (
        canRemove ? (
          <TouchableOpacity onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${r.no}`} style={st.rowSide}>
            <Icon name="close" size={20} color={T.red} />
          </TouchableOpacity>
        ) : <View style={{ width: 8 }} />
      ) : !r.locked ? (
        <TouchableOpacity onPress={onScan} disabled={!canScan} accessibilityRole="button" accessibilityLabel={`Scan ${r.no}`}
          style={[wide ? st.scanBtn : st.scanBtnSm, expecting && { backgroundColor: T.nav }, !canScan && { opacity: 0.5 }]}>
          <Icon name="qr-code-scanner" size={wide ? 18 : 20} color="#fff" />
          <Text style={wide ? st.scanText : st.scanTextSm}>{expecting ? 'Waiting' : wide ? 'Scan QR' : 'Scan'}</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 8 }} />}
    </View>
  );
}

const Col = ({ label, value, divider }: { label: string; value: string; divider?: boolean }) => (
  <View style={[{ flex: 1, minWidth: 0, paddingLeft: divider ? 8 : 0 }, divider && { borderLeftWidth: 1, borderLeftColor: T.border, marginLeft: 4 }]}>
    <Text style={{ fontSize: 11, color: T.muted, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
    <Text style={[{ fontSize: 14.5, fontWeight: '800', color: T.ink, marginTop: 2 }, tab]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{value}</Text>
  </View>
);

function Tile({ icon, color, label, value, sub, warn, wide, last }: {
  icon: React.ComponentProps<typeof Icon>['name']; color: string; label: string; value: string; sub: string; warn?: boolean; wide: boolean; last?: boolean;
}) {
  return (
    <View style={[{ width: wide ? '25%' : '50%', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 }, !last && wide && { borderRightWidth: 1, borderRightColor: T.border }]}>
      <View style={[st.badge, { backgroundColor: color + '1F' }]}><Icon name={icon} size={20} color={color} /></View>
      <Text style={{ fontSize: 12.5, color: T.muted, fontWeight: '600', marginTop: 6 }}>{label}</Text>
      <Text style={[{ fontSize: 18, fontWeight: '800', color: warn ? T.red : T.ink, marginTop: 2 }, tab]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={{ fontSize: 11.5, color: T.muted, marginTop: 1 }} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

const Info = ({ label, value, last }: { label: string; value?: string; last?: boolean }) => (
  <View style={[{ width: '50%', minWidth: 140, flexGrow: 1, flexBasis: 0, paddingHorizontal: 12, paddingVertical: 4 }, !last && { borderRightWidth: 1, borderRightColor: T.border }]}>
    <Text style={{ fontSize: 12, color: T.muted, fontWeight: '600' }}>{label}</Text>
    <Text style={{ fontSize: 14.5, fontWeight: '800', color: T.ink, marginTop: 2 }} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

/** "B-03-01" → "B-03" (aisle / rack: every part but the last). A one-part location stays as it is. */
function aisleOf(loc: string): string {
  const parts = loc.split(/[-/ ]+/).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('-') : loc;
}

const st = {
  overlay: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: T.bg, zIndex: 10 },
  devBar: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12 },
  navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' as const, justifyContent: 'center' as const },
  badge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  result: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, borderRadius: 12, padding: 12, marginBottom: 12 },
  chip: { borderWidth: 1.5, borderColor: T.border, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: T.surface },
  chipText: { fontSize: 13, fontWeight: '800' as const, color: T.muted },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: T.surface, borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, paddingLeft: 12, paddingRight: 10, marginBottom: 8 },
  tick: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: T.border, alignItems: 'center' as const, justifyContent: 'center' as const },
  rowSide: { width: 44, height: 44, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: T.red + '10' },
  scanBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: T.copper, borderRadius: 12, height: 44, paddingHorizontal: 12 },
  scanText: { color: '#fff', fontSize: 14, fontWeight: '800' as const },
  scanBtnSm: { width: 54, height: 52, borderRadius: 12, backgroundColor: T.copper, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 1 },
  scanTextSm: { color: '#fff', fontSize: 11, fontWeight: '800' as const },
};
