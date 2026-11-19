// FILE: src/features/repacking/components/OptionPicker.tsx
// Static lists (Type, Carton Type, Checked By) or a server-searched list (Party) on SearchablePickerModal.
import React, { useEffect, useRef, useState } from 'react';
import SearchablePickerModal from '@/src/components/SearchablePickerModal';
import { notify } from '../../repackingIssue/dialog';
import type { Opt } from '../types';

export function OptionPicker({ visible, title, options, search, selected, onPick, onClose, sub }: {
  visible: boolean;
  title: string;
  /** static list */
  options?: Opt[];
  /** server search (Party): called with the typed text */
  search?: (q: string) => Promise<Opt[]>;
  selected?: string;
  /** extra searchable / shown text per option (e.g. carton weight) */
  sub?: (o: Opt) => string;
  onPick: (o: Opt) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(false);
  const last = useRef<string | null>(null);
  const seq = useRef(0);

  const run = async (q: string) => {
    if (!search) return;
    last.current = q;
    const my = ++seq.current;
    setLoading(true);
    try {
      const list = await search(q);
      if (my === seq.current) setRows(list);
    } catch (e: any) {
      if (my === seq.current) {
        setRows([]);
        notify(title, e?.response?.data?.message || e?.message || `Unable to load ${title.toLowerCase()}.`);
      }
    } finally {
      if (my === seq.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (search) run('');
    else setRows(options ?? []);
  }, [visible, options]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;
  const list = search ? rows : options ?? [];

  return (
    <SearchablePickerModal
      visible
      title={title}
      placeholder={search ? `Type to search ${title.toLowerCase()}...` : `Search ${title.toLowerCase()}...`}
      options={list.map(o => ({ value: o.code, label: sub ? `${o.name}  •  ${sub(o)}` : o.name, searchText: o.code }))}
      selectedValue={selected}
      loading={loading}
      onRefresh={search ? () => run(last.current ?? '') : undefined}
      onQueryChange={search ? q => { if (q !== last.current) run(q); } : undefined}
      onClose={onClose}
      onSelect={o => onPick(list.find(x => x.code === o.value) ?? { code: o.value, name: o.label })}
    />
  );
}
