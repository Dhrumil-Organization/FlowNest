// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { useFocusEffect } from '@react-navigation/native';
// import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, ActivityIndicator, Alert } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import HeaderBar from '../HeaderBar/HeaderBar';
// import theme from '../../android/app/src/theme';
// import axios from 'axios';
// import CustomDrawer from './CustomDrawer';
// import data from './data.json'; // Replace with your new JSON
// import { API } from '../../common/API/dynamicAPI';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { crlimtreq_styles } from '../../common/Styles/Style';
// import { ExeData, DesignData, ItemData, POTData, ItemStatus, CardPayload } from './Modal';

// const { width } = Dimensions.get('window');
// const isTablet = width >= 600;

// interface Party {
//     parcode: string;
//     partyname: string;
//     noof: string;
//     totmtr: string;
//     pendingmtr: string;
//     amount: string;
//     pendingamt: string;
// }

// interface Summary {
//     noof: string;
//     totmtr: string;
//     amount: string;
//     pendingmtr: string;
//     pendingamt: string;
// }

// const formatValue = (value: string) => {
//     const num = parseFloat(value);
//     if (isNaN(num)) return value;
//     if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
//     if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
//     if (num >= 1000) return `${(num / 1000).toFixed(2)} K`;
//     return num.toFixed(2);
// };

// const formatNumber = (value: string) => {
//     return parseFloat(value).toLocaleString('en-IN');
// };


// const SalesOrderTracking: React.FC<{ token: string, navigation: any; username: string }> = ({ token, navigation, username }) => {
//     // const { salessumdata, salesdata } = data.data;
//     const [loading, setLoading] = useState(false);
//     const [page, setPage] = useState(1);
//     const [renderedData, setRenderedData] = useState<Party[]>([]);
//     const [getPartyData, setPartyData] = useState([]);
//     const [salessumdata, setsalessumdata] = useState([]);
//     const [salesdata, setsalesdata] = useState<Party[]>([]);
//     const [salesdataTotal, setsalesdataTotal] = useState(null);
//     const itemsPerPage = 10;
//     // 
//     const [isLoading, setIsLoading] = useState(false);
//     const [getTrackingLoader, setTrackingLoader] = useState(false);
//     const [isDrawerVisible, setIsDrawerVisible] = useState(false);
//     const [searchQueryPOT, setSearchQueryPOT] = useState('');
//     const [filteredData, setFilteredData] = useState<Party[]>([]);
//     const [fromDate, setFromDate] = useState<Date>(new Date());
//     const [toDate, setToDate] = useState<Date>(new Date());
//     const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
//     const [selectedExe, setSelectedExe] = useState<ExeData | null>(null);
//     const [exeData, setExeData] = useState<ExeData[]>([]);
//     const [designData, setDesignData] = useState<DesignData[]>([]);
//     const [itemData, setItemData] = useState<ItemData[]>([]);
//     // const [page, setpage] = useState(0);
//     const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([])
//     const [selectedItems, setSelectedItems] = useState<ItemData[]>([])
//     const [selectedParty, setSelectedParty] = useState([])
//     const [selectedItemStatus, setSelectedItemStatus] = useState<ItemStatus>('All');
//     const [gePOTData, setPOTData] = useState<POTData[]>([])
//     const [getpayload, setPayload] = useState<CardPayload[]>([])
//     const [recentlyViewed, setRecentlyViewed] = useState<Set<string>>(new Set());
//     const flatListRef = useRef<FlatList>(null);

//     // 
//     console.log("salesdata::", salesdata, "salessumdata", salessumdata)
//     // Load initial data
//     // Filter data based on search query
//     useEffect(() => {
//         if (recentlyViewed.size > 0 && flatListRef.current) {
//             const dataToUse = searchQueryPOT.trim() ? filteredData : renderedData;
//             const index = dataToUse.findIndex(item => recentlyViewed.has(item.parcode));
//             if (index !== -1) {
//                 flatListRef.current.scrollToIndex({ index, animated: true });
//             }
//         }
//     }, [recentlyViewed, filteredData, renderedData, searchQueryPOT]);



//     useEffect(() => {
//         if (!searchQueryPOT.trim()) {
//             setFilteredData(salesdata.slice(0, itemsPerPage));
//             setPage(1);
//             return;
//         }

//         const lowercasedQuery = searchQueryPOT.toLowerCase();
//         const filtered = salesdata.filter(
//             (item) =>
//                 item.partyname.toLowerCase().includes(lowercasedQuery) ||
//                 item.parcode.toLowerCase().includes(lowercasedQuery) ||
//                 item.noof.toLowerCase().includes(lowercasedQuery) ||
//                 item.totmtr.toLowerCase().includes(lowercasedQuery) ||
//                 item.pendingmtr.toLowerCase().includes(lowercasedQuery) ||
//                 item.pendingamt.toLowerCase().includes(lowercasedQuery)
//         );
//         setFilteredData(filtered.slice(0, itemsPerPage));
//         setPage(1);
//     }, [searchQueryPOT, salesdata]);

//     // Update lazy loading to use filteredData
//     const loadMoreData = useCallback(() => {
//         if (loading) return;

//         const nextPage = page + 1;
//         const startIndex = page * itemsPerPage;
//         const endIndex = startIndex + itemsPerPage;

//         const dataToUse = searchQueryPOT.trim() ? filteredData : salesdata;

//         if (startIndex < dataToUse.length) {
//             setLoading(true);
//             setTimeout(() => {
//                 setRenderedData((prev) => [
//                     ...prev,
//                     ...dataToUse.slice(startIndex, endIndex)
//                 ]);
//                 setPage(nextPage);
//                 setLoading(false);
//             }, 500);
//         }
//     }, [page, loading, searchQueryPOT, filteredData, salesdata]);

//     // Get initials and color for party
//     const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').substring(0, 1);
//     const getColorForInitial = (id: string) => {
//         const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#3F51B5', '#757575', '#E91E63', '#FF5722', '#673AB7', '#009688', '#FFC107'];
//         return colors[parseInt(id) % colors.length];
//     };

//     // OLD--------------------------------------------------------------------------------------------------------------
//     const { summary, parties }: { summary: Summary; parties: Party[] } = data;

//     // const getInitials = (name: string) => {
//     //     return name.split(' ').map((n) => n[0]).join('');
//     // };

//     // const getColorForInitial = (id: string) => {
//     //     const colors = {
//     //         R: '#2196F3',
//     //         S: '#4CAF50',
//     //         P: '#FF9800',
//     //         S2: '#9C27B0',
//     //         K: '#00BCD4',
//     //         G: '#3F51B5',
//     //     };
//     //     return colors[id as keyof typeof colors] || '#757575';
//     // };

//     const rowsPerPage = 20;

//     // Set default dates
//     useEffect(() => {
//         const today = new Date();
//         const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//         setFromDate(firstDayOfMonth);
//         setToDate(today);
//     }, []);

//     let cancelToken: any;

//     const getRequestConfig = (props: any) => ({
//         headers: {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json',
//             Accept: 'application/json',
//         },
//         params: props.params,
//         cancelToken: cancelToken?.token,
//     });

