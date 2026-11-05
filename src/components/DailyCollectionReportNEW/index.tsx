import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView, StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
// import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import AsyncStorage from '@/common/utils/compatibleStorage';
import {
    Avatar,
    BusyOverlay,
    Btn,
    CONTENT_MAX,
    EmptyState as ErpEmptyState,
    Kpi,
    KpiGrid,
    Metric,
    PanelHeader,
    SearchBox,
    SectionHead,
    Segment,
    Toolbar,
    cellWidth,
    useSotLayout,
} from '@/src/components/erpUi';
import { S, T } from '@/src/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { fetchCurrentYearData, fetchPropertyData, fetchPropertyDataDCR, fetchPropertyGroupDataDCR, generateFinancialYearOptions, getCurrentFinancialYearMain } from '../../common/API/FunctionsNEW';
import CustomDrawer from './CustomDrawer';
// import Footer from '../Footer/Footer';
import { API } from '@/common/API/dynamicAPI';

// NEW ERP UI: Indian-format money for display only.
const inr = (v: any) =>
    `₹ ${Number(parseFloat(String(v ?? '0')) || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

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
    rightsMenuApps: string[];
}

export interface InternalDropdown {
    lable: string;
    value: string;
}

const DailyCollectionReport: React.FC<Props> = ({ token, isConnected, username, setIsLoggedIn }) => {
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
    const [internal_dropdown, setInternalDropdown] = useState<InternalDropdown[]>(
        [{
            lable: 'Internal',
            value: '1'
        },
        {
            lable: 'External',
            value: '0'
        },
        {
            lable: 'Both',
            value: '-1'
        }
        ]);
    const [selectedInternal, setSelectedInternal] = useState<InternalDropdown | "">("");
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
    const [partydetailSearchQuery, setPartyDetailSearchQuery] = useState("");
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
    //             (item) => item?.title === "Daily Collection Report"
    //         );
    //         setHasDailyCollectionReport(hasReport);
    //     }
    // }, [rightsMenuApps]);

    console.log("daily collection reportb token", token);

    let cancelToken: any;

    useEffect(() => {
        const today = new Date();
        setFromDate(today);
        setToDate(today);
    }, []);

    useEffect(() => {
        if (internal_dropdown.length > 0 && (!selectedInternal || selectedInternal === "")) {
            setSelectedInternal(internal_dropdown[1]);
        }
    }, [internal_dropdown, selectedInternal]);

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
        if (!token) return
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
            todate: formatDate(form.todate),
            internal: selectedInternal?.value || ""
        }
        fetchBrowseData(payload as any);
    };

    const fetchBrowseData = async (payload: any) => {
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
            console.log("🔵 payload browse", params);
            setPayload(params as any);
            const response = await axios.post(`${API}/api/collection_crud`, params, { headers });
            console.log("response", response)
            console.log("payload", payload)

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
                : "collection_sexe",
            internal: selectedInternal?.value || ""
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
            console.log('🔵 DHRUMIL main summary\'s sexe\'s res:', payload, response);
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
            srno: item.srno,
            internal: selectedInternal?.value || ""
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

            console.log("payload", payload);
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
        if (!token) return;
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
    }, [token]);

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
        const { cols: akvCols, gutter: akvGutter } = useSotLayout(); // NEW ERP UI layout

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

        // NEW ERP UI: money columns are lifted into the metric box of each card.
        const metricCols = ["tranamt", "clramt"];
        const listCols = useMemo(
            () => visibleColumns.filter((col) => !metricCols.includes(String(col).toLowerCase())),
            [visibleColumns]
        );
        const shownMetricCols = useMemo(
            () => visibleColumns.filter((col) => metricCols.includes(String(col).toLowerCase())),
            [visibleColumns]
        );

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
                >
                    {shouldGroup && (
                        <View style={styles.groupChevron}>
                            <Icon
                                name={isExpanded ? "expand-less" : "expand-more"}
                                size={18}
                                color={T.nav}
                            />
                        </View>
                    )}
                    <Text numberOfLines={1} style={styles.groupTitle}>
                        {groupKey}
                    </Text>
                    <View style={styles.countPill}>
                        <Text style={styles.countPillText}>{itemCount}</Text>
                    </View>
                </TouchableOpacity>
            );
        }, [expandedGroups, shouldGroup, toggleGroup]);

        const renderCard = useCallback((item, index, groupKey) => {

            const valueOf = (col) => {
                const colIndex = columns.indexOf(col);
                const isNumeric = filterDataTypes[colIndex] === 'N';
                const value = item[col];
                return value !== undefined && value !== null
                    ? (isNumeric ? formatValue(value, col) : String(value))
                    : '-';
            };

            return (
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                        setSelectedPartyName(item.AccName || item.grpname || "");
                        setSelectedSexeCard(item);
                        handleCardLongPress(item, null); // colours were only used by the old gradient
                        handlecardpress(item); // API
                    }}
                    delayLongPress={400}
                    style={styles.rowCard}
                    accessibilityRole="button"
                    accessibilityLabel={`Open details${item.AccName ? ` for ${item.AccName}` : ''}`}
                >
                    {/* TITLE */}
                    <View style={styles.rowCardHead}>
                        <View style={styles.rowCardIcon}>
                            <Icon name="receipt-long" size={17} color={T.copper} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            {(item.AccName) ? (
                                <Text numberOfLines={2} style={styles.cardTitle}>
                                    {item.AccName}
                                </Text>
                            ) : (
                                <Text numberOfLines={1} style={styles.cardTitle}>
                                    Entry {index + 1}
                                </Text>
                            )}
                        </View>
                        <Icon name="chevron-right" size={22} color={T.muted} />
                    </View>

                    {/* MONEY */}
                    {shownMetricCols.length > 0 && (
                        <View style={styles.metricBox}>
                            {shownMetricCols.map((col, i) => (
                                <Metric
                                    key={col}
                                    label={labelMap[col] || col}
                                    value={valueOf(col)}
                                    color={String(col).toLowerCase() === 'clramt' ? T.green : T.nav}
                                    align={i === 0 ? 'left' : 'right'}
                                />
                            ))}
                        </View>
                    )}

                    {/* CONTENT */}
                    <View style={styles.kvList}>
                        {listCols.map((col) => {

                            const colIndex = columns.indexOf(col);
                            const isNumeric = filterDataTypes[colIndex] === 'N';
                            const label = labelMap[col] || col;

                            return (
                                <View key={col} style={styles.kvRow}>
                                    <Text numberOfLines={1} style={styles.kvLabel}>
                                        {label}
                                    </Text>
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.kvValue, isNumeric && { fontWeight: '800' }]}
                                    >
                                        {valueOf(col)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            );

        }, [
            visibleColumns,
            listCols,
            shownMetricCols,
            columns,
            filterDataTypes,
            labelMap,
            formatValue,
        ]);

        const CardDetailModal = useCallback(() => {
            // console.log("MODAL SELECTED CARD:", selectedCard);

            const renderRows = () => {

                if (!Array.isArray(cardDetailData) || cardDetailData.length === 0) {
                    return (
                        <ErpEmptyState icon="search-off" title="No data found" text="No voucher details were returned for this entry." />
                    );
                }

                return (
                    <View style={styles.gridWrap}>
                        {cardDetailData.map((row, index) => (

                            <View key={`row-${index}`} style={[cellWidth(akvCols), styles.gridCell]}>
                                <View style={styles.detailCard}>

                                    {Object.keys(row)
                                        .filter((key) => key !== "PrpCode")
                                        .map((key, kIndex) => {

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
                                                    style={[styles.kvRow, kIndex === 0 && { borderTopWidth: 0 }]}
                                                >
                                                    <Text style={styles.kvLabel} numberOfLines={1}>
                                                        {caption}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.kvValue,
                                                            key === "SetAmt" && { color: T.nav, fontWeight: '900', fontSize: 14 },
                                                        ]}
                                                        numberOfLines={2}
                                                    >
                                                        {value}
                                                    </Text>
                                                </View>
                                            );

                                        })}

                                </View>
                            </View>

                        ))}
                    </View>
                );
            };


            return (
                <>

                    {detailModalVisible && (
                        <View style={[styles.panel, { zIndex: 500, elevation: 25 }]}>

                            {/* HEADER */}
                            <PanelHeader
                                onBack={closeModal}
                                crumbs={['Daily Collection', getSelectedSexeName ? String(getSelectedSexeName) : 'Details']}
                                title={`Details - ${selectedPartyName}`}
                                subtitle={`${Array.isArray(cardDetailData) ? cardDetailData.length : 0} voucher${Array.isArray(cardDetailData) && cardDetailData.length === 1 ? '' : 's'}`}
                            />

                            {/* CONTENT */}
                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={[styles.listContent, { paddingHorizontal: akvGutter - 5 }]}
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
            akvCols,
            akvGutter,
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
                <View key={`${groupKey}-grid`} style={styles.gridWrap}>
                    {displayedItems.map((item, index) => (
                        <View key={`${groupKey}-${index}`} style={[cellWidth(gridConfig.numColumns), styles.gridCell]}>
                            {renderCard(item, index, groupKey)}
                        </View>
                    ))}
                </View>
            );

            // Loading indicator
            if (hasMore && isLoadingMore[groupKey]) {
                rows.push(
                    <View key={`${groupKey}-loading`} style={styles.loadingMore}>
                        <ActivityIndicator size="small" color={T.copper} />
                        <Text style={styles.loadingMoreText}>
                            Loading more...
                        </Text>
                    </View>
                );
            } else if (hasMore) {
                rows.push(
                    <TouchableOpacity
                        key={`${groupKey}-more`}
                        style={styles.loadingMore}
                        onPress={() => loadMoreGroup(groupKey)}
                        accessibilityRole="button"
                    >
                        <Icon name="expand-more" size={18} color={T.copper} />
                        <Text style={[styles.loadingMoreText, { color: T.copper }]}>
                            Show more ({items.length - loadedCount} left)
                        </Text>
                    </TouchableOpacity>
                );
            }

            return rows;
        }, [gridConfig, renderCard, loadedItems, isLoadingMore, loadMoreGroup]);

        // Footer (sticky totals bar)
        const Footer = useCallback(() => {
            if (Object.keys(totals).length === 0) return null;

            return (
                <View style={styles.totalsBar}>
                    <View style={styles.totalsInner}>
                        <Text style={styles.totalsEyebrow}>TOTALS</Text>
                        <View style={styles.totalsRow}>
                            {Object.entries(totals).map(([col, value], i) => (
                                <Metric
                                    key={col}
                                    label={labelMap[col] || col}
                                    value={`₹ ${value.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}`}
                                    color={col === 'clramt' ? T.green : T.nav}
                                    align={i === 0 ? 'left' : 'right'}
                                />
                            ))}
                        </View>
                    </View>
                </View>
            );
        }, [totals, labelMap]);
        // Empty state
        const EmptyState = useCallback(() => (
            <ErpEmptyState icon="search-off" title="No records found" text="Try a different search term." />
        ), []);

        // Main render
        return (
            <>
                <View
                    style={{ flex: 1, backgroundColor: T.bg }}
                    pointerEvents="box-none"
                >
                    {/* MAIN SCROLLVIEW (Disabled if card is locked or modal is open) */}
                    <ScrollView
                        ref={mainScrollRef}
                        style={{ flex: 1 }}
                        contentContainerStyle={[styles.listContent, { paddingHorizontal: akvGutter - 5 }]}
                        showsVerticalScrollIndicator
                        scrollEnabled={!isCardLocked && !isModalOpen}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                    >
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

                    {/* FIXED FOOTER */}
                    <Footer />

                    {/* CARD DETAIL MODAL */}

                </View>
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

        const { isPhone, cols, gutter } = useSotLayout();

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
                <View key={`${item.PrpCode}-${index}`} style={[cellWidth(cols), styles.gridCell]}>
                    <TouchableOpacity
                        style={[styles.card, isActive && styles.cardActive, isLoadingSummary && { opacity: 0.6 }]}
                        activeOpacity={0.85}
                        disabled={isLoadingSummary}
                        onPress={() => onCardPress && onCardPress(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${item.PrpName || 'property'} collection`}
                    >
                        <View style={styles.cardHead}>
                            <View style={styles.cardIcon}>
                                <Icon name="account-balance" size={18} color={T.copper} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.cardTitle} numberOfLines={2}>{item[visibleColumns[0]] || '-'}</Text>
                                {!!item.PrpCode && <Text style={styles.cardMeta} numberOfLines={1}>#{item.PrpCode}</Text>}
                            </View>
                            {isActive ? (
                                <View style={styles.activeBadge}>
                                    <Icon name="history" size={11} color={T.copper} />
                                    <Text style={styles.activeBadgeText}>Last opened</Text>
                                </View>
                            ) : (
                                <Icon name="chevron-right" size={22} color={T.muted} />
                            )}
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
            <View style={styles.gridWrap}>
                {filteredData.map((item, index) => renderCard(item, index))}
            </View>
        );

        return (

            <View style={styles.container}>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter - 5 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Totals (were the fixed footer) */}
                    <View style={styles.listHeader}>
                        <KpiGrid isPhone={isPhone}>
                            <Kpi
                                label="Collection"
                                icon="payments"
                                accent={T.nav}
                                value={`₹${totals.ToDaysCollection.toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}`}
                                sub="Shown properties"
                            />
                            <Kpi
                                label="Credit in Bank"
                                icon="account-balance-wallet"
                                accent={T.green}
                                valueColor={T.green}
                                value={`₹${totals.CrInBankAccCollection.toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}`}
                                sub="Cleared in bank"
                            />
                        </KpiGrid>
                        <SectionHead
                            title="Properties"
                            meta={`${filteredData.length} shown · ${Array.isArray(data) ? data.length : 0} total · tap a card for party / executive split`}
                        />
                    </View>

                    {filteredData.length > 0 ? (
                        renderItemsInGrid()
                    ) : (
                        <View style={styles.emptyCard}>
                            <ErpEmptyState icon="search-off" title="No records found" text="No property matches this search." />
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


    // NEW ERP UI: responsive layout (replaces the old Dimensions/grid maths)
    const { isPhone, cols, gutter } = useSotLayout();
    const listContentStyle = [styles.listContent, { paddingHorizontal: gutter - 5 }];

    // Shared body of the Party Wise / Sales Executive Wise cards.
    const renderSplitCard = (item, index, isAllCard, totalToDaysCollection, totalCrInBankAccCollection, formatAmount, onPress) => (
        <View key={item.Code || `${item.SExe || item.acccode || 'row'}-${index}`} style={[cellWidth(cols), styles.gridCell]}>
            <TouchableOpacity
                style={[isAllCard ? styles.allCard : styles.card, getSexeLoading && { opacity: 0.55 }]}
                activeOpacity={0.85}
                onPress={onPress}
                disabled={getSexeLoading}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.SalesExecutive || ''} details`}
            >
                <View style={styles.cardHead}>
                    {isAllCard ? (
                        <View style={styles.allIcon}>
                            <Icon name="functions" size={18} color={T.copper} />
                        </View>
                    ) : (
                        <Avatar name={item.SalesExecutive} size={36} />
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={isAllCard ? styles.allTitle : styles.cardTitle} numberOfLines={2}>
                            {item.SalesExecutive}
                        </Text>
                        {/* Code (skip for "ALL") */}
                        {!isAllCard ? (
                            <Text style={styles.cardMeta} numberOfLines={1}>
                                Code: {item.SExe || item.acccode || '-'}
                            </Text>
                        ) : (
                            <Text style={styles.allMeta} numberOfLines={1}>Combined total of all rows shown</Text>
                        )}
                    </View>
                    <Icon name="chevron-right" size={22} color={isAllCard ? '#fff' : T.muted} />
                </View>
                <View style={isAllCard ? styles.allMetricBox : styles.metricBox}>
                    <Metric
                        label="Collection"
                        value={`₹${isAllCard
                            ? formatAmount(totalToDaysCollection)
                            : formatAmount(item.ToDaysCollection)
                            }`}
                        color={T.nav}
                    />
                    <Metric
                        label="Credit in Bank"
                        value={`₹${isAllCard
                            ? formatAmount(totalCrInBankAccCollection)
                            : formatAmount(item.CrInBankAccCollection)
                            }`}
                        color={T.green}
                        align="right"
                    />
                </View>
            </TouchableOpacity>
        </View>
    );

    // Render Party Wise And Excutive vise card display
    const renderCard = (item, index, tabType?) => {
        // console.log("filterpartyData ::::", filterpartyData)
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

        const formatAmount = (value) => {
            return Number(value || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };

        return renderSplitCard(
            item,
            index,
            isAllCard,
            totalToDaysCollection,
            totalCrInBankAccCollection,
            formatAmount,
            async () => {
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
            }
        );
    };

    const renderItemsInGrid = (data, tabType) => {
        if (!data || data.length === 0) return null;
        return (
            <View style={styles.gridWrap}>
                {data.map((item, index) =>
                    renderCard(item, index, tabType)   // 👈 tabType pass
                )}
            </View>
        );
    };



    const renderPartyCard = (item, index) => {
        const isAllCard = item.SalesExecutive === "ALL";
        const totalToDaysCollection = filteredPartyData.reduce(
            (sum, dataItem) => sum + parseFloat(dataItem.ToDaysCollection || '0'),
            0
        );
        const totalCrInBankAccCollection = filteredPartyData.reduce(
            (sum, dataItem) => sum + parseFloat(dataItem.CrInBankAccCollection || '0'),
            0
        );

        const formatAmount = (value) => {
            return Number(value || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };

        return renderSplitCard(
            item,
            index,
            isAllCard,
            totalToDaysCollection,
            totalCrInBankAccCollection,
            formatAmount,
            async () => {
                if (getSexeLoading) return;
                setLoadingStates({ [item.Code || "ALL"]: true });
                setSelectedSexeName(item.SalesExecutive);
                handleLoadPressSEXE(item);
            }
        );
    };

    const renderPartyItemsInGrid = (data) => {
        if (!data || data.length === 0) return null;
        return (
            <View style={styles.gridWrap}>
                {data.map((item, index) =>
                    renderPartyCard(item, index)   // 👈 tabType pass
                )}
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
                todate: detailPayload.todate,
                internal: selectedInternal?.value || ""
            };
            console.log("Payload", payloadSexe)
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
                todate: detailPayload.todate,
                internal: selectedInternal?.value || ""
            };
            console.log("payloadSexe", payloadSexe)
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
        if (!token) return;
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
    }, [token]);

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
        if (!token) return;
        if (form.PrpOf) {
            SalesExe();
        }
    }, [form.PrpOf, token]);

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

    // ---------- NEW ERP UI: toolbar chips + panel context (display only) ----------
    const activeFilterCount =
        (selectedPropertyGroup ? 1 : 0) +
        (Array.isArray(selectedProperty) && selectedProperty.length ? 1 : 0) +
        (Array.isArray(SelectedSexe) && SelectedSexe.length ? 1 : 0);
    const filterChips: { icon?: string; text: string }[] = [
        { icon: 'date-range', text: `${formatDate(form.fromdate)} → ${formatDate(form.todate)}` },
        ...(selectedInternal && (selectedInternal as InternalDropdown).lable
            ? [{ icon: 'swap-horiz', text: (selectedInternal as InternalDropdown).lable }]
            : []),
        ...(selectedPropertyGroup?.PrpOfFull ? [{ icon: 'domain', text: selectedPropertyGroup.PrpOfFull }] : []),
        ...(Array.isArray(selectedProperty) && selectedProperty.length
            ? [{ icon: 'business', text: `${selectedProperty.length} propert${selectedProperty.length === 1 ? 'y' : 'ies'}` }]
            : []),
        ...(Array.isArray(SelectedSexe) && SelectedSexe.length
            ? [{ icon: 'badge', text: `${SelectedSexe.length} sales exe.` }]
            : []),
    ];
    const activePropName = (gePOTData.find((p: any) => p.PrpCode === activeCard) as any)?.PrpName || '';
    const sumOf = (rows: any[], key: string) =>
        rows.reduce((sum, item) => sum + parseFloat(item[key] || '0'), 0);

    // Sticky totals bar used by the drill-down panels (was the absolute footer).
    const renderTotalsBar = (collectionLabel: string, rows: any[]) => (
        <View style={styles.totalsBar}>
            <View style={styles.totalsInner}>
                <Text style={styles.totalsEyebrow}>TOTALS</Text>
                <View style={styles.totalsRow}>
                    <Metric
                        label={collectionLabel}
                        value={`₹${parseFloat(sumOf(rows, 'ToDaysCollection')).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}`}
                        color={T.nav}
                    />
                    <Metric
                        label="Credit in Bank"
                        value={`₹${parseFloat(sumOf(rows, 'CrInBankAccCollection')).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}`}
                        color={T.green}
                        align="right"
                    />
                </View>
            </View>
        </View>
    );

    const renderPanelEmpty = (loading: boolean) =>
        loading ? (
            <View style={styles.panelLoading}>
                <ActivityIndicator size="small" color={T.copper} />
                <Text style={styles.loadingMoreText}>Loading…</Text>
            </View>
        ) : (
            <View style={styles.emptyCard}>
                <ErpEmptyState icon="search-off" title="No records found" text="Try another name or clear the search." />
            </View>
        );

    return (
        <>
            <GestureHandlerRootView style={styles.root}>
                {/* ───────────── Toolbar: search + filters ───────────── */}
                <Toolbar
                    search={searchQueryPOT}
                    onSearch={setSearchQueryPOT}
                    placeholder={isPhone ? 'Search reports...' : 'Search property, collection or bank amount...'}
                    onFilters={openDrawer}
                    filterCount={activeFilterCount}
                    chips={filterChips}
                    onChipPress={openDrawer}
                />

                <View style={styles.container}>
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

                        </>

                    ) : (
                        <ScrollView style={styles.container} contentContainerStyle={listContentStyle}>
                            <View style={styles.emptyCard}>
                                <ErpEmptyState
                                    icon={isLoading ? 'hourglass-empty' : 'account-balance-wallet'}
                                    title={isLoading ? 'Loading…' : 'No data available'}
                                    text="Choose the property group, properties, date range and sales executives, then tap Load to see the day's collection."
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
                    setIsLoggedIn={setIsLoggedIn}
                    isConnected={isConnected}
                    setSelectedSexe={setSelectedSexe}
                    SelectedSexe={SelectedSexe}
                    form={form}
                    internal_dropdown={internal_dropdown}
                    selectedInternal={selectedInternal?.lable || 'Select Internal'}
                    onExeChangeInternal={setSelectedInternal}


                // selectedItemStatus={selectedItemStatus}
                // onItemStatusChange={handleItemStatusChange}
                />

                {/* ───────────── Drill-down 1: Party wise / Sales executive wise ───────────── */}
                {sexeModalVisible && (
                    <View style={[styles.panel, { zIndex: 100 }]}>
                        <PanelHeader
                            onBack={() => setSexeModalVisible(false)}
                            backLabel="Close"
                            crumbs={['Daily Collection', activePropName]}
                            title={selectedSexeCard?.SalesExecutive || 'Sales Executive Details'}
                            subtitle={`${formatDate(form.fromdate)} → ${formatDate(form.todate)}`}
                        />

                        {/* Tabs + search */}
                        <View style={[styles.panelSearch, { paddingHorizontal: gutter }]}>
                            <View style={styles.panelSearchInner}>
                                <View style={styles.panelTools}>
                                    <View style={isPhone ? { width: '100%' } : { width: 380 }}>
                                        <Segment
                                            value={modalTab as any}
                                            options={[
                                                { value: 'PartyWise', label: 'Party Wise', icon: 'groups' },
                                                { value: 'SalesExecutiveWise', label: isPhone ? 'Sales Exe. Wise' : 'Sales Executive Wise', icon: 'badge' },
                                            ]}
                                            onChange={(tab: any) => {
                                                if (tab === 'PartyWise') {
                                                    setModalTab("PartyWise");
                                                } else {
                                                    if (isLoadingSummary) return;
                                                    setModalTab("SalesExecutiveWise");
                                                }
                                            }}
                                        />
                                    </View>
                                    <SearchBox
                                        value={sexeSearchQuery}
                                        onChangeText={setSexeSearchQuery}
                                        placeholder="Search..."
                                        loading={getSexeLoading}
                                        style={isPhone ? { width: '100%' } : { flex: 1, minWidth: 220 }}
                                    />
                                </View>
                            </View>
                        </View>

                        <ScrollView
                            style={styles.container}
                            contentContainerStyle={listContentStyle}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.listHeader}>
                                <SectionHead
                                    title={modalTab === 'PartyWise' ? 'Party Wise' : 'Sales Executive Wise'}
                                    meta={
                                        modalTab === 'PartyWise'
                                            ? 'Tap a party to see its collection entries'
                                            : 'Tap an executive to see their parties'
                                    }
                                />
                            </View>
                            {filteredData12.length > 0 ? (
                                renderModalContent()
                            ) : (
                                renderPanelEmpty(getSexeLoading)
                            )}

                        </ScrollView>
                        {/* Totals Footer */}
                        {renderTotalsBar('Collection', filteredData12)}
                    </View>
                )}

                {/* ───────────── Drill-down 2: parties of one sales executive ───────────── */}
                {partyWiseModalVisible && (
                    <View style={[styles.panel, { zIndex: 200 }]}>
                        <PanelHeader
                            onBack={() => setPartyWiseModalVisible(false)}
                            backLabel="Close"
                            crumbs={['Daily Collection', activePropName, getSelectedSexeName ? String(getSelectedSexeName) : '']}
                            title={selectedSexeCard?.SalesExecutive || 'Party Wise Detail'}
                            subtitle={`${filteredPartyData.filter((p: any) => p.SalesExecutive !== 'ALL').length} parties`}
                        />

                        {/* Search */}
                        <View style={[styles.panelSearch, { paddingHorizontal: gutter }]}>
                            <View style={styles.panelSearchInner}>
                                <SearchBox
                                    value={partySearchQuery}
                                    onChangeText={setPartySearchQuery}
                                    placeholder="Search..."
                                    loading={getSexeLoading}
                                />
                            </View>
                        </View>

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
                                renderPanelEmpty(getSexeLoading)
                            )}
                        </ScrollView>
                        {renderTotalsBar("Today's Collection", filteredPartyData)}
                    </View>
                )}

                {/* ───────────── Drill-down 3: collection entries ───────────── */}
                {modalVisible && (
                    <View style={[styles.panel, { zIndex: 300 }]}>
                        {/* Header */}
                        <PanelHeader
                            onBack={() => {
                                setModalVisible(false);
                                setSelectedSexeName(null);
                            }}
                            backLabel="Close"
                            crumbs={['Daily Collection', activePropName]}
                            title={`Details - (${getSelectedSexeName})`}
                            subtitle={`${Array.isArray(getDetailsData) ? getDetailsData.length : 0} entr${Array.isArray(getDetailsData) && getDetailsData.length === 1 ? 'y' : 'ies'}`}
                        />

                        {/* Search */}
                        <View style={[styles.panelSearch, { paddingHorizontal: gutter }]}>
                            <View style={styles.panelSearchInner}>
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
                    </View>
                )}

                <BusyOverlay visible={isLoading && !isDrawerVisible} text="Loading collection…" />
                <BusyOverlay visible={detailLoading} text="Loading details…" />
            </GestureHandlerRootView>
        </>
    );
};

const styles = StyleSheet.create({
    // ----- shell -----
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
    gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    gridCell: { padding: 5 },
    emptyCard: {
        margin: 5,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
    },

    // ----- cards -----
    card: {
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        gap: 11,
        flex: 1,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    cardActive: { borderColor: T.copper, borderWidth: 1.5, backgroundColor: '#FFFCF8' },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    cardTitle: { fontSize: 14.5, fontWeight: '800', color: T.ink, lineHeight: 19 },
    cardMeta: { fontSize: 11, fontWeight: '700', color: T.muted, marginTop: 2 },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: `${T.copper}16`,
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    activeBadgeText: { fontSize: 10.5, fontWeight: '800', color: T.copper },
    metricBox: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },

    // "ALL" summary card
    allCard: {
        backgroundColor: T.nav,
        borderRadius: 14,
        padding: 13,
        gap: 11,
        flex: 1,
    },
    allIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF14',
    },
    allTitle: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.6 },
    allMeta: { fontSize: 11, fontWeight: '700', color: T.copper, marginTop: 2 },
    allMetricBox: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: T.surface,
        borderRadius: 10,
        padding: 10,
    },

    // ----- entries (AllKeysCardsView) -----
    groupBlock: { marginBottom: 10 },
    groupHead: {
        marginHorizontal: 5,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: T.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.border,
        borderLeftWidth: 3,
        borderLeftColor: T.copper,
    },
    groupChevron: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.alt,
    },
    groupTitle: { flex: 1, fontSize: 13.5, fontWeight: '900', color: T.nav },
    countPill: {
        minWidth: 26,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}16`,
    },
    countPillText: { fontSize: 11, fontWeight: '900', color: T.copper },
    rowCard: {
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
    rowCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowCardIcon: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    kvList: { gap: 0 },
    kvRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
        borderTopWidth: 1,
        borderTopColor: T.hair,
    },
    kvLabel: { flexShrink: 0, maxWidth: '48%', fontSize: 11.5, fontWeight: '700', color: T.muted },
    kvValue: { flex: 1, fontSize: 12.5, fontWeight: '600', color: T.ink, textAlign: 'right' },
    detailCard: {
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        paddingHorizontal: 13,
        paddingVertical: 7,
        flex: 1,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    loadingMore: {
        marginHorizontal: 5,
        marginTop: 6,
        padding: 12,
        alignItems: 'center',
        backgroundColor: T.sub,
        borderRadius: 10,
        gap: 4,
    },
    loadingMoreText: { color: T.muted, fontSize: 12, fontWeight: '700' },
    panelLoading: { alignItems: 'center', paddingVertical: 40, gap: 8 },

    // ----- drill-down panels -----
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
    panelSearchInner: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    panelTools: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },

    // sticky totals bar
    totalsBar: {
        backgroundColor: T.surface,
        borderTopWidth: 1,
        borderTopColor: T.border,
        paddingVertical: 10,
    },
    totalsInner: {
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        paddingHorizontal: 16,
        gap: 6,
    },
    totalsEyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    totalsRow: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: `${T.copper}12`,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
});


export default DailyCollectionReport;
