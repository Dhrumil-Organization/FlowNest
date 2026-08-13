// import FullScreenLoader from '@/components/FullScreenLoader';
// import HeaderBarwithBack from '@/components/Header';
// import theme from '@/components/theme';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import { debounce } from 'lodash';
// import React, { useCallback, useEffect, useState } from 'react';
// import { ActivityIndicator, Alert, Dimensions, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// import { API } from '../../../common/API/dynamicAPI';

// const { width } = Dimensions.get('window');
// const isTablet = width >= 600;

// interface PartyDetail {
//     Dsnname: string;
//     chalamt: string;
//     chalqty: string;
//     noofchallan: string;
//     parcode: string;
//     partyname: string;
//     pending: string;
//     pendingamt: string;
//     shdname: string;
//     sodate: string;
//     sono: string;
//     srno: string;
//     status: string;
//     totamt: string;
//     totmtr: string;
//     uid: string;
//     UnitRate: string;
// }

// interface PartySummary {
//     chalamt: string;
//     chalqty: string;
//     noofchallan: string;
//     pending: string;
//     pendingamt: string;
//     totamt: string;
//     totmtr: string;
//     linebar: string;
// }

// interface SOPartyDetailsProps {
//     route: {
//         params: {
//             party: any;
//         };
//     };
//     token: string;
//     navigation: any;
//     username: string;
// }

// const SOPartyDetails: React.FC<SOPartyDetailsProps> = ({ route, token, navigation, username }) => {
//     const router = useRouter();
//     const params = useLocalSearchParams();
//     const party = params.party || route?.params?.party || "";
//     const selectedSalesExes = params.selectedSalesExes || route?.params?.selectedSalesExes || [];
//     // const { party, selectedSalesExes } = route?.params || "";
//     const [getDetailData, setDetailData] = useState<{
//         partydetails: PartyDetail[];
//         party_summary: PartySummary[];
//     } | null>(null);
//     const [renderedOrders, setRenderedOrders] = useState<PartyDetail[]>([]);
//     const [page, setPage] = useState(1);
//     const [loading, setLoading] = useState(false);
//     const [printAPILoading, setPrintAPILoading] = useState(false);
//     const [apiloading, setAPILoading] = useState(false);
//     const [isAccordionOpen, setIsAccordionOpen] = useState(true);
//     const [searchQuery, setSearchQuery] = useState('');
//     const [getChallanPayload, setChallanPayload] = useState({});
//     const [getPartyName, setPartyName] = useState("");
//     const [filteredOrders, setFilteredOrders] = useState<PartyDetail[]>([]);
//     const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
//     const itemsPerPage = 50;

//     useEffect(() => {
//         const initializeApp = async () => {
//             try {
//                 const parties_tracking_details = await AsyncStorage.getItem('parties_tracking_details');
//                 const parties_tracking_details_challan_payload = await AsyncStorage.getItem('parties_tracking_details_challan_payload');
//                 const parties_tracking_details_party_name = await AsyncStorage.getItem('parties_tracking_details_party_name');
//                 if (parties_tracking_details_challan_payload) {
//                     setChallanPayload(parties_tracking_details_challan_payload ? JSON.parse(parties_tracking_details_challan_payload) : {});
//                 }
//                 if (parties_tracking_details) {
//                     const data = JSON.parse(parties_tracking_details);
//                     setDetailData(data);
//                     setFilteredOrders(data.partydetails);
//                     setRenderedOrders(data.partydetails.slice(0, itemsPerPage));
//                 }
//                 if (parties_tracking_details_party_name) {
//                     setPartyName(parties_tracking_details_party_name);
//                 }
//             } catch (error) {
//                 console.error("Initialization error:", error);
//             }
//         };
//         initializeApp();
//     }, []);

//     useEffect(() => {
//         const debouncedSearch = debounce(() => {
//             if (!getDetailData) return;
//             const query = searchQuery.toLowerCase();
//             const filtered = getDetailData.partydetails.filter(
//                 (order) =>
//                     order.sono.toLowerCase().includes(query) ||
//                     order.Dsnname.toLowerCase().includes(query) ||
//                     order.shdname.toLowerCase().includes(query) ||
//                     order.parcode.toLowerCase().includes(query) ||
//                     order.partyname.toLowerCase().includes(query) ||
//                     order.sodate.toLowerCase().includes(query) ||
//                     order.totmtr.toLowerCase().includes(query) ||
//                     order.totamt.toLowerCase().includes(query) ||
//                     order.chalqty.toLowerCase().includes(query) ||
//                     order.chalamt.toLowerCase().includes(query) ||
//                     order.status.toLowerCase().includes(query) ||
//                     order.noofchallan.toLowerCase().includes(query) ||
//                     order.pending.toLowerCase().includes(query) ||
//                     order.pendingamt.toLowerCase().includes(query) ||
//                     order.noofchallan.toLowerCase().includes(query) ||
//                     order.status.toLowerCase().includes(query)
//             );
//             const sorted = [...filtered].sort((a, b) => {
//                 const dateA = new Date(a.sodate).getTime();
//                 const dateB = new Date(b.sodate).getTime();
//                 return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
//             });
//             setFilteredOrders(sorted);
//             setRenderedOrders(sorted.slice(0, itemsPerPage));
//             setPage(1);
//         }, 300);

//         debouncedSearch();
//         return () => debouncedSearch.cancel();
//     }, [searchQuery, getDetailData, sortOrder]);

//     // const loadMoreOrders = useCallback(() => {
//     //     if (loading || !getDetailData || renderedOrders.length >= filteredOrders.length) return;

//     //     setLoading(true);
//     //     setTimeout(() => {
//     //         const nextPage = page + 1;
//     //         const startIndex = page * itemsPerPage;
//     //         const endIndex = startIndex + itemsPerPage;
//     //         setRenderedOrders(prev => [
//     //             ...prev,
//     //             ...filteredOrders.slice(startIndex, endIndex)
//     //         ]);
//     //         setPage(nextPage);
//     //         setLoading(false);
//     //     }, 500);
//     // }, [page, loading, filteredOrders, renderedOrders]);
//     const loadMoreOrders = useCallback(() => {
//         if (loading || !getDetailData || renderedOrders.length >= filteredOrders.length) return;
//         setLoading(true);
//         setTimeout(() => {
//             const nextPage = page + 1;
//             const startIndex = page * itemsPerPage;
//             const endIndex = startIndex + itemsPerPage;
//             setRenderedOrders(prev => [
//                 ...prev,
//                 ...filteredOrders.slice(startIndex, endIndex)
//             ]);
//             setPage(nextPage);
//             setLoading(false);
//         }, 500);
//     }, [page, loading, filteredOrders, renderedOrders]);

