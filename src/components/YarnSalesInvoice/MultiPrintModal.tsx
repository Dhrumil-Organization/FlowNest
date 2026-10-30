// FILE: src/components/SalesInvoiceBrowse/MultiPrintModal.tsx
// "Multi Print" dialog (legacy "Item Detail Entry") — no field is compulsory:
//   Sales A/c, Voucher No From / To, Date From / To, Party Name (dropdown, multi select; none = all),
//   Print Type, OK / Cancel.  OK -> PDF.
// The three pick lists (Sales A/c, Party, Print Type) open INSIDE this sheet, so no second Modal is stacked.
import { AppAlert } from '@/common/utils/appAlert';
import { Btn, Sheet } from '@/src/components/erpUi';
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
import { DmyDateField, SearchInput } from './ui';

export type MultiPrintSeed = { no: string; series: string; date: Date; dateTo?: Date };

type Props = {
  open: boolean;
  onClose: () => void;
  API: string;
  token: string;
  ctx: PrintCtx;
  seed: MultiPrintSeed;
  onPdf: (pdfUrl: string, title: string) => void;
};

type Panel = 'acc' | 'party' | 'ptype' | null;

const PARTY_LIMIT = 20;
const ACC_SHOWN = 100;

/** '6043' -> '00006043' (8 digits, as the voucher numbers are saved); anything non numeric stays as typed. */
const padNo = (v: string) => (/^\d+$/.test(String(v).trim()) ? String(v).trim().padStart(8, '0') : String(v).trim());

/** Numbers only while typing (6043 -> 6043), padding happens on blur / when the series is typed. */
const digits = (v: string) => String(v).replace(/[^0-9]/g, '').slice(0, 8);

const parCode = (p: Row) => String(p?.ParCode ?? p?.acccode ?? p?.id ?? '');
const parName = (p: Row) => String(p?.ParName ?? p?.accountname ?? p?.AccountName ?? p?.accountName ?? p?.AccName ?? p?.name ?? parCode(p));

