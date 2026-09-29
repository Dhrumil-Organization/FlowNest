import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import LineFields, { Beam, LineValue } from './LineFields';
import { s, C, tagStyle } from '../styles';
import { cartonBalance, fetchExpProdQty, findIssue, modifyLine } from '../api';
import { f2, r3, ymdShow } from '../helpers';

export type EditableLine = {
    UId: number; SrNo: number; SubSr: number; CartNo: string; Chees: number; Qty: number;
    DsnRcpSrNo: number; IssNo: string; IssDate: any; BeamUId: any; BeamNo: string; DsnCode: any; DsnName?: string;
    ItmCode?: string; ShdCode?: any; StkType?: string;
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
    const [val, setVal] = useState<LineValue>({ beam: null, dsn: null, rsr: null });
    const [chees, setChees] = useState('');
    const [wt, setWt] = useState('');
    const [info, setInfo] = useState<{ balChees: number; balWt: number; mitm: string; itm: string; shd: any } | null>(null);
    const [effect, setEffect] = useState<{ kind: 'ok' | 'new' | 'info'; text: string } | null>(null);
    const [err, setErr] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!visible || !line) return;
        setVal({
            beam: { UId: line.BeamUId, BeamNo: line.BeamNo },
            stkType: (line.StkType === 'P' ? 'P' : line.StkType === 'I' ? 'I' : stkType) as 'I' | 'P',
            dsn: { DsnCode: line.DsnCode, DsnName: line.DsnName },
            rsr: Number(line.DsnRcpSrNo),
        });
        setChees(String(line.Chees));
        setWt(f2(line.Qty));
        setErr('');
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

    const availChees = (info?.balChees ?? 0) + Number(line.Chees);
    const availWt = r3((info?.balWt ?? 0) + Number(line.Qty));

    const save = async () => {
        setErr('');
        const ch = parseInt(chees, 10), w = r3(parseFloat(wt));
        if (!val.beam || !val.dsn) return setErr('Select beam and design.');
        if (!val.rsr) return setErr('Select the weft position (recipe SrNo).');
        if (!(ch > 0)) return setErr('Chees must be a whole number above 0.');
        if (!(w > 0)) return setErr('Weight must be above 0.');
        if (info && ch > availChees) return setErr(`Only ${availChees} chees available for this line.`);
        if (info && w > availWt + 0.0005) return setErr(`Only ${f2(availWt)} kg available for this line.`);

        setSaving(true);
        const exp = await fetchExpProdQty(token, {
            prpcode, yearno, reqqty: w, itmcode: info?.itm ?? line.ItmCode, shdcode: info?.shd ?? line.ShdCode,
            srno: val.rsr, beamuid: val.beam.UId, dsncode: val.dsn.DsnCode,
            IssUId: line.UId,
        });
        const r = await modifyLine(token, {
            prpcode, yearno, uid: line.UId, srno: line.SrNo, subsr: line.SubSr,
            OldChees: line.Chees, OldQty: line.Qty,
            BeamUId: val.beam.UId, DsnCode: val.dsn.DsnCode, DsnRcpSrNo: val.rsr, StkType: val.stkType || stkType,
            Chees: ch, Wt: w, ExpProdQty: exp, ExpProdQtyType: expProdQtyType,
        });
        setSaving(false);
        if (!r.ok) return setErr(r.message || 'Could not save the change.');
        onSaved(r.message || 'Line updated.');
    };

    const t = effect ? tagStyle(effect.kind) : null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalWrap}>
                <View style={s.sheet}>
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
                            value={val} onChange={setVal}
                        />

                        <View style={s.row2}>
                            <View style={s.col}>
                                <Text style={s.label}>Chees</Text>
                                <TextInput style={s.input} keyboardType="number-pad" value={chees} onChangeText={v => { setChees(v); setErr(''); }} />
                            </View>
                            <View style={s.col}>
                                <Text style={s.label}>Weight (kg)</Text>
                                <TextInput style={s.input} keyboardType="decimal-pad" value={wt} onChangeText={v => { setWt(v); setErr(''); }} />
                            </View>
                        </View>

                        {!!effect && t && (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 10 }}>
                                <View style={[s.tag, t.box]}><Text style={[s.tagText, t.text]}>{effect.kind === 'info' ? 'Same issue' : effect.kind === 'ok' ? 'Existing issue' : 'New issue'}</Text></View>
                                <Text style={[s.hint, { marginTop: 0, flex: 1 }]}>{effect.text}</Text>
                            </View>
                        )}

                        {!!err && <View style={[s.msg, { backgroundColor: C.badSoft }]}><Text style={[s.msgText, { color: C.bad }]}>{err}</Text></View>}

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                            <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={onClose}><Text style={s.btnText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[s.btn, s.btnPrimary, { flex: 1 }]} onPress={save} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryText}>Save changes</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default React.memo(EditLineSheet);
