// FILE: src/features/beamInOut/job.ts
// Beam JOB work — pure logic (no React):
//   Outward: yarn sent with the beams (GRYOut on the server). The user only SCANS cartons: every carton goes to the line of its
//            merge · item · grade · shade (all from the carton), qty = what the carton has (lower it = PARTIAL issue).
//            GST is worked out on the yarn only — empty beams never carry GST.
//   Inward:  yarn back on the beams (GRYInw + annexure GRYInwD1A). Per beam: gross weight − beam weight = yarn.
//            Per outward line: sent · open · on beams → shortage / wastage / loose; excess when the beams bring more than open.
import type { BeamRow, Opt } from './types';

export const JEPS = 0.0005;
const num = (v: unknown): number => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;
const str = (v: unknown) => String(v ?? '').trim();
const lower = (r: any): Record<string, any> => {
  const o: Record<string, any> = {};
  if (r && typeof r === 'object') Object.keys(r).forEach(k => { o[k.toLowerCase()] = r[k]; });
  return o;
};
let seq = 0;
const newKey = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

/** a carton in stock (scan / merge help) */
export interface JobCartonHit {
  cartonNo: string; qty: number; chees: number; stockFrom: string; location: string;
  mergeCode: string; mergeName: string; itemCode: string; itemName: string;
  gradeCode: string; gradeName: string; shadeCode: string; shadeName: string; strCode: string;
  /** HSN of the item (item master) */
  hsnCode: string;
}

/** a carton on a job line; wt can be lower than avail = partial issue */
export interface JobPick { cartonNo: string; wt: string; chees: string; avail: number; availChees: number; stockFrom: string; location: string }

export interface JobLine {
  key: string;
  itemCode: string; itemName: string; mergeCode: string; mergeName: string;
  gradeCode: string; gradeName: string; shadeCode: string; shadeName: string; strCode: string;
  denier: string; rate: string; hsnCode: string;
  cartons: JobPick[];
  /** saved: received back so far (locks when > 0) */
  received?: number;
}

export interface JobOut {
  on: boolean;
  /** GRYOut.UId once saved (print: yarn_job_outward) */
  uid?: number;
  jobType: Opt | null;
  /** store the yarn goes out from — only its cartons can be scanned (GRYOut.StrCode) */
  store: Opt | null;
  lines: JobLine[];
  outNo?: string;
  annexureNo?: string;
  settled?: boolean;
}

/** a yarn line of a job outward, as the inward sees it */
export interface JobOutLine { outUid: number; outSrNo: number; outNo: string; annexureNo: string; itemName: string; mergeName: string; sent: number; balance: number; rate: number }
export interface JobSettle { shortage: string; wastage: string; loose: string }
export interface JobIn {
  outUid: number; outNo: string; annexureNo: string;
  lines: JobOutLine[];
  /** per beam row key: gross weight typed + the yarn line it carries */
  beams: Record<string, { gross: string; outSrNo: number }>;
  settle: Record<number, JobSettle>;
  inwNo?: string;
  locked?: boolean;
}
export interface JobOutwardHit { outUid: number; outNo: string; annexureNo: string; beamOutwardUid: number; beamOutwardNo: string; sent: number; balance: number }

export const emptyJob = (): JobOut => ({ on: false, jobType: null, store: null, lines: [] });
export const emptyJobIn = (): JobIn => ({ outUid: 0, outNo: '', annexureNo: '', lines: [], beams: {}, settle: {} });

/* ------------------------------------------------------------------ */
/* rows from the server                                                */
/* ------------------------------------------------------------------ */

