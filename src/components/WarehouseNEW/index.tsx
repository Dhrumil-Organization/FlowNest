// FILE: src/components/WarehouseNEW/index.tsx
// NEW ERP port of the Legacy "Warehouse" module (carton warehouse):
//   criteria -> dashboard -> assign / transfer / view, with QR scanning by
//   hardware (Urovo / keyboard-wedge) scanner and by camera.
//
// Legacy sources (components/components/Warehouse/):
//   WarehouseStack.tsx, WarehouseCriteriaScreen.tsx, WarehouseDashboardScreen.tsx,
//   WarehouseAssignScreen.tsx, WarehouseTransferScreen.tsx, WarehouseViewScreen.tsx,
//   WarehouseQRScanner.tsx, WarehouseQRCameraScanner.tsx, WarehouseActionSheet.tsx,
//   components/WarehouseCard.tsx, components/CartonCard.tsx, components/WarehouseHeader.tsx,
//   components/WarehouseStyles.js, components/useUrovoScanner.ts, services/warehouseApi.js
// Legacy route: app/(tabs)/warehouse.tsx (passed token, username, userid = AsyncStorage
//   'user_prptype', isConnected).
//
// Files of this folder
//   index.tsx            this file: the step stack (replaces the native-stack navigator)
//   api.ts               every HTTP call            model.ts   pure helpers / QR matching
//   CriteriaStep.tsx     DashboardStep.tsx          AssignStep.tsx   TransferStep.tsx   ViewStep.tsx
//   HardwareScanStep.tsx CameraScanStep.tsx         scanShared.tsx   cartonSelection.tsx
//   ui.tsx               useUrovoScanner.ts (verbatim copy of the legacy hook)
//
// Endpoints (payloads / response paths are documented in api.ts)
//   GET  /api/getproperty                    property list (criteria)
//   GET  /api/getstore                       stores of the property (criteria)
//   POST /api/mobile-user-preference/get     saved default criteria
//   POST /api/mobile-user-preference/save    save criteria on PREVIEW
//   POST /api/prodwarehouselocations         PREVIEW -> dashboard rows (rptid 501, rpt_gateway)
//   GET  /api/get_criterion                  in api.ts only (its legacy UI is commented out)
//   POST /api/getcartondetail                Assign "LOAD DATA"
//   POST /api/master_crud                    Transfer "To Location" list (browse_data)
//   POST /api/prodwarehousemanage            action 'view' (View + Transfer LOAD DATA),
//                                            'assign' (SAVE ASSIGN), 'transfer' (SAVE TRANSFER)
// AsyncStorage keys: 'user_prptype' (read), 'get_property' (read + write).
//
// Navigation: legacy `navigation.navigate(name, params)` / `goBack()` is a local
// stack of { name, params }. Like the native stack, lower entries stay mounted
// (hidden) so their state survives — e.g. the Assign selection while a scanner
// is open, or the criteria form behind the dashboard. Back order is identical:
//   scanner -> assign/transfer -> dashboard -> criteria. Android hardware back
// pops one step; on the first step it is left to the app.
//
// Deliberate deviations from legacy
//   - No own header / StatusBar / SafeArea / "back to Home": the global AppHeader
//     is used. The legacy `Home` stack screen is not ported; the criteria step is
//     the root, so it has no back row.
//   - `userid`: the legacy route passed AsyncStorage 'user_prptype' as `userid`.
//     When the prop is not supplied this component reads the same key itself.
//   - Legacy `warehouseApi.getCriteriaMaster()` never sent a request (it called
//     `.get` on the host string and swallowed the TypeError) -> not ported.
//   - Item / Merge / Grade / Shade "Selected" pickers are commented out in the
//     legacy JSX -> not rendered.
//   - Stock Type: legacy <Picker> -> Segment with the same items (All / P / F / E);
//     the initial state value stays 'ALL' exactly as legacy until the user picks one.
//   - Property / Store / To-Location pickers are kit Sheets (bottom sheet on phone,
//     dialog on tablet / web) instead of full-screen modals; same search field each
//     (store search matches StrCode, as legacy). Long lists show 200 rows + "Show more".
//   - Dashboard grid: legacy fixed 2 columns -> 2 (phone) / 3 (tablet) / 4 (desktop);
//     tapping anywhere on a tile opens the Assign / View / Transfer menu (legacy:
//     only the ⋮ icon). Carton lists: 1 / 2 / 3 columns.
//   - Scanner screens render inside the module instead of full-screen black; the
//     hardware scanner's torch button (it only flipped its own icon in legacy —
//     that screen has no camera) is not shown. The "Waiting for camera
//     permission..." screen got a CLOSE button (needed on web).
//   - The bottom "Selected / SAVE" bar is hidden while the search box has focus
//     on native only (legacy: always) — there is no soft keyboard on web.
//   - Buttons are disabled while their request is running (legacy allowed double taps).
import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import AssignStep from './AssignStep';
import CameraScanStep from './CameraScanStep';
import CriteriaStep from './CriteriaStep';
import DashboardStep from './DashboardStep';
import HardwareScanStep from './HardwareScanStep';
import { CriteriaForm, LocationParams, Row, ScanParams } from './model';
import TransferStep from './TransferStep';
import ViewStep from './ViewStep';

