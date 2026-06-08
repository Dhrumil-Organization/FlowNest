import React, { memo } from 'react';

import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
} from 'react-native';

import TrendGraph from './TrendGraph';
import CategoryList from './CategoryList';

import { DashboardData } from '../../common/type_emp_dash/dashboard';

import { Colors } from '../../common/theme_emp_dash/colors';
import { Shadows } from '../../common/theme_emp_dash/shadows';

interface Props {
  data: DashboardData;
}

const SalesCard = ({ data }: Props) => {
  const isDark =
    useColorScheme() === 'dark';

  const colors = isDark
    ? Colors.dark
    : Colors.light;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor:
            colors.card,
        },
        Shadows.card,
      ]}>
      {/* HEADER */}

      <View
        style={[
          styles.header,
          {
            backgroundColor:
              colors.primary,
          },
        ]}>
        <Text
          style={styles.headerTitle}>
          🪙 SALES
        </Text>

        <Text
          style={styles.time}>
          ↻ {data.updatedTime}
        </Text>
      </View>

      {/* SUMMARY */}

      <View style={styles.summary}>
        <Text
          style={[
            styles.totalText,
            {
              color: colors.text,
            },
          ]}>
          Total
        </Text>

        <Text
          style={[
            styles.tsValue,
            {
              color:
                colors.success,
            },
          ]}>
          TS {data.totals.ts}
        </Text>

        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                colors.divider,
            },
          ]}
        />

        <Text
          style={[
            styles.usValue,
            {
              color: colors.info,
            },
          ]}>
          US {data.totals.us}
        </Text>
      </View>

      {/* GRAPH */}

      <TrendGraph
        data={data.trend.data}
      />

      {/* CATEGORY */}

      <CategoryList
        categories={
          data.categories
        }
      />
    </View>
  );
};

export default memo(
  SalesCard,
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,

    overflow: 'hidden',

    marginHorizontal: 12,

    marginTop: 10,

    marginBottom: 20,
  },

  header: {
    height: 46,

    paddingHorizontal: 14,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  headerTitle: {
    color: '#FFFFFF',

    fontWeight: '700',

    fontSize: 14,

    letterSpacing: 0.5,
  },

  time: {
    color: '#FFFFFF',

    fontWeight: '600',

    fontSize: 11,
  },

  summary: {
    flexDirection: 'row',

    alignItems: 'center',

    height: 54,

    paddingHorizontal: 14,
  },

  totalText: {
    flex: 1,

    fontSize: 17,

    fontWeight: '700',
  },

  tsValue: {
    fontSize: 18,

    fontWeight: '700',
  },

  divider: {
    width: 1,

    height: 22,

    marginHorizontal: 24,
  },

  usValue: {
    fontSize: 18,

    fontWeight: '700',
  },
});