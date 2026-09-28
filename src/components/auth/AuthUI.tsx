// ─────────────────────────────────────────────────────────────
// FILE: src/components/auth/AuthUI.tsx
//
// Shared, presentation-only building blocks for the pre-ERP auth flow:
//   Landing → Signup → ERP (New / Legacy) select → Legacy login
//                                              → New ERP property → New ERP login
//
// Everything here uses the canonical NEW ERP theme (`@/src/theme`) so the
// auth screens look like the New ERP app (navy header, cream panel, copper
// actions). These components hold NO business logic — screens keep their
// own state, API calls, storage keys and routing exactly as before and only
// render through these wrappers.
//
// Responsive behaviour (same breakpoints as the New ERP dashboard):
//   • Mobile  (< 768)       navy hero on top + cream panel with rounded top
//   • Tablet  (768 – 1023)  same stack, content centred in a readable column
//   • Wide    (>= 1024)     split screen: navy brand panel | form card
// ─────────────────────────────────────────────────────────────
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/src/theme';
import flownestLogo from '../../../assets/images/logo.png';

// Navy shades already used by the New ERP desktop sidebar.
export const NAVY = {
  base: T.nav,
  raised: '#112638',
  line: '#193149',
  lineStrong: '#294258',
  text: '#EAF2F7',
  sub: '#A9C0D4',
  muted: '#7C9BB5',
} as const;

export const AUTH_BREAKPOINTS = { tablet: 768, wide: 1024, desktop: 1180 } as const;

export function useAuthResponsive() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= AUTH_BREAKPOINTS.wide;
  const isTablet = width >= AUTH_BREAKPOINTS.tablet && !isWide;
  const isMobile = width < AUTH_BREAKPOINTS.tablet;
  const isDesktop = width >= AUTH_BREAKPOINTS.desktop;
  const gutter = isWide ? 40 : isTablet ? 32 : 18;
  return { width, height, isWide, isTablet, isMobile, isDesktop, gutter };
}

// Removes the default browser focus ring on react-native-web inputs; the
// field draws its own copper focus border instead.
const webNoOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

// ─── Brand mark ──────────────────────────────────────────────
export function BrandMark({ size = 36, light = true, caption }: { size?: number; light?: boolean; caption?: string }) {
  return (
    <View style={styles.brandMark}>
      <Image source={flownestLogo} style={{ width: size, height: size }} resizeMode="contain" />
      <View style={{ marginLeft: 10 }}>
        <Text style={[styles.brandWord, { color: light ? '#FFFFFF' : T.ink, fontSize: size * 0.55 }]}>FlowNest</Text>
        {caption ? (
          <Text style={[styles.brandCaption, { color: light ? NAVY.muted : T.muted }]}>{caption}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Small typography helpers ────────────────────────────────
export function Eyebrow({ children, color = T.copper, style }: { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, { color }, style]}>{children}</Text>;
}

export function FieldLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.fieldLabel, style]}>{children}</Text>;
}

// ─── Shell ───────────────────────────────────────────────────
export type Highlight = { icon: string; title: string; desc: string };

const DEFAULT_HIGHLIGHTS: Highlight[] = [
  { icon: 'insights', title: 'One platform', desc: 'Production, sales, collections and reports in one place.' },
  { icon: 'verified-user', title: 'Secure sessions', desc: 'Role-based access for every screen you open.' },
  { icon: 'devices', title: 'Mobile, tablet & web', desc: 'The same ERP wherever you work.' },
];