//     const fetchData = async () => {
//         if (cancelToken?.cancel) cancelToken.cancel();
//         cancelToken = axios.CancelToken.source();
//         // setIsLoading(true);
//         try {
//             const payload = {
//                 prpcode: 'SIP',
//                 yearno: selectedYear,
//                 strcode: '012',
//                 txntype: 'production_order_track',
//                 prptype: '',
//                 fetch: 'salesexe'
//             };
//             const response = await axios.get(
//                 // `https://apig.tms-webapp.com/api/get_criterion`,
//                 `${API}/api/get_criterion`,
//                 getRequestConfig({
//                     params: {
//                         prpcode: 'SIP',
//                         yearno: '26',
//                         strcode: '012',
//                         txntype: 'production_order_track',
//                         prptype: '',
//                         fetch: 'salesexe'
//                     }
//                 })
//             );
//             console.log('🔵 payload', payload, response);
//             if (response.data.success && response.data.response.data.length > 0) {
//                 console.log('✅ Data Sexe:', response.data.response.data);
//                 setExeData(response.data.response.data);
//                 fetchDesign();
//                 fetchParty();
//                 // fetchItem();

//                 // setAllHistoryData([])
//             } else {
//                 // setData([]);
//             }
//         } catch (error) {
//             if (!axios.isCancel(error)) {
//                 Alert.alert('Error', `Server error: ${error}`);
//             }
//         } finally {
//             // setIsLoading(false);
//         }
//     };
//     const fetchParty = async () => {
//         if (cancelToken?.cancel) cancelToken.cancel();
//         cancelToken = axios.CancelToken.source();
//         const yearValue = selectedYear.split('-')[1].substring(2);
//         // setIsLoading(true);
//         try {
//             console.log('🔵 payload PARTY', 'HI');
//             // const payload = {
//             //     prpcode: 'SIP',
//             //     yearno: selectedYear,
//             //     strcode: '012',
//             //     txntype: 'production_order_track',
//             //     prptype: '',
//             //     fetch: 'salesexe'
//             // };

//             const payload = {
//                 prpcode: 'SIP',
//                 prptype: 'S',
//                 yearno: yearValue,
//                 strcode: "0",
//                 txntype: "sales_order",
//                 partytype: "p",
//                 type: "s",
//                 page: 1,
//                 limit: 20,
//                 search: "",
//                 isceo: 0,
//                 partype: 0,
//                 grntype: "",
//                 fetch: "",
//                 acccode: "",
//                 billdate: "",
//                 strtype: "",
//                 isfaint: "",
//                 user_id: 1,
//             };
//             console.log('🔵 payload PARTY', 'HI1');
//             const response = await axios.get(`${API}/api/mobaccountbasic`,
//                 getRequestConfig({
//                     params: payload
//                 })
//             );
//             console.log('🔵 payload PARTY', 'HI2');
//             console.log('🔵 payload PARTY', payload, response);
//             if (response.data.success && response.data.response.data.length > 0) {
//                 console.log('✅ Data Sexe:', response.data.response.data);
//                 setPartyData(response.data.response.data);
//                 // fetchDesign();
//                 // fetchItem();

//                 // setAllHistoryData([])
//             } else {
//                 // setData([]);
//             }
//         } catch (error) {
//             if (!axios.isCancel(error)) {
//                 Alert.alert('Error', `Server error: ${error}`);
//             }
//         } finally {
//             // setIsLoading(false);
//         }
//     };

//     const fetchDesign = async () => {
//         if (cancelToken?.cancel) cancelToken.cancel();
//         cancelToken = axios.CancelToken.source();
//         // setIsLoading(true);
//         try {
//             const payload = {
//                 prpcode: 'SIP',
//                 yearno: '26',
//                 strcode: '012',
//                 itmcode: '',
//                 dsncode: '',
//                 shdcode: '',
//                 page: page + 1,
//                 limit: rowsPerPage,
//                 txntype: 'production_order_track'
//             };
//             const response = await axios.get(
//                 // `https://apig.tms-webapp.com/api/getdesign`,
//                 `${API}/api/getdesign`,
//                 getRequestConfig({
//                     params: {
//                         prpcode: 'SIP',
//                         yearno: '26',
//                         strcode: '012',
//                         itmcode: '',
//                         dsncode: '',
//                         shdcode: '',
//                         page: page + 1,
//                         limit: rowsPerPage,
//                         txntype: 'production_order_track'
//                     }
//                 })
//             );
//             console.log('🔵 design payload', payload, response);
//             if (response.data.success && response.data.response.data.length > 0) {
//                 console.log('✅ Data:', response.data.response.data);
//                 setDesignData(response.data.response.data);
//                 fetchItem();
//                 // setAllHistoryData([])
//             } else {
//                 // setData([]);
//             }
//         } catch (error) {
//             if (!axios.isCancel(error)) {
//                 Alert.alert('Error', `Server error: ${error}`);
//             }
//         } finally {
//             // setIsLoading(false);
//         }
//     };

//     const fetchItem = async () => {
//         if (cancelToken?.cancel) cancelToken.cancel();
//         cancelToken = axios.CancelToken.source();
//         // setIsLoading(true);
//         try {
//             const payload = {
//                 // prpcode: 'SIP',
//                 // yearno: '26',
//                 // strcode: '012',
//                 // itmcode: '',
//                 // dsncode: '',
//                 // shdcode: '',
//                 // page: page + 1,
//                 // limit: rowsPerPage,
//                 // fetch: 'itm',
//                 // txntype: 'production_order_track'
//                 prpcode: 'SIP',
//                 yearno: '26',
//                 strcode: '012',
//                 txntype: 'production_order_track',
//                 prptype: '',
//                 limit: 20,
//                 fetch: 'itm',
//                 itmcode: '',
//                 strcodes: '012',
//                 issdate: ''
//             };
//             const response = await axios.get(
//                 // `https://apig.tms-webapp.com/api/get_criterion`,
//                 `${API}/api/get_criterion`,
//                 getRequestConfig({
//                     params: {
//                         prpcode: 'SIP',
//                         yearno: '26',
//                         strcode: '012',
//                         txntype: 'production_order_track',
//                         prptype: '',
//                         limit: 20,
//                         fetch: 'itm',
//                         itmcode: '',
//                         strcodes: '012',
//                         issdate: ''
//                     }
//                 })
//             );
//             console.log('🔵 item payload', payload, response);
//             if (response.data.success && response.data.response.data.length > 0) {
//                 console.log('✅ Data:', response.data.response.data);
//                 setItemData(response.data.response.data);
//                 // setAllHistoryData([])
//             } else {
//                 // setData([]);
//             }
//         } catch (error) {
//             if (!axios.isCancel(error)) {
//                 Alert.alert('Error', `Server error: ${error}`);
//             }
//         } finally {
//             // setIsLoading(false);
//         }
//     };

//     const getToken = () => {
//         return token;
//     };

//     const formatDate = (rawDate: any) => {
//         let day = rawDate.getDate().toString().padStart(2, '0') || '';
//         let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
//         let year = rawDate.getFullYear() || '';
//         return `${day}-${month}-${year}`;
//     };

//     const CACHE_KEY_CONFIRM_ACTION = 'sales_order_tracking_confirm_action';
//     const CACHE_KEY_CARD_PRESS = 'sales_order_tracking_card_press_';
//     const CACHE_KEY_RECENTLY_VIEWED = 'sales_order_tracking_recently_viewed';


//     // Save data to AsyncStorage
//     const saveToCache = async (key: string, data: any) => {
//         try {
//             await AsyncStorage.setItem(key, JSON.stringify(data));
//         } catch (error) {
//             console.error('Error saving to cache:', error);
//         }
//     };

