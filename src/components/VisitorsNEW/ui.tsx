// FILE: src/components/VisitorsNEW/ui.tsx
// Building blocks of the Visitor module in the NEW ERP theme (T). Sized for a
// gate phone: large touch targets (48 px), large text, icons on every choice.
// Generic pieces (Sheet, Btn, SelectField) come from StockVerificationNEW/ui
// and the date / time field from DoffEntryNEW/ui — same as other NEW screens.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import {
  Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { t } from './i18n';
import { Choice, fmtDateTime, initialsOf, labelOf, Lang, PHOTO_KINDS, VisitPhoto } from './model';

export const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

/* ------------------------------ LangToggle ------------------------------ */

export function LangToggle({ lang, onChange, dark }: { lang: Lang; onChange: (l: Lang) => void; dark?: boolean }) {
  const item = (l: Lang, label: string) => {
    const on = lang === l;
    return (
      <TouchableOpacity
        onPress={() => onChange(l)}
        style={[v.langItem, on && (dark ? v.langOnDark : v.langOn)]}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={l === 'en' ? 'English' : 'Hindi'}
      >
        <Text style={[v.langText, dark && { color: 'rgba(255,255,255,0.75)' }, on && { color: dark ? T.nav : '#fff' }]}>{label}</Text>
      </TouchableOpacity>
    );
  };
  return (
    <View style={[v.lang, dark && { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'transparent' }]}>
      {item('en', 'English')}
      {item('hi', 'हिन्दी')}
    </View>
  );
}

/* -------------------------------- Section ------------------------------- */

export function Section({ n, title, icon, children, right }: {
  n?: number; title: string; icon?: string; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <View style={v.section}>
      <View style={v.sectionHead}>
        {n ? <View style={v.sectionNo}><Text style={v.sectionNoText}>{n}</Text></View> : null}
        {icon ? <Icon name={icon as any} size={20} color={T.copper} /> : null}
        <Text style={v.sectionTitle}>{title}</Text>
        {right}
      </View>
      <View style={v.sectionBody}>{children}</View>
    </View>
  );
}

/* ------------------------------- TextField ------------------------------ */

type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  icon?: string;
  hint?: string;
  error?: string;
  right?: React.ReactNode;
  style?: any;
};

