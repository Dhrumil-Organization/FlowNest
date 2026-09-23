import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppAlert from '@/common/utils/appAlert';
import { CostingAPI, DesignAPI } from '@/src/api/legacyClient';

const P = { weaving_rate: 0.3, rpm: 400, eff: 85, greige_brok: 0, dyeing_proc: 18, finished_brok: 0, cut_pack: 3 };
const YD = { L: 60, M: 70, D: 85 };
const n = (v:any) => Number.isFinite(Number(v)) ? Number(v) : 0;
const money = (v:any) => `₹${n(v).toFixed(2)}`;
const yKey = (y:any) => `${String(y?.mi_id ?? '')}|${y?.blend_ratio ?? ''}`;

function latest(rows:any) { return Array.isArray(rows?.[0]?.records) ? rows[0].records[0] : (Array.isArray(rows) ? rows[0] : null); }
function adjustments(d:any) { return { greige_width:n(d?.greige_width), warp_shrink:n(d?.warp_shrink), warp_wastage:n(d?.warp_wastage), weft_wastage:n(d?.weft_wastage), weft_shrink:n(d?.weft_shrink), fin_width:n(d?.fin_width), gf_shrink:n(d?.gf_shrink) }; }
function masters(d:any) {
  const price_map:Record<string,number> = {}, dye_map:Record<string,number> = {};
  [...(d?.warp_yarns||[]), ...(d?.weft_yarns||[]), ...(d?.selvedge_yarns||[])].forEach((y:any) => {
    const k=yKey(y); if (!(k in price_map)) { price_map[k]=n(y?.base_price); dye_map[k]=String(d?.type||'').toUpperCase()==='YD'?YD.M:0; }
  });
  return {price_map,dye_map};
}

