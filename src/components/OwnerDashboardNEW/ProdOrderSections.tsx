// FILE: src/components/OwnerDashboardNEW/ProdOrderSections.tsx
// The three collapsible sections under "Stage by stage" on a production order detail:
//   Beam-wise dates      -> getprodorderbeamwisedashboard
//   Outward and inward   -> getprodorderinwoutdashboard
//   Sales bills          -> getprodordersalesinvoicedashboard
//   Sales orders         -> salesorderfromproductionorder
//   Beam plan vs actual  -> getprodbeamplantrackid
// Each one calls its API only when it is opened the first time (and keeps the rows until the detail closes).
// Wide screens (web) draw a table, narrow screens (mobile) draw one card per row.
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getProdOrderBeamwiseDashboard, getProdOrderInwOutDashboard, getProdOrderSalesInvoiceDashboard, getSalesOrderFromProductionOrder, getProdBeamPlanTrackId } from './api';
import { Col, Fold, MiniTable, Pill, StateBox } from './OrderTracker';
import {
  beamStatusOf,
  dateToYmd,
  num,
  PRP_CODE,
  rowsOf,
  splitList,
  stageYearNo,
  ymdList,
  type BeamPlanTrackApiRow,
  type BeamwiseApiRow,
  type InvoiceApiRow,
  type InwOutApiRow,
  type SalesOrderApiRow,
} from './prodOrderModel';
import { NOT_NEEDED, qty, ymd } from './trackerModel';
import { FONT } from './fonts';

type Session = { API: string; token: string };
type Cache = React.MutableRefObject<Record<string, any[]>>;

const dash = '—';
const dateText = (v: string | null | undefined) => ymd(dateToYmd(v)) || dash;
const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const sumList = (v: string | null | undefined) => splitList(v).reduce((a, x) => a + num(x), 0);

/* ------------------------------ small pieces ------------------------------ */

function StatusPill({ raw }: { raw: string | null | undefined }) {
  const s = beamStatusOf(raw);
  if (s.kind === 'pending') return <Text style={st.pending}>pending</Text>;
  const color = s.kind === 'ok' ? T.green : s.kind === 'late' ? T.red : NOT_NEEDED;
  return <Pill text={s.text} color={color} strong={s.kind === 'late'} />;
}

/** One value per line (used for the "a, b, c" cells). */
function Lines({ items }: { items: string[] }) {
  if (!items.length) return <Text style={st.text}>{dash}</Text>;
  return (
    <View style={{ gap: 2 }}>
      {items.map((x, i) => (
        <Text key={`${x}-${i}`} style={st.text}>
          {x}
        </Text>
      ))}
    </View>
  );
}

function KV({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[st.kv, style]}>
      <Text style={st.kvLabel}>{label}</Text>
      {typeof children === 'string' ? <Text style={st.text}>{children}</Text> : children}
    </View>
  );
}

function CardList<R>({ rows, rowKey, render, emptyText }: { rows: R[]; rowKey: (r: R, i: number) => string; render: (r: R) => React.ReactNode; emptyText: string }) {
  if (!rows.length) {
    return (
      <View style={st.empty}>
        <Text style={st.emptyText}>{emptyText}</Text>
      </View>
    );
  }
  return (
    <View>
      {rows.map((r, i) => (
        <View key={rowKey(r, i)} style={[st.card, i % 2 === 1 && { backgroundColor: T.alt }]}>
          {render(r)}
        </View>
      ))}
    </View>
  );
}

/** Calls `load` the first time it is shown, then hands the rows to `children`. Rows are cached in the parent. */
function LazyBody<R>({
  cache,
  cacheKey,
  load,
  children,
}: {
  cache: Cache;
  cacheKey: string;
  load: () => Promise<R[]>;
  children: (rows: R[]) => React.ReactNode;
}) {
  const cached = cache.current[cacheKey] as R[] | undefined;
  const [rows, setRows] = useState<R[] | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');
  const alive = useRef(true);

  const run = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await load();
      cache.current[cacheKey] = list;
      if (alive.current) setRows(list);
    } catch (err: any) {
      if (alive.current) setError(err?.message || 'Unable to load this section.');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [cache, cacheKey, load]);

  useEffect(() => {
    alive.current = true;
    if (!cache.current[cacheKey]) void run();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rows) {
    return (
      <View style={{ padding: 12 }}>
        <StateBox loading={loading} error={error} onRetry={() => void run()} />
      </View>
    );
  }
  return <>{children(rows)}</>;
}

