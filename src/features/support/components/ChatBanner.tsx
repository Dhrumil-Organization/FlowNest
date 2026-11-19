// FILE: src/features/support/components/ChatBanner.tsx
// IN-APP CHAT NOTIFICATION — like WhatsApp: when somebody writes in any chat (direct, group,
// IT Team, IT Help) and you are not looking at that chat — another screen of the IT Desk /
// Support, or another chat — a banner slides in at the top with who, which chat and the text.
// Several chats stack (max 3). Tap = open that chat. Hides by itself after 6 s.
// Browser tab in the background (and browser push not turned on): a system notification instead.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Incoming, useChat } from '../chatStore';
import { pushOnHere } from '../push';
import { Avatar } from './ui';

const WEB = Platform.OS === 'web';
const ROOM_ICON: Record<string, string> = { team: 'groups', help: 'support-agent', group: 'workspaces', direct: 'person' };

export function ChatBanner({ onOpen }: { onOpen: (roomId: number) => void }) {
  const incoming = useChat((s) => s.incoming);
  const insets = useSafeAreaInsets();
  const shown = useRef<Record<string, boolean>>({});
  // phones: while IT Desk / Support is open this banner is the chat notification (no double alert)
  useEffect(() => { (globalThis as any).__supportMounted = true; return () => { (globalThis as any).__supportMounted = false; }; }, []);

  // background browser tab: a system notification (when server push is not on for this browser)
  useEffect(() => {
    if (!WEB) return;
    const g: any = globalThis;
    const hidden = g.document?.visibilityState === 'hidden';
    incoming.forEach((i) => {
      const k = `${i.room_id}:${i.last_id}`;
      if (shown.current[k]) return;
      shown.current[k] = true;
      if (!hidden || pushOnHere || !g.Notification || g.Notification.permission !== 'granted') return;
      try {
        const n = new g.Notification(i.kind === 'direct' ? i.user_name : `${i.user_name} · ${i.room_name}`, { body: i.text, tag: `chat-${i.room_id}` });
        n.onclick = () => { g.focus?.(); onOpen(i.room_id); n.close(); };
      } catch { /* not allowed here */ }
    });
  }, [incoming]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!incoming.length) return null;
  return (
    <View pointerEvents="box-none" style={[b.wrap, { top: (WEB ? 8 : insets.top + 6) }]}>
      {incoming.slice(-3).reverse().map((i) => <Card key={i.room_id} i={i} onOpen={onOpen} />)}
    </View>
  );
}

function Card({ i, onOpen }: { i: Incoming; onOpen: (roomId: number) => void }) {
  const dismiss = useChat((s) => s.dismissIncoming);
  const y = useRef(new Animated.Value(-20)).current;
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([Animated.timing(y, { toValue: 0, duration: 180, useNativeDriver: !WEB }), Animated.timing(o, { toValue: 1, duration: 180, useNativeDriver: !WEB })]).start();
    const t = setTimeout(() => dismiss(i.room_id), 6000);
    return () => clearTimeout(t);
  }, [i.last_id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[b.card, { opacity: o, transform: [{ translateY: y }] }]}>
      <Pressable style={b.press} onPress={() => { dismiss(i.room_id); onOpen(i.room_id); }} accessibilityRole="button" accessibilityLabel={`New message from ${i.user_name} in ${i.room_name}`}>
        {i.kind === 'direct' && i.other ? <Avatar name={i.other.name} id={i.other.id} color={i.other.color} size={38} /> : (
          <View style={[b.icon, { backgroundColor: i.color || T.blue }]}><Icon name={(ROOM_ICON[i.kind] || 'forum') as any} size={20} color="#fff" /></View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={b.title} numberOfLines={1}>{i.kind === 'direct' ? i.user_name : i.room_name}</Text>
            {i.count > 1 ? <View style={b.count}><Text style={b.countText}>{i.count > 99 ? '99+' : i.count}</Text></View> : null}
            <Text style={b.now}>now</Text>
          </View>
          <Text style={b.text} numberOfLines={2}>{i.kind === 'direct' ? '' : `${i.user_name.split(' ')[0]}: `}{i.text}</Text>
        </View>
      </Pressable>
      <Pressable onPress={() => dismiss(i.room_id)} style={b.x} accessibilityLabel="Hide"><Icon name="close" size={16} color={T.muted} /></Pressable>
    </Animated.View>
  );
}

const b = StyleSheet.create({
  wrap: { position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 9999, elevation: 30, gap: 6, paddingHorizontal: 10 },
  card: { width: '100%', maxWidth: 440, flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  press: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, minWidth: 0 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13.5, fontWeight: '900', color: T.ink, flexShrink: 1 },
  text: { fontSize: 12.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  now: { fontSize: 10.5, fontWeight: '800', color: T.copper, marginLeft: 'auto' },
  count: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  x: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
});
