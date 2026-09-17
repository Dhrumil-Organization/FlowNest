// import AppAlert from '@/common/utils/appAlert';
// // FILE: src/screens/greyPacking/GreyPackingScannerScreen.tsx
// // Sudamo Textile ERP - Grey Packing mobile live scanner.
// // Header once -> scan continuously -> every green scan is SQL committed -> finish.
// // Existing Web Grey Packing remains untouched.

// import { GreyPackingAPI } from '@/src/api/legacyClient';
// import SearchablePickerModal, {
//   SearchablePickerOption,
// } from '@/src/components/ui/SearchablePickerModal';
// import SearchableMultiSelectModal, {
//   SearchableMultiSelectOption,
// } from '@/src/components/ui/SearchableMultiSelectModal';
// import AsyncStorage from '@/common/utils/compatibleStorage';
// import { fetchPropertyData } from '@/src/api/legacyFunctions';
// import { useBusinessContext } from '@/src/core/business';
// import { usePermission } from '@/src/core/permissions';
// import { useAppSessionStore } from '@/src/stores/AppSessionStore';
// import { T, S } from '@/src/theme';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
// import { router } from 'expo-router';
// import { useIsFocused } from '@react-navigation/native';
// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   AppState,
//   BackHandler,
//   FlatList,
//   KeyboardAvoidingView,
//   Modal,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
//   useWindowDimensions,
// } from 'react-native';

// type MainRow = {
//   UId?: number | string;
//   VouNo?: string;
//   VouDate?: string | number;
//   PackType?: string;
//   PackBy?: string;
//   ChkCode?: string;
//   Remarks?: string;
//   Status?: number | string;
//   DptCode?: string;
//   StkType?: string;
// };

// type D1Row = {
//   UId?: number | string;
//   SrNo?: number | string;
//   ItmCode?: number | string;
//   DsnCode?: number | string;
//   LotNo?: string;
//   TotPcs?: number | string;
//   TotQty?: number | string;
//   ShdCode?: number | string;
// };

// type D2Row = {
//   UId?: number | string;
//   SrNo?: number | string;
//   SubSr?: number | string;
//   TakaNo?: string;
//   Qty?: number | string;
//   KWt?: number | string;
//   CutUId?: number | string;
//   CutSrNo?: number | string;
//   CutSubSr?: number | string;
//   TranType?: number | string;
//   TrackId?: number | string;
// };

// type SessionSummary = {
//   total_taka?: number;
//   total_qty?: number | string;
//   total_kgs?: number | string;
//   is_open?: boolean;
// };

// type SessionData = {
//   main?: MainRow[];
//   d1?: D1Row[];
//   d2?: D2Row[];
//   summary?: SessionSummary;
//   open_session?: boolean;
// };

// type ScanRow = D2Row & {
//   ItmCode?: number | string;
//   ItmName?: string;
//   DsnCode?: number | string;
//   DsnName?: string;
//   ShdCode?: number | string;
//   ShdName?: string;
//   LotNo?: string;
//   TType?: string;
//   InwNo?: string;
// };

// const TXN_TYPE = 'grey_packing_barcode';
// const TXN_FILTER_KEY_PREFIX = 'grey_packing_transaction_types_v1';

// const n = (v: unknown) => {
//   const x = Number(String(v ?? '0').replace(/,/g, ''));
//   return Number.isFinite(x) ? x : 0;
// };

// const f3 = (v: unknown) =>
//   n(v).toLocaleString('en-IN', {
//     minimumFractionDigits: 3,
//     maximumFractionDigits: 3,
//   });

// const pad2 = (v: number) => String(v).padStart(2, '0');
// const displayDate = (d: Date) =>
//   `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
// const monthCode = (d: Date) => pad2(d.getMonth() + 1);

// const unwrap = (response: any): { success: boolean; message: string; data: any } => {
//   const body = response?.data ?? response ?? {};
//   return {
//     success: body?.success === true,
//     message: body?.message ?? body?.response?.message ?? 'Unexpected server response.',
//     data: body?.response ?? body?.data ?? {},
//   };
// };

// const apiError = (error: any) =>
//   error?.response?.data?.message ||
//   error?.response?.data?.error ||
//   error?.message ||
//   'Unable to reach server.';

// const isNetworkLikeError = (error: any) => {
//   // Only Axios transport failures may block Grey Packing.
//   // A Laravel validation failure converted to `new Error(...)` has no
//   // `response`, but that does NOT mean the device is offline.
//   if (error?.isAxiosError !== true) {
//     return false;
//   }

//   const code = String(error?.code ?? '').toUpperCase();
//   const message = String(error?.message ?? '').toLowerCase();

//   return (
//     code === 'ERR_NETWORK' ||
//     code === 'ECONNABORTED' ||
//     code === 'ETIMEDOUT' ||
//     (!error?.response &&
//       (message.includes('network') ||
//         message.includes('timeout') ||
//         message.includes('connection') ||
//         message.includes('internet')))
//   );
// };

// export default function GreyPackingScannerScreen() {
//   const { yearNo, prpCode: contextPrpCode,
//     // strCode,
//     isReady } = useBusinessContext();
//   const user = useAppSessionStore((s) => s.user);
//   const { canDo } = usePermission();

//   const canStart = canDo('grey_packing', 'add');
//   const canScan = canDo('grey_packing', 'scan');
//   const canRemove = canDo('grey_packing', 'remove_scan');
//   const canComplete = canDo('grey_packing', 'complete');

//   const [permission, requestPermission] = useCameraPermissions();
//   const isFocused = useIsFocused();
//   const { height: windowHeight } = useWindowDimensions();

//   const todayRef = useRef(new Date());
//   const appStateRef = useRef(AppState.currentState);
//   const scanLock = useRef(false);
//   const lastQrRef = useRef('');
//   const lastQrAtRef = useRef(0);

//   const [mode, setMode] = useState<'header' | 'scanner' | 'list' | 'browseList'>('header');

//   // Property can be changed directly from the Grey Packing header.
//   const [propertyOptions, setPropertyOptions] = useState<SearchablePickerOption[]>([]);
//   const [selectedProperty, setSelectedProperty] = useState<SearchablePickerOption | null>(null);
//   const [propertyLoading, setPropertyLoading] = useState(false);
//   const selectedPrpCode = String(selectedProperty?.value || contextPrpCode || '');

//   // Financial year is selectable on the Grey Packing header, just like Sales Order.
//   // The API continues to receive the 2-digit closing year (e.g. 27 for 2026-2027).
//   const [yearOptions, setYearOptions] = useState<SearchablePickerOption[]>([]);
//   const [selectedYear, setSelectedYear] = useState('');
//   const selectedYearNo = selectedYear ? selectedYear.slice(-2) : String(yearNo || '');

//   const [session, setSession] = useState<SessionData | null>(null);
//   const [busy, setBusy] = useState(false);
//   const [scanBusy, setScanBusy] = useState(false);
//   const [torch, setTorch] = useState(false);
//   const [connectionBlocked, setConnectionBlocked] = useState(false);
//   const [appActive, setAppActive] = useState(true);
//   // When true, the component renders ONLY a plain camera screen.
//   // This keeps Android CameraView out of ScrollView, Modal, rounded clipping,
//   // and overlapping ERP surfaces.
//   const [cameraScreenVisible, setCameraScreenVisible] = useState(false);

//   const [voucherNo, setVoucherNo] = useState('');
//   const [voucherMonth, setVoucherMonth] = useState(monthCode(todayRef.current));
//   const [voucherSuffix, setVoucherSuffix] = useState('');
//   const [voucherLoading, setVoucherLoading] = useState(false);

//   // Default header values for Add.
//   // These remain editable through the existing pickers/controls.
//   const [departmentCode, setDepartmentCode] = useState('SL');
//   const [packingType, setPackingType] = useState('R');
//   const [checkedByCode, setCheckedByCode] = useState('2');
//   const [stockType, setStockType] = useState<'I' | 'P'>('I');
//   const [cutting, setCutting] = useState(true);
//   const [packBy, setPackBy] = useState(
//     String(user?.first_name || user?.name || user?.username || ''),
//   );
//   const [remarks, setRemarks] = useState('');

//   const [departmentName, setDepartmentName] = useState('Sales');
//   const [packingTypeName, setPackingTypeName] = useState('Roll Packing');
//   const [checkedByName, setCheckedByName] = useState('Mahesh bhai');

//   const [departmentOptions, setDepartmentOptions] = useState<SearchablePickerOption[]>([]);
//   const [packingTypeOptions, setPackingTypeOptions] = useState<SearchablePickerOption[]>([]);
//   const [checkedByOptions, setCheckedByOptions] = useState<SearchablePickerOption[]>([]);

//   const [departmentLoading, setDepartmentLoading] = useState(false);
//   const [packingTypeLoading, setPackingTypeLoading] = useState(false);
//   const [checkedByLoading, setCheckedByLoading] = useState(false);

//   const [picker, setPicker] = useState<
//     'property' | 'year' | 'department' | 'packingType' | 'checkedBy' | null
//   >(null);

//   const [transactionTypeOptions, setTransactionTypeOptions] = useState<SearchableMultiSelectOption[]>([]);
//   const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<string[]>(['64']);
//   const [transactionTypeLoading, setTransactionTypeLoading] = useState(false);
//   const [transactionTypePickerOpen, setTransactionTypePickerOpen] = useState(false);
//   const [transactionFilterRestored, setTransactionFilterRestored] = useState(false);

//   const [AllPackingDataList, setPackingDataList] = useState<any[]>([]);
//   const [browseListLoading, setBrowseListLoading] = useState(false);
//   const [browseSearch, setBrowseSearch] = useState('');

//   const [lastScan, setLastScan] = useState<ScanRow | null>(null);
//   const [notice, setNotice] = useState<{ type: 'ok' | 'error' | 'info'; text: string } | null>(null);

//   const strCode = '012'
//   // console.log("stcode",strCode);

//   const main = session?.main?.[0];
//   const uid = n(main?.UId);
//   const summary = session?.summary ?? {};
//   const isOpen = uid > 0 && summary?.is_open === true;

//   const d1Map = useMemo(() => {
//     const map = new Map<number, D1Row>();
//     (session?.d1 ?? []).forEach((row) => map.set(n(row.SrNo), row));
//     return map;
//   }, [session?.d1]);

//   const rows: ScanRow[] = useMemo(
//     () =>
//       [...(session?.d2 ?? [])]
//         .sort((a, b) => n(b.SrNo) - n(a.SrNo) || n(b.SubSr) - n(a.SubSr))
//         .map((row) => {
//           const d1 = d1Map.get(n(row.SrNo));
//           return {
//             ...row,
//             ItmCode: d1?.ItmCode,
//             DsnCode: d1?.DsnCode,
//             ShdCode: d1?.ShdCode,
//             LotNo: d1?.LotNo,
//           };
//         }),
//     [session?.d2, d1Map],
//   );



//   const selectedTransactionTypeNames = useMemo(() => {
//     const map = new Map(transactionTypeOptions.map((x) => [String(x.value), x.label]));
//     return selectedTransactionTypes.map((code) => map.get(String(code)) || String(code));
//   }, [transactionTypeOptions, selectedTransactionTypes]);

//   useEffect(() => {
//     let cancelled = false;

//     const loadProperties = async () => {
//       setPropertyLoading(true);
//       try {
//         const storedCode = await AsyncStorage.getItem('selected_prpcode');
//         // The app stores the login token in AsyncStorage as `access_token`.
//         // AppSessionStore.user does not reliably contain the token, so use the
//         // same token source used by the other mobile routes.
//         const authToken = String(
//           (await AsyncStorage.getItem('access_token')) ||
//           (user as any)?.token ||
//           (user as any)?.access_token ||
//           (user as any)?.authToken ||
//           '',
//         );

//         if (!authToken) {
//           throw new Error('Login token not found. Please login again.');
//         }

//         const data = await fetchPropertyData(authToken);
//         const options: SearchablePickerOption[] = Array.isArray(data)
//           ? data
//             .map((row: any) => ({
//               value: String(row?.PrpCode ?? ''),
//               label: String(row?.LngName ?? row?.PrpCode ?? ''),
//               searchText: `${row?.LngName ?? ''} ${row?.PrpCode ?? ''}`,
//             }))
//             .filter((row: SearchablePickerOption) => row.value !== '')
//           : [];

//         if (cancelled) return;
//         setPropertyOptions(options);

//         const preferredCode = String(storedCode || contextPrpCode || '');
//         const selected = options.find((x) => x.value === preferredCode);
//         if (selected) {
//           setSelectedProperty(selected);
//         } else if (!selectedProperty && contextPrpCode) {
//           setSelectedProperty({
//             value: String(contextPrpCode),
//             label: String(contextPrpCode),
//             searchText: String(contextPrpCode),
//           });
//         }
//       } catch {
//         if (!cancelled && !selectedProperty && contextPrpCode) {
//           setSelectedProperty({
//             value: String(contextPrpCode),
//             label: String(contextPrpCode),
//             searchText: String(contextPrpCode),
//           });
//         }
//       } finally {
//         if (!cancelled) setPropertyLoading(false);
//       }
//     };

//     void loadProperties();
//     return () => { cancelled = true; };
//   }, [isReady, contextPrpCode, user]);

//   // Build the same 5 financial-year options used by Sales Order.
//   // Example: 2026-2027 -> API YearNo 27.
//   useEffect(() => {
//     let cancelled = false;

//     const loadYearOptions = async () => {
//       const currentYear = new Date().getFullYear();
//       const options: SearchablePickerOption[] = Array.from({ length: 5 }, (_, index) => {
//         const start = currentYear - index;
//         const end = start + 1;
//         const label = `${start}-${end}`;
//         return {
//           value: String(end).slice(-2),
//           label,
//           searchText: label,
//         };
//       });

//       if (cancelled) return;
//       setYearOptions(options);

//       const savedYear = await AsyncStorage.getItem('selectedyear');
//       const contextYear = String(yearNo || '');
//       const matched =
//         options.find((option) => option.label === savedYear) ||
//         options.find((option) => option.value === contextYear) ||
//         options[0];

//       if (!cancelled) setSelectedYear(matched?.label || '');
//     };

//     void loadYearOptions();
//     return () => {
//       cancelled = true;
//     };
//   }, [yearNo]);

//   const transactionFilterKey = useCallback(
//     (targetUid: number) =>
//       `${TXN_FILTER_KEY_PREFIX}:${String(selectedPrpCode)}:${String(selectedYearNo)}:${String(targetUid)}`,
//     [selectedPrpCode, selectedYearNo],
//   );

//   const persistTransactionTypes = useCallback(
//     async (targetUid: number, values: string[]) => {
//       if (targetUid <= 0) return;
//       await AsyncStorage.setItem(
//         transactionFilterKey(targetUid),
//         JSON.stringify(values.map(String)),
//       );
//     },
//     [transactionFilterKey],
//   );

//   const restoreTransactionTypes = useCallback(
//     async (targetUid: number) => {
//       if (targetUid <= 0) {
//         setTransactionFilterRestored(true);
//         return [];
//       }
//       try {
//         const raw = await AsyncStorage.getItem(transactionFilterKey(targetUid));
//         const values = raw ? JSON.parse(raw) : [];
//         const safe = Array.isArray(values) ? values.map(String).filter(Boolean) : [];
//         setSelectedTransactionTypes(safe);
//         setTransactionFilterRestored(true);
//         return safe;
//       } catch {
//         setSelectedTransactionTypes([]);
//         setTransactionFilterRestored(true);
//         return [];
//       }
//     },
//     [transactionFilterKey],
//   );

//   const webResponseData = (response: any) => {
//     const raw = response?.data;

//     // PackingList API can return either:
//     // 1) { data: [...] }
//     // 2) { data: { response: { data: [...] } } }
//     if (Array.isArray(raw)) return raw;
//     if (Array.isArray(raw?.data)) return raw.data;
//     if (Array.isArray(raw?.response?.data)) return raw.response.data;
//     if (Array.isArray(response?.response?.data)) return response.response.data;

//     return [];
//   };

//   const loadDepartments = useCallback(async () => {
//     if (!isReady) return;
//     setDepartmentLoading(true);
//     try {
//       const response = await GreyPackingAPI.departments({
//         prpcode: selectedPrpCode,
//         yearno: selectedYearNo,
//         strcode: strCode,
//         txntype: TXN_TYPE,
//       });
//       const data = webResponseData(response);
//       const options: SearchablePickerOption[] = Array.isArray(data)
//         ? data.map((row: any) => ({
//           value: String(row?.DptCode ?? ''),
//           label: String(row?.LngName ?? row?.DptCode ?? ''),
//           searchText: String(row?.DptCode ?? ''),
//         }))
//         : [];
//       setDepartmentOptions(options);
//       if (departmentCode) {
//         const selected = options.find((x) => x.value === String(departmentCode));
//         if (selected) setDepartmentName(selected.label);
//       }
//     } catch (error) {
//       AppAlert.alert('Department', apiError(error));
//     } finally {
//       setDepartmentLoading(false);
//     }
//   }, [isReady, selectedPrpCode, selectedYearNo, strCode, departmentCode, departmentName]);

//   const loadPackingTypes = useCallback(async () => {
//     if (!isReady) return;
//     setPackingTypeLoading(true);
//     try {
//       const response = await GreyPackingAPI.packingTypes({
//         prpcode: selectedPrpCode,
//         yearno: selectedYearNo,
//         strcode: strCode,
//         search: '',
//         txntype: TXN_TYPE,
//       });
//       const data = webResponseData(response);
//       const options: SearchablePickerOption[] = Array.isArray(data)
//         ? data.map((row: any) => ({
//           value: String(row?.PackType ?? ''),
//           label: String(row?.PackTypeName ?? row?.PackType ?? ''),
//           searchText: String(row?.PackType ?? ''),
//         }))
//         : [];
//       setPackingTypeOptions(options);
//       if (packingType) {
//         const selected = options.find((x) => x.value === String(packingType));
//         if (selected) setPackingTypeName(selected.label);
//       }
//     } catch (error) {
//       AppAlert.alert('Packing Type', apiError(error));
//     } finally {
//       setPackingTypeLoading(false);
//     }
//   }, [isReady, selectedPrpCode, selectedYearNo, strCode, packingType, packingTypeName]);

//   const loadCheckedBy = useCallback(async () => {
//     if (!isReady) return;
//     setCheckedByLoading(true);
//     try {
//       const response = await GreyPackingAPI.checkedBy({
//         prpcode: selectedPrpCode,
//         yearno: selectedYearNo,
//         employeecode: '',
//         txntype: TXN_TYPE,
//       });
//       const data = webResponseData(response);
//       const options: SearchablePickerOption[] = Array.isArray(data)
//         ? data.map((row: any) => ({
//           value: String(row?.ChkCode ?? ''),
//           label: String(row?.ChkName ?? row?.ChkCode ?? ''),
//           searchText: `${row?.ChkCode ?? ''} ${row?.ChkName ?? ''}`,
//         }))
//         : [];
//       setCheckedByOptions(options);

//       // Add default: Checked By code 2.
//       // The user can still change it from the existing picker.
//       if (checkedByCode === '2') {
//         const selected = options.find((x) => x.value === '2');
//         if (selected) {
//           setCheckedByName(selected.label);
//         }
//       } else if (checkedByCode && !checkedByName) {
//         setCheckedByName(
//           options.find((x) => x.value === String(checkedByCode))?.label ?? '',
//         );
//       }
//     } catch (error) {
//       AppAlert.alert('Checked By', apiError(error));
//     } finally {
//       setCheckedByLoading(false);
//     }
//   }, [
//     isReady,
//     selectedPrpCode,
//     selectedYearNo,
//     checkedByCode,
//     checkedByName,
//     user?.username,
//     user?.name,
//     user?.first_name,
//   ]);


//   const loadTransactionTypes = useCallback(async () => {
//     if (!isReady) return;
//     setTransactionTypeLoading(true);
//     try {
//       const response = await GreyPackingAPI.transactionTypes({
//         prpcode: selectedPrpCode,
//         yearno: selectedYearNo,
//         strcode: strCode,
//         fetch: 'rpttxntype',
//         txntype: TXN_TYPE,
//       });
//       const data = webResponseData(response);
//       const options: SearchableMultiSelectOption[] = Array.isArray(data)
//         ? data.map((row: any) => ({
//           value: String(row?.code ?? ''),
//           label: String(row?.name ?? row?.code ?? ''),
//           searchText: `${row?.name ?? ''} ${row?.code ?? ''}`,
//         })).filter((row: SearchableMultiSelectOption) => row.value !== '')
//         : [];
//       setTransactionTypeOptions(options);
//     } catch (error) {
//       AppAlert.alert('Transaction Type', apiError(error));
//     } finally {
//       setTransactionTypeLoading(false);
//     }
//   }, [isReady, selectedPrpCode, selectedYearNo, strCode]);