/* ------------------------------ the three sections ------------------------------ */

function BeamwiseTable({ rows, wide }: { rows: BeamwiseApiRow[]; wide: boolean }) {
  const cols = useMemo<Col<BeamwiseApiRow>[]>(
    () => [
      { key: 'beam', label: 'Beam', flex: 1, render: (r) => <Text style={st.strong}>{r.Beam}</Text> },
      { key: 'mac', label: 'Machine', flex: 1.4, render: (r) => r.Machine || dash },
      { key: 'warp', label: 'Warp', flex: 1.1, render: (r) => dateText(r.Warp) },
      { key: 'loom', label: 'Loom', flex: 1.1, render: (r) => dateText(r.Loom) },
      { key: 'grey', label: 'Grey', flex: 1.1, render: (r) => dateText(r.Grey) },
      { key: 'out', label: 'Outward', flex: 1.2, render: (r) => <StatusPill raw={r.OutwardStatus} /> },
      { key: 'in', label: 'Inward', flex: 1.2, render: (r) => <StatusPill raw={r.InwardStatus} /> },
      { key: 'pack', label: 'Pack', flex: 1.2, render: (r) => <StatusPill raw={r.PackStatus} /> },
      { key: 'sale', label: 'Sale', flex: 1.2, render: (r) => <StatusPill raw={r.SaleStatus} /> },
    ],
    [],
  );
  const key = (r: BeamwiseApiRow, i: number) => `${r.Beam}-${i}`;
  const empty = 'No beam on this production order yet.';

  if (wide) return <MiniTable columns={cols} rows={rows} rowKey={key} minWidth={980} emptyText={empty} />;
  return (
    <CardList
      rows={rows}
      rowKey={key}
      emptyText={empty}
      render={(r) => (
        <>
          <View style={st.cardHead}>
            <Text style={[st.strong, { flex: 1 }]} numberOfLines={1}>
              {r.Beam}
            </Text>
            <Text style={st.text} numberOfLines={1}>
              {r.Machine || dash}
            </Text>
          </View>
          <View style={st.grid}>
            <KV label="Warp">{dateText(r.Warp)}</KV>
            <KV label="Loom">{dateText(r.Loom)}</KV>
            <KV label="Grey">{dateText(r.Grey)}</KV>
          </View>
          <View style={st.grid}>
            <KV label="Outward">
              <StatusPill raw={r.OutwardStatus} />
            </KV>
            <KV label="Inward">
              <StatusPill raw={r.InwardStatus} />
            </KV>
            <KV label="Pack">
              <StatusPill raw={r.PackStatus} />
            </KV>
            <KV label="Sale">
              <StatusPill raw={r.SaleStatus} />
            </KV>
          </View>
        </>
      )}
    />
  );
}

