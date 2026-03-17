import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity, Alert, TextInput as RNTextInput, Modal, ActivityIndicator, Linking, ScrollView, StyleSheet,
    Dimensions, useWindowDimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios, { toFormData } from 'axios';
import FullScreenLoader from '../Loader/Loader';
import { crlimtreq_styles } from '../../common/Styles/Style';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import HeaderBar from '../HeaderBar/HeaderBar';
import theme from '../../android/app/src/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { fetchPropertyData, fetchCurrentYearData, fetchPropertyGroupDataDCR, fetchPropertyDataDCR } from '../../common/API/Functions';
import CustomDrawer from './CustomDrawer';
import CollectionCard from './CollectionCard';
import Footer from '../Footer/Footer';
import { API } from '../../common/API/dynamicAPI';

interface CardData {
    [key: string]: string;
    isProcessed: boolean;
    actionType: 'accept' | 'reject' | 'list';
}

interface PropertyData {
    PrpCode: string;
    LngName: string;
    PrpName: string;
    ShtName: string;
    PrpOf: string;
    PrpOfFull: string;
    PanNo: string;
    GSTNO: string;
}

interface SexeData {
    Code: string;
    SalesExecutive: string;
}

interface PropertyGroupData {
    PrpOf: string;
    PrpOfFull: string;
    PrpCode: string;
}

interface YearData {
    data: number;
}

interface BankData {
    BankName: string;
}

interface BranchData {
    BankBr: string;
}

interface PartyData {
    ordno: string;
    acccode: string;
    accname: string;
    address: string;
    gstin: string;
    email: string;
}

export interface Party {
    accname?: string;
    accode?: string;
    address?: string;
    email?: string;
    gstin?: string;
    ordno?: string;
    [k: string]: any;
}

interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
    setIsLoggedIn: (value: boolean) => void;
    rightsMenuApps: Array<string>;
}

