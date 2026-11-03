// FILE: src/components/SalesChallanPackingSlipNEW/SlipList.tsx
// Browse — React Native version of SalesChallanPackingSlipBrowse.js.
//
// Web: one AG-Grid (Packing no · date · order no · party · BQty) with View / Edit / Scan / Delete
// icons per row, "Load data" and "Add new". GET packslipbrowse returns every slip of the
// facility, so the filters here run on the device:
//   • period  Today · 7 days · This month · This FY · All, or a From / To date (DateField of ProductionOrderNEW)
//   • search  all fields, or only packing no. / party / order no.
//   • sort    newest first or by packing no.
// One card per slip (the browse sends one row per slip line). Buttons follow the rights:
//   View always · Modify = edit · Scan = scan · Delete = delete (confirm, destructive).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateField from '../ProductionOrderNEW/DateField';
import { confirmAsync, Pill, SmallBtn } from '../ProductionOrderNEW/ui';
import { Btn, LinkBtn, Notice, PickerField, tab, u } from '../PackingAutomationNEW/ui';
import { apiErrorText, browseSlips, deleteSlip } from './api';
import type { Api, Ctx, Mode } from './api';
import { groupSlips, prettyDate, qty } from './rules';
import type { SlipCard } from './rules';
import type { Rights } from './SlipForm';
import { Tag, Tags } from './ui';