//     if (!getDetailData) {
//         return (
//             <>
//                 <HeaderBarwithBack
//                     userName={username}
//                     // header={party && party?.partyname || party || ""}
//                     header={getPartyName || ""}
//                     subHeader={'Manage your Sales Orders'}
//                     backNavigateScreen={'Sales Order Tracking'}
//                 />
//                 <View style={styles.loadingContainer}>
//                     <Text>Loading...</Text>
//                 </View>
//             </>
//         );
//     }

//     const summary = getDetailData.party_summary[0];
//     const deliveryPercentage = Math.min(parseFloat(summary.linebar), 100);

//     const toggleSortOrder = () => {
//         setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
//     };

//     const getStatusColor = (status: string) => {
//         switch (status.toUpperCase()) {
//             case 'CLOSED': return '#4CAF50';
//             case 'PARTIAL': return '#FF9800';
//             case 'PENDING': return '#F44336';
//             default: return '#9E9E9E';
//         }
//     };

//     const formatValue = (value: string) => {
//         const num = parseFloat(value);
//         if (isNaN(num)) return value;
//         if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
//         if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
//         if (num >= 1000) return `${(num / 1000).toFixed(2)} K`;
//         return num.toFixed(2);
//     };

//     const formatNumber = (value: string) => {
//         return parseFloat(value).toLocaleString('en-IN');
//     };

//     const formatCurrency = (value: string) => {
//         return `₹${formatNumber(value)}`;
//     };

//     const handleCardPress = async (order: PartyDetail) => {
//         console.log("Selected Order Data:", JSON.stringify(order, null, 2));
//         console.log("Selected Order Data123:", order, getChallanPayload);
//         setAPILoading(true);
//         // navigation.navigate('Taka Checking Entry View Data', { party: partyData.partyname });
//         // navigation.navigate('Taka Checking Entry View Data');
//         const headers = {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json',
//             'X-Requested-with': 'XMLHttpRequest',
//         };
//         try {


//             let seArr = []
//             let seArrCntr = 0;
//             selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

//                 seArr[seArrCntr] = el.sexe;
//                 seArrCntr++;

