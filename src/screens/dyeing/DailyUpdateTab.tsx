// FILE: src/screens/dyeing/DailyUpdateTab.tsx
// Dyeing → Daily Update (read-only) — the ERP Designing "Daily Update" screen as is:
//
//   ‹ [date] ›  [Yesterday] [Today]
//   DYEING OUTPUT — physical material, counted once
//     [DYED] [FINISHED] [RECEIVED]                               (tap = filter)
//   RE-PROCESSING — repeat work on the same material, kept out of the totals above
//     [LORRY CUTS] [SENT FOR RE-DYE] [RE-DYED] [RE-FINISHED] [RE-DYE BACK]
//   design chips  (Rib Stop 145 3,600 m · ↻ 1,200)              (tap = filter)
//   that day's rows: design · colour (↻ RE-WORK · cycle n) / chart · L·lot · challan · mill
//                    / customer · lorry-cut reasons      metres + badge
//   Date-wise dyeing — <month>: DATE DYED FIN RECV CUT RE-DYE RE-FIN BACK,
//     tap a date to expand its details, GRAND TOTAL; yesterday open by default
//
// Source: the append-only status history (POST /dyeing/daily_update) — the
// counting rules live in dyeingReports.ts (buildStream / onceSum).

import { useBusinessContext } from '@/src/core/business';
import { T } from '@/src/theme';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { DyeingService, unwrapBody } from './dyeingApi';
import { DyeingDateField } from './DyeingDateField';
import { addDaysISO, DyeEventRow, qtyLabel, showDate, toEventRow, todayISO, weekdayOf } from './dyeingModel';
import {
  buildMonthTable,
  buildStream,
  DailyKind,
  DayLotRow,
  designSummary,
  isReworkRow,
  labelOfRow,
  mergeDayRows,
  onceCnt,
  onceSum,
} from './dyeingReports';

/* ERP colours (PC_COL) */
export const PC = {
  dyeing: '#c0392b',
  finish: '#2e6b4f',
  inward: '#dd7a2e',
  lorrycut: '#8e44ad',
  re: '#B5651D',
  sent: '#c9962b',
};
const KIND_COL: Record<DailyKind, string> = {
  dyeing: PC.dyeing, finish: PC.finish, inward: PC.inward,
  cut: PC.lorrycut, resent: '#8e44ad', redye: PC.re, refin: PC.re, back: PC.re,
};
const KIND_LBL: Record<DailyKind, string> = {
  dyeing: 'Dyed', finish: 'Finished', inward: 'Received',
  cut: 'Sent back (lorry cut)', resent: 'Sent for re-dye', redye: 'Re-dyed', refin: 'Re-finished', back: 'Re-dye back',
};
const TABLE_COLS: [DailyKind, string, string | null][] = [
  ['dyeing', 'DYED', PC.dyeing], ['finish', 'FIN', PC.finish], ['inward', 'RECV', PC.inward],
  ['cut', 'CUT', PC.lorrycut], ['redye', 'RE-DYE', PC.re], ['refin', 'RE-FIN', PC.re], ['back', 'BACK', PC.re],
];

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" });
export const fmt = (v: number) => Math.round(v || 0).toLocaleString('en-IN');

