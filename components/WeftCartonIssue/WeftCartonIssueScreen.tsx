import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal,
    KeyboardAvoidingView, Platform, RefreshControl, SafeAreaView, useWindowDimensions,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { showSuccess, showError } from '@/common/utils/snackbar';
import HeaderBarwithBack from '@/components/Header';
import SearchableDropdown from '@/Shared/SearchableDropdown';
import { fetchAllPropertyData, fetchAllYeardata } from '../../common/API/Functions';

import { s, C, tagStyle } from './styles';
import * as api from './api';
import { f2, r3, toYmd, toDmy, ymdShow, isToday, makeClientRef, parseCartonCode } from './helpers';
import LineFields, { Beam, LineValue } from './components/LineFields';
import ScannerModal from './components/ScannerModal';
import EditLineSheet, { EditableLine } from './components/EditLineSheet';

type Props = {
    token: string;
    prpCode: string;          // selected property (same as FormState.values.PrpCode today)
    yearNo: string | number;  // selected financial year
    stkType: string;          // selected stock type
    expProdQtyType?: string;  // '1' for new issue mode, '0' otherwise (same rule as the old drawer)
    onClose?: () => void;
};

type Carton = {
    CartNo: string; TranType: any; PUId: any; PSrNo: any; PSubSr: any;
    ItmCode: string; ItmName: string; MerCode: any; MerName: string; GrdCode: any; GrdName: string;
    ShdCode: any; ShdName: string; Denier: number; Chees: number; Wt: number; MItmCode: string;
};

