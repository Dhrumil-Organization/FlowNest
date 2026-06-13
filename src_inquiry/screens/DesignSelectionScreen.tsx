import { executeCallback } from '@/common/utils/callbackRegistry';
import theme from '@/components/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { masterApi } from '../services/masterApi';
import { Design, RootStackParamList } from '../types';
import { colors, fontSize, radius, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DesignSelection'>;

const DesignSelectionScreen: React.FC<Props> = ({ route, navigation }) => {
  // const { onSelect } = route.params;
  const router = useRouter();
  const params = useLocalSearchParams();
  const callbackId = (params?.callbackId as string) || null;
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Design[]>([]);
  const [getUserPrptype, setUserPrptype] = useState<string>('');


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

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await masterApi.searchDesigns(search, getUserPrptype, getCurrentFinancialYear());
        if (!cancelled) setItems(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, getUserPrptype]);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        {getUserPrptype === 'S' ? (
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search design by name or code"
            placeholderTextColor={colors.textTertiary}
            style={styles.search}
            autoFocus
          />
        ) : (
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search item by name or code"
            placeholderTextColor={colors.textTertiary}
            style={styles.search}
            autoFocus
          />

        )}

      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={d => `${d.prp_code}-${d.dsn_code}`}
          renderItem={({ item }) => (
            // <TouchableOpacity
            //   style={styles.row}
            //   onPress={() => {
            //     onSelect(item);
            //     navigation.goBack();
            //   }}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                if (callbackId) {
                  executeCallback(callbackId, item);
                }
                router.back();
              }}>

              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                Code: {item.dsn_code}
                {item.short ? ` • ${item.short}` : ''}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={
            <EmptyState
              title="No designs found"
              subtitle={search ? 'Try a different search' : 'Start typing to search'}
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
  name: { fontSize: fontSize.base, fontWeight: '500', color: theme.BRAND_GRADIENT_END },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
});

export default DesignSelectionScreen;
