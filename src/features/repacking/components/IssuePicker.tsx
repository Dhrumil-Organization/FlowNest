// FILE: src/features/repacking/components/IssuePicker.tsx
// Repacking Issue help: issues of the store that are not repacked yet. Search + tap to select.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RepackingService } from '@/src/api/repackingAPI';
import { fmt3 } from '../../repackingIssue/logic';
import { C, LABEL, R, SP } from '../../repackingIssue/theme';
import { Sheet } from '../../repackingIssue/components/Sheet';
import { Btn, Input } from '../../repackingIssue/components/ui';
import type { IssueSummary, RepackContext } from '../types';

export function IssuePicker({ visible, ctx, service, currentUid, onPick, onClose }: {
  visible: boolean;
  ctx: RepackContext;
  service: Pick<RepackingService, 'pendingIssues'>;
  /** issue of the entry being edited (always listed) */
  currentUid?: number;
  onPick: (issue: IssueSummary) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<IssueSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await service.pendingIssues(ctx, currentUid));
    } catch (e: any) {
      setRows([]);
      setError(e?.response?.status ? `HTTP ${e.response.status} — ${e?.response?.data?.message || e.message}` : e?.message || 'Could not load.');
    } finally {
      setLoading(false);
    }
  }, [service, ctx.prpCode, ctx.yearNo, ctx.strCode, currentUid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (visible) { setQ(''); load(); }
  }, [visible, load]);

  const shown = useMemo(() => {
    const s = q.trim().toUpperCase();
    if (!s) return rows;
    return rows.filter(r => [r.vouNo, r.date, r.remark, r.itmName, r.merName].some(v => v.toUpperCase().includes(s)));
  }, [rows, q]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Select Repacking Issue" subtitle={loading ? 'Loading…' : `${rows.length} issue(s) waiting for repacking`} maxWidth={820}>
      <View style={st.tools}>
        <View style={{ flex: 1 }}>
          <Input value={q} onChangeText={setQ} placeholder="Voucher, item, merge, remark" style={{ paddingLeft: 36 }} autoFocus />
          <Icon name="search" size={20} color={C.muted} style={st.searchIcon} />
        </View>
        <Pressable onPress={load} style={st.iconBtn} accessibilityLabel="Reload" disabled={loading}>
          {loading ? <ActivityIndicator color={C.cta} /> : <Icon name="refresh" size={22} color={C.nav} />}
        </Pressable>
      </View>
      <FlatList
        data={loading ? [] : shown}
        keyExtractor={r => String(r.uid)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: SP.md, paddingTop: 0, gap: SP.sm }}
        renderItem={({ item: r }) => {
          const on = r.uid === currentUid;
          return (
            <Pressable
              onPress={() => onPick(r)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.row, (hovered || on) && { borderColor: C.cta }, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={`Repacking Issue ${r.vouNo}`}>
              <View style={st.rowTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={LABEL}>Issue No</Text>
                  <Text style={st.vou}>{r.vouNo}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={LABEL}>Date</Text>
                  <Text style={st.date}>{r.date}</Text>
                </View>
              </View>
              <Text style={st.item} numberOfLines={1}>
                {r.itmName || '—'}
                {r.merName ? <Text style={st.sub}>{`  •  ${r.merName}`}</Text> : null}
                {r.items > 1 ? <Text style={st.more}>{`  +${r.items - 1} item(s)`}</Text> : null}
              </Text>
              <View style={st.stats}>
                <Text style={st.stat}>{r.cartons} carton(s)</Text>
                <Text style={st.stat}>Qty {fmt3(r.totQty)}</Text>
                <Text style={st.stat}>Wt {fmt3(r.totWt)}</Text>
              </View>
              {r.remark ? <Text style={st.remark} numberOfLines={1}>{r.remark}</Text> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={st.state}>
            {loading ? <ActivityIndicator color={C.cta} size="large" /> : (
              <>
                <Icon name={error ? 'cloud-off' : 'inbox'} size={32} color={error ? C.danger : C.muted} />
                <Text style={st.stateTxt}>{error || (q ? 'No issue matches the search' : 'No Repacking Issue is waiting for repacking in this store')}</Text>
                {error ? <Btn small kind="ghost" icon="refresh" title="Retry" onPress={load} /> : null}
              </>
            )}
          </View>
        }
      />
    </Sheet>
  );
}

const st = StyleSheet.create({
  tools: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, padding: SP.md },
  searchIcon: { position: 'absolute', left: 10, top: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  row: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: SP.md },
  rowTop: { flexDirection: 'row', gap: SP.md },
  vou: { fontSize: 17, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'], marginTop: 2 },
  date: { fontSize: 14, fontWeight: '700', color: C.ink, marginTop: 4, fontVariant: ['tabular-nums'] },
  item: { fontSize: 14, fontWeight: '700', color: C.ink, marginTop: SP.sm },
  sub: { fontWeight: '500', color: C.muted },
  more: { fontWeight: '700', color: C.cta, fontSize: 12 },
  stats: { flexDirection: 'row', gap: SP.md, marginTop: 6, flexWrap: 'wrap' },
  stat: { fontSize: 12, fontWeight: '700', color: C.nav, backgroundColor: C.track, borderRadius: 999, paddingHorizontal: SP.sm, paddingVertical: 2, overflow: 'hidden', fontVariant: ['tabular-nums'] },
  remark: { fontSize: 12, color: C.muted, marginTop: 6 },
  state: { alignItems: 'center', gap: SP.sm, paddingVertical: 48, paddingHorizontal: SP.lg },
  stateTxt: { fontSize: 14, color: C.muted, textAlign: 'center' },
});
