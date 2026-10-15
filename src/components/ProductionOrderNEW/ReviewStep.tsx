// FILE: src/components/ProductionOrderNEW/ReviewStep.tsx
// "Review costing & authorize" — laid out like the Madhusudhan ERP artifact:
//   Costing sheet (select) → Input rates (verify / edit) → Costing breakup →
//   Realisation per greige metre → SO price vs cost → Sourcing (in-house /
//   job work / greige purchase) → Submit.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SelectField } from '../StockVerificationNEW/ui';
import { fetchParties } from './api';
import { ratesEdited } from './costEngine';
import { decimalOnly, fmt, formatLegacyDate, rM, round3, Row, rowKey } from './format';
import { Badge, Banner, Card, Cell2, confirmAsync, Grid, Kicker, Loading, Muted, notifyAsync, ServerPicker, Tag, x } from './ui';

const MONO = { fontVariant: ['tabular-nums' as const] };
const STORE = T.blue; // artifact XC.store accent for greige totals
const n = (v: any) => { const k = parseFloat(String(v ?? '')); return Number.isFinite(k) ? k : 0; };

/* ------------------------------ small parts ------------------------------ */

function BL({ label, val, strong, top, accent }: { label: string; val: number; strong?: boolean; top?: boolean; accent?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopWidth: top ? 1.5 : 1, borderTopColor: top ? T.border : T.alt }}>
      <Text style={{ fontSize: strong ? 12.5 : 11.5, fontWeight: strong ? '800' : '500', color: strong ? T.ink : T.muted }}>{label}</Text>
      <Text style={[{ fontSize: strong ? 14 : 12, fontWeight: strong ? '800' : '600', color: accent || T.ink }, MONO]}>{rM(val)}/m</Text>
    </View>
  );
}

function RateInput({ value, onChange, editable, width = 84 }: { value: string; onChange: (v: string) => void; editable: boolean; width?: number }) {
  return (
    <TextInput value={value} onChangeText={(v) => onChange(decimalOnly(v))} editable={editable} keyboardType="decimal-pad" inputMode="decimal"
      style={[{ width, paddingVertical: 6, paddingHorizontal: 7, fontSize: 11.5, textAlign: 'right', borderWidth: 1, borderColor: T.border, borderRadius: 7, backgroundColor: editable ? '#fff' : T.sub, color: T.ink }, MONO]} />
  );
}

function RR({ label, value, onChange, editable, pct }: { label: string; value: string; onChange: (v: string) => void; editable: boolean; pct?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
      <Text style={{ fontSize: 11.5, color: T.ink }}>{label}{pct ? ' (%)' : ''}</Text>
      <RateInput value={value} onChange={onChange} editable={editable} />
    </View>
  );
}

