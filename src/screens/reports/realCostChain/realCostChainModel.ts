// FILE: src/screens/reports/realCostChain/realCostChainModel.ts
// Types + normalizers for Reports → Real Costing Chain (POST /api/real_cost_chain/report, RealCostChainController).

export type Assumed = {
  id: string; code: string; ts: string;
  rm: number; weaving: number; weaving_rate: number; ppi_table: number; greige_mfg: number; has_fin: boolean;
  shrink: number; fent: number; proc: number; warp_waste: number; fin_shrink: number; final: number; costing_final: number;
};
export type Actual = {
  rm: number; weaving: number; greige_mfg: number; short_pct: number; short: number; has_short: boolean;
  fin_shrink_pct: number; fin_shrink_source: string; shrink: number; fent_pct: number; fent: number;
  proc: number; proc_metres: number; proc_source: string; final: number;
};
export type BeamCost = {
  beamuid: string; beam: string; loom: string; shed: 'Rapier' | 'Waterjet' | 'Other' | string; date: string;
  rate: number | null; metres: number; weave_per_m: number; greige_per_m: number; cost: number;
};
export type DesignChain = {
  key: string; prpcode: string; dsncode: string; name: string;
  has_costing: boolean; has_fin: boolean; made: number; nbeams: number;
  actual: Actual; assumed: Assumed | null; act_val: number; asm_val: number;
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
          rm: n(a.rm), weaving: n(a.weaving), greige_mfg: n(a.greige_mfg), short_pct: n(a.short_pct), short: n(a.short), has_short: !!a.has_short,
          fin_shrink_pct: n(a.fin_shrink_pct), fin_shrink_source: s(a.fin_shrink_source), shrink: n(a.shrink), fent_pct: n(a.fent_pct), fent: n(a.fent),
          proc: n(a.proc), proc_metres: n(a.proc_metres), proc_source: s(a.proc_source), final: n(a.final),
        },
        assumed: m && typeof m === 'object' ? {
          id: s(m.id), code: s(m.code), ts: s(m.ts), rm: n(m.rm), weaving: n(m.weaving), weaving_rate: n(m.weaving_rate), ppi_table: n(m.ppi_table),
          greige_mfg: n(m.greige_mfg), has_fin: !!m.has_fin, shrink: n(m.shrink), fent: n(m.fent), proc: n(m.proc),
          warp_waste: n(m.warp_waste), fin_shrink: n(m.fin_shrink), final: n(m.final), costing_final: n(m.costing_final),
        } : null,
        act_val: n(d.act_val), asm_val: n(d.asm_val),
        mill: d.mill ? { out: n(d.mill.out), in: n(d.mill.in), takas: n(d.mill.takas) } : null,
        learned_warp: nn(d.learned_warp), learned_fin: nn(d.learned_fin),
        flags: { no_rate_metres: n(d.flags?.no_rate_metres), no_pick_metres: n(d.flags?.no_pick_metres) },
        beams: arr(d.beams).map((b: any) => ({
          beamuid: s(b.beamuid), beam: s(b.beam), loom: s(b.loom), shed: s(b.shed), date: s(b.date), rate: nn(b.rate),
          metres: n(b.metres), weave_per_m: n(b.weave_per_m), greige_per_m: n(b.greige_per_m), cost: n(b.cost),
        })),
      };
    }),
    rates: arr(raw.rates).map((r: any) => ({ ym: s(r.ym), section: s(r.section), rate: nn(r.rate), status: s(r.status), note: s(r.note) })),
  };
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
    { label: 'Raw material', asm: a?.rm || 0, act: A.rm },
    { label: 'Weaving', asm: a?.weaving || 0, act: A.weaving },
    { label: 'Greige mfg', asm: a?.greige_mfg || 0, act: A.greige_mfg },
  ];
  if (A.short > 0 || (a && a.warp_waste)) rows.push({ label: 'Warp shortage', asm: (a?.greige_mfg || A.greige_mfg) * ((a?.warp_waste || 0) / 100), act: A.short });
  if (d.has_fin) {
    rows.push({ label: 'Finish shrink', asm: a?.shrink || 0, act: A.shrink });
    rows.push({ label: `Fent wastage · ${A.fent_pct}%`, asm: a?.fent || 0, act: A.fent });
    rows.push({ label: 'Processing', asm: a?.proc || 0, act: A.proc });
  }
  rows.push({ label: 'Final ₹/m', asm: a?.final || 0, act: A.final, bold: true });
  return rows;
}

/* ------------------------------ formatting ------------------------------ */
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
