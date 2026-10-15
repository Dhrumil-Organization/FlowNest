import React, { memo, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import PickerModal from './PickerModal';
import { s, C } from '../styles';
import { fetchDesigns, fetchRecipe } from '../api';

export type Beam = { UId: any; BeamNo: string; [k: string]: any };
export type Design = { DsnCode: any; DsnName?: string; IssDsnCode?: any; IssDsnName?: string; isnewdesign?: any; [k: string]: any };
export type LineValue = { beam: Beam | null; stkType?: 'I' | 'P'; dsn: Design | null; rsr: number | null; rsrRow?: any };

type Props = {
    token: string;
    prpcode: string;
    yearno: any;
    stkType: string;
    dmy: string;            // dd-mm-yyyy for the help APIs
    beams: Beam[];
    beamsLoading?: boolean;
    mitmcode: string;       // kept for compatibility with existing callers
    value: LineValue;
    onChange: (v: LineValue) => void;
    isMobile?: boolean;
};

/** Module level on purpose: declared inside LineFields it was re-created (unmount + mount) on every render. */
const Select = ({ text, placeholder, onPress, disabled, loading }: any) => (
    <TouchableOpacity style={[s.select, disabled && s.disabled]} onPress={onPress} disabled={disabled}>
        <Text style={text ? s.selectText : s.selectPlaceholder} numberOfLines={1}>{text || placeholder}</Text>
        {loading ? <ActivityIndicator size="small" color={C.indigo} /> : <Icon name="expand-more" size={20} color={C.ink2} />}
    </TouchableOpacity>
);

/**
 * Beam -> Design -> Recipe SrNo (DsnRcpSrNo).
 * Stock type is selected with the beam: In House = I, Process House = P.
 * The selected stock type is sent to the design help API.
 */
const LineFields = ({ token, prpcode, yearno, stkType, dmy, beams, beamsLoading, mitmcode, value, onChange, isMobile = false }: Props) => {
    const [designs, setDesigns] = useState<Design[]>([]);
    const [dLoading, setDLoading] = useState(false);
    const [rows, setRows] = useState<any[] | null>(null); // filtered recipe rows; null = not loaded
    const [rLoading, setRLoading] = useState(false);
    const [pick, setPick] = useState<'beam' | 'stkType' | 'dsn' | null>(null);
    const reqId = useRef(0);
    const valueRef = useRef(value); // always the latest value (avoids stale closure in the async recipe callback)
    valueRef.current = value;

    /* designs of the selected beam */
    useEffect(() => {
        setDesigns([]);
        if (!value.beam) return;
        let alive = true;
        setDLoading(true);
        fetchDesigns(token, prpcode, yearno, dmy, value.stkType || stkType, value.beam.UId)
            .then(list => { if (alive) setDesigns(list); })
            .finally(() => alive && setDLoading(false));
        return () => { alive = false; };
    }, [value.beam?.UId, value.stkType, dmy, token, prpcode, yearno, stkType]);

    /* recipe of the selected design */
    useEffect(() => {
        setRows(null);
        const my = ++reqId.current;
        if (!value.dsn) { setRLoading(false); return; }
        setRLoading(true);
        fetchRecipe(token, prpcode, yearno, value.dsn.DsnCode, value.stkType || stkType)
            .then(list => {
                if (my !== reqId.current) return;
                const cur = valueRef.current;

                // The recipe API response is the source of truth.
                // Do NOT filter the response again by the carton's MItmCode.
                // If the selected design returns recipe rows, the design has a
                // valid recipe for this flow.
                const f = Array.isArray(list) ? list : [];
                setRows(f);

                const stillValid = f.find(r => Number(r.srno) === Number(cur.rsr));

                // One recipe position -> select it automatically.
                if (f.length === 1 && !stillValid) {
                    onChange({
                        ...cur,
                        rsr: Number(f[0].srno),
                        rsrRow: f[0]
                    });
                }
                // If the previously selected SrNo is not present in the
                // newly selected design recipe, clear it.
                else if (!stillValid && cur.rsr) {
                    onChange({ ...cur, rsr: null, rsrRow: undefined });
                }
            })
            .finally(() => my === reqId.current && setRLoading(false));
    }, [value.dsn?.DsnCode, value.stkType, stkType]);

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
                    <Text style={s.label}>Stock Type</Text>
                    <Select
                        text={(value.stkType || stkType) === 'P' ? 'Process House' : 'In House'}
                        placeholder="Select stock type"
                        disabled={!value.beam}
                        onPress={() => setPick('stkType' as any)}
                    />
                </View>
            </View>
            <View style={[s.row2, isMobile && s.row2Mobile]}>
                <View style={s.col}>
                    <Text style={s.label}>Design</Text>
                    <Select
                        text={value.dsn ? (value.dsn.DsnName || String(value.dsn.DsnCode)) : ''}
                        placeholder={value.beam ? 'Select design' : 'Beam first'}
                        disabled={!value.beam}
                        loading={dLoading}
                        onPress={() => setPick('dsn')}
                    />
                    {!!value.dsn?.IssDsnName && (
                        <View style={{
                            marginTop: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8,
                            backgroundColor: C.indigoSoft, borderLeftWidth: 4, borderLeftColor: C.indigo,
                        }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: C.indigo }}>ISSUE DESIGN</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink, marginTop: 1 }}>
                                {Number(value.dsn.IssDsnCode) > 0 ? `${value.dsn.IssDsnCode}  ` : ''}{value.dsn.IssDsnName}
                            </Text>
                        </View>
                    )}
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
                        {`Design ${value.dsn.DsnCode} has ${rows.length} recipe positions. Pick one.`}
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
                onSelect={b => { setPick(null); onChange({ beam: b, stkType: value.stkType || stkType as 'I' | 'P', dsn: null, rsr: null, rsrRow: undefined }); }}
            />
            <PickerModal
                visible={pick === 'stkType'}
                title="Select stock type"
                items={[
                    { code: 'I', name: 'In House' },
                    { code: 'P', name: 'Process House' },
                ]}
                labelOf={(x: any) => x.name}
                emptyText="No stock type available."
                onClose={() => setPick(null)}
                onSelect={(x: any) => {
                    setPick(null);
                    onChange({ ...value, stkType: x.code as 'I' | 'P', dsn: null, rsr: null, rsrRow: undefined });
                }}
            />
            <PickerModal
                visible={pick === 'dsn'}
                title={`Designs on ${value.beam?.BeamNo || ''}`}
                items={designs}
                loading={dLoading}
                // first line: the design (DsnCode + DsnName), clearly labelled
                labelOf={d => `Design: ${d.DsnCode}  ${d.DsnName || ''}`}
                // second line in the list (also searchable): the issue design, key IssDsnName
                subOf={d => d.IssDsnName ? `Issue design: ${Number(d.IssDsnCode) > 0 ? `${d.IssDsnCode}  ` : ''}${d.IssDsnName}` : ''}
                emptyText="No order design linked to this beam."
                onClose={() => setPick(null)}
                onSelect={d => { setPick(null); onChange({ ...value, dsn: d, rsr: null, rsrRow: undefined }); }}
            />
        </View>
    );
};

export default memo(LineFields);