export const cartonHitFromRow = (raw: any): JobCartonHit => {
  const r = lower(raw);
  return {
    cartonNo: str(r.carton_no), qty: r3(num(r.qty)), chees: Math.round(num(r.chees)), stockFrom: str(r.stock_from), location: str(r.location),
    mergeCode: str(r.merge_code), mergeName: str(r.merge_name), itemCode: str(r.item_code), itemName: str(r.item_name),
    gradeCode: str(r.grade_code), gradeName: str(r.grade_name), shadeCode: str(r.shade_code), shadeName: str(r.shade_name), strCode: str(r.str_code),
    hsnCode: str(r.hsn_code),
  };
};
export const outLineFromRow = (raw: any): JobOutLine => {
  const r = lower(raw);
  return {
    outUid: num(r.out_uid), outSrNo: num(r.out_sr_no), outNo: str(r.out_no), annexureNo: str(r.annexure_no), itemName: str(r.item_name),
    mergeName: str(r.merge_name) || str(r.merge_code), sent: r3(num(r.sent)), balance: r3(num(r.balance)), rate: num(r.rate),
  };
};
export const jobOutwardFromRow = (raw: any): JobOutwardHit => {
  const r = lower(raw);
  return {
    outUid: num(r.out_uid), outNo: str(r.out_no), annexureNo: str(r.annexure_no), beamOutwardUid: num(r.beam_outward_uid),
    beamOutwardNo: str(r.beam_outward_no), sent: r3(num(r.sent)), balance: r3(num(r.balance)),
  };
};

/** show_data.job → form part */
export function jobFromShow(raw: any): JobOut {
  const j = lower(raw);
  if (!num(j.uid)) return emptyJob();
  return {
    on: true,
    uid: num(j.uid),
    jobType: str(j.job_type) ? { code: str(j.job_type), name: str(j.job_name) || str(j.job_type) } : null,
    store: str(j.str_code) ? { code: str(j.str_code), name: str(j.str_name) || str(j.str_code) } : null,
    outNo: str(j.out_no), annexureNo: str(j.annexure_no), settled: !!j.settled,
    lines: (Array.isArray(j.lines) ? j.lines : []).map((x: any): JobLine => {
      const l = lower(x);
      return {
        key: newKey('j'), itemCode: str(l.item_code), itemName: str(l.item_name), mergeCode: str(l.merge_code), mergeName: str(l.merge_name),
        gradeCode: str(l.grade_code), gradeName: '', shadeCode: str(l.shade_code), shadeName: '', strCode: '', denier: str(l.denier),
        rate: num(l.rate) ? String(r2(num(l.rate))) : '', hsnCode: str(l.hsn_code), received: num(l.received),
        cartons: (Array.isArray(l.cartons) ? l.cartons : []).map((c: any): JobPick => {
          const k = lower(c);
          // saved weight is the issued qty; on modify the stock help counts it back in, so avail = at least that
          return { cartonNo: str(k.carton_no), wt: r3(num(k.weight)).toFixed(3), chees: String(Math.round(num(k.chees))), avail: r3(num(k.weight)), availChees: Math.round(num(k.chees)), stockFrom: '', location: '' };
        }),
      };
    }),
  };
}

/** show_data.jobin → form part (beams matched to the beam rows by beam no.) */
export function jobInFromShow(raw: any, rows: BeamRow[]): JobIn {
  const j = lower(raw);
  if (!num(j.uid)) return emptyJobIn();
  const lines = (Array.isArray(j.out_lines) ? j.out_lines : []).map(outLineFromRow);
  const beams: JobIn['beams'] = {};
  (Array.isArray(j.beams) ? j.beams : []).forEach((x: any) => {
    const b = lower(x);
    const row = rows.find(r => r.beamNo.trim().toUpperCase() === str(b.beam_no).toUpperCase() && !beams[r.key]);
    if (row) beams[row.key] = { gross: r3(num(b.gross_wt)).toFixed(3), outSrNo: num(b.out_sr_no) };
  });
  const settle: JobIn['settle'] = {};
  (Array.isArray(j.lines) ? j.lines : []).forEach((x: any) => {
    const l = lower(x);
    const f = (v: unknown) => (num(v) ? r3(num(v)).toFixed(3) : '');
    settle[num(l.out_sr_no)] = { shortage: f(l.shortage), wastage: f(l.wastage), loose: f(l.loose) };
  });
  return { outUid: num(j.out_uid), outNo: lines[0]?.outNo ?? '', annexureNo: lines[0]?.annexureNo ?? '', lines, beams, settle, inwNo: str(j.inw_no), locked: !!j.locked };
}

