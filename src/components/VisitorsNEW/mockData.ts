// FILE: src/components/VisitorsNEW/mockData.ts
// ─────────────────────────────────────────────────────────────────────────
// MOCK DATA for the Visitor module (Visits + Visitors Report).
//
// Used only when USE_MOCK = true in api.ts (demo without a server). With
// USE_MOCK = false the Laravel APIs are called and this file is not touched.
//
// The mock behaves like a tiny server:
//   - ~14 months of sample visits are generated up to TODAY, so "Inside now",
//     "Today" and every report range (day / month / year) always have data.
//   - Entries made on the Visits screen are kept on the device (AsyncStorage)
//     and show up in the Visitors Report straight away.
//   - resetMockVisits() restores the sample data.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@/common/utils/compatibleStorage';
import { addDays, startOfDay, uid, Visit } from './model';

const STORE_KEY = 'visitor_mock_visits_v3';

/** Sample staff the visitors come to meet (only to build the sample visits — there is no master). */
const HOSTS: { name: string; dept: string }[] = [
  { name: 'Rakesh Jariwala', dept: 'Sales' },
  { name: 'Hiren Gajera', dept: 'Sales' },
  { name: 'Mehul Kapadia', dept: 'Purchase' },
  { name: 'Dinesh Solanki', dept: 'Office / Accounts' },
  { name: 'Paresh Vaghasiya', dept: 'Weaving' },
  { name: 'Suresh Rathod', dept: 'Knitting' },
  { name: 'Jignesh Tailor', dept: 'Dyeing / Processing' },
  { name: 'Bharat Mistry', dept: 'Maintenance' },
  { name: 'Kalpesh Rana', dept: 'Yarn Store' },
  { name: 'Vipul Dhameliya', dept: 'Fabric Godown / Dispatch' },
  { name: 'Nisha Desai', dept: 'HR / Admin' },
];

/* ------------------------------ sample people ----------------------------- */

type Person = { name: string; mobile: string; company: string; city: string; type: string; designation: string };

const PEOPLE: Person[] = [
  { name: 'Amit Choksi', mobile: '9825011203', company: 'Choksi Textiles', city: 'Surat', type: 'customer', designation: 'Proprietor' },
  { name: 'Ketan Shah', mobile: '9898214455', company: 'Shah Synthetics', city: 'Ahmedabad', type: 'customer', designation: 'Partner' },
  { name: 'Rajesh Agarwal', mobile: '9374512678', company: 'Agarwal Sarees', city: 'Surat', type: 'customer', designation: 'Owner' },
  { name: 'Manoj Bansal', mobile: '9811120987', company: 'Bansal Fabrics', city: 'Delhi', type: 'customer', designation: 'Buyer' },
  { name: 'Farhan Shaikh', mobile: '9820345612', company: 'Royal Dress Material', city: 'Mumbai', type: 'customer', designation: 'Purchase Head' },
  { name: 'Sanjay Patel', mobile: '9727788120', company: 'Shree Yarn Agency', city: 'Surat', type: 'supplier', designation: 'Sales Executive' },
  { name: 'Nilesh Lakhani', mobile: '9909012345', company: 'Lakhani Polyfil', city: 'Surat', type: 'supplier', designation: 'Marketing' },
  { name: 'Prakash Jain', mobile: '9426170033', company: 'Jain Dyes & Chemicals', city: 'Vapi', type: 'supplier', designation: 'Area Manager' },
  { name: 'Yogesh Kabra', mobile: '9328845671', company: 'Kabra Brokers', city: 'Surat', type: 'broker', designation: 'Broker' },
  { name: 'Mahesh Rathi', mobile: '9879256410', company: 'Rathi Agency', city: 'Surat', type: 'broker', designation: 'Agent' },
  { name: 'Ramesh Yadav', mobile: '9724456781', company: 'Shiv Shakti Transport', city: 'Surat', type: 'transport', designation: 'Driver' },
  { name: 'Salim Pathan', mobile: '9106632218', company: 'New Gujarat Roadways', city: 'Surat', type: 'transport', designation: 'Driver' },
  { name: 'Mukesh Prajapati', mobile: '9558870145', company: 'Balaji Tempo Service', city: 'Surat', type: 'transport', designation: 'Driver' },
  { name: 'Ravi Kumar', mobile: '9016673320', company: 'Blue Dart', city: 'Surat', type: 'courier', designation: 'Delivery Boy' },
  { name: 'Imran Malek', mobile: '9265518904', company: 'DTDC', city: 'Surat', type: 'courier', designation: 'Delivery Boy' },
  { name: 'Ashok Vishwakarma', mobile: '9712290346', company: 'Loom Tech Services', city: 'Surat', type: 'technician', designation: 'Service Engineer' },
  { name: 'Deepak Sharma', mobile: '9662041587', company: 'Prime Electricals', city: 'Surat', type: 'technician', designation: 'Electrician' },
  { name: 'Kiran Makwana', mobile: '9537716002', company: '', city: 'Surat', type: 'applicant', designation: '' },
  { name: 'Pooja Rana', mobile: '9173358840', company: '', city: 'Navsari', type: 'applicant', designation: '' },
  { name: 'Vijay Thakkar', mobile: '9824467155', company: 'Thakkar & Co. (CA)', city: 'Surat', type: 'official', designation: 'Audit Assistant' },
  { name: 'Harshad Modi', mobile: '9408823417', company: 'GST Department', city: 'Surat', type: 'official', designation: 'Inspector' },
  { name: 'Bhavesh Gohil', mobile: '9687120564', company: '', city: 'Surat', type: 'guest', designation: '' },
];

