// FILE: src/components/VisitorsNEW/model.ts
// NEW ERP — Visitor Management (gate register).
// Types, choice lists (English + Hindi labels) and pure helpers shared by the
// two screens:
//   - Visits           (src/components/VisitorsNEW/index.tsx)        — watchman entry, English / Hindi
//   - Visitors Report  (src/components/VisitorsReportNEW/index.tsx)  — management report, English only
//
// ONE Visit row = ONE person for ONE visit. People who came together share
// the same `groupId` (the form saves them in one go).

export type Lang = 'en' | 'hi';

export type PhotoKind = 'visitor' | 'card' | 'other';

export type VisitPhoto = {
  id: string;
  kind: PhotoKind;
  /** data: URI (mock) — becomes the server URL once the upload API is live. */
  uri: string;
  takenAt: string; // ISO
};

export type Visit = {
  id: string;
  /** Gate pass / register number shown to people, e.g. V-021026-014. */
  visitNo: string;
  /** Same for everyone who came together in one entry. */
  groupId: string;
  groupSize: number;

  // ---- the person ----
  name: string;
  mobile: string;
  altMobile: string;
  designation: string;
  gender: '' | 'M' | 'F' | 'O';

  company: string;

  // ---- why / whom ----
  purpose: string;
  purposeNote: string;
  hostName: string;
  appointment: '' | 'Y' | 'N';

  /** People who came along but were not entered one by one (helpers, family…). */
  extraPersons: number;
  remarks: string;

  // ---- time ----
  inAt: string;           // ISO
  outAt: string | null;   // ISO, null = still inside
  outRemark: string;

  photos: VisitPhoto[];

  // ---- audit ----
  prpCode: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  checkedOutBy: string;
};

/** What the form edits for ONE person (the rest of the visit is shared). */
export type PersonDraft = {
  key: string;
  name: string;
  mobile: string;
  /** Typed with the mobile and the name; a person added to the same entry starts with the first person's company. */
  company: string;
  altMobile: string;
  designation: string;
  gender: '' | 'M' | 'F' | 'O';
  photos: VisitPhoto[];
};

/** The shared part of an entry. */
export type VisitShared = {
  purpose: string;
  purposeNote: string;
  hostName: string;
  appointment: '' | 'Y' | 'N';
  extraPersons: number;
  remarks: string;
  inAt: string;
};

/** A known visitor (built from past visits) — used for "came before" auto-fill. */
export type VisitorProfile = {
  key: string;
  name: string;
  mobile: string;
  company: string;
  designation: string;
  visits: number;
  lastInAt: string;
  lastHost: string;
  lastPurpose: string;
  photo: string;
};

/**
 * Words already used in earlier visits (NOT a master) — offered as tap-to-fill
 * suggestions under the free-text fields of the form.
 */
export type VisitorSuggestions = { companies: string[]; hosts: string[] };
export const NO_SUGGESTIONS: VisitorSuggestions = { companies: [], hosts: [] };

/* -------------------------------------------------------------------------- */
/* Master lists (value is what is stored; en / hi are only for display)       */
/* -------------------------------------------------------------------------- */

export type Choice = { value: string; en: string; hi: string; icon: string };

export const PURPOSES: Choice[] = [
  { value: 'meeting', en: 'Meeting', hi: 'मिलने आए', icon: 'groups' },
  { value: 'order', en: 'Order / Sample', hi: 'ऑर्डर / सैंपल', icon: 'style' },
  { value: 'delivery', en: 'Material delivery', hi: 'माल देने आए', icon: 'move-to-inbox' },
  { value: 'pickup', en: 'Material pickup', hi: 'माल लेने आए', icon: 'outbox' },
  { value: 'payment', en: 'Payment / Collection', hi: 'पेमेंट / वसूली', icon: 'currency-rupee' },
  { value: 'service', en: 'Repair / Service', hi: 'रिपेयर / सर्विस', icon: 'handyman' },
  { value: 'interview', en: 'Interview', hi: 'इंटरव्यू', icon: 'record-voice-over' },
  { value: 'inspection', en: 'Inspection / Audit', hi: 'जांच / ऑडिट', icon: 'fact-check' },
  { value: 'courier', en: 'Courier', hi: 'कूरियर', icon: 'mail' },
  { value: 'personal', en: 'Personal', hi: 'निजी काम', icon: 'person' },
  { value: 'other', en: 'Other', hi: 'अन्य', icon: 'more-horiz' },
];

export const GENDERS: Choice[] = [
  { value: 'M', en: 'Male', hi: 'पुरुष', icon: 'man' },
  { value: 'F', en: 'Female', hi: 'महिला', icon: 'woman' },
  { value: 'O', en: 'Other', hi: 'अन्य', icon: 'person' },
];

