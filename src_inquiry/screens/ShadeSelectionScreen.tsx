import { executeCallback } from '@/common/utils/callbackRegistry';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import EmptyState from '../components/EmptyState';
import { shadesApi } from '../services/shadesApi';
import { RootStackParamList } from '../types';
import { colors, fontSize, radius, spacing } from '../utils/theme';
// import { registerCallback } from '@/common/utils/callbackRegistry';

type Props = NativeStackScreenProps<RootStackParamList, 'ShadeSelection'>;

interface Shade {
    ShdCode: string;
    ShdName: string;
}

const ShadeSelectionScreen: React.FC<Props> = ({ route, navigation }) => {
    // const { onSelect } = route.params;
    const router = useRouter();
    const params = useLocalSearchParams();
    const callbackId = (params?.callbackId as string) || null;
    const [getUserPrptype, setUserPrptype] = useState<string>('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [shades, setShades] = useState<Shade[]>([]);


    useEffect(() => {
        const initializeApp = async () => {
            try {
                const user_prptype = await AsyncStorage.getItem('user_prptype');
                setUserPrptype(user_prptype || '');
            } catch (error) {
                console.error('Initialization error:', error);
            }
        };
        initializeApp();
    }, []);
    // SK
    useEffect(() => {
        const fetchShades = async () => {
            if (!getUserPrptype) return;
            setLoading(true);
            console.log('getUserPrptype', getUserPrptype);
            try {
                const prpType = getUserPrptype?.toString().trim().toUpperCase();
                const apiPrpType = prpType === 'S' ? 'SIP' : 'SK';
                console.log('apiPrpType:', apiPrpType); // Debug: Check the final value
                const response = await shadesApi.listShades(apiPrpType, getCurrentFinancialYear(), '002', 'sales_order');
                setShades(response.response.data || []);
            } catch (e) {
                console.error('Failed to load shades', e);
            } finally {
                setLoading(false);
            }
        };
        fetchShades();
    }, [getUserPrptype]);

    const filteredShades = shades.filter(
        shade =>
            shade.ShdName.toLowerCase().includes(search.toLowerCase()) ||
            shade.ShdCode.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchWrap}>
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search shade by name or code"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.search}
                    autoFocus
                />
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
            ) : (
                <FlatList
                    data={filteredShades}
                    keyExtractor={shade => shade.ShdCode}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.row}
                            // onPress={() => {
                            //     onSelect({
                            //         shade_code: item.ShdCode,
                            //         shade_name: item.ShdName,
                            //     });
                            //     navigation.goBack();
                            // }}
                            onPress={() => {
                                if (callbackId) {
                                    executeCallback(callbackId, {
                                        shade_code: item.ShdCode,
                                        shade_name: item.ShdName,
                                    });
                                }
                                router.back();
                            }}

                        >
                            <Text style={styles.name}>{item.ShdName}</Text>
                            <Text style={styles.meta}>Code: {item.ShdCode}</Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ padding: spacing.md }}
                    ListEmptyComponent={
                        <EmptyState
                            title="No shades found"
                            subtitle={search ? 'Try a different search' : 'No shades available'}
                        />
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, marginTop: 50 },
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
    name: { fontSize: fontSize.base, fontWeight: '500', color: colors.textPrimary },
    meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
});

export default ShadeSelectionScreen;