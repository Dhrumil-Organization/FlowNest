// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/GlobalSearchModal.tsx
// The search window — the same one for the ERP and for the Mill Hub; what it
// can find is decided only by the `index` it gets (already rights-filtered).
//
//   phone           full screen, keyboard opens at once
//   tablet / web    centred panel; ↑ ↓ to move, Enter to open, Esc to close
// ─────────────────────────────────────────────────────────────
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { kindLabel } from './erpIndex';
import { COMMANDS, runSearch, type PreparedIndex } from './searchEngine';
import type { HelpArticle, SearchEntry, SearchOutcome, SearchResult } from './types';

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

function groupOf(e: SearchEntry): string {
  if (e.kind === 'screen' || e.kind === 'page' || e.kind === 'app') return 'Screens';
  if (e.kind === 'action') return 'Things you can do';
  return 'Inside screens';
}

function buildRows(outcome: SearchOutcome, query: string): Row[] {
  const rows: Row[] = [];
  let sel = 0;
  const pushResults = (list: SearchResult[], grouped: boolean) => {
    if (!grouped) {
      for (const r of list) rows.push({ key: `r:${r.entry.id}`, type: 'result', result: r, sel: sel++ });
      return;
    }
    const order = ['Screens', 'Inside screens', 'Things you can do'];
    const buckets = new Map<string, SearchResult[]>();
    for (const r of list) {
      const g = groupOf(r.entry);
      buckets.set(g, [...(buckets.get(g) || []), r]);
    }
    // the group of the best hit goes first
    const first = list[0] ? groupOf(list[0].entry) : order[0];
    for (const g of [first, ...order.filter((x) => x !== first)]) {
      const items = buckets.get(g);
      if (!items?.length) continue;
      rows.push({ key: `h:${g}`, type: 'header', title: g });
      for (const r of items) rows.push({ key: `r:${r.entry.id}`, type: 'result', result: r, sel: sel++ });
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
          pushResults(outcome.results.slice(0, 8), false);
        }
      } else if (!query.replace(HELP_ONLY, '').trim()) {
        rows.push({ key: 'intro', type: 'intro' });
        rows.push({ key: 'h:mine', type: 'header', title: 'Your screens — tap one to learn it' });
        pushResults(outcome.results, false);
      } else {
        rows.push({ key: 'empty', type: 'empty', text: `No help found for "${query.replace(HELP_ONLY, '').trim()}".`, suggestion: outcome.suggestion });
      }
      break;
    }
    case 'recent':
    case 'all': {
      if (outcome.results.length) {
        const title = outcome.mode === 'all' ? 'All your screens' : 'Recent & your screens';
        rows.push({ key: 'h:list', type: 'header', title });
        pushResults(outcome.results, false);
      } else {
        rows.push({ key: 'empty', type: 'empty', text: 'Nothing here yet.' });
      }
      break;
    }
    default: {
      if (outcome.results.length) pushResults(outcome.results, true);
      else rows.push({ key: 'empty', type: 'empty', text: `Nothing found for "${query.trim()}".`, suggestion: outcome.suggestion });
    }
  }
  return rows;
}

const HELP_ONLY = /^\s*(\/help\b|\/h(?=\s|$)|\/\?|\?|help\b)\s*/i;

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

