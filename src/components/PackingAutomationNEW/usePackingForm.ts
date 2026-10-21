// FILE: src/components/PackingAutomationNEW/usePackingForm.ts
// All state + rules of the Packing Automation flow, kept out of the screens.
//
// Fixes carried over from the web screen (PackingAutomation.jsx) — do NOT
// reintroduce these:
//   • Production type is ONE code. The web joined a party's types into
//     "LC,DM", then looked for a carton whose type was exactly "LC,DM", found
//     none, and still printed. Here the operator picks exactly one (auto-picked
//     when only one is possible) and the carton is looked up for that one.
//   • Choosing a new route card / party / production type clears everything
//     that depended on the old choice (reducer below), and a slow response for
//     an old choice can never overwrite a newer one (sequence guards).
//   • The carton-weight check BLOCKS printing (web showed a warning, then
//     printed anyway on "Generate QR").
//   • One print path, one printer: the selected one (web "Generate QR" used a
//     hard-coded MR_LABEL printer).
//   • A print in flight cannot be started again (no double labels).
//   • Cones / copies must be whole numbers > 0 (web could send NaN totals).
//   • Nothing writes into state while rendering (web set carno / stktype /
//     rpatti inside value={…}).
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as A from './api';
import type { Api, Carton, Ctx, Row } from './api';

/** A party of the route card's plan. `rows` = all its plan rows (one per production type when the server splits them). */
export type Party = { parcode: string; parname: string; prodtypes: string[]; raw: Row; rows: Row[] };
export type Pick = { code: string; name: string };
export type Step = 1 | 2 | 3 | 4;

export type Form = {
  defaults: Row; // prodpackingshow → main[0]
  route: Row | null; // the route card picked from the list (prodpackinghelp row)
  party: Party | null;
  cartons: Carton[]; // planned cartons for the party
  prodtype: string; // exactly ONE code; '' = not chosen yet
  carton: Carton | null; // the planned carton for `prodtype`
  masterCarWt: number | null; // master empty-carton weight (web ncarwt)
  carwt: string; // empty-carton weight, editable, ≤ master
  carwtEdited: boolean; // true once the operator typed a weight — then it is kept when the production type changes
  grade: Pick | null;
  gradeBal: A.GradeBalance | null; // graded vs packed for this grade (web totbalpcs / totbalwt)
  merge: Pick | null;
  smarka: string; // shipping marka
  printno: string;
  nocones: string;
  noprint: string; // label copies
  rpatti: 'Y' | 'N';
  printer: string;
};

export const DEFAULT_PRINT_NO = '22'; // web default when the field is left empty
export const MAX_COPIES = 50;

const initial = (keep?: Partial<Form>): Form => ({
  defaults: {},
  route: null,
  party: null,
  cartons: [],
  prodtype: '',
  carton: null,
  masterCarWt: null,
  carwt: '',
  carwtEdited: false,
  grade: null,
  gradeBal: null,
  merge: null,
  smarka: '',
  printno: DEFAULT_PRINT_NO,
  nocones: '',
  noprint: '1',
  rpatti: 'Y',
  printer: '',
  ...(keep || {}),
});

/* ------------------------------ helpers ------------------------------ */

const str = (v: any) => (v === null || v === undefined ? '' : String(v).trim());
/** First non-empty value among `keys` of `row`. */
export const pick = (row: Row | null | undefined, ...keys: string[]) => {
  for (const k of keys) {
    const v = str(row?.[k]);
    if (v) return v;
  }
  return '';
};
export const splitTypes = (v: any): string[] => {
  const list = Array.isArray(v) ? v : String(v ?? '').split(',');
  return Array.from(new Set(list.map((s) => String(s).trim()).filter(Boolean)));
};
export const isWhole = (v: string) => /^\d+$/.test(v.trim());
export const num = (v: string) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

/** A route card row (prodpackinghelp) in the shape the screens use. */
export function routeRowView(row: Row | null | undefined) {
  return {
    routeNo: pick(row, 'productionvouno'),
    date: pick(row, 'productionvoudate'),
    machine: pick(row, 'macname', 'maccode'),
    itmcode: pick(row, 'itmcode'),
    itmname: pick(row, 'itmname'),
    shdcode: pick(row, 'shdcode'),
    shdname: pick(row, 'shdname'),
    denier: pick(row, 'denier'),
    parname: pick(row, 'parname'),
    // Web help grid: "Sub Merge" = the card's merge; "Main Merge" = its main / planned merge.
    subMerge: pick(row, 'mername', 'submername', 'MerName'),
    mainMerge: pick(row, 'mainmername', 'mainmerge', 'mmername', 'plnmername', 'mername'),
  };
}

