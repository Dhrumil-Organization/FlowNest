// FILE: src/components/SearchablePickerModal.tsx
// Lightweight native searchable selector for ERP master data.
// No third-party dropdown/bottom-sheet dependency is required.

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

export type SearchablePickerOption = {
  value: string;
  label: string;
  searchText?: string;
};

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  options: SearchablePickerOption[];
  selectedValue?: string;
  loading?: boolean;
  onClose: () => void;
  onSelect: (option: SearchablePickerOption) => void;
  onRefresh?: () => void;
};

export default function SearchablePickerModal({
  visible,
  title,
  placeholder = 'Search...',
  options,
  selectedValue = '',
  loading = false,
  onClose,
  onSelect,
  onRefresh,
}: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;

    return options.filter((option) => {
      const haystack = `${option.label} ${option.value} ${option.searchText ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={onClose}>
            <Icon name="close" size={22} color={T.nav} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>SELECT</Text>
            <Text style={styles.title}>{title}</Text>
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
              const selected = String(item.value) === String(selectedValue);
              return (
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <View style={[styles.leading, selected && styles.leadingSelected]}>
                    <Icon
                      name={selected ? 'check' : 'chevron-right'}
                      size={20}
                      color={selected ? '#FFF' : T.copper}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]} numberOfLines={2}>
                      {item.label}
                    </Text>
                    {!!item.value && <Text style={styles.rowCode}>{item.value}</Text>}
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
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    minHeight: 72,
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
  eyebrow: { color: T.copper, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: T.nav, fontSize: 20, fontWeight: '900', marginTop: 2 },
  searchWrap: {
    margin: 14,
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
  listContent: { paddingHorizontal: 14, paddingBottom: 30 },
  emptyList: { flexGrow: 1 },
  row: {
    minHeight: 64,
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
  leading: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadingSelected: { backgroundColor: T.copper },
  rowLabel: { color: T.ink, fontSize: 13, fontWeight: '800' },
  rowLabelSelected: { color: T.nav },
  rowCode: { color: T.muted, fontSize: 10, fontWeight: '700', marginTop: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  loadingText: { color: T.muted, fontSize: 11, fontWeight: '700', marginTop: 10 },
  emptyText: { color: T.muted, fontSize: 12, fontWeight: '700', marginTop: 9 },
});
