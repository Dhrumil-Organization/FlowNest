// FILE: src/screens/beamReport/BeamReportScreen.tsx
// Beam Report: two tabs.
//  - Beam Outward: beam no., party, from–to, All / Pending only → one row per beam: received, pending,
//    inward(s) that brought it back, gate pass, days out.
//  - Beam Inward : beam no., party, from–to → one row per beam with the Beam Outward (or yarn inward) it came back on.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { createBeamReportService, type ReportFilter } from '../../api/beamReportAPI';
import { useBusinessContext } from '../../core/business';
import { useDeviceClass } from '../../core/layout/useDeviceClass';
import { usePermission } from '../../core/permissions';
import type { BeamContext, Opt } from '../../features/beamInOut/types';
import { inTotals, outTotals, toCsv, type InRow, type OutRow, type ReportKind } from '../../features/beamReport/logic';
import { OptionPicker } from '../../features/repacking/components/OptionPicker';
import { MasterPicker } from '../../features/repackingIssue/components/MasterPicker';
import { Banner, Btn, Card, Field, Input, Segmented, SelectBox, Stat } from '../../features/repackingIssue/components/ui';
import { notify } from '../../features/repackingIssue/dialog';
import { isValidDMY, maskDMY, todayDMY } from '../../features/repackingIssue/logic';
import { C, R, SP } from '../../features/repackingIssue/theme';
import type { LookupKind, LookupOption } from '../../features/repackingIssue/types';
import { BEAM_REPORT } from '../../registry/modules/beamReport.module';

type Ranges = 'today' | 'month' | 'last30' | 'fy' | 'custom';
const p2 = (n: number) => String(n).padStart(2, '0');
const dmy = (d: Date) => `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`;
const monthStart = () => { const d = new Date(); return dmy(new Date(d.getFullYear(), d.getMonth(), 1)); };
const fyStart = () => { const d = new Date(); return dmy(new Date(d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1, 3, 1)); };
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dmy(d); };
const key = (v: string) => Number(v.split('-').reverse().join('')) || 0;
const f3 = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const f2 = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const service = createBeamReportService();

