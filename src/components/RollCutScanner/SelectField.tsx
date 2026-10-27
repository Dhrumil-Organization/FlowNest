// FILE: src/components/RollCutScanner/SelectField.tsx
// Dropdown: boxed field -> tap -> centered popup with search. Same look on phone and web.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Opt } from './api';

type Props = {
  label: string;
  value: string;
  options: Opt[];
  onChange: (v: string) => void;
  icon?: string;
  required?: boolean;
  loading?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  placeholder?: string;
  onRefresh?: () => void;
};

export default function SelectField({ label, value, options, onChange, icon = 'apartment', required, loading, disabled, disabledHint, placeholder, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const selected = options.find((o) => o.value === value);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options;
  }, [options, q]);
  const close = () => {
    setOpen(false);
    setQ('');
  };
  const text = disabled && disabledHint ? disabledHint : selected?.label || placeholder || `Select ${label.toLowerCase()}`;
  const showAsPlaceholder = (disabled && !!disabledHint) || !selected;

  return (
    <View style={st.field}>
      <View style={st.labelRow}>
        <Text style={st.label}>
          {label}
          {required ? <Text style={{ color: T.red }}> *</Text> : null}
        </Text>
        {onRefresh && !disabled ? (
          <TouchableOpacity style={st.refresh} onPress={onRefresh} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} accessibilityLabel={`Reload ${label}`}>
            <Icon name="refresh" size={14} color={T.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity activeOpacity={0.8} style={[st.box, disabled && st.boxOff]} onPress={() => setOpen(true)} disabled={disabled} accessibilityRole="button">
        <Icon name={icon as any} size={17} color={T.copper} />
        <Text style={[st.boxText, showAsPlaceholder && { color: T.muted, fontWeight: '600' }]} numberOfLines={1}>
          {text}
        </Text>
        {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="keyboard-arrow-down" size={20} color={T.muted} />}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <View style={st.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View style={st.card}>
            <View style={st.head}>
              <Text style={st.title} numberOfLines={1}>{label}</Text>
              <TouchableOpacity style={st.close} onPress={close} accessibilityLabel="Close">
                <Icon name="close" size={20} color={T.ink} />
              </TouchableOpacity>
            </View>
            <View style={st.search}>
              <Icon name="search" size={18} color={T.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder={`Search ${label.toLowerCase()}…`} placeholderTextColor={T.muted} style={st.searchInput} autoCorrect={false} autoFocus={Platform.OS === 'web'} />
              {q ? (
                <TouchableOpacity onPress={() => setQ('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close" size={16} color={T.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={shown}
              keyExtractor={(o, i) => `${o.value}-${i}`}
              keyboardShouldPersistTaps="handled"
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
              renderItem={({ item }) => {
                const on = item.value === value;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[st.row, on && st.rowOn]}
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                  >
                    <Text style={[st.rowText, on && { color: T.copper }]} numberOfLines={2}>{item.label}</Text>
                    {on ? <Icon name="check" size={18} color={T.copper} /> : null}
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  field: { flexGrow: 1, flexBasis: 220, minWidth: 0 },
  labelRow: { height: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  refresh: { width: 22, height: 22, borderRadius: 11, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: T.muted, textTransform: 'uppercase' },
  box: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  boxOff: { opacity: 0.6, backgroundColor: T.sub },
  boxText: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '800', color: T.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,16,28,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 540, maxHeight: '82%', backgroundColor: T.surface, borderRadius: 20, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.hair },
  title: { flex: 1, fontSize: 17, fontWeight: '900', color: T.ink },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  search: { margin: 16, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, paddingHorizontal: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600', color: T.ink, height: 42 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 15, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: T.hair },
  rowOn: { backgroundColor: `${T.copper}0D` },
  rowText: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '800', color: T.ink },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '600', color: T.muted },
});
