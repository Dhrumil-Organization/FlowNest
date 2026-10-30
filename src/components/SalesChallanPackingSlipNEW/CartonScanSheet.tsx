// FILE: src/components/SalesChallanPackingSlipNEW/CartonScanSheet.tsx
// Carton selection for ONE allocation line — replaces CartonDetail ("Scan data") + its carton help (CartonSelect).
//
//   Line (slip screen)  →  1. LOCATIONS  →  2. CARTONS of one location (or all)
//
//   1. Locations — where the stock of this item / merge / grade / shade is, and what is picked from where:
//   ┌ ← Carton selection · Sr 1 · SO …                                   [Scan QR]* ┐
//   │ Summary   Cartons 5/93 · Net weight 98.0 · Locations 4 · Prod. type LC      │
//   │ ● Hardware scanner ready — scan any carton           Use camera · Type a label │
//   │ Location   Cartons   Net wt.     Selected            ☐                        │
//   │ T-1             4     60.250     2 · 30.100           ◐   ›                    │
//   │ GREY           78   1,200.450    —                    ☐   ›                    │
//   │ Total          93   1,407.750    5 · 98.000                                    │
//   └ [All cartons]                                         [Done · 5 cartons]       ┘
//      tap a location → its cartons · tick → select / unselect every free carton there
//
//   2. Cartons — no scan button per carton: the scanner chosen on the line works on the whole screen.
//      Hardware: always listening — a scanned label is selected straight away (any location).
//      Mobile camera: [Scan QR] in the header opens the camera; a good scan selects and comes back.
//      Tap ○ to pick a carton by hand, tap ✓ to take it off (asks first).
//
// Every selection — scan, hand pick or a whole location — goes through the same checks (rules.pickCarton):
// locked (lock = 1) refused, a carton already on this or another line refused. Cartons already saved on a saved
// line (D1Flag = 1) stay, as on the web. Done is blocked while the selected qty is more than the balance qty or a
// carton is there twice (web handleItemOk).
//
// Cartons come from getcartondetail with limit '' (all cartons of ItmCode + MerCode + GrdCode + ShdCode, like the
// web carton help) and carry the warehouse location (WarehouseLoction).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, Vibration, View, useWindowDimensions } from 'react-native';
import { confirmAsync } from '../ProductionOrderNEW/ui';
import { Btn, LinkBtn, Notice, tab, u } from '../PackingAutomationNEW/ui';
import { apiErrorText } from './api';
import type { Row } from './api';
import { cartonsIssue, cartonsOf, cartonView, matchCarton, n3, pickCarton, qty, sum } from './rules';
import type { ScanResult } from './rules';
import { CameraScanner, HardwareScanner } from './ScanDevices';
import type { ScanDevice } from './ScanDevices';
import { Bar } from './ui';
import { isWeb } from './webWedge';

type Filter = 'all' | 'selected' | 'open' | 'locked';
type View2 = 'locations' | 'cartons';
const PAGE = 60;
const NO_LOC = '(no location)';
const SAVED = 'Saved earlier'; // saved on this line before, location not known any more (no longer in stock)

// Carton no. → warehouse location, kept for the app session. A carton that is on this slip is no longer returned by
// getcartondetail, so after Done (or a save) its location would be lost — this keeps it under the right location.
const LOC_CACHE = new Map<string, string>();

type ListRow = { key: string; no: string; qty: number; chees: string; location: string; prodType: string; lot: string;
  locked: boolean; lockReason: string; selected: boolean; savedOnly: boolean; elsewhere: boolean; manual?: boolean };

type LocRow = { name: string; total: number; qty: number; free: number; locked: number; elsewhere: number; sel: number; selQty: number; removable: number };

const locOf = (r: { location: string; savedOnly?: boolean }) => r.location || (r.savedOnly ? SAVED : NO_LOC);
const rank = (x: string) => (x === SAVED ? 2 : x === NO_LOC ? 1 : 0);
const byLoc = (a: string, b: string) => rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true });

