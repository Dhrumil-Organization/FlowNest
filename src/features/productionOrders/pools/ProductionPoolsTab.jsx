// FILE: src/features/productionOrders/pools/ProductionPoolsTab.jsx
// Madhusudhan ERP · Production Orders > Pools ONLY.
// Layout based on the client's Claude Artifact PoolBoard / PoolCard / PoolDetail.
// Existing production entry, Job work, registry and API client are untouched.
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

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

function Txt({children,style,mono=false,...rest}) {return <Text {...rest} style={[styles.text,mono&&styles.mono,style]}>{children}</Text>;}
function Row({children,style}) {return <View style={[styles.row,style]}>{children}</View>;}
function Pill({children,tone='green'}) {const color=T[tone]||T.green;return <View style={[styles.pill,{borderColor:color+'55',backgroundColor:color+'11'}]}><Txt style={{color,fontSize:9,fontWeight:'800'}}>{children}</Txt></View>;}
function Chip({children,active,onPress,month=false}) {return <TouchableOpacity accessibilityRole="button" accessibilityState={{selected:!!active}} onPress={onPress} style={[styles.chip,active&&(month?styles.activeMonth:styles.activeFilter)]}><Txt style={{fontWeight:'800',fontSize:11.5,color:active?(month?T.copper:'#FFFFFF'):T.muted}}>{children}</Txt></TouchableOpacity>;}
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
        <Txt style={styles.aux}>{rows.length} PO {rows.length===1?'line':'lines'} · {nonNull(pool.so_count)?pool.so_count:'—'} SO · {pool.property}</Txt>
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:4,justifyContent:'flex-end',maxWidth:'35%'}}>
        {pool.current&&<Pill>CURRENT</Pill>}
        {nonNull(overdue)&&overdue>0&&<Pill tone="red">{overdue} OVERDUE</Pill>}
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
    <Txt style={[styles.aux,{marginBottom:12}]}>{monthName(pool.month)} · FY {fyLabel(pool.month)} · {pool.property} · design pool</Txt>
    <View style={styles.metrics}>{summary.map(([name,v])=><KPI key={name} label={name} value={fmt(v)} columns={cols} hi={name==='PO quantity'}/>)}</View>
    <Section label="Pool pick rate · weighted by PO quantity" right={<Txt mono style={{color:T.copper,fontWeight:'800',fontSize:14}}>{pool.rate==null?'—':`₹${Number(pool.rate).toFixed(4)}/pick`}</Txt>}>
      {pool.rate_parts?.length?<View>{pool.rate_parts.map((r,i)=><Row key={`${r.po}|${i}`} style={{justifyContent:'space-between',paddingVertical:4,borderBottomWidth:i===pool.rate_parts.length-1?0:1,borderBottomColor:T.alt}}><Txt style={styles.aux}>{r.po} · {fmt(r.qty)}</Txt><Txt mono style={{fontSize:11,fontWeight:'800'}}>{r.rate==null?'—':`₹${Number(r.rate).toFixed(4)}/pick`}</Txt></Row>)}</View>:<Empty>Approved PO rate breakdown is not available.</Empty>}
      <Txt style={[styles.aux,{marginTop:4}]}>Checking valuation · PPI × checked metres × pool pick rate.</Txt>
    </Section>
    {rec?<View style={styles.reconcile}><Txt style={{color:rec.ok?T.green:T.red,fontWeight:'800',fontSize:11}}>Opening {fmt(rec.opening??pool.opening_stock)} + Produced {fmt(rec.produced??pool.produced)} − Out {fmt(rec.out)} = Closing {fmt(rec.closing??pool.closing_stock)} {rec.ok?'✓':'⚠'}</Txt>{rec.ok===false&&<Txt style={{color:T.red,fontSize:10,marginTop:5}}>Difference: {fmt(rec.difference)}</Txt>}</View>:<View style={styles.reconcile}><Txt style={[styles.aux,{color:T.muted}]}>Opening + Produced − Out = Closing · awaiting dated roll reconciliation</Txt></View>}
    <Section label="Entry order · who is served first">
      {!entries.length&&<Empty>No eligible production order in this month.</Empty>}
      {entries.map((e,i)=>{
        const percentage=nonNull(e.covered_percent)?e.covered_percent:null;
        const isShort=nonNull(e.gap)&&Number(e.gap)>0;
        return <View key={`${e.uid||e.po}|${i}`} style={styles.entry}>
          <Row style={{alignItems:'center',gap:8}}><View style={styles.orderNumber}><Txt mono style={{color:'#FFF',fontSize:10,fontWeight:'800'}}>{e.entry_order||i+1}</Txt></View><View style={{flex:1}}><Txt style={{fontSize:12.5,fontWeight:'800',color:T.ink}}>{e.po} <Txt style={{color:T.muted,fontSize:10}}>· {e.executive||'—'}</Txt></Txt><Txt style={styles.aux}>{e.kind==='stock'?'Stock — no SO':'SO'} · entered {dmy(e.entered_at)}</Txt></View><View style={{alignItems:'flex-end'}}><Txt mono style={{fontWeight:'800'}}>{fmt(e.covered)} <Txt style={{color:T.muted}}> / {fmt(e.qty)}</Txt></Txt><Txt style={{fontSize:10,color:isShort?T.red:T.green,fontWeight:'800'}}>{!nonNull(e.gap)?'coverage pending':isShort?`${fmt(e.gap)} short`:'fully covered'}</Txt></View></Row>
          <Row style={{alignItems:'center',gap:8,marginTop:7}}><View style={{flex:1}}><Track value={percentage} tone={isShort?'red':'copper'} detailText={`PO ${e.po} · drawn ${fmt(e.drawn_mtd)} · covered ${fmt(e.covered)} of ${fmt(e.qty)}`}/></View><Txt mono style={styles.aux}>{percentage==null?'—':`${Math.round(percentage)}%`}</Txt></Row>
          <Row style={{flexWrap:'wrap',gap:5,marginTop:7}}><Pill tone="blue">drawn {fmt(e.drawn_mtd)}</Pill>{e.carried&&<Pill tone="red">OVERDUE · from {monthName(e.auth_month)}</Pill>}{e.overdue&&!e.carried&&<Pill tone="red">OVERDUE</Pill>}{e.no_po&&<Pill tone="red">NO PO</Pill>}{e.over_qty&&<Pill tone="red">OVER OWN QTY</Pill>}{e.drew_ahead&&<Pill tone="amber">DREW AHEAD</Pill>}</Row>
        </View>;
      })}
      <Txt style={[styles.aux,{marginTop:8}]}>Covered = drawn + remaining pool production allocated in entry order; any shortfall belongs to later entrants. No transaction is blocked; ahead draws must be marked.</Txt>
    </Section>
    <Section label="Planned vs realised · per greige metre">
      {pool.planned_vs_realised?.rows?.length?pool.planned_vs_realised.rows.map((r,i)=><Row key={i} style={{justifyContent:'space-between',paddingVertical:7,borderTopWidth:i?1:0,borderColor:T.alt,gap:8}}><View style={{flex:1}}><Txt style={{fontSize:11,fontWeight:'700'}}>{r.po_no||r.po||'Production order'}</Txt><Txt style={styles.aux}>Cost {fmt(r.cost_per_greige_m,'₹/m')} · net-back {fmt(r.netback_per_greige_m,'₹/m')}</Txt></View><Txt mono style={{fontWeight:'800',color:Number(r.margin_per_greige_m)<0?T.red:T.green}}>{fmt(r.margin_per_greige_m,'₹/m')}</Txt></Row>):<Empty>Cost and realised sale rates are not yet verified for this pool.</Empty>}
    </Section>
    <Section label="Sales orders in this pool">
      {sos.length?sos.map((o,i)=><View style={styles.entry} key={`${o.so_reference}-${i}`}><Row style={{alignItems:'center',gap:6}}><View style={{flex:1}}><Txt style={{fontSize:12,fontWeight:'700'}}>{o.so_no||o.so_reference} <Txt style={styles.aux}>· {o.customer||'Customer'} · {o.executive_name||o.executive||'—'}</Txt></Txt><Txt style={styles.aux}>Due {dmy(o.delivery_date)} · {o.greige_basis==='greige_from_design_finish_shrink'?`Finished ${fmt(o.ordered_qty)} → greige ${fmt(o.ordered_greige_qty)} (${o.finish_shrink_percent}% shrink)`:(o.fabric_type||'greige')}</Txt></View><View style={{alignItems:'flex-end'}}><Txt mono style={{fontWeight:'800'}}>{fmt(o.pending_qty)}</Txt><Txt style={styles.aux}>pending</Txt></View></Row>{o.overdue&&<Pill tone="red">OVERDUE</Pill>}</View>):<Empty>Sales-order details are loaded only for a selected design.</Empty>}
      {pool.so_pending_status==='incomplete_greige_conversion_or_missing_balance'&&<Txt style={[styles.aux,{color:T.red,marginTop:5}]}>Some SO quantities require confirmed shrinkage or balance information.</Txt>}
    </Section>
    <Section label={`Loose rolls · ${nonNull(pool.loose_metres)?pool.loose_rolls?.length||0:'—'} · ${fmt(pool.loose_metres)}`} right={<TouchableOpacity onPress={()=>setShowRolls(x=>!x)}><Txt style={{color:T.copper,fontWeight:'700',fontSize:11}}>{showRolls?'Hide':'Show'}</Txt></TouchableOpacity>}>
      <Txt style={styles.aux}>Rolls remain loose until a sale or job outward pulls them into an executive's PO.</Txt>
      {showRolls&&(pool.loose_rolls?.length?<Row style={{flexWrap:'wrap',gap:5,marginTop:8}}>{pool.loose_rolls.slice(0,60).map((r,i)=><View style={styles.rollChip} key={r.roll_id||i}><Txt mono style={styles.aux}>{r.roll_id||r.roll||r.id} · {fmt(r.greige_metres??r.qty??r.metres)}</Txt></View>)}{pool.loose_rolls.length>60&&<Txt style={styles.aux}>+{pool.loose_rolls.length-60} more</Txt>}</Row>:<Empty>As-of-month verified loose rolls are unavailable.</Empty>)}
    </Section>
    <Section label={`Bind log · ${events.length}`}>
      {!events.length&&<Empty>Verified append-only binds will appear here after transaction-save integration.</Empty>}
      {events.map((e,i)=><View key={e.id||i} style={styles.entry}><Row style={{alignItems:'center',justifyContent:'space-between'}}><Txt style={{fontWeight:'700'}}>{dmy(e.event_date||e.date)} · {e.executive||e.exec} · {e.via||'—'}</Txt><Txt mono style={{fontWeight:'800'}}>{fmt(e.metres)} → {e.po_no||e.po||'NO PO'}</Txt></Row><Txt style={styles.aux}>{e.reference||e.ref||'—'} · {e.roll_ids?.length??e.rollIds?.length??0} rolls</Txt><Row style={{marginTop:4,gap:5,flexWrap:'wrap'}}>{e.no_po&&<Pill tone="red">NO PO</Pill>}{Number(e.over_metres||0)>0&&<Pill tone="red">OVER {fmt(e.over_metres)}</Pill>}{e.ahead_of?.length>0&&<Pill tone="amber">DREW AHEAD OF</Pill>}</Row></View>)}
    </Section>
    {!!pool.issues?.length&&<View style={styles.issue}><Txt style={{fontWeight:'800',color:T.amber,fontSize:10,marginBottom:3}}>Data reconciliation pending</Txt>{pool.issues.map((e,i)=><Txt style={styles.aux} key={i}>• {e}</Txt>)}</View>}
  </View>;
}

