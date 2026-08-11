// FILE: src/screens/orders/NewOrderTab.tsx
// Extracted New Order tab — uses SearchableDropdown for all lookups.
// Drop-in replacement for the NewOrderTab function inside OrdersScreen.tsx

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { T } from '../../theme';
import { useAppStore, autoSave } from '../../stores/AppStore';
import { SearchableDropdown, DropdownItem } from '../../components/ui/SearchableDropdown';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CUSTOMERS } from '../../data/seeds';
import type { SalesOrder, FabricType } from '../../types';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SalesOrderAPI } from '@/src/api/legacyClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMobileUserPreference } from '@/hooks/useMobileUserPreference';

// ─── Dummy data (replace with real API calls when backend is ready) ───────────
// These arrays simulate 10k+ parties, 50k+ designs, 100k+ shades.
// In production: fetch from API on component mount and cache with SWR/React Query.

const DUMMY_CUSTOMERS: DropdownItem[] = [
    ...CUSTOMERS.map(c => ({ id: c.id, label: c.name, sub: c.city + ' · ' + c.exec })),
    // Simulate large dataset
    { id: 'CU06', label: 'Ludhiana Mills Pvt', sub: 'Ludhiana · Amit Singh' },
    { id: 'CU07', label: 'Coimbatore Textiles', sub: 'Coimbatore · Ravi Kumar' },
    { id: 'CU08', label: 'Bhilwara Fabrics Ltd', sub: 'Bhilwara · Suresh Jain' },
    { id: 'CU09', label: 'Ichalkaranji Weaves', sub: 'Ichalkaranji · Prakash Patil' },
    { id: 'CU10', label: 'Erode Garments Co', sub: 'Erode · Murugan R' },
    { id: 'CU11', label: 'Panipat Recyclers Ltd', sub: 'Panipat · Naresh Goel' },
    { id: 'CU12', label: 'Kolkata Cotton House', sub: 'Kolkata · Subhash Das' },
    { id: 'CU13', label: 'Hyderabad Exports', sub: 'Hyderabad · Ramesh Rao' },
    { id: 'CU14', label: 'Chennai Silk Traders', sub: 'Chennai · Venkatesh K' },
    { id: 'CU15', label: 'Pune Apparel Pvt Ltd', sub: 'Pune · Ajay Deshmukh' },
];

const DUMMY_DESIGNS: DropdownItem[] = [
    { id: 'MD01', label: 'Passat', sub: 'Linen Shirting · YD', right: 'YD' },
    { id: 'MD02', label: 'Oxford', sub: 'Linen Shirting · YD', right: 'YD' },
    { id: 'MD03', label: 'Milano', sub: 'Linen Shirting · PD', right: 'PD' },
    { id: 'MD04', label: 'Active Grid', sub: 'Sportswear · YD', right: 'YD' },
    { id: 'MD05', label: 'Mesh Track', sub: 'Sportswear · PD', right: 'PD' },
    { id: 'MD06', label: 'Monaco', sub: 'Linen Suiting · PD', right: 'PD' },
    { id: 'MD07', label: 'Vienna', sub: 'Linen Shirting · YD', right: 'YD' },
    { id: 'MD08', label: 'Florence', sub: 'Linen Suiting · PD', right: 'PD' },
    { id: 'MD09', label: 'Porto', sub: 'Sportswear · YD', right: 'YD' },
    { id: 'MD10', label: 'Verona', sub: 'Linen Shirting · YD', right: 'YD' },
    { id: 'MD11', label: 'Geneva', sub: 'Linen Suiting · PD', right: 'PD' },
    { id: 'MD12', label: 'Lisbon', sub: 'Sportswear · PD', right: 'PD' },
];

