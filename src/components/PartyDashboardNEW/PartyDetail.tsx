// FILE: src/components/PartyDashboardNEW/PartyDetail.tsx
// In-component "detail" step of the Party Dashboard — port of legacy
// components/PartyDashboard/PartyDetailScreen.tsx (legacy route /(tabs)/PartyDetailScreen).
// Legacy received party / selectedProperty / selectedYear as route params; here they are props.
// Data: POST /api/get_report (see api.ts fetchPartyReport), loaded once on mount when a token exists.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { S, T } from '@/src/theme';
import { Chip, EmptyState } from '../erpUi';
import { fetchPartyReport, Row } from './api';
import {
  fullAddressOf, money, outstandingCalc, particularsOf, rateText, summaryMoney, TABS, voucherOf,
} from './model';

type Props = {
  token: string;
  API: string;
  party: Row | null;
  selectedProperty: any;
  selectedYear: string;
  onBack: () => void;
};

const STATUS_COLOR: Record<string, string> = { Paid: T.green, Partial: T.amber, Pending: T.red };

type Col = { key: string; label: string; w: number; right?: boolean; color?: string; bold?: boolean; get: (r: Row) => string };

/* Column sets = exactly the fields legacy showed on each card. */
const OUT_COLS: Col[] = [
  { key: 'd', label: 'Date', w: 100, get: (r) => String(r.TranDate ?? '') },
  { key: 'v', label: 'Voucher', w: 120, get: (r) => String(voucherOf(r)) },
  { key: 'p', label: 'Particulars', w: 220, get: (r) => String(particularsOf(r)) },
  { key: 'dr', label: 'Debit', w: 110, right: true, color: T.red, get: (r) => `₹${outstandingCalc(r).debit.toLocaleString()}` },
  { key: 'cr', label: 'Credit', w: 110, right: true, color: T.green, get: (r) => `₹${outstandingCalc(r).credit.toLocaleString()}` },
  { key: 'os', label: 'Outstanding', w: 120, right: true, color: T.red, bold: true, get: (r) => `₹${outstandingCalc(r).outstanding.toLocaleString()}` },
  { key: 'pd', label: 'Paid', w: 110, right: true, color: T.green, bold: true, get: (r) => `₹${outstandingCalc(r).paid.toLocaleString()}` },
  { key: 'st', label: 'Status', w: 90, get: (r) => outstandingCalc(r).status },
];
const LEDGER_COLS: Col[] = [
  { key: 'd', label: 'Date', w: 100, get: (r) => String(r.TranDate ?? '') },
  { key: 'v', label: 'Voucher', w: 120, get: (r) => String(voucherOf(r)) },
  { key: 'p', label: 'Particulars', w: 240, get: (r) => String(particularsOf(r)) },
  { key: 'dr', label: 'Debit', w: 120, right: true, color: T.red, get: (r) => `₹${money(r.DrAmt)}` },
  { key: 'cr', label: 'Credit', w: 120, right: true, color: T.green, get: (r) => `₹${money(r.CrAmt)}` },
  { key: 'b', label: 'Balance', w: 130, right: true, color: T.blue, bold: true, get: (r) => `₹${money(r.Balance)}` },
];
const RATE_COLS: Col[] = [
  { key: 'q', label: 'Quality', w: 240, get: (r) => String(r.Qltname || '-') },
  { key: 'g', label: 'Group', w: 200, get: (r) => String(r.QgName || '-') },
  { key: 'r', label: 'Rate', w: 120, right: true, color: T.blue, bold: true, get: (r) => rateText(r) },
];
const BILL_COLS: Col[] = [
  { key: 'v', label: 'Voucher', w: 200, get: (r) => String(r.VouNo ?? '') },
  { key: 'd', label: 'Date', w: 140, get: (r) => String(r.TranDate ?? '') },
  { key: 'a', label: 'Amount', w: 140, right: true, bold: true, get: (r) => `₹ ${r.DrAmt ?? ''}` },
];

