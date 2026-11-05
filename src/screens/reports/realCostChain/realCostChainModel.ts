// FILE: src/screens/reports/realCostChain/realCostChainModel.ts
// Types + normalizers for Reports → Real Costing Chain (POST /api/real_cost_chain/report, RealCostChainController).

export type Assumed = {
  id: string; code: string; ts: string;
  rm: number; weaving: number; weaving_rate: number; ppi_table: number; greige_mfg: number; has_fin: boolean;
  shrink: number; fent: number; proc: number; warp_waste: number; fin_shrink: number; final: number; costing_final: number;
  brok: number | null; cut_pack: number | null; recipe: number | null;
};
export type Actual = {
  rm: number;
  /** actual = every closed beam priced from its carton issues · mixed = some beams at costing RM · costing = none found */
  rm_source: 'actual' | 'mixed' | 'costing' | string;
  rm_warp: number; rm_weft: number; rm_costing: number; rm_metres: number; rm_fb_metres: number;
  rm_fallback_kg: number; rm_missing_kg: number; rm_no_weft_beams: number;
  /** warp shortage already inside the actual RM (yarn ÷ checked metres) */
  short_in_rm: boolean;
  weaving: number; greige_mfg: number; short_pct: number; short: number; has_short: boolean;
  fin_shrink_pct: number; fin_shrink_source: string; shrink: number; fent_pct: number; fent: number;
  proc: number; proc_metres: number; proc_source: string; final: number;
};
export type BeamCost = {
  beamuid: string; beam: string; loom: string; shed: 'Rapier' | 'Waterjet' | 'Other' | string; date: string;
  rate: number | null; metres: number; rm_per_m: number; rm_source: string; weave_per_m: number; greige_per_m: number; cost: number;
};
/* ------------------------------ cost breakup (expandable cost heads) ------------------------------ */
export type WeaveDay = {
  date: string; metres: number; pickm: number; rate: number | null; status: string; shed: string;
  costing_m: number; amount: number; per_m: number;
};
export type Breakup = {
  rm: {
    source: string;
    warp: { per_m: number; kg: number; amt: number; rate: number | null; kg_m: number | null };
    warp_short: { per_m: number; kg: number; amt: number; metres: number; warp_len: number; pct: number };
    weft: { per_m: number; kg: number; amt: number; rate: number | null; issued_kg: number; kg_m: number | null };
    weft_waste: { per_m: number; kg: number; amt: number; pct: number; basis: string };
    costing_part: { per_m: number; metres: number; rate: number };
    issued_amt: number; total: number;
  };
  /** the costing engine's own RM split (null when the costing record has no warp / weft columns) */
  rm_asm: { warp: number; warp_short: number; warp_pct: number; weft: number; weft_waste: number; weft_pct: number; selvedge: number; total: number } | null;
  weave: { days: WeaveDay[]; amt: number; metres: number; per_m: number; costing_rate: number };
  greige: { per_m: number; amt: number };
  dye: {
    has_fin: boolean;
    short: { pct: number; source: string; sent_m: number; back_m: number; lost_m: number; takas: number; per_m: number; amt: number };
    fent: { pct: number; per_m: number; amt: number };
    charge: { rate: number; source: string; billed_amt: number; billed_m: number; per_m: number; amt: number };
    total: number;
  };
  brok: { pct: number; per_m: number; amt: number };
  cut: { per_m: number; amt: number };
  /** costing-side figures for the hints and the extra estimated lines */
  asm: {
    brok: number; cut: number; recipe: number; final: number; shrink_pct: number; proc: number;
    weaving_rate: number; ppi: number; warp_kg_m: number | null; weft_kg_m: number | null; warp_pct: number; weft_pct: number;
  } | null;
  final: { per_m: number; amt: number };
};
export type DesignChain = {
  key: string; prpcode: string; dsncode: string; name: string;
  has_costing: boolean; has_fin: boolean; made: number; nbeams: number;
  actual: Actual; assumed: Assumed | null; act_val: number; asm_val: number;
  /** null when the server is older than the breakup version */
  breakup: Breakup | null;
  mill: { out: number; in: number; takas: number } | null;
  learned_warp: number | null; learned_fin: number | null;
  flags: { no_rate_metres: number; no_pick_metres: number };
  beams: BeamCost[];
};
export type RateUsed = { ym: string; section: string; rate: number | null; status: 'CLOSED' | 'LIVE' | 'NA' | string; note: string };
export type ChainData = {
  prptype: string;
  fy: { yearno: string; name: string; from: string; to: string };
  month: string; months: string[];
  /** true = period is a From–To date range of the last taka (not a month) */
  range: boolean;
  period: { from: string; to: string };
  fent_default: number;
  designs: DesignChain[];
  rates: RateUsed[];
  /** server time the numbers were built ("YYYY-MM-DD HH:mm:ss") — the answer may come from the 10-minute cache */
  built_at: string;
  /** seconds the build took on the server */
  build_secs: number;
  /** true = the last figures built for this period, shown at once while new ones are being built */
  stale: boolean;
};