/* ------------------------------------------------------------------ */
/* outward: lines from scanned cartons                                 */
/* ------------------------------------------------------------------ */

const lineKeyOf = (x: { mergeCode: string; itemCode: string; gradeCode: string; shadeCode: string }) => [x.mergeCode, x.itemCode, x.gradeCode, x.shadeCode].join('|');
export const sameCarton = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();
export const pickedLine = (job: JobOut, cartonNo: string) => job.lines.find(l => l.cartons.some(c => sameCarton(c.cartonNo, cartonNo)));

/**
 * Add a carton: to the line of its merge · item · grade · shade (a new line when none), whole carton.
 * Returns the new job and a message for the scan strip.
 */
export function addCarton(job: JobOut, hit: JobCartonHit): { job: JobOut; ok: boolean; message: string } {
  const on = pickedLine(job, hit.cartonNo);
  if (on) return { job, ok: false, message: `Carton ${hit.cartonNo} is already on merge ${on.mergeName || on.mergeCode}.` };
  if (!(hit.qty > JEPS)) return { job, ok: false, message: `Carton ${hit.cartonNo} has no balance left.` };
  if (!hit.gradeCode || !hit.shadeCode) return { job, ok: false, message: `Carton ${hit.cartonNo} has no ${!hit.gradeCode ? 'grade' : 'shade'} in stock — it can't go on a job outward.` };
  const pick: JobPick = { cartonNo: hit.cartonNo, wt: hit.qty.toFixed(3), chees: String(hit.chees || 0), avail: hit.qty, availChees: hit.chees, stockFrom: hit.stockFrom, location: hit.location };
  const k = lineKeyOf(hit);
  const at = job.lines.findIndex(l => lineKeyOf(l) === k);
  const prevRate = job.lines.find(l => l.itemCode === hit.itemCode)?.rate ?? '';
  const lines = at >= 0
    ? job.lines.map((l, i) => (i === at ? { ...l, cartons: [...l.cartons, pick] } : l))
    : [...job.lines, {
      key: newKey('j'), itemCode: hit.itemCode, itemName: hit.itemName, mergeCode: hit.mergeCode, mergeName: hit.mergeName,
      gradeCode: hit.gradeCode, gradeName: hit.gradeName, shadeCode: hit.shadeCode, shadeName: hit.shadeName, strCode: hit.strCode,
      denier: '', rate: prevRate, hsnCode: hit.hsnCode, cartons: [pick],
    }];
  const line = lines[at >= 0 ? at : lines.length - 1];
  return { job: { ...job, on: true, lines }, ok: true, message: `Added ${hit.cartonNo} · ${hit.qty.toFixed(3)} to merge ${line.mergeName || line.mergeCode} (${line.cartons.length} carton${line.cartons.length === 1 ? '' : 's'}, ${jobLineQty(line).toFixed(3)})` };
}

export function removeCarton(job: JobOut, cartonNo: string): JobOut {
  const lines = job.lines.map(l => ({ ...l, cartons: l.cartons.filter(c => !sameCarton(c.cartonNo, cartonNo)) })).filter(l => l.cartons.length);
  return { ...job, lines };
}

/** change one picked carton (qty for a partial issue, chees) */
export function setPick(job: JobOut, cartonNo: string, patch: Partial<JobPick>): JobOut {
  return { ...job, lines: job.lines.map(l => ({ ...l, cartons: l.cartons.map(c => (sameCarton(c.cartonNo, cartonNo) ? { ...c, ...patch } : c)) })) };
}
export const setLine = (job: JobOut, key: string, patch: Partial<JobLine>): JobOut => ({ ...job, lines: job.lines.map(l => (l.key === key ? { ...l, ...patch } : l)) });