//   const loadHeaderMasters = useCallback(async () => {
//     await Promise.all([loadDepartments(), loadPackingTypes(), loadCheckedBy(), loadTransactionTypes()]);
//   }, [loadDepartments, loadPackingTypes, loadCheckedBy, loadTransactionTypes]);

//   const applySession = useCallback((data: SessionData) => {
//     if (data?.open_session === false) {
//       setSession(null);
//       setMode('header');
//       return;
//     }

//     setSession(data);
//     const loadedMain = data?.main?.[0];
//     if (loadedMain && data?.summary?.is_open) {
//       const loadedDptCode = String(loadedMain.DptCode ?? '');
//       const loadedPackType = String(loadedMain.PackType ?? '');
//       const loadedChkCode = String(loadedMain.ChkCode ?? '');

//       setDepartmentCode(loadedDptCode);
//       setPackingType(loadedPackType);
//       setCheckedByCode(loadedChkCode);

//       setDepartmentName(departmentOptions.find((x) => x.value === loadedDptCode)?.label ?? '');
//       setPackingTypeName(packingTypeOptions.find((x) => x.value === loadedPackType)?.label ?? '');
//       setCheckedByName(checkedByOptions.find((x) => x.value === loadedChkCode)?.label ?? '');
//       setStockType(String(loadedMain.StkType ?? '') === 'P' ? 'P' : 'I');
//       setCutting(
//         String((loadedMain as any).Cutting ?? '').toLowerCase() === 'true' ||
//         String((loadedMain as any).Cutting ?? '') === '1' ||
//         String((loadedMain as any).Cutting ?? '').toUpperCase() === 'Y'
//       );
//       setPackBy(String(loadedMain.PackBy ?? ''));
//       setRemarks(String(loadedMain.Remarks ?? ''));
//       setMode('scanner');
//     }
//   }, [departmentOptions, packingTypeOptions, checkedByOptions]);

//   const loadSession = useCallback(
//     async (targetUid = 0, silent = false) => {
//       if (!isReady) return null;
//       if (!silent) setBusy(true);
//       try {
//         const response = await GreyPackingAPI.getSession({
//           prpcode: selectedPrpCode,
//           yearno: selectedYearNo,
//           uid: targetUid,
//         });
//         const result = unwrap(response);
//         if (!result.success) throw new Error(result.message);
//         setConnectionBlocked(false);
//         const sessionData = result.data as SessionData;
//         applySession(sessionData);

//         const loadedUid = n(sessionData?.main?.[0]?.UId);
//         if (loadedUid > 0) {
//           await restoreTransactionTypes(loadedUid);
//         } else {
//           setTransactionFilterRestored(true);
//         }

//         return sessionData;
//       } catch (error) {
//         if (isNetworkLikeError(error)) setConnectionBlocked(true);
//         if (!silent) AppAlert.alert('Grey Packing', apiError(error));
//         return null;
//       } finally {
//         if (!silent) setBusy(false);
//       }
//     },
//     [applySession, isReady, selectedPrpCode, selectedYearNo, restoreTransactionTypes],
//   );

//   const loadVoucherNo = useCallback(async () => {
//     if (!isReady || uid > 0) return;
//     setVoucherLoading(true);
//     try {
//       const response = await GreyPackingAPI.voucherNo({
//         prpcode: selectedPrpCode,
//         yearno: selectedYearNo,
//         strcode: '',
//         acccode: '',
//         vouno: voucherNo || 0,
//         suffix: voucherSuffix || '',
//         month: voucherMonth,
//         uid: 0,
//         date: displayDate(todayRef.current),
//         module: 'GRYPacking',
//         module_no_key: 'VouNo',
//         txntype: TXN_TYPE,
//         outtype: 'I',
//       });

//       const body = response?.data?.response ?? {};
//       if (String(body?.validate) !== 'true') {
//         throw new Error(body?.message || 'Unable to generate voucher number.');
//       }

//       setVoucherNo(String(body?.VouNo ?? ''));
//       setVoucherSuffix(String(body?.suffix ?? ''));
//       setVoucherMonth(String(body?.month ?? voucherMonth));
//       setConnectionBlocked(false);
//     } catch (error) {
//       if (isNetworkLikeError(error)) setConnectionBlocked(true);
//       setNotice({ type: 'error', text: apiError(error) });
//     } finally {
//       setVoucherLoading(false);
//     }
//   }, [isReady, selectedPrpCode, selectedYearNo, uid, voucherNo, voucherSuffix, voucherMonth]);

//   useEffect(() => {
//     if (!isReady) return;
//     void loadSession(0, true);
//   }, [isReady, loadSession]);

//   useEffect(() => {
//     if (!isReady) return;
//     void loadHeaderMasters();
//   }, [isReady, loadHeaderMasters]);

//   useEffect(() => {
//     if (isReady && uid <= 0 && !voucherNo) void loadVoucherNo();
//   }, [isReady, uid, voucherNo, loadVoucherNo]);

//   useEffect(() => {
//     const sub = AppState.addEventListener('change', async (next) => {
//       const returning =
//         (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
//         next === 'active';

//       appStateRef.current = next;
//       setAppActive(next === 'active');

//       if (next !== 'active') {
//         scanLock.current = true;
//         setCameraScreenVisible(false);
//         return;
//       }

//       if (returning) {
//         if (uid > 0) {
//           setNotice({ type: 'info', text: 'Refreshing packing after interruption…' });
//           await loadSession(uid, true);
//         }

//         // CameraView is conditionally mounted by appActive + route focus.
//         // Returning to active remounts the native camera naturally.
//         setCameraScreenVisible(false);
//         scanLock.current = false;
//         setNotice(null);
//       }
//     });
//     return () => sub.remove();
//   }, [uid, loadSession]);

//   useEffect(() => {
//     const sub = BackHandler.addEventListener('hardwareBackPress', () => {
//       if (mode === 'list' && isOpen) {
//         setMode('scanner');
//         return true;
//       }
//       if (!isOpen) return false;

//       AppAlert.alert(
//         'Leave Grey Packing?',
//         `${n(summary.total_taka)} Taka are already saved. You can safely resume this packing later.`,
//         [
//           { text: 'Continue Scanning', style: 'cancel' },
//           { text: 'Leave & Resume Later', onPress: () => router.back() },
//         ],
//       );
//       return true;
//     });
//     return () => sub.remove();
//   }, [mode, isOpen, summary.total_taka]);

//   const startSession = async () => {
//     if (!canStart) {
//       AppAlert.alert('Access denied', 'You do not have Add permission for Grey Packing.');
//       return;
//     }
//     if (!isReady) {
//       AppAlert.alert('Business context missing', 'Property, financial year and store are required.');
//       return;
//     }
//     if (!voucherNo || !voucherMonth) {
//       AppAlert.alert('Voucher No', 'Valid voucher number is required.');
//       return;
//     }
//     if (!departmentCode.trim()) {
//       AppAlert.alert('Department', 'Department is required.');
//       return;
//     }
//     if (!packingType.trim()) {
//       AppAlert.alert('Packing Type', 'Packing Type is required.');
//       return;
//     }
//     if (!checkedByCode.trim()) {
//       AppAlert.alert('Checked By', 'Checked By is required.');
//       return;
//     }
//     if (selectedTransactionTypes.length === 0) {
//       AppAlert.alert('Transaction Type', 'Select at least one Transaction Type.');
//       return;
//     }

//     // If this is a resumed open session, header is already committed.
//     // Only persist the scan filter and return to scanner.
//     if (uid > 0 && isOpen) {
//       await persistTransactionTypes(uid, selectedTransactionTypes);
//       setMode('scanner');
//       return;
//     }

//     setBusy(true);
//     try {
//       const response = await GreyPackingAPI.startSession({
//         main: [
//           {
//             PrpCode: selectedPrpCode,
//             YearNo: selectedYearNo,
//             StrCode: strCode,
//             VouNo: voucherNo,
//             VouDate: displayDate(todayRef.current),
//             month: voucherMonth,
//             suffix: voucherSuffix,
//             DptCode: departmentCode.trim(),
//             PackType: packingType.trim(),
//             ChkCode: checkedByCode.trim(),
//             Cutting: cutting,
//             StkType: stockType,
//             PackBy: packBy.trim(),
//             Remarks: remarks.trim(),
//           },
//         ],
//       });
//       console.log("strCode", strCode);
//       const result = unwrap(response);
//       if (!result.success) throw new Error(result.message);

//       setConnectionBlocked(false);
//       const createdSession = result.data as SessionData;
//       applySession(createdSession);

//       const createdUid = n(createdSession?.main?.[0]?.UId);
//       if (createdUid > 0) {
//         await persistTransactionTypes(createdUid, selectedTransactionTypes);
//         setTransactionFilterRestored(true);
//       }

//       setNotice({ type: 'info', text: result.message || 'Packing session ready.' });

//       if (!permission?.granted) await requestPermission();
//     } catch (error) {
//       if (isNetworkLikeError(error)) setConnectionBlocked(true);
//       AppAlert.alert('Unable to Start Packing', apiError(error));
//     } finally {
//       setBusy(false);
//     }
//   };

//   const startScanner = async () => {
//     if (
//       !canScan ||
//       !isOpen ||
//       scanBusy ||
//       connectionBlocked ||
//       !transactionFilterRestored ||
//       selectedTransactionTypes.length === 0
//     ) {
//       return;
//     }

//     if (!permission?.granted) {
//       const result = await requestPermission();
//       if (!result?.granted) {
//         AppAlert.alert(
//           'Camera Permission',
//           'Camera access is required to scan Taka/Carton QR codes.',
//         );
//         return;
//       }
//     }

//     scanLock.current = false;
//     setTorch(false);
//     setNotice(null);
//     setCameraScreenVisible(true);
//   };

//   const closeScanner = () => {
//     scanLock.current = true;
//     setTorch(false);
//     setCameraScreenVisible(false);

//     setTimeout(() => {
//       scanLock.current = false;
//     }, 250);
//   };

//   const handleScan = async (result: BarcodeScanningResult) => {
//     const qr = String(result?.data ?? '').trim();
//     console.log("qr", qr);
//     if (
//       !qr ||
//       !canScan ||
//       !isOpen ||
//       !appActive ||
//       connectionBlocked ||
//       !transactionFilterRestored ||
//       selectedTransactionTypes.length === 0 ||
//       scanBusy ||
//       scanLock.current
//     ) {
//       return;
//     }

//     const now = Date.now();
//     if (lastQrRef.current === qr && now - lastQrAtRef.current < 1500) return;

//     scanLock.current = true;
//     setCameraScreenVisible(false);
//     setScanBusy(true);
//     setNotice(null);


//     try {
//       const response = await GreyPackingAPI.scanSave({
//         prpcode: selectedPrpCode,
//         yearno: selectedYearNo,
//         strcode: strCode,
//         uid,
//         qrcode: qr,
//         txntype: TXN_TYPE,
//         ttype: selectedTransactionTypes,
//       });

//       const result = unwrap(response);
//       const data = result.data ?? {};

//       if (!result.success) {
//         // Server/business validation is not a network failure.
//         setConnectionBlocked(false);
//         setNotice({
//           type: 'error',
//           text: result.message || 'Scan rejected by server.',
//         });
//         return;
//       }

//       if (data?.session) applySession(data.session as SessionData);
//       if (data?.scan) setLastScan(data.scan as ScanRow);

//       lastQrRef.current = qr;
//       lastQrAtRef.current = Date.now();
//       setConnectionBlocked(false);
//       setNotice({
//         type: 'ok',
//         text: data?.idempotent
//           ? `Already saved: ${data?.scan?.TakaNo ?? 'Taka'}`
//           : `Saved: ${data?.scan?.TakaNo ?? 'Taka'} • ${f3(data?.scan?.Qty)} Mtr`,
//       });
//     } catch (error) {
//       if (isNetworkLikeError(error)) {
//         // Do not accept another QR until the authoritative session is reloaded.
//         setConnectionBlocked(true);
//         setNotice({
//           type: 'error',
//           text: 'Connection lost or response uncertain. Scanning is paused until server status is refreshed.',
//         });
//       } else {
//         setNotice({ type: 'error', text: apiError(error) });
//       }
//     } finally {
//       setScanBusy(false);
//       scanLock.current = false;
//       setCameraScreenVisible(false);
//     }
//   };

//   const retryConnection = async () => {
//     setBusy(true);
//     const loaded = await loadSession(uid || 0, true);
//     setBusy(false);
//     if (loaded) {
//       setConnectionBlocked(false);
//       setCameraScreenVisible(false);
//       scanLock.current = false;
//       setNotice({ type: 'info', text: 'Server connection restored. Scanning can continue.' });
//     } else {
//       AppAlert.alert('Still Offline', 'Unable to confirm live Grey Packing state.');
//     }
//   };

//   const removeScan = (row: D2Row) => {
//     if (!canRemove) {
//       AppAlert.alert('Access denied', 'You do not have permission to remove a scanned Taka.');
//       return;
//     }

//     AppAlert.alert(
//       'Remove Taka?',
//       `Taka ${row.TakaNo || ''} will be removed and its original source balance restored.`,
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Remove',
//           style: 'destructive',
//           onPress: async () => {
//             setBusy(true);
//             try {
//               const response = await GreyPackingAPI.removeScan({
//                 prpcode: selectedPrpCode,
//                 yearno: selectedYearNo,
//                 uid,
//                 srno: n(row.SrNo),
//                 subsr: n(row.SubSr),
//               });
//               const result = unwrap(response);
//               if (!result.success) throw new Error(result.message);
//               applySession(result.data as SessionData);
//               setLastScan(null);
//               setConnectionBlocked(false);
//               setNotice({ type: 'info', text: `Taka ${row.TakaNo || ''} removed. Balance restored.` });
//             } catch (error) {
//               if (isNetworkLikeError(error)) setConnectionBlocked(true);
//               AppAlert.alert('Unable to Remove Taka', apiError(error));
//             } finally {
//               setBusy(false);
//             }
//           },
//         },
//       ],
//     );
//   };

//   const cancelEmptyPacking = () => {
//     if (!isOpen || n(summary.total_taka) !== 0) return;

//     AppAlert.alert(
//       'Cancel Packing?',
//       'No Taka/Carton has been scanned. This empty packing header will be deleted.',
//       [
//         { text: 'Keep Packing', style: 'cancel' },
//         {
//           text: 'Cancel Packing',
//           style: 'destructive',
//           onPress: async () => {
//             setBusy(true);
//             scanLock.current = true;
//             setCameraScreenVisible(false);

//             try {
//               const response = await GreyPackingAPI.cancelSession({
//                 prpcode: selectedPrpCode,
//                 yearno: selectedYearNo,
//                 uid,
//               });

//               const result = unwrap(response);
//               if (!result.success) throw new Error(result.message);

//               try {
//                 await AsyncStorage.removeItem(transactionFilterKey(uid));
//               } catch {
//                 // Local filter cleanup must not turn a successful server cancel
//                 // into a user-visible failure.
//               }

//               setSession(null);
//               setLastScan(null);
//               setNotice(null);
//               setSelectedTransactionTypes([]);
//               setTransactionFilterRestored(true);
//               setConnectionBlocked(false);
//               setMode('header');

//               // Do not reuse the cancelled voucher. The backend voucher sequence
//               // is intentionally not rolled back.
//               setVoucherNo('');
//               setVoucherSuffix('');
//               setVoucherMonth(monthCode(todayRef.current));

//               scanLock.current = false;
//               setCameraScreenVisible(false);
//             } catch (error) {
//               if (isNetworkLikeError(error)) setConnectionBlocked(true);
//               AppAlert.alert('Unable to Cancel Packing', apiError(error));
//               setCameraScreenVisible(false);
//               scanLock.current = false;
//             } finally {
//               setBusy(false);
//             }
//           },
//         },
//       ],
//     );
//   };

//   const finishPacking = () => {
//     if (!canComplete) {
//       AppAlert.alert('Access denied', 'You do not have permission to complete Grey Packing.');
//       return;
//     }
//     if (n(summary.total_taka) <= 0) {
//       AppAlert.alert('Nothing to Finish', 'Scan at least one Taka.');
//       return;
//     }

//     AppAlert.alert(
//       'Finish Packing?',
//       `${n(summary.total_taka)} Taka • ${f3(summary.total_qty)} Mtr\n\nFinishing does not consume stock again. It closes this live packing session.`,
//       [
//         { text: 'Continue Scanning', style: 'cancel' },
//         {
//           text: 'Finish Packing',
//           onPress: async () => {
//             setBusy(true);
//             try {
//               const response = await GreyPackingAPI.completeSession({
//                 prpcode: selectedPrpCode,
//                 yearno: selectedYearNo,
//                 uid,
//               });
//               const result = unwrap(response);
//               if (!result.success) throw new Error(result.message);
//               applySession(result.data as SessionData);
//               setMode('list');
//               setConnectionBlocked(false);
//               setNotice({ type: 'ok', text: 'Packing completed successfully.' });
//             } catch (error) {
//               if (isNetworkLikeError(error)) setConnectionBlocked(true);
//               AppAlert.alert('Unable to Finish Packing', apiError(error));
//             } finally {
//               setBusy(false);
//             }
//           },
//         },
//       ],
//     );
//   };

//   const Notice = () => {
//     if (!notice) return null;
//     const bg =
//       notice.type === 'ok' ? '#E8F5ED' : notice.type === 'error' ? '#FCECEA' : '#F5E8DA';
//     const fg =
//       notice.type === 'ok' ? T.green : notice.type === 'error' ? T.red : T.copper;
//     return (
//       <View style={[styles.notice, { backgroundColor: bg }]}>
//         <Icon
//           name={notice.type === 'ok' ? 'check-circle' : notice.type === 'error' ? 'error' : 'info'}
//           size={20}
//           color={fg}
//         />
//         <Text style={[styles.noticeText, { color: fg }]}>{notice.text}</Text>
//       </View>
//     );
//   };

//   const Summary = () => (
//     <View style={styles.summary}>
//       <View style={styles.summaryCell}>
//         <Text style={styles.summaryValue}>{n(summary.total_taka)}</Text>
//         <Text style={styles.summaryLabel}>TAKA</Text>
//       </View>
//       <View style={styles.summaryDivider} />
//       <View style={styles.summaryCell}>
//         <Text style={styles.summaryValue}>{f3(summary.total_qty)}</Text>
//         <Text style={styles.summaryLabel}>METRES</Text>
//       </View>
//       <View style={styles.summaryDivider} />
//       <View style={styles.summaryCell}>
//         <Text style={styles.summaryValue}>{f3(summary.total_kgs)}</Text>
//         <Text style={styles.summaryLabel}>KG</Text>
//       </View>
//     </View>
//   );

//   const headerScrollRef = useRef<ScrollView>(null);
//   const headerScrollY = useRef(0);

//   const HeaderForm = () => (
//     <KeyboardAvoidingView
//       style={{ flex: 1 }}
//       behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//     >
//       <ScrollView
//         ref={headerScrollRef}
//         contentContainerStyle={styles.formContent}
//         keyboardShouldPersistTaps="handled"
//         onScroll={(event) => {
//           headerScrollY.current = event.nativeEvent.contentOffset.y;
//         }}
//         scrollEventThrottle={16}
//       >
//         <View style={styles.tip}>
//           <View style={styles.tipIcon}>
//             <Icon name="inventory-2" size={24} color={T.copper} />
//           </View>
//           <View style={{ flex: 1 }}>
//             <Text style={styles.tipTitle}>Enter once. Then keep scanning.</Text>
//             <Text style={styles.tipText}>
//               A green scan means that Taka and its source-stock reduction are already committed in SQL.
//             </Text>
//           </View>
//         </View>

//         <Notice />

//         {connectionBlocked && (
//           <TouchableOpacity style={styles.retryButton} onPress={retryConnection}>
//             <Icon name="refresh" size={20} color="#FFF" />
//             <Text style={styles.retryText}>Retry Server Connection</Text>
//           </TouchableOpacity>
//         )}

