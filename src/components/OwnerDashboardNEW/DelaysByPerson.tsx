// FILE: src/components/OwnerDashboardNEW/DelaysByPerson.tsx
// NEW tab "Delays by person".
//   GET /api/getdelaysbyperson?prpcode=SIP&yearno=27   (api.ts -> getDelaysByPerson)
//     summary -> upar ki grid: Person | Stages | Pending with them, late | Finished late | Finished on time | Total days lost
//     data    -> niche ki grid: chune hue person ke saare production orders (stage, planned by, status)
// WEB (wide): grid + row click -> usi row ke niche details EXPAND hoti hain (dobara click = collapse).
// MOBILE (narrow): har person ka CARD + tap -> bottom sheet me orders ki list. "Not assigned" = jis stage ka koi person Setup me set nahi hai.
// Sirf DISPLAY: koi number yahan calculate nahi hota, sab SP se aata hai.
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { CONTENT_MAX, IconBtn } from '../erpUi';
import { getDelaysByPerson, type PersonDetailApiRow, type PersonSummaryApiRow } from './api';
import { FONT, FONT_HEAD } from './fonts';
import { Pill, StateBox, type Col } from './OrderTracker';
import { PRP_CODE, stageYearNo } from './prodOrderModel';

type Props = { token: string; API: string; refreshTick?: number; onBusyChange?: (busy: boolean) => void };

type Status = 'Overdue' | 'Done - Late' | 'On Time';
type PersonRow = { person: string; stages: string[]; pendingLate: number; finishedLate: number; finishedOnTime: number; daysLost: number };
type OrderRow = {
  key: string;
  person: string;
  stageNo: number;
  stage: string;
  orderNo: string;
  design: string;
  planDate: string;
  status: Status;
  lateDays: number;
  overdueDays: number;
  daysLost: number;
};
type Filter = 'all' | 'pending' | 'late' | 'ontime';

const PAGE = 50;
const NOT_ASSIGNED = 'Not assigned';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const n = (v: unknown): number => {
  const x = parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown): string => String(v ?? '').trim();
const fmt = (v: number) => v.toLocaleString('en-IN');

/** 'YYYY-MM-DD...' or 'YYYYMMDD' -> '27 Aug 26' */
const fmtDate = (raw: string): string => {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(raw || '');
  if (!m) return '—';
  const mon = MON[parseInt(m[2], 10) - 1];
  return mon ? `${parseInt(m[3], 10)} ${mon} ${m[1].slice(2)}` : '—';
};

const statusOf = (raw: string): Status => (raw === 'Overdue' ? 'Overdue' : raw === 'Done - Late' ? 'Done - Late' : 'On Time');
const RANK: Record<Status, number> = { Overdue: 0, 'Done - Late': 1, 'On Time': 2 };

const statusText = (r: OrderRow) =>
  r.status === 'Overdue'
    ? `Pending, ${r.overdueDays} day${r.overdueDays === 1 ? '' : 's'} late`
    : r.status === 'Done - Late'
      ? `Done ${r.lateDays} day${r.lateDays === 1 ? '' : 's'} late`
      : 'Done on time';
const statusColor = (x: Status) => (x === 'Overdue' ? T.red : x === 'Done - Late' ? T.pd : T.green);

const toPerson = (r: PersonSummaryApiRow): PersonRow => ({
  person: s(r.Person) || NOT_ASSIGNED,
  stages: s(r.Stages) ? s(r.Stages).split(',').map((x) => x.trim()).filter(Boolean) : [],
  pendingLate: n(r.PendingLate),
  finishedLate: n(r.FinishedLate),
  finishedOnTime: n(r.FinishedOnTime),
  daysLost: n(r.TotalDaysLost),
});

const toOrder = (r: PersonDetailApiRow, i: number): OrderRow => ({
  key: `${s(r.TrackId)}|${s(r.StageNo)}|${i}`,
  person: s(r.Person) || NOT_ASSIGNED,
  stageNo: n(r.StageNo),
  stage: s(r.StageName),
  orderNo: s(r.ProductionOrderNo),
  design: s(r.DesignName) || s(r.ProdDsnCode) || s(r.ProdItmCode),
  planDate: s(r.PlanDate),
  status: statusOf(s(r.Status)),
  lateDays: n(r.LateDays),
  overdueDays: n(r.OverdueDays),
  daysLost: n(r.DaysLost),
});

