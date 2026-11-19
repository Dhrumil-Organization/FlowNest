// FILE: src/features/support/components/TicketCard.tsx
// One card of the IT Desk board / list.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { devSideOf, fmtMinutes, fmtYmd, isOverdue, priorityOf, Ticket, typeOf } from '../model';
import { Avatar, MONO } from './ui';

type Props = {
  t: Ticket;
  onPress: (t: Ticket) => void;
  dragHandlers?: any; // PanResponder handlers for the grip
  draggable?: boolean;
  dimmed?: boolean;
  ghost?: boolean;
  onLayout?: (e: any) => void;
  /** one compact line instead of a card (lots of data) */
  dense?: boolean;
  /** web: mouse over -> quick preview (null = left) */
  onHover?: (t: Ticket | null, e?: any) => void;
};

function Card({ t, onPress, dragHandlers, draggable, dimmed, ghost, onLayout, dense, onHover }: Props) {
  const p = priorityOf(t.priority);
  const ty = typeOf(t.type);
  const overdue = isOverdue(t);
  const side = devSideOf(t.dev_side);
  const est = t.est_min || 0;
  const hover = onHover ? { onHoverIn: (e: any) => onHover(t, e), onHoverOut: () => onHover(null) } : {};
  if (dense) {
    const over = est && t.spent_min > est;
    return (
      <View onLayout={onLayout} style={[s.line, { borderLeftColor: p.color }, dimmed && { opacity: 0.35 }, ghost && s.ghost]}>
        <Pressable {...(hover as any)} onPress={() => onPress(t)} style={({ pressed, hovered }: any) => [s.lineBody, (pressed || hovered) && !ghost && { backgroundColor: T.sub }]} accessibilityRole="button" accessibilityLabel={`${t.no} ${t.title}`}>
          <Icon name={ty.icon as any} size={13} color={ty.color} />
          <Text style={s.lineNo}>{t.no.replace(/^T[SK]-/, '')}</Text>
          {t.kind === 'ticket' ? <View style={s.dot} /> : null}
          <Text style={s.lineTitle} numberOfLines={1}>{t.title}</Text>
          {side ? <Text style={[s.lineChip, { color: side.color }]}>{side.short}</Text> : null}
          {t.due_date ? <Text style={[s.lineChip, overdue && { color: T.red }]}>{fmtYmd(t.due_date)}</Text> : null}
          {est || t.spent_min ? <Text style={[s.lineChip, over ? { color: T.red } : null]}>{t.spent_min ? fmtMinutes(t.spent_min) : '0m'}{est ? `/${fmtMinutes(est)}` : ''}</Text> : null}
          {t.comments ? <Text style={s.lineChip}>💬{t.comments}</Text> : null}
          {t.assignee ? <Avatar name={t.assignee.name} id={t.assignee.id} color={t.assignee.color} size={18} /> : <View style={[s.unassigned, { width: 18, height: 18 }]} />}
        </Pressable>
        {draggable ? (
          <View {...dragHandlers} style={[s.grip, { width: 22 }]} accessibilityLabel="Drag to move">
            <Icon name="drag-indicator" size={15} color={T.muted} />
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View onLayout={onLayout} style={[s.card, { borderLeftColor: p.color }, dimmed && { opacity: 0.35 }, ghost && s.ghost]}>
      <Pressable {...(hover as any)} onPress={() => onPress(t)} style={({ pressed }) => [s.body, pressed && !ghost && { backgroundColor: T.sub }]} accessibilityRole="button" accessibilityLabel={`${t.no} ${t.title}`}>
        <View style={s.top}>
          <Icon name={ty.icon as any} size={14} color={ty.color} />
          <Text style={s.no}>{t.no}</Text>
          {t.kind === 'ticket' ? <View style={s.ticketTag}><Text style={s.ticketTagText}>USER</Text></View> : null}
          {t.priority >= 3 ? <Icon name={p.icon as any} size={15} color={p.color} /> : null}
          <View style={{ flex: 1 }} />
          {t.assignee ? <Avatar name={t.assignee.name} id={t.assignee.id} color={t.assignee.color} size={22} /> : <View style={s.unassigned}><Icon name="person-outline" size={13} color={T.muted} /></View>}
        </View>
        <Text style={s.title} numberOfLines={3}>{t.title}</Text>
        {t.module_label || t.client ? (
          <Text style={s.meta} numberOfLines={1}>
            {t.client ? `${t.client.name}${t.module_label ? ' · ' : ''}` : ''}{t.module_label}
          </Text>
        ) : null}
        {t.labels.length ? (
          <View style={s.labels}>{t.labels.slice(0, 3).map((l) => <Text key={l} style={s.label} numberOfLines={1}>{l}</Text>)}</View>
        ) : null}
        <View style={s.foot}>
          {t.due_date ? (
            <View style={[s.chip, overdue && { backgroundColor: `${T.red}14` }]}>
              <Icon name="event" size={12} color={overdue ? T.red : T.muted} />
              <Text style={[s.chipText, overdue && { color: T.red }]}>{fmtYmd(t.due_date)}</Text>
            </View>
          ) : null}
          {side ? <View style={[s.chip, { backgroundColor: `${side.color}14` }]}><Text style={[s.chipText, { color: side.color }]}>{side.short}</Text></View> : null}
          {est || t.spent_min ? (
            <View style={[s.chip, est && t.spent_min > est ? { backgroundColor: `${T.red}12` } : null]}>
              <Icon name="schedule" size={12} color={est && t.spent_min > est ? T.red : T.muted} />
              <Text style={[s.chipText, est && t.spent_min > est ? { color: T.red } : null]}>{t.spent_min ? fmtMinutes(t.spent_min) : '0m'}{est ? ` / ${fmtMinutes(est)}` : ''}</Text>
            </View>
          ) : null}
          {t.comments ? <View style={s.chip}><Icon name="chat-bubble-outline" size={12} color={T.muted} /><Text style={s.chipText}>{t.comments}</Text></View> : null}
          {t.attachments ? <View style={s.chip}><Icon name="image" size={12} color={T.muted} /><Text style={s.chipText}>{t.attachments}</Text></View> : null}
          {t.status === 'done' && t.has_resolution ? <Icon name="verified" size={14} color={T.green} /> : null}
        </View>
      </Pressable>
      {draggable ? (
        <View {...dragHandlers} style={s.grip} accessibilityLabel="Drag to move" accessibilityHint="Hold and drag to another column">
          <Icon name="drag-indicator" size={18} color={T.muted} />
        </View>
      ) : null}
    </View>
  );
}

export const TicketCard = memo(Card);

const s = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, marginBottom: 8, overflow: 'hidden' },
  ghost: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12, transform: [{ rotate: '1.5deg' }], borderColor: T.copper },
  body: { flex: 1, minWidth: 0, padding: 10, paddingRight: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  no: { fontSize: 11, fontWeight: '800', color: T.muted, fontFamily: MONO },
  ticketTag: { paddingHorizontal: 5, height: 16, borderRadius: 4, backgroundColor: `${T.copper}1A`, justifyContent: 'center' },
  ticketTagText: { fontSize: 8.5, fontWeight: '900', color: T.copper, letterSpacing: 0.4 },
  unassigned: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderStyle: 'dashed', borderColor: T.muted, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13.5, fontWeight: '800', color: T.ink, marginTop: 6, lineHeight: 18 },
  meta: { fontSize: 11, color: T.muted, fontWeight: '700', marginTop: 4 },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  label: { fontSize: 10, fontWeight: '800', color: T.yd, backgroundColor: `${T.yd}12`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, overflow: 'hidden', maxWidth: 120 },
  foot: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 20, paddingHorizontal: 6, borderRadius: 6, backgroundColor: T.alt },
  chipText: { fontSize: 10.5, fontWeight: '800', color: T.muted },
  line: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 8, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, marginBottom: 4, overflow: 'hidden' },
  lineBody: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 8, paddingRight: 4, minHeight: 32 },
  lineNo: { fontSize: 10.5, fontWeight: '800', color: T.muted, fontFamily: MONO },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.copper },
  lineTitle: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: '800', color: T.ink },
  lineChip: { fontSize: 10.5, fontWeight: '800', color: T.muted },
  grip: { width: 26, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: T.hair, ...(Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none', userSelect: 'none' } as any) : null) },
});
