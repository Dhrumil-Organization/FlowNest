import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../styles';

export type ExpRefreshInfo = { ok: boolean; text: string } | null;

type Props = {
    loading: boolean;
    info: ExpRefreshInfo;          // result of the last refresh (null = not refreshed yet)
    onRefresh: () => void;
    isNewDesign: boolean;          // only used for the small label, the api choice is made by the parent
};

/**
 * Shown under the Chees / Weight row, ONLY after the server answered
 * "Expected Production Qty must be greater than zero."
 * One tap re-reads the expected production qty (old api for isnewdesign 0, new api for 1).
 * Wraps on small screens: text on top, full-width button below. On web / tablet it sits in one row.
 */
const ExpQtyRefresh = ({ loading, info, onRefresh, isNewDesign }: Props) => {
    const tone = info ? (info.ok ? C.ok : C.bad) : '#B45309';
    const soft = info ? (info.ok ? C.okSoft : C.badSoft) : '#FEF3C7';
    const iconName = info ? (info.ok ? 'check-circle' : 'error-outline') : 'info-outline';

    return (
        <View
            style={{
                flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10,
                backgroundColor: soft, borderRadius: 12, borderWidth: 1, borderColor: tone + '40',
                paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10,
            }}
        >
            <View style={{ flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Icon name={iconName as any} size={20} color={tone} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>
                        {info ? (info.ok ? 'Expected production qty updated' : 'Expected production qty is still zero') : 'Expected production qty is zero'}
                    </Text>
                    <Text style={{ fontSize: 12, lineHeight: 17, color: C.ink2, marginTop: 2 }}>
                        {info ? info.text : `Tap Refresh to fetch it again (${isNewDesign ? 'new' : 'old'} design), then save.`}
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                onPress={onRefresh}
                disabled={loading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Refresh expected production qty"
                style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                    height: 38, minWidth: 110, paddingHorizontal: 16, borderRadius: 10,
                    backgroundColor: C.surface, borderWidth: 1, borderColor: C.primary, flexGrow: 1, maxWidth: 220,
                    opacity: loading ? 0.7 : 1,
                }}
            >
                {loading
                    ? <ActivityIndicator size="small" color={C.primary} />
                    : <Icon name="refresh" size={18} color={C.primary} />}
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.primary }}>{loading ? 'Refreshing…' : 'Refresh'}</Text>
            </TouchableOpacity>
        </View>
    );
};

export default React.memo(ExpQtyRefresh);
