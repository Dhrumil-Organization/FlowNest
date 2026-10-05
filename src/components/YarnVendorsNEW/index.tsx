// ─────────────────────────────────────────────────────────────
// FILE: src/components/YarnVendorsNEW/index.tsx
// NEW ERP — Yarn Vendors (AI chat with Claude).
//
// The user sends a message, Claude answers. NOTHING is stored (no table on the
// backend, no storage in the app):
//   - the conversation lives only in this component's state;
//   - it is cleared when the user leaves the screen (blur), opens it again,
//     switches property / logs in again (the wrapper remounts it), or taps
//     "New chat". While the screen is open the full conversation is kept and
//     sent as context, so replies stay consistent like a real AI chat.
//
// A chat screen: the request goes to the ERP backend (POST /api/yarn-vendors-chat,
// Bearer token) which calls Claude — see ./api.ts. The API key and the strict
// chat rules live on the backend (config/yarnvendorschat.php), not in the app.
//
// Behaviour:
//   - each message shows its real send / receive time; a day chip separates days
//   - typing indicator while Claude is answering, Stop button to cancel
//   - a failed message stays in the chat marked "Not sent" with Retry
//     (it is not sent again as context unless retried)
//   - Enter sends on web (Shift+Enter = new line); the send button on phones
//   - long-press / copy icon copies a message
// ─────────────────────────────────────────────────────────────
import { AppAlert } from '@/common/utils/appAlert';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { NavigationContext } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ChatError, ChatTurn, sendToClaude } from './api';
import { MAX_INPUT_CHARS, SUGGESTIONS, WELCOME_TEXT } from './config';

type Props = { token?: string; API?: string; username?: string };

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** When the user sent it / when Claude's reply arrived (device clock). */
  at: number;
  /** User message whose request failed — excluded from context until retried. */
  failed?: boolean;
  /** Why it failed (shown under the bubble). */
  error?: string;
};

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'msg'; key: string; msg: ChatMessage }
  | { kind: 'typing'; key: string };

let seq = 0;
const newId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

/* ------------------------------ time helpers ----------------------------- */
const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** 12-hour clock, e.g. "9:05 AM" (built by hand: locale APIs differ per device). */
export const formatTime = (ms: number) => {
  const d = new Date(ms);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
const dayLabel = (ms: number) => {
  const now = new Date();
  if (dayKey(ms) === dayKey(now.getTime())) return 'Today';
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(ms) === dayKey(y.getTime())) return 'Yesterday';
  const d = new Date(ms);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/* ------------------------------ typing dots ------------------------------ */
function TypingDots() {
  const dots = useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current;
  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 320, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(v, { toValue: 0.3, duration: 320, useNativeDriver: Platform.OS !== 'web' }),
          Animated.delay((2 - i) * 160),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);
  return (
    <View style={s.dots} accessibilityLabel="Assistant is typing">
      {dots.map((v, i) => (
        <Animated.View key={i} style={[s.dot, { opacity: v }]} />
      ))}
    </View>
  );
}

