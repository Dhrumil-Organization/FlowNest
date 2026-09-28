// FILE: src/screens/dyeing/DailyUpdateTab.tsx
// Dyeing → Daily Update (read-only).
//
// Layout (as approved in the ERP design):
//   - date navigator (‹ date ›, Today, Yesterday)
//   - KPI cards for that date: Sent · Dyed · Finished · Received · Lorry Cut
//     (+ Redyed / Re-process shown separately, never inside the main totals)
//   - that date's rows: Design · Chart · Colour · Lot · status · qty
//   - date-wise table for the selected date's MONTH with a Grand Total row;
//     tap a date to expand its details inline (Design / Chart / Colour / Lot).
//     Yesterday is expanded by default.
//
// Source: the append-only lot status history — no separate entry. Re-work
// (a status repeated on the same lot) is excluded from the main totals.

import { useBusinessContext } from '@/src/core/business';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusLetter } from './ColourStatusSheet';
import { DyeingService, unwrapBody } from './dyeingApi';
import {
  addDaysISO, DyeEventRow, qtyLabel, shortDate, showDate, STATUS_COLORS, toEventRow, todayISO, weekdayOf,
} from './dyeingModel';
import { buildDailyUpdate, DailyDay } from './dyeingReports';

const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
const monthEnd = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${iso.slice(0, 7)}-${String(last).padStart(2, '0')}`;
};
const monthLabel = (iso: string) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
};

export function DailyUpdateTab() {
  const { prpGroup, yearNo, isReady } = useBusinessContext();
  const yesterday = addDaysISO(todayISO(), -1);
  const [date, setDate] = useState(yesterday);
  const [events, setEvents] = useState<DyeEventRow[]>([]);
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [yesterday]: true });

  const load = useCallback(async (forDate: string) => {
    if (!isReady) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const body = {
        prptype: prpGroup,
        yearno: yearNo,
        fromdate: monthStart(forDate),
        todate: monthEnd(forDate),
      };
      console.log('[Dyeing/Daily] request ->', body);
      const response: any = await DyeingService.dailyUpdate(body);
      const inner = unwrapBody(response);
      const rows = (Array.isArray(inner?.Events) ? inner.Events : []).map(toEventRow).filter(Boolean) as DyeEventRow[];
      setEvents(rows);
      setLoadedMonth(forDate.slice(0, 7));
    } catch (err: any) {
      setError(err?.message || 'Unable to load daily update.');
    } finally {
      setLoading(false);
    }
  }, [isReady, prpGroup, yearNo]);

  useFocusEffect(useCallback(() => { void load(date); }, [load])); // eslint-disable-line react-hooks/exhaustive-deps

  const changeDate = (next: string) => {
    if (next > todayISO()) return;
    setDate(next);
    if (next.slice(0, 7) !== loadedMonth) void load(next);
  };

  const today = todayISO();
  const monthTo = monthEnd(date) > today ? today : monthEnd(date);
  const { days, grand } = useMemo(
    () => buildDailyUpdate(events, monthStart(date), monthTo),
    [events, date, monthTo],
  );
  const selectedDay: DailyDay = days.find((d) => d.date === date) || {
    date, rows: [], totals: { sent: 0, dyed: 0, finished: 0, received: 0, lorryCut: 0, lorryCutCount: 0, redyed: 0, reprocess: 0 },
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={st.body}>
      {/* Date navigator */}
      <View style={st.dateNav}>
        <TouchableOpacity onPress={() => changeDate(addDaysISO(date, -1))} style={st.navBtn}>
          <Icon name="chevron-left" size={22} color={T.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={st.dateBig}>{showDate(date)}</Text>
          <Text style={st.dateSub}>{date === today ? 'Today' : date === yesterday ? 'Yesterday' : weekdayOf(date)}</Text>
        </View>
        <TouchableOpacity onPress={() => changeDate(addDaysISO(date, 1))} style={[st.navBtn, date >= today && { opacity: 0.3 }]} disabled={date >= today}>
          <Icon name="chevron-right" size={22} color={T.ink} />
        </TouchableOpacity>
      </View>
      <View style={st.quickRow}>
        <QuickBtn label="Today" active={date === today} onPress={() => changeDate(today)} />
        <QuickBtn label="Yesterday" active={date === yesterday} onPress={() => changeDate(yesterday)} />
      </View>

      {!!error && <Text style={st.error}>{error}</Text>}
      {loading ? (
        <View style={st.loading}><ActivityIndicator color={T.copper} /></View>
      ) : (
        <>
          {/* KPIs */}
          <View style={st.kpiGrid}>
            <Kpi label="Sent for job" value={selectedDay.totals.sent} color={STATUS_COLORS['Sent for job']} />
            <Kpi label="Dyed" value={selectedDay.totals.dyed} color={STATUS_COLORS['Dying']} />
            <Kpi label="Finished" value={selectedDay.totals.finished} color={STATUS_COLORS['Finish']} />
            <Kpi label="Received" value={selectedDay.totals.received} color={STATUS_COLORS['Job inward']} />
            <Kpi
              label={`Lorry Cut${selectedDay.totals.lorryCutCount ? ` · ${selectedDay.totals.lorryCutCount}` : ''}`}
              value={selectedDay.totals.lorryCut}
              color={STATUS_COLORS['Lorry Cut']}
            />
            <Kpi label="Redyed / Re-process" value={selectedDay.totals.redyed + selectedDay.totals.reprocess} color={T.amber} dashed />
          </View>

          {/* That day's rows */}
          <Text style={st.section}>Activity on {showDate(date)}</Text>
          {selectedDay.rows.length ? (
            <View style={st.card}>
              {selectedDay.rows.map((row, idx) => <EventLine key={`${row.Id}-${idx}`} row={row} />)}
            </View>
          ) : (
            <Text style={st.empty}>No dyeing activity recorded on this date.</Text>
          )}

          {/* Month table */}
          <Text style={st.section}>{monthLabel(date)} — date-wise</Text>
          <View style={st.card}>
            <View style={[st.tr, st.th]}>
              <Text style={[st.td, st.tdDate, st.thText]}>Date</Text>
              <Text style={[st.td, st.thText]}>Sent</Text>
              <Text style={[st.td, st.thText]}>Dyed</Text>
              <Text style={[st.td, st.thText]}>Fin.</Text>
              <Text style={[st.td, st.thText]}>Recd</Text>
              <Text style={[st.td, st.thText]}>✂</Text>
            </View>
            {days.map((day) => {
              const open = !!expanded[day.date];
              const has = day.rows.length > 0;
              return (
                <View key={day.date}>
                  <TouchableOpacity
                    disabled={!has}
                    onPress={() => setExpanded((cur) => ({ ...cur, [day.date]: !cur[day.date] }))}
                    style={[st.tr, day.date === date && { backgroundColor: `${T.copper}10` }]}
                  >
                    <View style={[st.tdDate, { flexDirection: 'row', alignItems: 'center' }]}>
                      <Icon name={has ? (open ? 'expand-less' : 'expand-more') : 'remove'} size={14} color={has ? T.ink : T.border} />
                      <Text style={[st.cell, { fontWeight: '800' }]}>{shortDate(day.date)}</Text>
                    </View>
                    <Cell v={day.totals.sent} />
                    <Cell v={day.totals.dyed} extra={day.totals.redyed} />
                    <Cell v={day.totals.finished} />
                    <Cell v={day.totals.received} />
                    <Cell v={day.totals.lorryCut} />
                  </TouchableOpacity>
                  {open && has && (
                    <View style={st.expand}>
                      {day.rows.map((row, idx) => <EventLine key={`${row.Id}-${idx}`} row={row} compact />)}
                    </View>
                  )}
                </View>
              );
            })}
            <View style={[st.tr, st.total]}>
              <Text style={[st.td, st.tdDate, st.totalText]}>Grand Total</Text>
              <Cell v={grand.sent} bold />
              <Cell v={grand.dyed} bold extra={grand.redyed} />
              <Cell v={grand.finished} bold />
              <Cell v={grand.received} bold />
              <Cell v={grand.lorryCut} bold />
            </View>
          </View>
          <Text style={st.note}>
            Figures are metres. Re-work (a status repeated on the same lot after a Lorry Cut) is not added again to
            Dyed / Finished / Received — Redyed metres show as “+x” under Dyed. Month redyed: {qtyLabel(grand.redyed)} m ·
            re-process: {qtyLabel(grand.reprocess)} m · lorry cuts: {grand.lorryCutCount}.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function EventLine({ row, compact }: { row: DyeEventRow; compact?: boolean }) {
  return (
    <View style={[st.line, compact && { paddingVertical: 5 }]}>
      <StatusLetter status={row.Status} size={16} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.lineTitle} numberOfLines={1}>
          {row.DsnName || row.DsnCode || '—'} · {row.ShdName}
          {row.IsRework ? <Text style={st.rework}>  {row.Status === 'Dying' ? 'REDYED' : 'RE-WORK'}</Text> : null}
        </Text>
        <Text style={st.lineMeta} numberOfLines={1}>
          {row.ChartNo}{row.LotNo ? ` · Lot ${row.LotNo}` : ''}{row.PartyName ? ` · ${row.PartyName}` : ''}
          {row.MillName ? ` · ${row.MillName}` : ''}
        </Text>
        {!!row.LorryCutReason && <Text style={[st.lineMeta, { color: T.purple }]}>✂ {row.LorryCutReason}</Text>}
      </View>
      <Text style={st.lineQty}>{qtyLabel(row.Qty)}</Text>
    </View>
  );
}

function Kpi({ label, value, color, dashed }: { label: string; value: number; color: string; dashed?: boolean }) {
  return (
    <View style={[st.kpi, { borderColor: `${color}55` }, dashed && { borderStyle: 'dashed' }]}>
      <View style={[st.kpiBar, { backgroundColor: color }]} />
      <Text style={st.kpiLabel} numberOfLines={1}>{label}</Text>
      <Text style={[st.kpiValue, { color }]}>{qtyLabel(value)}</Text>
      <Text style={st.kpiUnit}>m</Text>
    </View>
  );
}

function Cell({ v, bold, extra }: { v: number; bold?: boolean; extra?: number }) {
  return (
    <View style={st.td}>
      <Text style={[st.cell, bold && { fontWeight: '900' }, !v && { color: T.border }]}>{v ? qtyLabel(v) : '–'}</Text>
      {!!extra && <Text style={st.cellExtra}>+{qtyLabel(extra)}</Text>}
    </View>
  );
}

function QuickBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.quick, active && { borderColor: T.copper, backgroundColor: `${T.copper}18` }]}>
      <Text style={[st.quickText, active && { color: T.copper }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  body: { padding: 12, paddingBottom: 32 },
  dateNav: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface,
    borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 6,
  },
  navBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: T.sub },
  dateBig: { fontSize: 16, fontWeight: '900', color: T.ink },
  dateSub: { fontSize: 10.5, fontWeight: '700', color: T.muted, marginTop: 1 },
  quickRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  quick: { borderWidth: 1, borderColor: T.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: T.surface },
  quickText: { fontSize: 11, fontWeight: '800', color: T.ink },
  loading: { paddingVertical: 40 },
  error: { color: T.red, fontWeight: '700', fontSize: 12, marginTop: 10 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  kpi: {
    width: '31.5%', flexGrow: 1, backgroundColor: T.surface, borderWidth: 1, borderRadius: 11,
    padding: 9, overflow: 'hidden',
  },
  kpiBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: T.muted },
  kpiValue: { fontSize: 17, fontWeight: '900', marginTop: 3 },
  kpiUnit: { fontSize: 9.5, fontWeight: '700', color: T.muted },

  section: { fontSize: 12, fontWeight: '900', color: T.ink, marginTop: 16, marginBottom: 6 },
  empty: { fontSize: 12, color: T.muted, fontWeight: '600' },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden' },

  line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.hair },
  lineTitle: { fontSize: 12, fontWeight: '800', color: T.ink },
  lineMeta: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  lineQty: { fontSize: 12, fontWeight: '900', color: T.ink },
  rework: { fontSize: 9, fontWeight: '900', color: T.amber },

  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: T.hair },
  th: { backgroundColor: T.nav },
  thText: { color: '#fff', fontSize: 10.5, fontWeight: '800', textAlign: 'right' },
  td: { flex: 1, alignItems: 'flex-end' },
  tdDate: { flex: 1.3, textAlign: 'left', alignItems: 'flex-start' },
  cell: { fontSize: 11, fontWeight: '700', color: T.ink, textAlign: 'right' },
  cellExtra: { fontSize: 8.5, fontWeight: '800', color: T.amber },
  total: { backgroundColor: T.alt, borderBottomWidth: 0 },
  totalText: { fontSize: 11, fontWeight: '900', color: T.ink },
  expand: { backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.border },
  note: { fontSize: 10.5, color: T.muted, fontWeight: '600', marginTop: 8, lineHeight: 15 },
});
