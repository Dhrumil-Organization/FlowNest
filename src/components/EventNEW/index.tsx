// index.tsx - S: design fields always visible, placeholder design if none exists
// NEW ERP UI: re-skinned to the NEW ERP theme (T tokens + shared erpUi kit).
//   Logic above the "Render functions" marker is unchanged from the legacy screen.
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
import Icon from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getEventYearNo } from './eventYear';
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
import { S, T } from '@/src/theme';
import {
  BusyOverlay,
  Btn,
  Card,
  CONTENT_MAX,
  EmptyState,
  IconBtn,
  PickField,
  ProgressBar,
  SearchBox,
  SectionHead,
  Segment,
  Sheet,
  pct,
  useSotLayout,
} from '@/src/components/erpUi';
import { CardTile, DashedBtn, FormField, LinkBtn, ModalPanel, OptionRow, Tag } from './ui';

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
        startSyncQueue(token, await getEventYearNo(), getUserPrptype, handleSyncProgress);
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
          const result = await syncShowEnquiries(id, token, await getEventYearNo(), user_prptype);
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
          const yearno = await getEventYearNo();
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
          const yearno = await getEventYearNo();
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
          const yearno = await getEventYearNo();
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
          const yearno = await getEventYearNo();
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
          const yearno = await getEventYearNo();
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
          const yearno = await getEventYearNo();
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
          const yearno = await getEventYearNo();
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

  // Screen open -> Event + Property APIs (same calls as the legacy Event screen).
  // NEW ERP: ErpSessionGate gives the token on the FIRST render, while
  // user_prptype is still being read from storage — so this must also run when
  // the prptype arrives (the old `[token]`-only dependency skipped the calls).
  // Runs once per token + prptype; the session gate remounts the screen on a
  // new login / property switch, which loads fresh again.
  const initialLoadKey = useRef('');
  useEffect(() => {
    if (!token || !getUserPrptypeFromCache) return;
    const key = `${token}|${getUserPrptypeFromCache}`;
    if (initialLoadKey.current === key) return;
    initialLoadKey.current = key;
    loadEvent(getUserPrptypeFromCache);
    loadPrp(getUserPrptypeFromCache);
  }, [token, getUserPrptypeFromCache, loadEvent, loadPrp]);

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
        await updateEnquiries(payload?.id, token, await getEventYearNo(), getUserPrptype, payload);
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
        void getEventYearNo().then((yearno) => startSyncQueue(getToken, yearno, getUserPrptype, syncCallback));
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
  // ===== NEW ERP UI (presentation only) — every handler below is the
  // original one, called with the original arguments. =====
  const { isPhone, gutter, width: screenW } = useSotLayout();
  const twoCol = screenW >= 1024;
  const wideForm = !isPhone;
  const selectedEventName = EVENTS.find(e => e.EventId === eventCode)?.EventName || '';
  const selectedPrpName = PRPS.find(e => e.code === getUserPrptype)?.name || '';
  // S items always show at least one design slot (blank placeholder), so count it.
  const designCountAll = selectedItems.reduce((n, it) => n + ((it.designs && it.designs.length) || 1), 0);

  // Same statements as the original item modal's close button / onRequestClose.
  const closeItemModal = () => {
    setItemModalVisible(false);
    setEditingItemIndex(null);
  };
  // Same statements as the original design modal's close button / onRequestClose.
  const closeDesignModal = () => {
    setDesignModalVisible(false);
    setEditingDesignItemIndex(null);
    setEditingDesignIndex(null);
    setDesignSearchQuery('');
    setDisplayedDesigns([]);
    setHasMore(false);
    setAllDesigns([]);
  };

  const renderQtyRow = (
    qty: string,
    rate: string,
    unit: string,
    remark: string,
    onQty: (t: string) => void,
    onRate: (t: string) => void,
    onUnit: (t: string) => void,
    onRemark: (t: string) => void,
  ) => (
    <View style={[styles.qtyGrid, wideForm && { flexWrap: 'nowrap' }]}>
      <View style={styles.qtyCell}>
        <FormField compact label="Qty" value={qty} onChangeText={onQty} keyboardType="numeric" placeholder="0" />
      </View>
      <View style={styles.qtyCell}>
        <FormField compact label="Rate" value={rate} onChangeText={onRate} keyboardType="numeric" placeholder="0" />
      </View>
      <View style={[styles.qtyCell, { flex: 0.8 }]}>
        <FormField compact label="Unit" value={unit} onChangeText={onUnit} placeholder="" />
      </View>
      <View style={[wideForm ? { flex: 2.2, minWidth: 0 } : { width: '100%' }]}>
        <FormField
          compact
          label="Remark / Color Requirements"
          value={remark}
          onChangeText={onRemark}
          placeholder="Optional remark"
        />
      </View>
    </View>
  );

  const renderItemCard = (item, itemIndex) => {
    const isPrptypeS = getUserPrptype === 'S';
    const designsShown = item.designs && item.designs.length > 0 ? item.designs.length : 1;

    return (
      <View key={itemIndex} style={styles.itemCard}>
        <View style={styles.itemHead}>
          <View style={styles.itemNo}>
            <Text style={styles.itemNoText}>{itemIndex + 1}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.itemEyebrow}>
              ITEM {itemIndex + 1}
              {isPrptypeS ? ` · ${designsShown} DESIGN${designsShown > 1 ? 'S' : ''}` : ''}
            </Text>
            <Text style={[styles.itemTitle, !item.item_name && { color: T.muted }]} numberOfLines={1}>
              {item.item_name || (item.is_new_item ? 'New item' : 'No item selected')}
            </Text>
          </View>
          {!isPrptypeS && item.is_new_item ? <Tag label="New" tone="green" /> : null}
          <IconBtn icon="delete" tone="danger" color={T.red} label="Remove item" onPress={() => removeItem(itemIndex)} />
        </View>

        <View style={styles.itemBody}>
          {isPrptypeS ? (
            <PickField
              label="Item"
              icon="inventory-2"
              value={item.item_name}
              placeholder="Select Item"
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
            />
          ) : (
            <View style={{ gap: 10 }}>
              <Segment
                value={item.is_new_item ? 'New' : 'Existing'}
                options={[
                  { value: 'Existing', label: 'Existing', icon: 'inventory-2' },
                  { value: 'New', label: 'New', icon: 'add-circle-outline' },
                ]}
                onChange={(v) => toggleItemTab(itemIndex, v as 'Existing' | 'New')}
              />
              {item.is_new_item ? (
                <FormField
                  label="Item Name"
                  required
                  placeholder="Enter item name"
                  value={item.item_name}
                  onChangeText={(text) => updateItemField(itemIndex, 'item_name', text)}
                />
              ) : (
                <PickField
                  label="Item"
                  icon="inventory-2"
                  value={item.item_name}
                  placeholder="Select Item"
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
                />
              )}
            </View>
          )}

          {!isPrptypeS &&
            renderQtyRow(
              item.item_qty,
              item.item_rate,
              item.item_unit,
              item.item_remark,
              (text) => updateItemField(itemIndex, 'item_qty', text),
              (text) => updateItemField(itemIndex, 'item_rate', text),
              (text) => updateItemField(itemIndex, 'item_unit', text),
              (text) => updateItemField(itemIndex, 'item_remark', text),
            )}

          {isPrptypeS && (
            <View style={styles.designsContainer}>
              <View style={styles.designsHeader}>
                <Text style={styles.designsTitle} numberOfLines={1}>
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
                  accessibilityRole="button"
                >
                  <Icon name="layers" size={16} color={T.copper} />
                  <Text style={styles.designAccordionText}>{item.designs.length} Designs</Text>
                  <Text style={styles.designAccordionHint}>{isDesignsExpanded(itemIndex) ? 'Hide' : 'Show'}</Text>
                  <Icon
                    name={isDesignsExpanded(itemIndex) ? 'expand-less' : 'expand-more'}
                    size={22}
                    color={T.nav}
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
                        <Tag label={`Design ${designIndex + 1}`} />
                        <View style={{ flex: 1 }} />
                        {designIndex > 0 && (
                          <TouchableOpacity
                            onPress={() => removeDesignRow(itemIndex, designIndex)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.designRemove}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove design ${designIndex + 1}`}
                          >
                            <Icon name="close" size={16} color={T.red} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Per-design Existing/New tab */}
                      <Segment
                        value={modeForThisDesign === 'New' ? 'New' : 'Existing'}
                        options={[
                          { value: 'Existing', label: 'Existing', icon: 'style' },
                          { value: 'New', label: 'New', icon: 'add-circle-outline' },
                        ]}
                        onChange={(v) => toggleDesignMode(itemIndex, designIndex, v as 'Existing' | 'New')}
                      />

                      {/* Design selection or name input based on mode */}
                      {modeForThisDesign === 'Existing' ? (
                        <PickField
                          label="Design"
                          icon="style"
                          value={displayDesign.dsn_name}
                          placeholder="Select Design"
                          // onPress={() => openDesignModalForItem(itemIndex, designIndex)}
                          onPress={() => id ? openDesignModalForItem(itemIndex, designIndex) : openDesignModalForItem123(itemIndex, designIndex)}
                        />
                      ) : (
                        // New mode: inline text field for design name
                        <FormField
                          label="Design Name"
                          required
                          placeholder="Enter design name"
                          value={displayDesign.dsn_name}
                          onChangeText={(text) => updateDesignField(itemIndex, designIndex, 'dsn_name', text)}
                        />
                      )}

                      {/* Design fields: Qty, Rate & Unit share one compact row, Remark below */}
                      {renderQtyRow(
                        displayDesign.dsn_qty,
                        displayDesign.dsn_rate,
                        displayDesign.unit,
                        displayDesign.remark,
                        (text) => updateDesignField(itemIndex, designIndex, 'dsn_qty', text),
                        (text) => updateDesignField(itemIndex, designIndex, 'dsn_rate', text),
                        (text) => updateDesignField(itemIndex, designIndex, 'unit', text),
                        (text) => updateDesignField(itemIndex, designIndex, 'remark', text),
                      )}
                    </View>
                  );
                })
              )}

              {/* Add Design – appends another design row to THIS item */}
              <DashedBtn
                label="Add Design"
                onPress={() => addDesignRow(itemIndex)}
                disabled={isAddDesignDisabledForItem(itemIndex)}
              />
            </View>
          )}
        </View>
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
      <View style={styles.section}>
        <SectionHead
          title="Items"
          meta={
            selectedItems.length
              ? `${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}${isPrptypeS ? ` · ${designCountAll} design${designCountAll === 1 ? '' : 's'}` : ''}`
              : 'Add what the party is asking for'
          }
        />

        {/* Selected Items List */}
        {selectedItems.map((item, index) => renderItemCard(item, index))}

        {selectedItems.length === 0 && (
          <View style={styles.noItems}>
            <Icon name="inventory-2" size={22} color={T.copper} />
            <Text style={styles.noItemsText}>No items added. Tap "Add Item" to start.</Text>
          </View>
        )}

        {/* Add Item Button */}
        <DashedBtn
          label="Add New Item"
          onPress={isPrptypeS ? addBlankItemForS : addBlankItem}
          disabled={isAddDisabled}
        />
        {isAddDisabled ? (
          <Text style={styles.addHint}>
            {isPrptypeS ? 'Fill design name and qty of every design to add another item.' : 'Fill item name and qty to add another item.'}
          </Text>
        ) : null}
      </View>
    );
  };

  // --- Visiting-card capture block (all stages) ---
  const renderStageHead = (title: string, onClose: () => void) => (
    <View style={styles.stageHead}>
      <View style={styles.stageIcon}>
        <Icon name="credit-card" size={18} color={T.copper} />
      </View>
      <Text style={styles.stageTitle} numberOfLines={1}>{title}</Text>
      <IconBtn icon="close" label="Cancel" onPress={onClose} disabled={scanning} />
    </View>
  );

  const renderProcessing = () =>
    scanning ? (
      <View style={styles.processing}>
        <ActivityIndicator color={T.copper} />
        <Text style={styles.processingText}>Processing card... Please wait</Text>
      </View>
    ) : null;

  const renderScanBlock = () => (
    <Card style={styles.block}>
      {cardCaptureStage === null && (
        <>
          <View style={styles.blockHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.eyebrow}>VISITING CARD</Text>
              <Text style={styles.blockTitle}>Scan visiting card (optional)</Text>
            </View>
            {scannedFromCard ? <Tag label="Scanned" tone="green" /> : null}
          </View>
          <View style={[styles.scanRow, isPhone && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <Btn
              label="Scan visiting card"
              icon="photo-camera"
              kind="copper"
              onPress={() => handleScanCard()}
              disabled={!online || scanning}
              loading={scanning}
              style={isPhone ? null : { flex: 1 }}
            />
            <View style={[styles.orWrap, isPhone && { flexDirection: 'row' }]}>
              {isPhone ? <View style={styles.orLine} /> : null}
              <Text style={styles.orText}>OR</Text>
              {isPhone ? <View style={styles.orLine} /> : null}
            </View>
            <Btn
              label="Upload Card"
              icon="file-upload"
              kind="ghost"
              onPress={() => handleUploadCard()}
              style={[isPhone ? null : { flex: 1 }, (!online || scanning) && { opacity: 0.55 }]}
            />
          </View>
          <View style={[styles.hintRow, !online && { backgroundColor: `${T.red}0D`, borderColor: `${T.red}30` }]}>
            <Icon name={online ? 'auto-awesome' : 'wifi-off'} size={15} color={online ? T.copper : T.red} />
            <Text style={styles.scanHint}>
              {online
                ? 'Captures name, address, mobile, email, company & GSTIN automatically. Needs internet.'
                : "No internet — card scan is unavailable. Type details below."}
            </Text>
          </View>
        </>
      )}

      {cardCaptureStage === 'front_preview' && (
        <View>
          {renderStageHead('Front Side Captured', handleCancelCardCapture)}
          <Image source={{ uri: pendingFrontUri }} style={styles.cardImage} resizeMode="contain" />
          <Text style={styles.stageQuestion}>Would you like to scan the back side?</Text>
          <View style={styles.stageBtns}>
            <Btn label="Skip" kind="ghost" onPress={handleSkipBackSide} disabled={scanning} loading={scanning} style={styles.stageBtn} />
            <Btn
              label="Scan Back"
              icon="photo-camera"
              onPress={handleScanBackSide}
              disabled={capturingBack || scanning}
              loading={capturingBack}
              style={styles.stageBtn}
            />
          </View>
          {renderProcessing()}
        </View>
      )}

      {cardCaptureStage === 'both_preview' && (
        <View>
          {renderStageHead('Front + Back Captured', handleCancelCardCapture)}
          <View style={styles.previewPair}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSideLabel}>Front</Text>
              <Image source={{ uri: pendingFrontUri }} style={styles.cardImage} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSideLabel}>Back</Text>
              <Image source={{ uri: pendingBackUri }} style={styles.cardImage} resizeMode="contain" />
            </View>
          </View>
          <View style={styles.stageBtns}>
            <Btn
              label="Retake Back"
              icon="replay"
              kind="ghost"
              onPress={handleRetakeBackSide}
              disabled={capturingBack || scanning}
              loading={capturingBack}
              style={styles.stageBtn}
            />
            <Btn
              label="Confirm & Process"
              icon="document-scanner"
              onPress={handleConfirmAndProcess}
              disabled={scanning}
              loading={scanning}
              style={styles.stageBtn}
            />
          </View>
          {renderProcessing()}
        </View>
      )}

      {uploadStage === 'front_preview' && (
        <View>
          {renderStageHead('Front Image Picked', () => { setUploadStage(null); setPendingFrontUpload(null); })}
          <Image source={{ uri: pendingFrontUpload }} style={styles.cardImage} resizeMode="contain" />
          <Text style={styles.stageQuestion}>Would you like to pick the back side?</Text>
          <View style={styles.stageBtns}>
            <Btn label="Skip" kind="ghost" onPress={handleUploadSkipBack} disabled={scanning} style={styles.stageBtn} />
            <Btn label="Upload Back" icon="file-upload" onPress={handleUploadBack} disabled={scanning} style={styles.stageBtn} />
          </View>
          {renderProcessing()}
        </View>
      )}

      {uploadStage === 'both_preview' && (
        <View>
          {renderStageHead('Front + Back Picked', () => { setUploadStage(null); setPendingFrontUpload(null); setPendingBackUpload(null); })}
          <View style={styles.previewPair}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSideLabel}>Front</Text>
              <Image source={{ uri: pendingFrontUpload }} style={styles.cardImage} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSideLabel}>Back</Text>
              <Image source={{ uri: pendingBackUpload }} style={styles.cardImage} resizeMode="contain" />
            </View>
          </View>
          <View style={styles.stageBtns}>
            <Btn label="Retake Back" icon="replay" kind="ghost" onPress={handleUploadRetakeBack} disabled={scanning} style={styles.stageBtn} />
            <Btn
              label="Confirm & Process"
              icon="document-scanner"
              onPress={handleUploadConfirm}
              disabled={scanning}
              loading={scanning}
              style={styles.stageBtn}
            />
          </View>
          {renderProcessing()}
        </View>
      )}
    </Card>
  );

  const fieldW = wideForm ? styles.fieldHalf : styles.fieldFull;

  const renderPartyBlock = () => (
    <Card style={styles.block}>
      <SectionHead
        title="Party details"
        meta={scannedFromCard ? 'Filled from the visiting card — please check before saving' : 'Who you met at the stall'}
      />
      <View style={styles.formGrid}>
        <FormField
          style={styles.fieldFull}
          label="Party name"
          required
          highlight={!!cardFields.party_name}
          placeholder="Company / party"
          value={partyName}
          onChangeText={setPartyName}
        />
        <FormField
          style={styles.fieldFull}
          label="Address"
          highlight={!!cardFields.address}
          placeholder="Street, city, state"
          value={address}
          onChangeText={setAddress}
          multiline
        />
        <FormField
          style={fieldW}
          label="GST no. (optional)"
          highlight={!!cardFields.gst_no}
          placeholder="24XXXXXXXXXXXZ5"
          value={gstNo}
          onChangeText={setGstNo}
          autoCapitalize="characters"
        />
        <FormField
          style={fieldW}
          label="Contact name"
          highlight={!!cardFields.contact_name}
          placeholder="Person met at the stall"
          value={contactName}
          onChangeText={setContactName}
        />
        <FormField
          style={fieldW}
          label="Designation"
          highlight={!!cardFields.designation}
          placeholder="Designation"
          value={designation}
          onChangeText={setDesignation}
        />
        <FormField
          style={fieldW}
          label="Mobile"
          required
          highlight={!!cardFields.mobile}
          placeholder="98XXXXXXXX"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
        />
        <FormField
          style={styles.fieldFull}
          label="Email"
          required
          highlight={!!cardFields.email}
          placeholder="email@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
    </Card>
  );

  const renderEventBlock = () => (
    <Card style={styles.block}>
      <SectionHead title="Event & property" meta={mode === 'edit' ? 'Property is locked while editing' : undefined} />
      <View style={styles.formGrid}>
        <PickField
          style={fieldW}
          label="Property"
          icon="business"
          value={selectedPrpName}
          placeholder="Select Property"
          onPress={() => setPrpModalVisible(true)}
          disabled={mode === 'edit'}
        />
        <PickField
          style={fieldW}
          label="Event"
          icon="event"
          value={selectedEventName}
          placeholder="Select Event"
          onPress={() => setEventModalVisible(true)}
        />
      </View>
    </Card>
  );

  const renderCardPreview = () => (
    <>
      {(front_img || backUri) && online && (
        <Card style={styles.block}>
          <SectionHead title="Card Preview" meta="Images saved with this enquiry" />
          <View style={styles.cardRow}>
            <CardTile label="Front" source={{ uri: front_img, headers: { Connection: 'close' } }} />
            <CardTile
              label="Back"
              source={backUri ? { uri: getImageUri(backUri) } : null}
              emptyLabel="Upload Back"
              onEmptyPress={handleUploadBackSide}
            >
              {backUri ? (
                <>
                  <LinkBtn label="Replace" icon="swap-horiz" onPress={handleUploadBackSide} />
                  <LinkBtn label="Remove" icon="delete-outline" danger onPress={() => setBackUri('')} />
                </>
              ) : null}
            </CardTile>
          </View>
        </Card>
      )}

      {!online && (
        <Card style={styles.block}>
          <SectionHead title="Card Preview (Offline)" meta="Attach photos now — they upload when you're back online" />
          <View style={styles.cardRow}>
            <CardTile
              label="Front"
              source={front_off_Uri ? { uri: getImageUri(front_off_Uri) } : null}
              emptyLabel="Upload Front"
              onEmptyPress={handleUploadFront_off_Side}
            >
              {front_off_Uri ? (
                <>
                  <LinkBtn label="Replace" icon="swap-horiz" onPress={handleUploadFront_off_Side} />
                  <LinkBtn label="Remove" icon="delete-outline" danger onPress={() => setFront_off_Uri('')} />
                </>
              ) : null}
            </CardTile>
            <CardTile
              label="Back"
              source={backUri ? { uri: getImageUri(backUri) } : null}
              emptyLabel="Upload Back"
              onEmptyPress={handleUploadBackSide}
            >
              {backUri ? (
                <>
                  <LinkBtn label="Replace" icon="swap-horiz" onPress={handleUploadBackSide} />
                  <LinkBtn label="Remove" icon="delete-outline" danger onPress={() => setBackUri('')} />
                </>
              ) : null}
            </CardTile>
          </View>
        </Card>
      )}
    </>
  );

  // Connectivity chip: in the toolbar, or in the page header on a phone in edit mode (toolbar holds 2 buttons).
  const chipInBar = !(isPhone && id);
  const netChip = (
    <View
      style={[styles.netChip, { backgroundColor: `${online ? T.green : T.red}12`, borderColor: `${online ? T.green : T.red}40` }]}
      accessibilityLabel={online ? 'Online — card scan available' : 'Offline — saving locally, will sync later'}
    >
      <View style={[styles.netDot, { backgroundColor: online ? T.green : T.red }]} />
      <Text style={[styles.netText, { color: online ? T.green : T.red }]} numberOfLines={1}>
        {isPhone
          ? (online ? 'Online' : 'Offline')
          : (online ? 'Online — card scan available' : 'Offline — saving locally, will sync later')}
      </Text>
    </View>
  );

  const syncTone = syncStatus.isSyncing ? T.blue : syncStatus.failed > 0 ? T.red : T.green;

  // --- Main render ---
  return (
    <View style={styles.root}>
      {/* Status + actions toolbar (the global AppHeader already shows "Event") */}
      <View style={styles.topBar}>
        <View style={[styles.topInner, { paddingHorizontal: gutter }]}>
          {chipInBar ? netChip : null}
          {chipInBar ? <View style={{ flex: 1 }} /> : null}
          {id && (
            <Btn
              label="Add Enquiry"
              icon="add"
              kind="ghost"
              compact
              style={chipInBar ? null : { flex: 1 }}
              // onPress={() => router.push({ pathname: '/EnquiryReportScreen' })}
              onPress={() => {
                setMode('added');
                initializeDefaultItems();
              }}
            />
          )}
          <Btn
            label="Show Report"
            icon="insights"
            compact
            style={chipInBar ? null : { flex: 1 }}
            // onPress={() => router.push({ pathname: '/EnquiryReportScreen' })}
            onPress={() => {
              showInqReport(true);
            }}
          />
        </View>
      </View>

      {syncStatus.visible && (
        <View style={[styles.bannerWrap, { paddingHorizontal: gutter }]}>
          <TouchableOpacity
            style={[styles.syncBanner, { backgroundColor: `${syncTone}0F`, borderColor: `${syncTone}40` }]}
            onPress={showFailedItems}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <View style={[styles.syncBannerIcon, { backgroundColor: `${syncTone}1A` }]}>
              {syncStatus.isSyncing ? (
                <ActivityIndicator size="small" color={syncTone} />
              ) : (
                <Icon name={syncStatus.failed > 0 ? 'warning-amber' : 'check-circle'} size={20} color={syncTone} />
              )}
            </View>
            <View style={styles.syncBannerContent}>
              <Text style={styles.syncBannerText}>{syncStatus.message}</Text>
              {syncStatus.isSyncing && (
                <View style={styles.syncRow}>
                  <Text style={styles.syncDetailText} numberOfLines={1}>
                    {syncStatus.currentItemName
                      ? `Syncing: ${syncStatus.currentItemName}`
                      : `Progress: ${syncStatus.synced + syncStatus.failed}/${syncStatus.total}`
                    }
                  </Text>
                  <TouchableOpacity onPress={abortSync} style={styles.cancelSyncBtn} accessibilityRole="button">
                    <Icon name="stop-circle" size={14} color={T.red} />
                    <Text style={styles.cancelSyncText}>Cancel Sync</Text>
                  </TouchableOpacity>
                </View>
              )}
              {syncStatus.isSyncing && syncStatus.total > 0 ? (
                <View style={{ marginTop: 8 }}>
                  <ProgressBar value={pct(syncStatus.synced + syncStatus.failed, syncStatus.total)} color={T.blue} />
                </View>
              ) : null}
              {!syncStatus.isSyncing && syncStatus.failed > 0 && (
                <View style={styles.bannerActions}>
                  <View style={styles.tapHint}>
                    <Icon name="touch-app" size={15} color={T.muted} />
                    <Text style={styles.bannerTapHint}>Tap to see failed items</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      void getEventYearNo().then((yearno) => startSyncQueue(token, yearno, getUserPrptype, handleSyncProgress));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Retry All"
                  >
                    <Icon name="refresh" size={15} color="#fff" />
                    <Text style={styles.retryText}>Retry All</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.eyebrow}>EVENT ENQUIRY</Text>
              <Text style={styles.pageTitle} numberOfLines={1}>
                {mode === 'edit' ? 'Edit enquiry' : 'New enquiry'}
              </Text>
              {(selectedEventName || selectedPrpName) ? (
                <Text style={styles.pageSub} numberOfLines={1}>
                  {[selectedEventName, selectedPrpName].filter(Boolean).join('  ·  ')}
                </Text>
              ) : null}
            </View>
            {mode === 'edit' && enquiries?.id ? <Tag label={`#${enquiries.id}`} tone="blue" /> : null}
            {!chipInBar ? netChip : null}
          </View>

          <View style={twoCol ? styles.cols : styles.stack}>
            <View style={twoCol ? styles.colLeft : styles.stack}>
              {renderScanBlock()}
              {renderEventBlock()}
              {renderPartyBlock()}
            </View>
            <View style={twoCol ? styles.colRight : styles.stack}>
              {renderItemsSection()}
              {renderCardPreview()}
            </View>
          </View>
        </ScrollView>

        {/* Sticky save bar */}
        <View style={styles.saveBar}>
          <View style={[styles.saveInner, { paddingHorizontal: gutter }]}>
            {!isPhone ? (
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.saveTitle} numberOfLines={1}>{partyName || 'Unnamed party'}</Text>
                <Text style={styles.saveMeta} numberOfLines={1}>
                  {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}
                  {getUserPrptype === 'S' ? ` · ${designCountAll} design${designCountAll === 1 ? '' : 's'}` : ''}
                  {online ? ' · syncs to server on save' : ' · offline: saved on this device'}
                </Text>
              </View>
            ) : null}
            <Btn
              label={mode === 'edit' ? 'Update enquiry' : 'Save enquiry'}
              icon={mode === 'edit' ? 'save' : 'check'}
              onPress={() => handleSave(mode)}
              loading={saving}
              style={isPhone ? { flex: 1 } : { minWidth: 220 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <Sheet
        open={prpModalVisible}
        onClose={() => setPrpModalVisible(false)}
        eyebrow="PROPERTY"
        title="Select Property"
        wideMax={460}
      >
        {PRPS.map((item) => (
          <React.Fragment key={String(item.code)}>
          <OptionRow
            label={item.name}
            icon="business"
            selected={item.code === getUserPrptype}
            onPress={() => {
              setPrpCode(item.code);
              setPrpModalVisible(false);
            }}
          />
          </React.Fragment>
        ))}
      </Sheet>

      <Sheet
        open={eventModalVisible}
        onClose={() => setEventModalVisible(false)}
        eyebrow="EVENT"
        title="Select Event"
        wideMax={460}
      >
        {EVENTS.map((item) => (
          <React.Fragment key={String(item.EventId)}>
          <OptionRow
            label={item.EventName}
            icon="event"
            selected={item.EventId === eventCode}
            onPress={() => {
              setEventCode(item.EventId);
              setEventModalVisible(false);
            }}
          />
          </React.Fragment>
        ))}
      </Sheet>

      <ModalPanel
        open={itemModalVisible}
        onClose={closeItemModal}
        eyebrow={editingItemIndex !== null ? `ITEM ${editingItemIndex + 1}` : 'ITEMS'}
        title="Select Item"
      >
        <View style={styles.modalSearch}>
          <SearchBox value={itemSearchQuery} onChangeText={setItemSearchQuery} placeholder="Search Items..." />
        </View>

        {loadingItems ? (
          <View style={styles.modalLoading}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={styles.modalLoadingText}>Loading items...</Text>
          </View>
        ) : (
          <FlatList
            data={displayedItems}
            keyExtractor={(item) => String(item.dsn_code)}
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const alreadyAdded = selectedItems.some(
                i => String(i.item_code) === String(item.dsn_code) && !i.is_new_item
              );
              return (
                <View style={{ paddingBottom: 8 }}>
                  <OptionRow
                    label={item.name}
                    sub={`Code ${item.dsn_code}${item.UOM ? ` · ${item.UOM}` : ''}`}
                    icon="inventory-2"
                    done={alreadyAdded}
                    onPress={() => {
                      if (editingItemIndex === null) return;
                      addItemToCard(item, editingItemIndex);
                    }}
                  />
                </View>
              );
            }}
            ListEmptyComponent={<EmptyState icon="inventory-2" title="No items found" text="Try a different name or code." />}
            onEndReached={loadMoreItems}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingItems ? (
                <ActivityIndicator size="large" color={T.copper} style={{ margin: 10 }} />
              ) : loadingMoreItems ? (
                <ActivityIndicator size="small" color={T.copper} style={{ margin: 10 }} />
              ) : null
            }
          />
        )}
      </ModalPanel>

      <ModalPanel
        open={designModalVisible}
        onClose={closeDesignModal}
        eyebrow={
          editingDesignItemIndex !== null && selectedItems[editingDesignItemIndex]?.item_name
            ? `DESIGNS · ${String(selectedItems[editingDesignItemIndex]?.item_name).toUpperCase()}`
            : 'DESIGNS'
        }
        title="Select Design"
      >
        <View style={styles.modalSearch}>
          <SearchBox value={designSearchQuery} onChangeText={setDesignSearchQuery} placeholder="Search Designs..." />
        </View>

        {loadingDesigns ? (
          <View style={styles.modalLoading}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={styles.modalLoadingText}>Loading designs...</Text>
          </View>
        ) : (
          <FlatList
            data={displayedDesigns}
            keyExtractor={(item, index) => `${item.dsn_code}_${index}`}
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const alreadyAdded = editingDesignItemIndex !== null
                ? (selectedItems[editingDesignItemIndex]?.designs || []).some(
                  d => String(d.dsn_code) === String(item.dsn_code) && !d.is_new
                )
                : false;
              return (
                <View style={{ paddingBottom: 8 }}>
                  <OptionRow
                    label={item.name}
                    sub={`Code ${item.dsn_code}`}
                    icon="style"
                    done={alreadyAdded}
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
                  />
                </View>
              );
            }}
            onEndReached={loadMoreDesigns}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <EmptyState
                icon="style"
                title="No designs found for this item"
                text="Pick an item first, or switch this design to “New” and type its name."
              />
            }
            ListFooterComponent={
              loadingDesigns ? (
                <ActivityIndicator size="large" color={T.copper} style={{ margin: 10 }} />
              ) : loadingMoreDesigns ? (
                <ActivityIndicator size="small" color={T.copper} style={{ margin: 10 }} />
              ) : null
            }
          />
        )}
      </ModalPanel>

      <Sheet
        open={failedItemsModalVisible}
        onClose={() => setFailedItemsModalVisible(false)}
        eyebrow="SYNC"
        title="Failed Sync Items"
        footer={
          <>
            <Btn label="Close" kind="ghost" onPress={() => setFailedItemsModalVisible(false)} style={{ flex: 1 }} />
            <Btn
              label="Retry All Failed"
              icon="refresh"
              onPress={() => {
                setFailedItemsModalVisible(false);
                void getEventYearNo().then((yearno) => startSyncQueue(token, yearno, getUserPrptype, handleSyncProgress));
              }}
              style={{ flex: 1.4 }}
            />
          </>
        }
      >
        {failedItemsList.length === 0 ? (
          <EmptyState icon="cloud-done" title="No failed items to show" />
        ) : (
          failedItemsList.map((item, index) => (
            <View key={item.local_id || index.toString()} style={styles.failedItemCard}>
              <View style={styles.failedHead}>
                <Icon name="cancel" size={18} color={T.red} />
                <Text style={styles.failedItemName} numberOfLines={2}>{item.party_name || 'Unknown Party'}</Text>
              </View>
              <Text style={styles.failedItemId}>ID: {item.local_id || 'N/A'}</Text>
              <Text style={styles.failedItemError}>
                Error: {typeof item.error === 'string' ? item.error : JSON.stringify(item.error || 'Unknown error')}
              </Text>
            </View>
          ))
        )}
      </Sheet>

      <ModalPanel
        open={debugModalVisible}
        onClose={() => setDebugModalVisible(false)}
        eyebrow="DEBUG"
        title="Local Enquiries"
      >
        {debugData.length === 0 ? (
          <EmptyState icon="storage" title="No local data" />
        ) : (
          <FlatList
            data={debugData}
            keyExtractor={(item) => item.local_id}
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <View style={styles.debugCard}>
                <Text style={styles.debugTitle}>{item.party_name || 'No name'}</Text>
                <Text style={styles.debugMeta}>
                  local_id: {item.local_id} | server_id: {item.server_id || '—'}
                </Text>
                <Text style={styles.debugMeta}>
                  sync: {item.sync_status} | event_code: {item.event_code || '—'}
                </Text>
                <Text style={styles.debugMeta}>
                  created: {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            )}
          />
        )}
      </ModalPanel>

      <BusyOverlay visible={loading} text="Loading…" />

      {getInqReport && (
        <View style={styles.reportPanel}>
          <EnquiryReportScreen token={token} username={username} showInqReport={showInqReport} />
        </View>
      )}
    </View>
  );
}

