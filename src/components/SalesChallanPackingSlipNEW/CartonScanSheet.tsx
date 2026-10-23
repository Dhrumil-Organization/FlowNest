// FILE: src/components/SalesChallanPackingSlipNEW/CartonScanSheet.tsx
// Scan the cartons of ONE allocation line — replaces CartonDetail ("Scan data" dialog).
//   Two scanner device types, same as WarehouseNEW (see ScanDevices.tsx):
//   • Hardware scanner: Urovo scan engine (laser trigger) + keyboard-wedge scanners
//   • Mobile camera:    expo-camera, continuous, torch
//   picked on the line card (two buttons, like WarehouseNEW), switchable here; plus "Type a label" for a damaged sticker.
// Every read vibrates and shows Added / Already scanned / Not found. Totals update live.
// Done is blocked while scanned qty > balance qty or a carton is there twice (web handleItemOk).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native';
import { confirmAsync } from '../ProductionOrderNEW/ui';
import { Btn, LinkBtn, Notice, tab, u } from '../PackingAutomationNEW/ui';
import { apiErrorText } from './api';
import type { Row } from './api';
import { cartonsIssue, cartonsOf, matchCarton, n3, qty, sum } from './rules';
import type { ScanResult } from './rules';
import { Bar, Segmented } from './ui';
import { CameraScanner, HardwareScanner } from './ScanDevices';
import type { ScanDevice } from './ScanDevices';


