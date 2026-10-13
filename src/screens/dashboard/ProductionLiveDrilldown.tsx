import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '@/src/screens/dashboard/employ/api/api';

type Group = 'shed' | 'category' | 'design';
type RecordRow = { prpcode: string; process_uid: number; beam_uid: number; machine_code: string; machine_name?: string; machine_group_name?: string; shed: string; design_code: string; design_name: string; chkdate: number; metres: number };
const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const ymd = (s: string) => s.replace(/[^0-9]/g, '').slice(0, 8);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const prev = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() - days); return d; };
const colors = { dark: '#111f30', purple: '#772b85', border: '#e5e7eb', muted: '#777' };
const chip = { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 7, marginRight: 6, marginBottom: 6 } as const;
export default function ProductionLiveDrilldown({ date, prptype }: { date?: string; prptype?: string }) {
  const baseDate = useMemo(() => { const d = new Date(`${(date || iso(new Date())).slice(0,10)}T12:00:00`); return Number.isNaN(d.getTime()) ? new Date() : d; }, [date]);
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState(iso(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)));
  const [to, setTo] = useState(iso(baseDate));
  const [group, setGroup] = useState<Group>('shed');
  const [path, setPath] = useState<Array<{ field: string; value: string; title: string }>>([]);
  const [result, setResult] = useState<any>(null);
  const [rolls, setRolls] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rollBusy, setRollBusy] = useState(false);
  const [rollError, setRollError] = useState('');
  const choosePreset = (key: string) => {
    setPreset(key);
    if (key === 'custom') return;
    const end = key === 'yesterday' ? prev(baseDate, 1) : baseDate;
    const start = key === 'today' || key === 'yesterday' ? end : key === 'week' ? prev(end, 6) : new Date(end.getFullYear(), end.getMonth(), 1);
    setFrom(iso(start)); setTo(iso(end)); setPath([]);
  };
  useEffect(() => {
    let live = true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return;
    setBusy(true); setError(''); setResult(null); setPath([]); setRolls([]);
    api.getOwnerCardReport({ report_type: 'production_full', date: to, from_date: ymd(from), to_date: ymd(to), prptype })
      .then((r: any) => { if (live) { if (!r?.success) throw new Error(r?.message || 'Report request failed'); setResult(r?.data?.report || null); } })
      .catch((e: any) => { if (live) setError(String(e?.message || e)); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [from, to, prptype]);
  const rows: RecordRow[] = Array.isArray(result?.rows) ? result.rows : [];
  const active = rows.filter(r => path.every(p => String((r as any)[p.field] ?? '') === p.value));
  const levels = group === 'shed' ? [['shed', 'Shed'], ['machine_code', 'Machine'], ['design_code', 'Design'], ['process_uid', 'Beam']] : group === 'design' ? [['design_code', 'Design'], ['chkdate', 'Day'], ['machine_code', 'Machine'], ['process_uid', 'Beam']] : [['design_name', 'Category / design'], ['chkdate', 'Day'], ['machine_code', 'Machine'], ['process_uid', 'Beam']];
  const next = levels[path.length];
  const buckets = useMemo(() => {
    if (!next) return [];
    const map = new Map<string, { title: string; value: string; metres: number; count: number }>();
    active.forEach(r => {
      const value = String((r as any)[next[0]] ?? '');
      const label = next[0] === 'machine_code' ? `${r.machine_name || r.machine_code} (${r.machine_code})` : next[0] === 'process_uid' ? `Beam ${r.beam_uid} · Process ${r.process_uid}${Number(r.beam_uid) < 0 ? ' · Carry forward' : ''}` : next[0] === 'design_code' ? `${r.design_name || 'Unresolved'} (${r.design_code})` : value || 'Unresolved';
      const old = map.get(value) || { title: label, value, metres: 0, count: 0 };
      old.metres += Number(r.metres || 0); old.count += 1; map.set(value, old);
    });
    return Array.from(map.values()).sort((a,b) => b.metres - a.metres);
  }, [active, next?.[0]]);
  const openBucket = async (b: { title: string; value: string }) => {
    if (!next) return;
    setPath(p => [...p, { field: next[0], value: b.value, title: b.title }]);
    if (next[0] === 'process_uid') {
      setRollBusy(true); setRollError(''); setRolls([]);
      try {
        const r: any = await api.getOwnerCardReport({ report_type: 'production_full', date: to, from_date: ymd(from), to_date: ymd(to), process_uid: b.value, prptype });
        if (!r?.success) throw new Error(r?.message || 'Checking rows unavailable');
        setRolls(r?.data?.report?.checking_rolls || []);
      } catch(e: any) { setRollError(String(e?.message || e)); }
      finally { setRollBusy(false); }
    }
  };
  const options = [['today','Today'],['yesterday','Yesterday'],['week','Last 7 days'],['month','This month'],['custom','Custom']];
  return <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.border }}>
    <Text style={{ color: colors.dark, fontSize: 17, fontWeight: '800', marginBottom: 12 }}>Daily production · live checking</Text>
    <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false}>{options.map(([key,label]) => <TouchableOpacity key={key} onPress={() => choosePreset(key)} style={[chip, { backgroundColor: preset === key ? colors.dark : '#eef1f5' }]}><Text style={{ color: preset === key ? '#fff' : colors.dark, fontWeight: '700' }}>{label}</Text></TouchableOpacity>)}</ScrollView>
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 10 }}><View style={{ flex: 1 }}><Text>From (YYYY-MM-DD)</Text><TextInput value={from} onChangeText={v => {setPreset('custom');setFrom(v);}} style={{ borderWidth: 1, borderColor: colors.border, padding: 8, borderRadius: 6 }} /></View><View style={{ flex: 1 }}><Text>To (YYYY-MM-DD)</Text><TextInput value={to} onChangeText={v => {setPreset('custom');setTo(v);}} style={{ borderWidth: 1, borderColor: colors.border, padding: 8, borderRadius: 6 }} /></View></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{(['shed','category','design'] as Group[]).map(g => <TouchableOpacity key={g} style={[chip,{backgroundColor: group === g ? colors.purple : '#eef1f5'}]} onPress={() => {setGroup(g);setPath([]);setRolls([]);}}><Text style={{color: group === g ? '#fff' : colors.dark,fontWeight:'700'}}>{g === 'shed' ? 'Shed' : g === 'category' ? 'Category*' : 'Design'}</Text></TouchableOpacity>)}</View>
    {group === 'category' && <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 6 }}>*Category uses design names until item-category mapping is exposed by the detailed API.</Text>}
    {busy && <ActivityIndicator />}{!!error && <Text style={{color:'#b42318'}}>{error}</Text>}
    {!!result && <><Text style={{fontWeight:'800',fontSize:20,color:colors.purple,marginBottom:8}}>{fmt(result.total_metres)} m</Text><Text style={{color:colors.muted,marginBottom:8}}>{from} – {to} · {rows.length} grouped checking records</Text>
      <ScrollView horizontal style={{flexGrow:0,marginBottom:8}}>{[{title:'All',field:'',value:''},...path].map((p,i) => <TouchableOpacity key={i} onPress={() => {setPath(x => x.slice(0,i));setRolls([]);}} style={[chip,{backgroundColor:'#eef1f5'}]}><Text>{p.title} ›</Text></TouchableOpacity>)}</ScrollView>
      {next ? buckets.map(b => <TouchableOpacity key={b.value} onPress={() => openBucket(b)} style={{paddingVertical:12,borderTopWidth:1,borderColor:colors.border,flexDirection:'row',justifyContent:'space-between'}}><Text style={{color:colors.dark,flex:1,fontWeight:'600'}}>{b.title}</Text><Text style={{color:colors.purple,fontWeight:'800'}}>{fmt(b.metres)} m ›</Text></TouchableOpacity>) : <><Text style={{fontWeight:'800',marginVertical:8}}>Checking rolls</Text>{rollBusy && <ActivityIndicator />}{!!rollError && <Text style={{color:'#b42318'}}>{rollError}</Text>}{rolls.map((r,i) => <View key={`${r.process_uid}-${r.srno}-${i}`} style={{paddingVertical:8,borderTopWidth:1,borderColor:colors.border}}><Text>#{r.taka_no ?? r.srno} · {r.chkdate} · {fmt(r.metres)} m {Number(r.is_last_taka) === 1 ? '· Last piece' : ''}</Text></View>)}</>}
    </>}
  </View>;
}
