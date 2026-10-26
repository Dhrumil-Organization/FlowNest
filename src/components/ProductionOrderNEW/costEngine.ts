// FILE: src/components/ProductionOrderNEW/costEngine.ts
// Live costing for the review step ("Input rates · verify / edit" and
// "Costing breakup · auto-derived" in the Madhusudhan ERP artifact).
//
// Source: GET /api/costing/{costing_id}  (inputs + snap + yarn_lines)
//         GET /api/designs/{md_id}       (yarn names, type PD/YD)
//
// Same formula as the artifact's computeCosting / the costing module:
//   yarn line   = kg_per_metre × (price + dye + sizing)          (kg/m is fixed by the design)
//   rm          = Σ yarn lines
//   weaving     = weaving_rate × ppi_table                        ("picks on the table")
//   greige mfg  = rm + weaving ; greige price = mfg × (1 + greige_brok%)
//   finished    = (mfg ÷ (1 − gf_shrink%) + processing) × (1 + finished_brok%) + cut & pack
// Verified: with the sheet's own rates this reproduces the server snap exactly.
import type { Row } from './format';

export type Rates = {
  price: Record<string, string>;
  dye: Record<string, string>;
  weavingRate: string; dyeingProc: string; greigeBrok: string; finishedBrok: string; cutPack: string;
};

export type EngineYarn = { key: string; type: 'warp' | 'weft' | 'selvedge'; name: string; kg: number; sizing: number };

export type Engine = {
  costingId: string; designType: string; ppiTable: number; gfPct: number; hasFin: boolean;
  takeUpPct: number; warpWastePct: number; weftWastePct: number;
  yarns: EngineYarn[]; initial: Rates; snap: Row;
};

const n = (v: any) => { const x = parseFloat(String(v ?? '').replace(/,/g, '')); return Number.isFinite(x) ? x : 0; };
const s = (v: any) => (v === undefined || v === null ? '' : String(v));

export function buildEngine(costing: Row, design: Row | null): Engine {
  const inputs = costing.inputs || {};
  const snap = costing.snap || {};
  const lines: Row[] = Array.isArray(costing.yarn_lines) ? costing.yarn_lines : [];
  const dyarns = (type: string): Row[] => (design ? design[`${type}_yarns`] || [] : []);
  const used: Record<string, number> = {};
  const yarns: EngineYarn[] = lines.map((l: Row, i: number) => {
    const type = (String(l.yarn_type || 'warp').toLowerCase() as EngineYarn['type']);
    const pool = dyarns(type);
    const idx = used[`${type}|${l.mi_id}`] || 0;
    const match = pool.filter((y: Row) => String(y.mi_id) === String(l.mi_id))[idx];
    used[`${type}|${l.mi_id}`] = idx + 1;
    const label = type === 'weft' ? 'Weft' : type === 'selvedge' ? 'Selvedge' : 'Warp';
    return {
      key: String(l.yarn_key || `${type}:${l.mi_id}:${i}`), type,
      name: String((match && match.name) || l.name || `${label} ${l.mi_id}`) + (type === 'selvedge' ? ' (selvedge)' : ''),
      kg: n(l.kg_per_metre), sizing: n(l.sizing_cost),
    };
  });
  const price: Record<string, string> = {};
  const dye: Record<string, string> = {};
  lines.forEach((l: Row, i: number) => {
    const k = yarns[i].key;
    price[k] = s(inputs.price_map && inputs.price_map[k] != null ? inputs.price_map[k] : l.price);
    dye[k] = s(inputs.dye_map && inputs.dye_map[k] != null ? inputs.dye_map[k] : l.dye_cost);
  });
  return {
    costingId: String(costing.id || ''),
    designType: String(costing.type || (design && design.type) || '').toUpperCase(),
    ppiTable: n(snap.ppi_table) || (n(snap.ppi_loom) ? n(snap.ppi_loom) + 2 : 0),
    gfPct: n(inputs.gf_shrink),
    hasFin: snap.has_fin !== false && n(inputs.fin_width) > 0,
    takeUpPct: n(inputs.warp_shrink), warpWastePct: n(inputs.warp_wastage), weftWastePct: n(inputs.weft_wastage),
    yarns, snap,
    initial: {
      price, dye,
      weavingRate: s(inputs.weaving_rate ?? 0), dyeingProc: s(inputs.dyeing_proc ?? 0),
      greigeBrok: s(inputs.greige_brok ?? 0), finishedBrok: s(inputs.finished_brok ?? 0), cutPack: s(inputs.cut_pack ?? 0),
    },
  };
}

