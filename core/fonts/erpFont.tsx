// FILE: src/core/fonts/erpFont.tsx
// ONE professional UI font for the whole NEW ERP: Inter (rsms/inter v4.1,
// SIL Open Font License — see assets/fonts/inter/LICENSE.txt).
//
// How it applies everywhere without editing every screen:
//   - The 6 static weights are bundled in assets/fonts/inter and loaded by
//     app/new/_layout.tsx (expo-font useFonts).
//   - installErpFont() (erpFontPatch.*) hooks React Native's <Text> and
//     <TextInput> once. Inside <ErpFontScope value={true}> (the NEW ERP tree)
//     every text whose style has NO font family (or the old 'System' /
//     'DMSans' tokens) gets the Inter face that matches its fontWeight:
//        100–400 -> Inter-Regular   500 -> Inter-Medium   600 -> Inter-SemiBold
//        700/bold -> Inter-Bold     800 -> Inter-ExtraBold 900 -> Inter-Black
//   - Text that already sets its own family is left alone (icon fonts such
//     as MaterialIcons etc.), except the old Menlo / Courier / monospace /
//     DM Mono number styles, which also get Inter (with tabular figures).
//   - Nested <Text> without its own weight keeps the parent's face.
//   - Outside the scope (legacy screens) nothing changes.
//
//   - PROFESSIONAL WEIGHTS: the screens use fontWeight '800'/'900' almost
//     everywhere, which in Inter (Black) looks heavy on small labels. Heavy
//     weights are toned down to Bold on body-size text and kept ExtraBold
//     only for large display text (KPI numbers, page titles).
//   - RESPONSIVE AUTO-SIZE: every explicit fontSize (and its lineHeight) is
//     scaled by the ErpTypeScale context (computed from the window width in
//     app/new/_layout.tsx via getErpTypeScale) and never goes below a
//     readable floor — small phones shrink a little so rows/cards fit,
//     large phones grow a little, desktop web lifts tiny 7–9px text.
//   - Numbers use tabular figures (same width digits) so table columns and
//     KPI values line up — the standard dashboard look.
//   - iOS/Android "Larger Text" accessibility setting is capped at 1.2x
//     (maxFontSizeMultiplier) unless a Text sets its own value, so the
//     system setting can't break table/header layouts.
//
// UI only — no layout, data or logic changes. Kill switch: ERP_FONT_ENABLED.
import React, { useContext } from 'react';
import { Platform, StyleSheet } from 'react-native';

export const ERP_FONT_ENABLED = true;

/** Responsive type settings for the current window (see getErpTypeScale). */
export type ErpTypeScaleValue = { scale: number; floor: number; displayScale: number };
const NEUTRAL_SCALE: ErpTypeScaleValue = { scale: 1, floor: 0, displayScale: 1 };
export const ErpTypeScale = React.createContext<ErpTypeScaleValue>(NEUTRAL_SCALE);

// Breakpoints match src/components/EmployDashboard/rn-app/components/responsive.ts
const TABLET_BP = 768;
const DESKTOP_BP = 1180;
const MAX_A11Y_MULTIPLIER = 1.2;

/**
 * Window width -> type scale.
 *   phone  (<768)      : 0.92 … 1.05, designed at 390pt (iPhone 12–16)
 *   tablet (768–1179)  : 1.0  (screens already have their own tablet sizes)
 *   desktop web (1180+): 1.0, 1.04 on very wide monitors (1600+)
 * `floor` = smallest font size allowed after scaling.
 * `displayScale` = scale for big display text (>= 22) — kept <= 1 so KPI
 * numbers never grow into overflow, but still shrink on small phones.
 */
export function getErpTypeScale(width: number, isWeb = Platform.OS === 'web'): ErpTypeScaleValue {
  if (!width || !Number.isFinite(width)) return NEUTRAL_SCALE;
  if (isWeb && width >= DESKTOP_BP) {
    const scale = width >= 1600 ? 1.04 : 1;
    return { scale, floor: 10.5, displayScale: 1 };
  }
  if (width >= TABLET_BP) return { scale: 1, floor: 9.5, displayScale: 1 };
  const raw = 1 + ((width - 390) / 390) * 0.5;
  const scale = Math.min(1.05, Math.max(0.92, raw));
  return { scale: Math.round(scale * 1000) / 1000, floor: 9, displayScale: Math.min(1, scale) };
}

export const INTER = {
  400: 'Inter-Regular',
  500: 'Inter-Medium',
  600: 'Inter-SemiBold',
  700: 'Inter-Bold',
  800: 'Inter-ExtraBold',
  900: 'Inter-Black',
} as const;

/** Passed to expo-font useFonts(). */
export const ERP_FONT_FILES = {
  'Inter-Regular': require('../../../assets/fonts/inter/Inter-Regular.ttf'),
  'Inter-Medium': require('../../../assets/fonts/inter/Inter-Medium.ttf'),
  'Inter-SemiBold': require('../../../assets/fonts/inter/Inter-SemiBold.ttf'),
  'Inter-Bold': require('../../../assets/fonts/inter/Inter-Bold.ttf'),
  'Inter-ExtraBold': require('../../../assets/fonts/inter/Inter-ExtraBold.ttf'),
  'Inter-Black': require('../../../assets/fonts/inter/Inter-Black.ttf'),
};

/** true = apply Inter to texts below (set by app/new/_layout.tsx once fonts are loaded). */
export const ErpFontScope = React.createContext(false);
/** Face of the nearest parent <Text> (for nested texts without their own weight). */
const ErpTextFace = React.createContext<string | null>(null);

