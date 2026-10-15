import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { s, C } from '../styles';
import * as api from '../api';
import { f2 } from '../helpers';
import type { Carton } from '../types';

type Props = { token: string; prpcode: string; yearno: any; onPick: (c: Carton) => void };

const MAX_ROWS = 30;
const CACHE_TTL = 30 * 1000; // balances change after every issue, so keep the cache short
const cache = new Map<string, { t: number; rows: Carton[] }>(); // key contains property + year

/**
 * Manual carton search. It owns its own `search` / `results` state, so typing here
 * re-renders ONLY this component and not the whole screen.
 * The screen mounts it only while no carton is chosen, so it starts clean every time.
 * A stale response can no longer overwrite a newer one (request id guard).
 */
const CartonSearch = ({ token, prpcode, yearno, onPick }: Props) => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Carton[]>([]);
    const [searching, setSearching] = useState(false);
    const reqId = useRef(0);

    useEffect(() => {
        const q = search.trim();
        const my = ++reqId.current;

        if (q.length < 2 || !prpcode || !yearno) {
            setSearching(false);
            setResults([]);
            return;
        }

        const key = `${prpcode}|${yearno}|${q}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.t < CACHE_TTL) {
            setSearching(false);
            setResults(hit.rows);
            return;
        }

        const t = setTimeout(async () => {
            setSearching(true);
            const r = await api.searchCartons(token, prpcode, yearno, q);
            if (my !== reqId.current) return; // a newer keystroke already took over
            const rows: Carton[] = r.ok ? api.listOf({ data: r.payload?.data }) : [];
            if (r.ok) cache.set(key, { t: Date.now(), rows });
            setResults(rows);
            setSearching(false);
        }, 350);
        return () => clearTimeout(t);
    }, [search, token, prpcode, yearno]);

    const shown = results.slice(0, MAX_ROWS);

    return (
        <View style={s.searchPanel}>
            <Text style={s.label}>SEARCH CARTON, ITEM OR SHADE</Text>
            <View style={s.searchWrap}>
                <Icon name="search" size={20} color={C.ink2} />
                <TextInput
                    style={s.searchInput}
                    placeholder="e.g. 10452 or 75D"
                    placeholderTextColor={C.ink2}
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    autoCapitalize="characters"
                />
                {!!search && (
                    <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search">
                        <Icon name="cancel" size={18} color={C.ink2} />
                    </TouchableOpacity>
                )}
            </View>

            {searching && <ActivityIndicator style={{ padding: 16 }} color={C.primary} />}

            {!searching && shown.length === 0 && (
                <Text style={[s.hint, { marginTop: 10 }]}>
                    {search.trim().length < 2 ? 'Type at least 2 characters to search.' : 'No carton with balance matches.'}
                </Text>
            )}

            {!searching && shown.length > 0 && (
                <ScrollView style={s.resultList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {shown.map((c: Carton) => (
                        <TouchableOpacity
                            key={`${c.CartNo}-${c.PUId}-${c.PSrNo}-${c.PSubSr}`}
                            style={s.resultRow}
                            activeOpacity={0.7}
                            onPress={() => { Keyboard.dismiss(); onPick(c); }}
                        >
                            <View style={s.resultIcon}><Icon name="inventory-2" size={18} color={C.primary} /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.lineTitle}>{c.CartNo}</Text>
                                <Text style={s.lineSub} numberOfLines={1}>{[c.ItmName, c.ShdName, c.GrdName].filter(Boolean).join(', ')}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 3 }}>
                                <View style={s.badge}><Text style={s.badgeText}>{c.Chees} chees</Text></View>
                                <Text style={s.lineSub}>{f2(c.Wt)} kg</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                    {results.length > MAX_ROWS && (
                        <Text style={[s.hint, { padding: 12, marginTop: 0 }]}>Showing first {MAX_ROWS} of {results.length}. Type more to narrow down.</Text>
                    )}
                </ScrollView>
            )}
        </View>
    );
};

export default React.memo(CartonSearch);
