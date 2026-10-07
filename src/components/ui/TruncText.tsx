// FILE: src/components/ui/TruncText.tsx
// Drop-in replacement for <Text numberOfLines={n}> that lets the user read a
// value that got cut off with "…".
//
//   Web  → hover the text: a tooltip shows the full value.
//          (On touch-only browsers a tap does the same.)
//   App  → tap the text: a small popover shows the full value (selectable,
//          so it can be copied). Tap anywhere to close.
//
// Nothing happens unless the text is ACTUALLY truncated, so values that fit
// look and behave exactly as before. Layout/styling is untouched: the visible
// element is still the same <Text> with the same style and numberOfLines.
//
// Props (on top of the normal Text props):
//   tapReveal={false}  use when the text sits inside a button / tappable row,
//                      so the tap keeps going to that button. Hover on web
//                      still works. If you pass your own onPress it is always
//                      kept as-is.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  useWindowDimensions,
  View,
} from 'react-native';

export type TruncTextProps = TextProps & {
  tapReveal?: boolean;
  children?: React.ReactNode;
};

/** Flatten any Text children ("ITEM · ", code, nested <Text>) to a plain string. */
function toPlain(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toPlain).join('');
  if (React.isValidElement(node)) return toPlain((node.props as any)?.children);
  return '';
}

// ───────────────────────────── Web ─────────────────────────────

const TIP_ID = 'trunc-text-tooltip';
const SHOW_DELAY_MS = 250;
let tipOwner: any = null;

function getTip(): HTMLDivElement {
  let tip = document.getElementById(TIP_ID) as HTMLDivElement | null;
  if (!tip) {
    tip = document.createElement('div');
    tip.id = TIP_ID;
    tip.setAttribute('role', 'tooltip');
    Object.assign(tip.style, {
      position: 'fixed',
      zIndex: '2147483000',
      maxWidth: '360px',
      padding: '8px 10px',
      borderRadius: '8px',
      background: '#0D1B2A',
      color: '#FFFFFF',
      border: '1px solid rgba(255,255,255,0.14)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
      fontSize: '12.5px',
      lineHeight: '1.45',
      fontWeight: '600',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
      pointerEvents: 'none',
      display: 'none',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(tip);
  }
  return tip;
}

function hideTip(owner?: any) {
  if (owner && tipOwner !== owner) return;
  tipOwner = null;
  const tip = document.getElementById(TIP_ID);
  if (tip) tip.style.display = 'none';
}

function isCutOff(el: HTMLElement) {
  return el.scrollWidth - el.clientWidth > 1 || el.scrollHeight - el.clientHeight > 1;
}

function showTip(el: HTMLElement) {
  const text = (el.textContent || '').trim();
  if (!text || !isCutOff(el)) return;
  const tip = getTip();
  tip.textContent = text;
  tip.style.fontFamily = window.getComputedStyle(el).fontFamily;
  tip.style.maxWidth = `${Math.min(360, window.innerWidth - 16)}px`;
  tip.style.display = 'block';
  tip.style.left = '0px';
  tip.style.top = '0px';

  const r = el.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  const GAP = 6;
  const left = Math.max(8, Math.min(r.left, window.innerWidth - t.width - 8));
  let top = r.bottom + GAP;
  if (top + t.height > window.innerHeight - 8 && r.top - GAP - t.height >= 8) {
    top = r.top - GAP - t.height; // not enough room below → show above
  }
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
  tipOwner = el;
}

function WebTruncText({ tapReveal = true, children, ...rest }: TruncTextProps) {
  const ref = useRef<any>(null);

  useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el || typeof el.addEventListener !== 'function') return;

    let timer: any = null;
    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const hide = () => { clear(); hideTip(el); };
    const enter = () => { clear(); timer = setTimeout(() => showTip(el), SHOW_DELAY_MS); };

    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', hide);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);

    // Touch-only browsers have no hover: a tap shows it, the next tap hides it.
    const touchOnly =
      tapReveal && !rest.onPress &&
      typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;
    const tap = () => { if (tipOwner === el) hide(); else showTip(el); };
    const outside = (e: Event) => { if (tipOwner === el && e.target !== el && !el.contains(e.target as Node)) hide(); };
    if (touchOnly) {
      el.addEventListener('click', tap);
      document.addEventListener('pointerdown', outside, true);
    }

    return () => {
      hide();
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', hide);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
      if (touchOnly) {
        el.removeEventListener('click', tap);
        document.removeEventListener('pointerdown', outside, true);
      }
    };
  }, [tapReveal, rest.onPress]);

  return <Text ref={ref} {...rest}>{children}</Text>;
}

