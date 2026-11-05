// FILE: src/components/ProcessChemicalsNEW/mock.ts
// In-memory demo backend used while USE_MOCK is on (see api.ts). Seeded from the reference screens
// so the whole module — Add, Modify, Delete, Browse, Copy Recipe — can be tried without a server.
// Nothing here is bundled into behaviour when USE_MOCK is off.
import { ChemOpt, GroupOpt, Lookups, Recipe, RecipeLine, emptyLookups, newLocalId, todayISO } from './model';

const wait = (ms = 280) => new Promise((r) => setTimeout(r, ms));

const GROUPS: GroupOpt[] = [
  { id: '3', code: '3', name: '3. DYEING CHEMICAL', calc: 'Water Capacity(Units)' },
  { id: '6', code: '6', name: '6. R/C NUTRLISE', calc: 'Water Capacity(Units)' },
  { id: '30', code: '30', name: '4. COTTON CHEMICAL 4', calc: 'Job Weight(Percentage)' },
  { id: '31', code: '31', name: '4. COTTON DYES', calc: 'Job Weight(Percentage)' },
];
const chem = (itemCode: string, itemName: string, make: string, model: string, uom: string, rate: number): ChemOpt => ({
  key: `${itemCode}|${make}|${model}`, itemCode, itemName, make, model, uom, rate,
});
const CHEMICALS: ChemOpt[] = [
  chem('4025', 'RUCOGEN KWIC', 'ATUL CHEMICALS', '', 'GMS%', 210),
  chem('4060', 'RUCO-STAB FBPS', 'ATUL CHEMICALS', '', 'GMS%', 78),
  chem('641', 'SODA ASH', 'TATA', '.', 'GMS%', 30.89),
  chem('702', 'CAUSTIC SODA', 'SHREERAM', '', 'GMS%', 56.33),
  chem('629', 'HYDROGEN PEROXIDE', 'GACL', '', 'GMS%', 30.5),
  chem('1409', 'LEVOCOL NZ CK', 'COLOURTEX', '', 'GMS%', 64),
  chem('848', 'ANTI-CREASING AGENT', 'GNFC', '', 'GMS', 0),
  chem('532', 'SEQUESTERING AGENT', 'UNITECH RE...', '', 'GMS', 0),
  chem('541', 'LEVELLING AGENT', 'I.G.SURF', '', 'GMS', 0),
  chem('3911', 'ACETIC ACID', 'JUPITAR CHEMICALS', '5023', 'GMS', 0),
  chem('3282', 'URI SOFTENER', '--', 'KOHLER URI...', 'GMS', 0),
  chem('516', 'NEUTRALISER', 'GNFC', '', 'GMS', 0),
];

const line = (groupCode: string, itemCode: string, make: string, qty: string): RecipeLine => {
  const g = GROUPS.find((x) => x.code === groupCode)!;
  const c = CHEMICALS.find((x) => x.itemCode === itemCode && x.make.startsWith(make))!;
  return { id: `l-${groupCode}-${itemCode}`, groupCode, groupName: g.name, calc: g.calc, itemCode, itemName: c.itemName, make: c.make, model: c.model, uom: c.uom, qty, rate: c.rate };
};

const rec = (no: number, date: string, description: string, item: string, lines: RecipeLine[] = []): Recipe => ({
  recipeNo: String(no), date, description, processCode: '1', processName: 'DYEING PROCESSING', itemCode: item ? '2349104' : '', itemName: item,
  location: '', pageNo: '0', status: 'A', lines,
});

const lt = [
  line('30', '4025', 'ATUL', '500'), line('30', '4060', 'ATUL', '200'), line('30', '641', 'TATA', '2000'),
  line('30', '702', 'SHREERAM', '2000'), line('30', '629', 'GACL', '7000'), line('31', '1409', 'COLOURTEX', '200'),
];
const dyeing = [
  line('3', '848', 'GNFC', '0.07'), line('3', '532', 'UNITECH', '0.05'), line('3', '541', 'I.G', '0.5'),
  line('3', '3911', 'JUPITAR', '0.3'), line('3', '3282', '--', '0.5'), line('6', '516', 'GNFC', '0.1'),
];

