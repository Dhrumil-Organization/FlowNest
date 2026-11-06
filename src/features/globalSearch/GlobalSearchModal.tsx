// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/GlobalSearchModal.tsx
// The search window — the same one for the ERP and for the Mill Hub; what it
// can find is decided only by the `index` it gets (already rights-filtered).
//
//   • animated FlowNest logo, voice search (🎤 English / हिंदी) with a live
//     waveform, filter chips with counts (Screens · Tabs · Cards · Reports ·
//     Actions — tap one with an empty box to browse everything of that kind)
//   • "Best match" card when one result is clearly the one meant
//   • phone: full screen · tablet / web: centred panel, ↑ ↓ Enter Esc
//
// Scrolling: the list scrolls by itself ONLY when the user moves with the
// arrow keys. (Before, the mouse hovering a row selected it and scrolled the
// list, the next row came under the mouse, and the list kept running down.)
// ─────────────────────────────────────────────────────────────
import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { kindLabel } from './erpIndex';
import { FlowNestMark } from './FlowNestMark';
import { browse, COMMANDS, FILTERS, readVoiceIntent, runSearch, type PreparedIndex } from './searchEngine';
import type { HelpArticle, SearchEntry, SearchFilter, SearchOutcome, SearchResult } from './types';
import { useVoiceSearch, type VoiceLang } from './voice';

type Props = {
  visible: boolean;
  onClose: () => void;
  index: PreparedIndex;
  unfiltered?: readonly SearchEntry[];
  recents: readonly string[];
  /** "Sudamo / Knits", "Rayons", "Mill Hub" */
  contextLabel: string;
  placeholder?: string;
  accent?: string;
  initialQuery?: string;
  onOpen: (entry: SearchEntry) => void;
};

type Row =
  | { key: string; type: 'header'; title: string }
  | { key: string; type: 'result'; result: SearchResult; sel: number }
  | { key: string; type: 'top'; result: SearchResult; sel: number }
  | { key: string; type: 'command'; cmd: string; title: string; hint: string; sel: number }
  | { key: string; type: 'article'; article: HelpArticle }
  | { key: string; type: 'intro' }
  | { key: string; type: 'empty'; text: string; suggestion?: string | null };

const GLYPHS: Record<string, unknown> = ((Icon as unknown as { glyphMap?: Record<string, unknown> }).glyphMap) || {};
const glyph = (name: string, fallback = 'apps') => (GLYPHS[name] !== undefined ? name : fallback) as any;

const KIND_COLOR: Record<string, string> = {
  screen: T.yd,
  page: T.blue,
  tab: T.purple,
  card: T.amber,
  report: T.green,
  action: T.copper,
  app: T.muted,
};

const HELP_ONLY = /^\s*(\/help\b|\/h(?=\s|$)|\/\?|\?|help\b)\s*/i;
const VOICE_LANG_KEY = 'erp_global_search_voice_lang';
const isWeb = Platform.OS === 'web';

function groupOf(e: SearchEntry): string {
  if (e.kind === 'screen' || e.kind === 'page' || e.kind === 'app') return 'Screens';
  if (e.kind === 'action') return 'Things you can do';
  return 'Inside screens';
}

