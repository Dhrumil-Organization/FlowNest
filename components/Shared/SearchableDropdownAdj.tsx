// components/Shared/SearchableDropdownAdj.tsx
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';

type Item = Record<string, any>;
type KeyOrKeys = string | string[];

export interface AdjData {
    UROWID: string;
    BILLFROM?: string;
    TTYPE?: string;
    PARCODE?: string;
    ACCNAME?: string;
    VOUNO?: string;
    NVOUDATE?: string;
    BILLNO?: string;
    NBILLDATE?: string;
    BILLQTY?: string;
    NETAMT?: string;
    BALAMT?: string;
    BALAMT1?: string; // Received (editable)
    ZUID?: string;
    ZSRNO?: string;
    CONTRANAME?: string;
    DueDay?: string;
    NVOUDATE1?: string;
    ORDERNO?: string;
    // internal
    __key?: string;
    __localId?: string;
    __d1SrNo?: number; // <-- NEW: Track D1 SrNo
    [k: string]: any;
}

export interface D1Row {
    UId: string | null;
    SrNo: number | null;
    SUId: string | null;
    SetAmt: string | null;
    TType: string | null;
    SSrNo: string | null;
    BillNo: string | null;
    BillDate: string | null;
    nBillDate: string | null;
    NetAmt: string | null;
    [k: string]: any;
}

interface Props {
    data: Item[];
    labelKey: KeyOrKeys;
    valueKey?: KeyOrKeys;
    placeholder?: string;
    pageSize?: number;
    onSelect: (itemOrItems: Item | Item[]) => void;
    initialValue?: Item | Item[] | null;
    emptyMessage?: string;
    testID?: string;
    multiple?: boolean;
    renderRowContent?: (item: Item, isSelected: boolean) => React.ReactNode;
    onUpdateD2?: (d2: AdjData[]) => void;
    setLocalSelected: (item: AdjData[]) => void;
    onUpdateD1?: (d1: D1Row[]) => void;
    makeEmptyD1Placeholder?: () => D1Row;
    setSelected?: (item: Item | null) => void;
    formD1?: D1Row[] | null; // <-- NEW: Pass current D1 for SrNo sync
}

const normalizeLabelKeys = (k: KeyOrKeys) => (Array.isArray(k) ? k : [k]);

