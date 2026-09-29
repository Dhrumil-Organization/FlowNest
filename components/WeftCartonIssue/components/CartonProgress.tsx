import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { s, C } from '../styles';
import { EntryBus, useEntryBus } from './entryBus';
import type { Carton } from '../types';

type Props = { carton: Carton; startBal: { chees: number; wt: number } | null; bus: EntryBus };

/** Progress bar: issued (before) | this entry | still available. */
const CartonProgress = ({ carton, startBal, bus }: Props) => {
    const entryChees = useEntryBus(bus);
    if (carton.BalUnknown || !startBal || startBal.chees <= 0) return null;

    const issued = Math.max(0, startBal.chees - carton.Chees);
    const entry = Math.min(entryChees, carton.Chees);
    const avail = Math.max(0, carton.Chees - entry);

    return (
        <>
            <View style={s.progressTrack}>
                {issued > 0 && <View style={{ flex: issued, backgroundColor: C.dotUsed }} />}
                {entry > 0 && <View style={{ flex: entry, backgroundColor: C.primary }} />}
                {avail > 0 && <View style={{ flex: avail, backgroundColor: '#5FC3B5' }} />}
            </View>
            <View style={s.legend}>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.dotUsed }]} /><Text style={s.legendText}>Issued</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.primary }]} /><Text style={s.legendText}>This entry</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#5FC3B5' }]} /><Text style={s.legendText}>Available</Text></View>
            </View>
        </>
    );
};

export default memo(CartonProgress);
