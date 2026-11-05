// FILE: src/components/TakaHistory/FilterPanel.tsx
// Filters as a slide-in panel (right drawer on web / tablet, full screen on phone) - same idea as the
// Daily Collection Report "Filters" panel, so the user never has to go "back" to change a filter.
// Property (one or many) · Date (As on date | Sales between From - To) · Fresh data   (no year filter - a blank year is sent)   (Store is fixed to TAKA_STR_CODE, see model.ts).
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import type { useTakaCriteria } from './criteria';
import { todayText, type DateMode } from './model';
import SelectField from './SelectField';

type Props = {
  c: ReturnType<typeof useTakaCriteria>;
  prpCode: string;
  dateMode: DateMode;
  asOn: string;
  fromDate: string;
  toDate: string;
  refresh: boolean;
  onPrp: (v: string) => void;
  onDateMode: (v: DateMode) => void;
  onAsOn: (v: string) => void;
  onFromDate: (v: string) => void;
  onToDate: (v: string) => void;
  onRefresh: (v: boolean) => void;
  loading: boolean;
  error: string;
  onLoad: () => void;
  onClose: () => void;
};

const PANEL_W = 440;

export default function FilterPanel({ c, prpCode, dateMode, asOn, fromDate, toDate, refresh, onPrp, onDateMode, onAsOn, onFromDate, onToDate, onRefresh, loading, error, onLoad, onClose }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [anim]);

  const close = () => {
    if (!loading) onClose();
  };

  const slide = wide
    ? { transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [PANEL_W, 0] }) }] }
    : { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] };

  return (
    <View style={st.overlay}>
      <Pressable style={st.backdrop} onPress={close} accessibilityLabel="Close filters" />

      <Animated.View style={[st.panel, wide ? st.panelWide : st.panelFull, slide]}>
        <View style={st.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.eyebrow}>TAKA HISTORY</Text>
            <Text style={st.title}>Filters</Text>
          </View>
          <TouchableOpacity style={st.closeBtn} onPress={close} disabled={loading} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="close" size={20} color={T.nav} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={st.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          <View style={st.grid}>
            <SelectField
              label="Property"
              required
              multiple
              icon="apartment"
              value={prpCode}
              options={c.propOpts}
              loading={c.propLoading}
              onRefresh={c.reloadProps}
              onChange={onPrp}
            />
            {/* Store removed from the filter - the API always gets TAKA_STR_CODE ('012')
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
            */}

            <View style={[st.field, { flexBasis: '100%' }]}>
              <Text style={st.label}>Date</Text>
              <View style={st.segment}>
                {([
                  { key: 'A', label: 'As on date' },
                  { key: 'S', label: 'Sales between' },
                ] as { key: DateMode; label: string }[]).map((m) => {
                  const on = dateMode === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      activeOpacity={0.8}
                      onPress={() => onDateMode(m.key)}
                      style={[st.segBtn, on && st.segBtnOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[st.segText, on && st.segTextOn]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {dateMode === 'A' ? (
              <View style={[st.field, { flexBasis: '100%' }]}>
                <DateInput value={asOn} onChange={onAsOn} />
                <Text style={st.hint}>Every taka with its history up to this date</Text>
              </View>
            ) : (
              <>
                <View style={[st.field, { flexBasis: '100%' }]}>
                  <Text style={st.label}>From</Text>
                  <DateInput value={fromDate} onChange={onFromDate} />
                </View>
                <View style={[st.field, { flexBasis: '100%' }]}>
                  <Text style={st.label}>To</Text>
                  <DateInput value={toDate} onChange={onToDate} />
                  <Text style={st.hint}>Only takas sold between these dates, with their history up to the To date</Text>
                </View>
              </>
            )}
          </View>

          <View style={[st.row, st.switchRow]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.switchLabel}>Fresh data</Text>
              <Text style={st.hint}>Off = re-use a report built in the last 15 minutes (fast)</Text>
            </View>
            <Switch value={refresh} onValueChange={onRefresh} trackColor={{ false: T.border, true: T.copper }} />
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
          {loading ? <Text style={[st.hint, { textAlign: 'center' }]}>A fresh report can take up to a minute.</Text> : null}
        </ScrollView>

        <View style={st.footer}>
          <TouchableOpacity style={[st.btn, st.btnGhost]} onPress={close} disabled={loading} accessibilityRole="button">
            <Text style={st.btnGhostText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.btn, st.btnMain, loading && { opacity: 0.8 }]} onPress={onLoad} disabled={loading} accessibilityRole="button">
            {loading ? (
              <View style={st.row}>
                <ActivityIndicator color="#fff" />
                <Text style={[st.btnMainText, { marginLeft: 10 }]}>Building report…</Text>
              </View>
            ) : (
              <View style={st.row}>
                <Icon name="refresh" size={18} color="#fff" />
                <Text style={[st.btnMainText, { marginLeft: 6 }]}>Load</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={st.row}>
      <TextInput
        style={[st.input, { flex: 1, minWidth: 0 }]}
        value={value}
        onChangeText={onChange}
        placeholder="dd/mm/yyyy"
        placeholderTextColor={T.muted}
        keyboardType="numbers-and-punctuation"
      />
      <TouchableOpacity style={st.smallBtn} onPress={() => onChange(todayText())} accessibilityRole="button">
        <Text style={st.smallBtnText}>Today</Text>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, elevation: 50 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,27,45,0.45)' },
  panel: { backgroundColor: T.surface, ...S.card, shadowOpacity: 0.15 },
  panelWide: { position: 'absolute', top: 0, bottom: 0, right: 0, width: PANEL_W, maxWidth: '100%', borderLeftWidth: 1, borderLeftColor: T.border },
  panelFull: { ...StyleSheet.absoluteFillObject },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.hair },
  eyebrow: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: T.copper },
  title: { fontSize: 18, fontWeight: '900', color: T.nav },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 14 },
  field: { flexGrow: 1, flexBasis: 220, minWidth: 0 },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: T.muted, textTransform: 'uppercase', marginBottom: 6 },
  hint: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 4 },
  input: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12, fontSize: 15, fontWeight: '700', color: T.ink },
  row: { flexDirection: 'row', alignItems: 'center' },
  segment: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, overflow: 'hidden' },
  segBtn: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
  segBtnOn: { backgroundColor: T.nav },
  segText: { fontSize: 13.5, fontWeight: '700', color: T.nav },
  segTextOn: { color: '#fff', fontWeight: '800' },
  smallBtn: { marginLeft: 8, height: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { color: T.copper, fontWeight: '800', fontSize: 13 },
  switchRow: { padding: 12, gap: 10, backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.border },
  switchLabel: { fontSize: 14, fontWeight: '800', color: T.nav },
  errorBox: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: `${T.red}40`, backgroundColor: `${T.red}10` },
  errorText: { fontSize: 12.5, fontWeight: '700', color: T.red },
  footer: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: T.hair, backgroundColor: T.surface },
  btn: { height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { flex: 1, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  btnGhostText: { color: T.nav, fontSize: 15, fontWeight: '800' },
  btnMain: { flex: 2, backgroundColor: T.nav },
  btnMainText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
