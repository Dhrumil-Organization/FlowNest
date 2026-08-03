import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Modal, FlatList, StyleSheet, Alert, Platform
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchPropertyData } from '../../common/API/Functions';
import axios from "axios";
import { API } from "../../common/API/dynamicAPI";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const WeftIssueReturn = ({ token, navigation }) => {

    // const refresh = route?.params?.refresh;
    // const refresh = route?.params?.refresh;
    // const routeProperty = route?.params?.selectedProperty;
    // const routeYear = route?.params?.selectedYear;
    // const routeFromDate = route?.params?.fromDate;
    // const routeToDate = route?.params?.toDate;


    const router = useRouter();

    const {
        // token,
        refresh,
        selectedProperty: routeProperty,
        selectedYear: routeYear,
        fromDate: routeFromDate,
        toDate: routeToDate,
    } = useLocalSearchParams();


    const [search, setSearch] = useState("");

    const [filterVisible, setFilterVisible] = useState(false);
    const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
    const [yearPickerVisible, setYearPickerVisible] = useState(false);
    const [yearOptions, setYearOptions] = useState([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [propertyData, setPropertyData] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [propertySearch, setPropertySearch] = useState("");
    // const [fromDate, setFromDate] = useState(null);
    // const [toDate, setToDate] = useState(null);
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
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


    // const loadPropertyData = async () => {
    //     const data = await fetchPropertyData(token);

    //     setPropertyData(data || []);

    //     // Agar first property select karni ho to uncomment kar dena
    //     // if (data?.length) {
    //     //     setSelectedProperty(data[0]);
    //     // }
    // };

    // const fetchCreelReturnData = async () => {
    //     if (!selectedProperty) return;

    //     setLoading(true);

    //     try {
    //         const prpcode =
    //             typeof selectedProperty === "object"
    //                 ? selectedProperty?.PrpCode
    //                 : selectedProperty;

    //         const prptype =
    //             typeof selectedProperty === "object"
    //                 ? selectedProperty?.PrpOf
    //                 : selectedProperty;

    //         const yearno = selectedYear?.slice(-2); // ✅ YOU WANT "27"

    //         // ✅ MINIMAL PAYLOAD FIRST
    //         const payload = {
    //             prpcode,
    //             prptype,
    //             yearno,
    //             strcode: "002",
    //             txntype: "beam_weft_issue_return",
    //             frmdate: formatDate(fromDate),
    //             todate: formatDate(toDate)
    //         };

    //         console.log("🚀 FINAL PAYLOAD:", payload);
    //         console.log(`${API}/api/get_creel_issue_return_browse`);

    //         const res = await axios.post(`${API}/api/get_creel_issue_return_browse`, payload, {
    //             headers: {
    //                 Authorization: `Bearer ${token}`,
    //                 'Content-Type': 'application/json',
    //                 'X-Requested-with': 'XMLHttpRequest',
    //             }
    //         });

    //         console.log("✅ FULL RESPONSE:", res.data);

    //         // ✅ HANDLE ALL POSSIBLE RESPONSE STRUCTURES
    //         const rawData =
    //             res?.data?.response?.data ||
    //             res?.data?.data ||
    //             res?.data?.result ||
    //             [];

    //         if (Array.isArray(rawData) && rawData.length > 0) {
    //             setCreelData(rawData);
    //         } else {
    //             console.log("⚠️ No data returned from API");
    //             setCreelData([]);
    //         }
    //     } catch (error) {
    //         console.log("❌ API ERROR:", error?.response?.data || error.message);
    //         setCreelData([]);
    //     } finally {
    //         setLoading(false);
    //     }
    // };



    // useEffect(() => {
    //     if (route?.params?.selectedProperty) {
    //         setSelectedProperty(route.params.selectedProperty);
    //     }

    //     if (route?.params?.selectedYear) {
    //         setSelectedYear(route.params.selectedYear);
    //     }

    //     if (routeFromDate) {
    //         setFromDate(routeFromDate);
    //     }

    //     if (routeToDate) {
    //         setToDate(routeToDate);
    //     }
    // }, [route?.params]);

    useEffect(() => {
        if (routeProperty) {
            setSelectedProperty(JSON.parse(routeProperty as string));
        }

        if (routeYear) {
            setSelectedYear(routeYear as string);
        }

        if (routeFromDate) {
            setFromDate(new Date(routeFromDate as string));
        }

        if (routeToDate) {
            setToDate(new Date(routeToDate as string));
        }
    }, [routeProperty, routeYear, routeFromDate, routeToDate]);


    const fetchCreelReturnData = async (
        property = selectedProperty,
        year = selectedYear,
        from = fromDate,
        to = toDate
    ) => {

        if (!property) return;

        setLoading(true);

        try {

            const prpcode =
                typeof property === "object"
                    ? property?.PrpCode
                    : property;

            const prptype =
                typeof property === "object"
                    ? property?.PrpOf
                    : property;

            const yearno = year?.slice(-2);

            const payload = {
                prpcode,
                prptype,
                yearno,
                strcode: "002",
                txntype: "beam_weft_issue_return",
                frmdate: formatDate(from),
                todate: formatDate(to),
            };

            console.log("🚀 FINAL PAYLOAD:", payload);
            console.log(`${API}/api/get_creel_issue_return_browse`);

            const res = await axios.post(
                `${API}/api/get_creel_issue_return_browse`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        "X-Requested-with": "XMLHttpRequest",
                    },
                }
            );

            console.log("✅ FULL RESPONSE:", res.data);

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
                showWarning("No Data Found.");
            }

        } catch (error) {

            console.log(
                "❌ API ERROR:",
                error?.response?.data || error.message
            );

            setCreelData([]);

        } finally {

            setLoading(false);

        }
    };

    // useEffect(() => {
    //     if (refresh) {

    //         if (routeProperty) {
    //             setSelectedProperty(routeProperty);
    //         }

    //         if (routeYear) {
    //             setSelectedYear(routeYear);
    //         }

    //         fetchCreelReturnData(routeProperty, routeYear, routeFromDate, routeToDate);

    //         navigation.setParams({
    //             refresh: false,
    //         });
    //     }
    // }, [refresh]);

    useEffect(() => {
        if (refresh === "true") {

            if (routeProperty) {
                setSelectedProperty(JSON.parse(routeProperty as string));
            }

            if (routeYear) {
                setSelectedYear(routeYear as string);
            }

            if (routeFromDate) {
                setFromDate(new Date(routeFromDate as string));
            }

            if (routeToDate) {
                setToDate(new Date(routeToDate as string));
            }

            fetchCreelReturnData(
                routeProperty ? JSON.parse(routeProperty as string) : null,
                routeYear as string,
                routeFromDate ? new Date(routeFromDate as string) : null,
                routeToDate ? new Date(routeToDate as string) : null
            );
        }
    }, [refresh]);

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
                txntype: "beam_weft_issue_return",
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

    // const creelDataDummy = [
    //     {
    //         UId: 1,
    //         IssNo: "ISS001",
    //         IssDate: "2026-04-29",
    //         BatchNo: "B001",
    //         StkType: "Cotton",
    //         IsCartonType: "Single",
    //         IsCartonStatus: "Open",
    //     },
    //     {
    //         UId: 2,
    //         IssNo: "ISS002",
    //         IssDate: "2026-04-28",
    //         BatchNo: "B002",
    //         StkType: "Poly",
    //         IsCartonType: "Mix",
    //         IsCartonStatus: "Closed",
    //     },
    //     {
    //         UId: 3,
    //         IssNo: "ISS003",
    //         IssDate: "2026-04-27",
    //         BatchNo: "B003",
    //         StkType: "Silk",
    //         IsCartonType: "Single",
    //         IsCartonStatus: "Closed",
    //     },
    //     {
    //         UId: 4,
    //         IssNo: "ISS004",
    //         IssDate: "2026-04-26",
    //         BatchNo: "B004",
    //         StkType: "Cotton",
    //         IsCartonType: "Mix",
    //         IsCartonStatus: "Open",
    //     },
    // ];
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

    const SkeletonCard = () => (
        <View style={styles.skeletonCard}>
            <View style={styles.skeletonRow}>
                <View style={[styles.skeleton, { width: 90, height: 14 }]} />
                <View style={[styles.skeleton, { width: 70, height: 22, borderRadius: 8 }]} />
            </View>

            <View style={[styles.skeleton, { width: "60%", height: 16, marginTop: 14 }]} />

            <View style={styles.skeletonBottom}>
                <View>
                    <View style={[styles.skeleton, { width: 30, height: 12 }]} />
                    <View style={[styles.skeleton, { width: 55, height: 18, marginTop: 6 }]} />
                </View>

                <View>
                    <View style={[styles.skeleton, { width: 30, height: 12 }]} />
                    <View style={[styles.skeleton, { width: 55, height: 18, marginTop: 6 }]} />
                </View>
            </View>

            <View style={styles.skeletonDelete} />
        </View>
    );

    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
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

                        <Text style={styles.headerTitle}>Weft Issue Return</Text>

                        <TouchableOpacity
                            // onPress={() => setFilterVisible(true)}
                            onPress={() => {
                                // loadPropertyData();
                                setFilterVisible(true);
                            }}
                        >
                            <Icon name="tune" size={22} color="#fff" />
                        </TouchableOpacity>
                    </LinearGradient>

                    {/* SEARCH */}
                    <View style={styles.searchBox}>
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
                    <View style={styles.chipContainer}>

                        {/* PROPERTY */}
                        <TouchableOpacity
                            style={styles.chip}
                            // onPress={() => setFilterVisible(true)}
                            onPress={() => {
                                // loadPropertyData();
                                setFilterVisible(true);
                            }}
                        >
                            <Icon name="business" size={14} color="#0F6C7B" />
                            <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">
                                {selectedProperty?.LngName || "Select Property"}
                            </Text>
                            <Icon name="edit" size={14} color="#0F6C7B" />
                        </TouchableOpacity>

                        {/* YEAR */}
                        <View style={styles.chip}>
                            <Icon name="event" size={14} color="#0F6C7B" />
                            <Text style={styles.chipText}>
                                {selectedYear || "Year"}
                            </Text>
                        </View>

                        {/* 🔥 DATE RANGE (CONDITIONAL) */}
                        {(fromDate || toDate) && (
                            <View style={styles.chip}>
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
                                    }}
                                >
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
                    </Modal >
                    {/* 🔥 DATA LIST */}

                    {
                        loading ? (
                            <FlatList
                                data={[1, 2, 3, 4, 5]}
                                keyExtractor={(item) => item.toString()}
                                contentContainerStyle={{ padding: 16 }}
                                renderItem={() => <SkeletonCard />}
                            />
                        ) : (
                            <FlatList
                                data={filteredCreelData}
                                keyExtractor={(item) => item.UId.toString()}
                                contentContainerStyle={{ padding: 16 }}

                                renderItem={({ item }) => {

                                    const borderColor = "#13879A";

                                    return (
                                        <TouchableOpacity
                                            style={[styles.ledgerCard, { borderLeftColor: borderColor }]}
                                            onPress={() => {
                                                // navigation.navigate("WeftIssueReturnModifyEntry", {
                                                //     creelData: item,
                                                //     token: token,
                                                //     selectedProperty: selectedProperty,
                                                //     selectedYear: selectedYear,
                                                //     fromDate: fromDate,
                                                //     toDate: toDate,
                                                //     refresh: false
                                                // });

                                                router.push({
                                                    pathname: '/WeftIssueReturnModifyEntry',
                                                    params: {
                                                        creelData: JSON.stringify(item),
                                                        token: token,
                                                        selectedProperty: JSON.stringify(selectedProperty),
                                                        selectedYear: selectedYear,
                                                        fromDate: fromDate,
                                                        toDate: toDate,
                                                        refresh: false
                                                    }
                                                });
                                            }}
                                        >
                                            <View style={styles.rowBetween}>
                                                <Text style={styles.dateText}>
                                                    {item.IssRDate}
                                                </Text>
                                                <View style={{ alignItems: "flex-end" }}>
                                                    <View style={styles.refBadge}>
                                                        <Text style={styles.refText}>
                                                            {item.IssRNo}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                                <Text style={styles.labelText}>Stock Type:</Text>
                                                <Text style={styles.valueText}>{item.StkType}</Text>
                                            </View>

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

                                            <TouchableOpacity
                                                onPress={() => {
                                                    setSelectedDeleteItem(item);
                                                    setDeleteModal(true);
                                                }}
                                                style={styles.deleteBtn}
                                            >
                                                <Icon name="delete" size={18} color="#fff" />
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}

                    <View style={styles.fabContainer}>
                        <TouchableOpacity
                            style={styles.fab}
                            // onPress={() =>
                            //     navigation.navigate("WeftIssueReturnEntry", {
                            //         creelData: null,
                            //         token: token,
                            //         selectedProperty: selectedProperty,
                            //         selectedYear: selectedYear,
                            //         fromDate: fromDate,
                            //         toDate: toDate,
                            //         refresh: false
                            //     })
                            // }

                            onPress={() => {
                                if (!selectedProperty) {
                                    showWarning("Please select Property.");
                                    return;
                                } else {
                                    // navigation.navigate("WeftIssueReturnEntry", {
                                    //     creelData: null,
                                    //     token: token,
                                    //     selectedProperty: selectedProperty,
                                    //     selectedYear: selectedYear,
                                    //     fromDate: fromDate,
                                    //     toDate: toDate,
                                    //     refresh: false
                                    // });

                                    router.push({
                                        pathname: '/WeftIssueReturnEntry',
                                        params: {
                                            creelData: null,
                                            token: token,
                                            selectedProperty: JSON.stringify(selectedProperty),   // ✅ ADD THIS
                                            selectedYear: selectedYear,
                                            fromDate: fromDate,
                                            toDate: toDate,
                                            refresh: false
                                        }
                                    })
                                }
                            }}
                        >
                            <Icon name="add" size={26} color="#fff" />
                        </TouchableOpacity>
                    </View>

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
export default WeftIssueReturn;

const styles = StyleSheet.create({
    header: {
        height: 64,
        // backgroundColor: COLORS.primary,
        backgroundColor: "#0f8f9a",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "android" ? 4 : 0,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    headerTitle: {
        // position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        color: "#fff",
        fontSize: 18,
        fontWeight: "800",
        // letterSpacing: 0.5,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center", alignItems: "center"
    },

    searchBox: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#fff", margin: 16, padding: 10,
        borderRadius: 15
    },

    searchInput: { flex: 1 },

    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },

    sheet: {
        backgroundColor: "#fff",
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20
    },

    dragBar: {
        width: 50, height: 5, backgroundColor: "#ccc",
        alignSelf: "center", marginBottom: 10
    },

    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    title: { fontSize: 16, fontWeight: "600" },
    resetText: { color: "red" },
    label: {
        marginTop: 10,
        color: '#000'
    },
    bigInput: {
        backgroundColor: "#F3F4F6",
        padding: 14,
        borderRadius: 12,
        marginTop: 6,
        flexDirection: "row",
        justifyContent: "space-between",
        color: '#000'
    },
    inputText: {
        flex: 1,
        color: '#000'
    },
    dateBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        padding: 14,
        borderRadius: 16,
        marginTop: 6
    },
    applyBtnNew: {
        backgroundColor: "#13879A",
        padding: 16,
        borderRadius: 20,
        marginTop: 20,
        alignItems: "center"
    },
    applyText: { color: "#fff" },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 15,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },
    pickerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: '#000'
    },
    pickerSearch: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f1f1f1",
        margin: 10,
        paddingHorizontal: 10,
        borderRadius: 10
    },
    pickerItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },
    chipContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 16,
        marginTop: 10,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F4F6",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        marginBottom: 8,
        maxWidth: "90%",
    },
    chipText: {
        marginHorizontal: 6,
        fontSize: 13,
        fontWeight: "500",
        color: "#0F2027",
        flexShrink: 1,
    },
    filterBlock: {
        paddingHorizontal: 16,
        marginTop: 10,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 6,
        color: "#1010108e"
    },
    tabContainer: {
        flexDirection: "row",
        gap: 10
    },
    tabBtn: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff"
    },
    activeTab: {
        backgroundColor: "#13879A",
        borderColor: "#13879A"
    },
    tabText: {
        fontSize: 14,
        color: "#555"
    },
    activeText: {
        color: "#fff",
        fontWeight: "600"
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 3,
    },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F2027",
    },
    subText: {
        fontSize: 12,
        color: "#777",
        marginTop: 4,
    },
    labelSmall: {
        fontSize: 12,
        color: "#555",
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    fabContainer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,

        alignItems: "flex-end",

        paddingHorizontal: 20,
        paddingBottom: Platform.OS === "ios" ? 34 : 20,

        pointerEvents: "box-none",
    },

    fab: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#13879A",
        justifyContent: "center",
        alignItems: "center",
        elevation: 10,
    },
    ledgerCard: {
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        borderLeftWidth: 5,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3
    },
    dateText: {
        fontSize: 13,
        color: "#000"
    },
    refBadge: {
        backgroundColor: "#F1F3F5",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },
    refText: {
        fontSize: 12,
        color: "#000",
        fontWeight: "500"
    },
    ledgerTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#000",
        marginTop: 6,
        marginBottom: 10
    },
    smallLabel: {
        fontSize: 11,
        color: "#000"
    },
    amount: {
        fontSize: 14,
        fontWeight: "600"
    },
    balanceText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1565C0"
    },
    labelText: {
        fontSize: 13,
        color: "#000",
        marginRight: 6
    },
    valueText: {
        fontSize: 12,
        // fontWeight: "600",
        color: "#000"
    },
    deleteBtn: {
        marginTop: -25,
        backgroundColor: "#EF4444",
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "flex-end"
    },
    alertOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    alertBox: {
        width: "85%",
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 22,
        alignItems: "center",
    },
    alertTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginTop: 10,
        color: "#000",
    },
    alertMessage: {
        textAlign: "center",
        marginTop: 10,
        color: "#444",
        fontSize: 14,
    },
    alertBtn: {
        marginTop: 18,
        backgroundColor: "#13879A",
        paddingHorizontal: 28,
        paddingVertical: 11,
        borderRadius: 10,
    },
    confirmRow: {
        flexDirection: "row",
        marginTop: 18,
        gap: 12,
    },
    confirmBtn: {
        paddingVertical: 10,
        paddingHorizontal: 28,
        borderRadius: 10,
    },
    confirmBtnText: {
        color: "#fff",
        fontWeight: "700",
    },
    skeletonCard: {
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        elevation: 3,
    },
    skeletonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    skeletonBottom: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },
    skeleton: {
        backgroundColor: "#E5E7EB",
        borderRadius: 6,
    },
    skeletonDelete: {
        position: "absolute",
        right: 16,
        bottom: 16,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#E5E7EB",
    },
});