// FILE: src/components/OwnerDashboardNEW/SalesOrderDetail.tsx
// NEW ERP — Owner Dashboard › Executive Summary › sales order detail (row click).
//
// Same flow as the Production orders detail (ProductionOrders.tsx -> ProdOrderDetail), but opened from a SALES order:
//
//   the sales order row (getsalesorderdashboard) already carries TrackId + ProductionOrderNo of its production order(s).
//   For every production order of the sales order the SAME APIs run with that TrackId:
//     GET getprodorderstagedashboard?prpcode&yearno&trackid          -> "Stage by stage"
//     (opened lazily, one API per collapsible section — see ProdOrderSections.tsx)
//     GET salesorderfromproductionorder?prpcode&yearno&trackid       -> Sales orders
//     GET getprodorderbeamwisedashboard?prpcode&yearno&trackid       -> Beam-wise dates
//     GET getprodorderinwoutdashboard?prpcode&yearno&trackid         -> Outward and inward
//     GET getprodordersalesinvoicedashboard?prpcode&yearno&trackid   -> Sales bills
//     GET getprodbeamplantrackid?prpcode&yearno&trackid              -> Beam plan vs actual
//
//   - no production order yet (TrackId = null)   -> header + "No production order" message, NO api call
//   - more than one production order             -> one chip per production order, the selected one is drawn
//
// Display only: every date / status / count comes from the API.
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { CONTENT_MAX, PanelHeader } from '../erpUi';
import { getProdOrderStageDashboard, OwnerSummaryError } from './api';
import { Card, Col, Fact, MiniTable, Pill, pillColor, StageDot, StateBox } from './OrderTracker';
import {
  delayDays,
  nowOf,
  normalizeStageDetail,
  num,
  PRP_CODE,
  stageYearNo,
  type ProdOrderRow,
  type StageDetail,
  type StageDetailRow,
} from './prodOrderModel';
import { ProdOrderSections } from './ProdOrderSections';
import { dueText, pct, qty, stageStatusText, ymd, type TrackerOrder } from './trackerModel';
import { FONT } from './fonts';

type Session = { API: string; token: string; prptype: string; date: string };
type ProdRef = NonNullable<TrackerOrder['production_orders']>[number];

/* ------------------------------------------------------------------ */
/* Stage by stage (getprodorderstagedashboard, by TrackId)             */
/* ------------------------------------------------------------------ */