export default function ProductionCostingPreviewModal({ visible, mdId, onClose }:{visible:boolean; mdId:string; onClose:()=>void}) {
  const [loading,setLoading]=useState(false), [design,setDesign]=useState<any>(null), [result,setResult]=useState<any>(null), [error,setError]=useState('');
  useEffect(()=>{
    if(!visible || !mdId) return;
    let dead=false;
    (async()=>{
      setLoading(true); setError(''); setDesign(null); setResult(null);
      try {
        const dr:any=await DesignAPI.get(mdId); const full=dr?.data?.data;
        if(!full) throw new Error('Design details could not be loaded.');
        const maps=masters(full); let params={...P}; let adjust=adjustments(full); let yd_tiers={...YD}; let yd_sub_tiers:Record<string,string>={};
        try {
          const hr:any=await CostingAPI.history({md_id:String(full.id),page:1,per_page:1,records_per_design:1});
          const h=latest(hr?.data?.data);
          if(h?.id){
            const cr:any=await CostingAPI.get(String(h.id)); const input=cr?.data?.data?.inputs||{};
            params={weaving_rate:n(input.weaving_rate??P.weaving_rate),rpm:n(input.rpm??P.rpm),eff:n(input.eff??P.eff),greige_brok:n(input.greige_brok??P.greige_brok),dyeing_proc:n(input.dyeing_proc??P.dyeing_proc),finished_brok:n(input.finished_brok??P.finished_brok),cut_pack:n(input.cut_pack??P.cut_pack)};
            adjust={greige_width:n(input.greige_width??adjust.greige_width),warp_shrink:n(input.warp_shrink??adjust.warp_shrink),warp_wastage:n(input.warp_wastage??adjust.warp_wastage),weft_wastage:n(input.weft_wastage??adjust.weft_wastage),weft_shrink:n(input.weft_shrink??adjust.weft_shrink),fin_width:n(input.fin_width??adjust.fin_width),gf_shrink:n(input.gf_shrink??adjust.gf_shrink)};
            if(String(full.type||'').toUpperCase()==='YD'){ const t=input.yd_tiers||{}; yd_tiers={L:n(t.L??60),M:n(t.M??70),D:n(t.D??85)}; yd_sub_tiers=input.yd_sub_tiers||{}; }
          }
        } catch(e) { console.log('Production Order costing prefill skipped', e); }
        if(!(adjust.greige_width>0)) throw new Error('Greige Width is required to preview costing.');
        const rr:any=await CostingAPI.compute({md_id:String(full.id),...maps,tier_code:'STD',yd_tiers,yd_sub_tiers,...params,...adjust});
        if(!rr?.data?.data) throw new Error('Unable to compute costing preview.');
        if(!dead){setDesign(full);setResult(rr.data.data);}
      } catch(e:any){ if(!dead) setError(e?.response?.data?.message||e?.message||'Unable to load costing preview.'); }
      finally{if(!dead)setLoading(false);}
    })();
    return()=>{dead=true;};
  },[visible,mdId]);

  const section=(kind:string,title:string)=>{const a=result?.[`${kind}_rows`]||[]; if(!a.length)return null; return <View style={s.block}><Text style={s.h}>{title}</Text>{a.map((r:any,i:number)=><View style={s.yarn} key={`${r.key||r.mi_id}-${i}`}><View style={{flex:1}}><Text style={s.bold}>{r.name||r.mi_id||'-'}</Text><Text style={s.muted}>{kind==='warp'?`EPI ${n(r.epi)}`:kind==='weft'?`PPI ${n(r.ppi)}`:`Ends ${n(r.ends??r.epi)}`} · g/m {n(r.grams_per_metre).toFixed(2)}</Text></View><Text style={s.rate}>{money(r.rate)}</Text><Text style={s.cost}>{money(r.cost)}</Text></View>)}</View>};
  const row=(label:string,value:any,strong=false)=><View style={s.row}><Text style={strong?s.bold:s.label}>{label}</Text><Text style={strong?s.final:s.value}>{value}</Text></View>;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={s.overlay}><View style={s.sheet}><View style={s.top}><View><Text style={s.title}>ESTIMATED FABRIC COST</Text><Text style={s.readonly}>READ ONLY · CURRENT COSTING PREVIEW</Text></View><TouchableOpacity onPress={onClose}><Text style={s.x}>×</Text></TouchableOpacity></View>
    {loading?<ActivityIndicator size="large" style={{margin:30}}/>:error?<View style={{padding:20}}><Text style={s.error}>{error}</Text></View>:design&&result?<ScrollView><Text style={s.meta}>Design: <Text style={s.bold}>{design.code}</Text>   Type: <Text style={s.bold}>{design.type}</Text>   Weave: <Text style={s.bold}>{design.weave||'-'}</Text></Text>
      {section('warp','WARP')}{section('weft','WEFT')}{section('selvedge','SELVEDGE')}
      <Text style={s.h}>COST SUMMARY · PER METRE</Text>{row('Total yarn cost',money(result.snap_rm))}{row('Weaving',money(result.snap_weaving_cost))}{row('Greige mfg cost',money(result.snap_greige_mfg))}{row('Greige price /m',money(result.snap_greige_price),true)}{row('Shrinkage impact',money(result.snap_shrink_impact))}{row('Dyeing / processing',money(result.snap_dye_proc_amount))}{row('Finished brokerage',money(result.snap_fin_brok_amt))}{row('Cutting / packing',money(result.snap_cut_pack))}{row('Finished price /m',money(result.snap_final_cost),true)}
      <Text style={s.h}>PRODUCTION SNAPSHOT</Text>{row('PPI loom',n(result.snap_ppi_loom).toFixed(0))}{row('PPI fabric',n(result.snap_ppi_table).toFixed(0))}{row('Production / day',`${n(result.snap_prod_day).toFixed(0)} m`)}{row('RM contribution',`${n(result.snap_rm_pct).toFixed(1)}%`)}{row('Weaving contribution',`${n(result.snap_weave_pct).toFixed(1)}%`)}
      <Text style={s.note}>Read only. Uses the same compute path as Costing. Nothing is saved or modified.</Text></ScrollView>:null}
    <TouchableOpacity style={s.close} onPress={onClose}><Text style={s.closeText}>Close</Text></TouchableOpacity></View></View></Modal>;
}
const s=StyleSheet.create({overlay:{flex:1,backgroundColor:'rgba(0,0,0,.55)',alignItems:'center',justifyContent:'center',padding:16},sheet:{width:'100%',maxWidth:760,maxHeight:'92%',backgroundColor:'#fff',borderRadius:14,padding:14},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',borderBottomWidth:1,borderBottomColor:'#ddd',paddingBottom:10},title:{fontSize:17,fontWeight:'900'},readonly:{fontSize:9,fontWeight:'800',marginTop:2},x:{fontSize:28,paddingHorizontal:8},meta:{fontSize:11,paddingVertical:12},block:{marginBottom:10},h:{fontSize:11,fontWeight:'900',marginTop:10,marginBottom:6,color:'#8a4d1d'},yarn:{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#eee',paddingVertical:8},bold:{fontWeight:'900'},muted:{fontSize:10,color:'#777',marginTop:2},rate:{width:78,textAlign:'right',fontSize:11},cost:{width:72,textAlign:'right',fontWeight:'900',fontSize:11},row:{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#eee',paddingVertical:6},label:{fontSize:11,color:'#555'},value:{fontSize:11,fontWeight:'700'},final:{fontSize:12,fontWeight:'900',color:'#b65f20'},note:{fontSize:9,color:'#777',textAlign:'center',marginVertical:14},error:{color:'#b00020',textAlign:'center'},close:{backgroundColor:'#f1f1f1',padding:12,borderRadius:8,alignItems:'center',marginTop:8},closeText:{fontWeight:'900'}});
