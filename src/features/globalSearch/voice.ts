// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/voice.ts
// Voice search — speak, the words are written into the search box.
//
//   Android / iOS : expo-speech-recognition (Google / Apple speech service)
//   Web           : the browser speech API (Chrome, Edge, Safari)
//
// WHY THIS FILE WAS REWRITTEN (7 Nov 2026)
// ----------------------------------------
// Bug: speak → close the search → open it again → tap 🎤: the mic light was
// on but nothing was recognised.  Causes:
//   1. Every open builds a NEW search window (key = openId), so a new hook
//      started the recogniser while the old one was still shutting down.
//      Android answered "busy", or the OLD session's late "end" event reached
//      the NEW listeners → the screen stopped listening while the phone's mic
//      stayed on.
//   2. On web a second getUserMedia() stream (only for the waveform) was
//      opened next to the speech API. On Android Chrome that steals the mic
//      from the recogniser → it hears silence.
//   3. continuous:false ends at the first short pause (often BEFORE the user
//      starts talking) and the user was told to speak before the mic was
//      really ready.
//
// Now:
//   • ONE recogniser for the whole app (module level). Every start gets a
//     session number; events of an old session are ignored.
//   • A new start first WAITS until the previous session has fully ended.
//   • "Get ready…" until the mic is really open, then "Listening… speak now".
//   • Forgiving: a pause before you speak does not end it (silently restarts
//     up to ~9 s); after you spoke, 1.4 s of silence finishes it; ■ uses
//     what was heard (never throws it away).
//   • Web never opens a 2nd mic stream on phones (fake, voice-driven bars).
//   • App goes to background / search closes → mic released at once.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Linking, Platform } from 'react-native';

export type VoiceLang = 'en-IN' | 'hi-IN';
/** idle → starting (opening the mic) → listening → finishing (working out the words) */
export type VoicePhase = 'idle' | 'starting' | 'listening' | 'finishing';

export type VoiceState = {
  available: boolean;
  /** true while the voice screen should be shown (starting, listening, finishing) */
  listening: boolean;
  phase: VoicePhase;
  /** something was heard in this session (voice is coming in) */
  hearing: boolean;
  /** words heard so far (live) */
  partial: string;
  error: string | null;
  /** the error can be fixed in the phone / browser settings */
  errorFixInSettings: boolean;
  /** 0 … 1, smoothed mic level (drives the animation; native driver friendly) */
  level: Animated.Value;
  start: (lang: VoiceLang, hints?: string[]) => void;
  /** forget the last error / words (search closed, user typed, "Type instead") */
  reset: () => void;
  clearError: () => void;
  /** stop listening and USE what was heard */
  stop: () => void;
  /** stop listening and throw away what was heard */
  cancel: () => void;
  openSettings: () => void;
};

/** text = best transcript, alternatives = other ways it may have been heard */
type Handlers = { onFinal: (text: string, alternatives: string[]) => void };

// ── tunables ──
const SILENCE_AFTER_SPEECH_MS = 1400; // pause after talking → done
const MAX_WAIT_FOR_SPEECH_MS = 9000; // nothing said at all → "didn't hear"
const MAX_SESSION_MS = 20000; // hard stop
const SETTLE_MAX_MS = 900; // wait for the previous session to end
const STOP_GRACE_MS = 1600; // ■ pressed: wait this long for the final words

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

const isMobileWeb = () =>
  Platform.OS === 'web' && typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

export function isVoiceAvailable(): boolean {
  if (Platform.OS === 'web') return !!getWebRecognition();
  const m = getNative();
  if (!m) return false;
  // isRecognitionAvailable() can be false for a moment on some phones (service
  // still binding) — the button still shows; start() explains if it really fails.
  return true;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function micBlockedText(): string {
  if (Platform.OS === 'web') {
    let inFrame = false;
    try {
      inFrame = typeof window !== 'undefined' && window.top !== window.self;
    } catch {
      inFrame = true;
    }
    try {
      const { protocol, hostname } = window.location;
      if (protocol === 'http:' && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname)) {
        return 'Browsers allow the microphone only on https:// (or localhost). Open FlowNest with https:// to use voice search.';
      }
    } catch {
      /* ignore */
    }
    if (inFrame) return 'The microphone is blocked because FlowNest is open inside another page. Open FlowNest directly in the browser, or allow the microphone on that page.';
    return 'The microphone is blocked for this site. Click the 🔒 lock icon left of the address bar → Microphone → Allow, then tap the mic again.';
  }
  if (Platform.OS === 'ios') return 'Microphone or Speech Recognition is off for FlowNest. Tap “Open Settings”, turn both on, then tap the mic again.';
  return 'Microphone is off for FlowNest. Tap “Open Settings” → Permissions → Microphone → Allow, then tap the mic again.';
}

