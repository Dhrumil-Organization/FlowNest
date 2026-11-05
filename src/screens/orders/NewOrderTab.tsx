import AppAlert from '@/common/utils/appAlert';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../theme';
import { useAppStore, autoSave } from '../../stores/AppStore';
import { SearchableDropdown, DropdownItem } from '../../components/ui/SearchableDropdown';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CUSTOMERS } from '../../data/seeds';
import type { SalesOrder, FabricType } from '../../types';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, FlatList, StatusBar } from 'react-native';
import { SalesOrderAPI } from '@/src/api/legacyClient';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useMobileUserPreference } from '@/hooks/useMobileUserPreference';
import { fetchAllPropertyData, fetchPropertyData } from '@/src/api/legacyFunctions';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// ─── helpers ──────────────────────────────────────────────────
const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
const rupee = (n: number) => {
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
    return `₹${Math.round(n)}`;
};
const TODAY = new Date().toISOString().slice(0, 10);

const authHdr = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-platform': 'mob',
});

const ymd = (value: any) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toISOString().slice(0, 10);
};

function genSO(orders: SalesOrder[]) {
    const d = TODAY.replace(/-/g, '');
    const n = String(orders.filter(o => o.soNumber.startsWith(`SO-${d}`)).length + 1).padStart(3, '0');
    return `SO-${d}-${n}`;
}

interface Props {
    token: string;
    userid?: any;
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
    const [price, setPrice] = useState('');
    const [delivDate, setDelivDate] = useState('2026-07-15');
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    const displayDate = (value: string) => {
        if (!value) return '';
        const parts = value.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return value;
    };

    const parseDateValue = (value: string) => {
        if (!value) return new Date();
        const parts = value.split('-').map(Number);
        if (parts.length === 3 && parts[0] > 31) {
            const [year, month, day] = parts;
            return new Date(year, month - 1, day);
        }
        return new Date();
    };

    const formatDateForApi = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleDeliveryDateChange = (
        event: DateTimePickerEvent,
        selectedDate?: Date,
    ) => {
        // Android closes the native picker after selecting/cancelling.
        if (event.type === 'dismissed') {
            setDatePickerOpen(false);
            return;
        }

        if (selectedDate) {
            setDelivDate(formatDateForApi(selectedDate));
        }

        if (event.type === 'set' || event.type === 'neutralButtonPressed') {
            setDatePickerOpen(false);
        }
    };
    // const [delivDate, setDelivDate] = useState('2026-07-15');
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

    const [soType, setSoType] = useState(1);
    const [fabricType, setFabricType] = useState(1);

    const [soTypeExpanded, setSoTypeExpanded] = useState(true);

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

    // Save / success state
    const [submitting, setSubmitting] = useState(false);
    const [successSO, setSuccessSO] = useState<string | null>(null);

    const salesExecutiveItems: DropdownItem[] = useMemo(() => {
        return (execList || []).map((item: any) => ({
            id: String(item.Code),
            label: item.SalesExecutive || item['Sales Executive'] || '',
        }));
    }, [execList]);

    // Shade selection + multiple added colourways
    const [selectedShade, setSelectedShade] = useState<any>(null);
    const [qty, setQty] = useState('');
    const [colourways, setColourways] = useState<any[]>([]);

    const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
    const [yearPickerOpen, setYearPickerOpen] = useState(false);
    const [propertySearch, setPropertySearch] = useState('');
    const [yearSearch, setYearSearch] = useState('');

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

    const propertyPickerItems = useMemo(() => {
        const q = propertySearch.trim().toLowerCase();
        if (!q) return propertyItems;

        return propertyItems.filter((item: DropdownItem) =>
            `${item.label} ${item.sub || ''} ${item.id}`
                .toLowerCase()
                .includes(q)
        );
    }, [propertyItems, propertySearch]);

    const yearPickerItems = useMemo(() => {
        const q = yearSearch.trim().toLowerCase();
        if (!q) return yearOptions;

        return yearOptions.filter((item: DropdownItem) =>
            `${item.label} ${item.sub || ''} ${item.id}`
                .toLowerCase()
                .includes(q)
        );
    }, [yearOptions, yearSearch]);

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


    // const shadeOptions: DropdownItem[] = useMemo(() => {
    //     return shadeList;
    // }, [shadeList]);

    const shadeOptions: DropdownItem[] = useMemo(() => {
        return (shadeList || [])
            .map((item: any) => {
                const code = String(
                    item?.ShdCode ??
                    item?.id ??
                    ''
                ).trim();

                const name = String(
                    item?.ShdName ??
                    item?.label ??
                    ''
                ).trim();

                if (!code || !name) {
                    return null;
                }

                return {
                    ...item,
                    ShdCode: code,
                    ShdName: name,
                    id: code,
                    label: name,
                    sub: `Shade Code: ${code}`,
                };
            })
            .filter(
                (item): item is DropdownItem =>
                    item !== null
            );
    }, [shadeList]);

    // Header summary is the selected ITEM record.
    const design = selectedDesign;



    // Margin hint from latest costing
    const marginHint = useMemo(() => {
        if (!mdId || !price) return null;
        const recs = costings.filter(c => c.mdId === mdId).sort((a, b) => b.ts.localeCompare(a.ts));
        if (!recs.length) return null;
        const snap = recs[0].snap;
        const cost = fabricType === 1 && snap.hasFin ? snap.finishedPrice : snap.greigePrice;
        const p = parseFloat(price);
        if (!p) return null;
        const margin = p - cost;
        return { cost, margin, pct: (margin / p) * 100 };
    }, [mdId, price, fabricType, costings]);

