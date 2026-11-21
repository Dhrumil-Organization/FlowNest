// FILE: src/features/beamInOut/components/JobReturnCard.tsx
// Beam Inward — "Yarn back on the beams" (job inward + annexure on the server):
//   1 the job outward — picked by itself when the beams came back against a Beam Outward that sent yarn
//   2 per beam: GROSS weight → yarn = gross − beam weight (beam master)          e.g. 200 − 90 = 110
//   3 per yarn line (annexure): sent · open · on beams → shortage / wastage / loose; excess when the beams bring more
//      than is open. What is not booked stays open on the outward (not every beam has to come back).
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BeamService } from '@/src/api/beamInOutAPI';
import { cleanDecimal } from '../../repackingIssue/logic';
import { notify } from '../../repackingIssue/dialog';
import { C, R, SP } from '../../repackingIssue/theme';
import { Banner, Btn, Card, Field, Input, Stat } from '../../repackingIssue/components/ui';
import { OptionPicker } from '../../repacking/components/OptionPicker';
import { beamYarn, emptyJobIn, settlement } from '../job';
import type { JobIn, JobOutwardHit } from '../job';
import type { BeamContext, BeamRow, Opt } from '../types';

export function JobReturnCard({ step, ctx, service, uid, parCode, rows, jobIn, readOnly, error, onChange }: {
  step: number; ctx: BeamContext; service: BeamService; uid: number; parCode: string;
  rows: BeamRow[]; jobIn: JobIn; readOnly: boolean; error?: string; onChange: (j: JobIn) => void;
}) {
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const tried = useRef('');
  const ro = readOnly || !!jobIn.locked;
  const linkedOut = rows.filter(r => r.inward?.tranType === -10).map(r => r.inward!.uid);

  const choose = async (o: JobOutwardHit, auto = false) => {
    setBusy(true);
    try {
      const lines = await service.jobOutwardLines(ctx, { outUid: o.outUid, uid });
      onChange({ ...emptyJobIn(), outUid: o.outUid, outNo: o.outNo, annexureNo: o.annexureNo, lines });
      if (auto) notify('Job yarn', `These beams went out with yarn on ${o.outNo} (annexure ${o.annexureNo}) — enter the gross weight of each beam.`);
    } catch (e: any) { notify('Job yarn', e?.message || 'Yarn lines could not be loaded.'); }
    finally { setBusy(false); }
  };

  // beams back against a Beam Outward that sent yarn → pick that job outward by itself
  useEffect(() => {
    if (ro || jobIn.outUid || !parCode || !linkedOut.length) return;
    const sig = `${parCode}|${[...new Set(linkedOut)].sort().join(',')}`;
    if (tried.current === sig) return;
    tried.current = sig;
    service.jobOutwards(ctx, parCode).then(list => {
      const hits = list.filter(o => linkedOut.includes(o.beamOutwardUid));
      if (hits.length === 1) choose(hits[0], true);
    }).catch(() => undefined);
  }, [parCode, linkedOut.join(','), jobIn.outUid, ro]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!jobIn.outUid) {
    return (
      <Card step={step} title="Yarn back on the beams">
        <Text style={st.meta}>Empty beams only — no GST. Beams came back with yarn on them (job work)? Link the job outward here.</Text>
        {!ro ? <Btn icon="link" title="Yarn came back on the beams" loading={busy} onPress={() => (parCode ? setPick(true) : notify('Party', 'Select the party first.'))} style={{ marginTop: SP.sm }} /> : null}
        <OptionPicker
          visible={pick}
          title="Job outward (yarn open)"
          search={async (q: string) => {
            const list = await service.jobOutwards(ctx, parCode);
            const s = q.trim().toUpperCase();
            return list.filter(o => !s || o.outNo.toUpperCase().includes(s) || o.annexureNo.toUpperCase().includes(s) || o.beamOutwardNo.toUpperCase().includes(s))
              .map((o): Opt => ({ code: String(o.outUid), name: `${o.outNo}  •  Annexure ${o.annexureNo}`, extra: o as any }));
          }}
          sub={(o: Opt) => { const x = o.extra as any; return `Beam outward ${x.beamOutwardNo}  •  sent ${x.sent.toFixed(3)}  •  open ${x.balance.toFixed(3)}`; }}
          onPick={(o: Opt) => { setPick(false); choose(o.extra as any); }}
          onClose={() => setPick(false)}
        />
      </Card>
    );
  }

  const view = settlement(jobIn, rows);
  const setBeam = (key: string, patch: Partial<{ gross: string; outSrNo: number }>) =>
    onChange({ ...jobIn, beams: { ...jobIn.beams, [key]: { ...(jobIn.beams[key] ?? { gross: '', outSrNo: 0 }), ...patch } } });
  const setSettle = (sr: number, patch: Partial<{ shortage: string; wastage: string; loose: string }>) =>
    onChange({ ...jobIn, settle: { ...jobIn.settle, [sr]: { ...(jobIn.settle[sr] ?? { shortage: '', wastage: '', loose: '' }), ...patch } } });
  const multi = jobIn.lines.length > 1;
  const tot = { beams: view.reduce((s, v) => s + v.beams, 0), yarn: view.reduce((s, v) => s + v.onBeams, 0) };

  return (
    <Card step={step} title="Yarn back on the beams" right={!ro ? (
      <Btn small kind="ghost" icon="link-off" title="No yarn" onPress={() => onChange(emptyJobIn())} />
    ) : undefined}>
      {jobIn.locked ? <Banner text="Yarn of these beams is already issued — the yarn part can't be changed." /> : null}
      <Text style={st.meta}>Job outward {jobIn.outNo}  •  Annexure {jobIn.annexureNo}{jobIn.inwNo ? `  •  Job inward ${jobIn.inwNo}` : ''}</Text>
      <View style={st.stats}>
        <Stat label="Beams weighed" value={String(tot.beams)} />
        <Stat label="Yarn on beams" value={tot.yarn.toFixed(3)} strong />
      </View>
      {error ? <Text style={st.err}>{error}</Text> : null}

      {/* 2 — beams */}
      {rows.length === 0 ? <Text style={st.meta}>Add the beams that came back first.</Text> : rows.map(r => {
        const b = jobIn.beams[r.key];
        const y = b?.gross ? beamYarn(b.gross, r.weight) : 0;
        const bad = !!b?.gross && !(y > 0);
        return (
          <View key={r.key} style={st.beam}>
            <View style={{ flex: 1, minWidth: 120 }}>
              <Text style={st.title}>{r.beamNo}</Text>
              <Text style={st.meta}>Beam wt {Number(r.weight || 0).toFixed(3)}</Text>
            </View>
            <View style={{ width: 120 }}>
              <Field label="Gross wt">
                <Input value={b?.gross ?? ''} onChangeText={v => setBeam(r.key, { gross: cleanDecimal(v, 3) })} keyboardType="decimal-pad" placeholder="0.000" editable={!ro} invalid={bad} />
              </Field>
            </View>
            <View style={{ width: 100, alignItems: 'flex-end' }}>
              <Text style={st.cap}>YARN</Text>
              <Text style={[st.yarn, bad && { color: C.danger }]}>{b?.gross ? y.toFixed(3) : '—'}</Text>
            </View>
            {multi ? (
              <View style={st.chips}>
                {jobIn.lines.map(l => {
                  const on = b?.outSrNo === l.outSrNo;
                  return (
                    <Pressable key={l.outSrNo} onPress={() => (!ro ? setBeam(r.key, { outSrNo: l.outSrNo }) : null)} style={[st.chip, on && st.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                      <Text style={[st.chipTxt, on && st.chipTxtOn]}>{l.mergeName}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}

      {/* 3 — annexure per yarn line */}
      {view.map(v => {
        const s = jobIn.settle[v.line.outSrNo] ?? { shortage: '', wastage: '', loose: '' };
        const closed = Math.abs(v.rest) <= 0.0005;
        return (
          <View key={v.line.outSrNo} style={st.settle}>
            <Text style={st.title}>Merge {v.line.mergeName}  •  {v.line.itemName}</Text>
            <View style={st.stats}>
              <Stat label="Sent" value={v.line.sent.toFixed(3)} />
              <Stat label="Open" value={v.line.balance.toFixed(3)} />
              <Stat label="On beams" value={v.onBeams.toFixed(3)} strong />
            </View>
            <View style={st.inputs}>
              {(['shortage', 'wastage', 'loose'] as const).map(k => (
                <View key={k} style={{ width: 120 }}>
                  <Field label={k === 'loose' ? 'Loose' : k === 'shortage' ? 'Shortage' : 'Wastage'}>
                    <Input value={s[k]} onChangeText={x => setSettle(v.line.outSrNo, { [k]: cleanDecimal(x, 3) })} keyboardType="decimal-pad" placeholder="0.000"
                      editable={!ro && !(k === 'shortage' && v.excess > 0)} />
                  </Field>
                </View>
              ))}
            </View>
            <View style={st.restRow}>
              {v.excess > 0 ? (
                <Text style={[st.rest, { color: C.cta }]}>Excess {v.excess.toFixed(3)} — the beams brought more than was open; the line closes.</Text>
              ) : closed ? (
                <Text style={[st.rest, { color: '#1E8E3E' }]}>Line closed — annexure complete.</Text>
              ) : v.rest < 0 ? (
                <Text style={[st.rest, { color: C.danger }]}>{(-v.rest).toFixed(3)} more than open — lower shortage / wastage / loose.</Text>
              ) : (
                <>
                  <Text style={st.rest}>{v.rest.toFixed(3)} still open</Text>
                  {!ro ? <Btn small kind="ghost" title="Rest as loose" onPress={() => setSettle(v.line.outSrNo, { loose: (Number(s.loose || 0) + v.rest).toFixed(3) })} /> : null}
                  {!ro ? <Btn small kind="ghost" title="Rest as shortage" onPress={() => setSettle(v.line.outSrNo, { shortage: (Number(s.shortage || 0) + v.rest).toFixed(3) })} /> : null}
                </>
              )}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const st = StyleSheet.create({
  meta: { fontSize: 12.5, color: C.muted },
  cap: { fontSize: 10.5, fontWeight: '800', color: C.muted, letterSpacing: 0.5 },
  err: { fontSize: 12.5, color: C.danger, fontWeight: '700', marginTop: SP.xs },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginVertical: SP.sm },
  title: { fontSize: 14.5, fontWeight: '800', color: C.ink },
  beam: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: SP.sm, paddingVertical: SP.sm, borderTopWidth: 1, borderTopColor: C.hair },
  yarn: { fontSize: 16, fontWeight: '800', color: C.nav },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: C.line },
  chipOn: { borderColor: C.cta, backgroundColor: C.ctaSoft },
  chipTxt: { fontSize: 12.5, fontWeight: '700', color: C.muted },
  chipTxtOn: { color: C.cta },
  settle: { marginTop: SP.md, padding: SP.sm, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  inputs: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
  restRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SP.sm, marginTop: SP.sm },
  rest: { fontSize: 13, fontWeight: '800', color: C.nav },
});