// ─── STYLES (NEW ERP tokens) ───────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  screen: { flex: 1, backgroundColor: T.bg },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    alignSelf: 'center',
    paddingTop: 14,
    paddingBottom: 28,
  },

  // toolbar
  topBar: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  topInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    width: '100%',
    maxWidth: CONTENT_MAX,
    alignSelf: 'center',
  },
  netChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  netDot: { width: 8, height: 8, borderRadius: 4 },
  netText: { fontSize: 12, fontWeight: '800', flexShrink: 1 },

  // sync banner
  bannerWrap: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', paddingTop: 10 },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  syncBannerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  syncBannerContent: { flex: 1, minWidth: 0 },
  syncBannerText: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  syncDetailText: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: T.muted },
  cancelSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${T.red}40`,
    backgroundColor: T.surface,
  },
  cancelSyncText: { color: T.red, fontSize: 12, fontWeight: '800' },
  bannerActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 10 },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bannerTapHint: { fontSize: 12, fontWeight: '600', color: T.muted },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: T.nav,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },

  // page
  pageHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: T.nav, marginTop: 2 },
  pageSub: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
  cols: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  colLeft: { flex: 5, minWidth: 0, gap: 14 },
  colRight: { flex: 6, minWidth: 0, gap: 14 },
  stack: { gap: 14 },
  block: { gap: 12 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockTitle: { fontSize: 15, fontWeight: '800', color: T.ink, marginTop: 2 },
  section: { gap: 10 },

  // form grid
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fieldFull: { width: '100%' },
  fieldHalf: { flexGrow: 1, flexBasis: '40%', minWidth: 200 },

  // scan block
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orWrap: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  orLine: { flex: 1, height: 1, backgroundColor: T.border },
  orText: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 1 },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.hair,
    backgroundColor: T.sub,
  },
  scanHint: { flex: 1, fontSize: 12, lineHeight: 17, color: T.muted, fontWeight: '600' },
  stageHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stageIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.copper}16`,
  },
  stageTitle: { flex: 1, fontSize: 14.5, fontWeight: '800', color: T.ink },
  stageQuestion: { fontSize: 13, fontWeight: '700', color: T.nav, textAlign: 'center', marginTop: 12 },
  stageBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  stageBtn: { flexGrow: 1, flexBasis: 190 },
  previewPair: { flexDirection: 'row', gap: 10 },
  processing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  processingText: { fontSize: 12.5, fontWeight: '700', color: T.muted },
  cardSideLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: T.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardImage: { width: '100%', height: 170, borderRadius: 10, backgroundColor: T.alt },
  cardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // items
  itemCard: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: T.sub,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  itemNo: { width: 30, height: 30, borderRadius: 9, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  itemNoText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  itemEyebrow: { fontSize: 9.5, fontWeight: '800', color: T.copper, letterSpacing: 1 },
  itemTitle: { fontSize: 14, fontWeight: '800', color: T.ink, marginTop: 1 },
  itemBody: { padding: 12, gap: 12 },
  qtyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qtyCell: { flex: 1, minWidth: 0 },
  designsContainer: { gap: 10 },
  designsHeader: { flexDirection: 'row', alignItems: 'center' },
  designsTitle: { flex: 1, fontSize: 11, fontWeight: '900', color: T.nav, letterSpacing: 0.8, textTransform: 'uppercase' },
  designAccordionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${T.copper}40`,
    backgroundColor: `${T.copper}0D`,
  },
  designAccordionText: { flex: 1, fontSize: 13, fontWeight: '800', color: T.nav },
  designAccordionHint: { fontSize: 11.5, fontWeight: '700', color: T.muted },
  designCard: {
    backgroundColor: T.sub,
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: T.border,
    borderLeftWidth: 3,
    borderLeftColor: T.copper,
  },
  designCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  designRemove: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${T.red}40`,
    backgroundColor: `${T.red}0D`,
  },
  noItems: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  noItemsText: { fontSize: 13, fontWeight: '600', color: T.muted, textAlign: 'center' },
  addHint: { fontSize: 11.5, fontWeight: '600', color: T.muted, textAlign: 'center' },

  // save bar
  saveBar: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  saveInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    width: '100%',
    maxWidth: CONTENT_MAX,
    alignSelf: 'center',
  },
  saveTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  saveMeta: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },

  // modals
  modalSearch: { padding: 12, paddingBottom: 6 },
  modalList: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 24 },
  modalLoading: { flex: 1, alignItems: 'center', paddingTop: 48, gap: 10 },
  modalLoadingText: { fontSize: 13, fontWeight: '700', color: T.muted },
  failedItemCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: `${T.red}30`,
    borderLeftWidth: 3,
    borderLeftColor: T.red,
  },
  failedHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  failedItemName: { flex: 1, fontSize: 14.5, fontWeight: '800', color: T.ink },
  failedItemId: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 3 },
  failedItemError: { fontSize: 12.5, fontWeight: '600', color: T.red, marginTop: 6 },
  debugCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  debugTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  debugMeta: { fontSize: 12, color: T.muted, marginTop: 2 },

  // report overlay (in-screen full panel)
  reportPanel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: T.bg,
    zIndex: 100,
    elevation: 10,
  },
});
