// ─────────────────────────────────────────────────────────────
// FILE: src/core/theme/themeRuntime.ts
//
// How the DARK theme reaches every screen without editing the screens.
//
// React builds every element through three functions: jsx / jsxs
// (react/jsx-runtime), jsxDEV (react/jsx-dev-runtime, development builds) and
// React.createElement. installThemeRuntime() wraps those three. While the
// dark theme is on, the wrapper looks at the props of the element being
// created and converts the colours it finds (rules: themeColors.ts):
//
//   style, contentContainerStyle, …Style   every colour key of the style
//   placeholderTextColor, color            text colour
//   underlayColor                          background
//   colors (gradients)                     background, each stop
//   fill / stroke (charts)                 dark shapes / lines become light
//   themeVariant="light", tint="light"     -> "dark" (date picker, blur)
//
// While the light theme is on the wrapper does nothing at all — it calls the
// original function with the same arguments — so the app behaves exactly as
// it did before this file existed.
//
// Nothing here knows about any screen, and no data, navigation or business
// logic is touched: only colour values on their way to the screen.
//
// Safety: every step is guarded. If the functions cannot be wrapped, or a
// conversion throws, the element is created untouched (light colours).
// Kill switch: THEME_RUNTIME_ENABLED.
// ─────────────────────────────────────────────────────────────
import * as React from 'react';
import { ColorRole, darkColor, darkStyle } from './themeColors';
import { isDarkScheme } from './themeState';

export const THEME_RUNTIME_ENABLED = true;

let installed = false;
let working = false;

/** true when the dark theme can be drawn (the hook is in place). */
export const isThemeRuntimeInstalled = () => working;

/** Colour props that are not inside a style. */
const COLOR_PROPS: Record<string, ColorRole> = {
  placeholderTextColor: 'text',
  color: 'text',
  underlayColor: 'bg',
  fill: 'fill',
  stroke: 'stroke',
};

const isStyleKey = (key: string) =>
  key === 'style' || (key.length > 5 && key.charCodeAt(key.length - 5) === 83 /* S */ && key.endsWith('Style'));

/** Returns `props` itself when nothing changes, otherwise a converted copy. */
export function darkProps(props: any): any {
  if (!props || typeof props !== 'object') return props;
  let out: any = null;
  // eslint-disable-next-line guard-for-in
  for (const key in props) {
    const value = props[key];
    if (value === null || value === undefined) continue;
    let next = value;

    if (typeof value === 'object') {
      if (isStyleKey(key)) {
        next = darkStyle(value);
      } else if (key === 'colors' && Array.isArray(value)) {
        let changed: any[] | null = null;
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (typeof item !== 'string') continue;
          const converted = darkColor(item, 'bg');
          if (converted !== item) {
            if (!changed) changed = value.slice();
            changed[i] = converted;
          }
        }
        if (changed) next = changed;
      }
    } else if (typeof value === 'string') {
      const role = COLOR_PROPS[key];
      if (role) next = darkColor(value, role);
      else if (value === 'light' && (key === 'themeVariant' || key === 'tint')) next = 'dark';
    }

    if (next !== value) {
      if (!out) out = { ...props };
      out[key] = next;
    }
  }
  return out || props;
}

function safeDarkProps(props: any): any {
  try {
    return darkProps(props);
  } catch {
    return props;
  }
}

function wrapJsx(original: any) {
  if (typeof original !== 'function' || original.__erpTheme) return original;
  const wrapped = function erpThemeJsx(this: any, type: any, props: any) {
    if (isDarkScheme() && props) {
      const next = safeDarkProps(props);
      if (next !== props) {
        const args = Array.prototype.slice.call(arguments);
        args[1] = next;
        return original.apply(this, args);
      }
    }
    // eslint-disable-next-line prefer-rest-params
    return original.apply(this, arguments as any);
  };
  (wrapped as any).__erpTheme = true;
  return wrapped;
}

function patch(target: any, name: string): boolean {
  try {
    if (!target || typeof target[name] !== 'function') return false;
    if (target[name].__erpTheme) return true;
    target[name] = wrapJsx(target[name]);
    return !!target[name].__erpTheme;
  } catch (error) {
    console.log(`[theme] could not hook ${name}`, error);
    return false;
  }
}

/**
 * Wraps React's element builders once. Call it before the first render
 * (app/_layout.tsx imports installTheme.ts as its first import).
 */
export function installThemeRuntime(): boolean {
  if (installed) return working;
  installed = true;
  if (!THEME_RUNTIME_ENABLED) return false;

  let ok = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require('react/jsx-runtime');
    const a = patch(runtime, 'jsx');
    const b = patch(runtime, 'jsxs');
    ok = a && b;
  } catch (error) {
    console.log('[theme] jsx-runtime not available', error);
  }
  try {
    // development builds create elements through jsxDEV
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const devRuntime = require('react/jsx-dev-runtime');
    if (devRuntime && typeof devRuntime.jsxDEV === 'function') {
      const d = patch(devRuntime, 'jsxDEV');
      // eslint-disable-next-line no-undef
      if (typeof __DEV__ !== 'undefined' && __DEV__) ok = d;
    }
  } catch {
    // production bundles may not ship the dev runtime
  }
  // code that still calls React.createElement (older libraries, a few screens)
  patch(React as any, 'createElement');
  const def = (React as any).default;
  if (def && def !== React) patch(def, 'createElement');

  working = ok;
  if (!ok) console.log('[theme] dark theme hook not installed — the app stays on the light theme');
  return working;
}
