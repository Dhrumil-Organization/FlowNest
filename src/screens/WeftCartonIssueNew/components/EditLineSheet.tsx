import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { cartonBalance, fetchExpByFlag, findIssue, modifyLine } from '../api';
import { f2, flagOf, isExpQtyError, r3, typeOf, ymdShow } from '../helpers';
import { C, s, tagStyle } from '../styles';
import ExpQtyRefresh, { ExpRefreshInfo } from './ExpQtyRefresh';
import LineFields, { Beam, LineValue } from './LineFields';

export type EditableLine = {
    UId: number; SrNo: number; SubSr: number; CartNo: string; Chees: number; Qty: number;
    DsnRcpSrNo: number; IssNo: string; IssDate: any; BeamUId: any; BeamNo: string; DsnCode: any; DsnName?: string; IssDsnCode?: any; IssDsnName?: string; isnewdesign?: any; ExpProdQty?: any; ExpQty?: any; ExpProdQtyType?: any; ExpQtyType?: any;
    ItmCode?: string; ShdCode?: any; StkType?: string;
    Shift?: any; MerCode?: any; GrdCode?: any; IssTo?: any; Remark?: any; ClientRefId?: any;
    TranType?: any; PUId?: any; PSrNo?: any; PSubSr?: any; Denier?: any;
};

type Props = {
    visible: boolean;
    line: EditableLine | null;
    token: string; prpcode: string; yearno: any; stkType: string; dmy: string; expProdQtyType: string;
    beams: Beam[]; beamsLoading?: boolean;
    onClose: () => void;
    onSaved: (message: string) => void;
};

/**
 * Modify one saved line.
 *  same beam + design + recipe SrNo  -> update in place
 *  same beam + design, other SrNo     -> moves to another D1 group of the same issue
 *  other beam or design               -> moves to that beam/design issue of the SAME date (existing or new)
 */
