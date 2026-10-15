// FILE: src/components/TakaHistory/FilterScreen.tsx
// Step 1 — Property · Year · Store (dropdowns) · as-on date · "Fresh data" -> builds the report and opens the taka list.
import { S, T } from '@/src/theme';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createTakaRun } from './api';
import { useTakaCriteria } from './criteria';
import { todayText, toIso, type TakaRun } from './model';
import SelectField from './SelectField';

type Props = { token: string; API: string; onLoaded: (run: TakaRun) => void };

export default function FilterScreen({ token, API, onLoaded }: Props) {
  const [prpCode, setPrpCode] = useState('');
  const [yearNo, setYearNo] = useState('');
  const [strCode, setStrCode] = useState('');
  const [asOn, setAsOn] = useState(todayText());
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const c = useTakaCriteria({
    token,
    API,
    prpCode,
    yearNo,
    onAutoProperty: (code) => setPrpCode((p) => p || code),
    onAutoYear: (y) => setYearNo((v) => v || y),
    onAutoStore: (sc) => setStrCode((v) => v || sc),
  });

  const load = async () => {
    const iso = toIso(asOn);
    if (!prpCode) return setError('Select a property.');
    if (!yearNo) return setError('Select a year.');
    if (!strCode) return setError('Select a store.');
    if (!iso) return setError('Enter the date as dd/mm/yyyy.');

    setError('');
    setLoading(true);
    try {
      const run = await createTakaRun(API, token, {
        prp_codes: prpCode,
        str_codes: strCode,
        as_on_date: iso,
        yearno: yearNo,
        refresh,
      });
      onLoaded(run);
    } catch (e: any) {
      setError(e?.message || 'Could not load.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={st.content}>
        <View style={{ gap: 2 }}>
          <Text style={st.h1}>Finish Taka History</Text>
          <Text style={st.h1Sub}>Pick property, store and date — then open every taka with its full journey.</Text>
        </View>

        <View style={st.panel}>
          <View style={st.grid}>
            <SelectField
              label="Property"
              required
              icon="apartment"
              value={prpCode}
              options={c.propOpts}
              loading={c.propLoading}
              onRefresh={c.reloadProps}
              onChange={(v) => {
                setPrpCode(v);
                setYearNo('');
                setStrCode('');
              }}
            />
            <SelectField
              label="Year"
              required
              icon="event"
              value={yearNo}
              options={c.yearOpts}
              loading={c.yearLoading}
              onRefresh={c.reloadYears}
              disabled={!prpCode}
              disabledHint="Select property first"
              onChange={(v) => {
                setYearNo(v);
                setStrCode('');
              }}
            />
            <SelectField
              label="Store"
              required
              icon="store"
              value={strCode}
              options={c.storeOpts}
              loading={c.storeLoading}
              onRefresh={c.reloadStores}
              disabled={!yearNo}
              disabledHint="Select year first"
              onChange={setStrCode}
            />

            <View style={st.field}>
              <Text style={st.label}>As on date</Text>
              <View style={st.row}>
                <TextInput
                  style={[st.input, { flex: 1, minWidth: 0 }]}
                  value={asOn}
                  onChangeText={setAsOn}
                  placeholder="dd/mm/yyyy"
                  placeholderTextColor={T.muted}
                  keyboardType="numbers-and-punctuation"
                />
                <TouchableOpacity style={st.smallBtn} onPress={() => setAsOn(todayText())} accessibilityRole="button">
                  <Text style={st.smallBtnText}>Today</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={[st.row, st.switchRow]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.switchLabel}>Fresh data</Text>
              <Text style={st.hint}>Off = re-use a report built in the last 15 minutes (fast)</Text>
            </View>
            <Switch value={refresh} onValueChange={setRefresh} trackColor={{ false: T.border, true: T.copper }} />
          </View>

          {c.prptypeMissing ? (
            <View style={st.errorBox}>
              <Text style={st.errorText}>Property group (prptype) not found for this login — please re-login.</Text>
            </View>
          ) : null}

          {error ? (
            <View style={st.errorBox}>
              <Text style={st.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            style={[st.button, loading && { opacity: 0.8 }]}
            onPress={load}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <View style={st.row}>
                <ActivityIndicator color="#fff" />
                <Text style={[st.buttonText, { marginLeft: 10 }]}>Building report…</Text>
              </View>
            ) : (
              <Text style={st.buttonText}>Show takas</Text>
            )}
          </TouchableOpacity>
          {loading ? <Text style={[st.hint, { textAlign: 'center', marginTop: 8 }]}>A fresh report can take up to a minute.</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  scroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 12 },
  h1: { fontSize: 19, fontWeight: '900', color: T.nav },
  h1Sub: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: T.muted },
  panel: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 14 },
  field: { flexGrow: 1, flexBasis: 220, minWidth: 0 },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: T.muted, textTransform: 'uppercase', marginBottom: 6 },
  hint: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 4 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
    color: T.ink,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  smallBtn: {
    marginLeft: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: T.alt,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { color: T.copper, fontWeight: '800', fontSize: 13 },
  switchRow: {
    marginTop: 16,
    padding: 12,
    gap: 10,
    backgroundColor: T.sub,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  switchLabel: { fontSize: 14, fontWeight: '800', color: T.nav },
  errorBox: { marginTop: 14, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: `${T.red}40`, backgroundColor: `${T.red}10` },
  errorText: { fontSize: 12.5, fontWeight: '700', color: T.red },
  button: { marginTop: 16, height: 46, borderRadius: 10, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