    // Validation
    const validColourways = colourways.filter(
        (c: any) =>
            c?.shade?.ShdCode &&
            Number(c?.qty) > 0
    );

    const totalM = validColourways.reduce(
        (sum: number, c: any) =>
            sum + Number(c?.qty || 0),
        0
    );

    const totalAmt = validColourways.reduce(
        (sum: number, c: any) =>
            sum + Number(c?.amount || 0),
        0
    );

    // ── Latest costing calculation ───────────────────────────────
    // Same calculation/display logic as the old New Order screen.
    const costDiff =
        latestCosting && price
            ? Number(price) -
            Number(
                latestCosting.CostPerM ||
                latestCosting.UnitRate ||
                0
            )
            : null;

    const costMonth =
        latestCosting?.Month ||
        latestCosting?.SODate ||
        '';

    const latestCost = latestCosting
        ? Number(
            latestCosting.CostPerM ||
            latestCosting.UnitRate ||
            0
        )
        : 0;

    const marginPct =
        costDiff !== null && latestCost > 0
            ? (costDiff / latestCost) * 100
            : null;

    const canSubmit =
        !!custId &&
        !!salesExecId &&
        !!selectedDesign &&
        !!selectedItem &&
        !!mdId &&
        parseFloat(price) > 0 &&
        !!delivDate &&
        validColourways.length > 0;

    function addColourway() {
        if (!selectedShade || !qty) return;

        const shadeCode = String(
            selectedShade?.ShdCode ??
            selectedShade?.id ??
            ''
        );

        if (!shadeCode) return;

        const alreadyAdded = colourways.some(
            (c: any) =>
                String(
                    c?.shade?.ShdCode ??
                    c?.shade?.id ??
                    ''
                ) === shadeCode
        );

        if (alreadyAdded) {
            AppAlert.alert(
                'Already added',
                `${selectedShade?.ShdName ?? selectedShade?.label ?? 'This shade'} is already in the list.`
            );
            return;
        }

        const quantity = Number(qty);
        const rate = Number(price || 0);
        const amount = quantity * rate;

        setColourways(prev => [
            ...prev,
            {
                shade: {
                    ...selectedShade,
                    ShdCode: shadeCode,
                    ShdName:
                        selectedShade?.ShdName ??
                        selectedShade?.label ??
                        '',
                },
                qty: quantity,
                rate,
                amount,
            },
        ]);

        setSelectedShade(null);
        setQty('');
    }

