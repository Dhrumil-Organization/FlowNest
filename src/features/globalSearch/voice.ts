// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/voice.ts
// Voice search — speak, the words are written into the search box.
//
//   Android / iOS : expo-speech-recognition (Google / Apple speech service)
//                   + live mic volume for the animation
//   Web           : the browser speech API (Chrome, Edge, Safari)
//                   + live mic volume from the Web Audio analyser
//
// English (India) and Hindi. The user's own screen names are given to the
// recognizer as hints, so "Yarn Stock", "Doff Entry", "Taka" are heard right.
// If the native module is not in the installed build yet, voice simply shows
// as unavailable — nothing crashes.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';

export type VoiceLang = 'en-IN' | 'hi-IN';

export type VoiceState = {
  available: boolean;
  listening: boolean;
  /** words heard so far (live) */
  partial: string;
  error: string | null;
  /** 0 … 1, smoothed mic level (drives the animation; native driver friendly) */
  level: Animated.Value;
  start: (lang: VoiceLang, hints?: string[]) => void;
  stop: () => void;
  cancel: () => void;
};

type Handlers = { onFinal: (text: string) => void };

// ── native module (loaded lazily so an old build without it never crashes) ──
let nativeModule: any | undefined;
function getNative(): any | null {
  if (Platform.OS === 'web') return null;
  if (nativeModule !== undefined) return nativeModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-speech-recognition');
    nativeModule = mod?.ExpoSpeechRecognitionModule || null;
  } catch {
    nativeModule = null;
  }
  return nativeModule;
}

function getWebRecognition(): any | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isVoiceAvailable(): boolean {
  if (Platform.OS === 'web') return !!getWebRecognition();
  const m = getNative();
  if (!m) return false;
  try {
    return typeof m.isRecognitionAvailable === 'function' ? !!m.isRecognitionAvailable() : true;
  } catch {
    return false;
  }
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone permission is off. Allow the microphone for this app and try again.',
  'service-not-allowed': 'Speech recognition is turned off on this device (Settings → Siri & Dictation / Google voice typing).',
  'language-not-supported': 'This language is not installed for voice typing on this device.',
  'no-speech': "Didn't hear anything — tap the mic and speak.",
  'speech-timeout': "Didn't hear anything — tap the mic and speak.",
  network: 'Voice needs internet on this device. Check the connection.',
  'audio-capture': 'No microphone found.',
  busy: 'The microphone is busy in another app.',
};
const errorText = (code?: string, message?: string) =>
  (code && ERRORS[code]) || message || 'Voice search stopped. Please try again.';

