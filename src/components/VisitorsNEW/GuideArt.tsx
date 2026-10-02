// FILE: src/components/VisitorsNEW/GuideArt.tsx
// Small pictures used inside the guides (Visits + Visitors Report): each one
// is a miniature of the REAL part of the screen the step talks about (same
// colours, icons and words), so the user can match the guide with the screen.
// Drawn with plain Views — no image files to ship or keep in sync.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { t } from './i18n';
import { Lang } from './model';

const Pill = ({ text, on, color = T.nav }: { text: string; on?: boolean; color?: string }) => (
  <View style={[a.pill, on && { backgroundColor: color, borderColor: color }]}>
    <Text style={[a.pillText, on && { color: '#fff' }]} numberOfLines={1}>{text}</Text>
  </View>
);
const Btn = ({ icon, text, bg, fg = '#fff', border }: { icon: string; text: string; bg: string; fg?: string; border?: boolean }) => (
  <View style={[a.btn, { backgroundColor: bg }, border && { borderWidth: 1, borderColor: T.border }]}>
    <Icon name={icon as any} size={15} color={fg} />
    <Text style={[a.btnText, { color: fg }]} numberOfLines={1}>{text}</Text>
  </View>
);
const Field = ({ icon, text, muted }: { icon: string; text: string; muted?: boolean }) => (
  <View style={a.field}>
    <Icon name={icon as any} size={15} color={T.muted} />
    <Text style={[a.fieldText, muted && { color: T.muted, fontWeight: '500' }]} numberOfLines={1}>{text}</Text>
  </View>
);
const Shot = ({ color, x }: { color: string; x?: boolean }) => (
  <View style={[a.shot, { backgroundColor: color }]}>
    <Icon name="person" size={18} color="rgba(255,255,255,0.85)" />
    {x ? <View style={a.shotX}><Icon name="close" size={9} color="#fff" /></View> : null}
  </View>
);
const Tile = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <View style={[a.tile, { borderTopColor: color }]}>
    <Text style={a.tileLbl} numberOfLines={1}>{label}</Text>
    <Text style={[a.tileVal, { color }]}>{value}</Text>
  </View>
);
const Bar = ({ label, pct, color }: { label: string; pct: number; color: string }) => (
  <View style={{ gap: 3 }}>
    <Text style={a.barLbl} numberOfLines={1}>{label}</Text>
    <View style={a.barTrack}><View style={[a.barFill, { width: `${pct}%`, backgroundColor: color }]} /></View>
  </View>
);
const PhotoBtn = ({ icon, text }: { icon: string; text: string }) => (
  <View style={a.photoBtn}>
    <Icon name={icon as any} size={16} color={T.nav} />
    <Text style={a.photoBtnText} numberOfLines={1}>{text}</Text>
  </View>
);

