// FILE: src/components/ProductionOrderNEW/format.ts
// Number / date helpers shared by the Production Order (NEW) screens.
export type Row = Record<string, any>;

export const round3 = (value: any): number => Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;

// en-IN digit grouping without relying on Intl (older Android JSC).
const groupIN = (intStr: string): string => {
  const neg = intStr.startsWith('-');
  const s = neg ? intStr.slice(1) : intStr;
  if (s.length <= 3) return (neg ? '-' : '') + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-' : '') + rest + ',' + last3;
};

export const fmt = (value: any, maxDecimals = 3): string => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  const fixed = n.toFixed(maxDecimals).replace(/\.?0+$/, '');
  const [i, d] = fixed.split('.');
  return groupIN(i) + (d ? '.' + d : '');
};

export const money = (value: any): string => {
  const n = Number(value || 0);
  const [i, d] = (Number.isFinite(n) ? n : 0).toFixed(2).split('.');
  return groupIN(i) + '.' + d;
};

export const rM = (v: any) => `₹${money(v)}`;

/** Server lists send formatted strings ("1,500.00"). */
export const num = (v: any): number => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export const firstValue = (...values: any[]): any => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '' && String(value).toLowerCase() !== 'null') return value;
  }
  return '';
};

export const rowKey = (row: Row | null | undefined): string => {
  if (row && row.row_key) return String(row.row_key);
  const type = String(firstValue(row && row.sotype, 'SO')).toUpperCase();
  const uid = firstValue(row && row.souid, row && row.SOUID, row && row.uid, row && row.UId, '0');
  const sr = firstValue(row && row.sosrno, row && row.SOSrNo, row && row.srno, row && row.SrNo, '0');
  return `${type}-${uid}-${String(sr).trim()}`;
};

export const formatLegacyDate = (value: any): string => {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';
  if (/^\d{8}$/.test(raw)) return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`;
  let m = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  return raw;
};

const pad = (n: number) => String(n).padStart(2, '0');
export const todayDMY = () => { const d = new Date(); return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`; };
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const financialYearStartISO = () => {
  const d = new Date();
  const y = d.getMonth() + 1 <= 3 ? d.getFullYear() - 1 : d.getFullYear();
  return `${y}-04-01`;
};

export const digitsOnly = (v: any) => String(v || '').replace(/[^0-9]/g, '');
export const decimalOnly = (v: any) => {
  const s = String(v || '').replace(/[^0-9.]/g, '');
  const i = s.indexOf('.');
  return i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '');
};
