// NewEnquiryScreen.js
// "New Enquiry" form — Bharat Tex 2026 module.
// Works fully offline: saves to local SQLite immediately, syncs to Laravel
// when connectivity is available. Card-scan (OCR) requires internet and is
// optional — manual typing always works, online or offline.

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
  Modal, FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureCardPhoto,
  scanVisitingCard,
  isOnline,
} from './CardScanService';
import { insertEnquiry, getAllEnquiries, getCachedEvents, getDesigns } from './db';
import { syncPendingEnquiries, syncShowEnquiries, updateEnquiries } from './syncService';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import { launchImageLibrary } from 'react-native-image-picker';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import api from './api';
import { API } from '../../common/API/dynamicAPI';
import FullScreenLoader from '../FullScreenLoader/FullScreenLoader';
import { abortSync, startSyncQueue } from './syncQueue';

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
  const [designation, setDesignation] = useState('Purchase Manager');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [front_img, setFronImage] = useState('');
  const [front_path, setFrontPath] = useState('');
  // At the top, alongside other states (after [debugModalVisible, ...])
  const [cardFields, setCardFields] = useState({});
  const [getToken, setToken] = useState('');
  const [cardFrontUri, setCardFrontUri] = useState();
  const [backUri, setBackUri] = useState();
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
    currentItemName: ''
  });
  // 
  // const [designTab, setDesignTab] = useState('Existing'); // Default: Existing
  const [designTab, setDesignTab] = useState(); // Default: Existing
  const [designDsnName, setDesignDsnName] = useState(''); // For New tab
  const [designDsnCode, setDesignDsnCode] = useState(''); // For New tab
  const [designs, setDesigns] = useState([]); // For Existing tab dropdown
  const [selectedDesign, setSelectedDesign] = useState(null); // Selected design from dropdown
  const [designSearchQuery, setDesignSearchQuery] = useState(''); // Search query for lazy loading
  const [loadingDesigns, setLoadingDesigns] = useState(false); // Loading state for designs
  const [designPage, setDesignPage] = useState(1); // Pagination for lazy loading
  const [designModalVisible, setDesignModalVisible] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        console.log('user_prptype', user_prptype);
        setUserPrptype(user_prptype);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
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

  // useEffect(() => {
  //   checkConnectivity();
  // }, []);

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
          if (result) {
            setMode('edit');
          }



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
          if (result.design_dsn_name) setDesignDsnName(result.design_dsn_name);
          if (result.design_dsn_code) setDesignDsnCode(result.design_dsn_code);
          // if (result.design_requirement) setDesignTab(result.design_requirement === 'New design' ? 'New' : 'Existing');
          if (result.design_requirement) setDesignTab(result.design_requirement);
          if (result.design_dsn_name && result.design_dsn_code && result.design_requirement === 'Existing') {
            const dsn = {
              name: result?.design_dsn_name,
              dsn_code: result?.design_dsn_code
            };
            console.log('EXISTING DSN', dsn);
            if (result.design_requirement) setSelectedDesign(dsn);
          }
        } catch (err) {
          setLoading(false);
          console.log('LOAD ERROR =>', err);
        }
      };

      loadData();
    } else {
      setDesignTab('Existing');
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
  //   setLoadingDesigns(true);
  //   try {
  //     const designsData = await AsyncStorage.getItem(DESIGNS_CACHE_KEY);
  //     if (designsData) {
  //       const events = JSON.parse(designsData);
  //       console.log('DESIGNS from cache', events);
  //       if (events && events.length > 0) {
  //         // setEVENTS(events);
  //         // setEventCode(events[0].EventId);
  //         setDesigns(events);
  //         console.log('Loaded design from cache', events);
  //       } else {
  //         console.log('Cached design array is empty');
  //       }
  //     } else {
  //       console.log('No cached design found');
  //     }
  //   } catch (err) {
  //     console.log('Failed to load cached design', err);
  //   } finally {
  //     setLoadingDesigns(false);
  //   }
  // }, []);
  // const loadDesing = useCallback(async (page = 1, limit = 1000) => {
  //   if (loadingDesigns) return;
  //   setLoadingDesigns(true);
  //   try {
  //     const designsData = await AsyncStorage.getItem(DESIGNS_CACHE_KEY);
  //     if (designsData) {
  //       const cachedDesigns = JSON.parse(designsData);
  //       const startIndex = (page - 1) * limit;
  //       const endIndex = startIndex + limit;
  //       const paginatedDesigns = cachedDesigns.slice(startIndex, endIndex);

  //       setDesigns(prev => [...prev, ...paginatedDesigns]);
  //       console.log(`Loaded ${paginatedDesigns.length} designs (Page ${page})`);
  //     } else {
  //       console.log('No cached designs found');
  //     }
  //   } catch (err) {
  //     console.log('Failed to load cached designs', err);
  //   } finally {
  //     setLoadingDesigns(false);
  //   }
  // }, [loadingDesigns]);
  const loadDesing = useCallback(async () => {
    setLoadingDesigns(true);
    try {
      const designsData = await AsyncStorage.getItem(DESIGNS_CACHE_KEY);
      if (designsData) {
        const allDesigns = JSON.parse(designsData);
        setDesigns(allDesigns); // store full cache
        // apply search filter immediately
        const filtered = allDesigns.filter(
          d => d.name?.toLowerCase().includes(designSearchQuery.toLowerCase()) ||
            d.dsn_code?.toLowerCase().includes(designSearchQuery.toLowerCase())
        );
        setDesigns(filtered);
      } else {
        setDesigns([]);
        setDesigns([]);
      }
    } catch (err) {
      console.log('Failed to load cached designs', err);
    } finally {
      setLoadingDesigns(false);
    }
  }, [designSearchQuery]);

  // Update filteredDesigns whenever search query or designs list changes
  useEffect(() => {
    if (designs.length) {
      const q = designSearchQuery.toLowerCase();
      const filtered = designs.filter(
        d => d.name?.toLowerCase().includes(q) ||
          d.dsn_code?.toLowerCase().includes(q)
      );
      setDesigns(filtered);
    }
  }, [designSearchQuery, designs]);

  const loadMoreDesigns = () => {
    if (!loadingDesigns && designs.length < 100000) { // Assuming 100k total designs
      const nextPage = Math.floor(designs.length / 1000) + 1;
      loadDesing(nextPage);
    }
  };

  // const fetchDesigns = useCallback(async (query = '') => {
  //   if (loadingDesigns) return;
  //   setLoadingDesigns(true);
  //   try {
  //     const q = '';
  //     const response = await api.get(`${API}/api/designs/search`, {
  //       params: {
  //         q,
  //         prptype: getUserPrptype,
  //         yearno: getCurrentFinancialYear(),
  //       },
  //     });
  //     const allDesigns = response.data.data || [];
  //     console.log("design response: ", response);
  //     setDesigns(allDesigns); // Store all designs
  //     console.log("Fetched designs:", allDesigns?.length);
  //   } catch (error) {
  //     console.error('Failed to fetch designs:', error);
  //   } finally {
  //     setLoadingDesigns(false);
  //   }
  // }, [loadingDesigns, getUserPrptype]);

  useEffect(() => {
    if (!token) return;

    const checkAndStartSync = async () => {
      const online = await isOnline();
      if (!online) return;

      const pending = await getAllEnquiries(); // or getPendingEnquiries
      if (pending.length > 0) {
        // auto start sync queue
        startSyncQueue(getToken, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress);
      }
    };

    checkAndStartSync();
  }, [token, getUserPrptype]);

  // Sync progress handler
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
          currentItemName: ''
        });
        break;
      case 'progress':
        setSyncStatus(prev => ({
          ...prev,
          currentItemName: progress.currentItem.party_name || progress.currentItem.local_id
        }));
        break;
      case 'item_done':
        setSyncStatus(prev => ({
          ...prev,
          synced: progress.syncedCount,
          failed: progress.failedCount,
          currentItemName: ''
        }));
        break;
      case 'all_done':
        // अगर कुल sync कुछ नहीं हुआ तो banner छुपा दो
        if (progress.syncedCount === 0 && progress.failedCount === 0) {
          setSyncStatus({ visible: false, isSyncing: false, message: '', total: 0, synced: 0, failed: 0, currentItemName: '' });
        } else {
          setSyncStatus({
            visible: true,
            isSyncing: false,
            message: `All data synced successfully! (Synced: ${progress.syncedCount}, Failed: ${progress.failedCount})`,
            total: progress.syncedCount + progress.failedCount,
            synced: progress.syncedCount,
            failed: progress.failedCount,
            currentItemName: ''
          });
        }
        break;
      case 'error':
        setSyncStatus({
          visible: true,
          isSyncing: false,
          message: `Sync error: ${progress.message}`,
          total: 0, synced: 0, failed: 0, currentItemName: ''
        });
        break;
      case 'aborted':
        setSyncStatus({
          visible: true,
          isSyncing: false,
          message: 'Sync cancelled',
          total: 0, synced: 0, failed: 0, currentItemName: ''
        });
        break;
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadEvent();
  }, [token]);



  // useEffect(() => {
  //   if (!token) return;
  //   fetchDesigns();
  // }, [token]);

  const filteredDesigns = designs.filter(
    (design) =>
      design?.name?.toLowerCase()?.includes(designSearchQuery.toLowerCase()) ||
      design?.dsn_code?.toLowerCase()?.includes(designSearchQuery.toLowerCase())
  );

  const handleDesignSearch = (query) => {
    setDesignSearchQuery(query);
    setDesigns([]); // Reset designs
    loadDesing(1); // Reload first page with new query
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
      if (!uri) return; // user cancelled

      // setCardFrontUri(uri);
      setScanning(true);

      const fields = await scanVisitingCard(uri, getToken);

      console.log('SCAN RESULT =>', fields);

      // Autofill — never overwrite something the user already typed by hand
      // unless the field is still empty, to avoid silently clobbering edits.
      // if (fields.party_name && !partyName) setPartyName(fields.party_name);
      // if (fields.address && !address) setAddress(fields.address);
      // if (fields.gst_no && !gstNo) setGstNo(fields.gst_no);
      // if (fields.contact_name && !contactName) setContactName(fields.contact_name);
      // if (fields.mobile && !mobile) setMobile(fields.mobile);
      // if (fields.email && !email) setEmail(fields.email);
      // if (fields.front_img && !front_img) setFronImage(fields.front_img);
      // if (fields.front_img_path && !front_path) setFrontPath(fields.front_img_path);

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

      // setCardFrontUri(uri);
      setScanning(true);

      const fields = await scanVisitingCard(uri, getToken);

      // if (fields.party_name) setPartyName(fields.party_name);
      // if (fields.address) setAddress(fields.address);
      // if (fields.gst_no) setGstNo(fields.gst_no);
      // if (fields.contact_name) setContactName(fields.contact_name);
      // if (fields.mobile) setMobile(fields.mobile);
      // if (fields.email) setEmail(fields.email);
      // if (fields.front_img) setFronImage(fields.front_img);
      // if (fields.front_img_path) setFrontPath(fields.front_img_path);

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
      // front_img and front_img_path do not need green marking
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
  // async function handleScanCard() {
  //   console.log('STEP 1');

  //   await checkConnectivity();

  //   console.log('STEP 2');

  //   const currentlyOnline = await isOnline();

  //   console.log('STEP 3', currentlyOnline);

  //   try {
  //     console.log('STEP 4 BEFORE CAMERA');

  //     const uri = await captureCardPhoto();

  //     console.log('STEP 5 AFTER CAMERA', uri);

  //     if (!uri) return;

  //     setCardFrontUri(uri);

  //     console.log('STEP 6 BEFORE API');

  //     const fields = await scanVisitingCard(uri);

  //     console.log('STEP 7 API SUCCESS', fields);
  //   }
  //   catch (err) {
  //     console.log('FULL ERROR =>', err);
  //     console.log('ERROR MESSAGE =>', err?.message);

  //     Alert.alert(
  //       'DEBUG',
  //       JSON.stringify(err?.message || err)
  //     );
  //   }
  // }

  async function handleSave() {

    if (mode === 'edit') {
      if (!partyName.trim()) {
        Alert.alert('Party name required', 'Please enter the company / party name.');
        return;
      }
      if (!qtyRequired.trim()) {
        Alert.alert('Quantity required', 'Please enter the required quantity.');
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

        const payload = {
          ...enquiries,
          // user_id: user,
          // party_name: partyName,
          // address: address,
          // gst_no: gstNo,
          // design_requirement: designRequirement,
          // qty_required: qtyRequired,
          // price: price,
          // colour_requirement: colourRequirement,
          // contact_name: contactName,
          // designation: designation,
          // mobile: mobile,
          // email: email,
          // front_img_path: front_path,
          // back_img_path: backUri,
          // card_front_uri: cardFrontUri,
          // scanned_from_card: scannedFromCard,
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

          front_img: front_path,
          front_img_path: front_path,
          back_img: backUri,
          back_img_path: backUri,

          card_front_uri: cardFrontUri,
          scanned_from_card: scannedFromCard,

          event_code: eventCode,

          design_dsn_name: designDsnName,
          design_dsn_code: designDsnCode,
        }

        console.log("update paylaod :", payload);

        const user_prptype = await AsyncStorage.getItem('user_prptype');
        const result = await updateEnquiries(payload?.id, token, getCurrentFinancialYear(), user_prptype, payload);

        console.log('API RESULT =>', getCurrentFinancialYear(), user_prptype, result);


        // await insertEnquiry({
        //   user_id: user,

        //   party_name: partyName,
        //   address,
        //   gst_no: gstNo,

        //   design_requirement: designRequirement,
        //   qty_required: qtyRequired,
        //   price,

        //   colour_requirement: colourRequirement,
        //   contact_name: contactName,
        //   designation,

        //   mobile,
        //   email,

        //   front_img: front_path,
        //   back_img: backUri,

        //   card_front_uri: cardFrontUri,
        //   scanned_from_card: scannedFromCard,
        // });

        // // Saved locally regardless of connectivity — this is the offline-first guarantee.
        // // If online, fire a background sync immediately so it doesn't sit pending.
        const currentlyOnline = await isOnline();
        if (currentlyOnline) {
          syncPendingEnquiries(getToken, getCurrentFinancialYear(), getUserPrptype); // fire-and-forget, don't block the UI on this
        }

        Alert.alert(
          'Enquiry updated',
          currentlyOnline
            ? 'Saved and syncing to server.'
            : "Saved on this device. It'll sync automatically once you're back online."
        );
        navigation.goBack();
      } catch (err) {
        console.log('Save error', err);
        Alert.alert('Save failed', 'Something went wrong saving this enquiry. Please try again.');
      } finally {
        setSaving(false);
      }
    } else {
      if (!partyName.trim()) {
        Alert.alert('Party name required', 'Please enter the company / party name.');
        return;
      }
      if (!qtyRequired.trim()) {
        Alert.alert('Quantity required', 'Please enter the required quantity.');
        return;
      }

      // if(!cardFrontUri) {
      //   Alert.alert('Image', 'Please enter the required quantity.');
      //   return;
      // }
      console.log('cardFrontUri in payload', cardFrontUri, front_path);

      console.log('back img uri', backUri);

      setSaving(true);
      try {
        const userJson = await AsyncStorage.getItem('user_id');
        const user = userJson ? JSON.parse(userJson) : null;

        if (!user) {
          Alert.alert('Not logged in', 'Please log in again before saving.');
          setSaving(false);
          return;
        }

        await insertEnquiry({
          user_id: user,

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

          front_img: front_path,
          back_img: backUri,

          card_front_uri: cardFrontUri,
          scanned_from_card: scannedFromCard,

          event_code: eventCode,

          design_dsn_name: designDsnName,
          design_dsn_code: designDsnCode,
        });

        // Saved locally regardless of connectivity — this is the offline-first guarantee.
        // If online, fire a background sync immediately so it doesn't sit pending.
        const currentlyOnline = await isOnline();
        if (currentlyOnline) {
          // syncPendingEnquiries(getToken, getCurrentFinancialYear(), getUserPrptype); // fire-and-forget, don't block the UI on this
          startSyncQueue(getToken, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress); // fire-and-forget, don't block the UI on this
        }

        Alert.alert(
          'Enquiry saved',
          currentlyOnline
            ? 'Saved and syncing to server.'
            : "Saved on this device. It'll sync automatically once you're back online."
        );
        navigation.goBack();
      } catch (err) {
        console.log('Save error', err);
        Alert.alert('Save failed', 'Something went wrong saving this enquiry. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  }

  return (
    <>
      {loading && <FullScreenLoader />}
      <HeaderBarwithBack userName={username} header={'Event'} subHeader={online ? '● Online — card scan available' : '● Offline — saving locally, will sync later'} headerConnect={true} headerConnectColor={online ? 'green' : 'red'} headerConnectAnimation={true} />
      {/* After HeaderBarwithBack, before ScrollView */}
      {syncStatus.visible && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>{syncStatus.message}</Text>
          {syncStatus.isSyncing && (
            <View>
              <Text style={styles.syncDetailText}>
                {syncStatus.currentItemName
                  ? `Syncing: ${syncStatus.currentItemName} (${syncStatus.synced + syncStatus.failed + 1}/${syncStatus.total})`
                  : `Progress: ${syncStatus.synced + syncStatus.failed}/${syncStatus.total}`
                }
              </Text>
              <TouchableOpacity onPress={() => abortSync()}>
                <Text style={styles.cancelSyncText}>Cancel Sync</Text>
              </TouchableOpacity>
            </View>
          )}
          {!syncStatus.isSyncing && syncStatus.failed > 0 && (
            <TouchableOpacity onPress={() => startSyncQueue(token, getCurrentFinancialYear(), getUserPrptype, handleSyncProgress)}>
              <Text style={styles.retryText}>Retry failed items</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* <TouchableOpacity
        style={[styles.reportBtn, { marginHorizontal: 10, marginBottom: 5, marginTop: 10, backgroundColor: '#333' }]}
        onPress={loadAllEnquiries}
      >
        <Text style={styles.reportBtnText}>📂 Debug DB</Text>
      </TouchableOpacity> */}
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* <View style={[styles.connStrip, online ? styles.connOnline : styles.connOffline]}>
          <Text style={styles.connText}>
            {online ? '● Online — card scan available' : '● Offline — saving locally, will sync later'}
          </Text>
        </View> */}

        {/* <Text style={styles.title}>New enquiry</Text> */}
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

        <View style={{ flexDirection: 'row', marginTop: 10 }}>

          {/* <TouchableOpacity
            style={[styles.scanBtn, { flex: 1 }]}
            onPress={handleScanCard}
          >
            <Text style={styles.scanBtnText}>
              📷 Scan Card
            </Text>
          </TouchableOpacity> */}

          {/* <TouchableOpacity
            style={[
              styles.scanBtn, { flex: 1, marginHorizontal: 10, marginBottom: 10 },
            ]}
            onPress={() => handleUploadCard(token)}
          >
            <Text style={styles.scanBtnText}>
              🖼 Upload Card
            </Text>
          </TouchableOpacity> */}

        </View>

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
            // style={[styles.input, styles.textarea]}
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
            {/* Tabs */}
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

            {/* Tab Content */}
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
                  setDesignSearchQuery(''); // Reset search query
                  setDesigns([]); // Reset designs
                  loadDesing(1); // Load first page
                  if (designs.length === 0) loadDesing(); // Fetch only if empty
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

        {front_img ? (
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

            {/* FRONT SIDE */}

            <Text
              style={{
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              Front Side
            </Text>

            {/* <Image
              source={{ uri: getImageUri(front_img) }}
              style={{
                width: '100%',
                height: 180,
              }}
              onLoad={() => console.log('IMAGE LOADED')}
              onError={(e) =>
                console.log(
                  'IMAGE ERROR',
                  JSON.stringify(e.nativeEvent, null, 2)
                )
              }
            /> */}
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

            {/* BACK SIDE */}

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
        ) : null}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{mode === 'edit' ? 'Update enquiry' : 'Save enquiry'}</Text>}
        </TouchableOpacity>
      </ScrollView>

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
                  {/* Add more fields as needed */}
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
              data={filteredDesigns}
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
              initialNumToRender={20}
              windowSize={10}
              maxToRenderPerBatch={10}
              keyboardShouldPersistTaps="handled"
              onEndReached={loadMoreDesigns}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingDesigns ? (
                  <ActivityIndicator size="large" color="#b3552c" />
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
  chip: { borderWidth: 1, borderColor: '#e2e0da', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, backgroundColor: '#fff' },
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
    backgroundColor: '#e6f7ff',
    padding: 12,
    marginHorizontal: 10,
    marginTop: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#91d5ff'
  },
  syncBannerText: { fontSize: 13, fontWeight: '600', color: '#0050b3' },
  syncDetailText: { fontSize: 12, color: '#333', marginTop: 4 },
  cancelSyncText: { color: 'red', fontSize: 12, marginTop: 4 },
  retryText: { color: '#b3552c', fontSize: 13, fontWeight: '600', marginTop: 4 },
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
    maxHeight: 200, // Limit height for dropdown
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
  modalCloseText: {
    fontSize: 18,
    color: '#b3552c',
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
    backgroundColor: '#e6f7e6',   // very soft light green
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
    color: '#6b7280',
  },
});
