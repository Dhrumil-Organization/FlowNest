// FILE: src/core/theme/index.ts — public surface of the theme engine.
export { DARK, darkColor, darkStyle } from './themeColors';
export { loadThemeMode, primeThemeMode, setThemeMode, toggleTheme, useTheme } from './themeMode';
export type { ThemeMode, ThemeScheme } from './themeMode';
export { getThemeMode, getThemeScheme, isDarkScheme, THEME_MODES } from './themeState';
export { installThemeRuntime, isThemeRuntimeInstalled } from './themeRuntime';
export { ThemeRoot } from './ThemeRoot';
export { ThemeModePicker, ThemeToggleButton } from './ThemeControls';
