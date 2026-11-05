// FILE: src/components/ShadeRecipeNEW/mock.ts
// In-memory demo backend (USE_MOCK in api.ts), seeded from the reference screens.
import { BrowseRow, Lookups, RecipeLine, ShadeRecipe, emptyLookups, todayISO } from './model';
import { newLocalId as newLocalIdSafe } from '../ProcessChemicalsNEW/model';

const wait = (ms = 280) => new Promise((r) => setTimeout(r, ms));
const GROUP = { id: '4', code: '4', name: '3.COLOUR', calc: 'Job Weight(Percentage)' };
const chem = (itemCode: string, itemName: string, make: string, uom: string, rate: number) =>
  ({ key: `${itemCode}|${make}|`, itemCode, itemName, make, model: '', uom, rate });
const CHEMICALS = [
  chem('710', 'DISPERSE YELLOW', 'NAND ENTERPRISE', 'GMS%', 0), chem('717', 'DISPERSE RED', 'NAND ENTERPRISE', 'GMS%', 0), chem('743', 'DISPERSE BLUE', 'NAND ENTERPRISE', 'GMS%', 0),
  chem('734', 'CORALENE BRILL. RED F3BS', 'COLOURTEX', 'GMS%', 830.5714), chem('795', 'CORACRYL RED C2B SUPRA', 'COLOURTEX', 'GMS%', 1010), chem('848', 'ACETIC ACID', 'GNFC', 'GMS%', 78.4091),
];
const line = (code: string, qty: string): RecipeLine => {
  const c = CHEMICALS.find((x) => x.itemCode === code)!;
  return { id: `l-${code}`, groupCode: GROUP.code, groupName: GROUP.name, calc: GROUP.calc, itemCode: code, itemName: c.itemName, make: c.make, model: '', uom: c.uom, qty, rate: c.rate };
};
const SHADES = [
  { id: '76198', label: 'LM-28201', itemCode: '8669', itemName: 'PRIYANKA', range: 'DARK', color: '' },
  { id: '66125', label: 'LM-104830 (55688) PINK', itemCode: '9076', itemName: 'SILVER LINE', range: 'MEDIUM', color: '' },
  { id: '78405', label: 'LM-78405', itemCode: '', itemName: '', range: 'DARK', color: '' },
];
const rec = (no: string, date: string, description: string, shadeCode: string, range: string, itemCode: string, itemName: string, lines: RecipeLine[] = [], extra: Partial<ShadeRecipe> = {}): ShadeRecipe => ({
  recipeNo: no, date, description, shadeCode, shadeName: SHADES.find((s) => s.id === shadeCode)?.label || description, itemCode, itemName, color: '', range,
  location: '', pageNo: '0', status: 'A', lines, ...extra,
});
let DB: ShadeRecipe[] = [
  rec('-203', '2025-02-03', 'LM-98442 (CFD-50)', '78405', 'DARK', '', '1.4*51 MM PF'),
  rec('1', '2011-03-15', 'LM-28201', '76198', 'DARK', '8669', 'PRIYANKA', [line('710', '2.37'), line('717', '1.33'), line('743', '0.11')], { color: 'RED' }),
  rec('2', '2011-03-15', 'LM-28188', '', 'DARK', '', '40 S POLYESTER'),
  rec('3', '2011-03-15', 'LM-28191', '', 'MEDIUM', '', '40 S POLYESTER'),
  rec('4', '2011-03-15', 'LM-28200', '', 'MEDIUM', '', '40 S POLYESTER'),
  rec('5', '2011-03-15', 'MLT-914', '', 'DARK', '', 'CHAMPION'),
  rec('6', '2011-03-15', '11042', '', 'DARK', '', '110/72 CATION'),
  rec('7', '2011-03-15', '11043', '', 'DARK', '', '110/72 CATION'),
  rec('8', '2011-03-15', 'NEW RECIPE 11044', '', 'DARK', '', '110/72 CATLON'),
  rec('9', '2017-08-14', 'LM-57511', '', 'DARK', '', ''),
  rec('10', '2017-08-14', 'LM-58335', '', 'LIGHT', '', ''),
  rec('11', '2011-03-12', 'HORLICKS', '', 'LIGHT', '', '150/72 BRIGHT'),
  rec('12', '2017-08-15', 'LM-57988', '', 'LIGHT', '', ''),
  rec('13', '2011-03-12', 'LM-30886', '', 'DARK', '', ''),
  rec('14', '2011-03-12', '75001', '', 'LIGHT', '', 'BHAGALPURI'),
  rec('15', '2011-03-12', '', '', 'LIGHT', '', 'BHAGALPURI'),
  rec('16', '2017-10-15', 'LM-33178', '', 'MEDIUM', '', '150/72 BRIGHT'),
  rec('39826952', '2026-05-30', 'LM-104830 (55688) PINK', '66125', 'MEDIUM', '9076', 'SILVER LINE', [line('734', '0.35'), line('795', '0.01'), line('848', '0.088')], { location: 'L1', pageNo: '60', color: 'PINK' }),
];
let NEXT = 98270227;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export const mock = {
  async lookups(): Promise<Lookups> {
    await wait();
    return {
      ...emptyLookups(),
      shades: SHADES,
      items: [{ id: '8669', label: 'PRIYANKA' }, { id: '9076', label: 'SILVER LINE' }, { id: '8700', label: '40 S POLYESTER' }, { id: '8710', label: 'CHAMPION' }],
      locations: [{ id: 'L1', label: 'ACRO VISCO-2' }, { id: 'L2', label: 'LAB' }],
      groups: [GROUP],
      chemicals: CHEMICALS,
    };
  },
  async browse(): Promise<BrowseRow[]> {
    await wait();
    return DB.map(({ recipeNo, date, description, shadeName, color, range, itemName }) => ({ recipeNo, date, description, shadeName, color, range, itemName }));
  },
  async show(no: string): Promise<ShadeRecipe | null> { await wait(220); const r = DB.find((x) => x.recipeNo === no); return r ? clone(r) : null; },
  async nextNo() { await wait(150); return String(NEXT); },
  async save(r: ShadeRecipe, mode: 'add' | 'modify', lookups: Lookups, originalNo = ''): Promise<{ recipe: ShadeRecipe; message: string }> {
    await wait(450);
    const shade = lookups.shades.find((s) => s.id === r.shadeCode)?.label || r.shadeName;
    const item = lookups.items.find((p) => p.id === r.itemCode)?.label || r.itemName;
    const saved: ShadeRecipe = { ...clone(r), shadeName: shade, itemName: item, lines: r.lines.map((l) => ({ ...l, id: /^new-/.test(l.id) ? `l-${newLocalIdSafe()}` : l.id })) };
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
