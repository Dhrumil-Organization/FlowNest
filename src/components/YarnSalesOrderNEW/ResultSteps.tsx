// FILE: src/components/YarnSalesOrderNEW/ResultSteps.tsx
// The two confirmation screens of the flow.
//   ShadeDoneStep <- legacy SalesOrderAddAnotherShade.tsx ("Shade Added / Updated Successfully"
//                    + "Back To Order Summary"). The rows only reach the order when the
//                    button is pressed — going back returns to the details form, as legacy.
//   SavedStep     <- legacy SalesOrderSaveSuccess.tsx ("Order Saved Successfully!" + "View Order").
//                    "View Order" opens the saved order read-only (mode VIEW).
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Btn, Card, PanelHeader } from '../../../src/components/erpUi';
import { T } from '../../../src/theme';
import { money, OrderCtx, Row } from './model';
import { Nav, PickFlow } from './nav';
import { CONTENT } from './ui';

function Tick() {
  return (
    <View style={st.tick}>
      <Icon name="check" size={40} color="#fff" />
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={st.line}>
      <Text style={st.lineLabel}>{label}</Text>
      <Text style={[st.lineValue, strong && { color: T.green, fontSize: 15 }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function ShadeDoneStep({
  nav,
  params,
}: {
  nav: Nav;
  params: { flow: PickFlow; rows: Row[]; lastRow: Row | null; isEdit: boolean };
}) {
  const { flow, rows, lastRow, isEdit } = params;
  return (
    <View style={st.root}>
      <PanelHeader onBack={nav.back} crumbs={['Yarn Sales Order']} title={isEdit ? 'Shade Updated' : 'Shade Added'} backLabel="Back to details" />
      <ScrollView contentContainerStyle={[CONTENT, st.content]}>
        <Tick />
        <Text style={st.title}>{isEdit ? 'Shade Updated Successfully' : 'Shade Added Successfully'}</Text>
        <Card style={{ gap: 2 }}>
          <Text style={st.cardTitle} numberOfLines={2}>{lastRow?.ShdCode} - {lastRow?.ShdName}</Text>
          <Line label="Sr No" value={String(lastRow?.SrNo ?? '-')} />
          <Line label="Qty" value={String(lastRow?.Qty ?? '-')} />
          <Line label="Pcs" value={String(lastRow?.Pcs ?? '-')} />
          <Line label="Rate" value={`₹ ${money(lastRow?.Rate)}`} />
          <Line label="Amount" value={`₹ ${money(lastRow?.Amount)}`} strong />
          <Line label="Total Rows" value={String(rows.length)} />
        </Card>
        <Btn label="Back To Order Summary" icon="assignment" onPress={() => flow.onDone(rows, isEdit)} />
      </ScrollView>
    </View>
  );
}

export function SavedStep({
  nav,
  params,
}: {
  nav: Nav;
  params: { orderNo: string; uid: string; ctx: OrderCtx; dateTime: string };
}) {
  const { orderNo, uid, ctx, dateTime } = params;
  return (
    <View style={st.root}>
      <PanelHeader onBack={nav.back} crumbs={['Yarn Sales Order']} title="Order Saved" backLabel="Back to sales orders" />
      <ScrollView contentContainerStyle={[CONTENT, st.content]}>
        <Tick />
        <Text style={st.title}>Order Saved Successfully!</Text>
        <Card style={{ alignItems: 'center', gap: 6 }}>
          <Text style={st.lineLabel}>Order No.</Text>
          <View style={st.orderBox}>
            <Text style={st.orderNo} selectable>{orderNo}</Text>
          </View>
          <Text style={[st.lineLabel, { marginTop: 8 }]}>Date & Time</Text>
          <Text style={st.dateTime}>{dateTime}</Text>
        </Card>
        <Btn label="View Order" icon="visibility" onPress={() => nav.push('summary', { ctx, initialMode: 'VIEW', uid })} />
        <Btn label="Back To Sales Orders" kind="ghost" icon="list" onPress={nav.back} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, gap: 14, maxWidth: 520, paddingTop: 28 },
  tick: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: T.green,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: { fontSize: 19, fontWeight: '900', color: T.nav, textAlign: 'center' },
  cardTitle: { fontSize: 15.5, fontWeight: '900', color: T.ink, marginBottom: 6 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: T.hair,
  },
  lineLabel: { fontSize: 12, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  lineValue: { fontSize: 14, fontWeight: '800', color: T.ink },
  orderBox: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: `${T.copper}14`, borderWidth: 1, borderColor: `${T.copper}40` },
  orderNo: { fontSize: 20, fontWeight: '900', color: T.nav, letterSpacing: 0.5 },
  dateTime: { fontSize: 14, fontWeight: '700', color: T.ink },
});
