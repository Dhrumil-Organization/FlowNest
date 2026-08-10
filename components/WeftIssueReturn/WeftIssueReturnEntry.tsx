import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList, Alert, ActivityIndicator } from "react-native";
import axios from "axios";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API, PRINTSTICKER, PRINTERSLISTAPI } from "../../common/API/dynamicAPI";
import CustomSearchableDropdown from '@/Shared/CustomSearchableDropdown';
import Icon from '@expo/vector-icons/MaterialIcons';
import { Snackbar } from 'react-native-snackbar';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FormState {
    CartNo: string;
    ItmCode: string | null;
    MerCode: string | null;
    GrdCode: string | null;
    ShdCode: string | null;
    TotPcs: string;
    TotQty: string;
    IssUId: number | null;
    IssSrNo: number | null;
    IssSubSr?: number | null;
    IssQty: number;
    IssChees: number;
    StkType: string | null;
    PrpCode: any;
    StrCode: string;
    YearNo: any;
    IsCartonType: number;
    IsCartonStatus: number;
    Denier: string;
    BeamUId: string;
    BeamNo: string;
}

const WeftIssueReturnEntry = ({ navigation, route }) => {
    const router = useRouter();
    const params = useLocalSearchParams();

    // const { creelData, itemList = [], mergeList = [], gradeList = [], shadeList = [] } = route.params || {};


    const selectedProperty = params?.selectedProperty ? JSON.parse(params?.selectedProperty) : null;
    const selectedYear = params?.selectedYear;
    // const token = params?.token;
    const prpcode = typeof selectedProperty === "object" ? selectedProperty?.PrpCode : selectedProperty;
    // const token = params?.token;
    const token = params.token as string;
    // const refresh = route?.params?.refresh;
    // const fromDate = route?.params?.fromDate;
    // const toDate = route?.params?.toDate;
    const yearno = selectedYear?.slice(-2);
    const [cartonType, setCartonType] = useState("Single");
    const [status, setStatus] = useState("Open");
    const [selectedCreel, setSelectedCreel] = useState(null);
    // const [form, setForm] = useState({
    //     CartNo: "",
    //     ItmCode: null,
    //     MerCode: null,
    //     GrdCode: null,
    //     ShdCode: null,
    //     TotPcs: "",
    //     TotQty: "",
    //     IssUId: null,
    //     IssSrNo: null,
    //     IssQty: 0,
    //     IssChees: 0,
    //     StkType: null,
    //     PrpCode: prpcode,
    //     StrCode: '002',
    //     YearNo: yearno,
    //     IsCartonType: 0,
    //     IsCartonStatus: 0,
    //     Denier: "",
    // });
    const [form, setForm] = useState<FormState>({
        CartNo: "",
        ItmCode: null,
        MerCode: null,
        GrdCode: null,
        ShdCode: null,
        TotPcs: "",
        TotQty: "",
        IssUId: null,
        IssSrNo: null,
        IssSubSr: null,
        IssQty: 0,
        IssChees: 0,
        StkType: null,
        PrpCode: prpcode,
        StrCode: "002",
        YearNo: yearno,
        IsCartonType: 0,
        IsCartonStatus: 0,
        Denier: "",
        BeamNo: "",
        BeamUId: ""
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
    });      // Save
    const [beamLoading, setBeamLoading] = useState(false);
    const [getPrinters, setPrinters] = useState([]);
    const [printer, setPrinter] = useState("");
    const [printerLoading, setPrinterLoading] = useState(false);
    const [printerError, setPrinterError] = useState("");
    const [printerModalVisible, setPrinterModalVisible] = useState(false);
    const [selectedPrinterStatus, setSelectedPrinterStatus] = useState("");
    const [printerSearch, setPrinterSearch] = useState("");
    const [getSavedData, setGetSavedData] = useState({});
    const [getDataSaved, setDataSaved] = useState(false)
    const [isLoading, setIsLoading] = useState(false);

    console.log("getSavedData", getSavedData);

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

        setBeamLoading(true);

        try {
            const prpcode = typeof selectedProperty === "object" ? selectedProperty?.PrpCode : selectedProperty;
            const prptype = typeof selectedProperty === "object" ? selectedProperty?.PrpOf : selectedProperty;
            const yearno = selectedYear?.slice(-2);

            const payload = {
                prpcode,
                prptype,
                yearno,
                strcode: "002",
                txntype: "beam_weft_issue_return"
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
            setBeamLoading(false);

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
                txntype: 'beam_weft_issue_return',
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
                txntype: 'beam_weft_issue_return',
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
                txntype: 'beam_weft_issue_return',
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
                txntype: 'beam_weft_issue_return',
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
                setGetSavedData(payload);
                setDataSaved(false);
                getAllPrinters();
            } else if (resData?.response?.error === true) {
                showWarning(resData?.response?.message);
                getAllPrinters();
                setGetSavedData(payload);
                setDataSaved(false);
            } else if (resData?.success === true) {
                showSuccess(resData?.response?.message);
                getAllPrinters();
                setGetSavedData(payload);
                setDataSaved(true);
            } else {
                showError(resData?.message);
            }

            // if (resData?.message === false) {
            //     showWarning(resData?.response?.message);

            // } else if (resData?.response?.error === true) {
            //     showWarning(resData?.response?.message);

            // }
            // else if (resData?.success === true) {
            //     setGetSavedData(payload);

            //     Alert.alert(
            //         "Success",
            //         resData?.response?.message,
            //         [
            //             {
            //                 text: "OK",
            //                 onPress: () => {
            //                     navigation.replace("Weft Issue Return", {
            //                         token,
            //                         refresh: true,
            //                         selectedProperty,
            //                         selectedYear,
            //                         fromDate,
            //                         toDate,
            //                     });
            //                 },
            //             },
            //         ],
            //         { cancelable: false }
            //     );
            // }
            // else {
            //     showError(resData?.message);
            // }
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

    const printSticker = () => {
        if (typeof printer == 'undefined' || printer == null || printer == '') {
            Alert.alert('Please select printer first.');
            return false;
        }
        else {
            setIsLoading(true);
            console.log('printsticker function :', getSavedData);
            let temppayloadObj = new Object();

            if (Object.keys(getSavedData).length > 0) {
                temppayloadObj = {
                    uid: getSavedData.IssUId ?? "0",
                    inwno: "",
                    inwdate: "",
                    srno: getSavedData.IssSrNo ?? "0",
                    itmcode: getSavedData.ItmCode ?? "0",
                    itmname: getSavedData.ItmName ?? "",
                    dsncode: "0",
                    dsnname: "",
                    rcno: "",
                    amount: "",
                    subsr: getSavedData.IssSubSr ?? "0",
                    takano: getSavedData.CartNo ?? "",
                    qty: getSavedData.TotQty ?? "0",
                    trantype: getSavedData.trantype ?? "",
                    ttype: "",
                    dptname: "",
                    shdcode: getSavedData.ShdCode ?? "0",
                    shdname: getSavedData.ShdName ?? "",
                    whr: "",
                    yarncostr: "",
                    yard: "",
                    sexecname: "",
                    strcode: "",
                    unqsrno: "",
                    grdcode: getSavedData.GrdCode ?? "0",
                    grdname: getSavedData.GrdName ?? "",
                    mercode: getSavedData.MerCode ?? "0",
                    mername: getSavedData.MerName ?? "",
                    denier: getSavedData.Denier ?? "0",
                    prpcode: getSavedData.PrpCode ?? ""
                }
                console.log("getSavedData", getSavedData, temppayloadObj);
                const params = {
                    data: [getSavedData],
                    IskgQty: 0,
                    printype: "Print",
                    PrintFormat: 3,
                    printerName: printer ? printer : '',
                    txntype: "beam_weft_issue_return"
                };

                // return;
                // axios.post(`${PRINTSTICKER}`, params)
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
                                text: '✅ ${res.printed} label(s) sent to printer.',
                                duration: Snackbar.LENGTH_INDEFINITE,
                                backgroundColor: 'green',
                                action: { text: 'OK', textColor: 'white' },
                            });
                        } else {
                            Snackbar.show({
                                text: res.message || 'Operation failed',
                                duration: Snackbar.LENGTH_INDEFINITE,
                                backgroundColor: 'red',
                                action: { text: 'OK', textColor: 'white' },
                            });
                        }
                    }).catch(error => {
                        setIsLoading(false);
                        Snackbar.show({
                            text: error?.response?.data?.error || error.message || 'Print failed',
                            duration: Snackbar.LENGTH_LONG,
                            backgroundColor: 'red',
                            action: { text: 'OK', textColor: 'white' },
                        });
                    });
            } else {
                setIsLoading(false);
                Snackbar.show({
                    text: 'printing sticker data is empty',
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: 'red',
                    textColor: '#fff',
                    action: { text: 'OK', textColor: '#fff' },
                });
            }
        }
    }

    // const getAllPrinters = async () => {
    //     try {
    //         const res = await axios.get(PRINTERSLISTAPI);
    //         const printerList = res.data?.printers || res.data || [];
    //         setPrinters(printerList);
    //     } catch (err) {
    //         console.log("Printer API error:", err);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // }

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
                <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
                    <View style={styles.header}>
                         <TouchableOpacity onPress={() => router.back()}>
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
                                    <Text style={styles.sectionTitle}>Selected Beam</Text>
                                    <Text style={styles.creelText}>
                                        {selectedBatchNo || "No Beam Selected"}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.linkBtnSmall}
                                    onPress={() => {
                                        fetchCreelData();
                                        setLinkModal(true);
                                        setPrinter('');
                                        setPrinters([]);
                                    }}
                                >
                                    <Icon name="link" size={16} color="#0F6C7B" />
                                    <Text style={styles.linkBtnText}>Link Beam</Text>
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
                            disabled={loading || getDataSaved}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: "#fff", fontWeight: "600" }}>
                                    Save Entry
                                </Text>
                            )}
                        </TouchableOpacity>
                        {getDataSaved && status === "Close" && (
                            <View
                                style={{
                                    backgroundColor: "#fff",
                                    borderRadius: 18,
                                    padding: 18,
                                    marginTop: 14,
                                    marginBottom: 12,
                                    elevation: 3,
                                    shadowColor: "#000",
                                    shadowOpacity: 0.08,
                                    shadowRadius: 8,
                                }}
                            >

                                <View style={{ flexDirection: "row" }}>

                                    <View
                                        style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 14,
                                            backgroundColor: "#EAF7FF",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            marginRight: 14
                                        }}>

                                        <Icon
                                            name="print"
                                            size={30}
                                            color="#0E83C8"
                                        />

                                    </View>

                                    <View style={{ flex: 1 }}>

                                        <Text
                                            style={{
                                                fontSize: 18,
                                                fontWeight: "700",
                                                color: "#111827"
                                            }}>
                                            Sticker Printing
                                        </Text>

                                        <Text
                                            style={{
                                                color: "#6B7280",
                                                marginTop: 2,
                                                fontSize: 12
                                            }}>
                                            Select printer and print saved sticker
                                        </Text>

                                    </View>

                                </View>

                                <TouchableOpacity
                                    onPress={() => {
                                        if (getPrinters.length === 0) {
                                            getAllPrinters();
                                        }
                                        setPrinterModalVisible(true);
                                    }}
                                    style={{
                                        marginTop: 18,
                                        borderWidth: 1.5,
                                        borderColor: "#8CCBFF",
                                        borderRadius: 16,
                                        padding: 15,
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}>

                                    <View>

                                        <Text
                                            style={{
                                                fontSize: 14,
                                                fontWeight: "700",
                                                color: "#111827"
                                            }}>
                                            {printer || "Select Printer"}
                                        </Text>

                                        <Text
                                            style={{
                                                color: "#0F6C7B",
                                                marginTop: 2,
                                                fontWeight: "700"
                                            }}>
                                            {selectedPrinterStatus || "Idle"}
                                        </Text>

                                    </View>

                                    <Icon
                                        name="keyboard-arrow-down"
                                        size={28}
                                        color="#374151"
                                    />

                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={printSticker}
                                    style={{
                                        backgroundColor: "#0F6C7B",
                                        borderRadius: 14,
                                        height: 56,
                                        marginTop: 16,
                                        justifyContent: "center",
                                        alignItems: "center",
                                        flexDirection: "row"
                                    }}>

                                    <Icon
                                        name="print"
                                        size={22}
                                        color="#fff"
                                    />

                                    <Text
                                        style={{
                                            color: "#fff",
                                            fontSize: 18,
                                            fontWeight: "700",
                                            marginLeft: 10
                                        }}>
                                        Print Sticker
                                    </Text>

                                </TouchableOpacity>

                            </View>
                        )}
                        {/* {getDataSaved && status === "Close" && (
                    <View style={{ flexDirection: 'row', marginTop: 10 }}>
                        <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.7 }]} onPress={printSticker}>
                            <Text style={{ color: "#fff", fontWeight: "600" }}>Print</Text>
                        </TouchableOpacity>
                    </View>
                )} */}
                    </ScrollView>

                    <Modal transparent visible={linkModal} animationType="slide">
                        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
                            <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "70%" }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                    <Text style={{ fontSize: 16, fontWeight: "600", color: '#000' }}>
                                        Select Beam
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

                                {
                                    beamLoading ? (
                                        <FlatList
                                            data={[1, 2, 3, 4, 5]}
                                            keyExtractor={(i) => i.toString()}
                                            renderItem={() => <SkeletonCard />}
                                        />
                                    ) : (
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

                                                        setSelectedBatchNo(item.BeamNo);

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
                                                            StkType: item.StkType,
                                                            BeamNo: item.BeamNo,
                                                            BeamUId: item.BeamUId
                                                        }));
                                                        setLinkModal(false);
                                                    }}
                                                >
                                                    <View style={styles.rowBetween}>
                                                        <Text style={styles.itemTitlePro} numberOfLines={1}>
                                                            {item.ItmName}
                                                        </Text>
                                                        <View style={styles.batchBadgePro}>
                                                            <Text style={styles.batchTextPro}>
                                                                Beam No : {item.BeamNo}
                                                            </Text>
                                                        </View>
                                                    </View>
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
                                                    <View style={styles.footerRow}>
                                                        <Text style={styles.qtyLabel}>Bal Qty</Text>
                                                        <Text style={styles.qtyValue}>{item.BalQty}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            )}
                                        />
                                    )}
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


                    <Modal
                        visible={printerModalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => {
                            setPrinterModalVisible(false);
                            // setPendingPrintItem(null);
                            setPrinterSearch("");
                        }}>

                        <View
                            style={{
                                flex: 1,
                                backgroundColor: "rgba(0,0,0,.45)",
                                justifyContent: "flex-end"
                            }}>

                            <View
                                style={{
                                    backgroundColor: "#fff",
                                    borderTopLeftRadius: 25,
                                    borderTopRightRadius: 25,
                                    padding: 20,
                                    maxHeight: "80%"
                                }}>

                                <View
                                    style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 15,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 20,
                                            fontWeight: "700",
                                            color: "#000",
                                        }}
                                    >
                                        Select Printer
                                    </Text>

                                    <TouchableOpacity
                                        onPress={() => {
                                            setPrinterModalVisible(false);
                                            // setPendingPrintItem(null);
                                            setPrinterSearch("");
                                        }}
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 22,
                                            backgroundColor: "#F1F5F9",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Icon name="close" size={20} color="#111827" />
                                    </TouchableOpacity>
                                </View>


                                <TextInput
                                    placeholder="Search printer..."
                                    value={printerSearch}
                                    onChangeText={setPrinterSearch}
                                    style={{
                                        height: 50,
                                        borderWidth: 1,
                                        borderColor: "#ddd",
                                        borderRadius: 12,
                                        paddingHorizontal: 15,
                                        marginBottom: 15
                                    }}
                                />

                                <FlatList
                                    data={getPrinters.filter(p =>
                                        p.Name.toLowerCase().includes(
                                            printerSearch.toLowerCase()
                                        )
                                    )}
                                    keyExtractor={(i) => i.Name}
                                    renderItem={({ item }) => (

                                        <TouchableOpacity

                                            onPress={() => selectPrinter(item)}

                                            style={{
                                                padding: 15,
                                                borderBottomWidth: 1,
                                                borderColor: "#eee",
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center"
                                            }}>

                                            <View>

                                                <Text
                                                    style={{
                                                        fontWeight: "700",
                                                        fontSize: 15,
                                                        color: "#000"
                                                    }}>
                                                    {item.Name}
                                                </Text>

                                                <Text
                                                    style={{
                                                        color: getPrinterStatusColor(
                                                            item.StatusText
                                                        )
                                                    }}>
                                                    {item.StatusText}
                                                </Text>

                                            </View>

                                            {printer === item.Name &&
                                                <Icon
                                                    name="check-circle"
                                                    size={24}
                                                    color="#16A34A"
                                                />
                                            }

                                        </TouchableOpacity>

                                    )}
                                />

                            </View>

                        </View>

                    </Modal>
                </View>
            </SafeAreaView>
        </>
    );
};

export default WeftIssueReturnEntry;

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