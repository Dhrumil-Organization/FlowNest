// FILE: src/components/FabricStockNEW/fabricStockModel.ts
// Pure logic for the NEW Fabric Stock screen (no UI, no API).
//
// Same data + same rules as the legacy components/FebricStock screen:
//   - rows come from GET /api/appgreyinstockdata
//   - Grey stock   = rows with dptcode 'PR'
//   - Finish stock = every other row
//   - Item is grouped by ITMCODE, Main design by MDSNNAME, Sub design by
//     SDSNNAME, Shade by SHDNAME (exactly the legacy keys), TOTQTY summed.
// Differences (fixes): every level is scoped to its parent (legacy "ALL"
// cards ignored the selected item/design), and the whole drill-down is one
// tree instead of four stacked modals.

export type StockRow = {
  dptcode?: string;
  ITMCODE?: string | number;
  ITMNAME?: string;
  MDSNCODE?: string | number;
  MDSNNAME?: string;
  SDSNCODE?: string | number;
  SDSNNAME?: string;
  SHDCODE?: string | number;
  SHDNAME?: string;
  TOTQTY?: string | number;
  [k: string]: any;
};

export type StockKind = 'grey' | 'finish';
export type Level = 0 | 1 | 2 | 3; // item, main design, sub design, shade
export const LEVEL_LABEL = ['Item', 'Design', 'Sub design', 'Shade'] as const;
export const LEVEL_PLURAL = ['items', 'designs', 'sub designs', 'shades'] as const;

export type StockNode = {
  id: string; // path id, unique in the tree
  level: Level;
  code: string;
  name: string;
  qty: number;
  children: StockNode[];
  leafCount: number; // shades under this node
};

export type SortMode = 'qty_desc' | 'qty_asc' | 'name_asc';

const num = (v: any) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: any) => (v === undefined || v === null ? '' : String(v).trim());

export const isGreyRow = (r: StockRow) => str(r.dptcode).toUpperCase() === 'PR';

/** Qty like the legacy screen: en-IN, 3 decimals. */
export const qty3 = (v: number) =>
  Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** Short qty for chips / KPIs: 12.3K, 4.56L. */
export const qtyShort = (v: number) => {
  const a = Math.abs(v || 0);
  if (a >= 1e7) return `${(v / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${(v / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return (v || 0).toFixed(0);
};

type Acc = { code: string; name: string; qty: number; kids: Map<string, Acc> };
const acc = (code: string, name: string): Acc => ({ code, name, qty: 0, kids: new Map() });

/** Builds Item → Main design → Sub design → Shade for one stock kind. */
export function buildTree(rows: StockRow[], kind: StockKind): { nodes: StockNode[]; total: number } {
  const root = new Map<string, Acc>();
  let total = 0;
  rows.forEach((r) => {
    if ((kind === 'grey') !== isGreyRow(r)) return;
    const q = num(r.TOTQTY);
    total += q;
    const path: [string, string][] = [
      [str(r.ITMCODE) || str(r.ITMNAME) || 'UNKNOWN', str(r.ITMNAME) || str(r.ITMCODE) || 'UNKNOWN'],
      [str(r.MDSNNAME) || 'UNKNOWN', str(r.MDSNNAME) || 'UNKNOWN'],
      [str(r.SDSNNAME) || 'UNKNOWN', str(r.SDSNNAME) || 'UNKNOWN'],
      [str(r.SHDNAME) || 'UNKNOWN', str(r.SHDNAME) || 'UNKNOWN'],
    ];
    const codes = [str(r.ITMCODE), str(r.MDSNCODE), str(r.SDSNCODE), str(r.SHDCODE)];
    let map = root;
    path.forEach(([key, name], i) => {
      let a = map.get(key);
      if (!a) { a = acc(codes[i], name); map.set(key, a); }
      a.qty += q;
      map = a.kids;
    });
  });

  const toNodes = (map: Map<string, Acc>, level: Level, parentId: string): StockNode[] =>
    Array.from(map.entries()).map(([key, a]) => {
      const id = `${parentId}/${key}`;
      const children = level < 3 ? toNodes(a.kids, (level + 1) as Level, id) : [];
      return {
        id,
        level,
        code: a.code,
        name: a.name,
        qty: a.qty,
        children,
        leafCount: level === 3 ? 1 : children.reduce((s, c) => s + c.leafCount, 0),
      };
    });

  return { nodes: toNodes(root, 0, kind), total };
}

export function sortNodes(nodes: StockNode[], mode: SortMode): StockNode[] {
  const cmp = (a: StockNode, b: StockNode) =>
    mode === 'qty_desc' ? b.qty - a.qty || a.name.localeCompare(b.name)
      : mode === 'qty_asc' ? a.qty - b.qty || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name);
  return [...nodes].sort(cmp).map((n) => (n.children.length ? { ...n, children: sortNodes(n.children, mode) } : n));
}

/**
 * Search: a node stays when it matches, when a descendant matches (the path
 * to the match is kept), or when an ancestor matches (its whole subtree stays).
 * Returns the filtered tree + the ids to auto-expand (paths to matches).
 */
export function filterTree(nodes: StockNode[], query: string): { nodes: StockNode[]; expand: Set<string> } {
  const q = query.trim().toLowerCase();
  const expand = new Set<string>();
  if (!q) return { nodes, expand };
  const hit = (n: StockNode) => `${n.name} ${n.code}`.toLowerCase().includes(q);
  const walk = (list: StockNode[]): StockNode[] => {
    const out: StockNode[] = [];
    list.forEach((n) => {
      if (hit(n)) { out.push(n); return; }
      const kids = walk(n.children);
      if (kids.length) {
        expand.add(n.id);
        out.push({ ...n, children: kids, qty: kids.reduce((s, k) => s + k.qty, 0), leafCount: kids.reduce((s, k) => s + k.leafCount, 0) });
      }
    });
    return out;
  };
  return { nodes: walk(nodes), expand };
}

/** Counts per level of a tree (for the KPI cards). */
export function countLevels(nodes: StockNode[]) {
  const c = [0, 0, 0, 0];
  const walk = (list: StockNode[]) => list.forEach((n) => { c[n.level] += 1; walk(n.children); });
  walk(nodes);
  return c;
}

export type FlatRow = { node: StockNode; parentQty: number; open: boolean; last: boolean };

/** The visible rows (for a virtualised list) given the expanded ids. */
export function flatten(nodes: StockNode[], expanded: Set<string>, total: number): FlatRow[] {
  const out: FlatRow[] = [];
  const walk = (list: StockNode[], parentQty: number) => {
    list.forEach((n, i) => {
      const open = n.children.length > 0 && expanded.has(n.id);
      out.push({ node: n, parentQty, open, last: i === list.length - 1 });
      if (open) walk(n.children, n.qty);
    });
  };
  walk(nodes, total);
  return out;
}

/** Every expandable id of a tree (Expand all). */
export function allIds(nodes: StockNode[], maxLevel: Level = 2): Set<string> {
  const s = new Set<string>();
  const walk = (list: StockNode[]) => list.forEach((n) => {
    if (n.children.length && n.level <= maxLevel) { s.add(n.id); walk(n.children); }
  });
  walk(nodes);
  return s;
}
