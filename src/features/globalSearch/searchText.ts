// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/searchText.ts
// Text matching for the Global Search — pure functions, no React.
//
//   • every word of the query must be found (in the title, keywords, menu
//     folder, sub-title or help text), with the title counting most
//   • a word may be the START of a word ("prod" → Production), a typo
//     ("febric" → Fabric, "recievable" → Receivables) or an ABBREVIATION
//     ("pot" → Production Order Tracking, "so" → Sales Order)
//   • ERP / textile synonyms: "approve" finds "… Auth", "customer" finds
//     "Party", "greige" finds "Grey" …
// ─────────────────────────────────────────────────────────────

/** Words that never decide a match ("how do I open sales order" = "sales order"). */
const STOP = new Set([
  'a', 'an', 'the', 'to', 'of', 'for', 'in', 'on', 'at', 'my', 'me', 'i', 'is', 'are', 'and', 'or',
  'how', 'do', 'does', 'can', 'what', 'where', 'which', 'who', 'show', 'open', 'go', 'goto', 'find',
  'screen', 'page', 'please', 'want', 'with', 'from', 'it', 'this', 'that', 'there', 'about',
  'ka', 'ki', 'ke', 'kaise', 'kya', 'kahan', 'kaha', 'hai', 'hain', 'mein', 'me',
  // Hinglish (typed or spoken): "mujhe yarn ka stock dekhna hai", "sales order kholo"
  'mujhe', 'muje', 'mereko', 'hume', 'humko', 'dekhna', 'dekhni', 'dekhne', 'dekho', 'dikhao', 'dikha', 'dikhado',
  'karo', 'karna', 'karni', 'kar', 'karke', 'de', 'dena', 'wala', 'wali', 'wale', 'chahiye', 'plz', 'pls',
  'ek', 'jo', 'se', 'par', 'pe', 'liye', 'ko', 'aur', 'ya', 'abhi', 'kholo', 'khol', 'kholna', 'kholiye',
  'jao', 'chalo', 'le', 'lo', 'ji', 'bhai', 'bhaiya', 'sir', 'yaar', 'please', 'zara', 'jara',
]);

/**
 * Each group = words that mean the same thing to a user. Matching a synonym
 * counts a little less than matching the typed word itself.
 */
const SYNONYM_GROUPS: string[][] = [
  ['auth', 'authorization', 'authorisation', 'authorize', 'approve', 'approval', 'approvals', 'verify', 'accept', 'reject', 'pending'],
  ['party', 'customer', 'client', 'buyer', 'account', 'debtor'],
  ['vendor', 'supplier', 'creditor', 'seller'],
  ['receivable', 'receivables', 'outstanding', 'due', 'dues', 'udhar', 'baki', 'baaki', 'bakaya', 'collection'],
  ['payable', 'payables', 'payment', 'payments', 'pay', 'creditor'],
  ['collection', 'receipt', 'received', 'collect'],
  ['fabric', 'febric', 'cloth', 'kapda', 'taka', 'roll'],
  ['grey', 'gray', 'greige', 'griege'],
  ['yarn', 'dhaga', 'thread', 'poy', 'fdy', 'filament'],
  ['stock', 'inventory', 'balance', 'godown', 'maal'],
  ['warehouse', 'godown', 'location', 'store'],
  ['rate', 'rates', 'price', 'pricing', 'cost', 'bhav'],
  ['order', 'orders', 'po', 'so'],
  ['sales', 'sale', 'sell', 'selling', 'dispatch', 'billing', 'invoice', 'challan'],
  ['purchase', 'purchases', 'buy', 'buying', 'procurement'],
  ['entry', 'add', 'new', 'create', 'make', 'enter'],
  ['edit', 'modify', 'change', 'update', 'correct'],
  ['delete', 'remove', 'cancel'],
  ['report', 'reports', 'analysis', 'summary', 'register', 'mis'],
  ['dashboard', 'home', 'overview', 'kpi'],
  ['tracking', 'track', 'status', 'follow'],
  ['print', 'printing', 'sticker', 'label', 'labels', 'pdf'],
  ['scan', 'scanner', 'qr', 'barcode'],
  ['beam', 'warp', 'warping'],
  ['weft', 'bana', 'pick', 'picks'],
  ['creel', 'carton', 'cartons', 'cone', 'cones'],
  ['dyeing', 'dye', 'dyed', 'colour', 'color', 'shade', 'shades', 'mill', 'process'],
  ['design', 'designs', 'catalog', 'catalogue', 'quality'],
  ['salary', 'wages', 'labour', 'labor', 'payroll'],
  ['expense', 'expenses', 'kharcha', 'spend'],
  ['electricity', 'power', 'bijli', 'torrent', 'units'],
  ['coal', 'boiler', 'steam', 'fuel'],
  ['inquiry', 'enquiry', 'lead', 'leads', 'quotation', 'quote'],
  ['visitor', 'visitors', 'visit', 'visits', 'gate', 'watchman', 'security'],
  ['target', 'targets', 'goal'],
  ['merge', 'merging', 'lot'],
  ['production', 'manufacturing', 'weaving', 'loom', 'looms', 'machine', 'machines'],
  ['doff', 'doffing'],
  ['sample', 'samples', 'sampling'],
  ['settings', 'setting', 'preferences', 'theme', 'dark'],
  ['profile', 'user', 'account'],
  ['permission', 'permissions', 'rights', 'role', 'roles', 'access'],
  ['credit', 'limit', 'credit limit'],
  // Hindi / Hinglish words people say
  ['new', 'naya', 'nayi', 'naye'],
  ['payment', 'bhugtan', 'jama'],
  ['collection', 'vasooli', 'vasuli', 'ugrahi'],
  ['ledger', 'khata', 'hisab', 'hisaab'],
  ['colour', 'rang'],
  ['salary', 'tankhwah', 'pagar', 'vetan'],
  ['purchase', 'kharid', 'kharidi'],
  ['sales', 'bikri', 'bechna'],
  ['approve', 'manjuri', 'manjoor', 'pass'],
  ['visitor', 'mehman', 'aagantuk'],
  ['machine', 'mashin', 'loom'],
  ['report', 'riport'],
];