const s = (v: any) => (v == null ? '' : String(v)).trim();
const n = (v: any) => {
  const x = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(x) ? x : 0;
};
const nn = (v: any) => (v == null || v === '' ? null : n(v));
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

/** axios response / envelope → data; refuses HTML / text answers */
export function unwrap(response: any): any {
  const body = response && typeof response === 'object' && 'data' in response && 'status' in response && 'headers' in response ? response.data : response;
  if (typeof body === 'string') {
    const t = body.trim();
    throw new Error(t.startsWith('<') ? 'The server sent a web page instead of data — check the API route.' : t.slice(0, 200) || 'Empty answer from the server.');
  }
  if (body && typeof body === 'object' && body.success === false) throw new Error(body.message || 'Request failed.');
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export function errText(e: any, fallback: string): string {
  const d = e?.response?.data;
  if (d && typeof d === 'object' && d.message) return String(d.message);
  if (typeof d === 'string' && d.trim() && !d.trim().startsWith('<')) return d.trim().slice(0, 300);
  if (e?.response?.status) return `${fallback} (HTTP ${e.response.status})`;
  return e?.message || fallback;
}

export function normalizeChain(raw: any): ChainData {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.designs)) throw new Error('The server sent an unexpected answer for the real cost chain.');
  const fy = raw.fy || {};
  return {
    prptype: s(raw.prptype),
    fy: { yearno: s(fy.yearno), name: s(fy.name) || 'FY ' + s(fy.yearno), from: s(fy.from), to: s(fy.to) },
    month: s(raw.month),
    months: arr(raw.months).map(s).filter(Boolean),
    range: !!raw.range,
    built_at: s(raw.built_at),
    build_secs: n(raw.build_secs),
    stale: !!raw.stale,
    period: { from: s(raw.period?.from), to: s(raw.period?.to) },
    fent_default: n(raw.fent_default) || 3,
    designs: arr(raw.designs).map((d: any): DesignChain => {
      const a = d.actual || {};
      const m = d.assumed;
      return {
        key: s(d.key), prpcode: s(d.prpcode), dsncode: s(d.dsncode), name: s(d.name) || s(d.dsncode),
        has_costing: !!d.has_costing, has_fin: !!d.has_fin, made: n(d.made), nbeams: n(d.nbeams),
        actual: {
          rm: n(a.rm), rm_source: s(a.rm_source), rm_warp: n(a.rm_warp), rm_weft: n(a.rm_weft), rm_costing: n(a.rm_costing),
          rm_metres: n(a.rm_metres), rm_fb_metres: n(a.rm_fb_metres), rm_fallback_kg: n(a.rm_fallback_kg), rm_missing_kg: n(a.rm_missing_kg),
          rm_no_weft_beams: n(a.rm_no_weft_beams), short_in_rm: !!a.short_in_rm,
          weaving: n(a.weaving), greige_mfg: n(a.greige_mfg), short_pct: n(a.short_pct), short: n(a.short), has_short: !!a.has_short,
          fin_shrink_pct: n(a.fin_shrink_pct), fin_shrink_source: s(a.fin_shrink_source), shrink: n(a.shrink), fent_pct: n(a.fent_pct), fent: n(a.fent),
          proc: n(a.proc), proc_metres: n(a.proc_metres), proc_source: s(a.proc_source), final: n(a.final),
        },
        assumed: m && typeof m === 'object' ? {
          id: s(m.id), code: s(m.code), ts: s(m.ts), rm: n(m.rm), weaving: n(m.weaving), weaving_rate: n(m.weaving_rate), ppi_table: n(m.ppi_table),
          greige_mfg: n(m.greige_mfg), has_fin: !!m.has_fin, shrink: n(m.shrink), fent: n(m.fent), proc: n(m.proc),
          warp_waste: n(m.warp_waste), fin_shrink: n(m.fin_shrink), final: n(m.final), costing_final: n(m.costing_final),
          brok: nn(m.brok), cut_pack: nn(m.cut_pack), recipe: nn(m.recipe),
        } : null,
        act_val: n(d.act_val), asm_val: n(d.asm_val),
        breakup: normalizeBreakup(d.breakup),
        mill: d.mill ? { out: n(d.mill.out), in: n(d.mill.in), takas: n(d.mill.takas) } : null,
        learned_warp: nn(d.learned_warp), learned_fin: nn(d.learned_fin),
        flags: { no_rate_metres: n(d.flags?.no_rate_metres), no_pick_metres: n(d.flags?.no_pick_metres) },
        beams: arr(d.beams).map((b: any) => ({
          beamuid: s(b.beamuid), beam: s(b.beam), loom: s(b.loom), shed: s(b.shed), date: s(b.date), rate: nn(b.rate),
          metres: n(b.metres), rm_per_m: n(b.rm_per_m), rm_source: s(b.rm_source), weave_per_m: n(b.weave_per_m), greige_per_m: n(b.greige_per_m), cost: n(b.cost),
        })),
      };
    }),
    rates: arr(raw.rates).map((r: any) => ({ ym: s(r.ym), section: s(r.section), rate: nn(r.rate), status: s(r.status), note: s(r.note) })),
  };
}

