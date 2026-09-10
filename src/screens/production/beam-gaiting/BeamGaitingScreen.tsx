import { API } from '@/src/api/client';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    TextInput as RNTextInput,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import AddBeamGaiting from './AddBeamGaiting';
import CustomDrawer from './CustomDrawer';
// import HeaderBar from '../HeaderBar/HeaderBar';
const theme = { BRAND_GRADIENT_START: '#1D4ED8', BRAND_GRADIENT_END: '#0F766E' };     
// import { ExeData, DesignData, ItemData, POTData, ItemStatus, CardPayload } from './Modal';
import { fetchAllYeardata } from '@/src/api/legacyFunctions';

const { width } = Dimensions.get('window');
const isTablet = width >= 600;

interface Party {
    parcode: string;
    partyname: string;
    noof: string;
    totmtr: string;
    pendingmtr: string;
    amount: string;
    pendingamt: string;
}

export const BeamGaitingScreen: React.FC<{ token: string, username?: string }> = ({ token, username }) => {
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [salessumdata, setsalessumdata] = useState([]);
    const [salesdata, setsalesdata] = useState<Party[]>([]);
    const [salesdataTotal, setsalesdataTotal] = useState<number | null>(null);
    const itemsPerPage = 10;
    const [isLoading, setIsLoading] = useState(false);
    const [txntype, settxntype] = useState('purchase_order_track')
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [beamdetailvisible, setbeamdetailvisible] = useState(false);
    const [toDate, setToDate] = useState<Date>(new Date());
    const [getAllYearData, setAllYearData] = useState([]);
    // const [getpayload, setPayload] = useState<CardPayload[]>([]);
    const flatListRef = useRef<FlatList>(null);
    const { width: screenWidth } = useWindowDimensions();
    const [FormState, setFormState] = useState({
        values: {
            YearNo: '',
            VouDate: new Date().toISOString(),
            BStTime: new Date().toISOString(),
            BEndTime: new Date().toISOString(),
            MacCode: '',
            MacName: '',
            UBeamNo: '',
            BeamLength: '',
            BeamUId: '',
            PrpCodefromBeam: '',
            EmpCode: '',
            EmpName: '',
            OprCode: '',
            OprName: '',
            SupCode: '',
            SupName: '',
            BeamNo: '',
            WarpLen: '',
            PrpCode: '',
            UId: '',
            VouNo: '',
            PlanUId: '',
            PlanSrNo: '',
            BeamSrNo: '',
            BStDate: new Date(),
            BEndDate: new Date(),
            BEmpCode: '',
            ShfCode: '',
            CutLen: '',
            Status: '',
            UsrCode: '',
            LastDate: '',
            LastTime: '',
            CAuthBy: '',
            CUsrCode: '',
            CLastDate: '',
            CLastTime: '',
            UUsrCode: '',
            ULastDate: '',
            ULastTime: '',
            ExTag: '',
            ImTag: '',
            SiteCode: '',
            USiteCode: '',
            IsAuth: '',
            AUsrCode: '',
            ALastDate: '',
            ALastTime: '',
            lycuidcnt: '',
            lytotcqty: '',
            lytotcwt: '',
            month: '',
            suffix: '',
            yearno: '',
            prptype: '',
            strcode: '',
            txntype: '',
            BEmpName: ''
        }
    });
    const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
    const [beamdata, setbeamdata] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedFilter, setSelectedFilter] = useState([]);

    let cancelToken: any;

    console.log("selectedYear", getAllYearData);
    console.log("FormState.values", FormState.values.YearNo);



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
        if(!token) return;
        const PRP_CODE = "SIP";
        const testFinct = async () => {
            const allyeardata = await fetchAllYeardata(token, PRP_CODE);
            setAllYearData(allyeardata);
        };

        testFinct();
    }, [token]);

    const handleConfirmAction = async () => {
        setIsLoading(true);

        try {
            const allyeardata = await fetchAllYeardata(token, FormState.values.PrpCode);
            setAllYearData(allyeardata);
            await fatchAllBeamDetailData();
        } catch (e) {
            console.log("Error", e);
        } finally {
            setIsLoading(false);
            closeDrawer();
        }
    };

    const handleBeamConfirm = async () => {
        setIsLoading(true);
        await fatchAllBeamDetailData();
    };

    const fatchAllBeamDetailData = async () => {
         const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();
            const historyPayload = {
                prptype: userPtype,
                yearno: FormState.values.YearNo ,
                txntype: 'beam_gaiting_detail',
            };
            console.log("Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/prodbeamdetailbrowsesudo`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("browse API Response:", response);
            const data = response?.data?.data || [];
            if (response?.data?.success && data.length > 0) {
                setbeamdata(data);
            } else {
                setbeamdata([]);
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

    // useFocusEffect(
    //     useCallback(() => {
    //         setIsDrawerVisible(true);
    //     }, [])
    // );

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    const openbeamdetail = () => setbeamdetailvisible(true);
    const closebeamdetail = () => setbeamdetailvisible(false);

    const getGridConfig = () => {
        const padding = 12;
        if (screenWidth < 600) {
            return { numColumns: 1, cardWidth: screenWidth - (padding * 2) };
        } else if (screenWidth < 900) {
            return { numColumns: 2, cardWidth: (screenWidth - (padding * 3)) / 2 };
        } else if (screenWidth < 1200) {
            return { numColumns: 3, cardWidth: (screenWidth - (padding * 4)) / 3 };
        } else if (screenWidth < 1500) {
            return { numColumns: 4, cardWidth: (screenWidth - (padding * 5)) / 4 };
        } else {
            return { numColumns: 5, cardWidth: (screenWidth - (padding * 6)) / 5 };
        }
    };

    // const filteredData = beamdata.filter(item =>
    //     item.MacName?.toLowerCase().includes(searchText.toLowerCase()) ||
    //     item.BeamNo?.toString().includes(searchText) ||
    //     item.PrpCode?.toLowerCase().includes(searchText.toLowerCase()) ||
    //     item.DsnName?.toLowerCase().includes(searchText.toLowerCase())
    // );

    // const filteredData = beamdata.filter(item => {
    //     const matchesSearch =
    //         item.MacName?.toLowerCase().includes(searchText.toLowerCase()) ||
    //         item.BeamNo?.toString().includes(searchText) ||
    //         item.PrpCode?.toLowerCase().includes(searchText.toLowerCase()) ||
    //         item.DsnName?.toLowerCase().includes(searchText.toLowerCase());

    //     if (!matchesSearch) return false;
    //     const isRunning = item.Status === '0' && item.BeamNo !== '';
    //     const isCompleted = item.Status === '1';
    //     const isBeamGaiting = item.Status === '-3';
    //     const isEmptyMachine = item.Status === '0' && item.BeamNo === '';

    //     if (!selectedFilter) return true;

    //     if (selectedFilter === 'running') return isRunning;
    //     if (selectedFilter === 'completed') return isCompleted;
    //     if (selectedFilter === 'beamGaiting') return isBeamGaiting;
    //     if (selectedFilter === 'emptyMachine') return isEmptyMachine;

    //     return true;

    // });

    const filteredData = beamdata.filter(item => {

        // 🔍 SEARCH
        const matchesSearch =
            item.MacName?.toLowerCase().includes(searchText.toLowerCase()) ||
            item.BeamNo?.toString().includes(searchText) ||
            item.PrpCode?.toLowerCase().includes(searchText.toLowerCase()) ||
            item.DsnName?.toLowerCase().includes(searchText.toLowerCase());

        if (!matchesSearch) return false;

        // 🎯 STATUS CONDITIONS
        const isRunning = item.Status === '0' && item.BeamNo !== '';
        const isCompleted = item.Status === '1';
        const isBeamGaiting = item.Status === '-3';
        const isEmptyMachine = item.Status === '0' && item.BeamNo === '';

        // ✅ IMPORTANT: NO FILTER SELECTED → SHOW ALL (335 rows)
        if (!selectedFilter || selectedFilter.length === 0) {
            return true;
        }

        // ✅ MULTIPLE FILTER MATCH
        return (
            (selectedFilter.includes('running') && isRunning) ||
            (selectedFilter.includes('completed') && isCompleted) ||
            (selectedFilter.includes('beamGaiting') && isBeamGaiting) ||
            (selectedFilter.includes('emptyMachine') && isEmptyMachine)
        );

    });

    useEffect(() => {
        getGridConfig();
    }, [screenWidth]);

    const columnWidth = {
        sn: 45,
        machine: 130,
        location: 68,
        property: 75,
        beam: 80,
        design: 120,
        reed: 60,
        picks: 60,
        length: 100,
        balance: 110,
        taka: 80,
        meters: 90,
        weight: 90
    };

    const getRowStyle = (item) => {
        if (item.Status === '0' && item.BeamNo === '') {
            return { backgroundColor: 'gray' };
        } else if (item.Status === '1') {
            return { backgroundColor: 'rgb(178 178 255)' };
        } else if (item.Status === '-3') {
            return { backgroundColor: '#90ee90' };
        }
        return {};

    };

    // const getRowStyle = (item) => {

    //     const isRunning = item.Status === '0' && item.BeamNo !== '';
    //     const isCompleted = item.Status === '1';
    //     const isBeamGaiting = item.Status === '-3';
    //     const isEmptyMachine = item.Status === '0' && item.BeamNo === '';

    //     // 🎯 SAME COLOR LOGIC FOR ALL + FILTER
    //     if (isRunning) {
    //         return { backgroundColor: '#ffffff' };
    //     }

    //     if (isCompleted) {
    //         return { backgroundColor: '#b2b2ff' };
    //     }

    //     if (isBeamGaiting) {
    //         return { backgroundColor: '#90ee90' };
    //     }

    //     if (isEmptyMachine) {
    //         return { backgroundColor: '#6d6b6b' };
    //     }

    //     return {};
    // };

    // const toggleFilter = (key) => {
    //     setFilters(prev => ({
    //         ...prev,
    //         [key]: !prev[key]
    //     }));
    // };

    return (
        <>
            {/* {isLoading && <FullScreenLoader />} */}

            <RNTextInput
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 8,
                    padding: 10,
                    margin: 10,
                    backgroundColor: '#fff',
                    color: '#000'
                }}
                placeholder="Search Machine / Beam / Property"
                value={searchText}
                onChangeText={(text) => setSearchText(text)}
            />
            {!isLoading && beamdata.length == 0 && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        No request data found!
                    </Text>

                    {
                        !FormState?.values?.YearNo ? (
                            <Text style={styles.emptyTextRed}>
                                Please Select Year
                            </Text>
                        ) : null
                    }
                </View>
            )}
            <View style={{ flex: 1 }}>

                {/* 🔍 SEARCH BAR (FIXED) */}


                {/* <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 10,
                        marginBottom: 10,
                        alignItems: 'center'
                    }}
                >
                    {[
                        { key: 'running', label: 'Running', color: '#ffffff' },
                        { key: 'completed', label: 'Completed', color: '#b2b2ff' },
                        { key: 'beamGaiting', label: 'Beam Gaiting', color: '#90ee90' },
                        { key: 'emptyMachine', label: 'Empty Machine', color: '#808080' }
                    ].map((item) => (
                        <TouchableOpacity
                            key={item.key}
                            // onPress={() => setSelectedFilter(item.key)}
                            onPress={() => {
                                setSelectedFilter(prev => {
                                    if (prev.includes(item.key)) {
                                        return prev.filter(f => f !== item.key);
                                    } else {
                                        return [...prev, item.key];
                                    }
                                });
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: selectedFilter.includes(item.key) ? item.color : '#fff',
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                marginRight: 8,
                                borderRadius: 6
                            }}
                        >
                            <View style={{
                                width: 14,
                                height: 14,
                                backgroundColor: item.color,
                                marginRight: 5
                            }} />
                            <Text style={{ color: '#000' }}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView> */}
                {/* <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>                        
                        <View style={styles.headerRow}>
                            <Text style={[styles.header, { width: columnWidth.sn }]}>SN</Text>
                            <Text style={[styles.header, { width: columnWidth.machine }]}>Machine</Text>
                            <Text style={[styles.header, { width: columnWidth.location }]}>Location</Text>
                            <Text style={[styles.header, { width: columnWidth.property }]}>Property</Text>
                            <Text style={[styles.header, { width: columnWidth.beam }]}>Beam No</Text>
                            <Text style={[styles.header, { width: columnWidth.design }]}>Design</Text>
                            <Text style={[styles.header, { width: columnWidth.reed }]}>Reed</Text>
                            <Text style={[styles.header, { width: columnWidth.picks }]}>Picks</Text>
                            <Text style={[styles.header, { width: columnWidth.length }]}>Length</Text>
                            <Text style={[styles.header, { width: columnWidth.balance }]}>Balance</Text>
                            <Text style={[styles.header, { width: columnWidth.taka }]}>Taka</Text>
                            <Text style={[styles.header, { width: columnWidth.meters }]}>Meters</Text>
                            <Text style={[styles.header, { width: columnWidth.weight }]}>Weight</Text>
                        </View>
                        <FlatList
                            data={filteredData}
                            keyExtractor={(item, index) => index.toString()}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                            style={{ maxHeight: '75%' }}
                            renderItem={({ item, index }) => (
                                <View style={[styles.row, getRowStyle(item)]}>
                                    <Text style={[styles.cell, { width: columnWidth.sn }]}>{index + 1}</Text>
                                    <Text style={[styles.cell, { width: columnWidth.machine }]}>{item.MacName}</Text>
                                    <Text style={[styles.cell, { width: columnWidth.location }]}>{item.Location}</Text>
                                    <Text style={[styles.cell, { width: columnWidth.property }]}>{item.PrpCode}</Text>
                                    <Text style={[styles.cell, { width: columnWidth.beam }]}>{item.BeamNo}</Text>
                                    <Text style={[styles.cell, { width: columnWidth.design }]}>{item.DsnName}</Text>
                                    <Text style={[styles.cell, { width: columnWidth.reed }]}>{item.ReedCount}</Text>
                                    <Text style={[styles.cell, { width: columnWidth.picks }]}>{item.Picks}</Text>
                                    <Text style={[styles.cell, { width: columnWidth.length }]}>{item.WarpLen}</Text>

                                    <Text style={[
                                        styles.cell,
                                        { width: columnWidth.balance },
                                        { backgroundColor: item.BalLen <= 0 ? '#ff7272' : '#fff' }
                                    ]}>
                                        {item.BalLen}
                                    </Text>

                                    <Text style={[styles.cell, { width: columnWidth.taka }]}>{item.CheckedTaka}</Text>
                                    <Text style={[styles.cell, { width: columnWidth.meters }]}>{item.CheckedQty}</Text>
                                    <Text style={[styles.cell, { width: columnWidth.weight }]}>{item.CheckedWt}</Text>

                                </View>
                            )}
                        />
                    </View>
                </ScrollView> */}

                {!isLoading && beamdata.length > 0 && (
                    <>
                        {/* <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingHorizontal: 10,
                                marginBottom: 10,
                                alignItems: 'center'
                            }}
                        >
                            {[
                                { key: 'running', label: 'Running', color: '#ffffff' },
                                { key: 'completed', label: 'Completed', color: '#b2b2ff' },
                                { key: 'beamGaiting', label: 'Beam Gaiting', color: '#90ee90' },
                                { key: 'emptyMachine', label: 'Empty Machine', color: '#808080' }
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    // onPress={() => setSelectedFilter(item.key)}
                                    onPress={() => {
                                        setSelectedFilter(prev => {
                                            if (prev.includes(item.key)) {
                                                return prev.filter(f => f !== item.key);
                                            } else {
                                                return [...prev, item.key];
                                            }
                                        });
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: selectedFilter.includes(item.key) ? item.color : '#fff',
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        marginRight: 8,
                                        borderRadius: 6
                                    }}
                                >
                                    <View style={{
                                        width: 14,
                                        height: 14,
                                        backgroundColor: item.color,
                                        marginRight: 5
                                    }} />
                                    <Text style={{ color: '#000' }}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView> */}

                        {/* 🔥 COLOR FILTER (FIXED - NOT SCROLLING) */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingHorizontal: 10,
                                marginBottom: 10,
                                alignItems: 'center'
                            }}
                        >
                            {[
                                { key: 'running', label: 'Running', color: '#ffffff' },
                                { key: 'completed', label: 'Completed', color: '#b2b2ff' },
                                { key: 'beamGaiting', label: 'Beam Gaiting', color: '#90ee90' },
                                { key: 'emptyMachine', label: 'Empty Machine', color: '#808080' }
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    onPress={() => {
                                        setSelectedFilter(prev => {
                                            if (prev.includes(item.key)) {
                                                return prev.filter(f => f !== item.key);
                                            } else {
                                                return [...prev, item.key];
                                            }
                                        });
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: selectedFilter.includes(item.key) ? item.color : '#fff',
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        marginRight: 8,
                                        borderRadius: 6
                                    }}
                                >
                                    <View style={{
                                        width: 14,
                                        height: 14,
                                        backgroundColor: item.color,
                                        marginRight: 5
                                    }} />
                                    <Text style={{ color: '#000' }}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <ScrollView horizontal showsHorizontalScrollIndicator>
                            <View>

                                {/* HEADER */}
                                <View style={styles.headerRow}>
                                    <Text style={[styles.header, { width: columnWidth.sn }]}>SN</Text>
                                    <Text style={[styles.header, { width: columnWidth.machine }]}>Machine</Text>
                                    <Text style={[styles.header, { width: columnWidth.location }]}>Location</Text>
                                    <Text style={[styles.header, { width: columnWidth.property }]}>Property</Text>
                                    <Text style={[styles.header, { width: columnWidth.beam }]}>Beam No</Text>
                                    <Text style={[styles.header, { width: columnWidth.design }]}>Design</Text>
                                    <Text style={[styles.header, { width: columnWidth.reed }]}>Reed</Text>
                                    <Text style={[styles.header, { width: columnWidth.picks }]}>Picks</Text>
                                    <Text style={[styles.header, { width: columnWidth.length }]}>Length</Text>
                                    <Text style={[styles.header, { width: columnWidth.balance }]}>Balance</Text>
                                    <Text style={[styles.header, { width: columnWidth.taka }]}>Taka</Text>
                                    <Text style={[styles.header, { width: columnWidth.meters }]}>Meters</Text>
                                    <Text style={[styles.header, { width: columnWidth.weight }]}>Weight</Text>
                                </View>

                                {/* DATA */}
                                <FlatList
                                    data={filteredData}
                                    keyExtractor={(item, index) => index.toString()}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                    style={{ maxHeight: '81%' }}
                                    renderItem={({ item, index }) => (
                                        <View style={[styles.row, getRowStyle(item)]}>
                                            <Text style={[styles.cell, { width: columnWidth.sn }]}>{index + 1}</Text>
                                            <Text style={[styles.cell, { width: columnWidth.machine }]}>{item.MacName}</Text>
                                            <Text style={[styles.cell, { width: columnWidth.location }]}>{item.Location}</Text>
                                            <Text style={[styles.cell, { width: columnWidth.property }]}>{item.PrpCode}</Text>
                                            <Text style={[styles.cell, { width: columnWidth.beam }]}>{item.BeamNo}</Text>
                                            <Text style={[styles.cell, { width: columnWidth.design }]}>{item.DsnName}</Text>
                                            <Text style={[styles.cell, { width: columnWidth.reed }]}>{item.ReedCount}</Text>
                                            <Text style={[styles.cell, { width: columnWidth.picks }]}>{item.Picks}</Text>
                                            <Text style={[styles.cell, { width: columnWidth.length }]}>{item.WarpLen}</Text>

                                            <Text style={[
                                                styles.cell,
                                                { width: columnWidth.balance },
                                                { backgroundColor: item.BalLen <= 0 ? '#ff7272' : '#fff' }
                                            ]}>
                                                {item.BalLen}
                                            </Text>

                                            <Text style={[styles.cell, { width: columnWidth.taka }]}>{item.CheckedTaka}</Text>
                                            <Text style={[styles.cell, { width: columnWidth.meters }]}>{item.CheckedQty}</Text>
                                            <Text style={[styles.cell, { width: columnWidth.weight }]}>{item.CheckedWt}</Text>
                                        </View>
                                    )}
                                />

                            </View>
                        </ScrollView>
                    </>
                )}


            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.listIconContainer}>
                    <Icon name="add" size={24} color="white" onPress={openbeamdetail} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.listIconContainer}>
                    <Icon name="read-more" size={24} color="white" onPress={openDrawer} />
                </TouchableOpacity>

                {/* <TouchableOpacity style={styles.listIconContainer}>
                    <Icon name="search" size={24} color="white" onPress={fatchAllBeamDetailData} />
                </TouchableOpacity> */}
            </View>
            <CustomDrawer
                isVisible={isDrawerVisible}
                onClose={closeDrawer}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                onLoadPress={handleConfirmAction}
                getAllYearData={getAllYearData}
                setAllYearData={setAllYearData}
                isLoading={isLoading}
                FormState={FormState}
                setFormState={setFormState}
                setIsLoading={setIsLoading}
            />
            <AddBeamGaiting
                beamdetailvisible={beamdetailvisible}
                onClose={closebeamdetail}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                onLoadPress={handleBeamConfirm}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                getAllPropertyData={''}
                FormState={FormState}
                setFormState={setFormState}
                token={token}
                fatchAllBeamDetailData={fatchAllBeamDetailData}

            />
        </>
    );
};