//         <View style={styles.card}>
//           <Text style={styles.cardEyebrow}>PACKING HEADER</Text>
//           <Text style={styles.cardTitle}>Main Details</Text>

//           <Text style={styles.label}>Property</Text>
//           <TouchableOpacity
//             style={[styles.pickerField, styles.propertyPickerField]}
//             onPress={() => setPicker('property')}>
//             <View style={styles.pickerLeading}>
//               <Icon name="business" size={19} color={T.copper} />
//             </View>
//             <View style={{ flex: 1 }}>
//               <Text style={[styles.pickerValue, !selectedPrpCode && styles.pickerPlaceholder]}>
//                 {selectedProperty?.label || (selectedPrpCode ? selectedPrpCode : 'Search Property')}
//               </Text>
//               {!!selectedPrpCode && <Text style={styles.pickerCode}>{selectedPrpCode}</Text>}
//             </View>
//             {propertyLoading ? (
//               <ActivityIndicator size="small" color={T.copper} />
//             ) : (
//               <Icon name="keyboard-arrow-down" size={23} color={T.muted} />
//             )}
//           </TouchableOpacity>

//           {/* Store stays below the Property + Financial Year pickers. */}
//           <Text style={styles.label}>Financial Year *</Text>
//           <TouchableOpacity
//             style={[styles.pickerField, styles.propertyPickerField]}
//             activeOpacity={0.8}
//             onPress={() => setPicker('year')}
//           >
//             <View style={styles.pickerLeading}>
//               <Icon name="calendar-today" size={19} color={T.copper} />
//             </View>
//             <View style={{ flex: 1 }}>
//               <Text style={[styles.pickerValue, !selectedYear && styles.pickerPlaceholder]}>
//                 {selectedYear || 'Select Financial Year'}
//               </Text>
//               {!!selectedYearNo && (
//                 <Text style={styles.pickerCode}>Year No: {selectedYearNo}</Text>
//               )}
//             </View>
//             <Icon name="keyboard-arrow-down" size={23} color={T.muted} />
//           </TouchableOpacity>

//           <Text style={styles.label}>Grey Store</Text>
//           <View style={[styles.pickerField, styles.propertyPickerField]}>
//             <View style={styles.pickerLeading}>
//               <Icon name="store" size={19} color={T.copper} />
//             </View>
//             <View style={{ flex: 1 }}>
//               <Text style={styles.pickerValue}>
//                 {strCode || '—'}
//               </Text>
//             </View>
//           </View>

//           <Text style={styles.label}>Voucher No</Text>
//           <View style={styles.voucherRow}>
//             <View style={styles.voucherBox}>
//               <Text style={styles.voucherMonth}>{voucherMonth || '--'}</Text>
//               <Text style={styles.voucherSlash}>/</Text>
//               <Text style={styles.voucherNo}>{voucherNo || 'Loading…'}</Text>
//             </View>
//             <TouchableOpacity style={styles.squareButton} onPress={loadVoucherNo} disabled={voucherLoading}>
//               {voucherLoading ? <ActivityIndicator size="small" color={T.nav} /> : <Icon name="refresh" size={22} color={T.nav} />}
//             </TouchableOpacity>
//           </View>

//           <Text style={styles.label}>Department *</Text>
//           <TouchableOpacity style={styles.pickerField} onPress={() => setPicker('department')}>
//             <View style={styles.pickerLeading}>
//               <Icon name="account-tree" size={19} color={T.copper} />
//             </View>
//             <View style={{ flex: 1 }}>
//               <Text style={[styles.pickerValue, !departmentCode && styles.pickerPlaceholder]}>
//                 {departmentName || (departmentCode ? departmentCode : 'Search Department')}
//               </Text>
//               {!!departmentCode && <Text style={styles.pickerCode}>{departmentCode}</Text>}
//             </View>
//             {departmentLoading ? (
//               <ActivityIndicator size="small" color={T.copper} />
//             ) : (
//               <Icon name="keyboard-arrow-down" size={23} color={T.muted} />
//             )}
//           </TouchableOpacity>

//           <Text style={styles.label}>Packing Type *</Text>
//           <TouchableOpacity style={styles.pickerField} onPress={() => setPicker('packingType')}>
//             <View style={styles.pickerLeading}>
//               <Icon name="inventory" size={19} color={T.copper} />
//             </View>
//             <View style={{ flex: 1 }}>
//               <Text style={[styles.pickerValue, !packingType && styles.pickerPlaceholder]}>
//                 {packingTypeName || (packingType ? packingType : 'Search Packing Type')}
//               </Text>
//               {!!packingType && <Text style={styles.pickerCode}>{packingType}</Text>}
//             </View>
//             {packingTypeLoading ? (
//               <ActivityIndicator size="small" color={T.copper} />
//             ) : (
//               <Icon name="keyboard-arrow-down" size={23} color={T.muted} />
//             )}
//           </TouchableOpacity>

//           <Text style={styles.label}>Checked By *</Text>
//           <TouchableOpacity style={styles.pickerField} onPress={() => setPicker('checkedBy')}>
//             <View style={styles.pickerLeading}>
//               <Icon name="person-search" size={19} color={T.copper} />
//             </View>
//             <View style={{ flex: 1 }}>
//               <Text style={[styles.pickerValue, !checkedByCode && styles.pickerPlaceholder]}>
//                 {checkedByName || (checkedByCode ? checkedByCode : 'Search Checked By')}
//               </Text>
//               {!!checkedByCode && <Text style={styles.pickerCode}>{checkedByCode}</Text>}
//             </View>
//             {checkedByLoading ? (
//               <ActivityIndicator size="small" color={T.copper} />
//             ) : (
//               <Icon name="keyboard-arrow-down" size={23} color={T.muted} />
//             )}
//           </TouchableOpacity>

//           <Text style={styles.label}>Stock Type *</Text>
//           <View style={styles.segment}>
//             <TouchableOpacity
//               style={[styles.segmentButton, stockType === 'I' && styles.segmentActive]}
//               onPress={() => setStockType('I')}
//             >
//               <Text style={[styles.segmentText, stockType === 'I' && styles.segmentTextActive]}>In House</Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[styles.segmentButton, stockType === 'P' && styles.segmentActive]}
//               onPress={() => setStockType('P')}
//             >
//               <Text style={[styles.segmentText, stockType === 'P' && styles.segmentTextActive]}>Process House</Text>
//             </TouchableOpacity>
//           </View>

//           <Text style={styles.label}>Cutting</Text>
//           <TouchableOpacity
//             style={styles.checkboxRow}
//             activeOpacity={0.8}
//             onPress={() => {
//               setCutting((value) => !value);
//             }}
//           >
//             <View style={[styles.checkbox, cutting && styles.checkboxChecked]}>
//               {cutting && <Icon name="check" size={16} color="#FFF" />}
//             </View>
//             <Text style={styles.checkboxText}>Cutting</Text>
//           </TouchableOpacity>



//           <Text style={styles.label}>Transaction Type *</Text>
//           <TouchableOpacity
//             style={styles.pickerField}
//             onPress={() => setTransactionTypePickerOpen(true)}
//           >
//             <View style={styles.pickerLeading}>
//               <Icon name="rule" size={19} color={T.copper} />
//             </View>
//             <View style={{ flex: 1 }}>
//               <Text
//                 style={[
//                   styles.pickerValue,
//                   selectedTransactionTypes.length === 0 && styles.pickerPlaceholder,
//                 ]}
//                 numberOfLines={2}
//               >
//                 {selectedTransactionTypes.length === 0
//                   ? 'Select Transaction Type'
//                   : selectedTransactionTypeNames.slice(0, 2).join(', ')}
//               </Text>
//               {selectedTransactionTypes.length > 2 && (
//                 <Text style={styles.pickerCode}>
//                   +{selectedTransactionTypes.length - 2} more selected
//                 </Text>
//               )}
//             </View>
//             {transactionTypeLoading ? (
//               <ActivityIndicator size="small" color={T.copper} />
//             ) : (
//               <View style={styles.multiCountBadge}>
//                 <Text style={styles.multiCountText}>{selectedTransactionTypes.length}</Text>
//               </View>
//             )}
//           </TouchableOpacity>

//           <Text style={styles.label}>Packed By</Text>
//           <TextInput
//             value={packBy}
//             onChangeText={setPackBy}
//             placeholder="Packed by"
//             placeholderTextColor={T.muted}
//             style={styles.input}
//           />

//           <Text style={styles.label}>Remarks</Text>
//           <TextInput
//             value={remarks}
//             onChangeText={setRemarks}
//             placeholder="Optional remarks"
//             placeholderTextColor={T.muted}
//             multiline
//             maxLength={50}
//             style={[styles.input, styles.multiline]}
//           />
//         </View>

//         <TouchableOpacity
//           style={[styles.primary, (!canStart || connectionBlocked || busy || voucherLoading) && styles.disabled]}
//           disabled={!canStart || connectionBlocked || busy || voucherLoading}
//           onPress={startSession}
//         >
//           <Icon name="qr-code-scanner" size={22} color="#FFF" />
//           <Text style={styles.primaryText}>Start Scanning</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.browseListButton}
//           onPress={loadPackingbrowselist}
//           disabled={browseListLoading}
//         >
//           {browseListLoading ? (
//             <ActivityIndicator size="small" color={T.nav} />
//           ) : (
//             <Icon name="format-list-bulleted" size={21} color={T.nav} />
//           )}
//           <Text style={styles.browseListText}>
//             {browseListLoading ? 'Loading...' : 'Browse List'}
//           </Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );

//   const Scanner = () => {
//     const scannerDisabled =
//       !canScan ||
//       !isOpen ||
//       scanBusy ||
//       connectionBlocked ||
//       !transactionFilterRestored ||
//       selectedTransactionTypes.length === 0;

//     return (
//       <ScrollView
//         style={styles.scannerScroll}
//         contentContainerStyle={styles.scannerContent}
//         keyboardShouldPersistTaps="handled"
//       >
//         <View style={styles.scanLauncherCard}>
//           <View style={styles.scanLauncherIcon}>
//             <Icon name="qr-code-scanner" size={46} color={T.copper} />
//           </View>

//           <Text style={styles.scanLauncherEyebrow}>GREY PACKING SCANNER</Text>
//           <Text style={styles.scanLauncherTitle}>
//             {n(summary.total_taka) === 0 ? 'Ready to Scan' : 'Ready for Next Taka'}
//           </Text>

//           <Text style={styles.scanLauncherText}>
//             Tap Start Scan to open the camera full-screen. The camera closes
//             immediately after one QR is read.
//           </Text>

//           <TouchableOpacity
//             style={[styles.startScanButton, scannerDisabled && styles.disabled]}
//             disabled={scannerDisabled}
//             onPress={startScanner}
//           >
//             <Icon name="photo-camera" size={21} color="#FFF" />
//             <Text style={styles.startScanButtonText}>
//               {n(summary.total_taka) === 0 ? 'Start Scan' : 'Scan Next Taka'}
//             </Text>
//           </TouchableOpacity>
//         </View>

//         <Summary />

//         <TouchableOpacity
//           style={[
//             styles.transactionFilterCard,
//             selectedTransactionTypes.length === 0 && styles.transactionFilterMissing,
//           ]}
//           onPress={() => {
//             closeScanner();
//             setTransactionTypePickerOpen(true);
//           }}
//         >
//           <View style={styles.transactionFilterIcon}>
//             <Icon name="rule" size={20} color={T.copper} />
//           </View>
//           <View style={{ flex: 1 }}>
//             <Text style={styles.transactionFilterLabel}>TRANSACTION TYPE</Text>
//             <Text
//               style={[
//                 styles.transactionFilterValue,
//                 selectedTransactionTypes.length === 0 && { color: T.red },
//               ]}
//               numberOfLines={2}
//             >
//               {selectedTransactionTypes.length === 0
//                 ? 'Required before scanning'
//                 : selectedTransactionTypeNames.join(', ')}
//             </Text>
//           </View>
//           <Icon name="edit" size={18} color={T.nav} />
//         </TouchableOpacity>

//         <Notice />

//         {connectionBlocked && (
//           <TouchableOpacity style={styles.retryButton} onPress={retryConnection}>
//             <Icon name="refresh" size={20} color="#FFF" />
//             <Text style={styles.retryText}>Confirm Server & Resume</Text>
//           </TouchableOpacity>
//         )}

//         {lastScan && (
//           <View style={styles.lastScan}>
//             <View style={styles.lastScanCheck}>
//               <Icon name="check" size={19} color="#FFF" />
//             </View>
//             <View style={{ flex: 1 }}>
//               <Text style={styles.lastLabel}>LAST SAVED</Text>
//               <Text style={styles.lastTaka}>{lastScan.TakaNo || '—'}</Text>
//               <Text style={styles.lastMeta}>
//                 {lastScan.DsnName || `Design ${lastScan.DsnCode || '—'}`} • {f3(lastScan.Qty)} Mtr
//               </Text>
//             </View>
//             <Text style={styles.committed}>COMMITTED</Text>
//           </View>
//         )}

//         <View style={styles.actions}>
//           {n(summary.total_taka) === 0 ? (
//             <TouchableOpacity
//               style={[styles.cancelPackingButton, connectionBlocked && styles.disabled]}
//               disabled={connectionBlocked}
//               onPress={cancelEmptyPacking}
//             >
//               <Icon name="cancel" size={20} color={T.red} />
//               <Text style={styles.cancelPackingText}>Cancel Packing</Text>
//             </TouchableOpacity>
//           ) : (
//             <>
//               <TouchableOpacity style={styles.secondary} onPress={() => setMode('list')}>
//                 <Icon name="format-list-bulleted" size={21} color={T.nav} />
//                 <Text style={styles.secondaryText}>List ({n(summary.total_taka)})</Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[styles.finish, (!canComplete || connectionBlocked) && styles.disabled]}
//                 disabled={!canComplete || connectionBlocked}
//                 onPress={finishPacking}
//               >
//                 <Icon name="done-all" size={21} color="#FFF" />
//                 <Text style={styles.finishText}>Finish Packing</Text>
//               </TouchableOpacity>
//             </>
//           )}
//         </View>
//       </ScrollView>
//     );
//   };

//   const filteredPackingDataList = useMemo(() => {
//     const query = browseSearch.trim().toLowerCase();
//     if (!query) return AllPackingDataList;

//     return AllPackingDataList.filter((item: any) => {
//       const searchableText = [
//         item?.VouNo,
//         item?.VouDate,
//         item?.DptName,
//         item?.DptCode,
//         item?.PackTypeName,
//         item?.PackType,
//         item?.Remarks,
//       ]
//         .map((value) => String(value ?? ''))
//         .join(' ')
//         .toLowerCase();

//       return searchableText.includes(query);
//     });
//   }, [AllPackingDataList, browseSearch]);

//   const BrowseList = useMemo(() => (
//     <View style={styles.browseScreen}>
//       <View style={styles.browseHeader}>
//         <TouchableOpacity
//           style={styles.squareButton}
//           onPress={() => setMode('header')}
//         >
//           <Icon name="arrow-back-ios-new" size={18} color={T.nav} />
//         </TouchableOpacity>

//         <View style={{ flex: 1 }}>
//           <Text style={styles.cardEyebrow}>GREY PACKING</Text>
//           <Text style={styles.browseTitle}>Browse List</Text>
//         </View>

//         <TouchableOpacity
//           style={styles.squareButton}
//           onPress={loadPackingbrowselist}
//           disabled={browseListLoading}
//         >
//           {browseListLoading ? (
//             <ActivityIndicator size="small" color={T.nav} />
//           ) : (
//             <Icon name="refresh" size={21} color={T.nav} />
//           )}
//         </TouchableOpacity>
//       </View>

//       <View style={styles.browseSummary}>
//         <View style={styles.browseCountWrap}>
//           <Text style={styles.browseSummaryText}>
//             {filteredPackingDataList.length} / {AllPackingDataList.length} record{AllPackingDataList.length === 1 ? '' : 's'}
//           </Text>
//         </View>

//         <View style={styles.browseSearchBox}>
//           <Icon name="search" size={19} color={T.muted} />
//           <TextInput
//             value={browseSearch}
//             onChangeText={setBrowseSearch}
//             placeholder="Search..."
//             placeholderTextColor={T.muted}
//             style={styles.browseSearchInput}
//             returnKeyType="search"
//           />
//           {!!browseSearch && (
//             <TouchableOpacity onPress={() => setBrowseSearch('')} hitSlop={8}>
//               <Icon name="close" size={18} color={T.muted} />
//             </TouchableOpacity>
//           )}
//         </View>
//       </View>

//       <FlatList
//         data={filteredPackingDataList}
//         keyExtractor={(item, index) => String(item?.UrowId ?? item?.UId ?? index)}
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={styles.browseListContent}
//         renderItem={({ item }) => {
//           const vouNo = String(item?.VouNo ?? '—').trim() || '—';
//           const vouDate = String(item?.VouDate ?? '—').trim() || '—';
//           const department = String(item?.DptName ?? item?.DptCode ?? '—').trim() || '—';
//           const packingType = String(item?.PackTypeName ?? item?.PackType ?? '—').trim() || '—';
//           const remarks = String(item?.Remarks ?? '').trim();
//           return (
//             <View style={styles.browseCard}>
//               <View style={styles.browseCardTop}>
//                 <View style={{ flex: 1, paddingRight: 8 }}>
//                   <Text style={styles.browseVoucher}>{vouNo}</Text>
//                 </View>
//                 <Text style={styles.browseDate}>{vouDate}</Text>
//               </View>

//               <View style={styles.browseCardDivider} />

//               <View style={styles.browseCardInfo}>
//                 <View style={styles.browseCardCell}>
//                   <Text style={styles.browseLabel}>DEPARTMENT</Text>
//                   <Text style={styles.browseValue} numberOfLines={1}>{department}</Text>
//                 </View>

//                 <View style={styles.browseCardCell}>
//                   <Text style={styles.browseLabel}>PACKING TYPE</Text>
//                   <Text style={styles.browseValue} numberOfLines={1}>{packingType}</Text>
//                 </View>
//               </View>

//               <View style={styles.browseCardBottom}>
//                 <View style={{ flex: 1 }}>
//                   <Text style={styles.browseLabel}>REMARKS</Text>
//                   <Text style={styles.browseRemarks} numberOfLines={2}>
//                     {remarks || '—'}
//                   </Text>
//                 </View>
//               </View>
//             </View>
//           );
//         }}
//         ListEmptyComponent={
//           <View style={styles.browseEmpty}>
//             <Icon name="format-list-bulleted" size={38} color={T.border} />
//             <Text style={styles.emptyText}>No packing records found.</Text>
//           </View>
//         }
//       />
//     </View>
//   ), [AllPackingDataList.length, browseListLoading, browseSearch, filteredPackingDataList, loadPackingbrowselist]);

//   const List = () => (
//     <View style={styles.listScreen}>
//       <View style={styles.listHeader}>
//         <TouchableOpacity
//           style={styles.squareButton}
//           onPress={() => (isOpen ? setMode('scanner') : router.back())}
//         >
//           <Icon name="arrow-back-ios-new" size={18} color={T.nav} />
//         </TouchableOpacity>
//         <View style={{ flex: 1 }}>
//           <Text style={styles.cardEyebrow}>{isOpen ? 'LIVE PACKING' : 'PACKING COMPLETE'}</Text>
//           <Text style={styles.listTitle}>Packed Taka</Text>
//         </View>
//       </View>

//       <Summary />
//       <Notice />

//       <FlatList
//         data={rows}
//         keyExtractor={(item, index) => `${item.UId}-${item.SrNo}-${item.SubSr}-${index}`}
//         contentContainerStyle={styles.listContent}
//         renderItem={({ item }) => (
//           <View style={styles.scanRow}>
//             <View style={styles.scanRowIcon}><Icon name="qr-code-2" size={21} color={T.copper} /></View>
//             <View style={{ flex: 1 }}>
//               <View style={styles.scanRowTop}>
//                 <Text style={styles.scanRowTaka}>{item.TakaNo || '—'}</Text>
//                 <View style={styles.savedBadge}>
//                   <Icon name="check-circle" size={14} color={T.green} />
//                   <Text style={styles.savedBadgeText}>Saved</Text>
//                 </View>
//               </View>
//               <Text style={styles.scanRowMeta}>{f3(item.Qty)} Mtr • {f3(item.KWt)} Kg</Text>
//               <Text style={styles.scanRowSub}>
//                 {item.LotNo ? `Lot ${item.LotNo}` : ''}
//                 {item.DsnCode ? `${item.LotNo ? ' • ' : ''}Design ${item.DsnCode}` : ''}
//               </Text>
//             </View>