function normalizeBreakup(b: any): Breakup | null {
  if (!b || typeof b !== 'object' || !b.rm || !b.weave) return null;
  const o = (v: any) => (v && typeof v === 'object' ? v : {});
  const rm = o(b.rm), dye = o(b.dye), a = b.rm_asm;
  return {
    rm: {
      source: s(rm.source),
      warp: { per_m: n(o(rm.warp).per_m), kg: n(o(rm.warp).kg), amt: n(o(rm.warp).amt), rate: nn(o(rm.warp).rate), kg_m: nn(o(rm.warp).kg_m) },
      warp_short: {
        per_m: n(o(rm.warp_short).per_m), kg: n(o(rm.warp_short).kg), amt: n(o(rm.warp_short).amt),
        metres: n(o(rm.warp_short).metres), warp_len: n(o(rm.warp_short).warp_len), pct: n(o(rm.warp_short).pct),
      },
      weft: { per_m: n(o(rm.weft).per_m), kg: n(o(rm.weft).kg), amt: n(o(rm.weft).amt), rate: nn(o(rm.weft).rate), issued_kg: n(o(rm.weft).issued_kg), kg_m: nn(o(rm.weft).kg_m) },
      weft_waste: { per_m: n(o(rm.weft_waste).per_m), kg: n(o(rm.weft_waste).kg), amt: n(o(rm.weft_waste).amt), pct: n(o(rm.weft_waste).pct), basis: s(o(rm.weft_waste).basis) },
      costing_part: { per_m: n(o(rm.costing_part).per_m), metres: n(o(rm.costing_part).metres), rate: n(o(rm.costing_part).rate) },
      issued_amt: n(rm.issued_amt), total: n(rm.total),
    },
    rm_asm: a && typeof a === 'object' ? {
      warp: n(a.warp), warp_short: n(a.warp_short), warp_pct: n(a.warp_pct), weft: n(a.weft), weft_waste: n(a.weft_waste),
      weft_pct: n(a.weft_pct), selvedge: n(a.selvedge), total: n(a.total),
    } : null,
    weave: {
      days: arr(o(b.weave).days).map((x: any): WeaveDay => ({
        date: s(x.date), metres: n(x.metres), pickm: n(x.pickm), rate: nn(x.rate), status: s(x.status), shed: s(x.shed),
        costing_m: n(x.costing_m), amount: n(x.amount), per_m: n(x.per_m),
      })),
      amt: n(o(b.weave).amt), metres: n(o(b.weave).metres), per_m: n(o(b.weave).per_m), costing_rate: n(o(b.weave).costing_rate),
    },
    greige: { per_m: n(o(b.greige).per_m), amt: n(o(b.greige).amt) },
    dye: {
      has_fin: !!dye.has_fin,
      short: {
        pct: n(o(dye.short).pct), source: s(o(dye.short).source), sent_m: n(o(dye.short).sent_m), back_m: n(o(dye.short).back_m),
        lost_m: n(o(dye.short).lost_m), takas: n(o(dye.short).takas), per_m: n(o(dye.short).per_m), amt: n(o(dye.short).amt),
      },
      fent: { pct: n(o(dye.fent).pct), per_m: n(o(dye.fent).per_m), amt: n(o(dye.fent).amt) },
      charge: {
        rate: n(o(dye.charge).rate), source: s(o(dye.charge).source), billed_amt: n(o(dye.charge).billed_amt),
        billed_m: n(o(dye.charge).billed_m), per_m: n(o(dye.charge).per_m), amt: n(o(dye.charge).amt),
      },
      total: n(dye.total),
    },
    brok: { pct: n(o(b.brok).pct), per_m: n(o(b.brok).per_m), amt: n(o(b.brok).amt) },
    cut: { per_m: n(o(b.cut).per_m), amt: n(o(b.cut).amt) },
    asm: b.asm && typeof b.asm === 'object' ? {
      brok: n(b.asm.brok), cut: n(b.asm.cut), recipe: n(b.asm.recipe), final: n(b.asm.final), shrink_pct: n(b.asm.shrink_pct),
      proc: n(b.asm.proc), weaving_rate: n(b.asm.weaving_rate), ppi: n(b.asm.ppi), warp_kg_m: nn(b.asm.warp_kg_m),
      weft_kg_m: nn(b.asm.weft_kg_m), warp_pct: n(b.asm.warp_pct), weft_pct: n(b.asm.weft_pct),
    } : null,
    final: { per_m: n(o(b.final).per_m), amt: n(o(b.final).amt) },
  };
}

