import Icon from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ExpenseDashboardData, fetchExpenseDashboardCard } from '../../services/Dashboard/expenseDashboardApi';

type Props = {
  token:string; prptype?:string; yearno:number|string; monthno:number|string;
  date?:string; prpcodes?:string[]|string; isConnected?:boolean|null;
  onPress?:(data:ExpenseDashboardData)=>void;
};

const n = (v:unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
const money = (v:unknown, d=0) => `₹${n(v).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d})}`;
const num = (v:unknown, d=0) => n(v).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});

const ExpenseDashboardCard:React.FC<Props> = ({
  token, prptype='S', yearno, monthno, date, prpcodes = [], isConnected=true, onPress
}) => {
  const [data,setData] = useState<ExpenseDashboardData|null>(null);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,setError] = useState('');

  const load = useCallback(async(force=false)=>{
    if (isConnected === false) {
      setError('No internet connection.'); setLoading(false); setRefreshing(false); return;
    }
    force ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setData(await fetchExpenseDashboardCard({token,prptype,yearno,monthno,date,prpcodes,refresh:force}));
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Unable to load production cost.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  },[token,prptype,yearno,monthno,date,prpcodes,isConnected]);

  useEffect(()=>{ load(false); },[load]);

  if (loading && !data) {
    return <View style={[s.card,s.center]}><ActivityIndicator color="#7A5B24"/><Text style={s.state}>Loading production cost…</Text></View>;
  }

  if (error && !data) {
    return <View style={[s.card,s.errorRow]}>
      <Icon name="error-outline" size={22} color="#A5463D"/>
      <View style={{flex:1,marginHorizontal:12}}>
        <Text style={s.errorTitle}>Production cost unavailable</Text>
        <Text style={s.errorText}>{error}</Text>
      </View>
      <TouchableOpacity onPress={()=>load(true)} style={s.roundBtn}><Icon name="refresh" size={20} color="#7A5B24"/></TouchableOpacity>
    </View>;
  }

  if (!data) return null;
  const {summary,period,composition,production} = data;

  return <TouchableOpacity activeOpacity={onPress?0.92:1} disabled={!onPress} onPress={()=>onPress?.(data)} style={s.card}>
    <View style={s.header}>
      <View>
        <Text style={s.eyebrow}>THIS MONTH · PRODUCTION COST</Text>
        <View style={s.periodRow}>
          <Text style={s.period}>{period.label}</Text>
          {period.ongoing && <View style={s.live}><View style={s.dot}/><Text style={s.liveText}>LIVE</Text></View>}
        </View>
      </View>
      <TouchableOpacity disabled={refreshing} onPress={()=>load(true)} style={s.roundBtn}>
        {refreshing?<ActivityIndicator size="small" color="#7A5B24"/>:<Icon name="refresh" size={20} color="#7A5B24"/>}
      </TouchableOpacity>
    </View>

    <View style={s.hero}>
      <Text style={s.heroLabel}>TOTAL COST</Text>
      <Text style={s.heroValue}>{money(summary.total_cost)}</Text>
      <Text style={s.heroMeta}>{num(period.working_days)} working days · {num(summary.costing_looms)} costing looms</Text>
    </View>

    <View style={s.grid}>
      <Metric label="Cost / Pick" value={money(summary.cost_per_pick,3)} icon="show-chart"/>
      <Metric label="Avg Picks" value={num(summary.avg_picks,1)} icon="grain"/>
      <Metric label="Production" value={`${num(summary.production_mtr)} m`} icon="precision-manufacturing"/>
      <Metric label="Cost / MC·Day" value={money(summary.cost_per_machine_day,2)} icon="calendar-month"/>
      <Metric label="Units" value={num(summary.units)} icon="electric-meter"/>
      <Metric label="Unit Rate" value={money(summary.unit_rate,2)} icon="currency-rupee"/>
    </View>

    <View style={s.divider}/>
    <View style={s.composition}>
      <Part label="Electricity" value={composition.electricity} icon="bolt"/>
      <Part label="Salary" value={composition.salary} icon="groups"/>
      <Part label="Stores" value={composition.stores} icon="inventory-2"/>
    </View>

    <View style={s.footer}>
      <Text style={s.footerText}>Rapier {num(production.rapier_total_mtr)} m · Waterjet {num(production.sip_waterjet_mtr)} m</Text>
      {onPress && <Icon name="chevron-right" size={22} color="#8A8175"/>}
    </View>
    {!!error && <Text style={s.inlineError}>{error}</Text>}
  </TouchableOpacity>;
};

