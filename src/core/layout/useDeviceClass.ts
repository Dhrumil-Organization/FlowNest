// ─────────────────────────────────────────────────────────────
// FILE: src/core/layout/useDeviceClass.ts
//
// ONE place that decides "what kind of screen is this?" so the menu, and any
// other responsive piece, make the same decision on every device.
//
//   phone    -> bottom tab bar + "More" sheet        (one-hand, big targets)
//   tablet   -> slim icon rail with fly-out folders  (saves width for work)
//   desktop  -> full sidebar with expandable folders (mouse + keyboard)
//
// Native  : decided by the SHORTEST side, so turning a phone sideways never
//           turns it into a "tablet" (a 900 x 400 phone is still a phone).
// Web     : decided by the window width, so resizing the browser, split
//           screen on an iPad and a desktop window all just work.
// ─────────────────────────────────────────────────────────────
import { Platform, useWindowDimensions } from 'react-native';

export type DeviceClass = 'phone' | 'tablet' | 'desktop';
export type NavMode = 'bottom' | 'rail' | 'sidebar';

export const BREAKPOINTS = { tablet: 600, desktop: 1024 } as const;

export function classifyDevice(width: number, height: number, isWeb: boolean): DeviceClass {
  const shortest = Math.min(width, height);
  if (!isWeb && shortest < BREAKPOINTS.tablet) return 'phone';
  if (isWeb && width < BREAKPOINTS.tablet) return 'phone';
  return width >= BREAKPOINTS.desktop ? 'desktop' : 'tablet';
}

export function navModeFor(device: DeviceClass): NavMode {
  return device === 'phone' ? 'bottom' : device === 'tablet' ? 'rail' : 'sidebar';
}

function hasCoarsePointer(isWeb: boolean): boolean {
  if (!isWeb) return true; // native = finger
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false;
  } catch {
    return false;
  }
}

export function useDeviceClass() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const device = classifyDevice(width, height, isWeb);
  const coarse = hasCoarsePointer(isWeb);
  return {
    device,
    navMode: navModeFor(device),
    width,
    height,
    isWeb,
    isPortrait: height >= width,
    isPhone: device === 'phone',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    /** finger (or touch laptop): menu rows get a >= 48 px hit area */
    coarse,
    rowHeight: coarse ? 48 : 40,
  } as const;
}