export default function CartonScanSheet({ open, row, d2, uid, device: startDevice, loadCartons, onDone, onClose }: {
  open: boolean; row: Row | null; d2: Row[]; uid: any; device: ScanDevice;
  loadCartons: (row: Row) => Promise<Row[]>; onDone: (srNo: any, cartons: Row[]) => void; onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  // Same breakpoints in the browser (responsive / handheld Chrome) and in the APK / iOS app — both report the
  // window width here: phone < 560 · tablet 560–719 · wide ≥ 720.
  const wide = width >= 720;
  const phone = width < 560;
  const [list, setList] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [scanned, setScanned] = useState<Row[]>([]);
  const [device, setDevice] = useState<ScanDevice>(startDevice);
  const [view, setView] = useState<View2>('locations');
  const [loc, setLoc] = useState<string | null>(null); // cartons view: one location, or null = all
  const [overlay, setOverlay] = useState(false); // camera / type-a-label screen
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [last, setLast] = useState<(ScanResult & { at: number }) | null>(null); // last good selection
  const [miss, setMiss] = useState<(ScanResult & { at: number }) | null>(null); // last refused scan / pick
  const [manual, setManual] = useState<Set<string>>(new Set()); // carton nos. picked by hand
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
    try {
      const got = await loadCartons(row);
      got.forEach((r) => { const v = cartonView(r); if (v.no && v.location) LOC_CACHE.set(v.no, v.location); });
      setList(got);
    } catch (e) { setList([]); setErr(apiErrorText(e, 'Cartons could not be loaded.')); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (!open || !row) return;
    setScanned(initial); setLast(null); setMiss(null); setText(''); setDoneErr(''); setDevice(startDevice); setTyping(false);
    setOverlay(false); setView('locations'); setLoc(null); setManual(new Set()); setFilter('all'); setQ(''); setLimit(PAGE);
    fetch();
  }, [open, row]); // eslint-disable-line react-hooks/exhaustive-deps

  // Browser + mobile camera: nothing listens for a hardware scanner, and its Enter / Tab suffix would "click" the
  // focused button (Back → closes the screen). Swallow them. (Hardware mode: the scanner bar handles them.)
  useEffect(() => {
    if (!isWeb || !open || overlay || device === 'hardware') return undefined;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, overlay, device]);

  /* ---------- list = stock cartons + cartons already on this line that the stock call no longer returns ---------- */
  const rows: ListRow[] = useMemo(() => {
    const picked = new Set(scanned.map((c) => String(c.CartNo)));
    const elsewhere = new Set(others.map((c) => String(c.CartNo)));
    const out: ListRow[] = list.map((r) => {
      const v = cartonView(r);
      return { key: `s-${v.no}`, no: v.no, qty: v.qty, chees: v.chees, location: v.location, prodType: v.prodType, lot: v.lot,
        locked: v.locked, lockReason: v.lockReason, selected: picked.has(v.no), savedOnly: false,
        elsewhere: !picked.has(v.no) && elsewhere.has(v.no), manual: manual.has(v.no) && picked.has(v.no) };
    });
    const inStock = new Set(out.map((r) => r.no));
    scanned.filter((c) => !inStock.has(String(c.CartNo))).forEach((c) => out.push({
      key: `p-${c.CartNo}`, no: String(c.CartNo), qty: n3(c.QtyWt), chees: String(c.Chees ?? ''), location: String(c.WarehouseLoction || LOC_CACHE.get(String(c.CartNo)) || ''),
      prodType: String(c.ProdType ?? ''), lot: String(c.LotNo ?? ''), locked: false, lockReason: '', selected: true, savedOnly: true, elsewhere: false,
    }));
    return out.sort((a, b) => byLoc(locOf(a), locOf(b)) || a.no.localeCompare(b.no, undefined, { numeric: true }));
  }, [list, scanned, manual, others]);

  const canRemove = (no: string) => !(String(row?.D1Flag) === '1') || !initial.some((c) => String(c.CartNo) === no);

  /* ---------- locations ---------- */
  const locations: LocRow[] = useMemo(() => {
    const map = new Map<string, LocRow>();
    rows.forEach((r) => {
      const k = locOf(r);
      const l = map.get(k) || { name: k, total: 0, qty: 0, free: 0, locked: 0, elsewhere: 0, sel: 0, selQty: 0, removable: 0 };
      l.total += 1; l.qty += r.qty;
      if (r.locked) l.locked += 1;
      if (r.elsewhere) l.elsewhere += 1;
      if (r.selected) { l.sel += 1; l.selQty += r.qty; if (canRemove(r.no)) l.removable += 1; } else if (!r.locked && !r.elsewhere) l.free += 1;
      map.set(k, l);
    });
    return Array.from(map.values()).sort((a, b) => byLoc(a.name, b.name));
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- cartons view: location + chip + search ---------- */
  const inLoc = useMemo(() => (loc == null ? rows : rows.filter((r) => locOf(r) === loc)), [rows, loc]);
  const counts = useMemo(() => ({
    all: inLoc.length,
    selected: inLoc.filter((r) => r.selected).length,
    open: inLoc.filter((r) => !r.selected && !r.locked && !r.elsewhere).length,
    locked: inLoc.filter((r) => r.locked).length,
  }), [inLoc]);
  const shown = useMemo(() => {
    const s = q.trim().toUpperCase();
    return inLoc.filter((r) => {
      if (filter === 'selected' && !r.selected) return false;
      if (filter === 'open' && (r.selected || r.locked || r.elsewhere)) return false;
      if (filter === 'locked' && !r.locked) return false;
      return !s || `${r.no} ${r.location} ${r.lot} ${r.prodType}`.toUpperCase().includes(s);
    });
  }, [inLoc, filter, q]);
  const hidden = counts[filter] - shown.length;

  if (!row) return null;

  const target = n3(row.BQty);
  const sQty = sum(scanned, 'QtyWt');
  const over = n3(sQty) > target;
  const dirty = scanned.length !== initial.length || scanned.some((c, i) => c !== initial[i]);
  const ready = !busy && list.length > 0;
  const selRows = rows.filter((r) => r.selected);
  const types = Array.from(new Set((selRows.length ? selRows : rows).map((r) => r.prodType).filter(Boolean)));
  const selLocs = locations.filter((l) => l.sel > 0).length;
  const totals = locations.reduce((a, l) => ({ total: a.total + l.total, qty: a.qty + l.qty, sel: a.sel + l.sel, selQty: a.selQty + l.selQty }), { total: 0, qty: 0, sel: 0, selQty: 0 });
  const curLoc = loc == null ? null : locations.find((l) => l.name === loc) || null;

  /* ---------- selecting ---------- */
  const good = (r: ScanResult) => { setLast({ ...r, at: Date.now() }); setMiss(null); setDoneErr(''); Vibration.vibrate(40); };
  const fail = (r: ScanResult) => { setMiss({ ...r, at: Date.now() }); Vibration.vibrate([0, 120, 80, 120]); };

  /** A scanned label (hardware, camera or typed) — any carton of this line, whatever location is open. */
  const read = (raw: string) => {
    const code = String(raw || '').trim();
    if (!code || busy) return;
    const res = matchCarton(code, { list, scanned, others, srNo, uid });
    setText('');
    if (res.status === 'added' && res.carton) {
      setScanned((s) => [...s, res.carton as Row]);
      good(res);
      setOverlay(false); setTyping(false); // camera / typed: back to the list
    } else fail(res);
  };

  /** Pick by hand — same checks as a scan, minus reading the label. */
  const pick = (no: string) => {
    if (busy) return;
    const src = list.find((r) => String(r.cartno) === no);
    if (!src) return;
    const res = pickCarton(src, { scanned, others, srNo, uid });
    if (res.status === 'added' && res.carton) {
      setScanned((s) => [...s, res.carton as Row]);
      setManual((m) => new Set(m).add(no));
      good({ ...res, message: `${res.message} · picked by hand` });
    } else fail(res);
  };

  const unpick = async (no: string) => {
    if (!canRemove(no)) return;
    const c = scanned.find((x) => String(x.CartNo) === no);
    if (!c) return;
    if (await confirmAsync('Remove carton?', `${c.CartNo} (${qty(c.QtyWt)}) comes off this line.`, 'Remove', true)) {
      setScanned((s) => s.filter((x) => x !== c));
      setManual((m) => { const n = new Set(m); n.delete(no); return n; });
      setLast(null); setMiss(null); setDoneErr('');
    }
  };

  /** Location tick: select every free carton there — or, when all are selected, take them off. */
  const tickLocation = async (l: LocRow) => {
    if (!ready) return;
    if (l.free === 0) {
      if (!l.removable) return;
      if (!(await confirmAsync(`Unselect ${l.name}?`, `${l.removable} carton(s) from ${l.name} come off this line.`, 'Unselect all', true))) return;
      const nos = new Set(rows.filter((r) => locOf(r) === l.name && r.selected && canRemove(r.no)).map((r) => r.no));
      setScanned((s) => s.filter((c) => !nos.has(String(c.CartNo))));
      setManual((m) => { const n = new Set(m); nos.forEach((x) => n.delete(x)); return n; });
      setLast(null); setMiss(null); setDoneErr('');
      return;
    }
    const free = list.filter((r) => {
      const v = cartonView(r);
      return locOf(v) === l.name && !v.locked && !scanned.some((c) => String(c.CartNo) === v.no) && !others.some((c) => String(c.CartNo) === v.no);
    });
    const addQty = free.reduce((a, r) => a + n3(cartonView(r).qty), 0);
    if (n3(sQty + addQty) > target
      && !(await confirmAsync(`Select all of ${l.name}?`, `${free.length} carton(s), ${qty(addQty)}. That takes the selection to ${qty(sQty + addQty)}, over the balance ${qty(target)} — Done stays blocked until you take some off.`, 'Select all'))) return;
    let acc = scanned.slice();
    const added: string[] = [];
    free.forEach((src) => {
      const res = pickCarton(src, { scanned: acc, others, srNo, uid });
      if (res.status === 'added' && res.carton) { acc = [...acc, res.carton]; added.push(String(src.cartno)); }
    });
    if (!added.length) return;
    setScanned(acc);
    setManual((m) => { const n = new Set(m); added.forEach((x) => n.add(x)); return n; });
    good({ status: 'added', message: `${added.length} carton(s) from ${l.name} selected by hand · ${qty(addQty)}` });
  };

  /* ---------- navigation ---------- */
  const openLocation = (name: string | null) => {
    setLoc(name); setView('cartons'); setFilter('all'); setQ(''); setLimit(PAGE);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const toLocations = () => { setView('locations'); setQ(''); setFilter('all'); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const openOverlay = (type: boolean) => { setTyping(type); setMiss(null); setOverlay(true); };
  const closeOverlay = () => { setOverlay(false); setTyping(false); };
  const changeDevice = () => { setDevice((d) => (d === 'hardware' ? 'camera' : 'hardware')); setMiss(null); };

  const close = async () => {
    if (overlay) { closeOverlay(); return; } // Android back: camera → list → locations → leave
    if (view === 'cartons') { toLocations(); return; }
    if (dirty && !(await confirmAsync('Leave without adding?', 'Cartons selected now will not be added to the packing slip.', 'Leave'))) return;
    onClose();
  };
  const done = () => {
    const issue = cartonsIssue(row, scanned, others);
    if (issue) { setDoneErr(issue); Vibration.vibrate([0, 120, 80, 120]); return; }
    onDone(srNo, scanned);
  };

  /* ---------- shared blocks ---------- */
  const title = view === 'locations' ? 'Carton selection' : loc == null ? 'All cartons' : `Location ${loc}`;
  const subtitle = view === 'locations'
    ? `Sr ${srNo} · ${row.SONo ? `SO ${row.SONo} · ` : ''}choose a location`
    : curLoc ? `${curLoc.total} cartons · ${qty(curLoc.qty)} · ${curLoc.sel} selected` : `${totals.total} cartons · ${scanned.length} selected`;

  const scannerBar = (
    <View style={{ marginBottom: 10 }}>
      {device === 'hardware' ? (
        overlay ? null : <HardwareScanner onScan={read} enabled={ready} compact />
      ) : (
        <View style={st.camBar}>
          <Icon name="photo-camera" size={20} color="#fff" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.camBarTitle} numberOfLines={1}>Mobile camera</Text>
            <Text style={st.camBarText} numberOfLines={1}>{ready ? 'Tap Scan QR, point at any carton label' : 'Loading cartons…'}</Text>
          </View>
          <TouchableOpacity onPress={() => openOverlay(false)} disabled={!ready} accessibilityRole="button" accessibilityLabel="Scan QR"
            style={[st.camBarBtn, !ready && { opacity: 0.5 }]}>
            <Icon name="qr-code-scanner" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>Scan QR</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        <LinkBtn label={device === 'hardware' ? 'Use mobile camera' : 'Use hardware scanner'} icon="swap-horiz" onPress={changeDevice} />
        <LinkBtn label="Type a label" icon="keyboard" onPress={() => openOverlay(true)} />
      </View>
    </View>
  );

  const strips = (
    <>
      {miss ? (
        <View key={`m${miss.at}`} accessibilityLiveRegion="assertive" style={[st.result, { backgroundColor: miss.status === 'duplicate' ? T.amber : T.red }]}>
          <Icon name={miss.status === 'locked' ? 'lock' : miss.status === 'notfound' ? 'cancel' : 'error-outline'} size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
              {miss.status === 'duplicate' ? 'Already selected' : miss.status === 'locked' ? 'Locked carton' : 'Not found'}
            </Text>
            <Text style={[{ color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 1 }, tab]}>{miss.message}</Text>
          </View>
          <TouchableOpacity onPress={() => setMiss(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss"><Icon name="close" size={18} color="#fff" /></TouchableOpacity>
        </View>
      ) : last ? (
        <View key={`l${last.at}`} accessibilityLiveRegion="polite" style={[st.result, { backgroundColor: T.green }]}>
          <Icon name="check-circle" size={22} color="#fff" />
          <Text style={[{ flex: 1, color: '#fff', fontSize: 14.5, fontWeight: '800' }, tab]} numberOfLines={2}>
            {last.carton && last.source
              ? [`${last.carton.CartNo} selected${/picked by hand$/.test(last.message) ? ' by hand' : ''}`, qty(last.carton.QtyWt), cartonView(last.source).location].filter(Boolean).join(' · ')
              : last.message}
          </Text>
          <TouchableOpacity onPress={() => setLast(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss"><Icon name="close" size={18} color="#fff" /></TouchableOpacity>
        </View>
      ) : null}
      {doneErr ? <Notice tone="err" text={doneErr} /> : null}
    </>
  );

  return (
    <Modal visible={open} animationType="slide" onRequestClose={close} presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        {/* ---------- app bar ---------- */}
        <View style={st.appBar}>
          <TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel={view === 'cartons' ? 'Back to locations' : 'Back'} style={st.navBtn}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800' }} numberOfLines={1}>{title}</Text>
            <Text style={[{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' }, tab]} numberOfLines={1}>{subtitle}</Text>
          </View>
          {device === 'camera' ? (
            <TouchableOpacity onPress={() => openOverlay(false)} disabled={!ready} accessibilityRole="button" accessibilityLabel="Open camera"
              style={{ alignItems: 'center', paddingHorizontal: 6, opacity: ready ? 1 : 0.5 }}>
              <Icon name="qr-code-scanner" size={28} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 2 }}>Scan QR</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: phone ? 12 : 14, paddingBottom: 24, alignItems: 'center' }} keyboardShouldPersistTaps="always">
          <View style={{ width: '100%', maxWidth: 900 }}>
            {view === 'locations' ? (
              <>
                {/* ---------- summary ---------- */}
                <View style={[u.card, { padding: 0, overflow: 'hidden' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: T.sub }}>
                    <View style={[st.badge, { backgroundColor: '#F2A93B' }]}><Icon name="list-alt" size={18} color="#fff" /></View>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: T.ink }}>Summary</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 12 }}>
                    <Tile icon="inventory-2" color={T.copper} label="No. of cartons" value={String(scanned.length)} sub={`of ${parseInt(row.TotCarton, 10) || rows.length} (selected)`} wide={wide} phone={phone} />
                    <Tile icon="scale" color={T.blue} label="Net weight" value={qty(sQty)} sub={`of ${qty(target)} bal.`} warn={over} wide={wide} phone={phone} />
                    <Tile icon="place" color={T.green} label="Locations" value={String(locations.length || '—')} sub={selLocs ? `${selLocs} with selected` : 'in stock'} wide={wide} phone={phone} />
                    <Tile icon="settings-suggest" color="#8B5CF6" label="Production type" value={types.join(', ') || '—'} sub={types.length > 1 ? 'mixed' : ' '} wide={wide} phone={phone} last />
                  </View>
                  <View style={{ marginHorizontal: 14, marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: T.blue + '12', borderRadius: 12, paddingVertical: 10 }}>
                    <Info label="Item name" value={row.ItmName} phone={phone} />
                    <Info label="Merge name" value={row.MerName} phone={phone} last={phone} />
                    <Info label="Shade name" value={row.ShdName} phone={phone} />
                    <Info label="Grade" value={row.GrdName} phone={phone} last />
                  </View>
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                    <Bar value={target ? sQty / target : 0} tone={over ? 'red' : 'green'} height={8} />
                    {over ? <Text style={{ color: T.red, fontSize: 12.5, fontWeight: '700', marginTop: 6 }}>Selected {qty(sQty)} is more than the balance {qty(target)} — take a carton off.</Text> : null}
                  </View>
                </View>

                {scannerBar}
                {strips}

                {/* ---------- locations ---------- */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: T.ink }}>Locations</Text>
                  <Text style={[u.hint, { marginTop: 0 }]}>Tap a location to see its cartons</Text>
                </View>
                {err ? <Notice tone="err" text={err} action={{ label: 'Retry', onPress: fetch }} /> : null}
                {busy ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, justifyContent: 'center' }}>
                    <ActivityIndicator color={T.copper} />
                    <Text style={[u.hint, { marginTop: 0 }]}>Loading cartons in stock…</Text>
                  </View>
                ) : !rows.length && !err ? (
                  <Notice tone="info" text="No cartons in stock for this item, merge, grade and shade." />
                ) : (
                  <View style={[u.card, { padding: 0, overflow: 'hidden' }]}>
                    {!phone ? (
                      <View style={[st.locRow, { backgroundColor: T.sub, paddingVertical: 10, borderTopWidth: 0 }]}>
                        <Text style={[st.th, { flex: 1.4 }]}>Location</Text>
                        <Text style={[st.th, st.num]}>Cartons</Text>
                        <Text style={[st.th, st.num, { flex: 1.2 }]}>Net wt.</Text>
                        <Text style={[st.th, st.num, { flex: 1.4 }]}>Selected</Text>
                        <Text style={[st.th, { width: 92, textAlign: 'center' }]}>Select all</Text>
                      </View>
                    ) : null}
                    {locations.map((l, i) => (
                      <LocationRow key={l.name} l={l} phone={phone} first={phone && i === 0} disabled={!ready}
                        onOpen={() => openLocation(l.name)} onTick={() => tickLocation(l)} />
                    ))}
                    <View style={[st.locRow, { backgroundColor: T.nav + '0D' }]}>
                      {phone ? (
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '900', color: T.ink }}>Total · {totals.total} cartons</Text>
                          <Text style={[{ fontSize: 13, fontWeight: '700', color: T.muted, marginTop: 2 }, tab]}>
                            {qty(totals.qty)} in stock · <Text style={{ color: T.green }}>{totals.sel} selected · {qty(totals.selQty)}</Text>
                          </Text>
                        </View>
                      ) : (
                        <>
                          <Text style={[st.td, { flex: 1.4, fontWeight: '900' }]}>Total</Text>
                          <Text style={[st.td, st.num, { fontWeight: '900' }, tab]}>{totals.total}</Text>
                          <Text style={[st.td, st.num, { flex: 1.2, fontWeight: '900' }, tab]}>{qty(totals.qty)}</Text>
                          <Text style={[st.td, st.num, { flex: 1.4, fontWeight: '900', color: totals.sel ? T.green : T.muted }, tab]}>{totals.sel ? `${totals.sel} · ${qty(totals.selQty)}` : '—'}</Text>
                          <View style={{ width: 92 }} />
                        </>
                      )}
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                {scannerBar}
                {strips}

                {/* ---------- carton list (one location, or all) ---------- */}
                <View style={[u.field, { minHeight: 46, marginBottom: 8 }]}>
                  <Icon name="search" size={20} color={T.muted} />
                  <TextInput value={q} onChangeText={(t) => { setQ(t); setLimit(PAGE); }} placeholder={loc == null ? 'Carton no., location or lot' : 'Carton no. or lot'} placeholderTextColor={T.muted}
                    autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Find carton"
                    style={[u.input, { fontSize: 15, minHeight: 40, paddingVertical: 6, minWidth: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} />
                  {q ? <TouchableOpacity onPress={() => setQ('')} hitSlop={10}><Icon name="close" size={18} color={T.muted} /></TouchableOpacity> : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
                  {([['all', 'All'], ['selected', 'Selected'], ['open', 'To pick'], ['locked', 'Locked']] as const).map(([k, l]) => (
                    <Pressable key={k} onPress={() => { setFilter(k); setLimit(PAGE); if (k === 'selected') setQ(''); }} accessibilityRole="button"
                      style={[st.chip, filter === k && { borderColor: T.copper, backgroundColor: T.copper + '14' }]}>
                      <Text style={[st.chipText, filter === k && { color: T.copper }]}>{l} · {counts[k]}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {q.trim() && hidden > 0 ? (
                  <View style={st.hiddenBar}>
                    <Icon name="filter-alt" size={16} color={T.amber} />
                    <Text style={[{ flex: 1, fontSize: 12.5, fontWeight: '700', color: T.ink }, tab]} numberOfLines={2}>
                      Showing {shown.length} of {counts[filter]} — search “{q.trim()}” hides {hidden}
                    </Text>
                    <TouchableOpacity onPress={() => setQ('')} hitSlop={8} accessibilityRole="button">
                      <Text style={{ color: T.copper, fontWeight: '800', fontSize: 13 }}>Clear search</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {!shown.length ? <Notice tone="info" text="No carton matches this filter." /> : null}

                {shown.slice(0, limit).map((r) => (
                  <CartonRow key={r.key} r={r} wide={wide} phone={phone} showLoc={loc == null} canRemove={canRemove(r.no)} canPick={ready}
                    onPick={() => pick(r.no)} onRemove={() => unpick(r.no)} />
                ))}
                {shown.length > limit ? (
                  <Btn kind="ghost" label={`Show ${Math.min(PAGE, shown.length - limit)} more · ${shown.length - limit} left`} onPress={() => setLimit((l) => l + PAGE)} />
                ) : null}
              </>
            )}
          </View>
        </ScrollView>

        {/* ---------- footer ---------- */}
        <View style={st.footer}>
          <View style={{ width: '100%', maxWidth: 900, flexDirection: 'row', gap: 10 }}>
            {view === 'locations' ? (
              <>
                <Btn kind="ghost" icon="list" label="All cartons" onPress={() => openLocation(null)} disabled={!rows.length} />
                {/* the only way back to the slip with the selection */}
                <Btn flex kind="copper" icon="check" label={`Back to slip · ${scanned.length} carton${scanned.length === 1 ? '' : 's'}`} onPress={done} />
              </>
            ) : (
              // a location's cartons: Done goes back to the location summary, never to the slip
              <Btn flex kind="copper" icon="check" label={`Done · ${curLoc ? `${curLoc.sel} in ${curLoc.name}` : `${scanned.length} selected`}`} onPress={toLocations} />
            )}
          </View>
        </View>

        {/* ---------- camera / type a label (over the list, same Modal — no nested modal / focus trap on web) ---------- */}
        {overlay ? (
          <View style={st.overlay}>
            <View style={st.appBar}>
              <TouchableOpacity onPress={closeOverlay} accessibilityRole="button" accessibilityLabel="Close scanner" style={st.navBtn}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800' }} numberOfLines={1}>{typing ? 'Type a label' : 'Scan any carton'}</Text>
                <Text style={[{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' }, tab]} numberOfLines={1}>
                  {scanned.length} selected · {qty(sQty)} of {qty(target)}
                </Text>
              </View>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, alignItems: 'center' }} keyboardShouldPersistTaps="always">
              <View style={{ width: '100%', maxWidth: 640, gap: 12 }}>
                {typing ? (
                  <View style={u.field}>
                    <Icon name="keyboard" size={22} color={T.muted} />
                    <TextInput value={text} onChangeText={setText} onSubmitEditing={() => read(text)} blurOnSubmit={false} autoFocus
                      autoCorrect={false} autoCapitalize="none" placeholder="Type or paste the label" placeholderTextColor={T.muted} accessibilityLabel="Carton label"
                      style={[u.input, { fontSize: 15, fontWeight: '600', minWidth: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} />
                    <Btn label="Add" onPress={() => read(text)} disabled={!text} style={{ height: 40, paddingHorizontal: 16 }} />
                  </View>
                ) : (
                  <CameraScanner onScan={read} enabled={ready} onRefused={() => { setDevice('hardware'); closeOverlay(); }} />
                )}
                {miss ? (
                  <View key={miss.at} accessibilityLiveRegion="assertive" style={[st.result, { marginBottom: 0, backgroundColor: miss.status === 'duplicate' ? T.amber : T.red }]}>
                    <Icon name={miss.status === 'locked' ? 'lock' : miss.status === 'notfound' ? 'cancel' : 'error-outline'} size={22} color="#fff" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                        {miss.status === 'duplicate' ? 'Already selected' : miss.status === 'locked' ? 'Locked carton' : 'Not found'}
                      </Text>
                      <Text style={[{ color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 1 }, tab]}>{miss.message} Scan again.</Text>
                    </View>
                  </View>
                ) : null}
                {device === 'camera' ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <LinkBtn label={typing ? 'Back to camera' : 'Type a label'} icon={typing ? 'photo-camera' : 'keyboard'} onPress={() => setTyping((t) => !t)} />
                  </View>
                ) : null}
              </View>
            </ScrollView>
            <View style={st.footer}>
              <View style={{ width: '100%', maxWidth: 640 }}>
                <Btn kind="ghost" icon="arrow-back" label={view === 'locations' ? 'Back to locations' : 'Back to cartons'} onPress={closeOverlay} />
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

/* ------------------------------ pieces ------------------------------ */

function LocationRow({ l, phone, first, disabled, onOpen, onTick }: {
  l: LocRow; phone: boolean; first: boolean; disabled: boolean; onOpen: () => void; onTick: () => void;
}) {
  const all = l.sel > 0 && l.free === 0;
  const part = l.sel > 0 && l.free > 0;
  const canTick = !disabled && (l.free > 0 || l.removable > 0);
  const tick = (
    <TouchableOpacity onPress={onTick} disabled={!canTick} hitSlop={8} accessibilityRole="checkbox"
      accessibilityState={{ checked: all ? true : part ? 'mixed' : false, disabled: !canTick }}
      accessibilityLabel={all ? `Unselect all in ${l.name}` : `Select all in ${l.name}`}
      style={[st.locTick, all && { backgroundColor: T.green, borderColor: T.green }, part && { borderColor: T.green }, !canTick && { opacity: 0.4 }]}>
      {all ? <Icon name="done-all" size={18} color="#fff" /> : part ? <Icon name="remove" size={18} color={T.green} /> : null}
    </TouchableOpacity>
  );
  const sel = l.sel ? `${l.sel} · ${qty(l.selQty)}` : '—';
  if (phone) {
    return (
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${l.name}`}
        style={({ pressed }) => [st.locRow, first && { borderTopWidth: 0 }, l.sel > 0 && { backgroundColor: T.green + '0D' }, pressed && { backgroundColor: T.sub }]}>
        {tick}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="place" size={16} color={T.green} />
            <Text style={{ fontSize: 16, fontWeight: '900', color: T.ink, flexShrink: 1 }} numberOfLines={1}>{l.name}</Text>
          </View>
          <Text style={[{ fontSize: 13, fontWeight: '700', color: T.muted, marginTop: 3 }, tab]} numberOfLines={1}>
            {l.total} cartons · {qty(l.qty)}{l.locked ? ` · ${l.locked} locked` : ''}{l.elsewhere ? ` · ${l.elsewhere} on other lines` : ''}
          </Text>
          {l.sel ? (
            <Text style={[{ alignSelf: 'flex-start', marginTop: 5, fontSize: 12, fontWeight: '800', color: T.green, backgroundColor: T.green + '18', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }, tab]}>
              {l.sel} selected · {qty(l.selQty)}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-right" size={26} color={T.muted} />
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${l.name}`}
      style={({ pressed }) => [st.locRow, l.sel > 0 && { backgroundColor: T.green + '0D' }, pressed && { backgroundColor: T.sub }]}>
      <View style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <Icon name="place" size={16} color={T.green} />
        <Text style={[st.td, { fontWeight: '900', flexShrink: 1 }]} numberOfLines={1}>{l.name}</Text>
      </View>
      <View style={[st.num, { flex: 1 }]}>
        <Text style={[st.td, { textAlign: 'right' }, tab]}>{l.total}</Text>
        {l.locked ? <Text style={{ fontSize: 11, color: T.muted, textAlign: 'right' }}>{l.locked} locked</Text> : null}
        {l.elsewhere ? <Text style={{ fontSize: 11, color: T.muted, textAlign: 'right' }}>{l.elsewhere} on other lines</Text> : null}
      </View>
      <Text style={[st.td, st.num, { flex: 1.2 }, tab]}>{qty(l.qty)}</Text>
      <Text style={[st.td, st.num, { flex: 1.4, color: l.sel ? T.green : T.muted }, tab]}>{sel}</Text>
      <View style={{ width: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        {tick}
        <Icon name="chevron-right" size={24} color={T.muted} />
      </View>
    </Pressable>
  );
}

function CartonRow({ r, wide, phone, showLoc, canRemove, canPick, onPick, onRemove }: {
  r: ListRow; wide: boolean; phone: boolean; showLoc: boolean; canRemove: boolean; canPick: boolean; onPick: () => void; onRemove: () => void;
}) {
  const blocked = r.locked || r.elsewhere;
  const press = r.selected ? (canRemove ? onRemove : undefined) : blocked ? undefined : onPick;
  const disabled = !press || (!r.selected && !canPick);
  const extra = [r.chees && `${r.chees} chees`, r.prodType, r.lot && `Lot ${r.lot}`].filter(Boolean).join(' · ');
  const note = r.locked ? `Locked${r.lockReason ? `: ${r.lockReason}` : ''}` : r.elsewhere ? 'Already on another line of this slip' : '';
  return (
    // The whole row is the tick: tap ○ (or the row) to pick by hand, tap ✓ to take it off.
    <Pressable onPress={press} disabled={disabled} accessibilityRole="checkbox"
      accessibilityState={{ checked: r.selected, disabled: !!disabled }} accessibilityLabel={r.selected ? `Unselect ${r.no}` : `Pick ${r.no}`}
      style={({ pressed }) => [st.row, phone && { paddingVertical: 10 }, { borderColor: r.selected ? T.green : T.border },
        r.selected && { backgroundColor: T.green + '10' }, blocked && { backgroundColor: T.sub }, pressed && !disabled && { opacity: 0.85 }]}>
      <View style={[st.tick, r.selected && { backgroundColor: T.green, borderColor: T.green }, !r.selected && !blocked && { borderColor: T.copper }]}>
        {r.selected ? <Icon name="check" size={18} color="#fff" /> : r.locked ? <Icon name="lock" size={15} color={T.muted} /> : r.elsewhere ? <Icon name="block" size={15} color={T.muted} /> : null}
      </View>
      {phone ? (
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[{ fontSize: 16, fontWeight: '800', color: T.ink }, tab]} numberOfLines={1}>{r.no}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4, marginTop: 4 }}>
            <View style={st.fact}>
              <Icon name="scale" size={14} color={T.muted} />
              <Text style={[st.factText, tab]}>{qty(r.qty)}</Text>
            </View>
            {showLoc ? (
              <View style={[st.fact, st.locPill]}>
                <Icon name="place" size={14} color={T.green} />
                <Text style={[st.factText, { color: T.green }]} numberOfLines={1}>{r.location || '—'}</Text>
              </View>
            ) : null}
            {extra ? <Text style={[u.code, tab]} numberOfLines={1}>{extra}</Text> : null}
          </View>
          {note ? <Text style={{ color: T.red, fontSize: 12, fontWeight: '700', marginTop: 4 }} numberOfLines={2}>{note}</Text> : null}
          {r.savedOnly ? <Text style={[u.code, { marginTop: 2 }]}>Saved on this line</Text> : null}
          {r.manual ? <Text style={st.manualTag}>Picked by hand</Text> : null}
        </View>
      ) : (
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row' }}>
            <Col label="Carton no." value={r.no} grow={1.6} />
            <Col label="Net wt." value={qty(r.qty)} divider />
            {showLoc ? <Col label="Location" value={r.location || '—'} divider /> : null}
            {wide || !showLoc ? <Col label="Chees · type" value={[r.chees, r.prodType].filter(Boolean).join(' · ') || '—'} divider /> : null}
            {wide ? <Col label="Lot" value={r.lot || '—'} divider /> : null}
          </View>
          {note ? <Text style={{ color: T.red, fontSize: 12, fontWeight: '700', marginTop: 4 }} numberOfLines={2}>{note}</Text> : null}
          {r.savedOnly ? <Text style={[u.code, { marginTop: 2 }]}>Saved on this line</Text> : null}
          {r.manual ? <Text style={st.manualTag}>Picked by hand</Text> : null}
        </View>
      )}
      {r.selected && canRemove ? (
        <TouchableOpacity onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${r.no}`} hitSlop={6} style={st.rowSide}>
          <Icon name="close" size={20} color={T.red} />
        </TouchableOpacity>
      ) : null}
    </Pressable>
  );
}

const Col = ({ label, value, divider, grow = 1 }: { label: string; value: string; divider?: boolean; grow?: number }) => (
  <View style={[{ flex: grow, minWidth: 0, paddingLeft: divider ? 8 : 0 }, divider && { borderLeftWidth: 1, borderLeftColor: T.border, marginLeft: 4 }]}>
    <Text style={{ fontSize: 11, color: T.muted, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
    <Text style={[{ fontSize: 14.5, fontWeight: '800', color: T.ink, marginTop: 2 }, tab]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{value}</Text>
  </View>
);

function Tile({ icon, color, label, value, sub, warn, wide, phone, last }: {
  icon: React.ComponentProps<typeof Icon>['name']; color: string; label: string; value: string; sub: string; warn?: boolean; wide: boolean; phone?: boolean; last?: boolean;
}) {
  if (phone) {
    // Phone: icon beside the text — half the height of the stacked tile, so the carton list starts sooner.
    return (
      <View style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
        <View style={[st.badge, { width: 30, height: 30, backgroundColor: color + '1F' }]}><Icon name={icon} size={17} color={color} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11.5, color: T.muted, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
          <Text style={[{ fontSize: 16, fontWeight: '800', color: warn ? T.red : T.ink }, tab]} numberOfLines={1}>{value}</Text>
          {sub.trim() ? <Text style={{ fontSize: 11, color: T.muted }} numberOfLines={1}>{sub}</Text> : null}
        </View>
      </View>
    );
  }
  return (
    <View style={[{ width: wide ? '25%' : '50%', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 }, !last && wide && { borderRightWidth: 1, borderRightColor: T.border }]}>
      <View style={[st.badge, { backgroundColor: color + '1F' }]}><Icon name={icon} size={20} color={color} /></View>
      <Text style={{ fontSize: 12.5, color: T.muted, fontWeight: '600', marginTop: 6 }}>{label}</Text>
      <Text style={[{ fontSize: 18, fontWeight: '800', color: warn ? T.red : T.ink, marginTop: 2 }, tab]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={{ fontSize: 11.5, color: T.muted, marginTop: 1 }} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

const Info = ({ label, value, last, phone }: { label: string; value?: string; last?: boolean; phone?: boolean }) => (
  <View style={[phone ? { width: '50%', paddingHorizontal: 10, paddingVertical: 4 } : { width: '50%', minWidth: 140, flexGrow: 1, flexBasis: 0, paddingHorizontal: 12, paddingVertical: 4 },
    !last && { borderRightWidth: 1, borderRightColor: T.border }]}>
    <Text style={{ fontSize: 12, color: T.muted, fontWeight: '600' }}>{label}</Text>
    <Text style={{ fontSize: 14.5, fontWeight: '800', color: T.ink, marginTop: 2 }} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

const st = {
  appBar: { backgroundColor: T.nav, paddingTop: Platform.OS === 'ios' ? 52 : 14, paddingBottom: 14, paddingHorizontal: 12, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 14, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 14, alignItems: 'center' as const },
  camBar: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: T.nav, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  camBarTitle: { color: '#fff', fontSize: 12.5, fontWeight: '900' as const },
  camBarText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' as const, marginTop: 1 },
  camBarBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: T.copper },
  locRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: T.border, minHeight: 56 },
  th: { fontSize: 12, fontWeight: '800' as const, color: T.muted, flex: 1 },
  td: { fontSize: 15, fontWeight: '700' as const, color: T.ink },
  num: { flex: 1, textAlign: 'right' as const },
  locTick: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: T.copper, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: T.surface },
  manualTag: { alignSelf: 'flex-start' as const, marginTop: 4, fontSize: 11, fontWeight: '800' as const, color: T.amber, backgroundColor: T.amber + '1A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' as const },
  fact: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  factText: { fontSize: 14, fontWeight: '800' as const, color: T.ink },
  locPill: { backgroundColor: T.green + '14', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, maxWidth: '100%' as const },
  hiddenBar: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, backgroundColor: T.amber + '14', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 8 },
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