export default function DelaysByPerson({ token, API, refreshTick = 0, onBusyChange }: Props) {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(PAGE);
  const seq = useRef(0);
  const { width: winW, height: winH } = useWindowDimensions();
  const [contentW, setContentW] = useState(0);
  const wide = (contentW || winW) >= 720; // content width se: web = grid + expand, phone = cards + bottom sheet

  const load = useCallback(
    async (silent = false) => {
      const id = ++seq.current;
      silent ? setRefreshing(true) : setLoading(true);
      setError('');
      try {
        const res = await getDelaysByPerson(API, token, { prpcode: PRP_CODE, yearno: stageYearNo() });
        if (id !== seq.current) return;
        const p = res.summary.map(toPerson);
        setPeople(p);
        setOrders(res.data.map(toOrder));
        setLoaded(true);
        // panel khula ho aur wo person abhi bhi list me hai to khula rahe, warna band
        setSelected((cur) => (cur && p.some((x) => x.person === cur) ? cur : ''));
      } catch (e: any) {
        if (id === seq.current) setError(e?.message || 'Unable to load delays by person.');
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [API, token],
  );

  useEffect(() => {
    void load(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, refreshTick]);

  useEffect(() => {
    onBusyChange?.(loading || refreshing);
  }, [loading, refreshing, onBusyChange]);

  const pick = (name: string) => {
    setSelected((cur) => (wide && cur === name ? '' : name)); // web: same row dobara = collapse
    setFilter('all');
    setShown(PAGE);
  };

  const closePanel = () => setSelected('');

  const mine = useMemo(
    () =>
      orders
        .filter((o) => o.person === selected)
        .sort((a, b) => RANK[a.status] - RANK[b.status] || b.daysLost - a.daysLost || a.stageNo - b.stageNo),
    [orders, selected],
  );
  const counts = useMemo(
    () => ({
      all: mine.length,
      pending: mine.filter((o) => o.status === 'Overdue').length,
      late: mine.filter((o) => o.status === 'Done - Late').length,
      ontime: mine.filter((o) => o.status === 'On Time').length,
    }),
    [mine],
  );
  const filtered = useMemo(
    () =>
      mine.filter((o) =>
        filter === 'all' ? true : filter === 'pending' ? o.status === 'Overdue' : filter === 'late' ? o.status === 'Done - Late' : o.status === 'On Time',
      ),
    [mine, filter],
  );
  const visible = filtered.slice(0, shown);

  /* ------------------------------ columns ------------------------------ */

  const personCols = useMemo<Col<PersonRow>[]>(
    () => [
      { key: 'person', label: 'Person', flex: 1.3, render: (r) => r.person },
      {
        key: 'stages',
        label: 'Stages',
        flex: 3.4,
        render: (r) =>
          r.stages.length === 0 ? (
            <Text style={st.muted}>—</Text>
          ) : (
            <View style={st.chips}>
              {r.stages.map((x) => (
                <View key={x} style={st.chip}>
                  <Text style={st.chipText}>{x}</Text>
                </View>
              ))}
            </View>
          ),
      },
      {
        key: 'pending',
        label: 'Pending with them, late',
        flex: 1.4,
        align: 'right',
        render: (r) =>
          r.pendingLate > 0 ? (
            <View style={st.redPill}>
              <Text style={st.redPillText}>{fmt(r.pendingLate)}</Text>
            </View>
          ) : (
            <Text style={st.num}>0</Text>
          ),
      },
      { key: 'fl', label: 'Finished late', flex: 1, align: 'right', render: (r) => <Text style={st.num}>{fmt(r.finishedLate)}</Text> },
      { key: 'ot', label: 'Finished on time', flex: 1.1, align: 'right', render: (r) => <Text style={st.num}>{fmt(r.finishedOnTime)}</Text> },
      { key: 'lost', label: 'Total days lost', flex: 1.1, align: 'right', render: (r) => <Text style={st.numStrong}>{fmt(r.daysLost)}</Text> },
    ],
    [],
  );

  const orderCols = useMemo<Col<OrderRow>[]>(
    () => [
      { key: 'po', label: 'Production order', flex: 1.2, render: (r) => r.orderNo },
      { key: 'design', label: 'Design', flex: 2, render: (r) => r.design || '—' },
      { key: 'stage', label: 'Stage', flex: 1, render: (r) => r.stage },
      { key: 'plan', label: 'Planned by', flex: 1, render: (r) => fmtDate(r.planDate) },
      { key: 'status', label: 'Status', flex: 1.6, render: (r) => <Pill text={statusText(r)} color={statusColor(r.status)} strong={r.status === 'Overdue'} /> },
    ],
    [],
  );

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `All ${counts.all}` },
    { key: 'pending', label: `Pending late ${counts.pending}` },
    { key: 'late', label: `Finished late ${counts.late}` },
    { key: 'ontime', label: `On time ${counts.ontime}` },
  ];

  const selectedRow = people.find((p) => p.person === selected);

  const renderFilters = () => (
    <View style={st.filterRow}>
      {filters.map((f) => {
        const on = filter === f.key;
        return (
          <TouchableOpacity
            key={f.key}
            activeOpacity={0.8}
            onPress={() => {
              setFilter(f.key);
              setShown(PAGE);
            }}
            style={[st.fBtn, on && st.fBtnOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[st.fText, on && st.fTextOn]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderMore = () =>
    filtered.length > visible.length ? (
      <TouchableOpacity style={st.moreBtn} activeOpacity={0.8} onPress={() => setShown((x) => x + PAGE)}>
        <Text style={st.moreText}>Show more ({filtered.length - visible.length} left)</Text>
      </TouchableOpacity>
    ) : null;

  /** WEB: person ke apne card ke andar expand hone wala hissa */
  const renderExpanded = () => (
    <View style={st.wBody}>
      <View style={st.band}>
        <View style={st.bandTop}>
          <Text style={st.bandLbl}>ORDERS OF</Text>
          <View style={st.namePill}>
            <Text style={st.namePillTx} numberOfLines={1}>{selectedRow?.person}</Text>
          </View>
          <Text style={st.bandMeta} numberOfLines={1}>
            {fmt(counts.all)} stage{counts.all === 1 ? '' : 's'} · {fmt(selectedRow?.daysLost ?? 0)} days lost
          </Text>
        </View>
        <View style={st.bandFilters}>{renderFilters()}</View>
      </View>

      <View style={st.oHead}>
        {orderCols.map((c, i) => (
          <View key={c.key} style={[st.oCell, { flex: c.flex }, i === 0 && st.oFirst]}>
            <Text style={st.oHeadTx} numberOfLines={1}>{c.label}</Text>
          </View>
        ))}
      </View>
      <ScrollView style={st.expandScroll} nestedScrollEnabled showsVerticalScrollIndicator>
        {visible.length === 0 ? (
          <Text style={[st.muted, { textAlign: 'center', paddingVertical: 24 }]}>No orders for this filter.</Text>
        ) : (
          visible.map((o) => (
            <View key={o.key} style={st.oRow}>
              {orderCols.map((c, i) => {
                const node = c.render(o);
                return (
                  <View key={c.key} style={[st.oCell, { flex: c.flex }, i === 0 && st.oFirst]}>
                    {typeof node === 'string' || typeof node === 'number' ? (
                      <Text style={i === 0 ? st.oPo : st.oTx} numberOfLines={1}>{node}</Text>
                    ) : (
                      node
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}
        {renderMore()}
      </ScrollView>
    </View>
  );

  /** MOBILE: ek person ka card */
  const renderCard = (r: PersonRow) => (
    <TouchableOpacity key={r.person} activeOpacity={0.8} onPress={() => pick(r.person)} style={st.pCard} accessibilityRole="button">
      <View style={st.pTop}>
        <Text style={st.pName} numberOfLines={1}>{r.person}</Text>
        <View style={st.lostBox}>
          <Text style={st.lostNum}>{fmt(r.daysLost)}</Text>
          <Text style={st.lostLbl}>days lost</Text>
        </View>
        <Icon name="chevron-right" size={20} color={T.muted} />
      </View>
      {r.stages.length > 0 ? (
        <View style={st.chips}>
          {r.stages.map((x) => (
            <View key={x} style={st.chip}>
              <Text style={st.chipText}>{x}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={st.statRow}>
        <View style={[st.stat, r.pendingLate > 0 && st.statRed]}>
          <Text style={[st.statNum, r.pendingLate > 0 && { color: T.red }]}>{fmt(r.pendingLate)}</Text>
          <Text style={st.statLbl} numberOfLines={1}>Pending late</Text>
        </View>
        <View style={st.stat}>
          <Text style={st.statNum}>{fmt(r.finishedLate)}</Text>
          <Text style={st.statLbl} numberOfLines={1}>Finished late</Text>
        </View>
        <View style={st.stat}>
          <Text style={st.statNum}>{fmt(r.finishedOnTime)}</Text>
          <Text style={st.statLbl} numberOfLines={1}>On time</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={st.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[T.copper]} tintColor={T.copper} />}
      >
        <View style={st.content} onLayout={(e) => setContentW(e.nativeEvent.layout.width)}>
          <View style={st.head}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.h1}>Delays by person</Text>
              <Text style={st.h1Sub}>Each production order's stage is charged to the person responsible for it. Tap a name to see the orders.</Text>
            </View>
            <IconBtn icon="refresh" label="Refresh" onPress={() => void load(loaded)} loading={loading || refreshing} tone="soft" color={T.copper} />
          </View>

          <StateBox loading={loading && !loaded} error={error} onRetry={() => void load(loaded)} />

          {loaded ? (
            <>
              {wide ? (
                <View style={{ gap: 10 }}>
                  <Text style={st.metaLine}>{people.length} {people.length === 1 ? 'person' : 'people'} · click a card to expand its orders</Text>
                  <View style={st.colHead}>
                    {personCols.map((c, i) => (
                      <View key={c.key} style={[st.wCell, { flex: c.flex }, c.align === 'right' && st.tdRight, i === 0 && st.wFirst]}>
                        <Text style={[st.colHeadTx, c.align === 'right' && { textAlign: 'right' }]} numberOfLines={1}>{c.label}</Text>
                      </View>
                    ))}
                    <View style={st.chev} />
                  </View>
                  {people.length === 0 ? <Text style={[st.muted, { textAlign: 'center', padding: 24 }]}>No stage data found.</Text> : null}
                  {people.map((r) => {
                    const open = r.person === selected;
                    return (
                      <View key={r.person} style={[st.wCard, open && st.wCardOpen]}>
                        <TouchableOpacity activeOpacity={0.75} onPress={() => pick(r.person)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={[st.wHead, open && st.wHeadOpen]}>
                          {personCols.map((c, i) => (
                            <View key={c.key} style={[st.wCell, { flex: c.flex }, c.align === 'right' && st.tdRight, i === 0 && st.wFirst]}>
                              {i === 0 ? (
                                <View style={st.nameRow}>
                                  <View style={[st.avatar, r.person === NOT_ASSIGNED && { backgroundColor: T.muted }]}>
                                    <Text style={st.avatarTx}>{r.person.charAt(0).toUpperCase()}</Text>
                                  </View>
                                  <Text style={st.wName} numberOfLines={1}>{r.person}</Text>
                                </View>
                              ) : (
                                c.render(r)
                              )}
                            </View>
                          ))}
                          <View style={st.chev}>
                            <Icon name={open ? 'expand-less' : 'expand-more'} size={22} color={open ? T.copper : T.muted} />
                          </View>
                        </TouchableOpacity>
                        {open ? renderExpanded() : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <>
                  <Text style={st.metaLine}>{people.length} {people.length === 1 ? 'person' : 'people'} · tap a card to see its orders</Text>
                  {people.length === 0 ? <Text style={[st.muted, { textAlign: 'center', padding: 24 }]}>No stage data found.</Text> : null}
                  {people.map(renderCard)}
                </>
              )}
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* ---------- person details: slide-over panel (grid upar hi dikhta rahta hai) ---------- */}
      <Modal visible={!wide && !!selectedRow} transparent animationType="slide" onRequestClose={closePanel}>
        <View style={[st.overlay, wide ? st.overlayWide : st.overlaySheet]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closePanel} accessibilityLabel="Close details" />
          {selectedRow ? (
            <View style={[st.panel, wide ? [st.panelWide, { width: Math.min(560, winW * 0.5) }] : [st.panelSheet, { height: Math.round(winH * 0.88) }]]}>
              {!wide ? <View style={st.grab} /> : null}

              <View style={st.panelHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.panelTitle} numberOfLines={1}>{selectedRow.person}</Text>
                  <Text style={st.panelMeta} numberOfLines={1}>
                    {fmt(selectedRow.daysLost)} days lost · {fmt(counts.all)} stage{counts.all === 1 ? '' : 's'}
                  </Text>
                </View>
                <TouchableOpacity style={st.closeBtn} onPress={closePanel} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Close">
                  <Icon name="close" size={20} color={T.nav} />
                </TouchableOpacity>
              </View>

              {/* filters panel me sticky rehte hain, sirf list scroll hoti hai */}
              {renderFilters()}

              <ScrollView style={{ flex: 1 }} contentContainerStyle={st.panelList} showsVerticalScrollIndicator={false}>
                {visible.length === 0 ? (
                  <Text style={[st.muted, { textAlign: 'center', paddingVertical: 28 }]}>No orders for this filter.</Text>
                ) : (
                  visible.map((o, i) => (
                    <View key={o.key} style={[st.orderRow, i % 2 === 1 && st.orderRowAlt]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.poNo} numberOfLines={1}>{o.orderNo}</Text>
                        <Text style={st.design} numberOfLines={1}>{o.design || '—'}</Text>
                        <Text style={st.sub} numberOfLines={1}>
                          {o.stage} · Planned {fmtDate(o.planDate)}
                        </Text>
                      </View>
                      <Pill text={statusText(o)} color={statusColor(o.status)} strong={o.status === 'Overdue'} />
                    </View>
                  ))
                )}

                {renderMore()}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 },
  content: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  h1: { fontFamily: FONT_HEAD, fontSize: 19, fontWeight: '900', color: T.nav },
  h1Sub: { fontFamily: FONT, fontSize: 12, lineHeight: 16, fontWeight: '600', color: T.muted, marginTop: 2 },

  muted: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: T.muted },
  num: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.ink, textAlign: 'right' },
  numStrong: { fontFamily: FONT, fontSize: 12.5, fontWeight: '900', color: T.ink, textAlign: 'right' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  chipText: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: T.nav },

  redPill: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: 8, backgroundColor: `${T.red}18`, borderWidth: 1, borderColor: `${T.red}45` },
  redPillText: { fontFamily: FONT, fontSize: 12.5, fontWeight: '900', color: T.red },

  overlay: { flex: 1, backgroundColor: 'rgba(10,18,32,0.5)' },
  overlayWide: { flexDirection: 'row', justifyContent: 'flex-end' },
  overlaySheet: { justifyContent: 'flex-end' },
  panel: { backgroundColor: T.surface, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  panelWide: { height: '100%', borderLeftWidth: 1, borderLeftColor: T.border },
  panelSheet: { width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, marginTop: 8 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  panelTitle: { fontFamily: FONT_HEAD, fontSize: 17, fontWeight: '900', color: T.nav },
  panelMeta: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 1 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  panelList: { paddingBottom: 24 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.border },
  orderRowAlt: { backgroundColor: T.alt },
  poNo: { fontFamily: FONT, fontSize: 13, fontWeight: '900', color: T.ink },
  design: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.ink, marginTop: 1 },
  sub: { fontFamily: FONT, fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },

  colHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 2 },
  colHeadTx: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.3 },
  wCard: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  wCardOpen: { borderColor: T.copper, borderWidth: 1.5, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  wHead: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingHorizontal: 14, paddingVertical: 8 },
  wHeadOpen: { backgroundColor: `${T.copper}12` },
  wCell: { paddingHorizontal: 8, justifyContent: 'center', minWidth: 0 },
  wFirst: { paddingLeft: 0 },
  chev: { width: 28, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: T.nav },
  avatarTx: { fontFamily: FONT_HEAD, fontSize: 15, fontWeight: '900', color: '#fff' },
  wName: { flexShrink: 1, fontFamily: FONT_HEAD, fontSize: 14, fontWeight: '900', color: T.nav },

  wBody: { borderTopWidth: 1, borderTopColor: T.hair },
  band: { backgroundColor: T.sub, paddingHorizontal: 14, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: T.hair },
  bandTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bandLbl: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
  namePill: { maxWidth: 220, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: T.nav },
  namePillTx: { fontFamily: FONT, fontSize: 12, fontWeight: '800', color: '#fff' },
  bandMeta: { flex: 1, textAlign: 'right', fontFamily: FONT, fontSize: 12, fontWeight: '700', color: T.muted },
  bandFilters: { marginHorizontal: -16, marginTop: 8 },
  oHead: { flexDirection: 'row', alignItems: 'center', minHeight: 30, paddingHorizontal: 14, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.hair },
  oHeadTx: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.3 },
  oRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  oCell: { paddingHorizontal: 8, justifyContent: 'center', minWidth: 0 },
  oFirst: { paddingLeft: 0 },
  oPo: { fontFamily: FONT, fontSize: 12.5, fontWeight: '900', color: T.nav },
  oTx: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.ink },

  metaLine: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: T.muted, marginBottom: -4 },
  firstCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  th: { flexDirection: 'row', minHeight: 36, backgroundColor: T.nav, alignItems: 'center' },
  thText: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  tr: { flexDirection: 'row', minHeight: 46, alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: T.hair },
  trAlt: { backgroundColor: T.sub },
  trHi: { backgroundColor: `${T.copper}18` },
  td: { paddingHorizontal: 8, paddingVertical: 7, justifyContent: 'center', minWidth: 0 },
  tdFirst: { paddingLeft: 14 },
  tdRight: { alignItems: 'flex-end' },
  tdTextFirst: { fontFamily: FONT, fontSize: 12.5, fontWeight: '900', color: T.nav },

  expand: { backgroundColor: T.surface, borderLeftWidth: 3, borderLeftColor: T.copper, borderBottomWidth: 1, borderBottomColor: T.hair, paddingTop: 10 },
  expandMeta: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: T.muted, paddingHorizontal: 16, paddingBottom: 8 },
  expandScroll: { maxHeight: 400 },

  pCard: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, gap: 10 },
  pTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pName: { flex: 1, fontFamily: FONT_HEAD, fontSize: 15, fontWeight: '900', color: T.nav },
  lostBox: { alignItems: 'flex-end' },
  lostNum: { fontFamily: FONT, fontSize: 16, fontWeight: '900', color: T.ink },
  lostLbl: { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: T.muted },
  statRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minWidth: 0, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 10, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  statRed: { backgroundColor: `${T.red}12`, borderColor: `${T.red}45` },
  statNum: { fontFamily: FONT, fontSize: 15, fontWeight: '900', color: T.ink },
  statLbl: { fontFamily: FONT, fontSize: 10.5, fontWeight: '700', color: T.muted, marginTop: 1 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  fBtn: { height: 30, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  fBtnOn: { backgroundColor: T.nav, borderColor: T.nav },
  fText: { fontFamily: FONT, fontSize: 12, fontWeight: '800', color: T.muted },
  fTextOn: { color: '#fff' },

  moreBtn: { alignSelf: 'center', height: 38, paddingHorizontal: 18, borderRadius: 19, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  moreText: { fontFamily: FONT, fontSize: 12.5, fontWeight: '800', color: T.copper },
});
