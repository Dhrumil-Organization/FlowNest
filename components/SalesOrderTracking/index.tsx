// import { crlimtreq_styles } from '@/common/Style';
// import FullScreenLoader from '@/components/FullScreenLoader';
// import HeaderBar from '@/components/Header';
// import theme from '@/components/theme';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// // import Clipboard from '@react-native-clipboard/clipboard';
// import axios from 'axios';
// import { useRouter } from 'expo-router';
// import React, { useCallback, useEffect, useRef, useState } from 'react';
// // import {
// //     ActivityIndicator,
// //     Alert,
// //     Dimensions,
// //     FlatList,
// //     KeyboardAvoidingView,
// //     Platform,
// //     StyleSheet,
// //     Text,
// //     TextInput,
// //     TouchableOpacity,
// //     View
// // } from 'react-native';
// import {
//     ActivityIndicator,
//     Alert,
//     Dimensions,
//     FlatList,
//     KeyboardAvoidingView,
//     Platform,
//     StatusBar,
//     StyleSheet,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     View
// } from 'react-native';
// import { API } from '../../common/API/dynamicAPI';
// import {
//     generateFinancialYearOptions,
//     getCurrentFinancialYearMain,
// } from '../../common/API/Functions';
// import CustomDrawer from './CustomDrawer';
// import {
//     DesignData,
//     ExeData,
//     ItemData,
//     ItemStatus,
//     WiseStatus
// } from './Modal';

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

// const SalesOrderTracking: React.FC<{
//     token: string;
//     navigation: any;
//     username: string;
// }> = ({ token, username }) => {
//     const router = useRouter();
//     const [loading, setLoading] = useState(false);
//     const [page, setPage] = useState(1);
//     const [renderedData, setRenderedData] = useState<Party[]>([]);
//     const [getPartyData, setPartyData] = useState([]);
//     const [salessumdata, setsalessumdata] = useState([]);
//     const [salesdata, setsalesdata] = useState<Party[]>([]);
//     const [salesdataTotal, setsalesdataTotal] = useState<number | null>(null);
//     const itemsPerPage = 10;
//     const [isLoading, setIsLoading] = useState(false);
//     const [getTrackingLoader, setTrackingLoader] = useState(false);
//     const [isDrawerVisible, setIsDrawerVisible] = useState(false);
//     const [searchQueryPOT, setSearchQueryPOT] = useState('');
//     const [filteredData, setFilteredData] = useState<Party[]>([]);
//     const [fromDate, setFromDate] = useState<Date>(new Date());
//     const [delDate, setDelDate] = useState<Date>(new Date());
//     const currentDate = new Date();
//     const currentYear = currentDate.getFullYear();
//     const yearOptions = generateFinancialYearOptions(currentYear);
//     const [selectedYear, setSelectedYear] = useState<string>(
//         getCurrentFinancialYearMain(),
//     );
//     const [selectedExe, setSelectedExe] = useState<ExeData | null>(null);
//     const [getDData, setDData] = useState(null);
//     const [exeData, setExeData] = useState<ExeData[]>([]);
//     const [designData, setDesignData] = useState<DesignData[]>([]);
//     const [itemData, setItemData] = useState<ItemData[]>([]);
//     const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([]);
//     const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
//     const [selectedParty, setSelectedParty] = useState([]);
//     const [selectedItemStatus, setSelectedItemStatus] =
//         useState<ItemStatus>('All');
//     const [selectedItemStatus1, setSelectedItemStatus1] =
//         useState<WiseStatus>('Party Wise');
//     const [lastViewedParcode, setLastViewedParcode] = useState<string | null>(
//         null,
//     );
//     const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
//     const [isAll, setisALL] = useState(false);
//     const [dsnData, setDsnData] = useState([]);
//     //
//     const [isDesignModalVisible, setIsDesignModalVisible] = useState(false);
//     const [getMainPayload, setMainPayload] = useState({});
//     const [selectedDesignData, setSelectedDesignData] = useState<{
//         designdetails: any[];
//         design_summary: any[];
//         payload: any;
//     } | null>(null);
//     const [searchQuery, setSearchQuery] = useState('');
//     const [filteredDesignDetails, setFilteredDesignDetails] = useState(
//         selectedDesignData?.designdetails || [],
//     );
//     //
//     const [designChildData, setDesignChildData] = useState([]);
//     const [designPage, setDesignPage] = useState(1);
//     const [subdesignPage, setsubDesignPage] = useState(1);
//     const designItemsPerPage = 10;
//     const subdesignItemsPerPage = 10;
//     const [isListReady, setIsListReady] = useState(false);
//     const flatListRef = useRef<FlatList>(null);
//     const [isPartyDetailsModalVisible, setIsPartyDetailsModalVisible] =
//         useState(false);
//     const [selectedPartyDetails, setSelectedPartyDetails] = useState<{
//         designdetails: any[];
//         design_summary: any[];
//         payload: any;
//     } | null>(null);
//     const [searchQueryPartyDetails, setSearchQueryPartyDetails] = useState('');
//     const [filteredPartyDetails, setFilteredPartyDetails] = useState(
//         selectedPartyDetails?.designdetails || [],
//     );
//     const loadMoreDesignDetails = () => {
//         if (designPage * designItemsPerPage < filteredDesignDetails.length) {
//             setDesignPage(designPage + 1);
//         }
//     };
//     const loadMoreSubDesignDetails = () => {
//         if (subdesignPage * subdesignItemsPerPage < filteredPartyDetails.length) {
//             setsubDesignPage(subdesignPage + 1);
//         }
//     };

//     const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
//     const [sortOrder1, setSortOrder1] = useState<'asc' | 'desc'>('asc');
//     const [sortOrder2, setSortOrder2] = useState<'asc' | 'desc'>('asc');
//     const [selectedSalesExes, setSelectedSalesExes] = useState([]);
//     const [salesExeData, setSalesExeData] = useState([]);
//     // 
//     // ===== JOB CHART / ALLOCATION STATES =====
//     // ===== JOB CHART / ALLOCATION STATES =====
//     const [jobChartVisible, setJobChartVisible] = useState(false);
//     const [jobChartLoading, setJobChartLoading] = useState(false);
//     const [jobChartSaving, setJobChartSaving] = useState(false);
//     const [jobChartRef, setJobChartRef] = useState<{
//         orderUId: string;
//         itmCode: string;
//         dsnCode: string;
//         dsnName: string;
//         prpcode: string;
//         strcode: string;
//         yearno: string;
//         srno: string;
//         grdcode: string;
//         grdname: string;
//         sono?: string;
//         status?: string;
//         pendingMeter: number; // 👈 NEW
//         shdcode?: string;
//         apccode?: string;
//     } | null>(null);
//     const [allocations, setAllocations] = useState<any[]>([]);
//     // 👇 NEW: shade picker is now a separate full modal, not inline dropdown
//     const [shadePickerVisible, setShadePickerVisible] = useState(false);
//     const [shadeQuery, setShadeQuery] = useState('');
//     const [shadeResults, setShadeResults] = useState<{ Code: string; Name: string }[]>([]);
//     const [shadeSearchLoading, setShadeSearchLoading] = useState(false);
//     const [selectedShade, setSelectedShade] = useState<{ Code: string; Name: string } | null>(null);
//     const [addQty, setAddQty] = useState('');
//     const qtyInputRef = useRef<TextInput>(null);
//     let shadeSearchDebounce: any;

//     const toggleSortOrder = () => {
//         setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
//     };
//     const toggleSortOrder1 = () => {
//         setSortOrder1(prev => (prev === 'asc' ? 'desc' : 'asc'));
//     };
//     const toggleSortOrder2 = () => {
//         setSortOrder2(prev => (prev === 'asc' ? 'desc' : 'asc'));
//     };

//     // //////////////////////////////////////////////////////////////
//     // ===== JOB CHART / ALLOCATION LOGIC =====

//     const getAllocRequestConfig = (params: any) => ({
//         headers: {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json',
//             Accept: 'application/json',
//         },
//         params,
//     });

//     // Open job chart for a design-level item (from Main Design Details or Sub Design Details card)
//     const openJobChart = async (item: any) => {
//         console.log('🔵 payload JOB CHART', item);
//         const orderUId = item?.suid || '';

//         if (!orderUId) {
//             Alert.alert('Error', 'Order reference (UId) not found on this item.');
//             return;
//         }

//         const ref = {
//             orderUId: String(orderUId),
//             itmCode: String(item?.itmcode || ''),
//             dsnCode: String(item?.dsncode || ''),
//             dsnName: item?.Dsnname || '',
//             prpcode: item?.prpcode || '',
//             strcode: item?.strcode || '',
//             yearno: selectedYear ? selectedYear.split('-')[1].substring(2) : '',
//             srno: item?.OrderSrNo || item?.SrNo || item?.srno || '1',
//             grdcode: item?.grdcode || '1',
//             grdname: item?.GrdName || item?.grdname || '',
//             sono: item?.sono || '',
//             status: String(item?.status || '').toUpperCase().trim(),
//             pendingMeter: parseFloat(item?.pending) || 0, // 👈 NEW
//             shdcode: item?.shdcode || '',
//             apccode: item?.apccode || '',
//         };

//         setJobChartRef(ref);
//         setAllocations([]);
//         setSelectedShade(null);
//         setAddQty('');
//         setShadeQuery('');
//         setShadeResults([]);
//         setJobChartVisible(true);
//         await fetchAllocations(ref);
//     };

//     const areCodesMatching = (shdcode: string, apccode: string): boolean => {
//         return shdcode === apccode;
//     };

//     // 👇 Can user add/edit allocations for this item?
//     const canEditAllocation = () => {
//         if (!jobChartRef) return false;
//         if (jobChartRef.status === 'CLOSED') return false;
//         // if (jobChartRef.status === 'CLOSED') return false;
//         if ((jobChartRef.pendingMeter || 0) <= 0) return false;

//         // 🆕 APC condition: allow only if shdcode matches apccode
//         if (!areCodesMatching(jobChartRef?.shdcode, jobChartRef?.apccode)) return false;
//         return true;
//     };

//     // 👇 Today's date in YYYYMMDD format, matching LastDate format
//     const getTodayDateStr = () => {
//         const d = new Date();
//         const y = d.getFullYear();
//         const m = String(d.getMonth() + 1).padStart(2, '0');
//         const day = String(d.getDate()).padStart(2, '0');
//         return `${y}${m}${day}`;
//     };

//     const formatAllocDate = (dateStr?: string) => {
//         if (!dateStr || dateStr.length !== 8) return '';
//         return `${dateStr.substring(6, 8)}-${dateStr.substring(4, 6)}-${dateStr.substring(0, 4)}`;
//     };

//     const getTotalAllocatedQty = () =>
//         allocations.reduce((sum, a) => sum + (parseFloat(a.AllocationQty) || 0), 0);

//     const fetchAllocations = async (ref: typeof jobChartRef) => {
//         if (!ref) return;
//         setJobChartLoading(true);
//         try {
//             const response = await axios.get(
//                 `${API}/api/so-allocation`,
//                 getAllocRequestConfig({
//                     prpcode: ref.prpcode,
//                     yearno: ref.yearno,
//                     strcode: ref.strcode,
//                     order_uid: ref.orderUId,
//                 }),
//             );
//             console.log('🔵 so-allocation GET response:', ref, response.data);
//             if (response.data.success) {
//                 setAllocations(response.data.response.data || []);
//             } else {
//                 setAllocations([]);
//             }
//         } catch (error) {
//             console.error('fetchAllocations error:', error);
//             Alert.alert('Error', 'Failed to load allocation details.');
//         } finally {
//             setJobChartLoading(false);
//         }
//     };

//     const searchShades = (query: string) => {
//         setShadeQuery(query);
//         if (shadeSearchDebounce) clearTimeout(shadeSearchDebounce);
//         shadeSearchDebounce = setTimeout(async () => {
//             if (!jobChartRef) return;
//             setShadeSearchLoading(true);
//             try {
//                 const response = await axios.get(
//                     `${API}/api/so-allocation/lookup`,
//                     getAllocRequestConfig({
//                         prpcode: jobChartRef.prpcode,
//                         yearno: jobChartRef.yearno,
//                         strcode: jobChartRef.strcode,
//                         type: 'shade',
//                         search: query || '',
//                     }),
//                 );
//                 if (response.data.success) {
//                     setShadeResults(response.data.response.data || []);
//                 } else {
//                     setShadeResults([]);
//                 }
//             } catch (error) {
//                 console.error('searchShades error:', error);
//                 setShadeResults([]);
//             } finally {
//                 setShadeSearchLoading(false);
//             }
//         }, 300);
//     };

//     // 👇 opens the dedicated shade picker modal
//     const openShadePicker = () => {
//         setShadeQuery('');
//         setShadeResults([]);
//         setShadePickerVisible(true);
//         searchShades(''); // load initial list
//     };

//     // 👇 called when user taps a shade in the picker
//     const handleSelectShade = (s: { Code: string; Name: string }) => {
//         setSelectedShade(s);
//         setShadePickerVisible(false);
//         // focus qty input right after picking shade, small delay to let modal close first
//         setTimeout(() => qtyInputRef.current?.focus(), 300);
//     };

//     const handleAddAllocationRow = () => {
//         // if (!canEditAllocation()) {
//         //     Alert.alert(
//         //         'Not Allowed',
//         //         jobChartRef?.status === 'CLOSED'
//         //             ? 'This design is closed. Allocation cannot be modified.'
//         //             : 'No pending meter available to allocate.',
//         //     );
//         //     return;
//         // }
//         {
//             !canEditAllocation() && (
//                 <View style={styles.jobChartLockBanner}>
//                     <Icon name="lock" size={16} color="#E65100" />
//                     <Text style={styles.jobChartLockBannerText}>
//                         {jobChartRef?.status === 'CLOSED'
//                             ? 'This design is closed — view only.'
//                             : jobChartRef?.pendingMeter <= 0
//                                 ? 'No pending meter left — view only.'
//                                 : 'APC not matched — view only.'}
//                     </Text>
//                 </View>
//             )
//         }
//         if (!selectedShade) {
//             Alert.alert('Error', 'Please select a shade first.');
//             return;
//         }
//         if (!addQty || parseFloat(addQty) <= 0) {
//             Alert.alert('Error', 'Please enter a valid quantity.');
//             return;
//         }

//         // 🚫 Duplicate shade check
//         const alreadyExists = allocations.some(
//             a => String(a.ShdCode) === String(selectedShade.Code),
//         );
//         if (alreadyExists) {
//             Alert.alert(
//                 'Duplicate Shade',
//                 'This shade is already allocated. Please edit the existing quantity instead of adding it again.',
//             );
//             return;
//         }

//         // 🚫 Pending meter check
//         const currentTotal = getTotalAllocatedQty();
//         const newQty = parseFloat(addQty);
//         const pendingMeter = jobChartRef?.pendingMeter || 0;
//         if (currentTotal + newQty > pendingMeter) {
//             Alert.alert(
//                 'Exceeds Pending Meter',
//                 `Total allocation (${formatNumber(String(currentTotal + newQty))} m) can't exceed pending meter (${formatNumber(String(pendingMeter))} m). You can add up to ${formatNumber(String(Math.max(pendingMeter - currentTotal, 0)))} m more.`,
//             );
//             return;
//         }

//         const newRow = {
//             AllocationId: 0,
//             OrderSrNo: jobChartRef?.srno || '1',
//             StrCode: jobChartRef?.strcode || '5',
//             ItmCode: jobChartRef?.itmCode || '',
//             DsnCode: jobChartRef?.dsnCode || '',
//             GrdCode: jobChartRef?.grdcode || '1',
//             GrdName: jobChartRef?.grdname || '1st',
//             ShdCode: selectedShade.Code,
//             ShdName: selectedShade.Name,
//             AllocationQty: addQty,
//             ChallanQty: 0,
//             IsLocked: 0,
//             Remark: '',
//         };

//         setAllocations(prev => [...prev, newRow]);
//         setSelectedShade(null);
//         setAddQty('');
//     };

//     const handleRemoveAllocationRow = (index: number) => {
//         if (!canEditAllocation()) return;
//         setAllocations(prev => prev.filter((_, i) => i !== index));
//     };

//     const handleSaveAllocations = async () => {
//         if (!jobChartRef) return;

//         const totalQty = getTotalAllocatedQty();
//         if (totalQty > (jobChartRef.pendingMeter || 0)) {
//             Alert.alert('Error', 'Total allocation exceeds pending meter. Please adjust quantities before saving.');
//             return;
//         }

//         setJobChartSaving(true);
//         try {
//             const payload = {
//                 ReplaceAll: 1,
//                 PrpCode: jobChartRef.prpcode,
//                 YearNo: jobChartRef.yearno,
//                 StrCode: jobChartRef.strcode,
//                 prpcode: jobChartRef.prpcode,
//                 yearno: jobChartRef.yearno,
//                 strcode: jobChartRef.strcode,
//                 OrderUId: jobChartRef.orderUId,
//                 items: [
//                     {
//                         SrNo: jobChartRef.srno,
//                         Qty: '.000',
//                         ItmCode: jobChartRef.itmCode,
//                         DsnCode: jobChartRef.dsnCode,
//                         Allocations: allocations,
//                     },
//                 ],
//             };

//             const headers = {
//                 Authorization: `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//                 'X-Requested-with': 'XMLHttpRequest',
//             };

//             const response = await axios.post(
//                 `${API}/api/so-allocation/sync`,
//                 payload,
//                 { headers },
//             );
//             console.log('🔵 so-allocation/sync response:', response.data);

//             if (response.data.success) {
//                 Alert.alert('Success', response.data.response?.message || 'Allocation saved.');
//                 // 🔁 Re-fetch fresh data from server after successful save
//                 await fetchAllocations(jobChartRef);
//             } else {
//                 Alert.alert('Error', response.data.message || 'Failed to save allocation.');
//             }
//         } catch (error) {
//             console.error('handleSaveAllocations error:', error);
//             Alert.alert('Error', 'Failed to save allocation.');
//         } finally {
//             setJobChartSaving(false);
//         }
//     };

//     const getJobChartTotal = () =>
//         allocations
//             .reduce((sum, a) => sum + (parseFloat(a.AllocationQty) || 0), 0)
//             .toFixed(0);

//     // const copyJobChartText = () => {
//     //     const lines = allocations.map(
//     //         a => `${a.ShdName?.trim()} : ${formatNumber(String(a.AllocationQty))} m`,
//     //     );
//     //     const text = `REF: ${jobChartRef?.dsnCode || ''}\nDESIGN: ${jobChartRef?.dsnName || ''}\n\n${lines.join('\n')}\n\nTOTAL: ${formatNumber(getJobChartTotal())} m`;
//     //     Clipboard.setString(text);
//     //     Alert.alert('Copied', 'Job chart text copied to clipboard.');
//     // };
//     // ///////////////////////////////////////////////////////////////////

//     // useEffect(() => {
//     //     if (selectedDesignData) {
//     //         const lowercasedQuery = searchQuery.toLowerCase();
//     //         const filtered = selectedDesignData.designdetails.filter(
//     //             (item) =>
//     //                 item?.parcode?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.partyname?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.sono?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.sodate?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.Dsnname?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.dsncode?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.totmtr?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.totamt?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.chalqty?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.chalamt?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.noofchallan?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.pending?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.pendingamt?.toLowerCase().includes(lowercasedQuery)
//     //         );
//     //         setFilteredDesignDetails(filtered);
//     //     }
//     // }, [searchQuery, selectedDesignData]);
//     useEffect(() => {
//         if (!selectedDesignData) return;

//         if (!searchQuery.trim()) {
//             const sorted1 = [...selectedDesignData.designdetails].sort((a, b) => {
//                 const aAmt = parseFloat(a.pendingamt) || 0;
//                 const bAmt = parseFloat(b.pendingamt) || 0;

//                 return sortOrder1 === 'asc' ? aAmt - bAmt : bAmt - aAmt;
//             });

//             setFilteredDesignDetails(sorted1);
//             //setFilteredDesignDetails(selectedDesignData.designdetails);
//         } else {
//             const query = searchQuery.toLowerCase();

//             // 🔹 Step 1: child filter (responsedes)
//             const filteredChild = designChildData.filter(
//                 item =>
//                     item?.pdsncode?.toLowerCase().includes(query) ||
//                     item?.pdesign?.toLowerCase().includes(query) ||
//                     item?.cdsncode?.toLowerCase().includes(query) ||
//                     item?.cdesign?.toLowerCase().includes(query),
//             );

//             // 🔹 Step 2: unique cdsncode nikalo
//             const uniqueCodes = [...new Set(filteredChild.map(i => i.cdsncode))];
//             const codeSet = new Set(uniqueCodes);

//             const finalFiltered = selectedDesignData.designdetails.filter(item =>
//                 codeSet.has(item.dsncode),
//             );
//             // 🔹 Step 3: parent filter (dsncode match)
//             // const finalFiltered = selectedDesignData.designdetails.filter(item =>
//             //     uniqueCodes.includes(item.dsncode)
//             // );

//             const sortedFiltered1 = [...finalFiltered].sort((a, b) => {
//                 const aAmt = parseFloat(a.pendingamt) || 0;
//                 const bAmt = parseFloat(b.pendingamt) || 0;

//                 return sortOrder === 'asc' ? aAmt - bAmt : bAmt - aAmt;
//             });

//             setFilteredDesignDetails(sortedFiltered1);
//             //setFilteredDesignDetails(finalFiltered);
//         }
//     }, [searchQuery, selectedDesignData, designChildData, sortOrder1]);

//     // Filter partydetails based on search query
//     useEffect(() => {
//         if (selectedPartyDetails?.designdetails) {
//             const lowercasedQuery = searchQueryPartyDetails.toLowerCase();
//             const filtered = selectedPartyDetails.designdetails.filter(
//                 item =>
//                     item?.parcode?.toLowerCase().includes(lowercasedQuery) ||
//                     item?.partyname?.toLowerCase().includes(lowercasedQuery) ||
//                     item?.sono?.toLowerCase().includes(lowercasedQuery) ||
//                     item?.sodate?.toLowerCase().includes(lowercasedQuery) ||
//                     item?.Dsnname?.toLowerCase().includes(lowercasedQuery) ||
//                     item?.dsncode?.toLowerCase().includes(lowercasedQuery) ||
//                     item?.totmtr?.toLowerCase().includes(lowercasedQuery) ||
//                     item?.chalqty?.toLowerCase().includes(lowercasedQuery) ||
//                     item?.chalamt?.toLowerCase().includes(lowercasedQuery) ||
//                     item?.noofchallan?.toLowerCase().includes(lowercasedQuery) ||
//                     item?.pending?.toLowerCase().includes(lowercasedQuery) ||
//                     item?.pendingamt?.toLowerCase().includes(lowercasedQuery),
//             );

//             const sorted2 = [...filtered].sort((a, b) => {
//                 const aAmt = parseFloat(a.pendingamt) || 0;
//                 const bAmt = parseFloat(b.pendingamt) || 0;

//                 return sortOrder2 === 'asc' ? aAmt - bAmt : bAmt - aAmt;
//             });

//             setFilteredPartyDetails(sorted2);
//             //setFilteredPartyDetails(filtered);
//         }
//     }, [searchQueryPartyDetails, selectedPartyDetails, sortOrder2]);

//     // Cache keys
//     const CACHE_KEY_CONFIRM_ACTION = 'sales_order_tracking_confirm_action';
//     const CACHE_KEY_CARD_PRESS = 'sales_order_tracking_card_press_';
//     const CACHE_KEY_LAST_VIEWED = 'sales_order_tracking_last_viewed';
//     const rowsPerPage = 20;

//     // Open modal with design data
//     const openDesignModal = (data: any, payload: any) => {
//         setSelectedDesignData({
//             designdetails: data.designdetails,
//             design_summary: data.design_summary,
//             payload,
//         });
//         setIsDesignModalVisible(true);
//         setIsDrawerVisible(false);
//     };

//     // Close modal
//     const closeDesignModal = () => {
//         setIsDesignModalVisible(false);
//         setIsDrawerVisible(false);
//     };

//     const getCurrentFinancialYear = () => {
//         const currentDate = new Date();
//         const currentYear = currentDate.getFullYear();
//         const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

//         // Financial year starts in April
//         const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
//         return financialYear.toString().substring(2); // Return last two digits of the year
//     };

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
//                 fetch: 'salesexe',
//             };
//             const response = await axios.get(
//                 // `https://apig.tms-webapp.com/api/get_criterion`,
//                 `${API}/api/get_criterion`,
//                 getRequestConfig({
//                     params: {
//                         prpcode: 'SIP',
//                         yearno: getCurrentFinancialYear(),
//                         strcode: '012',
//                         txntype: 'production_order_track',
//                         prptype: '',
//                         fetch: 'salesexe',
//                     },
//                 }),
//             );
//             console.log('🔵 payload', payload, response);
//             if (response.data.success && response.data.response.data.length > 0) {
//                 console.log('✅ Data Sexe:', response.data.response.data);
//                 setExeData(response.data.response.data);
//                 // fetchDesign();
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
//         console.log('🔵 payload PARTY', 'HI');
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
//                 strcode: '0',
//                 txntype: 'sales_order',
//                 partytype: 'p',
//                 type: 's',
//                 page: 1,
//                 limit: 20,
//                 search: '',
//                 isceo: 0,
//                 partype: 0,
//                 grntype: '',
//                 fetch: '',
//                 acccode: '',
//                 billdate: '',
//                 strtype: '',
//                 isfaint: '',
//                 user_id: 1,
//             };
//             console.log('🔵 payload PARTY', 'HI1');
//             const response = await axios.get(
//                 `${API}/api/mobaccountbasic`,
//                 getRequestConfig({
//                     params: payload,
//                 }),
//             );
//             console.log('🔵 payload PARTY', 'HI2');
//             console.log('🔵 payload PARTY Payload', payload, response);
//             if (response.data.success && response.data.response.data.length > 0) {
//                 console.log('✅ Data Sexe:', response.data.response.data);
//                 setPartyData(response.data.response.data);
//                 fetchDesign();
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
//                 yearno: getCurrentFinancialYear(),
//                 strcode: '012',
//                 itmcode: '',
//                 dsncode: '',
//                 shdcode: '',
//                 page: page + 1,
//                 limit: rowsPerPage,
//                 txntype: 'production_order_track',
//             };
//             const response = await axios.get(
//                 // `https://apig.tms-webapp.com/api/getdesign`,
//                 `${API}/api/getitem`,
//                 getRequestConfig({
//                     params: {
//                         prpcode: 'SIP',
//                         yearno: getCurrentFinancialYear(),
//                         strcode: '012',
//                         itmcode: '',
//                         dsncode: '',
//                         shdcode: '',
//                         page: page + 1,
//                         limit: rowsPerPage,
//                         txntype: 'production_order_track',
//                     },
//                 }),
//             );
//             console.log('🔵 design payload', payload, response);
//             if (response.data.success) {
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

//     console.log('designData', designData);

//     const fetchItem = async () => {
//         if (cancelToken?.cancel) cancelToken.cancel();
//         cancelToken = axios.CancelToken.source();
//         // setIsLoading(true);
//         try {
//             const payload = {
//                 // prpcode: 'SIP',
//                 // yearno: getCurrentFinancialYear(),
//                 // strcode: '012',
//                 // itmcode: '',
//                 // dsncode: '',
//                 // shdcode: '',
//                 // page: page + 1,
//                 // limit: rowsPerPage,
//                 // fetch: 'itm',
//                 // txntype: 'production_order_track'
//                 prpcode: 'SIP',
//                 yearno: getCurrentFinancialYear(),
//                 strcode: '012',
//                 txntype: 'production_order_track',
//                 prptype: '',
//                 limit: 20,
//                 fetch: 'itm',
//                 itmcode: '',
//                 strcodes: '012',
//                 issdate: '',
//             };
//             const response = await axios.get(
//                 // `https://apig.tms-webapp.com/api/get_criterion`,
//                 `${API}/api/get_criterion`,
//                 getRequestConfig({
//                     params: {
//                         prpcode: 'SIP',
//                         yearno: getCurrentFinancialYear(),
//                         strcode: '012',
//                         txntype: 'production_order_track',
//                         prptype: '',
//                         limit: 20,
//                         fetch: 'itm',
//                         itmcode: '',
//                         strcodes: '012',
//                         issdate: '',
//                     },
//                 }),
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

