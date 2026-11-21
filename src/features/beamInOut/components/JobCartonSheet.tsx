// FILE: src/features/beamInOut/components/JobCartonSheet.tsx
// Beam Job Outward — add the yarn cartons that go with the beams, from the chosen STORE:
//   hardware scanner always listening (Urovo / keyboard wedge, same component as Sales Challan Packing), Camera,
//   or type the carton no. + Enter (the box keeps the focus for the next one).
// The carton decides merge · item · grade · shade → it lands on its line by itself. Whole carton; lower the qty on the
// form for a part (partial issue). The list shows EVERY carton picked, newest first.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BeamService } from '@/src/api/beamInOutAPI';
import { C, SP } from '../../repackingIssue/theme';
import { Sheet } from '../../repackingIssue/components/Sheet';
import { Btn } from '../../repackingIssue/components/ui';
import { CameraScanner, HardwareScanner } from '../../../components/SalesChallanPackingSlipNEW/ScanDevices';
import { addCarton, jobTotals, pickedCartons, pickedLine, removeCarton } from '../job';
import type { JobCartonHit, JobOut } from '../job';
import type { BeamContext } from '../types';

type Msg = { ok: boolean; text: string } | null;

/** carton no. from a label — same formats as Sales Challan Packing: "{…}" index 15, "a~b~…" index 6, else the text */
export function cartonNoFromScan(raw: string): string {
  const code = String(raw || '').replace(/[\r\n\t]/g, '').trim();
  if (!code) return '';
  if (code.includes('{') && code.includes('}')) {
    let parts: any[];
    try { parts = JSON.parse(code.replace('{', '[').replace('}', ']')); } catch { parts = code.replace(/[{}]/g, '').split(','); }
    const v = String(parts[15] ?? '').replace(/^"|"$/g, '').trim();
    if (v) return v;
  }
  if (code.split('~').length - 1 > 5) {
    const v = code.split('~')[6]?.trim();
    if (v) return v;
  }
  return code;
}

