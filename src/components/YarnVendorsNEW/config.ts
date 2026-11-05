// ─────────────────────────────────────────────────────────────
// FILE: src/components/YarnVendorsNEW/config.ts
//
// App-side settings of the Yarn Vendors AI search.
//
// The screen sends ONLY two values to the ERP backend:
//   POST {API}/api/yarn-vendors-chat   { item, city }   (Bearer token) — see ./api.ts
// Both may hold several values separated by commas ("A, B" / "Surat, Mumbai").
// The question Claude is asked, the strict rules, the model, web search and the
// API key all live on the backend (config/yarnvendorschat.php, .env). The app
// can not ask anything else.
// ─────────────────────────────────────────────────────────────

/** Backend endpoint (appended to the ERP API host). */
export const SEARCH_ENDPOINT = '/api/yarn-vendors-chat';

/** A web search answer is slow: the backend may work for up to ~4 minutes. */
export const SEARCH_TIMEOUT_MS = 260000;

/** Same limits as the backend (config/yarnvendorschat.php). */
export const MAX_ITEMS = 5;
export const MAX_CITIES = 5;
/** Longest single value. */
export const MAX_ITEM_CHARS = 80;
export const MAX_CITY_CHARS = 50;
/** Longest text of a whole box (all values + commas). */
export const MAX_ITEM_BOX_CHARS = MAX_ITEMS * (MAX_ITEM_CHARS + 2);
export const MAX_CITY_BOX_CHARS = MAX_CITIES * (MAX_CITY_CHARS + 2);

/**
 * "A, B ,, a" -> ['A', 'B'] — same splitting as the backend: ONLY a comma separates
 * two values (an item name may contain any other character), empty parts and
 * repeats are dropped.
 */
export function splitList(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  (text || '').split(',').forEach((part) => {
    const one = part.replace(/\s+/g, ' ').trim();
    const key = one.toLowerCase();
    if (!one || seen.has(key)) return;
    seen.add(key);
    out.push(one);
  });
  return out;
}

/** Tap-to-fill examples under the item box. */
export const ITEM_EXAMPLES = ['150 Denier Polyester FDY', '30s Cotton Combed Yarn', 'Viscose Filament Yarn 120D', 'Nylon 6 Yarn 70D'];

/** Company line on the Excel file. */
export const COMPANY = 'MADHUSUDHAN FABRICS';
