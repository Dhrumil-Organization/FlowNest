import AppAlert from '@/common/utils/appAlert';
/* CollectionCard.tsx — left-swipe preview + label-value single-line + full remark display */
import AsyncStorage from '@/common/utils/compatibleStorage';
import { Btn, cellWidth, CONTENT_MAX, EmptyState, Field, IconBtn, Metric, Segment, Sheet, useSotLayout } from '@/src/components/erpUi';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { API } from '../../common/API/dynamicAPI';
import Footer from './CollectionFooter';
import ChequePreviewModal, { SwipePreview } from './ChequePreview';

type POTItem = { [k: string]: any };

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
    const { width } = useWindowDimensions();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    // NEW ERP UI: shared responsive breakpoints (1 / 2 / 3 columns)
    const { cols, gutter, isPhone } = useSotLayout();

    const numColumns = cols;


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

        // NEW ERP UI: status tone (authorised = green, pending = copper)
        const authorisedRow = isAuth === '1';
        const tone = authorisedRow ? T.green : T.copper;
        const showActionBar = !!attachUrl || (showCardActions && canShowAuthorize);

        return (
            <View style={[cellWidth(numColumns), styles.gridCell]}>
                <Swipeable
                    renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                    containerStyle={{ borderRadius: 14, overflow: 'hidden', flex: 1 }}
                >
                    <View style={[styles.card, authorisedRow && styles.cardAuth, isOutdated && styles.cardOutdated]}>
                        {/* Header: party + property / bank + status */}
                        <View style={styles.cardHead}>
                            <View style={styles.cardIcon}>
                                <Icon name="account-balance-wallet" size={18} color={T.copper} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text numberOfLines={2} style={styles.title}>{title}</Text>
                                <Text numberOfLines={2} style={styles.subtitle}>
                                    {prp}{bank ? ` • ${bank}` : ''}{br ? ` • ${br}` : ''}
                                </Text>
                            </View>
                            <View style={[styles.pill, { backgroundColor: `${tone}16`, borderColor: `${tone}40` }]}>
                                <View style={[styles.pillDot, { backgroundColor: tone }]} />
                                <Text style={[styles.pillText, { color: tone }]}>{authorisedRow ? 'AUTHORIZED' : 'PENDING'}</Text>
                            </View>
                        </View>

                        {/* Money */}
                        <View style={[styles.metricBox, isPhone && { flexWrap: 'wrap', rowGap: 8 }]}>
                            <Metric label="Amount" value={`₹ ${amountDisplay}`} color={authorisedRow ? T.green : T.pd} style={isPhone ? { flexBasis: '100%' } : { flex: 1.6 }} />
                            <Metric label="TDS Amount" value={`₹ ${tDSAmt}`} color={T.nav} />
                            <Metric label="Discount" value={`₹ ${disAmt}`} color={T.nav} align="right" />
                        </View>

                        {/* Cheque details */}
                        <View>
                            <View style={[styles.kvRow, { borderTopWidth: 0 }]}>
                                <Text style={styles.kvLabel}>Collection Date</Text>
                                <Text style={[styles.kvValue, isOutdated && styles.outdatedText]} numberOfLines={1}>{collection}</Text>
                            </View>
                            <View style={styles.kvRow}>
                                <Text style={styles.kvLabel}>Cheque No</Text>
                                <Text style={styles.kvValue} numberOfLines={1}>{chqNo}</Text>
                            </View>
                            <View style={styles.kvRow}>
                                <Text style={styles.kvLabel}>Cheque Date</Text>
                                <Text style={styles.kvValue} numberOfLines={1}>{chqDate}</Text>
                            </View>
                            <View style={[styles.kvRow, { alignItems: 'flex-start' }]}>
                                <Text style={styles.kvLabel}>Remark</Text>
                                <Text style={[styles.kvValue, { fontWeight: '600' }]} numberOfLines={2}>
                                    {remark || '-'}
                                </Text>
                            </View>
                        </View>

                        {/* User + past-collection flags + row actions */}
                        <View style={styles.flagRow}>
                            <View style={styles.flagChips}>
                                <View style={styles.userChip}>
                                    <Icon name="person" size={13} color={T.blue} />
                                    <Text style={styles.userChipText} numberOfLines={1}>{userName}</Text>
                                </View>
                                {isOutdated && (
                                    <View style={styles.warnChip}>
                                        <Icon name="warning" size={13} color={T.red} />
                                        <Text style={styles.warnChipText}>Past collection</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.iconRow}>
                                {/* Same action as the left-swipe preview (swipe is not available with a mouse) */}
                                <IconBtn icon="visibility" label="Preview cheque" color={T.nav} onPress={() => setChequePreviewItem(item)} />
                                {showCardActions && (
                                    <>
                                        <IconBtn icon="edit" label="Edit" color={T.nav} onPress={() => handleEdit(item)} />
                                        <IconBtn
                                            icon="delete"
                                            label="Delete"
                                            tone="danger"
                                            color={T.red}
                                            onPress={() => {
                                                AppAlert.alert('Delete', 'Are you sure?', [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(item) },
                                                ]);
                                            }}
                                        />
                                    </>
                                )}
                            </View>
                        </View>

                        {/* View Cheque / Authorize */}
                        {showActionBar ? (
                            <View style={styles.actionBar}>
                                {!!attachUrl && (
                                    <Btn
                                        label="View Cheque"
                                        icon="receipt"
                                        kind="soft"
                                        compact
                                        style={styles.actionBtn}
                                        onPress={() => attachUrl ? setImageModalUrl(attachUrl) : AppAlert.alert('No Image', 'No cheque image available.')}
                                    />
                                )}
                                {showCardActions && canShowAuthorize && (
                                    <Btn
                                        label="Authorize"
                                        icon="check-circle"
                                        compact
                                        style={styles.actionBtn}
                                        onPress={() => openAuthModal(item)}
                                    />
                                )}
                            </View>
                        ) : null}

                        {/* Adjustment Details (collapsible) */}
                        {d1rows.length > 0 && (
                            <View style={styles.adjBox}>
                                <TouchableOpacity
                                    style={styles.adjHead}
                                    onPress={() => setDetailsExpanded(!detailsExpanded)}
                                    accessibilityRole="button"
                                    accessibilityState={{ expanded: detailsExpanded }}
                                >
                                    <Icon name="receipt-long" size={16} color={T.copper} />
                                    <Text style={styles.adjTitle}>Adjustment Details</Text>
                                    <View style={styles.countPill}>
                                        <Text style={styles.countPillText}>{d1rows.length}</Text>
                                    </View>
                                    <View style={{ flex: 1 }} />
                                    <Icon
                                        name={detailsExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                        size={20}
                                        color={T.nav}
                                    />
                                </TouchableOpacity>
                                {detailsExpanded && (
                                    <>
                                        {d1rows.map((r, i) => {
                                            const billDate = formatDate(r.BillDate ?? r.NBillDate ?? r.nBillDate ?? r.NVOUDATE ?? r.NVOUDATE);
                                            const billNo = safe(r.BillNo ?? r.BILLNO ?? r.BillNo ?? '');
                                            const setAmt = safe(r.SetAmt ?? r.BALAMT1 ?? r.SetAmt ?? r.SETAMT ?? '');
                                            return (
                                                <View key={i} style={[styles.adjRow, i % 2 === 1 && { backgroundColor: T.sub }]}>
                                                    <View style={{ flex: 1, minWidth: 0 }}>
                                                        <Text style={styles.adjBill} numberOfLines={1}>{billNo || '-'}</Text>
                                                        <Text style={styles.adjDate}>{billDate || '-'}</Text>
                                                    </View>
                                                    <Text style={styles.adjAmount}>
                                                        ₹ {formatAmountDisplay(setAmt)}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                        <View style={styles.adjTotal}>
                                            <Text style={styles.adjTotalLabel}>Total Adjustments</Text>
                                            <Text style={styles.adjTotalAmount}>
                                                ₹ {formatAmountDisplay(d1rows.reduce((sum, r) => sum + parseAmount(r.SetAmt ?? r.BALAMT1 ?? 0), 0))}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                </Swipeable>
            </View>
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
            <SafeAreaView style={styles.container}>
                {/* Totals (was the floating footer) + Pending / Authorized tabs */}
                <View style={[styles.head, { paddingHorizontal: gutter }]}>
                    <View style={[styles.headInner, !isPhone && { flexDirection: 'row', alignItems: 'center' }]}>
                        <Footer
                            text={footerText}
                            totalAmount={footerTotal}
                            isChequeList={true}
                            style={!isPhone ? { flex: 1 } : undefined}
                        />
                        <View style={isPhone ? undefined : { width: 380 }}>
                            <Segment
                                value={activeTab}
                                options={[
                                    { value: 'pending', label: `Pending (${pending.length})`, icon: 'schedule' },
                                    { value: 'authorised', label: `Authorized (${authorised.length})`, icon: 'verified' },
                                ]}
                                onChange={(tab) => setActiveTab(tab)}
                            />
                        </View>
                    </View>
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
                    style={{ flex: 1 }}
                    renderItem={({ item }) => renderItem({ item })}
                    keyExtractor={(i, idx) => safe(i?.UId ?? i?.uid ?? idx)}
                    contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter - 5 }]}
                    ListEmptyComponent={
                        <View style={styles.emptyCard}>
                            <EmptyState
                                icon={activeTab === 'pending' ? 'pending-actions' : 'verified'}
                                title="No records"
                                text={
                                    searchQueryPOT?.trim()
                                        ? 'No collection matches this search.'
                                        : activeTab === 'pending'
                                            ? 'No pending collections for the selected filters.'
                                            : 'No authorized collections for the selected filters.'
                                }
                            />
                        </View>
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        visibleCount < filteredData.length ? (
                            <TouchableOpacity
                                style={styles.loadingMore}
                                onPress={loadMore}
                                accessibilityRole="button"
                                accessibilityLabel="Show more"
                            >
                                <ActivityIndicator size="small" color={T.copper} />
                                <Text style={styles.loadingMoreText}>
                                    Show more ({filteredData.length - visibleCount} left)
                                </Text>
                            </TouchableOpacity>
                        ) : null
                    }
                />


                {/* image fullscreen modal */}
                <Modal visible={!!imageModalUrl} transparent animationType="fade" onRequestClose={() => setImageModalUrl(null)}>
                    <View style={styles.fullscreen}>
                        <TouchableOpacity
                            style={styles.imageClose}
                            onPress={() => setImageModalUrl(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Close image"
                        >
                            <Icon name="close" size={22} color="#fff" />
                        </TouchableOpacity>
                        {imageModalUrl ? (
                            <Image
                                source={{ uri: imageModalUrl }}
                                style={{ width: screenWidth, height: screenHeight, resizeMode: 'contain' } as any}
                                resizeMode="contain"
                            />
                        ) : null}
                    </View>
                </Modal>

                {/* Cheque Preview modal */}
                <ChequePreviewModal visible={!!chequePreviewItem} item={chequePreviewItem ?? undefined} onClose={() => setChequePreviewItem(null)} />

                {/* stages modal */}
                <Sheet
                    open={stageModalVisible}
                    onClose={() => setStageModalVisible(false)}
                    eyebrow="COLLECTION"
                    title="Details"
                    wideMax={480}
                >
                    {(!stageData || stageData.length === 0) ? (
                        <Text style={styles.mutedText}>No details available</Text>
                    ) : (
                        <View style={styles.stageList}>
                            {stageData.map((s, i) => (
                                <View key={i} style={[styles.stageRow, i % 2 === 1 && { backgroundColor: T.sub }]}>
                                    <Text style={styles.stageKey}>{s.stage}</Text>
                                    <Text style={styles.stageQty}>{s.qty}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </Sheet>

                {/* Authorize confirmation */}
                <Sheet
                    open={authModalVisible}
                    onClose={() => setAuthModalVisible(false)}
                    eyebrow="COLLECTION"
                    title="Authorize cheque"
                    wideMax={460}
                    footer={
                        <>
                            <Btn label="Cancel" kind="ghost" onPress={() => setAuthModalVisible(false)} style={{ flex: 1 }} />
                            <Btn
                                label="Confirm"
                                icon="check-circle"
                                onPress={() => confirmAuthorize()}
                                loading={!!authLoadingLocalId}
                                style={{ flex: 2 }}
                            />
                        </>
                    }
                >
                    {authTarget ? (
                        <View style={styles.authSummary}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.authParty} numberOfLines={2}>
                                    {safe(authTarget.AccName ?? authTarget.accname ?? authTarget.ParName ?? '')}
                                </Text>
                                <Text style={styles.authMeta} numberOfLines={1}>
                                    Cheque {safe(authTarget.ChqNo ?? authTarget.chqno ?? '-')} · {formatDate(authTarget.ChqDate ?? authTarget.nChqDate)}
                                </Text>
                            </View>
                            <Text style={styles.authAmount}>₹ {formatAmountDisplay(authTarget.Amount ?? authTarget.amount ?? authTarget.Amt)}</Text>
                        </View>
                    ) : null}
                    <Text style={styles.authText}>
                        Are you sure you want to authorize this collection?
                    </Text>
                    <Field
                        label="Remark (optional)"
                        value={authRemark}
                        onChangeText={setAuthRemark}
                        placeholder="Enter remark"
                        returnKeyType="done"
                    />
                </Sheet>

            </SafeAreaView>
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },

    // header (totals + tabs)
    head: { paddingTop: 10, paddingBottom: 4 },
    headInner: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: 10 },

    // list
    listContent: {
        paddingTop: 6,
        paddingBottom: 28,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
        flexGrow: 1,
    },
    gridCell: { padding: 5 },
    emptyCard: {
        margin: 5,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
    },
    loadingMore: {
        marginHorizontal: 5,
        marginTop: 6,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.sub,
        borderRadius: 10,
        gap: 8,
        minHeight: 44,
    },
    loadingMoreText: { color: T.copper, fontSize: 12, fontWeight: '800' },

    // card
    card: {
        flex: 1,
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        gap: 11,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },
    cardAuth: { borderLeftWidth: 4, borderLeftColor: T.green },
    cardOutdated: { borderLeftWidth: 4, borderLeftColor: T.muted },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    cardIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    title: { fontSize: 14.5, fontWeight: '800', color: T.ink, lineHeight: 19 },
    subtitle: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    pillDot: { width: 6, height: 6, borderRadius: 3 },
    pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
    metricBox: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: T.hair,
    },
    kvRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
        borderTopWidth: 1,
        borderTopColor: T.hair,
    },
    kvLabel: { flexShrink: 0, maxWidth: '45%', fontSize: 11.5, fontWeight: '700', color: T.muted },
    kvValue: { flex: 1, fontSize: 12.5, fontWeight: '700', color: T.ink, textAlign: 'right' },
    outdatedText: { color: T.red },
    flagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    flagChips: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionBtn: { flex: 1 },
    userChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 24,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: `${T.blue}12`,
        borderWidth: 1,
        borderColor: `${T.blue}33`,
        maxWidth: '100%',
    },
    userChipText: { fontSize: 11, fontWeight: '800', color: T.blue, flexShrink: 1 },
    warnChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 24,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: `${T.red}12`,
        borderWidth: 1,
        borderColor: `${T.red}33`,
    },
    warnChipText: { fontSize: 11, fontWeight: '800', color: T.red },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    // adjustments
    adjBox: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        overflow: 'hidden',
        backgroundColor: T.surface,
    },
    adjHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 42,
        paddingHorizontal: 10,
        backgroundColor: T.sub,
    },
    adjTitle: { fontSize: 12, fontWeight: '900', color: T.nav, letterSpacing: 0.4, textTransform: 'uppercase' },
    countPill: {
        minWidth: 22,
        height: 20,
        borderRadius: 10,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}16`,
    },
    countPillText: { fontSize: 10.5, fontWeight: '900', color: T.copper },
    adjRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderTopWidth: 1,
        borderTopColor: T.hair,
    },
    adjBill: { fontSize: 12.5, fontWeight: '700', color: T.ink },
    adjDate: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 1 },
    adjAmount: { fontSize: 12.5, fontWeight: '800', color: T.nav },
    adjTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 9,
        backgroundColor: `${T.copper}12`,
        borderTopWidth: 1,
        borderTopColor: T.border,
    },
    adjTotalLabel: { fontSize: 12, fontWeight: '900', color: T.nav },
    adjTotalAmount: { fontSize: 13.5, fontWeight: '900', color: T.pd },

    // image viewer
    fullscreen: { flex: 1, backgroundColor: 'rgba(13,27,42,0.96)', justifyContent: 'center', alignItems: 'center' },
    imageClose: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 48 : 20,
        right: 16,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
    },

    // stages
    mutedText: { color: T.muted, fontSize: 13, fontWeight: '600' },
    stageList: { borderRadius: 10, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
    stageRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: T.hair },
    stageKey: { color: T.muted, fontWeight: '700', fontSize: 13 },
    stageQty: { color: T.ink, fontWeight: '800', fontSize: 13 },

    // authorize sheet
    authSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.hair,
        padding: 10,
    },
    authParty: { fontSize: 14, fontWeight: '800', color: T.ink },
    authMeta: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },
    authAmount: { fontSize: 15, fontWeight: '900', color: T.pd },
    authText: { fontSize: 13.5, fontWeight: '600', color: T.ink, lineHeight: 19 },
});
export default CollectionCard;
