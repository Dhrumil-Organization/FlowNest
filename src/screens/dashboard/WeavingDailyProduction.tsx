/** Claude WeavingDashboard · Daily Production. Responsive RN Web / iOS / Android. */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { api } from '@/src/screens/dashboard/employ/api/api';
import {
  DailyRow, ShedSpec, Mode, Step, Key, Bucket, measure, rollCount, machineKey,
  processKey, designKey, levelsFor, keyOf, withinPath, bucketsOf,
  deltaPercent, ymdToIso, shiftIso, seriesFor,
} from './ProductionDailyModel';

type Report = {
  rows: DailyRow[]; previous_rows: DailyRow[]; shed_catalog: ShedSpec[];
  previous_period?: { available: boolean; from_ymd: number; to_ymd: number; reason?: string };
  unmapped_count: number; unmapped_metres: number;
  total_metres: number;
};
type Preset = 'today' | 'yday' | '7d' | 'month' | 'custom';
const C = { navy: '#102132', purple: '#742786', blue: '#135D84', border: '#E7E0DA', muted: '#7A7A82', bg: '#F7F4F0', teal: '#276749' };
const palette = ['#77288A','#3F5D9A','#125D83','#C87638','#276749','#C08C2A','#8E44AD','#B23A2A'];
const format = (v: number, maxDecimals = 0) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: maxDecimals });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fromIso = (value: string) => new Date(`${value}T12:00:00`);
const digits = (value: string) => value.replace(/\D/g, '').slice(0,8);
const displayDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(8,10)}-${value.slice(5,7)}-${value.slice(0,4)}` : value;
const dateYmd = (value: number | string) => displayDate(ymdToIso(value));
const card = { backgroundColor: '#FFF', borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 12 } as const;
const pct = (n: number, total: number) => total > 0 ? Math.round(100 * n / total) : 0;
const countUnique = (rows: DailyRow[], fn: (r: DailyRow) => string) => new Set(rows.map(fn)).size;
const tintFor = (code: string, catalog: ShedSpec[]) => catalog.find(s => s.key === code)?.color || C.muted;

function Chip({ title, selected = false, onPress, compact = false }: { title: string; selected?: boolean; onPress: () => void; compact?: boolean }) {
  return <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={{ borderRadius: 8, borderWidth: 1, borderColor: selected ? C.purple : C.border, backgroundColor: selected ? '#F2E8F4' : '#FFF', paddingHorizontal: compact ? 8 : 11, minHeight: compact ? 30 : 40, justifyContent: 'center' }}><Text style={{ fontSize: compact ? 10.5 : 12, fontWeight: '800', color: selected ? C.purple : C.navy }}>{title}</Text></TouchableOpacity>;
}
function Metric({ title, value, tint, width }: { title: string; value: string; tint?: string; width?: number }) {
  return <View style={{ minWidth: 0, width, flexGrow: width ? 0 : 1, flexBasis: width ? undefined : 116, padding: 10, borderWidth: 1, borderColor: C.border, borderRadius: 9, backgroundColor: '#FFF' }}>
    <Text style={{ fontSize: 10, fontWeight: '800', color: C.muted }}>{title}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 16, fontWeight: '900', color: tint || C.navy, marginTop: 4 }}>{value}</Text>
  </View>;
}
function CalendarDateField({ label, value, onChange, compact = false }: { label: string; value: string; onChange: (date: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => { const d = fromIso(value); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const show = () => { const d = fromIso(value); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setOpen(true); };
  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstWeekday + days) / 7) * 7 }, (_, i) => i - firstWeekday + 1);
  return <View style={{ minWidth: compact ? 130 : 0, flex: compact ? undefined : 1 }}>
    {!compact && <Text style={{ color: C.muted, fontSize: 10, marginBottom: 4, fontWeight: '700' }}>{label}</Text>}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Choose ${label.toLowerCase()}`} onPress={show} style={{ ...card, paddingVertical: compact ? 7 : 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: C.navy, fontWeight: '700' }}>{displayDate(value)}</Text>
      <Text style={{ fontSize: 15, color: C.purple }}>▦</Text>
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(12,24,36,0.48)', padding: 16 }}>
        <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 18, width: '100%', maxWidth: 350 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity accessibilityLabel="Previous month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={{ padding: 8 }}><Text style={{ color: C.purple, fontSize: 20 }}>‹</Text></TouchableOpacity>
            <Text style={{ color: C.navy, fontWeight: '900', fontSize: 15 }}>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity accessibilityLabel="Next month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={{ padding: 8 }}><Text style={{ color: C.purple, fontSize: 20 }}>›</Text></TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {['Mo','Tu','We','Th','Fr','Sa','Su'].map(day => <View key={day} style={{ width: '14.2857%', alignItems: 'center', paddingVertical: 7 }}><Text style={{ color: C.muted, fontSize: 11, fontWeight: '800' }}>{day}</Text></View>)}
            {cells.map((day, i) => {
              const available = day > 0 && day <= days;
              const selected = available && iso(new Date(month.getFullYear(), month.getMonth(), day)) === value;
              return <TouchableOpacity key={i} disabled={!available} accessibilityRole="button" accessibilityLabel={available ? displayDate(iso(new Date(month.getFullYear(), month.getMonth(), day))) : undefined} onPress={() => { onChange(iso(new Date(month.getFullYear(), month.getMonth(), day))); setOpen(false); }} style={{ width: '14.2857%', minHeight: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? C.purple : '#FFF', borderRadius: 7 }}><Text style={{ color: selected ? '#FFF' : C.navy, fontSize: 12, fontWeight: selected ? '900' : '500' }}>{available ? day : ''}</Text></TouchableOpacity>;
            })}
          </View>
          <TouchableOpacity onPress={() => setOpen(false)} style={{ alignSelf: 'flex-end', padding: 10, marginTop: 12 }}><Text style={{ color: C.purple, fontWeight: '800' }}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  </View>;
}