function StageCard({ session, trackId, wide }: { session: { API: string; token: string }; trackId: string; wide: boolean }) {
  const [detail, setDetail] = useState<StageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const body = await getProdOrderStageDashboard(session.API, session.token, {
        prpcode: PRP_CODE,
        yearno: stageYearNo(),
        trackid: trackId,
      });
      if (id !== seq.current) return;
      const d = normalizeStageDetail(body);
      if (d) setDetail(d);
      else setError('The stage detail came back in a format this screen does not understand yet.');
    } catch (err: any) {
      if (id === seq.current) setError((err as OwnerSummaryError)?.message || 'Unable to load stage detail.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [session.API, session.token, trackId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stageCols = useMemo<Col<StageDetailRow>[]>(
    () => [
      {
        key: 'stage',
        label: 'Stage',
        flex: 2,
        render: (r) => (
          <View style={st.stageName}>
            <StageDot status={r.status} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.tdFirst} numberOfLines={1}>
                {r.label}
              </Text>
              <Text style={st.subDark} numberOfLines={1}>
                {r.status === 'skip' ? 'not needed' : `${r.done} of ${r.total} beams`}
              </Text>
            </View>
          </View>
        ),
      },
      { key: 'plan', label: 'Planned by', flex: 1.2, render: (r) => ymd(r.planned_ymd) || '—' },
      {
        key: 'done',
        label: 'Done on',
        flex: 1.2,
        render: (r) => (r.done_ymd ? ymd(r.done_ymd) : r.status === 'skip' ? '—' : <Text style={st.pendingText}>pending</Text>),
      },
      {
        key: 'status',
        label: 'Status',
        flex: 1.7,
        render: (r) => <Pill text={stageStatusText(r.status, r.days, r.done, r.total)} color={pillColor(r.status)} strong={r.status === 'overdue'} />,
      },
    ],
    [],
  );

  return (
    <>
      <StateBox loading={loading && !detail} error={error} onRetry={() => void load()} />
      {detail ? (
        <Card title="Stage by stage">
          {wide ? (
            <MiniTable columns={stageCols} rows={detail.stages} rowKey={(r) => r.key} minWidth={640} emptyText="No stage found for this production order." />
          ) : (
            detail.stages.map((r, i) => (
              <View key={r.key} style={[st.stageCard, i % 2 === 1 && { backgroundColor: T.alt }]}>
                <View style={st.stageName}>
                  <StageDot status={r.status} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.tdFirst}>{r.label}</Text>
                    <Text style={st.subDark}>{r.status === 'skip' ? 'not needed' : `${r.done} of ${r.total} beams`}</Text>
                  </View>
                  <Pill text={stageStatusText(r.status, r.days, r.done, r.total)} color={pillColor(r.status)} strong={r.status === 'overdue'} />
                </View>
                <Text style={[st.subDark, { marginTop: 6, marginLeft: 24 }]}>
                  Planned by {ymd(r.planned_ymd) || '—'}  ·  {r.done_ymd ? `Done on ${ymd(r.done_ymd)}` : 'Not done yet'}
                </Text>
              </View>
            ))
          )}
        </Card>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* One production order of the sales order                              */
/* ------------------------------------------------------------------ */

function ProductionOrderPart({ session, po, wide }: { session: { API: string; token: string }; po: ProdRef; wide: boolean }) {
  const row = (po.row || {}) as ProdOrderRow;
  const now = nowOf(row);
  const days = delayDays(row);
  const color = now.status === 'overdue' ? T.red : now.status === 'pending' ? T.muted : T.green;

  return (
    <View style={{ gap: 12 }}>
      <View style={[st.banner, { borderLeftColor: color }]}>
        <Text style={st.bannerText}>
          Production order <Text style={st.bannerStrong}>{po.no || '—'}</Text> is now at <Text style={st.bannerStrong}>{now.label}</Text>
          {days > 0 ? (
            <Text style={{ color: T.red, fontWeight: '900' }}>
              , {days} day{days === 1 ? '' : 's'} late
            </Text>
          ) : null}
          .
        </Text>
      </View>

      <View style={st.poBar}>
        <Fact label="Production order" value={po.no} />
        <Fact label="Design" value={row.dsnname || ''} />
        <Fact label="Item" value={row.itmname || ''} />
        <Fact label="Production qty" value={qty(num(row.ProductionQty))} />
        <Fact label="Beams" value={String(Math.round(num(row.BeamCount)))} />
        <Fact label="PO sold" value={pct(num(row.SoldPercent))} />
      </View>

      <StageCard session={session} trackId={po.uid} wide={wide} />

      <ProdOrderSections session={session} trackId={po.uid} wide={wide} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function SalesOrderDetail({
  session,
  order,
  executiveName,
  onBack,
}: {
  session: Session;
  order: TrackerOrder;
  executiveName: string;
  onBack: () => void;
}) {
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState(0);
  const wide = width >= 760;
  const api = useMemo(() => ({ API: session.API, token: session.token }), [session.API, session.token]);

  const pos = order.production_orders || [];
  const po = pos[Math.min(picked, Math.max(pos.length - 1, 0))];
  const now = order.now;
  const past = typeof order.days_to_due === 'number' && order.days_to_due < 0;
  const bannerColor = now?.status === 'overdue' ? T.red : now?.status === 'none' || !now ? T.muted : T.green;

  return (
    <View style={st.overlay}>
      <PanelHeader onBack={onBack} backLabel="Back to list" crumbs={[executiveName, 'Sales order']} title={`SO ${order.so_no}`} subtitle={order.party || undefined} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <View style={st.content} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {/* sales order header */}
          <View style={st.poBar}>
            <Fact label="Sales order" value={`SO ${order.so_no}`} />
            <Fact label="Date" value={ymd(order.so_date_ymd) || ''} />
            <Fact label="Party" value={order.party} />
            <Fact label="Design" value={`${order.design || '—'}${order.more_designs > 0 ? `  +${order.more_designs}` : ''}`} />
            <Fact label="Qty" value={qty(order.qty)} />
            <Fact label="Sold" value={`${qty(order.sold_qty)} (${pct(order.sold_pct)})`} />
            <Fact label="Delivery">
              <View style={st.rowGap}>
                <Text style={st.factValue}>{ymd(order.due_ymd) || '—'}</Text>
                {order.due_ymd ? <Pill text={dueText(order.days_to_due)} color={past ? T.red : T.green} strong={past} /> : null}
              </View>
            </Fact>
          </View>

          {pos.length === 0 ? (
            <>
              <View style={[st.banner, { borderLeftColor: bannerColor }]}>
                <Text style={st.bannerText}>
                  <Text style={st.bannerStrong}>{now?.label || 'No Production Order'}.</Text>
                  {past ? ` Delivery date is already ${Math.abs(order.days_to_due as number)} day${order.days_to_due === -1 ? '' : 's'} past.` : ''}
                </Text>
              </View>
              <View style={st.stateBox}>
                <Icon name="pending-actions" size={26} color={T.muted} />
                <Text style={st.stateText}>No production order is made for this sales order yet.</Text>
              </View>
            </>
          ) : (
            <>
              {pos.length > 1 ? (
                <View style={{ gap: 6 }}>
                  <Text style={st.pickLabel}>{pos.length} production orders on this sales order</Text>
                  <View style={st.chipRow}>
                    {pos.map((p, i) => {
                      const on = i === Math.min(picked, pos.length - 1);
                      return (
                        <TouchableOpacity
                          key={p.uid}
                          onPress={() => setPicked(i)}
                          style={[st.chip, on && { backgroundColor: T.nav, borderColor: T.nav }]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                        >
                          <Text style={[st.chipText, { color: on ? '#fff' : T.nav }]}>PO {p.no || p.uid}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {/* key = TrackId -> state + lazily loaded sections reset when another production order is picked */}
              {po ? <ProductionOrderPart key={po.uid} session={api} po={po} wide={wide} /> : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: T.bg, zIndex: 20, elevation: 20 },
  scroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 },
  content: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: 12 },
  poBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 22,
    rowGap: 10,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  factValue: { fontFamily: FONT, fontSize: 13.5, fontWeight: '800', color: T.ink },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  banner: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerText: { fontFamily: FONT, fontSize: 14, lineHeight: 20, fontWeight: '600', color: T.ink },
  bannerStrong: { fontWeight: '900', color: T.nav },
  stateBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  stateText: { marginTop: 8, fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.muted, textAlign: 'center' },
  pickLabel: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: FONT, fontSize: 12, fontWeight: '800' },
  stageName: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageCard: { paddingHorizontal: 14, paddingVertical: 10 },
  tdFirst: { fontFamily: FONT, fontSize: 12.5, fontWeight: '900', color: T.nav },
  subDark: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: T.ink, marginTop: 1 },
  pendingText: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.ink },
});
