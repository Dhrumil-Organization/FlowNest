// FILE: src/components/SalesOrderEntryNEW/TrackingTab.tsx
// "Tracking" tab — Legacy TrackingTab: dispatched / pending summary, filter chips
// (All · Authorized · Partial · Completed), search, SO cards with progress and
// shade chips. Buttons per active chip (model.getCardActions):
//   Dispatch (sheet: shade qty + total, POST /api/sodispatch),
//   Confirm APC (sheet: shade list from getshade, POST /api/soconfirmapc),
//   Job chart (sheet + "Copy job chart text").
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { Btn, Chip, EmptyState, ProgressBar, SearchBox, Sheet } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as api from './api';
import { useSavedPrpCode, useSavedYear } from './savedProperty';
import {
  acceptDispatchQty,
  buildJobChartText,
  dispatchItems,
  filterTracking,
  fmtIN,
  getCardActions,
  getOrderStatus,
  getShades,
  hasAPC,
  isAPCShade,
  num,
  Row,
  STATUS_FILTERS,
  trackingTotals,
} from './model';
import { Badge, CONTENT, Swatch, ui, useCols } from './ui';

type Props = { token: string; API: string; userid: string };

const STATUS_META = {
  completed: { label: 'Completed', tone: 'green' as const, bar: T.green },
  partial: { label: 'Partial', tone: 'amber' as const, bar: T.copper },
  authorized: { label: 'Authorized', tone: 'blue' as const, bar: T.copper },
};

