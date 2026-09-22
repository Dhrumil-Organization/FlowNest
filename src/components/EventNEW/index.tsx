// index.tsx - S: design fields always visible, placeholder design if none exists
// UPDATED:
//  1) Online -> Property / Event / Items / Designs load fresh from API and the
//     local cache is refreshed with that response. Offline -> falls back to the
//     cache exactly like before (no behaviour change offline).
//  2) Unit fields no longer default to "mtr". When an existing Item/Design is
//     selected, the Unit is taken from that record's `UOM` key if present,
//     otherwise it stays empty. The user can still type a unit manually.
import { API } from '@/common/API/dynamicAPI';
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import FullScreenLoader from '@/components/FullScreenLoader';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  View
} from 'react-native';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import HeaderBarwithBack from '../../components/HeaderNew';
import api from './api';
import {
  captureCardPhoto,
  isOnline,
  scanVisitingCard,
} from './CardScanService';
import {
  deleteAllEnquiriesFromDB,
  getAllEnquiries,
  getCachedDesign,
  getCachedEvents,
  getCachedItem,
  getCachedItemK,
  getCachedItemR,
  getCachedItemV,
  getCachedPrp,
  insertEnquiry,
  setCachedDesing,
  setCachedEvents,
  setCachedItem,
  setCachedItemK,
  setCachedItemR,
  setCachedItemV,
  setCachedPrp,
} from './db';
import EnquiryReportScreen from './EnquiryReportScreen';
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
  design_requirement: 'Existing' | 'New';
  dsn_name: string;
  dsn_qty: string;
  unit: string;
  dsn_rate: string;
  remark: string;
}

interface Item {
  item_name: string;
  item_code: string | number;
  is_new_item: boolean; // true = New mode (inline fields), false = Existing (selected from modal)
  design_requirement?: 'Existing' | 'New';
  item_qty: string;
  item_unit: string;
  item_rate: string;
  item_remark: string;
  designs: Design[];
}