export function TextField({ label, icon, hint, error, right, style, multiline, ...input }: FieldProps) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ flexGrow: 1, flexBasis: 220, minWidth: 0 }, style]}>
      <Text style={v.label}>{label}</Text>
      <View style={[v.input, multiline && v.inputMulti, focus && { borderColor: T.nav }, !!error && { borderColor: T.red }]}>
        {icon ? <Icon name={icon as any} size={20} color={focus ? T.nav : T.muted} /> : null}
        <TextInput
          {...input}
          multiline={multiline}
          placeholderTextColor={T.muted}
          onFocus={(e) => { setFocus(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); input.onBlur?.(e); }}
          style={[v.inputText, multiline && { height: 70, textAlignVertical: 'top', paddingTop: 10 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
          accessibilityLabel={label}
        />
        {right}
      </View>
      {error ? <Text style={v.error}>{error}</Text> : hint ? <Text style={v.hint}>{hint}</Text> : null}
    </View>
  );
}

/* ------------------------------- ChipGroup ------------------------------ */

export function ChipGroup({ label, options, value, onChange, lang, clearable = true, compact }: {
  label?: string; options: Choice[]; value: string; onChange: (v: string) => void; lang: Lang; clearable?: boolean; compact?: boolean;
}) {
  return (
    <View style={{ width: '100%' }}>
      {label ? <Text style={v.label}>{label}</Text> : null}
      <View style={v.chips}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <TouchableOpacity
              key={o.value || '_none'}
              onPress={() => onChange(on && clearable ? '' : o.value)}
              style={[v.chip, compact && v.chipCompact, on && v.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Icon name={o.icon as any} size={compact ? 16 : 19} color={on ? '#fff' : T.copper} />
              <Text style={[v.chipText, on && { color: '#fff' }]} numberOfLines={1}>{lang === 'hi' ? o.hi : o.en}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* -------------------------------- Stepper ------------------------------- */

export function Stepper({ value, onChange, min = 0, max = 50 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <View style={v.stepper}>
      <TouchableOpacity style={v.stepBtn} onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min} accessibilityLabel="Less">
        <Icon name="remove" size={22} color={value <= min ? T.border : T.nav} />
      </TouchableOpacity>
      <Text style={v.stepVal}>{value}</Text>
      <TouchableOpacity style={v.stepBtn} onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max} accessibilityLabel="More">
        <Icon name="add" size={22} color={value >= max ? T.border : T.nav} />
      </TouchableOpacity>
    </View>
  );
}

/* --------------------------------- Avatar ------------------------------- */

const AVATAR_COLORS = [T.yd, T.copper, T.green, T.purple, T.blue, T.pd];

export function Avatar({ uri, name, size = 48 }: { uri?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [uri]);
  const code = Array.from(name || '?').reduce((s, c) => s + c.charCodeAt(0), 0);
  const bg = AVATAR_COLORS[code % AVATAR_COLORS.length];
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri && !failed) {
    return <Image source={{ uri }} style={[box, { backgroundColor: T.alt }]} onError={() => setFailed(true)} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[box, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.36 }}>{initialsOf(name)}</Text>
    </View>
  );
}

/* ------------------------------- PhotoStrip ----------------------------- */

export function PhotoStrip({ photos, onOpen, onRemove, lang, size = 74 }: {
  photos: VisitPhoto[]; onOpen: (index: number) => void; onRemove?: (id: string) => void; lang: Lang; size?: number;
}) {
  if (!photos.length) return null;
  return (
    <View style={v.photoWrap}>
      {photos.map((p, i) => (
        <View key={p.id} style={{ width: size }}>
          <TouchableOpacity onPress={() => onOpen(i)} accessibilityRole="imagebutton" accessibilityLabel={labelOf(PHOTO_KINDS, p.kind, lang)}>
            <Image source={{ uri: p.uri }} style={{ width: size, height: size, borderRadius: 10, backgroundColor: T.alt }} />
          </TouchableOpacity>
          <Text style={v.photoTag} numberOfLines={1}>{labelOf(PHOTO_KINDS, p.kind, lang)}</Text>
          {onRemove ? (
            <TouchableOpacity style={v.photoX} onPress={() => onRemove(p.id)} hitSlop={HIT} accessibilityLabel={t(lang, 'removePhoto')}>
              <Icon name="close" size={15} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Round "take photo" button with icon + label. */
export function PhotoButton({ icon, label, onPress, busy, count }: { icon: string; label: string; onPress: () => void; busy?: boolean; count?: number }) {
  return (
    <TouchableOpacity style={[v.photoBtn, busy && { opacity: 0.5 }]} onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={label}>
      <View>
        <Icon name={icon as any} size={22} color={T.nav} />
        <View style={v.photoPlus}><Icon name="add" size={11} color="#fff" /></View>
      </View>
      <Text style={v.photoBtnText} numberOfLines={2}>{label}</Text>
      {count ? <View style={v.photoCount}><Text style={v.photoCountText}>{count}</Text></View> : null}
    </TouchableOpacity>
  );
}

/* ------------------------------- PhotoThumbs ---------------------------- */

/** Small previews for list rows / cards: first `max` photos + "+n". Tap = full screen. */
export function PhotoThumbs({ photos, onOpen, max = 3, size = 38 }: {
  photos: VisitPhoto[]; onOpen: (index: number) => void; max?: number; size?: number;
}) {
  if (!photos.length) return null;
  const shown = photos.slice(0, max);
  const more = photos.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {shown.map((p, i) => (
        <TouchableOpacity key={p.id} onPress={() => onOpen(i)} accessibilityRole="imagebutton" accessibilityLabel={`Open photo ${i + 1} of ${photos.length}`}>
          <Image source={{ uri: p.uri }} style={{ width: size, height: size, borderRadius: 7, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border }} />
        </TouchableOpacity>
      ))}
      {more > 0 ? (
        <TouchableOpacity
          style={{ width: size, height: size, borderRadius: 7, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => onOpen(max)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${more} more photos`}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: T.nav }}>+{more}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ------------------------------- PhotoViewer ---------------------------- */

/**
 * Full-screen photo viewer: big photo, previous / next arrows, and a strip of
 * small previews at the bottom to jump between photos. `onRemove` (form only)
 * adds a delete button for the photo on screen.
 */
export function PhotoViewer({ photos, index, onClose, lang, onRemove }: {
  photos: VisitPhoto[]; index: number | null; onClose: () => void; lang: Lang; onRemove?: (id: string) => void;
}) {
  const [i, setI] = useState(0);
  const { width, height } = useWindowDimensions();
  useEffect(() => { if (index !== null) setI(index); }, [index]);
  const open = index !== null && photos.length > 0;
  const at = Math.max(0, Math.min(i, photos.length - 1));
  const cur = photos[at];
  const many = photos.length > 1;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={v.viewer}>
        {cur ? (
          <Image source={{ uri: cur.uri }} resizeMode="contain" style={{ width, height: height - (many ? 230 : 150) }} />
        ) : null}
        <View style={v.viewerTop}>
          <View style={{ flex: 1 }}>
            <Text style={v.viewerTitle}>{cur ? labelOf(PHOTO_KINDS, cur.kind, lang) : ''}</Text>
            <Text style={v.viewerSub}>
              {t(lang, 'photoOf', { a: at + 1, b: photos.length })}{cur?.takenAt ? ` · ${fmtDateTime(cur.takenAt)}` : ''}
            </Text>
          </View>
          {onRemove && cur ? (
            <TouchableOpacity
              style={[v.viewerBtn, { backgroundColor: T.red, marginRight: 10 }]}
              onPress={() => { onRemove(cur.id); if (photos.length <= 1) onClose(); }}
              accessibilityLabel={t(lang, 'removePhoto')}
            >
              <Icon name="delete-outline" size={22} color="#fff" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={v.viewerBtn} onPress={onClose} accessibilityLabel={t(lang, 'close')}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {many ? (
          <>
            <TouchableOpacity style={[v.viewerArrow, { left: 10 }, at <= 0 && { opacity: 0.3 }]} disabled={at <= 0} onPress={() => setI(at - 1)} accessibilityLabel="Previous photo">
              <Icon name="chevron-left" size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[v.viewerArrow, { right: 10 }, at >= photos.length - 1 && { opacity: 0.3 }]} disabled={at >= photos.length - 1} onPress={() => setI(at + 1)} accessibilityLabel="Next photo">
              <Icon name="chevron-right" size={32} color="#fff" />
            </TouchableOpacity>
            <View style={v.viewerStrip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
                {photos.map((p, n) => (
                  <TouchableOpacity key={p.id} onPress={() => setI(n)} accessibilityRole="imagebutton" accessibilityLabel={`Photo ${n + 1}`}>
                    <Image source={{ uri: p.uri }} style={[v.viewerThumb, n === at && v.viewerThumbOn]} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

/* -------------------------------- Suggest ------------------------------- */

/** Tap-to-fill words under a free-text field (from earlier visits, not a master). */
export function Suggest({ items, onPick, label }: { items: string[]; onPick: (value: string) => void; label?: string }) {
  if (!items.length) return null;
  return (
    <View style={v.suggest}>
      {label ? <Text style={v.suggestLbl}>{label}</Text> : null}
      {items.map((x) => (
        <TouchableOpacity key={x} style={v.suggestChip} onPress={() => onPick(x)} accessibilityRole="button" accessibilityLabel={`Fill ${x}`}>
          <Icon name="history" size={13} color={T.yd} />
          <Text style={v.suggestText} numberOfLines={1}>{x}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ---------------------------------- Toast ------------------------------- */

export type ToastMsg = { text: string; kind: 'ok' | 'error'; id: number } | null;

export function Toast({ msg, onDone, bottom = 16 }: { msg: ToastMsg; onDone: () => void; bottom?: number }) {
  useEffect(() => {
    if (!msg) return undefined;
    const timer = setTimeout(onDone, msg.kind === 'error' ? 5000 : 3200);
    return () => clearTimeout(timer);
  }, [msg, onDone]);
  if (!msg) return null;
  const ok = msg.kind === 'ok';
  return (
    <View style={[v.toastWrap, { bottom }]} pointerEvents="box-none">
      <TouchableOpacity style={[v.toast, { backgroundColor: ok ? T.green : T.red }]} onPress={onDone} activeOpacity={0.9} accessibilityRole="alert">
        <Icon name={ok ? 'check-circle' : 'error-outline'} size={20} color="#fff" />
        <Text style={v.toastText}>{msg.text}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* --------------------------------- KV / Tag ----------------------------- */

/** Label + value. Empty values are not rendered (keeps the detail sheet short). */
export function KV({ k, value, full, icon }: { k: string; value: any; full?: boolean; icon?: string }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={[v.kv, full && { flexBasis: '100%' }]}>
      <Text style={v.kvK} numberOfLines={1}>{k}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {icon ? <Icon name={icon as any} size={15} color={T.copper} /> : null}
        <Text style={v.kvV}>{String(value)}</Text>
      </View>
    </View>
  );
}

export function Tag({ label, icon, color = T.nav, bg = T.alt }: { label: string; icon?: string; color?: string; bg?: string }) {
  return (
    <View style={[v.tag, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon as any} size={13} color={color} /> : null}
      <Text style={[v.tagText, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export const v = StyleSheet.create({
  lang: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 22, borderWidth: 1, borderColor: T.border, padding: 3 },
  langItem: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  langOn: { backgroundColor: T.nav },
  langOnDark: { backgroundColor: '#fff' },
  langText: { fontSize: 13.5, fontWeight: '800', color: T.nav },

  section: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden', ...S.card },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.hair },
  sectionNo: { width: 26, height: 26, borderRadius: 13, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  sectionNoText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  sectionTitle: { flex: 1, fontSize: 15.5, fontWeight: '800', color: T.nav },
  sectionBody: { padding: 14, gap: 14 },

  label: { fontSize: 13, fontWeight: '700', color: '#5E5852', marginBottom: 6 },
  input: {
    minHeight: 50, borderWidth: 1.5, borderColor: T.border, borderRadius: 12, backgroundColor: T.surface,
    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  inputMulti: { alignItems: 'flex-start', paddingTop: 2 },
  inputText: { flex: 1, minWidth: 0, fontSize: 16, color: T.ink, fontWeight: '600', paddingVertical: 0, height: 46 },
  hint: { fontSize: 12, color: T.muted, marginTop: 4 },
  error: { fontSize: 12.5, color: T.red, marginTop: 4, fontWeight: '700' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 46, paddingHorizontal: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface,
  },
  chipCompact: { minHeight: 40, paddingHorizontal: 11, borderRadius: 10 },
  chipOn: { backgroundColor: T.nav, borderColor: T.nav },
  chipText: { fontSize: 14, fontWeight: '700', color: T.ink },

  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: T.border, borderRadius: 12, backgroundColor: T.surface },
  stepBtn: { width: 48, height: 46, alignItems: 'center', justifyContent: 'center' },
  stepVal: { minWidth: 34, textAlign: 'center', fontSize: 17, fontWeight: '800', color: T.ink },

  photoWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoTag: { fontSize: 10.5, color: T.muted, fontWeight: '700', textAlign: 'center', marginTop: 3 },
  photoX: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  photoBtn: {
    flexGrow: 1, flexBasis: 96, minHeight: 68, borderRadius: 12, borderWidth: 1.5, borderColor: T.border, borderStyle: 'dashed',
    backgroundColor: T.sub, alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 6, paddingVertical: 8,
  },
  photoBtnText: { fontSize: 12.5, fontWeight: '700', color: T.nav, textAlign: 'center' },
  photoPlus: { position: 'absolute', right: -8, bottom: -3, width: 15, height: 15, borderRadius: 8, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  photoCount: { position: 'absolute', top: 5, right: 6, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  photoCountText: { color: '#fff', fontSize: 11, fontWeight: '900' },

  viewer: { flex: 1, backgroundColor: 'rgba(8,12,18,0.96)', alignItems: 'center', justifyContent: 'center' },
  viewerTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 22, paddingBottom: 10 },
  viewerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  viewerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  viewerBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  viewerArrow: { position: 'absolute', top: '45%', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  viewerStrip: { position: 'absolute', bottom: 22, left: 0, right: 0, height: 66 },
  viewerThumb: { width: 60, height: 60, borderRadius: 9, backgroundColor: '#222', borderWidth: 2, borderColor: 'transparent', opacity: 0.6 },
  viewerThumbOn: { borderColor: '#fff', opacity: 1 },

  suggest: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 7 },
  suggestLbl: { fontSize: 11.5, color: T.muted, fontWeight: '600', width: '100%' },
  suggestChip: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 34, maxWidth: '100%', paddingHorizontal: 10, borderRadius: 17, backgroundColor: '#E9F1F6' },
  suggestText: { fontSize: 13, fontWeight: '700', color: T.yd, flexShrink: 1 },

  toastWrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, maxWidth: 560, ...S.sheet },
  toastText: { color: '#fff', fontSize: 14.5, fontWeight: '700', flexShrink: 1 },

  kv: { flexGrow: 1, flexBasis: '45%', minWidth: 130 },
  kvK: { fontSize: 11, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  kvV: { fontSize: 14.5, fontWeight: '700', color: T.ink, flexShrink: 1 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24, borderRadius: 12, maxWidth: '100%' },
  tagText: { fontSize: 11.5, fontWeight: '800' },
});
