// NEW ERP themed copy of '@/Shared/SearchableDropdown' used only by the
// Purchase Order Tracking filter sheet. Behaviour (props contract, search,
// paging, single / multi selection, onSelect calls) is identical to the shared
// component — only the trigger, picker dialog and rows are re-skinned.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

type Item = Record<string, any>;
type KeyOrKeys = string | string[];

interface Props {
    data: Item[];                             // full dataset (can be large)
    labelKey: KeyOrKeys;                      // single key or array of keys to display in trigger
    valueKey?: KeyOrKeys;                     // unique identifying key(s)
    placeholder?: string;
    pageSize?: number;
    onSelect: (itemOrItems: Item | Item[]) => void; // returns selected item(s)
    initialValue?: Item | Item[] | null;
    emptyMessage?: string;
    testID?: string;
    multiple?: boolean;                       // single (default) or multiple select
    renderRowRight?: (item: Item) => React.ReactNode; // optional extra node per row (right side)
    renderRowContent?: (item: Item, isSelected: boolean) => React.ReactNode; // optional full custom row content (left side)
    icon?: string;                            // NEW UI: leading icon in the trigger
    title?: string;                           // NEW UI: picker dialog title
}

const normalizeLabelKeys = (k: KeyOrKeys) => (Array.isArray(k) ? k : [k]);

