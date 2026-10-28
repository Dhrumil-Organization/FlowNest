// FILE: src/components/ProcessCompleteAuthNEW/CriteriaSheet.tsx
// NEW-theme replacement of legacy ProcessCompleteAuth/CriteriaForm.tsx:
// Property (LngName/PrpCode), Year (YearName/YearNo), From date, To date
// (shown DD-MM-YYYY) and a "Load Data" button. Store picker stays out — it is
// commented out in the legacy form.
import { T } from '@/src/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Btn, SelectField, Sheet, toOpts, u } from '../StockVerificationNEW/ui';
import { Row } from './api';

export type Criteria = { PrpCode?: string; YearNo?: string; StrCode: string };

/** legacy CriteriaForm formatDate → DD-MM-YYYY */
const formatDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromISO = (v: string) => {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

function DateField({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ flex: 1, minWidth: 150 }}>
      <Text style={u.label}>{label}<Text style={{ color: T.red }}> *</Text></Text>
      {Platform.OS === 'web' ? (
        <View style={[u.select, { paddingHorizontal: 8 }]}>
          {React.createElement('input', {
            type: 'date',
            value: toISO(value),
            onChange: (e: any) => { const v = e?.target?.value; if (v) onChange(fromISO(v)); },
            style: {
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              color: T.ink, fontSize: 14, fontWeight: 600, padding: 4, cursor: 'pointer',
            },
          })}
        </View>
      ) : (
        <>
          <TouchableOpacity style={u.select} onPress={() => setShow(true)} accessibilityRole="button" accessibilityLabel={`${label}: ${formatDate(value)}`}>
            <Icon name="event" size={18} color={T.muted} />
            <Text style={u.selectText}>{formatDate(value)}</Text>
          </TouchableOpacity>
          {show && (
            <DateTimePicker
              value={value}
              mode="date"
              display="default"
              onChange={(_event: any, date?: Date) => {
                setShow(Platform.OS === 'ios');
                if (date) onChange(date);
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  isLoading: boolean;
  values: Criteria;
  setValues: (fn: (v: Criteria) => Criteria) => void;
  properties: Row[];
  years: Row[];
  fromDate: Date;
  toDate: Date;
  onFromDateChange: (d: Date) => void;
  onToDateChange: (d: Date) => void;
  onLoad: () => void;
  title?: string;
};

export default function CriteriaSheet({
  open, onClose, isLoading, values, setValues, properties, years, fromDate, toDate, onFromDateChange, onToDateChange, onLoad, title = 'Process complete auth',
}: Props) {
  const prpOpts = useMemo(() => toOpts(properties || [], 'PrpCode', 'LngName'), [properties]);
  const yearOpts = useMemo(() => toOpts(years || [], 'YearNo', 'YearName'), [years]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="CRITERIA"
      title={title}
      footer={<Btn label="Load Data" icon="cloud-download" kind="copper" onPress={onLoad} loading={isLoading} style={{ flex: 1 }} />}
    >
      <View style={st.grid}>
        <SelectField
          label="Select Property"
          required
          value={String(values.PrpCode ?? '')}
          options={prpOpts}
          placeholder="Choose property..."
          onChange={(v) => setValues((s) => ({ ...s, PrpCode: v || '' }))}
        />
        <SelectField
          label="Select Year"
          required
          value={String(values.YearNo ?? '')}
          options={yearOpts}
          placeholder={yearOpts.length ? 'Choose year...' : 'No years data available'}
          onChange={(v) => setValues((s) => ({ ...s, YearNo: v || '' }))}
        />
      </View>
      <View style={st.grid}>
        <DateField label="From Date" value={fromDate} onChange={onFromDateChange} />
        <DateField label="To Date" value={toDate} onChange={onToDateChange} />
      </View>
    </Sheet>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
