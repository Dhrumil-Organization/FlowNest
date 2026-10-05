// FILE: src/components/WarehouseNEW/TransferStep.tsx
// Step 3b — port of legacy Warehouse/WarehouseTransferScreen.tsx.
//   mount      -> POST /api/master_crud (browse_data)             "To Location" list
//   LOAD DATA  -> POST /api/prodwarehousemanage action 'view'     cartons of the from-location
//   SAVE       -> POST /api/prodwarehousemanage action 'transfer'
// Kept as legacy: both scanners need a To Location + loaded cartons; SAVE only
// checks that a carton is selected; "To Capacity" is the static text "0 / 0";
// every catch block shows the legacy fallback text "Failed to save assign" and
// the success fallback is "Assign saved successfully".
import { AppAlert } from '@/common/utils/appAlert';
import { Btn, Card, PanelHeader, PickField } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, View } from 'react-native';
import { fetchLocationCartons, fetchToLocations, manageErrorText, saveTransfer as postTransfer } from './api';
import { CartonListSection, SelectionBar, useCartonSelection } from './cartonSelection';
import { LocationParams, Row, ScanParams } from './model';
import { CONTENT, LocationSummary, PickerSheet, SquareBtn, SummaryRow, useCols } from './ui';

type Props = {
  token: string;
  API: string;
  params: LocationParams;
  onBack: () => void;
  onOpenScanner: (scanType: 'scanner' | 'camera', params: ScanParams) => void;
};

export default function TransferStep({ token, API, params, onBack, onOpenScanner }: Props) {
  const criteria: Row = params?.criteria || {};
  const location: Row = params?.location || {};
  const { isPhone } = useCols();
  const sel = useCartonSelection('warehouse_row_');

  const [toLocation, setToLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Row | null>(null);
  const [locationData, setLocationData] = useState<Row[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const rows = await fetchLocationCartons(API, token, criteria, location);
      sel.setCartons(rows);
    } catch (e: any) {
      AppAlert.alert('Error', manageErrorText(e));
    } finally {
      setLoading(false);
    }
  };

  const locationsearch = async () => {
    try {
      setLoading(true);
      const rows = await fetchToLocations(API, token, criteria, location);
      setLocationData(rows);
    } catch (e: any) {
      AppAlert.alert('Error', manageErrorText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    locationsearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTransfer = async () => {
    const selectedRows = Object.values(sel.selected);
    if (!selectedRows.length) {
      AppAlert.alert('Validation', 'Please select at least one carton');
      return;
    }
    try {
      setLoading(true);
      const data = await postTransfer(API, token, criteria, location, selectedLocation, selectedRows);
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

  // Hardware scanner and camera scanner share the same guards (legacy openScanner / openCameraScanner).
  const openScanner = (scanType: 'scanner' | 'camera') => {
    Keyboard.dismiss();
    if (!String(toLocation ?? '').trim()) {
      AppAlert.alert('Validation', 'Please enter/select To Location');
      return;
    }
    if (!sel.cartons.length) {
      AppAlert.alert('Validation', 'Please load carton data first');
      return;
    }
    onOpenScanner(scanType, {
      mode: 'TRANSFER',
      cartons: sel.cartons,
      selected: sel.selected,
      onScanResult: sel.applyScanResult,
    });
  };

  const hideBar = sel.searchFocused && Platform.OS !== 'web';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PanelHeader onBack={onBack} title="Transfer Carton" subtitle={String(location.locationName || location.location || '')} />
      <View style={[CONTENT, { flex: 1, minHeight: 0, padding: isPhone ? 12 : 16, paddingBottom: 0 }]}>
        <Card style={{ gap: 12, marginBottom: 12 }}>
          <LocationSummary location={location} fromPrefix="From " />
          <PickField
            label="To Location"
            value={String(selectedLocation?.location || '')}
            placeholder="Select Location"
            onPress={() => setLocationPickerVisible(true)}
          />
          <SummaryRow icon="stacked-bar-chart" label="To Capacity" value="0 / 0" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Btn label="LOAD DATA" icon="inventory-2" onPress={loadData} loading={loading} style={{ flex: 1, minWidth: 0 }} />
            <SquareBtn icon="qr-code-scanner" label="Open hardware scanner" onPress={() => openScanner('scanner')} />
            <SquareBtn icon="photo-camera" label="Open mobile camera scanner" onPress={() => openScanner('camera')} />
          </View>
        </Card>
        <CartonListSection sel={sel} />
      </View>
      {!hideBar ? <SelectionBar count={sel.selectedCount} label="SAVE TRANSFER" onSave={saveTransfer} busy={loading} /> : null}

      <PickerSheet
        open={locationPickerVisible}
        title="Select Location"
        searchPlaceholder="Search location..."
        rows={locationData}
        keyOf={(row, index) => String(row.location || index)}
        labelOf={(row) => String(row.location ?? '')}
        subOf={(row) => `Location Code: ${row.locationin ?? ''}`}
        searchOf={(row) => row.location || ''}
        selectedKey={String(selectedLocation?.location || '')}
        onClose={() => setLocationPickerVisible(false)}
        onPick={(item) => {
          setSelectedLocation(item);
          setToLocation(item.location);
          setLocationPickerVisible(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}
