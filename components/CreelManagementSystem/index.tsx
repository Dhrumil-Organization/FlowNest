import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Alert, TextInput as RNTextInput, Button, FlatList, ActivityIndicator, StyleSheet, Dimensions,
    Platform, Modal
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import FullScreenLoader from '@/components/FullScreenLoader';
import { checkingScannerStyles, yarnmanagementsystemstyle } from '@/common/Style';
import { API, PRINTSTICKER, PRINTERSLISTAPI } from '../../common/API/dynamicAPI';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import HeaderBarwithBack from '@/components/Header';
import Header from '../Header';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView } from 'react-native';
import { Snackbar } from 'react-native-snackbar';
import { Switch } from 'react-native';
import CustomDrawer from './CustomDrawer';
import { fetchAllPropertyData, fetchAllYeardata, fetchAllStoredata } from '../../common/API/Functions';
import { fetchPropertyData } from '../../common/API/Functions';
// import { ExeData, DesignData, ItemData, POTData, ItemStatus, CardPayload } from './Modal';
import PartyDropdown from '@/Shared/PartyDropdown';
import SearchableDropdown from '@/Shared/SearchableDropdown';
import { useMobileUserPreference } from '../../hooks/useMobileUserPreference';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
    userid: number | string;
}

type GridItem = {
    srNo: number;
    CartonNo: string;
    design: string;
};

