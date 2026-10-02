// FILE: src/components/VisitorsNEW/VisitDetailSheet.tsx
// Everything about ONE visit: person, company, purpose, times, all
// photos (tap = full screen) and who made the entry. Used by the Visits screen
// (with Edit / Mark OUT / Undo OUT / Delete — each shown only when its handler
// is passed, i.e. the user has that right) and by the Visitors Report
// (read-only, English).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Btn, Sheet } from '../StockVerificationNEW/ui';
import { t } from './i18n';
import {
  displayName, fmtDateTime, fmtDuration, fmtMobile, GENDERS, labelOf, Lang, PURPOSES, statusOf, stayMinutes, Visit,
} from './model';
import { Avatar, KV, PhotoStrip, PhotoViewer, Tag } from './ui';

type Props = {
  visit: Visit | null;
  lang: Lang;
  now?: Date;
  /** Other people of the same entry (came together). */
  group?: Visit[];
  onClose: () => void;
  onOpenVisit?: (v: Visit) => void;
  onEdit?: (v: Visit) => void;
  onCheckout?: (v: Visit) => void;
  onUndoOut?: (v: Visit) => void;
  onDelete?: (v: Visit) => void;
};

export const STATUS_STYLE = {
  inside: { color: T.green, bg: '#E6F1EA', icon: 'login', key: 'inside' as const },
  overstay: { color: T.red, bg: '#FCEDEA', icon: 'warning-amber', key: 'tooLong' as const },
  out: { color: '#6B655F', bg: T.alt, icon: 'logout', key: 'gone' as const },
};

