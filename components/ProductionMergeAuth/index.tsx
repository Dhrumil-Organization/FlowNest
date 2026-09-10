import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, Animated, Keyboard, ActivityIndicator, ScrollView } from "react-native";
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from "axios";
import { API } from "../../common/API/dynamicAPI";
import { fetchAllStoredata, } from '../../common/API/Functions';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useRouter } from 'expo-router';

const ProductionMergeAuth = ({ token }) => {
    const router = useRouter();
    const [searchProdMerge, setSearchProdMerge] = useState("");
    const [ProdMergeData, setProdMergeData] = useState([]);
    const [ProdMergeloading, setProdMergeLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("request");
    const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
    const [FormState, setFormState] = useState({
        values: {
            YearNo: '',
            // StrCode: ''
        }
    })
    const [alertData, setAlertData] = useState({
        visible: false,
        message: "",
        type: "warning",
    });
    const [remarks, setRemarks] = useState({});
    const [ProdMergeinitialLoaded, setProdMergeInitialLoaded] = useState(false);
    const [ProductionDetails, setProductionDetails] = useState({});
    const [infoProdMergeLoading, setInfoProdMergeLoading] = useState({});
    const [showProdMergeInfo, setShowProdMergeInfo] = useState({});

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

    useEffect(() => {

        if (!ProdMergeinitialLoaded) {
            fetchProdMergelist();

            setProdMergeInitialLoaded(true);
        }
    }, []);

    useEffect(() => {

        setShowProdMergeInfo({});
        setProductionDetails({});

        if (ProdMergeinitialLoaded) {
            fetchProdMergelist();
        }
    }, [activeTab]);

    const fetchProdMergelist = async () => {

        // if (!selectedstore) return;

        setProdMergeLoading(true);

        const userPtype = await AsyncStorage.getItem('user_prptype');

        let yno = await AsyncStorage.getItem('yno');
        console.log("userPtype : => ", userPtype)
        console.log("yno : => ", yno)
        // console.log("selectedYear?.slice(-2) : => ", selectedYear?.slice(-2))

        let atype = 'B';

        if (activeTab === 'history') {
            atype = 'H';
        }

        try {

            const payload = {
                prptype: userPtype,
                yearno: yno,
                // strcode: FormState.values.StrCode || '',
                txntype: "mob_prod_merge_auth",
                atype: atype,
                referrer: 'dashboard',
                fetch: "browsedata"
            };
            console.log("api payload => ", payload)
            const res = await axios.get(`${API}/api/prodproductionbrowse`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                params: payload,
            });
            console.log("api response => ", res)

            const rawData = res?.data?.data?.data || [];

            setProdMergeData(rawData);

            if (res?.data?.response?.error == true) {
                showWarning("Please Try Again !!!");
            }
        } catch (e) {
            console.log(e);

            setProdMergeData([]);
        } finally {

            setProdMergeLoading(false);
        }
    };

    const fetchProdMergedatalist = async (item) => {

        if (showProdMergeInfo[item.uid]) {

            setShowProdMergeInfo(prev => ({
                ...prev,
                [item.uid]: false
            }));

            return;
        }

        // if (!selectedstore) return;

        const userPtype = await AsyncStorage.getItem('user_prptype');

        let yno = await AsyncStorage.getItem('yno');
        console.log("userPtype : => ", userPtype)
        console.log("yno : => ", yno)
        // console.log("selectedYear?.slice(-2) : => ", selectedYear?.slice(-2))

        let atype = 'B';

        if (activeTab === 'history') {
            atype = 'H';
        }

        try {

            setInfoProdMergeLoading(prev => ({
                ...prev,
                [item.uid]: true
            }));

            const payload = {
                prptype: userPtype,
                yearno: yno,
                // strcode: FormState.values.StrCode || '',
                txntype: "mob_prod_merge_auth",
                atype: atype,
                referrer: 'dashboard',
                fetch: "packdata",
                produid: item?.produid
            };
            console.log("api payload => ", payload)

            const res = await axios.get(`${API}/api/prodpackingbrowse`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                params: payload,
            });
            console.log("api response => ", res)

            const rawData = res?.data?.response?.data || [];

            setProductionDetails(prev => ({
                ...prev,
                [item.uid]: rawData
            }));

            setShowProdMergeInfo(prev => ({
                ...prev,
                [item.uid]: !prev[item.uid]
            }));

            if (res?.data?.response?.error == true) {
                showWarning("Please Try Again !!!");
            }
        } catch (e) {
            console.log(e);

            setProdMergeData([]);
        } finally {

            setInfoProdMergeLoading(prev => ({
                ...prev,
                [item.uid]: false
            }));
        }
    };

    const filteredData = ProdMergeData.filter((i) => {

        const searchText = searchProdMerge.toLowerCase();
        return (
            i?.submercode?.toLowerCase()?.includes(searchText) ||
            i?.submername?.toLowerCase()?.includes(searchText) ||
            i?.mainmercode?.toLowerCase()?.includes(searchText) ||
            i?.mainmername?.toLowerCase()?.includes(searchText) ||
            i?.rsnname?.toLowerCase()?.includes(searchText) ||
            i?.authstatus?.toLowerCase()?.includes(searchText) ||
            i?.prodno?.toLowerCase()?.includes(searchText) ||
            i?.proddate?.toLowerCase()?.includes(searchText) ||
            i?.createdby?.toLowerCase()?.includes(searchText) ||
            i?.createddate?.toLowerCase()?.includes(searchText) ||
            i?.createdtime?.toLowerCase()?.includes(searchText) ||
            i?.aremark?.toLowerCase()?.includes(searchText) ||
            i?.authby?.toLowerCase()?.includes(searchText) ||
            i?.authdate?.toLowerCase()?.includes(searchText) ||
            i?.authtime?.toLowerCase()?.includes(searchText)
            // ||
            // i?.qty?.toLowerCase()?.includes(searchText) ||
            // i?.cartno?.toLowerCase()?.includes(searchText) ||
            // i?.mainstrname?.toLowerCase()?.includes(searchText) ||
            // i?.qty1?.toLowerCase()?.includes(searchText) ||
            // i?.qty2?.toLowerCase()?.includes(searchText) ||
            // i?.qty3?.toLowerCase()?.includes(searchText) ||
            // i?.vouddate?.toLowerCase()?.includes(searchText)
        );
    });

    const getToken = () => {
        return token;
    };

    const fetchauthoriseddata = async (item, isauthValue) => {

        setProdMergeLoading(true);

        const userPtype = await AsyncStorage.getItem('user_prptype');
        let yno = await AsyncStorage.getItem('yno');
        console.log("userPtype : => ", userPtype)
        console.log("yno : => ", yno)

        try {

            const params = {
                prptype: userPtype,
                // prpcode: item?.prpcode || "",
                yearno: yno,
                mercode: item?.submercode || "",
                // strcode: FormState.values.StrCode || '',
                // uid: item?.uid || "",
                // srno: item?.srno || "",
                isauth: isauthValue,
                txntype: "mob_prod_merge_auth",
                remark: remarks[item?.uid] || "",
            };
            console.log("production merge auth payload => ", params);

            const response = await axios.post(
                `${API}/api/authproductionmerge`,
                params,
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        Accept: 'application/json'
                    }
                }
            );
            console.log("production merge auth response => ", response);

            if (response?.data?.response?.error == true) {
                showError("Please Try Again");
            } else if (response?.data?.success == true) {
                showSuccess(response?.data.response?.message);
                fetchProdMergelist();
            }
        } catch (error) {
            console.log("PRODUCTION MERGE AUTH ERROR:", error?.response?.data || error.message);
            showError(
                error?.response?.data?.message ||
                error?.message ||
                "Failed."
            );
        } finally {

            setProdMergeLoading(false);
        }
    };

    const renderSkeleton = () => {
        return [1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.skeletonCard}>
                <View style={styles.skeletonHeader}>
                    <View style={styles.skeletonCircle} />
                    <View style={{ flex: 1 }}>
                        <View style={styles.skeletonLineLarge} />
                        <View style={styles.skeletonLineSmall} />
                    </View>
                </View>
                <View style={styles.skeletonMiddle} />
                <View style={styles.skeletonFooter} />
            </View>
        ));
    };

    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };


    return (

        <View style={styles.container}>
            <LinearGradient colors={['#0B6477', '#14919B']} style={styles.header} >
                <TouchableOpacity
                    onPress={goBack}
                    style={styles.headerIconBtn}
                >
                    <Icon name="arrow-back-ios-new" size={20} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>
                    Production Merge Auth
                </Text>

                <View style={{ width: 50 }} />
            </LinearGradient>

            <View style={styles.mainSearchBox}>
                <Icon name="search" size={20} color="#000" />
                <TextInput
                    placeholder="Search Production Merge..."
                    placeholderTextColor="#000"
                    value={searchProdMerge}
                    onChangeText={setSearchProdMerge}
                    style={styles.mainSearchInput}
                    returnKeyType="search"
                />

                {searchProdMerge?.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchProdMerge(""); Keyboard.dismiss(); }} style={styles.clearBtn}>
                        <Icon name="close" size={20} color="#666" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.tabBtn,
                        activeTab === "request" && styles.activeTab
                    ]}
                    onPress={() => setActiveTab("request")}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === "request" && styles.activeTabText
                        ]}
                    >
                        Request
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tabBtn,
                        activeTab === "history" && styles.activeTab
                    ]}
                    onPress={() => setActiveTab("history")}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === "history" && styles.activeTabText
                        ]}
                    >
                        History
                    </Text>
                </TouchableOpacity>
            </View>

            {ProdMergeloading ? (
                <View style={{ paddingTop: 10 }}>
                    {renderSkeleton()}
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{
                        paddingBottom: 30,
                        paddingTop: 10,
                    }}
                    renderItem={({ item }) => {
                        return (
                            // <TouchableOpacity activeOpacity={0.95} style={[
                            <View style={[
                                styles.proCard,
                                showProdMergeInfo[item.uid] && {
                                    minHeight:
                                        activeTab === "history"
                                            ? 520
                                            : 560
                                },
                                item.authstatus?.toLowerCase() === "authorised" &&
                                styles.authorisedCard,
                                item.authstatus?.toLowerCase() === "rejected" &&
                                styles.rejectCard,
                            ]}>
                                {
                                    item.authstatus?.toLowerCase() !== "authorised" &&
                                    item.authstatus?.toLowerCase() !== "rejected" && (
                                        <View style={styles.leftAccent} />
                                    )
                                }
                                <View style={styles.cardTopNew}>
                                    <Text style={styles.topDate}>
                                        {item.submercode}
                                    </Text>

                                    <Text style={styles.topInward}>
                                        {item.submername}
                                    </Text>
                                </View>

                                <View style={styles.mergeRow}>
                                    <View style={styles.mergeLeft}>
                                        <Text style={styles.mergeLabel}>
                                            Main Merge Code
                                        </Text>

                                        <Text style={styles.mergeValue}>
                                            {item.mainmercode || "-"}
                                        </Text>
                                    </View>

                                    <View style={styles.mergeRight}>
                                        <Text style={styles.mergeLabel}>
                                            Main Merge Name
                                        </Text>

                                        <Text style={styles.mergeValue}>
                                            {item.mainmername || "-"}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.middleInfoRow}>

                                    <View style={styles.middleInfoBox}>
                                        <Text style={styles.newLabel}>
                                            Reason
                                        </Text>

                                        <Text style={styles.qtyNewValue}>
                                            {item.rsnname || "-"}
                                        </Text>
                                    </View>

                                    <View
                                        style={[
                                            styles.statusBadgePro,
                                            {
                                                marginTop: 14,
                                                marginLeft: 0,
                                                alignSelf: "flex-end"
                                            },
                                            item.authstatus?.toLowerCase() === "authorised"
                                                ? styles.authBadge
                                                : styles.pendingBadge
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusTextPro,
                                                item.authstatus?.toLowerCase() === "authorised"
                                                    ? styles.authText
                                                    : styles.pendingText
                                            ]}
                                        >
                                            {item.authstatus}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.poMainRow}>

                                    <View style={styles.middleInfoBox}>
                                        <Text style={styles.newLabel}>
                                            Prod. No.
                                        </Text>

                                        <Text style={styles.newValue}>
                                            {item.prodno || "-"}
                                        </Text>
                                    </View>

                                    <View
                                        style={[
                                            styles.middleInfoBox,
                                            { alignItems: "flex-end" }
                                        ]}
                                    >
                                        <Text style={styles.newLabel}>
                                            Prod. Date
                                        </Text>

                                        <Text style={styles.newValue}>
                                            {item.proddate || "-"}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.createdMainRow}>

                                    {/* LEFT SIDE */}
                                    <View style={styles.createdLeftSection}>

                                        <Text style={styles.createdLabel}>
                                            Created By
                                        </Text>

                                        <Text style={styles.createdValue}>
                                            {item.createdby || "-"}
                                        </Text>

                                    </View>

                                    {/* RIGHT SIDE */}
                                    <View style={styles.createdRightSection}>

                                        <Text style={styles.createdLabel}>
                                            Created Date & Time
                                        </Text>

                                        <Text style={styles.createdValue}>
                                            {item.createddate || "-"} {" "}
                                            {item.createdtime || "-"}
                                        </Text>
                                    </View>
                                </View>

                                {
                                    activeTab !== "history" && (
                                        <View style={styles.remarkRowBox}>
                                            <Text style={styles.remarkLeftLabel}>
                                                Remark
                                            </Text>

                                            <TextInput
                                                placeholder="Enter Remark"
                                                placeholderTextColor="#000"
                                                value={remarks[item?.uid] || ""}
                                                onChangeText={(text) => {
                                                    setRemarks(prev => ({
                                                        ...prev,
                                                        [item?.uid]: text
                                                    }))
                                                }}
                                                style={styles.remarkRightInput}
                                                multiline
                                            />
                                        </View>
                                    )
                                }

                                {
                                    activeTab === "history" && (
                                        <>
                                            <View style={styles.proDivider} />

                                            <View style={styles.historyRemarkBox}>
                                                <Text style={styles.historyRemarkLabel}>
                                                    Remark
                                                </Text>

                                                <Text style={styles.historyRemarkText}>
                                                    {item.aremark || "-"}
                                                </Text>
                                            </View>

                                            <View style={styles.authFooterRow}>

                                                <View style={styles.authFooterBoxLeft}>
                                                    <Text style={styles.authFooterLabel}>
                                                        Auth By
                                                    </Text>

                                                    <Text style={styles.authFooterValue}>
                                                        {item.authby || "-"}
                                                    </Text>
                                                </View>

                                                <View style={styles.authFooterBoxCenter}>
                                                    <Text style={styles.authFooterLabel}>
                                                        Auth Date
                                                    </Text>

                                                    <Text style={styles.authFooterValue}>
                                                        {item.authdate || "-"}
                                                    </Text>
                                                </View>

                                                <View style={styles.authFooterBoxRight}>
                                                    <Text style={styles.authFooterLabel}>
                                                        Auth Time
                                                    </Text>

                                                    <Text style={styles.authFooterValue}>
                                                        {item.authtime || "-"}
                                                    </Text>
                                                </View>

                                            </View>
                                        </>
                                    )
                                }

                                {
                                    activeTab !== "history" && (
                                        <>
                                            <View style={styles.proDivider} />

                                            <View style={styles.buttonRowPro}>
                                                <TouchableOpacity
                                                    style={styles.rejectIconBtn}
                                                    onPress={() => fetchauthoriseddata(item, 2)}
                                                >
                                                    <Icon name="close" size={22} color="#DC2626" />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.approveIconBtn}
                                                    onPress={() => fetchauthoriseddata(item, 1)}
                                                >
                                                    <Icon name="check" size={22} color="#16A34A" />
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    )
                                }
                            </View>
                        );
                    }}

                    ListEmptyComponent={
                        < View style={styles.emptyContainer} >

                            <View style={styles.emptyIconBox}>
                                <Icon name="inventory-2" size={60} color="#AAB7C4" />
                            </View>

                            <Text style={styles.emptyTitle}>
                                No Production Merge Data
                            </Text>

                            <Text style={styles.emptySubtitle}>
                                Production Merge records will appear here
                            </Text>
                        </View >
                    }
                />
            )}

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
    );
};