//             })
//             // const yearValue = selectedYear.split('-')[1].substring(2);
//             // const dsnCodes = selectedDesigns.map((design) => design.DsnCode);
//             const payload = {
//                 ...getChallanPayload,
//                 fromdate: "",
//                 todate: "",
//                 uid: order.uid,
//                 srno: order.srno,
//                 sexes: seArr,
//             };
//             const response = await axios.post(`${API}/api/salesorderpartychallantracking`, payload, { headers });
//             // const response = {
//             //     "data": {
//             //         "data": {
//             //             "data_all": [
//             //                 {
//             //                     "chalno": "00001028/F",
//             //                     "chaldate": "03/07/2025",
//             //                     "chalqty": "191.250",
//             //                     "uid": "370005541",
//             //                     "dsnname": "PEANUT",
//             //                     "shdname": "PRINT",
//             //                     "chalsrno": "1",
//             //                     "data": [
//             //                         {
//             //                             "chaluid": "370005541",
//             //                             "stepname": "purchase",
//             //                             "totalqty": "382.500",
//             //                             "rate": "120.00000",
//             //                             "amount": 45955
//             //                         },
//             //                         {
//             //                             "chaluid": "370005542",
//             //                             "stepname": "purchase",
//             //                             "totalqty": "382.500",
//             //                             "rate": "120.00000",
//             //                             "amount": 85623
//             //                         },
//             //                         {
//             //                             "chaluid": "370005543",
//             //                             "stepname": "purchase",
//             //                             "totalqty": "382.500",
//             //                             "rate": "120.00000",
//             //                             "amount": 741553
//             //                         },
//             //                         {
//             //                             "chaluid": "370005544",
//             //                             "stepname": "purchase",
//             //                             "totalqty": "382.500",
//             //                             "rate": "120.00000",
//             //                             "amount": 96652
//             //                         },
//             //                         {
//             //                             "chaluid": "370005545",
//             //                             "stepname": "purchase",
//             //                             "totalqty": "382.500",
//             //                             "rate": "120.00000",
//             //                             "amount": 884552
//             //                         }
//             //                     ]
//             //                 },
//             //                 {
//             //                     "chalno": "00001029/F",
//             //                     "chaldate": "03/07/2025",
//             //                     "chalqty": "190.500",
//             //                     "uid": "370005542",
//             //                     "dsnname": "PEANUT",
//             //                     "shdname": "PRINT",
//             //                     "chalsrno": "1",
//             //                     "data": [
//             //                         {
//             //                             "chaluid": "370005542",
//             //                             "stepname": "purchase",
//             //                             "totalqty": "381.000",
//             //                             "rate": "120.00000",
//             //                             "amount": 45720
//             //                         }
//             //                     ]
//             //                 },
//             //                 {
//             //                     "chalno": "00001030/F",
//             //                     "chaldate": "03/07/2025",
//             //                     "chalqty": "194.500",
//             //                     "uid": "370005544",
//             //                     "dsnname": "PEANUT",
//             //                     "shdname": "PRINT",
//             //                     "chalsrno": "1",
//             //                     "data": [
//             //                         {
//             //                             "chaluid": "370005544",
//             //                             "stepname": "purchase",
//             //                             "totalqty": "389.000",
//             //                             "rate": "120.00000",
//             //                             "amount": 46680
//             //                         }
//             //                     ]
//             //                 },
//             //                 {
//             //                     "chalno": "00001031/F",
//             //                     "chaldate": "03/07/2025",
//             //                     "chalqty": "186.750",
//             //                     "uid": "370005546",
//             //                     "dsnname": "PEANUT",
//             //                     "shdname": "PRINT",
//             //                     "chalsrno": "1",
//             //                     "data": [
//             //                         {
//             //                             "chaluid": "370005546",
//             //                             "stepname": "purchase",
//             //                             "totalqty": "373.500",
//             //                             "rate": "120.00000",
//             //                             "amount": 44820
//             //                         }
//             //                     ]
//             //                 }
//             //             ],
//             //             "grandtotal": {
//             //                 "purchase": 1526,
//             //                 "jobin": 555,
//             //                 "jobin_prod": 5654,
//             //                 "Repack": 4585,
//             //                 "Grading": 44565
//             //             }
//             //         },
//             //         "success": true,
//             //         "message": ""
//             //     },
//             //     "status": 200,
//             //     "headers": {
//             //         "access-control-allow-methods": "GET",
//             //         "access-control-allow-origin": "*",
//             //         "cache-control": "no-cache, private",
//             //         "connection": "Keep-Alive",
//             //         "content-type": "application/json; charset=utf-8",
//             //         "date": "Mon, 23 Feb 2026 10:08:54 GMT",
//             //         "keep-alive": "timeout=5, max=99",
//             //         "server": "Apache/2.4.52 (Ubuntu)",
//             //         "vary": "Authorization"
//             //     },
//             //     "config": {
//             //         "transitional": {
//             //             "silentJSONParsing": true,
//             //             "forcedJSONParsing": true,
//             //             "clarifyTimeoutError": false
//             //         },
//             //         "adapter": [
//             //             "xhr",
//             //             "http",
//             //             "fetch"
//             //         ],
//             //         "transformRequest": [
//             //             null
//             //         ],
//             //         "transformResponse": [
//             //             null
//             //         ],
//             //         "timeout": 0,
//             //         "xsrfCookieName": "XSRF-TOKEN",
//             //         "xsrfHeaderName": "X-XSRF-TOKEN",
//             //         "maxContentLength": -1,
//             //         "maxBodyLength": -1,
//             //         "env": {},
//             //         "headers": {
//             //             "Accept": "application/json, text/plain, */*",
//             //             "Content-Type": "application/json",
//             //             "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiODMzNTdkNjU4ZDFiYjJlMWJlYWU5Zjc4NmQzMTRmMDk5MDliNzExNWMwNmI2ZjkzNDA4NjA1OWE2OTc4ZmIxYjEwZTk1MjlhZmMzZTJiZTYiLCJpYXQiOjE3NzE1ODAzMzQsIm5iZiI6MTc3MTU4MDMzNCwiZXhwIjoxODAzMTE2MzM0LCJzdWIiOiIxIiwic2NvcGVzIjpbXX0.Rr1B55n70Lrm1qhyhB10tbaZkG1AzWz5SxrA86k4U9XQ7ZslNsb0SecVbQxn4Wd0MIFcMO87S7y1HDJcQAcL9W-aTWAH8RbIRldji8SYOl0P3YIOJJnN797q8IXXgJQLfBpWMKHwW1DYvoBlf75cBdVJs_JyJCRXbgo8HXS6mwlIZ2o-3wu3QYt41BtaYhlE-lNWGqs-pQT5-tIlfFh40a2wc3_xrwV-DHNH84KJcm6t7wS7N5_NJBYELRGxfVutdg71LZ2Y8ZsXSmOZTH9_ckEAsRRoDSC55k-9O9QykMJds4WfvzN7HsEm8mzy3GvxWKY1xgCGOC_5EW-zk0IN9yiqVdnh_ysRp5GABtID89u5Ob1NkwBg95HXnQL1BdUYEg0C1sI8hvzORM4e6utOOnhN7C1MbtgBM7hKZBaS-BODdtHG2o1-XaY_nTqBw_UwwiqmM7d8C683zMeutOjj62a1BwNRg3xB90SnqrNN174Wf0a-hzMZ4G7rt1t5XRPfZMXuHlNStjNKuQv-HRzMUoPQ02gqwoaht8vDh8cS78nooqWzOiLntIDfZyUmZji79t9dNLo_M9DrpCQxs8vPfoXkREOH0fHxzoXxgymbmoAkn_ESBZZk30AI1kzXaT2UYOK_rziBdxF1NQQGXJ3R4tzEt_yDlx_1Q3JhKhyNGIA",
//             //             "X-Requested-with": "XMLHttpRequest"
//             //         },
//             //         "method": "post",
//             //         "url": "https://apig.tms-webapp.com/api/salesorderpartychallantracking",
//             //         "data": "{\"fromdate\":\"01-02-2026\",\"todate\":\"23-02-2026\",\"yearno\":\"26\",\"sexes\":\"0\",\"type\":\"all\",\"dsncodes\":[],\"parcode\":\"19996\",\"prptype\":\"S\",\"txntype\":\"prodorderlist\",\"uid\":\"1\",\"srno\":\"630032512\"}",
//             //         "allowAbsoluteUrls": true
//             //     },
//             //     "request": {
//             //         "UNSENT": 0,
//             //         "OPENED": 1,
//             //         "HEADERS_RECEIVED": 2,
//             //         "LOADING": 3,
//             //         "DONE": 4,
//             //         "readyState": 4,
//             //         "status": 200,
//             //         "timeout": 0,
//             //         "withCredentials": true,
//             //         "upload": {},
//             //         "_aborted": false,
//             //         "_hasError": false,
//             //         "_method": "POST",
//             //         "_perfKey": "network_XMLHttpRequest_https://apig.tms-webapp.com/api/salesorderpartychallantracking",
//             //         "_response": "{\"data\":{\"data_all\":[],\"grandtotal\":[]},\"success\":true,\"message\":\"\"}",
//             //         "_url": "https://apig.tms-webapp.com/api/salesorderpartychallantracking",
//             //         "_timedOut": false,
//             //         "_trackingName": null,
//             //         "_incrementalEvents": false,
//             //         "_startTime": 8554836.9546,
//             //         "_performanceLogger": {
//             //             "_timespans": {
//             //                 "network_XMLHttpRequest_https://apig.tms-webapp.com/api/checkdevice": {
//             //                     "startTime": 8442043.8289,
//             //                     "endTime": 8442216.0322,
//             //                     "totalTime": 172.20329999923706
//             //                 },
//             //                 "network_XMLHttpRequest_https://apig.tms-webapp.com/api/salesordertracking": {
//             //                     "startTime": 8453162.512,
//             //                     "endTime": 8453343.5957,
//             //                     "totalTime": 181.08369999937713
//             //                 },
//             //                 "network_XMLHttpRequest_https://apig.tms-webapp.com/api/salesorderpartytracking": {
//             //                     "startTime": 8461953.8026,
//             //                     "endTime": 8462145.5017,
//             //                     "totalTime": 191.6991000007838
//             //                 },
//             //                 "network_XMLHttpRequest_http://10.0.2.2:8081/symbolicate": {
//             //                     "startTime": 8463179.2969,
//             //                     "endTime": 8463438.5036,
//             //                     "totalTime": 259.2066999990493
//             //                 },
//             //                 "network_XMLHttpRequest_https://apig.tms-webapp.com/api/salesorderpartychallantracking": {
//             //                     "startTime": 8480689.5179,
//             //                     "endTime": 8480859.2388,
//             //                     "totalTime": 169.72090000100434
//             //                 }
//             //             },
//             //             "_extras": {},
//             //             "_points": {
//             //                 "initializeCore_start": 8440742.8791,
//             //                 "initializeCore_end": 8441115.1147
//             //             },
//             //             "_pointExtras": {},
//             //             "_closed": false
//             //         },
//             //         "responseHeaders": {
//             //             "Access-Control-Allow-Origin": "*",
//             //             "Content-Type": "application/json; charset=utf-8",
//             //             "Access-Control-Allow-Methods": "GET",
//             //             "Date": "Mon, 23 Feb 2026 10:08:54 GMT",
//             //             "Vary": "Authorization",
//             //             "Connection": "Keep-Alive",
//             //             "Server": "Apache/2.4.52 (Ubuntu)",
//             //             "Cache-Control": "no-cache, private",
//             //             "Keep-Alive": "timeout=5, max=99"
//             //         },
//             //         "_requestId": null,
//             //         "_headers": {
//             //             "accept": "application/json, text/plain, */*",
//             //             "content-type": "application/json",
//             //             "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiODMzNTdkNjU4ZDFiYjJlMWJlYWU5Zjc4NmQzMTRmMDk5MDliNzExNWMwNmI2ZjkzNDA4NjA1OWE2OTc4ZmIxYjEwZTk1MjlhZmMzZTJiZTYiLCJpYXQiOjE3NzE1ODAzMzQsIm5iZiI6MTc3MTU4MDMzNCwiZXhwIjoxODAzMTE2MzM0LCJzdWIiOiIxIiwic2NvcGVzIjpbXX0.Rr1B55n70Lrm1qhyhB10tbaZkG1AzWz5SxrA86k4U9XQ7ZslNsb0SecVbQxn4Wd0MIFcMO87S7y1HDJcQAcL9W-aTWAH8RbIRldji8SYOl0P3YIOJJnN797q8IXXgJQLfBpWMKHwW1DYvoBlf75cBdVJs_JyJCRXbgo8HXS6mwlIZ2o-3wu3QYt41BtaYhlE-lNWGqs-pQT5-tIlfFh40a2wc3_xrwV-DHNH84KJcm6t7wS7N5_NJBYELRGxfVutdg71LZ2Y8ZsXSmOZTH9_ckEAsRRoDSC55k-9O9QykMJds4WfvzN7HsEm8mzy3GvxWKY1xgCGOC_5EW-zk0IN9yiqVdnh_ysRp5GABtID89u5Ob1NkwBg95HXnQL1BdUYEg0C1sI8hvzORM4e6utOOnhN7C1MbtgBM7hKZBaS-BODdtHG2o1-XaY_nTqBw_UwwiqmM7d8C683zMeutOjj62a1BwNRg3xB90SnqrNN174Wf0a-hzMZ4G7rt1t5XRPfZMXuHlNStjNKuQv-HRzMUoPQ02gqwoaht8vDh8cS78nooqWzOiLntIDfZyUmZji79t9dNLo_M9DrpCQxs8vPfoXkREOH0fHxzoXxgymbmoAkn_ESBZZk30AI1kzXaT2UYOK_rziBdxF1NQQGXJ3R4tzEt_yDlx_1Q3JhKhyNGIA",
//             //             "x-requested-with": "XMLHttpRequest"
//             //         },
//             //         "_responseType": "",
//             //         "_sent": true,
//             //         "_lowerCaseResponseHeaders": {
//             //             "access-control-allow-origin": "*",
//             //             "content-type": "application/json; charset=utf-8",
//             //             "access-control-allow-methods": "GET",
//             //             "date": "Mon, 23 Feb 2026 10:08:54 GMT",
//             //             "vary": "Authorization",
//             //             "connection": "Keep-Alive",
//             //             "server": "Apache/2.4.52 (Ubuntu)",
//             //             "cache-control": "no-cache, private",
//             //             "keep-alive": "timeout=5, max=99"
//             //         },
//             //         "_subscriptions": [],
//             //         "responseURL": "https://apig.tms-webapp.com/api/salesorderpartychallantracking"
//             //     }
//             // }
//             console.log("I am here:", response, payload);
//             if (response.data.success === true) {
//                 setAPILoading(false);
//                 console.log("I am here:", response.data);
//                 // await AsyncStorage.setItem('parties_tracking_details', JSON.stringify(response.data.data));
//                 await AsyncStorage.setItem('parties_tracking_details_challan_response', JSON.stringify(response.data));
//                 // navigation.navigate(' /SOPartyDetailsPart1', { party: order.partyname });
//                 router.push({
//                     pathname: '/SOPartyDetailsPart1',
//                     params: {
//                         party: order.partyname
//                     }
//                 });
//                 // await saveLastViewedToCache(partyData.parcode);
//                 // setLastViewedParcode(partyData.parcode);
//                 // console.log("Response Data:", JSON.stringify(response.data.data, null, 2));
//                 console.log("Response Data:", response);
//             }
//         } catch (error) {
//             setAPILoading(false);
//             console.error("Error in handleCardPress:", error);
//             Alert.alert("Error", "Failed to process party details");
//         } finally {
//             setAPILoading(false);
//             // setTrackingLoader(false);
//         }
//     };

