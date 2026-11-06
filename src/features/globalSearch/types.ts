// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/types.ts
// Shared shapes of the Global Search (ERP + Mill Hub).
// ─────────────────────────────────────────────────────────────

/** One right the user must have for an entry to appear. */
export type SearchRequirement = { resource: string; action?: string };

export type SearchEntryKind =
  | 'screen' // a menu screen
  | 'page' // a sub-screen inside a tab folder (reports/real-costing …)
  | 'tab' // a tab / section inside a screen
  | 'card' // a dashboard card / widget
  | 'report' // a report inside a screen
  | 'action' // something you can DO on a screen (Add, Approve, Print …)
  | 'app'; // Settings, Profile …

export type SearchTarget =
  | { type: 'route'; route: string; params?: Record<string, string> }
  | { type: 'mill'; page: string };

export type SearchEntry = {
  id: string;
  kind: SearchEntryKind;
  title: string;
  /** "Menu › Yarn Dyeing" / "Inside Production Orders" … */
  breadcrumb: string;
  icon: string;
  /** Short line under the title. */
  subtitle?: string;
  /** All rights needed (AND). Empty = always available once logged in. */
  requires: SearchRequirement[];
  /** At least ONE of these is also needed (e.g. a card shown for any of its parts). */
  requiresAny?: SearchRequirement[];
  target: SearchTarget;
  /** Words that also find it (synonyms, old names, abbreviations). */
  keywords: string[];
  /** The screen it belongs to (for help / grouping). */
  screenId: string;
  /** Registry order (stable tie-break). */
  order: number;
  /** Help of the screen (curated, registry metadata or built). */
  help?: ScreenHelp;
  /** Permission path of the thing itself (for help: its tabs / actions). */
  resource?: string;
};

/** Plain-language help for one screen (curated or registry metadata). */
export type ScreenHelp = {
  summary: string;
  /** "How to" steps. */
  steps?: string[];
  /** Extra words that should find this screen. */
  keywords?: string[];
  /** Small tips (where data comes from, what a colour means …). */
  tips?: string[];
};

export type HelpArticle = {
  entry: SearchEntry;
  summary: string;
  where: string;
  steps: string[];
  tips: string[];
  /** What the user CAN do there (from his rights). */
  canDo: string[];
  /** What exists but is not given to him. */
  cannotDo: string[];
  /** Tabs / cards / reports inside, the user can open. */
  inside: string[];
};

export type SearchResult = {
  entry: SearchEntry;
  score: number;
  /** [start, end) ranges inside entry.title to highlight. */
  highlight: Array<[number, number]>;
};

export type SearchMode = 'search' | 'help' | 'recent' | 'all' | 'commands';

/** The filter chips: what kind of result to show. */
export type SearchFilter = 'all' | 'screens' | 'tabs' | 'cards' | 'reports' | 'actions';

export type SearchOutcome = {
  mode: SearchMode;
  query: string;
  results: SearchResult[];
  /** results per filter chip (before the chip is applied) */
  counts?: Record<SearchFilter, number>;
  filter?: SearchFilter;
  /** the first result is clearly the one meant (voice "… kholo" may open it at once) */
  confident?: boolean;
  /** In help mode: the best article (+ results list for others). */
  article?: HelpArticle | null;
  /** "Did you mean …" when nothing matched. */
  suggestion?: string | null;
};

/** Written by scripts/build-global-search-index.js. */
export type GeneratedRoute = {
  route: string;
  parentRoute: string;
  title: string;
  subtitle: string;
  requires: SearchRequirement[];
  inheritParent: boolean;
};

export type RightsChecker = {
  canAccess: (resource: string) => boolean;
  canDo: (resource: string, action: string) => boolean;
};
