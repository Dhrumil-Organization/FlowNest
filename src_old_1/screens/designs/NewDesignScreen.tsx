import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { T } from '../../theme';
import { useAppStore, autoSave } from '../../stores/AppStore';
import { Button } from '../../components/ui/Button';
import type { MainDesign, Category, DyeType } from '../../types';

const CATS: Category[] = ['Linen Shirting', 'Sportswear', 'Linen Suiting'];

function genId() { return 'MD' + Date.now().toString(36).slice(-5).toUpperCase(); }

export function NewDesignScreen() {
    const router = useRouter();
    const addMain = useAppStore(s => s.addMain);

    const [code, setCode] = useState('');
    const [cat, setCat] = useState<Category>('Linen Shirting');
    const [type, setType] = useState<DyeType>('YD');
    const [weave, setWeave] = useState('');
    const [reed, setReed] = useState('');
    const [wsh, setWsh] = useState('6');
    const [finW, setFinW] = useState('');
    const [gfSh, setGfSh] = useState('5');

    const isValid = code.trim().length > 0 && parseFloat(reed) > 0;

    const save = () => {
        const design: MainDesign = {
            id: genId(),
            code: code.trim(),
            category: cat,
            type,
            weave: weave.trim() || 'Plain',
            warpYarns: [{ miId: 'Y03', br: null, epi: 56 }],
            weftYarns: [{ miId: 'Y07', br: '70/30', ppi: 52 }],
            reedSpace: parseFloat(reed),
            warpShrink: parseFloat(wsh) || 0,
            finWidth: parseFloat(finW) || 0,
            gfShrink: parseFloat(gfSh) || 0,
            finishLocked: parseFloat(finW) > 0,
        };
        addMain(design);
        autoSave();
        Alert.alert('Saved', `${code.trim()} added to the catalog.`, [
            { text: 'OK', onPress: () => router.back() },
        ]);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                <Text style={styles.label}>Design Code</Text>
                <TextInput
                    value={code} onChangeText={setCode}
                    placeholder="e.g. Vienna" placeholderTextColor={T.muted}
                    style={styles.inp}
                />

                <Text style={styles.label}>Category</Text>
                <View style={styles.pillRow}>
                    {CATS.map(c => (
                        <TouchableOpacity
                            key={c}
                            onPress={() => setCat(c)}
                            style={[styles.pill, cat === c && styles.pillActive]}
                        >
                            <Text style={[styles.pillText, cat === c && styles.pillTextActive]}>
                                {c === 'Linen Shirting' ? 'Shirting' : c === 'Linen Suiting' ? 'Suiting' : c}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Dye Type</Text>
                <View style={styles.pillRow}>
                    {(['YD', 'PD'] as const).map(t => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => setType(t)}
                            style={[styles.pill, type === t && styles.pillActive, { flex: 1, alignItems: 'center' }]}
                        >
                            <Text style={[styles.pillText, type === t && styles.pillTextActive]}>
                                {t === 'YD' ? 'Yarn Dyed' : 'Piece Dyed'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Weave / Structure</Text>
                <TextInput
                    value={weave} onChangeText={setWeave}
                    placeholder="e.g. Dobby — fine dobby" placeholderTextColor={T.muted}
                    style={styles.inp}
                />

                <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Reed Space</Text>
                        <TextInput
                            value={reed} onChangeText={setReed}
                            keyboardType="decimal-pad" placeholder={'64"'} placeholderTextColor={T.muted}
                            style={styles.inp}
                        />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Warp Shrink %</Text>
                        <TextInput
                            value={wsh} onChangeText={setWsh}
                            keyboardType="decimal-pad" style={styles.inp}
                        />
                    </View>
                </View>

                <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Finished Width</Text>
                        <TextInput
                            value={finW} onChangeText={setFinW}
                            keyboardType="decimal-pad" placeholder={'58"'} placeholderTextColor={T.muted}
                            style={styles.inp}
                        />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Finish Shrink %</Text>
                        <TextInput
                            value={gfSh} onChangeText={setGfSh}
                            keyboardType="decimal-pad" style={styles.inp}
                        />
                    </View>
                </View>

                <View style={{ height: 24 }} />
                <Button label="Save Design" onPress={save} disabled={!isValid} fullWidth />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 10, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 12 },
    inp: { backgroundColor: T.surface, borderRadius: 9, borderWidth: 1.5, borderColor: T.border, padding: 12, fontSize: 14, color: T.ink },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: T.sub },
    pillActive: { backgroundColor: T.nav },
    pillText: { fontSize: 11, fontWeight: '700', color: T.muted },
    pillTextActive: { color: '#fff' },
    twoCol: { flexDirection: 'row' },
});
