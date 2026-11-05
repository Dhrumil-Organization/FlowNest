// FILE: src/features/productionOrders/pools/ProductionPoolsTab.jsx
// Madhusudhan ERP · Production Orders > Pools ONLY.
// Layout based on the client's Claude Artifact PoolBoard / PoolCard / PoolDetail.
// Existing production entry, Job work, registry and API client are untouched.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const T = {
  nav:'#0D1B2A',bg:'#F5F2EE',surface:'#FFFFFF',border:'#E5E0DA',muted:'#9A9590',sub:'#F8F5F1',alt:'#F0EDE8',
  ink:'#1A1514',copper:'#C87533',green:'#2A6044',red:'#B23A2A',amber:'#C98A1A',blue:'#3A568A',purple:'#652880',
};
const ymNow=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
const shift=(m,n)=>{const [y,k]=m.split('-').map(Number),d=new Date(y,k-1+n,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
const monthName=m=>{try{return new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN',{month:'short',year:'numeric'});}catch{return m;}};
// FY ending year: Apr 2026–Mar 2027 => 27, Apr 2027 => 28.
const fyOf=m=>{const [y,k]=m.split('-').map(Number);return (y+(k>=4?1:0))%100;};
const fyLabel=m=>{const [y,k]=m.split('-').map(Number);const a=k>=4?y:y-1;return `${a}-${String((a+1)%100).padStart(2,'0')}`;};
const fmt=(v,unit='m')=>v==null||!Number.isFinite(Number(v))?'—':`${Number(v).toLocaleString('en-IN',{maximumFractionDigits:2})}${unit?' '+unit:''}`;
const dmy=v=>{const s=String(v||'').replace(/\D/g,'');return s.length>=8?`${s.slice(6,8)}-${s.slice(4,6)}-${s.slice(0,4)}`:'—';};
const integer=v=>v==null?'—':Number(v).toLocaleString('en-IN');
const pct=(v)=>Number.isFinite(Number(v))&&v!=null?Math.max(0,Math.min(100,Number(v))):null;
const nonNull=v=>v!==undefined&&v!==null;
// Artifact shows executive names: GENSEXE.LngName by code (pool_view.executive_names).
let EXEC_NAMES={};
const exName=c=>{const k=String(c??'').trim();return k===''||k==='—'?'—':(EXEC_NAMES[k]||k);};
// Artifact poolAheadTxt: "Rahul (PO-0001 · 2,378 m unsold, has SO)"
const aheadTxt=list=>{const by={};(list||[]).forEach(a=>{const b=by[a.exec]||(by[a.exec]={exec:a.exec,pos:[],unsold:0});const po=a.po_no||a.po_uid;if(po&&!b.pos.includes(po))b.pos.push(po);b.unsold+=Number(a.unsold||0);});
  return Object.values(by).map(b=>`${exName(b.exec)} (${b.pos.join(', ')} · ${fmt(b.unsold)} unsold)`).join('; ');};

function Txt({children,style,mono=false,...rest}) {return <Text {...rest} style={[styles.text,mono&&styles.mono,style]}>{children}</Text>;}
function Row({children,style}) {return <View style={[styles.row,style]}>{children}</View>;}
function Pill({children,tone='green'}) {const color=T[tone]||T.green;return <View style={[styles.pill,{borderColor:color+'55',backgroundColor:color+'11'}]}><Txt style={{color,fontSize:9,fontWeight:'800'}}>{children}</Txt></View>;}
function Chip({children,active,onPress,month=false}) {return <TouchableOpacity accessibilityRole="button" accessibilityState={{selected:!!active}} onPress={onPress} style={[styles.chip,active&&(month?styles.activeMonth:styles.activeFilter)]}><Txt style={{fontWeight:'800',fontSize:11.5,color:active?(month?T.copper:'#FFFFFF'):T.muted}}>{children}</Txt></TouchableOpacity>;}
function PvrCell({v}) {
  if(!v)return <Txt mono style={{flex:1,textAlign:'right',color:T.muted,fontSize:11}}>—</Txt>;
  const net=v.rate_net??v.net_back;const m=v.margin;
  return <View style={{flex:1,alignItems:'flex-end'}}><Txt mono style={{fontSize:11,fontWeight:'800',color:T.muted}}>{net==null?'—':`₹${Number(net).toFixed(2)}`} − {v.cost==null?'—':`₹${Number(v.cost).toFixed(2)}`}</Txt>
    {m!=null&&<Txt mono style={{fontSize:11,fontWeight:'800',color:m>=0?T.green:T.red}}>{m>=0?'+':''}{Number(m).toFixed(2)}{v.margin_pct!=null?` · ${v.margin_pct}%`:''}</Txt>}</View>;
}
function KPI({label,value,hi,columns}) {return <View style={[styles.kpi,{width:columns===3?'32.7%':'49.4%'},hi&&styles.kpiHi]}><Txt style={styles.kpiTitle}>{label}</Txt><Txt mono style={[styles.kpiValue,hi&&{color:T.copper}]}>{value}</Txt></View>;}
function Mini({name,value,tone}) {return <View style={styles.mini}><Txt style={styles.miniTitle}>{name}</Txt><Txt mono style={[styles.miniValue,tone&&{color:T[tone]}]}>{value}</Txt></View>;}
function Track({value,tone='copper',onPress,detailText}) {
  const [hover,setHover]=useState(false),p=pct(value);
  return <View style={{position:'relative'}}>
    <TouchableOpacity disabled={!onPress&&!detailText} onPress={()=>onPress?onPress():setHover(x=>!x)} onHoverIn={()=>setHover(true)} onHoverOut={()=>setHover(false)} accessibilityRole="button" accessibilityLabel={detailText|| (p===null?'Coverage unavailable':`Coverage ${Math.round(p)} percent`)} style={styles.track}>
      <View style={[styles.trackFill,{backgroundColor:T[tone]||T.copper,width:`${p??0}%`}]}/>
    </TouchableOpacity>
    {hover&&!!detailText&&<View pointerEvents="none" style={styles.trackTooltip}><Txt style={{color:'#FFF',fontSize:10}}>{detailText}</Txt></View>}
  </View>;
}
function Section({label,right,children}) {return <View style={styles.section}><Row style={{alignItems:'center',justifyContent:'space-between',marginBottom:7,gap:9}}><Txt style={styles.sectionTitle}>{label}</Txt>{right}</Row>{children}</View>;}
function Empty({children}) {return <Txt style={{color:T.muted,fontSize:11.5,lineHeight:19,paddingVertical:10}}>{children}</Txt>;}
function DateLabel({date}) {return <Txt mono style={styles.aux}>{dmy(date)}</Txt>;}

function PoolItem({pool,open,view}) {
  const rows=pool.entries||[], overdue=pool.overdue_count;
  const covered=rows.every(e=>nonNull(e.covered))?rows.reduce((s,e)=>s+Number(e.covered||0),0):null;
  const percent=covered!==null&&Number(pool.po_quantity)>0?100*covered/Number(pool.po_quantity):null;
  const metrics=[['PO qty',pool.po_quantity],['SO pending',pool.so_pending],['Produced'+(pool.current?' MTD':''),pool.produced],['Drawn',pool.drawn],['Loose stock',pool.loose_metres]];
  return <TouchableOpacity style={styles.pool} onPress={open} accessibilityRole="button" accessibilityLabel={`Open ${pool.design_name||pool.design_code} pool for ${monthName(pool.month)}`}>
    <Row style={{alignItems:'center',gap:9,marginBottom:8}}>
      <View style={styles.designTag}><Txt mono style={{fontWeight:'800',fontSize:10}}>{pool.design_code}</Txt></View>
      <View style={{flex:1,minWidth:0}}>
        <Txt numberOfLines={2} style={{fontSize:13,fontWeight:'800',color:T.ink}}>{pool.design_name||pool.design_code} <Txt style={{color:T.muted,fontSize:10,fontWeight:'600'}}>· {monthName(pool.month)}</Txt></Txt>
        <Txt style={styles.aux}>{rows.length} PO {rows.length===1?'line':'lines'} · {nonNull(pool.so_count)?pool.so_count:'—'} SO · {(pool.properties?.length?pool.properties:[pool.property]).filter(Boolean).join(' + ')}</Txt>
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:4,justifyContent:'flex-end',maxWidth:'35%'}}>
        {pool.current&&<Pill>CURRENT</Pill>}
        {nonNull(overdue)&&overdue>0&&<Pill tone="red">{overdue} OVERDUE</Pill>}
        {Number(pool.ahead_events_count||0)>0&&<Pill tone="amber">{pool.ahead_events_count} DREW AHEAD</Pill>}
        {nonNull(pool.marked_binds)&&pool.marked_binds>0&&<Pill tone="amber">{pool.marked_binds} MARKED</Pill>}
      </View>
    </Row>
    <Row style={{flexWrap:'wrap',gap:6}}>{metrics.map(([name,v])=><Mini key={name} name={name} value={fmt(v)} tone={name==='Loose stock'&&Number(v)>0?'green':null}/>)}</Row>
    <Row style={{alignItems:'center',marginTop:9,gap:8}}><View style={{flex:1}}><Track value={percent} tone={percent>=100?'green':'copper'} onPress={open} detailText={covered===null?'Coverage is not yet verified':`Covered ${fmt(covered)} / PO ${fmt(pool.po_quantity)} · ${Math.round(percent)}%`}/></View><Txt mono style={styles.aux}>{percent===null?'— covered':`${Math.round(percent)}% covered`}</Txt></Row>
    {view==='my'&&pool.my_orders&&<Txt style={{color:T.copper,fontWeight:'700',fontSize:10,marginTop:6}}>You · PO {fmt(pool.my_orders.my_po_quantity)} · produced share {fmt(pool.my_orders.production_share_metres)}</Txt>}
    {Number(pool.sales_dispatched_mtd||0)>0&&<Txt style={[styles.aux,{marginTop:5}]}>Sales dispatched this month · {fmt(pool.sales_dispatched_mtd)}</Txt>}
  </TouchableOpacity>;
}

function PoolDetail({pool,onBack,view}) {
  const [showRolls,setShowRolls]=useState(false);
  useEffect(()=>setShowRolls(false),[pool.key]);
  const entries=pool.entries||[],sos=pool.sales_orders||[],events=pool.bind_events||[];
  const summary=[['PO quantity',pool.po_quantity],['SO pending',pool.so_pending],['Covered',pool.covered],['Produced'+(pool.current?' MTD':''),pool.produced],['Opening stock',pool.opening_stock],['Drawn',pool.drawn],['Loose stock',pool.loose_metres]];
  const cols=useWindowDimensions().width>=760?3:2;
  const rec=pool.reconciliation;
  return <View>
    <TouchableOpacity accessibilityRole="button" onPress={onBack} style={{marginBottom:10,paddingVertical:3,alignSelf:'flex-start'}}><Txt style={{color:T.copper,fontWeight:'700',fontSize:13}}>‹ {view==='my'?'My orders':'Pools'}</Txt></TouchableOpacity>
    <Row style={{alignItems:'center',gap:9,marginBottom:5}}><View style={styles.designTag}><Txt mono style={{fontWeight:'800'}}>{pool.design_code}</Txt></View><Txt style={{fontSize:17,fontWeight:'800',color:T.ink,flex:1}}>{pool.design_name||pool.design_code}</Txt><Pill>{pool.current?'CURRENT MONTH':'CLOSED MONTH'}</Pill></Row>
    <Txt style={[styles.aux,{marginBottom:12}]}>{monthName(pool.month)} · FY {fyLabel(pool.month)} · {(pool.properties?.length?pool.properties:[pool.property]).filter(Boolean).join(' + ')} · design pool</Txt>
    <View style={styles.metrics}>{summary.map(([name,v])=><KPI key={name} label={name} value={fmt(v)} columns={cols} hi={name==='PO quantity'}/>)}</View>
    <Section label="Pool pick rate · weighted by PO quantity" right={<Txt mono style={{color:T.copper,fontWeight:'800',fontSize:14}}>{pool.rate==null?'—':`₹${Number(pool.rate).toFixed(4)}/pick`}</Txt>}>
      {pool.rate_parts?.length?<View>{pool.rate_parts.map((r,i)=><Row key={`${r.po}|${i}`} style={{justifyContent:'space-between',paddingVertical:4,borderBottomWidth:i===pool.rate_parts.length-1?0:1,borderBottomColor:T.alt}}><Txt style={styles.aux}>{r.po} · {fmt(r.qty)}</Txt><Txt mono style={{fontSize:11,fontWeight:'800'}}>{r.rate==null?'—':`₹${Number(r.rate).toFixed(4)}/pick`}</Txt></Row>)}</View>:<Empty>Approved PO rate breakdown is not available.</Empty>}
      <Txt style={[styles.aux,{marginTop:4}]}>Checking valuation · PPI × checked metres × pool pick rate.</Txt>
    </Section>
    {rec?<View style={styles.reconcile}><Txt style={{color:rec.ok?T.green:T.red,fontWeight:'800',fontSize:11}}>Opening {fmt(rec.opening??pool.opening_stock)} + Produced {fmt(rec.produced??pool.produced)} − Out {fmt(rec.out)} = Closing {fmt(rec.closing??pool.closing_stock)} {rec.ok?'✓':'⚠'}</Txt>{rec.ok===false&&<Txt style={{color:T.red,fontSize:10,marginTop:5}}>Difference: {fmt(rec.difference)}{rec.bad_rolls?.length?` · Affected rolls: ${rec.bad_rolls.slice(0,20).join(', ')}`:''}</Txt>}</View>:<View style={styles.reconcile}><Txt style={[styles.aux,{color:T.muted}]}>Opening + Produced − Out = Closing · awaiting dated roll reconciliation</Txt></View>}
    <Section label="Entry order · who is served first">
      {!entries.length&&<Empty>No eligible production order in this month.</Empty>}
      {entries.map((e,i)=>{
        const percentage=nonNull(e.covered_percent)?e.covered_percent:null;
        const isShort=nonNull(e.gap)&&Number(e.gap)>0;
        return <View key={`${e.uid||e.po}|${i}`} style={styles.entry}>
          <Row style={{alignItems:'center',gap:8}}><View style={styles.orderNumber}><Txt mono style={{color:'#FFF',fontSize:10,fontWeight:'800'}}>{e.entry_order||i+1}</Txt></View><View style={{flex:1}}><Txt style={{fontSize:12.5,fontWeight:'800',color:T.ink}}>{e.po} <Txt style={{color:T.muted,fontSize:10}}>· {exName(e.executive)}{(pool.properties||[]).length>1&&e.property?` · ${e.property}`:''}</Txt></Txt><Txt style={styles.aux}>{e.kind==='stock'?'Stock — no SO':'SO'} · entered {dmy(e.entered_at)}</Txt></View><View style={{alignItems:'flex-end'}}><Txt mono style={{fontWeight:'800'}}>{fmt(e.covered)} <Txt style={{color:T.muted}}> / {fmt(e.qty)}</Txt></Txt><Txt style={{fontSize:10,color:isShort?T.red:T.green,fontWeight:'800'}}>{!nonNull(e.gap)?'coverage pending':isShort?`${fmt(e.gap)} short`:'fully covered'}</Txt></View></Row>
          <Row style={{alignItems:'center',gap:8,marginTop:7}}><View style={{flex:1}}><Track value={percentage} tone={isShort?'red':'copper'} detailText={`PO ${e.po} · drawn ${fmt(e.drawn_mtd)} · covered ${fmt(e.covered)} of ${fmt(e.qty)}`}/></View><Txt mono style={styles.aux}>{percentage==null?'—':`${Math.round(percentage)}%`}</Txt></Row>
          <Row style={{flexWrap:'wrap',gap:5,marginTop:7}}><Pill tone="blue">drawn {fmt(e.drawn_mtd)}</Pill>{e.carried&&<Pill tone="red">OVERDUE · from {monthName(e.auth_month)}</Pill>}{e.overdue&&!e.carried&&<Pill tone="red">OVERDUE</Pill>}{e.no_po&&<Pill tone="red">NO PO</Pill>}{e.over_qty&&<Pill tone="red">OVER OWN QTY</Pill>}{e.drew_ahead&&<Pill tone="amber">DREW AHEAD</Pill>}{e.below_cost&&<Pill tone="red">BELOW COST</Pill>}</Row>
          {(e.ahead_detail||[]).map((a,j)=><Txt key={`ah${j}`} style={[styles.aux,{color:T.amber,marginTop:3}]}>⚑ {dmy(a.event_date)} · {exName(a.executive)} drew {fmt(a.metres)} ahead of {aheadTxt(a.ahead_of)}</Txt>)}
          {(e.passed_by||[]).map((a,j)=><Txt key={`pb${j}`} style={[styles.aux,{marginTop:3}]}>Passed by {[a.po_nos?.length?`PO ${a.po_nos.join(', ')}`:null,exName(a.executive)!=='—'?exName(a.executive):null].filter(Boolean).join(' · ')||(a.no_po?(a.via==='job'?'a job outward with no PO':'a sale with no PO'):'—')} · {dmy(a.event_date)} · {fmt(a.metres)} via {a.via||'—'}{a.reference?` · ${a.reference}`:''}</Txt>)}
        </View>;
      })}
      <Txt style={[styles.aux,{marginTop:8}]}>Covered = drawn + remaining pool production allocated in entry order; any shortfall belongs to later entrants. No transaction is blocked; ahead draws must be marked.</Txt>
    </Section>
    <Section label="Planned vs realised · per greige metre">
      {pool.planned_vs_realised?.rows?.length?<View>
        <Row style={{gap:6,paddingBottom:4}}><Txt style={[styles.pvrHead,{flex:1.3}]}>Per greige metre</Txt><Txt style={[styles.pvrHead,{flex:1,textAlign:'right'}]}>Planned · net-back − cost</Txt><Txt style={[styles.pvrHead,{flex:1,textAlign:'right'}]}>Realised · net-back − cost</Txt></Row>
        {pool.planned_vs_realised.rows.map((r,i)=><Row key={i} style={{gap:6,paddingVertical:6,borderTopWidth:1,borderColor:T.alt,alignItems:'center'}}>
          <View style={{flex:1.3}}><Txt style={{fontSize:11,fontWeight:'700'}}>{r.po||'—'} · {exName(r.executive)}{r.kind==='stock'?' · stock':''}</Txt><Txt style={styles.aux}>{r.kind==='stock'?'stock — realises when sold':'sale slice'}{r.below?' · BELOW COST':''}</Txt></View>
          <PvrCell v={r.planned}/><PvrCell v={r.realised}/>
        </Row>)}
        {pool.planned_vs_realised.total&&<Row style={{gap:6,paddingTop:6,borderTopWidth:1.5,borderColor:T.border,alignItems:'center'}}><Txt style={{flex:1.3,fontSize:11.5,fontWeight:'800'}}>Pool · sold so far</Txt><View style={{flex:1}}/><PvrCell v={pool.planned_vs_realised.total}/></Row>}
        <Txt style={[styles.aux,{marginTop:6}]}>Planned = the PO's saved costing and its SO rates. Realised = actual challan rate of the saved sale binds, against the PO's planned greige cost. Finished SOs are converted to greige metres: (rate − processing) × (1 − finish shrink).</Txt>
      </View>:<Empty>{pool.below_cost_status==='no_po_costing'?'No saved PO costing for this pool.':'PO costing not available for this pool.'}</Empty>}
    </Section>
    <Section label="Sales orders in this pool">
      {sos.length?sos.map((o,i)=><View style={styles.entry} key={`${o.so_reference}-${i}`}><Row style={{alignItems:'center',gap:6}}><View style={{flex:1}}><Txt style={{fontSize:12,fontWeight:'700'}}>{o.so_no||o.so_reference} <Txt style={styles.aux}>· {o.customer||'Customer'} · {o.executive_name||exName(o.executive)}{(pool.properties||[]).length>1&&o.property?` · ${o.property}`:''}{o.finished_code?` · finished ${o.finished_code}`:''}</Txt></Txt><Txt style={styles.aux}>Due {dmy(o.delivery_date)} · {o.greige_basis==='greige_from_design_finish_shrink'?`Finished ${fmt(o.ordered_qty)} → greige ${fmt(o.ordered_greige_qty)} (${o.finish_shrink_percent}% shrink)`:(o.fabric_type||'greige')}</Txt></View><View style={{alignItems:'flex-end'}}><Txt mono style={{fontWeight:'800'}}>{fmt(o.pending_qty)}</Txt><Txt style={styles.aux}>pending</Txt></View></Row><Row style={{gap:5,marginTop:4,flexWrap:'wrap'}}>{o.no_po_yet&&<Pill tone="amber">NO PO YET</Pill>}{o.overdue&&<Pill tone="red">{o.carried&&o.entry_month?`OVERDUE · from ${monthName(o.entry_month)}`:'OVERDUE'}</Pill>}</Row></View>):<Empty>Sales-order details are loaded only for a selected design.</Empty>}
      {pool.so_pending_status==='incomplete_greige_conversion_or_missing_balance'&&<Txt style={[styles.aux,{color:T.red,marginTop:5}]}>Some SO quantities require confirmed shrinkage or balance information.</Txt>}
    </Section>
    <Section label={`Loose rolls · ${nonNull(pool.loose_metres)?pool.loose_rolls?.length||0:'—'} · ${fmt(pool.loose_metres)}`} right={<TouchableOpacity onPress={()=>setShowRolls(x=>!x)}><Txt style={{color:T.copper,fontWeight:'700',fontSize:11}}>{showRolls?'Hide':'Show'}</Txt></TouchableOpacity>}>
      <Txt style={styles.aux}>Rolls remain loose until a sale or job outward pulls them into an executive's PO.</Txt>
      {showRolls&&(pool.loose_rolls?.length?<Row style={{flexWrap:'wrap',gap:5,marginTop:8}}>{pool.loose_rolls.slice(0,60).map((r,i)=><View style={styles.rollChip} key={r.roll_id||i}><Txt mono style={styles.aux}>{r.taka_no||r.roll_id||r.roll||r.id} · {fmt(r.greige_metres??r.qty??r.metres)}{r.stage==='finished'?' (finished '+fmt(r.raw_metres)+')':''}</Txt></View>)}{pool.loose_rolls.length>60&&<Txt style={styles.aux}>+{pool.loose_rolls.length-60} more</Txt>}</Row>:<Empty>As-of-month verified loose rolls are unavailable.</Empty>)}
    </Section>
    <Section label={`Bind log · ${pool.bind_status==='verified'?events.length:'—'}`}>
      {!events.length&&<Empty>{pool.bind_status==='verified'?'No saved bindings in this period.':'Saved bind history is not fully certified for the selected month.'}</Empty>}
      {events.map((e,i)=><View key={e.id||i} style={styles.entry}><Row style={{alignItems:'center',justifyContent:'space-between'}}><Txt style={{fontWeight:'700'}}>{dmy(e.event_date||e.date)} · {exName(e.executive||e.exec)} · {e.via||'—'}</Txt><Txt mono style={{fontWeight:'800'}}>{fmt(e.metres)} → {e.no_po?'NO PO':([...new Set((e.allocations||[]).map(a=>a.po_no).filter(Boolean))].join(', ')||e.po_no||e.po||'NO PO')}</Txt></Row><Txt style={styles.aux}>{e.reference||e.ref||'—'} · {e.roll_ids?.length??e.rollIds?.length??0} rolls</Txt>
        {(e.allocations||[]).map((a,j)=><Txt key={`po:${j}`} style={styles.aux}>PO {a.po_no||a.po_uid||'NO PO'} · {fmt(a.metres)}{Number(a.over_metres)>0?' · OVER '+fmt(a.over_metres):''}</Txt>)}
        {(e.rolls||[]).length>0&&<Txt style={styles.aux}>{e.rolls.slice(0,12).map(r=>`${r.taka_no||r.roll_id} (${fmt(r.greige_metres)})`).join(' · ')}{e.rolls.length>12?` · +${e.rolls.length-12} more`:''}</Txt>}<Row style={{marginTop:4,gap:5,flexWrap:'wrap'}}>{e.no_po&&<Pill tone="red">NO PO</Pill>}{Number(e.over_metres||0)>0&&<Pill tone="red">OVER {fmt(e.over_metres)}</Pill>}{e.ahead_of?.length>0&&<Pill tone="amber">DREW AHEAD OF</Pill>}</Row>
        {e.ahead_of?.length>0&&<Txt style={[styles.aux,{color:T.amber,marginTop:3}]}>Drew ahead of {aheadTxt(e.ahead_of)}</Txt>}
        {e.no_po&&<Txt style={[styles.aux,{color:T.red,marginTop:3}]}>⚑ {exName(e.executive)} has no PO in this pool — {e.message||'punch a PO to cover it'}.</Txt>}</View>)}
    </Section>
    {!!pool.issues?.length&&<View style={styles.issue}><Txt style={{fontWeight:'800',color:T.amber,fontSize:10,marginBottom:3}}>Data reconciliation pending</Txt>{pool.issues.map((e,i)=><Txt style={styles.aux} key={i}>• {e}</Txt>)}</View>}
  </View>;
}

// This is a virtual scrolling list, not a paginated user experience.
// Laravel still reads bounded batches in the background to avoid retrieving
// thousands of designs and all their historical transactions in one request.
// The user sees one continuous list, with search across the source universe.
const QUERY_LIMIT=100;
const WEB_LIST_HEIGHT=520;
const MOBILE_LIST_HEIGHT=390;
const SEARCH_DELAY_MS=350;
function combinePoolPages(a,b) {
  const byKey=new Map();
  for(const pool of [...(a?.pools||[]),...(b?.pools||[])]) byKey.set(pool.key,pool);
  const pools=Array.from(byKey.values());
  const sumNullable=key=>pools.every(p=>nonNull(p[key]))
    ? pools.reduce((total,p)=>total+Number(p[key]||0),0) : null;
  const sumMy=key=>pools.every(p=>nonNull(p?.my_orders?.[key]))
    ? pools.reduce((total,p)=>total+Number(p.my_orders[key]||0),0) : null;
  const my=a?.view_scope==='my'||b?.view_scope==='my';
  const loaded={po_quantity:my?sumMy('my_po_quantity'):sumNullable('po_quantity'),
    so_pending:my?sumMy('my_so_pending'):sumNullable('so_pending'),
    loose_stock:sumNullable('loose_metres'),overdue_lines:sumNullable('overdue_count'),
    marked_binds:sumNullable('marked_binds'),below_cost_pos:sumNullable('below_cost_count')};
  // Month-wide only when the server says these pages hold every live pool of the
  // month (bind ledger complete), the last page is in and every pool's figure is known.
  const lastIn=!b?.pagination?.more_available;
  const universe=Boolean(b?.pagination?.source_universe_complete);
  const complete=universe&&lastIn&&Object.values(loaded).every(nonNull);
  return {...a,...b,pools,loaded_page_kpis:loaded,monthly_totals_complete:complete,
    kpis:complete?loaded:Object.fromEntries(Object.keys(loaded).map(k=>[k,null])),
    so_summary_status:pools.every(p=>nonNull(p.so_pending))?'reconstructed':'partial'};
}
function endpoint(apiBase,params){
  const qs=Object.entries(params).filter(([,v])=>v!==''&&v!=null).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  return `${apiBase.replace(/\/$/,'')}/getProductionOrderPools?${qs}`;
}
// Why an SO line has no greige metres (Data status).
const MISSING_REASON=r=>r==='finish_shrink_missing'?'finished SO, design has no finish shrink (set it in Designs)'
  :r==='so_balance_missing'?'SO balance not recorded'
  :String(r||'').startsWith('unknown_fabric_type')?`unknown fabric type "${String(r).split(':')[1]||''}"`:String(r||'unknown');

export default function ProductionPoolsTab({apiBase='/api',prptype,yearno,property='',requestFn,view='owner'}) {
  const {width}=useWindowDimensions(),columns=width>=780?3:2;
  const listHeight=Platform.OS==='web'?WEB_LIST_HEIGHT:MOBILE_LIST_HEIGHT;
  const listRef=useRef(null);
  const pageBusy=useRef(false);
  const [month,setMonth]=useState(ymNow()),[filter,setFilter]=useState('all'),[selected,setSelected]=useState(null),[showStatus,setShowStatus]=useState(false);
  const [searchInput,setSearchInput]=useState(''),[search,setSearch]=useState('');
  const [data,setData]=useState(null),[overview,setOverview]=useState(null),[detail,setDetail]=useState(null);
  const [loading,setLoading]=useState(false),[detailLoading,setDetailLoading]=useState(false),[error,setError]=useState(null),[detailError,setDetailError]=useState(null);
  const [refresh,setRefresh]=useState(0),[loadingMore,setLoadingMore]=useState(false),[loadMoreError,setLoadMoreError]=useState(null);
  // Artifact: a chip for every month that can hold a pool (server list); 6 months until it arrives.
  const [serverMonths,setServerMonths]=useState(null);
  const months=useMemo(()=>serverMonths?.length?serverMonths:Array.from({length:6},(_,i)=>shift(ymNow(),-i)),[serverMonths]);
  const fy=fyOf(month);
  const isReady=Boolean(prptype&&property&&yearno&&typeof requestFn==='function');
  const requestKey=`${prptype}|${property}|${fy}|${month}|${view}|${search}`;
  useEffect(()=>{const timer=setTimeout(()=>setSearch(searchInput.trim()),SEARCH_DELAY_MS);return ()=>clearTimeout(timer);},[searchInput]);
  // Keep month-wide headline values independent of the search box. When
  // search is active, retain the unfiltered baseline rather than replacing
  // KPI values with the subset returned by a filtered query.
  useEffect(()=>{setOverview(null);},[month,view,property,prptype,refresh]);

  useEffect(()=>{
    let live=true;
    pageBusy.current=false;
    if(!isReady) {setData(null);setLoading(false);return ()=>{live=false};}
    setLoading(true);setError(null);setSelected(null);setDetail(null);setData(null);setLoadMoreError(null);setLoadingMore(false);
    listRef.current?.scrollToOffset?.({offset:0,animated:false});
    const url=endpoint(apiBase,{prptype,yearno:fy,month,view,pool_ui:1,include_detail:0,per_page:QUERY_LIMIT,page:1,property,search});
    (async()=>{try{
      const raw=await requestFn(url),json=raw?.data??raw;
      if(!json?.success||!json?.response?.pool_view)throw new Error('Unable to read the monthly Pools response.');
      const next={...json.response.pool_view,__key:requestKey};
      if(live){setData(next);if(!search)setOverview(next);
        if(Array.isArray(next.available_months)&&next.available_months.length)setServerMonths(next.available_months);
        if(next.executive_names&&typeof next.executive_names==='object')EXEC_NAMES={...EXEC_NAMES,...next.executive_names};}
    }catch(e){if(live){setError(e?.response?.data?.message||e?.message||'Unable to load Pools');setData(null);}}
    finally{if(live)setLoading(false);}})();
    return ()=>{live=false};
  },[apiBase,prptype,fy,month,view,property,requestFn,refresh,isReady,search,requestKey]);

  useEffect(()=>{
    let live=true;
    if(!selected||!isReady)return ()=>{live=false};
    setDetailLoading(true);setDetailError(null);setDetail(null);
    const url=endpoint(apiBase,{prptype,yearno:fy,month,view,pool_ui:1,include_detail:1,per_page:1,page:1,property:selected.property,design_code:selected.design_code});
    (async()=>{try{
      const raw=await requestFn(url),json=raw?.data??raw;
      const one=json?.response?.pool_view?.pools?.find(p=>String(p.design_code)===String(selected.design_code)&&String(p.property)===String(selected.property));
      if(!json?.success||!one)throw new Error('Unable to load selected pool details.');
      if(live)setDetail(one);
    }catch(e){if(live)setDetailError(e?.response?.data?.message||e?.message||'Unable to load selected pool');}
    finally{if(live)setDetailLoading(false);}})();
    return ()=>{live=false};
  },[selected,month,fy,prptype,view,requestFn,apiBase,isReady]);

  const poolPagination=data?.pagination||null;
  const mayFetchNext=Boolean(data&&poolPagination?.more_available&&!loading&&!loadingMore);
  const fetchNext=async()=>{
    if(!mayFetchNext||pageBusy.current)return;
    pageBusy.current=true;setLoadingMore(true);setLoadMoreError(null);
    const keyAtStart=requestKey;
    const nextPage=Number(poolPagination?.page||1)+1;
    try {
      const url=endpoint(apiBase,{prptype,yearno:fy,month,view,pool_ui:1,include_detail:0,per_page:QUERY_LIMIT,page:nextPage,property,search});
      const raw=await requestFn(url),json=raw?.data??raw;
      if(!json?.success||!json?.response?.pool_view)throw new Error('Unable to retrieve more pools while scrolling.');
      setData(old=>old?.__key===keyAtStart?
        {...combinePoolPages(old,json.response.pool_view),__key:keyAtStart}:old);
    }catch(e){
      setLoadMoreError(e?.response?.data?.message||e?.message||'Unable to load additional pools');
    }finally{pageBusy.current=false;setLoadingMore(false);}
  };
  const pools=data?.pools||[];
  const sorted=useMemo(()=>pools.slice().sort((a,b)=>(b.entries?.length||0)-(a.entries?.length||0)||String(a.design_code).localeCompare(String(b.design_code))),[pools]);
  const cnt={all:sorted.length,overdue:sorted.every(x=>nonNull(x.overdue_count))?sorted.filter(x=>x.overdue_count>0).length:null,
    marked:sorted.every(x=>nonNull(x.marked_binds))?sorted.filter(x=>x.marked_binds>0).length:null,
    below:sorted.every(x=>nonNull(x.below_cost_count))?sorted.filter(x=>x.below_cost_count>0).length:null};
  const listed=useMemo(()=>sorted.filter(p=>filter==='all'||(filter==='overdue'&&p.overdue_count>0)||(filter==='marked'&&p.marked_binds>0)||(filter==='below'&&(p.below_cost_known??p.below_cost_count)>0)),[sorted,filter]);
  // Search filters design records at the API before page retrieval; only the
  // already-returned matching rows are mounted in the virtualized list.
  const kpiSource=search?(overview?.month===month?overview:null):data;
  // Month totals saved on the server across every page (pool/month-totals): no scrolling needed.
  const mt=(overview?.month===month?overview:data)?.month_totals||null;
  const kpiComplete=Boolean(mt)||kpiSource?.monthly_totals_complete===true;
  const k=kpiSource?.kpis||{};
  const shown=mt?mt.kpis:(kpiComplete?k:{...k,...(kpiSource?.loaded_page_kpis||{})});
  const totals=[['PO quantity',fmt(shown.po_quantity)],['SO pending',fmt(shown.so_pending)],['Loose stock',fmt(shown.loose_stock)],
    ['Overdue lines',integer(shown.overdue_lines)],['Marked binds',integer(shown.marked_binds)],['Below-cost POs',integer(shown.below_cost_pos)]];
  const countSuffix=mt?'':(poolPagination?.more_available?'+':'');
  const changeMonth=m=>{setMonth(m);setFilter('all');setSearchInput('');setSearch('');};
  const retryNext=()=>{pageBusy.current=false;fetchNext();};
  const closeDetail=()=>{setSelected(null);setDetail(null);setDetailError(null);};

  if(selected) return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    {detailLoading&&<View style={styles.loading}><ActivityIndicator size="small" color={T.copper}/><Txt style={styles.aux}>Loading {selected.design_name||selected.design_code} · {monthName(month)}…</Txt></View>}
    {detailError&&<TouchableOpacity style={styles.issue} onPress={()=>setSelected({...selected})}><Txt style={{color:T.red}}>{detailError} · Tap to retry</Txt></TouchableOpacity>}
    <PoolDetail pool={detail||selected} view={view} onBack={closeDetail}/>
  </ScrollView>;

  return <View style={styles.page}>
    <View style={styles.boardContent}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{gap:6,paddingBottom:9}}>
        {months.map(m=><Chip month key={m} active={month===m} onPress={()=>changeMonth(m)}>{monthName(m)}</Chip>)}
      </ScrollView>
      {view==='my'&&<View style={[styles.section,{marginBottom:12}]}>
        <Txt style={{fontSize:18,fontWeight:'800',marginBottom:4}}>My orders</Txt>
        <Txt style={[styles.aux,{marginBottom:8}]}>Your production and sales orders inside the design pools · production share follows each executive’s proportion of the pool</Txt>
        <Row style={{gap:6,flexWrap:'wrap'}}>
          <Mini name="My PO qty · visible" value={pools.every(p=>nonNull(p.my_orders?.my_po_quantity))?fmt(pools.reduce((v,p)=>v+Number(p.my_orders.my_po_quantity||0),0)):'—'}/>
          <Mini name="My SO pending · visible" value={pools.every(p=>nonNull(p.my_orders?.my_so_pending))?fmt(pools.reduce((v,p)=>v+Number(p.my_orders.my_so_pending||0),0)):'—'}/>
          <Mini name="Production share · visible" value={pools.every(p=>nonNull(p.my_orders?.production_share_metres))?fmt(pools.reduce((v,p)=>v+Number(p.my_orders.production_share_metres||0),0)):'—'}/>
        </Row>
      </View>}
      <View style={styles.metrics}>{totals.map(([name,value],i)=><KPI key={name} label={name} value={value} hi={i===0} columns={columns}/>)}</View>
      {mt&&<Txt style={[styles.aux,{marginBottom:7}]}>Month totals of all {integer(mt.pools)} pools · worked out {mt.computed_at}
        {Object.entries(mt.missing||{}).filter(([,n])=>n>0).map(([key,n])=>` · ${key.replace(/_/g,' ')}: ${n} pool${n===1?'':'s'} without a figure, not included`).join('')}</Txt>}
      {!kpiComplete&&<Txt style={[styles.aux,{color:T.copper,marginBottom:7}]}>
        {search?'Month KPIs are not changed by search. ':''}{!kpiSource?'Complete monthly KPI source not available.'
          :!kpiSource?.pagination?.source_universe_complete?'Subtotals of the pools loaded so far: this month is before the bind history is complete.'
          :kpiSource?.pagination?.more_available?'Subtotals so far: scroll to load the remaining pools for the month totals.'
          :kpiSource?.board_stock?.pending>0?`Stock still being calculated for ${kpiSource.board_stock.pending} pool(s); Loose stock shows — until then.`
          :'Some pools are missing a figure, so that KPI shows —.'}
      </Txt>}
      <Row style={{gap:6,flexWrap:'wrap',marginBottom:9}}>
        {[['all','All'],['overdue','Overdue'],['marked','Marked'],['below','Below cost']].map(([key,name])=><Chip key={key} active={filter===key} onPress={()=>{setFilter(key);listRef.current?.scrollToOffset?.({offset:0,animated:false});}}>{name} · {mt&&!search?(mt.filters?.[key==='below'?'below_cost':key]??'—'):(cnt[key]===null?'—':`${cnt[key]}${countSuffix}`)}</Chip>)}
      </Row>
      <Row style={styles.searchBox}>
        <Txt style={{fontSize:19,color:T.muted,marginRight:8}}>⌕</Txt>
        <TextInput
          accessibilityLabel="Search production order pools"
          placeholder="Search design name or design code…"
          placeholderTextColor={T.muted}
          value={searchInput}
          onChangeText={setSearchInput}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {!!searchInput&&<TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear pool search" onPress={()=>setSearchInput('')} style={{paddingHorizontal:8,paddingVertical:4}}><Txt style={{fontSize:17,color:T.muted}}>×</Txt></TouchableOpacity>}
        {loading&&<ActivityIndicator size="small" color={T.copper}/>}
      </Row>
      <Row style={{alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
        <Txt style={styles.listTitle}>Design pools · {monthName(month)}</Txt>
        <TouchableOpacity accessibilityRole="button" onPress={()=>setShowStatus(x=>!x)}><Txt style={styles.aux}>{showStatus?'▾':'▸'} Data status</Txt></TouchableOpacity>
      </Row>
      {showStatus&&<View style={[styles.section,{marginBottom:8}]}><Txt style={[styles.aux,{lineHeight:17}]}>
        {data?.universe?.live_only
          ?`One pool per design with a PO or SO open this month (POs fully drawn earlier are left out${data?.universe?.dropped_po_count?`: ${data.universe.dropped_po_count}`:''}). `
          :'This month is before the bind history is complete, so pools with fully drawn POs may still be listed. '}
        More pools load while scrolling. Stock is read roll by roll from your database and shown with its reconciliation line. FY {fyLabel(month)}.
      </Txt>
        {mt?.so_missing_pools?.length>0&&<View style={{marginTop:8}}>
          <Txt style={{fontWeight:'800',fontSize:11,marginBottom:3}}>No SO pending figure · {mt.so_missing_pools.length} pool{mt.so_missing_pools.length===1?'':'s'} (left out of SO pending)</Txt>
          {mt.so_missing_pools.map(p=><Txt key={`${p.property}:${p.design_code}`} style={[styles.aux,{lineHeight:16}]}>
            • {p.design_code} {p.design_name||''} — {(p.lines||[]).length?(p.lines||[]).map(l=>`SO ${l.so_no||'?'} (${l.property}${l.finished_code?` · finished code ${l.design_code}`:''}) ${MISSING_REASON(l.reason)}${l.pending_finished_qty!=null?` · ${fmt(l.pending_finished_qty)} finished pending`:''}`).join('; '):'SO read incomplete'}
          </Txt>)}
        </View>}
      </View>}
      {filter==='marked'&&<Section label={`Marked binds · ${monthName(month)}`}>
        {sorted.flatMap(p=>(p.bind_events||[]).filter(e=>e.no_po||Number(e.over_metres)>0||(e.ahead_of||[]).length).map(e=>({...e,pool:p})))
          .sort((a,b)=>String(b.event_date).localeCompare(String(a.event_date))).map((e,i)=><TouchableOpacity key={`${e.pool.key}:${e.id||i}`} onPress={()=>setSelected(e.pool)} style={styles.entry}>
            <Row style={{alignItems:'center',gap:8}}><View style={styles.designTag}><Txt mono style={{fontSize:10,fontWeight:'800'}}>{e.pool.design_code}</Txt></View><View style={{flex:1}}><Txt style={{fontWeight:'700'}}>{dmy(e.event_date)} · {exName(e.executive)} · {e.via}</Txt><Txt style={styles.aux}>{e.reference||'—'}</Txt></View><Txt mono style={{fontWeight:'800'}}>{fmt(e.metres)}</Txt></Row>
            <Row style={{gap:5,flexWrap:'wrap',marginTop:4}}>{e.no_po&&<Pill tone="red">NO PO</Pill>}{Number(e.over_metres)>0&&<Pill tone="red">OVER {fmt(e.over_metres)}</Pill>}{e.ahead_of?.length>0&&<Pill tone="amber">DREW AHEAD OF {e.ahead_of.map(x=>x.po_no||x.po_uid).join(', ')}</Pill>}</Row>
            {e.ahead_of?.length>0&&<Txt style={[styles.aux,{color:T.amber}]}>{aheadTxt(e.ahead_of)}</Txt>}
            {e.no_po&&<Txt style={[styles.aux,{color:T.red}]}>{e.message||'punch a PO to cover it'}</Txt>}
          </TouchableOpacity>)}
        {cnt.marked===null&&<Empty>Saved bind history is incomplete. Recorded events do not establish the complete monthly count.</Empty>}
        {cnt.marked===0&&<Empty>No recorded flagged binds in the currently retrieved records.</Empty>}
      </Section>}
      {filter==='below'&&<Section label={`Below cost · ${monthName(month)}`}>
        {mt?.kpis?.below_cost_unknown_pos>0&&<Txt style={[styles.aux,{marginBottom:6}]}>{integer(mt.kpis.below_cost_unknown_pos)} PO{mt.kpis.below_cost_unknown_pos===1?'':'s'} with finished SO lines have no processing rate or finish shrink on their costing, so whether they are below cost is not known.</Txt>}
        {!sorted.some(p=>(p.entries||[]).some(e=>e.below_cost===true))?<Empty>{cnt.below===null?'No below-cost PO among the pools loaded so far.':'No below-cost POs this month.'}</Empty>:
          sorted.flatMap(p=>(p.entries||[]).filter(e=>e.below_cost===true).map(e=>({e,p}))).map(({e,p},i)=><TouchableOpacity key={`${p.key}:${e.po}:${i}`} onPress={()=>setSelected(p)} style={styles.entry}>
            <Row style={{alignItems:'center',gap:8}}><View style={styles.designTag}><Txt mono style={{fontSize:10,fontWeight:'800'}}>{p.design_code}</Txt></View><View style={{flex:1}}><Txt style={{fontWeight:'700'}}>{e.po} · {exName(e.executive)}</Txt><Txt style={styles.aux}>net-back {fmt(e.planned?.rate_net,'₹/m')} · cost {fmt(e.planned?.cost,'₹/m')}</Txt></View><Txt mono style={{fontWeight:'800',color:T.red}}>{fmt(e.planned?.margin,'₹/m')}</Txt></Row>
          </TouchableOpacity>)}
      </Section>}
      <View style={[styles.listViewport,{height:listHeight}]}>
        <FlatList
          ref={listRef}
          data={listed}
          style={{flex:1}}
          keyExtractor={p=>p.key}
          renderItem={({item})=><PoolItem pool={item} view={view} open={()=>setSelected(item)}/>}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          maxToRenderPerBatch={12}
          windowSize={9}
          onEndReachedThreshold={0.55}
          onEndReached={fetchNext}
          onScroll={e=>{const n=e.nativeEvent||{};const y=n.contentOffset?.y||0;const h=n.layoutMeasurement?.height||0;const full=n.contentSize?.height||0;if(full>0&&y+h>=full-300)fetchNext();}}
          scrollEventThrottle={240}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={()=>setRefresh(x=>x+1)} tintColor={T.copper}/>}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!loading?<View style={styles.pool}><Empty>{search?`No pool design found for “${search}”.`:filter!=='all'&&cnt[filter]===null?'Verified values for this filter are not yet available.':filter!=='all'?`No ${filter} designs in the currently retrieved records.`:'No pools loaded.'}</Empty></View>:null}
          ListFooterComponent={<View style={{paddingVertical:7,minHeight:32,alignItems:'center',justifyContent:'center'}}>
            {loadingMore&&<Row style={{gap:8,alignItems:'center'}}><ActivityIndicator size="small" color={T.copper}/><Txt style={styles.aux}>Loading more design pools…</Txt></Row>}
            {!!loadMoreError&&<TouchableOpacity onPress={retryNext} accessibilityRole="button"><Txt style={{color:T.red,fontWeight:'700',fontSize:11}}>{loadMoreError} · Retry</Txt></TouchableOpacity>}
            {!loading&&!loadingMore&&!loadMoreError&&!poolPagination?.more_available&&pools.length>0&&<Txt style={styles.aux}>End of available results</Txt>}
          </View>}
        />
      </View>
      {!!error&&<TouchableOpacity onPress={()=>setRefresh(x=>x+1)} style={styles.issue}><Txt style={{color:T.red}}>{error} · Tap to retry</Txt></TouchableOpacity>}
    </View>
  </View>;
}

const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:T.bg},pageContent:{width:'100%',maxWidth:1220,alignSelf:'center',paddingHorizontal:12,paddingTop:10,paddingBottom:20},
  boardContent:{flex:1,width:'100%',maxWidth:1220,alignSelf:'center',paddingHorizontal:12,paddingTop:10,paddingBottom:12},
  searchBox:{flexDirection:'row',alignItems:'center',borderRadius:9,borderColor:T.border,borderWidth:1,backgroundColor:T.surface,paddingHorizontal:12,minHeight:43,marginBottom:10},
  searchInput:{flex:1,fontFamily:'DMSans',fontSize:13,color:T.ink,paddingVertical:7,outlineStyle:'none'},
  listTitle:{fontWeight:'800',fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:0.5},
  listViewport:{flexShrink:1,minHeight:220,backgroundColor:T.bg,borderRadius:9,borderWidth:1,borderColor:T.border,overflow:'hidden'},listContent:{paddingHorizontal:5,paddingTop:7,paddingBottom:8},
  text:{color:T.ink,fontSize:11,fontFamily:'DMSans'},mono:{fontFamily:'DMMono',fontVariant:['tabular-nums']},aux:{fontSize:9.5,color:T.muted,lineHeight:15},row:{flexDirection:'row'},
  chip:{paddingHorizontal:12,paddingVertical:7,borderRadius:20,borderWidth:1.5,borderColor:T.border,backgroundColor:T.surface,alignItems:'center',justifyContent:'center'},activeMonth:{backgroundColor:'rgba(200,117,51,0.12)',borderColor:T.copper},activeFilter:{backgroundColor:T.nav,borderColor:T.nav},
  pvrHead:{fontSize:8,fontWeight:'800',color:T.muted,textTransform:'uppercase'},
  metrics:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12,justifyContent:'space-between'},kpi:{backgroundColor:T.sub,borderWidth:1,borderColor:T.border,borderRadius:9,paddingVertical:9,paddingHorizontal:11,minHeight:58},kpiHi:{backgroundColor:'#FCF5ED',borderColor:'#E2C6AB'},kpiTitle:{fontSize:8.5,color:T.muted,textTransform:'uppercase',letterSpacing:0.4,fontWeight:'800'},kpiValue:{fontSize:14,fontWeight:'800',marginTop:3},
  pool:{borderWidth:1,borderColor:T.border,borderRadius:9,backgroundColor:T.surface,paddingHorizontal:14,paddingVertical:12,marginBottom:8},designTag:{backgroundColor:'#F0EDE8',paddingHorizontal:8,paddingVertical:6,borderRadius:6,borderWidth:1,borderColor:T.border},
  pill:{borderRadius:12,paddingHorizontal:7,paddingVertical:3,borderWidth:1,alignSelf:'flex-start'},mini:{backgroundColor:T.sub,borderWidth:1,borderColor:T.border,borderRadius:8,paddingVertical:6,paddingHorizontal:9,minWidth:88},miniTitle:{fontSize:8,fontWeight:'800',color:T.muted,textTransform:'uppercase',letterSpacing:0.3},miniValue:{fontSize:12,fontWeight:'700',marginTop:2},
  track:{height:6,backgroundColor:T.alt,borderRadius:6,overflow:'hidden'},trackFill:{height:6,borderRadius:6},trackTooltip:{position:'absolute',left:0,bottom:12,backgroundColor:T.nav,paddingHorizontal:9,paddingVertical:7,borderRadius:6,maxWidth:280,zIndex:20},section:{borderWidth:1,borderColor:T.border,backgroundColor:T.surface,borderRadius:9,paddingHorizontal:14,paddingVertical:12,marginBottom:12},sectionTitle:{flex:1,fontSize:11,fontWeight:'800',textTransform:'uppercase',letterSpacing:0.5,color:T.muted},
  entry:{paddingVertical:9,paddingHorizontal:4,borderTopWidth:1,borderColor:T.alt},orderNumber:{width:23,height:23,borderRadius:12,backgroundColor:T.nav,alignItems:'center',justifyContent:'center'},reconcile:{borderColor:T.border,borderTopWidth:1,borderBottomWidth:1,paddingVertical:11,marginBottom:10},rollChip:{backgroundColor:T.sub,borderColor:T.border,borderWidth:1,borderRadius:6,paddingHorizontal:6,paddingVertical:4},loading:{padding:20,alignItems:'center',gap:7},issue:{backgroundColor:'#FFF9EF',borderColor:'#EFDAB1',borderWidth:1,borderRadius:9,padding:12,marginVertical:9},
});
