import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { showSuccess } from '@/common/utils/snackbar';
import LineFields, { Beam, LineValue } from './LineFields';
import { EntryBus } from './entryBus';
import { s, C } from '../styles';
import * as api from '../api';
import { f2, r3, makeClientRef } from '../helpers';
import type { Carton } from '../types';

export type SavedEntry = { chees: number; wt: number; beam: string; dsn: string };

type Props = {
    token: string; prpcode: string; yearno: any; stkType: string;
    dmy: string; ymd: string; shift: number; expProdQtyType: string;
    carton: Carton;
    beams: Beam[]; beamsLoading?: boolean; isMobile?: boolean;
    bus: EntryBus;                                // carries typed chees to the progress bar
    onSaved: (e: SavedEntry) => void;             // screen updates balance + "issued now" list locally
    onStale: () => void;                          // server says balance changed: reload it
};

const emptyLine: LineValue = { beam: null, stkType: undefined, dsn: null, rsr: null };

/**
 * The "Issue to a beam" form. line / chees / wt / error state live HERE, so a keystroke
 * re-renders only this form, not the whole screen (filter, carton card, lists, modals ...).
 * The screen mounts it with key=carton, so it resets by itself when the carton changes.
 */
const IssueEntry = ({
    token, prpcode, yearno, stkType, dmy, ymd, shift, expProdQtyType,
    carton, beams, beamsLoading, isMobile = false, bus, onSaved, onStale,
}: Props) => {
    const [line, setLine] = useState<LineValue>(emptyLine);
    const [chees, setChees] = useState('');
    const [wt, setWt] = useState('');
    const [wtTouched, setWtTouched] = useState(false);
    const [formErr, setFormErr] = useState('');
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);               // blocks double-tap before state has updated
    const clientRef = useRef<string | null>(null); // kept across retries of the same entry

    useEffect(() => () => bus.set(0), [bus]);      // leaving / changing carton clears the bar's "this entry"

    // any change to the entry means a new request id
    const touchEntry = useCallback(() => { clientRef.current = null; setFormErr(''); }, []);
    const handleLine = useCallback((v: LineValue) => { touchEntry(); setLine(v); }, [touchEntry]);

    const onChees = (v: string) => {
        touchEntry();
        setChees(v);
        bus.set(Math.max(0, parseInt(v, 10) || 0));
        if (wtTouched) return;
        const n = parseInt(v, 10);
        if (!(n > 0) || carton.Chees <= 0) { setWt(''); return; }
        setWt(n >= carton.Chees ? f2(carton.Wt) : f2((carton.Wt / carton.Chees) * n)); // last chees takes exact balance
    };

    const onWt = (v: string) => { touchEntry(); setWt(v); setWtTouched(v !== ''); };

    const addBeam = async () => {
        if (savingRef.current) return;
        const ch = parseInt(chees, 10);
        const w = r3(parseFloat(wt));

        if (!line.beam) return setFormErr('Select a beam.');
        if (!line.dsn) return setFormErr('Select a design.');
        if (!line.rsr) return setFormErr('Select the weft position (recipe SrNo).');
        if (!(ch > 0)) return setFormErr('Chees must be a whole number above 0.');
        if (!(w > 0)) return setFormErr('Weight must be above 0.');
        if (!carton.BalUnknown && ch > carton.Chees) return setFormErr(`Only ${carton.Chees} chees left in ${carton.CartNo}.`);
        if (!carton.BalUnknown && w > carton.Wt + 0.0005) return setFormErr(`Only ${f2(carton.Wt)} kg left in ${carton.CartNo}.`);

        if (!clientRef.current) clientRef.current = makeClientRef();
        savingRef.current = true;
        setSaving(true);

        try {
            const exp = await api.fetchExpProdQty(token, {
                prpcode, yearno, reqqty: w, itmcode: carton.ItmCode, shdcode: carton.ShdCode,
                srno: line.rsr, beamuid: line.beam.UId, dsncode: line.dsn.DsnCode,
                IssUId: undefined,
            });

            const r = await api.saveLine(token, {
                prpcode, yearno, IssDate: ymd, Shift: shift, StkType: line.stkType || stkType,
                BeamUId: line.beam.UId, DsnCode: line.dsn.DsnCode, DsnRcpSrNo: line.rsr,
                ExpProdQty: exp, ExpProdQtyType: expProdQtyType,
                Chees: ch, Wt: w, ClientRefId: clientRef.current,
                CartNo: carton.CartNo, TranType: carton.TranType, PUId: carton.PUId, PSrNo: carton.PSrNo, PSubSr: carton.PSubSr,
                ItmCode: carton.ItmCode, MerCode: carton.MerCode, GrdCode: carton.GrdCode, ShdCode: carton.ShdCode, Denier: carton.Denier,
            });

            if (!r.ok) {
                // NETWORK: keep clientRef so the retry cannot create a second line
                setFormErr(r.message || 'Could not save. Try again.');
                if (r.errorCode === 'BALANCE_EXCEEDED' || r.errorCode === 'CARTON_EMPTY') onStale();
                return;
            }

            showSuccess?.(`${line.beam.BeamNo}: ${r.message}`);
            const saved: SavedEntry = { chees: ch, wt: w, beam: line.beam.BeamNo || '', dsn: `${line.dsn.DsnCode ?? ''}` };
            // reset the form, then let the screen update balance + list locally (no extra API call)
            setLine(emptyLine); setChees(''); setWt(''); setWtTouched(false); setFormErr('');
            clientRef.current = null;
            bus.set(0);
            onSaved(saved);
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    return (
        <View style={s.entry}>
            <View style={[s.secRow, { marginTop: 0, alignItems: 'center' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={s.stepBadge}><Text style={s.stepBadgeText}>1</Text></View>
                    <Text style={s.secTitle}>Issue to a beam</Text>
                </View>
                <Text style={s.secSub}>Saves on add</Text>
            </View>

            <LineFields
                token={token} prpcode={prpcode} yearno={yearno} stkType={stkType} dmy={dmy}
                beams={beams} beamsLoading={beamsLoading} mitmcode={carton.MItmCode}
                value={line} onChange={handleLine} isMobile={isMobile}
            />

            <View style={[s.row2, isMobile && s.row2Mobile]}>
                <View style={s.col}>
                    <Text style={s.label}>CHEES</Text>
                    <TextInput style={s.input} keyboardType="number-pad" value={chees} onChangeText={onChees} placeholder={carton.BalUnknown ? 'Chees' : `max ${carton.Chees}`} placeholderTextColor={C.ink2} />
                </View>
                <View style={s.col}>
                    <Text style={s.label}>WEIGHT (KG)</Text>
                    <TextInput style={s.input} keyboardType="decimal-pad" value={wt} onChangeText={onWt} />
                </View>
            </View>

            {!!chees && !wtTouched && <Text style={[s.hint, { marginTop: 0, marginBottom: 8 }]}>Weight filled from average chees weight. Edit it if the scale says otherwise.</Text>}
            {!!formErr && <View style={[s.msg, { backgroundColor: C.badSoft }]}><Text style={[s.msgText, { color: C.bad }]}>{formErr}</Text></View>}

            <TouchableOpacity style={[s.btn, s.btnPrimary, { height: 48 }]} onPress={addBeam} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : (<><Icon name="add-circle-outline" size={20} color="#fff" /><Text style={s.btnPrimaryText}>Add beam</Text></>)}
            </TouchableOpacity>
        </View>
    );
};

export default memo(IssueEntry);
