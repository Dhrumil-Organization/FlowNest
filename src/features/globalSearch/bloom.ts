// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/bloom.ts
// Bloom-filter pre-check for the Global Search.
//
// Every entry gets two tiny bit-sets when the index is built (once per login):
//
//   bloom  (2048 bits, 3 hashes) — word starts, whole words, word stems,
//          sound keys and initials of the title / keywords / menu place
//   grams  (exact 37×37 bit-set) — every 2-letter pair of those words
//
// For a query word we ask the bit-sets "can this entry POSSIBLY match?" —
// a few AND operations instead of running typo / edit-distance scoring on
// every entry. A bloom filter never says "no" to a real match (no false
// negatives), it only sometimes says "maybe" to a non-match; those few are
// then scored normally. So the results are EXACTLY the same as scoring
// everything — just much less work per keystroke.
// ─────────────────────────────────────────────────────────────
import { initials, soundKey, stem, synonymsOf, tokenize } from './searchText';

const BLOOM_BITS = 2048;
const BLOOM_WORDS = BLOOM_BITS / 32;
const ALPHA = 37; // a-z, 0-9, + 1 spare
const GRAM_WORDS = Math.ceil((ALPHA * ALPHA) / 32);
const PREFIX_MAX = 8;

/** FNV-1a, two seeds → double hashing (k = 3) */
function hashes(feature: string): [number, number, number] {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < feature.length; i += 1) {
    const c = feature.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995);
  }
  a >>>= 0;
  b = (b | 1) >>> 0;
  return [a % BLOOM_BITS, (a + b) % BLOOM_BITS, (a + 2 * b) % BLOOM_BITS];
}

const setBit = (bits: Uint32Array, i: number) => {
  bits[i >>> 5] |= 1 << (i & 31);
};
const hasBit = (bits: Uint32Array, i: number) => (bits[i >>> 5] & (1 << (i & 31))) !== 0;

function code(ch: string): number {
  const c = ch.charCodeAt(0);
  if (c >= 97 && c <= 122) return c - 97;
  if (c >= 48 && c <= 57) return 26 + c - 48;
  return 36;
}
/** UNORDERED letter pair at i, i+1 ("gr" = "rg"): a swapped-letter typo
 *  ("gery" / "grey", "veiw" / "view") still shares the swapped pair. */
const gramIndex = (w: string, i: number) => {
  const x = code(w[i]);
  const y = code(w[i + 1]);
  return x < y ? x * ALPHA + y : y * ALPHA + x;
};

export type EntryFilter = { bloom: Uint32Array; grams: Uint32Array };

/** the feature hashes of one query word: ANY hit = maybe a match */
export type TokenProbe = {
  hashes: Array<[number, number, number]>;
  /** 2-letter pairs of the word + how many must be there (typos / "contains") */
  grams: number[];
  need: number;
};

/** Build the bit-sets of one entry from the words that can decide a match. */
export function buildEntryFilter(words: readonly string[], titleWords: readonly string[], title: string): EntryFilter {
  const bloom = new Uint32Array(BLOOM_WORDS);
  const grams = new Uint32Array(GRAM_WORDS);
  const add = (f: string) => {
    for (const h of hashes(f)) setBit(bloom, h);
  };
  for (const w of new Set(words)) {
    if (!w) continue;
    add(`w:${w}`);
    for (let L = 1; L <= Math.min(PREFIX_MAX, w.length); L += 1) add(`p:${w.slice(0, L)}`);
    if (w.length >= 4) add(`p:${stem(w).slice(0, PREFIX_MAX)}`);
    for (let i = 0; i + 1 < w.length; i += 1) setBit(grams, gramIndex(w, i));
    if (w.length >= 3) {
      const k = soundKey(w);
      for (let L = 3; L <= k.length; L += 1) add(`s:${k.slice(0, L)}`);
    }
  }
  // initials ("pot" → Production Order Tracking) — all starts of it
  const ini = initials(title);
  for (let L = 2; L <= ini.length; L += 1) add(`i:${ini.slice(0, L)}`);
  void titleWords;
  return { bloom, grams };
}

function inBloom(bits: Uint32Array, h: [number, number, number]) {
  return hasBit(bits, h[0]) && hasBit(bits, h[1]) && hasBit(bits, h[2]);
}

/** Every way the scorer could match this query word, as bloom features. */
export function probeToken(t: string): TokenProbe {
  const features = new Set<string>();
  features.add(`p:${t.slice(0, PREFIX_MAX)}`);
  if (t.length >= 4) {
    features.add(`p:${stem(t).slice(0, PREFIX_MAX)}`);
    // the typed word is LONGER than the word in the title ("authorization" → "auth")
    for (let L = 3; L < t.length; L += 1) features.add(`w:${t.slice(0, L)}`);
  }
  if (t.length >= 3) {
    const k = soundKey(t);
    if (k.length >= 3) features.add(`s:${k}`);
  }
  for (const alt of synonymsOf(t)) for (const a of tokenize(alt)) features.add(`p:${a.slice(0, PREFIX_MAX)}`);

  const grams: number[] = [];
  let need = 0;
  if (t.length >= 3) {
    const seen = new Set<number>();
    for (let i = 0; i + 1 < t.length; i += 1) seen.add(gramIndex(t, i));
    grams.push(...seen);
    // "contains" needs all pairs; a typo (1 or 2 edits) can break up to 3 per edit
    const limit = t.length >= 7 ? 2 : t.length >= 4 ? 1 : 0;
    need = Math.max(1, grams.length - 3 * limit);
  }
  return { hashes: Array.from(features, hashes), grams, need };
}

export function probeInitials(compact: string): [number, number, number] {
  return hashes(`i:${compact}`);
}

/** Can this entry possibly match this query word? */
export function mayMatchToken(f: EntryFilter, probe: TokenProbe): boolean {
  for (const h of probe.hashes) if (inBloom(f.bloom, h)) return true;
  if (probe.need > 0) {
    let have = 0;
    for (const g of probe.grams) {
      if (hasBit(f.grams, g)) {
        have += 1;
        if (have >= probe.need) return true;
      }
    }
  }
  return false;
}

export function mayMatchInitials(f: EntryFilter, h: [number, number, number]): boolean {
  return inBloom(f.bloom, h);
}