export default function TrackingTab({ token, API, userid }: Props) {
  const readPrpCode = useSavedPrpCode(token, userid);
  const readYear = useSavedYear(token, userid);
  const { cols } = useCols();
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [prpcode, setPrpCode] = useState('');
  const [yearno, setYearNo] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dispatch
  const [dispItem, setDispItem] = useState<Row | null>(null);
  const [dispQtys, setDispQtys] = useState<Record<string, string>>({});
  const [dispChecked, setDispChecked] = useState<Record<string, boolean>>({});
  const [dispatching, setDispatching] = useState(false);
  const [totalDispatchQty, setTotalDispatchQty] = useState('');

  // Confirm APC
  const [confirmItem, setConfirmItem] = useState<Row | null>(null);
  const [confirmShadeRow, setConfirmShadeRow] = useState<Row | null>(null);
  const [confirmShades, setConfirmShades] = useState<Row[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);

  // Job chart
  const [jobItem, setJobItem] = useState<Row | null>(null);
  // load only after the saved year is known (Legacy first loaded with year '' -> '27', then again)
  const [yearRead, setYearRead] = useState(false);

  useEffect(() => {
    (async () => {
      const code = await readPrpCode();
      const year = await readYear('selected_yearno');
      setPrpCode(code || '');
      setYearNo(year ? `${year.slice(-2)}` : '');
      setYearRead(true);
    })();
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        isRefresh ? setRefreshing(true) : setLoading(true);
        setOrders(await api.getTracking(API, token, yearno));
      } catch (e: any) {
        console.log('tracking err', e?.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, yearno, API],
  );

  useEffect(() => {
    if (!token || !yearRead) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearno, token, yearRead]);

  const { totalOrdered, totalPending, totalDispatched, overallPct } = trackingTotals(orders);
  const filteredOrders = filterTracking(orders, search, statusFilter);

  /* ---------------- dispatch ---------------- */
  const openDispatch = (item: Row) => {
    const qtys: Record<string, string> = {};
    const checked: Record<string, boolean> = {};
    getShades(item).forEach((sh) => {
      qtys[sh.ShdCode] = '';
      checked[sh.ShdCode] = !isAPCShade(sh); // APC cannot be ticked
    });
    setTotalDispatchQty(String(item.PendingQty ?? item.pendingmtr ?? item.totmtr ?? 0));
    setDispQtys(qtys);
    setDispChecked(checked);
    setDispItem(item);
  };

  const toggleDispCheck = (sh: Row) => {
    if (isAPCShade(sh)) return;
    setDispChecked((p) => ({ ...p, [sh.ShdCode]: !p[sh.ShdCode] }));
  };

  const apcCount = getShades(dispItem || {}).filter(isAPCShade).length;

  const confirmDispatch = async () => {
    if (!dispItem) return;
    const r = dispatchItems(dispItem, totalDispatchQty, dispChecked, dispQtys);
    if ('error' in r) {
      AppAlert.alert(r.error[0], r.error[1]);
      return;
    }
    try {
      setDispatching(true);
      const data = await api.dispatchSo(API, token, dispItem, prpcode, r.items);
      if (data?.success) {
        setDispItem(null);
        load();
        AppAlert.alert('Done', 'Dispatched successfully');
      } else {
        AppAlert.alert('Failed', data?.message || 'Dispatch failed');
      }
    } catch (e: any) {
      AppAlert.alert('Error', e?.message);
    } finally {
      setDispatching(false);
    }
  };

  /* ---------------- confirm APC ---------------- */
  const openConfirmAPC = async (item: Row) => {
    const apcRow = getShades(item).find(isAPCShade);
    if (!apcRow) return;
    setConfirmItem(item);
    setConfirmShadeRow(apcRow);
    setConfirmShades([]);
    try {
      setConfirmLoading(true);
      const data = await api.getShadesOf(API, token, {
        prpcode: item.PrpCode || prpcode,
        strcode: item.StrCode || '012',
        yearno,
        itmcode: item.ItmCode || apcRow.ItmCode,
        mitmcode: item.MItmCode || apcRow.MItmCode || item.ItmCode || apcRow.ItmCode,
        dsncode: item.DsnCode || apcRow.DsnCode,
      });
      setConfirmShades(data.filter((sh) => !isAPCShade(sh)));
    } catch (e) {
      setConfirmShades([]);
    } finally {
      setConfirmLoading(false);
    }
  };

  const confirmAPCShade = async (shade: Row) => {
    if (!confirmItem || !confirmShadeRow) return;
    try {
      setConfirmSaving(true);
      const data = await api.confirmApc(API, token, confirmItem, confirmShadeRow, prpcode, shade);
      if (data?.success) {
        setConfirmItem(null);
        setConfirmShadeRow(null);
        load();
        AppAlert.alert('Done', `APC confirmed as ${shade.ShdName || shade.ShadeName}`);
      } else {
        AppAlert.alert('Failed', data?.message || 'Could not confirm shade');
      }
    } catch (e: any) {
      AppAlert.alert('Error', e?.message);
    } finally {
      setConfirmSaving(false);
    }
  };

  /* ---------------- job chart ---------------- */
  const copyJobChart = async () => {
    try {
      await Clipboard.setStringAsync(buildJobChartText(jobItem));
      AppAlert.alert('Copied', 'Job chart copied to clipboard');
    } catch (e) {
      AppAlert.alert('Error', 'Clipboard unavailable');
    }
  };
  const jobShades = getShades(jobItem || {});
  const jobTotal = jobShades.reduce((sum, sh) => sum + num(sh.OrderQty ?? sh.Qty), 0);

  /* ---------------- card ---------------- */
  const renderOrderCard = ({ item }: { item: Row }) => {
    const ordered = num(item.OrderQty ?? item.totmtr);
    const pending = num(item.PendingQty ?? item.pendingmtr);
    const dispatched = ordered - pending;
    const pct = ordered > 0 ? Math.min(100, (dispatched / ordered) * 100) : 0;
    const meta = STATUS_META[getOrderStatus(item)];
    const marginVal = item.MarginPerM != null ? Number(item.MarginPerM) : null;
    const shades = getShades(item);
    const actions = getCardActions(statusFilter, item);

    return (
      <View style={[s.cell, cols > 1 && { width: `${100 / cols}%` as any }]}>
        <View style={[ui.card, s.card]}>
          <View style={s.cardHead}>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <View style={s.soRow}>
                <Text style={s.soNo}>{item.SONo || item.SO_No}</Text>
                <Badge text={meta.label} tone={meta.tone} />
                {hasAPC(item) ? <Badge text="⊙ APC" tone="amber" /> : null}
              </View>
              <Text style={s.party} numberOfLines={2}>
                {item.ParName || item.partyname}
              </Text>
              <Text style={ui.muted} numberOfLines={1}>
                {item.DsnName || ''} · due {item.DeliveryDate || item.DueDate || '—'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text style={s.amt}>₹{fmtIN(item.NetAmt ?? item.amount)}</Text>
              <Text style={ui.muted}>{fmtIN(ordered)} m</Text>
            </View>
          </View>

          <View style={s.progRow}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={pct} color={meta.bar} height={7} />
            </View>
            <Text style={s.progPct}>{Math.round(pct)}%</Text>
          </View>

          {shades.length > 0 ? (
            <View style={s.chipWrap}>
              {shades.map((sh, i) => {
                const apc = isAPCShade(sh);
                const shOrd = num(sh.OrderQty ?? sh.Qty);
                const shDisp = num(sh.DispQty ?? sh.DispatchedQty);
                const done = shOrd > 0 && shDisp >= shOrd;
                return (
                  <View key={i} style={[s.shadeChip, apc && s.shadeChipApc]}>
                    {!apc ? <Swatch color={sh.ShdColor || '#94A3B8'} size={10} radius={5} /> : null}
                    <Text style={[s.shadeChipName, apc && { color: T.amber }]} numberOfLines={1}>
                      {apc ? '⊙ APC' : sh.ShdName || sh.ShadeName}
                    </Text>
                    <Text style={[s.shadeChipQty, done && { color: T.green }, apc && { color: T.amber }]}>
                      {done ? `✓ ${fmtIN(shOrd)}` : `${fmtIN(shDisp)}/${fmtIN(shOrd)}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {marginVal != null ? (
            <Text style={[s.margin, { color: marginVal >= 0 ? T.green : T.red }]}>
              Margin ₹{item.MarginPerM}/m
              {item.MarginPct != null ? ` (${Number(item.MarginPct).toFixed(1)}%)` : ''} vs costing
            </Text>
          ) : null}

          <View style={s.btnRow}>
            {actions.includes('dispatch') ? <Btn label="Dispatch" icon="local-shipping" kind="primary" compact onPress={() => openDispatch(item)} style={{ flex: 1 }} /> : null}
            {actions.includes('confirmAPC') ? <Btn label="Confirm APC" icon="palette" kind="soft" compact onPress={() => openConfirmAPC(item)} style={{ flex: 1 }} /> : null}
            {actions.includes('job') ? <Btn label="Job chart" icon="assignment" kind="ghost" compact onPress={() => setJobItem(item)} style={{ flex: 1 }} /> : null}
          </View>
        </View>
      </View>
    );
  };

  const header = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      <View style={[ui.card, s.summary]}>
        <View style={s.summaryTop}>
          <View style={s.donut}>
            <Text style={s.donutPct}>{Math.round(overallPct)}%</Text>
            <Text style={s.donutLbl}>DONE</Text>
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            {/* Legacy mix bar: green = dispatched on a copper (pending) track */}
            <View style={s.mixTrack}>
              <View style={{ width: `${Math.max(0, Math.min(100, overallPct))}%` as any, height: 10, borderRadius: 5, backgroundColor: T.green }} />
            </View>
            <View style={s.legend}>
              <Text style={[s.legendText, { color: T.green }]}>■ {fmtIN(totalDispatched)} m dispatched</Text>
              <Text style={[s.legendText, { color: T.copper }]}>■ {fmtIN(totalPending)} m pending</Text>
            </View>
          </View>
        </View>
        <View style={s.stats}>
          <Stat label="ORDERED" value={`${fmtIN(totalOrdered)} m`} color={T.ink} />
          <Stat label="DISPATCHED" value={`${fmtIN(totalDispatched)} m`} color={T.green} tint={`${T.green}12`} />
          <Stat label="PENDING" value={`${fmtIN(totalPending)} m`} color={T.copper} tint={`${T.copper}12`} />
        </View>
      </View>

      <View style={s.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} active={statusFilter === f.key} onPress={() => setStatusFilter(f.key)} />
        ))}
      </View>

      <SearchBox value={search} onChangeText={setSearch} placeholder="Search party or design..." />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={T.copper} />
        </View>
      ) : (
        <FlatList
          key={`cols-${cols}`}
          data={filteredOrders}
          keyExtractor={(item: Row, i: number) => `${item.UId}_${i}`}
          renderItem={renderOrderCard}
          numColumns={cols}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[T.copper]} tintColor={T.copper} />}
          contentContainerStyle={[s.list, CONTENT]}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState icon="local-shipping" title="No tracking data found" />}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Dispatch */}
      <Sheet
        open={!!dispItem}
        onClose={() => setDispItem(null)}
        eyebrow="DISPATCH"
        title={`Dispatch · ${dispItem?.SONo || ''}`}
        footer={
          <Btn
            label={dispatching ? 'Dispatching...' : `Confirm dispatch (${totalDispatchQty} m)`}
            icon="local-shipping"
            kind="copper"
            onPress={confirmDispatch}
            disabled={dispatching}
            style={{ flex: 1 }}
          />
        }
      >
        {apcCount > 0 ? (
          <View style={s.apcWarn}>
            <Text style={s.apcWarnText}>⊙ {apcCount} APC shade(s) can't dispatch until confirmed.</Text>
          </View>
        ) : null}

        {getShades(dispItem || {}).map((sh, i) => {
          const apc = isAPCShade(sh);
          const checked = !!dispChecked[sh.ShdCode];
          return (
            <View key={i} style={[s.dispCard, checked && s.dispCardOn, apc && s.dispCardApc]}>
              <TouchableOpacity
                style={s.dispTop}
                onPress={() => toggleDispCheck(sh)}
                activeOpacity={apc ? 1 : 0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled: apc }}
              >
                <Icon name={checked ? 'check-box' : 'check-box-outline-blank'} size={24} color={apc ? T.border : checked ? T.copper : T.muted} />
                <Swatch color={sh.ShdColor || '#94A3B8'} size={22} radius={6} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.dispName, apc && { color: T.amber }]} numberOfLines={1}>
                    {apc ? '⊙ APC — not confirmed' : sh.ShdName || sh.ShadeName}
                  </Text>
                  <Text style={ui.muted}>Pending {fmtIN(sh.PendingQty ?? sh.Qty)} m</Text>
                </View>
              </TouchableOpacity>
              {checked && !apc ? (
                <View style={{ gap: 6 }}>
                  <Text style={ui.label}>Dispatch qty</Text>
                  <View style={s.qtyBox}>
                    <TextInput
                      style={s.qtyInput}
                      value={dispQtys[sh.ShdCode] || ''}
                      onChangeText={(v: string) => setDispQtys((p) => ({ ...p, [sh.ShdCode]: v }))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={T.muted}
                    />
                    <Text style={s.qtyUnit}>m</Text>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total to dispatch</Text>
          <TextInput
            style={s.totalInput}
            value={totalDispatchQty}
            onChangeText={(t: string) => {
              const ok = acceptDispatchQty(t);
              if (ok !== null) setTotalDispatchQty(ok);
            }}
            onBlur={() => setTotalDispatchQty(parseFloat(totalDispatchQty || '0').toFixed(3))}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={T.muted}
          />
        </View>
      </Sheet>

      {/* Confirm APC */}
      <Sheet open={!!confirmItem} onClose={() => setConfirmItem(null)} eyebrow="CONFIRM APC" title="Confirm shade">
        {confirmLoading ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <ActivityIndicator color={T.copper} />
          </View>
        ) : (
          <View>
            {confirmShades.map((sh, i) => (
              <TouchableOpacity key={i} style={s.confirmRow} onPress={() => confirmAPCShade(sh)} disabled={confirmSaving} activeOpacity={0.7}>
                <Swatch color={sh.ShdColor || '#94A3B8'} size={26} radius={13} />
                <Text style={s.confirmText}>{sh.ShdName || sh.ShadeName}</Text>
                {confirmSaving ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="chevron-right" size={20} color={T.muted} />}
              </TouchableOpacity>
            ))}
            {confirmShades.length === 0 ? <Text style={s.emptyText}>No shades found for this design</Text> : null}
          </View>
        )}
      </Sheet>

      {/* Job chart */}
      <Sheet
        open={!!jobItem}
        onClose={() => setJobItem(null)}
        eyebrow="JOB CHART"
        title="Job chart"
        footer={<Btn label="Copy job chart text" icon="content-copy" kind="ghost" onPress={copyJobChart} style={{ flex: 1 }} />}
      >
        <View style={[ui.card, { padding: 14, gap: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <View>
              <Text style={ui.label}>REF</Text>
              <Text style={s.jobRef}>{jobItem?.SONo || jobItem?.SO_No}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', flex: 1 }}>
              <Text style={ui.label}>DESIGN</Text>
              <Text style={s.jobDesign}>{jobItem?.DsnName || '—'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {jobItem?.FabState || jobItem?.StageName ? <Badge text={String(jobItem.FabState || jobItem.StageName).toUpperCase()} tone="blue" /> : null}
            {jobItem?.FabType || jobItem?.ItmName ? <Badge text={String(jobItem.FabType || jobItem.ItmName)} tone="muted" /> : null}
          </View>
          <Text style={[ui.label, { marginTop: 4 }]}>SHADE / COLOUR</Text>
          {jobShades.map((sh, i) => {
            const apc = isAPCShade(sh);
            return (
              <View key={i} style={s.jobRow}>
                {!apc ? <Swatch color={sh.ShdColor || '#94A3B8'} size={12} radius={6} /> : null}
                <Text style={[s.jobShade, apc && { color: T.amber, fontWeight: '800' }]}>{apc ? 'APC — not confirmed' : sh.ShdName || sh.ShadeName}</Text>
                <Text style={s.jobQty}>{fmtIN(sh.OrderQty ?? sh.Qty)} m</Text>
              </View>
            );
          })}
          <View style={s.jobTotal}>
            <Text style={s.jobTotalLbl}>TOTAL</Text>
            <Text style={s.jobTotalNum}>{fmtIN(jobTotal)} m</Text>
          </View>
        </View>
        <Text style={[ui.muted, { textAlign: 'center' }]}>Job chart carries no customer or pricing information.</Text>
      </Sheet>
    </View>
  );
}

function Stat({ label, value, color, tint }: { label: string; value: string; color: string; tint?: string }) {
  return (
    <View style={[s.stat, tint ? { backgroundColor: tint } : null]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, paddingBottom: 30 },
  cell: { width: '100%', padding: 5 },
  card: { padding: 14, gap: 10, flex: 1 },
  cardHead: { flexDirection: 'row', gap: 10 },
  soRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  soNo: { fontSize: 12.5, fontWeight: '800', color: T.copper },
  party: { fontSize: 14.5, fontWeight: '900', color: T.ink },
  amt: { fontSize: 15, fontWeight: '900', color: T.nav },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progPct: { width: 40, textAlign: 'right', fontSize: 12.5, fontWeight: '800', color: T.ink },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  shadeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, maxWidth: '100%' },
  shadeChipApc: { borderColor: `${T.amber}66`, backgroundColor: `${T.amber}12` },
  shadeChipName: { fontSize: 12, fontWeight: '700', color: T.ink, flexShrink: 1 },
  shadeChipQty: { fontSize: 12, fontWeight: '800', color: T.muted },
  margin: { fontSize: 12.5, fontWeight: '800' },
  btnRow: { flexDirection: 'row', gap: 8 },

  summary: { padding: 14, gap: 14 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  donut: { width: 76, height: 76, borderRadius: 38, borderWidth: 7, borderColor: T.green, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface },
  donutPct: { fontSize: 17, fontWeight: '900', color: T.ink },
  donutLbl: { fontSize: 9, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  mixTrack: { height: 10, borderRadius: 5, backgroundColor: T.copper, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  legendText: { fontSize: 12, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: T.sub, borderWidth: 1, borderColor: T.hair },
  statLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
  statValue: { fontSize: 15, fontWeight: '900', marginTop: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  apcWarn: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: `${T.amber}55`, backgroundColor: `${T.amber}12` },
  apcWarnText: { fontSize: 12.5, fontWeight: '700', color: T.ink },
  dispCard: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, gap: 10 },
  dispCardOn: { borderColor: `${T.copper}88`, backgroundColor: `${T.copper}08` },
  dispCardApc: { borderColor: `${T.amber}55`, backgroundColor: `${T.amber}0D` },
  dispTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dispName: { fontSize: 14, fontWeight: '800', color: T.ink },
  qtyBox: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  qtyInput: { flex: 1, fontSize: 15, fontWeight: '700', color: T.ink, paddingVertical: 0 },
  qtyUnit: { fontSize: 13, fontWeight: '700', color: T.muted },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.hair },
  totalLabel: { fontSize: 13.5, fontWeight: '700', color: T.muted },
  totalInput: {
    minWidth: 120,
    height: 44,
    textAlign: 'right',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    fontSize: 17,
    fontWeight: '900',
    color: T.nav,
    backgroundColor: T.surface,
  },

  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  confirmText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
  emptyText: { textAlign: 'center', color: T.muted, fontWeight: '700', paddingVertical: 28 },

  jobRef: { fontSize: 16, fontWeight: '900', color: T.ink, marginTop: 2 },
  jobDesign: { fontSize: 14, fontWeight: '800', color: T.ink, marginTop: 2, textAlign: 'right' },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  jobShade: { flex: 1, fontSize: 13.5, fontWeight: '700', color: T.ink },
  jobQty: { fontSize: 13.5, fontWeight: '800', color: T.nav },
  jobTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  jobTotalLbl: { fontSize: 12, fontWeight: '900', color: T.muted, letterSpacing: 0.6 },
  jobTotalNum: { fontSize: 15, fontWeight: '900', color: T.ink },
});
