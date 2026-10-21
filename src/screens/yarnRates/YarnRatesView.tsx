// FILE: src/screens/yarnRates/YarnRatesView.tsx
// Yarn Rates — the ERP Designing artifact's "Yarn Rates" master (YarnRatesMaster) on live ERP data.
//
//   Add rate     yarn (main yarns of the group) · supplier (Dyeing shade party list + yarn suppliers of the group) ·
//                date · ₹ per kg · remark. Picking a yarn pre-fills its current rate; warns when a later-dated entry
//                already exists (the current rate is the latest-dated entry, so an older date will not replace it)
//   List         search + All / With rate / No rate; "Latest rate by yarn" then "No rate yet"
//                each yarn: current ₹/kg, supplier · date · suppliers · entries, ▲ / ▼ % vs that supplier's previous quote
//   Yarn (tap)   price trend (one line per supplier) and every rate entry newest first (edit / delete by rights)
//
// EVERYTHING comes from the new table TMSMASTER.dbo.FAMIYarnRate — no purchase / old data on this screen.
// Rights (production.yarn_rates): view · add · edit · delete.
// Data: POST /api/yarn_rates/list | item | parties | save | delete (YarnRateController) with { prptype, yearno } of
// the login (header) — PROPERTY GROUP wise, no property code anywhere. Rates up to the FY end; add / modify / delete
// only for dates inside the login year (backend checks the same).

import AppAlert from '@/common/utils/appAlert';
import { YarnRateAPI } from '@/src/api/legacyClient';
import { PoyDateField } from '@/src/components/PoyRateEntryNEW/PoyDateField';
import { Btn, Opt, SelectField } from '@/src/components/StockVerificationNEW/ui';
import { useBusinessContext } from '@/src/core/business';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { C } from '../yarnHub/yarnHubModel';
import { YarnPriceChart } from '../yarnHub/YarnPriceChart';
import {
  chartPoints,
  cleanRate,
  dateFull,
  dateToIso,
  errText,
  Fy,
  inFy,
  isoToDate,
  isoToday,
  ItemData,
  latestOf,
  ListData,
  matches,
  MAX_RATE,
  normalizeItem,
  normalizeList,
  normalizeParties,
  Party,
  RateRow,
  rupee,
  searchText,
  timeOf,
  unwrap,
  YarnRow,
  yarnRows,
} from './yarnRatesModel';

const RES = 'production.yarn_rates';
const MF = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" }) as string;
type Chip = 'all' | 'with' | 'none';
type Tab = 'rates' | 'entries';
type Period = 'month' | '3m' | 'fy' | 'all';
type Form = { itm: string; par: string; date: string; rate: string; remark: string; edit: RateRow | null };
/** default rate date: today when it is inside the selected FY, else the FY's last day */
const defDate = (fy?: Fy | null) => (!fy || inFy(isoToday(), fy) ? isoToday() : fy.to);
const emptyForm = (fy?: Fy | null): Form => ({ itm: '', par: '', date: defDate(fy), rate: '', remark: '', edit: null });

