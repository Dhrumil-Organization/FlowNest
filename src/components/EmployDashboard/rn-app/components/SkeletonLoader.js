// components/SkeletonLoader.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from './SharedComponents';

const SkeletonLoader = () => {
  return (
    <View style={styles.container}>
      {/* Sales Section Skeleton */}
      <View style={styles.section}>
        <View style={styles.sectionHeader} />
        <View style={styles.totalRow} />
        <View style={styles.chartPlaceholder} />
        <View style={styles.row} />
        <View style={styles.row} />
        <View style={styles.row} />
      </View>

      {/* Production Section Skeleton */}
      <View style={styles.section}>
        <View style={styles.sectionHeader} />
        <View style={styles.totalRow} />
        <View style={styles.chartPlaceholder} />
        <View style={styles.row} />
        <View style={styles.row} />
      </View>

      {/* Collection Section Skeleton */}
      <View style={styles.section}>
        <View style={styles.sectionHeader} />
        <View style={styles.totalRow} />
        <View style={styles.chartPlaceholder} />
        <View style={styles.row} />
        <View style={styles.row} />
      </View>

      {/* Outstanding Section Skeleton */}
      <View style={styles.section}>
        <View style={styles.sectionHeader} />
        <View style={styles.totalRow} />
        <View style={styles.row} />
        <View style={styles.row} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.bg,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  sectionHeader: {
    height: 40,
    width: '60%',
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 12,
  },
  totalRow: {
    height: 40,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 12,
  },
  chartPlaceholder: {
    height: 70,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 12,
  },
  row: {
    height: 50,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 8,
  },
});

export default SkeletonLoader;