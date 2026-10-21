// FILE: src/components/ProductionOrderNEW/OrdersList.tsx
// "Orders" tab of the artifact: + New production order, SO vs production
// coverage per design, then the Production Order cards.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { fetchYears } from '../StockVerificationNEW/verificationApi';
import { Api, apiErrorText, browseOrders, Ctx, deleteOrder, fetchGroups } from './api';
import DateField from './DateField';
import { financialYearStartISO, fmt, num, Row, todayISO } from './format';
import { Badge, Banner, BigBtn, Card, CheckBox, confirmAsync, CONTENT_W, Kicker, Loading, Muted, notifyAsync, Pill, SmallBtn, Tag, x } from './ui';

const tab = { fontVariant: ['tabular-nums' as const] };

function Chip({ label, value, tone }: { label: string; value: string; tone?: 'c' | 'g' | 'r' }) {
  const col = tone === 'g' ? T.green : tone === 'r' ? T.red : tone === 'c' ? T.copper : T.ink;
  return (
    <View style={{ backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 9, marginRight: 8, marginBottom: 6 }}>
      <Text style={{ fontSize: 8, fontWeight: '800', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={[{ fontSize: 12, fontWeight: '700', color: col, marginTop: 1 }, tab]}>{value}</Text>
    </View>
  );
}

// Same edit/delete lock as the web browse grid.
const locked = (r: Row) => Number(r.isauth) === 1 || (Number(r.mainstatusvalidate) === 1 && r.status === 'C') ||
  Number(r.CreatedPlan || r.createdplan || 0) > 0 || Number(r.LinkedJobOut || r.linkedjobout || 0) > 0;

export default function OrdersList({ api, ctx, rights, onOpen, onNew, jobWorkOnly }: {
  api: Api; ctx: Ctx; rights: { add: boolean; edit: boolean; del: boolean }; jobWorkOnly?: boolean;
  onOpen: (r: Row, mode: 'view' | 'edit') => void; onNew: () => void;
}) {
  const { width } = useWindowDimensions();
  const narrow = width < 600;
  const [from, setFrom] = useState(financialYearStartISO());
  const [to, setTo] = useState(todayISO());
  const [authOnly, setAuthOnly] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [groups, setGroups] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [query, setQuery] = useState('');
  const [searchIn, setSearchIn] = useState<'all' | 'design' | 'order'>('all');
  const [showAllCoverage, setShowAllCoverage] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setErr('');
    try {
      const list = await browseOrders(api, ctx, { fromdate: from, todate: to, isauth: authOnly ? 1 : 0 });
      setRows(list);
      // Browse rows carry the server-resolved greige store (same as the web's getGreyStrCode);
      // web_groups filters SO lines by that store.
      const grey = String(list.find((r) => r.greystrcode)?.greystrcode || '012');
      const g = await fetchGroups(api, ctx, { strcode: grey, perPage: 50, orderSource: 'I' }).catch(() => ({ groups: [] as Row[] }));
      setGroups(g.groups);
    } catch (e) { setErr(apiErrorText(e, 'Production Orders could not be loaded.')); }
    finally { setBusy(false); }
  }, [api, ctx, from, to, authOnly]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [api, ctx, authOnly, from, to]);

  // Year master of the property — for the web browse "Load" financial-year check.
  const [years, setYears] = useState<Row[]>([]);
  useEffect(() => {
    let alive = true;
    if (!ctx.prpcode) { setYears([]); return undefined; }
    fetchYears(api, ctx.prpcode).then((r) => { if (alive) setYears(r || []); }).catch(() => { if (alive) setYears([]); });
    return () => { alive = false; };
  }, [api, ctx.prpcode]);

  /** web handleSubmit → validateFinancialYear: the To date must fall in the selected financial year. */
  const loadChecked = () => {
    const m = /^(\d{4})-(\d{2})/.exec(String(to || ''));
    const selectedYear = years.find((y) => String(y.YearNo ?? y.yearno ?? '') === String(ctx.yearno || ''));
    if (m && selectedYear) {
      const yy = Number(m[1]); const mm = Number(m[2]);
      const fy = mm <= 3 ? `${yy - 1}-${yy}` : `${yy}-${yy + 1}`;
      if (String(selectedYear.YearName ?? selectedYear.yearname ?? '').trim().slice(0, 4) !== fy.slice(0, 4)) {
        notifyAsync('Error', `Invalid financial year selected. Expected: ${fy}`);
        return;
      }
    }
    load();
  };

  // Unplanned SO metres (pending, from groups) vs planned PO metres (from the list) per design.
  // Search by design or production order no.
  const q = query.trim().toLowerCase();
  const has = (v: any) => v !== undefined && v !== null && String(v).toLowerCase().includes(q);
  const designHit = (r: Row) => has(r.dsnname) || has(r.dsncode) || has(r.name) || has(r.orderdesign);
  const orderHit = (r: Row) => has(r.vouno) || has(r.uid) || has(r.voudate);
  const rowHit = (r: Row) => !q || (searchIn === 'design' ? designHit(r) : searchIn === 'order' ? orderHit(r)
    : designHit(r) || orderHit(r) || has(r.parname) || has(r.sexename) || has(r.shdname) || has(r.itmname));

  const allShown = useMemo(() => (jobWorkOnly ? rows.filter((r) => num(r.jobqty) > 0) : rows), [rows, jobWorkOnly]);
  const shown = useMemo(() => allShown.filter(rowHit), [allShown, q, searchIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const coverage = useMemo(() => {
    if (jobWorkOnly) return [] as Row[];
    const by: Record<string, Row> = {};
    groups.forEach((g) => {
      const k = String(g.dsncode);
      const c = by[k] || (by[k] = { dsncode: k, name: g.dsnname || k, pending: 0, planned: 0 });
      c.pending += (g.orders || []).reduce((s: number, o: Row) => s + num(o.qty), 0);
    });
    rows.forEach((r) => {
      const k = String(r.dsncode || '');
      if (!k) return;
      const c = by[k] || (by[k] = { dsncode: k, name: r.dsnname || k, pending: 0, planned: 0 });
      c.planned += num(r.orderqty);
    });
    return Object.values(by).filter((c) => c.pending > 0 || c.planned > 0).sort((a, b) => b.pending - a.pending);
  }, [groups, rows, jobWorkOnly]);
  // Coverage is per design: filter it only when searching by design (or all).
  const coverageShown = useMemo(
    () => (q && searchIn !== 'order' ? coverage.filter((c) => has(c.name) || has(c.dsncode)) : q ? [] : coverage),
    [coverage, q, searchIn] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const COVERAGE_LIMIT = 5;
  const coverageVisible = showAllCoverage || q ? coverageShown : coverageShown.slice(0, COVERAGE_LIMIT);

  const remove = async (r: Row) => {
    // web browse Delete: any authorisation status other than 0 (or a closed order) blocks the delete
    const authVal = String(r.isauth ?? '').trim();
    if ((authVal !== '' && Number(authVal) !== 0) || (Number(r.mainstatusvalidate) === 1 && r.status === 'C')) {
      notifyAsync('Not deleted', `Order No ${r.vouno} has already been authorised.`);
      return;
    }
    if (!(await confirmAsync('Delete order?', `Are you sure you want to delete ${r.vouno}?`, 'Delete', true))) return;
    setBusy(true);
    try {
      const res = await deleteOrder(api, ctx, r.uid, r.greystrcode);
      await notifyAsync('Deleted', res.message || 'Deleted successfully.');
      load();
    } catch (e) { setBusy(false); notifyAsync('Not deleted', apiErrorText(e)); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 14, paddingBottom: 120, alignItems: 'center' }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={T.copper} />} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: CONTENT_W }}>
        {rights.add ? <BigBtn label="+ New production order" onPress={onNew} /> : null}

        <Card style={{ padding: 10, marginVertical: 10 }}>
          <View style={{ flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'stretch' : 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: narrow ? undefined : 1 }}>
              <Icon name="date-range" size={18} color={T.muted} />
              <DateField value={from} onChange={setFrom} max={to || undefined} placeholder="From date" style={{ flex: 1, flexBasis: 0, minWidth: 0 }} />
              <Muted>to</Muted>
              <DateField value={to} onChange={setTo} min={from || undefined} placeholder="To date" style={{ flex: 1, flexBasis: 0, minWidth: 0 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckBox checked={authOnly} onPress={() => setAuthOnly((v) => !v)} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: T.ink, marginRight: 6 }}>Authorised</Text>
              <SmallBtn label="Load" onPress={loadChecked} />
            </View>
          </View>
        </Card>

        {/* Search: design / production order */}
        <Card style={{ padding: 10, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="search" size={18} color={T.muted} />
            <TextInput value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false}
              placeholder={searchIn === 'design' ? 'Search by design…' : searchIn === 'order' ? 'Search by production order no.…' : 'Search design, production order, party, executive…'}
              placeholderTextColor={T.muted} style={[x.input, { flex: 1, minWidth: 0 }]} />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={18} color={T.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
            <Muted style={{ marginRight: 6 }}>Search in:</Muted>
            {([['all', 'All'], ['design', 'Design'], ['order', 'Production order']] as const).map(([k, label]) => (
              <Pill key={k} label={label} active={searchIn === k} onPress={() => setSearchIn(k)} />
            ))}
            {q ? <Muted style={{ marginLeft: 'auto' }}>{shown.length} of {allShown.length} orders</Muted> : null}
          </View>
        </Card>

        {busy && !rows.length ? <Loading label="Loading production orders…" /> : null}
        {err ? <Banner tone="err" title={err} /> : null}

        {coverageShown.length > 0 ? <Kicker style={{ marginLeft: 2 }}>SO vs production coverage</Kicker> : null}
        {coverageVisible.map((c) => (
          <Card key={c.dsncode} style={{ paddingVertical: 11, paddingHorizontal: 14, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Tag label={String(c.name)} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: T.ink }}>{c.name}</Text>
                <Text style={[{ fontSize: 10, color: T.muted, marginTop: 2 }, tab]}>Unplanned SO {fmt(c.pending)} m · PO {fmt(c.planned)} m</Text>
              </View>
              {c.pending > 0 ? <Badge label={`${fmt(Math.round(c.pending))} short`} color={T.amber} /> : <Badge label="Covered" color={T.green} />}
            </View>
          </Card>
        ))}
        {!q && coverageShown.length > COVERAGE_LIMIT ? (
          <TouchableOpacity onPress={() => setShowAllCoverage((v) => !v)} style={{ alignSelf: 'center', paddingVertical: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: T.copper }}>
              {showAllCoverage ? 'Show less' : `Show all coverage (${coverageShown.length})`}
            </Text>
          </TouchableOpacity>
        ) : null}

        <Kicker style={{ marginLeft: 2, marginTop: 10 }}>{jobWorkOnly ? 'Orders with job work out' : 'Production orders'}</Kicker>
        {!busy && shown.length === 0 && !err ? <Card style={{ padding: 24 }}><Muted style={{ textAlign: 'center' }}>{q ? 'No production orders match your search.' : jobWorkOnly ? 'No job work in this period.' : 'No production orders in this period.'}</Muted></Card> : null}
        {shown.map((r) => {
          const isLocked = locked(r);
          const jobQty = num(r.jobqty);
          return (
            <Card key={String(r.uid)} style={{ padding: 14, marginBottom: 10 }}>
              <TouchableOpacity onPress={() => onOpen(r, 'view')} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Tag label={String(r.dsnname || r.dsncode || 'Design')} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: T.ink }}>
                      {r.dsnname || 'Design'} <Text style={[{ fontSize: 10, fontWeight: '400', color: T.muted }, tab]}>{r.vouno}</Text>
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                      {r.parname ? `${r.parname} · ` : 'Stock & sell · '}{r.voudate}{r.sexename ? ` · ${r.sexename}` : ''}
                    </Text>
                  </View>
                  {Number(r.isauth) === 1 ? <Badge label="✓ AUTH" color={T.green} /> : <Badge label={String(r.authstatus || 'PENDING')} color={T.amber} />}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
                  <Chip label="Greige" value={`${fmt(num(r.qty))} m`} />
                  {num(r.orderqty) > 0 ? <Chip label="Order" value={`${fmt(num(r.orderqty))} m`} /> : null}
                  {num(r.greyrate) > 0 ? <Chip label="Cost" value={`₹${num(r.greyrate).toFixed(2)}/m`} /> : null}
                  {num(r.sellingrate) > 0 ? <Chip label="Sale" value={`₹${num(r.sellingrate).toFixed(2)}/m`} /> : null}
                  {jobQty > 0 ? <Chip label="Job work" value={`${fmt(jobQty)} m`} tone="c" /> : null}
                  {r.selfprodqty != null && r.selfprodqty !== '' ? <Chip label="In-house" value={`${fmt(num(r.selfprodqty))} m`} /> : null}
                </View>
              </TouchableOpacity>
              {!isLocked && (rights.edit || rights.del) ? (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  {rights.edit ? <SmallBtn label="Edit" tone="copper" onPress={() => onOpen(r, 'edit')} /> : null}
                  {rights.del ? <SmallBtn label="Delete" tone="red" onPress={() => remove(r)} /> : null}
                </View>
              ) : null}
              {isLocked && (rights.edit || rights.del) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                  <Icon name="lock" size={13} color={T.muted} />
                  <Muted style={{ fontSize: 10 }}>
                    {Number(r.isauth) === 1 ? 'Authorised — modify & delete locked' : 'Locked — plan / job out already created'}
                  </Muted>
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}
