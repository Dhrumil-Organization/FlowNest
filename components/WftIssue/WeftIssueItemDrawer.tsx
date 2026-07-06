import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Alert, TextInput as RNTextInput, Button, Modal, FlatList, ActivityIndicator, StyleSheet, Dimensions,
    Platform
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
import PartyDropdown from '../Shared/PartyDropdown';
import SearchableDropdown from '../Shared/SearchableDropdown';

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

const WeftIssueItemDrawer = ({
    isVisible,
    onClose,
    FormState,
    setFormState,
    token,
    isEditMode,
    mainUId,
    editData,
    closeAllDrawers,
    resetAllData,
    fetchbrowse
}) => {
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
        { stktypename: 'In house', StkType: 'I' },
        { stktypename: 'Process house', StkType: 'P' }
    ]);
    const [getDataSaved, setDataSaved] = useState(false)
    const [isCreelModalVisible, setIsCreelModalVisible] = useState(false);
    const [setupDate, setSetupDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [CartonNo, setCartonNo] = useState('');
    const [designName, setDesignName] = useState('');
    const [gridData, setGridData] = useState<GridItem[]>([]);
    const [isScanModalVisible, setIsScanModalVisible] = useState(false);
    const [creelId, setCreelId] = useState('');
    const [getavgwt, setavgwt] = useState('0');
    const [cartonSummary, setCartonSummary] = useState<any[]>([]);
    const [showList, setShowList] = useState(false);
    const [Remark, setRemark] = useState('');
    const [showManualSearch, setShowManualSearch] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const [getAllPropertyData, setAllPropertyData] = useState([]);

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date) => date.toISOString().split('T')[0];
    const [getAllYearData, setAllYearData] = useState([]);
    const [selectedstocktype, setselectedstocktype] = useState([]);
    const [activeCreels, setActiveCreels] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [deleteshowSuccess, setdeleteShowSuccess] = useState(false);
    const [selectedCreel, setSelectedCreel] = useState(null);
    // const [mainUId, setMainUId] = useState(null);
    // const [isEditMode, setIsEditMode] = useState(false);
    const [propertydata, setpropertydata] = useState<ExeData[]>([]);
    const screenWidth = Dimensions.get('window').width;
    const selectedProperty = getAllPropertyData?.find((p) => p.PrpCode == FormState.values.PrpCode) || null;

    console.log("Formstate.values", FormState.values);


    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: '#f4f6f8' },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: Platform.OS === 'android' ? 40 : 50,
            paddingBottom: 14,
            paddingHorizontal: 16,
            backgroundColor: '#0e7490',
        },
        backBtn: {
            width: 38,
            height: 38,
            borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 10
        },
        headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
        headerSub: { color: '#d0eef2', fontSize: 12 },
        segment: {
            flexDirection: 'row',
            marginHorizontal: 0,
            // marginTop: -20,
            backgroundColor: '#fff',
            borderRadius: 0,
            padding: 4,
            elevation: 5,
        },
        segmentBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 30 },
        segmentActive: { backgroundColor: '#0e7490', },
        segmentText: { color: '#64748b', fontWeight: '600' },
        segmentTextActive: { color: '#fff', fontWeight: '700' },
        scanRow: {
            margin: 12,
            backgroundColor: '#fff',
            padding: 12,
            borderRadius: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        scanTitle: { fontWeight: '600' },
        scanSub: { fontSize: 11, color: '#666' },
        scanBtn: {
            backgroundColor: '#0e7490',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 8
        },

        scanBtnText: { color: '#fff', fontWeight: '600' },
        card: {
            backgroundColor: '#fff',
            margin: 10,
            padding: 16,
            borderRadius: 16,
            elevation: 5,
        },
        cardTitle: { fontWeight: '700', marginBottom: 10, color: '#000' },
        label: { fontSize: 12, color: '#000', marginBottom: 6 },
        searchRow: { flexDirection: 'row', alignItems: 'center' },
        searchInput: {
            flex: 1,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#f8fafc',
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            color: '#000'
        },
        searchBtn: {
            marginLeft: 10,
            width: 50,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#0e7490',
            justifyContent: 'center',
            alignItems: 'center',
        },
        scanCard: {
            margin: 10,
            backgroundColor: '#0e7490',
            borderRadius: 16,
            paddingVertical: 12,
            paddingHorizontal: 16,
            alignItems: 'center',
        },
        scanText: {
            color: '#fff',
            marginTop: 10,
            fontWeight: '600',
        },
        field: {
            marginBottom: 12
        },
        input: {
            backgroundColor: '#f1f3f6',
            borderRadius: 8,
            paddingHorizontal: 10,
            height: 42,
            borderWidth: 1,
            borderColor: '#ddd',
            color: '#000'
        },
        inputDisabled: {
            backgroundColor: '#e9ecef',
            borderRadius: 8,
            paddingHorizontal: 10,
            height: 42,
            borderWidth: 1,
            borderColor: '#ddd',
            color: '#000'
        },
        fieldFlex: {
            flex: 1,
            marginRight: 8
        },
        row: {
            flexDirection: 'row',
            gap: 10,   // 👈 cleaner spacing (RN 0.71+)
            marginBottom: 12
        },

        fieldHalf: {
            flex: 1
        },
        inputFlex: {
            flex: 1,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#f8fafc',
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
        },
        bottomBar: {
            flexDirection: 'row',
            padding: 15,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderColor: '#eee',
        },

        primaryBtn: {
            flex: 1,
            backgroundColor: '#0e7490',
            padding: 14,
            borderRadius: 25,
            alignItems: 'center',
            marginLeft: 10,
        },

        secondaryBtn: {
            flex: 1,
            backgroundColor: '#e5e7eb',
            padding: 14,
            borderRadius: 25,
            alignItems: 'center',
        },

        primaryText: { color: '#fff', fontWeight: '700' },
        secondaryText: { color: '#333', fontWeight: '600' },
        btnContainer: {
            flexDirection: 'row',
            marginHorizontal: 12,
            marginTop: 8,
            gap: 10
        },

        resultItem: {
            padding: 8,
            borderBottomWidth: 1,
            borderColor: '#eee'
        },

        cameraHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 40,
            paddingBottom: 10,
            backgroundColor: '#000'
        },

        cameraTitle: {
            color: '#fff',
            fontSize: 16,
            fontWeight: '600'
        },

        cameraContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
        },

        camera: {
            ...StyleSheet.absoluteFillObject
        },

        overlay: {
            justifyContent: 'center',
            alignItems: 'center'
        },

        scanBox: {
            width: 220,
            height: 220,
            borderWidth: 2,
            borderColor: '#0e7490',
            borderRadius: 14
        },

        cameraFooter: {
            padding: 20,
            backgroundColor: '#000'
        },

        closeScanBtn: {
            backgroundColor: '#0e7490',
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center'
        },

        closeScanText: {
            color: '#fff',
            fontWeight: '600'
        },
        resultCard: {
            backgroundColor: '#fff',
            marginHorizontal: 20,
            marginTop: 10,
            borderRadius: 14,
            paddingVertical: 6,
            elevation: 4,
            maxHeight: 220,
        },

        resultTitle: {
            fontWeight: '700',
            color: '#0f172a',
        },

        resultSub: {
            fontSize: 12,
            color: '#64748b',
            marginTop: 2,
        },
        segmentInner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6   // 👈 spacing between icon & text
        },
        // listCard: {
        //     flexDirection: 'row',
        //     justifyContent: 'space-between',
        //     backgroundColor: '#fff',
        //     padding: 14,
        //     borderRadius: 14,
        //     marginBottom: 12,
        //     elevation: 3
        // },
        listCard: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start', // 🔥 important (top align)
            padding: 10,
            backgroundColor: '#fff',
            marginBottom: 8,
            borderRadius: 8,
            marginHorizontal: 6,
            elevation: 3
        },

        // leftSection: {
        //     flexDirection: 'row',
        //     alignItems: 'center'
        // },

        leftSection: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            flex: 1,
        },

        indexCircle: {
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: '#0e7490',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10
        },

        indexText: {
            color: '#fff',
            fontWeight: 'bold'
        },

        cartonNo: {
            fontSize: 15,
            fontWeight: 'bold',
            color: '#0e7490'
        },

        subText: {
            fontSize: 12,
            color: '#666',
            marginTop: 2
        },

        rightSection: {
            alignItems: 'flex-end',
            justifyContent: 'center'
        },

        qtyText: {
            fontSize: 13,
            color: '#444'
        },

        cheesText: {
            fontSize: 13,
            color: '#0e7490',
            marginTop: 4,
            fontWeight: '600'
        },

        addMoreBtn: {
            backgroundColor: '#0e7490',
            paddingVertical: 14,
            borderRadius: 20,
            alignItems: 'center',
            marginTop: 0,

            elevation: 4,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 }
        },

        addMoreText: {
            color: '#fff',
            fontSize: 14,
            fontWeight: '500',
            letterSpacing: 0.5
        },
        bottomRow: {
            flexDirection: 'row',
            marginTop: 10,
            justifyContent: 'space-between'
        },

        backBtn1: {
            flex: 1,
            backgroundColor: '#e5e7eb',
            paddingVertical: 12,
            borderRadius: 20,
            alignItems: 'center',
            marginRight: 6
        },

        submitBtn: {
            flex: 1,
            backgroundColor: '#0e7490',
            paddingVertical: 12,
            borderRadius: 20,
            alignItems: 'center',
            marginLeft: 6
        },

        backText: {
            color: '#333',
            fontWeight: '600',
            fontSize: 13
        },

        submitText: {
            color: '#fff',
            fontWeight: '600',
            fontSize: 13
        },
        deleteIcon: {
            alignSelf: 'flex-end',
            marginBottom: 6
        },
        viewListBtn: {
            margin: 10,
            backgroundColor: '#e0f2f1',
            padding: 12,
            borderRadius: 12,
            alignItems: 'center'
        },

        viewListText: {
            color: '#0e7490',
            fontWeight: '700'
        },
        summaryBar: {
            flexDirection: 'row',
            backgroundColor: '#f1f5f9',
            borderRadius: 8,
            paddingVertical: 6,
            marginTop: 8,
            alignItems: 'center'
        },

        summaryItem: {
            flex: 1,
            alignItems: 'center'
        },

        summaryLabel: {
            fontSize: 10,
            color: '#64748b'
        },

        summaryValue: {
            fontSize: 14,
            fontWeight: '700',
            color: '#0f172a',
            marginTop: 1
        },

        divider: {
            width: 1,
            height: 20,
            backgroundColor: '#e2e8f0'
        },
        overlayContainer: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)', // 👈 dim background
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999
        },

        overlayCard: {
            width: '85%',
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16,
            elevation: 10
        },
        selectedItem: {
            backgroundColor: '#dbeafe',   // light blue
            borderWidth: 1,
            borderColor: '#2563eb'
        },
        overlayContainer1: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', // darker blur
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999
        },

        overlayCardNew: {
            width: '80%',
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 20,
            alignItems: 'center',
            elevation: 10
        },

        successIcon: {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#e6f9f0',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10
        },

        successTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: '#0f172a',
            marginBottom: 6
        },

        successMessage: {
            fontSize: 14,
            color: '#475569',
            textAlign: 'center',
            marginBottom: 20
        },

        okButton: {
            width: '100%',
            backgroundColor: '#0e7490',
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center'
        },

        okButtonText: {
            color: '#fff',
            fontWeight: '700',
            fontSize: 15
        },
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

    const parseDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-');
        return new Date(year, month - 1, day);
    };

    const LIGHT_CARD_COLORS = [
        ["#E3F2FD", "#BBDEFB"],
        ["#E8F5E9", "#C8E6C9"],
        ["#FFF3E0", "#FFE0B2"],
        ["#F3E5F5", "#E1BEE7"],
        ["#E0F7FA", "#B2EBF2"],
    ];

    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2);
    };


    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            const value = codes[0]?.value || '';
            console.log("📦 Raw QR Value 👉", value);
            try {
                const parts = value.split("~");
                if (parts.length < 13) {
                    throw new Error("Invalid format");
                }
                const parsed = {
                    PUId: parts[0],
                    PSrNo: parts[1],
                    PSubSr: parts[2],
                    TranType: parts[3],
                    CartNo: parts[4],
                    ItmCode: parts[5],
                    MerCode: parts[6],
                    GrdCode: parts[7],
                    ShdCode: parts[8],
                    Denier: parts[9],
                    Wt: parts[10],
                    Chees: parts[11],
                    yearNo: parts[12]
                };

                console.log("✅ Parsed 👉", parsed);
                setScannedObj(parsed);
                setCartonNo(parsed.CartNo || '');
                setYearNo(parsed.yearNo || '');
                setchees(parsed.Chees || '');
                setavgwt(parsed.Wt || '');

                fetchitmgrdshdname(parsed);

                sendScannedValue(value);
            } catch (err) {
                Alert.alert("Invalid QR", "QR format not valid");
            }
            setIsScanning(false);
        },
    });

    const fetchitmgrdshdname = async (parsedData) => {
        setIsLoading(true); // ✅ start loader
        try {
            const payload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                strcode: FormState.values.yarnstrcode,
                itmcode: parsedData?.ItmCode,
                mercode: parsedData?.MerCode,
                grdcode: parsedData?.GrdCode,
                shdcode: parsedData?.ShdCode,

            };
            console.log("payload", payload)
            const res = await axios.post(`${API}/api/get_item_detail_from_carton`, payload, {
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json',
                    'X-Requested-with': 'XMLHttpRequest',
                }
            });
            console.log(res);
            if (res.data.success && res.data.response?.data) {

                const data = res.data.response.data;
                // 🔥 SIRF NAME SET KARNA
                setScannedObj(prev => ({
                    ...prev,
                    ItmName: data.ItmName || '',
                    MerName: data.MerName || '',
                    ShdName: data.ShdName || '',
                    GrdName: data.GrdName || '',
                }));

            }

        } catch (e) {
            console.log("API ERROR:", e);
        } finally {
            setIsLoading(false); // ✅ stop loader
        }
    };

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
                strcode: FormState.values.yarnstrcode,
                mitmcode: FormState.values.ItmCode,
                txntype: 'beam_weft_issue',
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
                // console.log("Request cancelled");
            } else {
                // console.log("API Error:", error);
                Alert.alert('Error while searching');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCarton = async () => {
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

        if (enteredChees <= 0) {
            Alert.alert("Validation Error", "Chees must be greater than 0.");
            return;
        }

        if (enteredQty <= 0) {
            Alert.alert("Validation Error", "Qty must be greater than 0.");
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
            SrNo: getScannedObj.SrNo,
            DsnRcpSrNo: getScannedObj?.DsnRcpSrNo || editData?.cartonSummary?.[0]?.DsnRcpSrNo || '',
            UId: mainUId?.UId,
        };

        console.log("Form srno:", FormState.values.srno);
        console.log("newCarton:", newCarton);
        console.log("newCarton DsnRcpSrNo:", newCarton?.DsnRcpSrNo);

        const expQty = await ExpectedProdQty(newCarton);

        newCarton.ExpProdQty = expQty;

        setCartonSummary(prev => [...prev, newCarton]);

        setCartonNo('');
        setchees('');
        setavgwt('');
        setSearchResults({});
        setScannedObj({});
        setShowList(true);
    };

    {
        (!device || !hasPermission) && (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Text>No camera permission or device not available</Text>
            </View>
        )
    }

    const handleFinalSubmit = () => {
        console.log("isEditMode:", isEditMode);
        console.log("mainUId:", mainUId);

        if (isEditMode && mainUId !== null) {
            handleSubmitScan();   // MODIFY
        } else {
            handleaddCreel();     // ADD
        }
    };

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
                txntype: 'creel_yarn_issue',
                // referrer: 'dashboard',
                fetch: 'shift',
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo

            };
            console.log("historyPayload", historyPayload);
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
            // console.log("API getshifts error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const ExpectedProdQty = async (newCarton) => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const historyPayload = {
                PrpCode: FormState.values.PrpCode,
                YearNo: FormState.values.YearNo,
                txntype: 'beam_weft_issue',
                WfIssQty: newCarton?.qty,
                MRUId: '0',
                MRSrNo: '0',
                ItmCode: newCarton?.ItmCode,
                ShdCode: newCarton?.ShdCode,
                // PlnWfSrNo: FormState.values.srno || newCarton?.DsnRcpSrNo,
                PlnWfSrNo: FormState.values.srno || newCarton?.DsnRcpSrNo || '',
                beamuid: FormState.values.BeamUId,
                dsncode: FormState.values.DsnCode
            };

            console.log("get_expprodqty_from_issueqty historyPayload", historyPayload);
            const response = await axios.get(
                `${API}/api/get_expprodqty_from_issueqty`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            console.log("get_expprodqty_from_issueqty", response);
            const dataArray = response?.data?.data?.data;

            if (Array.isArray(dataArray) && dataArray.length > 0) {

                const expQty = dataArray[0].ExpProdQty || 0;
                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        ExpProdQty: expQty
                    }
                }));

                return expQty;
            }

            return 0;

        } catch (error) {
            console.log("API ExpectedProdQty error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        const { PrpCode, YearNo } = FormState.values;
        if (PrpCode && YearNo) {
            getShifts();
        }
    }, [FormState.values.PrpCode, FormState.values.YearNo]);


    useEffect(() => {
        if (isCreelModalVisible) {
            getShifts();
            // getdesign();
        }
    }, [isCreelModalVisible]);


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

    const handleSubmitScan = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            let yno = await AsyncStorage.getItem('yno');
            const payloadObj = {
                PrpCode: FormState.values.PrpCode,
                YearNo: FormState.values.YearNo,
                // txntype: 'creel_yarn_issue',
                CreelId: creelId,
                // setupDate: setupDate,
                SetupDate: setupDate.toISOString().split('T')[0],
                Issdate: formatDisplayDate(FormState.values.IssDate),
                Shift: shift,
                Remark: Remark || '',
                StkType: FormState.values.StkType || stocktype || '',
                uid: mainUId || '',
                DsnCode: FormState.values.DsnCode,
                txntype: 'beam_weft_issue',
                RecipeUId: '2',
                Cartons: cartonSummary.map(item => ({
                    uid: item.UId || mainUId,
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
                    yearno: item.yearNo || '',
                    ExpProdQty: item.ExpProdQty || 0,
                    DsnRcpSrNo: FormState.values.srno,
                    DsnCode: FormState.values.DsnCode,
                }))
            };

            console.log("edit payload", payloadObj);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/modify_creel_data`, payloadObj, { headers });
            console.log("edit response", response);

            // if (response.data.success === true) {
            //     setDataSaved(true);

            //     // ✅ Snackbar REMOVE → Modal use karo
            //     setSuccessMessage('Data Updated Successfully ✅');
            //     setShowSuccess(true);

            // }
            if (response.data.success === true) {
                setDataSaved(true);

                setSuccessMessage('Data Updated Successfully ✅');
                setShowSuccess(true);

                // ✅ RESET + CLOSE
                resetAllData();
                setIsScanModalVisible(false);

            }
            else if (response.data.success === false) {
                setIsLoading(false);
                setDataSaved(false);

                Snackbar.show({
                    text: response.data.message,
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: '#000',
                    textColor: '#fff',
                    action: { text: 'OK', textColor: 'yellow' },
                });
            }
            else {
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

    const formatDisplayDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d)) return '';

        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')
            }-${d.getFullYear()}`;
    };

    const handleaddCreel = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            let yno = await AsyncStorage.getItem('yno');
            const payloadObj = {
                PrpCode: FormState.values.PrpCode,
                YearNo: FormState.values.YearNo,
                BeamNo: FormState.values.BeamNo,
                BeamUId: FormState.values.BeamUId,
                StkType: FormState.values.StkType,
                IssNo: FormState.values.IssNo,
                WarpLen: FormState.values.WarpLen,
                Issdate: formatDisplayDate(FormState.values.IssDate),
                SetupDate: formatDisplayDate(FormState.values.IssDate),
                // uid: FormState.values.UId,
                uid: '',
                month: FormState.values.month,
                suffix: FormState.values.suffix,
                strcode: FormState.values.yarnstrcode,
                txntype: 'beam_weft_issue',
                RecipeUId: '2',
                // mitmcode: FormState.values.ItmCode,
                DsnCode: FormState.values.DsnCode,
                Cartons: cartonSummary.map(item => ({
                    // uid: item.UId || FormState.values.UId || '',
                    uid: '',
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
                    yearno: item.yearNo || '',
                    ExpProdQty: item.ExpProdQty || 0,
                    DsnRcpSrNo: FormState.values.srno,
                    DsnCode: FormState.values.DsnCode,
                }))
            };

            console.log("add payload", payloadObj);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/add_creel_data`, payloadObj, { headers });
            console.log("add response", response);

            // if (response.data.success === true) {
            //     setDataSaved(true);

            //     // ✅ Snackbar REMOVE → Modal use karo
            //     setSuccessMessage('Data Saved Successfully ✅');
            //     setShowSuccess(true);

            // }
            // if (response.data.success === true) {
            //     setDataSaved(true);
            //     setSuccessMessage('Data Updated Successfully ✅');
            //     setShowSuccess(true);
            // }
            // else if (response.data.success === false) {
            //     setIsLoading(false);
            //     setDataSaved(false);
            //     Snackbar.show({
            //         text: response.data.message,
            //         duration: Snackbar.LENGTH_LONG,
            //         backgroundColor: '#000',
            //         textColor: '#fff',
            //         action: { text: 'OK', textColor: 'yellow' },
            //     });
            // } 
            // else {
            //     setIsLoading(false);
            //     setDataSaved(false);
            //     Snackbar.show({
            //         text: response.data.message,
            //         duration: Snackbar.LENGTH_LONG,
            //         backgroundColor: '#000',
            //         textColor: '#fff',
            //         action: { text: 'OK', textColor: 'red' },
            //     });
            // }
            const res = response.data;
            if (res.success && res.response?.error !== true) {
                console.log("SUCCESS BLOCK HIT");
                setDataSaved(true);
                // setSuccessMessage(
                //     typeof res.message === 'string'
                //         ? res.message
                //         : 'Data Saved Successfully ✅'
                // );
                if (res.success) {
                    setDataSaved(true);

                    setSuccessMessage(
                        res.response?.message || res.message
                    );

                    setShowSuccess(true);
                }
                setShowSuccess(true);
            } else {
                setDataSaved(false);
                Snackbar.show({
                    text:
                        typeof res.response?.message === 'string'
                            ? res.response.message
                            : 'Save failed (Invalid data / permission issue)',
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: '#000',
                    textColor: '#fff',
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


    useEffect(() => {
        if (isEditMode && editData?.cartonSummary?.length > 0) {
            setCartonSummary(editData.cartonSummary);
        }
    }, [editData]);

    useEffect(() => {
        console.log("FormState UPDATED:", FormState.values);
    }, [FormState.values]);

    const d1 = FormState?.values?.d1 || [];
    const d2 = FormState?.values?.d2 || [];

    console.log("d1", d1);

    const handledeletecarton = async (item) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            let yno = await AsyncStorage.getItem('yno');
            const payloadObj = {
                cartonno: item.cartonNo,
                srno: item.SrNo,
                subsrno: item.SubSr,
                uid: item.UId,
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                txntype: 'beam_weft_issue',
            };
            console.log("delete payload", payloadObj);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const response = await axios.post(`${API}/api/delete_creel_single_data`, payloadObj, { headers });

            console.log("delete response", response);

            if (response.data.success === true) {
                setDataSaved(true);
                setSuccessMessage('Data deleted Successfully ✅');
                setdeleteShowSuccess(true);
                // resetAllFields();

            }
            else {
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

    const confirmcartondelete = (item) => {
        Alert.alert(
            "Delete Creel",
            `Are you sure you want to delete this Carton ${item.cartonNo}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => handledeletecarton(item)
                }
            ]
        );
    };

    const handleDelete = (index) => {
        Alert.alert(
            "Delete",
            "Are you sure you want to remove this carton?",
            [
                { text: "Cancel" },
                {
                    text: "Delete",
                    onPress: () => {
                        const updatedList = [...cartonSummary];
                        updatedList.splice(index, 1);
                        setCartonSummary(updatedList);
                    },
                    style: "destructive"
                }
            ]
        );
    };


    return (
        <>
            <Modal visible={isVisible} animationType="slide">
                <View style={styles.container}>


                    {showSuccess && (
                        <View style={styles.overlayContainer1}>
                            <View style={styles.overlayCardNew}>

                                {/* ✅ ICON */}
                                <View style={styles.successIcon}>
                                    <Text style={{ fontSize: 28 }}>✅</Text>
                                </View>

                                {/* ✅ MESSAGE */}
                                <Text style={styles.successTitle}>
                                    Success
                                </Text>

                                <Text style={styles.successMessage}>
                                    {successMessage}
                                </Text>

                                {/* ✅ BUTTON */}
                                <TouchableOpacity
                                    style={styles.okButton}
                                    // onPress={() => {
                                    //     setShowSuccess(false);
                                    //     resetAllFields();
                                    //     onClose();
                                    // }}
                                    onPress={() => {
                                        setShowSuccess(false);
                                        resetAllData();

                                        closeAllDrawers();
                                        fetchbrowse();  // 🔥 sab band
                                    }}
                                >
                                    <Text style={styles.okButtonText}>OK</Text>
                                </TouchableOpacity>

                            </View>
                        </View>
                    )}

                    {deleteshowSuccess && (
                        <View style={styles.overlayContainer1}>
                            <View style={styles.overlayCardNew}>

                                {/* ✅ ICON */}
                                <View style={styles.successIcon}>
                                    <Text style={{ fontSize: 28 }}>✅</Text>
                                </View>

                                {/* ✅ MESSAGE */}
                                <Text style={styles.successTitle}>
                                    Success
                                </Text>

                                <Text style={styles.successMessage}>
                                    {successMessage}
                                </Text>

                                {/* ✅ BUTTON */}
                                <TouchableOpacity
                                    style={styles.okButton}
                                    // onPress={() => {
                                    //     setShowSuccess(false);
                                    //     resetAllFields();
                                    //     onClose();
                                    // }}
                                    onPress={() => {
                                        setdeleteShowSuccess(false);
                                        resetAllData();

                                        // closeAllDrawers();
                                        // fetchbrowse();  // 🔥 sab band
                                    }}
                                >
                                    <Text style={styles.okButtonText}>OK</Text>
                                </TouchableOpacity>

                            </View>
                        </View>
                    )}

                    {/* HEADER */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={onClose}>
                            <Icon name="arrow-back" size={22} color="#fff" />
                        </TouchableOpacity>

                        <View>
                            <Text style={styles.headerTitle}>Weft Issue Entry</Text>
                            <Text style={styles.headerSub}>Scan / Search Carton</Text>
                        </View>
                    </View>

                    {/* SEGMENT */}


                    {!showList ? (
                        <>
                            <View style={styles.segment}>
                                <TouchableOpacity
                                    style={[styles.segmentBtn, !showManualSearch && styles.segmentActive]}
                                    onPress={() => {
                                        setShowManualSearch(false);
                                        setIsScanning(true); // 🔥 direct camera open
                                    }}
                                >
                                    <View style={styles.segmentInner}>
                                        <Icon
                                            name="qr-code-scanner"
                                            size={18}
                                            color={!showManualSearch ? "#fff" : "#007EA7"}
                                        />
                                        <Text style={[
                                            styles.segmentText,
                                            !showManualSearch && styles.segmentTextActive
                                        ]}>
                                            Scan
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.segmentBtn, showManualSearch && styles.segmentActive]}
                                    onPress={() => setShowManualSearch(true)}
                                >
                                    <View style={styles.segmentInner}>
                                        <Icon
                                            name="search"
                                            size={18}
                                            color={showManualSearch ? "#fff" : "#007EA7"}
                                        />
                                        <Text style={[
                                            styles.segmentText,
                                            showManualSearch && styles.segmentTextActive
                                        ]}>
                                            Manual
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {showManualSearch && (
                                <View style={styles.overlayContainer}>
                                    <View style={styles.overlayCard}>
                                        <Text style={styles.label}>Search Carton</Text>
                                        <View style={styles.searchRow}>
                                            <TextInput
                                                placeholder="Enter carton no"
                                                value={searchText}
                                                onChangeText={setSearchText}
                                                style={styles.searchInput}
                                            />
                                            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                                                <Icon name="search" size={20} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                        {isLoading && (
                                            <ActivityIndicator
                                                style={{ marginTop: 10 }}
                                                size="small"
                                                color="#0f766e"
                                            />
                                        )}
                                        {searchResults.length > 0 && (
                                            <FlatList
                                                data={searchResults}
                                                keyExtractor={(item, index) => index.toString()}
                                                style={{ marginTop: 10, maxHeight: 200 }}
                                                showsVerticalScrollIndicator={false}
                                                // renderItem={({ item }) => (
                                                //     <TouchableOpacity
                                                //         style={styles.resultItem}
                                                //         onPress={() => {
                                                //             setSelectedItem(item);
                                                //             setCartonNo(item.CartNo);
                                                //             setchees(item.Chees || '0');
                                                //             setavgwt(item.Wt || '0');
                                                //         }}
                                                //     >
                                                //         <View>
                                                //             <Text style={styles.resultTitle}>{item.CartNo}</Text>
                                                //             <Text style={styles.resultSub}>
                                                //                 Chees: {item.Chees}
                                                //             </Text>
                                                //             <Text style={styles.resultSub}>
                                                //                 {item.ItmName} / {item.MerName} / {item.ShdName}
                                                //             </Text>
                                                //         </View>
                                                //     </TouchableOpacity>
                                                // )}
                                                renderItem={({ item }) => {
                                                    const isSelected = selectedItem?.CartNo === item.CartNo;

                                                    return (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.resultItem,
                                                                isSelected && styles.selectedItem   // 🔥 highlight
                                                            ]}
                                                            onPress={() => {
                                                                setSelectedItem(item);
                                                                setCartonNo(item.CartNo);
                                                                setchees(item.Chees || '0');
                                                                setavgwt(item.Wt || '0');
                                                            }}
                                                        >
                                                            <View>
                                                                <Text style={styles.resultTitle}>{item.CartNo}</Text>

                                                                <Text style={styles.resultSub}>
                                                                    Chees: {item.Chees}
                                                                </Text>

                                                                <Text style={styles.resultSub}>
                                                                    {item.ItmName} / {item.MerName} / {item.ShdName}
                                                                </Text>
                                                            </View>
                                                        </TouchableOpacity>
                                                    );
                                                }}
                                            />
                                        )}
                                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                            <TouchableOpacity
                                                style={[styles.primaryBtn, { flex: 1 }]}
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
                                                        SrNo: selectedItem.SrNo,
                                                    };
                                                    setCartonNo(data.CartNo || '');
                                                    setchees(data.Chees || '');
                                                    setavgwt(data.Wt || '');
                                                    setScannedObj(data);
                                                    setShowManualSearch(null);
                                                    setSearchText('');
                                                    setSearchResults([]);
                                                    setSelectedItem(null);
                                                }}
                                            >
                                                <Text style={styles.primaryText}>OK</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.secondaryBtn, { flex: 1 }]}
                                                onPress={() => {
                                                    setSelectedItem(null);
                                                    setSearchResults([]);
                                                    setSearchText('');
                                                    setShowManualSearch(null);
                                                }}
                                            >
                                                <Text style={styles.secondaryText}>Close</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {isScanning && (
                                <Modal animationType="fade">
                                    <View style={{ flex: 1, backgroundColor: '#000' }}>
                                        <View style={styles.cameraHeader}>
                                            <Text style={styles.cameraTitle}>Scan QR Code</Text>

                                            <View style={{ width: 26 }} />
                                        </View>
                                        <View style={styles.cameraContainer}>
                                            {device && hasPermission && (
                                                <Camera
                                                    style={styles.camera}
                                                    device={device}
                                                    isActive={true}
                                                    codeScanner={codeScanner}
                                                />
                                            )}
                                            <View style={styles.overlay}>
                                                <View style={styles.scanBox} />
                                            </View>
                                        </View>
                                        <View style={styles.cameraFooter}>
                                            <TouchableOpacity
                                                style={styles.closeScanBtn}
                                                onPress={() => setIsScanning(false)}
                                            >
                                                <Text style={styles.closeScanText}>Close Scanner</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </Modal>
                            )}

                            <ScrollView
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            >
                                {cartonSummary.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.viewListBtn}
                                        onPress={() => setShowList(true)}
                                    >
                                        <Text style={styles.viewListText}>
                                            📋 View Cartons ({cartonSummary.length})
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                <View style={styles.card}>
                                    <Text style={styles.cardTitle}>Carton Details</Text>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Carton Number</Text>
                                        <TextInput
                                            style={styles.inputDisabled}
                                            value={CartonNo}
                                            editable={false}
                                        />
                                    </View>
                                    <View style={styles.row}>
                                        <View style={styles.fieldHalf}>
                                            <Text style={styles.label}>Chees</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={getchees}
                                                onChangeText={setchees}
                                                keyboardType="numeric"
                                            />
                                        </View>

                                        <View style={styles.fieldHalf}>
                                            <Text style={styles.label}>Quantity</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={getavgwt}
                                                onChangeText={setavgwt}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Item</Text>
                                        <TextInput
                                            style={styles.inputDisabled}
                                            value={getScannedObj?.ItmName || ''}
                                            editable={false}
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Merge</Text>
                                        <TextInput
                                            style={styles.inputDisabled}
                                            value={getScannedObj?.MerName || ''}
                                            editable={false}
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Shade</Text>
                                        <TextInput
                                            style={styles.inputDisabled}
                                            value={getScannedObj?.ShdName || ''}
                                            editable={false}
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Grade</Text>
                                        <TextInput
                                            style={styles.inputDisabled}
                                            value={getScannedObj?.GrdName || ''}
                                            editable={false}
                                        />
                                    </View>

                                </View>
                                <View style={styles.bottomBar}>
                                    <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
                                        <Text style={styles.secondaryText}>Close</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.primaryBtn} onPress={handleAddCarton}>
                                        <Text style={styles.primaryText}>Submit</Text>
                                    </TouchableOpacity>
                                </View>

                            </ScrollView>
                        </>
                    ) : (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>
                                Yarn Issuance Summary ({cartonSummary.length})
                            </Text>
                            {/* <FlatList
                                data={cartonSummary}
                                keyExtractor={(item, index) => index.toString()}
                                contentContainerStyle={{ paddingBottom: 10 }}
                                renderItem={({ item, index }) => (
                                    <View style={styles.listCard}>
                                        <View style={styles.leftSection}>
                                            <View style={styles.indexCircle}>
                                                <Text style={styles.indexText}>{index + 1}</Text>
                                            </View>

                                            <View>
                                                <Text style={styles.cartonNo}>
                                                    {item.cartonNo}
                                                </Text>
                                                <Text style={styles.subText}>
                                                    {item.ItmName} / {item.MerName}
                                                </Text>
                                                <Text style={styles.subText}>
                                                    {item.ShdName} / {item.GrdName}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.rightSection}>
                                            <TouchableOpacity
                                                style={styles.deleteIcon}
                                                onPress={() => {
                                                    if (item?.UId) {
                                                        confirmcartondelete(item);
                                                    } else {
                                                        handleDelete(index);
                                                    }
                                                }}
                                            >
                                                <Text style={{ fontSize: 16 }}>🗑️</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.qtyText}>
                                                Qty: {item.qty}
                                            </Text>

                                            <Text style={styles.cheesText}>
                                                Chees: {item.chees}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            /> */}

                            <ScrollView
                                style={{ maxHeight: 450 }}   // 🔥 IMPORTANT (adjust as needed)
                                contentContainerStyle={{ paddingBottom: 10 }}
                                showsVerticalScrollIndicator={false}
                            >
                                {cartonSummary.map((item, index) => (
                                    <View style={styles.listCard}>
                                        <View style={styles.leftSection}>
                                            <View style={styles.indexCircle}>
                                                <Text style={styles.indexText}>{index + 1}</Text>
                                            </View>

                                            <View>
                                                <Text style={styles.cartonNo}>
                                                    {item.cartonNo}
                                                </Text>
                                                <Text style={styles.subText}>
                                                    {item.ItmName} / {item.MerName}
                                                </Text>
                                                <Text style={styles.subText}>
                                                    {item.ShdName} / {item.GrdName}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.rightSection}>
                                            <TouchableOpacity
                                                style={styles.deleteIcon}
                                                onPress={() => {
                                                    if (item?.UId) {
                                                        confirmcartondelete(item);
                                                    } else {
                                                        handleDelete(index);
                                                    }
                                                }}
                                            >
                                                <Text style={{ fontSize: 16 }}>🗑️</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.qtyText}>
                                                Qty: {item.qty}
                                            </Text>

                                            <Text style={styles.cheesText}>
                                                Chees: {item.chees}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>

                            <View style={styles.summaryBar}>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Items</Text>
                                    <Text style={styles.summaryValue}>
                                        {cartonSummary.length}
                                    </Text>
                                </View>

                                <View style={styles.divider} />
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Total Qty</Text>
                                    <Text style={styles.summaryValue}>
                                        {/* {cartonSummary.reduce((sum, item) => sum + Number(item.qty || 0), 0)} */}
                                        {cartonSummary
                                            .reduce((sum, item) => sum + Number(item.qty || 0), 0)
                                            .toFixed(3)
                                        }
                                    </Text>
                                </View>

                            </View>

                            {/* <TouchableOpacity style={styles.addMoreBtn} onPress={() => setShowList(false)}>
                                <Text style={styles.addMoreText}>＋ Add More</Text>
                            </TouchableOpacity> */}


                            <View style={styles.bottomRow}>
                                <TouchableOpacity
                                    style={styles.backBtn1}
                                    onPress={() => setShowList(false)}
                                >
                                    <Text style={styles.backText}>＋ Add More</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.submitBtn}
                                    // onPress={() => handleFinalSubmit}
                                    onPress={handleFinalSubmit}
                                // onPress={handleaddCreel}
                                >
                                    <Text style={styles.submitText}>✈ Submit All</Text>
                                </TouchableOpacity>
                            </View>

                        </View>

                    )}

                </View>
            </Modal >

        </>
    );
};



export default WeftIssueItemDrawer;
