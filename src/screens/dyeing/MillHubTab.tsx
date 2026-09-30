// FILE: src/screens/dyeing/MillHubTab.tsx
// Dyeing → Mill Hub (READ-ONLY — never a data-entry screen) — the ERP
// Designing "Mill Hub" as is:
//
//   [from] → [to]  [7d] [Month] [90d]
//   01 Sep → 28 Sep   12 outward · 9 inward · 2 re-dye   +N outside range — show all   ⓘ How to read this
//   (guide)   [All mills] [Shree Rang Dyeing] [Akash Process]
//   DESIGN            OUT     IN   PEND  SHORT    %    IN ₹
//   Rib Stop 145 ›   ...      (↻ re-dye x m out · y m back)
//   GRAND TOTAL
//   tap a design -> challan-wise page (state badge CLOSED / PARTIAL / PENDING,
//   EARLIER OUTWARD / RE-DYE tags, colour D F L·lot ✂ info line, TOTAL)
//
// Source: POST /dyeing/mill_hub (full status history of every shade touched)
// turned into outward trips + receipts by dyeingReports.buildTrips; the ERP
// rules are in buildMillHub / buildChallanRows.

import { useBusinessContext } from '@/src/core/business';
import { T } from '@/src/theme';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { fmt, MONO } from './DailyUpdateTab';
import { DyeingService, unwrapBody } from './dyeingApi';
import { DyeingDateField } from './DyeingDateField';
import { addDaysISO, DyeEventRow, toEventRow, todayISO } from './dyeingModel';
import { buildChallanRows, buildMillHub, buildTrips, ChallanRow, MillAgg, MillTrip } from './dyeingReports';

const money = (v: number) => {
  v = +v || 0;
  return v >= 1e5 ? `₹${(v / 1e5).toFixed(2)}L` : v >= 1e3 ? `₹${(v / 1e3).toFixed(1)}K` : `₹${Math.round(v).toLocaleString('en-IN')}`;
};
const fmtD = (iso: string) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return iso ? `${iso.slice(8, 10)} ${months[Number(iso.slice(5, 7)) - 1]}` : '—';
};
/** Indian financial year start (1 Apr) of a date. */
const fyStart = (iso: string) => {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return `${m >= 4 ? y : y - 1}-04-01`;
};

const W = { out: 52, in: 52, pend: 48, short: 46, pct: 36, amt: 58 };
const AMBER = '#C98A1A';

