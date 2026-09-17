// components/DashboardSkeleton.js
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

// ─── Section card skeleton ────────────────────────────────────────────────────
const SectionSkeleton = ({ shimmerAnim, rowCount = 3, showChart = true }) => (
  <View style={styles.card}>
    {/* Header */}
    <View style={styles.headerRow}>
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.headerIcon} />
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.headerTitle} />
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.headerDate} />
    </View>

    {/* Total row */}
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

    {/* Chart area */}
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

    {/* Col header */}
    <View style={styles.colHeaderRow}>
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.colHead1} />
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.colHead2} />
      <ShimmerBone shimmerAnim={shimmerAnim} style={styles.colHead3} />
    </View>

    {/* Data rows */}
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

// ─── Main skeleton ────────────────────────────────────────────────────────────
export default function DashboardSkeleton() {
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
        {/* Date bar skeleton */}
        <View style={styles.dateBar}>
          <ShimmerBone shimmerAnim={shimmerAnim} style={styles.dateBtn} />
          <View style={styles.dateBarRight}>
            <ShimmerBone shimmerAnim={shimmerAnim} style={styles.refreshBtn} />
            <ShimmerBone shimmerAnim={shimmerAnim} style={styles.helpBtn} />
          </View>
        </View>

        {/* Sales */}
        <SectionSkeleton shimmerAnim={shimmerAnim} rowCount={3} />

        {/* Production */}
        <SectionSkeleton shimmerAnim={shimmerAnim} rowCount={3} />

        {/* Collection */}
        <SectionSkeleton shimmerAnim={shimmerAnim} rowCount={3} />

        {/* Outstanding — no chart */}
        <SectionSkeleton shimmerAnim={shimmerAnim} rowCount={3} showChart={false} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 24 },

  // ── Shimmer base bone ──
  bone: {
    backgroundColor: '#E8EAED',
    borderRadius: 6,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.65)',
    // skewed strip for the "shine" effect
    transform: [{ skewX: '-20deg' }],
  },

  // ── Date bar ──
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 6,
  },
  dateBtn: { width: 130, height: 36, borderRadius: 8 },
  dateBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshBtn: { width: 90, height: 36, borderRadius: 8 },
  helpBtn: { width: 34, height: 34, borderRadius: 17 },

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

  // ── Section header ──
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
  headerDate: { width: 70, height: 12, borderRadius: 4 },

  // ── Total row ──
  totalRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 20,
  },
  totalCell: { flex: 1, gap: 6 },
  totalLabel: { width: 50, height: 10, borderRadius: 3 },
  totalValue: { width: '80%', height: 22, borderRadius: 5 },

  // ── Chart area ──
  chartArea: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 6,
  },
  chartLabel: { width: 80, height: 9, borderRadius: 3, marginLeft: 4 },
  chartBar: { height: 55, borderRadius: 6 },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  axisLabel: { width: 20, height: 9, borderRadius: 3 },

  // ── Col header ──
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

  // ── Data rows ──
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
