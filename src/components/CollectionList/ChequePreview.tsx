/* ChequePreview.tsx — full preview modal + SwipePreview action (sexier UI) */
import React from 'react';
import {
    View,
    Text,
    Modal,
    SafeAreaView,
    TouchableOpacity,
    Image,
    StyleSheet,
    Dimensions,
    Platform,
    Animated,
    ScrollView,
    FlatList,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import theme from '@/components/theme';

const { width: WINDOW_WIDTH } = Dimensions.get('window');
type POTItem = { [k: string]: any };

export const ChequePreviewModal: React.FC<{
    visible: boolean;
    item?: POTItem | null;
    onClose: () => void;
}> = ({ visible, item, onClose }) => {
    if (!item) return null;
    const safe = (v: any) => (v === null || v === undefined ? '' : String(v));
    const formatAmountDisplay = (val?: string | number) => {
        if (val === undefined || val === null || val === '') return '-';
        const n = typeof val === 'string' ? parseFloat(String(val).replace(/,/g, '')) : Number(val);
        if (isNaN(n)) return String(val);
        return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const formatDate = (d?: string) => {
        if (!d) return '-';
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
        if (/^\d{8}$/.test(d)) return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
        if (/^\d{4}-\d{2}-\d{2}/.test(d)) { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }
        const pd = new Date(d);
        if (!isNaN(pd.getTime())) {
            const dd = String(pd.getDate()).padStart(2, '0'); const mm = String(pd.getMonth() + 1).padStart(2, '0'); const yy = pd.getFullYear();
            return `${dd}/${mm}/${yy}`;
        }
        return d;
    };

    // d1 rows (may be attached by fetchBrowseData)
    const d1rows: any[] = Array.isArray(item.d1) ? item.d1 : [];

    const renderD1Row = ({ item: r, index }: { item: any; index: number }) => {
        const billDate = formatDate(r.BillDate ?? r.NBillDate ?? r.nBillDate ?? r.NVOUDATE ?? r.NVOUDATE ?? r.nVouDate);
        const billNo = safe(r.BillNo ?? r.BILLNO ?? r.BillNo ?? '');
        const setAmtRaw = r.SetAmt ?? r.BALAMT1 ?? r.SetAmt ?? r.SETAMT ?? '';
        const setAmt = String(setAmtRaw);
        return (
            <View style={styles.d1Card} key={String(index)}>
                <View style={styles.d1Left}>
                    <View style={styles.d1IconWrap}>
                        <Icon name="receipt-long" size={18} color={theme.BRAND_ACCENT} />
                    </View>
                </View>

                <View style={styles.d1Center}>
                    <Text numberOfLines={1} style={styles.d1Title}>{billNo || '-'}</Text>
                    <Text numberOfLines={1} style={styles.d1Sub}>{billDate || '-'}</Text>
                </View>

                <View style={styles.d1Right}>
                    <Text style={styles.d1Amount}>₹ {formatAmountDisplay(setAmt)}</Text>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.wrap}>
                <View style={styles.header}>
                    <Text style={styles.title}>Cheque Preview</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name="close" size={26} color={theme.BRAND_ACCENT} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    <View style={styles.card}>
                        <View style={styles.top}>
                            <Text style={styles.party}>{safe(item.AccName)}</Text>
                            <Text style={styles.small}>{safe(item.PrpCode)} • {safe(item.BankName)}</Text>
                        </View>

                        <View style={styles.middle}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Cheque No</Text>
                                <Text style={styles.value}>{safe(item.ChqNo) || '-'}</Text>

                                <Text style={[styles.label, { marginTop: 12 }]}>Cheque Date</Text>
                                <Text style={styles.value}>{formatDate(safe(item.ChqDate))}</Text>
                            </View>

                            <View style={styles.imageWrap}>
                                {item.AttachImage ? (
                                    <Image source={{ uri: item.AttachImage }} style={styles.image} resizeMode="cover" />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Icon name="image" size={32} color="#cfcfcf" />
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.bottom}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                    <Text style={styles.label}>Amount</Text>
                                    <Text style={styles.amount}>₹ {formatAmountDisplay(item.Amount)}</Text>
                                </View>

                                <View style={styles.badgeRound}>
                                    <Text style={{ color: '#fff', fontWeight: '800' }}>View</Text>
                                </View>
                            </View>

                            <Text style={[styles.label, { marginTop: 12 }]}>Remark</Text>
                            <Text style={styles.remark}>{safe(item.Remark) || '-'}</Text>
                        </View>
                    </View>

                    {/* d1 details section */}
                    <View style={{ height: 12 }} />

                    <View style={styles.detailsWrap}>
                        <View style={styles.detailsHeader}>
                            <Text style={styles.detailsTitle}>Details</Text>
                            <Text style={styles.detailsCount}>{d1rows.length} item{d1rows.length !== 1 ? 's' : ''}</Text>
                        </View>

                        {d1rows.length === 0 ? (
                            <View style={styles.emptyD1}>
                                <Text style={{ color: theme.TEXT_SECONDARY }}>No linked detail rows</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={d1rows}
                                keyExtractor={(r, i) => String(r.BillNo ?? r.BILLNO ?? r.SrNo ?? i)}
                                renderItem={renderD1Row}
                                ItemSeparatorComponent={() => <View style={styles.sep} />}
                                scrollEnabled={false} // keep modal scroll parent - card list won't have its own scroll
                            />
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

export default ChequePreviewModal;

/* SwipePreview component used by Swipeable renderRightActions */
export const SwipePreview: React.FC<{
    progress: any;
    item?: POTItem | null;
    onPress?: () => void;
}> = ({ progress, item, onPress }) => {
    // animated entry by progress
    const scale = progress && progress.interpolate
        ? progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1], extrapolate: 'clamp' })
        : 1;
    const opacity = progress && progress.interpolate
        ? progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1], extrapolate: 'clamp' })
        : 1;

    const safe = (v: any) => (v === null || v === undefined ? '' : String(v));
    const amount = safe(item?.Amount ?? item?.amount ?? item?.Amt);
    const party = safe(item?.AccName ?? item?.accname ?? item?.ParName);

    return (
        <Animated.View style={[swipeStyles.container, { transform: [{ scale }], opacity }]}>
            <TouchableOpacity activeOpacity={0.95} style={swipeStyles.previewBtn} onPress={onPress}>
                {/* small image */}
                <View style={swipeStyles.previewImageWrap}>
                    {item?.AttachImage ? (
                        <Image source={{ uri: item.AttachImage }} style={swipeStyles.previewImage} />
                    ) : (
                        <View style={swipeStyles.previewPlaceholder}>
                            <Icon name="image" size={22} color="#fff" />
                        </View>
                    )}
                </View>

                <View style={{ marginTop: 8, alignItems: 'center' }}>
                    <Text style={swipeStyles.previewParty} numberOfLines={2}>{party}</Text>
                    <Text style={swipeStyles.previewAmount}>₹ {amount}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: theme.BG || '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: theme.BG },
    title: { fontSize: 18, fontWeight: '900', color: theme.BRAND_DARK },
    card: { backgroundColor: theme.SURFACE, margin: 16, borderRadius: 12, padding: 14, shadowColor: theme.SHADOW, elevation: 4 },

    top: { marginBottom: 10 },
    party: { fontSize: 18, fontWeight: '900', color: theme.BRAND_DARK },
    small: { color: theme.TEXT_SECONDARY, marginTop: 6 },

    middle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    imageWrap: { width: 160, height: 110, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#eee', marginLeft: 12 },
    image: { width: '100%', height: '100%' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

    bottom: { marginTop: 12 },
    label: { color: theme.TEXT_SECONDARY, fontWeight: '700' },
    value: { fontSize: 15, color: theme.BRAND_DARK, fontWeight: '800', marginTop: 4 },
    amount: { fontSize: 20, fontWeight: '900', color: theme.BRAND_ACCENT, marginTop: 6 },
    remark: { marginTop: 6, color: theme.BRAND_DARK, lineHeight: 20 },

    badgeRound: { backgroundColor: theme.BRAND_ACCENT, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    /* Details (d1) */
    detailsWrap: { marginHorizontal: 16, marginBottom: 24, backgroundColor: theme.SURFACE, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f0f0f0' },
    detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    detailsTitle: { fontSize: 14, fontWeight: '900', color: theme.BRAND_DARK },
    detailsCount: { color: theme.TEXT_SECONDARY, fontWeight: '700' },
    emptyD1: { padding: 14, alignItems: 'center' },

    d1Card: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6 },
    d1Left: { width: 36, alignItems: 'center', justifyContent: 'center' },
    d1IconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' },
    d1Center: { flex: 1, paddingHorizontal: 8 },
    d1Title: { fontWeight: '800', color: theme.BRAND_DARK },
    d1Sub: { color: theme.TEXT_SECONDARY, fontSize: 12, marginTop: 2 },
    d1Right: { minWidth: 100, alignItems: 'flex-end' },
    d1Amount: { fontWeight: '900', color: theme.BRAND_ACCENT },

    sep: { height: 1, backgroundColor: 'rgba(0,0,0,0.03)' },
});

const swipeStyles = StyleSheet.create({
    container: { justifyContent: 'center', alignItems: 'center', marginVertical: 12, marginRight: 12 },
    previewBtn: { width: 120, borderRadius: 12, backgroundColor: theme.BRAND_ACCENT, padding: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
    previewText: { color: '#fff', marginTop: 6, fontWeight: '700' },
    previewImageWrap: { width: 72, height: 52, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
    previewImage: { width: '100%', height: '100%' },
    previewPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    previewParty: { color: '#fff', fontWeight: '800', fontSize: 12, textAlign: 'center' },
    previewAmount: { color: '#fff', fontWeight: '700', marginTop: 6, fontSize: 13 },
});