//     const handleCardPressCurrent = async (order: PartyDetail) => {
//         const headers = {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json',
//             'X-Requested-with': 'XMLHttpRequest',
//         };
//         const payload = {
//             ...getChallanPayload,
//             uid: order.uid,
//             srno: order.srno,
//         };

//         try {
//             setAPILoading(true);
//             const response = await axios.post(`${API}/api/sotrackcloseorder`, payload, { headers });
//             console.log("I am here CLosed Order :", response, payload);
//             if (response.data.success === true) {
//                 // Update the status of the pressed card to "CLOSED"
//                 setFilteredOrders(prevOrders =>
//                     prevOrders.map(prevOrder =>
//                         prevOrder.uid === order.uid && prevOrder.srno === order.srno
//                             ? { ...prevOrder, status: 'CLOSED' }
//                             : prevOrder
//                     )
//                 );
//                 // Also update the main data if needed
//                 setDetailData(prevData => {
//                     if (!prevData) return null;
//                     return {
//                         ...prevData,
//                         partydetails: prevData.partydetails.map(prevOrder =>
//                             prevOrder.uid === order.uid && prevOrder.srno === order.srno
//                                 ? { ...prevOrder, status: 'CLOSED' }
//                                 : prevOrder
//                         )
//                     };
//                 });
//             }
//         } catch (error) {
//             console.error("Error in handleCardPressCurrent:", error);
//             Alert.alert("Error", "Failed to close the order");
//         } finally {
//             setAPILoading(false);
//         }
//     };

//     const printSalesOrderPdf = async (item, format = 'A4') => {
//         setPrintAPILoading(true);
//         try {
//             // setPdfLoading(true);

//             const payload = {
//                 prpcode: item.prpcode || '',
//                 yearno: getChallanPayload?.yearno || '',
//                 strcode: item.strcode || '',
//                 uid: item.uid || '',
//                 printTypes: ['sales_order'],
//                 printFormat: format || 'A4',
//             };

