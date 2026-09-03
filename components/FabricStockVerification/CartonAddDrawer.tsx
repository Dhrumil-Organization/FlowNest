import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    ScrollView,
    Platform,
    StatusBar,
    ActivityIndicator,
    Alert,
    TextInput as RNTextInput,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import theme from '@/components/theme';
import SearchableDropdown from '@/Shared/SearchableDropdown';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
// import Snackbar from 'react-native-snackbar';
import { showSnackbar, showSuccess, showError, showWarning } from '@/common/utils/snackbar';
import FullScreenLoader from '@/components/FullScreenLoader';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import { values } from 'lodash';

const CartonAddDrawer = (props) => {
    const { isVisible,
        onClose,
        isLoading,
        getAllPropertyData,
        FormState,
        setFormState,
        getAllYearData,
        getAllStoreData,
        setAllStockData,
        token,
        setFormCartonDataState,
        FormCartonDataState,
        getAllStockDataInserted,
        setAllStockDataInserted
    } = props;

    const slideAnim = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();
    const [getItemData, setItemData] = useState([]);
    const [getMergeData, setMergeData] = useState([]);
    const [getGradeData, setGradeData] = useState([]);
    const [getShadeData, setShadeData] = useState([]);
    const [getDesignData, setDesignData] = useState([]);
    const [getStockTypes, setStockTypes] = useState([
        { 'label': 'In house', 'value': 'I' },
        { 'label': 'Process house', 'value': 'P' }
    ]);
    const [loading, setLoading] = useState(false)
    const [entryMode, setEntryMode] = useState<'manual' | 'scan'>('manual');
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const scanLock = useRef(false);


    const openQrScanner = async () => {
        try {
            if (!permission?.granted) {
                const result = await requestPermission();
                if (!result.granted) {
                    Alert.alert('Camera Permission', 'Camera permission is required to scan a QR code.');
                    return;
                }
            }
            scanLock.current = false;
            setIsScannerVisible(true);
        } catch (error) {
            console.log('Camera permission error:', error);
            Alert.alert('Camera Error', 'Unable to open camera scanner.');
        }
    };

    const parseQrValue = (value: string) => {
        const raw = String(value || '').trim();
        if (!raw) throw new Error('Empty QR value');

        // Some cartons use a JSON QR payload. Support it without saving anything.
        try {
            const json = JSON.parse(raw);
            if (json && typeof json === 'object') return json;
        } catch (_) {
            // Not JSON; continue with the ERP ~ separated format below.
        }

        const parts = raw.split('~');

        // Current carton QR format:
        // UID~SrNo~SubSr~TranType~CartNo~ItmCode~DsnCode~GrossWt~
        // Example: 370001939~1~10~31~166~23576~513~100.000~
        // Gross weight and Net weight both come from the last weight value.
        if (parts.length >= 8 && parts.length <= 9) {
            const weight = parts[7] || '';
            return {
                PUId: parts[0] || '',
                PSrNo: parts[1] || '',
                PSubSr: parts[2] || '',
                TranType: parts[3] || '',
                CartNo: parts[4] || '',
                ItmCode: parts[5] || '',
                DsnCode: parts[6] || '',
                Wt: weight,
                GrsWt: weight,
                GrossWt: weight,
                NetWt: weight,
                netWt: weight,
            };
        }

        if (parts.length === 16) {
            return {
                PUId: parts[0] || '',
                PSrNo: parts[1] || '',
                PSubSr: parts[2] || '',
                TranType: parts[3] || '',
                CartNo: parts[4] || '',
                ItmCode: parts[5] || '',
                ItmName: parts[6] || '',
                MerCode: parts[7] || '',
                MerName: parts[8] || '',
                GrdCode: parts[9] || '',
                GrdName: parts[10] || '',
                ShdCode: parts[11] || '',
                ShdName: parts[12] || '',
                Wt: parts[13] || '',
                Chees: parts[14] || '',
                yearNo: parts[15] || '',
            };
        }

        if (parts.length >= 13) {
            return {
                PrpCode: parts[0] || '',
                PUId: parts[1] || '',
                PSrNo: parts[2] || '',
                PSubSr: parts[3] || '',
                TranType: parts[4] || '',
                CartNo: parts[5] || '',
                ItmCode: parts[6] || '',
                MerCode: parts[7] || '',
                GrdCode: parts[8] || '',
                ShdCode: parts[9] || '',
                Denier: parts[10] || '',
                Wt: parts[11] || '',
                Chees: parts[12] || '',
                Rate: parts[13] || '',
                yearNo: parts[14] || '',
            };
        }

        if (parts.length >= 11) {
            return {
                PUId: parts[0] || '',
                PSrNo: parts[1] || '',
                PSubSr: parts[2] || '',
                TranType: parts[3] || '',
                CartNo: parts[4] || '',
                ItmCode: parts[5] || '',
                MerCode: parts[6] || '',
                GrdCode: parts[7] || '',
                ShdCode: parts[8] || '',
                Denier: parts[9] || '',
                Wt: parts[10] || '',
                Chees: '',
                yearNo: parts[11] || '',
            };
        }

        // A plain carton number is also useful: only Carton No. is populated.
        return { CartNo: raw };
    };

    const applyScannedQrToForm = (value: string) => {
        const parsed: any = parseQrValue(value);
        console.log('QR parsed for Manual Fabric Stock:', parsed);

        const scannedYear = parsed.YearNo || parsed.yearNo || parsed.yearno || '';
        const scannedProperty = parsed.PrpCode || parsed.prpcode || parsed.prpCode || '';
        const scannedCartNo = parsed.CartNo || parsed.cartNo || parsed.cartonNo || '';
        const scannedChees = parsed.Chees ?? parsed.chees ?? '';
        const scannedItem = parsed.ItmCode || parsed.itmcode || '';
        const scannedDesign = parsed.DsnCode || parsed.dsncode || '';
        const scannedShade = parsed.ShdCode || parsed.shdcode || '';
        const scannedGross = parsed.GrsWt ?? parsed.GrossWt ?? parsed.grsWt ?? parsed.Wt ?? parsed.wt ?? '';
        // For this QR format the same weight must be shown in both fields.
        const scannedNet = parsed.NetWt ?? parsed.netWt ?? parsed.NetWeight ?? parsed.GrsWt ?? parsed.GrossWt ?? parsed.Wt ?? parsed.wt ?? '';
        const scannedStock = parsed.StkType || parsed.stktype || '';

        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                PrpCode: scannedProperty || prev.values.PrpCode || FormState.values.PrpCode || '',
                YearNo: scannedYear || prev.values.YearNo || FormState.values.YearNo || '',
                StrCode: prev.values.StrCode || FormState.values.StrCode || '',
                CartNo: scannedCartNo,
                Chees: scannedChees !== '' ? String(scannedChees) : '',
                ItmCode: scannedItem,
                MerCode: parsed.MerCode || parsed.mercode || '',
                GrdCode: parsed.GrdCode || parsed.grdcode || '',
                DsnCode: scannedDesign,
                ShdCode: scannedShade,
                Denier: parsed.Denier || parsed.denier || '',
                grsWt: scannedGross !== '' && scannedGross !== null ? String(scannedGross) : 0,
                netWt: scannedNet !== '' && scannedNet !== null ? String(scannedNet) : '',
                StkType: scannedStock || prev.values.StkType || 'I',
            }
        }));

        setIsScannerVisible(false);
        setEntryMode('scan');
    };

    const handleBarcodeScanned = (result: BarcodeScanningResult) => {
        if (scanLock.current) return;
        scanLock.current = true;
        setTimeout(() => { scanLock.current = false; }, 1500);

        try {
            const value = result?.data || '';
            if (!value) throw new Error('Empty QR');
            applyScannedQrToForm(value);
        } catch (error) {
            console.log('Invalid QR:', error);
            Alert.alert('Invalid QR', 'QR format is not valid.');
            scanLock.current = false;
        }
    };


    const handleStockData = async (newdata) => {
        setLoading(true)
        setAllStockData([])

        const payload = {
            prptype: 'S',
            prpcodes: [FormCartonDataState.values.PrpCode],
            yearno: FormCartonDataState.values.YearNo,
            strcode: FormCartonDataState.values.StrCode,
            updateStock: FormState.values.updateStock,
            autoFound: typeof FormState.values.autoFound == 'undefined' || FormState.values.autoFound == null || FormState.values.autoFound == '' ? '0' : FormState.values.autoFound,
            manual: typeof FormState.values.manual == 'undefined' || FormState.values.manual == null || FormState.values.manual == '' ? '0' : FormState.values.manual,
            stockNotFound: typeof FormState.values.stockNotFound == 'undefined' || FormState.values.stockNotFound == null || FormState.values.stockNotFound == '' ? '0' : FormState.values.stockNotFound,
            autoNotFound: typeof FormState.values.autoNotFound == 'undefined' || FormState.values.autoNotFound == null || FormState.values.autoNotFound == '' ? '0' : FormState.values.autoNotFound,
            autoForRepacking: typeof FormState.values.autoForRepacking == 'undefined' || FormState.values.autoForRepacking == null || FormState.values.autoForRepacking == '' ? '0' : FormState.values.autoForRepacking,
            duplicate: typeof FormState.values.duplicate == 'undefined' || FormState.values.duplicate == null || FormState.values.duplicate == '' ? '0' : FormState.values.duplicate,
            txntype: 'fabricStockVerification',
            stktype: typeof FormState.values.StkType != 'undefined' && FormState.values.StkType != null && FormState.values.StkType != '' ? FormState.values.StkType : '',
        };
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        console.log('get_verify_manual_fabric_stock API payload : ', payload)
        console.log('get_verify_manual_fabric_stock API URL : ', `${API}/api/get_verify_manual_fabric_stock`)
        try {
            const response = await axios.post(`${API}/api/get_verify_manual_fabric_stock`, payload, { headers });
            console.log('get_verify_manual_stock API response : ', response)

            if (response.data.success === true && response.data.response.data.length === 0) {

                Alert.alert('No Data Found');
            } else if (response.data.success === true && response.data.response.data.length > 0) {
                if (newdata && newdata.length > 0) {

                    let cartons = [];
                    newdata && newdata.filter((el, ind) => {
                        cartons.push(el.CartNo);
                    })

                    let finalrespo = []
                    let finalrespoCntr = 0
                    response.data.response.data && response.data.response.data.filter((el, ind) => {
                        if (!cartons.includes(el.CartNo)) {
                            finalrespo[finalrespoCntr] = el
                            finalrespoCntr++;
                        }
                    })
                    const alldt = newdata.concat(finalrespo)
                    setAllStockData(alldt);
                } else {
                    setAllStockData(response.data.response.data);
                }

                setFormState(FormState => ({
                    ...FormState,
                    values: {
                        ...FormState.values,
                        PrpCode: FormCartonDataState.values.PrpCode || '',
                        YearNo: FormCartonDataState.values.YearNo || '',
                        StrCode: FormCartonDataState.values.StrCode || '',
                    }
                }));
                handleClearForm()

            } else if (response.data.success === false) {

                Alert.alert(`${response.data.message}`);
            } else {

                Alert.alert(`${response.data.message}`);
            }
        } catch (error) {
            Alert.alert('Server Error :' + error)
        } finally {
            setLoading(false)
            onClose()
        }

    }

    const handleSaveCarton = async () => {
        console.log("FormState", FormState)
        console.log("FormCartonDataState", FormCartonDataState)
        if (typeof FormCartonDataState.values.PrpCode == 'undefined' || FormCartonDataState.values.PrpCode == null || FormCartonDataState.values.PrpCode == '') {
            // Snackbar.show({
            //     text: 'Please select property',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Please select property`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.YearNo == 'undefined' || FormCartonDataState.values.YearNo == null || FormCartonDataState.values.YearNo == '') {
            // Snackbar.show({
            //     text: 'Please select year',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Please select year`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.StrCode == 'undefined' || FormCartonDataState.values.StrCode == null || FormCartonDataState.values.StrCode == '') {
            // Snackbar.show({
            //     text: 'Please select store',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Please select store`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.CartNo == 'undefined' || FormCartonDataState.values.CartNo == null || FormCartonDataState.values.CartNo == '') {
            // Snackbar.show({
            //     text: 'Carton no. can not be balnk or empty',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Taka / Roll No. can not be blank or empty`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.ItmCode == 'undefined' || FormCartonDataState.values.ItmCode == null || FormCartonDataState.values.ItmCode == '') {
            // Snackbar.show({
            //     text: 'Item can not be balnk or empty',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Item can not be balnk or empty`, {
                text: 'OK',
                onPress: () => { },
            });
        } 
        // else if (typeof FormCartonDataState.values.MerCode == 'undefined' || FormCartonDataState.values.MerCode == null || FormCartonDataState.values.MerCode == '') {         
        //     showWarning(`Merge can not be balnk or empty`, {
        //         text: 'OK',
        //         onPress: () => { },
        //     });
        // } 
        // else if (typeof FormCartonDataState.values.GrdCode == 'undefined' || FormCartonDataState.values.GrdCode == null || FormCartonDataState.values.GrdCode == '') {            
        //     showWarning(`Grade can not be balnk or empty`, {
        //         text: 'OK',
        //         onPress: () => { },
        //     });
        // }
        // else if (typeof FormCartonDataState.values.Denier == 'undefined' || FormCartonDataState.values.Denier == null || FormCartonDataState.values.Chees == '') {
          
        //     showWarning(`Denier can not be balnk or empty or 0`, {
        //         text: 'OK',
        //         onPress: () => { },
        //     });
        // }
        else if (typeof FormCartonDataState.values.netWt == 'undefined' || FormCartonDataState.values.netWt == null || FormCartonDataState.values.netWt == '' || parseFloat(FormCartonDataState.values.netWt) <= 0) {
            showWarning(`Physical meter can not be blank, empty or 0`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.StkType == 'undefined' || FormCartonDataState.values.StkType == null || FormCartonDataState.values.StkType == '') {
            // Snackbar.show({
            //     text: 'Please select stock type',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Please select stock type`, {
                text: 'OK',
                onPress: () => { },
            });
        } else {
            setLoading(true)
            const payload = {
                prptype: 'S',
                prpcodes: [FormCartonDataState.values.PrpCode],
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                CartNo: FormCartonDataState.values.CartNo,
                Chees: 0,
                ItmCode: FormCartonDataState.values.ItmCode,
                MerCode: FormCartonDataState.values.MerCode ||'',
                GrdCode: FormCartonDataState.values.GrdCode||'',
                ShdCode: FormCartonDataState.values.ShdCode,
                Denier: '',
                DsnCode:FormCartonDataState.values.DsnCode,
                GrsWt: FormCartonDataState.values.netWt,
                NetWt: FormCartonDataState.values.netWt,
                StkType: FormCartonDataState.values.StkType,
                txntype: 'fabricStockVerification'
            };
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            console.log("insert_verify_manual_fabric_stock api payload :", payload)
            console.log("insert_verify_manual_fabric_stock api url :", `${API}/api/insert_verify_manual_fabric_stock`)
            try {
                const response = await axios.post(`${API}/api/insert_verify_manual_fabric_stock`, payload, { headers });
                if (response.data.success === true && response.data.data.length === 0) {
                    Alert.alert('No Data Found');
                } else if (response.data.success === true && response.data.data.length > 0) {
                    setAllStockDataInserted(getAllStockDataInserted => [...getAllStockDataInserted, response.data.data[0]])
                    const mergedata = response.data.data.concat(getAllStockDataInserted);
                    handleStockData(mergedata)
                    //onClose()
                } else if (response.data.success === false) {
                    Alert.alert(`${response.data.message}`);
                } else {
                    Alert.alert(`${response.data.message}`);
                }
            } catch (error) {
                Alert.alert('Server Error :' + error)
            } finally {
                //setLoading(false)
            }
        }
    }

    const getToken = () => {
        return token;
    };

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
    const getAllItems = async (token: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: '1',
                txntype: 'fabricStockVerification',
                billdate: '',
                ttype: ['8', '3', '30', '2', '34', '83', '42'],
                fetch: ''
            };
            const response = await axios.get(
                `${API}/api/itemdrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            console.log("response item", response)
            if (response.data.response.data.length > 0) {
                //setItemData(response.data.response.data);
                const itmdt = response.data.response.data
                return itmdt;
            } else {
                return [];
            }
        } catch (error) {
            console.log("item API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }
    const getAllMerges = async (token: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'fabricStockVerification',
                billdate: ''
            };

            const response = await axios.get(
                `${API}/api/mergedrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );

            if (response.data.response.data.length > 0) {
                //setMergeData(response.data.response.data);
                const merdt = response.data.response.data
                return merdt;
            } else {
                return [];
            }
        } catch (error) {
            console.log("shade API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }
    const getAllGrades = async (token: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'fabricStockVerification',
                billdate: '',
                ttype: ['8', '3', '30', '2', '34', '83', '42'],
                fetch: 'grade',

            };
            const response = await axios.get(
                `${API}/api/gradedrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            if (response.data.response.data.length > 0) {
                //setGradeData(response.data.response.data);
                const grddt = response.data.response.data
                return grddt
            } else {
                //etGradeData([]);
                return []
            }
        } catch (error) {
            console.log("grade API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }

    const getAllShades = async (token: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'fabricStockVerification',
                billdate: ''
            };
            const response = await axios.get(
                `${API}/api/shadedrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            if (response.data.response.data.length > 0) {
                //setShadeData(response.data.response.data);
                const shddt = response.data.response.data
                return shddt
            } else {
                //setShadeData([]);
                return []
            }
        } catch (error) {
            console.log("grade API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }

    const getAllDesign = async (token: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                txntype: 'fabricStockVerification',
                dsncode: '',
                dsnname: '',
            };
            const response = await axios.get(
                `${API}/api/designdrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            console.log("response design", response)
            if (response.data.response.data.length > 0) {
                //setShadeData(response.data.response.data);
                const dsnndt = response.data.response.data
                return dsnndt
            } else {
                //setShadeData([]);
                return []
            }
        } catch (error) {
            console.log("design API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }

    useEffect(() => {
        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                PrpCode:
                    prev.values.PrpCode ||
                    FormState.values.PrpCode ||
                    '',

                YearNo:
                    prev.values.YearNo ||
                    FormState.values.YearNo ||
                    '',

                StrCode:
                    prev.values.StrCode ||
                    FormState.values.StrCode ||
                    ''
            }
        }));
    }, [
        FormState.values.PrpCode,
        FormState.values.YearNo,
        FormState.values.StrCode
    ]);

    useEffect(() => {
        if (!token) return;
        const loadAllFunctions = async () => {
            if (typeof FormCartonDataState.values.PrpCode != 'undefined' && FormCartonDataState.values.PrpCode != null && FormCartonDataState.values.PrpCode != ''
                && typeof FormCartonDataState.values.YearNo != 'undefined' && FormCartonDataState.values.YearNo != null && FormCartonDataState.values.YearNo != ''
                && typeof FormCartonDataState.values.StrCode != 'undefined' && FormCartonDataState.values.StrCode != null && FormCartonDataState.values.StrCode != '') {
                const itmdata = await getAllItems(token);
                setItemData(itmdata);
                const merdata = await getAllMerges(token);
                setMergeData(merdata);
                const grdata = await getAllGrades(token);
                setGradeData(grdata);
                const shdata = await getAllShades(token);
                setShadeData(shdata);
                const designdata = await getAllDesign(token);
                setDesignData(designdata);
            }
        };

        loadAllFunctions();
    }, [token, FormCartonDataState.values.PrpCode, FormCartonDataState.values.YearNo, FormCartonDataState.values.StrCode]);

    const handleChange = (name, value) => {
        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                [name]: value
            }
        }));
    };

    const handleClearForm = () => {
        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                PrpCode: typeof FormCartonDataState.values.PrpCode != 'undefined' && FormCartonDataState.values.PrpCode != null && FormCartonDataState.values.PrpCode != ''
                    ? FormCartonDataState.values.PrpCode
                    : typeof FormState.values.PrpCode != 'undefined' && FormState.values.PrpCode != null && FormState.values.PrpCode != ''
                        ? FormState.values.PrpCode : '',
                YearNo: typeof FormCartonDataState.values.YearNo != 'undefined' && FormCartonDataState.values.YearNo != null && FormCartonDataState.values.YearNo != ''
                    ? FormCartonDataState.values.YearNo
                    : typeof FormState.values.YearNo != 'undefined' && FormState.values.YearNo != null && FormState.values.YearNo != ''
                        ? FormState.values.YearNo : '',
                StrCode: typeof FormCartonDataState.values.StrCode != 'undefined' && FormCartonDataState.values.StrCode != null && FormCartonDataState.values.StrCode != ''
                    ? FormCartonDataState.values.StrCode
                    : typeof FormState.values.StrCode != 'undefined' && FormState.values.StrCode != null && FormState.values.StrCode != ''
                        ? FormState.values.StrCode : '',
                CartNo: '',
                Chees: '',
                ItmCode: '',
                MerCode: '',
                DsnCode:'',
                GrdCode: '',
                ShdCode: '',
                Denier: '',
                grsWt: 0,
                netWt: '',
                StkType: typeof FormCartonDataState.values.StkType != 'undefined' && FormCartonDataState.values.StkType != null && FormCartonDataState.values.StkType != ''
                    ? FormCartonDataState.values.StkType : ''
            }
        }));
    };

    const selectedProperty = getAllPropertyData?.find((p) => p.PrpCode === FormCartonDataState.values.PrpCode) || FormState.values.PrpCode;
    const selectedYear = getAllYearData?.find((y) => y.YearNo === FormCartonDataState.values.YearNo) || FormState.values.YearNo;
    const selectedStore = getAllStoreData?.find((y) => y.StrCode === FormCartonDataState.values.StrCode) || FormState.values.StrCode;
    // QR gives only codes. Match those codes against the already-loaded dropdown
    // API data so the dropdown displays the corresponding Item/Design names.
    // String() comparison also handles APIs returning numeric codes.
    const selectedItem = getItemData?.find((y) =>
        String(y?.ItmCode ?? '') === String(FormCartonDataState.values.ItmCode ?? '')
    ) || null;
    const selectedMerge = getMergeData?.find((y) =>
        String(y?.MerCode ?? '') === String(FormCartonDataState.values.MerCode ?? '')
    ) || null;
    const selectedDesign = getDesignData?.find((y) =>
        String(y?.DsnCode ?? '') === String(FormCartonDataState.values.DsnCode ?? '')
    ) || null;
    const selectedGrade = getGradeData?.find((y) =>
        String(y?.GrdCode ?? '') === String(FormCartonDataState.values.GrdCode ?? '')
    ) || null;
    const selectedShade = getShadeData?.find((y) =>
        String(y?.ShdCode ?? '') === String(FormCartonDataState.values.ShdCode ?? '')
    ) || null;
    const selectedStockType = getStockTypes?.find((y) => y.value === FormCartonDataState.values.StkType) || null;


    useEffect(() => {
        if (!FormCartonDataState.values.StkType) {
            setFormCartonDataState(prev => ({
                ...prev,
                values: {
                    ...prev.values,
                    StkType: 'I'
                }
            }));
        }
    }, []);

    if (!isVisible) return null;

    return (
        <>
            <View style={castyles.fullScreenView}>
                <SafeAreaView style={castyles.safeAreaSheet} edges={['bottom']}>
                        <StatusBar barStyle="light-content" backgroundColor="#087FA3" />
                        {loading && <FullScreenLoader />}
                        <View style={castyles.screenContent}>
                        <Animated.View style={[castyles.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>
                            <View style={castyles.sheet}>
                                <View style={[castyles.drawerHeader, { paddingTop: insets.top, minHeight: 58 + insets.top }]}>
                                    <View style={castyles.drawerHeaderLeft}>
                                        <View style={castyles.headerIconCircle}>
                                            <Icon name="add-box" size={18} color="#FFFFFF" />
                                        </View>
                                        <View>
                                            <Text style={castyles.drawerHeaderTitle}>Physical Stock Not in System</Text>
                                            <Text style={castyles.drawerHeaderSubtitle}>Add a taka only after physically confirming it is missing from system stock</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={castyles.closeButton} onPress={onClose} activeOpacity={0.8}>
                                        <Icon name="arrow-back" size={26} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                                <View style={castyles.entryModeContainer}>
                                    <TouchableOpacity
                                        style={[castyles.entryModeButton, entryMode === 'manual' && castyles.entryModeButtonActive]}
                                        onPress={() => {
                                            setEntryMode('manual');
                                            setIsScannerVisible(false);
                                        }}
                                        activeOpacity={0.85}>
                                        <Icon name="edit" size={18} color={entryMode === 'manual' ? '#fff' : '#087FA3'} />
                                        <Text style={[castyles.entryModeText, entryMode === 'manual' && castyles.entryModeTextActive]}>Manual</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[castyles.entryModeButton, entryMode === 'scan' && castyles.entryModeButtonActive]}
                                        onPress={() => {
                                            setEntryMode('scan');
                                            openQrScanner();
                                        }}
                                        activeOpacity={0.85}>
                                        <Icon name="qr-code-scanner" size={19} color={entryMode === 'scan' ? '#fff' : '#087FA3'} />
                                        <Text style={[castyles.entryModeText, entryMode === 'scan' && castyles.entryModeTextActive]}>Scan QR</Text>
                                    </TouchableOpacity>
                                </View>
                                {entryMode === 'scan' && !isScannerVisible && (
                                    <View style={castyles.scanHintCard}>
                                        <Icon name="check-circle" size={19} color="#0FA36B" />
                                        <View style={{ flex: 1 }}>
                                            <Text style={castyles.scanHintTitle}>QR scanned successfully</Text>
                                            <Text style={castyles.scanHintText}>Scanned values are filled in the form. Review them before submitting.</Text>
                                        </View>
                                        <TouchableOpacity onPress={openQrScanner} style={castyles.rescanButton} activeOpacity={0.85}>
                                            <Icon name="qr-code-scanner" size={17} color="#fff" />
                                            <Text style={castyles.rescanText}>Rescan</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <ScrollView
                                    style={castyles.scrollableFormContainer}
                                    contentContainerStyle={castyles.scrollableFormContent}
                                    nestedScrollEnabled={true}>
                                    <View style={{ marginBottom: 7 }} >
                                        <Text style={castyles.label}>Select Property <Text style={{ color: 'red' }}> * </Text></Text>

                                        <SearchableDropdown
                                            //containerStyle={{ backgroundColor: 'red' }}
                                            //textStyle={{ color: '#000' }}
                                            data={getAllPropertyData}
                                            labelKey="LngName"
                                            valueKey="PrpCode"
                                            placeholder="Choose property..."
                                            pageSize={10}
                                            initialValue={selectedProperty}
                                            value={FormCartonDataState.values.PrpCode || FormState.values.PrpCode}
                                            onSelect={(item) => {
                                                setFormCartonDataState(FormCartonDataState => ({
                                                    ...FormCartonDataState,
                                                    values: {
                                                        ...FormCartonDataState.values,
                                                        PrpCode: item?.PrpCode || '',
                                                    }
                                                }));
                                            }}
                                            multiple={false}
                                            emptyMessage="No properties available" />
                                    </View>
                                    <View style={{ marginBottom: 7 }} >
                                        <Text style={castyles.label}>Select Year <Text style={{ color: 'red' }}> * </Text></Text>
                                        <SearchableDropdown
                                            key={FormCartonDataState.values.YearNo}
                                            data={getAllYearData}
                                            labelKey="YearName"
                                            valueKey="YearNo"
                                            placeholder="Choose year..."
                                            pageSize={10}
                                            initialValue={selectedYear}
                                            value={FormCartonDataState.values.YearNo || FormState.values.YearNo}
                                            onSelect={(yr) => {
                                                setFormCartonDataState(FormCartonDataState => ({
                                                    ...FormCartonDataState,
                                                    values: {
                                                        ...FormCartonDataState.values,
                                                        YearNo: yr?.YearNo || '',
                                                    }
                                                }));
                                            }}
                                            multiple={false}
                                            emptyMessage="No years data available" />
                                    </View>
                                    <View style={{ marginBottom: 7 }} >
                                        <Text style={castyles.label}>Select store <Text style={{ color: 'red' }}> * </Text></Text>
                                        <SearchableDropdown
                                            key={FormCartonDataState.values.StrCode}
                                            data={getAllStoreData}
                                            labelKey="StrName"
                                            valueKey="StrCode"
                                            placeholder="Choose sore..."
                                            pageSize={10}
                                            value={FormCartonDataState.values.StrCode || FormState.values.StrCode}
                                            initialValue={selectedStore}
                                            onSelect={(str) => {
                                                setFormCartonDataState(FormCartonDataState => ({
                                                    ...FormCartonDataState,
                                                    values: {
                                                        ...FormCartonDataState.values,
                                                        StrCode: str?.StrCode || '',
                                                    }
                                                }));
                                            }}
                                            multiple={false}
                                            emptyMessage="No stores data available" />
                                    </View>
                                    <View style={{ marginBottom: 7 }}>
                                        <Text style={castyles.label}>Taka / Roll No. <Text style={{ color: 'red' }}> * </Text></Text>
                                        <RNTextInput
                                            style={castyles.editableValueBlack}
                                            value={FormCartonDataState.values.CartNo}
                                            onChangeText={(text) => handleChange("CartNo", text)}
                                            autoCapitalize="characters"
                                            placeholder="Enter or scan taka number"
                                            placeholderTextColor="#9AA6AD" />
                                    </View>
                                    <View style={{ marginBottom: 7 }} >
                                        <Text style={castyles.label}>Select Item <Text style={{ color: 'red' }}> * </Text></Text>
                                        <SearchableDropdown
                                            key={FormCartonDataState.values.ItmCode}
                                            data={getItemData}
                                            labelKey="ItmName"
                                            valueKey="ItmCode"
                                            placeholder="Choose item..."
                                            pageSize={10}
                                            //initialValue={getItemData ?? null}
                                            //value={FormCartonDataState.values.ItmCode}
                                            initialValue={selectedItem}
                                            onSelect={(itm) => {
                                                setFormCartonDataState(FormCartonDataState => ({
                                                    ...FormCartonDataState,
                                                    values: {
                                                        ...FormCartonDataState.values,
                                                        ItmCode: itm?.ItmCode || '',
                                                        Denier: '',
                                                    }
                                                }));
                                            }}
                                            multiple={false}
                                            emptyMessage="No years data available" />
                                    </View>
                                    <View style={{ marginBottom: 7 }} >
                                        <Text style={castyles.label}>Select Design <Text style={castyles.optionalText}>(if applicable)</Text></Text>
                                        <SearchableDropdown
                                            key={FormCartonDataState.values.DsnCode}
                                            data={getDesignData}
                                            labelKey="DsnName"
                                            valueKey="DsnCode"
                                            placeholder="Choose Design..."
                                            pageSize={10}
                                            //initialValue={getMergeData ?? null}
                                            //value={FormCartonDataState.values.MerCode}
                                            initialValue={selectedDesign}
                                            onSelect={(mrg) => {
                                                setFormCartonDataState(FormCartonDataState => ({
                                                    ...FormCartonDataState,
                                                    values: {
                                                        ...FormCartonDataState.values,
                                                        DsnCode: mrg?.DsnCode || '',
                                                    }
                                                }));
                                            }}
                                            multiple={false}
                                            emptyMessage="No years data available" />
                                    </View>
                                    {/* <View style={{ marginBottom: 7 }} >
                                        <Text style={castyles.label}>Select grade <Text style={{ color: 'red' }}> * </Text></Text>
                                        <SearchableDropdown
                                            key={FormCartonDataState.values.GrdCode}
                                            data={getGradeData}
                                            labelKey="GrdName"
                                            valueKey="GrdCode"
                                            placeholder="Choose grade..."
                                            pageSize={10}
                                            //initialValue={getGradeData ?? null}
                                            //value={FormCartonDataState.values.GrdCode}
                                            initialValue={selectedGrade}
                                            onSelect={(grd) => {
                                                setFormCartonDataState(FormCartonDataState => ({
                                                    ...FormCartonDataState,
                                                    values: {
                                                        ...FormCartonDataState.values,
                                                        GrdCode: grd?.GrdCode || '',
                                                    }
                                                }));
                                            }}
                                            multiple={false}
                                            emptyMessage="No years data available" />
                                    </View> */}
                                    <View style={{ marginBottom: 7 }} >
                                        <Text style={castyles.label}>Select Shade <Text style={castyles.optionalText}>(if applicable)</Text></Text>

                                        <SearchableDropdown
                                            key={FormCartonDataState.values.ShdCode}
                                            data={getShadeData}
                                            labelKey="ShdName"
                                            valueKey="ShdCode"
                                            placeholder="Choose shade..."
                                            pageSize={10}
                                            //initialValue={getShadeData ?? null}
                                            //value={FormCartonDataState.values.ShdCode}
                                            initialValue={selectedShade}
                                            onSelect={(shd) => {
                                                setFormCartonDataState(FormCartonDataState => ({
                                                    ...FormCartonDataState,
                                                    values: {
                                                        ...FormCartonDataState.values,
                                                        ShdCode: shd?.ShdCode || '',
                                                    }
                                                }));
                                            }}
                                            multiple={false}
                                            emptyMessage="No shade data available" />
                                    </View>
                                    {/* <View style={{ marginBottom: 7 }} >
                                        <Text style={castyles.label}>Denier <Text style={{ color: 'red' }}> * </Text></Text>
                                        <RNTextInput
                                            style={castyles.editableValueBlack}
                                            value={FormCartonDataState.values.Denier}
                                            onChangeText={(text) => handleChange("Denier", text)}
                                            keyboardType="numeric" />
                                    </View> */}
                                    <View style={{ marginBottom: 7 }}>
                                        <Text style={castyles.label}>Physical Meter <Text style={{ color: 'red' }}> * </Text></Text>
                                        <RNTextInput
                                            style={castyles.editableValueBlack}
                                            value={String(FormCartonDataState.values.netWt ?? '')}
                                            onChangeText={(text) => {
                                                handleChange("netWt", text);
                                                handleChange("grsWt", text);
                                            }}
                                            keyboardType="decimal-pad"
                                            placeholder="0.000"
                                            placeholderTextColor="#9AA6AD" />
                                        <Text style={castyles.fieldHelp}>This value creates the manual fabric stock meter. It does not change any original transaction.</Text>
                                    </View>
                                    <View style={{ marginBottom: 7 }} >
                                        <Text style={castyles.label}>Select stock type <Text style={{ color: 'red' }}> * </Text></Text>
                                        <SearchableDropdown
                                            key={FormCartonDataState.values.StkType}
                                            data={getStockTypes}
                                            labelKey="label"
                                            valueKey="value"
                                            placeholder="Choose stock type..."
                                            pageSize={10}
                                            //initialValue={getStockTypes ?? null}
                                            value={FormCartonDataState.values.StkType}
                                            initialValue={selectedStockType}
                                            onSelect={(stk) => {
                                                setFormCartonDataState(FormCartonDataState => ({
                                                    ...FormCartonDataState,
                                                    values: {
                                                        ...FormCartonDataState.values,
                                                        StkType: stk?.value || '',
                                                    }
                                                }));
                                            }}
                                            multiple={false}
                                            emptyMessage="No stock types data available" />
                                    </View>
                                </ScrollView>
                                {isScannerVisible && (
                                    <View style={castyles.scannerOverlay}>
                                        <View style={castyles.scannerModal}>
                                            <View style={castyles.scannerHeader}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                    <View style={castyles.scannerIconCircle}>
                                                        <Icon name="qr-code-scanner" size={21} color="#fff" />
                                                    </View>
                                                    <View style={{ marginLeft: 10, flex: 1 }}>
                                                        <Text style={castyles.scannerTitle}>Scan QR Code</Text>
                                                        <Text style={castyles.scannerSubtitle}>Place the taka QR inside the frame</Text>
                                                    </View>
                                                </View>
                                                <TouchableOpacity style={castyles.scannerClose} onPress={() => setIsScannerVisible(false)} activeOpacity={0.8}>
                                                    <Icon name="close" size={23} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                            <View style={castyles.cameraFrame}>
                                                {permission?.granted ? (
                                                    <CameraView
                                                        style={castyles.camera}
                                                        facing="back"
                                                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                                                        onBarcodeScanned={handleBarcodeScanned}
                                                    />
                                                ) : (
                                                    <View style={castyles.cameraPermissionView}>
                                                        <Icon name="no-photography" size={42} color="#fff" />
                                                        <Text style={castyles.cameraPermissionText}>Camera permission is required.</Text>
                                                        <TouchableOpacity style={castyles.permissionButton} onPress={openQrScanner} activeOpacity={0.85}>
                                                            <Text style={castyles.permissionButtonText}>Allow Camera</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                                <View pointerEvents="none" style={castyles.scanOverlay}>
                                                    <View style={castyles.scanCorner} />
                                                </View>
                                                <View pointerEvents="none" style={castyles.scanInstruction}>
                                                    <Icon name="qr-code-2" size={17} color="#fff" />
                                                    <Text style={castyles.scanInstructionText}>Scanning automatically...</Text>
                                                </View>
                                            </View>
                                            <View style={castyles.scannerFooter}>
                                                <Icon name="info-outline" size={18} color="#087FA3" />
                                                <Text style={castyles.scannerFooterText}>After scanning, the QR data will only populate the form. Nothing is saved automatically.</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                                <View style={castyles.bottomButtonContainer}>
                                    <TouchableOpacity
                                        style={castyles.cancelButton}
                                        onPress={handleClearForm}
                                        activeOpacity={0.85}>
                                        <Icon name="delete-sweep" size={20} color="#fff" />
                                        <Text style={castyles.bottomBtnText}>Clear</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={castyles.loadButtonNew}
                                        onPress={handleSaveCarton}
                                        activeOpacity={0.85}>
                                        {
                                            isLoading ?
                                                (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                )
                                                :
                                                (
                                                    <>
                                                        <Icon name="send" size={20} color="#fff" />
                                                        <Text style={castyles.bottomBtnText}>Save Manual Stock</Text>
                                                    </>
                                                )
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Animated.View>
                        </View>
                </SafeAreaView>
            </View>
        </>
    );
};

const castyles = StyleSheet.create({
    entryModeContainer: { flexDirection: 'row', backgroundColor: '#EAF5F8', borderRadius: 14, padding: 4, marginBottom: 8, gap: 4 },
    entryModeButton: { flex: 1, minHeight: 44, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    entryModeButtonActive: { backgroundColor: '#087FA3', elevation: 3 },
    entryModeText: { color: '#087FA3', fontSize: 14, fontWeight: '800' },
    entryModeTextActive: { color: '#fff' },
    scanHintCard: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#F0FBF6', borderWidth: 1, borderColor: '#B8E5D0', borderRadius: 12, padding: 11, marginBottom: 8 },
    scanHintTitle: { color: '#116B4B', fontSize: 13, fontWeight: '800' },
    scanHintText: { color: '#56746A', fontSize: 11, marginTop: 2, lineHeight: 15 },
    rescanButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#087FA3', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9 },
    rescanText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    scannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, backgroundColor: 'rgba(4,18,23,0.78)', justifyContent: 'center', alignItems: 'center', padding: 14 },
    scannerModal: { width: '100%', maxWidth: 520, backgroundColor: '#102E36', borderRadius: 20, overflow: 'hidden', elevation: 20 },
    scannerHeader: { minHeight: 70, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
    scannerIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#087FA3', alignItems: 'center', justifyContent: 'center' },
    scannerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
    scannerSubtitle: { color: '#B8D2D8', fontSize: 11, marginTop: 2 },
    scannerClose: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
    cameraFrame: { height: 360, marginHorizontal: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: '#061216', position: 'relative' },
    camera: { flex: 1 },
    scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    scanCorner: { width: 230, height: 230, borderWidth: 2, borderColor: '#42D7B1', borderRadius: 16, backgroundColor: 'transparent' },
    scanInstruction: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    scanInstructionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    cameraPermissionView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    cameraPermissionText: { color: '#fff', fontSize: 14, marginTop: 10, marginBottom: 14, textAlign: 'center' },
    permissionButton: { backgroundColor: '#087FA3', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
    permissionButtonText: { color: '#fff', fontWeight: '800' },
    scannerFooter: { minHeight: 58, paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F8FA' },
    scannerFooterText: { flex: 1, color: '#31545D', fontSize: 11.5, lineHeight: 16 },

    fullScreenView: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 99999, elevation: 99999, backgroundColor: '#F7FAFB' },
    drawerContainer: { flex: 1, overflow: 'hidden', backgroundColor: '#F5F8F9' },
    safeAreaSheet: { flex: 1, backgroundColor: '#FFFFFF' },
    screenContent: { flex: 1, backgroundColor: '#087FA3', paddingTop: 0 },
    gradientBackground: { flex: 1, paddingTop: 0 },
    sheet: { flex: 1, minHeight: '100%', backgroundColor: '#F7FAFB' },
    drawerHeader: { minHeight: 58, paddingTop: 0, backgroundColor: '#087FA3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    drawerHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    headerIconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
    drawerHeaderSubtitle: { color: '#D7F0F5', fontSize: 10.5, marginTop: 2, maxWidth: 270 },
    optionalText: { color: '#7C8D93', fontSize: 11, fontWeight: '500' },
    fieldHelp: { color: '#71848B', fontSize: 10.5, lineHeight: 15, marginTop: 5 },
    drawerHeaderTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
    closeButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
    label: { fontSize: 12.5, marginBottom: 5, color: '#0B5266', fontWeight: '800' },
    scrollableFormContainer: { flex: 1, paddingHorizontal: 12, backgroundColor: '#F7FAFB' },
    scrollableFormContent: { paddingBottom: 10, paddingTop: 8, flexGrow: 1 },
    editableValueBlack: {
        fontSize: 14, color: '#203238', borderWidth: 1, borderColor: '#D9E2E5',
        borderRadius: 10, paddingHorizontal: 11, height: 42, backgroundColor: '#FFFFFF'
    },
    rowInputs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    halfInput: { width: '48.5%' },
    bottomButtonContainer: {
        marginHorizontal: 12, marginBottom: Platform.OS === 'android' ? 8 : 4,
        flexDirection: 'row', justifyContent: 'space-between', gap: 9
    },
    cancelButton: {
        flex: 1, height: 46, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', backgroundColor: '#D95C5C', borderRadius: 13, elevation: 3
    },
    loadButtonNew: {
        flex: 1, height: 46, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', backgroundColor: '#12A36F', borderRadius: 13, elevation: 3
    },
    bottomBtnText: { color: '#fff', fontWeight: '800', fontSize: 13.5, marginLeft: 6 },
});
export default CartonAddDrawer;
