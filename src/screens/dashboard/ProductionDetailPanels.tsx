/** Claude Artifact · Daily Production lower panels.
 * Values come exclusively from the production_full ERP checking response.
 * Intentionally does not synthesize design categories or checking roll records.
 */
import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import {
  Bucket, DailyRow, Key, ShedSpec, bucketsOf, countLabel, deltaPercent, measure, rollCount, ymdToIso,
} from './ProductionDailyModel';
import { DESIGN_PREVIEW_LIMIT, orderForClaude, designMixRows, unmappedBucket } from './ProductionPanelModel';

const C = { ink:'#102132', mut:'#85818A', faint:'#AEA5A1', hair:'#EBE5DE', prod:'#76288B', green:'#2A6044', red:'#BE402E', track:'#ECE7E1' };
const DESIGN_COLORS = ['#6C277E','#405F9B','#1A5D7C','#CC7B35','#236044','#CF952F','#9C48A8','#A43E3C','#587355','#142332'];
const num = (value:number, decimals=0) => Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:decimals});
const percent = (value:number,total:number) => total>0?Math.round(value*100/total):0;
const card = {backgroundColor:'#FFFFFF',borderColor:'#E7E0DA',borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingTop:10,paddingBottom:7} as const;
/** Use the category name already resolved by ERP. Do not show one category as if
 * it described every source record when the grouped design spans several. */
function categoryCaption(entries: DailyRow[]): string | null {
  const names = new Map<string,string>();
  for (const row of entries) {
    const display = String(row.category_name ?? '').trim().replace(/\s+/g,' ');
    if (display && display.toUpperCase() !== 'UNRESOLVED CATEGORY')
      names.set(display.toLocaleUpperCase('en'),display);
  }
  return names.size > 1 ? 'Multiple categories' : names.values().next().value ?? null;
}