const ERRORS: Record<string, string> = {
  'service-not-allowed':
    Platform.OS === 'ios'
      ? 'Speech recognition is turned off on this iPhone (Settings → Siri & Dictation → Dictation).'
      : 'Voice typing is turned off on this phone. Install / enable the Google app (Settings → Apps → Google) and try again.',
  'language-not-supported': 'This language is not installed for voice typing on this device. Switch to English, or add the language in the phone’s voice-typing settings.',
  'no-speech': "Didn't hear anything — tap the mic, wait for “Listening”, then speak.",
  'speech-timeout': "Didn't hear anything — tap the mic, wait for “Listening”, then speak.",
  nomatch: "Couldn't make out the words — please say it again, a little slower.",
  network: 'Voice needs internet on this device. Check the connection and try again.',
  'audio-capture': 'No microphone found (or another app is using it).',
  busy: 'The microphone is busy in another app (a call, a recorder…). Close it and try again.',
  client: 'The phone’s voice service did not answer. Please tap the mic again.',
};
const SOFT = new Set(['no-speech', 'speech-timeout', 'nomatch']); // quietly retried while waiting
const RETRYABLE = new Set(['busy', 'client', 'recognizer-busy']); // the previous session was still closing
const errorText = (code?: string, message?: string) =>
  code === 'not-allowed' ? micBlockedText() : (code && ERRORS[code]) || message || 'Voice search stopped. Please try again.';

// ─────────────────────────────────────────────────────────────
// The ONE recogniser of the app
// ─────────────────────────────────────────────────────────────
type SessionSink = {
  id: number;
  onReady: () => void;
  onSound: () => void;
  onResult: (text: string, alts: string[], isFinal: boolean) => void;
  onLevel: (v: number) => void;
  onError: (code: string, message?: string) => void;
  onEnd: () => void;
};

let sessionSeq = 0;
let sink: SessionSink | null = null;
/** resolved when the recogniser is fully idle again */
let idle: Promise<void> = Promise.resolve();
let markIdle: (() => void) | null = null;

function beginBusy() {
  idle = new Promise<void>((resolve) => {
    markIdle = resolve;
  });
}
function endBusy() {
  markIdle?.();
  markIdle = null;
}

/** wait for the previous session to end (never longer than SETTLE_MAX_MS) */
async function settle(): Promise<void> {
  await Promise.race([idle, sleep(SETTLE_MAX_MS)]);
  const M = getNative();
  if (M?.getStateAsync) {
    // Android / iOS: also ask the service itself
    const until = Date.now() + SETTLE_MAX_MS;
    while (Date.now() < until) {
      try {
        const st = await M.getStateAsync();
        if (!st || st === 'inactive') break;
        if (st === 'recognizing' || st === 'starting') M.abort();
      } catch {
        break;
      }
      await sleep(70);
    }
  }
}

// ── native: listeners registered ONCE, routed to the current session only ──
let nativeWired = false;
function wireNative(M: any) {
  if (nativeWired) return;
  nativeWired = true;
  const to = (fn: (s: SessionSink, e: any) => void) => (e: any) => {
    if (sink) fn(sink, e);
  };
  M.addListener('start', to((s) => s.onReady()));
  M.addListener('audiostart', to((s) => s.onReady()));
  M.addListener('speechstart', to((s) => s.onSound()));
  M.addListener(
    'result',
    to((s, e) => {
      const list: string[] = (e?.results || []).map((r: any) => String(r?.transcript || '')).filter(Boolean);
      s.onResult(list[0] || '', list.slice(1), !!e?.isFinal);
    }),
  );
  M.addListener('volumechange', to((s, e) => s.onLevel((Number(e?.value) + 2) / 12)));
  M.addListener('nomatch', to((s) => s.onError('nomatch')));
  M.addListener('error', to((s, e) => s.onError(String(e?.error || ''), e?.message)));
  M.addListener('end', (e: any) => {
    endBusy();
    if (sink) sink.onEnd();
    return e;
  });
}

