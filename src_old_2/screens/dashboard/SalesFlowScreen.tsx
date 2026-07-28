import {
  AnalyticsDesignRow,
  AnalyticsDocumentRow,
  AnalyticsLineRow,
  AnalyticsPartyRow,
  DashboardAPI,
  DashboardMetricKey,
  DashboardView,
} from '@/src/api/dashboard';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { S, T } from '@/src/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Level = 'parties' | 'designs' | 'documents' | 'lines';
type Row = AnalyticsPartyRow | AnalyticsDesignRow | AnalyticsDocumentRow | AnalyticsLineRow;

function money(value: number) {
  const n = Number(value || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  return `${sign}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function qty(value: number) {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v || '';
}

function dateText(value: string | number | undefined) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{8}$/.test(raw)) return `${raw.slice(6, 8)}-${raw.slice(4, 6)}-${raw.slice(0, 4)}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString('en-IN');
}

const LEVEL_LABEL: Record<Level, string> = {
  parties: 'By Party',
  designs: 'By Design / Article',
  documents: 'Documents',
  lines: 'Document Lines',
};

export default function SalesFlowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const session = useAppSessionStore((s: any) => s.appSession || s.session);

  const metric = (one(params.metric as any) || 'SALES_ORDER') as Exclude<DashboardMetricKey, 'COLLECTION'>;
  const view = (one(params.view as any) || 'my') as DashboardView;
  const level = (one(params.level as any) || 'parties') as Level;
  const monthno = Number(one(params.monthno as any) || new Date().getMonth() + 1);
  const executiveCode = one(params.executive_code as any);
  const executiveName = one(params.executive_name as any);
  const partyCode = one(params.party_code as any);
  const partyName = one(params.party_name as any);
  const designCode = one(params.design_code as any);
  const designName = one(params.design_name as any);
  const documentUid = one(params.document_uid as any);
  const documentNo = one(params.document_no as any);

  const context = session?.business_context || session?.businessContext || {};
  const yearno = context?.year_no ?? context?.yearno ?? session?.year_no ?? 27;
  const prptype = context?.prp_group ?? context?.prptype ?? 'S';

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [periodTitle, setPeriodTitle] = useState('Monthly Sales');

  const request = useMemo(() => ({
    metric,
    prptype,
    yearno,
    monthno,
    view,
    executive_code: executiveCode || undefined,
    party_code: partyCode || undefined,
    design_code: designCode || undefined,
    document_uid: documentUid || undefined,
  }), [designCode, documentUid, executiveCode, metric, monthno, partyCode, prptype, view, yearno]);

  const load = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      let result: any;
      if (level === 'parties') result = await DashboardAPI.analyticsParties(request as any);
      else if (level === 'designs') result = await DashboardAPI.analyticsDesigns(request as any);
      else if (level === 'documents') result = await DashboardAPI.analyticsDocuments(request as any);
      else result = await DashboardAPI.analyticsLines(request as any);
      if (!result?.success) throw new Error(result?.message || 'Unable to load sales report.');
      setRows(result.response?.data || []);
      setPeriodTitle(result.response?.period?.month_name || 'Monthly Sales');
    } catch (e: any) {
      setRows([]);
      setError(e?.message || 'Unable to load sales report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [level, request]);

  useEffect(() => { load(); }, [load]);

  const totalAmount = useMemo(() => rows.reduce((s, r: any) => s + Number(r.amount ?? r.actual ?? 0), 0), [rows]);
  const totalQty = useMemo(() => rows.reduce((s, r: any) => s + Number(r.qty || 0), 0), [rows]);

  const breadcrumb = [executiveName, partyName, designName, documentNo].filter(Boolean).join(' › ');

  const openRow = (row: any) => {
    const base: any = { view, monthno, metric, executive_code: executiveCode, executive_name: executiveName };
    if (level === 'parties') {
      router.push({ pathname: '/new/(tabs)/reports/sales-flow', params: { ...base, level: 'designs', party_code: row.party_code, party_name: row.party_name } } as any);
    } else if (level === 'designs') {
      router.push({ pathname: '/new/(tabs)/reports/sales-flow', params: { ...base, level: 'documents', party_code: partyCode, party_name: partyName, design_code: row.design_code, design_name: row.design_name } } as any);
    } else if (level === 'documents') {
      router.push({ pathname: '/new/(tabs)/reports/sales-flow', params: { ...base, level: 'lines', party_code: partyCode, party_name: partyName, design_code: designCode, design_name: designName, document_uid: row.document_uid, document_no: row.document_no } } as any);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{metric === 'BILLING' ? 'BILLING' : 'SALES ORDER'} · {periodTitle.toUpperCase()}</Text>
          <Text numberOfLines={1} style={styles.title}>{LEVEL_LABEL[level]}</Text>
          {breadcrumb ? <Text numberOfLines={1} style={styles.breadcrumb}>{breadcrumb}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => load(true)} style={styles.refresh}><Text style={styles.refreshText}>↻</Text></TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={T.nav} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Text style={styles.heroIconText}>₹</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>{executiveName || (view === 'owner' ? 'OWNER SALES VIEW' : 'MY SALES VIEW')}</Text>
            <Text style={styles.heroValue}>{money(totalAmount)}</Text>
            <Text style={styles.heroSub}>{rows.length} records · Qty {qty(totalQty)}</Text>
          </View>
          <View style={styles.share}><Text style={styles.shareValue}>{rows.length}</Text><Text style={styles.shareLabel}>items</Text></View>
        </View>

        <View style={styles.stepRow}>
          {(['parties', 'designs', 'documents', 'lines'] as Level[]).map((x, i) => {
            const active = x === level;
            return <View key={x} style={[styles.step, active && styles.stepActive]}><Text style={[styles.stepText, active && styles.stepTextActive]}>{i + 1}. {LEVEL_LABEL[x]}</Text></View>;
          })}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}><Text style={styles.panelHeaderText}>{LEVEL_LABEL[level].toUpperCase()}</Text></View>
          <View style={styles.columnHeader}><Text style={styles.columnLeft}>NAME / REFERENCE</Text><Text style={styles.columnRight}>QTY · AMOUNT</Text></View>

          {loading ? (
            <View style={styles.state}><ActivityIndicator color={T.nav} size="large" /><Text style={styles.stateText}>Loading sales flow…</Text></View>
          ) : error ? (
            <View style={styles.state}><Text style={styles.errorTitle}>Unable to load report</Text><Text style={styles.stateText}>{error}</Text><TouchableOpacity onPress={() => load()} style={styles.retry}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>
          ) : rows.length === 0 ? (
            <View style={styles.state}><Text style={styles.emptyTitle}>No records found</Text><Text style={styles.stateText}>No data is available for the selected month and filters.</Text></View>
          ) : rows.map((row: any, index) => {
            const primary = level === 'parties' ? row.party_name : level === 'designs' ? (row.design_name || row.design_code) : level === 'documents' ? (row.document_no || row.document_uid) : (row.design_name || row.design_code || `Line ${row.line_no}`);
            const secondary = level === 'parties' ? row.party_code : level === 'designs' ? `${row.design_code || ''} · ${row.document_count || 0} docs` : level === 'documents' ? `${row.prp_code || ''} · ${dateText(row.document_date)}` : `${row.document_no || ''} · Line ${row.line_no ?? ''}`;
            const amount = Number(row.amount ?? row.actual ?? 0);
            const canOpen = level !== 'lines';
            return (
              <TouchableOpacity key={`${level}-${index}-${primary}`} disabled={!canOpen} onPress={() => openRow(row)} activeOpacity={0.82} style={styles.row}>
                <View style={[styles.rank, { backgroundColor: [T.nav, T.yd, T.green, T.purple, T.copper][index % 5] }]}><Text style={styles.rankText}>{index + 1}</Text></View>
                <View style={styles.rowMain}><Text numberOfLines={1} style={styles.rowTitle}>{primary || 'Unspecified'}</Text><Text numberOfLines={1} style={styles.rowSub}>{secondary}</Text></View>
                <View style={styles.rowRight}><Text style={styles.rowQty}>{qty(row.qty || 0)}</Text><Text style={styles.rowAmount}>{money(amount)}</Text></View>
                {canOpen ? <Text style={styles.chevron}>›</Text> : null}
              </TouchableOpacity>
            );
          })}

          {!loading && !error && rows.length > 0 ? (
            <View style={styles.totalRow}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.totalValue}>{qty(totalQty)} · {money(totalAmount)}</Text></View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: T.nav, marginTop: -3 },
  kicker: { color: T.copper, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: T.ink, fontSize: 22, fontWeight: '900', marginTop: 2 },
  breadcrumb: { color: T.muted, fontSize: 10, marginTop: 2 },
  refresh: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: T.nav, fontSize: 19, fontWeight: '900' },
  content: { paddingHorizontal: 16, paddingBottom: 36 },
  hero: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...S.card },
  heroIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  heroIconText: { color: T.purple, fontSize: 22, fontWeight: '900' },
  heroLabel: { color: T.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  heroValue: { color: T.ink, fontSize: 21, fontWeight: '900', marginTop: 3 },
  heroSub: { color: T.muted, fontSize: 10, marginTop: 3 },
  share: { minWidth: 54, minHeight: 54, borderRadius: 12, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  shareValue: { color: T.nav, fontSize: 16, fontWeight: '900' },
  shareLabel: { color: T.muted, fontSize: 8, marginTop: 1 },
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 12 },
  step: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  stepActive: { backgroundColor: T.nav, borderColor: T.nav },
  stepText: { color: T.muted, fontSize: 9, fontWeight: '800' },
  stepTextActive: { color: '#fff' },
  panel: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, overflow: 'hidden', ...S.card },
  panelHeader: { minHeight: 43, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: T.nav },
  panelHeaderText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.55 },
  columnHeader: { minHeight: 38, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.hair },
  columnLeft: { flex: 1, color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  columnRight: { color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  state: { minHeight: 190, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: T.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 8 },
  errorTitle: { color: T.red, fontSize: 15, fontWeight: '900' },
  emptyTitle: { color: T.ink, fontSize: 15, fontWeight: '900' },
  retry: { backgroundColor: T.nav, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginTop: 12 },
  retryText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  row: { minHeight: 64, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.hair },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  rankText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { color: T.ink, fontSize: 12, fontWeight: '800' },
  rowSub: { color: T.muted, fontSize: 9, marginTop: 4 },
  rowRight: { alignItems: 'flex-end', marginLeft: 8 },
  rowQty: { color: T.muted, fontSize: 9, fontWeight: '700' },
  rowAmount: { color: T.ink, fontSize: 11, fontWeight: '900', marginTop: 3 },
  chevron: { color: T.muted, fontSize: 21, marginLeft: 7 },
  totalRow: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.alt },
  totalLabel: { color: T.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  totalValue: { color: T.ink, fontSize: 11, fontWeight: '900' },
});
