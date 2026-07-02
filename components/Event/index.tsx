// import React, { useCallback, useEffect, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Image,
//   Modal,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View
// } from 'react-native';
// // import { Picker } from '@react-native-picker/picker';
// import HeaderBarwithBack from '@/components/Header';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {
//   captureCardPhoto,
//   isOnline,
//   scanVisitingCard,
// } from './CardScanService';
// import { getAllEnquiries, getCachedDesign, getCachedEvents, getCachedItem, insertEnquiry } from './db';
// import { syncShowEnquiries, updateEnquiries } from './syncService';
// // import { launchImageLibrary } from 'react-native-image-picker';
// import FullScreenLoader from '@/components/FullScreenLoader';
// import theme from '@/components/theme';
// import * as ImagePicker from 'expo-image-picker';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import { API } from '../../common/API/dynamicAPI';
// import { getCurrentFinancialYear } from '../../common/commonfunction';
// import { abortSync, startSyncQueue } from './syncQueue';

// const DESIGNATIONS = [
//   'Owner', 'Partner', 'Director', 'Purchase Manager',
//   'Merchandiser', 'Designer', 'Sales Head', 'Proprietor', 'Other',
// ];

// export default function NewEnquiryScreen({ token, username }) {
//   const router = useRouter();
//   const params = useLocalSearchParams();
//   const { id } = params || '';
//   const [getUserPrptype, setUserPrptype] = useState<string>('');
//   const [mode, setMode] = useState('');
//   const [partyName, setPartyName] = useState('');
//   const [address, setAddress] = useState('');
//   const [gstNo, setGstNo] = useState('');
//   const [designRequirement, setDesignRequirement] = useState('Existing design');
//   const [qtyRequired, setQtyRequired] = useState('');
//   const [price, setPrice] = useState('');
//   const [colourRequirement, setColourRequirement] = useState('');
//   const [contactName, setContactName] = useState('');
//   const [designation, setDesignation] = useState();
//   const [mobile, setMobile] = useState('');
//   const [email, setEmail] = useState('');
//   const [front_img, setFronImage] = useState('');
//   const [front_path, setFrontPath] = useState('');
//   const [cardFields, setCardFields] = useState({});
//   const [getToken, setToken] = useState('');
//   const [cardFrontUri, setCardFrontUri] = useState();
//   const [backUri, setBackUri] = useState();
//   const [front_off_Uri, setFront_off_Uri] = useState();
//   const [backUriPath, setBackUriPath] = useState('');
//   const [scannedFromCard, setScannedFromCard] = useState(false);
//   const [scanning, setScanning] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [online, setOnline] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [enquiries, setEnquiries] = useState([]);
//   const [eventCode, setEventCode] = useState();
//   const [EVENTS, setEVENTS] = useState([]);
//   const [debugModalVisible, setDebugModalVisible] = useState(false);
//   const [debugData, setDebugData] = useState([]);
//   const [syncStatus, setSyncStatus] = useState({
//     visible: false,
//     message: '',
//     isSyncing: false,
//     total: 0,
//     synced: 0,
//     failed: 0,
//     currentItemName: '',
//     validationErrors: null,
//     failedItems: [], // Store failed items for retry
//   });
//   const [designTab, setDesignTab] = useState();
//   const [designDsnName, setDesignDsnName] = useState('');
//   const [designDsnCode, setDesignDsnCode] = useState('');
//   const [itemDsnName, setItemDsnName] = useState('');
//   const [itemDsnCode, setItemDsnCode] = useState('');
//   // const [designs, setDesigns] = useState([]);
//   // Near other state declarations
//   const [allDesigns, setAllDesigns] = useState([]);         // full list from cache
//   const [displayedDesigns, setDisplayedDesigns] = useState([]); // current page items
//   const [allItems, setAllItems] = useState([]);         // full list from cache
//   const [displayedItems, setDisplayedItems] = useState([]); // current page items
//   const [currentPage, setCurrentPage] = useState(1);
//   const [hasMore, setHasMore] = useState(false);
//   const [hasMoreItem, setHasMoreItem] = useState(false);
//   const pageSize = 10; // number of items per page
//   const [selectedDesign, setSelectedDesign] = useState(null);
//   const [designSearchQuery, setDesignSearchQuery] = useState('');
//   const [selectedItem, setSelectedItem] = useState(null);
//   const [itemSearchQuery, setItemSearchQuery] = useState('');
//   const [loadingDesigns, setLoadingDesigns] = useState(false);
//   const [loadingItems, setLoadingItems] = useState(false);
//   const [designPage, setDesignPage] = useState(1);
//   const [designModalVisible, setDesignModalVisible] = useState(false);
//   const [itemModalVisible, setItemModalVisible] = useState(false);
//   // State for showing failed items modal
//   const [failedItemsModalVisible, setFailedItemsModalVisible] = useState(false);
//   const [failedItemsList, setFailedItemsList] = useState([]);
//   const [eventModalVisible, setEventModalVisible] = useState(false);

//   useEffect(() => {
//     const initializeApp = async () => {
//       try {
//         const user_prptype = await AsyncStorage.getItem('user_prptype');
//         console.log('user_prptype', user_prptype);
//         setUserPrptype(user_prptype);
//       } catch (error) {
//         console.error('Initialization error:', error);
//       }
//     };

//     initializeApp();
//   }, [token, getUserPrptype]);

//   const getImageUri = (uri) => {
//     if (!uri) return null;

//     if (
//       uri.startsWith('http://') ||
//       uri.startsWith('https://') ||
//       uri.startsWith('file://') ||
//       uri.startsWith('content://')
//     ) {
//       return uri;
//     }

//     return `${API}/${uri}`;
//   };

//   useEffect(() => {
//     if (!token) return;
//     setToken(token);
//     getCachedEvents();
//     checkConnectivity();
//   }, [token]);

//   useEffect(() => {
//     if (id && id) {
//       if (!token) return;

//       const loadData = async () => {
//         setLoading(true);
//         try {
//           const user_prptype = await AsyncStorage.getItem('user_prptype');
//           const result = await syncShowEnquiries(id, token, getCurrentFinancialYear(), user_prptype);

//           console.log('API RESULT =>', getCurrentFinancialYear(), user_prptype, result);

//           setEnquiries(result);
//           // if (result) {

//           // }

//           if (result.party_name) setPartyName(result.party_name);
//           if (result.address) setAddress(result.address);
//           if (result.gst_no) setGstNo(result.gst_no);
//           if (result.contact_name) setContactName(result.contact_name);
//           if (result.mobile) setMobile(result.mobile);
//           if (result.email) setEmail(result.email);
//           if (result.front_img) setFronImage(result.front_img);
//           if (result.front_img_path) setFrontPath(result.front_img_path);
//           if (result.back_img) setBackUri(result.back_img);
//           if (result.back_img_path) setBackUriPath(result.back_img_path);
//           if (result.qty_required) setQtyRequired(result.qty_required);
//           if (result.event_code) setEventCode(result.event_code);
//           if (result.designation) setDesignation(result.designation);
//           if (result.design_dsn_name) setDesignDsnName(result.design_dsn_name);
//           if (result.design_dsn_code) setDesignDsnCode(result.design_dsn_code);
//           if (result.design_requirement) setDesignTab(result.design_requirement);
//           if (result.design_dsn_name && result.design_dsn_code && result.design_requirement === 'Existing') {
//             const dsn = {
//               name: result?.design_dsn_name,
//               dsn_code: result?.design_dsn_code
//             };
//             console.log('EXISTING DSN', dsn);
//             if (result.design_requirement) setSelectedDesign(dsn);
//           }
//           setMode('edit');
//         } catch (err) {
//           setLoading(false);
//           console.log('LOAD ERROR =>', err);
//         }
//       };

//       loadData();
//     } else {
//       setDesignTab('Existing');
//       setDesignation('Purchase Manager');
//       setMode('added');
//     }
//   }, [token, id]);

//   console.log("enquiries: ", enquiries);

//   const loadAllEnquiries = async () => {
//     try {
//       const all = await getAllEnquiries();
//       setDebugData(all);
//       setDebugModalVisible(true);
//     } catch (err) {
//       Alert.alert('Error', 'Failed to load local data');
//       console.log(err);
//     }
//   };

//   const EVENTS_CACHE_KEY = 'cached_events';
//   const DESIGNS_CACHE_KEY = 'cached_designs';

//   const loadEvent = useCallback(async () => {
//     setLoading(true);
//     try {
//       const eventsString = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
//       if (eventsString) {
//         const events = JSON.parse(eventsString);
//         if (events && events.length > 0) {
//           setEVENTS(events);
//           setEventCode(events[0].EventId);
//           console.log('Loaded events from cache', events);
//         } else {
//           console.log('Cached events array is empty');
//         }
//       } else {
//         console.log('No cached events found');
//       }
//     } catch (err) {
//       console.log('Failed to load cached events', err);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const loadDesing = useCallback(async () => {
//     if (loadingDesigns) return;
//     setLoadingDesigns(true);

//     try {
//       const cached = await getCachedDesign();
//       if (!cached || cached.length === 0) {
//         setAllDesigns([]);
//         setDisplayedDesigns([]);
//         setHasMore(false);
//       } else {
//         setAllDesigns(cached);
//         // The useEffect below will filter and set the first page
//       }
//     } catch (err) {
//       console.log('Failed to load cached designs', err);
//     } finally {
//       setLoadingDesigns(false);
//     }
//   }, []);

//   const loadItems = useCallback(async () => {
//     if (loadingItems) return;
//     setLoadingItems(true);

//     try {
//       const cached = await getCachedItem();
//       if (!cached || cached.length === 0) {
//         setAllItems([]);
//         setDisplayedItems([]);
//         setHasMoreItem(false);
//       } else {
//         setAllItems(cached);
//         // The useEffect below will filter and set the first page
//       }
//     } catch (err) {
//       console.log('Failed to load cached items', err);
//     } finally {
//       setLoadingItems(false);
//     }
//   }, []);

//   // Filter and paginate whenever the full list or search query changes
//   useEffect(() => {
//     if (allDesigns.length === 0) {
//       setDisplayedDesigns([]);
//       setHasMore(false);
//       return;
//     }

//     const q = designSearchQuery.toLowerCase().trim();
//     const filtered = q
//       ? allDesigns.filter(d =>
//         (d.name || '').toLowerCase().includes(q) ||
//         String(d.dsn_code || '').toLowerCase().includes(q)
//       )
//       : allDesigns;

//     // Reset to first page
//     setCurrentPage(1);
//     const firstPageItems = filtered.slice(0, pageSize);
//     setDisplayedDesigns(firstPageItems);
//     setHasMore(filtered.length > pageSize);
//   }, [allDesigns, designSearchQuery]);

//   const loadMoreDesigns = useCallback(() => {
//     if (loadingDesigns || !hasMore) return;

//     const q = designSearchQuery.toLowerCase().trim();
//     const filtered = q
//       ? allDesigns.filter(d =>
//         (d.name || '').toLowerCase().includes(q) ||
//         String(d.dsn_code || '').toLowerCase().includes(q)
//       )
//       : allDesigns;

//     const start = displayedDesigns.length;
//     const end = start + pageSize;
//     const nextItems = filtered.slice(start, end);

//     if (nextItems.length === 0) {
//       setHasMore(false);
//       return;
//     }

//     setDisplayedDesigns(prev => [...prev, ...nextItems]);
//     setHasMore(end < filtered.length);
//   }, [loadingDesigns, hasMore, designSearchQuery, allDesigns, displayedDesigns.length]);



//   useEffect(() => {
//     if (allItems.length === 0) {
//       setDisplayedItems([]);
//       setHasMoreItem(false);
//       return;
//     }

//     const q = itemSearchQuery.toLowerCase().trim();
//     const filtered = q
//       ? allItems.filter(d =>
//         (d.name || '').toLowerCase().includes(q) ||
//         String(d.dsn_code || '').toLowerCase().includes(q)
//       )
//       : allItems;

//     // Reset to first page
//     setCurrentPage(1);
//     const firstPageItems = filtered.slice(0, pageSize);
//     setDisplayedItems(firstPageItems);
//     setHasMoreItem(filtered.length > pageSize);
//   }, [allItems, itemSearchQuery]);

//   const loadMoreItems = useCallback(() => {
//     if (loadingItems || !hasMoreItem) return;

//     const q = itemSearchQuery.toLowerCase().trim();
//     const filtered = q
//       ? allItems.filter(d =>
//         (d.name || '').toLowerCase().includes(q) ||
//         String(d.dsn_code || '').toLowerCase().includes(q)
//       )
//       : allItems;

//     const start = displayedItems.length;
//     const end = start + pageSize;
//     const nextItems = filtered.slice(start, end);

//     if (nextItems.length === 0) {
//       setHasMoreItem(false);
//       return;
//     }

//     setDisplayedItems(prev => [...prev, ...nextItems]);
//     setHasMoreItem(end < filtered.length);
//   }, [loadingItems, hasMoreItem, itemSearchQuery, allItems, displayedItems.length]);


//   useEffect(() => {
//     if (!token) return;

//     const checkAndStartSync = async () => {
//       const online = await isOnline();
//       if (!online) return;

//       const pending = await getAllEnquiries();
//       if (pending.length > 0) {
//         startSyncQueue(getToken, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress);
//       }
//     };

//     checkAndStartSync();
//   }, [token, getUserPrptype]);

//   // Sync progress handler - IMPROVED to collect failed items
//   const handleSyncProgress = useCallback((progress) => {
//     switch (progress.type) {
//       case 'start':
//         setSyncStatus({
//           visible: true,
//           isSyncing: true,
//           message: `Syncing ${progress.total} pending enquiries...`,
//           total: progress.total,
//           synced: 0,
//           failed: 0,
//           currentItemName: '',
//           validationErrors: null,
//           failedItems: [],
//         });
//         break;
//       case 'progress':
//         setSyncStatus(prev => ({
//           ...prev,
//           currentItemName: progress.currentItem.party_name || progress.currentItem.local_id
//         }));
//         break;
//       case 'item_done':
//         // Collect failed items for later display
//         setSyncStatus(prev => {
//           const newFailedItems = [...prev.failedItems];
//           if (!progress.success && progress.enquiry) {
//             // Add the failed enquiry to the list if not already there
//             const exists = newFailedItems.some(item => item.local_id === progress.enquiry.local_id);
//             if (!exists) {
//               newFailedItems.push({
//                 ...progress.enquiry,
//                 error: progress.error || 'Sync failed'
//               });
//             }
//           }
//           return {
//             ...prev,
//             synced: progress.syncedCount,
//             failed: progress.failedCount,
//             currentItemName: '',
//             failedItems: newFailedItems,
//           };
//         });
//         break;
//       case 'all_done':
//         // अगर कुल sync कुछ नहीं हुआ तो banner छुपा दो
//         if (progress.syncedCount === 0 && progress.failedCount === 0) {
//           setSyncStatus({
//             visible: false,
//             isSyncing: false,
//             message: '',
//             total: 0,
//             synced: 0,
//             failed: 0,
//             currentItemName: '',
//             validationErrors: null,
//             failedItems: [],
//           });
//         } else {
//           setSyncStatus(prev => ({
//             ...prev,
//             visible: true,
//             isSyncing: false,
//             message: `All data synced successfully! (Synced: ${progress.syncedCount}, Failed: ${progress.failedCount})`,
//             total: progress.syncedCount + progress.failedCount,
//             synced: progress.syncedCount,
//             failed: progress.failedCount,
//             currentItemName: '',
//             validationErrors: null,
//           }));
//         }
//         break;
//       case 'error':
//         setSyncStatus({
//           visible: true,
//           isSyncing: false,
//           message: `Sync error: ${progress.message}`,
//           total: 0,
//           synced: 0,
//           failed: 0,
//           currentItemName: '',
//           validationErrors: null,
//           failedItems: [],
//         });
//         break;
//       case 'aborted':
//         setSyncStatus({
//           visible: true,
//           isSyncing: false,
//           message: 'Sync cancelled',
//           total: 0,
//           synced: 0,
//           failed: 0,
//           currentItemName: '',
//           validationErrors: null,
//           failedItems: [],
//         });
//         break;
//       case 'validation_error':
//         setSyncStatus(prev => ({
//           ...prev,
//           visible: true,
//           isSyncing: false,
//           message: `⚠️ Validation failed for ${progress.enquiry?.party_name || progress.enquiry?.local_id || 'enquiry'}`,
//           validationErrors: progress.errors,
//           synced: progress.syncedCount,
//           failed: progress.failedCount,
//           currentItemName: progress.enquiry?.party_name || progress.enquiry?.local_id,
//           failedItems: prev.failedItems || [],
//         }));
//         break;
//     }
//   }, []);

//   useEffect(() => {
//     if (!token) return;
//     loadEvent();
//   }, [token]);

//   const handleDesignSearch = (query) => {
//     setDesignSearchQuery(query);
//     // Resetting page and reloading is handled by useEffect below
//   };

//   const handleItemSearch = (query) => {
//     setItemSearchQuery(query);
//     // Resetting page and reloading is handled by useEffect below
//   };

//   console.log("default EventId: ", eventCode);

//   async function checkConnectivity() {
//     const result = await isOnline();
//     setOnline(result);
//     //  setOnline(false);
//   }

//   console.log("Online status :", online);

//   async function handleScanCard() {
//     if (!getToken) return;
//     await checkConnectivity();
//     const currentlyOnline = await isOnline();

//     if (!currentlyOnline) {
//       Alert.alert(
//         'No internet',
//         "Card scan needs internet. You're offline right now — please fill the details manually, or try scanning again once you're back online."
//       );
//       return;
//     }

//     try {
//       const uri = await captureCardPhoto();
//       if (!uri) return;

//       setScanning(true);

