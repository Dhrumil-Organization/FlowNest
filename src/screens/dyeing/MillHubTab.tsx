// // FILE: src/screens/dyeing/MillHubTab.tsx
// // Dyeing → Mill Hub (READ-ONLY — never a data-entry screen) — the ERP
// // Designing "Mill Hub" as is:
// //
// //   [from] → [to]  [7d] [Month] [90d]
// //   01 Sep → 28 Sep   12 outward · 9 inward · 2 re-dye   +N outside range — show all   ⓘ How to read this
// //   (guide)   [All mills] [Shree Rang Dyeing] [Akash Process]
// //   DESIGN            OUT     IN   PEND  SHORT    %    IN ₹
// //   Rib Stop 145 ›   ...      (↻ re-dye x m out · y m back)
// //   GRAND TOTAL
// //   tap a design -> challan-wise page (state badge CLOSED / PARTIAL / PENDING,
// //   EARLIER OUTWARD / RE-DYE tags, colour D F L·lot ✂ info line, TOTAL)
// //
// // Source: POST /dyeing/mill_hub (full status history of every shade touched)
// // turned into outward trips + receipts by dyeingReports.buildTrips; the ERP
// // rules are in buildMillHub / buildChallanRows.

// import { useBusinessContext } from '@/src/core/business';
// import { T } from '@/src/theme';
// import { useFocusEffect } from '@react-navigation/native';
// import React, { useCallback, useMemo, useRef, useState } from 'react';
// import {
//   ActivityIndicator,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   useWindowDimensions,
//   View,
// } from 'react-native';
// import { fmt, MONO } from './DailyUpdateTab';
// import { DyeingService, unwrapBody } from './dyeingApi';
// import { DyeingDateField } from './DyeingDateField';
// import { addDaysISO, DyeEventRow, toEventRow, todayISO } from './dyeingModel';
// import { buildChallanRows, buildMillHub, buildTrips, ChallanRow, MillAgg, MillTrip } from './dyeingReports';

// const money = (v: number) => {
//   v = +v || 0;
//   return v >= 1e5 ? `₹${(v / 1e5).toFixed(2)}L` : v >= 1e3 ? `₹${(v / 1e3).toFixed(1)}K` : `₹${Math.round(v).toLocaleString('en-IN')}`;
// };
// const fmtD = (iso: string) => {
//   const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//   return iso ? `${iso.slice(8, 10)} ${months[Number(iso.slice(5, 7)) - 1]}` : '—';
// };
// /** Indian financial year start (1 Apr) of a date. */
// const fyStart = (iso: string) => {
//   const y = Number(iso.slice(0, 4));
//   const m = Number(iso.slice(5, 7));
//   return `${m >= 4 ? y : y - 1}-04-01`;
// };

// const W = { out: 52, in: 52, pend: 48, short: 46, pct: 36, amt: 58 };
// const AMBER = '#C98A1A';

// export function MillHubTab() {
//   const { prpGroup, yearNo, isReady } = useBusinessContext();
//   const today = todayISO();
//   const monthStart = `${today.slice(0, 8)}01`;
//   const { width } = useWindowDimensions();
//   const wide = width >= 700;
//   const narrow = width < 420;

//   const [loadFrom, setLoadFrom] = useState(() => {
//     const f = fyStart(today);
//     const d90 = addDaysISO(today, -90);
//     return f < d90 ? f : d90;
//   });
//   const [events, setEvents] = useState<DyeEventRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [from, setFrom] = useState<string | null>(null); // null until data decides the default (ERP rule)
//   const [to, setTo] = useState(today);
//   const [help, setHelp] = useState(false);
//   const [mill, setMill] = useState('ALL');
//   const [dsel, setDsel] = useState<string | null>(null);

//   const load = useCallback(async (windowFrom: string) => {
//     if (!isReady) { setLoading(false); return; }
//     setLoading(true);
//     setError(null);
//     try {
//       const body = { prptype: prpGroup, yearno: yearNo, fromdate: windowFrom, todate: todayISO() };
//       console.log('[Dyeing/MillHub] request ->', body);
//       const response: any = await DyeingService.millHub(body);
//       const inner = unwrapBody(response);
//       const rows = (Array.isArray(inner?.Events) ? inner.Events : []).map(toEventRow).filter(Boolean) as DyeEventRow[];
//       setEvents(rows);
//       setLoadFrom(windowFrom);
//     } catch (err: any) {
//       setEvents([]);
//       setError(err?.response?.data?.message || err?.message || 'Unable to load mill hub.');
//     } finally {
//       setLoading(false);
//     }
//   }, [isReady, prpGroup, yearNo, direction]);

//   const loadFromRef = useRef(loadFrom);
//   loadFromRef.current = loadFrom;
//   useFocusEffect(useCallback(() => { void load(loadFromRef.current); }, [load]));

//   const trips = useMemo(() => buildTrips(events), [events]);
//   const allDates = useMemo(
//     () => trips.flatMap((t) => [t.date, ...t.ins.map((i) => i.date)]).filter(Boolean).sort(),
//     [trips],
//   );
//   const earliest = allDates[0] || monthStart;
//   const latest = allDates[allDates.length - 1] || today;

//   // ERP default: this month if it has activity, else last 90 days, else everything
//   const effFrom = useMemo(() => {
//     if (from) return from;
//     const d90 = addDaysISO(today, -90);
//     if (allDates.some((d) => d >= monthStart)) return monthStart;
//     if (allDates.some((d) => d >= d90)) return d90;
//     return earliest;
//   }, [from, allDates, monthStart, today, earliest]);

//   const setRange = (f: string, t: string) => {
//     const nf = f > t ? t : f;
//     setFrom(nf);
//     setTo(t);
//     if (nf < loadFrom) void load(nf); // widen the loaded window
//   };
//   const showAll = () => {
//     const f = fyStart(today) < earliest ? fyStart(today) : earliest;
//     setMill('ALL');
//     setRange(f, today >= latest ? today : latest);
//   };

//   const hub = useMemo(() => buildMillHub(trips, effFrom, to, mill), [trips, effFrom, to, mill]);
//   const inRange = (d: string) => d >= effFrom && d <= to;
//   const outside = hub.moves - trips.filter((t) => inRange(t.date)).length - trips.reduce((s, t) => s + t.ins.filter((i) => inRange(i.date)).length, 0);

//   const Rng = (
//     <View style={st.rng}>
//       <DyeingDateField value={effFrom} onChange={(v) => setRange(v, to)} compact />
//       <Text style={st.arrowTxt}>→</Text>
//       <DyeingDateField value={to} onChange={(v) => setRange(effFrom, v)} compact />
//       {([['7d', addDaysISO(today, -7)], ['Month', monthStart], ['90d', addDaysISO(today, -90)]] as const).map(([l, f]) => {
//         const on = effFrom === f && to === today;
//         return (
//           <TouchableOpacity key={l} onPress={() => setRange(f, today)} style={[st.preset, on && st.presetOn]}>
//             <Text style={[st.presetText, on && { color: '#fff' }]}>{l}</Text>
//           </TouchableOpacity>
//         );
//       })}
//     </View>
//   );

//   const MillChips = hub.mills.length > 1 ? (
//     <View style={st.chips}>
//       {[['ALL', 'All mills'], ...hub.mills.map((m) => [m, m])].map(([k, l]) => {
//         const on = mill === k;
//         return (
//           <TouchableOpacity key={k} onPress={() => setMill(k)} style={[st.chip, on && st.chipOn]}>
//             <Text style={[st.chipText, on && { color: T.copper }]}>{l}</Text>
//           </TouchableOpacity>
//         );
//       })}
//     </View>
//   ) : null;

//   const tableMin = narrow ? 470 : undefined;

//   if (loading && !events.length) {
//     return <View style={st.loading}><ActivityIndicator color={T.copper} /></View>;
//   }

//   /* ------------------------------ challan-wise ----------------------------- */
//   if (dsel) {
//     const { rows, CT } = buildChallanRows(trips, dsel, effFrom, to, mill);
//     return (
//       <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={[st.body, wide && st.bodyWide]}>
//         <View style={st.drillHead}>
//           <TouchableOpacity onPress={() => setDsel(null)} hitSlop={HIT}><Text style={st.back}>‹ Designs</Text></TouchableOpacity>
//           <Text style={st.drillTitle}>{dsel}</Text>
//           <Text style={st.drillSub}>challan-wise · {mill === 'ALL' ? 'all mills' : mill}</Text>
//         </View>
//         {Rng}
//         <HScroll on={!!tableMin}>
//           <View style={[st.card, { paddingVertical: 4, minWidth: tableMin, flex: 1 }]}>
//             <HeadRow first="CHALLAN · DATE" />
//             {rows.length === 0 && <Text style={st.emptyRow}>No challans in this range.</Text>}
//             {rows.map((r) => <ChallanLine key={r.t.id} r={r} />)}
//             <View style={[st.row, st.totalRow]}>
//               <Text style={[st.first, { fontWeight: '800', color: T.ink }]}>TOTAL</Text>
//               <Text style={[st.num, st.mono, st.bold, { width: W.out }]}>{fmt(CT.outM)}</Text>
//               <Text style={[st.num, st.mono, st.bold, { width: W.in }]}>{fmt(CT.inM)}</Text>
//               <Text style={[st.num, st.mono, st.bold, { width: W.pend, color: CT.pend > 0 ? AMBER : T.ink }]}>{fmt(CT.pend)}</Text>
//               <Text style={[st.num, st.mono, st.bold, { width: W.short, color: CT.short > 0 ? T.red : T.ink }]}>{fmt(CT.short)}</Text>
//               <Text style={[st.num, st.mono, st.bold, { width: W.pct }]}>{CT.lOut > 0 ? ((CT.short / CT.lOut) * 100).toFixed(1) : '—'}</Text>
//               <Text style={[st.num, st.mono, st.bold, { width: W.amt }]}>{money(CT.inAmt)}</Text>
//             </View>
//           </View>
//         </HScroll>
//         <Text style={st.footer}>
//           Rows are challans outwarded in the range plus earlier challans that received inward in the range (tagged EARLIER
//           OUTWARD — their outward is not counted here). IN and IN ₹ are the period’s receipts on that challan. PEND is what a
//           period outward still has at the mill. SHORT is the shortfall on the lots settled by the period’s receipts — a
//           challan can show both pending and shortage at once.
//         </Text>
//       </ScrollView>
//     );
//   }