/** Every text / number on a route card row, upper-cased, for searching (catches any column the help grid shows). */
export function routeSearchText(row: Row): string {
  return Object.values(row || {})
    .filter((v) => typeof v === 'string' || typeof v === 'number')
    .map((v) => String(v).toUpperCase())
    .join(' | ');
}

/** The route card fields the screens show; reads both route row and form defaults like the web did. */
export function routeView(f: Form) {
  const r = { ...f.defaults, ...(f.route || {}) };
  const stk = pick(r, 'stktype') || 'I';
  return {
    routeNo: pick(f.route, 'productionvouno'),
    date: pick(f.route, 'productionvoudate'),
    machine: pick(f.route, 'macname', 'maccode'),
    planuid: r.planninguid ?? r.planuid,
    prcuid: pick(r, 'productionuid', 'prcuid'),
    itmcode: pick(r, 'itmcode'),
    itmname: pick(r, 'itmname'),
    shdcode: pick(r, 'shdcode'),
    shdname: pick(r, 'shdname'),
    denier: pick(r, 'denier'),
    cheeswt: leadZero(pick(r, 'cheeswt')),
    stktype: stk,
    stkLabel: stk === 'P' ? 'Process house' : 'In house',
    raw: r,
  };
}

/**
 * The planning party list sends the name with the production types glued on,
 * e.g. "VASTRAANG TAXFAB PRIVATE LIMITED-PT,PB". That suffix is not part of the
 * party name: it would print "-PT,PB" on a label packed as PT only. Strip a
 * trailing "-<codes>" only when those codes are this party's production types,
 * so a real hyphen in a name is never touched.
 */
export function cleanPartyName(name: string, types: string[]): string {
  const n = String(name ?? '').trim();
  const m = n.match(/^(.*?)\s*-\s*([A-Za-z0-9]+(?:\s*,\s*[A-Za-z0-9]+)*)\s*$/);
  if (!m || !types.length) return n;
  const suffix = splitTypes(m[2]).map((t) => t.toUpperCase());
  const own = types.map((t) => t.toUpperCase());
  return suffix.length && suffix.every((t) => own.includes(t)) ? m[1].trim() : n;
}

export const normParty = (row: Row, rows?: Row[]): Party => {
  const parcode = pick(row, 'acccode', 'parcode');
  const mine = (rows || []).filter((r) => pick(r, 'acccode', 'parcode') === parcode);
  const all = mine.length ? mine : [row];
  const prodtypes = splitTypes(all.flatMap((r) => splitTypes(r?.prodtype)));
  return {
    parcode,
    parname: cleanPartyName(pick(row, 'accountname', 'accname', 'parname', 'name'), prodtypes),
    prodtypes,
    raw: row,
    rows: all,
  };
};

/**
 * One carton per production type. Planning may plan ONE carton for several
 * types together (e.g. "PT,PB" = Plastic Tube + Plastic Bottom → one carton).
 * That carton is valid for each of those types, so it is split into one entry
 * per type. The label still always gets exactly ONE type (the one chosen).
 */
export const expandCartons = (list: Carton[]): Carton[] =>
  list.flatMap((c) => splitTypes(c.prodtype).map((t) => ({ ...c, prodtype: t })));

/** Cartons from the party rows (web PartySelect set carcode / carname from the chosen row). */
export function partyCartons(p: Party): Carton[] {
  return expandCartons(p.rows
    .filter((r) => pick(r, 'cartoncode') && splitTypes(r.prodtype).length > 0)
    .map((r) => ({ prodtype: String(r.prodtype ?? ''), carcode: pick(r, 'cartoncode'), carname: pick(r, 'cartonname'), raw: r })));
}

/** Adds the leading zero the server leaves out: ".165" → "0.165", "-.5" → "-0.5". Other text unchanged. */
export const leadZero = (v: any): string => {
  const t = String(v ?? '').trim();
  return /^-?\.\d+$/.test(t) ? t.replace(/^(-?)\./, '$10.') : t;
};