const EditLineSheet = ({ visible, line, token, prpcode, yearno, stkType, dmy, expProdQtyType, beams, beamsLoading, onClose, onSaved }: Props) => {
    const { width: winW } = useWindowDimensions();
    const isMobile = winW < 700;
    const [val, setVal] = useState<LineValue>({ beam: null, dsn: null, rsr: null });
    const [chees, setChees] = useState('');
    const [wt, setWt] = useState('');
    const [info, setInfo] = useState<{ balChees: number; balWt: number; mitm: string; itm: string; shd: any } | null>(null);
    const [effect, setEffect] = useState<{ kind: 'ok' | 'new' | 'info'; text: string } | null>(null);
    const [err, setErr] = useState('');
    const [saving, setSaving] = useState(false);
    const [errorNotice, setErrorNotice] = useState<{ title: string; message: string } | null>(null); // modify failed modal
    // The design object we started with (from the browse response). If val.dsn is a different
    // object, the user picked a design from the list -> that design's own flags are used.
    const initialDsn = useRef<any>(null);

    // "Expected Production Qty must be greater than zero." -> show a Refresh button under chees / weight
    const [expNeedsRefresh, setExpNeedsRefresh] = useState(false);
    const [expRefreshing, setExpRefreshing] = useState(false);
    const [expInfo, setExpInfo] = useState<ExpRefreshInfo>(null);
    const refreshedExp = useRef<{ key: string; value: number } | null>(null); // value fetched by the Refresh button
    const resetExpRefresh = () => { setExpNeedsRefresh(false); setExpInfo(null); refreshedExp.current = null; };

    useEffect(() => {
        if (!visible || !line) return;
        initialDsn.current = { DsnCode: line.DsnCode, DsnName: line.DsnName, IssDsnCode: line.IssDsnCode, IssDsnName: line.IssDsnName, isnewdesign: typeOf(line) };
        setVal({
            beam: { UId: line.BeamUId, BeamNo: line.BeamNo },
            stkType: (line.StkType === 'P' ? 'P' : line.StkType === 'I' ? 'I' : stkType) as 'I' | 'P',
            dsn: initialDsn.current,
            rsr: Number(line.DsnRcpSrNo),
        });
        setChees(String(line.Chees));
        setWt(f2(line.Qty));
        setErr('');
        setErrorNotice(null);
        resetExpRefresh();
        setInfo(null);
        cartonBalance(token, prpcode, yearno, line.CartNo).then(r => {
            const c = r.payload?.data;
            setInfo({
                balChees: c ? Number(c.Chees) || 0 : 0,
                balWt: c ? Number(c.Wt) || 0 : 0,
                mitm: String(c?.MItmCode ?? r.payload?.MItmCode ?? ''),
                itm: c?.ItmCode ?? line.ItmCode ?? '',
                shd: c?.ShdCode ?? line.ShdCode ?? '',
            });
        });
    }, [visible, line?.UId, line?.SrNo, line?.SubSr]);

    /* effect preview */
    useEffect(() => {
        if (!line || !val.beam || !val.dsn) { setEffect(null); return; }
        const sameIssue = String(val.beam.UId) === String(line.BeamUId) && String(val.dsn.DsnCode) === String(line.DsnCode);
        if (sameIssue && Number(val.rsr) === Number(line.DsnRcpSrNo)) {
            setEffect({ kind: 'info', text: `Update in place. IssNo ${line.IssNo}, SrNo ${line.SrNo}.${line.SubSr} stay the same.` });
            return;
        }
        if (sameIssue) {
            setEffect({ kind: 'info', text: `Moves to recipe SrNo ${val.rsr ?? '?'} group inside IssNo ${line.IssNo}.` });
            return;
        }
        let alive = true;
        findIssue(token, prpcode, String(line.IssDate), val.beam.UId, val.dsn.DsnCode).then(r => {
            if (!alive) return;
            const h = r.payload?.data;
            setEffect(h
                ? { kind: 'ok', text: `Moves to IssNo ${h.IssNo}. Date stays ${ymdShow(line.IssDate)}.` }
                : { kind: 'new', text: `Creates a new issue on ${ymdShow(line.IssDate)}.` });
        });
        return () => { alive = false; };
    }, [val.beam?.UId, val.dsn?.DsnCode, val.rsr, line?.UId]);

    if (!line) return null;

    const expKey = (w: number) => `${val.beam?.UId}|${val.dsn?.DsnCode}|${val.rsr}|${w}`;
    // Which api: design picked in this modify -> its own isnewdesign, otherwise the type already in the browse row
    const currentIsNew = (): boolean => (val.dsn && val.dsn !== initialDsn.current ? flagOf(val.dsn) === '1' : typeOf(line) === '1');

    /** Refresh button: re-read the expected production qty. isnewdesign 0 -> old api, 1 -> new api. */
    const refreshExp = async () => {
        if (expRefreshing) return;
        const w = r3(parseFloat(wt));
        if (!val.beam || !val.dsn || !val.rsr || !(w > 0)) {
            setExpInfo({ ok: false, text: 'Select beam, design, weft position and weight first.' });
            return;
        }
        setExpRefreshing(true);
        try {
            const exp = await fetchExpByFlag(token, currentIsNew(), {
                prpcode, yearno, reqqty: w, itmcode: info?.itm ?? line.ItmCode, shdcode: info?.shd ?? line.ShdCode,
                srno: val.rsr, beamuid: val.beam.UId, dsncode: val.dsn.DsnCode,
                IssUId: line.UId, DsnRcpSrNo: val.rsr,
            });
            if (exp > 0) {
                refreshedExp.current = { key: expKey(w), value: exp };
                setExpInfo({ ok: true, text: `Now ${f2(exp)}. Tap Save changes to save.` });
            } else {
                refreshedExp.current = null;
                setExpInfo({ ok: false, text: 'Check the beam, design, weft position and weight, then refresh again.' });
            }
        } finally {
            setExpRefreshing(false);
        }
    };

    const availChees = (info?.balChees ?? 0) + Number(line.Chees);
    const availWt = r3((info?.balWt ?? 0) + Number(line.Qty));

    const save = async () => {
        const ch = parseInt(chees, 10), w = r3(parseFloat(wt));
        if (!val.beam || !val.dsn) return setErr('Select beam and design.');
        if (!val.rsr) return setErr('Select the weft position (recipe SrNo).');
        if (!(ch > 0)) return setErr('Chees must be a whole number above 0.');
        if (!(w > 0)) return setErr('Weight must be above 0.');
        if (info && ch > availChees) return setErr(`Only ${availChees} chees available for this line.`);
        if (info && w > availWt + 0.0005) return setErr(`Only ${f2(availWt)} kg available for this line.`);

        setSaving(true);

        // 1) Did the user pick a design in this modify? (new object from the design list)
        const designPicked = val.dsn !== initialDsn.current;

        // 2) Which type?
        //    design picked  -> flag of the picked design (isnewdesign) -> 1 / 0
        //    design not picked -> ExpProdQtyType already present in the browse response
        const isNewDesign = designPicked
            ? flagOf(val.dsn) === '1'
            : typeOf(line) === '1';
        const payloadExpType = isNewDesign ? '1' : '0';

        // 3) IssDsnCode / IssDsnName
        //    design picked  -> the picked design's own values (never fall back to the old line)
        //    not picked     -> values from the browse response
        const issDsnCode = designPicked ? (val.dsn.IssDsnCode ?? 0) : (line.IssDsnCode ?? 0);
        const issDsnName = designPicked ? (val.dsn.IssDsnName ?? '') : (line.IssDsnName ?? '');

        // 4) Qty api: only when something that affects ExpProdQty changed.
        //    Which api is decided by the type above (1 -> getExpectedWeftIssue, 0 -> get_expprodqty_from_issueqty)
        const beamChanged = String(val.beam.UId) !== String(line.BeamUId);
        const rsrChanged = Number(val.rsr) !== Number(line.DsnRcpSrNo);
        const qtyChanged = Number(w) !== Number(line.Qty) || Number(ch) !== Number(line.Chees);
        const shouldFetchExpProdQty = designPicked || beamChanged || rsrChanged || qtyChanged;
        const existingExp = Number(line.ExpProdQty ?? line.ExpQty) || 0;

        const expParams = {
            prpcode, yearno, reqqty: w, itmcode: info?.itm ?? line.ItmCode, shdcode: info?.shd ?? line.ShdCode,
            srno: val.rsr, beamuid: val.beam.UId, dsncode: val.dsn.DsnCode,
            IssUId: line.UId, DsnRcpSrNo: val.rsr,
        };
        // value fetched by the Refresh button (same beam / design / recipe / weight) is used as it is
        const pre = refreshedExp.current;
        const exp = pre && pre.key === expKey(w) && pre.value > 0
            ? pre.value
            : shouldFetchExpProdQty
                ? await fetchExpByFlag(token, isNewDesign, expParams)
                : existingExp;

        const r = await modifyLine(token, {
            prpcode, yearno, uid: line.UId, srno: line.SrNo, subsr: line.SubSr,
            OldChees: line.Chees, OldQty: line.Qty,
            BeamUId: val.beam.UId, BeamNo: val.beam.BeamNo || line.BeamNo || '', DsnCode: val.dsn.DsnCode, DsnRcpSrNo: val.rsr, StkType: val.stkType || stkType,
            IssDsnCode: issDsnCode, IssDsnName: issDsnName,
            Chees: ch, Wt: w, ExpProdQty: exp, ExpQty: exp, ExpProdQtyType: payloadExpType, ExpQtyType: payloadExpType,
            // keys that Add sends but Modify did not: values come from the browse response (existing keys above untouched)
            IssDate: line.IssDate != null ? String(line.IssDate) : '',
            Shift: Number(line.Shift) || 1,
            IssTo: line.IssTo ?? '', Remark: line.Remark ?? '',
            ClientRefId: line.ClientRefId ?? '',
            CartNo: line.CartNo,
            TranType: line.TranType != null ? String(line.TranType) : '',
            PUId: line.PUId != null ? String(line.PUId) : '',
            PSrNo: line.PSrNo != null ? String(line.PSrNo) : '',
            PSubSr: line.PSubSr != null ? String(line.PSubSr) : '',
            ItmCode: line.ItmCode ?? '', MerCode: line.MerCode ?? '', GrdCode: line.GrdCode ?? '', ShdCode: line.ShdCode ?? '',
            Denier: Number(line.Denier) || 0,
        });
        setSaving(false);
        if (!r.ok) {
            // server rejected the modify: same error modal as save; OK keeps the user on this form
            setErrorNotice({ title: 'Save Failed', message: r.message || 'Could not save the change.' });
            if (isExpQtyError(r)) { setExpNeedsRefresh(true); setExpInfo(null); }
            return;
        }
        onSaved(r.message || 'Line updated.');
    };

    const t = effect ? tagStyle(effect.kind) : null;

    return (
        <Modal visible={visible} transparent animationType={isMobile ? 'slide' : 'fade'} onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.modalWrap, !isMobile && s.modalWrapWeb]}>
                <View style={[s.sheet, !isMobile && s.sheetWeb]}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                        <View style={[s.headerRow, { marginBottom: 2 }]}>
                            <Text style={s.sheetTitle}>Modify {line.CartNo}</Text>
                            <TouchableOpacity onPress={onClose} accessibilityLabel="Close"><Icon name="close" size={22} color={C.ink2} /></TouchableOpacity>
                        </View>
                        <Text style={[s.hint, { marginTop: 0, marginBottom: 12 }]}>
                            {info ? `Available for this line: ${availChees} chees, ${f2(availWt)} kg (includes what it holds now)` : 'Checking carton balance…'}
                        </Text>

                        <LineFields
                            token={token} prpcode={prpcode} yearno={yearno} stkType={stkType} dmy={dmy}
                            beams={beams} beamsLoading={beamsLoading} mitmcode={info?.mitm ?? ''}
                            value={val} onChange={(v) => { setVal(v); setErr(''); resetExpRefresh(); }}
                        />

                        <View style={s.row2}>
                            <View style={s.col}>
                                <Text style={s.label}>Chees</Text>
                                <TextInput style={s.input} keyboardType="number-pad" value={chees} onChangeText={v => { setChees(v); setErr(''); resetExpRefresh(); }} />
                            </View>
                            <View style={s.col}>
                                <Text style={s.label}>Weight (kg)</Text>
                                <TextInput style={s.input} keyboardType="decimal-pad" value={wt} onChangeText={v => { setWt(v); setErr(''); resetExpRefresh(); }} />
                            </View>
                        </View>

                        {expNeedsRefresh && (
                            <ExpQtyRefresh loading={expRefreshing} info={expInfo} onRefresh={refreshExp} isNewDesign={currentIsNew()} />
                        )}

                        {!!effect && t && (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 10 }}>
                                <View style={[s.tag, t.box]}><Text style={[s.tagText, t.text]}>{effect.kind === 'info' ? 'Same issue' : effect.kind === 'ok' ? 'Existing issue' : 'New issue'}</Text></View>
                                <Text style={[s.hint, { marginTop: 0, flex: 1 }]}>{effect.text}</Text>
                            </View>
                        )}

                        {!!err && (
                            <View style={[s.msg, { backgroundColor: C.bad, flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingLeft: 12, paddingRight: 6 }]}>
                                <Text style={[s.msgText, { color: '#fff', flex: 1, fontWeight: '600' }]}>{err}</Text>
                                <TouchableOpacity
                                    onPress={() => setErr('')}
                                    accessibilityLabel="Close validation"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}
                                >
                                    <Icon name="close" size={17} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                            <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={onClose}><Text style={s.btnText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[s.btn, s.btnPrimary, { flex: 1 }]} onPress={save} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryText}>Save changes</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            <Modal visible={!!errorNotice} transparent animationType="fade" onRequestClose={() => setErrorNotice(null)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.42)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <View style={{ width: Platform.OS === 'web' ? 420 : '92%', maxWidth: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
                        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: C.badSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                            <Icon name="error-outline" size={34} color={C.bad} />
                        </View>
                        <Text style={{ fontSize: 19, fontWeight: '800', color: C.ink, marginBottom: 7, textAlign: 'center' }}>{errorNotice?.title}</Text>
                        <Text style={{ fontSize: 14, lineHeight: 21, color: C.ink2, textAlign: 'center', marginBottom: 20 }}>{errorNotice?.message}</Text>
                        <TouchableOpacity
                            style={[s.btn, { width: '100%', height: 46, marginTop: 0, backgroundColor: C.bad, borderColor: C.bad }]}
                            onPress={() => setErrorNotice(null)}
                            activeOpacity={0.85}
                        >
                            <Text style={s.btnPrimaryText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
};

export default React.memo(EditLineSheet);