export default function GuideArt({ art, lang }: { art: string; lang: Lang }) {
  switch (art) {
    /* ------------------------------ Visits ------------------------------ */
    case 'newEntry':
      return (
        <View style={[a.btn, { backgroundColor: T.copper, height: 44, borderRadius: 12, alignSelf: 'stretch', justifyContent: 'flex-start', paddingHorizontal: 12 }]}>
          <View style={a.round}><Icon name="person-add" size={17} color={T.copper} /></View>
          <Text style={[a.btnText, { color: '#fff', fontSize: 14, flex: 1 }]} numberOfLines={1}>{t(lang, 'newEntry')}</Text>
          <Icon name="chevron-right" size={20} color="#fff" />
        </View>
      );
    case 'mobile':
      return (
        <View style={a.col}>
          <Field icon="phone" text="98250 11203" />
          <View style={a.row}>
            <View style={{ flex: 1 }}><Field icon="person" text="Amit Choksi" /></View>
            <View style={{ flex: 1 }}><Field icon="business" text="Choksi Textiles" /></View>
          </View>
          <View style={a.green}>
            <Icon name="history" size={14} color={T.green} />
            <Text style={a.greenText} numberOfLines={2}>{t(lang, 'knownFilled', { n: 5 })}</Text>
          </View>
        </View>
      );
    case 'photos':
      return (
        <View style={a.col}>
          <View style={a.row}>
            <PhotoBtn icon="face" text={t(lang, 'addFace')} />
            <PhotoBtn icon="contact-mail" text={t(lang, 'addCard')} />
            <PhotoBtn icon="photo-camera" text={t(lang, 'addOther')} />
          </View>
          <View style={a.row}>
            <Shot color={T.yd} x />
            <Shot color={T.copper} x />
            <Shot color={T.green} x />
          </View>
        </View>
      );
    case 'group':
      return (
        <View style={a.col}>
          <View style={a.dashed}>
            <Icon name="person-add" size={17} color={T.copper} />
            <Text style={[a.btnText, { color: T.pd }]} numberOfLines={1}>{t(lang, 'addPerson')}</Text>
          </View>
          <View style={[a.row, { alignItems: 'center', alignSelf: 'flex-end' }]}>
            <View style={a.step}><Icon name="remove" size={14} color={T.nav} /></View>
            <Text style={a.fieldText}>2</Text>
            <View style={a.step}><Icon name="add" size={14} color={T.nav} /></View>
          </View>
        </View>
      );
    case 'purpose':
      return (
        <View style={a.col}>
          <View style={a.row}>
            <Pill text={lang === 'hi' ? 'मिलने आए' : 'Meeting'} on />
            <Pill text={lang === 'hi' ? 'ऑर्डर / सैंपल' : 'Order / Sample'} />
          </View>
          <Field icon="support-agent" text={t(lang, 'hostPh')} muted />
          <View style={a.row}>
            <View style={a.sugg}><Icon name="history" size={11} color={T.yd} /><Text style={a.suggText}>Rakesh Jariwala</Text></View>
            <View style={a.sugg}><Icon name="history" size={11} color={T.yd} /><Text style={a.suggText}>Dinesh Solanki</Text></View>
          </View>
        </View>
      );
    case 'save':
      return (
        <View style={a.row}>
          <Btn icon="playlist-add" text={t(lang, 'saveNext')} bg={T.surface} fg={T.nav} border />
          <Btn icon="check" text={t(lang, 'save')} bg={T.copper} />
        </View>
      );
    case 'markOut':
      return (
        <View style={a.card}>
          <View style={[a.rail, { backgroundColor: T.green }]} />
          <View style={[a.avatar, { backgroundColor: T.yd }]}><Text style={a.avatarText}>AC</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={a.name} numberOfLines={1}>Amit Choksi</Text>
            <Text style={a.sub} numberOfLines={1}>{t(lang, 'since', { d: lang === 'hi' ? '1 घं 20 मि' : '1h 20m' })}</Text>
          </View>
          <Btn icon="logout" text={t(lang, 'markOut')} bg={T.green} />
        </View>
      );
    case 'findEdit':
      return (
        <View style={a.col}>
          <Field icon="search" text={t(lang, 'searchPh')} muted />
          <View style={a.row}>
            <Btn icon="delete-outline" text={t(lang, 'delete')} bg={T.surface} fg={T.nav} border />
            <Btn icon="edit" text={t(lang, 'edit')} bg={T.surface} fg={T.nav} border />
          </View>
        </View>
      );

    /* -------------------------- Visitors Report -------------------------- */
    case 'rPeriod':
      return (
        <View style={a.row}>
          <Pill text="Today" />
          <Pill text="This month" on />
          <Pill text="This year" />
          <Pill text="‹  Oct 2026  ›" />
        </View>
      );
    case 'rKpi':
      return (
        <View style={a.row}>
          <Tile label="VISITS" value="38" color={T.nav} />
          <Tile label="STILL INSIDE" value="2" color={T.green} />
          <Tile label="TOO LONG" value="1" color={T.red} />
        </View>
      );
    case 'rSearch':
      return (
        <View style={a.col}>
          <View style={a.row}>
            <View style={{ flex: 1 }}><Field icon="search" text="Search…" muted /></View>
            <Btn icon="filter-list" text="Filters (1)" bg={T.nav} />
          </View>
          <View style={a.row}>
            <View style={a.sugg}><Text style={[a.suggText, { color: T.nav }]}>Meeting</Text><Icon name="close" size={11} color={T.nav} /></View>
          </View>
        </View>
      );
    case 'rSummary':
      return (
        <View style={[a.col, { gap: 7 }]}>
          <Bar label="Order / Sample · 10" pct={100} color={T.copper} />
          <Bar label="Material delivery · 6" pct={60} color={T.copper} />
          <Bar label="Meeting · 4" pct={40} color={T.copper} />
        </View>
      );
    case 'rPeriods':
      return (
        <View style={a.col}>
          <View style={a.row}>
            <Pill text="Day-wise" />
            <Pill text="Month-wise" on />
            <Pill text="Year-wise" />
          </View>
          <View style={a.tr}>
            <Text style={[a.name, { flex: 1 }]} numberOfLines={1}>Sep 2026</Text>
            <Text style={a.sub}>148 visits · 61 unique</Text>
          </View>
        </View>
      );
    case 'rRegister':
      return (
        <View style={a.col}>
          <View style={a.row}>
            <Pill text="Newest" on />
            <Pill text="Longest stay" />
          </View>
          <View style={a.tr}>
            <Text style={[a.name, { flex: 1 }]} numberOfLines={1}>Amit Choksi</Text>
            <Text style={a.sub}>10:15 – 11:40</Text>
            <View style={a.tag}><Text style={a.tagText}>Went out</Text></View>
          </View>
        </View>
      );
    case 'rPhotos':
      return (
        <View style={[a.row, { alignItems: 'center' }]}>
          <Shot color={T.yd} />
          <Shot color={T.copper} />
          <View style={[a.shot, { backgroundColor: T.alt }]}><Text style={[a.fieldText, { fontSize: 11 }]}>+2</Text></View>
          <Icon name="arrow-forward" size={16} color={T.muted} />
          <View style={a.full}><Icon name="person" size={24} color="rgba(255,255,255,0.85)" /></View>
        </View>
      );
    case 'rEditDelete':
      return (
        <View style={a.row}>
          <Btn icon="delete-outline" text="Delete" bg={T.surface} fg={T.nav} border />
          <Btn icon="edit" text="Edit" bg={T.surface} fg={T.nav} border />
        </View>
      );
    case 'rVisitors':
      return (
        <View style={a.card}>
          <View style={[a.avatar, { backgroundColor: T.copper }]}><Text style={a.avatarText}>RY</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={a.name} numberOfLines={1}>Ramesh Yadav</Text>
            <Text style={a.sub} numberOfLines={1}>Last 02 Oct · avg 25 min</Text>
          </View>
          <View style={a.count}><Text style={a.countVal}>7</Text><Text style={a.sub}>visits</Text></View>
        </View>
      );
    case 'rExport':
      return (
        <View style={a.row}>
          <Btn icon="table-view" text="Excel" bg={T.surface} fg={T.green} border />
          <Btn icon="picture-as-pdf" text="PDF" bg={T.surface} fg={T.red} border />
          <Btn icon="print" text="Print" bg={T.surface} fg={T.nav} border />
        </View>
      );
    default:
      return null;
  }
}

