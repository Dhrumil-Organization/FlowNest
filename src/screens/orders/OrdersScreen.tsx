// FILE: src/screens/orders/OrdersScreen.tsx
// Root screen for the migrated Sales Order module. Replaces the previous
// simpler OrdersScreen.tsx (New Order / Auth / Tracking / Summary tabs —
// this is the richer SalesOrderNew rewrite being migrated in).
//
// NewOrderTab is fully converted (shared header/theme/API-client/
// master-selector/permissions). AuthTab, TrackingTab, and SummaryTab are
// still imported from ./tabs/_legacyOrderTabs — a temporary file
// preserving their original (unconverted) implementation so the whole
// screen stays functional while the rest of the migration proceeds
// tab-by-tab. See ORDERS_MIGRATION.md.
import { useHeaderExtrasStore } from '@/src/core/layout/headerExtras';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import { SalesOrderAPI } from '@/src/api/legacyClient';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NewOrderTab } from './tabs/NewOrderTab';
import { AuthTab, TrackingTab, SummaryTab } from './tabs/_legacyOrderTabs';

const TABS = [
    { id: 'neworder', label: 'New Order', permAction: 'add' as const },
    { id: 'auth', label: 'Auth', permAction: null },
    { id: 'tracking', label: 'Tracking', permAction: null },
    { id: 'summary', label: 'Summary', permAction: null },
];

interface Props {
    token: string;
    userid?: any;
}

export function OrdersScreen({ token, userid }: Props) {
    const { canAccess, canDo } = usePermission();
    const [activeTab, setActiveTab] = useState('neworder');
    const [pendingCnt, setPendingCnt] = useState(0);

    // FIX: the root screen used to render its own hand-rolled header
    // ("MADHUSUDHAN FABRICS" / "Orders" / a back arrow / a "Saved ✓"
    // badge) — the same duplicate-header pattern found repeatedly across
    // this migration. The header is rendered once, in
    // app/new/(tabs)/_layout.tsx; this screen is already a registered tab
    // there, so it just needed the local header removed.
    const setHeaderExtras = useHeaderExtrasStore((state) => state.setHeaderExtras);
    const clearHeaderExtras = useHeaderExtrasStore((state) => state.clearHeaderExtras);
    useFocusEffect(
        useCallback(() => {
            setHeaderExtras({ right: <View style={s.savedBadge}><Text style={s.savedText}>Saved ✓</Text></View> });
            return () => clearHeaderExtras();
        }, [setHeaderExtras, clearHeaderExtras]),
    );

    useEffect(() => {
        if (!token) return;
        SalesOrderAPI.sortBrowse({
            strcode: '012', isauth: 0, atype: 'b', txntype: 'sales_order',
            referrer: 'mob_dashboard', strtype: 'g',
            fromdate: new Date().toISOString().slice(0, 7).replace('-', '') + '01',
            todate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
            prpcodes: [],
        }).then((r) => setPendingCnt((r.data?.response?.data || []).length)).catch(() => {});
    }, [token]);

    const visibleTabs = TABS.filter((t) => (t.permAction ? canDo('orders', t.permAction) : canAccess('orders')));

    return (
        <View style={s.flex}>
            <View style={s.tabBar}>
                {visibleTabs.map((t) => (
                    <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={[s.tabBtn, activeTab === t.id && s.tabBtnOn]} activeOpacity={0.7}>
                        <Text style={[s.tabBtnText, activeTab === t.id && s.tabBtnTextOn]}>
                            {t.label}{t.id === 'auth' && pendingCnt > 0 ? ` (${pendingCnt})` : ''}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ flex: 1, backgroundColor: T.bg }}>
                {activeTab === 'neworder' && <NewOrderTab token={token} userid={userid} />}
                {activeTab === 'auth' && <AuthTab token={token} />}
                {activeTab === 'tracking' && <TrackingTab token={token} />}
                {activeTab === 'summary' && <SummaryTab token={token} />}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    flex: { flex: 1, backgroundColor: T.bg },
    savedBadge: { backgroundColor: 'rgba(255,255,255,.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    savedText: { color: '#fff', fontSize: 12 },
    tabBar: { flexDirection: 'row', backgroundColor: T.nav, paddingHorizontal: 8 },
    tabBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabBtnOn: { borderBottomColor: T.copper },
    tabBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', textAlign: 'center' },
    tabBtnTextOn: { color: '#fff', fontWeight: '700' },
});