export default ProductionMergeAuth;

const styles = StyleSheet.create({

    container: { flex: 1, backgroundColor: "#F4F6FA", },
    header: {
        paddingTop: 60, paddingBottom: 28, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomLeftRadius: 34, borderBottomRightRadius: 34,
        elevation: 12, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12,
    },
    headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: 0.5, },
    headerIconBtn: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", },
    mainSearchBox: {
        flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 20, marginTop: -20, borderRadius: 22, paddingHorizontal: 18, height: 50, elevation: 10, shadowColor: "#000",
        shadowOpacity: 0.12, shadowRadius: 12,
    },
    mainSearchInput: {
        flex: 1,
        marginLeft: 14,
        color: "#111",
        fontSize: 16,
        fontWeight: "500",
        paddingRight: 10,
    },
    tabContainer: { flexDirection: "row", marginHorizontal: 18, marginTop: 18, backgroundColor: "#EAF2F4", borderRadius: 20, padding: 5, alignSelf: "center", width: "92%", },
    tabBtn: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: "center", justifyContent: "center", },
    activeTab: { backgroundColor: "#127C85", elevation: 6, shadowColor: "#14919B", shadowOpacity: 0.35, shadowRadius: 10, },
    tabText: { color: "#344054", fontWeight: "700", fontSize: 14, },
    activeTabText: { color: "#fff", },
    infoBox: { flex: 1, },
    merchantName: { marginTop: 2, fontSize: 12, color: "#6B7280", fontWeight: "500", },
    bottomRow: { marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", },
    bottomLabel: { color: "#64748B", fontSize: 11, fontWeight: "700", marginBottom: 2, },
    amountSection: { flex: 1, },
    storeSection: { alignItems: "flex-end", },
    qtyText: { color: "#DC2626", fontSize: 18, fontWeight: "800", },
    amountText: { color: "#DC2626", fontSize: 16, fontWeight: "800", },
    billText: { marginTop: 6, fontSize: 13, color: "#64748B", fontWeight: "700", },
    dateText: { color: "#000", fontSize: 13, fontWeight: "500", },
    billBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, },
    billBadgeText: { color: "#000", fontSize: 12, fontWeight: "600", },
    statusBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 30, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", },
    merchantBox: { marginTop: 18, flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, },
    merText: { marginLeft: 8, color: "#334155", fontSize: 13, fontWeight: "700", flex: 1, },
    cardDivider: { height: 1, backgroundColor: "#EEF2F7", marginTop: 18, },
    purchaseBottom: { marginTop: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", },
    balanceText: { color: "#2563EB", fontSize: 14, fontWeight: "800", },
    storeBox: { flexDirection: "row", alignItems: "center", paddingHorizontal: 15, paddingVertical: 10, borderRadius: 18, backgroundColor: "#ECFEFF", borderWidth: 1, borderColor: "#CFFAFE", },
    purchaseTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", },
    emptyText: { textAlign: "center", color: "#000", fontSize: 16, },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end", },
    sheet: { backgroundColor: "#fff", borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 24, maxHeight: "90%", elevation: 20, },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", },
    modalTitle: { fontSize: 20, fontWeight: "700", color: "#000", },
    label: { marginTop: 18, marginBottom: 8, fontWeight: "700", color: "#000", },
    filterSearchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F4F6F8", borderRadius: 12, paddingHorizontal: 12, height: 48, },
    filterInput: { flex: 1, marginLeft: 8, color: "#000", },
    selectItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#eee", },
    loadBtn: {
        backgroundColor: "#14919B", height: 62, borderRadius: 20, marginTop: 28, justifyContent: "center", alignItems: "center", flexDirection: "row", elevation: 8,
        shadowColor: "#14919B", shadowOpacity: 0.35, shadowRadius: 12,
    },
    loadText: { color: "#fff", fontWeight: "700", marginLeft: 8, },
    selectBox: {
        height: 60, backgroundColor: "#F8FAFB", borderRadius: 18, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        borderWidth: 1, borderColor: "#E5E7EB",
    },
    selectText: { color: "#000", flex: 1, fontSize: 15, },
    dropdownBox: { backgroundColor: "#fff", borderRadius: 14, marginTop: 10, padding: 10, elevation: 5, },
    emptyContainer: { marginTop: 120, alignItems: "center", },
    emptyIconBox: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#EDF3F5", justifyContent: "center", alignItems: "center", },
    emptyTitle: { marginTop: 24, fontSize: 18, fontWeight: "800", color: "#111827", },
    emptySubtitle: { marginTop: 8, fontSize: 15, color: "#000", },
    skeletonCard: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 14, borderRadius: 20, padding: 16, elevation: 4, },
    skeletonHeader: { flexDirection: "row", alignItems: "center", },
    skeletonCircle: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#E5E7EB", marginRight: 14, },
    skeletonLineLarge: { height: 18, width: "80%", borderRadius: 8, backgroundColor: "#E5E7EB", },
    skeletonLineSmall: { height: 14, width: "50%", borderRadius: 8, backgroundColor: "#E5E7EB", marginTop: 10, },
    skeletonMiddle: { height: 14, width: "90%", borderRadius: 8, backgroundColor: "#E5E7EB", marginTop: 22, },
    skeletonFooter: { height: 18, width: "40%", borderRadius: 8, backgroundColor: "#E5E7EB", marginTop: 22, },
    infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 4, },
    doubleRow: { flexDirection: "row", marginTop: 14, },
    doubleItem: { flex: 1, marginRight: 10, },
    infoLabel: { color: "#000", fontSize: 14, fontWeight: "700", marginBottom: 3, },
    infoValue: { color: "#111827", fontSize: 13, fontWeight: "600", },
    bottomMainRow: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", },
    actionContainer: { flexDirection: "row", alignItems: "center", },
    topSectionNew: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cardDividerNew: {
        height: 1,
        backgroundColor: "#EEF2F6",
        marginTop: 10,
    },
    itemTitleNew: {
        fontSize: 17,
        fontWeight: "800",
        color: "#111827",
    },
    mergeTitleNew: {
        marginTop: 4,
        fontSize: 13,
        color: "#667085",
        fontWeight: "600",
    },
    infoGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    infoRowNew: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    infoLabelNew: {
        color: "#94A3B8",
        fontSize: 12,
        fontWeight: "700",
        marginRight: 4,
    },
    infoValueNew: {
        color: "#111827",
        fontSize: 13,
        fontWeight: "700",
    },
    qtyValueNew: {
        color: "#111827",
        fontSize: 14,
        fontWeight: "900",
    },
    storeValueNew: {
        color: "#155EEF",
        fontSize: 14,
        fontWeight: "800",
    },
    bottomActionsNew: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 16,
    },
    rejectBtnNew: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        backgroundColor: "#FFF1F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    approveBtnNew: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        backgroundColor: "#ECFDF3",
        borderWidth: 1,
        borderColor: "#BBF7D0",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    rejectTextNew: {
        color: "#DC2626",
        fontSize: 14,
        fontWeight: "700",
        marginLeft: 6,
    },
    approveTextNew: {
        color: "#16A34A",
        fontSize: 14,
        fontWeight: "700",
        marginLeft: 6,
    },
    proCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 14,
        marginTop: 12,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: "#E9EEF5",
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 3,
        },
        overflow: "hidden",
    },
    leftAccent: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: "#14919B",
    },
    cardTopNew: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        marginHorizontal: -16,
        marginTop: -16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
    },
    topDate: {
        color: "#111827",
        fontSize: 14,
        fontWeight: "700",
    },
    topInward: {
        color: "#111827",
        fontSize: 14,
        fontWeight: "800",
    },
    mainItemName: {
        fontSize: 14,
        fontWeight: "800",
        color: "#111827",
        letterSpacing: 0.3,
    },
    subMerge: {
        marginTop: 5,
        color: "#000",
        fontSize: 13,
        fontWeight: "600",
    },
    proDivider: {
        height: 1,
        backgroundColor: "#EEF2F6",
        marginTop: 14,
        marginBottom: 10,
    },
    infoMainSection: {
        marginTop: 12,
    },
    infoSingleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    leftLabel: {
        color: "#000",
        fontSize: 13,
        fontWeight: "700",
    },
    rightValue: {
        color: "#111827",
        fontSize: 14,
        fontWeight: "700",
    },
    qtyProText: {
        color: "#111827",
        fontSize: 15,
        fontWeight: "900",
    },
    storeProText: {
        color: "#155EEF",
        fontSize: 15,
        fontWeight: "800",
    },
    buttonRowPro: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
    },
    rejectIconBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#cc3434",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    approveIconBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: "#ECFDF3",
        borderWidth: 1,
        borderColor: "#24c25b",
        justifyContent: "center",
        alignItems: "center",
    },
    itemStatusRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginTop: 14,
    },
    statusBadgePro: {
        backgroundColor: "#FEF3C7",
        borderWidth: 1,
        borderColor: "#FCD34D",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 30,
        marginLeft: 10,
    },
    statusTextPro: {
        color: "#B45309",
        fontSize: 11,
        fontWeight: "800",
    },
    rejectProText: {
        color: "#DC2626",
        fontSize: 14,
        fontWeight: "700",
        marginLeft: 5,
    },
    approveProText: {
        color: "#16A34A",
        fontSize: 14,
        fontWeight: "700",
        marginLeft: 5,
    },
    newCard: {
        backgroundColor: "#fff",
        marginHorizontal: 12,
        marginTop: 10,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#EEF1F5",
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: {
            width: 0,
            height: 2,
        },
    },
    topRowNew: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    dateTextNew: {
        color: "#667085",
        fontSize: 12,
        fontWeight: "600",
    },
    inwardTextNew: {
        color: "#111827",
        fontSize: 13,
        fontWeight: "800",
    },
    middleSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 14,
    },
    detailBox: {
        flex: 1,
        marginRight: 6,
    },
    detailLabel: {
        color: "#98A2B3",
        fontSize: 10,
        marginBottom: 4,
        fontWeight: "700",
    },
    detailValue: {
        color: "#111827",
        fontSize: 12,
        fontWeight: "700",
    },
    bottomMainSection: {
        marginTop: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    bottomTitle: {
        color: "#98A2B3",
        fontSize: 10,
        marginBottom: 4,
        fontWeight: "700",
    },
    qtyTextNew: {
        color: "#111827",
        fontSize: 15,
        fontWeight: "900",
    },
    storeTextNew: {
        color: "#155EEF",
        fontSize: 14,
        fontWeight: "800",
    },
    actionBtns: {
        flexDirection: "row",
        alignItems: "center",
    },
    rejectCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 2,
        borderColor: "#FF3B30",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    approveCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 2,
        borderColor: "#16A34A",
        justifyContent: "center",
        alignItems: "center",
    },
    topMainRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    leftTopRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    logoBox: {
        width: 54,
        height: 34,
        justifyContent: "center",
    },
    logoText: {
        fontSize: 22,
        fontWeight: "900",
        color: "#155EEF",
    },
    cardNumber: {
        color: "#111827",
        fontSize: 18,
        fontWeight: "700",
    },
    corporateBadge: {
        backgroundColor: "#EEF2FF",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        marginTop: 6,
        alignSelf: "flex-start",
    },
    corporateText: {
        color: "#5B5BD6",
        fontSize: 12,
        fontWeight: "700",
    },
    rightTopSection: {
        alignItems: "flex-end",
    },
    reqNo: {
        color: "#667085",
        fontSize: 13,
        fontWeight: "700",
    },
    dateTime: {
        color: "#667085",
        fontSize: 11,
        marginTop: 2,
        fontWeight: "500",
    },
    userName: {
        fontSize: 20,
        fontWeight: "800",
        color: "#111827",
    },
    companyName: {
        fontSize: 13,
        color: "#667085",
        marginTop: 1,
        fontWeight: "500",
    },
    centerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 14,
    },
    categoryBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F0FF",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    categoryText: {
        marginLeft: 4,
        color: "#5B5BD6",
        fontSize: 12,
        fontWeight: "700",
    },
    amountSectionNew: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: "#E5E7EB",

        paddingHorizontal: 14,
        marginHorizontal: 10,
    },
    amountLabel: {
        color: "#667085",
        fontSize: 11,
        marginBottom: 2,
    },
    amountValue: {
        fontSize: 16,
        fontWeight: "900",
        color: "#111827",
    },
    bottomRowNew: {
        marginTop: 14,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    bottomLabelNew: {
        color: "#98A2B3",
        fontSize: 11,
        marginBottom: 2,
        fontWeight: "700",
    },
    bottomValueNew: {
        color: "#111827",
        fontSize: 13,
        fontWeight: "700",
    },
    bottomValueBlue: {
        color: "#155EEF",
        fontSize: 13,
        fontWeight: "800",
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
    clearBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    partyMainSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginTop: 14,
    },

    partyCodeText: {
        fontSize: 15,
        fontWeight: "800",
        color: "#111827",
    },

    partyNameText: {
        marginTop: 4,
        fontSize: 13,
        color: "#111827",
        fontWeight: "600",
        paddingRight: 10,
    },
    authBadge: {
        backgroundColor: "#ECFDF3",
        borderColor: "#22C55E",
    },

    pendingBadge: {
        backgroundColor: "#FEF3C7",
        borderColor: "#FCD34D",
    },

    authText: {
        color: "#15803D",
    },

    pendingText: {
        color: "#B45309",
    },
    authorisedCard: {
        borderColor: "#22C55E",
        borderWidth: 3,
    },

    rejectCard: {
        borderColor: "#EF4444",
        borderWidth: 3,
    },
    authFooterRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 4,
    },

    authFooterBoxLeft: {
        flex: 1,
        alignItems: "flex-start",
    },

    authFooterBoxCenter: {
        flex: 1,
        alignItems: "center",
    },

    authFooterBoxRight: {
        flex: 1,
        alignItems: "flex-end",
    },

    authFooterBox: {
        flex: 1,
    },

    authFooterLabel: {
        color: "#111827",
        fontSize: 11,
        fontWeight: "700",
        marginBottom: 4,
    },

    authFooterValue: {
        color: "#111827",
        fontSize: 13,
        fontWeight: "800",
    },
    remarkMainBox: {
        marginTop: 4,
        marginBottom: 8,
    },

    remarkLabel: {
        color: "#111827",
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 8,
    },

    remarkInput: {
        minHeight: 45,
        borderWidth: 1,
        borderColor: "#D0D5DD",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#fff",
        color: "#111827",
        fontSize: 13,
    },
    historyRemarkBox: {
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#627fa5",
    },

    historyRemarkLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#000",
        marginBottom: 4,
    },

    historyRemarkText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#111827",
        lineHeight: 18,
    },
    remarkRowBox: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        marginBottom: 8,
    },

    remarkLeftLabel: {
        width: 70,
        color: "#111827",
        fontSize: 13,
        fontWeight: "700",
    },

    remarkRightInput: {
        flex: 1,
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#000",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#fff",
        color: "#111827",
        fontSize: 13,
    },
    topInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 14,
    },

    topInfoBox: {
        width: "48%",
    },

    middleInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 18,
        marginTop: 14,
    },

    middleInfoBox: {
        flex: 1,
    },

    cartNoValue: {
        color: "#7C3AED",
        fontSize: 14,
        fontWeight: "800",
    },

    bottomQtyRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 14,
        marginTop: 4,
    },

    bottomQtyBox: {
        flex: 1,
        alignItems: "flex-start",
    },

    bottomQtyBoxCenter: {
        flex: 1,
        alignItems: "center",
    },

    bottomQtyBoxRight: {
        flex: 1,
        alignItems: "flex-end",
    },

    newLabel: {
        color: "#111827",
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 4,
    },

    newValue: {
        color: "#111827",
        fontSize: 13,
        fontWeight: "800",
    },

    qtyNewValue: {
        color: "#111827",
        fontSize: 14,
        fontWeight: "900",
    },

    storeNewValue: {
        color: "#155EEF",
        fontSize: 14,
        fontWeight: "800",
    },
    infoIconBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        justifyContent: "center",
        alignItems: "center",
        marginRight: "auto",
    },

    poInfoBox: {
        backgroundColor: "#F8FAFC",
        overflow: "hidden",
        borderRadius: 14,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        maxHeight: 230,
    },

    poInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: "#E5E7EB",
    },

    poInfoLabel: {
        color: "#111827",
        fontSize: 12,
        fontWeight: "700",
    },

    poInfoValue: {
        color: "#111827",
        fontSize: 13,
        fontWeight: "800",
    },

    poMainRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 18,
    },

    mergeMainCard: {
        backgroundColor: "#F8FBFD",

        borderRadius: 22,

        padding: 16,

        marginBottom: 16,

        borderWidth: 1,
        borderColor: "#E4EDF2",
    },

    mergeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 14,
        // marginBottom: 14,
    },

    mergeLeft: {
        width: "48%",
        marginRight: 8,
    },

    mergeRight: {
        width: "48%",
        alignItems: "flex-end",
    },

    mergeLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "#111827",

        marginBottom: 6,

        // textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    mergeValue: {
        fontSize: 14,
        fontWeight: "800",
        color: "#111827",
    },

    mergeDivider: {
        height: 1,
        backgroundColor: "#E5E7EB",

        marginVertical: 14,
    },

    poInfoIconBtn: {
        width: 40,
        height: 40,
        marginLeft: "auto",
        borderRadius: 10,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        justifyContent: "center",
        alignItems: "center",
    },
    poHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },

    poHeaderText: {
        color: "#000",
        fontSize: 12,
        fontWeight: "800",
    },
    poScrollArea: {
        maxHeight: 160,
        minHeight: 160,
        paddingRight: 4,
    },
    createdMainRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        // marginTop: 14,
        marginBottom: 4,
    },

    createdLeftSection: {
        flex: 1,
    },

    createdRightSection: {
        width: 120,
        alignItems: "flex-end",
    },

    createdLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 3,
    },

    createdValue: {
        fontSize: 14,
        fontWeight: "800",
        color: "#111827",
    },
});