//             {isOpen && canRemove && (
//               <TouchableOpacity style={styles.removeButton} onPress={() => removeScan(item)}>
//                 <Icon name="delete-outline" size={22} color={T.red} />
//               </TouchableOpacity>
//             )}
//           </View>
//         )}
//         ListEmptyComponent={
//           <View style={styles.empty}>
//             <Icon name="qr-code-scanner" size={38} color={T.border} />
//             <Text style={styles.emptyText}>No Taka scanned yet.</Text>
//           </View>
//         }
//       />

//       {isOpen ? (
//         <View style={styles.bottomBar}>
//           <TouchableOpacity style={styles.secondary} onPress={() => setMode('scanner')}>
//             <Icon name="qr-code-scanner" size={21} color={T.nav} />
//             <Text style={styles.secondaryText}>Resume</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.finish, (!canComplete || connectionBlocked) && styles.disabled]}
//             disabled={!canComplete || connectionBlocked}
//             onPress={finishPacking}
//           >
//             <Text style={styles.finishText}>Finish Packing</Text>
//           </TouchableOpacity>
//         </View>
//       ) : (
//         <View style={styles.completedBar}>
//           <View style={styles.completedIcon}><Icon name="check" size={22} color="#FFF" /></View>
//           <View style={{ flex: 1 }}>
//             <Text style={styles.completedTitle}>Packing completed</Text>
//             <Text style={styles.completedText}>All displayed Taka are committed in the database.</Text>
//           </View>
//         </View>
//       )}
//     </View>
//   );

//   if (cameraScreenVisible) {
//     return (
//       <View style={styles.cameraOnlyRoot}>
//         <View style={styles.cameraOnlyTopBar}>
//           <TouchableOpacity style={styles.cameraOnlyClose} onPress={closeScanner}>
//             <Icon name="arrow-back-ios-new" size={19} color="#FFF" />
//             <Text style={styles.cameraOnlyCloseText}>Back</Text>
//           </TouchableOpacity>

//           <View style={styles.cameraOnlyTitleWrap}>
//             <Text style={styles.cameraOnlyEyebrow}>GREY PACKING</Text>
//             <Text style={styles.cameraOnlyTitle}>Scan Taka QR</Text>
//           </View>

//           <TouchableOpacity
//             style={styles.cameraOnlyTorch}
//             onPress={() => setTorch((value) => !value)}
//           >
//             <Icon name={torch ? 'flash-on' : 'flash-off'} size={23} color="#FFF" />
//           </TouchableOpacity>
//         </View>

//         <View style={styles.cameraOnlyPreview}>
//           {permission?.granted ? (
//             <CameraView
//               style={styles.cameraOnlyCamera}
//               facing="back"
//               enableTorch={torch}
//               barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
//               onBarcodeScanned={scanLock.current ? undefined : handleScan}
//             />
//           ) : (
//             <View style={styles.cameraOnlyPermission}>
//               <Icon name="photo-camera" size={48} color={T.copper} />
//               <Text style={styles.cameraOnlyPermissionTitle}>Camera permission required</Text>
//               <TouchableOpacity style={styles.cameraOnlyPermissionButton} onPress={requestPermission}>
//                 <Text style={styles.cameraOnlyPermissionButtonText}>Allow Camera</Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         </View>

//         <View style={styles.cameraOnlyFooter}>
//           <View style={styles.cameraOnlyStatusDot} />
//           <Text style={styles.cameraOnlyFooterText}>
//             Point the camera at one Taka / Carton QR code
//           </Text>
//         </View>
//       </View>
//     );
//   }


//   const loadPackingbrowselist = useCallback(async () => {
//     if (!isReady) return;

//     const payload = {
//       prpcode: selectedPrpCode,
//       yearno: selectedYearNo,
//       employeecode: '',
//       txntype: TXN_TYPE,
//     };

//     console.log('[GreyPacking] PackingList payload:', payload);
//     setBrowseListLoading(true);

//     // Keep the current Header ScrollView position when the loading state updates.
//     requestAnimationFrame(() => {
//       requestAnimationFrame(() => {
//         headerScrollRef.current?.scrollTo({
//           y: headerScrollY.current,
//           animated: false,
//         });
//       });
//     });

//     try {
//       const response = await GreyPackingAPI.PackingList(payload);

//       console.log('[GreyPacking] PackingList response:', response);

//       const data = webResponseData(response);
//       console.log('[GreyPacking] PackingList response data:', data);

//       const list = Array.isArray(data) ? data : [];

//       setPackingDataList(list);
//       setBrowseSearch('');
//       setMode('browseList');
//     } catch (error) {
//       console.log('[GreyPacking] PackingList error:', error);
//       AppAlert.alert('Browse List', apiError(error));
//     } finally {
//       setBrowseListLoading(false);
//     }
//   }, [isReady, selectedPrpCode, selectedYearNo]);

//   return (
//     <View style={styles.root}>
//       {mode === 'header' && <HeaderForm />}
//       {mode === 'scanner' && <Scanner />}
//       {mode === 'list' && <List />}
//       {mode === 'browseList' && BrowseList}

//       <SearchablePickerModal
//         visible={picker === 'property'}
//         title="Property"
//         placeholder="Search property name or code..."
//         options={propertyOptions}
//         selectedValue={selectedPrpCode}
//         loading={propertyLoading}
//         onRefresh={async () => {
//           setPropertyLoading(true);
//           try {
//             const authToken = String(
//               (await AsyncStorage.getItem('access_token')) ||
//               (user as any)?.token ||
//               (user as any)?.access_token ||
//               (user as any)?.authToken ||
//               '',
//             );

//             if (!authToken) {
//               throw new Error('Login token not found. Please login again.');
//             }

//             const data = await fetchPropertyData(authToken);
//             const options: SearchablePickerOption[] = Array.isArray(data)
//               ? data
//                 .map((row: any) => ({
//                   value: String(row?.PrpCode ?? ''),
//                   label: String(row?.LngName ?? row?.PrpCode ?? ''),
//                   searchText: `${row?.LngName ?? ''} ${row?.PrpCode ?? ''}`,
//                 }))
//                 .filter((row: SearchablePickerOption) => row.value !== '')
//               : [];
//             setPropertyOptions(options);
//           } catch (error) {
//             AppAlert.alert('Property', apiError(error));
//           } finally {
//             setPropertyLoading(false);
//           }
//         }}
//         onClose={() => setPicker(null)}
//         onSelect={async (option) => {
//           if (selectedPrpCode === String(option.value)) {
//             setPicker(null);
//             return;
//           }

//           setSelectedProperty(option);
//           await AsyncStorage.setItem('selected_prpcode', String(option.value));

//           // Changing property starts a fresh packing header for that property.
//           setSession(null);
//           setLastScan(null);
//           setNotice(null);
//           setSelectedTransactionTypes([]);
//           setTransactionFilterRestored(true);
//           setConnectionBlocked(false);
//           setMode('header');
//           setVoucherNo('');
//           setVoucherSuffix('');
//           setVoucherMonth(monthCode(todayRef.current));
//           setPicker(null);
//         }}
//       />
//       <SearchablePickerModal
//         visible={picker === 'year'}
//         title="Financial Year"
//         placeholder="Search financial year..."
//         options={yearOptions}
//         selectedValue={selectedYearNo}
//         onClose={() => setPicker(null)}
//         onSelect={async (option) => {
//           const nextYear = String(option.label || '');
//           if (!nextYear || nextYear === selectedYear) {
//             setPicker(null);
//             return;
//           }

//           // Do not switch FY while an open packing session is active.
//           if (uid > 0 && isOpen) {
//             AppAlert.alert(
//               'Packing in progress',
//               'Finish or leave the current packing before changing the financial year.',
//             );
//             setPicker(null);
//             return;
//           }

//           setSelectedYear(nextYear);
//           await AsyncStorage.setItem('selectedyear', nextYear);

//           setSession(null);
//           setLastScan(null);
//           setNotice(null);
//           setSelectedTransactionTypes([]);
//           setTransactionFilterRestored(true);
//           setConnectionBlocked(false);
//           setMode('header');
//           setVoucherNo('');
//           setVoucherSuffix('');
//           setVoucherMonth(monthCode(todayRef.current));
//           setPicker(null);
//         }}
//       />

//       <SearchablePickerModal
//         visible={picker === 'department'}
//         title="Department"
//         placeholder="Search name or department code..."
//         options={departmentOptions}
//         selectedValue={departmentCode}
//         loading={departmentLoading}
//         onRefresh={loadDepartments}
//         onClose={() => setPicker(null)}
//         onSelect={(option) => {
//           setDepartmentCode(option.value);
//           setDepartmentName(option.label);
//         }}
//       />

//       <SearchablePickerModal
//         visible={picker === 'packingType'}
//         title="Packing Type"
//         placeholder="Search packing type..."
//         options={packingTypeOptions}
//         selectedValue={packingType}
//         loading={packingTypeLoading}
//         onRefresh={loadPackingTypes}
//         onClose={() => setPicker(null)}
//         onSelect={(option) => {
//           setPackingType(option.value);
//           setPackingTypeName(option.label);
//         }}
//       />

//       <SearchablePickerModal
//         visible={picker === 'checkedBy'}
//         title="Checked By"
//         placeholder="Search employee name or code..."
//         options={checkedByOptions}
//         selectedValue={checkedByCode}
//         loading={checkedByLoading}
//         onRefresh={loadCheckedBy}
//         onClose={() => setPicker(null)}
//         onSelect={(option) => {
//           setCheckedByCode(option.value);
//           setCheckedByName(option.label);
//         }}
//       />

//       <SearchableMultiSelectModal
//         visible={transactionTypePickerOpen}
//         title="Transaction Type"
//         placeholder="Search transaction type..."
//         options={transactionTypeOptions}
//         selectedValues={selectedTransactionTypes}
//         loading={transactionTypeLoading}
//         onRefresh={loadTransactionTypes}
//         onClose={() => setTransactionTypePickerOpen(false)}
//         onApply={async (values) => {
//           const safeValues = Array.from(new Set(values.map(String)));
//           setSelectedTransactionTypes(safeValues);
//           if (uid > 0) {
//             await persistTransactionTypes(uid, safeValues);
//           }
//           setNotice({
//             type: 'info',
//             text: `${safeValues.length} Transaction Type${safeValues.length === 1 ? '' : 's'} selected.`,
//           });
//         }}
//       />


//       {busy && (
//         <Modal transparent visible animationType="fade">
//           <View style={styles.loaderOverlay}>
//             <View style={styles.loaderCard}>
//               <ActivityIndicator size="large" color={T.copper} />
//               <Text style={styles.loaderText}>Please wait…</Text>
//             </View>
//           </View>
//         </Modal>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: T.bg },

//   formContent: { padding: 16, paddingBottom: 36 },
//   tip: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: '#F3E3D3', marginBottom: 12 },
//   tipIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF8F1', alignItems: 'center', justifyContent: 'center' },
//   tipTitle: { color: T.nav, fontSize: 14, fontWeight: '900' },
//   tipText: { color: '#765D49', fontSize: 11, lineHeight: 16, marginTop: 3 },

//   card: { backgroundColor: T.surface, borderRadius: 20, borderWidth: 1, borderColor: T.border, padding: 16, ...S.card },
//   cardEyebrow: { color: T.copper, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
//   cardTitle: { color: T.ink, fontSize: 21, fontWeight: '900', marginTop: 4, marginBottom: 16 },
//   contextRow: { flexDirection: 'row', backgroundColor: T.sub, borderRadius: 13, marginTop: 9, marginBottom: 15, overflow: 'hidden' },
//   contextCell: { flex: 1, paddingHorizontal: 14, paddingVertical: 11, borderRightWidth: 1, borderRightColor: T.border },
//   contextLabel: { color: '#716D68', fontSize: 11, fontWeight: '800', marginTop: 0, marginBottom: 4 },
//   contextValue: { color: T.nav, fontWeight: '900', marginTop: 2 },
//   propertyValueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
//   label: { color: '#716D68', fontSize: 11, fontWeight: '800', marginTop: 11, marginBottom: 7 },
//   input: { height: 48, borderWidth: 1, borderColor: T.border, borderRadius: 13, backgroundColor: '#FCFBF9', color: T.ink, paddingHorizontal: 13, fontWeight: '700' },
//   multiline: { height: 78, paddingTop: 12, textAlignVertical: 'top' },
//   twoCol: { flexDirection: 'row', gap: 10 },
//   propertyPickerField: { minHeight: 70, marginBottom: 0, },
//   pickerField: { minHeight: 52, borderWidth: 1, borderColor: T.border, borderRadius: 14, backgroundColor: '#FCFBF9', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10, },
//   pickerLeading: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#F3E3D3', alignItems: 'center', justifyContent: 'center' },
//   pickerValue: { color: T.ink, fontSize: 13, fontWeight: '800' },
//   pickerPlaceholder: { color: T.muted, fontWeight: '700' },
//   pickerCode: { color: T.muted, fontSize: 9, fontWeight: '800', marginTop: 2 },
//   multiCountBadge: {
//     minWidth: 28,
//     height: 28,
//     borderRadius: 10,
//     paddingHorizontal: 7,
//     backgroundColor: T.copper,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   multiCountText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
//   voucherRow: { flexDirection: 'row', gap: 9 },
//   voucherBox: { flex: 1, height: 48, borderWidth: 1, borderColor: T.border, borderRadius: 13, backgroundColor: T.sub, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
//   voucherMonth: { color: T.copper, fontSize: 16, fontWeight: '900' },
//   voucherSlash: { color: T.muted, fontSize: 16, marginHorizontal: 5 },
//   voucherNo: { color: T.nav, fontSize: 16, fontWeight: '900' },
//   squareButton: { width: 46, height: 46, borderRadius: 13, borderWidth: 1, borderColor: T.border, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
//   segment: { height: 47, flexDirection: 'row', borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: T.border, backgroundColor: T.sub },
//   segmentButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
//   segmentActive: { backgroundColor: T.nav },
//   segmentText: { color: '#77716C', fontSize: 12, fontWeight: '800' },
//   segmentTextActive: { color: '#FFF' },
//   checkboxRow: {
//     minHeight: 52,
//     borderWidth: 1,
//     borderColor: T.border,
//     borderRadius: 14,
//     backgroundColor: '#FCFBF9',
//     paddingHorizontal: 13,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//   },
//   checkbox: {
//     width: 24,
//     height: 24,
//     borderRadius: 7,
//     borderWidth: 1.5,
//     borderColor: T.border,
//     backgroundColor: '#FFF',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   checkboxChecked: {
//     backgroundColor: T.nav,
//     borderColor: T.nav,
//   },
//   checkboxText: {
//     color: T.ink,
//     fontSize: 13,
//     fontWeight: '800',
//   },

//   primary: { height: 54, marginTop: 14, borderRadius: 16, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
//   primaryText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
//   disabled: { opacity: .45 },

//   // scannerContent: { flex: 1, padding: 14 },
//   cameraWrap: { height: 330, borderRadius: 22, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
//   camera: { width: '100%', height: '100%' },
//   scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
//   scanFrame: { width: '74%', aspectRatio: 1.28, position: 'relative' },
//   corner: { position: 'absolute', width: 38, height: 38, borderColor: T.copper },
//   tl: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 10 },
//   tr: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 10 },
//   bl: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 10 },
//   br: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 10 },
//   guidePill: { marginTop: 28, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(8,18,27,.8)', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
//   guideDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: '#45C979' },
//   guideText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
//   torchButton: { position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(8,18,27,.74)', alignItems: 'center', justifyContent: 'center' },
//   scanBusy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,18,27,.6)', alignItems: 'center', justifyContent: 'center', gap: 8 },
//   scanBusyText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
//   cameraPaused: { width: '100%', height: '100%', backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center', },
//   cameraPausedText: { color: '#FFF', fontWeight: '800', marginTop: 8 },
//   cameraStartingLight: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, backgroundColor: 'rgba(7,17,26,0.72)', alignItems: 'center', justifyContent: 'center', },
//   cameraStartingTitle: { color: '#FFF', fontSize: 11, fontWeight: '900', marginTop: 5, },
//   scannerScroll: { flex: 1 },
//   scannerContent: { padding: 14, paddingBottom: 118 },
//   scanLauncherCard: { minHeight: 238, borderRadius: 22, borderWidth: 1, borderColor: T.border, backgroundColor: '#FFF', paddingHorizontal: 24, paddingVertical: 22, alignItems: 'center', justifyContent: 'center', },
//   scanLauncherIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#F3E3D3', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
//   scanLauncherEyebrow: { color: T.copper, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
//   scanLauncherTitle: { color: T.nav, fontSize: 22, fontWeight: '900', marginTop: 3 },
//   scanLauncherText: { color: T.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7, marginBottom: 17, maxWidth: 320 },
//   startScanButton: { minWidth: 205, height: 50, borderRadius: 15, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
//   startScanButtonText: {
//     color: '#FFF',
//     fontSize: 13,
//     fontWeight: '900',
//   },


//   cameraOnlyRoot: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   cameraOnlyTopBar: {
//     minHeight: 74,
//     backgroundColor: T.nav,
//     paddingHorizontal: 14,
//     paddingTop: Platform.OS === 'android' ? 12 : 16,
//     paddingBottom: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//   },
//   cameraOnlyClose: {
//     minHeight: 44,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: '#2A4055',
//     paddingHorizontal: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 5,
//   },
//   cameraOnlyCloseText: {
//     color: '#FFF',
//     fontSize: 10,
//     fontWeight: '900',
//   },
//   cameraOnlyTitleWrap: {
//     flex: 1,
//     alignItems: 'center',
//   },
//   cameraOnlyEyebrow: {
//     color: '#AAB6C2',
//     fontSize: 8,
//     fontWeight: '900',
//     letterSpacing: 1.4,
//   },
//   cameraOnlyTitle: {
//     color: '#FFF',
//     fontSize: 18,
//     fontWeight: '900',
//     marginTop: 2,
//   },
//   cameraOnlyTorch: {
//     width: 44,
//     height: 44,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: '#2A4055',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },

//   // Deliberately no absolute positioning, Modal, ScrollView, borderRadius,
//   // overflow:hidden, overlay, or child layered above CameraView.
//   cameraOnlyPreview: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   cameraOnlyCamera: {
//     flex: 1,
//   },
//   cameraOnlyPermission: {
//     flex: 1,
//     backgroundColor: '#07111A',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 28,
//   },
//   cameraOnlyPermissionTitle: {
//     color: '#FFF',
//     fontSize: 15,
//     fontWeight: '900',
//     marginTop: 12,
//   },
//   cameraOnlyPermissionButton: {
//     height: 48,
//     marginTop: 16,
//     borderRadius: 14,
//     backgroundColor: T.copper,
//     paddingHorizontal: 22,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   cameraOnlyPermissionButtonText: {
//     color: '#FFF',
//     fontSize: 12,
//     fontWeight: '900',
//   },
//   cameraOnlyFooter: {
//     minHeight: 64,
//     backgroundColor: T.nav,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     paddingHorizontal: 18,
//   },
//   cameraOnlyStatusDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 99,
//     backgroundColor: '#45C979',
//   },
//   cameraOnlyFooterText: {
//     color: '#FFF',
//     fontSize: 11,
//     fontWeight: '800',
//     textAlign: 'center',
//   },

