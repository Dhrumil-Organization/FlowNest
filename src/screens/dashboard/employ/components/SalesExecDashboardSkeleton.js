import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { COLORS } from './SharedComponents';

// ─── Single shimmer bone ──────────────────────────────────────────────────────
const ShimmerBone = ({ style, shimmerAnim }) => {
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-350, 350],
  });

  return (
    <View style={[styles.bone, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.shimmerOverlay,
          { transform: [{ translateX }] },
        ]}
      />
    </View>
  );
};

// ─── Summary Card Skeleton ────────────────────────────────────────────────────
const SummaryCardSkeleton = ({ shimmerAnim }) => (
  <View style={styles.summaryCard}>
    <ShimmerBone shimmerAnim={shimmerAnim} style={styles.summaryLabel} />
    <ShimmerBone shimmerAnim={shimmerAnim} style={styles.summaryValue} />
  </View>
);

// ─── Section Card Skeleton ────────────────────────────────────────────────────
const SectionSkeleton = ({ shimmerAnim, rowCount = 3, showChart = true, showProgress = false }) => (
  <View style={styles.card}>
    {/* Header */}
    <View style={styles.headerRow}>
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.headerIcon} />
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.headerTitle} />
    </View>

    {/* Total Row */}
    <View style={styles.totalRow}>
      <View style={styles.totalCell}>
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.totalLabel} />
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.totalValue} />
      </View>
      <View style={styles.totalCell}>
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.totalLabel} />
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.totalValue} />
      </View>
    </View>

    {/* Chart Area */}
    {showChart && (
      <View style={styles.chartArea}>
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.chartLabel} />
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.chartBar} />
        <View style={styles.axisRow}>
          {[...Array(6)].map((_, i) => (
            <ShimmerBone
              key={i}
              shimmerAnim={shimmerAnim}
              style={styles.axisLabel}
            />
          ))}
        </View>
      </View>
    )}

    {/* Progress Bar (for Payment Collection) */}
    {showProgress && (
      <View style={styles.progressWrap}>
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.progressBar} />
        <View style={styles.progressLabels}>
          <ShimmerBone shimmerAnim={shimmerAnim} style={styles.progressLabel} />
          <ShimmerBone shimmerAnim={shimmerAnim} style={styles.progressLabel} />
        </View>
      </View>
    )}

    {/* Subheader */}
    <ShimmerBone shimmerAnim={shimmerAnim} style={styles.subHeader} />

    {/* Column Header */}
    <View style={styles.colHeaderRow}>
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.colHead1} />
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.colHead2} />
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.colHead3} />
    </View>

    {/* Data Rows */}
    {[...Array(rowCount)].map((_, i) => (
      <View key={i} style={styles.dataRow}>
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.rankDot} />
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.rowName} />
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.rowVal} />
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.rowVal} />
      </View>
    ))}
  </View>
);

// ─── Profile Card Skeleton ────────────────────────────────────────────────────
const ProfileCardSkeleton = ({ shimmerAnim }) => (
  <View style={[styles.card, styles.profileCard]}>
    <View style={styles.profileTop}>
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.avatar} />
      <View style={styles.profileInfo}>
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.profileName} />
        <ShimmerBone shimmerAnim={shimmerAnim} style={styles.profileSub} />
      </View>
    </View>
    <View style={styles.summaryRow}>
      <SummaryCardSkeleton shimmerAnim={shimmerAnim} />
      <SummaryCardSkeleton shimmerAnim={shimmerAnim} />
      <SummaryCardSkeleton shimmerAnim={shimmerAnim} />
    </View>
  </View>
);

