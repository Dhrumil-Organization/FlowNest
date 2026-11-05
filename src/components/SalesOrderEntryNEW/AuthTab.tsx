// FILE: src/components/SalesOrderEntryNEW/AuthTab.tsx
// "Auth" tab — Legacy AuthTab: From / To (default 1 Apr of this FY -> today),
// Pending (sosortbrowse isauth 0 / atype b) and Authorized (isauth 1 / atype m)
// lists. Pending card: Edit · View · Delete · Approve · Reject.
// Authorized card: Edit (blocked — authorised) · View · Delete.
// Property / year come from what the New Order tab saved ('selected_prpcode',
// 'selected_yearno' — also the auto-selected default, see savedProperty.ts) — the tab re-reads them every
// time it is opened.
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { Btn, EmptyState } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as api from './api';
import { useSavedPrpCode, useSavedYear } from './savedProperty';
import {
  buildAuthParams,
  buildEditPayload,
  currentFyNo,
  fyStart,
  getDesignName,
  getRatePerM,
  getSoId,
  getTotalQty,
  moneyShort,
  parseNum,
  Row,
  shadeColorFromName,
  updatedMessage,
  ymd,
} from './model';
import OrderPanel, { OrderSave } from './OrderPanel';
import { Badge, CONTENT, DateInput, Swatch, ui, useCols } from './ui';

type Props = { token: string; API: string; userid: string };