//     useEffect(() => {
//         if (!token) return;
//         if (fromDate && delDate && selectedYear) {
//             // fetchData();
//             // fetchDesign();
//             // fetchParty();
//             fetchSalesExe();
//         }
//     }, [token]);
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

//     // Load last viewed from cache
//     const loadLastViewedFromCache = async () => {
//         try {
//             return await AsyncStorage.getItem(CACHE_KEY_LAST_VIEWED);
//         } catch (error) {
//             console.error('Error loading last viewed from cache:', error);
//             return null;
//         }
//     };

//     // Save last viewed to cache
//     const saveLastViewedToCache = async (parcode: string) => {
//         try {
//             await AsyncStorage.setItem(CACHE_KEY_LAST_VIEWED, parcode);
//         } catch (error) {
//             console.error('Error saving last viewed to cache:', error);
//         }
//     };

//     // Load cached data on focus
//     // useFocusEffect(
//     //     useCallback(() => {
//     //         const loadAllCachedData = async () => {
//     //             const cachedConfirmAction = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
//     //             const lastViewed = await loadLastViewedFromCache();
//     //             if (cachedConfirmAction) {
//     //                 setsalesdata(cachedConfirmAction.response.data.salesdata);
//     //                 setsalesdataTotal(cachedConfirmAction.response.data.salesdata.length);
//     //                 setsalessumdata(cachedConfirmAction.response.data.salessumdata);
//     //             }
//     //             setLastViewedParcode(lastViewed);
//     //             setHasAutoScrolled(false);
//     //         };
//     //         loadAllCachedData();
//     //     }, [])
//     // );

//     // Auto-scroll to last viewed only once and only if lastViewedParcode exists
//     useEffect(() => {
//         if (
//             lastViewedParcode &&
//             !hasAutoScrolled &&
//             isListReady &&
//             flatListRef.current &&
//             (searchQueryPOT.trim()
//                 ? filteredData.length > 0
//                 : renderedData.length > 0)
//         ) {
//             const dataToUse = searchQueryPOT.trim() ? filteredData : renderedData;
//             const index = dataToUse.findIndex(
//                 item => item.parcode === lastViewedParcode,
//             );
//             if (index !== -1) {
//                 setTimeout(() => {
//                     flatListRef.current?.scrollToIndex({ index, animated: true });
//                     setHasAutoScrolled(true);
//                 }, 300);
//             }
//         }
//     }, [
//         lastViewedParcode,
//         filteredData,
//         renderedData,
//         searchQueryPOT,
//         hasAutoScrolled,
//         isListReady,
//     ]);

//     // useEffect(() => {
//     //     if (!searchQueryPOT.trim()) {
//     //         setFilteredData(salesdata); // Full data rakho
//     //         setRenderedData(salesdata.slice(0, itemsPerPage)); // Paginate karo
//     //         setPage(1);
//     //     } else {
//     //         const lowercasedQuery = searchQueryPOT.toLowerCase();
//     //         const filtered = salesdata.filter(
//     //             (item) =>
//     //                 item?.partyname?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.parcode?.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.noof && item?.noof.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.totmtr && item?.totmtr.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.pendingmtr && item?.pendingmtr.toLowerCase().includes(lowercasedQuery) ||
//     //                 item?.pendingamt && item?.pendingamt.toLowerCase().includes(lowercasedQuery)
//     //         );
//     //         setFilteredData(filtered); // Full filtered data rakho
//     //         setRenderedData(filtered.slice(0, itemsPerPage)); // Paginate karo
//     //         setPage(1);
//     //     }
//     // }, [searchQueryPOT, salesdata]);
//     useEffect(() => {
//         if (!searchQueryPOT.trim()) {
//             const sorted = [...salesdata].sort((a, b) => {
//                 const aAmt = parseFloat(a.pendingamt) || 0;
//                 const bAmt = parseFloat(b.pendingamt) || 0;

//                 return sortOrder === 'asc' ? aAmt - bAmt : bAmt - aAmt;
//             });
//             setFilteredData(sorted);
//             setRenderedData(sorted.slice(0, itemsPerPage));
//             //setFilteredData(salesdata);
//             //setRenderedData(salesdata.slice(0, itemsPerPage));

//             setPage(1);
//         } else {
//             const query = searchQueryPOT.toLowerCase();

//             // 🔹 Step 1: child (dsnData) filter karo
//             const filteredChild = dsnData.filter(
//                 item =>
//                     item?.pdsncode?.toLowerCase().includes(query) ||
//                     item?.pdesign?.toLowerCase().includes(query) ||
//                     item?.cdsncode?.toLowerCase().includes(query) ||
//                     item?.cdesign?.toLowerCase().includes(query) ||
//                     item?.parcode?.toLowerCase().includes(query) ||
//                     item?.accname?.toLowerCase().includes(query) ||
//                     item?.itmname?.toLowerCase().includes(query) ||
//                     item?.itmcode?.toLowerCase().includes(query),
//             );

//             // 🔹 Step 2: unique parcode nikalo
//             const uniqueParcodes = [...new Set(filteredChild.map(i => i.parcode))];

//             // 🔹 Step 3: parent data filter karo (reverse filtering)
//             // const finalFiltered = salesdata.filter(item =>
//             //     uniqueParcodes.includes(item.parcode)
//             // );
//             const parcodeSet = new Set(uniqueParcodes);
//             const finalFiltered = salesdata.filter(item =>
//                 parcodeSet.has(item.parcode),
//             );

//             const sortedFiltered = [...finalFiltered].sort((a, b) => {
//                 const aAmt = parseFloat(a.pendingamt) || 0;
//                 const bAmt = parseFloat(b.pendingamt) || 0;

//                 return sortOrder === 'asc' ? aAmt - bAmt : bAmt - aAmt;
//             });

//             setFilteredData(sortedFiltered);
//             setRenderedData(sortedFiltered.slice(0, itemsPerPage));
//             //setFilteredData(finalFiltered);
//             //setRenderedData(finalFiltered.slice(0, itemsPerPage));
//             setPage(1);
//         }
//     }, [searchQueryPOT, salesdata, dsnData, sortOrder]);

//     // Lazy loading
//     const loadMoreData = useCallback(() => {
//         if (loading) return;

//         const nextPage = page + 1;
//         const startIndex = page * itemsPerPage;
//         const endIndex = startIndex + itemsPerPage;

//         const sortedData = [...salesdata].sort((a, b) => {
//             return sortOrder === 'asc'
//                 ? parseFloat(a.pendingamt) - parseFloat(b.pendingamt)
//                 : parseFloat(b.pendingamt) - parseFloat(a.pendingamt);
//         });

//         const dataToUse = searchQueryPOT.trim() ? filteredData : sortedData;
//         // `salesdata` ya `filteredData` mein se data lelo
//         //const dataToUse = searchQueryPOT.trim() ? filteredData : salesdata;

//         if (startIndex < dataToUse.length) {
//             setLoading(true);
//             setTimeout(() => {
//                 // `renderedData` ko update karo
//                 setRenderedData(prev => [
//                     ...prev,
//                     ...dataToUse.slice(startIndex, endIndex),
//                 ]);
//                 setPage(nextPage);
//                 setLoading(false);
//             }, 500);
//         }
//     }, [page, loading, searchQueryPOT, filteredData, salesdata]);

//     // Get initials and color for party
//     const getInitials = (name: string) =>
//         name
//             .split(' ')
//             .map(n => n[0])
//             .join('')
//             .substring(0, 1);
//     const getColorForInitial = (id: string) => {
//         const colors = [
//             '#2196F3',
//             '#4CAF50',
//             '#FF9800',
//             '#9C27B0',
//             '#00BCD4',
//             '#3F51B5',
//             '#757575',
//             '#E91E63',
//             '#FF5722',
//             '#673AB7',
//             '#009688',
//             '#FFC107',
//         ];
//         return colors[parseInt(id) % colors.length];
//     };

//     // Set default dates
//     useEffect(() => {
//         const today = new Date();
//         const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//         setFromDate(firstDayOfMonth);
//         // setDelDate(today);
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

//     const formatDate = (rawDate: any) => {
//         let day = rawDate.getDate().toString().padStart(2, '0') || '';
//         let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || '';
//         let year = rawDate.getFullYear() || '';
//         return `${day}-${month}-${year}`;
//     };

//     const handleConfirmAction = async () => {
//         console.log("selectedExe ----", selectedSalesExes)
//         if (selectedItemStatus1 === 'Party Wise') {
//             setIsLoading(true);
//             setsalesdata([]);
//             setsalessumdata([]);
//             const yearValue = selectedYear.split('-')[1].substring(2);
//             const dsnCodes = selectedDesigns.map(design => design.ItmCode);
//             const partyCodes = selectedParty.map((item: any) => item.acccode);

//             let seArr = []
//             let seArrCntr = 0;
//             selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

//                 seArr[seArrCntr] = el.sexe;
//                 seArrCntr++;

//             })

//             console.log('wise: ', selectedItemStatus1 === 'Party Wise'
//                 ? 'party'
//                 : selectedItemStatus1 === 'Design Wise'
//                     ? 'design'
//                     : '', selectedItemStatus1);

//             const payload = {
//                 // fromdate: formatDate(fromDate),
//                 fromdate: '',
//                 deldate: formatDate(delDate),
//                 todate: '',
//                 yearno: yearValue,
//                 //sexes: selectedExe?.Code ? selectedExe?.Code : '0',
//                 sexes: seArr,
//                 type:
//                     selectedItemStatus === 'All'
//                         ? 'all'
//                         : selectedItemStatus === 'Open'
//                             ? 'open'
//                             : selectedItemStatus === 'Closed'
//                                 ? 'closed'
//                                 : 'all',
//                 wise:
//                     selectedItemStatus1 === 'Party Wise'
//                         ? 'party'
//                         : selectedItemStatus1 === 'Design Wise'
//                             ? 'design'
//                             : '',

//                 dsncodes: [],
//                 itemcodes: dsnCodes,
//                 parties: partyCodes,
//                 prptype: 'S',
//                 txntype: 'prodorderlist',
//             };
//             console.log('payload', payload);

//             // Check cache first
//             // const cachedData = await loadFromCache(CACHE_KEY_CONFIRM_ACTION);
//             // if (cachedData && JSON.stringify(cachedData.payload) === JSON.stringify(payload)) {
//             //     setsalesdata(cachedData.response.data.salesdata);
//             //     setsalesdataTotal(cachedData.response.data.salesdata.length);
//             //     setsalessumdata(cachedData.response.data.salessumdata);
//             //     setIsLoading(false);
//             //     closeDrawer();
//             //     return;
//             // }

//             // If not in cache, proceed with API call
//             const headers = {
//                 Authorization: `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//                 'X-Requested-with': 'XMLHttpRequest',
//             };

//             try {
//                 const response = await axios.post(
//                     `${API}/api/salesordertracking`,
//                     payload,
//                     { headers },
//                 );
//                 const responsedsn = await axios.post(
//                     `${API}/api/salesorderparentdesign`,
//                     payload,
//                     { headers },
//                 );
//                 console.log('🔵 responsedsn', payload, responsedsn);

//                 console.log('🔵 response', payload, response);
//                 // console.log("🔵 responsedsn", payload, responsedsn)
//                 if (
//                     response.data.success === true &&
//                     response.data.data.salesdata.length > 0
//                 ) {
//                     setMainPayload(payload);
//                     closeDrawer();
//                     setsalesdata(response.data.data.salesdata);
//                     setsalesdataTotal(response.data.data.salesdata.length);
//                     setsalessumdata(response.data.data.salessumdata);
//                     // await saveToCache(CACHE_KEY_CONFIRM_ACTION, { payload, response: response.data });
//                 } else if (response.data.success === false) {
//                     Alert.alert(`${response.data.message}`);
//                     setsalesdata([]);
//                     setsalessumdata([]);
//                 } else {
//                     Alert.alert('No Data Found!');
//                     setsalesdata([]);
//                     setsalessumdata([]);
//                 }
//                 if (responsedsn?.data?.data) {
//                     setDsnData(responsedsn.data.data);
//                 }
//                 console.log('🔵 responsedsn hiii');
//             } catch (error) {
//                 Alert.alert('Error', `Server error: ${error?.message}`);
//                 setsalesdata([]);
//                 setsalessumdata([]);
//             } finally {
//                 setIsLoading(false);
//                 // closeDrawer();
//             }
//         } else {
//             handleCardPressforDesignDirect();
//         }
//     };

//     const handleCardPressforDesign = async (partyData: Party) => {
//         // setDData(partyData);
//         const cacheKey = `${CACHE_KEY_CARD_PRESS}${partyData.parcode}`;
//         const headers = {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json',
//             'X-Requested-with': 'XMLHttpRequest',
//         };
//         setTrackingLoader(true);
//         try {
//             const yearValue = selectedYear.split('-')[1].substring(2);
//             const dsnCodes = selectedDesigns.map(design => design.DsnCode);

//             let seArr = []
//             let seArrCntr = 0;
//             selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

//                 seArr[seArrCntr] = el.sexe;
//                 seArrCntr++;

//             })
//             console.log('wise: ', selectedItemStatus1 === 'Party Wise'
//                 ? 'party'
//                 : selectedItemStatus1 === 'Design Wise'
//                     ? 'design'
//                     : '', selectedItemStatus1);

//             const payload = {
//                 // fromdate: formatDate(fromDate),
//                 fromdate: '',
//                 // todate: formatDate(delDate),
//                 todate: '',
//                 deldate: formatDate(delDate),
//                 yearno: yearValue,
//                 //sexes: selectedExe?.Code ? selectedExe?.Code : '0',
//                 sexes: seArr,
//                 type:
//                     selectedItemStatus === 'All'
//                         ? 'all'
//                         : selectedItemStatus === 'Open'
//                             ? 'open'
//                             : selectedItemStatus === 'Closed'
//                                 ? 'closed'
//                                 : 'all',
//                 wise:
//                     selectedItemStatus1 === 'Party Wise'
//                         ? 'party'
//                         : selectedItemStatus1 === 'Design Wise'
//                             ? 'design'
//                             : '',
//                 dsncodes: dsnCodes,
//                 itemcodes: getMainPayload.itemcodes || [],
//                 parcode: partyData.parcode,
//                 prptype: 'S',
//                 txntype: 'prodorderlist',
//             };
//             const response = await axios.post(
//                 `${API}/api/salesorderdesigntracking`,
//                 payload,
//                 { headers },
//             );
//             const responsedes = await axios.post(
//                 `${API}/api/salesorderparentdesignmaster`,
//                 payload,
//                 { headers },
//             );
//             console.log('🔵 responsedd design', payload, response);
//             console.log('🔵 responsedd child design', payload, responsedes);
//             if (response.data.success) {
//                 if (response.data.data.designdetails.length > 0) {
//                     setDData(partyData);
//                     openDesignModal(response.data.data, payload);
//                 } else {
//                     Alert.alert('No Data Found!');
//                 }
//             }
//             if (responsedes?.data?.data) {
//                 setDesignChildData(responsedes.data.data);
//             }

//             // if (response.data.success === true) {
//             //     await AsyncStorage.setItem('parties_tracking_details', JSON.stringify(response.data.data));
//             //     await AsyncStorage.setItem('parties_tracking_details_challan_payload', JSON.stringify(payload));
//             //     await AsyncStorage.setItem('parties_tracking_details_party_name', partyData.partyname);
//             //     await saveLastViewedToCache(partyData.parcode);
//             //     setLastViewedParcode(partyData.parcode);
//             //     navigation.navigate('SOPartyDetails', { party: partyData.partyname });
//             // }
//         } catch (error) {
//             console.error('Error in handleCardPress:', error);
//             Alert.alert('Error', 'Failed to process party details');
//         } finally {
//             setTrackingLoader(false);
//         }
//     };

//     const handleCardPressforDesignDirect = async () => {
//         setsalesdata([]);
//         setsalessumdata([]);
//         const partyCodes = selectedParty.map((item: any) => item.acccode);
//         // setDData(partyData);
//         const headers = {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json',
//             'X-Requested-with': 'XMLHttpRequest',
//         };
//         setIsLoading(true);
//         try {
//             const yearValue = selectedYear.split('-')[1].substring(2);
//             const dsnCodes = selectedDesigns.map(design => design.ItmCode);

//             let seArr = []
//             let seArrCntr = 0;
//             selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

//                 seArr[seArrCntr] = el.sexe;
//                 seArrCntr++;

//             })

//             console.log('wise: ', selectedItemStatus1 === 'Party Wise'
//                 ? 'party'
//                 : selectedItemStatus1 === 'Design Wise'
//                     ? 'design'
//                     : '', selectedItemStatus1);


//             const payload = {
//                 // fromdate: formatDate(fromDate),
//                 fromdate: '',
//                 // todate: formatDate(delDate),
//                 todate: '',
//                 deldate: formatDate(delDate),
//                 yearno: yearValue,
//                 sexes: selectedExe?.Code ? selectedExe?.Code : '0',
//                 type:
//                     selectedItemStatus === 'All'
//                         ? 'all'
//                         : selectedItemStatus === 'Open'
//                             ? 'open'
//                             : selectedItemStatus === 'Closed'
//                                 ? 'closed'
//                                 : 'all',
//                 wise:
//                     selectedItemStatus1 === 'Party Wise'
//                         ? 'party'
//                         : selectedItemStatus1 === 'Design Wise'
//                             ? 'design'
//                             : '',
//                 dsncodes: [],
//                 itemcodes: dsnCodes,
//                 parcode: '',
//                 parties: partyCodes,
//                 prptype: 'S',
//                 txntype: 'prodorderlist',
//                 sexes: seArr,
//             };
//             console.log('payload', payload);
//             const response = await axios.post(
//                 `${API}/api/salesorderdesigntracking`,
//                 payload,
//                 { headers },
//             );
//             const responsedes = await axios.post(
//                 `${API}/api/salesorderparentdesignmaster`,
//                 payload,
//                 { headers },
//             );
//             console.log('🔵 responsedd direct design', payload, response);
//             console.log('🔵 responsedd direct child design', payload, responsedes);

//             if (response.data.success) {
//                 setMainPayload(payload);
//                 setDData(null);
//                 openDesignModal(response.data.data, payload);
//             }
//             if (responsedes?.data?.data) {
//                 setDesignChildData(responsedes.data.data);
//             }
//         } catch (error) {
//             console.error('Error in handleCardPress:', error);
//             Alert.alert('Error', 'Failed to process party details');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleCardSubDesignPress = async (
//         getDData?: any,
//         parname,
//         customPayload?: any,
//         item?: any,
//         isall = false,
//     ) => {
//         console.log(
//             '🔵 payload PARTY',
//             getDData || '',
//             parname || '',
//             customPayload || '',
//             item || '',
//         );
//         console.log("Main Paylaod:", getMainPayload);
//         const headers = {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json',
//             'X-Requested-with': 'XMLHttpRequest',
//         };
//         setTrackingLoader(true);
//         if (isall) {
//             setisALL(true);
//         } else {
//             setisALL(false);
//         }


//         let seArr = []
//         let seArrCntr = 0;
//         selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

//             seArr[seArrCntr] = el.sexe;
//             seArrCntr++;

//         })

//         const payload = {
//             // fromdate: formatDate(fromDate),
//             fromdate: '',
//             // deldate: formatDate(customPayload.delDate),
//             deldate: customPayload.deldate,
//             // todate: formatDate(delDate),
//             todate: '',
//             yearno: selectedYear.split('-')[1].substring(2),
//             //sexes: selectedExe?.Code ? selectedExe?.Code : '0',
//             sexes: seArr,
//             type:
//                 selectedItemStatus === 'All'
//                     ? 'all'
//                     : selectedItemStatus === 'Open'
//                         ? 'open'
//                         : selectedItemStatus === 'Closed'
//                             ? 'closed'
//                             : 'all',
//             wise:
//                 selectedItemStatus1 === 'Party Wise'
//                     ? 'party'
//                     : selectedItemStatus1 === 'Design Wise'
//                         ? 'design'
//                         : '',
//             dsncodes: customPayload.dsncodes,
//             itemcodes: getMainPayload.itemcodes || [],
//             uid: item?.muid ? item?.muid : '',
//             mdsncode: item?.mdsncode ? item?.mdsncode : '',
//             parcode: customPayload.parcode,
//             prptype: 'S',
//             txntype: 'prodorderlist',
//         };
//         try {
//             // const response = await axios.post(
//             //     `${API}/api/salesordersubdesigntracking`,
//             //     payload,
//             //     { headers },
//             // );
//             const response =
//             {
//                 "data": {
//                     "designdetails": [
//                         {
//                             "suid": "630011134",
//                             "srno": "0",
//                             "parcode": "22790",
//                             "partyname": "KHAZANA SYNTEX",
//                             "sono": "00037",
//                             "sodate": "06/07/2026",
//                             "Dsnname": "RIP STOP-145",
//                             "dsncode": "32752",
//                             "mdsncode": "32752",
//                             "mdesignname": "RIP STOP-145",
//                             "prpcode": "SIP",
//                             "strcode": "012",
//                             "itmcode": "901644",
//                             "grdcode": "0",
//                             "totmtr": "12000.000",
//                             "totamt": "1128000",
//                             "chalqty": "11207.000",
//                             "chalamt": "1053458",
//                             "pending": "793.000",
//                             "pendingamt": "74542",
//                             "Shdcode": "0",
//                             "isallocated": "0",
//                             "allocatedqty": ".000",
//                             "remainingallocatedqty": "12000.000",
//                             "status": "PARTIAL",
//                             "apccode": "46041",
//                             "duedate": "21/07/2026"
//                         },
//                         {
//                             "suid": "630011142",
//                             "srno": "0",
//                             "parcode": "22790",
//                             "partyname": "KHAZANA SYNTEX",
//                             "sono": "00040",
//                             "sodate": "06/07/2026",
//                             "Dsnname": "RIP STOP-145",
//                             "dsncode": "32752",
//                             "mdsncode": "32752",
//                             "mdesignname": "RIP STOP-145",
//                             "prpcode": "SIP",
//                             "strcode": "012",
//                             "itmcode": "901644",
//                             "grdcode": "0",
//                             "totmtr": "9600.000",
//                             "totamt": "902400",
//                             "chalqty": "9245.000",
//                             "chalamt": "869030",
//                             "pending": "58.000",
//                             "pendingamt": "5452",
//                             "Shdcode": "0",
//                             "isallocated": "0",
//                             "allocatedqty": ".000",
//                             "remainingallocatedqty": "9600.000",
//                             "status": "PARTIAL",
//                             "apccode": "46041",
//                             "duedate": "26/07/2026"
//                         },
//                         {
//                             "suid": "630014429",
//                             "srno": "0",
//                             "parcode": "22790",
//                             "partyname": "KHAZANA SYNTEX",
//                             "sono": "00045",
//                             "sodate": "07/08/2026",
//                             "Dsnname": "RIP STOP-145",
//                             "dsncode": "32752",
//                             "mdsncode": "32752",
//                             "mdesignname": "RIP STOP-145",
//                             "prpcode": "SIP",
//                             "strcode": "012",
//                             "itmcode": "901644",
//                             "grdcode": "0",
//                             "totmtr": "12000.000",
//                             "totamt": "1128000",
//                             "chalqty": "11508.000",
//                             "chalamt": "1081752",
//                             "pending": "492.000",
//                             "pendingamt": "46248",
//                             "Shdcode": "0",
//                             "isallocated": "0",
//                             "allocatedqty": ".000",
//                             "remainingallocatedqty": "12000.000",
//                             "status": "PARTIAL",
//                             "apccode": "46041",
//                             "duedate": "31/08/2026"
//                         },
//                         {
//                             "suid": "630011793",
//                             "srno": "0",
//                             "parcode": "22790",
//                             "partyname": "KHAZANA SYNTEX",
//                             "sono": "00088",
//                             "sodate": "13/07/2026",
//                             "Dsnname": "RIP STOP-145",
//                             "dsncode": "32752",
//                             "mdsncode": "32752",
//                             "mdesignname": "RIP STOP-145",
//                             "prpcode": "SIP",
//                             "strcode": "012",
//                             "itmcode": "901644",
//                             "grdcode": "0",
//                             "totmtr": "12000.000",
//                             "totamt": "1128000",
//                             "chalqty": "11470.000",
//                             "chalamt": "1078180",
//                             "pending": "530.000",
//                             "pendingamt": "49820",
//                             "Shdcode": "0",
//                             "isallocated": "0",
//                             "allocatedqty": ".000",
//                             "remainingallocatedqty": "12000.000",
//                             "status": "PARTIAL",
//                             "apccode": "46041",
//                             "duedate": "30/07/2026"
//                         },
//                         {
//                             "suid": "630016102",
//                             "srno": "0",
//                             "parcode": "22790",
//                             "partyname": "KHAZANA SYNTEX",
//                             "sono": "00148",
//                             "sodate": "22/08/2026",
//                             "Dsnname": "RIP STOP-145",
//                             "dsncode": "32752",
//                             "mdsncode": "32752",
//                             "mdesignname": "RIP STOP-145",
//                             "prpcode": "SIP",
//                             "strcode": "012",
//                             "itmcode": "901644",
//                             "grdcode": "0",
//                             "totmtr": "13000.000",
//                             "totamt": "1235000",
//                             "chalqty": "4401.000",
//                             "chalamt": "418095",
//                             "pending": "8599.000",
//                             "pendingamt": "816905",
//                             "Shdcode": "0",
//                             "isallocated": "0",
//                             "allocatedqty": ".000",
//                             "remainingallocatedqty": "13000.000",
//                             "status": "PARTIAL",
//                             "apccode": "46041",
//                             "duedate": "31/08/2026"
//                         },
//                         {
//                             "suid": "630016262",
//                             "srno": "1",
//                             "parcode": "22790",
//                             "partyname": "KHAZANA SYNTEX",
//                             "sono": "00165",
//                             "sodate": "23/08/2026",
//                             "Dsnname": "RIP STOP-145",
//                             "dsncode": "32752",
//                             "mdsncode": "32752",
//                             "mdesignname": "RIP STOP-145",
//                             "prpcode": "SIP",
//                             "strcode": "012",
//                             "itmcode": "901644",
//                             "grdcode": "0",
//                             "totmtr": "19200.000",
//                             "totamt": "1824000",
//                             "chalqty": ".000",
//                             "chalamt": "0",
//                             "pending": "19200.000",
//                             "pendingamt": "1824000",
//                             "Shdcode": "46041",
//                             "isallocated": "1",
//                             "allocatedqty": "19200.000",
//                             "remainingallocatedqty": ".000",
//                             "status": "PENDING",
//                             "apccode": "46041",
//                             "duedate": "31/08/2026"
//                         },
//                         {
//                             "suid": "630013422",
//                             "srno": "0",
//                             "parcode": "22790",
//                             "partyname": "KHAZANA SYNTEX",
//                             "sono": "00205",
//                             "sodate": "28/07/2026",
//                             "Dsnname": "RIP STOP-145",
//                             "dsncode": "32752",
//                             "mdsncode": "32752",
//                             "mdesignname": "RIP STOP-145",
//                             "prpcode": "SIP",
//                             "strcode": "012",
//                             "itmcode": "901644",
//                             "grdcode": "0",
//                             "totmtr": "7200.000",
//                             "totamt": "676800",
//                             "chalqty": "6770.000",
//                             "chalamt": "636380",
//                             "pending": "1200.000",
//                             "pendingamt": "112800",
//                             "Shdcode": "0",
//                             "isallocated": "0",
//                             "allocatedqty": ".000",
//                             "remainingallocatedqty": "7200.000",
//                             "status": "PARTIAL",
//                             "apccode": "46041",
//                             "duedate": "12/08/2026"
//                         },
//                         {
//                             "suid": "630013474",
//                             "srno": "1",
//                             "parcode": "22790",
//                             "partyname": "KHAZANA SYNTEX",
//                             "sono": "00216",
//                             "sodate": "28/07/2026",
//                             "Dsnname": "RIP STOP-145",
//                             "dsncode": "32752",
//                             "mdsncode": "32752",
//                             "mdesignname": "RIP STOP-145",
//                             "prpcode": "SIP",
//                             "strcode": "012",
//                             "itmcode": "901644",
//                             "grdcode": "0",
//                             "totmtr": "63800.000",
//                             "totamt": "5997200",
//                             "chalqty": "10788.000",
//                             "chalamt": "1014072",
//                             "pending": "53012.000",
//                             "pendingamt": "4983128",
//                             "Shdcode": "46041",
//                             "isallocated": "1",
//                             "allocatedqty": "20200.000",
//                             "remainingallocatedqty": "43600.000",
//                             "status": "PARTIAL",
//                             "apccode": "46041",
//                             "duedate": "12/08/2026"
//                         }
//                     ],
//                     "design_summary": [
//                         {
//                             "totmtr": "148800.000",
//                             "totamt": "14019400",
//                             "chalqty": "65389.000",
//                             "chalamt": "6150967",
//                             "pending": "83884.000",
//                             "pendingamt": "7912895",
//                             "linebar": "43.94"
//                         }
//                     ],
//                     "shdcode": "46041"
//                 },
//                 "success": true,
//                 "message": "Data loaded successfully."
//             }
//             console.log('🔵 response subdesign ddddd', response, payload);
//             console.log('🔵 response subdesign ddddd', response.data, payload);
//             if (response.success) {
//                 // await AsyncStorage.setItem('parties_tracking_details', JSON.stringify(response.data.data));
//                 // await AsyncStorage.setItem('parties_tracking_details_challan_payload', JSON.stringify(payload));
//                 // await AsyncStorage.setItem('parties_tracking_details_party_name', parname.parname);
//                 // await saveLastViewedToCache(getDData.parcode);
//                 // setLastViewedParcode(getDData.parcode);
//                 // navigation.navigate('SOPartyDetails', { party: parname.parname });
//                 setTrackingLoader(false);
//                 setSelectedPartyDetails({
//                     designdetails: response.data.designdetails,
//                     design_summary: response.data.design_summary,
//                     payload: payload,
//                 });
//                 setIsPartyDetailsModalVisible(true);
//             }
//         } catch (error) {
//             console.error('Error in handleCardPress:', error);
//             Alert.alert('Error', 'Failed to process party details');
//         } finally {
//             setTrackingLoader(false);
//         }
//     };
//     const handleCardPress = async (
//         getDData?: any,
//         parname,
//         dsnname,
//         customPayload?: any,
//         item?: any,
//     ) => {
//         console.log(
//             '🔵 payload subdesign Clicked PARTY',
//             getDData,
//             parname,
//             dsnname,
//             customPayload,
//             item,
//         );
//         let seArr = []
//         let seArrCntr = 0;
//         selectedSalesExes && selectedSalesExes.length > 0 && selectedSalesExes.filter((el, ind) => {

