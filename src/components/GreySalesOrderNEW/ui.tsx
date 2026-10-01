// Local presentation helpers for the Grey Sales Order (NEW ERP) screen.
// Pure UI only — no API / business logic lives here.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Colour tone for the authorisation "stamp" labels used by this module. */
export const authTone = (label?: string) => {
  switch (String(label || '').toUpperCase().trim()) {
    case 'APPROVED':
    case 'AUTHORISED':
    case 'YES':
      return { fg: T.green, bg: `${T.green}14`, bd: `${T.green}40` };
    case 'REJECTED':
    case 'NO':
      return { fg: T.red, bg: `${T.red}12`, bd: `${T.red}40` };
    case 'PENDING':
      return { fg: T.copper, bg: `${T.copper}14`, bd: `${T.copper}45` };
    default:
      return { fg: T.muted, bg: T.alt, bd: T.border };
  }
};

export function AuthPill({ label, icon, style }: { label?: string; icon?: string; style?: any }) {
  if (!label) return null;
  const t = authTone(label);
  return (
    <View style={[s.pill, { backgroundColor: t.bg, borderColor: t.bd }, style]}>
      {icon ? <Icon name={icon as any} size={12} color={t.fg} /> : <View style={[s.dot, { backgroundColor: t.fg }]} />}
      <Text style={[s.pillText, { color: t.fg }]} numberOfLines={1}>
        {String(label).toUpperCase()}
      </Text>
    </View>
  );
}

/** Small label/value pair used inside the T.sub metric box of a card. */
export function InfoCell({
  label,
  value,
  color,
  lines = 2,
  style,
}: {
  label: string;
  value?: string;
  color?: string;
  lines?: number;
  style?: any;
}) {
  const v = String(value ?? '').trim();
  return (
    <View style={[s.cell, style]}>
      <Text style={s.cellLabel} numberOfLines={1}>{label}</Text>
      <Text style={[s.cellValue, !v && { color: T.muted }, color && v ? { color } : null]} numberOfLines={lines}>
        {v || '—'}
      </Text>
    </View>
  );
}

/** Indian-grouped money/number for display only (keeps the raw value if it is not numeric). */
export const fmtNum = (v: any) => {
  const raw = String(v ?? '').trim();
  if (!raw) return '';
  const n = parseFloat(raw.replace(/,/g, ''));
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  cell: { flexGrow: 1, flexBasis: 120, minWidth: 0 },
  cellLabel: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  cellValue: { fontSize: 13, fontWeight: '700', color: T.ink, marginTop: 2 },
});
