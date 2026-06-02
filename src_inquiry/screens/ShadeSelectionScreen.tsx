// ShadeSelectionScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontSize, radius, spacing } from '../utils/theme';
import { masterApi } from '../services/masterApi';
import { RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'ShadeSelection'>;

const ShadeSelectionScreen: React.FC<Props> = ({ route, navigation }) => {
    const { onSelect } = route.params;
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [shades, setShades] = useState<{ name: string; code?: string }[]>([]);
    const [userPrptype, setUserPrptype] = useState('');

    useEffect(() => {
        const initializeApp = async () => {
            try {
                const user_prptype = await AsyncStorage.getItem('user_prptype');
                console.log('user_prptype', user_prptype);
                setUserPrptype(user_prptype);
            } catch (error) {
                console.error('Initialization error:', error);
            } finally {
            }
        };

        initializeApp();
    }, []);

    // Search shades from API
    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await masterApi.searchShades(search, userPrptype, '27');
                if (!cancelled) setShades(res);
            } catch (error) {
                console.error(error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [search, userPrptype]);

    const handleSelectShade = (shade: { name: string; code?: string }) => {
        onSelect(shade);
        navigation.goBack();
    };

    const handleAddNewShade = () => {
        if (!search.trim()) {
            Alert.alert('Enter shade name', 'Please type a shade name first');
            return;
        }
        onSelect({ name: search.trim(), code: undefined, isNew: true });
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchWrap}>
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search shade by name or code..."
                    placeholderTextColor={colors.textTertiary}
                    style={styles.search}
                    autoFocus
                />
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
            ) : (
                <FlatList
                    data={shades}
                    keyExtractor={(item, idx) => item.code || idx.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.row} onPress={() => handleSelectShade(item)}>
                            <Text style={styles.name}>{item.name}</Text>
                            {item.code && <Text style={styles.meta}>Code: {item.code}</Text>}
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ padding: spacing.md }}
                    ListEmptyComponent={
                        <EmptyState
                            title="No shades found"
                            subtitle={search ? 'Try a different search' : 'Start typing to search'}
                        />
                    }
                    ListFooterComponent={
                        search.trim().length > 0 && !shades.some(s => s.name.toLowerCase() === search.toLowerCase()) ? (
                            <TouchableOpacity style={styles.addNewBtn} onPress={handleAddNewShade}>
                                <Text style={styles.addNewText}>+ Add New Shade: "{search}"</Text>
                            </TouchableOpacity>
                        ) : null
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    searchWrap: { padding: spacing.md },
    search: {
        backgroundColor: colors.cardBg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        fontSize: fontSize.md,
        color: colors.textPrimary,
    },
    row: {
        padding: spacing.md,
        backgroundColor: colors.cardBg,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    name: { fontSize: fontSize.base, fontWeight: '500', color: colors.primary },
    meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
    addNewBtn: {
        marginTop: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.infoBg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.info,
        alignItems: 'center',
    },
    addNewText: { color: colors.info, fontWeight: '600', fontSize: fontSize.md },
});

export default ShadeSelectionScreen;