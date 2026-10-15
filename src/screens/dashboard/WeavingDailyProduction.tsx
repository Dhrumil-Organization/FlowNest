/** Claude WeavingDashboard · Daily Production. Responsive RN Web / iOS / Android. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Modal, Platform, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { api } from '@/src/screens/dashboard/employ/api/api';
import {
  DailyRow, ShedSpec, Mode, Step, Bucket, measure, rollCount, machineKey,
  designKey, categoryKey, beamKey, countLabel, levelsFor, withinPath, bucketsOf,
  deltaPercent, ymdToIso, shiftIso, seriesFor, CheckingRollRow, checkingInScope, displayMachine, keyOf, labelOf,
} from './ProductionDailyModel';
import ProductionSpark from './ProductionSpark';
import ProductionTrendChart from './ProductionTrendChart';
import ProductionDetailPanels from './ProductionDetailPanels';
import ProductionCheckingTable from './ProductionCheckingTable';
import { backNavigation, breadcrumbsFor, navigateBreadcrumb, parentLabelFor, DrillNavigation, Breadcrumb } from './ProductionDrilldownNavigation';

type Report = {
  rows: DailyRow[]; previous_rows: DailyRow[]; shed_catalog: ShedSpec[];
  roll_rows?: CheckingRollRow[]; roll_rows_complete?: boolean;
  previous_period?: { available: boolean; from_ymd: number; to_ymd: number; reason?: string };
  unmapped_count: number; unmapped_metres: number;
  total_metres: number;
};
type Preset = 'today' | 'yday' | '7d' | 'month' | 'custom';
const C = { navy: '#102132', purple: '#742786', blue: '#135D84', border: '#E7E0DA', muted: '#7A7A82', bg: '#F7F4F0', teal: '#276749' };
const format = (v: number, maxDecimals = 0) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: maxDecimals });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fromIso = (value: string) => new Date(`${value}T12:00:00`);
const digits = (value: string) => value.replace(/\D/g, '').slice(0,8);
const displayDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(8,10)}-${value.slice(5,7)}-${value.slice(0,4)}` : value;
const dateYmd = (value: number | string) => displayDate(ymdToIso(value));
const card = { backgroundColor: '#FFF', borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 12 } as const;
const pct = (n: number, total: number) => total > 0 ? Math.round(100 * n / total) : 0;
const countUnique = (rows: DailyRow[], fn: (r: DailyRow) => string) => new Set(rows.map(fn)).size;

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


export default function WeavingDailyProduction({ date, prptype, tabControls, refreshToken = 0, onRefreshComplete, onSelectedDateChange, initialBeam, onReturnToBeamStatus }: { date?: string; prptype?: string; tabControls?: React.ReactNode; refreshToken?: number; onRefreshComplete?: () => void; onSelectedDateChange?: (date: string) => void; initialBeam?: {prpcode: string; beam_uid: string; beam_no: string; last_checking_date?: number | null; nonce: number} | null; onReturnToBeamStatus?: () => void }) {
  const { width: windowWidth } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(0);
  const width = availableWidth || windowWidth;
  const isPhone = width < 600;
  const compact = width >= 900;
  const today = iso(new Date());
  const initial = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? (date as string) : today;
  const yesterday = shiftIso(today, -1);
  const [preset, setPreset] = useState<Preset>(initial === today ? 'today' : initial === yesterday ? 'yday' : 'custom');
  const [from, setFrom] = useState(initial);
  const [to, setTo] = useState(initial);
  const [mode, setMode] = useState<Mode>('shed');
  const [path, setPath] = useState<Step[]>([]);
  const [pendingBeamJump, setPendingBeamJump] = useState<typeof initialBeam>(null);
  const lastBeamJumpNonce = useRef<number | null>(null);
  // A Design Mix selection inside a shed retains its physical-shed scope.
  const [focusShed, setFocusShed] = useState<Step | null>(null);
  // Save the origin of a Design Mix jump so Back returns to the source shed,
  // rather than to an unrelated company-wide Design view.
  const [returnTo, setReturnTo] = useState<DrillNavigation | null>(null);
  const [response, setResponse] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const lastQueryRef = useRef<string | null>(null);
  // The report's date is shareable. Only externally changed URLs should reset
  // the date selection; an echo from our own chip update must not reset it.
  const lastUrlDate = useRef(initial);
  const pendingOwnUrlDate = useRef<string | null>(null);
  const syncUrlDate = (next: string) => {
    if (next === lastUrlDate.current) return;
    pendingOwnUrlDate.current = next;
    onSelectedDateChange?.(next);
  };
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date === lastUrlDate.current) return;
    lastUrlDate.current = date!;
    if (pendingOwnUrlDate.current === date) {
      pendingOwnUrlDate.current = null;
      return;
    }
    // Browser Back, Forward and external date navigation must show the URL day.
    pendingOwnUrlDate.current = null;
    setPreset(date === iso(new Date()) ? 'today' : date === shiftIso(iso(new Date()), -1) ? 'yday' : 'custom');
    setFrom(date!); setTo(date!);
    setPath([]); setFocusShed(null); setReturnTo(null);
    setRolls([]); setRecordsOpen(false);
  }, [date]);
  // Claude Beam Status row click: this-month + View by Shed + exact physical
  // Beam, never select by display BeamNo alone (which can repeat by property).
  useEffect(() => {
    if (!initialBeam || initialBeam.nonce === lastBeamJumpNonce.current) return;
    lastBeamJumpNonce.current = initialBeam.nonce;
    const last = initialBeam.last_checking_date ? ymdToIso(initialBeam.last_checking_date) : today;
    const end = /^\d{4}-\d{2}-\d{2}$/.test(last) ? last : today;
    const start = `${end.slice(0,7)}-01`;
    setPreset(end.slice(0,7) === today.slice(0,7) ? 'month' : 'custom');
    setFrom(start); setTo(end); syncUrlDate(end);
    setMode('shed'); setPath([]); setFocusShed(null); setReturnTo(null);
    setRolls([]); setRecordsOpen(false);
    setPendingBeamJump(initialBeam);
  }, [initialBeam?.nonce]);
  const refreshReport = () => { if (!busy && valid && prptype) setRefreshVersion(v => v + 1); };
  const [error, setError] = useState('');
  const [rolls, setRolls] = useState<CheckingRollRow[]>([]);
  const [rollBusy, setRollBusy] = useState(false);
  const [rollError, setRollError] = useState('');
  const [rollPartial, setRollPartial] = useState(false);
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const dayCount = Math.floor((fromIso(to).getTime()-fromIso(from).getTime())/86400000) + 1;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)
    && Number.isFinite(dayCount) && dayCount >= 1 && dayCount <= 63;
  const choose = (selected: Preset) => {
    setPreset(selected);
    if (selected !== 'custom') {
      const end = selected === 'yday' ? shiftIso(today, -1) : today;
      const start = selected === '7d' ? shiftIso(end,-6) : selected === 'month' ? `${end.slice(0,7)}-01` : end;
      setFrom(start); setTo(end);
      // Yesterday/Today are single-day URLs; the API still receives explicit
      // from_date and to_date so property/year resolution follows ERP rules.
      syncUrlDate(end);
    }
    setPath([]); setFocusShed(null); setReturnTo(null); setRolls([]); setRecordsOpen(false);
  };
  useEffect(() => {
    if (!valid || !prptype) {
      setError(!prptype ? 'Unable to load production for the selected property.' : 'Select 1–63 valid calendar days.');
      setResponse(null);
      onRefreshComplete?.();
      return;
    }
    let live = true;
    // Date/property changes reset the report; manual refresh does NOT reset
    // View By, category/shed breadcrumbs, selected beam or checking Taka view.
    const queryKey = `${prptype}|${from}|${to}`;
    const queryChanged = lastQueryRef.current !== queryKey;
    lastQueryRef.current = queryKey;
    setBusy(true);
    setError('');
    if (queryChanged) {
      setResponse(null); setPath([]); setFocusShed(null); setReturnTo(null);
      setRolls([]); setRecordsOpen(false); setShowUnmapped(false);
    }
    api.getOwnerCardReport({ report_type: 'production_full', date: to, from_date: digits(from), to_date: digits(to), prptype })
      .then((r:any) => {
        if (!live) return;
        if (!r?.success || !r?.data?.report) throw new Error(r?.message || 'Production report response missing');
        if (!Array.isArray(r.data.report.shed_catalog) || !Array.isArray(r.data.report.rows)) throw new Error('Physical-shed response is not deployed on Laravel.');
        setResponse(r.data.report);
      })
      .catch((e:any) => { if (live) setError(String(e?.message || e)); })
      .finally(() => { if (live) {setBusy(false); onRefreshComplete?.();} });
    return () => { live = false; };
  }, [from,to,prptype,valid,refreshToken,refreshVersion]);

  const rows = useMemo<DailyRow[]>(() => Array.isArray(response?.rows) ? response!.rows : [], [response]);
  const previous = useMemo<DailyRow[]>(() => Array.isArray(response?.previous_rows) ? response!.previous_rows : [], [response]);
  useEffect(() => {
    if (!pendingBeamJump || busy || !rows.length) return;
    const matching = rows.filter(r => beamKey(r) === `${pendingBeamJump.prpcode}|${pendingBeamJump.beam_uid}`)
      .sort((a,b) => String(b.chkdate).localeCompare(String(a.chkdate)));
    if (!matching.length) return; // No checked entries in the selected period.
    const row = matching[0];
    const next = (['shed','machine','design','beam'] as const).map(field => ({
      field, value: keyOf(row, field), label: labelOf(row, field),
    }));
    setMode('shed'); setPath(next); setFocusShed(null);
    setReturnTo(null); setRecordsOpen(false);
    setPendingBeamJump(null);
  }, [pendingBeamJump, busy, rows]);

  const catalog = response?.shed_catalog || [];
  const levels = useMemo(() => levelsFor(mode,from !== to), [mode,from,to]);
  const scoped = useMemo(() => withinPath(rows,focusShed?[focusShed,...path]:path), [rows,path,focusShed]);
  const stage = levels[path.length];
  const currentBuckets = useMemo(() => stage ? bucketsOf(scoped,stage) : [], [stage,scoped]);
  const currentMetres = measure(scoped);
  const totalMetres = measure(rows);
  const currentRolls = rollCount(scoped);
  const machines = countUnique(scoped,machineKey);
  // Count linked physical beams, not process UIDs (one beam may span processes).
  const beams = new Set(scoped.map(beamKey)).size;
  const designs = countUnique(scoped,designKey);
  const currentPrior = response?.previous_period?.available && !path.some(p=>p.field==='day')
    ? measure(withinPath(previous,focusShed?[focusShed,...path]:path)) : null;
  const parentMetres = measure(withinPath(rows,focusShed?[focusShed,...path.slice(0,-1)]:path.slice(0,-1)));
  const selectedStep = path[path.length-1];
  const selectedShed = selectedStep?.field==='shed' ? catalog.find(s=>s.key===selectedStep.value) : null;
  const heroSub = selectedStep
    ? `${selectedStep.field==='shed'?'Shed':selectedStep.field==='machine'?'Machine':selectedStep.field==='design'?'Design':selectedStep.field==='beam'?'Beam':selectedStep.field==='category'?'Item category':'Day'} · ${path.slice(0,-1).map(p=>p.label).join(' › ')||focusShed?.label||'all'}${selectedShed?` · ${selectedShed.range} · ${selectedShed.fleet} looms`:''}`
    : `${mode==='shed'?'Shed-wise':mode==='category'?'Item category-wise':'Design-wise'} · ${mode==='shed'?catalog.map(s=>`${s.label} ${s.fleet}`).join(' · '):`${mode==='category'?countUnique(withinPath(rows,focusShed?[focusShed]:[]),categoryKey):countUnique(withinPath(rows,focusShed?[focusShed]:[]),designKey)} in production${focusShed?` · ${focusShed.label}`:''}`} · checking entries`;

  const change = deltaPercent(currentMetres,currentPrior);
  const allSheds = useMemo(() => {
    const by = new Map(bucketsOf(rows,'shed').map(b=>[b.key,b]));
    return catalog.map(s => ({ ...s, bucket: by.get(s.key) || { key:s.key,label:s.label,metres:0,rolls:0,machines:new Set<string>(),beams:new Set<string>(),designs:new Set<string>(),entries:[] } as Bucket }));
  }, [rows,catalog]);
  const gridColumns = width >= 1100 ? 4 : width >= 650 ? 2 : 1;
  const gap = 10;
  const shedWidth = Math.max(0,(width - gap * (gridColumns-1)) / gridColumns);
  const twoColumn = width >= 850;
  const currentBeamStep = path.find(p=>p.field==='beam');
  const beamProcessRefs = useMemo(()=>{
    if (!currentBeamStep) return [] as {property:string;process:string}[];
    const unique = new Map<string,{property:string;process:string}>();
    scoped.forEach(r=>unique.set(`${r.prpcode}|${r.process_uid}`,
      {property:r.prpcode,process:String(r.process_uid)}));
    return [...unique.values()];
  },[currentBeamStep?.value,scoped]);
  useEffect(() => {
    if (!currentBeamStep) {setRolls([]);setRollError('');setRollPartial(false);return;}
    // One-day ranges already carry the original GryProcessC checking entries.
    // Match by scoped property+process+date+design, never by BeamUId as a process ID.
    if (dayCount===1 && Array.isArray(response?.roll_rows)) {
      setRolls(checkingInScope(response.roll_rows,scoped));
      setRollPartial(response?.roll_rows_complete===false);
      setRollError('');setRollBusy(false);
      return;
    }
    let live = true;
    setRollBusy(true);setRollError('');setRolls([]);setRollPartial(false);
    const limit=32;
    const refs=beamProcessRefs.slice(0,limit);
    if (refs.length===0){setRollBusy(false);return;}
    // A physical beam can span several process UIDs. Query each exact authorised
    // property/process pair, and label any partial results instead of hiding them.
    Promise.all(refs.map(ref=>api.getOwnerCardReport({
      report_type:'production_full', date:to, from_date:digits(from),
      to_date:digits(to), process_uid:ref.process,
      process_property:ref.property, prptype,
    }))).then((answers:any[])=>{
      if (!live) return;
      const invalid=answers.find(r=>!r?.success || !Array.isArray(r?.data?.report?.checking_rolls));
      if(invalid)throw new Error(invalid?.message||'Checking entries unavailable');
      const fetched=answers.flatMap(r=>r.data.report.checking_rolls);
      const scopedRolls=checkingInScope(fetched,scoped);
      setRolls(scopedRolls);
      setRollPartial(beamProcessRefs.length>limit);
    }).catch((e:any)=>{if(live)setRollError(String(e?.message||e));})
      .finally(()=>{if(live)setRollBusy(false);});
    return ()=>{live=false;};
  },[currentBeamStep?.value,beamProcessRefs,dayCount,response,from,to,prptype]);
  const open = (bucket: Bucket) => { if (stage) {setRecordsOpen(false);setPath(p=>[...p,{field:stage,value:bucket.key,label:bucket.label}]);} };
  const changeMode = (next:Mode) => { setMode(next); setPath([]); setFocusShed(null); setReturnTo(null); setRolls([]); setRecordsOpen(false); };
  const navigation: DrillNavigation = {mode,path,focusShed,recordsOpen};
  const crumbs = breadcrumbsFor(navigation);
  const parentLabel = parentLabelFor(navigation,returnTo);
  const applyNavigation = (next: DrillNavigation) => {
    setMode(next.mode); setPath(next.path); setFocusShed(next.focusShed);
    setRecordsOpen(next.recordsOpen); setRolls([]); setRollError('');
  };
  const goBackOneLevel = () => {
    const next = backNavigation(navigation,returnTo);
    if (next) { applyNavigation(next.navigation); setReturnTo(next.returnTo); }
  };
  const goToBreadcrumb = (crumb: Breadcrumb) => {
    const next = navigateBreadcrumb(navigation,crumb,returnTo);
    if (next) { applyNavigation(next.navigation); setReturnTo(next.returnTo); }
  };
  // Android hardware Back closes the current drilldown before leaving the report.
  useEffect(() => {
    if (Platform.OS !== 'android' || !parentLabel) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      goBackOneLevel(); return true;
    });
    return () => listener.remove();
  }, [path,focusShed,mode,recordsOpen,returnTo,parentLabel]);
  const unmapped = rows.filter(r=>r.shed_key==='UNMAPPED');
  const visibleCheckingRolls = useMemo(() => checkingInScope(response?.roll_rows || [], scoped), [response, scoped]);
  const mappedRatio = pct(totalMetres-measure(unmapped), totalMetres);
  // Claude's summary badge means share of output, NOT classification coverage.
  const outputShare = pct(currentMetres, path.length ? parentMetres : totalMetres);
  const periodDescription = from === to ? displayDate(from) : `${displayDate(from)} – ${displayDate(to)}`;
  const periodContext = preset === 'yday' && from === to ? `Yesterday · ${periodDescription}`
    : preset === 'today' && from === to ? `Today · ${periodDescription}`
    : periodDescription;
  const beamTargetHasNoChecking = Boolean(pendingBeamJump && response && !busy && !rows.some(
    r => beamKey(r) === `${pendingBeamJump.prpcode}|${pendingBeamJump.beam_uid}`));
  const selectedShedInPath=path.find(p=>p.field==='shed')||focusShed;
  const topMachines = (entries:DailyRow[]) => bucketsOf(entries,'machine').slice(0,3).map(m=>`${m.label} ${format(m.metres)} m`).join(' · ');

  return <View onLayout={e=>{const next = Math.round(e.nativeEvent.layout.width); if (next>0 && next!==availableWidth) setAvailableWidth(next);}} style={{width:'100%',minWidth:0,flexShrink:1}}>
    {beamTargetHasNoChecking && <View style={{backgroundColor:'#FFF',borderWidth:1,borderColor:'#E7E0DA',borderRadius:10,padding:13,marginBottom:12}}>
      <Text style={{fontSize:12,fontWeight:'900',color:C.navy}}>Beam {pendingBeamJump?.beam_no || 'selected beam'}</Text>
      <Text style={{fontSize:11,color:C.muted,marginTop:6}}>No checking entries found for this beam in the selected period. Operational Beam Status remains available.</Text>
      <TouchableOpacity onPress={onReturnToBeamStatus} style={{marginTop:10,alignSelf:'flex-start',padding:5}}>
        <Text style={{fontSize:11,fontWeight:'800',color:C.purple}}>‹ Back to Beam status</Text>
      </TouchableOpacity>
    </View>}

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
            <View style={{width:130}}><CalendarDateField label="To date" compact value={to} onChange={v=>{setTo(v);setPreset('custom');syncUrlDate(v);}}/></View>
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
        <View style={{flex:1,minWidth:0}}><CalendarDateField label="To date" value={to} onChange={v=>{setTo(v);syncUrlDate(v);}}/></View>
      </View>}
      {isPhone && <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:5}}>
        <Text style={{fontSize:11,fontWeight:'800',color:C.muted,marginRight:4}}>VIEW BY</Text>
        {(['shed','category','design'] as Mode[]).map(k=><Chip key={k} selected={mode===k} title={k==='shed'?'Shed':k==='category'?'Category':'Design'} onPress={()=>changeMode(k)}/>)}
      </View>}
    </View>
    <View style={{flexDirection:isPhone?'column':'row',justifyContent:'space-between',alignItems:isPhone?'stretch':'center',gap:8,marginBottom:9}}>
      <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:4,flex:1,minWidth:0}}>
        {crumbs.map((crumb,i) => <React.Fragment key={crumb.key}>
          {i>0 && <Text style={{fontSize:12,color:C.muted,marginHorizontal:1}}>›</Text>}
          {crumb.current ? <Text accessibilityRole="text" style={{fontSize:11,fontWeight:'800',color:C.muted}}>{crumb.label}</Text>
            : <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Go back to ${crumb.label}`}
                onPress={()=>goToBreadcrumb(crumb)} hitSlop={{top:8,bottom:8,left:6,right:6}}
                style={{minHeight:32,justifyContent:'center',paddingHorizontal:3}}>
                <Text style={{fontSize:11,fontWeight:'900',color:C.purple}}>{crumb.label}</Text>
              </TouchableOpacity>}
        </React.Fragment>)}
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:7,alignSelf:isPhone?'flex-start':'center'}}>
        {parentLabel && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Back to ${parentLabel}`}
          onPress={goBackOneLevel} hitSlop={{top:7,bottom:7,left:7,right:7}}
          style={{flexShrink:0,minHeight:40,minWidth:100,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.border,borderRadius:8,backgroundColor:'#FFF',paddingHorizontal:12}}>
          <Text style={{fontSize:12,color:C.purple,fontWeight:'900'}}>‹ Back to {parentLabel}</Text>
        </TouchableOpacity>}
        {(Platform.OS === 'web' || !isPhone) && <TouchableOpacity accessibilityRole="button"
          accessibilityLabel={busy ? 'Refreshing production' : 'Refresh production'}
          accessibilityState={{disabled:busy || !valid || !prptype}}
          disabled={busy || !valid || !prptype}
          onPress={refreshReport} hitSlop={{top:7,bottom:7,left:7,right:7}}
          style={{minHeight:40,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,borderWidth:1,borderColor:C.border,borderRadius:8,backgroundColor:'#FFF',paddingHorizontal:12,opacity:busy?0.7:1}}>
          {busy ? <ActivityIndicator size="small" color={C.purple}/> : <Text style={{fontSize:16,color:C.purple,fontWeight:'900'}}>↻</Text>}
          <Text style={{fontSize:12,color:C.purple,fontWeight:'900'}}>{busy ? 'Refreshing…' : 'Refresh'}</Text>
        </TouchableOpacity>}
      </View>
    </View>
    {busy && !response && <View style={card}><ActivityIndicator color={C.purple}/><Text style={{color:C.muted,textAlign:'center',marginTop:8}}>Loading production for {periodDescription}…</Text></View>}
    {!!error && <View style={card} accessibilityRole="alert"><Text style={{color:'#B42318',fontWeight:'900'}}>Unable to load production</Text><Text style={{color:'#B42318',marginTop:6}}>Please try again or contact your administrator.</Text></View>}
    {!!response && <>
      <View style={{...card,padding:13,marginBottom:10,gap:10}}>
        <View style={{flexDirection:width>=850?'row':'column',gap:12,alignItems:width>=850?'center':'stretch'}}>
          <View style={{flex:width>=850?1:undefined,minWidth:0}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
              <View style={{width:44,height:44,backgroundColor:'#F3EAF4',borderRadius:10,justifyContent:'center',alignItems:'center'}}>
                <Text style={{fontSize:23}}>{selectedStep?.field==='machine'?'⚙️':selectedStep?.field==='category'||(!selectedStep&&mode==='category')?'🧵':selectedStep?.field==='design'||(!selectedStep&&mode==='design')?'◧':selectedStep?.field==='beam'?'▣':selectedStep?.field==='day'?'📅':'🏭'}</Text>
              </View>
              <View style={{flex:1,minWidth:0}}><Text style={{fontSize:isPhone?16:16,fontWeight:'900',color:C.navy}}>{path.length ? path[path.length-1].label : 'Production'}</Text><Text style={{fontSize:isPhone?11:10,color:C.purple,fontWeight:'800',marginTop:2}}>{periodContext}</Text><Text style={{fontSize:isPhone?11:10,color:C.muted,marginTop:2}} numberOfLines={3}>{heroSub}</Text></View>
            </View>
          </View>
          <View style={{flex:width>=850?1.7:undefined,flexDirection:'row',flexWrap:isPhone?'wrap':'nowrap',gap:6}}>
            {(() => {const cardWidth = isPhone ? Math.max(116,(width - 26 - 6)/2) : undefined; return <>
              <Metric title="METRES" value={`${format(currentMetres)} m`} tint={C.purple} width={cardWidth}/>
              <Metric title="ROLLS" value={format(currentRolls)} width={cardWidth}/>
              <Metric title="AVG M / ROLL" value={currentRolls?format(currentMetres/currentRolls):'—'} width={cardWidth}/>
              <Metric title={mode==='category' && !path.length?'CATEGORIES':mode==='design' && !path.length?'DESIGNS':'MACHINES'} value={format(mode==='category'&&!path.length?currentBuckets.length:mode==='design'&&!path.length?currentBuckets.length:machines)} width={cardWidth}/>
            </>;})()}
            {width>=1100 && <View style={{paddingHorizontal:11,borderRadius:10,backgroundColor:'#F4EDF5',justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:15,fontWeight:'900',color:C.purple}}>{outputShare}%</Text><Text style={{fontSize:9,color:C.muted}}>{path.length?'of parent':'of output'}</Text></View>}
          </View>
        </View>
        <View style={{flexDirection:isPhone?'column':'row',justifyContent:'space-between',gap:5}}>
          <Text style={{color:C.muted,fontSize:10}}>{periodDescription} · {countLabel(beams,'beam')} · {countLabel(designs,'design')}</Text>
          <Text style={{color:change===null?C.muted:change>=0?C.teal:'#A63B2C',fontWeight:'800',fontSize:10}}>{change===null ? 'Previous period comparison unavailable' : `${change>=0?'▲':'▼'} ${Math.abs(change)}% vs ${preset==='yday'&&dayCount===1 ? displayDate(shiftIso(from,-1)) : `previous ${dayCount}d`} · ${format(currentPrior || 0)} m`}</Text>
        </View>
      </View>
      {unmapped.length>0 && path.length===0 && !focusShed && <View style={{...card,marginBottom:10,borderColor:'#D9A441',backgroundColor:'#FFF9E9'}}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show unclassified machine details" onPress={()=>setShowUnmapped(v=>!v)}>
          <Text style={{fontWeight:'900',fontSize:12,color:'#825000'}}>Unassigned production · {countLabel(countUnique(unmapped,machineKey),'machine')} · {format(measure(unmapped))} m · {mappedRatio}% mapped {showUnmapped?'▴':'▾'}</Text>
          <Text style={{fontSize:11,color:'#825000',marginTop:4}}>These machines have not been assigned to a shed. Their production remains included in the total.</Text>
        </TouchableOpacity>
        {showUnmapped && <View style={{marginTop:10,borderTopWidth:1,borderColor:'#EBD7A5'}}>
          {bucketsOf(unmapped,'machine').map(b=><View key={b.key} style={{paddingVertical:7,borderBottomWidth:1,borderColor:'#F1E4C7'}}>
            <View style={{flexDirection:'row',justifyContent:'space-between',gap:6}}>
              <Text selectable style={{fontSize:11,color:'#694500',fontWeight:'800',flex:1}}>{b.entries[0]?.prpcode} · {b.entries[0]?.machine_code} · {b.label}</Text>
              <Text style={{fontSize:11,color:'#694500',fontWeight:'900'}}>{format(b.metres)} m · {countLabel(b.rolls,'roll')}</Text>
            </View>
            <Text style={{fontSize:10,color:'#825000'}}>Location: {b.entries[0]?.erp_machine_group || b.entries[0]?.machine_group_name || '—'} · Shed assignment pending</Text>
          </View>)}
        </View>}
      </View>}
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
                <ProductionSpark compact={isPhone} data={seriesFor(b.entries,from,to).map(d=>({day:d.day,metres:d.metres}))} color={s.color}/>
                <Text numberOfLines={2} style={{fontSize:isPhone?11:10,color:C.muted,marginTop:8}}>Top machines: {topMachines(b.entries) || 'No checking entries'} ›</Text>
              </View>
            </View>
          </TouchableOpacity>;
        })}
      </View>}
      {dayCount>1 && !!stage && <View style={{...card,marginBottom:10}}>
        <Text style={{color:C.navy,fontSize:12,fontWeight:'900'}}>Daily production · {stage==='day'?'day by day':`by ${stage==='category'?'categories':stage==='shed'?'sheds':stage==='design'?'designs':stage==='machine'?'machines':'beams'}`}</Text>
        <ProductionTrendChart rows={scoped} color={C.purple} compact={isPhone} from={from} to={to}
          groupField={stage==='day'?undefined:stage} sheds={catalog}/>
      </View>}
      {recordsOpen ? <View style={{...card,minWidth:0}}>
        <View style={{alignItems:'flex-end',marginBottom:7}}>
          <Chip compact title={`‹ Back to ${parentLabel || 'report'}`} onPress={goBackOneLevel}/>
        </View>
        <ProductionCheckingTable rows={visibleCheckingRolls} aggregateRows={scoped}
          compact={!twoColumn} partial={response?.roll_rows_complete===false} context={periodDescription}/>
      </View> : stage ? <ProductionDetailPanels
        rows={scoped}
        previousRows={withinPath(previous,focusShed?[focusShed,...path]:path)}
        previousAvailable={Boolean(response?.previous_period?.available)}
        field={stage}
        designSelected={path.some(p=>p.field==='design')}
        nextField={levels[path.length+1]}
        buckets={currentBuckets}
        sheds={catalog}
        compact={!twoColumn}
        onOpen={open}
        onDesign={b=>{setReturnTo(navigation);setFocusShed(selectedShedInPath||null);setMode('design');setPath([{field:'design',value:b.key,label:b.label}]);setRecordsOpen(false);}}
        onAllDesigns={()=>{setReturnTo(navigation);setFocusShed(selectedShedInPath||null);setMode('design');setPath([]);setRecordsOpen(false);}}
        onCategoryDesign={(category,design)=>{
          if(stage!=='category')return;
          setRecordsOpen(false);
          // Category → Design is a valid shortcut; keep the exact category scope.
          setPath(p=>[...p,
            {field:'category',value:category.key,label:category.label},
            {field:'design',value:design.key,label:design.label}]);
        }}
        onMachineDesign={(machine,design)=>{
          if(stage!=='machine')return;
          setRecordsOpen(false);
          // Shed: Machine → Design → Beam. Category/Design: Machine → Beam.
          // Never append a second Design after the machine when Design was
          // already chosen: it skips the Beam stage and breaks breadcrumbs.
          const nextField=levels[path.length+1];
          setPath(p=>nextField==='design' ? [...p,
            {field:'machine',value:machine.key,label:machine.label},
            {field:'design',value:design.key,label:design.label}]
            : [...p,{field:'machine',value:machine.key,label:machine.label}]);
        }}
        showMix={stage==='shed'||stage==='machine'||stage==='category'}
        title={path.length?path[path.length-1].label:'Production'}
        onShowRecords={dayCount===1 && Array.isArray(response?.roll_rows) ? ()=>setRecordsOpen(true) : undefined}
      /> : <View style={card}>
        {!!rollError && <Text selectable style={{color:'#B42318',fontSize:12}}>{rollError}</Text>}
        <ProductionCheckingTable rows={rolls} aggregateRows={scoped} compact={!twoColumn}
          partial={rollPartial} busy={rollBusy} context={periodDescription}/>
      </View>}
    </>}
  </View>;
}
