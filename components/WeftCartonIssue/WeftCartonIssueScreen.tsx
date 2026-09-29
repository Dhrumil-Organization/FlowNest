import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Modal,
    KeyboardAvoidingView, Platform, RefreshControl, SafeAreaView, useWindowDimensions,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { showSuccess, showError } from '@/common/utils/snackbar';
import AppAlert from '@/common/utils/appAlert';
import HeaderBarwithBack from '@/components/Header';
import SearchableDropdown from '@/Shared/SearchableDropdown';
import { fetchAllPropertyData, fetchAllYeardata } from '../../common/API/Functions';

import { s, C } from './styles';
import * as api from './api';
import { f2, r3, toYmd, toDmy, ymdShow, parseCartonQr } from './helpers';
import type { Beam } from './components/LineFields';
import LineRow from './components/LineRow';
import IssueCard from './components/IssueCard';
import CartonSearch from './components/CartonSearch';
import CartonProgress from './components/CartonProgress';
import IssueEntry, { SavedEntry } from './components/IssueEntry';
import { createEntryBus } from './components/entryBus';
import type { Carton } from './types';
import ScannerModal from './components/ScannerModal';
import EditLineSheet, { EditableLine } from './components/EditLineSheet';


const MemoSearchableDropdown = React.memo((props: any) => <SearchableDropdown {...props} />);

type Props = {
    token: string;
    prpCode: string;          // selected property (same as FormState.values.PrpCode today)
    yearNo: string | number;  // selected financial year
    stkType: string;          // selected stock type
    expProdQtyType?: string;  // '1' for new issue mode, '0' otherwise (same rule as the old drawer)
    onClose?: () => void;
};

