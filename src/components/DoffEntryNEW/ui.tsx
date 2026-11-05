// FILE: src/components/DoffEntryNEW/ui.tsx
// Doff Entry building blocks: a cross-platform date/time field (native
// DateTimePicker dialog on Android, spinner in a Sheet on iOS, <input> on web),
// KPI tile, key/value cell and small badges. Generic pieces (SelectField, Sheet,
// Btn) come from StockVerificationNEW/ui.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Btn, Sheet } from '../StockVerificationNEW/ui';

const pad = (n: number) => String(n).padStart(2, '0');
const toWebDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toWebTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

type DTProps = {
  label?: string;
  mode: 'date' | 'time';
  /** Date shown in the picker. */
  value: Date;
  /** Text shown in the field (legacy display format). */
  text: string;
  /** No stored value yet (web input shows blank instead of today). */
  empty?: boolean;
  minimumDate?: Date | null;
  maximumDate?: Date | null;
  /** Return false when the pick was rejected by a validation (web input resets). */
  onPick: (d: Date) => boolean | void;
  disabled?: boolean;
  style?: any;
};

/** Date or time field. Picked dates keep the time-of-day of `value` (same as the native picker). */
export function DateTimeField({ label, mode, value, text, empty, minimumDate, maximumDate, onPick, disabled, style }: DTProps) {
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState<Date>(value);
  const [nonce, setNonce] = useState(0);
  const icon = mode === 'date' ? 'date-range' : 'schedule';

  useEffect(() => { if (show) setTemp(value); }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const labelEl = label ? <Text style={d.label}>{label}</Text> : null;

  if (Platform.OS === 'web') {
    const current = empty ? '' : mode === 'date' ? toWebDate(value) : toWebTime(value);
    const inputStyle: any = {
      flex: 1, minWidth: 0, width: '100%', height: 38, border: 'none', outline: 'none', background: 'transparent',
      fontSize: 14, fontWeight: 600, color: T.ink, padding: 0, cursor: disabled ? 'default' : 'pointer',
    };
    return (
      <View style={[{ flex: 1, minWidth: 0 }, style]}>
        {labelEl}
        <View style={[d.field, disabled && { opacity: 0.55 }]}>
          <Icon name={icon as any} size={18} color={T.muted} />
          {React.createElement('input', {
            key: `${current}-${nonce}`,
            type: mode,
            defaultValue: current,
            disabled,
            min: mode === 'date' && minimumDate ? toWebDate(minimumDate) : undefined,
            max: mode === 'date' && maximumDate ? toWebDate(maximumDate) : undefined,
            'aria-label': label || mode,
            style: inputStyle,
            onChange: (e: any) => {
              const v: string = e?.target?.value || '';
              if (!v) return;
              let next: Date;
              if (mode === 'date') {
                const [y, m, dd] = v.split('-').map(Number);
                if (!y || y < 1900 || !m || !dd) return; // ignore half-typed years
                next = new Date(value);
                next.setFullYear(y, m - 1, dd);
              } else {
                const [h, mi] = v.split(':').map(Number);
                if (Number.isNaN(h) || Number.isNaN(mi)) return;
                next = new Date(value);
                next.setHours(h, mi, 0, 0);
              }
              if (onPick(next) === false) setNonce((n) => n + 1);
            },
          })}
        </View>
      </View>
    );
  }

  const button = (
    <TouchableOpacity
      style={[d.field, disabled && { opacity: 0.55 }]}
      onPress={() => setShow(true)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label || mode}: ${text}`}
    >
      <Icon name={icon as any} size={18} color={T.muted} />
      <Text style={[d.fieldText, empty && { color: T.muted }]} numberOfLines={1}>{text}</Text>
    </TouchableOpacity>
  );

  if (Platform.OS === 'ios') {
    return (
      <View style={[{ flex: 1, minWidth: 0 }, style]}>
        {labelEl}
        {button}
        <Sheet
          open={show}
          onClose={() => setShow(false)}
          eyebrow={mode === 'date' ? 'PICK DATE' : 'PICK TIME'}
          title={label || (mode === 'date' ? 'Date' : 'Time')}
          wideMax={420}
          footer={(
            <>
              <Btn label="Cancel" kind="ghost" onPress={() => setShow(false)} style={{ flex: 1 }} />
              <Btn label="Done" kind="copper" onPress={() => { setShow(false); onPick(temp); }} style={{ flex: 2 }} />
            </>
          )}
        >
          <View style={{ alignItems: 'center' }}>
            <DateTimePicker
              value={temp}
              mode={mode}
              display="spinner"
              is24Hour
              locale="en-IN"
              textColor={T.ink}
              themeVariant="light"
              minimumDate={mode === 'date' ? minimumDate || undefined : undefined}
              maximumDate={mode === 'date' ? maximumDate || undefined : undefined}
              onChange={(_e: any, dt?: Date) => { if (dt) setTemp(dt); }}
            />
          </View>
        </Sheet>
      </View>
    );
  }

  // Android — native dialog, exactly like legacy (display="default", only 'set' is applied).
  return (
    <View style={[{ flex: 1, minWidth: 0 }, style]}>
      {labelEl}
      {button}
      {show ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          is24Hour
          locale="en-IN"
          minimumDate={mode === 'date' ? minimumDate || undefined : undefined}
          maximumDate={mode === 'date' ? maximumDate || undefined : undefined}
          onChange={(event: any, dt?: Date) => {
            setShow(false);
            if (event?.type === 'set' && dt) onPick(dt);
          }}
        />
      ) : null}
    </View>
  );
}

export function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={d.kpi}>
      <Text style={d.kpiLabel} numberOfLines={1}>{label}</Text>
      <Text style={[d.kpiValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

export function KV({ k, v, wide }: { k: string; v: any; wide?: boolean }) {
  return (
    <View style={[d.kv, wide && { width: '100%' }]}>
      <Text style={d.kvK} numberOfLines={1}>{k}</Text>
      <Text style={d.kvV} numberOfLines={2}>{v === null || v === undefined || v === '' ? 'N/A' : String(v)}</Text>
    </View>
  );
}

export function Badge({ label, color, bg, icon }: { label: string; color: string; bg: string; icon?: string }) {
  return (
    <View style={[d.badge, { backgroundColor: bg, borderColor: color }]}>
      {icon ? <Icon name={icon as any} size={11} color={color} /> : null}
      <Text style={[d.badgeText, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export const d = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.4, marginBottom: 5, textTransform: 'uppercase' },
  field: { height: 42, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldText: { flex: 1, fontSize: 14, fontWeight: '600', color: T.ink },
  kpi: { flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.62)', letterSpacing: 0.6, textTransform: 'uppercase' },
  kpiValue: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  kv: { width: '50%', paddingRight: 8, marginBottom: 8 },
  kvK: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kvV: { fontSize: 13.5, fontWeight: '700', color: T.ink, marginTop: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
});
