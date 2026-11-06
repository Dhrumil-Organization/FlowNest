// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/searchEngine.ts
//
// Query → results.  Pure (no React), works the same for the ERP index and
// the Mill Hub index.
//
//   "yarn stock"        normal search (screens first, then tabs, pages, actions)
//   "/help"             how to use the search + the screens you can open
//   "/help yarn stock"  help for that screen (what it does, how, your rights)
//   "? yarn stock", "help yarn stock", "how to add collection"  → same as /help
//   "/recent"           screens you opened from the search lately
//   "/all"              every screen you can open
//   "/"                 the list of commands
// ─────────────────────────────────────────────────────────────
import { kindLabel } from './erpIndex';
import {
  bestWordScore,
  editDistance,
  highlightRanges,
  initials,
  normalize,
  queryTokens,
  tokenize,
} from './searchText';
import type {
  HelpArticle,
  RightsChecker,
  SearchEntry,
  SearchEntryKind,
  SearchMode,
  SearchOutcome,
  SearchResult,
} from './types';

export type PreparedEntry = {
  entry: SearchEntry;
  title: string[];
  keywords: string[];
  breadcrumb: string[];
  extra: string[];
  initials: string;
  titleNorm: string;
};

export type PreparedIndex = {
  entries: PreparedEntry[];
  byId: Map<string, PreparedEntry>;
  vocabulary: string[];
};

const KIND_BOOST: Record<SearchEntryKind, number> = {
  screen: 0.32,
  page: 0.26,
  app: 0.12,
  card: 0.16,
  report: 0.18,
  tab: 0.15,
  action: 0.06,
};

export const COMMANDS = [
  { cmd: '/help', title: 'Help', hint: 'How the search works, or /help <screen> to learn a screen' },
  { cmd: '/recent', title: 'Recent', hint: 'Screens you opened from the search lately' },
  { cmd: '/all', title: 'All my screens', hint: 'Every screen your rights allow' },
] as const;

export function prepareIndex(entries: readonly SearchEntry[]): PreparedIndex {
  const prepared: PreparedEntry[] = entries.map((entry) => ({
    entry,
    title: tokenize(entry.title),
    keywords: Array.from(new Set(entry.keywords.flatMap(tokenize))),
    // the kind counts like the menu place: "orders tab", "monthly report card"
    breadcrumb: [...tokenize(entry.breadcrumb.replace(/^(Menu|In|Action in)\b/, '')), ...tokenize(kindLabel(entry.kind))],
    extra: Array.from(
      new Set([...tokenize(entry.subtitle || ''), ...tokenize(entry.help?.summary || '')]),
    ),
    initials: initials(entry.title),
    titleNorm: normalize(entry.title),
  }));
  const vocab = new Set<string>();
  for (const p of prepared) for (const w of [...p.title, ...p.keywords]) if (w.length >= 3) vocab.add(w);
  return { entries: prepared, byId: new Map(prepared.map((p) => [p.entry.id, p])), vocabulary: Array.from(vocab) };
}

type Parsed = { mode: SearchMode; text: string };

const HELP_PREFIX = /^(\/help\b|\/h(?=\s|$)|\/\?|\?|help\b|how\s+to\b|how\s+do\s+i\b|how\s+can\s+i\b|what\s+is\b|what\s+does\b|kaise\b|madad\b)\s*/i;

export function parseQuery(raw: string): Parsed {
  const q = String(raw || '').replace(/\s+/g, ' ').trimStart();
  const t = q.trim();
  if (!t) return { mode: 'recent', text: '' };
  if (t === '/') return { mode: 'commands', text: '' };
  if (/^\/(recent|r)\b/i.test(t)) return { mode: 'recent', text: t.replace(/^\/\S+\s*/, '') };
  if (/^\/(all|a|screens)\b/i.test(t)) return { mode: 'all', text: t.replace(/^\/\S+\s*/, '') };
  const help = t.match(HELP_PREFIX);
  if (help) return { mode: 'help', text: t.slice(help[0].length) };
  if (t.startsWith('/')) {
    // a half-typed command ("/he") → show the command list
    const word = t.slice(1).toLowerCase();
    if (COMMANDS.some((c) => c.cmd.slice(1).startsWith(word))) return { mode: 'commands', text: word };
    return { mode: 'search', text: t.slice(1) };
  }
  return { mode: 'search', text: t };
}

