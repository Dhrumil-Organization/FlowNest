import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type DashboardAmountMode = 'compact' | 'actual';

const STORAGE_KEY = 'dashboard_amount_display_mode_v2';
let globalMode: DashboardAmountMode = 'compact';
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
const listeners = new Set<(mode: DashboardAmountMode) => void>();

const notify = () => {
  listeners.forEach((listener) => listener(globalMode));
};

const hydrate = async () => {
  if (hydrated) return;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = AsyncStorage.getItem(STORAGE_KEY)
    .then((stored) => {
      if (stored === 'actual' || stored === 'compact') {
        globalMode = stored;
      }
    })
    .catch(() => {
      // A display preference must never block dashboard/report loading.
    })
    .finally(() => {
      hydrated = true;
      hydrationPromise = null;
      notify();
    });

  return hydrationPromise;
};

const setGlobalMode = (next: DashboardAmountMode) => {
  globalMode = next;
  hydrated = true;
  notify();
  void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
    // Keep the current in-memory choice even when local persistence fails.
  });
};

const asNumber = (value: number | string | null | undefined): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const formatCompactAmount = (
  value: number | string | null | undefined,
  precision = 2,
): string => {
  const n = asNumber(value);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(precision)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(precision)} L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)} K`;

  return `${sign}₹${abs.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}`;
};

export const formatActualAmount = (
  value: number | string | null | undefined,
  exactValue?: string | null,
  precision = 2,
): string => {
  const source = exactValue != null && String(exactValue).trim() !== ''
    ? String(exactValue).trim()
    : value;
  const n = asNumber(source);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  return `${sign}₹${abs.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}`;
};

export const formatSummaryAmount = (
  value: number | string | null | undefined,
  mode: DashboardAmountMode,
  exactValue?: string | null,
  precision = 2,
): string => mode === 'actual'
  ? formatActualAmount(value, exactValue, precision)
  : formatCompactAmount(value, precision);

// Alias used by dashboard/detail screens. The selected mode applies to every
// monetary value on those screens, not only to the top summary card.
export const formatDashboardAmount = formatSummaryAmount;

export function useDashboardAmountMode() {
  const [mode, setModeState] = useState<DashboardAmountMode>(globalMode);

  useEffect(() => {
    const listener = (next: DashboardAmountMode) => setModeState(next);
    listeners.add(listener);
    setModeState(globalMode);
    void hydrate();

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setMode = useCallback((next: DashboardAmountMode) => {
    setGlobalMode(next);
  }, []);

  return { mode, setMode };
}

export function AmountDisplayModeControl({
  mode,
  onChange,
  compact = false,
}: {
  mode: DashboardAmountMode;
  onChange: (mode: DashboardAmountMode) => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!compact && (
        <View style={styles.copy}>
          <Text style={styles.label}>AMOUNT DISPLAY</Text>
          <Text style={styles.help}>Applies to every monetary value across dashboard reports</Text>
        </View>
      )}

      <View style={[styles.segmented, compact && styles.segmentedCompact]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'compact' }}
          activeOpacity={0.75}
          onPress={() => onChange('compact')}
          style={[styles.segment, compact && styles.segmentCompact, mode === 'compact' && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, mode === 'compact' && styles.segmentTextActive]}>
            Compact
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'actual' }}
          activeOpacity={0.75}
          onPress={() => onChange('actual')}
          style={[styles.segment, compact && styles.segmentCompact, mode === 'actual' && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, mode === 'actual' && styles.segmentTextActive]}>
            Actual
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDD6CF',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  wrapCompact: {
    minHeight: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  copy: { flex: 1, minWidth: 0 },
  label: {
    color: '#786E65',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  help: {
    marginTop: 2,
    color: '#9A9189',
    fontSize: 8,
    lineHeight: 11,
  },
  segmented: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 10,
    backgroundColor: '#EEEAE6',
  },
  segmentedCompact: {
    alignSelf: 'flex-end',
  },
  segment: {
    minWidth: 62,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentCompact: {
    minWidth: 58,
    height: 28,
    paddingHorizontal: 8,
  },
  segmentActive: {
    backgroundColor: '#0C1F31',
  },
  segmentText: {
    color: '#766B62',
    fontSize: 9,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
});