const SYN = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) {
    const set = SYN.get(word) || new Set<string>();
    for (const other of group) if (other !== word) set.add(other);
    SYN.set(word, set);
  }
}

// ── Devanagari → Latin ─────────────────────────────────────
// Voice in Hindi (and many Android keyboards) writes English ERP words in
// Devanagari: "यार्न स्टॉक", "प्रोडक्शन ऑर्डर". They are turned into Latin
// letters here; soundKey() below then matches "stok" ~ "stock",
// "prodakshan" ~ "production".
const DEV_CONS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'f', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l', 'क़': 'q', 'ख़': 'kh', 'ग़': 'g', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f',
};
const DEV_VOWEL: Record<string, string> = {
  'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऋ': 'ri', 'ऑ': 'o', 'ऍ': 'e',
};
const DEV_MATRA: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ृ': 'ri', 'ॉ': 'o', 'ॅ': 'e',
};
const DEV_RE = /[\u0900-\u097f]/;
const isDevLetter = (c: string | undefined) => !!c && (c in DEV_CONS || c in DEV_VOWEL || c in DEV_MATRA || c === '्' || c === '़');

export function transliterate(text: string): string {
  if (!DEV_RE.test(text)) return text;
  const chars = Array.from(text.normalize('NFC'));
  let out = '';
  for (let i = 0; i < chars.length; i += 1) {
    let c = chars[i];
    if (chars[i + 1] === '़' && DEV_CONS[c + '़']) {
      c += '़';
      i += 1;
    }
    if (DEV_CONS[c]) {
      out += DEV_CONS[c];
      const next = chars[i + 1];
      if (next && DEV_MATRA[next]) {
        out += DEV_MATRA[next];
        i += 1;
      } else if (next === '्') {
        i += 1; // no vowel
      } else if (isDevLetter(next)) {
        out += 'a'; // inherent vowel (dropped at the end of a word)
      }
    } else if (DEV_VOWEL[c]) out += DEV_VOWEL[c];
    else if (DEV_MATRA[c]) out += DEV_MATRA[c];
    else if (c === 'ं' || c === 'ँ') out += 'n';
    else if (c === 'ः') out += 'h';
    else if (c >= '०' && c <= '९') out += String(c.charCodeAt(0) - 0x0966);
    else if (c === '।') out += ' ';
    else if (!DEV_RE.test(c)) out += c;
  }
  return out;
}

/**
 * How a word SOUNDS (consonant skeleton): "stock"/"stok"/"स्टॉक" → "stk",
 * "production"/"prodakshan" → "prdkshn", "fabric"/"febric"/"फैब्रिक" → "fbrk".
 */
export function soundKey(word: string): string {
  let w = word.toLowerCase();
  w = w
    .replace(/tion|sion|shan|shun/g, 'shn')
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/([a-z])\1+/g, '$1');
  // keep the first letter, drop vowels / y / h after it, collapse repeats
  return ((w[0] || '') + w.slice(1).replace(/[aeiouyh]/g, '')).replace(/([a-z])\1+/g, '$1');
}

