// Local NEW ERP re-skin of the shared `@/Shared/SearchableDropdownType`.
// The shared file is used by legacy screens, so it is copied here instead of
// edited. Props, the "use typed value" custom row, string initial values,
// paging and onSelect calls are identical to the shared version; only the
// trigger and picker visuals changed.
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
    useWindowDimensions,
    View,
} from 'react-native';

type Item = Record<string, any>;
type KeyOrKeys = string | string[];

interface Props {
    data: Item[];
    labelKey: KeyOrKeys;
    valueKey?: KeyOrKeys;
    placeholder?: string;
    pageSize?: number;
    onSelect: (itemOrItems: Item | Item[]) => void;
    initialValue?: Item | Item[] | string | null;
    emptyMessage?: string;
    testID?: string;
    multiple?: boolean;
    renderRowRight?: (item: Item) => React.ReactNode;
    renderRowContent?: (item: Item, isSelected: boolean) => React.ReactNode;
    icon?: string;                            // NEW UI: leading icon in the trigger
    title?: string;                           // NEW UI: picker title
}

const normalizeLabelKeys = (k: KeyOrKeys) => (Array.isArray(k) ? k : [k]);

const SearchableDropdownType = forwardRef<any, Props>(({
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
    icon,
    title,
}, ref) => {
    const [visible, setVisible] = useState(false);
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [displayList, setDisplayList] = useState<Item[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);

    const [selectedSingle, setSelectedSingle] = useState<Item | null>(null);
    const [selectedMulti, setSelectedMulti] = useState<Item[]>([]);
    const { width } = useWindowDimensions();
    const wide = width >= 720;

    // stable signatures
    const labelKeySignature = Array.isArray(labelKey) ? String(labelKey.join('|')) : String(labelKey ?? '');
    const valueKeySignature = valueKey ? (Array.isArray(valueKey) ? String(valueKey.join('|')) : String(valueKey)) : '';

    const labelKeys = useMemo(() => normalizeLabelKeys(labelKey), [labelKeySignature]);
    const valueKeys = useMemo(() => (valueKey ? normalizeLabelKeys(valueKey) : null), [valueKeySignature]);

    const idOf = (it: Item) => {
        if (!it) return JSON.stringify(it);
        if (it.isCustom) return `custom::${String(it[labelKeys[0]] ?? '')}`;
        if (valueKeys && valueKeys.length) return valueKeys.map(k => String(it[k] ?? '')).join('|');
        return JSON.stringify(it);
    };

    // filter by query (search across label keys)
    const filtered = useMemo(() => {
        const src = Array.isArray(data) ? data : [];
        if (!query) return src;
        const q = query.trim().toLowerCase();
        try {
            return src.filter(d => labelKeys.some(k => String(d[k] ?? '').toLowerCase().includes(q)));
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

    // Build displayList including custom candidate (first row) if needed
    useEffect(() => {
        const src = Array.isArray(filtered) ? filtered : [];
        const customCandidate = createCustomItemFromQuery(query, data, labelKeys, valueKeys);
        const limit = pageSize || 10;
        if (customCandidate) {
            const rest = src.slice(0, Math.max(0, limit - 1));
            setDisplayList([customCandidate, ...rest]);
        } else {
            setDisplayList(src.slice(0, limit));
        }
        setPage(1);
    }, [filtered, query, pageSize, data, labelKeys, valueKeys]);

    // sync initialValue (support string or object)
    useEffect(() => {
        if (Array.isArray(initialValue)) {
            setSelectedMulti(initialValue as Item[]);
            setSelectedSingle(null);
            return;
        }
        if (initialValue && typeof initialValue === 'object') {
            setSelectedSingle(initialValue as Item);
            setSelectedMulti([]);
            return;
        }
        if (initialValue && typeof initialValue === 'string') {
            // interpret string as a custom item
            const obj: Item = { [Array.isArray(labelKey) ? labelKey[0] : labelKey]: initialValue, isCustom: true };
            setSelectedSingle(obj);
            setSelectedMulti([]);
            return;
        }
        setSelectedSingle(null);
        setSelectedMulti([]);
    }, [initialValue, labelKey]);

    const loadMore = () => {
        if (loadingMore) return;
        const totalLoaded = page * (pageSize || 10);
        const base = Array.isArray(filtered) ? filtered : [];
        if (totalLoaded >= base.length) return;
        setLoadingMore(true);
        setTimeout(() => {
            const nextPage = page + 1;
            const newLimit = Math.min(nextPage * (pageSize || 10), base.length);
            const customCandidate = createCustomItemFromQuery(query, data, labelKeys, valueKeys);
            if (customCandidate) setDisplayList([customCandidate, ...base.slice(0, newLimit - 1)]);
            else setDisplayList(base.slice(0, newLimit));
            setPage(nextPage);
            setLoadingMore(false);
        }, 120);
    };

    const open = () => { setQuery(''); setVisible(true); };
    const close = () => { setVisible(false); Keyboard.dismiss(); };

    const toggleMulti = (item: Item) => {
        const id = idOf(item);
        const exists = selectedMulti.some(s => idOf(s) === id);
        const next = exists ? selectedMulti.filter(s => idOf(s) !== id) : [...selectedMulti, item];
        setSelectedMulti(next);
        onSelect(next);
    };

    const pickSingle = (item: Item) => {
        setSelectedSingle(item);
        onSelect(item);
        close();
    };

    const defaultRowContent = (item: Item, isSelected: boolean) => {
        const labelParts = labelKeys.map(k => String(item[k] ?? '')).filter(Boolean);
        const rowTitle = labelParts[0] ?? '';
        const subtitle = labelParts.slice(1).join(' • ');
        return (
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.rowTitle, isSelected && styles.rowTitleSelected]} numberOfLines={2}>{rowTitle}</Text>
                {subtitle ? <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
        );
    };

    const renderRow = ({ item }: { item: Item }) => {
        const isSelected = multiple
            ? selectedMulti.some(s => idOf(s) === idOf(item))
            : (selectedSingle && idOf(selectedSingle) === idOf(item));

        if (item && item.isCustom) {
            const label = String(item[labelKeys[0]] ?? '');
            return (
                <TouchableOpacity
                    style={[styles.row, styles.customRow]}
                    onPress={() => pickSingle(item)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${label}`}
                >
                    <View style={styles.customIcon}>
                        <Icon name="add" size={18} color={T.copper} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.customTitle} numberOfLines={1}>Use “{label}”</Text>
                        <Text style={styles.rowSubtitle}>Tap to use typed value</Text>
                    </View>
                </TouchableOpacity>
            );
        }

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

    const triggerText = multiple
        ? (selectedMulti.length === 0 ? '' : `${selectedMulti.length} selected`)
        : (selectedSingle ? labelKeys.map(k => String(selectedSingle[k] ?? '')).filter(Boolean).join(' • ') : '');

    return (
        <>
            <TouchableOpacity
                style={[styles.trigger, !!triggerText && { borderColor: `${T.nav}66` }]}
                onPress={open}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${title || placeholder}: ${triggerText || placeholder}`}
            >
                {icon ? <Icon name={icon as any} size={17} color={T.copper} /> : null}
                <Text style={[styles.triggerText, !triggerText && styles.placeholderText]} numberOfLines={1}>
                    {triggerText || placeholder}
                </Text>
                <Icon name="expand-more" size={20} color={T.muted} />
            </TouchableOpacity>

            <Modal visible={visible} animationType={wide ? 'fade' : 'slide'} onRequestClose={close} transparent>
                <View style={[styles.modalBackdrop, wide ? styles.backdropWide : styles.backdropPhone]}>
                    <TouchableWithoutFeedback onPress={close}>
                        <View style={styles.scrim} />
                    </TouchableWithoutFeedback>
                    <View style={[styles.modalCard, wide ? styles.cardWide : styles.cardPhone]}>
                        {!wide ? <View style={styles.handle} /> : null}
                        <View style={styles.headRow}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.eyebrow}>{multiple ? 'SELECT ONE OR MORE' : 'SELECT OR TYPE'}</Text>
                                <Text style={styles.headTitle} numberOfLines={1}>{title || placeholder}</Text>
                            </View>
                            <TouchableOpacity onPress={close} style={styles.closeBtn} accessibilityLabel="Close">
                                <Icon name="close" size={20} color={T.nav} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchWrap}>
                            <View style={styles.search}>
                                <Icon name="search" size={18} color={T.muted} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={`Search ${placeholder}...`}
                                    placeholderTextColor={T.muted}
                                    value={query}
                                    onChangeText={setQuery}
                                    autoFocus
                                    returnKeyType="search"
                                    clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
                                />
                                {!!query ? (
                                    <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Clear search">
                                        <Icon name="cancel" size={17} color={T.muted} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
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
                                <TouchableOpacity style={styles.ghostAction} onPress={() => { setSelectedMulti([]); onSelect([]); }} accessibilityRole="button">
                                    <Text style={styles.ghostText}>Clear</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.primaryAction} onPress={() => { onSelect(selectedMulti); close(); }} accessibilityRole="button">
                                    <Icon name="check" size={17} color="#fff" />
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

function createCustomItemFromQuery(query: string, data: Item[], labelKeys: string[], valueKeys: string[] | null): Item | null {
    const q = query?.trim();
    if (!q) return null;
    const src = Array.isArray(data) ? data : [];
    const exactMatch = src.some(d => labelKeys.some(k => String(d[k] ?? '').toLowerCase() === q.toLowerCase()));
    if (exactMatch) return null;
    const newItem: Item = { isCustom: true };
    if (labelKeys.length) newItem[labelKeys[0]] = q;
    if (valueKeys && valueKeys.length) newItem[valueKeys[0]] = q;
    return newItem;
}

const styles = StyleSheet.create({
    trigger: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: T.surface,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
    },
    triggerText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
    placeholderText: { color: T.muted, fontWeight: '600' },

    modalBackdrop: { flex: 1 },
    backdropWide: { alignItems: 'center', justifyContent: 'center', padding: 24 },
    backdropPhone: { justifyContent: 'flex-end' },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,27,42,0.5)' },
    modalCard: { backgroundColor: T.surface, overflow: 'hidden', ...S.sheet },
    cardWide: { width: '100%', maxWidth: 520, maxHeight: '86%', borderRadius: 16 },
    cardPhone: { borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '88%' },
    handle: { alignSelf: 'center', width: 38, height: 4.5, borderRadius: 3, backgroundColor: T.border, marginTop: 8 },

    headRow: {
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
    headTitle: { fontSize: 16, fontWeight: '800', color: T.nav },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.alt,
    },
    searchWrap: { paddingHorizontal: 12, paddingVertical: 10 },
    search: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 42,
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

    listWrap: { maxHeight: 420, flexShrink: 1, paddingHorizontal: 8, paddingBottom: 6 },

    row: {
        minHeight: 48,
        paddingVertical: 8,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 10,
        borderBottomColor: T.hair,
        borderBottomWidth: 1,
        backgroundColor: 'transparent',
    },
    rowSelected: { backgroundColor: `${T.nav}0D` },
    customRow: {
        backgroundColor: `${T.copper}12`,
        borderWidth: 1,
        borderColor: `${T.copper}40`,
        marginBottom: 6,
    },
    customIcon: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.surface,
    },
    customTitle: { fontSize: 13.5, fontWeight: '800', color: T.pd },
    rowTitle: { fontSize: 13.5, color: T.ink, fontWeight: '700' },
    rowTitleSelected: { color: T.nav, fontWeight: '800' },
    rowSubtitle: { fontSize: 11.5, color: T.muted, fontWeight: '600', marginTop: 2 },

    empty: { padding: 28, alignItems: 'center', gap: 8 },
    emptyText: { color: T.muted, fontSize: 13, fontWeight: '600', textAlign: 'center' },

    loadingMore: { padding: 12, alignItems: 'center' },

    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: T.hair,
        backgroundColor: T.sub,
    },
    ghostAction: {
        height: 44,
        paddingHorizontal: 18,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ghostText: { color: T.nav, fontWeight: '800', fontSize: 14 },
    primaryAction: {
        flex: 1,
        height: 44,
        flexDirection: 'row',
        gap: 6,
        backgroundColor: T.nav,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

export default SearchableDropdownType;