type Props = { token: string; API: string; username?: string; userid?: string };

/** Legacy stack screen names -> steps. */
type Step = 'criteria' | 'dashboard' | 'assign' | 'transfer' | 'view' | 'scanner' | 'camera';
type Entry = { id: number; step: Step; params?: any };

export default function WarehouseNEW({ token, API, userid }: Props) {
  const nextId = useRef(1);
  const [stack, setStack] = useState<Entry[]>([{ id: 0, step: 'criteria' }]);

  // legacy route wrapper: userid = AsyncStorage 'user_prptype'
  const [storedUserId, setStoredUserId] = useState<any>(undefined);
  useEffect(() => {
    if (userid) return;
    let alive = true;
    AsyncStorage.getItem('user_prptype')
      .then((p: any) => {
        if (alive) setStoredUserId(p);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userid]);
  const effectiveUserId = userid || storedUserId;

  // Like the native stack's navigate(): a screen that is already on top is not
  // pushed a second time (double tap on a scanner button / action-sheet row would
  // otherwise mount two scanners, one of them hidden but still listening).
  const navigate = useCallback((step: Step, params?: any) => {
    setStack((prev) =>
      prev[prev.length - 1]?.step === step ? prev : [...prev, { id: nextId.current++, step, params }],
    );
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // Like a screen's own navigation.goBack(): it only pops while THAT step is the
  // top one. A late callback of a step that is already closed (alert "OK",
  // permission result, second tap) must not pop the step underneath it.
  const goBackFrom = useCallback((id: number) => {
    setStack((prev) => (prev.length > 1 && prev[prev.length - 1].id === id ? prev.slice(0, -1) : prev));
  }, []);

  const depth = stack.length;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (depth <= 1) return false;
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [depth, goBack]);

  const openScanner = (scanType: 'scanner' | 'camera', params: ScanParams) =>
    navigate(scanType === 'camera' ? 'camera' : 'scanner', params);

  const renderStep = (entry: Entry) => {
    const goBack = () => goBackFrom(entry.id);
    switch (entry.step) {
      case 'criteria':
        return (
          <CriteriaStep
            token={token}
            API={API}
            userid={effectiveUserId}
            onPreview={(params: { criteria: CriteriaForm; dashboardData: Row[] }) => navigate('dashboard', params)}
          />
        );
      case 'dashboard':
        return (
          <DashboardStep
            criteria={entry.params?.criteria || {}}
            dashboardData={entry.params?.dashboardData || []}
            onBack={goBack}
            onOpen={(params: LocationParams) =>
              navigate(params.mode === 'ASSIGN' ? 'assign' : params.mode === 'TRANSFER' ? 'transfer' : 'view', params)
            }
          />
        );
      case 'assign':
        return <AssignStep token={token} API={API} params={entry.params} onBack={goBack} onOpenScanner={openScanner} />;
      case 'transfer':
        return <TransferStep token={token} API={API} params={entry.params} onBack={goBack} onOpenScanner={openScanner} />;
      case 'view':
        return <ViewStep token={token} API={API} params={entry.params} onBack={goBack} />;
      case 'scanner':
        return <HardwareScanStep params={entry.params} onClose={goBack} />;
      case 'camera':
        return <CameraScanStep params={entry.params} onClose={goBack} />;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {stack.map((entry, index) => {
        const top = index === stack.length - 1;
        return (
          <View
            key={entry.id}
            style={top ? { flex: 1 } : { display: 'none' }}
            pointerEvents={top ? 'auto' : 'none'}
            accessibilityElementsHidden={!top}
            importantForAccessibility={top ? 'auto' : 'no-hide-descendants'}
          >
            {renderStep(entry)}
          </View>
        );
      })}
    </View>
  );
}