//   /* ------------------------------ design-wise ------------------------------ */
//   return (
//     <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={[st.body, wide && st.bodyWide]}>
//       {Rng}
//       <View style={st.sumRow}>
//         <Text style={st.sumRange}>{fmtD(effFrom)} → {fmtD(to)}</Text>
//         <Text style={st.sumText}>
//           {hub.outCount} outward · {hub.inCount} inward{hub.reCount > 0 ? ` · ${hub.reCount} re-dye` : ''}
//         </Text>
//         {outside > 0 && (
//           <Text onPress={showAll} style={st.link}>+{outside} outside range — show all</Text>
//         )}
//         <Text onPress={() => setHelp((h) => !h)} style={[st.link, { marginLeft: 'auto' }]}>ⓘ {help ? 'Hide guide' : 'How to read this'}</Text>
//       </View>
//       {loading && <ActivityIndicator color={T.copper} size="small" />}
//       {!!error && (
//         <TouchableOpacity onPress={() => load(loadFrom)} style={st.errorBox}>
//           <Text style={st.errorText}>{error} — tap to retry</Text>
//         </TouchableOpacity>
//       )}

//       {help && (
//         <View style={[st.card, st.helpCard]}>
//           <Text style={st.helpH}>What Mill Hub shows</Text>
//           <Text style={st.helpP}>
//             Everything sent to outside mills (dye houses / finishers) and everything received back, for the selected dates —
//             built automatically from the status history saved in <Text style={st.bold}>Priority</Text> (Sent for job, Job
//             inward, Lorry Cut) and the outward challans with their lot nos. Nothing is typed here.
//           </Text>
//           <Text style={st.helpH}>Reading a row</Text>
//           <Text style={st.helpP}>
//             <Text style={st.bold}>OUT</Text> — metres outwarded in the range. <Text style={st.bold}>IN</Text> — metres received
//             in the range, whenever they were sent (an earlier outward’s return still counts here). These two are independent.{' '}
//             <Text style={st.bold}>PEND</Text> — of the period’s outwards, what the mill still holds (outward minus what receipts
//             have settled). <Text style={st.bold}>SHORT</Text> — on each receipt, the sent-lot it settles minus what came back;
//             summed for receipts in the period. Pending material never counts, and pending never blocks shortage on lots
//             already returned — a design can show both. <Text style={st.bold}>%</Text> — shortage as a share of the metres
//             settled in the period. <Text style={st.bold}>IN ₹</Text> — job-work value of the period’s receipts (inward rate,
//             else the challan’s rate). <Text style={st.bold}>↻ re-dye</Text> — material sent back after a lorry cut: shown
//             under the design and in the grand total as a separate figure, never added to Outward or Inward (it is the same
//             material going round again); it still counts as pending while at the mill, and any loss on it still counts as
//             shortage.
//           </Text>
//           <Text style={st.helpH}>Drill down</Text>
//           <Text style={st.helpP}>
//             Tap any design → its challan-wise page (which challans, when, how much back, which are short). The{' '}
//             <Text style={st.bold}>GRAND TOTAL</Text> row is the whole mill activity for the range. Use the mill chips to look
//             at one mill; change the dates or use the presets to move the window.
//           </Text>
//         </View>
//       )}

//       {MillChips}

//       <HScroll on={!!tableMin}>
//         <View style={[st.card, { paddingVertical: 4, minWidth: tableMin, flex: 1 }]}>
//           <HeadRow first="DESIGN" />
//           {hub.rows.length === 0 && (
//             <View style={st.emptyBox}>
//               {trips.length === 0 ? (
//                 <Text style={st.emptyText}>
//                   No mill movements recorded yet. This dashboard fills itself from the Priority status sheet — mark a
//                   shade <Text style={st.bold}>Sent for job</Text> (and later <Text style={st.bold}>Job inward</Text>) and it
//                   appears here.
//                 </Text>
//               ) : (
//                 <>
//                   <Text style={st.emptyText}>
//                     No mill activity between <Text style={st.bold}>{fmtD(effFrom)}</Text> and <Text style={st.bold}>{fmtD(to)}</Text>
//                     {mill !== 'ALL' ? ` for ${mill}` : ''}. {hub.moves} movements are recorded between{' '}
//                     <Text style={st.bold}>{fmtD(earliest)}</Text> and <Text style={st.bold}>{fmtD(latest)}</Text>.
//                   </Text>
//                   <TouchableOpacity onPress={showAll} style={st.showAllBtn}>
//                     <Text style={st.showAllText}>Show all recorded activity</Text>
//                   </TouchableOpacity>
//                 </>
//               )}
//             </View>
//           )}
//           {hub.rows.map((r) => <DesignLine key={r.design} r={r} onPress={() => setDsel(r.design)} />)}
//           {hub.rows.length > 0 && <DesignLine r={hub.G} total />}
//         </View>
//       </HScroll>

//       <Text style={st.footer}>
//         Metres = each outward lot's LOT QTY (one challan row per lot, with its own mill); a shade with no lot qty
//         yet uses its order qty (≈ on the challan page). Outward and inward are counted independently by their own dates, over the full history. Pending = period outwards
//         not yet settled by receipts. Shortage = sent-lot minus received on the period’s receipts — never pending material,
//         and never blocked by it. Re-dye trips (after lorry cuts) are shown separately and never inflate Outward or Inward.
//         Tap a design for the challan-wise breakdown.
//       </Text>
//     </ScrollView>
//   );
// }

// /* -------------------------------------------------------------------------- */

// const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

// /** Tables scroll sideways only on narrow phones; elsewhere they fill the width. */
// function HScroll({ on, children }: { on: boolean; children: React.ReactNode }) {
//   if (!on) return <>{children}</>;
//   return (
//     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
//       {children}
//     </ScrollView>
//   );
// }

// function HeadRow({ first }: { first: string }) {
//   return (
//     <View style={[st.row, { paddingVertical: 8 }]}>
//       <Text style={[st.first, st.head]}>{first}</Text>
//       <Text style={[st.num, st.head, { width: W.out }]}>OUT</Text>
//       <Text style={[st.num, st.head, { width: W.in }]}>IN</Text>
//       <Text style={[st.num, st.head, { width: W.pend }]}>PEND</Text>
//       <Text style={[st.num, st.head, { width: W.short }]}>SHORT</Text>
//       <Text style={[st.num, st.head, { width: W.pct }]}>%</Text>
//       <Text style={[st.num, st.head, { width: W.amt }]}>IN ₹</Text>
//     </View>
//   );
// }

// function DesignLine({ r, onPress, total }: { r: MillAgg; onPress?: () => void; total?: boolean }) {
//   const hasRe = r.redye > 0 || r.redyeBack > 0;
//   const Body = (
//     <View style={[st.row, st.line, total && st.totalRow]}>
//       <View style={st.first}>
//         <Text style={[st.designName, total && { fontWeight: '800' }]} numberOfLines={2}>
//           {r.design}{!total && <Text style={{ color: T.copper }}> ›</Text>}
//         </Text>
//         {hasRe && (
//           <Text style={[st.reLine, st.mono]}>
//             ↻ re-dye {fmt(r.redye)} m out · {fmt(r.redyeBack)} m back{total ? ' — not in totals' : ''}
//           </Text>
//         )}
//       </View>
//       <Text style={[st.num, st.mono, total && st.bold, { width: W.out }]}>{fmt(r.outM)}</Text>
//       <Text style={[st.num, st.mono, total && st.bold, { width: W.in }]}>{fmt(r.inM)}</Text>
//       <Text style={[st.num, st.mono, total && st.bold, { width: W.pend, color: r.pend > 0 ? AMBER : total ? T.ink : T.muted }]}>
//         {r.pend > 0 || total ? fmt(r.pend) : '—'}
//       </Text>
//       <Text style={[st.num, st.mono, { width: W.short, color: r.short > 0 ? T.red : T.ink, fontWeight: r.short > 0 || total ? '800' : '400' }]}>
//         {r.lOut > 0 || total ? fmt(r.short) : '—'}
//       </Text>
//       <Text style={[st.num, st.mono, total && st.bold, { width: W.pct, color: r.pct > 5 ? T.red : T.ink }]}>
//         {r.lOut > 0 ? r.pct.toFixed(1) : '—'}
//       </Text>
//       <Text style={[st.num, st.mono, total && st.bold, { width: W.amt }]}>{money(r.inAmt)}</Text>
//     </View>
//   );
//   if (!onPress) return Body;
//   return <TouchableOpacity onPress={onPress} activeOpacity={0.6}>{Body}</TouchableOpacity>;
// }

// const stateColor = (r: ChallanRow) =>
//   r.closed ? (r.shAll > 0 ? T.red : '#2A6044') : r.t.ins.length ? (r.shAll > 0 ? '#B5651D' : AMBER) : '#5A6B7A';

// const infoOf = (t: MillTrip) =>
//   `${t.colour}${t.dyed ? ' D' : ''}${t.finished ? 'F' : ''}${t.lotNo ? ` L·${t.lotNo}` : ''}${t.cuts ? ` ✂${t.cuts}` : ''}`;

