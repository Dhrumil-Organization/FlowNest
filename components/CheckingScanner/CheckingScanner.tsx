import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, TextInput as RNTextInput, Button, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import FullScreenLoader from '../Loader/Loader';
import { checkingScannerStyles } from '../../common/Styles/Style';
import { API, PRINTSTICKER, PRINTERSLISTAPI } from '../../common/API/dynamicAPI';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView } from 'react-native';
import Snackbar from 'react-native-snackbar';
import { Switch } from 'react-native';
import PartyDropdown from '../Shared/PartyDropdown';
interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
}

const CheckingScanner: React.FC<Props> = ({ token, navigation, isConnected, username }) => {

    const device = useCameraDevice('back');
    const scanLock = useRef(false);
    const [isScanning, setIsScanning] = useState(false);
    const { hasPermission, requestPermission } = useCameraPermission();
    const [scannedValue, setScannedValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [getData, setData] = useState([]);
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
    //
    const [showManualPopup, setShowManualPopup] = useState(false);
    const [machinedata, setMachineData] = useState([]);
    const [FormState, setFormState] = useState({
        values: {}
    });

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

    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            setBeamNo('');
            setTakaNo('');
            setBeamUid('');
            setPrpCode('');
            setYearNo('')
            setMeter('')
            setKgs('');
            setavgWt('');
            setWarpLen('')
            setData([])
            setDesign('')
            setGradeData([])
            setGrade('')
            setCheckerData([]);
            setChecker('')
            setScannedObj({})
            setShift('')
            setPrinter('')
            setPrinters([])

            const value = codes[0]?.value || '';
            console.log("📦 Raw QR Value 👉", value);

            try {

                const parsed = JSON.parse(value);
                setScannedObj(parsed)
                setBeamNo(parsed.beamno || '');
                setTakaNo(parsed.takano || '');
                setBeamUid(parsed.beamuid || '');
                setPrpCode(parsed.prpcode || '');
                setYearNo(parsed.yearNo || '')
                setMeter('')
                setKgs('');
                setavgWt('');
                getGrades(parsed)
                getCheckers(parsed)
                getShifts(parsed)
                sendScannedValue(value);
            } catch (err) {
                setBeamNo('');
                setTakaNo('');
                setBeamUid('');
                setPrpCode('');
                setYearNo('')
                setMeter('')
                setKgs('');
                setavgWt('');
                setWarpLen('')
                setData([])
                setDesign('')
                setGradeData([])
                setGrade('')
                setCheckerData([]);
                setChecker('')
                setScannedObj({})
                setShift('')
                setPrinter('')
                setPrinters([])
                Alert.alert("Invalid QR", "QR format not valid");
            }
            setIsScanning(false);
        },
    });

    if (!device || !hasPermission) {
        return (<View><Text>No camera permission or device not available</Text></View>);
    }

    const getToken = () => {
        return token;
    };

    const getGrades = async (qrValue: object) => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        let yno = await AsyncStorage.getItem('yno');

        try {
            const historyPayload = {
                txntype: 'beam_checking_tablet',
                referrer: 'dashboard',
                fetch: 'grd',
                prpcode: qrValue.prpcode,
                yearno: yno
            };
            //console.log("grade api payload historyPayload :", historyPayload)
            const response = await axios.get(
                `${API}/api/get_criterion`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );

            if (response.data.success && response.data.response.data.length > 0) {
                setGradeData(response.data.response.data);
            } else {
                setGradeData([]);
            }
        } catch (error) {
            console.log("grade API error:", error);
        } finally {
            setIsLoading(false)
        }
    }

    const getCheckers = async (qrValue: object) => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            let yno = await AsyncStorage.getItem('yno');
            const historyPayload = {
                txntype: 'beam_checking_tablet',
                referrer: 'dashboard',
                fetch: 'prodrepackchkby',
                prpcode: qrValue.prpcode,
                yearno: yno
            };

            const response = await axios.get(
                `${API}/api/get_criterion`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );

            if (response.data.success && response.data.response.data.length > 0) {
                setCheckerData(response.data.response.data);
                let tempChecker = '';
                tempChecker = await AsyncStorage.getItem('csChecker');

                if (typeof tempChecker != 'undefined' && tempChecker != null && tempChecker != '') {
                    response.data.response.data && response.data.response.data.filter((el, ind) => {
                        if (el.EmpCode == tempChecker) {
                            setChecker(tempChecker);
                        }
                    })
                }
            } else {
                setCheckerData([]);
            }
        } catch (error) {
            console.log("API getCheckers error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const getShifts = async (qrValue: object) => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            let yno = await AsyncStorage.getItem('yno');

            const historyPayload = {
                // text: parcode,
                txntype: 'beam_checking_tablet',
                referrer: 'dashboard',
                fetch: 'shift',
                prpcode: qrValue.prpcode,
                yearno: yno

            };
            //console.log("get shift api historyPayload payload :", historyPayload)
            const response = await axios.get(
                `${API}/api/get_criterion`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );

            if (response.data.success && response.data.response.data.length > 0) {
                setShiftData(response.data.response.data);
            } else {
                setShiftData([]);
            }
        } catch (error) {
            console.log("API getshifts error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const sendScannedValue = async (qrValue: string) => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);

        try {
            let temp = JSON.parse(qrValue)
            let yno = await AsyncStorage.getItem('yno');

            let infoPyload = {
                txntype: 'chekingScanner',
                referrer: 'dashboard',
                scannedString: temp,
                prpcode: temp.prpcode,
                // yearno: yno
                yearno: '26'
            };
            console.log("infoPyload", infoPyload)
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/get_auto_checking_help`, infoPyload, { headers });
            console.log("response", response)
            if (response.data.success && response.data.response.data) {
                setData(response.data.response.data);
                setIsLoading(false);
            } else {
                setIsLoading(false);
                console.error('Unexpected response structure:', response.data);
                Alert.alert(`${response.data}`);
            }
        } catch (error) {
            //console.log("API sendScannedValue error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMeterChange = (value: string) => {

        if (typeof design == 'undefined' || design == null || design == '') {
            Alert.alert("Design", "Please select design first");
            return;
        } else {
            let qltWt = 0.00;
            getData && getData.filter((el, ind) => {
                if (el.DsnCode == design) {
                    qltWt = el.QltWt;
                }
            })

            value = value.replace(',', '.');
            const regex = /^\d*(?:\.\d{0,2})?$/;

            if (value === '' || regex.test(value)) {
                setMeter(value);
                setValidMeter(value);
            }

            let qty = 0.0;
            qty = isNaN(value) ? 0.0 : parseFloat(value);

            let wt = 0.0;
            wt = isNaN(qty) || isNaN(qltWt) || parseFloat(qty) == 0 || parseFloat(qltWt) == 0 ? 0.0 : (parseFloat(qty) * parseFloat(qltWt)).toFixed(2);

            let avgWt = 0.0;
            avgWt = isNaN(qty) || isNaN(wt) || parseFloat(qty) == 0 || parseFloat(wt) == 0 ? 0.0 : ((parseFloat(wt) * 100) / parseFloat(qty)).toFixed(2);

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

            let avgWt =
                qty === 0 || wt === 0
                    ? 0
                    : ((wt * 100) / qty).toFixed(2);

            setavgWt(avgWt);
        }
    }

    const handleSubmitScan = async () => {

        if (typeof beamNo == 'undefined' || beamNo == null || beamNo == '') {
            Alert.alert('Beam no can not be blank');
            return false;
        } else if (typeof takaNo == 'undefined' || takaNo == null || takaNo == '') {
            Alert.alert('Taka no can not be blank');
            return false;
        } else if (typeof design == 'undefined' || design == null || design == '') {
            Alert.alert('Design can not be blank.');
            return false;
        } else if (typeof meter == 'undefined' || meter == null || meter == '' || parseInt(meter) <= 0) {
            Alert.alert('Meter can not be blank or 0.');
            return false;
        } else if (typeof meter == 'undefined' || meter == null || meter == '' || parseInt(meter) > 0 && (parseFloat(meter) > parseFloat(getWarpLen))) {
            Alert.alert(`Meter ${meter} can not be greater than ${getWarpLen}.`);
            return false;
        } else if (typeof kgs == 'undefined' || kgs == null || kgs == '' || parseInt(kgs) <= 0) {
            Alert.alert('Kgs can not be blank or 0.');
            return false;
        } else if (typeof kgs == 'undefined' || kgs == null || kgs == '' || parseInt(kgs) <= 0) {
            Alert.alert('Kgs can not be blank or 0.');
            return false;
        } else if (typeof grade == 'undefined' || grade == null || grade == '') {
            Alert.alert('Grade can not be blank.');
            return false;
        } else if (typeof checker == 'undefined' || checker == null || checker == '') {
            Alert.alert('Checker can not be blank.');
            return false;
        } else if (typeof shift == 'undefined' || shift == null || shift == '') {
            Alert.alert('Shift can not be blank.');
            return false;
        } else {
            let finalObj = new Object();
            getData && getData.filter((el, ind) => {
                if (design == el.DsnCode) {
                    finalObj = el;
                }
            })

            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();
            setIsLoading(true);

            try {
                let yno = await AsyncStorage.getItem('yno');
                let payloadObj = new Object();
                payloadObj = finalObj;
                payloadObj['prpcode'] = getScannedObj.prpcode;
                payloadObj['yearno'] = yno;
                payloadObj['TakaNo'] = takaNo;
                payloadObj['GrdCode'] = grade;
                //payloadObj['EmpCode'] = checker;
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

                const headers = {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json',
                    'X-Requested-with': 'XMLHttpRequest',
                };
                const response = await axios.post(`${API}/api/add_auto_checking_detail`, payloadObj, { headers });

                if (response.data.success == true) {
                    setIsLoading(false);
                    setDataSaved(true);

                    if (response.data.hasOwnProperty('data') && typeof response.data.data != 'undefined' && response.data.data && response.data.data.length > 0) {
                        setSavedData(response.data.data.main[0])
                    }
                    getAllPrinters();
                    Snackbar.show({
                        text: 'Saved successfully',
                        duration: Snackbar.LENGTH_LONG,
                        backgroundColor: '#000',
                        action: { text: 'OK', textColor: 'green' },
                    });
                } else if (response.data.success === false) {
                    setIsLoading(false);
                    setDataSaved(false);
                    Snackbar.show({
                        text: response.data.message,
                        duration: Snackbar.LENGTH_LONG,
                        backgroundColor: '#000',
                        textColor: '#fff',
                        action: { text: 'OK', textColor: 'yellow' },
                    });
                } else {
                    setIsLoading(false);
                    setDataSaved(false);
                    Snackbar.show({
                        text: response.data.message,
                        duration: Snackbar.LENGTH_LONG,
                        backgroundColor: '#000',
                        textColor: '#fff',
                        action: { text: 'OK', textColor: 'red' },
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
    }

    const clearDesign = () => {
        setDesign('');
        setWarpLen('0');
        setMeter('')
        setKgs('')
        setavgWt('');
    };
    const clearGrade = () => {
        setGrade('');
    };
    const clearChecker = () => {
        setChecker('');
    };
    const clearShift = () => {
        setShift('');
    };
    const clearPrinter = () => {
        setPrinter('');
    }

    const printSticker = () => {
        if (typeof printer == 'undefined' || printer == null || printer == '') {
            Alert.alert('Please select printer first.');
            return false;
        } else {
            setIsLoading(true);
            console.log('printsticker function :', getSavedData);
            let temppayloadObj = new Object();

            if (Object.keys(getSavedData).length > 0) {
                temppayloadObj = {
                    uid: getSavedData.UId,
                    inwno: "",
                    inwdate: "",
                    srno: getSavedData.SrNo,
                    itmcode: "",
                    itmname: "",
                    dsncode: getSavedData.DsnCode,
                    dsnname: getSavedData.DsnName,
                    rcno: "",
                    amount: "",
                    subsr: getSavedData.subsr,
                    takano: getSavedData.TakaNo,
                    qty: getSavedData.Qty,
                    trantype: getSavedData.trantype,
                    ttype: "",
                    dptname: "",
                    shdcode: getSavedData.shdcode,
                    shdname: getSavedData.shdname,
                    whr: "",
                    yarncostr: "",
                    yard: "",
                    sexecname: "",
                    strcode: "",
                    unqsrno: ""
                }
                const params = {
                    data: [getSavedData],
                    IskgQty: 0,
                    printype: "Print",
                    PrintFormat: 1,
                    printerName: printer ? printer : '',
                    txntype: 'chekingScanner'
                };

                axios.post(`${PRINTSTICKER}`, params)
                    .then(response => {
                        setIsLoading(false);
                        const res = response.data;

                        if (res.success) {
                            Snackbar.show({
                                text: '✅ ${res.printed} label(s) sent to printer.',
                                duration: Snackbar.LENGTH_INDEFINITE,
                                backgroundColor: 'green',
                                action: { text: 'OK', textColor: 'white' },
                            });
                        } else {
                            Snackbar.show({
                                text: res.message || 'Operation failed',
                                duration: Snackbar.LENGTH_INDEFINITE,
                                backgroundColor: 'red',
                                action: { text: 'OK', textColor: 'white' },
                            });
                        }
                    }).catch(error => {
                        setIsLoading(false);
                        Snackbar.show({
                            text: error?.response?.data?.error || error.message || 'Print failed',
                            duration: Snackbar.LENGTH_LONG,
                            backgroundColor: 'red',
                            action: { text: 'OK', textColor: 'white' },
                        });
                    });
            } else {
                setIsLoading(false);
                Snackbar.show({
                    text: 'printing sticker data is empty',
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: 'red',
                    textColor: '#fff',
                    action: { text: 'OK', textColor: '#fff' },
                });
            }
        }
    }

    const getAllPrinters = async () => {
        try {
            const res = await axios.get(PRINTERSLISTAPI);
            const printerList = res.data?.printers || res.data || [];
            setPrinters(printerList);
        } catch (err) {
            console.log("Printer API error:", err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleChange = (key, value) => {
        setFormState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                [key]: value
            }
        }));
    };

    const fetchmachine = async () => {
        try {
            setIsLoading(true);
            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();
            const historyPayload = {
                prptype: 'S',
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

    const soshow = async () => {
        setIsLoading(true);
        try {
            const historyPayload = {
                prptype: 'S',
                yearno: getCurrentFinancialYear(),
                txntype: 'manual_checking',
                MacCode: '',
                TakaNo: ''
            };
            const response = await axios.get(
                `${API}/api/get_manual_checking_detail`,
                getRequestConfig({
                    params: { ...historyPayload }
                })
            );

            console.log("soshow response", response);

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
        const isValid = await validateForm();
        if (!isValid) return;

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            const payloadObj = {
                ...FormState.values,
                prptype: "S",
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
                Snackbar.show({
                    text: `⚠️ ${response.data.message}`,
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: '#D32F2F',   // 🔥 RED (error)
                    textColor: '#fff',
                    numberOfLines: 2,
                    action: {
                        text: 'OK',
                        textColor: '#fff',
                        onPress: () => { }
                    },
                });
            } else {
                setIsLoading(false);
                setDataSaved(false);
                Snackbar.show({
                    text: response.data.message,
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: '#000',
                    textColor: '#fff',
                    action: { text: 'OK', textColor: 'red' },
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

    return (
        <>
            {isLoading && <FullScreenLoader />}
            <HeaderBarwithBack
                userName={username}
                header={'Checking scanner'}
                subHeader={'scan with QR code'}
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
            </View> */}
            <View style={checkingScannerStyles.flexContainer}>
                <Icon name="camera" style={checkingScannerStyles.cameraIcon} />
                <Text style={checkingScannerStyles.titleTextWithIcon}> QR scanner </Text>
                <Button
                    title={isScanning ? "Stop scan" : "Start scan"}
                    color={'#007EA7'}
                    onPress={() => setIsScanning(!isScanning)}
                />
            </View>

            <ScrollView
                style={checkingScannerStyles.container}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                >
                {
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
                }
                <View style={checkingScannerStyles.container}>
                    <View style={checkingScannerStyles.row}>
                        <View style={checkingScannerStyles.halfInput}>
                            <Text style={checkingScannerStyles.label}>Beam Number <Text style={{ color: 'red' }}> *</Text></Text>
                            <TextInput
                                placeholder="Beam number"
                                style={checkingScannerStyles.inputDisabled}
                                value={beamNo}
                                onChangeText={setBeamNo}
                                editable={false}
                            />
                        </View>
                        <View style={checkingScannerStyles.halfInput}>
                            <Text style={checkingScannerStyles.label}>
                                Taka No
                                <Text style={{ color: 'red' }}> *</Text>
                            </Text>
                            <TextInput
                                placeholder="Enter taka no"
                                style={checkingScannerStyles.inputDisabled}
                                value={takaNo}
                                onChangeText={setTakaNo}
                                editable={false}
                            />
                        </View>
                    </View>
                    <Text style={checkingScannerStyles.label}>Design <Text style={{ color: 'red' }}> *</Text> </Text>
                    <View style={checkingScannerStyles.dropdown}>
                        <Picker
                            mode="dialog"
                            style={checkingScannerStyles.picker}
                            selectedValue={design || ''}
                            onValueChange={(itemValue) => {
                                setDesign(itemValue);
                                const selectedRow = getData.find(el => el.DsnCode === itemValue);
                                if (selectedRow) {
                                    setWarpLen(selectedRow.WarpLen || '0');
                                } else {
                                    setWarpLen('0');
                                }
                            }}
                        >
                            <Picker.Item label="Select Design" value="" enabled={false} />
                            {getData.map((item, index) => (
                                <Picker.Item
                                    key={index}
                                    label={item.DsnName}
                                    value={item.DsnCode}
                                />
                            ))}
                        </Picker>
                        <Icon
                            name="arrow-drop-down"
                            size={28}
                            color="#000"
                            style={checkingScannerStyles.dropdownIcon}
                        />
                    </View>
                    <View style={checkingScannerStyles.viewCustom}>
                        <TouchableOpacity onPress={clearDesign}>
                            <Icon name="delete" size={30} color="red" style={checkingScannerStyles.dropdownIconDelete} />
                        </TouchableOpacity>
                    </View>
                    <View style={checkingScannerStyles.row}>
                        <View style={checkingScannerStyles.halfInput}>
                            <Text style={checkingScannerStyles.label}> Meter (in meters) <Text style={{ color: 'red' }}> *</Text>
                                {
                                    typeof getWarpLen != 'undefined' && getWarpLen != '' && getWarpLen != null && parseFloat(getWarpLen) != 0 ? <Text style={{ fontSize: 11, color: '#000', }}> [ {getWarpLen} ] </Text> : null
                                }
                            </Text>
                            <TextInput
                                placeholder="Enter meter"
                                value={meter}
                                keyboardType="decimal-pad"
                                style={checkingScannerStyles.input}
                                onChangeText={handleMeterChange}
                            />
                        </View>
                        <View style={checkingScannerStyles.halfInput}>
                            <Text style={checkingScannerStyles.label}> Kgs <Text style={{ color: 'red' }}> *</Text> </Text>
                            <TextInput
                                placeholder="Enter kgs"
                                style={checkingScannerStyles.input}
                                onChangeText={handleKgsChange}
                                keyboardType="decimal-pad"
                                value={kgs}
                            />
                        </View>
                    </View>
                    <View style={checkingScannerStyles.row}>
                        <View style={checkingScannerStyles.halfInput}>
                            <Text style={checkingScannerStyles.label}> Avg. Wt <Text style={{ color: 'red' }}> *</Text> </Text>
                            <TextInput
                                placeholder="Enter meter"
                                value={getavgWt}
                                keyboardType="decimal-pad"
                                style={checkingScannerStyles.inputDisabled}
                                editable={false}
                            />
                        </View>
                    </View>
                    <Text style={checkingScannerStyles.label}>Grade <Text style={{ color: 'red' }}> *</Text></Text>
                    <View style={checkingScannerStyles.dropdown}>
                        <Picker
                            mode="dialog"
                            style={checkingScannerStyles.picker}
                            selectedValue={grade}
                            onValueChange={(itemValue) => { setGrade(itemValue) }}
                        >
                            <Picker.Item label="Select Grade" value="" enabled={false} />
                            {getGradeData.map((item, index) => (
                                <Picker.Item
                                    key={index}
                                    label={item.GrdName}
                                    value={item.GrdCode}
                                />
                            ))}
                        </Picker>
                        <Icon
                            name="arrow-drop-down"
                            size={28}
                            color="#000"
                            style={checkingScannerStyles.dropdownIcon}
                        />
                    </View>
                    <View style={checkingScannerStyles.viewCustom}>
                        <TouchableOpacity onPress={clearGrade}>
                            <Icon name="delete" size={30} color="red" style={checkingScannerStyles.dropdownIconDelete} />
                        </TouchableOpacity>
                    </View>
                    <Text style={checkingScannerStyles.label}> Checker <Text style={{ color: 'red' }}> *</Text> </Text>
                    <View style={checkingScannerStyles.dropdown}>
                        <Picker
                            mode="dialog"
                            style={checkingScannerStyles.picker}
                            selectedValue={checker}
                            onValueChange={(itemValue) => {
                                AsyncStorage.setItem('csChecker', itemValue);
                                setChecker(itemValue);
                            }}
                        >
                            <Picker.Item label="Select Checker" value="" enabled={false} />
                            {getCheckerData.map((item, index) => (
                                <Picker.Item
                                    key={index}
                                    label={item.EmpName}
                                    value={item.EmpCode}
                                />
                            ))}
                        </Picker>
                        <Icon
                            name="arrow-drop-down"
                            size={28}
                            color="#000"
                            style={checkingScannerStyles.dropdownIcon}
                        />
                    </View>
                    <View style={checkingScannerStyles.viewCustom}>
                        <TouchableOpacity onPress={clearChecker}>
                            <Icon name="delete" size={30} color="red" style={checkingScannerStyles.dropdownIconDelete} />
                        </TouchableOpacity>
                    </View>
                    <Text style={checkingScannerStyles.label}> Shift <Text style={{ color: 'red' }}> *</Text> </Text>
                    <View style={checkingScannerStyles.dropdown}>
                        <Picker
                            mode="dialog"
                            style={checkingScannerStyles.picker}
                            selectedValue={shift}
                            onValueChange={(itemValue) => {
                                setShift(itemValue);
                            }}
                        >
                            <Picker.Item label="Select shift" value="" enabled={false} />
                            {getShiftData.map((item, index) => (
                                <Picker.Item
                                    key={index}
                                    label={item.ShfName}
                                    value={item.ShfCode}
                                />
                            ))}
                        </Picker>
                        <Icon
                            name="arrow-drop-down"
                            size={28}
                            color="#000"
                            style={checkingScannerStyles.dropdownIcon}
                        />
                    </View>
                    <View style={checkingScannerStyles.viewCustom}>
                        <TouchableOpacity onPress={clearShift}>
                            <Icon name="delete" size={30} color="red" style={checkingScannerStyles.dropdownIconDelete} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                        <Text style={checkingScannerStyles.label1}>Is mending ? </Text>
                        <Switch
                            style={checkingScannerStyles.switch}
                            value={isMending}
                            onValueChange={(value) => setIsMending(value)}
                            trackColor={{ false: "#ccc", true: "#007EA7" }}
                            thumbColor={isMending ? "#fff" : "#fff"}
                        />
                    </View>
                    {
                        getPrinters && getPrinters.length > 0 ?
                            (
                                <>
                                    <Text style={checkingScannerStyles.label}> Printer <Text style={{ color: 'red' }}> *</Text></Text>
                                    <View style={checkingScannerStyles.dropdown}>
                                        <Picker
                                            mode="dialog"
                                            style={checkingScannerStyles.picker}
                                            selectedValue={printer}
                                            onValueChange={(itemValue) => {
                                                setPrinter(itemValue);

                                            }}
                                        >
                                            <Picker.Item label="Select printer" value="" enabled={false} />

                                            {getPrinters.map((item, index) => (
                                                <Picker.Item
                                                    key={index}
                                                    label={item.Name}
                                                    value={item.PortName}
                                                />
                                            ))}
                                        </Picker>
                                        <Icon
                                            name="arrow-drop-down"
                                            size={28}
                                            color="#000"
                                            style={checkingScannerStyles.dropdownIcon}
                                        />
                                    </View>
                                    <View style={checkingScannerStyles.viewCustom}>
                                        <TouchableOpacity
                                            onPress={clearPrinter}
                                        >
                                            <Icon name="delete" size={30} color="red" style={checkingScannerStyles.dropdownIconDelete} />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )
                            :
                            null
                    }
                    <TouchableOpacity
                        style={checkingScannerStyles.submitBtn}
                        onPress={handleSubmitScan}
                    >
                        <Text style={checkingScannerStyles.submitText}>Submit Scan</Text>
                    </TouchableOpacity>
                    {
                        getDataSaved == true &&
                        (
                            <View style={checkingScannerStyles.actionRow}>
                                <TouchableOpacity style={checkingScannerStyles.printBtn} onPress={printSticker}>
                                    <Text style={checkingScannerStyles.actionText}>Print</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={checkingScannerStyles.clearBtn}
                                    onPress={() => {
                                        setBeamNo('');
                                        setTakaNo('');
                                        setBeamUid('');
                                        setPrpCode('');
                                        setYearNo('')
                                        setMeter('')
                                        setKgs('');
                                        setavgWt('');
                                        setWarpLen('')
                                        setData([])
                                        setDesign('')
                                        setGradeData([])
                                        setGrade('')
                                        setScannedObj({});
                                        setShift('');
                                        clearDesign();
                                        clearGrade();
                                        clearShift();
                                        setShiftData([]);
                                        setMeter('');
                                        setKgs('');
                                        setavgWt('');
                                        setIsMending(false);
                                        setPrinter('')
                                        setPrinters([])
                                        setDataSaved(false);
                                    }}
                                >
                                    <Text style={checkingScannerStyles.actionText}>Clear</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    }
                    <View style={checkingScannerStyles.infoBox}>
                        <Text style={checkingScannerStyles.infoText}> Fill all fields to enable submission </Text>
                    </View>
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
                        {/* 🔹 FORM */}
                        <View style={checkingScannerStyles.formGroup}>
                            {/* Machine */}
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
                                <TextInput
                                    style={checkingScannerStyles.inputDisabledHorizontal}
                                    value={FormState.values.DsnName}
                                    onChangeText={(text) => handleChange('DsnName', text)}
                                    maxLength={40}
                                />
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
        </>
    );
};
export default CheckingScanner;
