import AppAlert from '@/common/utils/appAlert';
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { API } from '../../../common/API/dynamicAPI';
import { debounce } from 'lodash';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HeaderBarwithBack from '../../HeaderBarwithBack/HeaderBarwithBack';
import theme from '../../../android/app/src/theme';
import FullScreenLoader from '../../FullScreenLoader/FullScreenLoader';

const { width } = Dimensions.get('window');
const isTablet = width >= 600;

interface PartyDetail {
    Dsnname: string;
    chalamt: string;
    chalqty: string;
    noofchallan: string;
    parcode: string;
    partyname: string;
    pending: string;
    pendingamt: string;
    shdname: string;
    sodate: string;
    sono: string;
    srno: string;
    status: string;
    totamt: string;
    totmtr: string;
    uid: string;
}

interface PartySummary {
    chalamt: string;
    chalqty: string;
    noofchallan: string;
    pending: string;
    pendingamt: string;
    totamt: string;
    totmtr: string;
    linebar: string;
}

interface SOPartyDetailsProps {
    route: {
        params: {
            party: any;
        };
    };
    token: string;
    navigation: any;
    username: string;
}

const SOPartyDetails: React.FC<SOPartyDetailsProps> = ({ route, token, navigation, username }) => {
    const { party, selectedSalesExes } = route?.params || "";
    const [getDetailData, setDetailData] = useState<{
        partydetails: PartyDetail[];
        party_summary: PartySummary[];
    } | null>(null);
    const [renderedOrders, setRenderedOrders] = useState<PartyDetail[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [apiloading, setAPILoading] = useState(false);
    const [isAccordionOpen, setIsAccordionOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [getChallanPayload, setChallanPayload] = useState({});
    const [getPartyName, setPartyName] = useState("");
    const [filteredOrders, setFilteredOrders] = useState<PartyDetail[]>([]);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const itemsPerPage = 50;

    useEffect(() => {
        const initializeApp = async () => {
            try {
                const parties_tracking_details = await AsyncStorage.getItem('parties_tracking_details');
                const parties_tracking_details_challan_payload = await AsyncStorage.getItem('parties_tracking_details_challan_payload');
                const parties_tracking_details_party_name = await AsyncStorage.getItem('parties_tracking_details_party_name');
                if (parties_tracking_details_challan_payload) {
                    setChallanPayload(parties_tracking_details_challan_payload ? JSON.parse(parties_tracking_details_challan_payload) : {});
                }
                if (parties_tracking_details) {
                    const data = JSON.parse(parties_tracking_details);
                    setDetailData(data);
                    setFilteredOrders(data.partydetails);
                    setRenderedOrders(data.partydetails.slice(0, itemsPerPage));
                }
                if (parties_tracking_details_party_name) {
                    setPartyName(parties_tracking_details_party_name);
                }
            } catch (error) {
                console.error("Initialization error:", error);
            }
        };
        initializeApp();
    }, []);

    useEffect(() => {
        const debouncedSearch = debounce(() => {
            if (!getDetailData) return;
            const query = searchQuery.toLowerCase();
            const filtered = getDetailData.partydetails.filter(
                (order) =>
                    order.sono.toLowerCase().includes(query) ||
                    order.Dsnname.toLowerCase().includes(query) ||
                    order.shdname.toLowerCase().includes(query) ||
                    order.parcode.toLowerCase().includes(query) ||
                    order.partyname.toLowerCase().includes(query) ||
                    order.sodate.toLowerCase().includes(query) ||
                    order.totmtr.toLowerCase().includes(query) ||
                    order.totamt.toLowerCase().includes(query) ||
                    order.chalqty.toLowerCase().includes(query) ||
                    order.chalamt.toLowerCase().includes(query) ||
                    order.status.toLowerCase().includes(query) ||
                    order.noofchallan.toLowerCase().includes(query) ||
                    order.pending.toLowerCase().includes(query) ||
                    order.pendingamt.toLowerCase().includes(query) ||
                    order.noofchallan.toLowerCase().includes(query) ||
                    order.status.toLowerCase().includes(query)
            );
            const sorted = [...filtered].sort((a, b) => {
                const dateA = new Date(a.sodate).getTime();
                const dateB = new Date(b.sodate).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });
            setFilteredOrders(sorted);
            setRenderedOrders(sorted.slice(0, itemsPerPage));
            setPage(1);
        }, 300);

        debouncedSearch();
        return () => debouncedSearch.cancel();
    }, [searchQuery, getDetailData, sortOrder]);

    // const loadMoreOrders = useCallback(() => {
    //     if (loading || !getDetailData || renderedOrders.length >= filteredOrders.length) return;

    //     setLoading(true);
    //     setTimeout(() => {
    //         const nextPage = page + 1;
    //         const startIndex = page * itemsPerPage;
    //         const endIndex = startIndex + itemsPerPage;
    //         setRenderedOrders(prev => [
    //             ...prev,
    //             ...filteredOrders.slice(startIndex, endIndex)
    //         ]);
    //         setPage(nextPage);
    //         setLoading(false);
    //     }, 500);
    // }, [page, loading, filteredOrders, renderedOrders]);
    const loadMoreOrders = useCallback(() => {
        if (loading || !getDetailData || renderedOrders.length >= filteredOrders.length) return;
        setLoading(true);
        setTimeout(() => {
            const nextPage = page + 1;
            const startIndex = page * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            setRenderedOrders(prev => [
                ...prev,
                ...filteredOrders.slice(startIndex, endIndex)
            ]);
            setPage(nextPage);
            setLoading(false);
        }, 500);
    }, [page, loading, filteredOrders, renderedOrders]);

    if (!getDetailData) {
        return (
            <>
                <HeaderBarwithBack
                    userName={username}
                    // header={party && party?.partyname || party || ""}
                    header={getPartyName || ""}
                    subHeader={'Manage your Sales Orders'}
                    backNavigateScreen={'Sales Order Tracking'}
                />
                <View style={styles.loadingContainer}>
                    <Text>Loading...</Text>
                </View>
            </>
        );
    }

    const summary = getDetailData.party_summary[0];
    const deliveryPercentage = Math.min(parseFloat(summary.linebar), 100);

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'CLOSED': return '#4CAF50';
            case 'PARTIAL': return '#FF9800';
            case 'PENDING': return '#F44336';
            default: return '#9E9E9E';
        }
    };

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

    const formatCurrency = (value: string) => {
        return `₹${formatNumber(value)}`;
    };

    const handleCardPress = async (order: PartyDetail) => {
        console.log("Selected Order Data:", JSON.stringify(order, null, 2));
        console.log("Selected Order Data123:", order, getChallanPayload);
        setAPILoading(true);
        // navigation.navigate('Taka Checking Entry View Data', { party: partyData.partyname });
        // navigation.navigate('Taka Checking Entry View Data');
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {


            let seArr = []
            let seArrCntr = 0;
            selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

                seArr[seArrCntr] = el.sexe;
                seArrCntr++;

            })
            // const yearValue = selectedYear.split('-')[1].substring(2);
            // const dsnCodes = selectedDesigns.map((design) => design.DsnCode);
            const payload = {
                ...getChallanPayload,
                fromdate: "",
                todate: "",
                uid: order.uid,
                srno: order.srno,
                sexes: seArr,
            };
            const response = await axios.post(`${API}/api/salesorderpartychallantracking`, payload, { headers });
            // const response = {
            //     "data": {
            //         "data": {
            //             "data_all": [
            //                 {
            //                     "chalno": "00001028/F",
            //                     "chaldate": "03/07/2025",
            //                     "chalqty": "191.250",
            //                     "uid": "370005541",
            //                     "dsnname": "PEANUT",
            //                     "shdname": "PRINT",
            //                     "chalsrno": "1",
            //                     "data": [
            //                         {
            //                             "chaluid": "370005541",
            //                             "stepname": "purchase",
            //                             "totalqty": "382.500",
            //                             "rate": "120.00000",
            //                             "amount": 45955
            //                         },
            //                         {
            //                             "chaluid": "370005542",
            //                             "stepname": "purchase",
            //                             "totalqty": "382.500",
            //                             "rate": "120.00000",
            //                             "amount": 85623
            //                         },
            //                         {
            //                             "chaluid": "370005543",
            //                             "stepname": "purchase",
            //                             "totalqty": "382.500",
            //                             "rate": "120.00000",
            //                             "amount": 741553
            //                         },
            //                         {
            //                             "chaluid": "370005544",
            //                             "stepname": "purchase",
            //                             "totalqty": "382.500",
            //                             "rate": "120.00000",
            //                             "amount": 96652
            //                         },
            //                         {
            //                             "chaluid": "370005545",
            //                             "stepname": "purchase",
            //                             "totalqty": "382.500",
            //                             "rate": "120.00000",
            //                             "amount": 884552
            //                         }
            //                     ]
            //                 },
            //                 {
            //                     "chalno": "00001029/F",
            //                     "chaldate": "03/07/2025",
            //                     "chalqty": "190.500",
            //                     "uid": "370005542",
            //                     "dsnname": "PEANUT",
            //                     "shdname": "PRINT",
            //                     "chalsrno": "1",
            //                     "data": [
            //                         {
            //                             "chaluid": "370005542",
            //                             "stepname": "purchase",
            //                             "totalqty": "381.000",
            //                             "rate": "120.00000",
            //                             "amount": 45720
            //                         }
            //                     ]
            //                 },
            //                 {
            //                     "chalno": "00001030/F",
            //                     "chaldate": "03/07/2025",
            //                     "chalqty": "194.500",
            //                     "uid": "370005544",
            //                     "dsnname": "PEANUT",
            //                     "shdname": "PRINT",
            //                     "chalsrno": "1",
            //                     "data": [
            //                         {
            //                             "chaluid": "370005544",
            //                             "stepname": "purchase",
            //                             "totalqty": "389.000",
            //                             "rate": "120.00000",
            //                             "amount": 46680
            //                         }
            //                     ]
            //                 },
            //                 {
            //                     "chalno": "00001031/F",
            //                     "chaldate": "03/07/2025",
            //                     "chalqty": "186.750",
            //                     "uid": "370005546",
            //                     "dsnname": "PEANUT",
            //                     "shdname": "PRINT",
            //                     "chalsrno": "1",
            //                     "data": [
            //                         {
            //                             "chaluid": "370005546",
            //                             "stepname": "purchase",
            //                             "totalqty": "373.500",
            //                             "rate": "120.00000",
            //                             "amount": 44820
            //                         }
            //                     ]
            //                 }
            //             ],
            //             "grandtotal": {
            //                 "purchase": 1526,
            //                 "jobin": 555,
            //                 "jobin_prod": 5654,
            //                 "Repack": 4585,
            //                 "Grading": 44565
            //             }
            //         },
            //         "success": true,
            //         "message": ""
            //     },
            //     "status": 200,
            //     "headers": {
            //         "access-control-allow-methods": "GET",
            //         "access-control-allow-origin": "*",
            //         "cache-control": "no-cache, private",
            //         "connection": "Keep-Alive",
            //         "content-type": "application/json; charset=utf-8",
            //         "date": "Mon, 23 Feb 2026 10:08:54 GMT",
            //         "keep-alive": "timeout=5, max=99",
            //         "server": "Apache/2.4.52 (Ubuntu)",
            //         "vary": "Authorization"
            //     },
            //     "config": {
            //         "transitional": {
            //             "silentJSONParsing": true,
            //             "forcedJSONParsing": true,
            //             "clarifyTimeoutError": false
            //         },
            //         "adapter": [
            //             "xhr",
            //             "http",
            //             "fetch"
            //         ],
            //         "transformRequest": [
            //             null
            //         ],
            //         "transformResponse": [
            //             null
            //         ],
            //         "timeout": 0,
            //         "xsrfCookieName": "XSRF-TOKEN",
            //         "xsrfHeaderName": "X-XSRF-TOKEN",
            //         "maxContentLength": -1,
            //         "maxBodyLength": -1,
            //         "env": {},
            //         "headers": {
            //             "Accept": "application/json, text/plain, */*",
            //             "Content-Type": "application/json",
            //             "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiODMzNTdkNjU4ZDFiYjJlMWJlYWU5Zjc4NmQzMTRmMDk5MDliNzExNWMwNmI2ZjkzNDA4NjA1OWE2OTc4ZmIxYjEwZTk1MjlhZmMzZTJiZTYiLCJpYXQiOjE3NzE1ODAzMzQsIm5iZiI6MTc3MTU4MDMzNCwiZXhwIjoxODAzMTE2MzM0LCJzdWIiOiIxIiwic2NvcGVzIjpbXX0.Rr1B55n70Lrm1qhyhB10tbaZkG1AzWz5SxrA86k4U9XQ7ZslNsb0SecVbQxn4Wd0MIFcMO87S7y1HDJcQAcL9W-aTWAH8RbIRldji8SYOl0P3YIOJJnN797q8IXXgJQLfBpWMKHwW1DYvoBlf75cBdVJs_JyJCRXbgo8HXS6mwlIZ2o-3wu3QYt41BtaYhlE-lNWGqs-pQT5-tIlfFh40a2wc3_xrwV-DHNH84KJcm6t7wS7N5_NJBYELRGxfVutdg71LZ2Y8ZsXSmOZTH9_ckEAsRRoDSC55k-9O9QykMJds4WfvzN7HsEm8mzy3GvxWKY1xgCGOC_5EW-zk0IN9yiqVdnh_ysRp5GABtID89u5Ob1NkwBg95HXnQL1BdUYEg0C1sI8hvzORM4e6utOOnhN7C1MbtgBM7hKZBaS-BODdtHG2o1-XaY_nTqBw_UwwiqmM7d8C683zMeutOjj62a1BwNRg3xB90SnqrNN174Wf0a-hzMZ4G7rt1t5XRPfZMXuHlNStjNKuQv-HRzMUoPQ02gqwoaht8vDh8cS78nooqWzOiLntIDfZyUmZji79t9dNLo_M9DrpCQxs8vPfoXkREOH0fHxzoXxgymbmoAkn_ESBZZk30AI1kzXaT2UYOK_rziBdxF1NQQGXJ3R4tzEt_yDlx_1Q3JhKhyNGIA",
            //             "X-Requested-with": "XMLHttpRequest"
            //         },
            //         "method": "post",
            //         "url": "https://apig.tms-webapp.com/api/salesorderpartychallantracking",
            //         "data": "{\"fromdate\":\"01-02-2026\",\"todate\":\"23-02-2026\",\"yearno\":\"26\",\"sexes\":\"0\",\"type\":\"all\",\"dsncodes\":[],\"parcode\":\"19996\",\"prptype\":\"S\",\"txntype\":\"prodorderlist\",\"uid\":\"1\",\"srno\":\"630032512\"}",
            //         "allowAbsoluteUrls": true
            //     },
            //     "request": {
            //         "UNSENT": 0,
            //         "OPENED": 1,
            //         "HEADERS_RECEIVED": 2,
            //         "LOADING": 3,
            //         "DONE": 4,
            //         "readyState": 4,
            //         "status": 200,
            //         "timeout": 0,
            //         "withCredentials": true,
            //         "upload": {},
            //         "_aborted": false,
            //         "_hasError": false,
            //         "_method": "POST",
            //         "_perfKey": "network_XMLHttpRequest_https://apig.tms-webapp.com/api/salesorderpartychallantracking",
            //         "_response": "{\"data\":{\"data_all\":[],\"grandtotal\":[]},\"success\":true,\"message\":\"\"}",
            //         "_url": "https://apig.tms-webapp.com/api/salesorderpartychallantracking",
            //         "_timedOut": false,
            //         "_trackingName": null,
            //         "_incrementalEvents": false,
            //         "_startTime": 8554836.9546,
            //         "_performanceLogger": {
            //             "_timespans": {
            //                 "network_XMLHttpRequest_https://apig.tms-webapp.com/api/checkdevice": {
            //                     "startTime": 8442043.8289,
            //                     "endTime": 8442216.0322,
            //                     "totalTime": 172.20329999923706
            //                 },
            //                 "network_XMLHttpRequest_https://apig.tms-webapp.com/api/salesordertracking": {
            //                     "startTime": 8453162.512,
            //                     "endTime": 8453343.5957,
            //                     "totalTime": 181.08369999937713
            //                 },
            //                 "network_XMLHttpRequest_https://apig.tms-webapp.com/api/salesorderpartytracking": {
            //                     "startTime": 8461953.8026,
            //                     "endTime": 8462145.5017,
            //                     "totalTime": 191.6991000007838
            //                 },
            //                 "network_XMLHttpRequest_http://10.0.2.2:8081/symbolicate": {
            //                     "startTime": 8463179.2969,
            //                     "endTime": 8463438.5036,
            //                     "totalTime": 259.2066999990493
            //                 },
            //                 "network_XMLHttpRequest_https://apig.tms-webapp.com/api/salesorderpartychallantracking": {
            //                     "startTime": 8480689.5179,
            //                     "endTime": 8480859.2388,
            //                     "totalTime": 169.72090000100434
            //                 }
            //             },
            //             "_extras": {},
            //             "_points": {
            //                 "initializeCore_start": 8440742.8791,
            //                 "initializeCore_end": 8441115.1147
            //             },
            //             "_pointExtras": {},
            //             "_closed": false
            //         },
            //         "responseHeaders": {
            //             "Access-Control-Allow-Origin": "*",
            //             "Content-Type": "application/json; charset=utf-8",
            //             "Access-Control-Allow-Methods": "GET",
            //             "Date": "Mon, 23 Feb 2026 10:08:54 GMT",
            //             "Vary": "Authorization",
            //             "Connection": "Keep-Alive",
            //             "Server": "Apache/2.4.52 (Ubuntu)",
            //             "Cache-Control": "no-cache, private",
            //             "Keep-Alive": "timeout=5, max=99"
            //         },
            //         "_requestId": null,
            //         "_headers": {
            //             "accept": "application/json, text/plain, */*",
            //             "content-type": "application/json",
            //             "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiODMzNTdkNjU4ZDFiYjJlMWJlYWU5Zjc4NmQzMTRmMDk5MDliNzExNWMwNmI2ZjkzNDA4NjA1OWE2OTc4ZmIxYjEwZTk1MjlhZmMzZTJiZTYiLCJpYXQiOjE3NzE1ODAzMzQsIm5iZiI6MTc3MTU4MDMzNCwiZXhwIjoxODAzMTE2MzM0LCJzdWIiOiIxIiwic2NvcGVzIjpbXX0.Rr1B55n70Lrm1qhyhB10tbaZkG1AzWz5SxrA86k4U9XQ7ZslNsb0SecVbQxn4Wd0MIFcMO87S7y1HDJcQAcL9W-aTWAH8RbIRldji8SYOl0P3YIOJJnN797q8IXXgJQLfBpWMKHwW1DYvoBlf75cBdVJs_JyJCRXbgo8HXS6mwlIZ2o-3wu3QYt41BtaYhlE-lNWGqs-pQT5-tIlfFh40a2wc3_xrwV-DHNH84KJcm6t7wS7N5_NJBYELRGxfVutdg71LZ2Y8ZsXSmOZTH9_ckEAsRRoDSC55k-9O9QykMJds4WfvzN7HsEm8mzy3GvxWKY1xgCGOC_5EW-zk0IN9yiqVdnh_ysRp5GABtID89u5Ob1NkwBg95HXnQL1BdUYEg0C1sI8hvzORM4e6utOOnhN7C1MbtgBM7hKZBaS-BODdtHG2o1-XaY_nTqBw_UwwiqmM7d8C683zMeutOjj62a1BwNRg3xB90SnqrNN174Wf0a-hzMZ4G7rt1t5XRPfZMXuHlNStjNKuQv-HRzMUoPQ02gqwoaht8vDh8cS78nooqWzOiLntIDfZyUmZji79t9dNLo_M9DrpCQxs8vPfoXkREOH0fHxzoXxgymbmoAkn_ESBZZk30AI1kzXaT2UYOK_rziBdxF1NQQGXJ3R4tzEt_yDlx_1Q3JhKhyNGIA",
            //             "x-requested-with": "XMLHttpRequest"
            //         },
            //         "_responseType": "",
            //         "_sent": true,
            //         "_lowerCaseResponseHeaders": {
            //             "access-control-allow-origin": "*",
            //             "content-type": "application/json; charset=utf-8",
            //             "access-control-allow-methods": "GET",
            //             "date": "Mon, 23 Feb 2026 10:08:54 GMT",
            //             "vary": "Authorization",
            //             "connection": "Keep-Alive",
            //             "server": "Apache/2.4.52 (Ubuntu)",
            //             "cache-control": "no-cache, private",
            //             "keep-alive": "timeout=5, max=99"
            //         },
            //         "_subscriptions": [],
            //         "responseURL": "https://apig.tms-webapp.com/api/salesorderpartychallantracking"
            //     }
            // }
            console.log("I am here:", response, payload);
            if (response.data.success === true) {
                setAPILoading(false);
                console.log("I am here:", response.data);
                // await AsyncStorage.setItem('parties_tracking_details', JSON.stringify(response.data.data));
                await AsyncStorage.setItem('parties_tracking_details_challan_response', JSON.stringify(response.data));
                navigation.navigate('SOPartyDetailsPart1', { party: order.partyname });
                // await saveLastViewedToCache(partyData.parcode);
                // setLastViewedParcode(partyData.parcode);
                // console.log("Response Data:", JSON.stringify(response.data.data, null, 2));
                console.log("Response Data:", response);
            }
        } catch (error) {
            setAPILoading(false);
            console.error("Error in handleCardPress:", error);
            AppAlert.alert("Error", "Failed to process party details");
        } finally {
            setAPILoading(false);
            // setTrackingLoader(false);
        }
    };

    const SummaryCard = ({ title, value1, label1, value2, label2, backgroundColor }: {
        title: string,
        value1: string,
        label1: string,
        value2: string,
        label2: string,
        backgroundColor: string
    }) => (
        <View style={[styles.summaryBox, { backgroundColor }]}>
            <Text style={styles.summaryTitle}>{title}</Text>
            <View style={styles.valueRow}>
                <Text style={styles.valueText}>{label1}: {value1}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.valueRow}>
                <Text style={styles.valueText}>{label2}: {value2}</Text>
            </View>
        </View>
    );

    const renderOrderCard = ({ item }: { item: PartyDetail }) => {
        const orderTotal = parseFloat(item.totmtr);
        const orderDelivered = parseFloat(item.chalqty);
        const orderPercentage = Math.min(
            orderTotal > 0 ? (orderDelivered / orderTotal) * 100 : 0,
            100
        );

        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => handleCardPress(item)}
            >
                <View style={styles.orderHeadermain}>
                    <Text style={styles.orderId}>{item.partyname}</Text>
                    {/* <Text style={[styles.orderStatus, { color: getStatusColor(item.status) }]}>
                        {item.status}
                    </Text>
                    <Icon name="chevron-right" size={20} color="#999" /> */}
                </View>
                <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>SO-{item.sono}</Text>
                    <Text style={[styles.orderStatus, { color: getStatusColor(item.status) }]}>
                        {item.status}
                    </Text>
                    <Icon name="chevron-right" size={20} color="#999" />
                </View>

                <Text style={styles.orderDate}>Sodate: {item.sodate} | Duedate: {item.duedate}</Text>
                <Text style={styles.designShadeText}>
                    {item.Dsnname} | Shade: {item.shdname}
                </Text>

                <View style={styles.orderStats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>TOTAL</Text>
                        <Text style={styles.statValue}>{formatValue(item.totmtr)}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>DELIVERED</Text>
                        <Text style={styles.statValue}>{formatValue(item.chalqty)}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>CHALLANS</Text>
                        <Text style={styles.statValue}>{item.noofchallan}</Text>
                    </View>
                </View>

                {item.status !== 'PENDING' && (
                    <View style={styles.orderProgressContainer}>
                        <View style={[
                            styles.progressBarSmall,
                            {
                                width: `${orderPercentage}%`,
                                backgroundColor: getStatusColor(item.status)
                            }
                        ]} />
                    </View>
                )}

                <Text style={styles.orderQty}>
                    Qty: {item.chalqty}/{item.totmtr}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <>
            {apiloading && <FullScreenLoader />}
            <HeaderBarwithBack
                userName={''}
                header={party && party?.partyname || party || ""}
                subHeader={'Manage your Sales Orders'}
                backNavigateScreen={'Sales Order Tracking'}
            />

            <View style={styles.searchContainer}>
                {apiloading ? <ActivityIndicator size="large" color={theme.BRAND_GRADIENT_END} /> : <TextInput
                    style={styles.searchInput}
                    placeholder="Search Sales Orders..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />}
            </View>

            {/* <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search Sales Orders..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View> */}

            <ScrollView style={styles.container}>
                <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => setIsAccordionOpen(!isAccordionOpen)}
                >
                    <Text style={styles.accordionTitle}>Summary</Text>
                    <Icon
                        name={isAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={20}
                        color="#333"
                    />
                </TouchableOpacity>

                {isAccordionOpen && (
                    <>
                        <View style={styles.summaryContainer}>
                            <SummaryCard
                                title="Total"
                                value1={formatValue(summary.totamt)}
                                label1="Amount"
                                value2={summary.totmtr}
                                label2="Meter"
                                backgroundColor="#E3F2FD"
                            />

                            <SummaryCard
                                title="Delivered"
                                value1={formatValue(summary.chalamt)}
                                label1="Amount"
                                value2={summary.chalqty}
                                label2="Meter"
                                backgroundColor="#E8F5E8"
                            />

                            <SummaryCard
                                title="Pending"
                                value1={formatValue(summary.pendingamt)}
                                label1="Amount"
                                value2={summary.pending}
                                label2="Meter"
                                backgroundColor="#FFF3E0"
                            />

                            <SummaryCard
                                title="Orders"
                                value1={summary.noofchallan}
                                label1="Count"
                                value2={`${deliveryPercentage}%`}
                                label2="Delivery"
                                backgroundColor="#F3E5F5"
                            />
                        </View>

                        <View style={styles.deliveryContainer}>
                            <View style={styles.deliveryHeader}>
                                <Text style={styles.deliveryTitle}>Overall Delivery</Text>
                                <Text style={styles.deliveryPercentage}>{deliveryPercentage}%</Text>
                            </View>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressFill, { width: `${deliveryPercentage}%` }]} />
                            </View>
                            <View style={styles.amountContainer}>
                                <Text style={styles.amountText}>
                                    {formatCurrency(summary.chalamt)} delivered
                                </Text>
                                <Text style={styles.amountText}>
                                    {formatCurrency(summary.totamt)} total
                                </Text>
                            </View>
                        </View>
                    </>
                )}

                {/* <Text style={styles.sectionTitle}>SALES ORDERS ({filteredOrders.length})</Text> */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>SALES ORDERS ({filteredOrders.length})</Text>
                    <TouchableOpacity onPress={toggleSortOrder} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} size={16} color="#333" />
                        <Text style={{ fontSize: 12, color: '#333', marginLeft: 4 }}>Sort by Date</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.deliveryContainer123}>
                    <FlatList
                        data={renderedOrders}
                        renderItem={renderOrderCard}
                        keyExtractor={(item, index) => `${item.sono}_${item.srno}_${index}`}
                        onEndReached={loadMoreOrders}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={loading ? (
                            <View style={styles.loadingIndicator}>
                                <Text>Loading more...</Text>
                            </View>
                        ) : null}
                    />

                </View>
            </ScrollView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 15,
    },
    searchContainer: {
        padding: 10,
        backgroundColor: '#f5f5f5',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: '#000',
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 5,
        backgroundColor: '#f5f5f5',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        marginBottom: 5,
    },
    accordionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    summaryBox: {
        width: isTablet ? '24%' : '48%',
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        height: 110,
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    valueRow: {
        marginBottom: 6,
    },
    valueText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginVertical: 6,
    },
    deliveryContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    deliveryContainer123: {
        marginBottom: 20,
    },
    deliveryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    deliveryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    deliveryPercentage: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    progressBarContainer: {
        height: 10,
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 5,
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    amountText: {
        fontSize: 12,
        color: '#666',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    orderHeadermain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
        paddingBottom: 4,
        // borderColor: 'rgba(0,0,0,0.1)',
        borderColor: theme.BORDER,
        // borderWidth: 2,
        borderBottomWidth: 2,
    },
    orderId: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    orderStatus: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    orderDate: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    designShadeText: {
        fontSize: 11,
        color: '#666',
        marginBottom: 8,
    },
    orderStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: '#666',
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 2,
    },
    orderProgressContainer: {
        height: 6,
        backgroundColor: '#e0e0e0',
        borderRadius: 3,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBarSmall: {
        height: '100%',
        borderRadius: 3,
    },
    orderQty: {
        fontSize: 12,
        color: '#666',
        alignSelf: 'flex-end',
    },
    loadingIndicator: {
        padding: 20,
        alignItems: 'center',
    },
});

export default SOPartyDetails;
