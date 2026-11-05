import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import LineRow from './LineRow';
import { s } from '../styles';
import { f2, ymdShow } from '../helpers';

type Props = {
    iss: any; // already flattened by the screen (each line carries IssNo, BeamNo ...)
    onEditLine: (l: any) => void;
    onDeleteLine: (l: any) => void;
    onDeleteIssue: (iss: any) => void;
};

/**
 * Header (main): beam + design + issue info, shown ONCE.
 * Groups (d1): one row per recipe position. Lines below only show what is specific to the line
 * (SrNo, chees, kg, carton) so beam / design / IssNo are no longer repeated in every row.
 */
const IssueCard = ({ iss, onEditLine, onDeleteLine, onDeleteIssue }: Props) => (
    <View style={s.issCard}>
        <View style={s.issHead}>
            <View style={s.issTopRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.issBeam} numberOfLines={1}>{iss.BeamNo || `Beam ${iss.BeamUId}`}</Text>
                    <View style={s.issDsnPill}><Text style={s.issDsnPillText} numberOfLines={1}>{iss.DsnName || iss.DsnCode}</Text></View>
                </View>
                <TouchableOpacity style={[s.btn, s.btnSm, s.btnDanger]} onPress={() => onDeleteIssue(iss)}>
                    <Text style={[s.btnDangerText, s.btnSmText]} numberOfLines={1}>Delete</Text>
                </TouchableOpacity>
            </View>
            <View>
                <Text style={s.lineSub} numberOfLines={1}>IssNo {iss.IssNo}</Text>
                <Text style={s.lineSub} numberOfLines={1}>{ymdShow(iss.IssDate)} · Shift {iss.Shift}</Text>
            </View>
            <View style={s.issMetaRow}>
                <View style={s.issChip}><Text style={s.issChipText}>{iss.TotChees} chees</Text></View>
                <View style={s.issChip}><Text style={s.issChipText}>{f2(iss.TotQty)} kg</Text></View>
            </View>
        </View>
        <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
            {(iss.groups || []).map((g: any) => (
                <View key={g.SrNo}>
                    <View style={s.grpRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                            <View style={s.grpBadge}><Text style={s.grpBadgeText}>{g.SrNo}</Text></View>
                            <Text style={s.grpText} numberOfLines={2}>{g.ItmName || g.ItmCode}, recipe {g.DsnRcpSrNo}</Text>
                        </View>
                        <Text style={[s.grpText, { marginLeft: 8 }]}>{g.TotPcs} ctn · {f2(g.TotQty)} kg</Text>
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
