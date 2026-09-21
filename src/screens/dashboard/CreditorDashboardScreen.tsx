import { SubScreenHeader } from '@/src/components/layout/SubScreenHeader';
import { T } from '@/src/theme';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, formatAmountActual } from './employ/api/api';

const one = (value: any) => Array.isArray(value) ? value[0] : (value || '');
const money = (value: any) => formatAmountActual(Number(value || 0));

function Metric({ label, value, light = false }: any) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, light && styles.metricLabelLight]}>{label}</Text>
      <Text style={[styles.metricValue, light && styles.metricValueLight]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Section({ title, subtitle, children }: any) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function Progress({ value, total }: any) {
  const pct = Number(total) > 0
    ? Math.max(0, Math.min(100, (Number(value || 0) / Number(total)) * 100))
    : 0;

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

export default function CreditorDashboardScreen() {
  const params = useLocalSearchParams();
  const prptype = one(params.prptype) || 'S';
  const partycode = one(params.partycode);
  const partyname = one(params.partyname) || `Party ${partycode}`;
  const date = one(params.date) || new Date().toISOString().slice(0, 10);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (!partycode) {
      setError('Party code is missing.');
      setLoading(false);
      return;
    }

    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError('');

      const response = await api.getCreditorDashboardSummary(prptype, partycode, date);
      if (!response?.success) throw new Error('Unable to load creditor dashboard.');
      setData(response.data);
    } catch (e: any) {
      setError(e?.message || 'Unable to load creditor dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, partycode, prptype]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const position = data?.creditor_position || {};
  const finalPosition = position?.final || {};
  const opening = position?.opening || {};
  const currentFy = position?.current_fy || {};
  const outstanding = data?.outstanding?.summary || {};
  const payment = data?.payment?.summary || {};
  const po = data?.purchase_order || {};
  const months = data?.purchase?.last_6_months || [];

  const sixMonthPurchase = useMemo(
    () => months.reduce((sum: number, row: any) => sum + Number(row?.value || 0), 0),
    [months],
  );

  if (loading && !data) {
    return (
      <View style={styles.root}>
        <SubScreenHeader backLabel="Back" title="Creditor Dashboard" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.nav} />
          <Text style={styles.loadingText}>Loading creditor position…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SubScreenHeader backLabel="Back" title="Creditor Dashboard" />

      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={T.nav}
            />
          }
        >
          <View style={styles.partyCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {partyname.trim().slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.partyInfo}>
              <Text style={styles.partyName} numberOfLines={2}>{partyname}</Text>
              <Text style={styles.partyMeta}>
                Code {partycode} · As on {position?.as_on_date || data?.context?.as_on_date || date}
              </Text>
              <Text style={styles.partyMeta}>
                Properties {(data?.context?.prpcodes || []).join(', ') || '—'}
              </Text>
            </View>
          </View>

          {error ? (
            <TouchableOpacity style={styles.errorCard} onPress={() => void load(false)}>
              <Text style={styles.errorTitle}>Could not refresh dashboard</Text>
              <Text style={styles.errorText}>{error} Tap to retry.</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.hero}>
            <Text style={styles.heroLabel}>NET PAYABLE</Text>
            <Text style={styles.heroAmount}>{money(finalPosition.net_payable_amount)}</Text>
            <Text style={styles.heroHint}>Total bills less available on-account balance</Text>

            <View style={styles.heroDivider} />

            <View style={styles.metricRow}>
              <Metric label="TOTAL BILLS" value={money(finalPosition.bill_amount)} light />
              <Metric label="ON ACCOUNT" value={money(finalPosition.on_account_amount)} light />
            </View>

            <View style={styles.positionStrip}>
              <Text style={styles.positionText}>Opening {money(opening.net_amount)}</Text>
              <Text style={styles.positionDot}>•</Text>
              <Text style={styles.positionText}>Current FY {money(currentFy.net_amount)}</Text>
            </View>
          </View>

          <Section
            title="Purchase Outstanding"
            subtitle="Open purchase bills only — not total creditor payable"
          >
            <View style={styles.bigRow}>
              <View>
                <Text style={styles.bigAmount}>{money(outstanding.outstanding_amount)}</Text>
                <Text style={styles.muted}>{Number(outstanding.bill_count || 0)} open bills</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>OPEN</Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <Metric label="ORIGINAL" value={money(outstanding.original_amount)} />
              <Metric
                label="BROUGHT FORWARD"
                value={`${Number(outstanding.brought_forward_source_count || 0)} bills`}
              />
            </View>

            {(data?.outstanding?.ageing || [])
              .filter((row: any) => Number(row?.outstanding_amount || 0) > 0)
              .map((row: any) => (
                <View key={row.key} style={styles.lineRow}>
                  <Text style={styles.lineLabel}>{row.label} days</Text>
                  <Text style={styles.lineValue}>{money(row.outstanding_amount)}</Text>
                </View>
              ))}
          </Section>

          <Section title="Payments" subtitle="Payment activity and adjustment position">
            <View style={styles.metricRow}>
              <Metric label="PAID" value={money(payment.payment_amount)} />
              <Metric label="CLEARED" value={money(payment.cleared_amount)} />
            </View>
            <View style={styles.metricRow}>
              <Metric label="ON ACCOUNT" value={money(payment.on_account_amount)} />
              <Metric label="TO CLEAR" value={money(payment.to_clear_amount)} />
            </View>
            <View style={styles.lineRow}>
              <Text style={styles.lineLabel}>Adjusted to bills</Text>
              <Text style={styles.lineValue}>{money(payment.allocated_amount)}</Text>
            </View>
            <View style={styles.lineRow}>
              <Text style={styles.lineLabel}>Unadjusted payments</Text>
              <Text style={styles.lineValue}>
                {Number(payment.unadjusted_count || 0)} payments
              </Text>
            </View>
          </Section>

          <Section title="Purchase Orders" subtitle="Ordered vs received">
            <View style={styles.metricRow}>
              <Metric
                label="ORDERED QTY"
                value={Number(po.ordered_qty || 0).toLocaleString('en-IN')}
              />
              <Metric
                label="RECEIVED QTY"
                value={Number(po.received_qty || 0).toLocaleString('en-IN')}
              />
            </View>
            <Progress value={po.received_qty} total={po.ordered_qty} />
            <View style={styles.metricRow}>
              <Metric
                label="PENDING QTY"
                value={Number(po.pending_qty || 0).toLocaleString('en-IN')}
              />
              <Metric label="PENDING VALUE" value={money(po.pending_value)} />
            </View>
          </Section>

          <Section title="Purchases" subtitle="Last 6 months · inward date">
            <View style={styles.bigRow}>
              <View>
                <Text style={styles.bigAmount}>{money(sixMonthPurchase)}</Text>
                <Text style={styles.muted}>6-month purchase value</Text>
              </View>
              <View>
                <Text style={styles.rightLabel}>THIS MONTH</Text>
                <Text style={styles.rightValue}>
                  {money(data?.purchase?.current_month?.value)}
                </Text>
              </View>
            </View>

            {months.map((month: any) => (
              <View key={month.ym} style={styles.monthRow}>
                <Text style={styles.monthLabel}>{month.label}</Text>
                <Text style={styles.monthBills}>{Number(month.bill_count || 0)} bills</Text>
                <Text style={styles.monthValue}>{money(month.value)}</Text>
              </View>
            ))}
          </Section>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Payable calculation</Text>
            <Text style={styles.infoText}>
              Opening carried-forward accounting plus current financial-year accounting.
              Purchase Outstanding is shown separately because it represents purchase bills only.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  safe: { flex: 1 },
  content: { padding: 14, paddingBottom: 34, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: T.muted, fontSize: 12, fontWeight: '600' },

  partyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: T.nav,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  partyInfo: { flex: 1 },
  partyName: { color: T.ink, fontSize: 16, fontWeight: '900' },
  partyMeta: { marginTop: 3, color: T.muted, fontSize: 10, fontWeight: '600' },

  errorCard: {
    backgroundColor: '#FFF3F1',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#F3C2BC',
  },
  errorTitle: { color: '#A63A2B', fontSize: 12, fontWeight: '900' },
  errorText: { color: '#8A5149', fontSize: 10, marginTop: 3 },

  hero: { backgroundColor: T.nav, borderRadius: 20, padding: 18 },
  heroLabel: {
    color: 'rgba(255,255,255,.72)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroAmount: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 5 },
  heroHint: { color: 'rgba(255,255,255,.70)', fontSize: 10, marginTop: 4 },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,.16)',
    marginVertical: 14,
  },

  metricRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  metric: { flex: 1, minWidth: 0 },
  metricLabel: {
    color: T.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  metricValue: { color: T.ink, fontSize: 14, fontWeight: '900', marginTop: 4 },
  metricLabelLight: { color: 'rgba(255,255,255,.65)' },
  metricValueLight: { color: '#fff' },

  positionStrip: {
    marginTop: 14,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  positionText: { color: 'rgba(255,255,255,.82)', fontSize: 10, fontWeight: '700' },
  positionDot: { color: 'rgba(255,255,255,.45)' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 17,
    padding: 15,
    borderWidth: 1,
    borderColor: T.border,
  },
  sectionTitle: { color: T.ink, fontSize: 14, fontWeight: '900' },
  sectionSubtitle: { color: T.muted, fontSize: 9, fontWeight: '600', marginTop: 2 },

  bigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  bigAmount: { color: T.ink, fontSize: 21, fontWeight: '900' },
  muted: { color: T.muted, fontSize: 9, marginTop: 3, fontWeight: '600' },
  badge: {
    backgroundColor: '#FFF1E5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { color: '#A9570B', fontSize: 8, fontWeight: '900' },

  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  lineLabel: { color: T.muted, fontSize: 10, fontWeight: '700' },
  lineValue: { color: T.ink, fontSize: 11, fontWeight: '900' },

  progressTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: T.border,
    overflow: 'hidden',
    marginTop: 13,
  },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: T.nav },

  rightLabel: { textAlign: 'right', color: T.muted, fontSize: 8, fontWeight: '900' },
  rightValue: {
    textAlign: 'right',
    color: T.ink,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },

  monthRow: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: T.border,
    marginTop: 8,
    paddingTop: 8,
  },
  monthLabel: { width: 75, color: T.ink, fontSize: 10, fontWeight: '800' },
  monthBills: { flex: 1, color: T.muted, fontSize: 9, fontWeight: '600' },
  monthValue: { color: T.ink, fontSize: 10, fontWeight: '900' },

  infoCard: { backgroundColor: '#F3F7FA', borderRadius: 14, padding: 13 },
  infoTitle: { color: T.ink, fontSize: 10, fontWeight: '900' },
  infoText: { color: T.muted, fontSize: 9, lineHeight: 14, marginTop: 4 },
});