//   summary: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 17, borderWidth: 1, borderColor: T.border, marginTop: 12, paddingVertical: 11 },
//   summaryCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
//   summaryDivider: { width: 1, backgroundColor: T.border },
//   summaryValue: { color: T.nav, fontSize: 16, fontWeight: '900' },
//   summaryLabel: { color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
//   transactionFilterCard: { minHeight: 56, marginTop: 10, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 15, borderWidth: 1, borderColor: T.border, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 10 },
//   transactionFilterMissing: { borderColor: '#F0B9B3', backgroundColor: '#FFF8F7' },
//   transactionFilterIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#F3E3D3', alignItems: 'center', justifyContent: 'center', },
//   transactionFilterLabel: { color: T.copper, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
//   transactionFilterValue: { color: T.nav, fontSize: 11, fontWeight: '800', marginTop: 2 },
//   notice: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10 },
//   noticeText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '800' },
//   retryButton: { minHeight: 46, marginTop: 10, borderRadius: 14, backgroundColor: T.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
//   retryText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
//   lastScan: { marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: '#B9DFC8', backgroundColor: '#FFF', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
//   lastScanCheck: { width: 34, height: 34, borderRadius: 11, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
//   lastLabel: { color: T.green, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
//   lastTaka: { color: T.ink, fontSize: 14, fontWeight: '900', marginTop: 2 },
//   lastMeta: { color: T.muted, fontSize: 10, marginTop: 2 },
//   committed: { color: T.green, fontSize: 8, fontWeight: '900', letterSpacing: .6 },
//   actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
//   secondary: { flex: 1, height: 49, borderRadius: 15, borderWidth: 1, borderColor: T.border, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
//   secondaryText: { color: T.nav, fontSize: 12, fontWeight: '900' },
//   finish: { flex: 1.3, height: 49, borderRadius: 15, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
//   finishText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
//   cancelPackingButton: { flex: 1, width: '100%', height: 54, borderRadius: 16, borderWidth: 1.5, borderColor: '#E5AAA5', backgroundColor: '#FFF7F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
//   cancelPackingText: { color: T.red, fontSize: 13, fontWeight: '900' },
//   center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
//   cameraPermissionIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: '#F3E3D3', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
//   permissionTitle: { color: T.nav, fontSize: 18, fontWeight: '900' },
//   permissionText: { color: T.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, marginBottom: 16 },
//   permissionButton: { height: 47, borderRadius: 14, backgroundColor: T.nav, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
//   permissionButtonText: { color: '#FFF', fontWeight: '900' },
//   listScreen: { flex: 1, padding: 14 },
//   listHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
//   listTitle: { color: T.ink, fontSize: 20, fontWeight: '900', marginTop: 2 },
//   listContent: { paddingTop: 10, paddingBottom: 110 },
//   scanRow: { backgroundColor: '#FFF', borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 12, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
//   scanRowIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#F3E3D3', alignItems: 'center', justifyContent: 'center' },
//   scanRowTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
//   scanRowTaka: { flex: 1, color: T.ink, fontSize: 13, fontWeight: '900' },
//   savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
//   savedBadgeText: { color: T.green, fontSize: 9, fontWeight: '900' },
//   scanRowMeta: { color: T.nav, fontSize: 11, fontWeight: '800', marginTop: 4 },
//   scanRowSub: { color: T.muted, fontSize: 10, marginTop: 3 },
//   removeButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FCECEA', alignItems: 'center', justifyContent: 'center' },
//   empty: { alignItems: 'center', paddingTop: 55 },
//   emptyText: { color: T.muted, fontWeight: '700', marginTop: 8 },
//   bottomBar: { position: 'absolute', left: 14, right: 14, bottom: 12, paddingTop: 8, backgroundColor: T.bg, flexDirection: 'row', gap: 9 },
//   completedBar: { position: 'absolute', left: 14, right: 14, bottom: 12, padding: 12, borderRadius: 16, backgroundColor: '#E8F5ED', borderWidth: 1, borderColor: '#B9DFC8', flexDirection: 'row', alignItems: 'center', gap: 10 },
//   completedIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
//   completedTitle: { color: T.green, fontSize: 12, fontWeight: '900' },
//   completedText: { color: '#557A66', fontSize: 10, marginTop: 2 },
//   loaderOverlay: { flex: 1, backgroundColor: 'rgba(8,18,27,.35)', alignItems: 'center', justifyContent: 'center' },
//   loaderCard: { width: 132, height: 110, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', gap: 10 },
//   loaderText: { color: T.nav, fontSize: 11, fontWeight: '800' },
//   browseScreen: { flex: 1, backgroundColor: T.bg, padding: 14 },
//   browseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
//   browseTitle: { color: T.ink, fontSize: 20, fontWeight: '900', marginTop: 3 },
//   browseSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: T.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10, minHeight: 56 },
//   browseSummaryText: { color: T.muted, fontSize: 10, fontWeight: '800' },
//   browseListContent: { paddingBottom: 24 },
//   browseCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 13, marginBottom: 10 },
//   browseCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
//   browseVoucher: { color: T.copper, fontSize: 15, fontWeight: '900' },
//   browseDate: { color: T.ink, fontSize: 11, fontWeight: '800' },
//   browseCardDivider: { height: 1, backgroundColor: T.border, marginVertical: 10 },
//   browseCardInfo: { flexDirection: 'row', gap: 12 },
//   browseCardCell: { flex: 1, minWidth: 0 },
//   browseLabel: { color: T.muted, fontSize: 8, fontWeight: '900', marginBottom: 3 },
//   browseValue: { color: T.ink, fontSize: 11, fontWeight: '800' },
//   browseCardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 11 },
//   browseRemarks: { color: T.ink, fontSize: 10.5, fontWeight: '700', lineHeight: 15 },
//   browseRow: { backgroundColor: '#FFF', borderWidth: 1, borderColor: T.border, borderRadius: 15, padding: 13, marginBottom: 9 },
//   browseRowMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
//   browseRowInfo: { flexDirection: 'row', gap: 12, marginTop: 11 },
//   browseCell: { flex: 1 },
//   browseRowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
//   browseMeta: { color: T.muted, fontSize: 9, fontWeight: '700' },
//   browseStatus: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: '#E8F5ED' },
//   browseTransferMessage: { color: T.muted, fontSize: 9, fontWeight: '600', marginTop: 8, lineHeight: 13 },
//   browseLoader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
//   browseLoaderText: { color: T.muted, fontSize: 11, fontWeight: '700' },
//   browseEmpty: { alignItems: 'center', justifyContent: 'center', paddingTop: 70 },
//   browseListButton: { height: 50, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: T.border, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, },
//   browseListText: { color: T.nav, fontSize: 13, fontWeight: '900', minWidth: 72, textAlign: 'center' },
//   browseCountWrap: { minWidth: 92, marginRight: 8 },
//   browseSearchBox: { flex: 1, height: 38, borderRadius: 11, borderWidth: 1, borderColor: T.border, backgroundColor: T.bg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 6 },
//   browseSearchInput: { flex: 1, minWidth: 0, paddingVertical: 0, paddingHorizontal: 0, color: T.ink, fontSize: 11, fontWeight: '700' },

// });

import AppAlert from '@/common/utils/appAlert';
// FILE: src/screens/greyPacking/GreyPackingScannerScreen.tsx
// Sudamo Textile ERP - Grey Packing mobile live scanner.
// Header once -> scan continuously -> every green scan is SQL committed -> finish.
// Existing Web Grey Packing remains untouched.

import AsyncStorage from '@/common/utils/compatibleStorage';
import { GreyPackingAPI } from '@/src/api/legacyClient';
import { fetchPropertyData } from '@/src/api/legacyFunctions';
import SearchableMultiSelectModal, {
  SearchableMultiSelectOption,
} from '@/src/components/ui/SearchableMultiSelectModal';
import SearchablePickerModal, {
  SearchablePickerOption,
} from '@/src/components/ui/SearchablePickerModal';
import { useBusinessContext } from '@/src/core/business';
import { usePermission } from '@/src/core/permissions';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useIsFocused } from '@react-navigation/native';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

type MainRow = {
  UId?: number | string;
  VouNo?: string;
  VouDate?: string | number;
  PackType?: string;
  PackBy?: string;
  ChkCode?: string;
  Remarks?: string;
  Status?: number | string;
  DptCode?: string;
  StkType?: string;
};

type D1Row = {
  UId?: number | string;
  SrNo?: number | string;
  ItmCode?: number | string;
  DsnCode?: number | string;
  LotNo?: string;
  TotPcs?: number | string;
  TotQty?: number | string;
  ShdCode?: number | string;
};

type D2Row = {
  UId?: number | string;
  SrNo?: number | string;
  SubSr?: number | string;
  TakaNo?: string;
  Qty?: number | string;
  KWt?: number | string;
  CutUId?: number | string;
  CutSrNo?: number | string;
  CutSubSr?: number | string;
  TranType?: number | string;
  TrackId?: number | string;
};

type SessionSummary = {
  total_taka?: number;
  total_qty?: number | string;
  total_kgs?: number | string;
  is_open?: boolean;
};

type SessionData = {
  main?: MainRow[];
  d1?: D1Row[];
  d2?: D2Row[];
  summary?: SessionSummary;
  open_session?: boolean;
};

type ScanRow = D2Row & {
  ItmCode?: number | string;
  ItmName?: string;
  DsnCode?: number | string;
  DsnName?: string;
  ShdCode?: number | string;
  ShdName?: string;
  LotNo?: string;
  TType?: string;
  InwNo?: string;
};

const TXN_TYPE = 'grey_packing_barcode';
const TXN_FILTER_KEY_PREFIX = 'grey_packing_transaction_types_v1';

const n = (v: unknown) => {
  const x = Number(String(v ?? '0').replace(/,/g, ''));
  return Number.isFinite(x) ? x : 0;
};

const f3 = (v: unknown) =>
  n(v).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const pad2 = (v: number) => String(v).padStart(2, '0');