// ──────────────────────────── Native ────────────────────────────

type Anchor = { x: number; y: number; w: number; h: number };

function NativeTruncText({ tapReveal = true, children, style, numberOfLines, onLayout, onPress, ...rest }: TruncTextProps) {
  const ref = useRef<any>(null);
  const win = useWindowDimensions();
  const full = toPlain(children);
  const lines = numberOfLines || 0;
  const canReveal = tapReveal && !onPress && lines > 0 && full.length > 0;

  const [width, setWidth] = useState(0);
  // key of the (text, width, lines) combination that has been measured, and its result
  const [measured, setMeasured] = useState<{ key: string; cut: boolean } | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const key = `${lines}|${Math.round(width)}|${full}`;
  const needsMeasure = canReveal && width > 0 && measured?.key !== key;
  const isCut = canReveal && measured?.key === key && measured.cut;

  const handleLayout = useCallback((e: any) => {
    const w = e?.nativeEvent?.layout?.width || 0;
    setWidth(prev => (Math.abs(prev - w) > 0.5 ? w : prev));
    onLayout?.(e);
  }, [onLayout]);

  const open = useCallback(() => {
    ref.current?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
      setAnchor({ x: x || 0, y: y || 0, w: w || 0, h: h || 0 });
    });
  }, []);
  const close = useCallback(() => setAnchor(null), []);

  const maxW = Math.min(340, win.width - 24);
  const below = anchor ? anchor.y + anchor.h + 6 : 0;
  const placeAbove = !!anchor && below > win.height - 140 && anchor.y > 160;

  return (
    <>
      <Text
        ref={ref}
        {...rest}
        style={style}
        numberOfLines={numberOfLines}
        onLayout={handleLayout}
        onPress={isCut ? open : onPress}
        suppressHighlighting={isCut ? true : rest.suppressHighlighting}
      >
        {children}
      </Text>

      {needsMeasure ? (
        // Invisible, same style + same width, no line limit → real line count.
        // Removed again as soon as it has reported.
        <Text
          style={[style, n.probe, { width }]}
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onTextLayout={e => setMeasured({ key, cut: e.nativeEvent.lines.length > lines })}
        >
          {children}
        </Text>
      ) : null}

      {anchor ? (
        <Modal transparent visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close">
            <View
              style={[
                n.bubble,
                { maxWidth: maxW, left: Math.max(12, Math.min(anchor.x, win.width - 12 - maxW)) },
                placeAbove ? { bottom: win.height - anchor.y + 6 } : { top: below },
              ]}
            >
              <Text style={n.bubbleText} selectable>{full}</Text>
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

const n = StyleSheet.create({
  probe: {
    position: 'absolute', left: 0, top: 0, opacity: 0,
    flex: 0, flexGrow: 0, flexShrink: 0, flexBasis: 'auto',
    margin: 0, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: '#0D1B2A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  bubbleText: { color: '#FFFFFF', fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
});

// ──────────────────────────── Export ────────────────────────────

export function TruncText(props: TruncTextProps) {
  // No line limit, or the font auto-shrinks to fit → nothing can be cut off.
  if (!props.numberOfLines || props.adjustsFontSizeToFit) {
    const { tapReveal, ...rest } = props;
    return <Text {...rest} />;
  }
  return Platform.OS === 'web' ? <WebTruncText {...props} /> : <NativeTruncText {...props} />;
}

export default TruncText;