//     // Load data from AsyncStorage
//     const loadFromCache = async (key: string) => {
//         try {
//             const data = await AsyncStorage.getItem(key);
//             return data ? JSON.parse(data) : null;
//         } catch (error) {
//             console.error('Error loading from cache:', error);
//             return null;
//         }
//     };

//     // Save recentlyViewed to AsyncStorage
//     const saveRecentlyViewedToCache = async (recentlyViewed: Set<string>) => {
//         try {
//             await AsyncStorage.setItem(CACHE_KEY_RECENTLY_VIEWED, JSON.stringify(Array.from(recentlyViewed)));
//         } catch (error) {
//             console.error('Error saving recentlyViewed to cache:', error);
//         }
//     };

//     // Load recentlyViewed from AsyncStorage
//     const loadRecentlyViewedFromCache = async (): Promise<Set<string>> => {
//         try {
//             const data = await AsyncStorage.getItem(CACHE_KEY_RECENTLY_VIEWED);
//             return data ? new Set(JSON.parse(data)) : new Set();
//         } catch (error) {
//             console.error('Error loading recentlyViewed from cache:', error);
//             return new Set();
//         }
//     };

//     useEffect(() => {
//         const loadRecentlyViewed = async () => {
//             const cachedRecentlyViewed = await loadRecentlyViewedFromCache();
//             setRecentlyViewed(cachedRecentlyViewed);
//         };
//         loadRecentlyViewed();
//     }, []);

//     useEffect(() => {
//         saveRecentlyViewedToCache(recentlyViewed);
//     }, [recentlyViewed]);



//     // Generate a unique key for handleCardPress based on partyData
//     const getCardPressCacheKey = (partyData: Party) => {
//         return `${CACHE_KEY_CARD_PRESS}${partyData.parcode}`;
//     };

//     // useEffect(() => {
//     //     const loadCachedData = async () => {
//     //         const cachedConfirmAction = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
//     //         if (cachedConfirmAction) {
//     //             setsalesdata(cachedConfirmAction.response.data.salesdata);
//     //             setsalesdataTotal(cachedConfirmAction.response.data.salesdata.length);
//     //             setsalessumdata(cachedConfirmAction.response.data.salessumdata);
//     //         }
//     //     };
//     //     loadCachedData();
//     // }, []);


//     // Inside your component
//     useFocusEffect(
//         useCallback(() => {
//             const loadAllCachedData = async () => {
//                 const cachedConfirmAction = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
//                 const cachedRecentlyViewed = await loadRecentlyViewedFromCache();
//                 if (cachedConfirmAction) {
//                     setsalesdata(cachedConfirmAction.response.data.salesdata);
//                     setsalesdataTotal(cachedConfirmAction.response.data.salesdata.length);
//                     setsalessumdata(cachedConfirmAction.response.data.salessumdata);
//                 }
//                 setRecentlyViewed(cachedRecentlyViewed);
//             };
//             loadAllCachedData();
//             return () => {
//                 // Save all relevant data when leaving the screen
//                 const saveAllData = async () => {
//                     const cachedData = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
//                     if (cachedData) {
//                         await saveToCache(CACHE_KEY_CONFIRM_ACTION, cachedData);
//                     }
//                     await saveRecentlyViewedToCache(recentlyViewed);
//                 };
//                 saveAllData();
//             };
//         }, [recentlyViewed])
//     );

//     useEffect(() => {
//         if (recentlyViewed.size > 0 && flatListRef.current && (searchQueryPOT.trim() ? filteredData.length > 0 : renderedData.length > 0)) {
//             const dataToUse = searchQueryPOT.trim() ? filteredData : renderedData;
//             const index = dataToUse.findIndex(item => recentlyViewed.has(item.parcode));
//             if (index !== -1) {
//                 setTimeout(() => {
//                     flatListRef.current?.scrollToIndex({ index, animated: true });
//                 }, 300); // Small delay to ensure FlatList is ready
//             }
//         }
//     }, [recentlyViewed, filteredData, renderedData, searchQueryPOT]);





//     // const handleConfirmAction = async () => {
//     //     setIsLoading(true);
//     //     const yearValue = selectedYear.split('-')[1].substring(2);
//     //     const dsnCodes = selectedDesigns.map((design) => design.DsnCode);
//     //     const partyCodes = selectedParty.map((item) => item.acccode);
//     //     const dsnNames = selectedDesigns.map((design) => design.DsnName);
//     //     const itemCodes = selectedItems.map((item) => item.ItmCode);
//     //     const itemNames = selectedItems.map((item) => item.ItmName);
//     //     const partyNames = selectedParty.map((item) => item.accountname);

//     //     const payload = {
//     //         fromdate: formatDate(fromDate),
//     //         // todate: toDate.toISOString().split('T')[0],
//     //         todate: formatDate(toDate),
//     //         yearno: yearValue,
//     //         sexes: selectedExe?.Code ? selectedExe?.Code : '0',
//     //         type: selectedItemStatus === 'All' ? 'all' : selectedItemStatus === 'Open' ? 'open' : selectedItemStatus === 'Closed' ? 'closed' : 'all',
//     //         dsncodes: dsnCodes,
//     //         // items: itemCodes,
//     //         parties: partyCodes,
//     //         prptype: 'S',
//     //         txntype: 'prodorderlist'
//     //     };
//     //     const sendCardPayload = {
//     //         fromdate: formatDate(fromDate),
//     //         todate: formatDate(toDate),
//     //         yearno: yearValue,
//     //         sexe: selectedExe?.Code ? selectedExe?.Code : '0',
//     //         dsncode: dsnCodes,
//     //         dsnname: dsnNames,
//     //         itmcode: itemCodes,
//     //         itmname: itemNames,
//     //         parcode: partyCodes,
//     //         parname: partyNames,
//     //         prptype: 'S',
//     //         txntype: 'prodordertrack',
//     //         rowdata: {}
//     //     };
//     //     console.log('🔵 payload', payload);
//     //     const sendpayload = [sendCardPayload]
//     //     setPayload(sendpayload as object as CardPayload[]);
//     //     const headers = {
//     //         Authorization: `Bearer ${getToken()}`,
//     //         'Content-Type': 'application/json',
//     //         'X-Requested-with': 'XMLHttpRequest',
//     //     };
//     //     try {
//     //         // const response = await axios.post(`https://apig.tms-webapp.com/api/prodorderlist`, payload, { headers });
//     //         const response = await axios.post(`${API}/api/salesordertracking`, payload, { headers });
//     //         console.log('🔵 response dataaaaa:', response);
//     //         if (response.data.success === true && response.data.data.salesdata.length === 0) {
//     //             setIsLoading(false);
//     //             Alert.alert('No Data Found');
//     //             setPOTData([]);
//     //             // setresponsemessage(response.data.message || 'Success');
//     //             // setTimeout(() => {
//     //             //     setSuccess(false);
//     //             //     setShowOverlay(false);
//     //             // }, 2000);
//     //             // setProcessedCards(prev => new Set(prev).add(selectedItem.uid));