//       const fields = await scanVisitingCard(uri, getToken);

//       console.log('SCAN RESULT =>', fields);

//       if (fields.party_name && !partyName) {
//         setPartyName(fields.party_name);
//         setCardFields(prev => ({ ...prev, party_name: true }));
//       }
//       if (fields.address && !address) {
//         setAddress(fields.address);
//         setCardFields(prev => ({ ...prev, address: true }));
//       }
//       if (fields.gst_no && !gstNo) {
//         setGstNo(fields.gst_no);
//         setCardFields(prev => ({ ...prev, gst_no: true }));
//       }
//       if (fields.contact_name && !contactName) {
//         setContactName(fields.contact_name);
//         setCardFields(prev => ({ ...prev, contact_name: true }));
//       }
//       if (fields.mobile && !mobile) {
//         setMobile(fields.mobile);
//         setCardFields(prev => ({ ...prev, mobile: true }));
//       }
//       if (fields.email && !email) {
//         setEmail(fields.email);
//         setCardFields(prev => ({ ...prev, email: true }));
//       }
//       if (fields.front_img && !front_img) setFronImage(fields.front_img);
//       if (fields.front_img_path && !front_path) setFrontPath(fields.front_img_path);

//       setScannedFromCard(true);
//       Alert.alert('Card scanned', 'Details filled in below — please check them before saving.');
//     } catch (err) {
//       setCardFrontUri(null);
//       setFronImage('');
//       setFrontPath('');
//       setScannedFromCard(false);
//       if (err.message === 'OFFLINE') {
//         Alert.alert('No internet', 'Lost connection during scan. Please fill details manually.');
//       } else if (err.message === 'CAMERA_PERMISSION_DENIED') {
//         Alert.alert('Camera permission needed', 'Please allow camera access to scan a card.');
//       } else {
//         Alert.alert('Scan failed', "Couldn't read the card clearly. Please try again or enter details manually.");
//       }
//     } finally {
//       setScanning(false);
//     }
//   }

//   console.log('front_img_path', front_path);

//   async function handleUploadCard(token) {
//     if (!getToken) return;
//     await checkConnectivity();
//     const currentlyOnline = await isOnline();

//     if (!currentlyOnline) {
//       Alert.alert(
//         'No internet',
//         "Card scan needs internet. You're offline right now — please fill the details manually, or try scanning again once you're back online."
//       );
//       return;
//     }
//     try {

//       // const res = await launchImageLibrary({
//       //   mediaType: 'photo',
//       //   selectionLimit: 1,
//       //   quality: 0.8,
//       // });

//       // console.log('Img res', res);

//       // if (!res) {
//       //   return;
//       // }

//       // console.log('Img res 1', res?.assets?.[0]);

//       // const uri = res.assets[0].uri;
//       const permission =
//         await ImagePicker.requestMediaLibraryPermissionsAsync();

//       if (!permission.granted) {
//         Alert.alert(
//           "Permission required",
//           "Please allow gallery permission."
//         );
//         return;
//       }

//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: false,
//         quality: 0.8,
//       });

//       if (result.canceled) return;

//       const uri = result.assets[0].uri;

//       console.log('Frontend IMAGE', uri);

//       setScanning(true);

//       const fields = await scanVisitingCard(uri, getToken);

//       if (fields.party_name) {
//         setPartyName(fields.party_name);
//         setCardFields(prev => ({ ...prev, party_name: true }));
//       }
//       if (fields.address) {
//         setAddress(fields.address);
//         setCardFields(prev => ({ ...prev, address: true }));
//       }
//       if (fields.gst_no) {
//         setGstNo(fields.gst_no);
//         setCardFields(prev => ({ ...prev, gst_no: true }));
//       }
//       if (fields.contact_name) {
//         setContactName(fields.contact_name);
//         setCardFields(prev => ({ ...prev, contact_name: true }));
//       }
//       if (fields.mobile) {
//         setMobile(fields.mobile);
//         setCardFields(prev => ({ ...prev, mobile: true }));
//       }
//       if (fields.email) {
//         setEmail(fields.email);
//         setCardFields(prev => ({ ...prev, email: true }));
//       }
//       if (fields.front_img) setFronImage(fields.front_img);
//       if (fields.front_img_path) setFrontPath(fields.front_img_path);

//       setScannedFromCard(true);
//       Alert.alert('Card scanned', 'Details filled in below — please check them before saving.');
//     } catch (err) {

//       setCardFrontUri(null);
//       setFronImage('');
//       setFrontPath('');
//       setScannedFromCard(false);
//       console.error('CARD SCAN ERROR', err);
//       Alert.alert(
//         'Scan failed',
//         'Could not read card. Please upload another image.'
//       );
//     } finally {
//       setScanning(false);
//     }
//   }

//   console.log("cardFrontUri: ", cardFrontUri);

//   async function handleUploadBackSide() {
//     try {
//       // const res = await launchImageLibrary({
//       //   mediaType: 'photo',
//       //   selectionLimit: 1,
//       //   quality: 0.8,
//       // });

//       // if (!res) {
//       //   return;
//       // }

//       // const uri = res.assets[0].uri;

//       const permission =
//         await ImagePicker.requestMediaLibraryPermissionsAsync();

//       if (!permission.granted) {
//         Alert.alert(
//           "Permission required",
//           "Please allow gallery permission."
//         );
//         return;
//       }

//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: false,
//         quality: 0.8,
//       });

//       if (result.canceled) return;

//       const uri = result.assets[0].uri;

//       console.log('BACK IMAGE', uri);

//       setBackUri(uri);

//     } catch (err) {
//       console.log('BACK IMAGE ERROR', err);
//     }
//   }

//   async function handleUploadFront_off_Side() {
//     try {
//       // const res = await launchImageLibrary({
//       //   mediaType: 'photo',
//       //   selectionLimit: 1,
//       //   quality: 0.8,
//       // });

//       // if (!res) {
//       //   return;
//       // }

//       // const uri = res.assets[0].uri;

//       // console.log('BACK IMAGE', uri);

//       // setFront_off_Uri(uri);
//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         quality: 0.8,
//       });

//       if (result.canceled) return;

//       setFront_off_Uri(result.assets[0].uri);

//     } catch (err) {
//       console.log('BACK IMAGE ERROR', err);
//     }
//   }

//   // Helper function to reset all form fields
//   const resetFormFields = () => {
//     setPartyName('');
//     setAddress('');
//     setGstNo('');
//     setDesignRequirement('Existing design');
//     setQtyRequired('');
//     setPrice('');
//     setColourRequirement('');
//     setContactName('');
//     setDesignation('Purchase Manager');
//     setMobile('');
//     setEmail('');
//     setFronImage('');
//     setFrontPath('');
//     setCardFrontUri('');
//     setBackUri('');
//     setBackUriPath('');
//     setScannedFromCard(false);
//     setDesignTab('Existing');
//     setDesignDsnName('');
//     setDesignDsnCode('');
//     setSelectedDesign(null);
//     setSelectedItem(null);
//     setFront_off_Uri('');
//     setCardFields({});
//   };

//   async function handleSave(mode) {
//     console.log('mode at save time :', mode);
//     // ... validation checks ...

//     if (!partyName.trim()) {
//       Alert.alert('Party name required', 'Please enter the company / party name.');
//       return;
//     }
//     if (!qtyRequired.trim()) {
//       Alert.alert('Quantity required', 'Please enter the required quantity.');
//       return;
//     }

//     if (!email) {
//       Alert.alert('Email required', 'Please enter the email.');
//       return;
//     }
//     // Email Validayion
//     if (!email) {
//       Alert.alert('Email required', 'Please enter the email.');
//       return;
//     }

//     // Email Validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       Alert.alert('Invalid Email', 'Please enter a valid email address.');
//       return;
//     }

//     if (!mobile) {
//       Alert.alert('Mobile number required', 'Please enter the mobile number.');
//       return;
//     }

//     setSaving(true);
//     try {
//       const userJson = await AsyncStorage.getItem('user_id');
//       const user = userJson ? JSON.parse(userJson) : null;
//       if (!user) {
//         Alert.alert('Not logged in', 'Please log in again before saving.');
//         setSaving(false);
//         return;
//       }

//       // auto index generate new  every time number
//       const index = Math.floor(Math.random() * 1000);

//       // Prepare payload
//       const payload = {
//         ...enquiries,
//         user_id: mode === 'edit' ? enquiries && enquiries?.user_id : user,
//         id: mode === 'edit' ? enquiries && enquiries?.id : index + 1,
//         party_name: partyName,
//         address,
//         gst_no: gstNo,

//         design_requirement: designTab,
//         qty_required: qtyRequired,
//         price,

//         colour_requirement: colourRequirement,
//         contact_name: contactName,
//         designation,

//         mobile,
//         email,

//         front_img: online ? front_path : front_off_Uri,
//         // front_img: front_path,
//         // front_img: cardFrontUri || front_path,
//         front_img_path: front_path,
//         back_img: backUri,
//         back_img_path: backUri,

//         card_front_uri: cardFrontUri,
//         scanned_from_card: scannedFromCard,

//         event_code: eventCode,

//         design_dsn_name: designDsnName,
//         design_dsn_code: designDsnCode,
//       }

//       let saveSuccess = false;
//       if (mode === 'edit') {
//         // update logic
//         const user_prptype = await AsyncStorage.getItem('user_prptype');
//         await updateEnquiries(payload?.id, token, getCurrentFinancialYear(), user_prptype, payload);
//         saveSuccess = true;
//       } else {
//         // insert logic
//         console.log("save paylaod:", payload);
//         await insertEnquiry(payload);
//         saveSuccess = true;
//       }

//       if (!saveSuccess) {
//         Alert.alert('Save failed', 'Could not save locally. Please try again.');
//         setSaving(false);
//         return;
//       }

//       const currentlyOnline = await isOnline();
//       if (!currentlyOnline) {
//         Alert.alert(
//           'Enquiry saved',
//           "Saved on this device. It'll sync automatically once you're back online.",
//           [{ text: 'OK' }]
//         );
//         setSaving(false);
//         resetFormFields();
//         return;
//       }

//       // Online: start sync and wait for completion
//       // Use a promise to wait for sync to finish
//       const syncResult = await new Promise((resolve) => {
//         const syncCallback = (progress) => {
//           // Update sync status banner (existing logic)
//           handleSyncProgress(progress);

//           if (progress.type === 'all_done' || progress.type === 'validation_error' || progress.type === 'error' || progress.type === 'aborted') {
//             resolve(progress);
//           }
//         };
//         startSyncQueue(getToken, getCurrentFinancialYear(), getUserPrptype, syncCallback);
//       });

//       // After sync completes, show final alert
//       if (syncResult.type === 'all_done' && mode === 'added') {
//         if (syncResult.failedCount === 0) {
//           Alert.alert(
//             'Enquiry saved',
//             'Saved and synced to server successfully.',
//             [{ text: 'OK' }]
//           );
//           // Reset form fields on successful online save
//           resetFormFields();
//         } else {
//           Alert.alert(
//             'Enquiry saved locally',
//             `Sync completed with ${syncResult.failedCount} error(s). Check the sync banner for details.`,
//             [{ text: 'OK' }]
//           );
//           // Reset form fields on successful online save
//           resetFormFields();
//         }
//       }
//       if (syncResult.type === 'all_done' && mode === 'edit') {
//         if (syncResult.failedCount === 0) {
//           Alert.alert(
//             'Enquiry saved',
//             'Saved and synced to server successfully.',
//             [{ text: 'OK' }]
//           );
//           // Reset form fields on successful online save
//           // resetFormFields();
//         } else {
//           Alert.alert(
//             'Enquiry saved locally',
//             `Sync completed with ${syncResult.failedCount} error(s). Check the sync banner for details.`,
//             [{ text: 'OK' }]
//           );
//           // Reset form fields on successful online save
//           // resetFormFields();
//         }
//       } else if (syncResult.type === 'all_done') {
//         if (syncResult.failedCount === 0) {
//           Alert.alert(
//             'Enquiry saved',
//             'Saved and synced to server successfully.',
//             [{ text: 'OK' }]
//           );
//           // Reset form fields on successful online save
//           resetFormFields();
//         } else {
//           Alert.alert(
//             'Enquiry saved locally',
//             `Sync completed with ${syncResult.failedCount} error(s). Check the sync banner for details.`,
//             [{ text: 'OK' }]
//           );
//           // Reset form fields on successful online save
//           resetFormFields();
//         }
//       }
//       else if (syncResult.type === 'validation_error') {
//         Alert.alert(
//           'Validation Error',
//           `Failed to sync: ${JSON.stringify(syncResult.errors)}`,
//           [{ text: 'OK' }]
//         );
//       } else {
//         Alert.alert(
//           'Sync error',
//           `An error occurred during sync: ${syncResult.message}`,
//           // [{ text: 'OK', onPress: () => navigation.goBack() }]
//           [{ text: 'OK' }]
//         );
//       }
//       setSaving(false);
//     } catch (err) {
//       console.log('Save error', err);
//       Alert.alert('Save failed', 'Something went wrong saving this enquiry. Please try again.');
//       setSaving(false);
//     }
//   }

//   // Function to show failed items modal
//   const showFailedItems = () => {
//     if (syncStatus.failedItems && syncStatus.failedItems.length > 0) {
//       setFailedItemsList(syncStatus.failedItems);
//       setFailedItemsModalVisible(true);
//     } else if (syncStatus.validationErrors) {
//       // If there's a validation error but no failed items list, create one
//       const errorItem = {
//         party_name: syncStatus.currentItemName || 'Unknown',
//         local_id: 'N/A',
//         error: JSON.stringify(syncStatus.validationErrors)
//       };
//       setFailedItemsList([errorItem]);
//       setFailedItemsModalVisible(true);
//     } else {
//       Alert.alert('No failed items', 'All enquiries synced successfully!');
//     }
//   };

//   // Function to retry failed items
//   const retryFailedItems = () => {
//     if (syncStatus.failedItems && syncStatus.failedItems.length > 0) {
//       // Close modal and restart sync
//       setFailedItemsModalVisible(false);
//       startSyncQueue(getToken, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress);
//     } else {
//       Alert.alert('No failed items to retry');
//     }
//   };

//   return (
//     <>
//       {loading && <FullScreenLoader />}
//       {/* <HeaderBarwithBack userName={username} header={'Event'} subHeader={online ? '● Online — card scan available' : '● Offline — saving locally, will sync later'} headerConnect={true} headerConnectColor={online ? 'green' : 'red'} headerConnectAnimation={true} /> */}

//       <HeaderBarwithBack
//         userName={username}
//         header={'Event'}
//         subHeaderText={online ? '● Online — card scan available' : '● Offline — saving locally, will sync later'}
//         breadcrumb={'Event'}
//         SearchBar={false}
//         headerConnectColor={online ? 'green' : 'red'}
//         headerConnectAnimation={true}
//       />

//       {/* SYNC BANNER - IMPROVED with clickable functionality */}
//       {syncStatus.visible && (
//         <TouchableOpacity
//           style={[
//             styles.syncBanner,
//             syncStatus.failed > 0 ? styles.syncBannerError : styles.syncBannerSuccess,
//             syncStatus.isSyncing && styles.syncBannerSyncing
//           ]}
//           onPress={showFailedItems}
//           activeOpacity={0.8}
//         >
//           <View style={styles.syncBannerRow}>
//             <View style={styles.syncBannerIcon}>
//               <Text style={styles.syncBannerIconText}>
//                 {/* {syncStatus.isSyncing ? '🔄' : syncStatus.failed > 0 ? '⚠️' : '✅'} */}
//                 <Icon
//                   name={
//                     syncStatus.isSyncing
//                       ? 'sync'
//                       : syncStatus.failed > 0
//                         ? 'warning-amber'
//                         : 'check-circle'
//                   }
//                   size={22}
//                   color={
//                     syncStatus.isSyncing
//                       ? '#1976D2'
//                       : syncStatus.failed > 0
//                         ? '#F57C00'
//                         : '#2E7D32'
//                   }
//                 />
//               </Text>
//             </View>
//             <View style={styles.syncBannerContent}>
//               <Text style={styles.syncBannerText}>{syncStatus.message}</Text>
//               {syncStatus.isSyncing && (
//                 <View>
//                   <Text style={styles.syncDetailText}>
//                     {syncStatus.currentItemName
//                       ? `Syncing: ${syncStatus.currentItemName}`
//                       : `Progress: ${syncStatus.synced + syncStatus.failed}/${syncStatus.total}`
//                     }
//                   </Text>
//                   <TouchableOpacity onPress={abortSync} style={styles.cancelSyncBtn}>
//                     <Text style={styles.cancelSyncText}>Cancel Sync</Text>
//                   </TouchableOpacity>
//                 </View>
//               )}
//               {!syncStatus.isSyncing && syncStatus.failed > 0 && (
//                 <View style={styles.bannerActions}>
//                   {/* <Text style={styles.bannerTapHint}>👆 Tap to see failed items</Text> */}
//                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                     <Icon
//                       name="touch-app"
//                       size={16}
//                       color={C.muted}
//                       style={{ marginRight: 5 }}
//                     />
//                     <Text style={styles.bannerTapHint}>
//                       Tap to see failed items
//                     </Text>
//                   </View>
//                   <TouchableOpacity
//                     style={styles.retryBtn}
//                     onPress={(e) => {
//                       e.stopPropagation(); // Prevent triggering parent onPress
//                       startSyncQueue(token, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress);
//                     }}
//                   >
//                     {/* <Text style={styles.retryText}>↻ Retry All</Text> */}
//                     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                       <Icon
//                         name="refresh"
//                         size={16}
//                         color="#fff"
//                         style={{ marginRight: 5 }}
//                       />
//                       <Text style={styles.retryText}>
//                         Retry All
//                       </Text>
//                     </View>
//                   </TouchableOpacity>
//                 </View>
//               )}
//               {!syncStatus.isSyncing && syncStatus.failed === 0 && syncStatus.synced > 0 && (
//                 // <Text style={styles.syncSuccessDetail}>✓ All enquiries synced successfully</Text>
//                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                   <Icon
//                     name="check-circle"
//                     size={16}
//                     color={C.success}
//                     style={{ marginRight: 5 }}
//                   />
//                   <Text style={styles.syncSuccessDetail}>
//                     All enquiries synced successfully
//                   </Text>
//                 </View>
//               )}
//             </View>
//           </View>
//         </TouchableOpacity>
//       )}
//       {/* <TouchableOpacity
//         style={[styles.reportBtn, { marginHorizontal: 10, marginBottom: 5, marginTop: 10, backgroundColor: '#333' }]}
//         onPress={loadAllEnquiries}
//       >
//         <Text style={styles.reportBtnText}> Debug DB</Text>
//       </TouchableOpacity> */}
//       <TouchableOpacity
//         style={[
//           styles.reportBtn, { marginHorizontal: 10, marginBottom: 5, marginTop: 10 },
//           (!online || scanning) && styles.scanBtnDisabled
//         ]}
//         onPress={() =>
//           // navigation.navigate('EnquiryReportScreen')
//           router.push({
//             pathname: '/EnquiryReportScreen'
//           })
//         }
//         disabled={!online || scanning}
//       >
//         <Text style={styles.reportBtnText}>
//           Show Report
//         </Text>
//       </TouchableOpacity>