/** Paper tube weight: from the party row for the chosen production type (web), else the route card. */
export function tubeWt(f: Form): string {
  const rows = f.party?.rows || [];
  const forType = rows.find((r) => f.prodtype && splitTypes(r.prodtype).includes(f.prodtype) && pick(r, 'cheeswt'));
  return leadZero(pick(forType, 'cheeswt') || pick(f.party?.raw, 'cheeswt') || routeView(f).cheeswt);
}

/**
 * Production type names. The label always carries the CODE (e.g. M); screens show the name.
 * Names come from the party / carton rows when the server sends one; this list fills the gaps.
 * TODO: replace with the production type master once ProductionProdTypeDataNew's API is known.
 */
export const PRODTYPE_NAMES: Record<string, string> = {
  M: 'Market',
};

export function prodTypeName(code: string, f: { party: Party | null; cartons: Carton[] }): string {
  if (!code) return '';
  const rows = [...(f.party?.rows || []), ...f.cartons.map((c) => c.raw)];
  for (const r of rows) {
    if (splitTypes(r?.prodtype).length === 1 && splitTypes(r?.prodtype)[0] === code) {
      const n = pick(r, 'prodtypename', 'prodtypedesc', 'ProdTypeName', 'ProdTypeDesc', 'prodname');
      if (n) return n;
    }
  }
  return PRODTYPE_NAMES[code.toUpperCase()] || '';
}

/** True when both rows are the same route card. */
export const isSameRoute = (a: Row | null | undefined, b: Row | null | undefined) =>
  !!a && !!b && pick(a, 'productionuid') === pick(b, 'productionuid') && pick(a, 'productionvouno') === pick(b, 'productionvouno');

/** Production type choices: the party's types, each matched to its planned carton (or disabled). */
export function prodTypeChoices(f: Form) {
  const types = f.party?.prodtypes.length ? f.party.prodtypes : splitTypes(f.cartons.map((c) => c.prodtype));
  return types.map((code) => {
    const carton = f.cartons.find((c) => c.prodtype === code) || null;
    // All types stay selectable; a type with no planned carton is caught by validation.
    return { code, carton, disabled: false };
  });
}

/* ------------------------------ reducer ------------------------------ */

type Act =
  | { t: 'defaults'; main: Row }
  | { t: 'route'; route: Row }
  | { t: 'party'; party: Party; cartons: Carton[] }
  | { t: 'prodtype'; code: string }
  | { t: 'masterWt'; wt: number }
  | { t: 'grade'; v: Pick }
  | { t: 'gradeBal'; v: A.GradeBalance | null; code: string; prcuid: string }
  | { t: 'merge'; v: Pick }
  | { t: 'set'; k: 'smarka' | 'printno' | 'nocones' | 'noprint' | 'carwt' | 'printer'; v: string }
  | { t: 'rpatti'; v: 'Y' | 'N' }
  | { t: 'newRoute' }
  | { t: 'reset' };

function reducer(s: Form, a: Act): Form {
  switch (a.t) {
    case 'defaults':
      return { ...s, defaults: a.main, smarka: s.smarka || str(a.main.smarka), rpatti: str(a.main.rpatti) === 'N' ? 'N' : s.rpatti };
    case 'route': {
      // New route card → everything chosen for the old one goes.
      const mercode = pick(a.route, 'mercode');
      return {
        ...s,
        route: a.route,
        party: null, cartons: [], prodtype: '', carton: null, masterCarWt: null, carwt: '', carwtEdited: false,
        // Like the web, the card's own grade and merge are filled in (still changeable).
        grade: pick(a.route, 'grdcode') ? { code: pick(a.route, 'grdcode'), name: pick(a.route, 'grdname') } : null,
        gradeBal: null,
        merge: mercode ? { code: mercode, name: pick(a.route, 'mername') } : null,
        smarka: str(s.defaults.smarka),
        nocones: '', // cones were counted for a box of the old card
        // kept: printer, label copies, Requir patti, print no. (set-up, not card data)
      };
    }
    case 'party':
      // New party → its production type, carton and grade must be chosen again.
      return { ...s, party: a.party, cartons: a.cartons, prodtype: '', carton: null, masterCarWt: null, carwt: '', carwtEdited: false };
    case 'prodtype': {
      // The empty carton weight has nothing to do with the production type:
      // a weight the operator typed is kept (e.g. 1.35 stays when M → P).
      // Only an auto-filled master weight is refreshed for the new carton.
      const carton = s.cartons.find((c) => c.prodtype === a.code) || null;
      return { ...s, prodtype: a.code, carton, masterCarWt: null, carwt: s.carwtEdited ? s.carwt : '' };
    }
    case 'masterWt':
      return { ...s, masterCarWt: a.wt, carwt: s.carwtEdited ? s.carwt : String(a.wt) };
    case 'grade':
      return { ...s, grade: a.v, gradeBal: s.grade?.code === a.v.code ? s.gradeBal : null };
    case 'gradeBal':
      // Applied only if the same route card AND grade are still chosen (no stale balance after a change).
      return s.grade?.code === a.code && pick(s.route, 'productionuid', 'prcuid') === a.prcuid ? { ...s, gradeBal: a.v } : s;
    case 'merge':
      return { ...s, merge: a.v };
    case 'set':
      return a.k === 'carwt' ? { ...s, carwt: a.v, carwtEdited: true } : { ...s, [a.k]: a.v };
    case 'rpatti':
      return { ...s, rpatti: a.v };
    case 'newRoute':
      // Keep the print set-up and form defaults; clear the route and all that hangs off it.
      return initial({ defaults: s.defaults, printer: s.printer, noprint: s.noprint, rpatti: s.rpatti, smarka: str(s.defaults.smarka) });
    case 'reset':
      return initial({ printer: s.printer });
    default:
      return s;
  }
}