//             seArr[seArrCntr] = el.sexe;
//             seArrCntr++;

//         })
//         const headers = {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json',
//             'X-Requested-with': 'XMLHttpRequest',
//         };
//         setTrackingLoader(true);
//         try {
//             const payload = {
//                 // fromdate: formatDate(fromDate),
//                 fromdate: '',
//                 deldate: customPayload.deldate,
//                 // todate: formatDate(delDate),
//                 todate: '',
//                 yearno: selectedYear.split('-')[1].substring(2),
//                 // sexes: selectedExe?.Code ? selectedExe?.Code : '0',
//                 sexes: seArr,
//                 type:
//                     selectedItemStatus === 'All'
//                         ? 'all'
//                         : selectedItemStatus === 'Open'
//                             ? 'open'
//                             : selectedItemStatus === 'Closed'
//                                 ? 'closed'
//                                 : 'all',
//                 wise:
//                     selectedItemStatus1 === 'Party Wise'
//                         ? 'party'
//                         : selectedItemStatus1 === 'Design Wise'
//                             ? 'design'
//                             : '',
//                 dsncodes: item?.dsncode ? [item?.dsncode] : [],
//                 itemcodes: getMainPayload.itemcodes || [],
//                 uid: item?.suid ? item?.suid : '',
//                 mdsncode: item?.mdsncode ? item?.mdsncode : '',
//                 parcode: getDData?.parcode,
//                 prptype: 'S',
//                 txntype: 'prodorderlist',
//             };
//             const response = await axios.post(
//                 `${API}/api/salesorderpartytracking`,
//                 payload,
//                 { headers },
//             );
//             console.log('🔵 response ddddd', response, payload);
//             if (response.data.success) {
//                 await AsyncStorage.setItem(
//                     'parties_tracking_details',
//                     JSON.stringify(response.data.data),
//                 );
//                 await AsyncStorage.setItem(
//                     'parties_tracking_details_challan_payload',
//                     JSON.stringify(payload),
//                 );
//                 await AsyncStorage.setItem(
//                     'parties_tracking_details_party_name',
//                     selectedItemStatus1 === 'Design Wise'
//                         ? dsnname.dsnname
//                         : parname.parname,
//                 );
//                 // await AsyncStorage.setItem('parties_tracking_details_sub_design_name', dsnname.dsnname);
//                 await saveLastViewedToCache(getDData.parcode);
//                 setLastViewedParcode(getDData.parcode);
//                 console.log('🔵 customPayload: ', customPayload);

//                 router.push({
//                     pathname: '/SOPartyDetails',
//                     params: {
//                         party: selectedItemStatus1 === 'Design Wise'
//                             ? dsnname.dsnname
//                             : parname.parname,
//                         selectedSalesExes: seArr
//                     }
//                 });
//             }
//         } catch (error) {
//             console.error('Error in handleCardPress:', error);
//             Alert.alert('Error', 'Failed to process party details');
//         } finally {
//             setTrackingLoader(false);
//         }
//     };

//     const openDrawer = () => setIsDrawerVisible(true);
//     const closeDrawer = () => setIsDrawerVisible(false);

//     const renderPartyCard = ({ item }: { item: Party }) => (
//         <TouchableOpacity
//             style={[
//                 styles.partyCard,
//                 lastViewedParcode === item.parcode && styles.recentlyViewedCard,
//             ]}
//             // onPress={() => handleCardPress(item)}
//             onPress={() => handleCardPressforDesign(item)}
//         >
//             <View style={styles.partyHeader}>
//                 <View
//                     style={[
//                         styles.partyAvatar,
//                         { backgroundColor: getColorForInitial(item.parcode) },
//                     ]}
//                 >
//                     {getTrackingLoader ? (
//                         <ActivityIndicator size="small" color="white" />
//                     ) : (
//                         <Text style={styles.partyAvatarText}>
//                             {getInitials(item.partyname)}
//                         </Text>
//                     )}
//                 </View>
//                 <View style={styles.partyInfo}>
//                     <Text style={styles.partyName}>{item.partyname}</Text>
//                     <View style={styles.partyOrdersContainer}>
//                         <Text style={styles.partyOrdersText}>{item.noof} orders</Text>
//                     </View>
//                 </View>
//                 <Icon
//                     name="chevron-right"
//                     size={24}
//                     color="#999"
//                     style={styles.chevronIcon}
//                 />
//             </View>
//             <View style={styles.partyValues}>
//                 <View style={styles.valueRow}>
//                     <View style={styles.valueItem}>
//                         <Text style={styles.valueLabel}>Total Meter:</Text>
//                         <Text style={styles.valueText}>{formatNumber(item.totmtr)}</Text>
//                     </View>
//                     <View style={styles.valueItem}>
//                         <Text style={[styles.valueLabel, { color: '#E65100' }]}>
//                             Pending Meter:
//                         </Text>
//                         <Text style={[styles.valueText, { color: '#E65100' }]}>
//                             {formatNumber(item.pendingmtr)}
//                         </Text>
//                     </View>
//                 </View>
//                 <View style={styles.valueRow}>
//                     <View style={styles.valueItem}>
//                         <Text style={styles.valueLabel}>Amount:</Text>
//                         <Text style={styles.valueText}>{formatValue(item.amount)}</Text>
//                     </View>
//                     <View style={styles.valueItem}>
//                         <Text style={[styles.valueLabel, { color: '#4CAF50' }]}>
//                             Pending Amount:
//                         </Text>
//                         <Text style={[styles.valueText, { color: '#4CAF50' }]}>
//                             {formatValue(item.pendingamt)}
//                         </Text>
//                     </View>
//                 </View>
//             </View>
//             {lastViewedParcode === item.parcode && (
//                 <View style={styles.recentlyViewedBadge}>
//                     <Text style={styles.recentlyViewedText}>Recently Viewed</Text>
//                 </View>
//             )}
//         </TouchableOpacity>
//     );

//     const renderFooter = () => {
//         if (!loading) return null;
//         return (
//             <ActivityIndicator
//                 style={styles.loadingIndicator}
//                 size="large"
//                 color={theme.BRAND_GRADIENT_END}
//             />
//         );
//     };

//     const fetchSalesExe = async () => {
//         const userPtype = await AsyncStorage.getItem('user_prptype');
//         console.log("fetchSalesExe function :", userPtype)

//         if (cancelToken?.cancel) cancelToken.cancel();

//         cancelToken = axios.CancelToken.source();

//         try {

//             let pload = {
//                 prptype: userPtype,
//                 yearno: getCurrentFinancialYear()
//             };

//             console.log("payload : ", pload);
//             console.log("url :", `${API}/api/getsexes`)

//             const response = await axios.get(
//                 `${API}/api/getsexes`,
//                 getRequestConfig({
//                     params: pload,
//                 }),
//             );

//             console.log("response :", response)
//             console.log("response1 :", response.data)
//             console.log("response2 :", response.data.data)

//             if (response.data.success) {
//                 console.log('✅ getsexex API response:', response.data.data);

//                 setSalesExeData(response.data.data);
//                 // fetchDesign();
//                 fetchParty();

//             } else {

//                 setSalesExeData([]);

//             }

//         } catch (error) {
//             if (!axios.isCancel(error)) {

//                 Alert.alert('Error', `Server error: ${error.message}`);
//             }
//         }
//     };

//     return (
//         <>
//             {getTrackingLoader && <FullScreenLoader />}
//             <HeaderBar
//                 userName={username}
//                 placeholder="Search sales order..."
//                 onSearch={setSearchQueryPOT}
//             />
//             <TouchableOpacity style={styles.listIconContainer} onPress={openDrawer}>
//                 <Icon name="list" size={24} color="white" />
//             </TouchableOpacity>
//             <CustomDrawer
//                 isVisible={isDrawerVisible}
//                 onClose={closeDrawer}
//                 fromDate={fromDate}
//                 delDate={delDate}
//                 selectedYear={selectedYear}
//                 onFromDateChange={setFromDate}
//                 onToDateChange={setDelDate}
//                 onYearChange={setSelectedYear}
//                 onLoadPress={handleConfirmAction}
//                 exeData={salesExeData}
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
//                 selectedItemStatus1={selectedItemStatus1}
//                 onItemStatusChange={setSelectedItemStatus}
//                 onItemStatusChange1={setSelectedItemStatus1}
//                 setSelectedParty={setSelectedParty}
//                 selectedParty={selectedParty}
//                 yearOptions={yearOptions}
//                 setSelectedSalesExes={setSelectedSalesExes}
//                 selectedSalesExes={selectedSalesExes}
//                 onSalesExeSelect={setSelectedSalesExes}
//             //salesExeData={salesExeData}
//             />
//             {salessumdata.length > 0 ? (
//                 <View style={styles.container}>
//                     <View style={styles.summaryContainer}>
//                         <View style={[styles.summaryBox, { backgroundColor: '#E3F2FD' }]}>
//                             <Text style={styles.summaryLabel}>Total Orders</Text>
//                             <Text style={styles.summaryValue}>
//                                 {formatNumber(salessumdata[0]?.noof || '0')}
//                             </Text>
//                         </View>
//                         <View style={[styles.summaryBox, { backgroundColor: '#E8F5E8' }]}>
//                             <Text style={styles.summaryLabel}>Total Meter</Text>
//                             <Text style={styles.summaryValue}>
//                                 {formatNumber(salessumdata[0]?.totmtr || '0')}
//                             </Text>
//                             <Text style={[styles.summaryLabel, { marginTop: 5 }]}>
//                                 Amount
//                             </Text>
//                             <Text style={styles.summaryValue}>
//                                 {formatValue(salessumdata[0]?.amount || '0')}
//                             </Text>
//                         </View>
//                         <View style={[styles.summaryBox, { backgroundColor: '#FFF3E0' }]}>
//                             <Text style={styles.summaryLabel}>Pending Meter</Text>
//                             <Text style={[styles.summaryValue, { color: '#E65100' }]}>
//                                 {salessumdata[0]?.pendingmtr || '0'}
//                             </Text>
//                             <Text style={[styles.summaryLabel, { marginTop: 5 }]}>
//                                 Pending Amount
//                             </Text>
//                             <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
//                                 {formatValue(salessumdata[0]?.pendingamt || '0')}
//                             </Text>
//                         </View>
//                     </View>
//                     <View
//                         style={{
//                             display: 'flex',
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                         }}
//                     >
//                         <Text style={styles.sectionTitle}>
//                             PARTIES (
//                             {searchQueryPOT.trim()
//                                 ? filteredData.length
//                                 : (renderedData && renderedData.length) || '0'}
//                             )
//                         </Text>
//                         <Text style={styles.sectionTitle}>
//                             ALL PARTIES ({salesdataTotal || '0'})
//                         </Text>
//                     </View>
//                     <View
//                         style={{
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                         }}
//                     >
//                         <Text style={styles.sectionTitle}></Text>
//                         <TouchableOpacity
//                             onPress={toggleSortOrder}
//                             style={{ flexDirection: 'row', alignItems: 'center' }}
//                         >
//                             <Icon
//                                 name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'}
//                                 size={12}
//                                 color="#333"
//                             />
//                             <Text style={{ fontSize: 12, color: '#333', marginLeft: 4 }}>
//                                 Sort by Pending Amt.
//                             </Text>
//                         </TouchableOpacity>
//                     </View>
//                     <FlatList
//                         ref={flatListRef}
//                         data={renderedData} // <-- Yahan `renderedData` use karo
//                         renderItem={renderPartyCard}
//                         keyExtractor={(item, index) => `${item.parcode}-${index}`}
//                         onEndReached={loadMoreData}
//                         onEndReachedThreshold={0.5}
//                         ListFooterComponent={renderFooter}
//                         contentContainerStyle={styles.listContent}
//                         ListEmptyComponent={
//                             !isLoading ? (
//                                 <View style={crlimtreq_styles.emptyContainer}>
//                                     <Text style={crlimtreq_styles.emptyText}>
//                                         No request data found!
//                                     </Text>
//                                 </View>
//                             ) : null
//                         }
//                         extraData={lastViewedParcode}
//                         onContentSizeChange={() => setIsListReady(true)}
//                     />
//                 </View>
//             ) : (
//                 <>
//                     <View style={crlimtreq_styles.emptyContainer}>
//                         <Text style={crlimtreq_styles.emptyText}>No data found!</Text>
//                     </View>
//                 </>
//             )}
//             {isDesignModalVisible && (
//                 <View style={styles.detailOverlay123}>
//                     <View style={styles.detailContainer}>
//                         <View style={styles.modalContainer}>
//                             <View style={styles.modalHeader}>
//                                 <Text style={styles.modalTitle}>Main Design Summary</Text>
//                                 <TouchableOpacity onPress={closeDesignModal}>
//                                     <Icon name="close" size={24} color="#333" />
//                                 </TouchableOpacity>
//                             </View>
//                             {getTrackingLoader ? (
//                                 <ActivityIndicator
//                                     style={{ marginBottom: 10 }}
//                                     size={24}
//                                     color={theme.BRAND_GRADIENT_END}
//                                 />
//                             ) : (
//                                 <TextInput
//                                     style={styles.searchInput}
//                                     placeholder="Search designs..."
//                                     value={searchQuery}
//                                     onChangeText={setSearchQuery}
//                                 />
//                             )}
//                             {selectedDesignData?.design_summary.map((summary, index) => (
//                                 <TouchableOpacity
//                                     key={index}
//                                     style={
//                                         selectedItemStatus1 === 'Design Wise'
//                                             ? styles.summaryCard123
//                                             : styles.summaryCard
//                                     }
//                                     onPress={() => {
//                                         // handleCardPress(getDData, { parname: selectedDesignData?.designdetails[0].partyname }, selectedDesignData?.payload);
//                                         handleCardSubDesignPress(
//                                             getDData,
//                                             { parname: selectedDesignData?.designdetails[0].partyname },
//                                             selectedDesignData?.payload,
//                                         );
//                                         setisALL(true);
//                                     }}
//                                 >
//                                     {selectedItemStatus1 === 'Design Wise' ? null : (
//                                         <Text style={styles.partyNameInSummary}>
//                                             Party: {selectedDesignData?.designdetails[0]?.partyname || ''}
//                                         </Text>
//                                     )}
//                                     {selectedItemStatus1 === 'Design Wise' ? (
//                                         <>
//                                             <View style={styles.summaryContainer}>
//                                                 <View
//                                                     style={[
//                                                         styles.summaryBox,
//                                                         { backgroundColor: '#E3F2FD' },
//                                                     ]}
//                                                 >
//                                                     <Text style={styles.summaryLabel}>Total Orders</Text>
//                                                     <Text style={styles.summaryValue}>
//                                                         {formatNumber(summary?.noofchallan || '0')}
//                                                     </Text>
//                                                 </View>
//                                                 <View
//                                                     style={[
//                                                         styles.summaryBox,
//                                                         { backgroundColor: '#E8F5E8' },
//                                                     ]}
//                                                 >
//                                                     <Text style={styles.summaryLabel}>Total Meter</Text>
//                                                     <Text style={styles.summaryValue}>
//                                                         {formatNumber(summary.totmtr)}
//                                                     </Text>
//                                                     <Text style={[styles.summaryLabel, { marginTop: 5 }]}>
//                                                         Total Amount
//                                                     </Text>
//                                                     <Text style={styles.summaryValue}>
//                                                         {formatValue(summary.totamt)}
//                                                     </Text>
//                                                 </View>
//                                                 <View
//                                                     style={[
//                                                         styles.summaryBox,
//                                                         { backgroundColor: '#FFF3E0' },
//                                                     ]}
//                                                 >
//                                                     <Text style={styles.summaryLabel}>Pending Meter</Text>
//                                                     <Text style={[styles.summaryValue, { color: '#E65100' }]}>
//                                                         {formatNumber(summary.pending)}
//                                                     </Text>
//                                                     <Text style={[styles.summaryLabel, { marginTop: 5 }]}>
//                                                         Pending Amount
//                                                     </Text>
//                                                     <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
//                                                         {formatValue(summary.pendingamt)}
//                                                     </Text>
//                                                 </View>
//                                             </View>
//                                         </>
//                                     ) : (
//                                         <>
//                                             <View style={styles.summaryRow}>
//                                                 <Text style={styles.summaryLabel}>Total Meter:</Text>
//                                                 <Text style={styles.summaryValue}>
//                                                     {formatNumber(summary.totmtr)}
//                                                 </Text>
//                                             </View>
//                                             <View style={styles.summaryRow}>
//                                                 <Text style={styles.summaryLabel}>Total Amount:</Text>
//                                                 <Text style={styles.summaryValue}>
//                                                     {formatValue(summary.totamt)}
//                                                 </Text>
//                                             </View>
//                                             <View style={styles.summaryRow}>
//                                                 <Text style={styles.summaryLabel}>Challan Qty:</Text>
//                                                 <Text style={styles.summaryValue}>
//                                                     {formatNumber(summary.chalqty)}
//                                                 </Text>
//                                             </View>
//                                             <View style={styles.summaryRow}>
//                                                 <Text style={styles.summaryLabel}>Pending Meter:</Text>
//                                                 <Text style={[styles.summaryValue, { color: '#E65100' }]}>
//                                                     {formatNumber(summary.pending)}
//                                                 </Text>
//                                             </View>
//                                             <View style={styles.summaryRow}>
//                                                 <Text style={styles.summaryLabel}>Pending Amount:</Text>
//                                                 <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
//                                                     {formatValue(summary.pendingamt)}
//                                                 </Text>
//                                             </View>
//                                         </>
//                                     )}

//                                     {/*  */}
//                                 </TouchableOpacity>
//                             ))}
//                             {/* <Text style={styles.sectionTitle}>Main Item Details</Text> */}
//                             <View
//                                 style={{
//                                     flexDirection: 'row',
//                                     justifyContent: 'space-between',
//                                     alignItems: 'center',
//                                 }}
//                             >
//                                 <Text style={styles.sectionTitle}>Main Design Details</Text>
//                                 <TouchableOpacity
//                                     onPress={toggleSortOrder1}
//                                     style={{ flexDirection: 'row', alignItems: 'center' }}
//                                 >
//                                     <Icon
//                                         name={sortOrder1 === 'asc' ? 'arrow-upward' : 'arrow-downward'}
//                                         size={12}
//                                         color="#333"
//                                     />
//                                     <Text style={{ fontSize: 12, color: '#333', marginLeft: 4 }}>
//                                         Sort by Pending Amt.
//                                     </Text>
//                                 </TouchableOpacity>
//                             </View>
//                             <FlatList
//                                 data={filteredDesignDetails.slice(
//                                     0,
//                                     designPage * designItemsPerPage,
//                                 )}
//                                 renderItem={({ item }) => (
//                                     <TouchableOpacity
//                                         style={styles.designCard}
//                                         onPress={() => {
//                                             const payload = {
//                                                 ...selectedDesignData!.payload,
//                                                 dsncodes: [item.dsncode],
//                                                 itemcodes: [item.dsncode],
//                                             };
//                                             // handleCardPress(getDData, { parname: item.partyname }, payload);
//                                             handleCardSubDesignPress(
//                                                 getDData,
//                                                 { parname: item.partyname },
//                                                 payload,
//                                                 item,
//                                             );
//                                             setisALL(false);
//                                         }}
//                                     >
//                                         <View style={styles.designHeader}>
//                                             <Text style={styles.designName}>{item.Dsnname}</Text>
//                                             <Text style={styles.designCode}>{item.dsncode}</Text>
//                                         </View>
//                                         {/* 👇 ADD THIS */}
//                                         {/* <TouchableOpacity
//                                             style={styles.jobChartBtn}
//                                             onPress={(e) => {
//                                                 openJobChart(item);
//                                             }}
//                                         >
//                                             <Icon name="receipt-long" size={14} color={theme.BRAND_GRADIENT_END} />
//                                             <Text style={styles.jobChartBtnText}>Job Chart</Text>
//                                         </TouchableOpacity> */}
//                                         <View style={styles.designValues}>
//                                             <View style={styles.valueRow}>
//                                                 <View style={styles.valueItem}>
//                                                     <Text style={styles.valueLabel}>Total Meter:</Text>
//                                                     <Text style={styles.valueText}>
//                                                         {formatNumber(item.totmtr)}
//                                                     </Text>
//                                                 </View>
//                                                 <View style={styles.valueItem}>
//                                                     <Text style={[styles.valueLabel, { color: '#E65100' }]}>
//                                                         Pending Meter:
//                                                     </Text>
//                                                     <Text style={[styles.valueText, { color: '#E65100' }]}>
//                                                         {formatNumber(item.pending)}
//                                                     </Text>
//                                                 </View>
//                                             </View>
//                                             <View style={styles.valueRow}>
//                                                 <View style={styles.valueItem}>
//                                                     <Text style={styles.valueLabel}>Total Amount:</Text>
//                                                     <Text style={styles.valueText}>
//                                                         {formatValue(item.totamt)}
//                                                     </Text>
//                                                 </View>
//                                                 <View style={styles.valueItem}>
//                                                     <Text style={[styles.valueLabel, { color: '#4CAF50' }]}>
//                                                         Pending Amount:
//                                                     </Text>
//                                                     <Text style={[styles.valueText, { color: '#4CAF50' }]}>
//                                                         {formatValue(item.pendingamt)}
//                                                     </Text>
//                                                 </View>
//                                             </View>
//                                         </View>
//                                     </TouchableOpacity>
//                                 )}
//                                 keyExtractor={(item, index) => `${item.dsncode}-${index}`}
//                                 onEndReached={loadMoreDesignDetails}
//                                 onEndReachedThreshold={0.5}
//                                 ListFooterComponent={
//                                     designPage * designItemsPerPage < filteredDesignDetails.length ? (
//                                         <ActivityIndicator
//                                             size="large"
//                                             color={theme.BRAND_GRADIENT_END}
//                                         />
//                                     ) : null
//                                 }
//                             />
//                         </View>
//                     </View>
//                 </View>
//             )}

//             {/*  */}
//             {isPartyDetailsModalVisible && (
//                 <View style={styles.detailOverlay456}>
//                     <View style={styles.detailContainer}>
//                         <View style={styles.modalContainer}>
//                             {!isAll ? (
//                                 <>
//                                     <View style={styles.modalHeader}>
//                                         <Text style={styles.modalTitle}>Sub Design Summary</Text>
//                                         <TouchableOpacity
//                                             onPress={() => setIsPartyDetailsModalVisible(false)}
//                                         >
//                                             <Icon name="close" size={24} color="#333" />
//                                         </TouchableOpacity>
//                                     </View>

//                                     {/* Search Input */}
//                                     {getTrackingLoader ? (
//                                         <ActivityIndicator
//                                             style={{ marginBottom: 10 }}
//                                             size={24}
//                                             color={theme.BRAND_GRADIENT_END}
//                                         />
//                                     ) : (
//                                         <TextInput
//                                             style={styles.searchInput}
//                                             placeholder="Search sub design details..."
//                                             value={searchQueryPartyDetails}
//                                             onChangeText={setSearchQueryPartyDetails}
//                                         />
//                                     )}
//                                     {selectedPartyDetails?.design_summary.map((summary, index) => (
//                                         <TouchableOpacity
//                                             key={index}
//                                             style={styles.summaryCard}
//                                             onPress={() => {
//                                                 // handleCardPress(getDData, { parname: selectedPartyDetails?.designdetails[0].partyname }, selectedPartyDetails?.payload);
//                                                 // handleCardSubDesignPress(getDData, { parname: selectedPartyDetails?.designdetails[0].partyname }, selectedPartyDetails?.payload);
//                                                 handleCardPress(
//                                                     selectedPartyDetails?.payload,
//                                                     {
//                                                         parname:
//                                                             selectedPartyDetails?.designdetails[0].partyname,
//                                                     },
//                                                     { dsnname: 'All Items' },
//                                                     selectedPartyDetails?.payload,
//                                                     summary,
//                                                 );
//                                             }}
//                                         >
//                                             {selectedItemStatus1 === 'Design Wise' ? null : (
//                                                 <Text style={styles.partyNameInSummary}>
//                                                     Party:{' '}
//                                                     {selectedPartyDetails?.designdetails[0]?.partyname || ''}
//                                                 </Text>
//                                             )}