const QUERY_LIMIT=100;
// The endpoint paginates designs. Never present page 1 KPIs as the entire
// design universe, or silently discard PO/SO cards beyond the first 100.
function combinePoolPages(a,b) {
  const byKey=new Map();
  for(const pool of [...(a?.pools||[]),...(b?.pools||[])]) byKey.set(pool.key,pool);
  const pools=Array.from(byKey.values());
  const sumNullable=key=>pools.every(p=>nonNull(p[key]))
    ? pools.reduce((total,p)=>total+Number(p[key]||0),0) : null;
  const sumMy=key=>pools.every(p=>nonNull(p?.my_orders?.[key]))
    ? pools.reduce((total,p)=>total+Number(p.my_orders[key]||0),0) : null;
  const my=a?.view_scope==='my'||b?.view_scope==='my';
  return {...a,...b,pools,
    kpis:{
      po_quantity:my?sumMy('my_po_quantity'):sumNullable('po_quantity'),
      so_pending:my?sumMy('my_so_pending'):sumNullable('so_pending'),
      loose_stock:sumNullable('loose_metres'), overdue_lines:sumNullable('overdue_count'),
      marked_binds:sumNullable('marked_binds'), below_cost_pos:sumNullable('below_cost_count')
    },
    so_summary_status:pools.every(p=>nonNull(p.so_pending))?'reconstructed':'partial'
  };
}
function endpoint(apiBase,params){const qs=Object.entries(params).filter(([,v])=>v!==''&&v!=null).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');return `${apiBase.replace(/\/$/,'')}/getProductionOrderPools?${qs}`;}
export default function ProductionPoolsTab({apiBase='/api',prptype,yearno,property='',requestFn,view='owner'}) {
  const {width}=useWindowDimensions(),columns=width>=780?3:2;
  const [month,setMonth]=useState(ymNow()),[filter,setFilter]=useState('all'),[selected,setSelected]=useState(null),[showStatus,setShowStatus]=useState(false);
  const [data,setData]=useState(null),[detail,setDetail]=useState(null),[loading,setLoading]=useState(false),[detailLoading,setDetailLoading]=useState(false),[error,setError]=useState(null),[detailError,setDetailError]=useState(null),[refresh,setRefresh]=useState(0),[loadingMore,setLoadingMore]=useState(false),[loadMoreError,setLoadMoreError]=useState(null);
  // Rolling six calendar months, including the selected current month; no
  // financial-year boundary restriction. Each request uses that month's FY.
  const months=useMemo(()=>Array.from({length:6},(_,i)=>shift(ymNow(),-i)),[]);
  const fy=fyOf(month);
  const isReady=Boolean(prptype&&property&&yearno&&typeof requestFn==='function');

  useEffect(()=>{
    let live=true;
    if(!isReady) {setData(null);setLoading(false);return ()=>{live=false};}
    setLoading(true);setError(null);setSelected(null);setDetail(null);setData(null);setLoadMoreError(null);
    const url=endpoint(apiBase,{prptype,yearno:fy,month,view,pool_ui:1,include_detail:0,per_page:QUERY_LIMIT,page:1,property});
    (async()=>{try{const raw=await requestFn(url),json=raw?.data??raw;if(!json?.success||!json?.response?.pool_view)throw new Error('Unable to read the monthly Pools response.');if(live)setData(json.response.pool_view);}catch(e){if(live){setError(e?.response?.data?.message||e?.message||'Unable to load Pools');setData(null);}}finally{if(live)setLoading(false);}})();
    return ()=>{live=false};
  },[apiBase,prptype,fy,month,view,property,requestFn,refresh,isReady]);

  useEffect(()=>{
    let live=true;
    if(!selected||!isReady) return ()=>{live=false};
    setDetailLoading(true);setDetailError(null);setDetail(null);
    const url=endpoint(apiBase,{prptype,yearno:fy,month,view,pool_ui:1,include_detail:1,per_page:1,page:1,property:selected.property,design_code:selected.design_code});
    (async()=>{try{const raw=await requestFn(url),json=raw?.data??raw;
      const one=json?.response?.pool_view?.pools?.find(p=>String(p.design_code)===String(selected.design_code)&&String(p.property)===String(selected.property));
      if(!json?.success||!one)throw new Error('Unable to load selected pool details.');if(live)setDetail(one);
    }catch(e){if(live)setDetailError(e?.response?.data?.message||e?.message||'Unable to load selected pool');}finally{if(live)setDetailLoading(false);}})();
    return ()=>{live=false};
  },[selected,month,fy,prptype,view,requestFn,apiBase,isReady]);

  const poolPagination=data?.pagination||null;
  const mayLoadMore=!!poolPagination?.more_available && !loading && !loadingMore;
  const loadMore=async()=>{
    if(!mayLoadMore) return;
    const nextPage=(Number(poolPagination.page)||1)+1;
    setLoadingMore(true);setLoadMoreError(null);
    const activeMonth=month;
    try {
      const url=endpoint(apiBase,{prptype,yearno:fy,month:activeMonth,view,pool_ui:1,include_detail:0,per_page:QUERY_LIMIT,page:nextPage,property});
      const raw=await requestFn(url),json=raw?.data??raw;
      if(!json?.success||!json?.response?.pool_view) throw new Error('Unable to load the next pool page.');
      // Guard while the selected month is being changed. Changing the month
      // unmounts/restarts the main request; the next result is discarded.
      setData(old=>old&&old.month===activeMonth?combinePoolPages(old,json.response.pool_view):old);
    } catch(e) {setLoadMoreError(e?.response?.data?.message||e?.message||'Unable to load more pools');}
    finally {setLoadingMore(false);}
  };
  const pools=data?.pools||[];
  const sorted=useMemo(()=>pools.slice().sort((a,b)=>(b.entries?.length||0)-(a.entries?.length||0)||String(a.design_code).localeCompare(String(b.design_code))),[pools]);
  const cnt={all:sorted.length,overdue:sorted.every(x=>nonNull(x.overdue_count))?sorted.filter(x=>x.overdue_count>0).length:null,
    marked:sorted.every(x=>nonNull(x.marked_binds))?sorted.filter(x=>x.marked_binds>0).length:null,
    below:sorted.every(x=>nonNull(x.below_cost_count))?sorted.filter(x=>x.below_cost_count>0).length:null};
  const listed=sorted.filter(p=>filter==='all'||(filter==='overdue'&&p.overdue_count>0)||(filter==='marked'&&p.marked_binds>0)||(filter==='below'&&p.below_cost_count>0));
  const k=data?.kpis||{};
  const totals=[['PO quantity',fmt(k.po_quantity)],['SO pending',fmt(k.so_pending)],['Loose stock',fmt(k.loose_stock)],['Overdue lines',integer(k.overdue_lines)],['Marked binds',integer(k.marked_binds)],['Below-cost POs',integer(k.below_cost_pos)]];
  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={()=>setRefresh(x=>x+1)} tintColor={T.copper}/> }>
    {selected? <>
      {detailLoading&&<View style={styles.loading}><ActivityIndicator size="small" color={T.copper}/><Txt style={styles.aux}>Loading {selected.design_name||selected.design_code} · {monthName(month)}…</Txt></View>}
      {detailError&&<TouchableOpacity style={styles.issue} onPress={()=>setSelected({...selected})}><Txt style={{color:T.red}}>{detailError} · Tap to retry</Txt></TouchableOpacity>}
      <PoolDetail pool={detail||selected} view={view} onBack={()=>{setSelected(null);setDetail(null);setDetailError(null);}}/>
    </>:<>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingBottom:9}}>{months.map(m=><Chip month key={m} active={month===m} onPress={()=>{setMonth(m);setFilter('all');}}>{monthName(m)}</Chip>)}</ScrollView>

      {view==='my'&&<Txt style={{fontWeight:'800',fontSize:12,marginBottom:8}}>My orders · design-pool production share</Txt>}

      <View style={styles.metrics}>{totals.map(([name,value],i)=><KPI key={name} label={name} value={value} hi={i===0} columns={columns}/>)}</View>

      <Row style={{gap:6,flexWrap:'wrap',marginBottom:10}}>{[['all','All'],['overdue','Overdue'],['marked','Marked'],['below','Below cost']].map(([key,name])=><Chip key={key} active={filter===key} onPress={()=>setFilter(key)}>{name} · {cnt[key]===null?'—':`${cnt[key]}${poolPagination?.more_available?'+':''}`}</Chip>)}</Row>
      {filter==='marked'&&<Section label={`Marked binds · ${monthName(month)}`}><Empty>{cnt.marked===null?'Persistent bind events are not yet certified.':cnt.marked===0?'No drew-ahead, over-quantity or no-PO binds this month.':'Select a marked pool below for its bind log.'}</Empty></Section>}
      {filter==='below'&&<Section label={`Approved below cost · ${monthName(month)}`}><Empty>{cnt.below===null?'Verified costing comparisons are not yet available.':cnt.below===0?'No below-cost POs in this month.':'Select a flagged pool to see the costing.'}</Empty></Section>}
      <Row style={{alignItems:'center',justifyContent:'space-between',marginBottom:9,gap:8}}>
        <TouchableOpacity accessibilityRole="button" onPress={()=>setShowStatus(s=>!s)} style={{paddingVertical:3}}><Txt style={{color:T.muted,fontSize:10,fontWeight:'700'}}>{showStatus?'▾':'▸'} Data status</Txt></TouchableOpacity>
        {poolPagination?.more_available&&<TouchableOpacity accessibilityRole="button" onPress={loadMore} disabled={!mayLoadMore} style={{paddingVertical:3}}><Txt style={{color:T.copper,fontSize:10,fontWeight:'800'}}>{loadingMore?'Loading…':`Showing ${pools.length} of ${poolPagination.total??'more'} · Load more`}</Txt></TouchableOpacity>}
      </Row>
      {showStatus&&<View style={[styles.section,{marginBottom:10}]}><Txt style={[styles.aux,{lineHeight:17}]}>FY {fyLabel(month)} · {monthName(month)}. PO totals are from the current pool source; historical SO balances are reconstructed from dated dispatches. Checking metres are recorded production. Loose stock, confirmed draws, marks and cost comparison appear only after their dated source events are verified. {poolPagination?.more_available?'Totals and filters currently include only loaded designs.':''}</Txt></View>}
      {listed.map(p=><PoolItem key={p.key} pool={p} view={view} open={()=>setSelected(p)}/>)}
      {!loading&&!listed.length&&<View style={styles.pool}><Empty>{filter!=='all'&&cnt[filter]===null?'Verified figures for this filter are not yet available.':data?`Nothing ${filter==='all'?'available':'flagged'} in ${monthName(month)}.`:'No pools loaded.'}</Empty></View>}
      {poolPagination&&<Row style={{alignItems:'center',justifyContent:'space-between',marginTop:6,marginBottom:12,gap:10}}>
        <Txt style={styles.aux}>{poolPagination.total!=null?`Loaded ${pools.length} of ${poolPagination.total} design pools`:`Loaded ${pools.length} design pools`}{poolPagination.more_available?' · more available':''}</Txt>
        {mayLoadMore&&<TouchableOpacity onPress={loadMore} style={[styles.chip,{borderColor:T.copper}]}><Txt style={{color:T.copper,fontWeight:'800',fontSize:11}}>Load more pools</Txt></TouchableOpacity>}
        {loadingMore&&<ActivityIndicator size="small" color={T.copper}/>}
      </Row>}
      {!!loadMoreError&&<TouchableOpacity onPress={loadMore} style={styles.issue}><Txt style={{color:T.red}}>{loadMoreError} · Tap to retry</Txt></TouchableOpacity>}
      {!!loading&&<View style={styles.loading}><ActivityIndicator color={T.copper}/><Txt style={styles.aux}>Loading monthly pools…</Txt></View>}
      {!!error&&<TouchableOpacity onPress={()=>setRefresh(x=>x+1)} style={styles.issue}><Txt style={{color:T.red}}>{error} · Tap to retry</Txt></TouchableOpacity>}

    </>}
  </ScrollView>;
}

