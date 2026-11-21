// FILE: src/features/beamInOut/components/JobYarnCard.tsx
// Beam Outward — "Job yarn": the yarn that goes to the party WITH the beams (job work, GRYOut + annexure on the server).
//   off → plain empty-beam outward (no GST)
//   on  → Store (only its cartons; defaults to the yarn store) · Job type · Scan cartons (JobCartonSheet)
//         · one line per merge · item · grade · shade with its rate
//         every carton keeps its qty editable (lower = part of the carton; the rest stays in stock)
// GST of the voucher is worked out on this yarn amount only.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BeamService } from '@/src/api/beamInOutAPI';
import { yarnStrCode } from '@/src/api/beamInOutAPI';
import { cleanDecimal } from '../../repackingIssue/logic';
import { C, R, SP } from '../../repackingIssue/theme';
import { Banner, Btn, Card, Field, Input, SelectBox, Stat } from '../../repackingIssue/components/ui';
import { OptionPicker } from '../../repacking/components/OptionPicker';
import { confirmAsync } from '../../repackingIssue/dialog';
import { cheesFor, emptyJob, jobLineAmount, jobLineGst, jobLineQty, jobTotals, removeCarton, setLine, setPick } from '../job';
import { gstRates } from '../logic';
import type { JobOut } from '../job';
import type { BeamContext, Opt, TaxLine } from '../types';
import { JobCartonSheet } from './JobCartonSheet';

