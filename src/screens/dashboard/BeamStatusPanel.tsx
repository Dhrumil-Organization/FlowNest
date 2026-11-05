/**
 * Beam Status — Claude Artifact presentation parity.
 * Data is supplied solely by Laravel BeamStatusReportService; never fabricate
 * required rolls, checking completion or missing sticker sequences.
 * This file deliberately preserves Claude's four status colors, status strip,
 * dense pending rows and four-column (beam / rolls / pending / metres) grid.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { api } from '@/src/screens/dashboard/employ/api/api';

export type StatusKey = 'RUNNING' | 'CHECK_PENDING' | 'LP_PENDING' | 'COMPLETED';
export type BeamRowStatus = StatusKey | 'UNVERIFIED';
export type BeamStatusRow = {
  prpcode: string; beam_uid: string; beam_no: string;
  warp_metres: number; beam_balance_metres: number;
  beam_date: number; machine_code: string; machine_label: string;
  shed_label: string; shed_key: string; design_name: string | null;
  design_code: string | null; category_name: string | null;
  status: BeamRowStatus; process_count: number;
  checked_rolls: number; checking_entries: number; checked_metres: number;
  required_rolls: number | null; generated_rolls: number | null;
  required_rolls_verified?: boolean; required_rolls_basis?: string;
  pending_rolls: number | null; progress_pct: number | null;
  last_piece_seen: boolean; last_checking_date?: number | null;
  designated_roll?: number | null; designated_entered?: boolean;
  status_basis: string; warnings: string[];
  superseded_last_rolls?: number[]; missing_generated_rolls?: number[];
};
type BeamReport = {
  as_on_ymd: number; source_scope: string;
  summary: Record<StatusKey,{beams:number;checked_metres:number}>;
  pending_count: number; pending_beams: BeamStatusRow[];
  verification_beams?: BeamStatusRow[]; verification_count?: number;
  excluded?: Record<string,number>;
};
const INK = '#102132';
const MUT = '#7C7D84';
const EDGE = '#E7E0DA';
const PURPLE = '#742786';
const BG = '#FFFFFF';
const TRACK = '#EFEAE4';
const ORDER: StatusKey[] = ['RUNNING','CHECK_PENDING','LP_PENDING','COMPLETED'];
const COLOR: Record<BeamRowStatus,string> = {
  RUNNING:'#1C567A', CHECK_PENDING:'#C98A1A', LP_PENDING:'#8E44AD', COMPLETED:'#2A6044', UNVERIFIED:'#9aa2ab',
};
const LABEL: Record<BeamRowStatus,string> = {
  RUNNING:'Running', CHECK_PENDING:'Finished — checking pending',
  LP_PENDING:'Last piece entered — rolls pending', COMPLETED:'Completed / closed',
  UNVERIFIED:'Last Taka Set — checking to verify',
};
const fmt = (v:number|null|undefined, digits=0) =>
  v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('en-IN',{maximumFractionDigits:digits});
const card = { backgroundColor:BG, borderColor:EDGE, borderWidth:1, borderRadius:12 } as const;
const currentDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const toYmd = (v:number) => {
  const s=String(v||''); return /^\d{8}$/.test(s) ? `${s.slice(6)}-${s.slice(4,6)}-${s.slice(0,4)}` : '—';
};

/** Beam row opens Grey Checking details; no hover or long-press tooltip. */
function BeamRow({item, compact, onOpen}:{item:BeamStatusRow;compact:boolean;onOpen:()=>void}) {
  const color=COLOR[item.status] || COLOR.UNVERIFIED;
  const required=Number(item.required_rolls);
  const haveRequired=!!item.required_rolls_verified && Number.isInteger(required) && required>0;
  const checked=Number(item.checked_rolls || 0);
  const pending=haveRequired ? Math.max(0,required-checked) : null;
  const ratio=haveRequired ? Math.max(0,Math.min(100,checked/required*100)) : null;
  // If ERP has no required-roll denominator, retain a visible status-colored
  // bar using VERIFIED METRES ONLY. This is visually styled like Claude but
  // is explicitly identified as metre coverage, not Taka completion.
  const warp=Number(item.warp_metres||0);
  const checkedM=Number(item.checked_metres||0);
  const metrePct=Number.isFinite(warp)&&warp>0&&Number.isFinite(checkedM)&&checkedM>=0
    ? Math.max(0,Math.min(100,checkedM/warp*100)) : null;
  const fill=ratio!==null?ratio:metrePct;
  const rowLabel=haveRequired?`${fmt(checked)}/${fmt(required)}`:fmt(checked);
  const subtitle=`warp ${fmt(item.warp_metres,1)} m${item.designated_roll != null ? ` · last-piece sticker #${item.designated_roll}${item.designated_entered?' entered':''}` : ''}`;
  return <Pressable onPress={onOpen} accessibilityRole="button"
    accessibilityLabel={`Open ${item.beam_no} checking details`}
    style={{paddingVertical:compact?9:8,paddingHorizontal:compact?9:12,
      borderBottomWidth:1,borderBottomColor:'#EFEAE5',backgroundColor:'#FFF',overflow:'visible'}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:compact?5:9}}>
      <View style={{flex:1,minWidth:0}}>
        <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:5,minWidth:0}}>
          <Text style={{fontSize:12,fontWeight:'700',color:INK}}>{item.beam_no || '—'}</Text>
          <Text numberOfLines={1} style={{fontSize:12,fontWeight:'700',color:INK,maxWidth:compact?135:235}}>{item.design_name||item.design_code||'—'}</Text>
          <View style={{paddingVertical:1,paddingHorizontal:6,borderRadius:6,borderWidth:1,borderColor:'#DDCFE4'}}>
            <Text style={{fontSize:9,fontWeight:'700',color:INK}}>{item.category_name||'—'}</Text>
          </View>
          <View style={{paddingVertical:1,paddingHorizontal:6,borderRadius:6,borderWidth:1,borderColor:'#D8C8E4',backgroundColor:'#F7F0FB'}}>
            <Text style={{fontSize:9,fontWeight:'700',color:'#664183'}}>{item.machine_label||item.machine_code||'—'} · {item.shed_label||'—'}</Text>
          </View>
          <View style={{backgroundColor:color,borderRadius:5,paddingHorizontal:6,paddingVertical:2}}>
            <Text style={{fontSize:8.5,fontWeight:'800',color:'#FFF'}}>{LABEL[item.status].toUpperCase()}</Text>
          </View>
        </View>
        <View
          accessibilityLabel={haveRequired?`${checked} of ${required} required Taka checked`: `${checked} checked Taka; required Taka unknown. Bar shows ${fmt(metrePct,1)} percent warp-metre coverage`}
          style={{marginTop:5,marginBottom:3,justifyContent:'center',height:7,backgroundColor:TRACK,borderRadius:4,overflow:'hidden'}}>
          {fill!==null && fill>0 &&
            <View style={{width:`${fill}%`,height:7,backgroundColor:color,borderRadius:4}}/>}
        </View>
        <Text numberOfLines={1} style={{fontSize:9.5,color:MUT}}>{subtitle}</Text>
      </View>
      {compact ?
        <View style={{width:78,alignItems:'flex-end',gap:2}}>
          <Text numberOfLines={1} style={{fontSize:11,fontWeight:'800',color:INK}}>{rowLabel}</Text>
          <Text style={{fontSize:8.5,color:MUT}}>{haveRequired?'ROLLS':'CHECKED'}</Text>
          <Text style={{fontSize:11,fontWeight:'800',color:pending===null?MUT:pending?'#C98A1A':'#2A6044',marginTop:3}}>{fmt(pending)}</Text>
          <Text style={{fontSize:8.5,color:MUT}}>PENDING</Text>
          <Text style={{fontSize:11,fontWeight:'800',color:INK,marginTop:3}}>{fmt(item.checked_metres,2)}</Text>
          <Text style={{fontSize:8.5,color:MUT}}>METRES</Text>
        </View> :
        <View style={{flexDirection:'row',alignItems:'center',gap:0}}>
          <Text numberOfLines={1} accessibilityLabel={haveRequired?'Checked / required rolls':'Checked rolls; required count not verified'} style={{width:54,textAlign:'right',fontSize:11,fontWeight:'600',color:INK}}>{rowLabel}</Text>
          <Text numberOfLines={1} style={{width:62,textAlign:'right',fontSize:12,fontWeight:'800',color:pending===null?MUT:pending?'#C98A1A':'#2A6044'}}>{fmt(pending)}</Text>
          <Text numberOfLines={1} style={{width:62,textAlign:'right',fontSize:11,fontWeight:'600',color:INK}}>{fmt(item.checked_metres,2)}</Text>
        </View>}
    </View>
  </Pressable>;
}

