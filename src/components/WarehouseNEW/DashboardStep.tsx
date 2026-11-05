// FILE: src/components/WarehouseNEW/DashboardStep.tsx
// Step 2 — port of legacy Warehouse/WarehouseDashboardScreen.tsx
// (+ components/WarehouseCard.tsx, WarehouseActionSheet.tsx).
// The list is the `dashboardData` handed over by the criteria step (legacy
// kept it in state and never re-fetched it); search matches ANY value of a row.
//
// Search row = two boxes side by side (50 / 50):
//   1. "Search warehouse..."  local filter of the location tiles (as before)
//   2. "Search cartons..."    POST /api/prodwarehousemanage action 'search'
//        user types  "123,456,789"  |  "123 456 789"  |  "AS465", or scans cartons with the
//        hardware / camera scanner (every scanned carton is added to the box, comma separated).
//        The API fires automatically after a short typing pause; no Enter needed;
//        Enter / the search button also fires it. The result is shown as the SAME location tiles
//        (only the locations that hold the searched cartons) and every tile keeps its normal
//        Assign / View / Transfer menu. Clearing the box brings the full grid back.
import { AppAlert } from '@/common/utils/appAlert';
import { EmptyState, PanelHeader } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { manageErrorText, searchCartons } from './api';
import {
  CriteriaForm,
  filterLocations,
  filterLocationsByCartons,
  getCartonName,
  LocationParams,
  Mode,
  normalizeCart,
  normalizeCartonSearch,
  Row,
  ScanParams,
} from './model';
import { ActionSheet, CONTENT, LocationCard, SearchInput } from './ui';

/**
 * Wait briefly after the last keystroke before searching, so partial input does not
 * trigger a request for every character. Stale responses are ignored (reqId).
 */
const SEARCH_DEBOUNCE_MS = 350;

type Props = {
  token: string;
  API: string;
  criteria: CriteriaForm;
  dashboardData: Row[];
  onBack: () => void;
  /** legacy navigation.navigate('WarehouseAssign' | 'WarehouseView' | 'WarehouseTransfer', params) */
  onOpen: (params: LocationParams) => void;
  /** opens the hardware / camera scanner (mode 'SEARCH': scanned cartons go to the carton search box) */
  onOpenScanner: (scanType: 'scanner' | 'camera', params: ScanParams) => void;
};

const scanBtn: any = {
  width: 46,
  minWidth: 46,
  height: 46,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: T.copper,
  backgroundColor: T.surface,
  alignItems: 'center',
  justifyContent: 'center',
};