const EMPTY_DATA: A.RouteData = { main: [], d1: [], d2: [] };

/* ------------------------------ validation ------------------------------ */

export type Errors = Partial<Record<
  'facility' | 'route' | 'party' | 'prodtype' | 'carton' | 'carwt' | 'grade' | 'merge' | 'smarka' | 'printno' | 'nocones' | 'noprint' | 'printer',
  string
>>;

export function validate(f: Form, ctx: Ctx, step: Step): Errors {
  const e: Errors = {};
  if (step >= 1) {
    if (!ctx.prpcode || !ctx.yearno || !ctx.strcode) e.facility = 'Choose the facility, year and store.';
    if (!f.route) e.route = 'Choose a route card from the list.';
  }
  if (step >= 2) {
    if (!f.party) e.party = 'Choose the party.';
    else if (!f.prodtype) e.prodtype = f.party.prodtypes.length > 1
      ? `This party has ${f.party.prodtypes.length} production types. Tap the one being packed.`
      : 'Choose the production type.';
    else if (!isSingleProdType(f.prodtype) || !prodTypeChoices(f).some((c) => c.code === f.prodtype)) {
      e.prodtype = 'Choose exactly one production type.';
    }
    else if (!f.carton) e.prodtype = 'No carton is planned for this production type.';
    if (f.carton) {
      const w = num(f.carwt);
      if (f.masterCarWt === null) e.carwt = 'Carton weight is still loading.';
      else if (!Number.isFinite(w) || w < 0) e.carwt = 'Enter the empty carton weight.';
      else if (w > f.masterCarWt) e.carwt = `Cannot be more than the master carton weight (${f.masterCarWt}).`;
    }
    if (!f.grade) e.grade = f.party ? 'Choose the grade.' : 'Choose the party first.';
    if (!f.merge) e.merge = 'Choose the merge.';
    if (!isWhole(f.printno)) e.printno = 'Print no. must be a number.';
  }
  if (step >= 3) {
    if (!isWhole(f.nocones) || parseInt(f.nocones, 10) < 1) e.nocones = 'Enter the number of cones (1 or more).';
    if (!isWhole(f.noprint) || parseInt(f.noprint, 10) < 1 || parseInt(f.noprint, 10) > MAX_COPIES) e.noprint = `Copies must be 1–${MAX_COPIES}.`;
    if (!f.printer) e.printer = 'Choose a printer.';
  }
  return e;
}

function assertSingleProdType(v: string): string {
  if (!isSingleProdType(v)) throw new Error(`Production type must be one code, not "${v || 'empty'}". Choose it on Details.`);
  return v.trim();
}

/** One production type code: non-empty, no comma / list (never "B,M,SS"). */
export const isSingleProdType = (v: string) => !!v && splitTypes(v).length === 1 && splitTypes(v)[0] === v.trim() && !/[,;|/\s]/.test(v.trim());

