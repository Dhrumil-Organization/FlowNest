/**
 * Presentation-only search/sort for dashboard lists. Never aggregate or mutate
 * API rows here: card totals and drilldown expected amounts stay authoritative.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type SortType = 'text' | 'number' | 'date';
export type SortOption = { key: string; label: string; type?: SortType };
type AnyRow = Record<string, any>;

const sortableDate = (value: unknown): number => {
  const raw = String(value ?? '').trim();
  const ymd = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (ymd) return Number(`${ymd[1]}${ymd[2]}${ymd[3]}`);
  const dmy = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmy) return Number(`${dmy[3]}${dmy[2]}${dmy[1]}`);
  return Number(raw.replace(/[^0-9]/g, '')) || 0;
};

const dateVariants = (value: unknown): string[] => {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/[^0-9]/g, '');
  if (!/^\d{8}$/.test(digits)) return [raw];
  const year = Number(digits.slice(0, 4));
  if (year < 1950 || year > 2150) return [raw];
  const yyyy = digits.slice(0, 4), mm = digits.slice(4, 6), dd = digits.slice(6, 8);
  return [raw, `${dd}-${mm}-${yyyy}`, `${dd}/${mm}/${yyyy}`, `${yyyy}-${mm}-${dd}`, `${dd}${mm}${yyyy}`];
};

/**
 * Include the user-visible numeric forms, not just the raw API number.
 * Example: 3901531.58, 39,01,531.58 and ₹39,01,531.58 all match
 * the same amount. The same rule applies to metre quantities (14094.227).
 * Identity codes and zero-padded bill numbers remain searchable verbatim.
 */
const searchVariants = (value: unknown, isNumericMetric = false): string[] => {
  const raw = String(value ?? '').trim();
  if (!isNumericMetric) return dateVariants(value);
  const numberValue = typeof value === 'number'
    ? value
    : Number(raw.replace(/[₹,\s]/g, ''));
  if (!raw || !Number.isFinite(numberValue)) return [raw];
  const ordinary = numberValue.toLocaleString('en-IN', { maximumFractionDigits: 6 });
  const fixed2 = numberValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return [raw, String(numberValue), ordinary, fixed2, `₹${fixed2}`, `₹${ordinary}`];
};

export const matchesListSearch = (
  row: AnyRow,
  search: string,
  keys: string[],
  numericKeys: string[] = [],
): boolean => {
  const tokens = search.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const numericSet = new Set(numericKeys);
  const values = keys.map(key => ({
    raw: searchVariants(row?.[key], numericSet.has(key)).join(' ').toLocaleLowerCase('en'),
    numeric: numericSet.has(key) ? searchVariants(row?.[key], true).join(' ').replace(/[₹,\s]/g, '').toLocaleLowerCase('en') : '',
  }));
  return tokens.every(token => {
    const cleanNumber = token.replace(/[₹,]/g, '');
    return values.some(value => value.raw.includes(token)
      || (value.numeric && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleanNumber)
        && value.numeric.includes(cleanNumber)));
  });
};

export const filterSortDashboardRows = <T extends AnyRow>(
  rows: T[] | null | undefined,
  search: string,
  searchKeys: string[],
  sortKey: string,
  sortDirection: 'asc' | 'desc',
  sortType: SortType = 'number',
  numericSearchKeys: string[] = [],
): T[] => {
  const filtered = (Array.isArray(rows) ? rows : []).filter(item => matchesListSearch(item, search, searchKeys, numericSearchKeys));
  const direction = sortDirection === 'asc' ? 1 : -1;
  return filtered.map((row, index) => ({ row, index })).sort((a, b) => {
    const av = a.row?.[sortKey], bv = b.row?.[sortKey];
    let delta = 0;
    if (sortType === 'number' || sortType === 'date') {
      const an = sortType === 'date' ? sortableDate(av) : Number(av ?? 0);
      const bn = sortType === 'date' ? sortableDate(bv) : Number(bv ?? 0);
      delta = (Number.isFinite(an) ? an : 0) - (Number.isFinite(bn) ? bn : 0);
    } else {
      delta = String(av ?? '').localeCompare(String(bv ?? ''), 'en', { sensitivity: 'base', numeric: true });
    }
    // Preserve API ordering when values tie.
    return delta ? Math.sign(delta) * direction : a.index - b.index;
  }).map(item => item.row);
};

