// FILE: src/components/StoreItemMasterNew/Notice.tsx
// Modern success / error notifications for Store Item Master (web · tablet · phone).
//
// Usage (anywhere):   notifyError(apiMessage)   notifySuccess(apiMessage, { title: 'Saved' })
// Mount ONCE:         <NoticeHost />   (inside the screen's root View — see StoreItemMasterScreen.tsx)
//
// Behaviour
//   desktop ≥ 900   top-right stacked cards (420 px), slide-in from the right
//   tablet  ≥ 560   top-centre cards (480 px), slide-down
//   phone   < 560   full-width top cards below the status bar, slide-down, swipe up / sideways to dismiss
//   • message text is exactly what the API returned (message / Message / errors[...])
//   • auto-dismiss with a live countdown bar: success 4 s, error 8 s; hover (web) or long-press pauses it
//   • long messages clamp to 3 lines with "Show more"; error cards have a Copy button on web
//   • same message twice → one card is refreshed (no spam); max 3 cards visible
//   • THEME RULE: colours only from the light tokens T / S (the app's dark theme converts them).
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useContainerWidth } from './ui';

export type NoticeKind = 'success' | 'error' | 'info';
export type NoticeOptions = { title?: string; duration?: number; action?: { label: string; onPress: () => void } };
type NoticeItem = { id: number; kind: NoticeKind; title: string; message: string; duration: number; action?: NoticeOptions['action']; bump: number };

/* ------------------------------------------------------------------ */
/* Tiny store (no provider needed)                                     */
/* ------------------------------------------------------------------ */
const MAX_VISIBLE = 3;
let items: NoticeItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => items;

const DEFAULT_TITLE: Record<NoticeKind, string> = { success: 'Done', error: 'Something went wrong', info: 'Note' };
const DEFAULT_MS: Record<NoticeKind, number> = { success: 4000, error: 8000, info: 5000 };

export function notify(kind: NoticeKind, message: string, opts: NoticeOptions = {}) {
  const text = (message || '').trim();
  if (!text) return;
  const dup = items.find((x) => x.kind === kind && x.message === text);
  if (dup) {
    // same message again → refresh the existing card (restarts its timer + small pop)
    items = items.map((x) => (x.id === dup.id ? { ...x, bump: x.bump + 1 } : x));
  } else {
    const item: NoticeItem = { id: nextId++, kind, title: opts.title || DEFAULT_TITLE[kind], message: text, duration: opts.duration ?? DEFAULT_MS[kind], action: opts.action, bump: 0 };
    items = [...items, item].slice(-MAX_VISIBLE);
  }
  emit();
}
export const notifyError = (message: string, opts?: NoticeOptions) => notify('error', message, opts);
export const notifySuccess = (message: string, opts?: NoticeOptions) => notify('success', message, opts);
export const notifyInfo = (message: string, opts?: NoticeOptions) => notify('info', message, opts);
export const dismissNotice = (id: number) => {
  items = items.filter((x) => x.id !== id);
  emit();
};
export const clearNotices = () => {
  items = [];
  emit();
};

/* ------------------------------------------------------------------ */
/* Host                                                                */
/* ------------------------------------------------------------------ */
const topInset = () => (Platform.OS === 'web' ? 12 : Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 8);