export default function DashboardStep({ token, API, criteria, dashboardData, onBack, onOpen, onOpenScanner }: Props) {
  const { width } = useWindowDimensions();
  // Responsive grid: one roomy card on phones, two on tablets,
  // three on standard desktops and four on wide desktop screens.
  const cols = width < 600 ? 1 : width < 1024 ? 2 : width < 1440 ? 3 : 4;
  const gap = width < 600 ? 8 : 12;
  // Keep search fields readable on phones and compact tablets.
  const stackSearch = width < 760;

  const [locations] = useState<Row[]>(dashboardData);
  const [selectedLocation, setSelectedLocation] = useState<Row | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [search, setSearch] = useState('');

  // carton search
  const [cartonText, setCartonText] = useState('');
  const [cartonResults, setCartonResults] = useState<Row[] | null>(null); // null = not searched
  const [cartonLoading, setCartonLoading] = useState(false);
  const reqId = useRef(0); // ignore stale responses

  // carton search narrows the tiles to the locations that hold the cartons; the warehouse box filters on top.
  const filteredLocations = useMemo(() => {
    const base = cartonResults !== null ? filterLocationsByCartons(locations, cartonResults) : locations;
    return filterLocations(base, search);
  }, [search, locations, cartonResults]);

  const openMenu = (item: Row) => {
    setSelectedLocation(item);
    setMenuVisible(true);
  };
  const closeMenu = () => setMenuVisible(false);

  const go = (mode: Mode) => {
    closeMenu();
    onOpen({ criteria, location: selectedLocation as Row, mode });
  };

  const lastSearched = useRef(''); // last normalized text sent to the API

  const runCartonSearch = async (force = true) => {
    const search = normalizeCartonSearch(cartonText);
    if (!search) {
      reqId.current++;
      lastSearched.current = '';
      setCartonResults(null);
      setCartonLoading(false);
      return;
    }
    // auto (debounced) search skips an identical text; Enter / button always re-searches
    if (!force && search === lastSearched.current) return;
    lastSearched.current = search;
    const id = ++reqId.current;
    try {
      setCartonLoading(true);
      const rows = await searchCartons(API, token, criteria, search);
      if (id === reqId.current) setCartonResults(rows);
    } catch (e: any) {
      if (id === reqId.current) {
        setCartonResults([]);
        AppAlert.alert('Error', manageErrorText(e));
      }
    } finally {
      if (id === reqId.current) setCartonLoading(false);
    }
  };

  // Auto search: runs SEARCH_DEBOUNCE_MS after the user stops typing.
  // Enter / button call runCartonSearch(true) immediately; the timer that fires afterwards sees the same text and is skipped.
  useEffect(() => {
    if (!cartonText.trim()) {
      // cleared -> back to the location grid
      reqId.current++;
      lastSearched.current = '';
      setCartonResults(null);
      setCartonLoading(false);
      return;
    }
    if (SEARCH_DEBOUNCE_MS <= 0) {
      runCartonSearch(false);
      return;
    }
    const timer = setTimeout(() => runCartonSearch(false), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartonText]);

  const onCartonChange = (t: string) => setCartonText(t);

  // Scanner <-> search box.
  //  - the cartons already in the box are handed to the scanner (shown in its list, duplicates are
  //    rejected), so scanning more cartons ADDS to them;
  //  - DONE puts the scanner list back into the box, comma separated, in the order they were
  //    typed / scanned (first carton stays first). The auto search then fires.
  const openScan = (scanType: 'scanner' | 'camera') => {
    const existing = normalizeCartonSearch(cartonText).split(',').filter(Boolean);
    const selected: Record<string, Row> = {};
    existing.forEach((no, i) => {
      selected[normalizeCart(no)] = { cartonNo: no, _scanSeq: i + 1 };
    });
    onOpenScanner(scanType, {
      mode: 'SEARCH',
      cartons: [],
      selected,
      onScanResult: (rows: Row[]) => {
        const ordered = [...rows].sort((a, b) => (a?._scanSeq ?? 0) - (b?._scanSeq ?? 0));
        const nos = ordered.map((r) => String(getCartonName(r) || '').trim()).filter(Boolean);
        setCartonText(normalizeCartonSearch(nos.join(',')));
      },
    });
  };

  const firstLoad = cartonLoading && cartonResults === null;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <PanelHeader onBack={onBack} title="WareHouse" subtitle={`${filteredLocations.length} location(s)`} />
      <View
        style={[
          CONTENT,
          {
            paddingHorizontal: width < 600 ? 12 : 20,
            paddingTop: 12,
            paddingBottom: 6,
            flexDirection: stackSearch ? 'column' : 'row',
            gap: 10,
          },
        ]}
      >
        <View style={{ flex: stackSearch ? undefined : 1, minWidth: 0 }}>
          <SearchInput value={search} onChangeText={setSearch} placeholder="Search warehouse..." />
        </View>
        <View style={{ flex: stackSearch ? undefined : 1, minWidth: 0, flexDirection: 'row', gap: 8 }}>
          <SearchInput
            style={{ flex: 1, minWidth: 0 }}
            value={cartonText}
            onChangeText={onCartonChange}
            onSubmit={() => runCartonSearch(true)}
            placeholder="Search cartons....."
          />
          <TouchableOpacity
            onPress={() => openScan('scanner')}
            accessibilityRole="button"
            accessibilityLabel="Open hardware scanner"
            style={scanBtn}
          >
            <Icon name="qr-code-scanner" size={22} color={T.copper} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openScan('camera')}
            accessibilityRole="button"
            accessibilityLabel="Open mobile camera scanner"
            style={scanBtn}
          >
            <Icon name="camera" size={22} color={T.copper} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => runCartonSearch(true)}
            disabled={cartonLoading || !cartonText.trim()}
            accessibilityRole="button"
            accessibilityLabel="Search cartons"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: T.copper,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: cartonLoading || !cartonText.trim() ? 0.5 : 1,
            }}
          >
            {cartonLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="search" size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {firstLoad ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
          <ActivityIndicator size="large" color={T.copper} />
          <Text style={{ marginTop: 12, color: T.ink, fontWeight: '700', fontSize: 14 }}>Searching cartons...</Text>
        </View>
      ) : (
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
          ListEmptyComponent={
            <EmptyState icon="inventory-2" title={cartonResults !== null ? 'No cartons found' : 'No locations found'} />
          }
        />
      )}

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