// Shades keyed by design — in production fetch /api/shades?mdId=X
const DUMMY_SHADES: Record<string, DropdownItem[]> = {
    MD01: [
        { id: 'SH01', label: 'Passat 1', sub: 'Navy · #1B2A4A' },
        { id: 'SH02', label: 'Passat 2', sub: 'Sky Blue · #5AACD9' },
        { id: 'SH03', label: 'Passat 3', sub: 'Ecru · #F0E8D8' },
        { id: 'SH04', label: 'Passat 4', sub: 'Sage · #7A9E7E' },
        { id: 'SH05', label: 'Passat 5', sub: 'Burgundy · #6D2B3D' },
        { id: 'SH16', label: 'Passat 16', sub: 'Sky Blue Alt · #5AACD9' },
        { id: 'SH20', label: 'Passat 20', sub: 'White · #FAFAFA' },
        { id: 'SH21', label: 'Passat 21', sub: 'Off-white · #F5F0E8' },
    ],
    MD02: [
        { id: 'SH30', label: 'Oxford 1', sub: 'Royal Blue · #4169E1' },
        { id: 'SH31', label: 'Oxford 2', sub: 'Charcoal · #36454F' },
        { id: 'SH32', label: 'Oxford 3', sub: 'White · #FAFAFA' },
        { id: 'SH33', label: 'Oxford 4', sub: 'Light Grey · #D3D3D3' },
    ],
    MD03: [
        { id: 'SH40', label: 'Milano Natural', sub: 'Natural · #E8DCC8' },
        { id: 'SH41', label: 'Milano Sage', sub: 'Sage · #7A9E7E' },
        { id: 'SH42', label: 'Milano Camel', sub: 'Camel · #C19A6B' },
    ],
    MD04: [
        { id: 'SH50', label: 'Active Grid 1', sub: 'Black · #1A1A1A' },
        { id: 'SH51', label: 'Active Grid 2', sub: 'White · #FAFAFA' },
        { id: 'SH52', label: 'Active Grid 3', sub: 'Navy · #1B2A4A' },
        { id: 'SH53', label: 'Active Grid 4', sub: 'Red · #CC0000' },
    ],
    MD05: [
        { id: 'SH60', label: 'Mesh Black', sub: 'Black · #1A1A1A' },
        { id: 'SH61', label: 'Mesh White', sub: 'White · #FAFAFA' },
        { id: 'SH62', label: 'Mesh Dark Grey', sub: 'Dark Grey · #404040' },
    ],
    MD06: [
        { id: 'SH70', label: 'Monaco 1', sub: 'Charcoal · #36454F' },
        { id: 'SH71', label: 'Monaco 2', sub: 'Navy · #1B2A4A' },
        { id: 'SH72', label: 'Monaco 3', sub: 'Beige · #D4B896' },
    ],
};

// Fallback shades for designs without specific shades
const DEFAULT_SHADES: DropdownItem[] = [
    { id: 'SHD01', label: 'Shade 1', sub: 'Standard colourway' },
    { id: 'SHD02', label: 'Shade 2', sub: 'Standard colourway' },
    { id: 'SHD03', label: 'Shade 3', sub: 'Standard colourway' },
    { id: 'SHD04', label: 'White', sub: 'Base white' },
    { id: 'SHD05', label: 'Off-White', sub: 'Natural base' },
    { id: 'SHD06', label: 'Black', sub: 'Standard black' },
    { id: 'SHD07', label: 'Navy', sub: 'Deep navy' },
    { id: 'SHD08', label: 'Grey', sub: 'Charcoal grey' },
];

// ─── helpers ──────────────────────────────────────────────────
const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
const rupee = (n: number) => {
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
    return `₹${Math.round(n)}`;
};
const TODAY = new Date().toISOString().slice(0, 10);

function genSO(orders: SalesOrder[]) {
    const d = TODAY.replace(/-/g, '');
    const n = String(orders.filter(o => o.soNumber.startsWith(`SO-${d}`)).length + 1).padStart(3, '0');
    return `SO-${d}-${n}`;
}

interface Props {
    token: string;
    userid?: any;
}

