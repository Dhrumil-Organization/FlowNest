// FILE: src/core/fonts/erpFontPatch.native.ts
// Installs the Inter hook on React Native's Text / TextInput (iOS + Android).
// See erpFont.tsx for what it does. Safe: every step is guarded; if a hook
// can't be installed the app simply keeps the system font.
import { Text, TextInput } from 'react-native';
import { patchRender, wrapComponent } from './erpFont';

let installed = false;

function replaceDefault(load: () => any, nests: boolean) {
  try {
    const mod = load();
    if (mod && mod.default && !mod.default.__erpFont) mod.default = wrapComponent(mod.default, nests);
  } catch (e) {
    console.log('[ERP font] could not hook component', e);
  }
}

export function installErpFont() {
  if (installed) return;
  installed = true;
  // forwardRef Text -> patch render; plain function Text -> replace the
  // module's default export (react-native's index reads it lazily).
  if (!patchRender(Text as any, true)) {
    replaceDefault(() => require('react-native/Libraries/Text/Text'), true);
  }
  if (!patchRender(TextInput as any, false)) {
    replaceDefault(() => require('react-native/Libraries/Components/TextInput/TextInput'), false);
  }
}