// function ChallanLine({ r }: { r: ChallanRow }) {
//   const { t } = r;
//   return (
//     <View style={[st.cRow, r.pct !== null && r.pct > 5 && { backgroundColor: '#FCEDEA' }]}>
//       <View style={st.row}>
//         <View style={st.first}>
//           <Text style={[st.mono, st.cChallan]} numberOfLines={2}>
//             <Text style={st.bold}>{t.challan}</Text> <Text style={{ color: T.muted }}>{fmtD(t.date)}</Text>
//           </Text>
//           <View style={st.tags}>
//             {t.reprocess && <Text style={[st.tag, { color: '#B5651D', backgroundColor: '#FBF1DC' }]}>RE-DYE</Text>}
//             {!r.outIn && <Text style={[st.tag, { color: '#1C567A', backgroundColor: '#E3EEF5' }]}>EARLIER OUTWARD</Text>}
//             {t.implied && <Text style={[st.tag, { color: T.muted, backgroundColor: T.alt }]}>NO SENT ENTRY</Text>}
//           </View>
//         </View>
//         <Text style={[st.num, st.mono, { width: W.out, color: r.outIn ? T.ink : T.muted }]}>{r.outIn ? fmt(t.metres) : '—'}</Text>
//         <Text style={[st.num, st.mono, { width: W.in }]}>{r.inM > 0 ? fmt(r.inM) : '—'}</Text>
//         <Text style={[st.num, st.mono, { width: W.pend, color: (r.pend || 0) > 0 ? AMBER : T.muted }]}>
//           {r.pend !== null && r.pend > 0 ? fmt(r.pend) : '—'}
//         </Text>
//         <Text style={[st.num, st.mono, { width: W.short, color: (r.sh || 0) > 0 ? T.red : T.ink, fontWeight: (r.sh || 0) > 0 ? '800' : '400' }]}>
//           {r.sh !== null ? fmt(r.sh) : '—'}
//         </Text>
//         <Text style={[st.num, st.mono, { width: W.pct, color: r.pct !== null && r.pct > 5 ? T.red : T.ink }]}>
//           {r.pct !== null ? r.pct.toFixed(1) : '—'}
//         </Text>
//         <Text style={[st.num, st.mono, { width: W.amt }]}>{r.inAmt > 0 ? money(r.inAmt) : '—'}</Text>
//       </View>
//       <View style={st.infoRow}>
//         <Text style={[st.stateBadge, { backgroundColor: stateColor(r) }]}>{r.state}</Text>
//         <Text style={st.infoMain}>{infoOf(t)}</Text>
//         <Text style={st.infoText}>
//           {t.mill}{t.chartNo ? ` · chart ${t.chartNo}` : ''}{t.party ? ` · ${t.party}` : ''} · outwarded {t.estimate ? '≈ ' : ''}{fmt(t.metres)} m{t.estimate ? ' (order qty — lot qty not entered)' : ''} ·
//           settled {fmt(r.settled)} m, received {fmt(r.received)} m
//           {t.ins.length ? ` (${t.ins.map((i) => fmtD(i.date)).join(', ')})` : ''}
//           {r.shAll > 0 ? ` · shortage so far ${fmt(r.shAll)} m` : ''}
//           {!r.closed && r.rem > 0 ? ` · ${fmt(r.rem)} m still at mill` : ''}
//         </Text>
//       </View>
//     </View>
//   );
// }

// const st = StyleSheet.create({
//   body: { padding: 12, paddingBottom: 40, gap: 10 },
//   bodyWide: { maxWidth: 1000, width: '100%', alignSelf: 'center', padding: 16 },
//   loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg },
//   mono: { fontFamily: MONO },
//   bold: { fontWeight: '800' },

//   rng: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
//   arrowTxt: { color: T.muted, fontSize: 11 },
//   preset: {
//     borderWidth: 1, borderColor: `${T.copper}44`, backgroundColor: '#F8EFE6', borderRadius: 6,
//     paddingHorizontal: 8, paddingVertical: 4,
//   },
//   presetOn: { backgroundColor: T.copper, borderColor: T.copper },
//   presetText: { fontSize: 9.5, fontWeight: '800', color: T.copper },

//   sumRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
//   sumRange: { fontSize: 11, fontWeight: '800', color: T.ink },
//   sumText: { fontSize: 10, color: T.muted },
//   link: { fontSize: 10.5, fontWeight: '800', color: T.copper },
//   errorBox: { backgroundColor: '#FCEDEA', borderRadius: 8, padding: 9 },
//   errorText: { color: T.red, fontSize: 11.5, fontWeight: '700' },

//   card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
//   helpCard: { paddingHorizontal: 13, paddingVertical: 11, backgroundColor: '#FBF7F2' },
//   helpH: { fontSize: 11, fontWeight: '800', color: T.ink, marginTop: 4, marginBottom: 3 },
//   helpP: { fontSize: 11, lineHeight: 17, color: T.ink },

//   chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
//   chip: { borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
//   chipOn: { borderColor: T.copper, backgroundColor: '#F8EFE6' },
//   chipText: { fontSize: 10, fontWeight: '800', color: T.ink },

//   row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 12 },
//   line: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.alt },
//   totalRow: { borderTopWidth: 2, borderTopColor: T.border, backgroundColor: T.sub, paddingVertical: 11 },
//   head: { fontSize: 8.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
//   first: { flex: 1, minWidth: 0 },
//   num: { textAlign: 'right', fontSize: 11, color: T.ink },
//   designName: { fontSize: 11.5, fontWeight: '700', color: T.ink },
//   reLine: { fontSize: 9, fontWeight: '700', color: '#B5651D', marginTop: 1 },

//   emptyBox: { paddingHorizontal: 14, paddingVertical: 16, alignItems: 'center' },
//   emptyText: { fontSize: 12, lineHeight: 19, color: T.muted, textAlign: 'center' },
//   emptyRow: { padding: 16, textAlign: 'center', color: T.muted, fontSize: 12 },
//   showAllBtn: { marginTop: 9, backgroundColor: T.copper, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
//   showAllText: { color: '#fff', fontSize: 11, fontWeight: '800' },

//   drillHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
//   back: { color: T.copper, fontWeight: '800', fontSize: 12 },
//   drillTitle: { fontSize: 13, fontWeight: '800', color: T.ink },
//   drillSub: { fontSize: 10, color: T.muted },

//   cRow: { borderTopWidth: 1, borderTopColor: T.alt, paddingVertical: 9 },
//   cChallan: { fontSize: 11, color: T.ink },
//   tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
//   tag: { fontSize: 8, fontWeight: '900', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
//   infoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4, paddingHorizontal: 12 },
//   stateBadge: { fontSize: 8, fontWeight: '900', color: '#fff', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
//   infoMain: { fontSize: 9.5, color: '#4b535b', fontWeight: '700' },
//   infoText: { fontSize: 9.5, color: T.muted, flexShrink: 1 },

//   footer: { fontSize: 9.5, color: T.muted, lineHeight: 14 },
// });

// FILE: src/screens/dyeing/MillHubTab.tsx
// Dyeing → Mill Hub (READ-ONLY — never a data-entry screen), built from the
// real job-work entries: job OUTWARD (GRYOut / GRYOutD1 / GRYOutD2) and job
// INWARD (GRYInw / GRYInwD1 / GRYInwD2).
//
//   [from] → [to]  [7d] [Month] [90d] [FY]
//   01 Sep → 28 Sep   14 lots · 6 challans · 9 complete · 3 partial · 2 pending   ⓘ How to read this
//   PARTY [All Parties ⌄]     [All] [Complete] [Partial] [Pending]
//   DESIGN            OUT     IN   PEND  SHORT    %    IN ₹
//   Rib Stop 145 ›   ...
//   GRAND TOTAL
//   tap a design -> challan / lot-wise page (status badge COMPLETE / PARTIAL / PENDING,
//                   shade · chart · lot · party · takas received)
//   tap a lot    -> lot detail: challan header, inward entries, taka-wise OUT vs IN
//
// Source: POST /dyeing/mill_hub_report and /dyeing/mill_hub_lot
// (DyeingMillHubController). Rules in millHubModel.ts — shortage only when
// every taka of the lot has come back.

import { useBusinessContext } from '@/src/core/business';
import { T } from '@/src/theme';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { fmt, MONO } from './DailyUpdateTab';
import { DyeingService } from './dyeingApi';
import { DyeingDateField } from './DyeingDateField';
import { addDaysISO, todayISO } from './dyeingModel';
import {
  buildDesignRows,
  buildItemRows,
  buildKItemRows,
  failMessage,
  KAgg,
  filterLots,
  HubAgg,
  HubLot,
  HubLotDetail,
  lotsOfDesign,
  lotsOfItem,
  LotStatus,
  normalizeLotDetail,
  normalizeLots,
  partiesOf,
  reportMode,
  statusCounts,
  StatusFilter,
} from './millHubModel';

const money = (v: number) => {
  v = +v || 0;
  return v >= 1e5 ? `₹${(v / 1e5).toFixed(2)}L` : v >= 1e3 ? `₹${(v / 1e3).toFixed(1)}K` : `₹${Math.round(v).toLocaleString('en-IN')}`;
};
const m1 = (v: number) => (Math.round((v || 0) * 10) / 10).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtD = (iso: string) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return iso ? `${iso.slice(8, 10)} ${months[Number(iso.slice(5, 7)) - 1]}` : '—';
};
const fmtDY = (iso: string) => (iso ? `${fmtD(iso)} ${iso.slice(2, 4)}` : '—');
/** Indian financial year start (1 Apr) of a date. */
const fyStart = (iso: string) => {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return `${m >= 4 ? y : y - 1}-04-01`;
};
const plural = (k: number, w: string) => `${k} ${w}${k !== 1 ? 's' : ''}`;

const W = { out: 52, in: 52, ret: 48, pend: 48, short: 46, pct: 36, amt: 58 };
const WT = { out: 60, in: 60, ret: 54, diff: 54 }; // taka table
const AMBER = '#C98A1A';
const STATUS_COLOR: Record<LotStatus, string> = { COMPLETE: '#2A6044', PARTIAL: AMBER, PENDING: '#5A6B7A' };

