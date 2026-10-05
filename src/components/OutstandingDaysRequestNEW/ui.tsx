// FILE: src/components/OutstandingDaysRequestNEW/ui.tsx
// Local NEW ERP presentation helpers for the Outstanding Days Request module
// (same look as CreditLimitRequestNEW/ui.tsx so the two screens are a pair).
// Pure presentation only — no API calls, no business logic.
import { T, S } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Avatar } from '@/src/components/erpUi';
import { intText } from './model';

/** Max content width (porting brief). */
export const CONTENT_W = 1200;

/** Card-grid breakpoints of the porting brief: phone < 768 = 1 col, tablet 2, desktop (>= 1180) 3. */
export function useGrid() {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const cols = isPhone ? 1 : width >= 1180 ? 3 : 2;
  const gutter = isPhone ? 12 : 16;
  return { width, isPhone, cols, gutter };
}

export type Tone = 'green' | 'red' | 'copper' | 'blue' | 'amber' | 'muted';

const toneColor = (tone: Tone) =>
  tone === 'green' ? T.green
    : tone === 'red' ? T.red
      : tone === 'copper' ? T.copper
        : tone === 'blue' ? T.blue
          : tone === 'amber' ? T.amber
            : T.muted;

/** Small status pill (APPROVED / REJECTED / PENDING …). */
export function Pill({ text, tone, icon }: { text: string; tone: Tone; icon?: string }) {
  const c = toneColor(tone);
  return (
    <View style={[x.pill, { backgroundColor: `${c}14`, borderColor: `${c}45` }]}>
      {icon ? <Icon name={icon as any} size={12} color={c} /> : <View style={[x.pillDot, { backgroundColor: c }]} />}
      <Text style={[x.pillText, { color: c }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** Tiny meta tag (division, date …). */
export function Tag({ text, icon, tone = 'muted' }: { text?: string; icon?: string; tone?: Tone }) {
  if (!text) return null;
  const c = tone === 'muted' ? T.nav : toneColor(tone);
  return (
    <View style={[x.tag, tone !== 'muted' ? { backgroundColor: `${c}12` } : null]}>
      {icon ? <Icon name={icon as any} size={11} color={tone === 'muted' ? T.copper : c} /> : null}
      <Text style={[x.tagText, { color: c }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** Icon + label + value line (Remark / Broker / SExe …). */
export function InfoLine({
  icon,
  label,
  value,
  bold,
  lines = 2,
}: {
  icon: string;
  label: string;
  value?: any;
  bold?: boolean;
  lines?: number;
}) {
  const v = value === undefined || value === null || String(value).trim() === '' ? '—' : String(value);
  return (
    <View style={x.info}>
      <Icon name={icon as any} size={14} color={T.copper} style={{ marginTop: 1 }} />
      <Text style={x.infoLabel}>{label}</Text>
      <Text style={[x.infoValue, bold && { fontWeight: '800', color: T.ink }]} numberOfLines={lines}>{v}</Text>
    </View>
  );
}

/** Label/value cell used inside the T.sub metric boxes. */
export function Cell({ label, value, color, style }: { label: string; value?: any; color?: string; style?: any }) {
  const v = value === undefined || value === null || String(value).trim() === '' ? '—' : String(value);
  return (
    <View style={[x.cell, style]}>
      <Text style={x.cellLabel} numberOfLines={1}>{label}</Text>
      <Text style={[x.cellValue, color ? { color } : null]} numberOfLines={1}>{v}</Text>
    </View>
  );
}

/** isauth → pill (same mapping as the legacy stamp: 1 AUTHORISED, 2 REJECTED, else PENDING). */
export const authPill = (isauth: any) =>
  isauth === '1'
    ? { text: 'AUTHORISED', tone: 'green' as Tone, icon: 'verified' }
    : isauth === '2'
      ? { text: 'REJECTED', tone: 'red' as Tone, icon: 'block' }
      : { text: 'PENDING', tone: 'copper' as Tone, icon: 'schedule' };

/** Read-only outstanding-days history card (History tab + party-history panel).
 *  Shows exactly the fields the legacy cards showed; the legacy party-history
 *  card had no party line (showParty = false). */
export function HistoryCard({ item, showParty }: { item: any; showParty?: boolean }) {
  const ap = authPill(item.isauth);
  const statusColor = item.status === 'Authorised' ? T.green : item.status === 'Rejected' ? T.red : T.ink;
  return (
    <View
      style={[
        x.card,
        item.isauth === '1' ? x.cardOk : item.isauth === '2' ? x.cardBad : null,
      ]}
    >
      <View style={x.head}>
        {showParty ? <Avatar name={item.parname} size={38} /> : (
          <View style={x.headIcon}>
            <Icon name="date-range" size={18} color={T.copper} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={x.title} numberOfLines={2}>{showParty ? item.parname : item.prptypename}</Text>
          <View style={x.metaRow}>
            {showParty ? <Tag icon="business" text={item.prptypename} tone="blue" /> : null}
            <Tag icon="event" text={item.date} />
          </View>
        </View>
        {item.isauth ? <Pill text={ap.text} tone={ap.tone} icon={ap.icon} /> : null}
      </View>

      <View style={x.box}>
        <View style={x.row}>
          <Cell label="OS. Days" value={intText(item.limit1)} color={T.green} />
          <Cell label="Requested OS. Days" value={intText(item.limit2)} color={T.copper} style={x.wide} />
        </View>
        <View style={[x.row, x.authRow]}>
          <Cell label="Auth. OS. Day" value={intText(item.limit3)} color={T.nav} />
        </View>
      </View>

      <View style={x.grid2}>
        <Cell label="Revert Date" value={item.revertdate || 'N/A'} style={x.half} />
        <Cell label="Status" value={item.status} color={statusColor} style={x.half} />
        <Cell label="Authorised Date" value={item.adate || 'N/A'} style={x.half} />
        <Cell label="Authorised By" value={item.ausrname || 'N/A'} style={x.half} />
      </View>

      <View style={x.lines}>
        <InfoLine icon="notes" label="Remark" value={item.remark} lines={3} />
        <InfoLine icon="handshake" label="Broker" value={item.BrkAccName} />
        <InfoLine icon="badge" label="SExe" value={item.sexename} />
      </View>
    </View>
  );
}

export const x = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: T.alt,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  tagText: { fontSize: 10.5, fontWeight: '800', flexShrink: 1 },

  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  infoLabel: { width: 54, fontSize: 11, fontWeight: '800', color: T.muted, textTransform: 'uppercase', marginTop: 1 },
  infoValue: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: '600', color: T.ink, lineHeight: 17 },

  cell: { flex: 1, minWidth: 0 },
  cellLabel: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  cellValue: { fontSize: 13.5, fontWeight: '800', color: T.ink, marginTop: 2 },

  card: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 13,
    gap: 11,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  cardOk: { borderColor: `${T.green}55` },
  cardBad: { borderColor: `${T.red}55` },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.copper}14`,
  },
  title: { fontSize: 14.5, fontWeight: '800', color: T.ink, lineHeight: 19 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  box: {
    gap: 10,
    backgroundColor: T.sub,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: T.hair,
  },
  row: { flexDirection: 'row', gap: 10 },
  wide: { flex: 1.6 },
  authRow: { borderTopWidth: 1, borderTopColor: T.border, paddingTop: 9 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, paddingHorizontal: 2 },
  half: { flexBasis: '50%', flexGrow: 0, flexShrink: 0, paddingRight: 8 },
  lines: { gap: 6, borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 10 },
});
