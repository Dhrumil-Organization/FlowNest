import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Animated,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput as RNTextInput,
    FlatList
} from 'react-native';
import { getMonthNumber } from 'utils/comman';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../android/app/src/theme';
import SearchableDropdown from '../Shared/SearchableDropdown';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import Snackbar from 'react-native-snackbar';
import FullScreenLoader from '../Loader/Loader';
import { values } from 'lodash';
import DateTimePicker from '@react-native-community/datetimepicker';
import PartyDropdown from '../Shared/PartyDropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from 'react-native/Libraries/NewAppScreen';


const CartonAddDrawer = (props) => {
    const { beamdetailvisible, onClose, setIsLoading, isLoading, token, selectedYear, FormState, setFormState, fatchAllBeamDetailData } = props;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [machinedata, setMachineData] = useState([]);
    const [selectedMachine, setSelectedMachine] = useState([]);
    const [Beamdata, setBeamdata] = useState([]);
    const [Uid, setUID] = useState('');
    const [shiftdata, setshiftdata] = useState([]);
    const [operatordata, setoperatordata] = useState([]);
    const [supervisiordata, setsupervisiordata] = useState([]);
    const [employeedata, setemployeedata] = useState([]);
    const [selectedbeam, setSelectedbeam] = useState([]);
    const [selectedshift, setselectedshift] = useState([]);
    const [selectedoperator, setselectedoperator] = useState([]);
    const [selectedsupervisior, setselectedsupervisior] = useState([]);
    const [selectedemployee, setselectedemployee] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [timeField, setTimeField] = useState(null);
    const [visible, setVisible] = useState(false);
    const [beamVisible, setBeamVisible] = useState(false);
    const [getDataSaved, setDataSaved] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [dateType, setDateType] = useState(null);
    const [searchText, setSearchText] = useState("");
    // "vou" | "start" | "end"

    console.log("Uid", Uid);


    // const filteredMachines = machinedata
    //     .filter(item => {
    //         const text = searchText.toLowerCase();

    //         return (
    //             item.MacCode?.toLowerCase().includes(text) ||
    //             item.MacName?.toLowerCase().includes(text)
    //         );
    //     })

    const filteredMachines = machinedata
        .filter(item => {
            const text = searchText.toLowerCase();

            return (
                item.MacCode?.toLowerCase().includes(text) ||
                item.MacName?.toLowerCase().includes(text)
            );
        })
        .map(item => ({
            ...item,
            uniqueKey: `${item.MacCode}_${item.PrpCode}`  // 🔥 MUST
        }));

    let cancelToken: any;
    const getToken = () => {
        return token;
    };

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    const fetchmachine = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                yearno: FormState.values.YearNo,
                txntype: 'beam_gaiting_detail',
                fetch: 'add_gaiting_machine_help',
            };
            console.log("Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/prodbeamdetailbrowsesudo`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("Machine API Response:", response);
            const data = response?.data?.data || [];
            if (response?.data?.success && data.length > 0) {
                setMachineData(data);
                fetchbeam(selectedMachine);
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

    const fetchbeam = async (machine) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            const historyPayload = {
                prptype: userPtype,
                yearno: FormState.values.YearNo,
                txntype: 'beam_gaiting_detail',
            };
            // console.log("Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/get_gaiting_beamno`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("Beam API Response:", response);
            const data = response?.data?.response?.data || [];
            if (response?.data?.success && data.length > 0) {
                setBeamdata(data);
                await Promise.all([
                    fetchshift(machine).catch(e => console.log('shift error', e)),
                    fetchoperator(machine).catch(e => console.log('operator error', e)),
                    fetchsupervisior(machine).catch(e => console.log('supervisor error', e)),
                    fetchemployee(machine).catch(e => console.log('employee error', e)),
                ]);
                // await checkvoucher(values);
            } else {
                setBeamdata([]);
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

    // const Soshow = async (values) => {
    //     try {
    //         setIsLoading(true);
    //         const historyPayload = {
    //             MacCode: FormState.values.MacCode,
    //             MacName: FormState.values.MacName,
    //             UBeamNo: values.UBeamNo,
    //             WarpLen: values.WarpLen,
    //             BeamNo: values.BeamNo,
    //             BeamUId: values.BeamUId,
    //             prpcode: FormState.values.PrpCode,
    //             prptype: 'S',
    //             yearno: FormState.values.YearNo,
    //             uid: '0',
    //             action: 'add',
    //             txntype: 'beam_detail_sudo'
    //         };
    //         console.log("show Payload:", historyPayload);
    //         const response = await axios.get(
    //             `${API}/api/show_beam_gaiting_detail`,
    //             getRequestConfig({
    //                 params: { ...historyPayload },
    //                 // cancelToken: cancelToken.token
    //             })
    //         );
    //         console.log("Show API Response:", response);
    //         const data = response.data.data.main[0] ;
    //         const showUID = response.data.data.main[0].UId;
    //         if (response?.data?.success && data.length > 0) {
    //             setUID(showUID);
    //         } else {
    //             setUID([]);
    //         }
    //     } catch (error) {
    //         if (axios.isCancel(error)) {
    //             console.log("Request cancelled:", error.message);
    //         } else {
    //             console.log("API getshifts error:", error);
    //         }
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };


    const Soshow = async (values) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);

            const historyPayload = {
                MacCode: FormState.values.MacCode,
                MacName: FormState.values.MacName,
                UBeamNo: values.UBeamNo,
                WarpLen: values.WarpLen,
                BeamNo: values.BeamNo,
                BeamUId: values.BeamUId,
                prpcode: FormState.values.PrpCode,
                prptype: userPtype,
                yearno: FormState.values.YearNo,
                uid: '0',
                action: 'add',
                txntype: 'beam_detail_sudo'
            };

            const response = await axios.get(
                `${API}/api/show_beam_gaiting_detail`,
                getRequestConfig({
                    params: { ...historyPayload }
                })
            );
            console.log("showshow response", response);

            const mainData = response?.data?.data?.main?.[0] || {};
            const showUID = mainData?.UId;

            console.log("UID from API:", showUID);

            if (response?.data?.success && showUID) {
                setUID(showUID);  // UI ke liye ok
            }

            // 🔥 IMPORTANT: yaha se return karo
            return showUID || '0';

        } catch (error) {
            console.log("API error:", error);
            return '0';
        } finally {
            setIsLoading(false);
        }
    };
    const fetchshift = async (machine) => {
        try {
            setIsLoading(true);

            const historyPayload = {
                yearno: FormState.values.YearNo,
                txntype: 'beam_gaiting_detail',
                fetch: 'shift',
                prpcode: machine?.PrpCode || FormState.values.prpcode
            };
            console.log("Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("shift API Response:", response);
            const data = response?.data?.response?.data || [];
            if (response?.data?.success && data.length > 0) {
                setshiftdata(data);
            } else {
                setshiftdata([]);
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

    const fetchemployee = async (machine) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            const historyPayload = {
                prptype: userPtype,
                yearno: FormState.values.YearNo,
                txntype: 'beam_gaiting_detail',
                fetch: 'employee',
                prpcode: machine?.PrpCode,
                stcode: ''
            };
            console.log("Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("employee API Response:", response);
            const data = response?.data?.response?.data || [];
            if (response?.data?.success && data.length > 0) {
                setemployeedata(data);
            } else {
                setemployeedata([]);
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

    const fetchoperator = async (machine) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            const historyPayload = {
                prptype: userPtype,
                yearno: FormState.values.YearNo,
                txntype: 'beam_gaiting_detail',
                fetch: 'operator',
                prpcode: machine?.PrpCode,
                stcode: ''
            };
            console.log("Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("operator API Response:", response);
            const data = response?.data?.response?.data || [];
            if (response?.data?.success && data.length > 0) {
                setoperatordata(data);
            } else {
                setoperatordata([]);
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

    const fetchsupervisior = async (machine) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);

            const historyPayload = {
                prptype: userPtype,
                yearno: FormState.values.YearNo,
                txntype: 'beam_gaiting_detail',
                fetch: 'sprvsr',
                prpcode: machine?.PrpCode,
                stcode: ''
            };
            console.log("Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("supervisior API Response:", response);
            const data = response?.data?.response?.data || [];
            if (response?.data?.success && data.length > 0) {
                setsupervisiordata(data);
            } else {
                setsupervisiordata([]);
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

    // const checkvoucher = async () => {
    //     try {
    //         setIsLoading(true);

    //         if (cancelToken?.cancel) cancelToken.cancel();
    //         cancelToken = axios.CancelToken.source();
    //         const dateObj = new Date(FormState.values.VouDate);

    //         const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    //         const year = dateObj.getFullYear();

    //         const payload = {
    //             prpcode: FormState.values.PrpCode,
    //             yearno: FormState.values.YearNo,
    //             acccode: '',
    //             vouno: FormState.values.VouNo,
    //             suffix: FormState.values.Suffix,
    //             month: month,
    //             uid: 0,
    //             date: FormState.values.VouDate,
    //             module: 'GRYProcess',
    //             module_no_key: 'VouNo'
    //         };
    //         // console.log("Voucher Payload:", payload);
    //         const response = await axios.get(
    //             `${API}/api/checkvoucherno`,
    //             getRequestConfig({
    //                 params: { ...payload },
    //                 cancelToken: cancelToken.token
    //             })
    //         );

    //         console.log("Voucher API Response:", response);
    //         const res = response?.data?.response;
    //         if (res?.validate === 'true') {
    //             setFormState(prev => ({
    //                 ...prev,
    //                 values: {
    //                     ...prev.values,
    //                     VouNo: res.VouNo,
    //                     Suffix: res.suffix,
    //                     month: res.month
    //                 }
    //             }));
    //         } else if (res?.validate === 'false') {
    //             Alert.alert(
    //                 'Oops!!!',
    //                 res?.message || 'Something went wrong!'
    //             ).then(() => {
    //                 setFormState(prev => ({
    //                     ...prev,
    //                     values: {
    //                         ...prev.values,
    //                         VouNo: res.VouNo,
    //                         suffix: res.suffix,
    //                         month: res.month
    //                     }
    //                 }));
    //             });
    //         }

    //     } catch (error) {
    //         if (axios.isCancel(error)) {
    //             console.log("Request cancelled:", error.message);
    //         } else {
    //             console.log("Check voucher error:", error);
    //         }
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    const checkvoucher = async (values) => {
        try {
            setIsLoading(true);

            const dateObj = new Date(values.VouDate);
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');

            const payload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                acccode: '',
                vouno: values.VouNo,
                suffix: values.Suffix || '',   // ✅ ab sahi jaayega
                month: month,
                uid: values.uid || Uid,
                // uid: 0,
                date: formatDate(FormState.values.VouDate),
                module: 'GRYProcess',
                module_no_key: 'VouNo'
            };

            console.log("Voucher Payload:", payload);

            const response = await axios.get(
                `${API}/api/checkvoucherno`,
                getRequestConfig({
                    params: { ...payload }
                })
            );

            console.log("response", response);
            const res = response?.data?.response;

            if (res?.validate === 'true') {
                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        VouNo: res.VouNo,
                        Suffix: res.suffix,
                        month: res.month
                    }
                }));
            } else if (res?.validate === 'false') {
                Alert.alert(
                    'Oops!!!',
                    res?.message || 'Something went wrong!',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setFormState(prev => ({
                                    ...prev,
                                    values: {
                                        ...prev.values,
                                        VouNo: res.VouNo,
                                        Suffix: res.suffix,
                                        month: res.month
                                    }
                                }));
                            }
                        }
                    ]
                );
            }

        } catch (error) {
            console.log("Check voucher error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const showAlert = (message) => {
        return new Promise((resolve) => {
            Alert.alert(
                'Validation Error',
                message,
                [
                    {
                        text: 'OK',
                        onPress: () => resolve(true),
                    },
                ],
                { cancelable: false }
            );
        });
    };

    const validateForm = async () => {

        if (!FormState.values.MacCode) {
            await showAlert('Please select a valid machine');
            return false;
        }

        if (!FormState.values.BeamNo) {
            await showAlert('Please select Beam');
            return false;
        }

        // if (!FormState.values.BStDate) {
        //     await showAlert('Please Enter Gaiting Start Date');
        //     return false;
        // }

        // if (!FormState.values.BEndDate) {
        //     await showAlert('Please Enter Gaiting End Date');
        //     return false;
        // }

        if (FormState.values.BStDate && FormState.values.BEndDate) {
            const startDate = new Date(FormState.values.BStDate);
            const endDate = new Date(FormState.values.BEndDate);

            if (endDate < startDate) {
                await showAlert('End Date must be greater than or equal to Start Date');
                return false;
            }
        }

        if (!FormState.values.EmpCode) {
            await showAlert('Please select a Gaiting Person');
            return false;
        }

        if (!FormState.values.OprCode) {
            await showAlert('Please select an Operator');
            return false;
        }

        if (!FormState.values.SupCode) {
            await showAlert('Please select a Supervisor');
            return false;
        }

        return true;
    };

    const handlesave = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        const isValid = await validateForm();   // 👈 await जरूरी
        if (!isValid) return;

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            const payloadObj = {
                BStTime: formatTime(FormState.values.BStTime),
                VouDate: formatDate(FormState.values.VouDate),
                BEndTime: formatTime(FormState.values.BEndTime),
                MacCode: FormState.values.MacCode,
                MacName: FormState.values.MacName,
                UBeamNo: FormState.values.UBeamNo,
                BeamLength: FormState.values.BeamLength,
                BeamUId: FormState.values.BeamUId,
                PrpCodefromBeam: FormState.values.PrpCode,
                EmpCode: FormState.values.EmpCode,
                EmpName: FormState.values.EmpName,
                OprCode: FormState.values.OprCode,
                OprName: FormState.values.OprName,
                SupCode: FormState.values.SupCode,
                SupName: FormState.values.SupName,
                BeamNo: FormState.values.BeamNo,
                WarpLen: FormState.values.WarpLen,
                PrpCode: FormState.values.PrpCode,
                UId: Uid,
                VouNo: FormState.values.VouNo,
                PlanUId: null,
                PlanSrNo: null,
                BeamSrNo: null,
                BStDate: formatDate(FormState.values.BStDate),
                BEndDate: formatDate(FormState.values.BEndDate),
                BEmpCode: FormState.values.EmpCode,
                ShfCode: FormState.values.ShfCode,
                CutLen: null,
                Status: null,
                UsrCode: null,
                LastDate: null,
                LastTime: null,
                CAuthBy: null,
                CUsrCode: null,
                CLastDate: null,
                CLastTime: null,
                UUsrCode: null,
                ULastDate: null,
                ULastTime: null,
                ExTag: null,
                ImTag: null,
                SiteCode: null,
                USiteCode: null,
                IsAuth: null,
                AUsrCode: null,
                ALastDate: null,
                ALastTime: null,
                lycuidcnt: null,
                lytotcqty: null,
                lytotcwt: null,
                month: FormState.values.month,
                suffix: FormState.values.Suffix,
                yearno: FormState.values.YearNo,
                prptype: userPtype,
                strcode: '',
                txntype: "beam_gaiting_detail",
                BEmpName: FormState.values.EmpName

            };

            console.log("payload...........333", payloadObj);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const response = await axios.post(`${API}/api/add_beam_gaiting_detail`, payloadObj, { headers });
            console.log("response", response);

            if (response.data.success === true) {

                Alert.alert(
                    "Success",
                    "Data Saved Successfully ✅",
                    [
                        {
                            text: "OK",
                            onPress: async () => {
                                handleClearForm();        // clear
                                onClose();                // close modal
                                await fatchAllBeamDetailData(); // refresh list
                            }
                        }
                    ]
                );

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

    const handleClearForm = () => {
        setFormState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                VouDate: new Date().toISOString(),
                MacCode: "",
                MacName: "",
                UId: "",
                BeamNo: "",
                UBeamNo: "",
                BeamLength: "",
                BeamUId: "",
                WarpLen: "",
                PrpCode: "",
                EmpCode: "",
                EmpName: "",
                OprCode: "",
                OprName: "",
                SupCode: "",
                SupName: "",
                BStDate: "",
                BEndDate: "",
                BStTime: new Date().toISOString(),
                BEndTime: new Date().toISOString(),
                ShfCode: "",
                VouNo: "",
                Suffix: "",
                month: ""
            }
        }));
        setSelectedMachine(null);
        setSelectedbeam(null);
        setselectedshift(null);
        setselectedemployee(null);
        setselectedoperator(null);
        setselectedsupervisior(null);
    };

    // const formatDate = (date) => {
    //     if (!date) return "";
    //     const d = new Date(date);
    //     const day = String(d.getDate()).padStart(2, '0');
    //     const month = String(d.getMonth() + 1).padStart(2, '0');
    //     const year = d.getFullYear();
    //     return `${day}-${month}-${year}`;
    // };

    const formatDate = (date) => {
        let d;

        if (!date) {
            d = new Date(); // ✅ default = today
        } else {
            d = new Date(date);
            if (isNaN(d)) {
                d = new Date(); // ✅ invalid case fix
            }
        }

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}-${month}-${year}`;
    };

    const onChangeDate = (event, selectedDate) => {
        setDateType(null);
        if (event.type === "dismissed") return;
        if (selectedDate) {
            let field = "";
            if (dateType === "vou") field = "VouDate";
            if (dateType === "start") field = "BStDate";
            if (dateType === "end") field = "BEndDate";
            setFormState(prev => ({
                ...prev,
                values: {
                    ...prev.values,
                    [field]: selectedDate.toISOString()
                }
            }));
        }
    };

    const formatTime = (date) => {
        if (!date) return "";
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        return `${hours}:${minutes}`;;
    };

    const onChangeTime = (event, selectedTime, fieldName) => {
        setShowTimePicker(false);
        if (event.type === "dismissed") return;
        if (selectedTime) {
            setFormState(prev => ({
                ...prev,
                values: {
                    ...prev.values,
                    [fieldName]: selectedTime.toISOString()
                }
            }));
        }
    };


    const re = /^[0-9\b]+$/;

    useEffect(() => {
        if (beamdetailvisible && FormState.values.YearNo) {
            fetchmachine();
        }
    }, [beamdetailvisible]);


    return (
        <>
            <Modal
                visible={beamdetailvisible}
                transparent
                animationType="slide"
                onRequestClose={onClose}
            >
                <View style={castyles.modalOverlay}>
                    <Animated.View
                        style={[
                            castyles.drawerContainer,
                            { transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        {/* HEADER */}
                        <View style={castyles.header}>
                            <View>
                                <Text style={castyles.headerTitle}>Beam Gaiting</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    onClose();
                                    handleClearForm();
                                }}
                            >
                                <Icon name="close" size={24} color="#fff" />
                            </TouchableOpacity>

                        </View>

                        {/* FORM */}
                        <ScrollView
                            style={castyles.container}
                            contentContainerStyle={{ paddingBottom: 120 }}
                        >
                            <View style={castyles.field}>
                                <Text style={castyles.label}>
                                    Voucher Date <Text style={{ color: "red" }}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    style={castyles.input}
                                    onPress={() => setDateType("vou")}
                                >
                                    <Text style={{ color: FormState.values.VouDate ? "#000" : "#999" }}>
                                        {FormState.values.VouDate
                                            ? formatDate(FormState.values.VouDate)
                                            : "Select Date"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={castyles.field}>
                                <Text style={castyles.label}>
                                    Machine <Text style={{ color: "red" }}>*</Text>
                                </Text>
                                {/* <PartyDropdown
                                    data={filteredMachines}
                                    placeholder="Choose machine..."
                                    labelKey={["MacName", "MacCode"]}
                                    valueKey="MacCode"
                                    pageSize={12}
                                    initialValue={selectedMachine ?? null}
                                    selected={selectedMachine ?? null}
                                    type="machine1"
                                    // onSelect={(item) => {
                                    //     setSelectedMachine(item);
                                    //     setFormState(prev => ({
                                    //         ...prev,
                                    //         values: {
                                    //             ...prev.values,
                                    //             MacCode: item?.MacCode || "",
                                    //             MacName: item?.MacName || "",
                                    //             PrpCode: item?.PrpCode || "",
                                    //         }
                                    //     }));
                                    // }}
                                    multiple={false}
                                    onSelect={(item) => {
                                        setSelectedMachine(item);

                                        setFormState(prev => ({
                                            ...prev,
                                            values: {
                                                ...prev.values,
                                                MacCode: item?.MacCode || "",
                                                MacName: item?.MacName || "",
                                                PrpCode: item?.PrpCode || "",
                                            }
                                        }));
                                    }}
                                    setSelected={(val) => {
                                        if (!val) {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    MacCode: '',
                                                    MacName: '',
                                                    PrpCode: '',
                                                }
                                            }));
                                        } else {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    MacCode: val?.MacCode || "",
                                                    MacName: val?.MacName || "",
                                                    PrpCode: val?.PrpCode || "",
                                                }
                                            }));
                                        }
                                    }}
                                /> */}
                                <PartyDropdown
                                    data={filteredMachines}
                                    placeholder="Choose machine..."
                                    labelKey={["MacName", "MacCode"]}
                                    valueKey="uniqueKey"   // 🔥 FIX
                                    pageSize={12}
                                    initialValue={selectedMachine ?? null}
                                    selected={selectedMachine ?? null}
                                    type="machine1"
                                    multiple={false}
                                    onSelect={(item) => {
                                        setSelectedMachine(item);

                                        setFormState(prev => ({
                                            ...prev,
                                            values: {
                                                ...prev.values,
                                                MacCode: item?.MacCode || "",
                                                MacName: item?.MacName || "",
                                                PrpCode: item?.PrpCode || "",
                                            }
                                        }));
                                    }}
                                    setSelected={(val) => {
                                        if (!val) {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    MacCode: '',
                                                    MacName: '',
                                                    PrpCode: '',
                                                }
                                            }));
                                        } else {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    MacCode: val?.MacCode || "",
                                                    MacName: val?.MacName || "",
                                                    PrpCode: val?.PrpCode || "",
                                                }
                                            }));
                                        }
                                    }}
                                />
                            </View>
                            <View style={castyles.field}>
                                <Text style={castyles.label}>
                                    Beam <Text style={{ color: "red" }}>*</Text>
                                </Text>
                                <PartyDropdown
                                    data={Beamdata}
                                    placeholder="Choose beam..."
                                    labelKey={["BeamNo"]}
                                    valueKey="BeamNo"
                                    pageSize={12}
                                    initialValue={selectedbeam ?? null}
                                    selected={selectedbeam ?? null}
                                    type="beam"
                                    // onSelect={(item) => {
                                    //     setSelectedbeam(item);
                                    //     setFormState(prev => ({
                                    //         ...prev,
                                    //         values: {
                                    //             ...prev.values,
                                    //             BeamNo: item?.BeamNo || "",
                                    //             UBeamNo: item?.UBeamNo || "",
                                    //             WarpLen: item?.WarpLen || "",
                                    //             BeamLength: item?.WarpLen || "",
                                    //             PrpCode: item?.PrpCode || "",
                                    //             BeamUId: item?.BeamUId || "",
                                    //         }
                                    //     }));
                                    // }}
                                    // onSelect={(item) => {
                                    //     setSelectedbeam(item);
                                    //     const updatedValues = {
                                    //         ...FormState.values,
                                    //         BeamNo: item?.BeamNo || "",
                                    //         UBeamNo: item?.UBeamNo || "",
                                    //         WarpLen: item?.WarpLen || "",
                                    //         BeamLength: item?.WarpLen || "",
                                    //         PrpCode: item?.PrpCode || "",
                                    //         BeamUId: item?.BeamUId || "",
                                    //     };
                                    //     setFormState(prev => ({
                                    //         ...prev,
                                    //         values: updatedValues
                                    //     }));

                                    //     Soshow({
                                    //         ...FormState.values,
                                    //         ...updatedValues
                                    //     });
                                    //     checkvoucher(updatedValues);
                                    // }}
                                    onSelect={async (item) => {
                                        setSelectedbeam(item);

                                        const updatedValues = {
                                            ...FormState.values,
                                            BeamNo: item?.BeamNo || "",
                                            UBeamNo: item?.UBeamNo || "",
                                            WarpLen: item?.WarpLen || "",
                                            BeamLength: item?.WarpLen || "",
                                            PrpCode: item?.PrpCode || "",
                                            BeamUId: item?.BeamUId || "",
                                        };
                                        setFormState(prev => ({
                                            ...prev,
                                            values: updatedValues
                                        }));
                                        const uidFromShow = await Soshow(updatedValues);
                                        setUID(uidFromShow);
                                        await checkvoucher({
                                            ...updatedValues,
                                            uid: uidFromShow
                                        });
                                    }}
                                    setSelected={(val) => {
                                        if (!val) {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    BeamNo: "",
                                                    UBeamNo: "",
                                                    WarpLen: "",
                                                    BeamLength: "",
                                                    PrpCode: "",
                                                    BeamUId: "",
                                                }
                                            }));
                                        } else {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    BeamNo: val?.BeamNo || "",
                                                    UBeamNo: val?.UBeamNo || "",
                                                    WarpLen: val?.WarpLen || "",
                                                    BeamLength: val?.WarpLen || "",
                                                    PrpCode: val?.PrpCode || "",
                                                    BeamUId: val?.BeamUId || "",
                                                }
                                            }));
                                        }
                                    }}
                                />
                            </View>
                            <View style={castyles.row}>
                                <View style={castyles.inputHalf}>
                                    <Text style={castyles.label}>
                                        Unique Beam <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <RNTextInput
                                        style={castyles.input}
                                        value={FormState.values.UBeamNo || ""}
                                        placeholder="Unique No"
                                        editable={false}
                                    />
                                </View>

                                <View style={castyles.inputHalf}>
                                    <Text style={castyles.label}>
                                        Beam Length <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <RNTextInput
                                        style={castyles.input}
                                        value={FormState.values.WarpLen || ""}
                                        placeholder="Beam Length"
                                        editable={false}
                                    />
                                </View>
                            </View>
                            <View style={{ marginBottom: 10 }}>
                                <Text style={castyles.label}>
                                    Voucher No <Text style={{ color: 'red' }}>*</Text>
                                </Text>

                                <View style={castyles.row3}>

                                    <RNTextInput
                                        style={[castyles.input3, { color: '#000' }]}
                                        value={FormState.values.month || ""}
                                        placeholder="Month"
                                        editable={false}
                                    />

                                    <RNTextInput
                                        style={[castyles.input3, { color: '#000' }]}
                                        value={FormState.values.VouNo || ""}
                                        placeholder="Vou No"
                                        onChangeText={(text) => {
                                            if (text === "" || re.test(text)) {
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        VouNo: text
                                                    }
                                                }));
                                            }
                                        }}
                                    />

                                    <RNTextInput
                                        style={[castyles.input3, { color: '#000' }]}
                                        value={FormState.values.Suffix || ""}
                                        placeholder="Suffix"
                                        onChangeText={(text) => {
                                            if (!FormState.values.VouDate) {
                                                Alert.alert("Please select Voucher Date first");
                                                return;
                                            }
                                            if (!FormState.values.VouNo) {
                                                Alert.alert("Please enter Voucher No");
                                                return;
                                            }

                                            const upperText = text.toUpperCase();

                                            const updatedValues = {
                                                ...FormState.values,
                                                Suffix: upperText
                                            };

                                            setFormState(prev => ({
                                                ...prev,
                                                values: updatedValues
                                            }));

                                            checkvoucher(updatedValues);
                                        }}
                                    />

                                </View>
                            </View>

                            <View style={castyles.row}>
                                <View style={castyles.inputHalf}>
                                    <Text style={castyles.label}>
                                        Gaiting Start date <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setDateType("start")}
                                        style={castyles.input}
                                    >
                                        <Text style={{ color: '#000' }}>
                                            <Text style={{ color: '#000' }}>
                                                {formatDate(FormState.values.BStDate)}
                                            </Text>
                                        </Text>
                                    </TouchableOpacity>
                                    {dateType && (
                                        <DateTimePicker
                                            value={
                                                dateType === "vou"
                                                    ? (FormState.values.VouDate ? new Date(FormState.values.VouDate) : new Date())
                                                    : dateType === "start"
                                                        ? (FormState.values.BStDate ? new Date(FormState.values.BStDate) : new Date())
                                                        : (FormState.values.BEndDate ? new Date(FormState.values.BEndDate) : new Date())
                                            }
                                            mode="date"
                                            display="default"
                                            onChange={onChangeDate}
                                        />
                                    )}
                                </View>

                                <View style={castyles.halfInput}>
                                    <Text style={castyles.label}>
                                        Start Time <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <TouchableOpacity
                                        // onPress={() => setShowTimePicker(true)}
                                        onPress={() => {
                                            setTimeField("BStTime");
                                            setShowTimePicker(true);
                                        }}
                                        style={castyles.editableValueBlack}
                                    >
                                        <Text style={{ color: '#000' }}>
                                            {new Date(FormState.values.BStTime).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </TouchableOpacity>

                                    {showTimePicker && (
                                        <DateTimePicker
                                            value={
                                                FormState.values[timeField]
                                                    ? new Date(FormState.values[timeField])
                                                    : new Date()
                                            }
                                            mode="time"
                                            is24Hour={true}
                                            display="spinner"
                                            onChange={(event, time) => onChangeTime(event, time, "BStTime")}

                                        />
                                    )}
                                </View>
                            </View>

                            <View style={castyles.row}>
                                <View style={castyles.inputHalf}>
                                    <Text style={castyles.label}>
                                        Gaiting End date <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setDateType("end")}
                                        style={castyles.input}
                                    >
                                        <Text style={{ color: '#000' }}>
                                            <Text style={{ color: '#000' }}>
                                                {formatDate(FormState.values.BEndDate)}
                                            </Text>
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={castyles.halfInput}>
                                    <Text style={castyles.label}>
                                        End Time <Text style={{ color: 'red' }}>*</Text>
                                    </Text>
                                    <TouchableOpacity
                                        // onPress={() => setShowTimePicker(true)}
                                        onPress={() => {
                                            setTimeField("BEndTime");
                                            setShowTimePicker(true);
                                        }}
                                        style={castyles.editableValueBlack}
                                    >
                                        <Text style={{ color: '#000' }}>
                                            {new Date(FormState.values.BEndTime).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </TouchableOpacity>

                                    {showTimePicker && (
                                        <DateTimePicker
                                            value={
                                                FormState.values[timeField]
                                                    ? new Date(FormState.values[timeField])
                                                    : new Date()
                                            }
                                            mode="time"
                                            is24Hour={true}
                                            display="spinner"
                                            onChange={(event, time) => onChangeTime(event, time, "BEndTime")}

                                        />
                                    )}
                                </View>
                            </View>
                            <View style={castyles.field}>
                                <Text style={castyles.label}>
                                    Shift <Text style={{ color: "red" }}>*</Text>
                                </Text>
                                <PartyDropdown
                                    data={shiftdata}
                                    placeholder="Choose shift..."
                                    labelKey={["ShfName", "ShfCode"]}
                                    valueKey="ShfCode"
                                    pageSize={12}
                                    initialValue={selectedshift ?? null}
                                    selected={selectedshift ?? null}
                                    // loading={Boolean(getMachineLoading)}

                                    type="shift"
                                    onSelect={(item) => {
                                        setselectedshift(item);
                                        setFormState(prev => ({
                                            ...prev,
                                            values: {
                                                ...prev.values,
                                                ShfCode: item?.ShfCode || "",
                                            }
                                        }));
                                    }}
                                    setSelected={(val) => {
                                        if (!val) {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    ShfCode: "",
                                                }
                                            }));
                                        } else {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    ShfCode: val?.ShfCode || "",
                                                }
                                            }));
                                        }
                                    }}
                                />
                            </View>
                            <View style={castyles.field}>
                                <Text style={castyles.label}>
                                    Gaiting Person <Text style={{ color: "red" }}>*</Text>
                                </Text>
                                <PartyDropdown
                                    data={employeedata}
                                    placeholder="Choose Gaiting Person..."
                                    labelKey={["EmpName", "EmpCode"]}
                                    valueKey="EmpCode"
                                    pageSize={12}
                                    initialValue={selectedemployee ?? null}
                                    selected={selectedemployee ?? null}
                                    // loading={Boolean(getMachineLoading)}

                                    type="employee"
                                    onSelect={(item) => {
                                        setselectedemployee(item);
                                        setFormState(prev => ({
                                            ...prev,
                                            values: {
                                                ...prev.values,
                                                EmpCode: item?.EmpCode || "",
                                                EmpName: item?.EmpName || "",
                                            }
                                        }));
                                    }}
                                    setSelected={(val) => {
                                        if (!val) {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    EmpCode: "",
                                                    EmpName: "",
                                                }
                                            }));
                                        } else {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    EmpCode: val?.EmpCode || "",
                                                    EmpName: val?.EmpName || "",
                                                }
                                            }));
                                        }
                                    }}
                                />
                            </View>

                            <View style={castyles.field}>
                                <Text style={castyles.label}>
                                    Operator <Text style={{ color: "red" }}>*</Text>
                                </Text>
                                <PartyDropdown
                                    data={operatordata}
                                    placeholder="Choose operator..."
                                    labelKey={["OprName", "OprCode"]}
                                    valueKey="OprCode"
                                    pageSize={12}
                                    initialValue={selectedoperator ?? null}
                                    selected={selectedoperator ?? null}
                                    type="operator"
                                    onSelect={(item) => {
                                        setselectedoperator(item);
                                        setFormState(prev => ({
                                            ...prev,
                                            values: {
                                                ...prev.values,
                                                OprCode: item?.OprCode || "",
                                                OprName: item?.OprName || "",
                                            }
                                        }));
                                    }}
                                    setSelected={(val) => {
                                        if (!val) {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    OprCode: "",
                                                    OprName: "",
                                                }
                                            }));
                                        } else {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    OprCode: val?.OprCode || "",
                                                    OprName: val?.OprName || "",
                                                }
                                            }));
                                        }
                                    }}
                                />
                            </View>

                            <View style={castyles.field}>
                                <Text style={castyles.label}>
                                    Supervisior <Text style={{ color: "red" }}>*</Text>
                                </Text>
                                <PartyDropdown
                                    data={supervisiordata}
                                    placeholder="Choose Supervisior..."
                                    labelKey={["SupName", "SupCode"]}
                                    valueKey="SupCode"
                                    pageSize={12}
                                    initialValue={selectedsupervisior ?? null}
                                    selected={selectedsupervisior ?? null}
                                    type="supervisior"
                                    onSelect={(item) => {
                                        setselectedsupervisior(item);
                                        setFormState(prev => ({
                                            ...prev,
                                            values: {
                                                ...prev.values,
                                                SupCode: item?.SupCode || "",
                                                SupName: item?.SupName || "",
                                            }
                                        }));
                                    }}
                                    setSelected={(val) => {
                                        if (!val) {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    SupCode: "",
                                                    SupName: "",
                                                }
                                            }));
                                        } else {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    SupCode: val?.SupCode || "",
                                                    SupName: val?.SupName || "",
                                                }
                                            }));
                                        }
                                    }}
                                />
                            </View>
                        </ScrollView>

                    </Animated.View>
                    <View style={castyles.bottomButtonContainer}>
                        <TouchableOpacity
                            style={castyles.cancelButton}
                            onPress={handleClearForm}
                            activeOpacity={0.85}>
                            <Icon name="delete-sweep" size={20} color="#fff" />
                            <Text style={castyles.bottomBtnText}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={castyles.loadButtonNew}
                            onPress={handlesave}
                            activeOpacity={0.85}>
                            {
                                isLoading ?
                                    (
                                        <ActivityIndicator size="small" color="#fff" />
                                    )
                                    :
                                    (
                                        <>
                                            <Icon name="send" size={20} color="#fff" />
                                            <Text style={castyles.bottomBtnText}>Submit</Text>
                                        </>
                                    )
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal transparent visible={showSuccess} animationType="fade">
                <View style={castyles.modalOverlay}>
                    <View style={castyles.modalBox}>

                        <Text style={castyles.successIcon}>✅</Text>

                        <Text style={castyles.modalTitle}>Success</Text>

                        <Text style={castyles.modalMessage}>
                            {successMessage}
                        </Text>

                        <TouchableOpacity
                            style={castyles.okButton}
                            onPress={() => {
                                setShowSuccess(false);

                                // 🔥 IMPORTANT
                                // setCartonSummary([]);   // list clear
                            }}
                        >
                            <Text style={castyles.okText}>OK</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>
        </>
    );
};

// const castyles = StyleSheet.create({
//     modalOverlay: {
//         flex: 1,
//         backgroundColor: 'rgba(0,0,0,0.5)',
//     },
//     drawerContainer: {
//         position: 'absolute',
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         borderTopLeftRadius: 0,
//         borderTopRightRadius: 0,
//         overflow: 'hidden',
//     },
//     // gradientBackground: {
//     //     flex: 1,
//     //     padding: 0,
//     // },

//     gradientBackground: {
//         flex: 1,
//         padding: 0,
//         backgroundColor: '#fff'   // ✅ ADD THIS
//     },
//     closeButton: {
//         alignSelf: 'flex-end',
//         padding: 10,
//     },
//     label: {
//         fontSize: 14,
//         marginBottom: 5,
//         color: '#000',
//     },
//     scrollableFormContainer: {
//         flex: 1,
//         padding: 10,
//     },
//     scrollableFormContent: {
//         paddingBottom: 80, // Extra space for the Load button
//     },
//     editableValueBlack: {
//         fontSize: 13,              // 🔽 thoda chhota
//         color: '#000',
//         borderWidth: 1,
//         borderColor: 'rgba(0, 0, 0, 0.15)',
//         borderRadius: 6,           // 🔽 thoda smooth
//         paddingVertical: 5,        // 🔽 reduce height
//         paddingHorizontal: 8,
//         backgroundColor: '#fff',
//         height: 36                 // ✅ fix height (important)
//     },
//     rowInputs: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         marginBottom: 10
//     },
//     halfInput: {
//         width: "48%"
//     },
//     bottomButtonContainer: {
//         position: "absolute",
//         bottom: 20,
//         left: 15,
//         right: 15,
//         flexDirection: "row",
//         justifyContent: "space-between"
//     },
//     cancelButton: {
//         flex: 1,
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "center",
//         backgroundColor: "#d9534f",
//         paddingVertical: 12,
//         borderRadius: 8,
//         marginRight: 10,
//         elevation: 3
//     },
//     loadButtonNew: {
//         flex: 1,
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "center",
//         backgroundColor: "#17b85a",
//         paddingVertical: 12,
//         borderRadius: 8,
//         elevation: 3
//     },
//     bottomBtnText: {
//         color: "#fff",
//         fontWeight: "600",
//         fontSize: 14,
//         marginLeft: 6
//     },
//     inputBox: {
//         borderWidth: 1,
//         borderColor: '#ccc',
//         paddingVertical: 6,        // 🔽 reduce
//         paddingHorizontal: 8,
//         borderRadius: 6,
//         backgroundColor: '#fff',
//         height: 36,                // ✅ same height
//         justifyContent: 'center'
//     },
//     modalMessage: {
//         fontSize: 16,
//         marginVertical: 10,
//         textAlign: 'center'
//     },
//     modalBox: {
//         width: 300,
//         backgroundColor: '#fff',
//         borderRadius: 12,
//         padding: 20,
//         alignItems: 'center',
//         elevation: 10
//     },

//     successIcon: {
//         fontSize: 50,
//         marginBottom: 10
//     },

//     modalTitle: {
//         fontSize: 20,
//         fontWeight: 'bold'
//     },
//     okButton: {
//         backgroundColor: '#2e7d32',
//         paddingHorizontal: 25,
//         paddingVertical: 10,
//         borderRadius: 6
//     },

//     okText: {
//         color: '#fff',
//         fontWeight: 'bold'
//     },
// });

const castyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end"
    },

    drawerContainer: {
        height: "100%",
        backgroundColor: "#fff",
        borderTopLeftRadius: 25,
        borderTopRightRadius: 0,
        overflow: "hidden"
    },

    header: {
        backgroundColor: "#0a7ea4",
        padding: 15,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
    },

    headerTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold"
    },

    headerSub: {
        color: "#d0ecf5",
        fontSize: 12
    },

    profileCircle: {
        width: 35,
        height: 35,
        borderRadius: 20,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center"
    },

    container: {
        padding: 15,
        backgroundColor: "#f4f6f8"
    },

    field: {
        marginBottom: 12
    },

    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 5,
        color: "#000"
    },

    input: {
        backgroundColor: "#f1f3f6",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        color: '#000'
    },

    row: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 12
    },

    btnRow: {
        flexDirection: "row",
        marginTop: 20
    },

    clearBtn: {
        flex: 1,
        backgroundColor: "#ff5c5c",
        padding: 15,
        borderRadius: 12,
        marginRight: 10,
        alignItems: "center"
    },

    submitBtn: {
        flex: 1,
        backgroundColor: "#0a7ea4",
        padding: 15,
        borderRadius: 12,
        alignItems: "center"
    },

    btnText: {
        color: "#fff",
        fontWeight: "bold"
    },
    inputHalf: {
        flex: 1, // 👈 equal width
    },
    row3: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8 // RN new version
    },

    input3: {
        flex: 1, // 👈 equal width for all 3
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#fff',
        color: '#0000'
    },
    halfInput: {
        width: "48%",
        marginBottom: 12,
    },
    editableValueBlack: {
        height: 45,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        justifyContent: "center",
        paddingHorizontal: 12,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    bottomButtonContainer: {
        position: "absolute",
        bottom: 20,
        left: 15,
        right: 15,
        flexDirection: "row",
        justifyContent: "space-between"
    },
    cancelButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#d9534f",
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 10,
        elevation: 3
    },
    bottomBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
        marginLeft: 6
    },
    loadButtonNew: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#17b85a",
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 3
    },
});

export default CartonAddDrawer;