//             console.log("'PDF PAYLOAD =>':", payload);
//             const res = await axios.post(
//                 `${API}/api/saleschallanmultiprintnew`,
//                 payload,
//                 {
//                     headers: {
//                         Authorization: `Bearer ${token}`,
//                         Accept: 'application/json',
//                         'Content-Type': 'application/json',
//                         'X-Requested-With': 'XMLHttpRequest',
//                         'x-platform': 'mob',
//                     },
//                 }
//             );

//             console.log("res", res)
//             console.log('PDF RESPONSE =>', res?.data);

//             if (res?.data?.success === true) {
//                 setPrintAPILoading(false);
//                 const pdfUrl = res?.data?.results?.sales_order;

//                 if (!pdfUrl) {
//                     Alert.alert('PDF Error', 'PDF URL not found.');
//                     return;
//                 }

//                 // navigation.navigate('PdfViewerScreenMain', {
//                 //     pdfUrl,
//                 //     title: 'Sales Order',
//                 // });
//                 router.push({
//                     pathname: '/(tabs)/pdf-view',
//                     params: { pdfUrl, title: 'Sales Order' },
//                 });
//             } else {
//                 Alert.alert(
//                     'PDF Failed',
//                     res?.data?.message || 'PDF generation failed.'
//                 );
//             }
//         } catch (error) {
//             console.log('PDF ERROR =>', error?.response?.data || error.message);
//             setPrintAPILoading(false);

//             Alert.alert(
//                 'Error',
//                 error?.response?.data?.message || 'Unable to generate PDF.'
//             );
//         } finally {
//             // setPdfLoading(false);
//             setPrintAPILoading(false);
//         }
//     };

//     const SummaryCard = ({ title, value1, label1, value2, label2, backgroundColor }: {
//         title: string,
//         value1: string,
//         label1: string,
//         value2: string,
//         label2: string,
//         backgroundColor: string
//     }) => (
//         <View style={[styles.summaryBox, { backgroundColor }]}>
//             <Text style={styles.summaryTitle}>{title}</Text>
//             <View style={styles.valueRow}>
//                 <Text style={styles.valueText}>{label1}: {value1}</Text>
//             </View>
//             <View style={styles.divider} />
//             <View style={styles.valueRow}>
//                 <Text style={styles.valueText}>{label2}: {value2}</Text>
//             </View>
//         </View>
//     );

//     const renderOrderCard = ({ item }: { item: PartyDetail }) => {
//         const orderTotal = parseFloat(item.totmtr);
//         const orderDelivered = parseFloat(item.chalqty);
//         const orderPercentage = Math.min(
//             orderTotal > 0 ? (orderDelivered / orderTotal) * 100 : 0,
//             100
//         );

//         return (
//             <TouchableOpacity
//                 style={styles.orderCard}
//                 onPress={() => handleCardPress(item)}
//             >
//                 <View style={styles.orderHeadermain}>
//                     <Text style={styles.orderId}>{item.partyname}</Text>
//                     {/* <Text style={[styles.orderStatus, { color: getStatusColor(item.status) }]}>
//                         {item.status}
//                     </Text>
//                     <Icon name="chevron-right" size={20} color="#999" /> */}
//                     {item.status === 'PENDING' || item.status === 'PARTIAL' ? (
//                         <TouchableOpacity
//                             onPress={() => handleCardPressCurrent(item)}
//                             style={styles.orderButtonContainer}
//                         >
//                             <Text style={[styles.orderStatus, { color: '#FF0000' }]}>
//                                 Closed Order
//                             </Text>
//                             <Icon name="close" size={20} color="#FF0000" />
//                         </TouchableOpacity>

//                     ) : null}
//                 </View>
//                 <View style={styles.orderHeader}>
//                     <Text style={styles.orderId}>SO-{item.sono}</Text>
//                     <Text style={[styles.orderStatus, { color: getStatusColor(item.status) }]}>
//                         {item.status}
//                     </Text>
//                     {/* <Icon name="chevron-right" size={20} color="#999" /> */}
//                     <TouchableOpacity
//                         onPress={() => printSalesOrderPdf(item, 'A4')}
//                         style={styles.orderButtonContainer}
//                     >
//                         {printAPILoading ? (
//                             <ActivityIndicator size={20} color="#0000ff" />
//                         ) : (
//                             <Icon name="print" size={20} color="blue" />
//                         )}
//                     </TouchableOpacity>
//                 </View>

//                 <Text style={styles.orderDate}>Sodate: {item.sodate} | Duedate: {item.duedate}</Text>
//                 <Text style={styles.designShadeText}>
//                     {item.Dsnname} | Shade: {item.shdname}
//                 </Text>

//                 <View style={styles.orderStats}>
//                     <View style={styles.statItem}>
//                         <Text style={styles.statLabel}>TOTAL</Text>
//                         <Text style={styles.statValue}>{formatValue(item.totmtr)}</Text>
//                     </View>
//                     <View style={styles.statItem}>
//                         <Text style={styles.statLabel}>DELIVERED</Text>
//                         <Text style={styles.statValue}>{formatValue(item.chalqty)}</Text>
//                     </View>
//                     <View style={styles.statItem}>
//                         <Text style={styles.statLabel}>CHALLANS</Text>
//                         <Text style={styles.statValue}>{item.noofchallan}</Text>
//                     </View>
//                 </View>

//                 {item.status !== 'PENDING' && (
//                     <View style={styles.orderProgressContainer}>
//                         <View style={[
//                             styles.progressBarSmall,
//                             {
//                                 width: `${orderPercentage}%`,
//                                 backgroundColor: getStatusColor(item.status)
//                             }
//                         ]} />
//                     </View>
//                 )}

//                 <Text style={styles.orderQty}>
//                     Bal Qty: {item.BQty}
//                 </Text>
//                 <Text style={styles.orderQty}>
//                     Unit Rate: {item.UnitRate}
//                 </Text>
//                 <Text style={styles.orderQty}>
//                     Qty: {item.chalqty}/{item.totmtr}
//                 </Text>
//             </TouchableOpacity>
//         );
//     };

//     return (
//         <>
//             {apiloading && <FullScreenLoader />}
//             <HeaderBarwithBack
//                 userName={username}
//                 header={party && party?.partyname || party || ""}
//                 subHeader={'Manage your Sales Orders'}
//                 breadcrumb={getPartyName}
//                 SearchBar={false}
//             />

//             <View style={styles.searchContainer}>
//                 {apiloading ? <ActivityIndicator size="large" color={theme.BRAND_GRADIENT_END} /> : <TextInput
//                     style={styles.searchInput}
//                     placeholder="Search Sales Orders..."
//                     value={searchQuery}
//                     onChangeText={setSearchQuery}
//                 />}
//             </View>

