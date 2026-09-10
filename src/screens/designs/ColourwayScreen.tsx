import AppAlert from '@/common/utils/appAlert';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { T } from '../../theme';
import { useAppStore, autoSave } from '../../stores/AppStore';
import { Button } from '../../components/ui/Button';
import type { SubDesign } from '../../types';

function genId() { return 'SD' + Date.now().toString(36).slice(-5).toUpperCase(); }

export function ColourwayScreen() {
    const router = useRouter();
    const { mdId } = useLocalSearchParams<{ mdId: string }>();
    const mains = useAppStore(s => s.mains);
    const subs = useAppStore(s => s.subs);
    const addSub = useAppStore(s => s.addSub);

    const design = mains.find(m => m.id === mdId);
    const existing = subs.filter(s => s.mdId === mdId);

    const nextCode = (() => {
        const used = new Set(existing.map(s => s.code));
        let n = 1;
        while (used.has(`${design?.code}-${String(n).padStart(2, '0')}`)) n++;
        return `${design?.code}-${String(n).padStart(2, '0')}`;
    })();

    const [shade, setShade] = useState('');

    const save = () => {
        if (!shade.trim()) return;
        const sub: SubDesign = {
            id: genId(),
            mdId,
            code: nextCode,
            commercialName: shade.trim(),
        };
        addSub(sub);
        autoSave();
        AppAlert.alert('Saved', `${nextCode} added.`, [
            { text: 'OK', onPress: () => router.back() },
        ]);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                <View style={styles.baseBox}>
                    <Text style={styles.baseLabel}>BASE DESIGN</Text>
                    <Text style={styles.baseCode}>{design?.code}</Text>
                    <Text style={styles.baseType}>{design?.type === 'YD' ? 'Yarn-dyed' : 'Piece-dyed'}</Text>
                </View>

                <View style={styles.autoCode}>
                    <Text style={styles.autoLabel}>CODE (AUTO)</Text>
                    <Text style={styles.autoValue}>{nextCode}</Text>
                </View>

                {design?.type === 'PD' ? (
                    <>
                        <Text style={styles.label}>Commercial Shade</Text>
                        <TextInput
                            value={shade} onChangeText={setShade}
                            placeholder="e.g. Natural, Sage…" placeholderTextColor={T.muted}
                            style={styles.inp}
                        />
                    </>
                ) : (
                    <View style={styles.ydNote}>
                        <Text style={styles.ydNoteText}>
                            Yarn-dyed colourways require shade codes from the Dyeing master.
                            This can be set up from the web app — shade assignment is coming to mobile soon.
                        </Text>
                    </View>
                )}

                <View style={{ height: 24 }} />
                <Button
                    label="Save Colourway"
                    onPress={save}
                    disabled={design?.type === 'YD' || !shade.trim()}
                    fullWidth
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 10, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 14 },
    baseBox: { backgroundColor: T.nav, borderRadius: 10, padding: 14 },
    baseLabel: { fontSize: 8.5, color: '#5A7A94', fontWeight: '700', letterSpacing: 0.6 },
    baseCode: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 },
    baseType: { fontSize: 11, color: '#A9C0D4', marginTop: 2 },
    autoCode: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderRadius: 9, borderWidth: 1, borderColor: T.border, padding: 12 },
    autoLabel: { fontSize: 9, color: T.muted, fontWeight: '800', letterSpacing: 0.5 },
    autoValue: { fontSize: 16, fontWeight: '800', color: T.copper },
    inp: { backgroundColor: T.surface, borderRadius: 9, borderWidth: 1.5, borderColor: T.border, padding: 12, fontSize: 14, color: T.ink },
    ydNote: { marginTop: 16, backgroundColor: '#FBF1DC', borderRadius: 9, borderWidth: 1, borderColor: '#EAD9A8', padding: 12 },
    ydNoteText: { fontSize: 12, color: '#9A6B12', lineHeight: 18 },
});
