// Local NEW ERP re-skin of the shared `@/Shared/PartyDropdownAdj` (bill
// adjustment picker + selected bills with editable "Received").
// The shared file is used by legacy screens, so it is copied here instead of
// edited. Everything from the interfaces down to updateItemField is the shared
// logic copied verbatim (D1/D2 sync, SrNo handling, Received <= Balance rule,
// remove / clear); only the rendered rows, selected cards and styles changed.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import SearchableDropdownAdj from './SearchableDropdownAdj';

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
    data: AdjData[];
    placeholder?: string;
    pageSize?: number;
    onSelect: (itemOrItems: AdjData[] | AdjData) => void;
    initialValue?: AdjData[] | AdjData | null;
    labelKey?: string | string[];
    valueKey?: string | string[];
    selected?: AdjData[];
    setSelected?: (items: AdjData[] | null) => void;
    loading?: boolean;
    multiple?: boolean;

    // authoritative form arrays and helpers from parent
    formD2?: AdjData[] | null;
    formD1?: D1Row[] | null;
    formUId?: string | null;
    onUpdateD2?: (d2: AdjData[]) => void;
    onUpdateD1?: (d1: D1Row[]) => void;
}

const initialsOf = (name?: string) => {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
};

const PartyDropdownAdj: React.FC<Props> = ({
    data,
    placeholder = 'Choose adjustment...',
    pageSize = 10,
    onSelect,
    initialValue = null,
    labelKey = ['BILLNO', 'NVOUDATE', 'NETAMT'],
    valueKey = 'UROWID',
    selected = [],
    setSelected,
    loading = false,
    multiple = true,
    formD2 = null,
    formD1 = null,
    formUId = null,
    onUpdateD2,
    onUpdateD1,
}, ref) => {
    const dropdownRef = useRef<any>(null);

    // localSelected holds AdjData items that we render as selected cards
    const [localSelected, setLocalSelected] = useState<AdjData[]>([]);
    // local id counter to create frontend-unique ids
    const [localIdSeq, setLocalIdSeq] = useState<number>(1);
    const genLocalId = (prefix = 'local') => {
        const id = `${prefix}-${Date.now()}-${localIdSeq}`;
        setLocalIdSeq(s => s + 1);
        return id;
    };

    // Expose methods via forwardRef
    useImperativeHandle(ref, () => ({
        clearAllSelections: () => {
            if (dropdownRef.current) {
                dropdownRef.current.clearAllSelections?.();
            }
            // Also clear local state
            setLocalSelected([]);
            emitUpdateToParent([]);
        }
    }));


    // Helper: consider many representations as "blank"
    const isBlank = (v: any) => {
        if (v === null || v === undefined) return true;
        const s = String(v).trim();
        if (s === '') return true;
        if (s === '0' || s === '0.00' || s === '.00' || s === '-1') return true;
        return false;
    };

    // Helper: determine if a D1 row is effectively empty (ignores SrNo as requested)
    const isEmptyD1Row = (r: Partial<D1Row> | any) => {
        // fields to check (SrNo intentionally not checked)
        const keysToCheck = ['SUId', 'SetAmt', 'TType', 'SSrNo', 'BillNo', 'BillDate', 'nBillDate', 'NetAmt'];
        return keysToCheck.every(k => isBlank(r[k]));
    };

    // Helper: format date-like strings to DD-MM-YYYY if possible
    const formatAdjDate = (raw?: string | null) => {
        if (!raw) return '—';
        const s = String(raw).trim();
        // if contains non-digit and is parseable by Date
        if (/[^\d]/.test(s)) {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}-${mm}-${yyyy}`;
            }
            return s;
        }
        // if exactly 8 digits -> assume yyyyMMdd
        if (/^\d{8}$/.test(s)) {
            const yyyy = s.slice(0, 4);
            const mm = s.slice(4, 6);
            const dd = s.slice(6, 8);
            // simple validation
            if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
                return `${dd}-${mm}-${yyyy}`;
            }
        }
        // fallback
        return s;
    };

    // synthAdjFromD1: create AdjData representation for a d1 row (used when defaults exist in form.d1)
    const synthAdjFromD1 = (d1: any): AdjData => {
        const sr = d1.SrNo ?? Math.floor(Math.random() * 1000000);
        const key = `d1-${String(sr)}`;
        return {
            UROWID: String(d1.SUId ?? d1.SrNo ?? `d1-${sr}`),
            BILLNO: d1.BillNo ?? '',
            NVOUDATE: d1.BillDate ?? d1.nBillDate ?? '',
            NBILLDATE: d1.nBillDate ?? '',
            NETAMT: d1.NetAmt ?? '',
            BALAMT: d1.NetAmt ?? '',
            BALAMT1: d1.SetAmt ?? '',
            ACCNAME: d1.ACCNAME ?? '',
            ZUID: d1.SUId ?? null,
            ZSRNO: d1.SSrNo ?? null,
            __key: key,
        } as AdjData;
    };

    // adjToD1Row: map AdjData -> D1Row (preserve SrNo if possible)
    const adjToD1Row = (adj: AdjData, nextSrNo: number): D1Row => {
        // if internal key is d1-<n>, reuse SrNo
        const ik = adj.__key ?? '';
        const m = /^d1-(\d+)$/.exec(ik);
        const sr = m ? Number(m[1]) : nextSrNo;
        return {
            UId: formUId ?? null,
            SrNo: sr,
            SUId: adj.ZUID ?? adj.UROWID ?? null,
            SetAmt: adj.BALAMT1 ?? adj.BALAMT ?? '',
            TType: adj.TTYPE ?? null,
            SSrNo: adj.ZSRNO ?? null,
            BillNo: adj.BILLNO ?? '',
            BillDate: adj.NVOUDATE ?? adj.NBILLDATE ?? '',
            nBillDate: adj.NBILLDATE ?? '',
            NetAmt: adj.NETAMT ?? '',
        } as D1Row;
    };

    // nextSrNoFor: compute next SrNo from existing d1 (non-empty)
    const nextSrNoFor = (existingD1: D1Row[] | null) => {
        if (Array.isArray(existingD1) && existingD1.length > 0) {
            const max = existingD1.reduce((m, r) => Math.max(m, Number(r.SrNo ?? 0)), 0);
            return max + 1;
        }
        return 1;
    };

    // Helper to create __key for server items / new items


    // Prefer billno as the stable key for UI; fallback to other ids or timestamp+idx
    // prefer frontend-local id, then billno, then existing __key, then server ids, then fallback
    const makeKeyForServerItem = (it: AdjData, idx?: number) => {
        // keep existing __localId or __key if present
        if ((it as any).__localId) return (it as any).__localId;
        if (it.__key) return it.__key;
        // prefer billno for readability but still generate a local id so keys are always unique
        if (it.BILLNO && String(it.BILLNO).trim() !== '') {
            const candidate = `billno-${String(it.BILLNO)}`;
            // but still attach a local id to guarantee uniqueness
            const local = genLocalId('bill');
            return `${candidate}::${local}`;
        }
        if (it.UROWID) return `urowid-${String(it.UROWID)}`;
        if (it.ZUID) return `zuid-${String(it.ZUID)}`;
        // final guaranteed-unique id
        return genLocalId('new');
    };

    // Update stableKeyForRender to use same logic
    const stableKeyForRender = (it: AdjData, idx?: number) => {
        return getItemKey(it) + '-' + (idx ?? 0);
    }



    // Compute maximum SrNo available from current D1 (non-empty) and from localSelected d1- keys
    const computeMaxExistingSrNo = (existingD1: D1Row[] | null, items: AdjData[]) => {
        let max = 0;
        if (Array.isArray(existingD1)) {
            existingD1.forEach(r => {
                const v = Number(r.SrNo ?? 0);
                if (!isNaN(v) && v > max) max = v;
            });
        }
        // also inspect selected items that were synthesized from d1 (have __key d1-<n>)
        (items || []).forEach(it => {
            const ik = it.__key ?? '';
            const m = /^d1-(\d+)$/.exec(ik);
            if (m) {
                const n = Number(m[1]);
                if (!isNaN(n) && n > max) max = n;
            }
        });
        return max;
    };

    useEffect(() => {
        if (Array.isArray(formD1) && formD1.length > 0) {
            const cleanedFormD1 = (formD1 as D1Row[]).filter(row => !isEmptyD1Row(row));
            const mapped: AdjData[] = cleanedFormD1.map((d1row) => {
                const found = (Array.isArray(data) ? data : []).find(it =>
                    (it.BILLNO && d1row.BillNo && String(it.BILLNO) === String(d1row.BillNo)) ||
                    (it.NVOUDATE && d1row.BillDate && String(it.NVOUDATE) === String(d1row.BillDate))
                );
                if (found) {
                    return {
                        ...found,
                        BALAMT1: d1row.SetAmt ?? found.BALAMT ?? found.NETAMT ?? '',
                        __key: `d1-${String(d1row.SrNo)}`,
                    } as AdjData;
                }
                return synthAdjFromD1(d1row);
            });
            setLocalSelected(mapped);
            try { onUpdateD2?.(mapped); } catch { }
            return;
        }
        if (Array.isArray(selected) && selected.length > 0) {
            const withKeys = selected.map((it, idx) => ({ ...it, __key: makeKeyForServerItem(it, idx) }));
            setLocalSelected(withKeys);
            return;
        }
        if (Array.isArray(initialValue) && initialValue.length > 0) {
            const withKeys = (initialValue as AdjData[]).map((it, idx) => ({ ...it, __key: makeKeyForServerItem(it, idx) }));
            setLocalSelected(withKeys);
            return;
        }
        setLocalSelected([]);
    }, [formD1, data, selected, initialValue]); // Removed formD2 dependency





    const makeEmptyD1Placeholder = (): D1Row => ({
        UId: formUId ?? null,
        SrNo: null,
        SUId: null,
        SetAmt: null,
        TType: null,
        SSrNo: null,
        BillNo: null,
        BillDate: null,
        nBillDate: null,
        NetAmt: null,
    });
    const emitUpdateToParent = (items: AdjData[]) => {
        const finalItems = items.map((item) => {
            return {
                ...item,
                BALAMT1: item.BALAMT1, // No auto-fill, allow empty or valid
            };
        });

        setLocalSelected(finalItems);
        onSelect?.(finalItems);
        onUpdateD2?.(finalItems);

        if (onUpdateD1 && Array.isArray(formD1)) {
            const currentD1 = formD1.filter(r => !isEmptyD1Row(r));
            const maxExistingSr = computeMaxExistingSrNo(currentD1, finalItems);
            const d1Rows = finalItems.map((adj, index) => {
                const srNo = adj.__d1SrNo || (maxExistingSr + 1 + index);
                return {
                    ...adjToD1Row(adj, srNo),
                    SetAmt: adj.BALAMT1 ?? '', // Allow empty or valid
                };
            });
            onUpdateD1(d1Rows);
        }
    };





    const getItemKey = (item: AdjData): string => {
        // Use BILLNO + BillDate as unique key (since SSrNo is -1 for both)
        if (item.BILLNO && item.NVOUDATE) {
            return `bill-${String(item.BILLNO)}-${String(item.NVOUDATE)}`;
        }
        if (item.BILLNO) {
            return `billno-${String(item.BILLNO)}`;
        }
        if (item.UROWID && String(item.UROWID).trim() !== '') {
            return `urowid-${String(item.UROWID)}`;
        }
        if (item.ZUID && String(item.ZUID).trim() !== '') {
            return `zuid-${String(item.ZUID)}`;
        }
        return `fallback-${JSON.stringify({ BILLNO: item.BILLNO, NVOUDATE: item.NVOUDATE })}`;
    };




    const handleDropdownSelect = (itemOrItems: any) => {
        const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
        if (!items.length) return;

        const existingBALAMT1 = new Map<string, string>();
        localSelected.forEach((s) => {
            const key = getItemKey(s);
            if (s.BALAMT1 && s.BALAMT1 !== '' && s.BALAMT1 !== '0' && s.BALAMT1 !== '0.00') {
                existingBALAMT1.set(key, s.BALAMT1);
            }
        });

        const uniqueItemsMap = new Map<string, AdjData>();
        [...localSelected, ...items].forEach((it) => {
            const key = getItemKey(it);
            const existingItem = uniqueItemsMap.get(key);
            if (!existingItem) {
                uniqueItemsMap.set(key, {
                    ...it,
                    BALAMT1: existingBALAMT1.get(key) || it.BALAMT1 || it.BALAMT || it.NETAMT || '',
                });
            }
        });

        const combined = Array.from(uniqueItemsMap.values());
        emitUpdateToParent(combined); // Ensure parent is updated
    };





    // Update removeItem function to use same key logic
    const removeItem = (it: AdjData) => {
        const key = getItemKey(it);
        const next = localSelected.filter(s => getItemKey(s) !== key);
        emitUpdateToParent(next);

        // also attempt to remove from formD1 if present by calling onUpdateD1
        if (typeof onUpdateD1 === 'function') {
            const currentD1 = Array.isArray(formD1) ? [...formD1] : [];
            const filteredD1 = currentD1.filter(r => {
                // Match by same criteria
                const rKey = getItemKey({
                    UROWID: r.SUId || '',
                    BILLNO: r.BillNo || '',
                    ZUID: r.SUId || ''
                } as AdjData);
                return rKey !== key;
            });
            try { onUpdateD1?.(filteredD1); } catch { }
        }
    };

    const updateItemField = (it: AdjData, key: string, value: any) => {
        const updatedItems = localSelected.map((s) => {
            if (getItemKey(s) === getItemKey(it)) {
                // Only update BALAMT1 if it's valid
                if (key === 'BALAMT1') {
                    const balance = parseFloat(s.BALAMT || '0') || 0;
                    const received = parseFloat(value) || 0;
                    if (received <= balance || value === '') {
                        return { ...s, [key]: value };
                    }
                    // Else: return unchanged
                    return s;
                }
                // For other keys, update normally
                return { ...s, [key]: value };
            }
            return s;
        });
        setLocalSelected(updatedItems);
        emitUpdateToParent(updatedItems);
    };





    // ---------- presentation (NEW ERP) ----------
    const { width: winW } = useWindowDimensions();
    const gridCols = winW >= 1100 ? 2 : 1;

    const money = (v: any) => {
        if (v === null || v === undefined || String(v).trim() === '') return '—';
        const n = parseFloat(String(v).replace(/,/g, ''));
        if (!Number.isFinite(n)) return String(v);
        return `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // render selected card (main UI for selected item)
    const renderSelectedCard = ({ item }: { item: AdjData }) => {
        return (
            <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                    <View style={styles.billIcon}>
                        <Icon name="receipt" size={16} color={T.copper} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>Bill {item.BILLNO ?? '—'}</Text>
                        <Text style={styles.cardSub} numberOfLines={1}>{item.ACCNAME ?? '—'}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => removeItem(item)}
                        style={styles.smallDelBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove bill ${item.BILLNO ?? ''}`}
                    >
                        <Icon name="close" size={17} color={T.red} />
                    </TouchableOpacity>
                </View>

                <View style={styles.metaRow}>
                    <View style={styles.metaCell}>
                        <Text style={styles.metaLabel}>Bill date</Text>
                        <Text style={styles.metaValue} numberOfLines={1}>{formatAdjDate(item.NVOUDATE ?? item.NBILLDATE)}</Text>
                    </View>
                    <View style={styles.metaCell}>
                        <Text style={styles.metaLabel}>Balance</Text>
                        <Text style={[styles.metaValue, { color: T.pd }]} numberOfLines={1}>{money(item.BALAMT ?? item.NETAMT)}</Text>
                    </View>
                    <View style={[styles.metaCell, styles.receivedCell]}>
                        <Text style={styles.metaLabel}>Received</Text>
                        <View style={styles.receivedBox}>
                            <Text style={styles.rupee}>₹</Text>
                            <TextInput
                                value={String(item.BALAMT1 ?? '')}
                                onChangeText={(t) => {
                                    const numericValue = t.replace(/[^0-9.]/g, '');
                                    const balance = parseFloat(item.BALAMT || '0') || 0;
                                    const received = parseFloat(numericValue) || 0;

                                    // Validation: Received <= Balance
                                    if (received <= balance || numericValue === '') {
                                        updateItemField(item, 'BALAMT1', numericValue);
                                    }
                                    // Else: ignore the change or show error
                                }}
                                keyboardType={Platform.OS === 'android' ? 'numeric' : 'numbers-and-punctuation'}
                                placeholder={item.BALAMT || item.NETAMT || "0.00"}
                                placeholderTextColor={T.muted}
                                style={styles.receivedInput}
                                returnKeyType="done"
                                accessibilityLabel={`Received for bill ${item.BILLNO ?? ''}`}
                            />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // row renderer for dropdown items
    const dropdownRowRenderer = (it: AdjData, isSelected: boolean) => {
        const billDate = formatAdjDate(it.NVOUDATE ?? it.NBILLDATE);
        const bal = it.BALAMT ?? it.NETAMT ?? '—';
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText, isSelected && { color: '#fff' }]}>{initialsOf(it.ACCNAME)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]} numberOfLines={1}>
                        {it.BILLNO ?? '—'}
                    </Text>
                    <View style={rowStyles.metaRow}>
                        <Icon name="calendar-today" size={12} color={T.muted} />
                        <Text style={rowStyles.metaText}>
                            <Text>Bill date: </Text>
                            <Text style={rowStyles.metaStrong}>{billDate}</Text>
                        </Text>
                    </View>
                </View>
                <View style={rowStyles.right}>
                    <Text style={rowStyles.balLabel}>Balance</Text>
                    <Text style={rowStyles.balValue} numberOfLines={1}>{money(bal)}</Text>
                </View>
            </View>
        );
    };

    return (
        <View>
            {loading ? (
                <View style={styles.loadingTrigger} accessibilityLabel="Loading">
                    <ActivityIndicator size="small" color={T.copper} />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            ) : (
                <View>
                    <SearchableDropdownAdj
                        ref={dropdownRef}
                        data={data}
                        labelKey={labelKey}
                        valueKey={valueKey}
                        placeholder={placeholder}
                        pageSize={pageSize}
                        onSelect={handleDropdownSelect}
                        initialValue={localSelected}
                        multiple={multiple}
                        emptyMessage="No adjustments"
                        renderRowContent={(item: AdjData, isSelected: boolean) => dropdownRowRenderer(item, isSelected)}
                        onUpdateD2={onUpdateD2}
                        setLocalSelected={setLocalSelected}
                        onUpdateD1={onUpdateD1}
                        makeEmptyD1Placeholder={makeEmptyD1Placeholder}
                        setSelected={setSelected}
                    />

                    {/* selected items list (cards). user can remove or edit Received */}
                    {localSelected.length === 0 ? (
                        <View style={styles.emptySel}>
                            <Icon name="receipt-long" size={22} color={T.copper} />
                            <Text style={styles.emptySelText}>
                                No bills selected yet. Use the picker above to choose the bills this cheque settles.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.selGrid}>
                            {localSelected.map((it, idx) => (
                                <View
                                    key={stableKeyForRender(it, idx)}
                                    style={gridCols > 1 ? styles.selCellHalf : styles.selCellFull}
                                >
                                    {renderSelectedCard({ item: it })}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    loadingTrigger: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: T.sub,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
    },
    loadingText: { color: T.muted, fontSize: 13, fontWeight: '600' },

    selGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginHorizontal: -5 },
    selCellFull: { width: '100%', padding: 5 },
    selCellHalf: { width: '50%', padding: 5 },

    emptySel: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: T.border,
        backgroundColor: T.sub,
    },
    emptySelText: { flex: 1, fontSize: 12.5, lineHeight: 18, fontWeight: '600', color: T.muted },

    card: {
        backgroundColor: T.surface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: T.border,
        gap: 10,
    },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    billIcon: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    cardTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
    cardSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },
    smallDelBtn: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.red}0D`,
        borderWidth: 1,
        borderColor: `${T.red}30`,
    },

    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
    },
    metaCell: { flexGrow: 1, flexBasis: 90, minWidth: 0 },
    metaLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
    metaValue: { fontSize: 13.5, fontWeight: '800', color: T.ink, marginTop: 3 },

    receivedCell: { flexBasis: 140 },
    receivedBox: {
        marginTop: 3,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: `${T.green}66`,
        backgroundColor: T.surface,
    },
    rupee: { fontSize: 13, fontWeight: '800', color: T.green },
    receivedInput: {
        flex: 1,
        minWidth: 0,
        paddingVertical: 0,
        fontSize: 14,
        fontWeight: '800',
        color: T.green,
        textAlign: 'right',
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
    },
});

const rowStyles = StyleSheet.create({
    rowInner: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: T.alt, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    avatarSelected: { backgroundColor: T.nav },
    avatarText: { color: T.nav, fontWeight: '800', fontSize: 12 },

    main: { flex: 1, minWidth: 0 },
    title: { fontSize: 13.5, color: T.ink, fontWeight: '800' },
    titleSelected: { color: T.nav },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    metaText: { color: T.muted, fontSize: 11.5, fontWeight: '600' },
    metaStrong: { fontWeight: '800', color: T.ink },
    right: { alignItems: 'flex-end', maxWidth: 140 },
    balLabel: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
    balValue: { fontSize: 13, fontWeight: '900', color: T.pd, marginTop: 1 },
});

export default React.forwardRef(PartyDropdownAdj);