//       <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>


//         {/* SCAN CARD BLOCK */}
//         <View style={styles.scanBlock}>
//           <Text style={styles.scanTitle}>Scan visiting card (optional)</Text>
//           <View style={{ display: 'flex', flexDirection: 'row' }}>
//             <TouchableOpacity
//               style={[styles.scanBtn, styles.scanBtn, { flex: 1, marginHorizontal: 10, marginBottom: 10 }, (!online || scanning) && styles.scanBtnDisabled]}
//               onPress={() => handleScanCard(token)}
//               disabled={!online || scanning}
//             >
//               {scanning ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text style={styles.scanBtnText}> Scan visiting card </Text>
//               )}
//             </TouchableOpacity>
//             <Text style={{ marginTop: 10, color: '#000' }} >OR</Text>
//             <TouchableOpacity
//               style={[
//                 styles.scanBtn, { flex: 1, marginHorizontal: 10, marginBottom: 10 }, (!online || scanning) && styles.scanBtnDisabled]}
//               onPress={() => handleUploadCard(token)}
//             >
//               <Text style={styles.scanBtnText}>
//                 Upload Card
//               </Text>
//             </TouchableOpacity>
//           </View>
//           <Text style={styles.scanHint}>
//             {online
//               ? 'Captures name, address, mobile, email, company & GSTIN automatically. Needs internet.'
//               : "No internet — card scan is unavailable. Type details below, or scan once you're back online."}
//           </Text>
//           {cardFrontUri ? (
//             <Image source={{ uri: getImageUri(cardFrontUri) }} style={styles.cardPreview} />
//           ) : null}
//         </View>

//         <View style={{ flexDirection: 'row', marginTop: 10 }} />

//         {/* <View style={styles.pickerWrap}>
//           <Picker selectedValue={eventCode} onValueChange={setEventCode}>
//             {EVENTS &&
//               EVENTS.map(e => (
//                 <Picker.Item
//                   key={e.EventId}
//                   label={e.EventName}
//                   value={e.EventId}
//                 />
//               ))}
//           </Picker>
//         </View> */}
//         <View style={styles.fieldGroup}>
//           <Text style={styles.label}>Event</Text>

//           <TouchableOpacity
//             style={styles.dropdown}
//             onPress={() => setEventModalVisible(true)}
//           >
//             <Text style={styles.dropdownText}>
//               {EVENTS.find(e => e.EventId === eventCode)?.EventName || 'Select Event'}
//             </Text>

//             <Text style={styles.dropdownArrow}>▼</Text>
//           </TouchableOpacity>
//         </View>

//         <Modal
//           visible={eventModalVisible}
//           transparent
//           animationType="fade"
//           onRequestClose={() => setEventModalVisible(false)}
//         >
//           <TouchableOpacity
//             style={styles.modalOverlay}
//             activeOpacity={1}
//             onPress={() => setEventModalVisible(false)}
//           >
//             <View style={styles.dropdownModal}>
//               <FlatList
//                 data={EVENTS}
//                 keyExtractor={(item) => String(item.EventId)}
//                 renderItem={({ item }) => (
//                   <TouchableOpacity
//                     style={styles.dropdownItem}
//                     onPress={() => {
//                       setEventCode(item.EventId);
//                       setEventModalVisible(false);
//                     }}
//                   >
//                     <Text style={styles.dropdownItemText}>
//                       {item.EventName}
//                     </Text>
//                   </TouchableOpacity>
//                 )}
//               />
//             </View>
//           </TouchableOpacity>
//         </Modal>

//         <Field label="Party name *">
//           <TextInput style={[styles.input, cardFields.party_name && styles.cardFilledInput]} placeholder="Company / party" value={partyName} onChangeText={setPartyName} />
//         </Field>

//         <Field label="Address">
//           <TextInput
//             style={[styles.input, styles.textarea, cardFields.address && styles.cardFilledInput]}
//             placeholder="Street, city, state"
//             value={address}
//             onChangeText={setAddress}
//             multiline
//           />
//         </Field>

//         <Field label="GST no. (optional)">
//           <TextInput style={[styles.input, cardFields.gst_no && styles.cardFilledInput]} placeholder="24XXXXXXXXXXXZ5" value={gstNo} onChangeText={setGstNo} autoCapitalize="characters" />
//         </Field>

