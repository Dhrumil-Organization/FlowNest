// FILE: src/screens/takaOrderLink/TakaOrderLinkModule.tsx
// NEW ERP — Taka ↔ Production Order Link.
//
// Why: creel-beam takas get their design and stock type only through the production order
// (GRYProcessC.OrderUId). A taka with no order drops out of the stock report, and the VB report
// never shows creel takas at all (no plan). This screen lists, for one design and an As On date,
// every taka in stock (same rules as the stock reports: PR, In house, design type 7 and job
// outward / return excluded), shows its beam type and order link, and lets the user link or unlink
// it. The link itself goes through the existing linktakachecking_with_prodorder, so all its
// checks (order balance, total order qty, weft issue MinExpProdQty) still apply.
//
// Endpoints: POST /api/taka_order_link  action designs | list | orders | link | unlink
// Permission: production.taka_order_link  view (open) / edit (link, unlink)
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import {
  Btn, Card, Chip, DateField, EmptyState, Kpi, KpiGrid, Metric, PickField, SearchBox, SectionHead, Sheet,
  BusyOverlay, useContentStyle, useSotLayout,
} from '@/src/components/erpUi';
import { useBusinessContext } from '@/src/core/business';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Ctx, Design, Order, TakaOrderLinkAPI, TakaRow, fmtYmd, mtr, num, ymd,
} from './takaOrderLinkApi';

const RES = 'production.taka_order_link';

type Props = { token: string; API: string; username?: string };
type Filter = 'all' | 'notlinked' | 'check' | 'creel' | 'plan' | 'novb';

const FILTERS: { key: Filter; label: string; icon: string; tone: 'neutral' | 'red' | 'copper' | 'blue' | 'amber' }[] = [
  { key: 'all', label: 'All', icon: 'list', tone: 'neutral' },
  { key: 'notlinked', label: 'Not linked', icon: 'link-off', tone: 'red' },
  { key: 'check', label: 'Wrong order', icon: 'report-problem', tone: 'amber' },
  { key: 'creel', label: 'Creel', icon: 'blur-circular', tone: 'copper' },
  { key: 'plan', label: 'Plan', icon: 'event-note', tone: 'blue' },
  { key: 'novb', label: 'Not in VB report', icon: 'visibility-off', tone: 'amber' },
];

const keyOf = (t: TakaRow) => `${t.ChkUId ?? t.TakaNo}-${t.ChkSrNo ?? ''}-${t.InwardVoucher}-${t.TakaNo}`;
const canLinkRow = (t: TakaRow) => !!t.ChkUId;
const isNotLinked = (t: TakaRow) => canLinkRow(t) && (t.LinkStatus === 'NOT LINKED' || t.LinkStatus === 'ORDER MISSING');
/** linked, but to the wrong order (other design, no in-house quantity, over-filled) */
const isWrongOrder = (t: TakaRow) => canLinkRow(t) && t.LinkStatus === 'CHECK ORDER';
const needsFix = (t: TakaRow) => isNotLinked(t) || isWrongOrder(t);
const CHUNK = 50; // takas per request, so a large re-link shows progress and never times out

/** Last day of the previous month — the usual stock-check date. */
const defaultAsOn = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 0);
};

