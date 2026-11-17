// FILE: src/components/RollCutScanner/offline/listCache.ts
// Last "Scanned List" results, kept on the device so the same filter can be opened again without network.
// Small on purpose (few filters, limited rows): phone / browser storage is not a database.
import { readJson, writeJson } from './storage';

type Entry = { key: string; at: number; rows: any[] };
const KEY = (scope: string) => `rollcut_lists_v1:${scope}`;
const MAX_LISTS = 5;
export const MAX_ROWS = 400;

export const listKey = (prp: string, beam: string, from: string, to: string) => `${prp}|${beam}|${from}|${to}`;

export async function saveList(scope: string, key: string, rows: any[]) {
  if (rows.length > MAX_ROWS) return; // too big to keep offline
  const all = await readJson<Entry[]>(KEY(scope), []);
  await writeJson(KEY(scope), [{ key, at: Date.now(), rows }, ...all.filter((e) => e.key !== key)].slice(0, MAX_LISTS));
}

export async function readList(scope: string, key: string): Promise<{ at: number; rows: any[] } | null> {
  const hit = (await readJson<Entry[]>(KEY(scope), [])).find((e) => e.key === key);
  return hit ? { at: hit.at, rows: hit.rows } : null;
}
