// FILE: src/components/WarehouseNEW/ViewStep.tsx
// View cartons for a warehouse location; supports selecting and deleting cartons.
import { AppAlert } from '@/common/utils/appAlert';
import { usePermission } from '@/src/core/permissions';
import { Card, EmptyState, PanelHeader, SearchBox, SectionHead } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { deleteLocationCartons, fetchLocationCartons, manageErrorText } from './api';
import { keyOf, LocationParams, Row, searchableView } from './model';
import { CartonCard, CONTENT, LocationSummary, useCols } from './ui';

export const WAREHOUSE_RESOURCE = 'production.warehouse';

/**
 * Master switch for carton selection (single checkbox + "Select all" + Delete bar).
 *   0 -> selection is always hidden (even if the user has the Delete right)
 *   1 -> selection is shown ONLY when the user also has the Delete right
 * Delete right DENIED -> selection is hidden whatever this value is.
 */
export const SHOW_CARTON_SELECTION: 0 | 1 = 1;

type Props = { token: string; API: string; params: LocationParams; onBack: () => void };

export default function ViewStep({ token, API, params, onBack }: Props) {
  const criteria: Row = params?.criteria || {};
  const location: Row = params?.location || {};
  const { isPhone, cols } = useCols();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cartons, setCartons] = useState<Row[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState<Record<string, Row>>({});
  const [confirmVisible, setConfirmVisible] = useState(false);
  // Rights-based delete: Permissions screen -> Production -> Warehouse -> Delete.
  // canDo() is the same engine the whole app uses (role + user override, SuperAdmin default,
  // explicit DENY wins), so no manual session parsing is needed here.
  const { canDo } = usePermission();

  // Single source of truth for all delete-selection UI.
  // This intentionally does not depend on the user's role or isSuperAdmin.
  // Visible only when the switch is 1 AND the Delete right is allowed.
  const hasDeleteRight = canDo(WAREHOUSE_RESOURCE, 'delete');
  const canDelete = SHOW_CARTON_SELECTION === 1 && hasDeleteRight;

  useEffect(() => {
    console.log('[WarehouseNEW][ViewStep] delete UI permission', {
      resource: WAREHOUSE_RESOURCE,
      action: 'delete',
      hasDeleteRight,
      SHOW_CARTON_SELECTION,
      canDelete,
    });
  }, [canDelete, hasDeleteRight]);

  const filteredCartons = useMemo(() => {
    const s = searchText.trim().toLowerCase();
    return s ? cartons.filter((x) => searchableView(x).includes(s)) : cartons;
  }, [cartons, searchText]);
  const selectedRows = useMemo(() => Object.values(selected), [selected]);
  const allFilteredSelected = filteredCartons.length > 0 && filteredCartons.every((row) => !!selected[keyOf(row)]);

  // If the right is revoked while the screen is open, drop any pending selection.
  useEffect(() => {
    if (!canDelete) {
      setSelected({});
      setConfirmVisible(false);
    }
  }, [canDelete]);

  const loadData = async () => {
    try {
      setLoading(true);
      const rows = await fetchLocationCartons(API, token, criteria, location);
      setCartons(rows);
      setSelected({});
    } catch (e: any) {
      AppAlert.alert('Error', manageErrorText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const initialLoad = async () => {
      try {
        setLoading(true);
        const rows = await fetchLocationCartons(API, token, criteria, location);
        if (alive) setCartons(rows);
      } catch (e: any) {
        if (alive) AppAlert.alert('Error', manageErrorText(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    initialLoad();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRow = (row: Row) => {
    const key = keyOf(row);
    if (!key) {
      AppAlert.alert('Selection unavailable', 'This carton does not have a unique selection key.');
      return;
    }
    setSelected((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key]; else next[key] = row;
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = { ...prev };
      if (allFilteredSelected) filteredCartons.forEach((row) => delete next[keyOf(row)]);
      else filteredCartons.forEach((row) => { const key = keyOf(row); if (key) next[key] = row; });
      return next;
    });
  };

  const confirmDelete = async () => {
    if (!canDelete || !selectedRows.length || deleting) return;
    setConfirmVisible(false);
    try {
      setDeleting(true);
      const response = await deleteLocationCartons(API, token, criteria, location, selectedRows);
      const message = response?.message || response?.response?.message || (response?.success ? 'Selected cartons deleted successfully.' : 'Delete request completed.');
      if (response?.success === false || response?.status === false) {
        AppAlert.alert('Delete failed', message);
        return;
      }
      const deletedKeys = new Set(selectedRows.map(keyOf));
      setCartons((prev) => prev.filter((row) => !deletedKeys.has(keyOf(row))));
      setSelected({});
      AppAlert.alert('Delete successful', message);
    } catch (e: any) {
      AppAlert.alert('Unable to delete cartons', manageErrorText(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <PanelHeader onBack={onBack} title="View Carton" subtitle={String(location.locationName || location.location || '')} />
      <View style={[CONTENT, { flex: 1, minHeight: 0, padding: isPhone ? 12 : 16, paddingBottom: 0, gap: 10 }]}>
        <Card><LocationSummary location={location} /></Card>
        <SearchBox value={searchText} onChangeText={setSearchText} placeholder="Search carton / item / shade / voucher" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <SectionHead title={`Carton List (${filteredCartons.length})`} />
          {canDelete ? <Pressable onPress={toggleAllFiltered} disabled={!filteredCartons.length} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#FFFFFF' }}>
            <Icon name={allFilteredSelected ? 'check-box' : 'check-box-outline-blank'} size={21} color={T.copper} />
            <Text style={{ color: T.ink, fontSize: 12, fontWeight: '700' }}>{allFilteredSelected ? 'Deselect all' : 'Select all'}</Text>
          </Pressable> : null}
        </View>
        {canDelete && selectedRows.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F0B6AE', backgroundColor: '#FFF5F3' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
              <Icon name="check-circle" size={19} color={T.copper} />
              <Text style={{ color: T.ink, fontWeight: '800', fontSize: 13 }}>{selectedRows.length} carton{selectedRows.length === 1 ? '' : 's'} selected</Text>
            </View>
            <Pressable onPress={() => setConfirmVisible(true)} disabled={deleting} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#B42318', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10, opacity: deleting ? 0.6 : 1 }}>
              {deleting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="delete-outline" size={18} color="#FFFFFF" />}
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>{deleting ? 'Deleting…' : 'Delete'}</Text>
            </Pressable>
          </View>
        ) : null}
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
            keyExtractor={(item, index) => `${index}_${keyOf(item) || ''}`}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <View style={{ flex: 1, maxWidth: `${100 / cols}%`, padding: 4 }}>
                <CartonCard item={item} selected={!!selected[keyOf(item)]} onPress={canDelete ? toggleRow : undefined} hideCheckbox={!canDelete} />
              </View>
            )}
            ListEmptyComponent={<EmptyState icon="inventory-2" title="No cartons available" />}
          />
        )}
      </View>

      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(10,20,32,0.58)', justifyContent: 'center', alignItems: 'center', padding: 22 }}>
          <View style={{ width: '100%', maxWidth: 420, borderRadius: 20, backgroundColor: '#FFFFFF', padding: 22, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#FDECEA', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon name="delete-forever" size={29} color="#B42318" />
            </View>
            <Text style={{ fontSize: 20, color: '#172B3A', fontWeight: '900', marginBottom: 8 }}>Delete selected cartons?</Text>
            <Text style={{ color: '#5D6B78', fontSize: 14, lineHeight: 21, marginBottom: 8 }}>You are about to delete {selectedRows.length} selected carton{selectedRows.length === 1 ? '' : 's'} from location {String(location.locationName || location.location || '-')}.</Text>
            <Text style={{ color: '#B42318', fontSize: 12, fontWeight: '700', marginBottom: 22 }}>This action may not be reversible. Please confirm before continuing.</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <Pressable onPress={() => setConfirmVisible(false)} style={{ borderRadius: 10, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: '#F1F3F5' }}><Text style={{ color: '#344054', fontWeight: '800' }}>No, keep them</Text></Pressable>
              <Pressable onPress={confirmDelete} style={{ borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: '#B42318' }}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Yes, delete</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