const WeftCartonIssueScreen = ({ token, prpCode, yearNo, stkType, expProdQtyType = '1', onClose }: Props) => {
    /* ---------------- header ---------------- */
    const [date, setDate] = useState(new Date());
    const [shift, setShift] = useState(1);
    const [datePicker, setDatePicker] = useState(false);

    // Property / financial year filters (same selection flow as the old WftIssue screen).
    const [propertyList, setPropertyList] = useState<any[]>([]);
    const [yearList, setYearList] = useState<any[]>([]);
    const [selectedPrpCode, setSelectedPrpCode] = useState(prpCode || '');
    const [selectedYearNo, setSelectedYearNo] = useState(yearNo || '');
    const [selectedProperty, setSelectedProperty] = useState<any>(null);
    const [selectedYear, setSelectedYear] = useState<any>(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterDateType, setFilterDateType] = useState<'from' | 'to' | null>(null);
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const ymd = toYmd(date);
    const dmy = toDmy(date);

    useEffect(() => {
        setSelectedPrpCode(prpCode || '');
    }, [prpCode]);

    useEffect(() => {
        setSelectedYearNo(yearNo || '');
    }, [yearNo]);

    useEffect(() => {
        if (!token) return;
        let alive = true;
        fetchAllPropertyData(token)
            .then((rows: any[]) => {
                if (!alive) return;
                const list = Array.isArray(rows) ? rows : [];
                setPropertyList(list);
                const current = list.find((p: any) => String(p.PrpCode) === String(selectedPrpCode));
                setSelectedProperty(current || null);
            })
            .catch(() => { if (alive) setPropertyList([]); });
        return () => { alive = false; };
    }, [token]);

    useEffect(() => {
        if (!token || !selectedPrpCode) {
            setYearList([]);
            setSelectedYear(null);
            return;
        }
        let alive = true;
        fetchAllYeardata(token, selectedPrpCode)
            .then((rows: any[]) => {
                if (!alive) return;
                const list = Array.isArray(rows) ? rows : [];
                setYearList(list);
                // Keep the previously selected year when it exists; otherwise
                // automatically select the first year returned by the API.
                const current = list.find((y: any) => String(y.YearNo) === String(selectedYearNo)) || list[0] || null;
                setSelectedYear(current);
                if (current?.YearNo != null) {
                    setSelectedYearNo(String(current.YearNo));
                }
            })
            .catch(() => { if (alive) setYearList([]); });
        return () => { alive = false; };
    }, [token, selectedPrpCode]);

    useEffect(() => {
        if (!selectedYearNo || yearList.length === 0) return;
        const current = yearList.find((y: any) => String(y.YearNo) === String(selectedYearNo));
        setSelectedYear(current || null);
    }, [selectedYearNo, yearList]);

    const activePrpCode = selectedPrpCode || prpCode;
    // No fallback to the prop year: after a property change the year stays empty until that
    // property's year list arrives, so nothing is fetched with a mismatched property/year.
    const activeYearNo = selectedYearNo;

    const handlePropertyChange = useCallback((item: any) => {
        const next = item?.PrpCode || '';
        setSelectedPrpCode(next);
        setSelectedProperty(item || null);
        setSelectedYearNo('');
        setSelectedYear(null);
    }, []);

    const handleYearChange = useCallback((item: any) => {
        setSelectedYearNo(item?.YearNo || '');
        setSelectedYear(item || null);
    }, []);

    // Browse date is a real filter. Keep the selected date in all date states
    // used by the Beams browse API so changing it immediately refreshes data.
    const handleBrowseDateChange = (value: Date) => {
        const selected = new Date(value);
        selected.setHours(0, 0, 0, 0);
        setDate(selected);
        setFromDate(selected);
        setToDate(selected);
        setDatePicker(false);
    };


    const [tab, setTab] = useState<'issue' | 'beams'>('issue');
    const { width: screenWidth } = useWindowDimensions();
    const isMobile = screenWidth < 700;

    /* ---------------- master data ---------------- */
    const [beams, setBeams] = useState<Beam[]>([]);
    const [beamsLoading, setBeamsLoading] = useState(false);

    useEffect(() => {
        if (!activePrpCode || !activeYearNo) return;
        let alive = true;
        setBeamsLoading(true);
        api.fetchBeams(token, activePrpCode, activeYearNo, dmy)
            .then(list => alive && setBeams(list.map((b: any) => ({ ...b, UId: b.UId ?? b.BeamUId, BeamNo: b.BeamNo }))))
            .finally(() => alive && setBeamsLoading(false));
        return () => { alive = false; };
    }, [token, activePrpCode, activeYearNo, dmy]);

    /* ---------------- carton ---------------- */
    const [mode, setMode] = useState<'scan' | 'manual'>('scan');
    const [scanErr, setScanErr] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);

    const [carton, setCarton] = useState<Carton | null>(null);
    const [cartonLines, setCartonLines] = useState<any[]>([]);
    const [cartonDone, setCartonDone] = useState(false); // fully issued
    const [loadingCarton, setLoadingCarton] = useState(false);
    const [startBal, setStartBal] = useState<{ chees: number; wt: number } | null>(null); // balance when the carton was loaded
    const [issuedNow, setIssuedNow] = useState<{ key: string; beam: string; dsn: string; chees: number; wt: number }[]>([]);
    const cartonRef = useRef<Carton | null>(null);
    cartonRef.current = carton;
    const afterChangeRef = useRef<() => void>(() => { });
    const deleteBusyRef = useRef(false);
    const [entryBus] = useState(createEntryBus); // typed chees -> progress bar, without re-rendering the screen

    /* ---------------- beams tab ---------------- */
    const [issues, setIssues] = useState<any[]>([]);
    const [issuesLoading, setIssuesLoading] = useState(false);

    /* ---------------- edit ---------------- */
    const [editLine, setEditLine] = useState<EditableLine | null>(null);

    /* ======================================================================
       Carton load (scan / manual pick)
       ====================================================================== */
    const setCartonFrom = useCallback((c: Carton) => {
        setCarton(c);
        setStartBal(c.BalUnknown ? null : { chees: Number(c.Chees) || 0, wt: Number(c.Wt) || 0 });
        setCartonLines([]);
        setCartonDone(false);
        setIssuedNow([]);
    }, []);

    /** SCAN: same as the old screen. The QR already has the carton data; the only call made
     *  afterwards is get_item_detail_from_carton (item / merchandise / shade / grade names). */
    const loadScanned = useCallback(async (raw: string) => {
        const q = parseCartonQr(raw);
        if (!q || !q.CartNo) {
            setScanErr('Invalid QR. Scan the carton label again.');
            return;
        }
        setScanErr('');
        setLoadingCarton(true);

        // Plain carton number (handheld scanner): nothing else to read from it, use the search API once.
        if (!q.ItmCode) {
            const r = await api.cartonBalance(token, activePrpCode, activeYearNo, q.CartNo, {});
            setLoadingCarton(false);
            if (!r.ok || !r.payload?.data) {
                setScanErr(r.message || `${q.CartNo} is not in weft stock.`);
                return;
            }
            setCartonFrom({ ...r.payload.data, BalUnknown: false });
            return;
        }

        const cheesQr = parseInt(String(q.Chees ?? 0), 10) || 0;
        const wtQr = Number(q.Wt) || 0;
        const base: Carton = {
            CartNo: q.CartNo, TranType: q.TranType, PUId: q.PUId, PSrNo: q.PSrNo, PSubSr: q.PSubSr,
            ItmCode: q.ItmCode, ItmName: q.ItmName || '', MerCode: q.MerCode, MerName: q.MerName || '',
            GrdCode: q.GrdCode, GrdName: q.GrdName || '', ShdCode: q.ShdCode, ShdName: q.ShdName || '',
            Denier: Number(q.Denier) || 0, Chees: cheesQr, Wt: wtQr, MItmCode: '',
            BalUnknown: !(cheesQr > 0),
        };

        const r = await api.itemDetailFromCarton(token, activePrpCode, activeYearNo, q);
        setLoadingCarton(false);
        const d = r.ok ? r.payload?.data : null;
        if (d) {
            base.ItmName = d.ItmName || base.ItmName;
            base.MerName = d.MerName || base.MerName;
            base.ShdName = d.ShdName || base.ShdName;
            base.GrdName = d.GrdName || base.GrdName;
            base.MItmCode = String(d.MItmCode ?? d.mitmcode ?? d.MainItmCode ?? '');
        }
        setCartonFrom(base);
    }, [token, activePrpCode, activeYearNo, setCartonFrom]);

    /** MANUAL: the search row already has everything, so selecting it needs no further call. */
    const onPickCarton = useCallback((c: Carton) => {
        setScanErr('');
        setCartonFrom({
            ...c,
            Chees: parseInt(String(c.Chees ?? 0), 10) || 0,
            Wt: Number(c.Wt) || 0,
            Denier: Number(c.Denier) || 0,
            BalUnknown: false,
        });
    }, [setCartonFrom]);

    // Stable identity (reads the carton from a ref) so memoised children do not re-render.
    const refreshCarton = useCallback(async () => {
        const cur = cartonRef.current;
        if (!cur) return;
        const r = await api.cartonBalance(token, activePrpCode, activeYearNo, cur.CartNo, cur);
        if (r.ok && r.payload?.data) {
            setCarton(c => (c ? { ...c, ...r.payload.data, BalUnknown: false } : c));
            setCartonLines(r.payload.lines || []);
            setCartonDone(false);
        } else {
            // No balance left: keep the card, show the lines, offer next carton.
            setCarton(c => (c ? { ...c, Chees: 0, Wt: 0, BalUnknown: false } : c));
            setCartonLines(r.payload?.lines || []);
            setCartonDone(true);
        }
    }, [token, activePrpCode, activeYearNo]);

    const clearCarton = useCallback(() => {
        setCarton(null);
        setCartonLines([]);
        setCartonDone(false);
        setStartBal(null);
        setIssuedNow([]);
    }, []);

    /* Scan <-> Manual: never carry one mode's carton / search into the other. */
    const switchMode = (m: 'scan' | 'manual') => {
        if (m === mode) return;
        setMode(m);
        clearCarton();
        setScanErr('');
    };

    /* Property / year changed: the carton, search results and beams belonged to the old selection. */
    const selectionInit = useRef(true);
    useEffect(() => {
        if (selectionInit.current) { selectionInit.current = false; return; }
        clearCarton();
        setScanErr('');
    }, [activePrpCode, activeYearNo, clearCarton]);

    // After a successful save: update the balance and the "issued now" list locally (no extra API call).
    const handleSaved = useCallback((e: SavedEntry) => {
        setIssuedNow(prev => [...prev, { key: `${Date.now()}`, beam: e.beam, dsn: e.dsn, chees: e.chees, wt: e.wt }]);
        const cur = cartonRef.current;
        if (!cur || cur.BalUnknown) return;
        const left = Math.max(0, cur.Chees - e.chees);
        setCarton(c => (c ? { ...c, Chees: left, Wt: Math.max(0, r3(c.Wt - e.wt)) } : c));
        if (left <= 0) setCartonDone(true);
    }, []);

    /* ======================================================================
       Delete
       ====================================================================== */
    const confirmDeleteLine = useCallback((l: any) => {
        AppAlert.alert(
            'Delete this line?',
            `${l.CartNo}: ${l.Chees} chees, ${f2(l.Qty)} kg from ${l.BeamNo || 'beam'} (IssNo ${l.IssNo}).\nStock goes back to the carton.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        if (deleteBusyRef.current) return;
                        deleteBusyRef.current = true;
                        try {
                        const uid = l.UId ?? l.uid ?? l.UID;
                        const srno = l.SrNo ?? l.srno;
                        const subsr = l.SubSr ?? l.subsr ?? l.SubSR;
                        if (uid == null) {
                            showError?.('Delete failed: line UID is missing in browse data.');
                            return;
                        }
                        const r = await api.deleteLine(token, {
                            prpcode: activePrpCode, yearno: activeYearNo,
                            uid, srno, subsr,
                            StkType: l.StkType ?? l.stktype ?? stkType,
                        });
                        if (!r.ok) { showError?.(r.message || 'Could not delete.'); return; }
                        const hd = r.payload?.data?.header_deleted ? ` IssNo ${l.IssNo} had no lines left and was removed.` : '';
                        showSuccess?.(`Line deleted.${hd}`);
                        afterChangeRef.current();
                        } finally {
                            deleteBusyRef.current = false;
                        }
                    },
                },
            ],
        );
    }, [token, activePrpCode, activeYearNo, stkType]);

    const confirmDeleteIssue = useCallback((iss: any) => {
        AppAlert.alert(
            `Delete IssNo ${iss.IssNo}?`,
            `${iss.BeamNo} / ${iss.DsnCode}, ${ymdShow(iss.IssDate)}. All carton lines are removed and stock goes back.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete issue', style: 'destructive', onPress: async () => {
                        if (deleteBusyRef.current) return;
                        deleteBusyRef.current = true;
                        try {
                        const uid = iss.UId ?? iss.uid ?? iss.UID;
                        if (uid == null) {
                            showError?.('Delete failed: issue UID is missing in browse data.');
                            return;
                        }
                        const r = await api.deleteIssue(token, {
                            prpcode: activePrpCode, yearno: activeYearNo,
                            uid,
                            IssNo: iss.IssNo ?? iss.issno,
                            IssDate: iss.IssDate ?? iss.issdate,
                            StkType: iss.StkType ?? iss.stktype ?? stkType,
                        });
                        if (!r.ok) { showError?.(r.message || 'Could not delete.'); return; }
                        showSuccess?.(`IssNo ${iss.IssNo} deleted.`);
                        afterChangeRef.current();
                        } finally {
                            deleteBusyRef.current = false;
                        }
                    },
                },
            ],
        );
    }, [token, activePrpCode, activeYearNo, stkType]);

    /* ======================================================================
       Beams tab
       ====================================================================== */
    const loadIssues = useCallback(async () => {
        setIssuesLoading(true);
        const r = await api.issueList(token, {
            prpcode: activePrpCode,
            yearno: activeYearNo,
            fromdate: toYmd(fromDate),
            todate: toYmd(toDate),
            ExpprodQty: 1,
        });
        setIssuesLoading(false);
        setIssues(r.ok ? api.listOf({ data: r.payload?.data }) : []);
    }, [fromDate, toDate, token, activePrpCode, activeYearNo]);

    useEffect(() => { if (tab === 'beams') loadIssues(); }, [tab, loadIssues]);

    const afterChange = () => {
        if (carton) refreshCarton();
        if (tab === 'beams') loadIssues();
    };
    afterChangeRef.current = afterChange;

    // Flatten once per fetch so memoised cards/rows keep stable props between renders.
    const issuesView = useMemo(() => issues.map((iss: any) => ({
        ...iss,
        groups: (iss.groups || []).map((g: any) => ({
            ...g,
            lines: (g.lines || []).map((l: any) => ({
                ...l, IssNo: iss.IssNo, IssDate: iss.IssDate, BeamUId: iss.BeamUId, BeamNo: iss.BeamNo,
                DsnCode: iss.DsnCode, DsnName: iss.DsnName, Locked: iss.Locked ?? iss.locked,
                StkType: iss.StkType ?? iss.stktype ?? stkType,
                ItmCode: g.ItmCode, ShdCode: g.ShdCode, StkType: iss.StkType ?? iss.stktype ?? stkType,
            })),
        })),
    })), [issues]);

    const renderIssueItem = useCallback(({ item }: { item: any }) => (
        <IssueCard iss={item} onEditLine={setEditLine} onDeleteLine={confirmDeleteLine} onDeleteIssue={confirmDeleteIssue} />
    ), [confirmDeleteLine, confirmDeleteIssue]);

    /* ======================================================================
       Render helpers
       ====================================================================== */

    /* ---------------- Issue tab ---------------- */
    const cartonReady = !!carton;
    const fullyIssued = !!carton && (cartonDone || (!carton.BalUnknown && carton.Chees <= 0));

    const renderIssue = () => (
        <>
            <View style={s.seg}>
                {(['scan', 'manual'] as const).map(m => (
                    <TouchableOpacity key={m} style={[s.segBtn, mode === m && s.segBtnOn]} onPress={() => switchMode(m)} activeOpacity={0.8}>
                        <Icon name={m === 'scan' ? 'qr-code-scanner' : 'search'} size={18} color={mode === m ? C.primary : C.ink2} />
                        <Text style={[s.segText, mode === m && s.segTextOn]}>{m === 'scan' ? 'Scan carton' : 'Select manually'}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* SCAN: only before a carton is chosen */}
            {mode === 'scan' && !cartonReady && (
                <View style={s.scanZone}>
                    <View style={s.scanIconWrap}><Icon name="qr-code-scanner" size={32} color={C.primary} /></View>
                    <Text style={s.scanTitle}>Scan carton label</Text>
                    <Text style={s.scanText}>Point the camera at the QR on the carton. Its balance appears here, then issue it to one beam after another.</Text>
                    <TouchableOpacity
                        style={[s.btn, s.btnPrimary, { minWidth: 190 }]}
                        onPress={() => setScannerOpen(true)}
                        accessibilityLabel="Open camera scanner"
                    >
                        <Icon name="photo-camera" size={20} color="#fff" />
                        <Text style={s.btnPrimaryText}>Open scanner</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* MANUAL: the search list goes away as soon as a carton is selected */}
            {mode === 'manual' && !cartonReady && (
                <CartonSearch token={token} prpcode={activePrpCode} yearno={activeYearNo} onPick={onPickCarton} />
            )}

            {!!scanErr && <View style={[s.msg, { backgroundColor: C.badSoft, marginTop: 10 }]}><Text style={[s.msgText, { color: C.bad }]}>{scanErr}</Text></View>}
            {loadingCarton && <ActivityIndicator style={{ marginTop: 16 }} color={C.primary} />}

            {!!carton && (
                <>
                    <View style={s.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={s.cardAvatar}><Icon name="inventory-2" size={22} color={C.primary} /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.cartNo}>{carton.CartNo}</Text>
                                <Text style={s.sub}>{mode === 'scan' ? 'Scanned carton' : 'Selected carton'}</Text>
                            </View>
                            <TouchableOpacity style={[s.btn, s.btnSm]} onPress={clearCarton} activeOpacity={0.8}>
                                <Icon name="swap-horiz" size={16} color={C.ink} />
                                <Text style={[s.btnText, s.btnSmText]}>Change</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={s.chipRow}>
                            {[carton.ItmName, carton.MerName, carton.ShdName ? `Shade ${carton.ShdName}` : '', carton.GrdName ? `Grade ${carton.GrdName}` : '']
                                .filter(Boolean)
                                .map((x, i) => <View key={i} style={s.chip}><Text style={s.chipText}>{x}</Text></View>)}
                        </View>

                        <View style={s.balRow}>
                            <View style={s.balBox}><Text style={s.balLabel}>Balance chees</Text><Text style={s.balValue}>{carton.BalUnknown ? '-' : carton.Chees}</Text></View>
                            <View style={s.balBox}><Text style={s.balLabel}>Balance weight (kg)</Text><Text style={s.balValue}>{carton.BalUnknown ? '-' : f2(carton.Wt)}</Text></View>
                        </View>

                        <CartonProgress carton={carton} startBal={startBal} bus={entryBus} />
                        {carton.BalUnknown && <Text style={[s.hint, { marginTop: 10 }]}>This label has no chees count, so the balance is checked when you save.</Text>}
                    </View>

                    {(cartonLines.length > 0 || issuedNow.length > 0) && (
                        <View style={s.secRow}>
                            <Text style={s.secTitle}>Issued from this carton</Text>
                            <Text style={s.secSub}>{cartonLines.length + issuedNow.length} line{cartonLines.length + issuedNow.length === 1 ? '' : 's'}</Text>
                        </View>
                    )}
                    {cartonLines.map(l => <LineRow key={`${l.UId}-${l.SrNo}-${l.SubSr}`} l={l} onEdit={setEditLine} onDelete={confirmDeleteLine} />)}
                    {issuedNow.map(x => (
                        <View key={x.key} style={s.line}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.lineTitle}>{x.beam} / {x.dsn}</Text>
                                <Text style={s.lineSub}>{x.chees} chees, {f2(x.wt)} kg. Edit or delete from the Beams tab.</Text>
                            </View>
                            <Icon name="check-circle" size={20} color={C.ok} />
                        </View>
                    ))}

                    {fullyIssued ? (
                        <View style={[s.msg, { backgroundColor: C.okSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }]}>
                            <Text style={[s.msgText, { color: C.ok, fontWeight: '700' }]}>Carton fully issued.</Text>
                            <TouchableOpacity style={[s.btn, s.btnSm, s.btnPrimary]} onPress={clearCarton}><Text style={[s.btnPrimaryText, s.btnSmText]}>Next carton</Text></TouchableOpacity>
                        </View>
                    ) : (
                        <IssueEntry
                            key={`${carton.CartNo}-${carton.PUId}-${carton.PSrNo}-${carton.PSubSr}`}
                            token={token} prpcode={activePrpCode} yearno={activeYearNo} stkType={stkType}
                            dmy={dmy} ymd={ymd} shift={shift} expProdQtyType={expProdQtyType}
                            carton={carton} beams={beams} beamsLoading={beamsLoading} isMobile={isMobile}
                            bus={entryBus} onSaved={handleSaved} onStale={refreshCarton}
                        />
                    )}
                </>
            )}

        </>
    );

    /* ======================================================================
       Screen
       ====================================================================== */
    return (
        <SafeAreaView style={s.screen}>
            <HeaderBarwithBack
                userName={''}
                header={'Weft Issue'}
                subHeader={'Issue and manage weft yarn for production'}
                breadcrumb={'Weft Issue'}
                SearchBar={false}
            />

            <View style={[s.criteriaTrigger, isMobile ? s.criteriaTriggerMobile : s.criteriaTriggerWebWrap]}>
                <TouchableOpacity style={s.criteriaTriggerButton} activeOpacity={0.85} onPress={() => setFilterOpen(true)} accessibilityLabel="Change property and year">
                    <View style={s.criteriaTriggerIcon}>
                        <Icon name="tune" size={20} color={C.primary} />
                    </View>
                    <View style={s.criteriaTriggerTextWrap}>
                        <View style={s.critRow}>
                            <View style={s.critItem}>
                                <Text style={s.critLabel}>Property</Text>
                                <Text style={s.critValue} numberOfLines={1}>{selectedProperty?.LngName || selectedProperty?.PrpName || 'Select'}</Text>
                            </View>
                            <View style={s.critDivider} />
                            <View style={{ minWidth: 84 }}>
                                <Text style={s.critLabel}>Year</Text>
                                <Text style={s.critValue} numberOfLines={1}>{selectedYear?.YearName || selectedYear?.YearNo || 'Select'}</Text>
                            </View>
                        </View>
                        {tab === 'beams' && <Text style={s.critDates}>{toDmy(fromDate)} to {toDmy(toDate)}</Text>}
                    </View>
                    <Icon name="keyboard-arrow-right" size={22} color={C.ink2} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {tab === 'issue' ? (
                    <ScrollView
                        contentContainerStyle={[s.body, isMobile ? s.bodyMobile : s.bodyWeb]}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={<RefreshControl refreshing={false} onRefresh={refreshCarton} />}
                    >
                        {renderIssue()}
                    </ScrollView>
                ) : (
                    <FlatList
                        data={issuesView}
                        keyExtractor={(i: any) => String(i.UId)}
                        renderItem={renderIssueItem}
                        contentContainerStyle={[s.body, isMobile ? s.bodyMobile : s.bodyWeb]}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={<RefreshControl refreshing={issuesLoading} onRefresh={loadIssues} />}
                        initialNumToRender={5}
                        maxToRenderPerBatch={5}
                        windowSize={7}
                        removeClippedSubviews
                        ListEmptyComponent={issuesLoading ? null : (
                            <View style={s.empty}>
                                <View style={s.emptyIcon}><Icon name="view-agenda" size={24} color={C.ink2} /></View>
                                <Text style={s.emptyTitle}>No weft issue here</Text>
                                <Text style={s.emptyText}>Issue a carton from the Issue tab and it shows up grouped by beam.</Text>
                            </View>
                        )}
                    />
                )}
            </KeyboardAvoidingView>

            <View style={s.tabs}>
                <TouchableOpacity style={[s.tab, tab === 'issue' && s.tabOn]} onPress={() => setTab('issue')}>
                    <Icon name="qr-code-scanner" size={22} color={tab === 'issue' ? C.indigo : C.ink2} />
                    <Text style={[s.tabText, tab === 'issue' && s.tabTextOn]}>Issue</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.tab, tab === 'beams' && s.tabOn]} onPress={() => setTab('beams')}>
                    <Icon name="view-agenda" size={22} color={tab === 'beams' ? C.indigo : C.ink2} />
                    <Text style={[s.tabText, tab === 'beams' && s.tabTextOn]}>Beams</Text>
                </TouchableOpacity>
            </View>

            <DateTimePickerModal
                isVisible={datePicker}
                mode="date"
                date={date}
                onConfirm={handleBrowseDateChange}
                onCancel={() => setDatePicker(false)}
            />

            <DateTimePickerModal
                isVisible={filterDateType !== null}
                mode="date"
                date={filterDateType === 'from' ? fromDate : toDate}
                maximumDate={new Date()}
                onConfirm={d => {
                    setFilterDateType(null);
                    if (filterDateType === 'from') {
                        setFromDate(d);
                        if (d > toDate) setToDate(d);
                    } else {
                        setToDate(d);
                    }
                }}
                onCancel={() => setFilterDateType(null)}
            />

            <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
                <View style={[s.modalWrap, !isMobile && s.modalWrapWeb]}>
                    <View style={[s.filterSheet, !isMobile && s.filterSheetWeb]}>
                        <View style={[s.sheetHandle, !isMobile && s.sheetHandleHidden]} />
                        <View style={s.filterSheetHeader}>
                            <Text style={s.sheetTitle}>{tab === 'beams' ? 'Filter Records' : 'Property & Year'}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                <TouchableOpacity onPress={() => {
                                    setSelectedPrpCode(prpCode || '');
                                    setSelectedYearNo(yearNo || '');
                                    setSelectedProperty(propertyList.find((p: any) => String(p.PrpCode) === String(prpCode)) || null);
                                    setSelectedYear(yearList.find((y: any) => String(y.YearNo) === String(yearNo)) || null);
                                    const today = new Date();
                                    setFromDate(today);
                                    setToDate(today);
                                }}>
                                    <Text style={s.filterReset}>Reset</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setFilterOpen(false)} accessibilityLabel="Close filters">
                                    <Icon name="close" size={24} color={C.ink} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 12 }}>
                            <View style={[s.filterFieldRow, isMobile && s.filterFieldRowMobile]}>
                                <View style={s.filterField}>
                                    <Text style={s.filterLabel}>Property</Text>
                                    <SearchableDropdown
                                        data={propertyList}
                                        labelKey="LngName"
                                        valueKey="PrpCode"
                                        placeholder="Choose property..."
                                        pageSize={10}
                                        initialValue={selectedProperty}
                                        onSelect={handlePropertyChange}
                                        multiple={false}
                                        emptyMessage="No properties available"
                                    />
                                </View>

                                <View style={s.filterField}>
                                    <Text style={s.filterLabel}>Year</Text>
                                    <SearchableDropdown
                                        data={yearList}
                                        labelKey="YearName"
                                        valueKey="YearNo"
                                        placeholder="Choose year..."
                                        pageSize={10}
                                        initialValue={selectedYear}
                                        onSelect={handleYearChange}
                                        multiple={false}
                                        emptyMessage="No years data available"
                                    />
                                </View>
                            </View>

                            {tab === 'beams' && (
                            <View style={[s.filterFieldRow, isMobile && s.filterFieldRowMobile, { marginTop: 12 }]}>
                                <View style={s.filterField}>
                                    <Text style={s.filterLabel}>From Date</Text>
                                    <TouchableOpacity style={s.filterDateBtn} onPress={() => setFilterDateType('from')} activeOpacity={0.8}>
                                        <Icon name="calendar-today" size={17} color={C.primary} />
                                        <Text style={s.filterDateText}>{toDmy(fromDate)}</Text>
                                        <Icon name="chevron-right" size={18} color={C.ink2} />
                                    </TouchableOpacity>
                                </View>

                                <View style={s.filterField}>
                                    <Text style={s.filterLabel}>To Date</Text>
                                    <TouchableOpacity style={s.filterDateBtn} onPress={() => setFilterDateType('to')} activeOpacity={0.8}>
                                        <Icon name="calendar-today" size={17} color={C.primary} />
                                        <Text style={s.filterDateText}>{toDmy(toDate)}</Text>
                                        <Icon name="chevron-right" size={18} color={C.ink2} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity style={[s.btn, s.btnPrimary, { marginTop: 8 }]} onPress={() => {
                            setFilterOpen(false);
                        }}>
                            <Text style={s.btnPrimaryText}>{tab === 'beams' ? 'Apply Filters' : 'Done'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ScannerModal
                visible={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScanned={raw => { setScannerOpen(false); loadScanned(raw); }}
            />

            <EditLineSheet
                visible={!!editLine}
                line={editLine}
                token={token} prpcode={activePrpCode} yearno={activeYearNo} stkType={stkType} dmy={dmy} expProdQtyType={expProdQtyType}
                beams={beams} beamsLoading={beamsLoading}
                onClose={() => setEditLine(null)}
                onSaved={msg => { setEditLine(null); showSuccess?.(msg); afterChange(); }}
            />
        </SafeAreaView>
    );
};

export default WeftCartonIssueScreen;
