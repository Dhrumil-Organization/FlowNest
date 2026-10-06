// ─────────────────────────────────────────────────────────────
// FILE: src/core/theme/themeMode.ts
//
// Loading, saving and following the theme the user picked.
//
//   Storage  : AsyncStorage 'erp_theme_mode' = 'light' | 'dark' | 'system'
//              (per device; survives sign-out, so the login screens keep it).
//              On the web the same value is mirrored in localStorage so the
//              page can paint in the right theme before React starts.
//   System   : when the mode is 'system' the app follows the phone / browser
//              setting and switches live when that setting changes.
//   Web page : <html> gets data-erp-theme + color-scheme, and the page
//              background follows the theme (scrollbars, native date inputs).
// ─────────────────────────────────────────────────────────────
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useEffect, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { DARK } from './themeColors';
import {
  DEFAULT_THEME_MODE,
  getThemeMode,
  getThemeScheme,
  isThemeMode,
  setSystemScheme,
  setThemeModeState,
  subscribeTheme,
  THEME_STORAGE_KEY,
  ThemeMode,
  ThemeScheme,
} from './themeState';

const LIGHT_PAGE = '#F5F2EE';

function webStorage(): any {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') return window.localStorage || null;
  } catch {
    // storage blocked (private mode / iframe policy)
  }
  return null;
}

/** Keeps the web page itself (outside React) in the same theme. */
function paintWebPage() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  try {
    const dark = getThemeScheme() === 'dark';
    const root = document.documentElement;
    root.setAttribute('data-erp-theme', dark ? 'dark' : 'light');
    root.style.colorScheme = dark ? 'dark' : 'light';
    const page = dark ? DARK.bg : LIGHT_PAGE;
    root.style.backgroundColor = page;
    if (document.body) document.body.style.backgroundColor = page;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? DARK.nav : '#0D1B2A');
  } catch {
    // cosmetic only
  }
}

let primed = false;
let loaded = false;
let loading: Promise<ThemeMode> | null = null;

/**
 * Synchronous start-up step: follow the system setting and, on the web,
 * restore the saved mode before the first paint. Safe to call repeatedly.
 */
export function primeThemeMode() {
  if (primed) return;
  primed = true;
  try {
    setSystemScheme(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
    Appearance.addChangeListener(({ colorScheme }: { colorScheme?: string | null }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
  } catch (error) {
    console.log('[theme] system theme not available', error);
  }
  subscribeTheme(paintWebPage);
  const store = webStorage();
  if (store) {
    try {
      const saved = store.getItem(THEME_STORAGE_KEY);
      if (isThemeMode(saved)) {
        setThemeModeState(saved);
        loaded = true;
      }
    } catch {
      // ignore
    }
  }
  paintWebPage();
}

/** Restores the saved mode (native: from AsyncStorage). Resolves with the mode in use. */
export function loadThemeMode(): Promise<ThemeMode> {
  primeThemeMode();
  if (loaded) return Promise.resolve(getThemeMode());
  if (!loading) {
    loading = (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isThemeMode(saved)) setThemeModeState(saved);
      } catch (error) {
        console.log('[theme] could not read the saved theme', error);
      }
      loaded = true;
      return getThemeMode();
    })();
  }
  return loading;
}

/** Changes the theme now and remembers it on this device. */
export async function setThemeMode(mode: ThemeMode): Promise<void> {
  primeThemeMode();
  loaded = true;
  setThemeModeState(mode);
  const store = webStorage();
  if (store) {
    try {
      store.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (error) {
    console.log('[theme] could not save the theme', error);
  }
}

/** Light <-> Dark (from 'system' it goes to the opposite of what is shown). */
export function toggleTheme(): Promise<void> {
  return setThemeMode(getThemeScheme() === 'dark' ? 'light' : 'dark');
}

/** Current theme for components that show it (picker, toggle button). */
export function useTheme(): { mode: ThemeMode; scheme: ThemeScheme; isDark: boolean } {
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const scheme = getThemeScheme();
  return { mode: getThemeMode(), scheme, isDark: scheme === 'dark' };
}

export { DEFAULT_THEME_MODE };
export type { ThemeMode, ThemeScheme };