const CreelManagementSystem: React.FC<Props> = ({ token, navigation, isConnected, username, userid }) => {
    // const device = useCameraDevice('back');
    const {
        loadDefaultPreference,
        savePreference,
        loadPreferenceList,
    } = useMobileUserPreference({
        UserId: userid || 0,
        ModuleCode: 'CREEL',
        ModuleName: 'Creel',
        ScreenCode: 'CREEL_BROWSER',
        ScreenName: 'Creel Management Browser',
        token: token,
    });
    console.log("User ID =>", userid);
    const scanLock = useRef(false);
    const [isScanning, setIsScanning] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
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
    const [Remark, setRemark] = useState('');
    const [showManualSearch, setShowManualSearch] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const [getAllPropertyData, setAllPropertyData] = useState([]);
    const [showSummary, setShowSummary] = useState(false);
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
            StkType: '',
            MacCode: ''
        }
    })
    const [getAllYearData, setAllYearData] = useState([]);
    const [selectedstocktype, setselectedstocktype] = useState([]);
    const [activeCreels, setActiveCreels] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedCreel, setSelectedCreel] = useState(null);
    const [mainUId, setMainUId] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [propertyData, setPropertyData] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    // const [propertydata, setpropertydata] = useState<ExeData[]>([]);
    const [filteredData, setFilteredData] = useState([]);   // 🔥 filtered data
    const screenWidth = Dimensions.get('window').width;
    // const selectedProperty = getAllPropertyData?.find((p) => p.PrpCode == FormState.values.PrpCode) || null;
    const [showList, setShowList] = useState(false);
    const [getMachineData, setMachineData] = useState([]);
    const [selectedmachine, setselectedmachine] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDelete, setIsDelete] = useState(false);
    const normalizeCriteria = (criteria: any) => {
        return {
            PrpCode: criteria?.PrpCode || '',
            YearNo: criteria?.YearNo || '',
            fromdate: criteria?.fromdate || formatDate(firstDay),
            todate: criteria?.todate || formatDate(today),
            status: criteria?.status || 'P',
            StkType: criteria?.StkType || '',
        };
    };

    console.log("getMachineData", getMachineData);



    const styles = StyleSheet.create({
        scannerCard: {
            marginHorizontal: 14,
            marginTop: 10,
            backgroundColor: "#EEF7FF",
            borderRadius: 22,
            padding: 14,
            borderWidth: 1,
            borderColor: "#D8EAF6"
        },

        scanIconBox: {
            width: 72,
            height: 60,
            borderRadius: 18,
            backgroundColor: "#D9ECFF",
            justifyContent: "center",
            alignItems: "center"
        },

        scanTitle: {
            fontSize: 14,
            fontWeight: "700",
            color: "#111"
        },

        scanSubTitle: {
            marginTop: 4,
            color: "#000",
            fontSize: 12
        },

        scanButton: {
            backgroundColor: "#0B8BC2",
            height: 52,
            paddingHorizontal: 22,
            borderRadius: 14,
            flexDirection: "row",
            alignItems: "center"
        },

        scanButtonText: {
            color: "#fff",
            fontWeight: "700",
            marginLeft: 8,
            fontSize: 12
        },
        field: {
            marginBottom: 12
        },
        fieldHalf: {
            flex: 1
        },
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
        searchWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            marginTop: 10,
            marginBottom: 10
        },
        searchContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        searchInput: {
            flex: 1,
            marginLeft: 8,
            fontSize: 14,
            color: '#0f172a'
        },
        filterBtn: {
            marginLeft: 8,
            backgroundColor: '#f1f5f9',
            padding: 10,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center'
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
            color: '#000',
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
        badgeText: {
            fontSize: 12,
            fontWeight: 'bold',
            color: '#333',
        },
        badge: {
            backgroundColor: '#E3F2FD',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10
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
            // color: '#555',
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
            fontWeight: 'bold',
            color: '#000'
        },

        modalMessage: {
            fontSize: 16,
            marginVertical: 10,
            textAlign: 'center',
            color: '#000'
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
        topSwitchContainer: {
            flexDirection: 'row',
            margin: 4,
            gap: 10
        },
        activeCard: {
            backgroundColor: '#007EA7',
            borderColor: '#007EA7',
        },
        activeCardShadow: {
            elevation: 8,
            shadowColor: '#007EA7',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            transform: [{ scale: 1.02 }],
        },
        switchCard: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: '#007EA7',
            backgroundColor: '#fff',
            elevation: 3,
        },
        switchText: {
            fontSize: 14,
            fontWeight: '600',
            color: '#007EA7'
        },
        activeText: {
            color: '#fff'
        },
        manualCard: {
            margin: 12,
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 12,
            elevation: 5
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
            color: '#000'
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
        },
        header1: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },

        iconBox: {
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: '#E3F2FD',
            justifyContent: 'center',
            alignItems: 'center',
        },
        infoBox: {
            backgroundColor: '#F1F3F6',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
        },

        infoText: {
            fontSize: 12,
            color: '#555',
        },
        card: {
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 14,
            marginBottom: 12,
            elevation: 3,
        },

        cardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
        },

        voucher: {
            fontSize: 16,
            fontWeight: '700',
            color: '#0f172a'
        },

        middleRow: {
            marginTop: 8
        },
        bottomRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 12
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
            color: '#000',
            fontWeight: '600',
            fontSize: 13
        },

        submitText: {
            color: '#fff',
            fontWeight: '600',
            fontSize: 13
        },
        smallBox: {
            backgroundColor: '#e5e7eb',
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 8,
            fontSize: 12,
            marginRight: 8,
            color: '#000'
        },

        editBtn: {
            backgroundColor: '#dbeafe',
            padding: 8,
            borderRadius: 10,
            marginLeft: 'auto',
            marginRight: 6
        },

        deleteBtn: {
            backgroundColor: '#fee2e2',
            padding: 8,
            borderRadius: 10
        },

        statusBadge: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            borderWidth: 1
        },

        filterInfoContainer: {
            marginHorizontal: 10,
            marginBottom: 10
        },
        yearBox: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
            backgroundColor: '#ecfeff',
            padding: 8,
            borderRadius: 8,
            alignSelf: 'flex-start'
        },

        yearText: {
            marginLeft: 6,
            fontSize: 12,
            color: '#000'
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
        divider: {
            width: 1,
            height: 20,
            backgroundColor: '#e2e8f0'
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
        cardTitle: { fontWeight: '700', marginBottom: 10, color: '#000' },
        bottomBar: {
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 16,
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#E8ECF3",
            gap: 12,
        },

        closeButton: {
            flex: 1,
            height: 48,
            borderRadius: 16,
            backgroundColor: "#F2F4F7",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",

            borderWidth: 1,
            borderColor: "#D8DEE8",
        },

        submitButton: {
            flex: 1,
            height: 48,
            borderRadius: 16,
            backgroundColor: "#0A88C8",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",

            shadowColor: "#0A88C8",
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: {
                width: 0,
                height: 5,
            },

            elevation: 8,
        },

        closeButtonText: {
            fontSize: 16,
            fontWeight: "700",
            color: "#555",
        },

        submitButtonText: {
            fontSize: 16,
            fontWeight: "700",
            color: "#fff",
        },
        primaryText: { color: '#fff', fontWeight: '700' },
        secondaryText: { color: '#000', fontWeight: '600' },
        summaryContainer: {
            padding: 10
        },

        summaryCard1: {
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 12,
            marginTop: 10,
            elevation: 3
        },

        summaryRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
        },

        leftBox1: {
            flexDirection: 'row',
            alignItems: 'center'
        },

        indexCircle: {
            backgroundColor: '#0e7490',
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10
        },

        cartonNo1: {
            fontSize: 16,
            fontWeight: '700',
            color: '#0e7490'
        },

        subText1: {
            fontSize: 12,
            color: '#555'
        },

        rightBox1: {
            alignItems: 'flex-end'
        },

        totalBox: {
            backgroundColor: '#eef2f7',
            padding: 14,
            borderRadius: 12,
            marginTop: 12,
            flexDirection: 'row',
            justifyContent: 'space-between'
        },
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
        leftSection: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            flex: 1,
        },
        indexText: {
            color: '#fff',
            fontWeight: 'bold'
        },
        rightSection: {
            alignItems: 'flex-end',
            justifyContent: 'center',
        },
        deleteIcon: {
            alignSelf: 'flex-end',
            marginBottom: 6
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
        header: {
            backgroundColor: '#007EA7',
            paddingTop: 10,
            paddingBottom: 20,
            paddingHorizontal: 18,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            flexDirection: 'row',
            alignItems: 'center',
            elevation: 8,
        },
        headerSubTitle: {
            color: '#D9F6FF',
            marginTop: 2,
            fontSize: 13,
        },

        headerIcon: {
            width: 45,
            height: 45,
            borderRadius: 23,
            backgroundColor: 'rgba(255,255,255,.15)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        sectionCard: {
            marginHorizontal: 16,
            marginTop: 18,
            backgroundColor: "#FFFFFF",
            borderRadius: 22,
            padding: 18,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: {
                width: 0,
                height: 5,
            },
            elevation: 5,
        },

        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
        },

        sectionBar: {
            width: 5,
            height: 20,
            borderRadius: 10,
            backgroundColor: "#0A88C8",
            marginRight: 10,
        },

        sectionTitle: {
            fontSize: 18,
            fontWeight: "500",
            color: "#000",
        },

        fieldContainer: {
            marginBottom: 18,
        },

        halfField: {
            flex: 1,
        },

        label: {
            fontSize: 12,
            fontWeight: "700",
            color: "#000",
            marginBottom: 8,
        },

        inputWrapper: {
            height: 45,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#D9E2EC",
            backgroundColor: "#FBFCFE",
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
        },

        input: {
            flex: 1,
            color: "#000",
            fontSize: 12,
            paddingVertical: 0,
        },

        row: {
            flexDirection: "row",
            marginBottom: 18,
        },

        modalInput: {
            height: 50,
            borderWidth: 1,
            borderColor: "#D7DFEA",
            backgroundColor: "#F8FAFD",
            borderRadius: 14,
            paddingHorizontal: 15,
            color: "#000",
            fontSize: 14,
            justifyContent: "center",
        },
        loaderOverlay: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999999,
            elevation: 999999,
        },
    });

    let cancelToken: any;

    // console.log("Carton SUmmary", cartonSummary);
    // console.log("activeCreels", activeCreels)
    // console.log("status", FormState.values.status);
    // console.log("status...", FormState.values);
    // console.log("Stock Types:", getStockTypes);
    // console.log("prptype", propertydata);
    console.log("stocktype", FormState.values.StkType);

    useEffect(() => {
        const loadPreferenceData = async () => {

            if (!token) return;

            const saved = await loadDefaultPreference();

            if (saved?.criteria) {

                const criteria = normalizeCriteria(saved.criteria);

                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        ...criteria,
                    }
                }));
            }
        };

        loadPreferenceData();
    }, []);

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    // useEffect(() => {
    //     const loadProperty = async () => {
    //         const allprpdata = await fetchAllPropertyData(token);
    //         setAllPropertyData(allprpdata);
    //     };
    //     loadProperty();
    // }, []);

    // useEffect(() => {
    //     console.log("Property useEffect");
    //     console.log("Token =", token);

    //     if (!token) return;

    //     const loadProperty = async () => {
    //         console.log("Calling Property API...");
    //         const allprpdata = await fetchAllPropertyData(token);
    //         console.log("Response =", allprpdata);
    //         setAllPropertyData(allprpdata);
    //     };

    //     loadProperty();
    // }, [token]);

    useEffect(() => {
        if (!token) return;

        const load = async () => {
            const data = await fetchPropertyData(token);

            setPropertyData(data || []);

            if (data?.length) {
                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        PrpCode: data[0].PrpCode,
                        LngName: data[0].LngName,
                    }
                }));
            }
        };

        load();
    }, [token]);

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
                // yearno: FormState.values.YearNo || getCurrentFinancialYear(),
                yearno: getCurrentFinancialYear(),
                // yearno: '26',
                fromdate: FormState.values.fromdate || '',
                todate: FormState.values.todate || '',
                status: FormState.values.status || '',

            };

            const response = await axios.post(`${API}/api/get_yarn_issue_browse`, params, { headers });

            console.log("browse response", response)
            console.log("browse payload", params)

            const apiData = response?.data?.response?.data || [];
            if (userid) {
                await savePreference({
                    CriteriaName: 'Default',
                    IsDefault: true,
                    PreferenceJson: {
                        criteria: {
                            PrpCode: FormState.values.PrpCode,
                            YearNo: FormState.values.YearNo || getCurrentFinancialYear(),
                            fromdate: FormState.values.fromdate,
                            todate: FormState.values.todate,
                            status: FormState.values.status,
                            StkType: FormState.values.StkType,
                        },
                    },
                });
            }
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
                    setFilteredData(finalData);
                    closeDrawer();
                } else {
                    setActiveCreels([]);
                    setFilteredData([]);
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
                yearno: FormState.values.YearNo || getCurrentFinancialYear(),
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
                            SrNo: d2Item.SrNo,
                            SubSrNo: d2Item.SubSr,
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
                            yearNo: FormState.values.YearNo || getCurrentFinancialYear() || ''
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

    // const codeScanner = useCodeScanner({
    //     codeTypes: ['qr'],
    //     onCodeScanned: (codes) => {
    //         const value = codes[0]?.value || '';
    //         console.log("📦 Raw QR Value 👉", value);
    //         try {
    //             const parts = value.split("~");
    //             let parsed = {};

    //             if (parts.length >= 13) {
    //                 // Full format
    //                 parsed = {
    //                     PrpCode: parts[0] || '',
    //                     PUId: parts[1] || '',
    //                     PSrNo: parts[2] || '',
    //                     PSubSr: parts[3] || '',
    //                     TranType: parts[4] || '',
    //                     CartNo: parts[5] || '',
    //                     ItmCode: parts[6] || '',
    //                     MerCode: parts[7] || '',
    //                     GrdCode: parts[8] || '',
    //                     ShdCode: parts[9] || '',
    //                     Denier: parts[10] || '',
    //                     Wt: parts[11] || 0,
    //                     Chees: parts[12] || 0,
    //                     Rate: parts[13] || 0,
    //                     yearNo: parts[14] || ''
    //                 };
    //                 console.log("✅ Parsed 1111 👉", parsed);
    //             } else if (parts.length >= 11) {
    //                 // Short format (without Chees)
    //                 parsed = {
    //                     PUId: parts[0] || '',
    //                     PSrNo: parts[1] || '',
    //                     PSubSr: parts[2] || '',
    //                     TranType: parts[3] || '',
    //                     CartNo: parts[4] || '',
    //                     ItmCode: parts[5] || '',
    //                     MerCode: parts[6] || '',
    //                     GrdCode: parts[7] || '',
    //                     ShdCode: parts[8] || '',
    //                     Denier: parts[9] || '',
    //                     Wt: parts[10] || 0,
    //                     Chees: 0,
    //                     yearNo: parts[11] || ''
    //                 };
    //                 console.log("✅ Parsed 22", parsed);
    //             } else {
    //                 throw new Error("Invalid format");
    //             }
    //             // const parsed = {}
    //             // if (parts.length < 13) {
    //             //     throw new Error("Invalid format");
    //             // } else
    //             //     parsed = {
    //             //         PUId: parts[0],
    //             //         PSrNo: parts[1],
    //             //         PSubSr: parts[2],
    //             //         TranType: parts[3],
    //             //         CartNo: parts[4],
    //             //         ItmCode: parts[5],
    //             //         MerCode: parts[6],
    //             //         GrdCode: parts[7],
    //             //         ShdCode: parts[8],
    //             //         Denier: parts[9],
    //             //         Wt: parts[10],
    //             //         Chees: parts[11],
    //             //         yearNo: parts[12]
    //             //     };


    //             setScannedObj(parsed);
    //             setCartonNo(parsed.CartNo || '');
    //             setYearNo(parsed.yearNo || '');
    //             setchees(parsed.Chees || '');
    //             setavgwt(parsed.Wt || '');

    //             fetchitmgrdshdname(parsed);

    //             sendScannedValue(value);
    //         } catch (err) {
    //             Alert.alert("Invalid QR", "QR format not valid");
    //         }
    //         setIsScanning(false);
    //     },
    // });


    // const scanLock = useRef(false);

    // const handleBarcodeScanned = ({ data }: { data: string }) => {
    //     if (scanLock.current) return;
    //     scanLock.current = true;
    //     setTimeout(() => (scanLock.current = false), 2000);

    //     // Reset old data
    //     setScannedValue('');

    //     console.log("📦 Raw QR Value 👉", data);

    //     setScannedValue(data);

    //     try {
    //         const parts = data.split("~");
    //         console.log("Parts Length:", parts.length);
    //         let parsed: any = {};

    //         if (parts.length >= 13) {
    //             // Full QR
    //             parsed = {
    //                 PrpCode: parts[0] || '',
    //                 PUId: parts[1] || '',
    //                 PSrNo: parts[2] || '',
    //                 PSubSr: parts[3] || '',
    //                 TranType: parts[4] || '',
    //                 CartNo: parts[5] || '',
    //                 ItmCode: parts[6] || '',
    //                 MerCode: parts[7] || '',
    //                 GrdCode: parts[8] || '',
    //                 ShdCode: parts[9] || '',
    //                 Denier: parts[10] || '',
    //                 Wt: parts[11] || '',
    //                 Chees: parts[12] || '',
    //                 Rate: parts[13] || '',
    //                 yearNo: parts[14] || ''
    //             };
    //         } else if (parts.length >= 11) {
    //             // Short QR
    //             parsed = {
    //                 PUId: parts[0] || '',
    //                 PSrNo: parts[1] || '',
    //                 PSubSr: parts[2] || '',
    //                 TranType: parts[3] || '',
    //                 CartNo: parts[4] || '',
    //                 ItmCode: parts[5] || '',
    //                 MerCode: parts[6] || '',
    //                 GrdCode: parts[7] || '',
    //                 ShdCode: parts[8] || '',
    //                 Denier: parts[9] || '',
    //                 Wt: parts[10] || '',
    //                 Chees: '',
    //                 yearNo: parts[11] || ''
    //             };
    //         } else {
    //             throw new Error("Invalid QR");
    //         }

    //         console.log("✅ Parsed QR 👉", parsed);

    //         setScannedObj(parsed);
    //         setCartonNo(parsed.CartNo || '');
    //         setYearNo(parsed.yearNo || '');
    //         setchees(parsed.Chees || '');
    //         setavgwt(parsed.Wt || '');

    //         // API Calls
    //         fetchitmgrdshdname(parsed);
    //         sendScannedValue(data);

    //     } catch (err) {
    //         // resetScanFields();
    //         Alert.alert("Invalid QR", "QR format not valid");
    //     }

    //     setIsScanning(false);
    // };


    const handleBarcodeScanned = (result: BarcodeScanningResult) => {
        // Prevent multiple scans
        if (scanLock.current) return;
        scanLock.current = true;
        setTimeout(() => (scanLock.current = false), 2000);

        const value = result?.data || '';
        console.log("📦 Raw QR Value 👉", value);

        try {
            const parts = value.split("~");
            let parsed = {};

            if (parts.length === 16) {
                parsed = {
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
                    Wt: parts[13] || 0,
                    Chees: parts[14] || 0,
                    yearNo: parts[15] || ''
                };

                console.log("✅ Parsed New Format 👉", parsed);
            } else if (parts.length >= 13) {
                // Full format
                parsed = {
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
                    Wt: parts[11] || 0,
                    Chees: parts[12] || 0,
                    Rate: parts[13] || 0,
                    yearNo: parts[14] || ''
                };
                console.log("✅ Parsed 1111 👉", parsed);
            } else if (parts.length >= 11) {
                // Short format (without Chees)
                parsed = {
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
                    Wt: parts[10] || 0,
                    Chees: 0,
                    yearNo: parts[11] || ''
                };
                console.log("✅ Parsed 22", parsed);
            } else {
                throw new Error("Invalid format");
            }
            // const parsed = {}
            // if (parts.length < 13) {
            //     throw new Error("Invalid format");
            // } else
            //     parsed = {
            //         PUId: parts[0],
            //         PSrNo: parts[1],
            //         PSubSr: parts[2],
            //         TranType: parts[3],
            //         CartNo: parts[4],
            //         ItmCode: parts[5],
            //         MerCode: parts[6],
            //         GrdCode: parts[7],
            //         ShdCode: parts[8],
            //         Denier: parts[9],
            //         Wt: parts[10],
            //         Chees: parts[11],
            //         yearNo: parts[12]
            //     };


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
                yearno: FormState.values.YearNo || getCurrentFinancialYear(),
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
        if (!CartonNo) {
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

        // const enteredChees = parseFloat(getchees);
        // const enteredQty = parseFloat(getavgwt);

        const enteredChees = parseFloat(getchees || 0);
        const enteredQty = parseFloat(getavgwt || 0);


        const availableCheesValue = getScannedObj?.Chees;
        const availableQtyValue = getScannedObj?.Wt;

        const availableChees = parseFloat(getScannedObj?.Chees || 0);
        const availableQty = parseFloat(getScannedObj?.Wt || 0);

        // if (enteredChees > availableChees) {
        if (
            availableChees > 0 &&
            enteredChees > availableChees
        ) {
            Alert.alert(
                "Validation Error",
                `Entered Chees (${enteredChees}) cannot be greater than Available Chees (${availableChees}).`
            );
            return;
        }

        // if (enteredQty > availableQty) {
        if (enteredQty > 0 && enteredQty > availableQty) {
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
            SubSr: getScannedObj.SubSr,
            PrpCode: getScannedObj.PrpCode,
            Rate: getScannedObj.Rate,
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
        (!permission?.granted) && (
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

    const getShifts = async (prpCode: string) => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            let yno = await AsyncStorage.getItem('yno');
            const userPtype = await AsyncStorage.getItem('user_prptype');
            const historyPayload = {
                // text: parcode,
                txntype: 'creel_yarn_issue',
                prptype: userPtype,
                fetch: 'shift',
                prpcode: prpCode || FormState.values.PrpCode,
                yearno: FormState.values.YearNo || getCurrentFinancialYear()

            };
            console.log("historyPayload", historyPayload);
            const response = await axios.get(
                `${API}/api/get_criterion`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            console.log("shift response", response);
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

    const getMachine = async (prpCode: string) => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            let yno = await AsyncStorage.getItem('yno');
            const userPtype = await AsyncStorage.getItem('user_prptype');
            const historyPayload = {
                txntype: 'creel_yarn_issue',
                prptype: userPtype,
                fetch: 'machine',
                prpcode: prpCode || FormState.values.PrpCode,
                yearno: getCurrentFinancialYear(),
                strcode: '002',
                macgrp: "WRP"
            };
            console.log("historyPayload", historyPayload);
            const response = await axios.get(
                `${API}/api/get_criterion`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            console.log("machine response", response);
            if (response.data.success && response.data.response.data.length > 0) {
                setMachineData(response.data.response.data);
            } else {
                setMachineData([]);
            }
        } catch (error) {
            // console.log("API getshifts error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const getcreelid = async (macCode) => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            let yno = await AsyncStorage.getItem('yno');
            const userPtype = await AsyncStorage.getItem('user_prptype');

            const Payload = {
                txntype: 'creel_yarn_issue',
                prpcode: FormState.values.PrpCode,
                yearno: getCurrentFinancialYear(),
                strcode: '002',
                maccode: macCode,
                fetch: "get_creelid",
                prptype: userPtype
            };

            console.log("creel id payload", Payload);

            const response = await axios.get(
                `${API}/api/get_criterion`, getRequestConfig(
                    {
                        params: { ...Payload }
                    }
                )
            );

            console.log("creelid response", response);

            if (response.data.success) {

                const data = response.data.response.data;

                setCreelId(data?.batch_no || "");

            } else {

                setCreelId("");

            }
        } catch (error) {
            // console.log("API getshifts error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const fetchitmgrdshdname = async (parsedData) => {
        setIsLoading(true); // ✅ start loader
        try {
            const payload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo || getCurrentFinancialYear(),
                strcode: '002',
                itmcode: parsedData?.ItmCode,
                mercode: parsedData?.MerCode,
                grdcode: parsedData?.GrdCode,
                shdcode: parsedData?.ShdCode,
            };

            console.log("payload", payload);

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

    useEffect(() => {
        const { PrpCode, YearNo } = FormState.values;
        if (PrpCode && YearNo) {
            // getShifts();
            // getMachine();
        }
    }, [FormState.values.PrpCode, FormState.values.YearNo || getCurrentFinancialYear()]);


    useEffect(() => {
        if (isCreelModalVisible) {
            // getShifts();
            // getMachine();
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
            }
            else {
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
        setIsSaving(true);
        try {
            let yno = await AsyncStorage.getItem('yno');
            const payloadObj = {
                PrpCode: FormState.values.PrpCode,
                YearNo: FormState.values.YearNo || getCurrentFinancialYear(),
                txntype: 'creel_yarn_issue',
                CreelId: creelId,
                BeamNo: 0,
                BeamUId: 0,
                // setupDate: setupDate,
                SetupDate: setupDate.toISOString().split('T')[0],
                Shift: shift,
                Remark: Remark || '',
                StkType: FormState.values.StkType || stocktype || '',
                uid: mainUId || '',
                RecipeUId: '1',
                DsnCode: 0,
                Cartons: cartonSummary.map(item => ({
                    uid: item.UId || mainUId,
                    PrpCode: item.PrpCode || '',
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
                    Rate: item.Rate || '',
                    ExpProdQty: 0,
                    DsnRcpSrNo: 0,
                    DsnCode: 0,

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
            }
            else if (response.data.success === false) {
                setIsSaving(false);
                setDataSaved(false);
                Snackbar.show({
                    text: response.data.message,
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: '#000',
                    textColor: '#fff',
                    action: { text: 'OK', textColor: 'yellow' },
                });
            } else {
                setIsSaving(false);
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
            setIsSaving(false);
            console.log("API handleSubmitScan error:", error);
        } finally {
            setIsSaving(false);
        }

    }

    const handleaddCreel = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsSaving(true);
        try {
            let yno = await AsyncStorage.getItem('yno');
            const payloadObj = {
                PrpCode: FormState.values.PrpCode,
                YearNo: FormState.values.YearNo || getCurrentFinancialYear(),
                txntype: 'creel_yarn_issue',
                CreelId: creelId,
                BeamNo: 0,
                BeamUId: 0,
                // setupDate: setupDate,
                SetupDate: setupDate.toISOString().split('T')[0],
                Shift: shift,
                Remark: Remark || '',
                StkType: FormState.values.StkType || stocktype || '',
                uid: mainUId || '',
                RecipeUId: '1',
                DsnCode: 0,
                IssTo: FormState.values.MacCode,
                Cartons: cartonSummary.map(item => ({
                    uid: item.UId || mainUId || '',
                    PrpCode: item.PrpCode || '',
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
                    Rate: item.Rate || '',
                    yearno: item.yearNo || '',
                    ExpProdQty: 0,
                    DsnRcpSrNo: 0,
                    DsnCode: 0,
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
            if (response.data.success === true) {
                setDataSaved(true);
                // setSuccessMessage('Data Updated Successfully ✅');
                setSuccessMessage(response.data.message || response.data.response?.message);
                setShowSuccess(true);
                // resetAllFields();
                // setIsScanModalVisible(false);

            }
            else if (response.data.success === false) {
                setIsSaving(false);
                setDataSaved(false);
                Snackbar.show({
                    text: response.data.message,
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: '#000',
                    textColor: '#fff',
                    action: { text: 'OK', textColor: 'yellow' },
                });
            } else {
                setIsSaving(false);
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
            setIsSaving(false);
            console.log("API handleSubmitScan error:", error);
        } finally {
            setIsSaving(false);
        }

    }

    const handledeletedata = async (item) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsDelete(true);
        try {
            let yno = await AsyncStorage.getItem('yno');
            const payloadObj = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo || getCurrentFinancialYear(),
                // txntype: 'creel_yarn_issue',
                uid: item.UId,
            };
            console.log("delete payload", payloadObj);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const response = await axios.post(`${API}/api/delete_creel_data`, payloadObj, { headers });

            console.log("delete response", response);

            if (response.data.success === true) {

                const successMsg =
                    response.data.response?.message ||
                    response.data.message;

                setDataSaved(true);
                setSuccessMessage(successMsg);
                setShowSuccess(true);
                resetAllFields();

            }
            else {
                setIsDelete(false);
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
            setIsDelete(false);
            console.log("API handleSubmitScan error:", error);
        } finally {
            setIsDelete(false);
        }

    }

    const handledeletecarton = async (item) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsDelete(true);
        try {
            let yno = await AsyncStorage.getItem('yno');
            const payloadObj = {
                cartonno: item.cartonNo,
                srno: item.SrNo,
                subsrno: item.SubSrNo,
                uid: item.UId,
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo || getCurrentFinancialYear(),
                txntype: 'creel_yarn_issue',
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

                const successMsg =
                    response.data.response?.message ||
                    response.data.message;


                setDataSaved(true);
                setSuccessMessage(successMsg);
                setShowSuccess(true);
                // resetAllFields();

            }
            else {
                setIsDelete(false);
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
            setIsDelete(false);
            console.log("API handleSubmitScan error:", error);
        } finally {
            setIsDelete(false);
        }

    }

    useEffect(() => {
        if (!searchText) {
            setFilteredData(activeCreels);
        } else {
            const search = searchText.toLowerCase();

            const filtered = activeCreels.filter(item =>
                item.CreelId?.toString().toLowerCase().includes(search) ||
                item.IssDate?.toString().toLowerCase().includes(search) ||
                item.Shift?.toString().toLowerCase().includes(search) ||
                item.CreelQty?.toString().toLowerCase().includes(search)
            );

            setFilteredData(filtered);
        }
    }, [searchText, activeCreels]);

    // useEffect(() => {
    //     if (!isScanModalVisible) {
    //         fetchBrowseData();
    //     }
    // }, [isScanModalVisible]);

    const resetAllFields = () => {
        setIsEditMode(false);   // 🔥 VERY IMPORTANT
        setMainUId(null);
        // Creel modal fields
        setCreelId('');
        setShift('');
        setstocktype('');
        setRemark('');
        setShowPicker(false);
        // setSetupDate(null);
        setselectedmachine(null);

        setFormState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                // PrpCode: '',
                // LngName: '',
                // YearNo: '',
                // YearName: '',
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

    const confirmDelete = (item) => {
        Alert.alert(
            "Delete Creel",
            `Are you sure you want to delete this Creel ${item.CreelId}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => handledeletedata(item)
                }
            ]
        );
    };

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

    const COL = {
        sr: 50,
        carton: 120,
        item: 160,
        merge: 90,
        grade: 90,
        shade: 120,
        qty: 80,
        chees: 70,
        action: 70
    };

    useEffect(() => {
        if (!token) return;

        const load = async () => {
            const data = await fetchPropertyData(token);
            setPropertyData(data || []);

            if (data?.length) {
                const prpCode = data[0].PrpCode;

                const years = await fetchAllYeardata(token, prpCode);
                setAllYearData(years);

                const currentFY = getCurrentFinancialYear();

                const currentYear =
                    years.find(y => String(y.YearNo) === String(currentFY))
                    || years[0];

                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        PrpCode: prpCode,
                        LngName: data[0].LngName,
                        YearNo: currentYear?.YearNo || '',
                        YearName: currentYear?.YearName || '',
                    }
                }));
            }
        };

        load();
    }, [token]);

    return (
        <>

            <StatusBar
                style="light"
                backgroundColor="#007EA7"
                translucent={false}
            />
            <SafeAreaView
                edges={['top']}
                style={{ flex: 0, backgroundColor: '#007EA7' }}
            />
            {/* {isLoading && <FullScreenLoader />} */}
            {isLoading && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "rgba(255,255,255,0.3)",
                        zIndex: 999,
                    }}
                >
                    <ActivityIndicator size="large" color="#007EA7" />
                </View>
            )}

            {/* <HeaderBarwithBack
                userName={username}
                header={'Creel Managment System'}
                subHeader={'Create and manage creel entries for production'}
            /> */}

            <HeaderBarwithBack
                userName={username}
                header={'Creel Managment System'}
                subHeader={'Create and manage creel entries for production'}
                breadcrumb={'Creel Managment System'}
                SearchBar={false}
            />

            <View style={styles.searchWrapper}>

                <View style={styles.searchContainer}>
                    <Icon name="search" size={18} color="#64748b" />

                    <TextInput
                        placeholder="Search creel..."
                        placeholderTextColor="#94a3b8"
                        value={searchText}
                        onChangeText={setSearchText}
                        style={styles.searchInput}
                    />
                </View>

                {/* FILTER BUTTON */}
                <TouchableOpacity style={styles.filterBtn} onPress={openDrawer}>
                    <Icon name="filter-list" size={22} color="#0f172a" />
                </TouchableOpacity>

            </View>

            <View style={{ paddingHorizontal: 10, flex: 1 }}>
                <FlatList
                    data={filteredData}
                    keyExtractor={(item, index) => index.toString()}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => {
                        const status = getStatusFromQty(item.CreelQty);

                        return (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.voucher}>
                                            Creel ID : {item.CreelId}
                                        </Text>
                                    </View>

                                    {/* STATUS */}
                                    <View style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor: status === 'Pending' ? '#fff7ed' : '#ecfdf5',
                                            borderColor: status === 'Pending' ? '#f59e0b' : '#16a34a'
                                        }
                                    ]}>
                                        <Text style={{
                                            color: status === 'Pending' ? '#f59e0b' : '#16a34a',
                                            fontSize: 12,
                                            fontWeight: '600'
                                        }}>
                                            {status}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.middleRow}>
                                    <Text style={styles.label}>
                                        Creel Vou No: {item.IssNo}
                                    </Text>
                                    <Text style={styles.label}>
                                        Shift: {item.Shift}
                                    </Text>
                                </View>
                                <View style={styles.bottomRow}>

                                    <Text style={styles.smallBox}>
                                        {item.IssDate}
                                    </Text>

                                    <Text style={styles.smallBox}>
                                        Qty: {Number(item.CreelQty || 0).toFixed(3)}
                                    </Text>
                                    <TouchableOpacity style={styles.editBtn}
                                        onPress={() => {
                                            setIsEditMode(true);
                                            handleViewClick(item);
                                        }}
                                    >
                                        <Icon name="edit" size={18} color="#2563eb" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.deleteBtn}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            confirmDelete(item);
                                        }}>
                                        <Icon name="delete" size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
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
                        <SafeAreaView
                            edges={['top']}
                            style={{
                                flex: 1,
                                backgroundColor: '#fff'
                            }}
                        >

                            <StatusBar
                                style="dark"
                                backgroundColor="#ffffff"
                            />
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
                                                    data={propertyData}
                                                    labelKey="LngName"
                                                    valueKey="PrpCode"
                                                    initialValue={selectedProperty}
                                                    placeholder="Choose property..."
                                                    pageSize={10}
                                                    multiple={false}
                                                    emptyMessage="No properties available"
                                                    onSelect={(item) => {
                                                        setFormState(prev => ({
                                                            ...prev,
                                                            values: {
                                                                ...prev.values,
                                                                PrpCode: item.PrpCode,
                                                                LngName: item.LngName,
                                                            }
                                                        }));

                                                        getMachine(item.PrpCode);
                                                        getShifts(item.PrpCode);
                                                    }}
                                                />
                                            </View>

                                            <View style={styles.field}>
                                                <Text style={styles.label}>Machine <Text style={{ color: 'red' }}> *</Text></Text>
                                                <PartyDropdown
                                                    data={getMachineData}
                                                    placeholder="Select Machine"
                                                    labelKey={["MacName"]}
                                                    valueKey="MacCode"
                                                    pageSize={12}
                                                    initialValue={selectedmachine ?? null}
                                                    selected={selectedmachine ?? null}
                                                    type="machine"
                                                    onSelect={(item) => {
                                                        setselectedmachine(item);
                                                        setFormState(prev => ({
                                                            ...prev,
                                                            values: {
                                                                ...prev.values,
                                                                MacCode: item?.MacCode
                                                            }
                                                        }));

                                                        getcreelid(item?.MacCode);
                                                    }}
                                                />
                                            </View>

                                            {/* Creel ID */}
                                            <View style={styles.inputGroup}>
                                                <Text style={styles.label}>Creel ID <Text style={{ color: 'red' }}> *</Text></Text>
                                                <TextInput
                                                    style={styles.modalInput}
                                                    value={creelId}
                                                    onChangeText={setCreelId}
                                                    placeholder="Enter Creel ID"
                                                    placeholderTextColor="#888"
                                                    readOnly
                                                />
                                            </View>

                                            {/* DATE + SHIFT */}
                                            <View style={styles.row}>

                                                <View style={styles.col}>
                                                    <Text style={styles.label}>Setup Date <Text style={{ color: 'red' }}> *</Text></Text>
                                                    <TouchableOpacity
                                                        style={styles.modalInput}
                                                        onPress={() => setShowPicker(true)}
                                                    >
                                                        <Text style={{ color: '#000' }}>
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

                                            <View style={styles.field}>
                                                <Text style={styles.label}>Stock Type <Text style={{ color: 'red' }}> *</Text></Text>
                                                <PartyDropdown
                                                    data={getStockTypes}
                                                    placeholder="Select Stock Type"
                                                    labelKey={["StkType", "stktypename"]}
                                                    valueKey="StkType"
                                                    pageSize={12}
                                                    initialValue={selectedstocktype ?? null}
                                                    selected={selectedstocktype ?? null}
                                                    type="stocktype"
                                                    onSelect={(item) => {
                                                        setselectedstocktype(item);
                                                        setFormState(prev => ({
                                                            ...prev,
                                                            values: {
                                                                ...prev.values,
                                                                StkType: item?.StkType
                                                            }
                                                        }));
                                                    }}
                                                />
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text style={styles.label}>Remark</Text>
                                                <TextInput
                                                    style={[styles.modalInput, { height: 45 }]}
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
                                                    if (!selectedmachine) {
                                                        Alert.alert("Validation", "Select Machine");
                                                        return;
                                                    }
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
                                                    if (!selectedstocktype) {
                                                        Alert.alert("Validation", "Select Stock Type");
                                                        return;
                                                    }
                                                    const yearNo = FormState.values.YearNo || getCurrentFinancialYear();
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
                        </SafeAreaView>
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
                <SafeAreaView
                    edges={['top']}
                    style={{
                        flex: 1,
                        backgroundColor: '#007EA7'
                    }}
                >

                    <StatusBar
                        style="light"
                        backgroundColor="#007EA7"
                    />
                    <View style={styles.modalContainer}>


                        <View style={styles.header}>

                            <TouchableOpacity
                                onPress={() => {
                                    setIsScanModalVisible(false);
                                    setIsCreelModalVisible(true);
                                }}
                            >
                                <Icon
                                    name="arrow-back"
                                    size={26}
                                    color="#fff"
                                />
                            </TouchableOpacity>

                            <View style={{ flex: 1, marginLeft: 15 }}>
                                <Text style={styles.headerTitle}>
                                    Issue Yarn
                                </Text>

                                <Text style={styles.headerSubTitle}>
                                    Scan carton or search manually
                                </Text>
                            </View>

                            <View style={styles.headerIcon}>
                                <Icon
                                    name="inventory"
                                    size={24}
                                    color="#fff"
                                />
                            </View>

                        </View>

                        <View style={styles.container}>
                            {isSaving && (
                                <View style={styles.loaderOverlay}>
                                    <ActivityIndicator size="large" color="#fff" />
                                </View>
                            )}

                            {isDelete && (
                                <View style={styles.loaderOverlay}>
                                    <ActivityIndicator size="large" color="#fff" />
                                </View>
                            )}

                            {/* 🔥 HEADER */}
                            {/* <HeaderBarwithBack
                            userName={username}
                            header={'Issue Yarn'}
                            subHeader={`Scan Cartons and issue yarn for Creel ${creelId}`}
                        /> */}

                            {/* 🔥 MAIN SWITCH */}
                            {!showList ? (
                                <>
                                    <View style={styles.topSwitchContainer}>
                                        {/* <TouchableOpacity
                                            style={[
                                                styles.switchCard,
                                                showManualSearch === false && styles.activeCard
                                            ]}
                                            onPress={() => {
                                                setShowManualSearch(false);
                                                setIsScanning(true); 
                                            }}
                                        >
                                            <Icon name="camera" size={22} color={showManualSearch === false ? "#fff" : "#007EA7"} />
                                            <Text style={[
                                                styles.switchText,
                                                showManualSearch === false && styles.activeText
                                            ]}>
                                                Scan Carton
                                            </Text>
                                        </TouchableOpacity> */}
                                        <TouchableOpacity
                                            style={[
                                                styles.switchCard,
                                                !showManualSearch && styles.activeCard,
                                                !showManualSearch && styles.activeCardShadow,
                                            ]}
                                            onPress={() => {
                                                setShowManualSearch(false);
                                                setIsScanning(true);
                                            }}
                                        >
                                            <Icon
                                                name="camera"
                                                size={22}
                                                color={!showManualSearch ? "#fff" : "#007EA7"}
                                            />

                                            <Text
                                                style={[
                                                    styles.switchText,
                                                    !showManualSearch && styles.activeText,
                                                ]}
                                            >
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
                                    {!showManualSearch && !isScanning && (
                                        <View style={styles.scannerCard}>

                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                                                <View style={styles.scanIconBox}>
                                                    <Icon
                                                        name="qr-code-scanner"
                                                        size={34}
                                                        color="#0B8BC2"
                                                    />
                                                </View>

                                                <View style={{ flex: 1, marginLeft: 15 }}>
                                                    <Text style={styles.scanTitle}>
                                                        QR Scanner
                                                    </Text>

                                                    <Text style={styles.scanSubTitle}>
                                                        Point camera to QR code
                                                    </Text>
                                                </View>

                                                <TouchableOpacity
                                                    style={styles.scanButton}
                                                    onPress={() => setIsScanning(true)}
                                                >
                                                    <Icon
                                                        name="photo-camera"
                                                        size={18}
                                                        color="#fff"
                                                    />

                                                    <Text style={styles.scanButtonText}>
                                                        START
                                                    </Text>

                                                </TouchableOpacity>

                                            </View>

                                        </View>
                                    )}
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
                                                            PrpCode: selectedItem.PrpCode,
                                                            Rate: selectedItem.Rate
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
                                    {/* {showManualSearch === false && (
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
                                )} */}
                                    {/* {isScanning && showManualSearch === false && (
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
                                )} */}
                                    {isScanning && (
                                        <Modal animationType="fade">
                                            <View style={{ flex: 1, backgroundColor: '#000' }}>
                                                <View style={styles.cameraHeader}>
                                                    <Text style={styles.cameraTitle}>Scan QR Code</Text>

                                                    <View style={{ width: 26 }} />
                                                </View>
                                                <View style={styles.cameraContainer}>
                                                    {/* {device && hasPermission && (
                                                    <CameraView
                                                        style={styles.camera}
                                                        device={device}
                                                        isActive={true}
                                                        codeScanner={codeScanner}
                                                    />
                                                )} */}
                                                    {permission?.granted && (
                                                        <CameraView
                                                            style={styles.camera}
                                                            facing="back"
                                                            barcodeScannerSettings={{
                                                                barcodeTypes: ['qr'],
                                                            }}
                                                            onBarcodeScanned={handleBarcodeScanned}
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
                                    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
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

                                        {/* <Text style={styles.cardTitle}>Carton Details</Text> */}

                                        {/* <View style={styles.card}>

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

                                        </View> */}

                                        <View style={styles.sectionCard}>

                                            <View style={styles.sectionHeader}>

                                                <View style={styles.sectionBar} />

                                                <Text style={styles.sectionTitle}>
                                                    Carton Details
                                                </Text>

                                            </View>

                                            {/* Carton Number */}

                                            <View style={styles.fieldContainer}>

                                                <Text style={styles.label}>
                                                    Carton Number
                                                </Text>

                                                <View style={styles.inputWrapper}>

                                                    <TextInput
                                                        value={CartonNo}
                                                        editable={false}
                                                        style={styles.input}
                                                        placeholder="Scan Carton Number"
                                                        placeholderTextColor="#A0A8B8"
                                                    />

                                                    {/* <Icon
                                                        name="qr-code-scanner"
                                                        size={22}
                                                        color="#0A88C8"
                                                    /> */}

                                                </View>

                                            </View>

                                            {/* Chees + Quantity */}

                                            <View style={styles.row}>

                                                <View style={styles.halfField}>

                                                    <Text style={styles.label}>
                                                        Chees
                                                    </Text>

                                                    <View style={styles.inputWrapper}>

                                                        <TextInput
                                                            value={getchees}
                                                            onChangeText={setchees}
                                                            keyboardType="numeric"
                                                            style={styles.input}
                                                            placeholder="0"
                                                        />

                                                        {/* <Icon
                                                            name="inventory-2"
                                                            size={20}
                                                            color="#0A88C8"
                                                        /> */}

                                                    </View>

                                                </View>

                                                <View style={{ width: 14 }} />

                                                <View style={styles.halfField}>

                                                    <Text style={styles.label}>
                                                        Quantity
                                                    </Text>

                                                    <View style={styles.inputWrapper}>

                                                        <TextInput
                                                            value={getavgwt}
                                                            onChangeText={setavgwt}
                                                            keyboardType="numeric"
                                                            style={styles.input}
                                                            placeholder="0.000"
                                                        />

                                                        {/* <Icon
                                                            name="scale"
                                                            size={20}
                                                            color="#0A88C8"
                                                        /> */}

                                                    </View>

                                                </View>

                                            </View>

                                            {/* Item */}

                                            <View style={styles.fieldContainer}>

                                                <Text style={styles.label}>
                                                    Item
                                                </Text>

                                                <View style={styles.inputWrapper}>

                                                    <TextInput
                                                        editable={false}
                                                        value={getScannedObj?.ItmName || ""}
                                                        style={styles.input}
                                                    />

                                                    {/* <Icon
                                                        name="inventory"
                                                        size={20}
                                                        color="#0A88C8"
                                                    /> */}

                                                </View>

                                            </View>

                                            {/* Merge */}

                                            <View style={styles.fieldContainer}>

                                                <Text style={styles.label}>
                                                    Merge
                                                </Text>

                                                <View style={styles.inputWrapper}>

                                                    <TextInput
                                                        editable={false}
                                                        value={getScannedObj?.MerName || ""}
                                                        style={styles.input}
                                                    />

                                                    {/* <Icon
                                                        name="merge-type"
                                                        size={20}
                                                        color="#0A88C8"
                                                    /> */}

                                                </View>

                                            </View>

                                            {/* Shade */}

                                            <View style={styles.fieldContainer}>

                                                <Text style={styles.label}>
                                                    Shade
                                                </Text>

                                                <View style={styles.inputWrapper}>

                                                    <TextInput
                                                        editable={false}
                                                        value={getScannedObj?.ShdName || ""}
                                                        style={styles.input}
                                                    />

                                                    {/* <Icon
                                                        name="palette"
                                                        size={20}
                                                        color="#0A88C8"
                                                    /> */}

                                                </View>

                                            </View>

                                            {/* Grade */}

                                            <View style={styles.fieldContainer}>

                                                <Text style={styles.label}>
                                                    Grade
                                                </Text>

                                                <View style={styles.inputWrapper}>

                                                    <TextInput
                                                        editable={false}
                                                        value={getScannedObj?.GrdName || ""}
                                                        style={styles.input}
                                                    />

                                                    {/* <Icon
                                                        name="verified"
                                                        size={20}
                                                        color="#0A88C8"
                                                    /> */}

                                                </View>

                                            </View>

                                        </View>

                                    </ScrollView>

                                    {/* 🔥 BUTTONS */}
                                    {/* <View style={styles.bottomBar}>
                                        <TouchableOpacity
                                            style={styles.secondaryBtn}
                                            // onPress={() => {
                                            //     setIsScanModalVisible(false);
                                            //     resetAllFields();
                                            // }}
                                            onPress={() => {
                                                setIsScanModalVisible(false);
                                                setIsCreelModalVisible(true);

                                                // resetAllFields();              
                                            }}
                                        >
                                            <Text style={styles.secondaryText}>Close</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.primaryBtn}
                                            onPress={() => {
                                                handleAddCarton();
                                                setShowList(true);
                                            }}
                                        >
                                            <Text style={styles.primaryText}>Submit</Text>
                                        </TouchableOpacity>
                                    </View> */}
                                    <View style={styles.bottomBar}>

                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={styles.closeButton}
                                            onPress={() => {
                                                setIsScanModalVisible(false);
                                                setIsCreelModalVisible(true);
                                            }}
                                        >
                                            <Icon
                                                name="close"
                                                size={20}
                                                color="#666"
                                                style={{ marginRight: 8 }}
                                            />

                                            <Text style={styles.closeButtonText}>
                                                Close
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={styles.submitButton}
                                            onPress={() => {
                                                handleAddCarton();
                                                setShowList(true);
                                            }}
                                        >
                                            <Icon
                                                name="check-circle"
                                                size={20}
                                                color="#fff"
                                                style={{ marginRight: 8 }}
                                            />

                                            <Text style={styles.submitButtonText}>
                                                Submit
                                            </Text>
                                        </TouchableOpacity>

                                    </View>
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
                                                    <Text style={styles.subText} numberOfLines={2}>
                                                        {item.ItmName} 
                                                    </Text>
                                                    <Text style={styles.subText}>
                                                        {item.MerName}
                                                    </Text>
                                                    <Text style={styles.subText}>
                                                        {item.ShdName} / {item.GrdName}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.rightSection}>
                                                <TouchableOpacity
                                                    style={styles.deleteIcon}
                                                    onPress={() => confirmcartondelete(item)}
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

                                    {/* <ScrollView contentContainerStyle={{ paddingBottom: 10 }}> */}
                                    <ScrollView
                                        style={{ maxHeight: 450 }}   // 🔥 IMPORTANT (adjust as needed)
                                        contentContainerStyle={{ paddingBottom: 10 }}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        {cartonSummary.map((item, index) => (
                                            <View key={index} style={styles.listCard}>

                                                {/* LEFT SIDE */}
                                                <View style={styles.leftSection}>
                                                    <View style={styles.indexCircle}>
                                                        <Text style={styles.indexText}>{index + 1}</Text>
                                                    </View>

                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.cartonNo}>
                                                            {item.cartonNo}
                                                        </Text>

                                                        <Text style={styles.subText} numberOfLines={2}>
                                                            {item.ItmName}/{item.MerName}
                                                        </Text>
                                                        <Text style={styles.subText}>
                                                            {item.MerName}
                                                        </Text>

                                                        <Text style={styles.subText}>
                                                            {item.ShdName} / {item.GrdName}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* RIGHT SIDE */}
                                                <View style={styles.rightSection}>
                                                    <TouchableOpacity
                                                        style={styles.deleteIcon}
                                                        // onPress={() => confirmcartondelete(item)}
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
                                                {cartonSummary
                                                    .reduce((sum, item) => sum + Number(item.qty || 0), 0)
                                                    .toFixed(3)
                                                }
                                            </Text>
                                        </View>

                                    </View>
                                    <View style={styles.bottomRow}>
                                        <TouchableOpacity
                                            style={styles.backBtn1}
                                            onPress={() => setShowList(false)}
                                        >
                                            <Text style={styles.backText}>＋ Add More</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.submitBtn}
                                            onPress={handleFinalSubmit}
                                        >
                                            <Text style={styles.submitText}>✈ Submit All</Text>
                                        </TouchableOpacity>
                                    </View>

                                </View>

                            )}

                        </View>
                    </View>
                </SafeAreaView>
            </Modal >

            <TouchableOpacity style={yarnmanagementsystemstyle.fabAdd}
                onPress={() => {
                    resetAllFields();

                    setShowList(false);
                    setCartonSummary([]);
                    setIsScanModalVisible(false);

                    setIsCreelModalVisible(true);
                }}
            >
                <Icon name="add" size={20} color="#fff" />
            </TouchableOpacity >

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
                getAllPropertyData={propertyData}
                setAllPropertyData={setAllPropertyData}
                FormState={FormState}
                setFormState={setFormState}
                getAllYearData={getAllYearData}
                setAllYearData={setAllYearData}
                token={token}
                fetchAllYeardata={fetchAllYeardata}
            />

        </>
    );
};
export default CreelManagementSystem;