const PURPOSE_BY_TYPE: Record<string, string[]> = {
  customer: ['order', 'meeting', 'payment', 'order'],
  supplier: ['meeting', 'payment', 'order'],
  broker: ['order', 'meeting', 'payment'],
  transport: ['delivery', 'pickup', 'delivery'],
  courier: ['courier'],
  technician: ['service'],
  applicant: ['interview'],
  official: ['inspection', 'meeting'],
  guest: ['personal'],
};

const HOSTS_BY_PURPOSE: Record<string, string[]> = {
  order: ['Rakesh Jariwala', 'Hiren Gajera'],
  meeting: ['Rakesh Jariwala', 'Mehul Kapadia', 'Dinesh Solanki', 'Hiren Gajera'],
  payment: ['Dinesh Solanki'],
  delivery: ['Kalpesh Rana', 'Vipul Dhameliya', 'Jignesh Tailor'],
  pickup: ['Vipul Dhameliya'],
  courier: ['Dinesh Solanki', 'Nisha Desai'],
  service: ['Bharat Mistry', 'Paresh Vaghasiya', 'Suresh Rathod'],
  interview: ['Nisha Desai'],
  inspection: ['Dinesh Solanki'],
  personal: ['Paresh Vaghasiya', 'Suresh Rathod'],
};

const NOTES: Record<string, string[]> = {
  order: ['New design samples', 'Repeat order discussion', 'Shade card selection', ''],
  meeting: ['Rate discussion', 'Monthly follow-up', ''],
  payment: ['Cheque collection', 'Outstanding follow-up', ''],
  delivery: ['Yarn cartons', 'Dyes & chemicals', 'Grey taka'],
  pickup: ['Finished fabric dispatch', 'Sample parcel'],
  courier: ['Documents', 'Parcel'],
  service: ['Rapier loom service', 'Panel wiring', 'Knitting machine breakdown'],
  interview: ['Operator vacancy', 'Office assistant vacancy'],
  inspection: ['Quarterly audit', 'Stock verification'],
  personal: [''],
};

/* --------------------------- deterministic random -------------------------- */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
export const makeVisitNo = (d: Date, n: number) =>
  `V-${pad(d.getDate())}${pad(d.getMonth() + 1)}${String(d.getFullYear()).slice(-2)}-${String(n).padStart(3, '0')}`;

