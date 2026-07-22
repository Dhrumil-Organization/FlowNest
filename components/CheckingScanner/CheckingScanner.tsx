import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    TextInput as RNTextInput,
    Button,
    Modal,
    ActivityIndicator,
    FlatList,
    RefreshControl
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import FullScreenLoader from "../Loader/Loader";
import { checkingScannerStyles } from "../../common/Styles/Style";
import { API, PRINTSTICKER } from "../../common/API/dynamicAPI";
import {
    Camera,
    useCameraDevice,
    useCodeScanner,
    useCameraPermission,
} from "react-native-vision-camera";
import HeaderBarwithBack from "../HeaderBarwithBack/HeaderBarwithBack";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView } from "react-native";
import Snackbar from "react-native-snackbar";
import { Switch } from "react-native";
import PartyDropdown from "../Shared/PartyDropdown";
interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
}

const CheckingScanner: React.FC<Props> = ({
    token,
    navigation,
    isConnected,
    username,
}) => {
    const device = useCameraDevice("back");
    const scanLock = useRef(false);
    const [isScanning, setIsScanning] = useState(false);
    const { hasPermission, requestPermission } = useCameraPermission();
    const [scannedValue, setScannedValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [getData, setData] = useState([]);
    const [Designdata, setDesigndata] = useState([]);
    const [getdesigndata, setdesigndata] = useState([]);
    const [beamNo, setBeamNo] = useState("");
    const [takaNo, setTakaNo] = useState("");
    const [beamUid, setBeamUid] = useState("");
    const [prpCode, setPrpCode] = useState("");
    const [yearNo, setYearNo] = useState("");
    const [meter, setMeter] = useState("");
    const [kgs, setKgs] = useState("");
    const [validMeter, setValidMeter] = useState("");
    const [design, setDesign] = useState("");
    const [getWarpLen, setWarpLen] = useState("0");
    const [getavgWt, setavgWt] = useState("0");
    const [getGradeData, setGradeData] = useState([]);
    const [getCheckerData, setCheckerData] = useState([]);
    const [grade, setGrade] = useState("");
    const [checker, setChecker] = useState("");
    const [getScannedObj, setScannedObj] = useState({});
    const [shift, setShift] = useState("");
    const [getShiftData, setShiftData] = useState([]);
    const [getDataSaved, setDataSaved] = useState(false);
    const [getSavedData, setSavedData] = useState([]);
    const [isMending, setIsMending] = useState(false);
    const [getPrinters, setPrinters] = useState([]);
    const [printer, setPrinter] = useState("");
    const [printerLoading, setPrinterLoading] = useState(false);
    const [printerError, setPrinterError] = useState("");
    const [printerModalVisible, setPrinterModalVisible] = useState(false);
    const [selectedPrinterStatus, setSelectedPrinterStatus] = useState("");
    const [pendingPrintItem, setPendingPrintItem] = useState(null);
    const [printerSearch, setPrinterSearch] = useState("");
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [selecteddesign, setselecteddesign] = useState(null);
    //

    const [selectedGrade, setSelectedGrade] = useState(null);
    const [selectedChecker, setSelectedChecker] = useState(null);

    const [machinedata, setMachineData] = useState([]);
    const [FormState, setFormState] = useState({
        values: {},
    });

    const [manualGradeData, setManualGradeData] = useState([]);
    const [manualCheckerData, setManualCheckerData] = useState([]);

    const [manualGrade, setManualGrade] = useState("");
    const [manualChecker, setManualChecker] = useState("");

    const [selectedManualGrade, setSelectedManualGrade] = useState(null);
    const [selectedManualChecker, setSelectedManualChecker] = useState(null);

    const [manualShiftData, setManualShiftData] = useState([]);
    const [manualShift, setManualShift] = useState("");

    const [activeTab, setActiveTab] = useState("scanner");
    const [showManual, setShowManual] = useState(false);
    const [scannerModal, setScannerModal] = useState(false);
    const [scannerCardData, setScannerCardData] = useState([]);
    const [scannerLoading, setScannerLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [visibleData, setVisibleData] = useState([]);
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
    const [footerLoading, setFooterLoading] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [selectedDeleteItem, setSelectedDeleteItem] = useState(null); // true = manual, false = scanner
    // const [isScanning, setIsScanning] = useState(false);
    // console.log("scannerCardData", scannerCardData);

    const [manualBeamData, setManualBeamData] = useState([]);
    const [selectedBeam, setSelectedBeam] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const MANUAL_CHECKER_KEY = "manual_checker";
    const QR_CHECKER_KEY = "qr_checker";

    const resetScanFields = () => {
        setDesign("");
        setGrade("");
        setChecker("");

        setGradeData([]);
        setCheckerData([]);

        setselecteddesign(null);

        setMeter("");
        setKgs("");
        setavgWt("");
        setWarpLen("0");

        setData([]);
        setDesigndata([]);
        setdesigndata([]);

        setBeamNo("");
        setTakaNo("");
        setBeamUid("");
        setPrpCode("");
        setYearNo("");
    };

    let cancelToken: any;
    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2);
    };

    useEffect(() => {
        requestPermission();
    }, []);

    const codeScanner = useCodeScanner({
        codeTypes: ["qr"],
        onCodeScanned: (codes) => {
            setselecteddesign(null);
            setSelectedGrade(null);
            setSelectedChecker(null);
            resetScanFields();
            setBeamNo("");
            setTakaNo("");
            setBeamUid("");
            setPrpCode("");
            setYearNo("");
            setMeter("");
            setKgs("");
            setavgWt("");
            setWarpLen("");
            setData([]);
            setDesign("");
            setGradeData([]);
            setGrade("");
            setCheckerData([]);
            setChecker("");
            setScannedObj({});
            setShift("");
            setPrinter("");
            setPrinters([]);

            const value = codes[0]?.value || "";
            console.log("📦 Raw QR Value 👉", value);
            setScannedValue(value);

            try {
                const parsed = JSON.parse(value);
                setScannedObj(parsed);
                setBeamNo(parsed.beamno || "");
                setTakaNo(parsed.takano || "");
                setBeamUid(parsed.beamuid || "");
                setPrpCode(parsed.prpcode || "");
                setYearNo(parsed.yearNo || "");
                setMeter("");
                setKgs("");
                setavgWt("");
                getGrades(parsed);
                getCheckers(parsed);
                getShifts(parsed);
                sendScannedValue(value);
            } catch (err) {
                setBeamNo("");
                setTakaNo("");
                setBeamUid("");
                setPrpCode("");
                setYearNo("");
                setMeter("");
                setKgs("");
                setavgWt("");
                setWarpLen("");
                setData([]);
                setDesign("");
                setGradeData([]);
                setGrade("");
                setCheckerData([]);
                setChecker("");
                setScannedObj({});
                setShift("");
                setPrinter("");
                setPrinters([]);
                Alert.alert("Invalid QR", "QR format not valid");
            }
            setIsScanning(false);
        },
    });

    const getToken = () => {
        return token;
    };

    const getGrades = async (qrValue: object) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        let yno = await AsyncStorage.getItem("yno");

        try {
            const historyPayload = {
                txntype: "beam_checking_tablet",
                referrer: "dashboard",
                fetch: "grd",
                prpcode: qrValue.prpcode,
                yearno: yno,
            };
            // console.log("grade api payload historyPayload :", historyPayload);
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: { ...historyPayload },
                }),
            );
            // console.log("grade api payload response :", response);
            if (response.data.success && response.data.response.data.length > 0) {
                setGradeData(response.data.response.data);
            } else {
                setGradeData([]);
            }
        } catch (error) {
            console.log("grade API error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getCheckers = async (qrValue: object) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            let yno = await AsyncStorage.getItem("yno");
            const historyPayload = {
                txntype: "beam_checking_tablet",
                referrer: "dashboard",
                fetch: "prodrepackchkby",
                prpcode: qrValue.prpcode,
                yearno: yno,
            };

            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: { ...historyPayload },
                }),
            );

            // console.log("checker response", response);

            // if (response.data.success && response.data.response.data.length > 0) {
            //     const checkerList = response.data.response.data;

            //     const userId = response.data.response.user_id; // <-- response se

            //     if (userId && userId !== "" && userId !== "0") {
            //         const matchedData = checkerList.filter(
            //             (item) => String(item.EmpCode) === String(userId),
            //         );

            //         if (matchedData.length > 0) {
            //             setCheckerData(matchedData);
            //             setChecker(matchedData[0].EmpCode);
            //         } else {
            //             setCheckerData(checkerList);
            //         }
            //     } else {
            //         setCheckerData(checkerList);
            //     }
            // }


            if (response.data.success && response.data.response.data.length > 0) {

                const checkerList = response.data.response.data;

                setCheckerData(checkerList);

                // ================= CACHE ==================
                const cache = await AsyncStorage.getItem(QR_CHECKER_KEY);

                if (cache) {

                    const lastChecker = JSON.parse(cache);

                    const matched = checkerList.find(
                        item => String(item.EmpCode) === String(lastChecker.EmpCode)
                    );

                    if (matched) {

                        setSelectedChecker(matched);
                        setChecker(matched.EmpCode);

                        return;
                    }
                }

                // ================= USER ID ==================
                const userId = response.data.response.user_id;

                if (userId && userId !== "" && userId !== "0") {

                    const matched = checkerList.find(
                        item => String(item.EmpCode) === String(userId)
                    );

                    if (matched) {

                        setSelectedChecker(matched);
                        setChecker(matched.EmpCode);

                        return;
                    }
                }

                // ================= DEFAULT ==================
                setSelectedChecker(null);
                setChecker("");
            }
        } catch (error) {
            console.log("API getCheckers error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getShifts = async (qrValue: object) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        try {
            let yno = await AsyncStorage.getItem("yno");

            const historyPayload = {
                txntype: "beam_checking_tablet",
                referrer: "dashboard",
                fetch: "shift",
                prpcode: qrValue.prpcode,
                yearno: yno,
            };
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: { ...historyPayload },
                }),
            );

            if (response.data.success && response.data.response.data.length > 0) {
                setShiftData(response.data.response.data);
            } else {
                setShiftData([]);
            }
        } catch (error) {
            console.log("API getshifts error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const sendScannedValue = async (qrValue: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);

        try {
            let temp = JSON.parse(qrValue);
            let yno = await AsyncStorage.getItem("yno");

            let infoPyload = {
                txntype: "chekingScanner",
                referrer: "dashboard",
                scannedString: temp,
                prpcode: temp.prpcode,
                yearno: getCurrentFinancialYear(),
            };
            // console.log("---- 1 infoPyload", infoPyload);
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
                "X-Requested-with": "XMLHttpRequest",
            };
            const response = await axios.post(
                `${API}/api/get_auto_checking_help`,
                infoPyload,
                { headers },
            );
            // console.log("==========response", response);
            if (response.data.success && response.data.response.design) {
                setData(response.data.response.design);
                setIsLoading(false);
            } else {
                setIsLoading(false);
                console.error("Unexpected response structure:", response.data);
                Alert.alert(`${response.data}`);
            }
        } catch (error) {
            //console.log("API sendScannedValue error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const BeamNoHelp = async () => {
        setIsLoading(true);

        try {
            const userPtype = await AsyncStorage.getItem("user_prptype");
            const payload = {
                txntype: "chekingScanner",
                referrer: "dashboard",
                scannedString: {
                    // {
                    prpcode: FormState.values.PrpCode || "",
                    prptype: userPtype || "",
                    beamuid: FormState.values.BeamUId || "",
                    beamno: FormState.values.BeamNo || "",
                    // takano: FormState.values.TakaNo || "",
                    takano: "",
                    isfirsttaka: FormState.values.isfirsttaka || "",
                    islasttaka: FormState.values.islasttaka || "",
                    yearno: getCurrentFinancialYear(),
                    // },
                },
                prpcode: FormState.values.PrpCode || "",
                prptype: userPtype || "",
                dsncode: FormState.values.DsnCode || "",
                yearno: getCurrentFinancialYear(),
            };

            // console.log("BeamNoHelp payload", payload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
                "X-Requested-with": "XMLHttpRequest",
            };

            const response = await axios.post(
                `${API}/api/get_auto_checking_help`,
                payload,
                { headers }
            );

            const data = response?.data?.response?.data || [];
            // console.log("data ==", data);

            const uniqueBeamList = data.filter(
                (item, index, self) =>
                    index === self.findIndex(x => x.BeamNo === item.BeamNo)
            ).map(item => ({
                label: item.BeamNo,
                value: item.BeamNo,
                ...item,
            }));

            setManualBeamData(uniqueBeamList);
        } catch (error) {
            console.log("BeamNoHelp Error", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (showManual) {
            BeamNoHelp();
        }
    }, [showManual]);

    const sendScannedValue1 = async (qrValue, dsncode) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);

        try {
            let temp = JSON.parse(qrValue);
            let yno = await AsyncStorage.getItem("yno");

            let infoPyload = {
                txntype: "chekingScanner",
                referrer: "dashboard",
                scannedString: temp,
                prpcode: temp.prpcode,
                dsncode: dsncode,
                yearno: getCurrentFinancialYear(),
            };
            // console.log("----infoPyload1-----", infoPyload);
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
                "X-Requested-with": "XMLHttpRequest",
            };
            const response = await axios.post(
                `${API}/api/get_auto_checking_help`,
                infoPyload,
                { headers },
            );
            // console.log("----response", response);
            const dataArr = response.data.response.data || [];
            if (response.data.success) {
                if (dataArr.length > 0) {
                    setDesigndata(dataArr);
                    setWarpLen(dataArr[0].WarpLen || "0");
                } else {
                    setDesigndata([]);
                    setWarpLen("0");

                    Alert.alert("No Data Found");
                }
            } else {
                setIsLoading(false);
                console.error("Unexpected response structure:", response.data);
                Alert.alert(`${response.data}`);
            }
        } catch (error) {
            //console.log("API sendScannedValue error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMeterChange = (value) => {
        value = value.replace(",", ".");

        const regex = /^\d{0,3}(?:\.\d{0,3})?$/;

        if (value === "" || regex.test(value)) {
            setMeter(value);

            let qty = 0.0;
            qty = isNaN(value) ? 0.0 : parseFloat(value);

            let qltWt = 0.0;

            if (Designdata && Designdata.length > 0 && Designdata[0].QltWt) {
                qltWt = parseFloat(Designdata[0].QltWt);
            }

            let wt = 0.0;

            wt =
                isNaN(qty) || isNaN(qltWt) || qty === 0 || qltWt === 0
                    ? 0.0
                    : (qty * qltWt).toFixed(2);

            let avgWt = 0.0;

            avgWt =
                isNaN(qty) || isNaN(parseFloat(wt)) || qty === 0 || parseFloat(wt) === 0
                    ? 0.0
                    : ((parseFloat(wt) * 100) / qty).toFixed(2);

            setKgs(wt.toString());
            setavgWt(avgWt.toString());

            console.log("Qty =", qty);
            console.log("QltWt =", qltWt);
            console.log("Wt =", wt);
            console.log("AvgWt =", avgWt);
        }
    };

    const handleKgsChange = (value) => {
        value = value.replace(",", ".");

        const regex = /^\d{0,3}(?:\.\d{0,3})?$/;

        if (value === "" || regex.test(value)) {
            setKgs(value);

            let qty = isNaN(meter) ? 0.0 : parseFloat(meter);

            let wt = isNaN(value) ? 0.0 : parseFloat(value);

            let avgWt = 0.0;

            avgWt =
                isNaN(qty) || isNaN(wt) || qty === 0 || wt === 0
                    ? 0.0
                    : ((wt * 100) / qty).toFixed(2);

            setavgWt(avgWt.toString());
        }
    };

    const handleSubmitScan = async () => {
        if (typeof beamNo == "undefined" || beamNo == null || beamNo == "") {
            Alert.alert("Beam no can not be blank");
            return false;
        } else if (typeof takaNo == "undefined" || takaNo == null || takaNo == "") {
            Alert.alert("Taka no can not be blank");
            return false;
        } else if (typeof design == "undefined" || design == null || design == "") {
            Alert.alert("Design can not be blank.");
            return false;
        } else if (
            typeof meter == "undefined" ||
            meter == null ||
            meter == "" ||
            parseInt(meter) <= 0
        ) {
            Alert.alert("Meter can not be blank or 0.");
            return false;
        } else if (
            typeof meter == "undefined" ||
            meter == null ||
            meter == "" ||
            (parseInt(meter) > 0 && parseFloat(meter) > parseFloat(getWarpLen))
        ) {
            Alert.alert(`Meter ${meter} can not be greater than ${getWarpLen}.`);
            return false;
        } else if (
            typeof kgs == "undefined" ||
            kgs == null ||
            kgs == "" ||
            parseInt(kgs) <= 0
        ) {
            Alert.alert("Kgs can not be blank or 0.");
            return false;
        } else if (
            typeof kgs == "undefined" ||
            kgs == null ||
            kgs == "" ||
            parseInt(kgs) <= 0
        ) {
            Alert.alert("Kgs can not be blank or 0.");
            return false;
        } else if (typeof grade == "undefined" || grade == null || grade == "") {
            Alert.alert("Grade can not be blank.");
            return false;
        } else if (
            typeof checker == "undefined" ||
            checker == null ||
            checker == ""
        ) {
            Alert.alert("Checker can not be blank.");
            return false;
        } else if (typeof shift == "undefined" || shift == null || shift == "") {
            Alert.alert("Shift can not be blank.");
            return false;
        } else {
            let finalObj = new Object();
            getData &&
                getData.filter((el, ind) => {
                    if (design == el.DsnCode) {
                        finalObj = el;
                    }
                });

            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();
            setIsLoading(true);

            try {
                let yno = await AsyncStorage.getItem("yno");
                let payloadObj = new Object();
                payloadObj = finalObj;
                payloadObj["prpcode"] = getScannedObj.prpcode;
                payloadObj["yearno"] = yno;
                payloadObj["TakaNo"] = takaNo;
                payloadObj["GrdCode"] = grade;
                payloadObj["ChkCode"] = checker;
                payloadObj["Qty"] = meter;
                payloadObj["Wt"] = kgs;
                payloadObj["AvgWt"] = getavgWt;
                payloadObj["txntype"] = "chekingScanner";
                payloadObj["ShfCode"] = shift;
                payloadObj["SrNo"] = "0";
                payloadObj["islasttaka"] = getScannedObj.islasttaka;
                payloadObj["isfirsttaka"] = getScannedObj.isfirsttaka;
                payloadObj["IsLastTaka"] = getScannedObj.islasttaka;
                payloadObj["IsFirstTaka"] = getScannedObj.isfirsttaka;
                payloadObj["ismending"] = isMending ? 1 : 0;
                payloadObj["AuthStatus"] = Designdata[0].AuthStatus;
                payloadObj["BeamNo"] = Designdata[0].BeamNo;
                payloadObj["OrderUId"] = Designdata[0].OrderUId;
                payloadObj["OrderNo"] = Designdata[0].OrderNo;
                payloadObj["OrderDsnCode"] = Designdata[0].OrderDsnCode;
                payloadObj["OrderDsnName"] = Designdata[0].OrderDsnName;
                payloadObj["OrderLastDate"] = Designdata[0].OrderLastDate;
                payloadObj["UId"] = Designdata[0].UId;
                payloadObj["PlanUId"] = Designdata[0].PlanUId;
                payloadObj["PlanNo"] = Designdata[0].PlanNo;
                payloadObj["BeamUId"] = Designdata[0].BeamUId;
                payloadObj["MacCode"] = Designdata[0].MacCode;
                payloadObj["MacName"] = Designdata[0].MacName;
                payloadObj["BeamNo"] = Designdata[0].BeamNo;
                payloadObj["DsnCode"] = Designdata[0].DsnCode;
                payloadObj["DsnName"] = Designdata[0].DsnName;
                payloadObj["TakaNo"] = Designdata[0].TakaNo;
                payloadObj["WarpLen"] = Designdata[0].WarpLen;
                payloadObj["QltWt"] = Designdata[0].QltWt;
                payloadObj["islasttakatrack"] = Designdata[0].islasttakatrack;
                payloadObj["bstatus"] = Designdata[0].bstatus;
                payloadObj["Status"] = Designdata[0].Status;
                payloadObj["IsAuth"] = Designdata[0].IsAuth;
                payloadObj["AuthStatus"] = Designdata[0].AuthStatus;
                payloadObj["PrpCode"] = Designdata[0].PrpCode;
                payloadObj["EMode"] = "S";

                const headers = {
                    Authorization: `Bearer ${getToken()}`,
                    "Content-Type": "application/json",
                    "X-Requested-with": "XMLHttpRequest",
                };

                // console.log("payloadObj", payloadObj);
                const response = await axios.post(
                    `${API}/api/add_auto_checking_detail`,
                    payloadObj,
                    { headers },
                );
                // console.log("response", response);

                if (response.data.success == true) {

                    const checkerObj = getCheckerData.find(
                        x => String(x.EmpCode) === String(checker)
                    );

                    if (checkerObj) {
                        await AsyncStorage.setItem(
                            QR_CHECKER_KEY,
                            JSON.stringify(checkerObj)
                        );
                    }

                    setIsLoading(false);
                    setDataSaved(true);

                    if (
                        response.data.hasOwnProperty("data") &&
                        typeof response.data.data != "undefined" &&
                        response.data.data
                    ) {
                        // console.log("Sticker Data =>", response.data.data.main[0]);

                        setSavedData(response.data.data.main[0]);
                    }
                    getAllPrinters();
                    Snackbar.show({
                        text: "Saved successfully",
                        duration: Snackbar.LENGTH_LONG,
                        backgroundColor: "#000",
                        action: { text: "OK", textColor: "green" },
                    });
                } else if (response.data.success === false) {
                    setIsLoading(false);
                    setDataSaved(false);
                    Snackbar.show({
                        text: response.data.message,
                        duration: Snackbar.LENGTH_LONG,
                        backgroundColor: "#000",
                        textColor: "#fff",
                        action: { text: "OK", textColor: "yellow" },
                    });
                } else {
                    setIsLoading(false);
                    setDataSaved(false);
                    Snackbar.show({
                        text: response.data.message,
                        duration: Snackbar.LENGTH_LONG,
                        backgroundColor: "#000",
                        textColor: "#fff",
                        action: { text: "OK", textColor: "red" },
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
    };

    const clearDesign = () => {
        setDesign("");
        setWarpLen("0");
        setMeter("");
        setKgs("");
        setavgWt("");
    };
    const clearGrade = () => {
        setGrade("");
    };
    const clearChecker = () => {
        setChecker("");
    };
    const clearShift = () => {
        setShift("");
    };
    const clearPrinter = () => {
        setPrinter("");
    };


    const getPrinterHeaders = () => ({
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "x-api-key": "PRINT_SECRET_123",
    });

    const getPrintersUrl = () => `${String(API).replace(/\/$/, "")}/api/printers`;

    const getPrintStickerUrl = () => {
        return PRINTSTICKER;
    };

    const normalizePrinterList = (raw) => {
        const list = raw?.printers || raw?.data?.printers || raw?.data || raw || [];

        if (!Array.isArray(list)) return [];

        return list
            .map((item) => {
                if (typeof item === "string") {
                    return { Name: item, StatusText: "Idle" };
                }

                return {
                    ...item,
                    Name: item.Name || item.name || item.printerName || "",
                    StatusText:
                        item.StatusText || item.statusText || item.status || "Idle",
                };
            })
            .filter((item) => item.Name);
    };

    const selectPrinter = (item) => {
        const printerName = item?.Name || "";
        setPrinter(printerName);
        setSelectedPrinterStatus(item?.StatusText || "Idle");
        AsyncStorage.setItem("lastSelectedPrinter", printerName);

        if (!pendingPrintItem) {
            setPrinterModalVisible(false);
        }
    };

    const getPrinterStatusColor = (statusText) => {
        if (!statusText || statusText === "Idle" || statusText === "Online")
            return "#16A34A";
        if (statusText === "Offline") return "#DC2626";
        return "#6B7280";
    };

    const postPrintSticker = async (params) => {
        const url = getPrintStickerUrl();
        console.log("PRINT STICKER API:", url);
        return axios.post(url, params, {
            headers: getPrinterHeaders(),
            timeout: 30000,
        });
    };

    const openPrinterForScannerRow = async (item) => {
        setPendingPrintItem(item);
        setPrinterModalVisible(true);
        if (getPrinters.length === 0) {
            await getAllPrinters();
        }
    };

    const buildStickerParams = (rowData, printerName) => ({
        data: [rowData],
        IskgQty: 0,
        printype: "Print",
        PrintFormat: 4,
        printerName: printerName || printer || "",
        txntype: "chekingScanner",
    });

    const printStickerForData = async (rowData) => {
        const printerName = printer || "";

        if (!printerName) {
            Alert.alert("Printer Required", "Please select printer first.");
            return;
        }

        if (!rowData || Object.keys(rowData).length === 0) {
            Alert.alert("Print Error", "Sticker data is empty.");
            return;
        }

        const params = buildStickerParams(rowData, printerName);

        console.log("=========== PRINT REQUEST ===========");
        console.log("Printer :", printerName);
        console.log("Row Data :", rowData);
        console.log("Params :", JSON.stringify(params, null, 2));
        console.log("=====================================");

        setIsLoading(true);
        try {
            const response = await postPrintSticker(
                buildStickerParams(rowData, printerName),
            );
            const res = response.data || {};

            if (res.success) {
                Snackbar.show({
                    text: `✅ ${res.printed || 1} label(s) sent to printer.`,
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: "green",
                    action: { text: "OK", textColor: "white" },
                });
                setPrinterModalVisible(false);
                setPendingPrintItem(null);
            } else {
                Snackbar.show({
                    text: res.message || "Print failed",
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: "red",
                    action: { text: "OK", textColor: "white" },
                });
            }
        } catch (error) {
            console.log("PRINT ROW ERROR:", {
                message: error?.message,
                status: error?.response?.status,
                data: error?.response?.data,
                url: error?.config?.url,
            });
            Snackbar.show({
                text:
                    error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    error.message ||
                    "Print failed",
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: "red",
                action: { text: "OK", textColor: "white" },
            });
        } finally {
            setIsLoading(false);
        }
    };

    const printSticker = () => {
        printStickerForData(getSavedData);
    };

    const getAllPrinters = async () => {
        setPrinterLoading(true);
        setPrinterError("");

        const url = getPrintersUrl();

        try {
            console.log("PRINTER LIST API:", url);

            const res = await axios.get(url, {
                headers: getPrinterHeaders(),
                timeout: 30000,
            });

            const printerList = normalizePrinterList(res.data);
            setPrinters(printerList);

            const lastSelected = await AsyncStorage.getItem("lastSelectedPrinter");
            const selectedFromStorage = lastSelected
                ? printerList.find((p) => p.Name === lastSelected)
                : null;

            const defaultPrinter =
                selectedFromStorage ||
                printerList.find((p) => p.IsDefault || p.isDefault || p.Default) ||
                printerList[0];

            if (defaultPrinter) {
                selectPrinter(defaultPrinter);
            }

            if (printerList.length === 0) {
                setPrinterError("No printer found from Laravel print bridge.");
            }
        } catch (err) {
            const message =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Printer service not reachable";

            setPrinterError(message);
            setPrinters([]);

            console.log("Printer API error:", {
                message: err?.message,
                code: err?.code,
                status: err?.response?.status,
                data: err?.response?.data,
                url: err?.config?.url,
                baseURL: err?.config?.baseURL,
            });

            Alert.alert("Printer Error", String(message));
        } finally {
            setPrinterLoading(false);
            setIsLoading(false);
        }
    };

    const handleChange = (key, value) => {
        setFormState((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                [key]: value,
            },
        }));
    };

    const fetchmachine = async () => {
        const userPtype = await AsyncStorage.getItem("user_prptype");
        try {
            setIsLoading(true);
            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                yearno: getCurrentFinancialYear(),
                txntype: "manual_checking",
                fetch: "manual_checking_machine_help",
            };
            // console.log("Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/prodbeamdetailbrowsesudo`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token,
                }),
            );
            // console.log("Machine API Response:", response);
            const data = response?.data?.data || [];
            if (response?.data?.success && data.length > 0) {
                setMachineData(data);
            } else {
                setMachineData([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getshifts error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchdesign = async () => {
        const userPtype = await AsyncStorage.getItem("user_prptype");

        try {
            setIsLoading(true);

            let infoPyload = {
                prptype: userPtype,
                yearno: getCurrentFinancialYear(),
                txntype: "manual_checking",
                fetch: "manual_checking_machine_help",
                referrer: "dashboard",
            };

            // console.log("infoPyload design payload", infoPyload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
                "X-Requested-with": "XMLHttpRequest",
            };

            const response = await axios.post(
                `${API}/api/get_auto_checking_design_help`,
                infoPyload,
                { headers },
            );

            // console.log("design response", response);

            if (response.data.success && response.data.response.design) {
                setdesigndata(response.data.response.design);
            } else {
                console.error("Unexpected response structure:", response.data);
                Alert.alert("No Design Data Found");
            }
        } catch (error) {
            console.log("API error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDesignHelp = async (beamData) => {
        setIsLoading(true);

        try {
            const userPtype = await AsyncStorage.getItem("user_prptype");
            const payload = {
                txntype: "chekingScanner",
                referrer: "dashboard",
                scannedString:
                {
                    prpcode: beamData.PrpCode,
                    prptype: userPtype,
                    beamuid: beamData.BeamUId,
                    beamno: beamData.BeamNo,
                    // takano: beamData.TakaNo,
                    takano: "",
                    isfirsttaka: beamData.isfirsttaka || 0,
                    islasttaka: beamData.islasttaka || 1,
                    yearno: getCurrentFinancialYear(),
                },
                // ],
                prpcode: beamData.PrpCode,
                prptype: userPtype,
                dsncode: beamData.DsnCode || "",
                yearno: getCurrentFinancialYear(),
            };

            // console.log("Design Payload", payload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
                "X-Requested-with": "XMLHttpRequest",
            };

            const response = await axios.post(
                `${API}/api/get_auto_checking_help`,
                payload,
                { headers }
            );

            const maxTakaNo =
                response?.data?.response?.maxtakano ??
                "";

            setFormState((prev) => ({
                ...prev,
                values: {
                    ...prev.values,
                    TakaNo: maxTakaNo,
                },
            }));
            // console.log("Design Help Response", response.data);

            // if (response.data.success) {
            //     setdesigndata(response.data.response.design || []);
            // }

            if (response.data.success) {

                const design = response.data.response.data?.[0];

                if (design) {
                    setFormState(prev => ({
                        ...prev,
                        values: {
                            ...prev.values,
                            QltWt: design.QltWt,
                            WarpLen: design.WarpLen,
                            UId: design.UId,
                            AuthStatus: design.AuthStatus,
                            BeamNo: design.BeamNo,
                            BeamUId: design.BeamUId,
                            DsnCode: design.DsnCode,
                            DsnName: design.DsnName,
                        }
                    }));
                }

                setdesigndata(response.data.response.design || []);
            }

        } catch (error) {
            console.log("Design Help Error", error);
        } finally {
            setIsLoading(false);
        }
    };

    const manualDesignSelect = async (item) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        setIsLoading(true);

        try {
            const userPtype = await AsyncStorage.getItem("user_prptype");

            const dsncode = item?.dsncode || "";

            // console.log("dsncode =>", dsncode);

            const temp = {
                prpcode: FormState.values.PrpCode,
                prptype: userPtype,
                beamuid: FormState.values.BeamUId,
                beamno: FormState.values.BeamNo,
                takano: "",
                isfirsttaka: FormState.values.isfirsttaka || 0,
                islasttaka: FormState.values.islasttaka || 1,
                yearno: getCurrentFinancialYear(),
            };

            const infoPayload = {
                txntype: "chekingScanner",
                referrer: "dashboard",
                scannedString: temp,
                prpcode: temp.prpcode,
                dsncode: dsncode,
                yearno: getCurrentFinancialYear(),
            };
            // console.log("Manual Design Payload", infoPayload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
                "X-Requested-with": "XMLHttpRequest",
            };

            const response = await axios.post(
                `${API}/api/get_auto_checking_help`,
                infoPayload,
                { headers }
            );

            // console.log("Manual Design Response", response);

            if (response.data.success) {

                const data = response?.data?.response?.data?.[0];

                if (data) {

                    setFormState(prev => ({
                        ...prev,
                        values: {
                            ...prev.values,

                            QltWt: data.QltWt,
                            WarpLen: data.WarpLen,
                            UId: data.UId,
                            AuthStatus: data.AuthStatus,
                            BeamNo: data.BeamNo,
                            BeamUId: data.BeamUId,
                            DsnCode: data.DsnCode,
                            DsnName: data.DsnName,
                            OrderNo: data.OrderNo,
                            OrderUId: data.OrderUId,
                            OrderDsnCode: data.OrderDsnCode,
                            OrderDsnName: data.OrderDsnName,
                            OrderLastDate: data.OrderLastDate,
                            PlanNo: data.PlanNo,
                            PlanUId: data.PlanUId,
                            Status: data.Status,
                            IsAuth: data.IsAuth,
                        }
                    }));
                }
            }

        } catch (error) {
            console.log("manualDesignSelect Error", error);
        } finally {
            setIsLoading(false);
        }
    };

    // const handleManualMeterChange = (value) => {
    //     value = value.replace(",", ".");

    //     const regex = /^\d{0,3}(?:\.\d{0,3})?$/;

    //     if (value === "" || regex.test(value)) {
    //         setMeter(value);

    //         let qty = isNaN(value) ? 0.0 : parseFloat(value);
    //         let wt = isNaN(kgs) ? 0.0 : parseFloat(kgs);

    //         let avgWt = 0.0;
    //         avgWt =
    //             isNaN(qty) || isNaN(wt) || qty === 0 || wt === 0
    //                 ? 0.0
    //                 : ((wt * 100) / qty).toFixed(2);

    //         setavgWt(avgWt.toString());
    //         handleChange("Qty", value);
    //     }
    // };

    const handleManualMeterChange = (value) => {
        value = value.replace(",", ".");

        const regex = /^\d{0,3}(?:\.\d{0,3})?$/;

        if (value === "" || regex.test(value)) {

            setMeter(value);

            const qty = value === "" ? 0 : parseFloat(value);

            const qltWt = parseFloat(FormState.values.QltWt || 0);

            const wt =
                qty > 0 && qltWt > 0
                    ? (qty * qltWt).toFixed(2)
                    : "0.00";

            const avgWt =
                qty > 0 && parseFloat(wt) > 0
                    ? ((parseFloat(wt) * 100) / qty).toFixed(2)
                    : "0.00";

            setKgs(wt);
            setavgWt(avgWt);

            handleChange("Qty", value);
            handleChange("Wt", wt);
            handleChange("AvgWt", avgWt);
        }
    };

    const handleManualKgsChange = (value) => {
        value = value.replace(",", ".");

        const regex = /^\d{0,3}(?:\.\d{0,3})?$/;

        if (value === "" || regex.test(value)) {
            setKgs(value);

            let qty = isNaN(meter) ? 0.0 : parseFloat(meter);
            let wt = isNaN(value) ? 0.0 : parseFloat(value);

            let avgWt = 0.0;
            avgWt =
                isNaN(qty) || isNaN(wt) || qty === 0 || wt === 0
                    ? 0.0
                    : ((wt * 100) / qty).toFixed(2);

            setavgWt(avgWt.toString());
            handleChange("Wt", value);
        }
    };

    const fetchManualGradeCheckerShift = async () => {
        try {
            let yno = await AsyncStorage.getItem("yno");
            const userPtype = await AsyncStorage.getItem("user_prptype");
            const gradePayload = {
                txntype: "manual_checking",
                referrer: "dashboard",
                fetch: "grd",
                prpcode: "",
                yearno: yno,
                prptype: userPtype
            };
            const checkerPayload = {
                txntype: "manual_checking",
                referrer: "dashboard",
                fetch: "prodrepackchkby",
                prpcode: "",
                yearno: yno,
                prptype: userPtype
            };
            const shiftPayload = {
                txntype: "manual_checking",
                referrer: "dashboard",
                fetch: "shift",
                prpcode: "",
                yearno: yno,
                prptype: userPtype
            };

            const [gradeRes, checkerRes, shiftRes] = await Promise.all([
                axios.get(`${API}/api/get_criterion`, getRequestConfig({ params: { ...gradePayload } })),
                axios.get(`${API}/api/get_criterion`, getRequestConfig({ params: { ...checkerPayload } })),
                axios.get(`${API}/api/get_criterion`, getRequestConfig({ params: { ...shiftPayload } })),
            ]);

            if (gradeRes?.data?.success && gradeRes.data.response?.data?.length > 0) {
                setManualGradeData(gradeRes.data.response.data);
            } else {
                setManualGradeData([]);
            }

            if (checkerRes?.data?.success && checkerRes.data.response?.data?.length > 0) {
                const checkerList = checkerRes.data.response.data;

                setManualCheckerData(checkerList);

                // NEW
                const cache = await AsyncStorage.getItem(MANUAL_CHECKER_KEY);

                if (cache) {
                    const lastChecker = JSON.parse(cache);

                    const matched = checkerList.find(
                        x => String(x.EmpCode) === String(lastChecker.EmpCode)
                    );

                    if (matched) {
                        setSelectedManualChecker(matched);
                        setManualChecker(matched.EmpCode);

                        handleChange("ChkCode", matched.EmpCode);
                        handleChange("ChkName", matched.EmpName);
                    }
                }
            } else {
                setManualCheckerData([]);
            }

            if (shiftRes?.data?.success && shiftRes.data.response?.data?.length > 0) {
                setManualShiftData(shiftRes.data.response.data);
            } else {
                setManualShiftData([]);
            }
        } catch (error) {
            console.log("fetchManualGradeCheckerShift error:", error);
        }
    };

    const soshow = async () => {
        const userPtype = await AsyncStorage.getItem("user_prptype");
        setIsLoading(true);
        try {
            const historyPayload = {
                prptype: userPtype,
                yearno: getCurrentFinancialYear(),
                txntype: "manual_checking",
                MacCode: "",
                TakaNo: "",
            };
            // console.log("aaj apii  soshow response", historyPayload);
            const response = await axios.get(
                `${API}/api/get_manual_checking_detail`,
                getRequestConfig({
                    params: { ...historyPayload },
                }),
            );

            // console.log("aaj apii  soshow response", response);

            const mainData = response?.data?.data?.main || [];
            const newMain = response?.data?.data?.new_main || [];

            if (response?.data?.success && newMain.length > 0) {
                console.log("Main Data 👉", mainData);
                if (newMain.length > 0 && typeof newMain[0] === "object") {
                    const first = newMain[0];
                    setFormState((prev) => ({
                        ...prev,
                        values: {
                            ...first,
                        },
                    }));
                }
                fetchmachine();
                fetchdesign();
                fetchManualGradeCheckerShift();
            } else {
                Alert.alert("No Data Found");
            }
        } catch (error) {
            console.log("API error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const showAlert = (message) => {
        return new Promise((resolve) => {
            Alert.alert(
                "Validation Error",
                message,
                [
                    {
                        text: "OK",
                        onPress: () => resolve(true),
                    },
                ],
                { cancelable: false },
            );
        });
    };

    const validateForm = async () => {
        if (!FormState.values.MacCode) {
            await showAlert("Please select a valid machine");
            return false;
        }

        if (!FormState.values.TakaNo) {
            await showAlert("Please Enter TakaNo");
            return false;
        }

        if (!FormState.values.DsnName) {
            await showAlert("Please Enter Design");
            return false;
        }

        const meterVal = parseFloat(meter);
        if (meter === "" || isNaN(meterVal) || meterVal <= 0) {
            await showAlert("Please Enter valid Meter");
            return false;
        }

        const kgsVal = parseFloat(kgs);
        if (kgs === "" || isNaN(kgsVal) || kgsVal <= 0) {
            await showAlert("Please Enter valid Kgs");
            return false;
        }

        if (!FormState.values.GrdCode) {
            await showAlert("Please select Grade");
            return false;
        }

        if (!FormState.values.ChkCode) {
            await showAlert("Please select Checker");
            return false;
        }

        if (!FormState.values.ShfCode) {
            await showAlert("Please select Shift");
            return false;
        }

        return true;
    };

    const handleClearForm = () => {
        setFormState((prev) => ({
            ...prev,
            values: {
                ...prev.values,

                MacCode: "",
                TakaNo: "",
                DsnName: "",
                DsnCode: "",
                Qty: "",
                Wt: "",
                AvgWt: "",
                GrdCode: "",
                GrdName: "",
                // ChkCode: "",
                // ChkName: "",
                ChkCode: prev.values.ChkCode,
                ChkName: prev.values.ChkName,
                ShfCode: "",
                ismending: 0,
                BalQty: "",
                UsrCode: "",
                LastDate: "",
                LastTime: "",
                UUsrCode: "",
                ULastDate: "",
                ULastTime: "",
                MacName: "",
                isedit: "",
            },
        }));
        setSelectedMachine(null);
        setSelectedBeam(null);
        handleChange("BeamNo", "");
        handleChange("BeamUId", "");
        handleChange("PrpCode", "");
        handleChange("TakaNo", "");
        handleChange("DsnCode", "");
        handleChange("DsnName", "");
        handleChange("GrdCode", "");
        handleChange("GrdName", "");
        handleChange("ShfCode", "");
        handleChange("ShfName", "");
        handleChange("OrderDsnCode", "");
        handleChange("OrderDsnName", "");
        handleChange("OrderLastDate", "");
        handleChange("OrderNo", "");
        handleChange("OrderUId", "");
        handleChange("PlanNo", "");
        handleChange("PlanUId", "");
        handleChange("QltWt", "");
        handleChange("Status", "");
        handleChange("WarpLen", "");
        handleChange("UId", "");

        setselecteddesign(null);
        setMeter("");
        setKgs("");
        setavgWt("0");
        setGrade("");
        setShift("");
        setIsMending(false);
        setSelectedGrade(null);

        // Grade
        setManualGrade("");
        setSelectedManualGrade(null);
        handleChange("GrdCode", "");
        handleChange("GrdName", "");

        // Shift
        setManualShift("");
        handleChange("ShfCode", "");
        handleChange("ShfName", "");

        // Machine
        setSelectedMachine(null);

        // Beam
        setSelectedBeam(null);
        setManualBeamData([]);

        // Design
        setselecteddesign(null);
        setdesigndata([]);
        setData([]);

        // Meter / Kgs
        setMeter("");
        setKgs("");
        setavgWt("0");
        setWarpLen("0");

        // Grade
        setSelectedManualGrade(null);
        setManualGrade("");

        // Shift
        setManualShift("");

        // Mending
        setIsMending(false);

        // Agar Beam dropdown dobara load karna ho
        BeamNoHelp();

        // setChecker("");
        // setSelectedChecker(null);
    };

    const handlesave = async () => {
        const userPtype = await AsyncStorage.getItem("user_prptype");
        const isValid = await validateForm();
        if (!isValid) return;

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            const payloadObj = {
                ...FormState.values,
                AvgWt: getavgWt,
                AuthStatus: FormState.values.AuthStatus,
                MacCode: FormState.values.MacCode,
                MacName: FormState.values.MacName,
                prpcode: FormState.values.PrpCode,
                isfirsttaka: FormState.values.isfirsttaka || "",
                IsFirstTaka: FormState.values.isfirsttaka || "",
                islasttaka: FormState.values.islasttaka || "",
                IsLastTaka: FormState.values.islasttaka || "",
                ismending: isMending ? 1 : 0,
                prptype: userPtype,
                OrderDsnCode: FormState.values.OrderDsnCode,
                OrderDsnName: FormState.values.OrderDsnName,
                OrderLastDate: FormState.values.OrderLastDate,
                OrderNo: FormState.values.OrderNo,
                OrderUId: FormState.values.OrderUId,
                PlanNo: FormState.values.PlanNo,
                PlanUId: FormState.values.PlanUId,
                QltWt: FormState.values.QltWt,
                Status: FormState.values.Status,
                WarpLen: FormState.values.WarpLen,
                UId: FormState.values.UId,
                // txntype: "manual_checking",
                txntype: "chekingScanner",
                yearno: getCurrentFinancialYear(),
                EMode: "M",
            };

            // console.log("payload...........333", payloadObj);
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
                "X-Requested-with": "XMLHttpRequest",
            };
            const response = await axios.post(
                `${API}/api/add_auto_checking_detail`,
                payloadObj,
                { headers },
            );
            // return 0;
            // console.log("response", response);

            if (response.data.success === true) {
                Alert.alert("Success", "Data Saved Successfully ✅", [
                    {
                        text: "OK",
                        onPress: async () => {
                            handleClearForm();

                            // Beam dropdown reload
                            await BeamNoHelp();

                            // Agar Taka No / Main data fresh chahiye to
                            await soshow();
                        },
                    },
                ]);
            } else if (response.data.success === false) {
                setIsLoading(false);
                setDataSaved(false);
                Snackbar.show({
                    text: `⚠️ ${response.data.message}`,
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: "#D32F2F",
                    textColor: "#fff",
                    numberOfLines: 2,
                    action: {
                        text: "OK",
                        textColor: "#fff",
                        onPress: () => { },
                    },
                });
            } else {
                setIsLoading(false);
                setDataSaved(false);
                Snackbar.show({
                    text: response.data.message,
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: "#000",
                    textColor: "#fff",
                    action: { text: "OK", textColor: "red" },
                });
            }
        } catch (error) {
            setDataSaved(false);
            setIsLoading(false);
            console.log("API handleSubmitScan error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleScannerList = async (mode = "S") => {
        const userPtype = await AsyncStorage.getItem("user_prptype");

        try {
            setScannerModal(true);
            setScannerLoading(true);

            if (cancelToken?.cancel) cancelToken.cancel();

            cancelToken = axios.CancelToken.source();

            const txntype = showManual ? "manual_checking" : "chekingScanner";

            const payload = {
                prptype: userPtype,
                yearno: getCurrentFinancialYear(),
                txntype: "cheking_scanner_list",
                ShfCode: "",
                ChkDate: "",
                PrpCode: "",
                BeamNo: "",
                EMode: mode,
            };

            // console.log("scanner list Payload:", payload);

            const response = await axios.get(
                `${API}/api/show_beam_checking`,
                getRequestConfig({
                    params: { ...payload },
                    cancelToken: cancelToken.token,
                }),
            );

            // console.log("scanner list API Response:", response);

            const data = response?.data?.data?.main || [];

            // console.log("scannerCardData =>", data);

            if (response?.data?.success) {
                setScannerCardData(data);
            } else {
                setScannerCardData([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getshifts error:", error);
            }
        } finally {
            setScannerLoading(false);
        }
    };

    const loadMoreData = () => {
        if (footerLoading) return;

        if (visibleData.length >= scannerCardData.length) return;

        setFooterLoading(true);

        const nextPage = page + 1;

        const newData = scannerCardData.slice(0, nextPage * ITEMS_PER_PAGE);

        setVisibleData(newData);

        setPage(nextPage);

        setFooterLoading(false);
    };

    const filteredData = scannerCardData.filter((item) => {
        const search = searchText.toLowerCase();

        return (
            item?.DsnName?.toLowerCase()?.includes(search) ||
            item?.BeamNo?.toLowerCase()?.includes(search) ||
            item?.TakaNo?.toLowerCase()?.includes(search) ||
            item?.OrdDsnName?.toLowerCase()?.includes(search) ||
            item?.GrdName?.toLowerCase()?.includes(search)
        );
    });

    const handledelete = async () => {
        try {
            setShowDeleteAlert(false);

            if (!selectedDeleteItem) {
                console.log("selectedDeleteItem missing");

                return;
            }

            console.log("DELETE ITEM =>", selectedDeleteItem);

            setIsDeleteLoading(true);

            let infoPyload = {
                ShfCode: selectedDeleteItem?.ShfCode || "",

                ChkDate: selectedDeleteItem?.ChkDate || "",

                MacGrp: selectedDeleteItem?.MacGrp || "",

                PrpCode: selectedDeleteItem?.PrpCode || "",

                yearno: selectedDeleteItem?.yearno || getCurrentFinancialYear(),

                txntype: "chekingScanner",

                SrNo: selectedDeleteItem?.SrNo || "",

                UId: selectedDeleteItem?.UId || "",

                BeamNo: selectedDeleteItem?.BeamNo || "",
            };

            // console.log("DELETE PAYLOAD =>", infoPyload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
                "X-Requested-with": "XMLHttpRequest",
            };

            const response = await axios.post(
                `${API}/api/delete_checking_detail`,
                infoPyload,
                { headers },
            );

            // console.log("DELETE RESPONSE =>", response.data);

            if (response.data.success) {
                setIsDeleteLoading(false);
                const updatedData = scannerCardData.filter(
                    (data) => data.UId !== selectedDeleteItem.UId,
                );

                setScannerCardData(updatedData);

                setVisibleData(updatedData);

                Alert.alert(
                    "Success",
                    response.data.message || "Record deleted successfully",
                );

                await handleScannerList();
            } else {
                Alert.alert("Warning", response.data.message);
            }
        } catch (error) {
            console.log("DELETE ERROR =>", error);

            Alert.alert("Error", "Something went wrong");
        } finally {
            setIsDeleteLoading(false);
        }
    };

    const openDeletePopup = (item) => {
        setSelectedDeleteItem(item);

        setShowDeleteAlert(true);
    };

    const filteredPrinters = useMemo(() => {
        const q = printerSearch.trim().toLowerCase();
        if (!q) return getPrinters;
        return getPrinters.filter((p) => {
            const name = String(p?.Name || "").toLowerCase();
            const status = String(p?.StatusText || "").toLowerCase();
            return name.includes(q) || status.includes(q);
        });
    }, [getPrinters, printerSearch]);


    if (!device || !hasPermission) {
        return (
            <View>
                <Text>No camera permission or device not available</Text>
            </View>
        );
    }

    const onRefresh = async () => {
        setRefreshing(true);

        await soshow();        // Manual Entry initial API
        await BeamNoHelp();    // Beam No dropdown API

        setRefreshing(false);
    };


    return (
        <>
            {isLoading && <FullScreenLoader />}
            <HeaderBarwithBack
                userName={username}
                header={"Checking scanner"}
                subHeader={"scan with QR code"}
            />

            <ScrollView
                style={{ flex: 1, backgroundColor: "#F4F7FB" }}
                contentContainerStyle={{ padding: 14, paddingBottom: 28 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#0284C7"]}
                        tintColor="#0284C7"
                    />
                }
            >
                <View
                    style={{
                        flexDirection: "row",
                        backgroundColor: "#FFFFFF",
                        borderRadius: 24,
                        padding: 5,
                        marginBottom: 14,
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        shadowColor: "#0F172A",
                        shadowOpacity: 0.08,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 3,
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={{
                            flex: 1,
                            minHeight: 50,
                            borderRadius: 20,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: showManual ? "#0B84A5" : "transparent",
                        }}
                        // onPress={() => {
                        //     setShowManual(true);
                        //     setIsScanning(false);
                        //     soshow();
                        // }}

                        onPress={() => {
                            resetScanFields();
                            setBeamNo("");
                            setTakaNo("");
                            setBeamUid("");
                            setPrpCode("");
                            setYearNo("");
                            setMeter("");
                            setKgs("");
                            setavgWt("0");
                            setWarpLen("0");
                            setData([]);
                            setDesigndata([]);
                            setdesigndata([]);
                            setselecteddesign(null);
                            setShowManual(true);
                            setIsScanning(false);
                            soshow();
                        }}
                    >
                        <Icon name="edit" size={20} color={showManual ? "#FFFFFF" : "#475569"} />
                        <Text style={{ marginLeft: 8, color: showManual ? "#FFFFFF" : "#334155", fontWeight: "900", fontSize: 14 }}>
                            Manual Entry
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={{
                            flex: 1,
                            minHeight: 50,
                            borderRadius: 20,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: !showManual ? "#0284C7" : "transparent",
                            shadowColor: "#0284C7",
                            shadowOpacity: !showManual ? 0.22 : 0,
                            shadowRadius: 10,
                            shadowOffset: { width: 0, height: 3 },
                            elevation: !showManual ? 3 : 0,
                        }}
                        onPress={() => setShowManual(false)}
                    >
                        <Icon name="qr-code-scanner" size={20} color={!showManual ? "#FFFFFF" : "#475569"} />
                        <Text style={{ marginLeft: 8, color: !showManual ? "#FFFFFF" : "#334155", fontWeight: "900", fontSize: 14 }}>
                            QR Scanner
                        </Text>
                    </TouchableOpacity>
                </View>

                {!showManual && (
                    <View
                        style={{
                            backgroundColor: "#EFF6FF",
                            borderRadius: 22,
                            padding: 16,
                            marginBottom: 14,
                            borderWidth: 1,
                            borderColor: "#D7E8FF",
                            flexDirection: "row",
                            alignItems: "center",
                            shadowColor: "#0F172A",
                            shadowOpacity: 0.06,
                            shadowRadius: 12,
                            shadowOffset: { width: 0, height: 4 },
                            elevation: 2,
                        }}
                    >
                        <View
                            style={{
                                width: 58,
                                height: 58,
                                borderRadius: 20,
                                backgroundColor: "#DBEAFE",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 14,
                            }}
                        >
                            <Icon name="qr-code-scanner" size={31} color="#0369A1" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: "#0F172A", fontWeight: "900", fontSize: 18 }}>QR Scanner</Text>
                            <Text style={{ color: "#64748B", marginTop: 4, fontSize: 13 }}>Point camera to QR code</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 7 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isScanning ? "#22C55E" : "#94A3B8", marginRight: 7 }} />
                                <Text style={{ color: isScanning ? "#15803D" : "#64748B", fontSize: 12, fontWeight: "800" }}>
                                    {isScanning ? "Scanning active" : "Ready to scan"}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.88}
                            onPress={() => {
                                resetScanFields();
                                setIsScanning((prev) => !prev);
                            }}
                            style={{
                                minHeight: 48,
                                paddingHorizontal: 18,
                                borderRadius: 16,
                                backgroundColor: isScanning ? "#DC2626" : "#0284C7",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                shadowColor: isScanning ? "#DC2626" : "#0284C7",
                                shadowOpacity: 0.25,
                                shadowRadius: 8,
                                shadowOffset: { width: 0, height: 4 },
                                elevation: 4,
                            }}
                        >
                            <Icon name={isScanning ? "stop-circle" : "photo-camera"} size={20} color="#FFFFFF" />
                            <Text style={{ color: "#FFFFFF", fontWeight: "900", marginLeft: 8 }}>
                                {isScanning ? "STOP" : "SCAN"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isScanning && (
                    <View
                        style={{
                            height: 280,
                            borderRadius: 24,
                            overflow: "hidden",
                            marginBottom: 14,
                            borderWidth: 2,
                            borderColor: "#0284C7",
                            backgroundColor: "#000",
                        }}
                    >
                        {device && hasPermission && (
                            <Camera style={{ flex: 1 }} device={device} isActive={true} codeScanner={codeScanner} />
                        )}
                        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                            <View style={{ width: 190, height: 190, borderRadius: 22, borderWidth: 3, borderColor: "#FFFFFF" }} />
                        </View>
                    </View>
                )}

                {!showManual && (
                    <View
                        style={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: 24,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: "#E2E8F0",
                            shadowColor: "#0F172A",
                            shadowOpacity: 0.08,
                            shadowRadius: 14,
                            shadowOffset: { width: 0, height: 5 },
                            elevation: 4,
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                <Icon name="inventory-2" size={20} color="#0369A1" />
                            </View>
                            <Text style={{ color: "#075985", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>FABRIC INFO</Text>
                        </View>

                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: "#0F172A", fontWeight: "900", marginBottom: 7 }}>Beam Number <Text style={{ color: "#DC2626" }}>*</Text></Text>
                                <TextInput
                                    style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", paddingHorizontal: 12, color: "#0F172A", fontWeight: "800" }}
                                    value={beamNo}
                                    editable={false}
                                    placeholder="Auto"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: "#0F172A", fontWeight: "900", marginBottom: 7 }}>Taka No <Text style={{ color: "#DC2626" }}>*</Text></Text>
                                <TextInput
                                    style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", paddingHorizontal: 12, color: "#0F172A", fontWeight: "800" }}
                                    value={takaNo}
                                    editable={false}
                                    placeholder="Auto"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                        </View>

                        <Text style={{ color: "#0F172A", fontWeight: "900", marginTop: 14, marginBottom: 7 }}>Design <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <View style={{ minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", justifyContent: "center", overflow: "hidden" }}>
                            <PartyDropdown
                                data={getData}
                                placeholder="Choose design..."
                                labelKey={["dsnname", "dsncode"]}
                                valueKey="dsncode"
                                pageSize={12}
                                initialValue={null}
                                selected={selecteddesign}
                                loading={false}
                                type="checkingdesigndata"
                                onSelect={(item) => {
                                    const selectedDesign = item?.dsncode || "";
                                    console.log("👉 DESIGN SELECTED:", selectedDesign);
                                    console.log("👉 SCANNED VALUE:", scannedValue);
                                    setselecteddesign(item);
                                    setDesign(item.dsncode);
                                    if (scannedValue) {
                                        sendScannedValue1(scannedValue, item.dsncode);
                                    }
                                }}
                                setSelected={(val) => {
                                    if (!val) {
                                        setDesign("");
                                        setWarpLen("0");
                                    } else {
                                        setDesign(val.dsncode);
                                        setWarpLen(val.WarpLen || "0");
                                    }
                                }}
                            />
                        </View>

                        <View style={{ height: 1, backgroundColor: "#E2E8F0", marginVertical: 18 }} />

                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                <Icon name="settings" size={20} color="#059669" />
                            </View>
                            <Text style={{ color: "#047857", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>PRODUCTION DETAILS</Text>
                        </View>

                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: "#0F172A", fontWeight: "900", marginBottom: 7 }}>
                                    Meter <Text style={{ color: "#DC2626" }}>*</Text>
                                    {typeof getWarpLen != "undefined" && getWarpLen != "" && getWarpLen != null && parseFloat(getWarpLen) != 0 ? (
                                        <Text style={{ fontSize: 11, color: "#64748B" }}> [{getWarpLen}]</Text>
                                    ) : null}
                                </Text>
                                <TextInput
                                    style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", paddingHorizontal: 12, color: "#0F172A", fontWeight: "800" }}
                                    value={meter}
                                    keyboardType="decimal-pad"
                                    onChangeText={handleMeterChange}
                                    placeholder="Meter"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: "#0F172A", fontWeight: "900", marginBottom: 7 }}>Kgs <Text style={{ color: "#DC2626" }}>*</Text></Text>
                                <TextInput
                                    style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", paddingHorizontal: 12, color: "#0F172A", fontWeight: "800" }}
                                    value={kgs}
                                    keyboardType="decimal-pad"
                                    onChangeText={handleKgsChange}
                                    placeholder="Kgs"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                        </View>

                        <Text style={{ color: "#0F172A", fontWeight: "900", marginTop: 14, marginBottom: 7 }}>Avg. Wt <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <TextInput
                            style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", paddingHorizontal: 12, color: "#0F172A", fontWeight: "900" }}
                            value={getavgWt}
                            editable={false}
                        />

                        <View style={{ height: 1, backgroundColor: "#E2E8F0", marginVertical: 18 }} />

                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                <Icon name="verified" size={20} color="#B45309" />
                            </View>
                            <Text style={{ color: "#92400E", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>QUALITY DETAILS</Text>
                        </View>

                        <Text style={{ color: "#0F172A", fontWeight: "900", marginBottom: 7 }}>Grade <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <View style={{ minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", justifyContent: "center", overflow: "hidden" }}>
                            <PartyDropdown
                                data={getGradeData}
                                placeholder="Choose grade..."
                                labelKey={["GrdName", "GrdCode"]}
                                valueKey="GrdCode"
                                pageSize={12}
                                initialValue={null}
                                selected={selectedGrade}
                                loading={false}
                                type="grd"
                                onSelect={(item) => {
                                    setSelectedGrade(item);
                                    setGrade(item.GrdCode);
                                }}
                                setSelected={(val) => {
                                    if (!val) setGrade("");
                                    else setGrade(val.GrdCode);
                                }}
                            />
                        </View>

                        <Text style={{ color: "#0F172A", fontWeight: "900", marginTop: 14, marginBottom: 7 }}>Checker <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <View style={{ minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", justifyContent: "center", overflow: "hidden" }}>
                            <PartyDropdown
                                data={getCheckerData}
                                placeholder="Choose checker..."
                                labelKey={["EmpName", "EmpCode"]}
                                valueKey="EmpCode"
                                pageSize={12}
                                initialValue={null}
                                selected={selectedChecker}
                                loading={false}
                                type="checker"
                                onSelect={(item) => {
                                    setSelectedChecker(item);
                                    setChecker(item.EmpCode);
                                }}
                                setSelected={(val) => {
                                    if (!val) setChecker("");
                                    else setChecker(val.EmpCode);
                                }}
                            />
                        </View>

                        <Text style={{ color: "#0F172A", fontWeight: "900", marginTop: 14, marginBottom: 7 }}>Shift <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <View style={{ minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", justifyContent: "center", overflow: "hidden" }}>
                            <Picker selectedValue={shift} onValueChange={setShift} dropdownIconColor="#475569">
                                <Picker.Item label="Select shift" value="" enabled={false} />
                                {getShiftData.map((item, i) => (
                                    <Picker.Item key={i} label={item.ShfName} value={item.ShfCode} />
                                ))}
                            </Picker>
                        </View>

                        <View
                            style={{
                                marginTop: 16,
                                padding: 12,
                                borderRadius: 16,
                                backgroundColor: "#F8FAFC",
                                borderWidth: 1,
                                borderColor: "#E2E8F0",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isMending ? "#DBEAFE" : "#E2E8F0", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                    <Icon name="build" size={19} color={isMending ? "#1D4ED8" : "#64748B"} />
                                </View>
                                <View>
                                    <Text style={{ color: "#0F172A", fontWeight: "900" }}>Mending Entry</Text>
                                    <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>{isMending ? "This taka requires mending" : "Normal checking entry"}</Text>
                                </View>
                            </View>
                            <Switch value={isMending} onValueChange={setIsMending} trackColor={{ false: "#CBD5E1", true: "#93C5FD" }} thumbColor={isMending ? "#0284C7" : "#FFFFFF"} />
                        </View>

                        <View style={{ marginTop: 18, flexDirection: "row", gap: 10 }}>
                            <TouchableOpacity
                                activeOpacity={0.88}
                                style={{ flex: 1, minHeight: 54, borderRadius: 16, borderWidth: 1.5, borderColor: "#0284C7", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center" }}
                                onPress={() => handleScannerList("S")}
                            >
                                <Icon name="format-list-bulleted" size={21} color="#0284C7" />
                                <Text style={{ color: "#0284C7", fontWeight: "900", marginLeft: 8 }}>Scanner List</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.88}
                                style={{ flex: 1, minHeight: 54, borderRadius: 16, backgroundColor: "#0284C7", flexDirection: "row", alignItems: "center", justifyContent: "center", shadowColor: "#0284C7", shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 }}
                                onPress={handleSubmitScan}
                            >
                                <Icon name="save" size={21} color="#FFFFFF" />
                                <Text style={{ color: "#FFFFFF", fontWeight: "900", marginLeft: 8 }}>Save Entry</Text>
                            </TouchableOpacity>
                        </View>

                        {getDataSaved && (
                            <View
                                style={{
                                    marginTop: 16,
                                    backgroundColor: "#F8FAFC",
                                    borderWidth: 1,
                                    borderColor: "#E2E8F0",
                                    borderRadius: 18,
                                    padding: 14,
                                }}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                                    <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                        <Icon name="print" size={22} color="#0369A1" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: "#0F172A", fontWeight: "900", fontSize: 15 }}>Sticker Printing</Text>
                                        <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>Select printer and print saved checking sticker</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setPendingPrintItem(null);
                                        if (getPrinters.length === 0) getAllPrinters();
                                        setPrinterModalVisible(true);
                                    }}
                                    style={{
                                        minHeight: 50,
                                        borderRadius: 14,
                                        borderWidth: 1,
                                        borderColor: printer ? "#93C5FD" : "#CBD5E1",
                                        backgroundColor: "#FFFFFF",
                                        paddingHorizontal: 12,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: printer ? "#0F172A" : "#94A3B8", fontWeight: "900" }}>{printer || "Select Printer"}</Text>
                                        <Text style={{ color: getPrinterStatusColor(selectedPrinterStatus), fontSize: 11, fontWeight: "900", marginTop: 3 }}>
                                            {selectedPrinterStatus || "Tap to choose printer"}
                                        </Text>
                                    </View>
                                    <Icon name="keyboard-arrow-down" size={24} color="#475569" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    onPress={printSticker}
                                    style={{
                                        marginTop: 10,
                                        minHeight: 50,
                                        borderRadius: 14,
                                        backgroundColor: printer ? "#16A34A" : "#94A3B8",
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Icon name="local-printshop" size={20} color="#FFFFFF" />
                                    <Text style={{ color: "#FFFFFF", fontWeight: "900", marginLeft: 8 }}>Print Sticker</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {showManual && (
                    <>
                        <View
                            style={{
                                backgroundColor: "#FFFFFF",
                                borderRadius: 24,
                                padding: 16,
                                borderWidth: 1,
                                borderColor: "#E2E8F0",
                                shadowColor: "#0F172A",
                                shadowOpacity: 0.08,
                                shadowRadius: 14,
                                shadowOffset: { width: 0, height: 5 },
                                elevation: 4,
                            }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                    <Icon name="inventory-2" size={20} color="#0369A1" />
                                </View>
                                <Text style={{ color: "#075985", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>FABRIC INFO</Text>
                            </View>

                            {/* <Text style={{ color: "#0F172A", fontWeight: "900", marginBottom: 7 }}>Machine <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <View style={{ minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", justifyContent: "center", overflow: "hidden" }}>
                            <PartyDropdown
                                key={selectedMachine ? selectedMachine.MacCode : "empty"}
                                data={machinedata}
                                placeholder="Choose machine..."
                                labelKey={["MacName", "MacCode"]}
                                valueKey="MacCode"
                                pageSize={12}
                                selected={selectedMachine}
                                loading={false}
                                type="machine"
                                onSelect={(item) => {
                                    setFormState((prev) => ({
                                        ...prev,
                                        values: {
                                            ...prev.values,
                                            MacCode: item.MacCode,
                                            MacName: item.MacName,
                                        },
                                    }));
                                    setSelectedMachine(item);
                                }}
                            />
                        </View> */}

                            <Text
                                style={{
                                    color: "#0F172A",
                                    fontWeight: "900",
                                    marginTop: 14,
                                    marginBottom: 7,
                                }}
                            >
                                Beam No <Text style={{ color: "#DC2626" }}>*</Text>
                            </Text>

                            <View style={{ minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", justifyContent: "center", overflow: "hidden" }}>
                                <PartyDropdown
                                    data={manualBeamData}
                                    placeholder="Select Beam No"
                                    labelKey="BeamNo"
                                    valueKey="BeamNo"
                                    selected={selectedBeam}
                                    loading={false}
                                    type="beam"
                                    onSelect={(item) => {
                                        setSelectedBeam(item);

                                        setFormState((prev) => ({
                                            ...prev,
                                            values: {
                                                ...prev.values,
                                                AuthStatus: item.AuthStatus,
                                                MacCode: item.MacCode,
                                                MacName: item.MacName,
                                                PrpCode: item.PrpCode,
                                                BeamNo: item.BeamNo,
                                                BeamUId: item.BeamUId,
                                                TakaNo: item.TakaNo,
                                                DsnCode: item.DsnCode,
                                                isfirsttaka: item.isfirsttaka,
                                                islasttaka: item.islasttaka,
                                                bstatus: item.bstatus,
                                                IsAuth: item.IsAuth,
                                                islasttakatrack: item.islasttakatrack,
                                                OrderDsnCode: item.OrderDsnCode,
                                                OrderDsnName: item.OrderDsnName,
                                                OrderLastDate: item.OrderLastDate,
                                                OrderNo: item.OrderNo,
                                                OrderUId: item.OrderUId,
                                                PlanNo: item.PlanNo,
                                                PlanUId: item.PlanUId,
                                                QltWt: item.QltWt,
                                                Status: item.Status,
                                                WarpLen: item.WarpLen,
                                                UId: item.UId,
                                            },
                                        }));

                                        fetchDesignHelp(item);
                                    }}
                                />
                            </View>

                            <Text style={{ color: "#0F172A", fontWeight: "900", marginTop: 14, marginBottom: 7 }}>Taka No <Text style={{ color: "#DC2626" }}>*</Text></Text>
                            <TextInput
                                style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", paddingHorizontal: 12, color: "#0F172A", fontWeight: "800" }}
                                value={FormState.values.TakaNo}
                                onChangeText={(text) => handleChange("TakaNo", text)}
                                maxLength={20}
                                placeholder="Taka No"
                                placeholderTextColor="#94A3B8"
                            />

                            <Text style={{ color: "#0F172A", fontWeight: "900", marginTop: 14, marginBottom: 7 }}>Design <Text style={{ color: "#DC2626" }}>*</Text></Text>
                            <View style={{ minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", justifyContent: "center", overflow: "hidden" }}>
                                <PartyDropdown
                                    key={selecteddesign ? selecteddesign.dsncode : "empty"}
                                    data={getdesigndata}
                                    placeholder="Choose Design..."
                                    labelKey={["dsnname", "dsncode"]}
                                    valueKey="dsncode"
                                    pageSize={12}
                                    selected={selecteddesign}
                                    loading={false}
                                    type="checkingdesigndata"
                                    onSelect={(item) => {

                                        setselecteddesign(item);

                                        handleChange("DsnCode", item.dsncode);
                                        handleChange("DsnName", item.dsnname);

                                        manualDesignSelect(item);
                                    }}
                                />
                            </View>

                            <View style={{ height: 1, backgroundColor: "#E2E8F0", marginVertical: 18 }} />

                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                    <Icon name="settings" size={20} color="#059669" />
                                </View>
                                <Text style={{ color: "#047857", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>PRODUCTION DETAILS</Text>
                            </View>

                            <View style={{ flexDirection: "row", gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: "#0F172A", fontWeight: "900", marginBottom: 7 }}>Meter <Text style={{ color: "#DC2626" }}>*</Text></Text>
                                    <TextInput
                                        style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", paddingHorizontal: 12, color: "#0F172A", fontWeight: "800" }}
                                        value={meter}
                                        keyboardType="decimal-pad"
                                        onChangeText={handleManualMeterChange}
                                        placeholder="Meter"
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: "#0F172A", fontWeight: "900", marginBottom: 7 }}>Kgs <Text style={{ color: "#DC2626" }}>*</Text></Text>
                                    <TextInput
                                        style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", paddingHorizontal: 12, color: "#0F172A", fontWeight: "800" }}
                                        value={kgs}
                                        keyboardType="decimal-pad"
                                        onChangeText={handleManualKgsChange}
                                        placeholder="Kgs"
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>
                            </View>

                            <Text style={{ color: "#0F172A", fontWeight: "900", marginTop: 14, marginBottom: 7 }}>Avg. Wt</Text>
                            <TextInput
                                style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", paddingHorizontal: 12, color: "#0F172A", fontWeight: "900" }}
                                value={getavgWt}
                                editable={false}
                            />

                            <View style={{ height: 1, backgroundColor: "#E2E8F0", marginVertical: 18 }} />

                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                    <Icon name="verified" size={20} color="#B45309" />
                                </View>
                                <Text style={{ color: "#92400E", fontWeight: "900", fontSize: 15, letterSpacing: 0.2 }}>QUALITY DETAILS</Text>
                            </View>

                            <Text style={{ color: "#0F172A", fontWeight: "900", marginBottom: 7 }}>Grade <Text style={{ color: "#DC2626" }}>*</Text></Text>
                            <View style={{ minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", justifyContent: "center", overflow: "hidden" }}>
                                <PartyDropdown
                                    data={manualGradeData}
                                    placeholder="Choose grade..."
                                    labelKey={["GrdName", "GrdCode"]}
                                    valueKey="GrdCode"
                                    pageSize={12}
                                    initialValue={null}
                                    selected={selectedManualGrade}
                                    loading={false}
                                    type="grd"
                                    onSelect={(item) => {
                                        setSelectedManualGrade(item);
                                        setManualGrade(item.GrdCode);
                                        handleChange("GrdCode", item.GrdCode);
                                        handleChange("GrdName", item.GrdName);
                                    }}
                                    setSelected={(val) => {
                                        if (!val) setManualGrade("");
                                        else setManualGrade(val.GrdCode);
                                    }}
                                />
                            </View>

                            <Text style={{ color: "#0F172A", fontWeight: "900", marginTop: 14, marginBottom: 7 }}>Checker <Text style={{ color: "#DC2626" }}>*</Text></Text>
                            <View style={{ minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", justifyContent: "center", overflow: "hidden" }}>
                                <PartyDropdown
                                    data={manualCheckerData}
                                    placeholder="Choose checker..."
                                    labelKey={["EmpName", "EmpCode"]}
                                    valueKey="EmpCode"
                                    pageSize={12}
                                    initialValue={null}
                                    selected={selectedManualChecker}
                                    loading={false}
                                    type="checker"
                                    onSelect={async (item) => {
                                        setSelectedManualChecker(item);
                                        setManualChecker(item.EmpCode);
                                        handleChange("ChkCode", item.EmpCode);
                                        handleChange("ChkName", item.EmpName);
                                        // NEW
                                        await AsyncStorage.setItem(
                                            MANUAL_CHECKER_KEY,
                                            JSON.stringify(item)
                                        );
                                        console.log("MANUAL_CHECKER_KEY ==", MANUAL_CHECKER_KEY);
                                    }}
                                    setSelected={(val) => {
                                        if (!val) setManualChecker("");
                                        else setManualChecker(val.EmpCode);
                                    }}
                                />
                            </View>

                            <Text style={{ color: "#0F172A", fontWeight: "900", marginTop: 14, marginBottom: 7 }}>Shift <Text style={{ color: "#DC2626" }}>*</Text></Text>
                            <View style={{ minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", justifyContent: "center", overflow: "hidden" }}>
                                <Picker
                                    selectedValue={manualShift}
                                    onValueChange={(val) => {
                                        setManualShift(val);
                                        handleChange("ShfCode", val);
                                    }}
                                    dropdownIconColor="#000"
                                >
                                    <Picker.Item label="Select shift" value="" enabled={false} />
                                    {manualShiftData.map((item, i) => (
                                        <Picker.Item key={i} label={item.ShfName} value={item.ShfCode} />
                                    ))}
                                </Picker>
                            </View>

                            <View
                                style={{
                                    marginTop: 16,
                                    padding: 12,
                                    borderRadius: 16,
                                    backgroundColor: "#F8FAFC",
                                    borderWidth: 1,
                                    borderColor: "#E2E8F0",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isMending ? "#DBEAFE" : "#E2E8F0", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                        <Icon name="build" size={19} color={isMending ? "#1D4ED8" : "#64748B"} />
                                    </View>
                                    <View>
                                        <Text style={{ color: "#0F172A", fontWeight: "900" }}>Mending Entry</Text>
                                        <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>{isMending ? "This taka requires mending" : "Normal checking entry"}</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={isMending}
                                    onValueChange={(val) => {
                                        setIsMending(val);
                                        handleChange("ismending", val ? 1 : 0);
                                    }}
                                    trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                                    thumbColor={isMending ? "#0284C7" : "#FFFFFF"}
                                />
                            </View>

                            <View style={{ marginTop: 18, flexDirection: "row", gap: 10 }}>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={{ flex: 1, minHeight: 54, borderRadius: 16, backgroundColor: "#0284C7", flexDirection: "row", alignItems: "center", justifyContent: "center", shadowColor: "#0284C7", shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 }}
                                    onPress={handlesave}
                                >
                                    <Icon name="save" size={21} color="#FFFFFF" />
                                    <Text style={{ color: "#FFFFFF", fontWeight: "900", marginLeft: 8 }}>Save</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={{ flex: 1, minHeight: 54, borderRadius: 16, borderWidth: 1.5, borderColor: "#94A3B8", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center" }}
                                    onPress={handleClearForm}
                                >
                                    <Icon name="close" size={21} color="#475569" />
                                    <Text style={{ color: "#475569", fontWeight: "900", marginLeft: 8 }}>Clear</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={() => handleScannerList("M")}
                                activeOpacity={0.8}
                                style={{
                                    backgroundColor: "#0284C7",
                                    height: 48,
                                    borderRadius: 12,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    flexDirection: "row",
                                    marginBottom: 15,
                                    marginTop: 20,
                                }}
                            >
                                <Icon
                                    name="list-alt"
                                    size={22}
                                    color="#fff"
                                />
                                <Text
                                    style={{
                                        color: "#fff",
                                        fontWeight: "bold",
                                        marginLeft: 8,
                                    }}
                                >
                                    Scanner List
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </ScrollView>
            <Modal
                visible={printerModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setPrinterModalVisible(false);
                    setPendingPrintItem(null);
                    setPrinterSearch("");
                }}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(2, 6, 23, 0.58)",
                        justifyContent: "flex-end",
                    }}
                >
                    <View
                        style={{
                            backgroundColor: "#F8FAFC",
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            maxHeight: "86%",
                            paddingBottom: 14,
                            overflow: "hidden",
                        }}
                    >
                        <View
                            style={{
                                alignItems: "center",
                                paddingTop: 10,
                                paddingBottom: 4,
                            }}
                        >
                            <View
                                style={{
                                    width: 46,
                                    height: 5,
                                    borderRadius: 999,
                                    backgroundColor: "#CBD5E1",
                                }}
                            />
                        </View>

                        <View
                            style={{
                                paddingHorizontal: 18,
                                paddingTop: 10,
                                paddingBottom: 14,
                                borderBottomWidth: 1,
                                borderBottomColor: "#E2E8F0",
                                backgroundColor: "#FFFFFF",
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                    <View
                                        style={{
                                            width: 46,
                                            height: 46,
                                            borderRadius: 16,
                                            backgroundColor: "#E0F2FE",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginRight: 12,
                                        }}
                                    >
                                        <Icon name="local-printshop" size={24} color="#0369A1" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={{
                                                fontSize: 19,
                                                fontWeight: "900",
                                                color: "#0F172A",
                                                letterSpacing: 0.2,
                                            }}
                                        >
                                            {pendingPrintItem ? "Print Sticker" : "Select Printer"}
                                        </Text>
                                        <Text style={{ color: "#64748B", marginTop: 3, fontSize: 12 }}>
                                            {pendingPrintItem
                                                ? `Beam ${pendingPrintItem?.BeamNo || "-"} · Taka ${pendingPrintItem?.TakaNo || "-"}`
                                                : `${getPrinters.length} printer(s) available`}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={() => {
                                        setPrinterModalVisible(false);
                                        setPendingPrintItem(null);
                                        setPrinterSearch("");
                                    }}
                                    style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 19,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: "#F1F5F9",
                                    }}
                                >
                                    <Icon name="close" size={22} color="#0F172A" />
                                </TouchableOpacity>
                            </View>

                            {!!pendingPrintItem && (
                                <View
                                    style={{
                                        marginTop: 14,
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: "#E2E8F0",
                                        backgroundColor: "#F8FAFC",
                                        padding: 12,
                                    }}
                                >
                                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                                        <View
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 12,
                                                backgroundColor: "#DBEAFE",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginRight: 10,
                                            }}
                                        >
                                            <Icon name="qr-code-2" size={20} color="#1D4ED8" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: "#0F172A", fontWeight: "900", fontSize: 13 }}>
                                                {pendingPrintItem?.DsnName || pendingPrintItem?.OrdDsnName || "Checking Sticker"}
                                            </Text>
                                            <Text style={{ color: "#64748B", marginTop: 2, fontSize: 12 }}>
                                                Grade {pendingPrintItem?.GrdName || pendingPrintItem?.GrdCode || "-"} · Qty {pendingPrintItem?.Qty || "-"}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            <View
                                style={{
                                    marginTop: 14,
                                    height: 46,
                                    borderRadius: 14,
                                    backgroundColor: "#F1F5F9",
                                    borderWidth: 1,
                                    borderColor: "#E2E8F0",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    paddingHorizontal: 12,
                                }}
                            >
                                <Icon name="search" size={21} color="#64748B" />
                                <TextInput
                                    value={printerSearch}
                                    onChangeText={setPrinterSearch}
                                    placeholder="Search printer by name or status..."
                                    placeholderTextColor="#94A3B8"
                                    style={{
                                        flex: 1,
                                        color: "#0F172A",
                                        fontSize: 14,
                                        paddingHorizontal: 10,
                                        paddingVertical: 0,
                                    }}
                                />
                                {!!printerSearch && (
                                    <TouchableOpacity onPress={() => setPrinterSearch("")}>
                                        <Icon name="cancel" size={20} color="#94A3B8" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {printerLoading ? (
                            <View style={{ paddingVertical: 42, alignItems: "center" }}>
                                <ActivityIndicator size="large" color="#0369A1" />
                                <Text style={{ marginTop: 12, color: "#64748B", fontWeight: "700" }}>
                                    Loading printers...
                                </Text>
                            </View>
                        ) : getPrinters.length === 0 ? (
                            <View style={{ padding: 24, alignItems: "center" }}>
                                <View
                                    style={{
                                        width: 70,
                                        height: 70,
                                        borderRadius: 22,
                                        backgroundColor: "#E2E8F0",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Icon name="print-disabled" size={38} color="#64748B" />
                                </View>
                                <Text
                                    style={{
                                        color: "#0F172A",
                                        fontWeight: "900",
                                        marginTop: 14,
                                        fontSize: 16,
                                    }}
                                >
                                    No printers found
                                </Text>
                                <Text
                                    style={{
                                        color: "#64748B",
                                        textAlign: "center",
                                        marginTop: 6,
                                        lineHeight: 18,
                                    }}
                                >
                                    Make sure Laravel print bridge and Node print service are running.
                                </Text>
                                {!!printerError && (
                                    <Text
                                        style={{
                                            color: "#DC2626",
                                            textAlign: "center",
                                            marginTop: 10,
                                            fontSize: 12,
                                        }}
                                    >
                                        {printerError}
                                    </Text>
                                )}
                                <TouchableOpacity
                                    onPress={getAllPrinters}
                                    style={{
                                        marginTop: 16,
                                        backgroundColor: "#0369A1",
                                        paddingHorizontal: 20,
                                        paddingVertical: 11,
                                        borderRadius: 12,
                                        flexDirection: "row",
                                        alignItems: "center",
                                    }}
                                >
                                    <Icon name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>
                                        Retry
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : filteredPrinters.length === 0 ? (
                            <View style={{ padding: 24, alignItems: "center" }}>
                                <Icon name="search-off" size={42} color="#94A3B8" />
                                <Text style={{ color: "#0F172A", fontWeight: "900", marginTop: 10 }}>
                                    No matching printer
                                </Text>
                                <Text style={{ color: "#64748B", textAlign: "center", marginTop: 4 }}>
                                    Try a different printer name.
                                </Text>
                            </View>
                        ) : (
                            <>
                                <FlatList
                                    data={filteredPrinters}
                                    keyExtractor={(item, index) => `${item.Name}-${index}`}
                                    contentContainerStyle={{
                                        padding: 14,
                                        paddingBottom: pendingPrintItem ? 96 : 22,
                                    }}
                                    keyboardShouldPersistTaps="handled"
                                    renderItem={({ item }) => {
                                        const active = item.Name === printer;
                                        const status = item.StatusText || "Idle";
                                        const online = !status || status === "Idle" || status === "Online";
                                        return (
                                            <TouchableOpacity
                                                activeOpacity={0.88}
                                                onPress={() => selectPrinter(item)}
                                                style={{
                                                    padding: 14,
                                                    borderRadius: 18,
                                                    marginBottom: 10,
                                                    borderWidth: 1.2,
                                                    borderColor: active ? "#0284C7" : "#E2E8F0",
                                                    backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    shadowColor: "#0F172A",
                                                    shadowOpacity: active ? 0.12 : 0.05,
                                                    shadowRadius: 8,
                                                    shadowOffset: { width: 0, height: 3 },
                                                    elevation: active ? 3 : 1,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 46,
                                                        height: 46,
                                                        borderRadius: 16,
                                                        backgroundColor: active ? "#BAE6FD" : "#F1F5F9",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        marginRight: 12,
                                                    }}
                                                >
                                                    <Icon
                                                        name={active ? "check-circle" : "print"}
                                                        size={24}
                                                        color={active ? "#0369A1" : "#64748B"}
                                                    />
                                                </View>

                                                <View style={{ flex: 1 }}>
                                                    <Text
                                                        numberOfLines={1}
                                                        style={{
                                                            color: "#0F172A",
                                                            fontWeight: "900",
                                                            fontSize: 14,
                                                        }}
                                                    >
                                                        {item.Name}
                                                    </Text>
                                                    <View
                                                        style={{
                                                            alignSelf: "flex-start",
                                                            marginTop: 6,
                                                            borderRadius: 999,
                                                            paddingHorizontal: 9,
                                                            paddingVertical: 3,
                                                            backgroundColor: online ? "#DCFCE7" : "#FEE2E2",
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                        }}
                                                    >
                                                        <View
                                                            style={{
                                                                width: 7,
                                                                height: 7,
                                                                borderRadius: 4,
                                                                backgroundColor: online ? "#16A34A" : "#DC2626",
                                                                marginRight: 6,
                                                            }}
                                                        />
                                                        <Text
                                                            style={{
                                                                color: online ? "#166534" : "#991B1B",
                                                                fontSize: 11,
                                                                fontWeight: "900",
                                                            }}
                                                        >
                                                            {status === "Idle" ? "ONLINE" : String(status).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Icon
                                                    name={active ? "radio-button-checked" : "radio-button-unchecked"}
                                                    size={22}
                                                    color={active ? "#0284C7" : "#CBD5E1"}
                                                />
                                            </TouchableOpacity>
                                        );
                                    }}
                                />

                                {!!pendingPrintItem && (
                                    <View
                                        style={{
                                            position: "absolute",
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            padding: 14,
                                            backgroundColor: "#FFFFFF",
                                            borderTopWidth: 1,
                                            borderTopColor: "#E2E8F0",
                                        }}
                                    >
                                        <TouchableOpacity
                                            disabled={!printer || printerLoading || isLoading}
                                            onPress={() => printStickerForData(pendingPrintItem)}
                                            style={{
                                                minHeight: 52,
                                                borderRadius: 16,
                                                backgroundColor: printer ? "#0369A1" : "#94A3B8",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                shadowColor: "#0369A1",
                                                shadowOpacity: printer ? 0.25 : 0,
                                                shadowRadius: 10,
                                                shadowOffset: { width: 0, height: 4 },
                                                elevation: printer ? 4 : 0,
                                            }}
                                        >
                                            <Icon
                                                name="local-printshop"
                                                size={21}
                                                color="#FFFFFF"
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text
                                                style={{
                                                    color: "#FFFFFF",
                                                    fontWeight: "900",
                                                    fontSize: 15,
                                                }}
                                            >
                                                {printer ? `Print on ${printer}` : "Select printer to print"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal
                visible={scannerModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setScannerModal(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "#fff",
                    }}
                >
                    <View style={checkingScannerStyles.headerContainer}>
                        <View>
                            <Text
                                style={{
                                    fontSize: 24,
                                    fontWeight: "900",
                                    color: "#111",
                                }}
                            >
                                Scanner List
                            </Text>

                            <Text
                                style={{
                                    color: "#777",
                                    marginTop: 3,
                                }}
                            >
                                {scannerCardData.length} items
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={checkingScannerStyles.closeButton}
                            onPress={() => setScannerModal(false)}
                        >
                            <Icon name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <View style={checkingScannerStyles.searchContainer}>
                        <Icon name="search" size={22} color="#777" />

                        <TextInput
                            placeholder="Search scanner data..."
                            placeholderTextColor="#999"
                            value={searchText}
                            onChangeText={setSearchText}
                            style={{
                                flex: 1,
                                marginLeft: 10,
                                color: "#000",
                            }}
                        />
                    </View>

                    {scannerLoading ? (
                        <View
                            style={{
                                flex: 1,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <ActivityIndicator size="large" color="#007EA7" />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredData}
                            keyExtractor={(item, index) => index.toString()}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                padding: 16,
                                paddingBottom: 40,
                            }}
                            onEndReached={loadMoreData}
                            onEndReachedThreshold={0.5}
                            initialNumToRender={10}
                            maxToRenderPerBatch={10}
                            windowSize={10}
                            removeClippedSubviews={true}
                            ListFooterComponent={() =>
                                footerLoading ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#007EA7"
                                        style={{
                                            marginVertical: 20,
                                        }}
                                    />
                                ) : null
                            }
                            renderItem={({ item, index }) => (
                                <View style={checkingScannerStyles.billCard}>
                                    <View style={checkingScannerStyles.leftBorder} />
                                    <View style={checkingScannerStyles.iconContainer}>
                                        <Icon name="qr-code-scanner" size={24} color="#007EA7" />
                                    </View>
                                    <View
                                        style={{
                                            flex: 1,
                                            marginLeft: 14,
                                        }}
                                    >
                                        <Text numberOfLines={1} style={checkingScannerStyles.title}>
                                            {item.DsnName}
                                        </Text>

                                        <Text style={checkingScannerStyles.subText}>
                                            Beam No : {item.BeamNo}
                                        </Text>

                                        <Text style={checkingScannerStyles.subText}>
                                            Taka : {item.TakaNo}
                                        </Text>

                                        <Text style={checkingScannerStyles.subText}>
                                            Design : {item.OrdDsnName || item.DsnName}
                                        </Text>

                                        <Text style={checkingScannerStyles.subText}>
                                            Weight : {item.Wt}
                                        </Text>

                                        <Text style={checkingScannerStyles.subText}>
                                            Avg Weight : {item.AvgWt}
                                        </Text>

                                        <Text style={checkingScannerStyles.subText}>
                                            Grade : {item.GrdName}
                                        </Text>

                                        <Text style={checkingScannerStyles.subText}>
                                            Linked Order No : {item.LinkedOrderNo}
                                        </Text>

                                        <View
                                            style={{
                                                marginTop: 8,
                                                alignSelf: "flex-start",
                                                backgroundColor: "#E8F5E9",
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                                borderRadius: 20,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: "#2E7D32",
                                                    fontWeight: "700",
                                                    fontSize: 11,
                                                }}
                                            >
                                                Scanned
                                            </Text>
                                        </View>
                                    </View>

                                    <View
                                        style={{
                                            alignItems: "flex-end",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <TouchableOpacity
                                            style={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: 19,
                                                backgroundColor: "#0369A1",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginBottom: 8,
                                            }}
                                            onPress={() => openPrinterForScannerRow(item)}
                                        >
                                            <Icon name="local-printshop" size={20} color="#fff" />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            disabled={Number(item.islasttakatrack) === 1}
                                            style={[
                                                checkingScannerStyles.deleteButton,
                                                Number(item.islasttakatrack) === 1 && {
                                                    backgroundColor: "#BDBDBD",
                                                    opacity: 0.6,
                                                },
                                            ]}

                                            onPress={() => {
                                                console.log("DELETE CLICK =>", item);
                                                setSelectedDeleteItem(item);
                                                setShowDeleteAlert(true);
                                            }}
                                        >
                                            <Icon name="delete-outline" size={20} color="#fff" />
                                        </TouchableOpacity>

                                        <Text style={checkingScannerStyles.qty}>{item.Qty}</Text>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            </Modal>

            {showDeleteAlert && (
                <Modal
                    transparent={true}
                    animationType="fade"
                    visible={showDeleteAlert}
                    onRequestClose={() => setShowDeleteAlert(false)}
                >
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: "rgba(0,0,0,0.45)",
                            justifyContent: "center",
                            alignItems: "center",
                            paddingHorizontal: 25,
                        }}
                    >
                        <View
                            style={{
                                width: "100%",
                                backgroundColor: "#fff",
                                borderRadius: 18,
                                padding: 20,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 20,
                                    fontWeight: "800",
                                    color: "#111",
                                    textAlign: "center",
                                }}
                            >
                                Delete Record
                            </Text>

                            <Text
                                style={{
                                    marginTop: 14,
                                    fontSize: 15,
                                    color: "#666",
                                    textAlign: "center",
                                    lineHeight: 22,
                                }}
                            >
                                Are you sure you want to delete this scanner record?
                            </Text>

                            <View
                                style={{
                                    flexDirection: "row",
                                    marginTop: 24,
                                }}
                            >
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: "#EAEAEA",
                                        paddingVertical: 13,
                                        borderRadius: 12,
                                        marginRight: 8,
                                        alignItems: "center",
                                    }}
                                    onPress={() => setShowDeleteAlert(false)}
                                >
                                    <Text
                                        style={{
                                            color: "#333",
                                            fontWeight: "700",
                                            fontSize: 15,
                                        }}
                                    >
                                        Cancel
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: "#E53935",
                                        paddingVertical: 13,
                                        borderRadius: 12,
                                        marginLeft: 8,
                                        alignItems: "center",
                                    }}
                                    onPress={() => {
                                        console.log("CONFIRM DELETE CLICK");

                                        handledelete();
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#fff",
                                            fontWeight: "700",
                                            fontSize: 15,
                                        }}
                                    >
                                        Yes, Delete
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {isDeleteLoading && (
                <Modal transparent={true} animationType="fade">
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: "rgba(0,0,0,0.35)",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <View
                            style={{
                                backgroundColor: "#fff",
                                paddingVertical: 25,
                                paddingHorizontal: 30,
                                borderRadius: 18,
                                alignItems: "center",
                            }}
                        >
                            <ActivityIndicator size="large" color="#007EA7" />

                            <Text
                                style={{
                                    marginTop: 14,
                                    fontSize: 15,
                                    fontWeight: "700",
                                    color: "#333",
                                }}
                            >
                                Deleting record...
                            </Text>
                        </View>
                    </View>
                </Modal>
            )}
        </>
    );
};
export default CheckingScanner;