// FILE: src/components/DoffEntryNEW/DoffCard.tsx
// One doff row (legacy FlatList renderItem): start/end date+time pickers,
// Chees / Gross Wt. inputs (Net Wt. read-only, auto = Gross − Chees×coneweight),
// and — on the FIRST row only while no last-doff exists — Delete, the
// "Last Doff" switch and UPDATE.
import { T, S } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Btn } from '../StockVerificationNEW/ui';
import {
  formatTimeForPicker, getDisplayDate, getDisplayTime, isOn, parseYYYYMMDD, Row, str,
} from './model';
import { Badge, DateTimeField, d } from './ui';

type Props = {
  item: Row;
  cur: Row; // editable values for this doff
  isFirst: boolean;
  hasLastDoff: boolean;
  minDate: Date;
  maxDate: Date;
  busy: '' | 'update' | 'delete';
  locked: boolean; // another write is running
  onPickStartDate: (d: Date) => boolean;
  onPickStartTime: (d: Date) => boolean;
  onPickEndDate: (d: Date) => boolean;
  onPickEndTime: (d: Date) => boolean;
  onField: (field: string, value: any) => boolean;
  onDelete: () => void;
  onUpdate: () => void;
};

const val = (cur: Row, item: Row, f: string) => str(cur[f] !== undefined ? cur[f] : (item[f] || ''));

export default function DoffCard({
  item, cur, isFirst, hasLastDoff, minDate, maxDate, busy, locked,
  onPickStartDate, onPickStartTime, onPickEndDate, onPickEndTime, onField, onDelete, onUpdate,
}: Props) {
  const isLast = item.islastdoff === '1';
  const open = !item.enddate || !item.endtime;
  const accent = isLast ? T.red : open ? T.amber : T.green;
  const canEditFirst = isFirst && !hasLastDoff;

  const startDate = cur.startdate || item.startdate;
  const startTime = cur.starttime || item.starttime;
  const endDate = cur.enddate || item.enddate;
  const endTime = cur.endtime || item.endtime;
  const lastOn = cur.islastdoff !== undefined ? isOn(cur.islastdoff) : (item.islastdoff === '1' || item.islastdoff === 1);

  return (
    <View style={[c.card, { borderLeftColor: accent }, isLast && { borderColor: 'rgba(178,58,42,0.45)' }]}>
      <View style={c.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={c.eyebrow}>DOFF</Text>
          <Text style={c.title} numberOfLines={1}>#{str(item.doffno) || '—'}</Text>
        </View>
        <View style={c.badges}>
          {isLast ? <Badge label="LAST DOFF" color={T.red} bg="#FBEDEA" icon="flag" /> : null}
          {open
            ? <Badge label="RUNNING" color={T.amber} bg="#FBF3E4" icon="timelapse" />
            : <Badge label="ENDED" color={T.green} bg="#EAF3EE" icon="check-circle" />}
        </View>
        {canEditFirst ? (
          <TouchableOpacity
            onPress={onDelete}
            disabled={locked}
            style={[c.delBtn, locked && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel={`Delete doff ${str(item.doffno)}`}
          >
            <Icon name="delete-outline" size={19} color={T.red} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={c.row}>
        <DateTimeField
          label="Start Date"
          mode="date"
          value={parseYYYYMMDD(startDate)}
          text={getDisplayDate(startDate)}
          empty={!startDate}
          minimumDate={minDate}
          maximumDate={maxDate}
          onPick={onPickStartDate}
        />
        <DateTimeField
          label="Start Time"
          mode="time"
          value={formatTimeForPicker(startTime)}
          text={getDisplayTime(startTime)}
          empty={!startTime}
          onPick={onPickStartTime}
        />
      </View>
      <View style={c.row}>
        <DateTimeField
          label="End Date"
          mode="date"
          value={parseYYYYMMDD(endDate)}
          text={getDisplayDate(endDate)}
          empty={!endDate}
          minimumDate={minDate}
          maximumDate={maxDate}
          onPick={onPickEndDate}
        />
        <DateTimeField
          label="End Time"
          mode="time"
          value={formatTimeForPicker(endTime)}
          text={getDisplayTime(endTime)}
          empty={!endTime}
          onPick={onPickEndTime}
        />
      </View>

      <View style={c.row}>
        <View style={c.cell}>
          <Text style={d.label} numberOfLines={1}>Chees</Text>
          <TextInput
            style={c.input}
            value={val(cur, item, 'totchees')}
            onChangeText={(t) => onField('totchees', t)}
            keyboardType="numeric"
            placeholderTextColor={T.muted}
          />
        </View>
        <View style={c.cell}>
          <Text style={d.label} numberOfLines={1}>Gross Wt.</Text>
          <TextInput
            style={c.input}
            value={val(cur, item, 'totgrsqty')}
            onChangeText={(t) => onField('totgrsqty', t)}
            keyboardType="numeric"
            placeholderTextColor={T.muted}
          />
        </View>
        <View style={c.cell}>
          <Text style={d.label} numberOfLines={1}>Net Wt.</Text>
          <TextInput
            style={[c.input, c.inputRO]}
            value={val(cur, item, 'totnetqty')}
            editable={false}
            keyboardType="numeric"
          />
        </View>
      </View>

      {canEditFirst ? (
        <View style={c.foot}>
          <View style={c.switchRow}>
            <Switch
              value={lastOn}
              onValueChange={(v) => { onField('islastdoff', v ? '1' : '0'); }}
              trackColor={{ false: T.border, true: T.nav }}
              thumbColor="#fff"
            />
            <Text style={c.switchText}>Last Doff</Text>
          </View>
          <Btn label="Update" icon="save" kind="copper" compact onPress={onUpdate} loading={busy === 'update'} disabled={locked && busy !== 'update'} style={{ minWidth: 110 }} />
        </View>
      ) : null}
    </View>
  );
}

const c = StyleSheet.create({
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, padding: 12, gap: 10, ...S.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: '800', color: T.nav },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, flexShrink: 1 },
  delBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: T.red, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, minWidth: 0 },
  input: { height: 42, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 10, fontSize: 14, fontWeight: '600', color: T.ink },
  inputRO: { backgroundColor: T.sub, color: T.copper, fontWeight: '800' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchText: { fontSize: 13, fontWeight: '700', color: T.nav },
});
