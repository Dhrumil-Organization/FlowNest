// FILE: src/components/SearchableMultiSelectModal.tsx
// Native searchable multi-select for ERP criterion lists.
// No third-party dropdown / bottom-sheet package required.

import { T, S } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export type SearchableMultiSelectOption = {
  value: string;
  label: string;
  searchText?: string;
};

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  options: SearchableMultiSelectOption[];
  selectedValues: string[];
  loading?: boolean;
  onClose: () => void;
  onApply: (values: string[]) => void;
  onRefresh?: () => void;
};

export default function SearchableMultiSelectModal({
  visible,
  title,
  placeholder = 'Search...',
  options,
  selectedValues,
  loading = false,
  onClose,
  onApply,
  onRefresh,
}: Props) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>(selectedValues);

  useEffect(() => {
    if (visible) {
      setDraft(selectedValues.map(String));
      setQuery('');
    }
  }, [visible, selectedValues]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.value} ${option.searchText ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(draft.map(String)), [draft]);

  const toggle = (value: string) => {
    const v = String(value);
    setDraft((current) =>
      current.includes(v) ? current.filter((x) => x !== v) : [...current, v],
    );
  };

  const selectAllVisible = () => {
    const visibleValues = rows.map((x) => String(x.value));
    setDraft((current) => Array.from(new Set([...current, ...visibleValues])));
  };

  const clearVisible = () => {
    const visible = new Set(rows.map((x) => String(x.value)));
    setDraft((current) => current.filter((x) => !visible.has(x)));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={onClose}>
            <Icon name="close" size={22} color={T.nav} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>SELECT MULTIPLE</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.count}>{draft.length} selected</Text>
          </View>

          {onRefresh ? (
            <TouchableOpacity style={styles.iconButton} onPress={onRefresh} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={T.copper} />
              ) : (
                <Icon name="refresh" size={22} color={T.nav} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.iconSpacer} />
          )}
        </View>

        <View style={styles.searchWrap}>
          <Icon name="search" size={21} color={T.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder={placeholder}
            placeholderTextColor={T.muted}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Icon name="cancel" size={20} color={T.muted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.utilityRow}>
          <TouchableOpacity style={styles.utilityButton} onPress={selectAllVisible}>
            <Icon name="done-all" size={17} color={T.nav} />
            <Text style={styles.utilityText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.utilityButton} onPress={clearVisible}>
            <Icon name="remove-done" size={17} color={T.red} />
            <Text style={[styles.utilityText, { color: T.red }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {loading && options.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item, index) => `${item.value}-${index}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.listContent}
            renderItem={({ item }) => {
              const selected = selectedSet.has(String(item.value));
              return (
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => toggle(item.value)}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <Icon name="check" size={18} color="#FFF" />}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]} numberOfLines={2}>
                      {item.label}
                    </Text>
                    <Text style={styles.rowCode}>Code: {item.value}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Icon name="search-off" size={34} color={T.border} />
                <Text style={styles.emptyText}>No matching record.</Text>
              </View>
            }
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applyButton, draft.length === 0 && styles.disabled]}
            disabled={draft.length === 0}
            onPress={() => {
              onApply(draft);
              onClose();
            }}
          >
            <Icon name="check-circle" size={19} color="#FFF" />
            <Text style={styles.applyText}>Apply ({draft.length})</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    minHeight: 80,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: '#FFF',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  iconSpacer: { width: 42, height: 42 },
  eyebrow: { color: T.copper, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: T.nav, fontSize: 20, fontWeight: '900', marginTop: 1 },
  count: { color: T.muted, fontSize: 9, fontWeight: '800', marginTop: 2 },

  searchWrap: {
    margin: 14,
    marginBottom: 8,
    minHeight: 50,
    paddingHorizontal: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    ...S.card,
  },
  searchInput: { flex: 1, color: T.ink, fontSize: 14, fontWeight: '700' },

  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  utilityButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  utilityText: { color: T.nav, fontSize: 10, fontWeight: '900' },

  listContent: { paddingHorizontal: 14, paddingBottom: 100 },
  emptyList: { flexGrow: 1 },
  row: {
    minHeight: 62,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  rowSelected: { borderColor: '#D8B28D', backgroundColor: '#FBF5EF' },
  checkbox: {
    width: 27,
    height: 27,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#9BA5AD',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: T.copper, borderColor: T.copper },
  rowLabel: { color: T.ink, fontSize: 13, fontWeight: '800' },
  rowLabelSelected: { color: T.nav },
  rowCode: { color: T.muted, fontSize: 9, fontWeight: '700', marginTop: 3 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  loadingText: { color: T.muted, fontSize: 11, fontWeight: '700', marginTop: 10 },
  emptyText: { color: T.muted, fontSize: 12, fontWeight: '700', marginTop: 9 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    gap: 9,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: T.nav, fontSize: 12, fontWeight: '900' },
  applyButton: {
    flex: 1.4,
    height: 48,
    borderRadius: 14,
    backgroundColor: T.nav,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  applyText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.45 },
});
