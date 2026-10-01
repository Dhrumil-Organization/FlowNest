import { API } from '@/common/API/dynamicAPI';
import { isWeb } from '@/src/platform/runtime';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { WebView } from 'react-native-webview';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type Props = {
    visible: boolean;
    item: any | null;
    token: string;
    onClose: () => void;
    onApprove: () => void;
    onReject: () => void;
    onViewCosting: (costingItem: any) => void;
};

const toNumber = (value: any): number => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
};

const money = (value: any): string =>
    `₹${toNumber(value).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

const qty = (value: any): string =>
    toNumber(value).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
    });

const pct = (value: any): string =>
    `${toNumber(value).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}%`;

const first = (...values: any[]) => {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
};

const ProductionOrderAuthorizationReviewModal: React.FC<Props> = ({
    visible,
    item,
    token,
    onClose,
    onApprove,
    onReject,
    onViewCosting
}) => {
    const [expandedLegacyCosting, setExpandedLegacyCosting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [detail, setDetail] = useState<any | null>(null);

    useEffect(() => {
        setExpandedLegacyCosting(false);
    }, [visible, item?.uid]);

    useEffect(() => {
        if (!visible || !item?.uid) {
            if (!visible) {
                setDetail(null);
                setError('');
                setLoading(false);
            }
            return;
        }

        let cancelled = false;

        (async () => {
            setLoading(true);
            setError('');
            setDetail(null);

            try {
                const response = await axios.get(`${API}/api/prodorderwebnew/show`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    params: {
                        uid: item.uid,
                        prpcode: item.prpcode,
                        yearno: item.yearno,
                        strcode: first(item.greystrcode, item.strcode, '012'),
                        action: 'view',
                        txntype: 'production_order_sudo'
                    }
                });

                if (!response?.data?.success) {
                    throw new Error(response?.data?.message || 'Production Order could not be loaded.');
                }

                if (!cancelled) setDetail(response.data.data || {});
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.response?.data?.message || e?.message || 'Production Order could not be loaded.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [visible, item?.uid, item?.prpcode, item?.yearno, item?.greystrcode, item?.strcode, token]);

    const model = useMemo(() => {
        const data = detail || {};
        const main = (Array.isArray(data.main) && data.main[0]) || item || {};
        const meta = data.webmeta || {};
        const d1 = Array.isArray(data.d1) ? data.d1 : [];
        const snapshot = data.stock_costing_snapshot && typeof data.stock_costing_snapshot === 'object'
            ? data.stock_costing_snapshot
            : null;

        const mode = String(first(data.source_mode, snapshot ? 'self' : '', Number(main.prodtype) === 1 ? 'sales' : 'self')).toLowerCase();
        const isStockSell = mode === 'self';
        const fabricType = String(first(data.fabric_type, snapshot?.fabric_type, main.stktype === 'I' ? 'Greige' : 'Finish'));
        const isFinish = fabricType.toLowerCase() !== 'greige';

        const finishedQty = toNumber(first(meta.base_qty, main.orderqty, 0));
        const greigeQty = toNumber(first(
            meta.manual_greige_qty,
            meta.stock_sell_total_qty,
            main.totqty,
            item?.qty,
            0
        ));

        const rates = snapshot?.rates || {};
        const derived = snapshot?.derived || {};
        const yarns = Array.isArray(rates.yarns) ? rates.yarns : [];

        const d1Commercial = d1.map((row: any) => ({
            no: first(row.sono, row.SONo, row.jono, row.JONo, row.souid),
            party: first(row.parname, row.ParName, row.partyname),
            qty: toNumber(first(row.soqty, row.SOQty, row.qty, row.Qty)),
            rate: toNumber(first(row.sorate, row.SORate, row.rate, row.Rate))
        }));

        const saleQty = d1Commercial.reduce((sum: number, row: any) => sum + row.qty, 0);
        const weightedSale = saleQty > 0
            ? d1Commercial.reduce((sum: number, row: any) => sum + row.qty * row.rate, 0) / saleQty
            : toNumber(first(main.sellingrate, item?.sellingrate, item?.rate, 0));

        const greigeCost = snapshot
            ? toNumber(derived.greige_cost)
            : toNumber(first(main.greyrate, main.rate, item?.rate, 0));

        const finishedCost = snapshot
            ? toNumber(first(derived.finished_cost, derived.greige_cost))
            : toNumber(first(main.finishrate, main.rate, item?.rate, 0));

        const approvalCost = isFinish ? finishedCost : greigeCost;
        const margin = !isStockSell && weightedSale > 0 && approvalCost > 0
            ? weightedSale - approvalCost
            : null;

        // SO-based authorization must review the exact costing reference already
        // attached to the Production Order. Never infer a cost from the sale rate.
        const costingSource = String(first(
            data.design_costing_source,
            meta.design_costing_source,
            main.design_costing_source,
            item?.design_costing_source,
            'LEGACY'
        )).trim().toUpperCase();
        const costingItem = {
            ...item,
            ...main,
            prpcode: first(main.prpcode, main.PrpCode, item?.prpcode),
            yearno: first(main.yearno, main.YearNo, item?.yearno),
            dsncode: first(main.dsncode, main.DsnCode, item?.dsncode),
            dsnname: first(main.dsnname, main.DsnName, item?.dsnname),
            design_costing_source: costingSource,
            md_id: first(data.md_id, meta.md_id, main.md_id, item?.md_id),
            design_costing_id: first(
                data.design_costing_id,
                meta.design_costing_id,
                main.design_costing_id,
                item?.design_costing_id
            ),
            costuid: first(main.costuid, item?.costuid),
            costdsncode: first(main.costdsncode, item?.costdsncode),
            costdsnname: first(main.costdsnname, item?.costdsnname),
            costdate: first(main.costdate, item?.costdate)
        };
        const costingAvailable = costingSource === 'NEW'
            ? !!String(costingItem.md_id || '').trim() && !!String(costingItem.design_costing_id || '').trim()
            : toNumber(costingItem.costuid) > 0;

        return {
            data,
            main,
            meta,
            snapshot,
            mode,
            isStockSell,
            fabricType,
            isFinish,
            finishedQty,
            greigeQty,
            rates,
            derived,
            yarns,
            d1Commercial,
            weightedSale,
            greigeCost,
            finishedCost,
            approvalCost,
            margin,
            belowCost: false,
            costingSource,
            costingItem,
            costingAvailable
        };
    }, [detail, item]);

    const Row = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => (
        <View style={[styles.row, strong && styles.strongRow]}>
            <Text style={[styles.rowLabel, strong && styles.strongText]}>{label}</Text>
            <Text style={[styles.rowValue, strong && styles.strongText]}>{value}</Text>
        </View>
    );

    const Chip = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
        <View style={[styles.chip, accent && styles.chipAccent]}>
            <Text style={styles.chipLabel}>{label}</Text>
            <Text style={[styles.chipValue, accent && styles.chipValueAccent]}>{value}</Text>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.root}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                        <Icon name="arrow-back" size={23} color="#17324A" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Production Order Authorization</Text>
                        <Text style={styles.headerSub}>
                            {item?.vouno || ''}{item?.voudate ? ` · ${item.voudate}` : ''}
                        </Text>
                    </View>
                    <View style={[
                        styles.modeBadge,
                        model.isStockSell ? styles.stockBadge : styles.soBadge
                    ]}>
                        <Text style={[
                            styles.modeBadgeText,
                            { color: model.isStockSell ? '#6F4B8B' : '#2A6044' }
                        ]}>
                            {model.isStockSell ? 'STOCK & SELL' : 'SO BASED'}
                        </Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#17324A" />
                        <Text style={styles.loadingText}>Loading saved Production Order costing...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.center}>
                        <Icon name="error-outline" size={40} color="#B42318" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.secondaryButton}>
                            <Text style={styles.secondaryButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
                            <View style={styles.titleCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.designTitle}>
                                        {model.main?.dsncode ? `${model.main.dsncode} · ` : ''}
                                        {model.main?.dsnname || item?.dsnname || 'Production Order'}
                                    </Text>
                                    <Text style={styles.designSub}>
                                        {[model.main?.itmname || item?.itmname, model.main?.shdname || item?.shdname]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </Text>
                                </View>
                                <View style={styles.fabricBadge}>
                                    <Text style={styles.fabricBadgeText}>{String(model.fabricType).toUpperCase()}</Text>
                                </View>
                            </View>

                            <View style={styles.chipGrid}>
                                {model.isFinish && model.finishedQty > 0 && (
                                    <Chip label="FINISHED" value={`${qty(model.finishedQty)} m`} />
                                )}
                                <Chip label="GREIGE" value={`${qty(model.greigeQty)} m`} />
                                <Chip
                                    label="PO OWNER"
                                    value={first(model.main?.sexename, item?.sexename, '—')}
                                />
                            </View>

                            {model.isStockSell ? (
                                <View style={styles.infoStock}>
                                    <Text style={styles.infoStockText}>
                                        Stock order — verify the saved PO costing below while approving.
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.infoSo}>
                                    <Text style={styles.infoSoText}>
                                        ✓ Costing verified at Sales-Order approval — approve production only.
                                    </Text>
                                </View>
                            )}

                            {model.isStockSell && model.snapshot && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>COSTING BASIS · SAVED WITH THIS PO</Text>
                                    <Row
                                        label="Source"
                                        value={
                                            String(model.snapshot.costing_source || '').toUpperCase() === 'LEGACY'
                                                ? 'Legacy costing'
                                                : 'Saved design costing'
                                        }
                                    />
                                    {!!first(model.main?.costdate, item?.costdate) && (
                                        <Row label="Costing date" value={first(model.main?.costdate, item?.costdate)} />
                                    )}
                                    {!!first(model.main?.sampleno, item?.sampleno) && (
                                        <Row label="Sample" value={first(model.main?.sampleno, item?.sampleno)} />
                                    )}
                                </View>
                            )}

                            {model.isStockSell && model.snapshot ? (
                                <>
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>INPUT RATES · SAVED WITH THIS PO</Text>
                                        {model.yarns.length > 0 && (
                                            <>
                                                <Text style={styles.subTitle}>YARN RATES (₹/KG)</Text>
                                                {model.yarns.map((yarn: any, index: number) => (
                                                    <View key={`${yarn.key || index}`} style={styles.yarnRow}>
                                                        <View style={{ flex: 1, minWidth: 0 }}>
                                                            <Text style={styles.yarnName} numberOfLines={1}>
                                                                {[yarn.direction, yarn.name].filter(Boolean).join(' · ')}
                                                            </Text>
                                                            {!!yarn.shade && <Text style={styles.yarnShade}>{yarn.shade}</Text>}
                                                        </View>
                                                        <Text style={styles.yarnRate}>{money(yarn.rate)}/kg</Text>
                                                    </View>
                                                ))}
                                            </>
                                        )}
                                        <Row label="Weaving rate" value={`${money(model.rates.weaving_rate)}/pick`} />
                                        {model.isFinish && (
                                            <Row label="Processing / finishing" value={`${money(model.rates.processing_rate)}/m`} />
                                        )}
                                        {model.isFinish && (
                                            <Row label="Finished brokerage" value={pct(model.rates.finished_brokerage_pct)} />
                                        )}
                                        {model.isFinish && (
                                            <Row label="Cut & pack" value={`${money(model.rates.cut_pack_rate)}/m`} />
                                        )}
                                        {!model.isFinish && (
                                            <Row label="Greige brokerage" value={pct(model.rates.greige_brokerage_pct)} />
                                        )}
                                    </View>

                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>COSTING BREAKUP · SAVED SNAPSHOT</Text>
                                        <Row label="Yarn cost" value={`${money(model.derived.yarn_cost)}/m`} />
                                        <Row label="Weaving cost" value={`${money(model.derived.weaving_cost)}/m`} />
                                        <Row label="Total greige cost" value={`${money(model.derived.greige_cost)}/m`} strong />
                                        {model.isFinish && (
                                            <>
                                                <Row label="Shrinkage gross-up" value={`${money(model.derived.shrink_impact)}/m`} />
                                                <Row label="Processing / finishing" value={`${money(model.derived.processing_cost)}/m`} />
                                                {toNumber(model.derived.finished_brokerage_amt) > 0 && (
                                                    <Row label="Finished brokerage" value={`${money(model.derived.finished_brokerage_amt)}/m`} />
                                                )}
                                                {toNumber(model.derived.cut_pack_cost) > 0 && (
                                                    <Row label="Cut & pack" value={`${money(model.derived.cut_pack_cost)}/m`} />
                                                )}
                                                <Row label="Total finished cost" value={`${money(model.derived.finished_cost)}/m`} strong />
                                            </>
                                        )}
                                    </View>

                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>REALISATION PER GREIGE METRE · PLANNED</Text>
                                        <View style={styles.chipGrid}>
                                            <Chip label="GREIGE COST" value={`${money(model.greigeCost)}/m`} />
                                            <Chip label="SALE REALISATION" value="Not realised" accent />
                                            <Chip label="PLANNED MARGIN" value="Pending sale" />
                                        </View>
                                        <View style={styles.stockNotice}>
                                            <Text style={styles.stockNoticeText}>
                                                Stock {qty(model.greigeQty)} m planned at cost — no realisation until sold.
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>COMMERCIAL APPROVAL SUMMARY</Text>
                                    <View style={styles.chipGrid}>
                                        <Chip
                                            label="WTD AVG SALE"
                                            value={model.weightedSale > 0 ? `${money(model.weightedSale)}/m` : '—'}
                                            accent
                                        />
                                        <Chip label="APPROVAL SCOPE" value="Production only" />
                                    </View>

                                    <View style={styles.costingCard}>
                                        <View style={styles.costingHeader}>
                                            <View style={styles.costingHeaderText}>
                                                <Text style={styles.costingEyebrow}>COSTING USED BY THIS PO</Text>
                                                <Text style={styles.costingTitle}>
                                                    {model.costingAvailable
                                                        ? 'Saved costing reference'
                                                        : 'Costing reference missing'}
                                                </Text>
                                            </View>
                                            <View style={[
                                                styles.costingTypeBadge,
                                                model.costingSource === 'NEW' ? styles.costingTypeBadgeNew : styles.costingTypeBadgeLegacy
                                            ]}>
                                                <Text style={[
                                                    styles.costingTypeBadgeText,
                                                    model.costingSource === 'NEW' ? styles.costingTypeBadgeTextNew : styles.costingTypeBadgeTextLegacy
                                                ]}>
                                                    {model.costingSource === 'NEW' ? 'NEW COSTING' : 'LEGACY COSTING'}
                                                </Text>
                                            </View>
                                        </View>

                                        {model.costingAvailable ? (
                                            <>
                                                <View style={styles.costingFacts}>
                                                    <View style={styles.costingFact}>
                                                        <Text style={styles.costingFactLabel}>
                                                            {model.costingSource === 'NEW' ? 'COSTING REF' : 'COST UID'}
                                                        </Text>
                                                        <Text style={styles.costingFactValue} numberOfLines={1}>
                                                            {model.costingSource === 'NEW'
                                                                ? String(model.costingItem.design_costing_id || '—')
                                                                : String(model.costingItem.costuid || '—')}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.costingFact, styles.costingFactWide]}>
                                                        <Text style={styles.costingFactLabel}>COSTING DESIGN</Text>
                                                        <Text style={styles.costingFactValue} numberOfLines={1}>
                                                            {first(model.costingItem.costdsnname, model.costingItem.dsnname, '—')}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.costingFact}>
                                                        <Text style={styles.costingFactLabel}>COSTING DATE</Text>
                                                        <Text style={styles.costingFactValue} numberOfLines={1}>
                                                            {first(model.costingItem.costdate, '—')}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <TouchableOpacity
                                                    style={styles.costingReviewButton}
                                                    onPress={() => {
                                                        if (model.costingSource === 'LEGACY') {
                                                            setExpandedLegacyCosting((current) => !current);
                                                        } else {
                                                            onViewCosting(model.costingItem);
                                                        }
                                                    }}
                                                    activeOpacity={0.78}
                                                >
                                                    <Icon name="visibility" size={18} color="#17324A" />
                                                    <Text style={styles.costingReviewButtonText}>
                                                        {model.costingSource === 'LEGACY' && expandedLegacyCosting ? 'Hide costing' : 'Review costing'}
                                                    </Text>
                                                    <Icon
                                                        name={model.costingSource === 'LEGACY' && expandedLegacyCosting ? 'expand-less' : 'expand-more'}
                                                        size={19}
                                                        color="#6B7280"
                                                    />
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <View style={styles.costingMissing}>
                                                <Icon name="error-outline" size={18} color="#B42318" />
                                                <Text style={styles.costingMissingText}>
                                                    The exact costing reference used by this Production Order is missing. Authorization is blocked until the PO costing link is available.
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {model.costingAvailable && model.costingSource === 'LEGACY' && expandedLegacyCosting && (
                                        <View style={styles.embeddedCostingSection}>
                                            <View style={styles.embeddedCostingHeader}>
                                                <View>
                                                    <Text style={styles.embeddedCostingEyebrow}>COSTING DETAILS</Text>
                                                    <Text style={styles.embeddedCostingTitle}>Estimated Fabric Cost</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.embeddedCostingClose}
                                                    onPress={() => setExpandedLegacyCosting(false)}
                                                    activeOpacity={0.75}
                                                >
                                                    <Icon name="keyboard-arrow-up" size={18} color="#475569" />
                                                    <Text style={styles.embeddedCostingCloseText}>Collapse</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.embeddedCostingFrame}>
                                                {isWeb() ? (
                                                    React.createElement('iframe', {
                                                        title: 'Production Order Costing',
                                                        src: `https://ind.tms-webapp.com/app-weavingtemplete/${model.costingItem.prpcode}/${model.costingItem.yearno}/${model.costingItem.costuid}/production_order_sudo`,
                                                        style: {
                                                            width: '100%',
                                                            height: '900px',
                                                            border: 'none',
                                                            backgroundColor: '#ffffff'
                                                        }
                                                    })
                                                ) : (
                                                    <WebView
                                                        source={{ uri: `https://ind.tms-webapp.com/app-weavingtemplete/${model.costingItem.prpcode}/${model.costingItem.yearno}/${model.costingItem.costuid}/production_order_sudo` }}
                                                        style={styles.embeddedCostingWebView}
                                                        startInLoadingState
                                                        renderLoading={() => (
                                                            <View style={styles.embeddedCostingLoading}>
                                                                <ActivityIndicator size="large" color="#17324A" />
                                                                <Text style={styles.loadingText}>Loading saved costing...</Text>
                                                            </View>
                                                        )}
                                                    />
                                                )}
                                            </View>
                                        </View>
                                    )}

                                    {model.d1Commercial.length > 0 && (
                                        <View style={{ marginTop: 10 }}>
                                            {model.d1Commercial.map((row: any, index: number) => (
                                                <View key={`${row.no}-${index}`} style={styles.soRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.soNo}>{row.no || `SO ${index + 1}`}</Text>
                                                        {!!row.party && <Text style={styles.soParty} numberOfLines={1}>{row.party}</Text>}
                                                    </View>
                                                    <Text style={styles.soValue}>
                                                        {qty(row.qty)} m · {money(row.rate)}/m
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}

                            {!!first(model.main?.remarks1, item?.remark) && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>PRODUCTION REMARK</Text>
                                    <Text style={styles.remarkText}>{first(model.main?.remarks1, item?.remark)}</Text>
                                </View>
                            )}

                            <View style={{ height: 16 }} />
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
                                <Icon name="close" size={20} color="#B42318" />
                                <Text style={styles.rejectText}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.approveButton, (!model.isStockSell && !model.costingAvailable) && { opacity: 0.45 }]}
                                onPress={onApprove}
                                disabled={!model.isStockSell && !model.costingAvailable}
                            >
                                <Icon name="check" size={20} color="#FFFFFF" />
                                <Text style={styles.approveText}>Approve order</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F7FA' },
    header: {
        paddingTop: 44,
        paddingHorizontal: 12,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    headerButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6'
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#172033' },
    headerSub: { fontSize: 10.5, color: '#6B7280', marginTop: 2 },
    modeBadge: { borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5 },
    stockBadge: { backgroundColor: '#F1EAF8' },
    soBadge: { backgroundColor: '#EAF4EE' },
    modeBadgeText: { fontSize: 9.5, fontWeight: '800' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    loadingText: { marginTop: 12, fontSize: 12, color: '#6B7280' },
    errorText: { marginTop: 10, fontSize: 12, color: '#B42318', textAlign: 'center' },
    content: { padding: 12, paddingBottom: 24 },
    titleCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 13,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    designTitle: { fontSize: 15, fontWeight: '800', color: '#172033' },
    designSub: { marginTop: 3, fontSize: 10.5, color: '#6B7280' },
    fabricBadge: { borderRadius: 13, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: '#FFF4E8' },
    fabricBadgeText: { fontSize: 9, fontWeight: '800', color: '#B76E21' },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    chip: {
        flexGrow: 1,
        minWidth: 96,
        borderRadius: 9,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 9
    },
    chipAccent: { backgroundColor: '#FFF8F0', borderColor: '#E8C6A2' },
    chipLabel: { fontSize: 8.5, fontWeight: '800', color: '#7B8492' },
    chipValue: { fontSize: 12, fontWeight: '800', color: '#172033', marginTop: 3 },
    chipValueAccent: { color: '#B76E21' },
    infoStock: { marginTop: 10, borderRadius: 9, backgroundColor: '#F6F0FA', padding: 9 },
    infoStockText: { fontSize: 10.5, fontWeight: '800', color: '#6F4B8B' },
    infoSo: { marginTop: 10, borderRadius: 9, backgroundColor: '#EEF7F1', padding: 9 },
    infoSoText: { fontSize: 10.5, fontWeight: '700', color: '#2A6044' },
    section: {
        marginTop: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#6B7280',
        letterSpacing: 0.35,
        marginBottom: 5
    },
    subTitle: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#7B8492',
        marginTop: 4,
        marginBottom: 3
    },
    row: {
        minHeight: 34,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#EEF0F3'
    },
    strongRow: { borderTopWidth: 1.2, borderTopColor: '#D7DCE2' },
    rowLabel: { flex: 1, fontSize: 11.5, color: '#6B7280' },
    rowValue: { fontSize: 11.5, fontWeight: '700', color: '#172033', textAlign: 'right' },
    strongText: { color: '#172033', fontWeight: '800', fontSize: 12 },
    yarnRow: {
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#EEF0F3'
    },
    yarnName: { fontSize: 11.5, fontWeight: '700', color: '#172033' },
    yarnShade: { fontSize: 9.5, color: '#8A93A0', marginTop: 1 },
    yarnRate: { fontSize: 11.5, fontWeight: '800', color: '#172033' },
    stockNotice: { marginTop: 9, backgroundColor: '#F1EAF8', borderRadius: 8, padding: 8 },
    stockNoticeText: { fontSize: 10.5, fontWeight: '700', color: '#6F4B8B' },
    soRow: {
        minHeight: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#EEF0F3'
    },
    soNo: { fontSize: 11.5, fontWeight: '800', color: '#172033' },
    soParty: { fontSize: 9.5, color: '#7B8492', marginTop: 1 },
    soValue: { fontSize: 10.5, fontWeight: '700', color: '#172033' },
    costingCard: {
        marginTop: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 11,
        padding: 12,
        borderWidth: 1,
        borderColor: '#DDE3EA'
    },
    costingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
    },
    costingHeaderText: { flex: 1, minWidth: 0 },
    costingEyebrow: {
        fontSize: 9,
        fontWeight: '800',
        color: '#6B7280',
        letterSpacing: 0.45
    },
    costingTitle: {
        marginTop: 3,
        fontSize: 13,
        fontWeight: '800',
        color: '#172033'
    },
    costingTypeBadge: {
        borderRadius: 12,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderWidth: 1
    },
    costingTypeBadgeLegacy: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
    costingTypeBadgeNew: { backgroundColor: '#EEF7F1', borderColor: '#CFE5D6' },
    costingTypeBadgeText: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.25 },
    costingTypeBadgeTextLegacy: { color: '#B45309' },
    costingTypeBadgeTextNew: { color: '#2A6044' },
    costingFacts: {
        marginTop: 11,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    costingFact: {
        flexGrow: 1,
        flexBasis: 150,
        minWidth: 130,
        backgroundColor: '#FFFFFF',
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 10,
        paddingVertical: 9
    },
    costingFactWide: { flexGrow: 2, flexBasis: 220 },
    costingFactLabel: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#8A93A0',
        letterSpacing: 0.3
    },
    costingFactValue: {
        marginTop: 3,
        fontSize: 12,
        fontWeight: '800',
        color: '#172033'
    },
    costingReviewButton: {
        marginTop: 10,
        minHeight: 40,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingHorizontal: 13,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#FFFFFF'
    },
    costingReviewButtonText: {
        color: '#17324A',
        fontSize: 11.5,
        fontWeight: '800'
    },
    costingMissing: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderRadius: 9,
        padding: 10,
        backgroundColor: '#FFF1F0',
        borderWidth: 1,
        borderColor: '#F3C7C3'
    },
    costingMissingText: {
        flex: 1,
        fontSize: 10.5,
        lineHeight: 15,
        fontWeight: '700',
        color: '#B42318'
    },
    warning: { marginTop: 10, backgroundColor: '#FFF1F0', borderRadius: 8, padding: 9 },
    warningText: { fontSize: 10.5, fontWeight: '800', color: '#B42318' },
    remarkText: { fontSize: 11, color: '#394150', lineHeight: 16 },
    footer: {
        padding: 12,
        paddingBottom: 18,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        flexDirection: 'row',
        gap: 9
    },
    rejectButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5B8B4',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6
    },
    rejectText: { color: '#B42318', fontSize: 13, fontWeight: '800' },
    approveButton: {
        flex: 1.6,
        minHeight: 46,
        borderRadius: 10,
        backgroundColor: '#2A6044',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6
    },
    approveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    secondaryButton: {
        marginTop: 14,
        minWidth: 110,
        minHeight: 42,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center'
    },
    secondaryButtonText: { color: '#172033', fontSize: 12, fontWeight: '700' },

    embeddedCostingSection: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#D7E0EA',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden'
    },
    embeddedCostingHeader: {
        minHeight: 58,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#E5EAF0',
        backgroundColor: '#F8FAFC'
    },
    embeddedCostingEyebrow: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.55,
        color: '#64748B'
    },
    embeddedCostingTitle: {
        marginTop: 2,
        fontSize: 14,
        fontWeight: '800',
        color: '#17324A'
    },
    embeddedCostingClose: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        backgroundColor: '#FFFFFF'
    },
    embeddedCostingCloseText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569'
    },
    embeddedCostingFrame: {
        width: '100%',
        minHeight: 900,
        backgroundColor: '#F5F7FA'
    },
    embeddedCostingWebView: {
        width: '100%',
        height: 900,
        backgroundColor: '#FFFFFF'
    },
    embeddedCostingLoading: {
        height: 900,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10
    },
});

export default ProductionOrderAuthorizationReviewModal;
