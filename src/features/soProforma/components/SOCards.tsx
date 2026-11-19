// FILE: src/features/soProforma/components/SOCards.tsx
// Step 1: authorized Grey Sales Orders as cards — ordered / proformed / balance, progress bar, proforma count.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import type { ProformaService } from '../../../api/soProformaAPI';
import { fmt2, fmtQ } from '../../beamInOut/logic';
import { C, R, SP } from '../../repackingIssue/theme';
import { Input, Segmented } from '../../repackingIssue/components/ui';
import { soStatus, soTotals, toDMY } from '../logic';
import type { PiContext, SalesOrder } from '../types';

type Filter = 'open' | 'all' | 'done';
type Period = '3' | '6' | '12';

export function SOCards({ ctx, service, reloadKey, onOpen }: {
  ctx: PiContext;
  service: ProformaService;
  reloadKey: number;
  onOpen: (so: SalesOrder) => void;
}) {
  const { isPhone, width } = useDeviceClass();
  const [period, setPeriod] = useState<Period>('6');
  const [filter, setFilter] = useState<Filter>('open');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<SalesOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      setRows(await service.orders(ctx, Number(period), ''));
    } catch (e: any) {
      setErr(e?.message || 'Sales Orders could not be loaded.');
    } finally {
      setBusy(false);
    }
  }, [service, ctx, period]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(o => {
      const s = soStatus(o);
      if (filter === 'open' && s === 'full') return false;
      if (filter === 'done' && s !== 'full') return false;
      if (!q) return true;
      return [o.soNo, o.party, o.parCode, ...o.lines.map(l => `${l.item} ${l.design} ${l.shade}`)].join(' ').toLowerCase().includes(q);
    });
  }, [rows, filter, search]);

  const cols = isPhone ? 1 : width >= 1400 ? 3 : 2;

  return (
    <View style={st.root}>
      <View style={st.top}>
        <Text style={st.h1}>Proforma Invoice</Text>
        <Text style={st.sub}>
          Pick an authorized Sales Order (Grey) to split it into proformas • {ctx.prpName || ctx.prpCode} • {ctx.yearLabel}
        </Text>
        <View style={[st.filters, isPhone && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Input value={search} onChangeText={setSearch} placeholder="Search SO no., party, item…" returnKeyType="search" />
          </View>
          <View style={{ minWidth: isPhone ? undefined : 260 }}>
            <Segmented<Filter>
              value={filter}
              onChange={setFilter}
              options={[{ value: 'open', label: 'Open' }, { value: 'all', label: 'All' }, { value: 'done', label: 'Done' }]}
            />
          </View>
          <View style={{ minWidth: isPhone ? undefined : 200 }}>
            <Segmented<Period> value={period} onChange={setPeriod} options={[{ value: '3', label: '3 M' }, { value: '6', label: '6 M' }, { value: '12', label: '12 M' }]} />
          </View>
        </View>
      </View>

      {err ? (
        <View style={st.err}><Icon name="error-outline" size={18} color={C.danger} /><Text style={st.errTxt}>{err}</Text></View>
      ) : null}

      {busy && !rows.length ? (
        <View style={st.center}><ActivityIndicator size="large" color={C.cta} /></View>
      ) : (
        <FlatList
          key={cols}
          data={shown}
          numColumns={cols}
          keyExtractor={o => String(o.uid)}
          columnWrapperStyle={cols > 1 ? { gap: SP.md } : undefined}
          contentContainerStyle={{ padding: SP.md, gap: SP.md }}
          refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
          ListEmptyComponent={
            <View style={st.center}>
              <Icon name="receipt-long" size={40} color={C.muted} />
              <Text style={st.empty}>{rows.length ? 'No Sales Order matches.' : 'No authorized Grey Sales Orders in this period.'}</Text>
            </View>
          }
          renderItem={({ item }) => <SOCard so={item} onPress={() => onOpen(item)} />}
        />
      )}
    </View>
  );
}

export function ProgressBar({ pct, full }: { pct: number; full?: boolean }) {
  return (
    <View style={st.track}>
      <View style={[st.fill, { width: `${Math.max(0, Math.min(100, pct))}%` }, full && { backgroundColor: C.ok }]} />
    </View>
  );
}

function SOCard({ so, onPress }: { so: SalesOrder; onPress: () => void }) {
  const t = soTotals(so);
  const status = soStatus(so);
  const badge = { none: { txt: 'No proforma', bg: C.track, fg: C.muted }, part: { txt: 'Part split', bg: C.ctaSoft, fg: C.cta }, full: { txt: 'Fully split', bg: C.ok + '1A', fg: C.ok } }[status];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.card, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={`Sales Order ${so.soNo}`}>
      <View style={st.cardHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.soNo} numberOfLines={1}>SO {so.soNo}</Text>
          <Text style={st.date}>{toDMY(so.soDate)}</Text>
        </View>
        <View style={[st.badge, { backgroundColor: badge.bg }]}><Text style={[st.badgeTxt, { color: badge.fg }]}>{badge.txt}</Text></View>
      </View>
      <Text style={st.party} numberOfLines={1}>{so.party || so.parCode}</Text>
      <Text style={st.items} numberOfLines={1}>
        {so.lines.length} line{so.lines.length === 1 ? '' : 's'} • {so.lines.map(l => l.item).filter((s, i, a) => s && a.indexOf(s) === i).join(', ')}
      </Text>
      <View style={st.nums}>
        <Num label="Ordered" value={fmtQ(t.ordered)} />
        <Num label="Proformed" value={fmtQ(t.done)} />
        <Num label="Balance" value={fmtQ(t.balance)} strong />
      </View>
      <ProgressBar pct={t.pct} full={status === 'full'} />
      <View style={st.foot}>
        <Text style={st.footTxt}>{so.piCount} proforma{so.piCount === 1 ? '' : 's'} • {t.pct}%</Text>
        <Text style={st.footTxt}>₹ {fmt2(so.netAmt)}</Text>
      </View>
    </Pressable>
  );
}

function Num({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={st.numLbl}>{label}</Text>
      <Text style={[st.numVal, strong && { color: C.cta }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: { paddingHorizontal: SP.md, paddingTop: SP.md },
  h1: { fontSize: 20, fontWeight: '800', color: C.nav },
  sub: { fontSize: 13, color: C.muted, marginTop: 2 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SP.sm, marginTop: SP.md },
  center: { alignItems: 'center', justifyContent: 'center', padding: SP.xl, gap: SP.sm, flex: 1 },
  empty: { color: C.muted, fontSize: 14, textAlign: 'center' },
  err: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, backgroundColor: C.dangerSoft, padding: SP.sm, borderRadius: R.sm, margin: SP.md, marginBottom: 0 },
  errTxt: { flex: 1, color: C.danger, fontWeight: '700', fontSize: 13 },
  card: { flex: 1, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: SP.lg, gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.sm },
  soNo: { fontSize: 16, fontWeight: '800', color: C.nav },
  date: { fontSize: 12, color: C.muted, marginTop: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  party: { fontSize: 14, fontWeight: '700', color: C.ink },
  items: { fontSize: 12, color: C.muted },
  nums: { flexDirection: 'row', gap: SP.sm, marginTop: 4 },
  numLbl: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  numVal: { fontSize: 15, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 4, backgroundColor: C.track, overflow: 'hidden', marginTop: 4 },
  fill: { height: 8, borderRadius: 4, backgroundColor: C.cta },
  foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  footTxt: { fontSize: 12, color: C.muted, fontWeight: '600' },
});
