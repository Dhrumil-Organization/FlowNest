import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, ScrollView, Modal, FlatList, TextInput, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import qs from 'qs';
import axios from 'axios';
import { format } from 'date-fns';
import HeaderBar from '../HeaderBar/HeaderBar';
import { crlimtreq_styles } from '../../common/Styles/Style';
import CustomDrawer from './CustomDrawer';
import { ExeData, DesignData, ItemData, POTData, ItemStatus, CardPayload, ReceivablesPrpgroup, InternalDropdown, DashPrp, DashParty, DashSubHead, DashSexe, DashAccount, ReceivablesSummary, ReceivablesDetails } from './Modal';
import theme from '../../android/app/src/theme';
import LinearGradient from 'react-native-linear-gradient';
import { TableData } from './data';
import { API } from '../../common/API/dynamicAPI';
import { normalizePrptype, saveLargeData, readPrptypeCache, fetchPropertyData, getCurrentFinancialYearMain, generateFinancialYearOptions } from '../../common/API/Functions';
import SummaryTable from './SummaryTable';
import PartyOverlay from './PartyOverlay';
import LedgerOverlay from './LedgerOverlay';

const PartyDashboard: React.FC<Props> = ({ token, username }) => {
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
    const [action, setAction] = useState('');
    const [activeParty, setActiveParty] = useState('');
    const [receivables_prpgroup, setreceivables_prpgroup] = useState<ReceivablesPrpgroup[]>([]);
    const [getOutCardData, setOutCardData] = useState([]);
    const [getOutDetails, setOutDetails] = useState<ReceivablesDetails[]>([]);
    const [getOutSummary, setOutSummary] = useState<ReceivablesSummary[]>([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [ledgerOverlayVisible, setLedgerOverlayVisible] = useState(false);
    const [ledgerData, setLedgerData] = useState([]);
    const [outstandingData, setOutstandingData] = useState([]);
    const [CustomerRateData, setCustomerRateData] = useState([]);
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
    const currentDate = new Date();
    const currentYear12 = currentDate.getFullYear();
    const yearOptions = generateFinancialYearOptions(currentYear12);
    const [selectedYear, setSelectedYear] = useState<string>(getCurrentFinancialYearMain());
    const [selectedPrpgrp, setSelectedPrpGrp] = useState<ReceivablesPrpgroup | "">("");
    const [selectedInternal, setSelectedInternal] = useState<InternalDropdown | "">("");
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
    const [selectedParties, setSelectedParties] = useState({});
    const [mianPaylaod, setMianPaylaod] = useState({});
    const [filteredData, setFilteredData] = useState([]);
    const [filteredDetails, setFilteredDetails] = useState([]);
    const [visibleCards, setVisibleCards] = useState(5);
    const [visibleSummaryItems, setVisibleSummaryItems] = useState(5);
    const [visibleDetailItems, setVisibleDetailItems] = useState(5);
    const [expandedCards, setExpandedCards] = useState({});
    const [showLastSync, setShowLastSync] = useState(true);
    const [activeCard, setActiveCard] = useState(null);
    const [getActiveCardDetails, setActiveCardDetails] = useState(null);
    const [summaryDrawerVisible, setSummaryDrawerVisible] = useState(false);
    const summaryVisibleRef = useRef(false);
    const searchRef = useRef(searchQueryPOT);
    const searchRefDetails = useRef(searchQueryPOTDetails);
    const ROW_HEIGHT = 52;
    const [partyOverlayVisible, setPartyOverlayVisible] = useState(false);
    const [getPropertyData, setPropertyData] = useState<PropertyData[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);

    useEffect(() => {
        summaryVisibleRef.current = summaryDrawerVisible;
    }, [summaryDrawerVisible]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            searchRef.current = searchQueryPOT;

            const filtered = getOutSummary.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchQueryPOT.toLowerCase())
                )
            );

            setFilteredData(filtered || []);
        }, 250);

        return () => clearTimeout(timeout);
    }, [searchQueryPOT, getOutSummary]);

    useEffect(() => {
        const filtered = getOutCardData.filter(item =>
            item.caption.toLowerCase().includes(searchQueryPOTCard.toLowerCase())
        );
        setFilteredCards(filtered);
    }, [searchQueryPOTCard, getOutCardData]);

    useEffect(() => {
        if (internal_dropdown.length > 0 && (!selectedInternal || selectedInternal === "")) {
            setSelectedInternal(internal_dropdown[1]);
        }
    }, [internal_dropdown, selectedInternal]);

    useEffect(() => {
        if (receivables_prpgroup.length > 0 && (!selectedPrpgrp || selectedPrpgrp === "")) {
            setSelectedPrpGrp(receivables_prpgroup[0]);
        }
    }, [receivables_prpgroup, selectedPrpgrp]);

    useEffect(() => {
        const details = getOutDetails?.filter(
            (detail) => detail.ACCCODE === selectedAccCode
        );
        const filtered = details?.filter((item) =>
            Object.values(item).some((val) =>
                String(val).toLowerCase().includes(searchQueryPOTDetails.toLowerCase())
            )
        );
        setFilteredDetails(filtered || []);
    }, [searchQueryPOTDetails, selectedAccCode, getOutDetails]);

    const onDashboardCardPress = (card) => {
        setActiveCard(card.slab);
        setActiveCardDetails(card);
        handleConfirmActionNew(
            selectedDashPrp,
            selectedDashParty,
            selectedDashSexe,
            selectedDashSubHead,
            selectedDashAccount,
            card?.caption,
            1,
            card
        );
    };

    const loadMoreSummaryItems = () => { setVisibleSummaryItems((prev) => prev + 5); };

    const loadMoreDetailItems = () => { setVisibleDetailItems((prev) => prev + 5); };

    const loadMoreCards = () => { setVisibleCards((prev) => prev + 5); };

    const generateUniqueKey = (prefix, index, item) => {
        return `${prefix}-${index}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const toggleCard = (slab) => {
        setExpandedCards(prev => ({
            ...prev,
            [slab]: !prev[slab]
        }));
    };

    const toggleLastSync = () => { setShowLastSync(!showLastSync); };

    const chacheData = useCallback(async () => {
        setSyncLoading(true);
        try {
            const responsesync = await axios.get(
                // 'https://apig.tms-webapp.com/api/dashprpgrp',
                `${API}/api/dashprpgrp`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/javascript',
                        Accept: 'application/json'
                    },
                    params: {
                        txntype: '/receivables-view'
                    }
                }
            );
            if (responsesync.data.success === true) {
                setSyncLoading(false);
                const receivables_sync_date_api = responsesync.data.data.dashlastsync || '';
                const receivables_prpgroup_api = responsesync.data.data.prpgroup || '';

                setreceivables_sync_date(receivables_sync_date_api);
                setreceivables_prpgroup(receivables_prpgroup_api);
            }
        } catch (error) {
            setSyncLoading(false);
            console.error("Token check error:", error);
        }
    }, []);

    const dashProperty = useCallback(async (selectedPrpgrp) => {

        setdashPropertyLoading(true);
        try {
            const payload = {
                prptype: selectedPrpgrp?.PrpTypeCode,
                txntype: '/receivables-view'
            }
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
                const maindata = responseprp.data.data.prp;
                setdashPrp(maindata);
            }
        } catch (error) {
            setdashPropertyLoading(false);
            console.error("Token check error:", error);
        }
    }, []);

    const dashParty = useCallback(async (selectedPrpgrp) => {
        setdashPartyLoading(true);
        setdashSexeLoading(true);
        try {
            const payload = {
                prptype: selectedPrpgrp?.PrpTypeCode,
                fetch: 'dr',
                dashview: 'outstanding',
                txntype: '/receivables-view'
            }

            const payloadSexe = {
                prptype: selectedPrpgrp?.PrpTypeCode,
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
                const maindata = responseparty.data.response.data;
                setdashParty(maindata);
            }
            if (responsesexe.data.success === true) {
                setdashSexeLoading(false);
                const maindataSexe = responsesexe.data.response.data;
                setdashSexe(maindataSexe);
            }
        } catch (error) {
            setdashPartyLoading(false);
            setdashSexeLoading(false);
            console.error("Token check error:", error);
        }
    }, []);

    const dashSubHead = useCallback(async (selectedPrpgrp, selectedDashPrp) => {
        setdashSubHeadLoading(true);

        const payload = {
            prptype: selectedPrpgrp?.PrpTypeCode,
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
            const response = await axios.post(`${API}/api/get_dashoutshead`, payload, { headers });
            if (response.data.success === true) {
                setdashSubHeadLoading(false);
                const maindata = response.data.data.data;
                setdashSubHead(maindata);

            }
        } catch (error) {
            setdashSubHeadLoading(false);
        }
    }, []);

    const dashAccount = useCallback(async (selectedDashPrp, selectedDashParty, selectedDashSexe, selectedDashSubHead) => {
        setAccountLoading(true);
        const formatDate123 = (rawDate: any) => {
            let day = rawDate.getDate().toString().padStart(2, '0') || '';
            let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || '';
            let year = rawDate.getFullYear() || '';
            return `${year}-${month}-${day}`;
        };
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const fromdate = formatDate123(firstDayOfMonth);
        const todate = formatDate123(today);
        const prpCodesArray = selectedDashPrp.map(item => item.PrpCode);
        const partyCodesArray = selectedDashParty.map(item => item.acccode);
        const subHeadArray = selectedDashSubHead.map(item => item.SHead);
        const sexeArray = selectedDashSexe.map(item => item.Code);
        try {
            const payload = {
                prptype: selectedPrpgrp?.PrpTypeCode,
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

            const queryString = qs.stringify(payload, { arrayFormat: 'brackets' });

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
                setdashAccount(response.data.data.data);
            }
        } catch (error) {
            setAccountLoading(false);
            console.error("Error in dashAccount:", error);
        } finally {
            setAccountLoading(false);
        }
    }, [selectedPrpgrp, selectedInternal]);

    useEffect(() => {
        if (selectedPrpgrp) {
            dashProperty(selectedPrpgrp);
            dashParty(selectedPrpgrp);
        }
    }, [selectedPrpgrp]);

    useEffect(() => {
        if (selectedPrpgrp) {
            dashSubHead(selectedPrpgrp, selectedDashPrp);
        }
    }, [selectedPrpgrp, selectedDashPrp]);

    useEffect(() => {
        if (contentWidth > 0 && containerWidth > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scrollPosition, {
                        toValue: containerWidth,
                        duration: 15000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scrollPosition, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
        chacheData();

    }, [contentWidth, containerWidth]);

    const rowsPerPage = 20;

    useEffect(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setFromDate(firstDayOfMonth);
        setToDate(today);
    }, []);

    useEffect(() => {
        const loadProperty = async () => {
            const getdata = await fetchPropertyData(token);
            setPropertyData(getdata);

            if (getdata && getdata.length > 0) {
                setSelectedProperty(getdata[0]);
            }
        };
        loadProperty();
    }, [token]);

    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2);
    };

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
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        prpcode: 'SIP',
                        yearno: getCurrentFinancialYear(),
                        strcode: '012',
                        txntype: 'production_order_track',
                        prptype: '',
                        fetch: 'salesexe'
                    }
                })
            );
            console.log('🔵 payload', payload, response);
            if (response.data.success && response.data.response.data.length > 0) {
                setExeData(response.data.response.data);
                fetchDesign();
            } else { }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', `Server error: ${error}`);
            }
        } finally {
        }
    };

    const fetchDesign = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
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
                txntype: 'production_order_track'
            };
            const response = await axios.get(
                `${API}/api/getdesign`,
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
                        txntype: 'production_order_track'
                    }
                })
            );
            if (response.data.success && response.data.response.data.length > 0) {
                setDesignData(response.data.response.data);
                fetchItem();
            } else {
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', `Server error: ${error}`);
            }
        } finally {
        }
    };

    const fetchItem = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        try {
            const payload = {
                prpcode: 'SIP',
                yearno: getCurrentFinancialYear(),
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
                        issdate: ''
                    }
                })
            );
            if (response.data.success && response.data.response.data.length > 0) {
                setItemData(response.data.response.data);
            } else { }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', `Server error: ${error}`);
            }
        } finally {
        }
    };

    const getToken = () => {
        return token;
    };

    const formatDate = (rawDate: any) => {
        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
        let year = rawDate.getFullYear() || '';
        return `${day}-${month}-${year}`;
    };

    const handleConfirmAction = useCallback(async (selectedDashPrp, selectedDashParty, selectedDashSexe, selectedDashSubHead, selectedDashAccount, CardName = '', isAcc = 0) => {
        setIsLoading(true);

        const prpCodesArray = selectedDashPrp.map(item => item.PrpCode);
        const partyCodesArray = selectedDashParty.map(item => item.acccode);
        const subHeadArray = selectedDashSubHead.map(item => item.SHead);
        const sexeArray = selectedDashSexe.map(item => item.Code);
        const accountArray = selectedDashAccount.map(item => item.AccCode);
        const fdate = fromDate ? format(fromDate, 'yyyy-MM-dd') : null;
        const tdate = toDate ? format(toDate, 'yyyy-MM-dd') : null;
        try {
            const payloadParty = {
                prptype: selectedPrpgrp?.PrpTypeCode,
                prpcodes: prpCodesArray && prpCodesArray,
                year: selectedYear,
                yearno: selectedYear?.slice(0, 4).slice(-2),
                parcode: partyCodesArray && partyCodesArray,
                fetch: 'dr',
                dashview: 'outstanding',
                txntype: '/receivables-view'
            }
            console.log('🔵 Table party API Payload:', payloadParty);
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
                        ...payloadParty
                    }
                }
            );

            setMianPaylaod(payloadParty);
            const data = responseparty.data.response.data || [];


            if (responseparty.data.success == true) {
                closeDrawer();
                setSummaryDrawerVisible(true);
                setOutSummary(data);
            }
        } catch (error) {
            setIsLoading(false);
            console.error("Error in dashAccount:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedPrpgrp]);

    const handleConfirmActionNew = useCallback(async (selectedDashPrp, selectedDashParty, selectedDashSexe, selectedDashSubHead, selectedDashAccount, CardName = '', isAcc = 0, card) => {
        setIsLoading(true);
        if (!selectedPrpgrp || !selectedInternal) {
            return;
        }
        const formatDate123 = (rawDate: any) => {
            let day = rawDate.getDate().toString().padStart(2, '0') || '';
            let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || '';
            let year = rawDate.getFullYear() || '';
            return `${year}-${month}-${day}`;
        };
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const fromdate = formatDate123(firstDayOfMonth);
        const todate = formatDate123(today);
        const prpCodesArray = selectedDashPrp.map(item => item.PrpCode);
        const subHeadArray = selectedDashSubHead.map(item => item.SHead);
        const sexeArray = selectedDashSexe.map(item => item.Code);
        const accountArray = selectedDashAccount.map(item => item.AccCode);
        try {
            const payload = {
                CardName: CardName.toUpperCase(),
                accounts: accountArray ? accountArray : [],
                prptype: selectedPrpgrp?.PrpTypeCode,
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
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };

            const response = await axios.post(`${API}/api/dashdata`, payload, { headers });
            console.log('🔵 🔵I am Calling4 Table', payload, response);
            const data = response.data.data?.dashoutcards || [];
            const data1 = response.data.data?.outdetail || [];
            const data2 = response.data.data?.outsummary || [];

            if (response.data.success == true) {
                if (data && data.length > 0 && data1 && data1.length > 0 && data2 && data2.length > 0) {
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
            }
        } catch (error) {
            setIsLoading(false);
            console.error("Error in dashAccount:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedPrpgrp, selectedInternal]);

    const loadDataInBatches = async (
        data: T[],
        setState: React.Dispatch<React.SetStateAction<T[]>>,
        dataType: string,
        batchSize: number = 200
    ): Promise<void> => {
        if (!data || data.length === 0) {
            return;
        }
        setState([]);
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            setState(prev => [...prev, ...batch]);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    };

    const fetchpartylist = async (selectedProperty, forceRefresh = false) => {
        setIsLoading(true);

        const prpcode =
            typeof selectedProperty === 'object'
                ? selectedProperty?.PrpCode
                : selectedProperty;

        const yearno = selectedYear?.slice(-2);

        const prptypeRaw =
            typeof selectedProperty === 'object'
                ? selectedProperty?.PrpOf ?? selectedProperty?.PrpCode
                : selectedProperty;

        const prptype = normalizePrptype(prptypeRaw);

        const payload = {
            prpcode,
            prptype,
            yearno,
            strcode: "0",
            txntype: "sales_order",
            partytype: "p",
            type: "s",
            page: 1,
            limit: 20,
            search: "",
            isceo: 0,
            partype: 0,
            grntype: "",
            fetch: "",
            acccode: "",
            billdate: "",
            strtype: "",
            isfaint: "",
            user_id: 1,
        };

        try {
            const response = await axios.get(
                `${API}/api/mobaccountbasic`,
                getRequestConfig({ params: payload })
            );

            console.log("✅ mobaccountbasic RESPONSE:", response.data);

            const rawData =
                response?.data?.response?.data ||
                response?.data?.data ||
                [];

            if (response.data?.success && Array.isArray(rawData)) {

                const accounts = rawData.map(item => ({
                    ...item,

                    acccode: item.acccode || item.AccCode,

                    accname:
                        item.accountname ||
                        item.accname ||
                        item.AccName ||
                        "",

                    ParCode: item.acccode || item.AccCode,
                    ParName:
                        item.accountname ||
                        item.accname ||
                        item.AccName ||
                        ""
                }));

                setdashParty(accounts);

                if (accounts.length > 0) {
                    setSelectedDashParty([accounts[0]]);
                } else {
                    setSelectedDashParty([]);
                }

            } else {
                console.log("⚠️ No data from API");
                setdashParty([]);
                setSelectedDashParty([]);
            }

        } catch (error) {
            console.error("❌ mobaccountbasic error:", error);
            setdashParty([]);
            setSelectedDashParty([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedProperty !== null) {
            fetchpartylist(selectedProperty, false);
        } else {
            setSelectedDashParty([]);
        }
    }, [selectedProperty]);

    const handleReportClick = useCallback(async (action, party, mianPaylaod, selectedProperty) => {
        setIsLoading(true);
        const PrpOf = selectedProperty?.PrpOf || "";
        const PrpCode = selectedProperty?.PrpCode || "";

        try {
            const payloadLedger = {
                prptype: PrpOf,
                prpcodes: PrpCode,
                parcodes: [party.ParCode],
                yearno: selectedYear?.slice(0, 4).slice(-2),
                mheads: [],
                sheads: [],
                contras: [],
                inverse: [],
                fromdate: "",
                todate: "",
                reportytype: 0,
                showopening: 1,
                display: 1,
                showinternal: -1,
                txntype: "mob_party_dashboard",
                rptid: 1635,
                rptaction: "get_collection_comman_rpt",
                export: "",
                grpby: "party"
            }
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            console.log(`${API}/api/get_report`)

            const responseledger = await axios.post(`${API}/api/get_report`, payloadLedger, { headers });

            console.log('++++++++++I am Calling4 Table', payloadLedger, responseledger);

            if (responseledger.data.success) {

                setLedgerData(responseledger.data.response.data.get_ledger_data || []);
                setOutstandingData(responseledger.data.response.data.get_outstanding_data || []);
                setCustomerRateData(responseledger.data.response.data.get_customer_rate || []);
            }

        } catch (error) {
            setIsLoading(false);
            console.error("Error in dashAccount:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (fromDate && toDate && selectedYear) {
            fetchData();
        }
    }, []);

    const handleDashPrpSelect = (prp: DashPrp[]) => {
        setSelectedDashPrp(prp);
    };
    const handleDashPartySelect = (party: DashParty[]) => {
        setSelectedDashParty(party);
    };
    const handleDashSexeSelect = (sexe: DashSexe[]) => {
        setSelectedDashSexe(sexe);
    };
    const handleDashAccountSelect = (acc: DashAccount[]) => {
        setSelectedDashAccount(acc);
    };
    const handleDashSubHeadSelect = (sub: DashSubHead[]) => {
        setSelectedDashSubHead(sub);
    };
    const handleItemSelect = (items: ItemData[]) => {
        setSelectedItems(items);
    };
    const handleItemStatusChange = (status: ItemStatus) => {
        setSelectedItemStatus(status);
    };
    const DASHBOARD_COLORS = [
        ['#0F2027', '#203A43'],
        ['#141E30', '#243B55'],
        ['#232526', '#414345'],
        ['#1D2671', '#C33764'],
        ['#0B486B', '#3B8686'],
        ['#42275A', '#734B6D'],
        ['#283048', '#859398'],
        ['#16222A', '#3A6073'],
    ];

    const formatIndianNumber = (value: any) => {
        if (!value && value !== 0) return "0";

        const cleanedValue = typeof value === 'string' ? value.replace(/,/g, '') : value;
        const num = parseFloat(cleanedValue);

        if (isNaN(num)) return "0";

        const integerValue = Math.floor(num);

        return integerValue.toLocaleString('en-IN');
    };

    const DashboardGrid = ({ cards, onCardPress, activeSlab }) => {
        const numColumns = Platform.isPad ? 4 : 2;

        const renderItem = ({ item, index }) => {
            const isActive = activeSlab === item.slab;
            const isDisabled = parseFloat(item.summary.replace(/,/g, '')) === 0;
            const colors = DASHBOARD_COLORS[index % DASHBOARD_COLORS.length];

            return (
                <TouchableOpacity
                    activeOpacity={isDisabled ? 1 : 0.9}
                    onPress={isDisabled ? undefined : () => onCardPress(item)}
                    style={[
                        styles.dashboardCard,
                        isActive && styles.activeDashboardCard,
                    ]}
                    disabled={isDisabled}
                >
                    <LinearGradient
                        colors={
                            isActive
                                ? [theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]
                                : isDisabled
                                    ? ['#cccccc', '#cccccc']
                                    : colors
                        }
                        style={styles.dashboardCardInner}
                    >
                        <Text
                            style={[
                                styles.dashboardCaption,
                                isActive && styles.activeText,
                                isDisabled && styles.disabledText,
                            ]}
                        >
                            {isActive && isLoading ? 'Loading...' : item.caption?.toUpperCase()}
                        </Text>
                        <Text
                            style={[
                                styles.dashboardValue,
                                isActive && styles.activeText,
                                isDisabled && styles.disabledText,
                            ]}
                        >
                            ₹ {formatIndianNumber(item.summary)}
                        </Text>
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

    const SummaryTable1 = () => {
        const summaryColumns = [
            { key: 'acccode', label: 'Code', width: 160, align: 'left' },
            { key: 'accname', label: 'Name', width: 100, align: 'right' },
            { key: 'ParType', label: 'Type', width: 100, align: 'right' },
            { key: 'SHName', label: 'Sh Name', width: 120, align: 'right' },
            { key: 'Status', label: 'Status', width: 120, align: 'right' },
            { key: 'bkrcode', label: 'PDC Amount', width: 100, align: 'right' },
            { key: 'bkrname', label: '0-30', width: 100, align: 'right' },
            { key: 'value', label: '31-60', width: 100, align: 'right' },
        ];

        const columnsToFormat = ['Total', 'advance', 'onaccount', 'nclramt', 'pdcamt'];

        const columnsToSum = ['Total', 'advance', 'onaccount', 'nclramt', 'pdcamt', 'slab1', 'slab2', 'slab3', 'slab4', 'slab5', 'crlimit'];

        const calculateTotals = () => {
            const totals = {};
            columnsToSum.forEach(key => {
                totals[key] = filteredData.reduce((sum, item) => {
                    const value = parseFloat(item[key]) || 0;
                    return sum + value;
                }, 0);
            });
            return totals;
        };

        const formatIndianNumber = (value) => {
            return value.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        };

        const totals = calculateTotals();

        const totalWidth = summaryColumns.reduce((sum, c) => sum + c.width, 0) + 120;

        const Header = () => (
            <View style={styles.tableHeader}>
                <Text style={[styles.headerText, { width: 160, textAlign: 'center' }]}>
                    Account Name
                </Text>
                <Text style={[styles.headerText, { width: 100, textAlign: 'center' }]}>
                    Total
                </Text>
                <Text style={[styles.headerText, { width: 80, textAlign: 'center' }]}>
                    Actions
                </Text>
                {summaryColumns.slice(2).map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.headerText,
                            { width: col.width, textAlign: col.align }
                        ]}
                    >
                        {col.label}
                    </Text>
                ))}
            </View>
        );

        const Footer = () => (
            <View style={[styles.tableHeader]}>
                <Text style={[styles.headerText, { width: 160, textAlign: 'center' }]}>
                    Totals
                </Text>
                <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>
                    {formatIndianNumber(totals['Total'])}
                </Text>
                <Text style={[styles.headerText, { width: 80, textAlign: 'center' }]}>
                    {/* Empty cell for Actions column */}
                </Text>
                {summaryColumns.slice(2).map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.headerText,
                            { width: col.width, textAlign: col.align }
                        ]}
                    >
                        {columnsToSum.includes(col.key) ? formatIndianNumber(totals[col.key]) : ''}
                    </Text>
                ))}
            </View>
        );

        const Row = React.memo(({ item }) => (
            <View style={styles.tableRow}>
                <Text
                    style={[styles.rowText, { width: 160, textAlign: 'left' }]}
                    numberOfLines={2}
                >
                    {item.AccName}
                </Text>
                <Text
                    style={[styles.rowText, { width: 100, textAlign: 'right' }]}
                    numberOfLines={2}
                >
                    {columnsToFormat.includes('Total') ? formatIndianNumber(parseFloat(item.Total) || 0) : item.Total}
                </Text>
                <View style={[styles.actionColumn, { width: 80 }]}>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedAccCode(item.AccCode);
                            setModalVisible(true);
                        }}
                    >
                        <Icon
                            name="info"
                            size={20}
                            color={theme.BRAND_GRADIENT_END}
                        />
                    </TouchableOpacity>
                </View>
                {summaryColumns.slice(2).map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.rowText,
                            { width: col.width, textAlign: col.align }
                        ]}
                        numberOfLines={2}
                    >
                        {columnsToFormat.includes(col.key) ? formatIndianNumber(parseFloat(item[col.key]) || 0) : item[col.key]}
                    </Text>
                ))}
            </View>
        ));

        return (
            <View style={styles.tableWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ minWidth: totalWidth }}>
                        <Header />
                        <FlatList
                            data={filteredData}
                            renderItem={({ item }) => <Row item={item} />}
                            keyExtractor={(item) => item.AccCode}
                            getItemLayout={(_, index) => ({
                                length: ROW_HEIGHT,
                                offset: ROW_HEIGHT * index,
                                index,
                            })}
                            initialNumToRender={20}
                            maxToRenderPerBatch={20}
                            windowSize={10}
                            removeClippedSubviews
                            showsVerticalScrollIndicator={false}
                        />
                        <Footer />
                    </View>
                </ScrollView>
            </View>
        );
    };
    const SummaryAdvanceTable = () => {
        const summaryColumns = [
            { key: 'AccName', label: 'Account Name', width: 160, align: 'left' },
            { key: 'advance', label: 'Advance', width: 100, align: 'right' },
            { key: 'Total', label: 'Total', width: 100, align: 'right' },
            { key: 'onaccount', label: 'On Account', width: 120, align: 'right' },
            { key: 'nclramt', label: 'NCL Amount', width: 120, align: 'right' },
            { key: 'pdcamt', label: 'PDC Amount', width: 100, align: 'right' },
            { key: 'slab1', label: '0-30', width: 100, align: 'right' },
            { key: 'slab2', label: '31-60', width: 100, align: 'right' },
            { key: 'slab3', label: '61-90', width: 100, align: 'right' },
            { key: 'slab4', label: '91-Above', width: 100, align: 'right' },
            { key: 'slab5', label: 'Slab5', width: 100, align: 'right' },
            { key: 'crday', label: 'Crday', width: 100, align: 'center' },
            { key: 'sename', label: 'Sename', width: 100, align: 'left' },
            { key: 'AccCode', label: 'Acc Code', width: 120, align: 'center' },
            { key: 'crlimit', label: 'Crlimit', width: 120, align: 'right' },
            { key: 'BrkName', label: 'Brk Name', width: 120, align: 'center' },
        ];

        const columnsToFormat = ['Total', 'advance', 'onaccount', 'nclramt', 'pdcamt', 'slab1', 'slab2', 'slab3', 'slab4', 'slab5', 'crlimit'];

        const columnsToSum = ['Total', 'advance', 'onaccount', 'nclramt', 'pdcamt', 'slab1', 'slab2', 'slab3', 'slab4', 'slab5', 'crlimit'];

        const formatIndianNumber = (value) => {
            if (!value && value !== 0) return "0";
            const cleanedValue = typeof value === 'string' ? value.replace(/,/g, '') : value;
            const num = parseFloat(cleanedValue);
            if (isNaN(num)) return "0";
            return Math.floor(num).toLocaleString('en-IN');
        };

        const calculateTotals = () => {
            const totals = {};
            columnsToSum.forEach(key => {
                totals[key] = filteredData.reduce((sum, item) => {
                    const value = parseFloat(item[key]) || 0;
                    return sum + value;
                }, 0);
            });
            return totals;
        };

        const totals = calculateTotals();

        const totalWidth = summaryColumns.reduce((sum, c) => sum + c.width, 0) + 120;

        const Header = () => (
            <View style={styles.tableHeader}>
                <Text style={[styles.headerText, { width: 160, textAlign: 'center' }]}>
                    Account Name
                </Text>
                <Text style={[styles.headerText, { width: 100, textAlign: 'center' }]}>
                    Advance
                </Text>
                <Text style={[styles.headerText, { width: 80, textAlign: 'center' }]}>
                    Actions
                </Text>
                <Text style={[styles.headerText, { width: 100, textAlign: 'center' }]}>
                    Total
                </Text>

                {summaryColumns.slice(3).map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.headerText,
                            { width: col.width, textAlign: col.align }
                        ]}
                    >
                        {col.label}
                    </Text>
                ))}
            </View>
        );

        const Footer = () => (
            <View style={[styles.tableHeader]}>
                <Text style={[styles.headerText, { width: 160, textAlign: 'center' }]}>
                    Totals
                </Text>
                <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>
                    {formatIndianNumber(totals['advance'])}
                </Text>
                <Text style={[styles.headerText, { width: 80, textAlign: 'center' }]}>
                    {/* Empty cell for Actions column */}
                </Text>
                <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>
                    {formatIndianNumber(totals['Total'])}
                </Text>

                {summaryColumns.slice(3).map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.headerText,
                            { width: col.width, textAlign: col.align }
                        ]}
                    >
                        {columnsToSum.includes(col.key) ? formatIndianNumber(totals[col.key]) : ''}
                    </Text>
                ))}
            </View>
        );

        const Row = React.memo(({ item }) => (
            <View style={styles.tableRow}>
                <Text
                    style={[styles.rowText, { width: 160, textAlign: 'left' }]}
                    numberOfLines={2}
                >
                    {item.AccName}
                </Text>
                <Text
                    style={[styles.rowText, { width: 100, textAlign: 'right' }]}
                    numberOfLines={2}
                >
                    {formatIndianNumber(item.advance)}
                </Text>
                <View style={[styles.actionColumn, { width: 80 }]}>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedAccCode(item.AccCode);
                            setModalVisible(true);
                        }}
                    >
                        <Icon
                            name="info"
                            size={20}
                            color={theme.BRAND_GRADIENT_END}
                        />
                    </TouchableOpacity>
                </View>
                <Text
                    style={[styles.rowText, { width: 100, textAlign: 'right' }]}
                    numberOfLines={2}
                >
                    {formatIndianNumber(item.Total)}
                </Text>

                {summaryColumns.slice(3).map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.rowText,
                            { width: col.width, textAlign: col.align }
                        ]}
                        numberOfLines={2}
                    >
                        {formatIndianNumber(item[col.key])}
                    </Text>
                ))}
            </View>
        ));

        return (
            <View style={styles.tableWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ minWidth: totalWidth }}>
                        <Header />
                        <FlatList
                            data={filteredData}
                            renderItem={({ item }) => <Row item={item} />}
                            keyExtractor={(item) => item.AccCode}
                            getItemLayout={(_, index) => ({
                                length: ROW_HEIGHT,
                                offset: ROW_HEIGHT * index,
                                index,
                            })}
                            initialNumToRender={20}
                            maxToRenderPerBatch={20}
                            windowSize={10}
                            removeClippedSubviews
                            showsVerticalScrollIndicator={false}
                        />
                        <Footer />
                    </View>
                </ScrollView>
            </View>
        );
    };

    const OnAccountSummaryTable = () => {
        const summaryColumns = [
            { key: 'AccName', label: 'Account Name', width: 160, align: 'center' },
            { key: 'amount', label: 'Total', width: 100, align: 'right' },
            { key: 'actions', label: 'Actions', width: 80, align: 'center' },
            { key: 'crday', label: 'Crday', width: 100, align: 'right' },
            { key: 'crlimit', label: 'Crlimit', width: 120, align: 'right' },
            { key: 'sexename', label: 'Sexename', width: 120, align: 'right' },
            { key: 'AccCode', label: 'Acc Code', width: 100, align: 'right' },
            { key: 'BrkName', label: 'Brk Name', width: 120, align: 'center' },
        ];

        const columnsToFormat = ['amount', 'crlimit'];

        const columnsToSum = ['amount', 'crlimit'];

        const calculateTotals = () => {
            const totals = {};
            columnsToSum.forEach(key => {
                totals[key] = filteredData.reduce((sum, item) => {
                    const value = parseFloat(item[key]) || 0;
                    return sum + value;
                }, 0);
            });
            return totals;
        };

        const formatIndianNumber = (value) => {
            return value.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        };

        const totals = calculateTotals();

        const totalWidth = summaryColumns.reduce((sum, c) => sum + c.width, 0);

        const Header = () => (
            <View style={styles.tableHeader}>
                {summaryColumns.map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.headerText,
                            { width: col.width, textAlign: col.align }
                        ]}
                    >
                        {col.label}
                    </Text>
                ))}
            </View>
        );

        const Footer = () => (
            <View style={[styles.tableHeader]}>
                {summaryColumns.map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.headerText,
                            { width: col.width, textAlign: col.align }
                        ]}
                    >
                        {col.key === 'AccName' ? 'Totals' :
                            columnsToSum.includes(col.key) ? formatIndianNumber(totals[col.key]) : ''}
                    </Text>
                ))}
            </View>
        );

        const Row = React.memo(({ item }) => (
            <View style={styles.tableRow}>
                <Text
                    style={[styles.rowText, { width: 160, textAlign: 'left' }]}
                    numberOfLines={2}
                >
                    {item.AccName}
                </Text>

                <Text
                    style={[styles.rowText, { width: 100, textAlign: 'right' }]}
                    numberOfLines={2}
                >
                    {columnsToFormat.includes('amount') ? formatIndianNumber(parseFloat(item.amount) || 0) : item.amount}
                </Text>

                <View style={[styles.actionColumn, { width: 80 }]}>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedAccCode(item.AccCode);
                            setModalVisible(true);
                        }}
                    >
                        <Icon
                            name="info"
                            size={20}
                            color={theme.BRAND_GRADIENT_END}
                        />
                    </TouchableOpacity>
                </View>

                {summaryColumns.slice(3).map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.rowText,
                            { width: col.width, textAlign: col.align }
                        ]}
                        numberOfLines={2}
                    >
                        {columnsToFormat.includes(col.key) ? formatIndianNumber(parseFloat(item[col.key]) || 0) : item[col.key]}
                    </Text>
                ))}
            </View>
        ));

        return (
            <View style={styles.tableWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ minWidth: totalWidth }}>
                        <Header />
                        <FlatList
                            data={filteredData}
                            renderItem={({ item }) => <Row item={item} />}
                            keyExtractor={(item) => item.AccCode}
                            getItemLayout={(_, index) => ({
                                length: ROW_HEIGHT,
                                offset: ROW_HEIGHT * index,
                                index,
                            })}
                            initialNumToRender={20}
                            maxToRenderPerBatch={20}
                            windowSize={10}
                            removeClippedSubviews
                            showsVerticalScrollIndicator={false}
                        />
                        <Footer />
                    </View>
                </ScrollView>
            </View>
        );
    };

    const DetailTable = () => {

        const calcValue = (item) => {
            return `${item.NTRANDATE}-${item.TRANID}`;
        };

        const sortedData = [...filteredDetails].sort((a, b) => {
            const keyA = calcValue(a);
            const keyB = calcValue(b);
            return keyA.localeCompare(keyB);
        });

        let cumulativeData = [];
        sortedData.forEach((item, index) => {
            const currentCUMBAL = parseFloat(item.CUMBAL) || 0;

            if (index === 0) {
                cumulativeData.push({
                    ...item,
                    Cumulative: currentCUMBAL.toString(),
                });
            } else {
                const prevCumulative = parseFloat(cumulativeData[index - 1].Cumulative) || 0;
                const newCumulative = prevCumulative + currentCUMBAL;
                cumulativeData.push({
                    ...item,
                    Cumulative: newCumulative.toString(),
                });
            }
        });

        const finalData = [...cumulativeData].reverse();

        const detailColumns = [
            { key: 'TRANDATE', label: 'Date', width: 120, align: 'center' },
            { key: 'VOUNO', label: 'Vou.No.', width: 120, align: 'left' },
            { key: 'CUMBAL', label: 'Balance', width: 120, align: 'right' },
            { key: 'DUEDAY', label: 'Due Days', width: 120, align: 'center' },
            { key: 'Cumulative', label: 'Cumulative', width: 120, align: 'center' },
        ];

        const columnsToFormat = ['CUMBAL', 'Cumulative'];

        const calculateTotals = () => {
            const totals = { CUMBAL: 0, Cumulative: 0 };
            finalData.forEach(item => {
                totals.CUMBAL += parseFloat(item.CUMBAL) || 0;
                totals.Cumulative += parseFloat(item.Cumulative) || 0;
            });
            return totals;
        };

        const formatIndianNumber = (value) => {
            if (!value && value !== 0) return "0";
            const num = parseFloat(value);
            return num.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        };

        const totals = calculateTotals();
        const totalWidth = detailColumns.reduce((sum, c) => sum + c.width, 0) + 160;

        const Header = () => (
            <View style={styles.tableHeader}>
                <Text style={[styles.headerText, { width: 160, textAlign: 'center' }]}>
                    Type
                </Text>
                {detailColumns.map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.headerText,
                            { width: col.width, textAlign: col.align }
                        ]}
                    >
                        {col.label}
                    </Text>
                ))}
            </View>
        );

        const Footer = () => (
            <View style={[styles.tableHeader]}>
                <Text style={[styles.headerText, { width: 160, textAlign: 'center' }]}>
                    Totals
                </Text>
                <Text style={[styles.headerText, { width: 120, textAlign: 'center' }]}></Text>
                <Text style={[styles.headerText, { width: 120, textAlign: 'center' }]}></Text>
                <Text style={[styles.headerText, { width: 120, textAlign: 'right' }]}>
                    {formatIndianNumber(totals.CUMBAL)}
                </Text>
                <Text style={[styles.headerText, { width: 120, textAlign: 'center' }]}></Text>
                <Text style={[styles.headerText, { width: 120, textAlign: 'center' }]}>
                    {formatIndianNumber(totals.Cumulative)}
                </Text>
            </View>
        );

        const Row = React.memo(({ item }) => (
            <View style={styles.tableRow}>
                <Text
                    style={[styles.rowText, { width: 160, textAlign: 'center' }]}
                    numberOfLines={2}
                >
                    {item.TYPE}
                </Text>
                {detailColumns.map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.rowText,
                            { width: col.width, textAlign: col.align }
                        ]}
                        numberOfLines={2}
                    >
                        {columnsToFormat.includes(col.key)
                            ? formatIndianNumber(item[col.key])
                            : item[col.key]}
                    </Text>
                ))}
            </View>
        ));

        return (
            <View style={styles.tableWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ minWidth: totalWidth }}>
                        <Header />
                        <FlatList
                            data={finalData}
                            renderItem={({ item }) => <Row item={item} />}
                            keyExtractor={(item, index) => `${calcValue(item)}-${index}`}
                            getItemLayout={(_, index) => ({
                                length: ROW_HEIGHT,
                                offset: ROW_HEIGHT * index,
                                index,
                            })}
                            initialNumToRender={20}
                            maxToRenderPerBatch={20}
                            windowSize={10}
                            removeClippedSubviews
                            showsVerticalScrollIndicator={false}
                        />
                        <Footer />
                    </View>
                </ScrollView>
            </View>
        );
    };
    const OnAccountDetailTable = () => {
        const detailColumns = [
            { key: 'chqno', label: 'Che.No.', width: 120, align: 'center' },
            { key: 'chqdate', label: 'Chq.Date', width: 120, align: 'left' },
            { key: 'remark', label: 'Remark', width: 120, align: 'right' },
            { key: 'clrdate', label: 'Clr.Date', width: 120, align: 'center' },
            { key: 'AMOUNT', label: 'Amount', width: 140, align: 'center' },
        ];

        const columnsToFormat = ['AMOUNT'];

        const columnsToSum = ['AMOUNT'];

        const calculateTotals = () => {
            const totals = {};
            columnsToSum.forEach(key => {
                totals[key] = filteredDetails.reduce((sum, item) => {
                    const value = parseFloat(item[key]) || 0;
                    return sum + value;
                }, 0);
            });
            return totals;
        };

        const formatIndianNumber = (value) => {
            return value?.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        };

        const totals = calculateTotals();

        const totalWidth = detailColumns.reduce((sum, c) => sum + c.width, 0);

        const Header = () => (
            <View style={styles.tableHeader}>
                {detailColumns.map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.headerText,
                            { width: col.width, textAlign: col.align }
                        ]}
                    >
                        {col.label}
                    </Text>
                ))}
            </View>
        );

        const Footer = () => (
            <View style={[styles.tableHeader]}>
                {detailColumns.map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.headerText,
                            { width: col.width, textAlign: col.align }
                        ]}
                    >
                        {col.key === 'AMOUNT' ? formatIndianNumber(totals[col.key]) : ''}
                    </Text>
                ))}
            </View>
        );

        const Row = React.memo(({ item }) => (
            <View style={styles.tableRow}>
                {detailColumns.map(col => (
                    <Text
                        key={col.key}
                        style={[
                            styles.rowText,
                            {
                                width: col.width,
                                textAlign: col.key === 'AMOUNT' ? 'right' : col.align,
                                paddingRight: col.key === 'AMOUNT' ? 10 : 0, // Add right padding for AMOUNT
                            }
                        ]}
                        numberOfLines={2}
                    >
                        {columnsToFormat.includes(col.key) ? formatIndianNumber(parseFloat(item[col.key]) || 0) : item[col.key]}
                    </Text>
                ))}
            </View>
        ));

        return (
            <View style={styles.tableWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ minWidth: totalWidth }}>
                        <Header />
                        <FlatList
                            data={filteredDetails}
                            renderItem={({ item }) => <Row item={item} />}
                            keyExtractor={(item, index) => `${item.ACCCODE}-${index}`}
                            getItemLayout={(_, index) => ({
                                length: ROW_HEIGHT,
                                offset: ROW_HEIGHT * index,
                                index,
                            })}
                            initialNumToRender={20}
                            maxToRenderPerBatch={20}
                            windowSize={10}
                            removeClippedSubviews
                            showsVerticalScrollIndicator={false}
                        />
                        <Footer />
                    </View>
                </ScrollView>
            </View>
        );
    };

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);
    const closeDrawer123 = () => setSummaryDrawerVisible(false);

    return (
        <>
            <HeaderBar
                userName={username}
                onSearch={setSearchQueryPOT}
                placeholder="Search parties..."
            />
            <TouchableOpacity style={styles.listIconContainer} onPress={openDrawer}>
                <Icon name="list" size={24} color="white" />
            </TouchableOpacity>

            {summaryDrawerVisible ? (<><View style={styles.drawerContainer}>

                <View style={{ flex: 1, paddingHorizontal: 10, }}>
                    <SummaryTable
                        data={getdashParty}
                        searchQuery={searchQueryPOT}
                        onRowPress={async (row) => {
                            console.log("CLICKED:", row);
                            setSelectedParties(row);
                            setSelectedAccCode(row.acccode);
                            setPartyOverlayVisible(true);
                            await handleReportClick("INIT", row, mianPaylaod, selectedProperty);
                        }}
                    />

                </View>

            </View></>) : (<>
                <View style={{ alignContent: 'center' }} ><Text>No Party Data Found!</Text></View></>)}

            <Modal
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
                animationType="slide"
                style={styles.fullScreenModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.drawerTitle}>
                                {`Receivables > ${getActiveCardDetails && getActiveCardDetails?.caption} summary > details`}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Icon name="close" size={24} color={theme.BRAND_GRADIENT_END} />
                            </TouchableOpacity>
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
                        {getActiveCardDetails?.caption == 'On Account' ? <OnAccountDetailTable /> : <DetailTable />}

                    </View>
                </View>
            </Modal>
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
                getdashParty={getdashParty}
                setSelectedDashParty={setSelectedDashParty}
                selectedDashParty={selectedDashParty}
                getdashSubHead={getdashSubHead}
                setSelectedDashSubHead={setSelectedDashSubHead}
                selectedDashSubHead={selectedDashSubHead}
                getdashSexe={getdashSexe}
                setSelectedDashSexe={setSelectedDashSexe}
                selectedDashSexe={selectedDashSexe}
                dashAccount={dashAccount}
                getAccountLoading={getAccountLoading}
                getdashPropertyLoading={getdashPropertyLoading}
                getdashPartyLoading={getdashPartyLoading}
                getdashSubHeadLoading={getdashSubHeadLoading}
                getdashSexeLoading={getdashSexeLoading}
                getdashAccount={getdashAccount}
                setSelectedDashAccount={setSelectedDashAccount}
                selectedDashAccount={selectedDashAccount}
                getdashAccountLoading={getdashAccountLoading}
                setAccountLoading={setAccountLoading}
                yearOptions={yearOptions}
                getPropertyData={getPropertyData}
                setSelectedProperty={setSelectedProperty}
                selectedProperty={selectedProperty}
                dashParty={dashParty}
            />

            <PartyOverlay
                visible={partyOverlayVisible}
                onClose={() => setPartyOverlayVisible(false)}
                party={selectedParties}
                onActionClick={(action) => {
                    setAction(action);
                    setLedgerOverlayVisible(true);
                }}
                loading={isLoading}
                selectedProperty={selectedProperty}
            />

            <LedgerOverlay
                visible={ledgerOverlayVisible}
                onClose={() => setLedgerOverlayVisible(false)}
                data={ledgerData}
                styles={styles}
                party={selectedParties}
                out_data={outstandingData}
                customer_rate_data={CustomerRateData}
                action={action}
            />
        </>
    );
};

const styles = StyleSheet.create({
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
    tableWrapper: {
        flex: 1,
        maxHeight: 550,
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
        backgroundColor: theme.BRAND_GRADIENT_END,
        minWidth: '100%',
    },
    headerText: {
        color: theme.TEXT_WHITE,
        fontWeight: 'bold',
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
        backgroundColor: '#fff',
    },
    rowText: {
        padding: 5,
        flexWrap: 'wrap',
        minHeight: 40,
        fontSize: 12,
        color: '#000',
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
    syncToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
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
        width: '100%',
        height: '100%',
    },
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
    listIconContainer: {
        position: 'absolute',
        top: 85,
        right: 20,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        borderRadius: 3,
        padding: 4,
    },
    narrationBar: {
        paddingVertical: 0,
        marginHorizontal: 0,
        marginTop: 1,
        // marginBottom: 8,
        overflow: 'hidden',
        shadowColor: theme.SHADOW,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        width: '100%',
    },
    dashboardCard: {
        flex: 1,
        height: 130,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',

        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
    },
    dashboardCardInner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    dashboardCaption: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.80)',
        marginBottom: 6,
        fontWeight: '600',
        letterSpacing: 0.8,
    },

    dashboardValue: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
    },
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
        color: '#666',
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
        color: theme.BRAND_GRADIENT_END,
    },
    drawerSearch: {
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
        color: '#005F73',
    },
});

export default PartyDashboard;
