// FILE: src/components/SalesOrderEntryNEW/SummaryTab.tsx
// "Summary" tab — Legacy SummaryTab: month chips (this month + 5 back),
// Design wise / Customer wise grouping, smart search (party / design / shade /
// SO / item), customer + design filters built only from the loaded result,
// group -> SO -> shades (or designs & shades) drill-down.
// Grouping / filter rules: model.ts (summaryFacets, filterSummaryOrders, groupSummary).
import AsyncStorage from '@/common/utils/compatibleStorage';
import { EmptyState, PickField, SearchBox, Segment } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as api from './api';
import { useSavedPrpCode, useSavedYear } from './savedProperty';
import {
  buildMonths,
  designsOfOrder,
  filterSummaryOrders,
  fmtIN,
  getStatusMeta,
  groupSummary,
  keepMonth,
  MonthOpt,
  num,
  orderKey,
  Row,
  SumGroup,
  summaryFacets,
  SumOrder,
  ymd,
} from './model';
import { Badge, CONTENT, SearchPicker, Swatch, ui } from './ui';

type Props = { token: string; API: string; userid: string };

export default function SummaryTab({ token, API, userid }: Props) {
  const readPrpCode = useSavedPrpCode(token, userid);
  const readYear = useSavedYear(token, userid);
  const MONTHS = useMemo(() => buildMonths(), []);
  const [selMonth, setSelMonth] = useState<MonthOpt>(MONTHS[0]);
  const [summaryOrders, setSummaryOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [groupMode, setGroupMode] = useState<'design' | 'customer'>('design');

  const [filterCust, setFilterCust] = useState('');
  const [filterCustName, setFilterCustName] = useState('');
  const [filterDesign, setFilterDesign] = useState('');
  const [filterDesignName, setFilterDesignName] = useState('');
  const [smartSearch, setSmartSearch] = useState('');
  const [picker, setPicker] = useState<'cust' | 'dsn' | null>(null);

  const [expandedGroupKey, setExpandedGroupKey] = useState('');
  const [expandedOrderKey, setExpandedOrderKey] = useState('');

  const [prpcode, setPrpCode] = useState('');
  const [yearno, setYearNo] = useState('');

  useEffect(() => {
    (async () => {
      const code = await readPrpCode();
      const year = await readYear('selectedyear');
      setPrpCode(code || '');
      setYearNo(year ? String(year).slice(-2) : '');
    })();
  }, []);

  const load = useCallback(
    async (mo: MonthOpt, isRefresh = false) => {
      try {
        isRefresh ? setRefreshing(true) : setLoading(true);
        const userPtype = await api.userPrpType();
        const code = await readPrpCode();
        const selectedYear = await readYear('selectedyear');
        const yno = selectedYear ? String(selectedYear).slice(-2) : yearno;
        const firstDay = new Date(mo.year, mo.month - 1, 1);
        const lastDay = new Date(mo.year, mo.month, 0);
        const data = await api.sortBrowse(API, token, {
          prptype: userPtype,
          strcode: '012',
          fromdate: ymd(firstDay),
          todate: ymd(lastDay),
          strtype: 'g',
          txntype: 'sales_order',
          referrer: 'mob_dashboard',
          yearno: yno,
          prpcode: code || prpcode,
          prpcodes: [],
          search: '',
        });
        setSummaryOrders(keepMonth(data, mo));
      } catch (e: any) {
        console.log('summary err', e?.response?.data || e?.message || e);
        setSummaryOrders([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, prpcode, yearno, API],
  );

  useEffect(() => {
    if (!token) return;
    load(selMonth);
  }, [selMonth, token, load]);

  // reset expansion when the hierarchy itself changes
  useEffect(() => {
    setExpandedGroupKey('');
    setExpandedOrderKey('');
  }, [groupMode, filterCust, filterDesign, smartSearch, selMonth.key]);

  const { partyOptions, designOptions } = summaryFacets(summaryOrders, filterCust, filterDesign, smartSearch);

  // clear a selection that the other facet / search made impossible
  useEffect(() => {
    if (filterCust && !partyOptions.some((p) => String(p.code) === String(filterCust))) {
      setFilterCust('');
      setFilterCustName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDesign, smartSearch, summaryOrders]);

  useEffect(() => {
    if (filterDesign && !designOptions.some((d) => String(d.code) === String(filterDesign))) {
      setFilterDesign('');
      setFilterDesignName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCust, smartSearch, summaryOrders]);

  const filteredOrders = filterSummaryOrders(summaryOrders, filterCust, filterDesign, smartSearch);
  const uniqueSOCount = new Set(filteredOrders.map(orderKey)).size;
  const totalM = filteredOrders.reduce((sum, order) => sum + num(order.__qty), 0);
  const groupedRows = groupSummary(filteredOrders, groupMode);
  const groupCountLabel = groupMode === 'design' ? `${groupedRows.length} designs` : `${groupedRows.length} customers`;

  const renderShadeRows = (lines: Row[]) => (
    <View style={s.shadeTable}>
      <View style={s.shadeHead}>
        <Text style={s.shadeHeadText}>SHADE / COLOUR</Text>
        <Text style={s.shadeHeadText}>ORDER QTY (M)</Text>
      </View>
      {lines.map((line, index) => (
        <View key={`${line?.ShdCode || line?.ShdName || 'shade'}-${line?.DsnCode || ''}-${index}`} style={s.shadeRow}>
          <Swatch color={line?.ShdColor || '#B9B5AE'} size={18} radius={5} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.shadeName} numberOfLines={1}>
              {line?.ShdName || line?.ShadeName || '—'}
            </Text>
            {line?.ShdCode ? <Text style={ui.muted}>Code {line.ShdCode}</Text> : null}
          </View>
          <Text style={s.shadeQty}>{fmtIN(line?.Qty)} m</Text>
        </View>
      ))}
    </View>
  );

  const renderCustomerOrder = (order: SumOrder) => (
    <View style={{ gap: 10 }}>
      {designsOfOrder(order).map((design, index) => (
        <View key={`${design.DsnCode || design.DsnName}-${index}`} style={index > 0 ? s.dsnBlockBorder : undefined}>
          <View style={s.dsnHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.dsnName} numberOfLines={1}>
                {design.DsnName}
                {design.DsnCode ? <Text style={s.code}> · {design.DsnCode}</Text> : null}
              </Text>
              {design.ItmName ? <Text style={ui.muted}>{design.ItmName}</Text> : null}
            </View>
            <Text style={s.dsnQty}>{fmtIN(design.lines.reduce((sum, line) => sum + num(line?.Qty), 0))} m</Text>
          </View>
          {renderShadeRows(design.lines)}
        </View>
      ))}
    </View>
  );

  const renderGroup = (group: SumGroup) => {
    const open = expandedGroupKey === group.key;
    const so = `${group.soCount} ${group.soCount === 1 ? 'SO' : 'SOs'}`;
    const sh = `${group.shadeAgg.length} ${group.shadeAgg.length === 1 ? 'Shade' : 'Shades'}`;
    const metaText =
      group.mode === 'design'
        ? `${group.subtitle ? `${group.subtitle} · ` : ''}${so} · ${sh}`
        : `${so} · ${group.designCount} ${group.designCount === 1 ? 'Design' : 'Designs'} · ${sh}`;

    return (
      <View key={group.key} style={[ui.card, s.group]}>
        <TouchableOpacity
          style={[s.groupHead, open && s.groupHeadOpen]}
          activeOpacity={0.8}
          onPress={() => {
            setExpandedGroupKey((cur) => (cur === group.key ? '' : group.key));
            setExpandedOrderKey('');
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <Icon name={open ? 'expand-more' : 'chevron-right'} size={22} color={T.copper} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.groupTitle} numberOfLines={1}>
              {group.title}
              {group.code ? <Text style={s.code}> · {group.code}</Text> : null}
            </Text>
            <Text style={ui.muted} numberOfLines={1}>
              {metaText}
            </Text>
          </View>
          <Text style={s.groupQty}>{fmtIN(group.totalQty)} m</Text>
        </TouchableOpacity>

        {open ? (
          <View style={s.groupBody}>
            {group.orders.map((order, index) => {
              const soKey = `${group.key}:${orderKey(order)}`;
              const orderOpen = expandedOrderKey === soKey;
              const status = getStatusMeta(order);
              return (
                <View key={soKey} style={[s.so, index === group.orders.length - 1 && { borderBottomWidth: 0 }]}>
                  <TouchableOpacity style={s.soHead} activeOpacity={0.8} onPress={() => setExpandedOrderKey((cur) => (cur === soKey ? '' : soKey))}>
                    <View style={[s.dot, { backgroundColor: status.tone === 'green' ? T.green : T.amber }]} />
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <Text style={s.soNo} numberOfLines={1}>
                        SO {order.SONo || '—'}
                      </Text>
                      <Text style={ui.muted} numberOfLines={1}>
                        {order.SODate || '—'}
                        {group.mode === 'design' && order.ParName ? ` · ${order.ParName}` : ''}
                        {group.mode === 'customer' && order.BAccName ? ` · ${order.BAccName}` : ''}
                      </Text>
                      <Badge text={status.label} tone={status.tone} />
                    </View>
                    <Text style={s.soQty}>{fmtIN(order.__qty)} m</Text>
                    <Icon name={orderOpen ? 'expand-less' : 'expand-more'} size={20} color={T.muted} />
                  </TouchableOpacity>
                  {orderOpen ? (
                    <View style={{ paddingBottom: 12 }}>{group.mode === 'design' ? renderShadeRows(order.__lines) : renderCustomerOrder(order)}</View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(selMonth, true)} colors={[T.copper]} tintColor={T.copper} />}
      >
        <View style={[CONTENT, { gap: 12 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.months}>
            {MONTHS.map((mo) => {
              const active = selMonth.key === mo.key;
              return (
                <TouchableOpacity
                  key={mo.key}
                  onPress={() => setSelMonth(mo)}
                  style={[s.month, active && s.monthOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[s.monthText, active && { color: '#fff' }]}>{mo.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Segment
            value={groupMode}
            onChange={(v) => setGroupMode(v)}
            options={[
              { value: 'design', label: 'Design wise', icon: 'style' },
              { value: 'customer', label: 'Customer wise', icon: 'people-outline' },
            ]}
          />

          <SearchBox value={smartSearch} onChangeText={setSmartSearch} placeholder="Search party / design / shade / SO / item..." />

          <View style={s.filterRow}>
            <PickField value={filterCustName} placeholder="All customers" icon="person-outline" onPress={() => setPicker('cust')} style={{ flex: 1 }} />
            <PickField value={filterDesignName} placeholder="All designs" icon="style" onPress={() => setPicker('dsn')} style={{ flex: 1 }} />
          </View>

          <View style={s.head}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.headLabel}>MONTHLY {groupMode === 'design' ? 'DESIGN' : 'CUSTOMER'} · SO SUMMARY</Text>
              <Text style={s.headMonth}>{selMonth.label}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.headQty}>{fmtIN(totalM)} m</Text>
              <Text style={s.headMeta}>
                {groupCountLabel} · {uniqueSOCount} SOs
              </Text>
            </View>
          </View>

          <Text style={[ui.muted, { textAlign: 'center' }]}>
            Tap a {groupMode === 'design' ? 'design' : 'customer'} to view sales orders · tap an SO to view{' '}
            {groupMode === 'design' ? 'shades' : 'designs & shades'}
          </Text>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={T.copper} />
            </View>
          ) : null}

          {!loading ? groupedRows.map(renderGroup) : null}

          {!loading && groupedRows.length === 0 ? (
            <EmptyState icon="summarize" title="No matching sales orders" text="Try changing the month or clearing the current search/filter." />
          ) : null}
        </View>
      </ScrollView>

      <SearchPicker
        open={picker === 'cust'}
        title="Customer"
        rows={[
          { code: '', name: 'All Customers', meta: `${partyOptions.length} in this result` },
          ...partyOptions.map((item) => ({ ...item, meta: item.code ? `Code ${item.code}` : '' })),
        ]}
        keyField="code"
        labelField="name"
        subOf={(r) => r.meta || ''}
        selectedKey={filterCust}
        onPick={(item) => {
          setFilterCust(item.code || '');
          setFilterCustName(item.code ? item.name : '');
        }}
        onClose={() => setPicker(null)}
      />
      <SearchPicker
        open={picker === 'dsn'}
        title="Design"
        rows={[
          { code: '', name: 'All Designs', meta: `${designOptions.length} in this result` },
          ...designOptions.map((item) => ({
            ...item,
            meta: [item.code ? `Code ${item.code}` : '', item.itemName].filter(Boolean).join(' · '),
          })),
        ]}
        keyField="code"
        labelField="name"
        subOf={(r) => r.meta || ''}
        selectedKey={filterDesign}
        onPick={(item) => {
          setFilterDesign(item.code || '');
          setFilterDesignName(item.code ? item.name : '');
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32 },
  months: { gap: 8 },
  month: { paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  monthOn: { backgroundColor: T.nav, borderColor: T.nav },
  monthText: { fontSize: 13, fontWeight: '800', color: T.nav },
  filterRow: { flexDirection: 'row', gap: 10 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: T.nav },
  headLabel: { fontSize: 10.5, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.6 },
  headMonth: { fontSize: 18, fontWeight: '900', color: '#fff', marginTop: 4 },
  headQty: { fontSize: 18, fontWeight: '900', color: '#fff' },
  headMeta: { fontSize: 11.5, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  group: { overflow: 'hidden' },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  groupHeadOpen: { backgroundColor: `${T.copper}0D`, borderBottomWidth: 1, borderBottomColor: T.hair },
  groupTitle: { fontSize: 14.5, fontWeight: '900', color: T.ink },
  code: { fontSize: 12.5, fontWeight: '700', color: T.muted },
  groupQty: { fontSize: 14.5, fontWeight: '900', color: T.nav },
  groupBody: { paddingHorizontal: 14 },

  so: { borderBottomWidth: 1, borderBottomColor: T.hair },
  soHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  soNo: { fontSize: 13.5, fontWeight: '900', color: T.ink },
  soQty: { fontSize: 13.5, fontWeight: '900', color: T.nav },

  shadeTable: { borderRadius: 10, borderWidth: 1, borderColor: T.hair, overflow: 'hidden' },
  shadeHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 7, backgroundColor: T.sub },
  shadeHeadText: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
  shadeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.hair },
  shadeName: { fontSize: 13, fontWeight: '800', color: T.ink },
  shadeQty: { fontSize: 13, fontWeight: '800', color: T.nav },

  dsnBlockBorder: { borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 10 },
  dsnHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dsnName: { fontSize: 13.5, fontWeight: '900', color: T.ink },
  dsnQty: { fontSize: 13, fontWeight: '900', color: T.nav },
});