export type Breakup = {
  yarnCost: number; dyeCost: number; rm: number; weavingCost: number; greigeMfg: number; greigeBrokAmt: number;
  greigePrice: number; shrinkImpact: number; dyeingProc: number; finBrokAmt: number; cutPack: number; finishedPrice: number;
};

export function computeBreakup(e: Engine, r: Rates): Breakup {
  let yarnCost = 0; let dyeCost = 0;
  e.yarns.forEach((y) => {
    yarnCost += y.kg * (n(r.price[y.key]) + y.sizing);
    dyeCost += y.kg * n(r.dye[y.key]);
  });
  const rm = yarnCost + dyeCost;
  const weavingCost = n(r.weavingRate) * e.ppiTable;
  const greigeMfg = rm + weavingCost;
  const greigeBrokAmt = greigeMfg * n(r.greigeBrok) / 100;
  const greigePrice = greigeMfg + greigeBrokAmt;
  let shrinkImpact = 0; let dyeingProc = 0; let finBrokAmt = 0; let cutPack = 0; let finishedPrice = 0;
  if (e.hasFin && e.gfPct < 100) {
    const base = greigeMfg / (1 - e.gfPct / 100);
    shrinkImpact = base - greigeMfg;
    dyeingProc = n(r.dyeingProc);
    const sub = base + dyeingProc;
    finBrokAmt = sub * n(r.finishedBrok) / 100;
    cutPack = n(r.cutPack);
    finishedPrice = sub + finBrokAmt + cutPack;
  }
  return { yarnCost, dyeCost, rm, weavingCost, greigeMfg, greigeBrokAmt, greigePrice, shrinkImpact, dyeingProc, finBrokAmt, cutPack, finishedPrice };
}

/** The immutable revision is authoritative until the user actually edits a rate.
 * Do not reconstruct its totals from yarn lines: historical consumption and
 * per-line precision may differ from the current editable calculation. */
export function savedBreakup(e: Engine): Breakup {
  const snap = e.snap || {};
  const rm = n(snap.rm);
  const dyeCost = n(snap.yarn_dye_cost);
  const greigeMfg = n(snap.greige_mfg);
  const greigeBrokAmt = n(snap.greige_brok_amt);
  const finishedPrice = n(snap.finished_price ?? snap.final_cost);
  return {
    yarnCost: rm - dyeCost,
    dyeCost, rm,
    weavingCost: n(snap.weaving_cost),
    greigeMfg, greigeBrokAmt,
    greigePrice: n(snap.greige_price),
    shrinkImpact: n(snap.shrink_impact),
    dyeingProc: n(snap.dye_proc_amount),
    finBrokAmt: n(snap.fin_brok_amt),
    cutPack: n(snap.cut_pack),
    finishedPrice,
  };
}

/** true when the engine reproduces the sheet's saved snapshot (sanity check). */
export function matchesSnap(e: Engine): boolean {
  const b = computeBreakup(e, e.initial);
  const close = (a: number, x: any) => Math.abs(a - n(x)) < 0.01;
  return close(b.greigePrice, e.snap.greige_price) && (!e.hasFin || close(b.finishedPrice, e.snap.finished_price));
}

export const ratesEdited = (e: Engine | null, r: Rates | null) => {
  if (!e || !r) return false;
  const same = (a: any, b: any) => Math.abs(n(a) - n(b)) < 0.0000001;
  for (const key of ['weavingRate', 'dyeingProc', 'greigeBrok', 'finishedBrok', 'cutPack'] as const) {
    if (!same(e.initial[key], r[key])) return true;
  }
  const yarnKeys = new Set([...Object.keys(e.initial.price || {}), ...Object.keys(r.price || {}),
    ...Object.keys(e.initial.dye || {}), ...Object.keys(r.dye || {})]);
  for (const key of yarnKeys) {
    if (!same(e.initial.price[key], r.price[key]) || !same(e.initial.dye[key], r.dye[key])) return true;
  }
  return false;
};


