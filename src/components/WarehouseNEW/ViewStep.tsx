// FILE: src/components/WarehouseNEW/ViewStep.tsx
// Step 3c — port of legacy Warehouse/WarehouseViewScreen.tsx (read-only carton
// list of one location). Loads once on mount: POST /api/prodwarehousemanage
// action 'view'. The error fallback text "Failed to save assign" is legacy.
import { AppAlert } from '@/common/utils/appAlert';
import { Card, EmptyState, PanelHeader, SearchBox, SectionHead } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { fetchLocationCartons, manageErrorText } from './api';
import { LocationParams, Row, searchableView } from './model';
import { CartonCard, CONTENT, LocationSummary, useCols } from './ui';

type Props = { token: string; API: string; params: LocationParams; onBack: () => void };

export default function ViewStep({ token, API, params, onBack }: Props) {
  const criteria: Row = params?.criteria || {};
  const location: Row = params?.location || {};
  const { isPhone, cols } = useCols();
  const [loading, setLoading] = useState(false);
  const [cartons, setCartons] = useState<Row[]>([]);
  const [searchText, setSearchText] = useState('');

  const filteredCartons = useMemo(() => {
    const s = searchText.trim().toLowerCase();
    return s ? cartons.filter((x) => searchableView(x).includes(s)) : cartons;
  }, [cartons, searchText]);

  useEffect(() => {
    let alive = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const rows = await fetchLocationCartons(API, token, criteria, location);
        if (alive) setCartons(rows);
      } catch (e: any) {
        AppAlert.alert('Error', manageErrorText(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    loadData();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <PanelHeader onBack={onBack} title="View Carton" subtitle={String(location.locationName || location.location || '')} />
      <View style={[CONTENT, { flex: 1, minHeight: 0, padding: isPhone ? 12 : 16, paddingBottom: 0, gap: 10 }]}>
        <Card>
          <LocationSummary location={location} />
        </Card>
        <SearchBox value={searchText} onChangeText={setSearchText} placeholder="Search carton / item / shade / voucher" />
        <SectionHead title={`Carton List (${filteredCartons.length})`} />
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={{ marginTop: 12, color: T.ink, fontWeight: '700', fontSize: 14 }}>Loading cartons...</Text>
          </View>
        ) : (
          <FlatList
            key={'cols-' + cols}
            numColumns={cols}
            style={{ flex: 1, minHeight: 0 }}
            data={filteredCartons}
            keyExtractor={(item, index) => `${index}_${item?.uid || ''}_${item?.cartno || ''}`}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <View style={{ flex: 1, maxWidth: `${100 / cols}%`, padding: 4 }}>
                <CartonCard item={item} hideCheckbox />
              </View>
            )}
            ListEmptyComponent={<EmptyState icon="inventory-2" title="No cartons available" />}
          />
        )}
      </View>
    </View>
  );
}
