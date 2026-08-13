import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { T } from '../../theme';
import { useAppStore, autoSave } from '../../stores/AppStore';
import { SearchableDropdown, DropdownItem } from '../../components/ui/SearchableDropdown';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CUSTOMERS } from '../../data/seeds';
import type { SalesOrder, FabricType } from '../../types';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { SalesOrderAPI } from '@/src/api/legacyClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMobileUserPreference } from '@/hooks/useMobileUserPreference';
import { fetchAllPropertyData, fetchPropertyData } from '@/src/api/legacyFunctions';

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
function ShadeDropdown({
    value,
    items,
    onSelect,
    placeholder = 'Search shade / colour…',
}: {
    value: string;
    items: DropdownItem[];
    onSelect: (item: DropdownItem) => void;
    placeholder?: string;
}) {
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');

    const selected = useMemo(
        () => items.find(item => String(item.id) === String(value)),
        [items, value]
    );

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;

        return items.filter(item =>
            String(item.label ?? '').toLowerCase().includes(q) ||
            String(item.id ?? '').toLowerCase().includes(q)
        );
    }, [items, search]);

    const close = () => {
        setVisible(false);
        setSearch('');
    };

    return (
        <>
            <Text style={ns.fieldLabel}>SHADE</Text>

            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setVisible(true)}
                style={ns.shadeSelectBox}
            >
                <View style={{ flex: 1 }}>
                    <Text
                        numberOfLines={1}
                        style={[
                            ns.shadeSelectText,
                            !selected && { color: T.muted },
                        ]}
                    >
                        {selected?.label || placeholder}
                    </Text>

                    {selected?.sub ? (
                        <Text style={ns.shadeSelectSub}>
                            {selected.sub}
                        </Text>
                    ) : null}
                </View>

                <Text style={ns.chevron}>▾</Text>
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={close}
            >
                <View style={ns.shadeModalOverlay}>
                    <View style={ns.shadeModalCard}>
                        <View style={ns.shadeModalHeader}>
                            <Text style={ns.shadeModalTitle}>
                                Select Shade
                            </Text>

                            <TouchableOpacity onPress={close}>
                                <Text style={ns.shadeModalClose}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            autoFocus
                            placeholder="Search shade code / name..."
                            placeholderTextColor={T.muted}
                            style={ns.shadeSearchInput}
                        />

                        <Text style={ns.shadeCountText}>
                            {filteredItems.length.toLocaleString('en-IN')} shades
                        </Text>

                        <FlatList
                            data={filteredItems}
                            keyExtractor={(item, index) =>
                                `${String(item.id)}-${index}`
                            }
                            keyboardShouldPersistTaps="handled"
                            initialNumToRender={30}
                            maxToRenderPerBatch={30}
                            windowSize={7}
                            removeClippedSubviews
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={ns.shadeOptionRow}
                                    onPress={() => {
                                        onSelect(item);
                                        close();
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            numberOfLines={1}
                                            style={ns.shadeOptionLabel}
                                        >
                                            {item.label}
                                        </Text>

                                        {item.sub ? (
                                            <Text style={ns.shadeOptionSub}>
                                                {item.sub}
                                            </Text>
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={ns.shadeEmptyBox}>
                                    <Text style={ns.shadeEmptyText}>
                                        No shade found
                                    </Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
}

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

    const [property, setProperty] = useState<any[]>([]);
    const [propertyLoading, setPropertyLoading] = useState(false);

    // Each section has its own expand/collapse state.
    // Opening one section will NOT close any other section.
    const [customerExpanded, setCustomerExpanded] = useState(true);
    const [salesExecExpanded, setSalesExecExpanded] = useState(true);
    const [designExpanded, setDesignExpanded] = useState(true);
    const [priceExpanded, setPriceExpanded] = useState(true);
    const [shadeExpanded, setShadeExpanded] = useState(true);
    const [custId, setCustId] = useState('');
    const [mdId, setMdId] = useState('');
    const [fabType, setFabType] = useState<FabricType>('finished');
    const [price, setPrice] = useState('');
    const [delivDate, setDelivDate] = useState('2026-07-15');
    const [designList, setDesignList] = useState<any[]>([]);
    const [designLoading, setDesignLoading] = useState(false);
    const [prpcode, setPrpCode] = useState('');
    const [yearno, setYearNo] = useState('');
    const [propertyData, setPropertyData] = useState([]);
    const [yearOptions, setYearOptions] = useState([]);
    const [salesExecId, setSalesExecId] = useState('');

    const [selectedExec, setSelectedExec] = useState(null);
    const [salesexecLoading, setSalesExecLoading] = useState(false);
    const [execList, setExecList] = useState([]);

    // Selected API records:
    // selectedDesign = the ITEM record returned by the first item API.
    // selectedItem = the DESIGN record returned after selecting the item.
    const [selectedDesign, setSelectedDesign] = useState<any>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const [itemList, setItemList] = useState<any[]>([]);
    const [itemLoading, setItemLoading] = useState(false);

    const [shadeList, setShadeList] = useState<any[]>([]);
    const [shadeLoading, setShadeLoading] = useState(false);

    const [latestCosting, setLatestCosting] = useState<any>(null);

    const salesExecutiveItems: DropdownItem[] = useMemo(() => {
        return (execList || []).map((item: any) => ({
            id: String(item.Code),
            label: item.SalesExecutive || item['Sales Executive'] || '',
        }));
    }, [execList]);

    // Multi-color lines: each has a shadeId + qty
    const [colorLines, setColorLines] = useState<{ shadeId: string; shadeName: string; qty: string }[]>([
        { shadeId: '', shadeName: '', qty: '' },
    ]);

    const propertyItems: DropdownItem[] = useMemo(() => {
        if (!Array.isArray(propertyData)) {
            return [];
        }

        return propertyData.map((item: any) => ({
            id: String(item.PrpCode ?? ''),
            label: item.LngName ?? '',
            sub: item.ShtName ?? '',
        }));
    }, [propertyData]);

    // First dropdown is the API ITEM list.
    // Example API record:
    // { ItmCode, ItmName, UOM, Denier, HsnCode, ... }
    const designItems: DropdownItem[] = useMemo(() => {
        return (designList || []).map((item: any) => ({
            id: String(item.ItmCode ?? item.itmcode ?? ''),
            label: item.ItmName ?? item.Itmname ?? item.itmname ?? '',
            sub: [
                item.UOM ? `UOM: ${item.UOM}` : '',
                item.Denier ? `Denier: ${item.Denier}` : '',
            ].filter(Boolean).join(' · '),
        }));
    }, [designList]);

    // Second dropdown is the DESIGN list returned by loadItems().
    const itemDesignOptions: DropdownItem[] = useMemo(() => {
        return (itemList || [])
            .map((item: any) => ({
                ...item,
                id: String(item.DsnCode ?? ''),
                label: String(item.DsnName ?? ''),
                sub: item.DsnCode
                    ? `Design Code: ${item.DsnCode}`
                    : '',
            }))
            .filter(item => item.id);
    }, [itemList]);

    // Shade API can return 13,503+ records. The data is kept in state,
    // but the dropdown below uses FlatList so only visible rows are rendered.
    const shadeOptions: DropdownItem[] = useMemo(() => {
        return (shadeList || [])
            .map((item: any) => ({
                id: String(item.ShdCode ?? ''),
                label: String(item.ShdName ?? ''),
                sub: item.ShdCode
                    ? `Shade Code: ${item.ShdCode}`
                    : '',
            }))
            .filter(item => item.id && item.label);
    }, [shadeList]);

    // Header summary is the selected ITEM record.
    const design = selectedDesign;



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
    const canSubmit = !!custId && !!salesExecId && !!selectedDesign && !!selectedItem && !!mdId && parseFloat(price) > 0 && !!delivDate && validLines.length > 0;

    function updateLine(i: number, field: keyof typeof colorLines[0], val: string) {
        setColorLines(prev => prev.map((l, j) => j === i ? { ...l, [field]: val } : l));
    }

    function addLine() {
        setColorLines(prev => [...prev, { shadeId: '', shadeName: '', qty: '' }]);
    }

    function removeLine(i: number) {
        setColorLines(prev => prev.filter((_, j) => j !== i));
    }

    console.log("token", token);

    // useEffect(() => {
    //     if (!token) return;
    //     const load = async () => {
    //         const data = await fetchPropertyData(token);
    //         setPropertyData(data || []);
    //         // if (data?.length) setSelectedProperty(data[0]);
    //     };
    //     load();
    // }, [token]);

    useEffect(() => {
        if (!token) return;

        const loadPropertyData = async () => {
            try {
                const response = await fetchAllPropertyData(token);
                console.log("token", token)

                console.log('PROPERTY API RESPONSE:', response);
                console.log('PROPERTY API RESPONSE JSON:', JSON.stringify(response, null, 2));

                setPropertyData(response || []);
            } catch (error) {
                console.error('PROPERTY API ERROR:', error);
                setPropertyData([]);
            }
        };

        loadPropertyData();

        const y = new Date().getFullYear();

        const arr: DropdownItem[] = Array.from(
            { length: 5 },
            (_, i) => {
                const year = y - i;
                return {
                    id: `${year}-${year + 1}`,
                    label: `${year}-${year + 1}`,
                };
            }
        );

        console.log('YEAR OPTIONS:', arr);

        setYearOptions(arr);
        setYearNo(arr[0].id);
    }, [token]);

    const loadParties = useCallback(async () => {
        if (!prpcode) {
            console.log('❌ Party API skipped: prpcode is empty');
            return;
        }

        try {
            setPartyLoading(true);

            const userPtype = await AsyncStorage.getItem('user_prptype');
            const apiYear = yearno
                ? yearno.split('-')[1]?.slice(-2)
                : '';


            const params = {
                prpcode: prpcode,
                prptype: userPtype,
                yearno: apiYear,
                strcode: '012',

                txntype: 'sales_order',
                partytype: 'p',
                type: 'S',

                page: '',
                limit: '',
                search: '',
                isceo: '',
                partype: '',
                grntype: '',
                fetch: '',
                acccode: '',
                billdate: '',
                strtype: '',
                isfaint: '',
            };

            const res = await SalesOrderAPI.accountBasic(params);
            console.log("party response", res);
            setParties(res.data?.response?.data || []);

        } catch (e: any) {
            console.log('MESSAGE:', e?.message);
            console.log(
                'ERROR DATA:',
                JSON.stringify(e?.response?.data, null, 2)
            );
            setParties([]);

        } finally {
            setPartyLoading(false);
        }
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
            sexe: item.sexe || item.sexe || '',
            Address: item.Address || item.address || ''
        }));
    }, [parties]);

    const cust = customerItems.find(c => c.id === custId);

    const loadSalesExec = useCallback(async () => {
        if (!prpcode) return;

        const apiYear = yearno
            ? yearno.split('-')[1]?.slice(-2)
            : '';

        const params = {
            prpcode,
            strcode: '012',
            yearno: apiYear,
            txntype: 'sales_order',
            fetch: 'salesexe',
            prptype: ''
        }
        try {
            setSalesExecLoading(true);
            const res = await SalesOrderAPI.criterion(params)

            console.log("sales exe params", params);
            console.log("sales exe res", res);

            const data = res.data?.response?.data || res.data?.response || res.data?.data || [];
            setExecList(Array.isArray(data) ? data : []);
        } catch (e) { setExecList([]); }
        finally { setSalesExecLoading(false); }
    }, [prpcode, yearno, token]);


    useEffect(() => {
        if (!token) return;
        loadSalesExec();
    }, [prpcode, yearno, token]);

    const loadDesigns = useCallback(async () => {
        if (!prpcode) return;

        const yrno = yearno
            ? yearno.split('-')[1]?.slice(-2)
            : '';

        const params = { prpcode, strcode: '012', yearno: yrno, }
        try {
            setDesignLoading(true);
            const res = await SalesOrderAPI.getItem(params)

            console.log("Item res", res);

            const data = res.data?.response?.data || res.data?.response || res.data?.data || [];
            setDesignList(Array.isArray(data) ? data : []);
        } catch (e) { setDesignList([]); }
        finally { setDesignLoading(false); }
    }, [prpcode, yearno, token]);

    useEffect(() => {
        if (!token) return;
        loadDesigns();
    }, [prpcode, yearno, token]);


    const loadItems = useCallback(async (design) => {
        if (!design?.ItmCode || !prpcode) return;

        // New ITEM selection -> old DESIGN/SHADE/COSTING must not remain.
        setSelectedItem(null);
        setItemList([]);
        setShadeList([]);
        setLatestCosting(null);
        const yrno = yearno
            ? yearno.split('-')[1]?.slice(-2)
            : '';
        const params = {
            prpcode, strcode: '012',
            yearno: yrno,
            itmcode: design.ItmCode,
            mitmcode: design.MItmCode || design.ItmCode,
            txntype: 'mob_app_sales_order',
        }
        try {
            setItemLoading(true);
            const res = await SalesOrderAPI.getDesign(params)

            console.log("design res", res, params);

            const data = res.data?.response?.data || res.data?.response || res.data?.data || [];
            setItemList(Array.isArray(data) ? data : []);
        } catch (e) { setItemList([]); }
        finally { setItemLoading(false); }
    }, [prpcode, yearno, token]);


    const loadShades = useCallback(async (design, item) => {
        if (!design?.ItmCode || !item || !prpcode) return;

        const dsncode = item.DsnCode ?? '';

        if (!dsncode) {
            console.log('❌ Shade API skipped: DsnCode is empty', item);
            return;
        }

        const yrno = yearno
            ? yearno.split('-')[1]?.slice(-2)
            : '';

        const params = {
            prpcode,
            strcode: '012',
            yearno: yrno,
            itmcode: design.ItmCode,
            mitmcode: design.MItmCode ?? design.ItmCode,
            dsncode,
        };

        try {
            setShadeLoading(true);
            setShadeList([]);

            console.log('SHADE API PARAMS:', params);

            const res = await SalesOrderAPI.getShade(params);

            const data =
                res?.data?.response?.data ??
                res?.data?.response ??
                res?.data?.data ??
                [];

            if (!Array.isArray(data)) {
                console.log('❌ Invalid SHADE API response:', data);
                setShadeList([]);
                return;
            }

            console.log('SHADE API RECORD COUNT:', data.length);

            // Keep only the fields actually required by the dropdown.
            // This prevents the extra API fields from consuming memory.
            const normalizedShades = data
                .map((item: any) => ({
                    ShdCode: String(item?.ShdCode ?? ''),
                    ShdName: String(item?.ShdName ?? ''),
                    tag: item?.tag ?? '',
                }))
                .filter((item: any) => item.ShdCode && item.ShdName);

            console.log(
                'NORMALIZED SHADE RECORD COUNT:',
                normalizedShades.length
            );

            setShadeList(normalizedShades);
        } catch (e) {
            console.log('SHADE API ERROR:', e);
            setShadeList([]);
        } finally {
            setShadeLoading(false);
        }
    }, [prpcode, yearno, token]);

    // Load latest costing — after both selected
    const loadLatestCosting = useCallback(async (design, item) => {
        if (!design?.ItmCode || !item || !prpcode) return;

        const dsncode =
            item.DsnCode ??
            item.dsncode ??
            item.DsnCode1 ??
            item.dsncode1 ??
            '';

        if (!dsncode) {
            console.log('❌ Latest costing API skipped: design code is empty', item);
            return;
        }

        const yrno = yearno
            ? yearno.split('-')[1]?.slice(-2)
            : '';

        const params = {
            prpcode,
            strcode: '012',
            yearno: yrno,
            itmcode: design.ItmCode ?? design.itmcode,
            dsncode,
        };

        try {
            console.log('LATEST COSTING API PARAMS:', params);

            // Keep the existing API method exactly as your current code uses it.
            const res = await SalesOrderAPI.getShade(params);

            const data =
                res?.data?.response?.data ??
                res?.data?.response ??
                res?.data?.data ??
                null;

            // Never keep a huge array in latestCosting.
            // If this endpoint returns a large array, keep only the first record.
            const safeCosting = Array.isArray(data)
                ? (data[0] ?? null)
                : data;

            console.log(
                'LATEST COSTING RESPONSE TYPE:',
                Array.isArray(data) ? `array:${data.length}` : typeof data
            );

            setLatestCosting(safeCosting);
        } catch (e) {
            console.log('LATEST COSTING API ERROR:', e);
            setLatestCosting(null);
        }
    }, [prpcode, yearno, token]);

    function submit() {
        if (!canSubmit) return;

        // Existing customer data lookup - kept as it was.
        const custData = parties.find(
            (p: any) =>
                (p.AccCode || p.acccode) === custId
        );

        addOrder({
            // ==============================
            // EXISTING FIELDS - DO NOT REMOVE
            // ==============================
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

            // ==============================
            // NEW ITEM API FIELDS - ADDED ONLY
            // ==============================
            itmcode:
                selectedDesign?.ItmCode ??
                selectedDesign?.itmcode ??
                '',

            hsncode:
                selectedDesign?.HsnCode ??
                selectedDesign?.hsncode ??
                '',

            itmname:
                selectedDesign?.ItmName ??
                selectedDesign?.itmname ??
                '',

            denier:
                selectedDesign?.Denier ??
                selectedDesign?.denier ??
                '',
        });

        autoSave();

        Alert.alert(
            'Submitted',
            'Order sent for authorization.'
        );

        // Reset - existing flow
        setCustomerExpanded(true);
        setSalesExecExpanded(true);
        setDesignExpanded(true);
        setPriceExpanded(true);
        setShadeExpanded(true);

        setCustId('');
        setSalesExecId('');
        setSelectedExec(null);

        setMdId('');
        setSelectedDesign(null);
        setSelectedItem(null);

        setPrice('');

        setShadeList([]);
        setLatestCosting(null);

        setColorLines([
            {
                shadeId: '',
                shadeName: '',
                qty: '',
            },
        ]);
    }

    const StepDot = ({ n, done }: { n: number; done: boolean }) => (
        <View style={[ns.dot, { backgroundColor: done ? T.green : T.copper }]}>
            <Text style={ns.dotTxt}>{done ? '✓' : n}</Text>
        </View>
    );

    return (
        <ScrollView
            contentContainerStyle={ns.scroll}
            keyboardShouldPersistTaps="handled"
        >

            {/* =========================================================
                PROPERTY & YEAR
                Always visible at the top — no accordion behaviour.
            ========================================================== */}
            <View style={ns.propertyYearTopRow}>

                {/* PROPERTY */}
                <View style={[ns.propertyTopCard, { flex: 1.45 }]}>
                    <Text style={ns.topCardLabel}>PROPERTY</Text>

                    <SearchableDropdown
                        label=""
                        placeholder="Select property"
                        value={prpcode}
                        items={propertyItems}
                        onSelect={(item) => {
                            setPrpCode(item.id);

                            // Changing property means the party selection
                            // should start fresh.
                            setCustId('');
                            setSalesExecId('');
                            setSelectedExec(null);
                            setMdId('');
                            setSelectedDesign(null);
                            setSelectedItem(null);
                            setItemList([]);
                            setShadeList([]);
                            setLatestCosting(null);
                            setPrice('');
                            setColorLines([
                                {
                                    shadeId: '',
                                    shadeName: '',
                                    qty: '',
                                },
                            ]);
                        }}
                    />
                </View>

                {/* YEAR */}
                <View style={[ns.propertyTopCard, { flex: 0.7 }]}>
                    <Text style={ns.topCardLabel}>YEAR</Text>

                    <SearchableDropdown
                        label=""
                        placeholder="Select year"
                        value={yearno}
                        items={yearOptions}
                        onSelect={(item) => {
                            setYearNo(item.id);

                            // Year change -> refresh the dependent selections.
                            setCustId('');
                            setSalesExecId('');
                            setSelectedExec(null);
                            setMdId('');
                            setSelectedDesign(null);
                            setSelectedItem(null);
                            setItemList([]);
                            setShadeList([]);
                            setLatestCosting(null);
                            setPrice('');
                            setColorLines([
                                {
                                    shadeId: '',
                                    shadeName: '',
                                    qty: '',
                                },
                            ]);
                        }}
                    />
                </View>

            </View>


            {/* =========================================================
                CUSTOMER
                Independent accordion.
            ========================================================== */}
            {prpcode && yearno && (
                <Card style={ns.card}>

                    <TouchableOpacity
                        style={ns.stepHead}
                        onPress={() =>
                            setCustomerExpanded(prev => !prev)
                        }
                        activeOpacity={0.7}
                    >
                        <StepDot
                            n={2}
                            done={!!custId}
                        />

                        <View style={{ flex: 1 }}>
                            <Text style={ns.stepTitle}>
                                Customer
                            </Text>

                            {cust && (
                                <Text style={ns.stepSub}>
                                    {cust.label}
                                </Text>
                            )}
                        </View>

                        <Text style={ns.chevron}>
                            {customerExpanded ? '▾' : '›'}
                        </Text>
                    </TouchableOpacity>

                    {customerExpanded && (
                        <View style={ns.stepBody}>

                            {partyLoading ? (
                                <ActivityIndicator
                                    color={T.copper}
                                />
                            ) : (
                                <SearchableDropdown
                                    label="Select customer"
                                    placeholder="Search by name or city..."
                                    value={custId}
                                    items={customerItems}
                                    onSelect={(item) => {
                                        setCustId(item.id);

                                        // New customer -> clear dependent ITEM/DESIGN data.
                                        setMdId('');
                                        setSelectedDesign(null);
                                        setSelectedItem(null);
                                        setItemList([]);
                                        setShadeList([]);
                                        setLatestCosting(null);

                                        const party = parties.find(
                                            (p: any) =>
                                                String(
                                                    p.AccCode ||
                                                    p.acccode
                                                ) === String(item.id)
                                        );

                                        const sexeCode = String(
                                            party?.sexe ?? ''
                                        ).trim();

                                        console.log(
                                            'Selected Party:',
                                            party
                                        );

                                        console.log(
                                            'Party Sales Executive Code:',
                                            sexeCode
                                        );

                                        if (sexeCode) {
                                            const matchedExec =
                                                salesExecutiveItems.find(
                                                    exec =>
                                                        String(exec.id) ===
                                                        sexeCode
                                                );

                                            console.log(
                                                'Matched Sales Executive:',
                                                matchedExec
                                            );

                                            if (matchedExec) {
                                                setSalesExecId(
                                                    matchedExec.id
                                                );
                                                setSelectedExec(
                                                    matchedExec
                                                );
                                                setSalesExecExpanded(true);
                                            } else {
                                                setSalesExecId('');
                                                setSelectedExec(null);
                                            }
                                        } else {
                                            setSalesExecId('');
                                            setSelectedExec(null);
                                        }
                                    }}
                                />
                            )}

                            {cust && (
                                <Text style={ns.addressText}>
                                    {cust.Address}
                                </Text>
                            )}

                        </View>
                    )}

                </Card>
            )}


            {/* =========================================================
                SALES EXECUTIVE
                Visible only after customer is selected.
                Independent accordion.
            ========================================================== */}
            {custId && (
                <Card style={ns.card}>

                    <TouchableOpacity
                        style={ns.stepHead}
                        onPress={() =>
                            setSalesExecExpanded(prev => !prev)
                        }
                        activeOpacity={0.7}
                    >
                        <StepDot
                            n={2}
                            done={!!salesExecId}
                        />

                        <View style={{ flex: 1 }}>
                            <Text style={ns.stepTitle}>
                                Sales Executive
                            </Text>

                            {selectedExec && (
                                <Text style={ns.stepSub}>
                                    {selectedExec.label}
                                </Text>
                            )}
                        </View>

                        <Text style={ns.chevron}>
                            {salesExecExpanded ? '▾' : '›'}
                        </Text>
                    </TouchableOpacity>

                    {salesExecExpanded && (
                        <View style={ns.stepBody}>

                            {salesexecLoading ? (
                                <ActivityIndicator
                                    color={T.copper}
                                />
                            ) : (
                                <SearchableDropdown
                                    label="Select Sales Executive"
                                    placeholder="Search Sales Executive..."
                                    value={salesExecId}
                                    items={salesExecutiveItems}
                                    onSelect={(item) => {
                                        setSalesExecId(item.id);
                                        setSelectedExec(item);
                                        setDesignExpanded(true);
                                    }}
                                />
                            )}

                        </View>
                    )}

                </Card>
            )}


            {/* =========================================================
                ITEM & DESIGN
                Visible only after sales executive is selected.
                Independent accordion.
            ========================================================== */}
            {custId && salesExecId && (
                <Card style={ns.card}>

                    <TouchableOpacity
                        style={ns.stepHead}
                        onPress={() =>
                            setDesignExpanded(prev => !prev)
                        }
                        activeOpacity={0.7}
                    >
                        <StepDot
                            n={3}
                            done={!!mdId}
                        />

                        <View style={{ flex: 1 }}>
                            <Text style={ns.stepTitle}>
                                Item & Design
                            </Text>

                            {design && (
                                <Text style={ns.stepSub}>
                                    {design.ItmName ?? design.Itmname ?? ''} · {fabType}
                                </Text>
                            )}
                        </View>

                        <Text style={ns.chevron}>
                            {designExpanded ? '▾' : '›'}
                        </Text>
                    </TouchableOpacity>

                    {designExpanded && (
                        <View style={ns.stepBody}>

                            {/* ITEM - API DATA */}
                            <SearchableDropdown
                                label="ITEM"
                                placeholder={
                                    designLoading
                                        ? "Loading items..."
                                        : "Select item"
                                }
                                value={mdId}
                                items={designItems}
                                onSelect={(item) => {
                                    // Get the original API record so all fields
                                    // (ItmCode, HsnCode, Denier, etc.) remain available.
                                    const selected = designList.find(
                                        (x: any) =>
                                            String(
                                                x.ItmCode ??
                                                x.itmcode ??
                                                ''
                                            ) === String(item.id)
                                    );

                                    console.log(
                                        'SELECTED ITEM:',
                                        selected
                                    );

                                    setSelectedDesign(selected || item);
                                    setMdId(item.id);

                                    // This is the important chain:
                                    // ITEM -> loadItems(ITEM)
                                    setSelectedItem(null);
                                    setShadeList([]);
                                    setLatestCosting(null);
                                    setColorLines([
                                        {
                                            shadeId: '',
                                            shadeName: '',
                                            qty: '',
                                        },
                                    ]);

                                    if (selected) {
                                        // ITEM selected -> load DESIGN list.
                                        loadItems(selected);
                                    }
                                }}
                            />

                            {/* DESIGN - API DATA loaded after ITEM selection */}
                            {mdId && (
                                <View style={{ marginTop: 8 }}>
                                    {itemLoading ? (
                                        <ActivityIndicator color={T.copper} />
                                    ) : (
                                        <SearchableDropdown
                                            label="DESIGN"
                                            placeholder="Select design"
                                            value={
                                                selectedItem?.DsnCode ?? ''
                                            }
                                            items={itemDesignOptions}
                                            onSelect={(item) => {
                                                setSelectedItem(item);

                                                setColorLines([
                                                    {
                                                        shadeId: '',
                                                        shadeName: '',
                                                        qty: '',
                                                    },
                                                ]);

                                                setShadeList([]);
                                                setLatestCosting(null);

                                                loadShades(
                                                    selectedDesign,
                                                    item
                                                );

                                                loadLatestCosting(
                                                    selectedDesign,
                                                    item
                                                );
                                            }}
                                        />
                                    )}
                                </View>
                            )}

                            {/* Selected item information */}
                            {selectedItem && (
                                <>
                                    <Text style={ns.fieldLabel}>
                                        FABRIC TYPE
                                    </Text>

                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            gap: 10,
                                            marginBottom: 14,
                                        }}
                                    >
                                        {(
                                            ['greige', 'finished'] as const
                                        ).map(t => (
                                            <TouchableOpacity
                                                key={t}
                                                onPress={() =>
                                                    setFabType(t)
                                                }
                                                style={[
                                                    ns.fabBtn,
                                                    fabType === t &&
                                                    ns.fabBtnActive,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        ns.fabBtnTxt,
                                                        fabType === t && {
                                                            color: T.copper,
                                                            fontWeight: '800',
                                                        },
                                                    ]}
                                                >
                                                    {t
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        t.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}
                        </View>
                    )}

                </Card>
            )}


            {/* =========================================================
                PRICE & DELIVERY
                Independent accordion.
            ========================================================== */}
            {mdId && (
                <Card style={ns.card}>

                    <TouchableOpacity
                        style={ns.stepHead}
                        onPress={() =>
                            setPriceExpanded(prev => !prev)
                        }
                        activeOpacity={0.7}
                    >
                        <StepDot
                            n={4}
                            done={!!(price && delivDate)}
                        />

                        <View style={{ flex: 1 }}>
                            <Text style={ns.stepTitle}>
                                Price & delivery date
                            </Text>

                            {price && (
                                <Text style={ns.stepSub}>
                                    ₹{price}/m · due {delivDate}
                                </Text>
                            )}
                        </View>

                        <Text style={ns.chevron}>
                            {priceExpanded ? '▾' : '›'}
                        </Text>
                    </TouchableOpacity>

                    {priceExpanded && (
                        <View style={ns.stepBody}>

                            <View
                                style={{
                                    flexDirection: 'row',
                                    gap: 12,
                                    marginBottom: 12,
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={ns.fieldLabel}>
                                        PRICE (₹/M)
                                    </Text>

                                    <TextInput
                                        value={price}
                                        onChangeText={setPrice}
                                        keyboardType="decimal-pad"
                                        placeholder="0"
                                        placeholderTextColor={T.muted}
                                        style={ns.inp}
                                    />
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={ns.fieldLabel}>
                                        DELIVERY DATE
                                    </Text>

                                    <TextInput
                                        value={delivDate}
                                        onChangeText={setDelivDate}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={T.muted}
                                        style={ns.inp}
                                    />
                                </View>
                            </View>

                            {marginHint && (
                                <View
                                    style={[
                                        ns.marginBox,
                                        {
                                            borderLeftColor:
                                                marginHint.margin >= 0
                                                    ? T.green
                                                    : T.red,
                                        },
                                    ]}
                                >
                                    <Text style={ns.marginLabel}>
                                        EXPECTED MARGIN
                                    </Text>

                                    <Text
                                        style={[
                                            ns.marginAmt,
                                            {
                                                color:
                                                    marginHint.margin >= 0
                                                        ? T.green
                                                        : T.red,
                                            },
                                        ]}
                                    >
                                        {marginHint.margin >= 0
                                            ? '+'
                                            : ''}
                                        {rupee(marginHint.margin)}/m ·{' '}
                                        {marginHint.pct.toFixed(1)}%
                                    </Text>

                                    <Text style={ns.marginSub}>
                                        Cost ₹
                                        {Math.round(
                                            marginHint.cost
                                        )}
                                        /m · {fabType}
                                    </Text>
                                </View>
                            )}

                        </View>
                    )}

                </Card>
            )}


            {/* =========================================================
                SHADES & QUANTITIES
                Independent accordion.
            ========================================================== */}
            {price && delivDate && (
                <Card style={ns.card}>

                    <TouchableOpacity
                        style={ns.stepHead}
                        onPress={() =>
                            setShadeExpanded(prev => !prev)
                        }
                        activeOpacity={0.7}
                    >
                        <StepDot
                            n={5}
                            done={validLines.length > 0}
                        />

                        <View style={{ flex: 1 }}>
                            <Text style={ns.stepTitle}>
                                Shades & quantities
                            </Text>

                            {validLines.length > 0 && (
                                <Text style={ns.stepSub}>
                                    {validLines.length} shade
                                    {validLines.length > 1
                                        ? 's'
                                        : ''}{' '}
                                    · {fmt(totalM)} m total
                                </Text>
                            )}
                        </View>

                        <Text style={ns.chevron}>
                            {shadeExpanded ? '▾' : '›'}
                        </Text>
                    </TouchableOpacity>

                    {shadeExpanded && (
                        <View style={ns.stepBody}>

                            {shadeLoading ? (
                                <ActivityIndicator color={T.copper} />
                            ) : (
                                colorLines.map((line, i) => (
                                    <View
                                        key={i}
                                        style={ns.shadeLine}
                                    >
                                        <View style={ns.lineNum}>
                                            <Text
                                                style={ns.lineNumTxt}
                                            >
                                                {i + 1}
                                            </Text>
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            <ShadeDropdown
                                                value={line.shadeId}
                                                items={shadeOptions}
                                                placeholder="Search shade / colour…"
                                                onSelect={item => {
                                                    updateLine(
                                                        i,
                                                        'shadeId',
                                                        item.id
                                                    );
                                                    updateLine(
                                                        i,
                                                        'shadeName',
                                                        item.label
                                                    );
                                                }}
                                            />

                                            {line.shadeId && (
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                    }}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={
                                                                ns.fieldLabel
                                                            }
                                                        >
                                                            QUANTITY (METRES)
                                                        </Text>

                                                        <TextInput
                                                            value={line.qty}
                                                            onChangeText={v =>
                                                                updateLine(
                                                                    i,
                                                                    'qty',
                                                                    v.replace(
                                                                        /[^0-9]/g,
                                                                        ''
                                                                    )
                                                                )
                                                            }
                                                            keyboardType="number-pad"
                                                            placeholder="0"
                                                            placeholderTextColor={
                                                                T.muted
                                                            }
                                                            style={ns.inp}
                                                        />
                                                    </View>

                                                    {line.qty && (
                                                        <Text
                                                            style={
                                                                ns.lineTotal
                                                            }
                                                        >
                                                            {rupee(
                                                                parseInt(
                                                                    line.qty
                                                                ) *
                                                                parseFloat(
                                                                    price ||
                                                                    '0'
                                                                )
                                                            )}
                                                        </Text>
                                                    )}
                                                </View>
                                            )}
                                        </View>

                                        {colorLines.length > 1 && (
                                            <TouchableOpacity
                                                onPress={() =>
                                                    removeLine(i)
                                                }
                                                style={ns.removeBtn}
                                            >
                                                <Text style={ns.removeTxt}>
                                                    ×
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))
                            )}

                            <TouchableOpacity
                                style={ns.addLineBtn}
                                onPress={addLine}
                            >
                                <Text style={ns.addLineTxt}>
                                    + Add another shade
                                </Text>
                            </TouchableOpacity>

                            {validLines.length > 0 && (
                                <View style={ns.totalBox}>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent:
                                                'space-between',
                                        }}
                                    >
                                        <Text style={ns.totalLabel}>
                                            Total metres
                                        </Text>

                                        <Text style={ns.totalVal}>
                                            {fmt(totalM)} m
                                        </Text>
                                    </View>

                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent:
                                                'space-between',
                                            marginTop: 4,
                                        }}
                                    >
                                        <Text style={ns.totalLabel}>
                                            Order value
                                        </Text>

                                        <Text
                                            style={[
                                                ns.totalVal,
                                                {
                                                    color: T.copper,
                                                },
                                            ]}
                                        >
                                            {rupee(
                                                totalM *
                                                parseFloat(
                                                    price || '0'
                                                )
                                            )}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            {latestCosting && (
                                <View style={ns.costingBox}>
                                    <Text style={ns.costingTitle}>
                                        LATEST COSTING
                                    </Text>
                                    <Text style={ns.costingText}>
                                        {typeof latestCosting === 'object'
                                            ? JSON.stringify(latestCosting)
                                            : String(latestCosting)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                </Card>
            )}


            {/* =========================================================
                SUBMIT
            ========================================================== */}
            <TouchableOpacity
                style={[
                    ns.submitBtn,
                    !canSubmit && { opacity: 0.4 },
                ]}
                onPress={submit}
                disabled={!canSubmit}
                activeOpacity={0.8}
            >
                <Text style={ns.submitBtnTxt}>
                    Submit for authorization →
                </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />

        </ScrollView>
    );
}

const ns = StyleSheet.create({
    scroll: { padding: 14, paddingTop: 10 },
    card: { marginBottom: 12, overflow: 'hidden' },

    // Property & Year: compact cards like the requested UI.
    propertyYearTopRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 14,
    },
    propertyTopCard: {
        backgroundColor: T.surface,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 4,
        minHeight: 86,
        overflow: 'hidden',
    },
    topCardLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: T.ink,
        letterSpacing: 0.5,
        marginBottom: 1,
    },
    addressText: {
        fontSize: 12,
        color: T.muted,
        marginTop: 8,
        lineHeight: 18,
    },
    apiInfoBox: {
        backgroundColor: T.sub,
        borderRadius: 9,
        padding: 10,
        marginTop: 8,
        marginBottom: 10,
    },
    apiInfoText: {
        fontSize: 10,
        color: T.muted,
        marginBottom: 2,
    },
    costingBox: {
        backgroundColor: T.sub,
        borderRadius: 9,
        padding: 10,
        marginTop: 10,
    },
    costingTitle: {
        fontSize: 9,
        fontWeight: '800',
        color: T.muted,
        letterSpacing: 0.5,
        marginBottom: 5,
    },
    costingText: {
        fontSize: 10,
        color: T.ink,
    },
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
    marginBox: { backgroundColor: T.sub, borderRadius: 9, padding: 12, marginBottom: 14, borderLeftWidth: 3 },
    marginLabel: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5 },
    marginAmt: { fontSize: 16, fontWeight: '800', marginTop: 3 },
    marginSub: { fontSize: 10, color: T.muted, marginTop: 2 },
    propertyYearRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        marginBottom: 4,
    },

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

    shadeSelectBox: {
        backgroundColor: T.surface,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: T.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    shadeSelectText: {
        fontSize: 14,
        color: T.ink,
        fontWeight: '600',
    },
    shadeSelectSub: {
        fontSize: 10,
        color: T.muted,
        marginTop: 2,
    },
    shadeModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: 16,
    },
    shadeModalCard: {
        backgroundColor: T.surface,
        borderRadius: 16,
        maxHeight: '85%',
        minHeight: '55%',
        overflow: 'hidden',
    },
    shadeModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 8,
    },
    shadeModalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: T.ink,
    },
    shadeModalClose: {
        fontSize: 28,
        lineHeight: 28,
        color: T.muted,
        fontWeight: '300',
    },
    shadeSearchInput: {
        marginHorizontal: 16,
        marginTop: 4,
        marginBottom: 6,
        backgroundColor: T.sub,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: T.ink,
    },
    shadeCountText: {
        fontSize: 10,
        color: T.muted,
        paddingHorizontal: 16,
        paddingBottom: 6,
    },
    shadeOptionRow: {
        minHeight: 54,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderTopWidth: 1,
        borderTopColor: T.alt,
        flexDirection: 'row',
        alignItems: 'center',
    },
    shadeOptionLabel: {
        fontSize: 14,
        color: T.ink,
        fontWeight: '600',
    },
    shadeOptionSub: {
        fontSize: 10,
        color: T.muted,
        marginTop: 2,
    },
    shadeEmptyBox: {
        padding: 30,
        alignItems: 'center',
    },
    shadeEmptyText: {
        color: T.muted,
        fontSize: 13,
    },
    submitBtn: { backgroundColor: T.copper, borderRadius: 10, padding: 15, alignItems: 'center' },
    submitBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});