function scoreEntry(p: PreparedEntry, tokens: string[], phrase: string): number {
  if (!tokens.length) return 0;
  let total = 0;
  let missed = 0;
  for (const t of tokens) {
    const s = Math.max(
      bestWordScore(t, p.title) * 1.0,
      bestWordScore(t, p.keywords) * 0.72,
      bestWordScore(t, p.breadcrumb) * 0.5,
      bestWordScore(t, p.extra) * 0.34,
    );
    if (s < 0.4) {
      missed += 1;
      continue;
    }
    total += s;
  }
  // every word must match; a long question may miss one filler word
  const allowedMiss = tokens.length >= 4 ? 1 : 0;
  if (missed > allowedMiss) {
    // whole query typed as initials: "pot" → Production Order Tracking
    const compact = tokens.join('');
    if (compact.length >= 2 && p.initials.startsWith(compact) && tokens.length === 1) return 0.9 + KIND_BOOST[p.entry.kind];
    return 0;
  }
  let score = total / tokens.length;
  if (p.titleNorm === phrase) score += 1.1;
  else if (p.titleNorm.startsWith(phrase)) score += 0.6;
  else if (phrase.length >= 3 && p.titleNorm.includes(phrase)) score += 0.35;
  if (tokens.length === 1 && tokens[0].length >= 2 && p.initials === tokens[0]) score += 0.5;
  score += KIND_BOOST[p.entry.kind] || 0;
  score -= missed * 0.25;
  return score;
}

export type SearchOptions = {
  /** entry ids, most recent first */
  recents?: readonly string[];
  limit?: number;
  rights?: RightsChecker;
  /** The index BEFORE the rights filter: lets help say which actions of an
   *  allowed screen are not given to this user ("ask your admin"). Never used
   *  to show a screen the user cannot open. */
  unfiltered?: readonly SearchEntry[];
};

function toResult(p: PreparedEntry, score: number, tokens: string[]): SearchResult {
  return { entry: p.entry, score, highlight: highlightRanges(p.entry.title, tokens) };
}

function rank(index: PreparedIndex, text: string, opts: SearchOptions): SearchResult[] {
  const tokens = queryTokens(text);
  const phrase = normalize(text);
  const recentRank = new Map((opts.recents || []).map((id, i) => [id, i]));
  const out: SearchResult[] = [];
  for (const p of index.entries) {
    let s = scoreEntry(p, tokens, phrase);
    if (s <= 0) continue;
    const r = recentRank.get(p.entry.id);
    if (r !== undefined) s += Math.max(0, 0.3 - r * 0.03);
    out.push(toResult(p, s, tokens));
  }
  out.sort((a, b) => b.score - a.score || a.entry.order - b.entry.order || a.entry.title.localeCompare(b.entry.title));
  // one screen should not flood the list with its own actions
  const perScreen = new Map<string, number>();
  const trimmed: SearchResult[] = [];
  for (const r of out) {
    if (r.entry.kind === 'action') {
      const n = perScreen.get(r.entry.screenId) || 0;
      if (n >= 4) continue;
      perScreen.set(r.entry.screenId, n + 1);
    }
    trimmed.push(r);
  }
  return trimmed.slice(0, opts.limit ?? 40);
}

function didYouMean(index: PreparedIndex, text: string): string | null {
  const tokens = queryTokens(text);
  if (!tokens.length) return null;
  const fixed: string[] = [];
  let changed = false;
  for (const t of tokens) {
    let best = t;
    let bestD = 3;
    for (const w of index.vocabulary) {
      if (Math.abs(w.length - t.length) > 2) continue;
      const d = editDistance(t, w, 2);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    }
    if (best !== t) changed = true;
    fixed.push(best);
  }
  return changed ? fixed.join(' ') : null;
}

const screensFirst = (a: SearchEntry, b: SearchEntry) =>
  (a.kind === 'screen' ? 0 : 1) - (b.kind === 'screen' ? 0 : 1) || a.order - b.order || a.title.localeCompare(b.title);

export function runSearch(index: PreparedIndex, raw: string, opts: SearchOptions = {}): SearchOutcome {
  const parsed = parseQuery(raw);
  const query = raw;

  if (parsed.mode === 'commands') return { mode: 'commands', query, results: [] };

  if (parsed.mode === 'recent' || parsed.mode === 'all') {
    if (parsed.text) {
      const results = rank(index, parsed.text, opts).filter((r) => parsed.mode === 'all' || (opts.recents || []).includes(r.entry.id));
      return { mode: parsed.mode, query, results };
    }
    let list: SearchEntry[];
    if (parsed.mode === 'recent') {
      list = (opts.recents || []).map((id) => index.byId.get(id)?.entry).filter(Boolean) as SearchEntry[];
      // nothing recent yet → the user's screens
      if (!list.length) list = index.entries.map((p) => p.entry).filter((e) => e.kind === 'screen').sort(screensFirst).slice(0, 12);
    } else {
      list = index.entries.map((p) => p.entry).filter((e) => e.kind === 'screen' || e.kind === 'page' || e.kind === 'app').sort(screensFirst);
    }
    return { mode: parsed.mode, query, results: list.map((entry) => ({ entry, score: 0, highlight: [] })) };
  }

  if (parsed.mode === 'help') {
    if (!parsed.text.trim()) {
      const screens = index.entries.map((p) => p.entry).filter((e) => e.kind === 'screen').sort(screensFirst);
      return { mode: 'help', query, results: screens.map((entry) => ({ entry, score: 0, highlight: [] })), article: null };
    }
    const results = rank(index, parsed.text, opts);
    // help is about a SCREEN: prefer the screen / page the best hit belongs to
    const top = results[0]?.entry;
    let target: SearchEntry | undefined = top;
    if (top && !['screen', 'page', 'app'].includes(top.kind)) {
      target = index.byId.get(top.screenId)?.entry || top;
    }
    const article = target ? buildHelpArticle(index, target, opts.unfiltered, top) : null;
    return {
      mode: 'help',
      query,
      results: results.filter((r) => r.entry.id !== target?.id).slice(0, 12),
      article,
      suggestion: results.length ? null : didYouMean(index, parsed.text),
    };
  }

  const results = rank(index, parsed.text, opts);
  return { mode: 'search', query, results, suggestion: results.length ? null : didYouMean(index, parsed.text) };
}

