import React from 'react';
import { Platform, StyleSheet, Text as NativeText } from 'react-native';

export const CONVERSION_MONO = 'SudamoConversionMono';
const SANS = [
  [400, 'DMSans-Regular'], [500, 'DMSans-Medium'], [600, 'DMSans-SemiBold'],
  [700, 'DMSans-Bold'], [800, 'DMSans-ExtraBold'],
] as const;
const MONO = [[400, 'DMMono-Regular'], [500, 'DMMono-Medium']] as const;

// Shared typography for Conversion and Weaving Production reports.
export function ConversionText({ style, ...props }: React.ComponentProps<typeof NativeText>) {
  const flat = StyleSheet.flatten(style) || {};
  const mono = flat.fontFamily === CONVERSION_MONO;
  const weight = flat.fontWeight === 'bold' ? 700 : Number(flat.fontWeight) || 400;
  const family = flat.fontFamily && !mono ? flat.fontFamily : Platform.OS === 'web'
    ? mono ? "'DM Mono', monospace" : "'DM Sans', sans-serif"
    : mono ? weight >= 500 ? 'DMMono-Medium' : 'DMMono-Regular'
      : SANS.find(([w]) => w >= weight)?.[1] || 'DMSans-ExtraBold';
  // Native static font files carry their weight in the face. Requesting another
  // native weight can make Android select a system fallback instead of that face.
  return <NativeText {...props} style={[style, { fontFamily: family },
    Platform.OS !== 'web' && (!flat.fontFamily || mono) ? { fontWeight: 'normal' } : null]} />;
}

export function ensureConversionWebFonts() {
  if (Platform.OS !== 'web') return;
  const doc = (globalThis as any).document;
  if (!doc || doc.getElementById('sudamo-conversion-fonts')) return;
  const style = doc.createElement('style');
  style.id = 'sudamo-conversion-fonts';
  style.textContent = [["DM Sans", SANS], ["DM Mono", MONO]].flatMap(([family, faces]: any) =>
    faces.map(([weight, file]: any) => `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url('/fonts/weaving-conversion/${file}.ttf') format('truetype');}`)
  ).join('\n');
  doc.head.appendChild(style);
}
