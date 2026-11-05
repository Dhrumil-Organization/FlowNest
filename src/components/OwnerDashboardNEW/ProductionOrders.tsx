// FILE: src/components/OwnerDashboardNEW/ProductionOrders.tsx
// NEW ERP — Production orders tracking.
//
//   GET /api/getprodorderdashboard  (see ./api.ts -> getProdOrderDashboard)
//     summary -> 4 clickable cards (All · Stage overdue · Shared · Fully sold). Tap = filter the list, tap again = clear.
//     data    -> wide screen: table  |  phone: one card per production order.
//   Tap a row / card -> GET /api/getprodorderstagedashboard?prpcode=sip&yearno=<financial year>&trackid=<row TrackId>
//     -> detail screen: Now at · stage by stage · sales orders · beam-wise dates · outward / inward · bills · beam plan vs actual
//
// Display only: every number / status comes from the API. The only thing done here is the card filter.
//   Stage overdue = a stage is Overdue OR TotalDelayDays > 0   (matches summary.stageOverdue)
//   Fully sold    = SoldPercent >= 95                          (matches summary.fullySold)
//   Shared        = order has an executive (SexName)           (API sends no per-order share list)
//
// Use it:   <ProductionOrders token={token} API={API} prptype="S" />            (plain screen)
//           <ProductionOrders token={token} API={API} onBack={() => ...} />      (overlay with back header)
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CONTENT_MAX, IconBtn, PanelHeader, SearchBox } from '../erpUi';
import { getMissedData, getProdOrderDashboard, getProdOrderStageDashboard, OwnerSummaryError } from './api';
import { Card, Col, Fact, Legend, MiniTable, Pill, pillColor, StageDot, StageStrip, StateBox } from './OrderTracker';
import {
  beamsText,
  delayDays,
  financialYear,
  hasExecutive,
  isFullySold,
  isOverdue,
  nowOf,
  nowPillText,
  normalizeStageDetail,
  num,
  PRP_CODE,
  stageCells,
  stageDefsFor,
  stageYearNo,
  type ProdFilter,
  type ProdOrderData,
  type ProdOrderRow,
  type StageDetail,
  type StageDetailRow,
} from './prodOrderModel';
import { ProdOrderSections } from './ProdOrderSections';
import { pct, qty, stageStatusText, ymd } from './trackerModel';
import { FONT, FONT_HEAD } from './fonts';

type Props = {
  token: string;
  API: string;
  prptype?: string;
  onBack?: () => void;
  /** shared Executive filter ('' = all) */
  /** code of the selected sales executive ('' = All) — the grid is filtered by the row's Sexe on the phone, no API call */
  executiveCode?: string;
  /** bump to reload (shared Refresh button) */
  refreshTick?: number;
  onBusyChange?: (busy: boolean) => void;
  /** called with true when a production order detail is opened, false when it is closed (parent hides its tabs) */
  onDetailChange?: (open: boolean) => void;
};

const PAGE = 50;
const WIDE = 900;

const orderDate = (row: ProdOrderRow) => ymd(num(row.ProductionOrderDate)) || '';
const fmtCount = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-IN') : '—');

function NowPill({ row }: { row: ProdOrderRow }) {
  const now = nowOf(row);
  return <Pill text={nowPillText(now, row)} color={pillColor(now.status)} strong={now.status === 'overdue'} />;
}

