// Local NEW ERP re-skin of the shared `@/Shared/PartyDropdown`.
// The shared file is used by legacy screens, so it is copied here instead of
// edited. This module only uses the 'party' and 'payment' row types; the bank /
// branch / adj renderers are kept for parity and every other type falls back to
// the empty renderer exactly as before. Props, the onSelect + setSelected call
// order and the "tap the selected party card to re-open" behaviour are
// identical to the shared version; only the visuals changed.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useRef } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import SearchableDropdown from './SearchableDropdown';

export interface Party { accountname?: string; acccode?: string; Address?: string; email?: string; gstin?: string; ordno?: string;[k: string]: any; }

interface Props {
    data: Party[];
    placeholder?: string;
    pageSize?: number;
    onSelect: (item: Party) => void;
    initialValue?: Party | null;
    labelKey?: string | string[];
    valueKey?: string | string[];
    selected?: Party | null;
    setSelected?: (item: Party) => void;
    loading?: boolean;
    type?: string;
    multiple?: boolean;
}

interface BankData {
    BankName?: string;
}
interface AdjData {
    UROWID: string;
    ACCNAME: string;
    NVOUDATE: string;
    BILLNO: string;
    NETAMT: string;
    [k: string]: any;
}

interface PaymentData {
    paycode: string;
    paytype: string;
}

interface BranchData {
    BankBr?: string;
}

const extractLocation = (addr?: string) => {
    if (!addr) return '';
    const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : addr;
};

const initialsOf = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
};