export default function BeamReportScreen() {
  const { prpCode, yearNo, yearName, strCode } = useBusinessContext();
  const { canDo } = usePermission();
  const { isPhone, isDesktop } = useDeviceClass();

  const can = {
    outward: canDo(BEAM_REPORT.outward, 'view'),
    inward: canDo(BEAM_REPORT.inward, 'view'),
    outExport: canDo(BEAM_REPORT.outward, 'export'),
    inExport: canDo(BEAM_REPORT.inward, 'export'),
  };

  const [ctx, setCtx] = useState<BeamContext>({ prpCode, prpName: prpCode, yearNo: Number(yearNo) || 0, yearLabel: yearName || String(yearNo), strCode, strName: strCode });
  useEffect(() => { setCtx(c => ({ ...c, prpCode, prpName: prpCode, yearNo: Number(yearNo) || 0, yearLabel: yearName || String(yearNo) })); }, [prpCode, yearNo, yearName]);

  const [tab, setTab] = useState<ReportKind>(can.outward ? 'outward' : 'inward');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayDMY());
  const [range, setRange] = useState<Ranges>('month');
  const [party, setParty] = useState<Opt | null>(null);
  const [beamNo, setBeamNo] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [rows, setRows] = useState<(OutRow | InRow)[]>([]);
  const [ranFor, setRanFor] = useState<ReportKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState<'party' | LookupKind | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(!isPhone);

  const rangeErr = !isValidDMY(from) ? 'Enter From date' : !isValidDMY(to) ? 'Enter To date' : key(from) > key(to) ? 'From is after To' : '';

  /* property / year names */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, y] = await Promise.all([
          ctx.prpName === ctx.prpCode ? service.lookup('property', ctx).then(l => l.find(o => o.code === ctx.prpCode)) : undefined,
          ctx.yearLabel === String(ctx.yearNo) ? service.lookup('year', ctx).then(l => l.find(o => o.code === String(ctx.yearNo))) : undefined,
        ]);
        if (alive && (p || y)) setCtx(c => ({ ...c, prpName: p?.name ?? c.prpName, yearLabel: y?.name ?? c.yearLabel }));
      } catch { /* codes stay */ }
    })();
    return () => { alive = false; };
  }, [ctx.prpCode, ctx.yearNo]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback(async (kind: ReportKind = tab) => {
    if (rangeErr) return setError(rangeErr);
    setLoading(true);
    setError('');
    try {
      const f: ReportFilter = { from, to, parCode: party?.code ?? '', beamNo, pendingOnly: kind === 'outward' && pendingOnly };
      const list = kind === 'outward' ? await service.outward(ctx, f) : await service.inward(ctx, f);
      setRows(list);
      setRanFor(kind);
      if (isPhone) setFiltersOpen(false);
    } catch (e: any) {
      setRows([]);
      setRanFor(kind);
      setError(e?.message || 'Report could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [tab, from, to, party, beamNo, pendingOnly, ctx, rangeErr, isPhone]);

  useEffect(() => { if (can.outward || can.inward) run(tab); }, [tab, ctx.prpCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickRange = (r: Ranges) => {
    setRange(r);
    if (r === 'today') { setFrom(todayDMY()); setTo(todayDMY()); }
    if (r === 'month') { setFrom(monthStart()); setTo(todayDMY()); }
    if (r === 'last30') { setFrom(daysAgo(29)); setTo(todayDMY()); }
    if (r === 'fy') { setFrom(fyStart()); setTo(todayDMY()); }
  };

  const shown = ranFor === tab ? rows : [];
  const ot = useMemo(() => outTotals(tab === 'outward' ? (shown as OutRow[]) : []), [shown, tab]);
  const it = useMemo(() => inTotals(tab === 'inward' ? (shown as InRow[]) : []), [shown, tab]);
  const canExport = tab === 'outward' ? can.outExport : can.inExport;

  const exportCsv = async () => {
    if (!shown.length) return;
    const csv = toCsv(tab, shown);
    const name = `beam_${tab}_${from}_${to}.csv`;
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        await Share.share({ title: name, message: csv });
      }
    } catch (e: any) {
      notify('Export', e?.message || 'Could not export.');
    }
  };

  if (!can.outward && !can.inward) {
    return <View style={st.root}><Banner text="You don't have permission for the Beam Report tabs." /></View>;
  }

  /* ---------------- filters ---------------- */
  const filters = (
    <Card style={{ paddingBottom: SP.sm }}>
      {isPhone ? (
        <Pressable onPress={() => setFiltersOpen(o => !o)} style={st.summary} accessibilityRole="button">
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.sumMain} numberOfLines={1}>{from} → {to}{party ? `  •  ${party.name}` : ''}{beamNo ? `  •  Beam ${beamNo}` : ''}</Text>
            <Text style={st.sumSub} numberOfLines={1}>{ctx.prpName}  •  {ctx.yearLabel}{tab === 'outward' && pendingOnly ? '  •  Pending only' : ''}</Text>
          </View>
          <Icon name={filtersOpen ? 'expand-less' : 'tune'} size={22} color={C.nav} />
        </Pressable>
      ) : null}
      {filtersOpen ? (
        <View style={isPhone ? { marginTop: SP.md } : undefined}>
          <View style={[st.row, isPhone && st.col]}>
            <Field label="Property" style={!isPhone ? { flex: 1.4 } : undefined}>
              <SelectBox icon="apartment" value={ctx.prpName} placeholder="Property" onPress={() => setPicker('property')} />
            </Field>
            <Field label="From" error={rangeErr && rangeErr !== 'Enter To date' ? rangeErr : undefined} style={!isPhone ? { flex: 0.8 } : undefined}>
              <Input value={from} onChangeText={t => { setFrom(maskDMY(t)); setRange('custom'); }} keyboardType="number-pad" placeholder="dd-mm-yyyy" maxLength={10} />
            </Field>
            <Field label="To" error={rangeErr === 'Enter To date' ? rangeErr : undefined} style={!isPhone ? { flex: 0.8 } : undefined}>
              <Input value={to} onChangeText={t => { setTo(maskDMY(t)); setRange('custom'); }} keyboardType="number-pad" placeholder="dd-mm-yyyy" maxLength={10} />
            </Field>
          </View>
          <View style={[st.row, isPhone && st.col]}>
            <Field label="Party" style={!isPhone ? { flex: 1.4 } : undefined}>
              <View style={{ flexDirection: 'row', gap: SP.sm }}>
                <View style={{ flex: 1 }}>
                  <SelectBox icon="business" value={party?.name} code={party?.code} placeholder="All parties" onPress={() => setPicker('party')} />
                </View>
                {party ? <Btn small kind="ghost" icon="close" title="" onPress={() => setParty(null)} /> : null}
              </View>
            </Field>
            <Field label="Beam No." style={!isPhone ? { flex: 0.8 } : undefined}>
              <Input value={beamNo} onChangeText={t => setBeamNo(t.toUpperCase())} placeholder="All beams" autoCapitalize="characters" autoCorrect={false} onSubmitEditing={() => run()} returnKeyType="search" />
            </Field>
            {tab === 'outward' ? (
              <Field label="Show" hint={pendingOnly ? 'Pending: every outward up to the To date' : undefined} style={!isPhone ? { flex: 0.8 } : undefined}>
                <Segmented<'all' | 'pending'>
                  options={[{ value: 'all', label: 'All outward' }, { value: 'pending', label: 'Pending only' }]}
                  value={pendingOnly ? 'pending' : 'all'}
                  onChange={v => setPendingOnly(v === 'pending')}
                />
              </Field>
            ) : <View style={!isPhone ? { flex: 0.8 } : undefined} />}
          </View>
        </View>
      ) : null}
      <View style={st.chips}>
        {([['today', 'Today'], ['month', 'This month'], ['last30', 'Last 30 days'], ['fy', 'This year']] as [Ranges, string][]).map(([v, l]) => (
          <Pressable key={v} onPress={() => pickRange(v)} style={[st.chip, range === v && st.chipOn]} accessibilityRole="button">
            <Text style={[st.chipTxt, range === v && st.chipTxtOn]}>{l}</Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        {canExport && shown.length ? <Btn small kind="ghost" icon="file-download" title="CSV" onPress={exportCsv} /> : null}
        <Btn small icon="search" title="Show" onPress={() => run()} loading={loading} />
      </View>
    </Card>
  );

  /* ---------------- totals ---------------- */
  const totals = tab === 'outward' ? (
    <View style={st.totals}>
      <Stat label="Vouchers" value={String(ot.vouchers)} />
      <Stat label="Beams" value={String(ot.lines)} />
      <Stat label="Qty" value={f3(ot.qty)} />
      <Stat label="Received" value={f3(ot.received)} />
      <Stat label="Pending beams" value={String(ot.pendingBeams)} strong />
      {!isPhone ? <Stat label="Amount" value={f2(ot.amount)} /> : null}
    </View>
  ) : (
    <View style={st.totals}>
      <Stat label="Vouchers" value={String(it.vouchers)} />
      <Stat label="Beams" value={String(it.lines)} />
      <Stat label="Qty" value={f3(it.qty)} />
      <Stat label="Against outward" value={String(it.linked)} />
      <Stat label="Avg days out" value={String(it.avgDays)} strong />
    </View>
  );

  /* ---------------- rows ---------------- */
  const outRow = (r: OutRow, i: number) => {
    const pend = r.pendQty > 0.0005;
    if (!isDesktop) {
      return (
        <View key={r.key} style={st.card}>
          <View style={st.cardTop}>
            <Text style={st.beamNo}>{r.beamNo}</Text>
            <View style={[st.badge, pend ? st.badgePend : st.badgeBack]}>
              <Text style={[st.badgeTxt, { color: pend ? C.cta : C.ok }]}>{pend ? `Pending ${f3(r.pendQty)}` : 'Back'}</Text>
            </View>
          </View>
          <Text style={st.party} numberOfLines={1}>{r.party}</Text>
          <Text style={st.meta}>Out {r.vouNo}  •  {r.date}  •  {r.daysOut} day{r.daysOut === 1 ? '' : 's'}</Text>
          {r.inwards ? <Text style={st.ref} numberOfLines={2}>Back on {r.inwards}</Text> : null}
          <Text style={st.meta}>{r.beamName}  •  {r.info}{r.gatePass ? `  •  Gate pass ${r.gatePass}` : ''}</Text>
        </View>
      );
    }
    return (
      <View key={r.key} style={[st.tr, i % 2 === 1 && { backgroundColor: C.quiet }]}>
        <Text style={[st.td, st.cVou]}>{r.vouNo}{'\n'}<Text style={st.sub}>{r.date}</Text></Text>
        <Text style={[st.td, st.cParty]} numberOfLines={2}>{r.party}</Text>
        <Text style={[st.td, st.cBeam]}><Text style={st.beamTd}>{r.beamNo}</Text>{'\n'}<Text style={st.sub}>{r.beamName}</Text></Text>
        <Text style={[st.td, st.cNum]}>{f3(r.qty)}</Text>
        <Text style={[st.td, st.cNum]}>{f3(r.inQty)}</Text>
        <Text style={[st.td, st.cNum, pend && { color: C.cta, fontWeight: '800' }]}>{f3(r.pendQty)}</Text>
        <Text style={[st.td, st.cRef]} numberOfLines={2}>{r.inwards || '—'}</Text>
        <Text style={[st.td, st.cGp]}>{r.gatePass || '—'}</Text>
        <Text style={[st.td, st.cDays, pend && r.daysOut > 30 && { color: C.danger, fontWeight: '800' }]}>{r.daysOut}</Text>
      </View>
    );
  };

  const inRow = (r: InRow, i: number) => {
    if (!isDesktop) {
      return (
        <View key={r.key} style={st.card}>
          <View style={st.cardTop}>
            <Text style={st.beamNo}>{r.beamNo}</Text>
            {r.daysOut !== null ? <Text style={st.days}>{r.daysOut} day{r.daysOut === 1 ? '' : 's'} out</Text> : null}
          </View>
          <Text style={st.party} numberOfLines={1}>{r.party}</Text>
          <Text style={st.meta}>In {r.vouNo}  •  {r.date}  •  Qty {f3(r.qty)}</Text>
          <Text style={st.ref} numberOfLines={1}>{r.refNo ? `${r.refType} ${r.refNo}  •  ${r.refDate}` : 'No outward linked'}</Text>
          <Text style={st.meta}>{r.beamName}  •  {r.info}</Text>
        </View>
      );
    }
    return (
      <View key={r.key} style={[st.tr, i % 2 === 1 && { backgroundColor: C.quiet }]}>
        <Text style={[st.td, st.cVou]}>{r.vouNo}{'\n'}<Text style={st.sub}>{r.date}</Text></Text>
        <Text style={[st.td, st.cParty]} numberOfLines={2}>{r.party}</Text>
        <Text style={[st.td, st.cBeam]}><Text style={st.beamTd}>{r.beamNo}</Text>{'\n'}<Text style={st.sub}>{r.beamName}</Text></Text>
        <Text style={[st.td, st.cNum]}>{f3(r.qty)}</Text>
        <Text style={[st.td, st.cInfo]}>{r.info}</Text>
        <Text style={[st.td, st.cRef]} numberOfLines={2}>{r.refNo ? `${r.refNo}\n` : '—'}{r.refNo ? <Text style={st.sub}>{r.refType}  •  {r.refDate}</Text> : null}</Text>
        <Text style={[st.td, st.cDays]}>{r.daysOut ?? '—'}</Text>
      </View>
    );
  };

  const head = tab === 'outward' ? (
    <View style={[st.tr, st.th]}>
      <Text style={[st.thTxt, st.cVou]}>Outward</Text>
      <Text style={[st.thTxt, st.cParty]}>Party</Text>
      <Text style={[st.thTxt, st.cBeam]}>Beam</Text>
      <Text style={[st.thTxt, st.cNum]}>Qty</Text>
      <Text style={[st.thTxt, st.cNum]}>Received</Text>
      <Text style={[st.thTxt, st.cNum]}>Pending</Text>
      <Text style={[st.thTxt, st.cRef]}>Came back on (inward)</Text>
      <Text style={[st.thTxt, st.cGp]}>Gate pass</Text>
      <Text style={[st.thTxt, st.cDays]}>Days</Text>
    </View>
  ) : (
    <View style={[st.tr, st.th]}>
      <Text style={[st.thTxt, st.cVou]}>Inward</Text>
      <Text style={[st.thTxt, st.cParty]}>Party</Text>
      <Text style={[st.thTxt, st.cBeam]}>Beam</Text>
      <Text style={[st.thTxt, st.cNum]}>Qty</Text>
      <Text style={[st.thTxt, st.cInfo]}>Beam Info</Text>
      <Text style={[st.thTxt, st.cRef]}>Against (outward entry)</Text>
      <Text style={[st.thTxt, st.cDays]}>Days out</Text>
    </View>
  );

  const empty = loading ? (
    <View style={st.state}><ActivityIndicator size="large" color={C.cta} /></View>
  ) : error ? (
    <View style={st.state}><Icon name="info-outline" size={32} color={C.muted} /><Text style={st.stateTxt}>{error}</Text></View>
  ) : (
    <View style={st.state}><Icon name="inbox" size={32} color={C.muted} /><Text style={st.stateTxt}>No beams for these filters</Text></View>
  );

  return (
    <View style={st.root}>
      <View style={st.tabs}>
        {(['outward', 'inward'] as ReportKind[]).filter(k => (k === 'outward' ? can.outward : can.inward)).map(k => (
          <Pressable key={k} onPress={() => setTab(k)} style={[st.tab, tab === k && st.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Icon name={k === 'outward' ? 'north-east' : 'south-west'} size={18} color={tab === k ? C.onNav : C.nav} />
            <Text style={[st.tabTxt, tab === k && { color: C.onNav }]}>{k === 'outward' ? 'Beam Outward' : 'Beam Inward'}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={loading ? [] : (shown as any[])}
        keyExtractor={r => r.key}
        renderItem={({ item, index }) => (tab === 'outward' ? outRow(item as OutRow, index) : inRow(item as InRow, index))}
        ListHeaderComponent={
          <View>
            {filters}
            {shown.length ? <Card style={{ paddingVertical: SP.md }}>{totals}</Card> : null}
            {isDesktop && shown.length && !loading ? <View style={st.tableTop}>{head}</View> : null}
          </View>
        }
        ListEmptyComponent={empty}
        contentContainerStyle={st.content}
        keyboardShouldPersistTaps="handled"
      />
      <MasterPicker
        kind={picker === 'property' || picker === 'year' ? picker : null}
        ctx={ctx}
        service={service}
        selected={picker === 'property' ? ctx.prpCode : String(ctx.yearNo)}
        onPick={(k, o: LookupOption) => {
          setPicker(null);
          if (k === 'property') setCtx(c => ({ ...c, prpCode: o.code, prpName: o.name }));
          if (k === 'year') setCtx(c => ({ ...c, yearNo: Number(o.code) || 0, yearLabel: o.name }));
        }}
        onClose={() => setPicker(null)}
      />
      <OptionPicker
        visible={picker === 'party'}
        title="Party"
        search={(q: string) => service.parties(ctx, q)}
        selected={party?.code}
        onPick={o => { setPicker(null); setParty(o); }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: SP.md, paddingBottom: 48, width: '100%', maxWidth: 1400, alignSelf: 'center' },
  tabs: { flexDirection: 'row', gap: SP.sm, paddingHorizontal: SP.md, paddingTop: SP.md, width: '100%', maxWidth: 1400, alignSelf: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SP.lg, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  tabOn: { backgroundColor: C.nav, borderColor: C.nav },
  tabTxt: { fontSize: 14, fontWeight: '800', color: C.nav },
  row: { flexDirection: 'row', gap: SP.md },
  col: { flexDirection: 'column', gap: 0 },
  chips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.xs },
  chip: { paddingHorizontal: SP.md, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  chipOn: { backgroundColor: C.nav, borderColor: C.nav },
  chipTxt: { fontSize: 12, fontWeight: '700', color: C.ink },
  chipTxtOn: { color: C.onNav },
  summary: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  sumMain: { fontSize: 14, fontWeight: '800', color: C.nav },
  sumSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  totals: { flexDirection: 'row', flexWrap: 'wrap', rowGap: SP.sm },
  tableTop: { borderTopLeftRadius: R.md, borderTopRightRadius: R.md, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.md, paddingVertical: 8, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.hair },
  th: { backgroundColor: C.nav, paddingVertical: 10 },
  thTxt: { color: C.onNav, fontSize: 12, fontWeight: '800' },
  td: { fontSize: 13, color: C.ink, fontVariant: ['tabular-nums'] },
  sub: { fontSize: 11, color: C.muted },
  beamTd: { fontSize: 14, fontWeight: '800', color: C.nav },
  cVou: { width: 120 },
  cParty: { flex: 1.3, minWidth: 0 },
  cBeam: { width: 130 },
  cNum: { width: 84, textAlign: 'right' },
  cInfo: { width: 110 },
  cRef: { flex: 1.4, minWidth: 0 },
  cGp: { width: 90 },
  cDays: { width: 60, textAlign: 'right' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: SP.md, marginBottom: SP.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.sm },
  beamNo: { fontSize: 20, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'] },
  party: { fontSize: 14, fontWeight: '700', color: C.ink, marginTop: 2 },
  meta: { fontSize: 12, color: C.muted, marginTop: 2 },
  ref: { fontSize: 12, color: C.cta, fontWeight: '700', marginTop: 2 },
  days: { fontSize: 12, fontWeight: '800', color: C.nav },
  badge: { borderRadius: 999, paddingHorizontal: SP.sm, paddingVertical: 3 },
  badgePend: { backgroundColor: C.ctaSoft },
  badgeBack: { backgroundColor: C.ok + '1A' },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  state: { alignItems: 'center', gap: SP.sm, paddingVertical: 48 },
  stateTxt: { fontSize: 14, color: C.muted, textAlign: 'center' },
});