//                                             <View style={styles.summaryRow}>
//                                                 <Text style={styles.summaryLabel}>Total Meter:</Text>
//                                                 <Text style={styles.summaryValue}>{summary.totmtr}</Text>
//                                             </View>
//                                             <View style={styles.summaryRow}>
//                                                 <Text style={styles.summaryLabel}>Total Amount:</Text>
//                                                 <Text style={styles.summaryValue}>
//                                                     {formatValue(summary.totamt)}
//                                                 </Text>
//                                             </View>
//                                             <View style={styles.summaryRow}>
//                                                 <Text style={styles.summaryLabel}>Challan Qty:</Text>
//                                                 <Text style={styles.summaryValue}>
//                                                     {formatNumber(summary.chalqty)}
//                                                 </Text>
//                                             </View>
//                                             <View style={styles.summaryRow}>
//                                                 <Text style={styles.summaryLabel}>Pending Meter:</Text>
//                                                 <Text style={[styles.summaryValue, { color: '#E65100' }]}>
//                                                     {formatNumber(summary.pending)}
//                                                 </Text>
//                                             </View>
//                                             <View style={styles.summaryRow}>
//                                                 <Text style={styles.summaryLabel}>Pending Amount:</Text>
//                                                 <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
//                                                     {formatValue(summary.pendingamt)}
//                                                 </Text>
//                                             </View>
//                                         </TouchableOpacity>
//                                     ))}
//                                 </>
//                             ) : (
//                                 <View>
//                                     <View style={styles.modalHeader}>
//                                         <Text style={styles.modalTitle}>Sub Design Summary</Text>
//                                         <TouchableOpacity
//                                             onPress={() => setIsPartyDetailsModalVisible(false)}
//                                         >
//                                             <Icon name="close" size={24} color="#333" />
//                                         </TouchableOpacity>
//                                     </View>
//                                     {getTrackingLoader ? (
//                                         <ActivityIndicator
//                                             style={{ marginBottom: 10 }}
//                                             size={24}
//                                             color={theme.BRAND_GRADIENT_END}
//                                         />
//                                     ) : (
//                                         <TextInput
//                                             style={styles.searchInput}
//                                             placeholder="Search sub design details..."
//                                             value={searchQueryPartyDetails}
//                                             onChangeText={setSearchQueryPartyDetails}
//                                         />
//                                     )}
//                                 </View>
//                             )}
//                             {/* Party Details List */}
//                             {/* <FlatList
//                         data={filteredPartyDetails}
//                         renderItem={({ item }) => (
//                             <TouchableOpacity
//                                 style={styles.partyDetailCard}
//                                 onPress={() => {
//                                     const payload = {
//                                         deldate: item.delDate || selectedDesignData?.payload.deldate,
//                                         uid: item.uid,
//                                         mdsncode: item.dsncode,
//                                         parcode: item.parcode,
//                                         prptype: 'S',
//                                         txntype: 'prodorderlist',
//                                     };
//                                     handleCardPress(selectedDesignData?.payload, { parname: item.partyname }, payload, item);
//                                 }}
//                             >
//                                 <Text style={styles.partyDetailName}>{item.partyname}</Text>
//                                 <Text style={styles.partyDetailCode}>Design: {item.Dsnname}</Text>
//                                 <Text style={styles.partyDetailMeter}>Meter: {item.totmtr}</Text>
//                                 <Text style={[
//                                     styles.partyDetailStatus,
//                                     { color: item.status === 'CLOSED' ? '#4CAF50' : '#E65100' }
//                                 ]}>Status: {item.status}</Text>
//                             </TouchableOpacity>
//                         )}
//                         keyExtractor={(item, index) => `${item.uid}-${index}`}
//                         ListEmptyComponent={
//                             <View style={styles.emptyContainer}>
//                                 <Text style={styles.emptyText}>No party details found!</Text>
//                             </View>
//                         }
//                     /> */}
//                             {/* <Text style={styles.sectionTitle}>Sub Design Details</Text> */}
//                             <View
//                                 style={{
//                                     flexDirection: 'row',
//                                     justifyContent: 'space-between',
//                                     alignItems: 'center',
//                                 }}
//                             >
//                                 <Text style={styles.sectionTitle}>Sub Design Details</Text>
//                                 <TouchableOpacity
//                                     onPress={toggleSortOrder2}
//                                     style={{ flexDirection: 'row', alignItems: 'center' }}
//                                 >
//                                     <Icon
//                                         name={sortOrder2 === 'asc' ? 'arrow-upward' : 'arrow-downward'}
//                                         size={12}
//                                         color="#333"
//                                     />
//                                     <Text style={{ fontSize: 12, color: '#333', marginLeft: 4 }}>
//                                         Sort by Pending Amt.
//                                     </Text>
//                                 </TouchableOpacity>
//                             </View>
//                             <FlatList
//                                 data={filteredPartyDetails.slice(
//                                     0,
//                                     subdesignPage * subdesignItemsPerPage,
//                                 )}
//                                 renderItem={({ item }) => (
//                                     <TouchableOpacity
//                                         style={styles.designCard}
//                                         onPress={() => {
//                                             const payload = {
//                                                 ...selectedPartyDetails!.payload,
//                                                 dsncodes: [item.dsncode],
//                                                 itemcodes: [item.dsncode],
//                                             };
//                                             // handleCardPress(getDData, { parname: item.partyname }, payload);
//                                             // handleCardSubDesignPress(getDData, { parname: item.partyname }, payload, item);
//                                             handleCardPress(
//                                                 selectedPartyDetails?.payload,
//                                                 { parname: item.partyname },
//                                                 { dsnname: item.Dsnname },
//                                                 payload,
//                                                 item,
//                                             );
//                                         }}
//                                     >
//                                         <View style={styles.designHeader}>
//                                             <Text style={styles.designName}>{item.Dsnname}</Text>
//                                             <Text style={styles.designCode}>{item.dsncode}</Text>
//                                         </View>
//                                         <View style={styles.designSubheader}>
//                                             <Text style={styles.designNameSub}>Shade: {item.shdname} ({item.shdcode})</Text>
//                                         </View>

//                                         <View style={styles.designValues}>
//                                             <View style={styles.valueRow}>
//                                                 <View style={styles.valueItem}>
//                                                     <Text style={styles.valueLabel}>Total Meter:</Text>
//                                                     <Text style={styles.valueText}>
//                                                         {formatNumber(item.totmtr)}
//                                                     </Text>
//                                                 </View>
//                                                 <View style={styles.valueItem}>
//                                                     <Text style={[styles.valueLabel, { color: '#E65100' }]}>
//                                                         Pending Meter:
//                                                     </Text>
//                                                     <Text style={[styles.valueText, { color: '#E65100' }]}>
//                                                         {formatNumber(item.pending)}
//                                                     </Text>
//                                                 </View>
//                                             </View>
//                                             <View style={styles.valueRow}>
//                                                 <View style={styles.valueItem}>
//                                                     <Text style={styles.valueLabel}>Total Amount:</Text>
//                                                     <Text style={styles.valueText}>
//                                                         {formatValue(item.totamt)}
//                                                     </Text>
//                                                 </View>
//                                                 <View style={styles.valueItem}>
//                                                     <Text style={[styles.valueLabel, { color: '#4CAF50' }]}>
//                                                         Pending Amount:
//                                                     </Text>
//                                                     <Text style={[styles.valueText, { color: '#4CAF50' }]}>
//                                                         {formatValue(item.pendingamt)}
//                                                     </Text>
//                                                 </View>
//                                             </View>
//                                             <View style={styles.valueRow}>
//                                                 <View style={styles.valueItem}>
//                                                     <Text style={styles.valueLabel}>So No:</Text>
//                                                     <Text style={styles.valueText}>{item.sono}</Text>
//                                                 </View>
//                                                 <View style={styles.valueItem}>
//                                                     <Text style={[styles.valueLabel]}>So Date:</Text>
//                                                     <Text style={[styles.valueText]}>{item.sodate}</Text>
//                                                 </View>
//                                             </View>
//                                         </View>
//                                         <View style={styles.designSubheader}>
//                                             <View
//                                                 style={[
//                                                     styles.jobChartBtn,
//                                                     {
//                                                         backgroundColor:
//                                                             item.status === 'CLOSED'
//                                                                 ? '#FFEBEE'
//                                                                 : item.status === 'PENDING'
//                                                                     ? '#FFF3E0'
//                                                                     : item.status === 'PARTIAL'
//                                                                         ? '#E8F5E8'
//                                                                         : 'transparent',
//                                                     }
//                                                 ]}
//                                             >
//                                                 <Text
//                                                     style={[
//                                                         styles.jobChartBtnText,
//                                                         {
//                                                             color:
//                                                                 item.status === 'CLOSED'
//                                                                     ? '#E65100'
//                                                                     : item.status === 'PENDING'
//                                                                         ? '#E65100'
//                                                                         : item.status === 'PARTIAL'
//                                                                             ? '#4CAF50'
//                                                                             : theme.BRAND_GRADIENT_END,
//                                                         }
//                                                     ]}
//                                                 >
//                                                     {item.status}
//                                                 </Text>
//                                             </View>
//                                             <TouchableOpacity
//                                                 style={styles.jobChartBtn}
//                                                 onPress={(e) => {
//                                                     openJobChart(item);
//                                                 }}
//                                             >
//                                                 <Icon name="receipt-long" size={14} color={theme.BRAND_GRADIENT_END} />
//                                                 <Text style={styles.jobChartBtnText}>Job Chart</Text>
//                                             </TouchableOpacity>
//                                         </View>
//                                     </TouchableOpacity>
//                                 )}
//                                 keyExtractor={(item, index) => `${item.dsncode}-${index}`}
//                                 onEndReached={loadMoreSubDesignDetails}
//                                 onEndReachedThreshold={0.5}
//                                 ListFooterComponent={
//                                     subdesignPage * subdesignItemsPerPage <
//                                         filteredPartyDetails.length ? (
//                                         <ActivityIndicator
//                                             size="large"
//                                             color={theme.BRAND_GRADIENT_END}
//                                         />
//                                     ) : null
//                                 }
//                             />
//                         </View>
//                     </View>
//                 </View>
//             )}

//             {/* JOB CHART MODAL */}
//             {/* JOB CHART — FULL SCREEN */}
//             {jobChartVisible && (
//                 <KeyboardAvoidingView
//                     behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//                     style={styles.jobChartFullOverlay}
//                 >
//                     {/* HEADER */}
//                     <View style={styles.jobChartFullHeader}>
//                         <TouchableOpacity
//                             onPress={() => setJobChartVisible(false)}
//                             style={styles.jobChartBackBtn}
//                             hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//                         >
//                             <Icon name="arrow-back" size={24} color="#333" />
//                         </TouchableOpacity>
//                         <View style={{ flex: 1 }}>
//                             <Text style={styles.jobChartFullTitle}>Job Chart</Text>
//                             <Text style={styles.jobChartFullSubtitle} numberOfLines={1}>
//                                 {jobChartRef?.dsnName} ({jobChartRef?.dsnCode})
//                             </Text>
//                         </View>
//                         <View style={styles.jobChartDateBadge}>
//                             <Icon name="event" size={12} color="#fff" />
//                             <Text style={styles.jobChartDateBadgeText}>
//                                 {formatAllocDate(getTodayDateStr())}
//                             </Text>
//                         </View>
//                     </View>

//                     {jobChartLoading ? (
//                         <ActivityIndicator size="large" color={theme.BRAND_GRADIENT_END} style={{ marginTop: 40 }} />
//                     ) : (
//                         <>
//                             <FlatList
//                                 data={[]}
//                                 keyExtractor={() => 'x'}
//                                 renderItem={null}
//                                 style={{ flex: 1 }}
//                                 contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
//                                 ListHeaderComponent={
//                                     <>
//                                         {/* REF CARD */}
//                                         <View style={styles.jobChartRefCard}>
//                                             <View style={styles.jobChartRefRow}>
//                                                 <View style={{ flex: 1 }}>
//                                                     <Text style={styles.jobChartRefLabel}>SO NO</Text>
//                                                     <Text style={styles.jobChartRefValue}>{jobChartRef?.sono || '-'}</Text>
//                                                 </View>
//                                                 <View style={{ flex: 1, alignItems: 'flex-end' }}>
//                                                     <Text style={styles.jobChartRefLabel}>STATUS</Text>
//                                                     <Text
//                                                         style={[
//                                                             styles.jobChartRefValue,
//                                                             { color: jobChartRef?.status === 'CLOSED' ? '#E65100' : '#4CAF50' },
//                                                         ]}
//                                                     >
//                                                         {jobChartRef?.status || 'OPEN'}
//                                                     </Text>
//                                                 </View>
//                                             </View>

//                                             <View style={styles.jobChartProgressWrap}>
//                                                 <View style={styles.jobChartProgressRow}>
//                                                     <Text style={styles.jobChartRefLabel}>PENDING METER</Text>
//                                                     <Text style={styles.jobChartPendingValue}>
//                                                         {formatNumber(String(jobChartRef?.pendingMeter || 0))} m
//                                                     </Text>
//                                                 </View>
//                                                 <View style={styles.progressBarBg}>
//                                                     <View
//                                                         style={[
//                                                             styles.progressBarFill,
//                                                             {
//                                                                 width: `${Math.min(
//                                                                     100,
//                                                                     ((getTotalAllocatedQty()) /
//                                                                         Math.max(jobChartRef?.pendingMeter || 1, 1)) *
//                                                                     100,
//                                                                 )}%`,
//                                                                 backgroundColor:
//                                                                     getTotalAllocatedQty() > (jobChartRef?.pendingMeter || 0)
//                                                                         ? '#E53935'
//                                                                         : theme.BRAND_GRADIENT_END,
//                                                             },
//                                                         ]}
//                                                     />
//                                                 </View>
//                                                 <View style={styles.jobChartProgressRow}>
//                                                     <Text style={styles.jobChartAllocatedText}>
//                                                         Allocated: {formatNumber(String(getTotalAllocatedQty()))} m
//                                                     </Text>
//                                                     <Text
//                                                         style={[
//                                                             styles.jobChartAllocatedText,
//                                                             {
//                                                                 color:
//                                                                     (jobChartRef?.pendingMeter || 0) - getTotalAllocatedQty() < 0
//                                                                         ? '#E53935'
//                                                                         : '#4CAF50',
//                                                                 fontWeight: 'bold',
//                                                             },
//                                                         ]}
//                                                     >
//                                                         Remaining: {formatNumber(String(Math.max((jobChartRef?.pendingMeter || 0) - getTotalAllocatedQty(), 0)))} m
//                                                     </Text>
//                                                 </View>
//                                             </View>
//                                         </View>

//                                         {!canEditAllocation() && (
//                                             <View style={styles.jobChartLockBanner}>
//                                                 <Icon name="lock" size={16} color="#E65100" />
//                                                 <Text style={styles.jobChartLockBannerText}>
//                                                     {jobChartRef?.status === 'CLOSED'
//                                                         ? 'This design is closed — view only.'
//                                                         : jobChartRef?.pendingMeter <= 0
//                                                             ? 'No pending meter left — view only.'
//                                                             : 'APC not matched — view only.'}
//                                                 </Text>
//                                             </View>
//                                         )}

//                                         {/* ===== GROUP: NEW / UNSAVED ===== */}
//                                         {allocations.filter(a => !a.LastDate).length > 0 && (
//                                             <View style={styles.groupBlockNew}>
//                                                 <View style={styles.groupHeader}>
//                                                     <View style={[styles.groupDot, { backgroundColor: '#2196F3' }]} />
//                                                     <Text style={styles.groupTitle}>New (Not Saved)</Text>
//                                                     <Text style={styles.groupCount}>
//                                                         {allocations.filter(a => !a.LastDate).length}
//                                                     </Text>
//                                                 </View>
//                                                 {allocations
//                                                     .map((a, idx) => ({ ...a, __idx: idx }))
//                                                     .filter(a => !a.LastDate)
//                                                     .map(item => (
//                                                         <View key={`new-${item.__idx}`} style={styles.allocRowCard}>
//                                                             <View style={{ flex: 1 }}>
//                                                                 <Text style={styles.allocRowName}>{item.ShdName?.trim()}</Text>
//                                                                 <Text style={styles.allocRowCode}>Code: {item.ShdCode}</Text>
//                                                             </View>
//                                                             <Text style={styles.allocRowQty}>
//                                                                 {formatNumber(String(item.AllocationQty))} m
//                                                             </Text>
//                                                             {canEditAllocation() && (
//                                                                 <TouchableOpacity
//                                                                     onPress={() => handleRemoveAllocationRow(item.__idx)}
//                                                                     style={styles.allocRowRemoveBtn}
//                                                                 >
//                                                                     <Icon name="close" size={16} color="#E65100" />
//                                                                 </TouchableOpacity>
//                                                             )}
//                                                         </View>
//                                                     ))}
//                                                 <View style={styles.groupTotal}>
//                                                     <Text style={styles.groupTotalLabel}>Total:</Text>
//                                                     <Text style={styles.groupTotalValue}>
//                                                         {formatNumber(
//                                                             String(
//                                                                 allocations
//                                                                     .filter(a => !a.LastDate)
//                                                                     .reduce((sum, a) => sum + (parseFloat(a.AllocationQty) || 0), 0)
//                                                             )
//                                                         )} m
//                                                     </Text>
//                                                 </View>
//                                             </View>
//                                         )}

//                                         {/* ===== GROUP: UPDATED TODAY ===== */}
//                                         {allocations.filter(a => a.LastDate === getTodayDateStr()).length > 0 && (
//                                             <View style={styles.groupBlockToday}>
//                                                 <View style={styles.groupHeader}>
//                                                     <View style={[styles.groupDot, { backgroundColor: '#4CAF50' }]} />
//                                                     <Text style={styles.groupTitle}>Updated Today ({formatAllocDate(getTodayDateStr())})</Text>
//                                                     <Text style={styles.groupCount}>
//                                                         {allocations.filter(a => a.LastDate === getTodayDateStr()).length}
//                                                     </Text>
//                                                 </View>
//                                                 {allocations
//                                                     .map((a, idx) => ({ ...a, __idx: idx }))
//                                                     .filter(a => a.LastDate === getTodayDateStr())
//                                                     .map(item => (
//                                                         <View key={`today-${item.__idx}`} style={styles.allocRowCard}>
//                                                             <View style={{ flex: 1 }}>
//                                                                 <Text style={styles.allocRowName}>{item.ShdName?.trim()}</Text>
//                                                                 <Text style={styles.allocRowCode}>Code: {item.ShdCode}</Text>
//                                                             </View>
//                                                             <Text style={styles.allocRowQty}>
//                                                                 {formatNumber(String(item.AllocationQty))} m
//                                                             </Text>
//                                                             {!item.IsLocked && canEditAllocation() && (
//                                                                 <TouchableOpacity
//                                                                     onPress={() => handleRemoveAllocationRow(item.__idx)}
//                                                                     style={styles.allocRowRemoveBtn}
//                                                                 >
//                                                                     <Icon name="close" size={16} color="#E65100" />
//                                                                 </TouchableOpacity>
//                                                             )}
//                                                         </View>
//                                                     ))}
//                                                 <View style={styles.groupTotal}>
//                                                     <Text style={styles.groupTotalLabel}>Total:</Text>
//                                                     <Text style={styles.groupTotalValue}>
//                                                         {formatNumber(
//                                                             String(
//                                                                 allocations
//                                                                     .filter(a => a.LastDate === getTodayDateStr())
//                                                                     .reduce((sum, a) => sum + (parseFloat(a.AllocationQty) || 0), 0)
//                                                             )
//                                                         )} m
//                                                     </Text>
//                                                 </View>
//                                             </View>
//                                         )}

//                                         {/* ===== GROUP: PREVIOUS ALLOCATIONS (DATE-WISE) ===== */}
//                                         {(() => {
//                                             const today = getTodayDateStr();
//                                             const withIdx = allocations.map((a, idx) => ({ ...a, __idx: idx }));
//                                             const previous = withIdx.filter(a => a.LastDate && a.LastDate !== today);

//                                             if (previous.length === 0) return null;

//                                             const grouped = previous.reduce((acc, a) => {
//                                                 const date = a.LastDate;
//                                                 if (!acc[date]) acc[date] = [];
//                                                 acc[date].push(a);
//                                                 return acc;
//                                             }, {} as Record<string, any[]>);

//                                             // Sort dates (most recent first)
//                                             const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

//                                             return sortedDates.map(date => {
//                                                 const items = grouped[date];
//                                                 const totalQty = items.reduce((sum, a) => sum + parseFloat(a.AllocationQty || 0), 0);
//                                                 return (
//                                                     <View key={date} style={styles.groupBlockPrevious}>
//                                                         <View style={styles.groupHeader}>
//                                                             <View style={[styles.groupDot, { backgroundColor: '#9E9E9E' }]} />
//                                                             <Text style={styles.groupTitle}>Allocations – {formatAllocDate(date)}</Text>
//                                                             <Text style={styles.groupCount}>{items.length}</Text>
//                                                         </View>
//                                                         {items.map(item => (
//                                                             <View key={`prev-${date}-${item.__idx}`} style={styles.allocRowCard}>
//                                                                 <View style={{ flex: 1 }}>
//                                                                     <Text style={styles.allocRowName}>{item.ShdName?.trim()}</Text>
//                                                                     <Text style={styles.allocRowCode}>Code: {item.ShdCode}</Text>
//                                                                 </View>
//                                                                 <Text style={styles.allocRowQty}>
//                                                                     {formatNumber(String(item.AllocationQty))} m
//                                                                 </Text>
//                                                                 {!item.IsLocked && canEditAllocation() && (
//                                                                     <TouchableOpacity
//                                                                         onPress={() => handleRemoveAllocationRow(item.__idx)}
//                                                                         style={styles.allocRowRemoveBtn}
//                                                                     >
//                                                                         <Icon name="close" size={16} color="#E65100" />
//                                                                     </TouchableOpacity>
//                                                                 )}
//                                                             </View>
//                                                         ))}
//                                                         <View style={styles.groupTotal}>
//                                                             <Text style={styles.groupTotalLabel}>Total:</Text>
//                                                             <Text style={styles.groupTotalValue}>{formatNumber(String(totalQty))} m</Text>
//                                                         </View>
//                                                     </View>
//                                                 );
//                                             });
//                                         })()}

//                                         {allocations.length === 0 && (
//                                             <Text style={styles.jobChartEmptyText}>No allocation added yet.</Text>
//                                         )}

//                                         <View style={styles.jobChartTotalRow}>
//                                             <Text style={styles.jobChartTotalLabel}>TOTAL ALLOCATED</Text>
//                                             <Text style={styles.jobChartTotalValue}>
//                                                 {formatNumber(getJobChartTotal())} m
//                                             </Text>
//                                         </View>
//                                     </>
//                                 }
//                             />

//                             {/* BOTTOM ACTION AREA */}
//                             {canEditAllocation() && (
//                                 <View style={styles.jobChartBottomBar}>
//                                     <View style={styles.jobChartAddRow}>
//                                         <TouchableOpacity
//                                             style={[styles.searchInput, styles.shadeSelectBtn]}
//                                             onPress={openShadePicker}
//                                         >
//                                             <Text
//                                                 style={selectedShade ? styles.shadeSelectText : styles.shadeSelectPlaceholder}
//                                                 numberOfLines={1}
//                                             >
//                                                 {selectedShade ? selectedShade.Name : 'Tap to select shade'}
//                                             </Text>
//                                             <Icon name="search" size={18} color="#999" />
//                                         </TouchableOpacity>
//                                         <TextInput
//                                             ref={qtyInputRef}
//                                             style={[styles.searchInput, { width: 80, marginLeft: 8, marginBottom: 0 }]}
//                                             placeholder="Qty"
//                                             keyboardType="numeric"
//                                             value={addQty}
//                                             onChangeText={setAddQty}
//                                             returnKeyType="done"
//                                             onSubmitEditing={handleAddAllocationRow}
//                                         />
//                                         <TouchableOpacity style={styles.jobChartAddBtn} onPress={handleAddAllocationRow}>
//                                             <Icon name="add" size={20} color="#fff" />
//                                         </TouchableOpacity>
//                                     </View>

//                                     <TouchableOpacity
//                                         style={styles.jobChartSaveBtn}
//                                         onPress={handleSaveAllocations}
//                                         disabled={jobChartSaving}
//                                     >
//                                         {jobChartSaving ? (
//                                             <ActivityIndicator size="small" color="#fff" />
//                                         ) : (
//                                             <Text style={styles.jobChartSaveBtnText}>Save Allocation</Text>
//                                         )}
//                                     </TouchableOpacity>
//                                 </View>
//                             )}
//                         </>
//                     )}

//                     {/* SHADE PICKER — separate overlay above job chart, own keyboard space */}
//                     {shadePickerVisible && (
//                         <View style={styles.shadePickerOverlay}>
//                             <View style={styles.shadePickerSheet}>
//                                 <View style={styles.jobChartHandle} />
//                                 <View style={styles.jobChartHeaderRow}>
//                                     <Text style={styles.jobChartTitle}>Select Shade</Text>
//                                     <TouchableOpacity onPress={() => setShadePickerVisible(false)}>
//                                         <Icon name="close" size={22} color="#333" />
//                                     </TouchableOpacity>
//                                 </View>

//                                 <TextInput
//                                     style={styles.searchInput}
//                                     placeholder="Search shade..."
//                                     value={shadeQuery}
//                                     autoFocus
//                                     onChangeText={searchShades}
//                                 />

//                                 {shadeSearchLoading ? (
//                                     <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} style={{ marginTop: 10 }} />
//                                 ) : (
//                                     <FlatList
//                                         data={shadeResults}
//                                         keyExtractor={(s) => s.Code}
//                                         keyboardShouldPersistTaps="handled"
//                                         style={{ maxHeight: 320 }}
//                                         renderItem={({ item: s }) => {
//                                             const isUsed = allocations.some(a => String(a.ShdCode) === String(s.Code));
//                                             return (
//                                                 <TouchableOpacity
//                                                     style={[styles.shadePickerRow, isUsed && styles.shadePickerRowDisabled]}
//                                                     onPress={() => {
//                                                         if (isUsed) {
//                                                             Alert.alert('Already Allocated', 'This shade is already in the list.');
//                                                             return;
//                                                         }
//                                                         handleSelectShade(s);
//                                                     }}
//                                                 >
//                                                     <Text style={[styles.shadePickerRowText, isUsed && { color: '#bbb' }]}>
//                                                         {s.Name}
//                                                     </Text>
//                                                     {isUsed && <Text style={styles.shadePickerUsedTag}>Added</Text>}
//                                                 </TouchableOpacity>
//                                             );
//                                         }}
//                                         ListEmptyComponent={
//                                             <Text style={{ color: '#999', textAlign: 'center', marginTop: 20 }}>
//                                                 No shades found.
//                                             </Text>
//                                         }
//                                     />
//                                 )}
//                             </View>
//                         </View>
//                     )}
//                 </KeyboardAvoidingView>
//             )}
//         </>
//     );
// };

// const styles = StyleSheet.create({
//     listIconContainer: {
//         position: 'absolute',
//         top: 130,
//         right: 20,
//         zIndex: 1,
//         backgroundColor: theme.BRAND_GRADIENT_END,
//         borderRadius: 3,
//         padding: 4,
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
//     loadingIndicator: {
//         padding: 20,
//     },
//     listContent: {
//         paddingBottom: 20,
//     },
//     //
//     modalContainer: {
//         flex: 1,
//         padding: 20,
//         backgroundColor: '#f5f5f5',
//     },
//     modalHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 20,
//     },
//     modalTitle: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     summaryCard123: {
//         shadowOffset: { width: 0, height: 2 },
//     },
//     summaryCard: {
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
//     summaryRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginBottom: 6,
//     },
//     designCard: {
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
//     designHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginBottom: 8,
//     },
//     designSubheader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginBottom: 8,
//     },
//     designName: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     designCode: {
//         fontSize: 12,
//         color: '#666',
//     },
//     designNameSub: {
//         fontSize: 12,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     designCodeSub: {
//         fontSize: 12,
//         color: '#666',
//     },
//     partyNameInSummary: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#333',
//         marginBottom: 10,
//     },