/* ------------------------------ cost tree (Raw material → Weaving → Greige → Dyeing → Final) ------------------------------ */
export type CostSub = { label: string; asm: number | null; act: number | null; note?: string };
export type CostHead = {
  key: string;
  label: string;
  asm: number | null;
  act: number;
  /** head = a cost head · subtotal = Greige · total = Final */
  kind: 'head' | 'subtotal' | 'total';
  /** small grey tag after the label ("as costed", "sheet") */
  chip?: string;
  /** monospace line under the label: "assumed → actual" */
  hint?: string;
  subs?: CostSub[];
  days?: WeaveDay[];
  /** plain detail lines (dyeing heads) */
  lines?: string[];
  /** note at the bottom of the open panel */
  foot?: string;
};

const kg = (v: number) => `${(Math.round(v * 10) / 10).toLocaleString('en-IN')} kg`;
const mt = (v: number) => `${Math.round(v).toLocaleString('en-IN')} m`;
const pc = (v: number) => `${Math.round(v * 10) / 10}%`;
const k4 = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(4));

/**
 * The cost heads of a design, in screen order. Works with an older server too (no `breakup`): then the heads come
 * from `actual` / `assumed` and the detail inside them is shorter (`d.breakup === null` → the screen says so).
 */
export function costTree(d: DesignChain): CostHead[] {
  const B = d.breakup;
  const a = d.assumed;
  const A = d.actual;
  const X = B?.asm || null;
  const R = B?.rm || null;
  const RA = B?.rm_asm || null;
  const out: CostHead[] = [];

  // 1. Raw material
  const subs: CostSub[] = [];
  if (R) {
    subs.push({
      label: 'Warp yarn', asm: RA ? RA.warp : null, act: R.warp.per_m,
      note: `${k4(X?.warp_kg_m)} → ${k4(R.warp.kg_m)} kg/m${R.warp.rate ? ` · ${money2(R.warp.rate)}/kg` : ''}`,
    });
    subs.push({
      label: 'Warp shortage', asm: RA ? RA.warp_short : null, act: R.warp_short.per_m,
      note: `${pc(X?.warp_pct ?? RA?.warp_pct ?? 0)} assumed → ${pc(R.warp_short.pct)}`
        + (R.warp_short.warp_len > 0 ? ` · ${mt(R.warp_short.metres)} short of ${mt(R.warp_short.warp_len)} warped (${kg(R.warp_short.kg)})` : ''),
    });
    subs.push({
      label: 'Weft yarn', asm: RA ? RA.weft : null, act: R.weft.per_m,
      note: `${k4(X?.weft_kg_m)} → ${k4(R.weft.kg_m)} kg/m${R.weft.rate ? ` · ${money2(R.weft.rate)}/kg` : ''}`,
    });
    subs.push({
      label: 'Weft wastage', asm: RA ? RA.weft_waste : null, act: R.weft_waste.per_m,
      note: `${pc(X?.weft_pct ?? RA?.weft_pct ?? 0)} assumed → `
        + (R.weft_waste.basis === 'costing_pct' ? `${pc(R.weft_waste.pct)} of ${kg(R.weft.issued_kg)} weft issued (${kg(R.weft_waste.kg)})` : 'no weft-waste % in the costing'),
    });
    if (RA && RA.selvedge > 0) subs.push({ label: 'Selvedge yarn', asm: RA.selvedge, act: null, note: 'actual selvedge yarn is inside the creel (warp) issue' });
    if (R.costing_part.metres > 0) {
      subs.push({ label: 'Costing RM (no creel issue)', asm: null, act: R.costing_part.per_m, note: `${mt(R.costing_part.metres)} at the costing's ${money2(R.costing_part.rate)}/m` });
    }
  } else {
    subs.push({ label: 'Warp yarn (incl. shortage)', asm: null, act: A.rm_warp });
    subs.push({ label: 'Weft yarn', asm: null, act: A.rm_weft });
    if (A.rm_costing > 0) subs.push({ label: 'Costing RM (no creel issue)', asm: null, act: A.rm_costing, note: `${mt(A.rm_fb_metres)} at the costing RM` });
  }
  out.push({
    key: 'rm', label: 'Raw material', kind: 'head', asm: a ? a.rm : null, act: R ? R.total : A.rm,
    hint: A.rm_source === 'costing' ? 'from the costing · no creel issue found' : 'warp + weft · incl. shortage & wastage',
    subs,
    foot: `Actual yarn from the issues: each closed beam's creel (warp) share and its weft issues, returns deducted, every carton at its own purchase / job-inward rate — over ${mt(d.made)} produced from ${d.nbeams} beam${d.nbeams === 1 ? '' : 's'}. Shortage = warp lost at beam close.`,
  });

  // 2. Weaving
  out.push({
    key: 'weave', label: 'Weaving charge', kind: 'head', asm: a ? a.weaving : null, act: A.weaving,
    hint: `${a && a.weaving_rate ? `${money2(a.weaving_rate)}/pick × ${Math.round(a.ppi_table)} assumed` : 'costing weaving'} → rate on woven date`,
    days: B && B.weave.days.length ? B.weave.days : undefined,
  });

  // 3. Greige
  out.push({ key: 'greige', label: 'Greige fabric cost', kind: 'subtotal', asm: a ? a.greige_mfg : null, act: B ? B.greige.per_m : A.greige_mfg, hint: 'raw material + weaving' });

  // 4. Dyeing & processing
  if (d.has_fin) {
    const D = B?.dye || null;
    const sp = D ? D.short.pct : A.fin_shrink_pct;
    const fromMill = (D ? D.short.source : A.fin_shrink_source) === 'mill';
    const asmPct = X?.shrink_pct ?? a?.fin_shrink ?? 0;
    out.push({
      key: 'dye_short', label: 'Dyeing shortage', kind: 'head', asm: a ? a.shrink : null, act: A.shrink,
      hint: `${pc(asmPct)} assumed → ${fromMill && D ? `${pc(sp)} · ${mt(D.short.lost_m)} short on ${mt(D.short.sent_m)} sent` : `no matched challan yet · ${pc(sp)}`}`,
      lines: [
        fromMill && D
          ? `Mill: ${mt(D.short.sent_m)} grey sent → ${mt(D.short.back_m)} back (${D.short.takas} takas) · ${mt(D.short.lost_m)} lost = ${pc(sp)}`
          : `No taka of this design has come back from the mill yet — design shrink ${pc(sp)} used`,
        `Greige ${money2(B ? B.greige.per_m : A.greige_mfg)} ÷ (1 − ${pc(sp)}) − greige = ${money2(A.shrink)}/m`,
        `${money2(A.shrink)}/m × ${mt(d.made)} = ${moneyC(A.shrink * d.made)}`,
      ],
    });
    out.push({
      key: 'fent', label: 'Fent wastage', kind: 'head', asm: a ? a.fent : null, act: A.fent,
      hint: `${pc(A.fent_pct)} assumed → ${pc(A.fent_pct)} on the finished metres`,
    });
    const asmProc = X ? X.proc : a ? a.proc : 0;
    out.push({
      key: 'dye_charge', label: 'Dyeing charge', kind: 'head', asm: a ? a.proc : null, act: A.proc,
      hint: `${money2(asmProc)}/m assumed → ${A.proc_source === 'mill' ? `${money2(A.proc)}/m from challans` : 'no challan rate yet'}`,
      lines: [
        A.proc_source === 'mill' && D
          ? `Mill job bills ${moneyC(D.charge.billed_amt)} on ${mt(D.charge.billed_m)} received = ${money2(A.proc)}/m`
          : `Costing dyeing / processing rate ${money2(A.proc)}/m — no mill bill for this design yet`,
        `${money2(A.proc)}/m × ${mt(d.made)} = ${moneyC(A.proc * d.made)}`,
      ],
    });
  }

  // 5. Brokerage, cutting / packing, recipe revision (as costed)
  if (B && (B.brok.per_m > 0 || (a?.brok || 0) > 0)) {
    out.push({ key: 'brok', label: 'Brokerage', chip: 'as costed', kind: 'head', asm: a ? a.brok ?? null : null, act: B.brok.per_m, hint: `${pc(B.brok.pct)} on cost · as costed` });
  }
  if (B && (B.cut.per_m > 0 || (a?.cut_pack || 0) > 0)) {
    out.push({ key: 'cut', label: 'Cutting / packing', chip: 'as costed', kind: 'head', asm: a ? a.cut_pack ?? null : null, act: B.cut.per_m, hint: 'per metre · as costed' });
  }
  if (a && a.recipe != null && Math.abs(a.recipe) >= 0.005) {
    out.push({ key: 'recipe', label: 'Recipe revised since costing', chip: 'sheet', kind: 'head', asm: a.recipe, act: 0, hint: "difference to the saved sheet's final" });
  }

  // 6. Final
  const extra = B && (B.brok.per_m > 0 || B.cut.per_m > 0);
  out.push({
    key: 'final', label: 'Final cost ₹/m', kind: 'total', asm: a ? a.final : null, act: B ? B.final.per_m : A.final,
    hint: d.has_fin
      ? `greige + dyeing shortage + fent + dyeing charge${extra ? ' + brokerage / packing' : ''}`
      : `greige fabric${extra ? ' + brokerage' : ''}`,
  });
  return out;
}