export function useVoiceSearch({ onFinal }: Handlers): VoiceState {
  const [available] = useState(isVoiceAvailable);
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const level = useRef(new Animated.Value(0)).current;

  const finalRef = useRef('');
  const cancelledRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastLevel = useRef(0);

  const pushLevel = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      // ignore tiny changes → fewer bridge calls, smoother on low-end phones
      if (Math.abs(clamped - lastLevel.current) < 0.03) return;
      lastLevel.current = clamped;
      Animated.timing(level, { toValue: clamped, duration: 110, useNativeDriver: true }).start();
    },
    [level],
  );

  const finish = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setListening(false);
    pushLevel(0);
    const text = finalRef.current.trim();
    if (!cancelledRef.current && text) onFinalRef.current(text);
  }, [pushLevel]);

  const startNative = useCallback(
    async (lang: VoiceLang, hints: string[]) => {
      const M = getNative();
      if (!M) return setError('Voice search needs the latest app build.');
      try {
        const perm = await M.requestPermissionsAsync();
        if (!perm?.granted) return setError(ERRORS['not-allowed']);
      } catch {
        return setError(ERRORS['not-allowed']);
      }
      const subs: Array<{ remove: () => void }> = [];
      subs.push(
        M.addListener('result', (e: any) => {
          const text = String(e?.results?.[0]?.transcript || '');
          setPartial(text);
          if (e?.isFinal) finalRef.current = text;
          else if (text) finalRef.current = text; // keep the latest words if the service ends without a final
        }),
      );
      subs.push(
        M.addListener('volumechange', (e: any) => {
          // -2 … 10  →  0 … 1
          pushLevel((Number(e?.value) + 2) / 12);
        }),
      );
      subs.push(
        M.addListener('error', (e: any) => {
          if (e?.error !== 'aborted' && !cancelledRef.current) setError(errorText(e?.error, e?.message));
        }),
      );
      subs.push(M.addListener('end', () => finish()));
      cleanupRef.current = () => subs.forEach((s) => s.remove());
      try {
        M.start({
          lang,
          interimResults: true,
          continuous: false,
          maxAlternatives: 3,
          contextualStrings: hints.slice(0, 100),
          iosTaskHint: 'search',
          androidIntentOptions: { EXTRA_LANGUAGE_MODEL: 'web_search' },
          volumeChangeEventOptions: { enabled: true, intervalMillis: 90 },
        });
        setListening(true);
      } catch (err: any) {
        cleanupRef.current?.();
        cleanupRef.current = null;
        setError(errorText(undefined, err?.message));
      }
    },
    [finish, pushLevel],
  );

  const startWeb = useCallback(
    async (lang: VoiceLang) => {
      const SR = getWebRecognition();
      if (!SR) return setError('Voice search is not supported in this browser. Use Chrome, Edge or Safari.');
      const rec = new SR();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 3;

      // live mic level for the animation — started AFTER recognition, never
      // blocks it (voice works without it; the bars then move gently by themselves)
      let stopMeter = () => {};
      let meterOff = false;
      const startMeter = async () => {
        try {
          if (!navigator.mediaDevices?.getUserMedia) return;
          const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (meterOff) {
            stream.getTracks().forEach((tr) => tr.stop());
            return;
          }
          const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
          const ctx: AudioContext = new Ctx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(analyser);
          const buf = new Uint8Array(analyser.fftSize);
          let raf = 0;
          let last = 0;
          const tick = (t: number) => {
            raf = requestAnimationFrame(tick);
            if (t - last < 70) return;
            last = t;
            analyser.getByteTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i += 1) {
              const v = (buf[i] - 128) / 128;
              sum += v * v;
            }
            pushLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4.5));
          };
          raf = requestAnimationFrame(tick);
          stopMeter = () => {
            cancelAnimationFrame(raf);
            stream.getTracks().forEach((tr) => tr.stop());
            ctx.close().catch(() => undefined);
          };
        } catch {
          /* no meter */
        }
      };

      rec.onresult = (e: any) => {
        let text = '';
        let isFinal = false;
        for (let i = 0; i < e.results.length; i += 1) {
          text += e.results[i][0].transcript;
          if (e.results[i].isFinal) isFinal = true;
        }
        setPartial(text);
        finalRef.current = text;
        if (isFinal) {
          try {
            rec.stop();
          } catch {
            /* already stopped */
          }
        }
      };
      rec.onerror = (e: any) => {
        if (e?.error !== 'aborted' && !cancelledRef.current) setError(errorText(e?.error, e?.message));
      };
      rec.onend = () => finish();
      cleanupRef.current = () => {
        meterOff = true;
        stopMeter();
        rec.onresult = rec.onerror = rec.onend = null;
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      };
      try {
        rec.start();
        setListening(true);
        void startMeter();
      } catch (err: any) {
        cleanupRef.current?.();
        cleanupRef.current = null;
        setError(errorText(undefined, err?.message));
      }
    },
    [finish, pushLevel],
  );

  const start = useCallback(
    (lang: VoiceLang, hints: string[] = []) => {
      if (listening) return;
      finalRef.current = '';
      cancelledRef.current = false;
      setPartial('');
      setError(null);
      if (Platform.OS === 'web') void startWeb(lang);
      else void startNative(lang, hints);
    },
    [listening, startNative, startWeb],
  );

  const stop = useCallback(() => {
    // stop listening and use what was heard
    if (Platform.OS === 'web') {
      finish(); // releases the mic and searches what was heard so far
      return;
    }
    try {
      getNative()?.stop();
    } catch {
      finish();
    }
  }, [finish]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (Platform.OS !== 'web') {
      try {
        getNative()?.abort();
      } catch {
        /* ignore */
      }
    }
    cleanupRef.current?.();
    cleanupRef.current = null;
    setListening(false);
    setPartial('');
    pushLevel(0);
  }, [pushLevel]);

  // closing the search always releases the mic
  useEffect(() => () => {
    cancelledRef.current = true;
    cleanupRef.current?.();
    try {
      getNative()?.abort();
    } catch {
      /* ignore */
    }
  }, []);

  return { available, listening, partial, error, level, start, stop, cancel };
}
