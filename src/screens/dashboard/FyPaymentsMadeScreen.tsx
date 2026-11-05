import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput,
  TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePermission } from '@/src/core/permissions';
import { AmountDisplayModeControl, useDashboardAmountMode } from '@/src/components/dashboard/AmountDisplayModeControl';
import { api, formatAmount } from '@/src/screens/dashboard/employ/api/api';

type Month = { month: number; label: string; from_date: number; to_date: number; available: boolean; amount: number | null; payment_count: number | null; party_count: number | null };
type Party = { prpcode: string; party_code: string; party_name: string; amount: number; payment_count: number; latest_date: number };
type Report = { fy_label: string; fy_start_year: number; from_date: number; to_date: number; total: number; focused_total: number;
  payment_count: number; party_count: number; party_code: string; parties: Party[]; months: Month[]; reconciliation?: { matches: boolean; difference: number } };
type Payment = { payment_uid: string; payment_srno: number; prpcode: string; party_code: string; party_name: string; bill_head?: string;
  voucher_no: string; entry_date: number; amount: number; bill_count: number; allocated_amount: number;
  payment_method: string; reference: string; paid_date: number; clear_date: number; remark: string };
type Bill = { sub_srno: number; bill_no: string; bill_date: number; settled_amount: number; tds_amount: number;
  source_type: string; source_resolved: boolean };
type DetailReport = { from_date: number; to_date: number; total: number; party_count: number; payment_count: number;
  parties: Party[]; payments: Payment[]; bill_rows: Bill[]; selected_party?: Party | null };
type SelectedVoucher = { uid: string; srno: string; entryDate: string };
type YearData = { full: Report; stage: Report };
type YearState = { loading: boolean; data?: YearData; error?: string };
const COLORS = { navy: '#0D1D2C', brown: '#8D4A31', rust: '#A45F42', cream: '#F6F3F0', panel: '#FFF',
  line: '#E7DED6', faded: '#EEE9E5', text: '#151E2B', muted: '#9A8B81', green: '#2C7352', blue: '#355D91', grey: '#887D76' };
