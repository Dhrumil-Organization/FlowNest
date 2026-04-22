import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Alert, TextInput as RNTextInput, Button, Modal, FlatList, ActivityIndicator, StyleSheet, Dimensions,
    Platform
} from 'react-native';
import theme from '../../android/app/src/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import FullScreenLoader from '../Loader/Loader';
import { yarnmanagementsystemstyle } from '../../common/Styles/Style';
import { API, PRINTSTICKER, PRINTERSLISTAPI } from '../../common/API/dynamicAPI';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import { ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomDrawer from './CustomDrawer';
import { ExeData, DesignData, ItemData, POTData, ItemStatus, CardPayload } from './Modal';
import PartyDropdown from '../Shared/PartyDropdown';
import LinearGradient from 'react-native-linear-gradient';
interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
}

type GridItem = {
    srNo: number;
    CartonNo: string;
    design: string;
};

const YarnManagementSystem: React.FC<Props> = ({ token, navigation, isConnected, username }) => {
    const { hasPermission, requestPermission } = useCameraPermission();
    const [isLoading, setIsLoading] = useState(false);
    const [getDataSaved, setDataSaved] = useState(false)
    const [setupDate, setSetupDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const [getAllPropertyData, setAllPropertyData] = useState([]);
    const today = new Date();
    const [FormState, setFormState] = useState({
        values: {
            prpcode: '',
            yarnstrcode: '',
            yearno: ''
        }
    });
    const [spunForm, setSpunForm] = useState({
        blend: '',
        count: '',
        ply: '',
        linkitmcode: '',
        denier: '',
        blend_id: '',
        count_id: '',
        ply_id: '',
        ItmCode: ''

    });

    const [filamentForm, setFilamentForm] = useState({
        blend: '',
        count: '',
        ply: '',
        linkitmcode: '',
        denier: '',
        blend_id: '',
        count_id: '',
        ply_id: '',
        ItmCode: '',
        type_id: '',
        type: '',
        lustre_id: '',
        lustre: '',
        other_id: '',
        name: ''

    });

    const [subitemform, setsubitemform] = useState({
        blend: '',
        count: '',
        ply: '',
        linkitmcode: '',
        denier: '',
        blend_id: '',
        count_id: '',
        ply_id: '',
        ItmCode: '',
        type_id: '',
        type: '',
        lustre_id: '',
        lustre: '',
        other_id: '',
        name: '',
        Per: '',
        mitmcode: '',
        WBlend: '',
        WYarnType: '',
        WNameCode: '',
        others: ''

    });
    const [mappedData, setMappedData] = useState([]);
    const [blendList, setBlendList] = useState([
        {
            id: '',
            name: '',
            per: ''
        }
    ]);
    const [getAllYearData, setAllYearData] = useState([]);
    const [activeTab, setActiveTab] = useState('Spun');
    const [showSpunCard, setShowSpunCard] = useState(false);
    const [showFilamentCard, setShowFilamentCard] = useState(false);
    const [blenddata, setblenddata] = useState([]);
    const [selectedblend, setselectedblend] = useState([]);
    const [selectedfilamentblend, setselectedfilamentblend] = useState([]);
    const [countdata, setcountdata] = useState([]);
    const [selectedcount, setselectedcount] = useState([]);
    const [selectedsubcount, setselectedsubcount] = useState([]);
    const [selectedfilamentcount, setselectedfilamentcount] = useState([]);
    const [plydata, setplydata] = useState([]);
    const [selectedply, setselectedply] = useState([]);
    const [selectedfilamentply, setselectedfilamentply] = useState([]);
    const [typedata, settypedata] = useState([]);
    const [selectedtype, setselectedtype] = useState([]);
    const [lustredata, setlustredata] = useState([]);
    const [selectedlustre, setselectedlustre] = useState([]);
    const [othersdata, setothersdata] = useState([]);
    const [selectedothers, setselectedothers] = useState([]);
    const [itemdata, setitemdata] = useState([]);
    const [selecteditem, setselecteditem] = useState([]);
    const [selectedsubitem, setselectedsubitem] = useState([]);
    const [mitemdata, setmitemdata] = useState([]);
    const [data, setdata] = useState([]);
    const [selectedmitem, setselectedmitem] = useState([]);
    const [selectedfilamentitem, setselectedfilamentitem] = useState([]);
    const [showSubItemCard, setShowSubItemCard] = useState(false);
    const [selectedsubply, setselectedsubply] = useState([]);

    const cancelToken = useRef(null);

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });


    const fetchPropertyGroup = async () => {
        try {
            const response = await axios.get(`${API}/api/get_criterion`, {
                params: {
                    fetch: 'prptype',
                    txntype: 'yarn_creation_item_master'
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // console.log("response", response);
            if (response.data?.success) {
                setAllPropertyData(response.data.response.data);
            }

        } catch (error) {
            console.error("Error fetching property group:", error);
        }
    };

    useEffect(() => {
        if (isDrawerVisible) {
            fetchPropertyGroup();
        }
    }, [isDrawerVisible]);

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    // useEffect(() => {
    //     requestPermission();
    // }, []);

    const soshow = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');

        try {
            setIsLoading(true);

            const source = axios.CancelToken.source(); // ✅ local token

            const historyPayload = {
                prptype: userPtype,
                return_json_data: "1"
            };

            // console.log("historyPayload:", historyPayload);

            const response = await axios.post(
                `${API}/api/getyarndefault`,
                historyPayload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    cancelToken: source.token
                }
            );

            // console.log("POST API Response:", response);

            const data = response?.data?.data?.main || {};

            if (response?.data?.success && data) {
                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        prpcode: data.prpcode || '',
                        yarnstrcode: data.yarnstrcode || '',
                        yearno: data.yearno || ''
                    }
                }));

            }

        }
        catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarndefault error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBlenddata = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);

            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }

            cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                prptype: userPtype,
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };

            console.log("historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarnblend`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("blend API Response:", response);

            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setblenddata(data);
            } else {
                setblenddata([]);
            }

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBlendcount = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);

            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }

            cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                prptype: userPtype,
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };

            // console.log("count historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarncount`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            // console.log("count API Response:", response);

            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setcountdata(data);
            } else {
                setcountdata([]);
            }

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBlendply = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };
            // console.log("ply historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarnply`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            // console.log("ply API Response:", response);

            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setplydata(data);
            } else {
                setplydata([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchtype = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);

            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }

            cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                prptype: userPtype,
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };

            // console.log("type historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarntype`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            // console.log("type API Response:", response);

            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                settypedata(data);
            } else {
                settypedata([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchlustre = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        // if (!FormState.values.PrpOf) return;
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };

            // console.log("lustre historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarnlustre`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            // console.log("lustre API Response:", response);

            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setlustredata(data);
            } else {
                setlustredata([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchmitem = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                strcode: FormState.values.yarnstrcode,
                yarntype: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };

            console.log("master historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/getyarnmasteritem`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("Master API Response:", response);

            const data = response?.data?.data?.data || [];
            const mapped = response?.data?.data?.mapped_data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setmitemdata(data);
                setMappedData(mapped);

                return mapped;
            } else {
                setmitemdata([]);
                setMappedData([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };


    const fetchOthresdata = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                category: activeTab == 'Spun' ? '1' : '2',
                txntype: 'yarn_creation_item_master',
            };
            // console.log("Others historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/yarnother`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            // console.log("Others API Response:", response);
            const data = response?.data?.data?.data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setothersdata(data);
            } else {
                setothersdata([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getothers error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchItemdata = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);

            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }

            cancelToken.current = axios.CancelToken.source();

            const historyPayload = {
                strcode: FormState.values.yarnstrcode,
                prptype: userPtype,
                prpcode: FormState.values.prpcode,
                // txntype: 'yarn_creation_item_master',
                yearno: "27"
            };

            // console.log("item:", historyPayload);

            const response = await axios.get(
                `${API}/api/getitem`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            // console.log("item API Response:", response);

            const data = response.data.response.data || [];
            if (response?.data?.success && response.data.response.data.length > 0) {
                setitemdata(data);
            } else {
                setitemdata([]);
            }

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (FormState.values.prpcode && FormState.values.yarnstrcode) {
            fetchBlenddata();
            fetchBlendcount();
            fetchBlendply();
            fetchtype();
            fetchlustre();
            fetchOthresdata();
            fetchItemdata();
        }
    }, [FormState.values.prpcode, FormState.values.yarnstrcode, activeTab]);

    const buildMainItem = (values) => {
        const { count, ply, blend } = values;

        if (!count || !ply || !blend) return '';

        return `${count}/${ply} ${blend}`;
    };

    const calculateDenier = (values) => {
        const count = parseFloat(values.count);
        const ply = parseFloat(values.ply);

        if (!count || !ply) return '';

        return ((5315 / (count / ply)) + 5).toFixed(2);
    };

    const filamentbuildMainItem = (values) => {
        const { count, ply, lustre, type, name } = values;

        if (!count || !ply || !lustre || !type || !name) return '';

        return `${count}/${ply} D ${lustre} ${type} ${name}`;
    };

    const calculatefilamentDenier = (values) => {
        const count = Number(values.count);
        const ply = Number(values.ply);
        if (!count || !ply) return '';
        return (count * ply + 5).toString();
    };


    // const buildSubItem = (values, blendList) => {
    //     const { count, ply, name } = values; 

    //     if (!count || !ply) return '';

    //     let blendPart = '';

    //     if (blendList?.length > 0) {
    //         blendPart = blendList
    //             .map(b => `${b.name}${b.per ? ` ${b.per}%` : ''}`)
    //             .join(' ');
    //     }

    //     return `${count}/${ply} ${blendPart} ${name || ''}`.trim();
    // };

    const buildSubItem = (values, blendList) => {
        const { count, ply, others } = values;

        if (!count || !ply) return '';

        const total = blendList.reduce(
            (sum, item) => sum + Number(item.per || 0),
            0
        );

        if (blendList.length > 0 && total !== 100) {
            return '';  // 🔥 yaha control
        }

        // 🔥 Blend part
        let blendPart = '';

        if (blendList?.length > 0) {
            blendPart = blendList
                .map(b => `${b.name}${b.per ? ` ${b.per}%` : ''}`)
                .join(' ');
        }

        return `${count}/${ply} ${blendPart} ${others || ''}`.trim();
    };


    const calculateSubitemDenier = (values) => {
        const count = Number(values.count);
        const ply = Number(values.ply);
        if (!count || !ply) return '';
        return (count * ply).toString();
    };

    const handleLoadPress = () => {
        setIsDrawerVisible(false);
    };

    const validateSpunForm = () => {
        if (!spunForm.blend_id) {
            return "Please select Blend";
        }
        if (!spunForm.count_id) {
            return "Please select Count";
        }
        if (!spunForm.ply_id) {
            return "Please select Ply";
        }
        // if (!spunForm.ItmCode) {
        //     return "Please select Link Item";
        // }
        // if (!spunForm.linkitmcode) {
        //     return "Main Item is required";
        // }

        return null;
    };

    const handleaddspun = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        const errorMessage = validateSpunForm();
        if (errorMessage) {
            Alert.alert("Validation", errorMessage);
            return;
        }
        try {
            setIsLoading(true);
            const source = axios.CancelToken.source();
            const Payload = {
                maincode: spunForm.linkitmcode,
                denier: spunForm.denier,
                blend: spunForm.blend_id,
                count: spunForm.count_id,
                ply: spunForm.ply_id,
                linkitmcode: spunForm.ItmCode || '',
                prptype: userPtype,
                txntype: 'yarn_creation_item_master',
                yarntype: activeTab == 'Spun' ? '1' : '2',
                strcode: FormState.values.yarnstrcode
            };

            console.log("Spun Payload:", Payload);

            const response = await axios.post(
                `${API}/api/yarnspunmodify`,
                Payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    cancelToken: source.token
                }
            );
            console.log("spun add response", response);
            if (response?.data?.success) {

                const newItemCode = response?.data?.data?.data?.itmcode;
                console.log("newItemCode", newItemCode);

                Alert.alert(
                    "Success",
                    `Item ${newItemCode} Saved successfully.`,
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                setIsLoading(true);
                                setSpunForm({
                                    blend: '',
                                    blend_id: '',
                                    count: '',
                                    count_id: '',
                                    ply: '',
                                    ply_id: '',
                                    linkitmcode: '',
                                    denier: '',
                                    ItmCode: ''
                                });
                                setselectedblend([]);
                                setselectedcount([]);
                                setselectedply([]);
                                setselecteditem([]);
                                setShowSpunCard(false);
                                fetchbrowse(activeTab);
                                setIsLoading(false);
                            }
                        }
                    ]
                );
            }
            else if (response?.data?.success === false) {
                Alert.alert(
                    "Warning",
                    response?.data?.message
                );

            }

        }
        catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarndefault error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const validateFilamentForm = () => {
        if (!filamentForm.blend_id) {
            return "Please select Blend";
        }
        if (!filamentForm.count_id) {
            return "Please select Count";
        }
        if (!filamentForm.ply_id) {
            return "Please select Ply";
        }
        if (!filamentForm.type_id) {
            return "Please select Type";
        }
        if (!filamentForm.lustre_id) {
            return "Please select Lustre";
        }
        if (!filamentForm.other_id) {
            return "Please select Other";
        }
        // if (!filamentForm.ItmCode) {
        //     return "Please select Link Item";
        // }

        // if (!filamentForm.linkitmcode) {
        //     return "Main Item is required";
        // }

        return null; // ✅ all valid
    };

    const handleaddfilament = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');

        const errorMessage = validateFilamentForm();
        if (errorMessage) {
            Alert.alert("Validation", errorMessage);
            return;
        }

        try {
            setIsLoading(true);
            const source = axios.CancelToken.source();

            const Payload = {
                maincode: filamentForm.linkitmcode,
                denier: filamentForm.denier,
                blend: filamentForm.blend_id,
                count: filamentForm.count_id,
                ply: filamentForm.ply_id,
                linkitmcode: filamentForm.ItmCode || '',
                other: filamentForm.other_id,
                lustre: filamentForm.lustre_id,
                type: filamentForm.type_id,
                prptype: userPtype,
                txntype: 'yarn_creation_item_master',
                yarntype: activeTab == 'Spun' ? '1' : '2',
                strcode: FormState.values.yarnstrcode
            };
            console.log("Filament Payload:", Payload);
            const response = await axios.post(
                `${API}/api/yarnfilamentmodify`,
                Payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    cancelToken: source.token
                }
            );
            console.log("filament save API Response:", response);
            if (response?.data?.success === true) {

                const newItemCode = response?.data?.data?.data?.itmcode;

                Alert.alert(
                    "Success",
                    `Item ${newItemCode} saved successfully.`,
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                setFilamentForm({
                                    blend: '',
                                    blend_id: '',
                                    count: '',
                                    count_id: '',
                                    ply: '',
                                    ply_id: '',
                                    type: '',
                                    type_id: '',
                                    lustre: '',
                                    lustre_id: '',
                                    name: '',
                                    other_id: '',
                                    linkitmcode: '',
                                    denier: '',
                                    ItmCode: ''
                                });

                                setselectedfilamentblend([]);
                                setselectedfilamentcount([]);
                                setselectedfilamentply([]);
                                setselectedtype([]);
                                setselectedlustre([]);
                                setselectedothers([]);
                                setselectedfilamentitem([]);

                                setShowFilamentCard(false);

                                fetchbrowse(activeTab);
                            }
                        }
                    ]
                );

            } else if (response?.data?.success === false) {
                Alert.alert(
                    "Warning",
                    response?.data?.message
                );

            }

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API error:", error);
                Alert.alert("Error", "Something went wrong");
            }
        }
        finally {
            setIsLoading(false);
        }
    };

    const handleAddClick = async () => {
        if (activeTab === 'Spun') {
            await soshow(); // ✅ ab valid hai

            setShowSpunCard(true);
            setShowFilamentCard(false);
        } else {
            await soshow();
            setShowFilamentCard(true);
            setShowSpunCard(false);
        }
    };

    const subitemvalidate = () => {
        if (!subitemform.WNameCode) {
            Alert.alert("Validation", "Yarn Main Code required");
            return false;
        }

        if (!blendList || blendList.length === 0) {
            Alert.alert("Validation", "Please select blend");
            return false;
        }

        let total = 0;

        for (let i = 0; i < blendList.length; i++) {
            const per = Number(blendList[i].per);

            if (!per || per <= 0) {
                Alert.alert("Validation", `Enter valid % for ${blendList[i].name}`);
                return false;
            }

            total += per;
        }

        if (total !== 100) {
            Alert.alert("Validation", `Total percentage must be 100. Current: ${total}`);
            return false;
        }

        if (!subitemform.count_id) {
            Alert.alert("Validation", "Please select Count");
            return false;
        }

        if (!subitemform.ply_id) {
            Alert.alert("Validation", "Please select Ply");
            return false;
        }

        if (!subitemform.others) {
            Alert.alert("Validation", "Please enter others Value");
            return false;
        }
        if (!subitemform.linkitmcode) {
            Alert.alert("Validation", "Please enter Sub Item Name");
            return false;
        }

        // if (!subitemform.ItmCode) {
        //     Alert.alert("Validation", "Please select Link Item");
        //     return false;
        // }

        return true;  // 🔥 MOST IMPORTANT
    };

    const handlesubitemadd = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        console.log("yarn type", subitemform.WYarnType)
        const isValid = subitemvalidate();

        if (!isValid) return;
        //   if (!subitemvalidate()) return;
        const finalBlendList = [...blendList];
        try {
            setIsLoading(true);
            const source = axios.CancelToken.source();
            const Payload = {
                maincode: subitemform.linkitmcode,
                denier: subitemform.denier,
                blendid: subitemform.WBlend,
                count: subitemform.count_id,
                ply: subitemform.ply_id,
                mitmcode: subitemform.mitmcode || '',
                blend_names: finalBlendList.map(b => ({
                    id: b.id,
                    name: b.name,
                    per: Number(b.per || 0)
                })),
                prptype: userPtype,
                txntype: 'yarn_creation_item_master',
                yarntype: subitemform.WYarnType,
                strcode: FormState.values.yarnstrcode,
                linkitmcode: subitemform.ItmCode || '',
                other: subitemform.others || ''
            };

            console.log("Spun Payload:", Payload);

            const response = await axios.post(
                `${API}/api/modifyyarnsubitem`,
                Payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    cancelToken: source.token
                }
            );
            console.log("spun add response", response);
            if (response?.data?.success) {
                const newItemCode = response?.data?.data?.data?.itmcode;
                Alert.alert(
                    "Success",
                    `Item ${newItemCode} Saved successfully.`,
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                setIsLoading(true);
                                setsubitemform({
                                    blend: '',
                                    count: '',
                                    ply: '',
                                    linkitmcode: '',
                                    denier: '',
                                    blend_id: '',
                                    count_id: '',
                                    ply_id: '',
                                    ItmCode: '',
                                    type_id: '',
                                    type: '',
                                    lustre_id: '',
                                    lustre: '',
                                    other_id: '',
                                    name: '',
                                    Per: '',
                                    mitmcode: '',
                                    WBlend: '',
                                    WYarnType: '',
                                    WNameCode: '',
                                    others: ''
                                });
                                setBlendList([]);
                                setselectedcount([]);
                                setselectedply([]);
                                setselectedmitem([]);
                                setselectedothers([]);
                                setselectedsubitem([]);
                                setselectedsubply([]);
                                setselectedsubcount([]);
                                setShowSubItemCard(false);
                                fetchbrowse(activeTab);
                            }
                        }
                    ]
                );
            }
            else if (response?.data?.success === false) {
                Alert.alert(
                    "Warning",
                    response?.data?.message
                );

            }

        }
        catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarndefault error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchbrowse = async (tabValue) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                strcode: FormState.values.yarnstrcode,
                txntype: 'yarn_creation_item_master',
                yarntype: tabValue == 'Spun' ? '1' : '2',
            };

            console.log("master historyPayload:", historyPayload);

            const response = await axios.get(
                `${API}/api/getyarnmasteritem`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("Master API Response:", response);

            const data = response?.data?.data?.data || [];
            const mapped = response?.data?.data?.mapped_data || [];
            if (response?.data?.success && response?.data?.data?.data?.length > 0) {
                setdata(data);
            } else {
                setdata([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchbrowse(activeTab);
    }, [activeTab]);

    const getTotalPercentage = (list) => {
        return list.reduce((sum, item) => sum + Number(item.per || 0), 0);
    };

    const total = getTotalPercentage(blendList);

    if (showSubItemCard) {
        return (
            <View style={{ flex: 1 }}>
                <HeaderBarwithBack
                    userName={username}
                    header={'Create Sub Item'}
                    subHeader={'Fill details to generate yarn sub item'}
                />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ marginTop: 0 }}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View style={yarnmanagementsystemstyle.formCard}>
                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Yarn Main Code <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            {/* <PartyDropdown
                                data={mitemdata}
                                placeholder={isLoading ? "Loading..." : "Choose master item..."}
                                labelKey={["WNameCode", "itmcode"]}
                                valueKey="itmcode"
                                pageSize={12}
                                initialValue={selectedmitem ?? null}
                                selected={selectedmitem ?? null}
                                type="SubItem"
                                disabled={isLoading}   // 🔥 important
                                onSelect={(item) => {
                                    setselectedmitem(item);

                                    const selectedBlendId = item?.WBlend;

                                    let list = [];
                                    const blendObj = mappedData.find(
                                        b => String(b.blendid) === String(selectedBlendId)
                                    );

                                    if (blendObj?.blend_names?.length > 0) {
                                        list = blendObj.blend_names.map(b => ({
                                            name: b.name,
                                            id: b.id,
                                            per: ''
                                        }));

                                        if (list.length === 1) {
                                            list[0].per = '100';
                                        }
                                    }

                                    setBlendList(list);

                                    setsubitemform(prev => ({
                                        ...prev,
                                        itmcode: item?.itmcode || '',
                                        WNameCode: item?.WNameCode || '',
                                        blend_id: selectedBlendId || '',
                                        WYarnType: item?.WYarnType || '',
                                        WBlend: item?.WBlend || '',
                                        mitmcode: item?.mitmcode || ''
                                    }));
                                }}
                            /> */}

                            <View style={yarnmanagementsystemstyle.inputBox}>
                                <TextInput
                                    value={subitemform.WNameCode || ''}
                                    placeholder="Yarn Main Code"
                                    editable={false}   // 🔥 readonly
                                />
                            </View>

                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Blend <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            {blendList.length === 0 ? (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <View style={[yarnmanagementsystemstyle.inputBox, { flex: 2 }]}>
                                        <TextInput placeholder="Blend..." editable={false} />
                                    </View>

                                    <View style={[yarnmanagementsystemstyle.inputBox, { flex: 1 }]}>
                                        <TextInput placeholder="%" keyboardType="numeric" />
                                    </View>
                                </View>
                            ) : (
                                blendList.map((item, index) => (
                                    <View key={index} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>

                                        {/* Blend Name */}
                                        <View style={[yarnmanagementsystemstyle.inputBox, { flex: 2 }]}>
                                            <TextInput
                                                placeholder="Blend..."
                                                value={item.name}
                                                editable={false}
                                            />
                                        </View>

                                        {/* Percentage */}
                                        <View style={[yarnmanagementsystemstyle.inputBox, { flex: 1 }]}>
                                            <TextInput
                                                placeholder="%"
                                                value={item.per}
                                                keyboardType="numeric"
                                                onChangeText={(text) => {
                                                    const updated = [...blendList];
                                                    updated[index].per = text;
                                                    setBlendList(updated);

                                                    setsubitemform(prev => ({
                                                        ...prev,
                                                        linkitmcode: buildSubItem(prev, updated)
                                                    }));
                                                }}
                                            // onChangeText={(text) => {
                                            //     const value = text.replace(/[^0-9]/g, '');

                                            //     const updated = [...blendList];
                                            //     updated[index].per = value;

                                            //     setBlendList(updated);

                                            //     setsubitemform(prev => ({
                                            //         ...prev,
                                            //         linkitmcode: buildSubItem(prev, updated)
                                            //     }));

                                            //     // 🔥 validation only when all fields filled
                                            //     if (isAllFilled(updated)) {
                                            //         const total = getTotalPercentage(updated);

                                            //         if (total !== 100) {
                                            //             Alert.alert(
                                            //                 "Validation",
                                            //                 `Total percentage must be 100. Current: ${total}`
                                            //             );
                                            //         }
                                            //     }
                                            // }}
                                            />
                                        </View>

                                    </View>
                                ))
                            )}
                            {blendList.length > 0 && total !== 100 && (
                                <Text style={{ color: 'red', marginTop: 5 }}>
                                    Total must be 100% (Current: {total}%)
                                </Text>
                            )}

                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Count <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            <PartyDropdown
                                data={countdata}
                                placeholder="Choose blend..."
                                labelKey={["count", "id"]}
                                valueKey="id"
                                pageSize={12}
                                initialValue={selectedsubcount ?? null}
                                selected={selectedsubcount ?? null}
                                type="count"
                                onSelect={(item) => {
                                    setselectedsubcount(item);
                                    setsubitemform(prev => {
                                        const updated = {
                                            ...prev,
                                            count_id: item?.id || '',
                                            count: item?.count || ''
                                        };
                                        return {
                                            ...updated,
                                            linkitmcode: buildSubItem(updated, blendList),
                                            denier: calculateSubitemDenier(updated)
                                        };
                                    });
                                }}
                            />
                        </View>

                        {/* Ply */}
                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Ply <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            <PartyDropdown
                                data={plydata}
                                placeholder="Choose Ply..."
                                labelKey={["ply", "id"]}
                                valueKey="id"
                                pageSize={12}
                                initialValue={selectedsubply ?? null}
                                selected={selectedsubply ?? null}
                                type="ply"
                                onSelect={(item) => {
                                    setselectedsubply(item);
                                    setsubitemform(prev => {
                                        const updated = {
                                            ...prev,
                                            ply_id: item?.id || '',
                                            ply: item?.ply || ''
                                        };
                                        return {
                                            ...updated,
                                            linkitmcode: buildSubItem(updated, blendList),
                                            denier: calculateSubitemDenier(updated)
                                        };
                                    });
                                }}
                            />
                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Other <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            {/* <PartyDropdown
                                data={othersdata}
                                placeholder="Choose Others..."
                                labelKey={["name", "id"]}
                                valueKey="id"
                                pageSize={12}
                                initialValue={selectedothers ?? null}
                                selected={selectedothers ?? null}
                                type="blend"
                                onSelect={(item) => {
                                    setselectedothers(item);
                                    setsubitemform(prev => {
                                        const updated = {
                                            ...prev,
                                            other_id: item?.id || '',
                                            name: item?.name || ''
                                        };
                                        return {
                                            ...updated,
                                            linkitmcode: buildSubItem(updated, blendList),
                                        };
                                    });
                                }}
                            /> */}
                            <View style={yarnmanagementsystemstyle.inputBox}>
                                <TextInput
                                    placeholder="Others..."
                                    value={subitemform.others || ''}
                                    editable={true}
                                    // onChangeText={(text) => {
                                    //     setsubitemform(prev => ({
                                    //         ...prev,
                                    //         others: text
                                    //     }));
                                    // }}

                                    onChangeText={(text) => {
                                        setsubitemform(prev => {
                                            const updated = {
                                                ...prev,
                                                others: text
                                            };

                                            return {
                                                ...updated,
                                                linkitmcode: buildSubItem(updated, blendList) // 🔥 auto update
                                            };
                                        });
                                    }}
                                />
                            </View>
                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Sub Item Name <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            <View style={yarnmanagementsystemstyle.inputBox}>
                                <TextInput
                                    placeholder="Main Item..."
                                    value={subitemform.linkitmcode || ''}
                                    editable={true}
                                    onChangeText={(text) => {
                                        setsubitemform(prev => ({
                                            ...prev,
                                            linkitmcode: text
                                        }));
                                    }}
                                    style={{
                                        color: '#000',
                                        opacity: 1,
                                        height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                    }}
                                />
                            </View>
                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Denier <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            <View style={yarnmanagementsystemstyle.inputBox}>
                                <TextInput
                                    placeholder="Denier..."
                                    value={subitemform.denier}
                                    editable={false}
                                    style={{
                                        color: '#000',
                                        opacity: 1,
                                        height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                    }}
                                />
                            </View>
                        </View>

                        <View style={yarnmanagementsystemstyle.inputGroup}>
                            <Text style={yarnmanagementsystemstyle.label}>
                                Link Item
                                {/* <Text style={{ color: 'red' }}>*</Text> */}
                            </Text>

                            <PartyDropdown
                                data={itemdata}
                                placeholder="Choose Item..."
                                labelKey={["ItmName", "ItmCode"]}
                                valueKey="ItmCode"
                                pageSize={12}
                                initialValue={selectedsubitem ?? null}
                                selected={selectedsubitem ?? null}
                                type="Item1"
                                onSelect={(item) => {
                                    setselectedsubitem(item);
                                    setsubitemform(prev => ({
                                        ...prev,
                                        // maincode:item?.
                                        ItmCode: item?.ItmCode || "",
                                    }));
                                }}
                            />
                        </View>


                    </View>
                </ScrollView>

                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    padding: 15,
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderColor: '#eee'
                }}>
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#ccc',
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            borderRadius: 6,
                            marginRight: 10
                        }}
                        onPress={() => setShowSubItemCard(false)}
                    >
                        <Text style={{ fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            backgroundColor: '#007EA7',
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            borderRadius: 6
                        }}
                        // onPress={() => {
                        //     handlesubitemadd();
                        //     console.log("Sub Item", spunForm);
                        // }}
                        onPress={() => {
                            if (!selectedsubitem || !selectedsubitem.ItmCode) {
                                Alert.alert(
                                    "Confirmation",
                                    "Link item is not selected. Do you want to create a new item?",
                                    [
                                        {
                                            text: "Cancel",
                                            style: "cancel"
                                        },
                                        {
                                            text: "OK",
                                            onPress: () => {
                                                handlesubitemadd();
                                                console.log("Sub Item", subitemform);
                                            }
                                        }
                                    ]
                                );
                                return;
                            }
                            handlesubitemadd();
                            console.log("Sub Item", spunForm);
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>
                            Add Sub Item
                        </Text>
                    </TouchableOpacity>

                </View>

            </View>
        );
    }

    const CARD_COLORS = [
        ["#4A6FA5", "#5C85D1"]

    ];

    // useEffect(() => {
    //     soshow();
    // }, []);

    return (
        <>
            {isLoading && <FullScreenLoader />}

            <HeaderBarwithBack
                userName={username}
                header={'Yarn Managment System'}
                subHeader={'Manage Your Yarn Items And Create Sub Items'}
            />



            <View style={yarnmanagementsystemstyle.container}>
                <View style={yarnmanagementsystemstyle.mainCard}>

                    {/* 🔹 Tabs */}
                    <View style={yarnmanagementsystemstyle.tabContainer}>

                        {/* Spun */}
                        <TouchableOpacity
                            style={[
                                yarnmanagementsystemstyle.tab,
                                activeTab === 'Spun' && yarnmanagementsystemstyle.activeTab
                            ]}
                            onPress={() => {
                                setActiveTab('Spun');
                                setdata([]);
                                setShowSpunCard(false);
                                setShowFilamentCard(false);
                                fetchbrowse('Spun');
                            }}
                        >
                            <Text style={[
                                yarnmanagementsystemstyle.tabText,
                                activeTab === 'Spun' && yarnmanagementsystemstyle.activeTabText
                            ]}>
                                Spun
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                yarnmanagementsystemstyle.tab,
                                activeTab === 'Filaments' && yarnmanagementsystemstyle.activeTab
                            ]}
                            onPress={() => {
                                setActiveTab('Filaments');
                                setdata([]);
                                setShowSpunCard(false);
                                setShowFilamentCard(false);
                                fetchbrowse('Filaments');
                            }}
                        >
                            <Text style={[
                                yarnmanagementsystemstyle.tabText,
                                activeTab === 'Filaments' && yarnmanagementsystemstyle.activeTabText
                            ]}>
                                Filament
                            </Text>
                        </TouchableOpacity>

                    </View>

                    {activeTab === 'Spun' && (
                        <>
                            {!showSpunCard && (
                                <>
                                    <TouchableOpacity
                                        style={yarnmanagementsystemstyle.addButton}
                                        onPress={handleAddClick}
                                    >
                                        <Text style={yarnmanagementsystemstyle.addButtonText}>
                                            + Add Spun Item
                                        </Text>
                                    </TouchableOpacity>

                                    <ScrollView
                                        style={{ marginTop: 10 }}
                                        contentContainerStyle={{ paddingBottom: 20 }}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        {data.length === 0 ? (
                                            <View style={yarnmanagementsystemstyle.emptyBox}>
                                                <Text style={yarnmanagementsystemstyle.emptyText}>
                                                    No items yet..
                                                </Text>
                                                <Text style={yarnmanagementsystemstyle.emptySubText}>
                                                    Add one to get started!
                                                </Text>
                                            </View>
                                        ) : (
                                            data.map((item, index) => (
                                                <View key={item.id || index} style={yarnmanagementsystemstyle.cardWrapper}>

                                                    <LinearGradient
                                                        colors={CARD_COLORS[index % CARD_COLORS.length]}
                                                        style={yarnmanagementsystemstyle.itemCard1}
                                                    >

                                                        {/* 🔹 Header */}
                                                        <View style={yarnmanagementsystemstyle.cardHeader}>
                                                            <Text style={yarnmanagementsystemstyle.itmTitle}>
                                                                {item.WNameCode}
                                                            </Text>

                                                            <View style={[
                                                                yarnmanagementsystemstyle.categoryBadge,
                                                                item.WYarnType == '1'
                                                                    ? yarnmanagementsystemstyle.spunBadge
                                                                    : yarnmanagementsystemstyle.filamentBadge
                                                            ]}>
                                                                <Text style={yarnmanagementsystemstyle.categoryBadgeText}>
                                                                    {item.WYarnType == '1'
                                                                        ? 'Spun'
                                                                        : item.WYarnType == '2'
                                                                            ? 'Filament'
                                                                            : 'Yarn'}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        {/* 🔹 Divider */}
                                                        <View style={yarnmanagementsystemstyle.divider} />

                                                        {/* 🔹 Info */}
                                                        <Text style={yarnmanagementsystemstyle.infoText}>
                                                            Blend: <Text style={yarnmanagementsystemstyle.infoValue}>{item.name}</Text>
                                                        </Text>

                                                        <Text style={yarnmanagementsystemstyle.infoText}>
                                                            Ply: <Text style={yarnmanagementsystemstyle.infoValue}>{item.WPly}</Text>
                                                        </Text>

                                                        {/* 🔹 Button */}
                                                        <View style={yarnmanagementsystemstyle.buttonRowRight}>
                                                            {/* <TouchableOpacity
                                                                activeOpacity={0.8}
                                                                style={yarnmanagementsystemstyle.smallButton}
                                                                // onPress={() => {
                                                                //     soshow();
                                                                //     fetchmitem();
                                                                //     fetchBlendcount();
                                                                //     fetchBlendply();
                                                                //     fetchOthresdata();
                                                                //     setShowSubItemCard(true);
                                                                // }}
                                                                onPress={() => {
                                                                    soshow();
                                                                    fetchmitem();
                                                                    fetchBlendcount();
                                                                    fetchBlendply();
                                                                    fetchOthresdata();

                                                                    const selectedBlendId = item?.WBlend;

                                                                    // 🔥 mappedData me find karo (blendid + itmcode match karo)
                                                                    const blendObj = mappedData.find(
                                                                        b =>
                                                                            String(b.blendid) === String(selectedBlendId) &&
                                                                            String(b.itmcode) === String(item.itmcode)
                                                                    );

                                                                    let list = [];

                                                                    if (blendObj?.blend_names?.length > 0) {
                                                                        list = blendObj.blend_names.map(b => ({
                                                                            id: b.id,
                                                                            name: b.name,
                                                                            per: ''
                                                                        }));

                                                                        // single blend → auto 100
                                                                        if (list.length === 1) {
                                                                            list[0].per = '100';
                                                                        }
                                                                    }

                                                                    // 🔥 set blend list
                                                                    setBlendList(list);

                                                                    // 🔥 form set
                                                                    setsubitemform(prev => ({
                                                                        ...prev,
                                                                        WNameCode: item?.WNameCode || '',
                                                                        WBlend: selectedBlendId || '',
                                                                        WYarnType: item?.WYarnType || '',
                                                                        mitmcode: item?.mitmcode || ''
                                                                    }));

                                                                    setShowSubItemCard(true);
                                                                }}
                                                            > */}

                                                            <TouchableOpacity
                                                                activeOpacity={0.8}
                                                                style={yarnmanagementsystemstyle.smallButton}
                                                                // onPress={() => {
                                                                //     soshow();
                                                                //     fetchmitem();
                                                                //     fetchBlendcount();
                                                                //     fetchBlendply();
                                                                //     fetchOthresdata();
                                                                //     setShowSubItemCard(true);
                                                                // }}
                                                                // onPress={() => {
                                                                //     soshow();
                                                                //     // fetchmitem();
                                                                //     const mapped = await fetchmitem();
                                                                //     fetchBlendcount();
                                                                //     fetchBlendply();
                                                                //     fetchOthresdata();

                                                                //     const selectedBlendId = item?.WBlend;

                                                                //     // 🔥 mappedData me find karo (blendid + itmcode match karo)
                                                                //     const blendObj = mappedData.find(
                                                                //         b =>
                                                                //             String(b.blendid) === String(selectedBlendId) &&
                                                                //             String(b.itmcode) === String(item.itmcode)
                                                                //     );

                                                                //     let list = [];

                                                                //     if (blendObj?.blend_names?.length > 0) {
                                                                //         list = blendObj.blend_names.map(b => ({
                                                                //             id: b.id,
                                                                //             name: b.name,
                                                                //             per: ''
                                                                //         }));

                                                                //         // single blend → auto 100
                                                                //         if (list.length === 1) {
                                                                //             list[0].per = '100';
                                                                //         }
                                                                //     }

                                                                //     // 🔥 set blend list
                                                                //     setBlendList(list);

                                                                //     // 🔥 form set
                                                                //     setsubitemform(prev => ({
                                                                //         ...prev,
                                                                //         WNameCode: item?.WNameCode || '',
                                                                //         WBlend: selectedBlendId || '',
                                                                //         WYarnType: item?.WYarnType || '',
                                                                //         mitmcode: item?.mitmcode || ''
                                                                //     }));

                                                                //     setShowSubItemCard(true);
                                                                // }}
                                                                onPress={async () => {
                                                                    soshow();

                                                                    const mapped = await fetchmitem();   // 🔥 WAIT

                                                                    fetchBlendcount();
                                                                    fetchBlendply();
                                                                    fetchOthresdata();

                                                                    const selectedBlendId = item?.WBlend;

                                                                    const blendObj = mapped.find(
                                                                        b =>
                                                                            String(b.blendid) === String(selectedBlendId) &&
                                                                            String(b.itmcode) === String(item.itmcode)
                                                                    );

                                                                    let list = [];

                                                                    if (blendObj?.blend_names?.length > 0) {
                                                                        list = blendObj.blend_names.map(b => ({
                                                                            id: b.id,
                                                                            name: b.name,
                                                                            per: ''
                                                                        }));

                                                                        if (list.length === 1) {
                                                                            list[0].per = '100';
                                                                        }
                                                                    }

                                                                    setBlendList(list);

                                                                    setsubitemform(prev => ({
                                                                        ...prev,
                                                                        WNameCode: item?.WNameCode || '',
                                                                        WBlend: selectedBlendId || '',
                                                                        WYarnType: item?.WYarnType || '',
                                                                        mitmcode: item?.mitmcode || ''
                                                                    }));

                                                                    setShowSubItemCard(true);
                                                                }}
                                                            >
                                                                <Text style={yarnmanagementsystemstyle.smallButtonText}>
                                                                    Sub Item Create
                                                                </Text>
                                                            </TouchableOpacity>
                                                            {/* <Text style={yarnmanagementsystemstyle.smallButtonText}>
                                                                    Create
                                                                </Text> */}
                                                            {/* </TouchableOpacity> */}
                                                        </View>

                                                    </LinearGradient>

                                                </View>
                                            ))
                                        )}
                                    </ScrollView>
                                </>
                            )}

                            {showSpunCard && (
                                <View style={{ flex: 1 }}>

                                    {/* 🔹 Scrollable Form */}
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        style={{ marginTop: 10 }}
                                        contentContainerStyle={{ paddingBottom: 100 }}
                                    >
                                        <View style={yarnmanagementsystemstyle.formCard}>

                                            <Text style={yarnmanagementsystemstyle.formTitle}>
                                                Add Spun Main Item
                                            </Text>

                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Blend <Text style={{ color: 'red' }}>*</Text>
                                                </Text>
                                                <PartyDropdown
                                                    data={blenddata}
                                                    placeholder="Choose blend..."
                                                    labelKey={["name", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedblend ?? null}
                                                    selected={selectedblend ?? null}
                                                    type="blend"
                                                    onSelect={(item) => {
                                                        setselectedblend(item);
                                                        setSpunForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                blend_id: item?.id || '',
                                                                blend: item?.name || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                linkitmcode: buildMainItem(updated)
                                                            };
                                                        });
                                                    }}
                                                />
                                            </View>

                                            {/* Count */}
                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Count <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <PartyDropdown
                                                    data={countdata}
                                                    placeholder="Choose blend..."
                                                    labelKey={["count", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedcount ?? null}
                                                    selected={selectedcount ?? null}
                                                    type="count"
                                                    onSelect={(item) => {
                                                        setselectedcount(item);
                                                        setSpunForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                count_id: item?.id || '',
                                                                count: item?.count || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                linkitmcode: buildMainItem(updated),
                                                                denier: calculateDenier(updated)
                                                            };
                                                        });
                                                    }}
                                                />
                                            </View>

                                            {/* Ply */}
                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Ply <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <PartyDropdown
                                                    data={plydata}
                                                    placeholder="Choose Ply..."
                                                    labelKey={["ply", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedply ?? null}
                                                    selected={selectedply ?? null}
                                                    type="ply"
                                                    onSelect={(item) => {
                                                        setselectedply(item);
                                                        setSpunForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                ply_id: item?.id || '',
                                                                ply: item?.ply || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                linkitmcode: buildMainItem(updated),
                                                                denier: calculateDenier(updated)
                                                            };
                                                        });
                                                    }}
                                                />
                                            </View>

                                            {/* Main Item */}
                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Main Item <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <View style={yarnmanagementsystemstyle.inputBox}>
                                                    <TextInput
                                                        placeholder="Main Item..."
                                                        value={spunForm.linkitmcode || ''}
                                                        editable={true}
                                                        onChangeText={(text) => {
                                                            setSpunForm(prev => ({
                                                                ...prev,
                                                                linkitmcode: text
                                                            }));

                                                        }}
                                                        style={{
                                                            color: '#000',
                                                            opacity: 1,
                                                            height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                                        }}
                                                    />
                                                </View>
                                            </View>

                                            {/* Denier */}
                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Denier <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <View style={yarnmanagementsystemstyle.inputBox}>
                                                    <TextInput
                                                        placeholder="Denier..."
                                                        value={spunForm.denier}
                                                        editable={false}
                                                        style={{
                                                            color: '#000',
                                                            opacity: 1,
                                                            height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                                        }}
                                                    />
                                                </View>
                                            </View>

                                            {/* Link Item */}
                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Link Item
                                                    {/* <Text style={{ color: 'red' }}>*</Text> */}
                                                </Text>

                                                <PartyDropdown
                                                    data={itemdata}
                                                    placeholder="Choose Item..."
                                                    labelKey={["ItmName", "ItmCode"]}
                                                    valueKey="ItmCode"
                                                    pageSize={12}
                                                    initialValue={selecteditem ?? null}
                                                    selected={selecteditem ?? null}
                                                    type="Item1"
                                                    onSelect={(item) => {
                                                        setselecteditem(item);
                                                        setSpunForm(prev => ({
                                                            ...prev,
                                                            // maincode:item?.
                                                            ItmCode: item?.ItmCode || "",
                                                        }));
                                                    }}
                                                />
                                            </View>

                                        </View>
                                    </ScrollView>

                                    {/* 🔥 FIXED BOTTOM BUTTONS */}
                                    <View style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        flexDirection: 'row',
                                        justifyContent: 'flex-end',
                                        padding: 15,
                                        backgroundColor: '#fff',
                                        borderTopWidth: 1,
                                        borderColor: '#eee'
                                    }}>

                                        {/* Cancel */}
                                        <TouchableOpacity
                                            style={{
                                                backgroundColor: '#ccc',
                                                paddingVertical: 10,
                                                paddingHorizontal: 20,
                                                borderRadius: 6,
                                                marginRight: 10
                                            }}
                                            onPress={() => setShowSpunCard(false)}
                                        >
                                            <Text style={{ fontWeight: '600' }}>Cancel</Text>
                                        </TouchableOpacity>

                                        {/* Add */}
                                        <TouchableOpacity
                                            style={{
                                                backgroundColor: '#007EA7',
                                                paddingVertical: 10,
                                                paddingHorizontal: 20,
                                                borderRadius: 6
                                            }}
                                            // onPress={() => {
                                            //     handleaddspun();
                                            //     console.log("Add Item", spunForm);
                                            // }}
                                            onPress={() => {
                                                if (!selecteditem || !selecteditem.ItmCode) {
                                                    Alert.alert(
                                                        "Confirmation",
                                                        "Link item is not selected. Do you want to create a new item?",
                                                        [
                                                            {
                                                                text: "Cancel",
                                                                style: "cancel"
                                                            },
                                                            {
                                                                text: "OK",
                                                                onPress: () => {
                                                                    handleaddspun();
                                                                }
                                                            }
                                                        ]
                                                    );
                                                    return;
                                                }
                                                handleaddspun();
                                            }}
                                        >
                                            <Text style={{ color: '#fff', fontWeight: '600' }}>
                                                Add Spun Item
                                            </Text>
                                        </TouchableOpacity>

                                    </View>

                                </View>
                            )}

                        </>
                    )}

                    {activeTab === 'Filaments' && (
                        <>
                            {!showFilamentCard && (
                                <>
                                    <TouchableOpacity
                                        style={yarnmanagementsystemstyle.addButton}
                                        onPress={handleAddClick}
                                    >
                                        <Text style={yarnmanagementsystemstyle.addButtonText}>
                                            + Add Filament Item
                                        </Text>
                                    </TouchableOpacity>

                                    <ScrollView
                                        style={{ marginTop: 10 }}
                                        contentContainerStyle={{ paddingBottom: 20 }}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        {data.length === 0 ? (
                                            <View style={yarnmanagementsystemstyle.emptyBox}>
                                                <Text style={yarnmanagementsystemstyle.emptyText}>
                                                    No items yet..
                                                </Text>
                                                <Text style={yarnmanagementsystemstyle.emptySubText}>
                                                    Add one to get started!
                                                </Text>
                                            </View>
                                        ) : (
                                            data.map((item, index) => (
                                                <View key={item.id || index} style={yarnmanagementsystemstyle.cardWrapper}>

                                                    <LinearGradient
                                                        colors={CARD_COLORS[index % CARD_COLORS.length]}
                                                        style={yarnmanagementsystemstyle.itemCard1}
                                                    >

                                                        {/* 🔹 Header */}
                                                        <View style={yarnmanagementsystemstyle.cardHeader}>
                                                            <Text style={yarnmanagementsystemstyle.itmTitle}>
                                                                {item.WNameCode}
                                                            </Text>

                                                            <View style={[
                                                                yarnmanagementsystemstyle.categoryBadge,
                                                                item.WYarnType == '1'
                                                                    ? yarnmanagementsystemstyle.spunBadge
                                                                    : yarnmanagementsystemstyle.filamentBadge
                                                            ]}>
                                                                <Text style={yarnmanagementsystemstyle.categoryBadgeText}>
                                                                    {item.WYarnType == '1'
                                                                        ? 'Spun'
                                                                        : item.WYarnType == '2'
                                                                            ? 'Filament'
                                                                            : 'Yarn'}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        {/* 🔹 Divider */}
                                                        <View style={yarnmanagementsystemstyle.divider} />

                                                        {/* 🔹 Info */}
                                                        <Text style={yarnmanagementsystemstyle.infoText}>
                                                            Blend: <Text style={yarnmanagementsystemstyle.infoValue}>{item.name}</Text>
                                                        </Text>

                                                        <Text style={yarnmanagementsystemstyle.infoText}>
                                                            Ply: <Text style={yarnmanagementsystemstyle.infoValue}>{item.WPly}</Text>
                                                        </Text>

                                                        {/* 🔹 Button */}
                                                        <View style={yarnmanagementsystemstyle.buttonRowRight}>
                                                            <TouchableOpacity
                                                                activeOpacity={0.8}
                                                                style={yarnmanagementsystemstyle.smallButton}
                                                                // onPress={() => {
                                                                //     soshow();
                                                                //     fetchmitem();
                                                                //     fetchBlendcount();
                                                                //     fetchBlendply();
                                                                //     fetchOthresdata();
                                                                //     setShowSubItemCard(true);
                                                                // }}
                                                                // onPress={() => {
                                                                //     soshow();
                                                                //     fetchmitem();
                                                                //     fetchBlendcount();
                                                                //     fetchBlendply();
                                                                //     fetchOthresdata();

                                                                //     const selectedBlendId = item?.WBlend;

                                                                //     // 🔥 mappedData me find karo (blendid + itmcode match karo)
                                                                //     const blendObj = mappedData.find(
                                                                //         b =>
                                                                //             String(b.blendid) === String(selectedBlendId) &&
                                                                //             String(b.itmcode) === String(item.itmcode)
                                                                //     );

                                                                //     let list = [];

                                                                //     if (blendObj?.blend_names?.length > 0) {
                                                                //         list = blendObj.blend_names.map(b => ({
                                                                //             id: b.id,
                                                                //             name: b.name,
                                                                //             per: ''
                                                                //         }));

                                                                //         // single blend → auto 100
                                                                //         if (list.length === 1) {
                                                                //             list[0].per = '100';
                                                                //         }
                                                                //     }

                                                                //     // 🔥 set blend list
                                                                //     setBlendList(list);

                                                                //     // 🔥 form set
                                                                //     setsubitemform(prev => ({
                                                                //         ...prev,
                                                                //         WNameCode: item?.WNameCode || '',
                                                                //         WBlend: selectedBlendId || '',
                                                                //         WYarnType: item?.WYarnType || '',
                                                                //         mitmcode: item?.mitmcode || ''
                                                                //     }));

                                                                //     setShowSubItemCard(true);
                                                                // }}
                                                                onPress={async () => {
                                                                    soshow();

                                                                    const mapped = await fetchmitem();   // 🔥 WAIT

                                                                    fetchBlendcount();
                                                                    fetchBlendply();
                                                                    fetchOthresdata();

                                                                    const selectedBlendId = item?.WBlend;

                                                                    const blendObj = mapped.find(
                                                                        b =>
                                                                            String(b.blendid) === String(selectedBlendId) &&
                                                                            String(b.itmcode) === String(item.itmcode)
                                                                    );

                                                                    let list = [];

                                                                    if (blendObj?.blend_names?.length > 0) {
                                                                        list = blendObj.blend_names.map(b => ({
                                                                            id: b.id,
                                                                            name: b.name,
                                                                            per: ''
                                                                        }));

                                                                        if (list.length === 1) {
                                                                            list[0].per = '100';
                                                                        }
                                                                    }

                                                                    setBlendList(list);

                                                                    setsubitemform(prev => ({
                                                                        ...prev,
                                                                        WNameCode: item?.WNameCode || '',
                                                                        WBlend: selectedBlendId || '',
                                                                        WYarnType: item?.WYarnType || '',
                                                                        mitmcode: item?.mitmcode || ''
                                                                    }));

                                                                    setShowSubItemCard(true);
                                                                }}
                                                            >
                                                                <Text style={yarnmanagementsystemstyle.smallButtonText}>
                                                                    Sub Item Create
                                                                </Text>
                                                            </TouchableOpacity>
                                                        </View>

                                                    </LinearGradient>

                                                </View>
                                            ))
                                        )}
                                    </ScrollView>

                                </>
                            )}

                            {showFilamentCard && (
                                <View style={{ flex: 1 }}>
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        style={{ marginTop: 0 }}
                                        contentContainerStyle={{ paddingBottom: 100 }}
                                    >
                                        <View style={yarnmanagementsystemstyle.formCard}>

                                            {/* 🔹 Heading */}
                                            <Text style={yarnmanagementsystemstyle.formTitle}>
                                                Add Filament Main Item
                                            </Text>

                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Blend <Text style={{ color: 'red' }}>*</Text>
                                                </Text>
                                                <PartyDropdown
                                                    data={blenddata}
                                                    placeholder="Choose blend..."
                                                    labelKey={["name", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedfilamentblend ?? null}
                                                    selected={selectedfilamentblend ?? null}
                                                    type="blend"
                                                    onSelect={(item) => {
                                                        setselectedfilamentblend(item);
                                                        setFilamentForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                blend_id: item?.id || '',
                                                                blend: item?.name || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                // linkitmcode: buildMainItem(updated)
                                                            };
                                                        });
                                                    }}
                                                />
                                            </View>

                                            {/* Count */}
                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Count <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <PartyDropdown
                                                    data={countdata}
                                                    placeholder="Choose blend..."
                                                    labelKey={["count", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedfilamentcount ?? null}
                                                    selected={selectedfilamentcount ?? null}
                                                    type="count"
                                                    onSelect={(item) => {
                                                        setselectedfilamentcount(item);
                                                        setFilamentForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                count_id: item?.id || '',
                                                                count: item?.count || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                linkitmcode: filamentbuildMainItem(updated),
                                                                denier: calculatefilamentDenier(updated)
                                                            };
                                                        });
                                                    }}
                                                />
                                            </View>

                                            {/* Ply */}
                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Ply <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <PartyDropdown
                                                    data={plydata}
                                                    placeholder="Choose Ply..."
                                                    labelKey={["ply", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedfilamentply ?? null}
                                                    selected={selectedfilamentply ?? null}
                                                    type="ply"
                                                    onSelect={(item) => {
                                                        setselectedfilamentply(item);
                                                        setFilamentForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                ply_id: item?.id || '',
                                                                ply: item?.ply || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                linkitmcode: filamentbuildMainItem(updated),
                                                                denier: calculatefilamentDenier(updated)
                                                            };
                                                        });
                                                    }}
                                                />
                                            </View>

                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Type <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <PartyDropdown
                                                    data={typedata}
                                                    placeholder="Choose Type..."
                                                    labelKey={["type", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedtype ?? null}
                                                    selected={selectedtype ?? null}
                                                    type="type"
                                                    onSelect={(item) => {
                                                        setselectedtype(item);
                                                        setFilamentForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                type_id: item?.id || '',
                                                                type: item?.type || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                linkitmcode: filamentbuildMainItem(updated),
                                                            };
                                                        });
                                                    }}
                                                />
                                            </View>

                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Lustre <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <PartyDropdown
                                                    data={lustredata}
                                                    placeholder="Choose lustre..."
                                                    labelKey={["lustre", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedlustre ?? null}
                                                    selected={selectedlustre ?? null}
                                                    type="lustre"
                                                    onSelect={(item) => {
                                                        setselectedlustre(item);
                                                        setFilamentForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                lustre_id: item?.id || '',
                                                                lustre: item?.lustre || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                linkitmcode: filamentbuildMainItem(updated),
                                                            };
                                                        });
                                                    }}
                                                />
                                            </View>

                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Other <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <PartyDropdown
                                                    data={othersdata}
                                                    placeholder="Choose Others..."
                                                    labelKey={["name", "id"]}
                                                    valueKey="id"
                                                    pageSize={12}
                                                    initialValue={selectedothers ?? null}
                                                    selected={selectedothers ?? null}
                                                    type="blend"
                                                    onSelect={(item) => {
                                                        setselectedothers(item);
                                                        setFilamentForm(prev => {
                                                            const updated = {
                                                                ...prev,
                                                                other_id: item?.id || '',
                                                                name: item?.name || ''
                                                            };
                                                            return {
                                                                ...updated,
                                                                linkitmcode: filamentbuildMainItem(updated),
                                                            };
                                                        });
                                                    }}
                                                />
                                            </View>

                                            {/* Main Item */}
                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Main Item <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <View style={yarnmanagementsystemstyle.inputBox}>
                                                    <TextInput
                                                        placeholder="Main Item..."
                                                        value={filamentForm.linkitmcode || ''}
                                                        editable={true}
                                                        onChangeText={(text) =>
                                                            setFilamentForm(prev => ({
                                                                ...prev,
                                                                linkitmcode: text
                                                            }))
                                                        }
                                                        style={{
                                                            color: '#000',
                                                            opacity: 1,
                                                            height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                                        }}
                                                    />
                                                </View>
                                            </View>

                                            {/* Denier */}
                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Denier <Text style={{ color: 'red' }}>*</Text>
                                                </Text>

                                                <View style={yarnmanagementsystemstyle.inputBox}>
                                                    <TextInput
                                                        placeholder="Denier..."
                                                        value={filamentForm.denier}
                                                        editable={false}
                                                        style={{
                                                            color: '#000',
                                                            opacity: 1,
                                                            height: '100%'   // 👈 IMPORTANT (parent View ko fill kare)
                                                        }}
                                                    />
                                                </View>
                                            </View>

                                            {/* Link Item */}
                                            <View style={yarnmanagementsystemstyle.inputGroup}>
                                                <Text style={yarnmanagementsystemstyle.label}>
                                                    Link Item
                                                    {/* <Text style={{ color: 'red' }}>*</Text> */}
                                                </Text>
                                                <PartyDropdown
                                                    data={itemdata}
                                                    placeholder="Choose Item..."
                                                    labelKey={["ItmName", "ItmCode"]}
                                                    valueKey="ItmCode"
                                                    pageSize={12}
                                                    initialValue={selectedfilamentitem ?? null}
                                                    selected={selectedfilamentitem ?? null}
                                                    type="Item1"
                                                    onSelect={(item) => {
                                                        setselectedfilamentitem(item);
                                                        setFilamentForm(prev => ({
                                                            ...prev,
                                                            // maincode:item?.
                                                            ItmCode: item?.ItmCode || "",
                                                        }));
                                                    }}
                                                />
                                            </View>

                                        </View>
                                    </ScrollView>

                                    <View style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        flexDirection: 'row',
                                        justifyContent: 'flex-end',
                                        padding: 15,
                                        backgroundColor: '#fff',
                                        borderTopWidth: 1,
                                        borderColor: '#eee'
                                    }}>

                                        {/* Cancel */}
                                        <TouchableOpacity
                                            style={{
                                                backgroundColor: '#ccc',
                                                paddingVertical: 10,
                                                paddingHorizontal: 20,
                                                borderRadius: 6,
                                                marginRight: 10
                                            }}
                                            onPress={() => setShowFilamentCard(false)}
                                        >
                                            <Text style={{ fontWeight: '600' }}>Cancel</Text>
                                        </TouchableOpacity>

                                        {/* Add */}
                                        <TouchableOpacity
                                            style={{
                                                backgroundColor: '#007EA7',
                                                paddingVertical: 10,
                                                paddingHorizontal: 20,
                                                borderRadius: 6
                                            }}
                                            // onPress={() => {
                                            //     handleaddfilament();
                                            //     console.log("Add Filament Item", spunForm);
                                            // }}

                                            onPress={() => {
                                                if (!selectedfilamentitem || !selectedfilamentitem.ItmCode) {
                                                    Alert.alert(
                                                        "Confirmation",
                                                        "Link item is not selected. Do you want to create a new item?",
                                                        [
                                                            {
                                                                text: "Cancel",
                                                                style: "cancel"
                                                            },
                                                            {
                                                                text: "OK",
                                                                onPress: () => {
                                                                    handleaddfilament();
                                                                }
                                                            }
                                                        ]
                                                    );
                                                    return;
                                                }
                                                handleaddfilament();
                                            }}
                                        >
                                            <Text style={{ color: '#fff', fontWeight: '600' }}>
                                                Add FIlament Item
                                            </Text>
                                        </TouchableOpacity>

                                    </View>
                                </View>

                            )}
                        </>
                    )}

                </View>

            </View>
            {/* )} */}

            {/* <TouchableOpacity style={styles.fab} onPress={openDrawer}>
                <Icon name="list" size={20} color="#fff" />
            </TouchableOpacity> */}

            <CustomDrawer
                isVisible={isDrawerVisible}
                onClose={closeDrawer}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                onLoadPress={handleLoadPress}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                getAllPropertyData={getAllPropertyData}
                setAllPropertyData={setAllPropertyData}
                FormState={FormState}
                setFormState={setFormState}
                getAllYearData={getAllYearData}
                setAllYearData={setAllYearData}
                token={token}
            />
        </>
    );
};
export default YarnManagementSystem;