function InwOutTable({ rows, wide }: { rows: InwOutApiRow[]; wide: boolean }) {
  const dates = (v: string | null) => ymdList(v).map((n) => ymd(n));
  const cols = useMemo<Col<InwOutApiRow>[]>(
    () => [
      { key: 'beam', label: 'Beam', flex: 0.9, render: (r) => <Text style={st.strong}>{r.BeamNo}</Text> },
      { key: 'onos', label: 'Outward nos', flex: 1.7, render: (r) => <Lines items={splitList(r.OutwardNos)} /> },
      { key: 'odt', label: 'Outward dates', flex: 1.2, render: (r) => <Lines items={dates(r.OutwardDates)} /> },
      { key: 'oq', label: 'Out qty', flex: 0.8, align: 'right', render: (r) => (num(r.OutQty) > 0 ? qty(num(r.OutQty)) : dash) },
      { key: 'inos', label: 'Inward nos', flex: 1.5, render: (r) => <Lines items={splitList(r.InwardNos)} /> },
      { key: 'idt', label: 'Inward dates', flex: 1.2, render: (r) => <Lines items={dates(r.InwardDates)} /> },
      { key: 'lot', label: 'Lot', flex: 1.1, render: (r) => <Lines items={splitList(r.Lot)} /> },
    ],
    [],
  );
  const key = (r: InwOutApiRow, i: number) => `${r.BeamNo}-${i}`;
  const empty = 'No outward or inward yet.';

  if (wide) return <MiniTable columns={cols} rows={rows} rowKey={key} minWidth={1060} emptyText={empty} />;
  return (
    <CardList
      rows={rows}
      rowKey={key}
      emptyText={empty}
      render={(r) => (
        <>
          <View style={st.cardHead}>
            <Text style={[st.strong, { flex: 1 }]} numberOfLines={1}>
              {r.BeamNo}
            </Text>
            <Text style={st.text}>Out qty {num(r.OutQty) > 0 ? qty(num(r.OutQty)) : dash}</Text>
          </View>
          <View style={st.grid}>
            <KV label="Outward nos" style={st.half}>
              <Lines items={splitList(r.OutwardNos)} />
            </KV>
            <KV label="Outward dates" style={st.half}>
              <Lines items={dates(r.OutwardDates)} />
            </KV>
          </View>
          <View style={st.grid}>
            <KV label="Inward nos" style={st.half}>
              <Lines items={splitList(r.InwardNos)} />
            </KV>
            <KV label="Inward dates" style={st.half}>
              <Lines items={dates(r.InwardDates)} />
            </KV>
          </View>
          <KV label="Lot">
            <Lines items={splitList(r.Lot)} />
          </KV>
        </>
      )}
    />
  );
}

