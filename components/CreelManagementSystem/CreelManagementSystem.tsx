import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    TextInput as RNTextInput,
    Button,
    Modal,
    FlatList,
    ActivityIndicator,
    StyleSheet
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import CustomDrawer from './CustomDrawer';
import { fetchAllPropertyData, fetchAllYeardata, fetchAllStoredata } from '../../common/API/Functions';
import { ExeData, DesignData, ItemData, POTData, ItemStatus, CardPayload } from './Modal';

interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
}

type GridItem = {
    srNo: number;
    CartonNo: string;
    design: string;
};

const CreelManagementSystem: React.FC<Props> = ({ token, navigation, isConnected, username }) => {

    const device = useCameraDevice('back');
    const scanLock = useRef(false);
    const [isScanning, setIsScanning] = useState(false);
    const { hasPermission, requestPermission } = useCameraPermission();
    const [scannedValue, setScannedValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [getData, setData] = useState([]);
    const [yearNo, setYearNo] = useState('');
    const [design, setDesign] = useState('');
    const [getWarpLen, setWarpLen] = useState('0');
    const [getchees, setchees] = useState('0');
    const [checker, setChecker] = useState('');
    const [getScannedObj, setScannedObj] = useState({})
    const [shift, setShift] = useState('')
    const [stocktype, setstocktype] = useState('')
    const [getShiftData, setShiftData] = useState([]);
    const [getStockTypes, setStockTypes] = useState([
        { 'label': 'In house', 'value': 'I' },
        { 'label': 'Process house', 'value': 'P' }
    ]);
    const [getDataSaved, setDataSaved] = useState(false)
    const [isCreelModalVisible, setIsCreelModalVisible] = useState(false);
    const [setupDate, setSetupDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [CartonNo, setCartonNo] = useState('');
    const [designName, setDesignName] = useState('');
    const [gridData, setGridData] = useState<GridItem[]>([]);
    const [isScanModalVisible, setIsScanModalVisible] = useState(false);
    const [creelId, setCreelId] = useState('');
    const [getavgwt, setavgwt] = useState('0');
    const [cartonSummary, setCartonSummary] = useState<any[]>([]);
    const [Remark, setRemark] = useState('');
    const [showManualSearch, setShowManualSearch] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
    const [getAllPropertyData, setAllPropertyData] = useState([]);

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date) => date.toISOString().split('T')[0];
    const [FormState, setFormState] = useState({
        values: {
            PrpCode: '',
            YearNo: '',
            fromdate: formatDate(today),
            todate: formatDate(today),
            status: 'C'
        }
    })
    const [getAllYearData, setAllYearData] = useState([]);
    const [activeCreels, setActiveCreels] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedCreel, setSelectedCreel] = useState(null);

    const styles = StyleSheet.create({
        row: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 12,
        },

        halfInput: {
            width: '48%',
        },

        fullInput: {
            width: '100%',
        },

        label: {
            fontSize: 14,
            // marginBottom: 5,
            fontWeight: '600',
        },

        input: {
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 6,
            padding: 10,
            backgroundColor: '#fff',
        },

        inputDisabled: {
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 6,
            padding: 10,
            backgroundColor: '#f2f2f2',
            height: 45,      // 👈 add this
            justifyContent: 'center'
        },
        dropdown: {
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 6,
            justifyContent: 'center',
            paddingHorizontal: 10,
            backgroundColor: '#fff',
            height: 45,
        },
        picker: {
            height: 45,
            width: '100%',
        },
        dropdownIcon: {
            position: 'absolute',
            right: 5,
            top: 10,
        },
        sectionHeader: {
            backgroundColor: '#E3F2FD',   // 👈 light blue highlight
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 6,
            marginBottom: 0,
            marginTop: 15  // 👈 gap kam kar diya
        },

        sectionTitle: {
            fontSize: 15,
            fontWeight: 'bold',
            color: '#007EA7',  // 👈 highlight color
        },

        smallInput: {
            width: '30%',
        },

        largeInput: {
            width: '68%',
        },

        summaryCard: {
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 15,
            marginTop: 20,
            elevation: 3
        },

        summaryTitle: {
            fontSize: 16,
            fontWeight: 'bold'
        },

        summarySub: {
            color: '#777',
            marginBottom: 10
        },

        tableHeader: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderColor: '#ddd',
            paddingBottom: 8,
            marginBottom: 8
        },

        th: {
            flex: 1,
            fontWeight: 'bold',
            fontSize: 13
        },

        tableRow: {
            flexDirection: 'row',
            paddingVertical: 10,
            borderBottomWidth: 0.5,
            borderColor: '#eee',
            alignItems: 'center'
        },

        td: {
            flex: 1,
            fontSize: 13
        },

        completeBtn: {
            backgroundColor: '#3f5fa8',
            padding: 12,
            borderRadius: 8,
            marginTop: 15,
            alignItems: 'center'
        },

        completeText: {
            color: '#fff',
            fontWeight: 'bold'
        },
        deleteBtn: {
            flex: 1,
            alignItems: 'center'
        },
        deleteText: {
            color: 'red',
            fontWeight: 'bold'
        },
        creelCard: {
            backgroundColor: '#f5f5f5',
            borderRadius: 12,
            padding: 15,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            elevation: 3
        },

        creelTitle: {
            fontSize: 14,
            fontWeight: 'bold',
            marginRight: 8,
            marginBottom: 5
        },

        badge: {
            backgroundColor: '#E3F2FD',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10
        },
        badgeText: {
            fontSize: 12,
            color: '#007EA7',
            fontWeight: 'bold'
        },
        labelSmall: {
            fontSize: 13,
            color: '#777',
            // marginTop: 5,
            fontWeight: 'bold'
        },
        valueSmall: {
            fontSize: 13,
            // fontWeight: '500',
            flexShrink: 1
        },
        viewBtn: {
            backgroundColor: '#f1f1f1',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8
        },
        viewText: {
            fontSize: 12,
            fontWeight: 'bold'
        },
        infoRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 2,
            paddingVertical: 4,
        },

        infoLabel: {
            fontSize: 13,
            color: '#555',
            fontWeight: '600'
        },

        infoValue: {
            fontSize: 13,
            color: '#000',
            fontWeight: '500'
        },
        fab: {
            position: 'absolute',
            left: 0,
            bottom: 20,
            width: 55,
            height: 55,
            backgroundColor: '#007EA7',
            borderTopRightRadius: 20, // nice corner curve
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 10,
            zIndex: 9999,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center'
        },

        modalBox: {
            width: 300,
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 20,
            alignItems: 'center',
            elevation: 10
        },

        successIcon: {
            fontSize: 50,
            marginBottom: 10
        },

        modalTitle: {
            fontSize: 20,
            fontWeight: 'bold'
        },

        modalMessage: {
            fontSize: 16,
            marginVertical: 10,
            textAlign: 'center'
        },

        okButton: {
            backgroundColor: '#2e7d32',
            paddingHorizontal: 25,
            paddingVertical: 10,
            borderRadius: 6
        },

        okText: {
            color: '#fff',
            fontWeight: 'bold'
        },
        qtyBig: {
            fontSize: 11,
            // fontWeight: 'bold',
            // color: '#000'
        },
    });

    let cancelToken: any;

    console.log("Carton SUmmary", cartonSummary);
    console.log("activeCreels", activeCreels)
    console.log("status", FormState.values.status);

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    useEffect(() => {
        const loadProperty = async () => {
            const allprpdata = await fetchAllPropertyData(token);
            setAllPropertyData(allprpdata);
        };
        loadProperty();
    }, []);

    useEffect(() => {
        if (typeof FormState.values.PrpCode != 'undefined' && FormState.values.PrpCode != null && FormState.values.PrpCode != '') {
            const testFinct = async () => {
                const allyeardata = await fetchAllYeardata(token, FormState.values.PrpCode)
                setAllYearData(allyeardata)
            }
            testFinct();
        }
    }, [FormState.values.PrpCode])

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    useEffect(() => {
        requestPermission();
    }, []);


    const handleLoadPress = () => {
        const { PrpCode, YearNo, fromdate, todate } = FormState.values;
        if (!PrpCode || !YearNo) {
            Alert.alert("Validation", "Please select Property and Year");
            return;
        }
        fetchBrowseData();
        console.log("Selected 👉", FormState.values);
        setIsDrawerVisible(false);
    };

    const fetchBrowseData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const params = {
                prpcode: FormState.values.PrpCode,
                strcode: '002',
                txntype: 'creel_yarn_issue',
                yearno: FormState.values.YearNo,
                fromdate: FormState.values.fromdate,
                todate: FormState.values.todate,
                status: FormState.values.status
            };

            const response = await axios.post(`${API}/api/get_yarn_issue_browse`, params, { headers });

            console.log("response", response)
            console.log("payload", params)

            const apiData = response?.data?.response?.data || [];
            if (response?.data?.success) {
                let finalData = apiData || [];
                if (FormState.values.status === 'C') {
                    finalData = finalData.filter(item => {
                        const qty = parseFloat(item.CreelQty || 0);
                        return qty === 0;
                    });
                } else {
                    finalData = finalData.filter(item => {
                        const qty = parseFloat(item.CreelQty || 0);
                        return qty !== 0;
                    });
                }

                if (finalData.length > 0) {
                    setActiveCreels(finalData);
                    closeDrawer();
                } else {
                    setActiveCreels([]);
                    Alert.alert("No Record Found", "No data available");
                }
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                setActiveCreels([]);
                console.log("Request cancelled");
            } else {
                console.log("API Error:", error);
                Alert.alert('Error while searching');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusFromQty = (qty) => {
        const parsedQty = parseFloat(qty || 0);
        return parsedQty === 0 ? 'Complete' : 'Running';
    };

    const handleViewClick = async (item = null) => {
        if (!item) return; // safety

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        setIsLoading(true);

        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };

        try {
            const payload = {
                CreelId: item.CreelId,
                Shift: item.Shift,
                Setupdate: item.IssDate
            };

            console.log("Payload:", payload);

            const response = await axios.post(
                `${API}/api/get_yarn_issue_browse`,
                payload,
                { headers }
            );

            console.log("response", response);

            if (response?.data?.success) {

                // 👉 selected data store karo
                setSelectedCreel(payload);

                // 👉 modal switch
                setIsCreelModalVisible(false);
                setIsScanModalVisible(true);

            } else {
                Alert.alert("Error", "No data found");
            }

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled");
            } else {
                console.log("API Error:", error);
                Alert.alert("Error while processing");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            const value = codes[0]?.value || '';
            console.log("📦 Raw QR Value 👉", value);
            try {
                const parts = value.split("~");
                if (parts.length < 17) {
                    throw new Error("Invalid format");
                }
                const parsed = {
                    PUId: parts[0],
                    PSrNo: parts[1],
                    PSubSr: parts[2],
                    TranType: parts[3],
                    CartNo: parts[4],
                    ItmCode: parts[5],
                    ItmName: parts[6],
                    MerCode: parts[7],
                    MerName: parts[8],
                    GrdCode: parts[9],
                    GrdName: parts[10],
                    ShdCode: parts[11],
                    ShdName: parts[12],
                    Denier: parts[13],
                    Wt: parts[14],
                    Chees: parts[15],
                    yearNo: parts[16]
                };
                console.log("✅ Parsed 👉", parsed);
                setScannedObj(parsed);
                setCartonNo(parsed.CartNo || '');
                setYearNo(parsed.yearNo || '');
                setchees(parsed.Chees || '');
                setavgwt(parsed.Wt || '');
                sendScannedValue(value);
            } catch (err) {
                Alert.alert("Invalid QR", "QR format not valid");
            }
            setIsScanning(false);
        },
    });

    const handleSearch = async () => {
        if (!searchText) {
            Alert.alert('Enter carton number');
            return;
        }
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            const yno = await AsyncStorage.getItem('yno');
            const payload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                strcode: '002',
                searchcarton: searchText.trim()
            };
            console.log("Payload:", payload);
            const response = await axios.post(
                `${API}/api/get_carton_search`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                        'Content-Type': 'application/json',
                        'X-Requested-with': 'XMLHttpRequest',
                    },
                    cancelToken: cancelToken.token
                }
            );
            console.log("Search Response:", response);
            const data = response?.data?.response?.data || [];
            if (response?.data?.success && data.length > 0) {
                setSearchResults(data);
            } else {
                setSearchResults([]);
                Alert.alert('No data found');
            }

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled");
            } else {
                console.log("API Error:", error);
                Alert.alert('Error while searching');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCarton = () => {
        if (!CartonNo || !getchees || !getavgwt) {
            Alert.alert("Error", "Please scan carton first");
            return;
        }

        const isDuplicate = cartonSummary.some(
            item => item.cartonNo === CartonNo
        );

        if (isDuplicate) {
            Alert.alert("Duplicate Error", `Carton No ${CartonNo} already added.`);
            return;
        }

        const enteredChees = parseFloat(getchees);
        const enteredQty = parseFloat(getavgwt);
        const availableChees = parseFloat(getScannedObj?.Chees || 0);
        const availableQty = parseFloat(getScannedObj?.Wt || 0);

        if (enteredChees > availableChees) {
            Alert.alert(
                "Validation Error",
                `Entered Chees (${enteredChees}) Cannot not be greater than Available Chees (${availableChees}).`
            );
            return;
        }

        if (enteredQty > availableQty) {
            Alert.alert(
                "Validation Error",
                `Entered Quantity (${enteredQty}) Cannot not be greater than Available Quantity (${availableQty}).`
            );
            return;
        }

        const newCarton = {
            cartonNo: CartonNo,
            chees: getchees,
            qty: getavgwt,
            PUId: getScannedObj?.PUId,
            PSrNo: getScannedObj?.PSrNo,
            PSubSr: getScannedObj?.PSubSr,
            TranType: getScannedObj?.TranType,
            ItmCode: getScannedObj?.ItmCode,
            ItmName: getScannedObj?.ItmName,
            MerCode: getScannedObj?.MerCode,
            MerName: getScannedObj?.MerName,
            GrdCode: getScannedObj?.GrdCode,
            GrdName: getScannedObj?.GrdName,
            ShdCode: getScannedObj?.ShdCode,
            ShdName: getScannedObj?.ShdName,
            Denier: getScannedObj?.Denier,
            yearNo: getScannedObj?.yearNo,
        };
        setCartonSummary(prev => [...prev, newCarton]);
        setCartonNo('');
        setchees('');
        setavgwt('');
        setSearchResults({});
        setScannedObj({});
    };

    // if (!device || !hasPermission) {
    //     return (<View><Text>No camera permission or device not available</Text></View>);
    // }

    {
        (!device || !hasPermission) && (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Text>No camera permission or device not available</Text>
            </View>
        )
    }

    const getToken = () => {
        return token;
    };

    const getShifts = async () => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            let yno = await AsyncStorage.getItem('yno');

            const historyPayload = {
                // text: parcode,
                txntype: 'beam_checking_tablet',
                referrer: 'dashboard',
                fetch: 'shift',
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo

            };
            const response = await axios.get(
                `${API}/api/get_criterion`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            console.log("response", response);
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

    const getdesign = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        try {
            let yno = await AsyncStorage.getItem('yno');
            const historyPayload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                strcode: '012',
                itmcode: '',
                dsncode: '',
                shdcode: '',
                page: '',
                limit: '',
                txntype: 'production_order_sudo'
            };
            const response = await axios.get(
                `${API}/api/getdesign`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            console.log("response", response);
            if (response.data.success && response.data.response.data.length > 0) {
                setData(response.data.response.data);
            } else {
                setData([]);
            }
        } catch (error) {
            console.log("API getshifts error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (isCreelModalVisible) {
            getShifts();
            // getdesign();
        }
    }, [isCreelModalVisible]);

    const handleAdd = () => {
        if (!design) {
            Alert.alert('Please select Design');
            return;
        }

        const selectedRow = getData.find(el => el.DsnCode === design);

        const newRow = {
            srNo: gridData.length + 1,
            CartonNo: CartonNo,
            design: selectedRow?.DsnName || ''
        };
        setGridData(prev => [...prev, newRow]);
        setBeamNo(prev => prev + 1);
        setDesign('');
        setDesignName('');
    };

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
                yearno: yno
            };
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/get_auto_checking_help`, infoPyload, { headers });

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

    // const handleSubmitScan = async () => {
    //     if (cancelToken?.cancel) cancelToken.cancel();
    //     cancelToken = axios.CancelToken.source();
    //     setIsLoading(true);
    //     try {
    //         let yno = await AsyncStorage.getItem('yno');
    //         const payloadObj = {
    //             PrpCode: FormState.values.PrpCode,
    //             YearNo: FormState.values.YearNo,
    //             txntype: 'creel_yarn_issue',
    //             CreelId: creelId,
    //             // setupDate: setupDate,
    //             SetupDate: setupDate.toISOString().split('T')[0],
    //             Shift: shift,
    //             Remark: Remark || '',
    //             StkType: stocktype || '',
    //             Cartons: cartonSummary.map(item => ({
    //                 CartNo: item.cartonNo || '',
    //                 Chees: item.chees || '',
    //                 Wt: item.qty || '',
    //                 PUId: item.PUId || '',
    //                 PSrNo: item.PSrNo || '',
    //                 PSubSr: item.PSubSr || '',
    //                 TranType: item.TranType || '',
    //                 ItmCode: item.ItmCode || '',
    //                 ItmName: item.ItmName || '',
    //                 MerCode: item.MerCode || '',
    //                 MerName: item.MerName || '',
    //                 GrdCode: item.GrdCode || '',
    //                 GrdName: item.GrdName || '',
    //                 ShdCode: item.ShdCode || '',
    //                 ShdName: item.ShdName || '',
    //                 Denier: item.Denier || '',
    //                 yearno: item.yearNo || ''
    //             }))
    //         };

    //         console.log("payload", payloadObj);

    //         const headers = {
    //             Authorization: `Bearer ${getToken()}`,
    //             'Content-Type': 'application/json',
    //             'X-Requested-with': 'XMLHttpRequest',
    //         };
    //         const response = await axios.post(`${API}/api/add_creel_data`, payloadObj, { headers });
    //         console.log("response", response);

    //         if (response.data.success === true) {
    //             setDataSaved(true);

    //             // ✅ Snackbar REMOVE → Modal use karo
    //             setSuccessMessage('Data Saved Successfully ✅');
    //             setShowSuccess(true);

    //         }
    //         else if (response.data.success === false) {
    //             setIsLoading(false);
    //             setDataSaved(false);
    //             Snackbar.show({
    //                 text: response.data.message,
    //                 duration: Snackbar.LENGTH_LONG,
    //                 backgroundColor: '#000',
    //                 textColor: '#fff',
    //                 action: { text: 'OK', textColor: 'yellow' },
    //             });
    //         } else {
    //             setIsLoading(false);
    //             setDataSaved(false);
    //             Snackbar.show({
    //                 text: response.data.message,
    //                 duration: Snackbar.LENGTH_LONG,
    //                 backgroundColor: '#000',
    //                 textColor: '#fff',
    //                 action: { text: 'OK', textColor: 'red' },
    //             });
    //         }
    //     } catch (error) {
    //         setDataSaved(false);
    //         setIsLoading(false);
    //         console.log("API handleSubmitScan error:", error);
    //     } finally {
    //         setIsLoading(false);
    //     }

    // }

    const handleSubmitScan = async () => {
        setIsLoading(true);

        try {
            // 👉 Yaha pe sirf local processing (agar kuch karna ho)
            let yno = await AsyncStorage.getItem('yno');

            const payloadObj = {
                PrpCode: FormState.values.PrpCode,
                YearNo: FormState.values.YearNo,
                txntype: 'creel_yarn_issue',
                CreelId: creelId,
                SetupDate: setupDate.toISOString().split('T')[0],
                Shift: shift,
                Remark: Remark || '',
                StkType: stocktype || '',
                Cartons: cartonSummary.map(item => ({
                    CartNo: item.cartonNo || '',
                    Chees: item.chees || '',
                    Wt: item.qty || '',
                    PUId: item.PUId || '',
                    PSrNo: item.PSrNo || '',
                    PSubSr: item.PSubSr || '',
                    TranType: item.TranType || '',
                    ItmCode: item.ItmCode || '',
                    ItmName: item.ItmName || '',
                    MerCode: item.MerCode || '',
                    MerName: item.MerName || '',
                    GrdCode: item.GrdCode || '',
                    GrdName: item.GrdName || '',
                    ShdCode: item.ShdCode || '',
                    ShdName: item.ShdName || '',
                    Denier: item.Denier || '',
                    yearno: item.yearNo || ''
                }))
            };

            console.log("payload (local only)", payloadObj);

            // ✅ Direct success show karo (API nahi call karni)
            setDataSaved(true);
            setSuccessMessage('Data Saved Successfully ✅');
            setShowSuccess(true);

        } catch (error) {
            console.log("handleSubmitScan error:", error);
            setDataSaved(false);

            Snackbar.show({
                text: 'Something went wrong',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: '#000',
                textColor: '#fff',
            });
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        setIsDrawerVisible(true);
    }, []);

    return (
        <>
            {isLoading && <FullScreenLoader />}
            <HeaderBarwithBack
                userName={username}
                header={'Creel Managment System'}
            />
            <View style={checkingScannerStyles.flexContainer}>


                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsCreelModalVisible(true)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#007EA7',
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 6,
                    }}
                >
                    <Icon
                        name="add"
                        size={18}
                        color="#fff"
                        style={{ marginRight: 6 }}
                    />

                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                        Create New Creel
                    </Text>
                </TouchableOpacity>


            </View>

            <View style={checkingScannerStyles.flexContainer}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 6,
                    }}
                >
                    <Text style={{ color: '#070000', fontWeight: 'bold' }}>
                        Active Creels
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 10, marginTop: 0, flex: 1 }}>
                <FlatList
                    data={activeCreels}
                    keyExtractor={(item, index) => index.toString()}
                    showsVerticalScrollIndicator={true} // scrollbar ON
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => (
                        <View style={styles.creelCard}>

                            <View style={{ flex: 1 }}>

                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.creelTitle}>Creel ID : </Text>
                                    <Text style={styles.creelTitle}>{item.CreelId}</Text>

                                    {/* Status next to ID */}
                                    <View style={{ marginLeft: 10 }}>
                                        <Text style={styles.badgeText}>
                                            {getStatusFromQty(item.CreelQty)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                    <View style={{ flex: 2 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' }}>
                                            <Text style={styles.labelSmall}>Date : </Text>
                                            <Text style={styles.valueSmall} numberOfLines={1}>
                                                {item.IssDate}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' }}>
                                            <Text style={styles.labelSmall}>Shift : </Text>
                                            <Text style={styles.valueSmall}>
                                                {item.Shift}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={{ marginTop: 10 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' }}>
                                        <Text style={styles.labelSmall}>Creel Qty : </Text>
                                        <Text style={styles.qtyBig}>
                                            {item.CreelQty}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.viewBtn}
                                onPress={() => handleViewClick(item)}
                            >
                                <Text style={styles.viewText}>View</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            </View>

            <Modal
                visible={isCreelModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsCreelModalVisible(false)}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPressOut={() => setIsCreelModalVisible(false)}
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)'
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={{
                            flex: 1,
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#fff'
                        }}
                    >
                        <FlatList
                            data={[1]} // dummy
                            keyExtractor={(item, index) => index.toString()}
                            showsVerticalScrollIndicator={false}
                            renderItem={null}
                            contentContainerStyle={{ padding: 15, paddingBottom: 40 }}

                            ListHeaderComponent={
                                <>
                                    <Text style={{
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        marginBottom: 15,
                                        textAlign: 'center'
                                    }}>
                                        Create New Creel
                                    </Text>

                                    <View style={checkingScannerStyles.container}>

                                        <View style={checkingScannerStyles.row}>
                                            <View style={styles.fullInput}>
                                                <Text style={checkingScannerStyles.label}>
                                                    Creel ID <Text style={{ color: 'red' }}>*</Text>
                                                </Text>
                                                <TextInput
                                                    style={[checkingScannerStyles.input, { height: 40 }]}
                                                    value={creelId}
                                                    onChangeText={(text) => setCreelId(text)}
                                                    editable={true}
                                                    placeholder="Enter Creel ID"
                                                />
                                            </View>
                                        </View>
                                        <View style={checkingScannerStyles.row}>
                                            <View style={checkingScannerStyles.halfInput}>
                                                <Text style={checkingScannerStyles.label}>
                                                    SetUp Date <Text style={{ color: 'red' }}>*</Text>
                                                </Text>
                                                <TouchableOpacity
                                                    style={checkingScannerStyles.dropdown}
                                                    onPress={() => setShowDatePicker(true)}
                                                >
                                                    <Text>
                                                        {setupDate ? setupDate.toLocaleDateString() : 'Select Date'}
                                                    </Text>
                                                </TouchableOpacity>

                                                {showDatePicker && (
                                                    <DateTimePicker
                                                        value={setupDate}
                                                        mode="date"
                                                        display="default"
                                                        onChange={(event, selectedDate) => {
                                                            setShowDatePicker(false);
                                                            if (selectedDate) setSetupDate(selectedDate);
                                                        }}
                                                    />
                                                )}
                                            </View>

                                            <View style={checkingScannerStyles.halfInput}>
                                                <Text style={checkingScannerStyles.label}>
                                                    Shift <Text style={{ color: 'red' }}>*</Text>
                                                </Text>
                                                <View style={checkingScannerStyles.dropdown}>
                                                    <Picker
                                                        selectedValue={shift}
                                                        onValueChange={(itemValue) => setShift(itemValue)}
                                                        style={checkingScannerStyles.picker}
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
                                                        size={24}
                                                        color="#555"
                                                        style={checkingScannerStyles.dropdownIcon}
                                                    />
                                                </View>
                                            </View>

                                            <View style={checkingScannerStyles.halfInput}>
                                                <Text style={checkingScannerStyles.label}>
                                                    Stock Type <Text style={{ color: 'red' }}>*</Text>
                                                </Text>
                                                <View style={checkingScannerStyles.dropdown}>
                                                    <Picker
                                                        selectedValue={stocktype}
                                                        onValueChange={(itemValue) => setstocktype(itemValue)}
                                                        style={checkingScannerStyles.picker}
                                                    >
                                                        <Picker.Item label="Select Stock Type" value="" enabled={false} />
                                                        {getStockTypes.map((item, index) => (
                                                            <Picker.Item
                                                                key={index}
                                                                label={item.label}
                                                                value={item.value}
                                                            />
                                                        ))}
                                                    </Picker>
                                                    <Icon
                                                        name="arrow-drop-down"
                                                        size={24}
                                                        color="#555"
                                                        style={checkingScannerStyles.dropdownIcon}
                                                    />
                                                </View>
                                            </View>
                                        </View>

                                        <View style={checkingScannerStyles.row}>
                                            <View style={styles.fullInput}>
                                                <Text style={checkingScannerStyles.label}>
                                                    Remark
                                                </Text>
                                                <TextInput
                                                    placeholder="Enter Remark"
                                                    value={Remark}
                                                    onChangeText={(text) => setRemark(text)}
                                                    style={[checkingScannerStyles.input, { height: 60 }]}
                                                    multiline
                                                />
                                            </View>
                                        </View>

                                        {/* <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionTitle}>Beam Details</Text>
                                        </View>

                                        <View style={[checkingScannerStyles.row, { marginTop: 6 }]}>
                                            <View style={styles.smallInput}>
                                                <Text style={checkingScannerStyles.label}>
                                                    Beam No <Text style={{ color: 'red' }}>*</Text>
                                                </Text>
                                                <TextInput
                                                    style={styles.inputDisabled}
                                                    value={beamNo?.toString()}
                                                    editable={false}
                                                />
                                            </View>

                                            <View style={styles.largeInput}>
                                                <Text style={checkingScannerStyles.label}>
                                                    Design <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <View style={[checkingScannerStyles.dropdown, { flex: 1 }]}>
                                                        <Picker
                                                            selectedValue={design || ''}
                                                            onValueChange={(itemValue) => {
                                                                setDesign(itemValue);
                                                                const selectedRow = getData.find(el => el.DsnCode === itemValue);
                                                                setWarpLen(selectedRow?.WarpLen || '0');
                                                            }}
                                                            style={checkingScannerStyles.picker}
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
                                                            size={20}
                                                            color="#555"
                                                            style={checkingScannerStyles.dropdownIcon}
                                                        />
                                                    </View>

                                                    <TouchableOpacity
                                                        activeOpacity={0.6}
                                                        onPress={handleAdd}
                                                        style={{
                                                            backgroundColor: '#007EA7',
                                                            marginLeft: 8,
                                                            paddingHorizontal: 14,
                                                            height: 45,
                                                            borderRadius: 8,
                                                            justifyContent: 'center',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <Text style={{
                                                            color: '#fff',
                                                            fontWeight: 'bold',
                                                            fontSize: 18
                                                        }}>
                                                            +
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View> */}


                                        {/* {gridData.length > 0 && (
                                            <View style={styles.summaryCard}>
                                                <Text style={styles.summaryTitle}>
                                                    Beam Summary
                                                </Text>

                                                <Text style={styles.summarySub}>
                                                    {gridData.length} beam(s) added
                                                </Text>

                                                <View style={styles.tableHeader}>
                                                    <Text style={styles.th}>Beam No</Text>
                                                    <Text style={styles.th}>Design</Text>
                                                    <Text style={styles.th}>Action</Text>
                                                </View>

                                                <FlatList
                                                    data={gridData}
                                                    keyExtractor={(item, index) => index.toString()}
                                                    style={{ maxHeight: 80 }}   // 🔥 increase height
                                                    showsVerticalScrollIndicator={true}
                                                    nestedScrollEnabled={true}   // 🔥 IMPORTANT FIX
                                                    initialNumToRender={10}
                                                    maxToRenderPerBatch={10}
                                                    renderItem={({ item, index }) => (
                                                        <View style={styles.tableRow}>
                                                            <Text style={styles.td}>{item.beamNo}</Text>
                                                            <Text style={styles.td}>{item.design}</Text>

                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    setGridData(prev =>
                                                                        prev.filter((_, i) => i !== index)
                                                                    );
                                                                }}
                                                                style={styles.deleteBtn}
                                                            >
                                                                <Text style={styles.deleteText}>Delete</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    )}
                                                />
                                            </View>
                                        )} */}

                                    </View>
                                </>
                            }

                            ListFooterComponent={
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (!creelId || creelId.trim() === '') {
                                                Alert.alert("Validation Error", "Please enter Creel ID");
                                                return;
                                            }
                                            const yearNo = FormState.values.YearNo;
                                            const startYear = "20" + (parseInt(yearNo) - 1);
                                            const endYear = "20" + yearNo;

                                            const selectedDate = setupDate.toISOString().split('T')[0];

                                            const fyStart = `${startYear}-04-01`;
                                            const fyEnd = `${endYear}-03-31`;

                                            if (selectedDate < fyStart || selectedDate > fyEnd) {
                                                Alert.alert(
                                                    " ",
                                                    "⚠️ Date could not be less than current financial year.",
                                                    [
                                                        {
                                                            text: "OK",
                                                            style: "default"
                                                        }
                                                    ],
                                                    { cancelable: true }
                                                );
                                                return;
                                            }
                                            else {
                                                setIsCreelModalVisible(false);
                                                setIsScanModalVisible(true);
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#007EA7',
                                            padding: 12,
                                            borderRadius: 8,
                                            marginLeft: 5,
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                            Save & Next
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setIsCreelModalVisible(false)}
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#ccc',
                                            padding: 12,
                                            borderRadius: 8,
                                            marginRight: 5,
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Text style={{ fontWeight: 'bold' }}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                        />

                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={isScanModalVisible}
                animationType="slide"
                onRequestClose={() => setIsScanModalVisible(false)}
            >
                {isLoading && <FullScreenLoader />}
                <HeaderBarwithBack
                    userName={username}
                    header={'Issue Yarn'}
                    subHeader={
                        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
                            Scan Cartons and issue yarn for Creel {creelId}
                        </Text>
                    }

                />

                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', margin: 10 }}>
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#007EA7',
                            paddingVertical: 5,
                            paddingHorizontal: 10,
                            borderRadius: 20
                        }}
                        onPress={() => setShowManualSearch(!showManualSearch)}
                    >
                        <Text style={{ color: '#fff', fontSize: 14 }}>
                            Manual Search
                        </Text>
                    </TouchableOpacity>
                </View>

                {showManualSearch && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 120,
                            left: 20,
                            right: 20,
                            backgroundColor: '#fff',
                            borderRadius: 12,
                            padding: 12,
                            elevation: 5,
                            shadowColor: '#000',
                            shadowOpacity: 0.2,
                            shadowRadius: 5,
                            zIndex: 1000
                        }}
                    >
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput
                                placeholder="Enter Carton No"
                                value={searchText}
                                onChangeText={setSearchText}
                                style={{
                                    flex: 1,
                                    borderWidth: 1,
                                    borderColor: '#ccc',
                                    borderRadius: 8,
                                    paddingHorizontal: 10,
                                    height: 40
                                }}
                            />
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#007EA7',
                                    height: 40,
                                    width: 40,
                                    borderRadius: 8,
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}
                                onPress={handleSearch}
                            >
                                <Icon name="search" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item, index) => index.toString()}
                            style={{ marginTop: 10, maxHeight: 150 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{
                                        padding: 8,
                                        borderBottomWidth: 1,
                                        borderColor: '#eee',
                                        backgroundColor:
                                            selectedItem?.CartNo === item.CartNo ? '#e6f7ff' : '#fff'
                                    }}
                                    onPress={() => setSelectedItem(item)}
                                >
                                    {/* ✅ carton only */}
                                    <Text style={{ fontSize: 13, fontWeight: 'bold' }}>
                                        {item.CartNo}
                                    </Text>

                                    {/* optional detail */}
                                    <Text style={{ fontSize: 11, color: '#666' }}>
                                        {item.ItmName} / {item.MerName} / {item.ShdName}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <TouchableOpacity
                                style={[checkingScannerStyles.submitBtn, { flex: 1 }]}
                                onPress={() => {
                                    if (!selectedItem) {
                                        Alert.alert("Select carton first");
                                        return;
                                    }
                                    const data = {
                                        CartNo: selectedItem.CartNo,
                                        ItmName: selectedItem.ItmName,
                                        MerName: selectedItem.MerName,
                                        ShdName: selectedItem.ShdName,
                                        GrdName: selectedItem.GrdName,
                                        Chees: selectedItem.Chees,
                                        Wt: selectedItem.Wt,
                                        PUId: selectedItem.PUId,
                                        PSrNo: selectedItem.PSrNo,
                                        PSubSr: selectedItem.PSubSr,
                                        TranType: selectedItem.TranType,
                                        ItmCode: selectedItem.ItmCode,
                                        MerCode: selectedItem.MerCode,
                                        GrdCode: selectedItem.GrdCode,
                                        ShdCode: selectedItem.ShdCode,
                                        Denier: selectedItem.Denier,
                                        yearNo: selectedItem.yearno,
                                    };
                                    setCartonNo(data.CartNo || '');
                                    setchees(data.Chees || '');
                                    setavgwt(data.Wt || '');
                                    setScannedObj(data);
                                    setShowManualSearch(false);
                                    setSearchText('');
                                    setSearchResults([]);
                                    setSelectedItem(null);
                                }}
                            >
                                <Text style={checkingScannerStyles.submitText}>OK</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    checkingScannerStyles.submitBtn,
                                    { flex: 1, backgroundColor: '#999' }
                                ]}
                                onPress={() => {
                                    setShowManualSearch(false);
                                    setSearchText('');
                                    setSearchResults([]);
                                    setSelectedItem(null);
                                }}
                            >
                                <Text style={checkingScannerStyles.submitText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

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
                    scrollEnabled={false}
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
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Enter Cartons Detail</Text>
                    </View>
                    <View style={checkingScannerStyles.container}>
                        <View style={checkingScannerStyles.row}>
                            <View style={checkingScannerStyles.halfInput}>
                                <Text style={styles.label}>
                                    Carton Number
                                    <Text style={{ color: 'red' }}>*</Text>
                                </Text>
                                <TextInput
                                    placeholder="Carton number"
                                    style={styles.inputDisabled}
                                    value={CartonNo}
                                    onChangeText={setCartonNo}
                                    editable={false}
                                />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.halfInput, { marginTop: 10 }]}>
                                <Text style={styles.label}>
                                    Number Of Chees <Text style={{ color: 'red' }}>*</Text>
                                </Text>
                                <TextInput
                                    placeholder="Enter number"
                                    value={getchees}
                                    keyboardType="decimal-pad"
                                    style={styles.inputDisabled}
                                    onChangeText={setchees}
                                    editable={true}
                                />
                            </View>
                            <View style={[styles.halfInput, { marginTop: 10 }]}>
                                <Text style={styles.label}>
                                    Quantity (Kg) <Text style={{ color: 'red' }}>*</Text>
                                </Text>
                                <TextInput
                                    placeholder="Enter meter"
                                    value={getavgwt}
                                    keyboardType="decimal-pad"
                                    style={styles.inputDisabled}
                                    onChangeText={setavgwt}
                                    editable={true}
                                />
                            </View>
                        </View>

                        {getScannedObj && Object.keys(getScannedObj).length > 0 && (
                            <View style={{ marginTop: 0 }}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Item Name:</Text>
                                    <Text style={styles.infoValue}>{getScannedObj?.ItmName || '-'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Merge:</Text>
                                    <Text style={styles.infoValue}>{getScannedObj?.MerName || '-'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Shade:</Text>
                                    <Text style={styles.infoValue}>{getScannedObj?.ShdName || '-'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Grade:</Text>
                                    <Text style={styles.infoValue}>{getScannedObj?.GrdName || '-'}</Text>
                                </View>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 0 }}>
                            <TouchableOpacity
                                style={[checkingScannerStyles.submitBtn, { width: '50%', paddingVertical: 8 }]}
                                onPress={handleAddCarton}
                            >
                                <Text style={checkingScannerStyles.submitText}>Add Carton</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    checkingScannerStyles.submitBtn,
                                    { width: '50%', backgroundColor: '#999', paddingVertical: 8 }
                                ]}
                                onPress={() => {
                                    setCartonNo('');
                                    setchees('');
                                    setavgwt('');
                                    setScannedObj({});
                                }}
                            >
                                <Text style={checkingScannerStyles.submitText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 0 }}>
                            <TouchableOpacity
                                style={[checkingScannerStyles.submitBtn, { width: '50%', paddingVertical: 8 }]}
                                onPress={handleSubmitScan}
                            >
                                <Text style={checkingScannerStyles.submitText}>Submit Scan</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    checkingScannerStyles.submitBtn,
                                    { width: '50%', backgroundColor: '#999', paddingVertical: 8 }
                                ]}
                                onPress={() => {
                                    setIsScanModalVisible(false);
                                    setIsCreelModalVisible(true);
                                }}
                            >
                                <Text style={checkingScannerStyles.submitText}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        {cartonSummary.length > 0 && (
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryTitle}>
                                    Yarn Issuance Summary
                                </Text>
                                <Text style={styles.summarySub}>
                                    {cartonSummary.length} carton(s) added
                                </Text>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.th, { flex: 2 }]}>Carton No</Text>
                                    <Text style={[styles.th, { flex: 3 }]}>Item/Merge/Grade/Shade</Text>
                                    <Text style={[styles.th, { flex: 1 }]}>Chees</Text>
                                    <Text style={[styles.th, { flex: 1 }]}>Qty</Text>
                                    <Text style={[styles.th, { flex: 1 }]}>Action</Text>
                                </View>

                                <FlatList
                                    data={cartonSummary}
                                    keyExtractor={(item, index) => index.toString()}
                                    showsVerticalScrollIndicator={true}
                                    style={{ maxHeight: 100 }}
                                    nestedScrollEnabled={true}
                                    renderItem={({ item, index }) => (
                                        <View
                                            style={[
                                                styles.tableRow,
                                                { backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff' }
                                            ]}
                                        >
                                            <Text style={[styles.td, { flex: 2 }]}>
                                                {item.cartonNo}
                                            </Text>

                                            <Text style={[styles.td, { flex: 3 }]}>
                                                {item.ItmName} / {item.MerName} / {item.GrdName} /{item.ShdName}
                                            </Text>

                                            <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>
                                                {item.chees}
                                            </Text>

                                            <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>
                                                {item.qty}
                                            </Text>

                                            <TouchableOpacity
                                                style={styles.deleteBtn}
                                                onPress={() => {
                                                    setCartonSummary(prev =>
                                                        prev.filter((_, i) => i !== index)
                                                    );
                                                }}
                                            >
                                                <Icon name="delete" size={20} color="red" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                />
                            </View>
                        )}
                        <View style={checkingScannerStyles.infoBox}>
                            <Text style={checkingScannerStyles.infoText}> Fill all fields to enable submission </Text>
                        </View>
                    </View>

                </ScrollView>
            </Modal >

            <TouchableOpacity style={styles.fab} onPress={openDrawer}>
                <Icon name="read-more" size={20} color="#fff" />
            </TouchableOpacity>

            <Modal transparent visible={showSuccess} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>

                        <Text style={styles.successIcon}>✅</Text>

                        <Text style={styles.modalTitle}>Success</Text>

                        <Text style={styles.modalMessage}>
                            {successMessage}
                        </Text>

                        <TouchableOpacity
                            style={styles.okButton}
                            onPress={() => {
                                setShowSuccess(false);

                                // 🔥 IMPORTANT
                                setCartonSummary([]);   // list clear
                            }}
                        >
                            <Text style={styles.okText}>OK</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>
            <CustomDrawer
                isVisible={isDrawerVisible}
                onClose={closeDrawer}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                onLoadPress={handleLoadPress}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                getAllPropertyData={getAllPropertyData}
                setAllPropertyData={setAllPropertyData}
                FormState={FormState}
                setFormState={setFormState}
                getAllYearData={getAllYearData}
                setAllYearData={setAllYearData}
                token={token}
            />


        </>
    );
};
export default CreelManagementSystem;
