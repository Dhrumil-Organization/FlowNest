import AppAlert from '@/common/utils/appAlert';
// StockScreen.tsx — Madhusudhan Fabrics (React Native)
// Yarn / Fabric / Flow tabs — mockup design wired to the real
// GET /api/appgreyinstockdata logic (dptcode 'PR' = greige split,
// item → design → sub-design → shade drill-down, sort, search).

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API } from '@/common/API/dynamicAPI';

// ── Helpers ───────────────────────────────────────────────────────
const num = (v: any) => {
  const n = Number(String(v ?? '0').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};
const fmtIN = (v: any) =>
  Math.round(num(v)).toLocaleString('en-IN');

// ₹7.88L / ₹96.5K style
const moneyShort = (v: any) => {
  const n = num(v);
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// Row value — the stock API mainly carries TOTQTY; if a rate/amount
// field exists it's picked up here. Adjust once field name confirmed.
const rowValue = (r: any) =>
  num(r.AMOUNT ?? r.AMT ?? r.VALUE ?? r.STOCKVALUE ??
    (r.RATE != null ? num(r.TOTQTY) * num(r.RATE) : 0));

// Short type badge from item name → "LIN", "COT", "L/C", "POL"
const typeBadge = (name = '') => {
  const n = name.toUpperCase();
  if (n.includes('L/C') || n.includes('LC ')) return 'L/C';
  if (n.includes('LIN')) return 'LIN';
  if (n.includes('COT')) return 'COT';
  if (n.includes('POLY') || n.includes('PCT')) return 'POL';
  return n.replace(/[^A-Z]/g, '').slice(0, 3) || '—';
};

const TABS = [
  { id: 'yarn', label: 'Yarn' },
  { id: 'fabric', label: 'Fabric' },
  { id: 'flow', label: 'Flow' },
];

// ── Generic grouping (ported from PurchaseOrderTracking) ─────────
// FABRIC rows: dptcode == 'PR' → greige; else → finished
const splitGreige = (rows: any[], greige: boolean) =>
  (rows || []).filter(r => greige ? r.dptcode == 'PR' : r.dptcode != 'PR');

// YARN rows have no dptcode — SHDNAME 'GREIGE' marks greige yarn,
// anything else is a dyed shade.
const isGreigeYarn = (r: any) =>
  String(r?.SHDNAME || '').trim().toUpperCase() === 'GREIGE';
const splitYarn = (rows: any[], greige: boolean) =>
  (rows || []).filter(r => greige ? isGreigeYarn(r) : !isGreigeYarn(r));

// Age in days from yarn's agecol timestamp (e.g. "2026-06-10 17:18:19.763")
const ageDaysOf = (r: any) => {
  if (!r?.agecol) return null;
  const t = new Date(String(r.agecol).replace(' ', 'T')).getTime();
  if (isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
};

// FRESH < 30d · NORMAL 30–90 · AGING 90–180 · OLD > 180 (oldest lot wins)
const ageBadge = (days: number | null) => {
  if (days == null) return null;
  if (days < 30) return { label: 'FRESH', bg: '#ECFDF3', fg: '#027A48' };
  if (days < 90) return { label: 'NORMAL', bg: '#EFF6FF', fg: '#1D4ED8' };
  if (days < 180) return { label: 'AGING', bg: '#FEF3C7', fg: '#92400E' };
  return { label: 'OLD', bg: '#FEE2E2', fg: '#B91C1C' };
};

const groupRows = (
  rows: any[], codeKey: string, nameKey: string,
  varKey?: string, qtyField: string = 'TOTQTY',
) => {
  const map: any = {};
  (rows || []).forEach(r => {
    const key = r[codeKey] ?? r[nameKey] ?? 'UNKNOWN';
    if (!map[key]) {
      map[key] = {
        code: r[codeKey],
        name: r[nameKey] || 'UNKNOWN',
        qty: 0,
        value: 0,
        vars: new Set(),
        maxAgeDays: null,
      };
    }
    map[key].qty += num(r[qtyField]);
    map[key].value += rowValue(r);
    if (varKey && r[varKey] != null) map[key].vars.add(r[varKey]);
    const age = ageDaysOf(r);
    if (age != null && (map[key].maxAgeDays == null || age > map[key].maxAgeDays)) {
      map[key].maxAgeDays = age;
    }
  });
  return Object.values(map).map((g: any) => ({
    ...g, varCount: g.vars.size,
  }));
};

const sortGroups = (groups: any[], order: 'asc' | 'desc') =>
  [...groups].sort((a, b) =>
    order === 'asc' ? a.qty - b.qty : b.qty - a.qty);

// ── Screen ────────────────────────────────────────────────────────
export default function StockScreen({ token }: any) {

  const [activeTab, setActiveTab] = useState('fabric');

  // raw API rows
  const [fabricRows, setFabricRows] = useState<any[]>([]);
  const [yarnRows, setYarnRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // sub-toggles
  const [fabricMode, setFabricMode] = useState<'greige' | 'finished'>('greige');
  const [yarnMode, setYarnMode] = useState<'greige' | 'dyed'>('greige');

  // search + sort
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // property selection
  const [prpList, setPrpList] = useState<any[]>([]);
  const [selectedPrps, setSelectedPrps] = useState<string[]>([]);
  const [showPrpPicker, setShowPrpPicker] = useState(false);

  // drill-down (fabric: design → sub-design → shade · yarn: item → shade/lot)
  const [drillDesign, setDrillDesign] = useState<any>(null);
  const [drillSubDesign, setDrillSubDesign] = useState<any>(null);
  const [drillYarnItem, setDrillYarnItem] = useState<any>(null);
  const [drillSearch, setDrillSearch] = useState('');
  const [drillSort, setDrillSort] = useState<'asc' | 'desc'>('desc');

  const authHdr = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-platform': 'mob',
  };

  // ── Load property codes, default select all ──
  const fetchPrpCodes = useCallback(async () => {
    try {
      // NOTE: 'mob_febric_stock' spelling is what the backend expects
      // for the prp fetch (matches working FabricStock.jsx)
      const res = await axios.get(`${API}/api/get_criterion`, {
        headers: authHdr,
        params: { prptype: 'S', txntype: 'mob_febric_stock', fetch: 'prp' },
      });
      console.log('get_criterion prp =>', res.data);
      const list = res.data?.response?.data || [];
      setPrpList(list);
      const codes = list.map((p: any) => p.PrpCode);
      setSelectedPrps(codes);
      return codes;
    } catch (e: any) {
      console.log('get_criterion err =>', e?.message);
      setPrpList([]);
      return [];
    }
  }, [token]);

  // ── Load stock data ──
  const loadStock = useCallback(async (codes: string[], isRefresh = false) => {
    if (!codes || codes.length === 0) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      // Headers exactly as in working FabricStock.jsx
      const stockHdr = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Requested-with': 'XMLHttpRequest',
      };

      // FABRIC — proven endpoint from FabricStock.jsx
      const payload = { prpcodes: codes, prptype: 'S', txntype: 'mob_fabric_stock' };
      console.log('appgreyinstockdata payload =>', payload);
      const fRes = await axios.get(`${API}/api/appgreyinstockdata`, {
        headers: stockHdr,
        params: payload,
      });
      console.log('appgreyinstockdata rows =>', fRes);
      if (fRes.data?.success === true) {
        setFabricRows(fRes.data?.response?.data || []);
      } else {
        setFabricRows([]);
        AppAlert.alert(`${fRes.data?.message || 'No stock data'}`);
      }

      // YARN — TODO: confirm the txntype for yarn stock with the ERP.
      // Same endpoint pattern assumed; fails silently to empty.
      try {
        const yRes = await axios.get(`${API}/api/appyarninstockdata`, {
          headers: stockHdr,
          params: { prpcodes: codes, prptype: 'S', txntype: 'mob_yarn_stock' },
        });
        console.log('appgreyinstockdata rows =>', yRes);
        setYarnRows(
          yRes.data?.success === true
            ? (yRes.data?.response?.data || [])
            : []
        );
      } catch { setYarnRows([]); }
    } catch (e: any) {
      console.log('appgreyinstockdata err =>', e?.message);
      AppAlert.alert('Server Error', e?.message || 'Could not load stock');
      setFabricRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Initial load — waits for token (it can arrive after first mount)
  useEffect(() => {
    if (!token) return;
    (async () => {
      const codes = await fetchPrpCodes();
      if (codes.length > 0) loadStock(codes);
    })();
  }, [token]);

  // ── Derived: active dataset ──
  const activeRows = activeTab === 'yarn' ? yarnRows : fabricRows;
  const greigeFlag = activeTab === 'yarn'
    ? yarnMode === 'greige'
    : fabricMode === 'greige';
  const unit = activeTab === 'yarn' ? '' : '';

  const modeRows = useMemo(
    () => activeTab === 'yarn'
      ? splitYarn(activeRows, greigeFlag)
      : splitGreige(activeRows, greigeFlag),
    [activeRows, greigeFlag, activeTab]
  );

  // Yarn list = by item (kg from QTY); Fabric list = by design (m from TOTQTY)
  const listGroups = useMemo(() => {
    const grouped = activeTab === 'yarn'
      ? groupRows(modeRows, 'ITMCODE', 'ITMNAME', 'SHDCODE', 'QTY')
      : groupRows(modeRows, 'MDSNCODE', 'MDSNNAME', 'SDSNCODE', 'TOTQTY');
    const sorted = sortGroups(grouped, sortOrder);
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((g: any) =>
      String(g.name).toLowerCase().includes(q) ||
      String(g.qty).includes(q));
  }, [modeRows, activeTab, sortOrder, search]);

  // ── Stats strip (over both modes of the active tab) ──
  // Yarn tab measures weight (QTY, kg); fabric measures metres (TOTQTY)
  const qtyField = activeTab === 'yarn' ? 'QTY' : 'TOTQTY';
  const allTabRows = activeRows;
  const totalValue = allTabRows.reduce((s, r) => s + rowValue(r), 0);
  const totalQty = allTabRows.reduce((s, r) => s + num(r[qtyField]), 0);
  const availQty = allTabRows.reduce((s, r) => s + Math.max(0, num(r[qtyField])), 0);
  const availValue = allTabRows.reduce(
    (s, r) => s + (num(r[qtyField]) > 0 ? rowValue(r) : 0), 0);
  const deadValue = allTabRows.reduce(
    (s, r) => s + (num(r[qtyField]) <= 0 ? rowValue(r) : 0), 0);
  const hasValue = totalValue > 0;

  // ── Flow tab numbers ──
  const flow = useMemo(() => {
    const fab = (g: boolean) =>
      splitGreige(fabricRows, g).reduce(
        (a, r) => ({ qty: a.qty + num(r.TOTQTY), val: a.val + rowValue(r) }),
        { qty: 0, val: 0 });
    const yrn = (g: boolean) =>
      splitYarn(yarnRows, g).reduce(
        (a, r) => ({ qty: a.qty + num(r.QTY), val: a.val + rowValue(r) }),
        { qty: 0, val: 0 });
    return [
      { label: 'Greige Yarn', tag: 'godown', 
        // unit: 'kg', 
        color: '#14532D', ...yrn(true) },
      { label: 'Dyed Yarn', tag: 'godown', 
        // unit: 'kg', 
        color: '#C2823A', ...yrn(false) },
      { label: 'Greige Fabric', tag: 'godown', 
        // unit: 'm', 
        color: '#1D4ED8', ...fab(true) },
      { label: 'Finished Fabric', tag: 'ready stock', 
        // unit: 'm', 
        color: '#7C3AED', ...fab(false) },
    ];
  }, [fabricRows, yarnRows]);
  const flowTotal = flow.reduce((s, f) => s + f.val, 0);
  const flowTotalQty = flow.reduce((s, f) => s + f.qty, 0);

  // ── Drill data (design → sub-design → shade) ──
  const subDesignGroups = useMemo(() => {
    if (!drillDesign) return [];
    const rows = splitGreige(activeRows, greigeFlag)
      .filter(r => r.MDSNCODE == drillDesign.code);
    let g = sortGroups(groupRows(rows, 'SDSNCODE', 'SDSNNAME'), drillSort);
    if (drillSearch.trim()) {
      const q = drillSearch.toLowerCase();
      g = g.filter((x: any) => String(x.name).toLowerCase().includes(q));
    }
    return g;
  }, [drillDesign, activeRows, greigeFlag, drillSort, drillSearch]);

  const shadeGroups = useMemo(() => {
    if (!drillDesign || !drillSubDesign) return [];
    const rows = splitGreige(activeRows, greigeFlag)
      .filter(r =>
        r.MDSNCODE == drillDesign.code &&
        r.SDSNCODE == drillSubDesign.code);
    let g = sortGroups(groupRows(rows, 'SHDCODE', 'SHDNAME'), drillSort);
    if (drillSearch.trim()) {
      const q = drillSearch.toLowerCase();
      g = g.filter((x: any) => String(x.name).toLowerCase().includes(q));
    }
    return g;
  }, [drillDesign, drillSubDesign, activeRows, greigeFlag, drillSort, drillSearch]);

  // Yarn drill: item → shade breakdown (dyed) or merchant lot (greige,
  // where every SHDNAME is 'GREIGE' so shades alone are uninformative)
  const yarnDrillGroups = useMemo(() => {
    if (!drillYarnItem) return [];
    const rows = splitYarn(yarnRows, yarnMode === 'greige')
      .filter(r => r.ITMCODE == drillYarnItem.code);
    const byShade = yarnMode !== 'greige';
    let g = sortGroups(
      byShade
        ? groupRows(rows, 'SHDCODE', 'SHDNAME', 'cartno', 'QTY')
        : groupRows(rows, 'MERCODE', 'MERNAME', 'cartno', 'QTY'),
      drillSort);
    if (drillSearch.trim()) {
      const q = drillSearch.toLowerCase();
      g = g.filter((x: any) => String(x.name).toLowerCase().includes(q));
    }
    return g;
  }, [drillYarnItem, yarnRows, yarnMode, drillSort, drillSearch]);

  // ── Renderers ──
  const renderStockRow = ({ item }: any) => {
    const badge = ageBadge(item.maxAgeDays);
    return (
      <TouchableOpacity
        style={S.row}
        activeOpacity={0.7}
        onPress={() => {
          setDrillSearch(''); setDrillSort('desc');
          if (activeTab === 'fabric') setDrillDesign(item);
          else setDrillYarnItem(item);
        }}
      >
        {activeTab === 'yarn' && (
          <View style={S.typeBadge}>
            <Text style={S.typeBadgeText}>{typeBadge(item.name)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={S.rowName}>{item.name}</Text>
          <Text style={S.rowSub}>
            {item.varCount > 0 ? `${item.varCount} var · ` : ''}
            <Text style={S.rowSubStrong}>{fmtIN(item.qty)}</Text> {unit}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', flexDirection: 'row', alignSelf: 'center', gap: 8 }}>
          <Text style={S.rowValue}>
            {hasValue ? moneyShort(item.value) : `${fmtIN(item.qty)} ${unit}`}
          </Text>
          {badge && (
            <View style={[S.ageBadge, { backgroundColor: badge.bg }]}>
              <Text style={[S.ageBadgeText, { color: badge.fg }]}>{badge.label}</Text>
            </View>
          )}
          <Text style={S.chev}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const StatStrip = () => (
    <View style={S.statStrip}>
      <View style={S.statCell}>
        <Text style={S.statLbl}>TOTAL VALUE</Text>
        <Text style={S.statVal}>
          {hasValue ? moneyShort(totalValue) : `${fmtIN(totalQty)} ${unit}`}
        </Text>
      </View>
      <View style={[S.statCell, S.statCellMid]}>
        <Text style={S.statLbl}>AVAILABLE</Text>
        <Text style={[S.statVal, { color: '#14532D' }]}>
          {hasValue ? moneyShort(availValue) : `${fmtIN(availQty)} ${unit}`}
        </Text>
      </View>
      <View style={S.statCell}>
        <Text style={S.statLbl}>DEAD STOCK</Text>
        <Text style={[S.statVal, { color: '#DC2626' }]}>
          {hasValue ? moneyShort(deadValue) : '0'}
        </Text>
      </View>
    </View>
  );

  const ModeToggle = ({ options, value, onChange, activeColor }: any) => (
    <View style={S.modeRow}>
      {options.map((o: any) => {
        const on = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[S.modePill, on && { backgroundColor: activeColor, borderColor: activeColor }]}
          >
            <Text style={[S.modePillText, on && { color: '#fff' }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
      {/* sort + search live on the same strip */}
      <View style={{ flex: 1 }} />
      <TouchableOpacity
        style={S.sortBtn}
        onPress={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}
      >
        <Text style={S.sortBtnText}>{sortOrder === 'asc' ? '▲' : '▼'} qty</Text>
      </TouchableOpacity>
    </View>
  );

  const SectionHead = ({ text }: any) => (
    <View style={S.sectionHead}>
      <Text style={S.sectionHeadText}>{text}</Text>
    </View>
  );

  // ── Drill modal (shared shell for sub-design + shade levels) ──
  const DrillList = ({ visible, title, subtitle, data, onClose, onRowPress }: any) => (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F1EC' }} edges={['top', 'bottom']}>
        <View style={S.drillHeader}>
          <TouchableOpacity onPress={onClose} style={{ width: 36 }}>
            <Text style={S.drillBack}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={S.drillTitle} numberOfLines={1}>{title}</Text>
            {!!subtitle && <Text style={S.drillSub} numberOfLines={1}>{subtitle}</Text>}
          </View>
          <TouchableOpacity
            style={S.sortBtnDark}
            onPress={() => setDrillSort(p => p === 'asc' ? 'desc' : 'asc')}
          >
            <Text style={{ color: '#fff', fontSize: 12 }}>
              {drillSort === 'asc' ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={S.drillSearchWrap}>
          <TextInput
            value={drillSearch}
            onChangeText={setDrillSearch}
            placeholder="Search..."
            placeholderTextColor="#9CA3AF"
            style={S.drillSearch}
          />
        </View>

        <FlatList
          data={data}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={S.row}
              activeOpacity={onRowPress ? 0.7 : 1}
              onPress={() => onRowPress && onRowPress(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={S.rowName}>{item.name}</Text>
                {item.varCount > 0 && (
                  <Text style={S.rowSub}>{item.varCount} var</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={S.rowValue}>{fmtIN(item.qty)} {unit}</Text>
                {onRowPress && <Text style={S.chev}>›</Text>}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: '#9ca3af' }}>No data</Text>
            </View>
          }
        />

        <View style={S.drillTotalBar}>
          <Text style={S.drillTotalLbl}>Total</Text>
          <Text style={S.drillTotalVal}>
            {fmtIN(data.reduce((s: number, x: any) => s + x.qty, 0))} {unit}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // ── Main render ──
  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      {/* dark header */}
      <View style={S.header}>
        <Text style={S.eyebrow}>MADHUSUDHAN FABRICS</Text>
        <View style={S.headerRow}>
          <Text style={S.headerTitle}>Stock</Text>
          <TouchableOpacity style={S.prpBtn} onPress={() => setShowPrpPicker(true)}>
            <Text style={S.prpBtnText}>
              {selectedPrps.length === prpList.length
                ? 'All properties'
                : `${selectedPrps.length} propert${selectedPrps.length === 1 ? 'y' : 'ies'}`} ▾
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* tab strip */}
      <View style={S.tabBar}>
        {TABS.map(t => {
          const on = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setActiveTab(t.id)}
              style={[S.tabBtn, on && S.tabBtnOn]}
            >
              <Text style={[S.tabText, on && S.tabTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#13879A" size="large" />
        </View>
      ) : activeTab === 'flow' ? (
        // ── FLOW TAB ──
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => loadStock(selectedPrps, true)} colors={['#13879A']} />
          }
        >
          <View style={S.flowHero}>
            <Text style={S.flowHeroLbl}>CONSOLIDATED STOCK VALUE</Text>
            <Text style={S.flowHeroVal}>
              {flowTotal > 0 ? moneyShort(flowTotal) : `${fmtIN(flowTotalQty)} units`}
            </Text>
          </View>
          <View style={{ padding: 0 }}>
            {flow.map((f, i) => (
              <View key={f.label}>
                <View style={S.flowRow}>
                  <View style={[S.flowBar, { backgroundColor: f.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={S.flowName}>
                      {f.label} <Text style={S.flowTag}>· {f.tag}</Text>
                    </Text>
                    <Text style={S.flowQty}>{fmtIN(f.qty)} {f.unit}</Text>
                  </View>
                  <Text style={S.flowVal}>
                    {f.val > 0 ? moneyShort(f.val) : '—'}
                  </Text>
                </View>
                {i < flow.length - 1 && (
                  <View style={S.flowArrowRow}>
                    <Text style={S.flowArrow}>↓</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        // ── YARN / FABRIC TAB ──
        <FlatList
          data={listGroups}
          keyExtractor={(_, i) => String(i)}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => loadStock(selectedPrps, true)} colors={['#13879A']} />
          }
          renderItem={renderStockRow}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListHeaderComponent={
            <>
              <StatStrip />
              <View style={{ paddingHorizontal: 14 }}>
                {activeTab === 'yarn' ? (
                  <ModeToggle
                    options={[
                      { key: 'greige', label: 'Greige Yarn' },
                      { key: 'dyed', label: 'Dyed Yarn' },
                    ]}
                    value={yarnMode}
                    onChange={setYarnMode}
                    activeColor="#13879A"
                  />
                ) : (
                  <ModeToggle
                    options={[
                      { key: 'greige', label: 'Greige' },
                      { key: 'finished', label: 'Finished' },
                    ]}
                    value={fabricMode}
                    onChange={setFabricMode}
                    activeColor="#13879A"
                  />
                )}
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search stock..."
                  placeholderTextColor="#000"
                  style={S.searchInput}
                />
              </View>
              <SectionHead
                text={
                  activeTab === 'yarn'
                    ? `${yarnMode === 'greige' ? 'GREIGE' : 'DYED'} YARN — BY YARN`
                    : `${fabricMode === 'greige' ? 'GREIGE' : 'FINISHED'} FABRIC — BY DESIGN`
                }
              />
            </>
          }
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: '#9ca3af' }}>
                {activeTab === 'yarn'
                  ? 'No yarn stock data (endpoint pending)'
                  : 'No stock data found'}
              </Text>
            </View>
          }
        />
      )}

      {/* Property picker */}
      <Modal visible={showPrpPicker} animationType="slide" transparent
        onRequestClose={() => setShowPrpPicker(false)}>
        <View style={S.sheetOverlay}>
          <View style={S.sheet}>
            <View style={S.sheetGrab} />
            <Text style={S.sheetTitle}>Properties</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {prpList.map((p: any) => {
                const on = selectedPrps.includes(p.PrpCode);
                return (
                  <TouchableOpacity
                    key={p.PrpCode}
                    style={S.prpRow}
                    onPress={() =>
                      setSelectedPrps(prev =>
                        on ? prev.filter(c => c !== p.PrpCode)
                          : [...prev, p.PrpCode])
                    }
                  >
                    <View style={[S.checkbox, on && S.checkboxOn]}>
                      {on && <Text style={S.checkTick}>✓</Text>}
                    </View>
                    <Text style={S.prpName}>{p.LngName || p.PrpName || p.PrpCode}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[S.loadBtn, selectedPrps.length === 0 && { opacity: 0.4 }]}
              disabled={selectedPrps.length === 0}
              onPress={() => { setShowPrpPicker(false); loadStock(selectedPrps); }}
            >
              <Text style={S.loadBtnText}>Load stock</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Drill level 1: design → sub-designs */}
      <DrillList
        visible={!!drillDesign && !drillSubDesign}
        title={drillDesign?.name || ''}
        subtitle="Sub designs"
        data={subDesignGroups}
        onClose={() => { setDrillDesign(null); setDrillSearch(''); }}
        onRowPress={(item: any) => { setDrillSearch(''); setDrillSubDesign(item); }}
      />

      {/* Drill level 2: sub-design → shades */}
      <DrillList
        visible={!!drillSubDesign}
        title={drillSubDesign?.name || ''}
        subtitle={`${drillDesign?.name || ''} · shades`}
        data={shadeGroups}
        onClose={() => { setDrillSubDesign(null); setDrillSearch(''); }}
        onRowPress={null}
      />

      {/* Yarn drill: item → shades (dyed) / lots (greige) */}
      <DrillList
        visible={!!drillYarnItem}
        title={drillYarnItem?.name || ''}
        subtitle={yarnMode === 'greige' ? 'Lots' : 'Shades'}
        data={yarnDrillGroups}
        onClose={() => { setDrillYarnItem(null); setDrillSearch(''); }}
        onRowPress={null}
      />
    </SafeAreaView>
  );
}

// ── Styles (mockup palette) ───────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    backgroundColor: '#13879A', paddingHorizontal: 16,
    paddingTop: 6, paddingBottom: 12,
  },
  eyebrow: { fontSize: 10, color: '#fff', letterSpacing: 1.2, marginBottom: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  prpBtn: {
    backgroundColor: 'rgba(255,255,255,.08)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  prpBtnText: { color: '#fff', fontSize: 12 },

  tabBar: { flexDirection: 'row', backgroundColor: '#13879A' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnOn: {
    backgroundColor: '#F4F1EC',
    borderTopLeftRadius: 10, borderTopRightRadius: 10,
    borderBottomWidth: 2, borderBottomColor: '#13879A',
  },
  tabText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  tabTextOn: { color: '#000', fontWeight: '700' },

  // stats strip
  statStrip: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 12,
  },
  statCell: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  statCellMid: {
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F3F4F6',
  },
  statLbl: { fontSize: 9, color: '#000', letterSpacing: 0.8, fontWeight: '700' },
  statVal: {
    fontSize: 15, fontWeight: '800', color: '#000', marginTop: 4,
    fontFamily: MONO,
  },

  // mode pills + sort
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  modePill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  modePillText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  sortBtn: {
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  sortBtnText: { fontSize: 11, color: '#374151', fontWeight: '600' },
  sortBtnDark: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,.12)',
  },

  searchInput: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: '#111827', marginBottom: 12,
  },

  sectionHead: {
    backgroundColor: '#EFE9E0', paddingVertical: 7, paddingHorizontal: 16,
  },
  sectionHeadText: {
    fontSize: 9, color: '#9A8F80', letterSpacing: 1, fontWeight: '700',
  },

  // stock rows
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  typeBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 4, minWidth: 38, alignItems: 'center',
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: '#6B7280', fontFamily: MONO },
  ageBadge: {
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5,
    alignSelf: 'center',
  },
  ageBadgeText: { fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  rowName: { fontSize: 15, fontWeight: '700', color: '#000' },
  rowSub: { fontSize: 11, color: '#000', marginTop: 3 },
  rowSubStrong: { fontWeight: '700', color: '#000' },
  rowValue: { fontSize: 14, fontWeight: '800', color: '#000', fontFamily: MONO },
  chev: { fontSize: 16, color: '#D1D5DB' },

  // flow tab
  flowHero: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8,
  },
  flowHeroLbl: { fontSize: 9, color: '#000', letterSpacing: 1, fontWeight: '700' },
  flowHeroVal: {
    fontSize: 28, fontWeight: '800', color: '#000', marginTop: 6, fontFamily: MONO,
  },
  flowRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 16,
  },
  flowBar: { width: 5, height: 40, borderRadius: 3 },
  flowName: { fontSize: 15, fontWeight: '800', color: '#111827' },
  flowTag: { fontSize: 10, fontWeight: '600', color: '#C2823A' },
  flowQty: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 3, fontFamily: MONO },
  flowVal: { fontSize: 14, fontWeight: '800', color: '#111827', fontFamily: MONO },
  flowArrowRow: {
    backgroundColor: '#EFE9E0', paddingVertical: 4, alignItems: 'flex-start',
    paddingLeft: 18,
  },
  flowArrow: { color: '#9A8F80', fontSize: 12 },

  // property picker sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 18,
  },
  sheetGrab: {
    width: 44, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  prpRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center',
  },
  checkboxOn: { backgroundColor: '#13879A', borderColor: '#13879A' },
  checkTick: { color: '#fff', fontSize: 13, fontWeight: '700' },
  prpName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  loadBtn: {
    backgroundColor: '#13879A', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 14, marginBottom: 6,
  },
  loadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // drill modal
  drillHeader: {
    backgroundColor: '#16202E', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  drillBack: { color: '#fff', fontSize: 30, lineHeight: 34 },
  drillTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  drillSub: { color: '#8A97A6', fontSize: 11, marginTop: 1 },
  drillSearchWrap: { padding: 12, paddingBottom: 4 },
  drillSearch: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: '#111827',
  },
  drillTotalBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 56,
    backgroundColor: '#16202E', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 18,
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
  },
  drillTotalLbl: { color: '#8A97A6', fontWeight: '700', fontSize: 13 },
  drillTotalVal: { color: '#fff', fontWeight: '800', fontSize: 15, fontFamily: MONO },
});