export default function VisitDetailSheet({ visit, lang, now = new Date(), group = [], onClose, onOpenVisit, onEdit, onCheckout, onUndoOut, onDelete }: Props) {
  const [viewer, setViewer] = useState<number | null>(null);
  if (!visit) return null;
  const status = statusOf(visit, now);
  const ss = STATUS_STYLE[status];
  const name = displayName(visit, lang);
  const others = group.filter((g) => g.id !== visit.id);
  const hasActions = (!visit.outAt && onCheckout) || (visit.outAt && onUndoOut) || onEdit || onDelete;

  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow={`${t(lang, 'detailEyebrow')} · ${visit.visitNo}`}
      title={name}
      wideMax={680}
      footer={hasActions ? (
        <>
          {onDelete ? <Btn label={t(lang, 'delete')} icon="delete-outline" kind="ghost" onPress={() => onDelete(visit)} style={{ flex: 1 }} /> : null}
          {onEdit ? <Btn label={t(lang, 'edit')} icon="edit" kind="ghost" onPress={() => onEdit(visit)} style={{ flex: 1 }} /> : null}
          {!visit.outAt && onCheckout ? <Btn label={t(lang, 'markOut')} icon="logout" kind="copper" onPress={() => onCheckout(visit)} style={{ flex: 1.4 }} /> : null}
          {visit.outAt && onUndoOut ? <Btn label={t(lang, 'undoOut')} icon="undo" kind="ghost" onPress={() => onUndoOut(visit)} style={{ flex: 1.2 }} /> : null}
        </>
      ) : undefined}
    >
      {/* who */}
      <View style={d.top}>
        <Avatar uri={visit.photos.find((p) => p.kind === 'visitor')?.uri} name={name} size={64} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={d.name}>{name}</Text>
          {visit.company || visit.designation ? <Text style={d.sub}>{[visit.designation, visit.company].filter(Boolean).join(' · ')}</Text> : null}
          <View style={d.tags}>
            <Tag label={t(lang, ss.key)} icon={ss.icon} color={ss.color} bg={ss.bg} />
            {visit.groupSize > 1 ? <Tag label={t(lang, 'together', { n: visit.groupSize })} icon="groups" color={T.yd} bg="#E9F1F6" /> : null}
          </View>
        </View>
      </View>

      {visit.mobile ? (
        <TouchableOpacity style={d.call} onPress={() => { void Linking.openURL(`tel:${visit.mobile}`); }} accessibilityRole="button">
          <Icon name="call" size={20} color={T.green} />
          <Text style={d.callText}>{fmtMobile(visit.mobile)}{visit.altMobile ? `  /  ${fmtMobile(visit.altMobile)}` : ''}</Text>
          <Text style={d.callHint}>{t(lang, 'call')}</Text>
        </TouchableOpacity>
      ) : null}

      {/* photos: small previews, tap = full screen */}
      <View>
        <Text style={d.head}>{t(lang, 'photos')} ({visit.photos.length})</Text>
        {visit.photos.length
          ? <PhotoStrip photos={visit.photos} lang={lang} onOpen={setViewer} size={84} />
          : <Text style={d.none}>{t(lang, 'noPhotos')}</Text>}
      </View>

      {/* time */}
      <View style={d.timeRow}>
        <View style={d.timeBox}>
          <Text style={d.timeLbl}>{t(lang, 'inTime')}</Text>
          <Text style={d.timeVal}>{fmtDateTime(visit.inAt)}</Text>
        </View>
        <Icon name="arrow-forward" size={18} color={T.muted} />
        <View style={d.timeBox}>
          <Text style={d.timeLbl}>{t(lang, 'outTime')}</Text>
          <Text style={[d.timeVal, !visit.outAt && { color: ss.color }]}>{visit.outAt ? fmtDateTime(visit.outAt) : t(lang, ss.key)}</Text>
        </View>
        <View style={[d.timeBox, { flexGrow: 0, flexBasis: 96 }]}>
          <Text style={d.timeLbl}>{t(lang, 'stayTime')}</Text>
          <Text style={[d.timeVal, { color: ss.color }]}>{fmtDuration(stayMinutes(visit, now), lang)}</Text>
        </View>
      </View>

      {/* details */}
      <View style={d.grid}>
        <KV k={t(lang, 'purpose')} value={[labelOf(PURPOSES, visit.purpose, lang), visit.purposeNote].filter(Boolean).join(' — ')} full />
        <KV k={t(lang, 'host')} value={visit.hostName} icon="support-agent" />
        <KV k={t(lang, 'appointmentShort')} value={visit.appointment === 'Y' ? t(lang, 'yes') : visit.appointment === 'N' ? t(lang, 'no') : ''} />
        <KV k={t(lang, 'persons')} value={visit.extraPersons ? `1 ${t(lang, 'plusOthers', { n: visit.extraPersons })}` : '1'} />
        <KV k={t(lang, 'gender')} value={labelOf(GENDERS, visit.gender, lang)} />
        {visit.remarks ? <KV k={t(lang, 'remarks')} value={visit.remarks} full /> : null}
        {visit.outRemark ? <KV k={t(lang, 'outRemark')} value={visit.outRemark} full /> : null}
        <KV k={t(lang, 'entryBy')} value={visit.createdBy} />
        <KV k={t(lang, 'outBy')} value={visit.checkedOutBy} />
      </View>

      {/* came together */}
      {others.length ? (
        <View>
          <Text style={d.head}>{t(lang, 'together', { n: visit.groupSize })}</Text>
          {others.map((o) => (
            <TouchableOpacity key={o.id} style={d.other} onPress={() => onOpenVisit?.(o)} disabled={!onOpenVisit} accessibilityRole="button">
              <Avatar uri={o.photos.find((p) => p.kind === 'visitor')?.uri} name={displayName(o, lang)} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={d.otherName} numberOfLines={1}>{displayName(o, lang)}</Text>
                <Text style={d.otherSub} numberOfLines={1}>{o.mobile ? fmtMobile(o.mobile) : o.visitNo}</Text>
              </View>
              <Tag label={t(lang, STATUS_STYLE[statusOf(o, now)].key)} color={STATUS_STYLE[statusOf(o, now)].color} bg={STATUS_STYLE[statusOf(o, now)].bg} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <PhotoViewer photos={visit.photos} index={viewer} onClose={() => setViewer(null)} lang={lang} />
    </Sheet>
  );
}

const d = StyleSheet.create({
  top: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  name: { fontSize: 19, fontWeight: '800', color: T.ink },
  sub: { fontSize: 13.5, color: '#5E5852', fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  call: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#E6F1EA' },
  callText: { flex: 1, fontSize: 16, fontWeight: '800', color: T.ink },
  callHint: { fontSize: 13, fontWeight: '800', color: T.green },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  timeBox: { flexGrow: 1, flexBasis: 130, backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.hair, paddingHorizontal: 10, paddingVertical: 8 },
  timeLbl: { fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  timeVal: { fontSize: 13.5, fontWeight: '800', color: T.ink, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 12 },
  head: { fontSize: 12, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  none: { fontSize: 13.5, color: T.muted },
  other: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingVertical: 6, borderTopWidth: 1, borderTopColor: T.hair },
  otherName: { fontSize: 14.5, fontWeight: '700', color: T.ink },
  otherSub: { fontSize: 12, color: T.muted },
});