export const PHOTO_KINDS: Choice[] = [
  { value: 'visitor', en: 'Face photo', hi: 'चेहरे की फोटो', icon: 'face' },
  { value: 'card', en: 'Visiting card', hi: 'विज़िटिंग कार्ड', icon: 'contact-mail' },
  { value: 'other', en: 'Other photo', hi: 'अन्य फोटो', icon: 'photo' },
];

/** Inside longer than this (or still inside from an earlier day) = overstay. */
export const OVERSTAY_HOURS = 8;

const pick = (list: Choice[], v: string) => list.find((c) => c.value === v);
export const labelOf = (list: Choice[], v: string, lang: Lang = 'en'): string => {
  const c = pick(list, v);
  if (!c) return v || '';
  return lang === 'hi' ? c.hi : c.en;
};
export const iconOf = (list: Choice[], v: string, fallback = 'label'): string => pick(list, v)?.icon || fallback;

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

export const str = (v: any): string => (v === null || v === undefined ? '' : String(v).trim());
const pad = (n: number) => String(n).padStart(2, '0');

let seq = 0;
/** Local unique id (the server replaces it with its own id on save). */
export const uid = (prefix = 'v'): string => `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/** Keep digits only, max 10 (drops +91 / 0 prefixes typed by habit). */
export const cleanMobile = (v: string): string => {
  let d = str(v).replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
};
export const isMobileOk = (v: string) => v === '' || /^[6-9]\d{9}$/.test(v);
export const fmtMobile = (v: string) => (v.length === 10 ? `${v.slice(0, 5)} ${v.slice(5)}` : v);

/** YYYY-MM-DD of a date in the phone's own time zone. */
export const dayKey = (d: Date | string): string => {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
export const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 02 Oct 2026 */
export const fmtDate = (d: Date | string | null): string => {
  if (!d) return '';
  const x = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(x.getTime())) return '';
  return `${pad(x.getDate())} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
};
/** 02 Oct */
export const fmtDayShort = (d: Date | string): string => {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${pad(x.getDate())} ${MONTHS[x.getMonth()]}`;
};
export const weekdayOf = (d: Date | string): string => WEEKDAYS[(typeof d === 'string' ? new Date(d) : d).getDay()];
/** 09:05 AM */
export const fmtTime = (d: Date | string | null): string => {
  if (!d) return '';
  const x = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(x.getTime())) return '';
  const h = x.getHours();
  return `${pad(h % 12 === 0 ? 12 : h % 12)}:${pad(x.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
};
export const fmtDateTime = (d: Date | string | null): string => (d ? `${fmtDate(d)}, ${fmtTime(d)}` : '');

/** Minutes between in and out (or now when still inside). Never negative. */
export const stayMinutes = (v: Pick<Visit, 'inAt' | 'outAt'>, now: Date = new Date()): number => {
  const a = new Date(v.inAt).getTime();
  const b = v.outAt ? new Date(v.outAt).getTime() : now.getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 60000));
};

