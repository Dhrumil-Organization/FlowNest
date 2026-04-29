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
import AddWeftIssueDetail from './AddWeftIssueDetail';
import WeftIssueItemDrawer from './WeftIssueItemDrawer';

import { fetchAllPropertyData, fetchAllYeardata } from '../../common/API/Functions';
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

const WftIssue: React.FC<Props> = ({ token, navigation, isConnected, username }) => {
    const { hasPermission, requestPermission } = useCameraPermission();
    const [isLoading, setIsLoading] = useState(false);
    const [getDataSaved, setDataSaved] = useState(false)
    const [setupDate, setSetupDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const [getAllPropertyData, setAllPropertyData] = useState([]);
    const [FormState, setFormState] = useState({
        values: {
            PrpCode: '',
            YearNo: '',
            fromdate: '',
            IssDate: new Date().toISOString(),
            todate: '',
            d1: [],
            d2: []
        }
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
    const [blendList, setBlendList] = useState([
        {
            id: '',
            name: '',
            per: ''
        }
    ]);
    const [getAllYearData, setAllYearData] = useState([]);
    const [activeTab, setActiveTab] = useState('Spun');
    const [selectedcount, setselectedcount] = useState([]);
    const [selectedply, setselectedply] = useState([]);
    const [selectedothers, setselectedothers] = useState([]);
    const [itemdata, setitemdata] = useState([]);
    const [selectedsubitem, setselectedsubitem] = useState([]);
    const [data, setdata] = useState([]);
    const [selectedmitem, setselectedmitem] = useState([]);
    const [showSubItemCard, setShowSubItemCard] = useState(false);
    const [isItemVisible, setIsItemVisible] = useState(false);

    console.log("FormState.values", FormState.values);

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


    useEffect(() => {
        const loadProperty = async () => {
            const allprpdata = await fetchAllPropertyData(token);
            setAllPropertyData(allprpdata);
        };
        loadProperty();
    }, []);

    useEffect(() => {
        if (typeof FormState.values.PrpCode != 'undefined' && FormState.values.PrpCode != null && FormState.values.PrpCode != '') {
            const testFinct = async () => {
                const allyeardata = await fetchAllYeardata(token, FormState.values.PrpCode)
                setAllYearData(allyeardata)
            }
            testFinct();
        }
    }, [FormState.values.PrpCode])

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    const detailopenDrawer = () => setIsDetailVisible(true);
    const detailcloseDrawer = () => setIsDetailVisible(false);

    const openItemDrawer = () => setIsItemVisible(true);
    const closeItemDrawer = () => setIsItemVisible(false);



    useEffect(() => {
        requestPermission();
    }, []);

    const soshow = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');

        try {
            setIsLoading(true);

            const source = axios.CancelToken.source();

            const historyPayload = {
                prptype: userPtype,
                return_json_data: "1"
            };

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

    const handleLoadPress = () => {
        setIsDrawerVisible(false);
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



    return (
        <>
            {isLoading && <FullScreenLoader />}

            <HeaderBarwithBack
                userName={username}
                header={'Weft Issue'}
                subHeader={'Issue and manage weft yarn for production'}
            />

            <TouchableOpacity style={yarnmanagementsystemstyle.fabAdd} onPress={detailopenDrawer}>
                <Icon name="add" size={20} color="#fff" />
            </TouchableOpacity>

            <AddWeftIssueDetail
                isVisible={isDetailVisible}
                onClose={detailcloseDrawer}
                onNext={openItemDrawer}
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
                navigation={navigation}
            />

            <TouchableOpacity style={yarnmanagementsystemstyle.fab} onPress={openDrawer}>
                <Icon name="list" size={20} color="#fff" />
            </TouchableOpacity>

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

            <WeftIssueItemDrawer
                isVisible={isItemVisible}
                onClose={closeItemDrawer}
                FormState={FormState}
                setFormState={setFormState}
                token={token}
            />
        </>
    );
};
export default WftIssue;