//             {/* <View style={styles.searchContainer}>
//                 <TextInput
//                     style={styles.searchInput}
//                     placeholder="Search Sales Orders..."
//                     value={searchQuery}
//                     onChangeText={setSearchQuery}
//                 />
//             </View> */}

//             <ScrollView style={styles.container}>
//                 <TouchableOpacity
//                     style={styles.accordionHeader}
//                     onPress={() => setIsAccordionOpen(!isAccordionOpen)}
//                 >
//                     <Text style={styles.accordionTitle}>Summary</Text>
//                     <Icon
//                         name={isAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
//                         size={20}
//                         color="#333"
//                     />
//                 </TouchableOpacity>

//                 {isAccordionOpen && (
//                     <>
//                         <View style={styles.summaryContainer}>
//                             <SummaryCard
//                                 title="Total"
//                                 value1={formatValue(summary.totamt)}
//                                 label1="Amount"
//                                 value2={summary.totmtr}
//                                 label2="Meter"
//                                 backgroundColor="#E3F2FD"
//                             />

//                             <SummaryCard
//                                 title="Delivered"
//                                 value1={formatValue(summary.chalamt)}
//                                 label1="Amount"
//                                 value2={summary.chalqty}
//                                 label2="Meter"
//                                 backgroundColor="#E8F5E8"
//                             />

//                             <SummaryCard
//                                 title="Pending"
//                                 value1={formatValue(summary.pendingamt)}
//                                 label1="Amount"
//                                 value2={summary.pending}
//                                 label2="Meter"
//                                 backgroundColor="#FFF3E0"
//                             />

//                             <SummaryCard
//                                 title="Orders"
//                                 value1={summary.noofchallan}
//                                 label1="Count"
//                                 value2={`${deliveryPercentage}%`}
//                                 label2="Delivery"
//                                 backgroundColor="#F3E5F5"
//                             />
//                         </View>

//                         <View style={styles.deliveryContainer}>
//                             <View style={styles.deliveryHeader}>
//                                 <Text style={styles.deliveryTitle}>Overall Delivery</Text>
//                                 <Text style={styles.deliveryPercentage}>{deliveryPercentage}%</Text>
//                             </View>
//                             <View style={styles.progressBarContainer}>
//                                 <View style={[styles.progressFill, { width: `${deliveryPercentage}%` }]} />
//                             </View>
//                             <View style={styles.amountContainer}>
//                                 <Text style={styles.amountText}>
//                                     {formatCurrency(summary.chalamt)} delivered
//                                 </Text>
//                                 <Text style={styles.amountText}>
//                                     {formatCurrency(summary.totamt)} total
//                                 </Text>
//                             </View>
//                         </View>
//                     </>
//                 )}

//                 {/* <Text style={styles.sectionTitle}>SALES ORDERS ({filteredOrders.length})</Text> */}
//                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
//                     <Text style={styles.sectionTitle}>SALES ORDERS ({filteredOrders.length})</Text>
//                     <TouchableOpacity onPress={toggleSortOrder} style={{ flexDirection: 'row', alignItems: 'center' }}>
//                         <Icon name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} size={16} color="#333" />
//                         <Text style={{ fontSize: 12, color: '#333', marginLeft: 4 }}>Sort by Date</Text>
//                     </TouchableOpacity>
//                 </View>
//                 <View style={styles.deliveryContainer123}>
//                     <FlatList
//                         data={renderedOrders}
//                         renderItem={renderOrderCard}
//                         keyExtractor={(item, index) => `${item.sono}_${item.srno}_${index}`}
//                         onEndReached={loadMoreOrders}
//                         onEndReachedThreshold={0.5}
//                         ListFooterComponent={loading ? (
//                             <View style={styles.loadingIndicator}>
//                                 <Text>Loading more...</Text>
//                             </View>
//                         ) : null}
//                     />

//                 </View>
//             </ScrollView>
//         </>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#f5f5f5',
//         padding: 15,
//     },
//     searchContainer: {
//         padding: 10,
//         backgroundColor: '#f5f5f5',
//         borderBottomWidth: 1,
//         borderBottomColor: '#e0e0e0',
//     },
//     searchInput: {
//         backgroundColor: '#fff',
//         borderRadius: 8,
//         padding: 10,
//         fontSize: 14,
//         color: '#000',
//     },
//     accordionHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         padding: 5,
//         backgroundColor: '#f5f5f5',
//         borderBottomWidth: 1,
//         borderBottomColor: '#e0e0e0',
//         marginBottom: 5,
//     },
//     accordionTitle: {
//         fontSize: 12,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     loadingContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     summaryContainer: {
//         flexDirection: 'row',
//         flexWrap: 'wrap',
//         justifyContent: 'space-between',
//         marginBottom: 5,
//     },
//     summaryBox: {
//         width: isTablet ? '24%' : '48%',
//         padding: 12,
//         borderRadius: 10,
//         marginBottom: 10,
//         height: 110,
//     },
//     summaryTitle: {
//         fontSize: 14,
//         fontWeight: 'bold',
//         color: '#333',
//         marginBottom: 8,
//     },
//     valueRow: {
//         marginBottom: 6,
//     },
//     valueText: {
//         fontSize: 12,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     divider: {
//         height: 1,
//         backgroundColor: 'rgba(0,0,0,0.1)',
//         marginVertical: 6,
//     },
//     deliveryContainer: {
//         backgroundColor: '#fff',
//         borderRadius: 10,
//         padding: 15,
//         marginBottom: 20,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 2,
//     },
//     deliveryContainer123: {
//         marginBottom: 20,
//     },
//     deliveryHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 10,
//     },
//     deliveryTitle: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     deliveryPercentage: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         color: '#4CAF50',
//     },
//     progressBarContainer: {
//         height: 10,
//         backgroundColor: '#e0e0e0',
//         borderRadius: 5,
//         marginBottom: 10,
//         overflow: 'hidden',
//     },
//     progressFill: {
//         height: '100%',
//         backgroundColor: '#4CAF50',
//         borderRadius: 5,
//     },
//     amountContainer: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//     },
//     amountText: {
//         fontSize: 12,
//         color: '#666',
//     },
//     sectionTitle: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#333',
//         marginBottom: 10,
//     },
//     orderCard: {
//         backgroundColor: '#fff',
//         borderRadius: 10,
//         padding: 15,
//         marginBottom: 10,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 2,
//     },
//     orderHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 5,
//     },
//     orderHeadermain: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 5,
//         paddingBottom: 4,
//         // borderColor: 'rgba(0,0,0,0.1)',
//         borderColor: theme.BORDER,
//         // borderWidth: 2,
//         borderBottomWidth: 2,
//     },
//     orderButtonContainer: {
//         display: 'flex',
//         flexDirection: 'row'
//     },
//     orderId: {
//         fontSize: 14,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     orderStatus: {
//         fontSize: 12,
//         fontWeight: 'bold',
//     },
//     orderDate: {
//         fontSize: 12,
//         color: '#666',
//         marginBottom: 2,
//     },
//     designShadeText: {
//         fontSize: 11,
//         color: '#666',
//         marginBottom: 8,
//     },
//     orderStats: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginBottom: 10,
//     },
//     statItem: {
//         alignItems: 'center',
//     },
//     statLabel: {
//         fontSize: 10,
//         color: '#666',
//     },
//     statValue: {
//         fontSize: 14,
//         fontWeight: 'bold',
//         color: '#333',
//         marginTop: 2,
//     },
//     orderProgressContainer: {
//         height: 6,
//         backgroundColor: '#e0e0e0',
//         borderRadius: 3,
//         marginBottom: 10,
//         overflow: 'hidden',
//     },
//     progressBarSmall: {
//         height: '100%',
//         borderRadius: 3,
//     },
//     orderQty: {
//         fontSize: 12,
//         color: '#666',
//         alignSelf: 'flex-end',
//     },
//     loadingIndicator: {
//         padding: 20,
//         alignItems: 'center',
//     },
// });

