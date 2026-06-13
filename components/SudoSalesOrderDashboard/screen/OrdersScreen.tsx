// OrdersScreen.jsx — Madhusudhan Fabrics (React Native)
// Connects to real Sales Order API · GET /api/sosortbrowse

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Helpers ───────────────────────────────────────────────────────
const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDate = ymd => {
  if (!ymd || ymd.length < 8) return ymd || '-';
  return `${ymd.slice(6, 8)}-${ymd.slice(4, 6)}-${ymd.slice(0, 4)}`;
};

const money = v =>
  Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getSONo   = o => o.SONo || o.SO_No || o.OrderNo || '-';
const getSODate = o =>
  o.SODateDisplay || o.SODtDisplay || o.OrderDateDisplay ||
  fmtDate(o.SODate) || fmtDate(o.SODt) || '-';

// ── Skeleton ──────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={S.skeletonCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={S.skeletonIcon} />
        <View style={{ flex: 1 }}>
          <View style={[S.skeletonLine, { width: '70%', height: 14 }]} />
          <View style={[S.skeletonLine, { width: '45%', height: 11, marginTop: 7 }]} />
        </View>
      </View>
      <View style={[S.skeletonLine, { width: '85%', height: 14, marginTop: 16 }]} />
      <View style={[S.skeletonLine, { width: '100%', height: 32, marginTop: 12, borderRadius: 10 }]} />
    </View>
  );
}