/** lower-case, Hindi letters → Latin, accents / punctuation removed, "&" → "and", single spaces. */
export function normalize(value: unknown): string {
  return transliterate(String(value ?? ''))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/([a-z])([0-9])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokenize(value: unknown): string[] {
  const n = normalize(value);
  return n ? n.split(' ') : [];
}

/** Query words that decide the match (stop words dropped unless nothing else is left). */
export function queryTokens(query: string): string[] {
  const all = tokenize(query);
  const meaningful = all.filter((t) => !STOP.has(t));
  return meaningful.length ? meaningful : all;
}

export function synonymsOf(token: string): string[] {
  const direct = SYN.get(token);
  if (direct) return Array.from(direct);
  // "approvals" → "approval" / "orders" → "order"
  if (token.length > 3 && token.endsWith('s')) {
    const single = SYN.get(token.slice(0, -1));
    if (single) return [token.slice(0, -1), ...Array.from(single)];
  }
  return [];
}

const synMemo = new Map<string, string[]>();
/** the synonym WORDS of a query word (tokenized once, then remembered) */
export function synonymWords(token: string): string[] {
  let v = synMemo.get(token);
  if (!v) {
    v = synonymsOf(token).flatMap(tokenize);
    if (synMemo.size > 3000) synMemo.clear();
    synMemo.set(token, v);
  }
  return v;
}

/** Damerau-Levenshtein distance, stops early above `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = new Array(b.length + 1).fill(0);
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur: number[] = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    for (let j = 0; j <= b.length; j += 1) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

/** How well ONE query word matches ONE word of the entry (0 … 1). */
/** "sampling" / "samples" / "sampled" → "sampl" (same word, other ending). */
const stemMemo = new Map<string, string>();
export function stem(w: string): string {
  if (w.length <= 4) return w;
  let v = stemMemo.get(w);
  if (v === undefined) {
    v = w.replace(/(ings|ing|ers|er|ies|es|ed|s|e)$/, '') || w;
    if (stemMemo.size > 6000) stemMemo.clear();
    stemMemo.set(w, v);
  }
  return v;
}

export function wordScore(q: string, w: string): number {
  if (!q || !w) return 0;
  if (q === w) return 1;
  if (q.length >= 4 && w.length >= 4 && stem(q) === stem(w)) return 0.92;
  if (w.startsWith(q)) return q.length >= 2 ? 0.86 : 0.45;
  if (q.length >= 4 && q.startsWith(w) && w.length >= 3) return 0.7; // "authorization" typed, "auth" in title
  if (q.length >= 3 && w.includes(q)) return 0.55;
  if (q.length >= 4 && w.length >= 3) {
    const limit = q.length >= 7 ? 2 : 1;
    // compare with the same-length start too ("recievab" vs "receivables")
    const d = Math.min(editDistance(q, w, limit), editDistance(q, w.slice(0, q.length), limit));
    if (d <= limit) return d === 1 ? 0.62 : 0.46;
  }
  return 0;
}

/** Initials of the words: "Production Order Tracking" → "pot". */
export function initials(value: string): string {
  return tokenize(value)
    .filter((t) => !STOP.has(t))
    .map((t) => t[0])
    .join('');
}

/** Best score of a query word against a list of entry words (+ synonyms). */
export function bestWordScore(q: string, words: readonly string[]): number {
  let best = 0;
  for (const w of words) {
    const s = wordScore(q, w);
    if (s > best) best = s;
    if (best === 1) return 1;
  }
  if (best >= 0.86) return best;
  // synonyms count only when they match exactly or as a word start — a typo of
  // a synonym ("gate" ~ "rate") is never a match
  for (const altWord of synonymWords(q)) {
    {
      for (const w of words) {
        const s = (w === altWord ? 1 : altWord.length >= 3 && w.startsWith(altWord) ? 0.86 : 0) * 0.8;
        if (s > best) best = s;
      }
    }
  }
  return best;
}

/** Ranges in `title` to highlight for these query words (word starts only). */
export function highlightRanges(title: string, tokens: readonly string[]): Array<[number, number]> {
  const lower = title.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const t of tokens) {
    if (t.length < 1) continue;
    let from = 0;
    while (from < lower.length) {
      const i = lower.indexOf(t, from);
      if (i < 0) break;
      const atWordStart = i === 0 || !/[a-z0-9]/.test(lower[i - 1]);
      if (atWordStart) {
        ranges.push([i, i + t.length]);
        break;
      }
      from = i + 1;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}