export function NoticeHost() {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot);
  const { bp, onLayout } = useContainerWidth();
  const phone = bp === 'phone';
  // leaving the screen must not leave a stale card behind
  useEffect(() => clearNotices, []);

  return (
    <View
      pointerEvents="box-none"
      onLayout={onLayout}
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 9999, elevation: 9999, paddingTop: phone ? topInset() : 16, paddingHorizontal: phone ? 12 : 16, gap: 10 },
        bp === 'desktop' ? { alignItems: 'flex-end' } : { alignItems: 'center' },
      ]}
    >
      {list.map((n) => (
        <NoticeCard key={n.id} n={n} bp={bp} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */
function NoticeCard({ n, bp }: { n: NoticeItem; bp: 'phone' | 'tablet' | 'desktop' }) {
  const native = Platform.OS !== 'web';
  const c = n.kind === 'success' ? T.green : n.kind === 'error' ? T.red : T.blue;
  const icon = n.kind === 'success' ? 'check' : n.kind === 'error' ? 'priority-high' : 'info-outline';
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const long = n.message.length > 110;

  const enter = useRef(new Animated.Value(0)).current; // 0 → 1 slide + fade in
  const pop = useRef(new Animated.Value(0.6)).current; // icon spring
  const drag = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const progress = useRef(new Animated.Value(1)).current; // 1 → 0 countdown
  const remaining = useRef(n.duration);
  const startedAt = useRef(0);
  const paused = useRef(false);
  const closing = useRef(false);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    progress.stopAnimation();
    Animated.parallel([
      Animated.timing(enter, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: native }),
    ]).start(() => dismissNotice(n.id));
  }, [enter, n.id, native, progress]);

  const run = useCallback(
    (ms: number) => {
      startedAt.current = Date.now();
      remaining.current = ms;
      Animated.timing(progress, { toValue: 0, duration: ms, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
        if (finished) close();
      });
    },
    [close, progress],
  );
  const pause = useCallback(() => {
    if (paused.current || closing.current) return;
    paused.current = true;
    progress.stopAnimation();
    remaining.current = Math.max(800, remaining.current - (Date.now() - startedAt.current));
  }, [progress]);
  const resume = useCallback(() => {
    if (!paused.current || closing.current) return;
    paused.current = false;
    run(remaining.current);
  }, [run]);

  // enter animation + countdown (restarts when the same message is re-sent → n.bump)
  useEffect(() => {
    closing.current = false;
    paused.current = false;
    progress.setValue(1);
    Animated.spring(enter, { toValue: 1, useNativeDriver: native, speed: 16, bounciness: 6 }).start();
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, useNativeDriver: native, speed: 14, bounciness: 14 }).start();
    run(n.duration);
    return () => progress.stopAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n.bump]);

  // swipe: up / sideways dismisses (phone + tablet + touch laptops)
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || g.dy < -8,
      onPanResponderGrant: () => pause(),
      onPanResponderMove: (_, g) => drag.setValue({ x: g.dx, y: Math.min(0, g.dy) }),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 90 || g.dy < -40) {
          Animated.timing(drag, { toValue: { x: g.dx > 0 ? 500 : g.dx < 0 && Math.abs(g.dx) > 90 ? -500 : 0, y: g.dy < -40 ? -200 : 0 }, duration: 160, useNativeDriver: false }).start(() => dismissNotice(n.id));
        } else {
          Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          resume();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        resume();
      },
    }),
  ).current;

  const copy = async () => {
    try {
      // @ts-ignore web only
      await navigator?.clipboard?.writeText?.(n.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const fromX = bp === 'desktop' ? 48 : 0;
  const fromY = bp === 'desktop' ? 0 : -28;
  const width = bp === 'desktop' ? 420 : bp === 'tablet' ? 480 : '100%';
  const hoverProps: any = Platform.OS === 'web' ? { onHoverIn: pause, onHoverOut: resume } : {};

  return (
    <Animated.View
      {...pan.panHandlers}
      accessibilityRole="alert"
      accessibilityLiveRegion={n.kind === 'error' ? 'assertive' : 'polite'}
      style={{
        width: width as any,
        maxWidth: '100%',
        opacity: enter,
        transform: [
          { translateX: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [fromX, 0] }), drag.x) },
          { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] }), drag.y) },
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      }}
    >
      <Pressable {...hoverProps} onLongPress={pause} onPressOut={resume} delayLongPress={250} style={[nz.card, S.card, { borderColor: `${c}40` }]}>
        <View style={[nz.accent, { backgroundColor: c }]} />
        <View style={nz.row}>
          <Animated.View style={[nz.iconWrap, { backgroundColor: `${c}1A`, transform: [{ scale: pop }] }]}>
            <View style={[nz.iconDot, { backgroundColor: c }]}>
              <Icon name={icon as any} size={16} color="#FFFFFF" />
            </View>
          </Animated.View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={nz.title} numberOfLines={1}>
              {n.title}
            </Text>
            <Text style={nz.msg} numberOfLines={expanded ? undefined : 3} selectable>
              {n.message}
            </Text>
            {long || n.action || (n.kind === 'error' && Platform.OS === 'web') ? (
              <View style={nz.actions}>
                {long ? (
                  <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} accessibilityRole="button">
                    <Text style={[nz.link, { color: c }]}>{expanded ? 'Show less' : 'Show more'}</Text>
                  </Pressable>
                ) : null}
                {n.kind === 'error' && Platform.OS === 'web' ? (
                  <Pressable onPress={copy} hitSlop={8} accessibilityRole="button">
                    <Text style={[nz.link, { color: T.muted }]}>{copied ? 'Copied' : 'Copy'}</Text>
                  </Pressable>
                ) : null}
                {n.action ? (
                  <Pressable
                    onPress={() => {
                      n.action?.onPress();
                      close();
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <Text style={[nz.link, { color: c }]}>{n.action.label}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss message" style={(st: any) => [nz.x, st.hovered && { backgroundColor: T.alt }]}>
            <Icon name="close" size={18} color={T.muted} />
          </Pressable>
        </View>

        <View style={nz.track}>
          <Animated.View style={[nz.bar, { backgroundColor: c, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const nz = StyleSheet.create({
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingLeft: 16, paddingRight: 10, paddingTop: 12, paddingBottom: 12 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  iconDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '800', color: T.ink },
  msg: { fontSize: 13.5, lineHeight: 19, color: T.ink, opacity: 0.85, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  link: { fontSize: 12.5, fontWeight: '800' },
  x: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  track: { height: 3, backgroundColor: 'transparent' },
  bar: { height: 3 },
});
