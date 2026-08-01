// FILE: src/screens/checking/CheckingScannerScreen.tsx
// Migrated from the old CheckingScanner/index.tsx to the app's standard
// architecture. Business logic (validation rules, payload shapes, API
// endpoints, scan-lock timing) is preserved exactly as it was — every
// change here is structural: header/theme/API-client/pickers/permissions/
// enter-key, not the underlying checking workflow itself.
//
// See CHECKING_SCANNER_MIGRATION.md for the full before/after mapping of
// every change against the app's 9 standard conventions.
import { MasterSelectField } from '@/src/components/forms/MasterSelectField';
import { CheckingAPI, PrinterAPI } from '@/src/api/legacyClient';
import { API_BASE_URL } from '@/src/api/client';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

interface Props {
    token: string;
    username: string;
}

const MANUAL_CHECKER_KEY = 'manual_checker';
const QR_CHECKER_KEY = 'qr_checker';

// Printer bridge endpoints — kept separate from CheckingAPI/client since
// they use a different auth scheme (a print-bridge API key, not the user's
// bearer token) and may point at a different host (a local network
// print-bridge service, not the main API). See legacyClient.ts's
// PrinterAPI for why these calls don't go through the shared `client`.
const PRINTSTICKER_URL = `${API_BASE_URL}/api/print-grey-in-stock`;
const PRINTERS_URL = `${API_BASE_URL}/api/printers`;