function nativeOptions(lang: VoiceLang, hints: string[]) {
  const androidCanContinue = Platform.OS === 'android' && Number(Platform.Version) >= 33;
  return {
    lang,
    interimResults: true,
    // Android 12 and older: not supported → we restart quietly instead
    continuous: Platform.OS === 'ios' || androidCanContinue,
    maxAlternatives: 4,
    contextualStrings: hints.slice(0, 100),
    addsPunctuation: false,
    iosTaskHint: 'search',
    iosCategory: { category: 'playAndRecord', categoryOptions: ['defaultToSpeaker', 'allowBluetooth'], mode: 'measurement' },
    androidIntentOptions: {
      // free_form understands sentences / Hinglish better than web_search
      EXTRA_LANGUAGE_MODEL: 'free_form',
      EXTRA_MASK_OFFENSIVE_WORDS: false,
    },
    volumeChangeEventOptions: { enabled: true, intervalMillis: 90 },
  };
}

// ── web: one SpeechRecognition object at a time ──
let webRec: any = null;

export function useVoiceSearch({ onFinal }: Handlers): VoiceState {
  const [available] = useState(isVoiceAvailable);
  const [phase, setPhaseState] = useState<VoicePhase>('idle');
  const [hearing, setHearing] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorFixInSettings, setFixInSettings] = useState(false);
  const level = useRef(new Animated.Value(0)).current;

  const phaseRef = useRef<VoicePhase>('idle');
  const setPhase = (p: VoicePhase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const mySession = useRef(0);
  const textRef = useRef('');
  const altRef = useRef<string[]>([]);
  const heardRef = useRef(false);
  const startedAt = useRef(0);
  const argsRef = useRef<{ lang: VoiceLang; hints: string[] }>({ lang: 'en-IN', hints: [] });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const fakeMeter = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopMeterRef = useRef<() => void>(() => undefined);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const mounted = useRef(true);
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

  const clearTimer = (k: string) => {
    if (timers.current[k]) clearTimeout(timers.current[k]);
    timers.current[k] = undefined;
  };
  const clearTimers = () => Object.keys(timers.current).forEach(clearTimer);
  const setTimer = (k: string, ms: number, fn: () => void) => {
    clearTimer(k);
    timers.current[k] = setTimeout(fn, ms);
  };

  const stopFakeMeter = () => {
    if (fakeMeter.current) clearInterval(fakeMeter.current);
    fakeMeter.current = null;
  };
  /** bars that move with the voice when there is no real meter (mobile web) */
  const startFakeMeter = () => {
    stopFakeMeter();
    let lastText = '';
    let energy = 0.15;
    fakeMeter.current = setInterval(() => {
      if (textRef.current !== lastText) {
        lastText = textRef.current;
        energy = 0.85;
      }
      energy = Math.max(heardRef.current ? 0.12 : 0.08, energy * 0.86);
      pushLevel(energy * (0.75 + Math.random() * 0.5));
    }, 110);
  };

  /** release everything of this hook's session (mic, timers, meter) */
  const release = useCallback((id: number) => {
    clearTimers();
    stopFakeMeter();
    stopMeterRef.current();
    stopMeterRef.current = () => undefined;
    if (sink && sink.id === id) sink = null;
    pushLevel(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushLevel]);

  /** hard stop of the recogniser (no result) */
  const abortEngine = () => {
    if (Platform.OS === 'web') {
      const rec = webRec;
      if (rec) {
        try {
          rec.abort();
        } catch {
          /* already stopped */
        }
      }
      return;
    }
    try {
      getNative()?.abort();
    } catch {
      /* ignore */
    }
  };

  /** session over → hand the words to the search (unless cancelled) */
  const finish = useCallback(
    (useWords: boolean) => {
      const id = mySession.current;
      mySession.current = 0;
      release(id);
      if (!mounted.current) return;
      setPhase('idle');
      setHearing(false);
      const text = textRef.current.trim();
      if (useWords && id && text) {
        onFinalRef.current(
          text,
          altRef.current.map((a) => a.trim()).filter((a) => a && a !== text),
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [release],
  );

  const fail = useCallback(
    (code: string, message?: string) => {
      abortEngine();
      finish(false);
      if (!mounted.current) return;
      setError(errorText(code, message));
      setFixInSettings(code === 'not-allowed' && Platform.OS !== 'web');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finish],
  );

  // ── one recognition run (a session may have several runs: quiet restarts) ──
  const runRef = useRef<(id: number, retry?: number) => Promise<void>>(async () => undefined);

  const makeSink = (id: number): SessionSink => ({
    id,
    onReady: () => {
      if (mySession.current !== id || phaseRef.current !== 'starting') return;
      setPhase('listening');
      if (Platform.OS !== 'web') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('expo-haptics').selectionAsync?.().catch?.(() => undefined);
        } catch {
          /* no haptics */
        }
      }
    },
    onSound: () => {
      if (mySession.current !== id) return;
      if (phaseRef.current === 'starting') setPhase('listening');
    },
    onResult: (text, alts, isFinal) => {
      if (mySession.current !== id) return;
      if (phaseRef.current === 'starting') setPhase('listening');
      if (!text.trim()) return;
      textRef.current = text;
      altRef.current = alts;
      if (!heardRef.current) {
        heardRef.current = true;
        setHearing(true);
        clearTimer('noSpeech');
      }
      setPartial(text);
      // done when the service says so, or after a short pause in speaking
      if (isFinal && Platform.OS !== 'web' && !nativeOptions(argsRef.current.lang, []).continuous) return; // 'end' follows
      setTimer('silence', isFinal ? 600 : SILENCE_AFTER_SPEECH_MS, () => {
        if (mySession.current === id) stopRef.current();
      });
    },
    onLevel: (v) => {
      if (mySession.current !== id) return;
      if (fakeMeter.current) stopFakeMeter(); // the real meter takes over
      pushLevel(v);
    },
    onError: (code, message) => {
      if (mySession.current !== id || code === 'aborted') return;
      if (SOFT.has(code)) return; // decided in onEnd (restart or "didn't hear")
      if (RETRYABLE.has(code) && !heardRef.current && Date.now() - startedAt.current < 4000) {
        // previous session was still closing → try once more shortly
        setTimer('retry', 450, () => {
          if (mySession.current === id) void runRef.current(id, 1);
        });
        return;
      }
      fail(code, message);
    },
    onEnd: () => {
      if (mySession.current !== id) return;
      if (timers.current.retry) return; // a retry is already planned
      if (phaseRef.current === 'finishing' || heardRef.current) {
        finish(true);
        return;
      }
      // ended before the user said anything (short pause / Android 12-) →
      // quietly listen again while there is time left
      if (Date.now() - startedAt.current < MAX_WAIT_FOR_SPEECH_MS - 600) {
        setTimer('retry', 120, () => {
          if (mySession.current === id) void runRef.current(id);
        });
        return;
      }
      fail('no-speech');
    },
  });

  runRef.current = async (id: number) => {
    timers.current.retry = undefined;
    await settle();
    if (mySession.current !== id || !mounted.current) return;
    const { lang, hints } = argsRef.current;

    if (Platform.OS === 'web') {
      const SR = getWebRecognition();
      if (!SR) return fail('', 'Voice search is not supported in this browser. Use Chrome, Edge or Safari.');
      const rec = new SR();
      const continuous = !isMobileWeb(); // mobile Chrome repeats words in continuous mode
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = continuous;
      rec.maxAlternatives = 4;
      const s = makeSink(id);
      sink = s;
      webRec = rec;
      beginBusy();
      rec.onstart = () => s.onReady();
      rec.onaudiostart = () => {
        s.onReady();
        // desktop: a real mic meter for the waveform (separate stream). Never
        // on phones — there the 2nd stream takes the mic away from the speech API.
        if (!isMobileWeb()) void startDesktopMeter(id);
      };
      rec.onspeechstart = () => s.onSound();
      rec.onresult = (e: any) => {
        if (webRec !== rec) return;
        let text = '';
        let isFinal = false;
        for (let i = 0; i < e.results.length; i += 1) {
          text += `${e.results[i][0].transcript} `;
          isFinal = !!e.results[i].isFinal;
        }
        const alts: string[] = [];
        const last = e.results[e.results.length - 1];
        if (e.results.length === 1 && last) {
          for (let j = 1; j < (last.length || 0); j += 1) if (last[j]?.transcript) alts.push(String(last[j].transcript));
        }
        s.onResult(text.replace(/\s+/g, ' ').trim(), alts, isFinal);
      };
      rec.onerror = (e: any) => {
        if (webRec === rec) s.onError(String(e?.error || ''), e?.message);
      };
      rec.onend = () => {
        if (webRec === rec) webRec = null;
        endBusy();
        if (sink === s) s.onEnd();
      };
      try {
        rec.start();
      } catch (err: any) {
        webRec = null;
        endBusy();
        s.onError('client', err?.message);
      }
      return;
    }

    // ── Android / iOS ──
    const M = getNative();
    if (!M) return fail('', 'Voice search needs the latest app build.');
    wireNative(M);
    try {
      const avail = typeof M.isRecognitionAvailable === 'function' ? M.isRecognitionAvailable() : true;
      if (!avail) return fail('service-not-allowed');
    } catch {
      /* try anyway */
    }
    sink = makeSink(id);
    beginBusy();
    try {
      M.start(nativeOptions(lang, hints));
    } catch (err: any) {
      endBusy();
      sink?.onError('client', err?.message);
    }
  };

  /** desktop web only: live mic level from the Web Audio analyser */
  const startDesktopMeter = async (id: number) => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return startFakeMeter();
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (mySession.current !== id) {
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }
      stopFakeMeter();
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
      stopMeterRef.current = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((tr) => tr.stop());
        ctx.close().catch(() => undefined);
      };
    } catch {
      /* no meter — the fake one keeps the bars moving */
    }
  };

  const stopRef = useRef<() => void>(() => undefined);

  const start = useCallback(
    (lang: VoiceLang, hints: string[] = []) => {
      if (phaseRef.current !== 'idle') return;
      const id = ++sessionSeq;
      // a previous session of ANY search window is closed first
      if (sink && sink.id !== id) abortEngine();
      sink = null;
      mySession.current = id;
      argsRef.current = { lang, hints };
      textRef.current = '';
      altRef.current = [];
      heardRef.current = false;
      startedAt.current = Date.now();
      setPartial('');
      setHearing(false);
      setError(null);
      setFixInSettings(false);
      setPhase('starting');
      startFakeMeter();

      setTimer('noSpeech', MAX_WAIT_FOR_SPEECH_MS, () => {
        if (mySession.current === id && !heardRef.current) fail('no-speech');
      });
      setTimer('max', MAX_SESSION_MS, () => {
        if (mySession.current === id) stopRef.current();
      });

      void (async () => {
        // permission first (native) — so "Listening" only shows when it can work
        if (Platform.OS !== 'web') {
          const M = getNative();
          if (!M) return fail('', 'Voice search needs the latest app build.');
          try {
            let perm = await M.getPermissionsAsync?.();
            if (!perm?.granted) perm = await M.requestPermissionsAsync();
            if (mySession.current !== id) return;
            if (!perm?.granted) return fail('not-allowed');
          } catch {
            return fail('not-allowed');
          }
          // permission dialog took a while → restart the "nothing said" clock
          startedAt.current = Date.now();
          setTimer('noSpeech', MAX_WAIT_FOR_SPEECH_MS, () => {
            if (mySession.current === id && !heardRef.current) fail('no-speech');
          });
        } else {
          try {
            // some browsers never answer this query → do not wait for it long
            const st: any = await Promise.race([
              (navigator as any).permissions?.query?.({ name: 'microphone' }),
              sleep(500).then(() => null),
            ]);
            if (mySession.current !== id) return;
            if (st?.state === 'denied') return fail('not-allowed');
          } catch {
            /* Safari / Firefox: no permissions API → just try */
          }
        }
        if (mySession.current === id) await runRef.current(id);
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fail],
  );

  /** ■ — stop listening and USE what was heard (waits briefly for the last words) */
  const stop = useCallback(() => {
    const id = mySession.current;
    if (!id || phaseRef.current === 'finishing') return;
    clearTimer('silence');
    clearTimer('noSpeech');
    clearTimer('retry');
    if (!heardRef.current) {
      // nothing heard yet → just close
      abortEngine();
      finish(false);
      return;
    }
    setPhase('finishing');
    try {
      if (Platform.OS === 'web') webRec?.stop();
      else getNative()?.stop();
    } catch {
      /* ignore */
    }
    // the service may never send 'end' → finish with what we have
    setTimer('grace', STOP_GRACE_MS, () => {
      if (mySession.current === id) {
        abortEngine();
        finish(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish]);
  stopRef.current = stop;

  /** close without using the words (Esc, "Type instead", search closed) */
  const cancel = useCallback(() => {
    if (mySession.current) abortEngine();
    finish(false);
    if (!mounted.current) return;
    setPartial('');
    setError(null);
    setFixInSettings(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish]);

  const clearError = useCallback(() => {
    setError(null);
    setFixInSettings(false);
  }, []);
  const reset = useCallback(() => {
    if (mySession.current || phaseRef.current !== 'idle') cancel();
    setError(null);
    setFixInSettings(false);
    setPartial('');
  }, [cancel]);

  const openSettings = useCallback(() => {
    Linking.openSettings?.().catch(() => undefined);
  }, []);

  // app in background (call, home button) → release the mic
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active' && mySession.current) cancel();
    });
    return () => sub.remove();
  }, [cancel]);

  // window closed / rebuilt → always release the mic
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const id = mySession.current;
      if (id) {
        abortEngine();
        mySession.current = 0;
      }
      release(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    available,
    listening: phase !== 'idle',
    phase,
    hearing,
    partial,
    error,
    errorFixInSettings,
    level,
    start,
    stop,
    cancel,
    reset,
    clearError,
    openSettings,
  };
}