function buildRows(outcome: SearchOutcome, query: string, browsing: boolean): Row[] {
  const rows: Row[] = [];
  let sel = 0;
  const pushList = (list: SearchResult[]) => {
    for (const r of list) rows.push({ key: `r:${r.entry.id}`, type: 'result', result: r, sel: sel++ });
  };
  const pushGrouped = (list: SearchResult[]) => {
    const order = ['Screens', 'Inside screens', 'Things you can do'];
    const buckets = new Map<string, SearchResult[]>();
    for (const r of list) buckets.set(groupOf(r.entry), [...(buckets.get(groupOf(r.entry)) || []), r]);
    const first = list[0] ? groupOf(list[0].entry) : order[0];
    for (const g of [first, ...order.filter((x) => x !== first)]) {
      const items = buckets.get(g);
      if (!items?.length) continue;
      rows.push({ key: `h:${g}`, type: 'header', title: `${g} · ${items.length}` });
      pushList(items);
    }
  };

  switch (outcome.mode) {
    case 'commands': {
      const word = query.trim().replace(/^\//, '').toLowerCase();
      rows.push({ key: 'h:cmd', type: 'header', title: 'Commands' });
      for (const c of COMMANDS.filter((x) => x.cmd.slice(1).startsWith(word))) {
        rows.push({ key: `c:${c.cmd}`, type: 'command', cmd: c.cmd, title: c.title, hint: c.hint, sel: sel++ });
      }
      break;
    }
    case 'help': {
      if (outcome.article) {
        rows.push({ key: 'article', type: 'article', article: outcome.article });
        if (outcome.results.length) {
          rows.push({ key: 'h:other', type: 'header', title: 'Help for other matches' });
          pushList(outcome.results.slice(0, 8));
        }
      } else if (!query.replace(HELP_ONLY, '').trim()) {
        rows.push({ key: 'intro', type: 'intro' });
        rows.push({ key: 'h:mine', type: 'header', title: `Your screens · ${outcome.results.length} — tap one to learn it` });
        pushList(outcome.results);
      } else {
        rows.push({ key: 'empty', type: 'empty', text: `No help found for "${query.replace(HELP_ONLY, '').trim()}".`, suggestion: outcome.suggestion });
      }
      break;
    }
    case 'recent':
    case 'all': {
      if (outcome.results.length) {
        const title = browsing
          ? `${FILTERS.find((f) => f.key === outcome.filter)?.label || 'All'} you can open · ${outcome.results.length}`
          : outcome.mode === 'all'
            ? `All your screens · ${outcome.results.length}`
            : 'Recent & your screens';
        rows.push({ key: 'h:list', type: 'header', title });
        pushList(outcome.results);
      } else {
        rows.push({ key: 'empty', type: 'empty', text: 'Nothing here yet.' });
      }
      break;
    }
    default: {
      if (!outcome.results.length) {
        rows.push({ key: 'empty', type: 'empty', text: `Nothing found for "${query.trim()}".`, suggestion: outcome.suggestion });
        break;
      }
      if (outcome.confident && outcome.filter === 'all') {
        rows.push({ key: `t:${outcome.results[0].entry.id}`, type: 'top', result: outcome.results[0], sel: sel++ });
        pushGrouped(outcome.results.slice(1));
      } else {
        pushGrouped(outcome.results);
      }
    }
  }
  return rows;
}

function Highlighted({ text, ranges, style, strongStyle }: { text: string; ranges: Array<[number, number]>; style: any; strongStyle: any }) {
  if (!ranges.length) return <Text style={style} numberOfLines={1}>{text}</Text>;
  const parts: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach(([s, e], i) => {
    if (s > at) parts.push(text.slice(at, s));
    parts.push(<Text key={i} style={strongStyle}>{text.slice(s, e)}</Text>);
    at = e;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <Text style={style} numberOfLines={1}>{parts}</Text>;
}

// ── one result row (memo: hover / arrow keys re-render only 2 rows) ──
const ResultRow = memo(function ResultRow({
  result,
  sel,
  active,
  accent,
  helpMode,
  onPick,
  onHover,
  onHelp,
}: {
  result: SearchResult;
  sel: number;
  active: boolean;
  accent: string;
  helpMode: boolean;
  onPick: (r: SearchResult) => void;
  onHover: (sel: number) => void;
  onHelp: (title: string) => void;
}) {
  const e = result.entry;
  const color = KIND_COLOR[e.kind] || T.yd;
  return (
    <View style={[s.rowWrap, active && { backgroundColor: T.sub, borderColor: `${accent}AA` }]}>
      <Pressable
        onPress={() => onPick(result)}
        onHoverIn={isWeb ? () => onHover(sel) : undefined}
        style={({ pressed }: { pressed: boolean }) => [s.row, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={`${e.title}, ${kindLabel(e.kind)}, ${e.breadcrumb}`}
      >
        <View style={[s.rowIcon, { backgroundColor: `${color}1A` }]}>
          <Icon name={glyph(e.icon)} size={19} color={color} />
        </View>
        <View style={s.rowText}>
          <Highlighted text={e.title} ranges={result.highlight} style={s.rowTitle} strongStyle={[s.hl, { color: accent }]} />
          <Text style={s.rowSub} numberOfLines={1}>
            {e.breadcrumb}
            {e.subtitle ? `  ·  ${e.subtitle}` : ''}
          </Text>
        </View>
        <View style={[s.kind, { borderColor: `${color}55` }]}>
          <Text style={[s.kindText, { color }]}>{kindLabel(e.kind)}</Text>
        </View>
        {helpMode ? <Icon name="chevron-right" size={18} color={T.muted} /> : null}
      </Pressable>
      {!helpMode ? (
        <TouchableOpacity onPress={() => onHelp(e.title)} hitSlop={8} style={s.helpBtn} accessibilityRole="button" accessibilityLabel={`Help for ${e.title}`}>
          <Icon name="help-outline" size={17} color={T.muted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const TopHit = memo(function TopHit({
  result,
  active,
  accent,
  onPick,
  onHelp,
}: {
  result: SearchResult;
  active: boolean;
  accent: string;
  onPick: (r: SearchResult) => void;
  onHelp: (title: string) => void;
}) {
  const e = result.entry;
  return (
    <View style={[s.top, { borderColor: active ? accent : T.border }]}>
      <Text style={s.topLabel}>BEST MATCH</Text>
      <View style={s.topRow}>
        <View style={[s.topIcon, { backgroundColor: `${accent}1F` }]}>
          <Icon name={glyph(e.icon)} size={24} color={accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Highlighted text={e.title} ranges={result.highlight} style={s.topTitle} strongStyle={{ color: accent }} />
          <Text style={s.rowSub} numberOfLines={2}>
            {kindLabel(e.kind)} · {e.breadcrumb}
            {e.subtitle ? `\n${e.subtitle}` : ''}
          </Text>
        </View>
      </View>
      <View style={s.topBtns}>
        <TouchableOpacity onPress={() => onPick(result)} style={[s.openBtn, { backgroundColor: accent, marginTop: 0 }]} accessibilityRole="button">
          <Text style={s.openText}>Open</Text>
          <Icon name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onHelp(e.title)} style={s.ghostBtn} accessibilityRole="button">
          <Icon name="help-outline" size={15} color={T.ink} />
          <Text style={s.ghostText}>How to use</Text>
        </TouchableOpacity>
        {isWeb ? <Text style={s.enterHint}>Enter ↵</Text> : null}
      </View>
    </View>
  );
});

// ── waveform: 21 bars, height = mic level × a per-bar shape + a gentle wave ──
const BARS = Array.from({ length: 21 }, (_, i) => {
  const c = 1 - Math.abs(i - 10) / 11; // taller in the middle
  return { gain: 0.35 + c * 1.1, phase: (i * 0.37) % 1 };
});
function Waveform({ level, color }: { level: Animated.Value; color: string }) {
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(wave, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [wave]);
  return (
    <View style={s.wave}>
      {BARS.map((b, i) => {
        const p = b.phase;
        const osc = wave.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [0.24 + 0.17 * Math.sin(p * 6.28), 0.24 + 0.17 * Math.sin((p + 0.25) * 6.28), 0.24 + 0.17 * Math.sin((p + 0.5) * 6.28), 0.24 + 0.17 * Math.sin((p + 0.75) * 6.28), 0.24 + 0.17 * Math.sin(p * 6.28)],
        });
        const scaleY = Animated.add(osc, Animated.multiply(level, b.gain));
        return <Animated.View key={i} style={[s.bar, { backgroundColor: color, opacity: 0.55 + 0.45 * (1 - Math.abs(i - 10) / 10), transform: [{ scaleY }] }]} />;
      })}
    </View>
  );
}

export function GlobalSearchModal(props: Props) {
  const { visible, onClose, index, unfiltered, recents, contextLabel, onOpen } = props;
  const accent = props.accent || T.copper;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 768;

  const [query, setQuery] = useState(props.initialQuery || '');
  const deferred = useDeferredValue(query);
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [active, setActive] = useState(0);
  const [opening, setOpening] = useState<SearchEntry | null>(null);
  const [lang, setLang] = useState<VoiceLang>('en-IN');
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Row>>(null);
  const keyboardMove = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appear = useRef(new Animated.Value(0)).current;

  // ── open / close ──
  useEffect(() => {
    if (!visible) return undefined;
    setQuery(props.initialQuery || '');
    setFilter('all');
    setActive(0);
    setOpening(null);
    appear.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const t = setTimeout(() => inputRef.current?.focus(), Platform.OS === 'android' ? 260 : 60);
    return () => clearTimeout(t);
  }, [visible, props.initialQuery, appear]);

  useEffect(() => {
    AsyncStorage.getItem(VOICE_LANG_KEY)
      .then((v) => {
        if (v === 'hi-IN' || v === 'en-IN') setLang(v);
      })
      .catch(() => undefined);
  }, []);

  // ── search ──
  const browsing = !deferred.trim() && filter !== 'all';
  const outcome = useMemo(
    () => (browsing ? browse(index, filter) : runSearch(index, deferred, { recents, unfiltered, filter })),
    [browsing, index, deferred, recents, unfiltered, filter],
  );
  // counts for the chips: of the current search, or of everything when the box is empty
  const counts = useMemo(() => outcome.counts || browse(index, 'all').counts!, [outcome, index]);
  const rows = useMemo(() => buildRows(outcome, deferred, browsing), [outcome, deferred, browsing]);
  const selectable = useMemo(() => rows.filter((r) => r.type === 'result' || r.type === 'command' || r.type === 'top'), [rows]);
  const showChips = outcome.mode === 'search' || outcome.mode === 'recent' || browsing || (outcome.mode === 'all' && !deferred.trim());
  const helpMode = outcome.mode === 'help';

  useEffect(() => {
    setActive(0);
    keyboardMove.current = false;
    listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [deferred, filter]);

  // scroll ONLY for arrow-key moves (never for hover / taps)
  useEffect(() => {
    if (!keyboardMove.current) return;
    keyboardMove.current = false;
    const rowIndex = rows.findIndex((r) => 'sel' in r && r.sel === active);
    if (rowIndex >= 0) listRef.current?.scrollToIndex?.({ index: rowIndex, viewPosition: 0.4, animated: true });
  }, [active, rows]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    if (openTimer.current) clearTimeout(openTimer.current);
    onClose();
  }, [onClose]);

  const openEntry = useCallback(
    (entry: SearchEntry) => {
      if (openTimer.current) clearTimeout(openTimer.current);
      setOpening(null);
      Keyboard.dismiss();
      onOpen(entry);
    },
    [onOpen],
  );

  const showHelpFor = useCallback((title: string) => {
    setFilter('all');
    setQuery(`/help ${title}`);
  }, []);

  const pickResult = useCallback(
    (r: SearchResult) => {
      if (helpMode) showHelpFor(r.entry.title);
      else openEntry(r.entry);
    },
    [helpMode, openEntry, showHelpFor],
  );

  const pickRow = useCallback(
    (row: Row | undefined) => {
      if (!row) return;
      if (row.type === 'command') {
        setQuery(`${row.cmd} `);
        inputRef.current?.focus();
      } else if (row.type === 'result' || row.type === 'top') pickResult(row.result);
    },
    [pickResult],
  );

  const onHover = useCallback((sel: number) => setActive(sel), []);

  // ── voice ──
  const hints = useMemo(
    () => Array.from(new Set(index.entries.filter((p) => p.entry.kind === 'screen' || p.entry.kind === 'page').map((p) => p.entry.title))),
    [index],
  );
  const pendingOpen = useRef(false);
  const voice = useVoiceSearch({
    onFinal: (text) => {
      const intent = readVoiceIntent(text);
      setFilter('all');
      setQuery(intent.query);
      pendingOpen.current = intent.open;
    },
  });
  // "… kholo / open …" + one clear match → open it (with a moment to cancel)
  useEffect(() => {
    if (!pendingOpen.current || deferred !== query) return;
    pendingOpen.current = false;
    if (outcome.mode === 'search' && outcome.confident && outcome.results[0]) {
      const entry = outcome.results[0].entry;
      setOpening(entry);
      openTimer.current = setTimeout(() => openEntry(entry), 1100);
    }
  }, [outcome, deferred, query, openEntry]);
  useEffect(() => () => { if (openTimer.current) clearTimeout(openTimer.current); }, []);

  const toggleLang = () => {
    const next: VoiceLang = lang === 'en-IN' ? 'hi-IN' : 'en-IN';
    setLang(next);
    AsyncStorage.setItem(VOICE_LANG_KEY, next).catch(() => undefined);
    if (voice.listening) {
      voice.cancel();
      setTimeout(() => voice.start(next, hints), 250);
    }
  };
  const micPress = () => {
    if (voice.listening) voice.stop();
    else {
      Keyboard.dismiss();
      voice.start(lang, hints);
    }
  };
  const { listening: voiceListening, cancel: voiceCancel } = voice;
  useEffect(() => {
    if (!visible && voiceListening) voiceCancel();
  }, [visible, voiceListening, voiceCancel]);

  // ── keys (web / hardware keyboard) ──
  useEffect(() => {
    if (!visible || !isWeb || typeof window === 'undefined') return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (voiceListening) voiceCancel();
        else if (opening) {
          if (openTimer.current) clearTimeout(openTimer.current);
          setOpening(null);
        } else close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        keyboardMove.current = true;
        setActive((a) => Math.min(a + 1, Math.max(0, selectable.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        keyboardMove.current = true;
        setActive((a) => Math.max(0, a - 1));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [visible, selectable.length, close, voiceListening, voiceCancel, opening]);

  const onSubmit = () => {
    if (helpMode && outcome.article) return openEntry(outcome.article.entry);
    pickRow(selectable.find((r) => 'sel' in r && r.sel === active) || selectable[0]);
  };

  const renderRow = useCallback(
    ({ item }: { item: Row }) => {
      switch (item.type) {
        case 'header':
          return <Text style={s.section}>{item.title.toUpperCase()}</Text>;
        case 'command':
          return (
            <Pressable onPress={() => pickRow(item)} style={[s.rowWrap, s.row, item.sel === active && { backgroundColor: T.sub, borderColor: `${accent}AA` }]}>
              <View style={[s.rowIcon, { backgroundColor: T.alt }]}>
                <Icon name={glyph('keyboard-command-key', 'terminal')} size={18} color={accent} />
              </View>
              <View style={s.rowText}>
                <Text style={s.rowTitle}>
                  {item.cmd} <Text style={s.rowTitleMuted}>· {item.title}</Text>
                </Text>
                <Text style={s.rowSub} numberOfLines={1}>{item.hint}</Text>
              </View>
            </Pressable>
          );
        case 'top':
          return <TopHit result={item.result} active={item.sel === active} accent={accent} onPick={pickResult} onHelp={showHelpFor} />;
        case 'result':
          return (
            <ResultRow
              result={item.result}
              sel={item.sel}
              active={item.sel === active}
              accent={accent}
              helpMode={helpMode}
              onPick={pickResult}
              onHover={onHover}
              onHelp={showHelpFor}
            />
          );
        case 'article':
          return <ArticleCard article={item.article} accent={accent} onOpen={openEntry} onAsk={showHelpFor} />;
        case 'intro':
          return <IntroCard accent={accent} contextLabel={contextLabel} voice={voice.available} />;
        case 'empty':
          return (
            <View style={s.empty}>
              <Icon name="search-off" size={34} color={T.muted} />
              <Text style={s.emptyTitle}>{item.text}</Text>
              {item.suggestion ? (
                <TouchableOpacity onPress={() => setQuery(helpMode ? `/help ${item.suggestion}` : String(item.suggestion))} style={[s.chip, { borderColor: accent }]}>
                  <Text style={[s.chipText, { color: accent }]}>Did you mean “{item.suggestion}”?</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={s.emptyHint}>Only what your rights allow in {contextLabel} is searched. Type /help to see what you can open.</Text>
            </View>
          );
        default:
          return null;
      }
    },
    [accent, active, contextLabel, helpMode, onHover, openEntry, pickResult, pickRow, showHelpFor, voice.available],
  );

  const voiceView = voice.listening || voice.error ? (
    <View style={s.voice}>
      <FlowNestMark size={58} mode={voice.listening ? 'listening' : 'idle'} level={voice.level} color={accent} />
      <Text style={s.voiceTitle}>{voice.listening ? (voice.partial ? 'Got it…' : 'Listening… speak now') : 'Voice search'}</Text>
      <Text style={[s.voiceText, !voice.partial && { color: T.muted }]} numberOfLines={3}>
        {voice.error || voice.partial || (lang === 'hi-IN' ? 'जैसे: "यार्न स्टॉक खोलो"' : 'e.g. "open yarn stock", "new production order"')}
      </Text>
      {voice.listening ? <Waveform level={voice.level} color={accent} /> : null}
      <View style={s.voiceBtns}>
        <TouchableOpacity onPress={toggleLang} style={s.langBtn} accessibilityRole="button" accessibilityLabel="Change voice language">
          <Icon name="translate" size={15} color={T.ink} />
          <Text style={s.langText}>{lang === 'hi-IN' ? 'हिंदी' : 'English'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={micPress} style={[s.micBig, { backgroundColor: voice.listening ? T.red : accent }]} accessibilityRole="button" accessibilityLabel={voice.listening ? 'Stop listening' : 'Speak'}>
          <Icon name={voice.listening ? 'stop' : 'mic'} size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => voice.cancel()} style={s.langBtn} accessibilityRole="button">
          <Text style={s.langText}>{voice.listening ? 'Cancel' : 'Type instead'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

  const panelAnim = {
    opacity: appear,
    transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [wide ? -10 : 24, 0] }) }, { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [wide ? 0.985 : 1, 1] }) }],
  };

  const panel = (
    <Animated.View
      style={[
        s.panel,
        panelAnim,
        wide
          ? { width: Math.min(740, width - 48), height: Math.min(700, height * 0.84), marginTop: Math.max(28, height * 0.07), borderRadius: 20 }
          : { flex: 1, width: '100%', paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* ── search row ── */}
      <View style={s.searchRow}>
        {!wide ? (
          <TouchableOpacity onPress={close} hitSlop={10} style={s.back} accessibilityRole="button" accessibilityLabel="Close search">
            <Icon name="arrow-back" size={22} color={T.ink} />
          </TouchableOpacity>
        ) : null}
        <FlowNestMark size={wide ? 24 : 22} mode={voice.listening ? 'listening' : 'idle'} level={voice.level} color={accent} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={(v: string) => {
            setQuery(v);
            if (opening) {
              if (openTimer.current) clearTimeout(openTimer.current);
              setOpening(null);
            }
          }}
          placeholder={props.placeholder || 'Search anything…  or speak, or /help'}
          placeholderTextColor={T.muted}
          style={[s.input, isWeb && ({ outlineStyle: 'none' } as any)]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          blurOnSubmit={false}
          accessibilityLabel="Global search"
        />
        {query ? (
          <TouchableOpacity onPress={() => { setQuery(''); inputRef.current?.focus(); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
            <Icon name="cancel" size={19} color={T.muted} />
          </TouchableOpacity>
        ) : null}
        {voice.available ? (
          <TouchableOpacity
            onPress={micPress}
            style={[s.mic, voice.listening && { backgroundColor: T.red, borderColor: T.red }]}
            accessibilityRole="button"
            accessibilityLabel="Voice search"
          >
            <Icon name={voice.listening ? 'graphic-eq' : 'mic'} size={19} color={voice.listening ? '#fff' : accent} />
          </TouchableOpacity>
        ) : null}
        {wide ? (
          <TouchableOpacity onPress={close} style={s.esc} accessibilityRole="button" accessibilityLabel="Close search">
            <Text style={s.escText}>{isWeb ? 'Esc' : 'Close'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── context + filter chips with counts ── */}
      <View style={s.contextRow}>
        <View style={[s.dot, { backgroundColor: accent }]} />
        <Text style={s.contextText} numberOfLines={1}>
          {contextLabel} · only what your rights allow
        </Text>
        <TouchableOpacity onPress={() => { setFilter('all'); setQuery('/help '); inputRef.current?.focus(); }} style={s.helpChip}>
          <Icon name="help-outline" size={13} color={accent} />
          <Text style={[s.chipText, { color: accent }]}>Help</Text>
        </TouchableOpacity>
      </View>
      {showChips ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsBar} contentContainerStyle={s.chipsRow} keyboardShouldPersistTaps="handled">
          {FILTERS.filter((f) => f.key === 'all' || counts[f.key] > 0).map((f) => {
            const on = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[s.fChip, on && { backgroundColor: accent, borderColor: accent }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.fChipText, on && { color: '#fff' }]}>{f.label}</Text>
                <View style={[s.count, on && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <Text style={[s.countText, on && { color: '#fff' }]}>{counts[f.key]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {opening ? (
        <View style={[s.opening, { backgroundColor: accent }]}>
          <Text style={s.openingText} numberOfLines={1}>Opening {opening.title}…</Text>
          <TouchableOpacity
            onPress={() => {
              if (openTimer.current) clearTimeout(openTimer.current);
              setOpening(null);
            }}
            hitSlop={8}
          >
            <Text style={s.openingCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {voiceView || (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r: Row) => r.key}
          renderItem={renderRow}
          extraData={active}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={s.list}
          onScrollToIndexFailed={() => undefined}
          initialNumToRender={16}
          maxToRenderPerBatch={16}
          windowSize={9}
          removeClippedSubviews={Platform.OS === 'android'}
          style={{ flex: 1 }}
        />
      )}

      {wide && isWeb && !voiceView ? (
        <View style={s.footer}>
          <Text style={s.footerText}>↑ ↓ move · Enter open · Esc close · 🎤 speak · ? or /help to learn a screen</Text>
        </View>
      ) : null}
    </Animated.View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[s.backdrop, wide ? s.backdropWide : null, wide ? { opacity: appear } : null]}>
        {wide ? <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close search" /> : null}
        {panel}
      </Animated.View>
    </Modal>
  );
}

function IntroCard({ accent, contextLabel, voice }: { accent: string; contextLabel: string; voice: boolean }) {
  const tips = [
    'Type any screen, tab, report or action — "yarn stock", "new production order", "approve".',
    'Short forms, typos and Hinglish work: "pot", "febric", "mujhe yarn ka stock dekhna hai".',
    ...(voice ? ['Tap 🎤 and speak (English or हिंदी). Say "… kholo" / "open …" to open it at once.'] : []),
    '"/help <screen>", "? <screen>", "<screen> samjhao" — what it does, the steps and what YOUR rights allow there.',
    'Filter chips show how many screens, tabs, cards, reports and actions you have — tap one to see them all.',
    `Only what your rights allow in ${contextLabel} is ever shown.`,
  ];
  return (
    <View style={[s.card, { borderLeftColor: accent }]}>
      <Text style={s.cardTitle}>How the search works</Text>
      {tips.map((t, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={[s.bullet, { color: accent }]}>•</Text>
          <Text style={s.cardText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function ArticleCard({ article, accent, onOpen, onAsk }: { article: HelpArticle; accent: string; onOpen: (e: SearchEntry) => void; onAsk: (title: string) => void }) {
  const e = article.entry;
  return (
    <View style={[s.card, { borderLeftColor: accent }]}>
      <View style={s.articleHead}>
        <View style={[s.rowIcon, { backgroundColor: `${accent}1A` }]}>
          <Icon name={glyph(e.icon)} size={20} color={accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.articleTitle}>{e.title}</Text>
          <Text style={s.rowSub}>{kindLabel(e.kind)} · {e.breadcrumb}</Text>
        </View>
        <TouchableOpacity onPress={() => onOpen(e)} style={[s.openBtn, { backgroundColor: accent, marginTop: 0 }]} accessibilityRole="button">
          <Text style={s.openText}>Open</Text>
          <Icon name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={s.cardText}>{article.summary}</Text>

      <Text style={s.label}>WHERE</Text>
      <Text style={s.cardText}>{article.where}</Text>

      {article.steps.length ? (
        <>
          <Text style={s.label}>HOW TO</Text>
          {article.steps.map((t, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={[s.stepNo, { backgroundColor: accent }]}>{i + 1}</Text>
              <Text style={s.cardText}>{t}</Text>
            </View>
          ))}
        </>
      ) : null}

      {article.canDo.length ? (
        <>
          <Text style={s.label}>YOUR RIGHTS HERE</Text>
          <View style={s.tagWrap}>
            {article.canDo.map((t) => (
              <View key={t} style={[s.tag, s.tagOk]}>
                <Icon name="check" size={12} color={T.green} />
                <Text style={[s.tagText, { color: T.green }]}>{t}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {article.cannotDo.length ? (
        <>
          <Text style={s.label}>NOT GIVEN TO YOU (ASK YOUR ADMIN)</Text>
          <View style={s.tagWrap}>
            {article.cannotDo.map((t) => (
              <View key={t} style={[s.tag, s.tagNo]}>
                <Icon name="lock-outline" size={12} color={T.muted} />
                <Text style={[s.tagText, { color: T.muted }]}>{t}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {article.inside.length ? (
        <>
          <Text style={s.label}>INSIDE (YOU CAN OPEN)</Text>
          <View style={s.tagWrap}>
            {article.inside.slice(0, 16).map((t) => (
              <TouchableOpacity key={t} onPress={() => onAsk(t)} style={s.tag}>
                <Text style={s.tagText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      {article.tips.map((t, i) => (
        <View key={i} style={[s.bulletRow, { marginTop: i === 0 ? 10 : 2 }]}>
          <Icon name="lightbulb-outline" size={15} color={T.amber} style={{ marginTop: 1 }} />
          <Text style={[s.cardText, { color: T.muted }]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: T.bg },
  backdropWide: { backgroundColor: 'rgba(13,27,42,0.55)', alignItems: 'center', justifyContent: 'flex-start' },
  panel: {
    backgroundColor: T.surface,
    overflow: 'hidden',
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 34,
    elevation: 18,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  back: { width: 32, height: 34, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, fontSize: 16, color: T.ink, paddingVertical: 10, fontWeight: '600' },
  mic: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  esc: { borderWidth: 1, borderColor: T.border, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 4 },
  escText: { fontSize: 11, color: T.muted, fontWeight: '700' },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  contextText: { flex: 1, fontSize: 11.5, color: T.muted, fontWeight: '700' },
  helpChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: T.border },
  chip: { borderWidth: 1, borderColor: T.border, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: T.surface },
  chipText: { fontSize: 11, fontWeight: '700', color: T.ink },
  chipsBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: T.hair },
  chipsRow: { gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  fChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 11, paddingRight: 5, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  fChipText: { fontSize: 12, fontWeight: '700', color: T.ink },
  count: { minWidth: 22, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: T.alt, alignItems: 'center' },
  countText: { fontSize: 11, fontWeight: '800', color: T.muted },
  opening: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  openingText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 13 },
  openingCancel: { color: '#fff', fontWeight: '800', fontSize: 12, textDecorationLine: 'underline' },
  list: { paddingHorizontal: 8, paddingBottom: 18 },
  section: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: T.muted, paddingHorizontal: 8, paddingTop: 14, paddingBottom: 6 },
  rowWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent', paddingRight: 6, marginBottom: 1 },
  row: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 8 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: T.ink },
  rowTitleMuted: { fontWeight: '500', color: T.muted },
  hl: { fontWeight: '900' },
  rowSub: { fontSize: 11.5, color: T.muted, marginTop: 1 },
  kind: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  kindText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  helpBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  top: { marginHorizontal: 4, marginTop: 10, marginBottom: 2, padding: 14, borderRadius: 16, borderWidth: 1.5, backgroundColor: T.sub },
  topLabel: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1.4, color: T.muted, marginBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 18, fontWeight: '800', color: T.ink },
  topBtns: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  ghostText: { fontSize: 12.5, fontWeight: '700', color: T.ink },
  enterHint: { marginLeft: 'auto', fontSize: 11, color: T.muted, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 22, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: T.ink, textAlign: 'center' },
  emptyHint: { fontSize: 12, color: T.muted, textAlign: 'center', lineHeight: 17, maxWidth: 360 },
  card: { marginHorizontal: 6, marginTop: 10, padding: 14, borderRadius: 14, backgroundColor: T.sub, borderWidth: 1, borderColor: T.hair, borderLeftWidth: 4 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: T.ink, marginBottom: 6 },
  cardText: { flex: 1, fontSize: 13, lineHeight: 19, color: T.ink },
  bulletRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'flex-start' },
  bullet: { fontSize: 14, lineHeight: 19, fontWeight: '900' },
  articleHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  articleTitle: { fontSize: 16, fontWeight: '800', color: T.ink },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, color: T.muted, marginTop: 12, marginBottom: 4 },
  stepNo: { color: '#fff', fontSize: 11, fontWeight: '800', width: 19, height: 19, borderRadius: 10, textAlign: 'center', lineHeight: 19, overflow: 'hidden', marginTop: 1 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tagOk: { borderColor: `${T.green}55` },
  tagNo: { borderStyle: 'dashed' },
  tagText: { fontSize: 11.5, fontWeight: '700', color: T.ink },
  openBtn: { marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  openText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  voice: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 20, gap: 10 },
  voiceTitle: { fontSize: 13, fontWeight: '800', color: T.muted, letterSpacing: 0.6, marginTop: 4 },
  voiceText: { fontSize: 20, fontWeight: '700', color: T.ink, textAlign: 'center', minHeight: 56, maxWidth: 520 },
  wave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 54, marginVertical: 4 },
  bar: { width: 4, height: 46, borderRadius: 2 },
  voiceBtns: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 8 },
  micBig: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  langBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 92, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  langText: { fontSize: 12.5, fontWeight: '700', color: T.ink },
  footer: { borderTopWidth: 1, borderTopColor: T.hair, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: T.sub },
  footerText: { fontSize: 11, color: T.muted },
});
