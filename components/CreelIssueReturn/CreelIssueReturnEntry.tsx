import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList, Alert, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import { API } from "../../common/API/dynamicAPI";
import CustomSearchableDropdown from '../Shared/CustomSearchableDropdown';

const CreelIssueReturnEntry = ({ navigation, route }) => {

    const { creelData, itemList = [], mergeList = [], gradeList = [], shadeList = [] } = route.params || {};
    const selectedProperty = route?.params?.selectedProperty;
    const selectedYear = route?.params?.selectedYear;
    const token = route?.params?.token;
    const prpcode = typeof selectedProperty === "object" ? selectedProperty?.PrpCode : selectedProperty;
    const yearno = selectedYear?.slice(-2);
    const [cartonType, setCartonType] = useState("Single");
    const [status, setStatus] = useState("Open");
    const [selectedCreel, setSelectedCreel] = useState(null);
    const [form, setForm] = useState({
        CartNo: "",
        ItmCode: null,
        MerCode: null,
        GrdCode: null,
        ShdCode: null,
        TotPcs: "",
        TotQty: "",
        IssUId: null,
        IssSrNo: null,
        IssQty: 0,
        IssChees: 0,
        StkType: null,
        PrpCode: prpcode,
        StrCode: '002',
        YearNo: yearno,
        IsCartonType: 0,
        IsCartonStatus: 0,
        Denier: "",
    });
    const [linkModal, setLinkModal] = useState(false);
    const [linkData, setLinkData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [getItemData, setItemData] = useState([]);
    const [getMergeData, setMergeData] = useState([]);
    const [getGradeData, setGradeData] = useState([]);
    const [getShadeData, setShadeData] = useState([]);
    const [selectedBatchNo, setSelectedBatchNo] = useState("");
    const [searchText, setSearchText] = useState("");
    const [filteredCreelData, setFilteredCreelData] = useState([]);
    const [denier, setDenier] = useState("");
    const [alertData, setAlertData] = useState({
        visible: false,
        message: "",
        type: "warning"
    });

    const showWarning = (msg) => {
        setAlertData({
            visible: true,
            message: msg,
            type: "warning"
        });
    };

    const showSuccess = (msg) => {
        setAlertData({
            visible: true,
            message: msg,
            type: "success"
        });
    };

    const showError = (msg) => {
        setAlertData({
            visible: true,
            message: msg,
            type: "error"
        });
    };

    useEffect(() => {
        setForm(prev => ({
            ...prev,
            IsCartonType: cartonType === "Single" ? 0 : 1
        }));
    }, [cartonType]);

    useEffect(() => {
        setForm(prev => ({
            ...prev,
            IsCartonStatus: status === "Open" ? 0 : 1
        }));
    }, [status]);

    const isDisabled = cartonType === "Single";

    useEffect(() => {
        const loadAllFunctions = async () => {
            const prpcode = typeof selectedProperty === "object" ? selectedProperty?.PrpCode : selectedProperty;
            const prptype = typeof selectedProperty === "object" ? selectedProperty?.PrpOf : selectedProperty;
            const yearno = selectedYear?.slice(-2);

            if (typeof prpcode != 'undefined' && prpcode != null && prpcode != '' && typeof yearno != 'undefined' && yearno != null && yearno != '') {
                const itmdata = await getAllItems(token);
                setItemData(itmdata);
                const merdata = await getAllMerges(token);
                setMergeData(merdata);
                const grdata = await getAllGrades(token);
                setGradeData(grdata);
                const shdata = await getAllShades(token);
                setShadeData(shdata);
            }
        };
        loadAllFunctions();
    }, []);

    const fetchCreelData = async () => {
        if (!selectedProperty) return;

        setLoading(true);
        try {
            const prpcode = typeof selectedProperty === "object" ? selectedProperty?.PrpCode : selectedProperty;
            const prptype = typeof selectedProperty === "object" ? selectedProperty?.PrpOf : selectedProperty;
            const yearno = selectedYear?.slice(-2);

            const payload = {
                prpcode,
                prptype,
                yearno,
                strcode: "002",
                txntype: "creel_issue_return"
            };

            console.log("🚀 FINAL PAYLOAD:", payload);
            //console.log(`${API}/api/get_creel_issue_detail`);

            const res = await axios.post(`${API}/api/get_creel_issue_detail`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-with': 'XMLHttpRequest',
                }
            });

            console.log("✅ FULL RESPONSE:", res.data);

            const rawData = res?.data?.response?.data || res?.data?.data || res?.data?.result || [];

            if (Array.isArray(rawData) && rawData.length > 0) {
                setLinkData(rawData);
                setFilteredCreelData(rawData);
            } else {
                console.log("⚠️ No data returned from API");
                setLinkData([]);
                setFilteredCreelData([]);
            }
        } catch (error) {
            console.log("❌ API ERROR:", error?.response?.data || error.message);
            setLinkData([]);
        } finally {
            setLoading(false);
        }
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

        const prpcode = typeof selectedProperty === "object" ? selectedProperty?.PrpCode : selectedProperty;
        const yearno = selectedYear?.slice(-2);

        try {
            const historyPayload = {
                prpcode,
                yearno,
                strcode: '002',
                itemcode: '',
                itemname: '',
                isall: '1',
                txntype: 'creel_issue_return',
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
                setItemData(response.data.response.data);
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

        const prpcode = typeof selectedProperty === "object" ? selectedProperty?.PrpCode : selectedProperty;
        const yearno = selectedYear?.slice(-2);

        try {
            const historyPayload = {
                prpcode,
                yearno,
                strcode: '002',
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'creel_issue_return',
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
                setMergeData(response.data.response.data);
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
        const prpcode = typeof selectedProperty === "object" ? selectedProperty?.PrpCode : selectedProperty;
        const yearno = selectedYear?.slice(-2);
        try {
            const historyPayload = {
                prpcode,
                yearno,
                strcode: '002',
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'creel_issue_return',
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
                setGradeData(response.data.response.data);
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
        const prpcode = typeof selectedProperty === "object" ? selectedProperty?.PrpCode : selectedProperty;
        const yearno = selectedYear?.slice(-2);
        try {
            const historyPayload = {
                prpcode,
                yearno,
                strcode: '002',
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'creel_issue_return',
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
                setShadeData(response.data.response.data);
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

    const handleSaveData = async () => {

        setLoading(true);

        try {

            // 🔴 REQUIRED FIELD VALIDATION
            if (!selectedBatchNo) {
                showWarning("Please select Creel first.");
                return;
            }

            if (!form.CartNo) {
                showWarning("Please enter Carton No.");
                return;
            }

            if (!form.ItmCode) {
                showWarning("Please select Item.");
                return;
            }

            if (!form.MerCode) {
                showWarning("Please select Merge.");
                return;
            }

            if (!form.GrdCode) {
                showWarning("Please select Grade.");
                return;
            }

            if (!form.ShdCode) {
                showWarning("Please select Shade.");
                return;
            }

            if (!form.TotPcs) {
                showWarning("Please enter Cheese.");
                return;
            }

            if (!form.TotQty) {
                showWarning("Please enter Weight.");
                return;
            }

            const pcs = Number(form.TotPcs || 0);
            const qty = Number(form.TotQty || 0);
            const maxPcs = Number(form.IssChees || 0);
            const maxQty = Number(form.IssQty || 0);

            if (pcs > maxPcs) {
                showWarning(
                    `The entered Cheese (${pcs}) exceeds the allowed limit of ${maxPcs}.`
                );
                return;
            }

            if (qty > maxQty) {
                showWarning(
                    `The entered Weight (${qty}) exceeds the allowed limit of ${maxQty}.`
                );
                return;
            }

            console.log("📦 Data To be saved:", form);

            const payload = {
                ...form,
                IsCartonType: cartonType === "Single" ? 0 : 1,
                IsCartonStatus: status === "Open" ? 0 : 1
            };

            console.log("🚀 FINAL PAYLOAD:", payload);

            const res = await axios.post(
                `${API}/api/add_creel_issue_return`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'X-Requested-with': 'XMLHttpRequest',
                    }
                }
            );

            console.log("✅ SAVE RESPONSE:", res.data);

            const isSuccess = res?.data?.success === true && res?.data?.response?.error === false;

            const resData = res?.data;

            if (resData?.message === false) {
                showWarning(resData?.response?.message);
            } else if (resData?.response?.error === true) {
                showWarning(resData?.response?.message);
            } else if (resData?.success === true) {
                showSuccess(resData?.response?.message);
            } else {
                showError(resData?.message);
            }
        } catch (error) {
            console.log("❌ SAVE ERROR:", error?.response?.data || error.message);
            let errorMessage = "An unexpected error occurred while saving.";
            if (error?.response) {
                console.log("ERROR SAVE ENTRY:", error?.response);
                const status = error.response.status;

                if (status === 500) {
                    errorMessage = "Server error (500). Please try again later or contact support.";
                } else if (status === 400) {
                    errorMessage = error.response.data?.message || "Bad request.";
                } else if (status === 404) {
                    errorMessage = "API not found (404).";
                } else {
                    errorMessage = error.response.data?.message || errorMessage;
                }
            } else if (error?.message) {
                errorMessage = error.message;
            }
            showAlert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearchText(text);

        if (!text) {
            setFilteredCreelData(linkData);
            return;
        }

        const lowerText = text.toLowerCase();

        const filtered = linkData.filter(item =>
            item.ItmName?.toLowerCase().includes(lowerText) ||
            item.BatchNo?.toLowerCase().includes(lowerText) ||
            item.GrdName?.toLowerCase().includes(lowerText) ||
            item.ShdName?.toLowerCase().includes(lowerText) ||
            item.MerName?.toLowerCase().includes(lowerText)
        );

        setFilteredCreelData(filtered);
    };

    const SelectBox = ({ label, value, onPress }) => (
        <TouchableOpacity style={styles.selectBox} onPress={onPress}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.selectInner}>
                <Text style={{ color: value ? "#000" : "#999" }}>
                    {value || "Select"}
                </Text>
                <Icon name="arrow-drop-down" size={20} color="#555" />
            </View>
        </TouchableOpacity>
    );

    const ToggleSwitch = ({ options, value, onChange }) => {
        return (
            <View style={styles.switchContainer}>
                {options.map((opt, index) => {
                    const isActive = value === opt;

                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[
                                styles.switchOption,
                                isActive && styles.switchActive
                            ]}
                            onPress={() => onChange(opt)}
                        >
                            <Text style={[
                                styles.switchText,
                                isActive && styles.switchTextActive
                            ]}>
                                {opt}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Entry</Text>

                <View style={{ width: 22 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>

                {/* <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>

                    <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.sectionTitle}>Selected Creel</Text>
                        <Text style={styles.creelText}>
                            {selectedBatchNo || "-"}
                        </Text>
                    </View>

                    <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.label}>Carton No</Text>
                        <TextInput
                            style={styles.input}
                            value={form.CartNo}
                            onChangeText={v => {
                                setForm(prev => ({
                                    ...prev,
                                    CartNo: v || '',
                                }));
                            }}
                            placeholder="Enter Carton No"
                            placeholderTextColor="#000"
                        />
                    </View>

                </View> */}

                {/* <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Selected Creel</Text>
                    <Text style={styles.creelText}>
                        {selectedBatchNo || "-"}
                    </Text>
                </View> */}

                <View style={styles.card}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View>
                            <Text style={styles.sectionTitle}>Selected Creel</Text>
                            <Text style={styles.creelText}>
                                {selectedBatchNo || "No Creel Selected"}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.linkBtnSmall}
                            onPress={() => {
                                fetchCreelData();
                                setLinkModal(true);
                            }}
                        >
                            <Icon name="link" size={16} color="#0F6C7B" />
                            <Text style={styles.linkBtnText}>Link Creel</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Carton Type</Text>
                    <ToggleSwitch
                        options={["Single", "Mix"]}
                        value={cartonType}
                        onChange={setCartonType}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Carton No</Text>
                    <TextInput
                        style={styles.input}
                        value={form.CartNo}
                        onChangeText={v => {
                            setForm(prev => ({
                                ...prev,
                                CartNo: v || '',
                            }));
                        }}
                        placeholder="Enter Carton No"
                        placeholderTextColor="#000"
                    />
                </View>
                {/* <TouchableOpacity
                    style={{
                        backgroundColor: "#0F6C7B",
                        padding: 12,
                        borderRadius: 10,
                        alignItems: "center",
                        marginBottom: 12
                    }}
                    onPress={() => {
                        fetchCreelData();
                        setLinkModal(true)
                    }}
                >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                        + Link Creel
                    </Text>
                </TouchableOpacity> */}

                <View style={{ marginBottom: 10, opacity: isDisabled ? 0.5 : 1 }} >
                    <Text style={styles.label}>
                        Select Item <Text style={{ color: 'red' }}> * </Text>
                    </Text>

                    <CustomSearchableDropdown
                        // key={form.ItmCode}   // 👈 ADD THIS BACK
                        data={getItemData}
                        labelKey="ItmName"
                        valueKey="ItmCode"
                        value={form.ItmCode}
                        disabled={isDisabled}
                        placeholder="Choose item..."
                        placeholderTextColor="#000"
                        onSelect={(itm) => {
                            if (isDisabled) return;
                            setForm(prev => ({
                                ...prev,
                                ItmCode: itm?.ItmCode || '',
                            }));
                            setDenier(itm?.Denier || "");
                        }} />

                    <View style={{ height: 20, justifyContent: "center" }}>
                        <Text style={{ color: "#000", fontSize: 15 }}>
                            {denier ? `Denier: ${denier}` : ""}
                        </Text>
                    </View>
                </View>

                <View style={{ marginBottom: 10, opacity: isDisabled ? 0.5 : 1 }} >
                    <Text style={styles.label}>
                        Select Merge <Text style={{ color: 'red' }}> * </Text>
                    </Text>

                    <CustomSearchableDropdown
                        // key={form.MerCode}
                        data={getMergeData}
                        labelKey="MerName"
                        valueKey="MerCode"
                        value={form.MerCode}
                        disabled={isDisabled}
                        placeholder="Choose merge..."
                        onSelect={(mrg) => {
                            if (isDisabled) return;
                            setForm(prev => ({
                                ...prev,
                                MerCode: mrg?.MerCode || '',
                            }));
                        }}
                    />
                </View>

                <View style={{ marginBottom: 10, opacity: isDisabled ? 0.5 : 1 }} >
                    <Text style={styles.label}>
                        Select Grade <Text style={{ color: 'red' }}> * </Text>
                    </Text>

                    <CustomSearchableDropdown
                        // key={form.GrdCode}
                        data={getGradeData}
                        labelKey="GrdName"
                        valueKey="GrdCode"
                        value={form.GrdCode}
                        disabled={isDisabled}
                        placeholder="Choose grade..."
                        onSelect={(grd) => {
                            if (isDisabled) return;
                            setForm(prev => ({
                                ...prev,
                                GrdCode: grd?.GrdCode || '',
                            }));
                        }}
                    />
                </View>

                <View style={{ marginBottom: 10, opacity: isDisabled ? 0.5 : 1 }} >
                    <Text style={styles.label}>
                        Select Shade <Text style={{ color: 'red' }}> * </Text>
                    </Text>

                    <CustomSearchableDropdown
                        // key={form.ShdCode}
                        data={getShadeData}
                        labelKey="ShdName"
                        valueKey="ShdCode"
                        value={form.ShdCode}
                        disabled={isDisabled}
                        placeholder="Choose shade..."
                        onSelect={(shd) => {
                            if (isDisabled) return;
                            setForm(prev => ({
                                ...prev,
                                ShdCode: shd?.ShdCode || '',
                            }));
                        }}
                    />
                </View>

                {/* <View style={styles.card}>
                    <Text style={styles.label}>Cheese</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={form.Pcs}
                        onChangeText={v => {
                            setForm(prev => ({
                                ...prev,
                                TotPcs: v || '',
                            }));
                        }}
                        placeholder="Enter Cheese"
                        placeholderTextColor="#000"
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Weight</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={form.TotQty}
                        onChangeText={v => {
                            setForm(prev => ({
                                ...prev,
                                TotQty: v || '',
                            }));
                        }}
                        placeholder="Enter Weight"
                        placeholderTextColor="#000"
                    />
                </View> */}

                <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                    <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.label}>Cheese</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={form.TotPcs}
                            onChangeText={v => {
                                setForm(prev => ({
                                    ...prev,
                                    TotPcs: v || '',
                                }));
                            }}
                            placeholder="Enter Cheese"
                            placeholderTextColor="#000"
                        />
                    </View>

                    <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.label}>Weight</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={form.TotQty}
                            onChangeText={v => {
                                setForm(prev => ({
                                    ...prev,
                                    TotQty: v || '',
                                }));
                            }}
                            placeholder="Enter Weight"
                            placeholderTextColor="#000"
                        />
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Status</Text>
                    <ToggleSwitch
                        options={["Open", "Close"]}
                        value={status}
                        onChange={setStatus}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSaveData}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={{ color: "#fff", fontWeight: "600" }}>
                            Save Entry
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <Modal transparent visible={linkModal} animationType="slide">
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
                    <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "70%" }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ fontSize: 16, fontWeight: "600", color: '#000' }}>
                                Select Creel
                            </Text>

                            <TouchableOpacity onPress={() => setLinkModal(false)}>
                                <Icon name="close" size={22} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            placeholder="Search..."
                            placeholderTextColor="#000"
                            value={searchText}
                            onChangeText={handleSearch}
                            style={{
                                backgroundColor: "#f3f3f3", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
                                marginTop: 12, marginBottom: 10, fontSize: 14
                            }}
                        />

                        <FlatList
                            // data={linkData}
                            data={filteredCreelData}
                            keyboardShouldPersistTaps="handled"
                            keyExtractor={(item, index) => index.toString()}
                            contentContainerStyle={{ paddingTop: 10 }}
                            renderItem={({ item }) => (

                                <TouchableOpacity
                                    style={[
                                        styles.creelCardPro,
                                        selectedCreel?.UId === item.UId &&
                                        selectedCreel?.SrNo === item.SrNo &&
                                        String(selectedCreel?.SubSr) === String(item.SubSr || item.IssSubSr || 1) &&
                                        styles.selectedCardPro,
                                    ]}
                                    onPress={() => {

                                        const selectedItem = getItemData.find(
                                            itm => String(itm.ItmCode) === String(item.ItmCode)
                                        );

                                        setDenier(selectedItem?.Denier || "");

                                        setSelectedCreel({
                                            UId: item.UId,
                                            SrNo: item.SrNo,
                                            SubSr: item.SubSr || item.IssSubSr || 1,
                                        });

                                        setSelectedBatchNo(item.BatchNo);

                                        setForm(prev => ({
                                            ...prev,
                                            ItmCode: String(item.ItmCode),
                                            Denier: selectedItem?.Denier || "",
                                            MerCode: String(item.MerCode),
                                            GrdCode: String(item.GrdCode),
                                            ShdCode: String(item.ShdCode),
                                            IssUId: item.UId,
                                            IssSrNo: item.SrNo,
                                            IssSubSr: item.SubSr || item.IssSubSr || 1,
                                            IssChees: item.Pcs,
                                            IssQty: item.Qty,
                                            StkType: item.StkType
                                        }));

                                        setLinkModal(false);
                                    }}
                                >

                                    {/* TOP ROW */}
                                    <View style={styles.rowBetween}>

                                        <Text style={styles.itemTitlePro} numberOfLines={1}>
                                            {item.ItmName}
                                        </Text>

                                        <View style={styles.batchBadgePro}>
                                            <Text style={styles.batchTextPro}>
                                                Creel No : {item.BatchNo}
                                            </Text>
                                        </View>

                                    </View>

                                    {/* GRID */}
                                    <View style={styles.gridRow}>

                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>Grade</Text>
                                            <Text style={styles.gridValue}>{item.GrdName}</Text>
                                        </View>

                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>Shade</Text>
                                            <Text style={styles.gridValue}>{item.ShdName}</Text>
                                        </View>

                                    </View>

                                    <View style={styles.gridRow}>

                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>Merge</Text>
                                            <Text style={styles.gridValue}>{item.MerName}</Text>
                                        </View>

                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>SubSr</Text>
                                            <Text style={styles.gridValue}>
                                                {item.SubSr || item.IssSubSr || 1}
                                            </Text>
                                        </View>

                                    </View>

                                    {/* FOOTER */}
                                    <View style={styles.footerRow}>
                                        <Text style={styles.qtyLabel}>Bal Qty</Text>
                                        <Text style={styles.qtyValue}>{item.BalQty}</Text>
                                    </View>

                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            <Modal transparent visible={alertData.visible} animationType="fade">
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" }}>
                    <View style={{ width: "85%", backgroundColor: "#fff", borderRadius: 15, padding: 20, alignItems: "center" }}>
                        <Icon
                            name={
                                alertData.type === "success"
                                    ? "check-circle"
                                    : alertData.type === "error"
                                        ? "error"
                                        : "warning"
                            }
                            size={40}
                            color={
                                alertData.type === "success"
                                    ? "#4CAF50"
                                    : alertData.type === "error"
                                        ? "#F44336"
                                        : "#FFA000"
                            }
                        />

                        <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 10, color: "#000" }}>
                            {alertData.type === "success"
                                ? "Success"
                                : alertData.type === "error"
                                    ? "Error"
                                    : "Warning"}
                        </Text>

                        <Text style={{ textAlign: "center", marginTop: 8, color: "#444" }}>
                            {alertData.message}
                        </Text>

                        <TouchableOpacity
                            onPress={() => setAlertData({ visible: false, message: "" })}
                            style={{ marginTop: 15, backgroundColor: "#0F6C7B", paddingHorizontal: 25, paddingVertical: 10, borderRadius: 8 }}
                        >
                            <Text style={{ color: "#fff", fontWeight: "600" }}>
                                OK
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default CreelIssueReturnEntry;

const styles = StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0F6C7B", padding: 15, },
    headerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
    card: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 12, elevation: 2 },
    sectionTitle: { fontWeight: "600", marginBottom: 10, color: "#000" },
    creelText: { fontSize: 16, fontWeight: "bold", color: "#0F2027" },
    label: { fontSize: 12, color: "#000", marginBottom: 6 },
    input: { backgroundColor: "#f3f3f3", borderRadius: 8, padding: 10, color: "#000" },
    selectBox: { backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 12, elevation: 2 },
    selectInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    toggleRow: { flexDirection: "row" },
    toggleBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#0F6C7B", marginRight: 6, alignItems: "center" },
    toggleActive: { backgroundColor: "#0F6C7B" },
    toggleText: { color: "#0F6C7B" },
    saveBtn: { backgroundColor: "#0F6C7B", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
    creelCard: {
        backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, borderLeftWidth: 5, borderLeftColor: "#0F6C7B",
        shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3
    },
    creelTitle: { fontWeight: "600", color: "#000", fontSize: 15 },
    creelSub: { marginTop: 6, color: "#444", fontSize: 13 },
    creelSubLight: { marginTop: 2, color: "#777", fontSize: 12 },
    batchBadge: { flexDirection: "row", alignItems: "center", },
    batchLabel: { fontSize: 12, color: "#000", fontWeight: "600", marginRight: 6, },
    batchText: { fontSize: 13, color: "#000", fontWeight: "500", },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", },
    checkIcon: { position: "absolute", top: 10, right: 10, zIndex: 10 },
    infoGrid: { marginTop: 10, },
    infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, },
    infoLabel: { fontSize: 12, color: "#000", fontWeight: "600", marginRight: 6, },
    infoValue: { fontSize: 13, color: "#000", fontWeight: "500", },
    switchContainer: { flexDirection: "row", backgroundColor: "#E8F1F2", borderRadius: 12, padding: 4, },
    switchOption: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", },
    switchActive: { backgroundColor: "#0F6C7B", elevation: 3, },
    switchText: { color: "#0F6C7B", fontWeight: "600", },
    switchTextActive: { color: "#fff", },
    linkBtnSmall: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F1F2", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, },
    linkBtnText: { marginLeft: 4, color: "#0F6C7B", fontWeight: "600", fontSize: 14 },
    creelCardPro: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,

        borderWidth: 1,
        borderColor: "#EEF2F7",

        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },

        elevation: 3,
    },

    selectedCardPro: {
        borderColor: "#0F6C7B",
        backgroundColor: "#ECFEFF",
        shadowOpacity: 0.15,
        borderWidth: 2, // 👈 thoda bold border
    },

    itemTitlePro: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111827",
    },

    batchBadgePro: {
        backgroundColor: "#E6F7F9",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },

    batchTextPro: {
        fontSize: 11,
        fontWeight: "600",
        color: "#0F6C7B",
    },

    gridRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 6,
    },

    gridCol: {
        flex: 1,
    },

    gridLabel: {
        fontSize: 14,        // ⬅️ bada size
        color: "#000",       // ⬅️ pure black
        fontWeight: "600",   // ⬅️ thoda bold (professional feel)
    },

    gridValue: {
        fontSize: 12,
        // fontWeight: "600",
        color: "#111827",
    },

    footerRow: {
        marginTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
        paddingTop: 8,
    },

    qtyLabel: {
        fontSize: 11,
        color: "#000",
    },

    qtyValue: {
        fontSize: 16,
        fontWeight: "800",
        color: "#16A34A", // strong green
    },
});