export function JobCartonSheet({ visible, ctx, service, uid, job, readOnly = false, onChange, onClose }: {
  visible: boolean; ctx: BeamContext; service: BeamService; uid: number;
  job: JobOut; readOnly?: boolean; onChange: (j: JobOut) => void; onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [camera, setCamera] = useState(false);
  const [choices, setChoices] = useState<JobCartonHit[]>([]);
  const jobRef = useRef(job); jobRef.current = job;
  const inputRef = useRef<any>(null);
  const store = job.store;

  useEffect(() => { if (!visible) { setCamera(false); setChoices([]); setMsg(null); setTyped(''); } }, [visible]);

  const focus = () => setTimeout(() => inputRef.current?.focus?.(), 0);
  const add = (hit: JobCartonHit) => {
    const r = addCarton(jobRef.current, hit);
    if (r.ok) onChange(r.job);
    setMsg({ ok: r.ok, text: r.message });
    setChoices([]);
    focus();
  };

  /** scanner / camera / Enter */
  const read = async (raw: string) => {
    const no = cartonNoFromScan(raw);
    if (!no || busy || readOnly) return;
    if (!store) { setMsg({ ok: false, text: 'Select the store first — only its cartons can go out.' }); return; }
    const on = pickedLine(jobRef.current, no);
    if (on) { setMsg({ ok: false, text: `Carton ${no} is already on merge ${on.mergeName || on.mergeCode}.` }); setTyped(''); focus(); return; }
    setBusy(true);
    try {
      const hits = await service.findCarton(ctx, { cartonNo: no, strCode: store.code, uid });
      if (hits.length === 1) add(hits[0]);
      else { setChoices(hits); setMsg({ ok: false, text: `Carton ${no} is in ${hits.length} merges — pick the right one.` }); }
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || `Carton ${no} could not be found.` });
    } finally { setBusy(false); setTyped(''); focus(); }
  };

  const t = jobTotals(job);
  const list = pickedCartons(job);
  const web = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

  return (
    <Sheet visible={visible} onClose={onClose} title="Job yarn — cartons"
      subtitle={`${store ? `Store ${store.name}  •  ` : ''}${t.cartons} carton${t.cartons === 1 ? '' : 's'}  •  ${t.qty.toFixed(3)} kg  •  ${t.lines} line${t.lines === 1 ? '' : 's'}`} maxWidth={760}
      footer={<View style={st.foot}><View style={{ flex: 1 }} /><Btn icon="check" title={`Done · ${t.cartons} carton${t.cartons === 1 ? '' : 's'}`} onPress={onClose} /></View>}>
      <View style={{ padding: SP.md, gap: SP.sm, flex: 1 }}>
        {!store ? (
          <View style={[st.msg, { backgroundColor: '#FDECEC' }]}>
            <Icon name="store" size={17} color={C.danger} />
            <Text style={[st.msgTxt, { color: C.danger }]}>Select the store on the form first — only its cartons can go out.</Text>
          </View>
        ) : !readOnly ? (
          <>
            <HardwareScanner onScan={read} enabled={visible && !camera} paused={camera || busy} compact />
            <View style={{ flexDirection: 'row', gap: SP.sm, alignItems: 'center' }}>
              <View style={st.search}>
                <Icon name="qr-code-2" size={18} color={C.muted} />
                <TextInput ref={inputRef} autoFocus value={typed} onChangeText={setTyped} onSubmitEditing={() => read(typed)} placeholder="Type carton no. + Enter" placeholderTextColor={C.muted}
                  autoCapitalize="characters" autoCorrect={false} returnKeyType="done" blurOnSubmit={false} style={[st.input, web]} accessibilityLabel="Carton number" />
                {busy ? <ActivityIndicator size="small" color={C.cta} /> : null}
              </View>
              <Btn small icon="photo-camera" title="Camera" onPress={() => setCamera(true)} />
            </View>
          </>
        ) : null}

        {msg ? (
          <View style={[st.msg, { backgroundColor: msg.ok ? '#E8F5EC' : '#FDECEC' }]}>
            <Icon name={msg.ok ? 'check-circle' : 'error-outline'} size={17} color={msg.ok ? '#1E8E3E' : C.danger} />
            <Text style={[st.msgTxt, { color: msg.ok ? '#1E8E3E' : C.danger }]}>{msg.text}</Text>
          </View>
        ) : null}

        {choices.map(h => (
          <Pressable key={`${h.mergeCode}-${h.itemCode}-${h.stockFrom}`} onPress={() => add(h)} style={st.row} accessibilityRole="button">
            <Icon name="radio-button-unchecked" size={22} color={C.muted} />
            <View style={{ flex: 1 }}>
              <Text style={st.no}>Merge {h.mergeName || h.mergeCode}  •  {h.itemName}</Text>
              <Text style={st.meta}>{h.stockFrom}  •  Grade {h.gradeName || h.gradeCode}  •  Shade {h.shadeName || h.shadeCode}</Text>
            </View>
            <Text style={st.qty}>{h.qty.toFixed(3)} kg</Text>
          </Pressable>
        ))}

        <FlatList data={list} keyExtractor={x => x.carton.cartonNo} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, paddingBottom: SP.md }}
          ListHeaderComponent={list.length ? <Text style={st.cap}>{list.length} CARTON{list.length === 1 ? '' : 'S'} PICKED — NEWEST FIRST</Text> : null}
          ListEmptyComponent={<Text style={st.empty}>Scan the first carton — its merge, item, grade and shade fill the line.</Text>}
          renderItem={({ item: { line: l, carton: c } }) => {
            const w = Number(c.wt) || 0;
            return (
              <View style={st.row}>
                <Icon name="check-circle" size={20} color="#1E8E3E" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.no}>{c.cartonNo}</Text>
                  <Text style={st.meta} numberOfLines={1}>Merge {l.mergeName || l.mergeCode}  •  {l.itemName}  •  {l.gradeName || l.gradeCode}  •  {l.shadeName || l.shadeCode}{c.stockFrom ? `  •  ${c.stockFrom}` : ''}</Text>
                </View>
                <Text style={st.qty}>{w.toFixed(3)} kg{w < c.avail - 0.0005 ? <Text style={st.meta}> / {c.avail.toFixed(3)}</Text> : null}</Text>
                {!readOnly ? (
                  <Pressable onPress={() => { onChange(removeCarton(jobRef.current, c.cartonNo)); setMsg({ ok: true, text: `Carton ${c.cartonNo} taken off.` }); focus(); }} hitSlop={8} accessibilityLabel={`Remove carton ${c.cartonNo}`}>
                    <Icon name="close" size={20} color={C.muted} />
                  </Pressable>
                ) : null}
              </View>
            );
          }} />
      </View>

      {camera ? (
        <View style={st.cam}>
          <View style={st.camTop}>
            <Btn small icon="close" title="Close camera" onPress={() => setCamera(false)} />
            <Text style={{ color: '#fff' }}>Point at the carton label</Text>
          </View>
          <View style={{ flex: 1 }}>
            <CameraScanner enabled onScan={(c: string) => { setCamera(false); read(c); }} onRefused={() => setCamera(false)} />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

const st = StyleSheet.create({
  foot: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 10, backgroundColor: C.card },
  input: { flex: 1, fontSize: 15, color: C.ink, paddingVertical: 9 },
  msg: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  msgTxt: { flex: 1, fontSize: 13, fontWeight: '700' },
  cap: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: C.muted, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  no: { fontSize: 14.5, fontWeight: '800', color: C.ink },
  meta: { fontSize: 12, color: C.muted, marginTop: 1 },
  qty: { fontSize: 14, fontWeight: '800', color: C.nav },
  empty: { color: C.muted, textAlign: 'center', marginTop: SP.lg },
  cam: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000' },
  camTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
});
