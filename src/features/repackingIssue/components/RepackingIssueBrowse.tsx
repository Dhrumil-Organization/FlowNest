// FILE: src/features/repackingIssue/components/RepackingIssueBrowse.tsx
// Entries list for Repacking Issue: Property / Year / Store + date range + search,
// then View / Edit / Delete per voucher (KnitPrdRepackIssueRepository browse_data / delete_data).
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import { confirmAsync, notify } from '../dialog';
import { isValidDMY, maskDMY, todayDMY } from '../logic';
import { RepackingService, RepackRights } from '../service';

/** texts that differ between Repacking Issue and Repacking */
export interface BrowseLabels {
  entity: string; // 'repacking issue'
  lockedBadge: string; // 'Re-packed'
  lockedReason: string; // 'Cartons of this voucher are already re-packed.'
  deleteNote: string; // 'Stock of its cartons will be returned.'
  /** search box placeholder */
  searchHint?: string;
  /** count word, e.g. 'beam(s)' (default 'item(s)') */
  itemWord?: string;
}

const ISSUE_LABELS: BrowseLabels = {
  entity: 'repacking issue',
  lockedBadge: 'Re-packed',
  lockedReason: 'Cartons of this voucher are already re-packed.',
  deleteNote: 'Stock of its cartons will be returned.',
};
import { C, LABEL, R, SP } from '../theme';
import { LookupKind, LookupOption, RepackContext, RepackListRow } from '../types';
import { MasterPicker } from './MasterPicker';
import { Banner, Btn, Card, Field, Input, SelectBox } from './ui';

type Ranges = 'today' | 'month' | 'last30' | 'fy' | 'custom';

const p2 = (n: number) => String(n).padStart(2, '0');
const dmy = (d: Date) => `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`;
const monthStart = () => { const d = new Date(); return dmy(new Date(d.getFullYear(), d.getMonth(), 1)); };
/** 1 April of the current financial year */
const fyStart = () => { const d = new Date(); return dmy(new Date(d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1, 3, 1)); };
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dmy(d); };
const key = (v: string) => Number(v.split('-').reverse().join('')) || 0;

export interface RepackingIssueBrowseProps {
  ctx: RepackContext;
  onCtxChange: (ctx: RepackContext) => void;
  service: Pick<RepackingService, 'lookup' | 'browse' | 'remove'>;
  rights: Pick<RepackRights, 'add' | 'edit' | 'delete'>;
  labels?: BrowseLabels;
  onNew: () => void;
  onOpen: (row: RepackListRow, mode: 'view' | 'edit') => void;
  /** bump to reload (after save / delete) */
  reloadKey?: number;
  /** module without a store (e.g. Beam Outward): hides the Store filter and does not require it */
  noStore?: boolean;
  /** optional Print button on each card */
  onPrint?: (row: RepackListRow) => void;
}