type Period = 'today' | 'week' | 'month' | 'fy' | 'all' | 'custom';
type SearchIn = 'all' | 'no' | 'party' | 'order';
type Sort = 'new' | 'no';
const PAGE = 30;

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fyStart = () => { const d = new Date(); return `${d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear()}-04-01`; };
function range(p: Period): [string, string] {
  const now = new Date();
  if (p === 'today') return [iso(now), iso(now)];
  if (p === 'week') { const s = new Date(now); s.setDate(s.getDate() - 6); return [iso(s), iso(now)]; }
  if (p === 'month') return [`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, iso(now)];
  if (p === 'fy') return [fyStart(), iso(now)];
  return ['', ''];
}

export default function SlipList({ api, ctx, facility, onFacility, rights, onOpen, onNew, flash, clearFlash }: {
  api: Api; ctx: Ctx; facility: string; onFacility: () => void; rights: Rights;
  onOpen: (uid: string, mode: Mode) => void; onNew: () => void;
  flash?: { tone: 'ok' | 'err' | 'info'; text: string } | null; clearFlash: () => void;
}) {
  const [cards, setCards] = useState<SlipCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err' | 'info'; text: string } | null>(null);

  const [period, setPeriod] = useState<Period>('fy');
  const [[from, to], setRange] = useState<[string, string]>(range('fy'));
  const [query, setQuery] = useState('');
  const [searchIn, setSearchIn] = useState<SearchIn>('all');
  const [sort, setSort] = useState<Sort>('new');
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);

  const ready = !!(ctx.prpcode && ctx.yearno && ctx.strcode);

  const load = useCallback(async () => {
    if (!ready) return;
    setBusy(true); setErr('');
    try { setCards(groupSlips(await browseSlips(api, ctx))); }
    catch (e) { setErr(apiErrorText(e, 'Packing slips could not be loaded.')); }
    finally { setBusy(false); }
  }, [api, ctx, ready]);
  useEffect(() => { load(); }, [load]);

  const pickPeriod = (p: Period) => { setPeriod(p); setRange(range(p)); setLimit(PAGE); };

  const shown = useMemo(() => {
    const q = query.trim().toUpperCase();
    const hit = (v: string) => v.toUpperCase().includes(q);
    let list = cards.filter((c) => {
      if (from && c.iso && c.iso < from) return false;
      if (to && c.iso && c.iso > to) return false;
      if (!q) return true;
      if (searchIn === 'no') return hit(c.no) || hit(c.uid);
      if (searchIn === 'party') return hit(c.party);
      if (searchIn === 'order') return c.orders.some(hit);
      return hit(c.no) || hit(c.uid) || hit(c.party) || c.orders.some(hit) || hit(c.date);
    });
    list = [...list].sort((a, b) =>
      sort === 'no'
        ? (parseInt(b.no, 10) || 0) - (parseInt(a.no, 10) || 0)
        : b.iso.localeCompare(a.iso) || (parseInt(b.uid, 10) || 0) - (parseInt(a.uid, 10) || 0));
    return list;
  }, [cards, query, searchIn, from, to, sort]);
  const visible = shown.slice(0, limit);
  const filtersOn = period !== 'fy' || sort !== 'new' || searchIn !== 'all';

  const remove = async (c: SlipCard) => {
    if (!rights.del) return;
    if (!(await confirmAsync('Delete packing slip?', `Packing slip ${c.no} (UID ${c.uid}) for ${c.party || 'this party'} will be deleted. This cannot be undone.`, 'Delete', true))) return;
    setBusy(true);
    try {
      const m = await deleteSlip(api, ctx, c.uid);
      setMsg({ tone: 'ok', text: m || `Packing slip ${c.no} deleted.` });
      await load();
    } catch (e) {
      setBusy(false);
      setMsg({ tone: 'err', text: apiErrorText(e, 'Packing slip could not be deleted.') });
    }
  };

  const note = msg || flash;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40, alignItems: 'center' }}
      keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={T.copper} />}>
      <View style={{ width: '100%', maxWidth: 900 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={u.kicker}>Sales challan</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: T.ink, marginTop: 2 }}>Packing slips</Text>
          </View>
          <LinkBtn label="Refresh" icon="refresh" onPress={load} />
        </View>

        <PickerField label="" icon="business" value={facility || undefined} placeholder="Choose facility"
          sub={ctx.prpcode ? `FY ${ctx.yearno || '—'} · Store ${ctx.strcode || '—'}` : undefined} onPress={onFacility} style={{ marginBottom: 12 }} />

        {rights.add ? <Btn kind="copper" icon="add" label="New packing slip" onPress={onNew} disabled={!ready} style={{ marginBottom: 12 }} /> : null}

        {note ? <Notice tone={note.tone} text={note.text} action={{ label: 'OK', onPress: () => { setMsg(null); clearFlash(); } }} /> : null}

        {/* ---------- search + filters ---------- */}
        <View style={u.card}>
          <View style={[u.field, { minHeight: 48 }]}>
            <Icon name="search" size={20} color={T.muted} />
            <TextInput value={query} onChangeText={(t) => { setQuery(t); setLimit(PAGE); }} autoCapitalize="characters" autoCorrect={false}
              placeholder={searchIn === 'no' ? 'Packing no. or UID' : searchIn === 'party' ? 'Party name' : searchIn === 'order' ? 'Order no.' : 'Packing no., party, order no.…'}
              placeholderTextColor={T.muted} accessibilityLabel="Search packing slips"
              style={[u.input, { fontSize: 16, minWidth: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} />
            {query ? <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}><Icon name="close" size={18} color={T.muted} /></TouchableOpacity> : null}
            <TouchableOpacity onPress={() => setShowFilters((v) => !v)} accessibilityRole="button" accessibilityLabel="Filters"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: T.border, height: 32 }}>
              <Icon name="tune" size={20} color={filtersOn || showFilters ? T.copper : T.muted} />
              {filtersOn ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: T.copper }} /> : null}
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
            {([['today', 'Today'], ['week', '7 days'], ['month', 'This month'], ['fy', 'This FY'], ['all', 'All']] as const).map(([k, l]) => (
              <Pill key={k} label={l} active={period === k} onPress={() => pickPeriod(k)} />
            ))}
          </View>

          {showFilters ? (
            <View style={{ marginTop: 6, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="date-range" size={18} color={T.muted} />
                <DateField value={from} onChange={(v: string) => { setRange([v, to]); setPeriod('custom'); }} max={to || undefined} placeholder="From date" style={{ flex: 1, flexBasis: 0, minWidth: 0 }} />
                <Text style={u.hint}>to</Text>
                <DateField value={to} onChange={(v: string) => { setRange([from, v]); setPeriod('custom'); }} min={from || undefined} placeholder="To date" style={{ flex: 1, flexBasis: 0, minWidth: 0 }} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                <Text style={[u.hint, { marginTop: 0, marginRight: 6 }]}>Search in</Text>
                {([['all', 'All'], ['no', 'Packing no.'], ['party', 'Party'], ['order', 'Order no.']] as const).map(([k, l]) => (
                  <Pill key={k} label={l} active={searchIn === k} onPress={() => setSearchIn(k)} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                <Text style={[u.hint, { marginTop: 0, marginRight: 6 }]}>Sort</Text>
                <Pill label="Newest first" active={sort === 'new'} onPress={() => setSort('new')} />
                <Pill label="Packing no." active={sort === 'no'} onPress={() => setSort('no')} />
                {filtersOn ? <LinkBtn label="Reset" onPress={() => { pickPeriod('fy'); setSort('new'); setSearchIn('all'); }} /> : null}
              </View>
            </View>
          ) : null}

          <Text style={[u.hint, tab, { marginTop: 8 }]}>
            {busy && !cards.length ? 'Loading…' : `${shown.length} of ${cards.length} slip${cards.length === 1 ? '' : 's'}`}
            {period === 'custom' || period !== 'all' ? `  ·  ${from ? prettyDate(from) : '…'} – ${to ? prettyDate(to) : '…'}` : ''}
          </Text>
        </View>

        {!ready ? <Notice tone="info" text="Choose the facility, year and store first." action={{ label: 'Choose', onPress: onFacility }} /> : null}
        {err ? <Notice tone="err" text={err} action={{ label: 'Retry', onPress: load }} /> : null}
        {ready && !busy && !err && shown.length === 0 ? (
          <Notice tone="info" text={cards.length ? 'No packing slip matches these filters.' : 'No packing slips yet for this facility.'}
            action={cards.length ? { label: 'Show all', onPress: () => { setQuery(''); pickPeriod('all'); } } : undefined} />
        ) : null}

        {/* ---------- slips ---------- */}
        {visible.map((c) => (
          <View key={c.uid} style={[u.card, { paddingBottom: 10 }]}>
            <TouchableOpacity onPress={() => onOpen(c.uid, 'view')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Open packing slip ${c.no}`}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <Text style={[{ fontSize: 18, fontWeight: '800', color: T.ink }, tab]}>No. {c.no || '—'}</Text>
                <Text style={[{ fontSize: 13, fontWeight: '700', color: T.muted }, tab]}>{prettyDate(c.date)}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: T.ink, marginTop: 4 }} numberOfLines={2}>{c.party || '—'}</Text>
              <Tags>
                {c.orders.slice(0, 3).map((o) => <Tag key={o} text={`SO ${o}`} tone="copper" />)}
                {c.orders.length > 3 ? <Tag text={`+${c.orders.length - 3} more`} /> : null}
              </Tags>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, backgroundColor: T.sub, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={[u.code, tab]}>{c.lines} line{c.lines === 1 ? '' : 's'}  ·  UID {c.uid}</Text>
                <Text style={[{ fontSize: 13, fontWeight: '800', color: T.ink }, tab]}>Bal. qty {qty(c.qty)}</Text>
              </View>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <SmallBtn label="View" onPress={() => onOpen(c.uid, 'view')} />
              {rights.scan ? <SmallBtn label="Scan" onPress={() => onOpen(c.uid, 'scan')} /> : null}
              {rights.edit ? <SmallBtn label="Modify" tone="copper" onPress={() => onOpen(c.uid, 'edit')} /> : null}
              {rights.del ? <SmallBtn label="Delete" tone="red" onPress={() => remove(c)} /> : null}
            </View>
          </View>
        ))}
        {shown.length > visible.length ? (
          <Btn kind="ghost" label={`Show ${Math.min(PAGE, shown.length - visible.length)} more  ·  ${shown.length - visible.length} left`} onPress={() => setLimit((l) => l + PAGE)} />
        ) : null}
      </View>
    </ScrollView>
  );
}
