// FILE: src/components/SalesInvoiceBrowse/MultiPrintForm.tsx
// Multi Print form — sits INLINE on the Multi Print screen, right under From Date / To Date (no modal):
//   Sales A/c, Voucher No From / To, Party Name (dropdown, multi select; none = all), Print Format, Print button.
// Every time the Print Type (txntype) / property / year / store changes, the form resets and its apis
// (accountbook, getprinttypes) are called again; the party list is called again whenever its dropdown is open.
// Print -> /api/multiprint -> /api/saleschallanmultiprintnew -> PDF.
import { AppAlert } from '@/common/utils/appAlert';
import { Btn } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  errorMessage,
  fetchAccountBook,
  fetchPrintParties,
  fetchPrintTypes,
  MultiPrintInput,
  multiPrintInvoices,
  pdfUrlOf,
  PrintCtx,
} from './api';
import { dmy, joinBillNo, Row, txnLabel } from './model';
import { SearchInput } from './ui';

type Props = {
  API: string;
  token: string;
  ctx: PrintCtx; // prpcode / yearno / strcode / txntype of the criteria
  dateFrom: Date;
  dateTo: Date;
  onBeforePrint?: () => boolean; // criteria check (alerts + false when property / year / store is missing); used by Print and by the dropdowns
  onPdf: (pdfUrl: string, title: string) => void;
};

type Panel = 'acc' | 'party' | 'ptype' | null;

const PARTY_LIMIT = 20;
const ACC_SHOWN = 100;

/** '6043' -> '00006043' (8 digits, as the voucher numbers are saved); anything non numeric stays as typed. */
const padNo = (v: string) => (/^\d+$/.test(String(v).trim()) ? String(v).trim().padStart(8, '0') : String(v).trim());

/** Numbers only while typing. Leading zeros are dropped (so typing on top of 00006043 works), padding is added back later. */
const digits = (v: string) => String(v).replace(/[^0-9]/g, '').replace(/^0+/, '').slice(0, 8);

const parCode = (p: Row) => String(p?.ParCode ?? p?.acccode ?? p?.id ?? '');
const parName = (p: Row) => String(p?.ParName ?? p?.accountname ?? parCode(p));