export function JobYarnCard({ step, ctx, service, uid, job, readOnly, error, onChange, taxLines, sameState, onPrint }: {
  step: number; ctx: BeamContext; service: BeamService; uid: number;
  job: JobOut; readOnly: boolean; error?: string; onChange: (j: JobOut) => void;
  /** view mode: print the saved job outward */
  onPrint?: (j: JobOut) => void;
  /** Tax Detail of the voucher (entry type) — the GST rates of the yarn */
  taxLines: TaxLine[];
  /** property state = party state → CGST + SGST; other → IGST; null = a state is blank */
  sameState: boolean | null;
}) {
  const [scan, setScan] = useState(false);
  const [typePick, setTypePick] = useState(false);
  const [storePick, setStorePick] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const t = jobTotals(job);
  const rates = gstRates(taxLines, sameState);
  const noRates = !rates.C && !rates.S && !rates.I;
  const locked = !!job.settled;
  const ro = readOnly || locked;
  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const switchOff = async () => {
    if (job.lines.length && !(await confirmAsync('Remove the job yarn?', 'The scanned cartons go back to stock when you save.', 'Remove', true))) return;
    onChange(emptyJob());
  };

  /** switch on: the yarn store of the property when it exists, else ask for the store */
  const switchOn = async () => {
    let store = job.store;
    if (!store) {
      try { store = (await service.jobStores(ctx)).find(o => o.code === yarnStrCode(ctx.prpCode)) ?? null; } catch { store = null; }
    }
    onChange({ ...job, on: true, store });
    if (store) setScan(true); else setStorePick(true);
  };
  const pickStore = async (o: Opt) => {
    setStorePick(false);
    if (job.store?.code === o.code) return;
    const n = job.lines.reduce((x, l) => x + l.cartons.length, 0);
    if (n && !(await confirmAsync('Change the store?', `The ${n} carton${n === 1 ? '' : 's'} scanned are from store ${job.store?.name} — they will be taken off.`, 'Change', true))) return;
    onChange({ ...job, on: true, store: o, lines: [] });
  };
  const storePicker = (
    <OptionPicker
      visible={storePick}
      title="Store (yarn goes out from)"
      search={async (q: string) => {
        const list = await service.jobStores(ctx);
        const s = q.trim().toUpperCase();
        return s ? list.filter((o: Opt) => o.name.toUpperCase().includes(s) || o.code.toUpperCase() === s) : list;
      }}
      selected={job.store?.code}
      onPick={pickStore}
      onClose={() => setStorePick(false)}
    />
  );

  if (!job.on) {
    return (
      <Card step={step} title="Job yarn">
        <Text style={st.meta}>{ro ? 'No yarn was sent with this outward — empty beams only, no GST.' : 'Empty beams only — no GST. Yarn going to the party with the beams? Add it here (job outward + annexure).'}</Text>
        {!ro ? <Btn icon="add-box" title="Send yarn with the beams" onPress={switchOn} style={{ marginTop: SP.sm }} /> : null}
        {storePicker}
      </Card>
    );
  }

  return (
    <Card step={step} title={`Job yarn (${t.lines})`} right={onPrint && job.uid ? (
      <Btn small kind="ghost" icon="print" title="Print job outward" onPress={() => onPrint(job)} />
    ) : !ro ? (
      <View style={{ flexDirection: 'row', gap: SP.xs }}>
        <Btn small icon="qr-code-scanner" title="Scan cartons" onPress={() => (job.store ? setScan(true) : setStorePick(true))} />
        <Btn small kind="ghost" icon="remove-circle-outline" title="No yarn" onPress={switchOff} />
      </View>
    ) : undefined}>
      {locked ? <Banner text="Yarn of this job outward is already received back (annexure settled) — it can't be changed." /> : null}
      {job.outNo ? <Text style={st.meta}>Job outward {job.outNo}{job.annexureNo ? `  •  Annexure ${job.annexureNo}` : ''}</Text> : null}
      <View style={st.pair}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Field label="Store" required error={!job.store && error?.includes('store') ? 'Select the store' : undefined}>
            <SelectBox icon="store" value={job.store?.name} code={job.store?.code} placeholder="Select store" onPress={() => setStorePick(true)} disabled={ro} invalid={!job.store && !!error} />
          </Field>
        </View>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Field label="Job type" required error={!job.jobType && error?.includes('job type') ? 'Select the job type' : undefined}>
            <SelectBox icon="work-outline" value={job.jobType?.name} code={job.jobType?.code} placeholder="Select job type" onPress={() => setTypePick(true)} disabled={ro} invalid={!job.jobType && !!error} />
          </Field>
        </View>
      </View>

      <View style={st.stats}>
        <Stat label="Cartons" value={String(t.cartons)} />
        <Stat label="Yarn qty" value={t.qty.toFixed(3)} />
        <Stat label="Yarn amount" value={fmt(t.gross)} strong />
      </View>
      {error ? <Text style={st.err}>{error}</Text> : null}

      {job.lines.length === 0 ? (
        <Pressable onPress={() => (!ro ? (job.store ? setScan(true) : setStorePick(true)) : null)} style={st.empty} accessibilityRole="button">
          <Icon name="qr-code-scanner" size={28} color={C.cta} />
          <Text style={st.emptyTxt}>Scan the cartons going with the beams</Text>
          <Text style={st.meta}>Merge, item, grade and shade come from the carton.</Text>
        </Pressable>
      ) : job.lines.map((l, i) => {
        const expanded = open === l.key;
        const g = jobLineGst(l, rates);
        return (
          <View key={l.key} style={st.line}>
            <Pressable onPress={() => setOpen(expanded ? null : l.key)} style={st.lineHead} accessibilityRole="button" accessibilityState={{ expanded }}>
              <Text style={st.sr}>{i + 1}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.title} numberOfLines={1}>Merge {l.mergeName || l.mergeCode}  •  {l.itemName || `Item ${l.itemCode}`}</Text>
                <Text style={st.meta} numberOfLines={1}>Grade {l.gradeName || l.gradeCode}  •  Shade {l.shadeName || l.shadeCode}  •  {l.cartons.length} carton{l.cartons.length === 1 ? '' : 's'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.qty}>{jobLineQty(l).toFixed(3)}</Text>
                <Text style={st.meta}>₹ {fmt(jobLineAmount(l))}{g.total !== g.amount ? `  →  ₹ ${fmt(g.total)}` : ''}</Text>
              </View>
              <Icon name={expanded ? 'expand-less' : 'expand-more'} size={22} color={C.muted} />
            </Pressable>
            <View style={st.rateRow}>
              <View style={{ width: 130 }}>
                <Field label="Rate / kg">
                  <Input value={l.rate} onChangeText={v => onChange(setLine(job, l.key, { rate: cleanDecimal(v, 2) }))} keyboardType="decimal-pad" placeholder="0.00" editable={!ro} />
                </Field>
              </View>
              <View style={{ width: 110 }}>
                <Field label="Denier">
                  <Input value={l.denier} onChangeText={v => onChange(setLine(job, l.key, { denier: v.slice(0, 20) }))} placeholder="—" editable={!ro} />
                </Field>
              </View>
              <View style={{ width: 120 }}>
                <Field label="HSN" required>
                  <Input value={l.hsnCode} onChangeText={v => onChange(setLine(job, l.key, { hsnCode: v.replace(/\D/g, '').slice(0, 8) }))} keyboardType="number-pad" placeholder="Required" editable={!ro} invalid={!l.hsnCode.trim()} />
                </Field>
              </View>
            </View>
            <View style={st.gst}>
              {noRates ? (
                <Text style={st.meta}>GST: set the Tax Detail of the entry type (step 5) for the rates.</Text>
              ) : sameState === false ? (
                <Text style={st.gstTxt}>IGST {g.igstPer}%  ₹ {fmt(g.igst)}</Text>
              ) : (
                <>
                  <Text style={st.gstTxt}>CGST {g.cgstPer}%  ₹ {fmt(g.cgst)}</Text>
                  <Text style={st.gstTxt}>SGST {g.sgstPer}%  ₹ {fmt(g.sgst)}</Text>
                  {sameState === null && g.igstPer ? <Text style={st.gstTxt}>IGST {g.igstPer}%  ₹ {fmt(g.igst)}</Text> : null}
                </>
              )}
              <Text style={[st.gstTxt, { marginLeft: 'auto', color: C.nav }]}>Line total ₹ {fmt(g.total)}</Text>
            </View>
            {sameState === null && !noRates ? <Text style={[st.meta, { paddingHorizontal: SP.sm, paddingBottom: SP.xs }]}>Property or party state is blank — check CGST / SGST or IGST.</Text> : null}
            {expanded ? l.cartons.map(c => {
              const w = Number(c.wt) || 0;
              const part = w > 0 && w < c.avail - 0.0005;
              const over = w > c.avail + 0.0005;
              return (
                <View key={c.cartonNo} style={st.carton}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.cNo}>{c.cartonNo}</Text>
                    <Text style={[st.meta, over && { color: C.danger }]}>{[c.stockFrom, c.location && `Loc ${c.location}`, `has ${c.avail.toFixed(3)} kg`].filter(Boolean).join('  •  ')}{part ? `  •  part, ${(c.avail - w).toFixed(3)} stays` : ''}</Text>
                  </View>
                  <View style={{ width: 110 }}>
                    <Input value={c.wt} onChangeText={v => { const s = cleanDecimal(v, 3); onChange(setPick(job, c.cartonNo, { wt: s, chees: String(cheesFor(Number(s) || 0, c.avail, c.availChees)) })); }}
                      keyboardType="decimal-pad" editable={!ro} invalid={over || !(w > 0)} />
                  </View>
                  {!ro && part ? <Btn small kind="ghost" title="All" onPress={() => onChange(setPick(job, c.cartonNo, { wt: c.avail.toFixed(3), chees: String(c.availChees) }))} /> : null}
                  {!ro ? (
                    <Pressable onPress={() => onChange(removeCarton(job, c.cartonNo))} hitSlop={8} accessibilityLabel={`Remove carton ${c.cartonNo}`}>
                      <Icon name="close" size={20} color={C.muted} />
                    </Pressable>
                  ) : null}
                </View>
              );
            }) : null}
          </View>
        );
      })}

      <JobCartonSheet visible={scan} ctx={ctx} service={service} uid={uid} job={job} readOnly={ro} onChange={onChange} onClose={() => setScan(false)} />
      {storePicker}
      <OptionPicker
        visible={typePick}
        title="Job type"
        search={async (q: string) => {
          const list = await service.jobTypes(ctx);
          const s = q.trim().toUpperCase();
          return s ? list.filter((o: Opt) => o.name.toUpperCase().includes(s) || o.code === s) : list;
        }}
        selected={job.jobType?.code}
        onPick={(o: Opt) => { onChange({ ...job, jobType: o }); setTypePick(false); }}
        onClose={() => setTypePick(false)}
      />
    </Card>
  );
}

const st = StyleSheet.create({
  meta: { fontSize: 12.5, color: C.muted },
  err: { fontSize: 12.5, color: C.danger, fontWeight: '700', marginTop: SP.xs },
  stats: { flexDirection: 'row', gap: SP.md, marginVertical: SP.sm },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
  gst: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SP.md, paddingHorizontal: SP.sm, paddingBottom: SP.sm },
  gstTxt: { fontSize: 12.5, fontWeight: '800', color: C.ink },
  empty: { alignItems: 'center', gap: 4, padding: SP.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, borderRadius: R.md },
  emptyTxt: { fontSize: 14.5, fontWeight: '800', color: C.nav },
  line: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, marginTop: SP.sm, overflow: 'hidden', backgroundColor: C.card },
  lineHead: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, padding: SP.sm },
  sr: { width: 22, textAlign: 'center', fontWeight: '800', color: C.muted },
  title: { fontSize: 14.5, fontWeight: '800', color: C.ink },
  qty: { fontSize: 14.5, fontWeight: '800', color: C.nav },
  rateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, paddingHorizontal: SP.sm, paddingBottom: SP.sm },
  carton: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.hair },
  cNo: { fontSize: 14, fontWeight: '800', color: C.ink },
});