const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:T.bg},pageContent:{width:'100%',maxWidth:1220,alignSelf:'center',paddingHorizontal:12,paddingTop:10,paddingBottom:36},
  text:{color:T.ink,fontSize:11,fontFamily:'DMSans'},mono:{fontFamily:'DMMono',fontVariant:['tabular-nums']},aux:{fontSize:9.5,color:T.muted,lineHeight:15},row:{flexDirection:'row'},
  chip:{paddingHorizontal:12,paddingVertical:7,borderRadius:20,borderWidth:1.5,borderColor:T.border,backgroundColor:T.surface,alignItems:'center',justifyContent:'center'},activeMonth:{backgroundColor:'rgba(200,117,51,0.12)',borderColor:T.copper},activeFilter:{backgroundColor:T.nav,borderColor:T.nav},
  metrics:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12,justifyContent:'space-between'},kpi:{backgroundColor:T.sub,borderWidth:1,borderColor:T.border,borderRadius:9,paddingVertical:9,paddingHorizontal:11,minHeight:58},kpiHi:{backgroundColor:'#FCF5ED',borderColor:'#E2C6AB'},kpiTitle:{fontSize:8.5,color:T.muted,textTransform:'uppercase',letterSpacing:0.4,fontWeight:'800'},kpiValue:{fontSize:14,fontWeight:'800',marginTop:3},
  pool:{borderWidth:1,borderColor:T.border,borderRadius:9,backgroundColor:T.surface,paddingHorizontal:14,paddingVertical:12,marginBottom:8},designTag:{backgroundColor:'#F0EDE8',paddingHorizontal:8,paddingVertical:6,borderRadius:6,borderWidth:1,borderColor:T.border},
  pill:{borderRadius:12,paddingHorizontal:7,paddingVertical:3,borderWidth:1,alignSelf:'flex-start'},mini:{backgroundColor:T.sub,borderWidth:1,borderColor:T.border,borderRadius:8,paddingVertical:6,paddingHorizontal:9,minWidth:88},miniTitle:{fontSize:8,fontWeight:'800',color:T.muted,textTransform:'uppercase',letterSpacing:0.3},miniValue:{fontSize:12,fontWeight:'700',marginTop:2},
  track:{height:6,backgroundColor:T.alt,borderRadius:6,overflow:'hidden'},trackFill:{height:6,borderRadius:6},trackTooltip:{position:'absolute',left:0,bottom:12,backgroundColor:T.nav,paddingHorizontal:9,paddingVertical:7,borderRadius:6,maxWidth:280,zIndex:20},section:{borderWidth:1,borderColor:T.border,backgroundColor:T.surface,borderRadius:9,paddingHorizontal:14,paddingVertical:12,marginBottom:12},sectionTitle:{flex:1,fontSize:11,fontWeight:'800',textTransform:'uppercase',letterSpacing:0.5,color:T.muted},
  entry:{paddingVertical:9,paddingHorizontal:4,borderTopWidth:1,borderColor:T.alt},orderNumber:{width:23,height:23,borderRadius:12,backgroundColor:T.nav,alignItems:'center',justifyContent:'center'},reconcile:{borderColor:T.border,borderTopWidth:1,borderBottomWidth:1,paddingVertical:11,marginBottom:10},rollChip:{backgroundColor:T.sub,borderColor:T.border,borderWidth:1,borderRadius:6,paddingHorizontal:6,paddingVertical:4},loading:{padding:20,alignItems:'center',gap:7},issue:{backgroundColor:'#FFF9EF',borderColor:'#EFDAB1',borderWidth:1,borderRadius:9,padding:12,marginVertical:9},
});