/** ~14 months of visits ending today. Same result for the whole day (seeded by date). */
export function generateSeed(now: Date = new Date()): Visit[] {
  const today = startOfDay(now);
  const rand = rng(today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate());
  const one = <X,>(list: X[]): X => list[Math.floor(rand() * list.length)];
  const out: Visit[] = [];

  // ~14 months, so the month-wise and year-wise views of the report have data too
  for (let back = 430; back >= 0; back -= 1) {
    const day = addDays(today, -back);
    const sunday = day.getDay() === 0;
    // recent weeks are busier; older days are lighter to keep the sample small
    const count = sunday ? Math.floor(rand() * 2) + (back <= 35 ? 1 : 0) : back <= 35 ? 4 + Math.floor(rand() * 5) : 1 + Math.floor(rand() * 4);
    // Today: spread the in-times up to "now" (also when the app is opened early
    // in the morning), so "Inside now" and "Went out" both have rows.
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dayStart = back === 0 ? Math.min(8 * 60 + 30, Math.max(0, nowMin - 300)) : 8 * 60 + 30;
    const daySpan = back === 0 ? Math.max(10, nowMin - 3 - dayStart) : 10 * 60;
    const stillInside = new Set<string>(); // nobody is entered twice while still inside
    let serial = 0;

    for (let i = 0; i < count; i += 1) {
      let p = one(PEOPLE);
      // yesterday's first visitor is a technician who was never marked OUT (shows as "inside too long")
      if (back === 1 && i === 0) p = PEOPLE.find((x) => x.type === 'technician') || p;
      for (let tries = 0; tries < 6 && stillInside.has(p.mobile); tries += 1) p = one(PEOPLE);
      if (stillInside.has(p.mobile)) continue;
      const purpose = one(PURPOSE_BY_TYPE[p.type] || ['meeting']);
      const hostName = one(HOSTS_BY_PURPOSE[purpose] || ['Dinesh Solanki']);
      const host = HOSTS.find((h) => h.name === hostName) || HOSTS[0];
      const inMin = dayStart + Math.floor(rand() * daySpan);
      const inAt = new Date(day.getTime() + inMin * 60000);
      const quick = purpose === 'courier' || purpose === 'delivery' || purpose === 'pickup';
      const stay = quick ? 8 + Math.floor(rand() * 50) : 20 + Math.floor(rand() * 170);
      let outAt: Date | null = new Date(inAt.getTime() + stay * 60000);
      // today: whoever would leave after "now" is still inside
      if (outAt.getTime() > now.getTime()) outAt = null;
      if (back === 1 && i === 0) outAt = null;

      const group = !quick && rand() < 0.14;
      const groupId = uid('g');
      const members: Person[] = group ? [p, { ...one(PEOPLE.filter((x) => x.company === p.company || x.type === p.type)), company: p.company, city: p.city }] : [p];
      const unique = members.filter((m, idx) => members.findIndex((x) => x.mobile === m.mobile) === idx && (idx === 0 || !stillInside.has(m.mobile)));
      if (!outAt) unique.forEach((m) => stillInside.add(m.mobile));

      unique.forEach((m, idx) => {
        serial += 1;
        out.push({
          id: uid('v'),
          visitNo: makeVisitNo(day, serial),
          groupId,
          groupSize: unique.length,
          name: m.name,
          mobile: m.mobile,
          altMobile: '',
          designation: m.designation,
          gender: m.name === 'Pooja Rana' ? 'F' : 'M',
          company: m.company,
          purpose,
          purposeNote: one(NOTES[purpose] || ['']),
          hostName: host.name,
          appointment: quick ? '' : rand() < 0.55 ? 'Y' : 'N',
          extraPersons: idx === 0 && p.type === 'transport' && rand() < 0.5 ? 1 : 0,
          remarks: '',
          inAt: inAt.toISOString(),
          outAt: outAt ? outAt.toISOString() : null,
          outRemark: '',
          photos: [],
          prpCode: '',
          createdBy: 'Gate 1 Watchman',
          createdAt: inAt.toISOString(),
          updatedBy: '',
          updatedAt: '',
          checkedOutBy: outAt ? 'Gate 1 Watchman' : '',
        });
      });
    }
  }
  return out;
}

/* ------------------------------ tiny "server" ----------------------------- */

let cache: Visit[] | null = null;
let loading: Promise<Visit[]> | null = null;

async function persist(list: Visit[]) {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify({ savedOn: startOfDay(new Date()).getTime(), list }));
  } catch {
    // Storage full (photos are kept as data: URIs in the mock) — keep the
    // records and drop only the photo bytes so the entry is not lost.
    try {
      const light = list.map((v) => ({ ...v, photos: [] }));
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify({ savedOn: startOfDay(new Date()).getTime(), list: light }));
    } catch {
      // ignore — the in-memory copy still works for this session
    }
  }
}

export async function mockLoad(): Promise<Visit[]> {
  if (cache) return cache;
  if (!loading) {
    loading = (async () => {
      let list: Visit[] | null = null;
      try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && Array.isArray(parsed.list)) {
          list = parsed.list as Visit[];
          // Saved on an earlier day: keep everything that was entered and top
          // up sample visits for the days since, so "Today" is never empty.
          const todayStart = startOfDay(new Date()).getTime();
          if (Number(parsed.savedOn) < todayStart) {
            const from = addDays(new Date(Number(parsed.savedOn)), 1).getTime();
            list = [...list, ...generateSeed().filter((v) => new Date(v.inAt).getTime() >= from)];
          }
        }
      } catch {
        list = null;
      }
      cache = list || generateSeed();
      return cache;
    })();
  }
  return loading;
}

export async function mockSave(list: Visit[]): Promise<void> {
  cache = list;
  await persist(list);
}

export async function resetMockVisits(): Promise<void> {
  cache = generateSeed();
  loading = null;
  try { await AsyncStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
}

/** Fake network delay so loaders / disabled buttons can be seen. */
export const mockDelay = (ms = 350) => new Promise<void>((resolve) => setTimeout(resolve, ms));