export function RepackingIssueBrowse({ ctx, onCtxChange, service, rights, onNew, onOpen, reloadKey = 0, labels = ISSUE_LABELS, noStore = false, onPrint }: RepackingIssueBrowseProps) {
  const { isPhone, isDesktop } = useDeviceClass();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayDMY());
  const [range, setRange] = useState<Ranges>('month');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<RepackListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyUid, setBusyUid] = useState<number | null>(null);
  const [picker, setPicker] = useState<LookupKind | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false); // phone only

  const rangeErr =
    !isValidDMY(from) ? 'Enter From date' : !isValidDMY(to) ? 'Enter To date' : key(from) > key(to) ? 'From is after To' : '';

  /* ---- names for the session codes ---- */
  useEffect(() => {
    let alive = true;
    (async () => {
      const find = async (k: 'property' | 'year' | 'store', code: string) => {
        try { return (await service.lookup(k, ctx)).find(o => o.code === code); } catch { return undefined; }
      };
      const [p, y, s] = await Promise.all([
        ctx.prpName === ctx.prpCode ? find('property', ctx.prpCode) : undefined,
        !ctx.yearLabel || ctx.yearLabel === String(ctx.yearNo) ? find('year', String(ctx.yearNo)) : undefined,
        !noStore && ctx.strName === ctx.strCode ? find('store', ctx.strCode) : undefined,
      ]);
      if (alive && (p || y || s)) {
        onCtxChange({ ...ctx, prpName: p?.name ?? ctx.prpName, yearLabel: y?.name ?? ctx.yearLabel, strName: s?.name ?? ctx.strName });
      }
    })();
    return () => { alive = false; };
  }, [ctx.prpCode, ctx.yearNo, ctx.strCode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- load ---- */
  const load = useCallback(async (pull = false) => {
    if (rangeErr || !ctx.prpCode || (!noStore && !ctx.strCode)) return;
    pull ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setRows(await service.browse(ctx, from, to));
    } catch (e: any) {
      setRows([]);
      setError(e?.response?.status ? `${e.message} (HTTP ${e.response.status})` : e?.message || 'Could not load entries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [service, ctx.prpCode, ctx.yearNo, ctx.strCode, from, to, rangeErr]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load, reloadKey]);

  const pickRange = (r: Ranges) => {
    setRange(r);
    if (r === 'today') { setFrom(todayDMY()); setTo(todayDMY()); }
    if (r === 'month') { setFrom(monthStart()); setTo(todayDMY()); }
    if (r === 'last30') { setFrom(daysAgo(29)); setTo(todayDMY()); }
    if (r === 'fy') { setFrom(fyStart()); setTo(todayDMY()); }
  };

  /* ---- search (on device) ---- */
  const shown = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.vouNo, r.date, r.remark, r.info ?? '', ...r.items.flatMap(i => [i.name, i.merge])].some(v => v.toUpperCase().includes(q))
    );
  }, [rows, search]);

  /* ---- context ---- */
  const pickContext = async (kind: LookupKind, o: LookupOption) => {
    setPicker(null);
    if (kind === 'year') return onCtxChange({ ...ctx, yearNo: Number(o.code) || 0, yearLabel: o.name });
    if (kind === 'store') return onCtxChange({ ...ctx, strCode: o.code, strName: o.name });
    if (kind === 'property' && o.code !== ctx.prpCode) {
      const base = { ...ctx, prpCode: o.code, prpName: o.name };
      let stores: LookupOption[] = [];
      try { stores = await service.lookup('store', base); } catch { /* pick manually */ }
      const keep = stores.find(s => s.code === ctx.strCode) ?? (stores.length === 1 ? stores[0] : undefined);
      onCtxChange({ ...base, strCode: keep?.code ?? '', strName: keep?.name ?? '' });
    }
  };

  /* ---- delete ---- */
  const remove = async (r: RepackListRow) => {
    if (r.isRepack > 0) return notify('Cannot delete', labels.lockedReason);
    const ok = await confirmAsync(
      `Delete ${labels.entity}?`,
      `Voucher ${r.vouNo} dated ${r.date}\n${r.items.length} ${labels.itemWord ?? 'item(s)'}. ${labels.deleteNote}`,
      'Delete',
      true
    );
    if (!ok) return;
    setBusyUid(r.uid);
    try {
      const res = await service.remove(ctx, r.uid);
      if (!res.ok) return notify('Not deleted', res.message);
      setRows(list => list.filter(x => x.uid !== r.uid));
      notify('Deleted', `Voucher ${r.vouNo} deleted.`);
    } finally {
      setBusyUid(null);
    }
  };

  /* ---- render ---- */
  const columns = isDesktop ? 3 : isPhone ? 1 : 2;

  const searchInput = (
      <View>
        <Input value={search} onChangeText={setSearch} placeholder={labels.searchHint ?? 'Voucher, item, merge, remark'} style={{ paddingLeft: 36 }} />
        <Icon name="search" size={20} color={C.muted} style={st.searchIcon} />
        {search ? (
          <Pressable onPress={() => setSearch('')} style={st.clear} hitSlop={8} accessibilityLabel="Clear search">
            <Icon name="close" size={18} color={C.muted} />
          </Pressable>
        ) : null}
      </View>
  );
  const searchBox = isPhone ? <View style={{ marginBottom: SP.md }}>{searchInput}</View> : (
    <Field label="Search" style={{ flex: 1.6 }}>{searchInput}</Field>
  );

  const chipsRow = (
    <View style={st.chips}>
      {([['today', 'Today'], ['month', 'This month'], ['last30', 'Last 30 days'], ['fy', 'This year']] as [Ranges, string][]).map(([v, l]) => (
        <Pressable key={v} onPress={() => pickRange(v)} style={[st.chip, range === v && st.chipOn]} accessibilityRole="button">
          <Text style={[st.chipTxt, range === v && st.chipTxtOn]}>{l}</Text>
        </Pressable>
      ))}
      <View style={{ flex: 1 }} />
      <Text style={st.count}>{loading ? 'Loading…' : `${shown.length}${shown.length !== rows.length ? ` of ${rows.length}` : ''} voucher(s)`}</Text>
      {!isPhone && rights.add ? <Btn small icon="add" title="New Entry" onPress={onNew} /> : null}
    </View>
  );

  // phone: one-line summary, tap to change property / year / store / dates
  const phoneFilters = (
    <Card style={{ padding: SP.md, paddingBottom: SP.xs }}>
      <Pressable onPress={() => setFiltersOpen(o => !o)} style={st.summary} accessibilityRole="button" accessibilityLabel="Change filters">
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.sumMain} numberOfLines={1}>{noStore ? ctx.prpName : ctx.strName || 'Select store'}  •  {ctx.yearLabel}</Text>
          <Text style={st.sumSub} numberOfLines={1}>{ctx.prpName}  •  {from} → {to}</Text>
        </View>
        <Icon name={filtersOpen ? 'expand-less' : 'tune'} size={22} color={C.nav} />
      </Pressable>
      {filtersOpen ? <View style={{ marginTop: SP.md }}>{fullFilters(true)}</View> : null}
      <View style={{ marginTop: SP.sm }}>{searchBox}</View>
      {chipsRow}
    </Card>
  );

  const filters = isPhone ? phoneFilters : (
    <Card style={{ paddingBottom: SP.sm }}>
      {fullFilters(false)}
      {chipsRow}
    </Card>
  );

  function fullFilters(phone: boolean) {
    return (
    <>
      <View style={[st.row, phone && st.col]}>
        <Field label="Property" style={!phone ? { flex: 2 } : undefined}>
          <SelectBox icon="apartment" value={ctx.prpName} placeholder="Select property" onPress={() => setPicker('property')} />
        </Field>
        <View style={[st.row, { flex: phone ? undefined : 1.6 }]}>
          <Field label="Year">
            <SelectBox icon="event" value={ctx.yearLabel} placeholder="Year" onPress={() => setPicker('year')} disabled={!ctx.prpCode} />
          </Field>
          {!noStore ? (
            <Field label="Store">
              <SelectBox icon="warehouse" value={ctx.strName} placeholder="Select store" onPress={() => setPicker('store')} disabled={!ctx.prpCode} invalid={!ctx.strCode} />
            </Field>
          ) : null}
        </View>
      </View>

      <View style={[st.row, phone && st.col]}>
        <View style={[st.row, { flex: phone ? undefined : 1.4 }]}>
          <Field label="From" error={rangeErr && rangeErr !== 'Enter To date' ? rangeErr : undefined}>
            <Input value={from} onChangeText={t => { setFrom(maskDMY(t)); setRange('custom'); }} keyboardType="number-pad" placeholder="dd-mm-yyyy" maxLength={10} invalid={!!rangeErr && rangeErr !== 'Enter To date'} />
          </Field>
          <Field label="To" error={rangeErr === 'Enter To date' ? rangeErr : undefined}>
            <Input value={to} onChangeText={t => { setTo(maskDMY(t)); setRange('custom'); }} keyboardType="number-pad" placeholder="dd-mm-yyyy" maxLength={10} invalid={rangeErr === 'Enter To date'} />
          </Field>
        </View>
        {!phone ? searchBox : null}
      </View>
    </>
    );
  }

  const renderRow = ({ item: r }: { item: RepackListRow }) => {
    const locked = r.isRepack > 0;
    const busy = busyUid === r.uid;
    const first = r.items[0];
    return (
      <View style={[st.cell, columns > 1 && { flex: 1 / columns }]}>
        <Pressable
          onPress={() => onOpen(r, 'view')}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.entry, hovered && { borderColor: C.cta }, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={`Voucher ${r.vouNo}`}>
          <View style={st.entryTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={LABEL}>Vou. No</Text>
              <Text style={st.vouNo} numberOfLines={1}>{r.vouNo || '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={LABEL}>Date</Text>
              <Text style={st.date}>{r.date}</Text>
            </View>
          </View>

          <View style={st.items}>
            {first ? (
              <Text style={st.itemName} numberOfLines={1}>
                {first.name}
                {first.merge ? <Text style={st.itemMerge}>{`  •  ${first.merge}`}</Text> : null}
              </Text>
            ) : (
              <Text style={st.itemMerge}>No items</Text>
            )}
            {r.items.length > 1 ? <Text style={st.more}>{`+${r.items.length - 1} more ${labels.itemWord ?? 'item(s)'}`}</Text> : null}
            {r.info ? <Text style={st.info} numberOfLines={1}>{r.info}</Text> : null}
            {r.remark ? <Text style={st.remark} numberOfLines={2}>{r.remark}</Text> : null}
          </View>

          <View style={st.entryFoot}>
            {locked ? (
              <View style={st.badge}><Icon name="inventory-2" size={13} color={C.cta} /><Text style={st.badgeTxt}>{labels.lockedBadge}</Text></View>
            ) : <View />}
            <View style={st.actions}>
              {busy ? <ActivityIndicator color={C.cta} /> : null}
              <IconBtn icon="visibility" label="View" onPress={() => onOpen(r, 'view')} />
              {onPrint ? <IconBtn icon="print" label="Print" onPress={() => onPrint(r)} disabled={busy} /> : null}
              {rights.edit && !locked ? <IconBtn icon="edit" label="Edit" onPress={() => onOpen(r, 'edit')} disabled={busy} /> : null}
              {rights.delete && !locked ? <IconBtn icon="delete-outline" label="Delete" danger onPress={() => remove(r)} disabled={busy} /> : null}
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  const empty = loading ? (
    <View style={st.state}><ActivityIndicator color={C.cta} size="large" /></View>
  ) : error ? (
    <View style={st.state}>
      <Icon name="cloud-off" size={34} color={C.danger} />
      <Text style={st.stateTxt}>{error}</Text>
      <Btn small kind="ghost" icon="refresh" title="Retry" onPress={() => load()} />
    </View>
  ) : !noStore && !ctx.strCode ? (
    <View style={st.state}><Icon name="warehouse" size={34} color={C.muted} /><Text style={st.stateTxt}>Select a store to see entries</Text></View>
  ) : (
    <View style={st.state}>
      <Icon name="inbox" size={34} color={C.muted} />
      <Text style={st.stateTxt}>{search ? 'No voucher matches the search' : `No ${labels.entity} in this period`}</Text>
      {rights.add && !search ? <Btn small icon="add" title="New Entry" onPress={onNew} /> : null}
    </View>
  );

  return (
    <View style={st.root}>
      <FlatList
        key={`cols-${columns}`}
        data={loading ? [] : shown}
        keyExtractor={r => String(r.uid)}
        renderItem={renderRow}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: SP.md } : undefined}
        ListHeaderComponent={
          <View>
            {filters}
            {!rights.add && !rights.edit && !rights.delete ? <Banner icon="visibility" text="View only — you can open entries but not change them." /> : null}
          </View>
        }
        ListEmptyComponent={empty}
        contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.cta} colors={[C.cta]} />}
        keyboardShouldPersistTaps="handled"
      />

      {rights.add && isPhone ? (
        <Pressable onPress={onNew} style={st.fab} accessibilityRole="button" accessibilityLabel={`New ${labels.entity}`}>
          <Icon name="add" size={28} color={C.onNav} />
        </Pressable>
      ) : null}

      <MasterPicker
        kind={picker}
        ctx={ctx}
        service={service}
        selected={picker === 'property' ? ctx.prpCode : picker === 'year' ? String(ctx.yearNo) : ctx.strCode}
        onPick={pickContext}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

function IconBtn({ icon, label, onPress, danger, disabled }: {
  icon: React.ComponentProps<typeof Icon>['name']; label: string; onPress: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        st.iconBtn,
        danger && { borderColor: C.danger + '55' },
        hovered && { backgroundColor: danger ? C.dangerSoft : C.ctaSoft },
        (pressed || disabled) && { opacity: 0.5 },
      ]}>
      <Icon name={icon} size={18} color={danger ? C.danger : C.nav} />
      <Text style={[st.iconTxt, danger && { color: C.danger }]}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: SP.md, paddingBottom: 96, width: '100%', maxWidth: 1280, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: SP.md },
  col: { flexDirection: 'column', gap: 0 },
  searchIcon: { position: 'absolute', left: 10, top: 12 },
  clear: { position: 'absolute', right: 10, top: 13 },
  chips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SP.sm, marginTop: -SP.xs, marginBottom: SP.sm },
  chip: { paddingHorizontal: SP.md, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  chipOn: { backgroundColor: C.nav, borderColor: C.nav },
  chipTxt: { fontSize: 12, fontWeight: '700', color: C.ink },
  chipTxtOn: { color: C.onNav },
  count: { fontSize: 12, fontWeight: '700', color: C.muted },
  cell: { marginBottom: SP.md },
  entry: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: SP.lg, height: '100%' },
  entryTop: { flexDirection: 'row', gap: SP.md },
  vouNo: { fontSize: 18, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'], letterSpacing: 0.4, marginTop: 2 },
  date: { fontSize: 14, fontWeight: '700', color: C.ink, marginTop: 4, fontVariant: ['tabular-nums'] },
  items: { marginTop: SP.md, paddingTop: SP.sm, borderTopWidth: 1, borderColor: C.hair, flexGrow: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: C.ink },
  itemMerge: { fontSize: 13, fontWeight: '500', color: C.muted },
  more: { fontSize: 12, color: C.cta, fontWeight: '700', marginTop: 2 },
  remark: { fontSize: 12, color: C.muted, marginTop: SP.xs },
  info: { fontSize: 12, color: C.nav, fontWeight: '600', marginTop: SP.xs, fontVariant: ['tabular-nums'] },
  entryFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SP.md, gap: SP.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.ctaSoft, borderRadius: 999, paddingHorizontal: SP.sm, paddingVertical: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: C.cta },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SP.xs },
  iconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.line, borderRadius: R.sm, paddingHorizontal: SP.sm, minHeight: 36 },
  iconTxt: { fontSize: 12, fontWeight: '700', color: C.nav },
  state: { alignItems: 'center', gap: SP.sm, paddingVertical: 48, paddingHorizontal: SP.lg },
  stateTxt: { fontSize: 14, color: C.muted, textAlign: 'center' },
  fab: {
    position: 'absolute', right: SP.lg, bottom: SP.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.cta,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  sumMain: { fontSize: 15, fontWeight: '800', color: C.nav },
  sumSub: { fontSize: 12, color: C.muted, marginTop: 2 },
});