export default function MultiPrintForm({ API, token, ctx, dateFrom, dateTo, onBeforePrint, onPdf }: Props) {
  const [panel, setPanel] = useState<Panel>(null);

  // form
  const [salesAc, setSalesAc] = useState<Row | null>(null);
  const [fromNo, setFromNo] = useState('');
  const [fromSeries, setFromSeries] = useState('');
  const [toNo, setToNo] = useState('');
  const [toSeries, setToSeries] = useState('');
  const [picked, setPicked] = useState<Record<string, string>>({}); // parcode -> name
  const [ptypeIndex, setPtypeIndex] = useState<number>(-1);

  // lists
  const [accounts, setAccounts] = useState<Row[]>([]);
  const [accLoading, setAccLoading] = useState(false);
  const [accQuery, setAccQuery] = useState('');
  const [ptypes, setPtypes] = useState<Row[]>([]);
  const [ptLoading, setPtLoading] = useState(false);
  const [parties, setParties] = useState<Row[]>([]);
  const [partyLoading, setPartyLoading] = useState(false);
  const [partyPage, setPartyPage] = useState(1);
  const [partyMore, setPartyMore] = useState(false);
  const [partyQuery, setPartyQuery] = useState('');
  const [partySearch, setPartySearch] = useState('');

  const [busy, setBusy] = useState(false);
  const aliveRef = useRef(true);
  const partySeq = useRef(0);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Print Type / property / year / store changed -> blank the form (voucher no too) and call its apis again
  useEffect(() => {
    setPanel(null);
    setSalesAc(null);
    setFromNo('');
    setFromSeries('');
    setToNo('');
    setToSeries('');
    setPicked({});
    setPtypeIndex(-1);
    setAccounts([]);
    setPtypes([]);
    setParties([]);
    setAccQuery('');
    setPartyQuery('');
    setPartySearch('');
    if (!ctx.prpcode || !ctx.strcode) return;
    let alive = true;
    setAccLoading(true);
    setPtLoading(true);
    fetchAccountBook(API, token, ctx).then((r) => {
      if (!alive) return;
      setAccounts(r);
      setAccLoading(false);
    });
    fetchPrintTypes(API, token, ctx).then((r) => {
      if (!alive) return;
      setPtypes(r);
      setPtLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token, ctx.prpcode, ctx.yearno, ctx.strcode, ctx.txntype]);

  // party search text -> 400 ms
  useEffect(() => {
    const t = setTimeout(() => setPartySearch(partyQuery), 400);
    return () => clearTimeout(t);
  }, [partyQuery]);

  // no Enter on a phone: pad the voucher numbers (6043 -> 00006043) ~1 s after typing stops
  useEffect(() => {
    if (!fromNo || fromNo.length >= 8) return;
    const t = setTimeout(() => setFromNo((n) => padNo(n)), 1000);
    return () => clearTimeout(t);
  }, [fromNo]);
  useEffect(() => {
    if (!toNo || toNo.length >= 8) return;
    const t = setTimeout(() => setToNo((n) => padNo(n)), 1000);
    return () => clearTimeout(t);
  }, [toNo]);

  const ptypeCode = ptypeIndex >= 0 ? String(ptypes[ptypeIndex]?.printtypecode ?? '') : '';

  const buildInput = useCallback(
    (parcodes: string[]): MultiPrintInput => ({
      prpcode: ctx.prpcode,
      txntype: ctx.txntype,
      yearno: ctx.yearno,
      strcode: ctx.strcode,
      acccode: salesAc ? String(salesAc.acccode ?? salesAc.id ?? '') : '',
      vounofrom: joinBillNo(padNo(fromNo), fromSeries),
      vounoto: joinBillNo(padNo(toNo), toSeries),
      datefrom: dmy(dateFrom),
      dateto: dmy(dateTo),
      parcodes,
      printtype: ptypeCode,
    }),
    [ctx.prpcode, ctx.yearno, ctx.strcode, ctx.txntype, salesAc, fromNo, fromSeries, toNo, toSeries, dateFrom, dateTo, ptypeCode],
  );

  const loadParties = useCallback(
    async (page: number) => {
      const seq = ++partySeq.current;
      setPartyLoading(true);
      const rows = await fetchPrintParties(API, token, buildInput([]), page, PARTY_LIMIT, partySearch);
      if (!aliveRef.current || seq !== partySeq.current) return;
      setParties((prev) => (page === 1 ? rows : [...prev, ...rows]));
      setPartyPage(page);
      setPartyMore(rows.length >= PARTY_LIMIT);
      setPartyLoading(false);
    },
    [API, token, buildInput, partySearch],
  );

  // Party dropdown open -> load the parties of the voucher / date range (again when the range or search changes)
  useEffect(() => {
    if (panel !== 'party') return;
    const t = setTimeout(() => loadParties(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, partySearch, salesAc, fromNo, fromSeries, toNo, toSeries, dateFrom, dateTo, ctx.prpcode, ctx.yearno, ctx.strcode, ctx.txntype]);

  const pickedCodes = Object.keys(picked);
  const toggleParty = (p: Row) => {
    const c = parCode(p);
    setPicked((prev) => {
      const next = { ...prev };
      if (next[c] !== undefined) delete next[c];
      else next[c] = parName(p);
      return next;
    });
  };

  const accShown = useMemo(() => {
    const q = accQuery.trim().toLowerCase();
    const list = q
      ? accounts.filter((a) => `${a.accountname ?? ''} ${a.acccode ?? ''}`.toLowerCase().includes(q))
      : accounts;
    return { rows: list.slice(0, ACC_SHOWN), total: list.length };
  }, [accounts, accQuery]);

  const submit = async () => {
    if (busy) return;
    if (onBeforePrint && !onBeforePrint()) return;
    setFromNo((n) => padNo(n));
    setToNo((n) => padNo(n));
    try {
      setBusy(true);
      const input = buildInput(pickedCodes);
      console.log('[SalesInvoiceBrowse] multi print input', JSON.stringify(input));
      const data = await multiPrintInvoices(API, token, input);
      if (data?.success === true) {
        const url = pdfUrlOf(data, ctx.txntype || 'sales_invoice');
        if (!url) {
          AppAlert.alert('PDF Error', 'PDF URL not found.');
          return;
        }
        onPdf(url, txnLabel(ctx.txntype || 'sales_invoice'));
      } else {
        AppAlert.alert('PDF Failed', data?.message || 'PDF generation failed.');
      }
    } catch (error: any) {
      console.log('[SalesInvoiceBrowse] multi print error', error?.response?.data || error?.message);
      AppAlert.alert('Error', errorMessage(error, 'Unable to generate PDF.'));
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  };

  // Sales A/c, Party and Print Format need property / year / store -> same validation as Print
  const toggle = (p: Panel) => {
    if (panel !== p && onBeforePrint && !onBeforePrint()) return;
    setPanel((cur) => (cur === p ? null : p));
  };

  return (
    <>
      <View style={st.form}>
        {/* Sales A/c */}
        <View style={st.field}>
          <Text style={st.label}>Contra</Text>
          <TouchableOpacity style={st.box} onPress={() => toggle('acc')} accessibilityRole="button" accessibilityLabel="Select sales account">
            <Icon name="account-balance-wallet" size={18} color={T.copper} />
            <Text style={[st.boxText, !salesAc && st.placeholder]} numberOfLines={1}>
              {salesAc ? `${salesAc.acccode} · ${salesAc.accountname}` : 'All accounts'}
            </Text>
            {salesAc ? (
              <TouchableOpacity onPress={() => setSalesAc(null)} hitSlop={8} accessibilityLabel="Clear sales account">
                <Icon name="close" size={18} color={T.muted} />
              </TouchableOpacity>
            ) : null}
            <Icon name={panel === 'acc' ? 'expand-less' : 'expand-more'} size={20} color={T.muted} />
          </TouchableOpacity>
          {panel === 'acc' ? (
            <View style={st.panel}>
              <SearchInput value={accQuery} onChangeText={setAccQuery} placeholder="Search account name or code..." />
              {accLoading ? (
                <ActivityIndicator color={T.copper} style={{ marginVertical: 14 }} />
              ) : (
                <ScrollView style={st.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {accShown.rows.map((a, i) => {
                    const on = salesAc && String(salesAc.acccode) === String(a.acccode);
                    return (
                      <TouchableOpacity
                        key={`${a.acccode}_${i}`}
                        style={[st.row, on && st.rowOn]}
                        onPress={() => {
                          setSalesAc(a);
                          setPanel(null);
                        }}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={st.rowTitle} numberOfLines={1}>{a.accountname}</Text>
                          <Text style={st.rowSub} numberOfLines={1}>{a.acccode}{a.city ? ` · ${a.city}` : ''}</Text>
                        </View>
                        {on ? <Icon name="check" size={18} color={T.copper} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                  {accShown.total > accShown.rows.length ? (
                    <Text style={st.hint}>Showing first {ACC_SHOWN} of {accShown.total} — type to narrow down</Text>
                  ) : null}
                  {accShown.total === 0 ? <Text style={st.hint}>No records found</Text> : null}
                </ScrollView>
              )}
            </View>
          ) : null}
        </View>

        {/* Voucher No From / To — type 6043 + FS and the number becomes 00006043 */}
        <View style={st.twoCol}>
          <View style={[st.field, st.col]}>
            <Text style={st.label}>Voucher No From</Text>
            <View style={st.voucher}>
              <TextInput
                style={[st.input, st.noInput]}
                value={fromNo}
                onChangeText={(t) => setFromNo(digits(t))}
                keyboardType="number-pad"
                onBlur={() => setFromNo((n) => padNo(n))}
                onSubmitEditing={() => setFromNo((n) => padNo(n))}
                placeholder="00000000"
                placeholderTextColor={T.muted}
                autoCorrect={false}
                accessibilityLabel="Voucher no from"
              />
              <TextInput
                style={[st.input, st.series]}
                value={fromSeries}
                onChangeText={(t) => {
                  const v = t.toUpperCase();
                  setFromSeries(v);
                  if (v) setFromNo((n) => padNo(n));
                }}
                onBlur={() => setFromNo((n) => padNo(n))}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="FS"
                placeholderTextColor={T.muted}
                accessibilityLabel="Voucher series from"
              />
            </View>
          </View>
          <View style={[st.field, st.col]}>
            <Text style={st.label}>Voucher No To</Text>
            <View style={st.voucher}>
              <TextInput
                style={[st.input, st.noInput]}
                value={toNo}
                onChangeText={(t) => setToNo(digits(t))}
                keyboardType="number-pad"
                onBlur={() => setToNo((n) => padNo(n))}
                onSubmitEditing={() => setToNo((n) => padNo(n))}
                placeholder="00000000"
                placeholderTextColor={T.muted}
                autoCorrect={false}
                accessibilityLabel="Voucher no to"
              />
              <TextInput
                style={[st.input, st.series]}
                value={toSeries}
                onChangeText={(t) => {
                  const v = t.toUpperCase();
                  setToSeries(v);
                  if (v) setToNo((n) => padNo(n));
                }}
                onBlur={() => setToNo((n) => padNo(n))}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="FS"
                placeholderTextColor={T.muted}
                accessibilityLabel="Voucher series to"
              />
            </View>
          </View>
        </View>

        {/* Party Name */}
        <View style={st.field}>
          <Text style={st.label}>Party Name</Text>
          <>
              <TouchableOpacity style={st.box} onPress={() => toggle('party')} accessibilityRole="button" accessibilityLabel="Select parties">
                <Icon name="groups" size={18} color={T.copper} />
                <Text style={[st.boxText, !pickedCodes.length && st.placeholder]} numberOfLines={1}>
                  {pickedCodes.length ? `${pickedCodes.length} part${pickedCodes.length === 1 ? 'y' : 'ies'} selected` : 'All parties'}
                </Text>
                {pickedCodes.length ? (
                  <TouchableOpacity onPress={() => setPicked({})} hitSlop={8} accessibilityLabel="Clear selected parties">
                    <Icon name="close" size={18} color={T.muted} />
                  </TouchableOpacity>
                ) : null}
                <Icon name={panel === 'party' ? 'expand-less' : 'expand-more'} size={20} color={T.muted} />
              </TouchableOpacity>
              {panel === 'party' ? (
                <View style={st.panel}>
                  <SearchInput value={partyQuery} onChangeText={setPartyQuery} placeholder="Search party..." />
                  <ScrollView style={st.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {parties.map((p, i) => {
                      const c = parCode(p);
                      const on = picked[c] !== undefined;
                      return (
                        <TouchableOpacity
                          key={`${c}_${i}`}
                          style={[st.row, on && st.rowOn]}
                          onPress={() => toggleParty(p)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                        >
                          <Icon name={on ? 'check-box' : 'check-box-outline-blank'} size={22} color={on ? T.copper : T.muted} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={st.rowTitle} numberOfLines={1}>{parName(p)}</Text>
                            <Text style={st.rowSub} numberOfLines={1}>{c}{p.City ? ` · ${p.City}` : ''}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {partyLoading ? <ActivityIndicator color={T.copper} style={{ marginVertical: 14 }} /> : null}
                    {!partyLoading && partyMore ? (
                      <TouchableOpacity style={st.more} onPress={() => loadParties(partyPage + 1)}>
                        <Text style={st.moreText}>Load more</Text>
                      </TouchableOpacity>
                    ) : null}
                    {!partyLoading && parties.length === 0 ? <Text style={st.hint}>No party found for this voucher / date range</Text> : null}
                  </ScrollView>
                </View>
              ) : null}
          </>
        </View>

        {/* Print Format (list of getprinttypes) */}
        <View style={st.field}>
          <Text style={st.label}>Print Format</Text>
          <TouchableOpacity style={st.box} onPress={() => toggle('ptype')} accessibilityRole="button" accessibilityLabel="Select print format">
            <Icon name="print" size={18} color={T.copper} />
            <Text style={[st.boxText, ptypeIndex < 0 && st.placeholder]} numberOfLines={1}>
              {ptypeIndex >= 0 ? String(ptypes[ptypeIndex]?.printtypename ?? '') : '--Select--'}
            </Text>
            <Icon name={panel === 'ptype' ? 'expand-less' : 'expand-more'} size={20} color={T.muted} />
          </TouchableOpacity>
          {panel === 'ptype' ? (
            <View style={st.panel}>
              {ptLoading ? (
                <ActivityIndicator color={T.copper} style={{ marginVertical: 14 }} />
              ) : (
                ptypes.map((p, i) => (
                  <TouchableOpacity
                    key={`${p.printtypecode}_${i}`}
                    style={[st.row, i === ptypeIndex && st.rowOn]}
                    onPress={() => {
                      setPtypeIndex(i);
                      setPanel(null);
                    }}
                  >
                    <Text style={[st.rowTitle, { flex: 1 }]} numberOfLines={2}>{p.printtypename}</Text>
                    {i === ptypeIndex ? <Icon name="check" size={18} color={T.copper} /> : null}
                  </TouchableOpacity>
                ))
              )}
              {!ptLoading && ptypes.length === 0 ? <Text style={st.hint}>No print format found</Text> : null}
            </View>
          ) : null}
        </View>

        <Btn label="Print" icon="print" onPress={submit} loading={busy} />
      </View>
    </>
  );
}

const st = StyleSheet.create({
  form: { gap: 14 },
  field: { gap: 6 },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, minWidth: 0 },
  label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  boxText: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '700', color: T.ink },
  placeholder: { color: T.muted, fontWeight: '600' },
  voucher: { flexDirection: 'row', gap: 6, minWidth: 0 },
  noInput: { flex: 1, minWidth: 0, width: 0 },
  input: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    fontSize: 14,
    fontWeight: '700',
    color: T.ink,
  },
  series: { width: 56, minWidth: 0, paddingHorizontal: 4, textAlign: 'center' },
  panel: {
    gap: 8,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg,
  },
  list: { maxHeight: 240 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  rowOn: { backgroundColor: `${T.copper}14` },
  rowTitle: { fontSize: 13.5, fontWeight: '800', color: T.nav },
  rowSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  hint: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: T.muted, paddingVertical: 10 },
  more: { alignItems: 'center', paddingVertical: 10 },
  moreText: { fontSize: 13, fontWeight: '800', color: T.copper },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