/* ------------------------------ summary (artifact: monthly real-costing summary) ------------------------------ */
export type Summary = { designs: number; made: number; act: number; asm: number; actPerM: number; asmPerM: number; pct: number | null };
export function summaryOf(rows: DesignChain[]): Summary {
  const made = rows.reduce((a, r) => a + r.made, 0);
  const act = rows.reduce((a, r) => a + r.act_val, 0);
  const asm = rows.reduce((a, r) => a + r.asm_val, 0);
  return {
    designs: rows.length, made, act, asm,
    actPerM: made > 0 ? act / made : 0, asmPerM: made > 0 ? asm / made : 0,
    pct: asm > 0 ? ((act - asm) / asm) * 100 : null,
  };
}

/** assumed vs actual rows of one design (artifact "ASSUMED vs ACTUAL · per metre") */
export type CmpRow = { label: string; asm: number; act: number; bold?: boolean };
export function compareRows(d: DesignChain): CmpRow[] {
  const a = d.assumed;
  const A = d.actual;
  const rows: CmpRow[] = [
    { label: A.rm_source === 'actual' ? 'Raw material (issued yarn)' : A.rm_source === 'mixed' ? 'Raw material (part issued)' : 'Raw material', asm: a?.rm || 0, act: A.rm },
    { label: 'Weaving', asm: a?.weaving || 0, act: A.weaving },
    { label: 'Greige mfg', asm: a?.greige_mfg || 0, act: A.greige_mfg },
  ];
  if (A.short > 0 || (a && a.warp_waste)) rows.push({ label: A.short_in_rm ? 'Warp shortage (yarn part in RM)' : 'Warp shortage',asm: (a?.greige_mfg || A.greige_mfg) * ((a?.warp_waste || 0) / 100), act: A.short });
  if (d.has_fin) {
    rows.push({ label: 'Finish shrink', asm: a?.shrink || 0, act: A.shrink });
    rows.push({ label: `Fent wastage · ${A.fent_pct}%`, asm: a?.fent || 0, act: A.fent });
    rows.push({ label: 'Processing', asm: a?.proc || 0, act: A.proc });
  }
  rows.push({ label: 'Final ₹/m', asm: a?.final || 0, act: A.final, bold: true });
  return rows;
}

