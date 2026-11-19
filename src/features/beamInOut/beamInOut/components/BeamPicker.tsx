// FILE: src/features/beamInOut/components/BeamPicker.tsx
// Beam help: search, tick several beams, add them in one go.
//  - Beam Outward: beam master (GRYBeam + GRYBeamD1); beams out at a party are hidden (a switch shows them).
//  - Beam Inward : only the beams out at the selected party — open Beam Outward lines; each comes back linked
//                  to its outward line with the open qty and the outward rate.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BeamService } from '@/src/api/beamInOutAPI';
import { notify } from '../../repackingIssue/dialog';
import { C, R, SP } from '../../repackingIssue/theme';
import { Sheet } from '../../repackingIssue/components/Sheet';
import { Btn, Input, Segmented } from '../../repackingIssue/components/ui';
import { fmt2, fmtQ, rowFromMaster, rowFromOutward } from '../logic';
import type { BeamContext, BeamMaster, BeamRow, BeamTxn, OutwardBeam } from '../types';

type Item = { key: string; beam: BeamMaster; out?: OutwardBeam };
const beamKey = (b: { beamCode: number; beamSrNo: number }) => `${b.beamCode}-${b.beamSrNo}`;

export function BeamPicker({ visible, ctx, txn, service, uid, parCode, rows: current, onPick, onClose, partyOnly = false }: {
  visible: boolean;
  ctx: BeamContext;
  txn: BeamTxn;
  service: Pick<BeamService, 'beams' | 'outwardBeams'>;
  uid: number;
  /** Beam Inward: the party whose beams are out */
  parCode: string;
  /** rows already in the voucher (hidden; the last one gives rate / beam info to new outward rows) */
  rows: BeamRow[];
  onPick: (rows: BeamRow[]) => void;
  onClose: () => void;
  /** Beam Inward: our beams come back through the Beam Gate Entry — here only the party's own beams */
  partyOnly?: boolean;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Item[]>([]);
  const [ticked, setTicked] = useState<Map<string, Item>>(new Map());
  const [loading, setLoading] = useState(false);
  const [showOut, setShowOut] = useState(false);
  /** Beam Inward: 'out' = our beams out at the party, 'party' = the party's own beams (Process House, with a yarn inward) */
  const [source, setSource] = useState<'out' | 'party'>(partyOnly ? 'party' : 'out');
  const seq = useRef(0);
  const outward = txn === 'beam_outward';
  const fromMaster = outward || source === 'party';

  const load = async (search: string, out: boolean) => {
    const my = ++seq.current;
    setLoading(true);
    try {
      const list: Item[] = fromMaster
        ? (await service.beams(ctx, txn, { uid, selected: current.map(r => ({ beamCode: r.beamCode, beamSrNo: r.beamSrNo })), search, onlyInHouse: outward && !out }))
            .filter(b => outward || !b.isOut) // a beam that is out at a party comes back on its outward, not as a party beam
            .map(b => ({ key: beamKey(b), beam: b }))
        : (await service.outwardBeams(ctx, {
            parCode, uid, search,
            selected: current.filter(r => r.inward?.tranType === -10).map(r => ({ uid: r.inward!.uid, srNo: r.inward!.srNo })),
          })).map(o => ({ key: `${o.link.uid}-${o.link.srNo}`, beam: o.beam, out: o }));
      if (my === seq.current) setRows(list);
    } catch (e: any) {
      if (my === seq.current) {
        setRows([]);
        notify('Beams', e?.message || 'Could not load beams.');
      }
    } finally {
      if (my === seq.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setTicked(new Map());
    setQ('');
    setSource(partyOnly ? 'party' : 'out');
    load('', showOut);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => load(q.trim(), showOut), 300);
    return () => clearTimeout(t);
  }, [q, showOut, source]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (it: Item) =>
    setTicked(m => {
      const n = new Map(m);
      n.has(it.key) ? n.delete(it.key) : n.set(it.key, it);
      return n;
    });

  /** build the voucher rows: outward → from the beam master, inward → linked to the outward line */
  const add = () => {
    const prev = current[current.length - 1];
    onPick([...ticked.values()].map(it =>
      it.out ? rowFromOutward(it.out)
      : outward ? rowFromMaster(it.beam, prev)
      : { ...rowFromMaster(it.beam), info: '1' as const }, // party beam: Process House, Inward No. = its yarn inward
    ));
  };

  const list = rows;
  const count = ticked.size;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Select beams"
      subtitle={outward ? 'Beams in house — tick one or more' : source === 'out' ? 'Beams out at this party — tick the ones that came back' : "The party's own beams — Process House, pick their yarn inward after adding"}
      maxWidth={760}
      footer={
        <View style={st.foot}>
          <Text style={st.footTxt}>{count ? `${count} beam${count === 1 ? '' : 's'} selected` : 'Nothing selected'}</Text>
          <Btn kind="ghost" title="Cancel" onPress={onClose} />
          <Btn icon="playlist-add" title={count ? `Add ${count}` : 'Add'} disabled={!count} onPress={add} />
        </View>
      }>
      <View style={{ padding: SP.md, gap: SP.sm }}>
        <View>
          <Input
            value={q}
            onChangeText={setQ}
            placeholder="Beam no., beam name or code — Enter ticks a single match"
            style={{ paddingLeft: 36 }}
            autoFocus
            autoCorrect={false}
            blurOnSubmit={false}
            returnKeyType="done"
            onSubmitEditing={() => {
              // one beam found → tick it and clear the search for the next one; nothing typed → add the ticked beams
              if (!q.trim()) { if (ticked.size) add(); return; }
              const exact = rows.filter(it => it.beam.beamNo.toUpperCase() === q.trim().toUpperCase());
              const one = exact.length === 1 ? exact[0] : rows.length === 1 ? rows[0] : null;
              if (one) { setTicked(m => new Map(m).set(one.key, one)); setQ(''); }
            }}
          />
          <Icon name="search" size={20} color={C.muted} style={st.searchIcon} />
        </View>
        {!outward && !partyOnly ? (
          <Segmented<'out' | 'party'>
            options={[{ value: 'out', label: 'Out at this party', hint: 'Our beams coming back' }, { value: 'party', label: 'Party beams', hint: 'Process House' }]}
            value={source}
            onChange={v => { setSource(v); setTicked(new Map()); }}
          />
        ) : null}
        {outward ? (
          <Pressable onPress={() => setShowOut(v => !v)} style={st.switch} accessibilityRole="switch" accessibilityState={{ checked: showOut }}>
            <Icon name={showOut ? 'check-box' : 'check-box-outline-blank'} size={20} color={showOut ? C.cta : C.muted} />
            <Text style={st.switchTxt}>Also show beams that are out at a party</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={list}
        keyExtractor={it => it.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SP.md, paddingBottom: SP.lg }}
        ListEmptyComponent={
          <View style={st.empty}>
            {loading ? <ActivityIndicator color={C.cta} /> : (
              <Text style={st.emptyTxt}>{q ? 'No beam matches' : fromMaster ? 'No beams available' : 'No beams are out at this party'}</Text>
            )}
          </View>
        }
        renderItem={({ item: it }) => {
          const b = it.beam;
          const on = ticked.has(it.key);
          return (
            <Pressable onPress={() => toggle(it)} style={[st.row, on && st.rowOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <Icon name={on ? 'check-box' : 'check-box-outline-blank'} size={22} color={on ? C.cta : C.muted} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.no} numberOfLines={1}>{b.beamNo || `#${b.beamSrNo}`}</Text>
                <Text style={st.name} numberOfLines={1}>{b.beamName}  •  Code {b.beamCode}{b.diameter ? `  •  Dia ${b.diameter}` : ''}</Text>
                {it.out ? <Text style={st.outVou} numberOfLines={1}>Out on {it.out.link.no}  •  {it.out.link.date}{it.out.rate ? `  •  Rate ${fmt2(it.out.rate)}` : ''}</Text> : null}
              </View>
              {it.out ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={st.wt}>{fmtQ(it.out.link.balQty ?? 0)}</Text>
                  <Text style={st.name}>open qty</Text>
                </View>
              ) : (
                <>
                  {b.isOut ? <View style={st.out}><Text style={st.outTxt}>OUT</Text></View> : null}
                  <Text style={st.wt}>{fmtQ(b.weight)}</Text>
                </>
              )}
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

const st = StyleSheet.create({
  searchIcon: { position: 'absolute', left: 10, top: 12 },
  switch: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, alignSelf: 'flex-start', paddingVertical: 4 },
  switchTxt: { fontSize: 13, fontWeight: '600', color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: 10, paddingHorizontal: SP.sm, borderBottomWidth: 1, borderColor: C.hair, borderRadius: R.sm },
  rowOn: { backgroundColor: C.ctaSoft },
  no: { fontSize: 15, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'] },
  name: { fontSize: 12, color: C.muted, marginTop: 2 },
  outVou: { fontSize: 12, color: C.cta, fontWeight: '700', marginTop: 2 },
  wt: { fontSize: 13, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'], minWidth: 64, textAlign: 'right' },
  out: { backgroundColor: C.dangerSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  outTxt: { fontSize: 10, fontWeight: '800', color: C.danger, letterSpacing: 0.6 },
  empty: { alignItems: 'center', paddingVertical: SP.xl },
  emptyTxt: { fontSize: 14, color: C.muted },
  foot: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  footTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: C.muted },
});