// ─── Component ────────────────────────────────────────────────
export function NewOrderTab({ token, userid }: Props) {
    const mains = useAppStore(s => s.mains);
    const orders = useAppStore(s => s.orders);
    const costings = useAppStore(s => s.costings);
    const addOrder = useAppStore(s => s.addOrder);
    const user = useAppStore(s => s.user);
    const { loadDefaultPreference, savePreference } = useMobileUserPreference({
        UserId: userid || 0,
        ModuleCode: 'SALES ORDER ENTRY',
        ModuleName: 'SALES ORDER',
        ScreenCode: 'SALES_ORDER_BROWSER',
        ScreenName: 'Sales Order Entry',
        token,
    });
    const [parties, setParties] = useState<any[]>([]);
    const [partyLoading, setPartyLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [custId, setCustId] = useState('');
    const [mdId, setMdId] = useState('');
    const [fabType, setFabType] = useState<FabricType>('finished');
    const [price, setPrice] = useState('');
    const [delivDate, setDelivDate] = useState('2026-07-15');
    const [designList, setDesignList] = useState<any[]>([]);
    const [designLoading, setDesignLoading] = useState(false);
    const [prpcode, setPrpCode] = useState('');
    const [yearno, setYearNo] = useState('');

    // Multi-color lines: each has a shadeId + qty
    const [colorLines, setColorLines] = useState<{ shadeId: string; shadeName: string; qty: string }[]>([
        { shadeId: '', shadeName: '', qty: '' },
    ]);


    const design = DUMMY_DESIGNS.find(d => d.id === mdId);

    // Available shades for selected design
    const shadeOptions: DropdownItem[] = DUMMY_SHADES[mdId] ?? DEFAULT_SHADES;

    // Margin hint from latest costing
    const marginHint = useMemo(() => {
        if (!mdId || !price) return null;
        const recs = costings.filter(c => c.mdId === mdId).sort((a, b) => b.ts.localeCompare(a.ts));
        if (!recs.length) return null;
        const snap = recs[0].snap;
        const cost = fabType === 'finished' && snap.hasFin ? snap.finishedPrice : snap.greigePrice;
        const p = parseFloat(price);
        if (!p) return null;
        const margin = p - cost;
        return { cost, margin, pct: (margin / p) * 100 };
    }, [mdId, price, fabType, costings]);

    // Validation
    const validLines = colorLines.filter(l => l.shadeId && parseInt(l.qty) > 0);
    const totalM = validLines.reduce((s, l) => s + (parseInt(l.qty) || 0), 0);
    const canSubmit = !!custId && !!mdId && parseFloat(price) > 0 && !!delivDate && validLines.length > 0;

    function updateLine(i: number, field: keyof typeof colorLines[0], val: string) {
        setColorLines(prev => prev.map((l, j) => j === i ? { ...l, [field]: val } : l));
    }

    function addLine() {
        setColorLines(prev => [...prev, { shadeId: '', shadeName: '', qty: '' }]);
    }

    function removeLine(i: number) {
        setColorLines(prev => prev.filter((_, j) => j !== i));
    }

    useEffect(() => {
        const loadFilterData = async () => {
            const code = await AsyncStorage.getItem('selected_prpcode');
            const year = await AsyncStorage.getItem('selected_yearno');
            setPrpCode(code || '');
            setYearNo(year ? `${year.slice(-2)}` : '');
        };
        loadFilterData();
    }, []);

    const loadParties = useCallback(async () => {
        // if (!prpcode) return;
        try {
            setPartyLoading(true);
            const userPtype = await AsyncStorage.getItem('user_prptype');
            const res = await SalesOrderAPI.accountBasic({
                prpcode: 'SIP', prptype: userPtype, yearno: yearno, strcode: '012',
                txntype: 'sales_order', partytype: 'p', type: 'S',
                page: '', limit: '', search: '', isceo: '', partype: '',
                grntype: '', fetch: '', acccode: '', billdate: '', strtype: '', isfaint: '',
            });
            console.log("response party", res);
            setParties(res.data?.response?.data || []);
            if (userid) {
                await savePreference({
                    CriteriaName: 'Default',
                    IsDefault: true,
                    PreferenceJson: {
                        criteria: { prpcode, yearno: yearno, strcode: '012', fromdate: '', todate: '', show_authorized: false },
                    },
                });
            }
        } catch (e) {
            setParties([]);
        } finally {
            setPartyLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prpcode, yearno, token]);

    useEffect(() => {
        if (!token) return;
        loadParties();
    }, [prpcode, yearno, token]);

    const customerItems: DropdownItem[] = useMemo(() => {
        return parties.map((item: any) => ({
            id: item.AccCode || item.acccode,
            label: item.AccName || item.accountname,
            sub: item.City || item.city || '',
        }));
    }, [parties]);

    const cust = customerItems.find(c => c.id === custId);

    function submit() {
        if (!canSubmit) return;
        // const custData = CUSTOMERS.find(c => c.id === custId);
        const custData = parties.find(
            (p: any) =>
                (p.AccCode || p.acccode) === custId
        );
        addOrder({
            soNumber: genSO(orders),
            customer: custId,
            salesExec: user?.exec ?? custData?.exec ?? 'Unknown',
            mdId,
            fabricType: fabType,
            price: parseFloat(price),
            date: TODAY,
            deliveryDate: delivDate,
            status: 'pending_auth',
            colors: validLines.map(l => ({
                color: l.shadeName,
                qty: parseInt(l.qty),
                pendingQty: parseInt(l.qty),
            })),
        });
        autoSave();
        Alert.alert('Submitted', 'Order sent for authorization.');
        // Reset
        setStep(1);
        setCustId(''); setMdId(''); setPrice('');
        setColorLines([{ shadeId: '', shadeName: '', qty: '' }]);
    }

    const StepDot = ({ n, done }: { n: number; done: boolean }) => (
        <View style={[ns.dot, { backgroundColor: done ? T.green : T.copper }]}>
            <Text style={ns.dotTxt}>{done ? '✓' : n}</Text>
        </View>
    );

    return (
        <ScrollView contentContainerStyle={ns.scroll} keyboardShouldPersistTaps="handled">
            <Card style={ns.card}>
                <TouchableOpacity style={ns.stepHead} onPress={() => setStep(1)} activeOpacity={0.7}>
                    <StepDot n={1} done={!!custId} />
                    <View style={{ flex: 1 }}>
                        <Text style={ns.stepTitle}>Property</Text>
                        {cust && <Text style={ns.stepSub}>{cust.label}</Text>}
                    </View>
                    <Text style={ns.chevron}>{step === 1 ? '▾' : '›'}</Text>
                </TouchableOpacity>

                {step === 1 && (
                    <View style={ns.stepBody}>
                        {/* <SearchableDropdown
                            label="Select customer"
                            placeholder="Search by name or city…"
                            value={custId}
                            items={DUMMY_CUSTOMERS}
                            onSelect={item => { setCustId(item.id); }}
                        /> */}
                        {partyLoading ? (
                            <ActivityIndicator color={T.copper} />
                        ) : (
                            <SearchableDropdown
                                label="Select property"
                                placeholder="Search by name or city..."
                                value={custId}
                                items={customerItems}
                                onSelect={(item) => {
                                    setCustId(item.id);
                                }}
                            />
                        )}
                        {custId && (
                            <TouchableOpacity style={ns.nextBtn} onPress={() => setStep(2)}>
                                <Text style={ns.nextBtnTxt}>Next →</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}


                {step === 2 && (
                    <View style={ns.stepBody}>
                        {/* <SearchableDropdown
                            label="Select customer"
                            placeholder="Search by name or city…"
                            value={custId}
                            items={DUMMY_CUSTOMERS}
                            onSelect={item => { setCustId(item.id); }}
                        /> */}
                        {partyLoading ? (
                            <ActivityIndicator color={T.copper} />
                        ) : (
                            <SearchableDropdown
                                label="Select customer"
                                placeholder="Search by name or city..."
                                value={custId}
                                items={customerItems}
                                onSelect={(item) => {
                                    setCustId(item.id);
                                }}
                            />
                        )}
                        {custId && (
                            <TouchableOpacity style={ns.nextBtn} onPress={() => setStep(2)}>
                                <Text style={ns.nextBtnTxt}>Next →</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </Card>

            <Card style={ns.card}>
                <TouchableOpacity style={ns.stepHead} onPress={() => setStep(2)} activeOpacity={0.7}>
                    <StepDot n={1} done={!!custId} />
                    <View style={{ flex: 1 }}>
                        <Text style={ns.stepTitle}>Customer</Text>
                        {cust && <Text style={ns.stepSub}>{cust.label}</Text>}
                    </View>
                    <Text style={ns.chevron}>{step === 2 ? '▾' : '›'}</Text>
                </TouchableOpacity>
               
                {step === 2 && (
                    <View style={ns.stepBody}>
                        {/* <SearchableDropdown
                            label="Select customer"
                            placeholder="Search by name or city…"
                            value={custId}
                            items={DUMMY_CUSTOMERS}
                            onSelect={item => { setCustId(item.id); }}
                        /> */}
                        {partyLoading ? (
                            <ActivityIndicator color={T.copper} />
                        ) : (
                            <SearchableDropdown
                                label="Select customer"
                                placeholder="Search by name or city..."
                                value={custId}
                                items={customerItems}
                                onSelect={(item) => {
                                    setCustId(item.id);
                                }}
                            />
                        )}
                        {custId && (
                            <TouchableOpacity style={ns.nextBtn} onPress={() => setStep(2)}>
                                <Text style={ns.nextBtnTxt}>Next →</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </Card>

            {/* ── Step 2: Design & fabric ── */}
            {custId && (
                <Card style={ns.card}>
                    <TouchableOpacity style={ns.stepHead} onPress={() => setStep(3)} activeOpacity={0.7}>
                        <StepDot n={2} done={!!mdId} />
                        <View style={{ flex: 1 }}>
                            <Text style={ns.stepTitle}>Design & fabric type</Text>
                            {design && <Text style={ns.stepSub}>{design.label} · {fabType}</Text>}
                        </View>
                        <Text style={ns.chevron}>{step === 2 ? '▾' : '›'}</Text>
                    </TouchableOpacity>

                    {step === 3 && (
                        <View style={ns.stepBody}>
                            <SearchableDropdown
                                label="Select design"
                                placeholder="Search by code or category…"
                                value={mdId}
                                items={DUMMY_DESIGNS}
                                onSelect={item => {
                                    setMdId(item.id);
                                    // Reset shade lines when design changes
                                    setColorLines([{ shadeId: '', shadeName: '', qty: '' }]);
                                }}
                            />
                            {mdId && (
                                <>
                                    <Text style={ns.fieldLabel}>FABRIC TYPE</Text>
                                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                                        {(['greige', 'finished'] as const).map(t => (
                                            <TouchableOpacity key={t}
                                                onPress={() => setFabType(t)}
                                                style={[ns.fabBtn, fabType === t && ns.fabBtnActive]}>
                                                <Text style={[ns.fabBtnTxt, fabType === t && { color: T.copper, fontWeight: '800' }]}>
                                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <TouchableOpacity style={ns.nextBtn} onPress={() => setStep(4)}>
                                        <Text style={ns.nextBtnTxt}>Next →</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}
                </Card>
            )}

            {/* ── Step 3: Price & delivery ── */}
            {mdId && (
                <Card style={ns.card}>
                    <TouchableOpacity style={ns.stepHead} onPress={() => setStep(4)} activeOpacity={0.7}>
                        <StepDot n={3} done={!!(price && delivDate)} />
                        <View style={{ flex: 1 }}>
                            <Text style={ns.stepTitle}>Price & delivery date</Text>
                            {price && <Text style={ns.stepSub}>₹{price}/m · due {delivDate}</Text>}
                        </View>
                        <Text style={ns.chevron}>{step === 3 ? '▾' : '›'}</Text>
                    </TouchableOpacity>

                    {step === 4 && (
                        <View style={ns.stepBody}>
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={ns.fieldLabel}>PRICE (₹/M)</Text>
                                    <TextInput value={price} onChangeText={setPrice}
                                        keyboardType="decimal-pad" placeholder="0"
                                        placeholderTextColor={T.muted} style={ns.inp} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={ns.fieldLabel}>DELIVERY DATE</Text>
                                    <TextInput value={delivDate} onChangeText={setDelivDate}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={T.muted} style={ns.inp} />
                                </View>
                            </View>

                            {/* Margin hint */}
                            {marginHint && (
                                <View style={[ns.marginBox, { borderLeftColor: marginHint.margin >= 0 ? T.green : T.red }]}>
                                    <Text style={ns.marginLabel}>EXPECTED MARGIN</Text>
                                    <Text style={[ns.marginAmt, { color: marginHint.margin >= 0 ? T.green : T.red }]}>
                                        {marginHint.margin >= 0 ? '+' : ''}{rupee(marginHint.margin)}/m
                                        · {marginHint.pct.toFixed(1)}%
                                    </Text>
                                    <Text style={ns.marginSub}>
                                        Cost ₹{Math.round(marginHint.cost)}/m · {fabType}
                                    </Text>
                                </View>
                            )}

                            {price && delivDate && (
                                <TouchableOpacity style={ns.nextBtn} onPress={() => setStep(5)}>
                                    <Text style={ns.nextBtnTxt}>Next →</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </Card>
            )}

            {/* ── Step 4: Shades & quantities ── */}
            {price && delivDate && (
                <Card style={ns.card}>
                    <TouchableOpacity style={ns.stepHead} onPress={() => setStep(5)} activeOpacity={0.7}>
                        <StepDot n={4} done={validLines.length > 0} />
                        <View style={{ flex: 1 }}>
                            <Text style={ns.stepTitle}>Shades & quantities</Text>
                            {validLines.length > 0 && (
                                <Text style={ns.stepSub}>{validLines.length} shade{validLines.length > 1 ? 's' : ''} · {fmt(totalM)} m total</Text>
                            )}
                        </View>
                        <Text style={ns.chevron}>{step === 4 ? '▾' : '›'}</Text>
                    </TouchableOpacity>

                    {step === 5 && (
                        <View style={ns.stepBody}>
                            {colorLines.map((line, i) => (
                                <View key={i} style={ns.shadeLine}>
                                    {/* Line number */}
                                    <View style={ns.lineNum}>
                                        <Text style={ns.lineNumTxt}>{i + 1}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        {/* Shade dropdown */}
                                        <SearchableDropdown
                                            label={`Shade ${i + 1}`}
                                            placeholder="Search shade / colour…"
                                            value={line.shadeId}
                                            items={shadeOptions}
                                            onSelect={item => {
                                                updateLine(i, 'shadeId', item.id);
                                                updateLine(i, 'shadeName', item.label);
                                            }}
                                        />
                                        {/* Quantity */}
                                        {line.shadeId && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={ns.fieldLabel}>QUANTITY (METRES)</Text>
                                                    <TextInput
                                                        value={line.qty}
                                                        onChangeText={v => updateLine(i, 'qty', v.replace(/[^0-9]/g, ''))}
                                                        keyboardType="number-pad"
                                                        placeholder="0"
                                                        placeholderTextColor={T.muted}
                                                        style={ns.inp}
                                                    />
                                                </View>
                                                {line.qty && (
                                                    <Text style={ns.lineTotal}>
                                                        {rupee(parseInt(line.qty) * parseFloat(price || '0'))}
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                    {/* Remove line */}
                                    {colorLines.length > 1 && (
                                        <TouchableOpacity onPress={() => removeLine(i)} style={ns.removeBtn}>
                                            <Text style={ns.removeTxt}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}

                            {/* Add shade line */}
                            <TouchableOpacity style={ns.addLineBtn} onPress={addLine}>
                                <Text style={ns.addLineTxt}>+ Add another shade</Text>
                            </TouchableOpacity>

                            {/* Total summary */}
                            {validLines.length > 0 && (
                                <View style={ns.totalBox}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={ns.totalLabel}>Total metres</Text>
                                        <Text style={ns.totalVal}>{fmt(totalM)} m</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                        <Text style={ns.totalLabel}>Order value</Text>
                                        <Text style={[ns.totalVal, { color: T.copper }]}>
                                            {rupee(totalM * parseFloat(price || '0'))}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </Card>
            )}

            {/* Submit */}
            <TouchableOpacity
                style={[ns.submitBtn, !canSubmit && { opacity: 0.4 }]}
                onPress={submit}
                disabled={!canSubmit}
                activeOpacity={0.8}
            >
                <Text style={ns.submitBtnTxt}>Submit for authorization →</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const ns = StyleSheet.create({
    scroll: { padding: 14 },
    card: { marginBottom: 12, overflow: 'hidden' },
    stepHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    stepBody: { padding: 14, paddingTop: 4, borderTopWidth: 1, borderTopColor: T.alt },
    stepTitle: { fontSize: 14, fontWeight: '700', color: T.ink },
    stepSub: { fontSize: 11, color: T.muted, marginTop: 2 },
    chevron: { fontSize: 16, color: T.muted },
    dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    dotTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
    fieldLabel: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    inp: { backgroundColor: T.surface, borderRadius: 9, borderWidth: 1.5, borderColor: T.border, padding: 12, fontSize: 14, color: T.ink, marginBottom: 14 },
    fabBtn: { flex: 1, paddingVertical: 12, borderRadius: 9, borderWidth: 2, borderColor: T.border, alignItems: 'center', backgroundColor: T.surface },
    fabBtnActive: { borderColor: T.copper },
    fabBtnTxt: { fontSize: 13, fontWeight: '600', color: T.muted },
    nextBtn: { backgroundColor: T.nav, borderRadius: 9, padding: 13, alignItems: 'center', marginTop: 4 },
    nextBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
    marginBox: { backgroundColor: T.sub, borderRadius: 9, padding: 12, marginBottom: 14, borderLeftWidth: 3 },
    marginLabel: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5 },
    marginAmt: { fontSize: 16, fontWeight: '800', marginTop: 3 },
    marginSub: { fontSize: 10, color: T.muted, marginTop: 2 },

    // Shade lines
    shadeLine: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
    lineNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: T.sub, alignItems: 'center', justifyContent: 'center', marginTop: 30, flexShrink: 0 },
    lineNumTxt: { fontSize: 11, fontWeight: '800', color: T.muted },
    lineTotal: { fontSize: 13, fontWeight: '800', color: T.green, alignSelf: 'center', marginBottom: 14 },
    removeBtn: { paddingTop: 28, paddingLeft: 4 },
    removeTxt: { fontSize: 22, color: T.red, fontWeight: '300' },
    addLineBtn: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: T.border, borderRadius: 9, padding: 12, alignItems: 'center', marginBottom: 14 },
    addLineTxt: { fontSize: 13, fontWeight: '700', color: T.copper },
    totalBox: { backgroundColor: T.sub, borderRadius: 9, padding: 12, marginBottom: 4 },
    totalLabel: { fontSize: 11, color: T.muted, fontWeight: '600' },
    totalVal: { fontSize: 14, fontWeight: '800', color: T.ink },

    submitBtn: { backgroundColor: T.copper, borderRadius: 10, padding: 15, alignItems: 'center' },
    submitBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