// ── Order card ────────────────────────────────────────────────────
function OrderCard({ order }) {
  const isAuthorised = order.AuthStatus === 'Authorised';
  return (
    <View style={S.card}>
      <View style={S.cardHeader}>
        <View style={S.iconBox}>
          <Text style={S.iconText}>📄</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.soNo}>{getSONo(order)}</Text>
          <Text style={S.soDate}>SO Date: {getSODate(order)}</Text>
        </View>
        <View style={[S.badge, isAuthorised ? S.badgeGreen : S.badgeOrange]}>
          <Text style={[S.badgeText, isAuthorised ? S.badgeTextGreen : S.badgeTextOrange]}>
            {order.AuthStatus || 'Pending'}
          </Text>
        </View>
      </View>

      <View style={S.partyBlock}>
        <Text style={S.partyCode}>{order.ParCode || '-'}</Text>
        <Text style={S.partyName} numberOfLines={1}>{order.ParName || '-'}</Text>
      </View>

      <View style={S.divider} />

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={S.amtLabel}>Net Amount</Text>
        <Text style={S.amount}>₹ {money(order.NetAmt)}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function OrdersScreen({ token, apiBase }) {
  const BASE = apiBase || 'https://erp.sharpskillit.com/api';

  const [tab, setTab]           = useState('pending');
  const [search, setSearch]     = useState('');
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [yearOptions, setYearOptions]   = useState([]);
  const [fromDate, setFromDate] = useState(todayYmd());
  const [toDate, setToDate]     = useState(todayYmd());
  const searchTimer = useRef(null);

  // Build year list
  useEffect(() => {
    const y   = new Date().getFullYear();
    const arr = Array.from({ length: 5 }, (_, i) => `${y - i}-${y - i + 1}`);
    setYearOptions(arr);
    setSelectedYear(arr[0]);
  }, []);

  // Derive dates from FY
  useEffect(() => {
    if (!selectedYear) return;
    const [sy, ey] = selectedYear.split('-').map(Number);
    const today = new Date();
    const curFY = today.getMonth() >= 3
      ? `${today.getFullYear()}-${today.getFullYear() + 1}`
      : `${today.getFullYear() - 1}-${today.getFullYear()}`;
    const toD = selectedYear === curFY ? today : new Date(ey, 2, 31);
    const frD = new Date(sy, 3, 1);
    const fmt = d =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    setFromDate(fmt(frD));
    setToDate(fmt(toD));
  }, [selectedYear]);

  const loadOrders = useCallback(async (txt = '') => {
    if (!token || !fromDate || !toDate) return;
    try {
      setLoading(true);
      const yearno = selectedYear ? selectedYear.slice(-2) : '';
      const payload = {
        search:   txt,
        prpcode:  '',
        yearno,
        strcode:  '012',
        fromdate: fromDate,
        todate:   toDate,
        isauth:   tab === 'authorised' ? 1 : 0,
        strtype:  'g',
        txntype:  'sales_order',
        referrer: 'mob_dashboard',
        atype:    tab === 'authorised' ? 'm' : 'b',
      };
      const res = await axios.get(`${BASE}/sosortbrowse`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-platform': 'mob',
        },
        params: payload,
      });
      if (res.data?.success === true) {
        setOrders(res.data?.response?.data || []);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.log('Orders error:', err?.response?.data || err.message);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, tab, selectedYear, fromDate, toDate, BASE]);

  useEffect(() => {
    if (selectedYear && fromDate && toDate) loadOrders('');
  }, [tab, selectedYear, fromDate, toDate]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadOrders(search), 500);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders(search);
  };

  const filtered = orders.filter(o => {
    const s = search.toLowerCase();
    return (
      String(getSONo(o)).toLowerCase().includes(s) ||
      String(o.ParName || '').toLowerCase().includes(s) ||
      String(o.ParCode || '').toLowerCase().includes(s)
    );
  });

  const renderSkeleton = () => [1, 2, 3, 4].map(i => <SkeletonCard key={i} />);

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <View style={S.header}>
        <Text style={S.eyebrow}>MADHUSUDHAN FABRICS</Text>
        <Text style={S.title}>Sales Orders</Text>
        <Text style={S.sub}>Pending · Authorised orders</Text>
      </View>

      <View style={S.body}>
        {/* Tabs */}
        <View style={S.tabs}>
          {[{ id: 'pending', label: 'Pending' }, { id: 'authorised', label: 'Authorised' }].map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[S.tab, tab === t.id && S.tabActive]}
              activeOpacity={0.7}
            >
              <Text style={[S.tabText, tab === t.id && S.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={S.searchBox}>
          <Text style={S.searchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search order no, party name or code"
            placeholderTextColor="#98A2B3"
            style={S.searchInput}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: '#98A2B3', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {loading && orders.length === 0 ? (
          <View>{renderSkeleton()}</View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item, idx) => `${item.UId}_${idx}`}
            renderItem={({ item }) => <OrderCard order={item} />}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#13879A']} />}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={S.emptyBox}>
                <Text style={S.emptyIcon}>📋</Text>
                <Text style={S.emptyTitle}>No sales orders found</Text>
                <Text style={S.emptySub}>
                  {token ? 'Try adjusting the date range or search.' : 'Token not provided.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#f5f7fb' },
  header:       { backgroundColor: '#13879A', padding: 16, paddingBottom: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  eyebrow:      { fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 1, marginBottom: 3 },
  title:        { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
  sub:          { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  body:         { flex: 1, padding: 14 },
  tabs:         { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab:          { flex: 1, paddingVertical: 8, borderRadius: 22, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', alignItems: 'center' },
  tabActive:    { backgroundColor: '#13879A', borderColor: '#13879A' },
  tabText:      { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  tabTextActive:{ color: '#fff' },
  searchBox:    { height: 44, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E4E7EF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  searchIcon:   { fontSize: 18, color: '#667085' },
  searchInput:  { flex: 1, color: '#101828', fontSize: 13 },

  card:         { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E6ECF2', elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox:      { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E7F6F8', justifyContent: 'center', alignItems: 'center' },
  iconText:     { fontSize: 18 },
  soNo:         { fontSize: 15, fontWeight: '900', color: '#101828' },
  soDate:       { fontSize: 12, color: '#667085', fontWeight: '600', marginTop: 3 },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeGreen:   { backgroundColor: '#ECFDF3' },
  badgeOrange:  { backgroundColor: '#FFEDD5' },
  badgeText:    { fontSize: 11, fontWeight: '800' },
  badgeTextGreen: { color: '#027A48' },
  badgeTextOrange:{ color: '#C2410C' },
  partyBlock:   { marginTop: 12 },
  partyCode:    { fontSize: 12, color: '#667085', fontWeight: '700', marginBottom: 3 },
  partyName:    { fontSize: 14, fontWeight: '800', color: '#101828' },
  divider:      { height: 1, backgroundColor: '#EEF2F6', marginVertical: 12 },
  amtLabel:     { fontSize: 11, color: '#667085', fontWeight: '700' },
  amount:       { fontSize: 17, fontWeight: '900', color: '#16A34A', marginTop: 2 },

  emptyBox:     { marginTop: 60, backgroundColor: '#fff', borderRadius: 18, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EF' },
  emptyIcon:    { fontSize: 40, marginBottom: 12 },
  emptyTitle:   { fontSize: 16, fontWeight: '900', color: '#101828' },
  emptySub:     { fontSize: 12, color: '#667085', textAlign: 'center', marginTop: 6 },

  skeletonCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E6ECF2' },
  skeletonIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E5E7EB' },
  skeletonLine: { borderRadius: 8, backgroundColor: '#E5E7EB' },
});
