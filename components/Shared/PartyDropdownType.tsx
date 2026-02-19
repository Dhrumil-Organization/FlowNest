// components/Shared/PartyDropdown.tsx
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';
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

const extractLocation = (addr?: string) => {
    if (!addr) return '';
    const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : addr;
};

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
        const location = extractLocation(item.Address);
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.accountname ?? item.BankName ?? item.BankBr ?? '')}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.accountname ?? item.BankName ?? item.BankBr ?? '—'}
                    </Text>
                    {/* <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
            {item.acccode || (item as any).BankCode || '—'}
          </Text> */}

                    {/* {item.Address ? (
            <Text style={rowStyles.Address} numberOfLines={3}>
              {item.Address}
            </Text>
          ) : null} */}

                    {/* <View style={rowStyles.metaRow}>
            {location ? (
              <View style={rowStyles.metaPill}>
                <Icon name="place" size={14} color={theme.BRAND_ACCENT} />
                <Text style={rowStyles.metaText}>{location}</Text>
              </View>
            ) : null}

            {item.email ? (
              <View style={rowStyles.metaPill}>
                <Icon name="email" size={14} color={theme.MUTED} />
                <Text style={rowStyles.metaText} numberOfLines={1}>{item.email}</Text>
              </View>
            ) : null}
          </View> */}
                </View>
            </View>
        );
    };

    return (
        <View>
            {loading ? (
                <TouchableOpacity activeOpacity={1} style={[styles.trigger, styles.loadingTrigger]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={theme.BRAND_ACCENT} style={{ marginRight: 10 }} />
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                </TouchableOpacity>
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
                />
            )}

            {/* compact selected card */}
            {/* {(selectedObject ?? initialObject) ? (
        <TouchableOpacity style={styles.selectedCard} onPress={() => dropdownRef.current?.open?.()} activeOpacity={0.8}>
          <View style={styles.selectedLeft}>
            <View style={styles.selectedAvatar}>
              <Text style={styles.selectedAvatarText}>
                {initialsOf((selectedObject ?? initialObject)?.accountname ?? (selectedObject ?? initialObject)?.BankName ?? '')}
              </Text>
            </View>
          </View>

          <View style={styles.selectedBody}>
            <Text style={styles.selectedTitle}>
              {(selectedObject ?? initialObject)?.accountname ?? (selectedObject ?? initialObject)?.BankName ?? ''}
            </Text>
            <Text style={styles.selectedTitle}>
              {(selectedObject ?? initialObject)?.acccode ?? ''}
            </Text>
            <View style={styles.selectedMetaRow}>
              <Icon name="place" size={14} color={theme.MUTED} style={{ marginRight: 6 }} />
              <Text style={styles.selectedLocation}>
                {extractLocation((selectedObject ?? initialObject)?.Address ?? '')}
              </Text>
            </View>
          </View>

          <View style={styles.selectedRight}>
            <Icon name="edit" size={20} color={theme.MUTED} />
          </View>
        </TouchableOpacity>
      ) : null} */}
        </View>
    );
};

const rowStyles = StyleSheet.create({
    rowInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, paddingRight: 6 },
    avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 8, flexShrink: 0 },
    avatarSelected: { backgroundColor: theme.BRAND_ACCENT + '22' },
    avatarText: { color: theme.BRAND_DARK, fontWeight: '800' },

    main: { flex: 1 },
    title: { fontSize: 14, color: theme.TEXT_PRIMARY, fontWeight: '800', flexWrap: 'wrap' },
    titleSelected: { color: theme.BRAND_DARK },
    Address: { marginTop: 6, color: theme.TEXT_SECONDARY, fontSize: 12, lineHeight: 16 },

    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
    metaPill: { flexDirection: 'row', alignItems: 'center', marginRight: 10, marginBottom: 6 },
    metaText: { marginLeft: 6, color: theme.MUTED, fontSize: 12, maxWidth: 180 },
});

const styles = StyleSheet.create({
    trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.SURFACE, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.BORDER || 'rgba(0,0,0,0.06)' },
    loadingTrigger: { opacity: 0.95, justifyContent: 'flex-start' },
    loadingText: { color: theme.TEXT_SECONDARY, fontSize: 13 },

    selectedCard: { marginTop: 10, backgroundColor: theme.SURFACE, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.BORDER || 'rgba(0,0,0,0.06)', flexDirection: 'row', alignItems: 'center' },
    selectedLeft: { marginRight: 12 },
    selectedAvatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' },
    selectedAvatarText: { color: theme.BRAND_DARK, fontWeight: '800' },

    selectedBody: { flex: 1 },
    selectedTitle: { fontSize: 13.5, fontWeight: '800', color: theme.BRAND_DARK },
    selectedMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    selectedLocation: { color: theme.MUTED, fontSize: 12 },

    selectedRight: { marginLeft: 12 },
});

export default PartyDropdownType;
