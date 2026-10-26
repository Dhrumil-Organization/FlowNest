// FILE: src/components/OwnerDashboardNEW/OrderTracker.tsx
// NEW ERP — Owner Dashboard › Executive Summary drill-down (sales order stage tracker).
//
//   <ExecutiveOrders>  opened by tapping an executive row
//       GET /api/getOwnerSummaryOrders?date&prptype&executive_code
//       open sales orders of the executive, each with the 7-stage strip
//       Warp · Loom · Grey · Out · In · Pack · Sale, "Now at", Sold % and Delivery
//   <OrderDetail>      opened by tapping a sales order
//       GET /api/getOwnerSummaryOrderDetail?date&prptype&so_uid
//       header · "Now at" banner · per production order: Stage by stage, Sales orders on this
//       production order, Beam-wise dates, Outward and inward, Beam plan vs actual · Sales bills
//
// Display only — every date, delay and status comes from the API (which reads the ERP tracking table
// ProductionTrackingBeamSummary). Nothing is calculated here except the width of the plan-vs-actual bar.
// Wide screens show tables, phones show cards; wide tables scroll sideways when they do not fit.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Btn, CONTENT_MAX, PanelHeader, SearchBox } from '../erpUi';
import { getOwnerSummaryOrderDetail, getOwnerSummaryOrders, getSalesOrderDashboard, OwnerSummaryError } from './api';
import {
  dueText,
  nowText,
  pct,
  qty,
  RESULT_LABEL,
  stageStatusText,
  NOT_NEEDED,
  NOT_NEEDED_TEXT,
  NOT_STARTED,
  STATUS_LEGEND,
  statusColor,
  ymd,
  type BeamRow,
  type BillRow,
  type NowAt,
  type OutInRow,
  type PlanActualRow,
  type SiblingOrder,
  type StageCell,
  type StageDef,
  type StageRow,
  type StageStatus,
  type TrackerDetailData,
  type TrackerOrder,
  type TrackerOrdersData,
  type TrackerProductionOrder,
} from './trackerModel';
import { FONT } from './fonts';

type Session = { API: string; token: string; prptype: string; date: string };

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

export function useHardwareBack(onBack: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack, enabled]);
}

/** One stage dot. Filled = done, half = in progress, ringed red = overdue, dark grey = not started, dashed blue ring = not needed. */
export function StageDot({ status, size = 14 }: { status: StageStatus | undefined; size?: number }) {
  const c = statusColor(status);
  const r = size / 2;

  if (status === 'skip') {
    return (
      <View style={{ width: size, height: size, borderRadius: r, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c, backgroundColor: `${c}1A` }} />
    );
  }
  if (status === 'progress') {
    return (
      <View style={{ width: size, height: size, borderRadius: r, borderWidth: 1.5, borderColor: c, overflow: 'hidden', backgroundColor: T.surface }}>
        <View style={{ width: '50%', height: '100%', backgroundColor: c }} />
      </View>
    );
  }
  if (status === 'overdue') {
    return (
      <View style={{ width: size + 4, height: size + 4, margin: -2, borderRadius: r + 2, backgroundColor: `${c}33`, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size - 2, height: size - 2, borderRadius: r, backgroundColor: c }} />
      </View>
    );
  }
  if (status === 'ontime' || status === 'late') {
    return <View style={{ width: size, height: size, borderRadius: r, backgroundColor: c }} />;
  }
  // not started (and anything else): solid dark grey dot
  return <View style={{ width: size, height: size, borderRadius: r, backgroundColor: c }} />;
}