export default function MultiPrintModal({ open, onClose, API, token, ctx, seed, onPdf }: Props) {
  const [panel, setPanel] = useState<Panel>(null);

  // form
  const [salesAc, setSalesAc] = useState<Row | null>(null);
  const [fromNo, setFromNo] = useState('');
  const [fromSeries, setFromSeries] = useState('');
  const [toNo, setToNo] = useState('');
  const [toSeries, setToSeries] = useState('');
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [picked, setPicked] = useState<Record<string, string>>({}); // parcode -> name
  const [ptypeIndex, setPtypeIndex] = useState<number>(-1);

  // lists
  const [accounts, setAccounts] = useState<Row[]>([]);
  const [accLoading, setAccLoading] = useState(false);
  const [accQuery, setAccQuery] = useState('');
  const [accVisibleCount, setAccVisibleCount] = useState(ACC_SHOWN);
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

  // open -> reset the form from the seed and load Sales A/c + Print Type
  useEffect(() => {
    if (!open) return;
    setPanel(null);
    setSalesAc(null);
    setFromNo(seed.no);
    setFromSeries(seed.series);
    setToNo(seed.no);
    setToSeries(seed.series);
    setDateFrom(seed.date);
    setDateTo(seed.dateTo || seed.date);
    setPicked({});
    setPtypeIndex(-1);
    setAccQuery('');
    setPartyQuery('');
    setPartySearch('');
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
  }, [open]);

  // party search text -> 400 ms
  useEffect(() => {
    const t = setTimeout(() => setPartySearch(partyQuery), 400);
    return () => clearTimeout(t);
  }, [partyQuery]);

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
    if (!open || panel !== 'party') return;
    const t = setTimeout(() => loadParties(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, panel, partySearch, salesAc, fromNo, fromSeries, toNo, toSeries, dateFrom, dateTo]);

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
    const q = accQuery.trim().toLocaleLowerCase();
    const list = q
      ? accounts.filter((a) => {
          // Account-book APIs may return different casing/key aliases depending on the backend.
          const code = a.acccode ?? a.AccCode ?? a.Acccode ?? a.accountcode ?? a.AccountCode ?? a.code ?? a.Code ?? '';
          const name = a.accountname ?? a.AccountName ?? a.accountName ?? a.AccName ?? a.acname ?? a.name ?? a.Name ?? '';
          return `${String(code)} ${String(name)}`.toLocaleLowerCase().includes(q);
        })
      : accounts;
    return { rows: list.slice(0, accVisibleCount), total: list.length };
  }, [accounts, accQuery, accVisibleCount]);

  const submit = async () => {
    if (busy) return;
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
        onClose();
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

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  return (
    <Sheet open={open} onClose={busy ? () => undefined : onClose} title="Multi Print" wideMax={560}>
      <View style={st.form}>
        {/* Sales A/c */}
        <View style={st.field}>
          <Text style={st.label}>Contra</Text>
          <TouchableOpacity style={st.box} onPress={() => toggle('acc')} accessibilityRole="button" accessibilityLabel="Select sales account">
            <Icon name="account-balance-wallet" size={18} color={T.copper} />
            <Text style={[st.boxText, !salesAc && st.placeholder]} numberOfLines={1}>
              {salesAc ? `${salesAc.acccode ?? salesAc.AccCode ?? salesAc.Acccode ?? salesAc.accountcode ?? salesAc.AccountCode ?? salesAc.code ?? salesAc.Code ?? ''} · ${salesAc.accountname ?? salesAc.AccountName ?? salesAc.accountName ?? salesAc.AccName ?? salesAc.name ?? ''}` : 'All accounts'}
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
              <SearchInput value={accQuery} onChangeText={(value) => { setAccQuery(value); setAccVisibleCount(ACC_SHOWN); }} placeholder="Search account name or code..." />
              {accLoading ? (
                <ActivityIndicator color={T.copper} style={{ marginVertical: 14 }} />
              ) : (
                <ScrollView style={st.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {accShown.rows.map((a, i) => {
                    const on = salesAc && String(salesAc.acccode ?? salesAc.AccCode ?? salesAc.Acccode ?? salesAc.accountcode ?? salesAc.AccountCode ?? salesAc.code ?? salesAc.Code) === String(a.acccode ?? a.AccCode ?? a.Acccode ?? a.accountcode ?? a.AccountCode ?? a.code ?? a.Code);
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
                          <Text style={st.rowTitle} numberOfLines={1}>{a.accountname ?? a.AccountName ?? a.accountName ?? a.AccName ?? a.name ?? a.Name}</Text>
                          <Text style={st.rowSub} numberOfLines={1}>{a.acccode ?? a.AccCode ?? a.Acccode ?? a.accountcode ?? a.AccountCode ?? a.code ?? a.Code}{(a.city ?? a.City) ? ` · ${a.city ?? a.City}` : ''}</Text>
                        </View>
                        {on ? <Icon name="check" size={18} color={T.copper} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                  {accShown.total > accShown.rows.length ? (
                    <TouchableOpacity
                      style={st.more}
                      onPress={() => setAccVisibleCount((count) => Math.min(count + ACC_SHOWN, accShown.total))}
                      accessibilityRole="button"
                      accessibilityLabel="Show more accounts"
                    >
                      <Text style={st.moreText}>Show More ({Math.min(ACC_SHOWN, accShown.total - accShown.rows.length)} more)</Text>
                    </TouchableOpacity>
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
                onChangeText={(t) => {
                  const v = digits(t);
                  setToNo((prev) => (prev === '' || prev === fromNo ? v : prev));
                  setFromNo(v);
                }}
                keyboardType="number-pad"
                onBlur={() => {
                  const v = padNo(fromNo);
                  setFromNo(v);
                  if (!toNo.trim()) setToNo(v);
                  if (!toSeries.trim()) setToSeries(fromSeries);
                }}
                autoCorrect={false}
                accessibilityLabel="Voucher no from"
              />
              <TextInput
                style={[st.input, st.series]}
                value={fromSeries}
                onChangeText={(t) => {
                  const v = t.toUpperCase();
                  setToSeries((prev) => (prev === '' || prev === fromSeries ? v : prev));
                  setFromSeries(v);
                  if (v) setFromNo((n) => padNo(n));
                }}
                onBlur={() => setFromNo((n) => padNo(n))}
                autoCapitalize="characters"
                autoCorrect={false}
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
                accessibilityLabel="Voucher series to"
              />
            </View>
          </View>
        </View>

        {/* Date From / To */}
        <View style={st.twoCol}>
          <View style={[st.field, st.col]}>
            <Text style={st.label}>Date From</Text>
            <DmyDateField value={dateFrom} onChange={setDateFrom} />
          </View>
          <View style={[st.field, st.col]}>
            <Text style={st.label}>Date To</Text>
            <DmyDateField value={dateTo} onChange={setDateTo} />
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

        {/* Print Type */}
        <View style={st.field}>
          <Text style={st.label}>Print Type</Text>
          <TouchableOpacity style={st.box} onPress={() => toggle('ptype')} accessibilityRole="button" accessibilityLabel="Select print type">
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
              {!ptLoading && ptypes.length === 0 ? <Text style={st.hint}>No print type found</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={st.actions}>
          <Btn label="Cancel" kind="ghost" onPress={onClose} disabled={busy} style={{ flex: 1 }} />
          <Btn label="OK" icon="print" onPress={submit} loading={busy} style={{ flex: 1.4 }} />
        </View>
      </View>
    </Sheet>
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
