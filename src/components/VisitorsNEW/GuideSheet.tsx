// FILE: src/components/VisitorsNEW/GuideSheet.tsx
// Step-by-step help, shown as a grid of cards. Each card = a small picture of
// that part of the screen (GuideArt.tsx) + what to do.
//   - Visits screen : English / Hindi (switch inside the sheet); opens by
//     itself the first time the screen is used on a phone.
//   - Visitors Report: English only (pass `steps` and no `onLang`).
// Text lives in i18n.ts (GUIDE_STEPS / REPORT_GUIDE_STEPS).
import { T } from '@/src/theme';
import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Btn, Sheet } from '../StockVerificationNEW/ui';
import GuideArt from './GuideArt';
import { GUIDE_DONE, GUIDE_STEPS, GUIDE_TITLE, GuideStep } from './i18n';
import { Lang } from './model';
import { LangToggle } from './ui';

type Props = {
  open: boolean;
  lang: Lang;
  /** Pass to show the English / Hindi switch. */
  onLang?: (l: Lang) => void;
  onClose: () => void;
  steps?: GuideStep[];
  title?: string;
};

export default function GuideSheet({ open, lang, onLang, onClose, steps = GUIDE_STEPS, title }: Props) {
  const i = lang === 'hi' ? 1 : 0;
  const { width } = useWindowDimensions();
  const two = width >= 720; // two cards per row on tablet / web
  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={lang === 'hi' ? 'मदद' : 'GUIDE'}
      title={title || GUIDE_TITLE[i]}
      wideMax={860}
      footer={<Btn label={GUIDE_DONE[i]} icon="check" kind="copper" onPress={onClose} style={{ flex: 1, height: 50 }} />}
    >
      {onLang ? (
        <View style={{ alignItems: 'flex-start' }}>
          <LangToggle lang={lang} onChange={onLang} />
        </View>
      ) : null}
      <View style={g.grid}>
        {steps.map((s) => (
          <View key={s.art} style={[g.card, two && g.cardHalf]}>
            <View style={g.art}><GuideArt art={s.art} lang={lang} /></View>
            <View style={g.text}>
              <Text style={g.title}>{s.title[i] || s.title[0]}</Text>
              <Text style={g.body}>{s.body[i] || s.body[0]}</Text>
            </View>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

const g = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexBasis: '100%', flexGrow: 1, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  cardHalf: { flexBasis: '47%' },
  art: { minHeight: 96, backgroundColor: T.bg, borderBottomWidth: 1, borderBottomColor: T.hair, padding: 12, alignItems: 'center', justifyContent: 'center' },
  text: { padding: 12 },
  title: { fontSize: 15.5, fontWeight: '800', color: T.nav },
  body: { fontSize: 14.5, lineHeight: 21, color: '#4A4540', marginTop: 4 },
});