const styles = StyleSheet.create({
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center' },
    emptyTextRed: { color: '#B42318', fontSize: 14, textAlign: 'center', marginTop: 6 },
    buttonRow: {
        position: 'absolute',
        bottom: 20,
        right: 10,
        flexDirection: 'column',
        gap: 10,
        zIndex: 9999
    },

    listIconContainer: {
        backgroundColor: '#007EA7',
        padding: 12,
        borderRadius: 30,
        elevation: 5
    },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: isTablet ? 20 : 10,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    summaryBox: {
        flex: 1,
        marginHorizontal: 5,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: isTablet ? 14 : 12,
        color: '#555',
        alignSelf: 'flex-end',
    },
    summaryValue: {
        fontSize: isTablet ? 14 : 12,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 5,
        alignSelf: 'flex-end',
    },
    sectionTitle: {
        fontSize: isTablet ? 18 : 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    partyCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    partyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    partyAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    partyAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    partyInfo: {
        flex: 1,
    },
    partyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    partyOrdersContainer: {
        marginTop: 4,
    },
    partyOrdersText: {
        fontSize: 12,
        color: '#666',
    },
    chevronIcon: {
        marginLeft: 'auto',
    },
    partyValues: {
        marginTop: 8,
    },
    valueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    valueItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    valueLabel: {
        fontSize: 12,
        color: '#666',
        marginRight: 4,
    },
    valueText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    recentlyViewedCard: {
        borderWidth: 2,
        borderColor: theme.BRAND_GRADIENT_END,
    },
    recentlyViewedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: theme.BRAND_GRADIENT_END,
        padding: 4,
        borderRadius: 4,
    },
    recentlyViewedText: {
        color: 'white',
        fontSize: 10,
    },
    loadingIndicator: {
        padding: 20,
    },
    listContent: {
        paddingBottom: 20,
    },
    cardSubHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 10
    },
    cardHeader: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor: '#E3F2FD',
        padding: 10,
        borderTopLeftRadius: 9,
        borderTopRightRadius: 9,
        marginTop: -15,
        marginHorizontal: -15,
        marginBottom: 10,
    },
    cardHeaderText: {
        textAlign: 'center',
        color: theme.BRAND_GRADIENT_END,
        fontSize: 14,
        fontWeight: '600',
    },
    cardSubHeaderText: {
        textAlign: 'center',
        color: theme.BRAND_GRADIENT_END,
        fontSize: 14,
        fontWeight: '600',
    },
    cardContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 12,
        marginVertical: 8,
        padding: 15,
        borderRadius: 12,

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,

        elevation: 4
    },
    twoColumnRow: {
        flexDirection: 'column',
        marginBottom: 10,
        justifyContent: 'flex-end'
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: theme.BRAND_GRADIENT_END
    },
    header: {
        width: 100,
        padding: 10,
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#ccc'
    },
    cell: {
        width: 100,
        padding: 10,
        color: '#000',
        fontSize: 12
    }
});



export default React.memo(BeamGaitingScreen);