function InvoiceTable({ rows: allRows, wide }: { rows: InvoiceApiRow[]; wide: boolean }) {
  const sold = (r: InvoiceApiRow) => !!r.SaleDate || splitList(r.InvoiceNo).length > 0;
  // beams that are not sold yet have nothing to show -> only sold rows are listed (none sold = "No data")
  const rows = useMemo(() => allRows.filter(sold), [allRows]);
  const delay = (r: InvoiceApiRow) => {
    if (!sold(r)) return <Text style={st.pending}>not sold yet</Text>;
    const d = Math.round(num(r.SaleDelayDays));
    return d > 0 ? <Pill text={`${d}d late`} color={T.red} strong /> : <Pill text="On time" color={T.green} />;
  };
  const amount = (r: InvoiceApiRow) => (splitList(r.Amount).length ? money(sumList(r.Amount)) : dash);
  const rate = (r: InvoiceApiRow) => (num(r.Rate) > 0 ? money(num(r.Rate)) : dash);
  const q = (r: InvoiceApiRow) => (num(r.SaleQty) > 0 ? qty(num(r.SaleQty)) : dash);

  const cols = useMemo<Col<InvoiceApiRow>[]>(
    () => [
      { key: 'dt', label: 'Sale date', flex: 1, render: (r) => dateText(r.SaleDate) },
      { key: 'q', label: 'Qty', flex: 0.8, align: 'right', render: (r) => q(r) },
      { key: 'inv', label: 'Invoice no', flex: 1.6, render: (r) => <Lines items={splitList(r.InvoiceNo)} /> },
      { key: 'ch', label: 'Challan no', flex: 1.6, render: (r) => <Lines items={splitList(r.ChallanNo)} /> },
      { key: 'lr', label: 'LR no', flex: 1.1, render: (r) => <Lines items={splitList(r.LrNo)} /> },
      { key: 'rate', label: 'Rate', flex: 0.8, align: 'right', render: (r) => rate(r) },
      { key: 'amt', label: 'Amount', flex: 1.1, align: 'right', render: (r) => amount(r) },
      { key: 'dl', label: 'Delay', flex: 1.1, render: (r) => delay(r) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const key = (r: InvoiceApiRow, i: number) => `${r.BeamUid}-${i}`; // BeamUid is only a row key, never shown
  const empty = 'No data';

  if (wide) return <MiniTable columns={cols} rows={rows} rowKey={key} minWidth={1120} emptyText={empty} />;
  return (
    <CardList
      rows={rows}
      rowKey={key}
      emptyText={empty}
      render={(r) => (
        <>
          <View style={st.cardHead}>
            <Text style={[st.strong, { flex: 1 }]} numberOfLines={1}>
              {dateText(r.SaleDate)}
            </Text>
            {delay(r)}
          </View>
          <View style={st.grid}>
            <KV label="Qty">{q(r)}</KV>
            <KV label="Rate">{rate(r)}</KV>
            <KV label="Amount">{amount(r)}</KV>
          </View>
          {sold(r) ? (
            <>
              <View style={st.grid}>
                <KV label="Invoice no" style={st.half}>
                  <Lines items={splitList(r.InvoiceNo)} />
                </KV>
                <KV label="Challan no" style={st.half}>
                  <Lines items={splitList(r.ChallanNo)} />
                </KV>
              </View>
              {splitList(r.LrNo).length ? (
                <KV label="LR no">
                  <Lines items={splitList(r.LrNo)} />
                </KV>
              ) : null}
            </>
          ) : null}
        </>
      )}
    />
  );
}

function SalesOrderTable({ rows, wide }: { rows: SalesOrderApiRow[]; wide: boolean }) {
  // share = this sales order's qty out of the whole production order qty
  const share = (r: SalesOrderApiRow) => {
    const total = num(r.ProdQty);
    return total > 0 ? `${Math.round((num(r.SOQty) / total) * 100)}%` : dash;
  };
  const q = (r: SalesOrderApiRow) => (num(r.SOQty) > 0 ? qty(num(r.SOQty)) : dash);

  const cols = useMemo<Col<SalesOrderApiRow>[]>(
    () => [
      { key: 'so', label: 'Sales order', flex: 1.1, render: (r) => <Text style={st.strong}>{r.SONo || dash}</Text> },
      { key: 'exe', label: 'Executive', flex: 1.6, render: (r) => r.LngName || dash },
      { key: 'party', label: 'Party', flex: 1.8, render: (r) => r.AccName || dash },
      { key: 'q', label: 'Qty', flex: 0.9, align: 'right', render: (r) => q(r) },
      { key: 'sh', label: 'Share', flex: 0.7, align: 'right', render: (r) => share(r) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const key = (r: SalesOrderApiRow, i: number) => `${r.TransactionId || r.SONo}-${i}`;
  const empty = 'No sales order on this production order.';

  if (wide) return <MiniTable columns={cols} rows={rows} rowKey={key} minWidth={760} emptyText={empty} />;
  return (
    <CardList
      rows={rows}
      rowKey={key}
      emptyText={empty}
      render={(r) => (
        <>
          <View style={st.cardHead}>
            <Text style={[st.strong, { flex: 1 }]} numberOfLines={1}>
              {r.SONo || dash}
            </Text>
            <Text style={st.text}>{r.LngName || dash}</Text>
          </View>
          <View style={st.grid}>
            <KV label="Party" style={st.half}>
              {r.AccName || dash}
            </KV>
            <KV label="Qty">{q(r)}</KV>
            <KV label="Share">{share(r)}</KV>
          </View>
        </>
      )}
    />
  );
}

/* ------------------------------ beam plan vs actual ------------------------------ */

type PlanKind = 'as_planned' | 'more' | 'less' | 'unplanned';

/** API "Result" text -> label + colour (the API's "Not in plan" is shown as "Unplanned beam"). */
const planResultOf = (raw: string | null | undefined): { text: string; kind: PlanKind } => {
  const t = String(raw ?? '').trim().toLowerCase();
  if (t.includes('not in plan') || t.includes('unplanned')) return { text: 'Unplanned beam', kind: 'unplanned' };
  if (t.includes('more')) return { text: 'More than plan', kind: 'more' };
  if (t.includes('less')) return { text: 'Less than plan', kind: 'less' };
  return { text: 'As planned', kind: 'as_planned' };
};
const planColor = (k: PlanKind) => (k === 'as_planned' ? T.green : k === 'more' ? T.pd : k === 'unplanned' ? T.red : T.blue);
const PLAN_PAGE = 30;

/** "Beam plan vs actual · 71% unplanned" (the % comes with the API rows, so it shows once the section has loaded). */
const planTitle = (pct: number | null) => (pct === null ? 'Beam plan vs actual' : `Beam plan vs actual · ${Math.round(pct)}% unplanned`);

function PlanSplitBar({ row }: { row: BeamPlanTrackApiRow }) {
  return (
    <View style={st.split}>
      <View style={{ width: `${Math.min(num(row.OnPlanBarPct), 100)}%`, backgroundColor: T.blue }} />
      <View style={{ width: `${Math.min(num(row.UnplannedBarPct), 100)}%`, backgroundColor: T.amber }} />
    </View>
  );
}

function BeamPlanTable({ rows, wide }: { rows: BeamPlanTrackApiRow[]; wide: boolean }) {
  const [shown, setShown] = useState(PLAN_PAGE);

  const unplannedCell = (r: BeamPlanTrackApiRow) =>
    num(r.Unplanned) > 0 ? <Text style={[st.strong, { color: T.pd, textAlign: 'right' }]}>{qty(num(r.Unplanned))}</Text> : dash;
  const resultPill = (r: BeamPlanTrackApiRow) => {
    const res = planResultOf(r.Result);
    return <Pill text={res.text} color={planColor(res.kind)} />;
  };

  const cols = useMemo<Col<BeamPlanTrackApiRow>[]>(
    () => [
      { key: 'beam', label: 'Beam', flex: 1.1, render: (r) => <Text style={st.strong}>{r.Beam}</Text> },
      { key: 'p', label: 'Planned', flex: 0.8, align: 'right', render: (r) => qty(num(r.Planned)) },
      { key: 'a', label: 'Actual', flex: 0.8, align: 'right', render: (r) => qty(num(r.Actual)) },
      { key: 'o', label: 'On plan', flex: 0.8, align: 'right', render: (r) => qty(num(r.OnPlan)) },
      { key: 'u', label: 'Unplanned', flex: 0.9, align: 'right', render: (r) => unplannedCell(r) },
      { key: 'n', label: 'Not made', flex: 0.8, align: 'right', render: (r) => qty(num(r.NotMade)) },
      { key: 's', label: 'Split', flex: 1.6, render: (r) => <PlanSplitBar row={r} /> },
      { key: 'r', label: 'Result', flex: 1.4, render: (r) => resultPill(r) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const key = (r: BeamPlanTrackApiRow, i: number) => `${r.BeamUId || r.Beam}-${i}`;
  const empty = 'No beam plan found.';
  const visible = rows.slice(0, shown);

  return (
    <View>
      {wide ? (
        <MiniTable columns={cols} rows={visible} rowKey={key} minWidth={900} emptyText={empty} />
      ) : (
        <CardList
          rows={visible}
          rowKey={key}
          emptyText={empty}
          render={(r) => (
            <>
              <View style={st.cardHead}>
                <Text style={[st.strong, { flex: 1 }]} numberOfLines={1}>
                  {r.Beam}
                </Text>
                {resultPill(r)}
              </View>
              <PlanSplitBar row={r} />
              <View style={st.grid}>
                <KV label="Planned">{qty(num(r.Planned))}</KV>
                <KV label="Actual">{qty(num(r.Actual))}</KV>
                <KV label="On plan">{qty(num(r.OnPlan))}</KV>
              </View>
              <View style={st.grid}>
                <KV label="Unplanned">{unplannedCell(r)}</KV>
                <KV label="Not made">{qty(num(r.NotMade))}</KV>
              </View>
            </>
          )}
        />
      )}

      {rows.length > shown ? (
        <TouchableOpacity style={st.more} onPress={() => setShown((n) => n + PLAN_PAGE)} activeOpacity={0.8} accessibilityRole="button">
          <Text style={st.moreText}>Show more ({rows.length - shown} left)</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ------------------------------ entry ------------------------------ */

export function ProdOrderSections({ session, trackId, wide }: { session: Session; trackId: string; wide: boolean }) {
  const cache = useRef<Record<string, any[]>>({});
  const [planPct, setPlanPct] = useState<number | null>(null);
  const { API, token } = session;
  const params = useMemo(() => ({ prpcode: PRP_CODE, yearno: stageYearNo(), trackid: trackId }), [trackId]);

  const loadBeams = useCallback(async () => {
    const rows = rowsOf<BeamwiseApiRow>(await getProdOrderBeamwiseDashboard(API, token, params));
    if (!rows) throw new Error('Beam-wise dates came back in a format this screen does not understand yet.');
    return rows;
  }, [API, token, params]);

  const loadInwOut = useCallback(async () => {
    const rows = rowsOf<InwOutApiRow>(await getProdOrderInwOutDashboard(API, token, params));
    if (!rows) throw new Error('Outward / inward came back in a format this screen does not understand yet.');
    return rows;
  }, [API, token, params]);

  const loadInvoices = useCallback(async () => {
    const rows = rowsOf<InvoiceApiRow>(await getProdOrderSalesInvoiceDashboard(API, token, params));
    if (!rows) throw new Error('Sales bills came back in a format this screen does not understand yet.');
    return rows;
  }, [API, token, params]);

  const loadSalesOrders = useCallback(async () => {
    const rows = rowsOf<SalesOrderApiRow>(await getSalesOrderFromProductionOrder(API, token, params));
    if (!rows) throw new Error('Sales orders came back in a format this screen does not understand yet.');
    return rows;
  }, [API, token, params]);

  const loadBeamPlan = useCallback(async () => {
    const rows = rowsOf<BeamPlanTrackApiRow>(await getProdBeamPlanTrackId(API, token, params));
    if (!rows) throw new Error('Beam plan came back in a format this screen does not understand yet.');
    setPlanPct(rows.length ? num(rows[0].TotalUnplannedPercent) : null); // same value on every row
    return rows;
  }, [API, token, params]);

  return (
    <View style={{ gap: 12 }}>
      <Fold title="Sales orders">
        <LazyBody cache={cache} cacheKey="salesorder" load={loadSalesOrders}>
          {(rows: SalesOrderApiRow[]) => <SalesOrderTable rows={rows} wide={wide} />}
        </LazyBody>
      </Fold>

      <Fold title="Beam-wise dates">
        <LazyBody cache={cache} cacheKey="beam" load={loadBeams}>
          {(rows: BeamwiseApiRow[]) => <BeamwiseTable rows={rows} wide={wide} />}
        </LazyBody>
      </Fold>

      <Fold title="Outward and inward">
        <LazyBody cache={cache} cacheKey="inwout" load={loadInwOut}>
          {(rows: InwOutApiRow[]) => <InwOutTable rows={rows} wide={wide} />}
        </LazyBody>
      </Fold>

      <Fold title="Sales bills">
        <LazyBody cache={cache} cacheKey="invoice" load={loadInvoices}>
          {(rows: InvoiceApiRow[]) => <InvoiceTable rows={rows} wide={wide} />}
        </LazyBody>
      </Fold>

      <Fold title={planTitle(planPct)}>
        <LazyBody cache={cache} cacheKey="beamplan" load={loadBeamPlan}>
          {(rows: BeamPlanTrackApiRow[]) => <BeamPlanTable rows={rows} wide={wide} />}
        </LazyBody>
      </Fold>
    </View>
  );
}

const st = StyleSheet.create({
  text: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: T.ink },
  strong: { fontFamily: FONT, fontSize: 13.5, fontWeight: '900', color: T.ink },
  pending: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.ink },
  card: { paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8 },
  half: { flexBasis: '45%', flexGrow: 1 },
  kv: { gap: 3, minWidth: 64 },
  kvLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  split: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: T.border, alignSelf: 'stretch' },
  more: { alignItems: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.border },
  moreText: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: T.copper },
  empty: { padding: 18, alignItems: 'center' },
  emptyText: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: T.ink },
});