const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
const monthEnd = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return `${iso.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};
const monthName = (iso: string) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
};
const fmtD = (iso: string) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return iso ? `${iso.slice(8, 10)} ${months[Number(iso.slice(5, 7)) - 1]}` : '—';
};

export function DailyUpdateTab() {
  const { prpGroup, yearNo, isReady } = useBusinessContext();
  const today = todayISO();
  const yesterday = addDaysISO(today, -1);
  const { width } = useWindowDimensions();
  const wide = width >= 700;

  const [date, setDate] = useState(yesterday);
  const [flt, setFlt] = useState<DailyKind | null>(null);
  const [dFlt, setDFlt] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(yesterday);
  const [events, setEvents] = useState<DyeEventRow[]>([]);
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forDate: string) => {
    if (!isReady) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const to = monthEnd(forDate) > todayISO() ? todayISO() : monthEnd(forDate);
      const body = { prptype: prpGroup, yearno: yearNo, fromdate: monthStart(forDate), todate: to };
      console.log('[Dyeing/Daily] request ->', body);
      const response: any = await DyeingService.dailyUpdate(body);
      const inner = unwrapBody(response);
      const rows = (Array.isArray(inner?.Events) ? inner.Events : []).map(toEventRow).filter(Boolean) as DyeEventRow[];
      setEvents(rows);
      setLoadedMonth(forDate.slice(0, 7));
    } catch (err: any) {
      setEvents([]);
      setError(err?.response?.data?.message || err?.message || 'Unable to load daily update.');
    } finally {
      setLoading(false);
    }
  }, [isReady, prpGroup, yearNo]);

  const dateRef = useRef(date);
  dateRef.current = date;
  useFocusEffect(useCallback(() => { void load(dateRef.current); }, [load]));

  const goDate = (next: string) => {
    if (!next || next > today) return;
    setDate(next);
    dateRef.current = next;
    if (next.slice(0, 7) !== loadedMonth) void load(next);
  };

  const stream = useMemo(() => buildStream(events), [events]);
  const dayEv = useMemo(() => stream.filter((r) => r.date === date), [stream, date]);
  const dSum = useMemo(() => designSummary(dayEv), [dayEv]);
  const rows = useMemo(() => {
    let list = mergeDayRows(dayEv);
    if (flt) list = list.filter((r) => r.kinds[flt]);
    if (dFlt) list = list.filter((r) => r.design === dFlt);
    return list;
  }, [dayEv, flt, dFlt]);

  const mFrom = monthStart(date);
  const mTo = monthEnd(date) > today ? today : monthEnd(date);
  const { days, grand } = useMemo(() => buildMonthTable(stream, mFrom, mTo, addDaysISO), [stream, mFrom, mTo]);
  const detailsFor = useCallback((dd: string) => mergeDayRows(stream.filter((r) => r.date === dd)), [stream]);

  const lots = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const cutAfterFin = new Set(dayEv.filter((r) => r.kind === 'cut' && r.afterFinish).map((r) => r.lot)).size;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={[st.body, wide && st.bodyWide]}>
      {/* date navigator */}
      <View style={st.dateRow}>
        <TouchableOpacity onPress={() => goDate(addDaysISO(date, -1))} hitSlop={HIT}><Text style={st.arrow}>‹</Text></TouchableOpacity>
        <DyeingDateField value={date} onChange={goDate} />
        <TouchableOpacity onPress={() => goDate(addDaysISO(date, 1))} hitSlop={HIT} disabled={date >= today}>
          <Text style={[st.arrow, date >= today && { opacity: 0.3 }]}>›</Text>
        </TouchableOpacity>
        {([['Yesterday', yesterday], ['Today', today]] as const).map(([l, dv]) => (
          <TouchableOpacity key={l} onPress={() => goDate(dv)} style={[st.quick, date === dv && st.quickOn]}>
            <Text style={[st.quickText, date === dv && { color: '#fff' }]}>{l}</Text>
          </TouchableOpacity>
        ))}
        <Text style={st.weekday}>{weekdayOf(date)}</Text>
      </View>

      {!!error && (
        <TouchableOpacity onPress={() => load(date)} style={st.errorBox}>
          <Text style={st.errorText}>{error} — tap to retry</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={st.loading}><ActivityIndicator color={T.copper} /></View>
      ) : (
        <>
          <View>
            <Text style={st.groupLbl}>DYEING OUTPUT — physical material, counted once</Text>
            <View style={st.kpiRow}>
              <Kpi k="dyeing" lbl="DYED" col={PC.dyeing} val={onceSum(dayEv, 'dyeing')} sub={lots(onceCnt(dayEv, 'dyeing'), 'lot')} flt={flt} setFlt={setFlt} />
              <Kpi k="finish" lbl="FINISHED" col={PC.finish} val={onceSum(dayEv, 'finish')} sub={lots(onceCnt(dayEv, 'finish'), 'lot')} flt={flt} setFlt={setFlt} />
              <Kpi k="inward" lbl="RECEIVED" col={PC.inward} val={onceSum(dayEv, 'inward')} sub={lots(onceCnt(dayEv, 'inward'), 'receipt')} flt={flt} setFlt={setFlt} />
            </View>
          </View>
          <View>
            <Text style={[st.groupLbl, { color: '#8e44ad' }]}>RE-PROCESSING — repeat work on the same material, kept out of the totals above</Text>
            <View style={st.kpiRow}>
              <Kpi k="cut" lbl="LORRY CUTS" col={PC.lorrycut} val={onceSum(dayEv, 'cut')} sub={`${lots(onceCnt(dayEv, 'cut'), 'cut')} · ${cutAfterFin} after finishing`} flt={flt} setFlt={setFlt} />
              <Kpi k="resent" lbl="SENT FOR RE-DYE" col="#8e44ad" val={onceSum(dayEv, 'resent')} sub="re-processing outward" flt={flt} setFlt={setFlt} />
              <Kpi k="redye" lbl="RE-DYED" col={PC.re} val={onceSum(dayEv, 'redye')} sub={lots(onceCnt(dayEv, 'redye'), 'lot')} flt={flt} setFlt={setFlt} />
              <Kpi k="refin" lbl="RE-FINISHED" col={PC.re} val={onceSum(dayEv, 'refin')} sub={lots(onceCnt(dayEv, 'refin'), 'lot')} flt={flt} setFlt={setFlt} />
              <Kpi k="back" lbl="RE-DYE BACK" col={PC.re} val={onceSum(dayEv, 'back')} sub="returned after re-processing" flt={flt} setFlt={setFlt} />
            </View>
          </View>

          {(flt || dFlt) && (
            <Text style={st.showing}>
              Showing {dFlt ? <Text style={{ fontWeight: '800', color: T.ink }}>{dFlt}</Text> : null}
              {dFlt && flt ? ' · ' : ''}
              {flt ? <Text style={{ fontWeight: '800', color: KIND_COL[flt] }}>{KIND_LBL[flt]}</Text> : null}
              {' — '}
              <Text onPress={() => { setFlt(null); setDFlt(null); }} style={{ color: T.copper, fontWeight: '800' }}>clear</Text>
            </Text>
          )}

          {dSum.length > 0 && (
            <View style={st.chips}>
              {dSum.map((x) => {
                const on = dFlt === x.d;
                return (
                  <TouchableOpacity key={x.d} onPress={() => setDFlt(on ? null : x.d)} style={[st.dChip, on && st.dChipOn]}>
                    <Text style={st.dChipText}>
                      {x.d}{' '}
                      <Text style={st.mono}>{fmt(x.main)} m</Text>
                      {x.re > 0 && <Text style={[st.mono, { color: PC.re }]}> · ↻ {fmt(x.re)}</Text>}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={[st.card, { paddingVertical: 4 }]}>
            {rows.length === 0 && (
              <Text style={st.emptyRow}>No dyeing activity on {fmtD(date)}{flt || dFlt ? ' for this filter' : ''}.</Text>
            )}
            {rows.map((r) => <ActivityRow key={r.lot} r={r} />)}
          </View>

          {/* date-wise month table */}
          <View style={[st.card, { paddingHorizontal: 13, paddingVertical: 11 }]}>
            <Text style={st.tblTitle}>Date-wise dyeing — {monthName(date)}</Text>
            <Text style={st.tblSub}>metres · output columns count material once; re-processing columns are separate · tap a date for its details</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
              <View style={[st.table, { minWidth: wide ? Math.min(width - 60, 900) : 440 }]}>
                <View style={st.tRow}>
                  <Text style={[st.tDate, st.tHead, { color: T.muted }]}>DATE</Text>
                  {TABLE_COLS.map(([k, l, c]) => <Text key={k} style={[st.tCell, st.tHead, { color: c || T.muted }]}>{l}</Text>)}
                </View>
                {days.map(({ date: dd, t }) => {
                  const any = TABLE_COLS.some(([k]) => t[k] > 0);
                  const open = openDay === dd;
                  const go = () => { setOpenDay(open ? null : dd); goDate(dd); };
                  return (
                    <View key={dd}>
                      <TouchableOpacity onPress={go} style={st.tRow} activeOpacity={0.6}>
                        <Text style={[st.tDate, st.mono, {
                          fontWeight: open || dd === date ? '800' : '600',
                          color: open ? T.copper : any ? T.ink : '#b0b6bc',
                        }]} numberOfLines={1}>
                          {open ? '▾ ' : '▸ '}{fmtD(dd)}
                        </Text>
                        {TABLE_COLS.map(([k, , c]) => <NumCell key={k} v={t[k]} col={k === 'dyeing' || k === 'finish' || k === 'inward' ? null : c} />)}
                      </TouchableOpacity>
                      {open && (
                        <View style={st.detail}>
                          {detailsFor(dd).length === 0 && <Text style={st.detailEmpty}>No dyeing activity on {fmtD(dd)}.</Text>}
                          {detailsFor(dd).map((r) => (
                            <View key={r.lot} style={st.detailRow}>
                              <Text style={st.detailText}>
                                <Text style={{ fontWeight: '800' }}>{r.design}</Text> · {r.colour}{' '}
                                <Text style={[st.mono, st.detailMuted]}>
                                  · {r.chartNo}{r.lotNo ? ` · L·${r.lotNo}` : ' · no lot'}{r.challan ? ` · ${r.challan}` : ''}
                                </Text>
                                {r.reasons.length ? <Text style={{ color: PC.lorrycut }}> · {r.reasons.join(', ')}</Text> : null}
                              </Text>
                              <Text style={[st.mono, { fontSize: 10.5, fontWeight: '700', color: T.ink }]}>{fmt(r.metres)} m</Text>
                              <Badge r={r} />
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                <View style={[st.tRow, st.tTotal]}>
                  <Text style={[st.tDate, { fontWeight: '800', color: T.ink, fontSize: 10.5 }]}>GRAND TOTAL</Text>
                  {TABLE_COLS.map(([k, , c]) => <NumCell key={k} v={grand[k]} col={k === 'dyeing' || k === 'finish' || k === 'inward' ? null : c} bold />)}
                </View>
              </View>
            </ScrollView>
          </View>

          <Text style={st.footer}>
            Dyed / Finished / Received are first-time work on physical material. A lorry cut sends a lot back for
            re-processing — before finishing (re-dye only) or after finishing (re-dye + re-finish); all of that, plus
            re-processing outwards and returns, is counted separately per lot per day and never added to the dyeing totals.
            Month lorry cuts: {grand.cuts} · {qtyLabel(grand.cut)} m.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

function Kpi({
  k, lbl, col, val, sub, flt, setFlt,
}: { k: DailyKind; lbl: string; col: string; val: number; sub: string; flt: DailyKind | null; setFlt: (k: DailyKind | null) => void }) {
  const on = flt === k;
  return (
    <TouchableOpacity
      onPress={() => setFlt(on ? null : k)}
      activeOpacity={0.75}
      style={[st.kpi, { borderColor: on ? col : T.border, backgroundColor: on ? '#FBF7F2' : T.surface }]}
    >
      <Text style={[st.kpiLbl, { color: col }]} numberOfLines={1}>{lbl}</Text>
      <Text style={[st.kpiVal, st.mono]} numberOfLines={1}>{fmt(val)} <Text style={st.kpiUnit}>m</Text></Text>
      <Text style={st.kpiSub} numberOfLines={2}>{sub}</Text>
    </TouchableOpacity>
  );
}

function Badge({ r }: { r: DayLotRow }) {
  const bg = r.kinds.cut || r.kinds.resent ? PC.lorrycut
    : r.kinds.redye || r.kinds.refin || r.kinds.back ? PC.re
      : r.kinds.inward ? PC.inward
        : r.kinds.finish ? PC.finish : PC.dyeing;
  return (
    <View style={[st.badge, { backgroundColor: bg }]}>
      <Text style={st.badgeText} numberOfLines={2}>{labelOfRow(r)}</Text>
    </View>
  );
}

function ActivityRow({ r }: { r: DayLotRow }) {
  const rw = isReworkRow(r);
  return (
    <View style={[st.aRow, rw && { backgroundColor: '#FDFBF7' }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.aTitle}>
          {r.design} <Text style={{ fontWeight: '700' }}>· {r.colour}</Text>
          {rw && <Text style={st.rework}>  ↻ RE-WORK{r.cycle ? ` · cycle ${r.cycle}` : ''} </Text>}
        </Text>
        <Text style={[st.aSub, st.mono]} numberOfLines={2}>
          {r.chartNo}{r.lotNo ? ` · L·${r.lotNo}` : ' · no lot'}{r.challan ? ` · ${r.challan}` : ''}{r.mill ? ` · ${r.mill}` : ''}
        </Text>
        <Text style={[st.aSub, r.reasons.length ? { color: PC.lorrycut } : null]} numberOfLines={2}>
          {r.party || '—'}{r.reasons.length ? ` · ${r.reasons.join(', ')}` : ''}{r.kinds.resent ? ' · re-processing challan' : ''}
        </Text>
      </View>
      <View style={st.aRight}>
        <Text style={[st.mono, st.aMetres]}>{fmt(r.metres)} m</Text>
        <Badge r={r} />
      </View>
    </View>
  );
}

function NumCell({ v, col, bold }: { v: number; col: string | null; bold?: boolean }) {
  return (
    <Text style={[st.tCell, st.mono, { color: v ? col || T.ink : '#c8ccd0', fontWeight: bold ? '800' : '400' }]} numberOfLines={1}>
      {v ? fmt(v) : '—'}
    </Text>
  );
}

const st = StyleSheet.create({
  body: { padding: 12, paddingBottom: 40, gap: 11 },
  bodyWide: { maxWidth: 1000, width: '100%', alignSelf: 'center', padding: 16 },
  mono: { fontFamily: MONO },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  arrow: { fontSize: 22, color: T.copper, fontWeight: '800', paddingHorizontal: 2, lineHeight: 26 },
  quick: {
    borderWidth: 1, borderColor: `${T.copper}55`, backgroundColor: '#F8EFE6', borderRadius: 7,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  quickOn: { backgroundColor: T.copper, borderColor: T.copper },
  quickText: { fontSize: 10.5, fontWeight: '800', color: T.copper },
  weekday: { fontSize: 10.5, fontWeight: '700', color: T.muted },

  errorBox: { backgroundColor: '#FCEDEA', borderRadius: 8, padding: 9 },
  errorText: { color: T.red, fontSize: 11.5, fontWeight: '700' },
  loading: { paddingVertical: 40, alignItems: 'center' },

  groupLbl: { fontSize: 9, fontWeight: '800', color: T.muted, letterSpacing: 0.5, marginBottom: 5 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  kpi: { flexGrow: 1, flexBasis: 96, minWidth: 96, borderWidth: 2, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 },
  kpiLbl: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4 },
  kpiVal: { fontSize: 15, fontWeight: '800', color: T.ink, marginTop: 2 },
  kpiUnit: { fontSize: 9.5, color: T.muted },
  kpiSub: { fontSize: 9, color: T.muted, marginTop: 1 },

  showing: { fontSize: 10.5, color: T.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dChip: {
    borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, borderRadius: 7,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  dChipOn: { borderColor: T.copper, backgroundColor: '#F8EFE6' },
  dChipText: { fontSize: 10.5, fontWeight: '800', color: T.ink },

  card: {
    backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden',
  },
  emptyRow: { padding: 16, textAlign: 'center', color: T.muted, fontSize: 12 },
  aRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: T.alt,
  },
  aTitle: { fontSize: 11.5, fontWeight: '800', color: T.ink },
  rework: { fontSize: 8.5, fontWeight: '900', color: PC.re, backgroundColor: '#FBF1DC' },
  aSub: { fontSize: 9.5, color: T.muted, marginTop: 1 },
  aRight: { alignItems: 'flex-end', gap: 4, maxWidth: '42%' },
  aMetres: { fontSize: 11.5, fontWeight: '700', color: T.ink },
  badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 8.5, fontWeight: '900', color: '#fff', textAlign: 'right' },

  tblTitle: { fontSize: 11, fontWeight: '800', color: T.ink, marginBottom: 2 },
  tblSub: { fontSize: 9.5, color: T.muted, marginBottom: 7 },
  table: { flex: 1 },
  tRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  tHead: { fontSize: 8.5, fontWeight: '800' },
  tDate: { flex: 1.35, minWidth: 74, fontSize: 10.5 },
  tCell: { flex: 1, minWidth: 48, textAlign: 'right', fontSize: 10.5, paddingLeft: 6 },
  tTotal: { borderTopWidth: 2, borderTopColor: T.border, marginTop: 3, paddingTop: 6 },
  detail: { backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginTop: 1, marginBottom: 4 },
  detailEmpty: { fontSize: 10.5, color: T.muted },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  detailText: { flex: 1, minWidth: 0, fontSize: 10.5, color: T.ink },
  detailMuted: { color: T.muted, fontSize: 9.5 },

  footer: { fontSize: 9.5, color: T.muted, lineHeight: 14 },
});
