import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { S, T } from '../../theme';

export function DashboardSection({ title, tone = 'navy', action, onAction, children }: {
  title: string;
  tone?: 'navy' | 'blue' | 'purple' | 'orange' | 'green';
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { backgroundColor: toneMap[tone] }]}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={action} activeOpacity={0.78} onPress={onAction} hitSlop={10}>
            <Text style={styles.sectionAction}>{action} ›</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function ProgressBar({ value, tone = 'green', accessibilityLabel = 'Progress' }: {
  value: number;
  tone?: 'green' | 'orange' | 'blue';
  accessibilityLabel?: string;
}) {
  const safe = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0;
  const width = `${safe}%` as `${number}%`;
  const color = tone === 'orange' ? T.copper : tone === 'blue' ? T.yd : T.green;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: 0, max: 100, now: Math.round(safe) }} style={styles.track}>
      <View style={[styles.fill, { width, backgroundColor: color }]} />
    </View>
  );
}

export function MetricCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <View style={styles.metricCell}><Text style={styles.metricLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, accent && { color: T.copper }]}>{value}</Text></View>;
}

export function EmptyState({ message, title = 'No data available' }: { message: string; title?: string }) {
  return <View style={styles.emptyWrap}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{message}</Text></View>;
}

export function ReportState({ loading, error, empty, onRetry, loadingText = 'Loading report…', emptyText = 'No records are available for the selected period.' }: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  onRetry?: () => void;
  loadingText?: string;
  emptyText?: string;
}) {
  if (loading) return <View style={styles.state}><ActivityIndicator size="large" color={T.nav} /><Text style={styles.stateText}>{loadingText}</Text></View>;
  if (error) return <View style={styles.state}><Text style={styles.errorTitle}>Unable to load report</Text><Text style={styles.stateText}>{error}</Text>{onRetry ? <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Retry</Text></TouchableOpacity> : null}</View>;
  if (empty) return <View style={styles.state}><Text style={styles.emptyTitle}>No records found</Text><Text style={styles.stateText}>{emptyText}</Text></View>;
  return null;
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return <View accessibilityLabel="Loading report rows">{Array.from({ length: count }).map((_, index) => <View key={index} style={styles.skeletonRow}><View style={styles.skeletonAvatar} /><View style={styles.skeletonMain}><View style={[styles.skeletonLine, { width: index % 2 ? '58%' : '72%' }]} /><View style={[styles.skeletonLineSmall, { width: index % 2 ? '38%' : '46%' }]} /></View><View style={styles.skeletonAmount} /></View>)}</View>;
}

export function UpdatedPill({ date }: { date?: Date | null }) {
  if (!date) return null;
  const label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return <View style={styles.updated}><View style={styles.updatedDot} /><Text style={styles.updatedText}>Updated {label}</Text></View>;
}

const toneMap = { navy: T.nav, blue: T.yd, purple: T.purple, orange: T.copper, green: T.green };
const styles = StyleSheet.create({
  section: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 14, ...S.card },
  sectionHeader: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
  sectionAction: { color: '#fff', fontSize: 11, fontWeight: '800', opacity: 0.92 },
  sectionBody: { padding: 14 },
  track: { height: 7, borderRadius: 999, backgroundColor: T.alt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  metricCell: { flex: 1, minWidth: 110 },
  metricLabel: { color: T.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  metricValue: { color: T.ink, fontSize: 17, fontWeight: '900', marginTop: 3 },
  emptyWrap: { paddingVertical: 20, alignItems: 'center' },
  emptyTitle: { color: T.ink, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: T.muted, fontSize: 12, textAlign: 'center', marginTop: 5, lineHeight: 18 },
  state: { minHeight: 180, padding: 24, alignItems: 'center', justifyContent: 'center' },
  stateText: { color: T.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 9 },
  errorTitle: { color: T.red, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  retry: { marginTop: 14, minWidth: 108, minHeight: 40, backgroundColor: T.nav, paddingHorizontal: 16, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  skeletonRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.hair, paddingHorizontal: 13 },
  skeletonAvatar: { width: 31, height: 31, borderRadius: 16, backgroundColor: T.alt },
  skeletonMain: { flex: 1, marginLeft: 11 },
  skeletonLine: { height: 10, borderRadius: 6, backgroundColor: T.alt },
  skeletonLineSmall: { height: 7, borderRadius: 5, backgroundColor: T.hair, marginTop: 8 },
  skeletonAmount: { width: 58, height: 18, borderRadius: 7, backgroundColor: T.alt, marginLeft: 12 },
  updated: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.alt, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  updatedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.green },
  updatedText: { color: T.muted, fontSize: 8, fontWeight: '800' },
});