export default function CartonScanSheet({ open, row, d2, uid, device: startDevice, loadCartons, onDone, onClose }: {
  open: boolean; row: Row | null; d2: Row[]; uid: any; device: ScanDevice;
  loadCartons: (row: Row) => Promise<Row[]>; onDone: (srNo: any, cartons: Row[]) => void; onClose: () => void;
}) {
  const [list, setList] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [scanned, setScanned] = useState<Row[]>([]);
  const [device, setDevice] = useState<ScanDevice>(startDevice);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [last, setLast] = useState<(ScanResult & { at: number }) | null>(null);
  const [doneErr, setDoneErr] = useState('');
  const input = useRef<TextInput>(null);

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
    setScanned(initial); setLast(null); setText(''); setDoneErr(''); setDevice(startDevice); setTyping(false);
    fetch();
  }, [open, row]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!row) return null;

  const total = parseInt(row.TotCarton, 10) || 0;
  const target = n3(row.BQty);
  const sQty = sum(scanned, 'QtyWt');
  const over = n3(sQty) > target;
  const locked = String(row.D1Flag) === '1'; // web: delete icon disabled for saved lines
  const dirty = scanned.length !== initial.length || scanned.some((c, i) => c !== initial[i]);

  const read = (raw: string) => {
    const code = String(raw || '').trim();
    if (!code || busy) return;
    const res = matchCarton(code, { list, scanned, others, srNo, uid });
    setLast({ ...res, at: Date.now() });
    setDoneErr('');
    if (res.status === 'added' && res.carton) { setScanned((s) => [...s, res.carton as Row]); Vibration.vibrate(40); }
    else Vibration.vibrate([0, 120, 80, 120]);
    setText('');
  };
  const pickDevice = (d: ScanDevice) => { setDevice(d); setTyping(false); };
  const remove = async (c: Row) => {
    if (await confirmAsync('Remove carton?', `${c.CartNo} (${qty(c.QtyWt)}) comes off this line.`, 'Remove', true)) {
      setScanned((s) => s.filter((x) => x.SubSr !== c.SubSr));
    }
  };
  const close = async () => {
    if (dirty && !(await confirmAsync('Leave without adding?', 'Cartons scanned now will not be added to the packing slip.', 'Leave'))) return;
    onClose();
  };
  const done = () => {
    const issue = cartonsIssue(row, scanned, others);
    if (issue) { setDoneErr(issue); Vibration.vibrate([0, 120, 80, 120]); return; }
    onDone(srNo, scanned);
  };

  const tone = last?.status === 'added' ? T.green : last?.status === 'duplicate' ? T.amber : T.red;

  return (
    <Modal visible={open} animationType="slide" onRequestClose={close} presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        {/* ---------- head ---------- */}
        <View style={{ backgroundColor: T.nav, paddingTop: Platform.OS === 'ios' ? 52 : 16, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel="Back"
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontWeight: '800', letterSpacing: 0.6 }}>SCAN CARTONS · SR {srNo}</Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }} numberOfLines={1}>{row.ItmName}</Text>
            </View>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginTop: 8 }}>
            {[row.MerName && `Merge ${row.MerName}`, row.GrdName && `Grade ${row.GrdName}`, row.ShdName, n3(row.AssQty) > 0 && `Assigned ${qty(row.AssQty)}`].filter(Boolean).join('  ·  ')}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <Big label="Cartons" value={String(scanned.length)} of={String(total)} bal={`Balance ${total - scanned.length}`} />
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.16)', marginHorizontal: 16 }} />
            <Big label="Quantity" value={qty(sQty)} of={qty(target)} bal={`Balance ${qty(target - sQty)}`} warn={over} />
          </View>
          <View style={{ marginTop: 12 }}><Bar value={target ? sQty / target : 0} tone={over ? 'red' : 'green'} height={8} track="rgba(255,255,255,0.16)" /></View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="always">
          <Segmented<ScanDevice> value={device} onChange={pickDevice}
            options={[{ value: 'hardware', label: 'Hardware scanner', icon: 'qr-code-scanner' }, { value: 'camera', label: 'Mobile camera', icon: 'photo-camera' }]} />
          <View style={{ height: 12 }} />

          {err ? <Notice tone="err" text={err} action={{ label: 'Retry', onPress: fetch }} /> : null}
          {!busy && !list.length && !err ? (
            <Notice tone="info" text="No cartons in stock for this item, merge, grade and shade." />
          ) : typing ? (
            <View style={u.field}>
              <Icon name="keyboard" size={22} color={T.muted} />
              <TextInput ref={input} value={text} onChangeText={setText} onSubmitEditing={() => read(text)} blurOnSubmit={false} autoFocus
                autoCorrect={false} autoCapitalize="none" placeholder="Type or paste the label" placeholderTextColor={T.muted} accessibilityLabel="Carton label"
                style={[u.input, { fontSize: 15, fontWeight: '600', minWidth: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} />
              <Btn label="Add" onPress={() => read(text)} disabled={!text} style={{ height: 40, paddingHorizontal: 16 }} />
            </View>
          ) : device === 'hardware' ? (
            <HardwareScanner onScan={read} enabled={!busy && list.length > 0} />
          ) : (
            <CameraScanner onScan={read} enabled={!busy && list.length > 0} onRefused={() => pickDevice('hardware')} />
          )}
          {busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <ActivityIndicator color={T.copper} />
              <Text style={[u.hint, { marginTop: 0 }]}>Loading cartons in stock…</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <LinkBtn label={typing ? 'Back to scanner' : 'Type a label'} icon={typing ? 'qr-code-scanner' : 'keyboard'} onPress={() => setTyping((t) => !t)} />
          </View>

          {last ? (
            <View key={last.at} accessibilityLiveRegion="assertive"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tone, borderRadius: 12, padding: 12, marginTop: 12 }}>
              <Icon name={last.status === 'added' ? 'check-circle' : last.status === 'duplicate' ? 'content-copy' : 'cancel'} size={24} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                  {last.status === 'added' ? 'Added' : last.status === 'duplicate' ? 'Already scanned' : 'Not found'}
                </Text>
                <Text style={[{ color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 1 }, tab]}>{last.message}</Text>
              </View>
            </View>
          ) : null}

          {doneErr ? <View style={{ marginTop: 12 }}><Notice tone="err" text={doneErr} /></View> : null}

          <View style={[u.sectionHead, { marginTop: 14 }]}>
            <Text style={u.kicker}>Scanned · {scanned.length}</Text>
            <Text style={u.hint}>Newest first</Text>
          </View>
          {locked && scanned.length ? <Text style={[u.hint, { marginTop: 0, marginBottom: 8 }]}>This line is already saved — its cartons cannot be removed here.</Text> : null}
          {scanned.length === 0 ? (
            <Notice tone="info" text="Nothing scanned yet. Each label appears here as soon as it is read." />
          ) : (
            [...scanned].reverse().map((c) => (
              <View key={`${c.SubSr}-${c.CartNo}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingVertical: 10, paddingLeft: 12, paddingRight: 4, marginBottom: 8 }}>
                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: T.sub, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[{ fontWeight: '800', color: T.muted }, tab]}>{c.SubSr}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 15.5, fontWeight: '800', color: T.ink }, tab]}>{c.CartNo}</Text>
                  <Text style={[u.code, tab]}>{[c.Chees && `${c.Chees} chees`, c.ProdType, c.LotNo && `Lot ${c.LotNo}`].filter(Boolean).join(' · ')}</Text>
                </View>
                <Text style={[{ fontSize: 16, fontWeight: '800', color: T.ink }, tab]}>{qty(c.QtyWt)}</Text>
                {!locked ? (
                  <TouchableOpacity onPress={() => remove(c)} accessibilityRole="button" accessibilityLabel={`Remove ${c.CartNo}`}
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="delete-outline" size={22} color={T.red} />
                  </TouchableOpacity>
                ) : <View style={{ width: 8 }} />}
              </View>
            ))
          )}
        </ScrollView>

        <View style={{ backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, flexDirection: 'row', gap: 10 }}>
          <Btn kind="ghost" label="Cancel" onPress={close} />
          <Btn flex kind="copper" icon="check" label={`Done · ${scanned.length} carton${scanned.length === 1 ? '' : 's'}`} onPress={done} />
        </View>
      </View>
    </Modal>
  );
}

function Big({ label, value, of, bal, warn }: { label: string; value: string; of: string; bal: string; warn?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontWeight: '800', letterSpacing: 0.6 }}>{label.toUpperCase()}</Text>
      <Text style={[{ color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 2 }, tab]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[{ color: 'rgba(255,255,255,0.65)', fontSize: 12.5, fontWeight: '600' }, tab]}>of {of}</Text>
      <Text style={[{ color: warn ? '#FFB4A8' : 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: '700', marginTop: 1 }, tab]}>{bal}</Text>
    </View>
  );
}
