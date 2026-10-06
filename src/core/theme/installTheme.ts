// FILE: src/core/theme/installTheme.ts
// Side-effect module: put the dark-theme render hook in place and restore the
// saved theme as early as possible. Imported first by app/_layout.tsx.
import { installThemeRuntime } from './themeRuntime';
import { primeThemeMode } from './themeMode';

installThemeRuntime();
primeThemeMode();
