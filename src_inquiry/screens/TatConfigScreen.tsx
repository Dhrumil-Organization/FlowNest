import AppAlert from '@/common/utils/appAlert';
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
  View,
} from 'react-native';

import HeaderBarwithBack from '@/components/Header';
import AsyncStorage from '@/common/utils/compatibleStorage';
import Button from '../components/Button';
import { tatApi } from '../services/tatApi';
import { RootStackParamList, TatConfiguration } from '../types';
import { colors, fontSize, radius, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TatConfig'>;

interface EditRow extends TatConfiguration {
  _expectedHours: string;
  _warningPct: string;
}

const formatHoursLabel = (h: number): string => {
  if (h < 24) return `${h} hours`;
  const days = Math.floor(h / 24);
  const remH = h % 24;
  return remH > 0 ? `${days}d ${remH}h` : `${days} day${days > 1 ? 's' : ''}`;
};

const TatConfigScreen: React.FC<Props> = ({ navigation, username }) => {
  const router = useRouter();
  const [rows, setRows] = useState<EditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    (async () => {
      try {
        const data = await tatApi.listConfigurations({
          prptype: getUserPrptype,
          yearno: "27"
        });
        setRows(
          data.map(c => ({
            ...c,
            _expectedHours: String(c.expected_hours),
            _warningPct: String(c.warning_threshold_percent),
          })),
        );
      } catch {
        AppAlert.alert('Error', 'Failed to load TAT configurations');
      } finally {
        setLoading(false);
      }
    })();
  }, [getUserPrptype]);

  const update = (id: number, patch: Partial<EditRow>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    for (const r of rows) {
      const hrs = parseInt(r._expectedHours, 10);
      const pct = parseInt(r._warningPct, 10);
      if (isNaN(hrs) || hrs < 1) {
        AppAlert.alert('Invalid', `Enter valid hours for "${r.step_name}"`);
        return;
      }
      if (isNaN(pct) || pct < 1 || pct > 100) {
        AppAlert.alert('Invalid', `Warning % must be 1–100 for "${r.step_name}"`);
        return;
      }
    }
    setSaving(true);
    try {
      await tatApi.bulkUpdate(
        rows.map(r => ({
          id: r.id,
          expected_hours: parseInt(r._expectedHours, 10),
          warning_threshold_percent: parseInt(r._warningPct, 10),
        })),
        getUserPrptype,
        "27"
      );
      AppAlert.alert('Saved', 'TAT configurations updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      AppAlert.alert('Error', e?.response?.data?.message || 'Failed to save');
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
    <>
      <HeaderBarwithBack
        userName={username}
        header={'TAT Configuration'}
        subHeader={'Manage your TAT configuration'}
        breadcrumb={'TAT Configuration'}
        SearchBar={false}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>⚙ TAT Configuration</Text>
          <Text style={styles.bannerText}>
            Configure expected time for each step of the inquiry workflow. Warning
            % is when the inquiry starts showing as "warning" before fully
            breaching.
          </Text>
        </View>

        {rows.map(row => {
          const hrs = parseInt(row._expectedHours, 10);
          return (
            <View key={row.id} style={styles.card}>
              <Text style={styles.stepName}>{row.step_name}</Text>
              {row.description ? (
                <Text style={styles.description}>{row.description}</Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>Expected Hours *</Text>
                  <TextInput
                    value={row._expectedHours}
                    onChangeText={t => update(row.id, { _expectedHours: t })}
                    keyboardType="number-pad"
                    placeholder="e.g., 4"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.input}
                  />
                  {!isNaN(hrs) && hrs > 0 ? (
                    <Text style={styles.hint}>= {formatHoursLabel(hrs)}</Text>
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Warning %</Text>
                  <TextInput
                    value={row._warningPct}
                    onChangeText={t => update(row.id, { _warningPct: t })}
                    keyboardType="number-pad"
                    placeholder="75"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.input}
                  />
                  <Text style={styles.hint}>of expected</Text>
                </View>
              </View>
            </View>
          );
        })}

        <Button
          title="Save Configuration"
          onPress={save}
          loading={saving}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </>
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
    marginBottom: spacing.md,
  },
  bannerTitle: {
    color: colors.info,
    fontSize: fontSize.base,
    fontWeight: '500',
    marginBottom: 4,
  },
  bannerText: { color: colors.info, fontSize: fontSize.sm, lineHeight: 18 },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stepName: { fontSize: fontSize.base, fontWeight: '500', color: colors.textPrimary },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.cardBg,
  },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});

export default TatConfigScreen;
