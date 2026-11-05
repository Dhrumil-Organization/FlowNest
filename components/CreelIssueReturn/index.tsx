import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from "axios";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
    useWindowDimensions,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { API } from "../../common/API/dynamicAPI";
import { fetchPropertyData } from '../../common/API/Functions';
import { API, PRINTSTICKER } from "../../common/API/dynamicAPI";
import AsyncStorage from "@/common/utils/compatibleStorage";
import { Snackbar } from '@/common/utils/snackbarCompat';

const CreelIssueReturn = ({ token, navigation }) => {
    const router = useRouter();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const isTablet = screenWidth >= 768;
    const isDesktop = screenWidth >= 1100;
    const contentWidth = isDesktop ? Math.min(screenWidth - 48, 1180) : screenWidth;
    const [search, setSearch] = useState("");

    const [filterVisible, setFilterVisible] = useState(false);
    const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
    const [yearPickerVisible, setYearPickerVisible] = useState(false);
    const [yearOptions, setYearOptions] = useState([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [propertyData, setPropertyData] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [propertySearch, setPropertySearch] = useState("");
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);
    const [cartonType, setCartonType] = useState("All");
    const [cartonStatus, setCartonStatus] = useState("All");
    const [creelData, setCreelData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [internalFilterVisible, setInternalFilterVisible] = useState(false);
    const [alertData, setAlertData] = useState({
        visible: false,
        message: "",
        type: "warning",
    });

    const [deleteModal, setDeleteModal] = useState(false);
    const [selectedDeleteItem, setSelectedDeleteItem] = useState(null);

    const [getPrinters, setPrinters] = useState([]);
    const [printer, setPrinter] = useState("");
    const [printerLoading, setPrinterLoading] = useState(false);
    const [printerError, setPrinterError] = useState("");
    const [printerModalVisible, setPrinterModalVisible] = useState(false);
    const [selectedPrinterStatus, setSelectedPrinterStatus] = useState("");
    const [printerSearch, setPrinterSearch] = useState("");
    const [pendingPrintItem, setPendingPrintItem] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const showWarning = msg =>
        setAlertData({
            visible: true,
            message: msg,
            type: "warning",
        });

    const showSuccess = msg =>
        setAlertData({
            visible: true,
            message: msg,
            type: "success",
        });

    const showError = msg =>
        setAlertData({
            visible: true,
            message: msg,
            type: "error",
        });

    // const getCurrentMonthDates = () => {
    //     const now = new Date();

    //     const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    //     const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    //     return { firstDay, lastDay };
    // };

    // const { firstDay, lastDay } = getCurrentMonthDates();

    // const [fromDate, setFromDate] = useState(firstDay);
    // const [toDate, setToDate] = useState(lastDay);

    const formatDate = (date) => {
        if (!date) return "";

        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();

        return `${day}-${month}-${year}`;
    };

    const getFinancialYearDates = (financialYear) => {

        if (!financialYear) return;

        const years = financialYear.split("-");

        const startYear = parseInt(years[0]);
        const endYear = parseInt(years[1]);

        // FROM DATE = 1 APRIL
        const fyStartDate = new Date(startYear, 3, 1);

        // TO DATE = 31 MARCH
        const fyEndDate = new Date(endYear, 2, 31);

        const today = new Date();

        // IF CURRENT FINANCIAL YEAR
        const currentYear = today.getFullYear();

        const currentFinancialYear =
            today.getMonth() >= 3
                ? `${currentYear}-${currentYear + 1}`
                : `${currentYear - 1}-${currentYear}`;

        // CURRENT FY => TO DATE = TODAY
        if (financialYear === currentFinancialYear) {

            setFromDate(fyStartDate);
            setToDate(today);

        } else {

            // OLD FY => FULL FINANCIAL YEAR
            setFromDate(fyStartDate);
            setToDate(fyEndDate);
        }
    };

    useEffect(() => {
        const y = new Date().getFullYear();
        const arr = [];
        for (let i = 0; i < 5; i++) {
            arr.push(`${y - i}-${y - i + 1}`);
        }

        setYearOptions(arr);
        setSelectedYear(arr[0]);

        // ✅ ADD THIS
        // setFromDate(null);
        // setToDate(null);

    }, []);

    useEffect(() => {
        if (!token) return;

        if (selectedYear) {
            getFinancialYearDates(selectedYear);
        }

    }, [token, selectedYear]);

    useEffect(() => {
        if (!token) return;
        const load = async () => {
            const data = await fetchPropertyData(token);
            setPropertyData(data || []);
            if (data?.length) setSelectedProperty(data[0]);
        };
        load();
    }, [token]);
    const fetchCreelReturnData = async () => {
        if (!selectedProperty) return;

        setLoading(true);

        try {
            const prpcode =
                typeof selectedProperty === "object"
                    ? selectedProperty?.PrpCode
                    : selectedProperty;

            const prptype =
                typeof selectedProperty === "object"
                    ? selectedProperty?.PrpOf
                    : selectedProperty;

            const yearno = selectedYear?.slice(-2); // ✅ YOU WANT "27"

            // ✅ MINIMAL PAYLOAD FIRST
            const payload = {
                prpcode,
                prptype,
                yearno,
                strcode: "002",
                txntype: "creel_issue_return",
                frmdate: formatDate(fromDate),
                todate: formatDate(toDate)
            };

            console.log("🚀 FINAL PAYLOAD:", payload);
            console.log(`${API}/api/get_creel_issue_return_browse`);

            const res = await axios.post(`${API}/api/get_creel_issue_return_browse`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-with': 'XMLHttpRequest',
                }
            });

            console.log("✅ FULL RESPONSE:", res.data);

            // ✅ HANDLE ALL POSSIBLE RESPONSE STRUCTURES
            const rawData =
                res?.data?.response?.data ||
                res?.data?.data ||
                res?.data?.result ||
                [];

            if (Array.isArray(rawData) && rawData.length > 0) {
                setCreelData(rawData);
            } else {
                console.log("⚠️ No data returned from API");
                setCreelData([]);
            }
        } catch (error) {
            console.log("❌ API ERROR:", error?.response?.data || error.message);
            setCreelData([]);
        } finally {
            setLoading(false);
        }
    };

    const handlebrowsedeletedata = async (item) => {

        setLoading(true);

        try {

            const prpcode = typeof selectedProperty === "object"
                ? selectedProperty?.PrpCode
                : selectedProperty;

            const yearno = selectedYear?.slice(-2);

            const payload = {
                prpcode,
                yearno,
                strcode: "002",
                txntype: "creel_issue_return",
                uid: item?.UId,
            };

            console.log("DELETE PAYLOAD ::", payload)

            const res = await axios.post(
                `${API}/api/delete_creel_issue_return`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        "X-Requested-with": "XMLHttpRequest",
                    },
                }
            );

            console.log("DELETE RESPONSE ::", res)

            const resData = res?.data;

            if (resData?.success === true) {

                // REMOVE CARD
                setCreelData(prev =>
                    prev.filter(x => x.UId !== item?.UId)
                );

                showSuccess(
                    resData?.message ||
                    `${item?.IssRNo} deleted successfully`
                );

            } else if (resData?.success === false) {

                showWarning(
                    resData?.message ||
                    "Delete failed"
                );

            } else {

                showError(
                    resData?.message ||
                    "Something went wrong"
                );
            }

        } catch (error) {

            console.log("DELETE ERROR:", error?.response?.data || error.message);

            showError(
                error?.response?.data?.message ||
                error?.message ||
                "Delete failed."
            );

        } finally {
            setLoading(false);
        }
    };

    const filteredCreelData = creelData.filter(item => {

        const matchSearch =
            search === "" ||
            item?.IssRNo?.toLowerCase().includes(search.toLowerCase());

        const matchType =
            cartonType === "All" ||
            item?.IsCartonType === cartonType;

        const matchStatus =
            cartonStatus === "All" ||
            item?.IsCartonStatus === cartonStatus;

        return matchSearch && matchType && matchStatus;
    });

    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };

    const getPrinterHeaders = () => ({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "x-api-key": "PRINT_SECRET_123",
    });

    const getPrintersUrl = () =>
        `${String(API).replace(/\/$/, "")}/api/printers`;

    const normalizePrinterList = (raw) => {
        const list = raw?.printers || raw?.data?.printers || raw?.data || raw || [];

        if (!Array.isArray(list)) return [];

        return list.map(item => ({
            ...item,
            Name: item.Name || item.name,
            StatusText: item.StatusText || item.status || "Idle",
        }));
    };

    const selectPrinter = async (item) => {
        setPrinter(item.Name);
        setSelectedPrinterStatus(item.StatusText);

        await AsyncStorage.setItem(
            "lastSelectedPrinter",
            item.Name
        );

        setPrinterModalVisible(false);
    };

    const getPrinterStatusColor = (status) => {
        if (status === "Offline") return "#DC2626";
        return "#16A34A";
    };

    const getAllPrinters = async () => {

        setPrinterLoading(true);

        try {

            const res = await axios.get(
                getPrintersUrl(),
                {
                    headers: getPrinterHeaders()
                }
            );

            const list = normalizePrinterList(res.data);

            setPrinters(list);

            const last = await AsyncStorage.getItem(
                "lastSelectedPrinter"
            );

            if (last) {
                const p = list.find(x => x.Name === last);

                if (p) {
                    setPrinter(p.Name);
                    setSelectedPrinterStatus(
                        p.StatusText
                    );
                }
            }

        } catch (e) {

            setPrinterError("Unable to load printers");

        } finally {

            setPrinterLoading(false);

        }
    };



    // const printBrowseSticker = async (item, selectedPrinterName = printer) => {
    //     if (!item) {
    //         AppAlert.alert("Print", "Printing data not found.");
    //         return;
    //     }

    //     const printerToUse = selectedPrinterName || printer;

    //     if (!printerToUse) {
    //         setPendingPrintItem(item);
    //         if (getPrinters.length === 0) {
    //             await getAllPrinters();
    //         }
    //         setPrinterModalVisible(true);
    //         return;
    //     }

    //     try {
    //         setIsPrinting(true);

    //         const params = {
    //             data: [item],
    //             IskgQty: 0,
    //             printype: "Print",
    //             PrintFormat: 5,
    //             printerName: printerToUse,
    //             txntype: "creel_issue_return"
    //         };

    //         console.log("BROWSE PRINT ITEM ::", item);
    //         console.log("BROWSE PRINT PARAMS ::", params);

    //         const response = await axios.post(
    //             PRINTSTICKER,
    //             params,
    //             { headers: getPrinterHeaders() }
    //         );

    //         const res = response?.data;

    //         if (res?.success) {
    //             AppAlert.alert(
    //                 "Print Successful",
    //                 `${res?.printed ?? 1} label(s) sent to printer.`
    //             );
    //         } else {
    //             AppAlert.alert(
    //                 "Print Failed",
    //                 res?.message || "Operation failed."
    //             );
    //         }
    //     } catch (error) {
    //         console.log(
    //             "BROWSE PRINT ERROR ::",
    //             error?.response?.data || error?.message
    //         );

    //         AppAlert.alert(
    //             "Print Failed",
    //             error?.response?.data?.error ||
    //             error?.response?.data?.message ||
    //             error?.message ||
    //             "Print failed."
    //         );
    //     } finally {
    //         setIsPrinting(false);
    //         setPendingPrintItem(null);
    //     }
    // };


    const printBrowseSticker = async (item, selectedPrinterName = printer) => {
        if (!item) {
            AppAlert.alert('Printing sticker data is empty');
            return false;
        }
        const printerToUse = selectedPrinterName || printer;

        const yearno = (() => {
            const issRDate = item?.IssRDate;

            if (!issRDate) {
                return "0";
            }

            const date = new Date(issRDate);

            if (isNaN(date.getTime())) {
                return "0";
            }

            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            // April to March Financial Year
            const financialYearEnd =
                month >= 4 ? year + 1 : year;

            return String(financialYearEnd).slice(-2);
        })();

        console.log("IssRDate ::", item?.IssRDate);
        console.log("Financial Year No ::", yearno);

        if (
            typeof printerToUse === 'undefined' ||
            printerToUse == null ||
            printerToUse === ''
        ) {
            AppAlert.alert('Please select printer first.');
            return false;
        }

        setIsLoading(true);

        console.log('printsticker function :', item);

        let temppayloadObj = new Object();

        if (Object.keys(item).length > 0) {

            // =========================================================
            // 🔥 SAME STATIC PRINT DATA STRUCTURE
            // 🔥 ONLY SOURCE = SELECTED BROWSE CARD "item"
            // =========================================================
            temppayloadObj = {
                UId: item.UId ?? "0",
                TranDate: "0",
                PrpCode: item.PrpCode ?? "",
                StrCode: item.StrCode ?? "0",
                ItmCode: item.ItmCode ?? "0",
                MerCode: item.MerCode ?? "0",
                ShdCode: item.ShdCode ?? "0",
                GrdCode: item.GrdCode ?? "0",
                Denier: item.Denier ?? "0",
                DsnCode: "0",
                CartNo: item.CartNo ?? "",
                Wt: item.TotQty ?? "0",
                Chees: item.TotPcs ?? "",
                IsAuto: "0",
                GrossWt: "0",
                PUId: item.UId ?? "0",
                PSrNo: item.IssSrNo ?? "0",
                PSubSr: item.IssSubSr ?? "0",
                TranType: "",
                TranName: " ",
                StkType: item.StkType ?? "",
                StkDate: "0",
                SrNo: item.IssSrNo ?? "0",
                UsrCode: "0",
                StrName: "",
                ItmName: item.ItmName ?? "",
                MerName: item.MerName ?? "",
                ShdName: item.ShdName ?? "",
                GrdName: item.GrdName ?? "",
                DnsName: "",
                Stktype: item.StkType ?? "",
                nStkDate: "",
                yearno: yearno ?? "0",
                IskgQty: "0",
                Rate: "0",
                MItmCode: "0",
                MItmName: ""
            };

            console.log(
                "SELECTED BROWSE CARD ::",
                item
            );

            console.log(
                "PRINT PAYLOAD OBJECT ::",
                temppayloadObj
            );
            const params = {
                data: [temppayloadObj],

                IskgQty: 0,

                printype: "Print",

                PrintFormat: 5,

                printerName: printerToUse,

                txntype: "creel_issue_return"
            };

            console.log(
                "BROWSE PRINT PARAMS ::",
                params
            );
            // return;
            axios.post(
                PRINTSTICKER,
                params,
                {
                    headers: getPrinterHeaders()
                }
            )
                .then(response => {

                    setIsLoading(false);

                    const res = response.data;

                    if (res.success) {

                        Snackbar.show({
                            text: `✅ ${res.printed ?? 1} label(s) sent to printer.`,
                            duration: Snackbar.LENGTH_INDEFINITE,
                            backgroundColor: 'green',
                            action: {
                                text: 'OK',
                                textColor: 'white'
                            },
                        });

                        AppAlert.alert(
                            'Print Successful',
                            `✅ ${res.printed ?? 1} label(s) sent to printer.`
                        );

                    } else {

                        Snackbar.show({
                            text: res.message || 'Operation failed',
                            duration: Snackbar.LENGTH_INDEFINITE,
                            backgroundColor: 'red',
                            action: {
                                text: 'OK',
                                textColor: 'white'
                            },
                        });

                        AppAlert.alert(
                            res.message || 'Operation failed'
                        );
                    }
                })
                .catch(error => {

                    setIsLoading(false);

                    const errorMessage =
                        error?.response?.data?.error ||
                        error?.response?.data?.message ||
                        error?.message ||
                        'Print failed';

                    console.log(
                        "BROWSE PRINT ERROR ::",
                        error?.response?.data || error
                    );

                    Snackbar.show({
                        text: errorMessage,
                        duration: Snackbar.LENGTH_LONG,
                        backgroundColor: 'red',
                        action: {
                            text: 'OK',
                            textColor: 'white'
                        },
                    });

                    AppAlert.alert(
                        errorMessage
                    );
                });

        } else {

            setIsLoading(false);

            Snackbar.show({
                text: 'printing sticker data is empty',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: {
                    text: 'OK',
                    textColor: '#fff'
                },
            });

            AppAlert.alert(
                'printing sticker data is empty'
            );
        }
    };

    const handleBrowsePrint = async (item) => {
        setPendingPrintItem(item);

        if (printer) {
            await printBrowseSticker(item, printer);
            return;
        }

        if (getPrinters.length === 0) {
            await getAllPrinters();
        }

        setPrinterModalVisible(true);
    };

    return (
        <>
            <StatusBar
                style="light"
                backgroundColor="#007EA7"
                translucent={false}
            />
            <SafeAreaView
                edges={['top']}
                style={{ flex: 1, backgroundColor: "#0F6C7B" }}
            >

                <View style={{ flex: 1, backgroundColor: "#F5F7FB" }}>

                    {/* HEADER */}
                    <LinearGradient colors={['#0F6C7B', '#13879A']} style={styles.header}>
                        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                            <Icon name="arrow-back-ios-new" size={18} color="#fff" />
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>Creel Issue Return</Text>

                        <TouchableOpacity onPress={() => setFilterVisible(true)} style={styles.headerFilterBtn}>
                            <Icon name="tune" size={21} color="#fff" />
                        </TouchableOpacity>
                    </LinearGradient>

                    {/* SEARCH */}
                    <View style={[styles.searchBox, { width: isDesktop ? Math.min(screenWidth - 48, 1180) : Math.max(0, screenWidth - 32), alignSelf: "center" }]}>
                        <Icon name="search" size={20} color="#000" />
                        <TextInput
                            placeholder="Search..."
                            placeholderTextColor="#000"
                            value={search}
                            onChangeText={setSearch}
                            style={styles.searchInput}
                        />
                        {/* 🔥 FUNNEL ICON */}
                        <TouchableOpacity onPress={() => setInternalFilterVisible(true)}>
                            <Icon name="filter-list" size={22} color="#0F6C7B" />
                        </TouchableOpacity>
                    </View>

                    {/* 🔥 SELECTED FILTERS */}
                    <View style={[styles.chipContainer, { width: isDesktop ? Math.min(screenWidth - 48, 1180) : screenWidth, alignSelf: "center" }]}>

                        {/* PROPERTY */}
                        <TouchableOpacity
                            style={[styles.chip]}
                            onPress={() => setFilterVisible(true)}
                        >
                            <Icon name="business" size={14} color="#0F6C7B" />
                            <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">
                                {selectedProperty?.LngName || "Select Property"}
                            </Text>
                            <Icon name="edit" size={14} color="#0F6C7B" />
                        </TouchableOpacity>

                        {/* YEAR */}
                        <View style={[styles.chip]}>
                            <Icon name="event" size={14} color="#0F6C7B" />
                            <Text style={styles.chipText}>
                                {selectedYear || "Year"}
                            </Text>
                        </View>

                        {/* 🔥 DATE RANGE (CONDITIONAL) */}
                        {(fromDate || toDate) && (
                            <View style={[styles.chip]}>
                                <Icon name="date-range" size={14} color="#0F6C7B" />
                                <Text style={styles.chipText}>
                                    {fromDate ? formatDate(fromDate) : "From"}
                                    {" - "}
                                    {toDate ? formatDate(toDate) : "To"}
                                </Text>
                            </View>
                        )}
                    </View>
                    {/* FILTER MODAL */}
                    <Modal transparent visible={filterVisible} animationType="slide">
                        <View style={styles.overlay}>
                            <View style={styles.sheet}>

                                <View style={styles.dragBar} />

                                <View style={styles.modalHeader}>
                                    <Text style={styles.title}>Filter Records</Text>

                                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedProperty(null);
                                                setSelectedYear(yearOptions[0]);
                                                setFromDate(null);
                                                setToDate(null);
                                            }}
                                            style={{ marginRight: 15 }}
                                        >
                                            <Text style={styles.resetText}>Reset</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={() => setFilterVisible(false)}>
                                            <Icon name="close" size={22} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* PROPERTY */}
                                <Text style={styles.label}>Property</Text>
                                <TouchableOpacity style={styles.bigInput}
                                    onPress={() => setPropertyPickerVisible(true)}>
                                    <Text style={styles.inputText}>
                                        {selectedProperty?.LngName || "All"}
                                    </Text>
                                    <Icon name="keyboard-arrow-down" size={20} />
                                </TouchableOpacity>

                                {/* YEAR */}
                                <Text style={styles.label}>Year</Text>
                                <TouchableOpacity style={styles.bigInput}
                                    onPress={() => setYearPickerVisible(true)}>
                                    <Text style={styles.inputText}>
                                        {selectedYear || "All"}
                                    </Text>
                                    <Icon name="keyboard-arrow-down" size={20} />
                                </TouchableOpacity>

                                {/* DATE */}
                                <Text style={styles.label}>Issue Date Range</Text>

                                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                    <TouchableOpacity
                                        style={[styles.dateBox, { marginRight: 6 }]}
                                        onPress={() => setShowFromPicker(true)}
                                    >
                                        <Icon name="calendar-today" size={16} color="#666" />
                                        <Text style={styles.inputText}>
                                            {formatDate(fromDate) || "From Date"}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.dateBox, { marginLeft: 6 }]}
                                        onPress={() => setShowToPicker(true)}
                                    >
                                        <Icon name="calendar-today" size={16} color="#666" />
                                        <Text style={styles.inputText}>
                                            {formatDate(toDate) || "To Date"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* APPLY */}
                                <TouchableOpacity style={styles.applyBtnNew}
                                    onPress={() => {
                                        fetchCreelReturnData();
                                        setFilterVisible(false);
                                    }}>
                                    <Text style={styles.applyText}>Apply Filters</Text>
                                </TouchableOpacity>

                            </View>
                        </View>

                        {/* DATE PICKERS */}
                        {showFromPicker && (
                            <DateTimePicker
                                value={fromDate || new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowFromPicker(false);

                                    if (event.type === "set" && selectedDate) {
                                        setFromDate(selectedDate);
                                    }
                                }}
                            />
                        )}

                        {showToPicker && (
                            <DateTimePicker
                                value={toDate || new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowToPicker(false);

                                    if (event.type === "set" && selectedDate) {
                                        setToDate(selectedDate);
                                    }
                                }}
                            />
                        )}

                    </Modal>
                    <Modal transparent visible={internalFilterVisible} animationType="slide">
                        <View style={styles.overlay}>
                            <View style={styles.sheet}>

                                <View style={styles.modalHeader}>
                                    <Text style={styles.title}>Filter</Text>

                                    <TouchableOpacity onPress={() => setInternalFilterVisible(false)}>
                                        <Icon name="close" size={22} />
                                    </TouchableOpacity>
                                </View>

                                {/* 🔥 CARTON TYPE */}
                                <Text style={styles.label}>Carton Type</Text>
                                <View style={styles.tabContainer}>
                                    {["All", "Single", "Mix"].map((item) => (
                                        <TouchableOpacity
                                            key={item}
                                            style={[
                                                styles.tabBtn,
                                                cartonType === item && styles.activeTab
                                            ]}
                                            onPress={() => setCartonType(item)}
                                        >
                                            <Text style={[
                                                styles.tabText,
                                                cartonType === item && styles.activeText
                                            ]}>
                                                {item}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* 🔥 CARTON STATUS */}
                                <Text style={styles.label}>Carton Status</Text>
                                <View style={styles.tabContainer}>
                                    {["All", "Open", "Closed"].map((item) => (
                                        <TouchableOpacity
                                            key={item}
                                            style={[
                                                styles.tabBtn,
                                                cartonStatus === item && styles.activeTab
                                            ]}
                                            onPress={() => setCartonStatus(item)}
                                        >
                                            <Text style={[
                                                styles.tabText,
                                                cartonStatus === item && styles.activeText
                                            ]}>
                                                {item}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* APPLY */}
                                <TouchableOpacity
                                    style={styles.applyBtnNew}
                                    onPress={() => setInternalFilterVisible(false)}
                                >
                                    <Text style={styles.applyText}>Apply</Text>
                                </TouchableOpacity>

                            </View>
                        </View>
                    </Modal>
                    {/* PROPERTY PICKER */}
                    <Modal visible={propertyPickerVisible} animationType="slide">
                        <SafeAreaView
                            edges={['top']}
                            style={{ flex: 1, backgroundColor: "#fff" }}
                        >
                            <View style={{ flex: 1, backgroundColor: "#fff" }}>

                                <View style={styles.pickerHeader}>
                                    <TouchableOpacity onPress={() => {
                                        setPropertyPickerVisible(false);
                                        setPropertySearch(""); // ✅ CLEAR SEARCH
                                    }}>
                                        <Icon name="arrow-back-ios" size={20} color="#000000" />
                                    </TouchableOpacity>

                                    <Text style={styles.pickerTitle}>Select Property</Text>
                                    <View style={{ width: 20 }} />
                                </View>

                                <View style={styles.pickerSearch}>
                                    <Icon name="search" size={18} color="#000000" />
                                    <TextInput
                                        placeholder="Search property..."
                                        placeholderTextColor="#000"
                                        value={propertySearch}
                                        onChangeText={setPropertySearch}
                                        style={{ flex: 1 }}
                                    />
                                </View>

                                <FlatList
                                    data={propertyData.filter(p =>
                                        p.LngName.toLowerCase().includes(propertySearch.toLowerCase())
                                    )}
                                    keyExtractor={(i) => i.PrpCode}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity style={styles.pickerItem}
                                            onPress={() => {
                                                setSelectedProperty(item);
                                                setPropertyPickerVisible(false);
                                                setPropertySearch(""); // ✅ CLEAR SEARCH
                                            }}>
                                            <Text style={{ color: '#000' }}>{item.LngName}</Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </SafeAreaView>
                    </Modal >

                    {/* YEAR PICKER */}
                    < Modal visible={yearPickerVisible} animationType="slide" >
                        <SafeAreaView
                            edges={['top']}
                            style={{ flex: 1, backgroundColor: "#fff" }}
                        >
                            <View style={{ flex: 1, backgroundColor: "#fff" }}>

                                <View style={styles.pickerHeader}>
                                    <TouchableOpacity onPress={() => setYearPickerVisible(false)}>
                                        <Icon name="arrow-back-ios" size={20} color="#000000" />
                                    </TouchableOpacity>

                                    <Text style={styles.pickerTitle}>Select Year</Text>
                                    <View style={{ width: 20 }} />
                                </View>

                                <FlatList
                                    data={yearOptions}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity style={styles.pickerItem}
                                            onPress={() => {
                                                setSelectedYear(item);
                                                setYearPickerVisible(false);
                                            }}>
                                            <Text style={{ color: '#000' }}>{item}</Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </SafeAreaView>
                    </Modal >
                    {/* 🔥 DATA LIST */}
                    <FlatList
                        data={filteredCreelData}
                        keyExtractor={(item) => item.UId.toString()}
                        contentContainerStyle={[
                            styles.listContent,
                            isDesktop && styles.listContentDesktop,
                            { width: "100%", alignSelf: "center" }
                        ]}

                        renderItem={({ item }) => {

                            const borderColor = "#13879A";

                            return (
                                <TouchableOpacity
                                    style={[styles.ledgerCard, { borderLeftColor: borderColor }]}
                                    onPress={() => {
                                        // navigation.navigate("CreelIssueReturnModifyEntry", {
                                        //     creelData: item,
                                        //     token: token,
                                        //     selectedProperty: selectedProperty,
                                        //     selectedYear: selectedYear
                                        // });

                                        router.push({
                                            pathname: '/CreelIssueReturnModifyEntry',
                                            params: {
                                                creelData: JSON.stringify(item),
                                                token: token,
                                                selectedProperty: JSON.stringify(selectedProperty),
                                                selectedYear: selectedYear
                                            }
                                        });
                                    }}
                                >

                                    {/* TOP SECTION */}
                                    <View style={styles.rowBetween}>

                                        {/* LEFT DATE */}
                                        <Text style={styles.dateText}>
                                            {item.IssRDate}
                                        </Text>

                                        {/* RIGHT SIDE */}
                                        <View style={{ alignItems: "flex-end" }}>

                                            {/* ISSR NO */}
                                            <View style={styles.refBadge}>
                                                <Text style={styles.refText}>
                                                    {item.IssRNo}
                                                </Text>
                                            </View>

                                        </View>

                                    </View>

                                    {/* TITLE */}
                                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                                        <Text style={styles.labelText}>Stock Type:</Text>
                                        <Text style={styles.valueText}>{item.StkType}</Text>
                                    </View>

                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            marginTop: 8,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <Text style={styles.smallLabel1}>Carton No:</Text>

                                        <Text
                                            style={[
                                                styles.amount1,
                                                {
                                                    color: "#000",
                                                    marginLeft: 6,
                                                },
                                            ]}
                                        >
                                            {item.CartNo || 0}
                                        </Text>
                                    </View>

                                    {/* BOTTOM */}
                                    <View style={styles.rowBetween}>
                                        <View style={{ flexDirection: "row", gap: 20 }}>
                                            <View>
                                                <Text style={styles.smallLabel}>Qty</Text>
                                                <Text style={[styles.amount, { color: "#13879A" }]}>
                                                    {item.TotQty || 0}
                                                </Text>
                                            </View>

                                            <View>
                                                <Text style={styles.smallLabel}>Pcs</Text>
                                                <Text style={[styles.amount, { color: "#13879A" }]}>
                                                    {item.TotPcs || 0}
                                                </Text>
                                            </View>

                                        </View>
                                    </View>

                                    {/* ACTION BUTTONS */}
                                    <View style={styles.cardActionRow}>
                                        {Number(item?.IsCartonStatus) === 1 && (
                                            <TouchableOpacity
                                                onPress={() => handleBrowsePrint(item)}
                                                disabled={isPrinting}
                                                style={styles.printBtn}
                                            >
                                                <Icon name="print" size={18} color="#fff" />
                                            </TouchableOpacity>
                                        )}

                                        {/* <TouchableOpacity
                                            onStartShouldSetResponder={() => true}
                                            onPress={() => {
                                                setSelectedDeleteItem(item);
                                                setDeleteModal(true);
                                            }}
                                            style={styles.deleteBtn}
                                        >
                                            <Icon name="delete" size={18} color="#fff" />
                                        </TouchableOpacity> */}

                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedDeleteItem(item);
                                                setDeleteModal(true);
                                            }}
                                            style={styles.deleteBtn}
                                        >
                                            <Icon name="delete" size={18} color="#fff" />
                                        </TouchableOpacity>
                                    </View>

                                </TouchableOpacity>


                            );
                        }}
                    />
                    {/* 🔥 FLOATING ADD BUTTON */}
                    <View style={styles.fabContainer}>
                        <TouchableOpacity
                            style={styles.fab}
                            onPress={() =>
                                // navigation.navigate("CreelIssueReturnEntry", {
                                //     creelData: null,
                                //     token: token,
                                //     selectedProperty: selectedProperty,   // ✅ ADD THIS
                                //     selectedYear: selectedYear           // ✅ ADD THIS
                                // })
                                router.push({
                                    pathname: '/CreelIssueReturnEntry',
                                    params: {
                                        creelData: null,
                                        token: token,
                                        selectedProperty: JSON.stringify(selectedProperty),   // ✅ ADD THIS
                                        selectedYear: selectedYear
                                    }
                                })
                            }

                        >
                            <Icon name="add" size={26} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* PRINTER SELECTION FOR BROWSE CARD PRINT */}
                    <Modal
                        transparent
                        visible={printerModalVisible}
                        animationType="slide"
                        onRequestClose={() => {
                            setPrinterModalVisible(false);
                            setPrinterSearch("");
                            setPendingPrintItem(null);
                        }}
                    >
                        <View style={styles.printerOverlay}>
                            <View style={styles.printerSheet}>
                                <View style={styles.printerHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.printerTitle}>Select Printer</Text>
                                        {pendingPrintItem?.IssRNo ? (
                                            <Text style={styles.printerSubTitle}>
                                                {pendingPrintItem.IssRNo} • {pendingPrintItem.CartNo || ""}
                                            </Text>
                                        ) : null}
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => {
                                            setPrinterModalVisible(false);
                                            setPrinterSearch("");
                                            setPendingPrintItem(null);
                                        }}
                                        style={styles.printerCloseBtn}
                                    >
                                        <Icon name="close" size={20} color="#111827" />
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    placeholder="Search printer..."
                                    placeholderTextColor="#777"
                                    value={printerSearch}
                                    onChangeText={setPrinterSearch}
                                    style={styles.printerSearchInput}
                                />

                                {printerLoading ? (
                                    <View style={styles.printerEmptyBox}>
                                        <Text style={styles.printerEmptyText}>Loading printers...</Text>
                                    </View>
                                ) : printerError ? (
                                    <View style={styles.printerEmptyBox}>
                                        <Text style={styles.printerErrorText}>{printerError}</Text>
                                        <TouchableOpacity
                                            onPress={getAllPrinters}
                                            style={styles.printerRetryBtn}
                                        >
                                            <Text style={styles.printerRetryText}>Retry</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <FlatList
                                        data={getPrinters.filter(p =>
                                            String(p?.Name || "")
                                                .toLowerCase()
                                                .includes(printerSearch.toLowerCase())
                                        )}
                                        keyExtractor={(p, index) => `${p?.Name || "printer"}-${index}`}
                                        keyboardShouldPersistTaps="handled"
                                        renderItem={({ item: printerItem }) => (
                                            <TouchableOpacity
                                                onPress={async () => {
                                                    const selectedName = printerItem?.Name || "";

                                                    setPrinter(selectedName);
                                                    setSelectedPrinterStatus(
                                                        printerItem?.StatusText || "Idle"
                                                    );

                                                    await AsyncStorage.setItem(
                                                        "lastSelectedPrinter",
                                                        selectedName
                                                    );

                                                    const printItem = pendingPrintItem;

                                                    setPrinterModalVisible(false);
                                                    setPrinterSearch("");

                                                    if (printItem && selectedName) {
                                                        await printBrowseSticker(
                                                            printItem,
                                                            selectedName
                                                        );
                                                    }
                                                }}
                                                style={[
                                                    styles.printerItem,
                                                    printer === printerItem?.Name &&
                                                    styles.printerItemSelected
                                                ]}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.printerName}>
                                                        {printerItem?.Name || "Unnamed Printer"}
                                                    </Text>

                                                    <Text
                                                        style={[
                                                            styles.printerStatus,
                                                            {
                                                                color: getPrinterStatusColor(
                                                                    printerItem?.StatusText
                                                                )
                                                            }
                                                        ]}
                                                    >
                                                        {printerItem?.StatusText || "Idle"}
                                                    </Text>
                                                </View>

                                                {printer === printerItem?.Name && (
                                                    <Icon
                                                        name="check-circle"
                                                        size={24}
                                                        color="#0F6C7B"
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        )}
                                        ListEmptyComponent={
                                            <View style={styles.printerEmptyBox}>
                                                <Icon name="print-disabled" size={32} color="#9CA3AF" />
                                                <Text style={styles.printerEmptyText}>
                                                    No printer found
                                                </Text>
                                            </View>
                                        }
                                    />
                                )}
                            </View>
                        </View>
                    </Modal>

                    <Modal transparent visible={deleteModal} animationType="fade">
                        <View style={styles.alertOverlay}>
                            <View style={styles.alertBox}>

                                <Icon
                                    name="delete"
                                    size={45}
                                    color="#F44336"
                                />

                                <Text style={styles.alertTitle}>
                                    Delete Confirmation
                                </Text>

                                <Text style={styles.alertMessage}>
                                    Are you sure you want to delete{" "}
                                    {selectedDeleteItem?.IssRNo} ?
                                </Text>

                                <View style={styles.confirmRow}>

                                    {/* NO BUTTON */}
                                    <TouchableOpacity
                                        style={[
                                            styles.confirmBtn,
                                            { backgroundColor: "#9E9E9E" }
                                        ]}
                                        onPress={() => {
                                            setDeleteModal(false);
                                            setSelectedDeleteItem(null);
                                        }}
                                    >
                                        <Text style={styles.confirmBtnText}>
                                            No
                                        </Text>
                                    </TouchableOpacity>

                                    {/* YES BUTTON */}
                                    <TouchableOpacity
                                        style={[
                                            styles.confirmBtn,
                                            { backgroundColor: "#F44336" }
                                        ]}
                                        onPress={() => {
                                            setDeleteModal(false);

                                            if (selectedDeleteItem) {
                                                handlebrowsedeletedata(selectedDeleteItem);
                                            }
                                        }}
                                    >
                                        <Text style={styles.confirmBtnText}>
                                            Yes
                                        </Text>
                                    </TouchableOpacity>

                                </View>

                            </View>
                        </View>
                    </Modal>

                    <Modal transparent visible={alertData.visible} animationType="fade">
                        <View style={styles.alertOverlay}>
                            <View style={styles.alertBox}>

                                <Icon
                                    name={
                                        alertData.type === "success"
                                            ? "check-circle"
                                            : alertData.type === "error"
                                                ? "error"
                                                : "warning"
                                    }
                                    size={42}
                                    color={
                                        alertData.type === "success"
                                            ? "#4CAF50"
                                            : alertData.type === "error"
                                                ? "#F44336"
                                                : "#FFA000"
                                    }
                                />

                                <Text style={styles.alertTitle}>
                                    {
                                        alertData.type === "success"
                                            ? "Success"
                                            : alertData.type === "error"
                                                ? "Error"
                                                : "Warning"
                                    }
                                </Text>

                                <Text style={styles.alertMessage}>
                                    {alertData.message}
                                </Text>

                                <TouchableOpacity
                                    onPress={() =>
                                        setAlertData({
                                            visible: false,
                                            message: "",
                                            type: "warning"
                                        })
                                    }
                                    style={styles.alertBtn}
                                >
                                    <Text style={{ color: "#fff", fontWeight: "700" }}>
                                        OK
                                    </Text>
                                </TouchableOpacity>

                            </View>
                        </View>
                    </Modal>

                </View >
            </SafeAreaView>
        </>
    );
};