//     //         } else if (response.data.success === true && response.data.data.salesdata.length > 0) {
//     //             setIsLoading(false);
//     //             const { salessumdata12, salesdata12 } = response.data.data;
//     //             // setPOTData(response.data.data)
//     //             // ;
//     //             console.log("salesdata::", response.data.data.salesdata, "salessumdata", response.data.data.salessumdatas)
//     //             setPOTData(response.data as any);
//     //             setsalesdata(response.data.data.salesdata);
//     //             setsalesdataTotal(response.data.data.salesdata.length);
//     //             setsalessumdata(response.data.data.salessumdata);

//     //             closeDrawer();
//     //             // setresponsemessage(response.data.message || 'Success');
//     //             // setTimeout(() => {
//     //             //     setSuccess(false);
//     //             //     setShowOverlay(false);
//     //             // }, 2000);
//     //             // setProcessedCards(prev => new Set(prev).add(selectedItem.uid));
//     //         } else if (response.data.success === false) {
//     //             setIsLoading(false);
//     //             Alert.alert(`${response.data.message}`);
//     //             setPOTData([]);
//     //         } else {
//     //             setIsLoading(false);
//     //             Alert.alert(`${response.data.message}`);
//     //             setPOTData([]);
//     //         }

//     //     } catch (error) {
//     //         setIsLoading(false);
//     //         Alert.alert('Server Error');
//     //         setPOTData([]);
//     //         // setTimeout(() => {
//     //         //     setSuccess(false);
//     //         // }, 2000);
//     //     }


//     // };

//     // New function to handle card press, payload creation, and navigation

//     const handleConfirmAction = async () => {
//         setIsLoading(true);
//         const yearValue = selectedYear.split('-')[1].substring(2);
//         const dsnCodes = selectedDesigns.map((design) => design.DsnCode);
//         const partyCodes = selectedParty.map((item) => item.acccode);
//         const dsnNames = selectedDesigns.map((design) => design.DsnName);
//         const itemCodes = selectedItems.map((item) => item.ItmCode);
//         const itemNames = selectedItems.map((item) => item.ItmName);
//         const partyNames = selectedParty.map((item) => item.accountname);

//         const payload = {
//             fromdate: formatDate(fromDate),
//             todate: formatDate(toDate),
//             yearno: yearValue,
//             sexes: selectedExe?.Code ? selectedExe?.Code : '0',
//             type: selectedItemStatus === 'All' ? 'all' : selectedItemStatus === 'Open' ? 'open' : selectedItemStatus === 'Closed' ? 'closed' : 'all',
//             dsncodes: dsnCodes,
//             parties: partyCodes,
//             prptype: 'S',
//             txntype: 'prodorderlist'
//         };
//         console.log('🔵 payload qqqqq:', payload);


//         // Check cache first
//         const cachedData = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
//         if (cachedData && JSON.stringify(cachedData.payload) === JSON.stringify(payload)) {
//             console.log('Using cached data for handleConfirmAction');
//             setsalesdata(cachedData.response.data.salesdata);
//             setsalesdataTotal(cachedData.response.data.salesdata.length);
//             setsalessumdata(cachedData.response.data.salessumdata);
//             setIsLoading(false);
//             closeDrawer();
//             return;
//         }

//         // If not in cache, proceed with API call
//         const headers = {
//             Authorization: `Bearer ${getToken()}`,
//             'Content-Type': 'application/json',
//             'X-Requested-with': 'XMLHttpRequest',
//         };

//         try {
//             const response = await axios.post(`${API}/api/salesordertracking`, payload, { headers });
//             console.log('🔵 payload qqqqq:', payload, response);
//             if (response.data.success === true && response.data.data.salesdata.length > 0) {
//                 const { salessumdata12, salesdata12 } = response.data.data;
//                 setsalesdata(response.data.data.salesdata);
//                 setsalesdataTotal(response.data.data.salesdata.length);
//                 setsalessumdata(response.data.data.salessumdata);
//                 // Save to cache
//                 await saveToCache(CACHE_KEY_CONFIRM_ACTION, { payload, response: response.data });
//                 closeDrawer();
//             } else if (response.data.success === false) {
//                 Alert.alert(`${response.data.message}`);
//                 setsalesdata([]);
//                 setsalessumdata([]);
//             }
//         } catch (error) {
//             Alert.alert('Server Error');
//             setsalesdata([]);
//             setsalessumdata([]);
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     // const handleCardPress = async (partyData: Party) => {
//     //     const dsnCodes = selectedDesigns.map((design) => design.DsnCode);
//     //     const partyCodes = selectedParty.map((item) => item.acccode);
//     //     const headers = {
//     //         Authorization: `Bearer ${getToken()}`,
//     //         'Content-Type': 'application/json',
//     //         'X-Requested-with': 'XMLHttpRequest',
//     //     };
//     //     setTrackingLoader(true);
//     //     try {
//     //         // 1. Log the selected party data
//     //         console.log("Selected Party Data:", JSON.stringify(partyData, null, 2));

//     //         // 2. Create payload for API call (similar to your handleConfirmAction)
//     //         const yearValue = selectedYear.split('-')[1].substring(2);

//     //         const payload = {
//     //             fromdate: formatDate(fromDate),
//     //             // todate: toDate.toISOString().split('T')[0],
//     //             todate: formatDate(toDate),
//     //             yearno: yearValue,
//     //             sexes: selectedExe?.Code ? selectedExe?.Code : '0',
//     //             type: selectedItemStatus === 'All' ? 'all' : selectedItemStatus === 'Open' ? 'open' : selectedItemStatus === 'Closed' ? 'closed' : 'all',
//     //             dsncodes: dsnCodes,
//     //             // items: itemCodes,
//     //             parcode: partyData.parcode,
//     //             prptype: 'S',
//     //             txntype: 'prodorderlist'
//     //         };

//     //         const response = await axios.post(`${API}/api/salesorderpartytracking`, payload, { headers });

//     //         // 3. Log the payload
//     //         console.log("Party Details Payload:", JSON.stringify(payload, null, 2));
//     //         console.log("Party Details Response:", JSON.stringify(response.data, null, 2));
//     //         console.log("Party Details Response123:", response);
//     //         if (response.data.success === true) {
//     //             setTrackingLoader(false);
//     //             await AsyncStorage.setItem('parties_tracking_details', JSON.stringify(response.data.data, null, 2));
//     //             navigation.navigate('SOPartyDetails', {
//     //                 party: partyData.partyname,
//     //             });
//     //         }

//     //     } catch (error) {
//     //         setTrackingLoader(false);
//     //         console.error("Error in handleCardPress:", error);
//     //         Alert.alert("Error", "Failed to process party details");
//     //     }
//     // };


//     const handleCardPress = async (partyData: Party) => {
//         const cacheKey = getCardPressCacheKey(partyData);
//         const cachedData = await loadFromCache(cacheKey);

//         // if (cachedData) {
//         //     console.log('Using cached data for handleCardPress');
//         //     await AsyncStorage.setItem('parties_tracking_details', JSON.stringify(cachedData, null, 2));
//         //     navigation.navigate('SOPartyDetails', { party: partyData.partyname });
//         //     return;
//         // }

//         // If not in cache, proceed with API call
//         const yearValue = selectedYear.split('-')[1].substring(2);
//         const dsnCodes = selectedDesigns.map((design) => design.DsnCode);
//         const headers = {
//             Authorization: `Bearer ${getToken()}`,
//             'Content-Type': 'application/json',
//             'X-Requested-with': 'XMLHttpRequest',
//         };
//         setTrackingLoader(true);