function normalizeInwardMovementLots(response: any): HubLot[] {
  let body: any = response?.data ?? response;
  for (let i = 0; i < 5; i += 1) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) break;
    if (Array.isArray(body.rows)) break;
    const next = body.data ?? body.response ?? body.result;
    if (!next || typeof next !== 'object') break;
    body = next;
  }

  const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];
  const grouped = new Map<string, any>();

  rows.forEach((r) => {
    const unit = String(r.unit || '').toUpperCase();
    const key = `${String(r.outuid || '')}|${String(r.outsrno || '')}|${unit}`;
    let g = grouped.get(key);

    if (!g) {
      g = {
        outuid: r.outuid,
        outsrno: r.outsrno,
        outno: r.outno,
        // In inward mode this is the receipt date, not the original outward date.
        outdate: r.inwdate || '',
        partyname: r.partyname,
        jobname: r.jobname,
        chartno: r.chartno,
        lotno: r.outlotno || r.inlotno,
        dsnname: r.dsnname,
        shdname: r.shdname,
        itmname: r.itmname,
        outtakas: 0,
        recvtakas: 0,
        outmtr: Number(r.outmtr || 0),
        inmtr: 0,
        retmtr: 0,
        pendmtr: 0,
        shortmtr: null,
        shortper: null,
        inamt: 0,
        inwcount: 0,
        lastinw: r.inwdate || '',
        unmatchedin: 0,
        status: r.status || 'PARTIAL',
        unit,
        outannno: r.outannno,
        outqty: Number(r.outqty || 0),
        outkg: Number(r.outkg || 0),
        outmtrq: Number(r.outmtrq || 0),
        inwqty: 0,
        wstqty: 0,
        retqty: 0,
        shtqty: 0,
        excqty: 0,
        balqty: 0,
        rate: Number(r.jobrate || 0),
        balamt: 0,
        inwamt: 0,
      };
      grouped.set(key, g);
    }

    // Sum only inward rows returned for the selected GRYInw.InwDate window.
    g.inmtr += Number(r.inmtr || 0);
    g.inwqty += Number(r.inwqty || 0);
    g.wstqty += Number(r.wstqty || 0);
    g.retqty += Number(r.retqty || 0);
    g.shtqty += Number(r.shtqty || 0);
    g.excqty += Number(r.excqty || 0);
    g.inamt += Number(r.jobamt || 0);
    g.inwamt += Number(r.jobamt || 0);
    g.inwcount += 1;
    g.recvtakas += Number(r.takas || 0);

    const receiptDate = String(r.inwdate || '');
    if (receiptDate > String(g.lastinw || '')) {
      g.lastinw = receiptDate;
      g.outdate = receiptDate;
    }
  });

  return normalizeLots({
    success: true,
    data: { mode: body?.mode, lots: [...grouped.values()] },
  });
}

