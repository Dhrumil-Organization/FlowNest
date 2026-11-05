// Embedded FlowNest authentication bridge.
// This file is web-only at runtime. Native app/browser login flows do not use it.

import { Platform } from 'react-native';

export const FLOWNEST_EMBED_READY = 'FLOWNEST_READY';
export const FLOWNEST_EMBED_AUTH = 'FLOWNEST_AUTH';

// Set this in the Expo web build environment:
// EXPO_PUBLIC_EMBED_PARENT_ORIGIN=https://your-react-app.example.com
export const EMBED_PARENT_ORIGIN =
  process.env.EXPO_PUBLIC_EMBED_PARENT_ORIGIN?.replace(/\/$/, '') || '';

export type EmbeddedAuthPayload = {
  type: typeof FLOWNEST_EMBED_AUTH;
  username: string;
  password: string;
  property: 'sudamo_knits' | 'rayons';
};

export function isEmbeddedWeb(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  return window.self !== window.top;
}

export function getEmbeddedParentOrigin(): string {
  if (EMBED_PARENT_ORIGIN) {
    return EMBED_PARENT_ORIGIN;
  }

  // Development fallback only. Production should set
  // EXPO_PUBLIC_EMBED_PARENT_ORIGIN explicitly.
  try {
    return document.referrer ? new URL(document.referrer).origin : '';
  } catch {
    return '';
  }
}

export function notifyParentReady(): void {
  if (!isEmbeddedWeb()) return;

  // READY contains no credentials, so wildcard is acceptable here. The
  // credentials message is sent by the parent only to the exact FlowNest origin.
  window.parent.postMessage({ type: FLOWNEST_EMBED_READY }, '*');
}

export function isTrustedEmbeddedParent(event: MessageEvent): boolean {
  if (!isEmbeddedWeb()) return false;
  if (event.source !== window.parent) return false;

  const configured = EMBED_PARENT_ORIGIN;
  if (configured) {
    return event.origin === configured;
  }

  const referrerOrigin = getEmbeddedParentOrigin();
  return !!referrerOrigin && event.origin === referrerOrigin;
}
