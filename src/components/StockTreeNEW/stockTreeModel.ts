// FILE: src/components/StockTreeNEW/stockTreeModel.ts
// Pure logic shared by the NEW Fabric Stock and Yarn Stock screens.
// A stock screen = a flat list of API rows grouped into a 4-level tree
// (e.g. Item → Design → Sub design → Shade, or Main item → Item → Merge → Shade)
// with qty summed at every level. Each screen describes its levels in a
// StockConfig (see FabricStockNEW / YarnStockNEW).

export type StockRow = Record<string, any>;
export type Level = 0 | 1 | 2 | 3;

export type LevelDef = {
  label: string; // 'Item'
  plural: string; // 'items'
  /** grouping key of a row at this level (legacy grouping field) */
  key: (r: StockRow) => string;
  name: (r: StockRow) => string;
  code: (r: StockRow) => string;
};

export type KindDef = {
  key: string; // 'grey'
  label: string; // 'GREY STOCK'
  short: string; // 'grey'
  color: string;
  match: (r: StockRow) => boolean;
};

export type StockConfig = {
  title: string; // 'Fabric Stock'
  /** GET /api/<dataEndpoint> with { prpcodes, prptype:'S', txntype } */
  dataEndpoint: string;
  txntype: string;
  /** txntype sent to /api/get_criterion (fetch: 'prp') */
  criterionTxntype: string;
  qty: (r: StockRow) => number;
  levels: [LevelDef, LevelDef, LevelDef, LevelDef];
  /** optional split (Grey / Finish). Omit for a single stock view. */
  kinds?: KindDef[];
  emptyHint?: string;
  searchPlaceholder?: string;
};

export type StockNode = {
  id: string;
  level: Level; // which level definition this node is (can skip a level — see buildTree)
  code: string;
  name: string;
  qty: number;
  children: StockNode[];
  leafCount: number;
  /** qty of rows that end at this node (no value at the deeper levels) */
  ownQty: number;
};

export type SortMode = 'qty_desc' | 'qty_asc' | 'name_asc';

export const num = (v: any) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
export const str = (v: any) => (v === undefined || v === null ? '' : String(v).trim());

/** Qty like the legacy screens: en-IN, 3 decimals. */
export const qty3 = (v: number) =>
  Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** Short qty for KPIs: 12.3K, 4.56L. */
export const qtyShort = (v: number) => {
  const a = Math.abs(v || 0);
  if (a >= 1e7) return `${(v / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${(v / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return (v || 0).toFixed(0);
};

type Acc = { level: Level; code: string; name: string; qty: number; own: number; kids: Map<string, Acc> };

/**
 * Groups rows (optionally only those matching `filter`) into the 4-level tree.
 * A row with NO value at a level (e.g. no sub design / no shade) never makes
 * an "UNKNOWN" node: that level is skipped for the row — it goes straight to
 * its next level that has a value, or ends at its last named node (counted
 * there as `ownQty`). Only a row without even a top-level value is grouped
 * under "Other" so no stock is lost from the totals.
 */
export function buildTree(
  rows: StockRow[],
  cfg: Pick<StockConfig, 'levels' | 'qty'>,
  filter?: (r: StockRow) => boolean,
): { nodes: StockNode[]; total: number } {
  const root = new Map<string, Acc>();
  let total = 0;
  rows.forEach((r) => {
    if (filter && !filter(r)) return;
    const q = cfg.qty(r);
    total += q;
    const path = cfg.levels
      .map((lv, i) => ({ lv, level: i as Level, key: str(lv.key(r)) }))
      .filter((p, i) => p.key !== '' || i === 0);
    let map = root;
    let last: Acc | null = null;
    path.forEach(({ lv, level, key }) => {
      const k = `${level}:${key || 'OTHER'}`;
      let a = map.get(k);
      if (!a) {
        a = { level, code: str(lv.code(r)), name: str(lv.name(r)) || key || 'Other', qty: 0, own: 0, kids: new Map() };
        map.set(k, a);
      }
      a.qty += q;
      last = a;
      map = a.kids;
    });
    if (last) (last as Acc).own += q;
  });

  const toNodes = (map: Map<string, Acc>, parentId: string): StockNode[] =>
    Array.from(map.entries()).map(([key, a]) => {
      const id = `${parentId}/${key}`;
      const children = toNodes(a.kids, id);
      return {
        id, level: a.level, code: a.code, name: a.name, qty: a.qty, children, ownQty: a.own,
        leafCount: a.level === 3 ? 1 : children.reduce((s, c) => s + c.leafCount, 0),
      };
    });

  return { nodes: toNodes(root, 'root'), total };
}

export function sortNodes(nodes: StockNode[], mode: SortMode): StockNode[] {
  const cmp = (a: StockNode, b: StockNode) =>
    mode === 'qty_desc' ? b.qty - a.qty || a.name.localeCompare(b.name)
      : mode === 'qty_asc' ? a.qty - b.qty || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name);
  return [...nodes].sort(cmp).map((n) => (n.children.length ? { ...n, children: sortNodes(n.children, mode) } : n));
}

/**
 * Search: a node stays when it matches, when a descendant matches (path kept,
 * qty = matching part) or when an ancestor matches (whole subtree kept).
 * Returns the filtered tree + ids to auto-expand (paths to matches).
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
        out.push({ ...n, children: kids, ownQty: 0, qty: kids.reduce((s, k) => s + k.qty, 0), leafCount: kids.reduce((s, k) => s + k.leafCount, 0) });
      }
    });
    return out;
  };
  return { nodes: walk(nodes), expand };
}

export function countLevels(nodes: StockNode[]) {
  const c = [0, 0, 0, 0];
  const walk = (list: StockNode[]) => list.forEach((n) => { c[n.level] += 1; walk(n.children); });
  walk(nodes);
  return c;
}

export type FlatRow = { node: StockNode; parentQty: number; open: boolean; last: boolean };

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

export function allIds(nodes: StockNode[], maxLevel: Level = 2): Set<string> {
  const s = new Set<string>();
  const walk = (list: StockNode[]) => list.forEach((n) => {
    if (n.children.length && n.level <= maxLevel) { s.add(n.id); walk(n.children); }
  });
  walk(nodes);
  return s;
}
