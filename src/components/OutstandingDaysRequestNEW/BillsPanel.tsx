// FILE: src/components/OutstandingDaysRequestNEW/BillsPanel.tsx
// NEW ERP port of the legacy "bills" full-screen modal (renderBillsAccordion in
// components/OutstandingDaysRequest/index.tsx). Presentation only: data,
// loading flag and search text live in index.tsx exactly as in legacy.
//
// Same behaviour: search = any value of the bill contains the query; header
// shows main party name, "Party Code" and the FILTERED bills count (only once
// the main-party data has arrived); every key of a bill is listed with the
// legacy label / value formatting; empty text "No bills found".
// Deviation (porting brief): in-screen panel with a back row instead of a
// full-screen <Modal> with the legacy Header + floating close button.
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { T, S } from '@/src/theme';
import { EmptyState, PanelHeader, SearchBox, cellWidth } from '@/src/components/erpUi';
import type { Row } from './api';
import { billDisplayValue, formatLabel, isNumeric } from './model';
import { CONTENT_W, useGrid } from './ui';

export default function BillsPanel({
    visible,
    onClose,
    loading,
    mainParData,
    billsData,
    searchQuery,
    onSearch,
}: {
    visible: boolean;
    onClose: () => void;
    loading: boolean;
    mainParData: any;
    billsData: Row[];
    searchQuery: string;
    onSearch: (t: string) => void;
}) {
    const { cols, gutter } = useGrid();
    if (!visible) return null;

    const filteredBillsData = searchQuery
        ? billsData.filter((bill) =>
            Object.values(bill).some((value) =>
                String(value).toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
        : billsData;

    return (
        <View style={styles.panel}>
            <PanelHeader
                onBack={onClose}
                crumbs={['Outstanding Days Request', 'Bills']}
                title={!loading && mainParData ? String(mainParData.mainparname ?? '') : 'Bills'}
                subtitle={
                    !loading && mainParData
                        ? `Party Code: ${mainParData.mainparcode} | Bills: ${filteredBillsData.length}`
                        : undefined
                }
            />
            <View style={styles.searchBar}>
                <View style={[styles.centered, { paddingHorizontal: gutter }]}>
                    <SearchBox value={searchQuery} onChangeText={onSearch} placeholder="Search bills..." />
                </View>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={T.copper} />
                    <Text style={styles.loaderText}>Loading bills...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredBillsData}
                    keyExtractor={(item, index) => `${item.billno || index}-${index}`}
                    numColumns={cols}
                    key={`odr-bills-${cols}`}
                    style={styles.flex}
                    contentContainerStyle={[styles.list, { paddingHorizontal: gutter - 5 }]}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                        <View style={[cellWidth(cols), styles.gridCell]}>
                            <View style={styles.billCard}>
                                {Object.entries(item).map(([key, value], i, all) => (
                                    <View key={key} style={[styles.billRow, i === all.length - 1 && styles.billRowLast]}>
                                        <Text style={styles.billLabel}>{formatLabel(key)}</Text>
                                        <Text style={[styles.billValue, isNumeric(value) && styles.billValueNumeric]}>
                                            {billDisplayValue(key, value)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <EmptyState icon={searchQuery ? 'search-off' : 'receipt-long'} title="No bills found" />
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    panel: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 20,
        elevation: 20,
        backgroundColor: T.bg,
    },
    centered: { width: '100%', maxWidth: CONTENT_W, alignSelf: 'center' },
    searchBar: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingTop: 2,
        paddingBottom: 10,
    },
    list: {
        paddingTop: 8,
        paddingBottom: 28,
        width: '100%',
        maxWidth: CONTENT_W,
        alignSelf: 'center',
    },
    gridCell: { padding: 5 },
    billCard: {
        flex: 1,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        paddingVertical: 8,
        paddingHorizontal: 13,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: T.hair,
    },
    billRowLast: { borderBottomWidth: 0 },
    billLabel: { flex: 0.45, minWidth: 0, fontSize: 12, fontWeight: '700', color: T.muted },
    billValue: { flex: 0.55, minWidth: 0, fontSize: 13, fontWeight: '600', color: T.ink, textAlign: 'left' },
    billValueNumeric: { textAlign: 'right', fontWeight: '800', color: T.blue },
    emptyWrap: {
        margin: 5,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
    },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    loaderText: { fontSize: 13, fontWeight: '800', color: T.nav },
});
