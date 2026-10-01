import { API } from '@/common/API/dynamicAPI';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView, StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { fetchCurrentYearData, fetchPropertyData, fetchPropertyDataDCR, fetchPropertyGroupDataDCR, generateFinancialYearOptions, getCurrentFinancialYearMain } from '../../common/API/FunctionsNEW';
import {
    Avatar,
    Btn,
    BusyOverlay,
    CONTENT_MAX,
    EmptyState as EmptyBlock,
    Kpi,
    KpiGrid,
    Metric,
    PanelHeader,
    SearchBox,
    SectionHead,
    cellWidth,
    useSotLayout,
} from '../erpUi';
import CustomDrawer from './CustomDrawer';

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
    username: string;
    rightsMenuApps: string[];
}

const DailyCollectionReport: React.FC<Props> = ({ token, username, rightsMenuApps }) => {
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
    const currentDate = new Date();
    const currentYear12 = currentDate.getFullYear();
    const yearOptions = generateFinancialYearOptions(currentYear12);
    const [selectedYear, setSelectedYear] = useState<string>(getCurrentFinancialYearMain());
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
    // useEffect(() => {
    //     if (rightsMenuApps && rightsMenuApps.length > 0) {
    //         const hasReport = rightsMenuApps.some(
    //             (item) => item?.title === "Daily Payment Report"
    //         );
    //         setHasDailyCollectionReport(hasReport);
    //     }
    // }, [rightsMenuApps]);

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
        //     txntype: "mob_daily_collection_payment_report",
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
            action: 'daily_collection_payment_report',
            txntype: "mob_daily_collection_payment_report",
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

        console.log("fetchBrowseData collection_crud api payload :", payload)
        console.log("fetchBrowseData collection_crud api url :", `${API}/api/collection_crud`)
        try {
            const params = { ...payload };
            // console.log("🔵 payload browse", params);
            setPayload(params as any);
            const response = await axios.post(`${API}/api/collection_crud`, params, { headers });
            console.log("fetchBrowseData collection_crud api response :", response)
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
            txntype: "collection_acc"
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

            console.log("fetchBrowseDataSEXE function collection_crud api payload : ", payload)
            console.log("fetchBrowseDataSEXE function collection_crud api url : ", `${API}/api/collection_crud`)

            const response = await axios.post(`${API}/api/collection_crud`, payload, { headers });
            // console.log('🔵 DHRUMIL main summary\'s sexe\'s res:', payload, response);
            console.log("fetchBrowseDataSEXE function collection_crud api response : ", response)
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
        //     txntype: "mob_daily_collection_payment_report",
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
            action: 'daily_collection_payment_report',
            txntype: "mob_daily_collection_payment_report",
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
                // FIX: groups start expanded (undefined), so the first tap must collapse.
                [groupKey]: prev[groupKey] === false
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

        // NEW ERP UI layout for this view (presentation only).
        const { cols: gridCols, isPhone: gridPhone, gutter: gridGutter } = useSotLayout();

        // Accent pairs handed to handleCardLongPress (kept for the detail panel accent).
        const CARD_COLORS = [
            [T.blue, T.blue], [T.nav, T.nav],
            [T.yd, T.yd], [T.green, T.green],
            [T.copper, T.copper], [T.purple, T.purple],
            [T.pd, T.pd], [T.amber, T.amber],
        ];

        // Render group header
        const renderGroupHeader = useCallback((groupKey, index, itemCount) => {
            const isExpanded = expandedGroups[groupKey] !== false;

            return (
                <TouchableOpacity
                    key={`header-${groupKey}`}
                    onPress={() => toggleGroup(groupKey)}
                    activeOpacity={0.8}
                    style={styles.groupHead}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    accessibilityLabel={`${groupKey}, ${itemCount} entries`}
                >
                    {shouldGroup && (
                        <Icon
                            name={isExpanded ? "expand-less" : "expand-more"}
                            size={20}
                            color={T.nav}
                        />
                    )}
                    <Text numberOfLines={1} style={styles.groupTitle}>
                        {groupKey}
                    </Text>
                    <View style={styles.groupCount}>
                        <Text style={styles.groupCountText}>{itemCount}</Text>
                    </View>
                </TouchableOpacity>
            );
        }, [expandedGroups, shouldGroup, toggleGroup]);

        const renderCard = useCallback((item, index, groupKey) => {

            const colors = CARD_COLORS[index % CARD_COLORS.length];

            return (
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                        setSelectedPartyName(item.AccName || item.grpname || "");
                        setSelectedSexeCard(item);
                        handleCardLongPress(item, colors);
                        handlecardpress(item); // API
                    }}
                    delayLongPress={400}
                    style={styles.entryCard}
                    accessibilityRole="button"
                    accessibilityLabel={`Open details${item.AccName ? ` for ${item.AccName}` : ''}`}
                >
                    {/* TITLE */}
                    <View style={styles.cardHead}>
                        {(item.AccName) ? <Avatar name={item.AccName} size={36} /> : (
                            <View style={styles.cardIcon}>
                                <Icon name="receipt-long" size={18} color={T.copper} />
                            </View>
                        )}
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text numberOfLines={2} style={styles.cardTitle}>
                                {item.AccName || item.grpname || 'Entry'}
                            </Text>
                            {item.chqno ? (
                                <Text numberOfLines={1} style={styles.cardMeta}>Cheque #{item.chqno}</Text>
                            ) : null}
                        </View>
                        <Icon name="chevron-right" size={22} color={T.muted} />
                    </View>

                    {/* CONTENT */}
                    <View style={styles.kvBox}>
                        {visibleColumns.map((col) => {

                            const colIndex = columns.indexOf(col);
                            const isNumeric = filterDataTypes[colIndex] === 'N';
                            const value = item[col];
                            const label = labelMap[col] || col;

                            const displayValue =
                                value !== undefined && value !== null
                                    ? (isNumeric ? formatValue(value, col) : String(value))
                                    : '-';

                            const lowerCol = String(col).toLowerCase();
                            const valueColor = lowerCol === 'clramt' ? T.green : lowerCol === 'tranamt' ? T.nav : undefined;

                            return (
                                <View key={col} style={styles.kvRow}>
                                    <Text numberOfLines={1} style={styles.kvLabel}>
                                        {label}
                                    </Text>
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.kvValue,
                                            isNumeric && styles.kvNum,
                                            valueColor ? { color: valueColor } : null,
                                        ]}
                                    >
                                        {displayValue}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            );

        }, [
            visibleColumns,
            columns,
            filterDataTypes,
            labelMap,
            formatValue,
        ]);

        const CardDetailModal = useCallback(() => {
            // console.log("MODAL SELECTED CARD:", selectedCard);
            const accent = (selectedCardColors && selectedCardColors[0]) || T.blue;

            const renderRows = () => {

                if (!Array.isArray(cardDetailData) || cardDetailData.length === 0) {
                    return (
                        <View style={styles.emptyCard}>
                            <EmptyBlock icon="search-off" title="No data found" text="There are no entries for this record." />
                        </View>
                    );
                }

                return (
                    <View style={styles.grid}>
                        {cardDetailData.map((row, index) => (
                            <View key={`row-${index}`} style={[cellWidth(gridCols), styles.cell]}>
                                <View style={styles.entryCard}>
                                    <View style={styles.cardHead}>
                                        <View style={[styles.cardIcon, { backgroundColor: `${accent}16` }]}>
                                            <Icon name="receipt-long" size={18} color={accent} />
                                        </View>
                                        <Text style={styles.cardTitle} numberOfLines={1}>Entry {index + 1}</Text>
                                    </View>
                                    <View style={styles.kvBox}>
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
                                                    <View key={key} style={styles.kvRow}>
                                                        <Text style={styles.kvLabel} numberOfLines={1}>
                                                            {caption}
                                                        </Text>
                                                        <Text
                                                            style={[styles.kvValue, styles.kvNum, key === "SetAmt" && { color: T.nav }]}
                                                            numberOfLines={1}
                                                        >
                                                            {value}
                                                        </Text>
                                                    </View>
                                                );

                                            })}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                );
            };


            return (
                <>

                    {detailModalVisible && (
                        <View style={[styles.panel, { zIndex: 500 }]}>
                            <PanelHeader
                                onBack={closeModal}
                                crumbs={['Party Wise', 'Details', 'Vouchers']}
                                title={selectedPartyName || 'Details'}
                                subtitle={`${Array.isArray(cardDetailData) ? cardDetailData.length : 0} entr${Array.isArray(cardDetailData) && cardDetailData.length === 1 ? 'y' : 'ies'}`}
                            />

                            {/* CONTENT */}
                            <ScrollView
                                style={styles.container}
                                contentContainerStyle={[styles.listContent, { paddingHorizontal: gridGutter - 5 }]}
                            >
                                {renderRows()}
                            </ScrollView>
                        </View>
                    )}
                </>
            );

        }, [
            detailModalVisible,
            selectedCard,
            selectedCardColors,
            cardDetailData,
            gridCols,
            gridGutter
        ]);

        // "Show more" fallback for a group: same batch step as the scroll-based lazy load
        // (used when the list is too short to scroll on large screens).
        const loadMoreGroup = useCallback((groupKey) => {
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
        }, [groupedData, loadedItems, isLoadingMore]);

        const renderGroupContent = useCallback((items, groupKey) => {
            const loadedCount = loadedItems[groupKey] || Math.min(LAZY_LOAD_CONFIG.INITIAL_BATCH, items.length);
            const displayedItems = items.slice(0, loadedCount);
            const hasMore = loadedCount < items.length;

            const rows = [];

            rows.push(
                <View key={`${groupKey}-grid`} style={styles.grid}>
                    {displayedItems.map((item, actualIndex) => (
                        <View
                            key={`${groupKey}-${actualIndex}`}
                            style={[cellWidth(gridCols), styles.cell]}
                        >
                            {renderCard(item, actualIndex, groupKey)}
                        </View>
                    ))}
                </View>
            );

            // Loading indicator
            if (hasMore && isLoadingMore[groupKey]) {
                rows.push(
                    <View key={`${groupKey}-loading`} style={styles.moreRow}>
                        <ActivityIndicator size="small" color={T.copper} />
                        <Text style={styles.moreText}>
                            Loading more...
                        </Text>
                    </View>
                );
            } else if (hasMore) {
                rows.push(
                    <TouchableOpacity
                        key={`${groupKey}-more`}
                        style={styles.moreRow}
                        onPress={() => loadMoreGroup(groupKey)}
                        accessibilityRole="button"
                    >
                        <Icon name="expand-more" size={18} color={T.copper} />
                        <Text style={[styles.moreText, { color: T.copper }]}>
                            Show more ({items.length - loadedCount} left)
                        </Text>
                    </TouchableOpacity>
                );
            }

            return rows;
        }, [gridCols, renderCard, loadedItems, isLoadingMore, loadMoreGroup]);

        // Totals (was a fixed footer; now the KPI row at the top of the list)
        const Footer = useCallback(() => {
            if (Object.keys(totals).length === 0) return null;

            return (
                <KpiGrid isPhone={gridPhone}>
                    {Object.entries(totals).map(([col, value]) => (
                        <Kpi
                            key={col}
                            label={labelMap[col] || col}
                            icon={col === 'clramt' ? 'account-balance' : 'payments'}
                            accent={col === 'clramt' ? T.green : T.nav}
                            valueColor={col === 'clramt' ? T.green : T.ink}
                            value={`₹ ${value.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`}
                            sub={col === 'tranamt' ? `${filteredData.length} entr${filteredData.length === 1 ? 'y' : 'ies'}` : undefined}
                        />
                    ))}
                </KpiGrid>
            );
        }, [totals, labelMap, gridPhone, filteredData]);
        // Empty state
        const EmptyState = useCallback(() => (
            <View style={styles.emptyCard}>
                <EmptyBlock icon="search-off" title="No records found" text="Try another party, cheque number or amount." />
            </View>
        ), []);

        // Main render
        return (
            <>
                <View
                    style={styles.container}
                    pointerEvents="box-none"
                >
                    {/* MAIN SCROLLVIEW (Disabled if card is locked or modal is open) */}
                    <ScrollView
                        ref={mainScrollRef}
                        style={styles.container}
                        contentContainerStyle={[styles.listContent, { paddingHorizontal: gridGutter - 5 }]}
                        showsVerticalScrollIndicator
                        scrollEnabled={!isCardLocked && !isModalOpen}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.listHeader}>
                            <Footer />
                        </View>
                        {Object.entries(groupedData).length > 0 && filteredData.length > 0 ? (
                            Object.entries(groupedData).map(([groupKey, items], index) => {
                                const isExpanded = shouldGroup ? (expandedGroups[groupKey] !== false) : true;

                                return (
                                    <View key={groupKey} style={styles.groupBlock}>
                                        {renderGroupHeader(groupKey, index, items.length)}
                                        {(shouldGroup ? isExpanded : true) && items.length > 0 && (
                                            <View style={{ marginTop: 4 }}>
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
                </View>
                {/* CARD DETAIL MODAL */}
                <CardDetailModal />
            </>
        );
    };

    // cards detail over


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
        const { isPhone: gPhone, cols: gCols, gutter: gGutter } = useSotLayout();

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

        const renderCard = (item, index, tabType?) => {
            const isActive = activeSlab === item.PrpCode;
            return (
                <View key={`${item.PrpCode}-${index}`} style={[cellWidth(gCols), styles.cell]}>
                    <TouchableOpacity
                        style={[styles.card, isActive && styles.cardActive, isLoadingSummary && { opacity: 0.6 }]}
                        activeOpacity={0.85}
                        disabled={isLoadingSummary}
                        onPress={() => onCardPress && onCardPress(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open party-wise payments for ${item.PrpName}`}
                    >
                        <View style={styles.cardHead}>
                            <Avatar name={item.PrpName} size={40} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.cardTitle} numberOfLines={2}>
                                    {formatValue(item[visibleColumns[0]], visibleColumns[0])}
                                </Text>
                                {!!item.PrpCode && <Text style={styles.cardMeta} numberOfLines={1}>#{item.PrpCode}</Text>}
                            </View>
                            {isActive && isLoadingSummary
                                ? <ActivityIndicator size="small" color={T.copper} />
                                : <Icon name="chevron-right" size={22} color={T.muted} />}
                        </View>
                        <View style={styles.metricBox}>
                            <Metric
                                label={labelMap.ToDaysCollection}
                                value={formatValue(item.ToDaysCollection, "ToDaysCollection")}
                                color={T.nav}
                            />
                            <Metric
                                label={labelMap.CrInBankAccCollection}
                                value={formatValue(item.CrInBankAccCollection, "CrInBankAccCollection")}
                                color={T.green}
                                align="right"
                            />
                        </View>
                    </TouchableOpacity>
                </View>
            );
        };

        const renderItemsInGrid = () => (
            <View style={styles.grid}>
                {filteredData.map((item, index) => renderCard(item, index))}
            </View>
        );

        // ✅ Totals (was a fixed footer; now the KPI row on top)
        const Footer = () => {

            if (!filteredData.length) return null;

            const fmt = (v) => `₹ ${v.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;

            return (
                <KpiGrid isPhone={gPhone}>
                    <Kpi
                        label="Collection"
                        icon="payments"
                        accent={T.nav}
                        value={fmt(totals.ToDaysCollection)}
                        sub={`${filteredData.length} propert${filteredData.length === 1 ? 'y' : 'ies'}`}
                    />
                    <Kpi
                        label="Credit in Bank"
                        icon="account-balance"
                        accent={T.green}
                        valueColor={T.green}
                        value={fmt(totals.CrInBankAccCollection)}
                    />
                </KpiGrid>
            );
        };

        return (

            <View style={styles.container}>

                <ScrollView
                    style={styles.container}
                    contentContainerStyle={[styles.listContent, { paddingHorizontal: gGutter - 5 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >

                    {filteredData.length > 0 ? (
                        <>
                            <View style={styles.listHeader}>
                                <Footer />
                                <SectionHead
                                    title="Properties"
                                    meta="Tap a property to see party-wise payments"
                                />
                            </View>
                            {renderItemsInGrid()}
                        </>
                    ) : (
                        <View style={styles.emptyCard}>
                            <EmptyBlock icon="search-off" title="No records found" text="Try another property name or code." />
                        </View>
                    )}

                </ScrollView>

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

    // Responsive layout (NEW ERP): 1 / 2 / 3 columns via the shared kit.
    const { width: screenWidth } = useWindowDimensions();
    const { isPhone, cols, gutter } = useSotLayout();

    // Shared presentation for the "ALL" + party / sales-executive cards
    // (used by both the Party Wise panel and the Party Wise Detail panel).
    const renderPartyTile = (item, index, totalsSource, onPress) => {
        const isAllCard = item.SalesExecutive === "ALL";

        // Calculate totals for "ALL" card
        const totalToDaysCollection = totalsSource.reduce(
            (sum, dataItem) => sum + parseFloat(dataItem.ToDaysCollection || '0'),
            0
        );
        const totalCrInBankAccCollection = totalsSource.reduce(
            (sum, dataItem) => sum + parseFloat(dataItem.CrInBankAccCollection || '0'),
            0
        );

        const formatAmount = (value) => {
            return Number(value || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };

        const codeText = item.SExe ? `Code: ${item.SExe}` : item.acccode ? `A/c: ${item.acccode}` : 'Code: —';

        return (
            <View
                key={item.Code || index}
                style={[isAllCard ? { width: '100%' } : cellWidth(cols), styles.cell]}
            >
                <TouchableOpacity
                    style={[isAllCard ? styles.allCard : styles.card, getSexeLoading && { opacity: 0.55 }]}
                    activeOpacity={0.85}
                    onPress={onPress}
                    disabled={getSexeLoading}
                    accessibilityRole="button"
                    accessibilityLabel={isAllCard ? 'Open details for all parties' : `Open details for ${item.SalesExecutive}`}
                >
                    <View style={styles.cardHead}>
                        {isAllCard ? (
                            <View style={styles.allIcon}>
                                <Icon name="functions" size={20} color={T.copper} />
                            </View>
                        ) : (
                            <Avatar name={item.SalesExecutive} size={38} />
                        )}
                        <View style={{ flex: 1, minWidth: 0 }}>
                            {isAllCard ? <Text style={styles.allEyebrow}>TOTAL</Text> : null}
                            {/* Sales Executive / Party Name */}
                            <Text style={[styles.cardTitle, isAllCard && { color: '#fff' }]} numberOfLines={2}>
                                {item.SalesExecutive}
                            </Text>
                            {/* Code (skip for "ALL") */}
                            {!isAllCard && (
                                <Text style={styles.cardMeta} numberOfLines={1}>{codeText}</Text>
                            )}
                        </View>
                        {getSexeLoading
                            ? <ActivityIndicator size="small" color={isAllCard ? '#fff' : T.copper} />
                            : <Icon name="chevron-right" size={22} color={isAllCard ? '#fff' : T.muted} />}
                    </View>

                    <View style={isAllCard ? styles.allMetricBox : styles.metricBox}>
                        {/* Today's Collection */}
                        <Metric
                            label="Collection"
                            value={`₹ ${isAllCard ? formatAmount(totalToDaysCollection) : formatAmount(item.ToDaysCollection)}`}
                            color={isAllCard ? '#fff' : T.nav}
                        />
                        {/* Credit in Bank */}
                        <Metric
                            label="Credit in Bank"
                            value={`₹ ${isAllCard ? formatAmount(totalCrInBankAccCollection) : formatAmount(item.CrInBankAccCollection)}`}
                            color={isAllCard ? '#fff' : T.green}
                            align="right"
                        />
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    // Render Party Wise And Excutive vise card display
    const renderCard = (item, index, tabType?) => {
        // console.log("filterpartyData ::::", filterpartyData)
        return renderPartyTile(item, index, filteredData12, async () => {
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
        });
    };

    const renderItemsInGrid = (data, tabType) => {
        if (!data || data.length === 0) return null;
        return (
            <View style={styles.grid}>
                {data.map((item, index) =>
                    renderCard(item, index, tabType)   // 👈 tabType pass
                )}
            </View>
        );
    };



    const renderPartyCard = (item, index) => {
        return renderPartyTile(item, index, filteredPartyData, async () => {
            if (getSexeLoading) return;
            setLoadingStates({ [item.Code || "ALL"]: true });
            setSelectedSexeName(item.SalesExecutive);
            handleLoadPressSEXE(item);
        });
    };

    const renderPartyItemsInGrid = (data) => {
        if (!data || data.length === 0) return null;
        return (
            <View style={styles.grid}>
                {data.map((item, index) =>
                    renderPartyCard(item, index)   // 👈 tabType pass
                )}
            </View>
        );
    };

    // Render Party Wise And Excutive vise card display over

    // Totals bar shown at the bottom of the Party Wise panels (same sums as before).
    const renderTotalsBar = (rows, collectionLabel) => {
        const sum = (key) => parseFloat(
            rows.reduce((s, item) => s + parseFloat(item[key] || '0'), 0)
        ).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return (
            <View style={styles.totalsBar}>
                <View style={[styles.totalsInner, { paddingHorizontal: gutter }]}>
                    <View style={styles.totalsTag}>
                        <Icon name="functions" size={14} color={T.copper} />
                        <Text style={styles.totalsTagText}>Totals</Text>
                    </View>
                    <Metric label={collectionLabel} value={`₹ ${sum('ToDaysCollection')}`} color={T.nav} />
                    <Metric label="Credit in Bank" value={`₹ ${sum('CrInBankAccCollection')}`} color={T.green} align="right" />
                </View>
            </View>
        );
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
            action: 'daily_collection_payment_report',
            txntype: "mob_daily_collection_payment_report",
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
                action: "daily_collection_payment_report",
                txntype: "mob_daily_collection_payment_report",
                rpttype: 1,
                sexe: form?.SexeCode || [],
                // sexe: payload.sexe,
                fromdate: detailPayload.fromdate,
                todate: detailPayload.todate
            };
            // console.log("Payload", payloadSexe)
            console.log("SalesExeMain function collection_crud api payload : ", payloadSexe)
            console.log("SalesExeMain function collection_crud api url : ", `${API}/api/collection_crud`)
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
            console.log("SalesExeMain function collection_crud api response : ", responsesexe)
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
            action: 'daily_collection_payment_report',
            txntype: "mob_daily_collection_payment_report",
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
                action: "daily_collection_payment_report",
                txntype: "mob_daily_collection_payment_report",
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

    // ---------------------------------------------------------------------------
    // NEW ERP UI helpers (presentation only — every handler below is the
    // original one, called with the original arguments).
    // ---------------------------------------------------------------------------
    const fmtDMY = (iso) => {
        if (!iso) return '';
        const [y, m, d] = String(iso).split('-');
        return d && m && y ? `${d}-${m}-${y}` : String(iso);
    };
    const selectedPrpCodes: string[] = Array.isArray((form as any)?.PrpCode) ? (form as any).PrpCode : [];
    const activeFilterCount =
        ((form as any)?.PrpOf ? 1 : 0) +
        (selectedPrpCodes.length ? 1 : 0);
    const filterChips: { icon: string; text: string }[] = [
        { icon: 'event', text: form.fromdate === form.todate ? fmtDMY(form.fromdate) : `${fmtDMY(form.fromdate)} → ${fmtDMY(form.todate)}` },
        ...((selectedPropertyGroup as any)?.PrpOfFull ? [{ icon: 'domain', text: (selectedPropertyGroup as any).PrpOfFull }] : []),
        ...(selectedPrpCodes.length ? [{ icon: 'apartment', text: `${selectedPrpCodes.length} propert${selectedPrpCodes.length === 1 ? 'y' : 'ies'}` }] : []),
    ];
    const activePropertyName = (gePOTData.find((p: any) => p.PrpCode === activeCard) as any)?.PrpName || '';
    const countRows = (rows) => rows.filter((r) => r.SalesExecutive !== 'ALL').length;
    const listContentStyle = [styles.listContent, { paddingHorizontal: gutter - 5 }];

    // Tabs + search strip used by the two Party Wise panels.
    const renderPanelSearch = (showTabs: boolean) => (
        <View style={styles.panelSearch}>
            <View style={[styles.panelSearchInner, styles.panelSearchRow, { paddingHorizontal: gutter }]}>
                {showTabs ? (
                    <View style={styles.tabRow}>
                        <TouchableOpacity
                            style={[styles.tab, modalTab === "PartyWise" && styles.tabOn]}
                            onPress={() => setModalTab("PartyWise")}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: modalTab === "PartyWise" }}
                        >
                            <Icon name="groups" size={16} color={modalTab === "PartyWise" ? '#fff' : T.nav} />
                            <Text style={[styles.tabText, modalTab === "PartyWise" && { color: '#fff' }]}>
                                Party Wise
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
                <View style={{ flex: 1, minWidth: 0 }}>
                    {getSexeLoading ? (
                        <View style={styles.searchLoading}>
                            <ActivityIndicator size="small" color={T.copper} />
                            <Text style={styles.searchLoadingText}>Loading…</Text>
                        </View>
                    ) : (
                        <SearchBox
                            value={sexeSearchQuery}
                            onChangeText={setSexeSearchQuery}
                            placeholder="Search..."
                        />
                    )}
                </View>
            </View>
        </View>
    );

    return (
        <>
            <GestureHandlerRootView style={styles.root}>
                {/* ───────────── Toolbar: search + filters ───────────── */}
                <View style={styles.toolbar}>
                    <View style={[styles.toolbarInner, { paddingHorizontal: gutter }]}>
                        <SearchBox
                            value={searchQueryPOT}
                            onChangeText={setSearchQueryPOT}
                            placeholder="Search reports..."
                            style={{ flex: 1 }}
                        />
                        <Btn
                            label={isPhone ? '' : 'Filters'}
                            icon="tune"
                            onPress={openDrawer}
                            compact
                            badge={activeFilterCount || undefined}
                            style={styles.filterBtn}
                        />
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.chipScroll}
                        contentContainerStyle={[styles.chipRow, { paddingHorizontal: gutter }]}
                    >
                        {filterChips.map((c, i) => (
                            <TouchableOpacity key={`${c.text}-${i}`} style={styles.filterChip} onPress={openDrawer}>
                                <Icon name={c.icon as any} size={13} color={T.copper} />
                                <Text style={styles.filterChipText} numberOfLines={1}>{c.text}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.container}>
                    {isLoading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color={T.copper} />
                            <Text style={styles.loadingText}>Loading...</Text>
                        </View>
                    ) : gePOTData.length > 0 ? (
                        <DetailCardGrid
                            data={gePOTData}
                            searchQuery={searchQueryPOT}
                            onCardPress={onDashboardCardPress}
                            activeSlab={activeCard}
                            isLoadingSummary={isLoadingSummary}
                            getSummaryData={getSummaryData}
                        />
                    ) : (
                        <ScrollView style={styles.container} contentContainerStyle={listContentStyle}>
                            <View style={styles.emptyCard}>
                                <EmptyBlock
                                    icon="inbox"
                                    title="No data available"
                                    text="Choose the property group, properties and dates in Filters, then tap Load."
                                    action={<Btn label="Open filters" icon="tune" onPress={openDrawer} />}
                                />
                            </View>
                        </ScrollView>
                    )}
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
                    setSelectedSexe={setSelectedSexe}
                    SelectedSexe={SelectedSexe}
                    form={form}

                // selectedItemStatus={selectedItemStatus}
                // onItemStatusChange={handleItemStatusChange}
                />

                {/* ───────────── Details (drill-down 2) ───────────── */}
                {modalVisible && (
                    <View style={[styles.panel, { zIndex: 300 }]}>
                        <PanelHeader
                            onBack={() => {
                                setModalVisible(false);
                                setSelectedSexeName(null);
                            }}
                            crumbs={['Daily Payment Report', activePropertyName, 'Party Wise', 'Details'].filter(Boolean)}
                            title={`${getSelectedSexeName ?? ''}` || 'Details'}
                            subtitle={`${Array.isArray(getDetailsData) ? getDetailsData.length : 0} entries · tap an entry for its vouchers`}
                        />

                        {/* Search */}
                        <View style={styles.panelSearch}>
                            <View style={[styles.panelSearchInner, { paddingHorizontal: gutter }]}>
                                <SearchBox
                                    value={searchQueryPOT}
                                    onChangeText={setSearchQueryPOT}
                                    placeholder="Search..."
                                />
                            </View>
                        </View>

                        {/* All Keys Cards View */}
                        <AllKeysCardsView
                            data={getDetailsData}
                            searchQuery={searchQueryPOT}
                            getDetailsDataSetting={getDetailsDataSetting}

                        // onCardPress={handleAllKeysCardPress}
                        />

                        <BusyOverlay visible={detailLoading} text="Loading details…" />
                    </View>
                )}

                {/* ───────────── Party Wise (drill-down 1) ───────────── */}
                {sexeModalVisible && (
                    <View style={[styles.panel, { zIndex: 100 }]}>
                        <PanelHeader
                            onBack={() => setSexeModalVisible(false)}
                            crumbs={['Daily Payment Report', activePropertyName].filter(Boolean)}
                            title="Party Wise"
                            subtitle={getSexeLoading ? 'Loading…' : `${countRows(filteredData12)} part${countRows(filteredData12) === 1 ? 'y' : 'ies'} · tap a card for details`}
                        />

                        {/* Tabs + Search */}
                        {renderPanelSearch(true)}

                        <ScrollView
                            style={styles.container}
                            contentContainerStyle={listContentStyle}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >

                            {filteredData12.length > 0 ? (
                                renderModalContent()
                            ) : (
                                <View style={styles.emptyCard}>
                                    <EmptyBlock
                                        icon="search-off"
                                        title={getSexeLoading ? 'Loading…' : 'No records found'}
                                        text={getSexeLoading ? undefined : 'Try another party name or code.'}
                                    />
                                </View>
                            )}

                        </ScrollView>

                        {/* Totals Footer */}
                        {renderTotalsBar(filteredData12, 'Collection')}
                    </View>
                )}

                {/* ───────────── Party Wise Detail (sales-executive path) ───────────── */}
                {partyWiseModalVisible && (
                    <View style={[styles.panel, { zIndex: 200 }]}>
                        <PanelHeader
                            onBack={() => setPartyWiseModalVisible(false)}
                            crumbs={['Daily Payment Report', 'Sales Executive Wise']}
                            title={selectedSexeCard?.SalesExecutive || 'Party Wise Detail'}
                            subtitle={getSexeLoading ? 'Loading…' : `${countRows(filteredPartyData)} part${countRows(filteredPartyData) === 1 ? 'y' : 'ies'}`}
                        />

                        {/* Search */}
                        {renderPanelSearch(false)}

                        {/* Content */}
                        <ScrollView
                            style={styles.container}
                            contentContainerStyle={listContentStyle}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled" // Fix search rerender focus issue
                        >
                            {filteredPartyData.length > 0 ? (
                                // renderPartyItemsInGrid()
                                renderPartyItemsInGrid(filteredPartyData)
                            ) : (
                                <View style={styles.emptyCard}>
                                    <EmptyBlock icon="search-off" title="No records found" text="Try another party name or code." />
                                </View>
                            )}
                        </ScrollView>

                        {renderTotalsBar(filteredPartyData, "Today's Collection")}
                    </View>
                )}
            </GestureHandlerRootView>
        </>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },
    container: { flex: 1, backgroundColor: T.bg },
    listContent: {
        paddingTop: 10,
        paddingBottom: 28,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        flexGrow: 1,
    },
    listHeader: { paddingHorizontal: 5, gap: 10, marginBottom: 6 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { padding: 5 },
    emptyCard: {
        margin: 5,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
    },
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
    loadingText: { fontSize: 13, fontWeight: '800', color: T.nav },

    // ----- toolbar -----
    toolbar: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingTop: 10,
        paddingBottom: 8,
        gap: 8,
    },
    toolbarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
    },
    filterBtn: { height: 42, minWidth: 46 },
    chipScroll: { flexGrow: 0, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    chipRow: { gap: 6, alignItems: 'center' },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 28,
        paddingHorizontal: 10,
        borderRadius: 14,
        backgroundColor: T.sub,
        borderWidth: 1,
        borderColor: T.border,
    },
    filterChipText: { fontSize: 11.5, fontWeight: '700', color: T.nav, maxWidth: 220 },

    // ----- cards -----
    card: {
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 14,
        gap: 12,
        flex: 1,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    cardActive: { borderColor: T.copper, borderWidth: 1.5, backgroundColor: `${T.copper}08` },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    cardTitle: { fontSize: 14.5, fontWeight: '800', color: T.ink },
    cardMeta: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },
    metricBox: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.hair,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },

    // "ALL" summary card
    allCard: {
        backgroundColor: T.nav,
        borderRadius: 14,
        padding: 14,
        gap: 12,
        flex: 1,
    },
    allIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.10)',
    },
    allEyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    allMetricBox: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },

    // ----- detail entries (all-keys cards) -----
    entryCard: {
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        gap: 10,
        flex: 1,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    kvBox: {
        backgroundColor: T.sub,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.hair,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    kvRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: T.hair,
    },
    kvLabel: {
        flexShrink: 0,
        maxWidth: '48%',
        fontSize: 10.5,
        fontWeight: '700',
        color: T.muted,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    kvValue: { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 12.5, fontWeight: '600', color: T.ink },
    kvNum: { fontWeight: '800' },

    groupBlock: { marginBottom: 10 },
    groupHead: {
        marginHorizontal: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.border,
    },
    groupTitle: {
        flex: 1,
        fontSize: 12,
        fontWeight: '900',
        color: T.nav,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    groupCount: {
        minWidth: 24,
        height: 22,
        paddingHorizontal: 7,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}16`,
    },
    groupCountText: { fontSize: 11, fontWeight: '900', color: T.copper },
    moreRow: {
        marginHorizontal: 5,
        marginTop: 4,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    moreText: { fontSize: 12.5, fontWeight: '800', color: T.muted },

    // ----- panels -----
    panel: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: T.bg,
    },
    panelSearch: {
        backgroundColor: T.surface,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingVertical: 8,
    },
    panelSearchInner: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: 8 },
    panelSearchRow: { flexDirection: 'row', alignItems: 'center' },
    tabRow: { flexDirection: 'row', gap: 6 },
    tab: {
        height: 38,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
    },
    tabOn: { backgroundColor: T.nav, borderColor: T.nav },
    tabText: { fontSize: 13, fontWeight: '800', color: T.nav },
    searchLoading: {
        height: 42,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.sub,
    },
    searchLoadingText: { fontSize: 12.5, fontWeight: '700', color: T.muted },

    totalsBar: {
        backgroundColor: T.surface,
        borderTopWidth: 1,
        borderTopColor: T.border,
        paddingVertical: 10,
        ...S.sheet,
        shadowOpacity: 0.06,
    },
    totalsInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
    },
    totalsTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 26,
        paddingHorizontal: 8,
        borderRadius: 13,
        backgroundColor: `${T.copper}14`,
    },
    totalsTagText: { fontSize: 10.5, fontWeight: '900', color: T.copper, letterSpacing: 0.6, textTransform: 'uppercase' },
});


export default DailyCollectionReport;