/** Tiny no-dependency trend bars: all values are taken from checking entries. */
function Trend({ rows, from, to, color, compact }: { rows: DailyRow[]; from: string; to: string; color: string; compact: boolean }) {
  const data = seriesFor(rows, from, to);
  if (data.length < 2) return <Text style={{ color: C.muted, fontSize: compact ? 11 : 10, textAlign: 'center', marginTop: 14 }}>Single-day production</Text>;
  // For long date ranges, bucket adjacent days without changing aggregate metres.
  const n = Math.min(24, data.length);
  const bands = Array.from({ length: n }, (_, i) => data.slice(Math.floor(i * data.length / n), Math.floor((i+1)*data.length/n)));
  const sums = bands.map(b => b.reduce((s,r) => s+r.metres, 0));
  const high = Math.max(1, ...sums);
  return <View accessibilityLabel={`Production trend: ${data.length} days`} style={{ flexDirection: 'row', height: compact ? 38 : 50, gap: 2, alignItems: 'flex-end', marginTop: 10 }}>
    {sums.map((value,i) => <View key={i} style={{ flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2, minHeight: 2, height: Math.max(2, value / high * (compact ? 36 : 48)), backgroundColor: color, opacity: 0.45 + 0.55 * value / high }}/>) }
  </View>;
}

function RankedRow({ bucket, index, max, color, onPress, sub }: { bucket: Bucket; index: number; max: number; color: string; onPress: () => void; sub?: string }) {
  return <TouchableOpacity onPress={onPress} accessibilityRole="button" style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: C.border }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 20, height: 20, borderRadius: 12, backgroundColor: index < 3 ? C.purple : '#EFEAE4', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: index < 3 ? '#FFF' : C.muted, fontSize: 10, fontWeight: '900' }}>{index + 1}</Text></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={{ color: C.navy, fontWeight: '800', fontSize: 12 }}>{bucket.label}</Text>
        <View style={{ height: 6, borderRadius: 5, backgroundColor: '#EFEAE4', marginTop: 6, overflow: 'hidden' }}><View style={{ height: 6, width: `${Math.min(100, bucket.metres / Math.max(1,max) * 100)}%`, backgroundColor: color }} /></View>
        <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{sub || `${bucket.machines.size} machines · ${format(bucket.rolls)} rolls · ${bucket.beams.size} beams`}</Text>
      </View>
      <View style={{ flexShrink: 0, alignItems: 'flex-end' }}><Text style={{ fontSize: 12, fontWeight: '900', color: C.navy }}>{format(bucket.metres)} m</Text><Text style={{ fontSize: 11, color: C.purple }}>›</Text></View>
    </View>
  </TouchableOpacity>;
}