export function useDrilldownList<T extends AnyRow>(
  rows: T[] | null | undefined,
  searchKeys: string[],
  options: SortOption[],
  initialKey?: string,
  initialDirection: 'asc' | 'desc' = 'desc',
) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(initialKey || options[0]?.key || 'amount');
  const [direction, setDirection] = useState<'asc' | 'desc'>(initialDirection);
  const option = options.find(item => item.key === sortKey) || options[0];
  // All sortable metrics are also searchable, even when a different sort is
  // selected. A Qty/Amount query must never depend on the active sort button.
  const optionSignature = options.map(item => `${item.key}:${item.type || 'number'}`).join('|');
  const searchableKeys = useMemo(() => Array.from(new Set([
    ...searchKeys,
    ...options.map(item => item.key),
  ])), [searchKeys.join('|'), optionSignature]);
  const numericSearchKeys = useMemo(() => options
    .filter(item => (item.type || 'number') === 'number')
    .map(item => item.key), [optionSignature]);
  const filtered = useMemo(
    () => filterSortDashboardRows(rows, search, searchableKeys, sortKey, direction, option?.type || 'number', numericSearchKeys),
    [rows, search, searchableKeys, sortKey, direction, option?.type, numericSearchKeys],
  );
  const chooseSort = (key: string) => {
    if (key === sortKey) { setDirection(prev => prev === 'asc' ? 'desc' : 'asc'); return; }
    setSortKey(key);
    setDirection((options.find(item => item.key === key)?.type || 'number') === 'text' ? 'asc' : 'desc');
  };
  return { search, setSearch, sortKey, direction, chooseSort, rows: filtered, totalCount: rows?.length || 0, options };
}

type ToolbarState = ReturnType<typeof useDrilldownList>;
export default function DrilldownListTools({
  state,
  placeholder,
  compact = false,
  showCount = false,
}: { state: ToolbarState; placeholder: string; compact?: boolean; showCount?: boolean }) {
  return (
    <View style={[styles.root, compact && styles.compactRoot]}>
      <View style={[styles.searchWrap, compact && styles.compactSearchWrap]}>
        <Text style={styles.magnifier}>⌕</Text>
        <TextInput
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          placeholderTextColor="#938B83"
          style={[styles.search, compact && styles.compactSearch]}
          value={state.search}
          onChangeText={state.setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {!!state.search && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => state.setSearch('')} style={styles.clear}><Text style={styles.clearText}>×</Text></TouchableOpacity>}
      </View>
      <View style={styles.sortWrap}>
        {state.options.map(option => {
          const active = state.sortKey === option.key;
          const textSuffix = option.type === 'text' ? (state.direction === 'asc' ? ' A–Z' : ' Z–A') : (state.direction === 'asc' ? ' ▲' : ' ▼');
          return (
            <TouchableOpacity key={option.key} accessibilityRole="button"
              accessibilityLabel={`Sort by ${option.label}, ${active ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'select'}`}
              onPress={() => state.chooseSort(option.key)}
              style={[styles.sortButton, active && styles.sortButtonActive]}>
              <Text style={[styles.sortLabel, active && styles.sortLabelActive]}>{option.label.toUpperCase()}{active ? textSuffix : ''}</Text>
            </TouchableOpacity>
          );
        })}
        {showCount && <Text style={styles.count}>{state.rows.length}/{state.totalCount}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 11, paddingTop: 8, paddingBottom: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: '#EBE5DE' },
  compactRoot: { paddingHorizontal: 9, paddingTop: 5, paddingBottom: 5, gap: 5 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E1DAD3', backgroundColor: '#fff', borderRadius: 8, minHeight: 34 },
  compactSearchWrap: { minHeight: 29 },
  magnifier: { paddingLeft: 9, fontSize: 16, color: '#857D75', fontWeight: '700' },
  search: { flex: 1, minWidth: 0, paddingVertical: 5, paddingHorizontal: 8, fontSize: 11, color: '#162334', outlineStyle: 'none' } as any,
  compactSearch: { paddingVertical: 3, fontSize: 10 },
  clear: { paddingHorizontal: 9, paddingVertical: 3 }, clearText: { fontSize: 17, color: '#857D75' },
  sortWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  sortButton: { paddingVertical: 5, paddingHorizontal: 9, backgroundColor: '#F0ECE8', borderRadius: 8 },
  sortButtonActive: { backgroundColor: '#0D1B2A' },
  sortLabel: { color: '#615B56', fontSize: 9, fontWeight: '800' },
  sortLabelActive: { color: '#fff' },
  count: { fontSize: 9, color: '#928A82', fontWeight: '700', marginLeft: 'auto' },
});
