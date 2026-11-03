// FILE: src/components/SalesChallanPackingSlipNEW/AllocateStep.tsx
// Step 2 — assign qty, grouped by ORDER LINE.
//
// get_pack_current_stock sends one row per stock lot (merge) and repeats the order line's
// balance on each. Shown flat (web grid) the user cannot tell how much of an order is filled.
// Here every order line is one card:
//
//   SO 00022746 · 150/72 CATLON · Grade 1ST · GREIGE
//   Balance 14,011.195   Assigned 811.495   Left 13,199.700      ▓▓░░░░░░░
//   Stock 9,812.330 in 11 merges · short by 4,198.865            Auto-fill · Clear
//   ─ Merge TP01731   38 ctn · 770.290 in stock        [ 770.290 ]  All
//   ─ Merge TP01722    2 ctn ·  41.205 in stock        [  41.205 ]  All
//   … Show 9 more merges
//
// Lots are sorted by stock (most first). Auto-fill takes whole lots, largest first, until the
// balance is met. A line can't be assigned more than its balance; a lot not more than its stock.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { ErrorText, LinkBtn, tab, u } from '../PackingAutomationNEW/ui';
import type { Mode, Row } from './api';
import { assignQtyIssue, autoFill, canAssign, groupIssue, groupStock, n3, qty } from './rules';
import type { OrderGroup } from './rules';
import { Bar, Segmented, Tag, Tags } from './ui';

const SHOW_FIRST = 5;
type Filter = 'all' | 'assigned';

export default function AllocateStep({ stock, mode, setAssign, setMany }: {
  stock: Row[]; mode: Mode;
  setAssign: (index: number, value: string) => string;
  setMany: (changes: Record<number, string>) => void;
}) {
  const groups = useMemo(() => groupStock(stock), [stock]);
  const [filter, setFilter] = useState<Filter>('all');
  const editable = (r: Row) => canAssign(r, mode);

  const total = groups.reduce((a, g) => ({ bal: a.bal + g.balance, asg: a.asg + g.assigned, lots: a.lots + g.used }), { bal: 0, asg: 0, lots: 0 });
  const done = groups.filter((g) => g.assigned > 0 && g.left <= 0).length;

  return (
    <>
      <View style={u.card}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={u.kicker}>Assigned on this slip</Text>
            <Text style={[{ fontSize: 22, fontWeight: '800', color: T.ink, marginTop: 2 }, tab]}>{qty(total.asg)}</Text>
          </View>
          <Text style={[{ fontSize: 13, fontWeight: '700', color: T.muted, textAlign: 'right' }, tab]}>
            {done} of {groups.length} order line{groups.length === 1 ? '' : 's'} filled{'\n'}{total.lots} merge{total.lots === 1 ? '' : 's'} used
          </Text>
        </View>
        <View style={{ marginTop: 10 }}><Bar value={total.bal ? total.asg / total.bal : 0} tone="copper" height={8} /></View>
        <View style={{ marginTop: 12 }}>
          <Segmented<Filter> value={filter} onChange={setFilter}
            options={[{ value: 'all', label: 'All merges' }, { value: 'assigned', label: `Assigned only (${total.lots})` }]} />
        </View>
      </View>

      {groups.map((g) => (
        <GroupCard key={g.key} g={g} filter={filter} editable={editable} setAssign={setAssign}
          onAutoFill={() => setMany(autoFill(g, editable))}
          onClear={() => setMany(Object.fromEntries(g.lots.filter((l) => editable(l.row) && n3(l.row.AssQty) > 0).map((l) => [l.index, ''])))} />
      ))}
    </>
  );
}

/* ------------------------------ one order line ------------------------------ */

