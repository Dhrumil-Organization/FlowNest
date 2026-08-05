import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { T } from '../../theme';
import { PickerSheet } from './PickerSheet';

// ─────────────────────────────────────────────────────────────────────────
// Drop-in replacement for the old app's `PartyDropdown` (`@/Shared/PartyDropdown`),
// built on the shared PickerSheet component instead of its own one-off
// implementation. Prop shape intentionally mirrors PartyDropdown closely —
// `data` / `labelKey` / `valueKey` / `selected` / `onSelect` — so migrating
// a call site is close to a find-and-replace of the tag name, not a rewrite.
//
// `labelKey` accepts either a single field name (one-line label) or a
// [primary, secondary] tuple (label + a smaller "sub" line underneath) —
// both forms were used in the old screens (e.g. beam picker used a single
// string, design/grade/checker/operator pickers used a tuple).
// ─────────────────────────────────────────────────────────────────────────
interface Props {
  data: any[];
  placeholder: string;
  labelKey: string | [string, string?];
  valueKey: string;
  selected?: any;
  loading?: boolean;
  onSelect: (item: any) => void;
  disabled?: boolean;
}

export function MasterSelectField({ data, placeholder, labelKey, valueKey, selected, loading, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const keys = Array.isArray(labelKey) ? labelKey : [labelKey];
  const [primaryKey, secondaryKey] = keys;

  const items = (data || []).map((row) => ({
    k: String(row[valueKey]),
    label: String(row[primaryKey] ?? ''),
    sub: secondaryKey ? String(row[secondaryKey] ?? '') : undefined,
    _row: row,
  }));

  const selectedLabel = selected ? String(selected[primaryKey] ?? '') : '';

  return (
    <>
      <TouchableOpacity
        style={[s.field, disabled && s.fieldDisabled]}
        onPress={() => !disabled && !loading && setOpen(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text style={selectedLabel ? s.value : s.placeholder} numberOfLines={1}>
          {loading ? 'Loading…' : selectedLabel || placeholder}
        </Text>
      </TouchableOpacity>

      <PickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title={placeholder}
        items={items}
        onPick={(k) => {
          const row = items.find((it) => it.k === k)?._row;
          if (row) onSelect(row);
        }}
      />
    </>
  );
}

const s = StyleSheet.create({
  field: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 4,
  },
  fieldDisabled: { opacity: 0.6 },
  value: { fontSize: 14, fontWeight: '600', color: T.ink },
  placeholder: { fontSize: 14, color: T.muted },
});
