// FILE: src/features/support/bloom.ts
// Search Bloom filter — the SAME algorithm as the server (app/Services/Support/SupportBloom.php):
// two 32-bit FNV-1a hashes of the UTF-8 bytes, double hashing, k positions in m bits.
//
// The IT Desk downloads the filter of every card's search words (and word beginnings) once.
// While typing, each word is checked here first:
//   "definitely not in any card" -> show "No match" at once, no server call
//   "maybe"                      -> ask the server (the real search)
// A Bloom filter never answers "not there" for a word that was added, so it can never hide a result.
// After any live change the filter is treated as stale until it is downloaded again.

const utf8 = (s: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
};

const fnv = (bytes: number[], basis: number) => {
  let h = basis >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeBase64(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = b64.indexOf(clean[i]), b = b64.indexOf(clean[i + 1]);
    const c = i + 2 < clean.length ? b64.indexOf(clean[i + 2]) : -1;
    const d = i + 3 < clean.length ? b64.indexOf(clean[i + 3]) : -1;
    const n = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    out[o++] = (n >> 16) & 255;
    if (c >= 0 && o < out.length) out[o++] = (n >> 8) & 255;
    if (d >= 0 && o < out.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

/** splits text into words: letters (+ vowel signs) and digits of any script — same rule as the server */
export const WORD_SPLIT: RegExp = (() => {
  try {
    return new RegExp('[^\\p{L}\\p{M}\\p{N}]+', 'u');
  } catch {
    // very old JS engines without Unicode property escapes: Latin + Indian scripts
    return /[^0-9A-Za-z\u00C0-\u024F\u0900-\u0DFF]+/;
  }
})();

/** search words: lower case, 2+ characters (same as the server) */
export const searchWords = (text: string) => {
  const seen = new Set<string>();
  for (const w of String(text || '').toLowerCase().split(WORD_SPLIT)) if (Array.from(w).length >= 2) seen.add(w);
  return Array.from(seen);
};

export class Bloom {
  m: number;
  k: number;
  bits: Uint8Array;
  maxPrefix: number;
  constructor(m: number, k: number, bits: Uint8Array, maxPrefix = 16) {
    this.m = m;
    this.k = k;
    this.bits = bits;
    this.maxPrefix = maxPrefix;
  }
  static fromPayload(p: { m: number; k: number; bits: string; max_prefix?: number }) {
    return new Bloom(p.m, p.k, decodeBase64(p.bits), p.max_prefix || 16);
  }
  positions(word: string) {
    const bytes = utf8(word);
    const h1 = fnv(bytes, 2166136261);
    const h2 = (fnv(bytes, 2654435769) | 1) >>> 0;
    const out: number[] = [];
    for (let i = 0; i < this.k; i++) out.push((h1 + i * h2) % this.m);
    return out;
  }
  mayContain(word: string) {
    for (const p of this.positions(word)) if ((this.bits[p >> 3] & (1 << (p & 7))) === 0) return false;
    return true;
  }
  /** the filter stores word beginnings up to maxPrefix characters -> a longer typed word is checked by its beginning */
  mayContainWordStart(word: string) {
    const chars = Array.from(word);
    return this.mayContain(chars.length <= this.maxPrefix ? word : chars.slice(0, this.maxPrefix).join(''));
  }
  /** false = the query cannot match any card (every word must start some card word) */
  mayMatch(query: string) {
    const q = String(query || '').trim();
    if (/^#?\s*(?:t[ks]\s*-?\s*)?\d{1,12}$/i.test(q)) return true; // ticket numbers are checked by the server
    const words = searchWords(q).slice(0, 8);
    if (!words.length) return true;
    return words.every((w) => this.mayContainWordStart(w));
  }
}