    function removeColourway(code: string) {
        setColourways(prev =>
            prev.filter(
                (c: any) =>
                    String(
                        c?.shade?.ShdCode ??
                        c?.shade?.id ??
                        ''
                    ) !== String(code)
            )
        );
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

        const dsncode =
            item.DsnCode ??
            item.dsncode ??
            '';

        if (!dsncode) {
            console.log(
                '❌ Shade API skipped: DsnCode is empty',
                item
            );
            return;
        }

        const yrno = yearno
            ? yearno.split('-')[1]?.slice(-2)
            : '';

        const params = {
            prpcode,
            strcode: '012',
            yearno: yrno,
            itmcode:
                design.ItmCode ??
                design.itmcode ??
                '',
            mitmcode:
                design.MItmCode ??
                design.MitmCode ??
                design.mitmcode ??
                design.ItmCode ??
                design.itmcode ??
                '',
            dsncode,
        };

        try {
            setShadeLoading(true);

            console.log('SHADE API PARAMS:', params);

            const res = await SalesOrderAPI.getShade(params);

            console.log("shade res", res);

            const data =
                res?.data?.response?.data ??
                res?.data?.response ??
                res?.data?.data ??
                [];

            if (!Array.isArray(data)) {
                console.log(
                    '❌ Invalid SHADE API response:',
                    data
                );
                setShadeList([]);
                return;
            }
            const normalizedShades: DropdownItem[] = data.reduce(
                (result: DropdownItem[], item: any) => {
                    const code = String(
                        item?.ShdCode ?? ''
                    ).trim();

                    const name = String(
                        item?.ShdName ?? ''
                    ).trim();

                    if (code && name) {
                        result.push({
                            id: code,
                            label: name,
                            sub: `Shade Code: ${code}`,
                        });
                    }

                    return result;
                },
                []
            );
            console.log('NORMALIZED SHADE RECORD COUNT:', normalizedShades.length);
            console.log('FIRST SHADE:', normalizedShades[0]);
            setShadeList(normalizedShades);
        } catch (e: any) {
            console.log('SHADE API ERROR:', e?.message ?? e);
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

    const submitOrder = async () => {
        // -----------------------------
        // Final validation
        // -----------------------------
        if (!prpcode) {
            AppAlert.alert('Required', 'Select a property first');
            return;
        }

        if (!yearno) {
            AppAlert.alert('Required', 'Select a year');
            return;
        }

        if (!custId) {
            AppAlert.alert('Required', 'Select a customer');
            return;
        }

        if (!salesExecId) {
            AppAlert.alert('Required', 'Select a sales executive');
            return;
        }

        if (!selectedDesign) {
            AppAlert.alert('Required', 'Select an item');
            return;
        }

        if (!selectedItem) {
            AppAlert.alert('Required', 'Select a design');
            return;
        }

        if (!mdId) {
            AppAlert.alert('Required', 'Select a design');
            return;
        }

        if (!price || Number(price) <= 0) {
            AppAlert.alert('Required', 'Enter price per metre');
            return;
        }

        if (!delivDate) {
            AppAlert.alert('Required', 'Select expected delivery date');
            return;
        }

        if (validColourways.length === 0) {
            AppAlert.alert('Required', 'Add at least one shade');
            return;
        }

        // -----------------------------
        // Prevent duplicate shades
        // -----------------------------
        const shadeCodes = validColourways
            .map((c: any) =>
                String(
                    c?.shade?.ShdCode ??
                    c?.shade?.id ??
                    ''
                ).trim()
            )
            .filter(Boolean);

        const duplicateShade = shadeCodes.find(
            (code: string, index: number) =>
                shadeCodes.indexOf(code) !== index
        );

        if (duplicateShade) {
            const duplicateRow = validColourways.find(
                (c: any) =>
                    String(
                        c?.shade?.ShdCode ??
                        c?.shade?.id ??
                        ''
                    ).trim() === duplicateShade
            );

            AppAlert.alert(
                'Duplicate Shade',
                `${duplicateRow?.shade?.ShdName ?? duplicateRow?.shade?.label ?? duplicateShade} is already added. Please select another shade.`
            );
            return;
        }

        const custData = parties.find(
            (p: any) =>
                String(p.AccCode ?? p.acccode ?? '') === String(custId)
        );

        try {
            setSubmitting(true);

            // -----------------------------
            // Detail rows
            // -----------------------------
            const rows = validColourways.map((c: any, i: number) => {
                const quantity = Number(c?.qty || 0);
                const rate = Number(c?.rate ?? price ?? 0);
                const amount = Number(c?.amount ?? quantity * rate);

                return {
                    SrNo: i + 1,
                    StrCode: '012',

                    ItmCode:
                        selectedDesign?.ItmCode ??
                        selectedDesign?.itmcode ??
                        '',

                    MItmCode:
                        selectedDesign?.MItmCode ??
                        selectedDesign?.MitmCode ??
                        selectedDesign?.mitmcode ??
                        selectedDesign?.ItmCode ??
                        selectedDesign?.itmcode ??
                        '',

                    ItmName:
                        selectedDesign?.ItmName ??
                        selectedDesign?.Itmname ??
                        selectedDesign?.itmname ??
                        '',

                    DsnCode:
                        selectedItem?.DsnCode ??
                        selectedItem?.dsncode ??
                        selectedItem?.DsnCode1 ??
                        selectedItem?.dsncode1 ??
                        '',

                    DsnName:
                        selectedItem?.DsnName ??
                        selectedItem?.dsnname ??
                        selectedItem?.DsnName1 ??
                        selectedItem?.dsnname1 ??
                        '',

                    ShdCode:
                        c?.shade?.ShdCode ??
                        c?.shade?.id ??
                        '',

                    ShdName:
                        c?.shade?.ShdName ??
                        c?.shade?.label ??
                        c?.shade?.ShadeName ??
                        '',

                    Qty: fmt(quantity),
                    QtyPcs: '0',
                    UnitRate: fmt(rate),
                    Amount: fmt(amount),
                    D1NetAmt: fmt(amount),

                    Remark1: '',
                    Remark2: '',
                    Remark3: '',
                    Remark4: '',
                    Remark5: '',

                    PkgQty: '1.000',
                    PkgRate: '.00000',
                    AmtCalc: 'U',

                    MerCode: '0',
                    GrdCode: '0',

                    DisPer: '.00',
                    DisAmt: '.00',

                    CGSTPer: '.00',
                    CGSTAmt: '.00',

                    SGSTPer: '.00',
                    SGSTAmt: '.00',

                    IGSTPer: '.00',
                    IGSTAmt: '.00',

                    Denier:
                        selectedDesign?.Denier ??
                        selectedDesign?.denier ??
                        '',

                    UOM:
                        selectedDesign?.UOM ??
                        selectedDesign?.uom ??
                        '',

                    HsnCode:
                        selectedDesign?.HsnCode ??
                        selectedDesign?.hsncode ??
                        '',

                    HSNName:
                        selectedDesign?.HSNName ??
                        selectedDesign?.hsnname ??
                        '',
                };
            });

            // -----------------------------
            // Main SO payload
            // -----------------------------
            const payload = {
                Mode: 'ADD',
                UId: 0,

                main: {
                    UId: 0,
                    Mode: 'ADD',

                    PrpCode: prpcode,
                    StrCode: '012',
                    YearNo: yearno
                        ? yearno.split('-')[1]?.slice(-2)
                        : '',

                    ParCode:
                        custData?.AccCode ??
                        custData?.acccode ??
                        custId,

                    ParName:
                        custData?.AccName ??
                        custData?.accountname ??
                        custData?.ParName ??
                        '',

                    SExe:
                        selectedExec?.id ??
                        selectedExec?.Code ??
                        selectedExec?.ExecCode ??
                        salesExecId ??
                        custData?.sexe ??
                        '',

                    SExeName:
                        selectedExec?.label ??
                        selectedExec?.SalesExecutive ??
                        selectedExec?.ExecName ??
                        custData?.SExeName ??
                        '',

                    GrsAmt: fmt(totalAmt),

                    DisAmt: '.00',
                    NDisAmt: '.00',
                    TDisAmt: '.00',

                    TaxAmt: '.00',
                    NTaxAmt: '.00',
                    TTaxAmt: '.00',
                    GSTAmt: '.00',

                    NetAmt: fmt(totalAmt),
                    D1NetAmt: fmt(totalAmt),

                    Remark: '',

                    DDays: delivDate
                        ? String(
                            Math.max(
                                0,
                                Math.ceil(
                                    (new Date(delivDate).getTime() - Date.now()) /
                                    (1000 * 60 * 60 * 24)
                                )
                            )
                        )
                        : '',

                    DAdd:
                        custData?.Address ??
                        custData?.address ??
                        '',

                    DCity:
                        custData?.City ??
                        custData?.city ??
                        '',

                    Station:
                        custData?.City ??
                        custData?.city ??
                        '',

                    Status: 'P',
                    EntType: 'G2',
                    TaxStru: '123',

                    SONo: '',
                    SODate: '',

                    DueDate: ymd(delivDate),

                    DueDay:
                        custData?.crday ??
                        custData?.CrDay ??
                        '',

                    // Keep the new SO Type / Fabric Type values.
                    // SOType: soType,
                    // FabricType: fabricType,
                },

                d1: rows,
                tax: [],
                exp: {},
            };

            console.log('SO SAVE PAYLOAD:', JSON.stringify(payload, null, 2));
            console.log('SO SAVE PAYLOAD111:', payload);

            // -----------------------------
            // Actual save API
            // -----------------------------
            const res = await SalesOrderAPI.mobAppSave(payload);

            console.log('SO SAVE RESPONSE:', res);

            if (
                res?.data?.success === true ||
                res?.data?.success === 'true'
            ) {
                const savedSO =
                    res?.data?.response?.sono ??
                    res?.data?.response?.SONo ??
                    res?.data?.response?.soNo ??
                    res?.data?.response?.soNumber ??
                    `SO-${Date.now()}`;

                // Do NOT reset the form here.
                // Success screen must remain visible until user taps New Order.
                setSuccessSO(String(savedSO));
            } else {
                AppAlert.alert(
                    'Save Failed',
                    res?.data?.message ||
                    res?.data?.response?.message ||
                    'Unable to save order'
                );
            }
        } catch (e: any) {
            console.error(
                'SO SAVE ERROR:',
                e?.response?.data ?? e
            );

            AppAlert.alert(
                'Error',
                e?.response?.data?.message ||
                e?.response?.data?.response?.message ||
                e?.message ||
                'Something went wrong while saving the sales order.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    // -----------------------------
    // Reset only after successful save
    // -----------------------------
    const resetForm = () => {
        setSuccessSO(null);

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
        setDelivDate('');

        setSelectedShade(null);
        setQty('');
        setColourways([]);
        setPropertySearch('');
        setYearSearch('');

        // Keep Property and Year selected.
        // They are configuration values, not part of the new-order reset.

        setCustomerExpanded(true);
        setSalesExecExpanded(true);
        setDesignExpanded(true);
        setPriceExpanded(true);
        setShadeExpanded(true);
        setSoTypeExpanded(true);
    };

    const StepDot = ({ n, done }: { n: number; done: boolean }) => (
        <View style={[ns.dot, { backgroundColor: done ? T.green : T.copper }]}>
            <Text style={ns.dotTxt}>{done ? '✓' : n}</Text>
        </View>
    );


    // ── Success screen ──
    // Shown only after the API confirms a successful save.
    if (successSO) {
        return (
            <SafeAreaView style={ns.successScreen}>
                <View style={ns.successInner}>
                    <View style={ns.successIcon}>
                        <Text style={ns.successTick}>✓</Text>
                    </View>

                    <Text style={ns.successTitle}>
                        Sent for authorization
                    </Text>

                    <Text style={ns.successSub}>
                        Sales order saved successfully and sent for manager approval.
                    </Text>

                    <View style={ns.successSOBox}>
                        <Text style={ns.successSOLabel}>
                            SO NUMBER
                        </Text>

                        <Text style={ns.successSONo}>
                            {successSO}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={ns.newOrderBtn}
                        onPress={resetForm}
                        activeOpacity={0.85}
                    >
                        <Text style={ns.newOrderBtnText}>
                            + New Order
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <ScrollView
            contentContainerStyle={ns.scroll}
            keyboardShouldPersistTaps="handled"
        >

            {/* =========================================================
                PROPERTY & YEAR
                Existing two-field layout. Only picker opening is custom.
            ========================================================== */}
            <View style={ns.propertyYearTopRow}>

                {/* PROPERTY */}
                <View style={[ns.propertyTopCard, { flex: 1.55 }]}>
                    <Text style={ns.topCardLabel}>PROPERTY</Text>

                    <TouchableOpacity
                        style={ns.propertyYearField}
                        activeOpacity={0.8}
                        onPress={() => {
                            setPropertySearch('');
                            setPropertyPickerOpen(true);
                        }}
                    >
                        <View style={ns.propertyYearFieldText}>
                            <Text
                                style={[
                                    ns.propertyYearValue,
                                    !prpcode && ns.propertyYearPlaceholder,
                                ]}
                                numberOfLines={1}
                            >
                                {propertyItems.find(
                                    (item: DropdownItem) =>
                                        String(item.id) === String(prpcode)
                                )?.label || 'Select'}
                            </Text>

                            {!!prpcode && (
                                <Text style={ns.propertyYearSub} numberOfLines={1}>
                                    {propertyItems.find(
                                        (item: DropdownItem) =>
                                            String(item.id) === String(prpcode)
                                    )?.sub || ''}
                                </Text>
                            )}
                        </View>

                        <Text style={ns.propertyYearArrow}>▾</Text>
                    </TouchableOpacity>
                </View>

                {/* YEAR */}
                <View style={[ns.propertyTopCard, { flex: 0.72 }]}>
                    <Text style={ns.topCardLabel}>YEAR</Text>

                    <TouchableOpacity
                        style={ns.propertyYearField}
                        activeOpacity={0.8}
                        onPress={() => {
                            setYearSearch('');
                            setYearPickerOpen(true);
                        }}
                    >
                        <Text
                            style={[
                                ns.propertyYearValue,
                                !yearno && ns.propertyYearPlaceholder,
                            ]}
                            numberOfLines={1}
                        >
                            {yearOptions.find(
                                (item: DropdownItem) =>
                                    String(item.id) === String(yearno)
                            )?.label || yearno || 'Select'}
                        </Text>

                        <Text style={ns.propertyYearArrow}>▾</Text>
                    </TouchableOpacity>
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
                                    {design.ItmName ?? design.Itmname ?? ''} · {fabricType}
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

                                    setSelectedDesign(selected || item);
                                    setMdId(item.id);

                                    // This is the important chain:
                                    // ITEM -> loadItems(ITEM)
                                    setSelectedItem(null);
                                    setShadeList([]);
                                    setLatestCosting(null);
                                    setSelectedShade(null);
                                    setQty('');
                                    setColourways([]);

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
                                                setSelectedShade(null);
                                                setQty('');
                                                setColourways([]);
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
                            {/* {selectedItem && (
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
                            )} */}
                        </View>
                    )}

                </Card>
            )}


            {custId && salesExecId && selectedItem && (
                <Card style={ns.card}>

                    <TouchableOpacity
                        style={ns.stepHead}
                        onPress={() =>
                            setSoTypeExpanded(prev => !prev)
                        }
                        activeOpacity={0.7}
                    >
                        <StepDot
                            n={4}
                            done={!!selectedItem}
                        />

                        <View style={{ flex: 1 }}>
                            <Text style={ns.stepTitle}>
                                SO Type &amp; Fabric Type
                            </Text>

                            <Text style={ns.stepSub}>
                                {soType === 1
                                    ? 'MTO'
                                    : 'Stock Order'}{' '}
                                · {fabricType}
                            </Text>
                        </View>

                        <Text style={ns.chevron}>
                            {soTypeExpanded ? '▾' : '›'}
                        </Text>
                    </TouchableOpacity>

                    {soTypeExpanded && (
                        <View style={ns.stepBody}>

                            {/* SO TYPE */}
                            <Text style={ns.fieldLabel}>
                                SO TYPE
                            </Text>

                            <View
                                style={{
                                    flexDirection: 'row',
                                    gap: 10,
                                    marginBottom: 14,
                                }}
                            >
                                {[
                                    { value: 0, label: 'MTO' },
                                    { value: 1, label: 'Stock Order' },
                                ].map(option => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => setSoType(option.value)}
                                        style={[
                                            ns.fabBtn,
                                            soType === option.value && ns.fabBtnActive,
                                        ]}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                ns.fabBtnTxt,
                                                soType === option.value && {
                                                    color: T.copper,
                                                    fontWeight: '800',
                                                },
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* FABRIC TYPE */}
                            <Text style={ns.fieldLabel}>
                                FABRIC TYPE
                            </Text>

                            <View
                                style={{
                                    flexDirection: 'row',
                                    gap: 10,
                                    marginBottom: 4,
                                }}
                            >
                                {[
                                    { value: 0, label: 'Greige' },
                                    { value: 1, label: 'Finished' },
                                ].map(option => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => setFabricType(option.value)}
                                        style={[
                                            ns.fabBtn,
                                            fabricType === option.value && ns.fabBtnActive,
                                        ]}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                ns.fabBtnTxt,
                                                fabricType === option.value && {
                                                    color: T.copper,
                                                    fontWeight: '800',
                                                },
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

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

                                    <TouchableOpacity
                                        style={ns.datePickerField}
                                        activeOpacity={0.8}
                                        onPress={() => setDatePickerOpen(true)}
                                    >
                                        <View style={ns.datePickerTextWrap}>
                                            <Text
                                                style={[
                                                    ns.datePickerValue,
                                                    !delivDate && ns.datePickerPlaceholder,
                                                ]}
                                            >
                                                {displayDate(delivDate) || 'DD-MM-YYYY'}
                                            </Text>
                                        </View>

                                        <View style={ns.calendarIconBox}>
                                            <Text style={ns.calendarIcon}>▣</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {datePickerOpen && (
                                        <DateTimePicker
                                            value={parseDateValue(delivDate)}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            minimumDate={new Date()}
                                            onChange={handleDeliveryDateChange}
                                            themeVariant="light"
                                        />
                                    )}
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
                Multiple shades are added one-by-one.
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
                            done={colourways.length > 0}
                        />

                        <View style={{ flex: 1 }}>
                            <Text style={ns.stepTitle}>
                                Shades & quantities
                            </Text>

                            {colourways.length > 0 && (
                                <Text style={ns.stepSub}>
                                    {colourways.length} shade
                                    {colourways.length > 1 ? 's' : ''}
                                    {' · '}
                                    {fmt(totalM)} m total
                                </Text>
                            )}
                        </View>

                        <Text style={ns.chevron}>
                            {shadeExpanded ? '▾' : '›'}
                        </Text>
                    </TouchableOpacity>

                    {shadeExpanded && (
                        <View style={ns.stepBody}>

                            <Text style={ns.fieldLabel}>
                                SHADE
                            </Text>

                            {shadeLoading ? (
                                <View
                                    style={{
                                        paddingVertical: 12,
                                        alignItems: 'center',
                                    }}
                                >
                                    <ActivityIndicator
                                        color={T.copper}
                                    />
                                </View>
                            ) : (
                                <SearchableDropdown
                                    label=""
                                    placeholder="Search shade / colour..."
                                    value={
                                        selectedShade?.id ??
                                        selectedShade?.ShdCode ??
                                        ''
                                    }
                                    items={shadeOptions}
                                    onSelect={(item) => {
                                        setSelectedShade(item);
                                    }}
                                />
                            )}

                            <Text
                                style={[
                                    ns.fieldLabel,
                                    { marginTop: 4 },
                                ]}
                            >
                                QUANTITY (METRES)
                            </Text>

                            <TextInput
                                value={qty}
                                onChangeText={v =>
                                    setQty(
                                        v.replace(/[^0-9]/g, '')
                                    )
                                }
                                keyboardType="number-pad"
                                placeholder="0"
                                placeholderTextColor={T.muted}
                                style={ns.inp}
                            />

                            <TouchableOpacity
                                style={[
                                    ns.addCwBtn,
                                    (!selectedShade || !qty) && {
                                        opacity: 0.4,
                                    },
                                ]}
                                onPress={addColourway}
                                disabled={
                                    !selectedShade || !qty
                                }
                                activeOpacity={0.8}
                            >
                                <Text style={ns.addCwBtnText}>
                                    + Add Shade
                                </Text>
                            </TouchableOpacity>

                            {colourways.map((c: any) => {
                                const shadeCode =
                                    c?.shade?.ShdCode ??
                                    c?.shade?.id ??
                                    '';

                                const shadeName =
                                    c?.shade?.ShdName ??
                                    c?.shade?.label ??
                                    '';

                                return (
                                    <View
                                        key={String(shadeCode)}
                                        style={ns.cwChip}
                                    >
                                        <View
                                            style={[
                                                ns.cwSwatch,
                                                {
                                                    backgroundColor:
                                                        c?.shade
                                                            ?.ShdColor ??
                                                        '#334155',
                                                },
                                            ]}
                                        />

                                        <View
                                            style={{ flex: 1 }}
                                        >
                                            <Text
                                                style={ns.cwName}
                                            >
                                                {shadeName}
                                            </Text>

                                            <Text
                                                style={ns.cwSub}
                                            >
                                                Shade Code:{' '}
                                                {shadeCode}
                                            </Text>
                                        </View>

                                        <Text
                                            style={ns.cwQty}
                                        >
                                            {Number(
                                                c?.qty || 0
                                            ).toLocaleString(
                                                'en-IN'
                                            )}
                                        </Text>

                                        <TouchableOpacity
                                            onPress={() =>
                                                removeColourway(
                                                    String(
                                                        shadeCode
                                                    )
                                                )
                                            }
                                            style={{
                                                paddingLeft: 10,
                                            }}
                                        >
                                            <Text
                                                style={ns.cwX}
                                            >
                                                ×
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}

                            {colourways.length > 0 && (
                                <View style={ns.totalRow}>
                                    <Text
                                        style={ns.totalLabel}
                                    >
                                        Total
                                    </Text>

                                    <Text
                                        style={ns.totalValue}
                                    >
                                        {totalM.toLocaleString(
                                            'en-IN'
                                        )}
                                        {' m  '}
                                        ₹
                                        {totalAmt.toLocaleString(
                                            'en-IN'
                                        )}
                                    </Text>
                                </View>
                            )}

                            {/* VS Latest Costing */}
                            {price && latestCosting && (
                                <View style={ns.costingBox}>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={ns.costingLabel}>
                                                VS LATEST COSTING
                                                {costMonth
                                                    ? ` (${costMonth})`
                                                    : ''}
                                            </Text>

                                            <Text style={ns.costingDetail}>
                                                Cost ₹{latestCost.toFixed(0)}
                                                {'  '}
                                                Rate ₹{price}
                                            </Text>
                                        </View>

                                        <View
                                            style={{
                                                alignItems: 'flex-end',
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    ns.costingDiff,
                                                    {
                                                        color:
                                                            costDiff >= 0
                                                                ? '#16a34a'
                                                                : '#dc2626',
                                                    },
                                                ]}
                                            >
                                                ₹
                                                {costDiff >= 0
                                                    ? '+'
                                                    : ''}
                                                {Math.round(costDiff)}
                                            </Text>

                                            {marginPct !== null && (
                                                <Text
                                                    style={[
                                                        ns.marginText,
                                                        {
                                                            color:
                                                                marginPct >=
                                                                    0
                                                                    ? '#16a34a'
                                                                    : '#dc2626',
                                                        },
                                                    ]}
                                                >
                                                    {marginPct.toFixed(1)}%
                                                    {' '}margin
                                                </Text>
                                            )}
                                        </View>
                                    </View>
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
                onPress={submitOrder}
                disabled={!canSubmit || submitting}
                activeOpacity={0.8}
            >
                <Text style={ns.submitBtnTxt}>
                    Submit for authorization →
                </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />

            <Modal
                visible={propertyPickerOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setPropertyPickerOpen(false)}
            >
                <SafeAreaView style={ns.pickerModalRoot} edges={['top', 'bottom']}>
                    <StatusBar barStyle="light-content" backgroundColor={T.nav} />

                    <View style={ns.pickerHeader}>
                        <Text style={ns.pickerTitle}>Property</Text>
                        <TouchableOpacity
                            onPress={() => setPropertyPickerOpen(false)}
                            style={ns.pickerCloseButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={ns.pickerClose}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={ns.pickerBody}>
                        <TextInput
                            value={propertySearch}
                            onChangeText={setPropertySearch}
                            placeholder="Search property..."
                            placeholderTextColor={T.muted}
                            style={ns.pickerSearch}
                            autoCorrect={false}
                            clearButtonMode="while-editing"
                        />

                        <View style={ns.pickerCountBar}>
                            <Text style={ns.pickerCount}>
                                {propertyPickerItems.length} results
                            </Text>
                        </View>

                        <FlatList
                            style={ns.pickerList}
                            data={propertyPickerItems}
                            keyExtractor={(item: DropdownItem) => String(item.id)}
                            initialNumToRender={30}
                            maxToRenderPerBatch={50}
                            windowSize={10}
                            getItemLayout={(_, index) => ({
                                length: 60,
                                offset: 60 * index,
                                index,
                            })}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        ns.pickerRow,
                                        String(item.id) === String(prpcode) &&
                                        ns.pickerRowSelected,
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setPrpCode(item.id);
                                        setPropertyPickerOpen(false);
                                        setPropertySearch('');

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
                                        setSelectedShade(null);
                                        setQty('');
                                        setColourways([]);
                                    }}
                                >
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text
                                            style={[
                                                ns.pickerRowTitle,
                                                String(item.id) === String(prpcode) &&
                                                ns.pickerRowTitleSelected,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {item.label}
                                        </Text>
                                        {!!item.sub && (
                                            <Text style={ns.pickerRowSub} numberOfLines={1}>
                                                {item.sub}
                                            </Text>
                                        )}
                                    </View>

                                    {String(item.id) === String(prpcode) && (
                                        <Text style={ns.pickerCheck}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={ns.pickerEmpty}>
                                    <Text style={ns.pickerEmptyTitle}>No results</Text>
                                    <Text style={ns.pickerEmptySub}>
                                        Try a different search term
                                    </Text>
                                </View>
                            }
                        />
                    </View>
                </SafeAreaView>
            </Modal>

            <Modal
                visible={yearPickerOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setYearPickerOpen(false)}
            >
                <SafeAreaView style={ns.pickerModalRoot} edges={['top', 'bottom']}>
                    <StatusBar barStyle="light-content" backgroundColor={T.nav} />

                    <View style={ns.pickerHeader}>
                        <Text style={ns.pickerTitle}>Year</Text>
                        <TouchableOpacity
                            onPress={() => setYearPickerOpen(false)}
                            style={ns.pickerCloseButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={ns.pickerClose}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={ns.pickerBody}>
                        <TextInput
                            value={yearSearch}
                            onChangeText={setYearSearch}
                            placeholder="Search year..."
                            placeholderTextColor={T.muted}
                            style={ns.pickerSearch}
                            autoCorrect={false}
                            clearButtonMode="while-editing"
                        />

                        <View style={ns.pickerCountBar}>
                            <Text style={ns.pickerCount}>
                                {yearPickerItems.length} results
                            </Text>
                        </View>

                        <FlatList
                            style={ns.pickerList}
                            data={yearPickerItems}
                            keyExtractor={(item: DropdownItem) => String(item.id)}
                            initialNumToRender={30}
                            maxToRenderPerBatch={50}
                            windowSize={10}
                            getItemLayout={(_, index) => ({
                                length: 60,
                                offset: 60 * index,
                                index,
                            })}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        ns.pickerRow,
                                        String(item.id) === String(yearno) &&
                                        ns.pickerRowSelected,
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setYearNo(item.id);
                                        setYearPickerOpen(false);
                                        setYearSearch('');

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
                                        setSelectedShade(null);
                                        setQty('');
                                        setColourways([]);
                                    }}
                                >
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text
                                            style={[
                                                ns.pickerRowTitle,
                                                String(item.id) === String(yearno) &&
                                                ns.pickerRowTitleSelected,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {item.label}
                                        </Text>
                                    </View>

                                    {String(item.id) === String(yearno) && (
                                        <Text style={ns.pickerCheck}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={ns.pickerEmpty}>
                                    <Text style={ns.pickerEmptyTitle}>No results</Text>
                                    <Text style={ns.pickerEmptySub}>
                                        Try a different search term
                                    </Text>
                                </View>
                            }
                        />
                    </View>
                </SafeAreaView>
            </Modal>

        </ScrollView>
    );
}

const ns = StyleSheet.create({
    scroll: { padding: 14, paddingTop: 10 },
    card: { marginBottom: 12, overflow: 'hidden' },

    // Property & Year: compact cards like the requested UI.
    // Property + Year compact top section.
    // Keep both cards short; the dropdown component handles its own modal.
    propertyYearTopRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
        alignItems: 'flex-start',
    },
    propertyTopCard: {
        backgroundColor: T.surface,
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingTop: 9,
        paddingBottom: 6,
        minHeight: 74,
        overflow: 'visible',
        borderWidth: 1,
        borderColor: T.border,
    },
    topCardLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: T.ink,
        letterSpacing: 0.45,
        marginBottom: 0,
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
    costingLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: T.muted,
        letterSpacing: 0.5,
        marginBottom: 5,
    },
    costingDetail: {
        fontSize: 10,
        color: T.ink,
        marginTop: 3,
    },
    costingDiff: {
        fontSize: 16,
        fontWeight: '700',
    },
    marginText: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
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
    addCwBtn: {
        height: 46,
        borderWidth: 0.5,
        borderColor: T.border,
        borderRadius: 12,
        backgroundColor: T.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 2,
    },
    addCwBtnText: {
        fontSize: 14,
        color: T.ink,
    },
    cwChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        backgroundColor: T.sub,
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 0.5,
        borderColor: T.border,
    },
    cwSwatch: {
        width: 42,
        height: 42,
        borderRadius: 10,
        flexShrink: 0,
    },
    cwName: {
        fontSize: 14,
        fontWeight: '600',
        color: T.ink,
    },
    cwSub: {
        fontSize: 12,
        color: T.muted,
        marginTop: 2,
    },
    cwQty: {
        fontSize: 14,
        fontWeight: '700',
        color: T.ink,
    },
    cwX: {
        fontSize: 24,
        fontWeight: '300',
        color: T.red,
        lineHeight: 28,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 0.5,
        borderTopColor: T.alt,
        marginTop: 10,
    },
    submitBtn: { backgroundColor: T.copper, borderRadius: 10, padding: 15, alignItems: 'center' },
    submitBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },








    propertyYearField: {
        height: 44,
        borderWidth: 0,
        borderColor: T.border,
        borderRadius: 10,
        backgroundColor: T.surface,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    propertyYearFieldText: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    propertyYearValue: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '600',
        color: T.ink,
        flexShrink: 1,
    },
    propertyYearSub: {
        fontSize: 10,
        lineHeight: 13,
        color: T.muted,
        marginTop: 1,
    },
    propertyYearPlaceholder: {
        color: T.muted,
    },
    propertyYearArrow: {
        fontSize: 12,
        color: T.muted,
        marginLeft: 5,
    },

    pickerOverlay: {
        flex: 1,
        backgroundColor: T.bg,
    },
    pickerSheet: {
        flex: 1,
        width: '100%',
        backgroundColor: T.bg,
    },
    pickerHeader: {
        minHeight: 58,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: T.nav,
    },
    pickerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },
    pickerClose: {
        fontSize: 20,
        lineHeight: 20,
        color: '#A9C0D4',
    },
    pickerModalRoot: {
        flex: 1,
        backgroundColor: '#fff',
    },
    pickerBody: {
        flex: 1,
        backgroundColor: T.bg,
    },
    pickerCloseButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerCountBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    pickerList: {
        flex: 1,
    },
    pickerRowSelected: {
        backgroundColor: T.copper + '12',
    },
    pickerRowTitleSelected: {
        color: T.copper,
        fontWeight: '800',
    },
    pickerEmptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: T.muted,
    },
    pickerEmptySub: {
        fontSize: 12,
        color: T.muted,
        marginTop: 6,
    },
    pickerSearch: {
        margin: 12,
        backgroundColor: T.surface,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: T.border,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        color: T.ink,
    },
    pickerCount: {
        fontSize: 11,
        color: T.muted,
    },
    pickerRow: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: T.alt,
        backgroundColor: T.bg,
    },
    pickerRowTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: T.ink,
    },
    pickerRowSub: {
        fontSize: 11,
        color: T.muted,
        marginTop: 2,
    },
    pickerCheck: {
        fontSize: 16,
        color: T.copper,
        marginLeft: 8,
        fontWeight: '800',
    },
    pickerEmpty: {
        textAlign: 'center',
        paddingVertical: 30,
        color: T.muted,
        fontSize: 13,
        paddingTop: 60,
    },

    // pickerEmpty: {
    //     alignItems: 'center',
    //     paddingTop: 60,
    // },
    // ── Save success screen ──
    successScreen: {
        flex: 1,
        backgroundColor: T.bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    successInner: {
        width: '100%',
        maxWidth: 520,
        alignItems: 'center',
    },
    successIcon: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: T.green + '18',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    successTick: {
        fontSize: 42,
        lineHeight: 48,
        fontWeight: '900',
        color: T.green,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: T.ink,
        textAlign: 'center',
    },
    successSub: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 21,
        color: T.muted,
        textAlign: 'center',
        maxWidth: 360,
    },
    successSOBox: {
        width: '100%',
        marginTop: 24,
        paddingVertical: 18,
        paddingHorizontal: 18,
        borderRadius: 16,
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.border,
        alignItems: 'center',
    },
    successSOLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: T.muted,
    },
    successSONo: {
        marginTop: 7,
        fontSize: 22,
        fontWeight: '900',
        color: T.copper,
    },
    newOrderBtn: {
        width: '100%',
        minHeight: 52,
        marginTop: 18,
        borderRadius: 14,
        backgroundColor: T.copper,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    newOrderBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '900',
    },

});
