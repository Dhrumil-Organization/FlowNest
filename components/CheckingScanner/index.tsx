import CustomPicker from '@/common/CustomPicker';
import { checkingScannerStyles } from '@/common/Style';
import { useFaults } from '@/common/useFaults';
import { showError, showSuccess } from '@/common/utils/snackbar';
import HeaderBarwithBack from '@/components/Header';
import PartyDropdown from '@/Shared/PartyDropdown';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { API, PRINTSTICKER } from '../../common/API/dynamicAPI';
import FaultsModal from './FaultsModal';
import ScannerFaultsModal from './ScannerFaultsModal';

interface Props {
    token: string;
    username: string;
}

const MANUAL_CHECKER_KEY = 'manual_checker';
const QR_CHECKER_KEY = 'qr_checker';

const CheckingScanner: React.FC<Props> = ({ token, username }) => {

    const { width } = useWindowDimensions();

    const isCompactScreen = width < 360;
    const isTablet = width >= 768;

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

    const [isLastTaka, setIsLastTaka] = useState(false);

    // Manual checkbox
    const [manualIsLastTaka, setManualIsLastTaka] = useState(false);

    const [getPrinters, setPrinters] = useState<any[]>([]);
    const [printer, setPrinter] = useState('');
    const [printerLoading, setPrinterLoading] = useState(false);
    const [printerError, setPrinterError] = useState('');
    const [printerModalVisible, setPrinterModalVisible] = useState(false);
    const [selectedPrinterStatus, setSelectedPrinterStatus] = useState('');
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
    const [manualSaveLoading, setManualSaveLoading] = useState(false);

    const [manualOperatorData, setManualOperatorData] = useState<any[]>([]);
    const [selectedManualOperator, setSelectedManualOperator] = useState<any>(null);
    // 
    const [faultSaveLoading, setFaultSaveLoading] = useState(false);
    const {
        faultsData,
        setFaultsData,
        faultsLoading,
        showFaultsModal,
        setShowFaultsModal,
        handleSaveFaults,
    } = useFaults(token);

    const [form, setForm] = useState<any>({
        selectedMachine: null,
        ShfCode: '',
        ChkDate: new Date().toISOString().split('T')[0],
        YearNo: '',
        BeamNo: '',
        UId: '',
        d2: [],
        // Add other form fields as needed
    });

    const [scannerFaultModal, setScannerFaultModal] = useState(false);
    const [scannerFaultLoading, setScannerFaultLoading] = useState(false);
    const [scannerFaultData, setScannerFaultData] = useState<any[]>([]);
    const [selectedScannerRow, setSelectedScannerRow] = useState<any>(null);


    let cancelToken: any;

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

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
        setIsLastTaka(false);
        setPrinter('');
        setPrinters([]);
        setDataSaved(false);
        setSavedData({});

        // 👇 NEW
        setForm({
            selectedMachine: null,
            ShfCode: '',
            ChkDate: new Date().toISOString().split('T')[0],
            YearNo: '',
            BeamNo: '',
            UId: '',
            d2: [],
        });
        setFaultsData([]);
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
        console.log('📦 Raw QR Value 👉', value);
        setScannedValue(value);

        try {
            const parsed = JSON.parse(value);
            setScannedObj(parsed);
            setBeamNo(parsed.beamno || '');
            setTakaNo(parsed.takano || '');

            // 👇 NEW: form ko scan ki value se bharo (faults API isi form ko use karti hai)
            setForm((prev: any) => ({
                ...prev,
                ShfCode: '',
                ChkDate: new Date().toISOString().split('T')[0],
                YearNo: parsed.yearno || getCurrentFinancialYear(),
                BeamNo: parsed.beamno || '',
                BeamUId: parsed.beamuid || '',
                UId: parsed.UId || '',
                PrpCode: parsed.prpcode || '',
                TakaNo: parsed.takano || '',
                isfirsttaka: parsed.isfirsttaka,
                islasttaka: parsed.islasttaka,
                d2: [],
            }));
            setFaultsData([]);

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
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        txntype: 'beam_checking_tablet',
                        referrer: 'dashboard',
                        fetch: 'grd',
                        prpcode: qrValue.prpcode,
                        yearno: yno,
                    },
                })
            );

            console.log('grade response:', response);

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
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        txntype: 'beam_checking_tablet',
                        referrer: 'dashboard',
                        fetch: 'prodrepackchkby',
                        prpcode: qrValue.prpcode,
                        yearno: yno,
                    },
                })
            );

            console.log('checker response:', response);

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
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        txntype: 'beam_checking_tablet',
                        referrer: 'dashboard',
                        fetch: 'shift',
                        prpcode: qrValue.prpcode,
                        yearno: yno,
                        prptype: userPtype
                    },
                })
            );

            console.log('Shift response:', response);

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
        // if (cancelToken?.cancel) cancelToken.cancel();
        // cancelToken = axios.CancelToken.source();
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            const yno = await AsyncStorage.getItem('yno');
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        txntype: 'chekingScanner',
                        fetch: 'operator',
                        prpcode: qrValue.prpcode,
                        yearno: yno,
                        prptype: userPtype
                    },
                })
            );

            console.log('operator response:', response);

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

            console.log('sendScannedValue infoPyload:', infoPyload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/get_auto_checking_help`, infoPyload, { headers });

            console.log('sendScannedValue response:', response);

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
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            console.log('sendScannedValue1 infoPyload:', infoPyload);

            const response = await axios.post(`${API}/api/get_auto_checking_help`, infoPyload, { headers });

            console.log('sendScannedValue1 response:', response);

            const dataArr = response.data.response.data || [];
            if (response.data.success) {
                if (dataArr.length > 0) {
                    setDesigndata(dataArr);
                    setWarpLen(dataArr[0].WarpLen || '0');

                    // setForm((prev: any) => ({
                    //     ...prev,
                    //     UId: dataArr[0].UId || prev.UId,
                    //     MacCode: dataArr[0].MacCode,
                    //     MacGrp: dataArr[0].MacGrp,
                    //     DsnCode: dataArr[0].DsnCode,
                    // }));
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
        // if (!operator) return Alert.alert('Operator can not be blank.');

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
                ShfCode: shift,
                SrNo: '0',
                // islasttaka: getScannedObj.islasttaka,
                islasttaka: isLastTaka ? 1 : 0,
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
                OprCode: operator || '',
                d2: form.d2 || [],
            };

            console.log('handleSubmitScan payloadObj:', payloadObj);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/add_auto_checking_detail`, payloadObj, { headers });

            console.log('handleSubmitScan response:', response);

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
                setFaultsData([]);                              // 👈 NEW
                setForm((prev: any) => ({ ...prev, d2: [] }));   // 👈 NEW
                showSuccess('Saved successfully', { text: 'OK', onPress: () => { } });
            } else {
                setDataSaved(false);
                showError(response.data.message || 'Save failed', { text: 'OK', onPress: () => { } });
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

    const getPrintersUrl = () => `${String(API).replace(/\/$/, '')}/api/printers`;

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
        setSelectedPrinterStatus(item?.StatusText || 'Idle');
        AsyncStorage.setItem('lastSelectedPrinter', printerName);
        if (!pendingPrintItem) setPrinterModalVisible(false);
    };

    const getPrinterStatusColor = (statusText: string) => {
        if (!statusText || statusText === 'Idle' || statusText === 'Online') return '#16A34A';
        if (statusText === 'Offline') return '#DC2626';
        return '#6B7280';
    };

    const postPrintSticker = async (params: any) =>
        axios.post(PRINTSTICKER, params, { headers: getPrinterHeaders(), timeout: 30000 });

    const buildStickerParams = (rowData: any, printerName: string) => ({
        data: [rowData],
        IskgQty: 0,
        printype: 'Print',
        PrintFormat: 4,
        printerName: printerName || printer || '',
        txntype: 'chekingScanner',
    });

    const printStickerForData = async (rowData: any) => {
        const printerName = printer || '';
        if (!printerName) return Alert.alert('Printer Required', 'Please select printer first.');
        if (!rowData || Object.keys(rowData).length === 0)
            return Alert.alert('Print Error', 'Sticker data is empty.');
        console.log("rowdata", rowData, printerName);
        setIsLoading(true);
        try {
            console.log("buildStickerParams", buildStickerParams);
            const response = await postPrintSticker(buildStickerParams(rowData, printerName));
            const res = response.data || {};

            console.log("response", response);
            if (res.success) {
                showSuccess(`✅ ${res.printed || 1} label(s) sent to printer.`, { text: 'OK', onPress: () => { } });
                setPrinterModalVisible(false);
                setPendingPrintItem(null);
            } else {
                showError(res.message || 'Print failed', { text: 'OK', onPress: () => { } });
            }
        } catch (error: any) {
            showError(
                error?.response?.data?.message || error?.response?.data?.error || error.message || 'Print failed',
                { text: 'OK', onPress: () => { } }
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
            const res = await axios.get(getPrintersUrl(), { headers: getPrinterHeaders(), timeout: 30000 });
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

            console.log('fetchdesign infoPyload:', infoPyload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/get_auto_checking_design_help`, infoPyload, { headers });

            console.log('fetchdesign response:', response);

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

            console.log('BeamNoHelp payload:', payload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/get_auto_checking_help`, payload, { headers });

            console.log('BeamNoHelp response:', response);

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

            console.log('fetchDesignHelp payload:', payload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/get_auto_checking_help`, payload, { headers });

            console.log('fetchDesignHelp response:', response);

            console.log(
                "response.data.response.design",
                response.data.response.design
            );

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
                // setdesigndata(response.data.response.design || []);
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

    console.log('getdesigndata', getdesigndata);

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

            console.log('manualDesignSelect infoPayload:', infoPayload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/get_auto_checking_help`, infoPayload, { headers });

            console.log('manualDesignSelect response:', response);

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
            const base = { referrer: 'dashboard', prpcode: '', yearno: yno, prptype: userPtype };
            const [gradeRes, checkerRes, operatorRes, shiftRes] = await Promise.all([
                axios.get(
                    `${API}/api/get_criterion`,
                    getRequestConfig({ params: { ...base, txntype: 'manual_checking', fetch: 'grd' } })
                ),
                axios.get(
                    `${API}/api/get_criterion`,
                    getRequestConfig({ params: { ...base, txntype: 'manual_checking', fetch: 'prodrepackchkby' } })
                ),
                axios.get(
                    `${API}/api/get_criterion`,
                    getRequestConfig({ params: { ...base, txntype: "manual_checking", fetch: "operator", }, })
                ),
                axios.get(
                    `${API}/api/get_criterion`,
                    getRequestConfig({ params: { ...base, txntype: 'manual_checking', fetch: 'shift' } })
                ),
            ]);

            console.log('fetchManualGradeCheckerOperatorShift gradeRes response:', gradeRes);
            console.log('fetchManualGradeCheckerOperatorShift checkerRes response:', checkerRes);
            console.log('fetchManualGradeCheckerOperatorShift shiftRes response:', shiftRes);

            console.log('fetchManualGradeCheckerOperatorShift operatorRes payload:', getRequestConfig({ params: { ...base, txntype: 'manual_checking', fetch: 'shift' } }));
            console.log('fetchManualGradeCheckerOperatorShift operatorRes response:', operatorRes);

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


    const fetchManualShift = async (prpcode: string) => {
        try {
            const yno = await AsyncStorage.getItem('yno');
            const userPtype = await AsyncStorage.getItem('user_prptype');

            const payload = {
                referrer: 'dashboard',
                prpcode: prpcode || '',
                yearno: yno,
                prptype: userPtype,
                txntype: 'manual_checking',
                fetch: 'shift',
            };

            console.log('fetchManualShift payload:', payload);

            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: payload,
                })
            );

            console.log('fetchManualShift response:', response);

            if (
                response?.data?.success &&
                response.data.response?.data?.length > 0
            ) {
                setManualShiftData(response.data.response.data);
            } else {
                setManualShiftData([]);
                setManualShift('');
            }

        } catch (error) {
            console.log('fetchManualShift error:', error);
            setManualShiftData([]);
            setManualShift('');
        }
    };

    const soshow = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        setManualLoading(true);
        try {
            const response = await axios.get(
                `${API}/api/get_manual_checking_detail`,
                getRequestConfig({
                    params: {
                        prptype: userPtype,
                        yearno: getCurrentFinancialYear(),
                        txntype: 'manual_checking',
                        MacCode: '',
                        TakaNo: '',
                    },
                })
            );

            console.log('soshow response:', response);

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

    const handlesave = async (form: any) => {
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
                d2: form.d2 || [],
            };

            console.log('handlesave payloadObj:', payloadObj);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/add_auto_checking_detail`, payloadObj, { headers });

            console.log('handlesave response:', response);

            if (response.data.success === true) {
                Alert.alert('Success', 'Data Saved Successfully ✅', [
                    {
                        text: 'OK',
                        onPress: async () => {
                            handleClearForm();
                            await BeamNoHelp();
                            await soshow();
                        },
                    },
                ]);
                setFaultsData([]);
                // setFormState({ values: { ...FormState.values, TakaNo: '' } });
                setForm({ d2: [] });
            } else {
                showError(`⚠️ ${response.data.message}`, { text: 'OK', onPress: () => { } });
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

            const response = await axios.get(
                `${API}/api/show_beam_checking`,
                getRequestConfig({
                    params: {
                        prptype: userPtype,
                        yearno: getCurrentFinancialYear(),
                        txntype: 'cheking_scanner_list',
                        ShfCode: '',
                        ChkDate: '',
                        PrpCode: '',
                        BeamNo: '',
                        EMode: mode,
                    },
                    cancelToken: cancelToken?.token,
                })
            );

            console.log('handleScannerList response:', response);

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

    // const handledelete = async () => {
    //     try {
    //         setShowDeleteAlert(false);
    //         if (!selectedDeleteItem) return;    
    //         setIsDeleteLoading(true);

    //         const infoPyload = {
    //             ShfCode: selectedDeleteItem?.ShfCode || '',
    //             ChkDate: selectedDeleteItem?.ChkDate || '',
    //             MacGrp: selectedDeleteItem?.MacGrp || '',
    //             PrpCode: selectedDeleteItem?.PrpCode || '',
    //             yearno: selectedDeleteItem?.yearno || getCurrentFinancialYear(),
    //             txntype: 'chekingScanner',
    //             SrNo: selectedDeleteItem?.SrNo || '',
    //             UId: selectedDeleteItem?.UId || '',
    //             BeamNo: selectedDeleteItem?.BeamNo || '',
    //         };

    //         console.log('handledelete infoPyload:', infoPyload);

    //         const headers = {
    //             Authorization: `Bearer ${getToken()}`,
    //             'Content-Type': 'application/json',
    //             'X-Requested-with': 'XMLHttpRequest',
    //         };

    //         const response = await axios.post(`${API}/api/delete_checking_detail`, infoPyload, { headers });

    //         console.log('handledelete response:', response);

    //         // if (response.data.success) {
    //         //     Alert.alert('Success', response.data.message || 'Record deleted successfully');
    //         //     await handleScannerList();
    //         // } 
    //         if (response.data.success) {
    //             Alert.alert(
    //                 'Success',
    //                 response.data.message || 'Delete successfully',
    //                 [
    //                     {
    //                         text: 'OK',
    //                         onPress: async () => {
    //                             await handleScannerList(); // Browse API
    //                         },
    //                     },
    //                 ],
    //                 { cancelable: false }
    //             );
    //         }
    //         else {
    //             Alert.alert('Warning', response.data.message);
    //         }
    //     } catch (error) {
    //         Alert.alert('Error', 'Something went wrong');
    //     } finally {
    //         setIsDeleteLoading(false);
    //     }
    // };


    const clearAndSaveFaultsForRow = async (row: any) => {
        try {
            const payload = getScannerFaultPayload(row);

            // const faultRes = await axios.post(
            //     `${API}/api/show_checking_fault`,
            //     payload,
            //     { headers: getScannerFaultHeaders() }
            // );
            const faultRes = await axios.get(`${API}/api/show_checking_fault`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                params: payload,
            });

            const list = faultRes?.data?.data || faultRes?.data?.response?.data || [];
            if (!list.length) return;

            // 👇 sabhi records ki Remark value empty kar do
            const clearedData = list.map((item: any) => ({ ...item, Remark: '' }));

            const savePayload = {
                ShfCode: row?.ShfCode || '',
                ChkDate: row?.ChkDate || '',
                MacGrp: row?.MacGrp || '',
                PrpCode: row?.PrpCode || '',
                BeamNo: row?.BeamNo || '',
                SrNo: row?.SrNo || '',
                UId: row?.UId || '',
                yearno: getCurrentFinancialYear(),
                txntype: 'beam_checking',
                d1: clearedData,
            };

            // 👇 auto save (cleared) faults
            await axios.post(`${API}/api/add_checking_fault`, savePayload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
        } catch (e) {
            console.log('clearAndSaveFaultsForRow error', e);
        }
    };

    const handledelete = async () => {
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

            console.log('handledelete infoPyload:', infoPyload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const response = await axios.post(`${API}/api/delete_checking_detail`, infoPyload, { headers });

            console.log('handledelete response:', response);

            if (response.data.success) {
                // 👇 delete success hote hi faults fetch -> remark clear -> auto save
                await clearAndSaveFaultsForRow(selectedDeleteItem);

                showSuccess(response.data.message || 'Delete successfully', { text: 'OK', onPress: () => { } });

                await handleScannerList(); // list refresh
            } else {
                showError(response.data.message || 'Delete failed', { text: 'OK', onPress: () => { } });
            }
        } catch (error) {
            console.log('handledelete error', error);
            showError('Something went wrong', { text: 'OK', onPress: () => { } });
        } finally {
            setIsDeleteLoading(false);
            setSelectedDeleteItem(null);
        }
    };
    const openPrinterForScannerRow = async (item: any) => {
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
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007EA7" />
                <Text>Initializing camera...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.centered, { padding: 20 }]}>
                <Icon name="camera-alt" size={60} color="#999" />
                <Text style={{ marginTop: 15, fontSize: 16, textAlign: 'center' }}>
                    Camera permission is required
                </Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderShiftPicker1 = (
        items: any[],
        value: string,
        onChange: (val: string, item?: any) => void
    ) => (
        <CustomPicker selectedValue={value} onValueChange={(val) => {
            const item = items.find((x) => x.ShfCode === val);
            onChange(val, item);
        }}>
            <CustomPicker.Item label="Select shift" value="" enabled={false} />
            {items.map((item, i) => (
                <CustomPicker.Item key={i} label={item.ShfName} value={item.ShfCode} />
            ))}
        </CustomPicker>
    );

    console.log('Fault Data: ', form, FormState);

    const renderShiftPicker = (
        items: any[],
        value: string,
        onChange: (val: string, item?: any) => void
    ) => (
        <View style={styles.shiftPickerContainer}>
            <CustomPicker
                selectedValue={value}
                onValueChange={(val) => {
                    const item = items.find(x => x.ShfCode === val);
                    onChange(val, item);
                }}
            >
                <CustomPicker.Item
                    label="Select shift"
                    value=""
                    enabled={false}
                />

                {items.map((item, i) => (
                    <CustomPicker.Item
                        key={i}
                        label={item.ShfName}
                        value={item.ShfCode}
                    />
                ))}
            </CustomPicker>
        </View>
    );

    const getScannerFaultHeaders = () => ({
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    });

    const getScannerFaultPayload = (row: any) => ({
        ShfCode: row?.ShfCode || '',
        ChkDate: row?.ChkDate || '',
        MacGrp: row?.MacGrp || '',
        PrpCode: row?.PrpCode || '',
        yearno: row?.yearno || getCurrentFinancialYear(),
        BeamNo: row?.BeamNo || '',
        UId: row?.UId || '',
        SrNo: row?.SrNo || '',
        txntype: 'beam_checking',
    });

    const fetchScannerFaults = async (row: any) => {
        try {

            setScannerFaultLoading(true);

            const payload = getScannerFaultPayload(row);

            console.log("fetchScannerFaults Payload", payload);

            const response = await axios.post(
                `${API}/api/show_checking_fault`,
                payload,
                {
                    headers: getScannerFaultHeaders(),
                }
            );

            console.log(
                "fetchScannerFaults Response",
                response.data
            );

            if (response.data.success) {

                setScannerFaultData(
                    response?.data?.data ||
                    response?.data?.response?.data ||
                    []
                );

            } else {

                setScannerFaultData([]);

                showError(response.data.message);

            }

        } catch (error) {

            console.log("fetchScannerFaults Error", error);

            showError("Unable to fetch faults.");

        } finally {

            setScannerFaultLoading(false);

        }
    };

    const openScannerFault = (item: any) => {

        setSelectedScannerRow(item);

        setScannerFaultModal(true);

    };

    const saveScannerFault = async (updatedFaults: any[]) => {

        if (!selectedScannerRow) return;

        try {

            setScannerFaultLoading(true);

            const payload = {

                ShfCode: selectedScannerRow.ShfCode,
                ChkDate: selectedScannerRow.ChkDate,
                MacGrp: selectedScannerRow.MacGrp,
                PrpCode: selectedScannerRow.PrpCode,
                // yearno: selectedScannerRow.yearno,
                BeamNo: selectedScannerRow.BeamNo,
                SrNo: selectedScannerRow.SrNo,
                UId: selectedScannerRow.UId,
                yearno: getCurrentFinancialYear(),

                txntype: "beam_checking",

                d1: updatedFaults,

            };

            console.log(
                "Scanner Fault Save Payload",
                payload
            );

            const response = await axios.post(
                `${API}/api/add_checking_fault`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                }
            );

            console.log(response.data);

            if (response.data.success) {

                setScannerFaultModal(false);

                await handleScannerList();

                showSuccess(
                    response.data.message ||
                    "Fault Saved Successfully",
                    {
                        text: "OK",
                    }
                );

            } else {

                showError(
                    response.data.message ||
                    "Save Failed"
                );

            }

        } catch (e) {

            console.log(e);

            showError("Unable to save faults.");

        } finally {

            setScannerFaultLoading(false);

        }

    };

    return (
        <>
            {/* <SafeAreaView
                edges={['top']}
                style={{ backgroundColor: '#007EA7' }}
            /> */}

            <StatusBar
                style="light"
                backgroundColor="#007EA7"
                translucent={false}
            />
            <SafeAreaView
                edges={['top']}
                style={{ flex: 1, backgroundColor: '#007EA7' }}
            >
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    {isLoading && (
                        <View style={styles.manualOverlay}>
                            <ActivityIndicator
                                size="large"
                                color="#fff"
                            />
                        </View>
                    )}

                    {manualLoading && (
                        <View style={styles.manualOverlay}>
                            <ActivityIndicator
                                size="large"
                                color="#fff"
                            />
                        </View>
                    )}

                    <HeaderBarwithBack
                        userName={username}
                        header="Checking scanner"
                        subHeader="scan with QR code"
                        breadcrumb="Checking scanner"
                        SearchBar={false}
                    />

                    <ScrollView
                        style={{ flex: 1, backgroundColor: '#F4F7FB' }}
                        contentContainerStyle={{ padding: 14, paddingBottom: 28 }}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284C7']} tintColor="#0284C7" />
                        }
                    >
                        {/* Tab switcher */}
                        <View style={[styles.tabWrap, isCompactScreen && styles.tabWrapCompact]}>
                            <TouchableOpacity
                                style={[
                                    styles.tabBtn,
                                    isCompactScreen && styles.tabBtnCompact,
                                    showManual && styles.tabBtnActiveManual,
                                ]}
                                onPress={() => {
                                    resetScanFields();
                                    setShowManual(true);
                                    setIsScanning(false);
                                    soshow();
                                }}
                            >
                                <Icon name="edit" size={20} color={showManual ? '#fff' : '#475569'} />
                                <Text style={[styles.tabText, showManual && styles.tabTextActive]}>Manual Entry</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.tabBtn,
                                    isCompactScreen && styles.tabBtnCompact,
                                    !showManual && styles.tabBtnActiveScanner,
                                ]}
                                onPress={() => setShowManual(false)}
                            >
                                <Icon name="qr-code-scanner" size={20} color={!showManual ? '#fff' : '#475569'} />
                                <Text style={[styles.tabText, isCompactScreen && styles.tabTextCompact, !showManual && styles.tabTextActive,]}>QR Scanner</Text>
                            </TouchableOpacity>
                        </View>

                        {/* QR Scanner tab */}
                        {!showManual && (
                            <>
                                <View style={[styles.scannerBanner, isCompactScreen && styles.scannerBannerCompact]}>
                                    <View style={styles.scannerIconWrap}>
                                        <Icon name="qr-code-scanner" size={31} color="#0369A1" />
                                    </View>
                                    <View style={[styles.measurementField, isCompactScreen && styles.measurementFieldCompact]}>
                                        <Text style={styles.scannerTitle}>QR Scanner</Text>
                                        <Text style={styles.scannerSub}>Point camera to QR code</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.scanBtn, isScanning && { backgroundColor: '#DC2626' }]}
                                        onPress={() => {
                                            resetScanFields();
                                            setIsScanning((prev) => !prev);
                                        }}
                                    >
                                        <Icon name={isScanning ? 'stop-circle' : 'photo-camera'} size={20} color="#fff" />
                                        <Text
                                            style={[
                                                styles.scanBtnText,
                                                isCompactScreen && styles.tabTextCompact,
                                            ]}
                                        >
                                            {isScanning ? 'STOP' : 'SCAN'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {isScanning && (
                                    <View style={checkingScannerStyles.cameraContainer}>
                                        <CameraView
                                            style={checkingScannerStyles.camera}
                                            facing="back"
                                            onBarcodeScanned={handleBarCodeScanned}
                                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                                        />
                                        <View style={checkingScannerStyles.overlay}>
                                            <View style={checkingScannerStyles.scanBox} />
                                        </View>
                                    </View>
                                )}

                                <View style={styles.card}>
                                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                            <Icon name="inventory-2" size={20} color="#0369A1" />
                                        </View>
                                        <Text style={{ color: "#075985", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>FABRIC INFO</Text>
                                    </View>
                                    <Text style={checkingScannerStyles.label}>Beam Number <Text style={{ color: 'red' }}>*</Text></Text>
                                    <TextInput style={checkingScannerStyles.inputDisabled} value={beamNo} editable={false} />

                                    <Text style={checkingScannerStyles.label}>Taka No <Text style={{ color: 'red' }}>*</Text></Text>
                                    <TextInput style={checkingScannerStyles.inputDisabled} value={takaNo} editable={false} />

                                    <Text style={checkingScannerStyles.label}>Design <Text style={{ color: 'red' }}>*</Text></Text>
                                    <PartyDropdown
                                        data={getData}
                                        placeholder="Choose design..."
                                        labelKey={['dsnname', 'dsncode']}
                                        valueKey="dsncode"
                                        pageSize={12}
                                        selected={selecteddesign}
                                        loading={false}
                                        type="checkingdesigndata"
                                        onSelect={(item) => {
                                            setselecteddesign(item);
                                            setDesign(item.dsncode);
                                            if (scannedValue) sendScannedValue1(scannedValue, item.dsncode);
                                        }}
                                        setSelected={(val) => {
                                            if (!val) {
                                                setDesign('');
                                                setWarpLen('0');
                                            } else {
                                                setDesign(val.dsncode);
                                                setWarpLen(val.WarpLen || '0');
                                            }
                                        }}
                                    />

                                    <View style={styles.sectionDivider} />

                                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                            <Icon name="settings" size={20} color="#059669" />
                                        </View>
                                        <Text style={{ color: "#047857", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>PRODUCTION DETAILS</Text>
                                    </View>

                                    <View
                                        style={[
                                            styles.measurementRow,
                                            isCompactScreen && styles.measurementRowCompact,
                                        ]}
                                    >
                                        <View style={[styles.measurementField, isCompactScreen && styles.measurementFieldCompact]}>
                                            <Text style={checkingScannerStyles.label}>
                                                Meter <Text style={{ color: 'red' }}>*</Text>
                                                {parseFloat(getWarpLen) > 0 ? ` [${getWarpLen}]` : ''}
                                            </Text>
                                            <TextInput style={checkingScannerStyles.input} value={meter} keyboardType="decimal-pad" onChangeText={handleMeterChange} />
                                        </View>
                                        <View style={[styles.measurementField, isCompactScreen && styles.measurementFieldCompact]}>
                                            <Text style={checkingScannerStyles.label}>Kgs <Text style={{ color: 'red' }}>*</Text></Text>
                                            <TextInput style={checkingScannerStyles.input} value={kgs} keyboardType="decimal-pad" onChangeText={handleKgsChange} />
                                        </View>
                                    </View>

                                    <Text style={checkingScannerStyles.label}>Avg. Wt</Text>
                                    <TextInput style={checkingScannerStyles.inputDisabled} value={getavgWt} editable={false} />

                                    <View style={styles.sectionDivider} />

                                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                            <Icon name="verified" size={20} color="#B45309" />
                                        </View>
                                        <Text style={{ color: "#92400E", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>QUALITY DETAILS</Text>
                                    </View>

                                    <Text style={checkingScannerStyles.label}>Grade <Text style={{ color: 'red' }}>*</Text></Text>
                                    <PartyDropdown
                                        data={getGradeData}
                                        placeholder="Choose grade..."
                                        labelKey={['GrdName', 'GrdCode']}
                                        valueKey="GrdCode"
                                        pageSize={12}
                                        selected={selectedGrade}
                                        loading={false}
                                        type="grd"
                                        onSelect={(item) => {
                                            setSelectedGrade(item);
                                            setGrade(item.GrdCode);
                                        }}
                                    />

                                    <Text style={checkingScannerStyles.label}>Checker <Text style={{ color: 'red' }}>*</Text></Text>
                                    <PartyDropdown
                                        data={getCheckerData}
                                        placeholder="Choose checker..."
                                        labelKey={['EmpName', 'EmpCode']}
                                        valueKey="EmpCode"
                                        pageSize={12}
                                        selected={selectedChecker}
                                        loading={false}
                                        type="checker"
                                        onSelect={(item) => {
                                            setSelectedChecker(item);
                                            setChecker(item.EmpCode);
                                        }}
                                    />

                                    {/* <Text style={checkingScannerStyles.label}>operator <Text style={{ color: 'red' }}>*</Text></Text>
                                    <PartyDropdown
                                        data={getOperatorData}
                                        placeholder="Choose Operator..."
                                        labelKey={["OprName", "OprCode"]}
                                        valueKey="OprCode"
                                        pageSize={12}
                                        selected={selectedOperator}
                                        loading={false}
                                        type="operator"
                                        onSelect={(item) => {
                                            setSelectedOperator(item);
                                            setOperator(item.OprCode);
                                        }}
                                    /> */}

                                    <Text style={checkingScannerStyles.label}>Shift <Text style={{ color: 'red' }}>*</Text></Text>
                                    {/* {renderShiftPicker(getShiftData, shift, (val) => setShift(val))} */}
                                    {renderShiftPicker(getShiftData, shift, (val) => {
                                        setShift(val);
                                        setForm((prev: any) => ({ ...prev, ShfCode: val }));   // 👈 NEW
                                    })}

                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginTop: 12,
                                        }}
                                    >
                                        <TouchableOpacity
                                            onPress={() => setIsLastTaka(!isLastTaka)}
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderWidth: 2,
                                                borderColor: isLastTaka ? '#007EA7' : '#94A3B8',
                                                borderRadius: 4,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: isLastTaka ? '#007EA7' : '#FFFFFF',
                                            }}
                                        >
                                            {isLastTaka && (
                                                <Icon
                                                    name="check"
                                                    size={16}
                                                    color="#FFFFFF"
                                                />
                                            )}
                                        </TouchableOpacity>

                                        <Text
                                            style={{
                                                marginLeft: 8,
                                                fontSize: 14,
                                                fontWeight: '700',
                                                color: '#0F172A',
                                            }}
                                        >
                                            Is Last Taka
                                        </Text>
                                    </View>

                                    <View
                                        style={{
                                            marginTop: 16,
                                            padding: 12,
                                            borderRadius: 16,
                                            backgroundColor: "#F8FAFC",
                                            borderWidth: 1,
                                            borderColor: "#E2E8F0",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isMending ? "#DBEAFE" : "#E2E8F0", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                                <Icon name="build" size={19} color={isMending ? "#1D4ED8" : "#64748B"} />
                                            </View>
                                            <View>
                                                <Text style={{ color: "#0F172A", fontWeight: "900" }}>Mending Entry</Text>
                                                <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>{isMending ? "This taka requires mending" : "Normal checking entry"}</Text>
                                            </View>
                                        </View>
                                        <Switch value={isMending} onValueChange={setIsMending} trackColor={{ false: "#CBD5E1", true: "#93C5FD" }} thumbColor={isMending ? "#0284C7" : "#FFFFFF"} />
                                    </View>

                                    <View
                                        style={[
                                            checkingScannerStyles.buttonRow,
                                            isCompactScreen && styles.actionButtonStack,
                                        ]}
                                    >
                                        <View style={{ flexDirection: 'row', gap: 5 }} >
                                            <TouchableOpacity style={checkingScannerStyles.submitBtn1} onPress={() => handleScannerList('S')}>
                                                <Text style={checkingScannerStyles.submitText}>Scanner List</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={checkingScannerStyles.submitBtn1}
                                                onPress={() => handleSaveFaults(form, FormState)}
                                                disabled={faultsLoading}
                                            >
                                                <Text style={styles.buttonText}>
                                                    {/* {faultsLoading ? 'Loading...' : `Select Faults [${form.d2?.length || 0}]`} */}
                                                    {faultsLoading ? 'Loading...' : `Faults`}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        {/* <TouchableOpacity style={checkingScannerStyles.submitBtn1} onPress={handleSubmitScan}>
                                            <Text style={checkingScannerStyles.submitText}>Save Entry</Text>
                                        </TouchableOpacity> */}
                                    </View>
                                    <TouchableOpacity style={[{ marginTop: 12 }, checkingScannerStyles.submitBtn1]} onPress={handleSubmitScan}>
                                        <Text style={checkingScannerStyles.submitText}>Save Entry</Text>
                                    </TouchableOpacity>

                                    {getDataSaved && (
                                        <View style={{ marginTop: 12 }}>
                                            <TouchableOpacity
                                                style={checkingScannerStyles.printBtn}
                                                onPress={() => {
                                                    setPendingPrintItem(null);
                                                    if (getPrinters.length === 0) getAllPrinters();
                                                    setPrinterModalVisible(true);
                                                }}
                                            >
                                                <Text style={checkingScannerStyles.actionText}>
                                                    {printer ? `Print (${printer})` : 'Select Printer & Print'}
                                                </Text>
                                            </TouchableOpacity>
                                            {!!printer && (
                                                <TouchableOpacity style={[checkingScannerStyles.printBtn, { marginTop: 8 }]} onPress={printSticker}>
                                                    <Text style={checkingScannerStyles.actionText}>Print Sticker</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </>
                        )}

                        {/* Manual Entry tab - inline (no modal) */}
                        {showManual && (
                            <View style={styles.card}>
                                {/* {manualLoading && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: 'rgba(0,0,0,0.25)',
                                            zIndex: 999,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            borderRadius: 22,
                                        }}
                                    >
                                        <ActivityIndicator
                                            size="large"
                                            color="#fff"
                                        />
                                    </View>
                                )} */}
                                <>
                                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                            <Icon name="inventory-2" size={20} color="#0369A1" />
                                        </View>
                                        <Text style={{ color: "#075985", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>FABRIC INFO</Text>
                                    </View>
                                    <Text style={checkingScannerStyles.label}> Beam No<Text style={{ color: 'red' }}>*</Text></Text>
                                    <PartyDropdown
                                        data={manualBeamData}
                                        placeholder="Select Beam No"
                                        labelKey="BeamNo"
                                        valueKey="BeamNo"
                                        selected={selectedBeam}
                                        loading={false}
                                        type="beam"
                                        onSelect={(item) => {
                                            setSelectedBeam(item);
                                            setForm((prev) => ({
                                                ...prev.values,
                                                BeamNo: item.BeamNo,
                                                BeamUId: item.BeamUId,
                                                UId: item.UId,
                                                // YearNo: item.YearNo,
                                                ChkDate: form?.ChkDate,
                                                PrpCode: item.PrpCode,
                                                YearNo: getCurrentFinancialYear(),
                                            }));
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
                                            fetchManualShift(item.PrpCode);
                                        }}
                                    />

                                    <Text style={checkingScannerStyles.label}>Taka No <Text style={{ color: 'red' }}>*</Text></Text>
                                    <TextInput
                                        style={checkingScannerStyles.input}
                                        value={FormState.values.TakaNo}
                                        onChangeText={(text) => handleChange('TakaNo', text)}
                                        maxLength={20}
                                    />

                                    <Text style={checkingScannerStyles.label}>Design <Text style={{ color: 'red' }}>*</Text></Text>
                                    {/* <Text>
                                            Design Count : {getdesigndata.length}
                                        </Text>
                                        {getdesigndata.map((item, index) => (
                                            <Text key={index}>
                                                {item.dsncode} - {item.dsnname}
                                            </Text>
                                        ))} */}
                                    <PartyDropdown
                                        data={getdesigndata}
                                        placeholder="Choose Design..."
                                        labelKey={["dsnname", "dsncode"]}
                                        valueKey="dsncode"
                                        pageSize={12}
                                        selected={selecteddesign}
                                        loading={false}
                                        type="checkingdesigndata"
                                        onSelect={(item) => {
                                            setselecteddesign(item);
                                            handleChange('DsnCode', item.DsnCode);
                                            handleChange('DsnName', item.DsnName);
                                            manualDesignSelect(item);
                                        }}
                                    />

                                    <View style={styles.sectionDivider} />

                                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                            <Icon name="settings" size={20} color="#059669" />
                                        </View>
                                        <Text style={{ color: "#047857", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>PRODUCTION DETAILS</Text>
                                    </View>

                                    <View
                                        style={[
                                            styles.measurementRow,
                                            isCompactScreen && styles.measurementRowCompact,
                                        ]}
                                    >
                                        <View style={[styles.measurementField, isCompactScreen && styles.measurementFieldCompact]}>
                                            <Text style={checkingScannerStyles.label}>Meter <Text style={{ color: 'red' }}>*</Text></Text>
                                            <TextInput style={checkingScannerStyles.input} value={meter} keyboardType="decimal-pad" onChangeText={handleManualMeterChange} />
                                        </View>
                                        <View style={[styles.measurementField, isCompactScreen && styles.measurementFieldCompact]}>
                                            <Text style={checkingScannerStyles.label}>Kgs <Text style={{ color: 'red' }}>*</Text></Text>
                                            <TextInput style={checkingScannerStyles.input} value={kgs} keyboardType="decimal-pad" onChangeText={handleManualKgsChange} />
                                        </View>
                                    </View>

                                    <Text style={checkingScannerStyles.label}>Avg. Wt</Text>
                                    <TextInput
                                        style={checkingScannerStyles.inputDisabled}
                                        value={getavgWt}
                                        editable={false}
                                    />

                                    <View style={styles.sectionDivider} />

                                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                            <Icon name="verified" size={20} color="#B45309" />
                                        </View>
                                        <Text style={{ color: "#92400E", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>QUALITY DETAILS</Text>
                                    </View>

                                    <Text style={checkingScannerStyles.label}>Grade <Text style={{ color: 'red' }}>*</Text></Text>
                                    <PartyDropdown
                                        data={manualGradeData}
                                        placeholder="Choose grade..."
                                        labelKey={['GrdName', 'GrdCode']}
                                        valueKey="GrdCode"
                                        pageSize={12}
                                        selected={selectedManualGrade}
                                        loading={false}
                                        type="grd"
                                        onSelect={(item) => {
                                            setSelectedManualGrade(item);
                                            handleChange('GrdCode', item.GrdCode);
                                            handleChange('GrdName', item.GrdName);
                                        }}
                                    />

                                    <Text style={checkingScannerStyles.label}>Checker <Text style={{ color: 'red' }}>*</Text></Text>
                                    <PartyDropdown
                                        data={manualCheckerData}
                                        placeholder="Choose checker..."
                                        labelKey={['EmpName', 'EmpCode']}
                                        valueKey="EmpCode"
                                        pageSize={12}
                                        selected={selectedManualChecker}
                                        loading={false}
                                        type="checker"
                                        onSelect={async (item) => {
                                            setSelectedManualChecker(item);
                                            handleChange('ChkCode', item.EmpCode);
                                            handleChange('ChkName', item.EmpName);
                                            await AsyncStorage.setItem(MANUAL_CHECKER_KEY, JSON.stringify(item));
                                        }}
                                    />

                                    {/* <Text style={checkingScannerStyles.label}>Operator <Text style={{ color: "red" }}>*</Text></Text>
                                    <PartyDropdown
                                        data={manualOperatorData}
                                        placeholder="Choose operator."
                                        labelKey={["OprName", "OprCode"]}
                                        valueKey="OprCode"
                                        pageSize={12}
                                        selected={selectedManualOperator}
                                        loading={false}
                                        type="operator"
                                        onSelect={(item) => {
                                            setSelectedManualOperator(item);

                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    OprCode: item?.OprCode,
                                                    OprName: item?.OprName,
                                                },
                                            }));
                                        }}
                                    /> */}

                                    <Text style={checkingScannerStyles.label}>Shift <Text style={{ color: 'red' }}>*</Text></Text>
                                    {renderShiftPicker(manualShiftData, manualShift, (val) => {
                                        setManualShift(val);
                                        handleChange('ShfCode', val);
                                        setForm((prev: any) => ({ ...prev, ShfCode: val }));
                                    })}

                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginTop: 12,
                                        }}
                                    >
                                        <TouchableOpacity
                                            onPress={() =>
                                                handleChange(
                                                    'islasttaka',
                                                    FormState.values.islasttaka ? 0 : 1
                                                )
                                            }
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderWidth: 2,
                                                borderColor: FormState.values.islasttaka
                                                    ? '#007EA7'
                                                    : '#94A3B8',
                                                borderRadius: 4,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: FormState.values.islasttaka
                                                    ? '#007EA7'
                                                    : '#FFFFFF',
                                            }}
                                        >
                                            {FormState.values.islasttaka === 1 && (
                                                <Icon
                                                    name="check"
                                                    size={16}
                                                    color="#FFFFFF"
                                                />
                                            )}
                                        </TouchableOpacity>

                                        <Text
                                            style={{
                                                marginLeft: 8,
                                                fontSize: 14,
                                                fontWeight: '700',
                                                color: '#0F172A',
                                            }}
                                        >
                                            Is Last Taka
                                        </Text>
                                    </View>

                                    <View
                                        style={{
                                            marginTop: 16,
                                            padding: 12,
                                            borderRadius: 16,
                                            backgroundColor: "#F8FAFC",
                                            borderWidth: 1,
                                            borderColor: "#E2E8F0",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isMending ? "#DBEAFE" : "#E2E8F0", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                                <Icon name="build" size={19} color={isMending ? "#1D4ED8" : "#64748B"} />
                                            </View>
                                            <View>
                                                <Text style={{ color: "#0F172A", fontWeight: "900" }}>Mending Entry</Text>
                                                <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>{isMending ? "This taka requires mending" : "Normal checking entry"}</Text>
                                            </View>
                                        </View>
                                        <Switch
                                            value={isMending}
                                            onValueChange={(val) => {
                                                setIsMending(val);
                                                handleChange("ismending", val ? 1 : 0);
                                            }}
                                            trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                                            thumbColor={isMending ? "#0284C7" : "#FFFFFF"}
                                        />
                                    </View>

                                    <View
                                        style={[
                                            checkingScannerStyles.buttonRow,
                                            isCompactScreen && styles.actionButtonStack,
                                        ]}
                                    >
                                        {/* <TouchableOpacity style={[checkingScannerStyles.submitBtn1, { marginTop: 12, height: 50, width: '100%', alignSelf: 'stretch' }]} onPress={handlesave}>
                                                <Text style={checkingScannerStyles.submitText}>Save</Text>
                                            </TouchableOpacity> */}
                                        <View style={{ flexDirection: 'row', gap: 5 }} >
                                            <TouchableOpacity
                                                style={[
                                                    checkingScannerStyles.submitBtn1,
                                                    {
                                                        marginTop: 12,
                                                        height: 50,
                                                        width: '100%',
                                                        alignSelf: 'stretch',
                                                        opacity: manualSaveLoading ? 0.7 : 1,
                                                    },
                                                ]}
                                                onPress={() => handleSaveFaults(form, FormState)}
                                                disabled={faultsLoading}
                                            >
                                                <Text style={styles.buttonText}>
                                                    {/* {faultsLoading ? 'Loading...' : `Select Faults [${form.d2?.length || 0}]`} */}
                                                    {faultsLoading ? 'Loading...' : `Faults`}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[
                                                    checkingScannerStyles.submitBtn1,
                                                    {
                                                        marginTop: 12,
                                                        height: 50,
                                                        width: '100%',
                                                        alignSelf: 'stretch',
                                                        opacity: manualSaveLoading ? 0.7 : 1,
                                                    },
                                                ]}
                                                onPress={() => handlesave(form)}
                                                disabled={manualSaveLoading}
                                            >
                                                {manualSaveLoading ? (
                                                    <ActivityIndicator color="#fff" />
                                                ) : (
                                                    <Text style={checkingScannerStyles.submitText}>Save</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>


                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 5 }} >
                                        <TouchableOpacity style={[checkingScannerStyles.submitBtn1, { backgroundColor: '#999' }, { marginTop: 12, height: 50, width: '100%', alignSelf: 'stretch' }]} onPress={handleClearForm}>
                                            <Text style={checkingScannerStyles.submitText}>Clear</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[checkingScannerStyles.submitBtn1, { marginTop: 12, height: 50, width: '100%', alignSelf: 'stretch' }]}
                                            onPress={() => handleScannerList('M')}
                                        >
                                            <Text style={checkingScannerStyles.submitText}>
                                                Scanner List
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </>

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
                        <View style={styles.modalOverlayBottom}>
                            <View style={styles.printerSheet}>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: 16,
                                    }}
                                >
                                    <View style={{ width: 38 }} />

                                    <Text
                                        style={[
                                            styles.modalTitle,
                                            {
                                                flex: 1,
                                                textAlign: "center",
                                            },
                                        ]}
                                    >
                                        Select Printer
                                    </Text>

                                    <TouchableOpacity
                                        onPress={() => {
                                            setPrinterModalVisible(false);
                                            setPendingPrintItem(null);
                                            setPrinterSearch("");
                                        }}
                                        style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 19,
                                            backgroundColor: "#F1F5F9",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Icon
                                            name="close"
                                            size={24}
                                            color="#374151"
                                        />
                                    </TouchableOpacity>
                                </View>
                                <TextInput
                                    placeholder="Search printer..."
                                    value={printerSearch}
                                    onChangeText={setPrinterSearch}
                                    style={styles.searchInput}
                                />
                                {printerLoading ? (
                                    <ActivityIndicator size="large" color="#007EA7" style={{ marginVertical: 30 }} />
                                ) : (
                                    <FlatList
                                        data={filteredPrinters}
                                        keyExtractor={(item, index) => `${item.Name}-${index}`}
                                        renderItem={({ item }) => {
                                            const active = item.Name === printer;
                                            return (
                                                <TouchableOpacity
                                                    style={[styles.printerRow, active && styles.printerRowActive]}
                                                    onPress={() => selectPrinter(item)}
                                                >
                                                    <Text style={{ fontWeight: '700' }}>{item.Name}</Text>
                                                    <Text style={{ color: getPrinterStatusColor(item.StatusText), fontSize: 11 }}>
                                                        {item.StatusText || 'Idle'}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        }}
                                        ListEmptyComponent={<Text style={{ textAlign: 'center', margin: 20 }}>{printerError || 'No printers'}</Text>}
                                    />
                                )}
                                {!!pendingPrintItem && (
                                    <TouchableOpacity
                                        style={[styles.printConfirmBtn, !printer && { backgroundColor: '#94A3B8' }]}
                                        disabled={!printer}
                                        onPress={() => printStickerForData(pendingPrintItem)}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: '800' }}>Print on {printer || '...'}</Text>
                                    </TouchableOpacity>
                                )}
                                {!pendingPrintItem && !!printer && (
                                    <TouchableOpacity style={styles.printConfirmBtn} onPress={() => setPrinterModalVisible(false)}>
                                        <Text style={{ color: '#fff', fontWeight: '800' }}>Done</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </Modal>

                    <FaultsModal
                        visible={showFaultsModal}
                        data={faultsData}
                        initialFilledData={form.d2 || []}
                        cacheKey={form.UId || ''}
                        fetchData={async (cacheKey: string) => {
                            const params = {
                                UId: cacheKey,
                                SrNo: '0',
                                BeamNo: form.BeamNo || '',
                                ShfCode: FormState.values.ShfCode,
                                ChkDate: form.ChkDate,
                                PrpCode: form.PrpCode || '',
                                yearno: form.YearNo,
                                txntype: 'beam_checking',
                            };
                            const response = await axios.get(`${API}/api/get_checking_fault_help`, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                    Accept: 'application/json',
                                },
                                params,
                            });
                            return response.data.response.data;
                        }}
                        onClose={() => setShowFaultsModal(false)}
                        // onOK={async (updatedData) => {

                        //     try {

                        //         setFaultSaveLoading(true);

                        //         const payload = {
                        //             ShfCode: form.ShfCode,
                        //             ChkDate: form.ChkDate,
                        //             MacGrp: form.MacGrp,
                        //             PrpCode: form.PrpCode,
                        //             yearno: getCurrentFinancialYear(),
                        //             BeamNo: form.BeamNo,
                        //             txntype: "beam_checking",

                        //             d1: updatedData
                        //         };

                        //         console.log("Fault Payload", payload);

                        //         const headers = {
                        //             Authorization: `Bearer ${token}`,
                        //             "Content-Type": "application/json",
                        //             "X-Requested-With": "XMLHttpRequest",
                        //         };

                        //         const response = await axios.post(
                        //             `${API}/api/add_checking_fault`,
                        //             payload,
                        //             { headers }
                        //         );

                        //         console.log(response.data);

                        //         if (response.data.success) {

                        //             setForm(prev => ({
                        //                 ...prev,
                        //                 d2: updatedData,
                        //             }));

                        //             setShowFaultsModal(false);

                        //             showSuccess(
                        //                 response.data.message || "Fault saved successfully",
                        //                 {
                        //                     text: "OK",
                        //                     onPress: () => { }
                        //                 }
                        //             );

                        //         } else {

                        //             showError(
                        //                 response.data.message || "Save failed",
                        //                 {
                        //                     text: "OK",
                        //                     onPress: () => { }
                        //                 }
                        //             );

                        //         }

                        //     } catch (error) {

                        //         console.log(error);

                        //         showError(
                        //             "Something went wrong",
                        //             {
                        //                 text: "OK",
                        //                 onPress: () => { }
                        //             }
                        //         );

                        //     } finally {

                        //         setFaultSaveLoading(false);

                        //     }

                        // }}
                        onOK={(updatedData) => { setForm((prev) => ({ ...prev, d2: updatedData })); setShowFaultsModal(false); }}
                        loading={faultSaveLoading}
                    />

                    <ScannerFaultsModal
                        visible={scannerFaultModal}
                        token={token}
                        rowData={selectedScannerRow}
                        loading={scannerFaultLoading}
                        onClose={() => setScannerFaultModal(false)}
                        onOK={saveScannerFault}
                    />

                    {/* Scanner list modal */}
                    {/* <Modal visible={scannerModal} animationType="slide" onRequestClose={() => setScannerModal(false)}>
                        <View style={{ flex: 1, backgroundColor: '#fff' }}>
                            <View style={checkingScannerStyles.headerContainer}>
                                <View>
                                    <Text style={{ fontSize: 24, fontWeight: '900' }}>Scanner List</Text>
                                    <Text style={{ color: '#777' }}>{scannerCardData.length} items</Text>
                                </View>
                                <TouchableOpacity style={checkingScannerStyles.closeButton} onPress={() => setScannerModal(false)}>
                                    <Icon name="close" size={24} color="#000" />
                                </TouchableOpacity>
                            </View>

                            <View style={checkingScannerStyles.searchContainer}>
                                <Icon name="search" size={22} color="#777" />
                                <TextInput
                                    placeholder="Search scanner data..."
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    style={{ flex: 1, marginLeft: 10, color: '#000' }}
                                />
                            </View>

                            {scannerLoading ? (
                                <View style={styles.centered}>
                                    <ActivityIndicator size="large" color="#007EA7" />
                                </View>
                            ) : (
                                <FlatList
                                    data={filteredData}
                                    keyExtractor={(_, index) => index.toString()}
                                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                                    onEndReached={loadMoreData}
                                    renderItem={({ item }) => (
                                        <View style={checkingScannerStyles.billCard}>
                                            <View style={[styles.measurementField, isCompactScreen && styles.measurementFieldCompact]}>
                                                <Text numberOfLines={1} style={checkingScannerStyles.title}>
                                                    {item.DsnName}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Beam No : {item.BeamNo}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Taka : {item.TakaNo}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Design : {item.OrdDsnName || item.DsnName}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Weight : {item.Wt}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Avg Weight : {item.AvgWt}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Grade : {item.GrdName}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Linked Order No : {item.LinkedOrderNo}
                                                </Text>                                             
                                            </View>
                                            <View>
                                                <TouchableOpacity
                                                    style={{ backgroundColor: '#0369A1', padding: 8, borderRadius: 8, marginBottom: 8 }}
                                                    onPress={() => openPrinterForScannerRow(item)}
                                                >
                                                    <Icon name="local-printshop" size={20} color="#fff" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    disabled={Number(item.islasttakatrack) === 1}
                                                    style={[
                                                        checkingScannerStyles.deleteButton,
                                                        Number(item.islasttakatrack) === 1 && { backgroundColor: '#BDBDBD', opacity: 0.6 },
                                                    ]}
                                                    onPress={() => {
                                                        setSelectedDeleteItem(item);
                                                        setShowDeleteAlert(true);
                                                    }}
                                                >
                                                    <Icon name="delete-outline" size={20} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                />
                            )}
                        </View>
                    </Modal> */}

                    {scannerModal && (
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: "#fff",
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 999,
                            }}
                        >
                            <View style={checkingScannerStyles.headerContainer}>
                                <View>
                                    <Text style={{ fontSize: 24, fontWeight: "900" }}>
                                        Scanner List
                                    </Text>
                                    <Text style={{ color: "#777" }}>
                                        {filteredData.length} items
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={checkingScannerStyles.closeButton}
                                    onPress={() => setScannerModal(false)}
                                >
                                    <Icon name="close" size={24} color="#000" />
                                </TouchableOpacity>
                            </View>

                            <View style={checkingScannerStyles.searchContainer}>
                                <Icon name="search" size={22} color="#777" />

                                <TextInput
                                    placeholder="Search scanner data..."
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    style={{
                                        flex: 1,
                                        marginLeft: 10,
                                        color: "#000",
                                    }}
                                />
                            </View>

                            {scannerLoading ? (
                                <View style={styles.centered}>
                                    <ActivityIndicator
                                        size="large"
                                        color="#007EA7"
                                    />
                                </View>
                            ) : (
                                <FlatList
                                    data={filteredData}
                                    keyExtractor={(item, index) =>
                                        `${item.UId}_${item.SrNo}_${index}`
                                    }
                                    contentContainerStyle={{
                                        padding: 16,
                                        paddingBottom: 40,
                                    }}
                                    onEndReached={loadMoreData}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <View style={checkingScannerStyles.billCard}>
                                            <View
                                                style={[
                                                    styles.measurementField,
                                                    isCompactScreen &&
                                                    styles.measurementFieldCompact,
                                                ]}
                                            >
                                                <Text
                                                    numberOfLines={1}
                                                    style={checkingScannerStyles.title}
                                                >
                                                    {item.DsnName}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Beam No : {item.BeamNo}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Meter : {item.Qty} m
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Taka : {item.TakaNo}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Design : {item.OrdDsnName || item.DsnName}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Weight : {item.Wt}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Avg Weight : {item.AvgWt}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Grade : {item.GrdName}
                                                </Text>

                                                <Text style={checkingScannerStyles.subText}>
                                                    Linked Order No : {item.LinkedOrderNo}
                                                </Text>
                                            </View>

                                            <View>
                                                <View style={{ flexDirection: "row", gap: 8, marginBottom: 8, alignContent: "center" }}>
                                                    <TouchableOpacity
                                                        // style={{
                                                        //     backgroundColor: "#0369A1",
                                                        //     padding: 8,
                                                        //     borderRadius: 8,
                                                        //     marginBottom: 8,
                                                        // }}
                                                        style={[
                                                            checkingScannerStyles.printButton,
                                                            // Number(item.islasttakatrack) === 1 && {
                                                            //     backgroundColor: "#0369A1",
                                                            //     opacity: 0.6,
                                                            // },
                                                        ]}
                                                        onPress={() =>
                                                            openPrinterForScannerRow(item)
                                                        }
                                                    >
                                                        <Icon
                                                            name="local-printshop"
                                                            size={20}
                                                            color="#fff"
                                                        />
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        disabled={
                                                            Number(item.islasttakatrack) === 1
                                                        }
                                                        style={[
                                                            checkingScannerStyles.deleteButton,
                                                            Number(item.islasttakatrack) === 1 && {
                                                                backgroundColor: "#BDBDBD",
                                                                opacity: 0.6,
                                                            },
                                                        ]}
                                                        onPress={() => {
                                                            setSelectedDeleteItem(item);
                                                            setShowDeleteAlert(true);
                                                        }}
                                                    >
                                                        <Icon
                                                            name="delete-outline"
                                                            size={20}
                                                            color="#fff"
                                                        />
                                                    </TouchableOpacity>
                                                </View>

                                                <TouchableOpacity
                                                    style={styles.faultButton}
                                                    onPress={() => openScannerFault(item)}
                                                >

                                                    <Icon
                                                        name="report-problem"
                                                        size={18}
                                                        color="#fff"
                                                    />

                                                    <Text style={styles.faultButtonText}>
                                                        Faults
                                                    </Text>

                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                />
                            )}
                        </View>
                    )}

                    {/* Delete confirm */}
                    <Modal transparent visible={showDeleteAlert} animationType="fade" onRequestClose={() => setShowDeleteAlert(false)}>
                        <View style={styles.modalOverlayCenter}>
                            <View style={styles.deleteBox}>
                                <Text style={styles.modalTitle}>Delete Record</Text>
                                <Text style={{ textAlign: 'center', color: '#666', marginTop: 10 }}>
                                    Are you sure you want to delete this scanner record?
                                </Text>
                                <View style={{ flexDirection: 'row', marginTop: 20 }}>
                                    <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: '#EAEAEA' }]} onPress={() => setShowDeleteAlert(false)}>
                                        <Text style={{ fontWeight: '700' }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: '#E53935' }]} onPress={handledelete}>
                                        <Text style={{ color: '#fff', fontWeight: '700' }}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {isDeleteLoading && (
                        <View
                            style={{
                                ...StyleSheet.absoluteFillObject,
                                backgroundColor: 'rgba(0,0,0,0.45)',
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 99999,
                                elevation: 99999,
                            }}
                        >
                            <View style={styles.deleteBox}>
                                <ActivityIndicator size="large" color="#007EA7" />
                                <Text style={{ marginTop: 10, fontWeight: '700' }}>Deleting record...</Text>
                            </View>
                        </View>
                    )}

                </KeyboardAvoidingView>
                {/* </StatusBar>     */}
            </SafeAreaView>
        </>
    );
};

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    permissionBtn: { marginTop: 20, backgroundColor: '#007EA7', padding: 12, borderRadius: 8 },
    tabWrap: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 5,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tabBtn: {
        flex: 1,
        minHeight: 50,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBtnActiveManual: { backgroundColor: '#0B84A5' },
    tabBtnActiveScanner: { backgroundColor: '#0284C7' },
    tabText: { marginLeft: 8, color: '#334155', fontWeight: '900' },
    tabTextActive: { color: '#fff' },
    scannerBanner: {
        backgroundColor: '#EFF6FF',
        borderRadius: 22,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#D7E8FF',
        flexDirection: 'row',
        alignItems: 'center',
    },
    scannerIconWrap: {
        width: 58,
        height: 58,
        borderRadius: 20,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    scannerTitle: { color: '#0F172A', fontWeight: '900', fontSize: 18 },
    scannerSub: { color: '#64748B', marginTop: 4, fontSize: 13 },
    scanBtn: {
        minHeight: 48,
        paddingHorizontal: 18,
        borderRadius: 16,
        backgroundColor: '#0284C7',
        flexDirection: 'row',
        alignItems: 'center',
    },
    scanBtnText: { color: '#fff', fontWeight: '900', marginLeft: 8 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    mendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
    modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 25 },
    printerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 16 },
    modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
    searchInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginVertical: 12 },
    printerRow: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
    printerRowActive: { borderColor: '#0284C7', backgroundColor: '#EFF6FF' },
    printConfirmBtn: { backgroundColor: '#0369A1', padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
    deleteBox: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 20 },
    deleteBtn: { flex: 1, padding: 13, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },

    safeArea: {
        flex: 1,
        backgroundColor: '#F4F7FB',
    },

    flex: {
        flex: 1,
    },

    screen: {
        flex: 1,
        backgroundColor: '#F4F7FB',
    },

    scrollContent: {
        flexGrow: 1,
        width: '100%',
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 32,
        alignSelf: 'center',
    },

    tabletContent: {
        maxWidth: 760,
    },

    tabWrapCompact: {
        padding: 4,
        borderRadius: 20,
    },

    tabBtnCompact: {
        minHeight: 48,
        paddingHorizontal: 4,
    },

    tabTextCompact: {
        fontSize: 12,
        marginLeft: 5,
    },

    scannerBannerCompact: {
        flexWrap: 'wrap',
        padding: 14,
    },

    scannerTextArea: {
        flex: 1,
        minWidth: 0,
    },

    scannerTextAreaCompact: {
        minWidth: 150,
    },

    scanBtnCompact: {
        width: '100%',
        marginTop: 14,
        justifyContent: 'center',
    },

    measurementRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },

    measurementRowCompact: {
        flexDirection: 'column',
        gap: 0,
        marginTop: 0,
    },

    measurementField: {
        flex: 1,
        minWidth: 0,
    },

    measurementFieldCompact: {
        width: '100%',
    },

    actionButtonStack: {
        flexDirection: 'column',
        gap: 10,
    },

    fullWidthButton: {
        width: '100%',
        alignSelf: 'stretch',
        minHeight: 56,
    },

    shiftPickerContainer: {
        borderWidth: 1,
        borderColor: '#D9DDE5',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        marginBottom: 12,
    },

    sectionDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 20,
    },

    manualOverlay: {
        ...StyleSheet.absoluteFillObject,

        backgroundColor: 'rgba(0,0,0,0.35)',

        justifyContent: 'center',
        alignItems: 'center',

        zIndex: 9999,
        elevation: 9999,
    },
    faultsButton: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    faultButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF9800",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },

    faultButtonText: {
        color: "#fff",
        marginLeft: 6,
        fontWeight: "700",
    },
});

export default CheckingScanner;