/** The 7 dots joined by a line. `labels` prints the short stage name under each dot (cards). */
export function StageStrip({ defs, stages, labels }: { defs: StageDef[]; stages: StageCell[] | undefined; labels?: boolean }) {
  const byKey = useMemo(() => {
    const map: Record<string, StageCell> = {};
    (stages || []).forEach((s) => (map[s.key] = s));
    return map;
  }, [stages]);

  return (
    <View style={st.strip}>
      <View style={st.stripLine} />
      {defs.map((d) => (
        <View key={d.key} style={st.stripCell}>
          <View style={st.stripDotWrap}>
            <StageDot status={byKey[d.key]?.status} />
          </View>
          {labels ? (
            <Text style={st.stripLabel} numberOfLines={1}>
              {d.short}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function Pill({ text, color, strong }: { text: string; color: string; strong?: boolean }) {
  return (
    <View style={[st.pill, { backgroundColor: `${color}${strong ? '22' : '14'}`, borderColor: `${color}45` }]}>
      <Text style={[st.pillText, { color: color === NOT_STARTED ? T.ink : color === NOT_NEEDED ? NOT_NEEDED_TEXT : color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export const pillColor = (status: StageStatus | undefined) =>
  status === 'ontime' ? T.green : status === 'late' ? T.pd : status === 'overdue' ? T.red : status === 'progress' ? T.yd : status === 'pending' ? NOT_STARTED : status === 'skip' ? NOT_NEEDED : T.muted;

function NowPill({ now }: { now: NowAt | undefined }) {
  return <Pill text={nowText(now)} color={pillColor(now?.status)} strong={now?.status === 'overdue'} />;
}

export function Legend() {
  return (
    <View style={st.legend}>
      {STATUS_LEGEND.map((l) => (
        <View key={l.status} style={st.legendItem}>
          <StageDot status={l.status} size={11} />
          <Text style={st.legendText}>{l.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function StateBox({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  if (loading) {
    return (
      <View style={st.stateBox}>
        <ActivityIndicator size="large" color={T.copper} />
        <Text style={st.stateText}>Loading…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[st.stateBox, { borderColor: `${T.red}40`, backgroundColor: `${T.red}08` }]}>
        <Icon name="error-outline" size={26} color={T.red} />
        <Text style={[st.stateText, { color: T.red, textAlign: 'center' }]}>{error}</Text>
        <Btn label="Retry" icon="refresh" compact onPress={onRetry} style={{ marginTop: 10 }} />
      </View>
    );
  }
  return null;
}

/* ------------------------------ mini table ------------------------------ */

export type Col<R> = {
  key: string;
  label: string;
  flex: number;
  align?: 'left' | 'right' | 'center';
  render: (row: R) => React.ReactNode;
};

export function MiniTable<R>({
  columns,
  rows,
  rowKey,
  minWidth,
  onRowPress,
  highlight,
  emptyText = 'Nothing recorded yet.',
  headerExtra,
}: {
  columns: Col<R>[];
  rows: R[];
  rowKey: (row: R, index: number) => string;
  minWidth: number;
  onRowPress?: (row: R) => void;
  highlight?: (row: R) => boolean;
  emptyText?: string;
  headerExtra?: (col: Col<R>) => React.ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const tableWidth = Math.max(width, minWidth);
  const alignStyle = (a?: string) => (a === 'right' ? st.tdRight : a === 'center' ? st.tdCenter : null);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={width > 0 && width < minWidth} bounces={false}>
        <View style={{ width: tableWidth || minWidth }}>
          <View style={st.th}>
            {columns.map((c, i) => (
              <View key={c.key} style={[st.td, { flex: c.flex }, alignStyle(c.align), i === 0 && st.tdFirst]}>
                {headerExtra?.(c) ?? (
                  <Text style={[st.thText, c.align === 'right' && { textAlign: 'right' }]} numberOfLines={1}>
                    {c.label}
                  </Text>
                )}
              </View>
            ))}
          </View>
          {rows.length === 0 ? (
            <View style={st.empty}>
              <Text style={st.emptyText}>{emptyText}</Text>
            </View>
          ) : (
            rows.map((row, ri) => {
              const body = (
                <View style={[st.tr, ri % 2 === 1 && st.trAlt, highlight?.(row) && st.trHi]}>
                  {columns.map((c, i) => {
                    const node = c.render(row);
                    return (
                      <View key={c.key} style={[st.td, { flex: c.flex }, alignStyle(c.align), i === 0 && st.tdFirst]}>
                        {typeof node === 'string' || typeof node === 'number' ? (
                          <Text
                            style={[st.tdText, i === 0 && st.tdTextFirst, c.align === 'right' && { textAlign: 'right' }]}
                            numberOfLines={1}
                          >
                            {node}
                          </Text>
                        ) : (
                          node
                        )}
                      </View>
                    );
                  })}
                </View>
              );
              const key = rowKey(row, ri);
              return onRowPress ? (
                <TouchableOpacity key={key} activeOpacity={0.75} onPress={() => onRowPress(row)} accessibilityRole="button">
                  {body}
                </TouchableOpacity>
              ) : (
                <React.Fragment key={key}>{body}</React.Fragment>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export function Card({ title, meta, right, children }: { title?: string; meta?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={st.card}>
      {title ? (
        <View style={st.cardHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            {meta ? (
              <Text style={st.cardMeta} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Collapsible section ("Show" / "Hide"). */
export function Fold({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={st.card}>
      <TouchableOpacity
        style={[st.cardHead, !open && { borderBottomWidth: 0 }]}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[st.cardTitle, { flex: 1 }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={st.foldAction}>{open ? 'Hide' : 'Show'}</Text>
        <Icon name={open ? 'expand-less' : 'expand-more'} size={20} color={T.copper} />
      </TouchableOpacity>
      {open ? children : null}
    </View>
  );
}

export function Fact({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <View style={st.fact}>
      <Text style={st.factLabel}>{label}</Text>
      {value !== undefined ? (
        <Text style={st.factValue} numberOfLines={1}>
          {value || '—'}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function DeliveryText({ order, align = 'left' }: { order: { due_ymd: number | null; days_to_due?: number | null }; align?: 'left' | 'right' }) {
  const days = order.days_to_due;
  const past = typeof days === 'number' && days < 0;
  return (
    <View style={align === 'right' ? { alignItems: 'flex-end' } : undefined}>
      <Text style={st.tdStrong} numberOfLines={1}>
        {ymd(order.due_ymd) || '—'}
      </Text>
      {days !== undefined ? (
        <Text style={[st.sub, past && { color: T.red, fontWeight: '800' }]} numberOfLines={1}>
          {dueText(days)}
        </Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Executive -> open sales orders                                   */
/* ------------------------------------------------------------------ */

type ListFilter = 'all' | 'overdue' | 'past' | 'unplanned';

const EMBED_PAGE = 20; // expanded executive list (web): ek baar me itne orders
const EMBED_PAGE_PHONE = 10; // phone: ek baar me itne order cards

export function ExecutiveOrders({
  session,
  executive,
  onBack,
  embedded = false,
  onOpenOrder,
}: {
  session: Session;
  executive: { code: string; name: string; /** sexeid (default = code) */ id?: string };
  onBack: () => void;
  /** true = grid ki row ke niche expand hone wala hissa (header / back / page scroll nahi); order click -> onOpenOrder */
  embedded?: boolean;
  onOpenOrder?: (o: TrackerOrder) => void;
}) {
  const [data, setData] = useState<TrackerOrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ListFilter>('all');
  const [selected, setSelected] = useState<TrackerOrder | null>(null);
  const [width, setWidth] = useState(0);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const base = { date: session.date, prptype: session.prptype, executive_code: executive.code };
      // grid row expand (embedded) -> getsalesorderdashboard (wahi payload + sexeid); full page -> purani API
      const result = embedded
        ? await getSalesOrderDashboard(session.API, session.token, { ...base, sexeid: executive.id ?? executive.code })
        : await getOwnerSummaryOrders(session.API, session.token, base);
      if (id === seq.current) setData(result);
    } catch (err: any) {
      if (id === seq.current) setError((err as OwnerSummaryError)?.message || 'Unable to load sales orders.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [session.API, session.token, session.date, session.prptype, executive.code, executive.id, embedded]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeDetail = useCallback(() => setSelected(null), []);
  useHardwareBack(selected ? closeDetail : onBack, !embedded);
  const openOrder = (o: TrackerOrder) => (embedded ? onOpenOrder?.(o) : setSelected(o));

  const defs = data?.stages || [];
  const wide = width >= 900;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.orders || []).filter((o) => {
      if (filter === 'overdue' && o.now?.status !== 'overdue') return false;
      if (filter === 'past' && !(typeof o.days_to_due === 'number' && o.days_to_due < 0)) return false;
      if (filter === 'unplanned' && (o.production_orders || []).length > 0) return false;
      if (!q) return true;
      return `${o.so_no} ${o.party} ${o.design} ${o.item}`.toLowerCase().includes(q);
    });
  }, [data?.orders, search, filter]);

  // embedded (grid ke andar expand): pehle EMBED_PAGE orders, baaki "Show more" se; list ki apni scroll
  const pageSize = wide ? EMBED_PAGE : EMBED_PAGE_PHONE;
  const [shown, setShown] = useState(pageSize);
  useEffect(() => {
    setShown(pageSize);
  }, [search, filter, data, pageSize]);
  const shownRows = embedded ? rows.slice(0, shown) : rows;
  // web: list ki apni scroll; phone: andar scroll nahi (page scroll hi), sirf "Show more"
  const scrollWrap = (node: React.ReactNode) =>
    embedded && wide ? (
      <ScrollView style={st.embedScroll} nestedScrollEnabled showsVerticalScrollIndicator>
        {node}
      </ScrollView>
    ) : (
      node
    );

  const columns = useMemo<Col<TrackerOrder>[]>(
    () => [
      {
        key: 'so',
        label: 'Sales order',
        flex: 1.5,
        render: (o) => (
          <View>
            <Text style={st.tdTextFirst} numberOfLines={1}>
              SO {o.so_no}
            </Text>
            <Text style={st.sub} numberOfLines={1}>
              {o.party || '—'}
            </Text>
          </View>
        ),
      },
      {
        key: 'design',
        label: 'Design',
        flex: 2,
        render: (o) => (
          <View>
            <Text style={st.tdStrong} numberOfLines={1}>
              {o.design || '—'}
              {o.more_designs > 0 ? `  +${o.more_designs}` : ''}
            </Text>
            <Text style={st.sub} numberOfLines={1}>
              {o.item || ' '}
            </Text>
          </View>
        ),
      },
      { key: 'qty', label: 'Qty', flex: 0.9, align: 'right', render: (o) => qty(o.qty) },
      { key: 'stages', label: 'Stages', flex: 2.6, render: (o) => <StageStrip defs={defs} stages={o.stages} /> },
      { key: 'now', label: 'Now at', flex: 1.7, render: (o) => <NowPill now={o.now} /> },
      { key: 'sold', label: 'Sold', flex: 0.6, align: 'right', render: (o) => pct(o.sold_pct) },
      { key: 'del', label: 'Delivery', flex: 1.2, render: (o) => <DeliveryText order={o} /> },
    ],
    [defs],
  );

  if (selected && !embedded) {
    return <OrderDetail session={session} order={selected} executiveName={executive.name} onBack={closeDetail} />;
  }

  const s = data?.summary;
  const chips: { key: ListFilter; label: string; n: number; color: string }[] = s
    ? [
        { key: 'all', label: 'All', n: s.orders, color: T.nav },
        { key: 'overdue', label: 'Overdue now', n: s.overdue, color: T.red },
        { key: 'past', label: 'Delivery date passed', n: s.delivery_past, color: T.pd },
        { key: 'unplanned', label: 'No production order', n: s.not_planned, color: T.muted },
      ]
    : [];

  const body = (
    <>
          <StateBox loading={loading && !data} error={error} onRetry={() => void load()} />

          {data ? (
            <>
              <View style={[st.toolbar, !wide && st.toolbarCol]}>
                <SearchBox value={search} onChangeText={setSearch} placeholder="Search order, party, design…" style={wide ? { width: 320 } : { width: '100%' }} />
                <View style={[st.chipRow, !wide && { flex: 0, width: '100%' }]}>
                  {chips.map((c) => {
                    const on = filter === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        onPress={() => setFilter(c.key)}
                        style={[st.chip, on && { backgroundColor: c.color, borderColor: c.color }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={[st.chipText, { color: on ? '#fff' : c.color }]}>
                          {c.label}  {c.n}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Legend />

              {!s?.tracking_available ? (
                <View style={st.warn}>
                  <Icon name="info-outline" size={15} color={T.amber} />
                  <Text style={st.warnText}>{s?.tracking_message || 'Production tracking data is not available.'}</Text>
                </View>
              ) : null}

              {scrollWrap(
                <View style={{ gap: 12 }}>
              {wide ? (
                <Card>
                  <MiniTable
                    columns={columns}
                    rows={shownRows}
                    rowKey={(o) => o.uid}
                    minWidth={900}
                    onRowPress={openOrder}
                    emptyText="No sales order for this filter."
                    headerExtra={(c) =>
                      c.key === 'stages' ? (
                        <View style={st.strip}>
                          {defs.map((d) => (
                            <View key={d.key} style={st.stripCell}>
                              <Text style={st.thText} numberOfLines={1}>
                                {d.short}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null
                    }
                  />
                </Card>
              ) : rows.length === 0 ? (
                <View style={st.stateBox}>
                  <Text style={st.stateText}>No sales order for this filter.</Text>
                </View>
              ) : (
                shownRows.map((o) => (
                  <TouchableOpacity key={o.uid} activeOpacity={0.8} onPress={() => openOrder(o)} style={st.orderCard} accessibilityRole="button">
                    <View style={st.orderTop}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.orderNo} numberOfLines={1}>
                          SO {o.so_no}
                        </Text>
                        <Text style={st.sub} numberOfLines={1}>
                          {o.party || '—'}
                        </Text>
                      </View>
                      <DeliveryText order={o} align="right" />
                    </View>
                    <Text style={[st.tdStrong, { marginTop: 8 }]} numberOfLines={1}>
                      {o.design || '—'}
                      {o.more_designs > 0 ? `  +${o.more_designs}` : ''}
                    </Text>
                    <Text style={st.sub} numberOfLines={1}>
                      {[o.item, `${qty(o.qty)} m`, `Sold ${pct(o.sold_pct)}`].filter(Boolean).join('  ·  ')}
                    </Text>
                    <View style={{ marginTop: 12 }}>
                      <StageStrip defs={defs} stages={o.stages} labels />
                    </View>
                    <View style={st.orderFoot}>
                      <NowPill now={o.now} />
                      <Icon name="chevron-right" size={20} color={T.muted} />
                    </View>
                  </TouchableOpacity>
                ))
              )}
                </View>,
              )}

              {embedded && rows.length > 0 ? (
                <View style={st.embedFoot}>
                  <Text style={st.embedFootTx}>
                    Showing {shownRows.length} of {rows.length}
                  </Text>
                  {rows.length > shownRows.length ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={st.moreBtn} activeOpacity={0.8} onPress={() => setShown((x) => x + pageSize)} accessibilityRole="button">
                        <Text style={st.moreBtnTx}>Show more (+{Math.min(pageSize, rows.length - shownRows.length)})</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={st.moreBtn} activeOpacity={0.8} onPress={() => setShown(rows.length)} accessibilityRole="button">
                        <Text style={st.moreBtnTx}>Show all</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {s?.truncated ? <Text style={st.footNote}>Showing the first {data.orders.length} orders by delivery date.</Text> : null}
            </>
          ) : null}
    </>
  );

  if (embedded) {
    return (
      <View style={st.embed} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {body}
      </View>
    );
  }

  return (
    <View style={st.screen}>
      <PanelHeader
        onBack={onBack}
        crumbs={['Owner Dashboard', 'Executive Summary']}
        title={executive.name}
        subtitle={s ? `${s.orders} open sales order${s.orders === 1 ? '' : 's'}  ·  as on ${session.date.split('-').reverse().join('-')}` : 'Open sales orders'}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <View style={st.content} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {body}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Sales order -> detail                                            */
/* ------------------------------------------------------------------ */

function BeamCell({ stage }: { stage: BeamRow['stages'][string] | undefined }) {
  if (!stage || stage.status === 'skip') return <Text style={st.muted}>—</Text>;
  if (stage.status === 'ontime' || stage.status === 'late') {
    return (
      <View style={st.beamCell}>
        <Text style={st.tdText} numberOfLines={1}>
          {ymd(stage.date_ymd, false) || 'done'}
        </Text>
        {stage.status === 'late' && stage.days > 0 ? <Pill text={`+${stage.days}`} color={T.pd} /> : null}
      </View>
    );
  }
  if (stage.status === 'overdue') return <Pill text={`${stage.days}d late`} color={T.red} strong />;
  return <Text style={st.muted}>pending</Text>;
}

function SplitBar({ row }: { row: PlanActualRow }) {
  const total = Math.max(row.on_plan + row.unplanned + row.not_made, 0.0001);
  return (
    <View style={st.split}>
      <View style={{ width: `${(row.on_plan / total) * 100}%`, backgroundColor: T.blue }} />
      <View style={{ width: `${(row.unplanned / total) * 100}%`, backgroundColor: T.amber }} />
    </View>
  );
}

const resultColor = (r: PlanActualRow['result']) => (r === 'as_planned' ? T.green : r === 'more' ? T.pd : r === 'unplanned' ? T.red : T.blue);

export function ProductionOrderBlock({
  po,
  defs,
  wide,
  showTitle,
  showFacts = true,
}: {
  po: TrackerProductionOrder;
  defs: StageDef[];
  wide: boolean;
  showTitle: boolean;
  showFacts?: boolean;
}) {
  const stageCols = useMemo<Col<StageRow>[]>(
    () => [
      {
        key: 'stage',
        label: 'Stage',
        flex: 2,
        render: (r) => (
          <View style={st.stageName}>
            <StageDot status={r.status} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.tdTextFirst} numberOfLines={1}>
                {r.label}
              </Text>
              <Text style={st.sub} numberOfLines={1}>
                {r.status === 'skip' ? 'not needed' : `${r.done} of ${r.total} beams`}
              </Text>
            </View>
          </View>
        ),
      },
      { key: 'resp', label: 'Responsible', flex: 1.3, render: () => <Pill text="Not assigned" color={T.muted} /> },
      { key: 'plan', label: 'Planned by', flex: 1.2, render: (r) => ymd(r.planned_ymd) || '—' },
      {
        key: 'done',
        label: 'Done on',
        flex: 1.2,
        render: (r) => (r.done_ymd ? ymd(r.done_ymd) : r.status === 'skip' ? '—' : <Text style={st.muted}>pending</Text>),
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

  const siblingCols = useMemo<Col<SiblingOrder>[]>(
    () => [
      {
        key: 'so',
        label: 'Sales order',
        flex: 1.6,
        render: (r) => (
          <View style={st.beamCell}>
            <Text style={st.tdTextFirst} numberOfLines={1}>
              SO {r.so_no}
            </Text>
            {r.is_current ? <Pill text="this one" color={T.copper} /> : null}
          </View>
        ),
      },
      { key: 'exe', label: 'Executive', flex: 1.6, render: (r) => r.executive || '—' },
      { key: 'party', label: 'Party', flex: 1.8, render: (r) => r.party || '—' },
      { key: 'qty', label: 'Qty', flex: 0.9, align: 'right', render: (r) => qty(r.qty) },
      { key: 'share', label: 'Share', flex: 0.7, align: 'right', render: (r) => pct(r.share_pct) },
      { key: 'del', label: 'Delivery', flex: 1, render: (r) => ymd(r.due_ymd) || '—' },
      { key: 'sold', label: 'Sold for it', flex: 1.1, align: 'right', render: (r) => `${qty(r.sold_qty)} (${pct(r.sold_pct)})` },
    ],
    [],
  );

  const beamCols = useMemo<Col<BeamRow>[]>(
    () => [
      { key: 'beam', label: 'Beam', flex: 1.1, render: (r) => r.beam },
      { key: 'mac', label: 'Machine', flex: 1.3, render: (r) => r.machine || '—' },
      { key: 'woven', label: 'Woven', flex: 0.8, align: 'right', render: (r) => qty(r.woven) },
      ...defs.map<Col<BeamRow>>((d) => ({ key: d.key, label: d.short, flex: 1.25, render: (r) => <BeamCell stage={r.stages[d.key]} /> })),
    ],
    [defs],
  );

  const outInCols = useMemo<Col<OutInRow>[]>(
    () => [
      { key: 'beam', label: 'Beam', flex: 1, render: (r) => r.beam },
      { key: 'onos', label: 'Outward nos', flex: 1.6, render: (r) => r.outward_nos || '—' },
      { key: 'odt', label: 'Outward dates', flex: 1.6, render: (r) => r.outward_dates || '—' },
      { key: 'oq', label: 'Out qty', flex: 0.8, align: 'right', render: (r) => (r.outward_qty > 0 ? qty(r.outward_qty) : '—') },
      { key: 'inos', label: 'Inward nos', flex: 1.4, render: (r) => r.inward_nos || '—' },
      { key: 'idt', label: 'Inward dates', flex: 1.4, render: (r) => r.inward_dates || '—' },
      { key: 'iq', label: 'In qty', flex: 0.8, align: 'right', render: (r) => (r.inward_qty > 0 ? qty(r.inward_qty) : '—') },
      { key: 'lot', label: 'Lot', flex: 1, render: (r) => r.lot || '—' },
    ],
    [],
  );

  const planCols = useMemo<Col<PlanActualRow>[]>(
    () => [
      { key: 'beam', label: 'Beam', flex: 1.1, render: (r) => r.beam },
      { key: 'p', label: 'Planned', flex: 0.8, align: 'right', render: (r) => qty(r.planned) },
      { key: 'a', label: 'Actual', flex: 0.8, align: 'right', render: (r) => qty(r.actual) },
      { key: 'o', label: 'On plan', flex: 0.8, align: 'right', render: (r) => qty(r.on_plan) },
      {
        key: 'u',
        label: 'Unplanned',
        flex: 0.9,
        align: 'right',
        render: (r) => (r.unplanned > 0 ? <Text style={[st.tdStrong, { color: T.pd, textAlign: 'right' }]}>{qty(r.unplanned)}</Text> : '—'),
      },
      { key: 'n', label: 'Not made', flex: 0.8, align: 'right', render: (r) => qty(r.not_made) },
      { key: 's', label: 'Split', flex: 1.6, render: (r) => <SplitBar row={r} /> },
      { key: 'r', label: 'Result', flex: 1.4, render: (r) => <Pill text={RESULT_LABEL[r.result]} color={resultColor(r.result)} /> },
    ],
    [],
  );

  return (
    <View style={{ gap: 12 }}>
      {showFacts ? (
        <View style={st.poBar}>
          <Fact label="Production order" value={po.no} />
          <Fact label="Design" value={po.design} />
          <Fact label="Item" value={po.item} />
          <Fact label="Qty" value={qty(po.qty)} />
          <Fact label="Beams" value={String(po.beams)} />
          <Fact label="Woven" value={qty(po.woven)} />
          <Fact label="Sold" value={qty(po.sold)} />
        </View>
      ) : null}

      <Card title={showTitle ? `Stage by stage · ${po.no}` : 'Stage by stage'}>
        {po.beams === 0 ? (
          <View style={st.empty}>
            <Text style={st.emptyText}>This production order is not on a beam yet — no stage has started.</Text>
          </View>
        ) : wide ? (
          <MiniTable columns={stageCols} rows={po.stages} rowKey={(r) => r.key} minWidth={720} />
        ) : (
          po.stages.map((r, i) => (
            <View key={r.key} style={[st.stageCard, i % 2 === 1 && st.trAlt]}>
              <View style={st.stageName}>
                <StageDot status={r.status} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.tdTextFirst}>{r.label}</Text>
                  <Text style={st.sub}>{r.status === 'skip' ? 'not needed' : `${r.done} of ${r.total} beams`}</Text>
                </View>
                <Pill text={stageStatusText(r.status, r.days, r.done, r.total)} color={pillColor(r.status)} strong={r.status === 'overdue'} />
              </View>
              <Text style={[st.sub, { marginTop: 6, marginLeft: 24 }]}>
                Planned by {ymd(r.planned_ymd) || '—'}  ·  {r.done_ymd ? `Done on ${ymd(r.done_ymd)}` : 'Not done yet'}  ·  Responsible: Not assigned
              </Text>
            </View>
          ))
        )}
        <Text style={st.cardNote}>Planned date = previous step done + standard days for this step. So a delay here is this step&apos;s own delay.</Text>
      </Card>

      <Card title="Sales orders on this production order">
        <MiniTable
          columns={siblingCols}
          rows={po.sales_orders}
          rowKey={(r) => r.uid}
          minWidth={760}
          highlight={(r) => r.is_current}
          emptyText="No sales order is linked to this production order."
        />
      </Card>

      <Fold title={`Beam-wise dates (${po.beam_rows.length} beam${po.beam_rows.length === 1 ? '' : 's'})`}>
        <MiniTable columns={beamCols} rows={po.beam_rows} rowKey={(r) => r.beam_uid} minWidth={980} emptyText="No beam on this production order yet." />
      </Fold>

      <Fold title="Outward and inward">
        <MiniTable columns={outInCols} rows={po.out_in} rowKey={(r, i) => `${r.beam}-${i}`} minWidth={940} emptyText="No outward or inward yet." />
      </Fold>

      <Fold
        title={
          po.plan_actual.available && po.plan_actual.unplanned_pct !== null
            ? `Beam plan vs actual · ${Math.round(po.plan_actual.unplanned_pct)}% unplanned`
            : 'Beam plan vs actual'
        }
      >
        {po.plan_actual.available ? (
          <MiniTable columns={planCols} rows={po.plan_actual.rows} rowKey={(r, i) => `${r.beam}-${i}`} minWidth={900} emptyText="No beam plan found." />
        ) : (
          <View style={st.empty}>
            <Text style={st.emptyText}>Beam plan could not be read for this production order.</Text>
          </View>
        )}
      </Fold>
    </View>
  );
}

/** The four collapsible sections of a production order: Beam-wise dates, Outward and inward, Sales bills, Beam plan vs actual. */
export type ProdFoldsData = {
  beam_rows: BeamRow[];
  out_in: OutInRow[];
  bills: { available: boolean; rows: BillRow[] };
  plan_actual: { available: boolean; unplanned_pct: number | null; rows: PlanActualRow[] };
};

export function ProductionOrderFolds({ data, defs }: { data: ProdFoldsData; defs: StageDef[] }) {
  const beamCols = useMemo<Col<BeamRow>[]>(
    () => [
      { key: 'beam', label: 'Beam', flex: 1.1, render: (r) => r.beam },
      { key: 'mac', label: 'Machine', flex: 1.3, render: (r) => r.machine || '—' },
      { key: 'woven', label: 'Woven', flex: 0.8, align: 'right', render: (r) => qty(r.woven) },
      ...defs.map<Col<BeamRow>>((d) => ({ key: d.key, label: d.short, flex: 1.25, render: (r) => <BeamCell stage={r.stages?.[d.key]} /> })),
    ],
    [defs],
  );

  const outInCols = useMemo<Col<OutInRow>[]>(
    () => [
      { key: 'beam', label: 'Beam', flex: 1, render: (r) => r.beam },
      { key: 'onos', label: 'Outward nos', flex: 1.6, render: (r) => r.outward_nos || '—' },
      { key: 'odt', label: 'Outward dates', flex: 1.6, render: (r) => r.outward_dates || '—' },
      { key: 'oq', label: 'Out qty', flex: 0.8, align: 'right', render: (r) => (r.outward_qty > 0 ? qty(r.outward_qty) : '—') },
      { key: 'inos', label: 'Inward nos', flex: 1.4, render: (r) => r.inward_nos || '—' },
      { key: 'idt', label: 'Inward dates', flex: 1.4, render: (r) => r.inward_dates || '—' },
      { key: 'iq', label: 'In qty', flex: 0.8, align: 'right', render: (r) => (r.inward_qty > 0 ? qty(r.inward_qty) : '—') },
      { key: 'lot', label: 'Lot', flex: 1, render: (r) => r.lot || '—' },
    ],
    [],
  );

  const planCols = useMemo<Col<PlanActualRow>[]>(
    () => [
      { key: 'beam', label: 'Beam', flex: 1.1, render: (r) => r.beam },
      { key: 'p', label: 'Planned', flex: 0.8, align: 'right', render: (r) => qty(r.planned) },
      { key: 'a', label: 'Actual', flex: 0.8, align: 'right', render: (r) => qty(r.actual) },
      { key: 'o', label: 'On plan', flex: 0.8, align: 'right', render: (r) => qty(r.on_plan) },
      {
        key: 'u',
        label: 'Unplanned',
        flex: 0.9,
        align: 'right',
        render: (r) => (r.unplanned > 0 ? <Text style={[st.tdStrong, { color: T.pd, textAlign: 'right' }]}>{qty(r.unplanned)}</Text> : '—'),
      },
      { key: 'n', label: 'Not made', flex: 0.8, align: 'right', render: (r) => qty(r.not_made) },
      { key: 's', label: 'Split', flex: 1.6, render: (r) => <SplitBar row={r} /> },
      { key: 'r', label: 'Result', flex: 1.4, render: (r) => <Pill text={RESULT_LABEL[r.result]} color={resultColor(r.result)} /> },
    ],
    [],
  );

  const billCols = useMemo<Col<BillRow>[]>(
    () => [
      { key: 'ch', label: 'Challan', flex: 1.2, render: (r) => r.challan_no || '—' },
      { key: 'chd', label: 'Challan date', flex: 1.1, render: (r) => ymd(r.challan_ymd) || '—' },
      { key: 'b', label: 'Bill no', flex: 1.2, render: (r) => r.bill_no || 'not billed' },
      { key: 'bd', label: 'Bill date', flex: 1.1, render: (r) => ymd(r.bill_ymd) || '—' },
      { key: 'q', label: 'Qty', flex: 0.9, align: 'right', render: (r) => qty(r.qty) },
      {
        key: 'a',
        label: 'Amount',
        flex: 1.2,
        align: 'right',
        render: (r) => `₹${Number(r.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      },
    ],
    [],
  );

  const beams = data.beam_rows;
  const pa = data.plan_actual;

  return (
    <View style={{ gap: 12 }}>
      <Fold title={`Beam-wise dates (${beams.length} beam${beams.length === 1 ? '' : 's'})`}>
        <MiniTable columns={beamCols} rows={beams} rowKey={(r, i) => `${r.beam_uid || r.beam}-${i}`} minWidth={980} emptyText="No beam on this production order yet." />
      </Fold>

      <Fold title="Outward and inward">
        <MiniTable columns={outInCols} rows={data.out_in} rowKey={(r, i) => `${r.beam}-${i}`} minWidth={940} emptyText="No outward or inward yet." />
      </Fold>

      <Fold title={`Sales bills${data.bills.rows.length ? ` (${data.bills.rows.length})` : ''}`}>
        <MiniTable
          columns={billCols}
          rows={data.bills.rows}
          rowKey={(r, i) => `${r.challan_no}-${r.bill_no}-${i}`}
          minWidth={720}
          emptyText={data.bills.available ? 'No sales recorded yet.' : 'No sales bill found.'}
        />
      </Fold>

      <Fold title={pa.available && pa.unplanned_pct !== null ? `Beam plan vs actual · ${Math.round(pa.unplanned_pct)}% unplanned` : 'Beam plan vs actual'}>
        {pa.available ? (
          <MiniTable columns={planCols} rows={pa.rows} rowKey={(r, i) => `${r.beam}-${i}`} minWidth={900} emptyText="No beam plan found." />
        ) : (
          <View style={st.empty}>
            <Text style={st.emptyText}>No beam plan found for this production order.</Text>
          </View>
        )}
      </Fold>
    </View>
  );
}

export function OrderDetail({
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
  const [data, setData] = useState<TrackerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [width, setWidth] = useState(0);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const result = await getOwnerSummaryOrderDetail(session.API, session.token, {
        date: session.date,
        prptype: session.prptype,
        so_uid: order.uid,
      });
      if (id === seq.current) setData(result);
    } catch (err: any) {
      if (id === seq.current) setError((err as OwnerSummaryError)?.message || 'Unable to load sales order detail.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [session.API, session.token, session.date, session.prptype, order.uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const wide = width >= 760;
  const o = data?.order || order;
  const now = data?.now;
  const past = typeof o.days_to_due === 'number' && o.days_to_due < 0;

  const billCols = useMemo<Col<BillRow>[]>(
    () => [
      { key: 'ch', label: 'Challan', flex: 1.2, render: (r) => r.challan_no || '—' },
      { key: 'chd', label: 'Challan date', flex: 1.1, render: (r) => ymd(r.challan_ymd) || '—' },
      { key: 'b', label: 'Bill no', flex: 1.2, render: (r) => r.bill_no || 'not billed' },
      { key: 'bd', label: 'Bill date', flex: 1.1, render: (r) => ymd(r.bill_ymd) || '—' },
      { key: 'q', label: 'Qty', flex: 0.9, align: 'right', render: (r) => qty(r.qty) },
      {
        key: 'a',
        label: 'Amount',
        flex: 1.2,
        align: 'right',
        render: (r) => `₹${r.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      },
    ],
    [],
  );

  const bannerColor = now?.status === 'overdue' ? T.red : now?.status === 'none' ? T.muted : T.green;

  return (
    <View style={st.screen}>
      <PanelHeader onBack={onBack} backLabel="Back to list" crumbs={[executiveName, 'Sales order']} title={`SO ${o.so_no}`} subtitle={o.party || undefined} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <View style={st.content} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <View style={st.poBar}>
            <Fact label="Executive" value={o.executive} />
            <Fact label="Party" value={o.party} />
            <Fact label="Design" value={`${o.design || '—'}${o.more_designs > 0 ? `  +${o.more_designs}` : ''}`} />
            <Fact label="Qty" value={qty(o.qty)} />
            <Fact label="Sold" value={`${qty(o.sold_qty)} (${pct(o.sold_pct)})`} />
            <Fact label="Delivery">
              <View style={st.beamCell}>
                <Text style={st.factValue}>{ymd(o.due_ymd) || '—'}</Text>
                {o.due_ymd ? <Pill text={dueText(o.days_to_due)} color={past ? T.red : T.green} strong={past} /> : null}
              </View>
            </Fact>
          </View>

          <StateBox loading={loading && !data} error={error} onRetry={() => void load()} />

          {data && now ? (
            <>
              <View style={[st.banner, { borderLeftColor: bannerColor }]}>
                <Text style={st.bannerText}>
                  {now.status === 'none' ? (
                    <Text style={st.bannerStrong}>{now.label}.</Text>
                  ) : now.key === 'done' ? (
                    <Text style={st.bannerStrong}>All stages are done.</Text>
                  ) : (
                    <>
                      Now at <Text style={st.bannerStrong}>{now.label}</Text>
                      {now.status === 'overdue' ? (
                        <Text style={{ color: T.red, fontWeight: '900' }}>
                          , {now.days} day{now.days === 1 ? '' : 's'} late
                        </Text>
                      ) : null}
                      . Responsible: <Text style={st.bannerStrong}>Not assigned</Text>.
                    </>
                  )}
                </Text>
                {data.biggest_delay ? (
                  <Text style={st.sub}>
                    Biggest delay so far: {data.biggest_delay.label}, {data.biggest_delay.days} day{data.biggest_delay.days === 1 ? '' : 's'}.
                  </Text>
                ) : null}
              </View>

              {!data.tracking_available ? (
                <View style={st.warn}>
                  <Icon name="info-outline" size={15} color={T.amber} />
                  <Text style={st.warnText}>{data.tracking_message || 'Production tracking data is not available.'}</Text>
                </View>
              ) : null}

              {data.production_orders.length === 0 ? (
                <View style={st.stateBox}>
                  <Icon name="pending-actions" size={26} color={T.muted} />
                  <Text style={st.stateText}>No production order is made for this sales order yet.</Text>
                </View>
              ) : (
                data.production_orders.map((po) => (
                  <ProductionOrderBlock key={po.uid} po={po} defs={data.stages} wide={wide} showTitle={data.production_orders.length > 1} />
                ))
              )}

              <Fold title={`Sales bills${data.bills.rows.length ? ` (${data.bills.rows.length})` : ''}`}>
                <MiniTable
                  columns={billCols}
                  rows={data.bills.rows}
                  rowKey={(r, i) => `${r.challan_no}-${r.bill_no}-${i}`}
                  minWidth={720}
                  emptyText={data.bills.available ? 'No sales recorded yet.' : 'Sales bills could not be read.'}
                />
              </Fold>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const st = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, backgroundColor: T.bg, zIndex: 20, elevation: 20 },
  scroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 },
  content: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: 12 },
  embed: { width: '100%', gap: 12 },
  embedScroll: { maxHeight: 440 }, // expanded list ki apni scroll - upar ka main page lamba nahi hota
  embedFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  embedFootTx: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: T.muted },
  moreBtn: { height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  moreBtnTx: { fontFamily: FONT, fontSize: 12, fontWeight: '800', color: T.copper },

  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  stateText: { marginTop: 8, fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.muted },

  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  toolbarCol: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch', gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
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

  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, paddingHorizontal: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontFamily: FONT, fontSize: 11.5, fontWeight: '600', color: T.muted },

  warn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    backgroundColor: `${T.amber}14`,
    borderWidth: 1,
    borderColor: `${T.amber}40`,
  },
  warnText: { flex: 1, fontFamily: FONT, fontSize: 12, lineHeight: 16, fontWeight: '600', color: T.pd },

  // stage strip
  strip: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, minWidth: 0 },
  stripLine: { position: 'absolute', left: '7%', right: '7%', top: 8, height: 2, backgroundColor: T.border },
  stripCell: { flex: 1, alignItems: 'center', minWidth: 0 },
  stripDotWrap: { height: 18, alignItems: 'center', justifyContent: 'center' },
  stripLabel: { marginTop: 3, fontFamily: FONT, fontSize: 9.5, fontWeight: '700', color: T.muted },

  pill: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start', maxWidth: '100%' },
  pillText: { fontFamily: FONT, fontSize: 11, fontWeight: '800' },

  // cards + table
  card: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  cardTitle: { fontFamily: FONT, fontSize: 13, fontWeight: '900', color: T.nav },
  cardMeta: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  cardNote: {
    fontFamily: FONT,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: T.muted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: T.hair,
    backgroundColor: T.sub,
  },
  foldAction: { fontFamily: FONT, fontSize: 12, fontWeight: '800', color: T.copper },

  th: { flexDirection: 'row', minHeight: 36, backgroundColor: T.nav, alignItems: 'center' },
  thText: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  tr: { flexDirection: 'row', minHeight: 46, alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: T.hair },
  trAlt: { backgroundColor: T.sub },
  trHi: { backgroundColor: `${T.copper}18` },
  td: { paddingHorizontal: 8, paddingVertical: 7, justifyContent: 'center', minWidth: 0 },
  tdFirst: { paddingLeft: 14 },
  tdRight: { alignItems: 'flex-end' },
  tdCenter: { alignItems: 'center' },
  tdText: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.ink },
  tdTextFirst: { fontFamily: FONT, fontSize: 12.5, fontWeight: '900', color: T.nav },
  tdStrong: { fontFamily: FONT, fontSize: 12.5, fontWeight: '800', color: T.ink },
  sub: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  muted: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: T.muted },
  empty: { paddingVertical: 24, paddingHorizontal: 14, alignItems: 'center' },
  emptyText: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.muted, textAlign: 'center' },
  footNote: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: T.muted, textAlign: 'center' },

  // phone order card
  orderCard: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  orderTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  orderNo: { fontFamily: FONT, fontSize: 15, fontWeight: '900', color: T.nav },
  orderFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: T.hair,
  },

  // detail
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
  fact: { minWidth: 70, maxWidth: '100%', flexShrink: 1 },
  factLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  factValue: { fontFamily: FONT, fontSize: 13.5, fontWeight: '800', color: T.ink, marginTop: 2 },
  banner: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  bannerText: { fontFamily: FONT, fontSize: 14, lineHeight: 20, fontWeight: '600', color: T.ink },
  bannerStrong: { fontWeight: '900', color: T.nav },
  stageName: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageCard: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.hair },
  beamCell: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  split: { flexDirection: 'row', height: 7, borderRadius: 4, backgroundColor: T.alt, overflow: 'hidden', width: '100%' },
});