function ExecChip({ name }: { name: string | null }) {
  if (!name || !name.trim()) return <Text style={st.muted}>—</Text>;
  return (
    <View style={st.chip}>
      <Text style={st.chipText} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* "Missed data" button (grid)                                         */
/* ------------------------------------------------------------------ */
//   GET /api/getmisseddata?prpcode=SIP&yearno=<yy>&trackid=<row TrackId>   (see ./api.ts -> getMissedData)
//   No popup: only the API's "message" is shown, as a small notice at the bottom of the screen (auto-hides).

type Notice = { text: string; error: boolean };
const NOTICE_MS = 4000;

function MissedDataButton({ onPress, loading, compact }: { onPress: () => void; loading?: boolean; compact?: boolean }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={loading}
      onPress={(e: any) => {
        e?.stopPropagation?.(); // do not also open the production order detail
        onPress();
      }}
      style={[st.missBtn, compact && st.missBtnCompact, loading && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel="Show missed data"
      accessibilityState={{ busy: !!loading, disabled: !!loading }}
    >
      {loading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="sync" size={compact ? 16 : 18} color="#fff" />}
      <Text style={[st.missBtnText, compact && { fontSize: 12 }]} numberOfLines={1}>
        Missed data
      </Text>
    </TouchableOpacity>
  );
}

function NoticeBar({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  const color = notice.error ? T.red : T.green;
  return (
    <View style={st.noticeWrap} pointerEvents="none">
      <View style={[st.notice, { borderColor: color }]} accessibilityLiveRegion="polite">
        <Icon name={notice.error ? 'error-outline' : 'check-circle'} size={28} color={color} />
        <Text style={st.noticeText}>{notice.text}</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Detail (opened by tapping a row / card)                             */
/* ------------------------------------------------------------------ */

function ProdOrderDetail({
  row,
  session,
  onBack,
}: {
  row: ProdOrderRow;
  session: { API: string; token: string };
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<StageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [width, setWidth] = useState(0);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const body = await getProdOrderStageDashboard(session.API, session.token, {
        prpcode: PRP_CODE,
        yearno: stageYearNo(),
        trackid: row.TrackId,
      });
      if (id !== seq.current) return;
      const d = normalizeStageDetail(body);
      if (d) setDetail(d);
      else setError('The stage detail came back in a format this screen does not understand yet.');
    } catch (err: any) {
      if (id === seq.current) setError((err as OwnerSummaryError)?.message || 'Unable to load production order detail.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [session.API, session.token, row.TrackId]);

  useEffect(() => {
    void load();
  }, [load]);

  const wide = width >= 760;
  const now = nowOf(row);
  const days = delayDays(row);
  const color = now.status === 'overdue' ? T.red : now.status === 'pending' ? T.muted : T.green;
  // Stage table: no Responsible / Executive column — only what the API sends.
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
    <View style={st.overlay}>
      <PanelHeader
        onBack={onBack}
        backLabel="Back to list"
        crumbs={['Production orders']}
        title={`${row.ProductionOrderNo}${row.dsnname ? ` · ${row.dsnname}` : ''}`}
        subtitle={row.itmname || undefined}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <View style={st.content} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <View style={[st.banner, { borderLeftColor: color }]}>
            <Text style={st.bannerText}>
              Now at <Text style={st.bannerStrong}>{now.label}</Text>
              {days > 0 ? (
                <Text style={{ color: T.red, fontWeight: '900' }}>
                  , {days} day{days === 1 ? '' : 's'} late
                </Text>
              ) : null}
              .
            </Text>
          </View>

          <View style={st.poBar}>
            <Fact label="Production order" value={row.ProductionOrderNo} />
            <Fact label="Design" value={row.dsnname} />
            <Fact label="Item" value={row.itmname} />
            <Fact label="Qty" value={qty(num(row.ProductionQty))} />
            <Fact label="Beams" value={String(Math.round(num(row.BeamCount)))} />
            <Fact label="Sold" value={pct(num(row.SoldPercent))} />
          </View>

          <StateBox loading={loading && !detail} error={error} onRetry={() => void load()} />

          {detail ? (
            <>
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
            </>
          ) : null}

          <ProdOrderSections session={session} trackId={row.TrackId} wide={wide} />
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function ProductionOrders({ token, API, prptype = 'S', onBack, executiveCode = '', refreshTick = 0, onDetailChange, onBusyChange }: Props) {
  const [data, setData] = useState<ProdOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProdFilter>('all');
  const [selected, setSelected] = useState<ProdOrderRow | null>(null);
  const [missBusy, setMissBusy] = useState<string | null>(null); // TrackId whose "Missed data" call is running
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((text: string, error = false) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ text, error });
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  // "Missed data" button -> getmisseddata for that row's TrackId -> show only the API's message
  const runMissed = useCallback(
    async (r: ProdOrderRow) => {
      setMissBusy(r.TrackId);
      try {
        const body = await getMissedData(API, token, { prpcode: PRP_CODE, yearno: stageYearNo(), trackid: r.TrackId });
        showNotice(String(body?.message ?? '').trim() || 'Done.');
      } catch (err: any) {
        showNotice((err as OwnerSummaryError)?.message || 'Unable to fetch missed data.', true);
      } finally {
        setMissBusy(null);
      }
    },
    [API, token, showNotice],
  );
  const [width, setWidth] = useState(0);
  const [limit, setLimit] = useState(PAGE);
  const seq = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const id = ++seq.current;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const result = await getProdOrderDashboard(API, token, {
          yearno: financialYear(),
          prptype: prptype || 'S',
          refresh: silent ? 1 : 0,
        });
        if (id === seq.current) setData(result);
      } catch (err: any) {
        if (id === seq.current) setError((err as OwnerSummaryError)?.message || 'Unable to load production orders.');
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [API, token, prptype],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // shared Refresh button
  const lastTick = useRef(refreshTick);
  useEffect(() => {
    if (refreshTick !== lastTick.current) {
      lastTick.current = refreshTick;
      void load(true);
    }
  }, [refreshTick, load]);

  // tell the shared Refresh button while a refresh is running
  useEffect(() => {
    onBusyChange?.(refreshing);
  }, [refreshing, onBusyChange]);

  // new filter / search -> back to the first page
  useEffect(() => {
    setLimit(PAGE);
  }, [filter, search]);

  // tell the parent whether a detail screen is open (it hides the Sales / Production tabs meanwhile)
  useEffect(() => {
    onDetailChange?.(!!selected);
  }, [selected, onDetailChange]);
  useEffect(() => () => onDetailChange?.(false), [onDetailChange]);

  // hardware back: close the detail first, then leave the screen (only when it is an overlay)
  useEffect(() => {
    if (!selected && !onBack) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selected) setSelected(null);
      else onBack?.();
      return true;
    });
    return () => sub.remove();
  }, [selected, onBack]);

  const all = data?.data;
  const defs = useMemo(() => stageDefsFor(all || []), [all]);

  // selected sales executive -> only his / her production orders (matched by the row's Sexe code)
  const scoped = useMemo(() => {
    const code = executiveCode.trim();
    if (!code) return all || [];
    return (all || []).filter((r) =>
      String(r.Sexe ?? '')
        .split(',')
        .some((x) => x.trim() === code),
    );
  }, [all, executiveCode]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((r) => {
      if (filter === 'overdue' && !isOverdue(r)) return false;
      if (filter === 'sold' && !isFullySold(r)) return false;
      if (filter === 'shared' && !hasExecutive(r)) return false;
      if (!q) return true;
      return `${r.ProductionOrderNo} ${r.dsnname} ${r.itmname} ${r.SexName || ''}`.toLowerCase().includes(q);
    });
  }, [scoped, search, filter]);

  const shown = useMemo(() => rows.slice(0, limit), [rows, limit]);
  const wide = width >= WIDE;
  const cardCols = width >= 720 ? 4 : 2;

  const columns = useMemo<Col<ProdOrderRow>[]>(
    () => [
      {
        key: 'po',
        label: 'Production order',
        flex: 1.4,
        render: (r) => (
          <View>
            <Text style={st.tdFirst} numberOfLines={1}>
              {r.ProductionOrderNo}
            </Text>
            <Text style={st.sub} numberOfLines={1}>
              {[orderDate(r), beamsText(r)].filter(Boolean).join(' · ') || ' '}
            </Text>
          </View>
        ),
      },
      {
        key: 'design',
        label: 'Design',
        flex: 2,
        render: (r) => (
          <View>
            <Text style={st.tdStrong} numberOfLines={1}>
              {r.dsnname || '—'}
            </Text>
            <Text style={st.sub} numberOfLines={1}>
              {r.itmname || ' '}
            </Text>
          </View>
        ),
      },
      { key: 'exe', label: 'Executive', flex: 1.6, render: (r) => <ExecChip name={r.SexName} /> },
      { key: 'qty', label: 'Qty', flex: 0.9, align: 'right', render: (r) => qty(num(r.ProductionQty)) },
      { key: 'stages', label: 'Stages', flex: 2.8, render: (r) => <StageStrip defs={defs} stages={stageCells(r, defs)} /> },
      { key: 'now', label: 'Now at', flex: 2, render: (r) => <NowPill row={r} /> },
      { key: 'sold', label: 'Sold', flex: 0.7, align: 'right', render: (r) => pct(num(r.SoldPercent)) },
      { key: 'miss', label: 'Action', flex: 1.25, align: 'center', render: (r) => <MissedDataButton compact loading={missBusy === r.TrackId} onPress={() => void runMissed(r)} /> },
    ],
    [defs, missBusy, runMissed],
  );

  // All -> the API's summary; one executive -> counted from his / her rows
  const s = useMemo(() => {
    if (!data?.summary) return undefined;
    if (!executiveCode.trim()) return data.summary;
    return {
      allProductionOrders: scoped.length,
      stageOverdue: scoped.filter((r) => isOverdue(r)).length,
      sharedExecutives: scoped.filter((r) => hasExecutive(r)).length,
      fullySold: scoped.filter((r) => isFullySold(r)).length,
    };
  }, [data?.summary, executiveCode, scoped]);
  const cards: { key: ProdFilter; value: number; label: string; color: string }[] = s
    ? [
        { key: 'all', value: s.allProductionOrders, label: 'All: production orders', color: T.nav },
        { key: 'overdue', value: s.stageOverdue, label: 'Stage overdue: need action now', color: T.red },
        { key: 'shared', value: s.sharedExecutives, label: 'Shared: serving executives', color: T.blue },
        { key: 'sold', value: s.fullySold, label: 'Completed: fully sold', color: T.green },
      ]
    : [];

  const body = (
    <View style={st.content} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <StateBox loading={loading && !data} error={error} onRetry={() => void load()} />

      {data ? (
        <>
          {!onBack ? (
            <View style={{ gap: 2 }}>
              <Text style={st.h1}>Production orders</Text>
              <Text style={st.h1Sub}>Every production order with its stage tracker. Tap a card to filter, tap a row for details.</Text>
            </View>
          ) : null}

          {/* ---------------------- summary cards (clickable) ---------------------- */}
          <View style={st.grid}>
            {cards.map((c) => {
              const on = filter === c.key;
              return (
                <View key={c.key} style={[st.gridCell, { flexBasis: cardCols === 4 ? '25%' : '50%' }]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setFilter(on && c.key !== 'all' ? 'all' : c.key)}
                    style={[st.sCard, on && { borderColor: c.color, backgroundColor: `${c.color}0F` }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${c.label}: ${c.value}`}
                  >
                    <Text style={[st.sValue, { color: c.color }]} numberOfLines={1}>
                      {fmtCount(c.value)}
                    </Text>
                    <Text style={[st.sLabel, on && { color: c.color }]} numberOfLines={2}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* ------------------------------ toolbar ------------------------------ */}
          <View style={st.toolbar}>
            <SearchBox
              value={search}
              onChangeText={setSearch}
              placeholder="Search production order, design, executive…"
              style={{ flex: 1, minWidth: 0 }}
            />
            {onBack ? <IconBtn icon="refresh" label="Refresh" onPress={() => void load(true)} loading={refreshing} tone="soft" color={T.copper} /> : null}
          </View>

          <Legend />

          <Text style={st.countText}>
            {filter === 'all' && !search.trim() ? `${rows.length} production orders` : `Showing ${rows.length} of ${all?.length || 0}`}
            {filter !== 'all' ? '  ·  tap the card again to clear' : ''}
          </Text>

          {/* ------------------------------ list ------------------------------ */}
          {rows.length === 0 ? (
            // nothing matches (executive / card / search): show only this message, never an old row
            <View style={st.emptyBox}>
              <Text style={st.emptyText}>No production order for this filter.</Text>
            </View>
          ) : wide ? (
            <Card key={`${executiveCode}|${filter}|${search}`}>
              <MiniTable
                columns={columns}
                rows={shown}
                rowKey={(r, i) => `${r.TrackId || r.ProductionOrderNo}#${i}`}
                minWidth={WIDE}
                onRowPress={setSelected}
                emptyText="No production order for this filter."
                headerExtra={(c) =>
                  c.key === 'stages' ? (
                    <View style={st.hStrip}>
                      {defs.map((d) => (
                        <View key={d.key} style={st.hCell}>
                          <Text style={st.hText} numberOfLines={1}>
                            {d.short}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null
                }
              />
            </Card>
          ) : (
            shown.map((r, idx) => (
              <TouchableOpacity
                key={`${r.TrackId || r.ProductionOrderNo}#${idx}`}
                activeOpacity={0.8}
                onPress={() => setSelected(r)}
                style={st.orderCard}
                accessibilityRole="button"
              >
                <View style={st.orderTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.orderNo} numberOfLines={1}>
                      {r.ProductionOrderNo}
                    </Text>
                    <Text style={st.sub} numberOfLines={1}>
                      {[orderDate(r), beamsText(r)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.orderSold}>{pct(num(r.SoldPercent))}</Text>
                    <Text style={st.sub}>sold</Text>
                  </View>
                </View>

                <Text style={[st.tdStrong, { marginTop: 8 }]} numberOfLines={1}>
                  {r.dsnname || '—'}
                </Text>
                <Text style={st.sub} numberOfLines={1}>
                  {[r.itmname, `${qty(num(r.ProductionQty))} m`].filter(Boolean).join('  ·  ')}
                </Text>
                {hasExecutive(r) ? (
                  <View style={{ marginTop: 8 }}>
                    <ExecChip name={r.SexName} />
                  </View>
                ) : null}

                <View style={{ marginTop: 12 }}>
                  <StageStrip defs={defs} stages={stageCells(r, defs)} labels />
                </View>

                <View style={st.orderFoot}>
                  <View style={{ flexShrink: 1, minWidth: 0 }}>
                    <NowPill row={r} />
                  </View>
                  <View style={st.footRight}>
                    <MissedDataButton loading={missBusy === r.TrackId} onPress={() => void runMissed(r)} />
                    <Icon name="chevron-right" size={20} color={T.muted} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          {rows.length > shown.length ? (
            <TouchableOpacity style={st.moreBtn} onPress={() => setLimit((n) => n + PAGE)} accessibilityRole="button">
              <Text style={st.moreText}>
                Show more  ({shown.length} of {rows.length})
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}
    </View>
  );

  return (
    <View style={onBack ? st.overlay : st.screen}>
      {onBack ? (
        <PanelHeader
          onBack={onBack}
          crumbs={['Owner Dashboard']}
          title="Production orders"
          subtitle="Every production order with its stage tracker"
        />
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[T.copper]} tintColor={T.copper} />}
      >
        {body}
      </ScrollView>

      {selected ? <ProdOrderDetail row={selected} session={{ API, token }} onBack={() => setSelected(null)} /> : null}
      <NoticeBar notice={notice} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: T.bg, zIndex: 20, elevation: 20 },
  scroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 },
  content: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: 12 },

  // summary cards
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  gridCell: { padding: 4, flexGrow: 1, flexShrink: 0, minWidth: 0 },
  sCard: {
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 64,
    justifyContent: 'center',
    ...S.card,
    shadowOpacity: 0.03,
    elevation: 1,
  },
  sValue: { fontFamily: FONT, fontSize: 20, lineHeight: 24, fontWeight: '900' },
  sLabel: { marginTop: 2, fontFamily: FONT, fontSize: 11.5, lineHeight: 15, fontWeight: '600', color: T.muted },
  h1: { fontFamily: FONT_HEAD, fontSize: 19, fontWeight: '900', color: T.nav },
  h1Sub: { fontFamily: FONT, fontSize: 12, lineHeight: 16, fontWeight: '600', color: T.muted },

  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countText: { fontFamily: FONT, fontSize: 11.5, fontWeight: '700', color: T.muted, paddingHorizontal: 2 },

  // table header (stage labels)
  hStrip: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  hCell: { flex: 1, alignItems: 'center', minWidth: 0 },
  hText: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  tdFirst: { fontFamily: FONT, fontSize: 12.5, fontWeight: '900', color: T.nav },
  tdStrong: { fontFamily: FONT, fontSize: 12.5, fontWeight: '800', color: T.ink },
  sub: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  muted: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: T.muted },
  subDark: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: T.ink, marginTop: 1 },
  pendingText: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.ink },

  chip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: T.alt,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipText: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: T.nav },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  emptyText: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.muted, textAlign: 'center' },
  moreBtn: {
    alignSelf: 'center',
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { fontFamily: FONT, fontSize: 12.5, fontWeight: '800', color: T.copper },

  // phone card
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
  orderSold: { fontFamily: FONT, fontSize: 15, fontWeight: '900', color: T.ink },
  orderFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: T.hair,
  },

  footRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },

  // "Missed data" button
  missBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: T.copper,
    alignSelf: 'center',
    shadowColor: T.copper,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 3,
  },
  missBtnCompact: { height: 32, paddingHorizontal: 12, borderRadius: 9, gap: 6 },
  missBtnText: { fontFamily: FONT, fontSize: 13.5, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  // "Missed data" message notice
  noticeWrap: { position: 'absolute', left: 0, right: 0, bottom: 28, alignItems: 'center', paddingHorizontal: 16, zIndex: 40, elevation: 40 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 300,
    maxWidth: 600,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 6,
    backgroundColor: T.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  noticeText: { flexShrink: 1, fontFamily: FONT, fontSize: 16, lineHeight: 22, fontWeight: '800', color: T.ink },

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
  stageName: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageCard: { paddingHorizontal: 14, paddingVertical: 10 },
});
