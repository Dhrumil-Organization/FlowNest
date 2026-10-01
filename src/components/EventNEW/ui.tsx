// FILE: src/components/EventNEW/ui.tsx
// Small, presentation-only building blocks for the Event module that the
// shared NEW ERP kit (`@/src/components/erpUi`) does not provide.
// No API / business logic lives here.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';

/* ------------------------------------------------------------------ */
/* ModalPanel – a Modal whose body can host a FlatList (flex: 1).      */
/* Phone: tall bottom sheet. Wide: centred dialog or right side panel. */
/* ------------------------------------------------------------------ */
export function ModalPanel({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  right,
  children,
  footer,
  wideMax = 620,
  side = false,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wideMax?: number;
  side?: boolean;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const asSide = wide && side;
  return (
    <Modal visible={open} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[m.flex, asSide ? m.sideWrap : wide ? m.centerWrap : m.bottomWrap]}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={m.scrim} />
        </TouchableWithoutFeedback>
        <View
          style={[
            m.panel,
            asSide ? [m.panelSide, { maxWidth: wideMax }] : wide ? [m.panelWide, { maxWidth: wideMax }] : m.panelPhone,
          ]}
        >
          {!wide ? <View style={m.handle} /> : null}
          <View style={m.head}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {eyebrow ? <Text style={m.eyebrow}>{eyebrow}</Text> : null}
              <Text style={m.title} numberOfLines={1}>{title}</Text>
              {subtitle ? <Text style={m.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
            {right}
            <TouchableOpacity onPress={onClose} style={m.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
              <Icon name="close" size={20} color={T.nav} />
            </TouchableOpacity>
          </View>
          <View style={m.body}>{children}</View>
          {footer ? <View style={m.foot}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* FormField – labelled input that can be highlighted as "from card".  */
/* ------------------------------------------------------------------ */
export function FormField({
  label,
  required,
  highlight,
  multiline,
  style,
  compact,
  ...inputProps
}: {
  label?: string;
  required?: boolean;
  highlight?: boolean;
  multiline?: boolean;
  style?: any;
  compact?: boolean;
  [k: string]: any;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <View style={m.labelRow}>
          <Text style={m.label} numberOfLines={1}>
            {label}
            {required ? <Text style={{ color: T.red }}> *</Text> : null}
          </Text>
          {highlight ? (
            <View style={m.fromCard}>
              <Icon name="credit-card" size={11} color={T.green} />
              <Text style={m.fromCardText}>From card</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <View
        style={[
          m.box,
          compact && m.boxCompact,
          multiline && m.boxMulti,
          highlight && m.boxHighlight,
        ]}
      >
        <TextInput
          placeholderTextColor={T.muted}
          multiline={multiline}
          style={[m.input, compact && { fontSize: 13.5 }, multiline && { textAlignVertical: 'top', minHeight: 56 }]}
          {...inputProps}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Option row for pick lists                                           */
/* ------------------------------------------------------------------ */
export function OptionRow({
  label,
  sub,
  selected,
  done,
  onPress,
  icon,
}: {
  label: string;
  sub?: string;
  selected?: boolean;
  done?: boolean;
  onPress: () => void;
  icon?: string;
}) {
  return (
    <TouchableOpacity
      style={[m.option, selected && m.optionOn, done && m.optionDone]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon ? (
        <View style={[m.optionIcon, selected && { backgroundColor: T.nav }]}>
          <Icon name={icon as any} size={16} color={selected ? '#fff' : T.copper} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={m.optionText} numberOfLines={2}>{label}</Text>
        {sub ? <Text style={m.optionSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {done ? <Icon name="check-circle" size={20} color={T.green} /> : null}
      {selected && !done ? <Icon name="check" size={20} color={T.nav} /> : null}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/* Dashed "add" button                                                 */
/* ------------------------------------------------------------------ */
export function DashedBtn({
  label,
  icon = 'add',
  onPress,
  disabled,
  style,
}: {
  label: string;
  icon?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: any;
}) {
  return (
    <TouchableOpacity
      style={[m.dashed, disabled && m.dashedOff, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Icon name={icon as any} size={18} color={disabled ? T.muted : T.copper} />
      <Text style={[m.dashedText, disabled && { color: T.muted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/* Card image tile (image or dashed upload placeholder)                */
/* ------------------------------------------------------------------ */
export function CardTile({
  label,
  source,
  emptyLabel,
  onEmptyPress,
  children,
  height = 150,
}: {
  label: string;
  source?: any;
  emptyLabel?: string;
  onEmptyPress?: () => void;
  children?: React.ReactNode;
  height?: number;
}) {
  return (
    <View style={m.tile}>
      <Text style={m.tileLabel}>{label}</Text>
      {source ? (
        <Image source={source} style={[m.tileImg, { height }]} resizeMode="contain" />
      ) : (
        <TouchableOpacity style={[m.tileEmpty, { height }]} onPress={onEmptyPress} activeOpacity={0.8} accessibilityRole="button">
          <View style={m.tileEmptyIcon}>
            <Icon name="add-photo-alternate" size={22} color={T.copper} />
          </View>
          <Text style={m.tileEmptyText}>{emptyLabel}</Text>
        </TouchableOpacity>
      )}
      {children ? <View style={m.tileActions}>{children}</View> : null}
    </View>
  );
}

/** Small text action (Replace / Remove) used under card tiles. */
export function LinkBtn({ label, icon, onPress, danger }: { label: string; icon?: string; onPress: () => void; danger?: boolean }) {
  const c = danger ? T.red : T.blue;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[m.link, { borderColor: `${c}40`, backgroundColor: `${c}0D` }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {icon ? <Icon name={icon as any} size={14} color={c} /> : null}
      <Text style={[m.linkText, { color: c }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Small uppercase badge, e.g. "ITEM 1", "DESIGN 2", "NEW". */
export function Tag({ label, tone = 'copper', style }: { label: string; tone?: 'copper' | 'green' | 'muted' | 'blue' | 'red'; style?: any }) {
  const c = tone === 'green' ? T.green : tone === 'blue' ? T.blue : tone === 'red' ? T.red : tone === 'muted' ? T.muted : T.copper;
  return (
    <View style={[m.tag, { backgroundColor: `${c}14`, borderColor: `${c}40` }, style]}>
      <Text style={[m.tagText, { color: c }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export const m = StyleSheet.create({
  flex: { flex: 1 },
  centerWrap: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  sideWrap: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  bottomWrap: { justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,27,42,0.5)' },
  panel: { backgroundColor: T.bg, overflow: 'hidden', ...S.sheet },
  panelPhone: { height: '92%', borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  panelWide: { width: '100%', height: '86%', borderRadius: 16 },
  panelSide: { width: '100%', height: '100%', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  handle: { alignSelf: 'center', width: 38, height: 4.5, borderRadius: 3, backgroundColor: T.border, marginTop: 8 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
  title: { fontSize: 16, fontWeight: '800', color: T.nav },
  subtitle: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: T.alt },
  body: { flex: 1 },
  foot: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: T.hair,
    backgroundColor: T.surface,
  },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flexShrink: 1, fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  fromCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: `${T.green}14`,
  },
  fromCardText: { fontSize: 9.5, fontWeight: '800', color: T.green, letterSpacing: 0.3 },
  box: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    backgroundColor: T.surface,
    paddingHorizontal: 12,
  },
  boxCompact: { height: 40, paddingHorizontal: 10, borderRadius: 9 },
  boxMulti: { height: undefined, minHeight: 76, alignItems: 'flex-start', paddingVertical: 10 },
  boxHighlight: { borderColor: `${T.green}66`, backgroundColor: `${T.green}0D` },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: T.ink,
    paddingVertical: 0,
    minWidth: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  optionOn: { borderColor: `${T.nav}66`, backgroundColor: T.sub },
  optionDone: { borderColor: `${T.green}66`, backgroundColor: `${T.green}0A` },
  optionIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.copper}14` },
  optionText: { fontSize: 14, fontWeight: '700', color: T.ink },
  optionSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },

  dashed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: `${T.copper}99`,
    backgroundColor: `${T.copper}0D`,
  },
  dashedOff: { borderColor: T.border, backgroundColor: T.sub },
  dashedText: { fontSize: 13.5, fontWeight: '800', color: T.copper },

  tile: {
    flex: 1,
    minWidth: 140,
    backgroundColor: T.sub,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  tileLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  tileImg: { width: '100%', borderRadius: 10, backgroundColor: T.alt },
  tileEmpty: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: `${T.copper}80`,
    backgroundColor: `${T.copper}0A`,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tileEmptyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.copper}16` },
  tileEmptyText: { fontSize: 13, fontWeight: '800', color: T.copper },
  tileActions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  linkText: { fontSize: 12, fontWeight: '800' },

  tag: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
});