export const CheckingScannerScreen: React.FC<Props> = ({ token }) => {
    const { width } = useWindowDimensions();
    const { canDo } = usePermission();

    const isCompactScreen = width < 360;

    // Permission-gated capabilities. Matches the actions registered in
    // registry/modules/creel.permission.ts's 'checking_scanner' resource.
    const canScan = canDo('checking_scanner', 'scan');
    const canManualEntry = canDo('checking_scanner', 'manual_entry');
    const canPrint = canDo('checking_scanner', 'print');
    const canDelete = canDo('checking_scanner', 'delete');

    const [permission, requestPermission] = useCameraPermissions();
    const scanLock = useRef(false);

    const [isScanning, setIsScanning] = useState(false);
    const [scannedValue, setScannedValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [manualLoading, setManualLoading] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const [getData, setData] = useState<any[]>([]);
    const [Designdata, setDesigndata] = useState<any[]>([]);
    const [getdesigndata, setdesigndata] = useState<any[]>([]);

    const [beamNo, setBeamNo] = useState('');
    const [takaNo, setTakaNo] = useState('');
    const [meter, setMeter] = useState('');
    const [kgs, setKgs] = useState('');
    const [design, setDesign] = useState('');
    const [getWarpLen, setWarpLen] = useState('0');
    const [getavgWt, setavgWt] = useState('0');

    const [getGradeData, setGradeData] = useState<any[]>([]);
    const [getCheckerData, setCheckerData] = useState<any[]>([]);
    const [grade, setGrade] = useState('');
    const [checker, setChecker] = useState('');
    const [operator, setOperator] = useState('');
    const [getScannedObj, setScannedObj] = useState<any>({});
    const [shift, setShift] = useState('');
    const [getShiftData, setShiftData] = useState<any[]>([]);
    const [getOperatorData, setOperatorData] = useState<any[]>([]);

    const [getDataSaved, setDataSaved] = useState(false);
    const [getSavedData, setSavedData] = useState<any>({});
    const [isMending, setIsMending] = useState(false);

    const [getPrinters, setPrinters] = useState<any[]>([]);
    const [printer, setPrinter] = useState('');
    const [printerLoading, setPrinterLoading] = useState(false);
    const [printerError, setPrinterError] = useState('');
    const [printerModalVisible, setPrinterModalVisible] = useState(false);
    const [pendingPrintItem, setPendingPrintItem] = useState<any>(null);
    const [printerSearch, setPrinterSearch] = useState('');

    const [selecteddesign, setselecteddesign] = useState<any>(null);
    const [selectedGrade, setSelectedGrade] = useState<any>(null);
    const [selectedChecker, setSelectedChecker] = useState<any>(null);
    const [selectedOperator, setSelectedOperator] = useState<any>(null);

    const [showManual, setShowManual] = useState(false);
    const [FormState, setFormState] = useState<{ values: Record<string, any> }>({ values: {} });
    const [selectedBeam, setSelectedBeam] = useState<any>(null);
    const [manualBeamData, setManualBeamData] = useState<any[]>([]);

    const [manualGradeData, setManualGradeData] = useState<any[]>([]);
    const [manualCheckerData, setManualCheckerData] = useState<any[]>([]);
    const [manualShiftData, setManualShiftData] = useState<any[]>([]);
    const [manualShift, setManualShift] = useState('');
    const [selectedManualGrade, setSelectedManualGrade] = useState<any>(null);
    const [selectedManualChecker, setSelectedManualChecker] = useState<any>(null);
    const [manualOperatorData, setManualOperatorData] = useState<any[]>([]);
    const [selectedManualOperator, setSelectedManualOperator] = useState<any>(null);
    const [manualSaveLoading, setManualSaveLoading] = useState(false);

    const [scannerModal, setScannerModal] = useState(false);
    const [scannerCardData, setScannerCardData] = useState<any[]>([]);
    const [scannerLoading, setScannerLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [footerLoading, setFooterLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [visibleData, setVisibleData] = useState<any[]>([]);
    const ITEMS_PER_PAGE = 20;

    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [selectedDeleteItem, setSelectedDeleteItem] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Enter-key workflow: manual-mode text fields chain Taka No -> Meter ->
    // Kgs so an operator can move through the form with the keyboard's
    // return key, matching how a barcode scanner's "Enter" keystroke would
    // behave. No screen in the app had this convention yet — establishing
    // it here as the pattern for future data-entry-heavy screens.
    const takaNoRef = useRef<TextInput>(null);
    const meterRef = useRef<TextInput>(null);
    const kgsRef = useRef<TextInput>(null);
    const manualMeterRef = useRef<TextInput>(null);
    const manualKgsRef = useRef<TextInput>(null);

    let cancelToken: any;

    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2);
    };

    const getToken = () => token;

    const resetScanFields = () => {
        setDesign('');
        setGrade('');
        setChecker('');
        setGradeData([]);
        setCheckerData([]);
        setselecteddesign(null);
        setSelectedGrade(null);
        setSelectedChecker(null);
        setMeter('');
        setKgs('');
        setavgWt('');
        setWarpLen('0');
        setData([]);
        setDesigndata([]);
        setBeamNo('');
        setTakaNo('');
        setScannedObj({});
        setShift('');
        setPrinter('');
        setPrinters([]);
        setDataSaved(false);
        setSavedData({});
    };

    useEffect(() => {
        requestPermission();
    }, [requestPermission]);

    const handleBarCodeScanned = (result: BarcodeScanningResult) => {
        if (scanLock.current) return;
        scanLock.current = true;
        setTimeout(() => (scanLock.current = false), 2000);

        resetScanFields();
        setScannedValue('');

        const value = result?.data || '';
        setScannedValue(value);

        try {
            const parsed = JSON.parse(value);
            setScannedObj(parsed);
            setBeamNo(parsed.beamno || '');
            setTakaNo(parsed.takano || '');
            getGrades(parsed);
            getCheckers(parsed);
            getShifts(parsed);
            getOperator(parsed);
            sendScannedValue(value);
        } catch {
            resetScanFields();
            Alert.alert('Invalid QR', 'QR format not valid');
        }
        setIsScanning(false);
    };

    const getGrades = async (qrValue: any) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        const yno = await AsyncStorage.getItem('yno');
        try {
            const response = await CheckingAPI.criterion({
                txntype: 'beam_checking_tablet',
                referrer: 'dashboard',
                fetch: 'grd',
                prpcode: qrValue.prpcode,
                yearno: yno || '',
            });

            if (response.data.success && response.data.response.data.length > 0) {
                setGradeData(response.data.response.data);
            } else {
                setGradeData([]);
            }
        } catch (error) {
            console.log('grade API error:', error);
        }
    };

    const getCheckers = async (qrValue: any) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        try {
            const yno = await AsyncStorage.getItem('yno');
            const response = await CheckingAPI.criterion({
                txntype: 'beam_checking_tablet',
                referrer: 'dashboard',
                fetch: 'prodrepackchkby',
                prpcode: qrValue.prpcode,
                yearno: yno || '',
            });

            if (response.data.success && response.data.response.data.length > 0) {
                const checkerList = response.data.response.data;
                setCheckerData(checkerList);

                const cache = await AsyncStorage.getItem(QR_CHECKER_KEY);
                if (cache) {
                    const lastChecker = JSON.parse(cache);
                    const matched = checkerList.find(
                        (item: any) => String(item.EmpCode) === String(lastChecker.EmpCode)
                    );
                    if (matched) {
                        setSelectedChecker(matched);
                        setChecker(matched.EmpCode);
                        return;
                    }
                }

                const userId = response.data.response.user_id;
                if (userId && userId !== '' && userId !== '0') {
                    const matched = checkerList.find(
                        (item: any) => String(item.EmpCode) === String(userId)
                    );
                    if (matched) {
                        setSelectedChecker(matched);
                        setChecker(matched.EmpCode);
                        return;
                    }
                }

                setSelectedChecker(null);
                setChecker('');
            } else {
                setCheckerData([]);
            }
        } catch (error) {
            console.log('API getCheckers error:', error);
        }
    };

    const getShifts = async (qrValue: any) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        try {
            const yno = await AsyncStorage.getItem('yno');
            const userPtype = await AsyncStorage.getItem('user_prptype');
            const response = await CheckingAPI.criterion({
                txntype: 'beam_checking_tablet',
                referrer: 'dashboard',
                fetch: 'shift',
                prpcode: qrValue.prpcode,
                yearno: yno || '',
                prptype: userPtype || '',
            });

            if (response.data.success && response.data.response.data.length > 0) {
                setShiftData(response.data.response.data);
            } else {
                setShiftData([]);
            }
        } catch (error) {
            console.log('API getshifts error:', error);
        }
    };

    const getOperator = async (qrValue: any) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            const yno = await AsyncStorage.getItem('yno');
            const response = await CheckingAPI.criterion({
                txntype: 'chekingScanner',
                fetch: 'operator',
                prpcode: qrValue.prpcode,
                yearno: yno || '',
                prptype: userPtype || '',
            });

            if (response?.data?.success && response.data.response?.data?.length > 0) {
                const operatorList = response.data.response.data.map((x: any) => ({
                    ...x,
                    OprCode: x.EmpCode,
                    OprName: x.EmpName,
                }));
                setOperatorData(operatorList);
            } else {
                setOperatorData([]);
            }
        } catch (error) {
            console.log('API getoperator error:', error);
        }
    };

    const sendScannedValue = async (qrValue: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            const temp = JSON.parse(qrValue);
            const infoPyload = {
                txntype: 'chekingScanner',
                referrer: 'dashboard',
                scannedString: temp,
                prpcode: temp.prpcode,
                yearno: getCurrentFinancialYear(),
            };

            const response = await CheckingAPI.autoCheckingHelp(infoPyload);

            if (response.data.success && response.data.response.design) {
                setData(response.data.response.design);
            } else {
                Alert.alert('Error', `${response.data?.message || 'Unexpected response'}`);
            }
        } catch (error) {
            console.log('API sendScannedValue error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const sendScannedValue1 = async (qrValue: string, dsncode: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            const temp = JSON.parse(qrValue);
            const infoPyload = {
                txntype: 'chekingScanner',
                referrer: 'dashboard',
                scannedString: temp,
                prpcode: temp.prpcode,
                dsncode,
                yearno: getCurrentFinancialYear(),
            };

            const response = await CheckingAPI.autoCheckingHelp(infoPyload);

            const dataArr = response.data.response.data || [];
            if (response.data.success) {
                if (dataArr.length > 0) {
                    setDesigndata(dataArr);
                    setWarpLen(dataArr[0].WarpLen || '0');
                } else {
                    setDesigndata([]);
                    setWarpLen('0');
                    Alert.alert('No Data Found');
                }
            } else {
                Alert.alert('Error', `${response.data?.message || 'Unexpected response'}`);
            }
        } catch (error) {
            console.log('API sendScannedValue1 error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMeterChange = (value: string) => {
        value = value.replace(',', '.');
        const regex = /^\d{0,3}(?:\.\d{0,3})?$/;
        if (value === '' || regex.test(value)) {
            setMeter(value);
            const qty = value === '' ? 0 : parseFloat(value);
            const qltWt =
                Designdata && Designdata.length > 0 && Designdata[0].QltWt
                    ? parseFloat(Designdata[0].QltWt)
                    : 0;
            const wt = qty > 0 && qltWt > 0 ? (qty * qltWt).toFixed(2) : '0.00';
            const avgWt =
                qty > 0 && parseFloat(wt) > 0 ? ((parseFloat(wt) * 100) / qty).toFixed(2) : '0.00';
            setKgs(wt);
            setavgWt(avgWt);
        }
    };

    const handleKgsChange = (value: string) => {
        value = value.replace(',', '.');
        const regex = /^\d{0,3}(?:\.\d{0,3})?$/;
        if (value === '' || regex.test(value)) {
            setKgs(value);
            const qty = parseFloat(meter) || 0;
            const wt = parseFloat(value) || 0;
            const avgWt = qty === 0 || wt === 0 ? '0.00' : ((wt * 100) / qty).toFixed(2);
            setavgWt(avgWt);
        }
    };

    const handleSubmitScan = async () => {
        if (!canScan) return Alert.alert('Not permitted', 'You do not have permission to save scan entries.');
        if (!beamNo) return Alert.alert('Beam no can not be blank');
        if (!takaNo) return Alert.alert('Taka no can not be blank');
        if (!design) return Alert.alert('Design can not be blank.');
        if (!meter || parseFloat(meter) <= 0) return Alert.alert('Meter can not be blank or 0.');
        if (parseFloat(meter) > parseFloat(getWarpLen))
            return Alert.alert(`Meter ${meter} can not be greater than ${getWarpLen}.`);
        if (!kgs || parseFloat(kgs) <= 0) return Alert.alert('Kgs can not be blank or 0.');
        if (!grade) return Alert.alert('Grade can not be blank.');
        if (!checker) return Alert.alert('Checker can not be blank.');
        if (!shift) return Alert.alert('Shift can not be blank.');
        if (!Designdata.length) return Alert.alert('Design data missing. Select design again.');
        if (!operator) return Alert.alert('Operator can not be blank.');

        let finalObj: any = {};
        getData.forEach((el: any) => {
            if (design === el.DsnCode || design === el.dsncode) finalObj = el;
        });

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);

        try {
            const yno = await AsyncStorage.getItem('yno');
            const d = Designdata[0];
            const payloadObj: any = {
                ...finalObj,
                prpcode: getScannedObj.prpcode,
                yearno: yno,
                TakaNo: takaNo,
                GrdCode: grade,
                ChkCode: checker,
                Qty: meter,
                Wt: kgs,
                AvgWt: getavgWt,
                txntype: 'chekingScanner',
                ShfCode: shift || '1',
                SrNo: '0',
                islasttaka: getScannedObj.islasttaka,
                isfirsttaka: getScannedObj.isfirsttaka,
                IsLastTaka: getScannedObj.islasttaka,
                IsFirstTaka: getScannedObj.isfirsttaka,
                ismending: isMending ? 1 : 0,
                AuthStatus: d.AuthStatus,
                BeamNo: d.BeamNo,
                OrderUId: d.OrderUId,
                OrderNo: d.OrderNo,
                OrderDsnCode: d.OrderDsnCode,
                OrderDsnName: d.OrderDsnName,
                OrderLastDate: d.OrderLastDate,
                UId: d.UId,
                PlanUId: d.PlanUId,
                PlanNo: d.PlanNo,
                BeamUId: d.BeamUId,
                MacCode: d.MacCode,
                MacName: d.MacName,
                DsnCode: d.DsnCode,
                DsnName: d.DsnName,
                WarpLen: d.WarpLen,
                QltWt: d.QltWt,
                islasttakatrack: d.islasttakatrack,
                bstatus: d.bstatus,
                Status: d.Status,
                IsAuth: d.IsAuth,
                PrpCode: d.PrpCode,
                EMode: 'S',
                OprCode: operator,
            };

            const response = await CheckingAPI.addAutoCheckingDetail(payloadObj);

            if (response.data.success === true) {
                const checkerObj = getCheckerData.find((x: any) => String(x.EmpCode) === String(checker));
                if (checkerObj) {
                    await AsyncStorage.setItem(QR_CHECKER_KEY, JSON.stringify(checkerObj));
                }
                setDataSaved(true);
                if (response.data?.data?.main?.[0]) {
                    setSavedData(response.data.data.main[0]);
                }
                getAllPrinters();
                Alert.alert('Saved', 'Saved successfully');
            } else {
                setDataSaved(false);
                Alert.alert('Save failed', response.data.message || 'Save failed');
            }
        } catch (error) {
            setDataSaved(false);
            console.log('API handleSubmitScan error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getPrinterHeaders = () => ({
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'x-api-key': 'PRINT_SECRET_123',
    });

    const normalizePrinterList = (raw: any) => {
        const list = raw?.printers || raw?.data?.printers || raw?.data || raw || [];
        if (!Array.isArray(list)) return [];
        return list
            .map((item: any) => {
                if (typeof item === 'string') return { Name: item, StatusText: 'Idle' };
                return {
                    ...item,
                    Name: item.Name || item.name || item.printerName || '',
                    StatusText: item.StatusText || item.statusText || item.status || 'Idle',
                };
            })
            .filter((item: any) => item.Name);
    };

    const selectPrinter = (item: any) => {
        const printerName = item?.Name || '';
        setPrinter(printerName);
        AsyncStorage.setItem('lastSelectedPrinter', printerName);
        if (!pendingPrintItem) setPrinterModalVisible(false);
    };

    const getPrinterStatusColor = (statusText: string) => {
        if (!statusText || statusText === 'Idle' || statusText === 'Online') return T.green;
        if (statusText === 'Offline') return T.red;
        return T.muted;
    };

    const buildStickerParams = (rowData: any, printerName: string) => ({
        data: [rowData],
        IskgQty: 0,
        printype: 'Print',
        PrintFormat: 4,
        printerName: printerName || printer || '',
        txntype: 'chekingScanner',
    });

    const printStickerForData = async (rowData: any) => {
        if (!canPrint) return Alert.alert('Not permitted', 'You do not have permission to print.');
        const printerName = printer || '';
        if (!printerName) return Alert.alert('Printer Required', 'Please select printer first.');
        if (!rowData || Object.keys(rowData).length === 0)
            return Alert.alert('Print Error', 'Sticker data is empty.');
        setIsLoading(true);
        try {
            const response = await PrinterAPI.printSticker(PRINTSTICKER_URL, buildStickerParams(rowData, printerName), getPrinterHeaders());
            const res = response.data || {};

            if (res.success) {
                Alert.alert('Printed', `${res.printed || 1} label(s) sent to printer.`);
                setPrinterModalVisible(false);
                setPendingPrintItem(null);
            } else {
                Alert.alert('Print failed', res.message || 'Print failed');
            }
        } catch (error: any) {
            Alert.alert(
                'Print failed',
                error?.response?.data?.message || error?.response?.data?.error || error.message || 'Print failed',
            );
        } finally {
            setIsLoading(false);
        }
    };

    const printSticker = () => printStickerForData(getSavedData);

    const getAllPrinters = async () => {
        setPrinterLoading(true);
        setPrinterError('');
        try {
            const res = await PrinterAPI.list(PRINTERS_URL, getPrinterHeaders());
            const printerList = normalizePrinterList(res.data);
            setPrinters(printerList);

            const lastSelected = await AsyncStorage.getItem('lastSelectedPrinter');
            const selectedFromStorage = lastSelected
                ? printerList.find((p: any) => p.Name === lastSelected)
                : null;
            const defaultPrinter =
                selectedFromStorage ||
                printerList.find((p: any) => p.IsDefault || p.isDefault || p.Default) ||
                printerList[0];

            if (defaultPrinter) selectPrinter(defaultPrinter);
            if (printerList.length === 0) setPrinterError('No printer found from Laravel print bridge.');
        } catch (err: any) {
            const message =
                err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Printer service not reachable';
            setPrinterError(message);
            setPrinters([]);
            Alert.alert('Printer Error', String(message));
        } finally {
            setPrinterLoading(false);
        }
    };

    const handleChange = (key: string, value: any) => {
        setFormState((prev) => ({ ...prev, values: { ...prev.values, [key]: value } }));
    };

    const fetchdesign = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        setManualLoading(true);
        try {
            const infoPyload = {
                prptype: userPtype,
                yearno: getCurrentFinancialYear(),
                txntype: 'manual_checking',
                fetch: 'manual_checking_machine_help',
                referrer: 'dashboard',
            };
            const response = await CheckingAPI.autoCheckingDesignHelp(infoPyload);

            if (response.data.success && response.data.response.design) {
                setdesigndata(response.data.response.design);
            } else {
                Alert.alert('No Design Data Found');
            }
        } catch (error) {
            console.log('API error:', error);
        } finally {
            setManualLoading(false);
        }
    };

    const BeamNoHelp = async () => {
        setManualLoading(true);
        try {
            const userPtype = await AsyncStorage.getItem('user_prptype');
            const payload = {
                txntype: 'chekingScanner',
                referrer: 'dashboard',
                scannedString: {
                    prpcode: FormState.values.PrpCode || '',
                    prptype: userPtype || '',
                    beamuid: FormState.values.BeamUId || '',
                    beamno: FormState.values.BeamNo || '',
                    takano: '',
                    isfirsttaka: FormState.values.isfirsttaka || '',
                    islasttaka: FormState.values.islasttaka || '',
                    yearno: getCurrentFinancialYear(),
                },
                prpcode: FormState.values.PrpCode || '',
                prptype: userPtype || '',
                dsncode: FormState.values.DsnCode || '',
                yearno: getCurrentFinancialYear(),
            };

            const response = await CheckingAPI.autoCheckingHelp(payload);

            const data = response?.data?.response?.data || [];
            const uniqueBeamList = data
                .filter((item: any, index: number, self: any[]) =>
                    index === self.findIndex((x) => x.BeamNo === item.BeamNo)
                )
                .map((item: any) => ({ label: item.BeamNo, value: item.BeamNo, ...item }));
            setManualBeamData(uniqueBeamList);
        } catch (error) {
            console.log('BeamNoHelp Error', error);
        } finally {
            setManualLoading(false);
        }
    };

    useEffect(() => {
        if (showManual) BeamNoHelp();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showManual]);

    const fetchDesignHelp = async (beamData: any) => {
        setManualLoading(true);
        try {
            const userPtype = await AsyncStorage.getItem('user_prptype');
            const payload = {
                txntype: 'chekingScanner',
                referrer: 'dashboard',
                scannedString: {
                    prpcode: beamData.PrpCode,
                    prptype: userPtype,
                    beamuid: beamData.BeamUId,
                    beamno: beamData.BeamNo,
                    takano: '',
                    isfirsttaka: beamData.isfirsttaka || 0,
                    islasttaka: beamData.islasttaka || 1,
                    yearno: getCurrentFinancialYear(),
                },
                prpcode: beamData.PrpCode,
                prptype: userPtype,
                dsncode: beamData.DsnCode || '',
                yearno: getCurrentFinancialYear(),
            };

            const response = await CheckingAPI.autoCheckingHelp(payload);

            const maxTakaNo = response?.data?.response?.maxtakano ?? '';
            setFormState((prev) => ({ ...prev, values: { ...prev.values, TakaNo: maxTakaNo } }));

            if (response.data.success) {
                const designRow = response.data.response.data?.[0];
                if (designRow) {
                    setFormState((prev) => ({
                        ...prev,
                        values: {
                            ...prev.values,
                            QltWt: designRow.QltWt,
                            WarpLen: designRow.WarpLen,
                            UId: designRow.UId,
                            AuthStatus: designRow.AuthStatus,
                            BeamNo: designRow.BeamNo,
                            BeamUId: designRow.BeamUId,
                            DsnCode: designRow.DsnCode,
                            DsnName: designRow.DsnName,
                        },
                    }));
                }
                setdesigndata(
                    response.data.response.design.map((x: any) => ({
                        ...x,
                        DsnCode: x.DsnCode || x.dsncode,
                        DsnName: x.DsnName || x.dsnname,
                    }))
                );
            }
        } catch (error) {
            console.log('Design Help Error', error);
        } finally {
            setManualLoading(false);
        }
    };

    const manualDesignSelect = async (item: any) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setManualLoading(true);
        try {
            const userPtype = await AsyncStorage.getItem('user_prptype');
            const dsncode = item?.dsncode || '';
            const temp = {
                prpcode: FormState.values.PrpCode,
                prptype: userPtype,
                beamuid: FormState.values.BeamUId,
                beamno: FormState.values.BeamNo,
                takano: '',
                isfirsttaka: FormState.values.isfirsttaka || 0,
                islasttaka: FormState.values.islasttaka || 1,
                yearno: getCurrentFinancialYear(),
            };
            const infoPayload = {
                txntype: 'chekingScanner',
                referrer: 'dashboard',
                scannedString: temp,
                prpcode: temp.prpcode,
                dsncode,
                yearno: getCurrentFinancialYear(),
            };

            const response = await CheckingAPI.autoCheckingHelp(infoPayload);

            if (response.data.success) {
                const data = response?.data?.response?.data?.[0];
                if (data) {
                    setFormState((prev) => ({
                        ...prev,
                        values: {
                            ...prev.values,
                            QltWt: data.QltWt,
                            WarpLen: data.WarpLen,
                            UId: data.UId,
                            AuthStatus: data.AuthStatus,
                            BeamNo: data.BeamNo,
                            BeamUId: data.BeamUId,
                            DsnCode: data.DsnCode,
                            DsnName: data.DsnName,
                            OrderNo: data.OrderNo,
                            OrderUId: data.OrderUId,
                            OrderDsnCode: data.OrderDsnCode,
                            OrderDsnName: data.OrderDsnName,
                            OrderLastDate: data.OrderLastDate,
                            PlanNo: data.PlanNo,
                            PlanUId: data.PlanUId,
                            Status: data.Status,
                            IsAuth: data.IsAuth,
                        },
                    }));
                }
            }
        } catch (error) {
            console.log('manualDesignSelect Error', error);
        } finally {
            setManualLoading(false);
        }
    };

    const handleManualMeterChange = (value: string) => {
        value = value.replace(',', '.');
        const regex = /^\d{0,3}(?:\.\d{0,3})?$/;
        if (value === '' || regex.test(value)) {
            setMeter(value);
            const qty = value === '' ? 0 : parseFloat(value);
            const qltWt = parseFloat(FormState.values.QltWt || 0);
            const wt = qty > 0 && qltWt > 0 ? (qty * qltWt).toFixed(2) : '0.00';
            const avgWt = qty > 0 && parseFloat(wt) > 0 ? ((parseFloat(wt) * 100) / qty).toFixed(2) : '0.00';
            setKgs(wt);
            setavgWt(avgWt);
            handleChange('Qty', value);
            handleChange('Wt', wt);
            handleChange('AvgWt', avgWt);
        }
    };

    const handleManualKgsChange = (value: string) => {
        value = value.replace(',', '.');
        const regex = /^\d{0,3}(?:\.\d{0,3})?$/;
        if (value === '' || regex.test(value)) {
            setKgs(value);
            const qty = parseFloat(meter) || 0;
            const wt = parseFloat(value) || 0;
            const avgWt = qty === 0 || wt === 0 ? '0.00' : ((wt * 100) / qty).toFixed(2);
            setavgWt(avgWt);
            handleChange('Wt', value);
            handleChange('AvgWt', avgWt);
        }
    };

    const fetchManualGradeCheckerOperatorShift = async () => {
        try {
            const yno = await AsyncStorage.getItem('yno');
            const userPtype = await AsyncStorage.getItem('user_prptype');
            const base = { referrer: 'dashboard', prpcode: '', yearno: yno || '', prptype: userPtype || '' };
            const [gradeRes, checkerRes, operatorRes, shiftRes] = await Promise.all([
                CheckingAPI.criterion({ ...base, txntype: 'manual_checking', fetch: 'grd' }),
                CheckingAPI.criterion({ ...base, txntype: 'manual_checking', fetch: 'prodrepackchkby' }),
                CheckingAPI.criterion({ ...base, txntype: 'manual_checking', fetch: 'operator' }),
                CheckingAPI.criterion({ ...base, txntype: 'manual_checking', fetch: 'shift' }),
            ]);

            if (gradeRes?.data?.success && gradeRes.data.response?.data?.length > 0) {
                setManualGradeData(gradeRes.data.response.data);
            } else setManualGradeData([]);

            if (checkerRes?.data?.success && checkerRes.data.response?.data?.length > 0) {
                const checkerList = checkerRes.data.response.data;
                setManualCheckerData(checkerList);
                const cache = await AsyncStorage.getItem(MANUAL_CHECKER_KEY);
                if (cache) {
                    const lastChecker = JSON.parse(cache);
                    const matched = checkerList.find(
                        (x: any) => String(x.EmpCode) === String(lastChecker.EmpCode)
                    );
                    if (matched) {
                        setSelectedManualChecker(matched);
                        handleChange('ChkCode', matched.EmpCode);
                        handleChange('ChkName', matched.EmpName);
                    }
                }
            } else setManualCheckerData([]);

            if (shiftRes?.data?.success && shiftRes.data.response?.data?.length > 0) {
                setManualShiftData(shiftRes.data.response.data);
            } else setManualShiftData([]);

            if (operatorRes?.data?.success && operatorRes.data.response?.data?.length > 0) {
                const operatorList = operatorRes.data.response.data.map((x: any) => ({
                    ...x,
                    OprCode: x.EmpCode,
                    OprName: x.EmpName,
                }));
                setManualOperatorData(operatorList);
            } else {
                setManualOperatorData([]);
            }
        } catch (error) {
            console.log('fetchManualGradeCheckerOperatorShift error:', error);
        }
    };

    const soshow = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        setManualLoading(true);
        try {
            const response = await CheckingAPI.manualCheckingDetail({
                prptype: userPtype || '',
                yearno: getCurrentFinancialYear(),
                txntype: 'manual_checking',
                MacCode: '',
                TakaNo: '',
            });

            const newMain = response?.data?.data?.new_main || [];
            if (response?.data?.success && newMain.length > 0) {
                setFormState((prev) => ({ ...prev, values: { ...newMain[0] } }));
                fetchdesign();
                fetchManualGradeCheckerOperatorShift();
            } else {
                Alert.alert('No Data Found');
            }
        } catch (error) {
            console.log('API error:', error);
        } finally {
            setManualLoading(false);
        }
    };

    const showAlert = (message: string) =>
        new Promise<void>((resolve) => {
            Alert.alert('Validation Error', message, [{ text: 'OK', onPress: () => resolve() }], {
                cancelable: false,
            });
        });

    const validateForm = async () => {
        if (!FormState.values.BeamNo) {
            await showAlert('Please select Beam No');
            return false;
        }
        if (!FormState.values.TakaNo) {
            await showAlert('Please Enter TakaNo');
            return false;
        }
        if (!FormState.values.DsnName) {
            await showAlert('Please Enter Design');
            return false;
        }
        const meterVal = parseFloat(meter);
        if (meter === '' || isNaN(meterVal) || meterVal <= 0) {
            await showAlert('Please Enter valid Meter');
            return false;
        }
        const kgsVal = parseFloat(kgs);
        if (kgs === '' || isNaN(kgsVal) || kgsVal <= 0) {
            await showAlert('Please Enter valid Kgs');
            return false;
        }
        if (!FormState.values.GrdCode) {
            await showAlert('Please select Grade');
            return false;
        }
        if (!FormState.values.ChkCode) {
            await showAlert('Please select Checker');
            return false;
        }
        if (!FormState.values.ShfCode) {
            await showAlert('Please select Shift');
            return false;
        }
        return true;
    };

    const handleClearForm = () => {
        const keepChecker = { ChkCode: FormState.values.ChkCode, ChkName: FormState.values.ChkName };
        setFormState({ values: { ...keepChecker } });
        setSelectedBeam(null);
        setselecteddesign(null);
        setSelectedManualGrade(null);
        setManualShift('');
        setMeter('');
        setKgs('');
        setavgWt('0');
        setIsMending(false);
        setManualBeamData([]);
        BeamNoHelp();
    };

    const handlesave = async () => {
        if (!canManualEntry) return Alert.alert('Not permitted', 'You do not have permission to save manual entries.');
        const userPtype = await AsyncStorage.getItem('user_prptype');
        const isValid = await validateForm();
        if (!isValid) return;

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setManualSaveLoading(true);
        try {
            const payloadObj = {
                ...FormState.values,
                AvgWt: getavgWt,
                prpcode: FormState.values.PrpCode,
                isfirsttaka: FormState.values.isfirsttaka || '',
                IsFirstTaka: FormState.values.isfirsttaka || '',
                islasttaka: FormState.values.islasttaka || '',
                IsLastTaka: FormState.values.islasttaka || '',
                ismending: isMending ? 1 : 0,
                prptype: userPtype,
                txntype: 'chekingScanner',
                yearno: getCurrentFinancialYear(),
                EMode: 'M',
            };

            const response = await CheckingAPI.addAutoCheckingDetail(payloadObj);

            if (response.data.success === true) {
                Alert.alert('Success', 'Data Saved Successfully', [
                    {
                        text: 'OK',
                        onPress: async () => {
                            handleClearForm();
                            await BeamNoHelp();
                            await soshow();
                        },
                    },
                ]);
            } else {
                Alert.alert('Save failed', `${response.data.message}`);
            }
        } catch (error) {
            console.log('API handlesave error:', error);
        } finally {
            setManualSaveLoading(false);
        }
    };

    const handleScannerList = async (mode = 'S') => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setScannerModal(true);
            setScannerLoading(true);
            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();

            const response = await CheckingAPI.showBeamChecking({
                prptype: userPtype || '',
                yearno: getCurrentFinancialYear(),
                txntype: 'cheking_scanner_list',
                ShfCode: '',
                ChkDate: '',
                PrpCode: '',
                BeamNo: '',
                EMode: mode,
            });

            setScannerCardData(response?.data?.success ? response?.data?.data?.main || [] : []);
        } catch (error) {
            if (!axios.isCancel(error)) console.log('API handleScannerList error:', error);
        } finally {
            setScannerLoading(false);
        }
    };

    const loadMoreData = () => {
        if (footerLoading || visibleData.length >= scannerCardData.length) return;
        setFooterLoading(true);
        const nextPage = page + 1;
        setVisibleData(scannerCardData.slice(0, nextPage * ITEMS_PER_PAGE));
        setPage(nextPage);
        setFooterLoading(false);
    };

    const filteredData = scannerCardData.filter((item) => {
        const search = searchText.toLowerCase();
        return (
            item?.DsnName?.toLowerCase()?.includes(search) ||
            item?.BeamNo?.toLowerCase()?.includes(search) ||
            item?.TakaNo?.toLowerCase()?.includes(search) ||
            item?.OrdDsnName?.toLowerCase()?.includes(search) ||
            item?.GrdName?.toLowerCase()?.includes(search)
        );
    });

    const handledelete = async () => {
        if (!canDelete) return Alert.alert('Not permitted', 'You do not have permission to delete records.');
        try {
            setShowDeleteAlert(false);
            if (!selectedDeleteItem) return;
            setIsDeleteLoading(true);

            const infoPyload = {
                ShfCode: selectedDeleteItem?.ShfCode || '',
                ChkDate: selectedDeleteItem?.ChkDate || '',
                MacGrp: selectedDeleteItem?.MacGrp || '',
                PrpCode: selectedDeleteItem?.PrpCode || '',
                yearno: selectedDeleteItem?.yearno || getCurrentFinancialYear(),
                txntype: 'chekingScanner',
                SrNo: selectedDeleteItem?.SrNo || '',
                UId: selectedDeleteItem?.UId || '',
                BeamNo: selectedDeleteItem?.BeamNo || '',
            };

            const response = await CheckingAPI.deleteCheckingDetail(infoPyload);

            if (response.data.success) {
                Alert.alert('Success', response.data.message || 'Record deleted successfully');
                await handleScannerList();
            } else {
                Alert.alert('Warning', response.data.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setIsDeleteLoading(false);
        }
    };

    const openPrinterForScannerRow = async (item: any) => {
        if (!canPrint) return Alert.alert('Not permitted', 'You do not have permission to print.');
        setPendingPrintItem(item);
        setPrinterModalVisible(true);
        if (getPrinters.length === 0) await getAllPrinters();
    };

    const filteredPrinters = useMemo(() => {
        const q = printerSearch.trim().toLowerCase();
        if (!q) return getPrinters;
        return getPrinters.filter((p: any) => {
            const name = String(p?.Name || '').toLowerCase();
            const status = String(p?.StatusText || '').toLowerCase();
            return name.includes(q) || status.includes(q);
        });
    }, [getPrinters, printerSearch]);

    const onRefresh = async () => {
        setRefreshing(true);
        await soshow();
        await BeamNoHelp();
        setRefreshing(false);
    };

    if (!permission) {
        return (
            <View style={s.centered}>
                <ActivityIndicator size="large" color={T.nav} />
                <Text>Initializing camera...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[s.centered, { padding: 20 }]}>
                <Icon name="camera-alt" size={60} color={T.muted} />
                <Text style={{ marginTop: 15, fontSize: 16, textAlign: 'center' }}>
                    Camera permission is required
                </Text>
                <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {(isLoading || manualLoading) && (
                <View style={s.manualOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}

            <ScrollView
                style={s.page}
                contentContainerStyle={{ padding: 14, paddingBottom: 28 }}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.nav]} tintColor={T.nav} />}
            >
                {/* Tab switcher — Manual Entry only shown if permitted */}
                <View style={[s.tabWrap, isCompactScreen && s.tabWrapCompact]}>
                    {canManualEntry && (
                        <TouchableOpacity
                            style={[s.tabBtn, isCompactScreen && s.tabBtnCompact, showManual && s.tabBtnActiveManual]}
                            onPress={() => {
                                resetScanFields();
                                setShowManual(true);
                                setIsScanning(false);
                                soshow();
                            }}
                        >
                            <Icon name="edit" size={20} color={showManual ? '#fff' : T.muted} />
                            <Text style={[s.tabText, showManual && s.tabTextActive]}>Manual Entry</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[s.tabBtn, isCompactScreen && s.tabBtnCompact, !showManual && s.tabBtnActiveScanner]}
                        onPress={() => setShowManual(false)}
                    >
                        <Icon name="qr-code-scanner" size={20} color={!showManual ? '#fff' : T.muted} />
                        <Text style={[s.tabText, isCompactScreen && s.tabTextCompact, !showManual && s.tabTextActive]}>QR Scanner</Text>
                    </TouchableOpacity>
                </View>

                {/* QR Scanner tab */}
                {!showManual && (
                    <>
                        <View style={[s.scannerBanner, isCompactScreen && s.scannerBannerCompact]}>
                            <View style={s.scannerIconWrap}>
                                <Icon name="qr-code-scanner" size={31} color={T.nav} />
                            </View>
                            <View style={[s.measurementField, isCompactScreen && s.measurementFieldCompact]}>
                                <Text style={s.scannerTitle}>QR Scanner</Text>
                                <Text style={s.scannerSub}>Point camera to QR code</Text>
                            </View>
                            <TouchableOpacity
                                style={[s.scanBtn, isScanning && { backgroundColor: T.red }]}
                                onPress={() => {
                                    resetScanFields();
                                    setIsScanning((prev) => !prev);
                                }}
                            >
                                <Icon name={isScanning ? 'stop-circle' : 'photo-camera'} size={20} color="#fff" />
                                <Text style={[s.scanBtnText, isCompactScreen && s.tabTextCompact]}>{isScanning ? 'STOP' : 'SCAN'}</Text>
                            </TouchableOpacity>
                        </View>

                        {isScanning && (
                            <View style={s.cameraContainer}>
                                <CameraView
                                    style={s.camera}
                                    facing="back"
                                    onBarcodeScanned={handleBarCodeScanned}
                                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                                />
                                <View style={s.overlay}>
                                    <View style={s.scanBox} />
                                </View>
                            </View>
                        )}

                        <View style={s.card}>
                            <View style={s.sectionHead}>
                                <View style={[s.sectionIconWrap, { backgroundColor: T.sub }]}>
                                    <Icon name="inventory-2" size={20} color={T.nav} />
                                </View>
                                <Text style={s.sectionHeadText}>FABRIC INFO</Text>
                            </View>
                            <Text style={s.label}>Beam Number <Text style={s.required}>*</Text></Text>
                            <TextInput style={s.inputDisabled} value={beamNo} editable={false} />

                            <Text style={s.label}>Taka No <Text style={s.required}>*</Text></Text>
                            <TextInput style={s.inputDisabled} value={takaNo} editable={false} />

                            <Text style={s.label}>Design <Text style={s.required}>*</Text></Text>
                            <MasterSelectField
                                data={getData}
                                placeholder="Choose design..."
                                labelKey={['dsnname', 'dsncode']}
                                valueKey="dsncode"
                                selected={selecteddesign}
                                onSelect={(item) => {
                                    setselecteddesign(item);
                                    setDesign(item.dsncode);
                                    if (scannedValue) sendScannedValue1(scannedValue, item.dsncode);
                                }}
                            />

                            <View style={s.sectionDivider} />

                            <View style={s.sectionHead}>
                                <View style={[s.sectionIconWrap, { backgroundColor: T.sub }]}>
                                    <Icon name="settings" size={20} color={T.nav} />
                                </View>
                                <Text style={s.sectionHeadText}>PRODUCTION DETAILS</Text>
                            </View>

                            <View style={[s.measurementRow, isCompactScreen && s.measurementRowCompact]}>
                                <View style={[s.measurementField, isCompactScreen && s.measurementFieldCompact]}>
                                    <Text style={s.label}>
                                        Meter <Text style={s.required}>*</Text>
                                        {parseFloat(getWarpLen) > 0 ? ` [${getWarpLen}]` : ''}
                                    </Text>
                                    <TextInput
                                        ref={meterRef}
                                        style={s.input}
                                        value={meter}
                                        keyboardType="decimal-pad"
                                        onChangeText={handleMeterChange}
                                        returnKeyType="next"
                                        onSubmitEditing={() => kgsRef.current?.focus()}
                                    />
                                </View>
                                <View style={[s.measurementField, isCompactScreen && s.measurementFieldCompact]}>
                                    <Text style={s.label}>Kgs <Text style={s.required}>*</Text></Text>
                                    <TextInput
                                        ref={kgsRef}
                                        style={s.input}
                                        value={kgs}
                                        keyboardType="decimal-pad"
                                        onChangeText={handleKgsChange}
                                        returnKeyType="done"
                                    />
                                </View>
                            </View>

                            <Text style={s.label}>Avg. Wt</Text>
                            <TextInput style={s.inputDisabled} value={getavgWt} editable={false} />

                            <View style={s.sectionDivider} />

                            <View style={s.sectionHead}>
                                <View style={[s.sectionIconWrap, { backgroundColor: T.sub }]}>
                                    <Icon name="verified" size={20} color={T.nav} />
                                </View>
                                <Text style={s.sectionHeadText}>QUALITY DETAILS</Text>
                            </View>

                            <Text style={s.label}>Grade <Text style={s.required}>*</Text></Text>
                            <MasterSelectField
                                data={getGradeData}
                                placeholder="Choose grade..."
                                labelKey={['GrdName', 'GrdCode']}
                                valueKey="GrdCode"
                                selected={selectedGrade}
                                onSelect={(item) => {
                                    setSelectedGrade(item);
                                    setGrade(item.GrdCode);
                                }}
                            />

                            <Text style={s.label}>Checker <Text style={s.required}>*</Text></Text>
                            <MasterSelectField
                                data={getCheckerData}
                                placeholder="Choose checker..."
                                labelKey={['EmpName', 'EmpCode']}
                                valueKey="EmpCode"
                                selected={selectedChecker}
                                onSelect={(item) => {
                                    setSelectedChecker(item);
                                    setChecker(item.EmpCode);
                                }}
                            />

                            <Text style={s.label}>Operator <Text style={s.required}>*</Text></Text>
                            <MasterSelectField
                                data={getOperatorData}
                                placeholder="Choose Operator..."
                                labelKey={['OprName', 'OprCode']}
                                valueKey="OprCode"
                                selected={selectedOperator}
                                onSelect={(item) => {
                                    setSelectedOperator(item);
                                    setOperator(item.OprCode);
                                }}
                            />

                            <Text style={s.label}>Shift <Text style={s.required}>*</Text></Text>
                            <MasterSelectField
                                data={getShiftData}
                                placeholder="Select shift"
                                labelKey={['ShfName', 'ShfCode']}
                                valueKey="ShfCode"
                                selected={getShiftData.find((x) => x.ShfCode === shift) || null}
                                onSelect={(item) => setShift(item.ShfCode)}
                            />

                            <View style={s.mendingRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <View style={[s.sectionIconWrap, { backgroundColor: isMending ? T.sub : T.alt }]}>
                                        <Icon name="build" size={19} color={isMending ? T.nav : T.muted} />
                                    </View>
                                    <View>
                                        <Text style={s.mendingTitle}>Mending Entry</Text>
                                        <Text style={s.mendingSub}>{isMending ? 'This taka requires mending' : 'Normal checking entry'}</Text>
                                    </View>
                                </View>
                                <Switch value={isMending} onValueChange={setIsMending} trackColor={{ false: T.border, true: T.sub }} thumbColor={isMending ? T.nav : '#fff'} />
                            </View>

                            <View style={[s.buttonRow, isCompactScreen && s.actionButtonStack]}>
                                <TouchableOpacity style={s.submitBtn1} onPress={() => handleScannerList('S')}>
                                    <Text style={s.submitText}>Scanner List</Text>
                                </TouchableOpacity>
                                {canScan && (
                                    <TouchableOpacity style={s.submitBtn1} onPress={handleSubmitScan}>
                                        <Text style={s.submitText}>Save Entry</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {getDataSaved && canPrint && (
                                <View style={{ marginTop: 12 }}>
                                    <TouchableOpacity
                                        style={s.printBtn}
                                        onPress={() => {
                                            setPendingPrintItem(null);
                                            if (getPrinters.length === 0) getAllPrinters();
                                            setPrinterModalVisible(true);
                                        }}
                                    >
                                        <Text style={s.actionText}>{printer ? `Print (${printer})` : 'Select Printer & Print'}</Text>
                                    </TouchableOpacity>
                                    {!!printer && (
                                        <TouchableOpacity style={[s.printBtn, { marginTop: 8 }]} onPress={printSticker}>
                                            <Text style={s.actionText}>Print Sticker</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    </>
                )}

                {/* Manual Entry tab */}
                {showManual && canManualEntry && (
                    <View style={s.card}>
                        <View style={s.sectionHead}>
                            <View style={[s.sectionIconWrap, { backgroundColor: T.sub }]}>
                                <Icon name="inventory-2" size={20} color={T.nav} />
                            </View>
                            <Text style={s.sectionHeadText}>FABRIC INFO</Text>
                        </View>
                        <Text style={s.label}>Beam No <Text style={s.required}>*</Text></Text>
                        <MasterSelectField
                            data={manualBeamData}
                            placeholder="Select Beam No"
                            labelKey="BeamNo"
                            valueKey="BeamNo"
                            selected={selectedBeam}
                            onSelect={(item) => {
                                setSelectedBeam(item);
                                setFormState((prev) => ({
                                    ...prev,
                                    values: {
                                        ...prev.values,
                                        AuthStatus: item.AuthStatus,
                                        MacCode: item.MacCode,
                                        MacName: item.MacName,
                                        PrpCode: item.PrpCode,
                                        BeamNo: item.BeamNo,
                                        BeamUId: item.BeamUId,
                                        isfirsttaka: item.isfirsttaka,
                                        islasttaka: item.islasttaka,
                                        bstatus: item.bstatus,
                                        IsAuth: item.IsAuth,
                                        islasttakatrack: item.islasttakatrack,
                                        OrderDsnCode: item.OrderDsnCode,
                                        OrderDsnName: item.OrderDsnName,
                                        OrderLastDate: item.OrderLastDate,
                                        OrderNo: item.OrderNo,
                                        OrderUId: item.OrderUId,
                                        PlanNo: item.PlanNo,
                                        PlanUId: item.PlanUId,
                                        QltWt: item.QltWt,
                                        Status: item.Status,
                                        WarpLen: item.WarpLen,
                                        UId: item.UId,
                                    },
                                }));
                                fetchDesignHelp(item);
                            }}
                        />

                        <Text style={s.label}>Taka No <Text style={s.required}>*</Text></Text>
                        <TextInput
                            ref={takaNoRef}
                            style={s.input}
                            value={FormState.values.TakaNo}
                            onChangeText={(text) => handleChange('TakaNo', text)}
                            maxLength={20}
                            returnKeyType="next"
                            onSubmitEditing={() => manualMeterRef.current?.focus()}
                        />

                        <Text style={s.label}>Design <Text style={s.required}>*</Text></Text>
                        <MasterSelectField
                            data={getdesigndata}
                            placeholder="Choose Design..."
                            labelKey={['dsnname', 'dsncode']}
                            valueKey="dsncode"
                            selected={selecteddesign}
                            onSelect={(item) => {
                                setselecteddesign(item);
                                handleChange('DsnCode', item.DsnCode);
                                handleChange('DsnName', item.DsnName);
                                manualDesignSelect(item);
                            }}
                        />

                        <View style={s.sectionDivider} />

                        <View style={s.sectionHead}>
                            <View style={[s.sectionIconWrap, { backgroundColor: T.sub }]}>
                                <Icon name="settings" size={20} color={T.nav} />
                            </View>
                            <Text style={s.sectionHeadText}>PRODUCTION DETAILS</Text>
                        </View>

                        <View style={[s.measurementRow, isCompactScreen && s.measurementRowCompact]}>
                            <View style={[s.measurementField, isCompactScreen && s.measurementFieldCompact]}>
                                <Text style={s.label}>Meter <Text style={s.required}>*</Text></Text>
                                <TextInput
                                    ref={manualMeterRef}
                                    style={s.input}
                                    value={meter}
                                    keyboardType="decimal-pad"
                                    onChangeText={handleManualMeterChange}
                                    returnKeyType="next"
                                    onSubmitEditing={() => manualKgsRef.current?.focus()}
                                />
                            </View>
                            <View style={[s.measurementField, isCompactScreen && s.measurementFieldCompact]}>
                                <Text style={s.label}>Kgs <Text style={s.required}>*</Text></Text>
                                <TextInput
                                    ref={manualKgsRef}
                                    style={s.input}
                                    value={kgs}
                                    keyboardType="decimal-pad"
                                    onChangeText={handleManualKgsChange}
                                    returnKeyType="done"
                                />
                            </View>
                        </View>

                        <Text style={s.label}>Avg. Wt</Text>
                        <TextInput style={s.inputDisabled} value={getavgWt} editable={false} />

                        <View style={s.sectionDivider} />

                        <View style={s.sectionHead}>
                            <View style={[s.sectionIconWrap, { backgroundColor: T.sub }]}>
                                <Icon name="verified" size={20} color={T.nav} />
                            </View>
                            <Text style={s.sectionHeadText}>QUALITY DETAILS</Text>
                        </View>

                        <Text style={s.label}>Grade <Text style={s.required}>*</Text></Text>
                        <MasterSelectField
                            data={manualGradeData}
                            placeholder="Choose grade..."
                            labelKey={['GrdName', 'GrdCode']}
                            valueKey="GrdCode"
                            selected={selectedManualGrade}
                            onSelect={(item) => {
                                setSelectedManualGrade(item);
                                handleChange('GrdCode', item.GrdCode);
                                handleChange('GrdName', item.GrdName);
                            }}
                        />

                        <Text style={s.label}>Checker <Text style={s.required}>*</Text></Text>
                        <MasterSelectField
                            data={manualCheckerData}
                            placeholder="Choose checker..."
                            labelKey={['EmpName', 'EmpCode']}
                            valueKey="EmpCode"
                            selected={selectedManualChecker}
                            onSelect={async (item) => {
                                setSelectedManualChecker(item);
                                handleChange('ChkCode', item.EmpCode);
                                handleChange('ChkName', item.EmpName);
                                await AsyncStorage.setItem(MANUAL_CHECKER_KEY, JSON.stringify(item));
                            }}
                        />

                        <Text style={s.label}>Operator <Text style={s.required}>*</Text></Text>
                        <MasterSelectField
                            data={manualOperatorData}
                            placeholder="Choose operator."
                            labelKey={['OprName', 'OprCode']}
                            valueKey="OprCode"
                            selected={selectedManualOperator}
                            onSelect={(item) => {
                                setSelectedManualOperator(item);
                                setFormState((prev) => ({
                                    ...prev,
                                    values: { ...prev.values, OprCode: item?.OprCode, OprName: item?.OprName },
                                }));
                            }}
                        />

                        <Text style={s.label}>Shift <Text style={s.required}>*</Text></Text>
                        <MasterSelectField
                            data={manualShiftData}
                            placeholder="Select shift"
                            labelKey={['ShfName', 'ShfCode']}
                            valueKey="ShfCode"
                            selected={manualShiftData.find((x) => x.ShfCode === manualShift) || null}
                            onSelect={(item) => {
                                setManualShift(item.ShfCode);
                                handleChange('ShfCode', item.ShfCode);
                            }}
                        />

                        <View style={s.mendingRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={[s.sectionIconWrap, { backgroundColor: isMending ? T.sub : T.alt }]}>
                                    <Icon name="build" size={19} color={isMending ? T.nav : T.muted} />
                                </View>
                                <View>
                                    <Text style={s.mendingTitle}>Mending Entry</Text>
                                    <Text style={s.mendingSub}>{isMending ? 'This taka requires mending' : 'Normal checking entry'}</Text>
                                </View>
                            </View>
                            <Switch
                                value={isMending}
                                onValueChange={(val) => {
                                    setIsMending(val);
                                    handleChange('ismending', val ? 1 : 0);
                                }}
                                trackColor={{ false: T.border, true: T.sub }}
                                thumbColor={isMending ? T.nav : '#fff'}
                            />
                        </View>

                        <View style={[s.buttonRow, isCompactScreen && s.actionButtonStack]}>
                            <TouchableOpacity
                                style={[s.submitBtn1, s.fullWidthBtn, { opacity: manualSaveLoading ? 0.7 : 1 }]}
                                onPress={handlesave}
                                disabled={manualSaveLoading}
                            >
                                {manualSaveLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Save</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.submitBtn1, s.fullWidthBtn, { backgroundColor: T.muted }]} onPress={handleClearForm}>
                                <Text style={s.submitText}>Clear</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={[s.submitBtn1, s.fullWidthBtn]} onPress={() => handleScannerList('M')}>
                            <Text style={s.submitText}>Scanner List (Manual)</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Printer modal */}
            <Modal
                visible={printerModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => {
                    setPrinterModalVisible(false);
                    setPendingPrintItem(null);
                    setPrinterSearch('');
                }}
            >
                <View style={s.modalOverlayBottom}>
                    <View style={s.printerSheet}>
                        <Text style={s.modalTitle}>Select Printer</Text>
                        <TextInput placeholder="Search printer..." value={printerSearch} onChangeText={setPrinterSearch} style={s.searchInput} />
                        {printerLoading ? (
                            <ActivityIndicator size="large" color={T.nav} style={{ marginVertical: 30 }} />
                        ) : (
                            <FlatList
                                data={filteredPrinters}
                                keyExtractor={(item, index) => `${item.Name}-${index}`}
                                renderItem={({ item }) => {
                                    const active = item.Name === printer;
                                    return (
                                        <TouchableOpacity style={[s.printerRow, active && s.printerRowActive]} onPress={() => selectPrinter(item)}>
                                            <Text style={{ fontWeight: '700' }}>{item.Name}</Text>
                                            <Text style={{ color: getPrinterStatusColor(item.StatusText), fontSize: 11 }}>{item.StatusText || 'Idle'}</Text>
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={<Text style={{ textAlign: 'center', margin: 20 }}>{printerError || 'No printers'}</Text>}
                            />
                        )}
                        {!!pendingPrintItem && (
                            <TouchableOpacity style={[s.printConfirmBtn, !printer && { backgroundColor: T.muted }]} disabled={!printer} onPress={() => printStickerForData(pendingPrintItem)}>
                                <Text style={{ color: '#fff', fontWeight: '800' }}>Print on {printer || '...'}</Text>
                            </TouchableOpacity>
                        )}
                        {!pendingPrintItem && !!printer && (
                            <TouchableOpacity style={s.printConfirmBtn} onPress={() => setPrinterModalVisible(false)}>
                                <Text style={{ color: '#fff', fontWeight: '800' }}>Done</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Scanner list modal */}
            <Modal visible={scannerModal} animationType="slide" onRequestClose={() => setScannerModal(false)}>
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={s.headerContainer}>
                        <View>
                            <Text style={{ fontSize: 24, fontWeight: '900' }}>Scanner List</Text>
                            <Text style={{ color: T.muted }}>{scannerCardData.length} items</Text>
                        </View>
                        <TouchableOpacity style={s.closeButton} onPress={() => setScannerModal(false)}>
                            <Icon name="close" size={24} color={T.ink} />
                        </TouchableOpacity>
                    </View>

                    <View style={s.searchContainer}>
                        <Icon name="search" size={22} color={T.muted} />
                        <TextInput placeholder="Search scanner data..." value={searchText} onChangeText={setSearchText} style={{ flex: 1, marginLeft: 10, color: T.ink }} />
                    </View>

                    {scannerLoading ? (
                        <View style={s.centered}>
                            <ActivityIndicator size="large" color={T.nav} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredData}
                            keyExtractor={(_, index) => index.toString()}
                            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                            onEndReached={loadMoreData}
                            renderItem={({ item }) => (
                                <View style={s.billCard}>
                                    <View style={[s.measurementField, isCompactScreen && s.measurementFieldCompact]}>
                                        <Text numberOfLines={1} style={s.billTitle}>{item.DsnName}</Text>
                                        <Text style={s.subText}>Beam No : {item.BeamNo}</Text>
                                        <Text style={s.subText}>Taka : {item.TakaNo}</Text>
                                        <Text style={s.subText}>Design : {item.OrdDsnName || item.DsnName}</Text>
                                        <Text style={s.subText}>Weight : {item.Wt}</Text>
                                        <Text style={s.subText}>Avg Weight : {item.AvgWt}</Text>
                                        <Text style={s.subText}>Grade : {item.GrdName}</Text>
                                        <Text style={s.subText}>Linked Order No : {item.LinkedOrderNo}</Text>
                                        <Text style={s.subText}>Operator : {item.OprName}</Text>
                                    </View>
                                    <View>
                                        {canPrint && (
                                            <TouchableOpacity style={s.printIconBtn} onPress={() => openPrinterForScannerRow(item)}>
                                                <Icon name="local-printshop" size={20} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                        {canDelete && (
                                            <TouchableOpacity
                                                disabled={Number(item.islasttakatrack) === 1}
                                                style={[s.deleteIconBtn, Number(item.islasttakatrack) === 1 && s.deleteIconBtnDisabled]}
                                                onPress={() => {
                                                    setSelectedDeleteItem(item);
                                                    setShowDeleteAlert(true);
                                                }}
                                            >
                                                <Icon name="delete-outline" size={20} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            </Modal>

            {/* Delete confirm */}
            <Modal transparent visible={showDeleteAlert} animationType="fade" onRequestClose={() => setShowDeleteAlert(false)}>
                <View style={s.modalOverlayCenter}>
                    <View style={s.deleteBox}>
                        <Text style={s.modalTitle}>Delete Record</Text>
                        <Text style={{ textAlign: 'center', color: T.muted, marginTop: 10 }}>Are you sure you want to delete this scanner record?</Text>
                        <View style={{ flexDirection: 'row', marginTop: 20 }}>
                            <TouchableOpacity style={[s.deleteBtn, { backgroundColor: T.alt }]} onPress={() => setShowDeleteAlert(false)}>
                                <Text style={{ fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.deleteBtn, { backgroundColor: T.red }]} onPress={handledelete}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {isDeleteLoading && (
                <Modal transparent animationType="fade">
                    <View style={s.modalOverlayCenter}>
                        <View style={s.deleteBox}>
                            <ActivityIndicator size="large" color={T.nav} />
                            <Text style={{ marginTop: 10, fontWeight: '700' }}>Deleting record...</Text>
                        </View>
                    </View>
                </Modal>
            )}
        </KeyboardAvoidingView>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// Common theme: every color below is a T.* token instead of the old
// screen's inline hex literals — see CHECKING_SCANNER_MIGRATION.md for the
// full mapping rationale. Section-icon tint colors (FABRIC/PRODUCTION/
// QUALITY headers) were intentionally left as a single consistent T.sub/
// T.nav pairing rather than 3 different accent colors, since matching the
// rest of the app's convention (one consistent card style) is what "common
// theme" means here — the 3 sections are still visually separated by the
// section divider + icon + label, just without 3 different brand colors.
// ─────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    flex: { flex: 1 },
    page: { flex: 1, backgroundColor: T.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    permissionBtn: { marginTop: 20, backgroundColor: T.nav, padding: 12, borderRadius: 8 },

    tabWrap: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 24, padding: 5, marginBottom: 14, borderWidth: 1, borderColor: T.border },
    tabWrapCompact: { padding: 4, borderRadius: 20 },
    tabBtn: { flex: 1, minHeight: 50, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    tabBtnCompact: { minHeight: 48, paddingHorizontal: 4 },
    tabBtnActiveManual: { backgroundColor: T.nav },
    tabBtnActiveScanner: { backgroundColor: T.nav },
    tabText: { marginLeft: 8, color: T.ink, fontWeight: '900' },
    tabTextActive: { color: '#fff' },
    tabTextCompact: { fontSize: 12, marginLeft: 5 },

    scannerBanner: { backgroundColor: T.sub, borderRadius: 22, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'center' },
    scannerBannerCompact: { flexWrap: 'wrap', padding: 14 },
    scannerIconWrap: { width: 58, height: 58, borderRadius: 20, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    scannerTitle: { color: T.ink, fontWeight: '900', fontSize: 18 },
    scannerSub: { color: T.muted, marginTop: 4, fontSize: 13 },
    scanBtn: { minHeight: 48, paddingHorizontal: 18, borderRadius: 16, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center' },
    scanBtnText: { color: '#fff', fontWeight: '900', marginLeft: 8 },

    cameraContainer: { height: 260, borderRadius: 18, overflow: 'hidden', marginBottom: 14, backgroundColor: '#000' },
    camera: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    scanBox: { width: 210, height: 210, borderWidth: 2, borderColor: '#fff', borderRadius: 12 },

    card: { backgroundColor: T.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: T.border },
    sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    sectionIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    sectionHeadText: { color: T.ink, fontWeight: '900', fontSize: 15, letterSpacing: 0.2 },

    label: { fontSize: 12, fontWeight: '700', color: T.muted, marginTop: 10, marginBottom: 4 },
    required: { color: T.red },
    input: { borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: T.ink, backgroundColor: T.surface, marginBottom: 4 },
    inputDisabled: { borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: T.muted, backgroundColor: T.alt, marginBottom: 4 },

    measurementRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    measurementRowCompact: { flexDirection: 'column', gap: 0, marginTop: 0 },
    measurementField: { flex: 1, minWidth: 0 },
    measurementFieldCompact: { width: '100%' },

    sectionDivider: { height: 1, backgroundColor: T.border, marginVertical: 20 },

    mendingRow: { marginTop: 16, padding: 12, borderRadius: 16, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    mendingTitle: { color: T.ink, fontWeight: '900' },
    mendingSub: { color: T.muted, fontSize: 12, marginTop: 2 },

    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    actionButtonStack: { flexDirection: 'column', gap: 10 },
    fullWidthBtn: { flex: undefined, width: '100%', alignSelf: 'stretch', marginTop: 0 },
    submitBtn1: { flex: 1, backgroundColor: T.nav, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 13 },
    printBtn: { backgroundColor: T.nav, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    actionText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    printIconBtn: { backgroundColor: T.nav, padding: 8, borderRadius: 8, marginBottom: 8, alignItems: 'center' },
    deleteIconBtn: { backgroundColor: T.red, padding: 8, borderRadius: 8, alignItems: 'center' },
    deleteIconBtnDisabled: { backgroundColor: T.muted, opacity: 0.6 },

    manualOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, elevation: 9999 },

    modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 25 },
    printerSheet: { backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 16 },
    modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', color: T.ink },
    searchInput: { borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, marginVertical: 12, color: T.ink },
    printerRow: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 8 },
    printerRowActive: { borderColor: T.nav, backgroundColor: T.sub },
    printConfirmBtn: { backgroundColor: T.nav, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },

    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    closeButton: { padding: 8 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    billCard: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    billTitle: { fontSize: 15, fontWeight: '900', color: T.ink },
    subText: { fontSize: 12, color: T.muted, marginTop: 3 },

    deleteBox: { width: '100%', backgroundColor: T.surface, borderRadius: 18, padding: 20 },
    deleteBtn: { flex: 1, padding: 13, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
});