// ─── Main Skeleton ────────────────────────────────────────────────────────────
export default function SalesExecDashboardSkeleton({ showProfile = true }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        scrollEnabled={false}
      >
        {showProfile && (
          <>
            {/* Breadcrumb Skeleton */}
            <View style={styles.breadcrumb}>
              <ShimmerBone shimmerAnim={shimmerAnim} style={styles.breadcrumbText} />
              <ShimmerBone shimmerAnim={shimmerAnim} style={styles.breadcrumbSep} />
              <ShimmerBone
                shimmerAnim={shimmerAnim}
                style={[styles.breadcrumbText, styles.breadcrumbActive]}
              />
              <ShimmerBone shimmerAnim={shimmerAnim} style={styles.breadcrumbHelp} />
            </View>

            {/* Profile Card Skeleton */}
            <ProfileCardSkeleton shimmerAnim={shimmerAnim} />
          </>
        )}

        {/* Sales Section Skeleton */}
        <SectionSkeleton shimmerAnim={shimmerAnim} rowCount={4} showChart={true} />

        {/* Payment Collection Section Skeleton */}
        <SectionSkeleton shimmerAnim={shimmerAnim} rowCount={4} showChart={true} showProgress={true} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingTop: 10, paddingBottom: 24 },

  // ── Shimmer base bone ──
  bone: {
    backgroundColor: '#E8EAED',
    borderRadius: 6,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.65)',
    transform: [{ skewX: '-20deg' }],
  },

  // ── Breadcrumb ──
  breadcrumb: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#E8EDF2',
    alignItems: 'center',
  },
  breadcrumbText: { width: 60, height: 12, borderRadius: 4, marginHorizontal: 4 },
  breadcrumbSep: { width: 10, height: 12, borderRadius: 4, marginHorizontal: 4 },
  breadcrumbActive: { color: COLORS.primary, fontWeight: '600' },
  breadcrumbHelp: { width: 20, height: 20, borderRadius: 10 },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 14,
    paddingBottom: 10,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  profileCard: { marginBottom: 12 },

  // ── Profile Top ──
  profileTop: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { width: '60%', height: 16, borderRadius: 4, marginBottom: 4 },
  profileSub: { width: '40%', height: 12, borderRadius: 4 },

  // ── Summary Row ──
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  summaryCard: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  summaryLabel: { width: 60, height: 10, borderRadius: 3, marginBottom: 4 },
  summaryValue: { width: 70, height: 18, borderRadius: 4 },

  // ── Section Header ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingBottom: 10,
    backgroundColor: '#F5F6F8',
  },
  headerIcon: { width: 22, height: 22, borderRadius: 4 },
  headerTitle: { flex: 1, height: 14, borderRadius: 4 },

  // ── Total Row ──
  totalRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 20,
  },
  totalCell: { flex: 1, gap: 6 },
  totalLabel: { width: 50, height: 10, borderRadius: 3 },
  totalValue: { width: '80%', height: 22, borderRadius: 5 },

  // ── Chart Area ──
  chartArea: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 6,
  },
  chartLabel: { width: 80, height: 9, borderRadius: 3, marginLeft: 4 },
  chartBar: { height: 50, borderRadius: 6 },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  axisLabel: { width: 20, height: 9, borderRadius: 3 },

  // ── Progress Bar ──
  progressWrap: { paddingTop: 4, paddingHorizontal: 14 },
  progressBar: { height: 8, borderRadius: 4, width: '100%' },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabel: { width: 80, height: 10, borderRadius: 3 },

  // ── Subheader ──
  subHeader: { width: 120, height: 10, borderRadius: 3, marginHorizontal: 14, marginVertical: 6 },

  // ── Column Header ──
  colHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  colHead1: { flex: 1, height: 10, borderRadius: 3 },
  colHead2: { width: 60, height: 10, borderRadius: 3 },
  colHead3: { width: 60, height: 10, borderRadius: 3 },

  // ── Data Rows ──
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  rankDot: { width: 24, height: 24, borderRadius: 12 },
  rowName: { flex: 1, height: 13, borderRadius: 4 },
  rowVal: { width: 60, height: 13, borderRadius: 4 },
});