import { crlimtreq_styles } from '@/common/Style';
import FullScreenLoader from '@/components/FullScreenLoader';
import HeaderBar from '@/components/Header';
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import Clipboard from '@react-native-clipboard/clipboard';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
// import {
//     ActivityIndicator,
//     Alert,
//     Dimensions,
//     FlatList,
//     KeyboardAvoidingView,
//     Platform,
//     StyleSheet,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     View
// } from 'react-native';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { API } from '../../common/API/dynamicAPI';
import {
    generateFinancialYearOptions,
    getCurrentFinancialYearMain,
} from '../../common/API/Functions';
import CustomDrawer from './CustomDrawer';
import {
    DesignData,
    ExeData,
    ItemData,
    ItemStatus,
    WiseStatus
} from './Modal';

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

interface Summary {
    noof: string;
    totmtr: string;
    amount: string;
    pendingmtr: string;
    pendingamt: string;
}

const formatValue = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)} K`;
    return num.toFixed(2);
};

const formatNumber = (value: string) => {
    return parseFloat(value).toLocaleString('en-IN');
};

const SalesOrderTracking: React.FC<{
    token: string;
    navigation: any;
    username: string;
}> = ({ token, username }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [renderedData, setRenderedData] = useState<Party[]>([]);
    const [getPartyData, setPartyData] = useState([]);
    const [salessumdata, setsalessumdata] = useState([]);
    const [salesdata, setsalesdata] = useState<Party[]>([]);
    const [salesdataTotal, setsalesdataTotal] = useState<number | null>(null);
    const itemsPerPage = 10;
    const [isLoading, setIsLoading] = useState(false);
    const [getTrackingLoader, setTrackingLoader] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [searchQueryPOT, setSearchQueryPOT] = useState('');
    const [filteredData, setFilteredData] = useState<Party[]>([]);
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [delDate, setDelDate] = useState<Date>(new Date());
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const yearOptions = generateFinancialYearOptions(currentYear);
    const [selectedYear, setSelectedYear] = useState<string>(
        getCurrentFinancialYearMain(),
    );
    const [selectedExe, setSelectedExe] = useState<ExeData | null>(null);
    const [getDData, setDData] = useState(null);
    const [exeData, setExeData] = useState<ExeData[]>([]);
    const [designData, setDesignData] = useState<DesignData[]>([]);
    const [itemData, setItemData] = useState<ItemData[]>([]);
    const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([]);
    const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
    const [selectedParty, setSelectedParty] = useState([]);
    const [selectedItemStatus, setSelectedItemStatus] =
        useState<ItemStatus>('All');
    const [selectedItemStatus1, setSelectedItemStatus1] =
        useState<WiseStatus>('Party Wise');
    const [lastViewedParcode, setLastViewedParcode] = useState<string | null>(
        null,
    );
    const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
    const [isAll, setisALL] = useState(false);
    const [dsnData, setDsnData] = useState([]);
    //
    const [isDesignModalVisible, setIsDesignModalVisible] = useState(false);
    const [getMainPayload, setMainPayload] = useState({});
    const [selectedDesignData, setSelectedDesignData] = useState<{
        designdetails: any[];
        design_summary: any[];
        payload: any;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredDesignDetails, setFilteredDesignDetails] = useState(
        selectedDesignData?.designdetails || [],
    );
    //
    const [designChildData, setDesignChildData] = useState([]);
    const [designPage, setDesignPage] = useState(1);
    const [subdesignPage, setsubDesignPage] = useState(1);
    const designItemsPerPage = 10;
    const subdesignItemsPerPage = 10;
    const [isListReady, setIsListReady] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const [isPartyDetailsModalVisible, setIsPartyDetailsModalVisible] =
        useState(false);
    const [selectedPartyDetails, setSelectedPartyDetails] = useState<{
        designdetails: any[];
        design_summary: any[];
        payload: any;
    } | null>(null);
    const [searchQueryPartyDetails, setSearchQueryPartyDetails] = useState('');
    const [filteredPartyDetails, setFilteredPartyDetails] = useState(
        selectedPartyDetails?.designdetails || [],
    );
    const loadMoreDesignDetails = () => {
        if (designPage * designItemsPerPage < filteredDesignDetails.length) {
            setDesignPage(designPage + 1);
        }
    };
    const loadMoreSubDesignDetails = () => {
        if (subdesignPage * subdesignItemsPerPage < filteredPartyDetails.length) {
            setsubDesignPage(subdesignPage + 1);
        }
    };

    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [sortOrder1, setSortOrder1] = useState<'asc' | 'desc'>('asc');
    const [sortOrder2, setSortOrder2] = useState<'asc' | 'desc'>('asc');
    const [selectedSalesExes, setSelectedSalesExes] = useState([]);
    const [salesExeData, setSalesExeData] = useState([]);
    // 
    // ===== JOB CHART / ALLOCATION STATES =====
    // ===== JOB CHART / ALLOCATION STATES =====
    const [jobChartVisible, setJobChartVisible] = useState(false);
    const [jobChartLoading, setJobChartLoading] = useState(false);
    const [jobChartSaving, setJobChartSaving] = useState(false);
    const [jobChartRef, setJobChartRef] = useState<{
        orderUId: string;
        itmCode: string;
        dsnCode: string;
        dsnName: string;
        prpcode: string;
        strcode: string;
        yearno: string;
        srno: string;
        grdcode: string;
        grdname: string;
        sono?: string;
        status?: string;
        pendingMeter: number; // 👈 NEW
        shdcode?: string;
        apccode?: string;
    } | null>(null);
    const [allocations, setAllocations] = useState<any[]>([]);
    // 👇 NEW: shade picker is now a separate full modal, not inline dropdown
    const [shadePickerVisible, setShadePickerVisible] = useState(false);
    const [shadeQuery, setShadeQuery] = useState('');
    const [shadeResults, setShadeResults] = useState<{ Code: string; Name: string }[]>([]);
    const [shadeSearchLoading, setShadeSearchLoading] = useState(false);
    const [selectedShade, setSelectedShade] = useState<{ Code: string; Name: string } | null>(null);
    const [addQty, setAddQty] = useState('');
    const qtyInputRef = useRef<TextInput>(null);
    let shadeSearchDebounce: any;

    const toggleSortOrder = () => {
        setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    };
    const toggleSortOrder1 = () => {
        setSortOrder1(prev => (prev === 'asc' ? 'desc' : 'asc'));
    };
    const toggleSortOrder2 = () => {
        setSortOrder2(prev => (prev === 'asc' ? 'desc' : 'asc'));
    };

    // //////////////////////////////////////////////////////////////
    // ===== JOB CHART / ALLOCATION LOGIC =====

    const getAllocRequestConfig = (params: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params,
    });

    // Open job chart for a design-level item (from Main Design Details or Sub Design Details card)
    const openJobChart = async (item: any) => {
        console.log('🔵 payload JOB CHART', item);
        const orderUId = item?.suid || '';

        if (!orderUId) {
            Alert.alert('Error', 'Order reference (UId) not found on this item.');
            return;
        }

        const ref = {
            orderUId: String(orderUId),
            itmCode: String(item?.itmcode || ''),
            dsnCode: String(item?.dsncode || ''),
            dsnName: item?.Dsnname || '',
            prpcode: item?.prpcode || '',
            strcode: item?.strcode || '',
            yearno: selectedYear ? selectedYear.split('-')[1].substring(2) : '',
            srno: item?.OrderSrNo || item?.SrNo || item?.srno || '1',
            grdcode: item?.grdcode || '1',
            grdname: item?.GrdName || item?.grdname || '',
            sono: item?.sono || '',
            status: String(item?.status || '').toUpperCase().trim(),
            pendingMeter: parseFloat(item?.pending) || 0, // 👈 NEW
            shdcode: item?.shdcode || '',
            apccode: item?.apccode || '',
        };

        setJobChartRef(ref);
        setAllocations([]);
        setSelectedShade(null);
        setAddQty('');
        setShadeQuery('');
        setShadeResults([]);
        setJobChartVisible(true);
        await fetchAllocations(ref);
    };

    const areCodesMatching = (shdcode: string, apccode: string): boolean => {
        return shdcode === apccode;
    };

    // 👇 Can user add/edit allocations for this item?
    const canEditAllocation = () => {
        if (!jobChartRef) return false;
        if (jobChartRef.status === 'CLOSED') return false;
        // if (jobChartRef.status === 'CLOSED') return false;
        if ((jobChartRef.pendingMeter || 0) <= 0) return false;

        // 🆕 APC condition: allow only if shdcode matches apccode
        if (!areCodesMatching(jobChartRef?.shdcode, jobChartRef?.apccode)) return false;
        return true;
    };

    // 👇 Today's date in YYYYMMDD format, matching LastDate format
    const getTodayDateStr = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}${m}${day}`;
    };

    const formatAllocDate = (dateStr?: string) => {
        if (!dateStr || dateStr.length !== 8) return '';
        return `${dateStr.substring(6, 8)}-${dateStr.substring(4, 6)}-${dateStr.substring(0, 4)}`;
    };

    const getTotalAllocatedQty = () =>
        allocations.reduce((sum, a) => sum + (parseFloat(a.AllocationQty) || 0), 0);

    const fetchAllocations = async (ref: typeof jobChartRef) => {
        if (!ref) return;
        setJobChartLoading(true);
        try {
            const response = await axios.get(
                `${API}/api/so-allocation`,
                getAllocRequestConfig({
                    prpcode: ref.prpcode,
                    yearno: ref.yearno,
                    strcode: ref.strcode,
                    order_uid: ref.orderUId,
                }),
            );
            console.log('🔵 so-allocation GET response:', ref, response.data);
            if (response.data.success) {
                setAllocations(response.data.response.data || []);
            } else {
                setAllocations([]);
            }
        } catch (error) {
            console.error('fetchAllocations error:', error);
            Alert.alert('Error', 'Failed to load allocation details.');
        } finally {
            setJobChartLoading(false);
        }
    };

    const searchShades = (query: string) => {
        setShadeQuery(query);
        if (shadeSearchDebounce) clearTimeout(shadeSearchDebounce);
        shadeSearchDebounce = setTimeout(async () => {
            if (!jobChartRef) return;
            setShadeSearchLoading(true);
            try {
                const response = await axios.get(
                    `${API}/api/so-allocation/lookup`,
                    getAllocRequestConfig({
                        prpcode: jobChartRef.prpcode,
                        yearno: jobChartRef.yearno,
                        strcode: jobChartRef.strcode,
                        type: 'shade',
                        search: query || '',
                    }),
                );
                if (response.data.success) {
                    setShadeResults(response.data.response.data || []);
                } else {
                    setShadeResults([]);
                }
            } catch (error) {
                console.error('searchShades error:', error);
                setShadeResults([]);
            } finally {
                setShadeSearchLoading(false);
            }
        }, 300);
    };

    // 👇 opens the dedicated shade picker modal
    const openShadePicker = () => {
        setShadeQuery('');
        setShadeResults([]);
        setShadePickerVisible(true);
        searchShades(''); // load initial list
    };

    // 👇 called when user taps a shade in the picker
    const handleSelectShade = (s: { Code: string; Name: string }) => {
        setSelectedShade(s);
        setShadePickerVisible(false);
        // focus qty input right after picking shade, small delay to let modal close first
        setTimeout(() => qtyInputRef.current?.focus(), 300);
    };

    const handleAddAllocationRow = () => {
        // if (!canEditAllocation()) {
        //     Alert.alert(
        //         'Not Allowed',
        //         jobChartRef?.status === 'CLOSED'
        //             ? 'This design is closed. Allocation cannot be modified.'
        //             : 'No pending meter available to allocate.',
        //     );
        //     return;
        // }
        {
            !canEditAllocation() && (
                <View style={styles.jobChartLockBanner}>
                    <Icon name="lock" size={16} color="#E65100" />
                    <Text style={styles.jobChartLockBannerText}>
                        {jobChartRef?.status === 'CLOSED'
                            ? 'This design is closed — view only.'
                            : jobChartRef?.pendingMeter <= 0
                                ? 'No pending meter left — view only.'
                                : 'APC not matched — view only.'}
                    </Text>
                </View>
            )
        }
        if (!selectedShade) {
            Alert.alert('Error', 'Please select a shade first.');
            return;
        }
        if (!addQty || parseFloat(addQty) <= 0) {
            Alert.alert('Error', 'Please enter a valid quantity.');
            return;
        }

        // 🚫 Duplicate shade check
        const alreadyExists = allocations.some(
            a => String(a.ShdCode) === String(selectedShade.Code),
        );
        if (alreadyExists) {
            Alert.alert(
                'Duplicate Shade',
                'This shade is already allocated. Please edit the existing quantity instead of adding it again.',
            );
            return;
        }

        // 🚫 Pending meter check
        const currentTotal = getTotalAllocatedQty();
        const newQty = parseFloat(addQty);
        const pendingMeter = jobChartRef?.pendingMeter || 0;
        if (currentTotal + newQty > pendingMeter) {
            Alert.alert(
                'Exceeds Pending Meter',
                `Total allocation (${formatNumber(String(currentTotal + newQty))} m) can't exceed pending meter (${formatNumber(String(pendingMeter))} m). You can add up to ${formatNumber(String(Math.max(pendingMeter - currentTotal, 0)))} m more.`,
            );
            return;
        }

        const newRow = {
            AllocationId: 0,
            OrderSrNo: jobChartRef?.srno || '1',
            StrCode: jobChartRef?.strcode || '5',
            ItmCode: jobChartRef?.itmCode || '',
            DsnCode: jobChartRef?.dsnCode || '',
            GrdCode: jobChartRef?.grdcode || '1',
            GrdName: jobChartRef?.grdname || '1st',
            ShdCode: selectedShade.Code,
            ShdName: selectedShade.Name,
            AllocationQty: addQty,
            ChallanQty: 0,
            IsLocked: 0,
            Remark: '',
        };

        setAllocations(prev => [...prev, newRow]);
        setSelectedShade(null);
        setAddQty('');
    };

    const handleRemoveAllocationRow = (index: number) => {
        if (!canEditAllocation()) return;
        setAllocations(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveAllocations = async () => {
        if (!jobChartRef) return;

        const totalQty = getTotalAllocatedQty();
        if (totalQty > (jobChartRef.pendingMeter || 0)) {
            Alert.alert('Error', 'Total allocation exceeds pending meter. Please adjust quantities before saving.');
            return;
        }

        setJobChartSaving(true);
        try {
            const payload = {
                ReplaceAll: 1,
                PrpCode: jobChartRef.prpcode,
                YearNo: jobChartRef.yearno,
                StrCode: jobChartRef.strcode,
                prpcode: jobChartRef.prpcode,
                yearno: jobChartRef.yearno,
                strcode: jobChartRef.strcode,
                OrderUId: jobChartRef.orderUId,
                items: [
                    {
                        SrNo: jobChartRef.srno,
                        Qty: '.000',
                        ItmCode: jobChartRef.itmCode,
                        DsnCode: jobChartRef.dsnCode,
                        Allocations: allocations,
                    },
                ],
            };

            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const response = await axios.post(
                `${API}/api/so-allocation/sync`,
                payload,
                { headers },
            );
            console.log('🔵 so-allocation/sync response:', response.data);

            if (response.data.success) {
                Alert.alert('Success', response.data.response?.message || 'Allocation saved.');
                // 🔁 Re-fetch fresh data from server after successful save
                await fetchAllocations(jobChartRef);
            } else {
                Alert.alert('Error', response.data.message || 'Failed to save allocation.');
            }
        } catch (error) {
            console.error('handleSaveAllocations error:', error);
            Alert.alert('Error', 'Failed to save allocation.');
        } finally {
            setJobChartSaving(false);
        }
    };

    const getJobChartTotal = () =>
        allocations
            .reduce((sum, a) => sum + (parseFloat(a.AllocationQty) || 0), 0)
            .toFixed(0);

    // const copyJobChartText = () => {
    //     const lines = allocations.map(
    //         a => `${a.ShdName?.trim()} : ${formatNumber(String(a.AllocationQty))} m`,
    //     );
    //     const text = `REF: ${jobChartRef?.dsnCode || ''}\nDESIGN: ${jobChartRef?.dsnName || ''}\n\n${lines.join('\n')}\n\nTOTAL: ${formatNumber(getJobChartTotal())} m`;
    //     Clipboard.setString(text);
    //     Alert.alert('Copied', 'Job chart text copied to clipboard.');
    // };
    // ///////////////////////////////////////////////////////////////////

    // useEffect(() => {
    //     if (selectedDesignData) {
    //         const lowercasedQuery = searchQuery.toLowerCase();
    //         const filtered = selectedDesignData.designdetails.filter(
    //             (item) =>
    //                 item?.parcode?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.partyname?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.sono?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.sodate?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.Dsnname?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.dsncode?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.totmtr?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.totamt?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.chalqty?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.chalamt?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.noofchallan?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.pending?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.pendingamt?.toLowerCase().includes(lowercasedQuery)
    //         );
    //         setFilteredDesignDetails(filtered);
    //     }
    // }, [searchQuery, selectedDesignData]);
    useEffect(() => {
        if (!selectedDesignData) return;

        if (!searchQuery.trim()) {
            const sorted1 = [...selectedDesignData.designdetails].sort((a, b) => {
                const aAmt = parseFloat(a.pendingamt) || 0;
                const bAmt = parseFloat(b.pendingamt) || 0;

                return sortOrder1 === 'asc' ? aAmt - bAmt : bAmt - aAmt;
            });

            setFilteredDesignDetails(sorted1);
            //setFilteredDesignDetails(selectedDesignData.designdetails);
        } else {
            const query = searchQuery.toLowerCase();

            // 🔹 Step 1: child filter (responsedes)
            const filteredChild = designChildData.filter(
                item =>
                    item?.pdsncode?.toLowerCase().includes(query) ||
                    item?.pdesign?.toLowerCase().includes(query) ||
                    item?.cdsncode?.toLowerCase().includes(query) ||
                    item?.cdesign?.toLowerCase().includes(query),
            );

            // 🔹 Step 2: unique cdsncode nikalo
            const uniqueCodes = [...new Set(filteredChild.map(i => i.cdsncode))];
            const codeSet = new Set(uniqueCodes);

            const finalFiltered = selectedDesignData.designdetails.filter(item =>
                codeSet.has(item.dsncode),
            );
            // 🔹 Step 3: parent filter (dsncode match)
            // const finalFiltered = selectedDesignData.designdetails.filter(item =>
            //     uniqueCodes.includes(item.dsncode)
            // );

            const sortedFiltered1 = [...finalFiltered].sort((a, b) => {
                const aAmt = parseFloat(a.pendingamt) || 0;
                const bAmt = parseFloat(b.pendingamt) || 0;

                return sortOrder === 'asc' ? aAmt - bAmt : bAmt - aAmt;
            });

            setFilteredDesignDetails(sortedFiltered1);
            //setFilteredDesignDetails(finalFiltered);
        }
    }, [searchQuery, selectedDesignData, designChildData, sortOrder1]);

    // Filter partydetails based on search query
    useEffect(() => {
        if (selectedPartyDetails?.designdetails) {
            const lowercasedQuery = searchQueryPartyDetails.toLowerCase();
            const filtered = selectedPartyDetails.designdetails.filter(
                item =>
                    item?.parcode?.toLowerCase().includes(lowercasedQuery) ||
                    item?.partyname?.toLowerCase().includes(lowercasedQuery) ||
                    item?.sono?.toLowerCase().includes(lowercasedQuery) ||
                    item?.sodate?.toLowerCase().includes(lowercasedQuery) ||
                    item?.Dsnname?.toLowerCase().includes(lowercasedQuery) ||
                    item?.dsncode?.toLowerCase().includes(lowercasedQuery) ||
                    item?.totmtr?.toLowerCase().includes(lowercasedQuery) ||
                    item?.chalqty?.toLowerCase().includes(lowercasedQuery) ||
                    item?.chalamt?.toLowerCase().includes(lowercasedQuery) ||
                    item?.noofchallan?.toLowerCase().includes(lowercasedQuery) ||
                    item?.pending?.toLowerCase().includes(lowercasedQuery) ||
                    item?.pendingamt?.toLowerCase().includes(lowercasedQuery),
            );

            const sorted2 = [...filtered].sort((a, b) => {
                const aAmt = parseFloat(a.pendingamt) || 0;
                const bAmt = parseFloat(b.pendingamt) || 0;

                return sortOrder2 === 'asc' ? aAmt - bAmt : bAmt - aAmt;
            });

            setFilteredPartyDetails(sorted2);
            //setFilteredPartyDetails(filtered);
        }
    }, [searchQueryPartyDetails, selectedPartyDetails, sortOrder2]);

    // Cache keys
    const CACHE_KEY_CONFIRM_ACTION = 'sales_order_tracking_confirm_action';
    const CACHE_KEY_CARD_PRESS = 'sales_order_tracking_card_press_';
    const CACHE_KEY_LAST_VIEWED = 'sales_order_tracking_last_viewed';
    const rowsPerPage = 20;

    // Open modal with design data
    const openDesignModal = (data: any, payload: any) => {
        setSelectedDesignData({
            designdetails: data.designdetails,
            design_summary: data.design_summary,
            payload,
        });
        setIsDesignModalVisible(true);
        setIsDrawerVisible(false);
    };

    // Close modal
    const closeDesignModal = () => {
        setIsDesignModalVisible(false);
        setIsDrawerVisible(false);
    };

    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

        // Financial year starts in April
        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2); // Return last two digits of the year
    };

    const fetchData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        // setIsLoading(true);
        try {
            const payload = {
                prpcode: 'SIP',
                yearno: selectedYear,
                strcode: '012',
                txntype: 'production_order_track',
                prptype: '',
                fetch: 'salesexe',
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/get_criterion`,
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        prpcode: 'SIP',
                        yearno: getCurrentFinancialYear(),
                        strcode: '012',
                        txntype: 'production_order_track',
                        prptype: '',
                        fetch: 'salesexe',
                    },
                }),
            );
            console.log('🔵 payload', payload, response);
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅ Data Sexe:', response.data.response.data);
                setExeData(response.data.response.data);
                // fetchDesign();
                fetchParty();
                // fetchItem();

                // setAllHistoryData([])
            } else {
                // setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', `Server error: ${error}`);
            }
        } finally {
            // setIsLoading(false);
        }
    };
    const fetchParty = async () => {
        console.log('🔵 payload PARTY', 'HI');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        const yearValue = selectedYear.split('-')[1].substring(2);
        // setIsLoading(true);
        try {
            console.log('🔵 payload PARTY', 'HI');
            // const payload = {
            //     prpcode: 'SIP',
            //     yearno: selectedYear,
            //     strcode: '012',
            //     txntype: 'production_order_track',
            //     prptype: '',
            //     fetch: 'salesexe'
            // };

            const payload = {
                prpcode: 'SIP',
                prptype: 'S',
                yearno: yearValue,
                strcode: '0',
                txntype: 'sales_order',
                partytype: 'p',
                type: 's',
                page: 1,
                limit: 20,
                search: '',
                isceo: 0,
                partype: 0,
                grntype: '',
                fetch: '',
                acccode: '',
                billdate: '',
                strtype: '',
                isfaint: '',
                user_id: 1,
            };
            console.log('🔵 payload PARTY', 'HI1');
            const response = await axios.get(
                `${API}/api/mobaccountbasic`,
                getRequestConfig({
                    params: payload,
                }),
            );
            console.log('🔵 payload PARTY', 'HI2');
            console.log('🔵 payload PARTY Payload', payload, response);
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅ Data Sexe:', response.data.response.data);
                setPartyData(response.data.response.data);
                fetchDesign();
                // fetchDesign();
                // fetchItem();

                // setAllHistoryData([])
            } else {
                // setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', `Server error: ${error}`);
            }
        } finally {
            // setIsLoading(false);
        }
    };

    const fetchDesign = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        // setIsLoading(true);
        try {
            const payload = {
                prpcode: 'SIP',
                yearno: getCurrentFinancialYear(),
                strcode: '012',
                itmcode: '',
                dsncode: '',
                shdcode: '',
                page: page + 1,
                limit: rowsPerPage,
                txntype: 'production_order_track',
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/getdesign`,
                `${API}/api/getitem`,
                getRequestConfig({
                    params: {
                        prpcode: 'SIP',
                        yearno: getCurrentFinancialYear(),
                        strcode: '012',
                        itmcode: '',
                        dsncode: '',
                        shdcode: '',
                        page: page + 1,
                        limit: rowsPerPage,
                        txntype: 'production_order_track',
                    },
                }),
            );
            console.log('🔵 design payload', payload, response);
            if (response.data.success) {
                console.log('✅ Data:', response.data.response.data);
                setDesignData(response.data.response.data);
                fetchItem();
                // setAllHistoryData([])
            } else {
                // setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', `Server error: ${error}`);
            }
        } finally {
            // setIsLoading(false);
        }
    };

    console.log('designData', designData);

    const fetchItem = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        // setIsLoading(true);
        try {
            const payload = {
                // prpcode: 'SIP',
                // yearno: getCurrentFinancialYear(),
                // strcode: '012',
                // itmcode: '',
                // dsncode: '',
                // shdcode: '',
                // page: page + 1,
                // limit: rowsPerPage,
                // fetch: 'itm',
                // txntype: 'production_order_track'
                prpcode: 'SIP',
                yearno: getCurrentFinancialYear(),
                strcode: '012',
                txntype: 'production_order_track',
                prptype: '',
                limit: 20,
                fetch: 'itm',
                itmcode: '',
                strcodes: '012',
                issdate: '',
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/get_criterion`,
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        prpcode: 'SIP',
                        yearno: getCurrentFinancialYear(),
                        strcode: '012',
                        txntype: 'production_order_track',
                        prptype: '',
                        limit: 20,
                        fetch: 'itm',
                        itmcode: '',
                        strcodes: '012',
                        issdate: '',
                    },
                }),
            );
            console.log('🔵 item payload', payload, response);
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅ Data:', response.data.response.data);
                setItemData(response.data.response.data);
                // setAllHistoryData([])
            } else {
                // setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', `Server error: ${error}`);
            }
        } finally {
            // setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        if (fromDate && delDate && selectedYear) {
            // fetchData();
            // fetchDesign();
            // fetchParty();
            fetchSalesExe();
        }
    }, [token]);
    // Save data to AsyncStorage
    const saveToCache = async (key: string, data: any) => {
        try {
            await AsyncStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to cache:', error);
        }
    };

    // Load data from AsyncStorage
    const loadFromCache = async (key: string) => {
        try {
            const data = await AsyncStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from cache:', error);
            return null;
        }
    };

    // Load last viewed from cache
    const loadLastViewedFromCache = async () => {
        try {
            return await AsyncStorage.getItem(CACHE_KEY_LAST_VIEWED);
        } catch (error) {
            console.error('Error loading last viewed from cache:', error);
            return null;
        }
    };

    // Save last viewed to cache
    const saveLastViewedToCache = async (parcode: string) => {
        try {
            await AsyncStorage.setItem(CACHE_KEY_LAST_VIEWED, parcode);
        } catch (error) {
            console.error('Error saving last viewed to cache:', error);
        }
    };

    // Load cached data on focus
    // useFocusEffect(
    //     useCallback(() => {
    //         const loadAllCachedData = async () => {
    //             const cachedConfirmAction = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
    //             const lastViewed = await loadLastViewedFromCache();
    //             if (cachedConfirmAction) {
    //                 setsalesdata(cachedConfirmAction.response.data.salesdata);
    //                 setsalesdataTotal(cachedConfirmAction.response.data.salesdata.length);
    //                 setsalessumdata(cachedConfirmAction.response.data.salessumdata);
    //             }
    //             setLastViewedParcode(lastViewed);
    //             setHasAutoScrolled(false);
    //         };
    //         loadAllCachedData();
    //     }, [])
    // );

    // Auto-scroll to last viewed only once and only if lastViewedParcode exists
    useEffect(() => {
        if (
            lastViewedParcode &&
            !hasAutoScrolled &&
            isListReady &&
            flatListRef.current &&
            (searchQueryPOT.trim()
                ? filteredData.length > 0
                : renderedData.length > 0)
        ) {
            const dataToUse = searchQueryPOT.trim() ? filteredData : renderedData;
            const index = dataToUse.findIndex(
                item => item.parcode === lastViewedParcode,
            );
            if (index !== -1) {
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index, animated: true });
                    setHasAutoScrolled(true);
                }, 300);
            }
        }
    }, [
        lastViewedParcode,
        filteredData,
        renderedData,
        searchQueryPOT,
        hasAutoScrolled,
        isListReady,
    ]);

    // useEffect(() => {
    //     if (!searchQueryPOT.trim()) {
    //         setFilteredData(salesdata); // Full data rakho
    //         setRenderedData(salesdata.slice(0, itemsPerPage)); // Paginate karo
    //         setPage(1);
    //     } else {
    //         const lowercasedQuery = searchQueryPOT.toLowerCase();
    //         const filtered = salesdata.filter(
    //             (item) =>
    //                 item?.partyname?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.parcode?.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.noof && item?.noof.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.totmtr && item?.totmtr.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.pendingmtr && item?.pendingmtr.toLowerCase().includes(lowercasedQuery) ||
    //                 item?.pendingamt && item?.pendingamt.toLowerCase().includes(lowercasedQuery)
    //         );
    //         setFilteredData(filtered); // Full filtered data rakho
    //         setRenderedData(filtered.slice(0, itemsPerPage)); // Paginate karo
    //         setPage(1);
    //     }
    // }, [searchQueryPOT, salesdata]);
    useEffect(() => {
        if (!searchQueryPOT.trim()) {
            const sorted = [...salesdata].sort((a, b) => {
                const aAmt = parseFloat(a.pendingamt) || 0;
                const bAmt = parseFloat(b.pendingamt) || 0;

                return sortOrder === 'asc' ? aAmt - bAmt : bAmt - aAmt;
            });
            setFilteredData(sorted);
            setRenderedData(sorted.slice(0, itemsPerPage));
            //setFilteredData(salesdata);
            //setRenderedData(salesdata.slice(0, itemsPerPage));

            setPage(1);
        } else {
            const query = searchQueryPOT.toLowerCase();

            // 🔹 Step 1: child (dsnData) filter karo
            const filteredChild = dsnData.filter(
                item =>
                    item?.pdsncode?.toLowerCase().includes(query) ||
                    item?.pdesign?.toLowerCase().includes(query) ||
                    item?.cdsncode?.toLowerCase().includes(query) ||
                    item?.cdesign?.toLowerCase().includes(query) ||
                    item?.parcode?.toLowerCase().includes(query) ||
                    item?.accname?.toLowerCase().includes(query) ||
                    item?.itmname?.toLowerCase().includes(query) ||
                    item?.itmcode?.toLowerCase().includes(query),
            );

            // 🔹 Step 2: unique parcode nikalo
            const uniqueParcodes = [...new Set(filteredChild.map(i => i.parcode))];

            // 🔹 Step 3: parent data filter karo (reverse filtering)
            // const finalFiltered = salesdata.filter(item =>
            //     uniqueParcodes.includes(item.parcode)
            // );
            const parcodeSet = new Set(uniqueParcodes);
            const finalFiltered = salesdata.filter(item =>
                parcodeSet.has(item.parcode),
            );

            const sortedFiltered = [...finalFiltered].sort((a, b) => {
                const aAmt = parseFloat(a.pendingamt) || 0;
                const bAmt = parseFloat(b.pendingamt) || 0;

                return sortOrder === 'asc' ? aAmt - bAmt : bAmt - aAmt;
            });

            setFilteredData(sortedFiltered);
            setRenderedData(sortedFiltered.slice(0, itemsPerPage));
            //setFilteredData(finalFiltered);
            //setRenderedData(finalFiltered.slice(0, itemsPerPage));
            setPage(1);
        }
    }, [searchQueryPOT, salesdata, dsnData, sortOrder]);

    // Lazy loading
    const loadMoreData = useCallback(() => {
        if (loading) return;

        const nextPage = page + 1;
        const startIndex = page * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;

        const sortedData = [...salesdata].sort((a, b) => {
            return sortOrder === 'asc'
                ? parseFloat(a.pendingamt) - parseFloat(b.pendingamt)
                : parseFloat(b.pendingamt) - parseFloat(a.pendingamt);
        });

        const dataToUse = searchQueryPOT.trim() ? filteredData : sortedData;
        // `salesdata` ya `filteredData` mein se data lelo
        //const dataToUse = searchQueryPOT.trim() ? filteredData : salesdata;

        if (startIndex < dataToUse.length) {
            setLoading(true);
            setTimeout(() => {
                // `renderedData` ko update karo
                setRenderedData(prev => [
                    ...prev,
                    ...dataToUse.slice(startIndex, endIndex),
                ]);
                setPage(nextPage);
                setLoading(false);
            }, 500);
        }
    }, [page, loading, searchQueryPOT, filteredData, salesdata]);

    // Get initials and color for party
    const getInitials = (name: string) =>
        name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 1);
    const getColorForInitial = (id: string) => {
        const colors = [
            '#2196F3',
            '#4CAF50',
            '#FF9800',
            '#9C27B0',
            '#00BCD4',
            '#3F51B5',
            '#757575',
            '#E91E63',
            '#FF5722',
            '#673AB7',
            '#009688',
            '#FFC107',
        ];
        return colors[parseInt(id) % colors.length];
    };

    // Set default dates
    useEffect(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setFromDate(firstDayOfMonth);
        // setDelDate(today);
    }, []);

    let cancelToken: any;

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    const formatDate = (rawDate: any) => {
        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || '';
        let year = rawDate.getFullYear() || '';
        return `${day}-${month}-${year}`;
    };

    const handleConfirmAction = async () => {
        console.log("selectedExe ----", selectedSalesExes)
        if (selectedItemStatus1 === 'Party Wise') {
            setIsLoading(true);
            setsalesdata([]);
            setsalessumdata([]);
            const yearValue = selectedYear.split('-')[1].substring(2);
            const dsnCodes = selectedDesigns.map(design => design.ItmCode);
            const partyCodes = selectedParty.map((item: any) => item.acccode);

            let seArr = []
            let seArrCntr = 0;
            selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

                seArr[seArrCntr] = el.sexe;
                seArrCntr++;

            })

            console.log('wise: ', selectedItemStatus1 === 'Party Wise'
                ? 'party'
                : selectedItemStatus1 === 'Design Wise'
                    ? 'design'
                    : '', selectedItemStatus1);

            const payload = {
                // fromdate: formatDate(fromDate),
                fromdate: '',
                deldate: formatDate(delDate),
                todate: '',
                yearno: yearValue,
                //sexes: selectedExe?.Code ? selectedExe?.Code : '0',
                sexes: seArr,
                type:
                    selectedItemStatus === 'All'
                        ? 'all'
                        : selectedItemStatus === 'Open'
                            ? 'open'
                            : selectedItemStatus === 'Closed'
                                ? 'closed'
                                : 'all',
                wise:
                    selectedItemStatus1 === 'Party Wise'
                        ? 'party'
                        : selectedItemStatus1 === 'Design Wise'
                            ? 'design'
                            : '',

                dsncodes: [],
                itemcodes: dsnCodes,
                parties: partyCodes,
                prptype: 'S',
                txntype: 'prodorderlist',
            };
            console.log('payload', payload);

            // Check cache first
            // const cachedData = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
            // if (cachedData && JSON.stringify(cachedData.payload) === JSON.stringify(payload)) {
            //     setsalesdata(cachedData.response.data.salesdata);
            //     setsalesdataTotal(cachedData.response.data.salesdata.length);
            //     setsalessumdata(cachedData.response.data.salessumdata);
            //     setIsLoading(false);
            //     closeDrawer();
            //     return;
            // }

            // If not in cache, proceed with API call
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            try {
                const response = await axios.post(
                    `${API}/api/salesordertracking`,
                    payload,
                    { headers },
                );
                const responsedsn = await axios.post(
                    `${API}/api/salesorderparentdesign`,
                    payload,
                    { headers },
                );
                console.log('🔵 responsedsn', payload, responsedsn);

                console.log('🔵 response', payload, response);
                // console.log("🔵 responsedsn", payload, responsedsn)
                if (
                    response.data.success === true &&
                    response.data.data.salesdata.length > 0
                ) {
                    setMainPayload(payload);
                    closeDrawer();
                    setsalesdata(response.data.data.salesdata);
                    setsalesdataTotal(response.data.data.salesdata.length);
                    setsalessumdata(response.data.data.salessumdata);
                    // await saveToCache(CACHE_KEY_CONFIRM_ACTION, { payload, response: response.data });
                } else if (response.data.success === false) {
                    Alert.alert(`${response.data.message}`);
                    setsalesdata([]);
                    setsalessumdata([]);
                } else {
                    Alert.alert('No Data Found!');
                    setsalesdata([]);
                    setsalessumdata([]);
                }
                if (responsedsn?.data?.data) {
                    setDsnData(responsedsn.data.data);
                }
                console.log('🔵 responsedsn hiii');
            } catch (error) {
                Alert.alert('Error', `Server error: ${error?.message}`);
                setsalesdata([]);
                setsalessumdata([]);
            } finally {
                setIsLoading(false);
                // closeDrawer();
            }
        } else {
            handleCardPressforDesignDirect();
        }
    };

    const handleCardPressforDesign = async (partyData: Party) => {
        // setDData(partyData);
        const cacheKey = `${CACHE_KEY_CARD_PRESS}${partyData.parcode}`;
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        setTrackingLoader(true);
        try {
            const yearValue = selectedYear.split('-')[1].substring(2);
            const dsnCodes = selectedDesigns.map(design => design.DsnCode);

            let seArr = []
            let seArrCntr = 0;
            selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

                seArr[seArrCntr] = el.sexe;
                seArrCntr++;

            })
            console.log('wise: ', selectedItemStatus1 === 'Party Wise'
                ? 'party'
                : selectedItemStatus1 === 'Design Wise'
                    ? 'design'
                    : '', selectedItemStatus1);

            const payload = {
                // fromdate: formatDate(fromDate),
                fromdate: '',
                // todate: formatDate(delDate),
                todate: '',
                deldate: formatDate(delDate),
                yearno: yearValue,
                //sexes: selectedExe?.Code ? selectedExe?.Code : '0',
                sexes: seArr,
                type:
                    selectedItemStatus === 'All'
                        ? 'all'
                        : selectedItemStatus === 'Open'
                            ? 'open'
                            : selectedItemStatus === 'Closed'
                                ? 'closed'
                                : 'all',
                wise:
                    selectedItemStatus1 === 'Party Wise'
                        ? 'party'
                        : selectedItemStatus1 === 'Design Wise'
                            ? 'design'
                            : '',
                dsncodes: dsnCodes,
                itemcodes: getMainPayload.itemcodes || [],
                parcode: partyData.parcode,
                prptype: 'S',
                txntype: 'prodorderlist',
            };
            const response = await axios.post(
                `${API}/api/salesorderdesigntracking`,
                payload,
                { headers },
            );
            const responsedes = await axios.post(
                `${API}/api/salesorderparentdesignmaster`,
                payload,
                { headers },
            );
            console.log('🔵 responsedd design', payload, response);
            console.log('🔵 responsedd child design', payload, responsedes);
            if (response.data.success) {
                if (response.data.data.designdetails.length > 0) {
                    setDData(partyData);
                    openDesignModal(response.data.data, payload);
                } else {
                    Alert.alert('No Data Found!');
                }
            }
            if (responsedes?.data?.data) {
                setDesignChildData(responsedes.data.data);
            }

            // if (response.data.success === true) {
            //     await AsyncStorage.setItem('parties_tracking_details', JSON.stringify(response.data.data));
            //     await AsyncStorage.setItem('parties_tracking_details_challan_payload', JSON.stringify(payload));
            //     await AsyncStorage.setItem('parties_tracking_details_party_name', partyData.partyname);
            //     await saveLastViewedToCache(partyData.parcode);
            //     setLastViewedParcode(partyData.parcode);
            //     navigation.navigate('SOPartyDetails', { party: partyData.partyname });
            // }
        } catch (error) {
            console.error('Error in handleCardPress:', error);
            Alert.alert('Error', 'Failed to process party details');
        } finally {
            setTrackingLoader(false);
        }
    };

    const handleCardPressforDesignDirect = async () => {
        setsalesdata([]);
        setsalessumdata([]);
        const partyCodes = selectedParty.map((item: any) => item.acccode);
        // setDData(partyData);
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        setIsLoading(true);
        try {
            const yearValue = selectedYear.split('-')[1].substring(2);
            const dsnCodes = selectedDesigns.map(design => design.ItmCode);

            let seArr = []
            let seArrCntr = 0;
            selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

                seArr[seArrCntr] = el.sexe;
                seArrCntr++;

            })

            console.log('wise: ', selectedItemStatus1 === 'Party Wise'
                ? 'party'
                : selectedItemStatus1 === 'Design Wise'
                    ? 'design'
                    : '', selectedItemStatus1);


            const payload = {
                // fromdate: formatDate(fromDate),
                fromdate: '',
                // todate: formatDate(delDate),
                todate: '',
                deldate: formatDate(delDate),
                yearno: yearValue,
                sexes: selectedExe?.Code ? selectedExe?.Code : '0',
                type:
                    selectedItemStatus === 'All'
                        ? 'all'
                        : selectedItemStatus === 'Open'
                            ? 'open'
                            : selectedItemStatus === 'Closed'
                                ? 'closed'
                                : 'all',
                wise:
                    selectedItemStatus1 === 'Party Wise'
                        ? 'party'
                        : selectedItemStatus1 === 'Design Wise'
                            ? 'design'
                            : '',
                dsncodes: [],
                itemcodes: dsnCodes,
                parcode: '',
                parties: partyCodes,
                prptype: 'S',
                txntype: 'prodorderlist',
                sexes: seArr,
            };
            console.log('payload', payload);
            const response = await axios.post(
                `${API}/api/salesorderdesigntracking`,
                payload,
                { headers },
            );
            const responsedes = await axios.post(
                `${API}/api/salesorderparentdesignmaster`,
                payload,
                { headers },
            );
            console.log('🔵 responsedd direct design', payload, response);
            console.log('🔵 responsedd direct child design', payload, responsedes);

            if (response.data.success) {
                setMainPayload(payload);
                setDData(null);
                openDesignModal(response.data.data, payload);
            }
            if (responsedes?.data?.data) {
                setDesignChildData(responsedes.data.data);
            }
        } catch (error) {
            console.error('Error in handleCardPress:', error);
            Alert.alert('Error', 'Failed to process party details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCardSubDesignPress = async (
        getDData?: any,
        parname,
        customPayload?: any,
        item?: any,
        isall = false,
    ) => {
        console.log(
            '🔵 payload PARTY',
            getDData || '',
            parname || '',
            customPayload || '',
            item || '',
        );
        console.log("Main Paylaod:", getMainPayload);
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        setTrackingLoader(true);
        if (isall) {
            setisALL(true);
        } else {
            setisALL(false);
        }


        let seArr = []
        let seArrCntr = 0;
        selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

            seArr[seArrCntr] = el.sexe;
            seArrCntr++;

        })

        const payload = {
            // fromdate: formatDate(fromDate),
            fromdate: '',
            // deldate: formatDate(customPayload.delDate),
            deldate: customPayload.deldate,
            // todate: formatDate(delDate),
            todate: '',
            yearno: selectedYear.split('-')[1].substring(2),
            //sexes: selectedExe?.Code ? selectedExe?.Code : '0',
            sexes: seArr,
            type:
                selectedItemStatus === 'All'
                    ? 'all'
                    : selectedItemStatus === 'Open'
                        ? 'open'
                        : selectedItemStatus === 'Closed'
                            ? 'closed'
                            : 'all',
            wise:
                selectedItemStatus1 === 'Party Wise'
                    ? 'party'
                    : selectedItemStatus1 === 'Design Wise'
                        ? 'design'
                        : '',
            dsncodes: customPayload.dsncodes,
            itemcodes: getMainPayload.itemcodes || [],
            uid: item?.muid ? item?.muid : '',
            mdsncode: item?.mdsncode ? item?.mdsncode : '',
            parcode: customPayload.parcode,
            prptype: 'S',
            txntype: 'prodorderlist',
        };
        try {
            const response = await axios.post(
                `${API}/api/salesordersubdesigntracking`,
                payload,
                { headers },
            );
            console.log('🔵 response subdesign ddddd', response, payload);
            console.log('🔵 response subdesign ddddd', response.data.data, payload);
            if (response.data.success) {
                // await AsyncStorage.setItem('parties_tracking_details', JSON.stringify(response.data.data));
                // await AsyncStorage.setItem('parties_tracking_details_challan_payload', JSON.stringify(payload));
                // await AsyncStorage.setItem('parties_tracking_details_party_name', parname.parname);
                // await saveLastViewedToCache(getDData.parcode);
                // setLastViewedParcode(getDData.parcode);
                // navigation.navigate('SOPartyDetails', { party: parname.parname });
                setTrackingLoader(false);
                setSelectedPartyDetails({
                    designdetails: response.data.data.designdetails,
                    design_summary: response.data.data.design_summary,
                    payload: payload,
                });
                setIsPartyDetailsModalVisible(true);
            }
        } catch (error) {
            console.error('Error in handleCardPress:', error);
            Alert.alert('Error', 'Failed to process party details');
        } finally {
            setTrackingLoader(false);
        }
    };
    const handleCardPress = async (
        getDData?: any,
        parname,
        dsnname,
        customPayload?: any,
        item?: any,
    ) => {
        console.log(
            '🔵 payload subdesign Clicked PARTY',
            getDData,
            parname,
            dsnname,
            customPayload,
            item,
        );
        let seArr = []
        let seArrCntr = 0;
        selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

            seArr[seArrCntr] = el.sexe;
            seArrCntr++;

        })
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        setTrackingLoader(true);
        try {
            const payload = {
                // fromdate: formatDate(fromDate),
                fromdate: '',
                deldate: customPayload.deldate,
                // todate: formatDate(delDate),
                todate: '',
                yearno: selectedYear.split('-')[1].substring(2),
                // sexes: selectedExe?.Code ? selectedExe?.Code : '0',
                sexes: seArr,
                type:
                    selectedItemStatus === 'All'
                        ? 'all'
                        : selectedItemStatus === 'Open'
                            ? 'open'
                            : selectedItemStatus === 'Closed'
                                ? 'closed'
                                : 'all',
                wise:
                    selectedItemStatus1 === 'Party Wise'
                        ? 'party'
                        : selectedItemStatus1 === 'Design Wise'
                            ? 'design'
                            : '',
                dsncodes: item?.dsncode ? [item?.dsncode] : [],
                itemcodes: getMainPayload.itemcodes || [],
                uid: item?.suid ? item?.suid : '',
                mdsncode: item?.mdsncode ? item?.mdsncode : '',
                parcode: getDData?.parcode,
                prptype: 'S',
                txntype: 'prodorderlist',
            };
            const response = await axios.post(
                `${API}/api/salesorderpartytracking`,
                payload,
                { headers },
            );
            console.log('🔵 response ddddd', response, payload);
            if (response.data.success) {
                await AsyncStorage.setItem(
                    'parties_tracking_details',
                    JSON.stringify(response.data.data),
                );
                await AsyncStorage.setItem(
                    'parties_tracking_details_challan_payload',
                    JSON.stringify(payload),
                );
                await AsyncStorage.setItem(
                    'parties_tracking_details_party_name',
                    selectedItemStatus1 === 'Design Wise'
                        ? dsnname.dsnname
                        : parname.parname,
                );
                // await AsyncStorage.setItem('parties_tracking_details_sub_design_name', dsnname.dsnname);
                await saveLastViewedToCache(getDData.parcode);
                setLastViewedParcode(getDData.parcode);
                console.log('🔵 customPayload: ', customPayload);

                router.push({
                    pathname: '/SOPartyDetails',
                    params: {
                        party: selectedItemStatus1 === 'Design Wise'
                            ? dsnname.dsnname
                            : parname.parname,
                        selectedSalesExes: seArr
                    }
                });
            }
        } catch (error) {
            console.error('Error in handleCardPress:', error);
            Alert.alert('Error', 'Failed to process party details');
        } finally {
            setTrackingLoader(false);
        }
    };

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    const renderPartyCard = ({ item }: { item: Party }) => (
        <TouchableOpacity
            style={[
                styles.partyCard,
                lastViewedParcode === item.parcode && styles.recentlyViewedCard,
            ]}
            // onPress={() => handleCardPress(item)}
            onPress={() => handleCardPressforDesign(item)}
        >
            <View style={styles.partyHeader}>
                <View
                    style={[
                        styles.partyAvatar,
                        { backgroundColor: getColorForInitial(item.parcode) },
                    ]}
                >
                    {getTrackingLoader ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text style={styles.partyAvatarText}>
                            {getInitials(item.partyname)}
                        </Text>
                    )}
                </View>
                <View style={styles.partyInfo}>
                    <Text style={styles.partyName}>{item.partyname}</Text>
                    <View style={styles.partyOrdersContainer}>
                        <Text style={styles.partyOrdersText}>{item.noof} orders</Text>
                    </View>
                </View>
                <Icon
                    name="chevron-right"
                    size={24}
                    color="#999"
                    style={styles.chevronIcon}
                />
            </View>
            <View style={styles.partyValues}>
                <View style={styles.valueRow}>
                    <View style={styles.valueItem}>
                        <Text style={styles.valueLabel}>Total Meter:</Text>
                        <Text style={styles.valueText}>{formatNumber(item.totmtr)}</Text>
                    </View>
                    <View style={styles.valueItem}>
                        <Text style={[styles.valueLabel, { color: '#E65100' }]}>
                            Pending Meter:
                        </Text>
                        <Text style={[styles.valueText, { color: '#E65100' }]}>
                            {formatNumber(item.pendingmtr)}
                        </Text>
                    </View>
                </View>
                <View style={styles.valueRow}>
                    <View style={styles.valueItem}>
                        <Text style={styles.valueLabel}>Amount:</Text>
                        <Text style={styles.valueText}>{formatValue(item.amount)}</Text>
                    </View>
                    <View style={styles.valueItem}>
                        <Text style={[styles.valueLabel, { color: '#4CAF50' }]}>
                            Pending Amount:
                        </Text>
                        <Text style={[styles.valueText, { color: '#4CAF50' }]}>
                            {formatValue(item.pendingamt)}
                        </Text>
                    </View>
                </View>
            </View>
            {lastViewedParcode === item.parcode && (
                <View style={styles.recentlyViewedBadge}>
                    <Text style={styles.recentlyViewedText}>Recently Viewed</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!loading) return null;
        return (
            <ActivityIndicator
                style={styles.loadingIndicator}
                size="large"
                color={theme.BRAND_GRADIENT_END}
            />
        );
    };

    const fetchSalesExe = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        console.log("fetchSalesExe function :", userPtype)

        if (cancelToken?.cancel) cancelToken.cancel();

        cancelToken = axios.CancelToken.source();

        try {

            let pload = {
                prptype: userPtype,
                yearno: getCurrentFinancialYear()
            };

            console.log("payload : ", pload);
            console.log("url :", `${API}/api/getsexes`)

            const response = await axios.get(
                `${API}/api/getsexes`,
                getRequestConfig({
                    params: pload,
                }),
            );

            console.log("response :", response)
            console.log("response1 :", response.data)
            console.log("response2 :", response.data.data)

            if (response.data.success) {
                console.log('✅ getsexex API response:', response.data.data);

                setSalesExeData(response.data.data);
                // fetchDesign();
                fetchParty();

            } else {

                setSalesExeData([]);

            }

        } catch (error) {
            if (!axios.isCancel(error)) {

                Alert.alert('Error', `Server error: ${error.message}`);
            }
        }
    };

    return (
        <>
            {getTrackingLoader && <FullScreenLoader />}
            <HeaderBar
                userName={username}
                placeholder="Search sales order..."
                onSearch={setSearchQueryPOT}
            />
            <TouchableOpacity style={styles.listIconContainer} onPress={openDrawer}>
                <Icon name="list" size={24} color="white" />
            </TouchableOpacity>
            <CustomDrawer
                isVisible={isDrawerVisible}
                onClose={closeDrawer}
                fromDate={fromDate}
                delDate={delDate}
                selectedYear={selectedYear}
                onFromDateChange={setFromDate}
                onToDateChange={setDelDate}
                onYearChange={setSelectedYear}
                onLoadPress={handleConfirmAction}
                exeData={salesExeData}
                onExeChange={setSelectedExe}
                selectedExe={selectedExe?.SalesExecutive || 'Select Executive'}
                designData={designData}
                getPartyData={getPartyData}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                onDesignSelect={setSelectedDesigns}
                onItemSelectItem={setSelectedItems}
                onItemSelectParty={setSelectedParty}
                selectedDesigns={selectedDesigns}
                setSelectedDesigns={setSelectedDesigns}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                itemData={itemData}
                selectedItemStatus={selectedItemStatus}
                selectedItemStatus1={selectedItemStatus1}
                onItemStatusChange={setSelectedItemStatus}
                onItemStatusChange1={setSelectedItemStatus1}
                setSelectedParty={setSelectedParty}
                selectedParty={selectedParty}
                yearOptions={yearOptions}
                setSelectedSalesExes={setSelectedSalesExes}
                selectedSalesExes={selectedSalesExes}
                onSalesExeSelect={setSelectedSalesExes}
            //salesExeData={salesExeData}
            />
            {salessumdata.length > 0 ? (
                <View style={styles.container}>
                    <View style={styles.summaryContainer}>
                        <View style={[styles.summaryBox, { backgroundColor: '#E3F2FD' }]}>
                            <Text style={styles.summaryLabel}>Total Orders</Text>
                            <Text style={styles.summaryValue}>
                                {formatNumber(salessumdata[0]?.noof || '0')}
                            </Text>
                        </View>
                        <View style={[styles.summaryBox, { backgroundColor: '#E8F5E8' }]}>
                            <Text style={styles.summaryLabel}>Total Meter</Text>
                            <Text style={styles.summaryValue}>
                                {formatNumber(salessumdata[0]?.totmtr || '0')}
                            </Text>
                            <Text style={[styles.summaryLabel, { marginTop: 5 }]}>
                                Amount
                            </Text>
                            <Text style={styles.summaryValue}>
                                {formatValue(salessumdata[0]?.amount || '0')}
                            </Text>
                        </View>
                        <View style={[styles.summaryBox, { backgroundColor: '#FFF3E0' }]}>
                            <Text style={styles.summaryLabel}>Pending Meter</Text>
                            <Text style={[styles.summaryValue, { color: '#E65100' }]}>
                                {salessumdata[0]?.pendingmtr || '0'}
                            </Text>
                            <Text style={[styles.summaryLabel, { marginTop: 5 }]}>
                                Pending Amount
                            </Text>
                            <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                                {formatValue(salessumdata[0]?.pendingamt || '0')}
                            </Text>
                        </View>
                    </View>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Text style={styles.sectionTitle}>
                            PARTIES (
                            {searchQueryPOT.trim()
                                ? filteredData.length
                                : (renderedData && renderedData.length) || '0'}
                            )
                        </Text>
                        <Text style={styles.sectionTitle}>
                            ALL PARTIES ({salesdataTotal || '0'})
                        </Text>
                    </View>
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Text style={styles.sectionTitle}></Text>
                        <TouchableOpacity
                            onPress={toggleSortOrder}
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                        >
                            <Icon
                                name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                                size={12}
                                color="#333"
                            />
                            <Text style={{ fontSize: 12, color: '#333', marginLeft: 4 }}>
                                Sort by Pending Amt.
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        ref={flatListRef}
                        data={renderedData} // <-- Yahan `renderedData` use karo
                        renderItem={renderPartyCard}
                        keyExtractor={(item, index) => `${item.parcode}-${index}`}
                        onEndReached={loadMoreData}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={renderFooter}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            !isLoading ? (
                                <View style={crlimtreq_styles.emptyContainer}>
                                    <Text style={crlimtreq_styles.emptyText}>
                                        No request data found!
                                    </Text>
                                </View>
                            ) : null
                        }
                        extraData={lastViewedParcode}
                        onContentSizeChange={() => setIsListReady(true)}
                    />
                </View>
            ) : (
                <>
                    <View style={crlimtreq_styles.emptyContainer}>
                        <Text style={crlimtreq_styles.emptyText}>No data found!</Text>
                    </View>
                </>
            )}
            {isDesignModalVisible && (
                <View style={styles.detailOverlay123}>
                    <View style={styles.detailContainer}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Main Design Summary</Text>
                                <TouchableOpacity onPress={closeDesignModal}>
                                    <Icon name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                            {getTrackingLoader ? (
                                <ActivityIndicator
                                    style={{ marginBottom: 10 }}
                                    size={24}
                                    color={theme.BRAND_GRADIENT_END}
                                />
                            ) : (
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search designs..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            )}
                            {selectedDesignData?.design_summary.map((summary, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={
                                        selectedItemStatus1 === 'Design Wise'
                                            ? styles.summaryCard123
                                            : styles.summaryCard
                                    }
                                    onPress={() => {
                                        // handleCardPress(getDData, { parname: selectedDesignData?.designdetails[0].partyname }, selectedDesignData?.payload);
                                        handleCardSubDesignPress(
                                            getDData,
                                            { parname: selectedDesignData?.designdetails[0].partyname },
                                            selectedDesignData?.payload,
                                        );
                                        setisALL(true);
                                    }}
                                >
                                    {selectedItemStatus1 === 'Design Wise' ? null : (
                                        <Text style={styles.partyNameInSummary}>
                                            Party: {selectedDesignData?.designdetails[0]?.partyname || ''}
                                        </Text>
                                    )}
                                    {selectedItemStatus1 === 'Design Wise' ? (
                                        <>
                                            <View style={styles.summaryContainer}>
                                                <View
                                                    style={[
                                                        styles.summaryBox,
                                                        { backgroundColor: '#E3F2FD' },
                                                    ]}
                                                >
                                                    <Text style={styles.summaryLabel}>Total Orders</Text>
                                                    <Text style={styles.summaryValue}>
                                                        {formatNumber(summary?.noofchallan || '0')}
                                                    </Text>
                                                </View>
                                                <View
                                                    style={[
                                                        styles.summaryBox,
                                                        { backgroundColor: '#E8F5E8' },
                                                    ]}
                                                >
                                                    <Text style={styles.summaryLabel}>Total Meter</Text>
                                                    <Text style={styles.summaryValue}>
                                                        {formatNumber(summary.totmtr)}
                                                    </Text>
                                                    <Text style={[styles.summaryLabel, { marginTop: 5 }]}>
                                                        Total Amount
                                                    </Text>
                                                    <Text style={styles.summaryValue}>
                                                        {formatValue(summary.totamt)}
                                                    </Text>
                                                </View>
                                                <View
                                                    style={[
                                                        styles.summaryBox,
                                                        { backgroundColor: '#FFF3E0' },
                                                    ]}
                                                >
                                                    <Text style={styles.summaryLabel}>Pending Meter</Text>
                                                    <Text style={[styles.summaryValue, { color: '#E65100' }]}>
                                                        {formatNumber(summary.pending)}
                                                    </Text>
                                                    <Text style={[styles.summaryLabel, { marginTop: 5 }]}>
                                                        Pending Amount
                                                    </Text>
                                                    <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                                                        {formatValue(summary.pendingamt)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Total Meter:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {formatNumber(summary.totmtr)}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Total Amount:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {formatValue(summary.totamt)}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Challan Qty:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {formatNumber(summary.chalqty)}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Pending Meter:</Text>
                                                <Text style={[styles.summaryValue, { color: '#E65100' }]}>
                                                    {formatNumber(summary.pending)}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Pending Amount:</Text>
                                                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                                                    {formatValue(summary.pendingamt)}
                                                </Text>
                                            </View>
                                        </>
                                    )}

                                    {/*  */}
                                </TouchableOpacity>
                            ))}
                            {/* <Text style={styles.sectionTitle}>Main Item Details</Text> */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={styles.sectionTitle}>Main Design Details</Text>
                                <TouchableOpacity
                                    onPress={toggleSortOrder1}
                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                >
                                    <Icon
                                        name={sortOrder1 === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                                        size={12}
                                        color="#333"
                                    />
                                    <Text style={{ fontSize: 12, color: '#333', marginLeft: 4 }}>
                                        Sort by Pending Amt.
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={filteredDesignDetails.slice(
                                    0,
                                    designPage * designItemsPerPage,
                                )}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.designCard}
                                        onPress={() => {
                                            const payload = {
                                                ...selectedDesignData!.payload,
                                                dsncodes: [item.dsncode],
                                                itemcodes: [item.dsncode],
                                            };
                                            // handleCardPress(getDData, { parname: item.partyname }, payload);
                                            handleCardSubDesignPress(
                                                getDData,
                                                { parname: item.partyname },
                                                payload,
                                                item,
                                            );
                                            setisALL(false);
                                        }}
                                    >
                                        <View style={styles.designHeader}>
                                            <Text style={styles.designName}>{item.Dsnname}</Text>
                                            <Text style={styles.designCode}>{item.dsncode}</Text>
                                        </View>
                                        {/* 👇 ADD THIS */}
                                        {/* <TouchableOpacity
                                            style={styles.jobChartBtn}
                                            onPress={(e) => {
                                                openJobChart(item);
                                            }}
                                        >
                                            <Icon name="receipt-long" size={14} color={theme.BRAND_GRADIENT_END} />
                                            <Text style={styles.jobChartBtnText}>Job Chart</Text>
                                        </TouchableOpacity> */}
                                        <View style={styles.designValues}>
                                            <View style={styles.valueRow}>
                                                <View style={styles.valueItem}>
                                                    <Text style={styles.valueLabel}>Total Meter:</Text>
                                                    <Text style={styles.valueText}>
                                                        {formatNumber(item.totmtr)}
                                                    </Text>
                                                </View>
                                                <View style={styles.valueItem}>
                                                    <Text style={[styles.valueLabel, { color: '#E65100' }]}>
                                                        Pending Meter:
                                                    </Text>
                                                    <Text style={[styles.valueText, { color: '#E65100' }]}>
                                                        {formatNumber(item.pending)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.valueRow}>
                                                <View style={styles.valueItem}>
                                                    <Text style={styles.valueLabel}>Total Amount:</Text>
                                                    <Text style={styles.valueText}>
                                                        {formatValue(item.totamt)}
                                                    </Text>
                                                </View>
                                                <View style={styles.valueItem}>
                                                    <Text style={[styles.valueLabel, { color: '#4CAF50' }]}>
                                                        Pending Amount:
                                                    </Text>
                                                    <Text style={[styles.valueText, { color: '#4CAF50' }]}>
                                                        {formatValue(item.pendingamt)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                keyExtractor={(item, index) => `${item.dsncode}-${index}`}
                                onEndReached={loadMoreDesignDetails}
                                onEndReachedThreshold={0.5}
                                ListFooterComponent={
                                    designPage * designItemsPerPage < filteredDesignDetails.length ? (
                                        <ActivityIndicator
                                            size="large"
                                            color={theme.BRAND_GRADIENT_END}
                                        />
                                    ) : null
                                }
                            />
                        </View>
                    </View>
                </View>
            )}

            {/*  */}
            {isPartyDetailsModalVisible && (
                <View style={styles.detailOverlay456}>
                    <View style={styles.detailContainer}>
                        <View style={styles.modalContainer}>
                            {!isAll ? (
                                <>
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>Sub Design Summary</Text>
                                        <TouchableOpacity
                                            onPress={() => setIsPartyDetailsModalVisible(false)}
                                        >
                                            <Icon name="close" size={24} color="#333" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Search Input */}
                                    {getTrackingLoader ? (
                                        <ActivityIndicator
                                            style={{ marginBottom: 10 }}
                                            size={24}
                                            color={theme.BRAND_GRADIENT_END}
                                        />
                                    ) : (
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search sub design details..."
                                            value={searchQueryPartyDetails}
                                            onChangeText={setSearchQueryPartyDetails}
                                        />
                                    )}
                                    {selectedPartyDetails?.design_summary.map((summary, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.summaryCard}
                                            onPress={() => {
                                                // handleCardPress(getDData, { parname: selectedPartyDetails?.designdetails[0].partyname }, selectedPartyDetails?.payload);
                                                // handleCardSubDesignPress(getDData, { parname: selectedPartyDetails?.designdetails[0].partyname }, selectedPartyDetails?.payload);
                                                handleCardPress(
                                                    selectedPartyDetails?.payload,
                                                    {
                                                        parname:
                                                            selectedPartyDetails?.designdetails[0].partyname,
                                                    },
                                                    { dsnname: 'All Items' },
                                                    selectedPartyDetails?.payload,
                                                    summary,
                                                );
                                            }}
                                        >
                                            {selectedItemStatus1 === 'Design Wise' ? null : (
                                                <Text style={styles.partyNameInSummary}>
                                                    Party:{' '}
                                                    {selectedPartyDetails?.designdetails[0]?.partyname || ''}
                                                </Text>
                                            )}

                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Total Meter:</Text>
                                                <Text style={styles.summaryValue}>{summary.totmtr}</Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Total Amount:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {formatValue(summary.totamt)}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Challan Qty:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {formatNumber(summary.chalqty)}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Pending Meter:</Text>
                                                <Text style={[styles.summaryValue, { color: '#E65100' }]}>
                                                    {formatNumber(summary.pending)}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Pending Amount:</Text>
                                                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                                                    {formatValue(summary.pendingamt)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            ) : (
                                <View>
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>Sub Design Summary</Text>
                                        <TouchableOpacity
                                            onPress={() => setIsPartyDetailsModalVisible(false)}
                                        >
                                            <Icon name="close" size={24} color="#333" />
                                        </TouchableOpacity>
                                    </View>
                                    {getTrackingLoader ? (
                                        <ActivityIndicator
                                            style={{ marginBottom: 10 }}
                                            size={24}
                                            color={theme.BRAND_GRADIENT_END}
                                        />
                                    ) : (
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search sub design details..."
                                            value={searchQueryPartyDetails}
                                            onChangeText={setSearchQueryPartyDetails}
                                        />
                                    )}
                                </View>
                            )}
                            {/* Party Details List */}
                            {/* <FlatList
                        data={filteredPartyDetails}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.partyDetailCard}
                                onPress={() => {
                                    const payload = {
                                        deldate: item.delDate || selectedDesignData?.payload.deldate,
                                        uid: item.uid,
                                        mdsncode: item.dsncode,
                                        parcode: item.parcode,
                                        prptype: 'S',
                                        txntype: 'prodorderlist',
                                    };
                                    handleCardPress(selectedDesignData?.payload, { parname: item.partyname }, payload, item);
                                }}
                            >
                                <Text style={styles.partyDetailName}>{item.partyname}</Text>
                                <Text style={styles.partyDetailCode}>Design: {item.Dsnname}</Text>
                                <Text style={styles.partyDetailMeter}>Meter: {item.totmtr}</Text>
                                <Text style={[
                                    styles.partyDetailStatus,
                                    { color: item.status === 'CLOSED' ? '#4CAF50' : '#E65100' }
                                ]}>Status: {item.status}</Text>
                            </TouchableOpacity>
                        )}
                        keyExtractor={(item, index) => `${item.uid}-${index}`}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No party details found!</Text>
                            </View>
                        }
                    /> */}
                            {/* <Text style={styles.sectionTitle}>Sub Design Details</Text> */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={styles.sectionTitle}>Sub Design Details</Text>
                                <TouchableOpacity
                                    onPress={toggleSortOrder2}
                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                >
                                    <Icon
                                        name={sortOrder2 === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                                        size={12}
                                        color="#333"
                                    />
                                    <Text style={{ fontSize: 12, color: '#333', marginLeft: 4 }}>
                                        Sort by Pending Amt.
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={filteredPartyDetails.slice(
                                    0,
                                    subdesignPage * subdesignItemsPerPage,
                                )}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.designCard}
                                        onPress={() => {
                                            const payload = {
                                                ...selectedPartyDetails!.payload,
                                                dsncodes: [item.dsncode],
                                                itemcodes: [item.dsncode],
                                            };
                                            // handleCardPress(getDData, { parname: item.partyname }, payload);
                                            // handleCardSubDesignPress(getDData, { parname: item.partyname }, payload, item);
                                            handleCardPress(
                                                selectedPartyDetails?.payload,
                                                { parname: item.partyname },
                                                { dsnname: item.Dsnname },
                                                payload,
                                                item,
                                            );
                                        }}
                                    >
                                        <View style={styles.designHeader}>
                                            <Text style={styles.designName}>{item.Dsnname}</Text>
                                            <Text style={styles.designCode}>{item.dsncode}</Text>
                                        </View>
                                        <View style={styles.designSubheader}>
                                            <Text style={styles.designNameSub}>Shade: {item.shdname} ({item.shdcode})</Text>
                                        </View>

                                        <View style={styles.designValues}>
                                            <View style={styles.valueRow}>
                                                <View style={styles.valueItem}>
                                                    <Text style={styles.valueLabel}>Total Meter:</Text>
                                                    <Text style={styles.valueText}>
                                                        {formatNumber(item.totmtr)}
                                                    </Text>
                                                </View>
                                                <View style={styles.valueItem}>
                                                    <Text style={[styles.valueLabel, { color: '#E65100' }]}>
                                                        Pending Meter:
                                                    </Text>
                                                    <Text style={[styles.valueText, { color: '#E65100' }]}>
                                                        {formatNumber(item.pending)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.valueRow}>
                                                <View style={styles.valueItem}>
                                                    <Text style={styles.valueLabel}>Total Amount:</Text>
                                                    <Text style={styles.valueText}>
                                                        {formatValue(item.totamt)}
                                                    </Text>
                                                </View>
                                                <View style={styles.valueItem}>
                                                    <Text style={[styles.valueLabel, { color: '#4CAF50' }]}>
                                                        Pending Amount:
                                                    </Text>
                                                    <Text style={[styles.valueText, { color: '#4CAF50' }]}>
                                                        {formatValue(item.pendingamt)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.valueRow}>
                                                <View style={styles.valueItem}>
                                                    <Text style={styles.valueLabel}>So No:</Text>
                                                    <Text style={styles.valueText}>{item.sono}</Text>
                                                </View>
                                                <View style={styles.valueItem}>
                                                    <Text style={[styles.valueLabel]}>So Date:</Text>
                                                    <Text style={[styles.valueText]}>{item.sodate}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.designSubheader}>
                                            <View
                                                style={[
                                                    styles.jobChartBtn,
                                                    {
                                                        backgroundColor:
                                                            item.status === 'CLOSED'
                                                                ? '#FFEBEE'
                                                                : item.status === 'PENDING'
                                                                    ? '#FFF3E0'
                                                                    : item.status === 'PARTIAL'
                                                                        ? '#E8F5E8'
                                                                        : 'transparent',
                                                    }
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.jobChartBtnText,
                                                        {
                                                            color:
                                                                item.status === 'CLOSED'
                                                                    ? '#E65100'
                                                                    : item.status === 'PENDING'
                                                                        ? '#E65100'
                                                                        : item.status === 'PARTIAL'
                                                                            ? '#4CAF50'
                                                                            : theme.BRAND_GRADIENT_END,
                                                        }
                                                    ]}
                                                >
                                                    {item.status}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.jobChartBtn}
                                                onPress={(e) => {
                                                    openJobChart(item);
                                                }}
                                            >
                                                <Icon name="receipt-long" size={14} color={theme.BRAND_GRADIENT_END} />
                                                <Text style={styles.jobChartBtnText}>Job Chart</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                keyExtractor={(item, index) => `${item.dsncode}-${index}`}
                                onEndReached={loadMoreSubDesignDetails}
                                onEndReachedThreshold={0.5}
                                ListFooterComponent={
                                    subdesignPage * subdesignItemsPerPage <
                                        filteredPartyDetails.length ? (
                                        <ActivityIndicator
                                            size="large"
                                            color={theme.BRAND_GRADIENT_END}
                                        />
                                    ) : null
                                }
                            />
                        </View>
                    </View>
                </View>
            )}

            {/* JOB CHART MODAL */}
            {/* JOB CHART — FULL SCREEN */}
            {jobChartVisible && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.jobChartFullOverlay}
                >
                    {/* HEADER */}
                    <View style={styles.jobChartFullHeader}>
                        <TouchableOpacity
                            onPress={() => setJobChartVisible(false)}
                            style={styles.jobChartBackBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.jobChartFullTitle}>Job Chart</Text>
                            <Text style={styles.jobChartFullSubtitle} numberOfLines={1}>
                                {jobChartRef?.dsnName} ({jobChartRef?.dsnCode})
                            </Text>
                        </View>
                        <View style={styles.jobChartDateBadge}>
                            <Icon name="event" size={12} color="#fff" />
                            <Text style={styles.jobChartDateBadgeText}>
                                {formatAllocDate(getTodayDateStr())}
                            </Text>
                        </View>
                    </View>

                    {jobChartLoading ? (
                        <ActivityIndicator size="large" color={theme.BRAND_GRADIENT_END} style={{ marginTop: 40 }} />
                    ) : (
                        <>
                            <FlatList
                                data={[]}
                                keyExtractor={() => 'x'}
                                renderItem={null}
                                style={{ flex: 1 }}
                                contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                                ListHeaderComponent={
                                    <>
                                        {/* REF CARD */}
                                        <View style={styles.jobChartRefCard}>
                                            <View style={styles.jobChartRefRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.jobChartRefLabel}>SO NO</Text>
                                                    <Text style={styles.jobChartRefValue}>{jobChartRef?.sono || '-'}</Text>
                                                </View>
                                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                                    <Text style={styles.jobChartRefLabel}>STATUS</Text>
                                                    <Text
                                                        style={[
                                                            styles.jobChartRefValue,
                                                            { color: jobChartRef?.status === 'CLOSED' ? '#E65100' : '#4CAF50' },
                                                        ]}
                                                    >
                                                        {jobChartRef?.status || 'OPEN'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.jobChartProgressWrap}>
                                                <View style={styles.jobChartProgressRow}>
                                                    <Text style={styles.jobChartRefLabel}>PENDING METER</Text>
                                                    <Text style={styles.jobChartPendingValue}>
                                                        {formatNumber(String(jobChartRef?.pendingMeter || 0))} m
                                                    </Text>
                                                </View>
                                                <View style={styles.progressBarBg}>
                                                    <View
                                                        style={[
                                                            styles.progressBarFill,
                                                            {
                                                                width: `${Math.min(
                                                                    100,
                                                                    ((getTotalAllocatedQty()) /
                                                                        Math.max(jobChartRef?.pendingMeter || 1, 1)) *
                                                                    100,
                                                                )}%`,
                                                                backgroundColor:
                                                                    getTotalAllocatedQty() > (jobChartRef?.pendingMeter || 0)
                                                                        ? '#E53935'
                                                                        : theme.BRAND_GRADIENT_END,
                                                            },
                                                        ]}
                                                    />
                                                </View>
                                                <View style={styles.jobChartProgressRow}>
                                                    <Text style={styles.jobChartAllocatedText}>
                                                        Allocated: {formatNumber(String(getTotalAllocatedQty()))} m
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.jobChartAllocatedText,
                                                            {
                                                                color:
                                                                    (jobChartRef?.pendingMeter || 0) - getTotalAllocatedQty() < 0
                                                                        ? '#E53935'
                                                                        : '#4CAF50',
                                                                fontWeight: 'bold',
                                                            },
                                                        ]}
                                                    >
                                                        Remaining: {formatNumber(String(Math.max((jobChartRef?.pendingMeter || 0) - getTotalAllocatedQty(), 0)))} m
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {!canEditAllocation() && (
                                            <View style={styles.jobChartLockBanner}>
                                                <Icon name="lock" size={16} color="#E65100" />
                                                <Text style={styles.jobChartLockBannerText}>
                                                    {jobChartRef?.status === 'CLOSED'
                                                        ? 'This design is closed — view only.'
                                                        : jobChartRef?.pendingMeter <= 0
                                                            ? 'No pending meter left — view only.'
                                                            : 'APC not matched — view only.'}
                                                </Text>
                                            </View>
                                        )}

                                        {/* ===== GROUP: NEW / UNSAVED ===== */}
                                        {allocations.filter(a => !a.LastDate).length > 0 && (
                                            <View style={styles.groupBlockNew}>
                                                <View style={styles.groupHeader}>
                                                    <View style={[styles.groupDot, { backgroundColor: '#2196F3' }]} />
                                                    <Text style={styles.groupTitle}>New (Not Saved)</Text>
                                                    <Text style={styles.groupCount}>
                                                        {allocations.filter(a => !a.LastDate).length}
                                                    </Text>
                                                </View>
                                                {allocations
                                                    .map((a, idx) => ({ ...a, __idx: idx }))
                                                    .filter(a => !a.LastDate)
                                                    .map(item => (
                                                        <View key={`new-${item.__idx}`} style={styles.allocRowCard}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.allocRowName}>{item.ShdName?.trim()}</Text>
                                                                <Text style={styles.allocRowCode}>Code: {item.ShdCode}</Text>
                                                            </View>
                                                            <Text style={styles.allocRowQty}>
                                                                {formatNumber(String(item.AllocationQty))} m
                                                            </Text>
                                                            {canEditAllocation() && (
                                                                <TouchableOpacity
                                                                    onPress={() => handleRemoveAllocationRow(item.__idx)}
                                                                    style={styles.allocRowRemoveBtn}
                                                                >
                                                                    <Icon name="close" size={16} color="#E65100" />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                    ))}
                                                <View style={styles.groupTotal}>
                                                    <Text style={styles.groupTotalLabel}>Total:</Text>
                                                    <Text style={styles.groupTotalValue}>
                                                        {formatNumber(
                                                            String(
                                                                allocations
                                                                    .filter(a => !a.LastDate)
                                                                    .reduce((sum, a) => sum + (parseFloat(a.AllocationQty) || 0), 0)
                                                            )
                                                        )} m
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* ===== GROUP: UPDATED TODAY ===== */}
                                        {allocations.filter(a => a.LastDate === getTodayDateStr()).length > 0 && (
                                            <View style={styles.groupBlockToday}>
                                                <View style={styles.groupHeader}>
                                                    <View style={[styles.groupDot, { backgroundColor: '#4CAF50' }]} />
                                                    <Text style={styles.groupTitle}>Updated Today ({formatAllocDate(getTodayDateStr())})</Text>
                                                    <Text style={styles.groupCount}>
                                                        {allocations.filter(a => a.LastDate === getTodayDateStr()).length}
                                                    </Text>
                                                </View>
                                                {allocations
                                                    .map((a, idx) => ({ ...a, __idx: idx }))
                                                    .filter(a => a.LastDate === getTodayDateStr())
                                                    .map(item => (
                                                        <View key={`today-${item.__idx}`} style={styles.allocRowCard}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.allocRowName}>{item.ShdName?.trim()}</Text>
                                                                <Text style={styles.allocRowCode}>Code: {item.ShdCode}</Text>
                                                            </View>
                                                            <Text style={styles.allocRowQty}>
                                                                {formatNumber(String(item.AllocationQty))} m
                                                            </Text>
                                                            {!item.IsLocked && canEditAllocation() && (
                                                                <TouchableOpacity
                                                                    onPress={() => handleRemoveAllocationRow(item.__idx)}
                                                                    style={styles.allocRowRemoveBtn}
                                                                >
                                                                    <Icon name="close" size={16} color="#E65100" />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                    ))}
                                                <View style={styles.groupTotal}>
                                                    <Text style={styles.groupTotalLabel}>Total:</Text>
                                                    <Text style={styles.groupTotalValue}>
                                                        {formatNumber(
                                                            String(
                                                                allocations
                                                                    .filter(a => a.LastDate === getTodayDateStr())
                                                                    .reduce((sum, a) => sum + (parseFloat(a.AllocationQty) || 0), 0)
                                                            )
                                                        )} m
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* ===== GROUP: PREVIOUS ALLOCATIONS (DATE-WISE) ===== */}
                                        {(() => {
                                            const today = getTodayDateStr();
                                            const withIdx = allocations.map((a, idx) => ({ ...a, __idx: idx }));
                                            const previous = withIdx.filter(a => a.LastDate && a.LastDate !== today);

                                            if (previous.length === 0) return null;

                                            const grouped = previous.reduce((acc, a) => {
                                                const date = a.LastDate;
                                                if (!acc[date]) acc[date] = [];
                                                acc[date].push(a);
                                                return acc;
                                            }, {} as Record<string, any[]>);

                                            // Sort dates (most recent first)
                                            const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

                                            return sortedDates.map(date => {
                                                const items = grouped[date];
                                                const totalQty = items.reduce((sum, a) => sum + parseFloat(a.AllocationQty || 0), 0);
                                                return (
                                                    <View key={date} style={styles.groupBlockPrevious}>
                                                        <View style={styles.groupHeader}>
                                                            <View style={[styles.groupDot, { backgroundColor: '#9E9E9E' }]} />
                                                            <Text style={styles.groupTitle}>Allocations – {formatAllocDate(date)}</Text>
                                                            <Text style={styles.groupCount}>{items.length}</Text>
                                                        </View>
                                                        {items.map(item => (
                                                            <View key={`prev-${date}-${item.__idx}`} style={styles.allocRowCard}>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={styles.allocRowName}>{item.ShdName?.trim()}</Text>
                                                                    <Text style={styles.allocRowCode}>Code: {item.ShdCode}</Text>
                                                                </View>
                                                                <Text style={styles.allocRowQty}>
                                                                    {formatNumber(String(item.AllocationQty))} m
                                                                </Text>
                                                                {!item.IsLocked && canEditAllocation() && (
                                                                    <TouchableOpacity
                                                                        onPress={() => handleRemoveAllocationRow(item.__idx)}
                                                                        style={styles.allocRowRemoveBtn}
                                                                    >
                                                                        <Icon name="close" size={16} color="#E65100" />
                                                                    </TouchableOpacity>
                                                                )}
                                                            </View>
                                                        ))}
                                                        <View style={styles.groupTotal}>
                                                            <Text style={styles.groupTotalLabel}>Total:</Text>
                                                            <Text style={styles.groupTotalValue}>{formatNumber(String(totalQty))} m</Text>
                                                        </View>
                                                    </View>
                                                );
                                            });
                                        })()}

                                        {allocations.length === 0 && (
                                            <Text style={styles.jobChartEmptyText}>No allocation added yet.</Text>
                                        )}

                                        <View style={styles.jobChartTotalRow}>
                                            <Text style={styles.jobChartTotalLabel}>TOTAL ALLOCATED</Text>
                                            <Text style={styles.jobChartTotalValue}>
                                                {formatNumber(getJobChartTotal())} m
                                            </Text>
                                        </View>
                                    </>
                                }
                            />

                            {/* BOTTOM ACTION AREA */}
                            {canEditAllocation() && (
                                <View style={styles.jobChartBottomBar}>
                                    <View style={styles.jobChartAddRow}>
                                        <TouchableOpacity
                                            style={[styles.searchInput, styles.shadeSelectBtn]}
                                            onPress={openShadePicker}
                                        >
                                            <Text
                                                style={selectedShade ? styles.shadeSelectText : styles.shadeSelectPlaceholder}
                                                numberOfLines={1}
                                            >
                                                {selectedShade ? selectedShade.Name : 'Tap to select shade'}
                                            </Text>
                                            <Icon name="search" size={18} color="#999" />
                                        </TouchableOpacity>
                                        <TextInput
                                            ref={qtyInputRef}
                                            style={[styles.searchInput, { width: 80, marginLeft: 8, marginBottom: 0 }]}
                                            placeholder="Qty"
                                            keyboardType="numeric"
                                            value={addQty}
                                            onChangeText={setAddQty}
                                            returnKeyType="done"
                                            onSubmitEditing={handleAddAllocationRow}
                                        />
                                        <TouchableOpacity style={styles.jobChartAddBtn} onPress={handleAddAllocationRow}>
                                            <Icon name="add" size={20} color="#fff" />
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.jobChartSaveBtn}
                                        onPress={handleSaveAllocations}
                                        disabled={jobChartSaving}
                                    >
                                        {jobChartSaving ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.jobChartSaveBtnText}>Save Allocation</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}

                    {/* SHADE PICKER — separate overlay above job chart, own keyboard space */}
                    {shadePickerVisible && (
                        <View style={styles.shadePickerOverlay}>
                            <View style={styles.shadePickerSheet}>
                                <View style={styles.jobChartHandle} />
                                <View style={styles.jobChartHeaderRow}>
                                    <Text style={styles.jobChartTitle}>Select Shade</Text>
                                    <TouchableOpacity onPress={() => setShadePickerVisible(false)}>
                                        <Icon name="close" size={22} color="#333" />
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search shade..."
                                    value={shadeQuery}
                                    autoFocus
                                    onChangeText={searchShades}
                                />

                                {shadeSearchLoading ? (
                                    <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} style={{ marginTop: 10 }} />
                                ) : (
                                    <FlatList
                                        data={shadeResults}
                                        keyExtractor={(s) => s.Code}
                                        keyboardShouldPersistTaps="handled"
                                        style={{ maxHeight: 320 }}
                                        renderItem={({ item: s }) => {
                                            const isUsed = allocations.some(a => String(a.ShdCode) === String(s.Code));
                                            return (
                                                <TouchableOpacity
                                                    style={[styles.shadePickerRow, isUsed && styles.shadePickerRowDisabled]}
                                                    onPress={() => {
                                                        if (isUsed) {
                                                            Alert.alert('Already Allocated', 'This shade is already in the list.');
                                                            return;
                                                        }
                                                        handleSelectShade(s);
                                                    }}
                                                >
                                                    <Text style={[styles.shadePickerRowText, isUsed && { color: '#bbb' }]}>
                                                        {s.Name}
                                                    </Text>
                                                    {isUsed && <Text style={styles.shadePickerUsedTag}>Added</Text>}
                                                </TouchableOpacity>
                                            );
                                        }}
                                        ListEmptyComponent={
                                            <Text style={{ color: '#999', textAlign: 'center', marginTop: 20 }}>
                                                No shades found.
                                            </Text>
                                        }
                                    />
                                )}
                            </View>
                        </View>
                    )}
                </KeyboardAvoidingView>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    listIconContainer: {
        position: 'absolute',
        top: 130,
        right: 20,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        borderRadius: 3,
        padding: 4,
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
    //
    modalContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    summaryCard123: {
        shadowOffset: { width: 0, height: 2 },
    },
    summaryCard: {
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
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    designCard: {
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
    designHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    designSubheader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    designName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    designCode: {
        fontSize: 12,
        color: '#666',
    },
    designNameSub: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    designCodeSub: {
        fontSize: 12,
        color: '#666',
    },
    partyNameInSummary: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },

    searchInput: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
        backgroundColor: '#fff',
        color: '#000',
    },
    designValues: {
        marginTop: 8,
    },
    designValueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    designValueItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    designValueLabel: {
        fontSize: 12,
        color: '#666',
        marginRight: 4,
    },
    designValueText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    partyDetailCard: {
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
    partyDetailName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    partyDetailCode: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    partyDetailMeter: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4,
    },
    partyDetailStatus: {
        fontSize: 14,
        // color: item.status === 'CLOSED' ? '#4CAF50' : '#E65100',
        fontWeight: 'bold',
    },
    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
    detailOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
        zIndex: 100, // Higher than summary modal
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailOverlay123: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
        zIndex: 200, // Higher than summary modal
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailOverlay456: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
        zIndex: 300, // Higher than summary modal
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Detail Container
    detailContainer: {
        backgroundColor: '#fff',
        // padding: 20,
        paddingTop: 45,
        borderRadius: 10,
        width: '100%',
        height: '100%',
        elevation: 5, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    jobChartBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        borderWidth: 1,
        borderColor: theme.BRAND_GRADIENT_END,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginBottom: 8,
    },
    jobChartBtnText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    jobChartOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 500,
        justifyContent: 'flex-end',
    },
    jobChartSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        maxHeight: '85%',
    },
    jobChartHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#ddd',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 10,
    },
    jobChartHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    jobChartTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    jobChartRefCard: {
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
    },
    jobChartRefRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    jobChartRefLabel: {
        fontSize: 10,
        color: '#999',
        fontWeight: '600',
    },
    jobChartRefValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#E65100',
    },
    jobChartSectionLabel: {
        fontSize: 11,
        color: '#999',
        backgroundColor: '#f5f5f5',
        padding: 6,
        fontWeight: '600',
        marginBottom: 6,
    },
    jobChartRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    jobChartRowLabel: {
        fontSize: 13,
        color: '#333',
    },
    jobChartRowValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#333',
    },
    jobChartTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    jobChartTotalLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
    },
    jobChartTotalValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#E65100',
    },
    jobChartAddRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 8,
    },
    jobChartAddBtn: {
        backgroundColor: theme.BRAND_GRADIENT_END,
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    shadeDropdown: {
        position: 'absolute',
        top: 42,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        maxHeight: 180,
        zIndex: 999,
        elevation: 5,
    },
    shadeDropdownItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    jobChartHint: {
        fontSize: 11,
        color: '#999',
        textAlign: 'center',
        marginVertical: 8,
    },
    jobChartCopyBtn: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 8,
    },
    jobChartCopyBtnText: {
        color: '#333',
        fontWeight: '600',
    },
    jobChartSaveBtn: {
        backgroundColor: theme.BRAND_GRADIENT_END,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 50,
    },
    jobChartSaveBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    // 
    shadePickerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 999, // higher than jobChartOverlay's 500, sits on top of job chart sheet
        justifyContent: 'flex-end',
        height: '100%',
    },
    shadePickerSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        maxHeight: '80%',
        minHeight: '50%',
    },
    shadeSelectBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    shadeSelectText: {
        color: '#333',
        fontSize: 14,
        flex: 1,
        marginRight: 6,
    },
    shadeSelectPlaceholder: {
        color: '#999',
        fontSize: 14,
        flex: 1,
        marginRight: 6,
    },
    shadePickerRow: {
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    shadePickerRowText: {
        fontSize: 15,
        color: '#333',
    },
    // 
    // ===== FULL SCREEN JOB CHART =====
    jobChartFullOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f5f5f5',
        zIndex: 500,
    },
    jobChartFullHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 54,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    jobChartBackBtn: {
        marginRight: 10,
        padding: 4,
    },
    jobChartFullTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
    },
    jobChartFullSubtitle: {
        fontSize: 12,
        color: '#777',
        marginTop: 2,
    },
    jobChartDateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.BRAND_GRADIENT_END,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 6,
    },
    jobChartDateBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 4,
    },
    jobChartProgressWrap: {
        marginTop: 10,
    },
    jobChartProgressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    jobChartPendingValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#E65100',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#eee',
        borderRadius: 4,
        marginTop: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: 8,
        borderRadius: 4,
    },
    jobChartAllocatedText: {
        fontSize: 11,
        color: '#666',
    },
    jobChartLockBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    jobChartLockBannerText: {
        fontSize: 12,
        color: '#E65100',
        marginLeft: 6,
        flex: 1,
    },
    allocGroupSection: {
        marginBottom: 16,
    },
    allocGroupHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    allocGroupDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    allocGroupTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    allocGroupCount: {
        fontSize: 11,
        color: '#999',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
    allocRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        borderLeftWidth: 4,
        padding: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
    },
    allocRowName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    allocRowCode: {
        fontSize: 11,
        color: '#888',
        marginTop: 2,
    },
    allocRowQty: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 8,
    },
    allocRowRemoveBtn: {
        padding: 4,
    },
    jobChartEmptyText: {
        color: '#999',
        textAlign: 'center',
        paddingVertical: 20,
    },
    jobChartBottomBar: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    },
    shadePickerRowDisabled: {
        opacity: 0.5,
    },
    shadePickerUsedTag: {
        fontSize: 10,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    // Group block containers
    groupBlockNew: {
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    groupBlockToday: {
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    groupBlockPrevious: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    groupDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    groupTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    groupCount: {
        fontSize: 12,
        color: '#666',
        backgroundColor: 'rgba(0,0,0,0.08)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    groupTotal: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 8,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    groupTotalLabel: {
        fontSize: 12,
        color: '#666',
        marginRight: 6,
    },
    groupTotalValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#333',
    },
    // Update allocRowCard to remove left border (now handled by group blocks)
    allocRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
    },
});

export default React.memo(SalesOrderTracking);