//         try {
//             const payload = {
//                 fromdate: formatDate(fromDate),
//                 todate: formatDate(toDate),
//                 yearno: yearValue,
//                 sexes: selectedExe?.Code ? selectedExe?.Code : '0',
//                 type: selectedItemStatus === 'All' ? 'all' : selectedItemStatus === 'Open' ? 'open' : selectedItemStatus === 'Closed' ? 'closed' : 'all',
//                 dsncodes: dsnCodes,
//                 parcode: partyData.parcode,
//                 prptype: 'S',
//                 txntype: 'prodorderlist'
//             };

//             const response = await axios.post(`${API}/api/salesorderpartytracking`, payload, { headers });
//             if (response.data.success === true) {
//                 await AsyncStorage.setItem('parties_tracking_details', JSON.stringify(response.data.data, null, 2));
//                 // Save to cache
//                 await saveToCache(cacheKey, response.data.data);
//                 setRecentlyViewed(prev => new Set(prev).add(partyData.parcode));
//                 await AsyncStorage.setItem('parties_tracking_details_last_view', JSON.stringify(response.data.data, null, 2));
//                 navigation.navigate('SOPartyDetails', { party: partyData.partyname });
//             }
//         } catch (error) {
//             console.error("Error in handleCardPress:", error);
//             Alert.alert("Error", "Failed to process party details");
//         } finally {
//             setTrackingLoader(false);
//         }
//     };

//     useEffect(() => {
//         if (fromDate && toDate && selectedYear) {
//             fetchData();
//             // fetchDesign();
//         }
//     }, []);

//     useEffect(() => {
//         if (searchQueryPOT.trim() || renderedData.length === 0) {
//             setRecentlyViewed(new Set());
//         }
//     }, [searchQueryPOT, renderedData]);


//     const handleDesignSelect = (designs: DesignData[]) => {
//         setSelectedDesigns(designs);
//         console.log("Selected Designs in Parent:", designs);
//     };
//     const handleItemSelect = (items: ItemData[]) => {
//         setSelectedItems(items);
//         console.log("Selected Items in Parent:", items);
//     };
//     const handleItemStatusChange = (status: ItemStatus) => {
//         setSelectedItemStatus(status);
//     };

//     // Handle Load Button Press
//     const handleLoadPress = () => {
//         // console.log({
//         //     fromDate: fromDate.toISOString().split('T')[0],
//         //     toDate: toDate.toISOString().split('T')[0],
//         //     selectedYear,
//         //     selectedExeCode: selectedExe?.Code,
//         //     selectedExeName: selectedExe?.SalesExecutive,
//         //     selectedDesigns, // Now includes selected designs
//         //     selectedItems, // Now includes selected items
//         //     selectedItemStatus
//         // });
//         handleConfirmAction();
//     };

//     const openDrawer = () => setIsDrawerVisible(true);
//     const closeDrawer = () => setIsDrawerVisible(false);
//     // Render party card
//     // --- Render party card ---

//     // --- Render party card ---
//     const renderPartyCard = ({ item }: { item: Party }) => (
//         <TouchableOpacity
//             style={[
//                 styles.partyCard,
//                 recentlyViewed.has(item.parcode) && styles.recentlyViewedCard
//             ]}
//             onPress={() => handleCardPress(item)}
//         >
//             {/* Avatar + Party Name + Orders (First Row) */}
//             <View style={styles.partyHeader}>
//                 <View style={[styles.partyAvatar, { backgroundColor: getColorForInitial(item.parcode) }]}>
//                     {getTrackingLoader ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.partyAvatarText}>{getInitials(item.partyname)}</Text>}
//                 </View>

//                 <View style={styles.partyInfo}>
//                     <Text style={styles.partyName}>{item.partyname}</Text>
//                     <View style={styles.partyOrdersContainer}>
//                         <Text style={styles.partyOrdersText}>{item.noof} orders</Text>
//                     </View>
//                 </View>

//                 <Icon name="chevron-right" size={24} color="#999" style={styles.chevronIcon} />
//             </View>

//             {/* Values Section (Two Rows) */}
//             <View style={styles.partyValues}>
//                 {/* First Row: Mtr + Pending */}
//                 <View style={styles.valueRow}>
//                     <View style={styles.valueItem}>
//                         <Text style={styles.valueLabel}>Total Meter:</Text>
//                         {/* <Text style={styles.valueText}>{formatNumber(item.totmtr)}</Text> */}
//                         <Text style={styles.valueText}>{item.totmtr}</Text>
//                     </View>
//                     <View style={styles.valueItem}>
//                         <Text style={[styles.valueLabel, { color: '#E65100' }]}>Pending Meter:</Text>
//                         <Text style={[styles.valueText, { color: '#E65100' }]}>{item.pendingmtr}</Text>
//                     </View>
//                 </View>

//                 {/* Second Row: Amt + Rate */}
//                 <View style={styles.valueRow}>
//                     <View style={styles.valueItem}>
//                         <Text style={styles.valueLabel}>Amount:</Text>
//                         <Text style={styles.valueText}>{formatValue(item.amount)}</Text>
//                     </View>
//                     <View style={styles.valueItem}>
//                         <Text style={[styles.valueLabel, { color: '#4CAF50' }]}>Pending Amount:</Text>
//                         <Text style={[styles.valueText, { color: '#4CAF50' }]}>{formatValue(item.pendingamt)}</Text>
//                     </View>
//                 </View>
//             </View>
//             {recentlyViewed.has(item.parcode) && (
//                 <View style={styles.recentlyViewedBadge}>
//                     <Text style={styles.recentlyViewedText}>Recently Viewed</Text>
//                 </View>
//             )}
//         </TouchableOpacity>
//     );

//     // --- Footer for loading indicator ---
//     const renderFooter = () => {
//         if (!loading) return null;
//         return <ActivityIndicator style={styles.loadingIndicator} size="large" color={theme.BRAND_GRADIENT_END} />;
//     };

//     return (
//         <>
//             <HeaderBar userName={username} placeholder="Search sales order..." onSearch={setSearchQueryPOT} />
//             <TouchableOpacity style={styles.listIconContainer} onPress={() => setIsDrawerVisible(true)}>
//                 <Icon name="list" size={24} color="white" />
//             </TouchableOpacity>

//             <CustomDrawer
//                 isVisible={isDrawerVisible}
//                 onClose={() => setIsDrawerVisible(false)}
//                 fromDate={fromDate}
//                 toDate={toDate}
//                 selectedYear={selectedYear}
//                 onFromDateChange={setFromDate}
//                 onToDateChange={setToDate}
//                 onYearChange={setSelectedYear}
//                 onLoadPress={handleConfirmAction}
//                 exeData={exeData}
//                 onExeChange={setSelectedExe}
//                 selectedExe={selectedExe?.SalesExecutive || 'Select Executive'}
//                 designData={designData}
//                 getPartyData={getPartyData}
//                 isLoading={isLoading}
//                 setIsLoading={setIsLoading}
//                 onDesignSelect={setSelectedDesigns}
//                 onItemSelectItem={setSelectedItems}
//                 onItemSelectParty={setSelectedParty}
//                 selectedDesigns={selectedDesigns}
//                 setSelectedDesigns={setSelectedDesigns}
//                 selectedItems={selectedItems}
//                 setSelectedItems={setSelectedItems}
//                 itemData={itemData}
//                 selectedItemStatus={selectedItemStatus}
//                 onItemStatusChange={setSelectedItemStatus}
//                 setSelectedParty={setSelectedParty}
//                 selectedParty={selectedParty}
//             />
//             {salessumdata.length > 0 && (