//     searchInput: {
//         height: 40,
//         borderColor: '#ccc',
//         borderWidth: 1,
//         borderRadius: 8,
//         paddingHorizontal: 10,
//         marginBottom: 10,
//         backgroundColor: '#fff',
//         color: '#000',
//     },
//     designValues: {
//         marginTop: 8,
//     },
//     designValueRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginBottom: 6,
//     },
//     designValueItem: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     designValueLabel: {
//         fontSize: 12,
//         color: '#666',
//         marginRight: 4,
//     },
//     designValueText: {
//         fontSize: 12,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     partyDetailCard: {
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
//     partyDetailName: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#333',
//         marginBottom: 4,
//     },
//     partyDetailCode: {
//         fontSize: 14,
//         color: '#666',
//         marginBottom: 4,
//     },
//     partyDetailMeter: {
//         fontSize: 14,
//         color: '#333',
//         marginBottom: 4,
//     },
//     partyDetailStatus: {
//         fontSize: 14,
//         // color: item.status === 'CLOSED' ? '#4CAF50' : '#E65100',
//         fontWeight: 'bold',
//     },
//     // Empty State
//     emptyContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         padding: 20,
//     },
//     emptyText: {
//         fontSize: 16,
//         color: '#666',
//     },
//     detailOverlay: {
//         position: 'absolute',
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
//         zIndex: 100, // Higher than summary modal
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     detailOverlay123: {
//         position: 'absolute',
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
//         zIndex: 200, // Higher than summary modal
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     detailOverlay456: {
//         position: 'absolute',
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
//         zIndex: 300, // Higher than summary modal
//         justifyContent: 'center',
//         alignItems: 'center',
//     },

//     // Detail Container
//     detailContainer: {
//         backgroundColor: '#fff',
//         // padding: 20,
//         paddingTop: 45,
//         borderRadius: 10,
//         width: '100%',
//         height: '100%',
//         elevation: 5, // Shadow for Android
//         shadowColor: '#000', // Shadow for iOS
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.25,
//         shadowRadius: 4,
//     },
//     jobChartBtn: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         alignSelf: 'flex-end',
//         borderWidth: 1,
//         borderColor: theme.BRAND_GRADIENT_END,
//         borderRadius: 6,
//         paddingHorizontal: 8,
//         paddingVertical: 4,
//         marginBottom: 8,
//     },
//     jobChartBtnText: {
//         fontSize: 12,
//         fontWeight: '600',
//         marginLeft: 4,
//     },
//     jobChartOverlay: {
//         position: 'absolute',
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         backgroundColor: 'rgba(0,0,0,0.5)',
//         zIndex: 500,
//         justifyContent: 'flex-end',
//     },
//     jobChartSheet: {
//         backgroundColor: '#fff',
//         borderTopLeftRadius: 20,
//         borderTopRightRadius: 20,
//         padding: 16,
//         maxHeight: '85%',
//     },
//     jobChartHandle: {
//         width: 40,
//         height: 4,
//         backgroundColor: '#ddd',
//         borderRadius: 2,
//         alignSelf: 'center',
//         marginBottom: 10,
//     },
//     jobChartHeaderRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 12,
//     },
//     jobChartTitle: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     jobChartRefCard: {
//         borderWidth: 1,
//         borderColor: '#eee',
//         borderRadius: 10,
//         padding: 14,
//         marginBottom: 12,
//     },
//     jobChartRefRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginBottom: 10,
//     },
//     jobChartRefLabel: {
//         fontSize: 10,
//         color: '#999',
//         fontWeight: '600',
//     },
//     jobChartRefValue: {
//         fontSize: 15,
//         fontWeight: 'bold',
//         color: '#E65100',
//     },
//     jobChartSectionLabel: {
//         fontSize: 11,
//         color: '#999',
//         backgroundColor: '#f5f5f5',
//         padding: 6,
//         fontWeight: '600',
//         marginBottom: 6,
//     },
//     jobChartRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         paddingVertical: 8,
//         borderBottomWidth: 1,
//         borderBottomColor: '#f0f0f0',
//     },
//     jobChartRowLabel: {
//         fontSize: 13,
//         color: '#333',
//     },
//     jobChartRowValue: {
//         fontSize: 13,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     jobChartTotalRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginTop: 10,
//         paddingTop: 8,
//         borderTopWidth: 1,
//         borderTopColor: '#eee',
//     },
//     jobChartTotalLabel: {
//         fontSize: 12,
//         color: '#999',
//         fontWeight: '600',
//     },
//     jobChartTotalValue: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#E65100',
//     },
//     jobChartAddRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginTop: 10,
//         marginBottom: 8,
//     },
//     jobChartAddBtn: {
//         backgroundColor: theme.BRAND_GRADIENT_END,
//         width: 40,
//         height: 40,
//         borderRadius: 8,
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginLeft: 8,
//     },
//     shadeDropdown: {
//         position: 'absolute',
//         top: 42,
//         left: 0,
//         right: 0,
//         backgroundColor: '#fff',
//         borderWidth: 1,
//         borderColor: '#ddd',
//         borderRadius: 8,
//         maxHeight: 180,
//         zIndex: 999,
//         elevation: 5,
//     },
//     shadeDropdownItem: {
//         padding: 10,
//         borderBottomWidth: 1,
//         borderBottomColor: '#f0f0f0',
//     },
//     jobChartHint: {
//         fontSize: 11,
//         color: '#999',
//         textAlign: 'center',
//         marginVertical: 8,
//     },
//     jobChartCopyBtn: {
//         borderWidth: 1,
//         borderColor: '#ddd',
//         borderRadius: 8,
//         paddingVertical: 12,
//         alignItems: 'center',
//         marginBottom: 8,
//     },
//     jobChartCopyBtnText: {
//         color: '#333',
//         fontWeight: '600',
//     },
//     jobChartSaveBtn: {
//         backgroundColor: theme.BRAND_GRADIENT_END,
//         borderRadius: 8,
//         paddingVertical: 12,
//         alignItems: 'center',
//         marginBottom: 50,
//     },
//     jobChartSaveBtnText: {
//         color: '#fff',
//         fontWeight: 'bold',
//     },
//     // 
//     shadePickerOverlay: {
//         position: 'absolute',
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         backgroundColor: 'rgba(0,0,0,0.6)',
//         zIndex: 999, // higher than jobChartOverlay's 500, sits on top of job chart sheet
//         justifyContent: 'flex-end',
//         height: '100%',
//     },
//     shadePickerSheet: {
//         backgroundColor: '#fff',
//         borderTopLeftRadius: 20,
//         borderTopRightRadius: 20,
//         padding: 16,
//         maxHeight: '80%',
//         minHeight: '50%',
//     },
//     shadeSelectBtn: {
//         flex: 1,
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         marginBottom: 0,
//     },
//     shadeSelectText: {
//         color: '#333',
//         fontSize: 14,
//         flex: 1,
//         marginRight: 6,
//     },
//     shadeSelectPlaceholder: {
//         color: '#999',
//         fontSize: 14,
//         flex: 1,
//         marginRight: 6,
//     },
//     shadePickerRow: {
//         paddingVertical: 14,
//         paddingHorizontal: 4,
//         borderBottomWidth: 1,
//         borderBottomColor: '#f0f0f0',
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//     },
//     shadePickerRowText: {
//         fontSize: 15,
//         color: '#333',
//     },
//     // 
//     // ===== FULL SCREEN JOB CHART =====
//     jobChartFullOverlay: {
//         position: 'absolute',
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         backgroundColor: '#f5f5f5',
//         zIndex: 500,
//     },
//     jobChartFullHeader: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 12,
//         paddingBottom: 12,
//         paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 54,
//         backgroundColor: '#fff',
//         borderBottomWidth: 1,
//         borderBottomColor: '#eee',
//     },
//     jobChartBackBtn: {
//         marginRight: 10,
//         padding: 4,
//     },
//     jobChartFullTitle: {
//         fontSize: 17,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     jobChartFullSubtitle: {
//         fontSize: 12,
//         color: '#777',
//         marginTop: 2,
//     },
//     jobChartDateBadge: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: theme.BRAND_GRADIENT_END,
//         paddingHorizontal: 8,
//         paddingVertical: 5,
//         borderRadius: 6,
//     },
//     jobChartDateBadgeText: {
//         color: '#fff',
//         fontSize: 11,
//         fontWeight: '600',
//         marginLeft: 4,
//     },
//     jobChartProgressWrap: {
//         marginTop: 10,
//     },
//     jobChartProgressRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginTop: 4,
//     },
//     jobChartPendingValue: {
//         fontSize: 14,
//         fontWeight: 'bold',
//         color: '#E65100',
//     },
//     progressBarBg: {
//         height: 8,
//         backgroundColor: '#eee',
//         borderRadius: 4,
//         marginTop: 6,
//         overflow: 'hidden',
//     },
//     progressBarFill: {
//         height: 8,
//         borderRadius: 4,
//     },
//     jobChartAllocatedText: {
//         fontSize: 11,
//         color: '#666',
//     },
//     jobChartLockBanner: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: '#FFF3E0',
//         borderRadius: 8,
//         padding: 10,
//         marginBottom: 12,
//     },
//     jobChartLockBannerText: {
//         fontSize: 12,
//         color: '#E65100',
//         marginLeft: 6,
//         flex: 1,
//     },
//     allocGroupSection: {
//         marginBottom: 16,
//     },
//     allocGroupHeaderRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 8,
//     },
//     allocGroupDot: {
//         width: 8,
//         height: 8,
//         borderRadius: 4,
//         marginRight: 6,
//     },
//     allocGroupTitle: {
//         fontSize: 13,
//         fontWeight: 'bold',
//         color: '#333',
//         flex: 1,
//     },
//     allocGroupCount: {
//         fontSize: 11,
//         color: '#999',
//         backgroundColor: '#f0f0f0',
//         paddingHorizontal: 8,
//         paddingVertical: 2,
//         borderRadius: 10,
//         overflow: 'hidden',
//     },
//     allocRowCard: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: '#fff',
//         borderRadius: 8,
//         borderLeftWidth: 4,
//         padding: 12,
//         marginBottom: 8,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.06,
//         shadowRadius: 2,
//         elevation: 1,
//     },
//     allocRowName: {
//         fontSize: 14,
//         fontWeight: '600',
//         color: '#333',
//     },
//     allocRowCode: {
//         fontSize: 11,
//         color: '#888',
//         marginTop: 2,
//     },
//     allocRowQty: {
//         fontSize: 14,
//         fontWeight: 'bold',
//         color: '#333',
//         marginRight: 8,
//     },
//     allocRowRemoveBtn: {
//         padding: 4,
//     },
//     jobChartEmptyText: {
//         color: '#999',
//         textAlign: 'center',
//         paddingVertical: 20,
//     },
//     jobChartBottomBar: {
//         backgroundColor: '#fff',
//         borderTopWidth: 1,
//         borderTopColor: '#eee',
//         padding: 12,
//         paddingBottom: Platform.OS === 'ios' ? 24 : 12,
//     },
//     shadePickerRowDisabled: {
//         opacity: 0.5,
//     },
//     shadePickerUsedTag: {
//         fontSize: 10,
//         color: '#4CAF50',
//         fontWeight: 'bold',
//     },
//     // Group block containers
//     groupBlockNew: {
//         backgroundColor: '#E3F2FD',
//         borderRadius: 12,
//         padding: 12,
//         marginBottom: 16,
//     },
//     groupBlockToday: {
//         backgroundColor: '#E8F5E9',
//         borderRadius: 12,
//         padding: 12,
//         marginBottom: 16,
//     },
//     groupBlockPrevious: {
//         backgroundColor: '#F5F5F5',
//         borderRadius: 12,
//         padding: 12,
//         marginBottom: 16,
//     },
//     groupHeader: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 10,
//     },
//     groupDot: {
//         width: 10,
//         height: 10,
//         borderRadius: 5,
//         marginRight: 8,
//     },
//     groupTitle: {
//         fontSize: 14,
//         fontWeight: 'bold',
//         color: '#333',
//         flex: 1,
//     },
//     groupCount: {
//         fontSize: 12,
//         color: '#666',
//         backgroundColor: 'rgba(0,0,0,0.08)',
//         paddingHorizontal: 8,
//         paddingVertical: 2,
//         borderRadius: 12,
//     },
//     groupTotal: {
//         flexDirection: 'row',
//         justifyContent: 'flex-end',
//         marginTop: 8,
//         paddingTop: 6,
//         borderTopWidth: 1,
//         borderTopColor: 'rgba(0,0,0,0.1)',
//     },
//     groupTotalLabel: {
//         fontSize: 12,
//         color: '#666',
//         marginRight: 6,
//     },
//     groupTotalValue: {
//         fontSize: 13,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     // Update allocRowCard to remove left border (now handled by group blocks)
//     allocRowCard: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: '#fff',
//         borderRadius: 8,
//         padding: 12,
//         marginBottom: 6,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.06,
//         shadowRadius: 2,
//         elevation: 1,
//     },
// });

// export default React.memo(SalesOrderTracking);
import { crlimtreq_styles } from '@/common/Style';
import FullScreenLoader from '@/components/FullScreenLoader';
import HeaderBar from '@/components/Header';
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import Clipboard from '@react-native-clipboard/clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  Pressable,
  ScrollView,
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

// -----------------------------------------------------------------------------
// Job Chart dependencies are intentionally kept inside this screen.
// This file does not depend on the separate Job Chart feature/component files.
// -----------------------------------------------------------------------------
const responsiveFontSize = (size: number) => {
  const scale = Math.min(Math.max(Dimensions.get('window').width / 390, 0.85), 1.18);
  return Math.round(size * scale);
};
const responsiveLineHeight = (size: number) => Math.round(size * 1.35);

const ResponsiveText = (props: React.ComponentProps<typeof Text>) => <Text {...props} />;
const AppShell = ({ children, style, ...props }: any) => (
  <View style={[{ flex: 1 }, style]} {...props}>{children}</View>
);
const Section = ({ children, style, ...props }: any) => (
  <View style={style} {...props}>{children}</View>
);

const useResponsive = () => {
  const [size, setSize] = useState(() => Dimensions.get('window'));
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setSize(window));
    return () => sub?.remove?.();
  }, []);
  return {
    isMobile: size.width < 600,
    isTablet: size.width >= 600 && size.width < 1024,
    isDesktop: size.width >= 1024,
    width: size.width,
    height: size.height,
  };
};

const useTheme = () => ({ theme });

const useToast = () => ({
  showApiError: (error: any, fallback = 'Something went wrong.') => {
    console.error(fallback, error);
    const message = error?.response?.data?.message || error?.message || fallback;
    Alert.alert('Error', String(message));
  },
  showInfo: (message: string, title = 'Info') => Alert.alert(title, message),
  showSuccess: (message: string, title = 'Success') => Alert.alert(title, message),
  showWarning: (message: string, title = 'Warning') => Alert.alert(title, message),
});

type ApcChart = {
  Id: number;
  ChartName: string;
  [key: string]: any;
};

const getJobChartToken = async (preferredToken?: string) => {
  if (preferredToken) return String(preferredToken).replace(/^Bearer\s+/i, '');
  const keys = ['token', 'access_token', 'authToken', 'userToken'];
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value) return value.replace(/^Bearer\s+/i, '');
  }
  return '';
};

const jobChartHeaders = async (preferredToken?: string) => ({
  Authorization: `Bearer ${await getJobChartToken(preferredToken)}`,
  'Content-Type': 'application/json',
  'X-Requested-with': 'XMLHttpRequest',
});

const unwrapJobChartResponse = (response: any) =>
  response?.response?.data ?? response?.data?.data ?? response?.data ?? response;

async function getSalesOrderAllocationBrowse(payload: Record<string, any>, preferredToken?: string) {
  const headers = await jobChartHeaders(preferredToken);
  //   console.log('so brow payload', payload);
  return axios.get(`${API}/api/soallocationbrowse`, { params: payload, headers });
}

async function lookupAllocation(payload: Record<string, any>, preferredToken?: string) {
  const headers = await jobChartHeaders(preferredToken);
  return axios.get(`${API}/api/so-allocation/lookup`, { params: payload, headers });
}

async function syncAllocation(payload: Record<string, any>, preferredToken?: string) {
  const headers = await jobChartHeaders(preferredToken);
  const response = await axios.post(`${API}/api/so-allocation/sync`, payload, { headers });
  return unwrapJobChartResponse(response);
}

async function getApcChartMaster(payload: Record<string, any>, preferredToken?: string) {
  const headers = await jobChartHeaders(preferredToken);
  // Exact reference API contract: POST /apc-chart-master/browse.
  return unwrapJobChartResponse(
    await axios.post(`${API}/api/apc-chart-master/browse`, payload, { headers }),
  );
}


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
    trackingPayload?: Record<string, any>;
    isAllocation?: boolean;
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

  // Integrated Job Chart: stays in this screen; no navigation/route change.
  // exactTrackingPayload is the exact payload that loaded the selected
  // sub-design details, so allocation browse/sync can preserve its context.
  const openJobChart = async (item: any, exactTrackingPayload?: any) => {
    const orderUId = String(item?.suid ?? item?.uid ?? '').trim();
    const srno = String(item?.OrderSrNo ?? item?.SrNo ?? item?.srno ?? '').trim();

    if (!orderUId) {
      Alert.alert('Error', 'Order reference (UId) not found on this item.');
      return;
    }
    if (!srno) {
      Alert.alert('Error', 'Sales-order detail SrNo not found on this item.');
      return;
    }

    const trackingContext = exactTrackingPayload && typeof exactTrackingPayload === 'object'
      ? exactTrackingPayload
      : {
        fromdate: '',
        deldate: formatDate(delDate),
        todate: '',
        yearno: selectedYear ? selectedYear.split('-')[1].substring(2) : '',
        sexes: Array.isArray(selectedSalesExes) ? selectedSalesExes.map((x: any) => x?.sexe).filter(Boolean) : [],
        type: selectedItemStatus === 'Open' ? 'open' : selectedItemStatus === 'Closed' ? 'closed' : 'all',
        wise: selectedItemStatus1 === 'Party Wise' ? 'party' : 'design',
        dsncodes: item?.dsncode ? [String(item.dsncode)] : [],
        itemcodes: Array.isArray(getMainPayload?.itemcodes) ? getMainPayload.itemcodes : [],
        parties: item?.parcode ? [String(item.parcode)] : [],
        prptype: 'S',
        txntype: 'prodorderlist',
      };

    setJobChartRef({
      orderUId,
      uid: orderUId,
      itmCode: String(item?.itmcode ?? '').trim(),
      dsnCode: String(item?.dsncode ?? item?.mdsncode ?? '').trim(),
      dsnName: String(item?.Dsnname ?? item?.mdesignname ?? '').trim(),
      prpcode: String(item?.prpcode ?? trackingContext?.prpcode ?? 'SIP').trim(),
      strcode: String(item?.strcode ?? trackingContext?.strcode ?? '').trim(),
      yearno: String(item?.yearno ?? trackingContext?.yearno ?? (selectedYear ? selectedYear.split('-')[1].substring(2) : '')).trim(),
      srno,
      grdcode: String(item?.grdcode ?? '1'),
      grdname: String(item?.GrdName ?? item?.grdname ?? '1st'),
      sono: String(item?.sono ?? '').trim(),
      status: String(item?.status ?? 'OPEN').toUpperCase().trim(),
      pendingMeter: Number(item?.pending ?? 0) || 0,
      shdcode: String(item?.Shdcode ?? item?.shdcode ?? '').trim(),
      apccode: String(item?.apccode ?? '').trim(),
      isAllocation: ['1', 'true'].includes(String(item?.isallocated ?? item?.isAllocated ?? '0').trim().toLowerCase()),
      trackingPayload: trackingContext,
    });

    setAllocations([]);
    setSelectedShade(null);
    setAddQty('');
    setShadeQuery('');
    setShadeResults([]);
    setJobChartVisible(true);
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
      // const response =
      // {
      //     "data": {
      //         "designdetails": [
      //             {
      //                 "suid": "630011134",
      //                 "srno": "0",
      //                 "parcode": "22790",
      //                 "partyname": "KHAZANA SYNTEX",
      //                 "sono": "00037",
      //                 "sodate": "06/07/2026",
      //                 "Dsnname": "RIP STOP-145",
      //                 "dsncode": "32752",
      //                 "mdsncode": "32752",
      //                 "mdesignname": "RIP STOP-145",
      //                 "prpcode": "SIP",
      //                 "strcode": "012",
      //                 "itmcode": "901644",
      //                 "grdcode": "0",
      //                 "totmtr": "12000.000",
      //                 "totamt": "1128000",
      //                 "chalqty": "11207.000",
      //                 "chalamt": "1053458",
      //                 "pending": "793.000",
      //                 "pendingamt": "74542",
      //                 "Shdcode": "0",
      //                 "isallocated": "0",
      //                 "allocatedqty": ".000",
      //                 "remainingallocatedqty": "12000.000",
      //                 "status": "PARTIAL",
      //                 "apccode": "46041",
      //                 "duedate": "21/07/2026"
      //             },
      //             {
      //                 "suid": "630011142",
      //                 "srno": "0",
      //                 "parcode": "22790",
      //                 "partyname": "KHAZANA SYNTEX",
      //                 "sono": "00040",
      //                 "sodate": "06/07/2026",
      //                 "Dsnname": "RIP STOP-145",
      //                 "dsncode": "32752",
      //                 "mdsncode": "32752",
      //                 "mdesignname": "RIP STOP-145",
      //                 "prpcode": "SIP",
      //                 "strcode": "012",
      //                 "itmcode": "901644",
      //                 "grdcode": "0",
      //                 "totmtr": "9600.000",
      //                 "totamt": "902400",
      //                 "chalqty": "9245.000",
      //                 "chalamt": "869030",
      //                 "pending": "58.000",
      //                 "pendingamt": "5452",
      //                 "Shdcode": "0",
      //                 "isallocated": "0",
      //                 "allocatedqty": ".000",
      //                 "remainingallocatedqty": "9600.000",
      //                 "status": "PARTIAL",
      //                 "apccode": "46041",
      //                 "duedate": "26/07/2026"
      //             },
      //             {
      //                 "suid": "630014429",
      //                 "srno": "0",
      //                 "parcode": "22790",
      //                 "partyname": "KHAZANA SYNTEX",
      //                 "sono": "00045",
      //                 "sodate": "07/08/2026",
      //                 "Dsnname": "RIP STOP-145",
      //                 "dsncode": "32752",
      //                 "mdsncode": "32752",
      //                 "mdesignname": "RIP STOP-145",
      //                 "prpcode": "SIP",
      //                 "strcode": "012",
      //                 "itmcode": "901644",
      //                 "grdcode": "0",
      //                 "totmtr": "12000.000",
      //                 "totamt": "1128000",
      //                 "chalqty": "11508.000",
      //                 "chalamt": "1081752",
      //                 "pending": "492.000",
      //                 "pendingamt": "46248",
      //                 "Shdcode": "0",
      //                 "isallocated": "0",
      //                 "allocatedqty": ".000",
      //                 "remainingallocatedqty": "12000.000",
      //                 "status": "PARTIAL",
      //                 "apccode": "46041",
      //                 "duedate": "31/08/2026"
      //             },
      //             {
      //                 "suid": "630011793",
      //                 "srno": "0",
      //                 "parcode": "22790",
      //                 "partyname": "KHAZANA SYNTEX",
      //                 "sono": "00088",
      //                 "sodate": "13/07/2026",
      //                 "Dsnname": "RIP STOP-145",
      //                 "dsncode": "32752",
      //                 "mdsncode": "32752",
      //                 "mdesignname": "RIP STOP-145",
      //                 "prpcode": "SIP",
      //                 "strcode": "012",
      //                 "itmcode": "901644",
      //                 "grdcode": "0",
      //                 "totmtr": "12000.000",
      //                 "totamt": "1128000",
      //                 "chalqty": "11470.000",
      //                 "chalamt": "1078180",
      //                 "pending": "530.000",
      //                 "pendingamt": "49820",
      //                 "Shdcode": "0",
      //                 "isallocated": "0",
      //                 "allocatedqty": ".000",
      //                 "remainingallocatedqty": "12000.000",
      //                 "status": "PARTIAL",
      //                 "apccode": "46041",
      //                 "duedate": "30/07/2026"
      //             },
      //             {
      //                 "suid": "630016102",
      //                 "srno": "0",
      //                 "parcode": "22790",
      //                 "partyname": "KHAZANA SYNTEX",
      //                 "sono": "00148",
      //                 "sodate": "22/08/2026",
      //                 "Dsnname": "RIP STOP-145",
      //                 "dsncode": "32752",
      //                 "mdsncode": "32752",
      //                 "mdesignname": "RIP STOP-145",
      //                 "prpcode": "SIP",
      //                 "strcode": "012",
      //                 "itmcode": "901644",
      //                 "grdcode": "0",
      //                 "totmtr": "13000.000",
      //                 "totamt": "1235000",
      //                 "chalqty": "4401.000",
      //                 "chalamt": "418095",
      //                 "pending": "8599.000",
      //                 "pendingamt": "816905",
      //                 "Shdcode": "0",
      //                 "isallocated": "0",
      //                 "allocatedqty": ".000",
      //                 "remainingallocatedqty": "13000.000",
      //                 "status": "PARTIAL",
      //                 "apccode": "46041",
      //                 "duedate": "31/08/2026"
      //             },
      //             {
      //                 "suid": "630016262",
      //                 "srno": "1",
      //                 "parcode": "22790",
      //                 "partyname": "KHAZANA SYNTEX",
      //                 "sono": "00165",
      //                 "sodate": "23/08/2026",
      //                 "Dsnname": "RIP STOP-145",
      //                 "dsncode": "32752",
      //                 "mdsncode": "32752",
      //                 "mdesignname": "RIP STOP-145",
      //                 "prpcode": "SIP",
      //                 "strcode": "012",
      //                 "itmcode": "901644",
      //                 "grdcode": "0",
      //                 "totmtr": "19200.000",
      //                 "totamt": "1824000",
      //                 "chalqty": ".000",
      //                 "chalamt": "0",
      //                 "pending": "19200.000",
      //                 "pendingamt": "1824000",
      //                 "Shdcode": "46041",
      //                 "isallocated": "1",
      //                 "allocatedqty": "19200.000",
      //                 "remainingallocatedqty": ".000",
      //                 "status": "PENDING",
      //                 "apccode": "46041",
      //                 "duedate": "31/08/2026"
      //             },
      //             {
      //                 "suid": "630013422",
      //                 "srno": "0",
      //                 "parcode": "22790",
      //                 "partyname": "KHAZANA SYNTEX",
      //                 "sono": "00205",
      //                 "sodate": "28/07/2026",
      //                 "Dsnname": "RIP STOP-145",
      //                 "dsncode": "32752",
      //                 "mdsncode": "32752",
      //                 "mdesignname": "RIP STOP-145",
      //                 "prpcode": "SIP",
      //                 "strcode": "012",
      //                 "itmcode": "901644",
      //                 "grdcode": "0",
      //                 "totmtr": "7200.000",
      //                 "totamt": "676800",
      //                 "chalqty": "6770.000",
      //                 "chalamt": "636380",
      //                 "pending": "1200.000",
      //                 "pendingamt": "112800",
      //                 "Shdcode": "0",
      //                 "isallocated": "0",
      //                 "allocatedqty": ".000",
      //                 "remainingallocatedqty": "7200.000",
      //                 "status": "PARTIAL",
      //                 "apccode": "46041",
      //                 "duedate": "12/08/2026"
      //             },
      //             {
      //                 "suid": "630013474",
      //                 "srno": "1",
      //                 "parcode": "22790",
      //                 "partyname": "KHAZANA SYNTEX",
      //                 "sono": "00216",
      //                 "sodate": "28/07/2026",
      //                 "Dsnname": "RIP STOP-145",
      //                 "dsncode": "32752",
      //                 "mdsncode": "32752",
      //                 "mdesignname": "RIP STOP-145",
      //                 "prpcode": "SIP",
      //                 "strcode": "012",
      //                 "itmcode": "901644",
      //                 "grdcode": "0",
      //                 "totmtr": "63800.000",
      //                 "totamt": "5997200",
      //                 "chalqty": "10788.000",
      //                 "chalamt": "1014072",
      //                 "pending": "53012.000",
      //                 "pendingamt": "4983128",
      //                 "Shdcode": "46041",
      //                 "isallocated": "1",
      //                 "allocatedqty": "20200.000",
      //                 "remainingallocatedqty": "43600.000",
      //                 "status": "PARTIAL",
      //                 "apccode": "46041",
      //                 "duedate": "12/08/2026"
      //             }
      //         ],
      //         "design_summary": [
      //             {
      //                 "totmtr": "148800.000",
      //                 "totamt": "14019400",
      //                 "chalqty": "65389.000",
      //                 "chalamt": "6150967",
      //                 "pending": "83884.000",
      //                 "pendingamt": "7912895",
      //                 "linebar": "43.94"
      //             }
      //         ],
      //         "shdcode": "46041"
      //     },
      //     "success": true,
      //     "message": "Data loaded successfully."
      // }
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
                                                openJobChart(item, selectedPartyDetails?.payload);
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
                    {/* <View style={styles.designSubheader}>
                                            <Text style={styles.designNameSub}>Shade: {item.shdname} ({item.shdcode})</Text>
                                        </View> */}

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
                      <View style={[styles.valueRow, { marginTop: 8 }]}>
                        <View style={[styles.valueItem, { flex: 1 }]}>
                          <Text style={styles.valueLabel}>Allocation:</Text>
                          <TouchableOpacity
                            style={[
                              styles.allocationPendingPill,
                              {
                                backgroundColor: isSubDesignAllocated(item) ? '#FFF3E0' : '#F3F4F6',
                                borderColor: isSubDesignAllocated(item) ? '#F59E0B' : '#9CA3AF',
                              },
                            ]}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              openJobChart(item, selectedPartyDetails?.payload);
                            }}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Open Job Chart"
                          >
                            <Text
                              style={[
                                styles.allocationPendingText,
                                { color: isSubDesignAllocated(item) ? '#F59E0B' : '#6B7280' },
                              ]}
                              numberOfLines={1}
                            >
                              {subDesignAllocationPendingText(item)}
                            </Text>
                            <Icon
                              name="arrow-forward"
                              size={12}
                              color={isSubDesignAllocated(item) ? '#F59E0B' : '#6B7280'}
                            />
                          </TouchableOpacity>
                        </View>
                        {/* <View style={styles.valueItem}>
                                                    <Text style={styles.valueLabel}>APC Code:</Text>
                                                    <Text style={[styles.valueText, { color: theme.BRAND_GRADIENT_END, fontWeight: '800' }]}>
                                                        {String(item?.apccode ?? item?.apcCode ?? '—').trim() || '—'}
                                                    </Text>
                                                </View> */}
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
                              },
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
                                },
                              ]}
                            >
                              {item.status}
                            </Text>
                          </View>
                        </View>
                      </View>
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

      {/* INTEGRATED JOB CHART — same screen, no route change */}
      {jobChartVisible && jobChartRef && (
        <View style={styles.jobChartFullOverlay}>
          <IntegratedJobChart
            token={token}
            refData={jobChartRef}
            trackingPayload={jobChartRef.trackingPayload || selectedPartyDetails?.payload || {}}
            onClose={() => {
              setJobChartVisible(false);
              setJobChartRef(null);
            }}
          />
        </View>
      )}
    </>
  );
};


