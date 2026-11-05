// FILE: src/components/PlanningNEW/mock.ts
// In-memory demo backend used while USE_MOCK is on (see api.ts). Seeded from the reference screens.
import { BrowseRow, Lookups, Opt, Plan, PlanLine, SourceRow, newLocalId, shadesOf, totalQty } from './model';

const wait = (ms = 260) => new Promise((r) => setTimeout(r, ms));

const LOOKUPS: Lookups = {
  processes: [
    { id: '001', label: 'DYEING PROCESSING' }, { id: '002', label: 'YARN DYEING' }, { id: '003', label: 'FINISH' }, { id: '008', label: 'CONNING' },
    { id: '010', label: 'PROCESS FIBER' }, { id: '20', label: 'TWISTING' }, { id: '21', label: 'D/W' }, { id: '22', label: 'AIR TEX' }, { id: '23', label: 'TEXTURISING' },
  ],
  machines: [
    { id: '1DYG', label: 'DYG1', group: 'DYEING' }, { id: '2DYG', label: 'DYG2', group: 'DYEING' }, { id: '3DYG', label: 'DYG3', group: 'DYEING' },
    { id: '4DYG', label: 'DYG4', group: 'DYEING' }, { id: '13DYG', label: 'DYG13', group: 'DYEING' }, { id: 'PANEL', label: 'PANEL ROOM', group: 'ALL KHATA' },
    { id: '1MC', label: '1 M/C NO.', group: 'AIR TEX M\\C' }, { id: '10MC', label: '10 M/C NO.', group: 'AIR TEX M\\C' }, { id: 'BOILER', label: 'BOILER', group: 'BIOLER' },
  ],
  merges: [
    { id: 'M1', label: 'MERGE-1 (STOCK)', stock: true }, { id: 'M2', label: 'MERGE-2 (STOCK)', stock: true }, { id: 'M9', label: 'MERGE-9 (PRODUCTION)', stock: false },
  ],
};

const src = (kind: 'SO' | 'JO', no: string, date: string, party: string, itemCode: string, itemName: string, shadeCode: string, shadeName: string, orderQty: number, balance: number, remarks = ''): SourceRow => ({
  key: `${kind}|${no}|${itemCode}|${shadeCode}`, kind, orderNo: no, orderDate: date, partyCode: party.slice(0, 4), partyName: party, itemCode, itemName, shadeCode, shadeName, orderQty, balance, remarks,
});
let SOURCES: SourceRow[] = [
  src('SO', '00006525', '2026-04-20', 'SANDEEP BHIKAJI PANDE-', '7195', '***', '4522', 'WASH', 10, 0),
  src('SO', '00023001', '2026-11-01', 'SHREEJI YARN INDIA P...', '3294', 'CAT SILK', '72587', '11093', 500, 320, 'SOFT HANDFEEL'),
  src('SO', '00023002', '2026-11-01', 'KEENARA TEXTILES', '3294', 'CAT SILK', '72588', '11094', 300, 300, 'SOFT HANDFEEL'),
  src('SO', '00023010', '2026-11-02', 'DASS WEAVES', '10772', 'VISCOS SILK PLUS', '9001', 'A-502/R.BLUE', 500, 500),
  src('JO', 'J-0041', '2026-10-28', 'MADHUSUDAN THREADS', '10776', 'VISCOS SILK PLUS', '9002', 'MVM-4016 D...', 200, 200, 'CHECK TWIST'),
  src('JO', 'J-0042', '2026-10-30', 'KEENARA TEXTILES', '3294', 'CAT SILK', '72587', '11093', 120, 120),
];

const L = (s: SourceRow, qty: number, available: number): PlanLine => ({
  id: `l-${s.key}`, kind: s.kind, orderNo: s.orderNo, orderDate: s.orderDate, partyCode: s.partyCode, partyName: s.partyName, itemCode: s.itemCode, itemName: s.itemName,
  shadeCode: s.shadeCode, shadeName: s.shadeName, orderQty: s.orderQty, available, qty: String(qty), remarks: s.remarks,
});
const mk = (no: string, prefix: string, date: string, type: Plan['type'], process: string, s: SourceRow, machine: string, qty: number, status = 'Pending', merge = ''): Plan => {
  const pr = LOOKUPS.processes.find((x) => x.label === process)!;
  const mc = LOOKUPS.machines.find((x) => x.label === machine)!;
  const mg = LOOKUPS.merges.find((x) => x.id === merge);
  return {
    prefix, voucherNo: no, date, type, processCode: pr.id, processName: pr.label, itemCode: s.itemCode, itemName: s.itemName, shadeCode: s.shadeCode, shadeName: s.shadeName,
    mergeCode: mg?.id ?? '', mergeName: mg?.label ?? '', machineCode: mc.id, machineName: mc.label, remarks: '', status, lines: [L(s, qty, qty)],
  };
};
let PLANS: Plan[] = [
  mk('01913', '04', '2026-04-23', 'DYEING', 'DYEING PROCESSING', SOURCES[0], 'DYG13', 10),
  mk('01995', '11', '2026-11-02', 'DYEING', 'DYEING PROCESSING', SOURCES[1], 'DYG4', 180),
  mk('01996', '11', '2026-11-02', 'CONING', 'CONNING', SOURCES[3], 'DYG1', 100, 'Processed', 'M1'),
];
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const toBrowse = (p: Plan): BrowseRow => ({
  voucherNo: p.voucherNo, prefix: p.prefix, date: p.date, type: p.type, process: p.processName, itemName: p.itemName, shade: p.shadeName, machine: p.machineName,
  qty: totalQty(p.lines), party: p.lines[0]?.partyName ?? '', status: p.status,
});

export const mock = {
  async lookups(): Promise<Lookups> { await wait(); return clone(LOOKUPS); },
  async browse(): Promise<BrowseRow[]> { await wait(); return PLANS.map(toBrowse); },
  async show(no: string): Promise<Plan | null> { await wait(); const p = PLANS.find((x) => x.voucherNo === no); return p ? clone(p) : null; },
  async next(): Promise<{ prefix: string; no: string }> { await wait(120); return { prefix: '11', no: String(Math.max(2000, ...PLANS.map((p) => Number(p.voucherNo) || 0)) + 1).padStart(5, '0') }; },
  async sources(): Promise<SourceRow[]> { await wait(); return clone(SOURCES.filter((s) => s.balance > 0)); },
  async shades(itemCodes: string[]): Promise<Opt[]> { await wait(120); return shadesOf(SOURCES.filter((s) => itemCodes.includes(s.itemCode))); },
  async save(p: Plan, mode: 'add' | 'modify', originalNo: string): Promise<Plan> {
    await wait();
    const no = p.voucherNo;
    if (PLANS.some((x) => x.voucherNo === no && x.voucherNo !== (mode === 'modify' ? originalNo : '\u0000'))) throw new Error(`Voucher ${no} already exists.`);
    const saved: Plan = { ...clone(p), status: 'Pending', lines: p.lines.map((l) => ({ ...clone(l), id: /^new-/.test(l.id) ? `l-${newLocalId()}` : l.id })) };
    PLANS = mode === 'add' ? [...PLANS, saved] : PLANS.map((x) => (x.voucherNo === originalNo ? saved : x));
    return clone(saved);
  },
  async remove(no: string): Promise<string> {
    await wait();
    const p = PLANS.find((x) => x.voucherNo === no);
    if (p && String(p.status).toLowerCase() !== 'pending') throw new Error('This plan is already in process and cannot be deleted.');
    PLANS = PLANS.filter((x) => x.voucherNo !== no);
    return `Planning ${no} deleted.`;
  },
};
