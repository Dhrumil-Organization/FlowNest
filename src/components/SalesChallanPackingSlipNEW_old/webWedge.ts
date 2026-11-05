// FILE: src/components/SalesChallanPackingSlipNEW/webWedge.ts
// Keyboard-wedge scanners in a BROWSER (web build on a Urovo / any handheld in Chrome).
//
// Why not the TextInput of WarehouseNEW: on web a controlled RN TextInput + onKeyPress('Enter') reads a stale
// state value when the scanner types fast (all keys arrive in a few ms), and Enter is handled twice — the first
// read gets the text, the second gets '' ("No scan text received"). Some Urovo output modes also commit the
// text through their input method (keydown key = 'Unidentified', keyCode 229), which only shows up as an
// `input` event on a focused editable.
//
// So on web we listen on the whole page (capture phase) and keep one hidden DOM <input inputmode="none"> focused.
// The input is rendered by the scanner component itself (inside the RN Modal) — an input appended to <body>
// loses focus to the Modal's focus trap, and then IME text has nowhere to go and a stray Enter hits a button.
//   • printable keydown keys → buffer (a gap > 300 ms starts a new burst)
//   • text committed by an input method → read from the hidden input's value
//   • Enter / Tab → submit; no suffix → submit 150 ms after the last character (only if > 5 chars)
//   • inputmode="none" keeps the soft keyboard down
// Native (Android app) keeps the WarehouseNEW behaviour (Urovo engine + TextInput) — see ScanDevices.tsx.
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export type WedgeDiag = { chars: number; ended: 'enter' | 'tab' | 'pause' | 'none'; via: 'keys' | 'ime' | ''; at: number };

export const isWeb = Platform.OS === 'web' && typeof document !== 'undefined';

/** Props for the hidden DOM input the caller renders: React.createElement('input', wedgeInputProps(ref)). */
export const wedgeInputProps = (ref: { current: HTMLInputElement | null }) => ({
  ref,
  inputMode: 'none',
  autoComplete: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  'aria-label': 'Hardware scanner input',
  'data-scps-wedge': '1',
  style: { position: 'absolute', left: 0, top: 0, width: 1, height: 1, opacity: 0, border: 0, padding: 0 },
});

export function useWebWedge(
  active: boolean,
  inputRef: { current: HTMLInputElement | null },
  onCode: (code: string) => void,
  onDiag?: (d: WedgeDiag) => void,
) {
  const codeRef = useRef(onCode);
  codeRef.current = onCode;
  const diagRef = useRef(onDiag);
  diagRef.current = onDiag;

  useEffect(() => {
    if (!isWeb || !active) return undefined;

    let buf = '';
    let last = 0;
    let timer: any = null;

    const input = inputRef.current;
    if (!input) return undefined;

    const flush = (ended: WedgeDiag['ended']) => {
      clearTimeout(timer);
      const fromKeys = buf;
      const raw = fromKeys || input.value;
      buf = '';
      input.value = '';
      const code = raw.replace(/[\r\n\t]/g, '').trim();
      diagRef.current?.({ chars: code.length, ended, via: fromKeys ? 'keys' : raw ? 'ime' : '', at: Date.now() });
      if (code) codeRef.current(code);
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { if ((buf || input.value).trim().length > 5) flush('pause'); }, 150);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // Someone is typing in a real field (search, "Type a label") — leave it alone.
      if (t && t !== input && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Enter' || e.key === 'Tab') {
        // Never let a scanner suffix "click" a focused button (e.g. Done) or move focus.
        e.preventDefault();
        e.stopPropagation();
        if (buf || input.value) flush(e.key === 'Enter' ? 'enter' : 'tab');
        else diagRef.current?.({ chars: 0, ended: e.key === 'Enter' ? 'enter' : 'tab', via: '', at: Date.now() });
        return;
      }
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const now = Date.now();
        if (now - last > 300) buf = '';
        last = now;
        buf += e.key;
        if (t === input) e.preventDefault(); // we own the text; the input only catches IME commits
        schedule();
      }
    };
    const onInput = () => { if (!buf) schedule(); };

    const focusIt = () => {
      const a = document.activeElement as HTMLElement | null;
      if (a && a !== input && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
      try { input.focus({ preventScroll: true }); } catch { input.focus(); }
    };

    window.addEventListener('keydown', onKeyDown, true);
    input.addEventListener('input', onInput);
    focusIt();
    const iv = setInterval(focusIt, 500);

    return () => {
      clearInterval(iv);
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown, true);
      input.removeEventListener('input', onInput);
    };
  }, [active]);
}