export function MillHubTab() {
  const { prpGroup, yearNo, isReady } = useBusinessContext();
  const today = todayISO();
  const monthStart = `${today.slice(0, 8)}01`;
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const narrow = width < 420;

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [direction, setDirection] = useState<'outward' | 'inward'>('outward');
  const [lots, setLots] = useState<HubLot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [party, setParty] = useState('ALL');
  const [partyOpen, setPartyOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter>('COMPLETE');
  const [isel, setIsel] = useState<string | null>(null);   // item (parent level)
  const [dsel, setDsel] = useState<string | null>(null);   // design inside that item
  const [lsel, setLsel] = useState<HubLot | null>(null);
  /** 'K' = property type K rules from the server (item-wise summary in MTR / KG blocks); 'S' = as before */
  const [mode, setMode] = useState<'K' | 'S'>('S');
  const statusTouched = useRef(false);
  const reqId = useRef(0);

  const load = useCallback(async (f: string, t: string) => {
    if (!isReady) { setLoading(false); return; }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const body = { prptype: prpGroup, yearno: yearNo, fromdate: f, todate: t, direction };
      console.log('[Dyeing/MillHub] request ->', body);
      const response: any = await DyeingService.millHubReport(body);
      if (id !== reqId.current) return;
      const fail = failMessage(response);
      if (fail) throw new Error(fail);
      const md = reportMode(response);
      setMode(md);
      if (direction === 'inward') {
        // Keep the same HubLot/table/drill-down UI; only the report date basis changes.
        setLots(normalizeInwardMovementLots(response));
        setStatus('ALL');
      } else {
        if (md === 'K' && !statusTouched.current) setStatus('ALL');
        setLots(normalizeLots(response));
      }
      setLoaded(true);
    } catch (err: any) {
      if (id !== reqId.current) return;
      setLots([]);
      setError(err?.response?.data?.message || err?.message || 'Unable to load mill hub.');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [isReady, prpGroup, yearNo, direction]);

  const rangeRef = useRef({ from, to });
  rangeRef.current = { from, to };
  useFocusEffect(useCallback(() => { void load(rangeRef.current.from, rangeRef.current.to); }, [load]));

  const setRange = (f: string, t: string) => {
    const nt = t > today ? today : t;
    const nf = f > nt ? nt : f;
    setFrom(nf);
    setTo(nt);
    setIsel(null);
    setDsel(null);
    setLsel(null);
    void load(nf, nt);
  };

  const partyOptions = useMemo(() => partiesOf(lots), [lots]);
  const partyLots = useMemo(() => filterLots(lots, party, 'ALL'), [lots, party]);
  const counts = useMemo(() => statusCounts(partyLots), [partyLots]);
  const shown = useMemo(() => filterLots(lots, party, status), [lots, party, status]);
  const items = useMemo(() => buildItemRows(shown), [shown]);
  const isK = mode === 'K';
  const kBlocks = useMemo(() => (isK ? buildKItemRows(shown) : []), [isK, shown]);
  const itemLots = useMemo(() => (isel ? lotsOfItem(shown, isel) : []), [shown, isel]);
  const hub = useMemo(() => buildDesignRows(itemLots), [itemLots]);
  const challans = useMemo(() => new Set(shown.map((l) => l.outUId)).size, [shown]);

  const tableMin = narrow ? 470 : undefined;

  const Rng = (
    <View style={st.rng}>
      <DyeingDateField value={from} onChange={(v) => setRange(v, to)} compact />
      <Text style={st.arrowTxt}>→</Text>
      <DyeingDateField value={to} onChange={(v) => setRange(from, v)} compact />
      {([['7d', addDaysISO(today, -7)], ['Month', monthStart], ['90d', addDaysISO(today, -90)], ['FY', fyStart(today)]] as const).map(([l, f]) => {
        const on = from === f && to === today;
        return (
          <TouchableOpacity key={l} onPress={() => setRange(f, today)} style={[st.preset, on && st.presetOn]}>
            <Text style={[st.presetText, on && { color: '#fff' }]}>{l}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (loading && !loaded) {
    return <View style={st.loading}><ActivityIndicator color={T.copper} /></View>;
  }

  /* ------------------------------ lot detail ------------------------------ */
  if (lsel) {
    return (
      <LotDetailPage
        key={lsel.key}
        lot={lsel}
        prptype={prpGroup}
        yearno={yearNo}
        onBack={() => setLsel(null)}
        wide={wide}
        narrow={narrow}
      />
    );
  }

  /* --------------- K: item → outward lines directly (no design level) --------------- */
  if (isK && isel) {
    const rows = [...itemLots].sort((a, b) => b.outDate.localeCompare(a.outDate) || b.outNo.localeCompare(a.outNo));
    const CT = buildDesignRows(rows).G;
    const kTot = buildKItemRows(rows)[0];
    return (
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={[st.body, wide && st.bodyWide]}>
        <View style={st.drillHead}>
          <TouchableOpacity onPress={() => setIsel(null)} hitSlop={HIT}><Text style={st.back}>‹ Items</Text></TouchableOpacity>
          <Text style={st.drillTitle}>{isel}</Text>
          <Text style={st.drillSub}>
            challan / annexure-wise · {party === 'ALL' ? 'all parties' : party}{status !== 'ALL' ? ` · ${status.toLowerCase()} only` : ''}
          </Text>
        </View>
        {Rng}
        {!!kTot && (
          <HScroll on={width < 860}>
            <View style={[st.card, { paddingVertical: 4, minWidth: width < 860 ? (kTot.unit === 'MTR' ? 820 : 760) : undefined }]}>
              <KHeadRow unit={kTot.unit} />
              <KItemLine r={{ ...kTot.G, item: `TOTAL · ${isel}` }} total />
            </View>
          </HScroll>
        )}
        <HScroll on={!!tableMin}>
          <View style={[st.card, { paddingVertical: 4, minWidth: tableMin }]}>
            <HeadRow first="CHALLAN · DATE" k />
            {rows.length === 0 && <Text style={st.emptyRow}>No outward lines in this range.</Text>}
            {rows.map((l) => <LotLine key={l.key} l={l} k onPress={() => setLsel(l)} />)}
            {rows.length > 0 && <DesignLine r={{ ...CT, design: `TOTAL · ${plural(rows.length, 'line')}` }} total />}
          </View>
        </HScroll>
        <Text style={st.footer}>
          One row per outward line (annexure). OUT = quantity sent ({isel.endsWith('· MTR') ? 'metres' : 'kg'}), IN = inward + return,
          BAL = OUT − inward − waste − return − short − excess, LOSS = waste + short (once nothing is left), IN ₹ = inward × rate.
          Tap a line for its inward entries and the whole annexure.
        </Text>
      </ScrollView>
    );
  }

  /* ------------------------------ lot-wise -------------------------------- */
  if (dsel) {
    const rows = lotsOfDesign(itemLots, dsel);
    const CT = buildDesignRows(rows).G;
    return (
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={[st.body, wide && st.bodyWide]}>
        <View style={st.drillHead}>
          <TouchableOpacity onPress={() => setDsel(null)} hitSlop={HIT}><Text style={st.back}>‹ {isel}</Text></TouchableOpacity>
          <Text style={st.drillTitle}>{dsel}</Text>
          <Text style={st.drillSub}>
            {isel} · challan / lot-wise · {party === 'ALL' ? 'all parties' : party}{status !== 'ALL' ? ` · ${status.toLowerCase()} only` : ''}
          </Text>
        </View>
        {Rng}
        <HScroll on={!!tableMin}>
          <View style={[st.card, { paddingVertical: 4, minWidth: tableMin }]}>
            <HeadRow first="CHALLAN · DATE" k={isK} />
            {rows.length === 0 && <Text style={st.emptyRow}>No outward lots in this range.</Text>}
            {rows.map((l) => <LotLine key={l.key} l={l} k={isK} onPress={() => setLsel(l)} />)}
            {rows.length > 0 && <DesignLine r={{ ...CT, design: `TOTAL · ${plural(rows.length, 'lot')}` }} total />}
          </View>
        </HScroll>
        {isK ? (
          <Text style={st.footer}>
            One row per outward line (annexure). OUT = quantity sent ({isel?.endsWith('· MTR') ? 'metres' : 'kg'}), IN = inward + return,
            BAL = OUT − inward − waste − return − short − excess, LOSS = waste + short (once nothing is left), IN ₹ = inward × rate.
            Tap a line for its inward entries and the whole annexure.
          </Text>
        ) : (
          <Text style={st.footer}>
            One row per outward lot (job outward item line). OUT = metres sent, IN = metres received back so far, PEND = metres of
            takas not yet received. SHORT and % are worked out only when every taka of the lot has come back (COMPLETE).
            Tap a lot for its challan details, inward entries and taka-wise out vs in.
          </Text>
        )}
      </ScrollView>
    );
  }

  /* ------------------------- item-wise → design-wise ------------------------- */
  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={[st.body, wide && st.bodyWide]}>
      {isel ? (
        <View style={st.drillHead}>
          <TouchableOpacity onPress={() => setIsel(null)} hitSlop={HIT}><Text style={st.back}>‹ Items</Text></TouchableOpacity>
          <Text style={st.drillTitle}>{isel}</Text>
          <Text style={st.drillSub}>design-wise · {party === 'ALL' ? 'all parties' : party}{status !== 'ALL' ? ` · ${status.toLowerCase()} only` : ''}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        {([['outward', 'OUTWARD DATE'], ['inward', 'INWARD DATE']] as const).map(([key, label]) => {
          const active = direction === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => {
                statusTouched.current = false;
                setStatus('ALL');
                setDirection(key);
                setIsel(null);
                setDsel(null);
                setLsel(null);
              }}
              style={[st.preset, active && st.presetOn]}
              activeOpacity={0.75}
            >
              <Text style={[st.presetText, active && { color: '#fff' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {Rng}
      <View style={st.sumRow}>
        <Text style={st.sumRange}>{fmtD(from)} → {fmtD(to)}</Text>
        <Text style={st.sumText}>
          {plural(shown.length, 'lot')} · {plural(challans, 'challan')} · {counts.COMPLETE} complete · {counts.PARTIAL} partial · {counts.PENDING} pending
        </Text>
        <Text onPress={() => setHelp((h) => !h)} style={[st.link, { marginLeft: 'auto' }]}>ⓘ {help ? 'Hide guide' : 'How to read this'}</Text>
      </View>
      {loading && <ActivityIndicator color={T.copper} size="small" />}
      {!!error && (
        <TouchableOpacity onPress={() => load(from, to)} style={st.errorBox}>
          <Text style={st.errorText}>{error} — tap to retry</Text>
        </TouchableOpacity>
      )}

      {help && (
        <View style={[st.card, st.helpCard]}>
          <Text style={st.helpH}>What Mill Hub shows</Text>
          <Text style={st.helpP}>
            OUTWARD DATE shows job outward lots by GRYOut.OutDate. INWARD DATE shows linked receipts by GRYInw.InwDate.
            Both views use the same item, design, party, status and challan drill-down UI. Nothing is typed here.
          </Text>
          <Text style={st.helpH}>Reading a row</Text>
          <Text style={st.helpP}>
            <Text style={st.bold}>OUT</Text> — metres sent on the outward takas. <Text style={st.bold}>IN</Text> — metres received
            back on the inward takas linked to them (whatever the inward date). <Text style={st.bold}>PEND</Text> — metres of outward
            takas that have not come back yet. <Text style={st.bold}>SHORT</Text> — OUT minus IN, counted only for a lot whose every
            taka has come back (COMPLETE); a PARTIAL or PENDING lot never shows shortage. <Text style={st.bold}>%</Text> — shortage as
            a share of the outward metres of the completed lots. <Text style={st.bold}>IN ₹</Text> — job amount of the inward entries.
          </Text>
          <Text style={st.helpH}>Drill down</Text>
          <Text style={st.helpP}>
            Tap an item → its designs. Tap a design → its outward lots (challan no., date, shade, chart no., party, takas received). Tap a lot → the challan
            details, its inward entries and the taka-wise list of what was sent and what came back. Use the party box and the
            status chips to narrow the view; change the dates or use the presets to move the window.
          </Text>
        </View>
      )}

      <View style={st.filterRow}>
        <PartySelector
          value={party}
          options={partyOptions}
          open={partyOpen}
          onOpen={() => setPartyOpen(true)}
          onClose={() => setPartyOpen(false)}
          onChange={(value) => {
            setParty(value);
            setPartyOpen(false);
          }}
        />
        <View style={st.chips}>
          {([['ALL', `All ${partyLots.length}`], ['COMPLETE', `Complete ${counts.COMPLETE}`], ['PARTIAL', `Partial ${counts.PARTIAL}`], ['PENDING', `Pending ${counts.PENDING}`]] as [StatusFilter, string][]).map(([k, l]) => {
            const on = status === k;
            return (
              <TouchableOpacity key={k} onPress={() => { statusTouched.current = true; setStatus(k); }} style={[st.chip, on && st.chipOn]}>
                <Text style={[st.chipText, on && { color: T.copper }]}>{l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isK && !isel ? (
        <>
          {kBlocks.length === 0 && !loading && !error && (
            <View style={[st.card, st.emptyBox]}>
              <Text style={st.emptyText}>
                No job outward (with annexure) between <Text style={st.bold}>{fmtD(from)}</Text> and <Text style={st.bold}>{fmtD(to)}</Text>
                {party !== 'ALL' ? ` for ${party}` : ''}{status !== 'ALL' ? ` (${status.toLowerCase()})` : ''}.
              </Text>
              {from !== fyStart(today) && (
                <TouchableOpacity onPress={() => setRange(fyStart(today), today)} style={st.showAllBtn}>
                  <Text style={st.showAllText}>Show this financial year</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {kBlocks.map((b) => (
            <View key={b.unit}>
              <Text style={st.section}>{b.unit === 'MTR' ? 'ITEMS IN METRES (amount on mtr)' : 'ITEMS IN KG (amount on kg)'}</Text>
              <HScroll on={width < 860}>
                <View style={[st.card, { paddingVertical: 4, minWidth: width < 860 ? (b.unit === 'MTR' ? 820 : 760) : undefined }]}>
                  <KHeadRow unit={b.unit} />
                  {b.rows.map((r) => <KItemLine key={r.key} r={r} onPress={() => setIsel(r.key)} />)}
                  <KItemLine r={b.G} total />
                </View>
              </HScroll>
            </View>
          ))}
          <Text style={st.footer}>
            Property type K: job outward with an annexure no., unit by the amount basis of the line — MTR and KG are shown in
            separate blocks and never added together. INW / WASTE come from inward entries, RET from return entries, SHORT /
            EXCESS from the short weight. BAL = OUT − INW − WASTE − RET − SHORT − EXCESS (never below 0), BAL ₹ = BAL × rate.
            Tap an item for its outward lines, then a line for its inward entries.
          </Text>
        </>
      ) : (
      <>
      <HScroll on={!!tableMin}>
        <View style={[st.card, { paddingVertical: 4, minWidth: tableMin }]}>
          <HeadRow first={isel ? 'DESIGN' : 'ITEM'} k={isK} />
          {(isel ? hub.rows : items.rows).length === 0 && !loading && !error && (
            <View style={st.emptyBox}>
              <Text style={st.emptyText}>
                No job outward between <Text style={st.bold}>{fmtD(from)}</Text> and <Text style={st.bold}>{fmtD(to)}</Text>
                {party !== 'ALL' ? ` for ${party}` : ''}{status !== 'ALL' ? ` (${status.toLowerCase()})` : ''}.
              </Text>
              {from !== fyStart(today) && (
                <TouchableOpacity onPress={() => setRange(fyStart(today), today)} style={st.showAllBtn}>
                  <Text style={st.showAllText}>Show this financial year</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {isel ? (
            <>
              {hub.rows.map((r) => <DesignLine key={r.design} r={r} onPress={() => setDsel(r.design)} />)}
              {hub.rows.length > 0 && <DesignLine r={{ ...hub.G, design: `TOTAL · ${isel}` }} total />}
            </>
          ) : (
            <>
              {items.rows.map((r) => <DesignLine key={r.design} r={r} onPress={() => setIsel(r.design)} />)}
              {items.rows.length > 0 && <DesignLine r={items.G} total />}
            </>
          )}
        </View>
      </HScroll>

      {isK ? (
        <Text style={st.footer}>
          OUT = quantity sent, IN = inward + return, BAL = what is still at the mill, LOSS = waste + short (once nothing is
          left), IN ₹ = inward × rate. Tap a design for its outward lines.
        </Text>
      ) : (
        <Text style={st.footer}>
          {direction === 'outward'
            ? 'Outward view is filtered by GRYOut.OutDate; linked inward history is included in the lot totals.'
            : 'Inward view is filtered by GRYInw.InwDate; received quantities and job amounts include only receipts in the selected date range.'}
          Shortage = outward − inward metres, only for lots whose every taka is back. Pending = takas still at the mill.
          {isel ? ' Tap a design for the lot-wise breakdown.' : ' Tap an item for its designs, then a design for the lot-wise breakdown.'}
        </Text>
      )}
      </>
      )}
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/*  lot detail (3rd level, on click of a lot)                                  */
/* -------------------------------------------------------------------------- */

function LotDetailPage({
  lot, prptype, yearno, onBack, wide, narrow,
}: {
  lot: HubLot;
  prptype: string;
  yearno: string | number;
  onBack: () => void;
  wide: boolean;
  narrow: boolean;
}) {
  const [detail, setDetail] = useState<HubLotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await DyeingService.millHubLot({ prptype, yearno, outuid: lot.outUId, outsrno: lot.outSrNo }, lot);
      const fail = failMessage(response);
      if (fail) throw new Error(fail);
      setDetail(normalizeLotDetail(response));
    } catch (err: any) {
      setDetail(null);
      setError(err?.response?.data?.message || err?.message || 'Unable to load lot detail.');
    } finally {
      setLoading(false);
    }
  }, [prptype, yearno, lot]);

  useEffect(() => { void load(); }, [load]);

  const takas = (detail?.takas || []).filter((t) => !onlyPending || !t.received);

  /* ---------------- property type K: one outward line + its inward entries + annexure ---------------- */
  if (lot.unit) {
    const u = lot.unit === 'MTR' ? 'm' : 'kg';
    const q = (v: number) => `${m1(v)} ${u}`;
    const kFacts: [string, string][] = [
      ['Outward no.', lot.outNo || '—'],
      ['Annexure no.', lot.annNo || '—'],
      ['Outward date', fmtDY(lot.outDate)],
      ['Party (mill)', lot.party],
      ['Job', lot.jobName || '—'],
      ['Item', lot.item || '—'],
      ['Shade', lot.shade || '—'],
      ['Merge', lot.merge || '—'],
      ['Grade', lot.grade || '—'],
      ['Department', lot.dept || '—'],
      ['Amount on', lot.unit === 'MTR' ? `metres (also ${m1(lot.outKg)} kg)` : `kg${lot.outMtrQ ? ` (also ${m1(lot.outMtrQ)} m)` : ''}`],
      ['Rate', lot.rate ? `₹${lot.rate}` : '—'],
      ['Balance ₹', lot.balAmt ? money(lot.balAmt) : '—'],
      ['Last inward', fmtDY(lot.lastInw)],
      ['Remark', lot.remark || '—'],
    ];
    return (
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={[st.body, wide && st.bodyWide]}>
        <View style={st.drillHead}>
          <TouchableOpacity onPress={onBack} hitSlop={HIT}><Text style={st.back}>‹ {lot.item || 'Items'}</Text></TouchableOpacity>
        </View>
        <View style={st.titleRow}>
          <Text style={st.lotTitle}>{lot.outNo}{lot.annNo ? ` · annexure ${lot.annNo}` : ''} · {lot.unit}</Text>
          <Text style={[st.stateBadge, { backgroundColor: STATUS_COLOR[lot.status] }]}>{lot.status}</Text>
        </View>

        <View style={st.stats}>
          <Stat label="Outward" value={q(lot.outQ)} />
          <Stat label="Inward + return" value={q(lot.inwQ + lot.retQ)} />
          <Stat label="Balance at mill" value={q(lot.balQ)} color={lot.balQ > 0 ? AMBER : undefined} />
          <Stat label="Waste + short" value={q(lot.wstQ + lot.shtQ)} color={lot.wstQ + lot.shtQ > 0 ? T.red : undefined} />
        </View>

        <View style={[st.card, st.factsCard]}>
          {kFacts.map(([k, v]) => (
            <View key={k} style={[st.fact, wide && { width: '25%' }]}>
              <Text style={st.factK}>{k}</Text>
              <Text style={st.factV} numberOfLines={2}>{v}</Text>
            </View>
          ))}
        </View>

        {loading && <ActivityIndicator color={T.copper} size="small" />}
        {!!error && (
          <TouchableOpacity onPress={load} style={st.errorBox}>
            <Text style={st.errorText}>{error} — tap to retry</Text>
          </TouchableOpacity>
        )}

        {!!detail && (
          <>
            <Text style={st.section}>INWARD / RETURN ENTRIES ({lot.unit})</Text>
            <HScroll on={narrow}>
              <View style={[st.card, { paddingVertical: 4, minWidth: narrow ? 520 : undefined }]}>
                <View style={[st.row, { paddingVertical: 8 }]}>
                  <Text style={[st.first, st.head]}>ENTRY · DATE</Text>
                  <Text style={[st.num, st.head, { width: 60 }]}>INW</Text>
                  <Text style={[st.num, st.head, { width: 54 }]}>WASTE</Text>
                  <Text style={[st.num, st.head, { width: 54 }]}>SHORT</Text>
                  <Text style={[st.num, st.head, { width: 54 }]}>RET</Text>
                  <Text style={[st.num, st.head, { width: 60 }]}>INW ₹</Text>
                </View>
                {detail.inwards.length === 0 && <Text style={st.emptyRow}>Nothing received against this line yet.</Text>}
                {detail.inwards.map((i, k) => (
                  <View key={`${i.inwNo}-${k}`} style={[st.row, st.line]}>
                    <View style={st.first}>
                      <Text style={[st.mono, st.cChallan]}><Text style={st.bold}>{i.inwNo}</Text> <Text style={{ color: T.muted }}>{fmtDY(i.inwDate)}</Text></Text>
                      <Text style={st.infoText}>
                        {[i.typeName, i.chalNo ? `challan ${i.chalNo}` : '', i.billNo ? `bill ${i.billNo}` : '', i.excQ > 0 ? `excess ${m1(i.excQ)}` : ''].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Text style={[st.num, st.mono, { width: 60 }]}>{i.inwQ ? m1(i.inwQ) : '—'}</Text>
                    <Text style={[st.num, st.mono, { width: 54 }]}>{i.wstQ ? m1(i.wstQ) : '—'}</Text>
                    <Text style={[st.num, st.mono, { width: 54, color: i.shtQ > 0 ? T.red : T.ink }]}>{i.shtQ ? m1(i.shtQ) : '—'}</Text>
                    <Text style={[st.num, st.mono, { width: 54 }]}>{i.retQ ? m1(i.retQ) : '—'}</Text>
                    <Text style={[st.num, st.mono, { width: 60 }]}>{i.jobAmt ? money(i.jobAmt) : '—'}</Text>
                  </View>
                ))}
              </View>
            </HScroll>

            {detail.annexure.length > 0 && (
              <>
                <Text style={st.section}>
                  ANNEXURE {lot.annNo} · {plural(detail.annexure.length, 'line')}
                  {detail.annexureBal !== null ? ` · annexure balance ${m1(detail.annexureBal)}` : ''}
                </Text>
                <View style={[st.card, { paddingVertical: 4 }]}>
                  {detail.annexure.map((a) => {
                    const me = a.outUId === lot.outUId && a.outSrNo === lot.outSrNo;
                    return (
                      <View key={`${a.outUId}-${a.outSrNo}`} style={[st.row, st.line, me && { backgroundColor: '#FBF6EC' }]}>
                        <View style={st.first}>
                          <Text style={[st.mono, st.cChallan]}><Text style={st.bold}>{a.outNo}</Text> <Text style={{ color: T.muted }}>{fmtDY(a.outDate)}</Text></Text>
                          <Text style={st.infoText} numberOfLines={1}>{[a.item, a.shade, a.unit, a.status.toLowerCase()].filter(Boolean).join(' · ')}</Text>
                        </View>
                        <Text style={[st.num, st.mono, { width: 64 }]}>{m1(a.outQ)}</Text>
                        <Text style={[st.num, st.mono, { width: 64, color: a.balQ > 0 ? AMBER : T.ink }]}>{a.balQ > 0 ? m1(a.balQ) : '—'}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        <Text style={st.footer}>
          BAL = outward − inward − waste − return − short − excess (never below 0). The annexure balance is the same sum over all
          lines of the annexure, as in the job-work pending report.
        </Text>
      </ScrollView>
    );
  }
  const facts: [string, string][] = [
    ['Outward no.', lot.outNo || '—'],
    ['Outward date', fmtDY(lot.outDate)],
    ['Party (mill)', lot.party],
    ['Job', lot.jobName || '—'],
    ['Chart no.', lot.chartNo || '—'],
    ['Lot no.', lot.lotNo || '—'],
    ['Design', lot.design],
    ['Shade', lot.shade || '—'],
    ['Item', lot.item || '—'],
    ['Customer', lot.customer || '—'],
    ['Takas back', `${lot.recvTakas} of ${lot.outTakas}${lot.retTakas ? ` (${lot.retTakas} returned)` : ''}`],
    ['Last inward', fmtDY(lot.lastInw)],
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={[st.body, wide && st.bodyWide]}>
      <View style={st.drillHead}>
        <TouchableOpacity onPress={onBack} hitSlop={HIT}><Text style={st.back}>‹ {lot.design}</Text></TouchableOpacity>
      </View>
      <View style={st.titleRow}>
        <Text style={st.lotTitle}>{lot.outNo} · {lot.shade || lot.design}</Text>
        <Text style={[st.stateBadge, { backgroundColor: STATUS_COLOR[lot.status] }]}>{lot.status}</Text>
      </View>

      <View style={st.stats}>
        <Stat label="Outward" value={`${m1(lot.outM)} m`} />
        <Stat label="Inward" value={`${m1(lot.inM)} m`} />
        <Stat label="Returned" value={lot.retM > 0 ? `${m1(lot.retM)} m` : '—'} />
        <Stat label="Pending" value={`${m1(lot.pend)} m`} color={lot.pend > 0 ? AMBER : undefined} />
        <Stat
          label={lot.short === null ? 'Shortage (on completion)' : 'Shortage'}
          value={lot.short === null ? '—' : `${m1(lot.short)} m · ${(lot.pct || 0).toFixed(1)}%`}
          color={lot.short !== null && (lot.pct || 0) > 5 ? T.red : undefined}
        />
      </View>

      <View style={[st.card, st.factsCard]}>
        {facts.map(([k, v]) => (
          <View key={k} style={[st.fact, wide && { width: '25%' }]}>
            <Text style={st.factK}>{k}</Text>
            <Text style={st.factV} numberOfLines={2}>{v}</Text>
          </View>
        ))}
      </View>

      {loading && <ActivityIndicator color={T.copper} size="small" />}
      {!!error && (
        <TouchableOpacity onPress={load} style={st.errorBox}>
          <Text style={st.errorText}>{error} — tap to retry</Text>
        </TouchableOpacity>
      )}

      {!!detail && (
        <>
          <Text style={st.section}>INWARD ENTRIES</Text>
          <View style={[st.card, { paddingVertical: 4 }]}>
            {detail.inwards.length === 0 && <Text style={st.emptyRow}>Nothing received against this lot yet.</Text>}
            {detail.inwards.map((i, k) => (
              <View key={`${i.inwNo}-${k}`} style={[st.row, st.line]}>
                <View style={st.first}>
                  <Text style={[st.mono, st.cChallan]}><Text style={st.bold}>{i.inwNo}</Text> <Text style={{ color: T.muted }}>{fmtDY(i.inwDate)}</Text></Text>
                  <Text style={st.infoText}>
                    {[i.chalNo ? `challan ${i.chalNo}` : '', i.lotNo ? `lot ${i.lotNo}` : '', plural(i.takas, 'taka'), i.jobRate ? `rate ₹${i.jobRate}` : ''].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text style={[st.num, st.mono, { width: 70 }]}>{m1(i.inM)} m</Text>
                <Text style={[st.num, st.mono, { width: 64 }]}>{money(i.jobAmt)}</Text>
              </View>
            ))}
          </View>

          {detail.returns.length > 0 && (
            <>
              <Text style={st.section}>RETURN ENTRIES (job outward return)</Text>
              <View style={[st.card, { paddingVertical: 4 }]}>
                {detail.returns.map((r, k) => (
                  <View key={`${r.retNo}-${k}`} style={[st.row, st.line]}>
                    <View style={st.first}>
                      <Text style={[st.mono, st.cChallan]}><Text style={st.bold}>{r.retNo || '—'}</Text> <Text style={{ color: T.muted }}>{fmtDY(r.retDate)}</Text></Text>
                      <Text style={st.infoText}>{[r.chalNo ? `challan ${r.chalNo}` : '', plural(r.takas, 'taka')].filter(Boolean).join(' · ')}</Text>
                    </View>
                    <Text style={[st.num, st.mono, { width: 70 }]}>{m1(r.retM)} m</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={st.sectionRow}>
            <Text style={st.section}>TAKA-WISE · {detail.takas.filter((t) => t.received).length} of {detail.takas.length} back</Text>
            {detail.takas.some((t) => !t.received) && (
              <TouchableOpacity onPress={() => setOnlyPending((p) => !p)} style={[st.chip, onlyPending && st.chipOn]}>
                <Text style={[st.chipText, onlyPending && { color: T.copper }]}>Not received only</Text>
              </TouchableOpacity>
            )}
          </View>
          <HScroll on={narrow}>
            <View style={[st.card, { paddingVertical: 4, minWidth: narrow ? 440 : undefined }]}>
              <View style={[st.row, { paddingVertical: 8 }]}>
                <Text style={[st.first, st.head]}>TAKA · INWARD</Text>
                <Text style={[st.num, st.head, { width: WT.out }]}>OUT</Text>
                <Text style={[st.num, st.head, { width: WT.in }]}>IN</Text>
                <Text style={[st.num, st.head, { width: WT.ret }]}>RET</Text>
                <Text style={[st.num, st.head, { width: WT.diff }]}>DIFF</Text>
              </View>
              {takas.length === 0 && <Text style={st.emptyRow}>No taka detail on this outward lot.</Text>}
              {takas.map((t, k) => (
                <View key={`${t.takaNo}-${k}`} style={[st.row, st.line, !t.received && { backgroundColor: '#FBF6EC' }]}>
                  <View style={st.first}>
                    <Text style={[st.mono, st.cChallan, st.bold]}>{t.takaNo || '—'}</Text>
                    <Text style={st.infoText} numberOfLines={1}>
                      {t.received
                        ? [t.inwNo, t.inwDate ? t.inwDate.split(', ').map(fmtDY).join(', ') : '', t.returned ? `returned ${t.retNo} ${t.retDate.split(', ').map(fmtDY).join(', ')}` : '']
                            .filter(Boolean).join(' · ')
                        : 'not received yet'}
                    </Text>
                  </View>
                  <Text style={[st.num, st.mono, { width: WT.out }]}>{m1(t.outM)}</Text>
                  <Text style={[st.num, st.mono, { width: WT.in, color: t.inM > 0 ? T.ink : T.muted }]}>{t.inM > 0 ? m1(t.inM) : '—'}</Text>
                  <Text style={[st.num, st.mono, { width: WT.ret, color: t.retM > 0 ? T.ink : T.muted }]}>{t.retM > 0 ? m1(t.retM) : '—'}</Text>
                  <Text style={[st.num, st.mono, { width: WT.diff, color: (t.diff || 0) > 0 ? T.red : T.ink, fontWeight: (t.diff || 0) > 0 ? '800' : '400' }]}>
                    {t.diff === null ? '—' : m1(t.diff)}
                  </Text>
                </View>
              ))}
            </View>
          </HScroll>

          {detail.unmatched.length > 0 && (
            <Text style={[st.footer, { color: T.red }]}>
              {plural(detail.unmatched.length, 'inward taka')} linked to this lot could not be matched to an outward taka
              ({detail.unmatched.map((u) => `${u.takaNo || '—'} ${m1(u.inM)} m`).join(', ')}) — counted in IN, not in the taka list.
            </Text>
          )}
        </>
      )}

      <Text style={st.footer}>
        DIFF = outward minus inward minus returned metres of the taka. A returned taka counts as back. Shortage of the lot
        (outward − inward − returned) is shown only when every taka has come back.
      </Text>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

/** Tables scroll sideways only on narrow phones; elsewhere they fill the width. */
function HScroll({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  // flexGrow 0 on the scroll view itself: inside the page's vertical ScrollView a horizontal ScrollView would
  // otherwise grow to the full page height (big empty gap under the table on web)
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ flexGrow: 1 }}>
      {children}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={st.stat}>
      <Text style={[st.statValue, st.mono, !!color && { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function PartySelector({
  value,
  options,
  open,
  onOpen,
  onClose,
  onChange,
}: {
  value: string;
  options: string[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const label = value === 'ALL' ? 'All Parties' : value;

  return (
    <>
      <View style={st.partyWrap}>
        <Text style={st.partyLabel}>PARTY</Text>
        <TouchableOpacity
          onPress={onOpen}
          activeOpacity={0.75}
          style={st.partySelect}
        >
          <Text style={st.partyValue} numberOfLines={1}>{label}</Text>
          <Text style={st.partyChevron}>⌄</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={st.partyOverlay}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={st.partyModal}>
            <View style={st.partyModalHead}>
              <Text style={st.partyModalTitle}>Select Party</Text>
              <TouchableOpacity onPress={onClose} hitSlop={HIT}>
                <Text style={st.partyClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={st.partyList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {['ALL', ...options].map((item) => {
                const selected = value === item;
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => onChange(item)}
                    style={[st.partyOption, selected && st.partyOptionOn]}
                  >
                    <Text
                      style={[st.partyOptionText, selected && st.partyOptionTextOn]}
                      numberOfLines={2}
                    >
                      {item === 'ALL' ? 'All Parties' : item}
                    </Text>
                    {selected && <Text style={st.partyCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
              {options.length === 0 && (
                <Text style={st.partyEmpty}>No party found in the loaded outwards.</Text>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function HeadRow({ first, k }: { first: string; k?: boolean }) {
  return (
    <View style={[st.row, { paddingVertical: 8 }]}>
      <Text style={[st.first, st.head]}>{first}</Text>
      <Text style={[st.num, st.head, { width: W.out }]}>OUT</Text>
      <Text style={[st.num, st.head, { width: W.in }]}>IN</Text>
      <Text style={[st.num, st.head, { width: W.ret }]}>RET</Text>
      <Text style={[st.num, st.head, { width: W.pend }]}>{k ? 'BAL' : 'PEND'}</Text>
      <Text style={[st.num, st.head, { width: W.short }]}>{k ? 'LOSS' : 'SHORT'}</Text>
      <Text style={[st.num, st.head, { width: W.pct }]}>%</Text>
      <Text style={[st.num, st.head, { width: W.amt }]}>IN ₹</Text>
    </View>
  );
}

function DesignLine({ r, onPress, total }: { r: HubAgg; onPress?: () => void; total?: boolean }) {
  const Body = (
    <View style={[st.row, st.line, total && st.totalRow]}>
      <View style={st.first}>
        <Text style={[st.designName, total && { fontWeight: '800' }]} numberOfLines={2}>
          {r.design}{!total && <Text style={{ color: T.copper }}> ›</Text>}
        </Text>
        {!total && <Text style={st.designMeta}>{r.designs != null ? `${plural(r.designs, 'design')} · ` : ''}{plural(r.lots, 'lot')}</Text>}
      </View>
      <Text style={[st.num, st.mono, total && st.bold, { width: W.out }]}>{fmt(r.outM)}</Text>
      <Text style={[st.num, st.mono, total && st.bold, { width: W.in }]}>{fmt(r.inM)}</Text>
      <Text style={[st.num, st.mono, total && st.bold, { width: W.ret, color: r.ret > 0 || total ? T.ink : T.muted }]}>{r.ret > 0 || total ? fmt(r.ret) : '—'}</Text>
      <Text style={[st.num, st.mono, total && st.bold, { width: W.pend, color: r.pend > 0 ? AMBER : total ? T.ink : T.muted }]}>
        {r.pend > 0 || total ? fmt(r.pend) : '—'}
      </Text>
      <Text style={[st.num, st.mono, { width: W.short, color: r.short > 0 ? T.red : T.ink, fontWeight: r.short > 0 || total ? '800' : '400' }]}>
        {r.lOut > 0 || total ? fmt(r.short) : '—'}
      </Text>
      <Text style={[st.num, st.mono, total && st.bold, { width: W.pct, color: r.pct > 5 ? T.red : T.ink }]}>
        {r.lOut > 0 ? r.pct.toFixed(1) : '—'}
      </Text>
      <Text style={[st.num, st.mono, total && st.bold, { width: W.amt }]}>{money(r.inAmt)}</Text>
    </View>
  );
  if (!onPress) return Body;
  return <TouchableOpacity onPress={onPress} activeOpacity={0.6}>{Body}</TouchableOpacity>;
}

/** K item summary: columns of one unit block */
const KW = { lines: 44, ch: 62, out: 66, kg: 62, inw: 62, wst: 54, sht: 54, ret: 54, bal: 66, amt: 64 };

function KHeadRow({ unit }: { unit: 'MTR' | 'KG' }) {
  return (
    <View style={[st.row, { paddingVertical: 8 }]}>
      <Text style={[st.first, st.head]}>ITEM</Text>
      <Text style={[st.num, st.head, { width: KW.lines }]}>LINES</Text>
      <Text style={[st.num, st.head, { width: KW.ch }]}>CHALLANS</Text>
      <Text style={[st.num, st.head, { width: KW.out }]}>OUT {unit}</Text>
      {unit === 'MTR' && <Text style={[st.num, st.head, { width: KW.kg }]}>OUT KG</Text>}
      <Text style={[st.num, st.head, { width: KW.inw }]}>INW</Text>
      <Text style={[st.num, st.head, { width: KW.wst }]}>WASTE</Text>
      <Text style={[st.num, st.head, { width: KW.sht }]}>SHORT</Text>
      <Text style={[st.num, st.head, { width: KW.ret }]}>RET</Text>
      <Text style={[st.num, st.head, { width: KW.bal }]}>BAL {unit}</Text>
      <Text style={[st.num, st.head, { width: KW.amt }]}>BAL ₹</Text>
    </View>
  );
}

function KItemLine({ r, onPress, total }: { r: KAgg; onPress?: () => void; total?: boolean }) {
  const b = total ? st.bold : null;
  const Body = (
    <View style={[st.row, st.line, total && st.totalRow]}>
      <View style={st.first}>
        <Text style={[st.designName, total && { fontWeight: '800' }]} numberOfLines={2}>
          {r.item}{!total && <Text style={{ color: T.copper }}> ›</Text>}
        </Text>
        {!total && <Text style={st.designMeta}>{plural(r.lines, 'line')} · {plural(r.challans, 'challan')}{r.exc > 0 ? ` · excess ${m1(r.exc)}` : ''}</Text>}
      </View>
      <Text style={[st.num, st.mono, b, { width: KW.lines }]}>{r.lines}</Text>
      <Text style={[st.num, st.mono, b, { width: KW.ch }]}>{r.challans}</Text>
      <Text style={[st.num, st.mono, b, { width: KW.out }]}>{m1(r.out)}</Text>
      {r.unit === 'MTR' && <Text style={[st.num, st.mono, b, { width: KW.kg, color: T.muted }]}>{r.outKg > 0 ? m1(r.outKg) : '—'}</Text>}
      <Text style={[st.num, st.mono, b, { width: KW.inw }]}>{r.inw > 0 || total ? m1(r.inw) : '—'}</Text>
      <Text style={[st.num, st.mono, b, { width: KW.wst }]}>{r.wst > 0 || total ? m1(r.wst) : '—'}</Text>
      <Text style={[st.num, st.mono, b, { width: KW.sht, color: r.sht > 0 ? T.red : T.ink }]}>{r.sht > 0 || total ? m1(r.sht) : '—'}</Text>
      <Text style={[st.num, st.mono, b, { width: KW.ret }]}>{r.ret > 0 || total ? m1(r.ret) : '—'}</Text>
      <Text style={[st.num, st.mono, { width: KW.bal, color: r.bal > 0 ? AMBER : T.ink, fontWeight: r.bal > 0 || total ? '800' : '400' }]}>
        {r.bal > 0 || total ? m1(r.bal) : '—'}
      </Text>
      <Text style={[st.num, st.mono, b, { width: KW.amt }]}>{r.balAmt > 0 || total ? money(r.balAmt) : '—'}</Text>
    </View>
  );
  if (!onPress) return Body;
  return <TouchableOpacity onPress={onPress} activeOpacity={0.6}>{Body}</TouchableOpacity>;
}

function LotLine({ l, onPress, k }: { l: HubLot; onPress: () => void; k?: boolean }) {
  const info = (k
    ? [
        l.shade,
        l.annNo ? `annexure ${l.annNo}` : '',
        l.party,
        l.inwCount ? plural(l.inwCount, 'inward') : 'nothing back yet',
        l.lastInw ? `last inward ${fmtD(l.lastInw)}` : '',
      ]
    : [
        l.shade,
        l.chartNo ? `chart ${l.chartNo}` : '',
        l.lotNo ? `lot ${l.lotNo}` : '',
        l.party,
        `${l.recvTakas}/${l.outTakas} takas back`,
        l.retTakas ? `${l.retTakas} returned` : '',
        l.lastInw ? `last inward ${fmtD(l.lastInw)}` : '',
      ]
  ).filter(Boolean).join(' · ');
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
      <View style={[st.cRow, l.pct !== null && l.pct > 5 && { backgroundColor: '#FCEDEA' }]}>
        <View style={st.row}>
          <View style={st.first}>
            <Text style={[st.mono, st.cChallan]} numberOfLines={2}>
              <Text style={[st.bold, { color: T.copper }]}>{l.outNo} ›</Text> <Text style={{ color: T.muted }}>{fmtD(l.outDate)}</Text>
            </Text>
          </View>
          <Text style={[st.num, st.mono, { width: W.out }]}>{fmt(l.outM)}</Text>
          <Text style={[st.num, st.mono, { width: W.in }]}>{l.inM > 0 ? fmt(l.inM) : '—'}</Text>
          <Text style={[st.num, st.mono, { width: W.ret, color: l.retM > 0 ? T.ink : T.muted }]}>{l.retM > 0 ? fmt(l.retM) : '—'}</Text>
          <Text style={[st.num, st.mono, { width: W.pend, color: l.pend > 0 ? AMBER : T.muted }]}>{l.pend > 0 ? fmt(l.pend) : '—'}</Text>
          <Text style={[st.num, st.mono, { width: W.short, color: (l.short || 0) > 0 ? T.red : T.ink, fontWeight: (l.short || 0) > 0 ? '800' : '400' }]}>
            {l.short !== null ? fmt(l.short) : '—'}
          </Text>
          <Text style={[st.num, st.mono, { width: W.pct, color: l.pct !== null && l.pct > 5 ? T.red : T.ink }]}>
            {l.pct !== null ? l.pct.toFixed(1) : '—'}
          </Text>
          <Text style={[st.num, st.mono, { width: W.amt }]}>{l.inAmt > 0 ? money(l.inAmt) : '—'}</Text>
        </View>
        <View style={st.infoRow}>
          <Text style={[st.stateBadge, { backgroundColor: STATUS_COLOR[l.status] }]}>{l.status}</Text>
          <Text style={st.infoText}>{info}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  body: { padding: 12, paddingBottom: 40, gap: 10 },
  bodyWide: { maxWidth: 1000, width: '100%', alignSelf: 'center', padding: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg },
  mono: { fontFamily: MONO },
  bold: { fontWeight: '800' },

  rng: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  arrowTxt: { color: T.muted, fontSize: 11 },
  preset: {
    borderWidth: 1, borderColor: `${T.copper}44`, backgroundColor: '#F8EFE6', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  presetOn: { backgroundColor: T.copper, borderColor: T.copper },
  presetText: { fontSize: 9.5, fontWeight: '800', color: T.copper },

  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sumRange: { fontSize: 11, fontWeight: '800', color: T.ink },
  sumText: { fontSize: 10, color: T.muted },
  link: { fontSize: 10.5, fontWeight: '800', color: T.copper },
  errorBox: { backgroundColor: '#FCEDEA', borderRadius: 8, padding: 9 },
  errorText: { color: T.red, fontSize: 11.5, fontWeight: '700' },

  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  helpCard: { paddingHorizontal: 13, paddingVertical: 11, backgroundColor: '#FBF7F2' },
  helpH: { fontSize: 11, fontWeight: '800', color: T.ink, marginTop: 4, marginBottom: 3 },
  helpP: { fontSize: 11, lineHeight: 17, color: T.ink },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  partyWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  partyLabel: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.5 },
  partySelect: {
    minWidth: 190,
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: `${T.copper}66`,
    backgroundColor: T.surface,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  partyValue: { flex: 1, fontSize: 10.5, fontWeight: '800', color: T.ink },
  partyChevron: { marginLeft: 10, fontSize: 15, lineHeight: 14, color: T.copper, fontWeight: '900' },
  partyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  partyModal: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '72%',
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  partyModalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.alt,
  },
  partyModalTitle: { fontSize: 12, fontWeight: '900', color: T.ink },
  partyClose: { fontSize: 22, lineHeight: 20, color: T.muted, fontWeight: '700' },
  partyList: { paddingHorizontal: 8, paddingVertical: 8 },
  partyOption: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 3,
  },
  partyOptionOn: { backgroundColor: '#F8EFE6' },
  partyOptionText: { flex: 1, fontSize: 11, fontWeight: '700', color: T.ink },
  partyOptionTextOn: { color: T.copper, fontWeight: '900' },
  partyCheck: { marginLeft: 10, color: T.copper, fontSize: 14, fontWeight: '900' },
  partyEmpty: { padding: 16, textAlign: 'center', color: T.muted, fontSize: 11 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  chipOn: { borderColor: T.copper, backgroundColor: '#F8EFE6' },
  chipText: { fontSize: 10, fontWeight: '800', color: T.ink },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 12 },
  line: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.alt },
  totalRow: { borderTopWidth: 2, borderTopColor: T.border, backgroundColor: T.sub, paddingVertical: 11 },
  head: { fontSize: 8.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
  first: { flex: 1, minWidth: 0 },
  num: { textAlign: 'right', fontSize: 11, color: T.ink },
  designName: { fontSize: 11.5, fontWeight: '700', color: T.ink },
  designMeta: { fontSize: 9, color: T.muted, marginTop: 1 },

  emptyBox: { paddingHorizontal: 14, paddingVertical: 16, alignItems: 'center' },
  emptyText: { fontSize: 12, lineHeight: 19, color: T.muted, textAlign: 'center' },
  emptyRow: { padding: 16, textAlign: 'center', color: T.muted, fontSize: 12 },
  showAllBtn: { marginTop: 9, backgroundColor: T.copper, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  showAllText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  drillHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  back: { color: T.copper, fontWeight: '800', fontSize: 12 },
  drillTitle: { fontSize: 13, fontWeight: '800', color: T.ink },
  drillSub: { fontSize: 10, color: T.muted },

  cRow: { borderTopWidth: 1, borderTopColor: T.alt, paddingVertical: 9 },
  cChallan: { fontSize: 11, color: T.ink },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4, paddingHorizontal: 12 },
  stateBadge: { fontSize: 8, fontWeight: '900', color: '#fff', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  infoText: { fontSize: 9.5, color: T.muted, flexShrink: 1 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  lotTitle: { fontSize: 17, fontWeight: '800', color: T.ink },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minWidth: 0, backgroundColor: T.sub, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  statValue: { fontSize: 13, fontWeight: '800', color: T.ink },
  statLabel: { fontSize: 7.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2, textAlign: 'center' },
  factsCard: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 10, rowGap: 8 },
  fact: { width: '50%', paddingRight: 8 },
  factK: { fontSize: 8, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  factV: { fontSize: 11, color: T.ink, marginTop: 1, fontWeight: '600' },
  section: { fontSize: 9, fontWeight: '900', color: T.copper, letterSpacing: 0.5 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },

  footer: { fontSize: 9.5, color: T.muted, lineHeight: 14 },
});
