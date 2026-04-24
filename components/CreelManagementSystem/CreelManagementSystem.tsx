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
        { stktypename: 'In house', stktype: 'I' },
        { stktypename: 'Process house', stktype: 'P' }
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
    const [FormState, setFormState] = useState({
        values: {
            PrpCode: '',
            YearNo: '',
            fromdate: '',
            todate: '',
            status: 'P',
            LngName: '',
            YearName: '',
        }
    })
    const [getAllYearData, setAllYearData] = useState([]);
    const [activeCreels, setActiveCreels] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedCreel, setSelectedCreel] = useState(null);
    const [mainUId, setMainUId] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [propertydata, setpropertydata] = useState<ExeData[]>([]);
    const screenWidth = Dimensions.get('window').width;
    const selectedProperty = getAllPropertyData?.find((p) => p.PrpCode == FormState.values.PrpCode) || null;

    const styles = StyleSheet.create({
        modalWrapper: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center'
        },

        modalContainer: {
            width: '100%',
            height: '100%',
            backgroundColor: '#f5f7fb',
            borderRadius: 15,
            overflow: 'hidden'
        },
        container: {
            flex: 1,
            backgroundColor: '#f5f7fb'
        },

        headerBox: {
            backgroundColor: '#007EA7',
            padding: 15,
            borderBottomLeftRadius: 15,
            borderBottomRightRadius: 15
        },

        headerTitle: {
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold'
        },

        headerSub: {
            color: '#e0f7ff',
            fontSize: 13
        },

        card: {
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 15,
            elevation: 3
        },

        title: {
            fontSize: 17,
            fontWeight: 'bold',
            marginBottom: 15,
            textAlign: 'center',
            color: '#000',
        },

        inputGroup: {
            marginBottom: 12
        },

        label: {
            fontSize: 13,
            marginBottom: 5,
            fontWeight: 'bold',
            color: '#000'
        },

        input: {
            backgroundColor: '#f1f3f6',
            borderRadius: 8,
            paddingHorizontal: 10,
            justifyContent: 'center',
            height: 45
        },

        row: {
            flexDirection: 'row',
            gap: 10
        },

        col: {
            flex: 1
        },

        footer: {
            flexDirection: 'row',
            gap: 10,
            marginTop: 15
        },

        saveBtn: {
            flex: 1,
            backgroundColor: '#007EA7',
            padding: 14,
            borderRadius: 10,
            alignItems: 'center'
        },

        cancelBtn: {
            flex: 1,
            backgroundColor: '#ddd',
            padding: 14,
            borderRadius: 10,
            alignItems: 'center'
        },

        btnText: {
            color: '#fff',
            fontWeight: 'bold'
        },

        cancelText: {
            fontWeight: 'bold'
        },
        headerText: {
            fontSize: 15,
            fontWeight: 'bold',
            color: '#007EA7'
        },
        headerSubText: {
            fontSize: 13,
            color: '#000',
            marginTop: 2
        },
        halfInput: {
            width: '48%',
        },

        fullInput: {
            width: '100%',
        },
        inputDisabled: {
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 6,
            padding: 10,
            backgroundColor: '#f2f2f2',
            height: 35,      // 👈 add this
            justifyContent: 'center',
            color: '#000'
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
            backgroundColor: '#E3F2FD',
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 6,
            marginBottom: 0,
            marginTop: 15
        },

        sectionTitle: {
            fontSize: 15,
            fontWeight: 'bold',
            color: '#007EA7',
        },

        smallInput: {
            width: '30%',
        },

        largeInput: {
            width: '68%',
        },

        summaryCard: {
            margin: 0,
            padding: 12,
            backgroundColor: '#fff',
            borderRadius: 12,
            elevation: 3,
            width: '100%'
        },

        summaryTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: '#000'
        },

        summarySub: {
            fontSize: 12,
            color: '#666',
            marginBottom: 8
        },

        cardRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderColor: '#eee'
        },

        leftBox: {
            flex: 1,
            paddingRight: 10
        },

        cartonNo: {
            fontSize: 13,
            fontWeight: '700',
            color: '#007EA7'
        },

        itemText: {
            fontSize: 13,
            color: '#000',
            marginTop: 2
        },

        subText: {
            fontSize: 11,
            color: '#777',
            marginTop: 2
        },

        rightBox: {
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 2
        },

        qtyText: {
            fontSize: 14,
            fontWeight: '700',
            color: '#000'
        },

        cheesText: {
            fontSize: 12,
            color: '#555'
        },

        // deleteBtn: {
        //     marginTop: 4
        // },
        tableHeader: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderColor: '#ddd',
            paddingBottom: 2,
            marginBottom: 2
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
            alignItems: 'center',
            marginTop: 4
        },
        deleteText: {
            color: 'red',
            fontWeight: 'bold'
        },
        creelCard: {
            borderRadius: 16,
            padding: 14,
            elevation: 3, // Android shadow
            shadowColor: '#000', // iOS shadow
            shadowOpacity: 0.1,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            backgroundColor: '#ffffff',
        },

        rowBetween: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },

        creelTitle: {
            fontSize: 14,
            fontWeight: 'bold', // 🔥 keep bold
            color: '#1a1a1a',
        },

        labelSmall: {
            fontSize: 12,
            color: '#555',
            fontWeight: '600',
        },

        valueSmall: {
            fontSize: 12,
            fontWeight: 'bold',
            color: '#222',
        },

        qtyBig: {
            fontSize: 11,
            fontWeight: 'bold',
            color: '#000',
        },

        statusBadge: {
            backgroundColor: '#ffffff90',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
        },

        badgeText: {
            fontSize: 12,
            fontWeight: 'bold',
            color: '#333',
        },

        // creelTitle: {
        //     fontSize: 14,
        //     fontWeight: 'bold',
        //     marginRight: 8,
        //     marginBottom: 5
        // },

        badge: {
            backgroundColor: '#E3F2FD',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10
        },
        // badgeText: {
        //     fontSize: 12,
        //     color: '#007EA7',
        //     fontWeight: 'bold'
        // },
        // labelSmall: {
        //     fontSize: 13,
        //     color: '#777',
        //     // marginTop: 5,
        //     fontWeight: 'bold'
        // },
        // valueSmall: {
        //     fontSize: 13,
        //     // fontWeight: '500',
        //     flexShrink: 1
        // },
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
            fontWeight: '600',
            color: '#000'
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
            borderTopRightRadius: 20,
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
        // qtyBig: {
        //     fontSize: 11,
        // },

        topSwitchContainer: {
            flexDirection: 'row',
            margin: 4,
            gap: 10
        },

        switchCard: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#007EA7',
            backgroundColor: '#fff',
            elevation: 3
        },

        activeCard: {
            backgroundColor: '#007EA7'
        },

        switchText: {
            fontSize: 14,
            fontWeight: '600',
            color: '#007EA7'
        },

        activeText: {
            color: '#fff'
        },

        /* Manual Card */
        manualCard: {
            margin: 12,
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 12,
            elevation: 5
        },

        searchInput: {
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            paddingHorizontal: 10,
            height: 40,
            color: '#000'
        },

        searchBtn: {
            backgroundColor: '#007EA7',
            height: 40,
            width: 40,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center'
        },

        resultItem: {
            padding: 8,
            borderBottomWidth: 1,
            borderColor: '#eee'
        },

        selectedItem: {
            backgroundColor: '#e6f7ff'
        },

        cartNo: {
            fontSize: 13,
            fontWeight: 'bold',
            color: '#000'
        },

        cartDetail: {
            fontSize: 11,
            color: '#555'
        },

        /* Scanner */
        scannerCard: {
            margin: 6,
            paddingVertical: 10,   // 👈 pehle 16 tha → kam kar diya
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: '#fff',
            alignItems: 'center',   // 👈 center same rakha
            justifyContent: 'center',
            elevation: 3,
            minHeight: 80           // 👈 control height
        },

        scanTitle: {
            fontSize: 16,           // 👈 thoda chhota
            fontWeight: '600',
            color: '#000',
            marginVertical: 4
        },

        scanBtn: {
            backgroundColor: '#007EA7',
            paddingVertical: 8,     // 👈 chhota button
            paddingHorizontal: 16,
            borderRadius: 10,
            marginTop: 6
        },
        /* Buttons */
        okBtn: {
            backgroundColor: '#007EA7',
            padding: 10,
            borderRadius: 8,
            alignItems: 'center'
        },

        cancelBtn2: {
            backgroundColor: '#999',
            padding: 10,
            borderRadius: 8,
            alignItems: 'center'
        },

        btnTextWhite: {
            color: '#fff',
            fontWeight: '600'
        },

        /* Camera */
        cameraContainer: {
            height: 250,
            margin: 12,
            borderRadius: 12,
            overflow: 'hidden'
        },
        camera: {
            flex: 1
        },
        overlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center'
        },
        scanBox: {
            width: 200,
            height: 200,
            borderWidth: 2,
            borderColor: '#00ffcc'
        },
        bottomBtnContainer: {
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 20,
            gap: 12   // 👈 rows ke beech space
        },

        btnRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 10   // 👈 buttons ke beech gap
        },

        primaryBtn: {
            flex: 1,
            backgroundColor: '#007EA7',
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 3,

            // iOS shadow
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 }
        },

        secondaryBtn: {
            flex: 1,
            backgroundColor: '#999',
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center'
        },
        headerRow: {
            flexDirection: 'row',
            backgroundColor: '#007EA7',
            paddingVertical: 8,
            overflow: 'scroll'
        },

        header: {
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 13,
            textAlign: 'center',
        },

        row1: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderColor: '#eee',
            paddingVertical: 8,
        },

        cell: {
            fontSize: 12,
            color: '#333',
            textAlign: 'center',
        },

        cellView: {
            justifyContent: 'center',
            alignItems: 'center',
        }
    });

    let cancelToken: any;

    // console.log("Carton SUmmary", cartonSummary);
    // console.log("activeCreels", activeCreels)
    // console.log("status", FormState.values.status);
    // console.log("status...", FormState.values);
    // console.log("Stock Types:", getStockTypes);
    console.log("prptype", propertydata);

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

    const handleLoadPress = () => {
        const { PrpCode, YearNo, fromdate, todate } = FormState.values;
        if (!PrpCode || !YearNo) {
            Alert.alert("Validation", "Please select Property and Year");
            return;
        }
        const yearNo = parseInt(YearNo);

        const startYear = 2000 + yearNo - 1;
        const endYear = 2000 + yearNo;

        const fyStart = new Date(startYear, 3, 1);
        const fyEnd = new Date(endYear, 2, 31, 23, 59, 59);

        const from = parseDate(fromdate);
        const to = parseDate(todate);

        // console.log("from:", from);
        // console.log("to:", to);
        // console.log("fyStart:", fyStart);
        // console.log("fyEnd:", fyEnd);

        if (from < fyStart || to > fyEnd) {
            Alert.alert(
                "Validation",
                `Date must be between ${fyStart.toLocaleDateString()} and ${fyEnd.toLocaleDateString()}`
            );
            return;
        }

        if (from > to) {
            Alert.alert("Validation", "From Date cannot be greater than To Date");
            return;
        }
        fetchBrowseData();
        // console.log("Selected 👉", FormState.values);
        setIsDrawerVisible(false);
    };

    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2);
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

        const userPtype = await AsyncStorage.getItem('user_prptype');
        // const selectedProperty = await AsyncStorage.getItem('selected_property');
        // let finalPrptype = userPtype;
        // if (selectedProperty === 'sudamo_knits') {
        //     finalPrptype = 'S';
        // } else if (selectedProperty === 'rayons') {
        //     finalPrptype = 'R';
        // }

        try {
            const params = {
                prpcode: FormState.values.PrpCode || '',
                prptype: userPtype,
                strcode: '002',
                txntype: 'creel_yarn_issue',
                yearno: FormState.values.YearNo || getCurrentFinancialYear(),
                // yearno: '26',
                fromdate: FormState.values.fromdate || '',
                todate: FormState.values.todate || '',
                status: FormState.values.status || '',

            };

            const response = await axios.post(`${API}/api/get_yarn_issue_browse`, params, { headers });

            console.log("browse response", response)
            console.log("browse payload", params)

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
                // console.log("Request cancelled");
            } else {
                console.log("API Error:", error);
                // Alert.alert('Error while searching');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusFromQty = (qty) => {
        const parsedQty = parseFloat(qty || 0);
        return parsedQty === 0 ? 'Complete' : 'Pending';
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
                uid: item.UId,
                prpcode: FormState.values.PrpCode,
                strcode: '002',
                yearno: FormState.values.YearNo,
                txntype: 'creel_yarn_issue',
            };
            console.log("show Payload:", payload);
            const response = await axios.post(
                `${API}/api/get_yarn_issue_show`,
                payload,
                { headers }
            );

            console.log("show response", response);

            if (response?.data?.success) {

                const resData = response.data.response;

                const d1 = resData.d1 || [];
                const d2 = resData.d2 || [];

                const mainData = resData.main || [];
                if (mainData.length > 0) {
                    setCreelId(mainData[0].BatchNo || '');
                }

                // const mappedData = d2.map(d2Item => {
                //     const d1Item = d1.find(
                //         x => String(x.SrNo) === String(d2Item.SrNo)
                //     ) || {};

                const d1Map = {};
                d1.forEach(item => {
                    d1Map[String(item.SrNo)] = item;
                });

                const mappedData = d2
                    .filter(d2Item => d1Map[String(d2Item.SrNo)])
                    .map(d2Item => {
                        const d1Item = d1Map[String(d2Item.SrNo)];

                        return {
                            cartonNo: d2Item.CartNo || '',
                            qty: d2Item.Qty || '',
                            chees: d2Item.Chees || '',

                            PUId: d2Item.PUId || '',
                            PSrNo: d2Item.PSrNo || '',
                            PSubSr: d2Item.PSubSr || '',
                            TranType: d2Item.TranType || '',
                            d2SrNo: String(d2Item.SrNo || ''),

                            ItmCode: d1Item.ItmCode || '',
                            ItmName: d1Item.ItmName || '',
                            MerCode: d1Item.MerCode || '',
                            MerName: d1Item.MerName || '',
                            GrdCode: d1Item.GrdCode || '',
                            GrdName: d1Item.GrdName || '',
                            ShdCode: d1Item.ShdCode || '',
                            ShdName: d1Item.ShdName || '',
                            Denier: d1Item.Denier || '',
                            d1SrNo: String(d1Item.SrNo || ''),
                            UId: d1Item.UId || '',
                            yearNo: FormState.values.YearNo || ''
                        };
                    });

                setCartonSummary(mappedData);

                console.log("mappedData", mappedData, cartonSummary);

                // setCartonSummary(mappedData);
                setSelectedCreel(payload);
                // setSelectedCreel({
                //     UId: item.UId
                // });
                setIsEditMode(true);
                setMainUId(item.UId);
                setIsCreelModalVisible(false);
                setIsScanModalVisible(true);

            } else {
                Alert.alert("Error", "No data found");
            }

        } catch (error) {
            if (axios.isCancel(error)) {
                // console.log("Request cancelled");
            } else {
                console.log("API Error:", error);
                // Alert.alert("Error while processing");
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
                // console.log("Request cancelled");
            } else {
                // console.log("API Error:", error);
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
            UId: mainUId?.UId,
        };
        setCartonSummary(prev => [...prev, newCarton]);
        setCartonNo('');
        setchees('');
        setavgwt('');
        setSearchResults({});
        setScannedObj({});
    };

    {
        (!device || !hasPermission) && (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Text>No camera permission or device not available</Text>
            </View>
        )
    }

    const handleFinalSubmit = () => {
        if (isEditMode) {
            handleSubmitScan();
        } else {
            handleaddCreel();
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

    const handleSubmitScan = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            let yno = await AsyncStorage.getItem('yno');
            const payloadObj = {
                PrpCode: FormState.values.PrpCode,
                YearNo: FormState.values.YearNo,
                txntype: 'creel_yarn_issue',
                CreelId: creelId,
                // setupDate: setupDate,
                SetupDate: setupDate.toISOString().split('T')[0],
                Shift: shift,
                Remark: Remark || '',
                StkType: stocktype || '',
                uid: mainUId || '',
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
                    Qty: ''
                }))
            };

            console.log("payload", payloadObj);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/modify_creel_data`, payloadObj, { headers });
            console.log("response", response);

            if (response.data.success === true) {
                setDataSaved(true);

                // ✅ Snackbar REMOVE → Modal use karo
                setSuccessMessage('Data Updated Successfully ✅');
                setShowSuccess(true);

            }
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
            // } else {
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

            // if (response.data.success === true) {
            //     setDataSaved(true);
            //     setSuccessMessage('Data Saved Successfully ✅');
            //     setShowSuccess(true);
            //     setIsScanModalVisible(false);
            //     setIsCreelModalVisible(false);
            //     setCreelId('');
            //     setShift('');
            //     setRemark('');
            //     setstocktype('');
            //     setSetupDate(new Date());

            //     setFormState({
            //         values: {
            //             PrpCode: '',
            //             YearNo: '',
            //             LngName: '',
            //             YearName: ''
            //         }
            //     });
            //     setCartonSummary([]);
            //     setCartonNo('');
            //     setchees('');
            //     setavgwt('');
            //     setScannedObj({});
            //     setSearchText('');
            //     setSearchResults([]);
            //     setSelectedItem(null);
            //     setShowManualSearch(null);
            //     setIsScanning(false);
            // }

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

    const handleaddCreel = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            let yno = await AsyncStorage.getItem('yno');
            const payloadObj = {
                PrpCode: FormState.values.PrpCode,
                YearNo: FormState.values.YearNo,
                txntype: 'creel_yarn_issue',
                CreelId: creelId,
                // setupDate: setupDate,
                SetupDate: setupDate.toISOString().split('T')[0],
                Shift: shift,
                Remark: Remark || '',
                StkType: stocktype || '',
                uid: mainUId || '',
                Cartons: cartonSummary.map(item => ({
                    uid: item.UId || mainUId || '',
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
                    SrNo: item.SrNo || ''
                }))
            };

            console.log("payload", payloadObj);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/add_creel_data`, payloadObj, { headers });
            console.log("response", response);

            if (response.data.success === true) {
                setDataSaved(true);

                // ✅ Snackbar REMOVE → Modal use karo
                setSuccessMessage('Data Saved Successfully ✅');
                setShowSuccess(true);

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

    // useEffect(() => {
    //     if (!isScanModalVisible) {
    //         fetchBrowseData();
    //     }
    // }, [isScanModalVisible]);

    const resetAllFields = () => {
        // Creel modal fields
        setCreelId('');
        setShift('');
        setstocktype('');
        setRemark('');
        setShowPicker(false);
        setSetupDate(null);

        setFormState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                PrpCode: '',
                LngName: '',
                YearNo: '',
                YearName: '',
                Shift: '',
                ShiftName: '',
                stocktype: '',
                StockTypeName: ''
            }
        }));

        // Scan modal fields
        setCartonNo('');
        setchees('');
        setavgwt('');
        setScannedObj({});
        setCartonSummary([]);
        setSearchText('');
        setSearchResults([]);
        setSelectedItem(null);
        setShowManualSearch(null);
        setIsScanning(false);
    };

    const onChange = (event, selectedDate) => {
        setShowPicker(false);
        if (selectedDate) {
            setSetupDate(selectedDate);
        }
    };

    const selectedYearObj = getAllYearData?.find(
        (y) => y.YearNo == FormState.values.YearNo
    ) || null;

    return (
        <>
            {isLoading && <FullScreenLoader />}
            <HeaderBarwithBack
                userName={username}
                header={'Creel Managment System'}
            />
            <View style={checkingScannerStyles.flexContainer}>

                {/* creel modal show staert here */}
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
                        marginTop: 0,
                    }}
                >
                    <Icon
                        name="add"
                        size={18}
                        color="#fff"
                        style={{ marginRight: 0 }}
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
                        marginTop: 0,
                    }}
                >
                    <Text style={{ color: '#070000', fontWeight: 'bold' }}>
                        Active Creels
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 10, flex: 1 }}>
                <FlatList
                    data={activeCreels}
                    keyExtractor={(item, index) => index.toString()}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => {

                        const status = getStatusFromQty(item.CreelQty);

                        return (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => handleViewClick(item)}
                                style={{ marginBottom: 12 }}
                            >
                                <View style={styles.creelCard}>

                                    {/* HEADER */}
                                    <View style={styles.rowBetween}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.creelTitle}>Creel ID : </Text>
                                            <Text style={styles.creelTitle}>{item.CreelId}</Text>
                                        </View>

                                        <View style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor: status === 'Pending' ? '#FFF3E0' : '#E8F5E9',
                                                borderColor: status === 'Pending' ? '#F57C00' : '#2E7D32',
                                                borderWidth: 1,
                                            },
                                        ]}>
                                            <Text style={[
                                                styles.badgeText,
                                                {
                                                    color: status === 'Pending' ? '#F57C00' : '#2E7D32',
                                                },
                                            ]}>
                                                {/* {getStatusFromQty(item.CreelQty)} */}
                                                {status}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* DATE + SHIFT */}
                                    {/* <View style={[styles.rowBetween, { marginTop: 8 }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.labelSmall}>Date :</Text>
                                            <Text style={styles.valueSmall} numberOfLines={1}>
                                                {item.IssDate}
                                            </Text>
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.labelSmall}>Shift :</Text>
                                            <Text style={styles.valueSmall}>
                                                {item.Shift}
                                            </Text>
                                        </View>
                                    </View> */}

                                    {/* QTY */}
                                    {/* <View style={{ marginTop: 12 }}>
                                        <Text style={styles.labelSmall}>Creel Qty :</Text>
                                        <Text style={[
                                            styles.qtyBig,
                                            {
                                                backgroundColor: '#E3F2FD',
                                                color: '#1565C0',
                                                paddingVertical: 6,
                                                paddingHorizontal: 12,
                                                borderRadius: 10,
                                                overflow: 'hidden',
                                                alignSelf: 'flex-start',
                                                marginTop: 4,
                                            },
                                        ]}>
                                            {item.CreelQty}
                                        </Text>
                                    </View> */}

                                    <View style={{ marginTop: 8 }}>

                                        {/* DATE */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                            <Text style={styles.labelSmall}>Date : </Text>
                                            <Text style={styles.valueSmall} numberOfLines={1}>
                                                {item.IssDate}
                                            </Text>
                                        </View>

                                        {/* SHIFT */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.labelSmall}>Shift : </Text>
                                            <Text style={styles.valueSmall}>
                                                {item.Shift}
                                            </Text>
                                        </View>

                                    </View>

                                    {/* QTY */}
                                    <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.labelSmall}>Creel Qty : </Text>

                                        <Text
                                            style={[
                                                styles.qtyBig,
                                                {
                                                    backgroundColor: '#E3F2FD',
                                                    color: '#1565C0',
                                                    paddingVertical: 4,
                                                    paddingHorizontal: 10,
                                                    borderRadius: 8,
                                                    overflow: 'hidden',
                                                },
                                            ]}
                                        >
                                            {item.CreelQty}
                                        </Text>
                                    </View>

                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>
            {/* creel modal show over */}

            {/* creel add modal start here */}
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
                        <View style={styles.container}>
                            <FlatList
                                data={[1]}
                                keyExtractor={(item, index) => index.toString()}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ padding: 12, paddingBottom: 30 }}

                                ListHeaderComponent={
                                    <View style={styles.card}>

                                        <Text style={styles.title}>
                                            Create New Creel
                                        </Text>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Property <Text style={{ color: 'red' }}> *</Text></Text>
                                            <SearchableDropdown
                                                key={FormState.values.PrpCode}
                                                data={getAllPropertyData || []}
                                                labelKey="LngName"
                                                valueKey="PrpCode"
                                                placeholder="Choose property..."
                                                pageSize={10}
                                                initialValue={selectedProperty}
                                                onSelect={(item) => {
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        values: {
                                                            ...prev.values,
                                                            PrpCode: item?.PrpCode || '',
                                                            LngName: item?.LngName || ''
                                                        }
                                                    }));
                                                }}
                                                multiple={false}
                                                emptyMessage="No properties available"
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Year No <Text style={{ color: 'red' }}> *</Text></Text>
                                            <SearchableDropdown
                                                key={FormState.values.YearNo}
                                                data={getAllYearData || []}
                                                labelKey="YearName"
                                                valueKey="YearNo"
                                                placeholder="Choose year..."
                                                pageSize={10}
                                                initialValue={selectedYearObj}
                                                onSelect={(item) => {
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        values: {
                                                            ...prev.values,
                                                            YearNo: item?.YearNo || '',
                                                            YearName: item?.YearName || ''
                                                        }
                                                    }));
                                                }}
                                                multiple={false}
                                                emptyMessage="No years data available"
                                            />
                                        </View>

                                        {/* Creel ID */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Creel ID <Text style={{ color: 'red' }}> *</Text></Text>
                                            <TextInput
                                                style={styles.input}
                                                value={creelId}
                                                onChangeText={setCreelId}
                                                placeholder="Enter Creel ID"
                                                placeholderTextColor="#888"
                                            />
                                        </View>

                                        {/* DATE + SHIFT */}
                                        <View style={styles.row}>

                                            <View style={styles.col}>
                                                <Text style={styles.label}>Setup Date <Text style={{ color: 'red' }}> *</Text></Text>
                                                <TouchableOpacity
                                                    style={styles.input}
                                                    onPress={() => setShowPicker(true)}
                                                >
                                                    <Text>
                                                        {setupDate ? setupDate.toLocaleDateString() : 'Select Date'}
                                                    </Text>
                                                </TouchableOpacity>
                                                {showPicker && (
                                                    <DateTimePicker
                                                        value={setupDate || new Date()}
                                                        mode="date"
                                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                        onChange={onChange}
                                                    />
                                                )}
                                            </View>

                                            <View style={styles.col}>
                                                <Text style={styles.label}>Shift <Text style={{ color: 'red' }}> *</Text></Text>
                                                <View style={{ flex: 1 }}>
                                                    {/* <Picker
                                                        selectedValue={shift}
                                                        onValueChange={setShift}
                                                    >
                                                        <Picker.Item label="Select" value="" />
                                                        {getShiftData.map((item, index) => (
                                                            <Picker.Item
                                                                key={index}
                                                                label={item.ShfName}
                                                                value={item.ShfCode}
                                                            />
                                                        ))}
                                                    </Picker> */}
                                                    <PartyDropdown
                                                        data={getShiftData}
                                                        placeholder="Choose shift..."
                                                        labelKey={["ShfName", "ShfCode"]}
                                                        valueKey="ShfCode"
                                                        pageSize={10}
                                                        initialValue={
                                                            getShiftData?.find(x => x.ShfCode === shift) ?? null
                                                        }
                                                        selected={
                                                            getShiftData?.find(x => x.ShfCode === shift) ?? null
                                                        }
                                                        type="shift"

                                                        onSelect={(item) => {
                                                            setShift(item.ShfCode);

                                                            // agar FormState me bhi store karna ho
                                                            setFormState(prev => ({
                                                                ...prev,
                                                                values: {
                                                                    ...prev.values,
                                                                    Shift: item.ShfCode,
                                                                    ShiftName: item.ShfName
                                                                }
                                                            }));
                                                        }}

                                                        setSelected={(val) => {
                                                            if (!val) {
                                                                setShift('');

                                                                setFormState(prev => ({
                                                                    ...prev,
                                                                    values: {
                                                                        ...prev.values,
                                                                        Shift: '',
                                                                        ShiftName: ''
                                                                    }
                                                                }));
                                                            } else {
                                                                setShift(val.ShfCode);

                                                                setFormState(prev => ({
                                                                    ...prev,
                                                                    values: {
                                                                        ...prev.values,
                                                                        Shift: val.ShfCode,
                                                                        ShiftName: val.ShfName
                                                                    }
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                </View>
                                            </View>

                                        </View>

                                        {/* STOCK TYPE */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Stock Type <Text style={{ color: 'red' }}> *</Text></Text>
                                            <View style={styles.input}>
                                                <Picker
                                                    selectedValue={stocktype}
                                                    onValueChange={setstocktype}
                                                >
                                                    <Picker.Item label="Select" value="" />
                                                    {getStockTypes.map((item, index) => (
                                                        <Picker.Item
                                                            key={index}
                                                            label={item.stktypename}
                                                            value={item.stktype}
                                                        />
                                                    ))}
                                                </Picker>

                                                {/* <PartyDropdown
                                                    data={getStockTypes}
                                                    placeholder="Choose stock type..."

                                                    // ✅ correct keys
                                                    labelKey="stktypename"   // ✅ CHANGE (array hatao)
                                                    valueKey="stktype"
                                                    initialValue={
                                                        getStockTypes?.find(x => x.stktype === stocktype) ?? null
                                                    }
                                                    selected={
                                                        getStockTypes?.find(x => x.stktype === stocktype) ?? null
                                                    }
                                                    type="stocktype"
                                                    onSelect={(item) => {
                                                        setstocktype(item.stktype);

                                                        setFormState(prev => ({
                                                            ...prev,
                                                            values: {
                                                                ...prev.values,
                                                                stocktype: item.stktype,
                                                                StockTypeName: item.stktypename
                                                            }
                                                        }));
                                                    }}

                                                    setSelected={(val) => {
                                                        if (!val) {
                                                            setstocktype('');

                                                            setFormState(prev => ({
                                                                ...prev,
                                                                values: {
                                                                    ...prev.values,
                                                                    stocktype: '',
                                                                    StockTypeName: ''
                                                                }
                                                            }));
                                                        } else {
                                                            setstocktype(val.stktype);

                                                            setFormState(prev => ({
                                                                ...prev,
                                                                values: {
                                                                    ...prev.values,
                                                                    stocktype: val.stktype,
                                                                    StockTypeName: val.stktypename
                                                                }
                                                            }));
                                                        }
                                                    }}
                                                /> */}
                                            </View>
                                        </View>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Remark</Text>
                                            <TextInput
                                                style={[styles.input, { height: 40 }]}
                                                value={Remark}
                                                onChangeText={setRemark}
                                                // multiline
                                                placeholder="Enter remark"
                                            />
                                        </View>

                                    </View>
                                }

                                ListFooterComponent={
                                    <View style={styles.footer}>
                                        <TouchableOpacity
                                            style={styles.saveBtn}
                                            onPress={() => {
                                                if (!creelId?.trim()) {
                                                    Alert.alert("Validation", "Enter Creel ID");
                                                    return;
                                                }
                                                if (!setupDate) {
                                                    Alert.alert("Validation", "Select Setup Date");
                                                    return;
                                                }
                                                if (!shift) {
                                                    Alert.alert("Validation", "Select Shift");
                                                    return;
                                                }
                                                if (!stocktype) {
                                                    Alert.alert("Validation", "Select Stock Type");
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
                                                setIsCreelModalVisible(false);
                                                setIsScanModalVisible(true);
                                            }}
                                        >
                                            <Text style={styles.btnText}>Save & Next</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.cancelBtn}
                                            onPress={() => {
                                                setIsCreelModalVisible(false);
                                                resetAllFields();
                                            }}
                                        >
                                            <Text style={styles.cancelText}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                }
                            />
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal >
            {/* creel add modal end over */}

            {/* cartons modal start over */}
            <Modal
                visible={isScanModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setIsScanModalVisible(false)}

            >
                <View style={styles.modalContainer}>
                    <View style={styles.container}>
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
                        <View style={styles.topSwitchContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.switchCard,
                                    showManualSearch === false && styles.activeCard
                                ]}
                                onPress={() => setShowManualSearch(false)}
                            >
                                <Icon name="camera" size={22} color={showManualSearch === false ? "#fff" : "#007EA7"} />
                                <Text style={[
                                    styles.switchText,
                                    showManualSearch === false && styles.activeText
                                ]}>
                                    Scan Carton
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.switchCard,
                                    showManualSearch === true && styles.activeCard
                                ]}
                                onPress={() => setShowManualSearch(true)}
                            >
                                <Icon name="search" size={20} color={showManualSearch === true ? "#fff" : "#007EA7"} />
                                <Text style={[
                                    styles.switchText,
                                    showManualSearch === true && styles.activeText
                                ]}>
                                    Manual Search
                                </Text>
                            </TouchableOpacity>

                        </View>

                        {showManualSearch === true && (
                            <View style={styles.manualCard}>

                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TextInput
                                        placeholder="Enter Carton No"
                                        value={searchText}
                                        onChangeText={setSearchText}
                                        style={styles.searchInput}
                                    />
                                    <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                                        <Icon name="search" size={20} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                <FlatList
                                    data={searchResults}
                                    keyExtractor={(item, index) => index.toString()}
                                    style={{ marginTop: 10, maxHeight: 150 }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.resultItem,
                                                selectedItem?.CartNo === item.CartNo && styles.selectedItem
                                            ]}
                                            onPress={() => setSelectedItem(item)}
                                        >
                                            <Text style={styles.cartNo}>{item.CartNo}</Text>
                                            <Text style={styles.cartDetail}>
                                                {item.ItmName} / {item.MerName} / {item.ShdName}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />

                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                    <TouchableOpacity
                                        style={[styles.okBtn, { flex: 1 }]}
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
                                        <Text style={styles.btnTextWhite}>OK</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.cancelBtn2, { flex: 1 }]}
                                        onPress={() => {
                                            setShowManualSearch(null);
                                            setSearchText('');
                                            setSearchResults([]);
                                            setSelectedItem(null);
                                        }}
                                    >
                                        <Text style={styles.btnTextWhite}>Close</Text>
                                    </TouchableOpacity>
                                </View>

                            </View>
                        )}
                        {showManualSearch === false && (
                            <View style={styles.scannerCard}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Icon name="camera" size={20} color="#007EA7" />
                                    <Text style={styles.scanTitle}>QR Scanner</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.scanBtn}
                                    onPress={() => setIsScanning(!isScanning)}
                                >
                                    <Text style={styles.btnTextWhite}>
                                        {isScanning ? "Stop" : "Start"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {isScanning && showManualSearch === false && (
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
                        )}
                        <FlatList
                            data={[1]}
                            keyExtractor={(item, index) => index.toString()}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ padding: 12, paddingBottom: 30 }}

                            // 🔹 HEADER (Form Card)
                            ListHeaderComponent={
                                <View style={styles.card}>

                                    <Text style={styles.title}>
                                        Enter Cartons Detail
                                    </Text>

                                    {/* Carton Number */}
                                    <View style={checkingScannerStyles.row}>
                                        <View style={checkingScannerStyles.halfInput}>
                                            <Text style={styles.label}>
                                                Carton Number <Text style={{ color: 'red' }}>*</Text>
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

                                    {/* Chees + Qty */}
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
                                            />
                                        </View>

                                        <View style={[styles.halfInput, { marginTop: 10 }]}>
                                            <Text style={styles.label}>
                                                Quantity (Kg) <Text style={{ color: 'red' }}>*</Text>
                                            </Text>
                                            <TextInput
                                                placeholder="Enter qty"
                                                value={getavgwt}
                                                keyboardType="decimal-pad"
                                                style={styles.inputDisabled}
                                                onChangeText={setavgwt}
                                            />
                                        </View>
                                    </View>

                                    {/* Info */}
                                    {getScannedObj && Object.keys(getScannedObj).length > 0 && (
                                        <View style={{ marginTop: 6 }}>
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

                                </View>
                            }
                            ListFooterComponent={() => (
                                <>
                                    <View style={styles.bottomBtnContainer}>

                                        <View style={styles.btnRow}>
                                            <TouchableOpacity
                                                style={styles.primaryBtn}
                                                onPress={handleAddCarton}
                                            >
                                                <Text style={styles.btnText}>Add Carton</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.secondaryBtn}
                                                onPress={() => {
                                                    setCartonNo('');
                                                    setchees('');
                                                    setavgwt('');
                                                    setScannedObj({});
                                                }}
                                            >
                                                <Text style={styles.btnText}>Cancel</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.btnRow}>
                                            <TouchableOpacity
                                                style={styles.primaryBtn}
                                                onPress={handleFinalSubmit}
                                            // onPress={handleaddCreel}
                                            >
                                                <Text style={styles.btnText}>
                                                    {isEditMode ? "Update Scan" : "Submit Scan"}
                                                </Text>
                                                {/* <Text style={styles.btnText}>Submit Scan</Text> */}
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.secondaryBtn}
                                                onPress={() => {
                                                    setIsScanModalVisible(false);
                                                    resetAllFields();
                                                    // setIsCreelModalVisible(true);
                                                }}
                                            >
                                                <Text style={styles.btnText}>Close</Text>
                                            </TouchableOpacity>
                                        </View>

                                    </View>

                                    {cartonSummary.length > 0 && (
                                        <View style={styles.summaryCard}>
                                            <Text style={styles.summaryTitle}>
                                                Yarn Issuance Summary
                                            </Text>

                                            <Text style={styles.summarySub}>
                                                {cartonSummary.length} carton(s)
                                            </Text>

                                            {/* <View style={{ height: 100 }}>
                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={true}
                                                    nestedScrollEnabled={true}

                                                >
                                                    <View style={{ minWidth: screenWidth + 300 }}>
                                                        <View style={styles.headerRow}>
                                                            <Text style={[styles.header, { width: 40 }]}>Sr No.</Text>
                                                            <Text style={[styles.header, { width: 100 }]}>Carton</Text>
                                                            <Text style={[styles.header, { width: 150 }]}>Item</Text>
                                                            <Text style={[styles.header, { width: 80 }]}>Merge</Text>
                                                            <Text style={[styles.header, { width: 80 }]}>Grade</Text>
                                                            <Text style={[styles.header, { width: 85 }]}>Shade</Text>
                                                            <Text style={[styles.header, { width: 80 }]}>Qty</Text>
                                                            <Text style={[styles.header, { width: 70 }]}>Chees</Text>
                                                            <Text style={[styles.header, { width: 50 }]}>Action</Text>
                                                        </View>

                                                        <FlatList
                                                            data={cartonSummary}
                                                            keyExtractor={(item, index) => index.toString()}
                                                            renderItem={({ item, index }) => (
                                                                <View style={styles.row1}>
                                                                    <Text style={[styles.cell, { width: 40 }]}>{item.PSrNo}</Text>
                                                                    <Text style={[styles.cell, { width: 100 }]}>{item.cartonNo}</Text>
                                                                    <Text style={[styles.cell, { width: 150 }]}>{item.ItmName}</Text>
                                                                    <Text style={[styles.cell, { width: 80 }]}>{item.MerName}</Text>
                                                                    <Text style={[styles.cell, { width: 80 }]}>{item.GrdName}</Text>
                                                                    <Text style={[styles.cell, { width: 85 }]}>{item.ShdName}</Text>
                                                                    <Text style={[styles.cell, { width: 70 }]}>{item.qty}</Text>
                                                                    <Text style={[styles.cell, { width: 50 }]}>{item.chees}</Text>

                                                                    <TouchableOpacity
                                                                        style={[styles.cell, { width: 80, alignItems: 'center' }]}
                                                                        onPress={() => {
                                                                            setCartonSummary(prev =>
                                                                                prev.filter((_, i) => i !== index)
                                                                            );
                                                                        }}
                                                                    >
                                                                        <Icon name="delete" size={18} color="#ff4d4f" />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            )}
                                                            style={{ maxHeight: 100 }}
                                                        />
                                                    </View>
                                                </ScrollView>
                                            </View> */}

                                            <View style={{ maxHeight: 200 }}>
                                                <ScrollView horizontal showsHorizontalScrollIndicator>
                                                    <View style={{ minWidth: screenWidth + 300 }}>

                                                        {/* HEADER */}
                                                        <View style={styles.headerRow}>
                                                            <Text style={[styles.header, { width: 40 }]}>Sr No.</Text>
                                                            <Text style={[styles.header, { width: 100 }]}>Carton</Text>
                                                            <Text style={[styles.header, { width: 150 }]}>Item</Text>
                                                            <Text style={[styles.header, { width: 80 }]}>Merge</Text>
                                                            <Text style={[styles.header, { width: 80 }]}>Grade</Text>
                                                            <Text style={[styles.header, { width: 85 }]}>Shade</Text>
                                                            <Text style={[styles.header, { width: 80 }]}>Qty</Text>
                                                            <Text style={[styles.header, { width: 70 }]}>Chees</Text>
                                                            <Text style={[styles.header, { width: 50 }]}>Action</Text>
                                                        </View>

                                                        {/* 🔥 CHANGE: FlatList ko remove karo */}
                                                        <ScrollView
                                                            style={{ maxHeight: 150 }}
                                                            nestedScrollEnabled={true}
                                                            showsVerticalScrollIndicator={true}
                                                        >
                                                            {cartonSummary.map((item, index) => (
                                                                <View style={styles.row1} key={index}>
                                                                    <Text style={[styles.cell, { width: 40 }]}>{item.PSrNo}</Text>
                                                                    <Text style={[styles.cell, { width: 100 }]}>{item.cartonNo}</Text>
                                                                    <Text style={[styles.cell, { width: 150 }]}>{item.ItmName}</Text>
                                                                    <Text style={[styles.cell, { width: 80 }]}>{item.MerName}</Text>
                                                                    <Text style={[styles.cell, { width: 80 }]}>{item.GrdName}</Text>
                                                                    <Text style={[styles.cell, { width: 85 }]}>{item.ShdName}</Text>
                                                                    <Text style={[styles.cell, { width: 70 }]}>{item.qty}</Text>
                                                                    <Text style={[styles.cell, { width: 50 }]}>{item.chees}</Text>

                                                                    <TouchableOpacity
                                                                        style={{ width: 80, alignItems: 'center' }}
                                                                        onPress={() => {
                                                                            setCartonSummary(prev =>
                                                                                prev.filter((_, i) => i !== index)
                                                                            );
                                                                        }}
                                                                    >
                                                                        <Icon name="delete" size={18} color="#ff4d4f" />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            ))}
                                                        </ScrollView>

                                                    </View>
                                                </ScrollView>
                                            </View>
                                        </View>
                                    )}

                                </>
                            )}
                        />
                    </View>


                </View>
            </Modal>
            {/* cartons modal end over */}

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

                        {/* <TouchableOpacity
                            style={styles.okButton}
                            onPress={() => {
                                setShowSuccess(false);

                                // 🔥 IMPORTANT
                                setCartonSummary([]);   // list clear
                            }}
                        >
                            <Text style={styles.okText}>OK....</Text>
                        </TouchableOpacity> */}

                        <TouchableOpacity
                            style={styles.okButton}
                            onPress={() => {
                                setShowSuccess(false);
                                setIsScanModalVisible(false);
                                setIsCreelModalVisible(false);
                                setCartonSummary([]);
                                setCartonNo('');
                                setchees('');
                                setavgwt('');
                                setScannedObj({});
                                setSearchText('');
                                setSearchResults([]);
                                setSelectedItem(null);
                                setShowManualSearch(null);
                                setIsScanning(false);
                                setCreelId('');
                                setShift('');
                                setRemark('');
                                setstocktype('');
                                setSetupDate(new Date());
                                // setFormState({
                                //     values: {
                                //         PrpCode: '',
                                //         YearNo: '',
                                //         LngName: '',
                                //         YearName: ''
                                //     }
                                // });
                                fetchBrowseData();
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
