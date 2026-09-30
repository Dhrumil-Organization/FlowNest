// FILE: src/components/ProcessCompleteAuthNEW/PCACard.tsx
// One process-complete row (legacy ProcessCompleteAuth/PCAcard.tsx renderItem):
// PartyNames + prod type, Quality/Batch/Shade/Property, and the six figures
// Packing no., Pack. date, Dyeing no. of cones (Cones), Dyeing qty. (NetWt),
// Packing no. of cones (PCones), Packing qty. (PQty). Save → confirm.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Row } from './api';

const v = (x: any) => (x === null || x === undefined || x === '' ? '—' : String(x));

function Info({ k, val }: { k: string; val: any }) {
  return (
    <View style={c.infoRow}>
      <Text style={c.infoK} numberOfLines={1}>{k}</Text>
      <Text style={c.infoV} numberOfLines={2}>{v(val)}</Text>
    </View>
  );
}

function Cell({ k, val, accent }: { k: string; val: any; accent?: string }) {
  return (
    <View style={c.cell}>
      <Text style={c.cellK} numberOfLines={1}>{k}</Text>
      <Text style={[c.cellV, accent ? { color: accent } : null]} numberOfLines={1}>{v(val)}</Text>
    </View>
  );
}

function PCACard({ item, onSave }: { item: Row; onSave: (item: Row) => void }) {
  return (
    <View style={[c.card, S.card]}>
      <View style={c.head}>
        <View style={c.headIcon}><Icon name="task-alt" size={18} color={T.copper} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={c.eyebrow}>PARTY</Text>
          <Text style={c.title} numberOfLines={2}>{v(item.PartyNames)}</Text>
        </View>
        <View style={c.badge}>
          <Text style={c.badgeText} numberOfLines={1}>{v(item.ProdType)}</Text>
        </View>
      </View>

      <View style={c.info}>
        <Info k="Quality" val={item.ItmName} />
        <Info k="Batch no." val={item.MerName} />
        <Info k="Shade" val={item.ShdName} />
        <Info k="Property" val={item.PrpCode} />
      </View>

      <View style={c.grid}>
        <Cell k="Packing no." val={item.PackingNo} accent={T.nav} />
        <Cell k="Pack. date" val={item.PackDate} />
        <Cell k="Dyeing no. of cones" val={item.Cones} />
        <Cell k="Dyeing qty." val={item.NetWt} accent={T.copper} />
        <Cell k="Packing no. of cones" val={item.PCones} />
        <Cell k="Packing qty." val={item.PQty} accent={T.green} />
      </View>

      <TouchableOpacity style={c.saveBtn} onPress={() => onSave(item)} accessibilityRole="button" accessibilityLabel="Save">
        <Icon name="save" size={18} color="#fff" />
        <Text style={c.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(PCACard);

const c = StyleSheet.create({
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, gap: 10, flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FBF1E8', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 1 },
  title: { fontSize: 14.5, fontWeight: '800', color: T.nav },
  badge: { maxWidth: 110, borderWidth: 1, borderColor: T.blue, backgroundColor: '#EEF2F8', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10.5, fontWeight: '800', color: T.blue },
  info: { backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.hair, paddingHorizontal: 10, paddingVertical: 8, gap: 4 },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoK: { width: 72, fontSize: 11.5, fontWeight: '700', color: T.muted },
  infoV: { flex: 1, fontSize: 13, fontWeight: '700', color: T.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  cell: { width: '50%', paddingRight: 8 },
  cellK: { fontSize: 10, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  cellV: { fontSize: 14, fontWeight: '800', color: T.ink, marginTop: 1 },
  saveBtn: { height: 40, borderRadius: 10, backgroundColor: T.copper, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 },
  saveText: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
});