/** Wide table inside a bordered card; scrolls horizontally when it does not fit. */
function DataTable({ cols, rows }: { cols: Col[]; rows: Row[] }) {
  const minW = cols.reduce((a, c) => a + c.w, 0);
  return (
    <View style={s.tableCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ minWidth: minW, flexGrow: 1 }}>
          <View style={[s.tr, s.trHead]}>
            {cols.map((c) => (
              <Text key={c.key} style={[s.th, { width: c.w, flexGrow: c.w }, c.right && s.right]} numberOfLines={1}>{c.label}</Text>
            ))}
          </View>
          {rows.map((r, i) => (
            <View key={i} style={[s.tr, i % 2 === 1 && { backgroundColor: T.sub }]}>
              {cols.map((c) => {
                const v = c.get(r);
                const color = c.key === 'st' ? STATUS_COLOR[v] || T.ink : c.color || T.ink;
                return (
                  <Text
                    key={c.key}
                    style={[s.td, { width: c.w, flexGrow: c.w, color }, c.right && s.right, (c.bold || c.key === 'st') && s.bold]}
                    numberOfLines={2}
                  >
                    {v}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const Amt = ({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) => (
  <View style={{ flexShrink: 1, minWidth: 0 }}>
    <Text style={s.lbl}>{label}</Text>
    <Text style={[s.amt, { color }, bold && s.bold]} numberOfLines={1}>{value}</Text>
  </View>
);

const Skel = ({ w, h = 12, mt = 0 }: { w: any; h?: number; mt?: number }) => (
  <View style={{ height: h, width: w, marginTop: mt, borderRadius: 6, backgroundColor: T.alt }} />
);

export default function PartyDetail({ token, API, party, selectedProperty, selectedYear, onBack }: Props) {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const gutter = isPhone ? 12 : 16;

  const [activeTab, setActiveTab] = useState(0);
  const [ledgerData, setLedgerData] = useState<Row[]>([]);
  const [outstandingData, setOutstandingData] = useState<Row[]>([]);
  const [rateData, setRateData] = useState<Row[]>([]);
  const [billingData, setBillingData] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchPartyReport(API, token, party, selectedProperty, selectedYear);
        if (alive && data) {
          setLedgerData(data.ledger);
          setOutstandingData(data.outstanding);
          setRateData(data.rate);
          setBillingData(data.billing);
          setSummary(data.summary);
        }
      } catch (e) {
        console.log('[PartyDashboardNEW] get_report error:', e);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void fetchData();
    return () => { alive = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fullAddress = fullAddressOf(party);
  const drCr = (type: any) => (type === 'Dr' ? T.red : T.green);

  /* ---------------- phone cards (same fields as legacy cards) ---------------- */
  const renderOutstandingCard = (item: Row, i: number) => {
    const c = outstandingCalc(item);
    const tone = STATUS_COLOR[c.status];
    return (
      <View key={i} style={s.rowCard}>
        <View style={s.between}>
          <Text style={s.date}>{item.TranDate}</Text>
          <View style={s.voucher}><Text style={s.voucherText} numberOfLines={1}>{voucherOf(item)}</Text></View>
        </View>
        <Text style={s.rowTitle}>{particularsOf(item)}</Text>
        <View style={[s.between, { marginTop: 10 }]}>
          <Amt label="Debit" value={`₹${c.debit.toLocaleString()}`} color={T.red} />
          <Amt label="Credit" value={`₹${c.credit.toLocaleString()}`} color={T.green} />
        </View>
        <View style={[s.between, { marginTop: 12 }]}>
          <Amt label="Outstanding" value={`₹${c.outstanding.toLocaleString()}`} color={T.red} bold />
          <Amt label="Paid" value={`₹${c.paid.toLocaleString()}`} color={T.green} bold />
          <View style={[s.status, { backgroundColor: `${tone}18`, borderColor: `${tone}40` }]}>
            <Text style={{ color: tone, fontWeight: '700', fontSize: 12 }}>{c.status}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderLedgerCard = (item: Row, i: number) => {
    const isCredit = item.credit > 0; // legacy expression kept as is
    return (
      <View key={i} style={[s.rowCard, s.leftBar, { borderLeftColor: isCredit ? T.green : T.red }]}>
        <View style={s.between}>
          <Text style={s.date}>{item.TranDate}</Text>
          <Text style={s.ref} numberOfLines={1}>{voucherOf(item)}</Text>
        </View>
        <Text style={s.rowTitle}>{particularsOf(item)}</Text>
        <View style={[s.between, { marginTop: 8 }]}>
          <Amt label="Debit" value={`₹${money(item.DrAmt)}`} color={T.red} />
          <Amt label="Credit" value={`₹${money(item.CrAmt)}`} color={T.green} />
          <Amt label="Balance" value={`₹${money(item.Balance)}`} color={T.blue} bold />
        </View>
      </View>
    );
  };

  const renderRateCard = (item: Row, i: number) => (
    <View key={i} style={[s.rowCard, s.leftBar, { borderLeftColor: T.blue }]}>
      <View style={s.between}>
        <Text style={[s.date, { flexShrink: 1 }]}>{item.Qltname || '-'}</Text>
        <Text style={s.ref}>{item.QgName || '-'}</Text>
      </View>
      <View style={[s.between, { marginTop: 8 }]}>
        <Amt label="Rate" value={rateText(item)} color={T.blue} bold />
      </View>
    </View>
  );

  const renderBillingCard = (item: Row, i: number) => (
    <View key={i} style={s.rowCard}>
      <Text style={s.rowTitle}>{item.VouNo}</Text>
      <Text style={s.date}>{item.TranDate}</Text>
      <Text style={[s.amt, s.bold, { color: T.ink }]}>₹ {item.DrAmt}</Text>
    </View>
  );

  const renderTab = () => {
    const sets: { rows: Row[]; cols: Col[]; card: (r: Row, i: number) => React.ReactNode }[] = [
      { rows: outstandingData, cols: OUT_COLS, card: renderOutstandingCard },
      { rows: ledgerData, cols: LEDGER_COLS, card: renderLedgerCard },
      { rows: rateData, cols: RATE_COLS, card: renderRateCard },
      { rows: billingData, cols: BILL_COLS, card: renderBillingCard },
    ];
    const cur = sets[activeTab];
    if (!cur?.rows?.length) return <EmptyState icon="inbox" title="No data found" />;
    if (isPhone) return <View style={{ gap: 10 }}>{cur.rows.map(cur.card)}</View>;
    return <DataTable cols={cur.cols} rows={cur.rows} />;
  };

  const SummaryBox = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <View style={s.sumBox}>
      <Text style={s.sumLabel} numberOfLines={1}>{label}</Text>
      <Text style={[s.sumValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* in-screen back row (legacy header: back + party name) */}
      <View style={s.backBar}>
        <View style={[s.backInner, { paddingHorizontal: gutter }]}>
          <TouchableOpacity onPress={onBack} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back to party list">
            <Icon name="arrow-back" size={20} color={T.nav} />
          </TouchableOpacity>
          <Text style={s.backTitle} numberOfLines={1}>{party?.accountname}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
        <View style={[s.content, { paddingHorizontal: gutter }]}>
          <View style={s.chips}>
            <Chip icon="business" label={String(selectedProperty?.LngName || selectedProperty?.PrpCode || 'Property')} style={{ maxWidth: width * 0.7 }} />
            <Chip icon="event" label={String(selectedYear || 'Year')} />
          </View>

          {/* PARTY + ACCOUNT SUMMARY */}
          {loading ? (
            <View style={s.card}>
              <View style={s.between}><Skel w={80} /><Skel w={60} h={20} /></View>
              <Skel w="60%" h={16} mt={10} />
              <Skel w="80%" mt={8} />
              <Skel w="40%" mt={8} />
              <View style={s.divider} />
              {[1, 2].map((r) => (
                <View key={r} style={s.sumRow}>
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={s.sumBox}><Skel w="70%" h={10} /><Skel w="80%" h={14} mt={4} /></View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View style={s.card}>
              <View style={s.between}>
                <Text style={s.code} numberOfLines={1}>{party?.acccode}</Text>
                <View style={s.active}><Text style={s.activeText}>Active</Text></View>
              </View>
              <Text style={s.name}>{party?.accountname}</Text>
              <View style={s.iconLine}>
                <Icon name="place" size={14} color={T.copper} />
                <Text style={s.sub}>{fullAddress || 'No address'}</Text>
              </View>
              <View style={s.iconLine}>
                <Icon name="call" size={14} color={T.copper} />
                <Text style={s.sub}>{party?.contel || '-'}</Text>
              </View>

              <View style={s.divider} />

              <View style={s.sumRow}>
                <SummaryBox label="Opening" value={summaryMoney(summary?.TotalOpening)} color={drCr(summary?.OpeningType)} />
                <SummaryBox label="Debit" value={summaryMoney(summary?.TotalDr)} color={T.red} />
                <SummaryBox label="Credit" value={summaryMoney(summary?.TotalCr)} color={T.green} />
              </View>
              <View style={[s.sumRow, { marginBottom: 0 }]}>
                <SummaryBox label="Outstanding" value={summaryMoney(summary?.NetOutstanding)} color={drCr(summary?.NetType)} />
                <SummaryBox label="Closing" value={summaryMoney(summary?.ClosingBalance)} color={drCr(summary?.ClosingType)} />
                <SummaryBox label="Status" value={summary?.Matched ? 'Matched' : 'Mismatch'} color={summary?.Matched ? T.green : T.red} />
              </View>
            </View>
          )}

          {/* TABS */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsWrap} contentContainerStyle={s.tabs}>
            {TABS.map((t, i) => {
              const on = activeTab === i;
              return (
                <TouchableOpacity
                  key={t}
                  style={[s.tab, on && s.tabOn]}
                  onPress={() => setActiveTab(i)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[s.tabText, on && s.tabTextOn]} numberOfLines={1}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* DATA */}
          {loading ? (
            <View style={{ gap: 10 }}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={s.rowCard}>
                  <Skel w="40%" /><Skel w="80%" h={14} mt={6} /><Skel w="60%" mt={6} />
                </View>
              ))}
            </View>
          ) : renderTab()}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  content: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
  backBar: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  backInner: { width: '100%', maxWidth: 1200, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  backTitle: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '700', color: T.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 16, ...S.card },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  code: { color: T.blue, fontWeight: '700', flexShrink: 1 },
  active: { backgroundColor: `${T.green}18`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  activeText: { color: T.green, fontSize: 12, fontWeight: '600' },
  name: { fontSize: 18, fontWeight: '700', color: T.ink, marginTop: 6 },
  iconLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 5 },
  sub: { flex: 1, minWidth: 0, color: T.muted, fontSize: 13, lineHeight: 17 },
  divider: { height: 1, backgroundColor: T.hair, marginVertical: 12 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sumBox: { width: '32%', minWidth: 0 },
  sumLabel: { fontSize: 11, color: T.muted },
  sumValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  tabsWrap: { marginTop: 14, marginBottom: 12, flexGrow: 0 },
  tabs: { flexGrow: 1, flexDirection: 'row', backgroundColor: T.alt, borderRadius: 12, padding: 4, gap: 4 },
  tab: { flexGrow: 1, minHeight: 40, paddingHorizontal: 14, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: T.surface, ...S.card },
  tabText: { color: T.muted, fontSize: 13, fontWeight: '600' },
  tabTextOn: { color: T.nav, fontWeight: '800' },
  rowCard: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14 },
  leftBar: { borderLeftWidth: 4 },
  date: { color: T.ink, fontSize: 13 },
  ref: { color: T.muted, fontSize: 13, flexShrink: 1 },
  rowTitle: { fontWeight: '600', color: T.ink, marginTop: 4 },
  lbl: { fontSize: 11, color: T.muted },
  amt: { fontSize: 14, marginTop: 1 },
  bold: { fontWeight: '700' },
  voucher: { backgroundColor: T.alt, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexShrink: 1 },
  voucherText: { fontSize: 11, color: T.muted },
  status: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tableCard: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.hair },
  trHead: { backgroundColor: T.alt, borderBottomColor: T.border },
  th: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 11, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  right: { textAlign: 'right' },
});
