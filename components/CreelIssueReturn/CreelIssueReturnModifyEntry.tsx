import Icon from '@expo/vector-icons/MaterialIcons';
import axios from "axios";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { API, PRINTSTICKER } from "../../common/API/dynamicAPI";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Snackbar } from 'react-native-snackbar';
// import CustomSearchableDropdown from "../Shared/CustomSearchableDropdown";

const CreelIssueReturnModifyEntry = ({ navigation, route }) => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const creelData = params?.creelData ? JSON.parse(params.creelData) : null;
    const selectedProperty = params?.selectedProperty ? JSON.parse(params.selectedProperty) : null;
    const selectedYear = params?.selectedYear;
    const token = params?.token;

    const prpcode = typeof selectedProperty === "object" ? selectedProperty?.PrpCode : selectedProperty;
    const yearno = selectedYear?.slice(-2);

    const [cartonType, setCartonType] = useState("Single");
    const [status, setStatus] = useState("Open");
    const [selectedCreel, setSelectedCreel] = useState({
        UId: null,
        SrNo: null,
        SubSr: null,
    });
    const [PrpCode, setPrpCode] = useState("");
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
    });

    const [linkModal, setLinkModal] = useState(false);
    const [linkData, setLinkData] = useState([]);
    const [filteredCreelData, setFilteredCreelData] = useState([]);

    const [loading, setLoading] = useState(false);
    const [getItemData, setItemData] = useState([]);
    const [getMergeData, setMergeData] = useState([]);
    const [getGradeData, setGradeData] = useState([]);
    const [getShadeData, setShadeData] = useState([]);

    const [selectedBatchNo, setSelectedBatchNo] = useState("");
    const [searchText, setSearchText] = useState("");
    const [denier, setDenier] = useState("");

    const [savedResponse, setSavedResponse] = useState(null);
    const [d3Rows, setD3Rows] = useState([]);
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteIndex, setDeleteIndex] = useState(null);

    const [alertData, setAlertData] = useState({
        visible: false,
        message: "",
        type: "warning",
    });

    const [d1Data, setD1Data] = useState([]);
    const [d2Data, setD2Data] = useState([]);

    const showWarning = msg => setAlertData({ visible: true, message: msg, type: "warning" });
    const showSuccess = msg => setAlertData({ visible: true, message: msg, type: "success" });
    const showError = msg => setAlertData({ visible: true, message: msg, type: "error" });

    const [getPrinters, setPrinters] = useState([]);
    const [printer, setPrinter] = useState("");
    const [printerLoading, setPrinterLoading] = useState(false);
    const [printerError, setPrinterError] = useState("");
    const [printerModalVisible, setPrinterModalVisible] = useState(false);
    const [selectedPrinterStatus, setSelectedPrinterStatus] = useState("");
    const [printerSearch, setPrinterSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const isDisabled = cartonType === "Single";

    useEffect(() => {
        setForm(prev => ({
            ...prev,
            IsCartonType: cartonType === "Single" ? 0 : 1,
        }));
    }, [cartonType]);

    useEffect(() => {
        setForm(prev => ({
            ...prev,
            IsCartonStatus: status === "Open" ? 0 : 1,
        }));
    }, [status]);

    let cancelToken;

    const getRequestConfig = props => ({
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    useEffect(() => {
        const loadAllFunctions = async () => {
            if (prpcode && yearno) {
                await getAllItems(token);
                await getAllMerges(token);
                await getAllGrades(token);
                await getAllShades(token);
            }
        };

        loadAllFunctions();
    }, []);

    const getAllItems = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const response = await axios.get(
                `${API}/api/itemdrop`,
                getRequestConfig({
                    params: {
                        prpcode,
                        yearno,
                        strcode: "002",
                        itemcode: "",
                        itemname: "",
                        isall: "1",
                        txntype: "creel_issue_return",
                        billdate: "",
                        ttype: ["8", "3", "30", "2", "34", "83", "42"],
                        fetch: "",
                    },
                })
            );

            const data = response?.data?.response?.data || [];
            setItemData(data);
            return data;
        } catch (error) {
            console.log("item API error:", error);
            return [];
        }
    };

    const getAllMerges = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const response = await axios.get(
                `${API}/api/mergedrop`,
                getRequestConfig({
                    params: {
                        prpcode,
                        yearno,
                        strcode: "002",
                        itemcode: "",
                        itemname: "",
                        isall: 1,
                        txntype: "creel_issue_return",
                        billdate: "",
                    },
                })
            );

            const data = response?.data?.response?.data || [];
            setMergeData(data);
            return data;
        } catch (error) {
            console.log("merge API error:", error);
            return [];
        }
    };

    const getAllGrades = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const response = await axios.get(
                `${API}/api/gradedrop`,
                getRequestConfig({
                    params: {
                        prpcode,
                        yearno,
                        strcode: "002",
                        itemcode: "",
                        itemname: "",
                        isall: 1,
                        txntype: "creel_issue_return",
                        billdate: "",
                        ttype: ["8", "3", "30", "2", "34", "83", "42"],
                        fetch: "grade",
                    },
                })
            );

            const data = response?.data?.response?.data || [];
            setGradeData(data);
            return data;
        } catch (error) {
            console.log("grade API error:", error);
            return [];
        }
    };

    const getAllShades = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            const response = await axios.get(
                `${API}/api/shadedrop`,
                getRequestConfig({
                    params: {
                        prpcode,
                        yearno,
                        strcode: "002",
                        itemcode: "",
                        itemname: "",
                        isall: 1,
                        txntype: "creel_issue_return",
                        billdate: "",
                    },
                })
            );

            const data = response?.data?.response?.data || [];
            setShadeData(data);
            return data;
        } catch (error) {
            console.log("shade API error:", error);
            return [];
        }
    };

    const fetchCreelData = async () => {
        if (!selectedProperty) return;

        setLoading(true);

        try {
            const prptype = typeof selectedProperty === "object" ? selectedProperty?.PrpOf : selectedProperty;

            const payload = {
                prpcode,
                prptype,
                yearno,
                strcode: "002",
                txntype: "creel_issue_return",
            };

            const res = await axios.post(`${API}/api/get_creel_issue_detail`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "X-Requested-with": "XMLHttpRequest",
                },
            });

            const rawData = res?.data?.response?.data || res?.data?.data || res?.data?.result || [];
            console.log("rawData ::", rawData)
            setLinkData(Array.isArray(rawData) ? rawData : []);
            setFilteredCreelData(Array.isArray(rawData) ? rawData : []);
        } catch (error) {
            console.log("API ERROR:", error?.response?.data || error.message);
            setLinkData([]);
            setFilteredCreelData([]);
        } finally {
            setLoading(false);
        }
    };

    const updateD3Value = (index, field, value) => {
        setD3Rows(prev =>
            prev.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
            )
        );
    };

    const getName = (list, codeKey, nameKey, code) => {
        const found = list.find(x => String(x[codeKey]) === String(code));
        return found?.[nameKey] || code || "-";
    };

    useEffect(() => {
        console.log("TESTING")
        handleShowData();
    }, []);

    const handleShowData = async () => {
        setLoading(true);

        try {

            const payload = {
                prpcode,
                yearno,
                strcode: "002",
                txntype: "creel_issue_return",
                uid: creelData?.UId ? creelData.UId : 0
            };

            console.log("responseData ::", payload)

            const res = await axios.post(`${API}/api/get_creel_issue_return_show`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "X-Requested-with": "XMLHttpRequest",
                },
            });

            const responseData = res?.data?.response || {};
            const mainData = responseData?.main?.[0]?.[0];

            if (mainData) {
                // Carton Type

                // setBeamNo(mainData.beamno || "");
                setCartonType(
                    String(mainData.IsCartonType) === "0" ? "Single" : "Mix"
                );

                // Status
                setStatus(
                    String(mainData.IsCartonStatus) === "0" ? "Open" : "Close"
                );

                setPrpCode(mainData.PrpCode);
            }


            console.log("responseData ::", responseData)

            setSavedResponse(responseData);
            setD1Data(Array.isArray(responseData?.d1) ? responseData.d1 : []);
            setD2Data(Array.isArray(responseData?.d2) ? responseData.d2 : []);
            setD3Rows(Array.isArray(responseData?.d3) ? responseData.d3 : []);

            const cartonTypeFromAPI = responseData?.main?.[0]?.IsCartonType;

            if (cartonTypeFromAPI === 0) {
                setCartonType("Single");
            } else if (cartonTypeFromAPI === 1) {
                setCartonType("Mix");
            }

            getAllPrinters();

            // const resData = res?.data;
            // if (resData?.message === false) {
            //     showWarning(resData?.response?.message);
            // } else if (resData?.response?.error === true && resData?.response?.message) {
            //     showWarning(resData?.response?.message);
            // } else if (resData?.success === true) {
            //     showSuccess(resData?.response?.message || "Data saved successfully.");
            // } else {
            //     showError(resData?.message || "Something went wrong.");
            // }
        } catch (error) {
            console.log("SAVE ERROR:", error?.response?.data || error.message);
            showError(error?.response?.data?.message || error?.message || "An unexpected error occurred while saving.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = text => {
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

    const ToggleSwitch = ({ options, value, onChange }) => (
        <View style={styles.switchContainer}>
            {options.map(opt => {
                const isActive = value === opt;

                return (
                    <TouchableOpacity
                        key={opt}
                        style={[styles.switchOption, isActive && styles.switchActive]}
                        onPress={() => onChange(opt)}
                    >
                        <Text style={[styles.switchText, isActive && styles.switchTextActive]}>
                            {opt}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
    const handleAddD3Row = () => {
        if (!form.IssUId || !form.IssSrNo) {
            showWarning("Please select Creel first.");
            return;
        }

        const duplicate = d3Rows.some(row =>
            String(row.IssUId) === String(form.IssUId) &&
            String(row.IssSrNo) === String(form.IssSrNo) &&
            String(row.IssSubSr || 1) === String(form.IssSubSr || 1)
        );

        if (duplicate) {
            showWarning("This creel is already added.");
            return;
        }

        const newRow = {
            UId: creelData?.UId || savedResponse?.d1?.[0]?.UId || "",
            SrNo: savedResponse?.d1?.[0]?.SrNo || "1",

            IssUId: form.IssUId,
            IssSrNo: form.IssSrNo,
            IssSubSr: form.IssSubSr || 1,

            IssQty: form.IssQty || 0,
            IssChees: form.IssChees || 0,

            IssRQty: form.TotQty || "",
            IssRChees: form.TotPcs || "",

            IsCartonStatus: status === "Open" ? 0 : 1,

            BatchNo: selectedBatchNo,
        };

        console.log("newRow ::", newRow)
        console.log("d3Rows ::", d3Rows)

        setD3Rows(prev => [...prev, newRow]);

        setSelectedCreel({
            UId: null,
            SrNo: null,
            SubSr: null,
        });
        setSelectedBatchNo("");

        setForm(prev => ({
            ...prev,
            TotQty: "",
            TotPcs: "",
            IssUId: null,
            IssSrNo: null,
            IssSubSr: null,
            IssQty: 0,
            IssChees: 0,
        }));
    };

    const confirmDeleteD3Row = index => {
        setDeleteIndex(index);
        setDeleteModal(true);
    };

    const deleteD3Row = () => {
        if (deleteIndex === null) return;

        setD3Rows(prev => prev.filter((_, index) => index !== deleteIndex));
        setDeleteIndex(null);
        setDeleteModal(false);
    };

    const handleSaveModifyData = async () => {
        // if (!selectedCreel?.UId || !selectedBatchNo) {
        //     showWarning("Please select Creel first.");
        //     return;
        // }

        if (d3Rows.length === 0) {
            showWarning("Please add at least one creel return detail.");
            return;
        }

        // if (!form.TotPcs) {
        //     showWarning("Please enter Cheese.");
        //     return;
        // }

        // if (!form.TotQty) {
        //     showWarning("Please enter Weight.");
        //     return;
        // }

        setLoading(true);

        try {
            const payload = {
                prpcode,
                yearno,
                strcode: "002",
                // ...form,
                txntype: "creel_issue_return",
                uid: creelData?.UId,
                d1: d1Data,
                d2: d2Data,
                d3: d3Rows.map(row => ({
                    UId: row.UId,
                    SrNo: row.SrNo,
                    IssUId: row.IssUId,
                    IssSrNo: row.IssSrNo,
                    IssSubSr: row.IssSubSr || 1,
                    IssQty: row.IssQty,
                    IssChees: row.IssChees,
                    IssRQty: row.IssRQty,
                    IssRChees: row.IssRChees,
                    IsCartonStatus: row.IsCartonStatus,
                })),
            };

            console.log("FINAL MODIFY SAVE PAYLOAD:", payload);

            const res = await axios.post(`${API}/api/modify_creel_issue_return`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "X-Requested-with": "XMLHttpRequest",
                },
            });

            const resData = res?.data;

            console.log("resData ::", resData)

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
            console.log("MODIFY SAVE ERROR:", error?.response?.data || error.message);
            showError(error?.response?.data?.message || error?.message || "Update failed.");
        } finally {
            setLoading(false);
        }
    };

    // const printSticker = () => {
    //     if (typeof printer == 'undefined' || printer == null || printer == '') {
    //         Alert.alert('Please select printer first.');
    //         return false;
    //     }
    //     else {
    //         setIsLoading(true);
    //         console.log('printsticker function :', getSavedData);
    //         let temppayloadObj = new Object();

    //         if (Object.keys(getSavedData).length > 0) {
    //             temppayloadObj = {
    //                 uid: d1.IssUId ?? "0",
    //                 inwno: "",
    //                 inwdate: "",
    //                 srno: d1.IssSrNo ?? "0",
    //                 itmcode: getSavedData.ItmCode ?? "0",
    //                 itmname: getSavedData.ItmName ?? "",
    //                 dsncode: "0",
    //                 dsnname: "",
    //                 rcno: "",
    //                 amount: "",
    //                 subsr: getSavedData.IssSubSr ?? "0",
    //                 takano: getSavedData.CartNo ?? "",
    //                 qty: getSavedData.TotQty ?? "0",
    //                 trantype: getSavedData.trantype ?? "",
    //                 ttype: "",
    //                 dptname: "",
    //                 shdcode: getSavedData.ShdCode ?? "0",
    //                 shdname: getSavedData.ShdName ?? "",
    //                 whr: "",
    //                 yarncostr: "",
    //                 yard: "",
    //                 sexecname: "",
    //                 strcode: "",
    //                 unqsrno: "",
    //                 grdcode: getSavedData.GrdCode ?? "0",
    //                 grdname: getSavedData.GrdName ?? "",
    //                 mercode: getSavedData.MerCode ?? "0",
    //                 mername: getSavedData.MerName ?? "",
    //                 denier: getSavedData.Denier ?? "0",
    //                 prpcode: getSavedData.PrpCode ?? ""
    //             }
    //             console.log("getSavedData", getSavedData, temppayloadObj);
    //             const params = {
    //                 data: [getSavedData],
    //                 IskgQty: 0,
    //                 printype: "Print",
    //                 PrintFormat: 5,
    //                 printerName: printer ? printer : '',
    //                 txntype: "beam_weft_issue_return"
    //             };

    //             // return;
    //             // axios.post(`${PRINTSTICKER}`, params)
    //             axios.post(
    //                 PRINTSTICKER,
    //                 params,
    //                 {
    //                     headers: getPrinterHeaders()
    //                 }
    //             )
    //                 .then(response => {
    //                     setIsLoading(false);
    //                     const res = response.data;

    //                     if (res.success) {
    //                         Snackbar.show({
    //                             text: '✅ ${res.printed} label(s) sent to printer.',
    //                             duration: Snackbar.LENGTH_INDEFINITE,
    //                             backgroundColor: 'green',
    //                             action: { text: 'OK', textColor: 'white' },
    //                         });
    //                     } else {
    //                         Snackbar.show({
    //                             text: res.message || 'Operation failed',
    //                             duration: Snackbar.LENGTH_INDEFINITE,
    //                             backgroundColor: 'red',
    //                             action: { text: 'OK', textColor: 'white' },
    //                         });
    //                     }
    //                 }).catch(error => {
    //                     setIsLoading(false);
    //                     Snackbar.show({
    //                         text: error?.response?.data?.error || error.message || 'Print failed',
    //                         duration: Snackbar.LENGTH_LONG,
    //                         backgroundColor: 'red',
    //                         action: { text: 'OK', textColor: 'white' },
    //                     });
    //                 });
    //         } 
    //         else {
    //             setIsLoading(false);
    //             Snackbar.show({
    //                 text: 'printing sticker data is empty',
    //                 duration: Snackbar.LENGTH_LONG,
    //                 backgroundColor: 'red',
    //                 textColor: '#fff',
    //                 action: { text: 'OK', textColor: '#fff' },
    //             });
    //         }
    //     }
    // }

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

    const printSticker = () => {
        if (typeof printer == 'undefined' || printer == null || printer == '') {
            Alert.alert('Please select printer first.');
            return false;
        }
        else {
            setIsLoading(true);

            const d1 = d1Data?.[0] || {};
            const d2 = d2Data?.[0] || {};
            const d3 = d3Rows?.[0] || {};
            // const main = savedResponse?.main?.[0]?.[0] || {};

            console.log('printsticker function :', { d1, d2, d3 });

            let temppayloadObj = new Object();

            if (Object.keys(d1).length > 0) {

                temppayloadObj = {
                    uid: d1.IssUId ?? "0",
                    inwno: "",
                    inwdate: "",
                    srno: d1.IssSrNo ?? "0",
                    itmcode: d1.ItmCode ?? "0",
                    itmname: d1.ItmName ?? "",
                    dsncode: "0",
                    dsnname: "",
                    rcno: "",
                    amount: "",
                    subsr: d3.IssSubSr ?? "0",
                    takano: d2.CartNo ?? "",
                    qty: d2.Qty ?? "0",
                    trantype: d1.trantype ?? "",
                    ttype: "",
                    dptname: "",
                    shdcode: d1.ShdCode ?? "0",
                    shdname: d1.ShdName ?? "",
                    whr: "",
                    yarncostr: "",
                    yard: "",
                    sexecname: "",
                    strcode: "",
                    unqsrno: "",
                    grdcode: d1.GrdCode ?? "0",
                    grdname: d1.GrdName ?? "",
                    mercode: d1.MerCode ?? "0",
                    mername: d1.MerName ?? "",
                    denier: d1.Denier ?? "0",
                    prpcode: PrpCode ?? "",
                    chees: d2.Chees?? "0"
                };

                console.log("Print Payload Object :", temppayloadObj);

                const params = {
                    data: [temppayloadObj],
                    IskgQty: 0,
                    printype: "Print",
                    PrintFormat: 5,
                    printerName: printer ? printer : '',
                    txntype: "creel_issue_return"
                };

                console.log("Print Params :", params);
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
                                text: `✅ ${res.printed} label(s) sent to printer.`,
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

            }
            else {
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

                        <Text style={styles.headerTitle}>Modify Entry..</Text>
                        <View style={{ width: 22 }} />
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        <View style={styles.card}>
                            <View style={styles.rowBetween}>
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

                        <View style={[styles.card, { opacity: 0.6 }]}>
                            <Text style={styles.sectionTitle}>Carton Type</Text>

                            <ToggleSwitch
                                options={["Single", "Mix"]}
                                value={cartonType}
                                onChange={() => { }} // disabled
                            />
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.label}>Carton No</Text>

                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: "#E5E7EB",
                                        color: "#000",
                                    }
                                ]}
                                value={d2Data?.[0]?.CartNo ? String(d2Data?.[0]?.CartNo) : ""}
                                editable={false}
                                placeholder="Carton No"
                                placeholderTextColor="#000"
                            />
                        </View>

                        {/* <View style={{ marginBottom: 10, opacity: isDisabled ? 0.5 : 1 }}>
                    <Text style={styles.label}>Select Item <Text style={{ color: "red" }}>*</Text></Text>
                    <CustomSearchableDropdown
                        data={getItemData}
                        labelKey="ItmName"
                        valueKey="ItmCode"
                        value={form.ItmCode}
                        disabled={isDisabled}
                        placeholder="Choose item..."
                        placeholderTextColor="#000"
                        onSelect={itm => {
                            if (isDisabled) return;

                            setForm(prev => ({
                                ...prev,
                                ItmCode: itm?.ItmCode || "",
                                Denier: itm?.Denier || "",
                            }));

                            setDenier(itm?.Denier || "");
                        }}
                    />

                    <View style={{ height: 20, justifyContent: "center" }}>
                        <Text style={{ color: "#000", fontSize: 15 }}>
                            {denier ? `Denier: ${denier}` : ""}
                        </Text>
                    </View>
                </View>

                <View style={{ marginBottom: 10, opacity: isDisabled ? 0.5 : 1 }}>
                    <Text style={styles.label}>Select Merge <Text style={{ color: "red" }}>*</Text></Text>
                    <CustomSearchableDropdown
                        data={getMergeData}
                        labelKey="MerName"
                        valueKey="MerCode"
                        value={form.MerCode}
                        disabled={isDisabled}
                        placeholder="Choose merge..."
                        onSelect={mrg => {
                            if (isDisabled) return;
                            setForm(prev => ({ ...prev, MerCode: mrg?.MerCode || "" }));
                        }}
                    />
                </View>

                <View style={{ marginBottom: 10, opacity: isDisabled ? 0.5 : 1 }}>
                    <Text style={styles.label}>Select Grade <Text style={{ color: "red" }}>*</Text></Text>
                    <CustomSearchableDropdown
                        data={getGradeData}
                        labelKey="GrdName"
                        valueKey="GrdCode"
                        value={form.GrdCode}
                        disabled={isDisabled}
                        placeholder="Choose grade..."
                        onSelect={grd => {
                            if (isDisabled) return;
                            setForm(prev => ({ ...prev, GrdCode: grd?.GrdCode || "" }));
                        }}
                    />
                </View>

                <View style={{ marginBottom: 10, opacity: isDisabled ? 0.5 : 1 }}>
                    <Text style={styles.label}>Select Shade <Text style={{ color: "red" }}>*</Text></Text>
                    <CustomSearchableDropdown
                        data={getShadeData}
                        labelKey="ShdName"
                        valueKey="ShdCode"
                        value={form.ShdCode}
                        disabled={isDisabled}
                        placeholder="Choose shade..."
                        onSelect={shd => {
                            if (isDisabled) return;
                            setForm(prev => ({ ...prev, ShdCode: shd?.ShdCode || "" }));
                        }}
                    />
                </View> */}

                        {savedResponse?.d1?.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.sectionTitle}>Saved Item Detail</Text>

                                {savedResponse.d1.map((item, index) => (
                                    <View key={index} style={styles.savedCardNew}>

                                        {/* ROW 1 */}
                                        <View style={styles.row}>
                                            <View style={styles.col}>
                                                <Text style={styles.labelNew}>Item</Text>
                                                <Text style={styles.valueNew}>
                                                    {getName(getItemData, "ItmCode", "ItmName", item.ItmCode)}
                                                </Text>
                                            </View>

                                            <View style={styles.col}>
                                                <Text style={styles.labelNew}>Merge</Text>
                                                <Text style={styles.valueNew}>
                                                    {getName(getMergeData, "MerCode", "MerName", item.MerCode)}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* ROW 2 */}
                                        <View style={styles.row}>
                                            <View style={styles.col}>
                                                <Text style={styles.labelNew}>Grade</Text>
                                                <Text style={styles.valueNew}>
                                                    {getName(getGradeData, "GrdCode", "GrdName", item.GrdCode)}
                                                </Text>
                                            </View>

                                            <View style={styles.col}>
                                                <Text style={styles.labelNew}>Shade</Text>
                                                <Text style={styles.valueNew}>
                                                    {getName(getShadeData, "ShdCode", "ShdName", item.ShdCode)}
                                                </Text>
                                            </View>
                                        </View>

                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                            <View style={[styles.card, { flex: 1 }]}>
                                <Text style={styles.label}>Cheese</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={form.TotPcs}
                                    onChangeText={v => setForm(prev => ({ ...prev, TotPcs: v || "" }))}
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
                                    onChangeText={v => setForm(prev => ({ ...prev, TotQty: v || "" }))}
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
                            style={styles.addD3Btn}
                            onPress={handleAddD3Row}
                        >
                            <Icon name="add-circle" size={20} color="#fff" />
                            <Text style={styles.addD3BtnText}>Add Creel Return Detail</Text>
                        </TouchableOpacity>
                        {/* {savedResponse?.d1?.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Saved Item Detail</Text>

                        {savedResponse.d1.map((item, index) => (
                            <View key={index}>
                                <Text style={styles.infoValue}>
                                    Item: {getName(getItemData, "ItmCode", "ItmName", item.ItmCode)}
                                </Text>
                                <Text style={styles.infoValue}>
                                    Merge: {getName(getMergeData, "MerCode", "MerName", item.MerCode)}
                                </Text>
                                <Text style={styles.infoValue}>
                                    Grade: {getName(getGradeData, "GrdCode", "GrdName", item.GrdCode)}
                                </Text>
                                <Text style={styles.infoValue}>
                                    Shade: {getName(getShadeData, "ShdCode", "ShdName", item.ShdCode)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )} */}

                        {/* {d3Rows.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Creel Return Detail</Text>

                        {d3Rows.map((row, index) => (
                            <View
                                key={`${row.UId}-${row.SrNo}-${row.IssUId}-${row.IssSrNo}-${row.IssSubSr || 1}-${index}`}
                                style={styles.d3Card}
                            >
                                <View style={styles.rowBetween}>
                                    <Text style={styles.d3Title}>
                                        Creel UId: {row.IssUId} | SrNo: {row.IssSrNo}
                                    </Text>

                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => confirmDeleteD3Row(index)}
                                    >
                                        <Icon name="delete" size={18} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.d3InfoRow}>
                                    <Text style={styles.d3Label}>Issue Qty</Text>
                                    <Text style={styles.d3Value}>{row.IssQty}</Text>
                                </View>

                                <View style={styles.d3InfoRow}>
                                    <Text style={styles.d3Label}>Issue Cheese</Text>
                                    <Text style={styles.d3Value}>{row.IssChees}</Text>
                                </View>

                                <View style={styles.d3InputRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Return Qty</Text>
                                        <TextInput
                                            style={styles.input}
                                            keyboardType="numeric"
                                            value={String(row.IssRQty ?? "")}
                                            onChangeText={v => updateD3Value(index, "IssRQty", v)}
                                        />
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Return Cheese</Text>
                                        <TextInput
                                            style={styles.input}
                                            keyboardType="numeric"
                                            value={String(row.IssRChees ?? "")}
                                            onChangeText={v => updateD3Value(index, "IssRChees", v)}
                                        />
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )} */}

                        {d3Rows.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.sectionTitle}>Creel Return Detail</Text>

                                {d3Rows.map((row, index) => (
                                    <View key={index} style={styles.compactCard}>

                                        {/* TOP ROW */}
                                        <View style={styles.rowBetween}>
                                            <Text style={styles.compactTitle}>
                                                # {index + 1}
                                            </Text>

                                            <TouchableOpacity
                                                onPress={() => confirmDeleteD3Row(index)}
                                            >
                                                <Icon name="delete" size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>

                                        {/* SMALL INFO */}
                                        <View style={styles.compactInfoRow}>
                                            <Text style={styles.compactLabel}>SrNo: {row.IssSrNo}</Text>
                                            <Text style={styles.compactLabel}>Qty: {row.IssQty}</Text>
                                            <Text style={styles.compactLabel}>Cheese: {row.IssChees}</Text>
                                        </View>

                                        {/* INPUT ROW */}
                                        <View style={styles.compactInputRow}>
                                            <TextInput
                                                style={styles.compactInput}
                                                placeholder="Return Qty"
                                                keyboardType="numeric"
                                                value={String(row.IssRQty ?? "")}
                                                onChangeText={v => updateD3Value(index, "IssRQty", v)}
                                            />

                                            <TextInput
                                                style={styles.compactInput}
                                                placeholder="Return Cheese"
                                                keyboardType="numeric"
                                                value={String(row.IssRChees ?? "")}
                                                onChangeText={v => updateD3Value(index, "IssRChees", v)}
                                            />
                                        </View>

                                    </View>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                            onPress={handleSaveModifyData}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: "#fff", fontWeight: "600" }}>Save Entry</Text>
                            )}
                        </TouchableOpacity>

                        {status === "Close" && (
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
                    </ScrollView>

                    <Modal transparent visible={linkModal} animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalBox}>
                                <View style={styles.rowBetween}>
                                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>
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
                                    style={styles.searchInput}
                                />

                                <FlatList
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
                                                console.log("---- SELECTED CREEL:", item);
                                                const selectedItem = getItemData.find(
                                                    itm => String(itm.ItmCode) === String(item.ItmCode)
                                                );
                                                console.log("---- selectedItem", selectedItem)
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
                                                    StkType: item.StkType,
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

                                            {/* HIGHLIGHT ROW */}
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
                                    size={40}
                                    color={
                                        alertData.type === "success"
                                            ? "#4CAF50"
                                            : alertData.type === "error"
                                                ? "#F44336"
                                                : "#FFA000"
                                    }
                                />

                                <Text style={styles.alertTitle}>
                                    {alertData.type === "success"
                                        ? "Success"
                                        : alertData.type === "error"
                                            ? "Error"
                                            : "Warning"}
                                </Text>

                                <Text style={styles.alertMessage}>{alertData.message}</Text>

                                <TouchableOpacity
                                    onPress={() => setAlertData({ visible: false, message: "", type: "warning" })}
                                    style={styles.alertBtn}
                                >
                                    <Text style={{ color: "#fff", fontWeight: "600" }}>OK</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <Modal transparent visible={deleteModal} animationType="fade">
                        <View style={styles.alertOverlay}>
                            <View style={styles.alertBox}>
                                <Icon name="delete" size={42} color="#F44336" />

                                <Text style={styles.alertTitle}>Delete Row?</Text>

                                <Text style={styles.alertMessage}>
                                    Are you sure you want to remove this creel return detail?
                                </Text>

                                <View style={styles.confirmRow}>
                                    <TouchableOpacity
                                        style={[styles.confirmBtn, { backgroundColor: "#999" }]}
                                        onPress={() => {
                                            setDeleteModal(false);
                                            setDeleteIndex(null);
                                        }}
                                    >
                                        <Text style={styles.confirmBtnText}>No</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.confirmBtn, { backgroundColor: "#F44336" }]}
                                        onPress={deleteD3Row}
                                    >
                                        <Text style={styles.confirmBtnText}>Yes</Text>
                                    </TouchableOpacity>
                                </View>
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

export default CreelIssueReturnModifyEntry;

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#0F6C7B",
        padding: 15,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    card: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
    },
    sectionTitle: {
        fontWeight: "600",
        marginBottom: 10,
        color: "#000",
    },
    creelText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#0F2027",
    },
    label: {
        fontSize: 12,
        color: "#000",
        marginBottom: 6,
    },
    input: {
        backgroundColor: "#f3f3f3",
        borderRadius: 8,
        padding: 10,
        color: "#000",
    },
    saveBtn: {
        backgroundColor: "#0F6C7B",
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 10,
    },
    creelCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderLeftWidth: 5,
        borderLeftColor: "#0F6C7B",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    selectedCard: {
        borderColor: "#0F6C7B",
        borderWidth: 1,
    },
    creelTitle: {
        fontWeight: "600",
        color: "#000",
        fontSize: 15,
    },
    batchBadge: {
        flexDirection: "row",
        alignItems: "center",
    },
    batchLabel: {
        fontSize: 12,
        color: "#000",
        fontWeight: "600",
        marginRight: 6,
    },
    batchText: {
        fontSize: 13,
        color: "#000",
        fontWeight: "500",
    },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    infoGrid: {
        marginTop: 10,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    infoLabel: {
        fontSize: 12,
        color: "#000",
        fontWeight: "600",
        marginRight: 6,
    },
    infoValue: {
        fontSize: 13,
        color: "#000",
        fontWeight: "500",
        marginBottom: 4,
    },
    switchContainer: {
        flexDirection: "row",
        backgroundColor: "#E8F1F2",
        borderRadius: 12,
        padding: 4,
    },
    switchOption: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
    },
    switchActive: {
        backgroundColor: "#0F6C7B",
        elevation: 3,
    },
    switchText: {
        color: "#0F6C7B",
        fontWeight: "600",
    },
    switchTextActive: {
        color: "#fff",
    },
    linkBtnSmall: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F1F2",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    linkBtnText: {
        marginLeft: 4,
        color: "#0F6C7B",
        fontWeight: "600",
        fontSize: 14,
    },
    d3Card: {
        backgroundColor: "#F7FAFA",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#DDEBEC",
    },
    d3Title: {
        color: "#0F6C7B",
        fontWeight: "700",
        marginBottom: 8,
    },
    d3InfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    d3Label: {
        color: "#555",
        fontSize: 12,
        fontWeight: "600",
    },
    d3Value: {
        color: "#000",
        fontSize: 13,
        fontWeight: "600",
    },
    d3InputRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    modalBox: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        maxHeight: "70%",
    },
    searchInput: {
        backgroundColor: "#f3f3f3",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 12,
        marginBottom: 10,
        fontSize: 14,
        color: "#000",
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
        borderRadius: 15,
        padding: 20,
        alignItems: "center",
    },
    alertTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 10,
        color: "#000",
    },
    alertMessage: {
        textAlign: "center",
        marginTop: 8,
        color: "#444",
    },
    alertBtn: {
        marginTop: 15,
        backgroundColor: "#0F6C7B",
        paddingHorizontal: 25,
        paddingVertical: 10,
        borderRadius: 8,
    },
    addD3Btn: {
        backgroundColor: "#0F6C7B",
        padding: 13,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        marginBottom: 12,
    },
    addD3BtnText: {
        color: "#fff",
        fontWeight: "700",
        marginLeft: 8,
    },
    deleteBtn: {
        backgroundColor: "#F44336",
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    confirmRow: {
        flexDirection: "row",
        marginTop: 18,
        gap: 12,
    },
    confirmBtn: {
        paddingVertical: 10,
        paddingHorizontal: 28,
        borderRadius: 8,
    },
    confirmBtnText: {
        color: "#fff",
        fontWeight: "700",
    },
    savedCardNew: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E6F0F2",
        elevation: 2,
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },

    col: {
        flex: 1,
    },

    labelNew: {
        fontSize: 12,
        color: "#000",
        marginBottom: 4,
        fontWeight: "500",
    },

    valueNew: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111827",
    },
    compactCard: {
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },

    compactTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0F6C7B",
    },

    compactInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 4,
    },

    compactLabel: {
        fontSize: 13,
        color: "#000",
    },

    compactInputRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 6,
    },

    compactInput: {
        flex: 1,
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
        padding: 8,
        fontSize: 13,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
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
    }
});