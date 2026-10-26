import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Part = { po: string; qty: number; rate: number | null; basis: string };
type Card = { property: string; design_code: string; po_quantity: number; weighted_pick_rate: number | null; rate_status: string | null; rate_source: string | null; no_po: boolean; carried_pool: boolean; po_parts: Part[] };
type Response = { success: boolean; message?: string; response?: { cards: Card[]; scope: string; complete_pool_board: boolean } };

export default function ProductionOrderPoolBoardScreen({ API, token, yearno, prptype, month }: { API: string; token: string; yearno: number; prptype: string; month: string }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'no_po' | 'carried'>('all');
  useEffect(() => {
    let active = true;
    setBusy(true); setError('');
    const params = `month=${encodeURIComponent(month)}&yearno=${encodeURIComponent(yearno)}&prptype=${encodeURIComponent(prptype)}`;
    fetch(`${API.replace(/\/$/, '')}/api/production-order-pools?${params}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      .then(async r => { const body = await r.json() as Response; if (!r.ok || !body.success) throw new Error(body.message || 'Unable to load POOL'); return body; })
      .then(body => { if (active) setCards(body.response?.cards || []); })
      .catch(e => { if (active) setError(String(e?.message || e)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [API, token, yearno, prptype, month]);
  const visible = useMemo(() => cards.filter(c => filter === 'all' || (filter === 'no_po' ? c.no_po : c.carried_pool)), [cards, filter]);
  return <ScrollView style={s.root} contentContainerStyle={s.content}>
    <Text style={s.heading}>Production Order POOL</Text><Text style={s.subheading}>{month} · V4.2 verified rates</Text>
    <View style={s.notice}><Text style={s.noticeText}>Initial verification board: designs with checking activity only. Full PO coverage, SO pending, loose stock and bind logs are not yet included.</Text></View>
    <View style={s.filters}>{(['all', 'no_po', 'carried'] as const).map(f => <Pressable key={f} onPress={() => setFilter(f)} style={[s.filter, filter === f && s.active]}><Text style={[s.filterText, filter === f && s.activeText]}>{f === 'all' ? 'All' : f === 'no_po' ? 'No PO' : 'Carried'}</Text></Pressable>)}</View>
    {busy && <ActivityIndicator />}{!!error && <Text style={s.error}>{error}</Text>}
    {!busy && !error && <Text style={s.count}>{visible.length} design pools</Text>}
    {visible.map(c => { const key = `${c.property}|${c.design_code}`; const open = expanded === key; return <Pressable key={key} style={s.card} onPress={() => setExpanded(open ? null : key)}>
      <View style={s.line}><Text style={s.title}>{c.design_code}</Text><Text style={s.property}>{c.property}</Text></View>
      <Text style={s.subheading}>{c.no_po ? 'NO PO' : c.carried_pool ? 'CARRIED POOL' : 'CURRENT POOL'}</Text>
      <View style={s.line}><View><Text style={s.label}>POOL QUANTITY</Text><Text style={s.value}>{Number(c.po_quantity || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })} m</Text></View><View><Text style={s.label}>WEIGHTED PICK RATE</Text><Text style={s.value}>{c.weighted_pick_rate == null ? 'Unavailable' : `₹${c.weighted_pick_rate.toFixed(6)}`}</Text></View></View>
      <Text style={s.meta}>{c.rate_source || c.rate_status || 'Rate unavailable'} · {c.po_parts.length} PO lines</Text>
      {open && <View style={s.details}>{c.po_parts.map((p, i) => <View key={`${p.po}-${i}`} style={s.part}><Text style={s.partTitle}>{p.po}</Text><Text style={s.meta}>{p.qty.toLocaleString('en-IN')} m · {p.rate == null ? 'Rate unavailable' : `₹${p.rate.toFixed(6)}/pick`} · {p.basis}</Text></View>)}</View>}
      <Text style={s.expand}>{open ? 'Hide PO rate breakdown ▲' : 'View PO rate breakdown ▼'}</Text>
    </Pressable>; })}
  </ScrollView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#f6f7fb' }, content: { padding: 16, paddingBottom: 44 }, heading: { fontSize: 24, fontWeight: '800', color: '#18243a' }, subheading: { color: '#64748b', marginTop: 4, fontSize: 12 }, notice: { padding: 12, backgroundColor: '#fff6df', borderRadius: 10, marginTop: 16 }, noticeText: { color: '#76551a', fontSize: 12, lineHeight: 18 }, filters: { flexDirection: 'row', gap: 8, marginVertical: 16 }, filter: { borderRadius: 20, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 14, paddingVertical: 8 }, active: { backgroundColor: '#1c365f', borderColor: '#1c365f' }, filterText: { color: '#334155', fontWeight: '600' }, activeText: { color: '#fff' }, count: { marginBottom: 8, color: '#64748b' }, card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }, line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12 }, title: { fontWeight: '800', fontSize: 17, color: '#17243a' }, property: { color: '#475569', fontWeight: '700' }, label: { fontSize: 10, color: '#64748b', fontWeight: '700' }, value: { fontSize: 16, color: '#142c4e', fontWeight: '800', marginTop: 4 }, meta: { fontSize: 12, color: '#64748b', marginTop: 8 }, expand: { color: '#235a9d', fontSize: 12, fontWeight: '700', marginTop: 14 }, details: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' }, part: { paddingVertical: 8 }, partTitle: { fontWeight: '700', color: '#1e293b' }, error: { color: '#b91c1c', paddingVertical: 14 } });