export function YarnRatesView() {
  const { prpGroup, yearNo } = useBusinessContext();
  const { canDo } = usePermission();
  const canAdd = canDo(RES, 'add');
  const canEdit = canDo(RES, 'edit');
  const canDelete = canDo(RES, 'delete');

  const [cw, setCw] = useState(0);
  const wide = cw >= 1000;
  const narrow = cw > 0 && cw < 600;
  const [data, setData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [parties, setParties] = useState<Party[]>([]);
  const [partyErr, setPartyErr] = useState('');
  const [partyLoading, setPartyLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('rates');
  const [eq, setEq] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [eMax, setEMax] = useState(100);
  const [q, setQ] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ItemData>>({});
  const [detailErr, setDetailErr] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const scrollRef = useRef<any>(null);
  const req = useRef(0);

  // group, login property and year: all from the header (login)
  const yearno = String(parseInt(String(yearNo), 10) || '');
  // group + year of the login (header) — no property code
  const ctx = useMemo(() => ({ prptype: prpGroup, yearno }), [prpGroup, yearno]);
  const ready = !!(prpGroup && yearno);
  const fy: Fy | null = data && data.fy.yearno === yearno ? data.fy : null;

  const say = useCallback((kind: 'ok' | 'err', text: string) => setFlash({ kind, text }), []);

  /* ------------------------------ load ------------------------------ */
  const loadList = useCallback(async (pull = false) => {
    if (!ready) return;
    const id = ++req.current;
    pull ? setRefreshing(true) : setLoading(true);
    setErr('');
    try {
      const d = normalizeList(unwrap(await YarnRateAPI.list(ctx)));
      if (id !== req.current) return;
      setData(d);
      if (pull) setDetails({});
    } catch (e) {
      if (id === req.current) setErr(errText(e, 'Unable to load yarn rates.'));
    } finally {
      if (id === req.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [ctx, ready]);

  const loadParties = useCallback(async () => {
    if (!ready) return;
    setPartyLoading(true);
    setPartyErr('');
    try {
      setParties(normalizeParties(unwrap(await YarnRateAPI.parties(ctx))));
    } catch (e) {
      setPartyErr(errText(e, 'Supplier list not available.'));
    } finally {
      setPartyLoading(false);
    }
  }, [ctx, ready]);

  const loadItem = useCallback(async (itm: string) => {
    setDetailErr((x) => ({ ...x, [itm]: '' }));
    try {
      const d = normalizeItem(unwrap(await YarnRateAPI.item({ ...ctx, itmcode: itm })));
      setDetails((x) => ({ ...x, [itm]: d }));
    } catch (e) {
      setDetailErr((x) => ({ ...x, [itm]: errText(e, 'Unable to load this yarn.') }));
    }
  }, [ctx]);

  useFocusEffect(
    useCallback(() => {
      // year changed (or screen opened): never show the old year's lists
      setData(null);
      setParties([]);
      setDetails({});
      setDetailErr({});
      setOpen(null);
      setForm(emptyForm());
      setFlash(null);
      void loadList();
      if (canAdd || canEdit) void loadParties();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx]),
  );

  // the FY arrived with the list: bring a new entry's date inside it
  useEffect(() => {
    if (fy) setForm((f) => (f.edit || inFy(f.date, fy) ? f : { ...f, date: defDate(fy) }));
  }, [fy]);

  /** modify / delete only on entries dated inside the login year */
  const changeable = (r: RateRow) => !!data && inFy(r.date, fy);

  /** rates of one yarn changed (save / delete): refresh the list rows and the open detail from the answer */
  const applyItem = (d: ItemData) => {
    setDetails((x) => ({ ...x, [d.itmcode]: d }));
    setData((cur) => (cur ? { ...cur, rates: cur.rates.filter((r) => r.itmcode !== d.itmcode).concat(d.rates) } : cur));
  };

  /* ------------------------------ rows ------------------------------ */
  const rows: YarnRow[] = useMemo(() => (data ? yarnRows(data.items, data.rates) : []), [data]);
  const shown = useMemo(
    () => rows.filter((y) => matches(searchText(y), q) && (chip === 'all' || (chip === 'with' ? !!y.lf : !y.lf))),
    [rows, q, chip],
  );
  const withRate = shown.filter((y) => y.lf);
  const without = shown.filter((y) => !y.lf);

  const itemOpts: Opt[] = useMemo(
    () => rows.map((y) => ({ value: y.itmcode, label: `${y.name}  ·  ${y.itmcode}`, searchText: `${y.itmcode} ${y.name} ${y.catsub} ${y.subs.join(' ')}` })),
    [rows],
  );
  const partyOpts: Opt[] = useMemo(() => {
    const list = parties.map((p) => ({ value: p.code, label: p.name, searchText: `${p.name} ${p.short} ${p.code} ${p.src.join(' ')}` }));
    if (form.par && !list.some((o) => o.value === form.par)) list.unshift({ value: form.par, label: form.edit?.party || form.par, searchText: form.par });
    return list;
  }, [parties, form.par, form.edit]);

  const selYarn = rows.find((y) => y.itmcode === form.itm) || null;
  const later = selYarn && selYarn.lf && selYarn.lf.date > form.date && (!form.edit || selYarn.lf !== form.edit) ? selYarn.lf : null;
  const rateNum = parseFloat(form.rate);
  const problems: string[] = [];
  if (!form.itm) problems.push('Select the yarn.');
  if (!form.par) problems.push('Select the supplier.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) problems.push('Enter the date.');
  else if (form.date > isoToday()) problems.push('Rate date cannot be in the future.');
  else if (fy && !inFy(form.date, fy)) problems.push(`Date must be inside ${fy.name} (${dateFull(fy.from)} to ${dateFull(fy.to)}).`);
  if (!(rateNum > 0)) problems.push('Enter the rate (₹ per kg).');
  else if (rateNum > MAX_RATE) problems.push('Rate looks too high.');
  const formOk = !problems.length;

  /* ------------------------------ actions ------------------------------ */
  const pickYarn = (v: string) => {
    const y = rows.find((r) => r.itmcode === v);
    setForm((f) => ({ ...f, itm: v, rate: !f.edit && f.rate === '' && y?.lf ? String(y.lf.rate) : f.rate }));
  };

  const doSave = async (replace = 0) => {
    if (!formOk) {
      say('err', problems[0]);
      return;
    }
    if (!(form.edit ? canEdit : canAdd)) {
      say('err', 'You do not have permission for this action.');
      return;
    }
    setSaving(true);
    const body: Record<string, any> = {
      ...ctx, itmcode: form.itm, parcode: form.par, date: form.date, rate: form.rate, remark: form.remark.trim(), replace,
    };
    if (form.edit) body.orig = { itmcode: form.edit.itmcode, parcode: form.edit.parcode, date: form.edit.date };
    try {
      const res: any = await YarnRateAPI.save(body);
      const raw = unwrap(res);
      const d = normalizeItem(raw);
      applyItem(d);
      // modify moved the rate to another yarn: refresh the old yarn's book too
      if (raw?.moved_from?.itmcode) applyItem(normalizeItem({ itmcode: raw.moved_from.itmcode, rates: raw.moved_from.rates }));
      const party = partyOpts.find((o) => o.value === form.par)?.label || form.par;
      say('ok', `${res?.data?.message || 'Saved.'} ${selYarn?.name || form.itm} · ${rupee(rateNum)}/kg · ${party} · ${dateFull(form.date)}`);
      setOpen(form.itm);
      setForm((f) => ({ ...emptyForm(fy), date: f.date }));
    } catch (e: any) {
      const r = e?.response;
      if (r?.status === 409 && r?.data?.code === 'exists') {
        AppAlert.alert('Rate already entered', r.data.message || 'This supplier already has a rate for this yarn on this date.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', onPress: () => void doSave(1) },
        ]);
      } else {
        say('err', errText(e, 'Save failed.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: RateRow) => {
    if (!changeable(r)) {
      say('err', `This entry is dated ${dateFull(r.date)} — select its year to modify it.`);
      return;
    }
    setTab('rates');
    setForm({ itm: r.itmcode, par: r.parcode, date: r.date, rate: String(r.rate), remark: r.remark, edit: r });
    setFlash(null);
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  };

  const del = (r: RateRow) => {
    if (!canDelete) return;
    if (!changeable(r)) {
      say('err', `This entry is dated ${dateFull(r.date)} — select its year to delete it.`);
      return;
    }
    const yn = rows.find((y) => y.itmcode === r.itmcode)?.name || r.itmcode;
    AppAlert.alert('Delete rate permanently?', `${yn}\n${r.party} · ${rupee(r.rate)}/kg · ${dateFull(r.date)}\n\nThe entry is removed from the database (hard delete) and cannot be brought back.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res: any = await YarnRateAPI.remove({ ...ctx, itmcode: r.itmcode, parcode: r.parcode, date: r.date });
            applyItem(normalizeItem(unwrap(res)));
            if (form.edit && form.edit.parcode === r.parcode && form.edit.date === r.date && form.edit.itmcode === r.itmcode) setForm(emptyForm(fy));
            say('ok', `Rate deleted permanently — ${yn} · ${r.party} · ${rupee(r.rate)} · ${dateFull(r.date)}`);
          } catch (e) {
            say('err', errText(e, 'Delete failed.'));
          }
        },
      },
    ]);
  };

  const toggle = (y: YarnRow) => {
    const next = open === y.itmcode ? null : y.itmcode;
    setOpen(next);
    if (next && !details[next]) void loadItem(next);
  };

  /* ------------------------------ render ------------------------------ */
  if (!ready) {
    return <View style={st.center}><Text style={st.muted}>Select the group and year in the header first.</Text></View>;
  }

  const addCard = (canAdd || form.edit) ? (
    <View style={[st.card, { padding: 14 }]}>
      <View style={st.cardHead}>
        <Text style={st.eyebrow}>{form.edit ? 'EDIT RATE' : 'ADD RATE'}</Text>
        {form.edit ? <Text onPress={() => setForm(emptyForm(fy))} style={st.link}>Cancel edit</Text> : null}
      </View>
      {form.edit ? (
        <Text style={st.note}>
          Editing {form.edit.party} · {rupee(form.edit.rate)} · {dateFull(form.edit.date)}
        </Text>
      ) : null}
      <View style={{ gap: 10 }}>
        <SelectField label="Yarn" required value={form.itm} options={itemOpts} onChange={(v) => pickYarn(v)} placeholder="Select yarn…" loading={loading && !data} style={st.full} />
        <View style={st.pair}>
          <SelectField
            label="Supplier" required value={form.par} options={partyOpts} onChange={(v) => setForm((f) => ({ ...f, par: v }))}
            placeholder={partyErr ? 'Supplier list not available' : 'Select supplier…'} loading={partyLoading} onRefresh={() => void loadParties()}
            disabled={!partyLoading && !partyOpts.length} disabledHint={partyErr || 'No supplier found'} style={st.half}
          />
          <View style={st.half}>
            <Text style={st.label}>DATE<Text style={{ color: T.red }}> *</Text></Text>
            <PoyDateField value={isoToDate(form.date)} onChange={(d) => setForm((f) => ({ ...f, date: dateToIso(d) }))} />
            {fy ? <Text style={[st.eBy, { marginTop: 3 }]}>{fy.name}: {dateFull(fy.from)} – {dateFull(fy.to)}</Text> : null}
          </View>
        </View>
        <View style={st.pair}>
          <View style={st.half}>
            <Text style={st.label}>RATE ₹ / KG<Text style={{ color: T.red }}> *</Text></Text>
            <TextInput
              value={form.rate} onChangeText={(v) => setForm((f) => ({ ...f, rate: cleanRate(v) }))} keyboardType="decimal-pad" placeholder="₹ per kg"
              placeholderTextColor={T.muted} style={[st.input, { fontFamily: MF }]} accessibilityLabel="Rate per kg"
            />
          </View>
          <View style={st.half}>
            <Text style={st.label}>REMARK</Text>
            <TextInput
              value={form.remark} onChangeText={(v) => setForm((f) => ({ ...f, remark: v.slice(0, 100) }))} placeholder="Optional"
              placeholderTextColor={T.muted} style={st.input} accessibilityLabel="Remark"
            />
          </View>
        </View>
        {later ? (
          <Text style={st.warn}>
            This yarn already has an entry dated {dateFull(later.date)} ({later.party}, {rupee(later.rate)}). The current rate is the latest-dated entry,
            so a rate dated {dateFull(form.date)} will not replace it — change the date if this is the newer price.
          </Text>
        ) : null}
        <Btn
          label={form.edit ? 'Save change' : 'Add rate'} icon={form.edit ? 'save' : 'add'} kind="primary" loading={saving}
          disabled={!formOk || !(form.edit ? canEdit : canAdd)} onPress={() => void doSave()}
        />
        {form.itm || form.par || form.rate ? !formOk ? <Text style={st.hint}>Next: {problems[0]}</Text> : null : null}
      </View>
    </View>
  ) : null;

  const yarnRow = (y: YarnRow) => {
    const on = open === y.itmcode;
    const sub = y.lf
      ? `${y.lf.party} · ${dateFull(y.lf.date)}${y.nSup > 1 ? ` · ${y.nSup} suppliers` : ''} · ${y.rates.length} entr${y.rates.length !== 1 ? 'ies' : 'y'}`
      : 'no rate entered';
    return (
      <View key={y.itmcode} style={[st.card, st.yRow]}>
        <Pressable onPress={() => toggle(y)} style={(s: any) => [st.yHead, (s.hovered || s.pressed) && { opacity: 0.85 }]} accessibilityLabel={`Yarn ${y.name}`}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.yName} numberOfLines={1}>{y.name}</Text>
            <Text style={st.ySub} numberOfLines={2}>{sub}</Text>
          </View>
          {y.delta != null && Math.abs(y.delta) >= 0.05 ? (
            <Text style={[st.delta, { color: y.delta > 0 ? T.red : T.green }]}>{y.delta > 0 ? '▲ ' : '▼ '}{Math.abs(y.delta).toFixed(1)}%</Text>
          ) : null}
          <Text style={[st.yRate, { color: y.lf ? T.copper : T.muted }]}>{y.lf ? rupee(y.lf.rate) : '—'}</Text>
          <Text style={st.chev}>{on ? '✕' : '›'}</Text>
        </Pressable>
        {on ? detail(y) : null}
      </View>
    );
  };

  const detail = (y: YarnRow) => {
    const d = details[y.itmcode];
    const e = detailErr[y.itmcode];
    if (!d) {
      return (
        <View style={st.detail}>
          {e ? (
            <Text style={[st.note, { color: T.red }]} onPress={() => void loadItem(y.itmcode)}>{e} · tap to retry</Text>
          ) : <ActivityIndicator color={T.copper} style={{ marginVertical: 12 }} />}
        </View>
      );
    }
    const lf = latestOf(d.rates);
    const entries = d.rates.slice().sort((a, b) => (b.date + '|' + (b.ts || '')).localeCompare(a.date + '|' + (a.ts || '')));
    const pts = chartPoints(d.rates);
    return (
      <View style={st.detail}>
        <Text style={st.note}>
          Rate history by supplier · current rate:{' '}
          {lf ? <Text style={{ color: T.copper, fontWeight: '800', fontFamily: MF }}>{rupee(lf.rate)} · {lf.party} · {dateFull(lf.date)}{lf.ts ? ', ' + timeOf(lf.ts) : ''}</Text> : 'none yet'}
        </Text>
        {pts.length >= 2 ? (
          <YarnPriceChart points={pts} height={200} />
        ) : (
          <Text style={st.note}>{pts.length ? 'One entry so far — the trend appears from the second entry.' : 'No rates entered yet.'}</Text>
        )}
        <Text style={st.head}>ENTRIES · {entries.length}</Text>
        {entries.map((r) => {
          const time = r.ts ? timeOf(r.ts) : '';
          const by = [r.user ? 'by ' + r.user : '', r.uuser ? 'edited by ' + r.uuser : '', r.remark].filter(Boolean).join(' · ');
          const acts = !changeable(r) ? ((canEdit || canDelete) ? <Text style={st.eBy}>other FY</Text> : null) : (
            <>
              {canEdit ? <Text onPress={() => startEdit(r)} style={st.act} accessibilityLabel="Edit rate">Edit</Text> : null}
              {canDelete ? <Text onPress={() => del(r)} style={[st.act, { color: T.red }]} accessibilityLabel="Delete rate">Delete</Text> : null}
            </>
          );
          const dateEl = <Text style={st.eDate}>{dateFull(r.date)}{time ? <Text style={st.eTime}> {time}</Text> : null}</Text>;
          const who = (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.eParty} numberOfLines={narrow ? 2 : 1}>{r.party}</Text>
              {by ? <Text style={st.eBy} numberOfLines={narrow ? 2 : 1}>{by}</Text> : null}
            </View>
          );
          const rateEl = <Text style={st.eRate}>{rupee(r.rate)}</Text>;
          const k = r.itmcode + '|' + r.parcode + '|' + r.date;
          return narrow ? (
            <View key={k} style={[st.entry, { flexDirection: 'column', alignItems: 'stretch', gap: 4 }]}>
              <View style={st.eLine}>{dateEl}<View style={{ flex: 1 }} />{rateEl}</View>
              <View style={st.eLine}>{who}{acts}</View>
            </View>
          ) : (
            <View key={k} style={st.entry}>
              {dateEl}{who}{rateEl}{acts}
            </View>
          );
        })}
        {!entries.length ? <Text style={st.note}>No rates entered yet for this yarn.</Text> : null}
      </View>
    );
  };

  /* ------- All entries (register): every rate of the group up to the FY end, newest first — Modify / Delete ------- */
  const today = isoToday();
  const fromOf = (p: Period) => {
    if (p === 'month') return today.slice(0, 8) + '01';
    if (p === '3m') { const d = isoToDate(today); d.setDate(d.getDate() - 90); return dateToIso(d); }
    if (p === 'fy') return fy?.from || '';
    return '';
  };
  const nameOf = (itm: string) => rows.find((y) => y.itmcode === itm)?.name || itm;
  // (plain computation, not a hook: this part runs only after the "not ready" early return)
  const allEntries = (() => {
    const from = fromOf(period);
    return (data?.rates || [])
      .filter((r) => !from || r.date >= from)
      .map((r) => ({ r, yarn: nameOf(r.itmcode) }))
      .filter((x) => matches([x.yarn, x.r.itmcode, x.r.party, x.r.parcode, x.r.remark, x.r.user, x.r.uuser].join(' '), eq))
      .sort((a, b) => b.r.date.localeCompare(a.r.date) || (b.r.uts || b.r.ts).localeCompare(a.r.uts || a.r.ts));
  })();
  const register = (
    <View style={{ gap: 8 }}>
      <View style={st.fRow}>
        <TextInput
          value={eq} onChangeText={(v) => { setEq(v); setEMax(100); }} placeholder="Search yarn, supplier, remark, user…" placeholderTextColor={T.muted}
          style={[st.input, { flex: 1 }, !!eq && { borderColor: T.copper }]} autoCorrect={false} autoCapitalize="none" accessibilityLabel="Search entries"
        />
        {eq || period !== 'all' ? <Text onPress={() => { setEq(''); setPeriod('all'); }} style={st.link}>Clear</Text> : null}
      </View>
      <View style={st.chipRow}>
        {([['all', 'All'], ['month', 'This month'], ['3m', 'Last 3 months'], ['fy', fy ? fy.name : 'This FY']] as [Period, string][]).map(([k, l]) => (
          <Text key={k} onPress={() => { setPeriod(k); setEMax(100); }} style={[st.chip, period === k && st.chipOn]}>{l}</Text>
        ))}
      </View>
      <Text style={st.head}>ENTRIES · {allEntries.length}{data ? ` of ${data.rates.length}` : ''}</Text>
      {allEntries.slice(0, eMax).map(({ r, yarn }) => (
        <View key={r.itmcode + '|' + r.parcode + '|' + r.date} style={[st.card, { padding: 10, gap: 4 }]}>
          <View style={st.eLine}>
            <Text style={st.eDate}>{dateFull(r.date)}</Text>
            <View style={{ flex: 1 }} />
            <Text style={[st.eRate, { color: T.copper }]}>{rupee(r.rate)}</Text>
          </View>
          <Text style={st.yName} numberOfLines={2}>{yarn} <Text style={st.eBy}>· {r.itmcode}</Text></Text>
          <View style={st.eLine}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.eParty} numberOfLines={1}>{r.party}</Text>
              <Text style={st.eBy} numberOfLines={2}>
                {[r.user ? 'added by ' + r.user + (r.ts ? ' ' + dateFull(r.ts.slice(0, 10)) + ' ' + timeOf(r.ts) : '') : '',
                  r.uuser ? 'modified by ' + r.uuser + (r.uts ? ' ' + dateFull(r.uts.slice(0, 10)) + ' ' + timeOf(r.uts) : '') : '',
                  r.remark].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {!changeable(r) ? ((canEdit || canDelete) ? <Text style={st.eBy}>other FY</Text> : null) : (
              <>
                {canEdit ? <Text onPress={() => startEdit(r)} style={st.act} accessibilityLabel="Modify entry">Modify</Text> : null}
                {canDelete ? <Text onPress={() => del(r)} style={[st.act, { color: T.red }]} accessibilityLabel="Delete entry">Delete</Text> : null}
              </>
            )}
          </View>
        </View>
      ))}
      {allEntries.length > eMax ? <Btn label={`Show more (${allEntries.length - eMax} left)`} kind="ghost" compact onPress={() => setEMax((n) => n + 100)} /> : null}
      {!allEntries.length && data ? <Text style={st.note}>{eq || period !== 'all' ? 'No entry matches.' : 'No rates entered yet.'}</Text> : null}
    </View>
  );

  const total = rows.length;
  const filtered = !!q.trim() || chip !== 'all';
  const list = (
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={st.fBar}>
        <View style={st.fRow}>
          <TextInput
            value={q} onChangeText={setQ} placeholder="Search yarn, code or supplier…" placeholderTextColor={T.muted}
            style={[st.input, { flex: 1 }, !!q && { borderColor: T.copper }]} autoCorrect={false} autoCapitalize="none" accessibilityLabel="Search yarn"
          />
          {filtered ? <Text onPress={() => { setQ(''); setChip('all'); }} style={st.link}>Clear</Text> : null}
        </View>
        <View style={st.chipRow}>
          {([['all', 'All'], ['with', 'With rate'], ['none', 'No rate yet']] as [Chip, string][]).map(([k, l]) => (
            <Text key={k} onPress={() => setChip(k)} style={[st.chip, chip === k && st.chipOn]}>{l}</Text>
          ))}
        </View>
        {filtered ? <Text style={st.count}>{shown.length} of {total} shown</Text> : null}
      </View>
      {chip !== 'none' ? (
        <>
          <Text style={st.head}>LATEST RATE BY YARN · {withRate.length}</Text>
          {withRate.map(yarnRow)}
          {!withRate.length && data ? <Text style={st.note}>{q.trim() ? 'No rates match.' : 'No rates entered yet — add the first one above.'}</Text> : null}
        </>
      ) : null}
      {chip !== 'with' && without.length ? (
        <>
          <Text style={st.head}>NO RATE YET · {without.length}</Text>
          {without.map(yarnRow)}
        </>
      ) : null}
      {chip === 'none' && !without.length && data ? <Text style={st.note}>Every yarn shown has a rate.</Text> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }} onLayout={(e) => setCw(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={st.pad}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadList(true); void loadParties(); }} />}
      >
        <View style={st.wrap}>
          <Text style={st.intro}>
            Rate of each yarn, by supplier and date (entered here). The current rate is the <Text style={{ fontWeight: '800' }}>latest</Text> entry. Tap a yarn for its price trend.
            {data && fy ? `  ·  ${fy.name}` : ''}
          </Text>
          {flash ? (
            <View style={[st.flash, { backgroundColor: flash.kind === 'ok' ? T.green : T.red }]}>
              <Text style={st.flashText}>{flash.kind === 'ok' ? '✓ ' : ''}{flash.text}</Text>
              <Text onPress={() => setFlash(null)} style={st.flashX}>✕</Text>
            </View>
          ) : null}
          {err ? (
            <View style={[st.card, { padding: 14, gap: 8 }]}>
              <Text style={{ color: T.red, fontWeight: '700' }}>{err}</Text>
              <Btn label="Retry" icon="refresh" kind="ghost" compact onPress={() => void loadList()} />
            </View>
          ) : null}
          {loading && !data && !err ? <ActivityIndicator color={T.copper} style={{ marginVertical: 30 }} /> : null}
          {data ? (
            <View style={st.tabs}>
              {([['rates', 'Rates'], ['entries', `All entries (${data.rates.length})`]] as [Tab, string][]).map(([k, l]) => (
                <Text key={k} onPress={() => setTab(k)} style={[st.tab, tab === k && st.tabOn]} accessibilityLabel={'Tab ' + k}>{l}</Text>
              ))}
            </View>
          ) : null}
          {data && tab === 'entries' ? register : null}
          {data && tab === 'rates' ? (
            wide ? (
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
                {addCard ? <View style={{ width: 380 }}>{addCard}</View> : null}
                {list}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {addCard}
                {list}
              </View>
            )
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  pad: { padding: 12, paddingBottom: 40 },
  wrap: { width: '100%', maxWidth: 1200, alignSelf: 'center', gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: T.bg },
  intro: { fontSize: 12, color: C.mut, lineHeight: 18 },
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: C.bd },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: C.mut, letterSpacing: 0.6 },
  label: { fontSize: 11, fontWeight: '700', color: C.mut, letterSpacing: 0.5, marginBottom: 6 },
  full: { flexBasis: '100%', minWidth: 0 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  half: { flexGrow: 1, flexShrink: 1, flexBasis: 150, minWidth: 0 },
  input: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, fontSize: 14, color: T.ink, backgroundColor: T.surface, minHeight: 42 },
  warn: { fontSize: 11.5, color: '#9A6B12', backgroundColor: '#FBF1DC', borderWidth: 1, borderColor: '#EAD9A8', borderRadius: 8, padding: 9, lineHeight: 17 },
  note: { fontSize: 12, color: C.mut, lineHeight: 18 },
  hint: { fontSize: 11.5, color: T.amber, textAlign: 'center' },
  link: { fontSize: 12.5, fontWeight: '800', color: T.copper, paddingHorizontal: 6, paddingVertical: 4 },
  flash: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
  flashText: { flex: 1, color: '#fff', fontSize: 12.5, fontWeight: '700' },
  flashX: { color: '#fff', fontSize: 14, fontWeight: '800', paddingHorizontal: 4 },
  fBar: { gap: 8, marginBottom: 4 },
  fRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontSize: 12, fontWeight: '700', color: C.mut, borderWidth: 1, borderColor: C.bd, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 5, overflow: 'hidden', backgroundColor: T.surface },
  chipOn: { backgroundColor: T.copper, borderColor: T.copper, color: '#fff' },
  count: { fontSize: 11, color: C.faint },
  head: { fontSize: 10.5, fontWeight: '800', color: C.mut, letterSpacing: 0.6, marginTop: 14, marginBottom: 7 },
  yRow: { paddingHorizontal: 12, paddingVertical: 10, marginBottom: 7 },
  yHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yName: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  ySub: { fontSize: 11, color: C.mut, marginTop: 1 },
  delta: { fontSize: 11, fontWeight: '800', fontFamily: MF },
  yRate: { fontSize: 15, fontWeight: '800', fontFamily: MF, minWidth: 70, textAlign: 'right' },
  chev: { fontSize: 13, color: C.mut, width: 14, textAlign: 'center' },
  detail: { marginTop: 9, borderTopWidth: 1, borderTopColor: T.alt, paddingTop: 9, gap: 8 },
  entry: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: T.alt },
  tabs: { flexDirection: 'row', gap: 6, borderBottomWidth: 1, borderBottomColor: C.bd },
  tab: { fontSize: 13, fontWeight: '800', color: C.mut, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { color: T.nav, borderBottomColor: T.copper },
  eLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eDate: { fontFamily: MF, fontSize: 11.5, color: C.mut, minWidth: 92 },
  eTime: { fontSize: 10 },
  eParty: { fontSize: 12.5, color: T.ink, fontWeight: '600' },
  eBy: { fontSize: 10.5, color: C.faint },
  badge: { fontSize: 9.5, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  eRate: { fontFamily: MF, fontSize: 13, fontWeight: '800', color: T.ink, minWidth: 64, textAlign: 'right' },
  act: { fontSize: 11.5, fontWeight: '800', color: T.nav, borderWidth: 1, borderColor: T.border, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  muted: { color: C.mut },
});