type AuthShellProps = {
  /** Small copper label above the title (e.g. "NEW ERP SYSTEM"). */
  eyebrow?: string;
  /** Screen / form title, e.g. "Sign in". */
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  /** Left brand panel content on wide screens. */
  brandTitle?: string;
  brandSubtitle?: string;
  highlights?: Highlight[];
  /** Optional node rendered at the very top of the form card. */
  cardHeader?: React.ReactNode;
  /** Max width of the form column on tablet / wide screens. */
  maxWidth?: number;
  children: React.ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  brandTitle = 'Smart ERP for textile & manufacturing',
  brandSubtitle = 'Manage production, collections, receivables, sales analysis and daily operations from a single platform.',
  highlights = DEFAULT_HIGHLIGHTS,
  cardHeader,
  maxWidth = 480,
  children,
}: AuthShellProps) {
  const { isWide, isTablet, gutter, height } = useAuthResponsive();
  const insets = useSafeAreaInsets();

  const backButton = onBack ? (
    <TouchableOpacity
      onPress={onBack}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={backLabel}
      style={[styles.backBtn, isWide && styles.backBtnLight]}
      hitSlop={8}
    >
      <Icon name="arrow-back-ios-new" size={15} color={isWide ? T.ink : '#FFFFFF'} />
      <Text style={[styles.backText, isWide && { color: T.ink }]}>{backLabel}</Text>
    </TouchableOpacity>
  ) : null;

  // ── Wide: split screen ──────────────────────────────────────
  if (isWide) {
    return (
      <View style={styles.splitRoot}>
        <StatusBar barStyle="light-content" backgroundColor={T.nav} />
        <View style={[styles.brandPanel, { paddingTop: 40 + insets.top, paddingBottom: 40 + insets.bottom }]}>
          <BrandMark size={40} caption="MADHUSUDHAN FABRICS" />

          <View style={styles.brandBody}>
            <Eyebrow color={T.copper}>TEXTILE ERP PLATFORM</Eyebrow>
            <Text style={styles.brandTitle}>{brandTitle}</Text>
            <Text style={styles.brandSubtitle}>{brandSubtitle}</Text>

            <View style={{ marginTop: 34 }}>
              {highlights.map((h) => (
                <View key={h.title} style={styles.highlightRow}>
                  <View style={styles.highlightIcon}>
                    <Icon name={h.icon as any} size={18} color={T.copper} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.highlightTitle}>{h.title}</Text>
                    <Text style={styles.highlightDesc}>{h.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.brandFooter}>Developed by Madhusudan Group · Textile Innovation</Text>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={{ flex: 1, backgroundColor: T.bg }}
            contentContainerStyle={[
              styles.splitScroll,
              { minHeight: height, paddingHorizontal: gutter, paddingTop: 40 + insets.top, paddingBottom: 40 + insets.bottom },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: '100%', maxWidth }}>
              {backButton ? <View style={{ marginBottom: 18 }}>{backButton}</View> : null}
              <View style={styles.card}>
                {cardHeader}
                {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
                <Text style={styles.cardTitle}>{title}</Text>
                {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
                <View style={{ marginTop: 22 }}>{children}</View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Mobile / Tablet: navy hero + cream panel ────────────────
  const column: ViewStyle = isTablet ? { width: '100%', maxWidth: Math.max(maxWidth, 560), alignSelf: 'center' } : {};

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.nav} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.hero, { paddingHorizontal: gutter }, isTablet && { paddingTop: 36, paddingBottom: 40 }]}>
            <View style={column}>
              <View style={styles.heroTop}>
                {backButton ?? <View />}
                <BrandMark size={isTablet ? 32 : 28} />
              </View>
              {eyebrow ? <Eyebrow style={{ marginTop: 26 }}>{eyebrow}</Eyebrow> : <View style={{ height: 22 }} />}
              <Text style={[styles.heroTitle, isTablet && { fontSize: 36, lineHeight: 42 }]}>{title}</Text>
              {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={[styles.panel, { paddingHorizontal: gutter }, isTablet && { paddingTop: 30 }]}>
            <View style={column}>
              {cardHeader}
              {children}
              <Text style={styles.panelFooter}>Developed by Madhusudan Group</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Input ───────────────────────────────────────────────────
export type FieldTone = 'default' | 'success' | 'error' | 'warning';

type AuthFieldProps = TextInputProps & {
  label?: string;
  icon?: string;
  right?: React.ReactNode;
  tone?: FieldTone;
  helper?: string;
  helperTone?: FieldTone;
  containerStyle?: StyleProp<ViewStyle>;
};

const TONE_COLOR: Record<FieldTone, string> = {
  default: T.muted,
  success: T.green,
  error: T.red,
  warning: T.amber,
};

export function AuthField({
  label,
  icon,
  right,
  tone = 'default',
  helper,
  helperTone,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor =
    tone === 'success' ? T.green : tone === 'error' ? T.red : tone === 'warning' ? T.amber : focused ? T.copper : T.border;

  return (
    <View style={[{ marginBottom: 14 }, containerStyle]}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <View
        style={[
          styles.inputBox,
          { borderColor },
          focused && tone === 'default' && styles.inputBoxFocused,
          tone === 'success' && { backgroundColor: '#F3F8F5' },
          tone === 'error' && { backgroundColor: '#FCF4F2' },
        ]}
      >
        {icon ? <Icon name={icon as any} size={19} color={focused ? T.copper : T.muted} style={{ marginRight: 10 }} /> : null}
        <TextInput
          placeholderTextColor={T.muted}
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, webNoOutline, style]}
        />
        {right ? <View style={{ marginLeft: 8 }}>{right}</View> : null}
      </View>
      {helper ? (
        <Text style={[styles.helper, { color: TONE_COLOR[helperTone ?? tone] }, (helperTone ?? tone) !== 'default' && { fontWeight: '700' }]}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      style={styles.toggle}
    >
      <Icon name={visible ? 'visibility-off' : 'visibility'} size={18} color={T.copper} />
      <Text style={styles.toggleText}>{visible ? 'Hide' : 'Show'}</Text>
    </TouchableOpacity>
  );
}

// ─── Buttons ─────────────────────────────────────────────────
type AuthButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'light' | 'outlineLight';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  /** Visually dim the button without disabling taps (legacy screens rely on
   *  the handler's own alert when the form is incomplete). */
  dimmed?: boolean;
};

export function AuthButton({ label, onPress, variant = 'primary', loading, disabled, icon, style, dimmed }: AuthButtonProps) {
  const v = BUTTON_VARIANTS[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.86}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={[styles.btn, v.box, (disabled || dimmed) && styles.btnDisabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color as string} />
      ) : (
        <View style={styles.btnInner}>
          <Text style={[styles.btnText, v.text]}>{label}</Text>
          {icon ? <Icon name={icon as any} size={18} color={v.text.color as string} style={{ marginLeft: 8 }} /> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const BUTTON_VARIANTS: Record<string, { box: ViewStyle; text: TextStyle }> = {
  primary: {
    box: {
      backgroundColor: T.copper,
      shadowColor: T.copper,
      shadowOpacity: 0.28,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    text: { color: '#FFFFFF' },
  },
  secondary: { box: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border }, text: { color: T.ink } },
  ghost: { box: { backgroundColor: 'transparent' }, text: { color: T.copper } },
  light: { box: { backgroundColor: '#FFFFFF' }, text: { color: T.nav } },
  outlineLight: { box: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' }, text: { color: '#FFFFFF' } },
};

// ─── Selectable option card (radio) ──────────────────────────
type OptionCardProps = {
  title: string;
  description?: string;
  icon: string;
  active: boolean;
  onPress: () => void;
  badges?: { label: string; tone?: 'copper' | 'red' | 'green' | 'navy' }[];
  compact?: boolean;
};

const BADGE_TONES = {
  copper: { bg: '#FBF1E8', fg: T.copper },
  red: { bg: '#FBECE9', fg: T.red },
  green: { bg: '#EAF3EE', fg: T.green },
  navy: { bg: '#E9EEF3', fg: T.nav },
} as const;

export function OptionCard({ title, description, icon, active, onPress, badges, compact }: OptionCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active, checked: active }}
      style={[styles.option, compact && styles.optionCompact, active && styles.optionActive]}
    >
      <View style={[styles.optionIcon, compact && styles.optionIconCompact, active && { backgroundColor: T.copper }]}>
        <Icon name={icon as any} size={compact ? 20 : 24} color={active ? '#FFFFFF' : T.copper} />
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingRight: compact ? 4 : 10 }}>
        <Text style={[styles.optionTitle, compact && { fontSize: 14 }]}>{title}</Text>
        {description ? <Text style={styles.optionDesc}>{description}</Text> : null}
        {badges && badges.length ? (
          <View style={styles.badgeRow}>
            {badges.map((b) => {
              const tone = BADGE_TONES[b.tone ?? 'copper'];
              return (
                <View key={b.label} style={[styles.badge, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.badgeText, { color: tone.fg }]}>{b.label}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
      {compact ? (
        active ? <Icon name="check-circle" size={18} color={T.copper} /> : null
      ) : (
        <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioInner} /> : null}</View>
      )}
    </TouchableOpacity>
  );
}

// ─── Misc ────────────────────────────────────────────────────
export function InfoNote({ children, icon = 'lock-outline', style }: { children: React.ReactNode; icon?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.note, style]}>
      <Icon name={icon as any} size={16} color={T.green} style={{ marginTop: 1, marginRight: 9 }} />
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

export function CheckItem({ label, valid, pendingIcon = 'radio-button-unchecked' }: { label: string; valid: boolean; pendingIcon?: string }) {
  return (
    <View style={styles.checkItem}>
      <Icon name={(valid ? 'check-circle' : pendingIcon) as any} size={15} color={valid ? T.green : '#B9B2AB'} />
      <Text style={[styles.checkText, { color: valid ? T.green : T.muted }]}>{label}</Text>
    </View>
  );
}

/** Grid of password rules: 1 column on narrow phones, 2 columns otherwise. */
export function ChecklistBox({ children }: { children: React.ReactNode }) {
  const { width } = useAuthResponsive();
  const twoCol = width >= 380;
  return (
    <View style={styles.checklist}>
      {React.Children.map(children, (child) => (
        <View style={{ width: twoCol ? '50%' : '100%' }}>{child}</View>
      ))}
    </View>
  );
}

export function Divider({ label }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      {label ? <Text style={styles.dividerText}>{label}</Text> : null}
      {label ? <View style={styles.dividerLine} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // brand
  brandMark: { flexDirection: 'row', alignItems: 'center' },
  brandWord: { fontWeight: '900', letterSpacing: -0.3 },
  brandCaption: { fontSize: 9, fontWeight: '800', letterSpacing: 1.6, marginTop: 1 },
  eyebrow: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.4 },
  fieldLabel: { fontSize: 10.5, color: T.muted, fontWeight: '900', letterSpacing: 0.8, marginBottom: 7 },

  // split
  splitRoot: { flex: 1, flexDirection: 'row', backgroundColor: T.bg },
  brandPanel: {
    width: '42%',
    maxWidth: 600,
    minWidth: 400,
    backgroundColor: T.nav,
    paddingHorizontal: 48,
    paddingVertical: 40,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  brandBody: { marginVertical: 40 },
  brandTitle: { color: '#FFFFFF', fontSize: 38, lineHeight: 46, fontWeight: '900', marginTop: 14, letterSpacing: -0.6, maxWidth: 460 },
  brandSubtitle: { color: NAVY.sub, fontSize: 15, lineHeight: 24, marginTop: 14, maxWidth: 440 },
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, maxWidth: 440 },
  highlightIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: NAVY.raised,
    borderWidth: 1,
    borderColor: NAVY.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  highlightTitle: { color: NAVY.text, fontSize: 14, fontWeight: '800' },
  highlightDesc: { color: NAVY.muted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  brandFooter: { color: NAVY.muted, fontSize: 12 },
  splitScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 32,
    shadowColor: '#1A1514',
    shadowOpacity: 0.07,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardTitle: { fontSize: 28, lineHeight: 34, fontWeight: '900', color: T.ink, marginTop: 6, letterSpacing: -0.4 },
  cardSubtitle: { fontSize: 14, lineHeight: 21, color: T.muted, marginTop: 8 },

  // stacked
  safe: { flex: 1, backgroundColor: T.nav },
  hero: { backgroundColor: T.nav, paddingTop: 14, paddingBottom: 32 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: '#FFFFFF', marginTop: 8, letterSpacing: -0.4 },
  heroSubtitle: { fontSize: 13.5, color: NAVY.sub, lineHeight: 20, marginTop: 8, maxWidth: 520 },
  panel: {
    flexGrow: 1,
    backgroundColor: T.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 22,
    paddingBottom: 28,
    marginTop: -2,
  },
  panelFooter: { textAlign: 'center', color: T.muted, fontSize: 11, marginTop: 26 },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  backBtnLight: { backgroundColor: T.surface, borderColor: T.border },
  backText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginLeft: 5 },

  // inputs
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 13,
    paddingHorizontal: 14,
  },
  inputBoxFocused: {
    shadowColor: T.copper,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: T.ink, paddingVertical: 12 },
  helper: { fontSize: 12, marginTop: 6, marginLeft: 2, lineHeight: 16 },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  toggleText: { color: T.copper, fontSize: 12, fontWeight: '800', marginLeft: 4 },

  // buttons
  btn: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
  btnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },

  // option card
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  optionCompact: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 13, marginBottom: 10 },
  optionActive: { borderColor: T.copper, backgroundColor: '#FFFCF9' },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: T.sub,
    borderWidth: 1,
    borderColor: T.hair,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionIconCompact: { width: 38, height: 38, borderRadius: 11, marginRight: 12 },
  optionTitle: { fontSize: 16, fontWeight: '900', color: T.ink },
  optionDesc: { fontSize: 12.5, color: T.muted, lineHeight: 18, marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, marginRight: 6, marginTop: 2 },
  badgeText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.3 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CFC8C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: T.copper },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.copper },

  // misc
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: T.sub,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    marginTop: 16,
  },
  noteText: { flex: 1, color: T.muted, fontSize: 12, lineHeight: 17 },
  checklist: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: T.sub,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.hair,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -2,
    marginBottom: 6,
  },
  checkItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingRight: 6 },
  checkText: { fontSize: 12, marginLeft: 6, fontWeight: '600', flexShrink: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: T.border },
  dividerText: { marginHorizontal: 12, color: T.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
});