/** Everything a user needs to know about one screen, from what he is allowed to do there. */
export function buildHelpArticle(
  index: PreparedIndex,
  entry: SearchEntry,
  unfiltered?: readonly SearchEntry[],
  focus?: SearchEntry,
): HelpArticle {
  const siblings = index.entries.map((p) => p.entry).filter((e) => e.screenId === entry.screenId && e.id !== entry.id);
  const actions = siblings.filter((e) => e.kind === 'action');
  const inside = siblings.filter((e) => e.kind !== 'action' && e.kind !== 'screen');
  const help = entry.help;

  // the index is already rights-filtered → every action listed is allowed.
  const canDo = Array.from(new Set(actions.map((a) => a.title.replace(/\s·\s.*$/, ''))));
  const allowedIds = new Set(siblings.map((e) => e.id));
  const cannotDo = Array.from(
    new Set(
      (unfiltered || [])
        .filter((e) => e.kind === 'action' && e.screenId === entry.screenId && !allowedIds.has(e.id))
        .map((a) => a.title.replace(/\s·\s.*$/, ''))
        .filter((t) => !canDo.includes(t)),
    ),
  );

  const steps: string[] = help?.steps?.length
    ? help.steps
    : autoSteps(entry, inside, canDo);

  const tips = [...(help?.tips || [])];
  if (focus && focus.id !== entry.id) {
    tips.unshift(`"${focus.title}" is ${articleFor(focus.kind)} ${kindLabel(focus.kind).toLowerCase()} ${focus.breadcrumb.replace(/^In /, 'in ').replace(/^Action in /, 'in ')}.`);
  }

  return {
    entry,
    summary: help?.summary || entry.subtitle || autoSummary(entry, inside),
    where: whereText(entry),
    steps,
    tips,
    canDo,
    cannotDo,
    inside: inside.map((e) => e.title),
  };
}

const articleFor = (kind: SearchEntryKind) => (kind === 'action' ? 'an' : 'a');

function whereText(e: SearchEntry): string {
  if (e.kind === 'app') return 'Header buttons (⚙ Settings / your initials) or this search.';
  if (e.kind === 'screen') {
    const folder = e.breadcrumb.replace(/^Menu\s*›?\s*/, '');
    return folder
      ? `Menu › ${folder} › ${e.title} (bottom bar "More" on phones, sidebar on desktop) — or straight from this search.`
      : `Menu › ${e.title} (bottom bar / "More" on phones, sidebar on desktop) — or straight from this search.`;
  }
  return `${e.breadcrumb} — open it straight from this search.`;
}

function autoSummary(e: SearchEntry, inside: SearchEntry[]): string {
  const parts = inside.slice(0, 6).map((x) => x.title);
  if (e.kind === 'screen') return parts.length ? `${e.title}: ${parts.join(', ')}${inside.length > 6 ? ' …' : ''}.` : `The ${e.title} screen.`;
  return `${e.title} (${kindLabel(e.kind).toLowerCase()}) ${e.breadcrumb.replace(/^In /, 'in ')}.`;
}

function autoSteps(e: SearchEntry, inside: SearchEntry[], canDo: string[]): string[] {
  const steps = [`Open ${e.title} from this search (tap the result) or from the menu.`];
  const tabs = inside.filter((x) => x.kind === 'tab').map((x) => x.title);
  const cards = inside.filter((x) => x.kind === 'card').map((x) => x.title);
  const reports = inside.filter((x) => x.kind === 'report' || x.kind === 'page').map((x) => x.title);
  if (tabs.length) steps.push(`Pick the tab you need: ${tabs.slice(0, 6).join(', ')}.`);
  if (cards.length) steps.push(`Tap a card to drill down: ${cards.slice(0, 6).join(', ')}.`);
  if (reports.length) steps.push(`Reports here: ${reports.slice(0, 6).join(', ')}.`);
  if (canDo.length) steps.push(`You can: ${canDo.slice(0, 8).join(', ')}.`);
  return steps;
}
