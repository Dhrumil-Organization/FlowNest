import { ConversionText as Text, ensureConversionWebFonts } from '../../production/ConversionTypography';
ensureConversionWebFonts();
/** Read-only Beam Shortage checking entries. Compact Claude Artifact-style roll comparison. */
import React,{useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,ScrollView,View,useWindowDimensions} from 'react-native';
import client from '@/common/API/client_fix_design';
import type {OwnerBeam} from './ownerModel';
const fmt=(v:number)=>Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const ink='#263142',mut='#788292',border='#EAE5DF',red='#C64D36';
type Taka={chkuid?:string|number;chksrno?:number;takano?:string;chkdate?:string;qty?:number;wt?:number;grdname?:string;chkname?:string;islasttaka?:number;issample?:number;ismending?:number;remarks?:string};
export default function ProductionCheckingRolls({beam,prptype,yearno}:{beam:OwnerBeam;prptype:string;yearno:number|string}){
 const {width}=useWindowDimensions();const compact=width<640;
 const [rows,setRows]=useState<Taka[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let alive=true;setLoading(true);setError('');setRows([]);
  const payload:any={prptype,prpcode:beam.prpcode,yearno:Number(yearno),beamuid:Number(beam.beamuid)};
  if(beam.dsncode)payload.dsncode=beam.dsncode;
  client.post('/reports/beam_shortage/takas',payload).then((res:any)=>{if(!alive)return;const body=res?.data;
   if(body?.success!==true||!Array.isArray(body?.data?.takas))throw Error(body?.message||'Checking details are unavailable');
   setRows(body.data.takas);
  }).catch((e:any)=>{if(alive)setError(e?.response?.data?.message||e?.message||'Unable to load checking details');}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false};
 },[beam.prpcode,beam.beamuid,beam.dsncode,prptype,yearno]);
 const ordered=useMemo(()=>[...rows].sort((a,b)=>{
  const roll=(r:Taka)=>{const m=String(r.takano||'').match(/(\d+)$/);return m?Number(m[1]):Number(r.chksrno||0)};
  return roll(a)-roll(b)||String(a.chkdate||'').localeCompare(String(b.chkdate||''));
 }),[rows]);
 const checked=useMemo(()=>rows.reduce((v,r)=>v+Number(r.qty||0),0),[rows]);
 const avg=rows.length?checked/rows.length:0;
 const shortage=beam.warped-beam.actual;
 const cell=(value:string,w:number,align:'left'|'right'='left',strong=false,color=ink)=><Text numberOfLines={1} style={{width:w,textAlign:align,fontSize:11,color,fontWeight:strong?'700':'400'}}>{value}</Text>;
 return <View style={{gap:9}}>
  <Text style={{fontSize:12,color:ink,flexWrap:'wrap'}}><Text style={{fontWeight:'800'}}>{beam.beamNo}</Text> · warp {fmt(beam.warped)} m · actual {fmt(beam.actual)} m · shortage <Text style={{fontWeight:'800',color:red}}>{fmt(shortage)} m ({beam.warped?(shortage/beam.warped*100).toFixed(2):'0'}%)</Text> · {rows.length} rolls · avg {fmt(avg)} m/roll</Text>
  {loading?<ActivityIndicator color="#6750A4"/>:error?<Text style={{color:red,paddingVertical:12}}>{error}</Text>:<>
   {Math.abs(checked-beam.actual)>0.1?<Text style={{color:red,fontSize:11}}>Checking entries differ from reported actual by {fmt(Math.abs(checked-beam.actual))} m.</Text>:null}
   <View style={{borderTopWidth:1,borderTopColor:border}}>
    <View style={{flexDirection:'row',paddingVertical:8,borderBottomWidth:1,borderBottomColor:border,alignItems:'center'}}>
     <Text style={{flex:1,fontSize:10,fontWeight:'800',color:mut}}>ROLL · CHECKING DATE</Text>
     {cell('#',compact?30:48,'right',true,mut)}{cell('METRES',compact?65:90,'right',true,mut)}{cell('VS AVG',compact?64:90,'right',true,mut)}
    </View>
    <ScrollView nestedScrollEnabled style={{maxHeight:360}} showsVerticalScrollIndicator>
    {ordered.map((r,i)=>{const q=Number(r.qty||0),delta=q-avg;return <View key={`${r.chkuid??i}-${r.chksrno??i}-${i}`} style={{flexDirection:'row',alignItems:'center',paddingVertical:7,borderBottomWidth:1,borderBottomColor:border,minHeight:37}}>
      <View style={{flex:1,minWidth:0,paddingRight:8,flexDirection:compact?'column':'row',alignItems:compact?'flex-start':'center',gap:compact?1:8}}><Text numberOfLines={1} style={{fontSize:11,fontWeight:'800',color:ink,flexShrink:1}}>{r.takano||'—'}</Text><Text style={{fontSize:10,color:mut}}>{r.chkdate||'—'}</Text></View>
      {cell(String(i+1),compact?30:48,'right')}{cell(fmt(q),compact?65:90,'right',true)}{cell(avg?`${delta>=0?'+':''}${fmt(delta)}`:'—',compact?64:90,'right',false,q<avg*0.9?red:mut)}
     </View>})}
    </ScrollView>
    {rows.length===0?<Text style={{padding:12,color:mut}}>No checking entries returned for this beam and design.</Text>:null}
   </View>
   {rows.length>0?<Text style={{fontSize:10,color:mut}}>All {rows.length} rolls · Total {fmt(checked)} m · Scroll within the list to view every entry</Text>:null}
  </>}
 </View>;
}
