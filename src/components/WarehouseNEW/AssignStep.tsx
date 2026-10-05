// FILE: src/components/WarehouseNEW/AssignStep.tsx
// Step 3a — port of legacy Warehouse/WarehouseAssignScreen.tsx.
// LOAD DATA -> POST /api/getcartondetail, SAVE ASSIGN -> POST /api/prodwarehousemanage
// (action 'assign'). Same validations and alert texts.
import { AppAlert } from '@/common/utils/appAlert';
import { Btn, Card, PanelHeader } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, View } from 'react-native';
import { fetchAssignCartons, manageErrorText, saveAssign as postAssign } from './api';
import { CartonListSection, SelectionBar, useCartonSelection } from './cartonSelection';
import { LocationParams, Row, ScanParams } from './model';
import { CONTENT, LocationSummary, SquareBtn, useCols } from './ui';

type Props = {
  token: string;
  API: string;
  params: LocationParams;
  onBack: () => void;
  /** legacy navigation.navigate('WarehouseQRScanner' | 'WarehouseQRCameraScanner', params) */
  onOpenScanner: (scanType: 'scanner' | 'camera', params: ScanParams) => void;
};

export default function AssignStep({ token, API, params, onBack, onOpenScanner }: Props) {
  const criteria: Row = params?.criteria || {};
  const location: Row = params?.location || {};
  const { isPhone } = useCols();
  const sel = useCartonSelection('warehouse_assign_row_');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!location?.locationCode && !location?.locationName && !location?.location) {
      AppAlert.alert('Validation', 'Location is required');
      return;
    }
    try {
      setLoading(true);
      sel.setSelected({});
      sel.setSearchText('');
      const rows = await fetchAssignCartons(API, token, criteria);
      sel.setCartons(rows);
    } catch (e: any) {
      AppAlert.alert('Error', e?.response?.data?.message || 'Failed to load cartons');
    } finally {
      setLoading(false);
    }
  };

  const openScanner = (scanType: 'scanner' | 'camera') => {
    Keyboard.dismiss();
    if (!sel.cartons.length) {
      AppAlert.alert('Validation', 'Please load carton data first');
      return;
    }
    onOpenScanner(scanType, {
      mode: 'ASSIGN',
      cartons: sel.cartons,
      selected: sel.selected,
      onScanResult: sel.applyScanResult,
    });
  };

  const saveAssign = async () => {
    const selectedRows = Object.values(sel.selected);
    if (!selectedRows.length) {
      AppAlert.alert('Validation', 'Please select at least one carton');
      return;
    }
    try {
      setLoading(true);
      const data = await postAssign(API, token, criteria, location, selectedRows);
      if (data?.success === false) {
        AppAlert.alert('Error', data?.message || 'Failed to save assign');
        return;
      }
      AppAlert.alert('Success', data?.message || 'Assign saved successfully', [
        {
          text: 'OK',
          onPress: () => {
            sel.setSelected({});
            sel.setSearchText('');
            onBack();
          },
        },
      ]);
    } catch (e: any) {
      AppAlert.alert('Error', manageErrorText(e));
    } finally {
      setLoading(false);
    }
  };

  // Legacy hid the bottom bar while the search box had focus so the soft keyboard
  // did not push it over the list. There is no soft keyboard on web.
  const hideBar = sel.searchFocused && Platform.OS !== 'web';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PanelHeader onBack={onBack} title="Assign Carton" subtitle={String(location.locationName || location.location || '')} />
      <View style={[CONTENT, { flex: 1, minHeight: 0, padding: isPhone ? 12 : 16, paddingBottom: 0 }]}>
        <Card style={{ gap: 12, marginBottom: 12 }}>
          <LocationSummary location={location} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Btn label="LOAD DATA" icon="inventory-2" onPress={loadData} loading={loading} style={{ flex: 1, minWidth: 0 }} />
            <SquareBtn icon="qr-code-scanner" label="Open hardware scanner" onPress={() => openScanner('scanner')} />
            <SquareBtn icon="camera" label="Open mobile camera scanner" onPress={() => openScanner('camera')} />
          </View>
        </Card>
        <CartonListSection sel={sel} />
      </View>
      {!hideBar ? <SelectionBar count={sel.selectedCount} label="SAVE ASSIGN" onSave={saveAssign} busy={loading} /> : null}
    </KeyboardAvoidingView>
  );
}
