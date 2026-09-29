import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import PickerModal from './PickerModal';
import { s, C } from '../styles';
import { fetchDesigns, fetchRecipe } from '../api';
import { recipeRowsForCarton } from '../helpers';

export type Beam = { UId: any; BeamNo: string; [k: string]: any };
export type Design = { DsnCode: any; DsnName?: string; [k: string]: any };
export type LineValue = { beam: Beam | null; dsn: Design | null; rsr: number | null; rsrRow?: any };

type Props = {
    token: string;
    prpcode: string;
    yearno: any;
    stkType: string;
    dmy: string;            // dd-mm-yyyy for the help APIs
    beams: Beam[];
    beamsLoading?: boolean;
    mitmcode: string;       // carton main item code (recipe filter)
    value: LineValue;
    onChange: (v: LineValue) => void;
    isMobile?: boolean;
};

/**
 * Beam -> Design -> Recipe SrNo (DsnRcpSrNo).
 * Recipe rows come from designwise_mainitem_for_weftissue_help and are filtered to the
 * carton's main item: 1 match = auto, 2+ = pick, 0 = blocked.
 */
const LineFields = ({ token, prpcode, yearno, stkType, dmy, beams, beamsLoading, mitmcode, value, onChange, isMobile = false }: Props) => {
    const [designs, setDesigns] = useState<Design[]>([]);
    const [dLoading, setDLoading] = useState(false);
    const [rows, setRows] = useState<any[] | null>(null); // filtered recipe rows; null = not loaded
    const [rLoading, setRLoading] = useState(false);
    const [pick, setPick] = useState<'beam' | 'dsn' | null>(null);
    const reqId = useRef(0);

    /* designs of the selected beam */
    useEffect(() => {
        setDesigns([]);
        if (!value.beam) return;
        let alive = true;
        setDLoading(true);
        fetchDesigns(token, prpcode, yearno, dmy, stkType, value.beam.UId)
            .then(list => { if (alive) setDesigns(list); })
            .finally(() => alive && setDLoading(false));
        return () => { alive = false; };
    }, [value.beam?.UId, dmy]);

    /* recipe of the selected design */
    useEffect(() => {
        setRows(null);
        if (!value.dsn) return;
        const my = ++reqId.current;
        setRLoading(true);
        fetchRecipe(token, prpcode, yearno, value.dsn.DsnCode)
            .then(list => {
                if (my !== reqId.current) return;
                const f = recipeRowsForCarton(list, mitmcode);
                setRows(f);
                const stillValid = f.find(r => Number(r.srno) === Number(value.rsr));
                if (f.length === 1 && !stillValid) onChange({ ...value, rsr: Number(f[0].srno), rsrRow: f[0] });
                else if (!stillValid && value.rsr) onChange({ ...value, rsr: null, rsrRow: undefined });
            })
            .finally(() => my === reqId.current && setRLoading(false));
    }, [value.dsn?.DsnCode, mitmcode]);

    const Select = ({ text, placeholder, onPress, disabled, loading }: any) => (
        <TouchableOpacity style={[s.select, disabled && s.disabled]} onPress={onPress} disabled={disabled}>
            <Text style={text ? s.selectText : s.selectPlaceholder} numberOfLines={1}>{text || placeholder}</Text>
            {loading ? <ActivityIndicator size="small" color={C.indigo} /> : <Icon name="expand-more" size={20} color={C.ink2} />}
        </TouchableOpacity>
    );

    return (
        <View>
            <View style={[s.row2, isMobile && s.row2Mobile]}>
                <View style={s.col}>
                    <Text style={s.label}>Beam</Text>
                    <Select
                        text={value.beam ? value.beam.BeamNo : ''}
                        placeholder="Select beam"
                        loading={beamsLoading}
                        onPress={() => setPick('beam')}
                    />
                </View>
                <View style={s.col}>
                    <Text style={s.label}>Design</Text>
                    <Select
                        text={value.dsn ? `${value.dsn.DsnCode} ${value.dsn.DsnName || ''}` : ''}
                        placeholder={value.beam ? 'Select design' : 'Beam first'}
                        disabled={!value.beam}
                        loading={dLoading}
                        onPress={() => setPick('dsn')}
                    />
                </View>
            </View>

            {!!value.dsn && rLoading && <Text style={[s.hint, { marginTop: 0, marginBottom: 10 }]}>Loading design recipe…</Text>}

            {!!value.dsn && !rLoading && rows !== null && rows.length === 0 && (
                <View style={[s.msg, { backgroundColor: C.badSoft }]}>
                    <Text style={[s.msgText, { color: C.bad }]}>This carton's yarn is not in the recipe of design {value.dsn.DsnCode}. Choose another design.</Text>
                </View>
            )}

            {!!value.dsn && !rLoading && rows !== null && rows.length === 1 && (
                <View style={[s.msg, { backgroundColor: C.indigoSoft }]}>
                    <Text style={[s.msgText, { color: C.indigo }]}>
                        Weft position set: recipe SrNo {rows[0].srno}{rows[0].mitmname ? `, ${rows[0].mitmname}` : ''}
                    </Text>
                </View>
            )}

            {!!value.dsn && !rLoading && rows !== null && rows.length > 1 && (
                <View style={{ marginBottom: 6 }}>
                    <Text style={s.label}>
                        {mitmcode ? `This yarn is used at ${rows.length} positions in design ${value.dsn.DsnCode}. Pick one.` : 'Pick the weft position for this carton.'}
                    </Text>
                    {rows.map(r => {
                        const on = Number(r.srno) === Number(value.rsr);
                        return (
                            <TouchableOpacity key={String(r.srno)} style={[s.radio, on && s.radioOn]} onPress={() => onChange({ ...value, rsr: Number(r.srno), rsrRow: r })}>
                                <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} size={18} color={on ? C.indigo : C.ink2} />
                                <Text style={{ color: C.ink, flex: 1 }}>SrNo {r.srno}{r.mitmname ? `, ${r.mitmname}` : ''}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            <PickerModal
                visible={pick === 'beam'}
                title="Select beam"
                items={beams}
                loading={beamsLoading}
                labelOf={b => b.BeamNo}
                subOf={b => [b.WarpLen ? `Warp ${b.WarpLen}` : '', b.TranDate || ''].filter(Boolean).join(', ')}
                emptyText="No beam available for weft issue on this date."
                onClose={() => setPick(null)}
                onSelect={b => { setPick(null); onChange({ beam: b, dsn: null, rsr: null, rsrRow: undefined }); }}
            />
            <PickerModal
                visible={pick === 'dsn'}
                title={`Designs on ${value.beam?.BeamNo || ''}`}
                items={designs}
                loading={dLoading}
                labelOf={d => `${d.DsnCode}  ${d.DsnName || ''}`}
                emptyText="No order design linked to this beam."
                onClose={() => setPick(null)}
                onSelect={d => { setPick(null); onChange({ ...value, dsn: d, rsr: null, rsrRow: undefined }); }}
            />
        </View>
    );
};

export default LineFields;
