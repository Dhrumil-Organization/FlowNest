// FILE: src/components/RollCutScanner/GunScanner.tsx
// Scanner GUN input (USB / Bluetooth / built-in scanner of a handheld). Works on web, Android and iOS.
//
// A scanner gun is a keyboard: it "types" the QR text very fast and (normally) presses Enter at the end.
//   native : an input box that keeps the focus and does NOT open the on-screen keyboard
//   web    : the same box + a page-level key listener, so the scan is caught even when the box is not focused
//            (typing in another field — e.g. the list search — is never touched)
// One scan ends on Enter / Tab, or when the text is a complete QR and the gun went silent (guns without suffix).
// The text is handed over raw; the screen validates it with the SAME parser the camera uses (parseQr).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { normalizeQrText } from './api';

type Props = {
  /** false while the camera / another popup is open or the Scan tab is hidden */
  active: boolean;
  onScan: (text: string) => void;
};

const SILENCE_OK = 140; // ms without a key after a COMPLETE QR -> scan finished (gun has no Enter suffix)
const SILENCE_DROP = 1500; // ms without a key on an incomplete text -> give up on it
const WEB = Platform.OS === 'web';
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export default function GunScanner({ active, onScan }: Props) {
  const input = useRef<TextInput>(null);
  const buf = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [focused, setFocused] = useState(false);
  const [keyboard, setKeyboard] = useState(false); // on-screen keyboard for typing a code by hand
  const [typing, setTyping] = useState(false);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    buf.current = '';
    input.current?.clear();
    setTyping(false);
  }, []);

  /** hand the collected text to the screen */
  const finish = useCallback(() => {
    const text = buf.current.trim();
    reset();
    if (text) onScanRef.current(text);
  }, [reset]);

  /** called after every new character */
  const feed = useCallback(
    (text: string) => {
      buf.current = text;
      setTyping(!!text);
      if (timer.current) clearTimeout(timer.current);
      if (!text) return;
      const complete = !!normalizeQrText(text);
      timer.current = setTimeout(
        () => {
          // complete QR -> scan; long incomplete text -> let the screen say "Invalid QR"; short noise -> forget
          if (complete || buf.current.trim().length >= 8) finish();
          else reset();
        },
        complete ? SILENCE_OK : SILENCE_DROP,
      );
    },
    [finish, reset],
  );

  const focus = useCallback(() => {
    if (active) input.current?.focus();
  }, [active]);

  // native: take the focus when gun mode becomes active, give it back when it stops
  useEffect(() => {
    if (!active) {
      reset();
      input.current?.blur();
      return;
    }
    const t = setTimeout(() => input.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [active, reset]);

  // native: the focus was lost (alert closed, tap outside) and no other field took it -> take it back
  useEffect(() => {
    if (WEB || !active || focused) return;
    const t = setTimeout(() => {
      const other = (TextInput.State as any)?.currentlyFocusedInput?.();
      if (!other) input.current?.focus();
    }, 600);
    return () => clearTimeout(t);
  }, [active, focused]);

  // web: catch the gun anywhere on the page
  useEffect(() => {
    if (!WEB || !active || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = (el?.tagName || '').toUpperCase();
      // a text field has the focus (ours handles itself through onChangeText) -> leave the key alone
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as any)?.isContentEditable) return;
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (!buf.current) return;
        e.preventDefault();
        finish();
        return;
      }
      if (e.key.length !== 1) return; // Shift, arrows, F-keys ...
      if ((e.ctrlKey || e.metaKey) && !e.altKey) return; // browser shortcuts (AltGr = ctrl+alt stays allowed)
      e.preventDefault(); // e.g. Space must not scroll the page in the middle of a scan
      feed(buf.current + e.key);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, feed, finish]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const armed = active && (WEB || focused);

  return (
    <View>
      <TouchableOpacity activeOpacity={0.85} style={[st.state, armed ? st.stateOn : st.stateOff]} onPress={focus} accessibilityRole="button" accessibilityLabel="Activate scanner">
        <View style={[st.dot, { backgroundColor: armed ? T.green : T.amber }]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.stateTitle, { color: armed ? T.green : T.amber }]}>{typing ? 'Reading…' : armed ? 'Scanner ready' : 'Scanner paused'}</Text>
          <Text style={st.stateSub} numberOfLines={2}>
            {armed ? 'Pull the trigger on the taka QR' : 'Tap here to activate the scanner'}
          </Text>
        </View>
        <Icon name={armed ? 'sensors' : 'touch-app'} size={22} color={armed ? T.green : T.amber} />
      </TouchableOpacity>

      <View style={[st.box, focused && st.boxOn]}>
        <Icon name="barcode-reader" size={19} color={focused ? T.copper : T.muted} />
        <TextInput
          ref={input}
          style={st.input}
          placeholder={keyboard ? 'Type / paste the QR text, then Enter' : 'Scanner input'}
          placeholderTextColor={T.muted}
          onChangeText={feed}
          onSubmitEditing={finish}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          showSoftInputOnFocus={keyboard}
          submitBehavior="submit"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          importantForAutofill="no"
          contextMenuHidden={!keyboard}
          keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
          returnKeyType="done"
          accessibilityLabel="Scanner input"
        />
        {!WEB ? (
          <TouchableOpacity
            onPress={() => {
              // re-open the field with / without the on-screen keyboard
              input.current?.blur();
              setKeyboard((k) => !k);
              setTimeout(() => input.current?.focus(), 200);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={keyboard ? 'Hide keyboard' : 'Type by hand'}
          >
            <Icon name={keyboard ? 'keyboard-hide' : 'keyboard'} size={20} color={keyboard ? T.copper : T.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  state: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  stateOn: { backgroundColor: `${T.green}10`, borderColor: `${T.green}55` },
  stateOff: { backgroundColor: `${T.amber}12`, borderColor: `${T.amber}66` },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stateTitle: { fontSize: 13.5, fontWeight: '900' },
  stateSub: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 1 },
  box: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, paddingHorizontal: 12, marginBottom: 14 },
  boxOn: { borderColor: `${T.copper}88`, backgroundColor: `${T.copper}0D` },
  input: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: '700', color: T.ink, fontFamily: MONO, paddingVertical: 0, ...(WEB ? ({ outlineStyle: 'none' } as any) : null) },
});
