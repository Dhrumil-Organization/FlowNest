// Local NEW ERP re-skin of the shared `@/Shared/PartyDropdownType` (bank / branch
// pickers that also accept a typed value). The shared file is used by legacy
// screens, so it is copied here instead of edited. Props, string/object value
// normalisation and the onSelect + setSelected calls are identical to the
// shared version; only the visuals changed.
import { T } from '@/src/theme';
import React, { useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SearchableDropdownType from './SearchableDropdownType';

export interface Party { accountname?: string; acccode?: string; Address?: string; email?: string; gstin?: string; ordno?: string;[k: string]: any; }

interface Props {
    data: Party[];
    placeholder?: string;
    pageSize?: number;
    onSelect: (item: Party) => void;
    initialValue?: Party | string | null;
    labelKey?: string | string[];
    valueKey?: string | string[];
    selected?: Party | string | null;
    setSelected?: (item: Party | null) => void;
    loading?: boolean;
    type?: string;
}

const initialsOf = (name?: string) => {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
};

const makeObjectFromLabel = (labelKey: string | string[] | undefined, value: string) => {
    if (!labelKey) return { value };
    const key = Array.isArray(labelKey) ? labelKey[0] : labelKey;
    return { [key]: value, isCustom: true };
};

const PartyDropdownType: React.FC<Props> = ({
    data,
    placeholder = 'Choose...',
    pageSize = 10,
    onSelect,
    initialValue = null,
    labelKey = 'accountname',
    valueKey,
    selected,
    setSelected,
    loading = false,
    type,
}) => {
    const dropdownRef = useRef<any>(null);

    // normalize string initial/selected to object so SearchableDropdown shows it correctly
    const normalizeToObject = (v: any) => {
        if (v === undefined || v === null) return null;
        if (typeof v === 'string') return makeObjectFromLabel(labelKey, v);
        return v;
    };

    const initialObject = normalizeToObject(initialValue);
    const selectedObject = normalizeToObject(selected);

    const handleOnSelect = (itemOrItems: any) => {
        const item = Array.isArray(itemOrItems) ? itemOrItems[0] : itemOrItems;
        const out = (item && typeof item === 'object') ? item : makeObjectFromLabel(labelKey, String(item ?? ''));
        onSelect(out);
        setSelected?.(out);
    };

    const renderRowContent = (item: Party, isSelected: boolean) => {
        const name = item.accountname ?? item.BankName ?? item.BankBr ?? '';
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText, isSelected && { color: '#fff' }]}>{initialsOf(name)}</Text>
                </View>
                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]} numberOfLines={2}>
                        {name || '—'}
                    </Text>
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
                <SearchableDropdownType
                    ref={dropdownRef}
                    data={data}
                    labelKey={type === 'bank' ? 'BankName' : type === 'branch' ? 'BankBr' : labelKey}
                    valueKey={valueKey}
                    placeholder={placeholder}
                    pageSize={pageSize}
                    onSelect={handleOnSelect}
                    initialValue={selectedObject ?? initialObject}
                    multiple={false}
                    emptyMessage={type === 'bank' ? 'No banks!' : type === 'party' ? "No parties!" : type === 'branch' ? "No branches!" : 'No items'}
                    renderRowContent={renderRowContent}
                    icon={type === 'bank' ? 'account-balance' : type === 'branch' ? 'place' : undefined}
                />
            )}
        </View>
    );
};

const rowStyles = StyleSheet.create({
    rowInner: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: T.alt,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    avatarSelected: { backgroundColor: T.nav },
    avatarText: { color: T.nav, fontWeight: '800', fontSize: 12 },
    main: { flex: 1, minWidth: 0 },
    title: { fontSize: 13.5, color: T.ink, fontWeight: '700' },
    titleSelected: { color: T.nav, fontWeight: '800' },
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
});

export default PartyDropdownType;
