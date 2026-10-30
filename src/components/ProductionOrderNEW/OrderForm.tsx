// FILE: src/components/ProductionOrderNEW/OrderForm.tsx
// New / edit / view Production Order — SO based or Stock & sell, then
// "Review costing & authorize". Same flow and rules as the web
// SudamoProductionOrderDetailNew, plus the Job work out card.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Api, Ctx, fetchGroups, searchDesigns } from './api';
import { decimalOnly, digitsOnly, fmt, formatLegacyDate, rM, Row, rowKey } from './format';
import ReviewStep from './ReviewStep';
import useOrderForm from './useOrderForm';
import {
  Badge, Banner, BigBtn, Card, Cell2, CheckBox, confirmAsync, CONTENT_W, Grid, Kicker, Loading, Muted, notifyAsync,
  NumInput, Pill, ServerPicker, SmallBtn, Switch2, Tag, x,
} from './ui';

const tab = { fontVariant: ['tabular-nums' as const] };

function ExecPick({ f, hint }: { f: Row; hint: string }) {
  const [more, setMore] = useState(false);
  const sel = f.poOwners.find((o: Row) => String(o.parcode) === String(f.poOwnerCode));
  const base: Row[] = sel ? [sel, ...f.poOwners.filter((o: Row) => o !== sel)] : f.poOwners;
  const shown = more ? base : base.slice(0, 12);
  return (
    <View style={{ marginTop: 10 }}>
      <Kicker style={{ marginBottom: 5 }}>Executive (PO owner)</Kicker>
      {f.ownerLoading ? <Loading label="Loading PO owners…" /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {shown.map((o) => (
            <Pill key={o.parcode} label={o.parname} active={String(f.poOwnerCode) === String(o.parcode)}
              disabled={f.readOnly} onPress={() => f.setPoOwnerCode(String(o.parcode))} />
          ))}
          {base.length > 12 ? <Pill label={more ? 'Less' : `More (${base.length - 12})`} onPress={() => setMore((m) => !m)} /> : null}
          {base.length === 0 ? <Muted style={{ color: T.amber }}>No PO Owner found. The SO executive is used when available.</Muted> : null}
        </View>
      )}
      <Muted style={{ fontSize: 9 }}>{hint}</Muted>
    </View>
  );
}

function CovBanner({ p }: { p: Row }) {
  if (!(p.bookedSoQty > 0)) return null;
  const d = p.coverageDiff;
  return (
    <Banner tone={d === 0 ? 'ok' : d > 0 ? 'err' : 'warn'}
      title={d > 0 ? `⚠ Planned production exceeds SO booked by ${fmt(d)} m`
        : d < 0 ? `▽ SO booked exceeds planned by ${fmt(-d)} m — under-planned` : `✓ Planned matches SO booked (${fmt(p.bookedSoQty)} m)`}
      sub={`SO ${fmt(p.bookedSoQty)} m · planned ${fmt(p.plannedSoQty)} m`} />
  );
}

