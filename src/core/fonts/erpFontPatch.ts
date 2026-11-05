// FILE: src/core/fonts/erpFontPatch.ts  (web — react-native-web)
// react-native-web's Text / TextInput are forwardRef components -> patch render.
// Native uses erpFontPatch.native.ts. See erpFont.tsx.
import { Text, TextInput } from 'react-native';
import { patchRender } from './erpFont';

let installed = false;

export function installErpFont() {
  if (installed) return;
  installed = true;
  if (!patchRender(Text as any, true)) console.log('[ERP font] Text hook not installed (web)');
  if (!patchRender(TextInput as any, false)) console.log('[ERP font] TextInput hook not installed (web)');
}
