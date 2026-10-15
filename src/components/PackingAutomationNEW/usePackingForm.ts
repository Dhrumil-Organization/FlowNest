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

export type Party = { parcode: string; parname: string; prodtypes: string[]; raw: Row };
export type Pick = { code: string; name: string };
export type Step = 1 | 2 | 3 | 4;

export type Form = {
  defaults: Row; // prodpackingshow → main[0]
  routeNo: string; // what was typed / scanned
  route: Row | null; // route card row from the lookup
  party: Party | null;
  cartons: Carton[]; // planned cartons for the party
  prodtype: string; // exactly ONE code; '' = not chosen yet
  carton: Carton | null; // the planned carton for `prodtype`
  masterCarWt: number | null; // master empty-carton weight (web ncarwt)
  carwt: string; // empty-carton weight, editable, ≤ master
  grade: Pick | null;
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
  routeNo: '',
  route: null,
  party: null,
  cartons: [],
  prodtype: '',
  carton: null,
  masterCarWt: null,
  carwt: '',
  grade: null,
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

/** The route card fields the screens show; reads both route row and form defaults like the web did. */
export function routeView(f: Form) {
  const r = { ...f.defaults, ...(f.route || {}) };
  const stk = pick(r, 'stktype') || 'I';
  return {
    routeNo: pick(f.route, 'rcno', 'routecardno', 'route_card_no', 'vouno', 'productionvouno') || f.routeNo,
    planuid: r.planuid,
    itmcode: pick(r, 'itmcode'),
    itmname: pick(r, 'itmname'),
    shdcode: pick(r, 'shdcode'),
    shdname: pick(r, 'shdname'),
    denier: pick(r, 'denier'),
    cheeswt: pick(r, 'cheeswt'),
    stktype: stk,
    stkLabel: stk === 'P' ? 'Process house' : 'In house',
    raw: r,
  };
}

export const normParty = (row: Row): Party => ({
  parcode: pick(row, 'acccode', 'parcode'),
  parname: pick(row, 'accname', 'parname', 'name'),
  prodtypes: splitTypes(row?.prodtype),
  raw: row,
});

/** Production type choices: the party's types, each matched to its planned carton (or disabled). */
export function prodTypeChoices(f: Form) {
  const types = f.party?.prodtypes.length ? f.party.prodtypes : splitTypes(f.cartons.map((c) => c.prodtype));
  return types.map((code) => {
    const carton = f.cartons.find((c) => c.prodtype === code) || null;
    return { code, carton, disabled: !carton };
  });
}

/* ------------------------------ reducer ------------------------------ */

type Act =
  | { t: 'defaults'; main: Row }
  | { t: 'routeNo'; v: string }
  | { t: 'route'; route: Row }
  | { t: 'party'; party: Party; cartons: Carton[] }
  | { t: 'prodtype'; code: string }
  | { t: 'masterWt'; wt: number }
  | { t: 'grade'; v: Pick }
  | { t: 'merge'; v: Pick }
  | { t: 'set'; k: 'smarka' | 'printno' | 'nocones' | 'noprint' | 'carwt' | 'printer'; v: string }
  | { t: 'rpatti'; v: 'Y' | 'N' }
  | { t: 'newRoute' }
  | { t: 'reset' };

function reducer(s: Form, a: Act): Form {
  switch (a.t) {
    case 'defaults':
      return { ...s, defaults: a.main, smarka: s.smarka || str(a.main.smarka), rpatti: str(a.main.rpatti) === 'N' ? 'N' : s.rpatti };
    case 'routeNo':
      return { ...s, routeNo: a.v };
    case 'route': {
      // New route card → everything chosen for the old one goes.
      const mercode = pick(a.route, 'mercode');
      return {
        ...s,
        route: a.route,
        party: null, cartons: [], prodtype: '', carton: null, masterCarWt: null, carwt: '',
        grade: null,
        merge: mercode ? { code: mercode, name: pick(a.route, 'mername') } : null,
        smarka: str(s.defaults.smarka),
      };
    }
    case 'party':
      // New party → its production type, carton and grade must be chosen again.
      return { ...s, party: a.party, cartons: a.cartons, prodtype: '', carton: null, masterCarWt: null, carwt: '', grade: null };
    case 'prodtype': {
      const carton = s.cartons.find((c) => c.prodtype === a.code) || null;
      return { ...s, prodtype: a.code, carton, masterCarWt: null, carwt: '' };
    }
    case 'masterWt':
      return { ...s, masterCarWt: a.wt, carwt: String(a.wt) };
    case 'grade':
      return { ...s, grade: a.v };
    case 'merge':
      return { ...s, merge: a.v };
    case 'set':
      return { ...s, [a.k]: a.v };
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

/* ------------------------------ validation ------------------------------ */

export type Errors = Partial<Record<
  'facility' | 'route' | 'party' | 'prodtype' | 'carton' | 'carwt' | 'grade' | 'merge' | 'smarka' | 'printno' | 'nocones' | 'noprint' | 'printer',
  string
>>;

export function validate(f: Form, ctx: Ctx, step: Step): Errors {
  const e: Errors = {};
  if (step >= 1) {
    if (!ctx.prpcode || !ctx.yearno || !ctx.strcode) e.facility = 'Choose the facility, year and store.';
    if (!f.route) e.route = 'Scan or enter a route card.';
  }
  if (step >= 2) {
    if (!f.party) e.party = 'Choose the party.';
    else if (!f.prodtype) e.prodtype = 'Choose one production type.';
    else if (!f.carton) e.prodtype = 'No carton is planned for this production type.';
    if (f.carton) {
      const w = num(f.carwt);
      if (f.masterCarWt === null) e.carwt = 'Carton weight is still loading.';
      else if (!Number.isFinite(w) || w < 0) e.carwt = 'Enter the empty carton weight.';
      else if (w > f.masterCarWt) e.carwt = `Cannot be more than the master carton weight (${f.masterCarWt}).`;
    }
    if (!f.grade) e.grade = f.party ? 'Choose the grade.' : 'Choose the party first.';
    if (!f.merge) e.merge = 'Choose the merge.';
    if (!f.smarka.trim()) e.smarka = 'Enter the shipping marka.';
    if (!isWhole(f.printno)) e.printno = 'Print no. must be a number.';
  }
  if (step >= 3) {
    if (!isWhole(f.nocones) || parseInt(f.nocones, 10) < 1) e.nocones = 'Enter the number of cones (1 or more).';
    if (!isWhole(f.noprint) || parseInt(f.noprint, 10) < 1 || parseInt(f.noprint, 10) > MAX_COPIES) e.noprint = `Copies must be 1–${MAX_COPIES}.`;
    if (!f.printer) e.printer = 'Choose a printer.';
  }
  return e;
}

/** Label data — same keys the web sent to /api/print-qr-label, with the fixes above. */
export function buildLabel(f: Form, ctx: Ctx, userId: string): Row {
  const r = routeView(f);
  const v = r.raw;
  const cheeswt = num(r.cheeswt || '0');
  const cones = parseInt(f.nocones, 10);
  const totchees = Number.isFinite(cheeswt) && Number.isFinite(cones) ? (cheeswt * cones).toFixed(3) : '0.000';
  return {
    rpatti: f.rpatti,
    PrpCode: ctx.prpcode,
    YearNo: ctx.yearno,
    StrCode: ctx.strcode,
    uid: str(v.prcuid),
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
    prodtype: f.prodtype, // ONE code
    prodtype1: f.prodtype, // web sent the same selected type here
    stktype: r.stktype,
    cheeswt: r.cheeswt || '0',
    nocones: String(cones || 0),
    totchees,
    printer: f.printer,
    userid: userId,
  };
}

/* ------------------------------ hook ------------------------------ */

type Busy = { defaults?: boolean; route?: boolean; party?: boolean; carton?: boolean; print?: boolean };
type Problems = { defaults?: string; route?: string; party?: string; carton?: string; print?: string };
export type PrintResult = { printed: number; at: number; label: Row; copies: number };

export function usePackingForm(api: Api, ctx: Ctx, userId: string) {
  const [f, dispatch] = useReducer(reducer, undefined, () => initial());
  const [busy, setBusy] = useState<Busy>({});
  const [problem, setProblem] = useState<Problems>({});
  const [lastPrint, setLastPrint] = useState<PrintResult | null>(null);

  // Latest state for async callbacks (never read stale values after an await).
  const fRef = useRef(f);
  fRef.current = f;
  // One counter per chain: a response is applied only if it is still the newest request.
  const seq = useRef({ defaults: 0, route: 0, party: 0, carton: 0 });
  const printing = useRef(false);

  const flag = (k: keyof Busy, v: boolean) => setBusy((b) => ({ ...b, [k]: v }));
  const fail = (k: keyof Problems, msg?: string) => setProblem((p) => ({ ...p, [k]: msg }));

  // Form defaults for the facility (web SoShow('0')).
  useEffect(() => {
    if (!ctx.prpcode || !ctx.yearno || !ctx.strcode) return;
    const id = ++seq.current.defaults;
    dispatch({ t: 'reset' });
    flag('defaults', true); fail('defaults');
    A.showPacking(api, ctx)
      .then(({ main }) => { if (id === seq.current.defaults) dispatch({ t: 'defaults', main }); })
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

  const lookupRoute = useCallback(async (raw?: string) => {
    const no = str(raw ?? fRef.current.routeNo);
    if (raw !== undefined) dispatch({ t: 'routeNo', v: no });
    if (!no) { fail('route', 'Scan or enter a route card.'); return false; }
    const id = ++seq.current.route;
    seq.current.party++; seq.current.carton++; // drop anything still loading for the old route
    flag('route', true); fail('route'); fail('party'); fail('carton');
    try {
      const row = await A.findRouteCard(api, ctx, no);
      if (id !== seq.current.route) return false;
      if (!row) { fail('route', `Route card ${no} was not found.`); return false; }
      dispatch({ t: 'route', route: row });
      return true;
    } catch (e) {
      if (id === seq.current.route) fail('route', A.apiErrorText(e, 'Route card could not be loaded.'));
      return false;
    } finally {
      if (id === seq.current.route) flag('route', false);
    }
  }, [api, ctx]);

  const chooseParty = useCallback(async (row: Row) => {
    const party = normParty(row);
    const id = ++seq.current.party;
    seq.current.carton++;
    flag('party', true); fail('party'); fail('carton');
    try {
      const cartons = await A.fetchPlannedCartons(api, ctx, party.parcode, routeView(fRef.current).planuid);
      if (id !== seq.current.party) return;
      dispatch({ t: 'party', party, cartons });
      // Only one production type has a planned carton → pick it for the operator.
      const usable = prodTypeChoices({ ...fRef.current, party, cartons }).filter((c) => !c.disabled);
      if (usable.length === 1) {
        dispatch({ t: 'prodtype', code: usable[0].code });
        loadCartonWeight(party, usable[0].carton);
      }
    } catch (e) {
      if (id === seq.current.party) fail('party', A.apiErrorText(e, 'Planned cartons could not be loaded.'));
    } finally {
      if (id === seq.current.party) flag('party', false);
    }
  }, [api, ctx, loadCartonWeight]);

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
    setRouteNo: (v: string) => dispatch({ t: 'routeNo', v }),
    lookupRoute,
    chooseParty,
    chooseProdType,
    chooseGrade: (row: Row) => dispatch({ t: 'grade', v: { code: pick(row, 'grdcode', 'code'), name: pick(row, 'grdname', 'name') } }),
    chooseMerge: (row: Row) => dispatch({ t: 'merge', v: { code: pick(row, 'mercode', 'code'), name: pick(row, 'mername', 'name') } }),
    set: (k: 'smarka' | 'printno' | 'nocones' | 'noprint' | 'carwt' | 'printer', v: string) => dispatch({ t: 'set', k, v }),
    setRpatti: (v: 'Y' | 'N') => dispatch({ t: 'rpatti', v }),
    print,
    newRoute: () => { seq.current.route++; seq.current.party++; seq.current.carton++; setLastPrint(null); setProblem({}); dispatch({ t: 'newRoute' }); },
    clearPrintResult: () => setLastPrint(null),
  }), [lookupRoute, chooseParty, chooseProdType, print]);

  return { f, busy, problem, lastPrint, actions };
}
