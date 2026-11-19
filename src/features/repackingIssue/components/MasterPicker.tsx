// FILE: src/features/repackingIssue/components/MasterPicker.tsx
// Property / Year / Store / Department / Item / Merge / Grade / Shade picker on top of FlowNest's
// SearchablePickerModal.
//  - Merge / Grade / Shade depend on the codes chosen before them (filter) → cached per filter.
//  - Item and Merge come back 20 at a time → typing searches on the server (search param).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import SearchablePickerModal, { type SearchablePickerOption } from '@/src/components/SearchablePickerModal';
import { notify } from '../dialog';
import { RepackingService } from '../service';
import { LookupFilter, LookupKind, LookupOption, RepackContext } from '../types';

const TITLES: Record<LookupKind, string> = {
  item: 'Item',
  merge: 'Merge',
  grade: 'Grade',
  shade: 'Shade',
  department: 'Department',
  property: 'Property',
  year: 'Year',
  store: 'Store',
};

/** lists the server returns in pages of 20 → search on the server */
const REMOTE: LookupKind[] = ['item', 'merge'];

const cache = new Map<string, LookupOption[]>();
const cacheKey = (k: LookupKind, c: RepackContext, f: LookupFilter) =>
  [k, c.prpCode, c.yearNo, c.strCode, f.itmCode ?? '', f.merCode ?? '', f.grdCode ?? '', f.search ?? ''].join('|');

export function MasterPicker({ kind, ctx, service, selected, filter, onPick, onClose }: {
  kind: LookupKind | null;
  ctx: RepackContext;
  service: Pick<RepackingService, 'lookup'>;
  selected?: string;
  /** Item / Merge / Grade codes for the dependent lists */
  filter?: LookupFilter;
  onPick: (kind: LookupKind, o: LookupOption) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const lastSearch = useRef('');
  const seq = useRef(0);
  const f = filter ?? {};

  const load = useCallback(async (k: LookupKind, search = '', force = false) => {
    const flt = { ...f, search: REMOTE.includes(k) ? search : '' };
    const key = cacheKey(k, ctx, flt);
    lastSearch.current = flt.search ?? '';
    if (!force && cache.has(key)) {
      setRows(cache.get(key)!);
      return;
    }
    const my = ++seq.current;
    setLoading(true);
    try {
      const list = await service.lookup(k, ctx, flt);
      cache.set(key, list);
      if (my === seq.current) setRows(list);
    } catch (e: any) {
      if (my !== seq.current) return;
      setRows([]);
      const status = e?.response?.status;
      const server = e?.response?.data?.message;
      notify(
        TITLES[k],
        `${status ? `HTTP ${status} — ` : ''}${server || e?.message || `Unable to load ${TITLES[k].toLowerCase()} list.`}` +
          (e?.config?.url ? `\n${e.config.url}` : ''),
      );
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [ctx, service, f.itmCode, f.merCode, f.grdCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (kind) {
      setRows([]);
      load(kind);
    }
  }, [kind, load]);

  if (!kind) return null;

  const options: SearchablePickerOption[] = rows.map(r => ({
    value: r.code,
    label: r.name,
    searchText: [r.code, r.extra?.amtCalc].filter(Boolean).join(' '),
  }));

  const remote = REMOTE.includes(kind);

  return (
    <SearchablePickerModal
      visible
      title={TITLES[kind]}
      placeholder={remote ? `Type to search ${TITLES[kind].toLowerCase()}...` : `Search ${TITLES[kind].toLowerCase()} name or code...`}
      options={options}
      selectedValue={selected}
      loading={loading}
      onRefresh={() => load(kind, lastSearch.current, true)}
      onQueryChange={remote ? q => { if (q !== lastSearch.current) load(kind, q); } : undefined}
      onClose={onClose}
      onSelect={o => {
        const hit = rows.find(r => r.code === o.value);
        onPick(kind, hit ?? { code: o.value, name: o.label });
      }}
    />
  );
}
