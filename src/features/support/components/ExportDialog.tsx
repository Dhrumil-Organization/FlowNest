// FILE: src/features/support/components/ExportDialog.tsx
// "Excel" — choose the period (today / this week / this month / last month / this year / all /
// any range), what to include and the layout, then the server builds the file:
//   Daily (like the IT sheet)  coloured date row, then that day's work — green in progress,
//                              orange testing, yellow done — plus a Summary sheet
//   Simple list                one row per card, date on every row (easy to filter / pivot)
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { addDaysYmd, fmtYmdFull, Period, periodFor, periodLabel, periodParams, shiftPeriod, toYmd } from '../model';
import { Btn, DateInput, Dialog, Field, Segmented } from './ui';

export type ExportChoice = { params: Record<string, string>; label: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  onExport: (c: ExportChoice) => void;
  busy?: boolean;
  /** IT Desk: kind + layout choice and the board filters; users: period only */
  realm: 'it' | 'client';
  /** the period on screen (History) — offered first */
  current?: Period | null;
  filterCount?: number;
  kind?: string;
};

type Pick = 'current' | 'today' | 'week' | 'month' | 'last_month' | 'year' | 'all' | 'range';

const weekStart = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return toYmd(d); };

export function ExportDialog({ visible, onClose, onExport, busy, realm, current, filterCount = 0, kind = '' }: Props) {
  const [pick, setPick] = useState<Pick>('month');
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const [k, setK] = useState(kind);
  const [layout, setLayout] = useState<'daily' | 'list'>('daily');
  const [useFilters, setUseFilters] = useState<'yes' | 'no'>('yes');

  useEffect(() => {
    if (!visible) return;
    setPick(current ? 'current' : 'month');
    setFrom(Number(String(toYmd(new Date())).slice(0, 6) + '01'));
    setTo(toYmd(new Date()));
    setK(kind);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const period = (): Period => {
    switch (pick) {
      case 'current': return current || periodFor('month');
      case 'today': return periodFor('day');
      case 'week': return { mode: 'range', from: weekStart(), to: toYmd(new Date()) };
      case 'last_month': return shiftPeriod(periodFor('month'), -1);
      case 'year': return periodFor('year');
      case 'all': return periodFor('all');
      case 'range': return { mode: 'range', from: Math.min(from || addDaysYmd(-30), to || toYmd(new Date())), to: Math.max(from || 0, to || toYmd(new Date())) };
      default: return periodFor('month');
    }
  };
  const p = period();
  const opts: { value: Pick; label: string }[] = [
    ...(current ? [{ value: 'current' as Pick, label: `On screen: ${periodLabel(current)}` }] : []),
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
    { value: 'year', label: 'This year' },
    { value: 'all', label: 'All' },
    { value: 'range', label: 'Choose dates' },
  ];

  const go = () => {
    const params: Record<string, string> = { ...periodParams(p) };
    if (realm === 'it') {
      if (k) params.kind = k;
      params.layout = layout;
      params.__filters = useFilters;
    }
    onExport({ params, label: periodLabel(p) });
  };

  return (
    <Dialog visible={visible} onClose={onClose} title="Download Excel" width={520}
      footer={<><Btn title="Cancel" kind="ghost" onPress={onClose} /><Btn title="Download" icon="file-download" kind="success" busy={busy} onPress={go} /></>}>
      <Field label="Period">
        <Segmented value={pick} onChange={setPick} scroll options={opts} />
        {pick === 'range' ? (
          <View style={x.row}>
            <View style={{ flex: 1 }}><DateInput value={from} onChange={setFrom} title="From" placeholder="From" clearable={false} /></View>
            <View style={{ flex: 1 }}><DateInput value={to} onChange={setTo} title="To" placeholder="To" clearable={false} /></View>
          </View>
        ) : null}
        <View style={x.sum}>
          <Icon name="date-range" size={15} color={T.copper} />
          <Text style={x.sumText}>{p.mode === 'all' ? 'Every date' : p.from === p.to ? fmtYmdFull(p.from) : `${fmtYmdFull(p.from)} to ${fmtYmdFull(p.to)}`}</Text>
        </View>
      </Field>
      {realm === 'it' ? (
        <>
          <Field label="Include">
            <Segmented value={k} onChange={setK} scroll options={[{ value: '', label: 'Everything' }, { value: 'task', label: 'IT tasks', icon: 'task-alt' }, { value: 'ticket', label: 'User tickets', icon: 'confirmation-number' }]} />
          </Field>
          <Field label="Layout" hint={layout === 'daily' ? 'Like your sheet: date row, then that day\'s work (green = in progress, orange = testing, yellow = done) + Summary sheet with hours per person.' : 'One row per card with the date on every row — easy to filter and pivot.'}>
            <Segmented value={layout} onChange={setLayout} scroll options={[{ value: 'daily', label: 'Daily (like your sheet)', icon: 'calendar-view-day' }, { value: 'list', label: 'Simple list', icon: 'table-rows' }]} />
          </Field>
          {filterCount ? (
            <Field label={`Board filters (${filterCount} on)`}>
              <Segmented value={useFilters} onChange={setUseFilters} options={[{ value: 'yes', label: 'Apply them' }, { value: 'no', label: 'Ignore — export everything' }]} />
            </Field>
          ) : null}
        </>
      ) : null}
    </Dialog>
  );
}

const x = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sum: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  sumText: { fontSize: 12.5, fontWeight: '800', color: T.nav },
});
