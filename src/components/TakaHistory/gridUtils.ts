// FILE: src/components/TakaHistory/gridUtils.ts
import type { GridColumn, GridFilter } from './gridApi';

// column widths by type / name
export function columnWidth(col: GridColumn): number {
  const l = col.label || col.name;
  if (col.type === 'number') return (col.name || '').startsWith('Days ') ? 110 : 96;
  if (col.type === 'date') return 98;
  if (l === 'Process' || l === 'Inward From') return 112;
  if (l === 'Property') return 80;
  if (l === 'Taka No') return 100;
  if (l === 'Location') return 170;
  if (l === 'Design') return 150;
  return 120;
}

export const fmtNum = (n: any, decimals: number = 2) =>
  n === null || n === undefined || n === ''
    ? ''
    : Number(n).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

type Op = { op: string; label: string };
export const OPS: Record<string, Op[]> = {
  text: [
    { op: 'contains', label: 'Contains' },
    { op: 'notcontains', label: 'Does not contain' },
    { op: 'eq', label: 'Equals' },
    { op: 'neq', label: 'Not equal' },
    { op: 'starts', label: 'Starts with' },
    { op: 'ends', label: 'Ends with' },
    { op: 'blank', label: 'Is blank' },
    { op: 'notblank', label: 'Is not blank' },
  ],
  number: [
    { op: 'eq', label: '=' },
    { op: 'neq', label: '≠' },
    { op: 'gt', label: '>' },
    { op: 'gte', label: '≥' },
    { op: 'lt', label: '<' },
    { op: 'lte', label: '≤' },
    { op: 'between', label: 'Between' },
    { op: 'blank', label: 'Is blank' },
    { op: 'notblank', label: 'Is not blank' },
  ],
  date: [
    { op: 'eq', label: 'On' },
    { op: 'lt', label: 'Before' },
    { op: 'gt', label: 'After' },
    { op: 'between', label: 'Between' },
    { op: 'blank', label: 'Is blank' },
    { op: 'notblank', label: 'Is not blank' },
  ],
};

export const needsValue = (op: string) => op !== 'blank' && op !== 'notblank';

export function describeFilter(f: GridFilter, col?: GridColumn): string {
  const ops = OPS[col ? col.type : 'text'] || OPS.text;
  const o = ops.find((x) => x.op === f.op);
  const label = o ? o.label : f.op;
  if (!needsValue(f.op)) return `${f.col}: ${label.toLowerCase()}`;
  if (f.op === 'between') return `${f.col}: ${f.value} – ${f.value2}`;
  return `${f.col} ${label.toLowerCase()} ${f.value}`;
}