const NAMES = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const one = (v: unknown): string => String(Array.isArray(v) ? (v[0] ?? '') : (v ?? ''));
const toIso = (v: unknown): string => { const x = one(v).replace(/\D/g, ''); return /^\d{8}$/.test(x) ? `${x.slice(0, 4)}-${x.slice(4, 6)}-${x.slice(6, 8)}` : ''; };
const dateForParam = (v: unknown): string => {
  const str = one(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return toIso(str);
};
const fyStart = (date: string): number => Number(date.slice(0, 4)) - (Number(date.slice(5, 7)) < 4 ? 1 : 0);
const fyName = (y: number) => `FY ${String(y).slice(-2)}-${String(y + 1).slice(-2)}`;
const fyPeriod = (y: number) => `Apr ${y} – Mar ${y + 1}`;
const fmtIso = (y: number, m: number, day: number): string => `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const maxDay = (y: number, month: number) => new Date(y, month, 0).getDate();
const yearStageDate = (year: number, anchor: string) => {
  const m = Number(anchor.slice(5, 7));
  const d = Number(anchor.slice(8, 10));
  const actualY = year + (m < 4 ? 1 : 0);
  return fmtIso(actualY, m, Math.min(d, maxDay(actualY, m)));
};
const fullDate = (y: number, active: number, anchor: string) => y === active ? anchor : fmtIso(y + 1, 3, 31);
const n = (v: unknown): number => { const x = Number(v ?? 0); return Number.isFinite(x) ? x : 0; };
const moneyNumeral = (value: number): string => value >= 10000000 ? `${(value / 10000000).toFixed(2)} Cr` :
  value >= 100000 ? `${(value / 100000).toFixed(2)} L` : `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const pct = (value: number, old: number): number | null => old > 0 ? (value / old - 1) * 100 : null;
const signed = (p: number | null): string => p === null ? '—' : `${p > 0 ? '+' : ''}${p.toFixed(1)}%`;
const mon = (i: number) => NAMES[i] ?? '';
const monthlyAmounts = (r?: Report): (number | null)[] => Array.from({ length: 12 }, (_, i) => r?.months?.[i]?.available ? n(r.months[i].amount) : null);
const cumulative = (vals: (number | null)[]) => { let total = 0; return vals.map(v => v === null ? null : (total += n(v))); };
const initials = (s: string) => s.trim().split(/\s+/).slice(0, 2).map(t => t[0] || '').join('').toUpperCase();
const safeErr = (e: any) => e?.message || 'Payments Made FY data is unavailable';

export default function FyPaymentsMadeScreen() {
  const router = useRouter();
  // Standalone FY route: return to the calling dashboard or party detail.
  // A directly opened/bookmarked URL falls back to the dashboard.
  const closeFY = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/new' as any);
  };
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const { canAccess } = usePermission();
  const { mode, setMode } = useDashboardAmountMode();
  const money = useCallback((value: number) => formatAmount(value, mode), [mode]);
  const anchor = dateForParam(params.date) || new Date().toISOString().slice(0, 10);
  const activeYear = fyStart(anchor);
  const years = useMemo(() => [activeYear, activeYear - 1, activeYear - 2], [activeYear]);
  const prptype = one(params.prptype);
  const originalParty = one(params.party_code).trim();
  const [selectedYear, setSelectedYear] = useState(activeYear);
  const [partyCode, setPartyCode] = useState(originalParty);
  const [partyName, setPartyName] = useState('');
  const [search, setSearch] = useState('');
  const [yearsState, setYearsState] = useState<Record<number, YearState>>({});
  // Local drilldown is inside this standalone FY page. Never push a Reports-tab route.
  const [detail, setDetail] = useState<{ data: DetailReport | null; loading: boolean; error: string }>({ data: null, loading: false, error: '' });
  const [voucher, setVoucher] = useState<SelectedVoucher | null>(() => one(params.voucher_uid)
    ? { uid: one(params.voucher_uid), srno: one(params.voucher_srno), entryDate: dateForParam(params.day) } : null);
  const [shareNotice, setShareNotice] = useState('');
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [showAllPartyRows, setShowAllPartyRows] = useState(false);
  // Claude Artifact drilldown: Vendor > Bill Head > Mode > Payments > Voucher.
  // No separate report route is used for any of these stages.
  const [partyView, setPartyView] = useState<'bill_head' | 'mode' | 'payments'>('bill_head');
  const [chosenHead, setChosenHead] = useState('');
  const [chosenMode, setChosenMode] = useState('');
  const pageScroll = useRef<ScrollView>(null);
  const detailEpoch = useRef(0);
  const detailScope = useRef('');
  const canView = canAccess('dashboard') && canAccess('dashboard.payments_made_detail');
  // The Claude Artifact uses distinct stages within one standalone FY route.
  // Do not append lower stages beneath the FY comparison or push a Reports tab.
  const stage: 'overview' | 'month' | 'party' | 'voucher' = voucher && partyCode
    ? 'voucher' : partyCode ? 'party' : selectedMonth !== null ? 'month' : 'overview';
  useEffect(() => { pageScroll.current?.scrollTo({ y: 0, animated: false }); }, [stage, selectedYear]);
  const returnToOverview = () => {
    setVoucher(null); setPartyCode(''); setSelectedMonth(null); setSearch(''); setShowAllPartyRows(false); setPartyView('bill_head'); setChosenHead(''); setChosenMode('');
  };
  const backOneStage = () => {
    if (stage === 'voucher') { setVoucher(null); return; }
    if (stage === 'party') {
      if (partyView === 'payments') { setPartyView('mode'); setChosenMode(''); return; }
      if (partyView === 'mode' && chosenHead) { setPartyView('bill_head'); setChosenHead(''); return; }
      if (partyView === 'mode') { setPartyView('bill_head'); return; }
      setPartyCode(''); setVoucher(null); return;
    }
    if (stage === 'month') { setSelectedMonth(null); setSearch(''); return; }
    closeFY();
  };

  useEffect(() => { setSelectedYear(activeYear); }, [activeYear]);
  // Maintain the selected month and party when changing FY or navigating drill stages.
  useEffect(() => { setHoverMonth(null); setShareNotice(''); }, [selectedYear, partyCode, selectedMonth]);
  useEffect(() => {
    if (!canView || !prptype) return;
    let alive = true;
    setYearsState(Object.fromEntries(years.map(y => [y, { loading: true }])));
    const read = async (date: string): Promise<Report> => {
      const response = await api.getOwnerPaymentsMade({ prptype, date, level: 'fy' });
      if (!response?.success || !response?.data?.report) throw Error(response?.message || 'FY data unavailable');
      return response.data.report as Report;
    };
    years.forEach(async (y) => {
      try {
        const fullEnd = fullDate(y, activeYear, anchor);
        const stageEnd = yearStageDate(y, anchor);
        const full = await read(fullEnd);
        // Prior FY snapshot is truncated at the same calendar position as today's FY.
        const stage = y === activeYear || fullEnd === stageEnd ? full : await read(stageEnd);
        if (alive) setYearsState(prev => ({ ...prev, [y]: { loading: false, data: { full, stage } } }));
      } catch (e: any) {
        if (alive) setYearsState(prev => ({ ...prev, [y]: { loading: false, error: safeErr(e) } }));
      }
    });
    return () => { alive = false; };
  }, [canView, prptype, activeYear, anchor, years]);

  const current = yearsState[selectedYear]?.data?.full;
  // FY as-of dates are scoped to the database of the selected financial year.
  const fyAsOf = fullDate(selectedYear, activeYear, anchor);
  const selectedCalendarMonth = selectedMonth === null ? null : current?.months?.[selectedMonth];
  const fromDate = selectedMonth === null ? `${selectedYear}-04-01` : toIso(selectedCalendarMonth?.from_date ?? 0);
  const toDate = selectedMonth === null ? fyAsOf : toIso(Math.min(n(selectedCalendarMonth?.to_date), Number(fyAsOf.replace(/-/g, ''))));
  const validPeriod = !!current && !!fromDate && !!toDate && fromDate <= toDate && selectedCalendarMonth?.available !== false;
  const voucherInPeriod = !!voucher && !!voucher.entryDate && voucher.entryDate >= fromDate && voucher.entryDate <= toDate;
  const previousOne = yearsState[selectedYear - 1]?.data;
  const currentCount = (current?.months || []).filter(m => m.available).length;
  const chartSeries = useMemo(() => years.map(y => ({ year: y, values: monthlyAmounts(yearsState[y]?.data?.full) })), [years, yearsState]);
  const cumSeries = useMemo(() => chartSeries.map(s => ({ year: s.year, values: cumulative(s.values) })), [chartSeries]);
  const maxCum = Math.max(1, ...cumSeries.flatMap(s => s.values.filter((v): v is number => v !== null)));
  const currentStage = selectedYear === activeYear ? yearsState[selectedYear]?.data?.full : yearsState[selectedYear]?.data?.stage;
  const compareYear = selectedYear - 1;
  const compareStage = yearsState[compareYear]?.data?.stage;
  const atStageValue = n(currentStage?.total);
  const compareValue = n(compareStage?.total);
  const stageDelta = currentStage && compareStage ? pct(atStageValue, compareValue) : null;
  const average = current ? n(current.total) / Math.max(1, currentCount) : null;
  const bestMonth = current?.months?.filter(m => m.available).reduce<Month | null>((best, m) => !best || n(m.amount) > n(best.amount) ? m : best, null) ?? null;
  const avgPayment = current && current.payment_count > 0 ? n(current.total) / current.payment_count : null;
  const pace = currentCount > 0 && selectedYear === activeYear ? (n(current?.total) / currentCount * 12) : null;
  const prevFull = previousOne?.full.total ?? null;
  const amountDelta = current && compareStage ? atStageValue - compareValue : null;
  const monthSelected = hoverMonth ?? selectedMonth;
  const availableMonths = current?.months || [];
  const hoverData = monthSelected !== null ? availableMonths[monthSelected] : null;
  const narrow = width < 720;
  // Retrieve only the required period's party/voucher rows, without changing route.
  // Re-request bill allocations only after a user opens an individual voucher.
  useEffect(() => {
    const req = ++detailEpoch.current;
    if (!canView || !prptype || !validPeriod || (!partyCode && selectedMonth === null)) {
      setDetail({ data: null, loading: false, error: '' });
      return;
    }
    const scope = `${selectedYear}|${selectedMonth === null ? 'fy' : selectedMonth}|${partyCode}`;
    const reuse = detailScope.current === scope;
    detailScope.current = scope;
    setDetail(prev => ({ data: reuse ? prev.data : null, loading: true, error: '' }));
    const load = async () => {
      try {
        const result = await api.getOwnerPaymentsMade({
          prptype, date: fyAsOf, from_date: fromDate, to_date: toDate,
          level: voucherInPeriod ? 'voucher' : partyCode ? 'party' : 'report',
          ...(partyCode ? { party_code: partyCode } : {}),
          ...(voucherInPeriod && voucher ? { voucher_uid: voucher.uid, voucher_srno: voucher.srno } : {}),
        });
        if (!result?.success || !result?.data?.report) throw Error(result?.message || 'FY drilldown unavailable');
        if (req !== detailEpoch.current) return;
        const data = result.data.report as DetailReport;
        setDetail({ data, loading: false, error: '' });
        if (voucher && !voucher.entryDate) {
          const found = data.payments?.find(v => v.payment_uid === voucher.uid && String(v.payment_srno) === voucher.srno);
          if (found) setVoucher(prev => prev && !prev.entryDate ? { ...prev, entryDate: toIso(found.entry_date) } : prev);
        }
      } catch (e: any) {
        if (req === detailEpoch.current) setDetail({ data: null, loading: false, error: safeErr(e) });
      }
    };
    void load();
  }, [partyCode, selectedMonth, selectedYear, prptype, canView, validPeriod, fyAsOf, fromDate, toDate,
    voucher?.uid, voucher?.srno, voucher?.entryDate, voucherInPeriod]);

  const visibleParties = selectedMonth !== null ? (detail.data?.parties ?? []) : (current?.parties ?? []);
  const list = useMemo(() => {
    const text = search.trim().toLowerCase();
    return visibleParties.filter(p => !text || `${p.party_name} ${p.party_code} ${p.prpcode}`.toLowerCase().includes(text));
  }, [search, visibleParties]);
  const matching = current?.parties.find(p => p.party_code === partyCode);
  useEffect(() => { if (matching?.party_name) setPartyName(matching.party_name); }, [matching?.party_name]);

  const selectMonthInline = (i: number) => {
    // Month is the second FY drill stage. Stay in this screen for every level.
    if (!current?.months?.[i]?.available) return;
    setSelectedMonth(i);
    setPartyCode('');
    setVoucher(null);
    setPartyView('bill_head'); setChosenHead(''); setChosenMode('');
    setSearch('');
    setHoverMonth(null);
    setShowAllPartyRows(false);
  };
  const selectPartyInline = (p: Party) => {
    setPartyCode(p.party_code);
    setPartyName(p.party_name);
    setPartyView('bill_head'); setChosenHead(''); setChosenMode('');
    setSearch('');
    setVoucher(null);
    setShareNotice('');
  };
  const selectVoucherInline = (p: Payment) => {
    const alreadyOpen = voucher?.uid === p.payment_uid && voucher?.srno === String(p.payment_srno);
    setVoucher(alreadyOpen ? null : { uid: p.payment_uid, srno: String(p.payment_srno), entryDate: toIso(p.entry_date) });
    setShareNotice('');
  };
  const reportPayments = detail.data?.payments ?? [];
  // Bill-head classification must come from the ERP API, never guessed from a
  // supplier name. Until supplied, payments stay visibly Unclassified.
  const paymentHead = (p: Payment): string => (p.bill_head || '').trim() || 'Bill head not classified';
  const paymentMode = (p: Payment): string => (p.payment_method || '').trim() || 'Not specified';
  const matchingHeadPayments = reportPayments.filter(p => !chosenHead || paymentHead(p) === chosenHead);
  const matchingModePayments = matchingHeadPayments.filter(p => !chosenMode || paymentMode(p) === chosenMode);
  const headGroups = Array.from(matchingHeadPayments.reduce((groups, payment) => {
    const key = paymentHead(payment);
    const row = groups.get(key) || { name: key, amount: 0, payments: 0 };
    row.amount += n(payment.amount); row.payments += 1; groups.set(key, row); return groups;
  }, new Map<string, { name: string; amount: number; payments: number }>() ).values()).sort((a,b) => b.amount - a.amount);
  const modeGroups = Array.from(matchingHeadPayments.reduce((groups, payment) => {
    const key = paymentMode(payment);
    const row = groups.get(key) || { name: key, amount: 0, payments: 0 };
    row.amount += n(payment.amount); row.payments += 1; groups.set(key, row); return groups;
  }, new Map<string, { name: string; amount: number; payments: number }>() ).values()).sort((a,b) => b.amount - a.amount);
  const selectedPartyDetails = detail.data?.selected_party || matching;
  const selectedPartyTotal = n(selectedPartyDetails?.amount);
  const comparisonParty = yearsState[selectedYear - 1]?.data?.stage.parties.find(p => p.party_code === partyCode);
  const comparisonPartyTotal = n(comparisonParty?.amount);
  const comparePartyDelta = comparisonPartyTotal > 0 ? pct(selectedPartyTotal, comparisonPartyTotal) : null;
  const barMonthMax = Math.max(1, ...chartSeries.flatMap(x => x.values.filter((v): v is number => v !== null)));
  const topVendorMax = Math.max(1, ...(current?.parties || []).slice(0, 5).map(p => n(p.amount)));
  const topVendorPrev = yearsState[selectedYear - 1]?.data?.stage.parties || [];
  const seriesTint = (y: number) => y === selectedYear ? COLORS.brown : y === selectedYear - 1 ? '#88837F' : '#C4C0BB';
  const selectBarMonth = (y: number, i: number) => {
    if (yearsState[y]?.data?.full.months?.[i]?.available !== true) return;
    setSelectedYear(y); setSelectedMonth(i); setPartyCode(''); setVoucher(null); setSearch('');
    setChosenHead(''); setChosenMode(''); setPartyView('bill_head'); setHoverMonth(null);
  };
  const selectedPayment = reportPayments.find(p => p.payment_uid === voucher?.uid && String(p.payment_srno) === voucher?.srno);
  const copyText = async (value: string): Promise<boolean> => {
    try { await Clipboard.setStringAsync(value); return true; }
    catch {
      // Insecure local HTTP addresses may block the browser clipboard API.
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.prompt === 'function') {
        window.prompt('Select the text and press Ctrl+C:', value);
        return false;
      }
      return false;
    }
  };
  const sharePaymentAdvice = async () => {
    if (!selectedPayment) return;
    const v = selectedPayment;
    const text = `Payment advice\nParty: ${v.party_name}\nVoucher: ${v.voucher_no}\nDate: ${toIso(v.entry_date)}\nAmount: ₹${v.amount.toLocaleString('en-IN')}`
      + (v.reference ? `\nReference: ${v.reference}` : '')
      + (detail.data?.bill_rows ?? []).map(b => `\nBill ${b.bill_no || 'Unresolved'}: ₹${b.settled_amount.toLocaleString('en-IN')}`).join('');
    setShareNotice('');
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({ title: 'Payment advice', text });
          setShareNotice('Payment advice shared.');
          return;
        }
      } catch (e: any) { if (e?.name === 'AbortError') return; }
      const copied = await copyText(text);
      setShareNotice(copied ? 'Payment advice copied.' : 'Use the browser dialog to copy the payment advice.');
      return;
    }
    try { await Share.share({ message: text }); }
    catch { setShareNotice('Sharing is unavailable on this device.'); }
  };
  const copyVoucherNo = async () => {
    if (!selectedPayment) return;
    const copied = await copyText(selectedPayment.voucher_no);
    setShareNotice(copied ? 'Voucher number copied.' : 'Select the voucher number in the browser dialog and copy it.');
  };

  // Display month-filtered parties immediately below the inline drilldown;
  // keep the original FY overview ordering when no drilldown is selected.
  const partyPanelView = (
<View style={st.partyPanel}><View style={st.partyPanelTitle}><Text style={st.sectionEyebrow}>PARTIES · {fyName(selectedYear)}{selectedMonth !== null ? ' · ' + mon(selectedMonth) : ''}</Text><Text style={st.smallText}>{selectedMonth === null ? 'Select a party for its FY payments' : 'Showing parties paid in the selected month'}</Text></View>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search party or code…" style={st.search}/>
          <View>{(showAllPartyRows ? list : list.slice(0, 6)).map(p => <TouchableOpacity key={`${p.prpcode}-${p.party_code}`} style={[st.partyRow, partyCode === p.party_code && st.partyRowActive]} onPress={() => selectPartyInline(p)} accessibilityRole="button">
            <View style={st.avatar}><Text style={st.avatarText}>{initials(p.party_name)}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={st.partyRowTitle} numberOfLines={1}>{p.party_name || p.party_code}</Text><Text style={st.smallText}>{p.prpcode} · {p.payment_count} payments</Text></View>
            <Text style={st.partyRowMoney}>{money(n(p.amount))}</Text><Text style={st.brownLink}>›</Text>
          </TouchableOpacity>)}</View>
          {selectedMonth !== null && detail.loading && !partyCode ? <View style={st.wait}><ActivityIndicator color={COLORS.brown}/><Text style={st.smallText}>Loading {mon(selectedMonth)} parties…</Text></View> : null}
          {selectedMonth !== null && detail.error && !partyCode ? <Text style={st.detailError}>{detail.error}</Text> : null}
          {!detail.loading && !list.length && <Text style={st.smallText}>{selectedMonth !== null && selectedCalendarMonth?.available === false ? 'Month not reached in selected FY.' : 'No matching payment parties for this period.'}</Text>}
          {list.length > 6 && <TouchableOpacity onPress={() => setShowAllPartyRows(v => !v)} style={st.moreButton}><Text style={st.brownLink}>{showAllPartyRows ? 'Show fewer' : `View all ${list.length} parties`} ›</Text></TouchableOpacity>}
        </View>
  );

  if (!canView) return <View style={st.permission}><Text style={st.error}>Payments Made permission is required.</Text></View>;
  const busy = !current && yearsState[selectedYear]?.loading;

  return <View style={st.page}>
    <View style={st.topBar}>
      <TouchableOpacity style={st.back} onPress={backOneStage} accessibilityRole="button" accessibilityLabel={stage === 'overview' ? "Back to Payments Made" : "Back one FY drilldown stage"}>
        <Text style={st.backText}>‹</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={st.header}>💸 Payments Made</Text><Text style={st.headerSub}>{fyName(selectedYear)} · {partyCode ? `${partyName || matching?.party_name || partyCode}${chosenHead ? ' › ' + chosenHead : ''}${chosenMode ? ' › ' + chosenMode : ''}` : `${fyPeriod(selectedYear)} · through ${toIso(current?.to_date || 0) || '—'}`}</Text></View>
      <TouchableOpacity accessibilityRole="button" onPress={closeFY} style={st.close}><Text style={st.closeText}>×</Text></TouchableOpacity>
    </View>

    <ScrollView ref={pageScroll} style={{ flex: 1 }} contentContainerStyle={st.pageContent}>
    <View style={st.inner}>
      <View style={st.tabs}>{years.map((y) => <TouchableOpacity key={y} onPress={() => setSelectedYear(y)} style={[st.tab, y === selectedYear && st.tabSelected]} accessibilityRole="button">
        <Text style={[st.tabText, y === selectedYear && st.tabTextSelected]}>{fyName(y)}{y === activeYear ? ' · current' : ''}</Text>
      </TouchableOpacity>)}</View>
      {yearsState[selectedYear]?.error ? <TouchableOpacity style={st.errorBox} onPress={() => setSelectedYear(selectedYear)}><Text style={st.error}>{yearsState[selectedYear].error} · Retry by reopening FY</Text></TouchableOpacity> : null}
      {busy ? <View style={st.wait}><ActivityIndicator color={COLORS.brown}/><Text style={st.smallText}>Loading {fyName(selectedYear)}…</Text></View> : null}
      {current && <>
        {stage === 'overview' && <>
        <View style={st.hero}>
          <View style={[st.heroGrid, narrow && { flexDirection: 'column' }]}>
            <View style={st.heroLeft}><Text style={st.overline}>PAID · {fyName(selectedYear).toUpperCase()} · {selectedYear === activeYear ? 'TO DATE' : 'FULL YEAR'}</Text>
              <Text style={st.heroAmount}>{money(n(current.total))}</Text>
              <Text style={[st.heroChange, { color: stageDelta === null ? COLORS.muted : stageDelta >= 0 ? COLORS.green : '#B65F44' }]}>
                {stageDelta === null ? 'Prior-year stage comparison unavailable' : `${stageDelta >= 0 ? '▲' : '▼'} ${signed(stageDelta)}  ·  ${money(Math.abs(amountDelta ?? 0))} ${stageDelta >= 0 ? 'above' : 'below'} ${fyName(compareYear)} at this stage`}
              </Text>
              <Text style={st.heroDescription}>{pace === null ? 'Completed financial year' : `Pace ${money(pace)} for the full year (seasonal estimate)`}{prevFull !== null ? ` · ${fyName(compareYear)} closed at ${money(prevFull)}` : ''}</Text>
            </View>
            <View style={st.heroNotes}>
              <Text style={st.note}>• {stageDelta === null ? 'Prior-year comparison not available' : `${stageDelta >= 0 ? 'Ahead of' : 'Behind'} ${fyName(compareYear)} by ${money(Math.abs(amountDelta ?? 0))} at this stage (${signed(stageDelta)})`}</Text>
              <Text style={st.note}>• {pace === null || prevFull === null ? 'Full-year pace will appear when comparative data is available' : `On pace for ${money(pace)}${pace > prevFull ? `, ahead of ${fyName(compareYear)}` : ` vs ${fyName(compareYear)}`}`}</Text>
              <Text style={st.note}>• {yearsState[activeYear - 2]?.data && yearsState[activeYear - 1]?.data ? 'Compare earlier years using the cards below' : 'Earlier-year figures load independently from their FY databases'}</Text>
            </View>
          </View>
          <View style={[st.compareRow, narrow && { flexWrap: 'wrap' }]}>{years.slice().reverse().map(y => {
            const item = yearsState[y]?.data;
            const stage = selectedYear === activeYear ? item?.stage : item?.full;
            const d = stage && item ? (selectedYear === activeYear ? stage.total : item.full.total) : null;
            const isChosen = y === selectedYear;
            return <TouchableOpacity key={y} style={[st.compareBox, isChosen && st.compareActive]} onPress={() => setSelectedYear(y)} accessibilityRole="button">
              <Text style={[st.compareTitle, isChosen && st.white]}>{fyName(y)} · {selectedYear === activeYear ? 'at this stage' : 'full year'}</Text>
              <Text style={[st.compareAmount, isChosen && st.white]}>{d === null ? '—' : money(n(d))}</Text>
              <Text style={[st.compareMeta, isChosen && st.white]}>{item ? (y === activeYear ? 'to date' : 'historical FY') : 'Loading / unavailable'}</Text>
            </TouchableOpacity>;
          })}</View>
        </View>

        <View style={st.kpis}>
          <Kpi title="MONTHLY AVERAGE" value={average === null ? '—' : money(average)} sub={`${currentCount} months · ${fyName(selectedYear)}`} />
          <Kpi title="BEST MONTH" value={bestMonth ? money(n(bestMonth.amount)) : '—'} sub={bestMonth?.label ? `${bestMonth.label} · ${fyName(selectedYear)}` : 'No payments available'} />
          <Kpi title="PAYMENTS" value={current.payment_count.toLocaleString('en-IN')} sub="Recorded party payment rows" />
          <Kpi title="AVG DAYS TO PAY" value="—" sub="Bill-to-payment dates not verified" />
          <Kpi title="AVG PAYMENT" value={avgPayment === null ? '—' : money(avgPayment)} sub={`${current.payment_count.toLocaleString('en-IN')} payment rows`} />
          <Kpi title="PAID VS BILLS BOOKED" value="—" sub="Billing denominator not supplied" />
        </View>

        <View style={st.chartTitle}><Text style={st.sectionEyebrow}>CUMULATIVE · THE CHASE</Text><Text style={st.tiny}>dashed line = selected FY stage</Text></View>
        <View style={st.chartCard}>
          <View style={st.svgContainer}>
            <Svg width="100%" height={186} viewBox="0 0 680 186" preserveAspectRatio="none">
              {[0, 1, 2, 3, 4].map(i => <Line key={`g${i}`} x1={12} y1={16 + 32 * i} x2={666} y2={16 + 32 * i} stroke="#F3EEEA" strokeWidth={1}/>)}
              {cumSeries.map(({ year, values }) => {
                const coords: string[] = [];
                values.forEach((v, i) => { if (v !== null) coords.push(`${13 + i * 59},${153 - v / maxCum * 128}`); });
                return coords.length < 2 ? null : <Polyline key={year} points={coords.join(' ')} fill="none"
                  stroke={year === activeYear ? COLORS.brown : year === activeYear - 1 ? COLORS.grey : '#C7BAB0'} strokeWidth={year === activeYear ? 2.6 : 1.9}/>;
              })}
              {cumSeries.map(({ year, values }) => values.map((v, i) => v !== null && year === activeYear && i <= 11 ? <Circle key={`${year}-${i}`} cx={13 + i * 59} cy={153 - v / maxCum * 128} r={i === 0 || i === values.map(z => z !== null).lastIndexOf(true) ? 3.4 : 2.2} fill={COLORS.brown}/> : null))}
              {selectedYear === activeYear && <Line x1={13 + Math.max(0, currentCount - 1) * 59} y1={8} x2={13 + Math.max(0, currentCount - 1) * 59} y2={160} stroke={COLORS.grey} strokeDasharray="3 4" strokeWidth={1.4}/>}
              {monthSelected !== null && <Line x1={13 + monthSelected * 59} x2={13 + monthSelected * 59} y1={10} y2={158} stroke="#B9A79C" strokeDasharray="3 3" strokeWidth={1.2}/>}
            </Svg>
            <View pointerEvents="box-none" style={st.overlay}>{NAMES.map((label, i) => <Pressable key={label} onHoverIn={() => setHoverMonth(i)} onHoverOut={() => setHoverMonth(null)} onPress={() => selectMonthInline(i)} accessibilityRole="button" accessibilityLabel={`${label}: ${current?.months?.[i]?.available ? money(n(current?.months?.[i]?.amount)) : 'future month'}`} style={st.overlaySlot}/>)}</View>
          </View>
          <View style={st.monthLabels}>{NAMES.map((label, i) => <TouchableOpacity key={label} onPress={() => selectMonthInline(i)} style={st.monthLabelSlot} accessibilityRole="button"><Text style={[st.monthLabel, monthSelected === i && { color: COLORS.brown, fontWeight: '900' }]}>{label}</Text></TouchableOpacity>)}</View>
          <View style={st.chartLegend}>{years.map(y => <View key={y} style={st.legendItem}><View style={[st.legendLine, { backgroundColor: y === activeYear ? COLORS.brown : y === activeYear - 1 ? COLORS.grey : '#C7BAB0' }]}/><Text style={st.legendText}>{fyName(y)} · {money(n(yearsState[y]?.data?.full.total))}</Text></View>)}</View>
          {monthSelected !== null && <View style={st.hoverPanel}><Text style={st.hoverTitle}>{mon(monthSelected)} · {fyName(selectedYear)} · {money(n(current?.months?.[monthSelected]?.amount))}</Text>
            <Text style={st.tiny}>{current?.months?.[monthSelected]?.available ? `${current.months[monthSelected].payment_count || 0} payment rows · ${current.months[monthSelected].party_count || 0} parties` : 'Future month · unavailable'}</Text>
            {current?.months?.[monthSelected]?.available && <TouchableOpacity onPress={() => selectMonthInline(monthSelected)}><Text style={st.brownLink}>Open monthly parties ›</Text></TouchableOpacity>}
          </View>}
          <Text style={st.chartFoot}>{selectedYear === activeYear ? `${fyPeriod(activeYear)} · through ${anchor}` : `${fyPeriod(selectedYear)} · complete FY`} · Tap any month to explore parties and vouchers here</Text>
        </View>

        </>}

        {/* FY overview uses the EXACT visual sequence from the Claude Artifact:
            cumulative chase > 3-year month bars > top vendors. */}
        {stage === 'overview' && <>
          <View style={st.chartTitle}><Text style={st.sectionEyebrow}>MONTH BY MONTH · THREE YEARS</Text><Text style={st.tiny}>tap a month</Text></View>
          <View style={st.chartCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={narrow} contentContainerStyle={st.comparisonBarsScroll}>
              {NAMES.map((label, i) => (
                <View key={`${selectedYear}-${label}`} style={st.comparisonMonth}>
                  <View style={st.comparisonBars}>
                    {years.slice().reverse().map(y => {
                      const m = yearsState[y]?.data?.full.months?.[i];
                      const amount = m?.available ? n(m.amount) : null;
                      return <Pressable key={`${y}-${i}`} disabled={amount === null}
                        onHoverIn={() => setHoverMonth(i)} onHoverOut={() => setHoverMonth(null)}
                        onPress={() => selectBarMonth(y, i)} accessibilityRole="button"
                        accessibilityLabel={`${fyName(y)} ${label}: ${amount === null ? 'not reached' : money(amount)}`}
                        style={[st.bar, { backgroundColor: amount === null ? 'transparent' : seriesTint(y),
                          height: amount === null ? 0 : Math.max(2, Math.round(amount / barMonthMax * 122)) }]} />;
                    })}
                  </View>
                  <Pressable onPress={() => selectMonthInline(i)} disabled={!current.months?.[i]?.available}
                    style={st.comparisonBarLabel} accessibilityRole="button"><Text style={st.monthLabel}>{label}</Text></Pressable>
                </View>
              ))}
            </ScrollView>
            <View style={st.monthPills}>{NAMES.map((label, i) => <TouchableOpacity key={`p${i}`} accessibilityRole="button"
              disabled={!current.months?.[i]?.available} onPress={() => selectMonthInline(i)}
              style={[st.monthPill, !current.months?.[i]?.available && st.monthPillDisabled]}>
              <Text style={[st.monthPillText, !current.months?.[i]?.available && st.monthPillTextDisabled]}>{label}</Text>
            </TouchableOpacity>)}</View>
            {hoverMonth !== null && <View style={st.hoverPanel}>
              <Text style={st.hoverTitle}>{mon(hoverMonth)} · Three-year comparison</Text>
              {years.map(y => { const m = yearsState[y]?.data?.full.months?.[hoverMonth]; return <Text key={y} style={st.tiny}>{fyName(y)}: {m?.available ? `${money(n(m.amount))} · ${m.payment_count || 0} payments` : 'not reached'}</Text>; })}
              {current.months?.[hoverMonth]?.available && <TouchableOpacity accessibilityRole="button" onPress={() => selectMonthInline(hoverMonth)}><Text style={st.brownLink}>Open {mon(hoverMonth)} ›</Text></TouchableOpacity>}
            </View>}
          </View>
          <View style={st.chartTitle}><Text style={st.sectionEyebrow}>TOP VENDORS · {fyName(selectedYear).toUpperCase()} TO DATE</Text>
            <Text style={st.tiny}>grey = {fyName(selectedYear - 1)} at this stage</Text></View>
          <View style={st.topVendorsPanel}>
            {(current.parties || []).slice(0, 5).map((p, i) => {
              const prev = topVendorPrev.find(x => x.party_code === p.party_code);
              const old = n(prev?.amount);
              const change = old > 0 ? pct(n(p.amount), old) : null;
              return <TouchableOpacity key={`${p.prpcode}-${p.party_code}`} accessibilityRole="button" onPress={() => selectPartyInline(p)} style={st.topVendorRow}>
                <Text style={st.vendorRank}>{i + 1}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.vendorName} numberOfLines={1}>{p.party_name || p.party_code}</Text>
                  <View style={st.vendorTrack}><View style={[st.vendorBar, { width: `${Math.max(1,n(p.amount)/topVendorMax*100)}%`, backgroundColor: COLORS.brown }]} /></View>
                  <View style={st.vendorTrack}><View style={[st.vendorBar, { width: `${Math.min(100, old/topVendorMax*100)}%`, backgroundColor: '#AAA49D' }]} /></View>
                </View>
                <View style={st.vendorNumbers}><Text style={st.vendorAmount}>{money(n(p.amount))}</Text>
                  <Text style={st.vendorSub}>{current.total ? (n(p.amount)/n(current.total)*100).toFixed(0) : 0}% {change === null ? '· no prior match' : `· ${signed(change)} vs prior`}</Text>
                </View>
              </TouchableOpacity>;
            })}
            {!(current.parties || []).length && <Text style={st.smallText}>No payment parties recorded for this FY.</Text>}
            <TouchableOpacity onPress={() => setShowAllPartyRows(v => !v)} style={st.vendorFooter} accessibilityRole="button"><Text style={st.vendorFooterLink}>{showAllPartyRows ? 'Hide full breakdown' : 'Full breakdown · Vendor · Bill head · Mode ›'}</Text></TouchableOpacity>
          </View>
          {showAllPartyRows && partyPanelView}
        </>}

        {/* Stage 2: a MONTH, showing its total and only that month's parties. */}
        {stage === 'month' && <>
          <View style={st.drillMonthBanner}>
            <View style={{ flex: 1 }}>
              <Text style={st.overline}>MONTHLY PAYMENTS · {fyName(selectedYear)}</Text>
              <Text style={st.drillTitle}>{mon(selectedMonth!)} {selectedYear + (selectedMonth! >= 9 ? 1 : 0)}</Text>
              <Text style={st.smallText}>{selectedCalendarMonth?.available ? `${selectedCalendarMonth.payment_count || 0} payments · ${selectedCalendarMonth.party_count || 0} parties` : 'Month not yet reached'}</Text>
            </View>
            <Text style={st.drillMonthTotal}>{selectedCalendarMonth?.available ? money(n(selectedCalendarMonth.amount)) : '—'}</Text>
          </View>
          {partyPanelView}
        </>}

        {/* Claude Artifact vendor flow: Bill Head → Mode → payments. No other
            party/overview sections remain visible while a vendor is selected. */}
        {stage === 'party' && <View style={st.artifactPartyCard}>
          <View style={st.artifactPartyHeader}>
            <Text style={st.artifactPartyHeaderText} numberOfLines={1}>{fyName(selectedYear)} › {partyName || matching?.party_name || partyCode}
              {chosenHead ? ` › ${chosenHead}` : ''}{chosenMode ? ` › ${chosenMode}` : ''}</Text>
            <Text style={st.artifactPartyHeaderText}>{money(selectedPartyTotal)} · {detail.data?.selected_party?.payment_count ?? 0} payments</Text>
          </View>
          <View style={st.artifactPartyBody}>
            <ScrollView horizontal contentContainerStyle={st.partyMonthScroller} showsHorizontalScrollIndicator={false}>
              {NAMES.map((label, i) => <TouchableOpacity key={label} accessibilityRole="button"
                onPress={() => { setSelectedMonth(selectedMonth === i ? null : i); setVoucher(null); setChosenHead(''); setChosenMode(''); setPartyView('bill_head'); }}
                disabled={!current.months?.[i]?.available} style={[st.monthPill, selectedMonth === i && st.monthPillSelected,
                  !current.months?.[i]?.available && st.monthPillDisabled]}>
                <Text style={[st.monthPillText, selectedMonth === i && st.monthPillSelectedText,
                  !current.months?.[i]?.available && st.monthPillTextDisabled]}>{label}</Text></TouchableOpacity>) }
            </ScrollView>
            {comparisonPartyTotal > 0 && <Text style={st.partyCompare}>vs {fyName(selectedYear - 1)} at this stage: <Text style={st.bold}>{money(comparisonPartyTotal)}</Text>
              <Text style={{color: (comparePartyDelta ?? 0) >= 0 ? COLORS.green : '#AD563F'}}> {signed(comparePartyDelta)}</Text></Text>}
            {detail.loading && <View style={st.wait}><ActivityIndicator color={COLORS.brown}/><Text style={st.smallText}>Loading payments…</Text></View>}
            {detail.error ? <Text style={st.detailError}>{detail.error}</Text> : null}
            {!detail.loading && !detail.error && <>
              {partyView !== 'payments' && <View style={st.byFilter}>
                <Text style={st.smallText}>BY</Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => { setPartyView('bill_head'); setChosenHead(''); setChosenMode(''); }}
                  style={[st.byChip, partyView === 'bill_head' && st.byChipActive]}><Text style={[st.byChipText, partyView === 'bill_head' && st.white]}>Bill head</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={() => { setPartyView('mode'); setChosenHead(''); setChosenMode(''); }}
                  style={[st.byChip, partyView === 'mode' && st.byChipActive]}><Text style={[st.byChipText, partyView === 'mode' && st.white]}>Mode</Text></TouchableOpacity>
              </View>}
              {partyView === 'bill_head' && <>
                <View style={st.artifactTableHeader}><Text style={st.tableColMain}>BILL HEAD</Text><Text style={st.tableColOther}>PAYMENTS</Text><Text style={st.tableColOther}>PAID</Text></View>
                {headGroups.map((g, i) => <TouchableOpacity key={g.name} onPress={() => { setChosenHead(g.name); setChosenMode(''); setPartyView('mode'); }} accessibilityRole="button" style={st.groupRow}>
                  <Text style={st.groupNumber}>{i + 1}</Text><View style={{flex:1}}><Text style={st.groupName}>{g.name}</Text>
                    <View style={st.groupMiniTrack}><View style={[st.groupMiniBar, { width: `${Math.max(1,g.amount/Math.max(1,selectedPartyTotal)*100)}%` }]} /></View>
                    <Text style={st.groupCaption}>{(g.amount/Math.max(1,selectedPartyTotal)*100).toFixed(0)}% of paid amount</Text></View>
                  <Text style={st.groupCount}>{g.payments}</Text><Text style={st.groupAmount}>{money(g.amount)}</Text><Text style={st.brownLink}>›</Text>
                </TouchableOpacity>)}
                {!headGroups.length && <Text style={st.smallText}>No payment rows in this period.</Text>}
              </>}
              {partyView === 'mode' && <>
                {chosenHead && <TouchableOpacity accessibilityRole="button" onPress={() => { setChosenHead(''); setPartyView('bill_head'); }}><Text style={st.brownLink}>‹ {chosenHead}</Text></TouchableOpacity>}
                <View style={st.artifactTableHeader}><Text style={st.tableColMain}>MODE</Text><Text style={st.tableColOther}>PAYMENTS</Text><Text style={st.tableColOther}>PAID</Text></View>
                {modeGroups.map((g, i) => <TouchableOpacity key={g.name} onPress={() => { setChosenMode(g.name); setPartyView('payments'); }} accessibilityRole="button" style={st.groupRow}>
                  <Text style={st.groupNumber}>{i + 1}</Text><View style={{flex:1}}><Text style={st.groupName}>{g.name}</Text>
                    <View style={st.groupMiniTrack}><View style={[st.groupMiniBar, { width: `${Math.max(1,g.amount/Math.max(1,selectedPartyTotal)*100)}%` }]} /></View>
                    <Text style={st.groupCaption}>{(g.amount/Math.max(1,selectedPartyTotal)*100).toFixed(0)}% of paid amount</Text></View>
                  <Text style={st.groupCount}>{g.payments}</Text><Text style={st.groupAmount}>{money(g.amount)}</Text><Text style={st.brownLink}>›</Text>
                </TouchableOpacity>)}
              </>}
              {partyView !== 'payments' && <TouchableOpacity accessibilityRole="button" style={st.showPaymentsFooter} onPress={() => { setChosenMode(''); setPartyView('payments'); }}>
                <Text style={st.vendorFooterLink}>Show the {matchingHeadPayments.length} payments</Text><Text style={st.brownLink}>▾</Text>
              </TouchableOpacity>}
              {partyView === 'payments' && <>
                <TouchableOpacity accessibilityRole="button" onPress={() => { setPartyView(chosenHead ? 'mode' : 'bill_head'); setChosenMode(''); }}><Text style={st.brownLink}>‹ {chosenMode || 'Payment groups'}</Text></TouchableOpacity>
                <View style={st.artifactTableHeader}><Text style={st.tableColMain}>PAYMENTS</Text><Text style={st.tableColOther}>PAID</Text></View>
                <ScrollView nestedScrollEnabled style={{maxHeight: 440}} showsVerticalScrollIndicator={matchingModePayments.length > 8}>
                {matchingModePayments.map(p => <TouchableOpacity key={`${p.prpcode}-${p.payment_uid}-${p.payment_srno}`} onPress={() => selectVoucherInline(p)} accessibilityRole="button" style={st.artifactPaymentLine}>
                  <View style={{flex:1}}><Text style={st.artifactPaymentName}><Text style={{color: COLORS.brown}}>{p.voucher_no || p.payment_uid}</Text> · {p.party_name} · {paymentMode(p)} · {p.bill_count} {p.bill_count === 1 ? 'bill' : 'bills'}</Text>
                    <Text style={st.artifactPaymentDate}>{toIso(p.entry_date)}</Text></View>
                  <Text style={st.artifactPaymentAmount}>{money(n(p.amount))}</Text><Text style={st.brownLink}>›</Text>
                </TouchableOpacity>)}
                {!matchingModePayments.length && <Text style={st.smallText}>No payments for this selection.</Text>}
                </ScrollView>
              </>}
            </>}
          </View>
        </View>}

        {/* An individual voucher opens in the same standalone FY route. */}
        {stage === 'voucher' && <View style={st.artifactPartyCard}>
          <View style={st.artifactPartyHeader}><Text style={st.artifactPartyHeaderText}>{fyName(selectedYear)} › {partyName} › {chosenHead || 'Payment'} › {chosenMode || 'Mode'}</Text>
            <Text style={st.artifactPartyHeaderText}>{selectedPayment ? money(n(selectedPayment.amount)) : '—'}</Text></View>
          <View style={st.artifactPartyBody}>
            <TouchableOpacity onPress={() => setVoucher(null)} accessibilityRole="button"><Text style={st.brownLink}>‹ All payments</Text></TouchableOpacity>
            {detail.loading && <View style={st.wait}><ActivityIndicator color={COLORS.brown}/></View>}
            {detail.error ? <Text style={st.detailError}>{detail.error}</Text> : null}
            {!voucherInPeriod && <Text style={st.detailWarning}>Voucher is outside the selected period. Return to payments or change month.</Text>}
            {!!selectedPayment && voucherInPeriod && <View style={st.billPanel}>
              <Text style={st.voucherNumber}>{selectedPayment.voucher_no} · {toIso(selectedPayment.entry_date)} · {money(n(selectedPayment.amount))}</Text>
              <Text style={st.sectionEyebrow}>BILL-WISE ADJUSTMENTS</Text>
              {(detail.data?.bill_rows || []).map((b, index) => <View key={`${b.sub_srno}-${index}`} style={st.billRow}>
                <View style={{flex:1}}><Text style={st.billNumber}>{b.bill_no || 'Unresolved purchase bill'}</Text><Text style={st.smallText}>{toIso(b.bill_date) || 'Date unavailable'}</Text></View>
                <Text style={st.billAmount}>{money(n(b.settled_amount))}</Text>
              </View>)}
              {!(detail.data?.bill_rows || []).length && <Text style={st.smallText}>No bill adjustments were recorded against this payment.</Text>}
              <View style={st.voucherMeta}>
                <View><Text style={st.overline}>MODE</Text><Text style={st.voucherNumber}>{paymentMode(selectedPayment)}</Text></View>
                <View><Text style={st.overline}>UTR / REFERENCE</Text><Text style={st.voucherNumber}>{selectedPayment.reference || 'Not recorded'}</Text></View>
                <View><Text style={st.overline}>VOUCHER DATE</Text><Text style={st.voucherNumber}>{toIso(selectedPayment.entry_date)}</Text></View>
              </View>
              <View style={st.voucherActions}><TouchableOpacity onPress={sharePaymentAdvice} style={st.shareButton} accessibilityRole="button"><Text style={st.shareButtonText}>Share payment advice</Text></TouchableOpacity>
                <TouchableOpacity onPress={copyVoucherNo} style={st.copyButton} accessibilityRole="button"><Text style={st.brownLink}>Copy voucher no.</Text></TouchableOpacity></View>
              {!!shareNotice && <Text style={st.smallText}>{shareNotice}</Text>}
            </View>}
          </View>
        </View>}

        <Text style={st.footnote}>Amounts are gross recorded FAMPayD1 amounts grouped by FAMPay.EDate, not bank clearance. Blank bill-based metrics are deliberately not estimated.</Text>
      </>}
    </View>
    </ScrollView>
  </View>;
}

