import AppAlert from '@/common/utils/appAlert';

// export default SettingsScreen;
import AsyncStorage from '@/common/utils/compatibleStorage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import Button from '../components/Button';
import { settingsApi } from '../services/settingsApi';
import { RootStackParamList } from '../types';
import { colors, fontSize, radius, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const router = useRouter();
  const [getUserPrptype, setUserPrptype] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userIds, setUserIds] = useState<number[]>([]);
  const [newId, setNewId] = useState('');

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
    (async () => {
      try {
        const ids = await settingsApi.listAuthorizers(getUserPrptype, getCurrentFinancialYear());
        setUserIds(ids);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [getUserPrptype]);

  const addId = () => {
    const id = parseInt(newId, 10);
    if (!id || isNaN(id)) {
      AppAlert.alert('Invalid', 'Enter a valid user ID');
      return;
    }
    if (userIds.includes(id)) {
      AppAlert.alert('Already added', 'This user is already an authorizer');
      return;
    }
    setUserIds([...userIds, id]);
    setNewId('');
  };

  const removeId = (id: number) => {
    setUserIds(userIds.filter(u => u !== id));
  };

  const save = async (getUserPrptype) => {
    setSaving(true);
    try {
      await settingsApi.updateAuthorizers(userIds, getUserPrptype, getCurrentFinancialYear());
      AppAlert.alert('Saved', 'Authorizer list updated', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      AppAlert.alert('Error', e?.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg, marginTop: 55}}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <TouchableOpacity style={{ marginBottom: 10 }}
          onPress={()=> router.back()}
        >
          <Text style={{ color: '#000' }}>Back</Text>
        </TouchableOpacity>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Cost Sheet Authorizers</Text>
        <Text style={styles.bannerText}>
          Add user IDs of people who can approve or reject new cost sheets. They
          will see the authorization queue on their dashboard.
        </Text>
      </View>

      {/* Current list */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Current authorizers</Text>
        {userIds.length === 0 ? (
          <Text style={styles.emptyText}>
            No authorizers set. Add at least one user ID below.
          </Text>
        ) : (
          userIds.map(id => (
            <View key={id} style={styles.idRow}>
              <Text style={styles.idText}>User #{id}</Text>
              <TouchableOpacity onPress={() => removeId(id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Add new */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Add authorizer</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TextInput
            value={newId}
            onChangeText={setNewId}
            keyboardType="number-pad"
            placeholder="Enter user ID"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { flex: 1 }]}
          />
          <TouchableOpacity onPress={addId} style={styles.addBtn}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          Tip: User IDs can be found in your user management system.
        </Text>
      </View>

      <Button
        title="Save Changes"
        onPress={() => save(getUserPrptype)}
        loading={saving}
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: {
    backgroundColor: colors.infoBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md
  },
  bannerTitle: { color: colors.info, fontWeight: '500', marginBottom: 4 },
  bannerText: { color: colors.info, fontSize: fontSize.sm, lineHeight: 18 },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  emptyText: { fontSize: fontSize.sm, color: colors.textTertiary },
  idRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  idText: { fontSize: fontSize.base, color: colors.textPrimary },
  removeText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    backgroundColor: colors.cardBg,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  addBtnText: { color: colors.white, fontWeight: '500' },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 6,
  },
});

export default SettingsScreen;