const DailyCollectionReport: React.FC<Props> = ({ token, navigation, isConnected, username, setIsLoggedIn, rightsMenuApps }) => {
    const filterKey = 'all';
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [getPropertyData, setPropertyData] = useState<PropertyData[]>([]);
    const [getPropertyGroupData, setPropertyGroupData] = useState<PropertyGroupData[]>([]);
    const [getYearData, setYearData] = useState<YearData>();
    const [getBankData, setBankData] = useState<BankData[]>([]);
    const [getBranchData, setBranchData] = useState<BranchData[]>([]);
    const [getPartyData, setPartyData] = useState<PartyData[]>([]);
    const [partyList, setPartyList] = useState<CardData[]>([]);
    const [getDetailsData, setDetailsData] = useState([]);
    const [masSync, setMasSync] = useState([]);
    const [getDetailsDataSetting, setDetailsDataSetting] = useState([]);
    const flatListRef = useRef<FlatList>(null);
    const flatHistoryListRef = useRef<FlatList>(null);
    const [activeTab, setActiveTab] = useState<'SalesExecutiveWise'>('SalesExecutiveWise');
    const [activeTab1, setActiveTab1] = useState<'account requests'>('account requests');
    const [selectedProperty, setSelectedProperty] = useState<PropertyData[] | null>(null);
    const [SelectedSexe, setSelectedSexe] = useState<SexeData[] | null>(null);
    const [selectedPropertyGroup, setSelectedPropertyGroup] = useState<PropertyGroupData | null>(null);
    const [selectedParty, setSelectedParty] = useState<PartyData | null>(null);
    const [selectedBank, setSelectedBank] = useState<BankData | null>(null);
    const [selected, setSelected] = useState<Party | null>();
    const [activeCard, setActiveCard] = useState(null);
    const [selectedbank, setSelectedbank] = useState<BankData | null>();
    const [getDetailPayload, setDetailPayload] = useState({});
    const [selectedbranch, setSelectedbranch] = useState<BranchData | null>();
    const [initialLoading, setInitialLoading] = useState<boolean>(false);
    const [initialModalVisible, setInitialModalVisible] = useState<boolean>(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [cardDetailData, setCardDetailData] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedPartyName, setSelectedPartyName] = useState("");
    const [form, setForm] = useState({
        EDate: new Date().toISOString().split('T')[0],
        ChkDate: new Date().toISOString().split('T')[0],
        fromdate: new Date().toISOString().split('T')[0],
        todate: new Date().toISOString().split('T')[0],
        AccCode: "",
        AccName: "",
        BankName: "",
        BankBr: "",
        ChqNo: "",
        ChqDate: "",
        Amount: "",
        Remark: "",
        AdjType: "",
        AttachImage: "",
    });
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [searchQueryPOT, setSearchQueryPOT] = useState('');
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
    const [selectedExeCRT, setSelectedExeCRT] = useState(null);
    const [exeDataCRT, setExeDataCRT] = useState([]);
    const [exeData, setExeData] = useState([]);
    const [designData, setDesignData] = useState([]);
    const [itemData, setItemData] = useState([]);
    const [selectedDesigns, setSelectedDesigns] = useState([])
    const [getSelectedSexeName, setSelectedSexeName] = useState(null)
    const [selectedItems, setSelectedItems] = useState([])
    const [selectedItemStatus, setSelectedItemStatus] = useState('All');
    const [hasDailyCollectionReport, setHasDailyCollectionReport] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCardName, setSelectedCardName] = useState('');
    const scrollRef = useRef<ScrollView>(null);
    const scrollY = useRef(0);
    const [selectedSexeCard, setSelectedSexeCard] = useState(null);
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [lockedCardId, setLockedCardId] = useState<string | null>(null);
    const mainScrollRef = useRef(null);
    const [modalTab, setModalTab] = useState('PartyWise');
    const [selectedExe, setSelectedExe] = useState([]);
    const [partyData, setpartydata] = useState([]);
    const [sexeModalVisible, setSexeModalVisible] = useState(false);
    const [getSexeLoading, setSexeLoading] = useState(false);
    const [sexeSearchQuery, setSexeSearchQuery] = useState("");
    const [gePOTData, setPOTData] = useState([])
    const [getSummaryData, setSummaryData] = useState([])
    const [getpayload, setPayload] = useState([])
    const [partyWiseModalVisible, setPartyWiseModalVisible] = useState(false);
    const [partySearchQuery, setPartySearchQuery] = useState("");
    const [filterpartyData, setfilterpartydata] = useState([]);

    // console.log("selected tab", modalTab);
    // console.log("filterpartyData", filterpartyData)
    useEffect(() => {
        if (rightsMenuApps && rightsMenuApps.length > 0) {
            const hasReport = rightsMenuApps.some(
                (item) => item?.title === "Daily Collection Report"
            );
            setHasDailyCollectionReport(hasReport);
        }
    }, [rightsMenuApps]);

    let cancelToken: any;

    useEffect(() => {
        const today = new Date();
        setFromDate(today);
        setToDate(today);
    }, []);

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
            const getGroupdata = await fetchPropertyGroupDataDCR(token);
            const getdata = await fetchPropertyData(token);
            const getyeardata = await fetchCurrentYearData(token);
            setPropertyGroupData(getGroupdata);
            setPropertyData(getdata);
            setYearData(getyeardata as YearData);
        };
        loadProperty();
    }, [token]);

    let currentYear = getYearData?.data;

    useEffect(() => {
        if (selectedPropertyGroup !== null) {
            setSelectedProperty(null);
            setSelectedParty(null);
            setSelectedBank(null);
            setPartyData([]);
            setBankData([]);
            setBranchData([]);
            setSelected(null);
            setSelectedbank(null);
            setSelectedbranch(null);
            let gotSelectedPrpGrp = selectedPropertyGroup;
            const loadProperty123 = async () => {
                const getdata = await fetchPropertyDataDCR(token, form?.PrpOf || "");
                setPropertyData(getdata);
            };
            loadProperty123();
        } else {
            setSelectedParty(null);
            setSelectedBank(null);
            setPartyData([]);
            setBankData([]);
            setBranchData([]);
            setSelected(null);
            setSelectedbank(null);
            setSelectedbranch(null);
        }
    }, [selectedPropertyGroup]);


    const getToken = () => {
        return token;
    };

    // ------browser api ----------

    const handleLoadPress = () => {

        const yearValue = selectedYear.split('-')[1].substring(2);
        // console.log({
        //     prptype: form?.PrpOf || "",
        //     prpcodes: form.PrpCode,
        //     action: 'collect_report',
        //     txntype: "mob_daily_collection_report",
        //     rpttype: 1,
        //     sexe: form?.SexeCode || {},
        //     fromdate: form.fromdate,
        //     todate: form.fromdate
        // });

        const formatDate = (dateStr) => {
            if (!dateStr) return "";
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        };
        const payload = {
            prptype: form?.PrpOf || "",
            prpcodes: form.PrpCode,
            action: 'daily_collection_report',
            txntype: "mob_daily_collection_report",
            rpttype: 0,
            sexe: form?.SexeCode || [],
            fromdate: formatDate(form.fromdate),
            todate: formatDate(form.todate)
        }
        fetchBrowseData(payload as any);
    };

    const fetchBrowseData = async (payload: any) => {
        // console.log("Browse API running");
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const params = { ...payload };
            // console.log("🔵 payload browse", params);
            setPayload(params as any);
            const response = await axios.post(`${API}/api/collection_crud`, params, { headers });
            if (response?.data?.success && response?.data?.data?.data) {
                // console.log("Browse API running");
                let apiData = response.data.data.data;
                if (!Array.isArray(apiData)) {
                    apiData = Object.values(apiData);
                }
                const tableData = apiData.map((item: any) => ({
                    PrpCode: item.prpcode,
                    PrpName: item.grpname,
                    ParName: item.grpname,
                    ToDaysCollection: item.tranamt,
                    CrInBankAccCollection: item.clramt
                }));
                setPOTData(tableData);
                closeDrawer();

            } else {
                setPOTData([]);
            }

        } catch (error) {
            if (!axios.isCancel(error)) {
                setPOTData([]);
            }

        } finally {
            setIsLoading(false);
        }
    };
    // brwoser api finsih


    // party wise and sales excutive wise api start here 
    const handleLoadPressSEXE = (item) => {
        const yearValue = selectedYear.split('-')[1].substring(2);
        const formatDate = (dateStr) => {
            if (!dateStr) return "";
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        };
        const payload = {
            ...getDetailPayload,
            prptype: form?.PrpOf || "",
            prpcodes: item.PrpCode,
            sexecode: item?.SExe
                ? item.SExe.split(',').map(val => val.trim())
                : [],
            acccode: item?.acccode
                ? item.acccode.split(',').map(val => val.trim())
                : [],
            // acccode: item.acccode || [],
            rpttype: 2,
            txntype: item?.acccode && item.acccode.length > 0
                ? "collection_acc"
                : "collection_sexe"
        }
        setSexeLoading(true);
        fetchBrowseDataSEXE(payload as any);
    };

    const fetchBrowseDataSEXE = async (payload: any) => {
        // console.log('🔵 Final Details payload', payload);
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        // setIsLoading(true);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const formatDate = (dateStr) => {
                if (!dateStr) return "";
                const [year, month, day] = dateStr.split('-');
                return `${day}-${month}-${year}`;
            };
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const response = await axios.post(`${API}/api/collection_crud`, payload, { headers });
            // console.log('🔵 DHRUMIL main summary\'s sexe\'s res:', payload, response);
            if (response.data.success) {
                setSexeLoading(false);
                const res_data = response.data.data.data.filter(
                    (item) => item.PrpName !== "Total"
                );
                setDetailsData(res_data);
                setDetailsDataSetting(response.data.data.rptsettings);
                setModalVisible(true);
            }
        } catch (error) {
            setSexeLoading(false);
            console.error("Error in dashAccount:", error);
        } finally {
            setSexeLoading(false);
            setIsLoadingSummary(false);
        }
    };
    // party wise and sales excutive wise api finish here 


    // cards detail api start here 

    const handlecardpress = (item) => {
        const yearValue = selectedYear.split('-')[1].substring(2);
        // console.log({
        //     prptype: form?.PrpOf || "",
        //     prpcodes: form.PrpCode,
        //     action: 'collect_report',
        //     txntype: "mob_daily_collection_report",
        //     rpttype: 1,
        //     sexe: form?.SexeCode || {},
        //     fromdate: form.fromdate,
        //     todate: form.fromdate
        // });

        const formatDate = (dateStr) => {
            if (!dateStr) return "";
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        };
        const payload = {
            prptype: form?.PrpOf || "",
            s_prpcodes: item.prpcode,
            action: 'daily_collection_report',
            txntype: "mob_daily_collection_report",
            rpttype: 3,
            fromdate: formatDate(form.fromdate),
            todate: formatDate(form.todate),
            uid: item.uid,
            srno: item.srno
        }
        fetchcarddata(payload);
    };

    const fetchcarddata = async (payload) => {

        setDetailLoading(true);

        try {

            const headers = {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
                "X-Requested-with": "XMLHttpRequest",
            };

            const response = await axios.post(`${API}/api/collection_crud`, payload, { headers });

            // console.log("CARD DETAIL RESPONSE:", response?.data);

            if (response?.data?.success) {

                const apiData = response?.data?.data?.data || [];

                if (Array.isArray(apiData)) {
                    setCardDetailData(apiData);
                    setDetailModalVisible(true);   // modal yaha open karo
                }

            } else {
                setCardDetailData([]);
            }

        } catch (error) {

            // console.log("Card detail error:", error);
            setCardDetailData([]);

        } finally {

            setDetailLoading(false);

        }

    };

    // cards detail api end here 

    useEffect(() => {
        const yearValue = selectedYear.split('-')[1].substring(2);
        const payload = {
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0],
            yearno: yearValue,
            prpcode: '',
            action: 'browse',
            txntype: "mob_collection",
        }
        fetchBrowseData(payload);
    }, []);

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    const formatDate = (date) => {
        if (!date) return "-";
        const str = String(date);
        if (/^\d{8}$/.test(str)) {
            const year = str.substring(0, 4);
            const month = str.substring(4, 6);
            const day = str.substring(6, 8);
            return `${day}-${month}-${year}`;
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            const [year, month, day] = str.substring(0, 10).split("-");
            return `${day}-${month}-${year}`;
        }
        return str;
    };

    // cards detail
    const AllKeysCardsView = ({ data, searchQuery, getDetailsDataSetting }) => {
        // Lazy loading configuration
        const LAZY_LOAD_CONFIG = {
            INITIAL_BATCH: 6,
            SUBSEQUENT_BATCH: 6,
            THRESHOLD: 0.7
        };
        const groupCol = "grpname";

        const columns = useMemo(() => {
            if (!data || data.length === 0) return [];
            return Object.keys(data[0]);
        }, [data]);

        const widths = useMemo(() => {
            return columns.map(() => 1);
        }, [columns]);

        const labels = useMemo(() => {
            return columns.map(col => col);
        }, [columns]);

        const sumFields = useMemo(() => {
            if (!data || data.length === 0) return [];

            return columns.map(col =>
                data.some(row => !isNaN(parseFloat(row[col]))) ? 1 : 0
            );
        }, [columns, data]);

        const filterDataTypes = useMemo(() => {
            if (!data || data.length === 0) return [];

            return columns.map(col =>
                data.some(row => !isNaN(parseFloat(row[col]))) ? "N" : "S"
            );
        }, [columns, data]);

        const colSkip = "uid,srno,prpcode";
        const skippedColumns = useMemo(() => {
            const skipped = new Set();
            if (colSkip) {
                colSkip.split(',').forEach(skipPair => {
                    const [key] = skipPair.split('#');
                    if (key) skipped.add(key);
                });
            }
            return skipped;
        }, [colSkip]);

        const filteredData = useMemo(() => {
            if (!searchQuery || searchQuery.trim() === '') return data;
            const query = searchQuery.toLowerCase().trim();
            return data.filter((item) =>
                Object.values(item).some((val) =>
                    String(val).toLowerCase().includes(query)
                )
            );
        }, [data, searchQuery]);

        const shouldGroup = useMemo(() => {
            return groupCol && groupCol.trim() !== "" && filteredData.some(item => item[groupCol]);
        }, [groupCol, filteredData]);

        const groupedData = useMemo(() => {
            if (!shouldGroup) {
                return { "All Items": filteredData };
            }
            return filteredData.reduce((acc, item) => {
                const groupKey = item[groupCol] || 'Ungrouped';
                if (!acc[groupKey]) acc[groupKey] = [];
                acc[groupKey].push(item);
                return acc;
            }, {});
        }, [filteredData, groupCol, shouldGroup]);

        const visibleColumns = useMemo(() => {
            return columns.filter(col => {
                const colIndex = columns.indexOf(col);
                return !skippedColumns.has(col) &&
                    !(shouldGroup && col === groupCol) &&
                    widths[colIndex] > 0;
            });
        }, [columns, skippedColumns, shouldGroup, groupCol, widths]);

        const labelMap = useMemo(() => {
            const customLabels = {
                accname: "Party",
                sexe: "SExe",
                sexename: "Sales Executive",
                chqno: "Cheque No",
                chqdate: "Cheque Date",
                tranamt: "Collection",
                clramt: "Bank Collection",
            };
            const map = {};
            columns.forEach((col) => {
                const lower = col.toLowerCase();
                if (customLabels[lower]) {
                    map[col] = customLabels[lower];
                } else {
                    map[col] = col;
                }
            });
            return map;
        }, [columns]);

        // const totals = useMemo(() => {
        //     const calculated = {};
        //     columns.forEach((col, index) => {
        //         if (sumFields[index] === 1 && filterDataTypes[index] === 'N') {
        //             calculated[col] = filteredData.reduce(
        //                 (sum, item) => sum + (parseFloat(item[col]) || 0),
        //                 0
        //             );
        //         }
        //     });
        //     return calculated;
        // }, [filteredData, columns, sumFields, filterDataTypes]);

        const totals = useMemo(() => {
            return {
                tranamt: filteredData.reduce(
                    (sum, item) => sum + (parseFloat(item.tranamt) || 0),
                    0
                ),
                clramt: filteredData.reduce(
                    (sum, item) => sum + (parseFloat(item.clramt) || 0),
                    0
                )
            };
        }, [filteredData]);

        const [expandedGroups, setExpandedGroups] = useState({});
        const [loadedItems, setLoadedItems] = useState({});
        const [isLoadingMore, setIsLoadingMore] = useState({});
        const [lockedCardId, setLockedCardId] = useState<string | null>(null);
        const [isModalOpen, setIsModalOpen] = useState(false);

        const [modalVisible, setModalVisible] = useState(false);
        const [selectedCard, setSelectedCard] = useState(null);
        const [selectedCardColors, setSelectedCardColors] = useState(null);

        const { width: screenWidth, height: screenHeight } = useWindowDimensions();
        const isCardLocked = lockedCardId !== null;

        const toggleCardLock = useCallback((cardId: string) => {
            setLockedCardId(prevId => prevId === cardId ? null : cardId);
        }, []);

        const getGridConfig = useCallback(() => {
            const padding = 12;
            const MOBILE_CARD_WIDTH = screenWidth - (padding * 2);
            const TABLET_CARD_WIDTH = (screenWidth - (padding * 2) - 12) / 2;
            const DESKTOP_CARD_WIDTH = (screenWidth - (padding * 2) - 24) / 3;

            if (screenWidth < 600) {
                return {
                    numColumns: 1,
                    cardWidth: MOBILE_CARD_WIDTH,
                    containerPadding: padding,
                    gap: 0,
                    labelWidth: '40%',
                    valueWidth: '55%',
                };
            } else if (screenWidth >= 600 && screenWidth < 900) {
                return {
                    numColumns: 2,
                    cardWidth: TABLET_CARD_WIDTH,
                    containerPadding: padding,
                    gap: 12,
                    labelWidth: '45%',
                    valueWidth: '50%',
                };
            } else {
                return {
                    numColumns: 3,
                    cardWidth: DESKTOP_CARD_WIDTH,
                    containerPadding: padding,
                    gap: 12,
                    labelWidth: '48%',
                    valueWidth: '47%',
                };
            }
        }, [screenWidth]);

        const gridConfig = getGridConfig();
        const formatValue = useCallback((value, colName) => {
            if (value === undefined || value === null) return '-';
            const colIndex = columns.indexOf(colName);
            const isNumeric = filterDataTypes[colIndex] === 'N';

            const moneyColumns = ["clramt", "tranamt"];
            const codeColumns = ["uid", "acccode", "SExe", "srno"];
            const dateColumns = ["chqdate"];   // 👈 DATE COLUMN

            const lowerCol = colName.toLowerCase();

            if (dateColumns.includes(lowerCol)) {
                return formatDate(value);
            }

            if (
                isNumeric &&
                moneyColumns.includes(lowerCol) &&
                !isNaN(parseFloat(value))
            ) {
                return `₹ ${parseFloat(value).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;
            }

            if (codeColumns.includes(lowerCol)) {
                return String(value);
            }

            if (isNumeric && !isNaN(parseFloat(value))) {
                return parseFloat(value).toLocaleString('en-IN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                });
            }

            return String(value);

        }, [columns, filterDataTypes]);

        // const handleCardLongPress = useCallback((item, colors) => {
        //     console.log("🔥 CARD CLICKED ITEM:", item);
        //     console.log("🔥 CARD COLORS:", colors);
        //     setSelectedCard(item);
        //     setSelectedCardColors(colors);
        // }, []);

        const handleCardLongPress = useCallback((item, colors) => {
            setSelectedCard(item);
            setSelectedCardColors(colors);
        }, []);

        const closeModal = useCallback(() => {
            // setModalVisible(false);
            // setIsModalOpen(false);
            setDetailModalVisible(false);
        }, []);

        useEffect(() => {
            setLoadedItems({});
            setIsLoadingMore({});
            Object.keys(groupedData).forEach(groupKey => {
                const itemCount = groupedData[groupKey].length;
                setLoadedItems(prev => ({
                    ...prev,
                    [groupKey]: Math.min(LAZY_LOAD_CONFIG.INITIAL_BATCH, itemCount)
                }));
            });
        }, [filteredData, searchQuery]);

        const toggleGroup = useCallback((groupKey) => {
            setExpandedGroups(prev => ({
                ...prev,
                [groupKey]: !prev[groupKey]
            }));
        }, []);

        const handleScroll = useCallback((event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const isEndReached = layoutMeasurement.height + contentOffset.y >=
                contentSize.height * LAZY_LOAD_CONFIG.THRESHOLD;

            if (isEndReached) {
                Object.keys(groupedData).forEach(groupKey => {
                    const totalCount = groupedData[groupKey]?.length || 0;
                    const currentLoaded = loadedItems[groupKey] || 0;

                    if (currentLoaded < totalCount && !isLoadingMore[groupKey]) {
                        setIsLoadingMore(prev => ({ ...prev, [groupKey]: true }));

                        setTimeout(() => {
                            setLoadedItems(prev => ({
                                ...prev,
                                [groupKey]: Math.min(
                                    currentLoaded + LAZY_LOAD_CONFIG.SUBSEQUENT_BATCH,
                                    totalCount
                                )
                            }));
                            setIsLoadingMore(prev => ({ ...prev, [groupKey]: false }));
                        }, 100);
                    }
                });
            }
        }, [groupedData, loadedItems, isLoadingMore]);

        // Color palette
        const CARD_COLORS = [
            ["#4A6FA5", "#5C85D1"], ["#2E5BBA", "#4A7CC5"],
            ["#3A7BD5", "#5A9BD5"], ["#00ABC5", "#00D4FF"],
            ["#4CAF50", "#6BC96B"], ["#FF9800", "#FFB74D"],
            ["#9C27B0", "#BA68C8"], ["#607D8B", "#90A4AE"],
        ];

        // Render group header
        const renderGroupHeader = useCallback((groupKey, index, itemCount) => {
            const colors = CARD_COLORS[index % CARD_COLORS.length];
            const isExpanded = expandedGroups[groupKey] !== false;

            return (
                <TouchableOpacity
                    key={`header-${groupKey}`}
                    onPress={() => toggleGroup(groupKey)}
                    activeOpacity={0.7}
                    style={{
                        marginBottom: 8,
                        marginHorizontal: gridConfig.containerPadding,
                        borderRadius: 10,
                        overflow: 'hidden',
                        elevation: 2,
                    }}
                >
                    <LinearGradient
                        colors={colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                            padding: 12,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            {shouldGroup && (
                                <Icon
                                    name={isExpanded ? "expand-less" : "expand-more"}
                                    size={20}
                                    color="#fff"
                                    style={{ marginRight: 8 }}
                                />
                            )}
                            <Text
                                numberOfLines={1}
                                style={{
                                    color: "#fff",
                                    fontWeight: "600",
                                    fontSize: screenWidth <= 400 ? 13 : 14,
                                    flex: 1,
                                }}
                            >
                                {groupKey}
                            </Text>
                        </View>
                        <View style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            marginLeft: 8
                        }}>
                            <Text style={{
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: "500",
                            }}>
                                {itemCount}
                            </Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            );
        }, [CARD_COLORS, expandedGroups, shouldGroup, toggleGroup, gridConfig.containerPadding, screenWidth]);

        const renderCard = useCallback((item, index, groupKey) => {

            const colors = CARD_COLORS[index % CARD_COLORS.length];

            return (
                <TouchableOpacity
                    activeOpacity={0.95}
                    // onPress={() => {
                    //     setSelectedPartyName(item.AccName || item.grpname || "");
                    //     handleCardLongPress(item, colors);
                    //     handlecardpress(item);   // 🔥 API CALL
                    // }}
                    onPress={() => {
                        setSelectedPartyName(item.AccName || item.grpname || "");
                        setSelectedSexeCard(item);
                        handleCardLongPress(item, colors);
                        handlecardpress(item); // API
                    }}
                    // onLongPress={() => {
                    //     handleCardLongPress(item, colors);
                    //     handlecardpress(item);   // 🔥 API CALL
                    // }}
                    delayLongPress={400}
                    style={{
                        width: gridConfig.cardWidth,
                        minHeight: 265,
                        maxHeight: 350,
                        borderRadius: 12,
                        overflow: "hidden",
                        elevation: 4,
                    }}
                >
                    <LinearGradient
                        colors={colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            flex: 1,
                            padding: 12,
                        }}
                    >
                        {/* TITLE */}
                        {(item.AccName) && (
                            <Text
                                numberOfLines={1}
                                style={{
                                    color: "#fff",
                                    fontSize: 15,
                                    fontWeight: "700",
                                    marginBottom: 10,
                                }}
                            >
                                {item.AccName}
                            </Text>
                        )}

                        {/* CONTENT */}
                        <ScrollView
                            nestedScrollEnabled
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 8 }}
                        >
                            {visibleColumns.map((col) => {

                                const colIndex = columns.indexOf(col);
                                const isNumeric = filterDataTypes[colIndex] === 'N';
                                const value = item[col];
                                const label = labelMap[col] || col;

                                const displayValue =
                                    value !== undefined && value !== null
                                        ? (isNumeric ? formatValue(value, col) : String(value))
                                        : '-';

                                return (
                                    <View
                                        key={col}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            marginBottom: 6,   // 👈 compact spacing
                                        }}
                                    >
                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                color: "rgba(255,255,255,0.75)",
                                                fontSize: 11,
                                                width: '48%',
                                            }}
                                        >
                                            {label}
                                        </Text>

                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                color: "#fff",
                                                fontSize: 12,
                                                fontWeight: isNumeric ? "700" : "500",
                                                textAlign: 'right',
                                                width: '50%',
                                            }}
                                        >
                                            {displayValue}
                                        </Text>
                                    </View>
                                );
                            })}
                        </ScrollView>

                    </LinearGradient>
                </TouchableOpacity>
            );

        }, [
            visibleColumns,
            columns,
            filterDataTypes,
            labelMap,
            formatValue,
            gridConfig.cardWidth
        ]);

        const CardDetailModal = useCallback(() => {
            // console.log("MODAL SELECTED CARD:", selectedCard);

            const renderRows = () => {

                if (!Array.isArray(cardDetailData) || cardDetailData.length === 0) {
                    return (
                        <Text style={{
                            textAlign: "center",
                            marginTop: 30,
                            fontSize: 16,
                            color: "#666"
                        }}>
                            No data found
                        </Text>
                    );
                }

                const rows = [];

                for (let i = 0; i < cardDetailData.length; i += 2) {

                    const rowItems = cardDetailData.slice(i, i + 2);

                    rows.push(
                        <View
                            key={`row-${i}`}
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                marginBottom: 12
                            }}
                        >

                            {rowItems.map((row, index) => (

                                <LinearGradient
                                    key={index}
                                    colors={selectedCardColors || ["#4A6FA5", "#5C85D1"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{
                                        width: "48%",
                                        borderRadius: 12,
                                        padding: 12,
                                        minHeight: 150,
                                        elevation: 4
                                    }}
                                >

                                    {Object.keys(row)
                                        .filter((key) => key !== "PrpCode")
                                        .map((key) => {

                                            let value = row[key];
                                            let caption = key;

                                            if (key === "nVouDate" && value) {

                                                const year = value.substring(0, 4);
                                                const month = value.substring(4, 6);
                                                const day = value.substring(6, 8);

                                                value = `${day}-${month}-${year}`;
                                                caption = "Vou Date";
                                            }

                                            if (key === "SetAmt") {

                                                value = `₹ ${parseFloat(value).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}`;

                                                caption = "Amount";
                                            }

                                            return (
                                                <View
                                                    key={key}
                                                    style={{
                                                        flexDirection: "row",
                                                        justifyContent: "space-between",
                                                        marginBottom: 6
                                                    }}
                                                >

                                                    <Text
                                                        style={{
                                                            color: "rgba(255,255,255,0.75)",
                                                            fontSize: 11,
                                                            width: "48%"
                                                        }}
                                                    >
                                                        {caption}
                                                    </Text>

                                                    <Text
                                                        style={{
                                                            color: "#fff",
                                                            fontSize: 12,
                                                            fontWeight: "700",
                                                            textAlign: "right",
                                                            width: "50%"
                                                        }}
                                                    >
                                                        {value}
                                                    </Text>

                                                </View>
                                            );

                                        })}

                                </LinearGradient>

                            ))}

                        </View>
                    );
                }

                return rows;
            };


            return (

                <Modal
                    animationType="slide"
                    transparent={false}
                    visible={detailModalVisible}
                    onRequestClose={closeModal}
                >

                    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>

                        {/* HEADER */}

                        <LinearGradient
                            colors={selectedCardColors || ["#4A6FA5", "#5C85D1"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingTop: screenHeight > 800 ? 50 : 40,
                                paddingBottom: 20,
                                paddingHorizontal: 20,
                                borderBottomLeftRadius: 20,
                                borderBottomRightRadius: 20,
                                elevation: 5
                            }}
                        >

                            <Text
                                style={{
                                    color: "#fff",
                                    fontSize: screenWidth <= 400 ? 18 : 20,
                                    fontWeight: "bold",
                                    flex: 1
                                }}
                            >
                                Details - {selectedPartyName}
                            </Text>

                            <TouchableOpacity
                                onPress={closeModal}
                                style={{
                                    backgroundColor: "rgba(255,255,255,0.3)",
                                    borderRadius: 20,
                                    padding: 8
                                }}
                            >
                                <Icon name="close" size={24} color="#fff" />
                            </TouchableOpacity>

                        </LinearGradient>


                        {/* CONTENT */}

                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ padding: 20 }}
                        >

                            {renderRows()}

                        </ScrollView>

                    </View>

                </Modal>

            );

        }, [
            detailModalVisible,
            selectedCard,
            selectedCardColors,
            cardDetailData
        ]);

        const renderGroupContent = useCallback((items, groupKey) => {
            const loadedCount = loadedItems[groupKey] || Math.min(LAZY_LOAD_CONFIG.INITIAL_BATCH, items.length);
            const displayedItems = items.slice(0, loadedCount);
            const hasMore = loadedCount < items.length;

            const rows = [];

            for (let i = 0; i < displayedItems.length; i += gridConfig.numColumns) {
                const rowItems = displayedItems.slice(i, i + gridConfig.numColumns);
                const isLastRow = i + gridConfig.numColumns >= displayedItems.length;

                rows.push(
                    <View
                        key={`${groupKey}-row-${i}`}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            marginHorizontal: gridConfig.containerPadding,
                            marginBottom: isLastRow ? 0 : 16,
                        }}
                    >
                        {rowItems.map((item, index) => {
                            const actualIndex = i + index;
                            return (
                                <View
                                    key={`${groupKey}-${actualIndex}`}
                                    style={{
                                        width: gridConfig.cardWidth,
                                        marginRight: index < rowItems.length - 1 ? gridConfig.gap : 0,
                                    }}
                                >
                                    {renderCard(item, actualIndex, groupKey)}
                                </View>
                            );
                        })}
                    </View>
                );
            }

            // Loading indicator
            if (hasMore && isLoadingMore[groupKey]) {
                rows.push(
                    <View key={`${groupKey}-loading`} style={{
                        marginHorizontal: gridConfig.containerPadding,
                        marginTop: 8,
                        marginBottom: 16,
                        padding: 12,
                        alignItems: 'center',
                        backgroundColor: '#f0f0f0',
                        borderRadius: 8,
                    }}>
                        <ActivityIndicator size="small" color="#4A6FA5" />
                        <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                            Loading more...
                        </Text>
                    </View>
                );
            }

            return rows;
        }, [gridConfig, renderCard, loadedItems, isLoadingMore]);

        // Footer
        // const Footer = useCallback(() => {
        //     if (Object.keys(totals).length === 0) return null;

        //     return (
        //         <LinearGradient
        //             // colors={['#4A6FA5', '#5C85D1']}
        //             colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
        //             style={{
        //                 position: "absolute",
        //                 bottom: 0,
        //                 left: 0,
        //                 right: 0,
        //                 padding: screenWidth <= 400 ? 12 : 16,
        //                 borderTopLeftRadius: 16,
        //                 borderTopRightRadius: 16,
        //                 elevation: 10,
        //                 shadowColor: "#000",
        //                 shadowOffset: { width: 0, height: -3 },
        //                 shadowOpacity: 0.2,
        //                 shadowRadius: 6,
        //                 zIndex: 1000,
        //             }}
        //         >
        //             <Text style={{
        //                 color: "#fff",
        //                 fontSize: screenWidth <= 400 ? 13 : 14,
        //                 fontWeight: "700",
        //                 marginBottom: 10,
        //             }}>
        //                 Totals
        //             </Text>

        //             <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        //                 <View style={{ flexDirection: 'row', paddingRight: 20 }}>
        //                     {Object.entries(totals).map(([col, value]) => (
        //                         <View key={col} style={{
        //                             marginLeft: 16,
        //                             backgroundColor: 'rgba(255,255,255,0.15)',
        //                             paddingHorizontal: 12,
        //                             paddingVertical: 6,
        //                             borderRadius: 20,
        //                         }}>
        //                             <Text style={{
        //                                 color: "rgba(255,255,255,0.9)",
        //                                 fontSize: screenWidth <= 400 ? 11 : 12,
        //                                 fontWeight: "600",
        //                             }}>
        //                                 {labelMap[col]}: {formatValue(value, col)}
        //                             </Text>
        //                         </View>
        //                     ))}
        //                 </View>
        //             </ScrollView>
        //         </LinearGradient>
        //     );
        // }, [totals, labelMap, formatValue, screenWidth]);

        const Footer = useCallback(() => {
            if (Object.keys(totals).length === 0) return null;

            return (
                <LinearGradient
                    colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: screenWidth <= 400 ? 12 : 16,
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        elevation: 10,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -3 },
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        zIndex: 1000,
                    }}
                >
                    <Text style={{
                        color: "#fff",
                        fontSize: screenWidth <= 400 ? 13 : 14,
                        fontWeight: "700",
                        marginBottom: 10,
                    }}>
                        Totals
                    </Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', paddingRight: 20 }}>
                            {Object.entries(totals).map(([col, value]) => (
                                <View
                                    key={col}
                                    style={{
                                        marginLeft: 16,
                                        backgroundColor: 'rgba(255,255,255,0.15)',
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 20,
                                    }}
                                >
                                    <Text style={{
                                        color: "rgba(255,255,255,0.9)",
                                        fontSize: screenWidth <= 400 ? 11 : 12,
                                        fontWeight: "600",
                                    }}>
                                        {labelMap[col] || col}: ₹ {value.toLocaleString('en-IN', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </LinearGradient>
            );
        }, [totals, labelMap, screenWidth]);
        // Empty state
        const EmptyState = useCallback(() => (
            <View style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 40,
                marginTop: 60
            }}>
                <Icon name="search-off" size={48} color="#ccc" />
                <Text style={{
                    color: "#666",
                    fontSize: 16,
                    marginTop: 12,
                    textAlign: 'center'
                }}>
                    No records found
                </Text>
            </View>
        ), []);

        // Main render
        return (
            <View
                style={{ flex: 1, backgroundColor: '#f8f9fa' }}
                pointerEvents="box-none"
            >
                {/* MAIN SCROLLVIEW (Disabled if card is locked or modal is open) */}
                <ScrollView
                    ref={mainScrollRef}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator
                    scrollEnabled={!isCardLocked && !isModalOpen}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    {Object.entries(groupedData).length > 0 ? (
                        Object.entries(groupedData).map(([groupKey, items], index) => {
                            const isExpanded = shouldGroup ? (expandedGroups[groupKey] !== false) : true;

                            return (
                                <View key={groupKey} style={{ marginBottom: 16 }}>
                                    {renderGroupHeader(groupKey, index, items.length)}
                                    {(shouldGroup ? isExpanded : true) && items.length > 0 && (
                                        <View style={{ marginTop: 8 }}>
                                            {renderGroupContent(items, groupKey)}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    ) : (
                        <EmptyState />
                    )}
                </ScrollView>
                {/* HARD OVERLAY BLOCKER */}
                {isCardLocked && (
                    <View
                        pointerEvents="auto"
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: 'transparent',
                        }}
                    />
                )}

                {/* FIXED FOOTER */}
                <Footer />

                {/* CARD DETAIL MODAL */}
                <CardDetailModal />
            </View>
        );
    };

    // cards detail over

    const DASHBOARD_COLORS = [
        ['#1A1A2E', '#2D1B69'], // Dark Purple
        ['#0F3460', '#1E5A8A'], // Deep Ocean
        ['#1B5E20', '#2E7D32'], // Forest Green
        ['#333333', '#4F4F4F'], // Charcoal
        ['#5D1049', '#8A235C'], // Dark Magenta
        ['#8B4513', '#A0522D'], // Saddle Brown
        ['#2F4F4F', '#556B2F'], // Dark Slate Gray
        ['#483D8B', '#6A5ACD'], // Slate Blue (not pure blue)
        ['#800020', '#B22222'], // Dark Red
        ['#228B22', '#32CD32'], // Dark Green
    ];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                y: scrollY.current,
                animated: false,
            });
        }
    }, [activeCard, isLoadingSummary]);


    //main cards detail Start

    const DetailCardGrid = React.memo(({
        data = [],
        searchQuery = "",
        activeSlab,
        isLoadingSummary,
        onCardPress
    }) => {
        // console.log("hiiii")
        const visibleColumns = [
            "PrpName",
            "ToDaysCollection",
            "CrInBankAccCollection"
        ];

        const labelMap = {
            PrpName: "Party Name",
            ToDaysCollection: "Collection",
            CrInBankAccCollection: "Credit in Bank"
        };

        const { width: screenWidth } = useWindowDimensions();

        const filteredData = useMemo(() => {

            if (!Array.isArray(data)) return [];

            return data.filter((item) =>
                Object.values(item).some((val) =>
                    String(val || "")
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                )
            );

        }, [data, searchQuery]);

        // ✅ Totals calculation
        const totals = useMemo(() => {

            return filteredData.reduce((acc, item) => {

                acc.ToDaysCollection += parseFloat(item.ToDaysCollection || 0);
                acc.CrInBankAccCollection += parseFloat(item.CrInBankAccCollection || 0);

                return acc;

            }, {
                ToDaysCollection: 0,
                CrInBankAccCollection: 0
            });

        }, [filteredData]);

        const DASHBOARD_COLORS = [
            ['#1A1A2E', '#2D1B69'], ['#0F3460', '#1E5A8A'],
            ['#1B5E20', '#2E7D32'], ['#333333', '#4F4F4F'],
            ['#5D1049', '#8A235C'], ['#8B4513', '#A0522D'],
            ['#2F4F4F', '#556B2F'], ['#483D8B', '#6A5ACD']
        ];

        const getGridConfig = () => {

            if (screenWidth <= 400) {
                return { numColumns: 2, cardWidth: (screenWidth - 48) / 2, margin: 12, gutter: 12 };
            } else if (screenWidth <= 600) {
                return { numColumns: 2, cardWidth: (screenWidth - 48) / 2, margin: 12, gutter: 12 };
            } else if (screenWidth <= 900) {
                return { numColumns: 3, cardWidth: (screenWidth - 64) / 3, margin: 12, gutter: 12 };
            } else {
                return { numColumns: 4, cardWidth: (screenWidth - 80) / 4, margin: 12, gutter: 12 };
            }

        };

        const gridConfig = getGridConfig();

        const formatValue = (value, col) => {

            if (value === undefined || value === null) return "-";

            if (col === "ToDaysCollection" || col === "CrInBankAccCollection") {

                return `₹ ${parseFloat(value).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;

            }

            return String(value);
        };

        const renderCard = (item, index, tabType) => {
            const colors = DASHBOARD_COLORS[index % DASHBOARD_COLORS.length];
            const isActive = activeSlab === item.PrpCode;
            const cardHeight = Math.max(140, visibleColumns.length * 45 + 50);
            return (
                <TouchableOpacity
                    key={`${item.PrpCode}-${index}`}
                    style={{
                        width: gridConfig.cardWidth,
                        height: cardHeight,
                        borderRadius: 8,
                        marginBottom: gridConfig.gutter,
                        overflow: "hidden",
                        elevation: 3,
                    }}
                    activeOpacity={0.9}
                    disabled={isLoadingSummary}
                    onPress={() => onCardPress && onCardPress(item)}
                >
                    <LinearGradient
                        colors={isActive
                            ? [theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]
                            : colors}
                        style={{
                            flex: 1,
                            padding: 12,
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            {visibleColumns.map((col) => (
                                <View
                                    key={col}
                                    style={{
                                        marginBottom: 8,
                                        alignItems: 'flex-end',
                                        width: '100%',
                                    }}
                                >
                                    <Text style={{
                                        color: "rgba(255,255,255,0.6)",
                                        fontSize: screenWidth <= 400 ? 10 : 11,
                                        marginBottom: 2
                                    }}>
                                        {labelMap[col]}
                                    </Text>
                                    <Text style={{
                                        color: "#fff",
                                        fontSize: screenWidth <= 400 ? 11 : 12,
                                        fontWeight: "700"
                                    }}>
                                        {formatValue(item[col], col)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            );
        };

        const renderItemsInGrid = () => {
            const rows = [];
            for (let i = 0; i < filteredData.length; i += gridConfig.numColumns) {
                const rowItems = filteredData.slice(i, i + gridConfig.numColumns);
                rows.push(
                    <View
                        key={`row-${i}`}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            marginHorizontal: gridConfig.margin,
                            gap: gridConfig.gutter,
                        }}
                    >

                        {rowItems.map((item, index) =>
                            renderCard(item, i + index)
                        )}

                        {rowItems.length < gridConfig.numColumns &&
                            Array(gridConfig.numColumns - rowItems.length)
                                .fill(null)
                                .map((_, index) => (
                                    <View
                                        key={`empty-${index}`}
                                        style={{ width: gridConfig.cardWidth }}
                                    />
                                ))
                        }

                    </View>

                );
            }

            return rows;
        };

        // ✅ Footer totals
        const Footer = () => {

            if (!filteredData.length) return null;

            return (

                <LinearGradient
                    colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: screenWidth <= 400 ? 10 : 12,
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        elevation: 8,
                        shadowColor: "#000",
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: -2 },
                    }}
                >

                    <Text style={{
                        color: "#fff",
                        fontSize: screenWidth <= 400 ? 11 : 12,
                        fontWeight: "600",
                        marginBottom: 8,
                    }}>
                        Totals
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingRight: 20 }}>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                            <Text style={{
                                color: "rgba(255,255,255,0.9)",
                                fontSize: screenWidth <= 400 ? 10 : 11,
                                fontWeight: "500",
                                marginRight: 8,
                            }}>
                                Collection:
                            </Text>

                            <Text style={{
                                color: "#fff",
                                fontSize: screenWidth <= 400 ? 10 : 11,
                                fontWeight: "600",
                            }}>
                                ₹{totals.ToDaysCollection.toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </Text>

                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                            <Text style={{
                                color: "rgba(255,255,255,0.9)",
                                fontSize: screenWidth <= 400 ? 10 : 11,
                                fontWeight: "500",
                                marginRight: 8,
                            }}>
                                Credit in Bank:
                            </Text>

                            <Text style={{
                                color: "#fff",
                                fontSize: screenWidth <= 400 ? 10 : 11,
                                fontWeight: "600",
                            }}>
                                ₹{totals.CrInBankAccCollection.toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </Text>

                        </View>

                    </View>

                </LinearGradient>

            );
        };

        return (

            <View style={[styles.container, { backgroundColor: '#f8f9fa' }]}>

                <ScrollView
                    contentContainerStyle={{
                        paddingTop: 12,
                        paddingBottom: 100
                    }}
                    showsVerticalScrollIndicator={false}
                >

                    {filteredData.length > 0 ? (
                        renderItemsInGrid()
                    ) : (
                        <View style={{
                            flex: 1,
                            justifyContent: "center",
                            alignItems: "center",
                            padding: 40,
                            marginTop: 60
                        }}>
                            <Icon name="search-off" size={48} color="#ccc" />
                            <Text style={{
                                color: "#666",
                                fontSize: 16,
                                marginTop: 12,
                                textAlign: 'center'
                            }}>
                                No records found
                            </Text>
                        </View>
                    )}

                </ScrollView>

                <Footer />

            </View>

        );

    });

    //main cards detail Over

    const filteredData12 = useMemo(() => {
        let data = [];
        if (modalTab === "SalesExecutiveWise") {
            data = Array.isArray(selectedExe) ? selectedExe : [];
        } else {
            data = Array.isArray(partyData) ? partyData : [];
        }
        if (!sexeSearchQuery?.trim()) return data;
        const query = sexeSearchQuery.toLowerCase();
        return data.filter(item =>
            Object.values(item || {}).some(val =>
                String(val || "")
                    .toLowerCase()
                    .includes(query)
            )
        );
    }, [modalTab, selectedExe, partyData, sexeSearchQuery]);


    const filteredPartyData = useMemo(() => {
        // console.log("filterpartyData ---", filterpartyData)
        if (!partySearchQuery.trim()) return filterpartyData;
        const query = partySearchQuery.toLowerCase();
        return filterpartyData.filter(item =>
            Object.values(item || {}).some(val =>
                String(val || "")
                    .toLowerCase()
                    .includes(query)
            )
        );
    }, [filterpartyData, partySearchQuery]);

    // Dark colors for cards
    const CARD_COLORS = [
        ["#1A1A2E", "#2D1B69"], // Dark Purple
        ["#0F3460", "#1E5A8A"], // Deep Ocean
        ["#1B5E20", "#2E7D32"], // Forest Green
        ["#333333", "#4F4F4F"], // Charcoal
        ["#5D1049", "#8A235C"], // Dark Magenta
        ["#8B4513", "#A0522D"], // Saddle Brown
        ["#2F4F4F", "#556B2F"], // Dark Slate Gray
        ["#483D8B", "#6A5ACD"], // Slate Blue
    ];

    // Responsive grid configuration
    const { width: screenWidth } = useWindowDimensions();
    const getGridConfig = () => {
        if (screenWidth <= 600) return { numColumns: 2, cardWidth: (screenWidth - 48) / 2, margin: 12, gutter: 12 };
        else if (screenWidth <= 900) return { numColumns: 3, cardWidth: (screenWidth - 64) / 3, margin: 12, gutter: 12 };
        else return { numColumns: 4, cardWidth: (screenWidth - 80) / 4, margin: 12, gutter: 12 };
    };
    const gridConfig = getGridConfig();
    const getGridConfig123 = () => {
        // if (screenWidth <= 500) return { numColumns: 1, cardWidth: (screenWidth - 48) / 1, margin: 12, gutter: 12 };
        if (screenWidth <= 600) return { numColumns: 2, cardWidth: (screenWidth - 48) / 2, margin: 12, gutter: 12 };
        else if (screenWidth <= 900) return { numColumns: 3, cardWidth: (screenWidth - 64) / 3, margin: 12, gutter: 12 };
        else return { numColumns: 4, cardWidth: (screenWidth - 80) / 4, margin: 12, gutter: 12 };
    };
    const gridConfig123 = getGridConfig123();

    // Render Party Wise And Excutive vise card display
    const renderCard = (item, index) => {
        // console.log("filterpartyData ::::", filterpartyData)
        const colors = getSexeLoading ? ["#C0C0C0", "#C0C0C0"] : CARD_COLORS[index % CARD_COLORS.length];
        const isAllCard = item.SalesExecutive === "ALL";

        // Calculate totals for "ALL" card
        const totalToDaysCollection = filteredData12.reduce(
            (sum, dataItem) => sum + parseFloat(dataItem.ToDaysCollection || '0'),
            0
        );
        const totalCrInBankAccCollection = filteredData12.reduce(
            (sum, dataItem) => sum + parseFloat(dataItem.CrInBankAccCollection || '0'),
            0
        );

        return (
            <TouchableOpacity
                key={item.Code || index}
                style={{
                    width: gridConfig123.cardWidth,
                    minHeight: isAllCard ? 160 : 120, // Taller card for "ALL"
                    borderRadius: 8,
                    marginBottom: gridConfig123.gutter,
                    overflow: "hidden",
                    elevation: 3,
                    backgroundColor: "#121212",
                    borderWidth: isAllCard ? 1 : 0,
                    borderColor: isAllCard ? theme.BRAND_GRADIENT_END : "transparent",
                }}
                activeOpacity={0.9}
                // onPress={() => {
                //     if (!getSexeLoading) {
                //         setLoadingStates({ [item.Code || "ALL"]: true });
                //         setSelectedSexeName(item.SalesExecutive);
                //         handleLoadPressSEXE(item);
                //     }
                // }}

                onPress={async () => {
                    if (modalTab === "SalesExecutiveWise") {
                        setLoadingStates({ [item.Code || "ALL"]: true });
                        setSelectedSexeName(item.SalesExecutive);
                        await handlesalesexcutivefetch(item.PrpCode, item);
                    } else {
                        if (getSexeLoading) return;
                        setLoadingStates({ [item.Code || "ALL"]: true });
                        setSelectedSexeName(item.SalesExecutive);
                        handleLoadPressSEXE(item);
                    }
                }}
                disabled={getSexeLoading}
            >
                <LinearGradient
                    colors={colors}
                    style={{ flex: 1, padding: 12 }}
                >
                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                        {/* Sales Executive Name */}
                        <Text
                            style={{
                                color: "#fff",
                                fontSize: isAllCard ? 16 : 14,
                                fontWeight: isAllCard ? "bold" : "bold",
                                textAlign: 'right',
                                marginBottom: 4,
                            }}
                        >
                            {item.SalesExecutive}
                        </Text>

                        {/* Code (skip for "ALL") */}
                        {!isAllCard && (
                            <Text style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: 11,
                                textAlign: 'right',
                                marginBottom: 8,
                            }}>
                                Code: {item.SExe}
                            </Text>
                        )}

                        {/* Today's Collection */}
                        <View style={{ marginBottom: 6 }}>
                            <Text style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: 11,
                                textAlign: 'right',
                            }}>
                                Collection:
                            </Text>
                            <Text style={{
                                color: "#fff",
                                fontSize: isAllCard ? 14 : 12,
                                fontWeight: "bold",
                                textAlign: 'right',
                            }}>
                                ₹{isAllCard
                                    ? totalToDaysCollection.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })
                                    : item.ToDaysCollection}
                            </Text>
                        </View>

                        {/* Credit in Bank */}
                        <View>
                            <Text style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: 11,
                                textAlign: 'right',
                            }}>
                                Credit in Bank:
                            </Text>
                            <Text style={{
                                color: "#fff",
                                fontSize: isAllCard ? 14 : 12,
                                fontWeight: "bold",
                                textAlign: 'right',
                            }}>
                                ₹{isAllCard
                                    ? totalCrInBankAccCollection.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })
                                    : item.CrInBankAccCollection}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const renderItemsInGrid = (data, tabType) => {
        if (!data || data.length === 0) return null;
        const rows = [];
        for (let i = 0; i < data.length; i += gridConfig123.numColumns) {
            const rowItems = data.slice(i, i + gridConfig123.numColumns);
            rows.push(
                <View
                    key={`row-${i}`}
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        marginHorizontal: gridConfig123.margin,
                        gap: gridConfig123.gutter,
                    }}
                >
                    {rowItems.map((item, index) =>
                        renderCard(item, i + index, tabType)   // 👈 tabType pass
                    )}
                </View>
            );
        }

        return rows;
    };



    const renderPartyCard = (item, index) => {
        const colors = getSexeLoading ? ["#C0C0C0", "#C0C0C0"] : CARD_COLORS[index % CARD_COLORS.length];
        const isAllCard = item.SalesExecutive === "ALL";
        const totalToDaysCollection = filteredPartyData.reduce(
            (sum, dataItem) => sum + parseFloat(dataItem.ToDaysCollection || '0'),
            0
        );
        const totalCrInBankAccCollection = filteredPartyData.reduce(
            (sum, dataItem) => sum + parseFloat(dataItem.CrInBankAccCollection || '0'),
            0
        );

        return (
            <TouchableOpacity
                key={item.Code || index}
                style={{
                    width: gridConfig123.cardWidth,
                    minHeight: isAllCard ? 160 : 120, // Taller card for "ALL"
                    borderRadius: 8,
                    marginBottom: gridConfig123.gutter,
                    overflow: "hidden",
                    elevation: 3,
                    backgroundColor: "#121212",
                    borderWidth: isAllCard ? 1 : 0,
                    borderColor: isAllCard ? theme.BRAND_GRADIENT_END : "transparent",
                }}
                activeOpacity={0.9}
                onPress={async () => {
                    if (getSexeLoading) return;
                    setLoadingStates({ [item.Code || "ALL"]: true });
                    setSelectedSexeName(item.SalesExecutive);
                    handleLoadPressSEXE(item);
                }}
                disabled={getSexeLoading}
            >
                <LinearGradient
                    colors={colors}
                    style={{ flex: 1, padding: 12 }}
                >
                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                        {/* Sales Executive Name */}
                        <Text
                            style={{
                                color: "#fff",
                                fontSize: isAllCard ? 16 : 14,
                                fontWeight: isAllCard ? "bold" : "bold",
                                textAlign: 'right',
                                marginBottom: 4,
                            }}
                        >
                            {item.SalesExecutive}
                        </Text>

                        {/* Code (skip for "ALL") */}
                        {!isAllCard && (
                            <Text style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: 11,
                                textAlign: 'right',
                                marginBottom: 8,
                            }}>
                                Code: {item.SExe}
                            </Text>
                        )}

                        {/* Today's Collection */}
                        <View style={{ marginBottom: 6 }}>
                            <Text style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: 11,
                                textAlign: 'right',
                            }}>
                                Collection:
                            </Text>
                            <Text style={{
                                color: "#fff",
                                fontSize: isAllCard ? 14 : 12,
                                fontWeight: "bold",
                                textAlign: 'right',
                            }}>
                                ₹{isAllCard
                                    ? totalToDaysCollection.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })
                                    : item.ToDaysCollection}
                            </Text>
                        </View>

                        {/* Credit in Bank */}
                        <View>
                            <Text style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: 11,
                                textAlign: 'right',
                            }}>
                                Credit in Bank:
                            </Text>
                            <Text style={{
                                color: "#fff",
                                fontSize: isAllCard ? 14 : 12,
                                fontWeight: "bold",
                                textAlign: 'right',
                            }}>
                                ₹{isAllCard
                                    ? totalCrInBankAccCollection.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })
                                    : item.CrInBankAccCollection}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const renderPartyItemsInGrid = (data) => {
        if (!data || data.length === 0) return null;
        const rows = [];
        for (let i = 0; i < data.length; i += gridConfig123.numColumns) {
            const rowItems = data.slice(i, i + gridConfig123.numColumns);
            rows.push(
                <View
                    key={`row-${i}`}
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        marginHorizontal: gridConfig123.margin,
                        gap: gridConfig123.gutter,
                    }}
                >
                    {rowItems.map((item, index) =>
                        renderPartyCard(item, i + index)   // 👈 tabType pass
                    )}
                </View>
            );
        }

        return rows;
    };

    // Render Party Wise And Excutive vise card display over

    //  Party Wise and excutive wise api start
    const handleConfirmActionNew = useCallback(async (prpcode, card) => {
        setIsLoadingSummary(true);
        const formatDate = (dateStr) => {
            if (!dateStr) return "";
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        };
        const payload = {
            prptype: form?.PrpOf || "",
            prpcodes: form.PrpCode, // Convert array to comma-separated string
            action: 'daily_collection_report',
            txntype: "mob_daily_collection_report",
            // rpttype: 0,
            rpttype: 1,
            sexe: form?.SexeCode || [],
            fromdate: formatDate(form.fromdate),
            todate: formatDate(form.todate)
        }
        await SalesExeMain(card.PrpCode, payload);
        // console.log("Clicked Card:", card);
        // console.log("Card SExe:", card?.SExe);
        // console.log("Final Sexe Payload:", payload.sexe);

    }, [form, modalTab]);

    const SalesExeMain = async (prpcode, payload) => {
        const detailPayload = {
            ...payload,
            prpcodes: [prpcode],
            sexe: [],
        };
        setDetailPayload(detailPayload);
        setSexeLoading(true);
        try {

            const payloadSexe = {
                prptype: form?.PrpOf || "",
                prpcodes: detailPayload.prpcodes,
                action: "daily_collection_report",
                txntype: "mob_daily_collection_report",
                rpttype: 1,
                sexe: form?.SexeCode || [],
                // sexe: payload.sexe,
                fromdate: detailPayload.fromdate,
                todate: detailPayload.todate
            };
            // console.log("Payload", payloadSexe)
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
                "X-Requested-with": "XMLHttpRequest",
            };
            const responsesexe = await axios.post(
                `${API}/api/collection_crud`,
                payloadSexe,
                { headers }
            );
            // console.log("responsesexe", responsesexe);
            if (responsesexe?.data?.success) {
                setSexeLoading(false);
                setIsLoadingSummary(false);

                const partyData = responsesexe?.data?.data?.party || [];
                const sexeData = responsesexe?.data?.data?.sexe || [];

                // console.log("partyData", partyData);
                // console.log("sexeData", sexeData);

                // 🔹 length check
                const mappedExe = Array.isArray(sexeData) && sexeData.length > 0
                    ? sexeData.map(item => ({
                        PrpCode: item.prpcode,
                        PrpName: item.sexename,
                        SExe: item.SExe,
                        acccode: "",
                        SalesExecutive: item.sexename,
                        ToDaysCollection: item.tranamt,
                        CrInBankAccCollection: item.clramt
                    }))
                    : [];

                const mappedParty = Array.isArray(partyData) && partyData.length > 0
                    ? partyData.map(item => ({
                        PrpCode: item.prpcode,
                        PrpName: item.AccName,
                        SExe: "",
                        acccode: item.acccode,
                        SalesExecutive: item.AccName,
                        ToDaysCollection: item.tranamt,
                        CrInBankAccCollection: item.clramt
                    }))
                    : [];

                const customItem = {
                    PrpCode: mappedExe?.length > 0 ? mappedExe[0]?.PrpCode : "",
                    PrpName: mappedExe?.length > 0 ? mappedExe[0]?.PrpName : "",
                    SExe: "",
                    SalesExecutive: "ALL",
                    ToDaysCollection: "",
                    CrInBankAccCollection: ".00"
                };
                setSelectedExe([customItem, ...mappedExe]);
                setpartydata([customItem, ...mappedParty]);
                setModalTab("PartyWise");

                setSexeModalVisible(true);
            }

        } catch (error) {

            console.error("Error:", error);
            setSexeLoading(false);
            setIsLoadingSummary(true);

        } finally {

            setLoadingStates(prev => ({
                ...prev,
                [prpcode]: false
            }));

            setSexeLoading(false);
        }
    };

    //  Party Wise and excutive wise api over

    // sales excutive wise party
    const handlesalesexcutivefetch = useCallback(async (prpcode, card) => {
        setIsLoadingSummary(true);
        const formatDate = (dateStr) => {
            if (!dateStr) return "";
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        };
        const payload = {
            prptype: form?.PrpOf || "",
            prpcodes: form.PrpCode,
            action: 'daily_collection_report',
            txntype: "mob_daily_collection_report",
            rpttype: 1,
            sexe: (card?.SExe
                ? String(card.SExe).split(",").map(v => v.trim())
                : []),
            fromdate: formatDate(form.fromdate),
            todate: formatDate(form.todate)
        }
        await SalesExeMaindetail(card.PrpCode, payload);
        // console.log("payload", payload)

    }, [form]);

    const SalesExeMaindetail = async (prpcode, payload) => {
        const detailPayload = {
            ...payload,
            prpcodes: [prpcode],
            // sexe: [],
        };
        setDetailPayload(detailPayload);
        setSexeLoading(true);
        try {
            const payloadSexe = {
                prptype: form?.PrpOf || "",
                prpcodes: detailPayload.prpcodes,
                action: "daily_collection_report",
                txntype: "mob_daily_collection_report",
                rpttype: 1,
                sexe: payload?.sexe || [],
                fromdate: detailPayload.fromdate,
                todate: detailPayload.todate
            };
            // console.log("payloadSexe", payloadSexe)
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
                "X-Requested-with": "XMLHttpRequest",
            };
            const responsesexe = await axios.post(
                `${API}/api/collection_crud`,
                payloadSexe,
                { headers }
            );
            // console.log("responsesexe", responsesexe);
            if (responsesexe?.data?.success) {
                setSexeLoading(false);
                setIsLoadingSummary(false);

                const partyData = responsesexe?.data?.data?.party || [];
                const sexeData = responsesexe?.data?.data?.sexe || [];

                // console.log("partyData", partyData);
                // console.log("sexeData", sexeData);

                // 🔹 length check
                const mappedExe = Array.isArray(sexeData) && sexeData.length > 0
                    ? sexeData.map(item => ({
                        PrpCode: item.prpcode,
                        PrpName: item.sexename,
                        SExe: item.SExe,
                        acccode: "",
                        SalesExecutive: item.sexename,
                        ToDaysCollection: item.tranamt,
                        CrInBankAccCollection: item.clramt
                    }))
                    : [];

                const mappedParty = Array.isArray(partyData) && partyData.length > 0
                    ? partyData.map(item => ({
                        PrpCode: item.prpcode,
                        PrpName: item.AccName,
                        SExe: "",
                        acccode: item.acccode,
                        SalesExecutive: item.AccName,
                        ToDaysCollection: item.tranamt,
                        CrInBankAccCollection: item.clramt
                    }))
                    : [];

                const customItem = {
                    PrpCode: mappedExe?.length > 0 ? mappedExe[0]?.PrpCode : "",
                    PrpName: mappedExe?.length > 0 ? mappedExe[0]?.PrpName : "",
                    SExe: "",
                    SalesExecutive: "ALL",
                    ToDaysCollection: "",
                    CrInBankAccCollection: ".00"
                };
                setfilterpartydata([customItem, ...mappedParty]);
                setModalTab("SalesExecutiveWise");
                setPartyWiseModalVisible(true);
                // setSexeModalVisible(true);
            }

        } catch (error) {

            console.error("Error:", error);
            setSexeLoading(false);
            setIsLoadingSummary(true);

        } finally {

            setLoadingStates(prev => ({
                ...prev,
                [prpcode]: false
            }));

            setSexeLoading(false);
        }
    };
    // sales excutivewise party over

    useEffect(() => {
        const initializeApp123 = async () => {
            try {
                const mas = await AsyncStorage.getItem('master_sync_data_common');
                setMasSync(JSON.parse(mas as any));
            } catch (error) {
                console.error("Initialization error:", error);

            } finally {
            }
        };

        initializeApp123();
    }, []);

    const SalesExe = useCallback(async () => {
        try {
            const matchedEntry = masSync.find(item => item.prptype === form.PrpOf);
            const prpcode = matchedEntry ? matchedEntry.prpcode : null;

            const payloadSexe = {

                prptype: form.PrpOf,
                prpcode: prpcode,
                // txntype: "mob_collection",
                yearno: currentYear?.toString(),
                user_id: "1"
            }

            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/javascript',
                Accept: 'application/json'
            }

            const responsesexe = await axios.get(
                `${API}/api/get_mob_salesexe`,
                getRequestConfig({ params: payloadSexe })
            );
            if (responsesexe.data.success === true) {
                // setdashSexeLoading(false);
                // console.log('🔵 dashSexe API Response:', payloadSexe, responsesexe);
                const mainData = responsesexe.data.response.data;
                setExeDataCRT(mainData)
                // const maindataSexe = responsesexe.data.response.data;
                // setdashSexe(maindataSexe);
            }
        } catch (error) {
            // setdashPartyLoading(false);
            // setdashSexeLoading(false);
            console.error("Token check error:", error);
        }
    }, [form, currentYear]);

    useEffect(() => {
        if (form.PrpOf) {
            SalesExe();
        }
    }, [form.PrpOf]);

    const onDashboardCardPress = (card) => {
        if (!card || !card.PrpCode) return;

        setActiveCard(card.PrpCode);
        handleConfirmActionNew(card?.PrpCode, card);
        setSexeModalVisible(true); // ✅ modal yaha open hoga
    };

    const renderModalContent = () => {
        if (!filteredData12.length) return null;
        return renderItemsInGrid(filteredData12, modalTab);
    };

    const renderPartyModalContent = () => {
        if (!filteredPartyData.length) return null;
        return renderItemsInGrid(filteredData12, "PartyWise");
    }

    return (
        <>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <HeaderBar
                    userName={username}
                    onSearch={setSearchQueryPOT}
                    placeholder="Search reports..."
                />
                <View style={crlimtreq_styles.container_list123}>
                    {isLoading ? <FullScreenLoader message="Loading..." /> : (<><View style={crlimtreq_styles.container}>
                        <TouchableOpacity style={crlimtreq_styles.listIconContainer} onPress={openDrawer}>
                            <Icon name="list" size={24} color="white" />
                        </TouchableOpacity>
                        {gePOTData.length > 0 ? (
                            <>
                                <DetailCardGrid
                                    data={gePOTData}
                                    searchQuery={searchQueryPOT}
                                    onCardPress={onDashboardCardPress}
                                    activeSlab={activeCard}
                                    isLoadingSummary={isLoadingSummary}
                                    getSummaryData={getSummaryData}
                                />
                                <Modal
                                    visible={sexeModalVisible}
                                    animationType="slide"
                                    onRequestClose={() => setSexeModalVisible(false)}
                                >
                                    <View style={{ flex: 1 }}>

                                        <View style={{
                                            flex: 1,
                                            backgroundColor: "rgb(255, 255, 255)",
                                            margin: 10,
                                        }}>

                                            {/* Header */}

                                            <View style={{
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: 12,
                                                borderBottomWidth: 1,
                                                borderBottomColor: "#333",
                                                backgroundColor: theme.BRAND_GRADIENT_END,
                                                borderTopLeftRadius: 10,
                                                borderTopRightRadius: 10,
                                            }}>
                                                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                                                    {selectedSexeCard?.SalesExecutive || 'Sales Executive Details'}
                                                </Text>

                                                <TouchableOpacity onPress={() => setSexeModalVisible(false)}>
                                                    <Icon name="close" size={24} color="#fff" />
                                                </TouchableOpacity>

                                            </View>


                                            {/* Tabs */}

                                            <View style={{
                                                flexDirection: "row",
                                                backgroundColor: "#f2f2f2",
                                                borderBottomWidth: 1,
                                                borderColor: "#ddd"
                                            }}>

                                                <TouchableOpacity
                                                    style={{
                                                        flex: 1,
                                                        padding: 12,
                                                        alignItems: "center",
                                                        borderBottomWidth: modalTab === "PartyWise" ? 3 : 0,
                                                        borderBottomColor: theme.BRAND_GRADIENT_END
                                                    }}
                                                    onPress={() => setModalTab("PartyWise")}
                                                >

                                                    <Text style={{
                                                        fontWeight: "600",
                                                        color: modalTab === "PartyWise"
                                                            ? theme.BRAND_GRADIENT_END
                                                            : "#666"
                                                    }}>
                                                        Party Wise
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={{
                                                        flex: 1,
                                                        padding: 12,
                                                        alignItems: "center",
                                                        borderBottomWidth: modalTab === "SalesExecutiveWise" ? 3 : 0,
                                                        borderBottomColor: theme.BRAND_GRADIENT_END
                                                    }}
                                                    onPress={() => {
                                                        if (isLoadingSummary) return;
                                                        setModalTab("SalesExecutiveWise");
                                                    }}
                                                >

                                                    <Text style={{
                                                        fontWeight: "600",
                                                        color: modalTab === "SalesExecutiveWise"
                                                            ? theme.BRAND_GRADIENT_END
                                                            : "#666"
                                                    }}>
                                                        Sales Executive Wise
                                                    </Text>

                                                </TouchableOpacity>
                                            </View>
                                            {/* Search */}
                                            {getSexeLoading ? (
                                                <View style={{
                                                    padding: 12,
                                                    borderWidth: 1,
                                                    borderColor: "rgba(0,0,0,0.1)",
                                                    borderRadius: 5,
                                                    margin: 10,
                                                    backgroundColor: "#fff"
                                                }}>
                                                    <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} />
                                                </View>
                                            ) : (
                                                <TextInput
                                                    placeholder="Search..."
                                                    value={sexeSearchQuery}
                                                    onChangeText={setSexeSearchQuery}
                                                    style={{
                                                        padding: 10,
                                                        borderWidth: 1,
                                                        borderColor: "rgba(0,0,0,0.1)",
                                                        borderRadius: 5,
                                                        margin: 10,
                                                        fontSize: 11,
                                                        color: "#000",
                                                        backgroundColor: "#fff",
                                                    }}
                                                    placeholderTextColor="#999"
                                                />

                                            )}
                                            <ScrollView
                                                contentContainerStyle={{ paddingBottom: 120 }}
                                                showsVerticalScrollIndicator={false}
                                                keyboardShouldPersistTaps="handled"
                                            >

                                                {filteredData12.length > 0 ? (
                                                    renderModalContent()
                                                ) : (
                                                    <View style={{
                                                        flex: 1,
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                        padding: 40,
                                                        marginTop: 60
                                                    }}>

                                                        <Icon name="search-off" size={48} color="#666" />

                                                        <Text style={{
                                                            color: "#666",
                                                            fontSize: 16,
                                                            marginTop: 12,
                                                            textAlign: 'center'
                                                        }}>
                                                            No records found
                                                        </Text>

                                                    </View>

                                                )}

                                            </ScrollView>
                                            {/* Totals Footer */}

                                            <View style={{
                                                position: "absolute",
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                padding: screenWidth <= 400 ? 10 : 12,
                                                borderTopLeftRadius: 12,
                                                borderTopRightRadius: 12,
                                                elevation: 8,
                                                shadowColor: "#000",
                                                shadowOpacity: 0.2,
                                                shadowRadius: 6,
                                                shadowOffset: { width: 0, height: -2 },
                                                backgroundColor: theme.BRAND_GRADIENT_END,
                                                zIndex: 1000,
                                            }}>

                                                <Text style={{
                                                    color: "#fff",
                                                    fontSize: screenWidth <= 400 ? 11 : 12,
                                                    fontWeight: "600",
                                                    marginBottom: 8,
                                                }}>
                                                    Totals
                                                </Text>


                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingRight: 20 }}>


                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                                                        <Text style={{
                                                            color: "rgba(255,255,255,0.9)",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "500",
                                                            marginRight: 8,
                                                        }}>
                                                            Today's Collection:
                                                        </Text>

                                                        <Text style={{
                                                            color: "#fff",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "600",
                                                        }}>
                                                            ₹{parseFloat(
                                                                filteredData12.reduce((sum, item) =>
                                                                    sum + parseFloat(item.ToDaysCollection || '0'), 0)
                                                            ).toLocaleString('en-IN', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}
                                                        </Text>

                                                    </View>


                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                                                        <Text style={{
                                                            color: "rgba(255,255,255,0.9)",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "500",
                                                            marginRight: 8,
                                                        }}>
                                                            Credit in Bank:
                                                        </Text>

                                                        <Text style={{
                                                            color: "#fff",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "600",
                                                        }}>
                                                            ₹{parseFloat(
                                                                filteredData12.reduce((sum, item) =>
                                                                    sum + parseFloat(item.CrInBankAccCollection || '0'), 0)
                                                            ).toLocaleString('en-IN', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </Modal>

                                <Modal
                                    visible={partyWiseModalVisible}
                                    animationType="slide"
                                    onRequestClose={() => setPartyWiseModalVisible(false)}
                                >
                                    {/* <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)" }}> */}
                                    <View style={{ flex: 1 }}>
                                        <View style={{
                                            flex: 1,
                                            // backgroundColor: "#121212", // Dark modal background
                                            backgroundColor: "rgb(255, 255, 255)", // Dark modal background
                                            margin: 10,
                                            // borderRadius: 10,
                                            // borderWidth: 1,
                                            // borderColor: "#333",
                                        }}>
                                            {/* Header */}
                                            <View style={{
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: 12,
                                                borderBottomWidth: 1,
                                                borderBottomColor: "#333",
                                                backgroundColor: theme.BRAND_GRADIENT_END,
                                                borderTopLeftRadius: 10,
                                                borderTopRightRadius: 10,
                                            }}>
                                                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                                                    {selectedSexeCard?.SalesExecutive || 'Party Wise Detail'}
                                                </Text>
                                                <TouchableOpacity onPress={() => setPartyWiseModalVisible(false)}>
                                                    <Icon name="close" size={24} color="#fff" />
                                                </TouchableOpacity>
                                            </View>

                                            {/* Search */}
                                            {getSexeLoading ? (
                                                <View style={{
                                                    padding: 12,
                                                    borderWidth: 1,
                                                    borderColor: "rgba(0, 0, 0, 0.1)",
                                                    borderRadius: 5,
                                                    margin: 10,
                                                    // fontSize: 11,
                                                    // color: "#000",
                                                    backgroundColor: "#fff",
                                                    display: "flex",
                                                }}>
                                                    <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} />
                                                    {/* <Text>Loading...</Text> */}
                                                </View>
                                            ) : (
                                                <TextInput
                                                    placeholder="Search..."
                                                    value={sexeSearchQuery}
                                                    onChangeText={setSexeSearchQuery}
                                                    style={{
                                                        padding: 10,
                                                        borderWidth: 1,
                                                        borderColor: "rgba(0, 0, 0, 0.1)",
                                                        borderRadius: 5,
                                                        margin: 10,
                                                        fontSize: 11,
                                                        color: "#000",
                                                        backgroundColor: "#fff",
                                                    }}
                                                    placeholderTextColor="#999"
                                                />
                                            )}



                                            {/* Content */}
                                            <ScrollView
                                                contentContainerStyle={{ paddingBottom: 20 }}
                                                showsVerticalScrollIndicator={false}
                                                keyboardShouldPersistTaps="handled" // Fix search rerender focus issue
                                            >
                                                {filteredPartyData.length > 0 ? (
                                                    // renderPartyItemsInGrid()
                                                    renderPartyItemsInGrid(filteredPartyData)
                                                ) : (
                                                    <View style={{
                                                        flex: 1,
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                        padding: 40,
                                                        marginTop: 60
                                                    }}>
                                                        <Icon name="search-off" size={48} color="#666" />
                                                        <Text style={{
                                                            color: "#666",
                                                            fontSize: 16,
                                                            marginTop: 12,
                                                            textAlign: 'center'
                                                        }}>
                                                            No records found
                                                        </Text>
                                                    </View>
                                                )}
                                            </ScrollView>
                                            <View style={{
                                                position: "absolute",
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                padding: screenWidth <= 400 ? 10 : 12,
                                                borderTopLeftRadius: 12,
                                                borderTopRightRadius: 12,
                                                elevation: 8,
                                                shadowColor: "#000",
                                                shadowOpacity: 0.2,
                                                shadowRadius: 6,
                                                shadowOffset: { width: 0, height: -2 },
                                                backgroundColor: theme.BRAND_GRADIENT_END,
                                                zIndex: 1000,
                                            }}>
                                                <Text style={{
                                                    color: "#fff",
                                                    fontSize: screenWidth <= 400 ? 11 : 12,
                                                    fontWeight: "600",
                                                    marginBottom: 8,
                                                }}>
                                                    Totals
                                                </Text>

                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingRight: 20 }}>
                                                    {/* ToDaysCollection Total */}
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Text style={{
                                                            color: "rgba(255,255,255,0.9)",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "500",
                                                            marginRight: 8,
                                                        }}>
                                                            Today's Collection:
                                                        </Text>
                                                        <Text style={{
                                                            color: "#fff",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "600",
                                                        }}>
                                                            ₹{parseFloat(
                                                                filteredPartyData.reduce((sum, item) => sum + parseFloat(item.ToDaysCollection || '0'), 0)
                                                            ).toLocaleString('en-IN', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}
                                                        </Text>
                                                    </View>

                                                    {/* CrInBankAccCollection Total */}
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Text style={{
                                                            color: "rgba(255,255,255,0.9)",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "500",
                                                            marginRight: 8,
                                                        }}>
                                                            Credit in Bank:
                                                        </Text>
                                                        <Text style={{
                                                            color: "#fff",
                                                            fontSize: screenWidth <= 400 ? 10 : 11,
                                                            fontWeight: "600",
                                                        }}>
                                                            ₹{parseFloat(
                                                                filteredPartyData.reduce((sum, item) => sum + parseFloat(item.CrInBankAccCollection || '0'), 0)
                                                            ).toLocaleString('en-IN', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                        </View>
                                    </View>
                                </Modal>
                            </>

                        ) : (
                            <>
                                <View style={crlimtreq_styles.noDataContainer}>
                                    <Text style={crlimtreq_styles.noDataText}>No data available</Text>
                                </View>
                            </>
                        )}

                    </View></>)}
                </View>

                <CustomDrawer
                    isVisible={isDrawerVisible}
                    onClose={closeDrawer}
                    fromDate={fromDate}
                    toDate={toDate}
                    selectedYear={selectedYear}
                    onFromDateChange={setFromDate}
                    onToDateChange={setToDate}
                    onYearChange={setSelectedYear}
                    onLoadPress={handleLoadPress}
                    exeData={exeData}
                    exeDataCRT={exeDataCRT}
                    onExeChange={setSelectedExeCRT}
                    selectedExe={selectedExeCRT?.SalesExecutive || 'Select Executive'}
                    designData={designData}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    // onDesignSelect={handleDesignSelect}
                    // onItemSelectItem={handleItemSelect}
                    selectedDesigns={selectedDesigns}
                    // setSelectedDesigns={setSelectedDesigns}
                    // setSelectedItems={setSelectedItems}
                    selectedItems={selectedItems}
                    itemData={itemData}
                    getPropertyGroupData={getPropertyGroupData}
                    getPropertyData={getPropertyData}
                    setSelectedProperty={setSelectedProperty}
                    setSelectedPropertyGroup={setSelectedPropertyGroup}
                    selectedProperty={selectedProperty}
                    selectedPropertyGroup={selectedPropertyGroup}
                    setForm={setForm}
                    setIsLoggedIn={setIsLoggedIn}
                    isConnected={isConnected}
                    setSelectedSexe={setSelectedSexe}
                    SelectedSexe={SelectedSexe}
                    form={form}

                // selectedItemStatus={selectedItemStatus}
                // onItemStatusChange={handleItemStatusChange}
                />
                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)" }}>
                        <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 10 }}>
                            {/* Header */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: "#eee",
                                    backgroundColor: theme.BRAND_GRADIENT_END,
                                    borderTopLeftRadius: 10,
                                    borderTopRightRadius: 10,
                                }}
                            >
                                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                                    Details - ({getSelectedSexeName})
                                </Text>
                                <TouchableOpacity onPress={() => {
                                    setModalVisible(false);
                                    setSelectedSexeName(null);
                                }
                                }>
                                    <Icon name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Search */}
                            <TextInput
                                placeholder="Search..."
                                value={searchQueryPOT}
                                onChangeText={setSearchQueryPOT}
                                style={{
                                    padding: 5,
                                    borderWidth: 1,
                                    borderColor: "#ddd",
                                    borderRadius: 5,
                                    margin: 10,
                                    fontSize: 11,
                                    color: "#000",
                                }}
                            />

                            {/* All Keys Cards View */}
                            <AllKeysCardsView
                                data={getDetailsData}
                                searchQuery={searchQueryPOT}
                                getDetailsDataSetting={getDetailsDataSetting}

                            // onCardPress={handleAllKeysCardPress} 
                            />
                        </View>
                    </View>
                </Modal>
            </GestureHandlerRootView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    columnWrapper: {
        justifyContent: "space-between",
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    contentContainer: {
        paddingBottom: 80,
    },
    dashboardCard: {
        flex: 1,
        minHeight: 165,
        borderRadius: 8,
        margin: 4,
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    dashboardCardInner: {
        flex: 1,
        padding: 12,
        justifyContent: "space-between",
    },
    dashboardCaption: {
        fontSize: 13,
        color: "white",
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 8,
    },
    cardDetails: {
        flex: 1,
        padding: 8,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 4,
    },
    detailRowContainer: {
        marginBottom: 8,
        width: '100%',
    },
    cardDetailLabel: {
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: 10,
        fontWeight: "500",
        textAlign: 'right',
        marginBottom: 2,
    },
    cardDetailValue: {
        color: "white",
        fontSize: 11,
        fontWeight: "600",
        textAlign: 'right',
    },
    footerContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "transparent",
        elevation: 6,
        zIndex: 1000,
    },
    footerInner: {
        padding: 12,
        borderRadius: 8,
    },
    footerInnerDetails: {
        padding: 12,
        // borderRadius: 8,
    },
    footerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
        width: '100%',
    },
    footerLabel: {
        color: "rgba(255, 255, 255, 0.9)",
        fontSize: 11,
        fontWeight: "500",
    },
    footerValue: {
        color: "white",
        fontSize: 11,
        fontWeight: "600",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyText: {
        color: "#666",
        fontSize: 16,
    },
});


const modalStyles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    modalContent: {
        flex: 1,
        backgroundColor: "#fff",
        margin: 5,
        borderRadius: 5,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        backgroundColor: theme.BRAND_GRADIENT_END,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
    },
    searchInput: {
        padding: 10,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 5,
        margin: 10,
        fontSize: 11,
    },
});


export default DailyCollectionReport;