const PartyDropdown: React.FC<Props> = ({
    data,
    placeholder = 'Choose...',
    pageSize = 10,
    onSelect,
    initialValue = null,
    labelKey,
    valueKey,
    selected,
    setSelected,
    loading = false,
    type,
    multiple = false,
}) => {
    const dropdownRef = useRef<any>(null);

    const renderRowContentEmpty = () => {
        return (
            null
        );
    };

    const avatar = (text: string | undefined, on: boolean) => (
        <View style={[rowStyles.avatar, on && rowStyles.avatarSelected]}>
            <Text style={[rowStyles.avatarText, on && { color: '#fff' }]}>{initialsOf(text)}</Text>
        </View>
    );

    const renderRowContent = (item: Party, isSelected: boolean) => {
        const location = extractLocation(item.Address);
        return (
            <View style={rowStyles.rowInner}>
                {avatar(item.accountname || item.accname, isSelected)}

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]} numberOfLines={2}>
                        {item.accountname || item.accname || '—'}
                    </Text>
                    <Text style={rowStyles.code} numberOfLines={1}>
                        {item.acccode || '—'}
                    </Text>

                    {item.Address ? (
                        <Text style={rowStyles.Address} numberOfLines={2}>
                            {item.Address}
                        </Text>
                    ) : null}

                    {(location || item.email || item.gstin || item.ordno) ? (
                        <View style={rowStyles.metaRow}>
                            {location ? (
                                <View style={rowStyles.metaPill}>
                                    <Icon name="place" size={13} color={T.copper} />
                                    <Text style={rowStyles.metaText} numberOfLines={1}>{location}</Text>
                                </View>
                            ) : null}

                            {item.email ? (
                                <View style={rowStyles.metaPill}>
                                    <Icon name="email" size={13} color={T.muted} />
                                    <Text style={rowStyles.metaText} numberOfLines={1}>{item.email}</Text>
                                </View>
                            ) : null}

                            {(item.gstin || item.ordno) ? (
                                <View style={rowStyles.metaPill}>
                                    <Icon name="fingerprint" size={13} color={T.muted} />
                                    <Text style={rowStyles.metaText} numberOfLines={1}>{item.gstin || item.ordno}</Text>
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                </View>
            </View>
        );
    };

    const renderRowContentAdj = (item: AdjData, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                {avatar(item.ACCNAME, isSelected)}
                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]} numberOfLines={1}>
                        {item.ACCNAME || '—'}
                    </Text>
                    <Text style={rowStyles.code}>{item.BILLNO || '—'}</Text>
                    <Text style={rowStyles.code}>{item.NVOUDATE || '—'}</Text>
                    <Text style={rowStyles.code}>{item.NETAMT || '—'}</Text>
                </View>
            </View>
        );
    };

    const renderSimple = (label: string | undefined, isSelected: boolean) => (
        <View style={rowStyles.rowInner}>
            {avatar(label, isSelected)}
            <View style={rowStyles.main}>
                <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]} numberOfLines={2}>
                    {label || '—'}
                </Text>
            </View>
        </View>
    );

    const renderRowContentBank = (item: BankData, isSelected: boolean) => renderSimple(item.BankName, isSelected);
    const renderRowContentPayment = (item: PaymentData, isSelected: boolean) => renderSimple(item.paytype, isSelected);
    const renderRowContentBranch = (item: BranchData, isSelected: boolean) => renderSimple(item.BankBr, isSelected);

    return (
        <View>
            {/* If loading: show a disabled trigger with spinner */}
            {loading ? (
                <View style={styles.loadingTrigger} accessibilityLabel="Loading">
                    <ActivityIndicator size="small" color={T.copper} />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            ) : (
                <SearchableDropdown
                    ref={dropdownRef}
                    data={data}
                    labelKey={labelKey || ''}
                    valueKey={valueKey}
                    placeholder={placeholder}
                    pageSize={pageSize}
                    onSelect={(itemOrItems) => {
                        const item = Array.isArray(itemOrItems) ? itemOrItems[0] : itemOrItems;
                        setSelected?.(item);
                        onSelect(item);
                    }}
                    initialValue={selected ?? initialValue}
                    multiple={multiple}
                    emptyMessage={type == 'bank' ? 'No banks!' : type == 'party' ? "No parties!" : type == 'branch' ? "No branches!" : type == 'payment' ? "No payments!" : type == 'adj' ? "No adjustments!" : 'No items'}
                    icon={type == 'party' ? 'person-outline' : type == 'payment' ? 'payments' : type == 'bank' ? 'account-balance' : undefined}
                    renderRowContent={type == 'bank' ? renderRowContentBank
                        : type == 'party' ? renderRowContent
                            : type == 'branch' ? renderRowContentBranch
                                : type == 'payment' ? renderRowContentPayment
                                    : type == 'adj' ? renderRowContentAdj
                                        : renderRowContentEmpty}
                />
            )}

            {/* Compact selected card (tap to edit) */}
            {type == 'party' && (<>
                {selected ? (
                    <TouchableOpacity
                        style={styles.selectedCard}
                        onPress={() => dropdownRef.current?.open?.()}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Change party ${selected.accountname || ''}`}
                    >
                        <View style={styles.selectedAvatar}>
                            <Text style={styles.selectedAvatarText}>{initialsOf(selected.accountname)}</Text>
                        </View>

                        <View style={styles.selectedBody}>
                            <Text style={styles.selectedTitle} numberOfLines={2}>{selected.accountname}</Text>
                            <Text style={styles.selectedCode} numberOfLines={1}>{selected.acccode}</Text>
                            {extractLocation(selected.Address) ? (
                                <View style={styles.selectedMetaRow}>
                                    <Icon name="place" size={13} color={T.copper} />
                                    <Text style={styles.selectedLocation} numberOfLines={1}>{extractLocation(selected.Address)}</Text>
                                </View>
                            ) : null}
                        </View>

                        <View style={styles.selectedRight}>
                            <Icon name="edit" size={17} color={T.nav} />
                        </View>
                    </TouchableOpacity>
                ) : null}
            </>)}

        </View>
    );
};

const rowStyles = StyleSheet.create({
    rowInner: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    avatar: {
        width: 34, height: 34, borderRadius: 10, backgroundColor: T.alt, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    avatarSelected: { backgroundColor: T.nav },
    avatarText: { color: T.nav, fontWeight: '800', fontSize: 12 },

    main: { flex: 1, minWidth: 0 },
    title: { fontSize: 13.5, color: T.ink, fontWeight: '700' },
    titleSelected: { color: T.nav, fontWeight: '800' },
    code: { fontSize: 11.5, color: T.muted, fontWeight: '700', marginTop: 2 },
    Address: { marginTop: 4, color: T.muted, fontSize: 11.5, lineHeight: 16 },

    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 10 },
    metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: T.muted, fontSize: 11.5, fontWeight: '600', maxWidth: 180 },
});

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

    selectedCard: {
        marginTop: 8,
        backgroundColor: T.sub,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: T.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    selectedAvatar: { width: 38, height: 38, borderRadius: 11, backgroundColor: T.nav, justifyContent: 'center', alignItems: 'center' },
    selectedAvatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },

    selectedBody: { flex: 1, minWidth: 0 },
    selectedTitle: { fontSize: 13.5, fontWeight: '800', color: T.ink },
    selectedCode: { fontSize: 11.5, fontWeight: '700', color: T.muted, marginTop: 1 },
    selectedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    selectedLocation: { color: T.muted, fontSize: 11.5, fontWeight: '600' },

    selectedRight: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.border,
    },
});

export default PartyDropdown;