export function MillHubTab() {
  const { prpGroup, yearNo, isReady } = useBusinessContext();
  const today = todayISO();
  const monthStart = `${today.slice(0, 8)}01`;
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const narrow = width < 420;

  const [loadFrom, setLoadFrom] = useState(() => {
    const f = fyStart(today);
    const d90 = addDaysISO(today, -90);
    return f < d90 ? f : d90;
  });
  const [events, setEvents] = useState<DyeEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(null); // null until data decides the default (ERP rule)
  const [to, setTo] = useState(today);
  const [help, setHelp] = useState(false);
  const [mill, setMill] = useState('ALL');
  const [dsel, setDsel] = useState<string | null>(null);

  const load = useCallback(async (windowFrom: string) => {
    if (!isReady) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const body = { prptype: prpGroup, yearno: yearNo, fromdate: windowFrom, todate: todayISO() };
      console.log('[Dyeing/MillHub] request ->', body);
      const response: any = await DyeingService.millHub(body);
      const inner = unwrapBody(response);
      const rows = (Array.isArray(inner?.Events) ? inner.Events : []).map(toEventRow).filter(Boolean) as DyeEventRow[];
      setEvents(rows);
      setLoadFrom(windowFrom);
    } catch (err: any) {
      setEvents([]);
      setError(err?.response?.data?.message || err?.message || 'Unable to load mill hub.');
    } finally {
      setLoading(false);
    }
  }, [isReady, prpGroup, yearNo]);

  const loadFromRef = useRef(loadFrom);
  loadFromRef.current = loadFrom;
  useFocusEffect(useCallback(() => { void load(loadFromRef.current); }, [load]));

  const trips = useMemo(() => buildTrips(events), [events]);
  const allDates = useMemo(
    () => trips.flatMap((t) => [t.date, ...t.ins.map((i) => i.date)]).filter(Boolean).sort(),
    [trips],
  );
  const earliest = allDates[0] || monthStart;
  const latest = allDates[allDates.length - 1] || today;

  // ERP default: this month if it has activity, else last 90 days, else everything
  const effFrom = useMemo(() => {
    if (from) return from;
    const d90 = addDaysISO(today, -90);
    if (allDates.some((d) => d >= monthStart)) return monthStart;
    if (allDates.some((d) => d >= d90)) return d90;
    return earliest;
  }, [from, allDates, monthStart, today, earliest]);

  const setRange = (f: string, t: string) => {
    const nf = f > t ? t : f;
    setFrom(nf);
    setTo(t);
    if (nf < loadFrom) void load(nf); // widen the loaded window
  };
  const showAll = () => {
    const f = fyStart(today) < earliest ? fyStart(today) : earliest;
    setMill('ALL');
    setRange(f, today >= latest ? today : latest);
  };

  const hub = useMemo(() => buildMillHub(trips, effFrom, to, mill), [trips, effFrom, to, mill]);
  const inRange = (d: string) => d >= effFrom && d <= to;
  const outside = hub.moves - trips.filter((t) => inRange(t.date)).length - trips.reduce((s, t) => s + t.ins.filter((i) => inRange(i.date)).length, 0);

  const Rng = (
    <View style={st.rng}>
      <DyeingDateField value={effFrom} onChange={(v) => setRange(v, to)} compact />
      <Text style={st.arrowTxt}>→</Text>
      <DyeingDateField value={to} onChange={(v) => setRange(effFrom, v)} compact />
      {([['7d', addDaysISO(today, -7)], ['Month', monthStart], ['90d', addDaysISO(today, -90)]] as const).map(([l, f]) => {
        const on = effFrom === f && to === today;
        return (
          <TouchableOpacity key={l} onPress={() => setRange(f, today)} style={[st.preset, on && st.presetOn]}>
            <Text style={[st.presetText, on && { color: '#fff' }]}>{l}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const MillChips = hub.mills.length > 1 ? (
    <View style={st.chips}>
      {[['ALL', 'All mills'], ...hub.mills.map((m) => [m, m])].map(([k, l]) => {
        const on = mill === k;
        return (
          <TouchableOpacity key={k} onPress={() => setMill(k)} style={[st.chip, on && st.chipOn]}>
            <Text style={[st.chipText, on && { color: T.copper }]}>{l}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  ) : null;

  const tableMin = narrow ? 420 : undefined;

  if (loading && !events.length) {
    return <View style={st.loading}><ActivityIndicator color={T.copper} /></View>;
  }

  /* ------------------------------ challan-wise ----------------------------- */
  if (dsel) {
    const { rows, CT } = buildChallanRows(trips, dsel, effFrom, to, mill);
    return (
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={[st.body, wide && st.bodyWide]}>
        <View style={st.drillHead}>
          <TouchableOpacity onPress={() => setDsel(null)} hitSlop={HIT}><Text style={st.back}>‹ Designs</Text></TouchableOpacity>
          <Text style={st.drillTitle}>{dsel}</Text>
          <Text style={st.drillSub}>challan-wise · {mill === 'ALL' ? 'all mills' : mill}</Text>
        </View>
        {Rng}
        <HScroll on={!!tableMin}>
          <View style={[st.card, { paddingVertical: 4, minWidth: tableMin, flex: 1 }]}>
            <HeadRow first="CHALLAN · DATE" />
            {rows.length === 0 && <Text style={st.emptyRow}>No challans in this range.</Text>}
            {rows.map((r) => <ChallanLine key={r.t.id} r={r} />)}
            <View style={[st.row, st.totalRow]}>
              <Text style={[st.first, { fontWeight: '800', color: T.ink }]}>TOTAL</Text>
              <Text style={[st.num, st.mono, st.bold, { width: W.out }]}>{fmt(CT.outM)}</Text>
              <Text style={[st.num, st.mono, st.bold, { width: W.in }]}>{fmt(CT.inM)}</Text>
              <Text style={[st.num, st.mono, st.bold, { width: W.pend, color: CT.pend > 0 ? AMBER : T.ink }]}>{fmt(CT.pend)}</Text>
              <Text style={[st.num, st.mono, st.bold, { width: W.short, color: CT.short > 0 ? T.red : T.ink }]}>{fmt(CT.short)}</Text>
              <Text style={[st.num, st.mono, st.bold, { width: W.pct }]}>{CT.lOut > 0 ? ((CT.short / CT.lOut) * 100).toFixed(1) : '—'}</Text>
              <Text style={[st.num, st.mono, st.bold, { width: W.amt }]}>{money(CT.inAmt)}</Text>
            </View>
          </View>
        </HScroll>
        <Text style={st.footer}>
          Rows are challans outwarded in the range plus earlier challans that received inward in the range (tagged EARLIER
          OUTWARD — their outward is not counted here). IN and IN ₹ are the period’s receipts on that challan. PEND is what a
          period outward still has at the mill. SHORT is the shortfall on the lots settled by the period’s receipts — a
          challan can show both pending and shortage at once.
        </Text>
      </ScrollView>
    );
  }

  /* ------------------------------ design-wise ------------------------------ */
  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={[st.body, wide && st.bodyWide]}>
      {Rng}
      <View style={st.sumRow}>
        <Text style={st.sumRange}>{fmtD(effFrom)} → {fmtD(to)}</Text>
        <Text style={st.sumText}>
          {hub.outCount} outward · {hub.inCount} inward{hub.reCount > 0 ? ` · ${hub.reCount} re-dye` : ''}
        </Text>
        {outside > 0 && (
          <Text onPress={showAll} style={st.link}>+{outside} outside range — show all</Text>
        )}
        <Text onPress={() => setHelp((h) => !h)} style={[st.link, { marginLeft: 'auto' }]}>ⓘ {help ? 'Hide guide' : 'How to read this'}</Text>
      </View>
      {loading && <ActivityIndicator color={T.copper} size="small" />}
      {!!error && (
        <TouchableOpacity onPress={() => load(loadFrom)} style={st.errorBox}>
          <Text style={st.errorText}>{error} — tap to retry</Text>
        </TouchableOpacity>
      )}

      {help && (
        <View style={[st.card, st.helpCard]}>
          <Text style={st.helpH}>What Mill Hub shows</Text>
          <Text style={st.helpP}>
            Everything sent to outside mills (dye houses / finishers) and everything received back, for the selected dates —
            built automatically from the status history saved in <Text style={st.bold}>Priority</Text> (Sent for job, Job
            inward, Lorry Cut) and the outward challans with their lot nos. Nothing is typed here.
          </Text>
          <Text style={st.helpH}>Reading a row</Text>
          <Text style={st.helpP}>
            <Text style={st.bold}>OUT</Text> — metres outwarded in the range. <Text style={st.bold}>IN</Text> — metres received
            in the range, whenever they were sent (an earlier outward’s return still counts here). These two are independent.{' '}
            <Text style={st.bold}>PEND</Text> — of the period’s outwards, what the mill still holds (outward minus what receipts
            have settled). <Text style={st.bold}>SHORT</Text> — on each receipt, the sent-lot it settles minus what came back;
            summed for receipts in the period. Pending material never counts, and pending never blocks shortage on lots
            already returned — a design can show both. <Text style={st.bold}>%</Text> — shortage as a share of the metres
            settled in the period. <Text style={st.bold}>IN ₹</Text> — job-work value of the period’s receipts (inward rate,
            else the challan’s rate). <Text style={st.bold}>↻ re-dye</Text> — material sent back after a lorry cut: shown
            under the design and in the grand total as a separate figure, never added to Outward or Inward (it is the same
            material going round again); it still counts as pending while at the mill, and any loss on it still counts as
            shortage.
          </Text>
          <Text style={st.helpH}>Drill down</Text>
          <Text style={st.helpP}>
            Tap any design → its challan-wise page (which challans, when, how much back, which are short). The{' '}
            <Text style={st.bold}>GRAND TOTAL</Text> row is the whole mill activity for the range. Use the mill chips to look
            at one mill; change the dates or use the presets to move the window.
          </Text>
        </View>
      )}

      {MillChips}

      <HScroll on={!!tableMin}>
        <View style={[st.card, { paddingVertical: 4, minWidth: tableMin, flex: 1 }]}>
          <HeadRow first="DESIGN" />
          {hub.rows.length === 0 && (
            <View style={st.emptyBox}>
              {trips.length === 0 ? (
                <Text style={st.emptyText}>
                  No mill movements recorded yet. This dashboard fills itself from the Priority status sheet — mark a
                  shade <Text style={st.bold}>Sent for job</Text> (and later <Text style={st.bold}>Job inward</Text>) and it
                  appears here.
                </Text>
              ) : (
                <>
                  <Text style={st.emptyText}>
                    No mill activity between <Text style={st.bold}>{fmtD(effFrom)}</Text> and <Text style={st.bold}>{fmtD(to)}</Text>
                    {mill !== 'ALL' ? ` for ${mill}` : ''}. {hub.moves} movements are recorded between{' '}
                    <Text style={st.bold}>{fmtD(earliest)}</Text> and <Text style={st.bold}>{fmtD(latest)}</Text>.
                  </Text>
                  <TouchableOpacity onPress={showAll} style={st.showAllBtn}>
                    <Text style={st.showAllText}>Show all recorded activity</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
          {hub.rows.map((r) => <DesignLine key={r.design} r={r} onPress={() => setDsel(r.design)} />)}
          {hub.rows.length > 0 && <DesignLine r={hub.G} total />}
        </View>
      </HScroll>

      <Text style={st.footer}>
        Metres = each outward lot's LOT QTY (one challan row per lot, with its own mill); a shade with no lot qty
        yet uses its order qty (≈ on the challan page). Outward and inward are counted independently by their own dates, over the full history. Pending = period outwards
        not yet settled by receipts. Shortage = sent-lot minus received on the period’s receipts — never pending material,
        and never blocked by it. Re-dye trips (after lorry cuts) are shown separately and never inflate Outward or Inward.
        Tap a design for the challan-wise breakdown.
      </Text>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

/** Tables scroll sideways only on narrow phones; elsewhere they fill the width. */
function HScroll({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      {children}
    </ScrollView>
  );
}

function HeadRow({ first }: { first: string }) {
  return (
    <View style={[st.row, { paddingVertical: 8 }]}>
      <Text style={[st.first, st.head]}>{first}</Text>
      <Text style={[st.num, st.head, { width: W.out }]}>OUT</Text>
      <Text style={[st.num, st.head, { width: W.in }]}>IN</Text>
      <Text style={[st.num, st.head, { width: W.pend }]}>PEND</Text>
      <Text style={[st.num, st.head, { width: W.short }]}>SHORT</Text>
      <Text style={[st.num, st.head, { width: W.pct }]}>%</Text>
      <Text style={[st.num, st.head, { width: W.amt }]}>IN ₹</Text>
    </View>
  );
}

function DesignLine({ r, onPress, total }: { r: MillAgg; onPress?: () => void; total?: boolean }) {
  const hasRe = r.redye > 0 || r.redyeBack > 0;
  const Body = (
    <View style={[st.row, st.line, total && st.totalRow]}>
      <View style={st.first}>
        <Text style={[st.designName, total && { fontWeight: '800' }]} numberOfLines={2}>
          {r.design}{!total && <Text style={{ color: T.copper }}> ›</Text>}
        </Text>
        {hasRe && (
          <Text style={[st.reLine, st.mono]}>
            ↻ re-dye {fmt(r.redye)} m out · {fmt(r.redyeBack)} m back{total ? ' — not in totals' : ''}
          </Text>
        )}
      </View>
      <Text style={[st.num, st.mono, total && st.bold, { width: W.out }]}>{fmt(r.outM)}</Text>
      <Text style={[st.num, st.mono, total && st.bold, { width: W.in }]}>{fmt(r.inM)}</Text>
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

const stateColor = (r: ChallanRow) =>
  r.closed ? (r.shAll > 0 ? T.red : '#2A6044') : r.t.ins.length ? (r.shAll > 0 ? '#B5651D' : AMBER) : '#5A6B7A';

const infoOf = (t: MillTrip) =>
  `${t.colour}${t.dyed ? ' D' : ''}${t.finished ? 'F' : ''}${t.lotNo ? ` L·${t.lotNo}` : ''}${t.cuts ? ` ✂${t.cuts}` : ''}`;

function ChallanLine({ r }: { r: ChallanRow }) {
  const { t } = r;
  return (
    <View style={[st.cRow, r.pct !== null && r.pct > 5 && { backgroundColor: '#FCEDEA' }]}>
      <View style={st.row}>
        <View style={st.first}>
          <Text style={[st.mono, st.cChallan]} numberOfLines={2}>
            <Text style={st.bold}>{t.challan}</Text> <Text style={{ color: T.muted }}>{fmtD(t.date)}</Text>
          </Text>
          <View style={st.tags}>
            {t.reprocess && <Text style={[st.tag, { color: '#B5651D', backgroundColor: '#FBF1DC' }]}>RE-DYE</Text>}
            {!r.outIn && <Text style={[st.tag, { color: '#1C567A', backgroundColor: '#E3EEF5' }]}>EARLIER OUTWARD</Text>}
            {t.implied && <Text style={[st.tag, { color: T.muted, backgroundColor: T.alt }]}>NO SENT ENTRY</Text>}
          </View>
        </View>
        <Text style={[st.num, st.mono, { width: W.out, color: r.outIn ? T.ink : T.muted }]}>{r.outIn ? fmt(t.metres) : '—'}</Text>
        <Text style={[st.num, st.mono, { width: W.in }]}>{r.inM > 0 ? fmt(r.inM) : '—'}</Text>
        <Text style={[st.num, st.mono, { width: W.pend, color: (r.pend || 0) > 0 ? AMBER : T.muted }]}>
          {r.pend !== null && r.pend > 0 ? fmt(r.pend) : '—'}
        </Text>
        <Text style={[st.num, st.mono, { width: W.short, color: (r.sh || 0) > 0 ? T.red : T.ink, fontWeight: (r.sh || 0) > 0 ? '800' : '400' }]}>
          {r.sh !== null ? fmt(r.sh) : '—'}
        </Text>
        <Text style={[st.num, st.mono, { width: W.pct, color: r.pct !== null && r.pct > 5 ? T.red : T.ink }]}>
          {r.pct !== null ? r.pct.toFixed(1) : '—'}
        </Text>
        <Text style={[st.num, st.mono, { width: W.amt }]}>{r.inAmt > 0 ? money(r.inAmt) : '—'}</Text>
      </View>
      <View style={st.infoRow}>
        <Text style={[st.stateBadge, { backgroundColor: stateColor(r) }]}>{r.state}</Text>
        <Text style={st.infoMain}>{infoOf(t)}</Text>
        <Text style={st.infoText}>
          {t.mill}{t.chartNo ? ` · chart ${t.chartNo}` : ''}{t.party ? ` · ${t.party}` : ''} · outwarded {t.estimate ? '≈ ' : ''}{fmt(t.metres)} m{t.estimate ? ' (order qty — lot qty not entered)' : ''} ·
          settled {fmt(r.settled)} m, received {fmt(r.received)} m
          {t.ins.length ? ` (${t.ins.map((i) => fmtD(i.date)).join(', ')})` : ''}
          {r.shAll > 0 ? ` · shortage so far ${fmt(r.shAll)} m` : ''}
          {!r.closed && r.rem > 0 ? ` · ${fmt(r.rem)} m still at mill` : ''}
        </Text>
      </View>
    </View>
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
  reLine: { fontSize: 9, fontWeight: '700', color: '#B5651D', marginTop: 1 },

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
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tag: { fontSize: 8, fontWeight: '900', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4, paddingHorizontal: 12 },
  stateBadge: { fontSize: 8, fontWeight: '900', color: '#fff', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  infoMain: { fontSize: 9.5, color: '#4b535b', fontWeight: '700' },
  infoText: { fontSize: 9.5, color: T.muted, flexShrink: 1 },

  footer: { fontSize: 9.5, color: T.muted, lineHeight: 14 },
});
