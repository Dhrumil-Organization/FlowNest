// FILE: src/features/support/components/PeriodBar.tsx
// Day · Month · Year · Range · All + ‹ November 2026 › — shared by History and the Team report.
import { T } from '@/src/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Period, PeriodMode, periodFor, periodHasNext, periodLabel, shiftPeriod, toYmd, ymdToDate } from '../model';
import { DateInput, IconBtn, Segmented, useLayout } from './ui';

export function PeriodBar({ period, onChange, right, allLabel = 'Everything, newest day first' }: {
  period: Period; onChange: (p: Period) => void; right?: React.ReactNode; allLabel?: string;
}) {
  const { phone } = useLayout();
  const changeMode = (mode: PeriodMode) => {
    if (mode === period.mode) return;
    const anchor = ymdToDate(Math.min(period.to || toYmd(new Date()), toYmd(new Date()))) || new Date();
    onChange(periodFor(mode, anchor));
  };
  return (
    <View style={[p.bar, phone && { flexDirection: 'column', alignItems: 'stretch' }]}>
      <Segmented value={period.mode} onChange={changeMode} scroll options={[
        { value: 'day', label: 'Day' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }, { value: 'range', label: 'Range' }, { value: 'all', label: 'All' },
      ]} />
      <View style={p.nav}>
        {period.mode === 'range' ? (
          <>
            <View style={{ flex: 1, minWidth: 130 }}><DateInput value={period.from} onChange={(v) => v && onChange({ ...period, from: Math.min(v, period.to) })} title="From" clearable={false} /></View>
            <View style={{ flex: 1, minWidth: 130 }}><DateInput value={period.to} onChange={(v) => v && onChange({ ...period, to: Math.max(v, period.from) })} title="To" clearable={false} /></View>
          </>
        ) : period.mode === 'all' ? (
          <Text style={[p.label, { flex: 1 }]}>{allLabel}</Text>
        ) : (
          <>
            <IconBtn icon="chevron-left" label="Previous" onPress={() => onChange(shiftPeriod(period, -1))} />
            <Text style={p.label} numberOfLines={1}>{periodLabel(period)}</Text>
            <IconBtn icon="chevron-right" label="Next" onPress={() => onChange(shiftPeriod(period, 1))} disabled={!periodHasNext(period)} />
            {periodHasNext(period) ? <TouchableOpacity onPress={() => onChange(periodFor(period.mode))} style={p.now}><Text style={p.nowText}>{period.mode === 'day' ? 'Today' : period.mode === 'month' ? 'This month' : 'This year'}</Text></TouchableOpacity> : null}
          </>
        )}
        {right}
      </View>
    </View>
  );
}

const p = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  nav: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 260, justifyContent: 'flex-end' },
  label: { fontSize: 15, fontWeight: '900', color: T.nav, minWidth: 120, textAlign: 'center' },
  now: { paddingHorizontal: 10, height: 30, borderRadius: 8, borderWidth: 1, borderColor: T.border, justifyContent: 'center', backgroundColor: T.surface },
  nowText: { fontSize: 12, fontWeight: '800', color: T.copper },
});