const displayDate = (d: Date) =>
  `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
const monthCode = (d: Date) => pad2(d.getMonth() + 1);

const unwrap = (response: any): { success: boolean; message: string; data: any } => {
  const body = response?.data ?? response ?? {};
  return {
    success: body?.success === true,
    message: body?.message ?? body?.response?.message ?? 'Unexpected server response.',
    data: body?.response ?? body?.data ?? {},
  };
};

const apiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  'Unable to reach server.';

const isNetworkLikeError = (error: any) => {
  // Only Axios transport failures may block Grey Packing.
  // A Laravel validation failure converted to `new Error(...)` has no
  // `response`, but that does NOT mean the device is offline.
  if (error?.isAxiosError !== true) {
    return false;
  }

  const code = String(error?.code ?? '').toUpperCase();
  const message = String(error?.message ?? '').toLowerCase();

  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    (!error?.response &&
      (message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('internet')))
  );
};

export default function GreyPackingScannerScreen() {
  const { yearNo, prpCode: contextPrpCode,
    // strCode,
    isReady } = useBusinessContext();
  const user = useAppSessionStore((s) => s.user);
  const { canDo } = usePermission();

  const canStart = canDo('grey_packing', 'add');
  const canScan = canDo('grey_packing', 'scan');
  const canRemove = canDo('grey_packing', 'remove_scan');
  const canComplete = canDo('grey_packing', 'complete');

  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const { height: windowHeight } = useWindowDimensions();

  const todayRef = useRef(new Date());
  const appStateRef = useRef(AppState.currentState);
  const scanLock = useRef(false);
  const lastQrRef = useRef('');
  const lastQrAtRef = useRef(0);

  const [mode, setMode] = useState<'header' | 'scanner' | 'list' | 'browseList'>('header');

  // Property can be changed directly from the Grey Packing header.
  const [propertyOptions, setPropertyOptions] = useState<SearchablePickerOption[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<SearchablePickerOption | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const selectedPrpCode = String(selectedProperty?.value || contextPrpCode || '');

  // Financial year is selectable on the Grey Packing header, just like Sales Order.
  // The API continues to receive the 2-digit closing year (e.g. 27 for 2026-2027).
  const [yearOptions, setYearOptions] = useState<SearchablePickerOption[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const selectedYearNo = selectedYear ? selectedYear.slice(-2) : String(yearNo || '');

  const [session, setSession] = useState<SessionData | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [connectionBlocked, setConnectionBlocked] = useState(false);
  const [appActive, setAppActive] = useState(true);
  // When true, the component renders ONLY a plain camera screen.
  // This keeps Android CameraView out of ScrollView, Modal, rounded clipping,
  // and overlapping ERP surfaces.
  const [cameraScreenVisible, setCameraScreenVisible] = useState(false);

  const [voucherNo, setVoucherNo] = useState('');
  const [voucherMonth, setVoucherMonth] = useState(monthCode(todayRef.current));
  const [voucherSuffix, setVoucherSuffix] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);

  // Default header values for Add.
  // These remain editable through the existing pickers/controls.
  const [departmentCode, setDepartmentCode] = useState('SL');
  const [packingType, setPackingType] = useState('R');
  const [checkedByCode, setCheckedByCode] = useState('2');
  const [stockType, setStockType] = useState<'I' | 'P'>('I');
  const [cutting, setCutting] = useState(true);
  const [packBy, setPackBy] = useState(
    String(user?.first_name || user?.name || user?.username || ''),
  );
  const [remarks, setRemarks] = useState('');

  const [departmentName, setDepartmentName] = useState('Sales');
  const [packingTypeName, setPackingTypeName] = useState('Roll Packing');
  const [checkedByName, setCheckedByName] = useState('Mahesh bhai');

  const [departmentOptions, setDepartmentOptions] = useState<SearchablePickerOption[]>([]);
  const [packingTypeOptions, setPackingTypeOptions] = useState<SearchablePickerOption[]>([]);
  const [checkedByOptions, setCheckedByOptions] = useState<SearchablePickerOption[]>([]);

  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [packingTypeLoading, setPackingTypeLoading] = useState(false);
  const [checkedByLoading, setCheckedByLoading] = useState(false);

  const [picker, setPicker] = useState<
    'property' | 'year' | 'department' | 'packingType' | 'checkedBy' | null
  >(null);

  const [transactionTypeOptions, setTransactionTypeOptions] = useState<SearchableMultiSelectOption[]>([]);
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<string[]>(['64']);
  const [transactionTypeLoading, setTransactionTypeLoading] = useState(false);
  const [transactionTypePickerOpen, setTransactionTypePickerOpen] = useState(false);
  const [transactionFilterRestored, setTransactionFilterRestored] = useState(false);

  const [AllPackingDataList, setPackingDataList] = useState<any[]>([]);
  const [browseListLoading, setBrowseListLoading] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');

  const [lastScan, setLastScan] = useState<ScanRow | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error' | 'info'; text: string } | null>(null);

  const strCode = '012'
  // console.log("stcode",strCode);

  const main = session?.main?.[0];
  const uid = n(main?.UId);
  const summary = session?.summary ?? {};
  const isOpen = uid > 0 && summary?.is_open === true;

  const d1Map = useMemo(() => {
    const map = new Map<number, D1Row>();
    (session?.d1 ?? []).forEach((row) => map.set(n(row.SrNo), row));
    return map;
  }, [session?.d1]);

  const rows: ScanRow[] = useMemo(
    () =>
      [...(session?.d2 ?? [])]
        .sort((a, b) => n(b.SrNo) - n(a.SrNo) || n(b.SubSr) - n(a.SubSr))
        .map((row) => {
          const d1 = d1Map.get(n(row.SrNo));
          return {
            ...row,
            ItmCode: d1?.ItmCode,
            DsnCode: d1?.DsnCode,
            ShdCode: d1?.ShdCode,
            LotNo: d1?.LotNo,
          };
        }),
    [session?.d2, d1Map],
  );



  const selectedTransactionTypeNames = useMemo(() => {
    const map = new Map(transactionTypeOptions.map((x) => [String(x.value), x.label]));
    return selectedTransactionTypes.map((code) => map.get(String(code)) || String(code));
  }, [transactionTypeOptions, selectedTransactionTypes]);

  useEffect(() => {
    let cancelled = false;

    const loadProperties = async () => {
      setPropertyLoading(true);
      try {
        const storedCode = await AsyncStorage.getItem('selected_prpcode');
        // The app stores the login token in AsyncStorage as `access_token`.
        // AppSessionStore.user does not reliably contain the token, so use the
        // same token source used by the other mobile routes.
        const authToken = String(
          (await AsyncStorage.getItem('access_token')) ||
          (user as any)?.token ||
          (user as any)?.access_token ||
          (user as any)?.authToken ||
          '',
        );

        if (!authToken) {
          throw new Error('Login token not found. Please login again.');
        }

        const data = await fetchPropertyData(authToken);
        const options: SearchablePickerOption[] = Array.isArray(data)
          ? data
            .map((row: any) => ({
              value: String(row?.PrpCode ?? ''),
              label: String(row?.LngName ?? row?.PrpCode ?? ''),
              searchText: `${row?.LngName ?? ''} ${row?.PrpCode ?? ''}`,
            }))
            .filter((row: SearchablePickerOption) => row.value !== '')
          : [];

        if (cancelled) return;
        setPropertyOptions(options);

        const preferredCode = String(storedCode || contextPrpCode || '');
        const selected = options.find((x) => x.value === preferredCode);
        if (selected) {
          setSelectedProperty(selected);
        } else if (!selectedProperty && contextPrpCode) {
          setSelectedProperty({
            value: String(contextPrpCode),
            label: String(contextPrpCode),
            searchText: String(contextPrpCode),
          });
        }
      } catch {
        if (!cancelled && !selectedProperty && contextPrpCode) {
          setSelectedProperty({
            value: String(contextPrpCode),
            label: String(contextPrpCode),
            searchText: String(contextPrpCode),
          });
        }
      } finally {
        if (!cancelled) setPropertyLoading(false);
      }
    };

    void loadProperties();
    return () => { cancelled = true; };
  }, [isReady, contextPrpCode, user]);

  // Build the same 5 financial-year options used by Sales Order.
  // Example: 2026-2027 -> API YearNo 27.
  useEffect(() => {
    let cancelled = false;

    const loadYearOptions = async () => {
      const currentYear = new Date().getFullYear();
      const options: SearchablePickerOption[] = Array.from({ length: 5 }, (_, index) => {
        const start = currentYear - index;
        const end = start + 1;
        const label = `${start}-${end}`;
        return {
          value: String(end).slice(-2),
          label,
          searchText: label,
        };
      });

      if (cancelled) return;
      setYearOptions(options);

      const savedYear = await AsyncStorage.getItem('selectedyear');
      const contextYear = String(yearNo || '');
      const matched =
        options.find((option) => option.label === savedYear) ||
        options.find((option) => option.value === contextYear) ||
        options[0];

      if (!cancelled) setSelectedYear(matched?.label || '');
    };

    void loadYearOptions();
    return () => {
      cancelled = true;
    };
  }, [yearNo]);

  const transactionFilterKey = useCallback(
    (targetUid: number) =>
      `${TXN_FILTER_KEY_PREFIX}:${String(selectedPrpCode)}:${String(selectedYearNo)}:${String(targetUid)}`,
    [selectedPrpCode, selectedYearNo],
  );

  const persistTransactionTypes = useCallback(
    async (targetUid: number, values: string[]) => {
      if (targetUid <= 0) return;
      await AsyncStorage.setItem(
        transactionFilterKey(targetUid),
        JSON.stringify(values.map(String)),
      );
    },
    [transactionFilterKey],
  );

  const restoreTransactionTypes = useCallback(
    async (targetUid: number) => {
      if (targetUid <= 0) {
        setTransactionFilterRestored(true);
        return [];
      }
      try {
        const raw = await AsyncStorage.getItem(transactionFilterKey(targetUid));
        const values = raw ? JSON.parse(raw) : [];
        const safe = Array.isArray(values) ? values.map(String).filter(Boolean) : [];
        setSelectedTransactionTypes(safe);
        setTransactionFilterRestored(true);
        return safe;
      } catch {
        setSelectedTransactionTypes([]);
        setTransactionFilterRestored(true);
        return [];
      }
    },
    [transactionFilterKey],
  );

  const webResponseData = (response: any) => {
    const raw = response?.data;

    // PackingList API can return either:
    // 1) { data: [...] }
    // 2) { data: { response: { data: [...] } } }
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.response?.data)) return raw.response.data;
    if (Array.isArray(response?.response?.data)) return response.response.data;

    return [];
  };

  const loadDepartments = useCallback(async () => {
    if (!isReady) return;
    setDepartmentLoading(true);
    try {
      const response = await GreyPackingAPI.departments({
        prpcode: selectedPrpCode,
        yearno: selectedYearNo,
        strcode: strCode,
        txntype: TXN_TYPE,
      });
      const data = webResponseData(response);
      const options: SearchablePickerOption[] = Array.isArray(data)
        ? data.map((row: any) => ({
          value: String(row?.DptCode ?? ''),
          label: String(row?.LngName ?? row?.DptCode ?? ''),
          searchText: String(row?.DptCode ?? ''),
        }))
        : [];
      setDepartmentOptions(options);
      if (departmentCode) {
        const selected = options.find((x) => x.value === String(departmentCode));
        if (selected) setDepartmentName(selected.label);
      }
    } catch (error) {
      AppAlert.alert('Department', apiError(error));
    } finally {
      setDepartmentLoading(false);
    }
  }, [isReady, selectedPrpCode, selectedYearNo, strCode, departmentCode, departmentName]);

  const loadPackingTypes = useCallback(async () => {
    if (!isReady) return;
    setPackingTypeLoading(true);
    try {
      const response = await GreyPackingAPI.packingTypes({
        prpcode: selectedPrpCode,
        yearno: selectedYearNo,
        strcode: strCode,
        search: '',
        txntype: TXN_TYPE,
      });
      const data = webResponseData(response);
      const options: SearchablePickerOption[] = Array.isArray(data)
        ? data.map((row: any) => ({
          value: String(row?.PackType ?? ''),
          label: String(row?.PackTypeName ?? row?.PackType ?? ''),
          searchText: String(row?.PackType ?? ''),
        }))
        : [];
      setPackingTypeOptions(options);
      if (packingType) {
        const selected = options.find((x) => x.value === String(packingType));
        if (selected) setPackingTypeName(selected.label);
      }
    } catch (error) {
      AppAlert.alert('Packing Type', apiError(error));
    } finally {
      setPackingTypeLoading(false);
    }
  }, [isReady, selectedPrpCode, selectedYearNo, strCode, packingType, packingTypeName]);

  const loadCheckedBy = useCallback(async () => {
    if (!isReady) return;
    setCheckedByLoading(true);
    try {
      const response = await GreyPackingAPI.checkedBy({
        prpcode: selectedPrpCode,
        yearno: selectedYearNo,
        employeecode: '',
        txntype: TXN_TYPE,
      });
      const data = webResponseData(response);
      const options: SearchablePickerOption[] = Array.isArray(data)
        ? data.map((row: any) => ({
          value: String(row?.ChkCode ?? ''),
          label: String(row?.ChkName ?? row?.ChkCode ?? ''),
          searchText: `${row?.ChkCode ?? ''} ${row?.ChkName ?? ''}`,
        }))
        : [];
      setCheckedByOptions(options);

      // Add default: Checked By code 2.
      // The user can still change it from the existing picker.
      if (checkedByCode === '2') {
        const selected = options.find((x) => x.value === '2');
        if (selected) {
          setCheckedByName(selected.label);
        }
      } else if (checkedByCode && !checkedByName) {
        setCheckedByName(
          options.find((x) => x.value === String(checkedByCode))?.label ?? '',
        );
      }
    } catch (error) {
      AppAlert.alert('Checked By', apiError(error));
    } finally {
      setCheckedByLoading(false);
    }
  }, [
    isReady,
    selectedPrpCode,
    selectedYearNo,
    checkedByCode,
    checkedByName,
    user?.username,
    user?.name,
    user?.first_name,
  ]);


  const loadTransactionTypes = useCallback(async () => {
    if (!isReady) return;
    setTransactionTypeLoading(true);
    try {
      const response = await GreyPackingAPI.transactionTypes({
        prpcode: selectedPrpCode,
        yearno: selectedYearNo,
        strcode: strCode,
        fetch: 'rpttxntype',
        txntype: TXN_TYPE,
      });
      const data = webResponseData(response);
      const options: SearchableMultiSelectOption[] = Array.isArray(data)
        ? data.map((row: any) => ({
          value: String(row?.code ?? ''),
          label: String(row?.name ?? row?.code ?? ''),
          searchText: `${row?.name ?? ''} ${row?.code ?? ''}`,
        })).filter((row: SearchableMultiSelectOption) => row.value !== '')
        : [];
      setTransactionTypeOptions(options);
    } catch (error) {
      AppAlert.alert('Transaction Type', apiError(error));
    } finally {
      setTransactionTypeLoading(false);
    }
  }, [isReady, selectedPrpCode, selectedYearNo, strCode]);

  const loadHeaderMasters = useCallback(async () => {
    await Promise.all([loadDepartments(), loadPackingTypes(), loadCheckedBy(), loadTransactionTypes()]);
  }, [loadDepartments, loadPackingTypes, loadCheckedBy, loadTransactionTypes]);

  const applySession = useCallback((data: SessionData) => {
    if (data?.open_session === false) {
      setSession(null);
      setMode('header');
      return;
    }

    setSession(data);
    const loadedMain = data?.main?.[0];
    if (loadedMain && data?.summary?.is_open) {
      const loadedDptCode = String(loadedMain.DptCode ?? '');
      const loadedPackType = String(loadedMain.PackType ?? '');
      const loadedChkCode = String(loadedMain.ChkCode ?? '');

      setDepartmentCode(loadedDptCode);
      setPackingType(loadedPackType);
      setCheckedByCode(loadedChkCode);

      setDepartmentName(departmentOptions.find((x) => x.value === loadedDptCode)?.label ?? '');
      setPackingTypeName(packingTypeOptions.find((x) => x.value === loadedPackType)?.label ?? '');
      setCheckedByName(checkedByOptions.find((x) => x.value === loadedChkCode)?.label ?? '');
      setStockType(String(loadedMain.StkType ?? '') === 'P' ? 'P' : 'I');
      setCutting(
        String((loadedMain as any).Cutting ?? '').toLowerCase() === 'true' ||
        String((loadedMain as any).Cutting ?? '') === '1' ||
        String((loadedMain as any).Cutting ?? '').toUpperCase() === 'Y'
      );
      setPackBy(String(loadedMain.PackBy ?? ''));
      setRemarks(String(loadedMain.Remarks ?? ''));
      setMode('scanner');
    }
  }, [departmentOptions, packingTypeOptions, checkedByOptions]);

  const loadSession = useCallback(
    async (targetUid = 0, silent = false) => {
      if (!isReady) return null;
      if (!silent) setBusy(true);
      try {
        const response = await GreyPackingAPI.getSession({
          prpcode: selectedPrpCode,
          yearno: selectedYearNo,
          uid: targetUid,
        });
        const result = unwrap(response);
        if (!result.success) throw new Error(result.message);
        setConnectionBlocked(false);
        const sessionData = result.data as SessionData;
        applySession(sessionData);

        const loadedUid = n(sessionData?.main?.[0]?.UId);
        if (loadedUid > 0) {
          await restoreTransactionTypes(loadedUid);
        } else {
          setTransactionFilterRestored(true);
        }

        return sessionData;
      } catch (error) {
        if (isNetworkLikeError(error)) setConnectionBlocked(true);
        if (!silent) AppAlert.alert('Grey Packing', apiError(error));
        return null;
      } finally {
        if (!silent) setBusy(false);
      }
    },
    [applySession, isReady, selectedPrpCode, selectedYearNo, restoreTransactionTypes],
  );

  const loadVoucherNo = useCallback(async () => {
    if (!isReady || uid > 0) return;
    setVoucherLoading(true);
    try {
      const response = await GreyPackingAPI.voucherNo({
        prpcode: selectedPrpCode,
        yearno: selectedYearNo,
        strcode: '',
        acccode: '',
        vouno: voucherNo || 0,
        suffix: voucherSuffix || '',
        month: voucherMonth,
        uid: 0,
        date: displayDate(todayRef.current),
        module: 'GRYPacking',
        module_no_key: 'VouNo',
        txntype: TXN_TYPE,
        outtype: 'I',
      });

      const body = response?.data?.response ?? {};
      if (String(body?.validate) !== 'true') {
        throw new Error(body?.message || 'Unable to generate voucher number.');
      }

      setVoucherNo(String(body?.VouNo ?? ''));
      setVoucherSuffix(String(body?.suffix ?? ''));
      setVoucherMonth(String(body?.month ?? voucherMonth));
      setConnectionBlocked(false);
    } catch (error) {
      if (isNetworkLikeError(error)) setConnectionBlocked(true);
      setNotice({ type: 'error', text: apiError(error) });
    } finally {
      setVoucherLoading(false);
    }
  }, [isReady, selectedPrpCode, selectedYearNo, uid, voucherNo, voucherSuffix, voucherMonth]);

  useEffect(() => {
    if (!isReady) return;
    void loadSession(0, true);
  }, [isReady, loadSession]);

  useEffect(() => {
    if (!isReady) return;
    void loadHeaderMasters();
  }, [isReady, loadHeaderMasters]);

  useEffect(() => {
    if (isReady && uid <= 0 && !voucherNo) void loadVoucherNo();
  }, [isReady, uid, voucherNo, loadVoucherNo]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      const returning =
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
        next === 'active';

      appStateRef.current = next;
      setAppActive(next === 'active');

      if (next !== 'active') {
        scanLock.current = true;
        setCameraScreenVisible(false);
        return;
      }

      if (returning) {
        if (uid > 0) {
          setNotice({ type: 'info', text: 'Refreshing packing after interruption…' });
          await loadSession(uid, true);
        }

        // CameraView is conditionally mounted by appActive + route focus.
        // Returning to active remounts the native camera naturally.
        setCameraScreenVisible(false);
        scanLock.current = false;
        setNotice(null);
      }
    });
    return () => sub.remove();
  }, [uid, loadSession]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mode === 'list' && isOpen) {
        setMode('scanner');
        return true;
      }
      if (!isOpen) return false;

      AppAlert.alert(
        'Leave Grey Packing?',
        `${n(summary.total_taka)} Taka are already saved. You can safely resume this packing later.`,
        [
          { text: 'Continue Scanning', style: 'cancel' },
          { text: 'Leave & Resume Later', onPress: () => router.back() },
        ],
      );
      return true;
    });
    return () => sub.remove();
  }, [mode, isOpen, summary.total_taka]);

  const startSession = async () => {
    if (!canStart) {
      AppAlert.alert('Access denied', 'You do not have Add permission for Grey Packing.');
      return;
    }
    if (!isReady) {
      AppAlert.alert('Business context missing', 'Property, financial year and store are required.');
      return;
    }
    if (!voucherNo || !voucherMonth) {
      AppAlert.alert('Voucher No', 'Valid voucher number is required.');
      return;
    }
    if (!departmentCode.trim()) {
      AppAlert.alert('Department', 'Department is required.');
      return;
    }
    if (!packingType.trim()) {
      AppAlert.alert('Packing Type', 'Packing Type is required.');
      return;
    }
    if (!checkedByCode.trim()) {
      AppAlert.alert('Checked By', 'Checked By is required.');
      return;
    }
    if (selectedTransactionTypes.length === 0) {
      AppAlert.alert('Transaction Type', 'Select at least one Transaction Type.');
      return;
    }

    // If this is a resumed open session, header is already committed.
    // Only persist the scan filter and return to scanner.
    if (uid > 0 && isOpen) {
      await persistTransactionTypes(uid, selectedTransactionTypes);
      setMode('scanner');
      return;
    }

    setBusy(true);
    try {
      const response = await GreyPackingAPI.startSession({
        main: [
          {
            PrpCode: selectedPrpCode,
            YearNo: selectedYearNo,
            StrCode: strCode,
            VouNo: voucherNo,
            VouDate: displayDate(todayRef.current),
            month: voucherMonth,
            suffix: voucherSuffix,
            DptCode: departmentCode.trim(),
            PackType: packingType.trim(),
            ChkCode: checkedByCode.trim(),
            Cutting: cutting,
            StkType: stockType,
            PackBy: packBy.trim(),
            Remarks: remarks.trim(),
          },
        ],
      });
      console.log("strCode", strCode);
      const result = unwrap(response);

      console.log("result", result);

      console.log("response", response);

      if (!result.success) throw new Error(result.message);

      setConnectionBlocked(false);
      const createdSession = result.data as SessionData;
      applySession(createdSession);

      const createdUid = n(createdSession?.main?.[0]?.UId);
      if (createdUid > 0) {
        await persistTransactionTypes(createdUid, selectedTransactionTypes);
        setTransactionFilterRestored(true);
      }

      setNotice({ type: 'info', text: result.message || 'Packing session ready.' });

      if (!permission?.granted) await requestPermission();
    } catch (error) {
      if (isNetworkLikeError(error)) setConnectionBlocked(true);
      AppAlert.alert('Unable to Start Packing', apiError(error));
    } finally {
      setBusy(false);
    }
  };

  const startScanner = async () => {
    if (
      !canScan ||
      !isOpen ||
      scanBusy ||
      connectionBlocked ||
      !transactionFilterRestored ||
      selectedTransactionTypes.length === 0
    ) {
      return;
    }

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result?.granted) {
        AppAlert.alert(
          'Camera Permission',
          'Camera access is required to scan Taka/Carton QR codes.',
        );
        return;
      }
    }

    scanLock.current = false;
    setTorch(false);
    setNotice(null);
    setCameraScreenVisible(true);
  };

  const closeScanner = () => {
    scanLock.current = true;
    setTorch(false);
    setCameraScreenVisible(false);

    setTimeout(() => {
      scanLock.current = false;
    }, 250);
  };

  const handleScan = async (result: BarcodeScanningResult) => {
    const qr = String(result?.data ?? '').trim();
    console.log("qr", qr);
    if (
      !qr ||
      !canScan ||
      !isOpen ||
      !appActive ||
      connectionBlocked ||
      !transactionFilterRestored ||
      selectedTransactionTypes.length === 0 ||
      scanBusy ||
      scanLock.current
    ) {
      return;
    }

    const now = Date.now();
    if (lastQrRef.current === qr && now - lastQrAtRef.current < 1500) return;

    scanLock.current = true;
    setCameraScreenVisible(false);
    setScanBusy(true);
    setNotice(null);


    try {
      // const response = await GreyPackingAPI.scanSave({
      //   prpcode: selectedPrpCode,
      //   yearno: selectedYearNo,
      //   strcode: strCode,
      //   uid,
      //   qrcode: qr,
      //   txntype: TXN_TYPE,
      //   ttype: selectedTransactionTypes,
      // });

      const payload = {
        prpcode: selectedPrpCode,
        yearno: selectedYearNo,
        strcode: strCode,
        uid,
        qrcode: qr,
        txntype: TXN_TYPE,
        ttype: selectedTransactionTypes,
      };

      console.log("========== SCAN SAVE PAYLOAD ==========");
      console.log(payload);
      console.log("========================================");

      const response = await GreyPackingAPI.scanSave(payload);

      const result = unwrap(response);
      const data = result.data ?? {};
      console.log("result", result);
      console.log("response", response);
      console.log("data", data);
      if (!result.success) {
        // Server/business validation is not a network failure.
        setConnectionBlocked(false);
        setNotice({
          type: 'error',
          text: result.message || 'Scan rejected by server.',
        });
        return;
      }

      if (data?.session) applySession(data.session as SessionData);
      if (data?.scan) setLastScan(data.scan as ScanRow);

      lastQrRef.current = qr;
      lastQrAtRef.current = Date.now();
      setConnectionBlocked(false);
      setNotice({
        type: 'ok',
        text: data?.idempotent
          ? `Already saved: ${data?.scan?.TakaNo ?? 'Taka'}`
          : `Saved: ${data?.scan?.TakaNo ?? 'Taka'} • ${f3(data?.scan?.Qty)} Mtr`,
      });
    } catch (error) {
      if (isNetworkLikeError(error)) {
        // Do not accept another QR until the authoritative session is reloaded.
        setConnectionBlocked(true);
        setNotice({
          type: 'error',
          text: 'Connection lost or response uncertain. Scanning is paused until server status is refreshed.',
        });
      } else {
        setNotice({ type: 'error', text: apiError(error) });
      }
    } finally {
      setScanBusy(false);
      scanLock.current = false;
      setCameraScreenVisible(false);
    }
  };

  const retryConnection = async () => {
    setBusy(true);
    const loaded = await loadSession(uid || 0, true);
    setBusy(false);
    if (loaded) {
      setConnectionBlocked(false);
      setCameraScreenVisible(false);
      scanLock.current = false;
      setNotice({ type: 'info', text: 'Server connection restored. Scanning can continue.' });
    } else {
      AppAlert.alert('Still Offline', 'Unable to confirm live Grey Packing state.');
    }
  };

  const removeScan = (row: D2Row) => {
    if (!canRemove) {
      AppAlert.alert('Access denied', 'You do not have permission to remove a scanned Taka.');
      return;
    }

    AppAlert.alert(
      'Remove Taka?',
      `Taka ${row.TakaNo || ''} will be removed and its original source balance restored.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const response = await GreyPackingAPI.removeScan({
                prpcode: selectedPrpCode,
                yearno: selectedYearNo,
                uid,
                srno: n(row.SrNo),
                subsr: n(row.SubSr),
              });
              const result = unwrap(response);
              if (!result.success) throw new Error(result.message);
              applySession(result.data as SessionData);
              setLastScan(null);
              setConnectionBlocked(false);
              setNotice({ type: 'info', text: `Taka ${row.TakaNo || ''} removed. Balance restored.` });
            } catch (error) {
              if (isNetworkLikeError(error)) setConnectionBlocked(true);
              AppAlert.alert('Unable to Remove Taka', apiError(error));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const cancelEmptyPacking = () => {
    if (!isOpen || n(summary.total_taka) !== 0) return;

    AppAlert.alert(
      'Cancel Packing?',
      'No Taka/Carton has been scanned. This empty packing header will be deleted.',
      [
        { text: 'Keep Packing', style: 'cancel' },
        {
          text: 'Cancel Packing',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            scanLock.current = true;
            setCameraScreenVisible(false);

            try {
              const response = await GreyPackingAPI.cancelSession({
                prpcode: selectedPrpCode,
                yearno: selectedYearNo,
                uid,
              });

              const result = unwrap(response);
              if (!result.success) throw new Error(result.message);

              try {
                await AsyncStorage.removeItem(transactionFilterKey(uid));
              } catch {
                // Local filter cleanup must not turn a successful server cancel
                // into a user-visible failure.
              }

              setSession(null);
              setLastScan(null);
              setNotice(null);
              setSelectedTransactionTypes([]);
              setTransactionFilterRestored(true);
              setConnectionBlocked(false);
              setMode('header');

              // Do not reuse the cancelled voucher. The backend voucher sequence
              // is intentionally not rolled back.
              setVoucherNo('');
              setVoucherSuffix('');
              setVoucherMonth(monthCode(todayRef.current));

              scanLock.current = false;
              setCameraScreenVisible(false);
            } catch (error) {
              if (isNetworkLikeError(error)) setConnectionBlocked(true);
              AppAlert.alert('Unable to Cancel Packing', apiError(error));
              setCameraScreenVisible(false);
              scanLock.current = false;
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const finishPacking = () => {
    if (!canComplete) {
      AppAlert.alert('Access denied', 'You do not have permission to complete Grey Packing.');
      return;
    }
    if (n(summary.total_taka) <= 0) {
      AppAlert.alert('Nothing to Finish', 'Scan at least one Taka.');
      return;
    }

    AppAlert.alert(
      'Finish Packing?',
      `${n(summary.total_taka)} Taka • ${f3(summary.total_qty)} Mtr\n\nFinishing does not consume stock again. It closes this live packing session.`,
      [
        { text: 'Continue Scanning', style: 'cancel' },
        {
          text: 'Finish Packing',
          onPress: async () => {
            setBusy(true);
            try {
              const response = await GreyPackingAPI.completeSession({
                prpcode: selectedPrpCode,
                yearno: selectedYearNo,
                uid,
              });
              const result = unwrap(response);
              if (!result.success) throw new Error(result.message);
              applySession(result.data as SessionData);
              setMode('list');
              setConnectionBlocked(false);
              setNotice({ type: 'ok', text: 'Packing completed successfully.' });
            } catch (error) {
              if (isNetworkLikeError(error)) setConnectionBlocked(true);
              AppAlert.alert('Unable to Finish Packing', apiError(error));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const Notice = () => {
    if (!notice) return null;
    const bg =
      notice.type === 'ok' ? '#E8F5ED' : notice.type === 'error' ? '#FCECEA' : '#F5E8DA';
    const fg =
      notice.type === 'ok' ? T.green : notice.type === 'error' ? T.red : T.copper;
    return (
      <View style={[styles.notice, { backgroundColor: bg }]}>
        <Icon
          name={notice.type === 'ok' ? 'check-circle' : notice.type === 'error' ? 'error' : 'info'}
          size={20}
          color={fg}
        />
        <Text style={[styles.noticeText, { color: fg }]}>{notice.text}</Text>
      </View>
    );
  };

  const Summary = () => (
    <View style={styles.summary}>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryValue}>{n(summary.total_taka)}</Text>
        <Text style={styles.summaryLabel}>TAKA</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryValue}>{f3(summary.total_qty)}</Text>
        <Text style={styles.summaryLabel}>METRES</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryValue}>{f3(summary.total_kgs)}</Text>
        <Text style={styles.summaryLabel}>KG</Text>
      </View>
    </View>
  );

  const headerScrollRef = useRef<ScrollView>(null);
  const headerScrollY = useRef(0);

  const loadPackingbrowselist = useCallback(async () => {
    if (!isReady) return;

    const payload = {
      prpcode: selectedPrpCode,
      yearno: selectedYearNo,
      employeecode: '',
      txntype: TXN_TYPE,
    };

    console.log('[GreyPacking] PackingList payload:', payload);
    setBrowseListLoading(true);

    // Keep the current Header ScrollView position when the loading state updates.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        headerScrollRef.current?.scrollTo({
          y: headerScrollY.current,
          animated: false,
        });
      });
    });

    try {
      const response = await GreyPackingAPI.PackingList(payload);

      console.log('[GreyPacking] PackingList response:', response);

      const data = webResponseData(response);
      console.log('[GreyPacking] PackingList response data:', data);

      const list = Array.isArray(data) ? data : [];

      setPackingDataList(list);
      setBrowseSearch('');
      setMode('browseList');
    } catch (error) {
      console.log('[GreyPacking] PackingList error:', error);
      AppAlert.alert('Browse List', apiError(error));
    } finally {
      setBrowseListLoading(false);
    }
  }, [isReady, selectedPrpCode, selectedYearNo]);

  const HeaderForm = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={headerScrollRef}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          headerScrollY.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.tip}>
          <View style={styles.tipIcon}>
            <Icon name="inventory-2" size={24} color={T.copper} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Enter once. Then keep scanning.</Text>
            <Text style={styles.tipText}>
              A green scan means that Taka and its source-stock reduction are already committed in SQL.
            </Text>
          </View>
        </View>

        <Notice />

        {connectionBlocked && (
          <TouchableOpacity style={styles.retryButton} onPress={retryConnection}>
            <Icon name="refresh" size={20} color="#FFF" />
            <Text style={styles.retryText}>Retry Server Connection</Text>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>PACKING HEADER</Text>
          <Text style={styles.cardTitle}>Main Details</Text>

          <Text style={styles.label}>Property</Text>
          <TouchableOpacity
            style={[styles.pickerField, styles.propertyPickerField]}
            onPress={() => setPicker('property')}>
            <View style={styles.pickerLeading}>
              <Icon name="business" size={19} color={T.copper} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickerValue, !selectedPrpCode && styles.pickerPlaceholder]}>
                {selectedProperty?.label || (selectedPrpCode ? selectedPrpCode : 'Search Property')}
              </Text>
              {!!selectedPrpCode && <Text style={styles.pickerCode}>{selectedPrpCode}</Text>}
            </View>
            {propertyLoading ? (
              <ActivityIndicator size="small" color={T.copper} />
            ) : (
              <Icon name="keyboard-arrow-down" size={23} color={T.muted} />
            )}
          </TouchableOpacity>

          {/* Store stays below the Property + Financial Year pickers. */}
          <Text style={styles.label}>Financial Year *</Text>
          <TouchableOpacity
            style={[styles.pickerField, styles.propertyPickerField]}
            activeOpacity={0.8}
            onPress={() => setPicker('year')}
          >
            <View style={styles.pickerLeading}>
              <Icon name="calendar-today" size={19} color={T.copper} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickerValue, !selectedYear && styles.pickerPlaceholder]}>
                {selectedYear || 'Select Financial Year'}
              </Text>
              {!!selectedYearNo && (
                <Text style={styles.pickerCode}>Year No: {selectedYearNo}</Text>
              )}
            </View>
            <Icon name="keyboard-arrow-down" size={23} color={T.muted} />
          </TouchableOpacity>

          <Text style={styles.label}>Grey Store</Text>
          <View style={[styles.pickerField, styles.propertyPickerField]}>
            <View style={styles.pickerLeading}>
              <Icon name="store" size={19} color={T.copper} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickerValue}>
                {strCode || '—'}
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Voucher No</Text>
          <View style={styles.voucherRow}>
            <View style={styles.voucherBox}>
              <Text style={styles.voucherMonth}>{voucherMonth || '--'}</Text>
              <Text style={styles.voucherSlash}>/</Text>
              <Text style={styles.voucherNo}>{voucherNo || 'Loading…'}</Text>
            </View>
            <TouchableOpacity style={styles.squareButton} onPress={loadVoucherNo} disabled={voucherLoading}>
              {voucherLoading ? <ActivityIndicator size="small" color={T.nav} /> : <Icon name="refresh" size={22} color={T.nav} />}
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Department *</Text>
          <TouchableOpacity style={styles.pickerField} onPress={() => setPicker('department')}>
            <View style={styles.pickerLeading}>
              <Icon name="account-tree" size={19} color={T.copper} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickerValue, !departmentCode && styles.pickerPlaceholder]}>
                {departmentName || (departmentCode ? departmentCode : 'Search Department')}
              </Text>
              {!!departmentCode && <Text style={styles.pickerCode}>{departmentCode}</Text>}
            </View>
            {departmentLoading ? (
              <ActivityIndicator size="small" color={T.copper} />
            ) : (
              <Icon name="keyboard-arrow-down" size={23} color={T.muted} />
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Packing Type *</Text>
          <TouchableOpacity style={styles.pickerField} onPress={() => setPicker('packingType')}>
            <View style={styles.pickerLeading}>
              <Icon name="inventory" size={19} color={T.copper} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickerValue, !packingType && styles.pickerPlaceholder]}>
                {packingTypeName || (packingType ? packingType : 'Search Packing Type')}
              </Text>
              {!!packingType && <Text style={styles.pickerCode}>{packingType}</Text>}
            </View>
            {packingTypeLoading ? (
              <ActivityIndicator size="small" color={T.copper} />
            ) : (
              <Icon name="keyboard-arrow-down" size={23} color={T.muted} />
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Checked By *</Text>
          <TouchableOpacity style={styles.pickerField} onPress={() => setPicker('checkedBy')}>
            <View style={styles.pickerLeading}>
              <Icon name="person-search" size={19} color={T.copper} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickerValue, !checkedByCode && styles.pickerPlaceholder]}>
                {checkedByName || (checkedByCode ? checkedByCode : 'Search Checked By')}
              </Text>
              {!!checkedByCode && <Text style={styles.pickerCode}>{checkedByCode}</Text>}
            </View>
            {checkedByLoading ? (
              <ActivityIndicator size="small" color={T.copper} />
            ) : (
              <Icon name="keyboard-arrow-down" size={23} color={T.muted} />
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Stock Type *</Text>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[styles.segmentButton, stockType === 'I' && styles.segmentActive]}
              onPress={() => setStockType('I')}
            >
              <Text style={[styles.segmentText, stockType === 'I' && styles.segmentTextActive]}>In House</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, stockType === 'P' && styles.segmentActive]}
              onPress={() => setStockType('P')}
            >
              <Text style={[styles.segmentText, stockType === 'P' && styles.segmentTextActive]}>Process House</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Cutting</Text>
          <TouchableOpacity
            style={styles.checkboxRow}
            activeOpacity={0.8}
            onPress={() => {
              setCutting((value) => !value);
            }}
          >
            <View style={[styles.checkbox, cutting && styles.checkboxChecked]}>
              {cutting && <Icon name="check" size={16} color="#FFF" />}
            </View>
            <Text style={styles.checkboxText}>Cutting</Text>
          </TouchableOpacity>



          <Text style={styles.label}>Transaction Type *</Text>
          <TouchableOpacity
            style={styles.pickerField}
            onPress={() => setTransactionTypePickerOpen(true)}
          >
            <View style={styles.pickerLeading}>
              <Icon name="rule" size={19} color={T.copper} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.pickerValue,
                  selectedTransactionTypes.length === 0 && styles.pickerPlaceholder,
                ]}
                numberOfLines={2}
              >
                {selectedTransactionTypes.length === 0
                  ? 'Select Transaction Type'
                  : selectedTransactionTypeNames.slice(0, 2).join(', ')}
              </Text>
              {selectedTransactionTypes.length > 2 && (
                <Text style={styles.pickerCode}>
                  +{selectedTransactionTypes.length - 2} more selected
                </Text>
              )}
            </View>
            {transactionTypeLoading ? (
              <ActivityIndicator size="small" color={T.copper} />
            ) : (
              <View style={styles.multiCountBadge}>
                <Text style={styles.multiCountText}>{selectedTransactionTypes.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Packed By</Text>
          <TextInput
            value={packBy}
            onChangeText={setPackBy}
            placeholder="Packed by"
            placeholderTextColor={T.muted}
            style={styles.input}
          />

          <Text style={styles.label}>Remarks</Text>
          <TextInput
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Optional remarks"
            placeholderTextColor={T.muted}
            multiline
            maxLength={50}
            style={[styles.input, styles.multiline]}
          />
        </View>

        <TouchableOpacity
          style={[styles.primary, (!canStart || connectionBlocked || busy || voucherLoading) && styles.disabled]}
          disabled={!canStart || connectionBlocked || busy || voucherLoading}
          onPress={startSession}
        >
          <Icon name="qr-code-scanner" size={22} color="#FFF" />
          <Text style={styles.primaryText}>Start Scanning</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.browseListButton}
          onPress={loadPackingbrowselist}
          disabled={browseListLoading}
        >
          {browseListLoading ? (
            <ActivityIndicator size="small" color={T.nav} />
          ) : (
            <Icon name="format-list-bulleted" size={21} color={T.nav} />
          )}
          <Text style={styles.browseListText}>
            {browseListLoading ? 'Loading...' : 'Browse List'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const Scanner = () => {
    const scannerDisabled =
      !canScan ||
      !isOpen ||
      scanBusy ||
      connectionBlocked ||
      !transactionFilterRestored ||
      selectedTransactionTypes.length === 0;

    return (
      <ScrollView
        style={styles.scannerScroll}
        contentContainerStyle={styles.scannerContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.scanLauncherCard}>
          <View style={styles.scanLauncherIcon}>
            <Icon name="qr-code-scanner" size={46} color={T.copper} />
          </View>

          <Text style={styles.scanLauncherEyebrow}>GREY PACKING SCANNER</Text>
          <Text style={styles.scanLauncherTitle}>
            {n(summary.total_taka) === 0 ? 'Ready to Scan' : 'Ready for Next Taka'}
          </Text>

          <Text style={styles.scanLauncherText}>
            Tap Start Scan to open the camera full-screen. The camera closes
            immediately after one QR is read.
          </Text>

          <TouchableOpacity
            style={[styles.startScanButton, scannerDisabled && styles.disabled]}
            disabled={scannerDisabled}
            onPress={startScanner}
          >
            <Icon name="photo-camera" size={21} color="#FFF" />
            <Text style={styles.startScanButtonText}>
              {n(summary.total_taka) === 0 ? 'Start Scan' : 'Scan Next Taka'}
            </Text>
          </TouchableOpacity>
        </View>

        <Summary />

        <TouchableOpacity
          style={[
            styles.transactionFilterCard,
            selectedTransactionTypes.length === 0 && styles.transactionFilterMissing,
          ]}
          onPress={() => {
            closeScanner();
            setTransactionTypePickerOpen(true);
          }}
        >
          <View style={styles.transactionFilterIcon}>
            <Icon name="rule" size={20} color={T.copper} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.transactionFilterLabel}>TRANSACTION TYPE</Text>
            <Text
              style={[
                styles.transactionFilterValue,
                selectedTransactionTypes.length === 0 && { color: T.red },
              ]}
              numberOfLines={2}
            >
              {selectedTransactionTypes.length === 0
                ? 'Required before scanning'
                : selectedTransactionTypeNames.join(', ')}
            </Text>
          </View>
          <Icon name="edit" size={18} color={T.nav} />
        </TouchableOpacity>

        <Notice />

        {connectionBlocked && (
          <TouchableOpacity style={styles.retryButton} onPress={retryConnection}>
            <Icon name="refresh" size={20} color="#FFF" />
            <Text style={styles.retryText}>Confirm Server & Resume</Text>
          </TouchableOpacity>
        )}

        {lastScan && (
          <View style={styles.lastScan}>
            <View style={styles.lastScanCheck}>
              <Icon name="check" size={19} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lastLabel}>LAST SAVED</Text>
              <Text style={styles.lastTaka}>{lastScan.TakaNo || '—'}</Text>
              <Text style={styles.lastMeta}>
                {lastScan.DsnName || `Design ${lastScan.DsnCode || '—'}`} • {f3(lastScan.Qty)} Mtr
              </Text>
            </View>
            <Text style={styles.committed}>COMMITTED</Text>
          </View>
        )}

        <View style={styles.actions}>
          {n(summary.total_taka) === 0 ? (
            <TouchableOpacity
              style={[styles.cancelPackingButton, connectionBlocked && styles.disabled]}
              disabled={connectionBlocked}
              onPress={cancelEmptyPacking}
            >
              <Icon name="cancel" size={20} color={T.red} />
              <Text style={styles.cancelPackingText}>Cancel Packing</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.secondary} onPress={() => setMode('list')}>
                <Icon name="format-list-bulleted" size={21} color={T.nav} />
                <Text style={styles.secondaryText}>List ({n(summary.total_taka)})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.finish, (!canComplete || connectionBlocked) && styles.disabled]}
                disabled={!canComplete || connectionBlocked}
                onPress={finishPacking}
              >
                <Icon name="done-all" size={21} color="#FFF" />
                <Text style={styles.finishText}>Finish Packing</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    );
  };

  const filteredPackingDataList = useMemo(() => {
    const query = browseSearch.trim().toLowerCase();
    if (!query) return AllPackingDataList;

    return AllPackingDataList.filter((item: any) => {
      const searchableText = [
        item?.VouNo,
        item?.VouDate,
        item?.DptName,
        item?.DptCode,
        item?.PackTypeName,
        item?.PackType,
        item?.Remarks,
      ]
        .map((value) => String(value ?? ''))
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [AllPackingDataList, browseSearch]);


  // const loadPackingbrowselist = useCallback(async () => {
  //   if (!isReady) return;

  //   const payload = {
  //     prpcode: selectedPrpCode,
  //     yearno: selectedYearNo,
  //     employeecode: '',
  //     txntype: TXN_TYPE,
  //   };

  //   console.log('[GreyPacking] PackingList payload:', payload);
  //   setBrowseListLoading(true);

  //   // Keep the current Header ScrollView position when the loading state updates.
  //   requestAnimationFrame(() => {
  //     requestAnimationFrame(() => {
  //       headerScrollRef.current?.scrollTo({
  //         y: headerScrollY.current,
  //         animated: false,
  //       });
  //     });
  //   });

  //   try {
  //     const response = await GreyPackingAPI.PackingList(payload);

  //     console.log('[GreyPacking] PackingList response:', response);

  //     const data = webResponseData(response);
  //     console.log('[GreyPacking] PackingList response data:', data);

  //     const list = Array.isArray(data) ? data : [];

  //     setPackingDataList(list);
  //     setBrowseSearch('');
  //     setMode('browseList');
  //   } catch (error) {
  //     console.log('[GreyPacking] PackingList error:', error);
  //     AppAlert.alert('Browse List', apiError(error));
  //   } finally {
  //     setBrowseListLoading(false);
  //   }
  // }, [isReady, selectedPrpCode, selectedYearNo]);

  const BrowseList = useMemo(() => (
    <View style={styles.browseScreen}>
      <View style={styles.browseHeader}>
        <TouchableOpacity
          style={styles.squareButton}
          onPress={() => setMode('header')}
        >
          <Icon name="arrow-back-ios-new" size={18} color={T.nav} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardEyebrow}>GREY PACKING</Text>
          <Text style={styles.browseTitle}>Browse List</Text>
        </View>

        <TouchableOpacity
          style={styles.squareButton}
          onPress={loadPackingbrowselist}
          disabled={browseListLoading}
        >
          {browseListLoading ? (
            <ActivityIndicator size="small" color={T.nav} />
          ) : (
            <Icon name="refresh" size={21} color={T.nav} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.browseSummary}>
        <View style={styles.browseCountWrap}>
          <Text style={styles.browseSummaryText}>
            {filteredPackingDataList.length} / {AllPackingDataList.length} record{AllPackingDataList.length === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.browseSearchBox}>
          <Icon name="search" size={19} color={T.muted} />
          <TextInput
            value={browseSearch}
            onChangeText={setBrowseSearch}
            placeholder="Search..."
            placeholderTextColor={T.muted}
            style={styles.browseSearchInput}
            returnKeyType="search"
          />
          {!!browseSearch && (
            <TouchableOpacity onPress={() => setBrowseSearch('')} hitSlop={8}>
              <Icon name="close" size={18} color={T.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredPackingDataList}
        keyExtractor={(item, index) => String(item?.UrowId ?? item?.UId ?? index)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.browseListContent}
        renderItem={({ item }) => {
          const vouNo = String(item?.VouNo ?? '—').trim() || '—';
          const vouDate = String(item?.VouDate ?? '—').trim() || '—';
          const department = String(item?.DptName ?? item?.DptCode ?? '—').trim() || '—';
          const packingType = String(item?.PackTypeName ?? item?.PackType ?? '—').trim() || '—';
          const remarks = String(item?.Remarks ?? '').trim();
          return (
            <View style={styles.browseCard}>
              <View style={styles.browseCardTop}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.browseVoucher}>{vouNo}</Text>
                </View>
                <Text style={styles.browseDate}>{vouDate}</Text>
              </View>

              <View style={styles.browseCardDivider} />

              <View style={styles.browseCardInfo}>
                <View style={styles.browseCardCell}>
                  <Text style={styles.browseLabel}>DEPARTMENT</Text>
                  <Text style={styles.browseValue} numberOfLines={1}>{department}</Text>
                </View>

                <View style={styles.browseCardCell}>
                  <Text style={styles.browseLabel}>PACKING TYPE</Text>
                  <Text style={styles.browseValue} numberOfLines={1}>{packingType}</Text>
                </View>
              </View>

              <View style={styles.browseCardBottom}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.browseLabel}>REMARKS</Text>
                  <Text style={styles.browseRemarks} numberOfLines={2}>
                    {remarks || '—'}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.browseEmpty}>
            <Icon name="format-list-bulleted" size={38} color={T.border} />
            <Text style={styles.emptyText}>No packing records found.</Text>
          </View>
        }
      />
    </View>
  ), [AllPackingDataList.length, browseListLoading, browseSearch, filteredPackingDataList, loadPackingbrowselist]);

  const List = () => (
    <View style={styles.listScreen}>
      <View style={styles.listHeader}>
        <TouchableOpacity
          style={styles.squareButton}
          onPress={() => (isOpen ? setMode('scanner') : router.back())}
        >
          <Icon name="arrow-back-ios-new" size={18} color={T.nav} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardEyebrow}>{isOpen ? 'LIVE PACKING' : 'PACKING COMPLETE'}</Text>
          <Text style={styles.listTitle}>Packed Taka</Text>
        </View>
      </View>

      <Summary />
      <Notice />

      <FlatList
        data={rows}
        keyExtractor={(item, index) => `${item.UId}-${item.SrNo}-${item.SubSr}-${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.scanRow}>
            <View style={styles.scanRowIcon}><Icon name="qr-code-2" size={21} color={T.copper} /></View>
            <View style={{ flex: 1 }}>
              <View style={styles.scanRowTop}>
                <Text style={styles.scanRowTaka}>{item.TakaNo || '—'}</Text>
                <View style={styles.savedBadge}>
                  <Icon name="check-circle" size={14} color={T.green} />
                  <Text style={styles.savedBadgeText}>Saved</Text>
                </View>
              </View>
              <Text style={styles.scanRowMeta}>{f3(item.Qty)} Mtr • {f3(item.KWt)} Kg</Text>
              <Text style={styles.scanRowSub}>
                {item.LotNo ? `Lot ${item.LotNo}` : ''}
                {item.DsnCode ? `${item.LotNo ? ' • ' : ''}Design ${item.DsnCode}` : ''}
              </Text>
            </View>

            {isOpen && canRemove && (
              <TouchableOpacity style={styles.removeButton} onPress={() => removeScan(item)}>
                <Icon name="delete-outline" size={22} color={T.red} />
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="qr-code-scanner" size={38} color={T.border} />
            <Text style={styles.emptyText}>No Taka scanned yet.</Text>
          </View>
        }
      />

      {isOpen ? (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.secondary} onPress={() => setMode('scanner')}>
            <Icon name="qr-code-scanner" size={21} color={T.nav} />
            <Text style={styles.secondaryText}>Resume</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.finish, (!canComplete || connectionBlocked) && styles.disabled]}
            disabled={!canComplete || connectionBlocked}
            onPress={finishPacking}
          >
            <Text style={styles.finishText}>Finish Packing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.completedBar}>
          <View style={styles.completedIcon}><Icon name="check" size={22} color="#FFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.completedTitle}>Packing completed</Text>
            <Text style={styles.completedText}>All displayed Taka are committed in the database.</Text>
          </View>
        </View>
      )}
    </View>
  );

  if (cameraScreenVisible) {
    return (
      <View style={styles.cameraOnlyRoot}>
        <View style={styles.cameraOnlyTopBar}>
          <TouchableOpacity style={styles.cameraOnlyClose} onPress={closeScanner}>
            <Icon name="arrow-back-ios-new" size={19} color="#FFF" />
            <Text style={styles.cameraOnlyCloseText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.cameraOnlyTitleWrap}>
            <Text style={styles.cameraOnlyEyebrow}>GREY PACKING</Text>
            <Text style={styles.cameraOnlyTitle}>Scan Taka QR</Text>
          </View>

          <TouchableOpacity
            style={styles.cameraOnlyTorch}
            onPress={() => setTorch((value) => !value)}
          >
            <Icon name={torch ? 'flash-on' : 'flash-off'} size={23} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.cameraOnlyPreview}>
          {permission?.granted ? (
            <CameraView
              style={styles.cameraOnlyCamera}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanLock.current ? undefined : handleScan}
            />
          ) : (
            <View style={styles.cameraOnlyPermission}>
              <Icon name="photo-camera" size={48} color={T.copper} />
              <Text style={styles.cameraOnlyPermissionTitle}>Camera permission required</Text>
              <TouchableOpacity style={styles.cameraOnlyPermissionButton} onPress={requestPermission}>
                <Text style={styles.cameraOnlyPermissionButtonText}>Allow Camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.cameraOnlyFooter}>
          <View style={styles.cameraOnlyStatusDot} />
          <Text style={styles.cameraOnlyFooterText}>
            Point the camera at one Taka / Carton QR code
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {mode === 'header' && <HeaderForm />}
      {mode === 'scanner' && <Scanner />}
      {mode === 'list' && <List />}
      {mode === 'browseList' && BrowseList}

      <SearchablePickerModal
        visible={picker === 'property'}
        title="Property"
        placeholder="Search property name or code..."
        options={propertyOptions}
        selectedValue={selectedPrpCode}
        loading={propertyLoading}
        onRefresh={async () => {
          setPropertyLoading(true);
          try {
            const authToken = String(
              (await AsyncStorage.getItem('access_token')) ||
              (user as any)?.token ||
              (user as any)?.access_token ||
              (user as any)?.authToken ||
              '',
            );

            if (!authToken) {
              throw new Error('Login token not found. Please login again.');
            }

            const data = await fetchPropertyData(authToken);
            const options: SearchablePickerOption[] = Array.isArray(data)
              ? data
                .map((row: any) => ({
                  value: String(row?.PrpCode ?? ''),
                  label: String(row?.LngName ?? row?.PrpCode ?? ''),
                  searchText: `${row?.LngName ?? ''} ${row?.PrpCode ?? ''}`,
                }))
                .filter((row: SearchablePickerOption) => row.value !== '')
              : [];
            setPropertyOptions(options);
          } catch (error) {
            AppAlert.alert('Property', apiError(error));
          } finally {
            setPropertyLoading(false);
          }
        }}
        onClose={() => setPicker(null)}
        onSelect={async (option) => {
          if (selectedPrpCode === String(option.value)) {
            setPicker(null);
            return;
          }

          setSelectedProperty(option);
          await AsyncStorage.setItem('selected_prpcode', String(option.value));

          // Changing property starts a fresh packing header for that property.
          setSession(null);
          setLastScan(null);
          setNotice(null);
          setSelectedTransactionTypes([]);
          setTransactionFilterRestored(true);
          setConnectionBlocked(false);
          setMode('header');
          setVoucherNo('');
          setVoucherSuffix('');
          setVoucherMonth(monthCode(todayRef.current));
          setPicker(null);
        }}
      />
      <SearchablePickerModal
        visible={picker === 'year'}
        title="Financial Year"
        placeholder="Search financial year..."
        options={yearOptions}
        selectedValue={selectedYearNo}
        onClose={() => setPicker(null)}
        onSelect={async (option) => {
          const nextYear = String(option.label || '');
          if (!nextYear || nextYear === selectedYear) {
            setPicker(null);
            return;
          }

          // Do not switch FY while an open packing session is active.
          if (uid > 0 && isOpen) {
            AppAlert.alert(
              'Packing in progress',
              'Finish or leave the current packing before changing the financial year.',
            );
            setPicker(null);
            return;
          }

          setSelectedYear(nextYear);
          await AsyncStorage.setItem('selectedyear', nextYear);

          setSession(null);
          setLastScan(null);
          setNotice(null);
          setSelectedTransactionTypes([]);
          setTransactionFilterRestored(true);
          setConnectionBlocked(false);
          setMode('header');
          setVoucherNo('');
          setVoucherSuffix('');
          setVoucherMonth(monthCode(todayRef.current));
          setPicker(null);
        }}
      />

      <SearchablePickerModal
        visible={picker === 'department'}
        title="Department"
        placeholder="Search name or department code..."
        options={departmentOptions}
        selectedValue={departmentCode}
        loading={departmentLoading}
        onRefresh={loadDepartments}
        onClose={() => setPicker(null)}
        onSelect={(option) => {
          setDepartmentCode(option.value);
          setDepartmentName(option.label);
        }}
      />

      <SearchablePickerModal
        visible={picker === 'packingType'}
        title="Packing Type"
        placeholder="Search packing type..."
        options={packingTypeOptions}
        selectedValue={packingType}
        loading={packingTypeLoading}
        onRefresh={loadPackingTypes}
        onClose={() => setPicker(null)}
        onSelect={(option) => {
          setPackingType(option.value);
          setPackingTypeName(option.label);
        }}
      />

      <SearchablePickerModal
        visible={picker === 'checkedBy'}
        title="Checked By"
        placeholder="Search employee name or code..."
        options={checkedByOptions}
        selectedValue={checkedByCode}
        loading={checkedByLoading}
        onRefresh={loadCheckedBy}
        onClose={() => setPicker(null)}
        onSelect={(option) => {
          setCheckedByCode(option.value);
          setCheckedByName(option.label);
        }}
      />

      <SearchableMultiSelectModal
        visible={transactionTypePickerOpen}
        title="Transaction Type"
        placeholder="Search transaction type..."
        options={transactionTypeOptions}
        selectedValues={selectedTransactionTypes}
        loading={transactionTypeLoading}
        onRefresh={loadTransactionTypes}
        onClose={() => setTransactionTypePickerOpen(false)}
        onApply={async (values) => {
          const safeValues = Array.from(new Set(values.map(String)));
          setSelectedTransactionTypes(safeValues);
          if (uid > 0) {
            await persistTransactionTypes(uid, safeValues);
          }
          setNotice({
            type: 'info',
            text: `${safeValues.length} Transaction Type${safeValues.length === 1 ? '' : 's'} selected.`,
          });
        }}
      />


      {busy && (
        <Modal transparent visible animationType="fade">
          <View style={styles.loaderOverlay}>
            <View style={styles.loaderCard}>
              <ActivityIndicator size="large" color={T.copper} />
              <Text style={styles.loaderText}>Please wait…</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  formContent: { padding: 16, paddingBottom: 36 },
  tip: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: '#F3E3D3', marginBottom: 12 },
  tipIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF8F1', alignItems: 'center', justifyContent: 'center' },
  tipTitle: { color: T.nav, fontSize: 14, fontWeight: '900' },
  tipText: { color: '#765D49', fontSize: 11, lineHeight: 16, marginTop: 3 },

  card: { backgroundColor: T.surface, borderRadius: 20, borderWidth: 1, borderColor: T.border, padding: 16, ...S.card },
  cardEyebrow: { color: T.copper, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  cardTitle: { color: T.ink, fontSize: 21, fontWeight: '900', marginTop: 4, marginBottom: 16 },
  contextRow: { flexDirection: 'row', backgroundColor: T.sub, borderRadius: 13, marginTop: 9, marginBottom: 15, overflow: 'hidden' },
  contextCell: { flex: 1, paddingHorizontal: 14, paddingVertical: 11, borderRightWidth: 1, borderRightColor: T.border },
  contextLabel: { color: '#716D68', fontSize: 11, fontWeight: '800', marginTop: 0, marginBottom: 4 },
  contextValue: { color: T.nav, fontWeight: '900', marginTop: 2 },
  propertyValueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  label: { color: '#716D68', fontSize: 11, fontWeight: '800', marginTop: 11, marginBottom: 7 },
  input: { height: 48, borderWidth: 1, borderColor: T.border, borderRadius: 13, backgroundColor: '#FCFBF9', color: T.ink, paddingHorizontal: 13, fontWeight: '700' },
  multiline: { height: 78, paddingTop: 12, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 10 },
  propertyPickerField: { minHeight: 70, marginBottom: 0, },
  pickerField: { minHeight: 52, borderWidth: 1, borderColor: T.border, borderRadius: 14, backgroundColor: '#FCFBF9', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10, },
  pickerLeading: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#F3E3D3', alignItems: 'center', justifyContent: 'center' },
  pickerValue: { color: T.ink, fontSize: 13, fontWeight: '800' },
  pickerPlaceholder: { color: T.muted, fontWeight: '700' },
  pickerCode: { color: T.muted, fontSize: 9, fontWeight: '800', marginTop: 2 },
  multiCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 10,
    paddingHorizontal: 7,
    backgroundColor: T.copper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiCountText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  voucherRow: { flexDirection: 'row', gap: 9 },
  voucherBox: { flex: 1, height: 48, borderWidth: 1, borderColor: T.border, borderRadius: 13, backgroundColor: T.sub, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  voucherMonth: { color: T.copper, fontSize: 16, fontWeight: '900' },
  voucherSlash: { color: T.muted, fontSize: 16, marginHorizontal: 5 },
  voucherNo: { color: T.nav, fontSize: 16, fontWeight: '900' },
  squareButton: { width: 46, height: 46, borderRadius: 13, borderWidth: 1, borderColor: T.border, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  segment: { height: 47, flexDirection: 'row', borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: T.border, backgroundColor: T.sub },
  segmentButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: T.nav },
  segmentText: { color: '#77716C', fontSize: 12, fontWeight: '800' },
  segmentTextActive: { color: '#FFF' },
  checkboxRow: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    backgroundColor: '#FCFBF9',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: T.nav,
    borderColor: T.nav,
  },
  checkboxText: {
    color: T.ink,
    fontSize: 13,
    fontWeight: '800',
  },

  primary: { height: 54, marginTop: 14, borderRadius: 16, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  disabled: { opacity: .45 },

  // scannerContent: { flex: 1, padding: 14 },
  cameraWrap: { height: 330, borderRadius: 22, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
  camera: { width: '100%', height: '100%' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: '74%', aspectRatio: 1.28, position: 'relative' },
  corner: { position: 'absolute', width: 38, height: 38, borderColor: T.copper },
  tl: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 10 },
  tr: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 10 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 10 },
  br: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 10 },
  guidePill: { marginTop: 28, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(8,18,27,.8)', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  guideDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: '#45C979' },
  guideText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  torchButton: { position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(8,18,27,.74)', alignItems: 'center', justifyContent: 'center' },
  scanBusy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,18,27,.6)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  scanBusyText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  cameraPaused: { width: '100%', height: '100%', backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center', },
  cameraPausedText: { color: '#FFF', fontWeight: '800', marginTop: 8 },
  cameraStartingLight: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, backgroundColor: 'rgba(7,17,26,0.72)', alignItems: 'center', justifyContent: 'center', },
  cameraStartingTitle: { color: '#FFF', fontSize: 11, fontWeight: '900', marginTop: 5, },
  scannerScroll: { flex: 1 },
  scannerContent: { padding: 14, paddingBottom: 118 },
  scanLauncherCard: { minHeight: 238, borderRadius: 22, borderWidth: 1, borderColor: T.border, backgroundColor: '#FFF', paddingHorizontal: 24, paddingVertical: 22, alignItems: 'center', justifyContent: 'center', },
  scanLauncherIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#F3E3D3', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  scanLauncherEyebrow: { color: T.copper, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  scanLauncherTitle: { color: T.nav, fontSize: 22, fontWeight: '900', marginTop: 3 },
  scanLauncherText: { color: T.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7, marginBottom: 17, maxWidth: 320 },
  startScanButton: { minWidth: 205, height: 50, borderRadius: 15, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  startScanButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },


  cameraOnlyRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOnlyTopBar: {
    minHeight: 74,
    backgroundColor: T.nav,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 12 : 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cameraOnlyClose: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A4055',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cameraOnlyCloseText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  cameraOnlyTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  cameraOnlyEyebrow: {
    color: '#AAB6C2',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  cameraOnlyTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  cameraOnlyTorch: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A4055',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Deliberately no absolute positioning, Modal, ScrollView, borderRadius,
  // overflow:hidden, overlay, or child layered above CameraView.
  cameraOnlyPreview: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOnlyCamera: {
    flex: 1,
  },
  cameraOnlyPermission: {
    flex: 1,
    backgroundColor: '#07111A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  cameraOnlyPermissionTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 12,
  },
  cameraOnlyPermissionButton: {
    height: 48,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: T.copper,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOnlyPermissionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  cameraOnlyFooter: {
    minHeight: 64,
    backgroundColor: T.nav,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  cameraOnlyStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#45C979',
  },
  cameraOnlyFooterText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  summary: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 17, borderWidth: 1, borderColor: T.border, marginTop: 12, paddingVertical: 11 },
  summaryCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  summaryDivider: { width: 1, backgroundColor: T.border },
  summaryValue: { color: T.nav, fontSize: 16, fontWeight: '900' },
  summaryLabel: { color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  transactionFilterCard: { minHeight: 56, marginTop: 10, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 15, borderWidth: 1, borderColor: T.border, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 10 },
  transactionFilterMissing: { borderColor: '#F0B9B3', backgroundColor: '#FFF8F7' },
  transactionFilterIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#F3E3D3', alignItems: 'center', justifyContent: 'center', },
  transactionFilterLabel: { color: T.copper, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  transactionFilterValue: { color: T.nav, fontSize: 11, fontWeight: '800', marginTop: 2 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10 },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  retryButton: { minHeight: 46, marginTop: 10, borderRadius: 14, backgroundColor: T.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  lastScan: { marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: '#B9DFC8', backgroundColor: '#FFF', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lastScanCheck: { width: 34, height: 34, borderRadius: 11, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  lastLabel: { color: T.green, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  lastTaka: { color: T.ink, fontSize: 14, fontWeight: '900', marginTop: 2 },
  lastMeta: { color: T.muted, fontSize: 10, marginTop: 2 },
  committed: { color: T.green, fontSize: 8, fontWeight: '900', letterSpacing: .6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondary: { flex: 1, height: 49, borderRadius: 15, borderWidth: 1, borderColor: T.border, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryText: { color: T.nav, fontSize: 12, fontWeight: '900' },
  finish: { flex: 1.3, height: 49, borderRadius: 15, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  finishText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  cancelPackingButton: { flex: 1, width: '100%', height: 54, borderRadius: 16, borderWidth: 1.5, borderColor: '#E5AAA5', backgroundColor: '#FFF7F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  cancelPackingText: { color: T.red, fontSize: 13, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  cameraPermissionIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: '#F3E3D3', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  permissionTitle: { color: T.nav, fontSize: 18, fontWeight: '900' },
  permissionText: { color: T.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, marginBottom: 16 },
  permissionButton: { height: 47, borderRadius: 14, backgroundColor: T.nav, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  permissionButtonText: { color: '#FFF', fontWeight: '900' },
  listScreen: { flex: 1, padding: 14 },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listTitle: { color: T.ink, fontSize: 20, fontWeight: '900', marginTop: 2 },
  listContent: { paddingTop: 10, paddingBottom: 110 },
  scanRow: { backgroundColor: '#FFF', borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 12, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanRowIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#F3E3D3', alignItems: 'center', justifyContent: 'center' },
  scanRowTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  scanRowTaka: { flex: 1, color: T.ink, fontSize: 13, fontWeight: '900' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  savedBadgeText: { color: T.green, fontSize: 9, fontWeight: '900' },
  scanRowMeta: { color: T.nav, fontSize: 11, fontWeight: '800', marginTop: 4 },
  scanRowSub: { color: T.muted, fontSize: 10, marginTop: 3 },
  removeButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FCECEA', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 55 },
  emptyText: { color: T.muted, fontWeight: '700', marginTop: 8 },
  bottomBar: { position: 'absolute', left: 14, right: 14, bottom: 12, paddingTop: 8, backgroundColor: T.bg, flexDirection: 'row', gap: 9 },
  completedBar: { position: 'absolute', left: 14, right: 14, bottom: 12, padding: 12, borderRadius: 16, backgroundColor: '#E8F5ED', borderWidth: 1, borderColor: '#B9DFC8', flexDirection: 'row', alignItems: 'center', gap: 10 },
  completedIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  completedTitle: { color: T.green, fontSize: 12, fontWeight: '900' },
  completedText: { color: '#557A66', fontSize: 10, marginTop: 2 },
  loaderOverlay: { flex: 1, backgroundColor: 'rgba(8,18,27,.35)', alignItems: 'center', justifyContent: 'center' },
  loaderCard: { width: 132, height: 110, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loaderText: { color: T.nav, fontSize: 11, fontWeight: '800' },
  browseScreen: { flex: 1, backgroundColor: T.bg, padding: 14 },
  browseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  browseTitle: { color: T.ink, fontSize: 20, fontWeight: '900', marginTop: 3 },
  browseSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: T.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10, minHeight: 56 },
  browseSummaryText: { color: T.muted, fontSize: 10, fontWeight: '800' },
  browseListContent: { paddingBottom: 24 },
  browseCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 13, marginBottom: 10 },
  browseCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  browseVoucher: { color: T.copper, fontSize: 15, fontWeight: '900' },
  browseDate: { color: T.ink, fontSize: 11, fontWeight: '800' },
  browseCardDivider: { height: 1, backgroundColor: T.border, marginVertical: 10 },
  browseCardInfo: { flexDirection: 'row', gap: 12 },
  browseCardCell: { flex: 1, minWidth: 0 },
  browseLabel: { color: T.muted, fontSize: 8, fontWeight: '900', marginBottom: 3 },
  browseValue: { color: T.ink, fontSize: 11, fontWeight: '800' },
  browseCardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 11 },
  browseRemarks: { color: T.ink, fontSize: 10.5, fontWeight: '700', lineHeight: 15 },
  browseRow: { backgroundColor: '#FFF', borderWidth: 1, borderColor: T.border, borderRadius: 15, padding: 13, marginBottom: 9 },
  browseRowMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  browseRowInfo: { flexDirection: 'row', gap: 12, marginTop: 11 },
  browseCell: { flex: 1 },
  browseRowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
  browseMeta: { color: T.muted, fontSize: 9, fontWeight: '700' },
  browseStatus: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: '#E8F5ED' },
  browseTransferMessage: { color: T.muted, fontSize: 9, fontWeight: '600', marginTop: 8, lineHeight: 13 },
  browseLoader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  browseLoaderText: { color: T.muted, fontSize: 11, fontWeight: '700' },
  browseEmpty: { alignItems: 'center', justifyContent: 'center', paddingTop: 70 },
  browseListButton: { height: 50, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: T.border, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, },
  browseListText: { color: T.nav, fontSize: 13, fontWeight: '900', minWidth: 72, textAlign: 'center' },
  browseCountWrap: { minWidth: 92, marginRight: 8 },
  browseSearchBox: { flex: 1, height: 38, borderRadius: 11, borderWidth: 1, borderColor: T.border, backgroundColor: T.bg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 6 },
  browseSearchInput: { flex: 1, minWidth: 0, paddingVertical: 0, paddingHorizontal: 0, color: T.ink, fontSize: 11, fontWeight: '700' },

});