/* ------------------------------ formatting ------------------------------ */
/** ₹ with 2 fixed decimals and a real minus: −₹7.60 (cost breakup) */
export const money2 = (v: number) => {
  const x = Math.round((+v || 0) * 100) / 100;
  return (x < 0 ? '−' : '') + '₹' + Math.abs(x).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
export const money = (v: number) => '₹' + (Math.round((+v || 0) * 100) / 100).toLocaleString('en-IN');
export const moneyC = (v: number) => {
  const x = +v || 0;
  const ax = Math.abs(x);
  return ax >= 1e7 ? '₹' + (x / 1e7).toFixed(2) + ' Cr' : ax >= 1e5 ? '₹' + (x / 1e5).toFixed(2) + ' L' : '₹' + Math.round(x).toLocaleString('en-IN');
};
export const fm = (v: number) => Math.round(+v || 0).toLocaleString('en-IN');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLbl = (ym: string) => {
  const m = /^(\d{4})-?(\d{2})$/.exec(ym || '');
  return m ? `${MON[+m[2] - 1]} ${m[1].slice(2)}` : ym;
};
export const dateShort = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]} ${MON[+m[2] - 1]}` : iso || '—';
};
/** period chip value of a date range: 'R:YYYY-MM-DD:YYYY-MM-DD' */
export const isRange = (p: string) => /^R:\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(p || '');
/** request body of a period: date range → from_date / to_date, else month */
export const periodBody = (p: string): Record<string, string> =>
  isRange(p) ? { from_date: p.slice(2, 12), to_date: p.slice(13, 23) } : { month: p };
/** 'DD-MM-YYYY' / 'YYYY-MM-DD' typed by the user → 'YYYY-MM-DD', '' when not a real date */
export const isoOf = (v: string) => {
  const t = (v || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  let y = 0, mo = 0, d = 0;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; } else if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t))) { y = +m[3]; mo = +m[2]; d = +m[1]; } else return '';
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
};
export const dateFull = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]} ${MON[+m[2] - 1]} ${m[1].slice(2)}` : iso || '—';
};
/** word-start search on design code / name */
export function matches(text: string, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const t = ' ' + text.toLowerCase().replace(/[^a-z0-9.]+/g, ' ');
  return words.every((w) => t.includes(' ' + w));
}
