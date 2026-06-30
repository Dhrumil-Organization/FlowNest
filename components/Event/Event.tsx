import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureCardPhoto,
  scanVisitingCard,
  isOnline,
} from './CardScanService';
import { insertEnquiry, getAllEnquiries, getCachedEvents, getDesigns, getCachedDesign } from './db';
import { syncPendingEnquiries, syncShowEnquiries, updateEnquiries } from './syncService';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import { launchImageLibrary } from 'react-native-image-picker';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import { API } from '../../common/API/dynamicAPI';
import FullScreenLoader from '../FullScreenLoader/FullScreenLoader';
import { abortSync, startSyncQueue } from './syncQueue';
import theme from '../../android/app/src/theme';

const DESIGNATIONS = [
  'Owner', 'Partner', 'Director', 'Purchase Manager',
  'Merchandiser', 'Designer', 'Sales Head', 'Proprietor', 'Other',
];

export default function NewEnquiryScreen({ route, token, navigation, username }) {
  const { id } = route?.params || '';
  const [getUserPrptype, setUserPrptype] = useState<string>('');
  const [mode, setMode] = useState('');
  const [partyName, setPartyName] = useState('');
  const [address, setAddress] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [designRequirement, setDesignRequirement] = useState('Existing design');
  const [qtyRequired, setQtyRequired] = useState('');
  const [price, setPrice] = useState('');
  const [colourRequirement, setColourRequirement] = useState('');
  const [contactName, setContactName] = useState('');
  const [designation, setDesignation] = useState();
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [front_img, setFronImage] = useState('');
  const [front_path, setFrontPath] = useState('');
  const [cardFields, setCardFields] = useState({});
  const [getToken, setToken] = useState('');
  const [cardFrontUri, setCardFrontUri] = useState();
  const [backUri, setBackUri] = useState();
  const [front_off_Uri, setFront_off_Uri] = useState();
  const [backUriPath, setBackUriPath] = useState('');
  const [scannedFromCard, setScannedFromCard] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enquiries, setEnquiries] = useState([]);
  const [eventCode, setEventCode] = useState();
  const [EVENTS, setEVENTS] = useState([]);
  const [debugModalVisible, setDebugModalVisible] = useState(false);
  const [debugData, setDebugData] = useState([]);
  const [syncStatus, setSyncStatus] = useState({
    visible: false,
    message: '',
    isSyncing: false,
    total: 0,
    synced: 0,
    failed: 0,
    currentItemName: '',
    validationErrors: null,
    failedItems: [], // Store failed items for retry
  });
  const [designTab, setDesignTab] = useState();
  const [designDsnName, setDesignDsnName] = useState('');
  const [designDsnCode, setDesignDsnCode] = useState('');
  // const [designs, setDesigns] = useState([]);
  // Near other state declarations
  const [allDesigns, setAllDesigns] = useState([]);         // full list from cache
  const [displayedDesigns, setDisplayedDesigns] = useState([]); // current page items
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 10; // number of items per page
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [designSearchQuery, setDesignSearchQuery] = useState('');
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [designPage, setDesignPage] = useState(1);
  const [designModalVisible, setDesignModalVisible] = useState(false);
  // State for showing failed items modal
  const [failedItemsModalVisible, setFailedItemsModalVisible] = useState(false);
  const [failedItemsList, setFailedItemsList] = useState([]);

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

          console.log('API RESULT =>', getCurrentFinancialYear(), user_prptype, result);

          setEnquiries(result);
          // if (result) {
            
          // }

          if (result.party_name) setPartyName(result.party_name);
          if (result.address) setAddress(result.address);
          if (result.gst_no) setGstNo(result.gst_no);
          if (result.contact_name) setContactName(result.contact_name);
          if (result.mobile) setMobile(result.mobile);
          if (result.email) setEmail(result.email);
          if (result.front_img) setFronImage(result.front_img);
          if (result.front_img_path) setFrontPath(result.front_img_path);
          if (result.back_img) setBackUri(result.back_img);
          if (result.back_img_path) setBackUriPath(result.back_img_path);
          if (result.qty_required) setQtyRequired(result.qty_required);
          if (result.event_code) setEventCode(result.event_code);
          if (result.designation) setDesignation(result.designation);
          if (result.design_dsn_name) setDesignDsnName(result.design_dsn_name);
          if (result.design_dsn_code) setDesignDsnCode(result.design_dsn_code);
          if (result.design_requirement) setDesignTab(result.design_requirement);
          if (result.design_dsn_name && result.design_dsn_code && result.design_requirement === 'Existing') {
            const dsn = {
              name: result?.design_dsn_name,
              dsn_code: result?.design_dsn_code
            };
            console.log('EXISTING DSN', dsn);
            if (result.design_requirement) setSelectedDesign(dsn);
          }
          setMode('edit');
        } catch (err) {
          setLoading(false);
          console.log('LOAD ERROR =>', err);
        }
      };

      loadData();
    } else {
      setDesignTab('Existing');
      setDesignation('Purchase Manager');
      setMode('added');
    }
  }, [token, id]);

  console.log("enquiries: ", enquiries);

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

  const EVENTS_CACHE_KEY = 'cached_events';
  const DESIGNS_CACHE_KEY = 'cached_designs';

  const loadEvent = useCallback(async () => {
    setLoading(true);
    try {
      const eventsString = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
      if (eventsString) {
        const events = JSON.parse(eventsString);
        if (events && events.length > 0) {
          setEVENTS(events);
          setEventCode(events[0].EventId);
          console.log('Loaded events from cache', events);
        } else {
          console.log('Cached events array is empty');
        }
      } else {
        console.log('No cached events found');
      }
    } catch (err) {
      console.log('Failed to load cached events', err);
    } finally {
      setLoading(false);
    }
  }, []);


  // const loadDesing = useCallback(async () => {
  //   if (loadingDesigns) return;
  //   setLoadingDesigns(true);

  //   try {
  //     // 1. Fetch all designs from cache (chunked)
  //     const cached = await getCachedDesign();
  //     if (!cached || cached.length === 0) {
  //       setAllDesigns([]);
  //       setDisplayedDesigns([]);
  //       setHasMore(false);
  //       setLoadingDesigns(false);
  //       return;
  //     }

  //     // 2. Store full list in state
  //     setAllDesigns(cached);

  //     // 3. Filter based on search query (if any)
  //     const q = designSearchQuery.toLowerCase().trim();
  //     const filtered = q
  //       ? cached.filter(
  //         (d) =>
  //           d.name?.toLowerCase().includes(q) ||
  //           d.dsn_code?.toLowerCase().includes(q)
  //       )
  //       : cached;

  //     // 4. Paginate – take first page
  //     const page = 1;
  //     const start = 0;
  //     const end = page * pageSize;
  //     const pageItems = filtered.slice(start, end);

  //     setDisplayedDesigns(pageItems);
  //     setCurrentPage(page);
  //     setHasMore(end < filtered.length);
  //   } catch (err) {
  //     console.log('Failed to load cached designs', err);
  //     // Optionally fallback to API call here
  //   } finally {
  //     setLoadingDesigns(false);
  //   }
  // }, [designSearchQuery]);
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
        // The useEffect below will filter and set the first page
      }
    } catch (err) {
      console.log('Failed to load cached designs', err);
    } finally {
      setLoadingDesigns(false);
    }
  }, []);

  // Filter and paginate whenever the full list or search query changes
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

    // Reset to first page
    setCurrentPage(1);
    const firstPageItems = filtered.slice(0, pageSize);
    setDisplayedDesigns(firstPageItems);
    setHasMore(filtered.length > pageSize);
  }, [allDesigns, designSearchQuery]);

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

  // useEffect(() => {
  //   if (designs.length) {
  //     const q = designSearchQuery.toLowerCase();
  //     const filtered = designs.filter(
  //       d => d.name?.toLowerCase().includes(q) ||
  //         d.dsn_code?.toLowerCase().includes(q)
  //     );
  //     setDesigns(filtered);
  //   }
  // }, [designSearchQuery]);

  // const loadMoreDesigns = () => {
  //   if (!loadingDesigns && designs.length < 100000) {
  //     const nextPage = Math.floor(designs.length / 1000) + 1;
  //     loadDesing(nextPage);
  //   }
  // };

  useEffect(() => {
    if (!token) return;

    const checkAndStartSync = async () => {
      const online = await isOnline();
      if (!online) return;

      const pending = await getAllEnquiries();
      if (pending.length > 0) {
        startSyncQueue(getToken, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress);
      }
    };

    checkAndStartSync();
  }, [token, getUserPrptype]);

  // Sync progress handler - IMPROVED to collect failed items
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
        // Collect failed items for later display
        setSyncStatus(prev => {
          const newFailedItems = [...prev.failedItems];
          if (!progress.success && progress.enquiry) {
            // Add the failed enquiry to the list if not already there
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
        // अगर कुल sync कुछ नहीं हुआ तो banner छुपा दो
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

  useEffect(() => {
    if (!token) return;
    loadEvent();
  }, [token]);

  // const filteredDesigns = designs.filter(
  //   (design) =>
  //     design?.name?.toLowerCase()?.includes(designSearchQuery.toLowerCase()) ||
  //     design?.dsn_code?.toLowerCase()?.includes(designSearchQuery.toLowerCase())
  // );

  const handleDesignSearch = (query) => {
    setDesignSearchQuery(query);
    // Resetting page and reloading is handled by useEffect below
  };

  console.log("default EventId: ", eventCode);

  async function checkConnectivity() {
    const result = await isOnline();
    setOnline(result);
  }

  async function handleScanCard() {
    if (!getToken) return;
    await checkConnectivity();
    const currentlyOnline = await isOnline();

    if (!currentlyOnline) {
      Alert.alert(
        'No internet',
        "Card scan needs internet. You're offline right now — please fill the details manually, or try scanning again once you're back online."
      );
      return;
    }

    try {
      const uri = await captureCardPhoto();
      if (!uri) return;

      setScanning(true);

      const fields = await scanVisitingCard(uri, getToken);

      console.log('SCAN RESULT =>', fields);

      if (fields.party_name && !partyName) {
        setPartyName(fields.party_name);
        setCardFields(prev => ({ ...prev, party_name: true }));
      }
      if (fields.address && !address) {
        setAddress(fields.address);
        setCardFields(prev => ({ ...prev, address: true }));
      }
      if (fields.gst_no && !gstNo) {
        setGstNo(fields.gst_no);
        setCardFields(prev => ({ ...prev, gst_no: true }));
      }
      if (fields.contact_name && !contactName) {
        setContactName(fields.contact_name);
        setCardFields(prev => ({ ...prev, contact_name: true }));
      }
      if (fields.mobile && !mobile) {
        setMobile(fields.mobile);
        setCardFields(prev => ({ ...prev, mobile: true }));
      }
      if (fields.email && !email) {
        setEmail(fields.email);
        setCardFields(prev => ({ ...prev, email: true }));
      }
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
        Alert.alert('Scan failed', "Couldn't read the card clearly. Please try again or enter details manually.");
      }
    } finally {
      setScanning(false);
    }
  }

  console.log('front_img_path', front_path);

  async function handleUploadCard(token) {
    if (!getToken) return;
    await checkConnectivity();
    const currentlyOnline = await isOnline();

    if (!currentlyOnline) {
      Alert.alert(
        'No internet',
        "Card scan needs internet. You're offline right now — please fill the details manually, or try scanning again once you're back online."
      );
      return;
    }
    try {

      const res = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });

      console.log('Img res', res);

      if (!res) {
        return;
      }

      console.log('Img res 1', res?.assets?.[0]);

      const uri = res.assets[0].uri;

      console.log('Frontend IMAGE', uri);

      setScanning(true);

      const fields = await scanVisitingCard(uri, getToken);

      if (fields.party_name) {
        setPartyName(fields.party_name);
        setCardFields(prev => ({ ...prev, party_name: true }));
      }
      if (fields.address) {
        setAddress(fields.address);
        setCardFields(prev => ({ ...prev, address: true }));
      }
      if (fields.gst_no) {
        setGstNo(fields.gst_no);
        setCardFields(prev => ({ ...prev, gst_no: true }));
      }
      if (fields.contact_name) {
        setContactName(fields.contact_name);
        setCardFields(prev => ({ ...prev, contact_name: true }));
      }
      if (fields.mobile) {
        setMobile(fields.mobile);
        setCardFields(prev => ({ ...prev, mobile: true }));
      }
      if (fields.email) {
        setEmail(fields.email);
        setCardFields(prev => ({ ...prev, email: true }));
      }
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
      Alert.alert(
        'Scan failed',
        'Could not read card. Please upload another image.'
      );
    } finally {
      setScanning(false);
    }
  }

  console.log("cardFrontUri: ", cardFrontUri);

  async function handleUploadBackSide() {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });

      if (!res) {
        return;
      }

      const uri = res.assets[0].uri;

      console.log('BACK IMAGE', uri);

      setBackUri(uri);

    } catch (err) {
      console.log('BACK IMAGE ERROR', err);
    }
  }

  async function handleUploadFront_off_Side() {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });

      if (!res) {
        return;
      }

      const uri = res.assets[0].uri;

      console.log('BACK IMAGE', uri);

      setFront_off_Uri(uri);

    } catch (err) {
      console.log('BACK IMAGE ERROR', err);
    }
  }

  // Helper function to reset all form fields
  const resetFormFields = () => {
    setPartyName('');
    setAddress('');
    setGstNo('');
    setDesignRequirement('Existing design');
    setQtyRequired('');
    setPrice('');
    setColourRequirement('');
    setContactName('');
    setDesignation('Purchase Manager');
    setMobile('');
    setEmail('');
    setFronImage('');
    setFrontPath('');
    setCardFrontUri('');
    setBackUri('');
    setBackUriPath('');
    setScannedFromCard(false);
    setDesignTab('Existing');
    setDesignDsnName('');
    setDesignDsnCode('');
    setSelectedDesign(null);
    setFront_off_Uri('');
    setCardFields({});
  };

  async function handleSave(mode) {
    console.log('mode at save time :', mode);
    // ... validation checks ...

    if (!partyName.trim()) {
      Alert.alert('Party name required', 'Please enter the company / party name.');
      return;
    }
    if (!qtyRequired.trim()) {
      Alert.alert('Quantity required', 'Please enter the required quantity.');
      return;
    }

    if (!email) {
      Alert.alert('Email required', 'Please enter the email.');
      return;
    }
    // Email Validayion
    if (!email) {
      Alert.alert('Email required', 'Please enter the email.');
      return;
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if(!mobile) {
      Alert.alert('Mobile number required', 'Please enter the mobile number.');
      return;
    }

    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit mobile number.');
      return;
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

      // auto index generate new  every time number
      const index = Math.floor(Math.random() * 1000);

      // Prepare payload
      const payload = {
        ...enquiries,
        user_id: mode === 'edit' ? enquiries && enquiries?.user_id : user,
        id: mode === 'edit' ? enquiries && enquiries?.id : index + 1,
        party_name: partyName,
        address,
        gst_no: gstNo,

        design_requirement: designTab,
        qty_required: qtyRequired,
        price,

        colour_requirement: colourRequirement,
        contact_name: contactName,
        designation,

        mobile,
        email,

        front_img: online ? front_path : front_off_Uri,
        // front_img: front_path,
        // front_img: cardFrontUri || front_path,
        front_img_path: front_path,
        back_img: backUri,
        back_img_path: backUri,

        card_front_uri: cardFrontUri,
        scanned_from_card: scannedFromCard,

        event_code: eventCode,

        design_dsn_name: designDsnName,
        design_dsn_code: designDsnCode,
      }

      let saveSuccess = false;
      if (mode === 'edit') {
        // update logic
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        await updateEnquiries(payload?.id, token, getCurrentFinancialYear(), user_prptype, payload);
        saveSuccess = true;
      } else {
        // insert logic
        console.log("save paylaod:", payload);
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
        Alert.alert(
          'Enquiry saved',
          "Saved on this device. It'll sync automatically once you're back online.",
          [{ text: 'OK' }]
        );
        setSaving(false);
        return;
      }

      // Online: start sync and wait for completion
      // Use a promise to wait for sync to finish
      const syncResult = await new Promise((resolve) => {
        const syncCallback = (progress) => {
          // Update sync status banner (existing logic)
          handleSyncProgress(progress);

          if (progress.type === 'all_done' || progress.type === 'validation_error' || progress.type === 'error' || progress.type === 'aborted') {
            resolve(progress);
          }
        };
        startSyncQueue(getToken, getCurrentFinancialYear(), getUserPrptype, syncCallback);
      });

      // After sync completes, show final alert
      if (syncResult.type === 'all_done' && mode === 'added') {
        if (syncResult.failedCount === 0) {
          Alert.alert(
            'Enquiry saved',
            'Saved and synced to server successfully.',
            [{ text: 'OK' }]
          );
          // Reset form fields on successful online save
          resetFormFields();
        } else {
          Alert.alert(
            'Enquiry saved locally',
            `Sync completed with ${syncResult.failedCount} error(s). Check the sync banner for details.`,
            [{ text: 'OK' }]
          );
          // Reset form fields on successful online save
          resetFormFields();
        }
      }
      if (syncResult.type === 'all_done' && mode === 'edit') {
        if (syncResult.failedCount === 0) {
          Alert.alert(
            'Enquiry saved',
            'Saved and synced to server successfully.',
            [{ text: 'OK' }]
          );
          // Reset form fields on successful online save
          // resetFormFields();
        } else {
          Alert.alert(
            'Enquiry saved locally',
            `Sync completed with ${syncResult.failedCount} error(s). Check the sync banner for details.`,
            [{ text: 'OK' }]
          );
          // Reset form fields on successful online save
          // resetFormFields();
        }
      } else if (syncResult.type === 'all_done') {
        if (syncResult.failedCount === 0) {
          Alert.alert(
            'Enquiry saved',
            'Saved and synced to server successfully.',
            [{ text: 'OK' }]
          );
          // Reset form fields on successful online save
          resetFormFields();
        } else {
          Alert.alert(
            'Enquiry saved locally',
            `Sync completed with ${syncResult.failedCount} error(s). Check the sync banner for details.`,
            [{ text: 'OK' }]
          );
          // Reset form fields on successful online save
          resetFormFields();
        }
      }
      else if (syncResult.type === 'validation_error') {
        Alert.alert(
          'Validation Error',
          `Failed to sync: ${JSON.stringify(syncResult.errors)}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sync error',
          `An error occurred during sync: ${syncResult.message}`,
          // [{ text: 'OK', onPress: () => navigation.goBack() }]
          [{ text: 'OK' }]
        );
      }
      setSaving(false);
    } catch (err) {
      console.log('Save error', err);
      Alert.alert('Save failed', 'Something went wrong saving this enquiry. Please try again.');
      setSaving(false);
    }
  }

  // Function to show failed items modal
  const showFailedItems = () => {
    if (syncStatus.failedItems && syncStatus.failedItems.length > 0) {
      setFailedItemsList(syncStatus.failedItems);
      setFailedItemsModalVisible(true);
    } else if (syncStatus.validationErrors) {
      // If there's a validation error but no failed items list, create one
      const errorItem = {
        party_name: syncStatus.currentItemName || 'Unknown',
        local_id: 'N/A',
        error: JSON.stringify(syncStatus.validationErrors)
      };
      setFailedItemsList([errorItem]);
      setFailedItemsModalVisible(true);
    } else {
      Alert.alert('No failed items', 'All enquiries synced successfully!');
    }
  };

  // Function to retry failed items
  const retryFailedItems = () => {
    if (syncStatus.failedItems && syncStatus.failedItems.length > 0) {
      // Close modal and restart sync
      setFailedItemsModalVisible(false);
      startSyncQueue(getToken, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress);
    } else {
      Alert.alert('No failed items to retry');
    }
  };

  return (
    <>
      {loading && <FullScreenLoader />}
      <HeaderBarwithBack userName={username} header={'Event'} subHeader={online ? '● Online — card scan available' : '● Offline — saving locally, will sync later'} headerConnect={true} headerConnectColor={online ? 'green' : 'red'} headerConnectAnimation={true} />

      {/* SYNC BANNER - IMPROVED with clickable functionality */}
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
              <Text style={styles.syncBannerIconText}>
                {syncStatus.isSyncing ? '🔄' : syncStatus.failed > 0 ? '⚠️' : '✅'}
              </Text>
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
                  <Text style={styles.bannerTapHint}>👆 Tap to see failed items</Text>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent triggering parent onPress
                      startSyncQueue(token, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress);
                    }}
                  >
                    <Text style={styles.retryText}>↻ Retry All</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!syncStatus.isSyncing && syncStatus.failed === 0 && syncStatus.synced > 0 && (
                <Text style={styles.syncSuccessDetail}>✓ All enquiries synced successfully</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}
      {/* <TouchableOpacity
        style={[styles.reportBtn, { marginHorizontal: 10, marginBottom: 5, marginTop: 10, backgroundColor: '#333' }]}
        onPress={loadAllEnquiries}
      >
        <Text style={styles.reportBtnText}>📂 Debug DB</Text>
      </TouchableOpacity> */}
      <TouchableOpacity
        style={[
          styles.reportBtn, { marginHorizontal: 10, marginBottom: 5, marginTop: 10 },
        ]}
        onPress={() =>
          navigation.navigate('EnquiryReportScreen')
        }
      >
        <Text style={styles.reportBtnText}>
          🖼 Show Report
        </Text>
      </TouchableOpacity>

      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>


        {/* SCAN CARD BLOCK */}
        <View style={styles.scanBlock}>
          <Text style={styles.scanTitle}>📇 Scan visiting card (optional)</Text>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            <TouchableOpacity
              style={[styles.scanBtn, styles.scanBtn, { flex: 1, marginHorizontal: 10, marginBottom: 10 }, (!online || scanning) && styles.scanBtnDisabled]}
              onPress={() => handleScanCard(token)}
              disabled={!online || scanning}
            >
              {scanning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.scanBtnText}>📷 Scan visiting card</Text>
              )}
            </TouchableOpacity>
            <Text style={{ marginTop: 10, color: '#000' }} >OR</Text>
            <TouchableOpacity
              style={[
                styles.scanBtn, { flex: 1, marginHorizontal: 10, marginBottom: 10 }, (!online || scanning) && styles.scanBtnDisabled]}
              onPress={() => handleUploadCard(token)}
            >
              <Text style={styles.scanBtnText}>
                🖼 Upload Card
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.scanHint}>
            {online
              ? 'Captures name, address, mobile, email, company & GSTIN automatically. Needs internet.'
              : "No internet — card scan is unavailable. Type details below, or scan once you're back online."}
          </Text>
          {cardFrontUri ? (
            <Image source={{ uri: getImageUri(cardFrontUri) }} style={styles.cardPreview} />
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', marginTop: 10 }} />

        <View style={styles.pickerWrap}>
          <Picker selectedValue={eventCode} onValueChange={setEventCode}>
            {EVENTS &&
              EVENTS.map(e => (
                <Picker.Item
                  key={e.EventId}
                  label={e.EventName}
                  value={e.EventId}
                />
              ))}
          </Picker>
        </View>

        <Field label="Party name *">
          <TextInput style={[styles.input, cardFields.party_name && styles.cardFilledInput]} placeholder="Company / party" value={partyName} onChangeText={setPartyName} />
        </Field>

        <Field label="Address">
          <TextInput
            style={[styles.input, styles.textarea, cardFields.address && styles.cardFilledInput]}
            placeholder="Street, city, state"
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </Field>

        <Field label="GST no. (optional)">
          <TextInput style={[styles.input, cardFields.gst_no && styles.cardFilledInput]} placeholder="24XXXXXXXXXXXZ5" value={gstNo} onChangeText={setGstNo} autoCapitalize="characters" />
        </Field>

        <Field label="Design">
          <View style={styles.designSection}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, designTab === 'Existing' && styles.activeTab]}
                onPress={() => {
                  setDesignTab('Existing');
                  setDesignDsnName(selectedDesign?.name || '');
                  setDesignDsnCode(selectedDesign?.dsn_code || '');
                }}
              >
                <Text style={[styles.tabText, designTab === 'Existing' && styles.activeTabText]}>
                  Existing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, designTab === 'New' && styles.activeTab]}
                onPress={() => {
                  setDesignTab('New');
                  setDesignDsnName('');
                  setDesignDsnCode('0');
                  setSelectedDesign(null);
                }}
              >
                <Text style={[styles.tabText, designTab === 'New' && styles.activeTabText]}>
                  New
                </Text>
              </TouchableOpacity>
            </View>

            {designTab === 'New' ? (
              <View style={styles.newDesignContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Design Name"
                  value={designDsnName}
                  onChangeText={(text) => {
                    setDesignDsnName(text);
                    setDesignDsnCode('0');
                    setDesignTab('New');
                  }}
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="Design Code (Default: 0)"
                  value={designDsnCode}
                  editable={false}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.existingDesignInput}
                onPress={() => {
                  setDesignModalVisible(true);
                  setDesignSearchQuery('');
                  // setDesigns([]);
                  loadDesing();
                  // if (designs.length === 0) loadDesing();
                }}
              >
                <Text style={styles.existingDesignInputText}>
                  {selectedDesign ? selectedDesign.name : 'Select Design'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Field>

        <Field label="Qty required (m) *">
          <TextInput style={styles.input} placeholder="5000" value={qtyRequired} onChangeText={setQtyRequired} keyboardType="numeric" />
        </Field>

        <Field label="Price (₹/m)">
          <TextInput style={styles.input} placeholder="optional" value={price} onChangeText={setPrice} keyboardType="numeric" />
        </Field>

        <Field label="Colour requirement">
          <TextInput style={styles.input} placeholder="optional" value={colourRequirement} onChangeText={setColourRequirement} />
        </Field>

        <Field label="Contact name">
          <TextInput style={[styles.input, cardFields.contact_name && styles.cardFilledInput]} placeholder="Person met at the stall" value={contactName} onChangeText={setContactName} />
        </Field>

        <Field label="Designation">
          <View style={styles.chipRow}>
            {DESIGNATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, designation === d && styles.chipActive]}
                onPress={() => setDesignation(d)}
              >
                <Text style={[styles.chipText, designation === d && styles.chipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Mobile">
          <TextInput style={[styles.input, cardFields.mobile && styles.cardFilledInput]} placeholder="98XXXXXXXX" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
        </Field>

        <Field label="Email">
          <TextInput style={[styles.input, cardFields.email && styles.cardFilledInput]} placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </Field>

        {/* {front_img ? (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 15,
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              padding: 10,
              backgroundColor: '#fff',
            }}
          >

            <Text
              style={{
                fontWeight: '700',
                fontSize: 16,
                marginBottom: 10,
              }}
            >
              Card Preview
            </Text>

            <Text
              style={{
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              Front Side
            </Text>

            <Image
              source={{
                uri: front_img,
                headers: {
                  Connection: 'close',
                },
              }}
              style={{
                width: '100%',
                height: 180,
              }}
              resizeMode="contain"
            />

            <View style={{ marginTop: 20 }}>

              <Text
                style={{
                  fontWeight: '600',
                  marginBottom: 8,
                }}
              >
                Back Side
              </Text>

              {backUri ? (
                <>
                  <Image
                    source={{ uri: getImageUri(backUri) }}
                    style={{
                      width: '100%',
                      height: 180,
                      borderRadius: 8,
                    }}
                    resizeMode="contain"
                  />

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={handleUploadBackSide}
                    >
                      <Text style={{ color: '#b3552c' }}>
                        Replace
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setBackUri('')}
                    >
                      <Text style={{ color: 'red' }}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: '#b3552c',
                    borderRadius: 8,
                    padding: 15,
                    alignItems: 'center',
                  }}
                  onPress={handleUploadBackSide}
                >
                  <Text style={{ color: '#b3552c' }}>
                    Upload Back Side
                  </Text>
                </TouchableOpacity>
              )}

            </View>

          </View>
        ) : null} */}
        {front_img || backUri && online ? (
          <View style={styles.cardPreviewContainer}>
            <Text style={styles.cardPreviewTitle}>📇 Card Preview</Text>

            <View style={styles.cardRow}>
              {/* Front Side */}
              <View style={styles.cardTile}>
                <Text style={styles.cardSideLabel}>Front</Text>
                <Image
                  source={{ uri: front_img, headers: { Connection: 'close' } }}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                {/* <View style={styles.cardActions}>
                  <TouchableOpacity onPress={handleUploadFront_off_Side}>
                    <Text style={styles.actionText}>Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFronImage('')}>
                    <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
                  </TouchableOpacity>
                </View> */}
              </View>

              {/* Back Side */}
              <View style={styles.cardTile}>
                <Text style={styles.cardSideLabel}>Back</Text>
                {backUri ? (
                  <>
                    <Image
                      source={{ uri: getImageUri(backUri) }}
                      style={styles.cardImage}
                      resizeMode="contain"
                    />
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={handleUploadBackSide}>
                        <Text style={styles.actionText}>Replace</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setBackUri('')}>
                        <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadPlaceholder}
                    onPress={handleUploadBackSide}
                  >
                    <Text style={styles.uploadPlaceholderText}>Upload Back</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {/* {!online ? (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 15,
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              padding: 10,
              backgroundColor: '#fff',
            }}
          >

            <Text
              style={{
                fontWeight: '700',
                fontSize: 16,
                marginBottom: 10,
              }}
            >
              Card Preview
            </Text>

            <Text
              style={{
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              Front Side
            </Text>

           
            {front_off_Uri ? (
              <>
                <Image
                  source={{ uri: getImageUri(front_off_Uri) }}
                  style={{
                    width: '100%',
                    height: 180,
                    borderRadius: 8,
                  }}
                  resizeMode="contain"
                />

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={handleUploadFront_off_Side}
                  >
                    <Text style={{ color: '#b3552c' }}>
                      Replace
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setFront_off_Uri('')}
                  >
                    <Text style={{ color: 'red' }}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={{
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: '#b3552c',
                  borderRadius: 8,
                  padding: 15,
                  alignItems: 'center',
                }}
                onPress={handleUploadFront_off_Side}
              >
                <Text style={{ color: '#b3552c' }}>
                  Upload Front Side
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ marginTop: 20 }}>

              <Text
                style={{
                  fontWeight: '600',
                  marginBottom: 8,
                }}
              >
                Back Side
              </Text>

              {backUri ? (
                <>
                  <Image
                    source={{ uri: getImageUri(backUri) }}
                    style={{
                      width: '100%',
                      height: 180,
                      borderRadius: 8,
                    }}
                    resizeMode="contain"
                  />

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={handleUploadBackSide}
                    >
                      <Text style={{ color: '#b3552c' }}>
                        Replace
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setBackUri('')}
                    >
                      <Text style={{ color: 'red' }}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: '#b3552c',
                    borderRadius: 8,
                    padding: 15,
                    alignItems: 'center',
                  }}
                  onPress={handleUploadBackSide}
                >
                  <Text style={{ color: '#b3552c' }}>
                    Upload Back Side
                  </Text>
                </TouchableOpacity>
              )}

            </View>

          </View>
        ) : null} */}
        {!online ? (
          <View style={styles.cardPreviewContainer}>
            <Text style={styles.cardPreviewTitle}>📇 Card Preview (Offline)</Text>

            <View style={styles.cardRow}>
              {/* Front Side – using front_off_Uri */}
              <View style={styles.cardTile}>
                <Text style={styles.cardSideLabel}>Front</Text>
                {front_off_Uri ? (
                  <>
                    <Image
                      source={{ uri: getImageUri(front_off_Uri) }}
                      style={styles.cardImage}
                      resizeMode="contain"
                    />
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={handleUploadFront_off_Side}>
                        <Text style={styles.actionText}>Replace</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setFront_off_Uri('')}>
                        <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadPlaceholder}
                    onPress={handleUploadFront_off_Side}
                  >
                    <Text style={styles.uploadPlaceholderText}>Upload Front</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Back Side – same as before */}
              <View style={styles.cardTile}>
                <Text style={styles.cardSideLabel}>Back</Text>
                {backUri ? (
                  <>
                    <Image
                      source={{ uri: getImageUri(backUri) }}
                      style={styles.cardImage}
                      resizeMode="contain"
                    />
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={handleUploadBackSide}>
                        <Text style={styles.actionText}>Replace</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setBackUri('')}>
                        <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadPlaceholder}
                    onPress={handleUploadBackSide}
                  >
                    <Text style={styles.uploadPlaceholderText}>Upload Back</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave(mode)} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{mode === 'edit' ? 'Update enquiry' : 'Save enquiry'}</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Failed Items Modal */}
      <Modal
        visible={failedItemsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFailedItemsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.failedItemsModal}>
            <View style={styles.failedItemsHeader}>
              <Text style={styles.failedItemsTitle}>❌ Failed Sync Items</Text>
              <TouchableOpacity onPress={() => setFailedItemsModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕ Close</Text>
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
                    <Text style={styles.failedItemName}>
                      {item.party_name || 'Unknown Party'}
                    </Text>
                    <Text style={styles.failedItemId}>
                      ID: {item.local_id || 'N/A'}
                    </Text>
                    <Text style={styles.failedItemError}>
                      Error: {typeof item.error === 'string' ? item.error : JSON.stringify(item.error || 'Unknown error')}
                    </Text>
                    {item.errors && (
                      <>
                        <View style={styles.validationErrorsContainer}>
                          <Text style={styles.validationErrorsTitle}>Validation Errors:</Text>
                          {Object.entries(item.errors).map(([field, errors]) => (
                            <View key={field} style={styles.validationErrorItem}>

                              <Text style={styles.validationErrorField}>{field}:</Text>
                              {Array.isArray(errors) ? errors.map((err, idx) => (
                                <>
                                  <Text key={idx} style={styles.validationErrorText}>- {err}</Text>
                                </>

                              )) : (
                                <>
                                  <Text style={styles.validationErrorText}>- {errors}</Text>
                                </>
                              )}
                            </View>
                          ))}

                        </View>

                      </>
                    )}
                    {/* ✏️ Edit button */}
                    {/* <TouchableOpacity
                      style={styles.editFailedItemBtn}
                      onPress={() => {
                        setFailedItemsModalVisible(false);
                        console.log('Editing failed item:', item);
                        // Navigate to NewEnquiryScreen with a flag to edit this pending enquiry
                        navigation.navigate('Event', {
                          localId: item.id,
                          mode: 'edit_pending'   // new mode
                        });
                      }}
                    >
                      <Text style={styles.editFailedItemText}>✏️ Edit & Retry</Text>
                    </TouchableOpacity> */}
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.noFailedItemsText}>No failed items</Text>
                }
              />
            )}

            <View style={styles.failedItemsActions}>
              <TouchableOpacity
                style={[styles.failedItemsBtn, styles.retryAllBtn]}
                onPress={retryFailedItems}
              >
                <Text style={styles.failedItemsBtnText}>↻ Retry All Failed</Text>
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
        <View style={{ flex: 1, backgroundColor: '#fdfcf9', padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>📋 Local Enquiries</Text>
            <TouchableOpacity onPress={() => setDebugModalVisible(false)}>
              <Text style={{ fontSize: 18, color: '#b3552c' }}>✕ Close</Text>
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

      <Modal
        visible={designModalVisible}
        animationType="slide"
        onRequestClose={() => setDesignModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Design</Text>
            <TouchableOpacity onPress={() => setDesignModalVisible(false)}>
              <Text style={styles.modalCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.modalSearchInput}
            placeholder="Search Designs..."
            value={designSearchQuery}
            onChangeText={handleDesignSearch}
          />

          {loadingDesigns ? (
            <ActivityIndicator size="large" color="#b3552c" style={styles.modalLoader} />
          ) : (
            <FlatList
              data={displayedDesigns}
              keyExtractor={(item) => item.dsn_code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalDesignItem}
                  onPress={() => {
                    setSelectedDesign(item);
                    setDesignDsnName(item.name);
                    setDesignDsnCode(item.dsn_code);
                    setDesignTab('Existing');
                    setDesignModalVisible(false);
                  }}
                >
                  <Text style={styles.modalDesignItemText}>{item.name}</Text>
                  <Text style={styles.modalDesignItemCode}>{item.dsn_code}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.modalNoDesignsText}>No designs found</Text>
              }
              initialNumToRender={pageSize}
              onEndReached={loadMoreDesigns}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingDesigns ? (
                  <ActivityIndicator size="large" color="#b3552c" style={{ margin: 10 }} />
                ) : hasMore ? (
                  <ActivityIndicator size="small" color="#b3552c" style={{ margin: 10 }} />
                ) : null
              }
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fdfcf9' },
  connStrip: { paddingVertical: 8, paddingHorizontal: 16 },
  connOnline: { backgroundColor: '#eaf6ee' },
  connOffline: { backgroundColor: '#fdf1e3' },
  connText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', paddingHorizontal: 16, marginTop: 10, marginBottom: 4 },
  scanBlock: { margin: 16, marginTop: 6, borderWidth: 1.5, borderColor: '#d98a5e', borderStyle: 'dashed', backgroundColor: '#fbeee6', borderRadius: 12, padding: 14 },
  scanTitle: { fontSize: 12, fontWeight: '700', color: '#b3552c', marginBottom: 8, textTransform: 'uppercase' },
  scanBtn: { backgroundColor: '#b3552c', borderRadius: 9, paddingVertical: 13, alignItems: 'center' },
  reportBtn: { backgroundColor: '#000', borderRadius: 9, paddingVertical: 13, alignItems: 'center' },
  scanBtnDisabled: { backgroundColor: '#c9c4bb' },
  scanBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  reportBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  scanHint: { fontSize: 11, color: '#6b7280', marginTop: 8, lineHeight: 16 },
  cardPreview: { width: '100%', height: 140, borderRadius: 8, marginTop: 10 },
  fieldGroup: { paddingHorizontal: 16, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: '#e2e0da', borderRadius: 9, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: '#1f2937', backgroundColor: '#fff' },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#e2e0da', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, backgroundColor: '#fff', marginRight: 8, marginBottom: 8 },
  chipActive: { borderColor: '#d98a5e', backgroundColor: '#fbeee6' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#b3552c', fontWeight: '600' },
  saveBtn: { backgroundColor: '#b3552c', borderRadius: 10, marginHorizontal: 16, marginTop: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pickerWrap: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e3e1da',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  syncBanner: {
    padding: 12,
    marginHorizontal: 10,
    marginTop: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncBannerSuccess: {
    backgroundColor: '#e6f7e6',
    borderColor: '#52c41a',
  },
  syncBannerError: {
    backgroundColor: '#fff1f0',
    borderColor: '#ff4d4f',
  },
  syncBannerSyncing: {
    backgroundColor: '#e6f7ff',
    borderColor: '#1890ff',
  },
  syncBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  syncBannerIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  syncBannerIconText: {
    fontSize: 20,
  },
  syncBannerContent: {
    flex: 1,
  },
  syncBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  syncDetailText: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  cancelSyncBtn: {
    marginTop: 4,
  },
  cancelSyncText: {
    color: '#ff4d4f',
    fontSize: 12,
    fontWeight: '500',
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  bannerTapHint: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
  },
  retryBtn: {
    backgroundColor: '#b3552c',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  syncSuccessDetail: {
    fontSize: 12,
    color: '#52c41a',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  failedItemsModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  failedItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 12,
  },
  failedItemsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff4d4f',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
  },
  failedItemCard: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  failedItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  failedItemId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  failedItemError: {
    fontSize: 13,
    color: '#ff4d4f',
    marginTop: 4,
  },
  validationErrorsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  validationErrorsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  validationErrorItem: {
    marginLeft: 8,
    marginTop: 4,
  },
  validationErrorField: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  validationErrorText: {
    fontSize: 12,
    color: '#ff4d4f',
    marginLeft: 12,
  },
  noFailedItemsText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  failedItemsActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  failedItemsBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  retryAllBtn: {
    backgroundColor: '#b3552c',
  },
  closeBtn: {
    backgroundColor: '#666',
  },
  failedItemsBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  designSection: {
    marginTop: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e2e0da',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fbeee6',
    borderColor: '#d98a5e',
  },
  tabText: {
    color: '#374151',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#b3552c',
  },
  newDesignContainer: {
    marginTop: 8,
  },
  existingDesignContainer: {
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e2e0da',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
  },
  designItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e0da',
  },
  designItemText: {
    fontSize: 14,
    color: '#0000',
  },
  noDesignsText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fdfcf9',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: '#e2e0da',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  modalLoader: {
    marginTop: 20,
  },
  modalDesignItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e0da',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  cardFilledInput: {
    backgroundColor: '#e6f7e6',
  },
  modalDesignItemText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  modalDesignItemCode: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  modalNoDesignsText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 20,
  },
  existingDesignInput: {
    borderWidth: 1,
    borderColor: '#e2e0da',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  existingDesignInputText: {
    fontSize: 14,
    // color: '#000',
    color: theme.BRAND_GRADIENT_END,
  },
  editFailedItemBtn: {
    backgroundColor: '#b3552c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  editFailedItemText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  cardPreviewContainer: {
    marginHorizontal: 16,
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e6e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap', // responsive: wraps on small screens
  },
  cardTile: {
    flex: 1,
    minWidth: 140,
    marginHorizontal: 4,
    backgroundColor: '#faf9f7',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  cardSideLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  cardImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#f0efec',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  actionText: {
    fontSize: 13,
    color: '#b3552c',
    fontWeight: '500',
  },
  actionRemove: {
    color: '#d32f2f',
  },
  uploadPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#b3552c',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef7f0',
  },
  uploadPlaceholderText: {
    color: '#b3552c',
    fontWeight: '600',
    fontSize: 13,
  },
});