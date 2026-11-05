/** Weaving report: Claude WeavingDashboard layout, backed by verified checking rows. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, Text, TouchableOpacity, View, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import WeavingDailyProduction from './WeavingDailyProduction';
import OwnerWeavingConversionScreen from '../production/OwnerWeavingConversionScreen';
import BeamStatusPanel, { BeamStatusRow } from './BeamStatusPanel';
import ProductionBeamShortageScreen from '../reports/ProductionBeamShortageScreen';
import { usePermission } from '@/src/core/permissions';

type Tab = 'conv' | 'prod' | 'status' | 'short';
const tabs: { id: Tab; title: string; resource: string }[] = [
  { id: 'conv', title: 'Conversion', resource: 'reports.production_report.conversion' }, { id: 'prod', title: 'Daily Production', resource: 'reports.production_report.daily_production' },
  { id: 'status', title: 'Beam Status', resource: 'reports.production_report.beam_status' }, { id: 'short', title: 'Beam Shortage', resource: 'reports.production_report.beam_shortage' },
];
const navy = '#102132';
export default function ProductionReportScreen() {
  const { canAccess } = usePermission();
  const allowedTabs = tabs.filter(t => canAccess(t.resource) || (t.id === 'prod' && canAccess('dashboard.production_detail')));
  const { width, height: windowHeight } = useWindowDimensions();
  const safeInsets = useSafeAreaInsets();
  const isPhone = width < 600;
  // The application's web tab bar is fixed over the bottom of the viewport.
  // Padding alone cannot prevent scrolling content from passing BEHIND it.
  // A bounded scroll viewport terminates above the bar. The measurement uses
  // the report's actual screen position rather than assuming a fixed header.
  const hasWebBottomBar = Platform.OS === 'web' && width < 768;
  const rootRef = useRef<View>(null);
  const [rootTop, setRootTop] = useState<number | null>(null);
  const measureRootTop = useCallback(() => {
    if (!hasWebBottomBar) return;
    rootRef.current?.measureInWindow((_x, y) => {
      if (!Number.isFinite(y) || y < 0 || y >= windowHeight) return;
      setRootTop(previous => previous !== null && Math.abs(previous - y) < 2 ? previous : y);
    });
  }, [hasWebBottomBar, windowHeight]);
  useEffect(() => { measureRootTop(); }, [measureRootTop]);
  // 80 logical pixels covers the fixed 4-button bar plus separation from text.
  // Add the real device safe-area inset; on ordinary desktop the shell owns it.
  const reservedNavHeight = 80 + safeInsets.bottom;
  const measuredTop = rootTop === null ? Math.min(150, windowHeight * 0.20) : Math.max(56, rootTop);
  const availableHeight = hasWebBottomBar
    ? Math.max(120, Math.floor(windowHeight - measuredTop - reservedNavHeight))
    : undefined;
  const params = useLocalSearchParams();
  const router = useRouter();
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const prptype = Array.isArray(params.prptype) ? params.prptype[0] : params.prptype;
  const initial = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialShedKey = String(Array.isArray(params.shed_key) ? params.shed_key[0] : params.shed_key || '').trim();
  const initialShedLabel = String(Array.isArray(params.shed_label) ? params.shed_label[0] : params.shed_label || '').trim();
  const initialFromDate = String(Array.isArray(params.from_date) ? params.from_date[0] : params.from_date || '').trim();
  const clearShed = useCallback(() => {
    router.setParams({ shed_key: undefined, shed_label: undefined });
  }, [router]);
  // Expo Router can retain an old serialized dashboard snapshot in the browser URL.
  // Strip it even when the user opens a bookmarked/stale URL directly.
  useEffect(() => {
    if (params.production === undefined) return;
    const clean: Record<string, string> = {};
    if (typeof date === 'string' && date) clean.date = date;
    if (typeof prptype === 'string' && prptype) clean.prptype = prptype;
    const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    if (typeof tab === 'string' && tab) clean.tab = tab;
    if (initialShedKey) clean.shed_key = initialShedKey;
    if (initialShedLabel) clean.shed_label = initialShedLabel;
    if (initialFromDate) clean.from_date = initialFromDate;
    router.replace({ pathname: '/new/(tabs)/reports/production', params: clean });
  }, [params.production, params.tab, date, prptype, initialShedKey, initialShedLabel, initialFromDate, router]);
  const [tab, setTab] = useState<Tab>(tabs.some(t => t.id === initial) ? initial as Tab : 'prod');
  const activeTab = allowedTabs.some(t => t.id === tab) ? tab : allowedTabs[0]?.id;
  const chooseTab = (id: Tab) => { if (allowedTabs.some(t => t.id === id)) { setTab(id); router.setParams({ tab: id }); } };
  useEffect(() => { if (typeof initial === 'string' && tabs.some(t => t.id === initial)) setTab(initial as Tab); }, [initial]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [beamTarget, setBeamTarget] = useState<{ prpcode: string; beam_uid: string; beam_no: string; last_checking_date?: number | null; nonce: number } | null>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const refreshReport = useCallback(() => {
    if (activeTab !== 'prod' || pullRefreshing) return;
    setPullRefreshing(true);
    setRefreshToken(v => v + 1);
  }, [activeTab, pullRefreshing]);
  const finishRefresh = useCallback(() => setPullRefreshing(false), []);
  useEffect(() => { if (activeTab !== 'prod') setPullRefreshing(false); }, [activeTab]);
  // React Native's RefreshControl is native-only. On phone-size RN Web,
  // provide the same pull gesture while keeping the toolbar Refresh fallback.
  const scrollY = useRef(0);
  const webTouch = useRef<{ x: number; y: number } | null>(null);
  const webPulled = useRef(false);
  const webPhone = Platform.OS === 'web' && isPhone;
  const webTouchPoint = (event: any) => {
    const native = event?.nativeEvent;
    const first = native?.touches?.[0] || native?.changedTouches?.[0] || native;
    return { x: Number(first?.pageX), y: Number(first?.pageY) };
  };
  const onWebTouchStart = (e: any) => {
    webTouch.current = null;
    webPulled.current = false;
    if (!webPhone || activeTab !== 'prod' || scrollY.current > 1) return;
    const point = webTouchPoint(e);
    if (Number.isFinite(point.x) && Number.isFinite(point.y)) webTouch.current = point;
  };
  const onWebTouchMove = (e: any) => {
    if (!webTouch.current || !webPhone || scrollY.current > 1) return;
    const point = webTouchPoint(e);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const dy = point.y - webTouch.current.y;
    const dx = Math.abs(point.x - webTouch.current.x);
    webPulled.current = dy >= 85 && dx < 35;
  };
  const onWebTouchEnd = () => {
    if (webPhone && webPulled.current) refreshReport();
    webTouch.current = null;
    webPulled.current = false;
  };
  const onWebTouchCancel = () => { webTouch.current = null; webPulled.current = false; };
  return <SafeAreaView
    ref={rootRef}
    onLayout={measureRootTop}
    style={{
      flex: hasWebBottomBar ? undefined : 1,
      height: availableHeight,
      maxHeight: availableHeight,
      minHeight: 0,
      minWidth: 0,
      overflow: 'hidden',
      backgroundColor: '#F7F4F0',
    }}>
    <ScrollView
      style={{ flex: 1, minHeight: 0, minWidth: 0, ...(webPhone ? { overscrollBehaviorY: 'contain' } as any : {}) }}
      nestedScrollEnabled
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      onScroll={e => {scrollY.current = e.nativeEvent.contentOffset.y;}}
      scrollEventThrottle={16}
      refreshControl={isPhone && Platform.OS !== 'web' && activeTab === 'prod'
        ? <RefreshControl refreshing={pullRefreshing} onRefresh={refreshReport} colors={['#742786']} tintColor="#742786" />
        : undefined}
      onTouchStart={onWebTouchStart}
      onTouchMove={onWebTouchMove}
      onTouchEnd={onWebTouchEnd}
      onTouchCancel={onWebTouchCancel}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: isPhone ? 12 : 14,
        paddingTop: isPhone ? 12 : 18,
        paddingBottom: hasWebBottomBar ? 24 : (isPhone ? 24 + safeInsets.bottom : 48),
        maxWidth: 1460,
        width: '100%',
        alignSelf: 'center',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 13, gap: 10 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6E0DA', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9 }}><Text style={{ fontSize: 16, color: navy }}>‹</Text></TouchableOpacity>
        <Text style={{ fontSize: 12, fontWeight: '800', color: navy }}>Owner › Weaving production</Text>
      </View>
      {allowedTabs.length === 0 ? <View style={{ padding: 20 }}><Text style={{ color: navy }}>You do not have access to these reports.</Text></View> : null}
      {activeTab !== 'prod' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {allowedTabs.map(t => <TouchableOpacity key={t.id} onPress={() => chooseTab(t.id)} style={{ backgroundColor: activeTab === t.id ? '#F3EAF4' : '#FFF', borderWidth: 1, borderColor: activeTab === t.id ? '#782C86' : '#E6E0DA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 }}><Text style={{ color: activeTab === t.id ? '#782C86' : navy, fontSize: 11, fontWeight: '800' }}>{t.title}</Text></TouchableOpacity>)}
      </View>}
      {!activeTab ? null : activeTab === 'prod' ? <WeavingDailyProduction date={date} prptype={prptype} initialFromDate={initialFromDate} initialShedKey={initialShedKey} initialShedLabel={initialShedLabel} onClearShed={clearShed} initialBeam={beamTarget} onReturnToBeamStatus={() => { setBeamTarget(null); chooseTab('status'); }} refreshToken={refreshToken} onRefreshComplete={finishRefresh} onSelectedDateChange={selectedDate => router.setParams({date: selectedDate})} tabControls={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 3 }}>{allowedTabs.map(t => <TouchableOpacity key={t.id} onPress={() => chooseTab(t.id)} style={{ backgroundColor: activeTab === t.id ? '#F3EAF4' : '#FFF', borderWidth: 1, borderColor: activeTab === t.id ? '#782C86' : '#E6E0DA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}><Text style={{ color: activeTab === t.id ? '#782C86' : navy, fontSize: 11, fontWeight: '800' }}>{t.title}</Text></TouchableOpacity>)}</View>} /> :
        activeTab === 'status' ? <BeamStatusPanel prptype={prptype} onOpenBeam={(beam: BeamStatusRow) => {
          setBeamTarget({prpcode: beam.prpcode, beam_uid: beam.beam_uid, beam_no: beam.beam_no,
            last_checking_date: beam.last_checking_date, nonce: Date.now()});
          if (allowedTabs.some(t => t.id === 'prod')) chooseTab('prod');
        }}/> :
        activeTab === 'short' ? <ProductionBeamShortageScreen /> :
        <OwnerWeavingConversionScreen prptype={prptype} />}
      {/* Explicit scroll-content end marker. Unlike relying only on a style
          padding value, this occupies measurable layout space on RN Web. */}
      <View collapsable={false} accessible={false} style={{ height: 16, flexShrink: 0 }} />
    </ScrollView>
  </SafeAreaView>;
}