/* --------------------------------- screen -------------------------------- */
export default function YarnVendorsNEW({ token, API, username }: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const bubbleMax = phone ? '86%' : '72%';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const listRef = useRef<any>(null);
  const abortRef = useRef<any>(null);
  const runRef = useRef(0); // bumps on every send / clear so a late reply of an old run is ignored
  const mountedRef = useRef(true);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  // Token + API host come from ErpSessionGate (same as every production screen).
  const configured = Boolean(token && API);

  /* ------------------------------ lifecycle ------------------------------ */
  const resetChat = useCallback(() => {
    runRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setInput('');
    setWaiting(false);
    setCopiedId(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runRef.current++;
      abortRef.current?.abort();
    };
  }, []);

  // Leaving the screen clears the chat (tabs keep screens mounted, so this
  // cannot rely on unmount alone).
  const navigation = useContext(NavigationContext);
  useEffect(() => {
    if (!navigation) return undefined;
    return navigation.addListener('blur', () => resetChat());
  }, [navigation, resetChat]);

  /* -------------------------------- send --------------------------------- */
  const runRequest = useCallback(async (history: ChatMessage[], userMsgId: string) => {
    const run = ++runRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setWaiting(true);

    // Context = every message that really went through, in order.
    const turns: ChatTurn[] = history
      .filter((m) => !m.failed)
      .map((m) => ({ role: m.role, content: m.text }));

    try {
      const reply = await sendToClaude(API || '', token || '', turns, controller.signal);
      if (!mountedRef.current || run !== runRef.current) return;
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', text: reply, at: Date.now() }]);
    } catch (e: any) {
      if (!mountedRef.current || run !== runRef.current) return;
      const err = e instanceof ChatError ? e : new ChatError('server', e?.message || 'Something went wrong.');
      const note = err.kind === 'cancelled' ? 'Stopped before the answer arrived.' : err.message;
      setMessages((prev) => prev.map((m) => (m.id === userMsgId ? { ...m, failed: true, error: note } : m)));
    } finally {
      if (mountedRef.current && run === runRef.current) {
        abortRef.current = null;
        setWaiting(false);
      }
    }
  }, [API, token]);

  const send = useCallback((raw?: string) => {
    if (waiting) return;
    const text = (raw ?? input).trim();
    if (!text) return;
    const msg: ChatMessage = { id: newId(), role: 'user', text, at: Date.now() };
    const next = [...messagesRef.current, msg];
    setMessages(next);
    setInput('');
    void runRequest(next, msg.id);
  }, [input, runRequest, waiting]);

  const retry = useCallback((id: string) => {
    if (waiting) return;
    const current = messagesRef.current;
    const failed = current.find((m) => m.id === id);
    if (!failed) return;
    // Move it to the end as a fresh send (new time), so the order shown is the
    // order Claude receives.
    const fresh: ChatMessage = { id: newId(), role: 'user', text: failed.text, at: Date.now() };
    const next = [...current.filter((m) => m.id !== id), fresh];
    setMessages(next);
    void runRequest(next, fresh.id);
  }, [runRequest, waiting]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const confirmNewChat = useCallback(() => {
    if (messagesRef.current.length === 0 && !waiting) return;
    AppAlert.alert('Start a new chat?', 'The current conversation will be cleared. It is not saved anywhere.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => resetChat() },
    ]);
  }, [resetChat, waiting]);

  const copy = useCallback(async (m: ChatMessage) => {
    try {
      await Clipboard.setStringAsync(m.text);
      setCopiedId(m.id);
      setTimeout(() => {
        if (mountedRef.current) setCopiedId((cur) => (cur === m.id ? null : cur));
      }, 1500);
    } catch {
      // clipboard not available — nothing to do
    }
  }, []);

  /* -------------------------------- rows --------------------------------- */
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDay = '';
    messages.forEach((m) => {
      const k = dayKey(m.at);
      if (k !== lastDay) {
        lastDay = k;
        out.push({ kind: 'day', key: `day-${k}-${m.id}`, label: dayLabel(m.at) });
      }
      out.push({ kind: 'msg', key: m.id, msg: m });
    });
    if (waiting) out.push({ kind: 'typing', key: 'typing' });
    return out;
  }, [messages, waiting]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true }));
  }, []);
  useEffect(() => {
    if (rows.length > 0) scrollToEnd();
  }, [rows.length, scrollToEnd]);

  /* ------------------------------- render -------------------------------- */
  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'day') {
      return (
        <View style={s.dayRow}>
          <Text style={s.dayChip}>{item.label}</Text>
        </View>
      );
    }
    if (item.kind === 'typing') {
      return (
        <View style={[s.msgRow, s.rowLeft]}>
          <View style={s.aiAvatar}><Icon name="auto-awesome" size={15} color="#fff" /></View>
          <View style={[s.bubble, s.aiBubble, { paddingVertical: 14 }]}><TypingDots /></View>
        </View>
      );
    }
    const m = item.msg;
    const mine = m.role === 'user';
    return (
      <View style={[s.msgRow, mine ? s.rowRight : s.rowLeft]}>
        {!mine ? <View style={s.aiAvatar}><Icon name="auto-awesome" size={15} color="#fff" /></View> : null}
        <View style={{ maxWidth: bubbleMax as any, minWidth: 0, flexShrink: 1, alignItems: mine ? 'flex-end' : 'flex-start' }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onLongPress={() => void copy(m)}
            delayLongPress={350}
            style={[s.bubble, mine ? s.userBubble : s.aiBubble, m.failed && s.failedBubble]}
          >
            {mine ? (
              <Text style={s.userText} selectable>{m.text}</Text>
            ) : (
              <Markdown style={mdStyles as any}>{m.text}</Markdown>
            )}
          </TouchableOpacity>

          <View style={[s.metaRow, mine && { justifyContent: 'flex-end' }]}>
            {m.failed ? (
              <>
                <Icon name="error-outline" size={13} color={T.red} />
                <Text style={[s.meta, { color: T.red }]}>Not sent</Text>
                <Text style={s.meta}>· {formatTime(m.at)}</Text>
              </>
            ) : (
              <>
                <Text style={s.meta}>{formatTime(m.at)}</Text>
                {mine ? <Icon name="done" size={13} color={T.muted} /> : null}
              </>
            )}
            {!m.failed ? (
              <TouchableOpacity onPress={() => void copy(m)} hitSlop={HIT} accessibilityLabel="Copy message" style={s.metaBtn}>
                <Icon name={copiedId === m.id ? 'check' : 'content-copy'} size={13} color={copiedId === m.id ? T.green : T.muted} />
                {copiedId === m.id ? <Text style={[s.meta, { color: T.green }]}>Copied</Text> : null}
              </TouchableOpacity>
            ) : null}
          </View>

          {m.failed ? (
            <View style={[s.failBox, mine && { alignItems: 'flex-end' }]}>
              {m.error ? <Text style={s.failText}>{m.error}</Text> : null}
              <TouchableOpacity
                onPress={() => retry(m.id)}
                disabled={waiting}
                style={[s.retryBtn, waiting && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel="Retry sending"
              >
                <Icon name="refresh" size={15} color={T.red} />
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const empty = (
    <View style={s.empty}>
      <View style={s.emptyIcon}><Icon name="auto-awesome" size={26} color="#fff" /></View>
      <Text style={s.emptyTitle}>Yarn Vendors Assistant</Text>
      <Text style={s.emptyText}>{WELCOME_TEXT}</Text>
      {configured ? (
        <View style={s.suggestions}>
          {SUGGESTIONS.map((q) => (
            <TouchableOpacity key={q} style={s.suggestion} onPress={() => send(q)} activeOpacity={0.8}>
              <Icon name="north-east" size={14} color={T.copper} />
              <Text style={s.suggestionText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <Text style={s.privacy}>This chat is not saved. It clears when you leave this screen.</Text>
    </View>
  );

  const canSend = input.trim().length > 0 && !waiting;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
      <View style={s.page}>
        {/* toolbar */}
        <View style={s.toolbar}>
          <View style={[s.status, { backgroundColor: configured ? `${T.green}14` : `${T.amber}1F` }]}>
            <View style={[s.statusDot, { backgroundColor: configured ? T.green : T.amber }]} />
            <Text style={[s.statusText, { color: configured ? T.green : T.pd }]} numberOfLines={1}>
              {configured ? 'Claude AI' : 'Not signed in'}
            </Text>
          </View>
          {username ? <Text style={s.userName} numberOfLines={1}>{username}</Text> : <View style={{ flex: 1 }} />}
          <TouchableOpacity
            onPress={confirmNewChat}
            disabled={messages.length === 0 && !waiting}
            style={[s.newChat, messages.length === 0 && !waiting && { opacity: 0.45 }]}
            accessibilityRole="button"
            accessibilityLabel="New chat"
          >
            <Icon name="add-comment" size={16} color={T.nav} />
            <Text style={s.newChatText}>New chat</Text>
          </TouchableOpacity>
        </View>

        {!configured ? (
          <View style={s.banner}>
            <Icon name="link-off" size={18} color={T.pd} />
            <Text style={s.bannerText}>
              Your login session was not found, so messages can not be sent. Please sign in again.
            </Text>
          </View>
        ) : null}

        {/* conversation */}
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r: Row) => r.key}
          renderItem={renderRow}
          ListEmptyComponent={empty}
          contentContainerStyle={[s.listContent, rows.length === 0 && { flexGrow: 1, justifyContent: 'center' }]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => { if (rows.length > 0) scrollToEnd(); }}
          showsVerticalScrollIndicator={false}
        />

        {/* composer */}
        <View style={s.composerWrap}>
          <View style={s.composer}>
            <TextInput
              value={input}
              onChangeText={(t) => setInput(t.length > MAX_INPUT_CHARS ? t.slice(0, MAX_INPUT_CHARS) : t)}
              placeholder="Ask about yarn vendors…"
              placeholderTextColor={T.muted}
              style={s.input}
              multiline
              maxLength={MAX_INPUT_CHARS}
              editable={configured}
              blurOnSubmit={false}
              onKeyPress={(e: any) => {
                // Web / hardware keyboard: Enter sends, Shift+Enter makes a new line.
                if (Platform.OS === 'web' && e?.nativeEvent?.key === 'Enter' && !e?.nativeEvent?.shiftKey) {
                  e.preventDefault?.();
                  send();
                }
              }}
            />
            {waiting ? (
              <TouchableOpacity style={[s.sendBtn, { backgroundColor: T.red }]} onPress={stop} accessibilityRole="button" accessibilityLabel="Stop">
                <Icon name="stop" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.sendBtn, !canSend && s.sendBtnOff]}
                onPress={() => send()}
                disabled={!canSend || !configured}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Icon name="send" size={19} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <View style={s.composerFoot}>
            <Text style={s.footNote} numberOfLines={1}>AI answers can be wrong — verify rates and terms with the vendor.</Text>
            {input.length > MAX_INPUT_CHARS * 0.8 ? (
              <Text style={[s.footNote, { color: input.length >= MAX_INPUT_CHARS ? T.red : T.muted }]}>
                {input.length}/{MAX_INPUT_CHARS}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

const mdStyles = {
  body: { color: T.ink, fontSize: 14.5, lineHeight: 21 },
  paragraph: { marginTop: 0, marginBottom: 6 },
  strong: { fontWeight: '700' },
  bullet_list: { marginBottom: 6 },
  ordered_list: { marginBottom: 6 },
  heading1: { fontSize: 17, fontWeight: '800', color: T.nav, marginBottom: 6 },
  heading2: { fontSize: 16, fontWeight: '800', color: T.nav, marginBottom: 6 },
  heading3: { fontSize: 15, fontWeight: '800', color: T.nav, marginBottom: 4 },
  code_inline: { backgroundColor: T.alt, color: T.ink, borderRadius: 4, paddingHorizontal: 4 },
  fence: { backgroundColor: T.alt, borderColor: T.border, borderRadius: 8, padding: 8, color: T.ink },
  code_block: { backgroundColor: T.alt, borderColor: T.border, borderRadius: 8, padding: 8, color: T.ink },
  table: { borderColor: T.border, borderRadius: 6 },
  th: { padding: 6, backgroundColor: T.sub },
  td: { padding: 6 },
  tr: { borderColor: T.border },
  link: { color: T.blue },
  hr: { backgroundColor: T.border },
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  page: { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },

  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  userName: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '600', color: T.muted, textAlign: 'right' },
  newChat: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  newChatText: { fontSize: 12.5, fontWeight: '700', color: T.nav },

  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 12, marginBottom: 6, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: `${T.amber}66`, backgroundColor: `${T.amber}14` },
  bannerText: { flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 18, color: T.pd, fontWeight: '600' },

  listContent: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12 },
  dayRow: { alignItems: 'center', marginVertical: 8 },
  dayChip: { fontSize: 11, fontWeight: '700', color: T.muted, backgroundColor: T.alt, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  bubble: { borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9, minWidth: 0 },
  aiBubble: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderBottomLeftRadius: 5, ...S.card },
  userBubble: { backgroundColor: T.nav, borderBottomRightRadius: 5 },
  failedBubble: { backgroundColor: T.muted },
  userText: { color: '#fff', fontSize: 14.5, lineHeight: 21 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, paddingHorizontal: 4, minHeight: 16 },
  meta: { fontSize: 10.5, fontWeight: '600', color: T.muted },
  metaBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 4 },
  failBox: { marginTop: 4, gap: 6, paddingHorizontal: 4 },
  failText: { fontSize: 12, lineHeight: 17, color: T.red, fontWeight: '600', textAlign: 'right' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: T.red, backgroundColor: T.surface },
  retryText: { fontSize: 12.5, fontWeight: '700', color: T.red },

  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.muted },

  empty: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24, gap: 6 },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: T.nav, textAlign: 'center' },
  emptyText: { fontSize: 13.5, lineHeight: 20, color: T.muted, textAlign: 'center', maxWidth: 460 },
  suggestions: { alignSelf: 'stretch', gap: 8, marginTop: 12, maxWidth: 520, width: '100%', alignItems: 'stretch' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  suggestionText: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '600', color: T.ink },
  privacy: { marginTop: 14, fontSize: 11.5, color: T.muted, textAlign: 'center' },

  composerWrap: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10, backgroundColor: T.bg },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 22, paddingLeft: 14, paddingRight: 5, paddingVertical: 5, ...S.card },
  input: { flex: 1, minWidth: 0, minHeight: 40, maxHeight: 130, fontSize: 14.5, lineHeight: 20, color: T.ink, paddingTop: 10, paddingBottom: 10, textAlignVertical: 'center', ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null) },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: T.muted, opacity: 0.6 },
  composerFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingHorizontal: 8, marginTop: 5 },
  footNote: { fontSize: 10.5, color: T.muted, flexShrink: 1 },
});
