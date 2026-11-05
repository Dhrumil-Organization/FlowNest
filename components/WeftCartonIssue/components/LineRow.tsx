import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { s, C } from '../styles';
import { f2, ymdShow } from '../helpers';

type Props = { l: any; onEdit: (l: any) => void; onDelete: (l: any) => void };

/**
 * IMPORTANT: this lives at module level (not inside the screen component) and is memoised.
 * When it was declared inside the screen, React saw a brand-new component type on every
 * keystroke, unmounted + remounted every row, and dropped taps that were in progress.
 */
const LineRow = ({ l, onEdit, onDelete }: Props) => (
    <View style={s.line}>
        <View style={{ flex: 1 }}>
            <Text style={s.lineTitle}>{l.BeamNo || `Beam ${l.BeamUId}`} / {l.DsnCode}</Text>
            <Text style={s.lineSub}>{l.Chees} chees, {f2(l.Qty)} kg, IssNo {l.IssNo} ({ymdShow(l.IssDate)}), SrNo {l.SrNo}.{l.SubSr}</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={() => onEdit(l)} accessibilityLabel="Modify line">
            <Icon name="edit" size={18} color={C.ink2} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={() => onDelete(l)} accessibilityLabel="Delete line">
            <Icon name="delete-outline" size={18} color={C.ink2} />
        </TouchableOpacity>
    </View>
);

export default memo(LineRow);