export const fmtDuration = (mins: number, lang: Lang = 'en'): string => {
  const m = Math.max(0, Math.round(mins));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const r = m % 60;
  if (lang === 'hi') {
    if (d > 0) return `${d} दिन ${h} घं`;
    if (h > 0) return `${h} घं ${r} मि`;
    return `${r} मिनट`;
  }
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${pad(r)}m`;
  return `${r} min`;
};

export type VisitStatus = 'inside' | 'out' | 'overstay';

export const statusOf = (v: Visit, now: Date = new Date()): VisitStatus => {
  if (v.outAt) return 'out';
  const overnight = dayKey(v.inAt) < dayKey(now);
  return overnight || stayMinutes(v, now) > OVERSTAY_HOURS * 60 ? 'overstay' : 'inside';
};

/** One key per real person: mobile when we have it, else name + company. */
export const visitorKey = (v: Pick<Visit, 'mobile' | 'name' | 'company'>): string =>
  v.mobile ? `m:${v.mobile}` : `n:${str(v.name).toLowerCase()}|${str(v.company).toLowerCase()}`;

export const displayName = (v: Pick<Visit, 'name' | 'mobile'>, lang: Lang = 'en'): string =>
  str(v.name) || (v.mobile ? fmtMobile(v.mobile) : lang === 'hi' ? 'नाम नहीं लिखा' : 'Name not entered');

export const initialsOf = (name: string): string => {
  const parts = str(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

/** First face photo, else first photo of any kind. */
export const facePhoto = (v: Pick<Visit, 'photos'>): string =>
  v.photos.find((p) => p.kind === 'visitor')?.uri || v.photos[0]?.uri || '';

export const searchText = (v: Visit): string =>
  [v.name, v.mobile, v.altMobile, v.company, v.hostName, v.visitNo, v.designation, labelOf(PURPOSES, v.purpose), v.purposeNote,
    v.remarks, v.outRemark]
    .join(' ').toLowerCase();

export const matches = (v: Visit, query: string): boolean => {
  const q = str(query).toLowerCase();
  if (!q) return true;
  const hay = searchText(v);
  return q.split(/\s+/).every((w) => hay.includes(w));
};

/* ------------------------------- form drafts ------------------------------ */

export const emptyPerson = (company = ''): PersonDraft => ({
  key: uid('p'), name: '', mobile: '', company, altMobile: '', designation: '', gender: '', photos: [],
});

export const emptyShared = (): VisitShared => ({
  purpose: '', purposeNote: '', hostName: '', appointment: '', extraPersons: 0, remarks: '', inAt: new Date().toISOString(),
});

/** Open an existing visit in the form (edit). */
export const toDraft = (v: Visit): { person: PersonDraft; shared: VisitShared } => ({
  person: {
    key: v.id, name: v.name, mobile: v.mobile, company: v.company, altMobile: v.altMobile, designation: v.designation,
    gender: v.gender, photos: v.photos,
  },
  shared: {
    purpose: v.purpose, purposeNote: v.purposeNote, hostName: v.hostName, appointment: v.appointment,
    extraPersons: v.extraPersons, remarks: v.remarks, inAt: v.inAt,
  },
});

/** A person row is "blank" when the watchman added it but typed nothing (the company alone is pre-filled, so it does not count). */
export const isBlankPerson = (p: PersonDraft): boolean =>
  !str(p.name) && !p.mobile && !p.photos.length && !str(p.designation) && !p.altMobile;

/** Body of ONE visit as sent to the add / edit API (see api.ts). */
export type VisitPayload = Omit<Visit, 'id' | 'visitNo' | 'groupId' | 'groupSize' | 'outAt' | 'outRemark' | 'prpCode'
  | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt' | 'checkedOutBy'>;

export const buildPayloads = (people: PersonDraft[], shared: VisitShared): VisitPayload[] =>
  people.filter((p) => !isBlankPerson(p)).map((p, i) => ({
    name: str(p.name), mobile: p.mobile, altMobile: p.altMobile, designation: str(p.designation), gender: p.gender,
    company: str(p.company),
    purpose: shared.purpose, purposeNote: str(shared.purposeNote), hostName: str(shared.hostName), appointment: shared.appointment,
    // people who came along without their own entry are counted once, on the first person
    extraPersons: i === 0 ? shared.extraPersons : 0,
    remarks: str(shared.remarks), inAt: shared.inAt,
    photos: p.photos,
  }));

/** Build visitor profiles (newest details win) from a list of visits. */
export const buildProfiles = (visits: Visit[]): VisitorProfile[] => {
  const map = new Map<string, VisitorProfile>();
  [...visits].sort((a, b) => (a.inAt < b.inAt ? 1 : -1)).forEach((v) => {
    if (!str(v.name) && !v.mobile) return;
    const key = visitorKey(v);
    const cur = map.get(key);
    if (cur) {
      cur.visits += 1;
      if (!cur.photo) cur.photo = facePhoto(v);
      if (!cur.company) cur.company = v.company;
      return;
    }
    map.set(key, {
      key, name: v.name, mobile: v.mobile, company: v.company, designation: v.designation, visits: 1,
      lastInAt: v.inAt, lastHost: v.hostName, lastPurpose: v.purpose, photo: facePhoto(v),
    });
  });
  return Array.from(map.values());
};

/** Most used words of earlier visits per field (most frequent first). */
export const buildSuggestions = (visits: Visit[], limit = 40): VisitorSuggestions => {
  const top = (pickValue: (v: Visit) => string): string[] => {
    const count = new Map<string, number>();
    visits.forEach((v) => { const x = str(pickValue(v)); if (x) count.set(x, (count.get(x) || 0) + 1); });
    return Array.from(count.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([x]) => x);
  };
  return {
    companies: top((v) => v.company),
    hosts: top((v) => v.hostName),
  };
};

/** Suggestions that match what is typed (starts-with first), without the exact same text. */
export const suggestFor = (list: string[], typed: string, max = 5): string[] => {
  const q = str(typed).toLowerCase();
  const pool = list.filter((x) => x.toLowerCase() !== q);
  if (!q) return pool.slice(0, max);
  const starts = pool.filter((x) => x.toLowerCase().startsWith(q));
  const inside = pool.filter((x) => !x.toLowerCase().startsWith(q) && x.toLowerCase().includes(q));
  return [...starts, ...inside].slice(0, max);
};
