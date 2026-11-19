// FILE: src/features/support/components/HistoryView.tsx
// HISTORY — every task / ticket ever, by day, month, year or any range (work date).
//   • ‹ November 2026 › to step back / forward; Day · Month · Year · Range · All
//   • totals of the period (cards, done, open, estimated and actual hours)
//   • year view: the 12 months with their counts (tap one to open it)
//   • the list is grouped by day like the IT Excel sheet: a date row with that day's exact
//     totals, then the day's work in the order it was added
//   • lazy (40 at a time, keyset) and virtualised — years of data stay smooth
//   • the same period goes to Excel with one tap
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useItDesk } from '../itStore';
import { dayName, devSideOf, fmtMinutes, fmtYmdFull, MONTHS_FULL, periodFor, periodLabel, statusOf, Ticket } from '../model';
import { PeriodBar } from './PeriodBar';
import { Avatar, Btn, Empty, MONO, StatusPill, useLayout } from './ui';

type Item = { k: string; day?: number; id?: number };

export function HistoryView({ onOpen, onExport }: { onOpen: (t: Ticket) => void; onExport: () => void }) {
  const { phone } = useLayout();
  const hist = useItDesk((s) => s.hist);
  const tickets = useItDesk((s) => s.tickets);
  const period = useItDesk((s) => s.period);
  const days = useItDesk((s) => s.histDays);
  const months = useItDesk((s) => s.histMonths);
  const stats = useItDesk((s) => s.histStats);
  const noMatch = useItDesk((s) => s.noMatch);
  const setPeriod = useItDesk((s) => s.setPeriod);
  const loadHistory = useItDesk((s) => s.loadHistory);

  // day rows between the cards
  const { items, sticky } = useMemo(() => {
    const out: Item[] = [];
    const st: number[] = [];
    let last = -1;
    for (const id of hist.ids) {
      const t = tickets[id];
      if (!t) continue;
      const d = t.work_date || 0;
      if (d !== last) { st.push(out.length + 1); out.push({ k: `d${d}`, day: d }); last = d; }
      out.push({ k: `t${id}`, id });
    }
    return { items: out, sticky: st };
  }, [hist.ids, tickets]);

  const loadedPerDay = useMemo(() => {
    const m: Record<number, number> = {};
    hist.ids.forEach((id) => { const d = tickets[id]?.work_date || 0; m[d] = (m[d] || 0) + 1; });
    return m;
  }, [hist.ids, tickets]);



  const header = (
    <View style={h.head}>
      <PeriodBar period={period} onChange={setPeriod} right={<Btn small kind="success" title={phone ? 'Excel' : 'Excel of this period'} icon="file-download" onPress={onExport} />} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={h.stats}>
        <Stat label="Cards" value={stats ? stats.total : '…'} color={T.nav} icon="layers" />
        <Stat label="Done" value={stats ? stats.done : '…'} color={T.green} icon="task-alt" />
        <Stat label="Open" value={stats ? stats.open : '…'} color={T.amber} icon="pending-actions" />
        <Stat label="User tickets" value={stats ? stats.tickets : '…'} color={T.copper} icon="confirmation-number" />
        <Stat label="Estimated" value={stats ? fmtMinutes(stats.est_min) || '0h' : '…'} color={T.blue} icon="timer" />
        <Stat label="Actual" value={stats ? fmtMinutes(stats.spent_min) || '0h' : '…'} color={T.purple} icon="schedule" />
      </ScrollView>

      {period.mode === 'year' && months.length ? (
        <View style={h.months}>
          {Array.from({ length: 12 }, (_, i) => {
            const y = Math.floor(period.from / 10000);
            const key = y * 100 + i + 1;
            const m = months.find((x) => x.key === key);
            return (
              <TouchableOpacity key={key} disabled={!m} onPress={() => setPeriod(periodFor('month', new Date(y, i, 1)))} style={[h.month, phone && { width: '31%' as any }, !m && { opacity: 0.45 }]} accessibilityRole="button">
                <Text style={h.monthName}>{MONTHS_FULL[i].slice(0, 3)}</Text>
                <Text style={h.monthNum}>{m ? m.total : 0}</Text>
                {m ? <View style={h.monthBar}><View style={[h.monthDone, { flex: m.done || 0.0001 }]} /><View style={{ flex: m.open || 0.0001 }} /></View> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );

  const renderItem = ({ item }: { item: Item }) => {
    if (item.day !== undefined) {
      const d = days[item.day];
      const n = d ? d.total : loadedPerDay[item.day] || 0;
      return (
        <View style={h.day}>
          <Icon name="event" size={15} color={T.nav} />
          <Text style={h.dayDate}>{fmtYmdFull(item.day)}</Text>
          <Text style={h.dayName}>{dayName(item.day)}</Text>
          <View style={{ flex: 1 }} />
          <Text style={h.dayInfo} numberOfLines={1}>
            {n} item{n === 1 ? '' : 's'}{d ? ` · ${d.done} done` : ''}{d && !phone && (d.est_min || d.spent_min) ? ` · est ${fmtMinutes(d.est_min) || '0h'} · actual ${fmtMinutes(d.spent_min) || '0h'}` : ''}
          </Text>
        </View>
      );
    }
    const t = item.id ? tickets[item.id] : null;
    return t ? <Row t={t} phone={phone} onOpen={onOpen} /> : null;
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(x) => x.k}
      ListHeaderComponent={header}
      stickyHeaderIndices={sticky}
      renderItem={renderItem}
      onEndReached={() => { void loadHistory(); }}
      onEndReachedThreshold={0.6}
      initialNumToRender={24}
      maxToRenderPerBatch={24}
      windowSize={11}
      contentContainerStyle={{ paddingBottom: 60 }}
      ListFooterComponent={hist.loading && (!hist.ids.length || hist.more) ? <ActivityIndicator color={T.copper} style={{ marginVertical: 18 }} /> : hist.error ? (
        <TouchableOpacity onPress={() => loadHistory()}><Text style={[h.more, { color: T.red }]}>{hist.error} · Retry</Text></TouchableOpacity>
      ) : hist.more ? <Text style={h.more}>Scroll for more…</Text> : items.length ? <Text style={h.more}>Start of {periodLabel(period)}</Text> : null}
      ListEmptyComponent={hist.loaded && !hist.loading ? <Empty icon={noMatch ? 'search-off' : 'event-busy'} title={noMatch ? 'No match' : 'Nothing in this period'} text={noMatch ? 'No card has these words.' : 'Try another day, month or year.'} /> : null}
    />
  );
}

function Stat({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  return (
    <View style={h.stat}>
      <Icon name={icon as any} size={16} color={color} />
      <View>
        <Text style={[h.statNum, { color }]}>{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</Text>
        <Text style={h.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Row({ t, phone, onOpen }: { t: Ticket; phone: boolean; onOpen: (t: Ticket) => void }) {
  const st = statusOf(t.status);
  const ds = devSideOf(t.dev_side);
  const person = t.kind === 'ticket' ? t.client?.name || t.created_by.name : t.created_by.name;
  const time = [t.est_min ? `est ${fmtMinutes(t.est_min)}` : '', t.spent_min ? `act ${fmtMinutes(t.spent_min)}` : ''].filter(Boolean).join(' · ');
  if (phone) {
    return (
      <Pressable onPress={() => onOpen(t)} style={({ pressed }) => [h.card, { borderLeftColor: st.color }, pressed && { backgroundColor: T.sub }]}>
        <View style={h.line}>
          <Text style={h.no}>{t.no}</Text>
          {ds ? <Text style={[h.side, { color: ds.color, backgroundColor: `${ds.color}14` }]}>{ds.label}</Text> : null}
          <View style={{ flex: 1 }} />
          <StatusPill status={t.status} small />
        </View>
        <Text style={h.title} numberOfLines={2}>{t.title}</Text>
        <Text style={h.meta} numberOfLines={1}>{[t.module_label, person, t.assignee ? `→ ${t.assignee.name}` : '', time].filter(Boolean).join(' · ')}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={() => onOpen(t)} style={({ pressed, hovered }: any) => [h.row, (pressed || hovered) && { backgroundColor: T.sub }]}>
      <View style={[h.bar4, { backgroundColor: st.color }]} />
      <Text style={[h.no, { width: 64 }]}>{t.no}</Text>
      <View style={{ flex: 3, minWidth: 0 }}>
        <Text style={h.title} numberOfLines={1}>{t.title}</Text>
        <Text style={h.meta} numberOfLines={1}>{t.module_label || (t.kind === 'ticket' ? 'User ticket' : 'IT task')}</Text>
      </View>
      <Text style={[h.cell, { width: 130 }]} numberOfLines={1}>{person}</Text>
      <View style={{ width: 130 }}>{ds ? <Text style={[h.side, { color: ds.color, backgroundColor: `${ds.color}14`, alignSelf: 'flex-start' }]} numberOfLines={1}>{ds.label}</Text> : <Text style={[h.cell, { color: T.muted }]}>—</Text>}</View>
      <View style={[h.who, { width: 140 }]}>
        {t.assignee ? <><Avatar name={t.assignee.name} id={t.assignee.id} color={t.assignee.color} size={20} /><Text style={h.cell} numberOfLines={1}>{t.assignee.name}</Text></> : <Text style={[h.cell, { color: T.muted }]}>Unassigned</Text>}
      </View>
      <Text style={[h.cell, { width: 120, color: T.muted }]} numberOfLines={1}>{time || '—'}</Text>
      <View style={{ width: 104, alignItems: 'flex-end' }}><StatusPill status={t.status} small /></View>
    </Pressable>
  );
}

const h = StyleSheet.create({
  head: { gap: 10, paddingBottom: 10 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  nav: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 260, justifyContent: 'flex-end' },
  label: { fontSize: 15, fontWeight: '900', color: T.nav, minWidth: 120, textAlign: 'center' },
  now: { paddingHorizontal: 10, height: 30, borderRadius: 8, borderWidth: 1, borderColor: T.border, justifyContent: 'center', backgroundColor: T.surface },
  nowText: { fontSize: 12, fontWeight: '800', color: T.copper },
  stats: { gap: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, minWidth: 110 },
  statNum: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  month: { width: '15.5%' as any, minWidth: 92, flexGrow: 1, padding: 10, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, gap: 2 },
  monthName: { fontSize: 11, fontWeight: '900', color: T.muted },
  monthNum: { fontSize: 18, fontWeight: '900', color: T.nav },
  monthBar: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: `${T.amber}55`, marginTop: 4 },
  monthDone: { backgroundColor: T.green },
  day: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#DCE8F5', borderRadius: 8, marginTop: 8, marginBottom: 4 },
  dayDate: { fontSize: 13, fontWeight: '900', color: T.nav, fontFamily: MONO },
  dayName: { fontSize: 12, fontWeight: '800', color: '#3A568A' },
  dayInfo: { fontSize: 11.5, fontWeight: '800', color: '#3A568A', flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.hair },
  bar4: { width: 4, height: 30, borderRadius: 2 },
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, padding: 10, marginBottom: 6, gap: 5 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  no: { fontSize: 11.5, fontWeight: '800', color: T.muted, fontFamily: MONO },
  title: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  meta: { fontSize: 11.5, color: T.muted, fontWeight: '700', marginTop: 1 },
  cell: { fontSize: 12.5, fontWeight: '700', color: T.ink, flexShrink: 1 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  side: { fontSize: 10.5, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  more: { textAlign: 'center', color: T.muted, fontSize: 12, fontWeight: '700', paddingVertical: 14 },
});
