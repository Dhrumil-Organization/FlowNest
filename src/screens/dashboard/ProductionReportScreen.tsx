/** Weaving report: Claude WeavingDashboard layout, backed by verified checking rows. */
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import WeavingDailyProduction from './WeavingDailyProduction';

type Tab = 'conv' | 'prod' | 'status' | 'short';
const tabs: { id: Tab; title: string }[] = [
  { id: 'conv', title: 'Conversion' }, { id: 'prod', title: 'Daily production' },
  { id: 'status', title: 'Beam status' }, { id: 'short', title: 'Beam shortage' },
];
const navy = '#102132';
export default function ProductionReportScreen() {
  const { width } = useWindowDimensions();
  const isPhone = width < 600;
  const params = useLocalSearchParams();
  const router = useRouter();
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const prptype = Array.isArray(params.prptype) ? params.prptype[0] : params.prptype;
  const initial = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  // Expo Router can retain an old serialized dashboard snapshot in the browser URL.
  // Strip it even when the user opens a bookmarked/stale URL directly.
  useEffect(() => {
    if (params.production === undefined) return;
    const clean: Record<string, string> = {};
    if (typeof date === 'string' && date) clean.date = date;
    if (typeof prptype === 'string' && prptype) clean.prptype = prptype;
    const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    if (typeof tab === 'string' && tab) clean.tab = tab;
    router.replace({ pathname: '/new/(tabs)/reports/production', params: clean });
  }, [params.production, params.tab, date, prptype, router]);
  const [tab, setTab] = useState<Tab>(tabs.some(t => t.id === initial) ? initial as Tab : 'prod');
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F4F0' }}>
    <ScrollView contentContainerStyle={{ paddingHorizontal: isPhone ? 12 : 14, paddingVertical: isPhone ? 12 : 18, maxWidth: 1460, width: '100%', alignSelf: 'center', paddingBottom: isPhone ? 128 : 40, flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 13, gap: 10 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6E0DA', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9 }}><Text style={{ fontSize: 16, color: navy }}>‹</Text></TouchableOpacity>
        <Text style={{ fontSize: 12, fontWeight: '800', color: navy }}>Owner › Weaving production</Text>
      </View>
      {tab !== 'prod' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {tabs.map(t => <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={{ backgroundColor: tab === t.id ? '#F3EAF4' : '#FFF', borderWidth: 1, borderColor: tab === t.id ? '#782C86' : '#E6E0DA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 }}><Text style={{ color: tab === t.id ? '#782C86' : navy, fontSize: 11, fontWeight: '800' }}>{t.title}</Text></TouchableOpacity>)}
      </View>}
      {tab === 'prod' ? <WeavingDailyProduction date={date} prptype={prptype} tabControls={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 3 }}>{tabs.map(t => <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={{ backgroundColor: tab === t.id ? '#F3EAF4' : '#FFF', borderWidth: 1, borderColor: tab === t.id ? '#782C86' : '#E6E0DA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}><Text style={{ color: tab === t.id ? '#782C86' : navy, fontSize: 11, fontWeight: '800' }}>{t.title}</Text></TouchableOpacity>)}</View>} /> :
        <View style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6E0DA', borderRadius: 12, padding: 22 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: navy }}>{tabs.find(t => t.id === tab)?.title}</Text>
          <Text style={{ color: '#667085', marginTop: 8, lineHeight: 21 }}>
            {tab === 'conv' ? 'Conversion requires a verified design-specific monthly rate. No amount will be fabricated.' : tab === 'status' ? 'Beam status requires verified beam lifecycle and prior-financial-year carry-forward metadata.' : 'Beam shortage requires verified checking completion; physical closure alone is not completion.'}
          </Text>
        </View>}
    </ScrollView>
  </SafeAreaView>;
}