function SummaryCard({ f, narrow }: { f: Row; narrow: boolean }) {
  const p = f.plan;
  const d = p.selectedDesign;
  return (
    <Card style={{ padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <Tag label={String(d.dsnname || d.dsncode || '')} />
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', flex: 1, color: T.ink }}>{d.dsnname || d.dsncode}</Text>
        <Text style={{ fontSize: 10, color: T.muted }}>{f.selectedOrders.length} SO · {p.finishRequirement ? 'finished' : 'greige'}</Text>
      </View>
      <Grid narrow={narrow}>
        <Cell2 label={p.finishRequirement ? 'Finished SO qty' : 'Greige SO qty'} value={`${fmt(p.baseQty)} m`} />
        <Cell2 label="Greige qty required" value={`${fmt(p.totalQty)} m`} hi />
        <Cell2 label="Wtd avg sales price" value={`${rM(p.weightedRate)}/m`} />
        {!p.finishRequirement ? <Cell2 label="Design warp shrink" value={p.greigeSoRequirement && p.recipeValid ? `${Number(p.recipeWarpShrink).toFixed(2)}%` : '—'} /> : null}
        {p.stockMetersQty > 0 ? <Cell2 label="Stock (no SO)" value={`${fmt(p.stockMetersQty)} m`} /> : null}
      </Grid>
      {p.recipeApplied ? (
        <Muted style={{ fontSize: 9.5 }}>
          Greige required = {p.finishRequirement ? 'finished' : 'greige SO'} {fmt(p.baseQty)} m ÷ (1 − {Number(p.appliedRecipeShrink).toFixed(2)}% {p.finishRequirement ? 'finish' : 'warp'} shrink)
          {p.stockMetersQty > 0 ? ` + ${fmt(p.stockMetersQty)} m stock` : ''} · from {p.recipeSource === 'LEGACY_COSTING' ? 'the selected costing sheet' : 'the design recipe'}.
        </Muted>
      ) : null}
      <Muted style={{ fontSize: 9.5, marginTop: 6 }}>Full costing breakup, input rates & margin are shown on the next step — review before you authorize.</Muted>
    </Card>
  );
}

function SalesSection({ f, narrow }: { f: Row; narrow: boolean }) {
  const [designOpen, setDesignOpen] = useState(false);
  // Same request as the web: greige store resolved by /show (main.greystrcode),
  // because web_groups filters SO lines by d1.StrCode = strcode.
  const loadGroups = useCallback(async (q: string, page: number) => {
    const r = await fetchGroups(f.api, f.ctx, { strcode: f.storeCode, search: q, page, perPage: 25, orderSource: f.stockType, uid: f.recordUid });
    return { rows: r.groups, more: page < Number(r.pagination.last_page || 1), total: Number(r.pagination.total || r.groups.length) };
  }, [f.api, f.ctx, f.storeCode, f.stockType, f.recordUid]);
  const g: Row | null = f.selectedGroup;
  // Web label: `${dsncode} · ${dsnname}${fabric}`
  const designLabel = (r: Row) => `${r.dsncode} · ${r.dsnname || 'Design'}${r.fabric_type ? ` · ${String(r.fabric_type).toUpperCase()}` : ''}`;
  const label = g ? designLabel(g) : (f.loading ? 'Loading…' : 'Select design…');
  const p = f.plan;
  return (
    <>
      <TouchableOpacity disabled={f.readOnly || f.loading} onPress={() => setDesignOpen(true)}
        style={{ borderWidth: 1.5, borderColor: g ? T.ink : T.border, borderRadius: 8, backgroundColor: T.surface, paddingVertical: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: T.ink }}>{label}</Text>
        <Icon name="expand-more" size={20} color={T.muted} />
      </TouchableOpacity>
      <ServerPicker<Row> open={designOpen} eyebrow="SO BASED" title="Select design" placeholder="Type design name or code…"
        onClose={() => setDesignOpen(false)} load={loadGroups} keyOf={(r) => String(r.key)}
        emptyText="No eligible designs with pending orders."
        render={(r) => ({ title: designLabel(r), sub: `${r.order_count || (r.orders || []).length} SO · ${fmt(r.total_qty || 0)} m available` })}
        onPick={(r) => { f.chooseGroup(r); setDesignOpen(false); }} />

      {!g ? (
        <Card style={{ padding: 26 }}>
          <Muted style={{ textAlign: 'center', fontSize: 11 }}>Pick a design to see its sales orders. Only SOs of one design can be combined.</Muted>
        </Card>
      ) : (
        <>
          <Kicker style={{ marginLeft: 2 }}>{f.stockType === 'P' ? 'Select job orders' : 'Select sales orders'}</Kicker>
          {(g.orders || []).map((order: Row) => {
            const key = rowKey(order);
            const picked = f.selectedOrders.find((r: Row) => rowKey(r) === key);
            const maxQty = Number(order.available_qty || order.qty || 0);
            const fab = String(order.fabric_type || '').toUpperCase();
            return (
              <Card key={key} highlight={!!picked} style={{ paddingVertical: 11, paddingHorizontal: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <CheckBox checked={!!picked} disabled={f.readOnly} onPress={() => f.toggleOrder(order)} />
                  <TouchableOpacity style={{ flex: 1, minWidth: 0 }} disabled={f.readOnly} onPress={() => f.toggleOrder(order)}>
                    <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '800', color: T.ink }}>
                      {order.sono} <Text style={{ fontSize: 10.5, fontWeight: '400', color: T.muted }}>· {order.parname}</Text>
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: 9.5, color: T.muted, marginTop: 1 }}>
                      {order.shdname ? `${order.shdname} · ` : ''}{order.sexename ? `${order.sexename} · ` : ''}
                      <Text style={{ fontWeight: '800', color: fab === 'GREIGE' ? T.green : T.copper }}>{fab === 'FINISH' ? 'FINISHED' : fab}</Text>
                    </Text>
                  </TouchableOpacity>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[{ fontSize: 12.5, fontWeight: '700', color: T.ink }, tab]}>{fmt(maxQty)} m</Text>
                    <Text style={[{ fontSize: 9.5, color: T.blue }, tab]}>{rM(order.rate)}/m</Text>
                  </View>
                </View>
                {picked ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 30, gap: 8 }}>
                    <Muted>Take</Muted>
                    <NumInput value={String(picked.qty)} editable={!f.readOnly} onChangeText={(v) => f.setOrderQty(order, v)} style={{ width: 110 }} />
                    <Muted>of {fmt(maxQty)} m</Muted>
                  </View>
                ) : null}
              </Card>
            );
          })}

          <Card style={{ padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: T.ink }}>
                Add stock metres <Text style={{ fontSize: 9.5, fontWeight: '400', color: T.muted }}>(greige · no SO · carved out separately)</Text>
              </Text>
              <NumInput value={f.stockMetersTouched ? f.stockMeters : '0'} editable={!f.readOnly}
                onChangeText={(v) => f.setStockMeters(digitsOnly(v))} style={{ width: 110 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 9 }}>
              <Text style={{ flex: 1, fontSize: 12, color: T.ink }}>Selling rate (₹/m)</Text>
              <View style={{ width: 110 }}>
                <NumInput value={f.salesSellingRate} placeholder="0" editable={!f.readOnly}
                  onChangeText={(v) => f.setSalesSellingRate(decimalOnly(v))} />
              </View>
            </View>
            <ExecPick f={f} hint="Owner of this PO in the design's monthly pool — sale lines follow their own SO's executive; the stock portion is tracked against the owner." />
          </Card>

          {f.selectedOrders.length > 0 || p.stockMetersQty > 0 ? (
            <>
              <CovBanner p={p} />
              <SummaryCard f={f} narrow={narrow} />
            </>
          ) : null}
        </>
      )}
    </>
  );
}