//         <Field label="Design">
//           <View style={styles.designSection}>
//             <View style={styles.tabContainer}>
//               <TouchableOpacity
//                 style={[styles.tab, designTab === 'Existing' && styles.activeTab]}
//                 onPress={() => {
//                   setDesignTab('Existing');
//                   setDesignDsnName(selectedDesign?.name || '');
//                   setDesignDsnCode(selectedDesign?.dsn_code || '');
//                 }}
//               >
//                 <Text style={[styles.tabText, designTab === 'Existing' && styles.activeTabText]}>
//                   Existing
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.tab, designTab === 'New' && styles.activeTab]}
//                 onPress={() => {
//                   setDesignTab('New');
//                   setDesignDsnName('');
//                   setDesignDsnCode('0');
//                   setSelectedDesign(null);
//                   setSelectedItem(null);
//                 }}
//               >
//                 <Text style={[styles.tabText, designTab === 'New' && styles.activeTabText]}>
//                   New
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             {designTab === 'New' ? (
//               <View style={styles.newDesignContainer}>
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Enter Design Name"
//                   value={designDsnName}
//                   onChangeText={(text) => {
//                     setDesignDsnName(text);
//                     setDesignDsnCode('0');
//                     setDesignTab('New');
//                   }}
//                 />
//                 <TextInput
//                   style={[styles.input, { marginTop: 8 }]}
//                   placeholder="Design Code (Default: 0)"
//                   value={designDsnCode}
//                   editable={false}
//                 />
//               </View>
//             ) : (
//               <TouchableOpacity
//                 style={styles.existingDesignInput}
//                 onPress={() => {
//                   setDesignModalVisible(true);
//                   setDesignSearchQuery('');
//                   // setDesigns([]);
//                   loadDesing();
//                   // if (designs.length === 0) loadDesing();
//                 }}
//               >
//                 <Text style={styles.existingDesignInputText}>
//                   {selectedDesign ? selectedDesign.name : 'Select Design'}
//                 </Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         </Field>

//         <Field label="Item">
//           <View style={styles.designSection}>
//             <TouchableOpacity
//               style={styles.existingDesignInput}
//               onPress={() => {
//                 setItemModalVisible(true);
//                 setItemSearchQuery('');
//                 // setDesigns([]);
//                 loadItems();
//                 // if (designs.length === 0) loadDesing();
//               }}
//             >
//               <Text style={styles.existingDesignInputText}>
//                 {selectedItem ? selectedItem.name : 'Select Item'}
//               </Text>
//             </TouchableOpacity>

//           </View>
//         </Field>

//         <Field label="Qty required (m) *">
//           <TextInput style={styles.input} placeholder="5000" value={qtyRequired} onChangeText={setQtyRequired} keyboardType="numeric" />
//         </Field>

//         <Field label="Price (₹/m)">
//           <TextInput style={styles.input} placeholder="optional" value={price} onChangeText={setPrice} keyboardType="numeric" />
//         </Field>

//         <Field label="Colour requirement">
//           <TextInput style={styles.input} placeholder="optional" value={colourRequirement} onChangeText={setColourRequirement} />
//         </Field>

//         <Field label="Contact name">
//           <TextInput style={[styles.input, cardFields.contact_name && styles.cardFilledInput]} placeholder="Person met at the stall" value={contactName} onChangeText={setContactName} />
//         </Field>

//         <Field label="Designation">
//           <View style={styles.chipRow}>
//             {DESIGNATIONS.map((d) => (
//               <TouchableOpacity
//                 key={d}
//                 style={[styles.chip, designation === d && styles.chipActive]}
//                 onPress={() => setDesignation(d)}
//               >
//                 <Text style={[styles.chipText, designation === d && styles.chipTextActive]}>{d}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </Field>

//         <Field label="Mobile">
//           <TextInput style={[styles.input, cardFields.mobile && styles.cardFilledInput]} placeholder="98XXXXXXXX" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
//         </Field>

//         <Field label="Email">
//           <TextInput style={[styles.input, cardFields.email && styles.cardFilledInput]} placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
//         </Field>

//         {/* {front_img ? (
//           <View
//             style={{
//               marginHorizontal: 16,
//               marginBottom: 15,
//               borderWidth: 1,
//               borderColor: '#ddd',
//               borderRadius: 10,
//               padding: 10,
//               backgroundColor: '#fff',
//             }}
//           >

//             <Text
//               style={{
//                 fontWeight: '700',
//                 fontSize: 16,
//                 marginBottom: 10,
//               }}
//             >
//               Card Preview
//             </Text>

//             <Text
//               style={{
//                 fontWeight: '600',
//                 marginBottom: 8,
//               }}
//             >
//               Front Side
//             </Text>

//             <Image
//               source={{
//                 uri: front_img,
//                 headers: {
//                   Connection: 'close',
//                 },
//               }}
//               style={{
//                 width: '100%',
//                 height: 180,
//               }}
//               resizeMode="contain"
//             />

//             <View style={{ marginTop: 20 }}>

//               <Text
//                 style={{
//                   fontWeight: '600',
//                   marginBottom: 8,
//                 }}
//               >
//                 Back Side
//               </Text>

//               {backUri ? (
//                 <>
//                   <Image
//                     source={{ uri: getImageUri(backUri) }}
//                     style={{
//                       width: '100%',
//                       height: 180,
//                       borderRadius: 8,
//                     }}
//                     resizeMode="contain"
//                   />

//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       justifyContent: 'space-between',
//                       marginTop: 10,
//                     }}
//                   >
//                     <TouchableOpacity
//                       onPress={handleUploadBackSide}
//                     >
//                       <Text style={{ color: '#b3552c' }}>
//                         Replace
//                       </Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       onPress={() => setBackUri('')}
//                     >
//                       <Text style={{ color: 'red' }}>
//                         Remove
//                       </Text>
//                     </TouchableOpacity>
//                   </View>
//                 </>
//               ) : (
//                 <TouchableOpacity
//                   style={{
//                     borderWidth: 1,
//                     borderStyle: 'dashed',
//                     borderColor: '#b3552c',
//                     borderRadius: 8,
//                     padding: 15,
//                     alignItems: 'center',
//                   }}
//                   onPress={handleUploadBackSide}
//                 >
//                   <Text style={{ color: '#b3552c' }}>
//                     Upload Back Side
//                   </Text>
//                 </TouchableOpacity>
//               )}

//             </View>

//           </View>
//         ) : null} */}
//         {front_img || backUri && online ? (
//           <View style={styles.cardPreviewContainer}>
//             {/* <Text style={styles.cardPreviewTitle}> Card Preview</Text> */}
//             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
//               <Icon
//                 name="credit-card"
//                 size={22}
//                 color={C.brand}
//                 style={{ marginRight: 6, marginBottom: 10 }}
//               />
//               <Text style={styles.cardPreviewTitle}>
//                 Card Preview
//               </Text>
//             </View>

//             <View style={styles.cardRow}>
//               {/* Front Side */}
//               <View style={styles.cardTile}>
//                 <Text style={styles.cardSideLabel}>Front</Text>
//                 <Image
//                   source={{ uri: front_img, headers: { Connection: 'close' } }}
//                   style={styles.cardImage}
//                   resizeMode="contain"
//                 />
//                 {/* <View style={styles.cardActions}>
//                   <TouchableOpacity onPress={handleUploadFront_off_Side}>
//                     <Text style={styles.actionText}>Replace</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity onPress={() => setFronImage('')}>
//                     <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
//                   </TouchableOpacity>
//                 </View> */}
//               </View>

//               {/* Back Side */}
//               <View style={styles.cardTile}>
//                 <Text style={styles.cardSideLabel}>Back</Text>
//                 {backUri ? (
//                   <>
//                     <Image
//                       source={{ uri: getImageUri(backUri) }}
//                       style={styles.cardImage}
//                       resizeMode="contain"
//                     />
//                     <View style={styles.cardActions}>
//                       <TouchableOpacity onPress={handleUploadBackSide}>
//                         <Text style={styles.actionText}>Replace</Text>
//                       </TouchableOpacity>
//                       <TouchableOpacity onPress={() => setBackUri('')}>
//                         <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
//                       </TouchableOpacity>
//                     </View>
//                   </>
//                 ) : (
//                   <TouchableOpacity
//                     style={styles.uploadPlaceholder}
//                     onPress={handleUploadBackSide}
//                   >
//                     <Text style={styles.uploadPlaceholderText}>Upload Back</Text>
//                   </TouchableOpacity>
//                 )}
//               </View>
//             </View>
//           </View>
//         ) : null}

//         {/* {!online ? (
//           <View
//             style={{
//               marginHorizontal: 16,
//               marginBottom: 15,
//               borderWidth: 1,
//               borderColor: '#ddd',
//               borderRadius: 10,
//               padding: 10,
//               backgroundColor: '#fff',
//             }}
//           >

//             <Text
//               style={{
//                 fontWeight: '700',
//                 fontSize: 16,
//                 marginBottom: 10,
//               }}
//             >
//               Card Preview
//             </Text>

//             <Text
//               style={{
//                 fontWeight: '600',
//                 marginBottom: 8,
//               }}
//             >
//               Front Side
//             </Text>


//             {front_off_Uri ? (
//               <>
//                 <Image
//                   source={{ uri: getImageUri(front_off_Uri) }}
//                   style={{
//                     width: '100%',
//                     height: 180,
//                     borderRadius: 8,
//                   }}
//                   resizeMode="contain"
//                 />

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     justifyContent: 'space-between',
//                     marginTop: 10,
//                   }}
//                 >
//                   <TouchableOpacity
//                     onPress={handleUploadFront_off_Side}
//                   >
//                     <Text style={{ color: '#b3552c' }}>
//                       Replace
//                     </Text>
//                   </TouchableOpacity>

//                   <TouchableOpacity
//                     onPress={() => setFront_off_Uri('')}
//                   >
//                     <Text style={{ color: 'red' }}>
//                       Remove
//                     </Text>
//                   </TouchableOpacity>
//                 </View>
//               </>
//             ) : (
//               <TouchableOpacity
//                 style={{
//                   borderWidth: 1,
//                   borderStyle: 'dashed',
//                   borderColor: '#b3552c',
//                   borderRadius: 8,
//                   padding: 15,
//                   alignItems: 'center',
//                 }}
//                 onPress={handleUploadFront_off_Side}
//               >
//                 <Text style={{ color: '#b3552c' }}>
//                   Upload Front Side
//                 </Text>
//               </TouchableOpacity>
//             )}

//             <View style={{ marginTop: 20 }}>

//               <Text
//                 style={{
//                   fontWeight: '600',
//                   marginBottom: 8,
//                 }}
//               >
//                 Back Side
//               </Text>

//               {backUri ? (
//                 <>
//                   <Image
//                     source={{ uri: getImageUri(backUri) }}
//                     style={{
//                       width: '100%',
//                       height: 180,
//                       borderRadius: 8,
//                     }}
//                     resizeMode="contain"
//                   />

//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       justifyContent: 'space-between',
//                       marginTop: 10,
//                     }}
//                   >
//                     <TouchableOpacity
//                       onPress={handleUploadBackSide}
//                     >
//                       <Text style={{ color: '#b3552c' }}>
//                         Replace
//                       </Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       onPress={() => setBackUri('')}
//                     >
//                       <Text style={{ color: 'red' }}>
//                         Remove
//                       </Text>
//                     </TouchableOpacity>
//                   </View>
//                 </>
//               ) : (
//                 <TouchableOpacity
//                   style={{
//                     borderWidth: 1,
//                     borderStyle: 'dashed',
//                     borderColor: '#b3552c',
//                     borderRadius: 8,
//                     padding: 15,
//                     alignItems: 'center',
//                   }}
//                   onPress={handleUploadBackSide}
//                 >
//                   <Text style={{ color: '#b3552c' }}>
//                     Upload Back Side
//                   </Text>
//                 </TouchableOpacity>
//               )}

//             </View>

//           </View>
//         ) : null} */}
//         {!online ? (
//           <View style={styles.cardPreviewContainer}>
//             {/* <Text style={styles.cardPreviewTitle}> Card Preview (Offline)</Text> */}
//             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
//               <Icon
//                 name="credit-card"
//                 size={22}
//                 color={C.brand}
//                 style={{ marginRight: 6, marginBottom: 10 }}
//               />
//               <Text style={styles.cardPreviewTitle}>
//                 Card Preview (Offline)
//               </Text>
//             </View>

//             <View style={styles.cardRow}>
//               {/* Front Side – using front_off_Uri */}
//               <View style={styles.cardTile}>
//                 <Text style={styles.cardSideLabel}>Front</Text>
//                 {front_off_Uri ? (
//                   <>
//                     <Image
//                       source={{ uri: getImageUri(front_off_Uri) }}
//                       style={styles.cardImage}
//                       resizeMode="contain"
//                     />
//                     <View style={styles.cardActions}>
//                       <TouchableOpacity onPress={handleUploadFront_off_Side}>
//                         <Text style={styles.actionText}>Replace</Text>
//                       </TouchableOpacity>
//                       <TouchableOpacity onPress={() => setFront_off_Uri('')}>
//                         <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
//                       </TouchableOpacity>
//                     </View>
//                   </>
//                 ) : (
//                   <TouchableOpacity
//                     style={styles.uploadPlaceholder}
//                     onPress={handleUploadFront_off_Side}
//                   >
//                     <Text style={styles.uploadPlaceholderText}>Upload Front</Text>
//                   </TouchableOpacity>
//                 )}
//               </View>

//               {/* Back Side – same as before */}
//               <View style={styles.cardTile}>
//                 <Text style={styles.cardSideLabel}>Back</Text>
//                 {backUri ? (
//                   <>
//                     <Image
//                       source={{ uri: getImageUri(backUri) }}
//                       style={styles.cardImage}
//                       resizeMode="contain"
//                     />
//                     <View style={styles.cardActions}>
//                       <TouchableOpacity onPress={handleUploadBackSide}>
//                         <Text style={styles.actionText}>Replace</Text>
//                       </TouchableOpacity>
//                       <TouchableOpacity onPress={() => setBackUri('')}>
//                         <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
//                       </TouchableOpacity>
//                     </View>
//                   </>
//                 ) : (
//                   <TouchableOpacity
//                     style={styles.uploadPlaceholder}
//                     onPress={handleUploadBackSide}
//                   >
//                     <Text style={styles.uploadPlaceholderText}>Upload Back</Text>
//                   </TouchableOpacity>
//                 )}
//               </View>
//             </View>
//           </View>
//         ) : null}

//         <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave(mode)} disabled={saving}>
//           {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{mode === 'edit' ? 'Update enquiry' : 'Save enquiry'}</Text>}
//         </TouchableOpacity>
//       </ScrollView>

//       {/* Failed Items Modal */}
//       <Modal
//         visible={failedItemsModalVisible}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setFailedItemsModalVisible(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.failedItemsModal}>
//             <View style={styles.failedItemsHeader}>
//               {/* <Text style={styles.failedItemsTitle}>❌ Failed Sync Items</Text> */}
//               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                 <Icon
//                   name="cancel"
//                   size={22}
//                   color={C.danger}
//                   style={{ marginRight: 6 }}
//                 />
//                 <Text style={styles.failedItemsTitle}>
//                   Failed Sync Items
//                 </Text>
//               </View>
//               <TouchableOpacity onPress={() => setFailedItemsModalVisible(false)}>
//                 {/* <Text style={styles.modalCloseText}>✕ Close</Text> */}
//                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                   <Icon
//                     name="close"
//                     size={22}
//                     color={C.muted}
//                     style={{ marginRight: 4 }}
//                   />
//                   <Text style={styles.modalCloseText}>
//                     Close
//                   </Text>
//                 </View>
//               </TouchableOpacity>
//             </View>

//             {failedItemsList.length === 0 ? (
//               <Text style={styles.noFailedItemsText}>No failed items to show</Text>
//             ) : (
//               <FlatList
//                 data={failedItemsList}
//                 keyExtractor={(item, index) => item.local_id || index.toString()}
//                 renderItem={({ item }) => (
//                   <View style={styles.failedItemCard}>
//                     <Text style={styles.failedItemName}>
//                       {item.party_name || 'Unknown Party'}
//                     </Text>
//                     <Text style={styles.failedItemId}>
//                       ID: {item.local_id || 'N/A'}
//                     </Text>
//                     <Text style={styles.failedItemError}>
//                       Error: {typeof item.error === 'string' ? item.error : JSON.stringify(item.error || 'Unknown error')}
//                     </Text>
//                     {item.errors && (
//                       <>
//                         <View style={styles.validationErrorsContainer}>
//                           <Text style={styles.validationErrorsTitle}>Validation Errors:</Text>
//                           {Object.entries(item.errors).map(([field, errors]) => (
//                             <View key={field} style={styles.validationErrorItem}>

//                               <Text style={styles.validationErrorField}>{field}:</Text>
//                               {Array.isArray(errors) ? errors.map((err, idx) => (
//                                 <>
//                                   <Text key={idx} style={styles.validationErrorText}>- {err}</Text>
//                                 </>

//                               )) : (
//                                 <>
//                                   <Text style={styles.validationErrorText}>- {errors}</Text>
//                                 </>
//                               )}
//                             </View>
//                           ))}

//                         </View>

//                       </>
//                     )}
//                     {/* ✏️ Edit button */}
//                     {/* <TouchableOpacity
//                       style={styles.editFailedItemBtn}
//                       onPress={() => {
//                         setFailedItemsModalVisible(false);
//                         console.log('Editing failed item:', item);
//                         // Navigate to NewEnquiryScreen with a flag to edit this pending enquiry
//                         navigation.navigate('Event', {
//                           localId: item.id,
//                           mode: 'edit_pending'   // new mode
//                         });
//                       }}
//                     >
//                       <Text style={styles.editFailedItemText}>✏️ Edit & Retry</Text>
//                     </TouchableOpacity> */}
//                   </View>
//                 )}
//                 ListEmptyComponent={
//                   <Text style={styles.noFailedItemsText}>No failed items</Text>
//                 }
//               />
//             )}

//             <View style={styles.failedItemsActions}>
//               <TouchableOpacity
//                 style={[styles.failedItemsBtn, styles.retryAllBtn]}
//                 onPress={retryFailedItems}
//               >
//                 {/* <Text style={styles.failedItemsBtnText}>↻ Retry All Failed</Text> */}
//                 <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
//                   <Icon
//                     name="refresh"
//                     size={18}
//                     color="#fff"
//                     style={{ marginRight: 5 }}
//                   />
//                   <Text style={styles.failedItemsBtnText}>
//                     Retry All Failed
//                   </Text>
//                 </View>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.failedItemsBtn, styles.closeBtn]}
//                 onPress={() => setFailedItemsModalVisible(false)}
//               >
//                 <Text style={styles.failedItemsBtnText}>Close</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       <Modal
//         visible={debugModalVisible}
//         animationType="slide"
//         onRequestClose={() => setDebugModalVisible(false)}
//       >
//         <View style={{ flex: 1, backgroundColor: '#fdfcf9', padding: 16, marginTop: 45 }}>
//           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
//             <Text style={{ fontSize: 20, fontWeight: '700' }}> Local Enquiries</Text>
//             <TouchableOpacity onPress={() => setDebugModalVisible(false)}>
//               {/* <Text style={{ fontSize: 18, color: '#b3552c' }}>✕ Close</Text> */}
//               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                 <Icon
//                   name="close"
//                   size={22}
//                   color={C.muted}
//                   style={{ marginRight: 4 }}
//                 />
//                 <Text style={styles.modalCloseText}>
//                   Close
//                 </Text>
//               </View>
//             </TouchableOpacity>
//           </View>

//           {debugData.length === 0 ? (
//             <Text style={{ textAlign: 'center', marginTop: 40, color: '#6b7280' }}>No local data</Text>
//           ) : (
//             <FlatList
//               data={debugData}
//               keyExtractor={(item) => item.local_id}
//               renderItem={({ item }) => (
//                 <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' }}>
//                   <Text style={{ fontWeight: '700' }}>{item.party_name || 'No name'}</Text>
//                   <Text style={{ fontSize: 12, color: '#6b7280' }}>
//                     local_id: {item.local_id} | server_id: {item.server_id || '—'}
//                   </Text>
//                   <Text style={{ fontSize: 12, color: '#6b7280' }}>
//                     sync: {item.sync_status} | event_code: {item.event_code || '—'}
//                   </Text>
//                   <Text style={{ fontSize: 12, color: '#6b7280' }}>
//                     created: {new Date(item.created_at).toLocaleString()}
//                   </Text>
//                 </View>
//               )}
//             />
//           )}
//         </View>
//       </Modal>

//       <Modal
//         visible={designModalVisible}
//         animationType="slide"
//         onRequestClose={() => setDesignModalVisible(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Select Design</Text>
//             <TouchableOpacity onPress={() => setDesignModalVisible(false)}>
//               {/* <Text style={styles.modalCloseText}>✕ Close</Text> */}
//               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                 <Icon
//                   name="close"
//                   size={22}
//                   color={C.muted}
//                   style={{ marginRight: 4 }}
//                 />
//                 <Text style={styles.modalCloseText}>
//                   Close
//                 </Text>
//               </View>
//             </TouchableOpacity>
//           </View>

//           <TextInput
//             style={styles.modalSearchInput}
//             placeholder="Search Designs..."
//             value={designSearchQuery}
//             onChangeText={handleDesignSearch}
//           />

//           {loadingDesigns ? (
//             <ActivityIndicator size="large" color="#b3552c" style={styles.modalLoader} />
//           ) : (
//             <FlatList
//               data={displayedDesigns}
//               keyExtractor={(item) => item.dsn_code}
//               renderItem={({ item }) => (
//                 <TouchableOpacity
//                   style={styles.modalDesignItem}
//                   onPress={() => {
//                     setSelectedDesign(item);
//                     setDesignDsnName(item.name);
//                     setDesignDsnCode(item.dsn_code);
//                     setDesignTab('Existing');
//                     setDesignModalVisible(false);
//                   }}
//                 >
//                   <Text style={styles.modalDesignItemText}>{item.name}</Text>
//                   <Text style={styles.modalDesignItemCode}>{item.dsn_code}</Text>
//                 </TouchableOpacity>
//               )}
//               ListEmptyComponent={
//                 <Text style={styles.modalNoDesignsText}>No designs found</Text>
//               }
//               initialNumToRender={pageSize}
//               onEndReached={loadMoreDesigns}
//               onEndReachedThreshold={0.5}
//               ListFooterComponent={
//                 loadingDesigns ? (
//                   <ActivityIndicator size="large" color="#b3552c" style={{ margin: 10 }} />
//                 ) : hasMore ? (
//                   <ActivityIndicator size="small" color="#b3552c" style={{ margin: 10 }} />
//                 ) : null
//               }
//             />
//           )}
//         </View>
//       </Modal>

//       <Modal
//         visible={itemModalVisible}
//         animationType="slide"
//         onRequestClose={() => setItemModalVisible(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Select Item</Text>
//             <TouchableOpacity onPress={() => setItemModalVisible(false)}>
//               {/* <Text style={styles.modalCloseText}>✕ Close</Text> */}
//               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                 <Icon
//                   name="close"
//                   size={22}
//                   color={C.muted}
//                   style={{ marginRight: 4 }}
//                 />
//                 <Text style={styles.modalCloseText}>
//                   Close
//                 </Text>
//               </View>
//             </TouchableOpacity>
//           </View>

//           <TextInput
//             style={styles.modalSearchInput}
//             placeholder="Search Items..."
//             value={itemSearchQuery}
//             onChangeText={handleItemSearch}
//           />

//           {loadingItems ? (
//             <ActivityIndicator size="large" color="#b3552c" style={styles.modalLoader} />
//           ) : (
//             <FlatList
//               data={displayedItems}
//               keyExtractor={(item) => item.dsn_code}
//               renderItem={({ item }) => (
//                 <TouchableOpacity
//                   style={styles.modalDesignItem}
//                   onPress={() => {
//                     setSelectedItem(item);
//                     setItemDsnName(item.name);
//                     setItemDsnCode(item.dsn_code);
//                     // setItemTab('Existing');
//                     setItemModalVisible(false);
//                   }}
//                 >
//                   <Text style={styles.modalDesignItemText}>{item.name}</Text>
//                   <Text style={styles.modalDesignItemCode}>{item.dsn_code}</Text>
//                 </TouchableOpacity>
//               )}
//               ListEmptyComponent={
//                 <Text style={styles.modalNoDesignsText}>No items found</Text>
//               }
//               initialNumToRender={pageSize}
//               onEndReached={loadMoreItems}
//               onEndReachedThreshold={0.5}
//               ListFooterComponent={
//                 loadingItems ? (
//                   <ActivityIndicator size="large" color="#b3552c" style={{ margin: 10 }} />
//                 ) : hasMore ? (
//                   <ActivityIndicator size="small" color="#b3552c" style={{ margin: 10 }} />
//                 ) : null
//               }
//             />
//           )}
//         </View>
//       </Modal>
//     </>
//   );
// }

// function Field({ label, children }) {
//   return (
//     <View style={styles.fieldGroup}>
//       <Text style={styles.label}>{label}</Text>
//       {children}
//     </View>
//   );
// }


// /* ──────────────────────────────────────────────────────────────────────────
//    Design tokens — refined for a more professional, consistent look.
//    (Local constants; no new files/imports required.)
//    ────────────────────────────────────────────────────────────────────────── */
// const C = {
//   brand: '#B3552C',
//   brandDark: '#8F4220',
//   brandSoft: '#FBEEE6',
//   brandBorder: '#E8C9B6',
//   ink: '#1F2937',
//   body: '#374151',
//   muted: '#6B7280',
//   faint: '#9CA3AF',
//   bg: '#FBFAF7',
//   surface: '#FFFFFF',
//   surfaceAlt: '#F7F5F1',
//   border: '#ECE9E2',
//   borderInput: '#E2E0DA',
//   success: '#1E8E3E',
//   successBg: '#E9F7EE',
//   successBorder: '#BFE6CC',
//   danger: '#D7382F',
//   dangerBg: '#FDECEA',
//   dangerBorder: '#F4C7C3',
//   info: '#1A73E8',
//   infoBg: '#E8F0FE',
//   infoBorder: '#C6DAFC',
//   black: '#111315',
// };

// const shadowSoft = {
//   shadowColor: '#000',
//   shadowOffset: { width: 0, height: 4 },
//   shadowOpacity: 0.06,
//   shadowRadius: 10,
//   elevation: 2,
// };

// const shadowBtn = {
//   shadowColor: C.brand,
//   shadowOffset: { width: 0, height: 4 },
//   shadowOpacity: 0.22,
//   shadowRadius: 8,
//   elevation: 3,
// };

// const styles = StyleSheet.create({
//   screen: { flex: 1, backgroundColor: C.bg },

//   connStrip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
//   connOnline: { backgroundColor: C.successBg },
//   connOffline: { backgroundColor: C.brandSoft },
//   connText: { fontSize: 12, fontWeight: '600' },

//   title: {
//     fontSize: 24,
//     fontWeight: '800',
//     color: C.ink,
//     letterSpacing: 0.2,
//     paddingHorizontal: 16,
//     marginTop: 12,
//     marginBottom: 4,
//   },

//   /* Scan card block */
//   scanBlock: {
//     margin: 16,
//     marginTop: 8,
//     borderWidth: 1.5,
//     borderColor: C.brandBorder,
//     borderStyle: 'dashed',
//     backgroundColor: C.brandSoft,
//     borderRadius: 14,
//     padding: 16,
//   },
//   scanTitle: {
//     fontSize: 12,
//     fontWeight: '800',
//     color: C.brandDark,
//     marginBottom: 10,
//     textTransform: 'uppercase',
//     letterSpacing: 0.6,
//   },
//   scanBtn: {
//     backgroundColor: C.brand,
//     borderRadius: 11,
//     paddingVertical: 13,
//     alignItems: 'center',
//     justifyContent: 'center',
//     ...shadowBtn,
//   },
//   reportBtn: {
//     backgroundColor: C.black,
//     borderRadius: 11,
//     paddingVertical: 13,
//     alignItems: 'center',
//     justifyContent: 'center',
//     ...shadowSoft,
//   },
//   scanBtnDisabled: {
//     backgroundColor: '#C9C4BB',
//     shadowOpacity: 0,
//     elevation: 0,
//   },
//   scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
//   reportBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
//   scanHint: { fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 17 },
//   cardPreview: { width: '100%', height: 140, borderRadius: 10, marginTop: 10 },

//   /* Form fields */
//   fieldGroup: { paddingHorizontal: 16, marginBottom: 16 },
//   label: {
//     fontSize: 11,
//     fontWeight: '700',
//     color: C.body,
//     marginBottom: 7,
//     textTransform: 'uppercase',
//     letterSpacing: 0.5,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: C.borderInput,
//     borderRadius: 11,
//     paddingVertical: 13,
//     paddingHorizontal: 14,
//     fontSize: 14.5,
//     color: C.ink,
//     backgroundColor: C.surface,
//   },
//   textarea: { minHeight: 74, textAlignVertical: 'top', paddingTop: 12 },

//   /* Chips */
//   chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
//   chip: {
//     borderWidth: 1,
//     borderColor: C.borderInput,
//     borderRadius: 22,
//     paddingVertical: 9,
//     paddingHorizontal: 16,
//     backgroundColor: C.surface,
//     marginRight: 8,
//     marginBottom: 8,
//   },
//   chipActive: { borderColor: C.brand, backgroundColor: C.brandSoft },
//   chipText: { fontSize: 13, color: C.body },
//   chipTextActive: { color: C.brandDark, fontWeight: '700' },

//   /* Primary save */
//   saveBtn: {
//     backgroundColor: C.brand,
//     borderRadius: 12,
//     marginHorizontal: 16,
//     marginTop: 12,
//     paddingVertical: 15,
//     alignItems: 'center',
//     ...shadowBtn,
//   },
//   saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

//   pickerWrap: {
//     marginHorizontal: 16,
//     borderWidth: 1,
//     borderColor: C.border,
//     borderRadius: 11,
//     backgroundColor: C.surface,
//     marginBottom: 8,
//     overflow: 'hidden',
//   },

//   /* Sync banner */
//   syncBanner: {
//     padding: 14,
//     marginHorizontal: 12,
//     marginTop: 8,
//     borderRadius: 12,
//     borderWidth: 1,
//     ...shadowSoft,
//   },
//   syncBannerSuccess: { backgroundColor: C.successBg, borderColor: C.successBorder },
//   syncBannerError: { backgroundColor: C.dangerBg, borderColor: C.dangerBorder },
//   syncBannerSyncing: { backgroundColor: C.infoBg, borderColor: C.infoBorder },
//   syncBannerRow: { flexDirection: 'row', alignItems: 'flex-start' },
//   syncBannerIcon: { marginRight: 10, marginTop: 1 },
//   syncBannerIconText: { fontSize: 20 },
//   syncBannerContent: { flex: 1 },
//   syncBannerText: { fontSize: 13.5, fontWeight: '700', color: C.ink },
//   syncDetailText: { fontSize: 12, color: C.body, marginTop: 4 },
//   cancelSyncBtn: { marginTop: 6 },
//   cancelSyncText: { color: C.danger, fontSize: 12, fontWeight: '600' },
//   bannerActions: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 8,
//     flexWrap: 'wrap',
//   },
//   bannerTapHint: { fontSize: 12, color: C.muted, marginRight: 12 },
//   retryBtn: {
//     backgroundColor: C.brand,
//     paddingHorizontal: 14,
//     paddingVertical: 6,
//     borderRadius: 8,
//   },
//   retryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
//   syncSuccessDetail: { fontSize: 12, color: C.success, marginTop: 6, fontWeight: '600' },

//   /* Modals */
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(17,19,21,0.55)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   failedItemsModal: {
//     backgroundColor: C.surface,
//     borderRadius: 16,
//     padding: 20,
//     width: '100%',
//     maxHeight: '80%',
//     ...shadowSoft,
//   },
//   failedItemsHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: C.border,
//     paddingBottom: 12,
//   },
//   failedItemsTitle: { fontSize: 18, fontWeight: '800', color: C.danger },
//   modalCloseText: { fontSize: 22, color: C.muted, paddingHorizontal: 4 },
//   failedItemCard: {
//     backgroundColor: C.surfaceAlt,
//     borderRadius: 10,
//     padding: 14,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: C.border,
//   },
//   failedItemName: { fontSize: 15.5, fontWeight: '700', color: C.ink },
//   failedItemId: { fontSize: 12, color: C.muted, marginTop: 2 },
//   failedItemError: { fontSize: 13, color: C.danger, marginTop: 6 },
//   validationErrorsContainer: {
//     marginTop: 8,
//     paddingTop: 8,
//     borderTopWidth: 1,
//     borderTopColor: C.border,
//   },
//   validationErrorsTitle: { fontSize: 13, fontWeight: '700', color: C.body, marginBottom: 4 },
//   validationErrorItem: { marginLeft: 8, marginTop: 4 },
//   validationErrorField: { fontSize: 12, fontWeight: '600', color: C.body },
//   validationErrorText: { fontSize: 12, color: C.danger, marginLeft: 12 },
//   noFailedItemsText: { textAlign: 'center', color: C.muted, padding: 20 },
//   failedItemsActions: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 16,
//     paddingTop: 16,
//     borderTopWidth: 1,
//     borderTopColor: C.border,
//   },
//   failedItemsBtn: {
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//     borderRadius: 10,
//     flex: 1,
//     alignItems: 'center',
//     marginHorizontal: 5,
//   },
//   retryAllBtn: { backgroundColor: C.brand },
//   closeBtn: { backgroundColor: '#6B7280' },
//   failedItemsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

//   /* Design tab / picker */
//   designSection: { marginTop: 8 },
//   tabContainer: {
//     flexDirection: 'row',
//     borderWidth: 1,
//     borderColor: C.borderInput,
//     borderRadius: 11,
//     backgroundColor: C.surface,
//     marginBottom: 8,
//     padding: 3,
//   },
//   tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
//   activeTab: { backgroundColor: C.brandSoft, borderColor: C.brand },
//   tabText: { color: C.body, fontWeight: '600' },
//   activeTabText: { color: C.brandDark, fontWeight: '800' },
//   newDesignContainer: { marginTop: 8 },
//   existingDesignContainer: {
//     marginTop: 8,
//     maxHeight: 200,
//     borderWidth: 1,
//     borderColor: C.borderInput,
//     borderRadius: 11,
//     padding: 8,
//     backgroundColor: C.surface,
//   },
//   designItem: {
//     paddingVertical: 11,
//     borderBottomWidth: 1,
//     borderBottomColor: C.border,
//   },
//   designItemText: { fontSize: 14, color: C.ink },
//   noDesignsText: { textAlign: 'center', color: C.muted, marginTop: 10 },

//   modalContainer: { flex: 1, backgroundColor: C.bg, padding: 16 },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//     marginTop: 45
//   },
//   modalTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
//   modalSearchInput: {
//     borderWidth: 1,
//     borderColor: C.borderInput,
//     borderRadius: 11,
//     paddingVertical: 12,
//     paddingHorizontal: 14,
//     fontSize: 14.5,
//     color: C.ink,
//     backgroundColor: C.surface,
//     marginBottom: 10,
//   },
//   modalLoader: { marginTop: 20 },
//   modalDesignItem: {
//     paddingVertical: 13,
//     paddingHorizontal: 14,
//     borderBottomWidth: 1,
//     borderBottomColor: C.border,
//     backgroundColor: C.surface,
//     borderRadius: 10,
//     marginBottom: 8,
//     ...shadowSoft,
//   },
//   cardFilledInput: { backgroundColor: C.successBg, borderColor: C.successBorder },
//   modalDesignItemText: { fontSize: 16, color: C.ink, fontWeight: '700' },
//   modalDesignItemCode: { fontSize: 12, color: C.muted, marginTop: 4 },
//   modalNoDesignsText: { textAlign: 'center', color: C.muted, marginTop: 20 },
//   existingDesignInput: {
//     borderWidth: 1,
//     borderColor: C.borderInput,
//     borderRadius: 11,
//     paddingVertical: 13,
//     paddingHorizontal: 14,
//     backgroundColor: C.surface,
//     marginTop: 8,
//   },
//   existingDesignInputText: {
//     fontSize: 14.5,
//     color: theme.BRAND_GRADIENT_END,
//   },
//   editFailedItemBtn: {
//     backgroundColor: C.brand,
//     paddingVertical: 7,
//     paddingHorizontal: 14,
//     borderRadius: 8,
//     marginTop: 8,
//     alignSelf: 'flex-start',
//   },
//   editFailedItemText: { color: '#fff', fontWeight: '700', fontSize: 13 },

//   /* Card preview tiles */
//   cardPreviewContainer: {
//     marginHorizontal: 16,
//     marginBottom: 16,
//     padding: 14,
//     backgroundColor: C.surface,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: C.border,
//     ...shadowSoft,
//   },
//   cardPreviewTitle: { fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 12 },
//   cardRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     flexWrap: 'wrap',
//   },
//   cardTile: {
//     flex: 1,
//     minWidth: 140,
//     marginHorizontal: 4,
//     backgroundColor: C.surfaceAlt,
//     borderRadius: 12,
//     padding: 10,
//     borderWidth: 1,
//     borderColor: C.border,
//     alignItems: 'center',
//   },
//   cardSideLabel: {
//     fontSize: 11,
//     fontWeight: '700',
//     color: C.muted,
//     textTransform: 'uppercase',
//     letterSpacing: 0.5,
//     marginBottom: 6,
//     alignSelf: 'flex-start',
//   },
//   cardImage: {
//     width: '100%',
//     height: 140,
//     borderRadius: 10,
//     backgroundColor: '#F0EFEC',
//   },
//   cardActions: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     width: '100%',
//     marginTop: 10,
//   },
//   actionText: { fontSize: 13, color: C.brand, fontWeight: '700' },
//   actionRemove: { color: C.danger },
//   uploadPlaceholder: {
//     width: '100%',
//     height: 140,
//     borderRadius: 10,
//     borderWidth: 1.5,
//     borderStyle: 'dashed',
//     borderColor: C.brand,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#FEF7F0',
//   },
//   uploadPlaceholderText: { color: C.brand, fontWeight: '700', fontSize: 13 },
//   dropdown: {
//     borderWidth: 1,
//     borderColor: C.borderInput,
//     borderRadius: 10,
//     backgroundColor: '#fff',
//     paddingHorizontal: 15,
//     paddingVertical: 14,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },

//   dropdownText: {
//     flex: 1,
//     color: C.ink,
//     fontSize: 14,
//   },

//   dropdownArrow: {
//     color: '#666',
//     fontSize: 12,
//   },

//   dropdownModal: {
//     backgroundColor: '#fff',
//     marginHorizontal: 20,
//     marginTop: 120,
//     borderRadius: 12,
//     maxHeight: 300,
//   },

//   dropdownItem: {
//     padding: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//   },

//   dropdownItemText: {
//     fontSize: 15,
//     color: '#222',
//   },
// });
// index.tsx - Updated with Items and Designs structure
import FullScreenLoader from '@/components/FullScreenLoader';
import HeaderBarwithBack from '@/components/Header';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API } from '../../common/API/dynamicAPI';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import {
  captureCardPhoto,
  isOnline,
  scanVisitingCard,
} from './CardScanService';
import { deleteAllEnquiriesFromDB, getAllEnquiries, getCachedDesign, getCachedEvents, getCachedItem, getCachedPrp, insertEnquiry } from './db';
import { abortSync, startSyncQueue } from './syncQueue';
import { syncShowEnquiries, updateEnquiries } from './syncService';

const DESIGNATIONS = [
  'Owner', 'Partner', 'Director', 'Purchase Manager',
  'Merchandiser', 'Designer', 'Sales Head', 'Proprietor', 'Other',
];

const UNITS = ['mtr', 'kg', 'pcs', 'yds', 'ft', 'm'];

interface Design {
  dsn_code: number | string;
  is_new: boolean;
  dsn_name: string;
  dsn_qty: string;
  unit: string;
  dsn_rate: string;
  remark: string;
}

interface Item {
  item_name: string;
  item_code: string | number;
  is_new_item: boolean;
  item_qty: string;
  item_unit: string;
  item_rate: string;
  item_remark: string;
  designs: Design[];
}

export default function NewEnquiryScreen({ token, username }) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params || '';
  const [getUserPrptypeFromCache, setUserPrptype] = useState<string>('');
  const [mode, setMode] = useState('');
  const [partyName, setPartyName] = useState('');
  const [address, setAddress] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [contactName, setContactName] = useState('');
  const [designation, setDesignation] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [front_img, setFronImage] = useState('');
  const [front_path, setFrontPath] = useState('');
  const [cardFrontUri, setCardFrontUri] = useState();
  const [backUri, setBackUri] = useState();
  const [front_off_Uri, setFront_off_Uri] = useState();
  const [scannedFromCard, setScannedFromCard] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enquiries, setEnquiries] = useState([]);
  const [eventCode, setEventCode] = useState();
  const [getUserPrptype, setPrpCode] = useState();
  const [EVENTS, setEVENTS] = useState([]);
  const [PRPS, setPRPS] = useState([]);
  const [getToken, setToken] = useState('');
  const [debugModalVisible, setDebugModalVisible] = useState(false);
  const [debugData, setDebugData] = useState([]);

  // ITEMS state
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [allItems, setAllItems] = useState([]);
  const [displayedItems, setDisplayedItems] = useState([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [hasMoreItem, setHasMoreItem] = useState(false);
  const pageSize = 10;

  // DESIGN state for modal
  const [allDesigns, setAllDesigns] = useState([]);
  const [displayedDesigns, setDisplayedDesigns] = useState([]);
  const [designSearchQuery, setDesignSearchQuery] = useState('');
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [designModalVisible, setDesignModalVisible] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentDesignContext, setCurrentDesignContext] = useState<{ itemIndex: number } | null>(null);

  // Design form state for adding new design to an item
  const [designFormVisible, setDesignFormVisible] = useState(false);
  const [designFormContext, setDesignFormContext] = useState<{ itemIndex: number } | null>(null);
  const [designForm, setDesignForm] = useState<Design>({
    dsn_code: '',
    is_new: true,
    dsn_name: '',
    dsn_qty: '',
    unit: 'mtr',
    dsn_rate: '',
    remark: '',
  });
  const [designType, setDesignType] = useState<'existing' | 'new'>('existing');

  // Sync status
  const [syncStatus, setSyncStatus] = useState({
    visible: false,
    message: '',
    isSyncing: false,
    total: 0,
    synced: 0,
    failed: 0,
    currentItemName: '',
    validationErrors: null,
    failedItems: [],
  });
  const [failedItemsModalVisible, setFailedItemsModalVisible] = useState(false);
  const [failedItemsList, setFailedItemsList] = useState([]);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [prpModalVisible, setPrpModalVisible] = useState(false);
  // 
  const [itemTab, setItemTab] = useState<'Existing' | 'New'>('Existing');
  const [newItemName, setNewItemName] = useState('');
  const autoSyncDone = useRef(false);

  useEffect(() => {
    if (!token || !getUserPrptype || autoSyncDone.current) return;
    autoSyncDone.current = true;

    const autoSync = async () => {
      const online = await isOnline();
      if (!online) return;

      const pending = await getAllEnquiries();
      if (pending.length > 0 && !syncStatus.isSyncing) {
        startSyncQueue(token, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress);
      }
    };

    autoSync();
  }, [token, getUserPrptype, syncStatus.isSyncing]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        console.log('user_prptype', user_prptype);
        setUserPrptype(user_prptype);
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    initializeApp();
  }, [token, getUserPrptype]);

  const getImageUri = (uri) => {
    if (!uri) return null;
    if (
      uri.startsWith('http://') ||
      uri.startsWith('https://') ||
      uri.startsWith('file://') ||
      uri.startsWith('content://')
    ) {
      return uri;
    }
    return `${API}/${uri}`;
  };

  useEffect(() => {
    if (!token) return;
    setToken(token);
    getCachedEvents();
    getCachedPrp();
    checkConnectivity();
  }, [token]);

  useEffect(() => {
    if (id && id) {
      if (!token) return;
      const loadData = async () => {
        setLoading(true);
        try {
          const user_prptype = await AsyncStorage.getItem('user_prptype');
          const result = await syncShowEnquiries(id, token, getCurrentFinancialYear(), user_prptype);
          console.log('API RESULT =>', result);
          setEnquiries(result);

          if (result.party_name) setPartyName(result.party_name);
          if (result.address) setAddress(result.address);
          if (result.gst_no) setGstNo(result.gst_no);
          if (result.contact_name) setContactName(result.contact_name);
          if (result.mobile) setMobile(result.mobile);
          if (result.email) setEmail(result.email);
          if (result.front_img) setFronImage(result.front_img);
          if (result.front_img_path) setFrontPath(result.front_img_path);
          if (result.back_img) setBackUri(result.back_img);
          if (result.event_code) setEventCode(result.event_code);
          if (result.prptype) setPrpCode(result.prptype);
          if (result.designation) setDesignation(result.designation);
          console.log('Loaded enquiry data:', result.items);
          // Load items from API response
          if (result.items && Array.isArray(result.items)) {
            setSelectedItems(result.items);
          }

          setMode('edit');
        } catch (err) {
          setLoading(false);
          console.log('LOAD ERROR =>', err);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    } else {
      // setDesignation('');
      setMode('added');
    }
  }, [token, id]);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    try {
      const eventsString = await AsyncStorage.getItem('cached_events');
      if (eventsString) {
        const events = JSON.parse(eventsString);
        if (events && events.length > 0) {
          setEVENTS(events);
          setEventCode(events[0].EventId);
          console.log('Loaded events from cache', events);
        }
      }
    } catch (err) {
      console.log('Failed to load cached events', err);
    } finally {
      setLoading(false);
    }
  }, []);

  console.log('getUserPrptypeFromCache :', getUserPrptypeFromCache);

  const loadPrp = useCallback(async (getUserPrptypeFromCache) => {
    setLoading(true);
    try {
      const prpString = await AsyncStorage.getItem('cached_prp');
      if (prpString) {
        const prp = JSON.parse(prpString);
        if (prp && prp.length > 0) {
          setPRPS(prp);
          // setPrpCode(prp[0].prptype);
          setPrpCode(getUserPrptypeFromCache || prp[0].code); // Use cached prptype if available, otherwise use the first prp code
          console.log('Loaded prps from cache', prp);
        }
      }
    } catch (err) {
      console.log('Failed to load cached prps', err);
    } finally {
      setLoading(false);
    }
  }, [getUserPrptypeFromCache]);


  const loadDesing = useCallback(async () => {
    if (loadingDesigns) return;
    setLoadingDesigns(true);
    try {
      const cached = await getCachedDesign();
      if (!cached || cached.length === 0) {
        setAllDesigns([]);
        setDisplayedDesigns([]);
        setHasMore(false);
      } else {
        setAllDesigns(cached);
        // useEffect below will filter and set first page
      }
    } catch (err) {
      console.log('Failed to load cached designs', err);
    } finally {
      setLoadingDesigns(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    if (loadingItems) return;
    setLoadingItems(true);
    try {
      const cached = await getCachedItem();
      if (!cached || cached.length === 0) {
        setAllItems([]);
        setDisplayedItems([]);
        setHasMoreItem(false);
      } else {
        setAllItems(cached);
      }
    } catch (err) {
      console.log('Failed to load cached items', err);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  // Filter and paginate for items
  useEffect(() => {
    if (allItems.length === 0) {
      setDisplayedItems([]);
      setHasMoreItem(false);
      return;
    }
    const q = itemSearchQuery.toLowerCase().trim();
    const filtered = q
      ? allItems.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        String(d.dsn_code || '').toLowerCase().includes(q)
      )
      : allItems;
    const firstPageItems = filtered.slice(0, pageSize);
    setDisplayedItems(firstPageItems);
    setHasMoreItem(filtered.length > pageSize);
  }, [allItems, itemSearchQuery]);

  // Filter and paginate for designs
  // Update the filter effect for designs
  useEffect(() => {
    if (allDesigns.length === 0) {
      setDisplayedDesigns([]);
      setHasMore(false);
      return;
    }
    const q = designSearchQuery.toLowerCase().trim();
    const filtered = q
      ? allDesigns.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        String(d.dsn_code || '').toLowerCase().includes(q)
      )
      : allDesigns;
    const firstPageItems = filtered.slice(0, pageSize);
    setDisplayedDesigns(firstPageItems);
    setHasMore(filtered.length > pageSize);
  }, [allDesigns, designSearchQuery]);

  const loadMoreItems = useCallback(() => {
    if (loadingItems || !hasMoreItem) return;
    const q = itemSearchQuery.toLowerCase().trim();
    const filtered = q
      ? allItems.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        String(d.dsn_code || '').toLowerCase().includes(q)
      )
      : allItems;
    const start = displayedItems.length;
    const end = start + pageSize;
    const nextItems = filtered.slice(start, end);
    if (nextItems.length === 0) {
      setHasMoreItem(false);
      return;
    }
    setDisplayedItems(prev => [...prev, ...nextItems]);
    setHasMoreItem(end < filtered.length);
  }, [loadingItems, hasMoreItem, itemSearchQuery, allItems, displayedItems.length]);

  const loadMoreDesigns = useCallback(() => {
    if (loadingDesigns || !hasMore) return;
    const q = designSearchQuery.toLowerCase().trim();
    const filtered = q
      ? allDesigns.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        String(d.dsn_code || '').toLowerCase().includes(q)
      )
      : allDesigns;
    const start = displayedDesigns.length;
    const end = start + pageSize;
    const nextItems = filtered.slice(start, end);
    if (nextItems.length === 0) {
      setHasMore(false);
      return;
    }
    setDisplayedDesigns(prev => [...prev, ...nextItems]);
    setHasMore(end < filtered.length);
  }, [loadingDesigns, hasMore, designSearchQuery, allDesigns, displayedDesigns.length]);

  useEffect(() => {
    if (!token) return;
    if(!getUserPrptypeFromCache) return;
    loadEvent();
    loadPrp(getUserPrptypeFromCache);
  }, [token]);

  async function checkConnectivity() {
    const result = await isOnline();
    setOnline(result);
    // setOnline(false);
  }

  // ITEM SELECTION FUNCTIONS
  // const addItem = (item) => {
  //   // Check if item already exists
  //   const exists = selectedItems.some(i => i.item_code === item.dsn_code);
  //   if (exists) {
  //     Alert.alert('Item already added', `${item.name} is already in the list.`);
  //     return;
  //   }
  //   const newItem: Item = {
  //     item_name: item.name,
  //     item_code: String(item.dsn_code),
  //     designs: [],
  //   };
  //   setSelectedItems(prev => [...prev, newItem]);
  //   setItemModalVisible(false);
  // };
  const addItem = (item) => {
    const exists = selectedItems.some(
      i => i.item_code === String(item.dsn_code) && !i.is_new_item
    );
    if (exists) {
      Alert.alert('Item already added', `${item.name} is already in the list.`);
      return;
    }
    const newItem: Item = {
      item_name: item.name,
      item_code: Number(item.dsn_code),
      is_new_item: false,
      item_qty: '',
      item_unit: 'mtr',
      item_rate: '',
      item_remark: '',
      designs: [],
    };
    setSelectedItems(prev => [...prev, newItem]);
    setItemModalVisible(false);
  };

  // const addNewItem = () => {
  //   if (!newItemName.trim()) {
  //     Alert.alert('Required', 'Please enter item name.');
  //     return;
  //   }
  //   const newItem: Item = {
  //     item_name: newItemName.trim(),
  //     item_code: 0,
  //     is_new_item: true,
  //     designs: [],
  //   };
  //   setSelectedItems(prev => [...prev, newItem]);
  //   setNewItemName('');
  //   setItemTab('Existing');
  //   setItemModalVisible(false);
  // };
  const addNewItem = () => {
    if (!newItemName.trim()) {
      Alert.alert('Required', 'Please enter item name.');
      return;
    }
    const newItem: Item = {
      item_name: newItemName.trim(),
      item_code: 0,
      is_new_item: true,
      item_qty: '',
      item_unit: 'mtr',
      item_rate: '',
      item_remark: '',
      designs: [],
    };
    setSelectedItems(prev => [...prev, newItem]);
    setNewItemName('');
    setItemTab('Existing');
    setItemModalVisible(false);
  };

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemField = (itemIndex: number, field: keyof Item, value: string) => {
    setSelectedItems(prev => {
      const updated = [...prev];
      updated[itemIndex] = {
        ...updated[itemIndex],
        [field]: value,
      };
      return updated;
    });
  };

  // Replace the openDesignModal function:
  const openDesignModal = (itemIndex) => {
    setCurrentDesignContext({ itemIndex });
    setDesignSearchQuery('');
    setAllDesigns([]);
    setDisplayedDesigns([]);
    setHasMore(false);
    setDesignModalVisible(true);
    loadDesing();
  };

  useEffect(() => {
    console.log('displayedDesigns updated:', displayedDesigns.length);
  }, [displayedDesigns]);

  // Replace the addExistingDesign function:
  const addExistingDesign = (design) => {
    console.log('Adding existing design:', design);
    if (currentDesignContext === null) return;
    const { itemIndex } = currentDesignContext;
    const newDesign: Design = {
      dsn_code: design.dsn_code,
      is_new: false,
      dsn_name: design.name,
      dsn_qty: '',
      unit: 'mtr',
      dsn_rate: '',
      remark: '',
    };
    setSelectedItems(prev => {
      const updated = [...prev];
      if (!updated[itemIndex].designs) {
        updated[itemIndex].designs = [];
      }
      updated[itemIndex].designs.push(newDesign);
      return updated;
    });
    setDesignModalVisible(false);
    setCurrentDesignContext(null);
    // Reset search and pagination after adding
    setDesignSearchQuery('');
    setDisplayedDesigns([]);
    setHasMore(false);
  };

  const openDesignForm = (itemIndex: number) => {
    setDesignFormContext({ itemIndex });
    setDesignForm({
      dsn_code: '',
      is_new: true,
      dsn_name: '',
      dsn_qty: '',
      unit: 'mtr',
      dsn_rate: '',
      remark: '',
    });
    setDesignType('new');
    setDesignFormVisible(true);
  };

  const saveNewDesign = () => {
    if (designFormContext === null) return;
    if (!designForm.dsn_name.trim()) {
      Alert.alert('Required', 'Please enter a design name.');
      return;
    }
    const { itemIndex } = designFormContext;
    const newDesign: Design = {
      ...designForm,
      // dsn_code: designForm.dsn_code || `NEW_${Date.now()}`,
      dsn_code: designForm.dsn_code || 0,
      is_new: true,
    };
    setSelectedItems(prev => {
      const updated = [...prev];
      if (!updated[itemIndex].designs) {
        updated[itemIndex].designs = [];
      }
      updated[itemIndex].designs.push(newDesign);
      return updated;
    });
    setDesignFormVisible(false);
    setDesignFormContext(null);
    setDesignForm({
      dsn_code: '',
      is_new: true,
      dsn_name: '',
      dsn_qty: '',
      unit: 'mtr',
      dsn_rate: '',
      remark: '',
    });
  };

  const removeDesign = (itemIndex: number, designIndex: number) => {
    setSelectedItems(prev => {
      const updated = [...prev];
      updated[itemIndex].designs = updated[itemIndex].designs.filter((_, i) => i !== designIndex);
      return updated;
    });
  };

  const updateDesignField = (itemIndex: number, designIndex: number, field: keyof Design, value: string) => {
    setSelectedItems(prev => {
      const updated = [...prev];
      updated[itemIndex].designs[designIndex] = {
        ...updated[itemIndex].designs[designIndex],
        [field]: value,
      };
      return updated;
    });
  };

  const loadAllEnquiries = async () => {
    try {
      const all = await getAllEnquiries();
      setDebugData(all);
      setDebugModalVisible(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to load local data');
      console.log(err);
    }
  };

  const deleteAllEnquiries = async () => {
    try {
      const all = await deleteAllEnquiriesFromDB();
      setDebugData(all);
      // setDebugModalVisible(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to load local data');
      console.log(err);
    }
  };

  // SCAN CARD FUNCTIONS
  async function handleScanCard() {
    if (!getToken) return;
    await checkConnectivity();
    const currentlyOnline = await isOnline();
    if (!currentlyOnline) {
      Alert.alert(
        'No internet',
        "Card scan needs internet. You're offline right now — please fill the details manually."
      );
      return;
    }
    try {
      const uri = await captureCardPhoto();
      if (!uri) return;
      setScanning(true);
      const fields = await scanVisitingCard(uri, getToken);
      console.log('SCAN RESULT =>', fields);
      if (fields.party_name && !partyName) setPartyName(fields.party_name);
      if (fields.address && !address) setAddress(fields.address);
      if (fields.gst_no && !gstNo) setGstNo(fields.gst_no);
      if (fields.contact_name && !contactName) setContactName(fields.contact_name);
      if (fields.mobile && !mobile) setMobile(fields.mobile);
      if (fields.email && !email) setEmail(fields.email);
      if (fields.front_img && !front_img) setFronImage(fields.front_img);
      if (fields.front_img_path && !front_path) setFrontPath(fields.front_img_path);
      setScannedFromCard(true);
      Alert.alert('Card scanned', 'Details filled in below — please check them before saving.');
    } catch (err) {
      setCardFrontUri(null);
      setFronImage('');
      setFrontPath('');
      setScannedFromCard(false);
      if (err.message === 'OFFLINE') {
        Alert.alert('No internet', 'Lost connection during scan. Please fill details manually.');
      } else if (err.message === 'CAMERA_PERMISSION_DENIED') {
        Alert.alert('Camera permission needed', 'Please allow camera access to scan a card.');
      } else {
        Alert.alert('Scan failed', "Couldn't read the card clearly. Please try again.");
      }
    } finally {
      setScanning(false);
    }
  }

  async function handleUploadCard(token) {
    if (!getToken) return;
    await checkConnectivity();
    const currentlyOnline = await isOnline();
    if (!currentlyOnline) {
      Alert.alert('No internet', "Card scan needs internet.");
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow gallery permission.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setScanning(true);
      const fields = await scanVisitingCard(uri, getToken);
      if (fields.party_name) setPartyName(fields.party_name);
      if (fields.address) setAddress(fields.address);
      if (fields.gst_no) setGstNo(fields.gst_no);
      if (fields.contact_name) setContactName(fields.contact_name);
      if (fields.mobile) setMobile(fields.mobile);
      if (fields.email) setEmail(fields.email);
      if (fields.front_img) setFronImage(fields.front_img);
      if (fields.front_img_path) setFrontPath(fields.front_img_path);
      setScannedFromCard(true);
      Alert.alert('Card scanned', 'Details filled in below — please check them before saving.');
    } catch (err) {
      setCardFrontUri(null);
      setFronImage('');
      setFrontPath('');
      setScannedFromCard(false);
      console.error('CARD SCAN ERROR', err);
      Alert.alert('Scan failed', 'Could not read card. Please upload another image.');
    } finally {
      setScanning(false);
    }
  }

  async function handleUploadBackSide() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow gallery permission.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled) return;
      setBackUri(result.assets[0].uri);
    } catch (err) {
      console.log('BACK IMAGE ERROR', err);
    }
  }

  async function handleUploadFront_off_Side() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled) return;
      setFront_off_Uri(result.assets[0].uri);
    } catch (err) {
      console.log('FRONT IMAGE ERROR', err);
    }
  }

  const resetFormFields = () => {
    setPartyName('');
    setAddress('');
    setGstNo('');
    setContactName('');
    setDesignation('');
    setMobile('');
    setEmail('');
    setFronImage('');
    setFrontPath('');
    setCardFrontUri('');
    setBackUri('');
    setScannedFromCard(false);
    setFront_off_Uri('');
    setSelectedItems([]);
  };

  // SYNC progress handler
  const handleSyncProgress = useCallback((progress) => {
    switch (progress.type) {
      case 'start':
        setSyncStatus({
          visible: true,
          isSyncing: true,
          message: `Syncing ${progress.total} pending enquiries...`,
          total: progress.total,
          synced: 0,
          failed: 0,
          currentItemName: '',
          validationErrors: null,
          failedItems: [],
        });
        break;
      case 'progress':
        setSyncStatus(prev => ({
          ...prev,
          currentItemName: progress.currentItem.party_name || progress.currentItem.local_id
        }));
        break;
      case 'item_done':
        setSyncStatus(prev => {
          const newFailedItems = [...prev.failedItems];
          if (!progress.success && progress.enquiry) {
            const exists = newFailedItems.some(item => item.local_id === progress.enquiry.local_id);
            if (!exists) {
              newFailedItems.push({
                ...progress.enquiry,
                error: progress.error || 'Sync failed'
              });
            }
          }
          return {
            ...prev,
            synced: progress.syncedCount,
            failed: progress.failedCount,
            currentItemName: '',
            failedItems: newFailedItems,
          };
        });
        break;
      case 'all_done':
        if (progress.syncedCount === 0 && progress.failedCount === 0) {
          setSyncStatus({
            visible: false,
            isSyncing: false,
            message: '',
            total: 0,
            synced: 0,
            failed: 0,
            currentItemName: '',
            validationErrors: null,
            failedItems: [],
          });
        } else {
          setSyncStatus(prev => ({
            ...prev,
            visible: true,
            isSyncing: false,
            message: `All data synced successfully! (Synced: ${progress.syncedCount}, Failed: ${progress.failedCount})`,
            total: progress.syncedCount + progress.failedCount,
            synced: progress.syncedCount,
            failed: progress.failedCount,
            currentItemName: '',
            validationErrors: null,
          }));
        }
        break;
      case 'error':
        setSyncStatus({
          visible: true,
          isSyncing: false,
          message: `Sync error: ${progress.message}`,
          total: 0,
          synced: 0,
          failed: 0,
          currentItemName: '',
          validationErrors: null,
          failedItems: [],
        });
        break;
      case 'aborted':
        setSyncStatus({
          visible: true,
          isSyncing: false,
          message: 'Sync cancelled',
          total: 0,
          synced: 0,
          failed: 0,
          currentItemName: '',
          validationErrors: null,
          failedItems: [],
        });
        break;
      case 'validation_error':
        setSyncStatus(prev => ({
          ...prev,
          visible: true,
          isSyncing: false,
          message: `⚠️ Validation failed for ${progress.enquiry?.party_name || progress.enquiry?.local_id || 'enquiry'}`,
          validationErrors: progress.errors,
          synced: progress.syncedCount,
          failed: progress.failedCount,
          currentItemName: progress.enquiry?.party_name || progress.enquiry?.local_id,
          failedItems: prev.failedItems || [],
        }));
        break;
    }
  }, []);

  // SAVE FUNCTION
  async function handleSave(mode) {
    if (!partyName.trim()) {
      Alert.alert('Party name required', 'Please enter the company / party name.');
      return;
    }
    if (!email) {
      Alert.alert('Email required', 'Please enter the email.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!mobile) {
      Alert.alert('Mobile number required', 'Please enter the mobile number.');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert('Items required', 'Please add at least one item.');
      return;
    }
    if (getUserPrptype !== 'S') {
      const missingQty = selectedItems.some(i => !i.item_qty || !i.item_qty.trim());
      if (missingQty) {
        Alert.alert('Quantity required', 'Please enter quantity for all items.');
        return;
      }
    }

    setSaving(true);
    try {
      const userJson = await AsyncStorage.getItem('user_id');
      const user = userJson ? JSON.parse(userJson) : null;
      if (!user) {
        Alert.alert('Not logged in', 'Please log in again before saving.');
        setSaving(false);
        return;
      }
      const locl_id = mode === 'edit' ? enquiries?.local_id : `ENQ_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const index = Math.floor(Math.random() * 1000);
      const payload = {
        user_id: mode === 'edit' ? enquiries?.user_id : user,
        id: mode === 'edit' ? enquiries && enquiries?.id : index + 1,
        local_id: locl_id,
        party_name: partyName,
        address,
        gst_no: gstNo,
        contact_name: contactName,
        designation,
        mobile,
        email,
        front_img: online ? front_path : front_off_Uri,
        front_img_path: front_path,
        back_img: backUri,
        scanned_from_card: scannedFromCard,
        event_code: eventCode,
        items: selectedItems,
      };

      let saveSuccess = false;
      if (mode === 'edit') {
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        await updateEnquiries(payload?.id, token, getCurrentFinancialYear(), enquiries?.prptype, payload);
        saveSuccess = true;
      } else {
        await insertEnquiry(payload);
        saveSuccess = true;
      }

      if (!saveSuccess) {
        Alert.alert('Save failed', 'Could not save locally. Please try again.');
        setSaving(false);
        return;
      }

      const currentlyOnline = await isOnline();
      if (!currentlyOnline) {
        Alert.alert('Enquiry saved', "Saved on this device. It'll sync automatically once you're back online.");
        setSaving(false);
        resetFormFields();
        return;
      }

      // Online: start sync
      const syncResult = await new Promise((resolve) => {
        const syncCallback = (progress) => {
          handleSyncProgress(progress);
          if (progress.type === 'all_done' || progress.type === 'validation_error' || progress.type === 'error' || progress.type === 'aborted') {
            resolve(progress);
          }
        };
        startSyncQueue(getToken, getCurrentFinancialYear(), getUserPrptype, syncCallback);
      });

      if (syncResult.type === 'all_done' || syncResult.type === 'validation_error') {
        if (syncResult.failedCount === 0) {
          Alert.alert('Enquiry saved', 'Saved and synced to server successfully.');
          // resetFormFields();
          router.push('/event');
        } else {
          Alert.alert('Enquiry saved locally', `Sync completed with ${syncResult.failedCount} error(s). Check the sync banner.`);
        }
      } else {
        Alert.alert('Sync error', `An error occurred during sync: ${syncResult.message}`);
      }
      setSaving(false);
    } catch (err) {
      console.log('Save error', err);
      Alert.alert('Save failed', 'Something went wrong saving this enquiry. Please try again.');
      setSaving(false);
    }
  }

  const showFailedItems = () => {
    if (syncStatus.failedItems && syncStatus.failedItems.length > 0) {
      setFailedItemsList(syncStatus.failedItems);
      setFailedItemsModalVisible(true);
    } else {
      Alert.alert('No failed items', 'All enquiries synced successfully!');
    }
  };

  // RENDER DESIGN FORM
  const renderDesignForm = () => (
    <Modal
      visible={designFormVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setDesignFormVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.designFormModal}>
          <View style={styles.failedItemsHeader}>
            <Text style={styles.modalTitle}>Add New Design</Text>
            <TouchableOpacity onPress={() => setDesignFormVisible(false)}>
              <Icon name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Text style={styles.label}>Design Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter design name"
              value={designForm.dsn_name}
              onChangeText={(text) => setDesignForm(prev => ({ ...prev, dsn_name: text }))}
            />

            <Text style={[styles.label, { display: 'none' }]}>Design Code</Text>
            <TextInput
              style={[styles.input, { display: 'none' }]}
              placeholder="Auto-generated if left blank"
              value={designForm.dsn_code}
              onChangeText={(text) => setDesignForm(prev => ({ ...prev, dsn_code: text }))}
            />

            <Text style={styles.label}>Quantity (m) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter quantity"
              value={designForm.dsn_qty}
              onChangeText={(text) => setDesignForm(prev => ({ ...prev, dsn_qty: text }))}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Unit</Text>
            <View style={styles.chipRow}>
              {UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.chip, designForm.unit === unit && styles.chipActive]}
                  onPress={() => setDesignForm(prev => ({ ...prev, unit }))}
                >
                  <Text style={[styles.chipText, designForm.unit === unit && styles.chipTextActive]}>
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Rate (₹/unit)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter rate"
              value={designForm.dsn_rate}
              onChangeText={(text) => setDesignForm(prev => ({ ...prev, dsn_rate: text }))}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Remark</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Optional remark"
              value={designForm.remark}
              onChangeText={(text) => setDesignForm(prev => ({ ...prev, remark: text }))}
              multiline
            />

            <TouchableOpacity style={styles.saveBtn} onPress={saveNewDesign}>
              <Text style={styles.saveBtnText}>Add Design</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // RENDER ITEMS SECTION
  const renderItemsSection = () => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>Items & Designs</Text>

      {/* Add Item Button */}
      <TouchableOpacity
        style={[styles.addItemBtn, styles.scanBtn]}
        onPress={() => {
          setItemModalVisible(true);
          setItemSearchQuery('');
          setItemTab('Existing');
          setNewItemName('');
          loadItems();
        }}
      >
        <Icon name="add" size={20} color="#fff" />
        <Text style={styles.scanBtnText}> Add Item</Text>
      </TouchableOpacity>

      {/* Selected Items List */}
      {selectedItems.map((item, itemIndex) => (
        <View key={itemIndex} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemHeaderLeft}>
              <Text style={styles.itemName}>
                {item.item_name}
                {item.is_new_item && <Text style={styles.designNewBadge}> (New)</Text>}
              </Text>
              <Text style={styles.itemCode}>Code: {item.item_code}</Text>
            </View>
            <TouchableOpacity onPress={() => removeItem(itemIndex)}>
              <Icon name="close" size={22} color={C.danger} />
            </TouchableOpacity>
          </View>

          {/* Item-level Qty/Unit/Rate/Remark — jab prptype 'S' NAHI hai */}
          {getUserPrptype !== 'S' && (
            <View style={styles.designFields}>
              <View style={styles.designFieldRow}>
                <View style={styles.designField}>
                  <Text style={styles.designFieldLabel}>Qty</Text>
                  <TextInput
                    style={styles.designFieldInput}
                    value={item.item_qty}
                    onChangeText={(text) => updateItemField(itemIndex, 'item_qty', text)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={styles.designField}>
                  <Text style={styles.designFieldLabel}>Unit</Text>
                  <View style={styles.unitPicker}>
                    {UNITS.slice(0, 3).map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.unitChip,
                          item.item_unit === unit && styles.unitChipActive
                        ]}
                        onPress={() => updateItemField(itemIndex, 'item_unit', unit)}
                      >
                        <Text style={[
                          styles.unitChipText,
                          item.item_unit === unit && styles.unitChipTextActive
                        ]}>
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.designField}>
                  <Text style={styles.designFieldLabel}>Rate</Text>
                  <TextInput
                    style={styles.designFieldInput}
                    value={item.item_rate}
                    onChangeText={(text) => updateItemField(itemIndex, 'item_rate', text)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>
              <View style={styles.designFieldRow}>
                <View style={[styles.designField, { flex: 1 }]}>
                  <Text style={styles.designFieldLabel}>Remark</Text>
                  <TextInput
                    style={[styles.designFieldInput, styles.remarkInput]}
                    value={item.item_remark}
                    onChangeText={(text) => updateItemField(itemIndex, 'item_remark', text)}
                    placeholder="Optional remark"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Designs for this item */}
          {getUserPrptype === 'S' && (
            <View style={styles.designsContainer}>
              <View style={styles.designsHeader}>
                <Text style={styles.designsTitle}>Designs</Text>
                <View style={styles.designActions}>
                  <TouchableOpacity
                    style={styles.addDesignBtn}
                    onPress={() => openDesignModal(itemIndex)}
                  >
                    <Icon name="folder-open" size={16} color={C.brand} />
                    <Text style={styles.addDesignBtnText}>Existing</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addDesignBtn, styles.addNewDesignBtn]}
                    onPress={() => openDesignForm(itemIndex)}
                  >
                    <Icon name="add-circle" size={16} color="#fff" />
                    <Text style={[styles.addDesignBtnText, { color: '#fff' }]}>New</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Design List */}
              {item.designs && item.designs.length > 0 ? (
                item.designs.map((design, designIndex) => (
                  <View key={designIndex} style={styles.designCard}>
                    <View style={styles.designCardHeader}>
                      <View style={styles.designCardLeft}>
                        <Text style={styles.designCardName}>
                          {design.dsn_name}
                          {design.is_new && (
                            <Text style={styles.designNewBadge}> (New)</Text>
                          )}
                        </Text>
                        <Text style={styles.designCardCode}>
                          Code: {design.dsn_code}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removeDesign(itemIndex, designIndex)}>
                        <Icon name="close" size={18} color={C.danger} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.designFields}>
                      <View style={styles.designFieldRow}>
                        <View style={styles.designField}>
                          <Text style={styles.designFieldLabel}>Qty</Text>
                          <TextInput
                            style={styles.designFieldInput}
                            value={design.dsn_qty}
                            onChangeText={(text) => updateDesignField(itemIndex, designIndex, 'dsn_qty', text)}
                            keyboardType="numeric"
                            placeholder="0"
                          />
                        </View>
                        <View style={styles.designField}>
                          <Text style={styles.designFieldLabel}>Unit</Text>
                          <View style={styles.unitPicker}>
                            {UNITS.slice(0, 3).map((unit) => (
                              <TouchableOpacity
                                key={unit}
                                style={[
                                  styles.unitChip,
                                  design.unit === unit && styles.unitChipActive
                                ]}
                                onPress={() => updateDesignField(itemIndex, designIndex, 'unit', unit)}
                              >
                                <Text style={[
                                  styles.unitChipText,
                                  design.unit === unit && styles.unitChipTextActive
                                ]}>
                                  {unit}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        <View style={styles.designField}>
                          <Text style={styles.designFieldLabel}>Rate</Text>
                          <TextInput
                            style={styles.designFieldInput}
                            value={design.dsn_rate}
                            onChangeText={(text) => updateDesignField(itemIndex, designIndex, 'dsn_rate', text)}
                            keyboardType="numeric"
                            placeholder="0"
                          />
                        </View>
                      </View>
                      <View style={styles.designFieldRow}>
                        <View style={[styles.designField, { flex: 1 }]}>
                          <Text style={styles.designFieldLabel}>Remark</Text>
                          <TextInput
                            style={[styles.designFieldInput, styles.remarkInput]}
                            value={design.remark}
                            onChangeText={(text) => updateDesignField(itemIndex, designIndex, 'remark', text)}
                            placeholder="Optional remark"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDesignsText}>No designs added yet</Text>
              )}
            </View>
          )}
        </View>
      ))}

      {selectedItems.length === 0 && (
        <Text style={styles.noItemsText}>No items added. Tap "Add Item" to start.</Text>
      )}
    </View>
  );

  return (
    <>
      {loading && <FullScreenLoader />}
      <HeaderBarwithBack
        userName={username}
        header={'Event'}
        subHeaderText={online ? '● Online — card scan available' : '● Offline — saving locally, will sync later'}
        breadcrumb={'Event'}
        SearchBar={false}
        headerConnectColor={online ? 'green' : 'red'}
        headerConnectAnimation={true}
      />

      {/* SYNC BANNER */}
      {syncStatus.visible && (
        <TouchableOpacity
          style={[
            styles.syncBanner,
            syncStatus.failed > 0 ? styles.syncBannerError : styles.syncBannerSuccess,
            syncStatus.isSyncing && styles.syncBannerSyncing
          ]}
          onPress={showFailedItems}
          activeOpacity={0.8}
        >
          <View style={styles.syncBannerRow}>
            <View style={styles.syncBannerIcon}>
              <Icon
                name={
                  syncStatus.isSyncing
                    ? 'sync'
                    : syncStatus.failed > 0
                      ? 'warning-amber'
                      : 'check-circle'
                }
                size={22}
                color={
                  syncStatus.isSyncing
                    ? '#1976D2'
                    : syncStatus.failed > 0
                      ? '#F57C00'
                      : '#2E7D32'
                }
              />
            </View>
            <View style={styles.syncBannerContent}>
              <Text style={styles.syncBannerText}>{syncStatus.message}</Text>
              {syncStatus.isSyncing && (
                <View>
                  <Text style={styles.syncDetailText}>
                    {syncStatus.currentItemName
                      ? `Syncing: ${syncStatus.currentItemName}`
                      : `Progress: ${syncStatus.synced + syncStatus.failed}/${syncStatus.total}`
                    }
                  </Text>
                  <TouchableOpacity onPress={abortSync} style={styles.cancelSyncBtn}>
                    <Text style={styles.cancelSyncText}>Cancel Sync</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!syncStatus.isSyncing && syncStatus.failed > 0 && (
                <View style={styles.bannerActions}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="touch-app" size={16} color={C.muted} style={{ marginRight: 5 }} />
                    <Text style={styles.bannerTapHint}>Tap to see failed items</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      startSyncQueue(token, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="refresh" size={16} color="#fff" style={{ marginRight: 5 }} />
                      <Text style={styles.retryText}>Retry All</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}
      {/* <TouchableOpacity
        style={[styles.reportBtn, { marginHorizontal: 10, marginBottom: 5, marginTop: 10, backgroundColor: '#333' }]}
        onPress={deleteAllEnquiries}
      >
        <Text style={styles.reportBtnText}> Delete Cache DB</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.reportBtn, { marginHorizontal: 10, marginBottom: 5, marginTop: 10, backgroundColor: '#333' }]}
        onPress={loadAllEnquiries}
      >
        <Text style={styles.reportBtnText}> Debug DB</Text>
      </TouchableOpacity> */}

      <TouchableOpacity
        style={[styles.reportBtn, { marginHorizontal: 10, marginBottom: 5, marginTop: 10 }]}
        onPress={() => router.push({ pathname: '/EnquiryReportScreen' })}
      >
        <Text style={styles.reportBtnText}>Show Report</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* SCAN CARD BLOCK */}
          <View style={styles.scanBlock}>
            <Text style={styles.scanTitle}>Scan visiting card (optional)</Text>
            <View style={{ display: 'flex', flexDirection: 'row' }}>
              <TouchableOpacity
                style={[styles.scanBtn, { flex: 1, marginHorizontal: 10, marginBottom: 10 }, (!online || scanning) && styles.scanBtnDisabled]}
                onPress={() => handleScanCard()}
                disabled={!online || scanning}
              >
                {scanning ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.scanBtnText}>Scan visiting card</Text>
                )}
              </TouchableOpacity>
              <Text style={{ marginTop: 10, color: '#000' }}>OR</Text>
              <TouchableOpacity
                style={[styles.scanBtn, { flex: 1, marginHorizontal: 10, marginBottom: 10 }, (!online || scanning) && styles.scanBtnDisabled]}
                onPress={() => handleUploadCard(token)}
              >
                <Text style={styles.scanBtnText}>Upload Card</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.scanHint}>
              {online
                ? 'Captures name, address, mobile, email, company & GSTIN automatically. Needs internet.'
                : "No internet — card scan is unavailable. Type details below."}
            </Text>
          </View>

          {/* Prp Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Property</Text>
            <TouchableOpacity
              style={ mode === 'edit' ? [styles.dropdown, styles.dropdownDisabled] : styles.dropdown}
              onPress={() => setPrpModalVisible(true)}
              disabled={mode === 'edit'}
            >
              <Text style={ mode === 'edit' ? [styles.dropdownText, styles.dropdownTextDisabled] : styles.dropdownText}>
                {PRPS.find(e => e.code === getUserPrptype)?.name || 'Select Property'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Event Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Event</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setEventModalVisible(true)}
            >
              <Text style={styles.dropdownText}>
                {EVENTS.find(e => e.EventId === eventCode)?.EventName || 'Select Event'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <Field label="Party name *">
            <TextInput style={styles.input} placeholder="Company / party" value={partyName} onChangeText={setPartyName} />
          </Field>

          <Field label="Address">
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Street, city, state"
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </Field>

          <Field label="GST no. (optional)">
            <TextInput style={styles.input} placeholder="24XXXXXXXXXXXZ5" value={gstNo} onChangeText={setGstNo} autoCapitalize="characters" />
          </Field>

          <Field label="Contact name">
            <TextInput style={styles.input} placeholder="Person met at the stall" value={contactName} onChangeText={setContactName} />
          </Field>

          <Field label="Designation">
            <TextInput style={styles.input} placeholder="Designation" value={designation} onChangeText={setDesignation} />
            {/* <View style={styles.chipRow}>
              {DESIGNATIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, designation === d && styles.chipActive]}
                  onPress={() => setDesignation(d)}
                >
                  <Text style={[styles.chipText, designation === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View> */}
          </Field>

          <Field label="Mobile">
            <TextInput style={styles.input} placeholder="98XXXXXXXX" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
          </Field>

          <Field label="Email">
            <TextInput style={styles.input} placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </Field>

          {/* ITEMS & DESIGNS SECTION */}
          {renderItemsSection()}

          {/* Card Preview Section */}
          {(front_img || backUri) && online && (
            <View style={styles.cardPreviewContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Icon name="credit-card" size={22} color={C.brand} style={{ marginRight: 6 }} />
                <Text style={styles.cardPreviewTitle}>Card Preview</Text>
              </View>
              <View style={styles.cardRow}>
                <View style={styles.cardTile}>
                  <Text style={styles.cardSideLabel}>Front</Text>
                  <Image
                    source={{ uri: front_img, headers: { Connection: 'close' } }}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.cardTile}>
                  <Text style={styles.cardSideLabel}>Back</Text>
                  {backUri ? (
                    <Image
                      source={{ uri: getImageUri(backUri) }}
                      style={styles.cardImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <TouchableOpacity style={styles.uploadPlaceholder} onPress={handleUploadBackSide}>
                      <Text style={styles.uploadPlaceholderText}>Upload Back</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {backUri && (
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={handleUploadBackSide}>
                    <Text style={styles.actionText}>Replace Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setBackUri('')}>
                    <Text style={[styles.actionText, styles.actionRemove]}>Remove Back</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {!online && (
            <View style={styles.cardPreviewContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Icon name="credit-card" size={22} color={C.brand} style={{ marginRight: 6 }} />
                <Text style={styles.cardPreviewTitle}>Card Preview (Offline)</Text>
              </View>
              <View style={styles.cardRow}>
                <View style={styles.cardTile}>
                  <Text style={styles.cardSideLabel}>Front</Text>
                  {front_off_Uri ? (
                    <Image source={{ uri: getImageUri(front_off_Uri) }} style={styles.cardImage} resizeMode="contain" />
                  ) : (
                    <TouchableOpacity style={styles.uploadPlaceholder} onPress={handleUploadFront_off_Side}>
                      <Text style={styles.uploadPlaceholderText}>Upload Front</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.cardTile}>
                  <Text style={styles.cardSideLabel}>Back</Text>
                  {backUri ? (
                    <Image source={{ uri: getImageUri(backUri) }} style={styles.cardImage} resizeMode="contain" />
                  ) : (
                    <TouchableOpacity style={styles.uploadPlaceholder} onPress={handleUploadBackSide}>
                      <Text style={styles.uploadPlaceholderText}>Upload Back</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {(front_off_Uri || backUri) && (
                <View style={styles.cardActions}>
                  {front_off_Uri && (
                    <TouchableOpacity onPress={handleUploadFront_off_Side}>
                      <Text style={styles.actionText}>Replace Front</Text>
                    </TouchableOpacity>
                  )}
                  {backUri && (
                    <TouchableOpacity onPress={handleUploadBackSide}>
                      <Text style={styles.actionText}>Replace Back</Text>
                    </TouchableOpacity>
                  )}
                  {front_off_Uri && (
                    <TouchableOpacity onPress={() => setFront_off_Uri('')}>
                      <Text style={[styles.actionText, styles.actionRemove]}>Remove Front</Text>
                    </TouchableOpacity>
                  )}
                  {backUri && (
                    <TouchableOpacity onPress={() => setBackUri('')}>
                      <Text style={[styles.actionText, styles.actionRemove]}>Remove Back</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave(mode)} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{mode === 'edit' ? 'Update enquiry' : 'Save enquiry'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* PRP MODAL */}
      <Modal
        visible={prpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPrpModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPrpModalVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <FlatList
              data={PRPS}
              keyExtractor={(item) => String(item.code)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    // setEventCode(item.code);
                    setPrpCode(item.code);
                    setPrpModalVisible(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* EVENT MODAL */}
      <Modal
        visible={eventModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEventModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEventModalVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <FlatList
              data={EVENTS}
              keyExtractor={(item) => String(item.EventId)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setEventCode(item.EventId);
                    setEventModalVisible(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{item.EventName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ITEM SELECTION MODAL */}
      <Modal
        visible={itemModalVisible}
        animationType="slide"
        onRequestClose={() => setItemModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Item</Text>
            <TouchableOpacity onPress={() => setItemModalVisible(false)}>
              <Icon name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* Existing / New Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, itemTab === 'Existing' && styles.activeTab]}
              onPress={() => setItemTab('Existing')}
            >
              <Text style={[styles.tabText, itemTab === 'Existing' && styles.activeTabText]}>
                Existing
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, itemTab === 'New' && styles.activeTab]}
              onPress={() => setItemTab('New')}
            >
              <Text style={[styles.tabText, itemTab === 'New' && styles.activeTabText]}>
                New
              </Text>
            </TouchableOpacity>
          </View>

          {itemTab === 'New' ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Item Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter item name"
                value={newItemName}
                onChangeText={setNewItemName}
              />
              <Text style={[styles.label, { marginTop: 12, display: 'none' }]}>Item Code</Text>
              <TextInput style={[styles.input, { display: 'none' }]} value="0" editable={false} />

              <TouchableOpacity style={[styles.saveBtn, { marginTop: 16 }]} onPress={addNewItem}>
                <Text style={styles.saveBtnText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search Items..."
                value={itemSearchQuery}
                onChangeText={setItemSearchQuery}
              />

              {loadingItems ? (
                <ActivityIndicator size="large" color={C.brand} style={styles.modalLoader} />
              ) : (
                <FlatList
                  data={displayedItems}
                  keyExtractor={(item) => String(item.dsn_code)}
                  renderItem={({ item }) => {
                    const isSelected = selectedItems.some(
                      i => i.item_code === String(item.dsn_code) && !i.is_new_item
                    );
                    return (
                      <TouchableOpacity
                        style={[styles.modalDesignItem, isSelected && styles.modalDesignItemSelected]}
                        onPress={() => addItem(item)}
                      >
                        <Text style={styles.modalDesignItemText}>{item.name}</Text>
                        <Text style={styles.modalDesignItemCode}>{item.dsn_code}</Text>
                        {isSelected && <Icon name="check-circle" size={20} color={C.success} />}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={<Text style={styles.modalNoDesignsText}>No items found</Text>}
                  onEndReached={loadMoreItems}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={
                    loadingItems ? (
                      <ActivityIndicator size="large" color={C.brand} style={{ margin: 10 }} />
                    ) : hasMoreItem ? (
                      <ActivityIndicator size="small" color={C.brand} style={{ margin: 10 }} />
                    ) : null
                  }
                />
              )}
            </>
          )}
        </View>
      </Modal>

      {/* DESIGN SELECTION MODAL - FIXED RENDERING */}
      <Modal
        visible={designModalVisible}
        animationType="slide"
        onRequestClose={() => {
          setDesignModalVisible(false);
          setCurrentDesignContext(null);
          setDesignSearchQuery('');
          setDisplayedDesigns([]);
          setHasMore(false);
          setAllDesigns([]);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Existing Design</Text>
            <TouchableOpacity
              onPress={() => {
                setDesignModalVisible(false);
                setCurrentDesignContext(null);
                setDesignSearchQuery('');
                setDisplayedDesigns([]);
                setHasMore(false);
                setAllDesigns([]);
              }}
            >
              <Icon name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* <TextInput
            style={styles.modalSearchInput}
            placeholder="Search Designs..."
            value={designSearchQuery}
            onChangeText={(text) => {
              setDesignSearchQuery(text);
              setDisplayedDesigns([]);
              setHasMore(false);
              if (allDesigns.length > 0) {
                const q = text.toLowerCase().trim();
                const filtered = q
                  ? allDesigns.filter(d =>
                    (d.name || '').toLowerCase().includes(q) ||
                    String(d.dsn_code || '').toLowerCase().includes(q)
                  )
                  : allDesigns;
                setDisplayedDesigns(filtered.slice(0, pageSize));
                setHasMore(filtered.length > pageSize);
              } else {
                loadDesing();
              }
            }}
          /> */}
          <TextInput
            style={styles.modalSearchInput}
            placeholder="Search Designs..."
            value={designSearchQuery}
            onChangeText={setDesignSearchQuery}
          />

          {loadingDesigns ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
              <ActivityIndicator size="large" color={C.brand} />
              <Text style={{ marginTop: 10, color: C.muted }}>Loading designs...</Text>
            </View>
          ) : (
            <FlatList
              data={displayedDesigns}
              keyExtractor={(item, index) => `${item.dsn_code}_${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalDesignItem} onPress={() => addExistingDesign(item)}>
                  <Text style={styles.modalDesignItemText}>{item.name}</Text>
                  <Text style={styles.modalDesignItemCode}>{item.dsn_code}</Text>
                </TouchableOpacity>
              )}
              onEndReached={loadMoreDesigns}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingDesigns ? (
                  <ActivityIndicator size="large" color={C.brand} style={{ margin: 10 }} />
                ) : hasMore ? (
                  <ActivityIndicator size="small" color={C.brand} style={{ margin: 10 }} />
                ) : null
              }
            />
          )}
        </View>
      </Modal>

      {/* NEW DESIGN FORM MODAL */}
      {renderDesignForm()}

      {/* FAILED ITEMS MODAL */}
      <Modal
        visible={failedItemsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFailedItemsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.failedItemsModal}>
            <View style={styles.failedItemsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="cancel" size={22} color={C.danger} style={{ marginRight: 6 }} />
                <Text style={styles.failedItemsTitle}>Failed Sync Items</Text>
              </View>
              <TouchableOpacity onPress={() => setFailedItemsModalVisible(false)}>
                <Icon name="close" size={22} color={C.muted} />
              </TouchableOpacity>
            </View>

            {failedItemsList.length === 0 ? (
              <Text style={styles.noFailedItemsText}>No failed items to show</Text>
            ) : (
              <FlatList
                data={failedItemsList}
                keyExtractor={(item, index) => item.local_id || index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.failedItemCard}>
                    <Text style={styles.failedItemName}>{item.party_name || 'Unknown Party'}</Text>
                    <Text style={styles.failedItemId}>ID: {item.local_id || 'N/A'}</Text>
                    <Text style={styles.failedItemError}>
                      Error: {typeof item.error === 'string' ? item.error : JSON.stringify(item.error || 'Unknown error')}
                    </Text>
                  </View>
                )}
              />
            )}

            <View style={styles.failedItemsActions}>
              <TouchableOpacity
                style={[styles.failedItemsBtn, styles.retryAllBtn]}
                onPress={() => {
                  setFailedItemsModalVisible(false);
                  startSyncQueue(token, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="refresh" size={18} color="#fff" style={{ marginRight: 5 }} />
                  <Text style={styles.failedItemsBtnText}>Retry All Failed</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.failedItemsBtn, styles.closeBtn]}
                onPress={() => setFailedItemsModalVisible(false)}
              >
                <Text style={styles.failedItemsBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={debugModalVisible}
        animationType="slide"
        onRequestClose={() => setDebugModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fdfcf9', padding: 16, marginTop: 45 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '700' }}> Local Enquiries</Text>
            <TouchableOpacity onPress={() => setDebugModalVisible(false)}>
              {/* <Text style={{ fontSize: 18, color: '#b3552c' }}>✕ Close</Text> */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon
                  name="close"
                  size={22}
                  color={C.muted}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.modalCloseText}>
                  Close
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {debugData.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 40, color: '#6b7280' }}>No local data</Text>
          ) : (
            <FlatList
              data={debugData}
              keyExtractor={(item) => item.local_id}
              renderItem={({ item }) => (
                <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' }}>
                  <Text style={{ fontWeight: '700' }}>{item.party_name || 'No name'}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    local_id: {item.local_id} | server_id: {item.server_id || '—'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    sync: {item.sync_status} | event_code: {item.event_code || '—'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    created: {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────

const C = {
  brand: '#B3552C',
  brandDark: '#8F4220',
  brandSoft: '#FBEEE6',
  brandBorder: '#E8C9B6',
  ink: '#1F2937',
  body: '#374151',
  muted: '#6B7280',
  faint: '#9CA3AF',
  bg: '#FBFAF7',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F5F1',
  border: '#ECE9E2',
  borderInput: '#E2E0DA',
  success: '#1E8E3E',
  successBg: '#E9F7EE',
  successBorder: '#BFE6CC',
  danger: '#D7382F',
  dangerBg: '#FDECEA',
  dangerBorder: '#F4C7C3',
  info: '#1A73E8',
  infoBg: '#E8F0FE',
  infoBorder: '#C6DAFC',
  black: '#111315',
};

const shadowSoft = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
};

const shadowBtn = {
  shadowColor: C.brand,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.22,
  shadowRadius: 8,
  elevation: 3,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Scan card block
  scanBlock: {
    margin: 16,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: C.brandBorder,
    borderStyle: 'dashed',
    backgroundColor: C.brandSoft,
    borderRadius: 14,
    padding: 16,
  },
  scanTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.brandDark,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  scanBtn: {
    backgroundColor: C.brand,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowBtn,
    flexDirection: 'row',
  },
  reportBtn: {
    backgroundColor: C.black,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowSoft,
  },
  scanBtnDisabled: {
    backgroundColor: '#C9C4BB',
    shadowOpacity: 0,
    elevation: 0,
  },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
  reportBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
  scanHint: { fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 17 },

  // Form fields
  fieldGroup: { paddingHorizontal: 16, marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: C.body,
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: C.borderInput,
    borderRadius: 11,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: C.ink,
    backgroundColor: C.surface,
  },
  textarea: { minHeight: 74, textAlignVertical: 'top', paddingTop: 12 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: C.borderInput,
    borderRadius: 22,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: C.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { borderColor: C.brand, backgroundColor: C.brandSoft },
  chipText: { fontSize: 13, color: C.body },
  chipTextActive: { color: C.brandDark, fontWeight: '700' },

  // Save button
  saveBtn: {
    backgroundColor: C.brand,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 15,
    alignItems: 'center',
    ...shadowBtn,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

  dropdown: {
    borderWidth: 1,
    borderColor: C.borderInput,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownDisabled: { backgroundColor: '#f5f5f5', borderColor: '#ddd' },
  dropdownText: { flex: 1, color: C.ink, fontSize: 14 },
  dropdownTextDisabled: { color: C.muted, backgroundColor: '#f5f5f5'},
  dropdownArrow: { color: '#666', fontSize: 12 },
  dropdownModal: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 120, borderRadius: 12, maxHeight: 300 },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownItemText: { fontSize: 15, color: '#222' },

  // Items & Designs
  addItemBtn: { marginBottom: 12 },
  itemCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...shadowSoft,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  itemHeaderLeft: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', color: C.ink },
  itemCode: { fontSize: 12, color: C.muted, marginTop: 2 },

  designsContainer: { marginTop: 10 },
  designsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  designsTitle: { fontSize: 13, fontWeight: '700', color: C.body },
  designActions: { flexDirection: 'row', gap: 8 },
  addDesignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.brand,
    marginLeft: 8,
  },
  addNewDesignBtn: { backgroundColor: C.brand, borderColor: C.brand },
  addDesignBtnText: { fontSize: 11, fontWeight: '600', color: C.brand, marginLeft: 4 },

  designCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  designCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  designCardLeft: { flex: 1 },
  designCardName: { fontSize: 14, fontWeight: '600', color: C.ink },
  designNewBadge: { fontSize: 11, color: C.brand, fontWeight: '600' },
  designCardCode: { fontSize: 11, color: C.muted },
  designFields: { marginTop: 4 },
  designFieldRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  designField: { flex: 1 },
  designFieldLabel: { fontSize: 10, fontWeight: '600', color: C.muted, marginBottom: 2 },
  designFieldInput: {
    borderWidth: 1,
    borderColor: C.borderInput,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    backgroundColor: C.surface,
  },
  remarkInput: { minHeight: 34 },
  unitPicker: { flexDirection: 'row', gap: 4 },
  unitChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.borderInput,
    backgroundColor: C.surface,
  },
  unitChipActive: { borderColor: C.brand, backgroundColor: C.brandSoft },
  unitChipText: { fontSize: 10, color: C.body },
  unitChipTextActive: { color: C.brandDark, fontWeight: '700' },
  noDesignsText: { fontSize: 12, color: C.muted, textAlign: 'center', paddingVertical: 10 },
  noItemsText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 20 },

  // Design Form Modal
  designFormModal: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '85%',
    ...shadowSoft,
  },

  // Card preview
  cardPreviewContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    ...shadowSoft,
  },
  cardPreviewTitle: { fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  cardTile: {
    flex: 1,
    minWidth: 140,
    marginHorizontal: 4,
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  cardSideLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  cardImage: { width: '100%', height: 140, borderRadius: 10, backgroundColor: '#F0EFEC' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10 },
  actionText: { fontSize: 13, color: C.brand, fontWeight: '700' },
  actionRemove: { color: C.danger },
  uploadPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.brand,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF7F0',
  },
  uploadPlaceholderText: { color: C.brand, fontWeight: '700', fontSize: 13 },

  // Sync banner
  syncBanner: {
    padding: 14,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    ...shadowSoft,
  },
  syncBannerSuccess: { backgroundColor: C.successBg, borderColor: C.successBorder },
  syncBannerError: { backgroundColor: C.dangerBg, borderColor: C.dangerBorder },
  syncBannerSyncing: { backgroundColor: C.infoBg, borderColor: C.infoBorder },
  syncBannerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  syncBannerIcon: { marginRight: 10, marginTop: 1 },
  syncBannerContent: { flex: 1 },
  syncBannerText: { fontSize: 13.5, fontWeight: '700', color: C.ink },
  syncDetailText: { fontSize: 12, color: C.body, marginTop: 4 },
  cancelSyncBtn: { marginTop: 6 },
  cancelSyncText: { color: C.danger, fontSize: 12, fontWeight: '600' },
  bannerActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  bannerTapHint: { fontSize: 12, color: C.muted, marginRight: 12 },
  retryBtn: { backgroundColor: C.brand, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,19,21,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: { flex: 1, backgroundColor: C.bg, padding: 16 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 45,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: C.borderInput,
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: C.ink,
    backgroundColor: C.surface,
    marginBottom: 10,
  },
  modalLoader: { marginTop: 20 },
  modalDesignItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
    borderRadius: 10,
    marginBottom: 8,
    ...shadowSoft,
  },
  modalDesignItemSelected: { borderColor: C.success, borderWidth: 2 },
  modalDesignItemText: { fontSize: 16, color: C.ink, fontWeight: '600', flex: 1 },
  modalDesignItemCode: { fontSize: 12, color: C.muted, marginHorizontal: 10 },
  modalNoDesignsText: { textAlign: 'center', color: C.muted, marginTop: 20 },

  // Failed Items Modal
  failedItemsModal: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    ...shadowSoft,
  },
  failedItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 12,
  },
  failedItemsTitle: { fontSize: 18, fontWeight: '800', color: C.danger },
  failedItemCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  failedItemName: { fontSize: 15.5, fontWeight: '700', color: C.ink },
  failedItemId: { fontSize: 12, color: C.muted, marginTop: 2 },
  failedItemError: { fontSize: 13, color: C.danger, marginTop: 6 },
  noFailedItemsText: { textAlign: 'center', color: C.muted, padding: 20 },
  failedItemsActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  failedItemsBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, flex: 1, alignItems: 'center', marginHorizontal: 5 },
  retryAllBtn: { backgroundColor: C.brand },
  closeBtn: { backgroundColor: '#6B7280' },
  failedItemsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tabContainer: { flexDirection: 'row', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: C.brand },
  tabText: { fontSize: 14, color: C.body, fontWeight: '600' },
  activeTabText: { color: C.brand, fontWeight: '700' },
});