//                 <View style={styles.container}>
//                     {/* Summary Cards */}
//                     <View style={styles.summaryContainer}>
//                         <View style={[styles.summaryBox, { backgroundColor: '#E3F2FD' }]}>
//                             <Text style={styles.summaryLabel}>Total Orders</Text>
//                             <Text style={styles.summaryValue}>{formatNumber(salessumdata[0].noof)}</Text>
//                         </View>
//                         <View style={[styles.summaryBox, { backgroundColor: '#E8F5E8' }]}>
//                             <Text style={styles.summaryLabel}>Total Meter</Text>
//                             <Text style={styles.summaryValue}>{formatNumber(salessumdata[0].totmtr)}</Text>
//                             <Text style={[styles.summaryLabel, { marginTop: 5 }]}>Amount</Text>
//                             <Text style={styles.summaryValue}>{formatValue(salessumdata[0].amount)}</Text>
//                         </View>
//                         <View style={[styles.summaryBox, { backgroundColor: '#FFF3E0' }]}>
//                             <Text style={styles.summaryLabel}>Pending Meter</Text>
//                             <Text style={[styles.summaryValue, { color: '#E65100' }]}>{salessumdata[0].pendingmtr}</Text>
//                             <Text style={[styles.summaryLabel, { marginTop: 5 }]}>Pending Amount</Text>
//                             <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>{formatValue(salessumdata[0].pendingamt)}</Text>
//                         </View>
//                     </View>

//                     {/* Party List with Lazy Loading */}
//                     {/* <Text style={styles.sectionTitle}>ALL PARTIES ({formatNumber(salessumdata[0].noof)})</Text> */}
//                     <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
//                         <Text style={styles.sectionTitle}>
//                             PARTIES ({searchQueryPOT.trim() ? filteredData.length : (renderedData && renderedData.length) || '0'})
//                         </Text>
//                         <Text style={styles.sectionTitle}>
//                             {/* ALL PARTIES ({searchQueryPOT.trim() ? filteredData.length : (renderedData && renderedData.length) || '0'}) */}
//                             ALL PARTIES ({salesdataTotal || '0'})
//                         </Text>

//                     </View>

//                     {/* <FlatList
//                         data={searchQueryPOT.trim() ? filteredData : renderedData}
//                         renderItem={renderPartyCard}
//                         keyExtractor={(item, index) => `${item.parcode}-${index}`}
//                         onEndReached={loadMoreData}
//                         onEndReachedThreshold={0.5}
//                         ListFooterComponent={renderFooter}
//                         contentContainerStyle={styles.listContent}
//                         ListEmptyComponent={
//                             !isLoading ? (
//                                 <View style={crlimtreq_styles.emptyContainer}>
//                                     <Text style={crlimtreq_styles.emptyText}>No request data found!</Text>
//                                 </View>
//                             ) : null
//                         }
//                     /> */}
//                     <FlatList
//                         ref={flatListRef}
//                         data={searchQueryPOT.trim() ? filteredData : renderedData}
//                         renderItem={renderPartyCard}
//                         keyExtractor={(item, index) => `${item.parcode}-${index}`}
//                         onEndReached={loadMoreData}
//                         onEndReachedThreshold={0.5}
//                         ListFooterComponent={renderFooter}
//                         contentContainerStyle={styles.listContent}
//                         ListEmptyComponent={
//                             !isLoading ? (
//                                 <View style={crlimtreq_styles.emptyContainer}>
//                                     <Text style={crlimtreq_styles.emptyText}>No request data found!</Text>
//                                 </View>
//                             ) : null
//                         }
//                         extraData={recentlyViewed}
//                     />


//                 </View>
//             )}
//         </>
//     );
// };

// const styles = StyleSheet.create({
//     listIconContainer: {
//         position: 'absolute',
//         top: 85,
//         right: 20,
//         zIndex: 1,
//         backgroundColor: theme.BRAND_GRADIENT_END,
//         borderRadius: 3,
//         padding: 4,
//     },

//     partyAvatarContainer: {
//         marginRight: 12,
//     },


//     partyNameContainer: {
//         flex: 1,
//     },
//     partyNameText: {
//         fontSize: isTablet ? 16 : 14,
//         fontWeight: 'bold',
//         color: '#333',
//     },

//     partyValuesContainer: {
//         marginRight: 10,
//         alignItems: 'flex-end',
//     },
//     partyValueRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         width: 180, // Fixed width for alignment
//         marginVertical: 2,
//     },
//     partyValueItem: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     partyValueLabel: {
//         fontSize: isTablet ? 12 : 10,
//         color: '#666',
//         marginRight: 4,
//     },
//     partyValueText: {
//         fontSize: isTablet ? 14 : 12,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     partyValueDivider: {
//         height: 1,
//         backgroundColor: '#eee',
//         width: '100%',
//         marginVertical: 4,
//     },
//     container: {
//         flex: 1,
//         backgroundColor: '#f5f5f5',
//         padding: isTablet ? 20 : 10,
//     },
//     summaryContainer: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginBottom: 20,
//     },
//     summaryBox: {
//         flex: 1,
//         marginHorizontal: 5,
//         padding: 15,
//         borderRadius: 10,
//         alignItems: 'center',
//     },
//     summaryLabel: {
//         fontSize: isTablet ? 14 : 12,
//         color: '#555',
//         alignSelf: 'flex-end',
//     },
//     summaryValue: {
//         fontSize: isTablet ? 14 : 12,
//         fontWeight: 'bold',
//         color: '#333',
//         marginTop: 5,
//         alignSelf: 'flex-end',
//     },
//     sectionTitle: {
//         fontSize: isTablet ? 18 : 14,
//         fontWeight: 'bold',
//         color: '#333',
//         marginBottom: 10,
//     },

//     partyInitialContainer: {
//         marginRight: 15,
//     },
//     partyInitialCircle: {
//         width: isTablet ? 50 : 40,
//         height: isTablet ? 50 : 40,
//         borderRadius: isTablet ? 25 : 20,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     partyInitialText: {
//         color: '#fff',
//         fontSize: isTablet ? 20 : 16,
//         fontWeight: 'bold',
//     },
//     partyDetails: {
//         flex: 1,
//     },

//     partyLocationContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginTop: 5,
//     },
//     partyLocation: {
//         fontSize: isTablet ? 14 : 12,
//         color: '#666',
//         marginLeft: 5,
//     },
//     partyStats: {
//         alignItems: 'flex-end',
//         marginRight: 10,
//     },
//     partyOrders: {
//         fontSize: isTablet ? 14 : 12,
//         color: '#666',
//         marginBottom: 5,
//     },