const SearchableDropdownAdj = forwardRef<any, Props>(
    (
        {
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
            renderRowContent,
            onUpdateD2,
            setLocalSelected,
            onUpdateD1,
            makeEmptyD1Placeholder,
            setSelected,
            formD1 = null, // <-- NEW
        },
        ref
    ) => {
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

        const labelKeySignature = Array.isArray(labelKey) ? String(labelKey.join('|')) : String(labelKey ?? '');
        const valueKeySignature = valueKey
            ? Array.isArray(valueKey)
                ? String(valueKey.join('|'))
                : String(valueKey)
            : '';

        const labelKeys = useMemo(() => normalizeLabelKeys(labelKey), [labelKeySignature]);
        const valueKeys = useMemo(() => (valueKey ? normalizeLabelKeys(valueKey) : null), [valueKeySignature]);

        const idOf = (it: Item) => {
            try {
                if (!it) return JSON.stringify(it);
                if (it.UROWID) return String(it.UROWID);
                if (valueKeys && valueKeys.length) return valueKeys.map(k => String(it[k] ?? '')).join('|');
                return JSON.stringify(it);
            } catch {
                return String(Math.random());
            }
        };

        const filtered = useMemo(() => {
            const src = Array.isArray(data) ? data : [];
            if (!query) return src;
            const q = query.trim().toLowerCase();
            try {
                return src.filter(d =>
                    labelKeys.some(k => String(d[k] ?? '').toLowerCase().includes(q))
                );
            } catch (err) {
                console.warn('SearchableDropdownAdj: filter error', err);
                return src;
            }
        }, [data, query, labelKeys]);

        // useImperativeHandle(
        //     ref,
        //     () => ({
        //         open: () => {
        //             setQuery('');
        //             setVisible(true);
        //         },
        //         close: () => {
        //             setVisible(false);
        //             Keyboard.dismiss();
        //         },
        //     }),
        //     []
        // );
        // In SearchableDropdownAdj.tsx - update the useImperativeHandle
        useImperativeHandle(
            ref,
            () => ({
                open: () => {
                    setQuery('');
                    setVisible(true);
                },
                close: () => {
                    setVisible(false);
                    Keyboard.dismiss();
                },
                clearAllSelections: () => {
                    setSelectedMulti([]);
                    setSelectedSingle(null);
                    setLocalSelected([]); // If this prop exists
                }
            }),
            []
        );

        useEffect(() => {
            const src = Array.isArray(filtered) ? filtered : [];
            setDisplayList(src.slice(0, pageSize));
            setPage(1);
        }, [filtered, pageSize]);

        // sync initialValue with D1 SrNo tracking
        useEffect(() => {
            if (Array.isArray(initialValue)) {
                const withSrNo = (initialValue as AdjData[]).map(item => {
                    // Try to find matching D1 row to get SrNo
                    if (formD1 && Array.isArray(formD1)) {
                        const matchingD1 = formD1.find(d1 =>
                            (d1.SUId && item.ZUID && String(d1.SUId) === String(item.ZUID)) ||
                            (d1.BillNo && item.BILLNO && String(d1.BillNo) === String(item.BILLNO))
                        );
                        if (matchingD1?.SrNo) {
                            return { ...item, __d1SrNo: matchingD1.SrNo };
                        }
                    }
                    return item;
                });
                setSelectedMulti(withSrNo);
                setSelectedSingle(null);
            } else {
                setSelectedSingle(initialValue as Item | null);
                setSelectedMulti([]);
            }
        }, [initialValue, formD1]);

        const loadMore = () => {
            if (loadingMore) return;
            const totalLoaded = page * (pageSize || 10);
            if (totalLoaded >= filtered.length) return;
            setLoadingMore(true);
            setTimeout(() => {
                const nextPage = page + 1;
                const newLimit = Math.min(nextPage * (pageSize || 10), filtered.length);
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

        // SearchableDropdownAdj.tsx - Update toggleMulti function

        const toggleMulti = (item: Item) => {
            const id = idOf(item);

            // Check if already selected using UROWID/BILLNO
            const exists = selectedMulti.some(s => {
                // Use same identification logic as PartyDropdownAdj
                const sUROWID = s.UROWID || '';
                const itemUROWID = item.UROWID || '';
                const sBILLNO = s.BILLNO || '';
                const itemBILLNO = item.BILLNO || '';

                if (sUROWID && itemUROWID && sUROWID === itemUROWID) return true;
                if (sBILLNO && itemBILLNO && sBILLNO === itemBILLNO) return true;

                return idOf(s) === id;
            });

            let next;

            if (exists) {
                next = selectedMulti.filter(s => {
                    const sUROWID = s.UROWID || '';
                    const itemUROWID = item.UROWID || '';
                    const sBILLNO = s.BILLNO || '';
                    const itemBILLNO = item.BILLNO || '';

                    if (sUROWID && itemUROWID && sUROWID === itemUROWID) return false;
                    if (sBILLNO && itemBILLNO && sBILLNO === itemBILLNO) return false;

                    return idOf(s) !== id;
                });
            } else {
                // Assign a temporary D1 SrNo (will be finalized on Done)
                const maxSrNo = selectedMulti.reduce((max, s) => {
                    const sr = (s as AdjData).__d1SrNo;
                    return sr && sr > max ? sr : max;
                }, 0);
                next = [...selectedMulti, { ...item, __d1SrNo: maxSrNo + 1 }];
            }
            setSelectedMulti(next);
        };

        const pickSingle = (item: Item) => {
            setSelectedSingle(item);
        };

        const defaultRowContent = (item: Item, isSelected: boolean) => {
            const labelParts = labelKeys.map(k => String(item[k] ?? '')).filter(Boolean);
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
            const isSelected = multiple
                ? selectedMulti.some(s => idOf(s) === idOf(item))
                : selectedSingle && idOf(selectedSingle) === idOf(item);

            // Show D1 SrNo in dropdown if available
            const d1SrNo = (item as AdjData).__d1SrNo;
            const showSrNo = multiple && d1SrNo;

            return (
                <TouchableOpacity
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => {
                        if (multiple) {
                            toggleMulti(item);
                        } else {
                            pickSingle(item);
                            onSelect(item);
                            close();
                        }
                    }}
                    activeOpacity={0.75}
                    testID={`${testID || 'dropdown'}-row-${idOf(item)}`}
                >
                    {showSrNo && (
                        <View style={styles.srNoBadge}>
                            <Text style={styles.srNoText}>D1: {d1SrNo}</Text>
                        </View>
                    )}
                    {renderRowContent
                        ? renderRowContent(item, Boolean(isSelected))
                        : defaultRowContent(item, Boolean(isSelected))}
                </TouchableOpacity>
            );
        };

        // SearchableDropdownAdj.tsx में clearAllSelections function
        const clearAllSelections = () => {
            setSelectedMulti([]);
            setSelectedSingle(null);
            setLocalSelected([]); // If this prop exists

            // D1 को भी clear करें
            try {
                onUpdateD1?.([makeEmptyD1Placeholder?.() || {
                    UId: null,
                    SrNo: null,
                    SUId: null,
                    SetAmt: null,
                    TType: null,
                    SSrNo: null,
                    BillNo: null,
                    BillDate: null,
                    nBillDate: null,
                    NetAmt: null,
                }]);
            } catch (e) { console.error('Error clearing D1:', e); }

            try { onUpdateD2?.([]); } catch (e) { console.error('Error clearing D2:', e); }
            try { onSelect?.([]); } catch (e) { console.error('Error in onSelect:', e); }
            try { setSelected?.(null); } catch (e) { console.error('Error in setSelected:', e); }
        };

        const handleDone = () => {
            // Generate proper D1 SrNo sequence before closing
            const withSequentialSrNo = selectedMulti.map((item, index) => ({
                ...item,
                __d1SrNo: index + 1 // Generate sequential SrNo
            }));

            setSelectedMulti(withSequentialSrNo);
            onSelect(withSequentialSrNo);
            close();
        };

        return (
            <>
                <TouchableOpacity style={styles.trigger} onPress={open} activeOpacity={0.8}>
                    <View style={{ flex: 1 }}>
                        {multiple ? (
                            <Text
                                style={[styles.triggerText, selectedMulti.length === 0 && styles.placeholderText]}
                            >
                                {selectedMulti.length === 0 ? placeholder : `${selectedMulti.length} selected`}
                            </Text>
                        ) : (
                            <Text style={[styles.triggerText, !selectedSingle && styles.placeholderText]}>
                                {selectedSingle
                                    ? labelKeys
                                        .map(k => String(selectedSingle[k] ?? ''))
                                        .filter(Boolean)
                                        .join(' • ')
                                    : placeholder}
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
                                    <TouchableOpacity
                                        style={styles.ghostAction}
                                        onPress={clearAllSelections}
                                    >
                                        <Text style={styles.ghostText}>Clear</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.primaryAction}
                                        onPress={handleDone}
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
    }
);

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
    listWrap: {
        maxHeight: 420,
        paddingHorizontal: 6,
    },
    row: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomColor: 'rgba(0,0,0,0.03)',
        borderBottomWidth: 1,
        backgroundColor: 'transparent',
    },
    rowSelected: {
        backgroundColor: 'rgba(54, 155, 178, 0.11)',
    },
    rowTitle: {
        fontSize: 12,
        color: theme.TEXT_PRIMARY,
        fontWeight: '800',
        flexWrap: 'wrap',
    },
    rowTitleSelected: {
        color: theme.BRAND_DARK,
    },
    rowSubtitle: {
        fontSize: 12,
        color: theme.MUTED,
        marginTop: 4,
        flexWrap: 'wrap',
    },
    srNoBadge: {
        backgroundColor: theme.BRAND_ACCENT,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 8,
    },
    srNoText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: 'bold',
    },
    empty: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.MUTED,
    },
    loadingMore: {
        padding: 12,
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        borderTopWidth: 1,
        borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
    },
    ghostAction: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    ghostText: {
        color: theme.TEXT_SECONDARY,
        fontWeight: '700',
    },
    primaryAction: {
        backgroundColor: theme.BRAND_ACCENT,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    primaryText: {
        color: '#fff',
        fontWeight: '800',
    },
});

export default SearchableDropdownAdj;