export default function AuthTab({ token, API, userid }: Props) {
  const readPrpCode = useSavedPrpCode(token, userid);
  const readYear = useSavedYear(token, userid);
  const { isPhone } = useCols();
  const [pending, setPending] = useState<Row[]>([]);
  const [authorised, setAuthorised] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [approving, setApproving] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [prpcode, setPrpCode] = useState('');
  const [yearno, setYearNo] = useState('');
  const [storageRead, setStorageRead] = useState(false);
  const [expandedId, setExpandedId] = useState<any>(null);
  const [orderModal, setOrderModal] = useState<{ visible: boolean; mode: 'view' | 'edit'; record: Row | null }>({
    visible: false,
    mode: 'view',
    record: null,
  });

  useEffect(() => {
    if (!token) return;
    setFromDate(fyStart(new Date()));
    setToDate(new Date());
  }, [token]);

  useEffect(() => {
    (async () => {
      const code = await readPrpCode();
      const year = await readYear('selected_yearno');
      setPrpCode(code || '');
      setYearNo(year ? `${year.slice(-2)}` : '');
      setStorageRead(true);
    })();
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!fromDate || !toDate || !prpcode) return;
      try {
        isRefresh ? setRefreshing(true) : setLoading(true);
        const userPtype = await api.userPrpType();
        const base: api.BrowseBase = {
          prptype: userPtype,
          strcode: '012',
          fromdate: ymd(fromDate),
          todate: ymd(toDate),
          strtype: 'g',
          txntype: 'sales_order',
          referrer: 'mob_dashboard',
          yearno: yearno || currentFyNo(),
          prpcode,
          prpcodes: [],
          search: '',
        };
        const [p, a] = await Promise.all([
          api.sortBrowse(API, token, base, { isauth: 0, atype: 'b' }),
          api.sortBrowse(API, token, base, { isauth: 1, atype: 'm' }),
        ]);
        setPending(p);
        setAuthorised(a);
      } catch (e: any) {
        AppAlert.alert('Unable to load orders', e?.response?.data?.message || e?.message || 'Please pull down to try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fromDate, toDate, token, prpcode, yearno, API],
  );

  useEffect(() => {
    if (!token) return;
    load();
  }, [load, token]);

  const approveOrder = async (item: Row, action: 'approve' | 'reject') => {
    try {
      setApproving(item.UId);
      const data = await api.authorise(API, token, buildAuthParams(item, action));
      if (data?.success) {
        await load();
        setExpandedId(null);
        AppAlert.alert('Done', action === 'approve' ? 'Order approved successfully.' : 'Order rejected successfully.');
      } else {
        AppAlert.alert('Failed', data?.message || 'Action failed');
      }
    } catch (e: any) {
      AppAlert.alert('Error', e?.message);
    } finally {
      setApproving(null);
    }
  };

  const toggleExpand = (uid: any) => setExpandedId((prev: any) => (prev === uid ? null : uid));

  const openOrder = (item: Row, mode: 'view' | 'edit') => {
    if (mode === 'edit' && Number(item.IsAuth || 0) !== 0) {
      AppAlert.alert('Cannot edit', 'An authorized sales order cannot be modified.');
      return;
    }
    setOrderModal({ visible: true, mode, record: item });
  };

  const closeOrder = useCallback(() => {
    if (savingEdit) return;
    setOrderModal({ visible: false, mode: 'view', record: null });
  }, [savingEdit]);

  const updateOrder = async ({ dueDate, remark, rows, removedRows = [] }: OrderSave) => {
    const item = orderModal.record;
    if (!item || orderModal.mode !== 'edit') return;
    const payload = buildEditPayload(item, { prpcode, yearno }, { dueDate, remark, rows });
    try {
      setSavingEdit(true);
      const data = await api.saveOrder(API, token, payload);
      if (data?.success !== true) throw new Error(data?.message || 'Unable to update the sales order.');
      setOrderModal({ visible: false, mode: 'view', record: null });
      setExpandedId(null);
      await load();
      AppAlert.alert('Updated', updatedMessage(rows, removedRows));
    } catch (e: any) {
      AppAlert.alert('Update failed', e?.response?.data?.message || e?.message || 'Unable to update the sales order.');
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteOrder = async (item: Row) => {
    try {
      setDeletingId(item.UId);
      const data = await api.deleteSo(API, token, item, prpcode, yearno, currentFyNo());
      const response = data?.response || {};
      const serverMessage = response.message || data?.message || '';
      const failed = data?.success === false || /in use|closed|no data/i.test(serverMessage);
      if (failed) throw new Error(serverMessage || 'The sales order could not be deleted.');
      setPending((prev) => prev.filter((r) => String(r.UId) !== String(item.UId)));
      setAuthorised((prev) => prev.filter((r) => String(r.UId) !== String(item.UId)));
      setExpandedId((prev: any) => (String(prev) === String(item.UId) ? null : prev));
      AppAlert.alert('Deleted', 'Sales order removed successfully.');
    } catch (e: any) {
      AppAlert.alert(
        'Cannot delete order',
        e?.response?.data?.response?.message || e?.response?.data?.message || e?.message || 'This sales order may already be in use.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (item: Row) => {
    if (deletingId || savingEdit || approving) return;
    AppAlert.alert('Delete sales order?', `${getSoId(item)} will be permanently removed. This is allowed only when the order is not in use.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteOrder(item) },
    ]);
  };

  /* ---------------- edit / view panel ---------------- */
  if (orderModal.visible && orderModal.record) {
    return (
      <OrderPanel
        mode={orderModal.mode}
        record={orderModal.record}
        saving={savingEdit}
        token={token}
        API={API}
        prpcode={prpcode}
        yearno={yearno}
        onClose={closeOrder}
        onSave={updateOrder}
      />
    );
  }

  const renderShades = (item: Row) =>
    Array.isArray(item.d1)
      ? item.d1.map((row: Row, i: number) => (
          <View key={`${row.ShdCode}_${i}`} style={s.shadeRow}>
            <Swatch color={row.ShdColor || shadeColorFromName(row.ShdName)} size={26} radius={7} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.shadeName} numberOfLines={1}>
                {row.ShdName}
              </Text>
              <Text style={ui.muted} numberOfLines={1}>
                {row.ItmName}
              </Text>
            </View>
            <Text style={s.shadeQty}>{Number(row.Qty || 0).toLocaleString('en-IN')} Qty</Text>
          </View>
        ))
      : null;

  const renderCard = (item: Row, kind: 'pending' | 'auth') => {
    const isOpen = expandedId === item.UId;
    const busy = deletingId === item.UId || (kind === 'pending' && approving === item.UId);
    const ratePerM = getRatePerM(item);
    return (
      <View key={item.UId} style={[ui.card, s.card]}>
        <TouchableOpacity style={s.cardTop} onPress={() => toggleExpand(item.UId)} activeOpacity={0.85} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <View style={s.soRow}>
              <Text style={s.soNo}>{getSoId(item)}</Text>
              {kind === 'pending' ? <Badge text="Pending" tone="amber" /> : <Badge text="Authorized" tone="green" />}
            </View>
            <Text style={s.party} numberOfLines={2}>
              {item.ParName}
            </Text>
            {getDesignName(item) ? (
              <Text style={ui.muted} numberOfLines={1}>
                {getDesignName(item)}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <Text style={s.amt}>{moneyShort(item.NetAmt)}</Text>
            <Text style={ui.muted}>Qty: {getTotalQty(item).toLocaleString('en-IN')}</Text>
          </View>
          <Icon name={isOpen ? 'expand-less' : 'expand-more'} size={22} color={T.muted} />
        </TouchableOpacity>

        {isOpen ? (
          <View style={s.detail}>
            <View style={s.execRow}>
              <Text style={s.execText}>
                Exec: <Text style={{ fontWeight: '800', color: T.ink }}>{item.SexecName || '—'}</Text>
              </Text>
              <View style={s.duePill}>
                <Icon name="event" size={13} color={T.copper} />
                <Text style={s.dueText}>Due: {item.dduedate || item.DueDate || '—'}</Text>
              </View>
            </View>

            {renderShades(item)}

            {kind === 'pending' && item.CostPerM ? (
              <View style={s.costBox}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.costLabel}>VS LATEST COSTING{item.CostMonth ? ` (${item.CostMonth})` : ''}</Text>
                  <Text style={ui.muted}>
                    Cost ₹{Number(item.CostPerM).toFixed(0)} · Rate ₹{ratePerM}
                  </Text>
                </View>
                {(() => {
                  const diff = parseNum(ratePerM) - parseNum(item.CostPerM);
                  const pct = parseNum(item.CostPerM) > 0 ? ((diff / parseNum(item.CostPerM)) * 100).toFixed(1) : null;
                  const color = diff >= 0 ? T.green : T.red;
                  return (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.costDiff, { color }]}>
                        ₹{diff >= 0 ? '+' : ''}
                        {Math.round(diff)}
                      </Text>
                      {pct !== null ? <Text style={[s.costPct, { color }]}>{pct}% margin</Text> : null}
                    </View>
                  );
                })()}
              </View>
            ) : null}

            {kind === 'pending' && Number(item.Shortfall) > 0 ? (
              <View style={s.short}>
                <Text style={s.shortTitle}>⚠ Shortfall — {Number(item.Shortfall).toLocaleString('en-IN')} m to produce</Text>
                <View style={s.shortMeta}>
                  <Text style={s.shortPill}>Finished: {Number(item.FinishedStock || 0).toLocaleString('en-IN')} m</Text>
                  <Text style={s.shortPill}>Greige: {Number(item.GreigeStock || 0).toLocaleString('en-IN')} m</Text>
                  <Text style={s.shortPill}>Order: {Number(item.OrderQty || 0).toLocaleString('en-IN')} m</Text>
                </View>
              </View>
            ) : null}

            <View style={s.manage}>
              {kind === 'pending' ? (
                <Btn label="Edit" icon="edit" kind="soft" compact onPress={() => openOrder(item, 'edit')} disabled={busy} style={{ flex: 1 }} />
              ) : (
                <Btn label="Edit" icon="lock-outline" kind="ghost" compact onPress={() => openOrder(item, 'edit')} disabled={deletingId === item.UId} style={{ flex: 1, opacity: 0.7 }} />
              )}
              <Btn label="View" icon="visibility" kind="ghost" compact onPress={() => openOrder(item, 'view')} disabled={busy} style={{ flex: 1 }} />
              <TouchableOpacity
                style={[s.delBtn, busy && { opacity: 0.55 }]}
                onPress={() => confirmDelete(item)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Delete sales order"
              >
                {deletingId === item.UId ? <ActivityIndicator size="small" color={T.red} /> : <Icon name="delete-outline" size={18} color={T.red} />}
                <Text style={s.delText}>{deletingId === item.UId ? 'Deleting' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>

            {kind === 'pending' ? (
              <View style={s.manage}>
                <Btn
                  label={approving === item.UId ? '...' : 'Approve'}
                  icon="check"
                  kind="primary"
                  onPress={() => approveOrder(item, 'approve')}
                  disabled={approving === item.UId || deletingId === item.UId}
                  style={{ flex: 1, backgroundColor: T.green }}
                />
                <Btn
                  label="Reject"
                  icon="close"
                  kind="danger"
                  onPress={() => approveOrder(item, 'reject')}
                  disabled={approving === item.UId || deletingId === item.UId}
                  style={{ flex: 1 }}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const noProperty = storageRead && !prpcode;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[T.copper]} tintColor={T.copper} />}
    >
      <View style={[CONTENT, { gap: 12 }]}>
        <View style={s.dateRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={ui.label}>From</Text>
            <DateInput label="From date" value={fromDate} onChange={setFromDate} placeholder="—" />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={ui.label}>To</Text>
            <DateInput label="To date" value={toDate} onChange={setToDate} placeholder="—" />
          </View>
          <Btn label={isPhone ? '' : 'Apply'} icon="filter-alt" kind="primary" onPress={() => load()} style={{ height: 46, minWidth: 46 }} />
        </View>

        {noProperty ? (
          <View style={s.note}>
            <Icon name="info-outline" size={18} color={T.blue} />
            <Text style={s.noteText}>Select a property on the New Order tab to see its orders.</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator size="large" color={T.copper} />
          </View>
        ) : (
          <>
            <SectionTitle title="Pending" count={pending.length} />
            {pending.map((it) => renderCard(it, 'pending'))}
            {pending.length === 0 ? <EmptyState icon="hourglass-empty" title="No pending orders" /> : null}

            <SectionTitle title="Authorized" count={authorised.length} />
            {authorised.map((it) => renderCard(it, 'auth'))}
            {authorised.length === 0 ? <EmptyState icon="verified" title="No authorized orders" /> : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCount}>
        <Text style={s.sectionCountText}>{count}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 30 },
  dateRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  note: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${T.blue}40`,
    backgroundColor: `${T.blue}10`,
  },
  noteText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: T.blue },
  loader: { paddingVertical: 60, alignItems: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: T.ink },
  sectionCount: { minWidth: 26, paddingHorizontal: 8, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: T.nav },
  sectionCountText: { fontSize: 11.5, fontWeight: '900', color: '#fff' },

  card: { overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  soRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  soNo: { fontSize: 12, fontWeight: '800', color: T.copper, letterSpacing: 0.3 },
  party: { fontSize: 14.5, fontWeight: '900', color: T.ink },
  amt: { fontSize: 15, fontWeight: '900', color: T.nav },

  detail: { paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 12 },
  execRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  execText: { fontSize: 12.5, fontWeight: '600', color: T.muted },
  duePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: `${T.copper}12` },
  dueText: { fontSize: 12, fontWeight: '800', color: T.copper },
  shadeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  shadeName: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  shadeQty: { fontSize: 13, fontWeight: '800', color: T.nav },

  costBox: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub },
  costLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
  costDiff: { fontSize: 16, fontWeight: '900' },
  costPct: { fontSize: 12, fontWeight: '800' },

  short: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: `${T.amber}55`, backgroundColor: `${T.amber}12`, gap: 8 },
  shortTitle: { fontSize: 13, fontWeight: '800', color: T.ink },
  shortMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  shortPill: { fontSize: 12, fontWeight: '700', color: T.ink, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: T.surface },

  manage: { flexDirection: 'row', gap: 8 },
  delBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${T.red}40`,
    backgroundColor: `${T.red}0D`,
  },
  delText: { fontSize: 12.5, fontWeight: '800', color: T.red },
});