const blankDesign = (): Design => ({
  dsn_code: 0,
  is_new: false,
  design_requirement: 'Existing',
  dsn_name: '',
  dsn_qty: '',
  unit: '',
  dsn_rate: '',
  remark: '',
});

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
  const [back_path, setBackPath] = useState('');
  const [front_off_Uri, setFront_off_Uri] = useState();
  const [scannedFromCard, setScannedFromCard] = useState(false);
  const [scanning, setScanning] = useState(false);
  // Staged card capture flow: null -> 'front_preview' -> 'both_preview'
  const [cardCaptureStage, setCardCaptureStage] = useState(null);
  const [pendingFrontUri, setPendingFrontUri] = useState(null);
  const [pendingBackUri, setPendingBackUri] = useState(null);
  const [capturingBack, setCapturingBack] = useState(false);
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

  // --- Track which fields came from scan ---
  const [cardFields, setCardFields] = useState<{ [key: string]: boolean }>({});

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

  // For modal selection – which item is being edited
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  // For design selection – which item's design
  const [editingDesignItemIndex, setEditingDesignItemIndex] = useState<number | null>(null);
  const [editingDesignIndex, setEditingDesignIndex] = useState<number | null>(null);

  // Design mode per item (for S) – 'Existing' or 'New'
  const [designModePerItem, setDesignModePerItem] = useState<{ [key: number]: 'Existing' | 'New' }>({});

  // Accordion: whether an item's design list is expanded (only relevant when an item has >1 design)
  const [expandedDesignItems, setExpandedDesignItems] = useState<{ [key: number]: boolean }>({});

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
  const [getInqReport, showInqReport] = useState(false);
  const autoSyncDone = useRef(false);
  const [loadingMoreItems, setLoadingMoreItems] = useState(false);
  const [loadingMoreDesigns, setLoadingMoreDesigns] = useState(false);
  const loadingMoreItemsRef = useRef(false);
  const loadingMoreDesignsRef = useRef(false);
  const isFetchingItemsRef = useRef(false);
  const isFetchingDesignsRef = useRef(false);
  //
  const [uploadStage, setUploadStage] = useState<'idle' | 'front_preview' | 'both_preview' | null>(null);
  const [pendingFrontUpload, setPendingFrontUpload] = useState<string | null>(null);
  const [pendingBackUpload, setPendingBackUpload] = useState<string | null>(null);

  // Auto sync on load
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

  // Initialize user prptype
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

          // Set basic fields
          if (result.party_name) setPartyName(result.party_name);
          if (result.address) setAddress(result.address);
          if (result.gst_no) setGstNo(result.gst_no);
          if (result.contact_name) setContactName(result.contact_name);
          if (result.mobile) setMobile(result.mobile);
          if (result.email) setEmail(result.email);
          if (result.front_img) setFronImage(result.front_img);
          if (result.front_img_path) setFrontPath(result.front_img_path);
          if (result.back_img) setBackUri(result.back_img);
          if (result.back_img_path) setBackPath(result.back_img_path);
          if (result.event_code) setEventCode(result.event_code);
          if (result.prptype) setPrpCode(result.prptype);
          if (result.designation) setDesignation(result.designation);

          // Load items and designs
          if (result.items && Array.isArray(result.items)) {

            const normalizedItems = result.items.map(item => ({
              ...item,

              // "0" => false (Existing)
              // "1" => true  (New)
              is_new_item:
                item.is_new_item === 1 ||
                item.is_new_item === "1" ||
                item.is_new_item === true,

              designs: (item.designs && item.designs.length > 0)
                ? item.designs.map(d => ({
                  ...d,
                  is_new:
                    d.is_new === true ||
                    d.is_new === 1 ||
                    d.is_new === "1" ||
                    d.design_requirement === "New",
                }))
                : [blankDesign()],
            }));

            setSelectedItems(normalizedItems);
            // setSelectedItems(result.items);
            // if (getUserPrptype === 'S') {
            // if (getUserPrptype === 'S') {
            const modes = {};
            normalizedItems.forEach((item, idx) => {
              if (!item.designs || item.designs.length === 0) {
                item.designs = [blankDesign()];
              }
              modes[idx] = item.designs.map((d) =>
                // (d && (d.is_new === true || d.design_requirement === 'New')) ? 'New' : 'Existing'
                d.is_new ? "New" : "Existing"
              );
            });
            console.log('MODES =>', modes);
            setDesignModePerItem(modes);
            // }
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
      setMode('added');
      initializeDefaultItems();
    }
  }, [token, id]);

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
    setBackPath('');
    setScannedFromCard(false);
    setFront_off_Uri('');
    setSelectedItems([]);
    setDesignModePerItem({});
    setExpandedDesignItems({});
    setCardFields({}); // Reset scan highlights
  };

  // Initialize default items for new enquiry
  const initializeDefaultItems = useCallback(() => {
    const isPrptypeS = getUserPrptype === 'S';
    if (isPrptypeS) {
      // For S: one item with one blank design (Existing mode by default)
      const defaultItem: Item = {
        item_name: '',
        item_code: 0,
        is_new_item: false,
        item_qty: '',
        item_unit: '',
        item_rate: '',
        item_remark: '',
        designs: [blankDesign()],
      };
      setSelectedItems([defaultItem]);
      setDesignModePerItem({ 0: ['Existing'] });
    } else {
      // For non-S: one item with no designs, default Existing
      const defaultItem: Item = {
        item_name: '',
        item_code: 0,
        is_new_item: false,
        item_qty: '',
        item_unit: '',
        item_rate: '',
        item_remark: '',
        designs: [],
      };
      setSelectedItems([defaultItem]);
    }
    setPartyName('');
    setAddress('');
    setGstNo('');
    setContactName('');
    setDesignation('');
    setMobile('');
    setEmail('');
    setFronImage('');
    setFrontPath('');
    setBackUri('');
    setBackPath('');
    setEventCode('');
    // setPrpCode     ('');
    setDesignation('');
    // setScannedFromCard(false);
    setMode('added');
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
    // setFront_off_Uri();

    // setCardFrontUri();

    // setCardFields({});

    // setDesignModePerItem({});
    // setScannedFromCard(false);
    // setExpandedDesignItems({});

    // setDesignModePerItem({});
    // resetFormFields();

  }, [getUserPrptype]);

  // ─────────────────────────────────────────────────────────────────────────
  // Load Property/Event/Items/Designs:
  //   ONLINE  -> fetch fresh from the API, show that data, and refresh the
  //              local cache with the response.
  //   OFFLINE -> fall back to whatever is in the cache (unchanged behaviour).
  // ─────────────────────────────────────────────────────────────────────────

  // Load events (Property/Event dropdown data)
  const loadEvent = useCallback(async (prptypeForApi) => {
    setLoading(true);
    try {
      const currentlyOnline = await isOnline();
      if (currentlyOnline && token && prptypeForApi) {
        try {
          const yearno = getCurrentFinancialYear();
          const response = await api.get(`${API}/api/getevent`, {
            params: { prptype: prptypeForApi, yearno },
            headers: { Authorization: `Bearer ${token}` },
          });
          const events = response.data?.data;
          if (events && events.length > 0) {
            setEVENTS(events);
            setEventCode(events[0].EventId);
            await setCachedEvents(events);
            console.log('Loaded events from API and refreshed cache', events);
            setLoading(false);
            return;
          }
        } catch (apiErr) {
          console.log('Failed to fetch events from API, falling back to cache', apiErr);
        }
      }
      // Offline, or API call failed/returned nothing usable -> use cache
      const events = await getCachedEvents();
      if (events && events.length > 0) {
        setEVENTS(events);
        setEventCode(events[0].EventId);
        console.log('Loaded events from cache', events);
      }
    } catch (err) {
      console.log('Failed to load events', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load Property (PRP) dropdown data
  const loadPrp = useCallback(async (prptypeForApi) => {
    setLoading(true);
    try {
      const currentlyOnline = await isOnline();
      if (currentlyOnline && token && prptypeForApi) {
        try {
          const yearno = getCurrentFinancialYear();
          const response = await api.get(`${API}/api/geteventprptype`, {
            params: { prptype: prptypeForApi, yearno },
            headers: { Authorization: `Bearer ${token}` },
          });
          const prp = response.data?.data;
          if (prp && prp.length > 0) {
            setPRPS(prp);
            if (!id) {
              setPrpCode(prptypeForApi || prp[0].code);
            }
            await setCachedPrp(prp);
            console.log('Loaded prps from API and refreshed cache', prp);
            setLoading(false);
            return;
          }
        } catch (apiErr) {
          console.log('Failed to fetch prp from API, falling back to cache', apiErr);
        }
      }
      // Offline, or API call failed/returned nothing usable -> use cache
      const prp = await getCachedPrp();
      if (prp && prp.length > 0) {
        setPRPS(prp);
        setPrpCode(prptypeForApi || prp[0].code);
        console.log('Loaded prps from cache', prp);
      }
    } catch (err) {
      console.log('Failed to load cached prps', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load designs (used by the S design-selection modal)
  const loadDesing = useCallback(async () => {
    if (isFetchingDesignsRef.current) return;
    isFetchingDesignsRef.current = true;
    setLoadingDesigns(true);
    try {
      const currentlyOnline = await isOnline();
      if (currentlyOnline && token && getUserPrptype) {
        try {
          const yearno = getCurrentFinancialYear();
          const response = await api.get(`${API}/api/designs/search`, {
            params: { q: '', prptype: getUserPrptype, yearno },
            headers: { Authorization: `Bearer ${token}` },
          });
          const freshDesigns = response.data?.data;
          if (freshDesigns) {
            setAllDesigns(freshDesigns);
            await setCachedDesing(freshDesigns);
            console.log('Loaded designs from API and refreshed cache', freshDesigns.length);
            setLoadingDesigns(false);
            isFetchingDesignsRef.current = false;
            return;
          }
        } catch (apiErr) {
          console.log('Failed to fetch designs from API, falling back to cache', apiErr);
        }
      }
      // Offline, or API call failed/returned nothing usable -> use cache
      const cached = await getCachedDesign();
      if (!cached || cached.length === 0) {
        setAllDesigns([]);
        setDisplayedDesigns([]);
        setHasMore(false);
      } else {
        setAllDesigns(cached);
      }
    } catch (err) {
      console.log('Failed to load designs', err);
    } finally {
      setLoadingDesigns(false);
      isFetchingDesignsRef.current = false;
    }
  }, [token, getUserPrptype]);

  const loadItems = useCallback(async () => {
    if (isFetchingItemsRef.current) return;
    isFetchingItemsRef.current = true;
    setLoadingItems(true);
    try {
      const currentlyOnline = await isOnline();
      if (currentlyOnline && token) {
        try {
          const yearno = getCurrentFinancialYear();
          const response = await api.get(`${API}/api/geteventitem`, {
            params: { prptype: 'S', yearno },
            headers: { Authorization: `Bearer ${token}` },
          });
          const freshItems = response.data?.data;
          if (freshItems) {
            setAllItems(freshItems);
            await setCachedItem(freshItems);
            console.log('Loaded items (S) from API and refreshed cache', freshItems.length);
            setLoadingItems(false);
            isFetchingItemsRef.current = false;
            return;
          }
        } catch (apiErr) {
          console.log('Failed to fetch items from API, falling back to cache', apiErr);
        }
      }
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
      isFetchingItemsRef.current = false;
    }
  }, [token]);

  const loadItems_K = useCallback(async () => {
    if (isFetchingItemsRef.current) return;
    isFetchingItemsRef.current = true;
    setLoadingItems(true);
    try {
      const currentlyOnline = await isOnline();
      if (currentlyOnline && token) {
        try {
          const yearno = getCurrentFinancialYear();
          const response = await api.get(`${API}/api/geteventitem`, {
            params: { prptype: 'K', yearno },
            headers: { Authorization: `Bearer ${token}` },
          });
          const freshItems = response.data?.data;
          if (freshItems) {
            setAllItems(freshItems);
            await setCachedItemK(freshItems);
            console.log('Loaded items (K) from API and refreshed cache', freshItems.length);
            setLoadingItems(false);
            isFetchingItemsRef.current = false;
            return;
          }
        } catch (apiErr) {
          console.log('Failed to fetch items from API, falling back to cache', apiErr);
        }
      }
      const cached = await getCachedItemK();
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
      isFetchingItemsRef.current = false;
    }
  }, [token]);

  const loadItems_V = useCallback(async () => {
    if (isFetchingItemsRef.current) return;
    isFetchingItemsRef.current = true;
    setLoadingItems(true);
    try {
      const currentlyOnline = await isOnline();
      if (currentlyOnline && token) {
        try {
          const yearno = getCurrentFinancialYear();
          const response = await api.get(`${API}/api/geteventitem`, {
            params: { prptype: 'V', yearno },
            headers: { Authorization: `Bearer ${token}` },
          });
          const freshItems = response.data?.data;
          if (freshItems) {
            setAllItems(freshItems);
            await setCachedItemV(freshItems);
            console.log('Loaded items (V) from API and refreshed cache', freshItems.length);
            setLoadingItems(false);
            isFetchingItemsRef.current = false;
            return;
          }
        } catch (apiErr) {
          console.log('Failed to fetch items from API, falling back to cache', apiErr);
        }
      }
      const cached = await getCachedItemV();
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
      isFetchingItemsRef.current = false;
    }
  }, [token]);

  const loadItems_R = useCallback(async () => {
    if (isFetchingItemsRef.current) return;
    isFetchingItemsRef.current = true;
    setLoadingItems(true);
    try {
      const currentlyOnline = await isOnline();
      if (currentlyOnline && token) {
        try {
          const yearno = getCurrentFinancialYear();
          const response = await api.get(`${API}/api/geteventitem`, {
            params: { prptype: 'R', yearno },
            headers: { Authorization: `Bearer ${token}` },
          });
          const freshItems = response.data?.data;
          if (freshItems) {
            setAllItems(freshItems);
            await setCachedItemR(freshItems);
            console.log('Loaded items (R) from API and refreshed cache', freshItems.length);
            setLoadingItems(false);
            isFetchingItemsRef.current = false;
            return;
          }
        } catch (apiErr) {
          console.log('Failed to fetch items from API, falling back to cache', apiErr);
        }
      }
      const cached = await getCachedItemR();
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
      isFetchingItemsRef.current = false;
    }
  }, [token]);

  console.log('Item data Items:', allItems, 'Design data Designs:', allDesigns);

  // Filter & paginate items
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

  // Which item's dsn_code (item_code) design selection is currently scoped to.
  const getSelectedItemCodeForDesign = useCallback(() => {
    if (editingDesignItemIndex === null) return null;
    const itm = selectedItems[editingDesignItemIndex];
    if (!itm) return null;
    // if (!id && !itm || itm.is_new_item !== false) return null;
    if (itm.item_code === undefined || itm.item_code === null || String(itm.item_code) === '' || String(itm.item_code) === '0') {
      return null;
    }
    return String(itm.item_code);
  }, [editingDesignItemIndex, selectedItems]);

  // Item-wise design pool: only designs whose itmcode matches the selected item's dsn_code.
  const designsForSelectedItem = React.useMemo(() => {
    const itemCode = getSelectedItemCodeForDesign();
    if (!itemCode) return [];
    return allDesigns.filter(d => String(d.itmcode) === itemCode);
  }, [allDesigns, getSelectedItemCodeForDesign]);

  // Filter & paginate designs
  useEffect(() => {
    if (designsForSelectedItem.length === 0) {
      setDisplayedDesigns([]);
      setHasMore(false);
      return;
    }
    const q = designSearchQuery.toLowerCase().trim();
    const filtered = q
      ? designsForSelectedItem.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        String(d.dsn_code || '').toLowerCase().includes(q)
      )
      : designsForSelectedItem;
    const firstPageItems = filtered.slice(0, pageSize);
    setDisplayedDesigns(firstPageItems);
    setHasMore(filtered.length > pageSize);
  }, [designsForSelectedItem, designSearchQuery]);

  // Load more items (infinite scroll)
  const loadMoreItems = useCallback(() => {
    if (loadingMoreItemsRef.current || loadingItems || !hasMoreItem) return;
    loadingMoreItemsRef.current = true;
    setLoadingMoreItems(true);

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
    } else {
      setDisplayedItems(prev => [...prev, ...nextItems]);
      setHasMoreItem(end < filtered.length);
    }
    setTimeout(() => {
      loadingMoreItemsRef.current = false;
      setLoadingMoreItems(false);
    }, 250);
  }, [loadingItems, hasMoreItem, itemSearchQuery, allItems, displayedItems.length]);

  const loadMoreDesigns = useCallback(() => {
    if (loadingMoreDesignsRef.current || loadingDesigns || !hasMore) return;
    loadingMoreDesignsRef.current = true;
    setLoadingMoreDesigns(true);

    const q = designSearchQuery.toLowerCase().trim();
    const filtered = q
      ? designsForSelectedItem.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        String(d.dsn_code || '').toLowerCase().includes(q)
      )
      : designsForSelectedItem;
    const start = displayedDesigns.length;
    const end = start + pageSize;
    const nextItems = filtered.slice(start, end);
    if (nextItems.length === 0) {
      setHasMore(false);
    } else {
      setDisplayedDesigns(prev => [...prev, ...nextItems]);
      setHasMore(end < filtered.length);
    }
    setTimeout(() => {
      loadingMoreDesignsRef.current = false;
      setLoadingMoreDesigns(false);
    }, 250);
  }, [loadingDesigns, hasMore, designSearchQuery, designsForSelectedItem, displayedDesigns.length]);

  useEffect(() => {
    if (!token) return;
    if (!getUserPrptypeFromCache) return;
    loadEvent(getUserPrptypeFromCache);
    loadPrp(getUserPrptypeFromCache);
  }, [token]);

  async function checkConnectivity() {
    const result = await isOnline();
    setOnline(result);
  }

  // --- Item functions ---
  const addItemToCard = (item, itemIndex: number) => {
    setSelectedItems(prev => {
      const updated = [...prev];
      updated[itemIndex] = {
        ...updated[itemIndex],
        item_name: item.name,
        item_code: Number(item.dsn_code),
        is_new_item: false,
      };
      return updated;
    });
    setEditingItemIndex(null);
    setItemModalVisible(false);
  };

  // Add blank item (non-S, New mode)
  const addBlankItem = () => {
    const newItem: Item = {
      item_name: '',
      item_code: 0,
      is_new_item: true,
      item_qty: '',
      item_unit: '',
      item_rate: '',
      item_remark: '',
      designs: [],
    };
    setSelectedItems(prev => [...prev, newItem]);
  };

  // For S: add new item with a blank design (default Existing)
  const addBlankItemForS = () => {
    const newItem: Item = {
      item_name: '',
      item_code: 0,
      is_new_item: false,
      item_qty: '',
      item_unit: '',
      item_rate: '',
      item_remark: '',
      designs: [blankDesign()],
    };
    setSelectedItems(prev => {
      const newIndex = prev.length;
      setDesignModePerItem(p => ({ ...p, [newIndex]: ['Existing'] }));
      return [...prev, newItem];
    });
  };

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
    // Also remove design mode entry
    setDesignModePerItem(prev => {
      const newModes = { ...prev };
      delete newModes[index];
      // Re-index remaining items
      const reindexed = {};
      Object.keys(newModes).forEach(key => {
        const k = parseInt(key);
        if (k > index) {
          reindexed[k - 1] = newModes[k];
        } else {
          reindexed[k] = newModes[k];
        }
      });
      return reindexed;
    });
    // Re-index expanded/collapsed accordion state too
    setExpandedDesignItems(prev => {
      const reindexed = {};
      Object.keys(prev).forEach(key => {
        const k = parseInt(key);
        if (k > index) {
          reindexed[k - 1] = prev[k];
        } else if (k !== index) {
          reindexed[k] = prev[k];
        }
      });
      return reindexed;
    });
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

  // Toggle item's own Existing/New tab (non-S only)
  const toggleItemTab = (itemIndex: number, mode: 'Existing' | 'New') => {
    setSelectedItems(prev => {
      const updated = [...prev];
      const item = updated[itemIndex];
      if (mode === 'Existing') {
        item.is_new_item = false;
        item.item_name = '';
        item.item_code = 0;
      } else {
        item.is_new_item = true;
        item.item_name = '';
        item.item_code = 0;
      }
      return updated;
    });
  };

  // --- Design functions (for S) ---
  // Toggle design mode for a specific design slot inside an item – clears its name to force reselection/typing
  const toggleDesignMode = (itemIndex: number, designIndex: number, mode: 'Existing' | 'New') => {
    setDesignModePerItem(prev => {
      const updated = { ...prev };
      const modes = updated[itemIndex] ? [...updated[itemIndex]] : [];
      modes[designIndex] = mode;
      updated[itemIndex] = modes;
      return updated;
    });
    setSelectedItems(prev => {
      const updated = [...prev];
      const item = updated[itemIndex];
      if (!item.designs) item.designs = [];
      if (!item.designs[designIndex]) {
        item.designs[designIndex] = blankDesign();
      }
      const design = item.designs[designIndex];
      if (mode === 'Existing') {
        design.is_new = false;
        design.design_requirement = 'Existing';
        // design.dsn_name = '';
        // design.dsn_code = 0;
      } else {
        design.is_new = true;
        design.design_requirement = 'New';
        design.dsn_name = '';
        design.dsn_code = 0;
      }
      return updated;
    });
  };

  // Add a brand-new (blank) design slot to an item – used by the "Add Design" button.
  // The first design of an item can never be removed; only ones added this way can be.
  const addDesignRow = (itemIndex: number) => {
    setSelectedItems(prev => {
      const updated = [...prev];
      const item = updated[itemIndex];
      if (!item.designs) item.designs = [];
      item.designs.push(blankDesign());
      return updated;
    });
    setDesignModePerItem(prev => {
      const updated = { ...prev };
      const modes = updated[itemIndex] ? [...updated[itemIndex]] : [];
      modes.push('Existing');
      updated[itemIndex] = modes;
      return updated;
    });
    // Make sure the item's design list is visible so the new row is seen right away
    setExpandedDesignItems(prev => ({ ...prev, [itemIndex]: true }));
  };

  // Remove a design slot from an item. Slot 0 (the item's default/required design) can't be removed.
  const removeDesignRow = (itemIndex: number, designIndex: number) => {
    if (designIndex === 0) return;
    setSelectedItems(prev => {
      const updated = [...prev];
      const item = updated[itemIndex];
      if (item.designs) {
        item.designs = item.designs.filter((_, i) => i !== designIndex);
      }
      return updated;
    });
    setDesignModePerItem(prev => {
      const updated = { ...prev };
      if (updated[itemIndex]) {
        updated[itemIndex] = updated[itemIndex].filter((_, i) => i !== designIndex);
      }
      return updated;
    });
  };

  // Whether an item's design list is currently expanded (default true / visible)
  const isDesignsExpanded = (itemIndex: number) => expandedDesignItems[itemIndex] !== false;

  const toggleDesignsExpanded = (itemIndex: number) => {
    setExpandedDesignItems(prev => ({ ...prev, [itemIndex]: !isDesignsExpanded(itemIndex) }));
  };

  // Should the "Add Design" button for this item be disabled (an incomplete New design already exists in it)
  const isAddDesignDisabledForItem = (itemIndex: number) => {
    const item = selectedItems[itemIndex];
    if (!item || !item.designs) return false;
    return item.designs.some(d => d.is_new && (!d.dsn_name.trim() || !d.dsn_qty.trim()));
  };

  // Open design modal for S (Existing mode) – scoped to a specific item + design slot
  const openDesignModalForItem = (itemIndex: number, designIndex: number) => {
    const currentItem = selectedItems[itemIndex];
    console.log("currentItem: ", currentItem);
    // if (!currentItem || currentItem.is_new_item || !currentItem.item_code || String(currentItem.item_code) === '0') {
    // if (!currentItem || currentItem.is_new_item !== "0" || !currentItem.item_code || String(currentItem.item_code) === '0') {
    //   AppAlert.alert('Select item first', 'Please select an item before choosing a design.');
    //   return;
    // } 
    // else if (!id && !currentItem || currentItem.is_new_item !== false || !currentItem.item_code || String(currentItem.item_code) === '0') {
    //   AppAlert.alert('Select item first', 'Please select an item before choosing a design.');
    // }
    setEditingDesignItemIndex(itemIndex);
    setEditingDesignIndex(designIndex);
    setDesignSearchQuery('');
    setAllDesigns([]);
    setDisplayedDesigns([]);
    setHasMore(false);
    loadingMoreDesignsRef.current = false;
    setLoadingMoreDesigns(false);
    setDesignModalVisible(true);
    loadDesing();
  };

  const openDesignModalForItem123 = (itemIndex: number, designIndex: number) => {
    const currentItem = selectedItems[itemIndex];
    console.log("currentItem: ", currentItem);
    // if (!currentItem || currentItem.is_new_item || !currentItem.item_code || String(currentItem.item_code) === '0') {
    // if (!currentItem || currentItem.is_new_item !== false || !currentItem.item_code || String(currentItem.item_code) === '0') {
    //   AppAlert.alert('Select item first', 'Please select an item before choosing a design.');
    //   return;
    // } 
    // else if (!id && !currentItem || currentItem.is_new_item !== false || !currentItem.item_code || String(currentItem.item_code) === '0') {
    //   AppAlert.alert('Select item first', 'Please select an item before choosing a design.');
    // }
    setEditingDesignItemIndex(itemIndex);
    setEditingDesignIndex(designIndex);
    setDesignSearchQuery('');
    setAllDesigns([]);
    setDisplayedDesigns([]);
    setHasMore(false);
    loadingMoreDesignsRef.current = false;
    setLoadingMoreDesigns(false);
    setDesignModalVisible(true);
    loadDesing();
  };


  // Add selected design to the item (replaces the design at the currently-editing slot) - for S Existing mode
  const addDesignToItem = (design) => {
    if (editingDesignItemIndex === null || editingDesignIndex === null) return false;
    const itemIndex = editingDesignItemIndex;
    const designIndex = editingDesignIndex;
    setSelectedItems(prev => {
      const updated = [...prev];
      if (!updated[itemIndex].designs) {
        updated[itemIndex].designs = [];
      }
      // const newDesign: Design = {
      //   dsn_code: design.dsn_code,
      //   is_new: false,
      //   design_requirement: 'Existing',
      //   dsn_name: design.name,
      //   dsn_qty: '',
      //   unit: 'mtr',
      //   dsn_rate: '',
      //   remark: '',
      // };
      const newDesign: Design = {
        dsn_code: design.dsn_code,
        is_new: false,
        design_requirement: 'Existing',
        dsn_name: design.name,
        dsn_qty: design.dsn_qty || '', // ✅ Preserve if available
        unit: design.unit || '',    // ✅ Preserve if available
        dsn_rate: design.dsn_rate || '', // ✅ Preserve if available
        remark: design.remark || '',    // ✅ Preserve if available
      };
      updated[itemIndex].designs[designIndex] = newDesign;
      return updated;
    });
    setDesignModalVisible(false);
    setEditingDesignItemIndex(null);
    setEditingDesignIndex(null);
    setDesignSearchQuery('');
    setDisplayedDesigns([]);
    setHasMore(false);
    return true;
  };

  // Update design fields (for S) – if no design exists at that slot, create one
  const updateDesignField = (itemIndex: number, designIndex: number, field: keyof Design, value: string) => {
    setSelectedItems(prev => {
      const updated = [...prev];
      // Ensure there is a design at designIndex
      if (!updated[itemIndex].designs || updated[itemIndex].designs.length === 0) {
        updated[itemIndex].designs = [blankDesign()];
      }
      if (!updated[itemIndex].designs[designIndex]) {
        updated[itemIndex].designs[designIndex] = blankDesign();
      }
      updated[itemIndex].designs[designIndex] = {
        ...updated[itemIndex].designs[designIndex],
        [field]: value,
      };
      return updated;
    });
  };

  // --- Debug functions ---
  const loadAllEnquiries = async () => {
    try {
      const all = await getAllEnquiries();
      setDebugData(all);
      setDebugModalVisible(true);
    } catch (err) {
      AppAlert.alert('Error', 'Failed to load local data');
      console.log(err);
    }
  };

  const deleteAllEnquiries = async () => {
    try {
      const all = await deleteAllEnquiriesFromDB();
      setDebugData(all);
    } catch (err) {
      AppAlert.alert('Error', 'Failed to load local data');
      console.log(err);
    }
  };

  // --- Scan card functions ---
  async function handleScanCard() {
    if (!getToken) return;
    await checkConnectivity();
    const currentlyOnline = await isOnline();
    if (!currentlyOnline) {
      AppAlert.alert(
        'No internet',
        "Card scan needs internet. You're offline right now — please fill the details manually."
      );
      return;
    }
    try {
      const uri = await captureCardPhoto();
      if (!uri) return;
      setPendingFrontUri(uri);
      setPendingBackUri(null);
      setCardCaptureStage('front_preview');
    } catch (err) {
      if (err.message === 'CAMERA_PERMISSION_DENIED') {
        AppAlert.alert('Camera permission needed', 'Please allow camera access to scan a card.');
      } else {
        AppAlert.alert('Scan failed', "Couldn't open the camera. Please try again.");
      }
    }
  }

  async function handleScanBackSide() {
    try {
      setCapturingBack(true);
      const uri = await captureCardPhoto();
      if (!uri) return; // user cancelled — stay on the current preview
      setPendingBackUri(uri);
      setCardCaptureStage('both_preview');
    } catch (err) {
      if (err.message === 'CAMERA_PERMISSION_DENIED') {
        AppAlert.alert('Camera permission needed', 'Please allow camera access to scan the back side.');
      } else {
        AppAlert.alert('Scan failed', "Couldn't capture the back side. Please try again.");
      }
    } finally {
      setCapturingBack(false);
    }
  }

  function handleSkipBackSide() {
    processCardScan(pendingFrontUri, null);
  }

  function handleRetakeBackSide() {
    handleScanBackSide();
  }

  function handleCancelCardCapture() {
    setCardCaptureStage(null);
    setPendingFrontUri(null);
    setPendingBackUri(null);
  }

  async function handleConfirmAndProcess() {
    await processCardScan(pendingFrontUri, pendingBackUri);
  }

  async function processCardScan(frontUri, backUri) {
    setScanning(true);
    try {
      const fields = await scanVisitingCard(frontUri, backUri, getToken);
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
      if (fields.designation && !designation) {
        setDesignation(fields.designation);
        setCardFields(prev => ({ ...prev, designation: true }));
      }
      if (fields.front_img && !front_img) setFronImage(fields.front_img);
      if (fields.front_img_path && !front_path) setFrontPath(fields.front_img_path);
      if (fields.back_img) setBackUri(fields.back_img);
      if (fields.back_img_path) setBackPath(fields.back_img_path);
      setScannedFromCard(true);
      setCardCaptureStage(null);
      setPendingFrontUri(null);
      setPendingBackUri(null);
      AppAlert.alert('Card scanned', 'Details filled in below — please check them before saving.');
    } catch (err) {
      console.log('err', err);
      setCardFrontUri(null);
      setFronImage('');
      setFrontPath('');
      setScannedFromCard(false);
      if (err.message === 'OFFLINE') {
        AppAlert.alert('No internet', 'Lost connection during scan. Please fill details manually.');
      } else if (err.message === 'CAMERA_PERMISSION_DENIED') {
        AppAlert.alert('Camera permission needed', 'Please allow camera access to scan a card.');
      } else {
        AppAlert.alert('Scan failed', "Couldn't read the card clearly. Please try again.");
      }
    } finally {
      setScanning(false);
    }
  }

  async function handleUploadCard() {
    if (!getToken) return;
    await checkConnectivity();
    const currentlyOnline = await isOnline();
    if (!currentlyOnline) {
      AppAlert.alert('No internet', 'Card scan needs internet.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        AppAlert.alert('Permission required', 'Please allow gallery permission.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled) return;

      const uri = result.assets[0].uri;
      setPendingFrontUpload(uri);
      setPendingBackUpload(null);
      setUploadStage('front_preview');
    } catch (err) {
      console.error('Upload front error', err);
      AppAlert.alert('Error', 'Failed to pick front image.');
    }
  }

  async function handleUploadSkipBack() {
    await processCardScan(pendingFrontUpload, null);
    setUploadStage(null);
    setPendingFrontUpload(null);
  }

  async function handleUploadBack() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setPendingBackUpload(uri);
      setUploadStage('both_preview');
    } catch (err) {
      console.error('Upload back error', err);
      AppAlert.alert('Error', 'Failed to pick back image.');
    }
  }

  async function handleUploadRetakeBack() {
    await handleUploadBack();
  }

  async function handleUploadConfirm() {
    await processCardScan(pendingFrontUpload, pendingBackUpload);
    setUploadStage(null);
    setPendingFrontUpload(null);
    setPendingBackUpload(null);
  }

  async function handleUploadBackSide() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        AppAlert.alert("Permission required", "Please allow gallery permission.");
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




  // --- Sync progress handler ---
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

  // --- Save function ---
  async function handleSave(mode) {
    if (!partyName.trim()) {
      AppAlert.alert('Party name required', 'Please enter the company / party name.');
      return;
    }
    if (!email) {
      AppAlert.alert('Email required', 'Please enter the email.');
      return;
    }
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!emailRegex.test(email)) {
    //   AppAlert.alert('Invalid Email', 'Please enter a valid email address.');
    //   return;
    // }
    if (!mobile) {
      AppAlert.alert('Mobile number required', 'Please enter the mobile number.');
      return;
    }
    const cleanedMobile = mobile.replace(/\D/g, '');
    if (cleanedMobile.length < 7) {
      AppAlert.alert(
        'Invalid Mobile Number',
        'Mobile number must contain at least 7 digits.'
      );
      return;
    }

    if (selectedItems.length === 0) {
      AppAlert.alert('Items required', 'Please add at least one item.');
      return;
    }

    // Check for empty item names if any new items (non-S)
    const emptyName = selectedItems.some(i => i.is_new_item && !i.item_name.trim());
    if (emptyName) {
      AppAlert.alert('Item name required', 'Please enter a name for all new items.');
      return;
    }
    if (getUserPrptype !== 'S') {
      const missingQty = selectedItems.some(i => !i.item_qty || !i.item_qty.trim());
      if (missingQty) {
        AppAlert.alert('Quantity required', 'Please enter quantity for all items.');
        return;
      }
    } else {
      // For S, check if each item has at least one design and ALL of its designs are valid
      for (const item of selectedItems) {
        if (item.designs && item.designs.length > 0) {
          for (const design of item.designs) {
            // If design is New, name must be filled
            if (design.is_new && !design.dsn_name.trim()) {
              AppAlert.alert('Design name required', 'Please enter a name for new designs.');
              return;
            }
            if (!design.dsn_qty || !design.dsn_qty.trim()) {
              AppAlert.alert('Quantity required', 'Please enter quantity for all designs.');
              return;
            }
          }
        } else {
          AppAlert.alert('Design required', 'Each item must have a design.');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const userJson = await AsyncStorage.getItem('user_id');
      const user = userJson ? JSON.parse(userJson) : null;
      if (!user) {
        AppAlert.alert('Not logged in', 'Please log in again before saving.');
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
        back_img: online ? back_path : backUri,
        back_img_path: back_path,
        scanned_from_card: scannedFromCard,
        event_code: eventCode,
        items: selectedItems,
        design_requirement: selectedItems.some(item => item.designs?.some(d => d.design_requirement === 'New')) ? 'New' : 'Existing',
      };

      let saveSuccess = false;
      if (mode === 'edit') {
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        await updateEnquiries(payload?.id, token, getCurrentFinancialYear(), getUserPrptype, payload);
        saveSuccess = true;
      } else {
        await insertEnquiry(payload);
        saveSuccess = true;
      }

      if (!saveSuccess) {
        AppAlert.alert('Save failed', 'Could not save locally. Please try again.');
        setSaving(false);
        return;
      }

      const currentlyOnline = await isOnline();
      if (!currentlyOnline) {
        AppAlert.alert('Enquiry saved', "Saved on this device. It'll sync automatically once you're back online.");
        setSaving(false);
        resetFormFields();
        return;
      }

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
          AppAlert.alert('Enquiry saved', 'Saved and synced to server successfully.');
          router.push('/new/event');
        } else {
          AppAlert.alert('Enquiry saved locally', `Sync completed with ${syncResult.failedCount} error(s). Check the sync banner.`);
        }
      } else {
        AppAlert.alert('Sync error', `An error occurred during sync: ${syncResult.message}`);
      }
      setSaving(false);
    } catch (err) {
      console.log('Save error', err);
      AppAlert.alert('Save failed', 'Something went wrong saving this enquiry. Please try again.');
      setSaving(false);
    }
  }

  const showFailedItems = () => {
    if (syncStatus.failedItems && syncStatus.failedItems.length > 0) {
      setFailedItemsList(syncStatus.failedItems);
      setFailedItemsModalVisible(true);
    } else {
      AppAlert.alert('No failed items', 'All enquiries synced successfully!');
    }
  };

  // --- Render functions ---

  const renderItemCard = (item, itemIndex) => {
    const isPrptypeS = getUserPrptype === 'S';

    return (
      <View key={itemIndex} style={styles.itemCard}>
        <TouchableOpacity style={{ alignItems: 'flex-end' }} onPress={() => removeItem(itemIndex)}>
          <Icon name="delete" size={22} color={C.danger} />
        </TouchableOpacity>

        {isPrptypeS ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Item</Text>
            <TouchableOpacity
              style={[styles.dropdown, { backgroundColor: item.item_name ? '#f0f0f0' : '#fff' }]}
              onPress={() => {
                setEditingItemIndex(itemIndex);
                setItemSearchQuery('');
                setAllItems([]);
                setDisplayedItems([]);
                setHasMoreItem(false);
                loadingMoreItemsRef.current = false;
                setLoadingMoreItems(false);
                if (getUserPrptype === 'K') loadItems_K();
                else if (getUserPrptype === 'V') loadItems_V();
                else if (getUserPrptype === 'R') loadItems_R();
                else loadItems();
                setItemModalVisible(true);
              }}
            >
              <Text style={styles.dropdownText}>
                {item.item_name || 'Select Item'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.fieldGroup}>
            <View style={styles.tabContainerSmall1}>
              <TouchableOpacity
                style={[styles.tabSmall1, !item.is_new_item && styles.activeTabSmall]}
                onPress={() => toggleItemTab(itemIndex, 'Existing')}
              >
                <Text style={[styles.tabTextSmall, !item.is_new_item && styles.activeTabTextSmall]}>Existing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabSmall1, item.is_new_item && styles.activeTabSmall]}
                onPress={() => toggleItemTab(itemIndex, 'New')}
              >
                <Text style={[styles.tabTextSmall, item.is_new_item && styles.activeTabTextSmall]}>New</Text>
              </TouchableOpacity>
            </View>
            {item.is_new_item ? (
              <View>
                <Field label="Item Name *">
                  <TextInput
                    style={styles.input}
                    placeholder="Enter item name"
                    value={item.item_name}
                    onChangeText={(text) => updateItemField(itemIndex, 'item_name', text)}
                  />
                </Field>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.dropdown, { backgroundColor: item.item_name ? '#f0f0f0' : '#fff' }]}
                onPress={() => {
                  setEditingItemIndex(itemIndex);
                  setItemSearchQuery('');
                  setAllItems([]);
                  setDisplayedItems([]);
                  setHasMoreItem(false);
                  loadingMoreItemsRef.current = false;
                  setLoadingMoreItems(false);
                  if (getUserPrptype === 'K') loadItems_K();
                  else if (getUserPrptype === 'V') loadItems_V();
                  else if (getUserPrptype === 'R') loadItems_R();
                  else loadItems();
                  setItemModalVisible(true);
                }}
              >
                <Text style={styles.dropdownText}>
                  {item.item_name || 'Select Item'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isPrptypeS && (
          <View style={styles.designFields}>
            {/* <View style={[styles.fieldGroup, { flexDirection: 'row', justifyContent: 'space-between' }]}> */}
            <View style={styles.designFieldsRow}>
              <View style={{ flex: 1.15 }}>
                {/* <Field label="Qty"> */}
                <Text style={styles.designFieldLabel}>Qty</Text>
                <TextInput
                  style={styles.designFieldInput}
                  value={item.item_qty}
                  onChangeText={(text) => updateItemField(itemIndex, 'item_qty', text)}
                  keyboardType="numeric"
                  placeholder="0"
                />
                {/* </Field> */}
              </View>
              <View style={{ flex: 1.15 }}>
                {/* <Field label="Rate"> */}
                <Text style={styles.designFieldLabel}>Rate</Text>
                <TextInput
                  style={styles.designFieldInput}
                  value={item.item_rate}
                  onChangeText={(text) => updateItemField(itemIndex, 'item_rate', text)}
                  keyboardType="numeric"
                  placeholder="0"
                />
                {/* </Field> */}
              </View>
              {/* </View> */}
              <View style={{ flex: 1.15 }}>
                {/* <Field label="Unit"> */}
                <Text style={styles.designFieldLabel}>Unit</Text>
                <TextInput
                  style={styles.designFieldInput}
                  value={item.item_unit}
                  onChangeText={(text) => updateItemField(itemIndex, 'item_unit', text)}
                  placeholder=""
                />
                {/* </Field> */}
              </View>
            </View>
            <Text style={[styles.designFieldLabel, { marginTop: 8, marginBottom: 4 }]}>
              Remark / Color Requirements
            </Text>
            <TextInput
              style={[styles.designFieldInput, styles.remarkInput]}
              value={item.item_remark}
              onChangeText={(text) => updateItemField(itemIndex, 'item_remark', text)}
              placeholder="Optional remark"
            />
            {/* </Field> */}
          </View>
        )}

        {isPrptypeS && (
          <View style={styles.designsContainer}>
            <View style={styles.designsHeader}>
              <Text style={styles.designsTitle}>
                Design{item.designs && item.designs.length > 1 ? 's' : ''}
                {item.item_name ? ` for "${item.item_name}"` : ''}
              </Text>
            </View>

            {/* Accordion show/hide + count — only appears once an item has more than 1 design */}
            {item.designs && item.designs.length > 1 && (
              <TouchableOpacity
                style={styles.designAccordionBtn}
                onPress={() => toggleDesignsExpanded(itemIndex)}
                activeOpacity={0.75}
              >
                <Text style={styles.designAccordionText}>{item.designs.length} Designs</Text>
                <Icon
                  name={isDesignsExpanded(itemIndex) ? 'expand-less' : 'expand-more'}
                  size={22}
                  color={C.brandDark}
                />
              </TouchableOpacity>
            )}

            {(!item.designs || item.designs.length <= 1 || isDesignsExpanded(itemIndex)) && (
              (item.designs && item.designs.length > 0 ? item.designs : [blankDesign()]).map((design, designIndex) => {
                const displayDesign = design || blankDesign();
                const modeForThisDesign =
                  (designModePerItem[itemIndex] && designModePerItem[itemIndex][designIndex]) || 'Existing';

                console.log("modeForThisDesign: ", modeForThisDesign);

                return (
                  <View key={designIndex} style={styles.designCard}>
                    {/* Design badge + remove (remove only allowed for extra designs, not the first) */}
                    <View style={styles.designCardHeader}>
                      <Text style={styles.designCardBadge}>Design {designIndex + 1}</Text>
                      {designIndex > 0 && (
                        <TouchableOpacity
                          onPress={() => removeDesignRow(itemIndex, designIndex)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icon name="close" size={18} color={C.danger} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Per-design Existing/New tab */}
                    <View style={styles.tabContainerSmall1}>
                      <TouchableOpacity
                        style={[styles.tabSmall1, modeForThisDesign === 'Existing' && styles.activeTabSmall]}
                        onPress={() => toggleDesignMode(itemIndex, designIndex, 'Existing')}
                      >
                        <Text style={[styles.tabTextSmall, modeForThisDesign === 'Existing' && styles.activeTabTextSmall]}>Existing</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.tabSmall1, modeForThisDesign === 'New' && styles.activeTabSmall]}
                        onPress={() => toggleDesignMode(itemIndex, designIndex, 'New')}
                      >
                        <Text style={[styles.tabTextSmall, modeForThisDesign === 'New' && styles.activeTabTextSmall]}>New</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Design selection or name input based on mode */}
                    {modeForThisDesign === 'Existing' ? (
                      <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Design</Text>
                        <TouchableOpacity
                          style={[styles.dropdown, { backgroundColor: displayDesign.dsn_name ? '#f0f0f0' : '#fff' }]}
                          // onPress={() => openDesignModalForItem(itemIndex, designIndex)}
                          onPress={() => id ? openDesignModalForItem(itemIndex, designIndex) : openDesignModalForItem123(itemIndex, designIndex)}
                        >
                          <Text style={styles.dropdownText}>
                            {displayDesign.dsn_name || 'Select Design'}
                          </Text>
                          <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      // New mode: inline text field for design name
                      <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Design Name *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter design name"
                          value={displayDesign.dsn_name}
                          onChangeText={(text) => updateDesignField(itemIndex, designIndex, 'dsn_name', text)}
                        />
                      </View>
                    )}

                    {/* Design fields: Qty, Rate & Unit share one compact row, Remark below */}
                    <View style={styles.designFields}>
                      <View style={styles.designFieldsRow}>
                        <View style={{ flex: 1.15 }}>
                          <Text style={styles.designFieldLabel}>Qty</Text>
                          <TextInput
                            style={styles.designFieldInput}
                            value={displayDesign.dsn_qty}
                            onChangeText={(text) => updateDesignField(itemIndex, designIndex, 'dsn_qty', text)}
                            keyboardType="numeric"
                            placeholder="0"
                          />
                        </View>
                        <View style={{ flex: 1.15 }}>
                          <Text style={styles.designFieldLabel}>Rate</Text>
                          <TextInput
                            style={styles.designFieldInput}
                            value={displayDesign.dsn_rate}
                            onChangeText={(text) => updateDesignField(itemIndex, designIndex, 'dsn_rate', text)}
                            keyboardType="numeric"
                            placeholder="0"
                          />
                        </View>
                        <View style={{ flex: 0.9 }}>
                          <Text style={styles.designFieldLabel}>Unit</Text>
                          <TextInput
                            style={styles.designFieldInput}
                            value={displayDesign.unit}
                            onChangeText={(text) => updateDesignField(itemIndex, designIndex, 'unit', text)}
                            placeholder=""
                          />
                        </View>
                      </View>
                      <Text style={[styles.designFieldLabel, { marginTop: 8, marginBottom: 4 }]}>
                        Remark / Color Requirements
                      </Text>
                      <TextInput
                        style={[styles.designFieldInput, styles.remarkInput]}
                        value={displayDesign.remark}
                        onChangeText={(text) => updateDesignField(itemIndex, designIndex, 'remark', text)}
                        placeholder="Optional remark"
                      />
                    </View>
                  </View>
                );
              })
            )}

            {/* Add Design – appends another design row to THIS item */}
            <TouchableOpacity
              style={[styles.addDesignBtn, isAddDesignDisabledForItem(itemIndex) && styles.disabledBtn]}
              onPress={() => addDesignRow(itemIndex)}
              disabled={isAddDesignDisabledForItem(itemIndex)}
            >
              <Icon name="add" size={18} color={isAddDesignDisabledForItem(itemIndex) ? '#aaa' : C.brand} />
              <Text style={[styles.addDesignBtnText, { color: isAddDesignDisabledForItem(itemIndex) ? '#aaa' : C.brand }]}>
                {' '}Add Design
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderItemsSection = () => {
    const isPrptypeS = getUserPrptype === 'S';

    // Determine if Add New Item button should be disabled
    let isAddDisabled = false;
    if (isPrptypeS) {
      // Disable if ANY design in ANY item is New with empty name/qty
      isAddDisabled = selectedItems.some(item => {
        if (item.designs && item.designs.length > 0) {
          // return item.designs.some(design => design.is_new && (!design.dsn_name.trim() || !design.dsn_qty.trim()));
          return item.designs.some(design => (!design.dsn_name.trim() || !design.dsn_qty.trim()));
        }
        return false;
      });
    } else {
      // Disable if any item is New with empty name or qty
      // isAddDisabled = selectedItems.some(item => item.is_new_item && (!item.item_name.trim() || !item.item_qty.trim()));
      isAddDisabled = selectedItems.some(item => (!item.item_name.trim() || !item.item_qty.trim()));
    }

    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Items</Text>

        {/* Selected Items List */}
        {selectedItems.map((item, index) => renderItemCard(item, index))}

        {selectedItems.length === 0 && (
          <Text style={styles.noItemsText}>No items added. Tap "Add Item" to start.</Text>
        )}

        {/* Add Item Button */}
        <TouchableOpacity
          style={[styles.addItemBtn, styles.scanBtnDash, isAddDisabled && styles.disabledBtn]}
          onPress={isPrptypeS ? addBlankItemForS : addBlankItem}
          disabled={isAddDisabled}
        >
          <Icon name="add" size={20} color={isAddDisabled ? '#aaa' : C.brand} />
          <Text style={[styles.scanBtnTextDash, { color: isAddDisabled ? '#aaa' : C.brand }]}> Add New Item</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // --- Main render ---
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
      <View style={{ display: 'flex', flexDirection: 'row', backgroundColor: '#fff' }} >
        <TouchableOpacity
          style={[styles.reportBtn, { width: '40%' }]}
          // onPress={() => router.push({ pathname: '/EnquiryReportScreen' })}
          onPress={() => {
            showInqReport(true);
          }}
        >
          <Text style={styles.reportBtnText}>Show Report</Text>
        </TouchableOpacity>
        {id && (
          <TouchableOpacity
            style={[styles.reportBtn, { width: '40%' }]}
            // onPress={() => router.push({ pathname: '/EnquiryReportScreen' })}
            onPress={() => {
              setMode('added');
              initializeDefaultItems();
            }}
          >
            <Text style={styles.reportBtnText}>Add Enquiry</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.scanBlock}>
            {cardCaptureStage === null && (
              <>
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
                    onPress={() => handleUploadCard()}
                  >
                    <Text style={styles.scanBtnText}>Upload Card</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.scanHint}>
                  {online
                    ? 'Captures name, address, mobile, email, company & GSTIN automatically. Needs internet.'
                    : "No internet — card scan is unavailable. Type details below."}
                </Text>
              </>
            )}

            {cardCaptureStage === 'front_preview' && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={styles.scanTitle}>Front Side Captured</Text>
                  <TouchableOpacity onPress={handleCancelCardCapture} disabled={scanning}>
                    <Icon name="close" size={22} color={C.muted} />
                  </TouchableOpacity>
                </View>
                <Image source={{ uri: pendingFrontUri }} style={styles.cardImage} resizeMode="contain" />
                <Text style={[styles.scanHint, { textAlign: 'center', marginTop: 10 }]}>
                  Would you like to scan the back side?
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.scanBtn, { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.brand }]}
                    onPress={handleSkipBackSide}
                    disabled={scanning}
                  >
                    {scanning ? (
                      <ActivityIndicator color={C.brand} />
                    ) : (
                      <Text style={[styles.scanBtnText, { color: C.brand }]}>Skip</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scanBtn, { flex: 1 }]}
                    onPress={handleScanBackSide}
                    disabled={capturingBack || scanning}
                  >
                    {capturingBack ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.scanBtnText}>Scan Back</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {scanning && (
                  <View style={{ marginTop: 12, alignItems: 'center' }}>
                    <ActivityIndicator color={C.brand} />
                    <Text style={styles.scanHint}>Processing card... Please wait</Text>
                  </View>
                )}
              </View>
            )}

            {cardCaptureStage === 'both_preview' && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={styles.scanTitle}>Front + Back Captured</Text>
                  <TouchableOpacity onPress={handleCancelCardCapture} disabled={scanning}>
                    <Icon name="close" size={22} color={C.muted} />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardSideLabel}>Front</Text>
                    <Image source={{ uri: pendingFrontUri }} style={styles.cardImage} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardSideLabel}>Back</Text>
                    <Image source={{ uri: pendingBackUri }} style={styles.cardImage} resizeMode="contain" />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.scanBtn, { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.brand }]}
                    onPress={handleRetakeBackSide}
                    disabled={capturingBack || scanning}
                  >
                    {capturingBack ? (
                      <ActivityIndicator color={C.brand} />
                    ) : (
                      <Text style={[styles.scanBtnText, { color: C.brand }]}>Retake Back</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scanBtn, { flex: 1 }]}
                    onPress={handleConfirmAndProcess}
                    disabled={scanning}
                  >
                    {scanning ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.scanBtnText}>Confirm & Process</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {scanning && (
                  <View style={{ marginTop: 12, alignItems: 'center' }}>
                    <ActivityIndicator color={C.brand} />
                    <Text style={styles.scanHint}>Processing card... Please wait</Text>
                  </View>
                )}
              </View>
            )}

            {uploadStage === 'front_preview' && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={styles.scanTitle}>Front Image Picked</Text>
                  <TouchableOpacity onPress={() => { setUploadStage(null); setPendingFrontUpload(null); }} disabled={scanning}>
                    <Icon name="close" size={22} color={C.muted} />
                  </TouchableOpacity>
                </View>
                <Image source={{ uri: pendingFrontUpload }} style={styles.cardImage} resizeMode="contain" />
                <Text style={[styles.scanHint, { textAlign: 'center', marginTop: 10 }]}>
                  Would you like to pick the back side?
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.scanBtn, { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.brand }]}
                    onPress={handleUploadSkipBack}
                    disabled={scanning}
                  >
                    <Text style={[styles.scanBtnText, { color: C.brand }]}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scanBtn, { flex: 1 }]}
                    onPress={handleUploadBack}
                    disabled={scanning}
                  >
                    <Text style={styles.scanBtnText}>Upload Back</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {uploadStage === 'both_preview' && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={styles.scanTitle}>Front + Back Picked</Text>
                  <TouchableOpacity onPress={() => { setUploadStage(null); setPendingFrontUpload(null); setPendingBackUpload(null); }} disabled={scanning}>
                    <Icon name="close" size={22} color={C.muted} />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardSideLabel}>Front</Text>
                    <Image source={{ uri: pendingFrontUpload }} style={styles.cardImage} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardSideLabel}>Back</Text>
                    <Image source={{ uri: pendingBackUpload }} style={styles.cardImage} resizeMode="contain" />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.scanBtn, { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.brand }]}
                    onPress={handleUploadRetakeBack}
                    disabled={scanning}
                  >
                    <Text style={[styles.scanBtnText, { color: C.brand }]}>Retake Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scanBtn, { flex: 1 }]}
                    onPress={handleUploadConfirm}
                    disabled={scanning}
                  >
                    {scanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanBtnText}>Confirm & Process</Text>}
                  </TouchableOpacity>
                </View>
                {scanning && (
                  <View style={{ marginTop: 12, alignItems: 'center' }}>
                    <ActivityIndicator color={C.brand} />
                    <Text style={styles.scanHint}>Processing card... Please wait</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Property</Text>
            <TouchableOpacity
              style={mode === 'edit' ? [styles.dropdown, styles.dropdownDisabled] : styles.dropdown}
              onPress={() => setPrpModalVisible(true)}
              disabled={mode === 'edit'}
            >
              <Text style={mode === 'edit' ? [styles.dropdownText, styles.dropdownTextDisabled] : styles.dropdownText}>
                {PRPS.find(e => e.code === getUserPrptype)?.name || 'Select Property'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

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

          <Field label="Party name *">
            <TextInput
              style={[styles.input, cardFields.party_name && styles.cardFilledInput]}
              placeholder="Company / party"
              value={partyName}
              onChangeText={setPartyName}
            />
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
            <TextInput
              style={[styles.input, cardFields.gst_no && styles.cardFilledInput]}
              placeholder="24XXXXXXXXXXXZ5"
              value={gstNo}
              onChangeText={setGstNo}
              autoCapitalize="characters"
            />
          </Field>

          <Field label="Contact name">
            <TextInput
              style={[styles.input, cardFields.contact_name && styles.cardFilledInput]}
              placeholder="Person met at the stall"
              value={contactName}
              onChangeText={setContactName}
            />
          </Field>

          <Field label="Designation">
            <TextInput
              style={[styles.input, cardFields.designation && styles.cardFilledInput]}
              placeholder="Designation"
              value={designation}
              onChangeText={setDesignation}
            />
          </Field>

          <Field label="Mobile">
            <TextInput
              style={[styles.input, cardFields.mobile && styles.cardFilledInput]}
              placeholder="98XXXXXXXX"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
            />
          </Field>

          <Field label="Email">
            <TextInput
              style={[styles.input, cardFields.email && styles.cardFilledInput]}
              placeholder="email@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Field>

          {renderItemsSection()}

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
                <View style={styles.cardActionsNNN}>
                  <TouchableOpacity onPress={handleUploadBackSide}>
                    <Text style={styles.actionText}>Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setBackUri('')}>
                    <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
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
                      <Text style={styles.actionText}>Replace</Text>
                    </TouchableOpacity>
                  )}
                  {backUri && (
                    <TouchableOpacity onPress={handleUploadBackSide}>
                      <Text style={styles.actionText}>Replace</Text>
                    </TouchableOpacity>
                  )}
                  {front_off_Uri && (
                    <TouchableOpacity onPress={() => setFront_off_Uri('')}>
                      <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
                    </TouchableOpacity>
                  )}
                  {backUri && (
                    <TouchableOpacity onPress={() => setBackUri('')}>
                      <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
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

      <Modal
        visible={itemModalVisible}
        animationType="slide"
        onRequestClose={() => {
          setItemModalVisible(false);
          setEditingItemIndex(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Item</Text>
            <TouchableOpacity
              onPress={() => {
                setItemModalVisible(false);
                setEditingItemIndex(null);
              }}
            >
              <Icon name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

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
                const alreadyAdded = selectedItems.some(
                  i => String(i.item_code) === String(item.dsn_code) && !i.is_new_item
                );
                return (
                  <TouchableOpacity
                    style={[styles.modalDesignItem, alreadyAdded && styles.modalDesignItemSelected]}
                    onPress={() => {
                      if (editingItemIndex === null) return;
                      addItemToCard(item, editingItemIndex);
                    }}
                  >
                    <Text style={styles.modalDesignItemText}>{item.name}</Text>
                    <Text style={styles.modalDesignItemCode}>{item.dsn_code}</Text>
                    {alreadyAdded && <Icon name="check-circle" size={20} color={C.muted} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.modalNoDesignsText}>No items found</Text>}
              onEndReached={loadMoreItems}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingItems ? (
                  <ActivityIndicator size="large" color={C.brand} style={{ margin: 10 }} />
                ) : loadingMoreItems ? (
                  <ActivityIndicator size="small" color={C.brand} style={{ margin: 10 }} />
                ) : null
              }
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={designModalVisible}
        animationType="slide"
        onRequestClose={() => {
          setDesignModalVisible(false);
          setEditingDesignItemIndex(null);
          setEditingDesignIndex(null);
          setDesignSearchQuery('');
          setDisplayedDesigns([]);
          setHasMore(false);
          setAllDesigns([]);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Design</Text>
            <TouchableOpacity
              onPress={() => {
                setDesignModalVisible(false);
                setEditingDesignItemIndex(null);
                setEditingDesignIndex(null);
                setDesignSearchQuery('');
                setDisplayedDesigns([]);
                setHasMore(false);
                setAllDesigns([]);
              }}
            >
              <Icon name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

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
              renderItem={({ item }) => {
                const alreadyAdded = editingDesignItemIndex !== null
                  ? (selectedItems[editingDesignItemIndex]?.designs || []).some(
                    d => String(d.dsn_code) === String(item.dsn_code) && !d.is_new
                  )
                  : false;
                return (
                  <TouchableOpacity
                    style={[styles.modalDesignItem, alreadyAdded && styles.modalDesignItemSelected]}
                    onPress={() => {
                      // if (alreadyAdded) {
                      //   AppAlert.alert('Already added', `${item.name} is already selected.`);
                      //   return;
                      // }
                      const success = addDesignToItem(item);
                      if (success) {
                        setDesignModalVisible(false);
                        setEditingDesignItemIndex(null);
                        setEditingDesignIndex(null);
                        setDesignSearchQuery('');
                        setDisplayedDesigns([]);
                        setHasMore(false);
                        setAllDesigns([]);
                      }
                    }}
                  >
                    <Text style={styles.modalDesignItemText}>{item.name}</Text>
                    <Text style={styles.modalDesignItemCode}>{item.dsn_code}</Text>
                    {alreadyAdded && <Icon name="check-circle" size={20} color={C.muted} />}
                  </TouchableOpacity>
                );
              }}
              onEndReached={loadMoreDesigns}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={<Text style={styles.modalNoDesignsText}>No designs found for this item</Text>}
              ListFooterComponent={
                loadingDesigns ? (
                  <ActivityIndicator size="large" color={C.brand} style={{ margin: 10 }} />
                ) : loadingMoreDesigns ? (
                  <ActivityIndicator size="small" color={C.brand} style={{ margin: 10 }} />
                ) : null
              }
            />
          )}
        </View>
      </Modal>

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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="close" size={22} color={C.muted} style={{ marginRight: 4 }} />
                <Text style={styles.modalCloseText}>Close</Text>
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

      {getInqReport && (
        <View style={styles.detailOverlay123}>
          <View style={styles.detailContainer123}>
            <EnquiryReportScreen token={token} username={username} showInqReport={showInqReport} />
          </View>
        </View>
      )}
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
  scanBtnDash: {
    backgroundColor: '#ffba8981',
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowBtn,
    flexDirection: 'row',
    borderStyle: 'dashed',
    borderColor: C.brand,
    borderWidth: 1.5,
  },
  reportBtn: {
    backgroundColor: C.black,
    // borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    marginHorizontal: 5,
    ...shadowSoft,
  },
  scanBtnDisabled: {
    backgroundColor: '#C9C4BB',
    shadowOpacity: 0,
    elevation: 0,
  },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
  scanBtnTextDash: { color: C.brand, fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
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
    // color: C.ink,
    color: '#000',
    backgroundColor: C.surface,
  },
  textarea: { minHeight: 74, textAlignVertical: 'top', paddingTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfField: { flex: 1 },

  // Chips (only for designation, removed for units)
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

  cancelBtn: {
    backgroundColor: '#9ca3af',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    ...shadowSoft,
  },
  cancelBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

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
  dropdownTextDisabled: { color: C.muted, backgroundColor: '#f5f5f5' },
  dropdownArrow: { color: '#666', fontSize: 12 },
  dropdownModal: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 120, borderRadius: 12, maxHeight: 300, width: '80%', alignSelf: 'center', ...shadowSoft },
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
  designsTitle: { fontSize: 13, fontWeight: '700', color: C.body, flex: 1 },

  // Accordion show/hide + count button, sits above the design card(s), full width
  designAccordionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: C.brandSoft,
    borderWidth: 1,
    borderColor: C.brandBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  designAccordionText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.brandDark,
  },

  designCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    borderLeftColor: C.brand,
  },
  designCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  designCardBadge: {
    fontSize: 10.5,
    fontWeight: '800',
    color: C.brandDark,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.brandBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    overflow: 'hidden',
  },
  designFields: { marginTop: 4 },
  designFieldsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  designFieldLabel: { fontSize: 10, fontWeight: '600', color: C.muted, marginBottom: 4 },
  designFieldInput: {
    borderWidth: 1,
    borderColor: C.borderInput,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    backgroundColor: C.surface,
    color: '#000',
  },
  remarkInput: { minHeight: 34, color: '#000' },
  noDesignsText: { fontSize: 12, color: C.muted, textAlign: 'center', paddingVertical: 10 },
  noItemsText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 20 },

  // Add Design button (per item, appended below its design cards)
  addDesignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.brand,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 2,
    backgroundColor: '#fff',
  },
  addDesignBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },

  // Tab styles for small tabs inside item card
  tabContainerSmall: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.borderInput,
    borderRadius: 8,
    backgroundColor: C.surface,
    marginBottom: 8,
    padding: 2,
    alignSelf: 'flex-start',
  },
  tabContainerSmall1: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.borderInput,
    borderRadius: 8,
    backgroundColor: C.surface,
    marginBottom: 8,
    padding: 2,
    alignSelf: 'flex-start',
    flex: 1,
    width: '100%',
  },
  tabSmall: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  tabSmall1: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    width: '100%',
    alignContent: 'center',
  },
  activeTabSmall: {
    backgroundColor: C.brandSoft,
    borderColor: C.brand,
  },
  tabTextSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: C.body,
  },
  activeTabTextSmall: {
    color: C.brandDark,
    fontWeight: '700',
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
  cardActions: { flexDirection: 'row', justifyContent: 'space-around', width: '50%', marginTop: 10 },
  cardActionsNNN: { flexDirection: 'row', justifyContent: 'space-around', width: '50%', marginTop: 10, alignSelf: 'flex-end' },
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
  modalCloseText: { fontSize: 16, color: C.muted },

  // Disabled button style
  disabledBtn: {
    opacity: 0.6,
    borderColor: '#aaa',
  },

  // 🟢 Highlight scanned fields
  cardFilledInput: {
    backgroundColor: C.successBg,
    borderColor: C.successBorder,
  },
  detailOverlay123: {
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
  detailContainer123: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '100%',
    height: '100%',
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});