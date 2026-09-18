import AppAlert from '@/common/utils/appAlert';
/* CollectionCard.tsx — left-swipe preview + label-value single-line + full remark display */
import AsyncStorage from '@/common/utils/compatibleStorage';
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { API } from '../../common/API/dynamicAPI';
import Footer from '../../components/FooterNew';
import ChequePreviewModal, { SwipePreview } from './ChequePreview';

type POTItem = { [k: string]: any };
const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

const CollectionCard: React.FC<{
    gePOTData?: POTItem[] | null;
    searchQueryPOT?: string;
    getpayload?: any;
    token: string;
    onEdit?: (item: POTItem) => void;
    onAuthorize?: (item: POTItem) => Promise<void>;
    onPressItem?: (item: POTItem) => void;
    onDelete?: (item: POTItem) => void;
    setIsLoggedIn?: (value: boolean) => void;
    fromDate?: Date;
    toDate?: Date;
    hasDailyCollectionReport?: boolean;
}> = ({ gePOTData = [], searchQueryPOT = '', getpayload, token, onEdit, onAuthorize, onPressItem, onDelete, fromDate, toDate, hasDailyCollectionReport }) => {
    const router = useRouter();
    const [data, setData] = useState<POTItem[]>(Array.isArray(gePOTData) ? gePOTData : []);
    const [activeTab, setActiveTab] = useState<'pending' | 'authorised'>('pending');
    const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
    const [chequePreviewItem, setChequePreviewItem] = useState<POTItem | null>(null);
    const [stageModalVisible, setStageModalVisible] = useState(false);
    const [stageData, setStageData] = useState<{ stage: string; qty: string }[]>([]);
    const [loadingRowId, setLoadingRowId] = useState<string | null>(null);
    const [authModalVisible, setAuthModalVisible] = useState(false);
    const [authRemark, setAuthRemark] = useState('');
    const [authLoadingLocalId, setAuthLoadingLocalId] = useState<string | null>(null);
    const PAGE_SIZE = 5;
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    // 
    const { width: screenWidth } = useWindowDimensions();

    // 1 → phone | 2 → tablet | 3 → small desktop | 4 → wide desktop
    const numColumns =
        screenWidth >= 1400 ? 4 :
            screenWidth >= 1000 ? 3 :
                screenWidth >= 700 ? 2 :
                    1;

    const GRID_PAD = 12;
    const GRID_GAP = 12;
    const gridItemWidth =
        numColumns > 1
            ? (screenWidth - GRID_PAD * 2 - GRID_GAP * (numColumns - 1)) / numColumns
            : screenWidth;


    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [activeTab, searchQueryPOT]);


    console.log('is hasDailyCollectionReport:', hasDailyCollectionReport);



    useEffect(() => setData(Array.isArray(gePOTData) ? gePOTData : []), [gePOTData]);

    useEffect(() => {
        if (!searchQueryPOT?.trim()) { setData(Array.isArray(gePOTData) ? gePOTData : []); return; }
        const q = searchQueryPOT.toLowerCase();
        setData((gePOTData || []).filter(item => Object.values(item || {}).some(v => typeof v === 'string' && v.toLowerCase().includes(q))));
    }, [searchQueryPOT, gePOTData]);

    const safe = (v: any) => (v === null || v === undefined ? '' : String(v));
    const parseAmount = (val?: any) => {
        if (val === undefined || val === null || val === '') return 0;
        const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
        return isNaN(n) ? 0 : n;
    };
    const formatAmountDisplay = (val?: any) => {
        const n = parseAmount(val);
        if (n === 0 && (val === '' || val === undefined || val === null)) return '-';
        return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const formatDate = (d?: string) => {
        if (!d) return '-';
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
        if (/^\d{8}$/.test(d)) return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
        if (/^\d{4}-\d{2}-\d{2}/.test(d)) { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }
        const pd = new Date(d); if (!isNaN(pd.getTime())) { const dd = String(pd.getDate()).padStart(2, '0'); const mm = String(pd.getMonth() + 1).padStart(2, '0'); const yy = pd.getFullYear(); return `${dd}/${mm}/${yy}`; }
        return d;
    };

    const getToken = () => token;

    // show modal (called when user taps Authorize)
    const openAuthModal = (item: POTItem) => {
        setAuthRemark(''); // reset
        setAuthModalVisible(true);
        // cache selected item in state (we'll reuse `authTarget`)
        setAuthTarget(item);
    };
    const [authTarget, setAuthTarget] = useState<POTItem | null>(null);

    // invoked when user confirms in modal
    const confirmAuthorize = async () => {
        if (!authTarget) return;
        setAuthLoadingLocalId(safe(authTarget.UId ?? authTarget.uid ?? Math.random()));
        try {
            if (onAuthorize) {
                // parent will perform API and refresh; we await it
                await onAuthorize(authTarget, authRemark ?? '');
            } else {
                // fallback: notify user that the parent handler isn't set
                AppAlert.alert('Not configured', 'Authorize handler not provided.');
            }
            setAuthModalVisible(false);
        } catch (err) {
            console.error('authorize error', err);
            AppAlert.alert('Error', 'Could not authorize. Please try again.');
        } finally {
            setAuthLoadingLocalId(null);
        }
    };

    const fetchStagesForItem = async (item: POTItem) => {
        if (!item) return;
        setStageModalVisible(true);
        setStageData([]);
        setLoadingRowId(safe(item.UId ?? item.uid ?? Math.random()));
        try {
            const payloadArr = (getpayload as any[]) || [{}];
            const infoPayload = { ...payloadArr[0], rowdata: [item] };
            const headers = { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json', 'X-Requested-with': 'XMLHttpRequest' };
            // const response = await axios.post(`https://apig.tms-webapp.com/api/prodordertrack`, infoPayload, { headers });
            const response = await axios.post(`${API}/api/prodordertrack`, infoPayload, { headers });
            if (response?.data?.success && response.data.data) {
                const { data: respData, caption, stages } = response.data.data;
                const isValid = (v: any) => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && v === 0);
                const mapped = (stages || []).map((k: any) => {
                    const raw = respData?.[k];
                    if (!isValid(raw)) return null;
                    const qty = (typeof raw === 'number' || !isNaN(raw)) ? parseFloat(raw).toFixed(2) : String(raw);
                    return { stage: caption?.[k] ?? String(k), qty };
                }).filter(Boolean) as { stage: string; qty: string }[];
                setStageData(mapped);
            } else {
                setStageData([]);
            }
        } catch (err) {
            console.error('prodordertrack error', err);
            setStageData([]);
        } finally {
            setLoadingRowId(null);
        }
    };

    // const handleEdit = async (item: POTItem) => {
    //     if (onEdit) { onEdit(item); return; }
    //     try {
    //         await AsyncStorage.setItem('collection_edit', JSON.stringify(item));
    //         await AsyncStorage.setItem('collection_mode', 'edit');
    //         // navigate if desired
    //         // @ts-ignore
    //         navigation.navigate('CollectionEdit' as never);
    //     } catch (e) { console.error(e); AppAlert.alert('Error', 'Could not open editor.'); }
    // };

    // inside CollectionCard component
    const handleEdit = async (item: POTItem) => {
        if (onEdit) { onEdit(item); return; }

        try {
            // Prepare a lightweight cached payload for instant hydration.
            // Pick only fields required to render the form immediately.
            const cached = {
                UId: item.UId ?? item.uid,
                AccName: item.AccName ?? item.accname,
                PrpCode: item.PrpCode ?? item.prpcode ?? '',
                EDate: item.EDate ?? item.nEDate ?? new Date().toISOString().split('T')[0],
                ChqDate: item.ChqDate ?? item.nChqDate ?? '',
                Amount: item.Amount ?? item.amount ?? item.Amt ?? '',
                Remark: item.Remark ?? item.remark ?? '',
                AttachImage: item.AttachImage ?? item.attachimage ?? '',
                // keep d1 if present (small)
                d1: item.d1 ?? null,
                // full raw item as fallback
                __raw: item,
                // timestamp for TTL
                __cachedAt: Date.now()
            };

            // store in AsyncStorage as fallback (non-blocking)
            AsyncStorage.setItem('collection_edit_cached', JSON.stringify(cached)).catch(e => console.warn('cache write failed', e));
            AsyncStorage.setItem('collection_mode', 'edit');

            // navigate with params (fast)
            // @ts-ignore
            // navigation.navigate('CollectionEdit' as never, { cachedCard: cached, mode: 'edit' } as never);
            router.push({
                pathname: '/new/CollectionEdit',
                params: { cachedCard: JSON.stringify(cached), mode: 'edit' }
            });
        } catch (e) {
            console.error(e);
            AppAlert.alert('Error', 'Could not open editor.');
        }
    };


    // const handleAuthorize = async (item: POTItem) => {
    //     if (onAuthorize) { onAuthorize(item); return; }
    //     AppAlert.alert('Authorize', 'Implement onAuthorize prop to call the API.');
    // };

    const renderRightActions = (progress: any, dragX: any, item: POTItem) => {
        // Cap action width so it doesn't spill past the card in grid mode
        const actionWidth = Math.min(screenWidth * 0.35, 140);
        return (
            <View style={{ width: actionWidth }}>
                <SwipePreview
                    progress={progress}
                    item={item}
                    onPress={() => setChequePreviewItem(item)}
                />
            </View>
        );
    };


    // const renderItem = ({ item }: { item: POTItem }) => {
    //     if (!item || typeof item !== 'object') return null;
    //     const uid = safe(item.UId ?? item.uid ?? Math.random());
    //     const title = safe(item.AccName ?? item.accname ?? item.ParName ?? 'Unknown Party');
    //     const prp = safe(item.PrpCode ?? item.prpcode ?? '-');
    //     const bank = safe(item.BankName ?? item.bank ?? '');
    //     const br = safe(item.BankBr ?? item.bankbr ?? '');
    //     const collection = formatDate(item.EDate ?? item.nEDate ?? item.LastDate);
    //     const userName = formatDate(item.UseName ?? item.username ?? item.userName ?? '');
    //     const chqNo = safe(item.ChqNo ?? item.chqno ?? '-');
    //     const chqDate = formatDate(item.ChqDate ?? item.nChqDate ?? item.ChqDate);
    //     const amountDisplay = formatAmountDisplay(item.Amount ?? item.amount ?? item.Amt);
    //     // const remark = safe(item.Remark ?? item.remark ?? '');
    //     const isAuth = safe(item.IsAuth ?? item.isauth ?? '0');
    //     const attachUrl = safe(item.AttachImage ?? item.attachimage ?? '');
    //     let remark = '';

    //     // prefer aremark in authorised tab, otherwise fallback to usual remark keys
    //     if (activeTab === 'authorised') {
    //         remark = safe(item.ARemark ?? item.aremark ?? item.ARemark ?? item.remark ?? item.Remark ?? '');
    //     } else {
    //         remark = safe(item.Remark ?? item.remark ?? item.ARemark ?? item.aremark ?? '');
    //     }
    //     const showCardActions = activeTab !== 'authorised';

    //     // d1 rows attached by fetchBrowseData (could be empty or undefined)
    //     const d1rows: any[] = Array.isArray(item.d1) ? item.d1 : [];
    //     // determine permission to show authorize action
    //     const canShowAuthorize = (item && (item.IsAuthorisedUser === 1 || item.IsAuthorisedUser === '1'));

    //     // In your renderItem function, replace the date comparison with this:
    //     const collectionDateStr = item.EDate || item.nEDate || item.LastDate;
    //     const collectionDate = collectionDateStr ? new Date(
    //         collectionDateStr.split('/').reverse().join('-') // Convert DD/MM/YYYY to YYYY-MM-DD
    //     ) : new Date();

    //     const today = new Date();
    //     today.setHours(0, 0, 0, 0);
    //     const isOutdated = collectionDate < today;


    //     return (
    //         <Swipeable renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}>
    //             <View style={[styles.card, isAuth === '1' && styles.cardAuth, isOutdated && styles.cardOutdated]}>
    //                 <View style={styles.rowTop}>
    //                     <View style={{ flex: 1 }}>
    //                         <Text numberOfLines={1} style={styles.title}>{title}</Text>
    //                         <Text numberOfLines={2} style={styles.subtitle}>{prp}{bank ? ` • ${bank}` : ''}{br ? ` • ${br}` : ''}</Text>
    //                     </View>

    //                     <View style={styles.actions}>
    //                         {/* <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconButton} accessibilityLabel="Edit">
    //                             <Icon name="edit" size={18} color={theme.BRAND_ACCENT} />
    //                         </TouchableOpacity> */}
    //                         {showCardActions ? (
    //                             <>
    //                                 <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconButton} accessibilityLabel="Edit">
    //                                     <Icon name="edit" size={18} color={theme.BRAND_ACCENT} />
    //                                 </TouchableOpacity>



    //                                 <TouchableOpacity
    //                                     onPress={() => {
    //                                         // confirm then call onDelete prop (if provided)
    //                                         AppAlert.alert(
    //                                             'Delete',
    //                                             'Are you sure you want to delete this record?',
    //                                             [
    //                                                 { text: 'Cancel', style: 'cancel' },
    //                                                 {
    //                                                     text: 'Delete',
    //                                                     style: 'destructive',
    //                                                     onPress: () => {
    //                                                         try {
    //                                                             onDelete?.(item);
    //                                                         } catch (e) {
    //                                                             console.warn('onDelete failed', e);
    //                                                         }
    //                                                     },
    //                                                 },
    //                                             ],
    //                                             { cancelable: true }
    //                                         );
    //                                     }}
    //                                     style={[styles.iconButton, { marginRight: 6 }]}
    //                                     accessibilityLabel="Delete"
    //                                 >
    //                                     <Icon name="delete" size={18} color="#e53935" />
    //                                 </TouchableOpacity>
    //                             </>
    //                         ) : null}



    //                         <View style={[styles.pill, isAuth === '1' ? styles.pillAuth : styles.pillPending]}>
    //                             <Text style={styles.pillText}>{isAuth === '1' ? 'Authorized' : 'Pending'}</Text>
    //                         </View>

    //                         <Icon name="keyboard-arrow-right" size={26} color={theme.TEXT_SECONDARY} />
    //                     </View>

    //                 </View>

    //                 <View style={styles.content}>
    //                     <View style={{ flex: 1 }}>
    //                         {/* Label-Value rows (single-line) */}
    //                         <View style={styles.infoRow}>
    //                             <Text style={styles.label}>Collection</Text>
    //                             <Text style={[styles.value]} numberOfLines={1}>{collection}</Text>
    //                         </View>

    //                         <View style={styles.infoRow}>
    //                             <Text style={styles.label}>Cheque No</Text>
    //                             <Text style={[styles.value]} numberOfLines={1}>{chqNo}</Text>
    //                         </View>

    //                         <View style={styles.infoRow}>
    //                             <Text style={[styles.label]}>Cheque Date</Text>
    //                             <Text style={[styles.value]} numberOfLines={1}>{chqDate}</Text>
    //                         </View>

    //                         <View style={styles.infoRow}>
    //                             <Text style={styles.label}>Amount</Text>
    //                             <Text style={[styles.value, styles.amount]} numberOfLines={1}>{amountDisplay}</Text>
    //                         </View>

    //                         {/* Remark — full multi-line displayed */}
    //                         <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
    //                             <Text style={styles.label}>Remark</Text>
    //                             <Text
    //                                 style={[styles.value, { flex: 1 }]}
    //                                 numberOfLines={2}
    //                                 ellipsizeMode="tail"
    //                             >
    //                                 {remark || '-'}
    //                             </Text>
    //                         </View>


    //                         {isOutdated && (
    //                             <View style={{
    //                                 flexDirection: 'row',
    //                                 alignItems: 'center',
    //                                 marginTop: 4,
    //                                 marginBottom: 8,
    //                                 backgroundColor: 'rgba(255, 235, 230, 0.8)',
    //                                 paddingVertical: 4,
    //                                 paddingHorizontal: 8,
    //                                 borderRadius: 4,
    //                                 alignSelf: 'flex-start'
    //                             }}>
    //                                 <Icon name="warning" size={14} color="rgba(255, 67, 19, 0.87)" style={{ marginRight: 4 }} />
    //                                 <Text style={{
    //                                     fontSize: 11,
    //                                     color: 'rgba(255, 67, 19, 0.87)',
    //                                     fontWeight: '700'
    //                                 }}>
    //                                     Past collection
    //                                 </Text>
    //                             </View>
    //                         )}

    //                         {/* --- NEW: show d1 rows (vertical list inside card) --- */}
    //                         {d1rows.length > 0 ? (
    //                             <View style={styles.detailsContainer}>
    //                                 <View style={styles.detailsHeader}>
    //                                     <Text style={{ color: theme.BRAND_DARK, fontWeight: '800' }}>Adjustment Details</Text>
    //                                     <Text style={{ color: theme.TEXT_SECONDARY, fontSize: 11 }}>
    //                                         {d1rows.length} {d1rows.length === 1 ? 'entry' : 'entries'}
    //                                     </Text>
    //                                 </View>

    //                                 {d1rows.map((r, i) => {
    //                                     const billDate = formatDate(r.BillDate ?? r.NBillDate ?? r.nBillDate ?? r.NVOUDATE ?? r.NVOUDATE);
    //                                     const billNo = safe(r.BillNo ?? r.BILLNO ?? r.BillNo ?? '');
    //                                     const setAmt = (r.SetAmt ?? r.BALAMT1 ?? r.SetAmt ?? r.SETAMT ?? '') + '';

    //                                     return (
    //                                         <View key={i} style={styles.detailRow}>
    //                                             <View style={{ flex: 1 }}>
    //                                                 <Text style={styles.detailLabel} numberOfLines={1}>
    //                                                     {billNo || '-'}
    //                                                 </Text>
    //                                                 <Text style={[styles.detailLabel, { fontSize: 10, color: theme.MUTED }]}>
    //                                                     {billDate || '-'}
    //                                                 </Text>
    //                                             </View>
    //                                             <Text style={[styles.detailValue, styles.detailAmount]}>
    //                                                 {formatAmountDisplay(setAmt)}
    //                                             </Text>
    //                                         </View>
    //                                     );
    //                                 })}

    //                                 {/* Show total of all adjustments */}
    //                                 <View style={[styles.detailRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: theme.BORDER, paddingTop: 6 }]}>
    //                                     <Text style={[styles.detailLabel, { fontWeight: '800' }]}>Total Adjustments</Text>
    //                                     <Text style={[styles.detailValue, styles.detailAmount, { fontSize: 14 }]}>
    //                                         {formatAmountDisplay(d1rows.reduce((sum, r) => sum + parseAmount(r.SetAmt ?? r.BALAMT1 ?? 0), 0))}
    //                                     </Text>
    //                                 </View>
    //                             </View>
    //                         ) : null}

    //                         {/* <View style={styles.quickActions}>
    //                             <TouchableOpacity onPress={() => handleAuthorize(item)} style={styles.smallBtn}>
    //                                 <Icon name="check" size={16} color="#fff" />
    //                                 <Text style={styles.smallBtnText}>Authorize</Text>
    //                             </TouchableOpacity>
    //                         </View> */}
    //                         {showCardActions ? (
    //                             // only show authorize button when allowed (and when IsAuthorisedUser permits)
    //                             ((item.IsAuthorisedUser === 1 || item.IsAuthorisedUser === '1') ? (
    //                                 <TouchableOpacity onPress={() => openAuthModal(item)} style={styles.smallBtn}>
    //                                     <Icon name="check" size={16} color="#fff" />
    //                                     <Text style={styles.smallBtnText}>Authorize</Text>
    //                                 </TouchableOpacity>
    //                             ) : null)
    //                         ) : null}
    //                     </View>

    //                     <View style={styles.sideColumn}>
    //                         {attachUrl ? (
    //                             <TouchableOpacity onPress={() => setImageModalUrl(attachUrl)} style={styles.thumbWrap}>
    //                                 <Image source={{ uri: attachUrl }} style={styles.thumb} resizeMode="cover" />
    //                             </TouchableOpacity>
    //                         ) : (
    //                             <View style={[styles.thumbWrap, styles.thumbPlaceholder]}>
    //                                 <Icon name="image" size={28} color="#cfcfcf" />
    //                                 <Text style={{ fontSize: 11, color: '#cfcfcf', marginTop: 6 }}>No image</Text>
    //                             </View>
    //                         )}
    //                         <View style={{
    //                             flexDirection: 'row',
    //                             alignItems: 'center',
    //                             marginTop: 4,
    //                             marginBottom: 8,
    //                             backgroundColor: 'rgba(168, 231, 231, 0.17)',
    //                             paddingVertical: 4,
    //                             paddingHorizontal: 8,
    //                             borderRadius: 4,
    //                             // alignSelf: 'flex-start',
    //                         }}>
    //                             {/* <Text style={styles.label}>User</Text> */}

    //                             <Icon name="person" size={14} color="rgb(40, 162, 162)" style={{ marginRight: 4 }} />
    //                             <Text style={{
    //                                 fontSize: 11,
    //                                 color: 'rgb(40, 162, 162)',
    //                                 fontWeight: '700'
    //                             }}>{userName || '-'}</Text>

    //                         </View>
    //                     </View>
    //                 </View>
    //             </View>
    //         </Swipeable>
    //     );
    // };


    const [detailsExpanded, setDetailsExpanded] = useState(false);
    const renderItem = ({ item }: { item: POTItem }) => {
        if (!item || typeof item !== 'object') return null;
        const uid = safe(item.UId ?? item.uid ?? Math.random());
        const title = safe(item.AccName ?? item.accname ?? item.ParName ?? 'Unknown Party');
        const prp = safe(item.PrpCode ?? item.prpcode ?? '-');
        const bank = safe(item.BankName ?? item.bank ?? '');
        const br = safe(item.BankBr ?? item.bankbr ?? '');
        const collection = formatDate(item.EDate ?? item.nEDate ?? item.LastDate);
        const userName = safe(item.UseName ?? item.username ?? item.userName ?? '');
        const chqNo = safe(item.ChqNo ?? item.chqno ?? '-');
        const chqDate = formatDate(item.ChqDate ?? item.nChqDate ?? item.ChqDate);
        const amountDisplay = formatAmountDisplay(item.Amount ?? item.amount ?? item.Amt);
        const tDSAmt = formatAmountDisplay(item.TDSAmt ?? item.TDSAmt ?? '0');
        const disAmt = formatAmountDisplay(item.DisAmt ?? item.DisAmt ?? '0');
        const isAuth = safe(item.IsAuth ?? item.isauth ?? '0');
        const attachUrl = safe(item.AttachImage ?? item.attachimage ?? '');
        let remark = '';
        if (activeTab === 'authorised') {
            remark = safe(item.ARemark ?? item.aremark ?? item.ARemark ?? item.remark ?? item.Remark ?? '');
        } else {
            remark = safe(item.Remark ?? item.remark ?? item.ARemark ?? item.aremark ?? '');
        }
        const showCardActions = activeTab !== 'authorised';
        const d1rows: any[] = Array.isArray(item.d1) ? item.d1 : [];
        const canShowAuthorize = (item && (item.IsAuthorisedUser === 1 || item.IsAuthorisedUser === '1'));
        const collectionDateStr = item.EDate || item.nEDate || item.LastDate;
        const collectionDate = collectionDateStr ? new Date(collectionDateStr.split('/').reverse().join('-')) : new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isOutdated = collectionDate < today;

        // State for collapsible adjustment details

        return (
            <Swipeable
                renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                containerStyle={{ borderRadius: 12, overflow: 'hidden' }}
            >
                <View style={[styles.card, isAuth === '1' && styles.cardAuth, isOutdated && styles.cardOutdated]}>
                    {/* Header: Title + Status + Actions */}
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            <Text numberOfLines={1} style={styles.title}>{title}</Text>
                            <Text numberOfLines={2} style={styles.subtitle}>
                                {prp}{bank ? ` • ${bank}` : ''}{br ? ` • ${br}` : ''}
                            </Text>
                        </View>
                        <View style={styles.headerRight}>
                            {showCardActions && (
                                <>
                                    <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconButton}>
                                        <Icon name="edit" size={18} color={theme.BRAND_ACCENT} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            AppAlert.alert('Delete', 'Are you sure?', [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(item) },
                                            ]);
                                        }}
                                        style={styles.iconButton}
                                    >
                                        <Icon name="delete" size={18} color="#e53935" />
                                    </TouchableOpacity>
                                </>
                            )}
                            <View style={[styles.pill, isAuth === '1' ? styles.pillAuth : styles.pillPending]}>
                                <Text style={styles.pillText}>{isAuth === '1' ? 'Authorized' : 'Pending'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Cheque Details (Full Width) */}
                    <View style={styles.chequeDetails}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Collection Date:</Text>
                            <Text style={[styles.detailValue, isOutdated && styles.outdatedText]}>{collection}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Cheque No:</Text>
                            <Text style={styles.detailValue}>{chqNo}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Cheque Date:</Text>
                            <Text style={styles.detailValue}>{chqDate}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Amount:</Text>
                            <Text style={[styles.detailValue, styles.amount]}>₹ {amountDisplay}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>TDS Amount:</Text>
                            <Text style={[styles.detailValue, styles.amount]}>₹ {tDSAmt}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Discount Amount:</Text>
                            <Text style={[styles.detailValue, styles.amount]}>₹ {disAmt}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Remark:</Text>
                            <Text style={[styles.detailValue, { flex: 1 }]} numberOfLines={2}>
                                {remark || '-'}
                            </Text>
                        </View>
                        <>
                            <View style={styles.detailRow}>
                                <View style={styles.warningRow1}>
                                    <Icon name="person" size={14} color="rgba(24, 161, 134, 0.87)" style={styles.warningIcon} />
                                    <Text style={styles.warningText1}>{userName}</Text>
                                </View>
                                {isOutdated && (
                                    <View style={styles.warningRow}>
                                        <Icon name="warning" size={14} color="rgba(255, 67, 19, 0.87)" style={styles.warningIcon} />
                                        <Text style={styles.warningText}>Past collection</Text>
                                    </View>
                                )}

                            </View>
                        </>
                    </View>

                    {/* View Cheque Button (Replaces Image Thumbnail) */}
                    {attachUrl && (<>
                        <TouchableOpacity
                            onPress={() => attachUrl ? setImageModalUrl(attachUrl) : AppAlert.alert('No Image', 'No cheque image available.')}
                            style={[styles.viewChequeButton, !attachUrl && styles.viewChequeButtonDisabled]}
                        >
                            <Icon name="receipt" size={18} color={attachUrl ? theme.BRAND_ACCENT : theme.TEXT_SECONDARY} />
                            <Text style={[styles.viewChequeText, !attachUrl && styles.viewChequeTextDisabled]}>
                                {attachUrl ? 'View Cheque' : 'No Cheque Image'}
                            </Text>
                        </TouchableOpacity>
                    </>)}

                    {showCardActions && canShowAuthorize && (
                        <TouchableOpacity
                            onPress={() => openAuthModal(item)}
                            style={styles.authorizeButton}
                        >
                            <Icon name="check-circle" size={18} color="#fff" />
                            <Text style={styles.authorizeButtonText}>Authorize</Text>
                        </TouchableOpacity>
                    )}

                    {/* Adjustment Details (Full Width, Collapsible) */}
                    {d1rows.length > 0 && (
                        <View style={styles.adjustmentContainer}>
                            <TouchableOpacity
                                style={styles.adjustmentHeader}
                                onPress={() => setDetailsExpanded(!detailsExpanded)}
                            >
                                <Text style={styles.adjustmentTitle}>Adjustment Details ({d1rows.length})</Text>
                                <Icon
                                    name={detailsExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                    size={20}
                                    color={theme.BRAND_DARK}
                                />
                            </TouchableOpacity>
                            {detailsExpanded && (
                                <>
                                    {d1rows.map((r, i) => {
                                        const billDate = formatDate(r.BillDate ?? r.NBillDate ?? r.nBillDate ?? r.NVOUDATE ?? r.NVOUDATE);
                                        const billNo = safe(r.BillNo ?? r.BILLNO ?? r.BillNo ?? '');
                                        const setAmt = safe(r.SetAmt ?? r.BALAMT1 ?? r.SetAmt ?? r.SETAMT ?? '');
                                        return (
                                            <View key={i} style={styles.adjustmentRow}>
                                                <View style={styles.adjustmentLeft}>
                                                    <Text style={styles.adjustmentLabel}>{billNo || '-'}</Text>
                                                    <Text style={styles.adjustmentDate}>{billDate || '-'}</Text>
                                                </View>
                                                <Text style={[styles.adjustmentAmount, styles.amount]}>
                                                    ₹ {formatAmountDisplay(setAmt)}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                    <View style={styles.adjustmentTotalRow}>
                                        <Text style={styles.adjustmentTotalLabel}>Total Adjustments:</Text>
                                        <Text style={[styles.adjustmentTotalAmount, styles.amount]}>
                                            ₹ {formatAmountDisplay(d1rows.reduce((sum, r) => sum + parseAmount(r.SetAmt ?? r.BALAMT1 ?? 0), 0))}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    )}
                </View>

                {/* Authorize Button (Full Width) */}
                {/* {showCardActions && canShowAuthorize && (
                    <TouchableOpacity
                        onPress={() => openAuthModal(item)}
                        style={styles.authorizeButton}
                    >
                        <Icon name="check" size={18} color="#fff" />
                        <Text style={styles.authorizeButtonText}>Authorize</Text>
                    </TouchableOpacity>
                )} */}

            </Swipeable >
        );
    };


    const pending = (data || []).filter(d => String(d.IsAuth ?? d.isauth ?? '0') === '0');
    const authorised = (data || []).filter(d => String(d.IsAuth ?? d.isauth ?? '0') === '1');

    const filteredData = useMemo(() => {
        let base =
            activeTab === 'pending'
                ? (data || []).filter(d => String(d.IsAuth ?? d.isauth ?? '0') === '0')
                : (data || []).filter(d => String(d.IsAuth ?? d.isauth ?? '0') === '1');

        if (!searchQueryPOT?.trim()) return base;

        const q = searchQueryPOT.toLowerCase();

        return base.filter(item =>
            Object.values(item || {}).some(
                v => typeof v === 'string' && v.toLowerCase().includes(q)
            )
        );
    }, [data, activeTab, searchQueryPOT]);

    const visibleData = useMemo(() => {
        return filteredData.slice(0, visibleCount);
    }, [filteredData, visibleCount]);

    const loadMore = () => {
        if (visibleCount < filteredData.length) {
            setVisibleCount(prev => prev + PAGE_SIZE);
        }
    };

    // const RealData = new Date().toISOString().split('T')[0]

    const convertToYYYYMMDD = (dateStr: string | undefined): string | null => {
        if (!dateStr) return null;
        // Check if already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
    };


    // Calculate total for all data (Pending + Authorized)
    const allDataTotal = data.reduce((sum, item) => sum + parseAmount(item.Amount), 0);

    // Calculate today's total (if fromDate and toDate are today)
    const today = new Date().toISOString().split('T')[0];
    const isToday = fromDate?.toISOString().split('T')[0] === today && toDate?.toISOString().split('T')[0] === today;

    const todayDataTotal = isToday
        ? data
            .filter(item => {
                const collectionDateStr = item.EDate || item.nEDate || item.LastDate;
                const collectionDateYYYYMMDD = convertToYYYYMMDD(collectionDateStr);
                return collectionDateYYYYMMDD === today;
            })
            .reduce((sum, item) => sum + parseAmount(item.Amount), 0)
        : 0;

    // Use the correct total based on condition
    const footerTotal = isToday ? todayDataTotal : allDataTotal;
    const footerText = isToday ? 'Today\'s Amount' : 'Total Amount';

    console.log('footerTotal', footerTotal);

    return (
        <>
            <Footer
                text={footerText}
                totalAmount={footerTotal}
                isChequeList={true}
            />
            <SafeAreaView style={styles.container}>
                <View style={styles.tabs}>
                    <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('pending')}>
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>Pending ({pending.length})</Text>
                        {activeTab === 'pending' && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('authorised')}>
                        <Text style={[styles.tabText, activeTab === 'authorised' && styles.tabTextActive]}>Authorized ({authorised.length})</Text>
                        {activeTab === 'authorised' && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                </View>

                {/* <FlatList
                    data={activeTab === 'pending' ? pending : authorised}
                    renderItem={renderItem}
                    keyExtractor={(i, idx) => safe(i?.UId ?? i?.uid ?? idx)}
                    contentContainerStyle={{ paddingBottom: 140 }}
                    ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No records</Text></View>}
                /> */}
                <FlatList
                    key={`collection-grid-${numColumns}`}   /* 👈 force remount on col change */
                    data={visibleData}
                    numColumns={numColumns}
                    {...(numColumns > 1
                        ? {
                            columnWrapperStyle: {
                                gap: GRID_GAP,
                                paddingHorizontal: GRID_PAD,
                            },
                        }
                        : {})}
                    style={{ flex: 1 }}
                    renderItem={({ item }) => (
                        <View
                            style={{
                                width: numColumns > 1 ? gridItemWidth : undefined,
                                flex: numColumns === 1 ? 1 : undefined,
                                marginBottom: 12,
                                marginHorizontal: numColumns === 1 ? 12 : 0,
                            }}
                        >
                            {renderItem({ item })}
                        </View>
                    )}
                    keyExtractor={(i, idx) => safe(i?.UId ?? i?.uid ?? idx)}
                    contentContainerStyle={{ paddingBottom: 140, paddingTop: 4 }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No records</Text>
                        </View>
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        visibleCount < filteredData.length ? (
                            <View style={{ paddingVertical: 16 }}>
                                <ActivityIndicator size="small" color={theme.BRAND_ACCENT} />
                            </View>
                        ) : null
                    }
                />


                {/* image fullscreen modal */}
                <Modal visible={!!imageModalUrl} transparent animationType="fade" onRequestClose={() => setImageModalUrl(null)}>
                    <View style={styles.fullscreen}>
                        <TouchableOpacity style={styles.imageClose} onPress={() => setImageModalUrl(null)}>
                            <Icon name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        {imageModalUrl ? <Image source={{ uri: imageModalUrl }} style={styles.fullImage} resizeMode="contain" /> : null}
                    </View>
                </Modal>

                {/* Cheque Preview modal */}
                <ChequePreviewModal visible={!!chequePreviewItem} item={chequePreviewItem ?? undefined} onClose={() => setChequePreviewItem(null)} />

                {/* stages modal */}
                <Modal visible={stageModalVisible} animationType="slide" onRequestClose={() => setStageModalVisible(false)}>
                    <SafeAreaView style={styles.modalWrap}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Details</Text>
                            <TouchableOpacity onPress={() => setStageModalVisible(false)}><Icon name="close" size={24} color={theme.BRAND_ACCENT} /></TouchableOpacity>
                        </View>

                        <View style={{ padding: 16 }}>
                            {(!stageData || stageData.length === 0) ? (
                                <Text style={{ color: theme.TEXT_SECONDARY }}>No details available</Text>
                            ) : (
                                stageData.map((s, i) => (
                                    <View key={i} style={styles.stageRow}>
                                        <Text style={styles.stageKey}>{s.stage}</Text>
                                        <Text style={styles.stageQty}>{s.qty}</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </SafeAreaView>
                </Modal>
                {/* Authorize confirmation modal */}
                <Modal visible={authModalVisible} transparent animationType="fade" onRequestClose={() => setAuthModalVisible(false)}>
                    <View style={{
                        flex: 1, backgroundColor: 'rgba(10,10,12,0.45)',
                        justifyContent: 'center', padding: 20
                    }}>
                        <View style={{
                            backgroundColor: theme.SURFACE, borderRadius: 12, padding: 16,
                            shadowColor: theme.SHADOW, elevation: 6
                        }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: '900', color: theme.BRAND_DARK }}>Authorize cheque</Text>
                                <TouchableOpacity onPress={() => setAuthModalVisible(false)}>
                                    <Icon name="close" size={20} color={theme.TEXT_SECONDARY} />
                                </TouchableOpacity>
                            </View>

                            <Text style={{ marginTop: 12, color: theme.TEXT_SECONDARY }}>
                                Are you sure you want to authorize this collection?
                            </Text>

                            <View style={{ marginTop: 12 }}>
                                <Text style={{ color: theme.TEXT_SECONDARY, fontWeight: '700', marginBottom: 6 }}>Remark (optional)</Text>
                                <TextInput
                                    value={authRemark}
                                    onChangeText={setAuthRemark}
                                    placeholder="Enter remark"
                                    style={{
                                        borderWidth: 1, borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
                                        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff'
                                    }}
                                    returnKeyType="done"
                                />
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
                                <TouchableOpacity onPress={() => setAuthModalVisible(false)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                                    <Text style={{ color: theme.TEXT_SECONDARY, fontWeight: '700' }}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => confirmAuthorize()}
                                    style={{
                                        backgroundColor: theme.BRAND_ACCENT, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginLeft: 8, flexDirection: 'row', alignItems: 'center'
                                    }}
                                >
                                    {authLoadingLocalId ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /> : null}
                                    <Text style={{ color: '#fff', fontWeight: '900' }}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

            </SafeAreaView>
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.BG || '#f6f7fa' },
    // 
    card: {
        backgroundColor: theme.SURFACE,
        borderRadius: 12,
        padding: 16,
        shadowColor: theme.SHADOW,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chequeDetails: {
        marginTop: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        alignItems: 'center',
    },
    detailLabel: {
        color: theme.TEXT_SECONDARY,
        fontSize: 13,
        fontWeight: '500',
        flex: 0.4,
    },
    detailValue: {
        color: theme.BRAND_DARK,
        fontSize: 13,
        fontWeight: '700',
        flex: 0.6,
        textAlign: 'right',
    },
    amount: {
        color: theme.BRAND_ACCENT,
        fontSize: 14,
        fontWeight: '900',
    },
    warningRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 8,
        backgroundColor: 'rgba(255, 235, 230, 0.8)',
        // backgroundColor: 'rgba(255, 235, 230, 0.8)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    warningRow1: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 8,
        // backgroundColor: 'rgba(255, 235, 230, 0.8)',
        backgroundColor: 'rgba(156, 255, 235, 0.24)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    warningIcon: {
        marginRight: 4,
    },
    warningText: {
        fontSize: 11,
        color: 'rgba(255, 67, 19, 0.87)',
        // color: 'rgba(24, 161, 134, 0.87)',
        fontWeight: '700',
    },
    warningText1: {
        fontSize: 11,
        // color: 'rgba(255, 67, 19, 0.87)',
        color: 'rgba(24, 161, 134, 0.87)',
        fontWeight: '700',
    },
    viewChequeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(46, 204, 113, 0.12)',
        borderRadius: 8,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(46, 204, 113, 0.24)',
    },
    viewChequeButtonDisabled: {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderColor: 'rgba(0, 0, 0, 0.12)',
    },
    viewChequeText: {
        color: theme.BRAND_ACCENT,
        fontWeight: '700',
        marginLeft: 8,
    },
    viewChequeTextDisabled: {
        color: theme.TEXT_SECONDARY,
    },
    adjustmentContainer: {
        marginTop: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderRadius: 8,
        padding: 12,
    },
    adjustmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.BORDER,
        marginBottom: 8,
    },
    adjustmentTitle: {
        fontWeight: '800',
        color: theme.BRAND_DARK,
        fontSize: 13,
    },
    adjustmentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.04)',
    },
    adjustmentLeft: {
        flex: 1,
    },
    adjustmentLabel: {
        color: theme.TEXT_SECONDARY,
        fontSize: 12,
    },
    adjustmentDate: {
        color: theme.TEXT_SECONDARY,
        fontSize: 10,
        marginTop: 2,
    },
    adjustmentAmount: {
        fontSize: 12,
        fontWeight: '700',
    },
    adjustmentTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: theme.BORDER,
    },
    adjustmentTotalLabel: {
        fontWeight: '800',
        color: theme.BRAND_DARK,
        fontSize: 13,
    },
    adjustmentTotalAmount: {
        fontSize: 14,
    },
    authorizeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.BRAND_ACCENT,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 12,
    },
    authorizeButtonText: {
        color: '#fff',
        fontWeight: '700',
        marginLeft: 8,
    },
    // 

    tabs: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 12, backgroundColor: theme.BG || '#fff' },
    tabItem: { flex: 1, alignItems: 'center', paddingBottom: 8 },
    tabText: { color: theme.TEXT_SECONDARY, fontWeight: '700' },
    tabTextActive: { color: theme.BRAND_DARK },
    tabUnderline: { height: 3, width: '60%', backgroundColor: theme.BRAND_ACCENT, marginTop: 8, borderRadius: 3 },

    // card: { marginVertical: 10, backgroundColor: theme.SURFACE, borderRadius: 14, padding: 14, shadowColor: theme.SHADOW, elevation: 3, marginHorizontal: 12 },
    cardAuth: { borderLeftWidth: 6, borderLeftColor: theme.BRAND_PRIMARY },

    rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    title: { fontSize: 16, fontWeight: '800', color: theme.BRAND_DARK },
    subtitle: { fontSize: 12, color: theme.TEXT_SECONDARY, marginTop: 6 },

    actions: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)', marginRight: 8 },
    pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
    pillPending: { backgroundColor: 'rgba(255,165,0,0.12)' },
    pillAuth: { backgroundColor: 'rgba(46,204,113,0.12)' },
    pillText: { fontSize: 11, color: theme.TEXT_SECONDARY, fontWeight: '700' },

    content: { flexDirection: 'row', marginTop: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'nowrap' },
    label: { minWidth: 100, color: theme.TEXT_SECONDARY, fontSize: 12 },
    value: { color: theme.BRAND_DARK, fontSize: 12, marginLeft: 8, flexShrink: 1, fontWeight: '700' },
    // amount: { color: theme.BRAND_ACCENT, fontSize: 15, fontWeight: '800' },

    quickActions: { flexDirection: 'row', marginTop: 8 },
    smallBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.BRAND_ACCENT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, width: '80%' },
    smallBtnText: { color: '#fff', marginLeft: 8, fontWeight: '700', fontSize: 13 },

    sideColumn: { width: 110, alignItems: 'center', marginLeft: 12 },
    thumbWrap: { width: 74, height: 74, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
    thumb: { width: '100%', height: '100%' },
    thumbPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

    empty: { padding: 24, alignItems: 'center' }, emptyText: { color: theme.TEXT_SECONDARY },

    fullscreen: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: WINDOW_WIDTH, height: WINDOW_HEIGHT, resizeMode: 'contain' },
    imageClose: { position: 'absolute', top: Platform.OS === 'ios' ? 48 : 24, right: 20, zIndex: 10, padding: 6 },

    modalWrap: { flex: 1, backgroundColor: theme.SURFACE },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
    modalTitle: { fontSize: 16, fontWeight: '800', color: theme.BRAND_DARK },

    stageRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.BG },
    stageKey: { color: theme.TEXT_SECONDARY }, stageQty: { color: theme.BRAND_DARK, fontWeight: '700' },
    // Add these to your existing styles
    cardOutdated: {
        // backgroundColor: 'rgba(228, 228, 228, 0.06)', // Very light orange background
        borderLeftWidth: 4,
        borderLeftColor: 'rgba(69, 69, 69, 0.32)', // Orange border for better visibility
        opacity: 0.95, // Slightly reduce opacity for subtle effect
    },

    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: theme.BORDER || 'rgba(0,0,0,0.06)',
    },
    // detailRow: {
    //     flexDirection: 'row',
    //     justifyContent: 'space-between',
    //     marginBottom: 6,
    //     paddingVertical: 4,
    // },
    // detailLabel: {
    //     color: theme.TEXT_SECONDARY,
    //     fontSize: 12,
    //     flex: 1,
    // },
    // detailValue: {
    //     color: theme.BRAND_DARK,
    //     fontSize: 12,
    //     fontWeight: '700',
    //     textAlign: 'right',
    //     minWidth: 80,
    // },
    detailAmount: {
        color: theme.BRAND_ACCENT,
        fontSize: 13,
        fontWeight: '800',
    },
    detailsContainer: {
        marginTop: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderRadius: 8,
        padding: 10,
    },

});

export default CollectionCard;
/* CollectionCard.tsx — Professional cheque collection UI with full amount visibility */