/** Label data — same keys the web sent to /api/print-qr-label, with the fixes above. */
export function buildLabel(f: Form, ctx: Ctx, userId: string): Row {
  const r = routeView(f);
  const v = r.raw;
  const tube = tubeWt(f) || '0';
  const cheeswt = num(tube);
  const cones = parseInt(f.nocones, 10);
  const totchees = Number.isFinite(cheeswt) && Number.isFinite(cones) ? (cheeswt * cones).toFixed(3) : '0.000';
  return {
    rpatti: f.rpatti,
    PrpCode: ctx.prpcode,
    YearNo: ctx.yearno,
    StrCode: ctx.strcode,
    uid: r.prcuid, // web: prcuid = the route card's productionuid
    productionvouno: str(v.productionvouno),
    itmcode: r.itmcode,
    itmname: r.itmname,
    shdcode: r.shdcode,
    shdname: r.shdname,
    grdcode: f.grade?.code || '',
    grdname: f.grade?.name || '',
    mercode: f.merge?.code || '',
    mername: f.merge?.name || '',
    denier: r.denier,
    parcode: f.party?.parcode || '',
    parname: f.party?.parname || '',
    smarka: f.smarka.trim(),
    printno: f.printno.trim() || DEFAULT_PRINT_NO,
    noprint: parseInt(f.noprint, 10) || 1,
    carno: f.carton?.carcode || '',
    carname: f.carton?.carname || '',
    carwt: f.carwt || '0',
    ncarwt: String(f.masterCarWt ?? 0),
    prodtype: assertSingleProdType(f.prodtype), // ONE code, or this throws and nothing prints
    prodtype1: f.prodtype, // web sent the same selected type here
    stktype: r.stktype,
    cheeswt: tube,
    nocones: String(cones || 0),
    totchees,
    printer: f.printer,
    userid: userId,
  };
}

/* ------------------------------ hook ------------------------------ */

type Busy = { defaults?: boolean; routes?: boolean; parties?: boolean; party?: boolean; carton?: boolean; print?: boolean };
type Problems = { defaults?: string; routes?: string; parties?: string; party?: string; carton?: string; print?: string };
export type PrintResult = { printed: number; at: number; label: Row; copies: number };

