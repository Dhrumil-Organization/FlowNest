/* ChequePreview.tsx — full preview modal + SwipePreview action (NEW ERP theme) */
import { PanelHeader } from '@/src/components/erpUi';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
    Animated,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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
            <View style={[styles.d1Card, index % 2 === 1 && { backgroundColor: T.sub }]} key={String(index)}>
                <View style={styles.d1IconWrap}>
                    <Icon name="receipt-long" size={16} color={T.copper} />
                </View>

                <View style={styles.d1Center}>
                    <Text numberOfLines={1} style={styles.d1Title}>{billNo || '-'}</Text>
                    <Text numberOfLines={1} style={styles.d1Sub}>{billDate || '-'}</Text>
                </View>

                <Text style={styles.d1Amount}>₹ {formatAmountDisplay(setAmt)}</Text>
            </View>
        );
    };

    const isAuthorised = String(item.IsAuth ?? item.isauth ?? '0') === '1';

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.wrap}>
                <PanelHeader
                    onBack={onClose}
                    backLabel="Close"
                    crumbs={['Collection', 'Cheque Preview']}
                    title={safe(item.AccName) || 'Cheque Preview'}
                    subtitle={`${safe(item.PrpCode)}${item.BankName ? ` • ${safe(item.BankName)}` : ''}`}
                />

                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
                    <View style={styles.card}>
                        <View style={styles.top}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.eyebrow}>CHEQUE</Text>
                                <Text style={styles.party} numberOfLines={2}>{safe(item.AccName)}</Text>
                                <Text style={styles.small} numberOfLines={2}>{safe(item.PrpCode)} • {safe(item.BankName)}</Text>
                            </View>
                            <View style={[styles.pill, isAuthorised ? styles.pillAuth : styles.pillPending]}>
                                <Text style={[styles.pillText, { color: isAuthorised ? T.green : T.copper }]}>
                                    {isAuthorised ? 'AUTHORIZED' : 'PENDING'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.middle}>
                            <View style={styles.metaCol}>
                                <View style={styles.metaBox}>
                                    <Text style={styles.label}>Cheque No</Text>
                                    <Text style={styles.value}>{safe(item.ChqNo) || '-'}</Text>
                                </View>
                                <View style={styles.metaBox}>
                                    <Text style={styles.label}>Cheque Date</Text>
                                    <Text style={styles.value}>{formatDate(safe(item.ChqDate))}</Text>
                                </View>
                            </View>

                            <View style={styles.imageWrap}>
                                {item.AttachImage ? (
                                    <Image source={{ uri: item.AttachImage }} style={styles.image} resizeMode="cover" />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Icon name="image" size={30} color={T.muted} />
                                        <Text style={styles.noImage}>No image</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.amountBox}>
                            <Text style={styles.label}>Amount</Text>
                            <Text style={styles.amount}>₹ {formatAmountDisplay(item.Amount)}</Text>
                        </View>

                        <View>
                            <Text style={styles.label}>Remark</Text>
                            <Text style={styles.remark}>{safe(item.Remark) || '-'}</Text>
                        </View>
                    </View>

                    {/* d1 details section */}
                    <View style={styles.detailsWrap}>
                        <View style={styles.detailsHeader}>
                            <Text style={styles.detailsTitle}>Details</Text>
                            <View style={styles.countPill}>
                                <Text style={styles.countPillText}>{d1rows.length} item{d1rows.length !== 1 ? 's' : ''}</Text>
                            </View>
                        </View>

                        {d1rows.length === 0 ? (
                            <View style={styles.emptyD1}>
                                <Icon name="link-off" size={22} color={T.copper} />
                                <Text style={styles.noImage}>No linked detail rows</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={d1rows}
                                keyExtractor={(r, i) => String(r.BillNo ?? r.BILLNO ?? r.SrNo ?? i)}
                                renderItem={renderD1Row}
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
            <TouchableOpacity
                activeOpacity={0.95}
                style={swipeStyles.previewBtn}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel="Preview cheque"
            >
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
    wrap: { flex: 1, backgroundColor: T.bg },
    content: { padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
    card: {
        backgroundColor: T.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 14,
        gap: 12,
        ...S.card,
        shadowOpacity: 0.04,
        elevation: 1,
    },

    top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    party: { fontSize: 17, fontWeight: '900', color: T.ink, marginTop: 2 },
    small: { color: T.muted, marginTop: 4, fontSize: 12, fontWeight: '600' },
    pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    pillAuth: { backgroundColor: `${T.green}16`, borderColor: `${T.green}40` },
    pillPending: { backgroundColor: `${T.copper}16`, borderColor: `${T.copper}40` },
    pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

    middle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 12 },
    metaCol: { flex: 1, minWidth: 150, gap: 8 },
    metaBox: { backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.hair, padding: 10 },
    imageWrap: { flexGrow: 1, minWidth: 160, maxWidth: 360, height: 130, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: T.border, backgroundColor: T.sub },
    image: { width: '100%', height: '100%' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
    noImage: { fontSize: 11.5, fontWeight: '700', color: T.muted },

    amountBox: { backgroundColor: `${T.copper}12`, borderRadius: 10, padding: 12 },
    label: { fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
    value: { fontSize: 15, color: T.ink, fontWeight: '800', marginTop: 3 },
    amount: { fontSize: 22, fontWeight: '900', color: T.pd, marginTop: 4 },
    remark: { marginTop: 4, color: T.ink, lineHeight: 20, fontSize: 13.5 },

    /* Details (d1) */
    detailsWrap: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 12 },
    detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.hair },
    detailsTitle: { fontSize: 12, fontWeight: '900', color: T.nav, letterSpacing: 0.8, textTransform: 'uppercase' },
    countPill: { borderRadius: 11, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: `${T.copper}16` },
    countPillText: { fontSize: 11, fontWeight: '900', color: T.copper },
    emptyD1: { padding: 18, alignItems: 'center', gap: 6 },

    d1Card: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: T.hair },
    d1IconWrap: { width: 32, height: 32, borderRadius: 9, backgroundColor: `${T.copper}14`, alignItems: 'center', justifyContent: 'center' },
    d1Center: { flex: 1, minWidth: 0 },
    d1Title: { fontWeight: '800', color: T.ink, fontSize: 13 },
    d1Sub: { color: T.muted, fontSize: 11.5, marginTop: 2, fontWeight: '600' },
    d1Amount: { fontWeight: '900', color: T.nav, fontSize: 13 },
});

const swipeStyles = StyleSheet.create({
    container: { justifyContent: 'center', alignItems: 'center', marginVertical: 8, marginLeft: 8 },
    previewBtn: { width: 120, borderRadius: 14, backgroundColor: T.nav, padding: 10, alignItems: 'center', ...S.card, elevation: 4 },
    previewText: { color: '#fff', marginTop: 6, fontWeight: '700' },
    previewImageWrap: { width: 72, height: 52, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
    previewImage: { width: '100%', height: '100%' },
    previewPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    previewParty: { color: '#fff', fontWeight: '800', fontSize: 12, textAlign: 'center' },
    previewAmount: { color: T.copper, fontWeight: '900', marginTop: 6, fontSize: 13 },
});
