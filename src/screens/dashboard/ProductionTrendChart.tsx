/**
 * Daily Production · Claude-style responsive daily stacked-bar chart.
 * Source: current selected ERP checking rows only. No demo values, no rounded
 * aggregation and no dependency on the previous comparison period.
 *
 * Shared by the Production overview and EVERY selected drilldown when a
 * multi-day period is chosen (Last 7 Days, This Month, Custom, etc.).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import {
  bucketsOf, countLabel, DailyRow, Key, seriesFor, ShedSpec, ymdToIso,
} from './ProductionDailyModel';

const INK = '#102132';
const MUTED = '#89848A';
const HAIR = '#EDE7E2';
const PAL = ['#76288B', '#405F9B', '#1A5D7C', '#CC7B35', '#236044', '#CF952F'];
const OTHER = '#CFC8C2';
const fmt = (value:number, dec=0) => Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:dec});
const tickText = (v:number) => v>=100000 ? `${fmt(v/100000,1)}L` : v>=1000 ? `${fmt(v/1000,1)}k` : fmt(v);
const dayText = (day:string) => `${day.slice(8,10)}/${day.slice(5,7)}`;

export type DailyTrendPart = { key:string; label:string; color:string; metres:number };
export type DailyTrendColumn = { day:string; total:number; parts:DailyTrendPart[] };
export type DailyTrendLegend = { key:string; label:string; color:string };

/** A pure source-data transformation, shared by UI rendering and regression tests.
 * Each calendar day remains an individual column; never group/average two days. */
export function productionTrendSeries(
  rows: DailyRow[], from: string, to: string, groupField?: Key,
  sheds: ShedSpec[]=[], color='#76288B',
): { columns:DailyTrendColumn[]; legend:DailyTrendLegend[]; total:number } {
  const days=seriesFor(rows,from,to);
  if (!days.length) return {columns:[],legend:[],total:0};
  const groups=groupField && groupField!=='day'
    ? bucketsOf(rows,groupField).filter(b=>b.metres>0).slice(0,5)
    : [];
  const legend:DailyTrendLegend[]=groups.length
    ? groups.map((group,i)=>({
      key:group.key,label:group.label,
      color:groupField==='shed'
        ? sheds.find(s=>s.key===group.key)?.color || PAL[i%PAL.length]
        : PAL[i%PAL.length],
    }))
    : [{key:'metres',label:'Metres',color}];
  // Using the same source row identities as the report's drilldown ensures a
  // category or physical loom is not counted twice when PrpCode differs.
  const byDay=new Map<string, Map<string,number>>();
  for (const group of groups) for (const row of group.entries) {
    const d=ymdToIso(row.chkdate);
    let parts=byDay.get(d);
    if (!parts) {parts=new Map();byDay.set(d,parts);}
    parts.set(group.key,(parts.get(group.key)||0)+Number(row.metres||0));
  }
  let hasOther=false;
  const columns=days.map(day=>{
    const parts:DailyTrendPart[]=legend.map(l=>({
      ...l, metres:groups.length ? byDay.get(day.day)?.get(l.key)||0 : day.metres,
    }));
    const accounted=parts.reduce((sum,p)=>sum+p.metres,0);
    const unassigned=day.metres-accounted;
    // Tiny floating point residuals are not real production.
    if (groups.length && unassigned>0.000001) {
      parts.push({key:'other',label:'Other',color:OTHER,metres:unassigned});
      hasOther=true;
    }
    return {day:day.day,total:day.metres,parts};
  });
  if (hasOther)legend.push({key:'other',label:'Other',color:OTHER});
  return {columns,legend,total:columns.reduce((sum,c)=>sum+c.total,0)};
}

/** Aim for a Recharts-like domain: a little headroom, not a scale that
 * squashes a 25k day into half of a 40k plot. */
export function chartAxisMaximum(high:number):number {
  if (!(high>0))return 4;
  const magnitude=Math.pow(10,Math.floor(Math.log10(high)));
  const variants=[1,1.2,1.5,2,2.4,2.5,3,3.5,4,4.5,5,6,7,8,9,10];
  const wanted=high*1.05;
  return (variants.find(v=>v*magnitude>=wanted)||10)*magnitude;
}

