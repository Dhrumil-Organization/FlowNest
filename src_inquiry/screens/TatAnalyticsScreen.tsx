import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontSize, radius, spacing } from '../utils/theme';
import { RootStackParamList, TatAnalytics } from '../types';
import { tatApi } from '../services/tatApi';
import EmptyState from '../components/EmptyState';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentFinancialYear } from '../../common/commonfunction';

type Props = NativeStackScreenProps<RootStackParamList, 'TatAnalytics'>;

const formatHours = (h: number): string => {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(1)} hrs`;
  return `${(h / 24).toFixed(1)} days`;
};

const TatAnalyticsScreen: React.FC<Props> = ({ username }) => {
  const [rows, setRows] = useState<TatAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [getUserPrptype, setUserPrptype] = useState<string>('');

  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        console.log('user_prptype', user_prptype);
        setUserPrptype(user_prptype);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await tatApi.analytics({ prptype: getUserPrptype, yearno: getCurrentFinancialYear() });
        setRows(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [getUserPrptype]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No TAT data yet"
        subtitle="Complete some inquiries to see analytics"
      />
    );
  }

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'TAT Performance'}
        subHeader={'Analytics based on completed step events'}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

        {/* <Text style={styles.header}>TAT Performance</Text>
        <Text style={styles.subHeader}>
          Analytics based on completed step events
        </Text> */}

        {rows.map(row => {
          const breachColor =
            row.breach_percent > 25
              ? colors.tatBreached
              : row.breach_percent > 10
                ? colors.tatWarning
                : colors.tatOnTime;

          return (
            <View key={row.step_code} style={styles.card}>
              <Text style={styles.stepName}>{row.step_name}</Text>
              <Text style={styles.totalCount}>
                {row.total_completed} completed
              </Text>

              {/* Distribution bar */}
              <View style={styles.distributionBar}>
                {row.on_time > 0 ? (
                  <View
                    style={{
                      flex: row.on_time,
                      backgroundColor: colors.tatOnTime,
                    }}
                  />
                ) : null}
                {row.warning > 0 ? (
                  <View
                    style={{ flex: row.warning, backgroundColor: colors.tatWarning }}
                  />
                ) : null}
                {row.breached > 0 ? (
                  <View
                    style={{
                      flex: row.breached,
                      backgroundColor: colors.tatBreached,
                    }}
                  />
                ) : null}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: colors.tatOnTime }]}
                  />
                  <Text style={styles.legendText}>On Time: {row.on_time}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: colors.tatWarning }]}
                  />
                  <Text style={styles.legendText}>Warning: {row.warning}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: colors.tatBreached }]}
                  />
                  <Text style={styles.legendText}>Breached: {row.breached}</Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Breach %</Text>
                  <Text style={[styles.statValue, { color: breachColor }]}>
                    {row.breach_percent.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Avg Time</Text>
                  <Text style={styles.statValue}>
                    {formatHours(row.avg_actual_hours)}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Avg Variance</Text>
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          row.avg_variance_hours > 0
                            ? colors.tatBreached
                            : colors.tatOnTime,
                      },
                    ]}>
                    {row.avg_variance_hours > 0 ? '+' : ''}
                    {row.avg_variance_hours.toFixed(1)}h
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    fontSize: fontSize.xl,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  subHeader: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stepName: { fontSize: fontSize.base, fontWeight: '500', color: colors.textPrimary },
  totalCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  distributionBar: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: fontSize.xs, color: colors.textSecondary },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
  },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: 2,
  },
});

export default TatAnalyticsScreen;
