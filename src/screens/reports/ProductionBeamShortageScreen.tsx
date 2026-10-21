import { ConversionText as Text, ensureConversionWebFonts } from '../production/ConversionTypography';
ensureConversionWebFonts();
/** Claude Artifact UI — independent new Production Beam Shortage. No legacy Beam Shortage imports. */
import React,{useCallback,useMemo,useState,useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {useBusinessContext} from '@/src/core/business';
import {api} from '../dashboard/employ/api/api';
import client from '@/common/API/client_fix_design';
import ProductionCheckingRolls from './productionBeamShortage/ProductionCheckingRolls';
import {parseOwnerReport,OwnerBeam,OwnerDesign,fyStartOf,fyStartFromYearName,yearNoFor} from './productionBeamShortage/ownerModel';
import {ScrollView,TouchableOpacity,View,useWindowDimensions} from 'react-native';

export type ProductionShortageTaka={id:string;date?:string;metres:number;grade?:string;checker?:string};
export type ProductionShortageBeam=OwnerBeam;
export type ProductionShortageDesign=OwnerDesign;
export type ProductionShortageProps={designs?:ProductionShortageDesign[];loading?:boolean;error?:string;onRefresh?:()=>void};
const C={ink:'#1F2937',mut:'#788292',border:'#E9E5DF',paper:'#FFFFFF',bg:'#FBFAF8',purple:'#6750A4',blue:'#2B65B1',orange:'#CC8A18',green:'#267454',red:'#C64D36'};
const n=(x:number)=>Math.round(x||0).toLocaleString('en-IN');
const pct=(a:number,b:number)=>b>0?Math.round(a/b*1000)/10:0;
const band=(p:number)=>p>3?C.red:p>1.5?C.orange:C.green;
const card={backgroundColor:C.paper,borderRadius:11,borderWidth:1,borderColor:C.border,padding:12} as const;
const sum=(rows:ProductionShortageBeam[])=>({beams:new Set(rows.map(b=>`${b.prpcode}|${b.beamuid}`)).size,w:rows.reduce((a,b)=>a+b.warped,0),o:rows.reduce((a,b)=>a+b.actual,0),s:rows.reduce((a,b)=>a+b.warped-b.actual,0)});
type Step={kind:'category'|'design'|'beam';key:string;label:string};
const Action=({label,active,onPress}:{label:string;active?:boolean;onPress:()=>void})=><TouchableOpacity onPress={onPress} style={{borderRadius:7,borderWidth:1,borderColor:active?C.purple:C.border,backgroundColor:active?C.purple:C.paper,paddingHorizontal:11,paddingVertical:7}}><Text style={{fontSize:11,fontWeight:'700',color:active?'white':C.ink}}>{label}</Text></TouchableOpacity>;
export default function ProductionBeamShortageScreen(){
 const {prpGroup,prpCode,yearNo,yearName,isReady}=useBusinessContext();
 const [designs,setDesigns]=useState<ProductionShortageDesign[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [categoryWarning,setCategoryWarning]=useState('');
 const reqId=useRef(0);
 const now=new Date();const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 const sessionFY=fyStartFromYearName(yearName)||fyStartOf(today);

 const {width}=useWindowDimensions();const mobile=width<680;
 const [tableWidth,setTableWidth]=useState(0);
 const tableInnerWidth=Math.max(mobile?560:0,tableWidth>0?tableWidth-24:0);
 const numericWidths=mobile?[38,68,68,64,48]:[42,76,76,72,52];
 const [period,setPeriod]=useState<'month'|'fy'|'all'>('month');const [descending,setDescending]=useState(true);const [path,setPath]=useState<Step[]>([]);const [selectedBar,setSelectedBar]=useState<string|null>(null);
 const from=period==='month'?today.slice(0,7)+'-01':period==='fy'?sessionFY:sessionFY;
 const load=useCallback(async()=>{
  if(!isReady)return;
  const id=++reqId.current;setLoading(true);setError('');
  try{
   const response:any=await api.getOwnerCardReport({report_type:'beam_shortage',prptype:prpGroup,yearno:yearNoFor(period==='all'?sessionFY:from,yearNo,sessionFY),date:today,from_date:from,to_date:today});
   const parsed=parseOwnerReport(response);
   // Owner Dashboard quantities remain unchanged. Resolve category identity
   // using the existing DesignController route and authoritative ERP masters.
   const master=new Map<string,string>();
   const codes=[...new Set(parsed.map(d=>d.dsncode).filter(Boolean))];
   const properties=[...new Set(parsed.map(d=>d.prpcode).filter(Boolean))];
   for(let i=0;i<codes.length;i+=120){
     const result:any=await client.get('/designs',{params:{
       beam_shortage_category_map:1,yearno:yearNo,prpcode:prpCode,
       design_codes:codes.slice(i,i+120).join(','),
       source_properties:properties.join(',')
     }});
     const body=result?.data;
     if(body?.success!==true||!Array.isArray(body?.data))throw Error('Unable to resolve ERP fabric categories');
     for(const item of body.data){
       const property=String(item.prpcode??'').trim().toUpperCase();
       const code=String(item.dsncode??'').trim();
       const category=String(item.category??'').trim();
       if(property&&code&&category)master.set(`${property}|${code}`,category);
     }
   }
   // A blank-code allocation can share an ERP design name with a coded allocation.
   // Use that category only when the same-property name has exactly one category.
   // Never manufacture a design code or merge the underlying beam allocations.
   const categoriesByName=new Map<string,Set<string>>();
   for(const d of parsed){
     const category=d.category||master.get(`${d.prpcode.trim().toUpperCase()}|${d.dsncode.trim()}`)||'';
     if(!d.dsncode.trim()||!category)continue;
     const key=`${d.prpcode.trim().toUpperCase()}|${d.name.trim().toUpperCase()}`;
     if(!categoriesByName.has(key))categoriesByName.set(key,new Set());
     categoriesByName.get(key)!.add(category);
   }
   const resolved=parsed.map(d=>{
     const direct=d.category||master.get(`${d.prpcode.trim().toUpperCase()}|${d.dsncode.trim()}`)||'';
     const sameName=categoriesByName.get(`${d.prpcode.trim().toUpperCase()}|${d.name.trim().toUpperCase()}`);
     return {...d,category:direct||(!d.dsncode.trim()&&sameName?.size===1?[...sameName][0]:'')};
   });
   const unresolved=resolved.filter(d=>!d.category).length;
   if(id===reqId.current){
     setDesigns(resolved);
     setCategoryWarning(unresolved?`${unresolved} designs could not be matched to an ERP fabric category.`:'');
   }

  }catch(e:any){if(id===reqId.current){setDesigns([]);setError(e?.response?.data?.message||e?.message||'Unable to load report');}}
  finally{if(id===reqId.current)setLoading(false);}
 },[isReady,prpGroup,prpCode,yearNo,sessionFY,from,today,period]);
 useFocusEffect(useCallback(()=>{void load();return()=>{reqId.current++;};},[load]));

 const hasCategories=true;
 const rows=useMemo(()=>designs.flatMap(d=>d.beams.map(b=>({...b,designId:d.id,designName:d.name,category:d.category}))),[designs]);
 const filtered=useMemo(()=>rows.filter(b=>path.every(p=>p.kind==='category'?(b.category||'Category not mapped')===p.key:p.kind==='design'?b.designId===p.key:`${b.prpcode}|${b.beamuid}`===p.key)),[rows,path]);
 const level=hasCategories?(path.length===0?'category':path.length===1?'design':path.length===2?'beam':'taka'):(path.length===0?'design':path.length===1?'beam':'taka');
 const totals=sum(rows);const viewTotals=sum(filtered);
 const groups=useMemo(()=>{if(level==='taka')return [];const map=new Map<string,typeof filtered>();for(const b of filtered){const key=level==='category'?(b.category||'Category not mapped'):level==='design'?b.designId:`${b.prpcode}|${b.beamuid}`;map.set(key,[...(map.get(key)||[]),b]);}return [...map].map(([key,items])=>({key,title:level==='category'?key:level==='design'?items[0].designName:`${items[0].beamNo}`,items,...sum(items)})).sort((a,b)=>{
   // Compare the unrounded shortage ratios; displayed percentages are rounded only for presentation.
   const ratioA=a.w>0?a.s/a.w:0;
   const ratioB=b.w>0?b.s/b.w:0;
   const primary=descending?ratioB-ratioA:ratioA-ratioB;
   if(primary!==0)return primary;
   const secondary=descending?b.s-a.s:a.s-b.s;
   return secondary||a.title.localeCompare(b.title);
  });},[filtered,level,descending]);
 const stat=(label:string,value:string,color:string)=><View style={{...card,flex:1,minWidth:mobile?140:160,paddingVertical:10}}><Text style={{fontSize:10,color:C.mut,fontWeight:'700'}}>{label}</Text><Text style={{fontSize:19,fontWeight:'800',color,marginTop:5}}>{value}</Text></View>;
 const chart=groups;const max=Math.max(1,...chart.map(g=>pct(g.s,g.w)));const chartScale=Math.max(2,Math.ceil(max*2)/2);const beam=level==='taka'?filtered[0]:null;
 const selectedLine=beam;
 return <View style={{gap:11,paddingBottom:20}}>
  <View style={{...card,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:13}}><View style={{flexDirection:'row',alignItems:'center',gap:9,flex:1}}><Text style={{fontSize:20}}>⚠️</Text><View><Text style={{fontSize:18,fontWeight:'800',color:C.ink}}>Beam shortage</Text><Text style={{fontSize:10,color:C.mut,marginTop:3}}>Only genuinely completed beams — warping metres minus actual checked metres</Text></View></View><View style={{paddingHorizontal:12,paddingVertical:7,borderRadius:9,backgroundColor:'#FBEDE9',alignItems:'center'}}><Text style={{fontSize:15,fontWeight:'800',color:band(pct(totals.s,totals.w))}}>{pct(totals.s,totals.w)}%</Text><Text style={{fontSize:9,color:C.mut}}>overall</Text></View></View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,alignItems:'center'}}><Action label="This month" active={period==='month'} onPress={()=>{setPeriod('month');setPath([]);setSelectedBar(null)}}/><Action label="This FY" active={period==='fy'} onPress={()=>{setPeriod('fy');setPath([]);setSelectedBar(null)}}/><Action label="All time" active={period==='all'} onPress={()=>{setPeriod('all');setPath([]);setSelectedBar(null)}}/><View style={{flex:1}}/><Action label="Highest first" active={descending} onPress={()=>{setDescending(true);setSelectedBar(null)}}/><Action label="Lowest first" active={!descending} onPress={()=>{setDescending(false);setSelectedBar(null)}}/></View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{stat('COMPLETED BEAMS',n(totals.beams),C.purple)}{stat('WARPED',`${n(totals.w)} m`,C.blue)}{stat('ACTUAL',`${n(totals.o)} m`,C.purple)}{stat('SHORTAGE',`${n(totals.s)} m`,band(pct(totals.s,totals.w)))}</View>
  <View style={{flexDirection:'row',alignItems:'center',gap:7,flexWrap:'wrap'}}><TouchableOpacity onPress={()=>setPath([])}><Text style={{fontWeight:'800',fontSize:12,color:path.length?C.purple:C.ink}}>All categories</Text></TouchableOpacity>{path.map((p,i)=><React.Fragment key={`${p.kind}-${p.key}`}><Text style={{color:C.mut}}>›</Text><TouchableOpacity onPress={()=>setPath(v=>v.slice(0,i+1))}><Text style={{fontWeight:'700',fontSize:12,color:i===path.length-1?C.ink:C.purple}}>{p.label}</Text></TouchableOpacity></React.Fragment>)}{path.length>0?<TouchableOpacity onPress={()=>setPath(v=>v.slice(0,-1))} style={{marginLeft:'auto'}}><Text style={{fontWeight:'800',color:C.purple}}>‹ back</Text></TouchableOpacity>:null}</View>
  {loading?<Text style={{color:C.mut}}>Loading…</Text>:error?<Text style={{color:C.red}}>{error}</Text>:null}{!loading&&!!categoryWarning?<Text style={{color:C.mut,fontSize:11}}>{categoryWarning}</Text>:null}
  {!loading&&!error&&level!=='taka'&&chart.length>0?<View style={{...card,padding:11}}><Text style={{fontSize:12,fontWeight:'800',color:C.ink,marginBottom:8}}>Shortage % by {level==='category'?'category':level}</Text><ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{minWidth:'100%'}}><View style={{flexDirection:'row',height:148,minWidth:Math.max(0,chart.length*(mobile?92:116)+30)}}><View style={{width:30,justifyContent:'space-between',alignItems:'flex-end',paddingBottom:16,paddingRight:5}}>{[4,3,2,1,0].map(t=><Text key={t} style={{fontSize:9,color:C.mut}}>{(chartScale*t/4).toFixed(t===0?0:1)}%</Text>)}</View><View style={{flex:1,flexDirection:'row',alignItems:'flex-end',gap:mobile?6:15,borderBottomWidth:1,borderBottomColor:C.border,paddingBottom:17}}>{chart.map(g=>{const p=pct(g.s,g.w);const scale=chartScale;const selected=selectedBar===g.key;return <TouchableOpacity key={g.key} {...({onMouseEnter:()=>setSelectedBar(g.key),onMouseLeave:()=>setSelectedBar(current=>current===g.key?null:current)} as any)} onPress={()=>setSelectedBar(selected?null:g.key)} onLongPress={()=>setSelectedBar(g.key)} accessibilityLabel={`${g.title}: shortage ${p}% · ${n(g.s)} m`} style={{flex:1,alignItems:'center',justifyContent:'flex-end',height:'100%'}}><View style={{width:'82%',height:`${Math.max(1,p/scale*100)}%`,backgroundColor:C.orange,borderTopLeftRadius:3,borderTopRightRadius:3}}/><Text numberOfLines={1} ellipsizeMode="tail" style={{position:'absolute',bottom:-16,fontSize:9,color:C.mut,width:'100%',textAlign:'center'}}>{g.title}</Text>{selected?<View style={{position:'absolute',bottom:p/scale>0.65?'18%':'48%',backgroundColor:C.paper,borderWidth:1,borderColor:C.border,borderRadius:8,padding:8,minWidth:130,zIndex:5,elevation:5}}><Text numberOfLines={1} style={{fontSize:10,color:C.ink}}>{g.title}</Text><Text style={{fontSize:10,color:C.ink,marginTop:4}}>shortage : {p}% · {n(g.s)} m</Text></View>:null}</TouchableOpacity>})}</View></View></ScrollView></View>:null}
  <View style={card} onLayout={e=>setTableWidth(e.nativeEvent.layout.width)}>{level==='taka'&&selectedLine?<ProductionCheckingRolls beam={selectedLine} prptype={prpGroup} yearno={yearNo} />:level!=='taka'?<ScrollView horizontal={mobile} showsHorizontalScrollIndicator={mobile} contentContainerStyle={{flexGrow:1}}><View style={{width:tableInnerWidth||undefined,minWidth:mobile?560:0,flex:mobile?undefined:1,paddingRight:12}}><View style={{flexDirection:'row',paddingVertical:9,borderBottomWidth:1,borderBottomColor:C.border}}>{[['',24],[(level==='category'?'Category':level==='design'?'Design':'Beam'),0],['BEAMS',numericWidths[0]],['WARPED',numericWidths[1]],['ACTUAL',numericWidths[2]],['SHORT',numericWidths[3]],['%',numericWidths[4]]].map(([v,w],i)=><Text key={i} style={{width:w||undefined,flex:w?undefined:1,fontSize:10,fontWeight:'800',color:C.mut,textAlign:i>1?'right':'left'}}>{v}</Text>)}</View>{groups.map((g,i)=>{const p=pct(g.s,g.w);return <TouchableOpacity key={g.key} onPress={()=>{setSelectedBar(null);setPath(v=>[...v,{kind:level,key:g.key,label:g.title}])}} style={{flexDirection:'row',paddingVertical:10,alignItems:'center',borderBottomWidth:1,borderBottomColor:C.border}}><View style={{width:24}}><View style={{backgroundColor:'#F1ECF9',borderRadius:12,width:20,height:20,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:10,color:C.purple,fontWeight:'800'}}>{i+1}</Text></View></View><View style={{flex:1,paddingRight:7}}><Text style={{fontSize:12,fontWeight:'800',color:C.ink}}>{g.title} ›</Text><View style={{height:4,backgroundColor:'#F0EFED',borderRadius:3,marginTop:5}}><View style={{height:4,width:`${Math.min(100,p/chartScale*100)}%`,backgroundColor:C.orange,borderRadius:3}}/></View><Text style={{fontSize:9,color:C.mut,marginTop:3}}>{g.beams} beam{g.beams!==1?'s':''} · avg {n(g.s/Math.max(1,g.beams))} m short per beam</Text></View>{[[n(g.beams),numericWidths[0]],[n(g.w),numericWidths[1]],[n(g.o),numericWidths[2]],[n(g.s),numericWidths[3]],[String(p),numericWidths[4]]].map(([value,w],j)=><Text key={j} style={{width:Number(w),textAlign:'right',fontSize:11,fontWeight:j>=3?'800':'500',color:j>=3?band(p):C.ink}}>{value}</Text>)}</TouchableOpacity>})}{groups.length===0?<Text style={{textAlign:'center',padding:15,color:C.mut}}>No completed beams in this period.</Text>:<View style={{flexDirection:'row',paddingVertical:11,alignItems:'center',backgroundColor:C.bg}}><View style={{width:24}}/><Text style={{flex:1,fontSize:12,fontWeight:'800'}}>Total</Text>{[[n(viewTotals.beams),numericWidths[0]],[n(viewTotals.w),numericWidths[1]],[n(viewTotals.o),numericWidths[2]],[n(viewTotals.s),numericWidths[3]],[String(pct(viewTotals.s,viewTotals.w)),numericWidths[4]]].map(([v,w],i)=><Text key={i} style={{width:Number(w),textAlign:'right',fontSize:11,fontWeight:'800',color:i===3?band(pct(viewTotals.s,viewTotals.w)):C.ink}}>{v}</Text>)}</View>}</View></ScrollView>:null}</View>
 </View>;
}