//     loadingIndicator: {
//         padding: 20,
//     },
//     listContent: {
//         paddingBottom: 20,
//     },
//     partyCard: {
//         backgroundColor: '#fff',
//         borderRadius: 10,
//         padding: 16,
//         marginBottom: 12,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 2,
//     },
//     partyHeader: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 12,
//     },
//     partyAvatar: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginRight: 12,
//     },
//     partyAvatarText: {
//         color: '#fff',
//         fontSize: 16,
//         fontWeight: 'bold',
//     },
//     partyInfo: {
//         flex: 1,
//     },
//     partyName: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     partyOrdersContainer: {
//         marginTop: 4,
//     },
//     partyOrdersText: {
//         fontSize: 12,
//         color: '#666',
//     },
//     chevronIcon: {
//         marginLeft: 'auto',
//     },
//     partyValues: {
//         marginTop: 8,
//     },
//     valueRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginBottom: 6,
//     },
//     valueItem: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     valueLabel: {
//         fontSize: 12,
//         color: '#666',
//         marginRight: 4,
//     },
//     valueText: {
//         fontSize: 12,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     recentlyViewedCard: {
//         borderWidth: 2,
//         borderColor: theme.BRAND_GRADIENT_END,
//     },
//     recentlyViewedBadge: {
//         position: 'absolute',
//         top: 8,
//         right: 8,
//         backgroundColor: theme.BRAND_GRADIENT_END,
//         padding: 4,
//         borderRadius: 4,
//     },
//     recentlyViewedText: {
//         color: 'white',
//         fontSize: 10,
//     },
// });


// export default React.memo(SalesOrderTracking);

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HeaderBar from '../HeaderBar/HeaderBar';
import theme from '../../android/app/src/theme';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import CustomDrawer from './CustomDrawer';
import data from './data.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { crlimtreq_styles } from '../../common/Styles/Style';
import { ExeData, DesignData, ItemData, POTData, ItemStatus, CardPayload } from './Modal';

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

