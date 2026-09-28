// FILE: src/screens/dyeing/MillHubTab.tsx
// Dyeing → Mill Hub (READ-ONLY analysis — never a data-entry screen).
//
// Design-first: date range + mill filter → one row per design
//   Outward | Inward | Pending | Shortage | Shortage % | Inward Amount
// with a Grand Total, then tap a design → challan-wise page.
//
// Everything derives from the existing lot movements recorded in the
// Priority status sheet ('Sent for job' = outward with challan + mill,
// 'Job inward' = inward against that outward challan). Re-work (re-sending
// after a Lorry Cut, re-inward) is never counted as new outward/inward;
// Redyed metres are shown separately. Rules: see buildMillHub().

import { useBusinessContext } from '@/src/core/business';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusLetter } from './ColourStatusSheet';
import { DyeingService, unwrapBody } from './dyeingApi';
import {
  addDaysISO, amountLabel, DyeEventRow, parseAnyDate, qtyLabel, showDate, toEventRow, todayISO,
} from './dyeingModel';
import { buildMillHub, MillChallan, MillDesignRow } from './dyeingReports';

type Preset = 'this_month' | 'last_month' | 'last_30' | 'fy' | 'custom';

const rangeFor = (preset: Preset): { from: string; to: string } => {
  const today = todayISO();
  const [y, m] = today.split('-').map(Number);
  if (preset === 'last_month') {
    const first = new Date(y, m - 2, 1);
    const last = new Date(y, m - 1, 0);
    const f = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`;
    const t = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
    return { from: f, to: t };
  }
  if (preset === 'last_30') return { from: addDaysISO(today, -29), to: today };
  if (preset === 'fy') {
    const fyStart = m >= 4 ? y : y - 1; // Indian FY: 1 Apr – 31 Mar
    return { from: `${fyStart}-04-01`, to: today };
  }
  return { from: `${today.slice(0, 7)}-01`, to: today };
};

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_30', label: 'Last 30 days' },
  { key: 'fy', label: 'This FY' },
  { key: 'custom', label: 'Custom' },
];

export function MillHubTab() {
  const { prpGroup, yearNo, isReady } = useBusinessContext();
  const [preset, setPreset] = useState<Preset>('this_month');
  const [range, setRange] = useState(rangeFor('this_month'));
  const [fromText, setFromText] = useState(showDate(range.from));
  const [toText, setToText] = useState(showDate(range.to));
  const [mill, setMill] = useState<string | null>(null);
  const [events, setEvents] = useState<DyeEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDesign, setOpenDesign] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const load = useCallback(async (r: { from: string; to: string }) => {
    if (!isReady) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const body = { prptype: prpGroup, yearno: yearNo, fromdate: r.from, todate: r.to };
      console.log('[Dyeing/MillHub] request ->', body);
      const response: any = await DyeingService.millHub(body);
      const inner = unwrapBody(response);
      setEvents((Array.isArray(inner?.Events) ? inner.Events : []).map(toEventRow).filter(Boolean) as DyeEventRow[]);
    } catch (err: any) {
      setError(err?.message || 'Unable to load Mill Hub.');
    } finally {
      setLoading(false);
    }
  }, [isReady, prpGroup, yearNo]);

  useFocusEffect(useCallback(() => { void load(range); }, [load])); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'custom') return;
    const r = rangeFor(p);
    setRange(r);
    setFromText(showDate(r.from));
    setToText(showDate(r.to));
    void load(r);
  };

  const applyCustom = () => {
    const from = parseAnyDate(fromText);
    const to = parseAnyDate(toText);
    if (!from || !to) return setError('Enter dates as DD-MM-YYYY.');
    if (from > to) return setError('From date is after To date.');
    const r = { from, to };
    setRange(r);
    void load(r);
  };

  const hub = useMemo(() => buildMillHub(events, range.from, range.to, mill), [events, range, mill]);
  const design: MillDesignRow | undefined = openDesign ? hub.rows.find((r) => r.DsnName === openDesign) : undefined;

  /* ---------------------------- challan-wise page ---------------------------- */
  if (design) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={st.body}>
        <TouchableOpacity onPress={() => setOpenDesign(null)} style={st.back}>
          <Icon name="arrow-back" size={16} color={T.copper} />
          <Text style={st.backText}>All designs</Text>
        </TouchableOpacity>
        <Text style={st.designTitle}>{design.DsnName}</Text>
        <Text style={st.rangeText}>
          {showDate(range.from)} – {showDate(range.to)}{mill ? ` · ${mill}` : ''} · {design.challans.length} challan lines
        </Text>
        <SummaryGrid row={design} />

        {design.challans.map((c) => <ChallanCard key={c.key} c={c} />)}
      </ScrollView>
    );
  }

  /* ------------------------------ design summary ----------------------------- */
  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={st.body}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {PRESETS.map((p) => (
          <TouchableOpacity key={p.key} onPress={() => applyPreset(p.key)} style={[st.chip, preset === p.key && st.chipOn]}>
            <Text style={[st.chipText, preset === p.key && st.chipTextOn]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {preset === 'custom' && (
        <View style={st.customRow}>
          <TextInput value={fromText} onChangeText={setFromText} style={st.input} placeholder="From DD-MM-YYYY" placeholderTextColor={T.muted} />
          <TextInput value={toText} onChangeText={setToText} style={st.input} placeholder="To DD-MM-YYYY" placeholderTextColor={T.muted} />
          <TouchableOpacity onPress={applyCustom} style={st.goBtn}><Text style={st.goText}>Go</Text></TouchableOpacity>
        </View>
      )}
      <Text style={st.rangeText}>{showDate(range.from)} – {showDate(range.to)}</Text>

      {hub.mills.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[st.chips, { marginTop: 6 }]}>
          <TouchableOpacity onPress={() => setMill(null)} style={[st.chip, !mill && st.chipOnBlue]}>
            <Text style={[st.chipText, !mill && { color: T.blue }]}>All mills</Text>
          </TouchableOpacity>
          {hub.mills.map((m) => (
            <TouchableOpacity key={m} onPress={() => setMill(mill === m ? null : m)} style={[st.chip, mill === m && st.chipOnBlue]}>
              <Icon name="factory" size={11} color={mill === m ? T.blue : T.muted} />
              <Text style={[st.chipText, mill === m && { color: T.blue }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity onPress={() => setShowGuide((v) => !v)} style={st.guideBtn}>
        <Icon name="help-outline" size={14} color={T.blue} />
        <Text style={st.guideBtnText}>How to read this</Text>
        <Icon name={showGuide ? 'expand-less' : 'expand-more'} size={16} color={T.blue} />
      </TouchableOpacity>
      {showGuide && (
        <View style={st.guide}>
          <Guide k="Outward" v="Metres sent to the mill in this period (Sent for job, first time only)." />
          <Guide k="Inward" v="Metres received back in this period — counted even if they were sent earlier." />
          <Guide k="Pending" v="Sent in this period and not yet fully received (lot not at Job inward). Pending is never shortage." />
          <Guide k="Shortage" v="Sent − received, only on lots that finished inward in this period." />
          <Guide k="Redyed" v="Re-dyeing after a Lorry Cut — shown separately, never counted as new outward/inward." />
          <Guide k="Amount" v="Inward metres × job rate entered at inward." />
        </View>
      )}

      {!!error && <Text style={st.error}>{error}</Text>}

      {loading ? (
        <View style={{ paddingVertical: 40 }}><ActivityIndicator color={T.copper} /></View>
      ) : hub.rows.length === 0 ? (
        <View style={st.emptyBox}>
          <Icon name="local-shipping" size={28} color={T.muted} />
          <Text style={st.emptyTitle}>No mill movement in this period</Text>
          <Text style={st.emptyText}>
            Mill Hub fills itself from the Priority tab: mark a lot “Sent for job” with the outward challan and mill,
            then “Job inward” against that challan when it comes back. Nothing is entered here.
          </Text>
        </View>
      ) : (
        <>
          <View style={[st.designCard, st.totalCard]}>
            <Text style={[st.designName, { color: '#fff' }]}>Grand Total · {hub.rows.length} designs</Text>
            <SummaryGrid row={hub.total} inverse />
          </View>
          {hub.rows.map((row) => (
            <TouchableOpacity key={row.DsnName} onPress={() => setOpenDesign(row.DsnName)} style={st.designCard} activeOpacity={0.75}>
              <View style={st.designHead}>
                <Text style={st.designName} numberOfLines={1}>{row.DsnName}</Text>
                <Text style={st.challanCount}>{row.challans.length} ch.</Text>
                <Icon name="chevron-right" size={18} color={T.muted} />
              </View>
              <SummaryGrid row={row} />
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function SummaryGrid({
  row, inverse,
}: {
  row: { outward: number; inward: number; pending: number; shortage: number; shortagePct: number; inwardAmount: number; redyed: number };
  inverse?: boolean;
}) {
  const color = inverse ? '#fff' : T.ink;
  const muted = inverse ? 'rgba(255,255,255,0.7)' : T.muted;
  const items: [string, string, string?][] = [
    ['Outward', qtyLabel(row.outward)],
    ['Inward', qtyLabel(row.inward)],
    ['Pending', qtyLabel(row.pending), row.pending > 0 ? T.amber : undefined],
    ['Shortage', qtyLabel(row.shortage), row.shortage > 0 ? T.red : undefined],
    ['Short %', `${row.shortagePct.toFixed(2)}%`, row.shortagePct > 2 ? T.red : undefined],
    ['Amount', amountLabel(row.inwardAmount)],
  ];
  return (
    <View>
      <View style={st.grid}>
        {items.map(([k, v, c]) => (
          <View key={k} style={st.gridItem}>
            <Text style={[st.gridK, { color: muted }]}>{k}</Text>
            <Text style={[st.gridV, { color: inverse ? '#fff' : c || color }]}>{v}</Text>
          </View>
        ))}
      </View>
      {row.redyed > 0 && (
        <Text style={[st.redyed, inverse && { color: '#FFD9A0' }]}>↻ Redyed {qtyLabel(row.redyed)} m (not in outward / inward)</Text>
      )}
    </View>
  );
}

function ChallanCard({ c }: { c: MillChallan }) {
  return (
    <View style={st.challan}>
      <View style={st.challanHead}>
        <Text style={st.challanNo}>Ch {c.ChallanNo}</Text>
        <Text style={st.challanMeta} numberOfLines={1}>{c.MillName} · out {showDate(c.OutDate)}</Text>
        <StatusLetter status={c.LotStatus} size={16} />
      </View>
      <Text style={st.challanSub} numberOfLines={1}>
        {c.ChartNo} · {c.ShdName}{c.LotNo ? ` · Lot ${c.LotNo}` : ''}{c.PartyName ? ` · ${c.PartyName}` : ''}
      </Text>
      <View style={st.challanNums}>
        <Num k="Out" v={c.outInRange ? c.outQty : 0} note={!c.outInRange ? `(${qtyLabel(c.outQty)} earlier)` : undefined} />
        <Num k="In" v={c.inQtyInRange} />
        <Num k="Pending" v={c.pending} color={c.pending ? T.amber : undefined} />
        <Num k="Short" v={c.shortage} color={c.shortage ? T.red : undefined} />
      </View>
      {(c.redyed > 0 || c.lorryCutCount > 0) && (
        <Text style={st.redyed}>
          {c.lorryCutCount > 0 ? `✂ ${c.lorryCutCount} lorry cut  ` : ''}{c.redyed > 0 ? `↻ redyed ${qtyLabel(c.redyed)} m` : ''}
        </Text>
      )}
    </View>
  );
}

function Num({ k, v, color, note }: { k: string; v: number; color?: string; note?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={st.gridK}>{k}</Text>
      <Text style={[st.numV, color ? { color } : null, !v && { color: T.border }]}>{v ? qtyLabel(v) : '–'}</Text>
      {!!note && <Text style={st.numNote}>{note}</Text>}
    </View>
  );
}

function Guide({ k, v }: { k: string; v: string }) {
  return (
    <Text style={st.guideLine}>
      <Text style={{ fontWeight: '900', color: T.ink }}>{k}: </Text>{v}
    </Text>
  );
}

const st = StyleSheet.create({
  body: { padding: 12, paddingBottom: 32 },
  chips: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: T.border, borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 5, backgroundColor: T.surface,
  },
  chipOn: { borderColor: T.copper, backgroundColor: `${T.copper}18` },
  chipOnBlue: { borderColor: T.blue, backgroundColor: `${T.blue}14` },
  chipText: { fontSize: 11, fontWeight: '800', color: T.ink },
  chipTextOn: { color: T.copper },
  customRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface,
    paddingHorizontal: 10, height: 34, fontSize: 12, fontWeight: '600', color: T.ink,
  },
  goBtn: { backgroundColor: T.copper, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  goText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  rangeText: { fontSize: 11, fontWeight: '700', color: T.muted, marginTop: 8 },

  guideBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  guideBtnText: { fontSize: 11.5, fontWeight: '800', color: T.blue },
  guide: {
    backgroundColor: `${T.blue}0D`, borderWidth: 1, borderColor: `${T.blue}33`,
    borderRadius: 10, padding: 10, marginTop: 6, gap: 4,
  },
  guideLine: { fontSize: 11, color: T.muted, fontWeight: '600', lineHeight: 15 },
  error: { color: T.red, fontWeight: '700', fontSize: 12, marginTop: 10 },

  emptyBox: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 14, fontWeight: '900', color: T.ink, marginTop: 8 },
  emptyText: { fontSize: 12, color: T.muted, textAlign: 'center', marginTop: 4, lineHeight: 17 },

  designCard: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
    borderRadius: 12, padding: 10, marginTop: 10,
  },
  totalCard: { backgroundColor: T.nav, borderColor: T.nav },
  designHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  designName: { flex: 1, fontSize: 13.5, fontWeight: '900', color: T.ink },
  challanCount: { fontSize: 10.5, fontWeight: '700', color: T.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  gridItem: { width: '33.33%', paddingVertical: 4 },
  gridK: { fontSize: 9.5, fontWeight: '800', color: T.muted },
  gridV: { fontSize: 13, fontWeight: '900', marginTop: 1 },
  redyed: { fontSize: 10.5, fontWeight: '800', color: T.amber, marginTop: 4 },

  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  backText: { fontSize: 12, fontWeight: '800', color: T.copper },
  designTitle: { fontSize: 17, fontWeight: '900', color: T.ink },

  challan: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
    borderRadius: 11, padding: 10, marginTop: 8,
  },
  challanHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  challanNo: { fontSize: 12.5, fontWeight: '900', color: T.ink },
  challanMeta: { flex: 1, fontSize: 10.5, fontWeight: '600', color: T.muted },
  challanSub: { fontSize: 10.5, fontWeight: '700', color: T.ink, marginTop: 3 },
  challanNums: { flexDirection: 'row', marginTop: 6 },
  numV: { fontSize: 12.5, fontWeight: '900', color: T.ink, marginTop: 1 },
  numNote: { fontSize: 9, fontWeight: '600', color: T.muted },
});
