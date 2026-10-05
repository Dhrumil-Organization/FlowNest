// FILE: src/components/WarehouseNEW/DashboardStep.tsx
// Step 2 — port of legacy Warehouse/WarehouseDashboardScreen.tsx
// (+ components/WarehouseCard.tsx, WarehouseActionSheet.tsx).
// The list is the `dashboardData` handed over by the criteria step (legacy
// kept it in state and never re-fetched it); search matches ANY value of a row.
import { EmptyState, PanelHeader, SearchBox } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useMemo, useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';
import { CriteriaForm, filterLocations, LocationParams, Mode, Row } from './model';
import { ActionSheet, CONTENT, LocationCard } from './ui';

type Props = {
  criteria: CriteriaForm;
  dashboardData: Row[];
  onBack: () => void;
  /** legacy navigation.navigate('WarehouseAssign' | 'WarehouseView' | 'WarehouseTransfer', params) */
  onOpen: (params: LocationParams) => void;
};

export default function DashboardStep({ criteria, dashboardData, onBack, onOpen }: Props) {
  const { width } = useWindowDimensions();
  // Legacy grid was a fixed 2-up of compact tiles; kept 2-up on phones and widened on larger screens.
  const cols = width < 340 ? 1 : width < 768 ? 2 : width < 1180 ? 3 : 4;
  const gap = width < 768 ? 10 : 12;

  const [locations] = useState<Row[]>(dashboardData);
  const [selectedLocation, setSelectedLocation] = useState<Row | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filteredLocations = useMemo(() => filterLocations(locations, search), [search, locations]);

  const openMenu = (item: Row) => {
    setSelectedLocation(item);
    setMenuVisible(true);
  };
  const closeMenu = () => setMenuVisible(false);

  const go = (mode: Mode) => {
    closeMenu();
    onOpen({ criteria, location: selectedLocation as Row, mode });
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <PanelHeader onBack={onBack} title="WareHouse" subtitle={`${filteredLocations.length} location(s)`} />
      <View style={[CONTENT, { paddingHorizontal: gap, paddingTop: 12, paddingBottom: 6 }]}>
        <SearchBox value={search} onChangeText={setSearch} placeholder="Search warehouse..." />
      </View>
      <FlatList
        key={'cols-' + cols}
        data={filteredLocations}
        numColumns={cols}
        keyExtractor={(item, index) => String(item.locationCode || item.locationName || item.location || index)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[CONTENT, { paddingHorizontal: gap / 2, paddingTop: 6, paddingBottom: 40 }]}
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: `${100 / cols}%`, padding: gap / 2 }}>
            <LocationCard item={item} onMenu={openMenu} />
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="inventory-2" title="No locations found" />}
      />

      <ActionSheet
        visible={menuVisible}
        item={selectedLocation}
        onClose={closeMenu}
        onAssign={() => go('ASSIGN')}
        onView={() => go('VIEW')}
        onTransfer={() => go('TRANSFER')}
      />
    </View>
  );
}
