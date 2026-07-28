// FILE: src/components/ui/SearchableDropdown.tsx
// Searchable dropdown — handles 100,000+ items via virtualized FlatList.
// Uses Modal so it renders above everything including tab bars.

import React, { useState, useMemo, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { T } from '../../theme';

export interface DropdownItem {
    id:    string;
    label: string;
    sub?:  string;   // secondary line (city, category, etc.)
    right?: string;  // right-aligned badge/tag
}

interface Props {
    label:       string;               // field label shown above trigger
    placeholder: string;
    value:       string;               // selected item id
    items:       DropdownItem[];
    onSelect:    (item: DropdownItem) => void;
    disabled?:   boolean;
}

export function SearchableDropdown({ label, placeholder, value, items, onSelect, disabled }: Props) {
    const [open, setOpen]   = useState(false);
    const [q, setQ]         = useState('');
    const inputRef          = useRef<TextInput>(null);

    const selected = items.find(i => i.id === value);

    const filtered = useMemo(() => {
        if (!q.trim()) return items;
        const lq = q.toLowerCase();
        return items.filter(i =>
            i.label.toLowerCase().includes(lq) ||
            (i.sub ?? '').toLowerCase().includes(lq)
        );
    }, [q, items]);

    function open_() {
        if (disabled) return;
        setQ('');
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    }

    function pick(item: DropdownItem) {
        onSelect(item);
        setOpen(false);
        setQ('');
    }

    return (
        <View style={s.wrap}>
            {/* Field label */}
            <Text style={s.fieldLabel}>{label.toUpperCase()}</Text>

            {/* Trigger */}
            <TouchableOpacity
                onPress={open_}
                activeOpacity={0.7}
                style={[s.trigger, disabled && { opacity: 0.45 }]}
            >
                <View style={{ flex: 1, minWidth: 0 }}>
                    {selected
                        ? <>
                            <Text style={s.triggerValue} numberOfLines={1}>{selected.label}</Text>
                            {selected.sub && <Text style={s.triggerSub} numberOfLines={1}>{selected.sub}</Text>}
                          </>
                        : <Text style={s.triggerPlaceholder}>{placeholder}</Text>
                    }
                </View>
                <Text style={s.chevron}>▾</Text>
            </TouchableOpacity>

            {/* Full-screen search modal */}
            <Modal
                visible={open}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setOpen(false)}
            >
                <SafeAreaView style={s.modal}>
                    {/* Modal header */}
                    <View style={s.modalHeader}>
                        <Text style={s.modalTitle}>{label}</Text>
                        <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn}>
                            <Text style={s.closeTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search bar */}
                    <View style={s.searchWrap}>
                        <Text style={s.searchIcon}>⌕</Text>
                        <TextInput
                            ref={inputRef}
                            value={q}
                            onChangeText={setQ}
                            placeholder={`Search ${label.toLowerCase()}…`}
                            placeholderTextColor={T.muted}
                            style={s.searchInput}
                            autoCorrect={false}
                            clearButtonMode="while-editing"
                        />
                    </View>

                    {/* Count */}
                    <View style={s.countBar}>
                        <Text style={s.countTxt}>
                            {filtered.length.toLocaleString('en-IN')} result{filtered.length !== 1 ? 's' : ''}
                            {items.length !== filtered.length ? ` of ${items.length.toLocaleString('en-IN')}` : ''}
                        </Text>
                        {value && (
                            <TouchableOpacity onPress={() => { onSelect({ id: '', label: '' }); setOpen(false); }}>
                                <Text style={s.clearTxt}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* List — FlatList handles 100k+ rows efficiently */}
                    <FlatList
                        data={filtered}
                        keyExtractor={i => i.id}
                        initialNumToRender={30}
                        maxToRenderPerBatch={50}
                        windowSize={10}
                        getItemLayout={(_, index) => ({ length: 60, offset: 60 * index, index })}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => {
                            const isSelected = item.id === value;
                            return (
                                <TouchableOpacity
                                    onPress={() => pick(item)}
                                    style={[s.item, isSelected && s.itemSelected]}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text
                                            style={[s.itemLabel, isSelected && s.itemLabelSelected]}
                                            numberOfLines={1}
                                        >
                                            {item.label}
                                        </Text>
                                        {item.sub && (
                                            <Text style={s.itemSub} numberOfLines={1}>{item.sub}</Text>
                                        )}
                                    </View>
                                    {item.right && (
                                        <View style={s.itemRight}>
                                            <Text style={s.itemRightTxt}>{item.right}</Text>
                                        </View>
                                    )}
                                    {isSelected && <Text style={s.checkmark}>✓</Text>}
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={s.empty}>
                                <Text style={s.emptyTitle}>No results</Text>
                                <Text style={s.emptySub}>Try a different search term</Text>
                            </View>
                        }
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    wrap:         { marginBottom: 14 },
    fieldLabel:   { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },

    // Trigger button
    trigger:      { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 13, paddingVertical: 12, gap: 8 },
    triggerValue: { fontSize: 14, fontWeight: '600', color: T.ink },
    triggerSub:   { fontSize: 11, color: T.muted, marginTop: 1 },
    triggerPlaceholder: { fontSize: 14, color: T.muted },
    chevron:      { fontSize: 14, color: T.muted, flexShrink: 0 },

    // Modal
    modal:        { flex: 1, backgroundColor: T.bg },
    modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: T.nav },
    modalTitle:   { fontSize: 16, fontWeight: '800', color: '#fff' },
    closeBtn:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    closeTxt:     { fontSize: 18, color: '#A9C0D4' },

    // Search
    searchWrap:   { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 12 },
    searchIcon:   { fontSize: 18, color: T.muted, marginRight: 6 },
    searchInput:  { flex: 1, fontSize: 15, color: T.ink, paddingVertical: 12 },

    // Count bar
    countBar:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    countTxt:     { fontSize: 11, color: T.muted },
    clearTxt:     { fontSize: 11, fontWeight: '700', color: T.copper },

    // List items — fixed height 60px for getItemLayout
    item:         { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: T.alt },
    itemSelected: { backgroundColor: T.copper + '12' },
    itemLabel:    { fontSize: 14, fontWeight: '600', color: T.ink },
    itemLabelSelected: { color: T.copper, fontWeight: '800' },
    itemSub:      { fontSize: 11, color: T.muted, marginTop: 2 },
    itemRight:    { backgroundColor: T.sub, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
    itemRightTxt: { fontSize: 10, fontWeight: '700', color: T.muted },
    checkmark:    { fontSize: 16, color: T.copper, marginLeft: 8 },

    // Empty state
    empty:        { alignItems: 'center', paddingTop: 60 },
    emptyTitle:   { fontSize: 16, fontWeight: '700', color: T.muted },
    emptySub:     { fontSize: 12, color: T.muted, marginTop: 6 },
});
