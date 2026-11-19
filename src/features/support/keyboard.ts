// FILE: src/features/support/keyboard.ts
// Keeps a screen's bottom (chat composer, note editor) ABOVE the on-screen keyboard — like WhatsApp —
// on every device:
//   iOS / Android app   keyboard events -> how much of the view the keyboard covers -> padding
//   web on phones       iOS Safari does not shrink the page for the keyboard; the visual viewport
//                       tells how much is hidden -> the same padding
//   desktop web         no on-screen keyboard -> 0
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, View } from 'react-native';

export function useKeyboardInset() {
  const ref = useRef<View>(null);
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const w: any = globalThis as any;
      const update = () => {
        const vv = w.visualViewport;
        const node: any = ref.current;
        if (!vv || !node || !node.getBoundingClientRect) { setInset(0); return; }
        const rect = node.getBoundingClientRect();
        // part of the view below the visible area (keyboard) — ignore small toolbars / rounding
        const hidden = Math.round(rect.bottom - (vv.offsetTop + vv.height));
        setInset((cur) => { const next = hidden > 40 ? hidden : 0; return Math.abs(next - cur) > 2 ? next : cur; });
      };
      const vv = w.visualViewport;
      vv?.addEventListener?.('resize', update);
      vv?.addEventListener?.('scroll', update);
      w.addEventListener?.('focusin', () => setTimeout(update, 250));
      update();
      return () => { vv?.removeEventListener?.('resize', update); vv?.removeEventListener?.('scroll', update); };
    }
    const show = (e: KeyboardEvent) => {
      const top = e.endCoordinates.screenY;
      const node: any = ref.current;
      if (!node?.measureInWindow) { setInset(e.endCoordinates.height); return; }
      node.measureInWindow((_x: number, y: number, _w: number, h: number) => {
        const overlap = Math.round(y + h - top);
        setInset(overlap > 0 ? overlap : 0);
      });
    };
    const hide = () => setInset(0);
    const s1 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', show);
    const s2 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', hide);
    const s3 = Platform.OS === 'ios' ? Keyboard.addListener('keyboardWillChangeFrame', show) : null;
    return () => { s1.remove(); s2.remove(); s3?.remove(); };
  }, []);
  return { ref, inset };
}
