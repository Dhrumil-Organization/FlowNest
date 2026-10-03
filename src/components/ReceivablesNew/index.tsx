import AppAlert from '@/common/utils/appAlert';
import { API } from '@/common/API/dynamicAPI';
import { crlimtreq_styles } from '@/common/Style';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import {
    format,
} from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import qs from 'qs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import theme from '../theme';
import CustomDrawer from './CustomDrawer';
import { TableData } from './data';
import { CardPayload, DashAccount, DashParty, DashPrp, DashSexe, DashSubHead, DesignData, ExeData, InternalDropdown, ItemData, ItemStatus, POTData, ReceivablesDetails, ReceivablesPrpgroup, ReceivablesSummary } from './Modal';

interface Props {
    token: string;
    username?: string;
    duration?: number;
}

const Receivables: React.FC<Props> = ({ token, username }) => {
    console.log("Token received in Receivables:", token);
    const [isLoading, setIsLoading] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [getAccountLoading, setAccountLoading] = useState(false);
    const [getdashPartyLoading, setdashPartyLoading] = useState(false);
    const [getdashSubHeadLoading, setdashSubHeadLoading] = useState(false);
    const [getdashSexeLoading, setdashSexeLoading] = useState(false);
    const [getdashAccountLoading, setdashAccountLoading] = useState(false);
    const [getdashPropertyLoading, setdashPropertyLoading] = useState(false);
    const [searchQueryPOT, setSearchQueryPOT] = useState('');
    const [searchQueryPOTCard, setSearchQueryPOTCard] = useState('');
    const [searchQueryPOTDetails, setSearchQueryPOTDetail] = useState('');
    const [receivables_sync_date, setreceivables_sync_date] = useState('');
    const [receivables_prpgroup, setreceivables_prpgroup] = useState<ReceivablesPrpgroup[]>([]);
    const [getOutCardData, setOutCardData] = useState([]);
    const [getOutDetails, setOutDetails] = useState<ReceivablesDetails[]>([]);
    const [getOutSummary, setOutSummary] = useState<ReceivablesSummary[]>([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [getCardData, setCardData] = useState(TableData);
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
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
    const [selectedPrpgrp, setSelectedPrpGrp] = useState<ReceivablesPrpgroup | "">("");
    const [selectedInternal, setSelectedInternal] = useState<InternalDropdown | "">("");
    // const [selectedInternal, setSelectedInternal] = useState<string>('1');
    const [exeData, setExeData] = useState<ExeData[]>([]);
    const [designData, setDesignData] = useState<DesignData[]>([]);
    const [itemData, setItemData] = useState<ItemData[]>([]);
    const [page, setpage] = useState(0);
    const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([])
    const [selectedDashPrp, setSelectedDashPrp] = useState<DashPrp[]>([])
    const [selectedDashParty, setSelectedDashParty] = useState<DashParty[]>([])
    const [selectedDashSexe, setSelectedDashSexe] = useState<DashSexe[]>([])
    const [selectedDashAccount, setSelectedDashAccount] = useState<DashAccount[]>([])
    const [selectedDashSubHead, setSelectedDashSubHead] = useState<DashSubHead[]>([])
    const [selectedItems, setSelectedItems] = useState<ItemData[]>([])
    const [selectedItemStatus, setSelectedItemStatus] = useState<ItemStatus>('All');
    const [gePOTData, setPOTData] = useState<POTData[]>([])
    const [getpayload, setPayload] = useState<CardPayload[]>([])
    const [getUserRole, setUserRole] = useState([])
    const [getdashPrp, setdashPrp] = useState<DashPrp[]>([])
    const [getdashParty, setdashParty] = useState<DashParty[]>([])
    const [getdashSexe, setdashSexe] = useState<DashSexe[]>([])
    const [getdashAccount, setdashAccount] = useState<DashAccount[]>([])
    const [getdashSubHead, setdashSubHead] = useState<DashSubHead[]>([])
    const [scrollPosition] = useState(new Animated.Value(0));
    const [contentWidth, setContentWidth] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedAccCode, setSelectedAccCode] = useState(null);
    const [filteredData, setFilteredData] = useState([]);
    const [filteredDataDetails, setFilteredDataDetails] = useState([]);
    const [detailSearchQuery, setDetailSearchQuery] = useState('');
    const [filteredDetails, setFilteredDetails] = useState([]);
    const [visibleCards, setVisibleCards] = useState(5);
    const [visibleSummaryItems, setVisibleSummaryItems] = useState(5);
    const [visibleDetailItems, setVisibleDetailItems] = useState(5);
    const [expandedCards, setExpandedCards] = useState({});
    const [showLastSync, setShowLastSync] = useState(true);
    const [activeCard, setActiveCard] = useState(null);
    const [getActiveCardDetails, setActiveCardDetails] = useState(null);
    const [summaryDrawerVisible, setSummaryDrawerVisible] = useState(false);
    const [customerSummaryVisible, setCustomerSummaryVisible] = useState(false);
    const [selectedAgeingLabel, setSelectedAgeingLabel] = useState<string | null>(null);
    const [hideprpGroup, sethideprpGroup] = useState(false);
    const summaryVisibleRef = useRef(false);
    const searchRef = useRef(searchQueryPOT);
    const searchRefDetails = useRef(searchQueryPOTDetails);
    const ROW_HEIGHT = 52;
    console.log("ddd ray token:", token, API);

    useEffect(() => {
        const initializeRole = async () => {
            try {
                const role = await AsyncStorage.getItem('user_login_role');
                console.log('=== Role from AsyncStorage (Raw) ===', role);

                if (role) {
                    // Parse as JSON (since it's already an array string)
                    const rolesArray = JSON.parse(role);
                    console.log('=== Parsed as JSON ===', rolesArray);

                    // Check if the first element is a comma-separated string
                    let finalRoles = [];
                    if (rolesArray.length > 0 && typeof rolesArray[0] === 'string') {
                        // Split the first element by comma
                        finalRoles = rolesArray[0].split(',').map(r => r.trim());
                    } else {
                        // If not, use the array as-is
                        finalRoles = rolesArray.map(r => r.trim());
                    }

                    console.log('=== Final Roles Array ===', finalRoles);

                    // Check if "Receivables View Combine" exists
                    const hasReceivablesViewCombine = finalRoles.includes("Receivables View Combine");
                    console.log('=== Role check result ===', hasReceivablesViewCombine);

                    sethideprpGroup(hasReceivablesViewCombine);
                } else {
                    sethideprpGroup(false);
                    console.log('=== No role found in AsyncStorage ===');
                }
            } catch (error) {
                console.error("=== Error reading role from AsyncStorage ===", error);
                sethideprpGroup(false);
            }
        };

        initializeRole();
    }, []);


    useEffect(() => {
        summaryVisibleRef.current = summaryDrawerVisible;
    }, [summaryDrawerVisible]);


    // useEffect(() => {
    //     const timeout = setTimeout(() => {
    //         searchRef.current = searchQueryPOT;

    //         // const filtered = getCardData[0]?.data?.outsummary?.filter(item =>
    //         console.log('getOutSummary:', getOutSummary);
    //         const filtered = getOutSummary.filter(item =>
    //             Object.values(item).some(val =>
    //                 String(val).toLowerCase().includes(searchQueryPOT.toLowerCase())
    //             )
    //         );

    //         setFilteredData(filtered || []);
    //     }, 250); // 👈 debounce

    //     return () => clearTimeout(timeout);
    // }, [searchQueryPOT, getOutSummary]);
    useEffect(() => {
        const timeout = setTimeout(() => {
            searchRef.current = searchQueryPOT;

            // const filtered = getCardData[0]?.data?.outsummary?.filter(item =>
            console.log('getOutSummary:', getOutSummary);
            const filtered = getOutSummary.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchQueryPOT.toLowerCase())
                )
            );

            setFilteredData(filtered || []);
        }, 250); // 👈 debounce

        return () => clearTimeout(timeout);
    }, [searchQueryPOT, getOutSummary]);



    useEffect(() => {
        const filtered = getOutCardData.filter(item =>
            item.caption.toLowerCase().includes(searchQueryPOTCard.toLowerCase())
        );
        setFilteredCards(filtered);
    }, [searchQueryPOTCard, getOutCardData]);


    // For Internal Dropdown
    useEffect(() => {
        if (internal_dropdown.length > 0 && (!selectedInternal || selectedInternal === "")) {
            setSelectedInternal(internal_dropdown[1]);
        }
    }, [internal_dropdown, selectedInternal]);

    // For Property Group Dropdown
    useEffect(() => {
        if (receivables_prpgroup.length > 0 && (!selectedPrpgrp || selectedPrpgrp === "")) {
            setSelectedPrpGrp(receivables_prpgroup[0]);
        }
    }, [receivables_prpgroup, selectedPrpgrp]);


    console.log('getUserRole:', getUserRole);






    // useEffect(() => {
    //     const timeout = setTimeout(() => {
    //         searchRefDetails.current = searchQueryPOTDetails;

    //         const filteredDetails12 = getCardData[0]?.data?.outdetail?.filter(item =>
    //             Object.values(item).some(val =>
    //                 String(val).toLowerCase().includes(searchQueryPOTDetails.toLowerCase())
    //             )
    //         );

    //         setFilteredDetails(filteredDetails12 || []);
    //     }, 250); // 👈 debounce

    //     return () => clearTimeout(timeout);
    // }, [searchQueryPOTDetails]);

    // Filter details for modal
    // useEffect(() => {
    //     // const details = getCardData[0]?.data?.outdetail?.filter(
    //     const details = getOutDetails?.filter(
    //         (detail) => detail.AccCode === selectedAccCode
    //     );
    //     const filtered = details?.filter((item) =>
    //         Object.values(item).some((val) =>
    //             String(val).toLowerCase().includes(searchQueryPOTDetails.toLowerCase())
    //         )
    //     );
    //     setFilteredDetails(filtered?.slice(0, getOutDetails));
    // }, [searchQueryPOTDetails, selectedAccCode, visibleDetailItems, getOutDetails]);

    useEffect(() => {
        console.log('ddd:', selectedAccCode, getOutDetails);
        const details = getOutDetails?.filter(
            (detail) => detail.ACCCODE === selectedAccCode
        );
        const filtered = details?.filter((item) =>
            Object.values(item).some((val) =>
                String(val).toLowerCase().includes(searchQueryPOTDetails.toLowerCase())
            )
        );
        console.log('filtered:', filtered);
        setFilteredDetails(filtered || []);
    }, [searchQueryPOTDetails, selectedAccCode, getOutDetails]);



    // const onDashboardCardPress = (card) => {
    //     setActiveCard(card.slab);
    //     console.log('Card Pressed:', card);
    //     setActiveCardDetails(card);
    //     setSummaryDrawerVisible(true);
    // };

    const onDashboardCardPress = (card) => {
        setActiveCard(card.slab);
        setActiveCardDetails(card);
        // setSummaryDrawerVisible(true);

        // Pass the card's caption as CardName
        handleConfirmActionNew(
            selectedDashPrp,
            selectedDashParty,
            selectedDashSexe,
            selectedDashSubHead,
            selectedDashAccount,
            card?.caption,
            1, // <-- Pass caption as CardName
            card
        );
    };




    // Load more summary items
    const loadMoreSummaryItems = () => {
        setVisibleSummaryItems((prev) => prev + 5);
    };

    // Load more detail items
    const loadMoreDetailItems = () => {
        setVisibleDetailItems((prev) => prev + 5);
    };

    // Load more dashboard cards
    const loadMoreCards = () => {
        setVisibleCards((prev) => prev + 5);
    };

    // Generate unique key for table rows
    const generateUniqueKey = (prefix, index, item) => {
        return `${prefix}-${index}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const toggleCard = (slab) => {
        setExpandedCards(prev => ({
            ...prev,
            [slab]: !prev[slab]
        }));
    };

    const toggleLastSync = () => {
        setShowLastSync(!showLastSync);
    };



    const chacheData = async () => {
        if (!token) {
            console.error("Token is missing!");
            AppAlert.alert("Error", "User not authenticated. Please log in again.");
            return;
        }

        setSyncLoading(true);
        try {
            // const receivables_sync_date_from_cache = await AsyncStorage.getItem('receivables_sync_date');
            // const receivables_prpgroup_from_cache = await AsyncStorage.getItem('receivables_prpgroup');
            const response = await axios.get(`${API}/api/dashprpgrp`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { txntype: '/receivables-view' }
            });
            if (response.data.success === true) {
                console.log("yoyo", response);
                setSyncLoading(false);
                console.log('🔵 Sync API Response:', response.data.data?.dashlastsync, '🔵 Sync API Response Prpgroup:', response.data.data?.prpgroup);
                const receivables_sync_date_api = response.data.data?.dashlastsync || '';
                const receivables_prpgroup_api = response.data.data?.prpgroup || '';
                console.log('🔵 receivables_sync_date_api', receivables_sync_date_api, '🔵 receivables_prpgroup_api', receivables_prpgroup_api);

                setreceivables_sync_date(receivables_sync_date_api);
                setreceivables_prpgroup(receivables_prpgroup_api);
            }
            // const mastersyncData = await AsyncStorage.getItem('mastersyncData');

        } catch (error) {
            setSyncLoading(false);
            console.error("Token check error:", error);
        }
    };


    const dashProperty = useCallback(async (selectedPrpgrp) => {
        console.log("🔵 dashPrp API Response:", hideprpGroup);
        setdashPropertyLoading(true);
        try {
            const payload = {
                prptype: hideprpGroup === true ? 'R' : selectedPrpgrp?.PrpTypeCode,
                txntype: '/receivables-view'
            }
            // const receivables_sync_date_from_cache = await AsyncStorage.getItem('receivables_sync_date');
            // const receivables_prpgroup_from_cache = await AsyncStorage.getItem('receivables_prpgroup');
            const responseprp = await axios.get(
                `${API}/api/dashprp`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/javascript',
                        Accept: 'application/json'
                    },
                    params: {
                        ...payload
                    }
                }
            );
            if (responseprp.data.success === true) {
                setdashPropertyLoading(false);
                // setSyncLoading(false);
                console.log('🔵 dashPrp API Response:', payload, responseprp);
                const maindata = responseprp.data.data.prp;
                setdashPrp(maindata);
            }


        } catch (error) {
            setdashPropertyLoading(false);
            console.error("Token check error:", error);
        }
    }, [hideprpGroup, token, API]);

    const dashParty = useCallback(async (selectedPrpgrp) => {
        setdashPartyLoading(true);
        setdashSexeLoading(true);
        try {
            const payload = {
                prptype: hideprpGroup === true ? 'R' : selectedPrpgrp?.PrpTypeCode,
                fetch: 'dr',
                dashview: 'outstanding',
                txntype: '/receivables-view'
            }

            const payloadSexe = {
                prptype: hideprpGroup === true ? 'R' : selectedPrpgrp?.PrpTypeCode,
                dashview: 'outstanding',
                fetch: 'salesexe',
            }
            const responseparty = await axios.get(
                // 'https://apig.tms-webapp.com/api/get_criterion',
                `${API}/api/get_criterion`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/javascript',
                        Accept: 'application/json'
                    },
                    params: {
                        ...payload
                    }
                }
            );
            const responsesexe = await axios.get(
                `${API}/api/get_criterion`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/javascript',
                        Accept: 'application/json'
                    },
                    params: {
                        ...payloadSexe
                    }
                }
            );
            if (responseparty.data.success === true) {
                setdashPartyLoading(false);
                console.log('🔵 dashParty API Response:', payload, responseparty);
                const maindata = responseparty.data.response.data;
                setdashParty(maindata);
            }
            if (responsesexe.data.success === true) {
                setdashSexeLoading(false);
                console.log('🔵 dashSexe API Response:', payloadSexe, responsesexe);
                const maindataSexe = responsesexe.data.response.data;
                setdashSexe(maindataSexe);
            }
        } catch (error) {
            setdashPartyLoading(false);
            setdashSexeLoading(false);
            console.error("Token check error:", error);
        }
    }, [hideprpGroup]);

    const dashSubHead = useCallback(async (selectedPrpgrp, selectedDashPrp) => {
        setdashSubHeadLoading(true);
        console.log('🔵 selectedPrpgrp', selectedPrpgrp, '🔵 selectedDashPrp', selectedDashPrp);

        const payload = {
            prptype: hideprpGroup === true ? 'R' : selectedPrpgrp?.PrpTypeCode,
            dashview: 'outstanding',
            prpcodes: Array.isArray(selectedDashPrp)
                ? selectedDashPrp.map(item => item.PrpCode)
                : [],
        };
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            // const response = await axios.post(`https://apig.tms-webapp.com/api/get_dashoutshead`, payload, { headers });
            const response = await axios.post(`${API}/api/get_dashoutshead`, payload, { headers });
            if (response.data.success === true) {
                setdashSubHeadLoading(false);
                // AppAlert.alert('No Data Found');
                console.log('🔵 dashSubHead API Response:', payload, response);
                const maindata = response.data.data.data;
                setdashSubHead(maindata);

            }
        } catch (error) {
            setdashSubHeadLoading(false);
            // setIsLoading(false);
            // AppAlert.alert('Server Error');

        }


    }, [hideprpGroup]);



    // const dashAccount = useCallback(async (selectedPrpgrp, selectedInternal, selectedDashParty, selectedDashPrp, selectedDashSubHead, selectedDashSexe) => {
    const dashAccount = useCallback(async (selectedDashPrp, selectedDashParty, selectedDashSexe, selectedDashSubHead) => {
        setAccountLoading(true);
        console.log('🔵 🔵I am Calling1 dashAccount');
        console.log('🔵 selectedDashPrp', selectedDashPrp, '🔵 selectedDashParty', selectedDashParty, '🔵 selectedDashSexe', selectedDashSexe, '🔵 selectedDashSubHead', selectedDashSubHead, selectedPrpgrp, selectedInternal);
        if (
            !selectedPrpgrp ||
            !selectedInternal
        ) {
            console.log('⚠️ Required selections are missing. Skipping dashAccount call.');
            return;
        }
        const formatDate123 = (rawDate: any) => {
            let day = rawDate.getDate().toString().padStart(2, '0') || '';
            let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
            let year = rawDate.getFullYear() || '';
            return `${year}-${month}-${day}`;
        };
        // setAccountLoading(true);
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const fromdate = formatDate123(firstDayOfMonth);
        const todate = formatDate123(today);
        const prpCodesArray = selectedDashPrp?.map(item => item.PrpCode);
        const subHeadArray = selectedDashSubHead?.map(item => item.SHead);
        const sexeArray = selectedDashSexe?.map(item => item.Code);
        console.log('🔵 🔵I am Callin2 dashAccount');
        try {
            console.log('🔵 🔵I am Calling3 dashAccount');
            const payload = {
                prptype: hideprpGroup === true ? 'R' : selectedPrpgrp?.PrpTypeCode,
                prpcodes: prpCodesArray && prpCodesArray,
                sheadcodes: subHeadArray && subHeadArray,
                fetch: 'summary',
                dashstyle: '1',
                dashview: 'outstanding',
                fromdate: fromdate,
                todate: todate,
                for: 'sales',
                uom: '1',
                uomname: '',
                gridid: '0',
                gridgroup: '',
                showinternal: selectedInternal && selectedInternal?.value,
                storecode: '',
                stockdate: todate,
                ageing: '30',
                ageing2: '60',
                display: '1',
                export: 'Excel',
                salesexes: sexeArray ? sexeArray : [],
                dashparcode: selectedDashParty && selectedDashParty[0]?.ParCode,
                txntype: '/receivables-view'
            };

            // const response = await axios.get(
            //     'https://apig.tms-webapp.com/api/get_dashparty',
            //     {
            //         headers: {
            //             Authorization: `Bearer ${token}`,
            //             'Content-Type': 'application/javascript',
            //             Accept: 'application/json'
            //         },
            //         params: payload
            //     }
            // );

            // Use qs to stringify the payload
            const queryString = qs.stringify(payload, { arrayFormat: 'brackets' });

            // const response = await axios.get('https://apig.tms-webapp.com/api/get_dashparty', {
            const response = await axios.get(`${API}/api/get_dashparty`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                params: payload,
                paramsSerializer: params => qs.stringify(params, { arrayFormat: 'brackets' }),
            });
            console.log('🔵 🔵I am Calling4 dashAccount', payload, response);

            if (response.data.success == true) {
                setAccountLoading(false);
                console.log('🔵 dashAccount API Response:', response);
                setdashAccount(response.data.data.data);
                // Handle response data here
            }
        } catch (error) {
            setAccountLoading(false);
            console.error("Error in dashAccount:", error);
        } finally {
            setAccountLoading(false);
        }
    }, [selectedPrpgrp, selectedInternal, hideprpGroup]);



    useEffect(() => {
        // const unsubscribe = navigation.addListener('focus', () => {
        //     chacheData();
        // })
        const ddd = hideprpGroup === true ? 'R' : selectedPrpgrp;
        if (ddd) {
            dashProperty(ddd);
            dashParty(ddd);
        }
    }, [selectedPrpgrp, hideprpGroup]);
    useEffect(() => {
        const ddd = hideprpGroup === true ? 'R' : selectedPrpgrp;
        if (ddd) {
            dashSubHead(ddd, selectedDashPrp);
        }
    }, [selectedPrpgrp, selectedDashPrp]);

    console.log('🔵 receivables_sync_date', receivables_sync_date);
    console.log('🔵 receivables_prpgroup', receivables_prpgroup);

    useEffect(() => {
        if (contentWidth > 0 && containerWidth > 0) {
            Animated.loop(
                Animated.sequence([
                    // Scroll left to right (negative to positive)
                    Animated.timing(scrollPosition, {
                        toValue: containerWidth, // Scroll full container width
                        duration: 15000, // 15 seconds for full scroll
                        useNativeDriver: true,
                    }),
                    // Instant reset to start position
                    Animated.timing(scrollPosition, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
        // chacheData();

    }, [contentWidth, containerWidth]);

    useEffect(() => {
        if (!token) return;
        chacheData();

    }, [token]);





    const rowsPerPage = 20;

    // Set default dates
    useEffect(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setFromDate(firstDayOfMonth);
        setToDate(today);
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
                fetch: 'salesexe'
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/get_criterion`,
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        prpcode: 'SIP',
                        yearno: '26',
                        strcode: '012',
                        txntype: 'production_order_track',
                        prptype: '',
                        fetch: 'salesexe'
                    }
                })
            );
            console.log('🔵 payload', payload, response);
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅ Data Sexe:', response.data.response.data);
                setExeData(response.data.response.data);
                fetchDesign();
                // fetchItem();

                // setAllHistoryData([])
            } else {
                // setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', `Server error: ${error}`);
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
                yearno: '26',
                strcode: '012',
                itmcode: '',
                dsncode: '',
                shdcode: '',
                page: page + 1,
                limit: rowsPerPage,
                txntype: 'production_order_track'
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/getdesign`,
                `${API}/api/getdesign`,
                getRequestConfig({
                    params: {
                        prpcode: 'SIP',
                        yearno: '26',
                        strcode: '012',
                        itmcode: '',
                        dsncode: '',
                        shdcode: '',
                        page: page + 1,
                        limit: rowsPerPage,
                        txntype: 'production_order_track'
                    }
                })
            );
            console.log('🔵 design payload', payload, response);
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅ Data:', response.data.response.data);
                setDesignData(response.data.response.data);
                fetchItem();
                // setAllHistoryData([])
            } else {
                // setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', `Server error: ${error}`);
            }
        } finally {
            // setIsLoading(false);
        }
    };

    const fetchItem = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        // setIsLoading(true);
        try {
            const payload = {
                // prpcode: 'SIP',
                // yearno: '26',
                // strcode: '012',
                // itmcode: '',
                // dsncode: '',
                // shdcode: '',
                // page: page + 1,
                // limit: rowsPerPage,
                // fetch: 'itm',
                // txntype: 'production_order_track'
                prpcode: 'SIP',
                yearno: '26',
                strcode: '012',
                txntype: 'production_order_track',
                prptype: '',
                limit: 20,
                fetch: 'itm',
                itmcode: '',
                strcodes: '012',
                issdate: ''
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/get_criterion`,
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        prpcode: 'SIP',
                        yearno: '26',
                        strcode: '012',
                        txntype: 'production_order_track',
                        prptype: '',
                        limit: 20,
                        fetch: 'itm',
                        itmcode: '',
                        strcodes: '012',
                        issdate: ''
                    }
                })
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
                AppAlert.alert('Error', `Server error: ${error}`);
            }
        } finally {
            // setIsLoading(false);
        }
    };

    const getToken = () => {
        return token;
    };


    useEffect(() => {
        console.log('getOutSummary in SummaryTable:', getOutSummary);
    }, [getOutSummary]);


    const formatDate = (rawDate: any) => {
        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
        let year = rawDate.getFullYear() || '';
        return `${day}-${month}-${year}`;
    };

    const handleConfirmAction = useCallback(async (selectedDashPrp, selectedDashParty, selectedDashSexe, selectedDashSubHead, selectedDashAccount, CardName = '', isAcc = 0) => {
        setIsLoading(true);
        console.log('🔵 CardName:', CardName); // Debug log
        console.log('🔵 🔵I am Calling1 Table');
        console.log('🔵 selectedDashPrp', selectedDashPrp, '🔵 selectedDashParty', selectedDashParty, '🔵 selectedDashSexe', selectedDashSexe, '🔵 selectedDashSubHead', selectedDashSubHead, selectedPrpgrp, selectedInternal);
        if (
            !selectedPrpgrp ||
            !selectedInternal
        ) {
            console.log('⚠️ Required selections are missing. Skipping Table call.');
            return;
        }
        const formatDate123 = (rawDate: any) => {
            let day = rawDate.getDate().toString().padStart(2, '0') || '';
            let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
            let year = rawDate.getFullYear() || '';
            return `${year}-${month}-${day}`;
        };
        // setAccountLoading(true);
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const fromdate = formatDate123(firstDayOfMonth);
        const todate = formatDate123(today);
        const prpCodesArray = selectedDashPrp.map(item => item.PrpCode);
        const subHeadArray = selectedDashSubHead.map(item => item.SHead);
        const sexeArray = selectedDashSexe.map(item => item.Code);
        const accountArray = selectedDashAccount.map(item => item.AccCode);
        console.log('🔵 🔵I am Callin2 Table');
        const fdate = fromDate ? format(fromDate, 'yyyy-MM-dd') : null;
        const tdate = toDate ? format(toDate, 'yyyy-MM-dd') : null;
        try {
            console.log('🔵 🔵I am Calling3 Table');
            const payload = {
                CardName: CardName.toUpperCase(),
                prptype: hideprpGroup === true ? 'R' : selectedPrpgrp?.PrpTypeCode,
                accounts: accountArray ? accountArray : [],
                prpcodes: prpCodesArray && prpCodesArray,
                sheadcodes: subHeadArray && subHeadArray,
                fetch: 'summary',
                dashstyle: '1',
                dashview: 'outstanding',
                // fromdate: fromdate,
                fromdate: fdate,
                // todate: todate,
                todate: tdate,
                for: 'sales',
                uom: '1',
                uomname: '',
                gridid: '0',
                gridgroup: '',
                showinternal: selectedInternal && selectedInternal?.value,
                storecode: '',
                // stockdate: todate,
                stockdate: tdate,
                ageing: '30',
                ageing2: '60',
                display: '1',
                export: 'Excel',
                salesexes: sexeArray ? sexeArray : [],
                dashparcode: selectedDashParty && selectedDashParty[0]?.ParCode,
                txntype: '/receivables-view'
            };
            console.log('🔵 Table API Payload:', payload);
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            // const response = await axios.post(`https://apig.tms-webapp.com/api/dashdata`, payload, { headers });
            const response = await axios.post(`${API}/api/dashdata`, payload, { headers });
            console.log('🔵 🔵I am Calling4 Table', payload, response);
            const data = response.data.data?.dashoutcards || [];
            const data1 = response.data.data?.outdetail || [];
            console.log('🔵 ddd', data1);
            const data2 = response.data.data?.outsummary || [];


            if (response.data.success == true) {
                console.log('🔵 Table API Response:', response);
                if (data && data.length > 0 && data1 && data1.length > 0 && data2 && data2.length > 0) {
                    console.log('🔵 Table API Response: I am calles', response);
                    setIsDrawerVisible(false);
                    setIsLoading(false);
                    setOutCardData(data);
                    setOutDetails(data1);
                    setOutSummary(data2);
                    if (isAcc == 1) {
                        setSummaryDrawerVisible(true);
                    }
                } else {
                    setOutCardData([]);
                    setOutDetails([]);
                    setOutSummary([]);
                }


                // setdashAccount(response.data.data.data);
                // Handle response data here
            }
        } catch (error) {
            setIsLoading(false);
            console.error("Error in dashAccount:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedPrpgrp, selectedInternal, hideprpGroup, fromDate, toDate]);


    const handleConfirmActionNew = useCallback(async (selectedDashPrp, selectedDashParty, selectedDashSexe, selectedDashSubHead, selectedDashAccount, CardName = '', isAcc = 0, card) => {
        setIsLoading(true);
        console.log('🔵 CardName:', CardName); // Debug log
        console.log('🔵 🔵I am Calling1 Table');
        console.log('🔵 🔵 Selected Card', card);
        console.log('🔵 selectedDashPrp', selectedDashPrp, '🔵 selectedDashParty', selectedDashParty, '🔵 selectedDashSexe', selectedDashSexe, '🔵 selectedDashSubHead', selectedDashSubHead, selectedPrpgrp, selectedInternal);
        if (
            !selectedPrpgrp ||
            !selectedInternal
        ) {
            console.log('⚠️ Required selections are missing. Skipping Table call.');
            return;
        }
        const formatDate123 = (rawDate: any) => {
            let day = rawDate.getDate().toString().padStart(2, '0') || '';
            let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
            let year = rawDate.getFullYear() || '';
            return `${year}-${month}-${day}`;
        };
        // setAccountLoading(true);
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const fromdate = formatDate123(firstDayOfMonth);
        const todate = formatDate123(today);
        const prpCodesArray = selectedDashPrp.map(item => item.PrpCode);
        const subHeadArray = selectedDashSubHead.map(item => item.SHead);
        const sexeArray = selectedDashSexe.map(item => item.Code);
        const accountArray = selectedDashAccount.map(item => item.AccCode);
        console.log('🔵 🔵I am Callin2 Table');
        try {
            console.log('🔵 🔵I am Calling3 Table');
            const payload = {
                CardName: CardName.toUpperCase(),
                accounts: accountArray ? accountArray : [],
                prptype: hideprpGroup === true ? 'R' : selectedPrpgrp?.PrpTypeCode,
                prpcodes: prpCodesArray && prpCodesArray,
                sheadcodes: subHeadArray && subHeadArray,
                fetch: 'slabdetail',
                dashstyle: '1',
                dashview: 'outstanding',
                fromdate: fromdate,
                todate: todate,
                for: 'sales',
                uom: '1',
                uomname: '',
                gridid: 0,
                gridfilter: [],
                gridgroup: '',
                showinternal: selectedInternal && selectedInternal?.value,
                slab: [],
                storecode: '',
                stockdate: todate,
                ageing: 30,
                ageing2: 0,
                selecetedslab: card && [card],
                display: '1',
                export: 'Excel',
                salesexes: sexeArray ? sexeArray : [],
                dashparcode: selectedDashParty && selectedDashParty[0]?.ParCode || "",
                txntype: '/receivables-view'
            };
            console.log('🔵 Table API Payload:', payload);
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            // const response = await axios.post(`https://apig.tms-webapp.com/api/dashdata`, payload, { headers });
            const response = await axios.post(`${API}/api/dashdata`, payload, { headers });
            console.log('🔵 🔵I am Calling4 Table', payload, response);
            const data = response.data.data?.dashoutcards || [];
            const data1 = response.data.data?.outdetail || [];
            console.log('🔵 ddd', data1);
            const data2 = response.data.data?.outsummary || [];


            if (response.data.success == true) {
                console.log('🔵 Table API Response:', response);
                if (data && data.length > 0 && data1 && data1.length > 0 && data2 && data2.length > 0) {
                    setIsDrawerVisible(false);
                    setIsLoading(false);
                    setOutCardData(data);
                    setOutDetails(data1);
                    setOutSummary(data2);
                    // Use a callback to ensure state is updated before opening the modal
                    setIsLoading(false);
                    if (isAcc == 1) {
                        setSummaryDrawerVisible(true);
                    }
                } else {
                    setOutCardData([]);
                    setOutDetails([]);
                    setOutSummary([]);
                }


                // setdashAccount(response.data.data.data);
                // Handle response data here
            }
        } catch (error) {
            setIsLoading(false);
            console.error("Error in dashAccount:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedPrpgrp, selectedInternal, hideprpGroup]);

    useEffect(() => {
        if (fromDate && toDate && selectedYear) {
            fetchData();
            // fetchDesign();
        }
    }, []);

    const handleDashPrpSelect = (prp: DashPrp[]) => {
        setSelectedDashPrp(prp);
        console.log("Selected Dash Prp in Parent:", prp);
    };
    const handleDashPartySelect = (party: DashParty[]) => {
        setSelectedDashParty(party);
        console.log("Selected Dash Party in Parent:", party);
    };
    const handleDashSexeSelect = (sexe: DashSexe[]) => {
        setSelectedDashSexe(sexe);
        console.log("Selected Dash Sexe in Parent:", sexe);
    };
    const handleDashAccountSelect = (acc: DashAccount[]) => {
        setSelectedDashAccount(acc);
        console.log("Selected Dash Account in Parent:", acc);
    };
    const handleDashSubHeadSelect = (sub: DashSubHead[]) => {
        setSelectedDashSubHead(sub);
        console.log("Selected Dash SubHead in Parent:", sub);
    };
    const handleItemSelect = (items: ItemData[]) => {
        setSelectedItems(items);
        console.log("Selected Items in Parent:", items);
    };
    const handleItemStatusChange = (status: ItemStatus) => {
        setSelectedItemStatus(status);
    };
    const formatIndianNumber = (value: any) => {
        if (!value && value !== 0) return "0"; // Handle undefined/null

        // Remove all commas and convert to number
        const cleanedValue = typeof value === 'string' ? value.replace(/,/g, '') : value;
        const num = parseFloat(cleanedValue);

        if (isNaN(num)) return "0"; // Handle non-numeric values

        // Remove decimal part
        const integerValue = Math.floor(num);

        // Format in Indian number system
        return integerValue.toLocaleString('en-IN');
    };

    // ------------------------------------------------------------------
    // New UI (same look as Payable). Presentation only: every value still
    // comes from the existing Receivables API response fields.
    // The view helpers below are plain render functions (called as
    // `{SummaryCardList({...})}`), so they are not re-mounted on each render.
    // ------------------------------------------------------------------
    const toNumber = (value: any) => Number(String(value ?? 0).replace(/,/g, '')) || 0;

    const formatAmount = (value: any) => toNumber(value).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // TRANDATE comes as dd/MM/yyyy -> { day: '01', month: 'Jan' }
    const getDateBadge = (rawDate: any) => {
        const date = String(rawDate || '').trim();
        const parts = date.split(/[\/\-]/);
        if (parts.length >= 2 && !isNaN(parseInt(parts[1], 10))) {
            return { day: parts[0].padStart(2, '0'), month: MONTHS[(parseInt(parts[1], 10) - 1 + 12) % 12] };
        }
        return { day: date.slice(0, 2) || '--', month: 'DATE' };
    };

    const groupName = (customer: any) =>
        String(customer?.MHName || 'SUNDRY DEBTORS').replace(/^\d+\./, '').trim();

    // Soft card palette + icon per dashboard caption
    const getCardVisual = (caption: string = '') => {
        const key = caption.toLowerCase().trim();
        if (key.includes('advance')) return { icon: 'account-balance-wallet', iconBg: '#CFE1FF', iconColor: '#1454A4', text: '#174B9B', colors: ['#E8F1FF', '#D5E6FF'] };
        if (key.includes('limit')) return { icon: 'block', iconBg: '#FFD0D5', iconColor: '#C62828', text: '#B91C1C', colors: ['#FFE9EC', '#FFD4D9'] };
        if (key.includes('over')) return { icon: 'schedule', iconBg: '#FFD0D5', iconColor: '#C62828', text: '#B91C1C', colors: ['#FFE9EC', '#FFD4D9'] };
        if (key.includes('not due')) return { icon: 'description', iconBg: '#DED0FF', iconColor: '#59319B', text: '#3F287C', colors: ['#F0EAFE', '#E4D8FF'] };
        if (key.includes('due today')) return { icon: 'calendar-month', iconBg: '#C8EEE1', iconColor: '#08745D', text: '#08624F', colors: ['#E2F7EF', '#D0F0E4'] };
        if (key.includes('on account')) return { icon: 'monetization-on', iconBg: '#FFE0AE', iconColor: '#C56A08', text: '#B45309', colors: ['#FFF0DD', '#FFE3BE'] };
        if (key.includes('above')) return { icon: 'hourglass-bottom', iconBg: '#F9C9C9', iconColor: '#991B1B', text: '#7F1D1D', colors: ['#FDECEC', '#FAD7D7'] };
        if (/^\d+\s*-\s*\d+$/.test(key)) return { icon: 'date-range', iconBg: '#C9E6EF', iconColor: '#0E7490', text: '#0B5F75', colors: ['#E7F4F7', '#D3E9EE'] };
        return { icon: 'groups', iconBg: '#FFE0BD', iconColor: '#C85A08', text: '#A94309', colors: ['#FFF0DF', '#FFE1C2'] };
    };

    const DashboardGrid = ({ cards, onCardPress, activeSlab }) => {
        const numColumns = Platform.isPad ? 3 : 2;

        const renderItem = ({ item }) => {
            const isActive = activeSlab === item.slab;
            const isDisabled = parseFloat(String(item.summary ?? 0).replace(/,/g, '')) === 0; // Remove commas before checking
            const visual = getCardVisual(item.caption);

            return (
                <TouchableOpacity
                    activeOpacity={isDisabled ? 1 : 0.9}
                    onPress={isDisabled ? undefined : () => onCardPress(item)}
                    style={[styles.dashboardCard, isActive && styles.activeDashboardCard]}
                    disabled={isDisabled}
                >
                    <LinearGradient
                        colors={isActive ? ['#DCEBFF', '#C7DDFF'] : isDisabled ? ['#EEF1F5', '#E2E8F0'] : visual.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.dashboardCardInner}
                    >
                        <View style={styles.dashboardCardTopRow}>
                            <View style={[styles.dashboardIconCircle, { backgroundColor: visual.iconBg }]}>
                                <Icon name={visual.icon as any} size={27} color={visual.iconColor} />
                            </View>
                            <Icon name="chevron-right" size={27} color={visual.text} />
                        </View>
                        <View style={styles.dashboardTextBlock}>
                            <Text style={[styles.dashboardCaption, { color: visual.text }]} numberOfLines={1}>
                                {isActive && isLoading ? 'Loading...' : item.caption?.toUpperCase()}
                            </Text>
                            <Text style={[styles.dashboardValue, { color: visual.text }]} numberOfLines={1} adjustsFontSizeToFit>
                                ₹ {formatIndianNumber(item.summary)}
                            </Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            );
        };

        return (
            <FlatList
                data={cards}
                renderItem={renderItem}
                keyExtractor={(item) => item.slab}
                numColumns={numColumns}
                columnWrapperStyle={{ gap: 14 }}
                contentContainerStyle={{
                    paddingHorizontal: 14,
                    paddingVertical: 16,
                    rowGap: 14,
                }}
                showsVerticalScrollIndicator={false}
                style={styles.dashboardList}
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={crlimtreq_styles.emptyContainer}>
                            <Text style={crlimtreq_styles.emptyText}>No request data found!</Text>
                        </View>
                    ) : null
                }
            />
        );
    };

    // small coloured metric box used in cards
    const metric = (
        label: string,
        value: any,
        tone: 'blue' | 'orange' | 'green' | 'purple' | 'red' = 'blue',
        kind: 'money' | 'plain' | 'whole' = 'money',
    ) => (
        <View style={[styles.summaryMetric, styles[`summaryMetric_${tone}` as keyof typeof styles] as any]}>
            <Text style={styles.summaryMetricLabel}>{label}</Text>
            <Text style={styles.summaryMetricValue} numberOfLines={1}>
                {kind === 'plain' ? String(value ?? 0) : kind === 'whole' ? `₹ ${formatIndianNumber(value)}` : `₹ ${formatAmount(value)}`}
            </Text>
        </View>
    );

    // Party list (summary / advance / on account) shown as cards instead of the old wide table
    const SummaryCardList = ({ mode = 'summary' }: { mode?: 'summary' | 'advance' | 'onaccount' }) => {
        if (!filteredData?.length) {
            return <View style={styles.cardEmpty}><Text style={styles.cardEmptyText}>No summary data found</Text></View>;
        }

        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.summaryCardList}>
                {filteredData.map((item: any, index: number) => {
                    const salesExec = item.sename || item.sexename;
                    const metaLine = [salesExec ? `Sales Exec: ${salesExec}` : '', item.BrkName ? `Broker: ${item.BrkName}` : ''].filter(Boolean).join('  |  ');
                    const openCustomer = () => { setSelectedAccCode(item.AccCode); setCustomerSummaryVisible(true); };
                    return (
                        <TouchableOpacity key={`${item.AccCode || item.AccName || 'account'}-${index}`} style={styles.customerSummaryCard} activeOpacity={0.85} onPress={openCustomer}>
                            <View style={styles.customerCardTop}>
                                <View style={styles.customerAvatar}>
                                    <Text style={styles.customerAvatarText}>{String(item.AccName || 'A').trim().charAt(0).toUpperCase()}</Text>
                                </View>
                                <View style={styles.customerCardIdentity}>
                                    <Text style={styles.customerCardName} numberOfLines={2}>{item.AccName || 'Unnamed account'}</Text>
                                    <Text style={styles.customerCardMeta}>Code: {item.AccCode || '-'}</Text>
                                </View>
                                <TouchableOpacity style={styles.customerInfoButton} onPress={openCustomer}>
                                    <Icon name="info-outline" size={20} color={theme.BRAND_GRADIENT_END} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.summaryMetricsGrid}>
                                {mode === 'advance' ? metric('Advance', item.advance, 'blue') : mode === 'onaccount' ? metric('Amount', item.amount, 'purple') : metric('Outstanding', item.Total, 'blue')}
                                {metric('cr Days', item.crday ?? 0, 'orange', 'plain')}
                                {metric('cr Limit', item.crlimit, 'green', 'whole')}
                            </View>
                            {!!metaLine && <Text style={[styles.customerCardMeta, { marginTop: 8 }]} numberOfLines={2}>{metaLine}</Text>}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        );
    };

    // Customer summary screen: opened after selecting a party from the summary list.
    const CustomerSummaryView = () => {
        const customer: any = getOutSummary.find((item: any) => String(item.AccCode) === String(selectedAccCode));
        const isOnAccount = getActiveCardDetails?.caption == 'On Account';
        const ageing = [
            { label: '0-30', value: customer?.slab1 },
            { label: '31-60', value: customer?.slab2 },
            { label: '61-90', value: customer?.slab3 },
            { label: '91-120', value: customer?.slab4 },
            { label: '121+', value: customer?.slab5 },
        ];
        const maxAgeing = Math.max(...ageing.map((item) => toNumber(item.value)), 1);
        const salesExec = customer?.sename || customer?.sexename;
        const metaLine = [salesExec ? `Sales Exec: ${salesExec}` : '', customer?.BrkName ? `Broker: ${customer.BrkName}` : ''].filter(Boolean).join('  |  ');

        return (
            <View style={styles.detailOverlay}>
                <View style={styles.detailContainer}>
                    <View style={styles.drawerHeader}>
                        <TouchableOpacity onPress={() => { setCustomerSummaryVisible(false); setSummaryDrawerVisible(true); }}>
                            <Icon name="arrow-back" size={25} color="#F97316" />
                        </TouchableOpacity>
                        <Text style={[styles.drawerTitle, { flex: 1, marginLeft: 10 }]}>Customer Summary</Text>
                        <View style={styles.headerSpacer} />
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.summaryCardList}>
                        <View style={styles.customerDetailsIdentity}>
                            <View style={styles.customerDetailsAvatar}>
                                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 18 }}>{String(customer?.AccName || 'A').trim().charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.customerDetailsName} numberOfLines={2}>{customer?.AccName || 'Customer Details'}</Text>
                                <Text style={styles.customerDetailsMeta}>Code: {selectedAccCode || '-'}  |  Group: {groupName(customer)}</Text>
                                {!!metaLine && <Text style={styles.customerDetailsMeta} numberOfLines={2}>{metaLine}</Text>}
                            </View>
                        </View>
                        <View style={styles.customerDetailsMetricRow}>
                            <View style={styles.customerDetailsMetric}><Text style={styles.customerDetailsMetricLabel}>{isOnAccount ? 'Amount' : 'Outstanding'}</Text><Text style={styles.customerDetailsMetricValue}>₹ {formatAmount(isOnAccount ? customer?.amount : customer?.Total)}</Text></View>
                            <View style={styles.customerDetailsMetric}><Text style={styles.customerDetailsMetricLabel}>cr Days</Text><Text style={[styles.customerDetailsMetricValue, { color: '#EA641F' }]}>{customer?.crday ?? 0}</Text></View>
                            <View style={styles.customerDetailsMetric}><Text style={styles.customerDetailsMetricLabel}>cr Limit</Text><Text style={styles.customerDetailsMetricValue} numberOfLines={1}>₹ {formatIndianNumber(customer?.crlimit)}</Text></View>
                        </View>
                        {!isOnAccount && (<>
                            <View style={styles.ageingAnalysisCard}>
                                <View style={styles.ageingTitleRow}>
                                    <View style={styles.ageingTitleIcon}>
                                        <Icon name="insights" size={16} color="#F97316" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.ageingAnalysisTitle}>Ageing Analysis</Text>
                                        <Text style={styles.ageingAnalysisSubtitle}>Outstanding amount by ageing range</Text>
                                    </View>
                                    <View style={styles.chartHintBadge}>
                                        <Icon name="touch-app" size={13} color="#C2410C" />
                                        <Text style={styles.chartHintText}>Tap bar</Text>
                                    </View>
                                </View>
                                {selectedAgeingLabel && (
                                    <View style={styles.ageingTooltipCard}>
                                        <Text style={styles.ageingTooltipLabel}>{selectedAgeingLabel} days</Text>
                                        <Text style={styles.ageingTooltipValue}>₹ {formatAmount(ageing.find((entry) => entry.label === selectedAgeingLabel)?.value)}</Text>
                                    </View>
                                )}
                                <View style={styles.ageingChartArea}>
                                    {[0, 1, 2, 3].map((line) => (
                                        <View key={line} style={[styles.ageingGridLine, { top: `${line * 25}%` }]} />
                                    ))}
                                    <View style={styles.ageingChartRow}>
                                        {ageing.map((item) => {
                                            const numeric = toNumber(item.value);
                                            const isSelected = selectedAgeingLabel === item.label;
                                            return (
                                                <TouchableOpacity
                                                    key={item.label}
                                                    activeOpacity={0.8}
                                                    style={[styles.ageingChartItem, isSelected && styles.ageingChartItemSelected]}
                                                    onPress={() => setSelectedAgeingLabel(isSelected ? null : item.label)}
                                                >
                                                    <Text style={[styles.ageingChartValue, isSelected && styles.ageingChartValueSelected]}>
                                                        {numeric ? formatAmount(numeric / 100000) + ' L' : '₹ 0'}
                                                    </Text>
                                                    <View style={styles.ageingBarTrack}>
                                                        <View style={[styles.ageingBar, { height: Math.max(5, (numeric / maxAgeing) * 118) }, isSelected && styles.ageingBarSelected]} />
                                                    </View>
                                                    <Text style={[styles.ageingChartLabel, isSelected && styles.ageingChartLabelSelected]}>{item.label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>
                            <View style={styles.summaryMetricsGrid}>
                                <View style={[styles.summaryMetric, styles.summaryMetric_green]}><Text style={styles.summaryMetricLabel}>Advance</Text><Text style={styles.summaryMetricValue}>₹ {formatAmount(customer?.advance)}</Text></View>
                                <View style={[styles.summaryMetric, styles.summaryMetric_purple]}><Text style={styles.summaryMetricLabel}>On Account</Text><Text style={styles.summaryMetricValue}>₹ {formatAmount(customer?.onaccount)}</Text></View>
                                <View style={[styles.summaryMetric, styles.summaryMetric_blue]}><Text style={styles.summaryMetricLabel}>PDC Amount</Text><Text style={styles.summaryMetricValue}>₹ {formatAmount(customer?.pdcamt)}</Text></View>
                                <View style={[styles.summaryMetric, styles.summaryMetric_red]}><Text style={styles.summaryMetricLabel}>NCL Amount</Text><Text style={styles.summaryMetricValue}>₹ {formatAmount(customer?.nclramt)}</Text></View>
                            </View>
                        </>)}
                        <TouchableOpacity style={styles.primaryActionButton} onPress={() => { setCustomerSummaryVisible(false); setModalVisible(true); }}>
                            <Icon name="description" size={20} color="#FFFFFF" />
                            <Text style={styles.primaryActionText}>View Details</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        );
    };

    // Voucher details shown as cards instead of the old table.
    // Data handling is unchanged from the old DetailTable / OnAccountDetailTable.
    const DetailVoucherCards = () => {
        const isOnAccount = getActiveCardDetails?.caption == 'On Account';

        let rows: any[] = [];
        let totalBalance = 0;
        let totalCumulative = 0;

        if (isOnAccount) {
            rows = filteredDetails || [];
            totalBalance = rows.reduce((sum: number, item: any) => sum + (parseFloat(item.AMOUNT) || 0), 0);
        } else {
            // Ascending by TRANID to build the running cumulative, then show newest first
            const sortedData = [...(filteredDetails || [])].sort((a: any, b: any) => parseFloat(a.TRANID) - parseFloat(b.TRANID));
            let running = 0;
            const cumulativeData = sortedData.map((item: any) => {
                running += parseFloat(item.CUMBAL) || 0;
                return { ...item, Cumulative: running.toString() };
            });
            rows = cumulativeData.sort((a: any, b: any) => parseFloat(b.TRANID) - parseFloat(a.TRANID));
            rows.forEach((item: any) => {
                totalBalance += parseFloat(item.CUMBAL) || 0;
                totalCumulative += parseFloat(item.Cumulative) || 0;
            });
        }

        return (
            <ScrollView style={styles.detailCardsScroll} contentContainerStyle={styles.detailCardsContent} showsVerticalScrollIndicator={false}>
                {rows.length === 0 ? (
                    <View style={styles.emptyDetailsCard}>
                        <Icon name="inbox" size={28} color="#94A3B8" />
                        <Text style={styles.emptyDetailsText}>No details available</Text>
                    </View>
                ) : rows.map((item: any, index: number) => {
                    const date = String(item.TRANDATE || item.NTRANDATE || '-');
                    const badge = getDateBadge(item.TRANDATE);
                    const voucherNo = item.VOUNO || item.TRANID || item.vouno || '-';
                    return (
                        <View key={`${item.ACCCODE}-${voucherNo}-${index}`} style={styles.detailVoucherCard}>
                            <View style={styles.detailVoucherTopRow}>
                                <View style={styles.detailVoucherDateBadge}>
                                    <Text style={styles.detailVoucherDateDay}>{badge.day}</Text>
                                    <Text style={styles.detailVoucherDateMonth}>{badge.month}</Text>
                                </View>
                                <View style={styles.detailVoucherMain}>
                                    <View style={styles.detailVoucherTitleRow}>
                                        <Text style={styles.detailVoucherType}>{item.TYPE || (isOnAccount ? 'ON ACCOUNT' : '-')}</Text>
                                        <Text style={styles.detailVoucherNo}>{voucherNo}</Text>
                                    </View>
                                    <Text style={styles.detailVoucherDate}>{date}</Text>
                                </View>
                                <Icon name="chevron-right" size={21} color="#F97316" />
                            </View>
                            {isOnAccount ? (<>
                                <View style={styles.detailVoucherInfoRow}>
                                    <View style={styles.detailVoucherInfoBox}>
                                        <Text style={styles.detailVoucherInfoLabel}>Amount</Text>
                                        <Text style={styles.detailVoucherInfoValue} numberOfLines={1}>₹ {formatAmount(item.AMOUNT)}</Text>
                                    </View>
                                    <View style={styles.detailVoucherInfoBox}>
                                        <Text style={styles.detailVoucherInfoLabel}>Cheque No.</Text>
                                        <Text style={styles.detailVoucherInfoValue} numberOfLines={1}>{item.chqno || '-'}</Text>
                                    </View>
                                    <View style={styles.detailVoucherInfoBox}>
                                        <Text style={styles.detailVoucherInfoLabel}>Cheque Date</Text>
                                        <Text style={styles.detailVoucherInfoValue} numberOfLines={1}>{item.chqdate || '-'}</Text>
                                    </View>
                                    <View style={styles.detailVoucherInfoBox}>
                                        <Text style={styles.detailVoucherInfoLabel}>Clearing Date</Text>
                                        <Text style={styles.detailVoucherInfoValue} numberOfLines={1}>{item.clrdate || '-'}</Text>
                                    </View>
                                </View>
                                {!!item.remark && <Text style={[styles.detailVoucherDate, { marginTop: 8 }]} numberOfLines={2}>Remark: {item.remark}</Text>}
                            </>) : (
                                <View style={styles.detailVoucherInfoRow}>
                                    <View style={styles.detailVoucherInfoBox}>
                                        <Text style={styles.detailVoucherInfoLabel}>Balance</Text>
                                        <Text style={styles.detailVoucherInfoValue} numberOfLines={1}>₹ {formatAmount(item.CUMBAL)}</Text>
                                    </View>
                                    <View style={styles.detailVoucherInfoBox}>
                                        <Text style={styles.detailVoucherInfoLabel}>Due Days</Text>
                                        <Text style={styles.detailVoucherInfoValue} numberOfLines={1}>{item.DUEDAY ?? 0}</Text>
                                    </View>
                                    <View style={styles.detailVoucherInfoBox}>
                                        <Text style={styles.detailVoucherInfoLabel}>Cumulative</Text>
                                        <Text style={styles.detailVoucherInfoValue} numberOfLines={1}>₹ {formatAmount(item.Cumulative)}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}
                {rows.length > 0 && (
                    <View style={styles.simpleDetailTotals}>
                        <View style={styles.simpleDetailTotalItem}>
                            <Text style={styles.simpleDetailTotalLabel}>{isOnAccount ? 'Amount' : 'Balance'}</Text>
                            <Text style={styles.simpleDetailTotalValue}>₹ {formatAmount(totalBalance)}</Text>
                        </View>
                        {!isOnAccount && (<>
                            <View style={styles.simpleDetailTotalDivider} />
                            <View style={styles.simpleDetailTotalItem}>
                                <Text style={styles.simpleDetailTotalLabel}>Cumulative</Text>
                                <Text style={styles.simpleDetailTotalValue}>₹ {formatAmount(totalCumulative)}</Text>
                            </View>
                        </>)}
                    </View>
                )}
            </ScrollView>
        );
    };


    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);
    const closeDrawer123 = () => setSummaryDrawerVisible(false);

    console.log('🔵 POT Data:', gePOTData);
    console.log('🔵 selectedPrpgrp', selectedPrpgrp, selectedPrpgrp?.PrpTypeCode, selectedPrpgrp?.PrpTypeOf);
    console.log('🔵 selectedInternal', selectedInternal, selectedInternal?.lable, selectedInternal?.value);


    console.log("aaa parent Formatted From Date:", fromDate ? format(fromDate, 'yyyy-MM-dd') : null);
    console.log("aaa parent Formatted To Date:", toDate ? format(toDate, 'yyyy-MM-dd') : null);

    return (
        <View style={styles.receivablesScreen}>
            {/* Receivables search and dashboard controls */}
            <View style={styles.receivablesSearchSection}>
                <View style={styles.receivablesSearchBox}>
                    <Icon name="search" size={22} color="#64748B" />
                    <TextInput
                        placeholder="Search receivables..."
                        placeholderTextColor="#64748B"
                        value={searchQueryPOTCard}
                        onChangeText={setSearchQueryPOTCard}
                        style={styles.receivablesSearchInput}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                </View>
                <TouchableOpacity style={styles.receivablesFilterButton} onPress={openDrawer}>
                    <Icon name="filter-alt" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
            <View style={styles.syncToggleContainer}>
                <View style={styles.narrationBar}>
                    <View style={styles.syncToggle}>
                        <Icon name="event-available" size={19} color="#F97316" />
                        <Text style={styles.syncLabel}>
                            {syncLoading ? 'Last Syncing...' : `Last Synced: ${receivables_sync_date || '—'}`}
                        </Text>
                        <Icon name="sync" size={18} color="#0F9F8B" />
                    </View>
                </View>
            </View>

            {DashboardGrid({
                cards: filteredCards.length > 0 ? filteredCards : getOutCardData,
                onCardPress: onDashboardCardPress,
                activeSlab: activeCard,
            })}

            {summaryDrawerVisible && (
                <View style={styles.detailOverlay}>
                    <View style={styles.detailContainer}>

                        {/* HEADER: common left-side back button */}
                        <View style={styles.drawerHeader}>
                            <TouchableOpacity
                                style={styles.headerBackButton}
                                onPress={closeDrawer123}
                                accessibilityRole="button"
                                accessibilityLabel="Back to receivables cards"
                            >
                                <Icon name="arrow-back" size={26} color="#F97316" />
                            </TouchableOpacity>
                            <Text style={[styles.drawerTitle, { flex: 1, marginLeft: 10 }]}>
                                {`Receivables > ${getActiveCardDetails && getActiveCardDetails?.caption} summary`}
                            </Text>
                            <View style={styles.headerSpacer} />
                        </View>

                        {/* SEARCH */}
                        <TextInput
                            placeholder="Search summary..."
                            style={styles.drawerSearch}
                            value={searchQueryPOT}
                            onChangeText={setSearchQueryPOT}
                            autoCorrect={false}
                            autoCapitalize="none"
                            blurOnSubmit={false}
                            placeholderTextColor={theme.BRAND_GRADIENT_END}
                        />

                        {/* CONTENT */}
                        <View style={{ flex: 1, paddingHorizontal: 10, }}>
                            {getActiveCardDetails?.caption == 'On Account' ? SummaryCardList({ mode: 'onaccount' }) : getActiveCardDetails?.caption == 'Advance' ? SummaryCardList({ mode: 'advance' }) : SummaryCardList({ mode: 'summary' })}
                        </View>

                    </View>
                </View>
            )}
            {customerSummaryVisible && CustomerSummaryView()}
            {modalVisible && (
                <View style={styles.detailOverlay123}>
                    <View style={styles.detailContainer}>
                        {/* HEADER: common left-side back button */}
                        <View style={styles.drawerHeader}>
                            <TouchableOpacity
                                style={styles.headerBackButton}
                                onPress={() => {
                                    setModalVisible(false);
                                    setCustomerSummaryVisible(true);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Back to customer summary"
                            >
                                <Icon name="arrow-back" size={24} color="#F97316" />
                            </TouchableOpacity>
                            <Text style={[styles.drawerTitle, { flex: 1, marginLeft: 10 }]}>
                                {`Receivables > ${getActiveCardDetails && getActiveCardDetails?.caption} summary > details`}
                            </Text>
                            <View style={styles.headerSpacer} />
                        </View>
                        <TextInput
                            placeholder="Search details..."
                            style={styles.drawerSearch}
                            value={searchQueryPOTDetails}
                            onChangeText={setSearchQueryPOTDetail}
                            autoCorrect={false}
                            autoCapitalize="none"
                            blurOnSubmit={false}
                            placeholderTextColor={theme.BRAND_GRADIENT_END}
                        />
                        <View style={styles.detailCustomerCard}>
                            <View style={styles.detailCustomerAvatar}>
                                <Icon name="account-balance" size={22} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailCustomerName} numberOfLines={1}>
                                    {getOutSummary.find((item: any) => String(item.AccCode) === String(selectedAccCode))?.AccName || 'Customer Details'}
                                </Text>
                                <Text style={styles.detailCustomerMeta}>
                                    Code: {selectedAccCode || '-'}  |  Group: {groupName(getOutSummary.find((item: any) => String(item.AccCode) === String(selectedAccCode)))}
                                </Text>
                            </View>
                        </View>
                        {DetailVoucherCards()}

                    </View>
                </View>

            )}
            <CustomDrawer
                isVisible={isDrawerVisible}
                onClose={closeDrawer}
                fromDate={fromDate}
                toDate={toDate}
                setFromDate={setFromDate}
                setToDate={setFromDate}
                selectedYear={selectedYear}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
                onYearChange={setSelectedYear}
                handleConfirmAction={handleConfirmAction}
                exeData={exeData}
                onExeChangeReceive={setSelectedPrpGrp}
                selectedPrpgrp={selectedPrpgrp?.PrpTypeOf || 'Select Property Group'}
                designData={designData}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                onDashPrpSelect={handleDashPrpSelect}
                onDashPartySelect={handleDashPartySelect}
                onDashSexeSelect={handleDashSexeSelect}
                onDashAccountSelect={handleDashAccountSelect}
                onDashSubHeadSelect={handleDashSubHeadSelect}
                onItemSelectItem={handleItemSelect}
                selectedDesigns={selectedDesigns}
                setSelectedDesigns={setSelectedDesigns}
                setSelectedItems={setSelectedItems}
                selectedItems={selectedItems}
                itemData={itemData}
                selectedItemStatus={selectedItemStatus}
                onItemStatusChange={handleItemStatusChange}
                receivables_prpgroup={receivables_prpgroup}
                internal_dropdown={internal_dropdown}
                selectedInternal={selectedInternal?.lable || 'Select Internal'}
                onExeChangeInternal={setSelectedInternal}
                getdashPrp={getdashPrp}
                setSelectedDashPrp={setSelectedDashPrp}
                selectedDashPrp={selectedDashPrp}
                // 
                getdashParty={getdashParty}
                setSelectedDashParty={setSelectedDashParty}
                selectedDashParty={selectedDashParty}
                // 
                getdashSubHead={getdashSubHead}
                setSelectedDashSubHead={setSelectedDashSubHead}
                selectedDashSubHead={selectedDashSubHead}
                // 
                getdashSexe={getdashSexe}
                setSelectedDashSexe={setSelectedDashSexe}
                selectedDashSexe={selectedDashSexe}
                // 
                dashAccount={dashAccount}
                getAccountLoading={getAccountLoading}
                // 
                getdashPropertyLoading={getdashPropertyLoading}
                getdashPartyLoading={getdashPartyLoading}
                getdashSubHeadLoading={getdashSubHeadLoading}
                getdashSexeLoading={getdashSexeLoading}
                // 
                getdashAccount={getdashAccount}
                setSelectedDashAccount={setSelectedDashAccount}
                selectedDashAccount={selectedDashAccount}
                getdashAccountLoading={getdashAccountLoading}
                setAccountLoading={setAccountLoading}
                hideprpGroup={hideprpGroup}
            // 
            />
        </View>
    );
};

const styles = StyleSheet.create({
    receivablesScreen: {
        flex: 1,
        width: '100%',
        backgroundColor: '#F7F9FC',
        overflow: 'hidden',
    },
    dashboardList: {
        flex: 1,
        backgroundColor: '#F7F9FC',
    },
    // 
    accordionContainer: {
        marginBottom: 10,
    },
    carouselContainer: {
        height: 70,
        paddingHorizontal: 10,
    },
    cardContainer: {
        marginRight: 10,
        borderRadius: 8,
        overflow: 'hidden',
        elevation: 2,
        width: 150,
        height: 70,
    },
    card: {
        padding: 10,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    cardDetails: {
        marginTop: 5,
        padding: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 5,
    },
    cardDetailText: {
        color: theme.TEXT_WHITE,
        fontSize: 10,
        textAlign: 'center',
    },
    summaryCardList: {
        padding: 4,
        paddingBottom: 24,
        gap: 12,
    },
    customerSummaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E8EDF2',
        padding: 12,
        marginBottom: 12,
        shadowColor: '#10283A',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    customerCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    customerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0E5', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    customerAvatarText: { color: '#EA580C', fontSize: 18, fontWeight: '800' },
    customerCardIdentity: { flex: 1, minWidth: 0 },
    customerCardName: { color: '#10283A', fontSize: 13, fontWeight: '800' },
    customerCardMeta: { color: '#64748B', fontSize: 11, marginTop: 3 },
    customerInfoButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
    ageingAnalysisCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E8EDF2', marginTop: 10, shadowColor: '#10283A', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
    ageingTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    ageingTitleIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#FFF1E6', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    ageingAnalysisSubtitle: { color: '#94A3B8', fontSize: 10, marginTop: 2 },
    chartHintBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: '#FFF7ED' },
    chartHintText: { color: '#C2410C', fontSize: 9, fontWeight: '700' },
    ageingTooltipCard: { backgroundColor: '#10283A', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ageingTooltipLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: '700' },
    ageingTooltipValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    ageingChartArea: { height: 185, position: 'relative', paddingTop: 4, paddingBottom: 6 },
    ageingGridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#EEF2F6' },
    ageingBarTrack: { height: 124, width: 30, justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#DCE5EC' },
    ageingChartItemSelected: { backgroundColor: '#FFF7ED', borderRadius: 10, paddingHorizontal: 4 },
    ageingChartValueSelected: { color: '#C2410C' },
    ageingChartLabelSelected: { color: '#C2410C', fontWeight: '800' },
    ageingBarSelected: { backgroundColor: '#EA580C', width: 30 },
    headerSpacer: { width: 28, height: 28 },
    headerBackButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7ED' },
    ageingAnalysisTitle: { color: '#10283A', fontSize: 14, fontWeight: '800', marginBottom: 10 },
    ageingChartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 175, paddingTop: 8, zIndex: 2 },
    ageingChartItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minWidth: 40, paddingVertical: 3 },
    ageingChartValue: { color: '#10283A', fontSize: 9, fontWeight: '700', marginBottom: 4 },
    ageingBar: { width: 26, maxHeight: 118, backgroundColor: '#F97316', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
    ageingChartLabel: { color: '#526274', fontSize: 9, marginTop: 5 },
    primaryActionButton: { backgroundColor: '#0D1B2A', borderRadius: 11, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
    primaryActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    secondaryActionButton: { backgroundColor: '#FFFFFF', borderRadius: 11, minHeight: 46, borderWidth: 1, borderColor: '#E3D9CE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
    secondaryActionText: { color: '#17324A', fontSize: 14, fontWeight: '800' },
    summaryMetricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    summaryMetric: { flex: 1, minWidth: 88, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 8 },
    summaryMetric_blue: { backgroundColor: '#E8F1FF' },
    summaryMetric_orange: { backgroundColor: '#FFF0E3' },
    summaryMetric_green: { backgroundColor: '#E7F7EE' },
    summaryMetric_purple: { backgroundColor: '#F0EAFE' },
    summaryMetric_red: { backgroundColor: '#FFE8EA' },
    summaryMetricLabel: { color: '#526274', fontSize: 10, fontWeight: '700' },
    summaryMetricValue: { color: '#10283A', fontSize: 12, fontWeight: '800', marginTop: 4 },
    ageingStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    cardEmpty: { alignItems: 'center', justifyContent: 'center', padding: 32 },
    cardEmptyText: { color: '#64748B', fontSize: 14 },
    tableWrapper: {
        flex: 1,
        marginBottom: 20,
        maxHeight: undefined,
    },
    horizontalScroll: {
        flex: 1,
    },
    tableContainer: {
        borderRadius: 8,
        overflow: 'hidden',
        elevation: 2,
        backgroundColor: '#fff',
        minWidth: '100%',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F97316',
        // paddingVertical: 5,
        minWidth: '100%',
    },
    headerText: {
        color: theme.TEXT_WHITE,
        fontWeight: 'bold',
        // padding: 5,
        alignItems: 'center',
        alignContent: 'center',
        justifyContent: 'center',
        textAlignVertical: 'center',
        minHeight: 40,
        fontSize: 12,
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        minHeight: 50,
        minWidth: '100%',
        backgroundColor: '#FFFFFF', // Clean table rows
    },
    rowText: {
        padding: 5,
        flexWrap: 'wrap',
        minHeight: 40,
        fontSize: 12,
        color: '#17324A',   // Readable table text
    },
    actionColumn: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    actionButton: {
        padding: 5,
        width: 30,
        alignItems: 'center',
    },
    syncToggleContainer: {
        marginBottom: 5,
    },
    syncToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        minHeight: 44,
    },
    syncLabel: {
        flex: 1,
        color: '#17324A',
        fontSize: 12,
        fontWeight: '700',
    },
    syncDetails: {
        padding: 10,
        backgroundColor: '#f5f5f5',
        marginBottom: 10,
        borderRadius: 5,
    },
    syncDetailsText: {
        fontSize: 12,
        color: '#333',
    },
    fullScreenModal: {
        margin: 0,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '96%',
        height: '94%',
    },
    // },
    // carouselContainer: {
    //     height: 100,
    //     marginBottom: 20,
    //     // paddingHorizontal: 10,
    // },
    // cardContainer: {
    //     marginRight: 10,
    //     borderRadius: 8,
    //     overflow: 'hidden',
    //     elevation: 2,
    //     width: 150,
    // },
    // card: {
    //     padding: 15,
    //     height: 100,
    //     justifyContent: 'center',
    //     alignItems: 'center',
    //     borderRadius: 8,
    // },
    cardCaption: {
        color: theme.TEXT_WHITE,
        fontSize: 13,
        fontFamily: theme.FONT_FAMILY_SEMIBOLD_ITALIC,
    },
    cardSummary: {
        color: theme.TEXT_WHITE,
        fontSize: 12,
        fontFamily: theme.FONT_FAMILY_EXTRABOLD,
    },
    tableScrollContainer: {
        marginTop: 5,
        maxHeight: 400,
        flex: 1,
    },
    detailOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FBFAF7', // Opaque screen; never show the old dashboard behind it
        zIndex: 1000,
        elevation: 1000, // Keep the new screen above the dashboard
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailOverlay123: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FBFAF7', // Opaque screen; never show the old dashboard behind it
        zIndex: 2000,
        elevation: 2000, // Keep details above all previous content
        justifyContent: 'center',
        alignItems: 'center',
    },
     detailContainer: {
        backgroundColor: '#FBFAF7',
        // padding: 20,
        paddingTop: 0,
        borderRadius: 16,
        width: '100%',
        height: '96%',
        maxWidth: 1280,
        overflow: 'hidden',
        elevation: 5, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: theme.BRAND_GRADIENT_END,
        borderRadius: 5,
    },
    closeButtonText: {
        color: '#fff',
        textAlign: 'center',
    },
    receivablesSearchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F7F8FA',
    },
    receivablesSearchBox: {
        flex: 1,
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    receivablesSearchInput: {
        flex: 1,
        marginLeft: 8,
        paddingVertical: 0,
        color: '#10283A',
        fontSize: 14,
    },
    receivablesFilterButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F97316',
    },
    listIconContainer: {
        position: 'absolute',
        top: 106,
        right: 18,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        borderRadius: 3,
        padding: 4,
    },
    narrationBar: {
        marginHorizontal: 14,
        marginTop: 4,
        marginBottom: 2,
        borderRadius: 12,
        backgroundColor: '#EAF1FB',
        borderWidth: 1,
        borderColor: '#DCE7F5',
        overflow: 'hidden',
    },
    dashboardCard: {
        flex: 1,
        minHeight: 142,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        elevation: 3,
        shadowColor: '#17324A',
        shadowOpacity: 0.10,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },


    dashboardCardInner: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 12,
    },
    dashboardCardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dashboardIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dashboardTextBlock: {
        marginTop: 9,
    },


    // dashboardCaption: {
    //     fontSize: 12,
    //     color: '#555',
    //     marginBottom: 6,
    // },

    // dashboardValue: {
    //     fontSize: 20,
    //     fontWeight: '700',
    //     color: '#333',
    // },
    dashboardCaption: {
        fontSize: 12,
        marginBottom: 4,
        fontWeight: '800',
        letterSpacing: 0.25,
    },

    dashboardValue: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.25,
    },


    // activeDashboardCard: {
    //     borderWidth: 2,
    //     borderColor: theme.BRAND_GRADIENT_END,
    // },
    activeDashboardCard: {
        borderWidth: 2,
        borderColor: theme.BRAND_GRADIENT_END,
        shadowColor: theme.BRAND_GRADIENT_END,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
    },
    disabledCard: {
        opacity: 0.6,
    },
    disabledText: {
        color: '#E5E7EB',
    },

    activeText: {
        color: '#fff',
    },


    drawerContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    drawerHeader: {
        height: 60,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    drawerTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#0F2A3D',
    },
    drawerSearch: {
        // margin: 3,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        // borderColor: '#ddd',
        borderColor: 'transparent',
        color: '#005F73',
    },


    detailCustomerCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginTop: 8, marginBottom: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#F3D5BE', backgroundColor: '#FFFFFF', shadowColor: '#10283A', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    detailCustomerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F58245', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    detailCustomerName: { color: '#10283A', fontSize: 14, fontWeight: '800' },
    detailCustomerMeta: { color: '#64748B', fontSize: 10, marginTop: 4 },
    detailSummaryCardsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    detailSummaryCard: {
        flexGrow: 1,
        flexBasis: '22%',
        minWidth: 112,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderWidth: 1,
        borderColor: 'rgba(15, 42, 62, 0.06)',
    },
    detailSummaryCard_blue: { backgroundColor: '#E8F1FF' },
    detailSummaryCard_orange: { backgroundColor: '#FFF0E3' },
    detailSummaryCard_green: { backgroundColor: '#E7F7EE' },
    detailSummaryCard_mint: { backgroundColor: '#E4F7EF' },
    detailSummaryCard_purple: { backgroundColor: '#F0EAFE' },
    detailSummaryCard_sky: { backgroundColor: '#E6F3FF' },
    detailSummaryCard_red: { backgroundColor: '#FFE8EA' },
    detailSummaryCardLabel: { color: '#526274', fontSize: 10, fontWeight: '700' },
    detailSummaryCardValue: { color: '#10283A', fontSize: 13, fontWeight: '800', marginTop: 5 },
    detailSummaryDueValue: { color: '#EA580C' },
    detailTabs: { flexDirection: 'row', marginHorizontal: 14, marginBottom: 8, borderRadius: 10, backgroundColor: '#F2EEE8', padding: 3 },
    detailTab: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    detailTabActive: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F97316' },
    detailTabText: { color: '#526274', fontSize: 10, fontWeight: '700' },
    detailTabActiveText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
    detailTotalsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#FFF1E6', borderWidth: 1, borderColor: '#FDBA74' },
    detailTotalItem: { flex: 1 },
    detailTotalDivider: { width: 1, height: 34, backgroundColor: '#E7D7C8', marginHorizontal: 12 },
    detailTotalLabel: { color: '#526274', fontSize: 10, fontWeight: '700' },
    detailTotalValue: { color: '#10283A', fontSize: 17, fontWeight: '800', marginTop: 4 },
    detailTotalAmount: { color: '#F97316', fontSize: 15, fontWeight: '800', marginTop: 4 },
    detailCardsScroll: { flex: 1, backgroundColor: '#FBFAF7' },
    detailCardsContent: { paddingHorizontal: 14, paddingBottom: 26, paddingTop: 4 },
    emptyDetailsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E7E5E4' },
    emptyDetailsText: { marginTop: 8, color: '#64748B', fontSize: 12, fontWeight: '700' },
    detailVoucherCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E8E5E0', shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    detailVoucherTopRow: { flexDirection: 'row', alignItems: 'center' },
    detailVoucherDateBadge: { width: 52, height: 54, borderRadius: 12, backgroundColor: '#FFF1E7', alignItems: 'center', justifyContent: 'center', marginRight: 11, borderWidth: 1, borderColor: '#FFE0CB' },
    detailVoucherDateDay: { color: '#C2410C', fontSize: 16, fontWeight: '900' },
    detailVoucherDateMonth: { color: '#9A3412', fontSize: 9, fontWeight: '800', marginTop: 2 },
    detailVoucherMain: { flex: 1 },
    detailVoucherTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    detailVoucherType: { color: '#0F2A3D', fontSize: 12, fontWeight: '900' },
    detailVoucherNo: { color: '#334155', fontSize: 11, fontWeight: '800' },
    detailVoucherDate: { color: '#64748B', fontSize: 10, marginTop: 5 },
    detailVoucherInfoRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
    detailVoucherInfoBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 9, borderWidth: 1, borderColor: '#EEF2F6' },
    detailVoucherInfoLabel: { color: '#64748B', fontSize: 9, fontWeight: '700' },
    detailVoucherInfoValue: { color: '#0F2A3D', fontSize: 11, fontWeight: '900', marginTop: 4 },
    detailGrandTotalCard: { backgroundColor: '#FFF8F1', borderRadius: 15, padding: 12, marginTop: 2, borderWidth: 1, borderColor: '#FDBA74' },
    detailGrandTotalPrimaryRow: { flexDirection: 'row', alignItems: 'center' },
    detailGrandTotalPrimaryItem: { flex: 1 },
    detailGrandTotalLabel: { color: '#9A3412', fontSize: 10, fontWeight: '700' },
    detailGrandTotalCount: { color: '#0F2A3D', fontSize: 19, fontWeight: '900', marginTop: 4 },
    detailGrandTotalDivider: { width: 1, height: 42, backgroundColor: '#F3C49C', marginHorizontal: 16 },
    detailGrandTotalAmount: { color: '#EA580C', fontSize: 16, fontWeight: '900', marginTop: 4 },
    detailGrandTotalSummaryGrid: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3DCC8' },
    detailGrandTotalSummaryItem: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F3DCC8' },
    simpleDetailTotals: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#FDBA74', paddingVertical: 13, paddingHorizontal: 14, marginTop: 8, marginBottom: 8 },
    simpleDetailTotalItem: { flex: 1, paddingHorizontal: 8 },
    simpleDetailTotalLabel: { color: '#9A3412', fontSize: 11, fontWeight: '700' },
    simpleDetailTotalValue: { color: '#EA580C', fontSize: 15, fontWeight: '900', marginTop: 4 },
    simpleDetailTotalDivider: { width: 1, height: 38, backgroundColor: '#FDBA74', marginHorizontal: 8 },
    customerDetailsScreen: { flex: 1, backgroundColor: '#FBFAF7' },
    customerDetailsContent: { padding: 14, paddingBottom: 28 },
    customerDetailsIdentity: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#E8E2D9', marginBottom: 10 },
    customerDetailsAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F58245', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    customerDetailsName: { color: '#10283A', fontSize: 14, fontWeight: '800' },
    customerDetailsMeta: { color: '#64748B', fontSize: 11, marginTop: 4 },
    customerDetailsMetricRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    customerDetailsMetric: { flex: 1, backgroundColor: '#EAF2FF', borderRadius: 10, padding: 10 },
    customerDetailsMetricLabel: { color: '#244A78', fontSize: 10, marginBottom: 4 },
    customerDetailsMetricValue: { color: '#10283A', fontSize: 12, fontWeight: '800' },
    customerDetailsSearch: { height: 44, borderWidth: 1, borderColor: '#D7DEE6', borderRadius: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#10283A', marginBottom: 10 },
    voucherCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 13, padding: 10, marginBottom: 9, borderWidth: 1, borderColor: '#EEE7DF' },
    voucherDateBox: { width: 54, minHeight: 58, borderRadius: 10, backgroundColor: '#FFF0E4', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
    voucherDateDay: { fontSize: 16, fontWeight: '800', color: '#10283A' },
    voucherDateMonth: { fontSize: 10, color: '#64748B', marginTop: 2 },
    voucherMain: { flex: 1 },
    voucherTopLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
    voucherType: { color: '#10283A', fontSize: 12, fontWeight: '800' },
    voucherNumber: { color: '#10283A', fontSize: 12, fontWeight: '700' },
    voucherAmount: { alignSelf: 'flex-start', backgroundColor: '#E6F7ED', color: '#087A43', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, fontSize: 12, fontWeight: '800' },
    voucherTotalCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF0DF', borderRadius: 12, padding: 15, marginTop: 8 },
    voucherTotalLabel: { color: '#8B3E17', fontWeight: '700' },
    voucherTotalValue: { color: '#EA641F', fontWeight: '800' },

});


export default Receivables;