/** The controls and status illustration reflect the actual Claude statusTab markup. */
export default function BeamStatusPanel({prptype,onOpenBeam}:{prptype?:string;onOpenBeam:(beam:BeamStatusRow)=>void}) {
  const {width}=useWindowDimensions();
  const compact=width<680;
  const [report,setReport]=useState<BeamReport|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [revision,setRevision]=useState(0);
  const [focus,setFocus]=useState<StatusKey|null>(null);
  const [pinned,setPinned]=useState(false);
  const date=useMemo(currentDay,[]);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    if(!prptype){setReport(null);setError('Selected property type is required.');return;}
    let active=true;
    setLoading(true);setError('');
    api.getOwnerCardReport({report_type:'beam_status',date,prptype})
      .then((response:any)=>{
        if(!active)return;
        if(!response?.success||!response?.data?.report?.summary||!Array.isArray(response?.data?.report?.pending_beams)) {
          throw new Error(response?.message||'Beam Status report is unavailable.');
        }
        setReport(response.data.report as BeamReport);
      })
      .catch((e:any)=>{if(active)setError(String(e?.message||e));})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[prptype,date,revision]);
  const refresh=()=>{if(!loading)setRevision(v=>v+1);};
  const summary=report?.summary;
  const total=ORDER.reduce((s,k)=>s+Number(summary?.[k]?.beams||0),0);
  const focused=focus?summary?.[focus]:null;
  const verification=report?.verification_beams||[];
  // One Claude-style list, rather than an invented second verification table.
  // Unknown classifications remain visibly marked without falsely entering
  // the four summary buckets or disappearing from the ERP report.
  const rows=useMemo(()=>[...(report?.pending_beams||[]),...verification], [report]);
  const select=(key:StatusKey)=>{if(focus===key&&pinned){setFocus(null);setPinned(false);}else{setFocus(key);setPinned(true);}};
  return <View style={{width:'100%',gap:12,minWidth:0}}>
    <View style={{...card,padding:compact?11:12,flexDirection:'row',alignItems:'center',gap:10}}>
      <View style={{width:44,height:44,backgroundColor:'#F1E8F4',borderRadius:11,justifyContent:'center',alignItems:'center'}}>
        <Text style={{fontSize:22,color:INK}}>◧</Text>
      </View>
      <View style={{flex:1,minWidth:0}}>
        <Text style={{color:INK,fontSize:16,fontWeight:'700'}}>Beam status</Text>
        <Text style={{color:MUT,fontSize:10.5,marginTop:2}}>Completion decided from required rolls vs checking entries — never from a LAST PIECE sticker alone</Text>
      </View>
      <Pressable onPress={refresh} disabled={loading} accessibilityRole="button"
        style={{borderWidth:1,borderColor:EDGE,borderRadius:7,paddingHorizontal:10,paddingVertical:7,opacity:loading?.6:1}}>
        <Text style={{color:PURPLE,fontSize:10,fontWeight:'800'}}>↻ {loading?'Refreshing…':'Refresh'}</Text>
      </Pressable>
      <View style={{paddingVertical:6,paddingHorizontal:10,backgroundColor:'#F3EAF5',borderRadius:9,alignItems:'center'}}>
        <Text style={{fontSize:15,fontWeight:'800',color:PURPLE}}>{report?fmt(rows.length):'—'}</Text>
        <Text style={{fontSize:8,color:MUT}}>pending</Text>
      </View>
    </View>
    {!!error&&<View style={{...card,padding:12,gap:8}}>
      <Text style={{color:'#B54708',fontSize:11}}>{error}</Text>
      <Pressable onPress={refresh} accessibilityRole="button"><Text style={{color:PURPLE}}>Retry</Text></Pressable>
    </View>}
    {loading&&<ActivityIndicator size="small" color={PURPLE}/>}
    {!!report&&<>
      <View style={{...card,padding:12}}>
        <View style={{height:14,backgroundColor:TRACK,borderRadius:7,overflow:'hidden',flexDirection:'row'}}>
          {ORDER.map(k=>{const n=Number(summary?.[k]?.beams||0);if(n<=0)return null;
            return <Pressable key={k} onHoverIn={()=>{if(!pinned)setFocus(k);}}
              onHoverOut={()=>{if(!pinned)setFocus(null);}} onPress={()=>select(k)}
              accessibilityRole="button" accessibilityLabel={`${LABEL[k]}: ${fmt(n)} beams`}
              style={{height:14,width:`${n/Math.max(1,total)*100}%`,backgroundColor:COLOR[k],opacity:focus&&focus!==k?.6:1}}/>;
          })}
        </View>
        {!!focus&&!!focused&&<View style={{marginTop:8,padding:7,borderRadius:7,backgroundColor:'#FAF8F6',flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <View style={{width:9,height:9,backgroundColor:COLOR[focus],borderRadius:2}}/>
          <Text style={{fontSize:10,fontWeight:'800',color:INK}}>{LABEL[focus]}</Text>
          <Text style={{fontSize:10,color:MUT}}>{fmt(focused.beams)} beams · {fmt(focused.checked_metres,2)} m checked</Text>
        </View>}
        <View style={{flexDirection:'row',gap:8,marginTop:10,flexWrap:'wrap'}}>
          {ORDER.map(k=><Pressable key={k} onPress={()=>select(k)} accessibilityRole="button"
            style={{flexGrow:1,flexBasis:compact?'42%':130,minWidth:compact?135:150,borderLeftWidth:3,borderLeftColor:COLOR[k],paddingLeft:8}}>
            <Text style={{color:MUT,fontWeight:'700',letterSpacing:.3,fontSize:8.5}}>{LABEL[k].toUpperCase()}</Text>
            <Text style={{color:COLOR[k],fontWeight:'700',fontSize:15,marginTop:2}}>{fmt(summary?.[k]?.beams||0)} <Text style={{fontSize:9.5,fontWeight:'600',color:MUT}}>beams</Text></Text>
            <Text style={{color:MUT,fontSize:9.5,marginTop:2}}>{fmt(summary?.[k]?.checked_metres||0,2)} m checked</Text>
          </Pressable>)}
        </View>
      </View>
      <View style={{...card,paddingTop:10,paddingHorizontal:compact?9:12,paddingBottom:8,overflow:'visible'}}>
        <Text style={{fontSize:12,fontWeight:'700',color:INK,marginBottom:4}}>Pending beams</Text>
        {!compact&&<View style={{paddingVertical:8,borderTopWidth:1,borderBottomWidth:1,borderColor:'#EEE8E2',flexDirection:'row',alignItems:'center'}}>
          <Text style={{fontSize:9,color:MUT,textTransform:'uppercase'}}>BEAM · DESIGN · CATEGORY</Text>
          <View style={{flex:1}}/>
          <Text style={{width:54,textAlign:'right',fontSize:9,color:MUT}}>ROLLS</Text>
          <Text style={{width:62,textAlign:'right',fontSize:9,color:MUT}}>PENDING</Text>
          <Text style={{width:62,textAlign:'right',fontSize:9,color:MUT}}>METRES</Text>
        </View>}
        {rows.length===0?<Text style={{color:MUT,fontSize:12,textAlign:'center',padding:14}}>No pending beams.</Text>
          :rows.map(r=><BeamRow key={`${r.prpcode}|${r.beam_uid}`} item={r} compact={compact} onOpen={()=>onOpenBeam(r)}/>)}
      </View>
    </>}
  </View>;
}