/** chees for part of a carton: in proportion, at least 1 */
export const cheesFor = (wt: number, avail: number, chees: number) => (chees <= 0 ? 0 : avail <= 0 || wt >= avail - JEPS ? chees : Math.max(1, Math.round((chees * wt) / avail)));

export const jobLineQty = (l: JobLine) => r3(l.cartons.reduce((s, c) => s + num(c.wt), 0));

/**
 * GST of a yarn line from the voucher's GST rates (Tax Detail of the entry type), split by state:
 *   party in the property's state → CGST + SGST, other state → IGST (rates: logic.gstRates, which drops the lines that don't apply)
 */
export function jobLineGst(l: JobLine, rates: { C: number; S: number; I: number }) {
  const amount = r2(jobLineQty(l) * num(l.rate));
  const c = r2((amount * rates.C) / 100);
  const s = r2((amount * rates.S) / 100);
  const i = r2((amount * rates.I) / 100);
  return { amount, cgstPer: rates.C, cgst: c, sgstPer: rates.S, sgst: s, igstPer: rates.I, igst: i, total: r2(amount + c + s + i) };
}
export const jobLineAmount = (l: JobLine) => r2(jobLineQty(l) * num(l.rate));
export const jobTotals = (job: JobOut) => ({
  lines: job.on ? job.lines.length : 0,
  cartons: job.on ? job.lines.reduce((s, l) => s + l.cartons.length, 0) : 0,
  qty: job.on ? r3(job.lines.reduce((s, l) => s + jobLineQty(l), 0)) : 0,
  gross: job.on ? r2(job.lines.reduce((s, l) => s + jobLineAmount(l), 0)) : 0,
});
/** GST works on the yarn; without yarn every GST line is 0 (empty beams carry no GST) */
export const hasJobYarn = (job?: JobOut) => !!job?.on && job.lines.length > 0;

export function validateJob(job?: JobOut): string | null {
  if (!job?.on) return null;
  if (!job.store) return 'Job yarn: select the store.';
  if (!job.lines.length) return 'Job yarn: scan the cartons going with the beams (or switch the job yarn off).';
  if (!job.jobType) return 'Job yarn: select the job type.';
  for (const l of job.lines) {
    const label = `Merge ${l.mergeName || l.mergeCode}`;
    if (num(l.rate) < 0) return `${label}: rate can not be negative.`;
    if (!l.hsnCode.trim()) return `${label}: HSN code is required (job challan / e-way bill).`;
    for (const c of l.cartons) {
      const w = num(c.wt);
      if (!(w > 0)) return `${label}: carton ${c.cartonNo} — enter the qty to send.`;
      if (w > c.avail + JEPS) return `${label}: carton ${c.cartonNo} has only ${c.avail.toFixed(3)}.`;
    }
  }
  return null;
}

export function jobPayload(job?: JobOut) {
  const on = hasJobYarn(job);
  return {
    JobType: on ? num(job!.jobType?.code) : 0,
    StrCode: on ? (job!.store?.code ?? '') : '',
    lines: on ? job!.lines.map(l => ({
      ItmCode: num(l.itemCode), MerCode: num(l.mergeCode), GrdCode: num(l.gradeCode), ShdCode: num(l.shadeCode), Denier: l.denier.trim(),
      Rate: r2(num(l.rate)), HsnCode: l.hsnCode.trim(),
      cartons: l.cartons.map(c => ({ CartNo: c.cartonNo, Wt: r3(num(c.wt)), Chees: Math.round(num(c.chees)) })),
    })) : [],
  };
}

/* ------------------------------------------------------------------ */
/* inward: beams + annexure                                            */
/* ------------------------------------------------------------------ */

/** yarn on a beam = gross − beam weight (the beam row's weight from the beam master) */
export const beamYarn = (gross: unknown, beamWt: unknown) => r3(num(gross) - num(beamWt));