export default function TakaOrderLinkModule({ token, API }: Props) {
  const { prpCode, yearNo, prpGroup } = useBusinessContext();
  const { canDo } = usePermission();
  const canEdit = canDo(RES, 'edit');
  const { isPhone } = useSotLayout();
  const content = useContentStyle();

  const [prptype, setPrptype] = useState(String(prpGroup || '').trim().toUpperCase());
  useEffect(() => {
    if (prptype) return;
    AsyncStorage.getItem('user_prptype').then((v) => setPrptype(String(v || 'S').trim().toUpperCase())).catch(() => setPrptype('S'));
  }, [prptype]);

  const ctx: Ctx = useMemo(
    () => ({ API, token, prpcode: prpCode, yearno: String(yearNo), prptype: prptype || 'S' }),
    [API, token, prpCode, yearNo, prptype],
  );

  /* ---------------- filters ---------------- */
  const [asOn, setAsOn] = useState<Date>(defaultAsOn());
  const [design, setDesign] = useState<Design | null>(null);
  const [rows, setRows] = useState<TakaRow[]>([]);
  const [loadedFor, setLoadedFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!design) { AppAlert.alert('Validation', 'Select a design first.'); return; }
    if (!prpCode || !yearNo) { AppAlert.alert('Validation', 'Select property and year in the header.'); return; }
    setLoading(true);
    setError('');
    try {
      const list = await TakaOrderLinkAPI.list(ctx, ymd(asOn), design.DsnCode);
      setRows(list);
      setSelected({});
      setLoadedFor(`${design.DsnName} · As On ${fmtYmd(ymd(asOn))}`);
    } catch (e: any) {
      setError(e?.message || 'Unable to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [ctx, asOn, design, prpCode, yearNo]);

  /* ---------------- design picker ---------------- */
  const [dsnOpen, setDsnOpen] = useState(false);
  const [dsnSearch, setDsnSearch] = useState('');
  const [dsnList, setDsnList] = useState<Design[]>([]);
  const [dsnBusy, setDsnBusy] = useState(false);
  const dsnSeq = useRef(0);
  useEffect(() => {
    if (!dsnOpen) return;
    const seq = ++dsnSeq.current;
    const h = setTimeout(async () => {
      setDsnBusy(true);
      try {
        const l = await TakaOrderLinkAPI.designs(ctx, dsnSearch.trim());
        if (seq === dsnSeq.current) setDsnList(l);
      } catch (e: any) {
        if (seq === dsnSeq.current) { setDsnList([]); AppAlert.alert('Design', e?.message || 'Unable to load designs'); }
      } finally {
        if (seq === dsnSeq.current) setDsnBusy(false);
      }
    }, 350);
    return () => clearTimeout(h);
  }, [dsnOpen, dsnSearch, ctx]);

  /* ---------------- derived ---------------- */
  const stats = useMemo(() => {
    const s = { count: 0, qty: 0, creel: 0, creelQty: 0, plan: 0, planQty: 0, other: 0, otherQty: 0, notLinked: 0, notLinkedQty: 0, wrong: 0, wrongQty: 0, noVb: 0, noVbQty: 0 };
    rows.forEach((r) => {
      s.count++; s.qty += r.InStock;
      if (r.BeamType === 'CREEL') { s.creel++; s.creelQty += r.InStock; }
      else if (r.BeamType === 'PLAN') { s.plan++; s.planQty += r.InStock; }
      else { s.other++; s.otherQty += r.InStock; }
      if (isNotLinked(r)) { s.notLinked++; s.notLinkedQty += r.InStock; }
      if (isWrongOrder(r)) { s.wrong++; s.wrongQty += r.InStock; }
      if (!r.VisibleInVB) { s.noVb++; s.noVbQty += r.InStock; }
    });
    return s;
  }, [rows]);

  const shown = useMemo(() => {
    const q = search.trim().toUpperCase();
    return rows.filter((r) => {
      if (filter === 'notlinked' && !isNotLinked(r)) return false;
      if (filter === 'check' && !isWrongOrder(r)) return false;
      if (filter === 'creel' && r.BeamType !== 'CREEL') return false;
      if (filter === 'plan' && r.BeamType !== 'PLAN') return false;
      if (filter === 'novb' && r.VisibleInVB) return false;
      if (!q) return true;
      return [r.TakaNo, r.OrderNo, r.BeamNo, r.InwardVoucher].some((v) => String(v || '').toUpperCase().includes(q));
    });
  }, [rows, filter, search]);
  const shownQty = useMemo(() => shown.reduce((a, r) => a + r.InStock, 0), [shown]);

  const selRows = useMemo(() => rows.filter((r) => selected[keyOf(r)]), [rows, selected]);
  const selQty = useMemo(() => selRows.reduce((a, r) => a + num(r.ChkQty ?? r.InwardQty), 0), [selRows]);
  const toggle = (r: TakaRow) => setSelected((s) => ({ ...s, [keyOf(r)]: !s[keyOf(r)] }));
  const selectAllToFix = () => {
    const next: Record<string, boolean> = {};
    shown.filter(needsFix).forEach((r) => { next[keyOf(r)] = true; });
    setSelected(next);
  };

  /* ---------------- link sheet ---------------- */
  const [linkFor, setLinkFor] = useState<TakaRow[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordBusy, setOrdBusy] = useState(false);
  const [pick, setPick] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  const openLink = async (takas: TakaRow[]) => {
    if (!canEdit) { AppAlert.alert('Permission', 'You do not have edit rights for Taka Order Link.'); return; }
    const linkable = takas.filter(canLinkRow);
    if (!linkable.length) { AppAlert.alert('Link', 'Only checking takas can be linked to a production order.'); return; }
    const beams = new Set(linkable.map((t) => t.BeamUId ?? 0));
    setLinkFor(linkable);
    setPick(null);
    setOrders([]);
    setOrdBusy(true);
    try {
      const first = linkable[0];
      const list = await TakaOrderLinkAPI.orders(ctx, first.DsnCode, beams.size === 1 ? num(first.BeamUId) : 0);
      setOrders(list);
      // the server lists orders with in-house balance first (newest first); never pre-pick an order without it
      const suggested = list.find((o) => o.InHouseBal > 0) || null;
      setPick(suggested);
    } catch (e: any) {
      AppAlert.alert('Production Orders', e?.message || 'Unable to load orders');
    } finally {
      setOrdBusy(false);
    }
  };

  const showResults = (title: string, message: string, results: { TakaNo: string; success: boolean; message: string }[]) => {
    const failed = (results || []).filter((r) => !r.success);
    const lines = failed.slice(0, 8).map((r) => `• ${r.TakaNo}: ${r.message || 'not saved'}`);
    if (failed.length > 8) lines.push(`…and ${failed.length - 8} more`);
    AppAlert.alert(title, [message, ...lines].filter(Boolean).join('\n'));
  };

  const [progress, setProgress] = useState('');

  const doLink = async () => {
    if (!linkFor || !pick) return;
    const takas = linkFor;
    const order = pick;
    const qty = takas.reduce((a, r) => a + num(r.ChkQty ?? r.InwardQty), 0);
    const go = async (allowNoInHouse: boolean) => {
      setSaving(true);
      const all: { TakaNo: string; success: boolean; message: string }[] = [];
      let ok = 0;
      try {
        for (let i = 0; i < takas.length; i += CHUNK) {
          const part = takas.slice(i, i + CHUNK);
          setProgress(`${Math.min(i + CHUNK, takas.length)} / ${takas.length}`);
          const res = await TakaOrderLinkAPI.link(ctx, order, part, allowNoInHouse);
          if (!res.data?.length && !res.success) { // whole request refused (e.g. order without in-house qty)
            all.push(...part.map((t) => ({ TakaNo: t.TakaNo, success: false, message: res.message })));
            break;
          }
          (res.data || []).forEach((r) => { all.push(r); if (r.success) ok++; });
        }
        setLinkFor(null);
        showResults(ok ? 'Linked' : 'Not linked', `${ok} of ${takas.length} takas linked to ${order.OrderNo}.`, all);
        await load();
      } catch (e: any) {
        AppAlert.alert('Link', e?.message || 'Unable to link');
      } finally {
        setSaving(false);
        setProgress('');
      }
    };
    const checkBalance = (allow: boolean) => {
      const bal = order.SelfProdQty > 0 ? order.InHouseBal : order.BalQty;
      if (bal < qty) {
        AppAlert.alert('Order balance', `Order ${order.OrderNo} balance is ${mtr(bal)} m but ${mtr(qty)} m is selected. The server will refuse takas that go over. Continue?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => go(allow) },
        ]);
      } else {
        go(allow);
      }
    };
    if (order.SelfProdQty <= 0) {
      const better = orders.find((o) => o.InHouseBal > 0);
      AppAlert.alert('No in-house quantity',
        `Order ${order.OrderNo}${order.LastYear ? ' is carried forward from last year and' : ''} has no in-house quantity.`
        + (better ? ` Order ${better.OrderNo} has ${mtr(better.InHouseBal)} m in-house balance.` : '')
        + ' Link to it anyway?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Link anyway', style: 'destructive', onPress: () => checkBalance(true) },
        ]);
    } else {
      checkBalance(false);
    }
  };

  const doUnlink = (takas: TakaRow[]) => {
    if (!canEdit) { AppAlert.alert('Permission', 'You do not have edit rights for Taka Order Link.'); return; }
    const list = takas.filter((t) => canLinkRow(t) && t.OrderUId);
    if (!list.length) return;
    AppAlert.alert('Remove link', `Remove the production order from ${list.length === 1 ? `taka ${list[0].TakaNo}` : `${list.length} takas`}? The taka will drop out of the stock report until it is linked again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setSaving(true);
          try {
            const res = await TakaOrderLinkAPI.unlink(ctx, list);
            showResults(res.success ? 'Link removed' : 'Not removed', res.message, res.data || []);
            await load();
          } catch (e: any) {
            AppAlert.alert('Remove link', e?.message || 'Unable to remove');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  /* ---------------- render ---------------- */
  const header = (
    <View style={[content, { paddingTop: 14, gap: 12 }]}>
      <View style={st.titleRow}>
        <View style={st.titleIcon}><Icon name="link" size={20} color={T.copper} /></View>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Taka – Production Order Link</Text>
          <Text style={st.sub}>Takas in stock for a design, with their production order. Creel takas need an order to show in the stock report.</Text>
        </View>
      </View>

      <Card>
        <View style={[st.filterRow, isPhone && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ gap: 6 }}>
            <Text style={st.label}>As On</Text>
            <DateField value={asOn} onChange={setAsOn} />
          </View>
          <PickField
            label="Design"
            required
            value={design ? design.DsnName : ''}
            placeholder="Select design…"
            icon="style"
            onPress={() => setDsnOpen(true)}
            onClear={() => { setDesign(null); setRows([]); setLoadedFor(''); }}
            style={{ flex: 1, minWidth: 220 }}
          />
          <Btn label="Show takas" icon="search" kind="copper" onPress={load} loading={loading} disabled={!design || loading} />
        </View>
      </Card>

      {!!error && (
        <Card style={{ borderColor: `${T.red}55` }}>
          <Text style={{ color: T.red, fontWeight: '700' }}>{error}</Text>
        </Card>
      )}

      {!!loadedFor && (
        <>
          <KpiGrid isPhone={isPhone}>
            <Kpi label="In stock" icon="inventory-2" value={`${mtr(stats.qty)} m`} sub={`${stats.count} takas`} />
            <Kpi label="Creel beams" icon="blur-circular" accent={T.copper} value={`${mtr(stats.creelQty)} m`} sub={`${stats.creel} takas`} />
            <Kpi label="Plan / other" icon="event-note" accent={T.blue} value={`${mtr(stats.planQty + stats.otherQty)} m`} sub={`${stats.plan + stats.other} takas`} />
            <Kpi label="Not linked" icon="link-off" accent={T.red} valueColor={stats.notLinked ? T.red : undefined} value={`${mtr(stats.notLinkedQty)} m`} sub={`${stats.notLinked} takas`} />
            <Kpi label="Wrong order" icon="report-problem" accent={T.amber} valueColor={stats.wrong ? T.amber : undefined} value={`${mtr(stats.wrongQty)} m`} sub={`${stats.wrong} takas`} />
            <Kpi label="Not in VB report" icon="visibility-off" accent={T.amber} value={`${mtr(stats.noVbQty)} m`} sub={`${stats.noVb} takas`} />
          </KpiGrid>

          <SectionHead title={loadedFor} meta={`${shown.length} shown · ${mtr(shownQty)} m`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTERS.map((f) => (
              <Chip key={f.key} label={f.label} icon={f.icon} tone={f.tone} active={filter === f.key} onPress={() => setFilter(f.key)} />
            ))}
          </ScrollView>
          <SearchBox value={search} onChangeText={setSearch} placeholder="Taka no, order no, beam no, voucher…" />

          {canEdit && (
            <View style={st.bulkRow}>
              {selRows.length ? (
                <>
                  <Text style={st.bulkText}>{selRows.length} selected · {mtr(selQty)} m</Text>
                  <Btn label="Clear" kind="ghost" compact onPress={() => setSelected({})} />
                  <Btn label="Link / re-link selected" icon="link" kind="primary" compact onPress={() => openLink(selRows)} />
                </>
              ) : (
                <Btn label="Select all to fix" icon="done-all" kind="soft" compact onPress={selectAllToFix} disabled={!shown.some(needsFix)} />
              )}
            </View>
          )}
        </>
      )}
    </View>
  );

  const renderItem = ({ item: r }: { item: TakaRow }) => {
    const sel = !!selected[keyOf(r)];
    const linked = r.LinkStatus === 'LINKED';
    const wrong = r.LinkStatus === 'CHECK ORDER';
    const tone = linked ? T.green : wrong ? T.amber : r.LinkStatus === 'N/A' ? T.muted : T.red;
    return (
      <View style={[content, { paddingVertical: 5 }]}>
        <Card style={[st.card, sel && { borderColor: T.copper, backgroundColor: `${T.copper}0D` }]}>
          <View style={st.cardTop}>
            {canEdit && needsFix(r) ? (
              <TouchableOpacity onPress={() => toggle(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="checkbox" accessibilityState={{ checked: sel }}>
                <Icon name={sel ? 'check-box' : 'check-box-outline-blank'} size={22} color={sel ? T.copper : T.muted} />
              </TouchableOpacity>
            ) : null}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.taka} numberOfLines={1}>{r.TakaNo || '—'}</Text>
              <Text style={st.meta} numberOfLines={1}>{r.EntryType} · {r.InwardVoucher || '—'} · {fmtYmd(r.InwardDate)}</Text>
            </View>
            <View style={[st.badge, { backgroundColor: r.BeamType === 'CREEL' ? `${T.copper}18` : `${T.blue}14` }]}>
              <Text style={[st.badgeText, { color: r.BeamType === 'CREEL' ? T.copper : T.blue }]}>{r.BeamType}</Text>
            </View>
          </View>

          <View style={st.metrics}>
            <Metric label="In stock" value={`${mtr(r.InStock)} m`} />
            <Metric label="Beam" value={r.BeamNo || '—'} />
            <Metric label="Order" value={r.OrderNo || (r.OrderUId ? `#${r.OrderUId}` : '—')} color={linked ? T.ink : wrong ? T.amber : T.red} />
            <Metric label="Stock type" value={r.StkType || '?'} />
          </View>

          {wrong && r.LinkIssue ? (
            <View style={st.issue}>
              <Icon name="report-problem" size={15} color={T.amber} />
              <Text style={st.issueText}>{r.LinkIssue}</Text>
            </View>
          ) : null}

          <View style={st.cardFoot}>
            <View style={[st.status, { borderColor: `${tone}55`, backgroundColor: `${tone}12` }]}>
              <Icon name={linked ? 'link' : wrong ? 'report-problem' : 'link-off'} size={13} color={tone} />
              <Text style={[st.statusText, { color: tone }]}>{r.LinkStatus}</Text>
            </View>
            {!r.VisibleInVB ? (
              <View style={[st.status, { borderColor: `${T.amber}55`, backgroundColor: `${T.amber}14` }]}>
                <Icon name="visibility-off" size={13} color={T.amber} />
                <Text style={[st.statusText, { color: T.amber }]}>Not in VB</Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            {canEdit && canLinkRow(r) ? (
              wrong ? (
                <Btn label="Re-link" icon="swap-horiz" kind="primary" compact onPress={() => openLink([r])} />
              ) : linked ? (
                <>
                  <Btn label="Change" icon="swap-horiz" kind="ghost" compact onPress={() => openLink([r])} />
                  <Btn label="Unlink" icon="link-off" kind="danger" compact onPress={() => doUnlink([r])} />
                </>
              ) : (
                <Btn label="Link order" icon="link" kind="primary" compact onPress={() => openLink([r])} />
              )
            ) : null}
          </View>
        </Card>
      </View>
    );
  };

  const linkQty = (linkFor || []).reduce((a, r) => a + num(r.ChkQty ?? r.InwardQty), 0);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <FlatList
        data={loadedFor ? shown : []}
        keyExtractor={keyOf}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? null : (
            <View style={content}>
              <EmptyState
                icon={loadedFor ? 'inventory' : 'link'}
                title={loadedFor ? 'No takas' : 'Pick a design and an As On date'}
                text={loadedFor ? 'Nothing matches this filter.' : 'The list shows every taka of that design in stock on that date, using the same rules as the stock report.'}
              />
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { if (design) load(); }} tintColor={T.copper} />}
        initialNumToRender={20}
        windowSize={9}
      />

      {/* design picker */}
      <Sheet open={dsnOpen} onClose={() => setDsnOpen(false)} eyebrow="Design" title="Select design">
        <View style={{ gap: 10 }}>
          <SearchBox value={dsnSearch} onChangeText={setDsnSearch} placeholder="Design name or code" loading={dsnBusy} />
          {dsnList.map((d) => (
            <TouchableOpacity
              key={String(d.DsnCode)}
              style={[st.pickRow, design?.DsnCode === d.DsnCode && { borderColor: T.copper }]}
              onPress={() => { setDesign(d); setDsnOpen(false); setRows([]); setLoadedFor(''); }}
            >
              <Text style={st.pickName} numberOfLines={1}>{d.DsnName}</Text>
              <Text style={st.meta}>{d.DsnCode}</Text>
            </TouchableOpacity>
          ))}
          {!dsnBusy && !dsnList.length ? <Text style={st.meta}>No designs found.</Text> : null}
        </View>
      </Sheet>

      {/* order picker */}
      <Sheet
        open={!!linkFor}
        onClose={() => !saving && setLinkFor(null)}
        eyebrow={linkFor && linkFor.length > 1 ? `${linkFor.length} takas · ${mtr(linkQty)} m` : `Taka ${linkFor?.[0]?.TakaNo || ''} · ${mtr(linkQty)} m`}
        title="Link production order"
        footer={
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
            <Btn label="Cancel" kind="ghost" onPress={() => setLinkFor(null)} disabled={saving} />
            <Btn label={saving && progress ? `Linking ${progress}` : pick ? `Link to ${pick.OrderNo}` : 'Link'} icon="link" kind="copper" onPress={doLink} disabled={!pick || saving} loading={saving} />
          </View>
        }
      >
        {ordBusy ? (
          <ActivityIndicator color={T.copper} style={{ marginVertical: 24 }} />
        ) : orders.length === 0 ? (
          <EmptyState icon="assignment-late" title="No open production order" text="Create or authorise a production order for this design first, then link the takas." />
        ) : (
          <View style={{ gap: 8 }}>
            {orders.map((o) => {
              const on = pick?.UId === o.UId;
              const inHouse = o.SelfProdQty > 0;
              const bal = inHouse ? o.InHouseBal : o.BalQty;
              const short = bal < linkQty;
              return (
                <TouchableOpacity key={String(o.UId)} style={[st.order, on && { borderColor: T.copper, backgroundColor: `${T.copper}0D` }]} onPress={() => setPick(o)}>
                  <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={on ? T.copper : T.muted} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={st.pickName} numberOfLines={1}>{o.OrderNo || `#${o.UId}`}</Text>
                      {o.LastYear ? <Chip label="Last year" tone="neutral" /> : null}
                      {!inHouse ? <Chip label="No in-house qty" tone="red" /> : null}
                      {o.SameBeam ? <Chip label="Used on this beam" tone="blue" /> : null}
                      {o.IsAuth === 0 ? <Chip label="Not authorised" tone="amber" /> : null}
                    </View>
                    <Text style={st.meta}>
                      {fmtYmd(o.VouDate)} · Order {mtr(o.TotQty)} m · In-house {mtr(o.SelfProdQty)} m · Linked {mtr(o.LinkedQty)} m
                    </Text>
                  </View>
                  <Metric label={inHouse ? 'In-house bal.' : 'Balance'} value={inHouse ? `${mtr(bal)} m` : '—'} color={!inHouse || short ? T.red : T.green} align="right" />
                </TouchableOpacity>
              );
            })}
            <Text style={[st.meta, { marginTop: 4 }]}>
              Orders with in-house balance are listed first. In-house production should go to an order with in-house quantity; an order without it needs confirmation. The server also checks the order quantity and the weft issue (MinExpProdQty) for each taka; takas that fail are listed after saving.
            </Text>
          </View>
        )}
      </Sheet>

      <BusyOverlay visible={loading && !rows.length} text="Building stock for this design…" />
    </View>
  );
}

const st = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.copper}16` },
  title: { fontSize: 18, fontWeight: '800', color: T.ink },
  sub: { fontSize: 12.5, color: T.muted, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '700', color: T.sub },
  filterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' },
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  bulkText: { flex: 1, fontSize: 13, fontWeight: '700', color: T.copper },
  card: { gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taka: { fontSize: 15.5, fontWeight: '800', color: T.ink },
  meta: { fontSize: 12, color: T.muted },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '800' },
  pickRow: { borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 12, backgroundColor: T.surface, flexDirection: 'row', alignItems: 'center', gap: 10 },
  issue: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 8, borderRadius: 8, backgroundColor: `${T.amber}14`, borderWidth: 1, borderColor: `${T.amber}40` },
  issueText: { flex: 1, fontSize: 12.5, color: T.ink, fontWeight: '600' },
  pickName: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
  order: { borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, backgroundColor: T.surface, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
