import { Platform } from 'react-native';

export type LoginSource = 'app' | 'web';

/**
 * Runtime platform for the Expo application.
 * Native Android/iOS => "app"
 * Expo web => "web"
 *
 * This is deliberately based on the runtime, not the API's regsrc value.
 * The API value may be missing or stale; the browser/native runtime is the
 * authoritative source for client-side behaviour.
 */
export const getLoginSource = (): LoginSource =>
  Platform.OS === 'web' ? 'web' : 'app';

export const isWeb = (): boolean => Platform.OS === 'web';
export const isNativeApp = (): boolean => Platform.OS !== 'web';