const emptyLine: LineValue = { beam: null, dsn: null, rsr: null };

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
                const current = list.find((y: any) => String(y.YearNo) === String(selectedYearNo));
                setSelectedYear(current || null);
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
    const activeYearNo = selectedYearNo || yearNo;

    const handlePropertyChange = (item: any) => {
        const next = item?.PrpCode || '';
        setSelectedPrpCode(next);
        setSelectedProperty(item || null);
        setSelectedYearNo('');
        setSelectedYear(null);
    };

    const handleYearChange = (item: any) => {
        setSelectedYearNo(item?.YearNo || '');
        setSelectedYear(item || null);
    };


    const [tab, setTab] = useState<'issue' | 'beams'>('issue');
    const { width: screenWidth } = useWindowDimensions();
    const isMobile = screenWidth < 700;

    /* ---------------- master data ---------------- */
    const [beams, setBeams] = useState<Beam[]>([]);
    const [beamsLoading, setBeamsLoading] = useState(false);

    useEffect(() => {
        let alive = true;
        setBeamsLoading(true);
        api.fetchBeams(token, activePrpCode, activeYearNo, dmy)
            .then(list => alive && setBeams(list.map((b: any) => ({ ...b, UId: b.UId ?? b.BeamUId, BeamNo: b.BeamNo }))))
            .finally(() => alive && setBeamsLoading(false));
        return () => { alive = false; };
    }, [activePrpCode, activeYearNo, dmy]);

    /* ---------------- carton ---------------- */
    const [mode, setMode] = useState<'scan' | 'manual'>('scan');
    const [scanErr, setScanErr] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Carton[]>([]);
    const [searching, setSearching] = useState(false);

    const [carton, setCarton] = useState<Carton | null>(null);
    const [cartonLines, setCartonLines] = useState<any[]>([]);
    const [cartonDone, setCartonDone] = useState(false); // fully issued
    const [loadingCarton, setLoadingCarton] = useState(false);

    /* ---------------- entry ---------------- */
    const [line, setLine] = useState<LineValue>(emptyLine);
    const [chees, setChees] = useState('');
    const [wt, setWt] = useState('');
    const [wtTouched, setWtTouched] = useState(false);
    const [formErr, setFormErr] = useState('');
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<{ IssNo: string } | null | undefined>(undefined);
    const clientRef = useRef<string | null>(null); // kept across retries of the same entry

    /* ---------------- beams tab ---------------- */
    const [issues, setIssues] = useState<any[]>([]);
    const [issuesLoading, setIssuesLoading] = useState(false);

    /* ---------------- edit ---------------- */
    const [editLine, setEditLine] = useState<EditableLine | null>(null);

    /* ======================================================================
       Carton load (scan / type / manual pick)
       ====================================================================== */
    const loadCarton = useCallback(async (raw: string, hint: any = {}) => {
        const parsed = parseCartonCode(raw);
        if (!parsed || !parsed.CartNo) {
            setScanErr('Label not recognised. Scan again or type the carton number.');
            return;
        }
        setScanErr('');
        setLoadingCarton(true);
        const r = await api.cartonBalance(token, activePrpCode, activeYearNo, parsed.CartNo, { ...parsed, ...hint });
        setLoadingCarton(false);

        if (!r.ok || !r.payload?.data) {
            setScanErr(r.message || `${parsed.CartNo} is not in weft stock.`);
            return;
        }
        setCarton(r.payload.data);
        setCartonLines(r.payload.lines || []);
        setCartonDone(false);
        resetEntry();
    }, [token, activePrpCode, activeYearNo]);

    const refreshCarton = useCallback(async () => {
        if (!carton) return;
        const r = await api.cartonBalance(token, activePrpCode, activeYearNo, carton.CartNo, carton);
        if (r.ok && r.payload?.data) {
            setCarton({ ...carton, ...r.payload.data });
            setCartonLines(r.payload.lines || []);
            setCartonDone(false);
        } else {
            // No balance left: keep the card, show the lines, offer next carton.
            setCarton({ ...carton, Chees: 0, Wt: 0 });
            setCartonLines(r.payload?.lines || []);
            setCartonDone(true);
        }
    }, [carton, token, activePrpCode, activeYearNo]);

    const clearCarton = () => {
        setCarton(null);
        setCartonLines([]);
        setCartonDone(false);
        resetEntry();
    };

    /* manual search (debounced) */
    useEffect(() => {
        if (tab !== 'issue' || mode !== 'manual' || carton) return;
        const t = setTimeout(async () => {
            setSearching(true);
            const r = await api.searchCartons(token, activePrpCode, activeYearNo, search.trim());
            setSearching(false);
            setResults(r.ok ? api.listOf({ data: r.payload?.data }) : []);
        }, 400);
        return () => clearTimeout(t);
    }, [search, mode, tab, carton, token, activePrpCode, activeYearNo]);

    /* ======================================================================
       Entry
       ====================================================================== */
    function resetEntry() {
        setLine(emptyLine);
        setChees('');
        setWt('');
        setWtTouched(false);
        setFormErr('');
        setPreview(undefined);
        clientRef.current = null;
    }

    // any change to the entry means a new request id
    const touchEntry = () => { clientRef.current = null; setFormErr(''); };

    const onChees = (v: string) => {
        touchEntry();
        setChees(v);
        if (!carton || wtTouched) return;
        const n = parseInt(v, 10);
        if (!(n > 0) || carton.Chees <= 0) { setWt(''); return; }
        setWt(n >= carton.Chees ? f2(carton.Wt) : f2((carton.Wt / carton.Chees) * n)); // last chees takes exact balance
    };

    /* "Adds to IssNo 0045" / "New issue" preview */
    useEffect(() => {
        setPreview(undefined);
        if (!line.beam || !line.dsn) return;
        let alive = true;
        api.findIssue(token, activePrpCode, ymd, line.beam.UId, line.dsn.DsnCode).then(r => {
            if (alive) setPreview(r.payload?.data || null);
        });
        return () => { alive = false; };
    }, [line.beam?.UId, line.dsn?.DsnCode, ymd]);

    const addBeam = async () => {
        if (saving || !carton) return;
        const ch = parseInt(chees, 10);
        const w = r3(parseFloat(wt));

        if (!line.beam) return setFormErr('Select a beam.');
        if (!line.dsn) return setFormErr('Select a design.');
        if (!line.rsr) return setFormErr('Select the weft position (recipe SrNo).');
        if (!(ch > 0)) return setFormErr('Chees must be a whole number above 0.');
        if (!(w > 0)) return setFormErr('Weight must be above 0.');
        if (ch > carton.Chees) return setFormErr(`Only ${carton.Chees} chees left in ${carton.CartNo}.`);
        if (w > carton.Wt + 0.0005) return setFormErr(`Only ${f2(carton.Wt)} kg left in ${carton.CartNo}.`);

        if (!clientRef.current) clientRef.current = makeClientRef();
        setSaving(true);

        const exp = await api.fetchExpProdQty(token, {
            prpcode: activePrpCode, yearno: activeYearNo, wt: w, itmcode: carton.ItmCode, shdcode: carton.ShdCode,
            dsnrcpsrno: line.rsr, beamuid: line.beam.UId, dsncode: line.dsn.DsnCode,
        });

        const r = await api.saveLine(token, {
            prpcode: activePrpCode, yearno: activeYearNo, IssDate: ymd, Shift: shift, StkType: stkType,
            BeamUId: line.beam.UId, DsnCode: line.dsn.DsnCode, DsnRcpSrNo: line.rsr,
            ExpProdQty: exp, ExpProdQtyType: expProdQtyType,
            Chees: ch, Wt: w, ClientRefId: clientRef.current,
            CartNo: carton.CartNo, TranType: carton.TranType, PUId: carton.PUId, PSrNo: carton.PSrNo, PSubSr: carton.PSubSr,
            ItmCode: carton.ItmCode, MerCode: carton.MerCode, GrdCode: carton.GrdCode, ShdCode: carton.ShdCode, Denier: carton.Denier,
        });
        setSaving(false);

        if (!r.ok) {
            // NETWORK: keep clientRef so the retry cannot create a second line
            setFormErr(r.message || 'Could not save. Try again.');
            if (r.errorCode === 'BALANCE_EXCEEDED' || r.errorCode === 'CARTON_EMPTY') refreshCarton();
            return;
        }

        showSuccess?.(`${line.beam.BeamNo}: ${r.message}`);
        resetEntry();
        await refreshCarton();
    };

    /* ======================================================================
       Delete
       ====================================================================== */
    const confirmDeleteLine = (l: any) => {
        Alert.alert(
            'Delete this line?',
            `${l.CartNo}: ${l.Chees} chees, ${f2(l.Qty)} kg from ${l.BeamNo || 'beam'} (IssNo ${l.IssNo}).\nStock goes back to the carton.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        const r = await api.deleteLine(token, { prpcode: activePrpCode, yearno: activeYearNo, uid: l.UId, srno: l.SrNo, subsr: l.SubSr });
                        if (!r.ok) { showError?.(r.message || 'Could not delete.'); return; }
                        const hd = r.payload?.data?.header_deleted ? ` IssNo ${l.IssNo} had no lines left and was removed.` : '';
                        showSuccess?.(`Line deleted.${hd}`);
                        afterChange();
                    },
                },
            ],
        );
    };

    const confirmDeleteIssue = (iss: any) => {
        Alert.alert(
            `Delete IssNo ${iss.IssNo}?`,
            `${iss.BeamNo} / ${iss.DsnCode}, ${ymdShow(iss.IssDate)}. All carton lines are removed and stock goes back.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete issue', style: 'destructive', onPress: async () => {
                        const r = await api.deleteIssue(token, { prpcode: activePrpCode, yearno: activeYearNo, uid: iss.UId });
                        if (!r.ok) { showError?.(r.message || 'Could not delete.'); return; }
                        showSuccess?.(`IssNo ${iss.IssNo} deleted.`);
                        afterChange();
                    },
                },
            ],
        );
    };

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
        });
        setIssuesLoading(false);
        setIssues(r.ok ? api.listOf({ data: r.payload?.data }) : []);
    }, [fromDate, toDate, token, activePrpCode, activeYearNo]);

    useEffect(() => { if (tab === 'beams') loadIssues(); }, [tab, loadIssues]);

    const afterChange = () => {
        if (carton) refreshCarton();
        if (tab === 'beams') loadIssues();
    };

    /* ======================================================================
       Render helpers
       ====================================================================== */
    const issuedChees = useMemo(() => cartonLines.reduce((a, l) => a + (Number(l.Chees) || 0), 0), [cartonLines]);

    const Dots = () => {
        if (!carton) return null;
        const total = Math.min(carton.Chees + issuedChees, 80);
        const used = Math.min(issuedChees, total);
        const now = Math.max(0, Math.min(parseInt(chees, 10) || 0, carton.Chees));
        const arr = [];
        for (let i = 0; i < total; i++) {
            const color = i < used ? C.dotUsed : i < used + now ? C.indigo : C.saffron;
            arr.push(<View key={i} style={[s.dot, { borderColor: color }]} />);
        }
        return <View style={s.dots} accessibilityLabel={`${carton.Chees} chees left`}>{arr}</View>;
    };

    const LineRow = ({ l }: { l: any }) => (
        <View style={s.line}>
            <View style={{ flex: 1 }}>
                <Text style={s.lineTitle}>{l.BeamNo || `Beam ${l.BeamUId}`} / {l.DsnCode}</Text>
                <Text style={s.lineSub}>{l.Chees} chees, {f2(l.Qty)} kg, IssNo {l.IssNo} ({ymdShow(l.IssDate)}), SrNo {l.SrNo}.{l.SubSr}</Text>
                {l.Locked && <Text style={s.lockText}>Return or production entry exists. Locked.</Text>}
            </View>
            <TouchableOpacity style={[s.iconBtn, l.Locked && { opacity: 0.4 }]} disabled={l.Locked} onPress={() => setEditLine(l)} accessibilityLabel="Modify line">
                <Icon name="edit" size={18} color={C.ink2} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.iconBtn, l.Locked && { opacity: 0.4 }]} disabled={l.Locked} onPress={() => confirmDeleteLine(l)} accessibilityLabel="Delete line">
                <Icon name="delete-outline" size={18} color={C.ink2} />
            </TouchableOpacity>
        </View>
    );

    /* ---------------- Issue tab ---------------- */
    const renderIssue = () => (
        <>
            <View style={s.seg}>
                {(['scan', 'manual'] as const).map(m => (
                    <TouchableOpacity
                        key={m}
                        style={[s.segBtn, mode === m && s.segBtnOn]}
                        onPress={() => { setMode(m); setScanErr(''); }}
                    >
                        <Text style={[s.segText, mode === m && s.segTextOn]}>
                            {m === 'scan' ? 'Scan carton' : 'Select manually'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {!carton && mode === 'scan' && (
                <View style={{ alignItems: 'center', paddingTop: 4 }}>
                    <TouchableOpacity
                        style={[s.btn, s.btnPrimary, { minWidth: 180, justifyContent: 'center' }]}
                        onPress={() => setScannerOpen(true)}
                        accessibilityLabel="Open camera scanner"
                    >
                        <Icon name="qr-code-scanner" size={22} color="#fff" />
                        <Text style={[s.btnText, { color: '#fff', marginLeft: 8 }]}>Scan carton</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!carton && mode === 'manual' && (
                <View>
                    <Text style={s.label}>Search carton, item or shade</Text>
                    <TextInput
                        style={s.input}
                        placeholder="10452 or 75D"
                        value={search}
                        onChangeText={setSearch}
                        autoCorrect={false}
                    />
                    <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 10, marginTop: 8, overflow: 'hidden' }}>
                        {searching && <ActivityIndicator style={{ padding: 16 }} color={C.indigo} />}
                        {!searching && results.length === 0 && (
                            <Text style={[s.hint, { padding: 12, marginTop: 0 }]}>No carton with balance matches.</Text>
                        )}
                        {!searching && results.map((c: Carton) => (
                            <TouchableOpacity
                                key={`${c.CartNo}-${c.PUId}-${c.PSrNo}-${c.PSubSr}`}
                                style={s.listRow}
                                onPress={() => loadCarton(c.CartNo, c)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={s.lineTitle}>{c.CartNo}</Text>
                                    <Text style={s.lineSub}>{c.ItmName}, {c.ShdName}, {c.GrdName}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={s.lineTitle}>{c.Chees} chees</Text>
                                    <Text style={s.lineSub}>{f2(c.Wt)} kg</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {!!scanErr && <View style={[s.msg, { backgroundColor: C.badSoft, marginTop: 10 }]}><Text style={[s.msgText, { color: C.bad }]}>{scanErr}</Text></View>}
            {loadingCarton && <ActivityIndicator style={{ marginTop: 16 }} color={C.indigo} />}

            {!carton && !loadingCarton && (
                <View style={s.empty}>
                    <Text style={s.emptyTitle}>Start with a carton</Text>
                    <Text style={s.emptyText}>Its balance chees and weight appear here, then issue it to one beam after another.</Text>
                </View>
            )}

            {!!carton && (
                <>
                    <View style={s.card}>
                        <View style={s.headerRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.cartNo}>{carton.CartNo}</Text>
                                <Text style={s.sub}>{carton.ItmName}, {carton.ShdName}, grade {carton.GrdName}</Text>
                            </View>
                            <TouchableOpacity style={[s.btn, s.btnSm]} onPress={clearCarton}><Text style={[s.btnText, s.btnSmText]}>Change carton</Text></TouchableOpacity>
                        </View>
                        <Dots />
                        <View style={s.balRow}>
                            <View style={s.balBox}><Text style={s.balLabel}>Balance chees</Text><Text style={s.balValue}>{carton.Chees}</Text></View>
                            <View style={s.balBox}><Text style={s.balLabel}>Balance weight (kg)</Text><Text style={s.balValue}>{f2(carton.Wt)}</Text></View>
                        </View>
                        <View style={s.legend}>
                            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.dotUsed }]} /><Text style={s.legendText}>Issued</Text></View>
                            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.indigo }]} /><Text style={s.legendText}>This entry</Text></View>
                            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.saffron }]} /><Text style={s.legendText}>Available</Text></View>
                        </View>
                    </View>

                    <View style={s.secRow}>
                        <Text style={s.secTitle}>Issued from this carton</Text>
                        <Text style={s.secSub}>{cartonLines.length} line{cartonLines.length === 1 ? '' : 's'}</Text>
                    </View>
                    {cartonLines.length === 0 && <Text style={[s.hint, { marginTop: 0 }]}>Nothing issued from this carton yet.</Text>}
                    {cartonLines.map(l => <LineRow key={`${l.UId}-${l.SrNo}-${l.SubSr}`} l={l} />)}

                    {(cartonDone || carton.Chees <= 0) ? (
                        <View style={[s.msg, { backgroundColor: C.okSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }]}>
                            <Text style={[s.msgText, { color: C.ok }]}>Carton fully issued.</Text>
                            <TouchableOpacity style={[s.btn, s.btnSm, s.btnPrimary]} onPress={clearCarton}><Text style={[s.btnPrimaryText, s.btnSmText]}>Next carton</Text></TouchableOpacity>
                        </View>
                    ) : (
                        <View style={s.entry}>
                            <View style={[s.secRow, { marginTop: 0 }]}>
                                <Text style={s.secTitle}>Issue to a beam</Text>
                                <Text style={s.secSub}>Saves on add</Text>
                            </View>

                            <LineFields
                                token={token} prpcode={activePrpCode} yearno={activeYearNo} stkType={stkType} dmy={dmy}
                                beams={beams} beamsLoading={beamsLoading} mitmcode={carton.MItmCode}
                                value={line} onChange={v => { touchEntry(); setLine(v); }} isMobile={isMobile}
                            />

                            <View style={[s.row2, isMobile && s.row2Mobile]}>
                                <View style={s.col}>
                                    <Text style={s.label}>Chees</Text>
                                    <TextInput style={s.input} keyboardType="number-pad" value={chees} onChangeText={onChees} placeholder={`max ${carton.Chees}`} />
                                </View>
                                <View style={s.col}>
                                    <Text style={s.label}>Weight (kg)</Text>
                                    <TextInput style={s.input} keyboardType="decimal-pad" value={wt}
                                        onChangeText={v => { touchEntry(); setWt(v); setWtTouched(v !== ''); }} />
                                </View>
                            </View>

                            {preview !== undefined && !!line.beam && !!line.dsn && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    {preview
                                        ? <View style={[s.tag, tagStyle('ok').box]}><Text style={[s.tagText, tagStyle('ok').text]}>Adds to IssNo {preview.IssNo}</Text></View>
                                        : <View style={[s.tag, tagStyle('new').box]}><Text style={[s.tagText, tagStyle('new').text]}>New issue</Text></View>}
                                    <Text style={[s.hint, { marginTop: 0, flex: 1 }]}>
                                        {preview ? 'Issue for this beam and design already exists on this date.' : `First entry for this beam and design on ${ymdShow(ymd)}.`}
                                    </Text>
                                </View>
                            )}
                            {!!chees && !wtTouched && <Text style={[s.hint, { marginTop: 0, marginBottom: 8 }]}>Weight filled from average chees weight. Edit it if the scale says otherwise.</Text>}
                            {!!formErr && <View style={[s.msg, { backgroundColor: C.badSoft }]}><Text style={[s.msgText, { color: C.bad }]}>{formErr}</Text></View>}

                            <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={addBeam} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : (<><Icon name="add" size={18} color="#fff" /><Text style={s.btnPrimaryText}>Add beam</Text></>)}
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}
        </>
    );

    /* ---------------- Beams tab ---------------- */
    const renderBeams = () => (
        <>
            {!issuesLoading && issues.length === 0 && (
                <View style={s.empty}>
                    <Text style={s.emptyTitle}>No weft issue here</Text>
                    <Text style={s.emptyText}>Issue a carton from the Issue tab and it shows up grouped by beam.</Text>
                </View>
            )}

            {issues.map(iss => (
                <View key={iss.UId} style={s.issCard}>
                    <View style={s.issHead}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.issTitle}>{iss.BeamNo || `Beam ${iss.BeamUId}`} / {iss.DsnCode}</Text>
                            <Text style={s.lineSub}>{iss.DsnName}{iss.DsnName ? ', ' : ''}IssNo {iss.IssNo}, {ymdShow(iss.IssDate)}, shift {iss.Shift}</Text>
                            <Text style={s.lineSub}>{iss.TotChees} chees, {f2(iss.TotQty)} kg</Text>
                            {iss.Locked && <Text style={s.lockText}>Return or production entry exists. Locked.</Text>}
                        </View>
                        <TouchableOpacity style={[s.btn, s.btnSm, s.btnDanger, iss.Locked && { opacity: 0.4 }]} disabled={iss.Locked} onPress={() => confirmDeleteIssue(iss)}>
                            <Text style={[s.btnDangerText, s.btnSmText]}>Delete issue</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
                        {(iss.groups || []).map((g: any) => (
                            <View key={g.SrNo}>
                                <View style={s.grpRow}>
                                    <Text style={s.grpText}>SrNo {g.SrNo}: {g.ItmName || g.ItmCode}, recipe {g.DsnRcpSrNo}</Text>
                                    <Text style={s.grpText}>{g.TotPcs} ctn, {f2(g.TotQty)} kg</Text>
                                </View>
                                {(g.lines || []).map((l: any) => (
                                    <LineRow
                                        key={`${l.UId}-${l.SrNo}-${l.SubSr}`}
                                        l={{
                                            ...l, IssNo: iss.IssNo, IssDate: iss.IssDate, BeamUId: iss.BeamUId, BeamNo: iss.BeamNo,
                                            DsnCode: iss.DsnCode, DsnName: iss.DsnName, Locked: iss.Locked,
                                            ItmCode: g.ItmCode, ShdCode: g.ShdCode,
                                        }}
                                    />
                                ))}
                            </View>
                        ))}
                    </View>
                </View>
            ))}
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

            {tab === 'beams' && <View style={s.headerMeta}>
                <View style={[s.headerFilterItem, isMobile && s.headerFilterItemMobile]}>
                    <Text style={s.headerFilterLabel}>Property</Text>
                    <SearchableDropdown
                        key={`header-prp-${activePrpCode}`}
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

                <View style={[s.headerFilterItem, isMobile && s.headerFilterItemMobile]}>
                    <Text style={s.headerFilterLabel}>Year</Text>
                    <SearchableDropdown
                        key={`header-year-${activeYearNo}`}
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

                <TouchableOpacity style={s.headerChip} onPress={() => setDatePicker(true)}>
                    <Icon name="event" size={16} color={C.primary} />
                    <Text style={s.headerChipText}>{dmy}</Text>
                </TouchableOpacity>
                <Text style={s.headerNote}>{isToday(date) ? 'Today' : 'Back-dated'}</Text>
            </View>}

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    contentContainerStyle={[s.body, isMobile ? s.bodyMobile : s.bodyWeb]}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={tab === 'beams' && issuesLoading} onRefresh={() => (tab === 'beams' ? loadIssues() : refreshCarton())} />}
                >
                    {tab === 'issue' ? renderIssue() : renderBeams()}
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={s.tabs}>
                <TouchableOpacity style={s.tab} onPress={() => setTab('issue')}>
                    <Icon name="qr-code-scanner" size={22} color={tab === 'issue' ? C.indigo : C.ink2} />
                    <Text style={[s.tabText, tab === 'issue' && s.tabTextOn]}>Issue</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.tab} onPress={() => setTab('beams')}>
                    <Icon name="view-agenda" size={22} color={tab === 'beams' ? C.indigo : C.ink2} />
                    <Text style={[s.tabText, tab === 'beams' && s.tabTextOn]}>Beams</Text>
                </TouchableOpacity>
            </View>

            <DateTimePickerModal
                isVisible={datePicker}
                mode="date"
                date={date}
                maximumDate={new Date()}
                onConfirm={d => {
                    setDatePicker(false);
                    setDate(d);
                    setFromDate(d);
                    if (d > toDate) setToDate(d);
                }}
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
                <View style={s.modalWrap}>
                    <View style={s.filterSheet}>
                        <View style={s.sheetHandle} />
                        <View style={s.filterSheetHeader}>
                            <Text style={s.sheetTitle}>Filter Records</Text>
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
                            <Text style={s.filterLabel}>Property</Text>
                            <SearchableDropdown
                                key={`filter-prp-${activePrpCode}`}
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

                            <Text style={[s.filterLabel, { marginTop: 12 }]}>Year</Text>
                            <SearchableDropdown
                                key={`filter-year-${activeYearNo}`}
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

                            <Text style={[s.filterLabel, { marginTop: 12 }]}>From Date</Text>
                            <TouchableOpacity style={s.filterDateBtn} onPress={() => setFilterDateType('from')}>
                                <Text style={s.filterDateText}>{ymdShow(fromDate)}</Text>
                            </TouchableOpacity>

                            <Text style={[s.filterLabel, { marginTop: 12 }]}>To Date</Text>
                            <TouchableOpacity style={s.filterDateBtn} onPress={() => setFilterDateType('to')}>
                                <Text style={s.filterDateText}>{ymdShow(toDate)}</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <TouchableOpacity style={[s.btn, s.btnPrimary, { marginTop: 8 }]} onPress={() => {
                            setFilterOpen(false);
                        }}>
                            <Text style={s.btnPrimaryText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ScannerModal
                visible={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScanned={raw => { setScannerOpen(false); loadCarton(raw); }}
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
