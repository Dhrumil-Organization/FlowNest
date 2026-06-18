import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, TextInput as RNTextInput, Button, Modal, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import FullScreenLoader from '@/components/FullScreenLoader';
import { checkingScannerStyles } from '@/common/Style';
import { API, PRINTSTICKER, PRINTERSLISTAPI } from '../../common/API/dynamicAPI';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import HeaderBarwithBack from '@/components/Header';
// import { Picker } from '@react-native-picker/picker';
import CustomPicker from '@/common/CustomPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView } from 'react-native';
// import Snackbar from 'react-native-snackbar';
import { showSnackbar, showSuccess, showError, showWarning } from '@/common/utils/snackbar';
import { Switch } from 'react-native';
import PartyDropdown from '@/Shared/PartyDropdown';
interface Props {
    token: string;
    username: string;
}

const CheckingScanner: React.FC<Props> = ({ token, username }) => {
    // ✅ EXPO CAMERA (replaces useCameraDevice + useCameraPermission)
    const [permission, requestPermission] = useCameraPermissions();
    // const device = useCameraDevice('back');
    const scanLock = useRef(false);
    const [isScanning, setIsScanning] = useState(false);
    // const { hasPermission, requestPermission } = useCameraPermission();
    const [scannedValue, setScannedValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [getData, setData] = useState([]);
    const [Designdata, setDesigndata] = useState([]);
    const [getdesigndata, setdesigndata] = useState([]);
    const [beamNo, setBeamNo] = useState('');
    const [takaNo, setTakaNo] = useState('');
    const [beamUid, setBeamUid] = useState('');
    const [prpCode, setPrpCode] = useState('');
    const [yearNo, setYearNo] = useState('');
    const [meter, setMeter] = useState('');
    const [kgs, setKgs] = useState('');
    const [validMeter, setValidMeter] = useState('');
    const [design, setDesign] = useState('');
    const [getWarpLen, setWarpLen] = useState('0');
    const [getavgWt, setavgWt] = useState('0');
    const [getGradeData, setGradeData] = useState([]);
    const [getCheckerData, setCheckerData] = useState([]);
    const [grade, setGrade] = useState('');
    const [checker, setChecker] = useState('');
    const [getScannedObj, setScannedObj] = useState({})
    const [shift, setShift] = useState('')
    const [getShiftData, setShiftData] = useState([]);
    const [getDataSaved, setDataSaved] = useState(false)
    const [getSavedData, setSavedData] = useState([]);
    const [isMending, setIsMending] = useState(false);
    const [getPrinters, setPrinters] = useState([])
    const [printer, setPrinter] = useState('');
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [selecteddesign, setselecteddesign] = useState(null);
    //

    const [showManualPopup, setShowManualPopup] = useState(false);
    const [machinedata, setMachineData] = useState([]);
    const [FormState, setFormState] = useState({
        values: {}
    });
    const [activeTab, setActiveTab] = useState('manual');
    const [showManual, setShowManual] = useState(true);
    const [scannerModal, setScannerModal] = useState(false);
    const [scannerCardData, setScannerCardData] = useState([]);
    const [scannerLoading, setScannerLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [visibleData, setVisibleData] = useState([]);
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
    const [footerLoading, setFooterLoading] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [selectedDeleteItem, setSelectedDeleteItem] = useState(null);// true = manual, false = scanner
    // const [isScanning, setIsScanning] = useState(false);
    // console.log("scannerCardData", scannerCardData);

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

    useEffect(() => {
        requestPermission();
    }, []);

    // const codeScanner = useCodeScanner({
    //     codeTypes: ['qr'],
    //     onCodeScanned: (codes) => {
    //         setBeamNo('');
    //         setTakaNo('');
    //         setBeamUid('');
    //         setPrpCode('');
    //         setYearNo('')
    //         setMeter('')
    //         setKgs('');
    //         setavgWt('');
    //         setWarpLen('')
    //         setData([])
    //         setDesign('')
    //         setGradeData([])
    //         setGrade('')
    //         setCheckerData([]);
    //         setChecker('')
    //         setScannedObj({})
    //         setShift('')
    //         setPrinter('')
    //         setPrinters([])

    //         const value = codes[0]?.value || '';
    //         console.log("📦 Raw QR Value 👉", value);
    //         setScannedValue(value);

    //         try {

    //             const parsed = JSON.parse(value);
    //             setScannedObj(parsed)
    //             setBeamNo(parsed.beamno || '');
    //             setTakaNo(parsed.takano || '');
    //             setBeamUid(parsed.beamuid || '');
    //             setPrpCode(parsed.prpcode || '');
    //             setYearNo(parsed.yearNo || '')
    //             setMeter('')
    //             setKgs('');
    //             setavgWt('');
    //             getGrades(parsed)
    //             getCheckers(parsed)
    //             getShifts(parsed)
    //             sendScannedValue(value);
    //         } catch (err) {
    //             setBeamNo('');
    //             setTakaNo('');
    //             setBeamUid('');
    //             setPrpCode('');
    //             setYearNo('')
    //             setMeter('')
    //             setKgs('');
    //             setavgWt('');
    //             setWarpLen('')
    //             setData([])
    //             setDesign('')
    //             setGradeData([])
    //             setGrade('')
    //             setCheckerData([]);
    //             setChecker('')
    //             setScannedObj({})
    //             setShift('')
    //             setPrinter('')
    //             setPrinters([])
    //             Alert.alert("Invalid QR", "QR format not valid");
    //         }
    //         setIsScanning(false);
    //     },
    // });

    // ✅ EXPO CAMERA BARCODE HANDLER (replaces useCodeScanner)
    const handleBarCodeScanned = (result: BarcodeScanningResult) => {
        // Prevent multiple scans
        if (scanLock.current) return;
        scanLock.current = true;
        setTimeout(() => (scanLock.current = false), 2000);

        setBeamNo('');
        setTakaNo('');
        setBeamUid('');
        setPrpCode('');
        setYearNo('');
        setMeter('');
        setKgs('');
        setavgWt('');
        setWarpLen('');
        setData([]);
        setDesign('');
        setGradeData([]);
        setGrade('');
        setCheckerData([]);
        setChecker('');
        setScannedObj({});
        setShift('');
        setPrinter('');
        setPrinters([]);

        const value = result?.data || '';
        console.log("📦 Raw QR Value 👉", value);
        setScannedValue(value);

        try {
            const parsed = JSON.parse(value);
            setScannedObj(parsed);
            setBeamNo(parsed.beamno || '');
            setTakaNo(parsed.takano || '');
            setBeamUid(parsed.beamuid || '');
            setPrpCode(parsed.prpcode || '');
            setYearNo(parsed.yearNo || '');
            setMeter('');
            setKgs('');
            setavgWt('');
            getGrades(parsed);
            getCheckers(parsed);
            getShifts(parsed);
            sendScannedValue(value);
        } catch (err) {
            setBeamNo('');
            setTakaNo('');
            setBeamUid('');
            setPrpCode('');
            setYearNo('');
            setMeter('');
            setKgs('');
            setavgWt('');
            setWarpLen('');
            setData([]);
            setDesign('');
            setGradeData([]);
            setGrade('');
            setCheckerData([]);
            setChecker('');
            setScannedObj({});
            setShift('');
            setPrinter('');
            setPrinters([]);
            Alert.alert('Invalid QR', 'QR format not valid');
        }
        setIsScanning(false);
    };


    // if (!device || !hasPermission) {
    //     return (<View><Text>No camera permission or device not available</Text></View>);
    // }

    const getToken = () => {
        return token;
    };

    // const getGrades = async (qrValue: object) => {

    //     if (cancelToken?.cancel) cancelToken.cancel();
    //     cancelToken = axios.CancelToken.source();

    //     let yno = await AsyncStorage.getItem('yno');

    //     try {
    //         const historyPayload = {
    //             txntype: 'beam_checking_tablet',
    //             referrer: 'dashboard',
    //             fetch: 'grd',
    //             prpcode: qrValue.prpcode,
    //             yearno: yno
    //         };
    //         console.log("grade api payload historyPayload :", historyPayload)
    //         const response = await axios.get(
    //             `${API}/api/get_criterion`, getRequestConfig(
    //                 {
    //                     params: { ...historyPayload }
    //                 }
    //             )
    //         );
    //         console.log("grade api payload response :", response)
    //         if (response.data.success && response.data.response.data.length > 0) {
    //             setGradeData(response.data.response.data);
    //         } else {
    //             setGradeData([]);
    //         }
    //     } catch (error) {
    //         console.log("grade API error:", error);
    //     } finally {
    //         setIsLoading(false)
    //     }
    // }

    // const getCheckers = async (qrValue: object) => {

    //     if (cancelToken?.cancel) cancelToken.cancel();
    //     cancelToken = axios.CancelToken.source();

    //     try {
    //         let yno = await AsyncStorage.getItem('yno');
    //         const historyPayload = {
    //             txntype: 'beam_checking_tablet',
    //             referrer: 'dashboard',
    //             fetch: 'prodrepackchkby',
    //             prpcode: qrValue.prpcode,
    //             yearno: yno
    //         };

    //         const response = await axios.get(
    //             `${API}/api/get_criterion`, getRequestConfig(
    //                 {
    //                     params: { ...historyPayload }
    //                 }
    //             )
    //         );

    //         if (response.data.success && response.data.response.data.length > 0) {
    //             setCheckerData(response.data.response.data);
    //             let tempChecker = '';
    //             tempChecker = await AsyncStorage.getItem('csChecker');

    //             if (typeof tempChecker != 'undefined' && tempChecker != null && tempChecker != '') {
    //                 response.data.response.data && response.data.response.data.filter((el, ind) => {
    //                     if (el.EmpCode == tempChecker) {
    //                         setChecker(tempChecker);
    //                     }
    //                 })
    //             }
    //         } else {
    //             setCheckerData([]);
    //         }
    //     } catch (error) {
    //         console.log("API getCheckers error:", error);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // }

    // const getShifts = async (qrValue: object) => {

    //     if (cancelToken?.cancel) cancelToken.cancel();
    //     cancelToken = axios.CancelToken.source();

    //     try {
    //         let yno = await AsyncStorage.getItem('yno');

    //         const historyPayload = {
    //             // text: parcode,
    //             txntype: 'beam_checking_tablet',
    //             referrer: 'dashboard',
    //             fetch: 'shift',
    //             prpcode: qrValue.prpcode,
    //             yearno: yno

    //         };
    //         //console.log("get shift api historyPayload payload :", historyPayload)
    //         const response = await axios.get(
    //             `${API}/api/get_criterion`, getRequestConfig(
    //                 {
    //                     params: { ...historyPayload }
    //                 }
    //             )
    //         );

    //         if (response.data.success && response.data.response.data.length > 0) {
    //             setShiftData(response.data.response.data);
    //         } else {
    //             setShiftData([]);
    //         }
    //     } catch (error) {
    //         console.log("API getshifts error:", error);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // }

    // const sendScannedValue = async (qrValue: string) => {

    //     if (cancelToken?.cancel) cancelToken.cancel();
    //     cancelToken = axios.CancelToken.source();
    //     setIsLoading(true);

    //     try {
    //         let temp = JSON.parse(qrValue)
    //         let yno = await AsyncStorage.getItem('yno');

    //         let infoPyload = {
    //             txntype: 'chekingScanner',
    //             referrer: 'dashboard',
    //             scannedString: temp,
    //             prpcode: temp.prpcode,
    //             // yearno: yno
    //             yearno: getCurrentFinancialYear()
    //         };
    //         console.log("infoPyload", infoPyload)
    //         const headers = {
    //             Authorization: `Bearer ${getToken()}`,
    //             'Content-Type': 'application/json',
    //             'X-Requested-with': 'XMLHttpRequest',
    //         };
    //         const response = await axios.post(`${API}/api/get_auto_checking_help`, infoPyload, { headers });
    //         console.log("response", response)
    //         if (response.data.success && response.data.response.design) {
    //             setData(response.data.response.design);
    //             setIsLoading(false);
    //         } else {
    //             setIsLoading(false);
    //             console.error('Unexpected response structure:', response.data);
    //             Alert.alert(`${response.data}`);
    //         }
    //     } catch (error) {
    //         //console.log("API sendScannedValue error:", error);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    // const sendScannedValue1 = async (qrValue, dsncode) => {

    //     if (cancelToken?.cancel) cancelToken.cancel();
    //     cancelToken = axios.CancelToken.source();
    //     setIsLoading(true);

    //     try {
    //         let temp = JSON.parse(qrValue)
    //         let yno = await AsyncStorage.getItem('yno');

    //         let infoPyload = {
    //             txntype: 'chekingScanner',
    //             referrer: 'dashboard',
    //             scannedString: temp,
    //             prpcode: temp.prpcode,
    //             dsncode: dsncode,
    //             // yearno: yno
    //             yearno: getCurrentFinancialYear()
    //         };
    //         console.log("infoPyload1-----", infoPyload)
    //         const headers = {
    //             Authorization: `Bearer ${getToken()}`,
    //             'Content-Type': 'application/json',
    //             'X-Requested-with': 'XMLHttpRequest',
    //         };
    //         const response = await axios.post(`${API}/api/get_auto_checking_help`, infoPyload, { headers });
    //         console.log("response", response)
    //         const dataArr = response.data.response.data || [];
    //         if (response.data.success) {

    //             if (dataArr.length > 0) {
    //                 // ✅ Data available
    //                 setDesigndata(dataArr);
    //                 setWarpLen(dataArr[0].WarpLen || '0');
    //             } else {
    //                 // ❌ No data case
    //                 setDesigndata([]);
    //                 setWarpLen('0');

    //                 Alert.alert("No Data Found");
    //             }

    //         } else {
    //             setIsLoading(false);
    //             console.error('Unexpected response structure:', response.data);
    //             Alert.alert(`${response.data}`);
    //         }
    //     } catch (error) {
    //         //console.log("API sendScannedValue error:", error);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    // const handleMeterChange = (value: string) => {

    //     if (typeof design == 'undefined' || design == null || design == '') {
    //         Alert.alert("Design", "Please select design first");
    //         return;
    //     } else {
    //         let qltWt = 0.00;
    //         getData && getData.filter((el, ind) => {
    //             if (el.DsnCode == design) {
    //                 qltWt = el.QltWt;
    //             }
    //         })

    //         value = value.replace(',', '.');
    //         const regex = /^\d*(?:\.\d{0,2})?$/;

    //         if (value === '' || regex.test(value)) {
    //             setMeter(value);
    //             setValidMeter(value);
    //         }

    //         let qty = 0.0;
    //         qty = isNaN(value) ? 0.0 : parseFloat(value);

    //         let wt = 0.0;
    //         wt = isNaN(qty) || isNaN(qltWt) || parseFloat(qty) == 0 || parseFloat(qltWt) == 0 ? 0.0 : (parseFloat(qty) * parseFloat(qltWt)).toFixed(2);

    //         let avgWt = 0.0;
    //         avgWt = isNaN(qty) || isNaN(wt) || parseFloat(qty) == 0 || parseFloat(wt) == 0 ? 0.0 : ((parseFloat(wt) * 100) / parseFloat(qty)).toFixed(2);

    //         setKgs(wt);
    //         setavgWt(avgWt);
    //     }
    // };

    // const handleKgsChange = (value: string) => {

    //     value = value.replace(',', '.');
    //     const regex = /^\d*(?:\.\d{0,2})?$/;

    //     if (value === '' || regex.test(value)) {

    //         setKgs(value);

    //         let qty = parseFloat(meter) || 0;
    //         let wt = parseFloat(value) || 0;

    //         let avgWt =
    //             qty === 0 || wt === 0
    //                 ? 0
    //                 : ((wt * 100) / qty).toFixed(2);

    //         setavgWt(avgWt);
    //     }
    // }

    // const handleSubmitScan = async () => {

    //     if (typeof beamNo == 'undefined' || beamNo == null || beamNo == '') {
    //         Alert.alert('Beam no can not be blank');
    //         return false;
    //     } else if (typeof takaNo == 'undefined' || takaNo == null || takaNo == '') {
    //         Alert.alert('Taka no can not be blank');
    //         return false;
    //     } else if (typeof design == 'undefined' || design == null || design == '') {
    //         Alert.alert('Design can not be blank.');
    //         return false;
    //     } else if (typeof meter == 'undefined' || meter == null || meter == '' || parseInt(meter) <= 0) {
    //         Alert.alert('Meter can not be blank or 0.');
    //         return false;
    //     } else if (typeof meter == 'undefined' || meter == null || meter == '' || parseInt(meter) > 0 && (parseFloat(meter) > parseFloat(getWarpLen))) {
    //         Alert.alert(`Meter ${meter} can not be greater than ${getWarpLen}.`);
    //         return false;
    //     } else if (typeof kgs == 'undefined' || kgs == null || kgs == '' || parseInt(kgs) <= 0) {
    //         Alert.alert('Kgs can not be blank or 0.');
    //         return false;
    //     } else if (typeof kgs == 'undefined' || kgs == null || kgs == '' || parseInt(kgs) <= 0) {
    //         Alert.alert('Kgs can not be blank or 0.');
    //         return false;
    //     } else if (typeof grade == 'undefined' || grade == null || grade == '') {
    //         Alert.alert('Grade can not be blank.');
    //         return false;
    //     } else if (typeof checker == 'undefined' || checker == null || checker == '') {
    //         Alert.alert('Checker can not be blank.');
    //         return false;
    //     } else if (typeof shift == 'undefined' || shift == null || shift == '') {
    //         Alert.alert('Shift can not be blank.');
    //         return false;
    //     } else {
    //         let finalObj = new Object();
    //         getData && getData.filter((el, ind) => {
    //             if (design == el.DsnCode) {
    //                 finalObj = el;
    //             }
    //         })

    //         if (cancelToken?.cancel) cancelToken.cancel();
    //         cancelToken = axios.CancelToken.source();
    //         setIsLoading(true);

    //         try {
    //             let yno = await AsyncStorage.getItem('yno');
    //             let payloadObj = new Object();
    //             payloadObj = finalObj;
    //             // payloadObj = {
    //             //     ...finalObj,       // ✅ existing data
    //             //     ...Designdata      // ✅ new API data (merge)
    //             // };
    //             payloadObj['prpcode'] = getScannedObj.prpcode;
    //             payloadObj['yearno'] = yno;
    //             payloadObj['TakaNo'] = takaNo;
    //             payloadObj['GrdCode'] = grade;
    //             //payloadObj['EmpCode'] = checker;
    //             payloadObj['ChkCode'] = checker;
    //             payloadObj['Qty'] = meter;
    //             payloadObj['Wt'] = kgs;
    //             payloadObj['AvgWt'] = getavgWt;
    //             payloadObj['txntype'] = 'chekingScanner';
    //             payloadObj['ShfCode'] = shift;
    //             payloadObj['SrNo'] = '0';
    //             payloadObj['islasttaka'] = getScannedObj.islasttaka;
    //             payloadObj['isfirsttaka'] = getScannedObj.isfirsttaka;
    //             payloadObj['IsLastTaka'] = getScannedObj.islasttaka;
    //             payloadObj['IsFirstTaka'] = getScannedObj.isfirsttaka;
    //             payloadObj['ismending'] = isMending ? 1 : 0;
    //             payloadObj['AuthStatus'] = Designdata[0].AuthStatus;
    //             payloadObj['BeamNo'] = Designdata[0].BeamNo;
    //             payloadObj['OrderUId'] = Designdata[0].OrderUId;
    //             payloadObj['OrderNo'] = Designdata[0].OrderNo;
    //             payloadObj['OrderDsnCode'] = Designdata[0].OrderDsnCode;
    //             payloadObj['OrderDsnName'] = Designdata[0].OrderDsnName;
    //             payloadObj['OrderLastDate'] = Designdata[0].OrderLastDate;
    //             payloadObj['UId'] = Designdata[0].UId;
    //             payloadObj['PlanUId'] = Designdata[0].PlanUId;
    //             payloadObj['PlanNo'] = Designdata[0].PlanNo;
    //             payloadObj['BeamUId'] = Designdata[0].BeamUId;
    //             payloadObj['MacCode'] = Designdata[0].MacCode;
    //             payloadObj['MacName'] = Designdata[0].MacName;
    //             payloadObj['BeamNo'] = Designdata[0].BeamNo;
    //             payloadObj['DsnCode'] = Designdata[0].DsnCode;
    //             payloadObj['DsnName'] = Designdata[0].DsnName;
    //             payloadObj['TakaNo'] = Designdata[0].TakaNo;
    //             payloadObj['WarpLen'] = Designdata[0].WarpLen;
    //             payloadObj['QltWt'] = Designdata[0].QltWt;
    //             payloadObj['islasttakatrack'] = Designdata[0].islasttakatrack;
    //             payloadObj['bstatus'] = Designdata[0].bstatus;
    //             payloadObj['Status'] = Designdata[0].Status;
    //             payloadObj['IsAuth'] = Designdata[0].IsAuth;
    //             payloadObj['AuthStatus'] = Designdata[0].AuthStatus;
    //             payloadObj['PrpCode'] = Designdata[0].PrpCode;

    //             const headers = {
    //                 Authorization: `Bearer ${getToken()}`,
    //                 'Content-Type': 'application/json',
    //                 'X-Requested-with': 'XMLHttpRequest',
    //             };

    //             console.log("payloadObj", payloadObj)
    //             const response = await axios.post(`${API}/api/add_auto_checking_detail`, payloadObj, { headers });
    //             console.log("response", response)

    //             if (response.data.success == true) {
    //                 setIsLoading(false);
    //                 setDataSaved(true);

    //                 if (response.data.hasOwnProperty('data') && typeof response.data.data != 'undefined' && response.data.data && response.data.data.length > 0) {
    //                     setSavedData(response.data.data.main[0])
    //                 }
    //                 getAllPrinters();
    //                 // Snackbar.show({
    //                 //     text: 'Saved successfully',
    //                 //     duration: Snackbar.LENGTH_LONG,
    //                 //     backgroundColor: '#000',
    //                 //     action: { text: 'OK', textColor: 'green' },
    //                 // });
    //                 showSuccess(`Saved successfully`, {
    //                     text: 'OK',
    //                     onPress: () => { },
    //                 });
    //             } else if (response.data.success === false) {
    //                 setIsLoading(false);
    //                 setDataSaved(false);
    //                 // Snackbar.show({
    //                 //     text: response.data.message,
    //                 //     duration: Snackbar.LENGTH_LONG,
    //                 //     backgroundColor: '#000',
    //                 //     textColor: '#fff',
    //                 //     action: { text: 'OK', textColor: 'yellow' },
    //                 // });
    //                 showError(`${response.data.message}}`, {
    //                     text: 'OK',
    //                     onPress: () => { },
    //                 });
    //             } else {
    //                 setIsLoading(false);
    //                 setDataSaved(false);
    //                 // Snackbar.show({
    //                 //     text: response.data.message,
    //                 //     duration: Snackbar.LENGTH_LONG,
    //                 //     backgroundColor: '#000',
    //                 //     textColor: '#fff',
    //                 //     action: { text: 'OK', textColor: 'red' },
    //                 // });
    //                 showError(`${response.data.message}}`, {
    //                     text: 'OK',
    //                     onPress: () => { },
    //                 });
    //             }
    //         } catch (error) {
    //             setDataSaved(false);
    //             setIsLoading(false);
    //             console.log("API handleSubmitScan error:", error);
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     }
    // }

    const getGrades = async (qrValue: any) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        let yno = await AsyncStorage.getItem('yno');
        try {
            const historyPayload = {
                txntype: 'beam_checking_tablet',
                referrer: 'dashboard',
                fetch: 'grd',
                prpcode: qrValue.prpcode,
                yearno: yno,
            };
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({ params: { ...historyPayload } })
            );
            if (response.data.success && response.data.response.data.length > 0) {
                setGradeData(response.data.response.data);
            } else {
                setGradeData([]);
            }
        } catch (error) {
            console.log('grade API error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getCheckers = async (qrValue: any) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        try {
            let yno = await AsyncStorage.getItem('yno');
            const historyPayload = {
                txntype: 'beam_checking_tablet',
                referrer: 'dashboard',
                fetch: 'prodrepackchkby',
                prpcode: qrValue.prpcode,
                yearno: yno,
            };
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({ params: { ...historyPayload } })
            );
            if (response.data.success && response.data.response.data.length > 0) {
                setCheckerData(response.data.response.data);
                let tempChecker = '';
                tempChecker = await AsyncStorage.getItem('csChecker');
                if (typeof tempChecker != 'undefined' && tempChecker != null && tempChecker != '') {
                    response.data.response.data.filter((el: any) => {
                        if (el.EmpCode == tempChecker) setChecker(tempChecker);
                    });
                }
            } else {
                setCheckerData([]);
            }
        } catch (error) {
            console.log('API getCheckers error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getShifts = async (qrValue: any) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        try {
            let yno = await AsyncStorage.getItem('yno');
            const historyPayload = {
                txntype: 'beam_checking_tablet',
                referrer: 'dashboard',
                fetch: 'shift',
                prpcode: qrValue.prpcode,
                yearno: yno,
            };
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({ params: { ...historyPayload } })
            );
            if (response.data.success && response.data.response.data.length > 0) {
                setShiftData(response.data.response.data);
            } else {
                setShiftData([]);
            }
        } catch (error) {
            console.log('API getshifts error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const sendScannedValue = async (qrValue: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            let temp = JSON.parse(qrValue);
            let infoPyload = {
                txntype: 'chekingScanner',
                referrer: 'dashboard',
                scannedString: temp,
                prpcode: temp.prpcode,
                yearno: getCurrentFinancialYear(),
            };
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/get_auto_checking_help`, infoPyload, { headers });
            if (response.data.success && response.data.response.design) {
                setData(response.data.response.design);
                setIsLoading(false);
            } else {
                setIsLoading(false);
                Alert.alert(`${response.data}`);
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
            let temp = JSON.parse(qrValue);
            let infoPyload = {
                txntype: 'chekingScanner',
                referrer: 'dashboard',
                scannedString: temp,
                prpcode: temp.prpcode,
                dsncode: dsncode,
                yearno: getCurrentFinancialYear(),
            };
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/get_auto_checking_help`, infoPyload, { headers });
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
                setIsLoading(false);
                Alert.alert(`${response.data}`);
            }
        } catch (error) {
            console.log('API sendScannedValue1 error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMeterChange = (value: string) => {
        if (typeof design == 'undefined' || design == null || design == '') {
            Alert.alert('Design', 'Please select design first');
            return;
        } else {
            let qltWt = 0.0;
            getData && getData.filter((el: any) => {
                if (el.DsnCode == design) qltWt = el.QltWt;
            });
            value = value.replace(',', '.');
            const regex = /^\d*(?:\.\d{0,2})?$/;
            if (value === '' || regex.test(value)) {
                setMeter(value);
                setValidMeter(value);
            }
            let qty = 0.0;
            qty = isNaN(parseFloat(value)) ? 0.0 : parseFloat(value);
            let wt = 0.0;
            wt = isNaN(qty) || isNaN(qltWt) || qty == 0 || qltWt == 0
                ? 0.0
                : (qty * qltWt).toFixed(2);
            let avgWt = 0.0;
            avgWt = isNaN(qty) || isNaN(parseFloat(wt)) || qty == 0 || parseFloat(wt) == 0
                ? 0.0
                : ((parseFloat(wt) * 100) / qty).toFixed(2);
            setKgs(wt);
            setavgWt(avgWt);
        }
    };

    const handleKgsChange = (value: string) => {
        value = value.replace(',', '.');
        const regex = /^\d*(?:\.\d{0,2})?$/;
        if (value === '' || regex.test(value)) {
            setKgs(value);
            let qty = parseFloat(meter) || 0;
            let wt = parseFloat(value) || 0;
            let avgWt = qty === 0 || wt === 0 ? 0 : ((wt * 100) / qty).toFixed(2);
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

        let finalObj: any = {};
        getData && getData.filter((el: any) => {
            if (design == el.DsnCode) finalObj = el;
        });

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);

        try {
            let yno = await AsyncStorage.getItem('yno');
            let payloadObj: any = finalObj;
            payloadObj['prpcode'] = getScannedObj.prpcode;
            payloadObj['yearno'] = yno;
            payloadObj['TakaNo'] = takaNo;
            payloadObj['GrdCode'] = grade;
            payloadObj['ChkCode'] = checker;
            payloadObj['Qty'] = meter;
            payloadObj['Wt'] = kgs;
            payloadObj['AvgWt'] = getavgWt;
            payloadObj['txntype'] = 'chekingScanner';
            payloadObj['ShfCode'] = shift;
            payloadObj['SrNo'] = '0';
            payloadObj['islasttaka'] = getScannedObj.islasttaka;
            payloadObj['isfirsttaka'] = getScannedObj.isfirsttaka;
            payloadObj['IsLastTaka'] = getScannedObj.islasttaka;
            payloadObj['IsFirstTaka'] = getScannedObj.isfirsttaka;
            payloadObj['ismending'] = isMending ? 1 : 0;
            payloadObj['AuthStatus'] = Designdata[0].AuthStatus;
            payloadObj['BeamNo'] = Designdata[0].BeamNo;
            payloadObj['OrderUId'] = Designdata[0].OrderUId;
            payloadObj['OrderNo'] = Designdata[0].OrderNo;
            payloadObj['OrderDsnCode'] = Designdata[0].OrderDsnCode;
            payloadObj['OrderDsnName'] = Designdata[0].OrderDsnName;
            payloadObj['OrderLastDate'] = Designdata[0].OrderLastDate;
            payloadObj['UId'] = Designdata[0].UId;
            payloadObj['PlanUId'] = Designdata[0].PlanUId;
            payloadObj['PlanNo'] = Designdata[0].PlanNo;
            payloadObj['BeamUId'] = Designdata[0].BeamUId;
            payloadObj['MacCode'] = Designdata[0].MacCode;
            payloadObj['MacName'] = Designdata[0].MacName;
            payloadObj['DsnCode'] = Designdata[0].DsnCode;
            payloadObj['DsnName'] = Designdata[0].DsnName;
            payloadObj['WarpLen'] = Designdata[0].WarpLen;
            payloadObj['QltWt'] = Designdata[0].QltWt;
            payloadObj['islasttakatrack'] = Designdata[0].islasttakatrack;
            payloadObj['bstatus'] = Designdata[0].bstatus;
            payloadObj['Status'] = Designdata[0].Status;
            payloadObj['IsAuth'] = Designdata[0].IsAuth;
            payloadObj['AuthStatus'] = Designdata[0].AuthStatus;
            payloadObj['PrpCode'] = Designdata[0].PrpCode;

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(
                `${API}/api/add_auto_checking_detail`,
                payloadObj,
                { headers }
            );

            if (response.data.success == true) {
                setIsLoading(false);
                setDataSaved(true);
                if (response.data.hasOwnProperty('data') && response.data.data && response.data.data.length > 0) {
                    setSavedData(response.data.data.main[0]);
                }
                getAllPrinters();
                showSuccess('Saved successfully', { text: 'OK', onPress: () => { } });
            } else if (response.data.success === false) {
                setIsLoading(false);
                setDataSaved(false);
                showError(response.data.message, { text: 'OK', onPress: () => { } });
            }
        } catch (error) {
            setDataSaved(false);
            setIsLoading(false);
            console.log('API handleSubmitScan error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // const clearDesign = () => {
    //     setDesign('');
    //     setWarpLen('0');
    //     setMeter('')
    //     setKgs('')
    //     setavgWt('');
    // };
    // const clearGrade = () => {
    //     setGrade('');
    // };
    // const clearChecker = () => {
    //     setChecker('');
    // };
    // const clearShift = () => {
    //     setShift('');
    // };
    // const clearPrinter = () => {
    //     setPrinter('');
    // }

    // const printSticker = () => {
    //     if (typeof printer == 'undefined' || printer == null || printer == '') {
    //         Alert.alert('Please select printer first.');
    //         return false;
    //     } else {
    //         setIsLoading(true);
    //         console.log('printsticker function :', getSavedData);
    //         let temppayloadObj = new Object();

    //         if (Object.keys(getSavedData).length > 0) {
    //             temppayloadObj = {
    //                 uid: getSavedData.UId ?? "0",
    //                 inwno: "",
    //                 inwdate: "",
    //                 srno: getSavedData.SrNo ?? "0",
    //                 itmcode: "",
    //                 itmname: "",
    //                 dsncode: getSavedData.DsnCode ?? "0",
    //                 dsnname: getSavedData.DsnName ?? "",
    //                 rcno: "",
    //                 amount: "",
    //                 subsr: getSavedData.subsr ?? "0",
    //                 takano: getSavedData.TakaNo ?? "",
    //                 qty: getSavedData.Qty ?? "0",
    //                 trantype: getSavedData.trantype ?? "",
    //                 ttype: "",
    //                 dptname: "",
    //                 shdcode: getSavedData.shdcode ?? "0",
    //                 shdname: getSavedData.shdname ?? "",
    //                 whr: "",
    //                 yarncostr: "",
    //                 yard: "",
    //                 sexecname: "",
    //                 strcode: "",
    //                 unqsrno: "",
    //                 grdcode: getSavedData.GrdCode ?? "0",
    //                 grdname: getSavedData.GrdName ?? "",
    //                 mercode: 0,
    //                 mername: "",
    //                 denier: "",
    //                 prpcode: getSavedData.PrpCode ?? ""
    //             }
    //             const params = {
    //                 data: [getSavedData],
    //                 IskgQty: 0,
    //                 printype: "Print",
    //                 PrintFormat: 4,
    //                 printerName: printer ? printer : '',
    //                 txntype: 'chekingScanner'
    //             };

    //             axios.post(`${PRINTSTICKER}`, params)
    //                 .then(response => {
    //                     setIsLoading(false);
    //                     const res = response.data;

    //                     if (res.success) {
    //                         // Snackbar.show({
    //                         //     text: '✅ ${res.printed} label(s) sent to printer.',
    //                         //     duration: Snackbar.LENGTH_INDEFINITE,
    //                         //     backgroundColor: 'green',
    //                         //     action: { text: 'OK', textColor: 'white' },
    //                         // });
    //                         showSuccess(`✅ ${res.printed} label(s) sent to printer.`, {
    //                             text: 'OK',
    //                             onPress: () => { },
    //                         });
    //                     } else {
    //                         // Snackbar.show({
    //                         //     text: res.message || 'Operation failed',
    //                         //     duration: Snackbar.LENGTH_INDEFINITE,
    //                         //     backgroundColor: 'red',
    //                         //     action: { text: 'OK', textColor: 'white' },
    //                         // });
    //                         showError(`${res.message} || 'Operation failed`, {
    //                             text: 'OK',
    //                             onPress: () => { },
    //                         });
    //                     }
    //                 }).catch(error => {
    //                     setIsLoading(false);
    //                     // Snackbar.show({
    //                     //     text: error?.response?.data?.error || error.message || 'Print failed',
    //                     //     duration: Snackbar.LENGTH_LONG,
    //                     //     backgroundColor: 'red',
    //                     //     action: { text: 'OK', textColor: 'white' },
    //                     // });
    //                     showError(`${error?.response?.data?.error} || ${error.message} || 'Print failed'`, {
    //                         text: 'OK',
    //                         onPress: () => { },
    //                     });
    //                 });
    //         } else {
    //             setIsLoading(false);
    //             // Snackbar.show({
    //             //     text: 'printing sticker data is empty',
    //             //     duration: Snackbar.LENGTH_LONG,
    //             //     backgroundColor: 'red',
    //             //     textColor: '#fff',
    //             //     action: { text: 'OK', textColor: '#fff' },
    //             // });
    //             showWarning(`printing sticker data is empty`, {
    //                 text: 'OK',
    //                 onPress: () => { },
    //             });
    //         }
    //     }
    // }

    // const getAllPrinters = async () => {
    //     try {
    //         const res = await axios.get(PRINTERSLISTAPI);
    //         const printerList = res.data?.printers || res.data || [];
    //         setPrinters(printerList);
    //     } catch (err) {
    //         console.log("Printer API error:", err);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // }

    // const handleChange = (key, value) => {
    //     setFormState(prev => ({
    //         ...prev,
    //         values: {
    //             ...prev.values,
    //             [key]: value
    //         }
    //     }));
    // };

    const clearDesign = () => { setDesign(''); setWarpLen('0'); setMeter(''); setKgs(''); setavgWt(''); };
    const clearGrade = () => { setGrade(''); };
    const clearChecker = () => { setChecker(''); };
    const clearShift = () => { setShift(''); };
    const clearPrinter = () => { setPrinter(''); };

    const printSticker = () => {
        if (!printer) return Alert.alert('Please select printer first.');
        setIsLoading(true);
        if (Object.keys(getSavedData).length > 0) {
            const params = {
                data: [getSavedData],
                IskgQty: 0,
                printype: 'Print',
                PrintFormat: 4,
                printerName: printer,
                txntype: 'chekingScanner',
            };
            axios.post(`${PRINTSTICKER}`, params)
                .then(response => {
                    setIsLoading(false);
                    const res = response.data;
                    if (res.success) {
                        showSuccess(`✅ ${res.printed} label(s) sent to printer.`, { text: 'OK', onPress: () => { } });
                    } else {
                        showError(res.message || 'Operation failed', { text: 'OK', onPress: () => { } });
                    }
                }).catch(error => {
                    setIsLoading(false);
                    showError(error?.response?.data?.error || error.message || 'Print failed', { text: 'OK', onPress: () => { } });
                });
        } else {
            setIsLoading(false);
            showWarning('printing sticker data is empty', { text: 'OK', onPress: () => { } });
        }
    };

    const getAllPrinters = async () => {
        try {
            const res = await axios.get(PRINTERSLISTAPI);
            const printerList = res.data?.printers || res.data || [];
            setPrinters(printerList);
        } catch (err) {
            console.log('Printer API error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (key: string, value: any) => {
        setFormState(prev => ({ ...prev, values: { ...prev.values, [key]: value } }));
    };

    const fetchmachine = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                yearno: getCurrentFinancialYear(),
                txntype: 'manual_checking',
                fetch: 'manual_checking_machine_help',
            };
            console.log("Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/prodbeamdetailbrowsesudo`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("Machine API Response:", response);
            const data = response?.data?.data || [];
            if (response?.data?.success && data.length > 0) {
                setMachineData(data);
            } else {
                setMachineData([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getshifts error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchdesign = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');

        try {
            setIsLoading(true);

            // if (cancelToken?.cancel) cancelToken.cancel();
            // cancelToken = axios.CancelToken.source();

            let infoPyload = {
                prptype: userPtype,
                yearno: getCurrentFinancialYear(),
                txntype: 'manual_checking',
                fetch: 'manual_checking_machine_help',
                referrer: 'dashboard',
            };

            console.log("design payload", infoPyload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const response = await axios.post(
                `${API}/api/get_auto_checking_design_help`,
                infoPyload,
                { headers }
            );

            console.log("design response", response);

            // 🔥 FIXED CONDITION
            if (response.data.success && response.data.response.design) {

                setdesigndata(response.data.response.design);   // ✅ correct path

            } else {
                console.error('Unexpected response structure:', response.data);
                Alert.alert("No Design Data Found");
            }

        } catch (error) {
            console.log("API error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const soshow = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        setIsLoading(true);
        try {
            const historyPayload = {
                prptype: userPtype,
                yearno: getCurrentFinancialYear(),
                txntype: 'manual_checking',
                MacCode: '',
                TakaNo: ''
            };
            console.log("aaj apii  soshow response", historyPayload);
            const response = await axios.get(
                `${API}/api/get_manual_checking_detail`,
                getRequestConfig({
                    params: { ...historyPayload }
                })
            );

            console.log("aaj apii  soshow response", response);

            const mainData = response?.data?.data?.main || [];
            const newMain = response?.data?.data?.new_main || [];

            // ✅ SAFE CHECK
            if (response?.data?.success && mainData.length > 0) {

                console.log("Main Data 👉", mainData);
                if (newMain.length > 0 && typeof newMain[0] === 'object') {
                    const first = newMain[0];
                    setFormState(prev => ({
                        ...prev,
                        values: {
                            ...first
                        }
                    }));
                }
                setShowManualPopup(true);
                fetchmachine();
                fetchdesign();

            } else {
                Alert.alert("No Data Found");
            }
        } catch (error) {
            console.log("API error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const showAlert = (message) => {
        return new Promise((resolve) => {
            Alert.alert(
                'Validation Error',
                message,
                [
                    {
                        text: 'OK',
                        onPress: () => resolve(true),
                    },
                ],
                { cancelable: false }
            );
        });
    };

    const validateForm = async () => {
        const qty = parseFloat(FormState.values.Qty);
        if (!FormState.values.MacCode) {
            await showAlert('Please select a valid machine');
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
        if (
            FormState.values.Qty === '' ||
            isNaN(qty) ||
            qty <= 0
        ) {
            await showAlert('Please Enter valid Qty');
            return false;
        }
        return true;
    };

    const handleClearForm = () => {
        setFormState(prev => ({
            ...prev,
            values: {
                ...prev.values,

                MacCode: "",
                TakaNo: "",
                DsnName: "",
                Qty: "",
                BalQty: "",
                UsrCode: "",
                LastDate: "",
                LastTime: "",
                UUsrCode: "",
                ULastDate: "",
                ULastTime: "",
                MacName: "",
                isedit: "",
            }
        }));
        setSelectedMachine(null);

    };

    const handlesave = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        const isValid = await validateForm();
        if (!isValid) return;

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            const payloadObj = {
                ...FormState.values,
                prptype: userPtype,
                txntype: "manual_checking",
                yearno: getCurrentFinancialYear(),
            };

            console.log("payload...........333", payloadObj);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/add_edit_manual_checking_detail`, payloadObj, { headers });
            console.log("response", response);

            if (response.data.success === true) {

                Alert.alert(
                    "Success",
                    "Data Saved Successfully ✅",
                    [
                        {
                            text: "OK",
                            onPress: async () => {
                                handleClearForm();
                                setShowManualPopup(false);
                            }
                        }
                    ]
                );

            }
            else if (response.data.success === false) {
                setIsLoading(false);
                setDataSaved(false);
                // Snackbar.show({
                //     text: `⚠️ ${response.data.message}`,
                //     duration: Snackbar.LENGTH_LONG,
                //     backgroundColor: '#D32F2F',   // 🔥 RED (error)
                //     textColor: '#fff',
                //     numberOfLines: 2,
                //     action: {
                //         text: 'OK',
                //         textColor: '#fff',
                //         onPress: () => { }
                //     },
                // });
                showError(`⚠️ ${response.data.message}`, {
                    text: 'OK',
                    onPress: () => { },
                });
            } else {
                setIsLoading(false);
                setDataSaved(false);
                // Snackbar.show({
                //     text: response.data.message,
                //     duration: Snackbar.LENGTH_LONG,
                //     backgroundColor: '#000',
                //     textColor: '#fff',
                //     action: { text: 'OK', textColor: 'red' },
                // });
                showError(`⚠️ ${response.data.message}`, {
                    text: 'OK',
                    onPress: () => { },
                });
            }
        } catch (error) {
            setDataSaved(false);
            setIsLoading(false);
            console.log("API handleSubmitScan error:", error);
        } finally {
            setIsLoading(false);
        }

    }

    const handleScannerList = async () => {

        const userPtype = await AsyncStorage.getItem('user_prptype');

        try {

            setScannerModal(true);
            setScannerLoading(true);

            if (cancelToken?.cancel) cancelToken.cancel();

            cancelToken = axios.CancelToken.source();

            const payload = {
                prptype: userPtype,
                yearno: getCurrentFinancialYear(),
                txntype: 'chekingScanner',
                ShfCode: '',
                ChkDate: '',
                PrpCode: '',
                BeamNo: '',
            };

            console.log("scanner list Payload:", payload);

            const response = await axios.get(
                `${API}/api/show_beam_checking`,
                getRequestConfig({
                    params: { ...payload },
                    cancelToken: cancelToken.token
                })
            );

            console.log("scanner list API Response:", response);

            const data = response?.data?.data?.main || [];

            console.log("scannerCardData =>", data);

            if (response?.data?.success) {

                setScannerCardData(data);

            } else {

                setScannerCardData([]);
            }

        } catch (error) {

            if (axios.isCancel(error)) {

                console.log("Request cancelled:", error.message);

            } else {

                console.log("API getshifts error:", error);
            }

        } finally {

            // 👇 YE IMPORTANT FIX HAI
            setScannerLoading(false);
        }
    };

    const loadMoreData = () => {

        // already loading
        if (footerLoading) return;

        // all data loaded
        if (visibleData.length >= scannerCardData.length)
            return;

        setFooterLoading(true);

        const nextPage = page + 1;

        const newData =
            scannerCardData.slice(
                0,
                nextPage * ITEMS_PER_PAGE
            );

        setVisibleData(newData);

        setPage(nextPage);

        setFooterLoading(false);
    };

    const filteredData = scannerCardData.filter(item => {

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

        try {

            setShowDeleteAlert(false);

            if (!selectedDeleteItem) {

                console.log("selectedDeleteItem missing");

                return;
            }

            console.log(
                "DELETE ITEM =>",
                selectedDeleteItem
            );

            setIsLoading(true);

            let infoPyload = {

                ShfCode:
                    selectedDeleteItem?.ShfCode || '',

                ChkDate:
                    selectedDeleteItem?.ChkDate || '',

                MacGrp:
                    selectedDeleteItem?.MacGrp || '',

                PrpCode:
                    selectedDeleteItem?.PrpCode || '',

                yearno:
                    selectedDeleteItem?.yearno ||
                    getCurrentFinancialYear(),

                txntype: 'chekingScanner',

                SrNo:
                    selectedDeleteItem?.SrNo || '',

                UId:
                    selectedDeleteItem?.UId || '',

                BeamNo:
                    selectedDeleteItem?.BeamNo || ''
            };

            console.log(
                "DELETE PAYLOAD =>",
                infoPyload
            );

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const response = await axios.post(
                `${API}/api/delete_checking_detail`,
                infoPyload,
                { headers }
            );

            console.log(
                "DELETE RESPONSE =>",
                response.data
            );

            if (response.data.success) {

                const updatedData =
                    scannerCardData.filter(
                        data =>
                            data.UId !==
                            selectedDeleteItem.UId
                    );

                setScannerCardData(updatedData);

                setVisibleData(updatedData);

                Alert.alert(
                    "Success",
                    response.data.message ||
                    "Record deleted successfully"
                );

                await handleScannerList();

            } else {
                Alert.alert(
                    "Warning",
                    response.data.message
                );
            }

        } catch (error) {

            console.log(
                "DELETE ERROR =>",
                error
            );

            Alert.alert(
                "Error",
                "Something went wrong"
            );

        } finally {

            setIsLoading(false);
        }
    };

    const openDeletePopup = (item) => {

        setSelectedDeleteItem(item);

        setShowDeleteAlert(true);
    };
    if (!permission) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007EA7" />
                <Text>Initializing camera...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Icon name="camera-alt" size={60} color="#999" />
                <Text style={{ marginTop: 15, fontSize: 16, textAlign: 'center' }}>
                    Camera permission is required
                </Text>
                <TouchableOpacity
                    style={{ marginTop: 20, backgroundColor: '#007EA7', padding: 12, borderRadius: 8 }}
                    onPress={requestPermission}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }


    return (
        <>
            {isLoading && <FullScreenLoader />}
            <HeaderBarwithBack
                userName={username}
                header={'Checking scanner'}
                subHeader={'scan with QR code'}
                breadcrumb={'Checking scanner'}
                SearchBar={false}
            />
            {/* <View style={{ flexDirection: 'row', justifyContent: 'flex-start', margin: 10 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: '#007EA7',
                        paddingVertical: 5,
                        paddingHorizontal: 10,
                        borderRadius: 20
                    }}
                    onPress={soshow}
                >
                    <Text style={{ color: '#fff', fontSize: 14 }}>
                        Manual Entry
                    </Text>
                </TouchableOpacity>
            </View>
            <View style={checkingScannerStyles.flexContainer}>
                <Icon name="camera" style={checkingScannerStyles.cameraIcon} />
                <Text style={checkingScannerStyles.titleTextWithIcon}> QR scanner </Text>
                <Button
                    title={isScanning ? "Stop scan" : "Start scan"}
                    color={'#007EA7'}
                    onPress={() => setIsScanning(!isScanning)}
                />
            </View> */}

            {/* <View style={{
                flexDirection: 'row',
                margin: 10,
                backgroundColor: '#eee',
                borderRadius: 25,
                padding: 4
            }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: showManual ? '#007EA7' : 'transparent',
                        paddingVertical: 10,
                        borderRadius: 20
                    }}
                    onPress={() => {
                        setShowManual(true);
                        setIsScanning(false);
                        soshow();

                    }}
                >
                    <Icon name="create" size={18} color={showManual ? "#fff" : "#007EA7"} />
                    <Text style={{
                        color: showManual ? '#fff' : '#000',
                        fontWeight: 'bold'
                    }}>
                        Manual Entry
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: !showManual ? '#007EA7' : 'transparent',
                        paddingVertical: 10,
                        borderRadius: 20
                    }}
                    onPress={() => {
                        setShowManual(false);
                    }}
                >
                    <Icon name="camera" size={18} color={!showManual ? "#fff" : "#007EA7"} />
                    <Text style={{
                        color: !showManual ? '#fff' : '#000',
                        fontWeight: 'bold'
                    }}>
                        QR Scanner
                    </Text>
                </TouchableOpacity>
            </View> */}
            {/* {showManual && (
                <View style={{ margin: 10 }}>
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#007EA7',
                            paddingVertical: 5,
                            paddingHorizontal: 10,
                            borderRadius: 20
                        }}
                        onPress={soshow}
                    >
                        <Text style={{ color: '#fff', fontSize: 14 }}>
                            Manual Entry
                        </Text>
                    </TouchableOpacity>
                </View>
            )} */}
            {/* TAB SWITCHER */}
            <View style={{
                flexDirection: 'row', margin: 10, backgroundColor: '#eee',
                borderRadius: 25, padding: 4
            }}>
                <TouchableOpacity
                    style={{
                        flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                        gap: 5, backgroundColor: showManual ? '#007EA7' : 'transparent',
                        paddingVertical: 10, borderRadius: 20
                    }}
                    onPress={() => { setShowManual(true); setIsScanning(false); soshow(); }}
                >
                    <Icon name="create" size={18} color={showManual ? "#fff" : "#007EA7"} />
                    <Text style={{ color: showManual ? '#fff' : '#000', fontWeight: 'bold' }}>Manual Entry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                        gap: 5, backgroundColor: !showManual ? '#007EA7' : 'transparent',
                        paddingVertical: 10, borderRadius: 20
                    }}
                    onPress={() => setShowManual(false)}
                >
                    <Icon name="camera" size={18} color={!showManual ? "#fff" : "#007EA7"} />
                    <Text style={{ color: !showManual ? '#fff' : '#000', fontWeight: 'bold' }}>QR Scanner</Text>
                </TouchableOpacity>
            </View>
            {/* {!showManual && (
                <View style={checkingScannerStyles.flexContainer}>

                    <Icon name="camera" style={checkingScannerStyles.cameraIcon} />

                    <Text style={checkingScannerStyles.titleTextWithIcon}>
                        QR Scanner
                    </Text>
                    <Button
                        title={isScanning ? "Stop scan" : "Start scan"}
                        color={'#007EA7'}
                        onPress={() => setIsScanning(prev => !prev)}
                    />

                </View>
            )} */}
            {!showManual && (
                <View style={checkingScannerStyles.flexContainer}>
                    <Icon name="camera" style={checkingScannerStyles.cameraIcon} />
                    <Text style={checkingScannerStyles.titleTextWithIcon}>QR Scanner</Text>
                    <Button
                        title={isScanning ? 'Stop scan' : 'Start scan'}
                        color={'#007EA7'}
                        onPress={() => setIsScanning(prev => !prev)}
                    />
                </View>
            )}

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled">
                {/* {
                    isScanning &&
                    (
                        <View style={checkingScannerStyles.cameraContainer}>
                            <>
                                {device && hasPermission && (
                                    <Camera
                                        style={checkingScannerStyles.camera}
                                        device={device}
                                        isActive={true}
                                        codeScanner={codeScanner}
                                    />
                                )}
                                <View style={checkingScannerStyles.overlay}>
                                    <View style={checkingScannerStyles.scanBox} />
                                </View>
                            </>
                        </View>
                    )
                } */}
                {isScanning && (
                    <View style={checkingScannerStyles.cameraContainer}>
                        {/* ✅ EXPO CAMERA (replaces vision-camera Camera) */}
                        <CameraView
                            style={checkingScannerStyles.camera}
                            facing="back"
                            onBarcodeScanned={handleBarCodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ['qr'],
                            }}
                        />
                        <View style={checkingScannerStyles.overlay}>
                            <View style={checkingScannerStyles.scanBox} />
                        </View>
                    </View>
                )}
                <View style={{
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    padding: 12,
                    elevation: 2,
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={{ width: '48%' }}>
                            <Text style={checkingScannerStyles.label}>Beam Number <Text style={{ color: 'red' }}> *</Text></Text>
                            <TextInput
                                style={checkingScannerStyles.inputDisabled}
                                value={beamNo}
                                editable={false}
                            />
                        </View>

                        <View style={{ width: '48%' }}>
                            <Text style={checkingScannerStyles.label}>Taka No <Text style={{ color: 'red' }}> *</Text></Text>
                            <TextInput
                                style={checkingScannerStyles.inputDisabled}
                                value={takaNo}
                                editable={false}
                            />
                        </View>
                    </View>
                    <Text style={checkingScannerStyles.label}>Design <Text style={{ color: 'red' }}> *</Text></Text>
                    <View style={checkingScannerStyles.dropdown}>
                        {/* <Picker
                            selectedValue={design || ''}
                            onValueChange={(itemValue) => {
                                setDesign(itemValue);
                                const selectedRow = getData.find(el => el.DsnCode === itemValue);
                                setWarpLen(selectedRow?.WarpLen || '0');
                            }}
                        >
                            <Picker.Item label="Select Design" value="" enabled={false} />
                            {getData.map((item, index) => (
                                <Picker.Item key={index} label={item.DsnName} value={item.DsnCode} />
                            ))}
                        </Picker> */}
                        <View style={{ flex: 1 }}>
                            <PartyDropdown
                                data={getData}
                                placeholder="Choose design..."
                                labelKey={["dsnname", "dsncode"]}
                                valueKey="dsncode"
                                pageSize={12}
                                initialValue={null}
                                selected={null}
                                loading={false}
                                type="checkingdesigndata"
                                // onSelect={(item) => {
                                //     const selectedDesign = item?.dsncode || '';
                                //     setDesign(item.dsncode);
                                //     setWarpLen(item.WarpLen || '0');

                                //     if (scannedValue) {
                                //         sendScannedValue1(scannedValue, selectedDesign);
                                //     }
                                // }}
                                onSelect={(item) => {
                                    const selectedDesign = item?.dsncode || '';

                                    console.log("👉 DESIGN SELECTED:", selectedDesign);
                                    console.log("👉 SCANNED VALUE:", scannedValue);

                                    setDesign(selectedDesign);
                                    // setWarpLen(item.WarpLen || '0');

                                    if (scannedValue) {
                                        console.log("🔥 CALLING API...");
                                        sendScannedValue1(scannedValue, selectedDesign);
                                    } else {
                                        console.log("❌ scannedValue missing");
                                    }
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
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={{ width: '48%' }}>
                            <Text style={checkingScannerStyles.label}>Meter <Text style={{ color: 'red' }}> *</Text>
                                {
                                    typeof getWarpLen != 'undefined' && getWarpLen != '' && getWarpLen != null && parseFloat(getWarpLen) != 0 ? <Text style={{ fontSize: 11, color: '#000', }}> [ {getWarpLen} ] </Text> : null
                                }
                            </Text>
                            <TextInput
                                style={checkingScannerStyles.input}
                                value={meter}
                                keyboardType="decimal-pad"
                                onChangeText={handleMeterChange}
                            />
                        </View>

                        <View style={{ width: '48%' }}>
                            <Text style={checkingScannerStyles.label}>Kgs <Text style={{ color: 'red' }}> *</Text></Text>
                            <TextInput
                                style={checkingScannerStyles.input}
                                value={kgs}
                                keyboardType="decimal-pad"
                                onChangeText={handleKgsChange}
                            />
                        </View>
                    </View>
                    <Text style={checkingScannerStyles.label}>Avg. Wt <Text style={{ color: 'red' }}> *</Text></Text>
                    <TextInput
                        style={checkingScannerStyles.inputDisabled}
                        value={getavgWt}
                        editable={false}
                    />
                    <Text style={checkingScannerStyles.label}>Grade <Text style={{ color: 'red' }}> *</Text></Text>
                    <View style={checkingScannerStyles.dropdown}>
                        {/* <Picker selectedValue={grade} onValueChange={setGrade}>
                            <Picker.Item label="Select Grade" value="" enabled={false} />
                            {getGradeData.map((item, i) => (
                                <Picker.Item key={i} label={item.GrdName} value={item.GrdCode} />
                            ))}
                        </Picker> */}
                        {/* <View style={{ flex: 1 }}> */}
                        <PartyDropdown
                            data={getGradeData}
                            placeholder="Choose grade..."
                            labelKey={["GrdName", "GrdCode"]}
                            valueKey="GrdCode"
                            pageSize={12}
                            initialValue={null}
                            selected={null}
                            loading={false}
                            type="grd"
                            onSelect={(item) => {
                                setGrade(item.GrdCode);
                            }}
                            setSelected={(val) => {
                                if (!val) {
                                    setGrade('');
                                } else {
                                    setGrade(val.GrdCode);
                                }
                            }}
                        />
                        {/* </View> */}
                    </View>
                    <Text style={checkingScannerStyles.label}>Checker <Text style={{ color: 'red' }}> *</Text></Text>
                    {/* <View style={checkingScannerStyles.dropdown}> */}
                    {/* <Picker
                            selectedValue={checker}
                            onValueChange={(val) => {
                                setChecker(val);
                                AsyncStorage.setItem('csChecker', val);
                            }}
                        >
                            <Picker.Item label="Select Checker" value="" enabled={false} />
                            {getCheckerData.map((item, i) => (
                                <Picker.Item key={i} label={item.EmpName} value={item.EmpCode} />
                            ))}
                        </Picker> */}
                    <View style={checkingScannerStyles.dropdown}>
                        <PartyDropdown
                            data={getCheckerData}
                            placeholder="Choose checker..."
                            labelKey={["EmpName", "EmpCode"]}
                            valueKey="EmpCode"
                            pageSize={12}
                            initialValue={null}
                            selected={null}
                            loading={false}
                            type="checker"
                            onSelect={(item) => {
                                setChecker(item.EmpCode);
                            }}
                            setSelected={(val) => {
                                if (!val) {
                                    setChecker('');
                                } else {
                                    setChecker(val.EmpCode);
                                }
                            }}
                        />
                    </View>
                    {/* ✅ SHIFT - using CustomPicker (Expo compatible) */}
                    <Text style={checkingScannerStyles.label}>Shift <Text style={{ color: 'red' }}> *</Text></Text>
                    <View style={checkingScannerStyles.dropdown}>
                        <CustomPicker
                            selectedValue={shift}
                            onValueChange={(val) => setShift(val)}
                        >
                            <CustomPicker.Item label="Select shift" value="" enabled={false} />
                            {getShiftData.map((item: any, i: number) => (
                                <CustomPicker.Item key={i} label={item.ShfName} value={item.ShfCode} />
                            ))}
                        </CustomPicker>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                        <Text style={checkingScannerStyles.label}>Is mending?</Text>
                        <Switch
                            value={isMending}
                            onValueChange={setIsMending}
                            trackColor={{ false: "#ccc", true: "#007EA7" }}
                        />
                    </View>
                    <View style={checkingScannerStyles.buttonRow}>
                        <TouchableOpacity style={checkingScannerStyles.submitBtn1} onPress={handleSubmitScan}>
                            <Icon
                                name="save-alt"
                                size={20}
                                color="#fff"
                                style={{ marginRight: 8 }}
                            />
                            <Text style={checkingScannerStyles.submitText}>Submit Scan</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={checkingScannerStyles.submitBtn1} onPress={handleScannerList}>
                            <Icon
                                name="checklist-rtl"
                                size={20}
                                color="#fff"
                                style={{ marginRight: 8 }}
                            />

                            <Text style={checkingScannerStyles.submitText}>Scanner List</Text>
                        </TouchableOpacity>
                    </View>
                    {getDataSaved && (
                        <View style={{ flexDirection: 'row', marginTop: 10 }}>
                            <TouchableOpacity style={checkingScannerStyles.printBtn} onPress={printSticker}>
                                <Text style={checkingScannerStyles.actionText}>Print</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={checkingScannerStyles.clearBtn}>
                                <Text style={checkingScannerStyles.actionText}>Clear</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                </View>
            </ScrollView>

            <Modal
                visible={showManualPopup}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowManualPopup(false)}
            >
                <View style={checkingScannerStyles.modalOverlay}>
                    <View style={checkingScannerStyles.modalBox}>
                        <Text style={checkingScannerStyles.modalTitle}>Manual Entry</Text>
                        <View style={checkingScannerStyles.formGroup}>
                            <View style={checkingScannerStyles.rowHorizontal}>
                                <Text style={checkingScannerStyles.labelHorizontal}>
                                    Machine <Text style={{ color: 'red' }}>*</Text>
                                </Text>

                                <View style={{ flex: 1 }}>
                                    <PartyDropdown
                                        key={selectedMachine ? selectedMachine.MacCode : 'empty'}
                                        data={machinedata}
                                        placeholder="Choose machine..."
                                        labelKey={["MacName", "MacCode"]}
                                        valueKey="MacCode"
                                        pageSize={12}
                                        selected={selectedMachine}
                                        loading={false}
                                        type="machine"
                                        onSelect={(item) => {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    MacCode: item.MacCode,
                                                    MacName: item.MacName
                                                }
                                            }));
                                            setSelectedMachine(item);
                                        }}

                                    // setSelected={(val) => {
                                    //     if (!val) {
                                    //         setFormState(prev => ({
                                    //             ...prev,
                                    //             values: {
                                    //                 ...prev.values,
                                    //                 MacCode: '',
                                    //                 MacName: ''
                                    //             }
                                    //         }));
                                    //         setSelectedMachine(null);
                                    //     } else {
                                    //         setFormState(prev => ({
                                    //             ...prev,
                                    //             values: {
                                    //                 ...prev.values,
                                    //                 MacCode: val.MacCode,
                                    //                 MacName: val.MacName
                                    //             }
                                    //         }));
                                    //         setSelectedMachine(val);
                                    //     }
                                    // }}
                                    />
                                </View>
                            </View>

                            {/* Taka */}
                            <View style={checkingScannerStyles.rowHorizontal}>
                                <Text style={checkingScannerStyles.labelHorizontal}>Taka No</Text>
                                <TextInput
                                    style={checkingScannerStyles.inputDisabledHorizontal}
                                    value={FormState.values.TakaNo}
                                    onChangeText={(text) => handleChange('TakaNo', text)}
                                    maxLength={20}
                                />
                            </View>

                            <View style={checkingScannerStyles.rowHorizontal}>
                                <Text style={checkingScannerStyles.labelHorizontal}>Design</Text>
                                <View style={{ flex: 1 }}>
                                    <PartyDropdown
                                        key={selecteddesign ? selecteddesign.dsncode : 'empty'}
                                        data={getdesigndata}
                                        placeholder="Choose Design..."
                                        labelKey={["dsnname", "dsncode"]}
                                        valueKey="dsncode"
                                        pageSize={12}
                                        selected={selecteddesign}
                                        loading={false}
                                        type="checkingdesigndata"
                                        onSelect={(item) => {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    DsnCode: item.dsncode,
                                                    DsnName: item.dsnname
                                                }
                                            }));
                                            setselecteddesign(item);
                                        }}

                                    // setSelected={(val) => {
                                    //     if (!val) {
                                    //         setFormState(prev => ({
                                    //             ...prev,
                                    //             values: {
                                    //                 ...prev.values,
                                    //                 MacCode: '',
                                    //                 MacName: ''
                                    //             }
                                    //         }));
                                    //         setSelectedMachine(null);
                                    //     } else {
                                    //         setFormState(prev => ({
                                    //             ...prev,
                                    //             values: {
                                    //                 ...prev.values,
                                    //                 MacCode: val.MacCode,
                                    //                 MacName: val.MacName
                                    //             }
                                    //         }));
                                    //         setSelectedMachine(val);
                                    //     }
                                    // }}
                                    />
                                </View>
                            </View>

                            {/* Qty */}
                            <View style={checkingScannerStyles.rowHorizontal}>
                                <Text style={checkingScannerStyles.labelHorizontal}>Qty</Text>
                                <TextInput
                                    style={checkingScannerStyles.inputDisabledHorizontal}
                                    keyboardType="decimal-pad"
                                    onFocus={() => {
                                        if (FormState.values.Qty === '0.00') {
                                            handleChange('Qty', '');
                                        }
                                    }}
                                    onChangeText={(text) => {
                                        const re = /^\d*(?:[.,]\d{0,3})?$/;

                                        if (text === '' || re.test(text)) {
                                            handleChange('Qty', text);
                                        }
                                    }}
                                    value={FormState?.values?.Qty}

                                />
                            </View>

                        </View>

                        {/* 🔘 BUTTONS */}
                        <View style={{ flexDirection: 'row', marginTop: 15 }}>
                            <TouchableOpacity
                                style={[checkingScannerStyles.submitBtn, { flex: 1, marginRight: 5 }]}
                                onPress={handlesave}
                            >
                                <Text style={checkingScannerStyles.submitText}>Save</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[checkingScannerStyles.submitBtn, { flex: 1, marginLeft: 5, backgroundColor: '#999' }]}
                                // onPress={() => setShowManualPopup(false)
                                //      handleClearForm();
                                // }
                                onPress={() => {
                                    setShowManualPopup(false);
                                    handleClearForm();
                                }}
                            >
                                <Text style={checkingScannerStyles.submitText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {scannerModal && (
                <View style={styles.detailOverlay123}>
                    <View style={styles.detailContainer}>

                        <View style={{
                            flex: 1,
                            backgroundColor: '#fff'
                        }}>

                            {/* HEADER */}
                            <View style={checkingScannerStyles.headerContainer}>

                                <View>
                                    <Text style={{
                                        fontSize: 24,
                                        fontWeight: '900',
                                        color: '#111'
                                    }}>
                                        Scanner List
                                    </Text>

                                    <Text style={{
                                        color: '#777',
                                        marginTop: 3
                                    }}>
                                        {scannerCardData.length} items
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={checkingScannerStyles.closeButton}
                                    onPress={() => setScannerModal(false)}
                                >
                                    <Icon
                                        name="close"
                                        size={24}
                                        color="#000"
                                    />
                                </TouchableOpacity>

                            </View>

                            {/* SEARCH */}
                            <View style={checkingScannerStyles.searchContainer}>

                                <Icon
                                    name="search"
                                    size={22}
                                    color="#777"
                                />

                                <TextInput
                                    placeholder="Search scanner data..."
                                    placeholderTextColor="#999"
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    style={{
                                        flex: 1,
                                        marginLeft: 10,
                                        color: '#000'
                                    }}
                                />

                            </View>

                            {
                                scannerLoading ? (

                                    <View style={{
                                        flex: 1,
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}>
                                        <ActivityIndicator
                                            size="large"
                                            color="#007EA7"
                                        />
                                    </View>

                                ) : (

                                    <FlatList
                                        data={filteredData}
                                        keyExtractor={(item, index) =>
                                            index.toString()
                                        }
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{
                                            padding: 16,
                                            paddingBottom: 40
                                        }}
                                        onEndReached={loadMoreData}
                                        onEndReachedThreshold={0.5}
                                        initialNumToRender={10}
                                        maxToRenderPerBatch={10}
                                        windowSize={10}
                                        removeClippedSubviews={true}
                                        ListFooterComponent={() =>
                                            footerLoading ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color="#007EA7"
                                                    style={{
                                                        marginVertical: 20
                                                    }}
                                                />
                                            ) : null
                                        }
                                        renderItem={({ item, index }) => (

                                            <View style={checkingScannerStyles.billCard}>
                                                <View style={checkingScannerStyles.leftBorder} />
                                                <View style={checkingScannerStyles.iconContainer}>
                                                    <Icon
                                                        name="qr-code-scanner"
                                                        size={24}
                                                        color="#007EA7"
                                                    />
                                                </View>
                                                <View style={{
                                                    flex: 1,
                                                    marginLeft: 14
                                                }}>

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
                                                        Taka : {item.TakaNo}
                                                    </Text>

                                                    {/* <Text style={checkingScannerStyles.subText}>
                                                Machine : {item.MacName}
                                            </Text> */}

                                                    {/* <Text style={checkingScannerStyles.subText}>
                                                Design Code : {item.OrdDsnCode}
                                            </Text> */}

                                                    <Text style={checkingScannerStyles.subText}>
                                                        Design : {item.OrdDsnName}
                                                    </Text>

                                                    <Text style={checkingScannerStyles.subText}>
                                                        Weight : {item.Wt}
                                                    </Text>

                                                    <Text style={checkingScannerStyles.subText}>
                                                        Avg Weight : {item.AvgWt}
                                                    </Text>

                                                    {/* <Text style={checkingScannerStyles.subText}>
                                                Grade Code : {item.GrdCode}
                                            </Text> */}

                                                    <Text style={checkingScannerStyles.subText}>
                                                        Grade : {item.GrdName}
                                                    </Text>
                                                    {/* 
                                            <Text style={checkingScannerStyles.subText}>
                                                Checker Code : {item.ChkCode}
                                            </Text>

                                            <Text style={checkingScannerStyles.subText}>
                                               Checker : {item.ChkName}
                                            </Text> */}

                                                    <View style={{
                                                        marginTop: 8,
                                                        alignSelf: 'flex-start',
                                                        backgroundColor: '#E8F5E9',
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 4,
                                                        borderRadius: 20
                                                    }}>
                                                        <Text style={{
                                                            color: '#2E7D32',
                                                            fontWeight: '700',
                                                            fontSize: 11
                                                        }}>
                                                            Scanned
                                                        </Text>
                                                    </View>

                                                </View>

                                                {/* RIGHT */}
                                                <View style={{
                                                    alignItems: 'flex-end',
                                                    justifyContent: 'space-between'
                                                }}>

                                                    <TouchableOpacity
                                                        style={checkingScannerStyles.deleteButton}
                                                        // onPress={() => {

                                                        //     const updated =
                                                        //         scannerCardData.filter(
                                                        //             (_, i) => i !== index
                                                        //         );

                                                        //     setScannerCardData(updated);

                                                        //     setVisibleData(updated);
                                                        // }}

                                                        onPress={() => {

                                                            console.log("DELETE CLICK =>", item);

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

                                                    <Text style={checkingScannerStyles.qty}>
                                                        {item.Qty}
                                                    </Text>

                                                </View>

                                            </View>
                                        )}
                                    />
                                )
                            }

                        </View>

                    </View>
                </View>
            )}

            {
                showDeleteAlert && (

                    <Modal
                        transparent={true}
                        animationType="fade"
                        visible={showDeleteAlert}
                        onRequestClose={() => setShowDeleteAlert(false)}
                    >

                        <View style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.45)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingHorizontal: 25
                        }}>

                            <View style={{
                                width: '100%',
                                backgroundColor: '#fff',
                                borderRadius: 18,
                                padding: 20
                            }}>

                                {/* TITLE */}
                                <Text style={{
                                    fontSize: 20,
                                    fontWeight: '800',
                                    color: '#111',
                                    textAlign: 'center'
                                }}>
                                    Delete Record
                                </Text>

                                {/* MESSAGE */}
                                <Text style={{
                                    marginTop: 14,
                                    fontSize: 15,
                                    color: '#666',
                                    textAlign: 'center',
                                    lineHeight: 22
                                }}>
                                    Are you sure you want to delete this scanner record?
                                </Text>

                                {/* BUTTONS */}
                                <View style={{
                                    flexDirection: 'row',
                                    marginTop: 24
                                }}>

                                    {/* CANCEL */}
                                    <TouchableOpacity
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#EAEAEA',
                                            paddingVertical: 13,
                                            borderRadius: 12,
                                            marginRight: 8,
                                            alignItems: 'center'
                                        }}
                                        onPress={() =>
                                            setShowDeleteAlert(false)
                                        }
                                    >
                                        <Text style={{
                                            color: '#333',
                                            fontWeight: '700',
                                            fontSize: 15
                                        }}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>

                                    {/* DELETE */}
                                    <TouchableOpacity
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#E53935',
                                            paddingVertical: 13,
                                            borderRadius: 12,
                                            marginLeft: 8,
                                            alignItems: 'center'
                                        }}
                                        // onPress={handledelete}
                                        onPress={() => {

                                            console.log(
                                                "CONFIRM DELETE CLICK"
                                            );

                                            handledelete();
                                        }}
                                    >
                                        <Text style={{
                                            color: '#fff',
                                            fontWeight: '700',
                                            fontSize: 15
                                        }}>
                                            Yes, Delete
                                        </Text>
                                    </TouchableOpacity>

                                </View>

                            </View>

                        </View>

                    </Modal>
                )
            }

            {
                isLoading && (

                    <Modal
                        transparent={true}
                        animationType="fade"
                    >

                        <View style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.35)',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>

                            <View style={{
                                backgroundColor: '#fff',
                                paddingVertical: 25,
                                paddingHorizontal: 30,
                                borderRadius: 18,
                                alignItems: 'center'
                            }}>

                                <ActivityIndicator
                                    size="large"
                                    color="#007EA7"
                                />

                                <Text style={{
                                    marginTop: 14,
                                    fontSize: 15,
                                    fontWeight: '700',
                                    color: '#333'
                                }}>
                                    Deleting record...
                                </Text>

                            </View>

                        </View>

                    </Modal>
                )
            }
        </>
    );
};

const styles = StyleSheet.create({
    // 
    detailOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
        zIndex: 100, // Higher than summary modal
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailOverlay123: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
        zIndex: 200, // Higher than summary modal
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Detail Container
    detailContainer: {
        backgroundColor: '#fff',
        // padding: 20,
        paddingTop: 45,
        borderRadius: 10,
        width: '100%',
        height: '100%',
        elevation: 5, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },

});
export default CheckingScanner;