export function usePackingForm(api: Api, ctx: Ctx, userId: string) {
  const [f, dispatch] = useReducer(reducer, undefined, () => initial());
  const [routeData, setRouteData] = useState<A.RouteData>(EMPTY_DATA);
  const [partyList, setPartyList] = useState<Row[]>([]); // parties of the chosen route card's plan
  const [busy, setBusy] = useState<Busy>({});
  const [problem, setProblem] = useState<Problems>({});
  const [lastPrint, setLastPrint] = useState<PrintResult | null>(null);

  // Latest state for async callbacks (never read stale values after an await).
  const fRef = useRef(f);
  fRef.current = f;
  // One counter per chain: a response is applied only if it is still the newest request.
  const seq = useRef({ defaults: 0, routes: 0, parties: 0, party: 0, carton: 0 });
  const printing = useRef(false);
  const partyListRef = useRef<Row[]>([]);

  const flag = (k: keyof Busy, v: boolean) => setBusy((b) => ({ ...b, [k]: v }));
  const fail = (k: keyof Problems, msg?: string) => setProblem((p) => ({ ...p, [k]: msg }));

  /** Route cards open for packing (web ProductionPackingHelpData). */
  const loadRoutes = useCallback(async (uid: any) => {
    const id = ++seq.current.routes;
    flag('routes', true); fail('routes');
    try {
      const data = await A.fetchRouteCards(api, ctx, uid);
      if (id === seq.current.routes) setRouteData(data);
    } catch (e) {
      if (id === seq.current.routes) { setRouteData(EMPTY_DATA); fail('routes', A.apiErrorText(e, 'Route cards could not be loaded.')); }
    } finally {
      if (id === seq.current.routes) flag('routes', false);
    }
  }, [api, ctx]);

  // Form defaults for the facility (web SoShow('0')), then its route card list.
  useEffect(() => {
    if (!ctx.prpcode || !ctx.yearno || !ctx.strcode) return;
    const id = ++seq.current.defaults;
    dispatch({ t: 'reset' });
    setRouteData(EMPTY_DATA);
    seq.current.parties++; setPartyList([]); partyListRef.current = [];
    flag('defaults', true); fail('defaults');
    A.showPacking(api, ctx)
      .then(({ main }) => {
        if (id !== seq.current.defaults) return;
        dispatch({ t: 'defaults', main });
        loadRoutes(main.uid);
      })
      .catch((e) => { if (id === seq.current.defaults) fail('defaults', A.apiErrorText(e, 'Packing form could not be loaded.')); })
      .finally(() => { if (id === seq.current.defaults) flag('defaults', false); });
  }, [api, ctx.prpcode, ctx.yearno, ctx.strcode]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCartonWeight = useCallback(async (party: Party, carton: Carton | null) => {
    const id = ++seq.current.carton;
    fail('carton');
    if (!carton) return;
    flag('carton', true);
    try {
      const wt = await A.fetchCartonWeight(api, ctx, party.parcode, carton.carcode);
      if (id === seq.current.carton) dispatch({ t: 'masterWt', wt });
    } catch (e) {
      if (id === seq.current.carton) fail('carton', A.apiErrorText(e, 'Carton weight could not be loaded.'));
    } finally {
      if (id === seq.current.carton) flag('carton', false);
    }
  }, [api, ctx]);

  const chooseProdType = useCallback((code: string) => {
    const cur = fRef.current;
    if (!cur.party) return;
    const carton = cur.cartons.find((c) => c.prodtype === code) || null;
    dispatch({ t: 'prodtype', code });
    loadCartonWeight(cur.party, carton);
  }, [loadCartonWeight]);

  /**
   * Choose a party row (from the plan's party list). `list` / `planuid` are passed
   * when called in the same tick as the route choice (state not updated yet).
   */
  const chooseParty = useCallback(async (row: Row, list?: Row[], planuid?: any, explicit = false) => {
    const party = normParty(row, list ?? partyListRef.current);
    if (!party.parcode) return;
    const id = ++seq.current.party;
    seq.current.carton++;
    flag('party', true); fail('party'); fail('carton');
    try {
      const planned = expandCartons(await A.fetchPlannedCartons(api, ctx, party.parcode, planuid ?? routeView(fRef.current).planuid));
      if (id !== seq.current.party) return;
      // Planned cartons first; the party rows' own cartons fill any type the plan lacks.
      const cartons = [...planned, ...partyCartons(party).filter((c) => !planned.some((p) => p.prodtype === c.prodtype))];
      dispatch({ t: 'party', party, cartons });
      // Pre-select ONLY when there is nothing to choose:
      //  • the party has exactly one production type, or
      //  • the operator tapped a party row that is itself for one type (explicit choice).
      // A party with several types (e.g. B,M,SS) picked automatically from the route card
      // is NEVER defaulted — the web did that and saved "B,M,SS" on cartons.
      const own = splitTypes(row.prodtype);
      const code = party.prodtypes.length === 1 ? party.prodtypes[0] : explicit && own.length === 1 ? own[0] : '';
      if (code) {
        dispatch({ t: 'prodtype', code });
        loadCartonWeight(party, cartons.find((c) => c.prodtype === code) || null);
      }
    } catch (e) {
      if (id === seq.current.party) fail('party', A.apiErrorText(e, 'Planned cartons could not be loaded.'));
    } finally {
      if (id === seq.current.party) flag('party', false);
    }
  }, [api, ctx, loadCartonWeight]);

  /** Web GradeSelect: after a grade is picked (store ≠ 001), load graded vs packed for it. */
  const loadGradeBalance = useCallback(async (grdcode: string, mercode: string, productionuid: any) => {
    if (!grdcode || ctx.strcode === '001') return;
    try {
      const v = await A.fetchGradeBalance(api, ctx, { productionuid, grdcode, mercode });
      dispatch({ t: 'gradeBal', v, code: grdcode, prcuid: str(productionuid) });
    } catch { /* balance is information only */ }
  }, [api, ctx]);

  const chooseGrade = useCallback((row: Row) => {
    const code = pick(row, 'GrdCode', 'grdcode', 'code');
    dispatch({ t: 'grade', v: { code, name: pick(row, 'GrdName', 'grdname', 'name') } });
    const cur = fRef.current;
    loadGradeBalance(code, cur.merge?.code || '', routeView(cur).prcuid);
  }, [loadGradeBalance]);

  /** Pick a route card from the list. Like the web, its party (when it has one) is filled in too. */
  const chooseRoute = useCallback((row: Row) => {
    if (isSameRoute(fRef.current.route, row)) return; // same card picked again → keep what was entered
    // New card: drop anything still loading for the old one, then start again from its data.
    seq.current.party++; seq.current.carton++; seq.current.parties++;
    setProblem((p) => ({ routes: p.routes, defaults: p.defaults }));
    setLastPrint(null);
    dispatch({ t: 'route', route: row });
    // The card carries a grade code only; look up its name for display.
    const grd = pick(row, 'grdcode');
    if (grd && !pick(row, 'grdname')) {
      A.fetchGrades(api, ctx, pick(row, 'productionuid')).then((list) => {
        const g = list.find((x) => pick(x, 'GrdCode', 'grdcode') === grd);
        if (g && fRef.current.route === row && fRef.current.grade?.code === grd) {
          dispatch({ t: 'grade', v: { code: grd, name: pick(g, 'GrdName', 'grdname') } });
        }
      }).catch(() => undefined);
    }
    if (grd) loadGradeBalance(grd, pick(row, 'mercode'), pick(row, 'productionuid'));
    // Parties of this card's plan (web PartySelect). The card's own party is picked from that list.
    const planuid = row.planninguid ?? row.planuid;
    const id = ++seq.current.parties;
    setPartyList([]); partyListRef.current = [];
    flag('parties', true); fail('parties');
    A.fetchPackingParties(api, ctx, planuid)
      .then((list) => {
        if (id !== seq.current.parties) return;
        setPartyList(list); partyListRef.current = list;
        const parcode = pick(row, 'parcode');
        const mine = parcode ? list.find((p) => pick(p, 'acccode') === parcode) : list.length === 1 ? list[0] : undefined;
        if (mine) chooseParty(mine, list, planuid);
      })
      .catch((e) => { if (id === seq.current.parties) fail('parties', A.apiErrorText(e, 'Parties could not be loaded.')); })
      .finally(() => { if (id === seq.current.parties) flag('parties', false); });
  }, [api, ctx, chooseParty, loadGradeBalance]);

  const print = useCallback(async (): Promise<boolean> => {
    if (printing.current) return false; // second tap while sending → ignored
    const cur = fRef.current;
    const errs = validate(cur, ctx, 3);
    if (Object.keys(errs).length) { fail('print', Object.values(errs)[0]); return false; }
    printing.current = true;
    flag('print', true); fail('print');
    try {
      const label = buildLabel(cur, ctx, userId);
      const copies = label.noprint as number;
      const labels = Array.from({ length: copies }, () => ({ ...label }));
      const res = await A.printLabels(api, cur.printer, labels);
      setLastPrint({ printed: res.printed, at: Date.now(), label, copies });
      return true;
    } catch (e) {
      fail('print', A.apiErrorText(e, 'Print failed.'));
      return false;
    } finally {
      printing.current = false;
      flag('print', false);
    }
  }, [api, ctx, userId]);

  const actions = useMemo(() => ({
    chooseRoute,
    reloadRoutes: () => loadRoutes(fRef.current.defaults.uid),
    chooseParty: (row: Row) => chooseParty(row, undefined, undefined, true), // operator tapped this row
    chooseProdType,
    chooseGrade,
    chooseMerge: (row: Row) => dispatch({ t: 'merge', v: { code: pick(row, 'MerCode', 'mercode', 'code'), name: pick(row, 'MerName', 'mername', 'name') } }),
    set: (k: 'smarka' | 'printno' | 'nocones' | 'noprint' | 'carwt' | 'printer', v: string) => dispatch({ t: 'set', k, v }),
    setRpatti: (v: 'Y' | 'N') => dispatch({ t: 'rpatti', v }),
    print,
    newRoute: () => {
      seq.current.party++; seq.current.carton++;
      setLastPrint(null); setProblem((p) => ({ routes: p.routes, defaults: p.defaults }));
      seq.current.parties++; setPartyList([]); partyListRef.current = [];
      dispatch({ t: 'newRoute' });
      loadRoutes(fRef.current.defaults.uid); // the list may have changed after packing
    },
    clearPrintResult: () => setLastPrint(null),
  }), [chooseRoute, loadRoutes, chooseParty, chooseProdType, chooseGrade, print]);

  const linked = useMemo(() => ({ parties: partyList }), [partyList]);

  return { f, routes: routeData.main, linked, busy, problem, lastPrint, actions };
}
