import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api, formatAmount } from '../api/api';

const C = {
  brown: '#8E4A31', brownDark: '#804029', brownBar: '#A7644A',
  green: '#31684A', text: '#13212D', muted: '#9C8E84',
  border: '#E9DFD7', cream: '#FAF8F6', bg: '#FFFFFF', navy: '#0E2030',
};

type Day = { day: number; date: number; amount: number; payment_count: number; party_count: number; is_future?: boolean };
type Party = { prpcode: string; party_code: string; party_name: string; amount: number;
  payment_count: number; bill_count: number; latest_date: number };
type Response = { fy_label: string; summary: {
  today_amount: number; month_amount: number; selected_day_amount: number; selected_day_payment_count: number;
}; selected_date: number; as_on_date: number; daily: Day[]; parties: Party[]; reconciliation?: { matches: boolean; difference: number } };

const isoDate = (v: number) => {
  const s = String(v); return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : '';
};
const shortDate = (v: number) => {
  const d = isoDate(v); if (!d) return '';
  return new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};
const shortText = (v: string) => (v || '?').trim().slice(0, 2).toUpperCase();

export default function PaymentsMadeCard({ prptype, date, amountMode = 'compact', onFullReport, onOpenFY, onOpenParty }: {
  prptype: string; date: string; amountMode?: 'compact' | 'actual';
  onFullReport: () => void; onOpenFY: () => void; onOpenParty: (party: Party) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestSeq = useRef(0);
  const load = useCallback(async () => {
    if (!prptype || !date) return;
    const requestNo = ++requestSeq.current;
    setLoading(true); setError('');
    try {
      const result = await api.getOwnerPaymentsMade({ prptype, date, ...(selected ? { day: isoDate(selected) } : {}) });
      if (!result?.success || !result?.data?.report) throw new Error(result?.message || 'Payments Made data is unavailable.');
      if (requestNo === requestSeq.current) setData(result.data.report);
    } catch (e: any) {
      if (requestNo === requestSeq.current) { setData(null); setError(e?.message || 'Unable to load Payments Made.'); }
    } finally { if (requestNo === requestSeq.current) setLoading(false); }
  }, [prptype, date, selected]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setSelected(null); }, [date, prptype]);
  const days = data?.daily || [];
  const selectedDay = selected || data?.selected_date || null;
  const maximum = Math.max(1, ...days.map((d) => Math.abs(Number(d.amount) || 0)));
  const selectedEntry = useMemo(() => days.find((d) => d.date === selectedDay), [days, selectedDay]);
  const interactiveDay = hover || selectedDay;
  const displayDay = days.find(d => d.date === interactiveDay);
  const money = (n: number) => formatAmount(n, amountMode);
  // Do not show old day's party rows while the newly clicked day is loading.
  const partiesForSelectedDay = data?.selected_date === selectedDay ? (data.parties || []) : [];

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={s.heading}><Text style={s.headerEmoji}>💸</Text><Text style={s.headerTitle}>PAYMENTS MADE</Text></View>
        <View style={s.headerRight}>
          <TouchableOpacity onPress={onOpenFY} style={s.fyBadge} accessibilityRole="button"><Text style={s.fyText}>{data?.fy_label || 'FY'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={onFullReport} accessibilityRole="button"><Text style={s.headerLink}>Full report ›</Text></TouchableOpacity>
          <Text style={s.headerNote}>from accounts</Text>
        </View>
      </View>
      <View style={s.body}>
        <View style={s.totals}>
          <View style={s.total}><Text style={s.kicker}>TODAY</Text><Text numberOfLines={1} style={s.today}>{money(data?.summary.today_amount || 0)}</Text></View>
          <View style={[s.total, { alignItems: 'flex-end' }]}><Text style={s.kicker}>THIS MONTH</Text><Text numberOfLines={1} style={s.totalValue}>{money(data?.summary.month_amount || 0)}</Text></View>
        </View>
        {error ? <TouchableOpacity onPress={() => void load()} style={s.error}><Text style={s.errorText}>{error} · Tap to retry</Text></TouchableOpacity> : null}
        {loading && !data ? <View style={s.busy}><ActivityIndicator color={C.brown}/></View> : (
          <>
            <View style={s.dateAxisHeader}>
              <Text style={s.dateAxisText}>DAYS 01–{String(days.length).padStart(2, '0')} · SCROLL TO SEE EVERY DAY</Text>
              <Text style={s.dateAxisText}>Swipe or scroll →</Text>
            </View>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={true} style={s.chartScroll} contentContainerStyle={s.chartScrollContent}>
              <View style={[s.chartArea, { width: Math.max(1, days.length) * 27 }]}>
              {days.length ? days.map((entry, idx) => {
                const active = entry.date === selectedDay;
                const future = entry.is_future === true || entry.date > Number(data?.as_on_date || 0);
                const height = future ? 0 : Math.max(entry.amount > 0 ? 5 : 0, (Number(entry.amount) / maximum) * 72);
                // One visible day label per slot: all 28/29/30/31 dates remain
                // legible via horizontal scroll instead of silently suppressing days.
                return (
                  <Pressable
                    key={entry.date}
                    accessibilityRole="button"
                    accessibilityLabel={`${shortDate(entry.date)}, paid ${money(entry.amount)}, ${entry.payment_count} payments, ${entry.party_count} parties`}
                    disabled={future}
                    onPress={() => setSelected(entry.date)}
                    onHoverIn={() => { if (!future) setHover(entry.date); }} onHoverOut={() => setHover(null)}
                    style={[s.barSlot, future && s.futureDay]}
                  >
                    <View style={[s.bar, { height, backgroundColor: active ? C.green : idx % 2 ? C.brownBar : '#B77A63' }]}/>
                    <Text style={[s.dayLabel, future && s.futureDayLabel, active && s.activeDayLabel]} numberOfLines={1}>{entry.day}</Text>
                  </Pressable>
                );
              }) : <Text style={s.emptyChart}>No daily payments</Text>}
              </View>
            </ScrollView>
            {displayDay ? <Text style={s.chartHover}>{shortDate(displayDay.date)} · {money(displayDay.amount)} · {displayDay.payment_count} payments · {displayDay.party_count} parties</Text> : null}
            <View style={s.rule}/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pills} contentContainerStyle={s.pillContent}>
              {days.filter((entry) => entry.payment_count > 0 || entry.date === selectedDay).map((entry) => (
                <TouchableOpacity key={entry.date} style={[s.pill, entry.date === selectedDay && s.selectedPill]} onPress={() => setSelected(entry.date)}>
                  <Text style={[s.pillText, entry.date === selectedDay && s.selectedPillText]}>{String(entry.day).padStart(2, '0')} {shortDate(entry.date).split(' ')[1]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.selectedTitle}>{shortDate(selectedDay || 0).toUpperCase()} · {selectedEntry?.payment_count || 0} PAYMENTS · {selectedEntry?.party_count || 0} PARTIES</Text>
            {loading ? <ActivityIndicator color={C.brown} size="small" style={{ marginVertical: 7 }}/> : null}
            <ScrollView nestedScrollEnabled style={s.paymentsList}>
              {partiesForSelectedDay.map((p, index) => (
                <TouchableOpacity key={`${p.prpcode}-${p.party_code}-${index}`} onPress={() => onOpenParty(p)} style={s.paymentRow} activeOpacity={0.75}>
                  <View style={[s.marker, { backgroundColor: [C.brown, C.green, '#345785'][index % 3] }]}/>
                  <View style={s.paymentText}>
                    <Text style={s.partyName} numberOfLines={1}>{p.party_name || p.party_code}</Text>
                    <Text style={s.paymentSub} numberOfLines={1}>{p.payment_count} {p.payment_count === 1 ? 'payment' : 'payments'} · {p.bill_count} {p.bill_count === 1 ? 'bill' : 'bills'}</Text>
                  </View>
                  <Text style={s.paymentAmount} numberOfLines={1}>{money(p.amount)}</Text>
                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              ))}
              {!loading && !partiesForSelectedDay.length && <Text style={s.noPayments}>No payments for this date</Text>}
            </ScrollView>
            {data?.reconciliation && !data.reconciliation.matches ? <Text style={s.warning}>Payment reconciliation difference: {money(data.reconciliation.difference)}</Text> : null}
            <Text style={s.footer}>Tap a day to see parties paid · tap a party to open its individual vouchers and bill adjustments.</Text>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: 14, borderRadius: 13, backgroundColor: C.bg, borderColor: C.border, borderWidth: 1, overflow: 'hidden' },
  header: { backgroundColor: C.brown, paddingHorizontal: 12, paddingVertical: 9, minHeight: 33, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  headerEmoji: { fontSize: 13 }, headerTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  fyBadge: { paddingHorizontal: 7, paddingVertical: 3, borderColor: '#ECC8B4', borderWidth: 1, borderRadius: 16 },
  fyText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  headerLink: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  headerNote: { color: '#F3D3C6', fontSize: 9, fontWeight: '700' },
  body: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 },
  totals: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { flex: 1, minWidth: 0 }, kicker: { color: C.muted, fontSize: 9, fontWeight: '800' },
  today: { color: C.green, fontSize: 13, fontWeight: '900', marginTop: 2 },
  totalValue: { color: C.text, fontSize: 13, fontWeight: '900', marginTop: 2 },
  dateAxisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 5, marginTop: 8 },
  dateAxisText: { fontSize: 8, color: C.muted, fontWeight: '700' },
  chartScroll: { marginTop: 2 }, chartScrollContent: { paddingBottom: 4 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', height: 97, paddingTop: 10, paddingBottom: 2 },
  barSlot: { width: 27, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  futureDay: { opacity: 0.45 },
  futureDayLabel: { color: '#B8B0A9' },
  bar: { minWidth: 2, width: '49%', maxWidth: 15, borderRadius: 2 },
  dayLabel: { height: 12, color: C.muted, fontSize: 8, marginTop: 3, textAlign: 'center', fontVariant: ['tabular-nums'] },
  activeDayLabel: { color: C.green, fontWeight: '900' },
  chartHover: { color: C.muted, fontSize: 9, marginTop: 4, textAlign: 'center' },
  emptyChart: { color: C.muted, fontSize: 10, alignSelf: 'center', width: '100%', textAlign: 'center' },
  rule: { height: 1, backgroundColor: '#EEE9E4', marginTop: 9 },
  pills: { marginTop: 7, maxHeight: 28 },
  pillContent: { alignItems: 'center', gap: 5 },
  pill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14, backgroundColor: '#F2ECE7' },
  selectedPill: { backgroundColor: '#DDE9E1' },
  pillText: { color: '#9A806F', fontSize: 9, fontWeight: '900' }, selectedPillText: { color: C.green },
  selectedTitle: { color: C.muted, fontSize: 8, letterSpacing: 0.3, fontWeight: '900', marginTop: 10, marginBottom: 3 },
  paymentsList: { maxHeight: 188, minHeight: 30 },
  paymentRow: { minHeight: 39, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#EFE9E4', gap: 7 },
  marker: { height: 7, width: 7, borderRadius: 2, flexShrink: 0 },
  paymentText: { flex: 1, minWidth: 0 },
  partyName: { color: C.text, fontSize: 10.5, fontWeight: '800' },
  paymentSub: { color: '#9E8B7E', fontSize: 8.3, marginTop: 2 },
  paymentAmount: { color: C.text, fontWeight: '900', fontSize: 9.8 },
  chevron: { color: '#C9BFB5', fontSize: 16 },
  noPayments: { color: C.muted, textAlign: 'center', paddingVertical: 12, fontSize: 10 },
  footer: { fontSize: 9, color: '#A58E80', lineHeight: 14, marginTop: 8 },
  busy: { minHeight: 120, justifyContent: 'center' },
  error: { backgroundColor: '#FEF0E9', padding: 9, marginTop: 8, borderRadius: 6 }, errorText: { color: C.brown, fontSize: 10 },
  warning: { color: '#B55E1A', fontSize: 9, marginTop: 6 },
});