type Props={
  rows:DailyRow[];from:string;to:string;color:string;compact:boolean;
  groupField?:Key;sheds?:ShedSpec[];
};
export default function ProductionTrendChart({rows,from,to,color,compact,groupField,sheds=[]}:Props){
  const [width,setWidth]=useState(0);
  const [selected,setSelected]=useState<string|null>(null);
  // A desktop hover is transient; a click/touch pins the same real ERP day.
  const [hovered,setHovered]=useState<string|null>(null);
  const {columns,legend,total}=useMemo(
    ()=>productionTrendSeries(rows,from,to,groupField,sheds,color),
    [rows,from,to,groupField,sheds,color],
  );
  const signature=columns.map(c=>`${c.day}:${c.total}`).join('|');
  useEffect(()=>{setSelected(null);setHovered(null);},[signature,groupField]);
  if(columns.length<2)return null;

  // Match Claude's tall chart rather than tiny solid rectangles. Leave the
  // category/bar width capped, so two days NEVER stretch to half-page slabs.
  const plotHeight=compact?184:218;
  const top=18;
  const bottom=plotHeight-24;
  const left=52;
  const right=12;
  const usableWidth=Math.max(260,width||640);
  const minSlot=compact?30:26;
  const chartWidth=Math.max(usableWidth,columns.length*minSlot+left+right);
  const usablePlotWidth=chartWidth-left-right;
  const slot=usablePlotWidth/columns.length;
  const barWidth=Math.max(6,Math.min(38,slot*0.60));
  const axisMax=chartAxisMaximum(Math.max(...columns.map(c=>c.total)));
  const plotArea=bottom-top;
  const getY=(metres:number)=>bottom-Math.min(1,Math.max(0,metres/axisMax))*plotArea;
  const labelsAllowed=Math.max(2,Math.floor(usablePlotWidth/(compact?41:38)));
  const every=Math.max(1,Math.ceil(columns.length/labelsAllowed));
  const activeDay=hovered||selected;
  const active=columns.find(c=>c.day===activeDay)||null;
  const activeIndex=active?columns.findIndex(c=>c.day===active.day):-1;
  // Long design/category names receive additional width where screen space
  // permits; the tooltip never escapes the scrollable chart viewport.
  const widestLabel=Math.max(0,...(active?.parts||[]).filter(p=>p.metres>0).map(p=>p.label.length));
  const tooltipWidth=Math.min(chartWidth-12,Math.max(205,Math.min(318,160+widestLabel*5)));
  const tooltipLeft=activeIndex<0?0:Math.max(4,Math.min(chartWidth-tooltipWidth-4,
    left+(activeIndex+0.5)*slot-tooltipWidth/2));
  const nonzeroParts=active?.parts.filter(p=>p.metres>0)||[];
  const tooltipHeight=41+nonzeroParts.length*22+10;
  const tooltipTop=Math.max(3,Math.min(plotHeight-tooltipHeight-3,
    active?getY(active.total)-tooltipHeight-8:3));

  return <View style={{width:'100%',minWidth:0,marginTop:5}}
    accessibilityLabel={`Production trend for ${from} through ${to}: ${fmt(total)} metres on ${columns.length} calendar days`}
    onLayout={e=>{
      const n=Math.round(e.nativeEvent.layout.width);
      if(n>0&&n!==width)setWidth(n);
    }}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:4}}>
      <Text style={{fontSize:10,color:MUTED}}>Checked metres by day · {Platform.OS==='web'?'hover or click':'tap'} a bar for detail</Text>
      <Text style={{fontSize:10,fontWeight:'800',color:INK}}>{fmt(total)} m · {countLabel(columns.length,'day')}</Text>
    </View>
    <ScrollView horizontal={chartWidth>usableWidth+2} showsHorizontalScrollIndicator={columns.length>15}
      style={{width:'100%',minWidth:0}} contentContainerStyle={{minWidth:chartWidth}}>
      {/* Native Pressables, rather than SVG-only touch handlers, work with both
          React Native Web mouse hover and iOS/Android taps. Keeping the tooltip
          INSIDE the scroll content makes it track the correct column on Custom
          ranges that scroll horizontally, without relying on DOM APIs. */}
      <View style={{width:chartWidth,height:plotHeight,position:'relative'}}>
        <Svg width={chartWidth} height={plotHeight} pointerEvents="none">
          {[0,1,2,3,4].map(i=>{
            const y=getY(axisMax*i/4);
            return <React.Fragment key={`grid${i}`}>
              <Line x1={left} y1={y} x2={chartWidth-right} y2={y}
                stroke={i===0?'#DAD3CF':HAIR} strokeWidth={i===0?1.15:0.8}/>
              <SvgText x={left-9} y={y+3} textAnchor="end" fontSize={9}
                fill={MUTED}>{tickText(axisMax*i/4)}</SvgText>
            </React.Fragment>;
          })}
          {columns.map((day,i)=>{
            const middle=left+(i+0.5)*slot;
            const x=middle-barWidth/2;
            let offset=0;
            const focused=day.day===activeDay;
            return <React.Fragment key={day.day}>
              {focused&&<Rect x={left+i*slot+1} y={top} width={Math.max(1,slot-2)} height={plotArea}
                fill={color} opacity={0.065} rx={3}/>}
              {day.parts.filter(p=>p.metres>0).map((part,j,all)=>{
                const h=Math.max(0.4,part.metres/axisMax*plotArea);
                const y=bottom-(offset+h);offset+=h;
                return <Rect key={part.key} x={x} y={y} width={barWidth} height={h}
                  fill={part.color} rx={j===all.length-1?Math.min(3,h/2):0}/>;
              })}
              {(i===0||i===columns.length-1||i%every===0)&&<SvgText x={middle} y={bottom+17}
                textAnchor="middle" fontSize={compact?9:9.5} fill={MUTED}>{dayText(day.day)}</SvgText>}
            </React.Fragment>;
          })}
        </Svg>
        {columns.map((day,i)=><Pressable key={`target-${day.day}`}
          accessibilityRole="button"
          accessibilityLabel={`${day.day}, ${fmt(day.total)} checked metres; show breakdown`}
          onHoverIn={()=>setHovered(day.day)}
          onHoverOut={()=>setHovered(old=>old===day.day?null:old)}
          onFocus={()=>setHovered(day.day)}
          onBlur={()=>setHovered(old=>old===day.day?null:old)}
          onPress={()=>setSelected(old=>old===day.day?null:day.day)}
          style={{position:'absolute',left:left+i*slot,top,
            width:slot,height:plotArea+5,backgroundColor:'transparent',
            ...(Platform.OS==='web'?{cursor:'crosshair'} as any:{})}}
        />)}
        {active&&<View pointerEvents="none" accessibilityLabel={`${active.day}: ${fmt(active.total)} metres`}
          style={{position:'absolute',zIndex:50,elevation:12,
            left:tooltipLeft,top:tooltipTop,width:tooltipWidth,
            backgroundColor:'rgba(255,255,255,0.99)',borderWidth:1,
            borderColor:'#DCD5D0',borderRadius:10,paddingHorizontal:12,paddingTop:10,paddingBottom:9,
            shadowColor:'#0D1B2A',shadowOffset:{width:0,height:7},shadowOpacity:0.23,shadowRadius:14,
            ...(Platform.OS==='web'?{boxShadow:'0px 12px 34px rgba(13,27,42,0.24)'} as any:{})}}>
          <Text style={{fontSize:11,color:'#65626A',fontWeight:'800',marginBottom:7}}>{active.day}</Text>
          {nonzeroParts.length===0&&<Text style={{fontSize:11,color:MUTED}}>No checked production</Text>}
          {nonzeroParts.map(part=><View key={part.key}
            style={{flexDirection:'row',alignItems:'center',gap:7,minHeight:22,minWidth:0}}>
            <View style={{width:9,height:9,borderRadius:2,backgroundColor:part.color,flexShrink:0}}/>
            <Text numberOfLines={1} style={{flex:1,minWidth:0,fontSize:11,color:INK}}>{part.label}</Text>
            <Text style={{fontSize:11,color:INK,fontWeight:'800',flexShrink:0}}>{fmt(part.metres,2)} m</Text>
          </View>)}
        </View>}
      </View>
    </ScrollView>
    {legend.length>1&&<View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:11,marginTop:4,marginLeft:compact?0:4}}>
      {legend.map(item=><View key={item.key} style={{flexDirection:'row',alignItems:'center',gap:4,maxWidth:compact?175:210}}>
        <View style={{height:8,width:8,backgroundColor:item.color,borderRadius:2}}/>
        <Text numberOfLines={1} style={{fontSize:9.5,color:MUTED,flexShrink:1}}>{item.label}</Text>
      </View>)}
    </View>}

  </View>;
}