export function GlobalSearchModal(props: Props) {
  const { visible, onClose, index, unfiltered, recents, contextLabel, onOpen } = props;
  const accent = props.accent || T.copper;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 768;
  const isWeb = Platform.OS === 'web';

  const [query, setQuery] = useState(props.initialQuery || '');
  const deferred = useDeferredValue(query);
  const [active, setActive] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Row>>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery(props.initialQuery || '');
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), Platform.OS === 'android' ? 250 : 60);
    return () => clearTimeout(t);
  }, [visible, props.initialQuery]);

  const outcome = useMemo(
    () => runSearch(index, deferred, { recents, unfiltered }),
    [index, deferred, recents, unfiltered],
  );
  const rows = useMemo(() => buildRows(outcome, deferred), [outcome, deferred]);
  const selectable = useMemo(() => rows.filter((r) => r.type === 'result' || r.type === 'command'), [rows]);

  useEffect(() => setActive(0), [deferred]);

  const screenCount = useMemo(() => index.entries.filter((p) => p.entry.kind === 'screen').length, [index]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const openEntry = useCallback(
    (entry: SearchEntry) => {
      Keyboard.dismiss();
      onOpen(entry);
    },
    [onOpen],
  );

  const showHelpFor = useCallback((title: string) => {
    setQuery(`/help ${title}`);
    listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, []);

  const pick = useCallback(
    (row: Row | undefined) => {
      if (!row) return;
      if (row.type === 'command') {
        setQuery(`${row.cmd} `);
        inputRef.current?.focus();
        return;
      }
      if (row.type === 'result') {
        // in help mode a tap shows that screen's help; the article has the Open button
        if (outcome.mode === 'help') showHelpFor(row.result.entry.title);
        else openEntry(row.result.entry);
      }
    },
    [openEntry, outcome.mode, showHelpFor],
  );

  // ↑ ↓ Enter Esc on web / hardware keyboards
  useEffect(() => {
    if (!visible || !isWeb || typeof window === 'undefined') return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, Math.max(0, selectable.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [visible, isWeb, selectable.length, close]);

  useEffect(() => {
    const rowIndex = rows.findIndex((r) => (r.type === 'result' || r.type === 'command') && r.sel === active);
    if (rowIndex > 2) listRef.current?.scrollToIndex?.({ index: rowIndex, viewPosition: 0.5, animated: false });
    else if (rowIndex >= 0) listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [active, rows]);

  const onSubmit = () => {
    if (outcome.mode === 'help' && outcome.article) {
      openEntry(outcome.article.entry);
      return;
    }
    pick(selectable[active]);
  };

  const chips: Array<{ label: string; q: string }> = [
    { label: '/help', q: '/help ' },
    { label: 'Recent', q: '/recent' },
    { label: 'All screens', q: '/all' },
  ];

  const renderRow = ({ item }: { item: Row }) => {
    switch (item.type) {
      case 'header':
        return <Text style={s.section}>{item.title.toUpperCase()}</Text>;
      case 'command': {
        const on = item.sel === active;
        return (
          <Pressable onPress={() => pick(item)} style={[s.row, on && { backgroundColor: T.sub, borderColor: accent }]}>
            <View style={[s.rowIcon, { backgroundColor: T.alt }]}>
              <Icon name={glyph('keyboard-command-key', 'terminal')} size={18} color={accent} />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>{item.cmd} <Text style={s.rowTitleMuted}>· {item.title}</Text></Text>
              <Text style={s.rowSub} numberOfLines={1}>{item.hint}</Text>
            </View>
          </Pressable>
        );
      }
      case 'result': {
        const e = item.result.entry;
        const on = item.sel === active;
        const color = KIND_COLOR[e.kind] || T.yd;
        // the row and its "?" are siblings (a button inside a button is invalid on web)
        return (
          <View style={[s.rowWrap, on && { backgroundColor: T.sub, borderColor: accent }]}>
            <Pressable
              onPress={() => pick(item)}
              onHoverIn={isWeb ? () => setActive(item.sel) : undefined}
              style={[s.row, s.rowInner]}
              accessibilityRole="button"
              accessibilityLabel={`${e.title}, ${kindLabel(e.kind)}, ${e.breadcrumb}`}
            >
              <View style={[s.rowIcon, { backgroundColor: `${color}1A` }]}>
                <Icon name={glyph(e.icon)} size={19} color={color} />
              </View>
              <View style={s.rowText}>
                <Highlighted text={e.title} ranges={item.result.highlight} style={s.rowTitle} strongStyle={[s.hl, { color: accent }]} />
                <Text style={s.rowSub} numberOfLines={1}>
                  {e.breadcrumb}
                  {e.subtitle ? `  ·  ${e.subtitle}` : ''}
                </Text>
              </View>
              <View style={[s.kind, { borderColor: `${color}55` }]}>
                <Text style={[s.kindText, { color }]}>{kindLabel(e.kind)}</Text>
              </View>
              {outcome.mode === 'help' ? <Icon name="chevron-right" size={18} color={T.muted} /> : null}
            </Pressable>
            {outcome.mode !== 'help' ? (
              <TouchableOpacity
                onPress={() => showHelpFor(e.title)}
                hitSlop={8}
                style={s.helpBtn}
                accessibilityRole="button"
                accessibilityLabel={`Help for ${e.title}`}
              >
                <Icon name="help-outline" size={17} color={T.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        );
      }
      case 'article':
        return <ArticleCard article={item.article} accent={accent} onOpen={openEntry} onAsk={showHelpFor} />;
      case 'intro':
        return <IntroCard accent={accent} contextLabel={contextLabel} />;
      case 'empty':
        return (
          <View style={s.empty}>
            <Icon name="search-off" size={34} color={T.muted} />
            <Text style={s.emptyTitle}>{item.text}</Text>
            {item.suggestion ? (
              <TouchableOpacity onPress={() => setQuery(outcome.mode === 'help' ? `/help ${item.suggestion}` : String(item.suggestion))} style={[s.chip, { borderColor: accent }]}>
                <Text style={[s.chipText, { color: accent }]}>Did you mean “{item.suggestion}”?</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={s.emptyHint}>Only the screens your rights allow in {contextLabel} are searched. Type /help to see what you can open.</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const panel = (
    <View
      style={[
        s.panel,
        wide
          ? { width: Math.min(720, width - 48), maxHeight: Math.min(680, height * 0.82), marginTop: Math.max(32, height * 0.08), borderRadius: 18 }
          : { flex: 1, width: '100%', paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={s.searchRow}>
        {!wide ? (
          <TouchableOpacity onPress={close} hitSlop={10} style={s.back} accessibilityRole="button" accessibilityLabel="Close search">
            <Icon name="arrow-back" size={22} color={T.ink} />
          </TouchableOpacity>
        ) : (
          <Icon name="search" size={22} color={accent} style={{ marginLeft: 4 }} />
        )}
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder={props.placeholder || 'Search screens, tabs, actions…  or /help'}
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
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
            <Icon name="close" size={20} color={T.muted} />
          </TouchableOpacity>
        ) : null}
        {wide ? (
          <TouchableOpacity onPress={close} style={s.esc} accessibilityRole="button" accessibilityLabel="Close search">
            <Text style={s.escText}>{isWeb ? 'Esc' : 'Close'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.contextRow}>
        <View style={[s.dot, { backgroundColor: accent }]} />
        <Text style={s.contextText} numberOfLines={1}>
          {contextLabel} · {screenCount} screen{screenCount === 1 ? '' : 's'} you can open
        </Text>
        <View style={s.chips}>
          {chips.map((c) => (
            <TouchableOpacity key={c.label} onPress={() => { setQuery(c.q); inputRef.current?.focus(); }} style={s.chip}>
              <Text style={s.chipText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r: Row) => r.key}
        renderItem={renderRow}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={s.list}
        onScrollToIndexFailed={() => undefined}
        initialNumToRender={18}
        style={wide ? { flexGrow: 0 } : { flex: 1 }}
      />

      {wide && isWeb ? (
        <View style={s.footer}>
          <Text style={s.footerText}>↑ ↓ move · Enter open · Esc close · ? or /help to learn a screen</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={close} statusBarTranslucent>
      <View style={[s.backdrop, wide ? s.backdropWide : null]}>
        {wide ? <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close search" /> : null}
        {panel}
      </View>
    </Modal>
  );
}

function IntroCard({ accent, contextLabel }: { accent: string; contextLabel: string }) {
  const tips = [
    'Type any screen, tab, report or action — e.g. "yarn stock", "new production order", "approve".',
    'Short forms and typos work: "pot" = Production Order Tracking, "febric" = Fabric.',
    '"/help <screen>" (or "? <screen>", "how to …") explains a screen: what it does, the steps and what YOUR rights allow there.',
    `Only screens your rights allow in ${contextLabel} are ever shown — nothing else is searched.`,
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

function ArticleCard({
  article,
  accent,
  onOpen,
  onAsk,
}: {
  article: HelpArticle;
  accent: string;
  onOpen: (e: SearchEntry) => void;
  onAsk: (title: string) => void;
}) {
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

      <TouchableOpacity onPress={() => onOpen(e)} style={[s.openBtn, { backgroundColor: accent }]} accessibilityRole="button">
        <Text style={s.openText}>Open {e.title}</Text>
        <Icon name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>
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
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 16,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.hair },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, fontSize: 16, color: T.ink, paddingVertical: 8, fontWeight: '600' },
  esc: { borderWidth: 1, borderColor: T.border, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  escText: { fontSize: 11, color: T.muted, fontWeight: '700' },
  contextRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.hair },
  dot: { width: 7, height: 7, borderRadius: 4 },
  contextText: { flexShrink: 1, fontSize: 11.5, color: T.muted, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  chip: { borderWidth: 1, borderColor: T.border, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: T.surface },
  chipText: { fontSize: 11, fontWeight: '700', color: T.ink },
  list: { paddingHorizontal: 8, paddingBottom: 18 },
  section: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: T.muted, paddingHorizontal: 8, paddingTop: 14, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 11, borderWidth: 1, borderColor: 'transparent' },
  rowInner: { flex: 1, minWidth: 0, borderWidth: 0 },
  rowWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: 'transparent', paddingRight: 6 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: T.ink },
  rowTitleMuted: { fontWeight: '500', color: T.muted },
  hl: { fontWeight: '900' },
  rowSub: { fontSize: 11.5, color: T.muted, marginTop: 1 },
  kind: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  kindText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  helpBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
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
  footer: { borderTopWidth: 1, borderTopColor: T.hair, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: T.sub },
  footerText: { fontSize: 11, color: T.muted },
});