export default CreelIssueReturn;

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F4F7FA",
    },
    header: {
        minHeight: 74,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: "#0F6C7B",
    },
    headerSide: {
        width: 42,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        flex: 1,
        color: "#fff",
        fontSize: 20,
        fontWeight: "800",
        textAlign: "center",
        marginHorizontal: 10,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "rgba(255,255,255,0.16)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerFilterBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    searchSection: {
        width: "100%",
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 4,
    },
    searchBox: {
        height: 54,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5EBEF",
        shadowColor: "#0F2027",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        minWidth: 0,
        marginHorizontal: 10,
        color: "#111827",
        fontSize: 16,
        paddingVertical: 0,
    },
    chipContainer: {
        width: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
    },
    chip: {
        maxWidth: "100%",
        minHeight: 34,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F5F7",
        borderWidth: 1,
        borderColor: "#D4ECEF",
        borderRadius: 17,
        paddingHorizontal: 11,
        paddingVertical: 6,
        marginRight: 7,
        marginBottom: 6,
    },
    chipText: {
        marginHorizontal: 6,
        fontSize: 12,
        fontWeight: "600",
        color: "#17343B",
        flexShrink: 1,
        maxWidth: 300,
    },
    list: {
        flex: 1,
    },
    listContent: {
        width: "100%",
        alignSelf: "center",
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 110,
    },
    listContentDesktop: {
        maxWidth: 1180,
    },
    ledgerCard: {
        width: "100%",
        backgroundColor: "#fff",
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderColor: "#13879A",
        shadowColor: "#102A33",
        shadowOpacity: 0.07,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    dateText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#52636A",
    },
    refBadge: {
        maxWidth: "65%",
        backgroundColor: "#F1F5F7",
        borderRadius: 9,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    refText: {
        fontSize: 12,
        color: "#26383F",
        fontWeight: "700",
    },
    labelText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64747A",
        marginRight: 6,
    },
    valueText: {
        flexShrink: 1,
        fontSize: 13,
        color: "#15282E",
        fontWeight: "600",
    },
    smallLabel1: {
        fontSize: 12,
        color: "#68777D",
    },
    amount1: {
        fontSize: 13,
        fontWeight: "700",
        color: "#172B31",
    },
    metricsRow: {
        flexDirection: "row",
        alignItems: "stretch",
        marginTop: 8,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#EDF1F3",
    },
    metricBox: {
        minWidth: 78,
        paddingRight: 20,
    },
    smallLabel: {
        fontSize: 11,
        color: "#718087",
        fontWeight: "600",
    },
    amount: {
        marginTop: 2,
        fontSize: 16,
        fontWeight: "800",
        color: "#13879A",
    },
    cardActionRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#F0F3F5",
    },
    printBtn: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: "#0F6C7B",
        justifyContent: "center",
        alignItems: "center",
        elevation: 2,
    },
    deleteBtn: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: "#EF4444",
        justifyContent: "center",
        alignItems: "center",
        elevation: 2,
    },
    fabContainer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "flex-end",
        paddingHorizontal: 18,
        paddingBottom: Platform.OS === "ios" ? 24 : 18,
        pointerEvents: "box-none",
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#13879A",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#0F2027",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15,32,39,0.42)",
        justifyContent: "flex-end",
    },
    sheet: {
        width: "100%",
        maxWidth: 620,
        maxHeight: "92%",
        alignSelf: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: Platform.OS === "ios" ? 28 : 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    dragBar: {
        width: 44,
        height: 4,
        backgroundColor: "#D5DDE0",
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: 14,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    title: {
        fontSize: 19,
        fontWeight: "800",
        color: "#12272E",
    },
    resetText: {
        color: "#DC2626",
        fontWeight: "700",
        marginRight: 16,
    },
    label: {
        marginTop: 14,
        marginBottom: 6,
        color: "#46575D",
        fontSize: 12,
        fontWeight: "700",
    },
    bigInput: {
        minHeight: 50,
        backgroundColor: "#F5F8F9",
        borderWidth: 1,
        borderColor: "#E1E8EA",
        paddingHorizontal: 14,
        borderRadius: 13,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    inputText: {
        flex: 1,
        color: "#172B31",
        fontSize: 14,
    },
    dateRow: {
        flexDirection: "row",
        gap: 10,
    },
    dateBox: {
        flex: 1,
        minWidth: 0,
        minHeight: 50,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F8F9",
        borderWidth: 1,
        borderColor: "#E1E8EA",
        paddingHorizontal: 12,
        borderRadius: 13,
    },
    applyBtnNew: {
        minHeight: 50,
        backgroundColor: "#13879A",
        paddingHorizontal: 20,
        borderRadius: 14,
        marginTop: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    applyText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "800",
    },
    pickerHeader: {
        minHeight: 60,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderColor: "#E8EEF0",
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#15282E",
    },
    pickerSearch: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F7F8",
        margin: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E1E8EA",
    },
    pickerItem: {
        minHeight: 54,
        justifyContent: "center",
        paddingHorizontal: 18,
        borderBottomWidth: 1,
        borderColor: "#EEF2F3",
    },
    tabContainer: {
        flexDirection: "row",
        gap: 8,
    },
    tabBtn: {
        flex: 1,
        minHeight: 44,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D9E2E5",
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    activeTab: {
        backgroundColor: "#13879A",
        borderColor: "#13879A",
    },
    tabText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#596A70",
    },
    activeText: {
        color: "#fff",
        fontWeight: "800",
    },
    printerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    printerSheet: {
        width: "100%",
        maxWidth: 620,
        maxHeight: "82%",
        alignSelf: "center",
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 18,
    },
    printerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    printerTitle: {
        fontSize: 19,
        fontWeight: "800",
        color: "#111827",
    },
    printerSubTitle: {
        marginTop: 3,
        fontSize: 12,
        fontWeight: "700",
        color: "#0F6C7B",
    },
    printerCloseBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
    },
    printerSearchInput: {
        height: 48,
        borderWidth: 1,
        borderColor: "#D7E0E3",
        borderRadius: 12,
        paddingHorizontal: 14,
        marginBottom: 10,
        color: "#111827",
        backgroundColor: "#F8FAFB",
    },
    printerItem: {
        minHeight: 60,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: "#EEF2F3",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 10,
    },
    printerItemSelected: {
        backgroundColor: "#E8F7F9",
    },
    printerName: {
        fontWeight: "700",
        fontSize: 14,
        color: "#111827",
    },
    printerStatus: {
        marginTop: 3,
        fontWeight: "600",
        fontSize: 12,
    },
    printerEmptyBox: {
        minHeight: 120,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 20,
    },
    printerEmptyText: {
        marginTop: 8,
        color: "#6B7280",
        fontSize: 14,
    },
    printerErrorText: {
        color: "#DC2626",
        fontSize: 14,
        textAlign: "center",
    },
    printerRetryBtn: {
        marginTop: 10,
        paddingHorizontal: 20,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: "#0F6C7B",
    },
    printerRetryText: {
        color: "#fff",
        fontWeight: "700",
    },
    alertOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 18,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    alertBox: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    alertTitle: {
        fontSize: 18,
        fontWeight: "800",
        marginTop: 10,
        color: "#172B31",
    },
    alertMessage: {
        textAlign: "center",
        marginTop: 10,
        color: "#53636A",
        fontSize: 14,
        lineHeight: 21,
    },
    alertBtn: {
        minWidth: 100,
        minHeight: 44,
        marginTop: 18,
        backgroundColor: "#13879A",
        paddingHorizontal: 28,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
    },
    confirmRow: {
        width: "100%",
        flexDirection: "row",
        marginTop: 18,
        gap: 12,
    },
    confirmBtn: {
        flex: 1,
        minHeight: 44,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
    },
    confirmBtnText: {
        color: "#fff",
        fontWeight: "800",
    },
});
