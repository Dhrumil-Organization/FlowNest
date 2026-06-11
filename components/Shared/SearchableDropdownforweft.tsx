// components/Shared/SearchableDropdown.tsx
import React, { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Keyboard,
    Platform,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';

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
}

const normalizeLabelKeys = (k: KeyOrKeys) => (Array.isArray(k) ? k : [k]);

const SearchableDropdownforweft = forwardRef<any, Props>(({
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

    // const pickSingle = (item: Item) => {
    //     setSelectedSingle(item);
    //     onSelect(item);
    //     close();
    // };

    const pickSingle = (item: Item) => {

        // ================= DESIGN VALIDATION =================

        // if (item?.DsnCode) {

        //     const selectedDsnCode = String(item?.DsnCode || "").trim();
        //     const latestDsnCode = String(item?.latest_WfIssDsnCode || "").trim();
        //     const isReturnDone = String(
        //         item?.Is_IssRet_done_of_latest_WfIssDsnCode || "0"
        //     ).trim();

        //     if (
        //         selectedDsnCode !== latestDsnCode &&
        //         isReturnDone === "0"
        //     ) {

        //         Alert.alert(
        //             "Validation",
        //             "Issue Return Is Pending"
        //         );

        //         return; // 👈 dropdown close nahi hoga
        //     }
        // }

        // ================= NORMAL SELECT =================

        setSelectedSingle(item);
        onSelect(item);
        close();
    };

    const defaultRowContent = (item: Item, isSelected: boolean) => {
        // default left content: title + (subtitle full joined)
        const labelParts = labelKeys.map((k) => String(item[k] ?? '')).filter(Boolean);
        const title = labelParts[0] ?? '';
        const subtitle = labelParts.slice(1).join(' • ');
        return (
            <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, isSelected && styles.rowTitleSelected]}>{title}</Text>
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
                // style={[styles.row]}
                onPress={() => (multiple ? toggleMulti(item) : pickSingle(item))}
                activeOpacity={0.75}
                testID={`${testID || 'dropdown'}-row-${idOf(item)}`}
            >
                {renderRowContent ? renderRowContent(item, Boolean(isSelected)) : defaultRowContent(item, Boolean(isSelected))}

                {/* Right side: either custom node or check icon when selected */}
                {/* {renderRowRight ? renderRowRight(item) : isSelected ? <Icon name="check" size={18} color={theme.BRAND_ACCENT} /> : null} */}
            </TouchableOpacity>
        );
    };

    return (
        <>
            {/* Trigger */}
            <TouchableOpacity style={styles.trigger} onPress={open} activeOpacity={0.8}>
                <View style={{ flex: 1 }}>
                    {multiple ? (
                        <Text style={[styles.triggerText, selectedMulti.length === 0 && styles.placeholderText]}>
                            {selectedMulti.length === 0 ? placeholder : `${selectedMulti.length} selected`}
                        </Text>
                    ) : (
                        <Text style={[styles.triggerText, !selectedSingle && styles.placeholderText]}>
                            {selectedSingle ? labelKeys.map(k => String(selectedSingle[k] ?? '')).filter(Boolean).join(' • ') : placeholder}
                        </Text>
                    )}
                </View>
                <Icon name="arrow-drop-down" size={26} color={theme.TEXT_SECONDARY} />
            </TouchableOpacity>

            <Modal visible={visible} animationType="slide" onRequestClose={close} transparent>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.headerRow}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder={`Search ${placeholder}...`}
                                value={query}
                                onChangeText={setQuery}
                                autoFocus
                                returnKeyType="search"
                                clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
                            />
                            <TouchableOpacity onPress={close} style={styles.closeBtn}>
                                <Icon name="close" size={22} color={theme.TEXT_SECONDARY} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.listWrap}>
                            {displayList.length === 0 ? (
                                <View style={styles.empty}>
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
                                    <ActivityIndicator size="small" color={theme.BRAND_ACCENT} />
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F6F7FA',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
    },
    triggerText: {
        fontSize: 12,
        color: theme.TEXT_PRIMARY,
        // fontWeight: '600',
    },
    placeholderText: {
        color: theme.MUTED,
    },

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(10,10,12,0.45)',
        justifyContent: 'center',
        padding: 18,
    },
    modalCard: {
        backgroundColor: theme.SURFACE,
        borderRadius: 14,
        maxHeight: '100%',
        overflow: 'hidden',
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#F6F7FA',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        color: theme.TEXT_PRIMARY,
    },
    closeBtn: {
        marginLeft: 8,
        padding: 6,
    },

    listWrap: { maxHeight: 420, paddingHorizontal: 6 },

    row: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomColor: 'rgba(0,0,0,0.03)',
        borderBottomWidth: 1,
        backgroundColor: 'transparent',
        color: '#000',
    },
    rowSelected: {
        // backgroundColor: 'rgba(106,13,173,0.06)', // subtle theme highlight
        backgroundColor: 'rgba(54, 155, 178, 0.11)', // subtle theme highlight
    },
    // left content styles
    rowTitle: { fontSize: 12, color: theme.TEXT_PRIMARY, fontWeight: '800', flexWrap: 'wrap' },
    rowTitleSelected: { color: theme.BRAND_DARK },
    rowSubtitle: { fontSize: 12, color: theme.MUTED, marginTop: 4, flexWrap: 'wrap' },

    empty: { padding: 20, alignItems: 'center' },
    emptyText: { color: theme.MUTED },

    loadingMore: { padding: 12, alignItems: 'center' },

    footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderTopWidth: 1, borderColor: theme.BORDER || 'rgba(0,0,0,0.06)', },
    ghostAction: { paddingVertical: 8, paddingHorizontal: 12 },
    ghostText: { color: theme.TEXT_SECONDARY, fontWeight: '700' },
    primaryAction: { backgroundColor: theme.BRAND_ACCENT, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
    primaryText: { color: '#fff', fontWeight: '800' },
});

export default SearchableDropdownforweft;
