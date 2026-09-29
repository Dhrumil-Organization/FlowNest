import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import LineRow from './LineRow';
import { s } from '../styles';
import { f2, ymdShow } from '../helpers';

type Props = {
    iss: any; // already flattened by the screen (each line carries IssNo, BeamNo, Locked ...)
    onEditLine: (l: any) => void;
    onDeleteLine: (l: any) => void;
    onDeleteIssue: (iss: any) => void;
};

const IssueCard = ({ iss, onEditLine, onDeleteLine, onDeleteIssue }: Props) => (
    <View style={s.issCard}>
        <View style={s.issHead}>
            <View style={{ flex: 1 }}>
                <Text style={s.issTitle}>{iss.BeamNo || `Beam ${iss.BeamUId}`} / {iss.DsnCode}</Text>
                <Text style={s.lineSub}>{iss.DsnName}{iss.DsnName ? ', ' : ''}IssNo {iss.IssNo}, {ymdShow(iss.IssDate)}, shift {iss.Shift}</Text>
                <Text style={s.lineSub}>{iss.TotChees} chees, {f2(iss.TotQty)} kg</Text>
                {iss.Locked && <Text style={s.lockText}>Return or production entry exists. Locked.</Text>}
            </View>
            <TouchableOpacity style={[s.btn, s.btnSm, s.btnDanger, iss.Locked && { opacity: 0.4 }]} disabled={iss.Locked} onPress={() => onDeleteIssue(iss)}>
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
                        <LineRow key={`${l.UId}-${l.SrNo}-${l.SubSr}`} l={l} onEdit={onEditLine} onDelete={onDeleteLine} />
                    ))}
                </View>
            ))}
        </View>
    </View>
);

export default memo(IssueCard);