function Kpi({ title, value, sub }: { title: string; value: string; sub: string }) {
  return <View style={st.kpi}><Text style={st.kpiTitle}>{title} <Text style={st.kpiDot}>·</Text></Text><Text style={st.kpiValue}>{value}</Text><Text style={st.kpiSub} numberOfLines={2}>{sub}</Text></View>;
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.cream }, pageContent: { paddingBottom: 70 },
  topBar: { backgroundColor: COLORS.navy, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', gap: 9, alignItems: 'center' },
  back: { width: 30, height: 28, borderRadius: 8, borderWidth: 1, borderColor: '#506173', justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#FFF', fontSize: 20, fontWeight: '700' }, header: { color: '#FFF', fontSize: 12, fontWeight: '900' }, headerSub: { fontSize: 9, color: '#D4CBD3', marginTop: 3 },
  close: { width: 25, height: 27, alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: 22, color: '#FFF' },
  inner: { maxWidth: 730, alignSelf: 'center', width: '100%', padding: 10 },
  tabs: { flexDirection: 'row', gap: 6, marginTop: 3, marginBottom: 11, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderColor: COLORS.line, borderWidth: 1, borderRadius: 20, backgroundColor: COLORS.panel },
  tabSelected: { backgroundColor: COLORS.brown, borderColor: COLORS.brown }, tabText: { color: COLORS.muted, fontSize: 10, fontWeight: '800' }, tabTextSelected: { color: '#FFF' },
  error: { color: '#A5382C', fontSize: 11 }, errorBox: { backgroundColor: '#FFF0EB', padding: 12, borderRadius: 8 }, wait: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10 },
  hero: { backgroundColor: '#FFF', borderRadius: 13, borderWidth: 1, borderColor: COLORS.line, borderLeftWidth: 3, borderLeftColor: COLORS.brown, padding: 12 },
  heroGrid: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' }, heroLeft: { flex: 1, minWidth: 0 }, overline: { fontSize: 9, letterSpacing: 1, fontWeight: '800', color: COLORS.muted },
  heroAmount: { fontSize: 28, fontWeight: '900', color: COLORS.navy, marginTop: 3 }, heroChange: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  heroDescription: { fontSize: 9, color: COLORS.muted, lineHeight: 14, marginTop: 5 },
  heroNotes: { flex: 1, backgroundColor: '#F6F3F0', borderRadius: 9, padding: 10, justifyContent: 'space-around', minHeight: 80 }, note: { fontSize: 9.5, color: COLORS.text, lineHeight: 14, marginVertical: 2 },
  compareRow: { flexDirection: 'row', gap: 6, marginTop: 10 }, compareBox: { flex: 1, minWidth: 130, padding: 9, backgroundColor: '#F6F3F0', borderWidth: 1, borderColor: COLORS.line, borderRadius: 9 },
  compareActive: { backgroundColor: COLORS.brown, borderColor: COLORS.brown }, compareTitle: { fontSize: 9, fontWeight: '900', color: COLORS.muted }, compareAmount: { fontSize: 14, fontWeight: '900', color: COLORS.text, marginTop: 3 }, compareMeta: { fontSize: 9, color: COLORS.muted, marginTop: 3 }, white: { color: '#FFF' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10, marginBottom: 18 }, kpi: { width: '19%', minWidth: 120, backgroundColor: '#FFF', borderColor: COLORS.line, borderWidth: 1, borderRadius: 12, minHeight: 101, padding: 10 },
  kpiTitle: { color: COLORS.muted, fontSize: 9, fontWeight: '900' }, kpiDot: { color: COLORS.brown }, kpiValue: { color: COLORS.brown, fontSize: 15, fontWeight: '900', marginTop: 7 },
  kpiSub: { color: COLORS.muted, fontSize: 9, marginTop: 7, lineHeight: 12 },
  chartTitle: { marginTop: 3, marginBottom: 7, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionEyebrow: { fontSize: 10, color: COLORS.muted, fontWeight: '900', letterSpacing: 0.4 }, tiny: { fontSize: 9, color: COLORS.muted },
  chartCard: { padding: 12, backgroundColor: '#FFF', borderRadius: 12, borderColor: COLORS.line, borderWidth: 1, marginBottom: 18 },
  svgContainer: { height: 186, position: 'relative' }, overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around' }, overlaySlot: { flex: 1 },
  monthLabels: { flexDirection: 'row' }, monthLabelSlot: { flex: 1, alignItems: 'center' }, monthLabel: { fontSize: 9, color: COLORS.muted },
  chartLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderColor: COLORS.line }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 }, legendLine: { width: 12, height: 3 }, legendText: { fontSize: 9, color: COLORS.grey },
  hoverPanel: { marginTop: 9, borderColor: COLORS.line, borderWidth: 1, borderRadius: 7, backgroundColor: '#FAF6F2', padding: 8 }, hoverTitle: { fontSize: 10, fontWeight: '800', color: COLORS.text }, brownLink: { fontSize: 10, fontWeight: '900', color: COLORS.brown },
  chartFoot: { marginTop: 7, fontSize: 9, color: COLORS.muted },
  partyFocus: { backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 13 },
  partyFocusName: { fontSize: 15, color: COLORS.text, fontWeight: '900', marginVertical: 5 }, partyFocusAmount: { fontSize: 17, color: COLORS.brown, fontWeight: '900' }, smallText: { fontSize: 10, color: COLORS.muted },
  comparisonBarsScroll: { minWidth: 680, justifyContent: 'space-between', paddingTop: 10 },
  comparisonMonth: { width: 52, alignItems: 'center', justifyContent: 'flex-end' },
  comparisonBars: { height: 128, width: 46, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  bar: { width: 11, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  comparisonBarLabel: { marginTop: 8, marginBottom: 8 },
  monthPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingTop: 9, borderTopWidth: 1, borderColor: COLORS.line },
  monthPill: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 18, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: '#FFF' },
  monthPillDisabled: { backgroundColor: '#F9F7F5', borderColor: '#F2EAE5' },
  monthPillSelected: { backgroundColor: COLORS.brown, borderColor: COLORS.brown },
  monthPillText: { fontSize: 10, color: COLORS.brown, fontWeight: '700' },
  monthPillSelectedText: { color: '#FFF' }, monthPillTextDisabled: { color: '#CAC4BF' },
  topVendorsPanel: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 12, paddingTop: 5, marginBottom: 15 },
  topVendorRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 1, borderColor: COLORS.faded },
  vendorRank: { width: 12, fontSize: 11, color: COLORS.muted }, vendorName: { fontSize: 11, fontWeight: '900', color: COLORS.text, marginBottom: 5 },
  vendorTrack: { height: 4, borderRadius: 2, backgroundColor: '#F0E7E0', marginVertical: 1, overflow: 'hidden', maxWidth: 250 },
  vendorBar: { height: '100%', borderRadius: 2 }, vendorNumbers: { minWidth: 95, alignItems: 'flex-end' },
  vendorAmount: { fontSize: 12, color: COLORS.text, fontWeight: '900' }, vendorSub: { fontSize: 9, color: COLORS.green, marginTop: 2 },
  vendorFooter: { paddingVertical: 11 }, vendorFooterLink: { color: COLORS.blue, fontSize: 10, fontWeight: '800' },
  artifactPartyCard: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden', marginBottom: 18 },
  artifactPartyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: COLORS.brown, paddingHorizontal: 12, paddingVertical: 11 },
  artifactPartyHeaderText: { fontSize: 10, color: '#FFF', fontWeight: '800', maxWidth: '70%' },
  artifactPartyBody: { paddingHorizontal: 12, paddingVertical: 9, gap: 9 },
  partyMonthScroller: { gap: 5, paddingBottom: 3 }, partyCompare: { fontSize: 10, color: COLORS.muted }, bold: { fontWeight: '900', color: COLORS.text },
  byFilter: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 1 },
  byChip: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6 },
  byChipActive: { backgroundColor: COLORS.brown, borderColor: COLORS.brown }, byChipText: { color: COLORS.muted, fontWeight: '800', fontSize: 10 },
  artifactTableHeader: { flexDirection: 'row', paddingHorizontal: 7, borderBottomWidth: 1, borderColor: COLORS.line, paddingVertical: 9 },
  tableColMain: { flex: 1, fontSize: 9, color: COLORS.muted, fontWeight: '900' },
  tableColOther: { minWidth: 70, textAlign: 'right', fontSize: 9, color: COLORS.muted, fontWeight: '900' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.line },
  groupNumber: { color: COLORS.muted, fontSize: 10, width: 14 }, groupName: { color: COLORS.text, fontWeight: '900', fontSize: 11 },
  groupMiniTrack: { height: 4, borderRadius: 2, backgroundColor: COLORS.faded, marginTop: 5, maxWidth: 200, overflow: 'hidden' },
  groupMiniBar: { height: '100%', borderRadius: 2, backgroundColor: COLORS.brown },
  groupCaption: { fontSize: 9, color: COLORS.muted, marginTop: 3 }, groupCount: { minWidth: 45, textAlign: 'right', color: COLORS.grey, fontSize: 10 },
  groupAmount: { minWidth: 60, textAlign: 'right', color: COLORS.text, fontWeight: '900', fontSize: 11 },
  showPaymentsFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderColor: COLORS.line, marginTop: 5 },
  artifactPaymentLine: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.faded },
  artifactPaymentName: { color: COLORS.text, fontSize: 11, fontWeight: '800' }, artifactPaymentDate: { color: COLORS.muted, fontSize: 9, marginTop: 2 },
  artifactPaymentAmount: { color: COLORS.text, fontWeight: '900', fontSize: 11 },
  monthBreakdown: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, marginBottom: 14 }, monthRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderColor: COLORS.faded, gap: 7 },
  monthRowName: { width: 37, fontSize: 10, fontWeight: '800', color: COLORS.text }, monthRowAmount: { flex: 1, fontSize: 11, fontWeight: '900', color: COLORS.brown }, monthRowCount: { color: COLORS.muted, fontSize: 9 },
  partyPanel: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line }, partyPanelTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  search: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, marginTop: 10, marginBottom: 4, padding: 9, fontSize: 10 },
  partyRow: { borderBottomWidth: 1, borderColor: COLORS.faded, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  avatar: { width: 27, height: 27, borderRadius: 16, backgroundColor: '#E8F0EB', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: COLORS.green, fontWeight: '900', fontSize: 9 },
  partyRowTitle: { color: COLORS.text, fontSize: 10, fontWeight: '800' }, partyRowMoney: { color: COLORS.text, fontSize: 11, fontWeight: '900' },
  moreButton: { padding: 10, alignItems: 'center' }, footnote: { fontSize: 9, color: COLORS.muted, lineHeight: 14, marginBottom: 30 },
  drillHeading: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 9 },
  crumbParty: { color: COLORS.text, fontSize: 10, fontWeight: '800', flexShrink: 1 },
  crumbButton: { paddingHorizontal: 4, paddingVertical: 6, maxWidth: '75%' },
  drillMonthBanner: { backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 12, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  drillTitle: { fontSize: 15, fontWeight: '900', color: COLORS.text, marginTop: 3 },
  drillMonthTotal: { fontSize: 17, fontWeight: '900', color: COLORS.brown },
  detailError: { color: '#9B402D', padding: 10, fontSize: 11 },
  detailWarning: { padding: 9, backgroundColor: '#FFF3E9', borderRadius: 8, color: COLORS.brown, fontSize: 10, marginVertical: 7 },
  vouchersPanel: { backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, gap: 8, marginBottom: 15 },
  voucherCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, overflow: 'hidden' },
  voucherCardOpen: { borderColor: '#D7B39D' },
  voucherTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  voucherNumber: { fontSize: 11, fontWeight: '800', color: COLORS.text },
  voucherAmount: { fontSize: 12, fontWeight: '900', color: COLORS.brown },
  billPanel: { padding: 12, gap: 9, backgroundColor: '#FCF9F7', borderTopWidth: 1, borderColor: COLORS.line },
  billRow: { flexDirection: 'row', gap: 10, alignItems: 'center', borderBottomWidth: 1, borderColor: COLORS.faded, paddingVertical: 8 },
  billNumber: { fontSize: 11, fontWeight: '900', color: COLORS.text },
  billAmount: { fontSize: 12, fontWeight: '900', color: COLORS.brown },
  voucherMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, borderTopWidth: 1, borderColor: COLORS.line, paddingTop: 10 },
  voucherActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shareButton: { paddingHorizontal: 11, paddingVertical: 10, borderRadius: 7, backgroundColor: COLORS.brown },
  shareButtonText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  copyButton: { paddingHorizontal: 11, paddingVertical: 10, borderRadius: 7, borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#FFF' },
  monthRowSelected: { backgroundColor: '#F9EFE9' },
  partyRowActive: { backgroundColor: '#F9EFE9' },
  permission: { backgroundColor: COLORS.cream, flex: 1, justifyContent: 'center', alignItems: 'center' },
});