const a = StyleSheet.create({
  col: { alignSelf: 'stretch', gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { height: 28, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 11.5, fontWeight: '800', color: T.ink },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 9 },
  btnText: { fontSize: 12, fontWeight: '800' },
  round: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface },
  fieldText: { flex: 1, fontSize: 13, fontWeight: '700', color: T.ink },
  green: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E6F1EA', borderRadius: 8, padding: 7 },
  greenText: { flex: 1, fontSize: 11, fontWeight: '700', color: T.green },
  photoBtn: { flexGrow: 1, flexBasis: 60, alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 9, borderWidth: 1.5, borderColor: T.border, borderStyle: 'dashed', backgroundColor: T.surface },
  photoBtnText: { fontSize: 10, fontWeight: '700', color: T.nav },
  shot: { width: 34, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  shotX: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },
  full: { width: 58, height: 44, borderRadius: 7, backgroundColor: '#10161f', alignItems: 'center', justifyContent: 'center' },
  dashed: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1.5, borderColor: T.copper, borderStyle: 'dashed', backgroundColor: '#FBF3EA' },
  step: { width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  sugg: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#E9F1F6' },
  suggText: { fontSize: 11, fontWeight: '700', color: T.yd },
  card: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 8, paddingLeft: 11, overflow: 'hidden' },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  name: { fontSize: 12.5, fontWeight: '800', color: T.ink },
  sub: { fontSize: 10.5, color: T.muted, fontWeight: '600' },
  tile: { flexGrow: 1, flexBasis: 60, backgroundColor: T.surface, borderRadius: 8, borderWidth: 1, borderColor: T.border, borderTopWidth: 3, paddingHorizontal: 7, paddingVertical: 5 },
  tileLbl: { fontSize: 8, fontWeight: '900', color: T.muted, letterSpacing: 0.3 },
  tileVal: { fontSize: 15, fontWeight: '800' },
  barLbl: { fontSize: 11, fontWeight: '700', color: T.ink },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: T.alt, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 8, borderWidth: 1, borderColor: T.border, paddingHorizontal: 9, height: 34 },
  tag: { height: 20, paddingHorizontal: 7, borderRadius: 10, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  tagText: { fontSize: 10, fontWeight: '800', color: '#6B655F' },
  count: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: T.sub },
  countVal: { fontSize: 15, fontWeight: '900', color: T.nav },
});
