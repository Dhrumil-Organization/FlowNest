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
import AddWeftIssueItemDetail from './AddWeftIssueItemDetail';
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

type YarnIssueItem = {
    UId: string;
    IssNo: string;
    IssDate: string;
    CreelId: string;
    Remark: string;
    Shift: string;
    StkType: string;
    CreelQty: string;
};

const WftIssue: React.FC<Props> = ({ token, navigation, isConnected, username }) => {
    const { hasPermission, requestPermission } = useCameraPermission();
    const [isLoading, setIsLoading] = useState(false);
    const [getDataSaved, setDataSaved] = useState(false)
    const [setupDate, setSetupDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [isItemdetailvisible, setisItemdetailvisible] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const [getAllPropertyData, setAllPropertyData] = useState([]);
    const [FormState, setFormState] = useState({
        values: {
            PrpCode: '',
            YearNo: '',
            fromdate: '',
            IssDate: '',
            todate: '',
            d1: [],
            d2: [],
            ItmCode: '',
            ItmName: '',
            srno: '',
            ExpProdQty: '',
            LngName: '',
            YearName: '',
            BeamNo: '',
            BeamUId: '',
            IssNo: ''
        }
    });
    const [getAllYearData, setAllYearData] = useState([]);
    const [itemdata, setitemdata] = useState([]);
    const [data, setdata] = useState<YarnIssueItem[]>([]);
    const [filteredData, setFilteredData] = useState<YarnIssueItem[]>([]);
    const [isItemVisible, setIsItemVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [mainUId, setMainUId] = useState(null);
    const [editData, setEditData] = useState(null);
    const [cartonSummary, setCartonSummary] = useState([]);
    // const [filteredData, setFilteredData] = useState([]);
    console.log("getallpropertydata", getAllPropertyData)

    console.log("FormState.values", FormState.values);
    console.log("data", data);

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

    const getToken = () => {
        return token;
    };

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

    const itemdetaildraweropen = () => setisItemdetailvisible(true);
    const itemdetaildrawerclose = () => setisItemdetailvisible(false);

    const openItemDrawer = () => setIsItemVisible(true);
    const closeItemDrawer = () => setIsItemVisible(false);

    useEffect(() => {
        if (!searchText) {
            setFilteredData(data);
        } else {
            const filtered = data.filter(item =>
                item.IssNo?.toLowerCase().includes(searchText.toLowerCase()) ||
                item.CreelId?.toLowerCase().includes(searchText.toLowerCase()) ||
                item.Remark?.toLowerCase().includes(searchText.toLowerCase())
            );
            setFilteredData(filtered);
        }
    }, [searchText, data]);



    // useEffect(() => {
    //     requestPermission();
    // }, []);

    const handleLoadPress = () => {
        fetchbrowse()
        setIsDrawerVisible(false);
    };

    // const handleViewClick = async () => {
    //     try {
    //         setIsLoading(true);

    //         const payload = {
    //             uid: mainUId,
    //             prpcode: FormState.values.PrpCode,
    //             strcode: '002',
    //             yearno: FormState.values.YearNo,
    //             txntype: 'creel_yarn_issue',
    //         };

    //         console.log("SHOW PAYLOAD (Drawer):", payload);

    //         const response = await axios.post(
    //             `${API}/api/get_yarn_issue_show`,
    //             payload,
    //             {
    //                 headers: {
    //                     Authorization: `Bearer ${token}`,
    //                     'Content-Type': 'application/json',
    //                 }
    //             }
    //         );

    //         console.log("response", response)

    //         // if (response?.data?.success) {
    //         //     const resData = response.data.response;

    //         //     // 🔥 yaha tera mapping logic dal
    //         //     // d1, d2, cartonSummary etc.

    //         //     setIsEditMode(true);   // already true but safe
    //         // }

    //         if (response?.data?.success) {

    //             const resData = response.data.response;

    //             const d1 = resData.d1 || [];
    //             const d2 = resData.d2 || [];

    //             const mainData = resData.main || [];
    //             if (mainData.length > 0) {
    //                 setCreelId(mainData[0].BatchNo || '');
    //             }

    //             // const mappedData = d2.map(d2Item => {
    //             //     const d1Item = d1.find(
    //             //         x => String(x.SrNo) === String(d2Item.SrNo)
    //             //     ) || {};

    //             const d1Map = {};
    //             d1.forEach(item => {
    //                 d1Map[String(item.SrNo)] = item;
    //             });

    //             const mappedData = d2
    //                 .filter(d2Item => d1Map[String(d2Item.SrNo)])
    //                 .map(d2Item => {
    //                     const d1Item = d1Map[String(d2Item.SrNo)];

    //                     return {
    //                         cartonNo: d2Item.CartNo || '',
    //                         qty: d2Item.Qty || '',
    //                         chees: d2Item.Chees || '',

    //                         PUId: d2Item.PUId || '',
    //                         PSrNo: d2Item.PSrNo || '',
    //                         PSubSr: d2Item.PSubSr || '',
    //                         TranType: d2Item.TranType || '',
    //                         d2SrNo: String(d2Item.SrNo || ''),

    //                         ItmCode: d1Item.ItmCode || '',
    //                         ItmName: d1Item.ItmName || '',
    //                         MerCode: d1Item.MerCode || '',
    //                         MerName: d1Item.MerName || '',
    //                         GrdCode: d1Item.GrdCode || '',
    //                         GrdName: d1Item.GrdName || '',
    //                         ShdCode: d1Item.ShdCode || '',
    //                         ShdName: d1Item.ShdName || '',
    //                         Denier: d1Item.Denier || '',
    //                         d1SrNo: String(d1Item.SrNo || ''),
    //                         UId: d1Item.UId || '',
    //                         yearNo: FormState.values.YearNo || ''
    //                     };
    //                 });

    //             setCartonSummary(mappedData);

    //             console.log("mappedData", mappedData, cartonSummary);

    //             // setCartonSummary(mappedData);
    //             setSelectedCreel(payload);
    //             // setSelectedCreel({
    //             //     UId: item.UId
    //             // });
    //             setIsEditMode(true);
    //             setMainUId(item.UId);
    //         } else {
    //             Alert.alert("Error", "No data found");
    //         }

    //     } catch (err) {
    //         console.log("SHOW ERROR:", err);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    const fetchbrowse = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken.current) {
                cancelToken.current.cancel("Cancelled previous request");
            }
            cancelToken.current = axios.CancelToken.source();

            const payload = {
                prptype: userPtype,
                prpcode: FormState.values.PrpCode,
                strcode: '002',
                yearno: FormState.values.YearNo,
                txntype: 'beam_weft_issue',
                // txntype: 'creel_yarn_issue',
                fromdate: FormState.values.fromdate,
                todate: FormState.values.todate,
                status: ''
            };

            console.log("browse historyPayload:", payload);

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const response = await axios.post(`${API}/api/get_yarn_issue_browse`, payload, { headers });
            console.log("browse API Response:", response);

            const data = response?.data?.response?.data || [];
            if (response?.data?.success && response?.data?.response?.data?.length > 0) {
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

    const handleViewClick = async (item) => {
        if (!item) return;

        try {
            setIsLoading(true);

            const payload = {
                uid: item.UId,
                prpcode: FormState.values.PrpCode || item.PrpCode,
                strcode: '002',
                yearno: FormState.values.YearNo,
                txntype: 'beam_weft_issue',
            };

            console.log("SHOW PAYLOAD:", payload);

            const response = await axios.post(
                `${API}/api/get_yarn_issue_show`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            console.log("response", response);

            if (response?.data?.success) {

                const resData = response.data.response;

                const d1 = resData.d1 || [];
                const d2 = resData.d2 || [];
                const mainData = resData.main || [];
                const mainItem = mainData[0] || {};

                // 🔥 ✅ MAIN FORMSTATE SET (IMPORTANT)
                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        UId: mainItem.UId || '',
                        PrpCode: mainItem.PrpCode || '',
                        IssNo: mainItem.IssNo || '',
                        IssDate: mainItem.IssDate || '',
                        Remark: mainItem.Remark || '',
                        BatchNo: mainItem.BatchNo || '',
                        RecipeUId: mainItem.RecipeUId || '',
                        BeamUId: mainItem.BeamUId || '',
                        DsnCode: mainItem.DsnCode || '',
                        month: mainItem.month || '',
                        suffix: mainItem.suffix || '',
                        yarnstrcode: mainItem.yarnstrcode || ''
                    }
                }));

                // 🔥 mapping logic
                const d1Map = {};
                d1.forEach(x => {
                    d1Map[String(x.SrNo)] = x;
                });

                const mappedData = d2
                    .filter(d2Item => d1Map[String(d2Item.SrNo)])
                    .map(d2Item => {
                        const d1Item = d1Map[String(d2Item.SrNo)];

                        return {
                            cartonNo: d2Item.CartNo || '',
                            qty: d2Item.Qty || '',
                            chees: d2Item.Chees || '',
                            DsnRcpSrNo: d2Item.DsnRcpSrNo || '',
                            RecipeUId: d2Item.RecipeUId || '',
                            PUId: d2Item.PUId || '',
                            PSrNo: d2Item.PSrNo || '',
                            PSubSr: d2Item.PSubSr || '',
                            TranType: d2Item.TranType || '',
                            d2SrNo: String(d2Item.SrNo || ''),
                            UId: d2Item.UId,
                            SrNo: d2Item.SrNo,
                            SubSr: d2Item.SubSr,
                            BalQty: d2Item.BalQty,
                            ProdType: d2Item.ProdType,
                            ExpProdQty: d2Item.ExpProdQty,

                            ItmCode: d1Item.ItmCode || '',
                            ItmName: d1Item.ItmName || '',
                            MerCode: d1Item.MerCode || '',
                            MerName: d1Item.MerName || '',
                            GrdCode: d1Item.GrdCode || '',
                            GrdName: d1Item.GrdName || '',
                            ShdCode: d1Item.ShdCode || '',
                            ShdName: d1Item.ShdName || '',
                            Denier: d1Item.Denier || '',

                            d1SrNo: String(d1Item.SrNo || ''),
                            UId: d1Item.UId || '',
                            yearNo: FormState.values.YearNo || '',
                        };
                    });

                console.log("mapped data", mappedData)
                setEditData({
                    cartonSummary: mappedData,
                    creelId: mainData[0]?.BatchNo || '',
                    mainData: mainItem,
                    payload: payload
                });
                setIsEditMode(true);
                setMainUId(item.UId);
                // setIsDetailVisible(true);
            } else {
                Alert.alert("Error", "No data found");
            }

        } catch (err) {
            console.log("SHOW ERROR:", err);
        } finally {
            setIsLoading(false);
        }
    };


    const resetAllData = () => {
        setFormState({
            values: {
                PrpCode: '',
                YearNo: '',
                fromdate: '',
                IssDate: '',
                todate: '',
                d1: [],
                d2: [],
                ItmCode: '',
                ItmName: '',
                srno: '',
                ExpProdQty: '',
                LngName: '',
                YearName: '',
                BeamNo: '',
                BeamUId: '',
                DsnCode: '',
                DsnName: '',
                Remark: '',
                BatchNo: '',
                suffix: '',
                month: '',
                yarnstrcode: ''
            }
        });

        setEditData(null);
        setIsEditMode(false);
        setMainUId(null);
    };
    const resetDrawerStates = () => {
        setCartonSummary([]);
        // setSelectedItem(null);
        setSelectedYear(null);
    };
    const closeAllDrawers = () => {
        setIsItemVisible(false);         // item drawer
        setisItemdetailvisible(false);   // item detail drawer
        setIsDetailVisible(false);
        resetAllData();
        resetDrawerStates();       // detail drawer (agar hai)
    };

    return (
        <>
            {isLoading && <FullScreenLoader />}

            <HeaderBarwithBack
                userName={username}
                header={'Weft Issue'}
                subHeader={'Issue and manage weft yarn for production'}
            />

            <View style={styles.searchContainer}>
                <Icon name="search" size={16} color="#000" style={{ marginRight: 8 }} />
                <TextInput
                    placeholder="Search here..."
                    value={searchText}
                    onChangeText={setSearchText}
                    style={styles.searchInput}
                />

                <TouchableOpacity style={styles.filterIcon} onPress={openDrawer}>
                    <Icon name="filter-list" size={22} color="#333" />
                </TouchableOpacity>
            </View>

            {filteredData.length > 0 && (
                <View style={styles.filterInfoContainer}>
                    <View style={styles.infoRow}>
                        <Icon name="business" size={16} color="#0f766e" />
                        <Text style={styles.infoText}>
                            {FormState.values.LngName || 'Select Property'}
                        </Text>

                        <TouchableOpacity onPress={openDrawer}>
                            <Icon name="edit" size={16} color="#0f766e" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.yearBox}>
                        <Icon name="calendar-today" size={14} color="#0f766e" />
                        <Text style={styles.yearText}>
                            {FormState.values.YearName || 'Select Year'}
                        </Text>
                    </View>
                </View>
            )}

            {/* 📋 LIST */}
            <FlatList<YarnIssueItem>
                data={filteredData}
                keyExtractor={(item) => item.UId}
                contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={styles.card}>

                        {/* HEADER */}
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.voucher}>{item.IssNo}</Text>
                                <Text style={styles.subText}>
                                    Beam No: {item.BeamNo}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.middleRow}>
                            <Text style={styles.label}>Design: {item.DsnName}</Text>
                        </View>

                        <View style={styles.bottomRow}>
                            <Text style={styles.smallBox}>{item.IssDate}</Text>
                            <Text style={styles.smallBox}>Qty: {item.CreelQty}</Text>

                            <TouchableOpacity style={styles.editBtn}
                                onPress={() => {
                                    setIsEditMode(true);
                                    setMainUId(item.UId);
                                    itemdetaildraweropen();
                                }}
                            >
                                <Icon name="edit" size={18} color="#2563eb" />
                            </TouchableOpacity>

                            {/* <TouchableOpacity style={styles.deleteBtn}>
                                <Icon name="delete" size={18} color="red" />
                            </TouchableOpacity> */}
                        </View>

                    </View>
                )}

                ListEmptyComponent={
                    !isLoading ? (
                        <Text style={{ textAlign: 'center', marginTop: 40 }}>
                            No Data Found
                        </Text>
                    ) : null
                }
            />

            <TouchableOpacity style={yarnmanagementsystemstyle.fabAdd} onPress={detailopenDrawer}>
                <Icon name="add" size={20} color="#fff" />
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

            <AddWeftIssueDetail
                isVisible={isDetailVisible}
                onClose={detailcloseDrawer}
                onNext={itemdetaildraweropen}
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
                isEditMode={isEditMode}
                mainUId={mainUId}
                editData={editData}
                isItemdetailvisible={isItemdetailvisible}
            />

            <AddWeftIssueItemDetail
                isVisible={isItemdetailvisible}
                onClose={itemdetaildrawerclose}
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
                isEditMode={isEditMode}
                mainUId={mainUId}
                handleclick={handleViewClick}
                editData={editData}
            />

            <WeftIssueItemDrawer
                isVisible={isItemVisible}
                onClose={closeItemDrawer}
                FormState={FormState}
                setFormState={setFormState}
                token={token}
                isEditMode={isEditMode}
                mainUId={mainUId}
                editData={editData}
                closeAllDrawers={closeAllDrawers} // 🔥 yahi pass hoga
            />
        </>
    );
};
export default WftIssue;
const styles = StyleSheet.create({

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 10,
        backgroundColor: '#ffff',
        borderRadius: 10,
        paddingHorizontal: 10
    },

    searchInput: {
        flex: 1,
        height: 45,
        color: '#000'
    },

    filterIcon: {
        padding: 5
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        elevation: 3
    },

    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },

    voucher: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#000'
    },

    subText: {
        color: '#000',
        fontSize: 12
    },

    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },

    middleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        backgroundColor: '#f1f5f9',
        padding: 10,
        borderRadius: 8
    },

    label: {
        fontSize: 13,
        color: '#000'
    },

    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        justifyContent: 'space-between'
    },

    smallBox: {
        backgroundColor: '#e5e7eb',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        fontSize: 12,
        color: '#000'
    },

    editBtn: {
        backgroundColor: '#e0f2fe',
        padding: 8,
        borderRadius: 6
    },

    deleteBtn: {
        backgroundColor: '#fee2e2',
        padding: 8,
        borderRadius: 6
    },

    filterInfoContainer: {
        marginHorizontal: 10,
        marginBottom: 10
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ecfeff',
        padding: 10,
        borderRadius: 10
    },

    infoText: {
        flex: 1,
        marginLeft: 8,
        color: '#000',
        fontSize: 13
    },

    yearBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#ecfeff',
        padding: 8,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },

    yearText: {
        marginLeft: 6,
        fontSize: 12,
        color: '#000'
    },

});
