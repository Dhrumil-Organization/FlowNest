// FILE: src/features/support/livePulse.ts
// Near-instant updates when the WebSocket is NOT connected (server without support-ws, a proxy
// that blocks it, a bad network): every 1–3 s (IT admin → Settings → Live updates) the app asks
// chat.pulse — one tiny call with [room, last message id, change no.] + the tickets revision.
// Only what changed is then fetched (chat.sync / changes). While the WebSocket is live this
// does nothing. When the app is in the background / the browser tab hidden it slows to 15 s.
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useChat } from './chatStore';

type PulseResult = { rev: number; settings: string; notices?: number };

const hidden = () => {
  if (Platform.OS === 'web') { const d: any = (globalThis as any).document; return !!d && d.visibilityState === 'hidden'; }
  return AppState.currentState != null && AppState.currentState !== 'active';
};

export function useLivePulse(enabled: boolean, seconds: number, onResult: (r: PulseResult) => void) {
  const cb = useRef(onResult);
  cb.current = onResult;
  useEffect(() => {
    if (!enabled) return undefined;
    let stop = false;
    let t: any = null;
    const every = Math.max(1, Math.min(60, seconds || 2)) * 1000;
    const tick = async () => {
      if (stop) return;
      const r = hidden() ? null : await useChat.getState().pulse();
      if (r && !stop) { try { cb.current(r); } catch { /* ignore */ } }
      if (!stop) t = setTimeout(tick, hidden() ? 15000 : every);
    };
    // coming back to the app / tab -> check at once
    const wake = () => { if (!hidden()) { clearTimeout(t); void tick(); } };
    const sub = AppState.addEventListener('change', wake);
    const d: any = Platform.OS === 'web' ? (globalThis as any).document : null;
    d?.addEventListener?.('visibilitychange', wake);
    t = setTimeout(tick, 300);
    return () => { stop = true; clearTimeout(t); sub.remove(); d?.removeEventListener?.('visibilitychange', wake); };
  }, [enabled, seconds]);
}