export interface SettleView {
  line: JobOutLine; onBeams: number; beams: number;
  shortage: number; wastage: number; loose: number; excess: number;
  /** still open after this inward (0 = closed) */
  rest: number;
}

/** annexure of every outward line from the beams typed + shortage / wastage / loose */
export function settlement(ji: JobIn, rows: BeamRow[]): SettleView[] {
  return ji.lines.map(line => {
    const mine = rows.filter(r => {
      const b = ji.beams[r.key];
      return b && num(b.gross) > 0 && (b.outSrNo || (ji.lines.length === 1 ? line.outSrNo : 0)) === line.outSrNo;
    });
    const onBeams = r3(mine.reduce((s, r) => s + Math.max(0, beamYarn(ji.beams[r.key].gross, r.weight)), 0));
    const s = ji.settle[line.outSrNo] ?? { shortage: '', wastage: '', loose: '' };
    const excess = r3(Math.max(0, onBeams + num(s.loose) - line.balance));
    const shortage = excess > 0 ? 0 : r3(num(s.shortage));
    const wastage = r3(num(s.wastage));
    const loose = r3(num(s.loose));
    const rest = excess > 0 ? 0 : r3(line.balance - onBeams - loose - shortage - wastage);
    return { line, onBeams, beams: mine.length, shortage, wastage, loose, excess, rest };
  });
}

export function validateJobIn(ji: JobIn | undefined, rows: BeamRow[]): string | null {
  if (!ji?.outUid) return null;
  for (const r of rows) {
    const b = ji.beams[r.key];
    if (!b || !str(b.gross)) continue;
    const y = beamYarn(b.gross, r.weight);
    if (!(y > 0)) return `Beam ${r.beamNo}: gross weight must be more than the beam weight (${num(r.weight).toFixed(3)}).`;
    if (ji.lines.length > 1 && !b.outSrNo) return `Beam ${r.beamNo}: choose the yarn line it carries.`;
  }
  const view = settlement(ji, rows);
  if (!view.some(v => v.onBeams > 0 || v.loose > 0 || v.shortage > 0 || v.wastage > 0))
    return 'Job yarn: enter the gross weight of the beams that came back (or switch the job yarn off).';
  for (const v of view) {
    if (v.rest < -JEPS) return `Merge ${v.line.mergeName}: shortage + wastage + loose is more than what is open (${v.line.balance.toFixed(3)}).`;
    if (v.excess > 0 && (v.shortage > 0)) return `Merge ${v.line.mergeName}: enter either shortage or excess, not both.`;
  }
  return null;
}

export function jobInPayload(ji: JobIn | undefined, rows: BeamRow[]) {
  if (!ji?.outUid) return { out_uid: 0, beams: [], lines: [] };
  const view = settlement(ji, rows);
  return {
    out_uid: ji.outUid,
    beams: rows.filter(r => ji.beams[r.key] && num(ji.beams[r.key].gross) > 0).map(r => ({
      BeamCode: r.beamCode, BeamSrNo: r.beamSrNo, BeamNo: r.beamNo,
      OutSrNo: ji.beams[r.key].outSrNo || (ji.lines.length === 1 ? ji.lines[0].outSrNo : 0),
      GrossWt: r3(num(ji.beams[r.key].gross)), TareWt: r3(num(r.weight)),
    })),
    lines: view.filter(v => v.onBeams > 0 || v.loose > 0 || v.shortage > 0 || v.wastage > 0 || v.excess > 0).map(v => ({
      OutSrNo: v.line.outSrNo, Loose: v.loose, Shortage: v.shortage, Excess: v.excess, Wastage: v.wastage,
    })),
  };
}

/** every picked carton with its line, newest scan first (the scan list shows cartons, not lines) */
export const pickedCartons = (job: JobOut) =>
  job.lines.flatMap(l => l.cartons.map((c, i) => ({ line: l, carton: c, order: i }))).reverse();
