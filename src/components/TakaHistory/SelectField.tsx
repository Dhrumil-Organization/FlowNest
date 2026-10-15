// FILE: src/components/TakaHistory/SelectField.tsx
// Dropdown: a boxed field -> tap -> centered popup (title · close · search · list), like the Sales Order Entry
// "Property" picker. Works the same on phone and web.
// multiple = true -> tick any number of options; `value` / `onChange` then carry a comma separated string ("001,002").
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Opt } from '../StockVerificationNEW/ui';

type Props = {
  label: string;
  value: string;
  options: Opt[];
  onChange: (value: string) => void;
  required?: boolean;
  loading?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  placeholder?: string;
  icon?: string;
  onRefresh?: () => void;
  multiple?: boolean;
};

export default function SelectField({
  label,
  value,
  options,
  onChange,
  required,
  loading,
  disabled,
  disabledHint,
  placeholder,
  icon = 'apartment',
  onRefresh,
  multiple,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const multi = !!multiple;
  // multiple: value = "001,002" ; single: value = "001"
  const picked = useMemo(() => (multi ? value.split(',').map((x) => x.trim()).filter(Boolean) : value ? [value] : []), [value, multi]);
  const selected = options.find((o) => o.value === value);
  const selectedOpts = useMemo(() => options.filter((o) => picked.includes(o.value)), [options, picked]);
  const hasValue = multi ? selectedOpts.length > 0 : !!selected;
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => String(o.label).toLowerCase().includes(t)) : options;
  }, [options, q]);

  const close = () => {
    setOpen(false);
    setQ('');
  };
  const pick = (v: string) => {
    onChange(v);
    close();
  };

  const emptyText = disabled && disabledHint ? disabledHint : placeholder || `Select ${label.toLowerCase()}`;
  const text = multi
    ? selectedOpts.length === 0
      ? emptyText
      : selectedOpts.length <= 2
        ? selectedOpts.map((o) => o.label).join(', ')
        : `${selectedOpts.length} selected`
    : selected?.label || emptyText;

  // multiple: keep the option order, store as "a,b,c"
  const emit = (set: Set<string>) =>
    onChange(
      options
        .filter((o) => set.has(o.value))
        .map((o) => o.value)
        .join(','),
    );
  const toggle = (v: string) => {
    const set = new Set(picked);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    emit(set);
  };
  const selectAll = () => emit(new Set([...picked, ...shown.map((o) => o.value)]));
  const clearAll = () => onChange('');

  return (
    <View style={st.field}>
      <View style={st.labelRow}>
        <Text style={st.label}>
          {label}
          {required ? <Text style={{ color: T.red }}> *</Text> : null}
        </Text>
        {onRefresh && !disabled ? (
          <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={`Reload ${label}`}>
            <Icon name="refresh" size={15} color={T.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        style={[st.box, disabled && st.boxOff]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${hasValue ? text : 'not selected'}`}
      >
        <Icon name={icon as any} size={16} color={T.muted} />
        <Text style={[st.boxText, !hasValue && { color: T.muted, fontWeight: '600' }]} numberOfLines={1}>
          {text}
        </Text>
        {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="keyboard-arrow-down" size={20} color={T.muted} />}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <View style={st.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
          <View style={st.card}>
            <View style={st.head}>
              <Text style={st.title} numberOfLines={1}>
                {label}
                {multi && picked.length ? ` · ${picked.length} selected` : ''}
              </Text>
              <TouchableOpacity style={st.close} onPress={close} accessibilityLabel="Close" accessibilityRole="button">
                <Icon name="close" size={20} color={T.ink} />
              </TouchableOpacity>
            </View>

            <View style={st.search}>
              <Icon name="search" size={18} color={T.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={`Search ${label.toLowerCase()}…`}
                placeholderTextColor={T.muted}
                style={st.searchInput}
                autoCorrect={false}
                autoFocus={Platform.OS === 'web'}
              />
              {q ? (
                <TouchableOpacity onPress={() => setQ('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close" size={16} color={T.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={shown}
              extraData={value}
              keyExtractor={(o, i) => `${o.value}-${i}`}
              keyboardShouldPersistTaps="handled"
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
              renderItem={({ item }) => {
                const on = multi ? picked.includes(item.value) : item.value === value;
                return (
                  <TouchableOpacity activeOpacity={0.7} style={[st.row, on && st.rowOn]} onPress={() => (multi ? toggle(item.value) : pick(item.value))} accessibilityRole={multi ? 'checkbox' : 'button'} accessibilityState={multi ? { checked: on } : { selected: on }}>
                    <Text style={[st.rowText, on && { color: T.copper }]} numberOfLines={2}>
                      {item.label}
                    </Text>
                    {multi ? <Icon name={on ? 'check-box' : 'check-box-outline-blank'} size={22} color={on ? T.copper : T.muted} /> : on ? <Icon name="check" size={18} color={T.copper} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={st.empty}>
                  {loading ? <ActivityIndicator color={T.copper} /> : null}
                  <Text style={st.emptyText}>{loading ? 'Loading…' : options.length ? 'No match' : `No ${label.toLowerCase()} found`}</Text>
                </View>
              }
            />

            {multi ? (
              <View style={st.multiFoot}>
                <TouchableOpacity onPress={selectAll} style={st.multiLink} accessibilityRole="button">
                  <Text style={st.multiLinkText}>{q.trim() ? 'Select shown' : 'Select all'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearAll} style={st.multiLink} accessibilityRole="button">
                  <Text style={[st.multiLinkText, { color: T.muted }]}>Clear</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={close} style={st.doneBtn} accessibilityRole="button">
                  <Text style={st.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  field: { flexGrow: 1, flexBasis: 220, minWidth: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: T.muted, textTransform: 'uppercase' },
  box: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    paddingHorizontal: 12,
  },
  boxOff: { opacity: 0.55, backgroundColor: T.sub },
  boxText: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '800', color: T.ink },

  backdrop: { flex: 1, backgroundColor: 'rgba(8,16,28,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '82%',
    backgroundColor: T.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  title: { flex: 1, fontSize: 17, fontWeight: '900', color: T.ink },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  search: {
    margin: 16,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.sub,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600', color: T.ink, height: 42 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  rowOn: { backgroundColor: `${T.copper}0D` },
  rowText: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '800', color: T.ink },
  multiFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.hair, backgroundColor: T.surface },
  multiLink: { height: 38, paddingHorizontal: 8, justifyContent: 'center' },
  multiLinkText: { fontSize: 13.5, fontWeight: '800', color: T.copper },
  doneBtn: { height: 40, paddingHorizontal: 22, borderRadius: 10, backgroundColor: T.nav, justifyContent: 'center' },
  doneText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '600', color: T.muted },
});
