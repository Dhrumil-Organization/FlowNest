/**
 * Shed-card mini chart: Claude Artifact's 96px Spark / Recharts AreaChart.
 * For one date Recharts displays the central date tick without a line/dot;
 * for multi-day selections draw the actual daily series with a smooth area.
 * react-native-svg is already used by other charts in this Expo app.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Line } from 'react-native-svg';
import { SparkDatum, sparkGeometry, sparkTickIndices } from './ProductionSparkGeometry';

type Props = { data: SparkDatum[]; color: string; compact?: boolean };
export default function ProductionSpark({ data, color, compact = false }: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const daySignature = data.map(d => `${d.day}:${d.metres}`).join('|');
  useEffect(() => {setSelected(null);setHovered(null);}, [daySignature]);
  const height = 96;
  const plotWidth = Math.max(1, width);
  const shape = useMemo(() => sparkGeometry(data.map(d=>Number(d.metres)||0), plotWidth, height), [data,plotWidth]);
  const ticks = useMemo(() => sparkTickIndices(data.length, plotWidth), [data.length,plotWidth]);
  const gradientId = `production_spark_${color.replace(/[^a-zA-Z0-9]/g,'')}`;
  const tickColor = '#AAA0A1';
  const activeIndex = hovered ?? selected;
  const chosen = activeIndex === null ? null : data[activeIndex];
  return <View
    accessibilityLabel={`Daily checked production chart, ${data.length} ${data.length===1?'day':'days'}`}
    style={{height, marginVertical:6, width:'100%', minWidth:0, overflow:'hidden'}}
    onLayout={e => {
      const next = Math.round(e.nativeEvent.layout.width);
      if (next>0 && next!==width) setWidth(next);
    }}
  >
    {width>0 && <>
      <Svg width={width} height={height} pointerEvents="none">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.42}/>
            <Stop offset="100%" stopColor={color} stopOpacity={0.02}/>
          </LinearGradient>
        </Defs>
        {!!shape.area && <Path d={shape.area} fill={`url(#${gradientId})`}/>}
        {!!shape.line && <Path d={shape.line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"/>}
        {activeIndex!==null && shape.points[activeIndex] && data.length>1 && <>
          <Line x1={shape.points[activeIndex].x} y1={8}
            x2={shape.points[activeIndex].x} y2={height-15}
            stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.7}/>
          <Circle cx={shape.points[activeIndex].x} cy={shape.points[activeIndex].y}
            r={5} stroke="#FFFFFF" strokeWidth={2} fill={color}/>
        </>}
      </Svg>
      {data.length>1 && shape.points.map((point,i)=>{
        const prev=i===0?0:(shape.points[i-1].x+point.x)/2;
        const next=i===data.length-1?width:(point.x+shape.points[i+1].x)/2;
        return <Pressable key={`hover-${data[i].day}-${i}`}
          accessibilityRole="button"
          accessibilityLabel={`${data[i].day}: ${Math.round(data[i].metres).toLocaleString('en-IN')} checked metres`}
          onHoverIn={()=>setHovered(i)}
          onHoverOut={()=>setHovered(old=>old===i?null:old)}
          onFocus={()=>setHovered(i)}
          onBlur={()=>setHovered(old=>old===i?null:old)}
          onPress={event=>{event.stopPropagation?.();setSelected(old=>old===i?null:i);}}
          style={{position:'absolute',left:prev,top:0,width:next-prev,
            height:height-15,backgroundColor:'transparent',
            ...(Platform.OS==='web'?{cursor:'crosshair'} as any:{})}}/>;
      })}
      {ticks.map(i => <Text key={i} numberOfLines={1} style={{
        position:'absolute', left: data.length===1 ? 0 : Math.max(0, Math.min(width-24,shape.points[i].x-12)),
        bottom:0, width:data.length===1?width:24, textAlign:'center',
        color:tickColor, fontSize:9.5, lineHeight:12, fontWeight:'400',
      }}>{data[i]?.day?.slice(8,10) || '—'}</Text>)}
      {!!chosen && data.length>1 && <View pointerEvents="none" style={{
        position:'absolute', top:0, right:3, backgroundColor:'#FFF',
        paddingHorizontal:7,paddingVertical:4,borderColor:'#E7E0DA',borderWidth:1,
        borderRadius:6,flexDirection:'row',gap:6,alignItems:'center',
      }}><Text style={{fontSize:compact?10:11,color:'#7A7A82'}}>{chosen.day}</Text>
        <Text style={{fontSize:compact?10:11,color,fontWeight:'800'}}>{Math.round(chosen.metres).toLocaleString('en-IN')} m</Text>
      </View>}
    </>}
  </View>;
}
