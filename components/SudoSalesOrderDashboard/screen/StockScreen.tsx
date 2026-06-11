// StockScreen.jsx — Madhusudhan Fabrics (React Native)

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComingSoonBanner } from './DesignsScreen';

const MOCK_STOCK = [
  { id: 'YRN-001', name: 'Cotton 20s',     type: 'Yarn',    unit: 'kg',  qty: 4820,  min: 500,  location: 'Store A' },
  { id: 'YRN-002', name: 'Polyester 30s',  type: 'Yarn',    unit: 'kg',  qty: 3110,  min: 500,  location: 'Store A' },
  { id: 'YRN-003', name: 'Viscose 40s',    type: 'Yarn',    unit: 'kg',  qty: 280,   min: 400,  location: 'Store B' },
  { id: 'SPR-001', name: 'Heald Frame',    type: 'Spares',  unit: 'nos', qty: 48,    min: 10,   location: 'Maint'   },
  { id: 'SPR-002', name: 'Reed 44"',       type: 'Spares',  unit: 'nos', qty: 12,    min: 5,    location: 'Maint'   },
  { id: 'SPR-003', name: 'Shuttle',        type: 'Spares',  unit: 'nos', qty: 3,     min: 10,   location: 'Maint'   },
  { id: 'FAB-001', name: 'Grey Fabric 44"',type: 'Fabric',  unit: 'mtr', qty: 18400, min: 1000, location: 'Godown'  },
];

const TYPES = ['all', 'yarn', 'spares', 'fabric'];

export default function StockScreen() {
  const [filter, setFilter] = useState('all');
  const shown = filter === 'all'
    ? MOCK_STOCK
    : MOCK_STOCK.filter((s) => s.type.toLowerCase() === filter);
  const lowStock = MOCK_STOCK.filter((s) => s.qty < s.min).length;

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <View style={S.header}>
        <Text style={S.eyebrow}>MADHUSUDHAN FABRICS</Text>
        <View style={S.titleRow}>
          <Text style={S.title}>Stock</Text>
          {lowStock > 0 && (
            <View style={S.alertBadge}>
              <Text style={S.alertText}>⚠ {lowStock} low</Text>
            </View>
          )}
        </View>
        <Text style={S.sub}>Yarn · fabric · spares inventory</Text>
      </View>

      <ScrollView style={S.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setFilter(t)}
                style={[S.pill, filter === t && S.pillOn]}
                activeOpacity={0.7}
              >
                <Text style={[S.pillText, filter === t && { color: '#fff' }]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {shown.map((item) => {
          const isLow = item.qty < item.min;
          const pct = Math.min(100, (item.qty / Math.max(item.min * 3, item.qty)) * 100);
          return (
            <View key={item.id} style={[S.card, { borderLeftColor: isLow ? '#ef4444' : '#1D9E75' }]}>
              <View style={S.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={S.itemId}>{item.id}</Text>
                  <Text style={S.itemName}>{item.name}</Text>
                  <Text style={S.itemMeta}>{item.type} · {item.location}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[S.itemQty, { color: isLow ? '#ef4444' : '#111827' }]}>
                    {item.qty.toLocaleString('en-IN')}{' '}
                    <Text style={S.itemUnit}>{item.unit}</Text>
                  </Text>
                  <Text style={S.itemMin}>min {item.min}</Text>
                </View>
              </View>
              {/* Progress bar */}
              <View style={S.barTrack}>
                <View style={[S.barFill, { width: `${pct}%`, backgroundColor: isLow ? '#ef4444' : '#1D9E75' }]} />
              </View>
            </View>
          );
        })}

        <ComingSoonBanner module="Stock" />
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#f8f7f4' },
  header:     { backgroundColor: '#13879A', padding: 16, paddingBottom: 18, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  eyebrow:    { fontSize: 10, color: '#fff', letterSpacing: 1, marginBottom: 3 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  title:      { fontSize: 20, fontWeight: '500', color: '#fff' },
  alertBadge: { backgroundColor: '#ef444422', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  alertText:  { color: '#ef4444', fontSize: 11, fontWeight: '500' },
  sub:        { fontSize: 11, color: '#fff' },
  body:       { flex: 1, paddingHorizontal: 12, paddingTop: 14 },
  pill:       { paddingVertical: 4, paddingHorizontal: 11, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  pillOn:     { backgroundColor: '#854F0B', borderColor: '#854F0B' },
  pillText:   { fontSize: 12, color: '#6b7280' },
  card:       { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: '#e5e7eb', borderLeftWidth: 3 },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemId:     { fontSize: 10, color: '#9ca3af', marginBottom: 1 },
  itemName:   { fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 1 },
  itemMeta:   { fontSize: 11, color: '#9ca3af' },
  itemQty:    { fontSize: 16, fontWeight: '600' },
  itemUnit:   { fontSize: 11, fontWeight: '400', color: '#6b7280' },
  itemMin:    { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  barTrack:   { height: 4, backgroundColor: '#f3f4f6', borderRadius: 2 },
  barFill:    { height: 4, borderRadius: 2 },
});
