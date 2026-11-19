// FILE: src/features/soProforma/components/SODetail.tsx
// Step 2: one Sales Order — its lines (ordered / proformed / balance), the split bar and its proformas.
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import { fmt2, fmtQ, r3 } from '../../beamInOut/logic';
import { C, R, SP } from '../../repackingIssue/theme';
import { Btn, Card } from '../../repackingIssue/components/ui';
import { lineName, soStatus, soTotals, toDMY } from '../logic';
import type { PiRights, ProformaRow, SalesOrder } from '../types';

const SPLIT_COLORS = ['#E07A2E', '#1F6FB2', '#2E9E6A', '#8E5BC6', '#C7414B', '#2AA3A3'];

export function SODetail({ so, list, busy, rights, onNew, onEdit, onView, onDelete, onPrint, onPrintSO }: {
  so: SalesOrder;
  list: ProformaRow[];
  busy: boolean;
  rights: PiRights;
  onNew: () => void;
  onEdit: (p: ProformaRow) => void;
  onView: (p: ProformaRow) => void;
  onDelete: (p: ProformaRow) => void;
  onPrint: (p: ProformaRow) => void;
  onPrintSO?: () => void;
}) {
  const { isPhone } = useDeviceClass();
  const t = soTotals(so);
  const full = soStatus(so) === 'full';

  return (
    <ScrollView contentContainerStyle={{ padding: isPhone ? SP.sm : SP.lg, paddingBottom: 80 }}>
      <Card>
        <View style={[st.head, isPhone && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.soNo}>SO {so.soNo} <Text style={st.date}>• {toDMY(so.soDate)}</Text></Text>
            <Text style={st.party}>{so.party || so.parCode}</Text>
            <Text style={st.meta}>Entry type {so.entType || '—'} • Order value ₹ {fmt2(so.netAmt)}</Text>
          </View>
          <View style={st.actions}>
            {onPrintSO ? <Btn kind="ghost" small icon="print" title="Print SO" onPress={onPrintSO} /> : null}
            {rights.add ? <Btn icon="add" title="New Proforma" onPress={onNew} disabled={full || busy} /> : null}
          </View>
        </View>

        {/* split bar: one coloured piece per proforma, grey = balance */}
        <View style={st.split}>
          {list.map((p, i) => (
            <View key={p.uid} style={{ flex: t.ordered > 0 ? p.qty / t.ordered : 0, backgroundColor: SPLIT_COLORS[i % SPLIT_COLORS.length] }} />
          ))}
          <View style={{ flex: t.ordered > 0 ? t.balance / t.ordered : 1, backgroundColor: C.track }} />
        </View>
        <View style={st.legend}>
          {list.map((p, i) => (
            <View key={p.uid} style={st.legendItem}>
              <View style={[st.dot, { backgroundColor: SPLIT_COLORS[i % SPLIT_COLORS.length] }]} />
              <Text style={st.legendTxt}>{p.no} • {fmtQ(p.qty)}</Text>
            </View>
          ))}
          <View style={st.legendItem}>
            <View style={[st.dot, { backgroundColor: C.track, borderWidth: 1, borderColor: C.line }]} />
            <Text style={st.legendTxt}>Balance • {fmtQ(t.balance)}</Text>
          </View>
        </View>
        {full ? <Text style={st.full}>All of this Sales Order is in proformas. Delete or edit a proforma to free qty.</Text> : null}
      </Card>

      <Card title="Order lines">
        <View style={st.table}>
          <View style={[st.tr, st.th]}>
            <Text style={[st.thTxt, { flex: 1 }]}>Item</Text>
            <Text style={[st.thTxt, st.cNum]}>Ordered</Text>
            {!isPhone ? <Text style={[st.thTxt, st.cNum]}>Proformed</Text> : null}
            <Text style={[st.thTxt, st.cNum]}>Balance</Text>
            {!isPhone ? <Text style={[st.thTxt, st.cNum]}>Rate</Text> : null}
          </View>
          {so.lines.map((l, i) => {
            const bal = r3(Math.max(0, l.qty - l.done));
            return (
              <View key={l.srNo} style={[st.tr, i % 2 === 1 && { backgroundColor: C.quiet }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.item} numberOfLines={2}>{lineName(l)}</Text>
                  {isPhone ? <Text style={st.sub}>Proformed {fmtQ(l.done)} • ₹ {fmt2(l.rate)}</Text> : null}
                </View>
                <Text style={[st.num, st.cNum]}>{fmtQ(l.qty)}</Text>
                {!isPhone ? <Text style={[st.num, st.cNum]}>{fmtQ(l.done)}</Text> : null}
                <Text style={[st.num, st.cNum, { color: bal > 0 ? C.cta : C.ok }]}>{fmtQ(bal)}</Text>
                {!isPhone ? <Text style={[st.num, st.cNum]}>{fmt2(l.rate)}</Text> : null}
              </View>
            );
          })}
          <View style={[st.tr, st.total]}>
            <Text style={[st.item, { flex: 1 }]}>Total</Text>
            <Text style={[st.num, st.cNum, st.b]}>{fmtQ(t.ordered)}</Text>
            {!isPhone ? <Text style={[st.num, st.cNum, st.b]}>{fmtQ(t.done)}</Text> : null}
            <Text style={[st.num, st.cNum, st.b, { color: C.cta }]}>{fmtQ(t.balance)}</Text>
            {!isPhone ? <View style={st.cNum} /> : null}
          </View>
        </View>
      </Card>

      <Card title={`Proformas (${list.length})`} right={busy ? <ActivityIndicator color={C.cta} /> : undefined}>
        {!list.length && !busy ? <Text style={st.none}>No proforma yet. Use “New Proforma” to take part of this order.</Text> : null}
        {list.map((p, i) => (
          <View key={p.uid} style={[st.pi, i > 0 && { borderTopWidth: 1, borderColor: C.line }]}>
            <View style={[st.dot, { backgroundColor: SPLIT_COLORS[i % SPLIT_COLORS.length], marginTop: 6 }]} />
            <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => onView(p)} accessibilityRole="button" accessibilityLabel={`Open proforma ${p.no}`}>
              <Text style={st.piNo}>PI {p.no} <Text style={st.date}>• {toDMY(p.date)}{p.validTill ? `  (valid till ${toDMY(p.validTill)})` : ''}</Text></Text>
              <Text style={st.sub}>Qty {fmtQ(p.qty)} • Gross ₹ {fmt2(p.grsAmt)} • Net ₹ {fmt2(p.netAmt)}</Text>
              {p.remark ? <Text style={st.sub} numberOfLines={1}>{p.remark}</Text> : null}
            </Pressable>
            <View style={st.piActs}>
              {rights.print ? <IconBtn icon="print" label="Print" onPress={() => onPrint(p)} /> : null}
              {rights.edit ? <IconBtn icon="edit" label="Edit" onPress={() => onEdit(p)} /> : null}
              {rights.delete ? <IconBtn icon="delete-outline" label="Delete" danger onPress={() => onDelete(p)} /> : null}
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function IconBtn({ icon, label, onPress, danger }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.iconBtn, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <Icon name={icon} size={20} color={danger ? C.danger : C.nav} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.md },
  soNo: { fontSize: 18, fontWeight: '800', color: C.nav },
  date: { fontSize: 13, fontWeight: '600', color: C.muted },
  party: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 2 },
  meta: { fontSize: 12, color: C.muted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: SP.sm, alignItems: 'center', flexWrap: 'wrap' },
  split: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginTop: SP.md, gap: 2, backgroundColor: C.card },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginTop: SP.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendTxt: { fontSize: 12, color: C.ink, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  full: { marginTop: SP.sm, fontSize: 12, color: C.ok, fontWeight: '700' },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.md, paddingVertical: 8 },
  th: { backgroundColor: C.nav },
  thTxt: { color: C.onNav, fontWeight: '800', fontSize: 12 },
  total: { borderTopWidth: 1, borderColor: C.line, backgroundColor: C.track },
  cNum: { width: 96, textAlign: 'right' },
  item: { fontSize: 13, fontWeight: '700', color: C.ink },
  sub: { fontSize: 12, color: C.muted, marginTop: 2 },
  num: { fontSize: 13, color: C.ink, fontVariant: ['tabular-nums'] },
  b: { fontWeight: '800' },
  none: { color: C.muted, fontSize: 13 },
  pi: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.sm, paddingVertical: SP.sm },
  piNo: { fontSize: 14, fontWeight: '800', color: C.nav },
  piActs: { flexDirection: 'row', gap: 2 },
  iconBtn: { padding: 8, borderRadius: R.sm },
});
