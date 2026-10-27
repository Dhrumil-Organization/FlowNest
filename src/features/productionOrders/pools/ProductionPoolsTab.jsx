import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/* Claude Artifact Production Orders > POOLS only. Keep Orders/Looms/Interchange unchanged.
 * Uses the existing authenticated ProductionOrderNEW API client. No raw fetch fallback.
 */
const C={nav:'#24354A',copper:'#BF773A',muted:'#718197',border:'#DFE6EB',bg:'#FFFFFF',alt:'#F4F6F8',red:'#A94442',amber:'#9C701A',green:'#307957'};
const dateMonth=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
const move=(ym,n)=>{const [y,m]=ym.split('-').map(Number);const d=new Date(y,m-1+n,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
const label=ym=>new Date(ym+'-01T00:00:00').toLocaleDateString('en-IN',{month:'short',year:'numeric'});
const fmt=(v,u='m')=>v==null||!isFinite(Number(v))?'—':Number(v).toLocaleString('en-IN',{maximumFractionDigits:2})+(u?' '+u:'');
const date=(x)=>{const v=String(x||'').replace(/\D/g,'');return v.length===8?`${v.slice(6,8)}-${v.slice(4,6)}-${v.slice(0,4)}`:'—'};
function Txt({children,style,mono=false,...rest}) { return <Text {...rest} style={[{color:C.nav,fontSize:11,fontFamily:mono?'DMMono':'DMSans'},style]}>{children}</Text>; }
function Cell({name,value,hi=false}) {return <View style={[s.cell,hi&&s.cellHi]}><Txt style={s.cellLabel}>{name}</Txt><Txt mono style={s.cellValue}>{value}</Txt></View>}
function Flag({children,warn=false,danger=false}) {return <View style={[s.flag,warn&&s.warn,danger&&s.danger]}><Txt style={[s.flagText,warn&&{color:C.amber},danger&&{color:C.red}]}>{children}</Txt></View>}
function Row({children,style}) {return <View style={[s.row,style]}>{children}</View>}
function Section({title,extra,children}) {return <View style={s.section}><Row style={{justifyContent:'space-between',alignItems:'center',marginBottom:8}}><Txt style={s.sectionTitle}>{title}</Txt>{extra}</Row>{children}</View>}
function Empty({children}) {return <View style={s.empty}><Txt style={{color:C.muted,textAlign:'center',lineHeight:17}}>{children}</Txt></View>}
function MobileProgress({percent,po}) {
  const [open,setOpen]=useState(false);
  return <TouchableOpacity accessibilityLabel={`PO ${po} coverage ${percent} percent, tap for details`} onPress={()=>setOpen(x=>!x)}><View style={s.progress}><View style={[s.progressFill,{width:`${Math.max(0,Math.min(100,percent))}%`}]}/></View>{open&&<Txt style={[s.sub,{marginTop:5}]}>{po}: {fmt(percent,'%')} covered</Txt>}</TouchableOpacity>;
}
function Detail({pool,onBack,backLabel}) {
  const [showRolls,setShowRolls]=useState(false);
  const entries=pool.entries||[],sos=pool.sales_orders||[],events=pool.bind_events||[];
  const rec=pool.reconciliation;
  return <View>
    <TouchableOpacity onPress={onBack} style={{paddingVertical:9}}><Txt style={{fontSize:13,fontWeight:'800',color:C.copper}}>‹ {backLabel}</Txt></TouchableOpacity>
    <Row style={{alignItems:'center',justifyContent:'space-between'}}><Row style={{alignItems:'center',flex:1}}><View style={s.designTag}><Txt mono style={{fontWeight:'800'}}>{pool.design_code}</Txt></View><Txt style={{fontSize:17,fontWeight:'800',marginLeft:8,flex:1}}>{pool.design_name||pool.design_code}</Txt></Row><Flag>{pool.current?'CURRENT MONTH':'CLOSED MONTH'}</Flag></Row>
    <Txt style={{color:C.muted,marginVertical:10}}>{label(pool.month)} pool · {entries.length} PO lines · {sos.length} SO</Txt>
    <View style={s.cells}><Cell hi name="PO quantity" value={fmt(pool.po_quantity)}/><Cell name="SO pending" value={fmt(pool.so_pending)}/><Cell name="Covered" value={pool.covered==null?'—':fmt(pool.covered,'%')}/><Cell name={pool.current?'Produced MTD':'Produced'} value={fmt(pool.produced)}/><Cell name="Opening stock" value={fmt(pool.opening_stock)}/><Cell name="Drawn" value={fmt(pool.drawn)}/><Cell name="Loose stock" value={fmt(pool.loose_metres)}/></View>
    <View style={s.reconcile}><Txt mono style={{fontSize:10,color:rec?.reconciled?C.green:C.amber,lineHeight:16}}>{rec?.reconciled?`✓ Opening ${fmt(rec.opening_stock_qty)} + Produced ${fmt(rec.produced_qty)} − Out ${fmt(rec.out_qty)} = Closing ${fmt(rec.closing_stock_qty)}`:'⚠ Historical Opening + Produced − Out = Closing reconciliation not yet certified'}</Txt></View>
    <Section title="Pool pick rate" extra={<Txt mono style={{fontSize:12,fontWeight:'800'}}>{pool.rate==null?'—':`₹${Number(pool.rate).toFixed(4)}/pick`}</Txt>}>
      <Txt style={s.sub}>Σ PO qty × pick rate ÷ Σ PO qty · Checking conversion = PPI × metres × rate</Txt>
      {(pool.rate_parts||[]).map((p,i)=><Row key={`${p.po}-${i}`} style={s.tableRow}><Txt style={{fontWeight:'800',flex:1}}>{p.po}</Txt><Txt mono style={{flex:1,textAlign:'right'}}>{fmt(p.qty)}</Txt><Txt mono style={{flex:1,textAlign:'right'}}>{p.rate==null?'—':`₹${Number(p.rate).toFixed(4)}`}</Txt></Row>)}
    </Section>
    <Section title="Entry order · who is served first" extra={<Flag warn>BINDS UNVERIFIED</Flag>}>
      {entries.length?entries.map((e,i)=><View style={s.entry} key={`${e.po}-${i}`}><Row style={{alignItems:'center',justifyContent:'space-between'}}><Row style={{alignItems:'center'}}><Txt mono style={{color:C.copper,fontWeight:'800',marginRight:8}}>#{e.entry_order||i+1}</Txt><Txt style={{fontWeight:'800'}}>{e.po}</Txt><Txt style={{color:C.muted}}> · Exec {e.executive||'—'}</Txt></Row>{e.carried&&<Flag warn>OVERDUE</Flag>}</Row>
          <Txt style={[s.sub,{marginTop:6}]}>Entered {date(e.entered_at)} · Due {date(e.delivery_date)}</Txt>
          <Row style={{flexWrap:'wrap',marginTop:7}}>{[['Qty',e.qty],['Drawn',e.drawn_to_month],['Remaining',e.remaining],['Covered',e.covered],['Gap',e.gap]].map(([k,v])=><View style={s.miniMetric} key={k}><Txt style={{color:C.muted,fontSize:9}}>{k}</Txt><Txt mono style={{fontWeight:'800',fontSize:10}}>{fmt(v)}</Txt></View>)}</Row>
          {e.covered_percent!=null&&<MobileProgress percent={e.covered_percent} po={e.po}/>}
        </View>):<Empty>No eligible PO entries in this month.</Empty>}
    </Section>
    <Section title={`Sales orders · ${sos.length}`}>
      {sos.length?sos.map((o,i)=><View key={`${o.so_reference}-${i}`} style={s.soRow}><Row style={{justifyContent:'space-between'}}><Txt style={{fontWeight:'800'}}>{o.so_reference}</Txt><Txt mono>{fmt(o.pending_qty)} pending</Txt></Row><Txt style={s.sub}>Exec {o.executive||'—'} · {o.customer||'Customer unavailable'} · Due {date(o.delivery_date)}</Txt>{o.carried&&<Flag warn>CARRIED</Flag>}</View>):<Empty>Sales order details unavailable.</Empty>}
      {pool.so_pending_status!=='verified'&&<Txt style={s.sub}>Historical SO pending and greige-equivalent conversion are not yet certified.</Txt>}
    </Section>
    <Section title={`Loose rolls · ${pool.loose_rolls?.length||0} · ${fmt(pool.loose_metres)}`} extra={<TouchableOpacity onPress={()=>setShowRolls(v=>!v)}><Txt style={{fontWeight:'800',color:C.copper}}>{showRolls?'Hide':'Show'}</Txt></TouchableOpacity>}>
      {pool.loose_metres==null&&<Txt style={s.sub}>As-of-month physical loose stock unavailable; not inferred from current stock.</Txt>}
      {showRolls&&(pool.loose_rolls?.length?pool.loose_rolls.map((r,i)=><Row key={r.roll_id||i} style={s.tableRow}><Txt mono style={{flex:1,fontSize:10}}>{r.roll_id||r.roll}</Txt><Txt mono>{fmt(r.greige_metres??r.qty)}</Txt></Row>):<Empty>No verified roll detail available.</Empty>)}
    </Section>
    <Section title={`Bind log · ${events.length}`} extra={<Flag warn>APPEND-ONLY</Flag>}>
      {events.length?events.map((e,i)=><View style={s.entry} key={e.id||i}><Row style={{justifyContent:'space-between'}}><Txt style={{fontWeight:'800'}}>{date(e.event_date||e.date)} · {e.executive||e.exec}</Txt><Txt mono style={{fontWeight:'800'}}>{fmt(e.metres)}</Txt></Row><Txt style={s.sub}>{e.via} · {e.reference||e.ref} · {e.po_no||e.po||'NO PO'}</Txt>{e.no_po&&<Flag danger>NO PO · punch a PO to cover it</Flag>}{e.over_metres>0&&<Flag danger>OVER {fmt(e.over_metres)}</Flag>}{e.ahead_of?.length>0&&<Flag warn>DREW AHEAD OF</Flag>}</View>):<Empty>Verified binds will appear after source-save event integration.</Empty>}
    </Section>
    <Section title="Planned vs realised · greige m"><Empty>Costing and weighted SO rates require verified snapshots. Below-cost flags are not guessed.</Empty></Section>
    {(pool.issues||[]).length>0&&<View style={s.warning}><Txt style={{fontWeight:'800',color:C.amber}}>Evidence needed</Txt>{pool.issues.map((msg,i)=><Txt key={i} style={{color:C.amber,marginTop:4,lineHeight:16}}>{msg}</Txt>)}</View>}
  </View>;
}
export default function ProductionPoolsTab({apiBase='/api',prptype,yearno,property='',requestFn,view='owner'}) {
  const [month,setMonth]=useState(dateMonth()),[flt,setFlt]=useState('all'),[selected,setSelected]=useState(null),
    [loading,setLoading]=useState(false),[error,setError]=useState(null),[data,setData]=useState(null),[revision,setRevision]=useState(0);
  const months=useMemo(()=>Array.from({length:8},(_,i)=>move(dateMonth(),-i)),[]);
  useEffect(()=>{let active=true;(async()=>{setLoading(true);setError(null);try{
      const fy=Number(month.slice(5))>=4?Number(month.slice(0,4))-1999:Number(month.slice(0,4))-2000; // Month drives FY for historical chips.
      const q=`prptype=${encodeURIComponent(prptype)}&yearno=${fy}&month=${month}&view=${encodeURIComponent(view)}&include_detail=1&pool_ui=1&per_page=100${property?'&property='+encodeURIComponent(property):''}`;
      const url=`${apiBase.replace(/\/$/,'')}/getProductionOrderPools?${q}`;
      if (typeof requestFn !== 'function') throw new Error('Authenticated API client is required.');
      const raw=await requestFn(url);
      const json=raw?.data ?? raw;
      if(!json?.success||!json?.response?.pool_view)throw new Error('POOL backend contract unavailable; deploy Laravel files first.');
      if(active)setData(json.response.pool_view);
    }catch(err){if(active){setError(err?.message||'Unable to load Pools');setData(null)}}finally{if(active)setLoading(false)}})();return()=>{active=false}},[month,prptype,yearno,property,apiBase,requestFn,view,revision]);
  const pools=data?.pools||[]; // Authenticated backend already restricts view=my.
  const counts={all:pools.length,overdue:pools.every(x=>x.overdue_count!=null)?pools.filter(x=>x.overdue_count>0).length:null,
    marked:pools.every(x=>x.marked_binds!=null)?pools.filter(x=>x.marked_binds>0).length:null,
    below:pools.every(x=>x.below_cost_count!=null)?pools.filter(x=>x.below_cost_count>0).length:null};
  const display=pools.filter(p=>flt==='all'||(flt==='overdue'&&p.overdue_count>0)||(flt==='marked'&&p.marked_binds>0)||(flt==='below'&&p.below_cost_count>0))
    .sort((a,b)=>(b.entries?.length||0)-(a.entries?.length||0)||String(a.design_code).localeCompare(String(b.design_code)));
  const kpi=data?.kpis||{},selectedPool=pools.find(x=>x.key===selected);
  return <ScrollView style={s.page} contentContainerStyle={{padding:12,paddingBottom:36,maxWidth:1420,width:'100%',alignSelf:'center'}} refreshControl={<RefreshControl refreshing={loading} onRefresh={()=>setRevision(x=>x+1)}/> }>
    {selectedPool?<Detail pool={selectedPool} onBack={()=>setSelected(null)} backLabel={view==='my'?'My orders':'Pools'}/>:
      <><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingBottom:11}}>{months.map(m=><TouchableOpacity key={m} onPress={()=>{setMonth(m);setSelected(null)}} style={[s.chip,m===month&&s.selectedChip]}><Txt style={{fontWeight:'800',color:m===month?C.copper:C.muted}}>{label(m)}</Txt></TouchableOpacity>)}</ScrollView>
        {view==='my'&&<Txt style={{fontWeight:'800',fontSize:13,marginBottom:10}}>My orders · proportionate pool production</Txt>}
        <View style={s.cells}><Cell hi name="PO quantity" value={fmt(kpi.po_quantity)}/><Cell name="SO pending" value={fmt(kpi.so_pending)}/><Cell name="Loose stock" value={fmt(kpi.loose_stock)}/><Cell name="Overdue lines" value={fmt(kpi.overdue_lines,'')}/><Cell name="Marked binds" value={fmt(kpi.marked_binds,'')}/><Cell name="Below-cost POs" value={fmt(kpi.below_cost_pos,'')}/></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingBottom:10}}>{[['all','All'],['overdue','Overdue'],['marked','Marked'],['below','Below cost']].map(([k,v])=><TouchableOpacity key={k} onPress={()=>setFlt(k)} style={[s.chip,flt===k&&s.activeChip]}><Txt style={{fontWeight:'800',color:flt===k?'white':C.muted}}>{v} · {counts[k]??'—'}</Txt></TouchableOpacity>)}</ScrollView>
        {!!data?.note&&<Txt style={[s.sub,{marginBottom:10}]}>{data.note}</Txt>}
        {flt==='marked'&&<Section title="Marked binds">{counts.marked==null?<Empty>Persistent bind log not yet connected.</Empty>:<Empty>There are no marked binds in this month.</Empty>}</Section>}
        {display.length?display.map(p=><TouchableOpacity key={p.key} style={s.poolCard} onPress={()=>setSelected(p.key)}><Row style={{alignItems:'center'}}><View style={s.designTag}><Txt mono style={{fontWeight:'800'}}>{p.design_code}</Txt></View><View style={{flex:1,marginLeft:8}}><Txt style={{fontWeight:'800',fontSize:13}}>{p.design_name||p.design_code} · {label(p.month)}</Txt><Txt style={s.sub}>{p.entries?.length||0} PO lines · {p.sales_orders?.length||0} SO · {p.property}</Txt></View><Flag>{p.current?'CURRENT':'CLOSED'}</Flag></Row>
          {view==='my'&&p.my_orders&&<Txt style={{color:C.copper,fontWeight:'800',marginTop:7}}>My share: {fmt(p.my_orders.production_share_metres)} produced · {fmt(p.my_orders.my_po_quantity)} PO</Txt>}
          <Row style={{flexWrap:'wrap',marginTop:10}}>{[['PO qty',p.po_quantity],['SO pending',p.so_pending],['Produced',p.produced],['Drawn',p.drawn],['Loose',p.loose_metres]].map(([n,v])=><View key={n} style={s.cardMetric}><Txt style={{color:C.muted}}>{n} <Txt mono style={{fontWeight:'800'}}>{fmt(v)}</Txt></Txt></View>)}</Row>
          <Row style={{justifyContent:'space-between',marginTop:9}}><Txt style={s.sub}>{(p.entries||[]).filter(e=>e.carried).length} carried POs</Txt><Txt style={[s.sub,{color:C.copper,fontWeight:'800'}]}>Open pool ›</Txt></Row>
        </TouchableOpacity>):!loading&&<Empty>No pools for selected month/filter.</Empty>}
      </>}
    {loading&&<ActivityIndicator style={{margin:15}} color={C.copper}/>}
    {error&&<TouchableOpacity style={s.warning} onPress={()=>setRevision(x=>x+1)}><Txt style={{color:C.red}}>{error} · Tap to retry</Txt></TouchableOpacity>}
  </ScrollView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:C.bg},row:{flexDirection:'row'},chip:{paddingVertical:9,paddingHorizontal:13,marginRight:6,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:'white'},selectedChip:{borderColor:C.copper,backgroundColor:'#FFF6EA'},activeChip:{backgroundColor:C.nav,borderColor:C.nav},cells:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginBottom:10},cell:{width:'48.7%',backgroundColor:'white',padding:11,borderRadius:9,borderWidth:1,borderColor:C.border,marginBottom:7,minHeight:63},cellHi:{backgroundColor:'#FFF9F1',borderColor:'#EFDCC3'},cellLabel:{fontWeight:'800',fontSize:10,color:C.muted,marginBottom:6},cellValue:{fontSize:14,fontWeight:'800'},section:{backgroundColor:'white',borderWidth:1,borderColor:C.border,borderRadius:10,padding:12,marginBottom:11},sectionTitle:{fontSize:11,fontWeight:'800',color:C.muted,textTransform:'uppercase',flex:1},empty:{paddingVertical:17,paddingHorizontal:10,borderRadius:8,borderStyle:'dashed',borderWidth:1,borderColor:C.border,backgroundColor:'#FAFBFC'},sub:{fontSize:10,color:C.muted,lineHeight:17},poolCard:{borderColor:C.border,borderWidth:1,borderRadius:11,padding:12,marginBottom:9,backgroundColor:'white'},designTag:{backgroundColor:'#E7EDF4',borderRadius:6,borderColor:'#CDD9E7',borderWidth:1,paddingVertical:6,paddingHorizontal:8},flag:{backgroundColor:'#EAF4EE',borderRadius:14,paddingHorizontal:7,paddingVertical:4,alignSelf:'flex-start'},flagText:{color:C.green,fontSize:8,fontWeight:'800'},warn:{backgroundColor:'#FFF2D9'},danger:{backgroundColor:'#FBECEC'},cardMetric:{backgroundColor:C.alt,borderRadius:6,padding:7,marginRight:5,marginBottom:5},reconcile:{paddingVertical:11,marginBottom:8,borderTopWidth:1,borderColor:C.border},entry:{borderTopWidth:1,borderColor:C.border,paddingVertical:10},miniMetric:{marginRight:12,marginBottom:6},progress:{height:7,borderRadius:6,backgroundColor:C.alt,overflow:'hidden',marginTop:7},progressFill:{height:7,backgroundColor:C.copper},tableRow:{paddingVertical:9,borderBottomWidth:1,borderColor:C.border,justifyContent:'space-between'},soRow:{paddingVertical:9,borderBottomWidth:1,borderColor:C.border},warning:{padding:12,borderColor:'#EEDAAA',borderWidth:1,borderRadius:9,backgroundColor:'#FFF9EF'}
});