export default function WeavingDailyProduction({ date, prptype, tabControls }: { date?: string; prptype?: string; tabControls?: React.ReactNode }) {
  const { width: windowWidth } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(0);
  const width = availableWidth || windowWidth;
  const isPhone = width < 600;
  const compact = width >= 900;
  const today = iso(new Date());
  const initial = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? (date as string) : today;
  const [preset, setPreset] = useState<Preset>(initial === today ? 'today' : 'custom');
  const [from, setFrom] = useState(initial);
  const [to, setTo] = useState(initial);
  const [mode, setMode] = useState<Mode>('shed');
  const [path, setPath] = useState<Step[]>([]);
  const [response, setResponse] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rolls, setRolls] = useState<any[]>([]);
  const [rollBusy, setRollBusy] = useState(false);
  const [rollError, setRollError] = useState('');
  const dayCount = Math.floor((fromIso(to).getTime()-fromIso(from).getTime())/86400000) + 1;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)
    && Number.isFinite(dayCount) && dayCount >= 1 && dayCount <= 63;
  const choose = (selected: Preset) => {
    setPreset(selected);
    if (selected !== 'custom') {
      const end = selected === 'yday' ? shiftIso(today, -1) : today;
      const start = selected === '7d' ? shiftIso(end,-6) : selected === 'month' ? `${end.slice(0,7)}-01` : end;
      setFrom(start); setTo(end);
    }
    setPath([]); setRolls([]);
  };
  useEffect(() => {
    if (!valid || !prptype) {
      setError(!prptype ? 'Property type is missing from report navigation.' : 'Select 1–63 valid calendar days.');
      setResponse(null); return;
    }
    let live = true;
    setBusy(true); setError(''); setResponse(null); setPath([]); setRolls([]);
    api.getOwnerCardReport({ report_type: 'production_full', date: to, from_date: digits(from), to_date: digits(to), prptype })
      .then((r:any) => {
        if (!live) return;
        if (!r?.success || !r?.data?.report) throw new Error(r?.message || 'Production report response missing');
        if (!Array.isArray(r.data.report.shed_catalog) || !Array.isArray(r.data.report.rows)) throw new Error('Physical-shed response is not deployed on Laravel.');
        setResponse(r.data.report);
      })
      .catch((e:any) => { if (live) setError(String(e?.message || e)); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [from,to,prptype,valid]);

  const rows = useMemo<DailyRow[]>(() => Array.isArray(response?.rows) ? response!.rows : [], [response]);
  const previous = useMemo<DailyRow[]>(() => Array.isArray(response?.previous_rows) ? response!.previous_rows : [], [response]);
  const catalog = response?.shed_catalog || [];
  const levels = useMemo(() => levelsFor(mode,from !== to), [mode,from,to]);
  const scoped = useMemo(() => withinPath(rows,path), [rows,path]);
  const stage = levels[path.length];
  const currentBuckets = useMemo(() => stage ? bucketsOf(scoped,stage) : [], [stage,scoped]);
  const currentMetres = measure(scoped);
  const totalMetres = measure(rows);
  const currentRolls = rollCount(scoped);
  const machines = countUnique(scoped,machineKey);
  const beams = countUnique(scoped,processKey);
  const designs = countUnique(scoped,designKey);
  const currentPrior = response?.previous_period?.available && !path.some(p=>p.field==='day')
    ? measure(withinPath(previous,path)) : null;
  const change = deltaPercent(currentMetres,currentPrior);
  const allSheds = useMemo(() => {
    const by = new Map(bucketsOf(rows,'shed').map(b=>[b.key,b]));
    return catalog.map(s => ({ ...s, bucket: by.get(s.key) || { key:s.key,label:s.label,metres:0,rolls:0,machines:new Set<string>(),beams:new Set<string>(),designs:new Set<string>(),entries:[] } as Bucket }));
  }, [rows,catalog]);
  const designMix = useMemo(() => bucketsOf(scoped,'design').slice(0,10),[scoped]);
  const maxGroup = Math.max(1,...currentBuckets.map(b=>b.metres));
  const maxDesign = Math.max(1,...designMix.map(b=>b.metres));
  const gridColumns = width >= 1100 ? 4 : width >= 650 ? 2 : 1;
  const gap = 10;
  const shedWidth = Math.max(0,(width - gap * (gridColumns-1)) / gridColumns);
  const twoColumn = width >= 850;
  const label = stage === 'shed' ? 'Shed' : stage === 'machine' ? 'Machine' : stage === 'category' ? 'Category' : stage === 'design' ? 'Design' : stage === 'beam' ? 'Beam' : 'Day';
  const showRolls = !stage;
  const currentBeamStep = path.find(p=>p.field==='beam');
  useEffect(() => {
    if (!currentBeamStep) { setRolls([]); setRollError(''); return; }
    let live = true;
    const [property,process] = currentBeamStep.value.split('|');
    setRollBusy(true); setRollError(''); setRolls([]);
    api.getOwnerCardReport({ report_type:'production_full', date:to, from_date:digits(from), to_date:digits(to), process_uid:process, process_property:property, prptype })
      .then((r:any) => {
        if (!live) return;
        if (!r?.success || !Array.isArray(r?.data?.report?.checking_rolls)) throw new Error(r?.message || 'Checking entries unavailable');
        const designStep = path.find(p=>p.field==='design');
        const dayStep = path.find(p=>p.field==='day');
        const checked = r.data.report.checking_rolls.filter((roll:any) =>
          (!designStep || `${roll.prpcode}|${roll.design_code ?? 'UNRESOLVED'}` === designStep.value) &&
          (!dayStep || String(roll.chkdate) === dayStep.value));
        setRolls(checked);
      })
      .catch((e:any) => { if(live) setRollError(String(e?.message || e)); })
      .finally(() => { if (live) setRollBusy(false); });
    return ()=>{live=false;};
  }, [currentBeamStep?.value,from,to,prptype]);
  const open = (bucket: Bucket) => { if (stage) setPath(p=>[...p,{field:stage,value:bucket.key,label:bucket.label}]); };
  const changeMode = (next:Mode) => { setMode(next); setPath([]); setRolls([]); };
  const unmapped = rows.filter(r=>r.shed_key==='UNMAPPED');
  const mappedRatio = pct(totalMetres-measure(unmapped), totalMetres);
  const periodDescription = `${displayDate(from)} – ${displayDate(to)}`;
  const topMachines = (entries:DailyRow[]) => bucketsOf(entries,'machine').slice(0,3).map(m=>`${m.label} ${format(m.metres)} m`).join(' · ');

  return <View onLayout={e=>{const next = Math.round(e.nativeEvent.layout.width); if (next>0 && next!==availableWidth) setAvailableWidth(next);}} style={{width:'100%',minWidth:0,flexShrink:1}}>
    {/* Compact desktop keeps a single row; narrow layouts give every control accessible space. */}
    <View style={{marginBottom:10,gap:isPhone?8:5}}>
      {isPhone && <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection:'row',alignItems:'center',gap:6,paddingRight:10}}>{tabControls}</ScrollView>}
      <View style={{flexDirection:'row',alignItems:'center',gap:7,minWidth:0}}>
        <ScrollView horizontal nestedScrollEnabled keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} style={{flex:1,minWidth:0,flexGrow:1}} contentContainerStyle={{flexDirection:'row',alignItems:'center',gap:5,paddingRight:16,paddingBottom:3}}>
          {!isPhone && tabControls}
          {([['today','Today'],['yday','Yesterday'],['7d','Last 7 days'],['month','This month'],['custom','Custom']] as [Preset,string][]).map(([id,text])=><Chip key={id} selected={preset===id} compact={compact} title={text} onPress={()=>choose(id)}/>)}
          {!isPhone && preset==='custom' && <>
            <View style={{width:130}}><CalendarDateField label="From date" compact value={from} onChange={v=>{setFrom(v);setPreset('custom');}}/></View>
            <Text style={{color:C.muted}}>→</Text>
            <View style={{width:130}}><CalendarDateField label="To date" compact value={to} onChange={v=>{setTo(v);setPreset('custom');}}/></View>
          </>}
        </ScrollView>
        {!isPhone && <View style={{flexShrink:0,flexDirection:'row',alignItems:'center',gap:3,borderWidth:1,borderColor:C.border,borderRadius:8,backgroundColor:'#FFF',padding:2}}>
          <Text style={{fontSize:10,fontWeight:'800',color:C.muted,marginHorizontal:5}}>VIEW BY</Text>
          {(['shed','category','design'] as Mode[]).map(k=><Chip key={k} selected={mode===k} title={k==='shed'?'Shed':k==='category'?'Category':'Design'} compact onPress={()=>changeMode(k)}/>)}
        </View>}
      </View>
      {isPhone && preset==='custom' && <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <View style={{flex:1,minWidth:0}}><CalendarDateField label="From date" value={from} onChange={setFrom}/></View>
        <Text style={{color:C.muted}}>→</Text>
        <View style={{flex:1,minWidth:0}}><CalendarDateField label="To date" value={to} onChange={setTo}/></View>
      </View>}
      {isPhone && <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:5}}>
        <Text style={{fontSize:11,fontWeight:'800',color:C.muted,marginRight:4}}>VIEW BY</Text>
        {(['shed','category','design'] as Mode[]).map(k=><Chip key={k} selected={mode===k} title={k==='shed'?'Shed':k==='category'?'Category':'Design'} onPress={()=>changeMode(k)}/>)}
      </View>}
    </View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:9}}>
      <Text style={{fontSize:11,fontWeight:'900',color:C.navy}}>Production</Text>
      <Text style={{fontSize:11,color:C.muted}}>› {path.length ? path.map(p=>p.label).join(' › ') : mode==='shed'?'Sheds':mode==='category'?'Categories':'Designs'}</Text>
    </View>
    {busy && <View style={card}><ActivityIndicator color={C.purple}/><Text style={{color:C.muted,textAlign:'center',marginTop:8}}>Loading checking entries…</Text></View>}
    {!!error && <View style={card}><Text style={{color:'#B42318',fontWeight:'900'}}>Production API error</Text><Text selectable style={{color:'#B42318',marginTop:6}}>{error}</Text></View>}
    {!!response && <>
      <View style={{...card,padding:13,marginBottom:10,gap:10}}>
        <View style={{flexDirection:width>=850?'row':'column',gap:12,alignItems:width>=850?'center':'stretch'}}>
          <View style={{flex:width>=850?1:undefined,minWidth:0}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
              <View style={{width:44,height:44,backgroundColor:'#F3EAF4',borderRadius:10,justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:23}}>🏭</Text></View>
              <View style={{flex:1,minWidth:0}}><Text style={{fontSize:isPhone?16:16,fontWeight:'900',color:C.navy}}>{path.length ? path[path.length-1].label : 'Production'}</Text><Text style={{fontSize:isPhone?11:10,color:C.muted,marginTop:2}} numberOfLines={3}>{mode==='shed' ? 'Shed-wise' : mode==='category' ? 'Item category-wise' : 'Design-wise'} · {catalog.map(s=>`${s.label} ${s.fleet}`).join(' · ')} · checking entries</Text></View>
            </View>
          </View>
          <View style={{flex:width>=850?1.7:undefined,flexDirection:'row',flexWrap:isPhone?'wrap':'nowrap',gap:6}}>
            {(() => {const cardWidth = isPhone ? Math.max(116,(width - 26 - 6)/2) : undefined; return <>
              <Metric title="METRES" value={`${format(currentMetres)} m`} tint={C.purple} width={cardWidth}/>
              <Metric title="ROLLS" value={format(currentRolls)} width={cardWidth}/>
              <Metric title="AVG M / ROLL" value={currentRolls?format(currentMetres/currentRolls):'—'} width={cardWidth}/>
              <Metric title={mode==='category' && !path.length?'CATEGORIES':mode==='design' && !path.length?'DESIGNS':'MACHINES'} value={format(mode==='category'&&!path.length?currentBuckets.length:mode==='design'&&!path.length?currentBuckets.length:machines)} width={cardWidth}/>
            </>;})()}
            {width>=1100 && <View style={{paddingHorizontal:11,borderRadius:10,backgroundColor:'#F4EDF5',justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:15,fontWeight:'900',color:C.purple}}>{mappedRatio}%</Text><Text style={{fontSize:9,color:C.muted}}>mapped</Text></View>}
          </View>
        </View>
        <View style={{flexDirection:isPhone?'column':'row',justifyContent:'space-between',gap:5}}>
          <Text style={{color:C.muted,fontSize:10}}>{periodDescription} · {beams} beams · {designs} designs</Text>
          <Text style={{color:change===null?C.muted:change>=0?C.teal:'#A63B2C',fontWeight:'800',fontSize:10}}>{change===null ? 'Previous period comparison unavailable' : `${change>=0?'▲':'▼'} ${Math.abs(change)}% vs previous ${dayCount}d · ${format(currentPrior || 0)} m`}</Text>
        </View>
      </View>
      {unmapped.length>0 && <View style={{...card,marginBottom:10,borderColor:'#D9A441',backgroundColor:'#FFF9E9'}}><Text style={{fontWeight:'900',fontSize:12,color:'#825000'}}>Unmapped machines · {countUnique(unmapped,machineKey)} machines · {format(measure(unmapped))} m</Text><Text style={{fontSize:11,color:'#825000',marginTop:4}}>Physical shed not proven by configured property and machine-code ranges. These entries remain in total production and can be explored below; they are not allocated to a guessed shed.</Text></View>}
      {path.length>0 && <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{flexGrow:0,marginBottom:9}} contentContainerStyle={{flexDirection:'row',gap:5,paddingRight:10}}><Chip title="All" onPress={()=>setPath([])}/>{path.map((p,i)=><Chip key={`${p.value}-${i}`} title={p.label} selected={i===path.length-1} onPress={()=>setPath(old=>old.slice(0,i+1))}/>)}</ScrollView>}
      {path.length===0 && mode==='shed' && <View style={{flexDirection:'row',flexWrap:'wrap',gap,marginBottom:10}}>
        {allSheds.map(s=>{
          const b = s.bucket;
          const label = `${format(b.machines.size)} / ${s.fleet}`;
          return <TouchableOpacity key={s.key} accessibilityRole="button" onPress={()=>open(b)} style={{backgroundColor:'#FFF',borderWidth:1,borderColor:C.border,borderRadius:12,width:shedWidth,overflow:'hidden',minHeight:isPhone?0:220}}>
            <View style={{backgroundColor:s.color,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6,paddingVertical:9,paddingHorizontal:10}}>
              <Text numberOfLines={1} style={{fontSize:isPhone?12:11,fontWeight:'900',color:'#FFF',flex:1}}>🏭  {s.label}</Text>
              <Text style={{color:'#FFF',fontSize:10,fontWeight:'800'}}>{pct(b.metres,totalMetres)}% of output ›</Text>
            </View>
            <View style={{padding:11,flex:1,justifyContent:'space-between'}}>
              <View>
                <Text style={{color:C.muted,fontSize:isPhone?11:10}}>{s.range}</Text>
                <View style={{flexDirection:'row',justifyContent:'space-between',gap:6,marginTop:8}}>
                  <View style={{flex:1,minWidth:0}}><Text style={{fontSize:9,color:C.muted}}>METRES</Text><Text adjustsFontSizeToFit numberOfLines={1} style={{fontSize:isPhone?20:19,fontWeight:'900',color:s.color}}>{format(b.metres)} m</Text></View>
                  <View style={{flex:0.62}}><Text style={{fontSize:9,color:C.muted}}>ROLLS</Text><Text style={{fontSize:16,fontWeight:'900',color:C.navy}}>{format(b.rolls)}</Text></View>
                  <View style={{flex:0.85}}><Text style={{fontSize:9,color:C.muted}}>MACHINES</Text><Text style={{fontSize:16,fontWeight:'900',color:C.navy}}>{label}</Text></View>
                </View>
              </View>
              <View>
                <Trend compact={isPhone} rows={b.entries} from={from} to={to} color={s.color}/>
                <Text numberOfLines={2} style={{fontSize:isPhone?11:10,color:C.muted,marginTop:8}}>Top machines: {topMachines(b.entries) || 'No checking entries'} ›</Text>
              </View>
            </View>
          </TouchableOpacity>;
        })}
      </View>}
      {dayCount>1 && !!stage && <View style={{...card,marginBottom:10}}><Text style={{color:C.navy,fontSize:12,fontWeight:'900'}}>Daily production · {dayCount} days</Text><Trend rows={scoped} color={C.purple} compact={isPhone} from={from} to={to}/></View>}
      <View style={{flexDirection:twoColumn?'row':'column',gap:10,alignItems:'flex-start'}}>
        <View style={{...card,width:twoColumn?'59%':'100%',minWidth:0,alignSelf:'flex-start'}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',gap:8,marginBottom:9}}><Text style={{fontSize:13,fontWeight:'900',color:C.navy,flex:1}}>{showRolls?'Checking rolls':`${label}-wise production`}</Text><Text style={{color:C.purple,fontSize:10,fontWeight:'900'}}>{showRolls?`${rolls.length} records`:`${currentBuckets.length} groups ›`}</Text></View>
          {stage ? <>
            {currentBuckets.map((b,i)=><RankedRow key={b.key} bucket={b} index={i} max={maxGroup} color={stage==='shed'?tintFor(b.key,catalog):palette[i%palette.length]} onPress={()=>open(b)} />)}
            {currentBuckets.length===0 && <Text style={{color:C.muted,fontSize:12,paddingVertical:16}}>No checking entries for the selected period.</Text>}
          </> : <>
            {rollBusy && <ActivityIndicator color={C.purple}/>}{!!rollError && <Text selectable style={{color:'#B42318',fontSize:12}}>{rollError}</Text>}
            {rolls.map((r,i)=><View key={`${r.process_uid}|${r.srno}|${i}`} style={{paddingVertical:10,borderTopWidth:1,borderColor:C.border,flexDirection:'row',justifyContent:'space-between',gap:10}}><Text style={{fontSize:12,color:C.navy,flex:1}}>Roll {r.taka_no ?? r.srno} · {dateYmd(r.chkdate)}{Number(r.is_last_taka)===1?' · LP':''}</Text><Text style={{fontSize:12,fontWeight:'900',color:C.purple}}>{format(Number(r.metres),3)} m</Text></View>)}
            {!rollBusy && rolls.length===0 && !rollError && <Text style={{color:C.muted,fontSize:12,marginVertical:12}}>No checking rolls in this selection.</Text>}
          </>}
        </View>
        {path.length===0 && <View style={{...card,width:twoColumn?'40%':'100%',minWidth:0,alignSelf:'flex-start'}}>
          <Text style={{fontSize:13,fontWeight:'900',color:C.navy,marginBottom:9}}>Design mix · Production</Text>
          {designMix.map((b,i)=><TouchableOpacity key={b.key} onPress={()=>{setMode('design');setPath([{field:'design',value:b.key,label:b.label}]);}} style={{paddingVertical:9,borderTopWidth:i?1:0,borderColor:C.border}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:7}}><Text numberOfLines={2} style={{fontSize:isPhone?12:11,fontWeight:'800',color:C.navy,flex:1}}>{b.label}</Text><Text style={{fontSize:12,fontWeight:'900',color:C.navy}}>{format(b.metres)} m</Text></View><View style={{height:6,backgroundColor:'#EFEAE4',borderRadius:5,marginTop:6,overflow:'hidden'}}><View style={{height:6,width:`${pct(b.metres,maxDesign)}%`,backgroundColor:palette[i%palette.length]}}/></View><Text style={{fontSize:10,color:C.muted,marginTop:4}}>{format(b.rolls)} rolls · {pct(b.metres,totalMetres)}%</Text></TouchableOpacity>)}
          {designMix.length===0 && <Text style={{fontSize:12,color:C.muted}}>No checking entries.</Text>}
        </View>}
      </View>
    </>}
  </View>;
}