/** Persist the exact PO-specific rates in a backend-friendly, stable schema.
 * Design Costing remains untouched; this object belongs only to the PO snapshot. */
export function snapshotRates(e: Engine, r: Rates): Row {
  const yarns = e.yarns.map((y) => ({
    key: y.key,
    direction: y.type,
    name: y.name,
    kg_per_metre: y.kg,
    rate: n(r.price[y.key]),
    dye_rate: n(r.dye[y.key]),
    sizing_cost: y.sizing,
  }));
  const priceMap: Row = {};
  const dyeMap: Row = {};
  e.yarns.forEach((y) => {
    priceMap[y.key] = n(r.price[y.key]);
    dyeMap[y.key] = n(r.dye[y.key]);
  });
  return {
    price_map: priceMap,
    dye_map: dyeMap,
    weaving_rate: n(r.weavingRate),
    processing_rate: n(r.dyeingProc),
    greige_brokerage_pct: n(r.greigeBrok),
    finished_brokerage_pct: n(r.finishedBrok),
    cut_pack_rate: n(r.cutPack),
    finish_shrink_pct: e.gfPct,
    ppi_table: e.ppiTable,
    is_override: ratesEdited(e, r) ? 1 : 0,
    yarns,
  };
}

/** Persist the exact calculated/saved cost result approved for the PO. */
export function snapshotDerived(b: Breakup): Row {
  return {
    yarn_cost: b.yarnCost,
    dye_cost: b.dyeCost,
    rm_cost: b.rm,
    weaving_cost: b.weavingCost,
    greige_mfg: b.greigeMfg,
    greige_brokerage_amount: b.greigeBrokAmt,
    greige_cost: b.greigePrice,
    shrinkage_impact: b.shrinkImpact,
    processing_amount: b.dyeingProc,
    finished_brokerage_amount: b.finBrokAmt,
    cut_pack_amount: b.cutPack,
    finished_cost: b.finishedPrice,
  };
}

/** Restore a previously saved PO override into the editable costing review.
 * Accepts both the new snake_case snapshot and the older RN camelCase shape. */
export function ratesFromSnapshot(e: Engine, saved: Row | null | undefined): Rates {
  if (!saved || typeof saved !== 'object') return e.initial;
  const priceMap: Row = (saved.price_map && typeof saved.price_map === 'object') ? saved.price_map
    : ((saved.price && typeof saved.price === 'object') ? saved.price : {});
  const dyeMap: Row = (saved.dye_map && typeof saved.dye_map === 'object') ? saved.dye_map
    : ((saved.dye && typeof saved.dye === 'object') ? saved.dye : {});
  const yarns: Row[] = Array.isArray(saved.yarns) ? saved.yarns : [];
  const savedYarnByKey: Record<string, Row> = {};
  yarns.forEach((y: Row) => { if (y && y.key != null) savedYarnByKey[String(y.key)] = y; });

  const price = { ...e.initial.price };
  const dye = { ...e.initial.dye };
  e.yarns.forEach((y) => {
    const row = savedYarnByKey[y.key] || {};
    const pv = priceMap[y.key] != null ? priceMap[y.key] : row.rate;
    const dv = dyeMap[y.key] != null ? dyeMap[y.key] : row.dye_rate;
    if (pv !== undefined && pv !== null && pv !== '') price[y.key] = s(pv);
    if (dv !== undefined && dv !== null && dv !== '') dye[y.key] = s(dv);
  });

  return {
    price,
    dye,
    weavingRate: s(saved.weaving_rate ?? saved.weavingRate ?? e.initial.weavingRate),
    dyeingProc: s(saved.processing_rate ?? saved.dyeingProc ?? e.initial.dyeingProc),
    greigeBrok: s(saved.greige_brokerage_pct ?? saved.greigeBrok ?? e.initial.greigeBrok),
    finishedBrok: s(saved.finished_brokerage_pct ?? saved.finishedBrok ?? e.initial.finishedBrok),
    cutPack: s(saved.cut_pack_rate ?? saved.cutPack ?? e.initial.cutPack),
  };
}