function GroupCard({ g, filter, editable, setAssign, onAutoFill, onClear }: {
  g: OrderGroup; filter: Filter; editable: (r: Row) => boolean;
  setAssign: (index: number, value: string) => string; onAutoFill: () => void; onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const issue = groupIssue(g);
  const short = n3(g.balance - g.stock);
  const full = g.assigned > 0 && g.left <= 0 && !issue;
  const anyEditable = g.lots.some((l) => editable(l.row));

  const lots = useMemo(() => {
    let list = g.lots;
    if (filter === 'assigned') list = list.filter((l) => n3(l.row.AssQty) > 0);
    const s = q.trim().toUpperCase();
    if (s) list = list.filter((l) => `${l.row.MerName ?? ''} ${l.row.MerCode ?? ''}`.toUpperCase().includes(s));
    return list;
  }, [g.lots, filter, q]);
  // Assigned lots always stay visible; the rest is cut to the first few until "Show more".
  const shown = open || q ? lots : lots.filter((l, i) => i < SHOW_FIRST || n3(l.row.AssQty) > 0);
  const hidden = lots.length - shown.length;

  if (filter === 'assigned' && !lots.length) return null;

  return (
    <View style={[u.card, full && { borderColor: T.green + '77' }, !!issue && { borderColor: T.red + '88' }]}>
      {/* head */}
      <Text style={[{ fontSize: 13, fontWeight: '800', color: T.copper }, tab]}>SO {g.head.SONo}</Text>
      <Text style={{ fontSize: 17, fontWeight: '800', color: T.ink, marginTop: 1 }}>{g.head.ItmName}</Text>
      <Tags>
        {g.head.GrdName ? <Tag text={`Grade ${g.head.GrdName}`} /> : null}
        {g.head.ShdName ? <Tag text={g.head.ShdName} /> : null}
        {full ? <Tag text="Filled" tone="green" /> : null}
      </Tags>

      {/* meter */}
      <View style={{ flexDirection: 'row', backgroundColor: T.sub, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginTop: 12 }}>
        <Num label="Order balance" value={qty(g.balance)} />
        <Num label="Assigned" value={qty(g.assigned)} tone={g.assigned > 0 ? T.copper : undefined} />
        <Num label="Left" value={qty(Math.max(0, g.left))} tone={issue ? T.red : g.left <= 0 && g.assigned > 0 ? T.green : undefined} right />
      </View>
      <View style={{ marginTop: 8 }}><Bar value={g.balance ? g.assigned / g.balance : 0} tone={issue ? 'red' : full ? 'green' : 'copper'} /></View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={[u.hint, tab, { flex: 1 }]}>
          Stock {qty(g.stock)} in {g.lots.length} merge{g.lots.length === 1 ? '' : 's'}
          {short > 0 ? <Text style={{ color: T.amber, fontWeight: '700' }}>{` · short by ${qty(short)}`}</Text> : null}
        </Text>
        {anyEditable ? (
          <View style={{ flexDirection: 'row' }}>
            {g.left > 0 ? <LinkBtn label="Auto-fill" icon="auto-fix-high" onPress={onAutoFill} /> : null}
            {g.assigned > 0 ? <LinkBtn label="Clear" onPress={onClear} /> : null}
          </View>
        ) : null}
      </View>
      {issue ? <ErrorText>{issue}</ErrorText> : null}

      {/* lots */}
      {g.lots.length > 8 ? (
        <View style={[u.field, { minHeight: 44, marginTop: 10 }]}>
          <Icon name="search" size={18} color={T.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Find merge" placeholderTextColor={T.muted} autoCapitalize="characters" autoCorrect={false}
            accessibilityLabel="Find merge" style={[u.input, { fontSize: 15, minHeight: 40, paddingVertical: 6 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} />
        </View>
      ) : null}
      <View style={{ marginTop: 10 }}>
        {shown.map(({ row, index }, i) => (
          <LotRow key={`${index}`} row={row} first={i === 0} editable={editable(row)}
            roomLeft={Math.max(0, n3(g.left + n3(row.AssQty)))}
            onChange={(v) => setAssign(index, v)} />
        ))}
        {!shown.length ? <Text style={[u.hint, { paddingVertical: 8 }]}>No merge matches “{q}”.</Text> : null}
      </View>
      {hidden > 0 || (open && lots.length > SHOW_FIRST) ? (
        <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 }}>
          <Text style={{ color: T.copper, fontWeight: '800', fontSize: 14 }}>{open ? 'Show fewer merges' : `Show ${hidden} more merge${hidden === 1 ? '' : 's'}`}</Text>
          <Icon name={open ? 'expand-less' : 'expand-more'} size={20} color={T.copper} />
        </Pressable>
      ) : null}
    </View>
  );
}

const Num = ({ label, value, tone, right }: { label: string; value: string; tone?: string; right?: boolean }) => (
  <View style={{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start' }}>
    <Text style={{ fontSize: 11.5, fontWeight: '600', color: T.muted }}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit style={[{ fontSize: 16.5, fontWeight: '800', color: tone || T.ink, marginTop: 1 }, tab]}>{value}</Text>
  </View>
);

/* ------------------------------ one stock lot (merge) ------------------------------ */

function LotRow({ row, first, editable, roomLeft, onChange }: {
  row: Row; first: boolean; editable: boolean; roomLeft: number; onChange: (v: string) => string;
}) {
  const saved = n3(row.AssQty) > 0 ? String(row.AssQty) : '';
  const [draft, setDraft] = useState(saved);
  useEffect(() => { setDraft(n3(row.AssQty) > 0 ? String(row.AssQty) : ''); }, [row.AssQty]);

  const stockQ = n3(row.StkQty);
  const fill = Math.min(stockQ, roomLeft);
  const rowIssue = editable ? assignQtyIssue(row, draft) : '';
  const overLine = !rowIssue && n3(draft) > roomLeft ? `More than left on this order (${qty(roomLeft)}).` : '';
  const on = n3(row.AssQty) > 0;

  const change = (v: string) => {
    const clean = v.replace(/[^0-9.,]/g, '');
    setDraft(clean);
    if (!assignQtyIssue(row, clean)) onChange(clean === '' || n3(clean) === 0 ? '' : clean);
  };

  return (
    <View style={[{ paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: T.alt }, on && { backgroundColor: T.copper + '0D', marginHorizontal: -14, paddingHorizontal: 14 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: T.ink }} numberOfLines={1}>
            {row.MerName ? `Merge ${row.MerName}` : `Lot ${row.SrNo ?? ''}`}
            {!editable ? <Text style={[u.code]}>{'  locked'}</Text> : null}
          </Text>
          <Text style={[u.code, tab, { marginTop: 1 }]} numberOfLines={1}>
            Stock <Text style={{ color: T.ink, fontWeight: '700' }}>{qty(stockQ)}</Text> · {(parseInt(row.TotCarton, 10) || 0)} ctn
          </Text>
        </View>
        <View style={[u.field, { width: 122, minHeight: 46, paddingHorizontal: 10 }, !!(rowIssue || overLine) && { borderColor: T.red }, on && { borderColor: T.copper }, !editable && u.fieldOff]}>
          <TextInput
            value={draft}
            onChangeText={change}
            editable={editable}
            placeholder="Qty"
            placeholderTextColor={T.border}
            keyboardType="decimal-pad"
            inputMode="decimal"
            selectTextOnFocus
            accessibilityLabel={`Assign qty merge ${row.MerName ?? ''}`}
            style={[u.input, { fontSize: 17, minHeight: 42, paddingVertical: 6, textAlign: 'right', minWidth: 0 }, tab, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
          />
        </View>
        {editable ? (
          <Pressable onPress={() => change(on ? '' : fill.toFixed(3))} disabled={!on && fill <= 0} accessibilityRole="button"
            accessibilityLabel={on ? 'Clear this merge' : `Take ${qty(fill)}`}
            style={{ width: 48, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? T.sub : T.copper + '18', opacity: !on && fill <= 0 ? 0.35 : 1 }}>
            {on ? <Icon name="close" size={20} color={T.muted} /> : <Text style={{ color: T.copper, fontWeight: '800', fontSize: 14 }}>All</Text>}
          </Pressable>
        ) : null}
      </View>
      {rowIssue || overLine ? <ErrorText>{rowIssue || overLine}</ErrorText> : null}
    </View>
  );
}

