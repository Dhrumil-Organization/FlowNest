import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SamplingHubAPI } from '@/src/api/legacyClient';
import { usePermission } from '@/src/core/permissions';
import AppAlert from '@/common/utils/appAlert';
import { useBusinessContext } from '@/src/core/business';
import { normalizeList, unwrap, ListData } from '@/src/screens/samplingHub/samplingHubModel';
import { sampleDashboardStats, sampleDateLabel, sampleDisplayName } from '@/src/screens/dashboard/samplesDashboardModel';

const P = '#692A8D', B = '#E7DAEE', MUTED = '#968D95';
export default function SamplesDashboardCard({ prptype, date, onOpenReport, onOpenSample }: {
  prptype: string; date: string; onOpenReport: (stage?: string) => void; onOpenSample: (id: string) => void;
}) {
  const { yearNo, prpCode } = useBusinessContext();
  const { canAccess } = usePermission();
  const canOpenHub = canAccess('production.sampling_hub');
  const openReport = (stage: string) => canOpenHub ? onOpenReport(stage) : AppAlert.alert('Sampling Hub access', 'Ask an administrator to allow Production → Sampling Hub in the Permission Registry.');
  const openSample = (id: string) => canOpenHub ? onOpenSample(id) : AppAlert.alert('Sampling Hub access', 'Ask an administrator to allow Production → Sampling Hub in the Permission Registry.');
  const [data, setData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!prptype || !yearNo) return;
    setLoading(true); setError('');
    try {
      const res = await SamplingHubAPI.list({prptype, yearno: String(yearNo), prpcode: String(prpCode || ''), dashboard_card: 1});
      setData(normalizeList(unwrap(res)));
    } catch (e: any) { setData(null); setError(e?.response?.data?.message || e?.message || 'Samples unavailable.'); }
    finally { setLoading(false); }
  }, [prptype, yearNo, prpCode]);
  useEffect(() => { void load(); }, [load]);
  const stats = useMemo(() => data ? sampleDashboardStats(data, date) : null, [data, date]);
  const fyYear = Number(date.slice(0,4)) + (Number(date.slice(5,7)) >= 4 ? 1 : 0);
  const fy = `FY ${String(fyYear-1).slice(-2)}-${String(fyYear).slice(-2)}`;
  const totals = [
    {name: 'CREATED · MONTH', value: stats?.created ?? 0, stage:'created', c:P},
    {name: 'DISPATCHED · MONTH', value: stats?.dispatched ?? 0, stage:'dispatches', c:P},
    {name: 'IN STORE', value: stats?.inStore ?? 0, stage:'inventory', c:'#355A86'},
    {name: 'OUT', value: stats?.out ?? 0, stage:'out', c:'#277145'},
  ];
  return <View style={s.card}>
    <View style={s.header}>
      <View style={s.headName}><Text style={s.title}>▣  SAMPLES</Text></View>
      <View style={s.headerActions}>
        <Pressable onPress={() => openReport('fy')} accessibilityRole="button" style={s.fy}><Text style={s.headerSmall}>{fy} ›</Text></Pressable>
        <Pressable onPress={() => openReport('overview')} accessibilityRole="button"><Text style={s.headerSmall}>Full report ›</Text></Pressable>
        <Text style={s.live}>live</Text>
      </View>
    </View>
    {loading && !stats ? <View style={s.loader}><ActivityIndicator color={P}/><Text style={s.sub}>Loading samples…</Text></View> : null}
    {error ? <Pressable style={s.error} onPress={() => void load()}><Text style={s.errorText}>{error} · Tap to retry</Text></Pressable> : null}
    {stats ? <View style={s.body}>
      <View style={s.metrics}>{totals.map(item => <Pressable key={item.name} style={s.metric} onPress={() => openReport(item.stage)} accessibilityRole="button">
        <Text style={s.metricName}>{item.name}</Text><Text style={[s.metricValue,{color:item.c}]}>{item.value.toLocaleString('en-IN')}</Text>
      </Pressable>)}</View>
      <View style={s.sectionHead}><Text style={s.sectionTitle}>LATEST DISPATCHES</Text><Text style={s.sectionTitle}>SAMPLE ID</Text></View>
      <ScrollView style={s.list} nestedScrollEnabled showsVerticalScrollIndicator={stats.latestDispatches.length > 3}>
        {stats.latestDispatches.slice(0, 8).map(({move, sample}) => <Pressable key={move.id} style={s.row} onPress={() => openSample(move.sample)} accessibilityRole="button">
          <View style={s.rowInfo}>
            <Text style={s.rowTitle} numberOfLines={1}><Text style={s.id}>{move.sample}</Text> {sampleDisplayName(sample)}</Text>
            <Text style={s.rowSub} numberOfLines={1}>→ {move.party || 'Customer'} · {move.by || 'Recorded'} · {sampleDateLabel(move.date)}</Text>
          </View><Text style={s.rowId}>›</Text>
        </Pressable>)}
        {!stats.latestDispatches.length ? <Text style={s.empty}>No customer dispatches this month.</Text> : null}
      </ScrollView>
      <Text style={s.note}>Status and balances reflect recorded sample movements.</Text>
    </View> : null}
  </View>;
}
const s = StyleSheet.create({
  card:{borderRadius:12,backgroundColor:'#fff',borderWidth:1,borderColor:'#E7E0E9',overflow:'hidden',marginBottom:14},
  header:{backgroundColor:P,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingHorizontal:11,paddingVertical:8,minHeight:32},
  headName:{flexShrink:1},title:{fontSize:12,fontWeight:'900',color:'#fff'},headerActions:{flexDirection:'row',alignItems:'center',gap:7},fy:{borderRadius:10,borderWidth:1,borderColor:'#BE8BCB',paddingHorizontal:7,paddingVertical:2},headerSmall:{fontSize:9,fontWeight:'800',color:'#fff'},live:{fontSize:9,color:'#EBD7F4',fontWeight:'700'},
  loader:{minHeight:100,justifyContent:'center',alignItems:'center',gap:8},sub:{fontSize:10,color:MUTED},
  body:{paddingHorizontal:10,paddingBottom:9},metrics:{flexDirection:'row',paddingVertical:11,gap:8,justifyContent:'space-between'},metric:{flex:1,minWidth:0},metricName:{fontSize:8,color:'#A18C99',fontWeight:'900',letterSpacing:.1},metricValue:{fontSize:15,fontWeight:'900',marginTop:4},
  sectionHead:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:4,borderBottomWidth:1,borderBottomColor:'#EFE9F0',paddingVertical:8},sectionTitle:{fontSize:9,color:'#A18C99',fontWeight:'900'},list:{maxHeight:178},row:{paddingVertical:7,borderBottomWidth:1,borderBottomColor:'#EFE9F0',flexDirection:'row',gap:7,alignItems:'center'},rowInfo:{flex:1,minWidth:0},rowTitle:{fontSize:10.5,color:'#162334',fontWeight:'800'},id:{fontWeight:'900',color:'#C17629'},rowSub:{fontSize:9.2,color:'#8F8C96',marginTop:3},rowId:{color:P,fontSize:18},empty:{textAlign:'center',fontSize:10,color:MUTED,paddingVertical:12},note:{color:'#9D91A0',fontSize:9,marginTop:8},error:{padding:12,backgroundColor:'#FFF0F0'},errorText:{fontSize:10,color:'#9B2020'},
});
