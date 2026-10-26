// ─────────────────────────────────────────────────────────────
// FILE: src/core/theme/themeState.ts
//
// The current theme, held outside React so the render hook (themeRuntime.ts)
// can read it without a context. No React Native imports here.
//
//   mode   : what the user picked            'light' | 'dark' | 'system'
//   scheme : what is actually drawn          'light' | 'dark'
//
// Default mode is 'light' — the app looks exactly as before until the user
// picks Dark or System in Settings.
// ─────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeScheme = 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];
export const DEFAULT_THEME_MODE: ThemeMode = 'light';
export const THEME_STORAGE_KEY = 'erp_theme_mode';

let mode: ThemeMode = DEFAULT_THEME_MODE;
let systemScheme: ThemeScheme = 'light';
let scheme: ThemeScheme = 'light';

const listeners = new Set<() => void>();

const resolve = (): ThemeScheme => (mode === 'system' ? systemScheme : mode);

function apply() {
  const next = resolve();
  const changed = next !== scheme;
  scheme = next;
  // listeners are told about mode changes too (the picker shows the mode)
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.log('[theme] listener failed', error);
    }
  });
  return changed;
}

export const getThemeMode = (): ThemeMode => mode;
export const getThemeScheme = (): ThemeScheme => scheme;
/** Read on every element by the render hook — keep it trivial. */
export const isDarkScheme = (): boolean => scheme === 'dark';

export const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

export function setThemeModeState(next: ThemeMode) {
  if (next === mode) return;
  mode = next;
  apply();
}

export function setSystemScheme(next: ThemeScheme) {
  if (next === systemScheme) return;
  systemScheme = next;
  if (mode === 'system') apply();
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