function SelfSection({ f, narrow }: { f: Row; narrow: boolean }) {
  const [open, setOpen] = useState(false);
  const p = f.plan;
  const loadDesigns = useCallback((q: string) => searchDesigns(f.api, f.ctx, q), [f.api, f.ctx]);
  const row = (label: string, input: React.ReactNode) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 9, gap: 10 }}>
      <Text style={{ flex: 1, fontSize: 12, color: T.ink }}>{label}</Text>
      <View style={{ width: narrow ? 130 : 180 }}>{input}</View>
    </View>
  );
  return (
    <>
      <Card style={{ padding: 12, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: T.ink }}>{f.selfDesign.dsncode ? `${f.selfDesign.dsnname || 'Design'} · ${f.selfDesign.dsncode}` : 'Design optional'}</Text>
          {!f.readOnly ? <SmallBtn label={f.selfDesign.dsncode ? 'Change' : 'Select design'} onPress={() => setOpen(true)} /> : null}
          {!f.readOnly && f.selfDesign.dsncode ? <SmallBtn label="Clear" tone="copper" onPress={() => { f.setSelfDesign({}); f.setSelfGreigeQtyInput(''); }} /> : null}
        </View>
      </Card>
      <ServerPicker<Row> open={open} eyebrow="STOCK & SELL" title="Select design" onClose={() => setOpen(false)} load={loadDesigns}
        emptyText="No designs found." keyOf={(d) => String(d.dsncode)}
        render={(d) => ({ title: `${d.dsnname} · ${d.dsncode}`, sub: [d.itmname, d.shdname, d.gf_shrink != null ? `GF shrink ${Number(d.gf_shrink).toFixed(2)}%` : ''].filter(Boolean).join(' · ') })}
        onPick={(d) => { f.setSelfDesign({ ...d, gf_shrink: Number(d.gf_shrink || 0) }); setOpen(false); }} />

      <Switch2 options={[['Finish', 'Finished'], ['Greige', 'Greige only']]} value={f.selfFabricType} disabled={f.readOnly}
        onChange={(v) => { f.setSelfFabricType(v); f.setBaseQtyInput(''); f.setSelfGreigeQtyInput(''); }} />

      <Card style={{ padding: 14, marginBottom: 10 }}>
        {f.selfFabricType === 'Finish' ? row('Finished qty (m)', <NumInput value={f.baseQtyInput} editable={!f.readOnly} onChangeText={(v) => f.setBaseQtyInput(digitsOnly(v))} />) : null}
        {row('Greige qty (m)', <NumInput editable={!f.readOnly}
          value={f.selfFabricType === 'Greige' ? f.baseQtyInput : f.selfGreigeQtyInput}
          placeholder={f.selfFabricType === 'Finish' && p.selfAutoGreigeQty > 0 ? String(p.selfAutoGreigeQty) : '0'}
          onChangeText={(v) => (f.selfFabricType === 'Greige' ? f.setBaseQtyInput : f.setSelfGreigeQtyInput)(digitsOnly(v))} />)}
        {!f.selfDesign.dsncode && f.selfFabricType === 'Finish' ? row('Finished costing (₹/m)', <NumInput value={f.selfFinishedCost} editable={!f.readOnly} onChangeText={(v) => f.setSelfFinishedCost(decimalOnly(v))} />) : null}
        {!f.selfDesign.dsncode && f.selfFabricType === 'Greige' ? row('Greige costing (₹/m)', <NumInput value={f.selfGreigeCost} editable={!f.readOnly} onChangeText={(v) => f.setSelfGreigeCost(decimalOnly(v))} />) : null}
        {row('Selling rate (₹/m)', <NumInput
          value={f.selfFabricType === 'Greige' ? f.selfGreigeSellingRate : f.selfFinishedSellingRate}
          placeholder="0" editable={!f.readOnly}
          onChangeText={(v) => (f.selfFabricType === 'Greige' ? f.setSelfGreigeSellingRate : f.setSelfFinishedSellingRate)(decimalOnly(v))}
        />)}
        {f.selfDesign.dsncode && f.selfFabricType === 'Finish' ? <Muted>Auto greige (from {Number(p.selfGf).toFixed(2)}% shrink): {fmt(p.selfAutoGreigeQty)} m — override above if needed.</Muted> : null}
        {!f.selfDesign.dsncode && f.selfFabricType === 'Finish' ? <Muted>Finished fabric — only finished costing is needed. Greige cost is derived internally.</Muted> : null}
        <ExecPick f={f} hint="Stock PO — tracked in the design's monthly pool against this executive; a sale later needs an SO, a job outward needs this PO." />
      </Card>
    </>
  );
}

