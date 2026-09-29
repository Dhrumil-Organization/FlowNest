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
//   - Text that already sets its own family is left alone: icon fonts
//     (MaterialIcons etc.), monospace / Menlo / DM Mono number styles.
//   - Nested <Text> without its own weight keeps the parent's face.
//   - Outside the scope (legacy screens) nothing changes.
//
// UI only — no layout, data or logic changes. Kill switch: ERP_FONT_ENABLED.
import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';

export const ERP_FONT_ENABLED = true;

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
const DEFAULT_FAMILIES = new Set(['', 'system', 'dmsans', 'dm sans', 'sans-serif', 'roboto', '-apple-system', 'inter', 'inter-regular']);

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

/** Returns the style with the matching Inter face, and the face used (null = untouched). */
export function withErpFont(style: any, parentFace: string | null): { style: any; face: string | null } {
  const flat: any = StyleSheet.flatten(style) || {};
  const family = flat.fontFamily;
  if (family && !DEFAULT_FAMILIES.has(String(family).trim().toLowerCase())) {
    return { style, face: null }; // icons, monospace, any explicit family
  }
  if (!family && (flat.fontWeight === undefined || flat.fontWeight === null) && parentFace) {
    return { style, face: parentFace }; // nested text inherits the parent's face
  }
  const face = INTER[weightOf(flat.fontWeight)];
  return { style: [style, { fontFamily: face, fontWeight: 'normal' }], face };
}

/** forwardRef components (react-native-web, and RN if Text is forwardRef): patch `.render`. */
export function patchRender(Comp: any, nests: boolean): boolean {
  if (!Comp || typeof Comp.render !== 'function') return false;
  if (Comp.__erpFont) return true;
  const original = Comp.render;
  Comp.render = function ErpFontRender(props: any, ref: any) {
    const on = useContext(ErpFontScope);
    const parentFace = useContext(ErpTextFace);
    if (!ERP_FONT_ENABLED || !on) return original(props, ref);
    const { style, face } = withErpFont(props?.style, parentFace);
    const element = original(face ? { ...props, style } : props, ref);
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
    if (!ERP_FONT_ENABLED || !on) return <Original {...props} />;
    const { style, face } = withErpFont(props?.style, parentFace);
    const element = <Original {...props} style={face ? style : props?.style} />;
    return nests && face ? <ErpTextFace.Provider value={face}>{element}</ErpTextFace.Provider> : element;
  }
  Object.assign(ErpFontText, Original); // keep statics (TextInput.State etc.)
  (ErpFontText as any).displayName = Original.displayName || Original.name || 'Text';
  (ErpFontText as any).__erpFont = true;
  return ErpFontText;
}