// Families that mean "the default UI font" -> replaced by Inter.
const DEFAULT_FAMILIES = new Set(['', 'system', 'dmsans', 'dm sans', 'sans-serif', 'roboto', '-apple-system', 'inter', 'inter-regular', 'inherit']);
// Old "number" fonts (Menlo / Courier / monospace / DM Mono). They were used
// only so digits line up in tables — Inter's tabular figures do that too and
// match the rest of the UI, so these become Inter as well.
const MONO_FAMILIES = new Set(['menlo', 'monospace', 'courier', 'courier new', 'dmmono', 'dm mono', 'dm mono, monospace']);

function familyKey(family: any): string {
  return String(family).replace(/["']/g, '').replace(/\s*,\s*/g, ', ').trim().toLowerCase();
}
function isReplaceableFamily(family: any): boolean {
  if (!family) return true;
  const key = familyKey(family);
  return DEFAULT_FAMILIES.has(key) || MONO_FAMILIES.has(key);
}

const weightOf = (w: any): keyof typeof INTER => {
  if (w === undefined || w === null) return 400;
  if (w === 'bold') return 700;
  if (w === 'normal') return 400;
  const n = Number(w);
  if (!Number.isFinite(n)) return 400;
  if (n >= 900) return 900;
  if (n >= 800) return 800;
  if (n >= 700) return 700;
  if (n >= 600) return 600;
  if (n >= 500) return 500;
  return 400;
};

// Professional weight ramp: '800'/'900' -> Bold on normal text,
// ExtraBold only for large display text.
const DISPLAY_SIZE = 22;
function professionalWeight(w: keyof typeof INTER, size: number | undefined): keyof typeof INTER {
  if (w < 800) return w;
  return typeof size === 'number' && size >= DISPLAY_SIZE ? 800 : 700;
}

/** fontSize/lineHeight after responsive scaling (null = leave style as is). */
function scaledMetrics(flat: any, t: ErpTypeScaleValue): { fontSize: number; lineHeight?: number } | null {
  const size = flat.fontSize;
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return null;
  const factor = size >= DISPLAY_SIZE ? t.displayScale : t.scale;
  let next = size * factor;
  if (t.floor && next < t.floor) next = t.floor;
  next = Math.round(next * 2) / 2; // half-pixel steps keep text crisp
  if (next === size) return null;
  const out: { fontSize: number; lineHeight?: number } = { fontSize: next };
  if (typeof flat.lineHeight === 'number' && flat.lineHeight > 0) {
    out.lineHeight = Math.round(flat.lineHeight * (next / size) * 2) / 2;
  }
  return out;
}

/** Returns the style with the matching Inter face, and the face used (null = untouched). */
export function withErpFont(
  style: any,
  parentFace: string | null,
  typeScale: ErpTypeScaleValue = NEUTRAL_SCALE,
): { style: any; face: string | null } {
  const flat: any = StyleSheet.flatten(style) || {};
  const family = flat.fontFamily;
  if (family && !isReplaceableFamily(family)) {
    return { style, face: null }; // icon fonts and any other explicit family
  }
  const metrics = scaledMetrics(flat, typeScale);
  const numbers = flat.fontVariant ? null : { fontVariant: ['tabular-nums'] as any };
  if (!family && (flat.fontWeight === undefined || flat.fontWeight === null) && parentFace) {
    // nested text inherits the parent's face (and, without its own size, its size)
    return { style: metrics ? [style, metrics] : style, face: parentFace };
  }
  const face = INTER[professionalWeight(weightOf(flat.fontWeight), flat.fontSize)];
  return { style: [style, { fontFamily: face, fontWeight: 'normal' }, numbers, metrics], face };
}

/** Caps the OS "Larger Text" multiplier on native unless the caller set one. */
function withA11yCap(props: any) {
  if (Platform.OS === 'web' || props?.maxFontSizeMultiplier !== undefined) return props;
  return { ...props, maxFontSizeMultiplier: MAX_A11Y_MULTIPLIER };
}

/** forwardRef components (react-native-web, and RN if Text is forwardRef): patch `.render`. */
export function patchRender(Comp: any, nests: boolean): boolean {
  if (!Comp || typeof Comp.render !== 'function') return false;
  if (Comp.__erpFont) return true;
  const original = Comp.render;
  Comp.render = function ErpFontRender(props: any, ref: any) {
    const on = useContext(ErpFontScope);
    const parentFace = useContext(ErpTextFace);
    const typeScale = useContext(ErpTypeScale);
    if (!ERP_FONT_ENABLED || !on) return original(props, ref);
    const { style, face } = withErpFont(props?.style, parentFace, typeScale);
    const element = original(withA11yCap(face ? { ...props, style } : props), ref);
    return nests && face ? <ErpTextFace.Provider value={face}>{element}</ErpTextFace.Provider> : element;
  };
  Comp.__erpFont = true;
  return true;
}

/** Plain function components (React 19 ref-as-prop): wrap them. */
export function wrapComponent(Original: any, nests: boolean) {
  if (!Original || Original.__erpFont) return Original;
  function ErpFontText(props: any) {
    const on = useContext(ErpFontScope);
    const parentFace = useContext(ErpTextFace);
    const typeScale = useContext(ErpTypeScale);
    if (!ERP_FONT_ENABLED || !on) return <Original {...props} />;
    const { style, face } = withErpFont(props?.style, parentFace, typeScale);
    const element = <Original {...withA11yCap(props)} style={face ? style : props?.style} />;
    return nests && face ? <ErpTextFace.Provider value={face}>{element}</ErpTextFace.Provider> : element;
  }
  Object.assign(ErpFontText, Original); // keep statics (TextInput.State etc.)
  (ErpFontText as any).displayName = Original.displayName || Original.name || 'Text';
  (ErpFontText as any).__erpFont = true;
  return ErpFontText;
}