export default function OrderForm({ api, ctx, mode, uid, onBack, onSaved }: {
  api: Api; ctx: Ctx; mode: 'add' | 'edit' | 'view'; uid: any; onBack: () => void; onSaved: (uid: any) => void;
}) {
  const { width } = useWindowDimensions();
  const narrow = width < 600;
  const f: Row = useOrderForm({ api, ctx, mode, uid });
  const p = f.plan;

  const submit = async () => {
    try {
      const r = await f.save();
      await notifyAsync('Saved', r.message);
      onSaved(r.uid);
    } catch (e: any) { notifyAsync('Not saved', String(e?.message || e)); }
  };

  const reason = (msg: string) => msg ? <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309', textAlign: 'center', marginTop: 2, marginBottom: 8 }}>{msg}</Text> : null;
  const directCreate = f.sourceMode === 'self' && !f.selfDesign.dsncode;
  const title = f.reviewStep ? 'Edit selection' : 'Production orders';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 14, paddingBottom: 120, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: CONTENT_W }}>
        <TouchableOpacity onPress={() => (f.reviewStep ? f.setReviewStep(false) : onBack())} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, alignSelf: 'flex-start' }}>
          <Icon name="chevron-left" size={18} color={T.copper} />
          <Text style={{ color: T.copper, fontSize: 13, fontWeight: '800' }}>{title}</Text>
        </TouchableOpacity>

        {f.loading ? <Loading label="Loading production order…" /> : null}
        {f.callError ? <Banner tone="err" title={f.callError} /> : null}
        {f.lock.read_only && f.lock.reason && f.routeMode !== 'view' ? <Banner tone="warn" title={f.lock.reason} /> : null}

        {!f.reviewStep ? (
          <>
            {f.voucher.vouno ? <Text style={[x.muted, tab, { marginBottom: 8 }]}>PO No. {f.voucher.vouno}{f.readOnly ? ' · view only' : f.isEdit ? ' · editing' : ''}</Text> : null}
            <Switch2 options={[['sales', 'SO based'], ['self', 'Stock & sell']]} value={f.sourceMode} onChange={f.chooseSource} disabled={f.readOnly || f.isEdit} />
            {f.sourceMode === 'sales' ? <SalesSection f={f} narrow={narrow} /> : <SelfSection f={f} narrow={narrow} />}

            {(f.sourceMode === 'self' || f.selectedOrders.length > 0 || p.stockMetersQty > 0) ? (
              directCreate ? (
                <>
                  <BigBtn label={f.isEdit ? 'Save changes' : 'Create production order'} onPress={submit} loading={f.saving}
                    disabled={!!f.saveReason || f.voucherLoading || f.readOnly} />
                  {!f.readOnly ? reason(f.saveReason) : null}
                </>
              ) : (
                <>
                  <BigBtn label="Review costing & authorize →" onPress={() => f.setReviewStep(true)}
                    disabled={(!!f.saveReason && !f.readOnly) || f.costingLoading || f.voucherLoading} />
                  {!f.readOnly ? reason(f.saveReason) : null}
                </>
              )
            ) : null}
          </>
        ) : (
          <>
            <ReviewStep f={f} narrow={narrow} />
            {!f.readOnly ? (
              <>
                <BigBtn kind="dark" label={f.costingLoading ? 'Loading costing…' : (f.isEdit ? 'Save changes' : 'Submit for owner authorization')}
                  onPress={submit} loading={f.saving} disabled={!f.canSave || f.costingLoading} />
                {reason(f.authReason || f.saveReason)}
              </>
            ) : <BigBtn kind="ghost" label="‹ Back to order" onPress={() => f.setReviewStep(false)} />}
          </>
        )}
      </View>
    </ScrollView>
  );
}