const Metric = memo(({label,value,icon}:{label:string;value:string;icon:string})=>
  <View style={s.metric}><View style={s.metricTop}><Icon name={icon} size={15} color="#8A6A2E"/><Text style={s.metricLabel}>{label}</Text></View><Text numberOfLines={1} style={s.metricValue}>{value}</Text></View>
);
const Part = ({label,value,icon}:{label:string;value:number;icon:string})=>
  <View style={s.part}><View style={s.partIcon}><Icon name={icon} size={16} color="#7A5B24"/></View><Text style={s.partLabel}>{label}</Text><Text style={s.partValue}>{money(value)}</Text></View>;

const s=StyleSheet.create({
  card:{marginHorizontal:16,marginVertical:8,padding:16,borderRadius:22,backgroundColor:'#FFFDF9',borderWidth:1,borderColor:'#EAE2D6',shadowColor:'#332A20',shadowOffset:{width:0,height:7},shadowOpacity:.08,shadowRadius:15,elevation:4},
  center:{minHeight:150,alignItems:'center',justifyContent:'center'},state:{marginTop:10,color:'#756C61',fontSize:13,fontWeight:'600'},
  errorRow:{minHeight:104,flexDirection:'row',alignItems:'center'},errorTitle:{color:'#3B332B',fontSize:14,fontWeight:'800'},errorText:{marginTop:3,color:'#857A6F',fontSize:12},
  roundBtn:{width:38,height:38,borderRadius:19,backgroundColor:'#F4EBDD',alignItems:'center',justifyContent:'center'},
  header:{flexDirection:'row',justifyContent:'space-between'},eyebrow:{color:'#8A6A2E',fontSize:10,letterSpacing:1.3,fontWeight:'800'},
  periodRow:{marginTop:5,flexDirection:'row',alignItems:'center'},period:{color:'#2B2723',fontSize:17,fontWeight:'800'},
  live:{marginLeft:8,paddingHorizontal:7,paddingVertical:3,borderRadius:10,flexDirection:'row',alignItems:'center',backgroundColor:'#EDF5EA'},
  dot:{width:6,height:6,marginRight:4,borderRadius:3,backgroundColor:'#5C8A4B'},liveText:{color:'#527943',fontSize:9,fontWeight:'900'},
  hero:{marginTop:18,padding:16,borderRadius:17,backgroundColor:'#292622'},heroLabel:{color:'#BEB4A7',fontSize:10,letterSpacing:1.2,fontWeight:'800'},
  heroValue:{marginTop:5,color:'#FFF',fontSize:29,fontWeight:'900'},heroMeta:{marginTop:6,color:'#CFC6BB',fontSize:11,fontWeight:'600'},
  grid:{marginTop:12,flexDirection:'row',flexWrap:'wrap',marginHorizontal:-4},metric:{width:'50%',padding:4},metricTop:{flexDirection:'row',alignItems:'center'},
  metricLabel:{marginLeft:5,color:'#82786D',fontSize:11,fontWeight:'700'},metricValue:{marginTop:5,color:'#342E28',fontSize:16,fontWeight:'800'},
  divider:{height:1,marginVertical:14,backgroundColor:'#ECE5DB'},composition:{flexDirection:'row'},part:{flex:1,alignItems:'center'},
  partIcon:{width:29,height:29,borderRadius:15,backgroundColor:'#F4EBDD',alignItems:'center',justifyContent:'center'},
  partLabel:{marginTop:6,color:'#877C70',fontSize:10,fontWeight:'700'},partValue:{marginTop:3,color:'#37312B',fontSize:12,fontWeight:'800'},
  footer:{marginTop:15,paddingTop:12,borderTopWidth:1,borderTopColor:'#EFE8DF',flexDirection:'row',alignItems:'center'},
  footerText:{flex:1,color:'#756B60',fontSize:11,fontWeight:'600'},inlineError:{marginTop:10,color:'#A5463D',fontSize:10},
});

export default memo(ExpenseDashboardCard);