const SalesOrderTracking: React.FC<{ token: string, navigation: any; username: string }> = ({ token, navigation, username }) => {
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
    const [toDate, setToDate] = useState<Date>(new Date());
    const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
    const [selectedExe, setSelectedExe] = useState<ExeData | null>(null);
    const [exeData, setExeData] = useState<ExeData[]>([]);
    const [designData, setDesignData] = useState<DesignData[]>([]);
    const [itemData, setItemData] = useState<ItemData[]>([]);
    const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([]);
    const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
    const [selectedParty, setSelectedParty] = useState([]);
    const [selectedItemStatus, setSelectedItemStatus] = useState<ItemStatus>('All');
    const [gePOTData, setPOTData] = useState<POTData[]>([]);
    const [getpayload, setPayload] = useState<CardPayload[]>([]);
    const [lastViewedParcode, setLastViewedParcode] = useState<string | null>(null);
    const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
    const [isListReady, setIsListReady] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Cache keys
    const CACHE_KEY_CONFIRM_ACTION = 'sales_order_tracking_confirm_action';
    const CACHE_KEY_CARD_PRESS = 'sales_order_tracking_card_press_';
    const CACHE_KEY_LAST_VIEWED = 'sales_order_tracking_last_viewed';

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
    useFocusEffect(
        useCallback(() => {
            const loadAllCachedData = async () => {
                const cachedConfirmAction = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
                const lastViewed = await loadLastViewedFromCache();
                if (cachedConfirmAction) {
                    setsalesdata(cachedConfirmAction.response.data.salesdata);
                    setsalesdataTotal(cachedConfirmAction.response.data.salesdata.length);
                    setsalessumdata(cachedConfirmAction.response.data.salessumdata);
                }
                setLastViewedParcode(lastViewed);
                setHasAutoScrolled(false);
            };
            loadAllCachedData();
        }, [])
    );

    // Auto-scroll to last viewed only once and only if lastViewedParcode exists
    useEffect(() => {
        if (
            lastViewedParcode &&
            !hasAutoScrolled &&
            isListReady &&
            flatListRef.current &&
            (searchQueryPOT.trim() ? filteredData.length > 0 : renderedData.length > 0)
        ) {
            const dataToUse = searchQueryPOT.trim() ? filteredData : renderedData;
            const index = dataToUse.findIndex(item => item.parcode === lastViewedParcode);
            if (index !== -1) {
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index, animated: true });
                    setHasAutoScrolled(true);
                }, 300);
            }
        }
    }, [lastViewedParcode, filteredData, renderedData, searchQueryPOT, hasAutoScrolled, isListReady]);

    // Filter data based on search query
    useEffect(() => {
        if (!searchQueryPOT.trim()) {
            setFilteredData(salesdata.slice(0, itemsPerPage));
            setPage(1);
            return;
        }
        const lowercasedQuery = searchQueryPOT.toLowerCase();
        const filtered = salesdata.filter(
            (item) =>
                item.partyname.toLowerCase().includes(lowercasedQuery) ||
                item.parcode.toLowerCase().includes(lowercasedQuery) ||
                item.noof.toLowerCase().includes(lowercasedQuery) ||
                item.totmtr.toLowerCase().includes(lowercasedQuery) ||
                item.pendingmtr.toLowerCase().includes(lowercasedQuery) ||
                item.pendingamt.toLowerCase().includes(lowercasedQuery)
        );
        setFilteredData(filtered.slice(0, itemsPerPage));
        setPage(1);
    }, [searchQueryPOT, salesdata]);

    // Lazy loading
    const loadMoreData = useCallback(() => {
        if (loading) return;
        const nextPage = page + 1;
        const startIndex = page * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const dataToUse = searchQueryPOT.trim() ? filteredData : salesdata;
        if (startIndex < dataToUse.length) {
            setLoading(true);
            setTimeout(() => {
                setRenderedData((prev) => [...prev, ...dataToUse.slice(startIndex, endIndex)]);
                setPage(nextPage);
                setLoading(false);
            }, 500);
        }
    }, [page, loading, searchQueryPOT, filteredData, salesdata]);

    // Get initials and color for party
    const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').substring(0, 1);
    const getColorForInitial = (id: string) => {
        const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#3F51B5', '#757575', '#E91E63', '#FF5722', '#673AB7', '#009688', '#FFC107'];
        return colors[parseInt(id) % colors.length];
    };

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

    const formatDate = (rawDate: any) => {
        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || '';
        let year = rawDate.getFullYear() || '';
        return `${day}-${month}-${year}`;
    };

    const handleConfirmAction = async () => {
        setIsLoading(true);
        const yearValue = selectedYear.split('-')[1].substring(2);
        const dsnCodes = selectedDesigns.map((design) => design.DsnCode);
        const partyCodes = selectedParty.map((item: any) => item.acccode);
        const payload = {
            fromdate: formatDate(fromDate),
            todate: formatDate(toDate),
            yearno: yearValue,
            sexes: selectedExe?.Code ? selectedExe?.Code : '0',
            type: selectedItemStatus === 'All' ? 'all' : selectedItemStatus === 'Open' ? 'open' : selectedItemStatus === 'Closed' ? 'closed' : 'all',
            dsncodes: dsnCodes,
            parties: partyCodes,
            prptype: 'S',
            txntype: 'prodorderlist'
        };

        // Check cache first
        const cachedData = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
        if (cachedData && JSON.stringify(cachedData.payload) === JSON.stringify(payload)) {
            setsalesdata(cachedData.response.data.salesdata);
            setsalesdataTotal(cachedData.response.data.salesdata.length);
            setsalessumdata(cachedData.response.data.salessumdata);
            setIsLoading(false);
            closeDrawer();
            return;
        }

        // If not in cache, proceed with API call
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };

        try {
            const response = await axios.post(`${API}/api/salesordertracking`, payload, { headers });
            if (response.data.success === true && response.data.data.salesdata.length > 0) {
                setsalesdata(response.data.data.salesdata);
                setsalesdataTotal(response.data.data.salesdata.length);
                setsalessumdata(response.data.data.salessumdata);
                await saveToCache(CACHE_KEY_CONFIRM_ACTION, { payload, response: response.data });
            } else if (response.data.success === false) {
                Alert.alert(`${response.data.message}`);
                setsalesdata([]);
                setsalessumdata([]);
            }
        } catch (error) {
            Alert.alert('Server Error');
            setsalesdata([]);
            setsalessumdata([]);
        } finally {
            setIsLoading(false);
            closeDrawer();
        }
    };

    const handleCardPress = async (partyData: Party) => {
        const cacheKey = `${CACHE_KEY_CARD_PRESS}${partyData.parcode}`;
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        setTrackingLoader(true);
        try {
            const yearValue = selectedYear.split('-')[1].substring(2);
            const dsnCodes = selectedDesigns.map((design) => design.DsnCode);
            const payload = {
                fromdate: formatDate(fromDate),
                todate: formatDate(toDate),
                yearno: yearValue,
                sexes: selectedExe?.Code ? selectedExe?.Code : '0',
                type: selectedItemStatus === 'All' ? 'all' : selectedItemStatus === 'Open' ? 'open' : selectedItemStatus === 'Closed' ? 'closed' : 'all',
                dsncodes: dsnCodes,
                parcode: partyData.parcode,
                prptype: 'S',
                txntype: 'prodorderlist'
            };
            const response = await axios.post(`${API}/api/salesorderpartytracking`, payload, { headers });
            if (response.data.success === true) {
                await AsyncStorage.setItem('parties_tracking_details', JSON.stringify(response.data.data));
                await AsyncStorage.setItem('parties_tracking_details_challan_payload', JSON.stringify(payload));
                await saveLastViewedToCache(partyData.parcode);
                setLastViewedParcode(partyData.parcode);
                navigation.navigate('SOPartyDetails', { party: partyData.partyname });
            }
        } catch (error) {
            console.error("Error in handleCardPress:", error);
            Alert.alert("Error", "Failed to process party details");
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
                lastViewedParcode === item.parcode && styles.recentlyViewedCard
            ]}
            onPress={() => handleCardPress(item)}
        >
            <View style={styles.partyHeader}>
                <View style={[styles.partyAvatar, { backgroundColor: getColorForInitial(item.parcode) }]}>
                    {getTrackingLoader ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.partyAvatarText}>{getInitials(item.partyname)}</Text>}
                </View>
                <View style={styles.partyInfo}>
                    <Text style={styles.partyName}>{item.partyname}</Text>
                    <View style={styles.partyOrdersContainer}>
                        <Text style={styles.partyOrdersText}>{item.noof} orders</Text>
                    </View>
                </View>
                <Icon name="chevron-right" size={24} color="#999" style={styles.chevronIcon} />
            </View>
            <View style={styles.partyValues}>
                <View style={styles.valueRow}>
                    <View style={styles.valueItem}>
                        <Text style={styles.valueLabel}>Total Meter:</Text>
                        <Text style={styles.valueText}>{item.totmtr}</Text>
                    </View>
                    <View style={styles.valueItem}>
                        <Text style={[styles.valueLabel, { color: '#E65100' }]}>Pending Meter:</Text>
                        <Text style={[styles.valueText, { color: '#E65100' }]}>{item.pendingmtr}</Text>
                    </View>
                </View>
                <View style={styles.valueRow}>
                    <View style={styles.valueItem}>
                        <Text style={styles.valueLabel}>Amount:</Text>
                        <Text style={styles.valueText}>{formatValue(item.amount)}</Text>
                    </View>
                    <View style={styles.valueItem}>
                        <Text style={[styles.valueLabel, { color: '#4CAF50' }]}>Pending Amount:</Text>
                        <Text style={[styles.valueText, { color: '#4CAF50' }]}>{formatValue(item.pendingamt)}</Text>
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
        return <ActivityIndicator style={styles.loadingIndicator} size="large" color={theme.BRAND_GRADIENT_END} />;
    };

    return (
        <>
            <HeaderBar userName={username} placeholder="Search sales order..." onSearch={setSearchQueryPOT} />
            <TouchableOpacity style={styles.listIconContainer} onPress={openDrawer}>
                <Icon name="list" size={24} color="white" />
            </TouchableOpacity>
            <CustomDrawer
                isVisible={isDrawerVisible}
                onClose={closeDrawer}
                fromDate={fromDate}
                toDate={toDate}
                selectedYear={selectedYear}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
                onYearChange={setSelectedYear}
                onLoadPress={handleConfirmAction}
                exeData={exeData}
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
                onItemStatusChange={setSelectedItemStatus}
                setSelectedParty={setSelectedParty}
                selectedParty={selectedParty}
            />
            {salessumdata.length > 0 && (
                <View style={styles.container}>
                    <View style={styles.summaryContainer}>
                        <View style={[styles.summaryBox, { backgroundColor: '#E3F2FD' }]}>
                            <Text style={styles.summaryLabel}>Total Orders</Text>
                            <Text style={styles.summaryValue}>{formatNumber(salessumdata[0]?.noof || '0')}</Text>
                        </View>
                        <View style={[styles.summaryBox, { backgroundColor: '#E8F5E8' }]}>
                            <Text style={styles.summaryLabel}>Total Meter</Text>
                            <Text style={styles.summaryValue}>{formatNumber(salessumdata[0]?.totmtr || '0')}</Text>
                            <Text style={[styles.summaryLabel, { marginTop: 5 }]}>Amount</Text>
                            <Text style={styles.summaryValue}>{formatValue(salessumdata[0]?.amount || '0')}</Text>
                        </View>
                        <View style={[styles.summaryBox, { backgroundColor: '#FFF3E0' }]}>
                            <Text style={styles.summaryLabel}>Pending Meter</Text>
                            <Text style={[styles.summaryValue, { color: '#E65100' }]}>{salessumdata[0]?.pendingmtr || '0'}</Text>
                            <Text style={[styles.summaryLabel, { marginTop: 5 }]}>Pending Amount</Text>
                            <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>{formatValue(salessumdata[0]?.pendingamt || '0')}</Text>
                        </View>
                    </View>
                    <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={styles.sectionTitle}>
                            PARTIES ({searchQueryPOT.trim() ? filteredData.length : (renderedData && renderedData.length) || '0'})
                        </Text>
                        <Text style={styles.sectionTitle}>
                            ALL PARTIES ({salesdataTotal || '0'})
                        </Text>
                    </View>
                    <FlatList
                        ref={flatListRef}
                        data={searchQueryPOT.trim() ? filteredData : renderedData}
                        renderItem={renderPartyCard}
                        keyExtractor={(item, index) => `${item.parcode}-${index}`}
                        onEndReached={loadMoreData}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={renderFooter}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            !isLoading ? (
                                <View style={crlimtreq_styles.emptyContainer}>
                                    <Text style={crlimtreq_styles.emptyText}>No request data found!</Text>
                                </View>
                            ) : null
                        }
                        extraData={lastViewedParcode}
                        onContentSizeChange={() => setIsListReady(true)}
                    />
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    listIconContainer: {
        position: 'absolute',
        top: 85,
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
});

export default React.memo(SalesOrderTracking);