const PropertyDropdown = forwardRef<any, Props>(({
    data = [],
    labelKey,
    valueKey,
    placeholder = 'Select',
    pageSize = 10,
    onSelect,
    initialValue = null,
    emptyMessage = 'No items',
    testID,
    multiple = false,
    renderRowRight,
    renderRowContent,
    icon = 'apartment',
    title,
}, ref) => {
    const [visible, setVisible] = useState(false);
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [displayList, setDisplayList] = useState<Item[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedSingle, setSelectedSingle] = useState<Item | null>(
        !Array.isArray(initialValue) ? (initialValue as Item | null) : null
    );
    const [selectedMulti, setSelectedMulti] = useState<Item[]>(
        Array.isArray(initialValue) ? (initialValue as Item[]) : []
    );

    // stable signatures if arrays passed inline
    const labelKeySignature = Array.isArray(labelKey) ? String(labelKey.join('|')) : String(labelKey ?? '');
    const valueKeySignature = valueKey ? (Array.isArray(valueKey) ? String(valueKey.join('|')) : String(valueKey)) : '';

    const labelKeys = useMemo(() => normalizeLabelKeys(labelKey), [labelKeySignature]);
    const valueKeys = useMemo(() => (valueKey ? normalizeLabelKeys(valueKey) : null), [valueKeySignature]);

    const idOf = (it: Item) =>
        valueKeys
            ? valueKeys.map((k) => String(it[k] ?? '')).join('|')
            : JSON.stringify(it);

    const filtered = useMemo(() => {
        const src = Array.isArray(data) ? data : [];
        if (!query) return src;
        const q = query.trim().toLowerCase();
        try {
            return src.filter((d) => {
                return labelKeys.some((k) => String(d[k] ?? '').toLowerCase().includes(q));
            });
        } catch (err) {
            console.warn('SearchableDropdown: filter error', err);
            return src;
        }
    }, [data, query, labelKeys]);

    useImperativeHandle(ref, () => ({
        open: () => {
            setQuery('');
            setVisible(true);
        },
        close: () => {
            setVisible(false);
            Keyboard.dismiss();
        }
    }), []);

    // Reset pagination on data/query change
    useEffect(() => {
        const src = Array.isArray(filtered) ? filtered : [];
        setDisplayList(src.slice(0, pageSize));
        setPage(1);
    }, [filtered, pageSize]);

    useEffect(() => {
        // keep internal selected state in sync with parent-provided initialValue
        if (Array.isArray(initialValue)) {
            setSelectedMulti(initialValue as Item[]);
            setSelectedSingle(null);
        } else {
            setSelectedSingle(initialValue as Item | null);
            setSelectedMulti([]);
        }
    }, [initialValue]);

    // append next page
    const loadMore = () => {
        if (loadingMore) return;
        const totalLoaded = page * pageSize;
        if (totalLoaded >= filtered.length) return;
        setLoadingMore(true);
        setTimeout(() => {
            const nextPage = page + 1;
            const newLimit = Math.min(nextPage * pageSize, filtered.length);
            setDisplayList(filtered.slice(0, newLimit));
            setPage(nextPage);
            setLoadingMore(false);
        }, 120);
    };

    const open = () => {
        setQuery('');
        setVisible(true);
    };
    const close = () => {
        setVisible(false);
        Keyboard.dismiss();
    };

    // selection handling
    const toggleMulti = (item: Item) => {
        const id = idOf(item);
        const exists = selectedMulti.some((s) => idOf(s) === id);
        const next = exists ? selectedMulti.filter((s) => idOf(s) !== id) : [...selectedMulti, item];
        setSelectedMulti(next);
        onSelect(next);
    };

    const pickSingle = (item: Item) => {
        setSelectedSingle(item);
        onSelect(item);
        close();
    };

    const defaultRowContent = (item: Item, isSelected: boolean) => {
        // default left content: title + (subtitle full joined)
        const labelParts = labelKeys.map((k) => String(item[k] ?? '')).filter(Boolean);
        const rowTitle = labelParts[0] ?? '';
        const subtitle = labelParts.slice(1).join(' • ');
        return (
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.rowTitle, isSelected && styles.rowTitleSelected]}>{rowTitle}</Text>
                {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
            </View>
        );
    };

    const renderRow = ({ item }: { item: Item }) => {
        const isSelected =
            multiple
                ? selectedMulti.some((s) => idOf(s) === idOf(item))
                : selectedSingle && idOf(selectedSingle) === idOf(item);

        return (
            <TouchableOpacity
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => (multiple ? toggleMulti(item) : pickSingle(item))}
                activeOpacity={0.75}
                testID={`${testID || 'dropdown'}-row-${idOf(item)}`}
                accessibilityRole="button"
                accessibilityState={{ selected: Boolean(isSelected) }}
            >
                <Icon
                    name={multiple
                        ? (isSelected ? 'check-box' : 'check-box-outline-blank')
                        : (isSelected ? 'radio-button-checked' : 'radio-button-unchecked')}
                    size={19}
                    color={isSelected ? T.nav : T.muted}
                />
                {renderRowContent ? renderRowContent(item, Boolean(isSelected)) : defaultRowContent(item, Boolean(isSelected))}
                {renderRowRight ? renderRowRight(item) : null}
            </TouchableOpacity>
        );
    };

    const triggerLabel = multiple
        ? (selectedMulti.length === 0 ? '' : `${selectedMulti.length} selected`)
        : (selectedSingle ? labelKeys.map(k => String(selectedSingle[k] ?? '')).filter(Boolean).join(' • ') : '');

    return (
        <>
            {/* Trigger */}
            <TouchableOpacity
                style={[styles.trigger, !!triggerLabel && styles.triggerOn]}
                onPress={open}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${title || placeholder}: ${triggerLabel || placeholder}`}
            >
                <Icon name={icon as any} size={17} color={T.copper} />
                <Text style={[styles.triggerText, !triggerLabel && styles.placeholderText]} numberOfLines={1}>
                    {triggerLabel || placeholder}
                </Text>
                <Icon name="expand-more" size={20} color={T.muted} />
            </TouchableOpacity>

            <Modal visible={visible} animationType="fade" onRequestClose={close} transparent>
                <View style={styles.modalBackdrop}>
                    <TouchableWithoutFeedback onPress={close}>
                        <View style={styles.scrim} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modalCard}>
                        <View style={styles.headerRow}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.eyebrow}>SELECT</Text>
                                <Text style={styles.modalTitle} numberOfLines={1}>{title || placeholder}</Text>
                            </View>
                            <TouchableOpacity onPress={close} style={styles.closeBtn} accessibilityLabel="Close">
                                <Icon name="close" size={20} color={T.nav} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchWrap}>
                            <Icon name="search" size={18} color={T.muted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={`Search ${title || placeholder}...`}
                                placeholderTextColor={T.muted}
                                value={query}
                                onChangeText={setQuery}
                                autoFocus
                                returnKeyType="search"
                                clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
                            />
                        </View>

                        <View style={styles.listWrap}>
                            {displayList.length === 0 ? (
                                <View style={styles.empty}>
                                    <Icon name="search-off" size={26} color={T.copper} />
                                    <Text style={styles.emptyText}>{emptyMessage}</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={displayList}
                                    renderItem={renderRow}
                                    keyExtractor={(item, idx) => idOf(item) + '-' + idx}
                                    onEndReached={loadMore}
                                    onEndReachedThreshold={0.4}
                                    initialNumToRender={pageSize}
                                    maxToRenderPerBatch={pageSize}
                                    windowSize={7}
                                    keyboardShouldPersistTaps="handled"
                                />
                            )}
                            {loadingMore && (
                                <View style={styles.loadingMore}>
                                    <ActivityIndicator size="small" color={T.copper} />
                                </View>
                            )}
                        </View>

                        {multiple && (
                            <View style={styles.footer}>
                                <TouchableOpacity style={styles.ghostAction} onPress={() => { setSelectedMulti([]); onSelect([]); }}>
                                    <Text style={styles.ghostText}>Clear</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.primaryAction}
                                    onPress={() => {
                                        onSelect(selectedMulti);
                                        close();
                                    }}
                                >
                                    <Text style={styles.primaryText}>Done ({selectedMulti.length})</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
});

const styles = StyleSheet.create({
    trigger: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: T.border,
        borderRadius: 10,
        backgroundColor: T.surface,
        paddingHorizontal: 12,
    },
    triggerOn: { borderColor: `${T.nav}66` },
    triggerText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
    placeholderText: { color: T.muted, fontWeight: '600' },

    modalBackdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
    },
    scrim: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(13,27,42,0.5)',
    },
    modalCard: {
        width: '100%',
        maxWidth: 520,
        maxHeight: '90%',
        backgroundColor: T.surface,
        borderRadius: 16,
        overflow: 'hidden',
        ...S.sheet,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: T.hair,
    },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: T.nav },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.alt,
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 42,
        margin: 12,
        marginBottom: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.sub,
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: T.ink,
        paddingVertical: 0,
        minWidth: 0,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
    },

    listWrap: { maxHeight: 420, paddingHorizontal: 8, paddingBottom: 8 },

    row: {
        minHeight: 48,
        paddingVertical: 10,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderBottomColor: T.hair,
        borderBottomWidth: 1,
        borderRadius: 8,
    },
    rowSelected: { backgroundColor: `${T.nav}0D` },
    rowTitle: { fontSize: 13.5, color: T.ink, fontWeight: '700' },
    rowTitleSelected: { color: T.nav, fontWeight: '800' },
    rowSubtitle: { fontSize: 11.5, color: T.muted, marginTop: 2, fontWeight: '600' },

    empty: { padding: 24, alignItems: 'center', gap: 8 },
    emptyText: { color: T.muted, fontSize: 13, fontWeight: '600', textAlign: 'center' },

    loadingMore: { padding: 12, alignItems: 'center' },

    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: T.hair,
        backgroundColor: T.sub,
    },
    ghostAction: { height: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
    ghostText: { color: T.nav, fontWeight: '800' },
    primaryAction: { height: 40, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10, backgroundColor: T.nav },
    primaryText: { color: '#fff', fontWeight: '800' },
});

export default PropertyDropdown;