const n = (value: any) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : '0';
};

const allocationDisplayQty = (value: any) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return number.toLocaleString('en-IN', { maximumFractionDigits: 3 });
};

const numberValue = (value: any) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const integerInput = (value: string) => value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
const parseWholeNumber = (value: any) => {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) return 0;
  return Number(raw);
};

const formatDate = (value: any) => {
  const raw = String(value ?? '').trim();
  if (!/^\d{8}$/.test(raw)) return raw || '—';
  return `${raw.slice(6, 8)}-${raw.slice(4, 6)}-${raw.slice(0, 4)}`;
};

const normalizeDate = (value: any) => {
  const raw = String(value ?? '').trim();
  return /^\d{8}$/.test(raw) ? raw : '';
};

type Shade = {
  Code: string;
  Name: string;
  Color?: string;
  color?: string;
  ShadeColor?: string;
  shadecolor?: string;
};
type BrowseShade = {
  ShdCode?: string;
  ShdName: string;
  AllocationQty: string | number;
};
type BrowseRow = {
  ChartNo?: string;
  LastDate?: string;
  qty?: string | number;
  shades: BrowseShade[];
  ApcChartId?: number;
  ApcChartName?: string;
};
type EditorShade = Shade & { qty: string };
type EditorMode = 'create' | 'edit' | null;

const shadeCodeFromName = (name: string) => {
  const value = String(name || '').trim();
  const match = value.match(/^\(([^)]+)\)/);
  return match?.[1]?.trim() || value;
};

const normalizeShadeName = (value: any) => String(value ?? '').trim().toUpperCase();

function parseLegacyShadeAllocation(value: any, totalQty: any): BrowseShade[] {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  const parts = raw.split(/\s*(?:,|\||\n)\s*/).filter(Boolean);
  const fallbackQty = String(parseWholeNumber(totalQty) || 0);
  return parts.map((part) => {
    const match = part.match(/^(.+?)\s*:\s*([\d.]+)\s*$/);
    return {
      ShdName: (match?.[1] || part).trim(),
      AllocationQty: match?.[2] || fallbackQty,
    };
  });
}

function groupAllocationDetails(rows: any[]): BrowseRow[] {
  const grouped = new Map<string, BrowseRow>();

  rows.forEach((rawRow) => {
    const chartNo = String(rawRow?.ChartNo ?? rawRow?.chartno ?? '').trim();
    const date = normalizeDate(rawRow?.LastDate) || String(rawRow?.LastDate ?? '').trim();
    if (!date && !chartNo) return;

    // APC chart link: the browse API returns the linked APC chart's id/name
    // (various casings), or nothing at all if this allocation isn't linked
    // to any APC chart — in which case we treat it as 0 (no chart selected).
    const apcChartId = parseWholeNumber(
      rawRow?.ApcChartId ?? rawRow?.APCChartId ?? rawRow?.apcchartid ?? rawRow?.ApcChartID ?? rawRow?.apcChartId ?? 0,
    );
    const apcChartName = String(
      rawRow?.ApcChartName ?? rawRow?.APCChartName ?? rawRow?.apcchartname ?? rawRow?.apcChartName ?? '',
    ).trim();

    let shades: BrowseShade[] = [];
    if (String(rawRow?.ShdName ?? '').trim()) {
      shades = [{
        ShdCode: String(rawRow?.ShdCode ?? rawRow?.shdcode ?? rawRow?.ShadeCode ?? '').trim(),
        ShdName: String(rawRow.ShdName).trim(),
        AllocationQty: rawRow?.AllocationQty ?? 0,
      }];
    } else if (String(rawRow?.ShadeAllocation ?? '').trim()) {
      shades = parseLegacyShadeAllocation(rawRow.ShadeAllocation, rawRow?.qty);
    }

    const groupKey = chartNo || `DATE:${date}`;
    const current = grouped.get(groupKey) || {
      ChartNo: chartNo,
      LastDate: date,
      qty: 0,
      shades: [],
      ApcChartId: 0,
      ApcChartName: '',
    };

    if (!current.ChartNo && chartNo) current.ChartNo = chartNo;
    if (!current.LastDate && date) current.LastDate = date;
    if (!current.ApcChartId && apcChartId) current.ApcChartId = apcChartId;
    if (!current.ApcChartName && apcChartName) current.ApcChartName = apcChartName;

    shades.forEach((shade) => {
      const name = String(shade.ShdName ?? '').trim();
      if (!name) return;

      const existing = current.shades.find(
        (item) => normalizeShadeName(item.ShdName) === normalizeShadeName(name),
      );

      if (existing) {
        existing.AllocationQty =
          numberValue(existing.AllocationQty) + numberValue(shade.AllocationQty);

        const incomingCode = String(shade.ShdCode ?? '').trim();
        if (incomingCode) {
          existing.ShdCode = incomingCode;
        }
      } else {
        current.shades.push({
          ...shade,
          ShdCode: String(shade.ShdCode ?? '').trim(),
          ShdName: name,
        });
      }
    });

    current.qty = current.shades.reduce(
      (sum, shade) => sum + numberValue(shade.AllocationQty),
      0,
    );
    grouped.set(groupKey, current);
  });

  return Array.from(grouped.values()).sort((a, b) => {
    const dateCompare = normalizeDate(a.LastDate).localeCompare(normalizeDate(b.LastDate));
    if (dateCompare !== 0) return dateCompare;
    return String(a.ChartNo || '').localeCompare(String(b.ChartNo || ''));
  });
}

function rowToEditorShades(row: BrowseRow): EditorShade[] {
  return (row.shades || [])
    .filter((shade) => String(shade?.ShdName ?? '').trim())
    .map((shade) => {
      const name = String(shade.ShdName).trim();
      return {
        Code: String(shade.ShdCode ?? '').trim(),
        Name: name,
        qty: String(Math.round(numberValue(shade.AllocationQty))),
      };
    });
}
type IntegratedJobChartProps = {
  token?: string;
  refData: Record<string, any>;
  trackingPayload: Record<string, any>;
  onClose: () => void;
};

const isSubDesignAllocated = (item: any) => {
  const value = item?.isallocated ?? item?.isAllocated ?? item?.IsAllocated;
  return value === 1 || value === true || String(value ?? '').trim() === '1' || String(value ?? '').trim().toLowerCase() === 'true';
};

const subDesignAllocationPendingText = (item: any) => {
  if (!isSubDesignAllocated(item)) return 'View Job Chart';
  const value = Number(item?.remainingallocatedqty ?? item?.remainingAllocatedQty ?? item?.allocationpending ?? item?.allocationPending ?? 0);
  return Number.isFinite(value) ? value.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : '0';
};

const alphaColor = (color: string, alpha: number) => {
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
  }
  return color;
};

