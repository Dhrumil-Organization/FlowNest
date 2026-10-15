// FILE: src/components/ProductionOrderNEW/JobWorkCard.tsx
// NEW (not in the Web ERP UI): send part of each selected Sales Order to job
// work, split across any number of job-work companies.
//   SO 10,000 m  ->  5,000 m in-house  +  3,000 m Company A  +  2,000 m Company B
// Saved as prodorderjob rows (TranType 30) — one per SO line × company.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { fetchParties } from './api';
import { decimalOnly, fmt, round3, Row, rowKey } from './format';
import { ORDER_KEY, STOCK_KEY } from './plan';
import { Badge, Card, Kicker, Muted, NumInput, ServerPicker, SmallBtn } from './ui';

type Line = { key: string; title: string; sub: string; cap: number; unit: string };

export default function JobWorkCard({ f, narrow }: { f: Row; narrow: boolean }) {
  const { plan, jobAlloc, readOnly, sourceMode, selectedOrders, addJobLine, updateJobLine, removeJobLine, api, ctx } = f;
  const [picker, setPicker] = useState<{ key: string; id: string } | null>(null);
  const [open, setOpen] = useState(Object.keys(jobAlloc).length > 0);
  const loadParties = useCallback((q: string) => fetchParties(api, ctx, 'job', q), [api, ctx]);

  const unit = plan.finishRequirement ? 'finished' : 'greige';
  const lines: Line[] = [];
  if (sourceMode === 'sales') {
    selectedOrders.forEach((o: Row) => lines.push({ key: rowKey(o), title: o.sono || o.jono || rowKey(o), sub: o.parname || '', cap: Number(o.qty || 0), unit }));
    if (plan.stockMetersQty > 0) lines.push({ key: STOCK_KEY, title: 'Stock (no SO)', sub: 'carved out separately', cap: plan.stockMetersQty, unit: 'greige' });
    if (jobAlloc[ORDER_KEY]) lines.push({ key: ORDER_KEY, title: 'Order level', sub: 'not linked to a Sales Order', cap: plan.totalQty, unit: 'greige' });
  } else {
    lines.push({ key: ORDER_KEY, title: 'Whole order', sub: 'stock production', cap: plan.totalQty, unit: 'greige' });
  }
  if (lines.length === 0) return null;

  const hasAny = plan.jobLines.length > 0;
  const showBody = open || hasAny;

  return (
    <Card style={{ padding: 14, marginBottom: 10, borderColor: hasAny ? T.copper + '66' : T.border }}>
      <TouchableOpacity onPress={() => setOpen((o) => !o)} style={{ flexDirection: 'row', alignItems: 'center' }} disabled={hasAny}>
        <Icon name="call-split" size={18} color={T.copper} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Kicker style={{ marginBottom: 2 }}>Job work out</Kicker>
          <Text style={{ fontSize: 10.5, color: T.muted }}>
            {hasAny
              ? `${fmt(plan.jobQty)} m greige to ${plan.jobCompanies} compan${plan.jobCompanies === 1 ? 'y' : 'ies'} · ${fmt(plan.millQty)} m in-house`
              : 'Send part of an SO to outside weavers — split across several companies.'}
          </Text>
        </View>
        {hasAny ? <Badge label={`${plan.jobCompanies} co.`} /> : null}
        {!readOnly && !hasAny ? <Text style={{ color: T.copper, fontSize: 12, fontWeight: '800', marginLeft: 8 }}>{showBody ? 'Hide' : 'Add'}</Text> : null}
      </TouchableOpacity>

      {showBody ? lines.map((line) => {
        const rows: Row[] = jobAlloc[line.key] || [];
        const used = round3(rows.reduce((s: number, r: Row) => s + Number(r.qty || 0), 0));
        const pct = line.cap > 0 ? Math.min(100, (used / line.cap) * 100) : 0;
        const over = used > line.cap + 0.0005;
        return (
          <View key={line.key} style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.alt }}>
            <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '800', color: T.ink }}>
              {line.title} <Text style={{ fontSize: 10, fontWeight: '400', color: T.muted }}>· {line.sub}</Text>
            </Text>
            <Text style={{ fontSize: 10, color: over ? T.red : T.muted, marginTop: 2, fontVariant: ['tabular-nums'] }}>
              {fmt(line.cap)} m {line.unit} · in-house {fmt(Math.max(0, line.cap - used))} · job work {fmt(used)}
            </Text>
            <View style={{ height: 5, backgroundColor: T.alt, borderRadius: 3, marginTop: 7, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%` as any, height: 5, backgroundColor: over ? T.red : T.copper }} />
            </View>

            {rows.map((r: Row) => {
              const others = round3(used - Number(r.qty || 0));
              return (
                <View key={r.id} style={{ flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'stretch' : 'center', gap: 6, marginTop: 8 }}>
                  <TouchableOpacity disabled={readOnly} onPress={() => setPicker({ key: line.key, id: r.id })}
                    style={{ flex: narrow ? undefined : 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: r.parcode ? T.border : T.copper + '88', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 11, backgroundColor: readOnly ? T.sub : T.surface }}>
                    <Icon name="factory" size={15} color={r.parcode ? T.ink : T.muted} style={{ marginRight: 6 }} />
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: r.parcode ? '700' : '400', color: r.parcode ? T.ink : T.muted }}>
                      {r.parcode ? (r.parname || r.parcode) : 'Choose job-work company…'}
                    </Text>
                    {!readOnly ? <Icon name="expand-more" size={18} color={T.muted} /> : null}
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <NumInput value={String(r.qty ?? '')} editable={!readOnly}
                      onChangeText={(v) => updateJobLine(line.key, r.id, { qty: decimalOnly(v) })}
                      style={{ width: narrow ? undefined : 120, flex: narrow ? 1 : undefined }} />
                    <Text style={{ fontSize: 10, color: T.muted }}>m</Text>
                    {!readOnly ? <SmallBtn label="Rest" onPress={() => updateJobLine(line.key, r.id, { qty: String(Math.max(0, round3(line.cap - others))) })} /> : null}
                    {!readOnly ? (
                      <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => removeJobLine(line.key, r.id)} accessibilityLabel="Remove company">
                        <Icon name="close" size={18} color={T.muted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}
            {!readOnly && line.cap > 0 ? (
              <TouchableOpacity onPress={() => addJobLine(line.key)} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: T.copper }}>+ Add job-work company</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      }) : null}

      {showBody && sourceMode === 'sales' && !readOnly && !jobAlloc[ORDER_KEY] && plan.totalQty > 0 ? (
        <TouchableOpacity onPress={() => addJobLine(ORDER_KEY)} style={{ marginTop: 12 }}>
          <Muted>+ Order-level job work (greige, not tied to one SO)</Muted>
        </TouchableOpacity>
      ) : null}

      {showBody && hasAny ? (
        <Muted style={{ marginTop: 10 }}>
          SO metres are converted to greige at this order's ratio ({Number(plan.soToGreige).toFixed(4)}×). Saved per company and SO; the in-house remainder goes to the mill.
        </Muted>
      ) : null}

      <ServerPicker<Row>
        open={!!picker}
        eyebrow="JOB WORK OUT"
        title="Job-work company"
        placeholder="Search party name or code"
        onClose={() => setPicker(null)}
        load={loadParties}
        keyOf={(p) => String(p.parcode)}
        render={(p) => ({ title: String(p.parname), sub: String(p.parcode) })}
        onPick={(p) => { if (picker) updateJobLine(picker.key, picker.id, { parcode: String(p.parcode), parname: p.parname }); setPicker(null); }}
      />
    </Card>
  );
}