let DB: Recipe[] = [
  rec(1, '2020-08-17', '21/11/15 FC LT', '21 S FC', lt),
  rec(2, '2020-08-19', '21/11/15 FC MDIUN', '21 S FC', lt.slice(0, 3)),
  rec(3, '2020-10-24', '21/11/15 FC DARK', '21 S FC', lt.slice(0, 4)),
  rec(4, '2021-02-02', 'NYLON  100 C', 'FLASH'),
  rec(5, '2025-02-27', 'MACHINE CLEANING', "2/12'S MECON P/C 50/5..."),
  rec(6, '2025-05-01', '20 S VISCOSE LT', '20 S VISCOSE'),
  rec(7, '2025-05-01', '20 S VISCOSE MIDIUM', '20 S VISCOSE'),
  rec(8, '2025-05-01', '20 S VISCOSE DARK', '20 S VISCOSE'),
  rec(9, '2025-05-01', '20 S VISCOSE EX. DARK', '20 S VISCOSE'),
  rec(10, '2021-07-13', 'HUMSAFAR - DARK', ''),
  rec(11, '2021-07-13', 'HUMSAFAR - LIGHT/M...', ''),
  rec(12, '2022-01-20', 'POLY/CAT-HY/CO', ''),
  rec(13, '2022-12-12', 'DYEING PROCESSING', '', dyeing),
  rec(14, '2023-03-19', ' MCL-281 WHITE', ''),
  rec(15, '2024-12-23', 'MCLD-1970 WHITE', ''),
  rec(16, '2023-03-20', '21/11/15 FC EX. DARK', '21 S FC'),
  rec(100, '2023-05-18', '1208 BLEECH PRO.', '21 S FC'),
  rec(101, '2011-04-01', 'SENSETIVE (LIGHT)', ''),
  rec(102, '2011-04-01', ' (NEW CHEMICAL)', ''),
  rec(103, '2011-04-01', 'SENSETIVE  (212K)', ''),
  rec(104, '2011-04-02', 'WHITE', ''),
];
let NEXT = 208;

/** Demo only: the real Color comes from the browse API (`color`). */
const DEMO_COLOR: Record<string, string> = { '1': 'LIGHT', '2': 'MEDIUM', '3': 'DARK', '16': 'EXTRA DARK', '100': 'WHITE', '13': 'BLACK' };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export const mock = {
  async lookups(): Promise<Lookups> {
    await wait();
    return {
      ...emptyLookups(),
      processes: [{ id: '1', label: 'DYEING PROCESSING' }, { id: '2', label: 'FINISHING' }, { id: '3', label: 'SCOURING & BLEACHING' }],
      items: [{ id: '2349104', label: '21 S FC' }, { id: '2349105', label: '20 S VISCOSE' }, { id: '2349106', label: 'FLASH' }],
      locations: [{ id: 'L1', label: 'DYE HOUSE' }, { id: 'L2', label: 'LAB' }],
      groups: GROUPS,
      chemicals: CHEMICALS,
    };
  },
  async browse() {
    await wait();
    return DB.map(({ recipeNo, date, description, processName, itemName }) => ({ recipeNo, date, description, process: processName, color: DEMO_COLOR[recipeNo] || '', itemName }));
  },
  async show(no: string): Promise<Recipe | null> {
    await wait(220);
    const r = DB.find((x) => x.recipeNo === no);
    return r ? clone(r) : null;
  },
  async nextNo() { await wait(150); return String(NEXT); },
  async save(r: Recipe, mode: 'add' | 'modify', lookups: Lookups, originalNo = ''): Promise<{ recipe: Recipe; message: string }> {
    await wait(450);
    const proc = lookups.processes.find((p) => p.id === r.processCode)?.label || r.processName;
    const item = lookups.items.find((p) => p.id === r.itemCode)?.label || r.itemName;
    const saved: Recipe = { ...clone(r), processName: proc, itemName: item, lines: r.lines.map((l) => ({ ...l, id: /^new-/.test(l.id) ? `l-${newLocalId()}` : l.id })) };
    const no = String(r.recipeNo).trim();
    if (mode === 'add') {
      if (DB.some((x) => x.recipeNo === no)) throw new Error(`Recipe no. ${no} already exists.`);
      saved.recipeNo = no; // number and date are the ones the user entered
      DB = [...DB, saved];
      if (Number(no) >= NEXT) NEXT = Number(no) + 1;
    } else {
      const was = originalNo || no;
      if (!DB.some((x) => x.recipeNo === was)) throw new Error('This recipe no longer exists.');
      if (no !== was && DB.some((x) => x.recipeNo === no)) throw new Error(`Recipe no. ${no} already exists.`);
      DB = DB.map((x) => (x.recipeNo === was ? saved : x));
    }
    return { recipe: clone(saved), message: mode === 'add' ? `Recipe ${saved.recipeNo} saved successfully.` : `Recipe ${saved.recipeNo} updated successfully.` };
  },
  async remove(no: string) {
    await wait(380);
    if (!DB.some((x) => x.recipeNo === no)) throw new Error('This recipe no longer exists.');
    DB = DB.filter((x) => x.recipeNo !== no);
    return `Recipe ${no} deleted successfully.`;
  },
};