type RowProps = {
  bucket:Bucket; field:Key; rank:number; total:number; max:number; color:string;
  fleet?:number; previous:number|null; onPress:()=>void; compact:boolean;
  machineWidth?: string | null; machineShedHint?: string | null;
  onDesignChip?: (design:Bucket)=>void; designColours?:Map<string,string>;
  designSelected?:boolean;
};
function Prior({now, prior}:{now:number;prior:number|null}) {
  const change=deltaPercent(now,prior);
  const positive=change!==null && change>=0;
  return <Text style={{fontSize:10,fontWeight:'800',color:change===null?C.faint:positive?C.green:C.red,textAlign:'right'}}>{change===null?'—':`${positive?'▲':'▼'}${Math.abs(change)>999?'>999':Math.abs(change)}%`}</Text>;
}
function Track({value,total,color}:{value:number;total:number;color:string}) {
  return <View style={{height:6,borderRadius:5,overflow:'hidden',backgroundColor:C.track,marginTop:4,marginBottom:3}}>
    <View style={{height:6,width:`${Math.max(0,Math.min(100,total>0?100*value/total:0))}%`,backgroundColor:color}}/>
  </View>;
}
function rankBg(i:number){return i<3?C.prod:'#EFEAE4';}
function DetailsRow({bucket,field,rank,total,max,color,fleet,previous,onPress,compact,machineWidth,onDesignChip,designColours,machineShedHint,designSelected=false}:RowProps) {
  const days = new Set(bucket.entries.map(r=>ymdToIso(r.chkdate))).size;
  const designMachines = field==='design' ? bucketsOf(bucket.entries,'machine') : [];
  const secondary = field==='shed'
    ? bucketsOf(bucket.entries,'machine').slice(0,3).map(b=>`${b.label} ${num(b.metres)} m`).join(' · ')
    : field==='category'
      ? `${countLabel(bucket.machines.size,'machine')} · ${countLabel(bucket.beams.size,'beam')}`
      : field==='design'
        // Claude shows the leading physical machines and their actual checked metres.
        // More machines remain accessible through the design row drilldown.
        ? `Machines: ${designMachines.slice(0,3).map(b=>`${b.label} ${num(b.metres)} m`).join(' · ')}${designMachines.length>3?` +${designMachines.length-3}`:''}`
        : field==='machine'
          // Once a design is selected, repeating “1 design” is redundant.
          ? `${countLabel(bucket.beams.size,'beam')} · ${designSelected?'':`${countLabel(bucket.designs.size,'design')} · `}${countLabel(days,'day')}`
          : `${countLabel(bucket.machines.size,'machine')} · ${countLabel(bucket.beams.size,'beam')}`;
  const beam = field === 'beam' ? bucket.entries.find(e=>e.beam_no || e.beam_warp_length != null) : null;
  const beamDetails = beam ? [
    beam.beam_warp_length != null ? `Warp ${num(Number(beam.beam_warp_length),3)} m` : '',
    beam.beam_balance_length != null ? `Balance ${num(Number(beam.beam_balance_length),3)} m` : '',
  ].filter(Boolean).join(' · ') : '';
  const shareBase=field==='shed'?total:max;
  const rowDesigns=(field==='category'||(field==='machine'&&!designSelected)) ? bucketsOf(bucket.entries,'design') : [];
  const previewLimit=compact?4:6;
  const multiCategory=Boolean(categoryCaption(bucket.entries)==='Multiple categories');
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${bucket.label}, ${num(bucket.metres)} metres, ${countLabel(bucket.rolls,'roll')}, open details`} onPress={onPress}
    style={{paddingVertical:compact?10:9,borderBottomWidth:1,borderColor:C.hair}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:compact?6:8}}>
      <View style={{width:18,height:18,borderRadius:10,backgroundColor:rankBg(rank),alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <Text style={{fontSize:9,fontWeight:'900',color:rank<3?'#FFF':C.mut}}>{rank+1}</Text>
      </View>
      <View style={{flex:1,minWidth:0}}>
        <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:4}}>
          <Text numberOfLines={2} style={{fontSize:compact?11.5:11.5,fontWeight:'800',color:C.ink}}>{bucket.label}</Text>
          {field==='shed' && fleet!==undefined && <View style={{borderRadius:5,paddingHorizontal:5,paddingVertical:1,backgroundColor:`${color}12`,borderColor:`${color}42`,borderWidth:1}}>
            <Text style={{fontSize:9,fontWeight:'800',color}}>{bucket.machines.size} / {fleet} machines</Text>
          </View>}
          {field==='design' && !!categoryCaption(bucket.entries) && <Text style={{color:C.mut,fontSize:9.5}}>{categoryCaption(bucket.entries)}</Text>}
          {field==='machine' && !!machineShedHint && <View style={{borderWidth:1,borderRadius:5,borderColor:C.hair,backgroundColor:'#F5F1EC',paddingHorizontal:5,paddingVertical:1}}><Text style={{fontSize:8,color:C.mut,fontWeight:'700'}}>{machineShedHint}</Text></View>}
          {field==='machine' && !!machineWidth && <View style={{borderWidth:1,borderRadius:5,borderColor:C.hair,backgroundColor:'#FAF8F5',paddingHorizontal:5,paddingVertical:1}}><Text style={{fontSize:8,color:C.mut,fontWeight:'700'}}>{machineWidth}</Text></View>}
        </View>
        <Track value={bucket.metres} total={shareBase} color={color}/>
        <Text numberOfLines={compact?2:1} style={{fontSize:9.5,color:C.mut}}>{field==='shed'?'Machines: ':''}{field==='beam' && beamDetails ? `${beamDetails} · ` : ''}{secondary||'—'}{field==='shed' && bucket.machines.size>3?` +${bucket.machines.size-3}`:''}</Text>
      </View>
      {compact ? <View style={{minWidth:70,alignItems:'flex-end'}}>
        <Text style={{fontSize:12,fontWeight:'900',color:C.ink}}>{num(bucket.metres)} m</Text>
        <Text style={{fontSize:10,color:C.mut}}>{countLabel(bucket.rolls,'roll')} · {bucket.rolls?num(bucket.metres/bucket.rolls):'—'} m/r</Text>
        <Prior now={bucket.metres} prior={previous}/>
      </View> : <>
        <Text style={{width:75,textAlign:'right',fontSize:12,fontWeight:'900',color:C.ink}}>{num(bucket.metres)}</Text>
        <Text style={{width:42,textAlign:'right',fontSize:11,color:C.ink}}>{num(bucket.rolls)}</Text>
        <Text style={{width:52,textAlign:'right',fontSize:11,color:C.mut}}>{bucket.rolls?num(bucket.metres/bucket.rolls):'—'}</Text>
        <View style={{width:53}}><Prior now={bucket.metres} prior={previous}/></View>
      </>}
    </View>
    {rowDesigns.length>0 && <View style={{backgroundColor:'#FAF8F5',borderColor:C.hair,borderWidth:1,borderStyle:'dashed',borderRadius:7,paddingHorizontal:6,paddingVertical:4,marginTop:4,flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:5}}>
      <Text style={{fontSize:8.5,fontWeight:'800',color:C.faint,letterSpacing:0.5,marginRight:2}}>DESIGNS</Text>
      {rowDesigns.slice(0,previewLimit).map((design,i)=>{
        const chipColor=designColours?.get(design.key)||DESIGN_COLORS[i%DESIGN_COLORS.length];
        const cat=categoryCaption(design.entries);
        const pc=percent(design.metres,bucket.metres);
        return <TouchableOpacity key={design.key} accessibilityRole="button" accessibilityLabel={`${design.label}, ${num(design.metres)} metres, ${pc}% of ${field==='category'?'category':'machine'}, open design`}
          onPress={event=>{event?.stopPropagation?.();onDesignChip?.(design);}}
          style={{flexDirection:'row',alignItems:'center',gap:4,borderWidth:1,borderColor:`${chipColor}44`,borderLeftWidth:3,borderLeftColor:chipColor,borderRadius:6,backgroundColor:`${chipColor}10`,paddingHorizontal:7,paddingVertical:3}}>
          <Text numberOfLines={1} style={{fontSize:9.5,fontWeight:'800',color:C.ink}}>{design.label}</Text>
          <Text style={{fontSize:9.5,fontWeight:'800',color:chipColor}}>{num(design.metres)}</Text>
          <Text style={{fontSize:9,color:C.mut}}>{pc}%</Text>
          {multiCategory && !!cat && <Text numberOfLines={1} style={{fontSize:8.5,color:C.mut}}>{cat}</Text>}
        </TouchableOpacity>;
      })}
      {rowDesigns.length>previewLimit && <Text style={{fontSize:9.5,color:C.mut,fontWeight:'700'}}>+{rowDesigns.length-previewLimit} more</Text>}
    </View>}
  </TouchableOpacity>;
}
export type PanelsProps={
  rows:DailyRow[];previousRows:DailyRow[];previousAvailable:boolean;
  field:Key; buckets:Bucket[]; sheds:ShedSpec[];compact:boolean;
  onOpen:(b:Bucket)=>void;onDesign:(b:Bucket)=>void;onAllDesigns:()=>void;
  onMachineDesign?:(machine:Bucket,design:Bucket)=>void;
  onCategoryDesign?:(category:Bucket,design:Bucket)=>void;
  showMix:boolean;title:string;onShowRecords?:()=>void;
  designSelected?:boolean;nextField?:Key;
};
export default function ProductionDetailPanels({rows,previousRows,previousAvailable,field,buckets,sheds,compact,onOpen,onDesign,onAllDesigns,onMachineDesign,onCategoryDesign,showMix,title,onShowRecords,designSelected=false,nextField}:PanelsProps){
  const total=measure(rows);
  const rolls=rollCount(rows);
  const ordered=orderForClaude(buckets,field,sheds);
  const unresolved=unmappedBucket(buckets,field);
  const prevBuckets=new Map(bucketsOf(previousRows,field).map(b=>[b.key,b.metres]));
  const sortedByOutput=buckets.slice().sort((a,b)=>b.metres-a.metres);
  const max=Math.max(1,...buckets.map(b=>b.metres));
  const allDesigns=designMixRows(rows);
  const mix=allDesigns.slice(0,DESIGN_PREVIEW_LIMIT);
  const topDesign=Math.max(1,...mix.map(b=>b.metres));
  const shedColor=(key:string)=>sheds.find(s=>s.key===key)?.color||C.mut;
  // A given design keeps the same colour in the rows and the adjacent Design Mix.
  const designColours=new Map(allDesigns.map((d,i)=>[d.key,DESIGN_COLORS[i%DESIGN_COLORS.length]]));
  const machineLabels=new Map<string,number>();
  buckets.forEach(b=>machineLabels.set(b.label,(machineLabels.get(b.label)||0)+1));
  const machineWidth=(bucket:Bucket):string|null=>{
    const spec=sheds.find(s=>s.key===bucket.entries[0]?.shed_key);
    // These loom widths are reference-confirmed physical ranges, not derived from a fabricated dimension.
    if(!spec)return null;
    if(spec.range.includes('R75') && spec.range.includes('R84')) return '230 cm';
    if(spec.range.includes('R01') || spec.range.includes('R49') || spec.range.includes('R85')) return '190 cm';
    return null;
  };
  const panelHeader=field==='shed'?'Shed-wise':field==='category'?'Item-wise':field==='machine'?'Machine-wise':field==='design'?'Design-wise':field==='day'?'Day-wise':'Beam-wise';
  const nextLabel=nextField==='machine'?'machines':nextField==='design'?'designs':nextField==='beam'?'beams':nextField==='day'?'days':nextField==='category'?'categories':'rolls';
  const guide=field==='shed'?'machines · bar = share of output':field==='machine'?`${nextLabel} · number order, badge = output rank, bar vs top loom`:field==='day'?`${nextLabel} · date order, badge = output rank`:`${nextLabel} · bar vs top row`;
  return <View style={{flexDirection:showMix&&!compact?'row':'column',gap:10,alignItems:'flex-start'}}>
    <View style={{...card,width:showMix&&!compact?'58.5%':'100%',minWidth:0,alignSelf:'flex-start'}}>
      <View style={{flexDirection:'row',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
        <Text style={{fontSize:12,fontWeight:'900',color:C.ink}}>{panelHeader} production</Text>
        <Text style={{fontSize:9.5,color:C.mut,flexGrow:1}}>{`tap a row → ${guide}`}</Text>
        {onShowRecords ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${countLabel(rolls,'checking record')}`} onPress={onShowRecords}><Text style={{fontSize:10,fontWeight:'800',color:C.prod}}>{countLabel(rolls,'record')} ›</Text></TouchableOpacity>
        : <Text style={{fontSize:10,fontWeight:'800',color:C.mut}}>{countLabel(rolls,'record')}</Text>}
      </View>
      {!compact && <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingTop:7,paddingBottom:5,borderBottomWidth:1,borderColor:C.hair}}>
        <View style={{width:18}}/>
        <Text style={{fontSize:9,fontWeight:'700',color:C.mut,flex:1}}>{field==='shed'?'SHED':field==='category'?'ITEM CATEGORY':field.toUpperCase()}</Text>
        <Text style={{width:75,fontSize:9,fontWeight:'700',color:C.mut,textAlign:'right'}}>METRES</Text>
        <Text style={{width:42,fontSize:9,fontWeight:'700',color:C.mut,textAlign:'right'}}>ROLLS</Text>
        <Text style={{width:52,fontSize:9,fontWeight:'700',color:C.mut,textAlign:'right'}}>M/ROLL</Text>
        <Text style={{width:53,fontSize:9,fontWeight:'700',color:C.mut,textAlign:'right'}}>VS PREV</Text>
      </View>}
      {ordered.map(b=>{
        const rank=sortedByOutput.findIndex(x=>x.key===b.key);
        return <DetailsRow key={b.key} bucket={b} field={field} rank={rank} total={total} max={max}
          color={field==='shed'?shedColor(b.key):DESIGN_COLORS[rank%DESIGN_COLORS.length]}
          fleet={field==='shed'?sheds.find(s=>s.key===b.key)?.fleet:undefined}
          previous={previousAvailable?prevBuckets.get(b.key)??0:null}
          compact={compact} machineWidth={field==='machine'?machineWidth(b):null}
          machineShedHint={field==='machine' && (machineLabels.get(b.label)||0)>1?b.entries[0]?.shed_label:null}
          designColours={designColours} designSelected={designSelected}
          onDesignChip={field==='machine' && onMachineDesign?design=>onMachineDesign(b,design):field==='category' && onCategoryDesign?design=>onCategoryDesign(b,design):undefined}
          onPress={()=>onOpen(b)}/>;
      })}
      {ordered.length===0 && <Text style={{fontSize:12,color:C.mut,paddingVertical:14}}>No checking entries in the selected period.</Text>}
      {!!unresolved && <Text style={{fontSize:10,color:'#946000',paddingVertical:8}}>{`Unassigned (not a physical shed): ${num(unresolved.metres)} m · ${countLabel(unresolved.rolls,'roll')} — review unassigned production`}</Text>}
      {(ordered.length>0 || !!unresolved) && <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingTop:10,paddingBottom:5}}>
        <View style={{width:18}}/>
        <Text style={{fontSize:11,fontWeight:'900',color:C.ink,flex:1}}>Total</Text>
        {compact ? <View style={{alignItems:'flex-end'}}><Text style={{fontSize:12,fontWeight:'900',color:C.ink}}>{num(total)} m</Text><Text style={{fontSize:10,color:C.mut}}>{countLabel(rolls,'roll')} · {rolls?num(total/rolls):'—'} m/r</Text><Prior now={total} prior={previousAvailable?measure(previousRows):null}/></View> : <>
          <Text style={{width:75,textAlign:'right',fontWeight:'900',color:C.ink,fontSize:12}}>{num(total)}</Text>
          <Text style={{width:42,textAlign:'right',fontWeight:'900',color:C.ink,fontSize:11}}>{num(rolls)}</Text>
          <Text style={{width:52,textAlign:'right',color:C.mut,fontSize:11}}>{rolls?num(total/rolls):'—'}</Text>
          <View style={{width:53}}><Prior now={total} prior={previousAvailable?measure(previousRows):null}/></View>
        </>}
      </View>}
    </View>
    {showMix && allDesigns.length>0 && <View style={{width:!compact?'40%':'100%',minWidth:0,alignSelf:'flex-start',...(Platform.OS==='web'&&!compact?{position:'sticky' as any,top:8}:{} )}}>
    <View style={{...card,width:'100%',minWidth:0}}>
      <View style={{flexDirection:'row',gap:6,justifyContent:'space-between',alignItems:'baseline',marginBottom:5}}>
        <Text style={{fontSize:12,fontWeight:'900',color:C.ink,flex:1}}>{`Design mix · ${title}`}</Text>
        <Text style={{fontSize:9.5,color:C.mut}}>{countLabel(allDesigns.length,'design')}</Text>
      </View>
      {mix.map((b,i)=>{
        const color=DESIGN_COLORS[i%DESIGN_COLORS.length];
        const category=categoryCaption(b.entries);
        return <TouchableOpacity key={b.key} onPress={()=>onDesign(b)} accessibilityRole="button"
          accessibilityLabel={`${b.label}, ${num(b.metres)} metres, open design details`}
          style={{paddingVertical:7,borderBottomWidth:1,borderColor:C.hair}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:5,minWidth:0}}>
            <View style={{width:8,height:8,borderRadius:2,backgroundColor:color,flexShrink:0}}/>
            <Text numberOfLines={1} style={{fontSize:11.5,color:C.ink,fontWeight:'800',flexShrink:1}}>{b.label}</Text>
            {!!category && <Text numberOfLines={1} style={{fontSize:9.5,color:C.mut,flex:1,minWidth:0}}>{category}</Text>}
            {!category && <View style={{flex:1}}/>}
            <Text style={{fontSize:11.5,color:C.ink,fontWeight:'900'}}>{num(b.metres)}</Text>
            <Text style={{width:34,textAlign:'right',fontSize:9.5,color:C.mut}}>{percent(b.metres,total)}%</Text>
          </View>
          <Track value={b.metres} total={topDesign} color={color}/>
          <Text style={{fontSize:9.5,color:C.mut}}>{countLabel(b.machines.size,'machine')} · {countLabel(b.rolls,'roll')} · {countLabel(b.beams.size,'beam')}</Text>
        </TouchableOpacity>;
      })}
      {allDesigns.length>mix.length && <TouchableOpacity accessibilityRole="button" onPress={onAllDesigns} style={{paddingVertical:9}}>
        <Text style={{fontSize:10,color:C.mut}}>+{countLabel(allDesigns.length-mix.length,'more design')} — view by Design to see all ›</Text>
      </TouchableOpacity>}
    </View></View>}
  </View>;
}
