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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontSize, radius, spacing } from '../utils/theme';
import { masterApi } from '../services/masterApi';
import { Party, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../android/app/src/theme';
import { getCurrentFinancialYear } from '../../common/commonfunction';

type Props = NativeStackScreenProps<RootStackParamList, 'PartySelection'>;

const PartySelectionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { onSelect } = route.params;
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Party[]>([]);
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
        const res = await masterApi.searchParties(search, getUserPrptype, getCurrentFinancialYear());
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

  const handleSelect = (p: Party) => {
    onSelect(p);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, GSTIN, or code"
          placeholderTextColor={colors.textTertiary}
          style={styles.search}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={styles.addBox}
        onPress={() =>
          navigation.replace('AddParty', {
            onSaved: p => {
              onSelect(p);
              navigation.goBack();
            },
          })
        }>
        <Text style={styles.addBoxText}>+ Add New Party via GSTIN</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={p => `${p.prp_code}-${p.acc_code}`}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {[item.city, item.state].filter(Boolean).join(', ')}
                {item.gstin ? ` • ${item.gstin}` : ''}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={
            <EmptyState
              title="No parties found"
              subtitle={search ? 'Try a different search term' : 'Start typing to search'}
            />
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
  addBox: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.info,
    borderRadius: radius.md,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
  },
  addBoxText: { color: colors.info, fontWeight: '500' },
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

export default PartySelectionScreen;
