import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Modal, FlatList, StyleSheet
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from "react-native-linear-gradient";
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchPropertyData } from '../../common/API/Functions';
import axios from "axios";
import { API } from "../../common/API/dynamicAPI";
const CreelIssueReturn = ({ token, navigation }) => {

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
    const formatDate = (date) => {
        if (!date) return "";
        return date.toLocaleDateString('en-GB');
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
        setFromDate(null);
        setToDate(null);

    }, []);

    useEffect(() => {
        const load = async () => {
            const data = await fetchPropertyData(token);
            setPropertyData(data || []);
            if (data?.length) setSelectedProperty(data[0]);
        };
        load();
    }, []);
    const fetchCreelData = async () => {
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
                frmdate: fromDate,
                todate: toDate
            };

            console.log("🚀 FINAL PAYLOAD:", payload);
            console.log(`${API}`);

            const res = await axios.get(`${API}/api/get_creel_issue_browse`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: payload,
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
    const creelDataDummy = [
        {
            UId: 1,
            IssNo: "ISS001",
            IssDate: "2026-04-29",
            BatchNo: "B001",
            StkType: "Cotton",
            IsCartonType: "Single",
            IsCartonStatus: "Open",
        },
        {
            UId: 2,
            IssNo: "ISS002",
            IssDate: "2026-04-28",
            BatchNo: "B002",
            StkType: "Poly",
            IsCartonType: "Mix",
            IsCartonStatus: "Closed",
        },
        {
            UId: 3,
            IssNo: "ISS003",
            IssDate: "2026-04-27",
            BatchNo: "B003",
            StkType: "Silk",
            IsCartonType: "Single",
            IsCartonStatus: "Closed",
        },
        {
            UId: 4,
            IssNo: "ISS004",
            IssDate: "2026-04-26",
            BatchNo: "B004",
            StkType: "Cotton",
            IsCartonType: "Mix",
            IsCartonStatus: "Open",
        },
    ];
    const filteredCreelData = creelDataDummy.filter(item => {

        const matchSearch =
            search === "" ||
            item?.IssNo?.toLowerCase().includes(search.toLowerCase());

        const matchType =
            cartonType === "All" ||
            item?.IsCartonType === cartonType;

        const matchStatus =
            cartonStatus === "All" ||
            item?.IsCartonStatus === cartonStatus;

        return matchSearch && matchType && matchStatus;
    });

    return (
        <View style={{ flex: 1, backgroundColor: "#F5F7FB" }}>

            {/* HEADER */}
            <LinearGradient colors={['#0F6C7B', '#13879A']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-back-ios-new" size={18} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Creel Issue Return</Text>

                <TouchableOpacity onPress={() => setFilterVisible(true)}>
                    <Icon name="tune" size={22} color="#fff" />
                </TouchableOpacity>
            </LinearGradient>

            {/* SEARCH */}
            <View style={styles.searchBox}>
                <Icon name="search" size={20} color="#888" />
                <TextInput
                    placeholder="Search..."
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
                    onPress={() => setFilterVisible(true)}
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
                                fetchCreelData();
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
                <View style={{ flex: 1, backgroundColor: "#fff" }}>

                    <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => {
                            setPropertyPickerVisible(false);
                            setPropertySearch(""); // ✅ CLEAR SEARCH
                        }}>
                            <Icon name="arrow-back-ios" size={20} />
                        </TouchableOpacity>

                        <Text style={styles.pickerTitle}>Select Property</Text>
                        <View style={{ width: 20 }} />
                    </View>

                    <View style={styles.pickerSearch}>
                        <Icon name="search" size={18} color="#000000" />
                        <TextInput
                            placeholder="Search property..."
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
            </Modal >

            {/* YEAR PICKER */}
            < Modal visible={yearPickerVisible} animationType="slide" >
                <View style={{ flex: 1, backgroundColor: "#fff" }}>

                    <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setYearPickerVisible(false)}>
                            <Icon name="arrow-back-ios" size={20} />
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
            <FlatList
                data={filteredCreelData}
                keyExtractor={(item) => item.UId.toString()}
                contentContainerStyle={{ padding: 16 }}

                renderItem={({ item }) => (
                    <View style={styles.card}>

                        {/* TOP */}
                        <View style={styles.rowBetween}>
                            <Text style={styles.title}>
                                {item.IssNo}
                            </Text>

                            <View style={[
                                styles.statusBadge,
                                {
                                    backgroundColor:
                                        item.IsCartonStatus === "Open"
                                            ? "#FFF3E0"
                                            : "#E8F5E9"
                                }
                            ]}>
                                <Text style={{
                                    color:
                                        item.IsCartonStatus === "Open"
                                            ? "#EF6C00"
                                            : "#2E7D32",
                                    fontWeight: "600"
                                }}>
                                    {item.IsCartonStatus}
                                </Text>
                            </View>
                        </View>

                        {/* DATE */}
                        <Text style={styles.subText}>
                            📅 {item.IssDate}
                        </Text>

                        {/* INFO */}
                        <View style={styles.rowBetween}>
                            <Text style={styles.labelSmall}>
                                Batch: {item.BatchNo}
                            </Text>

                            <Text style={styles.labelSmall}>
                                Type: {item.StkType}
                            </Text>
                        </View>

                        {/* CARTON TYPE */}
                        <View style={{ marginTop: 8 }}>
                            <Text style={{
                                fontSize: 12,
                                color: "#0F6C7B",
                                fontWeight: "600"
                            }}>
                                📦 {item.IsCartonType}
                            </Text>
                        </View>

                    </View>
                )}
            />
            {/* 🔥 FLOATING ADD BUTTON */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() =>
                    navigation.navigate("CreelIssueReturnEntry", {
                        creelData: null,
                        token: token,
                        selectedProperty: selectedProperty,   // ✅ ADD THIS
                        selectedYear: selectedYear           // ✅ ADD THIS
                    })
                }

            >
                <Icon name="add" size={26} color="#fff" />
            </TouchableOpacity>
        </View >
    );
};

export default CreelIssueReturn;

const styles = StyleSheet.create({

    header: { flexDirection: "row", justifyContent: "space-between", padding: 16, paddingTop: 40 },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },

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

    label: { marginTop: 10 },

    bigInput: {
        backgroundColor: "#F3F4F6",
        padding: 14,
        borderRadius: 12,
        marginTop: 6,
        flexDirection: "row",
        justifyContent: "space-between"
    },

    inputText: { flex: 1 },

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
        fontWeight: "600"
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
        alignItems: "center",
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
    fab: {
        position: "absolute",
        bottom: 20,
        right: 20,
        backgroundColor: "#13879A",
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        elevation: 5,
    },
});