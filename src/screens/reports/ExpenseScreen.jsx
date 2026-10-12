// ExpenseScreen.jsx — Madhusudhan Fabrics (React Native)
//
// Expense report = clone of the ERP Designing artifact's Expense module
// (src/screens/reports/expense/*). This file only:
//   - loads the 6 months from /api/mobile-dashboard/expense-card (useExpenseData)
//   - turns each month into the artifact's month figures (xCalc.js —
//     senior's Section A / B rules on live ERP data)
//   - keeps the Month settings edits (rate, working days, stores A/B) per
//     month on this device
//   - saves Daily maintenance / Daily other expenses to the ERP
//     (Daily Section Expense API) and refreshes the month afterwards.
// The previous report is in Expense_Artifact_Clone/original_backup.

import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useHeaderExtrasStore } from '../../core/layout/headerExtras';
import { useExpenseData } from '../../hooks/useExpenseData';
import ExpenseModule from './expense/ExpenseModule';
import { LegacyMonthReport } from './ExpenseScreenLegacy';
import { abMonth, buildExp, dayLabel, legacyMonth, nextYmd, T } from './expense/xCalc';

const SETTINGS_KEY = 'expense_month_settings_v1';
const RWC_KINDS = ['maintenance', 'other'];

export default function ExpenseScreen({ token, apiBase }) {
  const { months, states, refresh, refreshMonth, retryMonth, saveDailySectionExpense, deleteDailySectionExpense } = useExpenseData({ token, apiBase });

  /* header refresh button (app shell — unchanged) */
  const setHeaderExtras = useHeaderExtrasStore((s) => s.setHeaderExtras);
  const clearHeaderExtras = useHeaderExtrasStore((s) => s.clearHeaderExtras);
  useFocusEffect(
    useCallback(() => {
      setHeaderExtras({
        subtitle: 'Expense · Production Cost',
        right: (
          <TouchableOpacity onPress={refresh} style={hdr.refresh} activeOpacity={0.75}>
            <Text style={hdr.refreshText}>↻</Text>
          </TouchableOpacity>
        ),
      });
      return () => clearHeaderExtras();
    }, [refresh, setHeaderExtras, clearHeaderExtras]),
  );

  /* Month settings (artifact: editable) — kept per month on this device */
  const [settings, setSettings] = useState({});
  const loaded = useRef(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        if (alive && parsed && typeof parsed === 'object') setSettings(parsed);
      } catch (e) {
        // storage unavailable — ERP values only
      } finally {
        loaded.current = true;
      }
    })();
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  const curEntry = months[0];
  const curState = curEntry ? states[curEntry.key] : null;
  const curD = curState && curState.data;

  /* Daily maintenance / other — local rows while editing, saved to the ERP */
  const [rwcRows, setRwcRows] = useState({});
  const [rwcStatus, setRwcStatus] = useState({ maintenance: {}, other: {} });
  const timers = useRef({});
  const dirty = useRef(false);
  useEffect(() => { setRwcRows({}); setRwcStatus({ maintenance: {}, other: {} }); }, [curD]);

  const exp = useMemo(() => {
    if (!curEntry || !curD) return null;
    const e = buildExp(curEntry, curD, null); // Month settings are read-only: always ERP values
    if (rwcRows.maintenance) e.dailyMaint = rwcRows.maintenance;
    if (rwcRows.other) e.dailyOther = rwcRows.other;
    return e;
  }, [curEntry, curD, settings, rwcRows]);

  const monthFigures = useMemo(() => {
    const out = [];
    [...months].reverse().forEach((entry) => {
      const d = states[entry.key] && states[entry.key].data;
      if (!d) return;
      out.push(d.section_ab_active === true ? abMonth(entry, d) : legacyMonth(entry, d));
    });
    return out;
  }, [months, states]);

  /* months before 1 Oct 2026 -> the previous Rapier / Waterjet report */
  const [legacyWide, setLegacyWide] = useState(false);
  const renderLegacy = useCallback((yyyymm) => {
    const entry = months.find((e) => `${e.calYear}-${String(e.calMonth + 1).padStart(2, '0')}` === yyyymm);
    if (!entry) return null;
    return <LegacyMonthReport key={entry.key} token={token} apiBase={apiBase} m={entry} months={months} states={states} refresh={refresh} />;
  }, [months, states, token, apiBase, refresh]);

  const setSetting = useCallback((k, v) => {
    if (!curEntry) return;
    setSettings((prev) => ({ ...prev, [curEntry.key]: { ...(prev[curEntry.key] || {}), [k]: v } }));
  }, [curEntry]);

  const saveRow = useCallback(async (kind, row) => {
    const key = row.ymd;
    setRwcStatus((s) => ({ ...s, [kind]: { ...s[kind], [key]: 'saving' } }));
    try {
      const empty = !(+row.A || 0) && !(+row.B || 0) && !(+row.common || 0);
      if (empty) {
        if (row.saved) await deleteDailySectionExpense({ kind, entryDate: key });
      } else {
        await saveDailySectionExpense({ kind, entryDate: key, sectionAAmount: +row.A || 0, sectionBAmount: +row.B || 0, commonAmount: +row.common || 0, existing: !!row.saved });
      }
      setRwcRows((p) => ({ ...p, [kind]: (p[kind] || []).map((r) => (r.ymd === key ? { ...r, saved: !empty } : r)) }));
      setRwcStatus((s) => ({ ...s, [kind]: { ...s[kind], [key]: 'saved' } }));
      dirty.current = true;
    } catch (e) {
      setRwcStatus((s) => ({ ...s, [kind]: { ...s[kind], [key]: 'error' } }));
    }
  }, [saveDailySectionExpense, deleteDailySectionExpense]);

  const rowsOf = useCallback((kind) => (rwcRows[kind] || (exp ? (kind === 'maintenance' ? exp.dailyMaint : exp.dailyOther) : [])), [rwcRows, exp]);

  const rwc = useMemo(() => ({
    status: rwcStatus,
    setCell: (kind, i, k, v) => {
      const rows = rowsOf(kind).map((r, j) => (j === i ? { ...r, [k]: v === '' ? 0 : +v } : r));
      setRwcRows((p) => ({ ...p, [kind]: rows }));
      const row = rows[i];
      const tk = `${kind}:${row.ymd}`;
      clearTimeout(timers.current[tk]);
      timers.current[tk] = setTimeout(() => saveRow(kind, row), 900);
    },
    canAdd: (kind) => !!(exp && nextYmd(rowsOf(kind), exp)),
    addDay: (kind) => {
      const rows = rowsOf(kind);
      const ymd = exp ? nextYmd(rows, exp) : null;
      if (!ymd) return;
      setRwcRows((p) => ({ ...p, [kind]: [...rows, { ymd, d: dayLabel(ymd), A: 0, B: 0, common: 0, saved: false }] }));
    },
    done: () => {
      // flush pending saves, then reload the month so every figure is the ERP's
      const pending = Object.keys(timers.current);
      pending.forEach((tk) => {
        clearTimeout(timers.current[tk]);
        const [kind, ymd] = tk.split(':');
        const row = rowsOf(kind).find((r) => String(r.ymd) === ymd);
        delete timers.current[tk];
        if (row) saveRow(kind, row);
      });
      if (dirty.current || pending.length) {
        dirty.current = false;
        setTimeout(() => { if (curEntry) refreshMonth(curEntry.key, true); }, pending.length ? 1500 : 0);
      }
    },
  }), [rwcStatus, rowsOf, saveRow, exp, curEntry, refreshMonth]);
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  /* ---------------- render ---------------- */
  let body;
  if (!curEntry) body = null;
  else if (!curD && (!curState || curState.status === 'loading' || curState.status === 'idle')) {
    body = (
      <View style={st.center}>
        <ActivityIndicator color={T.copper} />
        <Text style={st.muted}>Loading {curEntry.fullLabel}…</Text>
      </View>
    );
  } else if (!curD) {
    body = (
      <View style={st.center}>
        <Text style={st.err}>Could not load {curEntry.fullLabel}</Text>
        <Text style={st.muted}>{curState && curState.error}</Text>
        <TouchableOpacity onPress={() => retryMonth(curEntry.key)} style={st.retry}><Text style={st.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  } else if (curD.section_ab_active !== true) {
    body = (
      <View style={st.center}>
        <Text style={st.muted}>{curEntry.fullLabel} is not a Section A / B month in the ERP yet.</Text>
      </View>
    );
  } else {
    body = <ExpenseModule key={exp.cur} exp={exp} months={monthFigures} setSetting={setSetting} rwc={rwc} renderLegacy={renderLegacy} onLegacyChange={setLegacyWide} />;
  }

  return (
    <View style={st.safe}>
      <ScrollView style={st.body} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={[st.wrap, legacyWide && { maxWidth: 1360 }]}>{body}</View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  body: { flex: 1, backgroundColor: T.bg },
  wrap: { width: '100%', maxWidth: 780, alignSelf: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20, gap: 8 },
  muted: { fontSize: 12, color: T.muted, textAlign: 'center' },
  err: { fontSize: 13, fontWeight: '800', color: T.red },
  retry: { marginTop: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 9, backgroundColor: T.nav },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});

const hdr = StyleSheet.create({
  refresh: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  refreshText: { color: '#fff', fontSize: 22, fontWeight: '800' },
});