function Field({ label, children, grow = 1, min = 130 }: { label: string; children: React.ReactNode; grow?: number; min?: number }) {
  return (
    <View style={{ flexGrow: grow, flexBasis: min, minWidth: min }}>
      <Text style={{ fontSize: 8.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{label}</Text>
      {children}
    </View>
  );
}

const Box = ({ value, onChange, editable, placeholder, align = 'right' }: { value: string; onChange: (v: string) => void; editable: boolean; placeholder?: string; align?: 'left' | 'right' }) => (
  <TextInput value={value} onChangeText={onChange} editable={editable} placeholder={placeholder} placeholderTextColor={T.muted}
    keyboardType={align === 'right' ? 'decimal-pad' : 'default'}
    style={[x.input, MONO, { textAlign: align }, !editable && { backgroundColor: T.sub, color: T.muted }]} />
);

function SourceBlock({ color, tag, icon, cost, costSub, onRemove, children }: {
  color: string; tag: string; icon: string; cost: string; costSub?: string; onRemove?: () => void; children: React.ReactNode;
}) {
  return (
    <View style={{ borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, borderLeftColor: color, borderRadius: 10, padding: 12, marginTop: 8, backgroundColor: T.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: color + '18', borderColor: color + '55', borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
          <Icon name={icon as any} size={11} color={color} />
          <Text style={{ fontSize: 10, fontWeight: '800', color, marginLeft: 3 }}>{tag}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={[{ fontSize: 13, fontWeight: '800', color: T.ink }, MONO]}>{cost}</Text>
        {onRemove ? (
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 8 }} accessibilityLabel="Remove line">
            <Icon name="close" size={16} color={T.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View>
      {costSub ? <Muted style={{ marginTop: 6, textAlign: 'right' }}>{costSub}</Muted> : null}
    </View>
  );
}

function PartyField({ label, value, placeholder, editable, onPress }: { label: string; value: string; placeholder: string; editable: boolean; onPress: () => void }) {
  return (
    <Field label={label} min={170} grow={2}>
      <TouchableOpacity disabled={!editable} onPress={onPress} style={[x.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, !editable && { backgroundColor: T.sub }]}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, color: value ? T.ink : T.muted, fontWeight: value ? '700' : '400' }}>{value || placeholder}</Text>
        {editable ? <Icon name="expand-more" size={18} color={T.muted} /> : null}
      </TouchableOpacity>
    </Field>
  );
}

/* --------------------------- costing (sheet + rates) --------------------------- */

function CostingSheet({ f }: { f: Row }) {
  const p = f.plan; const d = p.selectedDesign;
  const [linkOpen, setLinkOpen] = useState(false);
  const isNewRow = (r: Row) => String(r.design_costing_source || '').toUpperCase() === 'NEW';
  const opts = (f.costOptions || []).map((r: Row, i: number) => {
    const id = String(r.costing_id || r.costuid);
    const label = isNewRow(r)
      ? `${id} · ${formatLegacyDate(r.costdate) || '—'} · ₹${n(r.final_cost || r.finished_price || r.greige_price).toFixed(2)}/m${i === 0 ? ' · latest' : ''}`
      : `${r.costdsnname || d.dsnname || 'Costing'} · ${formatLegacyDate(r.costdate) || '—'}${r.sampleno ? ` · ${r.sampleno}` : ''}${i === 0 ? ' · latest' : ''}`;
    return { value: id, label, searchText: `${id} ${r.costdate || ''} ${r.sampleno || ''}`, row: r };
  });
  const selected = p.isNewDesignCosting
    ? String((f.newCostChoice && (f.newCostChoice.costing_id || f.newCostChoice.costuid)) || '')
    : String(p.effectiveLegacyCostUid || '');
  return (
    <Card style={{ padding: 12, marginBottom: 12 }}>
      <Kicker style={{ fontSize: 11, marginBottom: 6 }}>Costing sheet · select for this order</Kicker>
      {f.costNeedsMapping ? (
        <>
          <Banner tone="info" title={`${d.dsnname || d.dsncode} has no legacy costing link yet — link the matching costing design once.`} />
          {!f.readOnly ? <TouchableOpacity onPress={() => setLinkOpen(true)}><Text style={{ color: T.copper, fontWeight: '800', fontSize: 12 }}>Link costing design ›</Text></TouchableOpacity> : null}
        </>
      ) : (
        <SelectField label="" value={selected} options={opts} placeholder={f.costingLoading ? 'Loading cost sheets…' : 'Select a costing sheet…'}
          loading={f.costingLoading} disabled={f.readOnly}
          onChange={(v: string) => { const o = opts.find((x: Row) => x.value === v); if (o) f.chooseCosting(o.row); }} />
      )}
      <Muted style={{ fontSize: 9, marginTop: 5 }}>Rates below prefill from the selected sheet — still editable before authorization.</Muted>
      <ServerPicker<Row> open={linkOpen} eyebrow="COSTING" title="Link legacy costing design" placeholder="Search legacy design or sample"
        onClose={() => setLinkOpen(false)} load={f.searchCostSheets}
        keyOf={(r) => String(r.__mapping ? `${r.legacy_prpcode}-${r.legacy_dsncode}` : (r.costing_id || r.costuid))}
        render={(r) => ({ title: `${r.legacy_dsncode || r.costing_id || r.costuid} · ${r.legacy_dsnname || r.costdsnname || ''}`, sub: r.__mapping ? `${Number(r.costing_count || 0)} version(s)` : formatLegacyDate(r.costdate) })}
        onPick={async (r) => {
          if (!r.__mapping) { f.chooseCosting(r); setLinkOpen(false); return; }
          if (!(await confirmAsync('Link legacy costing design?', `${d.dsnname || d.dsncode} will be linked to ${r.legacy_dsncode} · ${r.legacy_dsnname || ''}.`, 'Link design'))) return;
          try { await f.linkCostDesign(r); } catch (e: any) { notifyAsync('Not linked', String(e?.message || e)); }
          setLinkOpen(false);
        }} />
    </Card>
  );
}

function InputRates({ f }: { f: Row }) {
  const [open, setOpen] = useState(true);
  const e = f.engine; const r = f.rates; const p = f.plan;
  if (!e || !r) return null;
  const edit = !f.readOnly;
  const set = (k: string, v: string) => f.setRates({ ...r, [k]: v });
  const setP = (k: string, v: string) => f.setRates({ ...r, price: { ...r.price, [k]: v } });
  const setD = (k: string, v: string) => f.setRates({ ...r, dye: { ...r.dye, [k]: v } });
  const isPD = e.designType === 'PD';
  const fin = p.finishRequirement;
  return (
    <Card style={{ paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 }}>
      <TouchableOpacity onPress={() => setOpen((o) => !o)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Kicker style={{ fontSize: 11, marginBottom: 0 }}>Input rates · verify / edit</Kicker>
        <Text style={{ color: T.copper, fontSize: 12, fontWeight: '700' }}>{open ? 'Hide' : 'Edit'}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 10, color: T.muted, fontWeight: '700', marginVertical: 2 }}>Yarn rates (₹/kg)</Text>
          {e.yarns.map((y: Row) => (
            <View key={y.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: T.alt }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 11, color: T.ink }}>{y.name}</Text>
              <RateInput value={r.price[y.key] ?? ''} onChange={(v) => setP(y.key, v)} editable={edit} width={72} />
              {!isPD ? <RateInput value={r.dye[y.key] ?? ''} onChange={(v) => setD(y.key, v)} editable={edit} width={60} /> : null}
            </View>
          ))}
          {!isPD ? <Text style={{ fontSize: 8.5, color: T.muted, textAlign: 'right', marginTop: 2 }}>price · dyeing</Text> : null}
          <View style={{ height: 6 }} />
          <RR label="Weaving rate (₹/pick)" value={r.weavingRate} onChange={(v) => set('weavingRate', v)} editable={edit} />
          {fin ? <RR label="Processing / finishing (₹/m)" value={r.dyeingProc} onChange={(v) => set('dyeingProc', v)} editable={edit} /> : null}
          {fin ? <RR label="Finished brokerage" pct value={r.finishedBrok} onChange={(v) => set('finishedBrok', v)} editable={edit} /> : null}
          {fin ? <RR label="Cut & pack (₹/m)" value={r.cutPack} onChange={(v) => set('cutPack', v)} editable={edit} /> : null}
          {!fin ? <RR label="Greige brokerage" pct value={r.greigeBrok} onChange={(v) => set('greigeBrok', v)} editable={edit} /> : null}
          {isPD && fin ? (
            <View style={{ backgroundColor: T.sub, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 9, marginTop: 6 }}>
              <Muted style={{ fontSize: 9.5 }}>Piece-dyed fabric — dyeing is included in the processing / finishing charge.</Muted>
            </View>
          ) : null}
          {edit && ratesEdited(e, r) ? (
            <TouchableOpacity onPress={() => f.setRates(e.initial)} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: T.copper }}>Reset to sheet rates</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function Breakup({ f }: { f: Row }) {
  const p = f.plan; const b = f.breakup; const fin = p.finishRequirement;
  return (
    <Card style={{ paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 }}>
      <Kicker style={{ fontSize: 11, marginBottom: 4 }}>Costing breakup · auto-derived</Kicker>
      {f.costingLoading ? <Loading label="Loading selected costing…" /> : null}
      {f.costingError ? <Banner tone="err" title={f.costingError} style={{ marginBottom: 0 }} /> : null}
      {f.engineNote ? <Muted style={{ color: '#9A6B12' }}>{f.engineNote}</Muted> : null}
      {b ? (
        <>
          <BL label="Yarn cost" val={b.yarnCost} />
          <BL label="Dyeing cost (yarn)" val={b.dyeCost} />
          <BL label="Weaving cost" val={b.weavingCost} />
          <BL label="Total greige cost" val={b.greigeMfg} strong top accent={STORE} />
          {fin ? (
            <>
              <BL label="Shrinkage gross-up" val={b.shrinkImpact} />
              <BL label="Processing / finishing" val={b.dyeingProc} />
              {b.finBrokAmt > 0 ? <BL label="Finished brokerage" val={b.finBrokAmt} /> : null}
              {b.cutPack > 0 ? <BL label="Cut & pack" val={b.cutPack} /> : null}
              <BL label="Total finished cost" val={b.finishedPrice} strong top accent={T.copper} />
            </>
          ) : b.greigeBrokAmt > 0 ? (
            <>
              <BL label="Greige brokerage" val={b.greigeBrokAmt} />
              <BL label="Greige price" val={b.greigePrice} strong top accent={T.copper} />
            </>
          ) : null}
          <Muted style={{ fontSize: 9.5, marginTop: 7 }}>
            Derived from the rates above — figures recalculate as you edit. {fin ? 'Authorization is on finished cost; greige cost is internal.' : 'Authorization is on greige cost.'}
          </Muted>
        </>
      ) : p.costingReady ? (
        <>
          <BL label="Total greige cost" val={p.plannedGreigeCost} strong accent={STORE} />
          {fin ? <BL label="Total finished cost" val={p.plannedFinishedCost} strong top accent={T.copper} /> : null}
          <Muted style={{ fontSize: 9.5, marginTop: 7 }}>
            {p.finishRequirement ? 'Finish' : 'Warp'} shrink {p.recipeValid ? `${Number(p.appliedRecipeShrink).toFixed(2)}%` : '—'} · saved totals of the selected sheet (rate detail is available for design costings).
          </Muted>
        </>
      ) : !f.costingLoading && !f.costingError ? <Muted>Select and load a costing sheet to calculate the commercial preview.</Muted> : null}
    </Card>
  );
}

/* --------------------------------- sourcing --------------------------------- */

function Sourcing({ f, narrow }: { f: Row; narrow: boolean }) {
  const p = f.plan; const b = f.breakup; const e = f.engine;
  const edit = !f.readOnly;
  const [picker, setPicker] = useState<{ kind: 'job' | 'purchase'; id: string } | null>(null);
  const loadParties = useCallback((q: string) => fetchParties(f.api, f.ctx, picker?.kind === 'purchase' ? 'purchase' : 'job', q), [f.api, f.ctx, picker?.kind]);

  // Template rows like the artifact (zero-metre rows are ignored on save).
  useEffect(() => {
    if (!edit) return;
    if (!f.jobList.length) f.addJob();
    if (!f.purchaseList.length) f.addPurchase();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const picks = e ? e.ppiTable : 0;
  const yarnM = b ? b.rm : null; // yarn incl. yarn dyeing, ₹ per greige metre
  const inRate = n(f.inhouseRate);
  const inCost = yarnM !== null ? yarnM + inRate * picks : null;
  const jobCost = (r: Row) => (yarnM !== null ? yarnM + n(r.pickRate) * picks : null);
  const netBack = p.weightedGreigeNetBack as number | null;

  const inQty = p.inhouseQty as number;
  const lines: { label: string; qty: number; cost: number | null }[] = [
    { label: 'In-house', qty: inQty, cost: inCost },
    ...f.jobList.map((r: Row) => ({ label: r.parname || 'Job work', qty: n(r.qty), cost: jobCost(r) })),
    ...f.purchaseList.map((r: Row) => ({ label: r.parname || 'Greige purchase', qty: n(r.qty), cost: n(r.rate) || null })),
  ].filter((l) => l.qty > 0);
  const priced = lines.filter((l) => l.cost !== null);
  const pricedQty = priced.reduce((s, l) => s + l.qty, 0);
  const totalCost = priced.reduce((s, l) => s + l.qty * (l.cost as number), 0);
  const wtdCost = pricedQty > 0 ? totalCost / pricedQty : null;
  const margin = wtdCost !== null && netBack !== null ? netBack - wtdCost : null;
  const marginPct = margin !== null && wtdCost ? (margin / wtdCost) * 100 : null;
  const losing = netBack !== null ? priced.filter((l) => (l.cost as number) > netBack) : [];
  const balance = () => f.setInhouseQty(String(Math.max(0, round3(p.totalQty - p.jobQty - p.purchaseQty))));
  const money0 = (v: number) => `₹${fmt(Math.round(v * 100) / 100, 2)}`;

  return (
    <Card style={{ paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: T.ink }}>Sourcing · where the {fmt(p.totalQty)} m greige come from</Text>
          <Muted style={{ fontSize: 9.5, marginTop: 2 }}>
            {e && b
              ? `Recipe: yarn ₹${b.rm.toFixed(2)}/m (take-up ${e.takeUpPct}%, warp waste ${e.warpWastePct}%, weft waste ${e.weftWastePct}%) · ${picks} picks on the table${p.finishRequirement ? ' · finishing shortage applied in the greige requirement' : ''}`
              : 'Source costs compare once a design costing sheet with yarn lines is selected.'}
          </Muted>
        </View>
        {edit ? <TouchableOpacity onPress={balance}><Text style={{ color: T.copper, fontSize: 11, fontWeight: '800' }}>Balance in-house ›</Text></TouchableOpacity> : null}
      </View>

      <SourceBlock color={T.green} tag="In-house" icon="settings"
        cost={inCost !== null ? `${rM(inCost)}/m = ${money0(inCost * inQty)}` : '—'}
        costSub={inCost !== null ? `yarn ₹${(yarnM as number).toFixed(2)} + weaving ₹${(inRate * picks).toFixed(2)}` : undefined}>
        <Field label="Metres"><Box value={f.inhouseTouched ? String(inQty) : String(round3(inQty))} onChange={(v) => f.setInhouseQty(decimalOnly(v))} editable={edit} /></Field>
        <Field label="Weaving charge ₹/pick"><Box value={String(f.inhouseRate ?? '')} onChange={(v) => f.setInhouseRate(decimalOnly(v))} editable={edit} /></Field>
      </SourceBlock>

      {f.jobList.map((r: Row) => {
        const c = jobCost(r);
        const issueKg = r.yarnFrom !== 'BOUGHT' && e ? e.yarns.reduce((s: number, y: Row) => s + y.kg, 0) * n(r.qty) * (1 + n(r.tolPct) / 100) : 0;
        return (
          <SourceBlock key={r.id} color={T.blue} tag="Job work" icon="handyman" onRemove={edit ? () => f.removeJob(r.id) : undefined}
            cost={c !== null ? `${rM(c)}/m` : '—'}
            costSub={c !== null ? `yarn ₹${(yarnM as number).toFixed(2)} + ₹${(n(r.pickRate) * picks).toFixed(2)} weaving${issueKg > 0 ? ` · issue ${fmt(issueKg, 1)} kg yarn incl. ${n(r.tolPct)}%` : ''}${r.yarnFrom === 'BOUGHT' ? ' · yarn billed by job worker' : ''}` : undefined}>
            <Field label="Metres"><Box value={String(r.qty ?? '')} onChange={(v) => f.updateJob(r.id, { qty: decimalOnly(v) })} editable={edit} placeholder="0" /></Field>
            <PartyField label="Job worker" value={r.parname} placeholder="party name" editable={edit} onPress={() => setPicker({ kind: 'job', id: r.id })} />
            <Field label="Agreed ₹/pick"><Box value={String(r.pickRate ?? '')} onChange={(v) => f.updateJob(r.id, { pickRate: decimalOnly(v) })} editable={edit} placeholder="0" /></Field>
            <Field label="Yarn from" min={190}>
              <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: T.border, borderRadius: 8, padding: 3, gap: 3 }}>
                {[['OUR', 'Our stock'], ['BOUGHT', 'Bought & delivered']].map(([k, l]) => {
                  const on = (r.yarnFrom || 'OUR') === k;
                  return (
                    <TouchableOpacity key={k} disabled={!edit} onPress={() => f.updateJob(r.id, { yarnFrom: k })}
                      style={{ flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center', backgroundColor: on ? T.purple : 'transparent' }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: on ? '#fff' : T.muted }}>{l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>
            <Field label="Yarn tolerance %"><Box value={String(r.tolPct ?? '')} onChange={(v) => f.updateJob(r.id, { tolPct: decimalOnly(v) })} editable={edit} placeholder="0" /></Field>
          </SourceBlock>
        );
      })}
      {edit ? (
        <TouchableOpacity onPress={f.addJob} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: T.blue }}>+ Add job worker</Text>
        </TouchableOpacity>
      ) : null}

      {f.purchaseList.map((r: Row) => (
        <SourceBlock key={r.id} color={T.amber} tag="Greige purchase" icon="inventory-2" onRemove={edit ? () => f.removePurchase(r.id) : undefined}
          cost={`${rM(n(r.rate))}/m`} costSub={`GST ${rM(n(r.rate) * n(r.gstPct) / 100)}/m shown separately, not in the comparison`}>
          <Field label="Metres"><Box value={String(r.qty ?? '')} onChange={(v) => f.updatePurchase(r.id, { qty: decimalOnly(v) })} editable={edit} placeholder="0" /></Field>
          <PartyField label="Supplier" value={r.parname} placeholder="supplier" editable={edit} onPress={() => setPicker({ kind: 'purchase', id: r.id })} />
          <Field label="Rate ₹/m ex-GST"><Box value={String(r.rate ?? '')} onChange={(v) => f.updatePurchase(r.id, { rate: decimalOnly(v) })} editable={edit} placeholder="0" /></Field>
          <Field label="GST %"><Box value={String(r.gstPct ?? '')} onChange={(v) => f.updatePurchase(r.id, { gstPct: decimalOnly(v) })} editable={edit} placeholder="0" /></Field>
        </SourceBlock>
      ))}
      {edit ? (
        <TouchableOpacity onPress={f.addPurchase} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: T.amber }}>+ Add greige purchase</Text>
        </TouchableOpacity>
      ) : null}

      <View style={{ backgroundColor: T.sub, borderRadius: 9, padding: 11, marginTop: 10 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {[
            ['Allocated', `${fmt(p.allocatedQty)} / ${fmt(p.totalQty)} m`, p.allocationBalanced ? T.green : T.red],
            ['Wtd avg cost', wtdCost !== null ? `${rM(wtdCost)}/m` : '—', T.ink],
            ['Wtd avg net-back', netBack !== null ? `${rM(netBack)}/m` : '—', T.copper],
            ['Expected margin', margin !== null ? `${rM(margin)}/m · ${Number(marginPct || 0).toFixed(1)}%` : '—', margin !== null && margin < 0 ? T.red : T.green],
            ['Total cost', priced.length ? money0(totalCost) : '—', T.ink],
          ].map(([l, v, c]) => (
            <View key={l as string}>
              <Text style={{ fontSize: 8, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.3 }}>{l}</Text>
              <Text style={[{ fontSize: narrow ? 12 : 13, fontWeight: '800', color: c as string, marginTop: 1 }, MONO]}>{v}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 10.5, fontWeight: '700', marginTop: 8, color: !p.allocationBalanced ? T.red : losing.length ? '#9A6B12' : T.green }}>
          {!p.allocationBalanced
            ? `Allocated ${fmt(p.allocatedQty)} of ${fmt(p.totalQty)} m — use "Balance in-house".`
            : losing.length
              ? `⚠ ${losing.map((l) => l.label).join(', ')} cost${losing.length === 1 ? 's' : ''} more than the net-back`
              : netBack !== null ? '✓ Allocation balanced, every source covered by the net-back' : '✓ Allocation balanced'}
        </Text>
      </View>

      <ServerPicker<Row> open={!!picker} eyebrow="SOURCING" title={picker?.kind === 'purchase' ? 'Greige supplier' : 'Job worker'}
        placeholder="Search party name or code" onClose={() => setPicker(null)} load={loadParties}
        keyOf={(r) => String(r.parcode)} render={(r) => ({ title: String(r.parname), sub: String(r.parcode) })}
        onPick={(r) => {
          if (picker) (picker.kind === 'job' ? f.updateJob : f.updatePurchase)(picker.id, { parcode: String(r.parcode), parname: r.parname });
          setPicker(null);
        }} />
    </Card>
  );
}

/* ------------------------------- review step ------------------------------- */

export default function ReviewStep({ f, narrow }: { f: Row; narrow: boolean }) {
  const p = f.plan; const d = p.selectedDesign;
  const owner = f.poOwners.find((o: Row) => String(o.parcode) === String(f.poOwnerCode));
  const headline = p.finishRequirement ? p.plannedFinishedCost : p.plannedGreigeCost;
  const below = useMemo(() => p.belowCostLines || [], [p.belowCostLines]);

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <Tag label={String(d.dsnname || d.dsncode || 'Stock')} />
        <Text style={{ fontSize: 16, fontWeight: '800', color: T.ink, flex: 1 }} numberOfLines={1}>{d.dsnname || 'Stock production'}</Text>
        <Badge label={p.finishRequirement ? 'FINISHED' : 'GREIGE'} color={p.finishRequirement ? T.copper : STORE} />
      </View>
      <Text style={[{ fontSize: 11, color: T.muted, marginBottom: 12 }, MONO]}>
        {p.finishRequirement && p.baseQty > 0 ? `${fmt(p.baseQty)} m finished · ` : ''}{fmt(p.totalQty)} m greige required
      </Text>

      {d.dsncode ? <CostingSheet f={f} /> : null}
      <InputRates f={f} />
      {d.dsncode ? <Breakup f={f} /> : null}

      {p.costingReady ? (
        <Card style={{ paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12, borderColor: p.greigeBelowCost ? T.red + '66' : T.border }}>
          <Kicker style={{ fontSize: 11, marginBottom: 8 }}>Realisation per greige metre · planned{owner ? ` · ${owner.parname}` : ''}</Kicker>
          <Grid cols={3} narrow={narrow} gap={8}>
            <Cell2 label="Greige cost" value={rM(p.plannedGreigeCost)} />
            <Cell2 label="Wtd avg sale · net-back" value={f.sourceMode === 'sales' && p.weightedGreigeNetBack !== null ? rM(p.weightedGreigeNetBack) : '—'} hi />
            <Cell2 label="Planned margin" value={f.sourceMode === 'sales' && p.greigeBasisMargin !== null ? `${rM(p.greigeBasisMargin)} · ${Number(p.greigeBasisMarginPct || 0).toFixed(1)}%` : 'no SO'} />
          </Grid>
          {p.saleLines.map((r: Row, i: number) => (
            <View key={`${rowKey(r)}-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: T.alt }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: T.ink }}>{r.sono || r.jono || `SO ${i + 1}`} <Text style={{ color: T.muted, fontWeight: '500' }}>· {r.sexename || r.sexecode || '—'}</Text></Text>
                <Text style={[{ fontSize: 9.5, color: T.muted }, MONO]}>{fmt(r.qty)} m {p.finishRequirement ? 'finished' : 'greige'}{p.recipeApplied ? ` = ${fmt(r.greigeEq)} m greige · net-back ${rM(r.netBack)}` : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[{ fontSize: 10.5, color: T.ink }, MONO]}>{rM(r.rate)} vs {rM(r.ownCost)} <Text style={{ fontSize: 9, color: T.muted }}>{p.finishRequirement ? 'fin' : 'greige'}</Text></Text>
                <Text style={[{ fontSize: 10.5, fontWeight: '800', color: r.ownMargin >= 0 ? T.green : T.red }, MONO]}>{r.ownMargin >= 0 ? '+' : ''}{rM(r.ownMargin)}/m own basis</Text>
              </View>
            </View>
          ))}
          {p.stockMetersQty > 0 ? (
            <View style={{ marginTop: 8, backgroundColor: '#F1EAF8', borderRadius: 7, paddingVertical: 6, paddingHorizontal: 9 }}>
              <Text style={{ fontSize: 10.5, color: '#7A5AA0', fontWeight: '700' }}>Stock {fmt(p.stockMetersQty)} m carved out — planned at cost, no realisation until sold.</Text>
            </View>
          ) : null}
          {p.greigeBelowCost ? <Text style={{ marginTop: 8, fontSize: 10.5, color: T.red, fontWeight: '800' }}>⚠ Weighted sale is below greige cost — approval is allowed; the order carries a BELOW COST flag.</Text> : null}
          {p.finishRequirement ? (
            <Muted style={{ fontSize: 9.5, marginTop: 7 }}>
              Finished lines net back to greige: (sale rate − finishing add-on per finished m) × (1 − finish shrink); greige lines as is; weighted by greige-equivalent metres. These figures freeze at approval.
            </Muted>
          ) : null}
        </Card>
      ) : null}

      {p.costingReady && f.sourceMode === 'sales' ? (
        <Card style={{ paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 8.5, color: T.muted, fontWeight: '800', textTransform: 'uppercase' }}>Wtd avg SO price</Text>
              <Text style={[{ fontSize: 15, fontWeight: '700', color: T.ink }, MONO]}>{rM(p.weightedRate)}/m</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 8.5, color: T.muted, fontWeight: '800', textTransform: 'uppercase' }}>{p.finishRequirement ? 'Finished cost' : 'Greige cost'}</Text>
              <Text style={[{ fontSize: 15, fontWeight: '700', color: T.ink }, MONO]}>{rM(headline)}/m</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 8.5, color: T.muted, fontWeight: '800', textTransform: 'uppercase' }}>Margin</Text>
              <Text style={[{ fontSize: 15, fontWeight: '800', color: p.weightedRate - headline >= 0 ? T.green : T.red }, MONO]}>{rM(p.weightedRate - headline)}/m</Text>
            </View>
          </View>
          {below.length > 0 ? (
            <View style={{ marginTop: 10, backgroundColor: T.red + '0E', borderWidth: 1, borderColor: T.red + '33', borderRadius: 8, padding: 9 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: T.red, marginBottom: 5 }}>⚠ {below.length} SO booked below costing</Text>
              {below.map((o: Row, i: number) => (
                <View key={`${rowKey(o)}-b${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 10.5, color: T.ink }}>{o.sono || o.jono}</Text>
                  <Text style={[{ fontSize: 10.5, color: T.red }, MONO]}>{rM(o.rate)} &lt; {rM(o.ownCost)}</Text>
                </View>
              ))}
              <Muted style={{ fontSize: 9.5, marginTop: 4 }}>Not blocked — flagged for your approval.</Muted>
            </View>
          ) : null}
        </Card>
      ) : null}

      {p.totalQty > 0 ? <Sourcing f={f} narrow={narrow} /> : null}
    </>
  );
}