// export default SOPartyDetails;

import FullScreenLoader from '@/components/FullScreenLoader';
import HeaderBarwithBack from '@/components/Header';
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API } from '../../../common/API/dynamicAPI';

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
    UnitRate: string;
    allocationdate?: string;
    duedate?: string;
    BQty?: string;
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

// Helper: format YYYYMMDD to DD-MMM-YYYY
const formatAllocationDate = (dateStr: string): string => {
    if (!dateStr || dateStr === '0' || dateStr.length !== 8) return '';
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const dateObj = new Date(`${year}-${month}-${day}`);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return dateObj.toLocaleDateString('en-IN', options).replace(/-/g, '-'); // e.g., "12-Aug-2026"
};

const SOPartyDetails: React.FC<SOPartyDetailsProps> = ({ route, token, navigation, username }) => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const party = params.party || route?.params?.party || "";
    const selectedSalesExes = params.selectedSalesExes || route?.params?.selectedSalesExes || [];
    const [getDetailData, setDetailData] = useState<{
        partydetails: PartyDetail[];
        party_summary: PartySummary[];
    } | null>(null);
    const [renderedOrders, setRenderedOrders] = useState<PartyDetail[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [printAPILoading, setPrintAPILoading] = useState(false);
    const [apiloading, setAPILoading] = useState(false);
    const [isAccordionOpen, setIsAccordionOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [getChallanPayload, setChallanPayload] = useState({});
    const [getPartyName, setPartyName] = useState("");
    const [filteredOrders, setFilteredOrders] = useState<PartyDetail[]>([]);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const itemsPerPage = 50;

    const [todayOrders, setTodayOrders] = useState<PartyDetail[]>([]);
    const [restOrders, setRestOrders] = useState<PartyDetail[]>([]);
    const [renderedRestOrders, setRenderedRestOrders] = useState<PartyDetail[]>([]);
    const [restPage, setRestPage] = useState(1);
    const [restLoading, setRestLoading] = useState(false);

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

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
        const today = filteredOrders.filter(order => order.allocationdate === todayStr);
        const rest = filteredOrders.filter(order => order.allocationdate !== todayStr);
        setTodayOrders(today);
        setRestOrders(rest);
        setRenderedRestOrders(rest.slice(0, itemsPerPage));
        setRestPage(1);
    }, [filteredOrders, todayStr]);

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
        }, 300);

        debouncedSearch();
        return () => debouncedSearch.cancel();
    }, [searchQuery, getDetailData, sortOrder]);

    const loadMoreRestOrders = useCallback(() => {
        if (restLoading || !restOrders.length || renderedRestOrders.length >= restOrders.length) return;
        setRestLoading(true);
        setTimeout(() => {
            const nextPage = restPage + 1;
            const startIndex = restPage * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            setRenderedRestOrders(prev => [
                ...prev,
                ...restOrders.slice(startIndex, endIndex)
            ]);
            setRestPage(nextPage);
            setRestLoading(false);
        }, 500);
    }, [restPage, restLoading, restOrders, renderedRestOrders]);

    if (!getDetailData) {
        return (
            <>
                <HeaderBarwithBack
                    userName={username}
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
        setAPILoading(true);
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            let seArr: string[] = [];
            selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.forEach((el: any) => seArr.push(el.sexe));
            const payload = {
                ...getChallanPayload,
                fromdate: "",
                todate: "",
                uid: order.uid,
                srno: order.srno,
                sexes: seArr,
            };
            const response = await axios.post(`${API}/api/salesorderpartychallantracking`, payload, { headers });
            if (response.data.success === true) {
                setAPILoading(false);
                await AsyncStorage.setItem('parties_tracking_details_challan_response', JSON.stringify(response.data));
                router.push({
                    pathname: '/SOPartyDetailsPart1',
                    params: { party: order.partyname }
                });
            }
        } catch (error) {
            setAPILoading(false);
            console.error("Error in handleCardPress:", error);
            Alert.alert("Error", "Failed to process party details");
        } finally {
            setAPILoading(false);
        }
    };

    const handleCardPressCurrent = async (order: PartyDetail) => {
        Alert.alert(
            "Close Order",
            `Are you sure you want to close this order (SO-${order.sono})?`,
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes",
                    onPress: async () => {
                        const headers = {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'X-Requested-with': 'XMLHttpRequest',
                        };
                        const payload = {
                            ...getChallanPayload,
                            uid: order.uid,
                            srno: order.srno,
                        };
                        try {
                            setAPILoading(true);
                            const response = await axios.post(`${API}/api/sotrackcloseorder`, payload, { headers });
                            if (response.data.success === true) {
                                setFilteredOrders(prevOrders =>
                                    prevOrders.map(prevOrder =>
                                        prevOrder.uid === order.uid && prevOrder.srno === order.srno
                                            ? { ...prevOrder, status: 'CLOSED' }
                                            : prevOrder
                                    )
                                );
                                setDetailData(prevData => {
                                    if (!prevData) return null;
                                    return {
                                        ...prevData,
                                        partydetails: prevData.partydetails.map(prevOrder =>
                                            prevOrder.uid === order.uid && prevOrder.srno === order.srno
                                                ? { ...prevOrder, status: 'CLOSED' }
                                                : prevOrder
                                        )
                                    };
                                });
                                Alert.alert("Success", "Order closed successfully.");
                            } else {
                                Alert.alert("Error", response.data.message || "Failed to close order.");
                            }
                        } catch (error) {
                            console.error("Error in handleCardPressCurrent:", error);
                            Alert.alert("Error", "Failed to close the order");
                        } finally {
                            setAPILoading(false);
                        }
                    }
                }
            ]
        );
    };

    const printSalesOrderPdf = async (item, format = 'A4') => {
        setPrintAPILoading(true);
        try {
            const payload = {
                prpcode: item.prpcode || '',
                yearno: getChallanPayload?.yearno || '',
                strcode: item.strcode || '',
                uid: item.uid || '',
                printTypes: ['sales_order'],
                printFormat: format || 'A4',
            };
            const res = await axios.post(
                `${API}/api/saleschallanmultiprintnew`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'x-platform': 'mob',
                    },
                }
            );
            if (res?.data?.success === true) {
                setPrintAPILoading(false);
                const pdfUrl = res?.data?.results?.sales_order;
                if (!pdfUrl) {
                    Alert.alert('PDF Error', 'PDF URL not found.');
                    return;
                }
                router.push({
                    pathname: '/(tabs)/pdf-view',
                    params: { pdfUrl, title: 'Sales Order' },
                });
            } else {
                Alert.alert(
                    'PDF Failed',
                    res?.data?.message || 'PDF generation failed.'
                );
            }
        } catch (error) {
            console.log('PDF ERROR =>', error?.response?.data || error.message);
            setPrintAPILoading(false);
            Alert.alert(
                'Error',
                error?.response?.data?.message || 'Unable to generate PDF.'
            );
        } finally {
            setPrintAPILoading(false);
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

    const renderOrderCard = (item: PartyDetail, isToday: boolean = false) => {
        const orderTotal = parseFloat(item.totmtr);
        const orderDelivered = parseFloat(item.chalqty);
        const orderPercentage = Math.min(
            orderTotal > 0 ? (orderDelivered / orderTotal) * 100 : 0,
            100
        );
        const hasAllocation = item.allocationdate && item.allocationdate !== '0' && item.allocationdate !== '';

        return (
            <TouchableOpacity
                style={[
                    styles.orderCard,
                    hasAllocation && styles.orderCardWithAllocation,
                    isToday && styles.orderCardToday
                ]}
                onPress={() => handleCardPress(item)}
            >
                <View style={styles.orderHeadermain}>
                    <Text style={styles.orderId}>{item.partyname}</Text>
                    {item.status === 'PENDING' || item.status === 'PARTIAL' ? (
                        <TouchableOpacity
                            onPress={() => handleCardPressCurrent(item)}
                            style={styles.orderButtonContainer}
                        >
                            <Text style={[styles.orderStatus, { color: '#FF0000' }]}>
                                Closed Order
                            </Text>
                            <Icon name="close" size={20} color="#FF0000" />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>SO-{item.sono}</Text>
                    <Text style={[styles.orderStatus, { color: getStatusColor(item.status) }]}>
                        {item.status}
                    </Text>
                    <TouchableOpacity
                        onPress={() => printSalesOrderPdf(item, 'A4')}
                        style={styles.orderButtonContainer}
                    >
                        {printAPILoading ? (
                            <ActivityIndicator size={20} color="#0000ff" />
                        ) : (
                            <Icon name="print" size={20} color="blue" />
                        )}
                    </TouchableOpacity>
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
                    Bal Qty: {item.BQty}
                </Text>
                <Text style={styles.orderQty}>
                    Unit Rate: {item.UnitRate}
                </Text>
                <Text style={styles.orderQty}>
                    Qty: {item.chalqty}/{item.totmtr}
                </Text>
                {hasAllocation && (
                    <View style={styles.allocationBadge}>
                        <Text style={styles.allocationBadgeText}>
                            {item.allocationdate === todayStr ? 'Today' : `Allocated at: ${formatAllocationDate(item.allocationdate || '')}`}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <>
            {apiloading && <FullScreenLoader />}
            <HeaderBarwithBack
                userName={username}
                header={party && party?.partyname || party || ""}
                subHeader={'Manage your Sales Orders'}
                breadcrumb={getPartyName}
                SearchBar={false}
            />

            <View style={styles.searchContainer}>
                {apiloading ? <ActivityIndicator size="large" color={theme.BRAND_GRADIENT_END} /> : <TextInput
                    style={styles.searchInput}
                    placeholder="Search Sales Orders..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />}
            </View>

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

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>SALES ORDERS ({filteredOrders.length})</Text>
                    <TouchableOpacity onPress={toggleSortOrder} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} size={16} color="#333" />
                        <Text style={{ fontSize: 12, color: '#333', marginLeft: 4 }}>Sort by Date</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.deliveryContainer123}>
                    {todayOrders.length > 0 && (
                        <View style={styles.todaySection}>
                            <Text style={styles.todaySectionTitle}>📌 Today's Allocations</Text>
                            {todayOrders.map((item, idx) => (
                                <View key={`today-${item.sono}-${item.srno}-${idx}`}>
                                    {renderOrderCard(item, true)}
                                </View>
                            ))}
                        </View>
                    )}

                    {restOrders.length > 0 && (
                        <>
                            {todayOrders.length > 0 && (
                                <Text style={styles.sectionTitle}>Other Orders</Text>
                            )}
                            <FlatList
                                data={renderedRestOrders}
                                renderItem={({ item }) => renderOrderCard(item, false)}
                                keyExtractor={(item, index) => `${item.sono}_${item.srno}_${index}`}
                                onEndReached={loadMoreRestOrders}
                                onEndReachedThreshold={0.5}
                                ListFooterComponent={restLoading ? (
                                    <View style={styles.loadingIndicator}>
                                        <Text>Loading more...</Text>
                                    </View>
                                ) : null}
                                scrollEnabled={false}
                            />
                        </>
                    )}
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
        borderWidth: 1,
        borderColor: 'transparent',
    },
    orderCardWithAllocation: {
        borderColor: 'rgb(178, 219, 252)',
        borderWidth: 2,
        backgroundColor: 'rgb(255, 255, 255)',
    },
    orderCardToday: {
        borderColor: 'rgb(178, 219, 252)',
        borderWidth: 2,
        backgroundColor: '#F5F9FF',
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
        borderColor: theme.BORDER,
        borderBottomWidth: 2,
    },
    orderButtonContainer: {
        display: 'flex',
        flexDirection: 'row'
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
    allocationBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#90CAF9',
    },
    allocationBadgeText: {
        color: '#1565C0',
        fontSize: 10,
        fontWeight: 'bold',
    },
    todaySection: {
        marginBottom: 16,
        backgroundColor: ' #F5F9FF',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#64B5F6',
        shadowColor: '#64B5F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    todaySectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1565C0',
        marginBottom: 8,
        paddingLeft: 4,
    },
});

export default SOPartyDetails;