function IntegratedJobChart({ token, refData, trackingPayload, onClose }: IntegratedJobChartProps) {
  const { theme: baseTheme } = useTheme();
  // SalesOrderTracking uses the legacy theme shape, while the reference Job
  // Chart uses theme.colors.*. Normalize it locally so the integrated chart
  // never crashes when legacy theme.colors is unavailable.
  const theme = useMemo(() => {
    const legacy: any = baseTheme || {};
    const colors = legacy.colors || {};
    return {
      ...legacy,
      colors: {
        surface: colors.surface || legacy.surface || '#FFFFFF',
        background: colors.background || legacy.background || '#FFFFFF',
        backgroundSoft: colors.backgroundSoft || '#F7F7F7',
        border: colors.border || '#D9DDE3',
        text: colors.text || '#20242A',
        textMuted: colors.textMuted || '#68707D',
        textDim: colors.textDim || '#98A0AA',
        success: colors.success || '#2E7D32',
        warning: colors.warning || '#F59E0B',
        danger: colors.danger || '#D32F2F',
        common: colors.common || legacy.BRAND_GRADIENT_END || '#68707D',
        redBright: colors.redBright || legacy.BRAND_GRADIENT_END || '#D32F2F',
      },
    };
  }, [baseTheme]);
  const { isMobile, isTablet } = useResponsive();
  const { showApiError, showWarning } = useToast();
  const ref = useMemo(() => ({
    uid: String(refData?.uid || refData?.suid || refData?.orderUId || '').trim(),
    srno: String(refData?.srno || '').trim(),
    prpcode: String(refData?.prpcode || '').trim(),
    strcode: String(refData?.strcode || '').trim(),
    yearno: String(refData?.yearno || '').trim(),
    itmCode: String(refData?.itmCode || '').trim(),
    dsnCode: String(refData?.dsnCode || '').trim(),
    dsnName: String(refData?.dsnName || '').trim(),
    sono: String(refData?.sono || '').trim(),
    status: String(refData?.status || 'OPEN').trim().toUpperCase(),
    shdcode: String(refData?.shdcode || '').trim(),
    apccode: String(refData?.apccode || '').trim(),
    prptype: String(refData?.prptype || '').trim(),
    isAllocation: ['1', 'true'].includes(String(refData?.isAllocation ?? refData?.isAllocated ?? '0').trim().toLowerCase()),
  }), [refData]);

  const [summary, setSummary] = useState<any>({});
  const [details, setDetails] = useState<BrowseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editorChartQty, setEditorChartQty] = useState('');
  const [editorShadeCount, setEditorShadeCount] = useState('');
  const [editorShades, setEditorShades] = useState<EditorShade[]>([]);
  const [editorChartNo, setEditorChartNo] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
  });

  const [shadePickerVisible, setShadePickerVisible] = useState(false);
  const [shadeQuery, setShadeQuery] = useState('');
  const [shadeResults, setShadeResults] = useState<Shade[]>([]);
  const [shadeLoading, setShadeLoading] = useState(false);
  const shadeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingShadeIndex, setEditingShadeIndex] = useState<number | null>(null);

  const [apcCharts, setApcCharts] = useState<ApcChart[]>([]);
  const [apcChartsLoading, setApcChartsLoading] = useState(false);
  const [selectedApcChartId, setSelectedApcChartId] = useState<number | null>(null);
  const [apcChartPickerVisible, setApcChartPickerVisible] = useState(false);

  const [apcReplaceDialog, setApcReplaceDialog] = useState<{
    visible: boolean;
    chart: ApcChart | null;
    conflictingShades: EditorShade[];
  }>({
    visible: false,
    chart: null,
    conflictingShades: [],
  });

  const authorizedQty = numberValue(summary?.authorizedqty);
  const pendingQty = ref.isAllocation
    ? numberValue(summary?.pendingapcqty)
    : numberValue(summary?.pendingqty);
  const pendingQty123 = numberValue(summary?.pendingqty);
  const apcpendingQty = numberValue(summary?.pendingapcqty);
  const challanQty = numberValue(summary?.chalqty);

  const prpType = String(ref.prptype || trackingPayload?.prptype || trackingPayload?.PrpType || '');

  const sortedDetails = useMemo(() => {
    return details
      .map((row, index) => ({ ...row, __sourceIndex: index }))
      .sort((a, b) => normalizeDate(a.LastDate).localeCompare(normalizeDate(b.LastDate)));
  }, [details]);

  const loadBrowse = async () => {
    if (!ref.uid || !ref.srno || !ref.prpcode || !ref.strcode || !ref.yearno) {
      setLoading(false);
      showWarning('Job Chart reference is incomplete. UID, SrNo, property, store and year are required.', 'Job Chart');
      return;
    }

    setLoading(true);
    try {
      const browsePayload = {
        ...trackingPayload,
        uid: ref.uid,
        srno: ref.srno,
        prpcode: ref.prpcode,
        strcode: ref.strcode,
        yearno: ref.yearno,
        ShdCode: ref.shdcode,
      };

      const response = await getSalesOrderAllocationBrowse(browsePayload, token);
      console.log('so brow res', response);
      const body = response?.response?.data ?? response?.data ?? response ?? {};
      const payload = body?.data && typeof body.data === 'object' && !Array.isArray(body.data)
        ? body.data
        : body;
      const rawDetails = Array.isArray(payload?.AllocationDetails) ? payload.AllocationDetails : [];
      const nextDetails = groupAllocationDetails(rawDetails);
      const nextSummary = Array.isArray(payload?.summary) ? payload.summary[0] || {} : payload?.summary || {};

      setSummary(nextSummary || {});
      setDetails(nextDetails);
    } catch (error) {
      setSummary({});
      setDetails([]);
      showApiError(error, 'Unable to load job chart allocation browse.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadBrowse();
      return () => {
        if (shadeDebounce.current) clearTimeout(shadeDebounce.current);
      };
    }, [ref.uid, ref.srno, ref.prpcode, ref.strcode, ref.yearno, trackingPayload]),
  );

  const loadApcCharts = async () => {
    setApcChartsLoading(true);
    try {
      const data = await getApcChartMaster({ prptype: prpType || '', yearno: ref.yearno || '' }, token);
      setApcCharts(Array.isArray(data?.charts) ? data.charts : []);
    } catch (error) {
      setApcCharts([]);
      showApiError(error, 'Unable to load APC charts.');
    } finally {
      setApcChartsLoading(false);
    }
  };

  const openCreate = () => {
    if (!ref.isAllocation) return;
    setEditingIndex(null);
    setEditorMode('create');
    setEditorChartNo('');
    setEditorChartQty('');
    setEditorShadeCount('');
    setEditorShades([]);
    setEditorDirty(false);
    setSelectedApcChartId(null);
    void loadApcCharts();
  };

  const openEdit = (row: BrowseRow, index: number) => {
    if (!ref.isAllocation) return;

    const chartNo = String(row.ChartNo || '').trim();
    if (!chartNo) {
      showWarning(
        'ChartNo was not returned by the browse API for this row, so this chart cannot be edited safely.',
        'Chart No. missing',
      );
      return;
    }

    const parsed = rowToEditorShades(row);
    setEditingIndex(index);
    setEditorMode('edit');
    setEditorChartNo(chartNo);
    setEditorChartQty(String(parseWholeNumber(row.qty)));
    setEditorShadeCount(String(parsed.length));
    setEditorShades(parsed);
    setEditorDirty(false);

    // Auto-select the APC chart this allocation was created from, so the
    // "APC Chart" dropdown reflects the accurate, already-linked chart.
    // No linked chart (0 / missing) => no selection ("None").
    const existingApcChartId = parseWholeNumber(row.ApcChartId);
    setSelectedApcChartId(existingApcChartId > 0 ? existingApcChartId : null);
    void loadApcCharts();
  };

  useEffect(() => {
    if (editorShades.length === 0 && selectedApcChartId != null) {
      setSelectedApcChartId(null);
    }
  }, [editorShades.length, selectedApcChartId]);

  const editorAvailable = useMemo(() => {
    if (editorMode === 'edit' && editingIndex !== null) {
      return pendingQty + numberValue(sortedDetails[editingIndex]?.qty);
    }
    return pendingQty;
  }, [editorMode, editingIndex, pendingQty, sortedDetails]);
  const editorAllocated = useMemo(
    () => editorShades.reduce((sum, shade) => sum + parseWholeNumber(shade.qty), 0),
    [editorShades],
  );
  const editorQty = parseWholeNumber(editorChartQty);
  const editorBalanced = editorQty > 0 && editorAllocated === editorQty;
  const editorOverPending = editorQty > editorAvailable;
  const editorOverAllocated = editorAllocated > editorQty;
  const editorNeedsAssignment = editorQty > 0 && editorAllocated < editorQty;
  const editorCanSave =
    editorQty > 0 &&
    editorQty <= editorAvailable &&
    editorShades.length > 0 &&
    editorShades.length === parseWholeNumber(editorShadeCount) &&
    editorBalanced &&
    editorShades.every((shade) =>
      shade.Name.trim() &&
      /^\d+$/.test(String(shade.qty).trim()) &&
      parseWholeNumber(shade.qty) > 0
    );

  const updateChartQty = (value: string) => {
    const clean = integerInput(value);
    setEditorChartQty(clean);
    setEditorDirty(true);
  };

  const openConfirmation = (config: {
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }) => setConfirmDialog({ visible: true, ...config });

  const closeConfirmation = () =>
    setConfirmDialog((current) => ({ ...current, visible: false, onConfirm: undefined }));

  const updateShadeCount = (value: string) => {
    const clean = integerInput(value);
    setEditorShadeCount(clean);
    setEditorDirty(true);
  };

  const addShadeRows = () => {
    const desired = parseWholeNumber(editorShadeCount);
    const current = editorShades.length;

    if (desired === current) return;
    if (desired <= 0) return;

    if (desired > current) {
      const missing = desired - current;
      setEditorShades((prev) => [
        ...prev,
        ...Array.from({ length: missing }, (_, i) => ({
          Code: `__new_${Date.now()}_${i}`,
          Name: '',
          qty: '',
        })),
      ]);
      setEditorDirty(true);
    } else {
      const removeCount = current - desired;
      openConfirmation({
        title: 'Remove shade rows?',
        message: `You currently have ${current} shade${current === 1 ? '' : 's'}. ${removeCount} shade${removeCount === 1 ? '' : 's'} will be removed from this chart.`,
        confirmLabel: 'Remove shades',
        destructive: true,
        onConfirm: () => {
          setEditorShades((prev) => prev.slice(0, desired));
          setEditorShadeCount(String(desired));
          setEditorDirty(true);
        },
      });
    }
  };

  const searchShades = (query: string) => {
    setShadeQuery(query);
    if (shadeDebounce.current) clearTimeout(shadeDebounce.current);

    shadeDebounce.current = setTimeout(async () => {
      setShadeLoading(true);
      try {
        const response = await lookupAllocation({
          prpcode: ref.prpcode,
          yearno: ref.yearno,
          strcode: ref.strcode,
          type: 'greyshade',
          search: query || '',
        }, token);
        const body = response?.response?.data ?? response?.data ?? response ?? [];
        const data = body?.data && Array.isArray(body.data) ? body.data : body;
        const normalized = Array.isArray(data) ? data.map((item: any) => ({
          Code: String(item?.Code ?? item?.code ?? item?.ShdCode ?? item?.shdcode ?? item?.ShadeCode ?? '').trim(),
          Name: String(item?.Name ?? item?.name ?? item?.ShdName ?? item?.shdname ?? '').trim(),
          Color: item?.Color ?? item?.color ?? item?.ShadeColor ?? item?.shadecolor,
        })).filter((item: Shade) => item.Name) : [];
        setShadeResults(normalized);
      } catch (error) {
        setShadeResults([]);
        showApiError(error, 'Unable to search shades.');
      } finally {
        setShadeLoading(false);
      }
    }, 250);
  };

  const closeShadePicker = () => {
    setShadePickerVisible(false);
    setEditingShadeIndex(null);
  };

  const addShade = (shade: Shade) => {
    const incomingCode = String(shade.Code ?? '').trim();
    const incomingName = normalizeShadeName(shade.Name);

    const duplicate = editorShades.some((item, idx) => {
      if (editingShadeIndex != null && idx === editingShadeIndex) return false;
      const itemCode = String(item.Code ?? '').trim();
      const itemName = normalizeShadeName(item.Name);
      return (
        (incomingCode && itemCode && itemCode === incomingCode) ||
        (incomingName && itemName && itemName === incomingName)
      );
    });

    if (duplicate) {
      showWarning('This shade is already added.', 'Duplicate shade');
      return;
    }

    if (editingShadeIndex != null) {
      const targetIndex = editingShadeIndex;
      setEditorShades((current) =>
        current.map((item, i) => i === targetIndex ? { ...shade, qty: item.qty || '' } : item),
      );
    } else {
      const emptyIndex = editorShades.findIndex((item) => !item.Name.trim());
      if (emptyIndex >= 0) {
        setEditorShades((current) =>
          current.map((item, i) => i === emptyIndex ? { ...shade, qty: item.qty || '' } : item),
        );
      } else {
        setEditorShades((current) => [...current, { ...shade, qty: '' }]);
        setEditorShadeCount(String(editorShades.length + 1));
      }
    }

    setEditorDirty(true);
    setEditingShadeIndex(null);
    setShadePickerVisible(false);
  };

  const applyApcChart = (chart: ApcChart, mode: 'keep' | 'replace') => {
    const chartShades = (Array.isArray(chart.Shades) ? chart.Shades : [])
      .map((shade) => ({
        Code: String(shade?.ShdCode ?? '').trim(),
        Name: String(shade?.ShdName ?? '').trim(),
      }))
      .filter((shade) => shade.Name);

    if (!chartShades.length) {
      showWarning('This APC chart has no shades to add.', 'No shades');
      return;
    }

    if (mode === 'replace') {
      const newShades = chartShades.map((shade) => ({
        Code: shade.Code,
        Name: shade.Name,
        qty: '',
      }));
      setEditorShades(newShades);
      setEditorShadeCount(String(newShades.length));
      setSelectedApcChartId(chart.Id);
      setEditorDirty(true);
      return;
    }

    // mode === 'keep'
    const keepSet = new Set<string>();
    chartShades.forEach((cs) => {
      if (cs.Code) keepSet.add(`code:${cs.Code}`);
      if (cs.Name) keepSet.add(`name:${normalizeShadeName(cs.Name)}`);
    });

    const filteredExisting = editorShades.filter((shade) => {
      const code = String(shade.Code ?? '').trim();
      const name = normalizeShadeName(shade.Name);
      return keepSet.has(`code:${code}`) || keepSet.has(`name:${name}`);
    });

    const isAlreadyPresent = (code: string, name: string) =>
      filteredExisting.some((item) => {
        const itemCode = String(item.Code ?? '').trim();
        const itemName = normalizeShadeName(item.Name);
        return (
          (code && itemCode && itemCode === code) ||
          (name && itemName && itemName === normalizeShadeName(name))
        );
      });

    const toAdd = chartShades.filter((shade) => !isAlreadyPresent(shade.Code, shade.Name));

    const merged = [
      ...filteredExisting,
      ...toAdd.map((shade) => ({ Code: shade.Code, Name: shade.Name, qty: '' })),
    ];

    setEditorShades(merged);
    setEditorShadeCount(String(merged.length));
    setSelectedApcChartId(chart.Id);
    setEditorDirty(true);
  };

  const chooseApcChart = (chart: ApcChart | null) => {
    setApcChartPickerVisible(false);

    if (!chart) {
      setSelectedApcChartId(null);
      return;
    }

    const chartShades = (Array.isArray(chart.Shades) ? chart.Shades : [])
      .map((shade) => ({
        Code: String(shade?.ShdCode ?? '').trim(),
        Name: String(shade?.ShdName ?? '').trim(),
      }))
      .filter((shade) => shade.Name);

    if (!chartShades.length) {
      showWarning('This APC chart has no shades to add.', 'No shades');
      return;
    }

    const hasAnyQuantity = editorShades.some((shade) => parseWholeNumber(shade.qty) > 0);

    if (!hasAnyQuantity) {
      applyApcChart(chart, 'replace');
      return;
    }

    const conflicting = editorShades.filter((shade) => {
      const name = normalizeShadeName(shade.Name);
      const code = String(shade.Code ?? '').trim();
      if (parseWholeNumber(shade.qty) <= 0) return false;
      return !chartShades.some((cs) =>
        (code && cs.Code && cs.Code === code) ||
        (name && normalizeShadeName(cs.Name) === name)
      );
    });

    if (conflicting.length > 0) {
      setApcReplaceDialog({
        visible: true,
        chart,
        conflictingShades: conflicting,
      });
      return;
    }

    applyApcChart(chart, 'keep');
  };

  const updateShadeQty = (index: number, value: string) => {
    setEditorShades((current) =>
      current.map((item, i) => i === index ? { ...item, qty: integerInput(value) } : item),
    );
    setEditorDirty(true);
  };

  const removeEditorShade = (index: number) => {
    setEditorShades((current) => current.filter((_, i) => i !== index));
    setEditorShadeCount(String(Math.max(editorShades.length - 1, 0)));
    setEditorDirty(true);
    setEditingShadeIndex(null);
  };

  const closeEditor = () => {
    const reset = () => {
      setShadePickerVisible(false);
      setEditingShadeIndex(null);
      setApcChartPickerVisible(false);
      setEditorMode(null);
      setEditingIndex(null);
      setEditorChartNo('');
      setEditorShades([]);
      setEditorChartQty('');
      setEditorShadeCount('');
      setEditorDirty(false);
      setSelectedApcChartId(null);
      setApcReplaceDialog({ visible: false, chart: null, conflictingShades: [] });
    };

    if (!editorDirty || (editorQty === 0 && editorShades.length === 0)) {
      reset();
      return;
    }

    let message = 'Your current allocation changes will be discarded if you leave this screen.';
    if (editorQty > 0 && editorAllocated !== editorQty) {
      const difference = Math.abs(editorAllocated - editorQty);
      message = editorAllocated > editorQty
        ? `${n(difference)} m is over the chart quantity of ${n(editorQty)} m. ${message}`
        : `${n(difference)} m is still unassigned out of ${n(editorQty)} m. ${message}`;
    }

    openConfirmation({
      title: 'Leave chart editor?',
      message,
      confirmLabel: 'Discard changes',
      destructive: true,
      onConfirm: reset,
    });
  };

  const buildSyncAllocations = (chartNo: string) => editorShades
    .filter((shade) => shade.Name.trim() && parseWholeNumber(shade.qty) > 0)
    .map((shade) => ({
      AllocationId: 0,
      OrderSrNo: ref.srno,
      StrCode: ref.strcode,
      ItmCode: ref.itmCode,
      DsnCode: ref.dsnCode,
      GrdCode: String(refData?.grdcode || '1'),
      GrdName: String(refData?.grdname || '1st'),
      ChartNo: chartNo,
      ShdCode: shade.Code,
      ShdName: shade.Name.trim(),
      AllocationQty: String(parseWholeNumber(shade.qty)),
      ChallanQty: 0,
      IsLocked: 0,
      Remark: '',
    }));

  const buildExistingAllocations = () =>
    sortedDetails.flatMap((row) => {
      const chartNo = String(row.ChartNo || '').trim();
      if (!chartNo) return [];

      return rowToEditorShades(row)
        .filter((shade) => shade.Name.trim() && parseWholeNumber(shade.qty) > 0)
        .map((shade) => ({
          AllocationId: 0,
          OrderSrNo: ref.srno,
          StrCode: ref.strcode,
          ItmCode: ref.itmCode,
          DsnCode: ref.dsnCode,
          GrdCode: String(refData?.grdcode || '1'),
          GrdName: String(refData?.grdname || '1st'),
          ChartNo: chartNo,
          ShdCode: shade.Code,
          ShdName: shade.Name.trim(),
          AllocationQty: String(parseWholeNumber(shade.qty)),
          ChallanQty: 0,
          IsLocked: 0,
          Remark: '',
        }));
    });

  const resolveShadeCodesByName = async (
    shades: EditorShade[],
  ): Promise<EditorShade[]> => {
    const resolved: EditorShade[] = [];

    for (const shade of shades) {
      const shadeName = String(shade.Name || '').trim();
      const shadeCode = String(shade.Code || '').trim();

      if (!shadeName) {
        resolved.push(shade);
        continue;
      }

      if (shadeCode && !shadeCode.startsWith('__new_')) {
        resolved.push({
          ...shade,
          Code: shadeCode,
          Name: shadeName,
        });
        continue;
      }

      const response = await lookupAllocation({
        prpcode: ref.prpcode,
        yearno: ref.yearno,
        strcode: ref.strcode,
        type: 'greyshade',
        search: shadeName,
      }, token);

      const body =
        response?.response?.data ??
        response?.data ??
        response ??
        [];

      const data =
        body?.data && Array.isArray(body.data)
          ? body.data
          : body;

      const options: Shade[] = Array.isArray(data)
        ? data
          .map((item: any) => ({
            Code: String(
              item?.Code ??
              item?.code ??
              item?.ShdCode ??
              item?.shdcode ??
              item?.ShadeCode ??
              ''
            ).trim(),
            Name: String(
              item?.Name ??
              item?.name ??
              item?.ShdName ??
              item?.shdname ??
              ''
            ).trim(),
          }))
          .filter((item: Shade) => item.Name && item.Code)
        : [];

      const exactMatch = options.find(
        (item) =>
          normalizeShadeName(item.Name) ===
          normalizeShadeName(shadeName)
      );

      if (!exactMatch) {
        throw new Error(
          `Unable to find shade code for "${shadeName}".`
        );
      }

      resolved.push({
        ...shade,
        Code: exactMatch.Code,
        Name: exactMatch.Name || shadeName,
      });
    }

    return resolved;
  };

  const saveEditor = async () => {
    if (!editorCanSave || editorSaving) return;

    setEditorSaving(true);
    try {
      const chartNo = String(editorChartNo || '').trim();

      if (editorMode === 'edit' && !chartNo) {
        throw new Error('ChartNo is required when editing a chart.');
      }

      const resolvedShades =
        editorMode === 'edit'
          ? await resolveShadeCodesByName(editorShades)
          : editorShades;

      const allocations = resolvedShades
        .filter(
          (shade) =>
            shade.Name.trim() &&
            parseWholeNumber(shade.qty) > 0
        )
        .map((shade) => ({
          AllocationId: 0,
          OrderSrNo: ref.srno,
          StrCode: ref.strcode,
          ItmCode: ref.itmCode,
          DsnCode: ref.dsnCode,
          GrdCode: String(refData?.grdcode || '1'),
          GrdName: String(refData?.grdname || '1st'),
          ChartNo: chartNo,
          ShdCode: String(shade.Code || '').trim(),
          ShdName: shade.Name.trim(),
          AllocationQty: String(parseWholeNumber(shade.qty)),
          ChallanQty: 0,
          IsLocked: 0,
          Remark: '',
        }));

      const payload = {
        ...trackingPayload,
        Type: editorMode === 'create' ? 'add' : 'edit',
        ReplaceAll: 1,
        PrpCode: ref.prpcode,
        YearNo: ref.yearno,
        StrCode: ref.strcode,
        prpcode: ref.prpcode,
        yearno: ref.yearno,
        strcode: ref.strcode,
        OrderUId: ref.uid,
        ShdCode: ref.shdcode,
        items: [
          {
            SrNo: ref.srno,
            sono: ref.sono,
            ChartNo: chartNo,
            ApcChartId: selectedApcChartId != null ? selectedApcChartId : 0,
            Qty: '.000',
            ItmCode: ref.itmCode,
            DsnCode: ref.dsnCode,
            Allocations: allocations,
          },
        ],
      };

      const response = await syncAllocation(payload, token);
      if (response?.success === false) {
        throw new Error(response?.message || 'Allocation save failed.');
      }

      await loadBrowse();

      setEditorMode(null);
      setEditingIndex(null);
      setEditorShades([]);
      setEditorChartQty('');
      setEditorShadeCount('');
      setEditorDirty(false);
    } catch (error) {
      showApiError(
        error,
        editorMode === 'create' ? 'Unable to create chart.' : 'Unable to save chart changes.',
      );
    } finally {
      setEditorSaving(false);
    }
  };

  const deleteChart = (row: BrowseRow, _index: number) => {
    if (!ref.isAllocation) return;

    const chartNo = String(row.ChartNo || '').trim();
    if (!chartNo) {
      showWarning(
        'ChartNo was not returned by the browse API for this row, so this chart cannot be deleted safely.',
        'Chart No. missing',
      );
      return;
    }

    openConfirmation({
      title: `Delete ${chartNo}?`,
      message: `This will remove the complete allocation for ${formatDate(row.LastDate)} (${n(numberValue(row.qty))} m). This action cannot be undone.`,
      confirmLabel: 'Delete chart',
      destructive: true,
      onConfirm: async () => {
        try {
          const payload = {
            ...trackingPayload,
            Type: 'delete',
            ReplaceAll: 1,
            PrpCode: ref.prpcode,
            YearNo: ref.yearno,
            StrCode: ref.strcode,
            prpcode: ref.prpcode,
            yearno: ref.yearno,
            strcode: ref.strcode,
            OrderUId: ref.uid,
            ShdCode: ref.shdcode,
            items: [{
              SrNo: ref.srno,
              sono: ref.sono,
              ChartNo: chartNo,
              Qty: '.000',
              ItmCode: ref.itmCode,
              DsnCode: ref.dsnCode,
              Allocations: [],
            }],
          };

          const response = await syncAllocation(payload, token);
          if (response?.success === false) {
            throw new Error(response?.message || 'Allocation delete failed.');
          }

          await loadBrowse();
        } catch (error) {
          showApiError(error, 'Unable to delete chart allocation.');
        }
      },
    });
  };

  const renderDetail = ({ item, index }: { item: BrowseRow & { __sourceIndex: number }; index: number }) => {
    const chartNo = String(item.ChartNo || '').trim() || '—';
    const rowQty = numberValue(item.qty);

    return (
      <View style={[jobChartStyles.detailRow, { borderBottomColor: theme.colors.border }]}>
        <View style={jobChartStyles.chartCell}>
          <ResponsiveText style={[jobChartStyles.chartNo, { color: theme.colors.text }]}>{chartNo}</ResponsiveText>
          {item.ApcChartName ? (
            <ResponsiveText
              numberOfLines={1}
              style={[jobChartStyles.cellText, { color: theme.colors.textMuted, marginTop: 2 }]}
            >
              {item.ApcChartName}
            </ResponsiveText>
          ) : null}
        </View>
        <View style={jobChartStyles.dateCell}>
          <ResponsiveText style={[jobChartStyles.cellText, { color: theme.colors.textMuted }]}>{formatDate(item.LastDate)}</ResponsiveText>
        </View>
        <View style={jobChartStyles.qtyCell}>
          <ResponsiveText style={[jobChartStyles.qtyText, { color: theme.colors.text }]}>{n(rowQty)}</ResponsiveText>
        </View>
        <View style={jobChartStyles.shadeCell}>
          <View style={jobChartStyles.shadeChipWrap}>
            {item.shades?.length ? item.shades.map((shade, shadeIndex) => (
              <View
                key={`${shade.ShdName}-${shadeIndex}`}
                style={[jobChartStyles.shadePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}
              >
                <ResponsiveText style={[jobChartStyles.shadeText, { color: theme.colors.text }]}>
                  {shade.ShdName} · {allocationDisplayQty(shade.AllocationQty)}
                </ResponsiveText>
              </View>
            )) : (
              <ResponsiveText style={[jobChartStyles.shadeText, { color: theme.colors.textMuted }]}>—</ResponsiveText>
            )}
          </View>
        </View>
        <View style={jobChartStyles.statusCell}>
          <View style={[jobChartStyles.confirmed, { backgroundColor: `${theme.colors.success}22` }]}>
            <ResponsiveText style={[jobChartStyles.confirmedText, { color: theme.colors.success }]}>CONFIRMED</ResponsiveText>
          </View>
        </View>
        {ref.isAllocation ? (
          <View style={jobChartStyles.actionsCell}>
            <Pressable
              onPress={() => openEdit(item, index)}
              style={[jobChartStyles.iconButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            >
              <Ionicons name="create-outline" size={17} color={theme.colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => deleteChart(item, index)}
              style={[jobChartStyles.iconButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            >
              <Ionicons name="trash-outline" size={17} color={theme.colors.danger} />
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  const goBack = useCallback(() => {
    onClose();
  }, [onClose]);

  if (editorMode) {
    return (
      <AppShell scroll={false}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={jobChartStyles.editorScreenScroll}
            contentContainerStyle={[
              jobChartStyles.editorPage,
              {
                paddingHorizontal: isMobile ? 10 : isTablet ? 22 : 34,
                paddingBottom: isMobile ? 30 : 24,
              },
            ]}
            showsVerticalScrollIndicator
            persistentScrollbar
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            <View style={jobChartStyles.editorTopBar}>
              <Pressable
                onPress={closeEditor}
                style={[jobChartStyles.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Ionicons name="arrow-back" size={17} color={theme.colors.textMuted} />
                <ResponsiveText style={[jobChartStyles.backText, { color: theme.colors.textMuted }]}>Back</ResponsiveText>
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ResponsiveText style={[jobChartStyles.breadcrumb, { color: theme.colors.textMuted }]}>
                  Sales Order › {ref.sono || 'Order'} › Job Chart
                </ResponsiveText>
                <ResponsiveText style={[jobChartStyles.editorScreenTitle, { color: theme.colors.text, fontSize: responsiveFontSize(isMobile ? 20 : 25) }]}>
                  {editorMode === 'create'
                    ? 'Create new chart'
                    : `Edit ${editorChartNo || 'chart'}`}
                </ResponsiveText>
              </View>
            </View>

            <View style={[jobChartStyles.editorScreenCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={jobChartStyles.editorHeader}>
                <View style={{ flex: 1 }}>
                  <ResponsiveText style={[jobChartStyles.editorTitle, { color: theme.colors.text }]}>
                    {editorMode === 'create'
                      ? 'Create new chart'
                      : `Edit ${editorChartNo || 'chart'}`}
                  </ResponsiveText>
                  <ResponsiveText style={[jobChartStyles.editorSub, { color: theme.colors.textMuted }]}>
                    {ref.dsnName || ref.dsnCode || 'Job Chart'} · SrNo {ref.srno || '—'}
                  </ResponsiveText>
                </View>
                <Pressable onPress={closeEditor} style={[jobChartStyles.closeButton, { borderColor: theme.colors.border }]}>
                  <Ionicons name="close" size={19} color={theme.colors.textMuted} />
                </Pressable>
              </View>

              {editorMode === 'edit' ? (
                <View style={[jobChartStyles.chartIdentityBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}>
                  <View style={{ flex: 1 }}>
                    <ResponsiveText style={[jobChartStyles.availableLabel, { color: theme.colors.textMuted }]}>Chart No.</ResponsiveText>
                    <ResponsiveText style={[jobChartStyles.chartIdentityValue, { color: theme.colors.text }]}>{editorChartNo}</ResponsiveText>
                  </View>
                  <Ionicons name="barcode-outline" size={20} color={theme.colors.warning} />
                </View>
              ) : null}

              <View style={[jobChartStyles.availableBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}>
                <ResponsiveText style={[jobChartStyles.availableLabel, { color: theme.colors.textMuted }]}>Available in bulk order</ResponsiveText>
                <ResponsiveText style={[jobChartStyles.availableValue, { color: theme.colors.success }]}>{n(editorAvailable)} m</ResponsiveText>
              </View>

              <View style={jobChartStyles.formSection}>
                <ResponsiveText style={[jobChartStyles.formLabel, { color: theme.colors.textMuted }]}>Chart quantity (m)</ResponsiveText>
                <TextInput
                  value={editorChartQty}
                  onChangeText={updateChartQty}
                  placeholder="e.g. 500"
                  placeholderTextColor={theme.colors.textDim}
                  keyboardType="number-pad"
                  style={[
                    jobChartStyles.chartQtyInput,
                    {
                      color: theme.colors.text,
                      borderColor: editorOverPending ? theme.colors.danger : theme.colors.border,
                      backgroundColor: theme.colors.backgroundSoft,
                    },
                  ]}
                />
                {editorOverPending ? (
                  <ResponsiveText style={[jobChartStyles.validationError, { color: theme.colors.danger }]}>
                    Chart quantity cannot exceed available pending quantity ({n(editorAvailable)} m).
                  </ResponsiveText>
                ) : null}
              </View>

              <View style={[jobChartStyles.countRow, isMobile && jobChartStyles.countRowMobile]}>
                <View style={jobChartStyles.apcInlineField}>
                  <ResponsiveText style={[jobChartStyles.formLabel, { color: theme.colors.textMuted }]}>APC Chart</ResponsiveText>
                  <Pressable
                    onPress={() => {
                      setApcChartPickerVisible(true);
                      void loadApcCharts();
                    }}
                    style={[jobChartStyles.apcInlineDropdown, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}
                  >
                    <ResponsiveText
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: selectedApcChartId != null ? theme.colors.text : theme.colors.textDim,
                      }}
                    >
                      {selectedApcChartId != null
                        ? (apcCharts.find((c) => c.Id === selectedApcChartId)?.ChartName || 'Selected chart')
                        : 'None'}
                    </ResponsiveText>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
                  </Pressable>
                </View>

                <View style={{ flex: 1, minWidth: 150, gap: 3 }}>
                  <ResponsiveText style={[jobChartStyles.formLabel, { color: theme.colors.textMuted }]}>Shade allocation count</ResponsiveText>
                  <ResponsiveText style={[jobChartStyles.editorHint, { color: theme.colors.textMuted }]}>
                    Enter how many shade rows you want to add.
                  </ResponsiveText>
                </View>
                <TextInput
                  value={editorShadeCount}
                  onChangeText={updateShadeCount}
                  placeholder="e.g. 3"
                  placeholderTextColor={theme.colors.textDim}
                  keyboardType="number-pad"
                  style={[jobChartStyles.countInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}
                />
                <Pressable
                  onPress={addShadeRows}
                  disabled={parseWholeNumber(editorShadeCount) <= 0 || parseWholeNumber(editorShadeCount) === editorShades.length}
                  style={[
                    jobChartStyles.addCountButton,
                    {
                      backgroundColor: parseWholeNumber(editorShadeCount) > 0 && parseWholeNumber(editorShadeCount) !== editorShades.length
                        ? theme.colors.warning
                        : theme.colors.backgroundSoft,
                      borderColor: theme.colors.border,
                      opacity: parseWholeNumber(editorShadeCount) > 0 && parseWholeNumber(editorShadeCount) !== editorShades.length ? 1 : 0.5,
                    },
                  ]}
                >
                  <Ionicons name="add" size={16} color={parseWholeNumber(editorShadeCount) > 0 && parseWholeNumber(editorShadeCount) !== editorShades.length ? '#111' : theme.colors.textDim} />
                  <ResponsiveText style={[jobChartStyles.secondaryButtonText, { color: parseWholeNumber(editorShadeCount) > 0 && parseWholeNumber(editorShadeCount) !== editorShades.length ? '#111' : theme.colors.textDim }]}>
                    Apply
                  </ResponsiveText>
                </Pressable>
              </View>

              <View style={jobChartStyles.editorShadeHeader}>
                <View style={{ flex: 1 }}>
                  <ResponsiveText style={[jobChartStyles.formLabel, { color: theme.colors.textMuted }]}>Shades</ResponsiveText>
                  <ResponsiveText style={[jobChartStyles.editorHint, { color: theme.colors.textMuted }]}>
                    Whole‑number quantities only. Total must exactly match chart quantity.
                  </ResponsiveText>
                </View>
                <Pressable
                  onPress={() => {
                    setEditingShadeIndex(null);
                    setShadeQuery('');
                    setShadeResults([]);
                    setShadePickerVisible(true);
                    searchShades('');
                  }}
                  style={[jobChartStyles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}
                >
                  <Ionicons name="add" size={16} color={theme.colors.warning} />
                  <ResponsiveText style={[jobChartStyles.secondaryButtonText, { color: theme.colors.warning }]}>Add shade</ResponsiveText>
                </Pressable>
              </View>

              {editorShades.length === 0 ? (
                <View style={[jobChartStyles.noShadeBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}>
                  <Ionicons name="color-filter-outline" size={22} color={theme.colors.textDim} />
                  <ResponsiveText style={[jobChartStyles.editorHint, { color: theme.colors.textMuted }]}>
                    Add shade rows using the count field or choose a shade directly.
                  </ResponsiveText>
                </View>
              ) : null}

              {editorShades.map((shade, i) => {
                const invalidName = !shade.Name.trim();
                const invalidQty = !/^\d+$/.test(String(shade.qty).trim()) || parseWholeNumber(shade.qty) <= 0;
                return (
                  <View key={`${shade.Code}-${i}`} style={[jobChartStyles.editorShadeBlock, isMobile && jobChartStyles.editorShadeBlockMobile]}>
                    <View style={[jobChartStyles.editorShadeRow, isMobile && jobChartStyles.editorShadeRowMobile]}>
                      <Pressable
                        onPress={() => {
                          setEditingShadeIndex(i);
                          setShadeQuery(shade.Name || '');
                          setShadeResults([]);
                          setShadePickerVisible(true);
                          searchShades(shade.Name || '');
                        }}
                        style={[
                          jobChartStyles.editorShadeNameBox,
                          { borderColor: invalidName ? theme.colors.danger : theme.colors.border, backgroundColor: theme.colors.backgroundSoft },
                        ]}
                      >
                        <ResponsiveText style={[jobChartStyles.editorShadeName, { color: invalidName ? theme.colors.textDim : theme.colors.text }]} numberOfLines={1}>
                          {shade.Name || 'Select shade'}
                        </ResponsiveText>
                        <Ionicons name="chevron-down" size={15} color={theme.colors.textDim} />
                      </Pressable>
                      <TextInput
                        value={shade.qty}
                        onChangeText={(value) => updateShadeQty(i, value)}
                        placeholder="Qty"
                        placeholderTextColor={theme.colors.textDim}
                        keyboardType="number-pad"
                        style={[
                          jobChartStyles.editorShadeQty,
                          {
                            color: theme.colors.text,
                            borderColor: invalidQty ? theme.colors.danger : theme.colors.border,
                            backgroundColor: theme.colors.backgroundSoft,
                            width: isMobile ? '100%' : 105,
                          },
                        ]}
                      />
                      <Pressable onPress={() => removeEditorShade(i)} style={[jobChartStyles.deleteButton, { borderColor: theme.colors.border, width: isMobile ? '100%' : 44 }]}>
                        <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                      </Pressable>
                    </View>
                    {invalidName ? <ResponsiveText style={[jobChartStyles.rowValidation, { color: theme.colors.danger }]}>Select a shade.</ResponsiveText> : null}
                    {!invalidName && invalidQty ? <ResponsiveText style={[jobChartStyles.rowValidation, { color: theme.colors.danger }]}>Enter a whole‑number quantity greater than 0.</ResponsiveText> : null}
                  </View>
                );
              })}

              <View style={[jobChartStyles.editorFooter, { borderTopColor: theme.colors.border }]}>
                <View>
                  <ResponsiveText style={[jobChartStyles.allocationState, { color: editorBalanced ? theme.colors.success : theme.colors.textMuted }]}>
                    Allocated {n(editorAllocated)} / {n(editorQty)} m
                  </ResponsiveText>
                  {editorOverAllocated ? (
                    <ResponsiveText style={[jobChartStyles.validationError, { color: theme.colors.danger }]}>{n(editorAllocated - editorQty)} m over</ResponsiveText>
                  ) : editorNeedsAssignment ? (
                    <ResponsiveText style={[jobChartStyles.validationError, { color: theme.colors.warning }]}>{n(editorQty - editorAllocated)} m to assign</ResponsiveText>
                  ) : null}
                </View>
                <ResponsiveText style={[jobChartStyles.balanceState, { color: editorBalanced ? theme.colors.success : theme.colors.warning }]}>
                  {editorBalanced ? 'balanced ✓' : 'not balanced'}
                </ResponsiveText>
              </View>

              <View style={jobChartStyles.editorActions}>
                <Pressable onPress={closeEditor} disabled={editorSaving} style={[jobChartStyles.cancelButton, { borderColor: theme.colors.border, opacity: editorSaving ? 0.5 : 1 }]}>
                  <ResponsiveText style={[jobChartStyles.cancelText, { color: theme.colors.textMuted }]}>Cancel</ResponsiveText>
                </Pressable>
                <Pressable
                  onPress={saveEditor}
                  disabled={!editorCanSave || editorSaving}
                  style={[
                    jobChartStyles.editorSaveButton,
                    {
                      backgroundColor: editorCanSave ? theme.colors.warning : theme.colors.backgroundSoft,
                      borderColor: theme.colors.border,
                      borderWidth: editorCanSave ? 0 : 1,
                      opacity: editorCanSave && !editorSaving ? 1 : 0.55,
                    },
                  ]}
                >
                  {editorSaving ? <ActivityIndicator size="small" color="#111" /> : <Ionicons name="checkmark" size={17} color={editorCanSave ? '#111' : theme.colors.textDim} />}
                  <ResponsiveText style={[jobChartStyles.editorSaveText, { color: editorCanSave ? '#111' : theme.colors.textDim }]}>
                    {editorMode === 'create' ? 'Create chart' : 'Save changes'}
                  </ResponsiveText>
                </Pressable>
              </View>
            </View>

            {confirmDialog.visible && (
              <View style={jobChartStyles.confirmOverlay} accessibilityViewIsModal>
                <Pressable style={StyleSheet.absoluteFill} onPress={closeConfirmation} accessibilityLabel="Close confirmation" />
                <View style={[jobChartStyles.confirmCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={jobChartStyles.confirmIconWrap}>
                    <Ionicons
                      name={confirmDialog.destructive ? 'warning-outline' : 'information-circle-outline'}
                      size={23}
                      color={confirmDialog.destructive ? theme.colors.danger : theme.colors.warning}
                    />
                  </View>
                  <ResponsiveText style={[jobChartStyles.confirmTitle, { color: theme.colors.text }]}>{confirmDialog.title}</ResponsiveText>
                  <ResponsiveText style={[jobChartStyles.confirmMessage, { color: theme.colors.textMuted }]}>{confirmDialog.message}</ResponsiveText>
                  <View style={jobChartStyles.confirmActions}>
                    <Pressable onPress={closeConfirmation} style={[jobChartStyles.confirmCancelButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}>
                      <ResponsiveText style={[jobChartStyles.confirmCancelText, { color: theme.colors.textMuted }]}>Cancel</ResponsiveText>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        const action = confirmDialog.onConfirm;
                        closeConfirmation();
                        if (action) await action();
                      }}
                      style={[jobChartStyles.confirmButton, { backgroundColor: confirmDialog.destructive ? theme.colors.danger : theme.colors.warning }]}
                    >
                      <ResponsiveText style={jobChartStyles.confirmButtonText}>{confirmDialog.confirmLabel}</ResponsiveText>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {apcReplaceDialog.visible && (
              <View style={jobChartStyles.confirmOverlay} accessibilityViewIsModal>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setApcReplaceDialog({ visible: false, chart: null, conflictingShades: [] })}
                />
                <View style={[jobChartStyles.confirmCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={jobChartStyles.confirmIconWrap}>
                    <Ionicons name="warning-outline" size={23} color={theme.colors.warning} />
                  </View>
                  <ResponsiveText style={[jobChartStyles.confirmTitle, { color: theme.colors.text }]}>APC Chart conflict</ResponsiveText>
                  <ResponsiveText style={[jobChartStyles.confirmMessage, { color: theme.colors.textMuted }]}>
                    You have existing shades with quantities that are not part of the selected APC chart.
                    Choose what to do:
                    • **Keep existing** – keep the shades that are in the chart (preserve their quantities), remove the ones that are not, and add any new shades from the chart.
                    • **Replace** – replace all shades with the chart’s shades (quantities reset to empty).
                  </ResponsiveText>
                  <View style={jobChartStyles.confirmActions}>
                    <Pressable
                      onPress={() => {
                        const chart = apcReplaceDialog.chart;
                        setApcReplaceDialog({ visible: false, chart: null, conflictingShades: [] });
                        if (chart) applyApcChart(chart, 'keep');
                      }}
                      style={[jobChartStyles.confirmCancelButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}
                    >
                      <ResponsiveText style={[jobChartStyles.confirmCancelText, { color: theme.colors.textMuted }]}>Keep existing</ResponsiveText>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const chart = apcReplaceDialog.chart;
                        setApcReplaceDialog({ visible: false, chart: null, conflictingShades: [] });
                        if (chart) applyApcChart(chart, 'replace');
                      }}
                      style={[jobChartStyles.confirmButton, { backgroundColor: theme.colors.danger }]}
                    >
                      <ResponsiveText style={jobChartStyles.confirmButtonText}>Replace</ResponsiveText>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {shadePickerVisible && (
              <View style={jobChartStyles.pickerOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={closeShadePicker} />
                <View style={[jobChartStyles.pickerSheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={jobChartStyles.pickerHeader}>
                    <View style={{ flex: 1 }}>
                      <ResponsiveText style={[jobChartStyles.pickerTitle, { color: theme.colors.text }]}>Select Shade</ResponsiveText>
                      <ResponsiveText style={[jobChartStyles.editorHint, { color: theme.colors.textMuted }]}>Search and select an available shade</ResponsiveText>
                    </View>
                    <Pressable onPress={closeShadePicker}>
                      <Ionicons name="close" size={22} color={theme.colors.text} />
                    </Pressable>
                  </View>
                  <View style={[jobChartStyles.shadeSearch, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}>
                    <Ionicons name="search" size={16} color={theme.colors.textDim} />
                    <TextInput autoFocus value={shadeQuery} onChangeText={searchShades} placeholder="Search shade..." placeholderTextColor={theme.colors.textDim} style={[jobChartStyles.shadeSearchInput, { color: theme.colors.text }]} />
                  </View>
                  {shadeLoading ? (
                    <View style={jobChartStyles.loading}><ActivityIndicator color={theme.colors.warning} /></View>
                  ) : (
                    <FlatList
                      data={shadeResults}
                      keyExtractor={(item) => String(item.Code)}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator
                      persistentScrollbar
                      renderItem={({ item, index: itemIndex }) => (
                        <Pressable onPress={() => addShade(item)} style={[jobChartStyles.pickerRow, { borderBottomColor: theme.colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <ResponsiveText style={[jobChartStyles.pickerShadeName, { color: theme.colors.text }]}>{item.Name}</ResponsiveText>
                            <ResponsiveText style={[jobChartStyles.editorHint, { color: theme.colors.textMuted }]}>{item.Code}</ResponsiveText>
                          </View>
                          <Ionicons name="chevron-forward" size={17} color={theme.colors.textDim} />
                        </Pressable>
                      )}
                      ListEmptyComponent={<View style={jobChartStyles.empty}><ResponsiveText style={[jobChartStyles.editorHint, { color: theme.colors.textMuted }]}>No shades found.</ResponsiveText></View>}
                    />
                  )}
                </View>
              </View>
            )}

            {apcChartPickerVisible && (
              <View style={jobChartStyles.pickerOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setApcChartPickerVisible(false)} />
                <View style={[jobChartStyles.pickerSheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={jobChartStyles.pickerHeader}>
                    <View style={{ flex: 1 }}>
                      <ResponsiveText style={[jobChartStyles.pickerTitle, { color: theme.colors.text }]}>Select APC Chart</ResponsiveText>
                      <ResponsiveText style={[jobChartStyles.editorHint, { color: theme.colors.textMuted }]}>Choose a saved chart to auto‑fill shades</ResponsiveText>
                    </View>
                    <Pressable onPress={() => setApcChartPickerVisible(false)}>
                      <Ionicons name="close" size={22} color={theme.colors.text} />
                    </Pressable>
                  </View>
                  {apcChartsLoading ? (
                    <View style={jobChartStyles.loading}><ActivityIndicator color={theme.colors.warning} /></View>
                  ) : (
                    <FlatList
                      data={apcCharts}
                      keyExtractor={(item) => String(item.Id)}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator
                      persistentScrollbar
                      nestedScrollEnabled
                      contentContainerStyle={jobChartStyles.apcPickerListContent}
                      ListHeaderComponent={
                        <Pressable onPress={() => chooseApcChart(null)} style={[jobChartStyles.pickerRow, { borderBottomColor: theme.colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <ResponsiveText style={[jobChartStyles.pickerShadeName, { color: theme.colors.text }]}>None</ResponsiveText>
                            <ResponsiveText style={[jobChartStyles.editorHint, { color: theme.colors.textMuted }]}>Don't auto‑fill shades</ResponsiveText>
                          </View>
                          {selectedApcChartId == null ? <Ionicons name="checkmark" size={18} color={theme.colors.warning} /> : null}
                        </Pressable>
                      }
                      renderItem={({ item }) => (
                        <Pressable onPress={() => chooseApcChart(item)} style={[jobChartStyles.apcPickerChartRow, { borderBottomColor: theme.colors.border }]}>
                          <View style={jobChartStyles.apcPickerChartMain}>
                            <View style={jobChartStyles.apcPickerChartTitleRow}>
                              <ResponsiveText style={[jobChartStyles.pickerShadeName, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                                {item.ChartName || item.ChartNo}
                              </ResponsiveText>
                              {selectedApcChartId === item.Id
                                ? <Ionicons name="checkmark" size={18} color={theme.colors.warning} />
                                : <Ionicons name="chevron-forward" size={17} color={theme.colors.textDim} />}
                            </View>

                            <View style={jobChartStyles.apcPickerShadeWrap}>
                              {Array.isArray(item.Shades) && item.Shades.length ? (
                                item.Shades.map((shade: any, shadeIndex: number) => {
                                  const shadeName = String(shade?.ShdName ?? '').trim();
                                  const shadeCode = String(shade?.ShdCode ?? '').trim();
                                  if (!shadeName) return null;
                                  return (
                                    <View
                                      key={`${item.Id}-${shadeCode || shadeName}-${shadeIndex}`}
                                      style={[jobChartStyles.apcPickerShadePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}
                                    >
                                      <ResponsiveText style={[jobChartStyles.apcPickerShadeText, { color: theme.colors.text }]} numberOfLines={1}>
                                        {shadeName}
                                      </ResponsiveText>
                                    </View>
                                  );
                                })
                              ) : (
                                <ResponsiveText style={[jobChartStyles.editorHint, { color: theme.colors.textDim }]}>No shades</ResponsiveText>
                              )}
                            </View>
                          </View>
                        </Pressable>
                      )}
                      ListEmptyComponent={<View style={jobChartStyles.empty}><ResponsiveText style={[jobChartStyles.editorHint, { color: theme.colors.textMuted }]}>No APC charts found.</ResponsiveText></View>}
                    />
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </AppShell>
    );
  }

  return (
    <AppShell scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={jobChartStyles.screenScroll}
          contentContainerStyle={[
            jobChartStyles.page,
            {
              paddingHorizontal: isMobile ? 10 : isTablet ? 18 : 24,
              paddingBottom: isMobile ? 20 : 22,
            },
          ]}
          showsVerticalScrollIndicator
          persistentScrollbar
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <View style={jobChartStyles.topBar}>
            <Pressable onPress={goBack} style={[jobChartStyles.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="arrow-back" size={17} color={theme.colors.textMuted} />
              <ResponsiveText style={[jobChartStyles.backText, { color: theme.colors.textMuted }]}>Back</ResponsiveText>
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ResponsiveText style={[jobChartStyles.breadcrumb, { color: theme.colors.textMuted }]}>Sales Order  ›  {ref.sono || 'Order'}  ›  Job Chart</ResponsiveText>
              <ResponsiveText style={[jobChartStyles.title, { color: theme.colors.text, fontSize: responsiveFontSize(isMobile ? 20 : 25) }]} numberOfLines={1}>{ref.dsnName || ref.dsnCode || 'Job Chart'} — {ref.status === 'CLOSED' ? 'Closed' : 'Pending'}</ResponsiveText>
              <ResponsiveText style={[jobChartStyles.subtitle, { color: theme.colors.textMuted }]}>Sales order {ref.sono || '—'} · SrNo {ref.srno || '—'}</ResponsiveText>
            </View>
            <Pressable
              onPress={() => void loadBrowse()}
              disabled={loading}
              style={[jobChartStyles.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityLabel="Refresh job chart"
            >
              {loading
                ? <ActivityIndicator size="small" color={theme.colors.textMuted} />
                : <Ionicons name="refresh" size={17} color={theme.colors.textMuted} />}
            </Pressable>
          </View>

          <View style={[
            jobChartStyles.summaryGrid,
            isTablet && !isMobile && jobChartStyles.summaryGridTablet,
            isMobile && jobChartStyles.summaryGridMobile,
          ]}>
            <SummaryCard index={0} isTablet={isTablet} isMobile={isMobile} label="Sales order" value={ref.sono || '—'} sub={`SrNo ${ref.srno || '—'}`} icon="receipt-outline" theme={theme} />
            <SummaryCard index={1} isTablet={isTablet} isMobile={isMobile} label="Authorized" value={`${n(authorizedQty)} m`} icon="layers-outline" theme={theme} />
            <SummaryCard index={2} isTablet={isTablet} isMobile={isMobile} label="Charted / Delivered" value={`${n(challanQty)} m`} icon="car-outline" valueColor={theme.colors.success} theme={theme} />
            <SummaryCard index={3} isTablet={isTablet} isMobile={isMobile} label="Delivery Pending" value={`${n(pendingQty123)} m`} icon="time-outline" valueColor={theme.colors.warning} theme={theme} />
            <SummaryCard index={4} isTablet={isTablet} isMobile={isMobile} label="Allocation Pending" value={`${n(apcpendingQty)} m`} icon="time-outline" valueColor={theme.colors.warning} theme={theme} />
          </View>

          <View style={jobChartStyles.remainingRow}>
            <ResponsiveText style={[jobChartStyles.remainingText, { color: theme.colors.textMuted }]}>Remaining bulk order quantity: <ResponsiveText style={{ color: theme.colors.warning, fontWeight: '900' }}>{n(apcpendingQty)} m</ResponsiveText></ResponsiveText>
            {ref.isAllocation ? (
              <Pressable onPress={openCreate} style={[jobChartStyles.createButton, { backgroundColor: theme.colors.warning }]}>
                <Ionicons name="add" size={18} color="#111" />
                <ResponsiveText style={jobChartStyles.createButtonText}>Create new chart</ResponsiveText>
              </Pressable>
            ) : null}
          </View>

          <Section
            style={[
              jobChartStyles.allocationSection,
              isTablet && !isMobile && jobChartStyles.allocationSectionTablet,
              isMobile && jobChartStyles.allocationSectionMobile,
            ]}
            title="Allocation Details"
            subtitle={`${sortedDetails.length} chart${sortedDetails.length === 1 ? '' : 's'} • sorted by LastDate ascending`}
          >
            {loading ? (
              <View style={jobChartStyles.loading}><ActivityIndicator color={theme.colors.warning} /><ResponsiveText style={[jobChartStyles.loadingText, { color: theme.colors.textMuted }]}>Loading allocation details...</ResponsiveText></View>
            ) : (
              <View style={[jobChartStyles.tableWrap, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator
                  persistentScrollbar
                  nestedScrollEnabled
                  directionalLockEnabled
                >
                  <View style={{ minWidth: isMobile ? 860 : isTablet ? 980 : 1000 }}>
                    <View style={[jobChartStyles.tableHeader, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}>
                      <ResponsiveText style={[jobChartStyles.headerCell, jobChartStyles.chartCell, { color: theme.colors.textMuted }]}>CHART NO.</ResponsiveText>
                      <ResponsiveText style={[jobChartStyles.headerCell, jobChartStyles.dateCell, { color: theme.colors.textMuted }]}>DATE</ResponsiveText>
                      <ResponsiveText style={[jobChartStyles.headerCell, jobChartStyles.qtyCell, { color: theme.colors.textMuted }]}>TOTAL METER</ResponsiveText>
                      <ResponsiveText style={[jobChartStyles.headerCell, jobChartStyles.shadeCell, { color: theme.colors.textMuted }]}>SHADES</ResponsiveText>
                      <ResponsiveText style={[jobChartStyles.headerCell, jobChartStyles.statusCell, { color: theme.colors.textMuted }]}>STATUS</ResponsiveText>
                      {ref.isAllocation ? <ResponsiveText style={[jobChartStyles.headerCell, jobChartStyles.actionsCell, { color: theme.colors.textMuted }]}>ACTIONS</ResponsiveText> : null}
                    </View>
                    <ScrollView
                      style={jobChartStyles.tableVerticalScroll}
                      contentContainerStyle={jobChartStyles.tableVerticalContent}
                      showsVerticalScrollIndicator
                      persistentScrollbar
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      {sortedDetails.map((item, index) => (
                        <View key={`${item.LastDate || 'chart'}-${item.qty || 0}-${index}`}>
                          {renderDetail({ item, index })}
                        </View>
                      ))}
                      {!sortedDetails.length ? (
                        <View style={jobChartStyles.empty}>
                          <Ionicons name="layers-outline" size={32} color={theme.colors.textDim} />
                          <ResponsiveText style={[jobChartStyles.emptyTitle, { color: theme.colors.text }]}>No allocation charts found</ResponsiveText>
                        </View>
                      ) : null}
                    </ScrollView>
                  </View>
                </ScrollView>
              </View>
            )}
          </Section>
        </ScrollView>
        {confirmDialog.visible && (
          <View style={jobChartStyles.confirmOverlay} accessibilityViewIsModal>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeConfirmation} accessibilityLabel="Close confirmation" />
            <View style={[jobChartStyles.confirmCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={jobChartStyles.confirmIconWrap}>
                <Ionicons
                  name={confirmDialog.destructive ? 'warning-outline' : 'information-circle-outline'}
                  size={23}
                  color={confirmDialog.destructive ? theme.colors.danger : theme.colors.warning}
                />
              </View>
              <ResponsiveText style={[jobChartStyles.confirmTitle, { color: theme.colors.text }]}>{confirmDialog.title}</ResponsiveText>
              <ResponsiveText style={[jobChartStyles.confirmMessage, { color: theme.colors.textMuted }]}>{confirmDialog.message}</ResponsiveText>
              <View style={jobChartStyles.confirmActions}>
                <Pressable onPress={closeConfirmation} style={[jobChartStyles.confirmCancelButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSoft }]}>
                  <ResponsiveText style={[jobChartStyles.confirmCancelText, { color: theme.colors.textMuted }]}>Cancel</ResponsiveText>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    const action = confirmDialog.onConfirm;
                    closeConfirmation();
                    if (action) await action();
                  }}
                  style={[jobChartStyles.confirmButton, { backgroundColor: confirmDialog.destructive ? theme.colors.danger : theme.colors.warning }]}
                >
                  <ResponsiveText style={jobChartStyles.confirmButtonText}>{confirmDialog.confirmLabel}</ResponsiveText>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </AppShell>
  );
}

function SummaryCard({ index = 0, isTablet = false, isMobile = false, label, value, sub, icon, valueColor, theme }: any) {
  let cardStyle = jobChartStyles.summaryCardWeb;
  if (isMobile) {
    cardStyle = jobChartStyles.summaryCardMobile;
  } else if (isTablet) {
    cardStyle = jobChartStyles.summaryCardTablet;
  }

  return (
    <View style={[
      jobChartStyles.summaryCard,
      cardStyle,
      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
    ]}>
      <View style={jobChartStyles.summaryLabelRow}><Ionicons name={icon} size={14} color={valueColor || theme.colors.warning} /><ResponsiveText style={[jobChartStyles.summaryLabel, { color: theme.colors.textMuted }]}>{label}</ResponsiveText></View>
      <ResponsiveText style={[jobChartStyles.summaryValue, { color: valueColor || theme.colors.text }]}>{value}</ResponsiveText>
      {sub ? <ResponsiveText style={[jobChartStyles.summarySub, { color: theme.colors.textDim }]}>{sub}</ResponsiveText> : null}
    </View>
  );
}

// const jobChartStyles = StyleSheet.create({
//   editorPage: {
//     flexGrow: 1,
//     width: '100%',
//     maxWidth: 1050,
//     alignSelf: 'center',
//     paddingVertical: 18,
//     gap: 14,
//   },
//   editorTopBar: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     gap: 11,
//   },
//   editorScreenTitle: {
//     fontWeight: '900',
//     marginTop: 2,
//   },
//   editorScreenCard: {
//     width: '100%',
//     maxWidth: 900,
//     alignSelf: 'center',
//     borderWidth: 1,
//     borderRadius: 16,
//     padding: 18,
//     gap: 13,
//   },
//   formSection: {
//     gap: 7,
//   },
//   editorScreenScroll: {
//     flex: 1,
//     width: '100%',
//   },
//   countRow: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   countRowMobile: {
//     flexDirection: 'column',
//     alignItems: 'stretch',
//     gap: 10,
//   },
//   apcInlineField: {
//     flex: 1,
//     minWidth: 200,
//     gap: 5,
//   },
//   apcInlineDropdown: {
//     minHeight: 46,
//     borderWidth: 1,
//     borderRadius: 9,
//     paddingHorizontal: 11,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     gap: 8,
//   },
//   countInput: {
//     width: 105,
//     height: 46,
//     borderWidth: 1,
//     borderRadius: 9,
//     paddingHorizontal: 10,
//     fontSize: responsiveFontSize(11),
//   },
//   addCountButton: {
//     minWidth: 82,
//     height: 46,
//     borderWidth: 1,
//     borderRadius: 9,
//     paddingHorizontal: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 5,
//   },
//   editorShadeBlock: {
//     gap: 3,
//   },
//   editorShadeBlockMobile: {
//     width: '100%',
//   },
//   editorShadeRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   editorShadeRowMobile: {
//     flexWrap: 'wrap',
//     alignItems: 'stretch',
//   },
//   editorShadeNameBox: {
//     flex: 1,
//     minWidth: 130,
//     minHeight: 46,
//     borderWidth: 1,
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     gap: 7,
//   },
//   rowValidation: {
//     fontSize: responsiveFontSize(11),
//     marginLeft: 26,
//   },
//   validationError: {
//     fontSize: responsiveFontSize(11),
//     fontWeight: '800',
//     marginTop: 3,
//   },
//   noShadeBox: {
//     minHeight: 62,
//     borderWidth: 1,
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 9,
//   },
//   shadeChipWrap: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     alignItems: 'center',
//     gap: 6,
//   },
//   screenScroll: { flex: 1, width: '100%' },
//   page: { flexGrow: 1, gap: 14, paddingVertical: 14, minHeight: 650, maxWidth: 1500, width: '100%', alignSelf: 'center' },
//   topBar: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
//   back: { minHeight: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
//   backText: { fontSize: responsiveFontSize(11), fontWeight: '800' },
//   breadcrumb: { fontSize: responsiveFontSize(12), marginBottom: 4 },
//   title: { fontWeight: '900' },
//   subtitle: { fontSize: responsiveFontSize(11), marginTop: 3 },
//   summaryGrid: { flexDirection: 'row', gap: 10, flexWrap: 'nowrap' },
//   summaryGridTablet: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
//   summaryGridMobile: { flexDirection: 'column', flexWrap: 'nowrap' },
//   summaryCard: { minHeight: 88, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 12 },
//   summaryCardWeb: { flex: 1, minWidth: 0 },
//   summaryCardTablet: { width: '48%', minWidth: 200 },
//   summaryCardMobile: { width: '100%' },
//   allocationSection: { flex: 1, minHeight: 400, height: 'auto' },
//   allocationSectionTablet: { minHeight: 450 },
//   allocationSectionMobile: { minHeight: 500 },
//   summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
//   summaryLabel: { fontSize: responsiveFontSize(12), fontWeight: '700' },
//   summaryValue: { fontSize: responsiveFontSize(19), fontWeight: '900', marginTop: 8 },
//   summarySub: { fontSize: responsiveFontSize(11), marginTop: 2 },
//   remainingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
//   remainingText: { flex: 1, fontSize: responsiveFontSize(13) },
//   createButton: { minHeight: 40, borderRadius: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
//   createButtonText: { color: '#111', fontSize: responsiveFontSize(11), fontWeight: '900' },
//   editorCard: { borderWidth: 1, borderRadius: 15, padding: 15, gap: 10 },
//   editorHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
//   editorTitle: { fontSize: responsiveFontSize(19), fontWeight: '900' },
//   editorSub: { fontSize: responsiveFontSize(12), marginTop: 3 },
//   closeButton: { width: 34, height: 34, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
//   availableBox: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
//   availableLabel: { fontSize: responsiveFontSize(10) },
//   availableValue: { fontSize: responsiveFontSize(15), fontWeight: '900' },
//   formLabel: { fontSize: responsiveFontSize(12), fontWeight: '800' },
//   chartQtyInput: { height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, fontSize: responsiveFontSize(14) },
//   editorShadeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
//   editorHint: { fontSize: responsiveFontSize(11), lineHeight: responsiveLineHeight(17) },
//   editorShadeButtons: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' },
//   secondaryButton: { minHeight: 37, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
//   secondaryButtonText: { fontSize: responsiveFontSize(12), fontWeight: '800' },
//   editorShadeQty: { height: 40, borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, fontSize: responsiveFontSize(13) },
//   deleteButton: { height: 46, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
//   editorFooter: { borderTopWidth: 1, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
//   allocationState: { fontSize: responsiveFontSize(10) },
//   balanceState: { fontSize: responsiveFontSize(12), fontWeight: '900' },
//   editorActions: { flexDirection: 'row', gap: 8 },
//   cancelButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
//   cancelText: { fontSize: responsiveFontSize(11), fontWeight: '800' },
//   editorSaveButton: { flex: 1.7, minHeight: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
//   editorSaveText: { color: '#111', fontSize: responsiveFontSize(11), fontWeight: '900' },
//   tableWrap: { flex: 1, borderWidth: 1, borderRadius: 14, overflow: 'hidden', minHeight: 280 },
//   tableVerticalScroll: { flex: 1 },
//   tableVerticalContent: { flexGrow: 1 },
//   tableHeader: { minHeight: 38, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
//   headerCell: { fontSize: responsiveFontSize(11), fontWeight: '900' },
//   detailRow: { minHeight: 55, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
//   chartCell: { width: 100, paddingHorizontal: 12 },
//   dateCell: { width: 128, paddingHorizontal: 8 },
//   qtyCell: { width: 105, paddingHorizontal: 8, alignItems: 'flex-end' },
//   shadeCell: { width: 275, paddingHorizontal: 8 },
//   statusCell: { width: 145, paddingHorizontal: 8 },
//   actionsCell: { width: 115, paddingHorizontal: 8, flexDirection: 'row', gap: 6 },
//   chartNo: { fontSize: responsiveFontSize(12), fontWeight: '900' },
//   chartIdentityBox: {
//     minHeight: 54,
//     borderWidth: 1,
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     marginBottom: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   chartIdentityValue: { fontSize: responsiveFontSize(15), fontWeight: '900', marginTop: 2 },
//   cellText: { fontSize: responsiveFontSize(11), fontWeight: '600' },
//   qtyText: { fontSize: responsiveFontSize(12), fontWeight: '900' },
//   shadePill: { minHeight: 32, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%' },
//   shadeText: { fontSize: responsiveFontSize(12), maxWidth: 230 },
//   confirmed: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
//   confirmedText: { fontSize: responsiveFontSize(11), fontWeight: '900' },
//   iconButton: { width: 32, height: 32, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
//   loading: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 8 },
//   loadingText: { fontSize: responsiveFontSize(10) },
//   empty: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 7, padding: 15 },
//   emptyTitle: { fontSize: responsiveFontSize(13), fontWeight: '900' },
//   confirmOverlay: {
//     position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
//     zIndex: 2000, elevation: 20, alignItems: 'center', justifyContent: 'center',
//     paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.62)',
//   },
//   confirmCard: {
//     width: '100%', maxWidth: 470, borderWidth: 1, borderRadius: 16,
//     padding: 20, gap: 12, shadowOpacity: 0.28, shadowRadius: 18,
//     shadowOffset: { width: 0, height: 8 }, elevation: 12,
//   },
//   confirmIconWrap: {
//     width: 42, height: 42, borderRadius: 12, alignItems: 'center',
//     justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.045)',
//     borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
//   },
//   confirmTitle: { fontSize: responsiveFontSize(18), fontWeight: '900', lineHeight: responsiveLineHeight(24) },
//   confirmMessage: { fontSize: responsiveFontSize(13), lineHeight: responsiveLineHeight(20) },
//   confirmActions: { flexDirection: 'row', gap: 9, marginTop: 5 },
//   confirmCancelButton: {
//     flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 10,
//     alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
//   },
//   confirmCancelText: { fontSize: responsiveFontSize(13), fontWeight: '800' },
//   confirmButton: {
//     flex: 1, minHeight: 46, borderRadius: 10, alignItems: 'center',
//     justifyContent: 'center', paddingHorizontal: 12,
//   },
//   confirmButtonText: { color: '#111', fontSize: responsiveFontSize(13), fontWeight: '900', textAlign: 'center' },
//   pickerOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 1000, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
//   pickerSheet: { width: '100%', maxHeight: '90%', minHeight: 300, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, padding: 14 },
//   pickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
//   pickerTitle: { fontSize: responsiveFontSize(15), fontWeight: '900' },
//   shadeSearch: { height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
//   shadeSearchInput: { flex: 1, fontSize: responsiveFontSize(13) },
//   pickerRow: { minHeight: 56, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
//   pickerShadeName: { fontSize: responsiveFontSize(12), fontWeight: '800' },
//   apcPickerListContent: { paddingBottom: 8 },
//   apcPickerChartRow: {
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//   },
//   apcPickerChartMain: {
//     flex: 1,
//     minWidth: 0,
//     gap: 9,
//   },
//   apcPickerChartTitleRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   apcPickerShadeWrap: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     alignItems: 'center',
//     gap: 6,
//   },
//   apcPickerShadePill: {
//     minHeight: 30,
//     maxWidth: '100%',
//     borderWidth: 1,
//     borderRadius: 8,
//     paddingHorizontal: 9,
//     justifyContent: 'center',
//   },
//   apcPickerShadeText: {
//     fontSize: responsiveFontSize(11),
//     fontWeight: '700',
//     maxWidth: 180,
//   },
// });

const jobChartStyles = StyleSheet.create({
  // ----- Editor screen (create/edit) -----
  editorPage: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
    paddingVertical: 18,
    gap: 14,
  },
  editorTopBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  editorScreenTitle: {
    fontWeight: '900',
    marginTop: 2,
    fontSize: responsiveFontSize(20), // responsive
  },
  editorScreenCard: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 13,
  },
  formSection: {
    gap: 7,
  },
  editorScreenScroll: {
    flex: 1,
    width: '100%',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  countRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  apcInlineField: {
    flex: 1,
    minWidth: 200,
    gap: 5,
  },
  apcInlineDropdown: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  countInput: {
    width: 105,
    height: 46,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    fontSize: responsiveFontSize(11),
  },
  addCountButton: {
    minWidth: 82,
    height: 46,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  editorShadeBlock: {
    gap: 3,
  },
  editorShadeBlockMobile: {
    width: '100%',
  },
  editorShadeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editorShadeRowMobile: {
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  editorShadeNameBox: {
    flex: 1,
    minWidth: 130,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
  },
  rowValidation: {
    fontSize: responsiveFontSize(11),
    marginLeft: 26,
  },
  validationError: {
    fontSize: responsiveFontSize(11),
    fontWeight: '800',
    marginTop: 3,
  },
  noShadeBox: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  shadeChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  // ----- Main screen -----
  screenScroll: { flex: 1, width: '100%' },
  page: {
    flexGrow: 1,
    gap: 14,
    paddingVertical: 14,
    minHeight: 650,
    maxWidth: 1500,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  back: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  backText: { fontSize: responsiveFontSize(11), fontWeight: '800' },
  breadcrumb: { fontSize: responsiveFontSize(12), marginBottom: 4 },
  title: { fontWeight: '900' },
  subtitle: { fontSize: responsiveFontSize(11), marginTop: 3 },
  // ----- Summary Grid -----
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'nowrap',
  },
  summaryGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryGridMobile: {
    flexDirection: 'row',     // ← 2‑column layout
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  summaryCardWeb: {
    flex: 1,
    minWidth: 0,
  },
  summaryCardTablet: {
    width: '48%',
    minWidth: 200,
  },
  summaryCardMobile: {
    width: '48%',             // ← two per row
    minWidth: 0,
    marginBottom: 4,
  },
  // ----- Allocation section -----
  allocationSection: {
    flex: 1,
    minHeight: 400,
    height: 'auto',
  },
  allocationSectionTablet: { minHeight: 450 },
  allocationSectionMobile: { minHeight: 500 },
  // ----- Summary card internals -----
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  summaryLabel: {
    fontSize: responsiveFontSize(11),   // reduced
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: responsiveFontSize(17),   // reduced
    fontWeight: '900',
    marginTop: 8,
  },
  summarySub: {
    fontSize: responsiveFontSize(10),
    marginTop: 2,
  },
  remainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  remainingText: {
    flex: 1,
    fontSize: responsiveFontSize(13),
  },
  createButton: {
    minHeight: 40,
    borderRadius: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  createButtonText: {
    color: '#111',
    fontSize: responsiveFontSize(11),
    fontWeight: '900',
  },
  // ----- Editor card -----
  editorCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    gap: 10,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editorTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '900',
  },
  editorSub: {
    fontSize: responsiveFontSize(11),
    marginTop: 3,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableBox: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availableLabel: { fontSize: responsiveFontSize(10) },
  availableValue: {
    fontSize: responsiveFontSize(15),
    fontWeight: '900',
  },
  formLabel: {
    fontSize: responsiveFontSize(11),
    fontWeight: '800',
  },
  chartQtyInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    fontSize: responsiveFontSize(14),
  },
  editorShadeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editorHint: {
    fontSize: responsiveFontSize(11),
    lineHeight: responsiveLineHeight(17),
  },
  editorShadeButtons: {
    flexDirection: 'row',
    gap: 7,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    minHeight: 37,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  secondaryButtonText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '800',
  },
  editorShadeQty: {
    height: 40,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 9,
    fontSize: responsiveFontSize(13),
  },
  deleteButton: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  allocationState: { fontSize: responsiveFontSize(10) },
  balanceState: {
    fontSize: responsiveFontSize(12),
    fontWeight: '900',
  },
  editorActions: { flexDirection: 'row', gap: 8 },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '800',
  },
  editorSaveButton: {
    flex: 1.7,
    minHeight: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editorSaveText: {
    color: '#111',
    fontSize: responsiveFontSize(11),
    fontWeight: '900',
  },
  // ----- Table -----
  tableWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 280,
  },
  tableVerticalScroll: { flex: 1 },
  tableVerticalContent: { flexGrow: 1 },
  tableHeader: {
    minHeight: 38,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCell: {
    fontSize: responsiveFontSize(11),
    fontWeight: '900',
  },
  detailRow: {
    minHeight: 55,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  chartCell: { width: 100, paddingHorizontal: 12 },
  dateCell: { width: 128, paddingHorizontal: 8 },
  qtyCell: { width: 105, paddingHorizontal: 8, alignItems: 'flex-end' },
  shadeCell: { width: 275, paddingHorizontal: 8 },
  statusCell: { width: 145, paddingHorizontal: 8 },
  actionsCell: { width: 115, paddingHorizontal: 8, flexDirection: 'row', gap: 6 },
  chartNo: {
    fontSize: responsiveFontSize(12),
    fontWeight: '900',
  },
  chartIdentityBox: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartIdentityValue: {
    fontSize: responsiveFontSize(15),
    fontWeight: '900',
    marginTop: 2,
  },
  cellText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
  },
  qtyText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '900',
  },
  shadePill: {
    minHeight: 32,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  shadeText: {
    fontSize: responsiveFontSize(11), // reduced
    maxWidth: 230,
  },
  confirmed: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  confirmedText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '900',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: { fontSize: responsiveFontSize(10) },
  empty: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: 15,
  },
  emptyTitle: {
    fontSize: responsiveFontSize(13),
    fontWeight: '900',
  },
  // ----- Confirm dialogs -----
  confirmOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 2000,
    elevation: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 470,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  confirmIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  confirmTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '900',
    lineHeight: responsiveLineHeight(24),
  },
  confirmMessage: {
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveLineHeight(20),
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 5,
  },
  confirmCancelButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  confirmCancelText: {
    fontSize: responsiveFontSize(13),
    fontWeight: '800',
  },
  confirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  confirmButtonText: {
    color: '#111',
    fontSize: responsiveFontSize(13),
    fontWeight: '900',
    textAlign: 'center',
  },
  // ----- Shade picker -----
  pickerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pickerSheet: {
    width: '100%',
    maxHeight: '90%',
    minHeight: 300,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  pickerTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: '900',
  },
  shadeSearch: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  shadeSearchInput: {
    flex: 1,
    fontSize: responsiveFontSize(13),
  },
  pickerRow: {
    minHeight: 56,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerShadeName: {
    fontSize: responsiveFontSize(12),
    fontWeight: '800',
  },
  apcPickerListContent: { paddingBottom: 8 },
  apcPickerChartRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  apcPickerChartMain: {
    flex: 1,
    minWidth: 0,
    gap: 9,
  },
  apcPickerChartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  apcPickerShadeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  apcPickerShadePill: {
    minHeight: 30,
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    justifyContent: 'center',
  },
  apcPickerShadeText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '700',
    maxWidth: 180,
  },
});
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
  allocationPendingPill: {
    minHeight: 30,
    maxWidth: 160,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  allocationPendingText: {
    fontSize: 10,
    fontWeight: '900',
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

});

export default React.memo(SalesOrderTracking);
