// FILE: src/components/OwnerDashboardNEW/StageAssignment.tsx
// NEW tab "Stage assignment": item x production-stage -> person.
//   items        : GET  getStageSetupItems (DAPDesign) -> api.ts getStageSetupItems
//   all items    : POST bulkSaveItemStageAssignments   -> api.ts bulkSaveItemStageAssignments
//   stages+saved : GET  getItemStageAssignments        -> api.ts getItemStageAssignments
//   save/modify  : POST saveItemStageAssignments       -> api.ts saveItemStageAssignments
//   delete       : POST deleteItemStageAssignments     -> api.ts deleteItemStageAssignments
// Row 1 = "All items": typing in a stage box copies that value to the SAME stage of every item
// (other stages untouched). Works identically on web and Android (plain RN TextInput, no web-only code).
// Wide screen: table (horizontal scroll if needed). Phone: one card per item.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Btn, CONTENT_MAX, SearchBox } from '../erpUi';
import {
  deleteItemStageAssignments,
  bulkSaveItemStageAssignments,
  getStageSetupItems,
  getItemStageAssignments,
  saveItemStageAssignments,
  type AssignItem,
  type AssignStage,
} from './api';
import { FONT } from './fonts';
import { PRP_CODE, stageYearNo } from './prodOrderModel';

type Props = { token: string; API: string; refreshTick?: number };
type Vals = Record<string, string>; // stageKey -> personId ('' = not assigned)

const ALL = '__all';
const STR_CODE = '012';
const itemLabel = (i: { code: string; name: string }) => i.name || `Item ${i.code}`;
const WIDE = 760;
const skey = (s: AssignStage) => `${s.StageId}|${s.StageName}`;
const onlyDigits = (v: string) => v.replace(/\D/g, '');
const same = (a: Vals | undefined, b: Vals | undefined, keys: string[]) => keys.every((k) => (a?.[k] ?? '') === (b?.[k] ?? ''));

const confirmAsk = (title: string, msg: string, okLabel = 'Delete'): Promise<boolean> =>
  Platform.OS === 'web'
    ? Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${msg}`) : true)
    : new Promise((res) =>
        Alert.alert(title, msg, [
          { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
          { text: okLabel, style: okLabel === 'Delete' ? 'destructive' : 'default', onPress: () => res(true) },
        ]),
      );

export default function StageAssignment({ token, API, refreshTick = 0 }: Props) {
  const [stages, setStages] = useState<AssignStage[]>([]);
  const [items, setItems] = useState<AssignItem[]>([]);
  const [vals, setVals] = useState<Record<string, Vals>>({}); // itemCode -> values on screen
  const [orig, setOrig] = useState<Record<string, Vals>>({}); // itemCode -> values in DB
  const [allRow, setAllRow] = useState<Vals>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [search, setSearch] = useState('');
  const [width, setWidth] = useState(0);
  const toastTimer = useRef<any>(null);
  const seq = useRef(0);

  const say = useCallback((text: string, ok = true) => {
    setToast({ text, ok });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const keys = useMemo(() => stages.map(skey), [stages]);

  const load = useCallback(
    async (silent = false) => {
      const my = ++seq.current;
      silent ? setRefreshing(true) : setLoading(true);
      setError('');
      try {
        const p = { prpcode: PRP_CODE, yearno: stageYearNo() };
        const [itemList, asg] = await Promise.all([getStageSetupItems(API, token, { prpcode: PRP_CODE, strcode: STR_CODE }), getItemStageAssignments(API, token, { ...p, itemcode: '' })]);
        if (my !== seq.current) return;
        const stg = asg.stages;
        const o: Record<string, Vals> = {};
        for (const r of asg.data) {
          if (!r.IsActive) continue;
          const k = `${r.StageId}|${r.StageName}`;
          (o[r.ItemCode] ||= {})[k] = String(r.PersonId ?? '');
        }
        setStages(stg);
        setItems(itemList);
        setOrig(o);
        setVals(JSON.parse(JSON.stringify(o)));
        setAllRow({});
      } catch (e: any) {
        if (my === seq.current) setError(e?.message || 'Unable to load stage assignments.');
      } finally {
        if (my === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [API, token],
  );

  useEffect(() => {
    void load(false);
  }, [load, refreshTick]);

  /* ------------------------------ editing ------------------------------ */

  const setCell = (code: string, key: string, raw: string) => {
    const v = onlyDigits(raw);
    if (code === ALL) {
      // bulk: this stage -> every item (other stages untouched)
      setAllRow((a) => ({ ...a, [key]: v }));
      setVals((cur) => {
        const next: Record<string, Vals> = { ...cur };
        for (const it of items) next[it.code] = { ...(cur[it.code] || {}), [key]: v };
        return next;
      });
    } else {
      setVals((cur) => ({ ...cur, [code]: { ...(cur[code] || {}), [key]: v } }));
    }
  };

  const isDirty = useCallback((code: string) => !same(vals[code], orig[code], keys), [vals, orig, keys]);
  const dirtyCodes = useMemo(() => items.filter((i) => isDirty(i.code)).map((i) => i.code), [items, isDirty]);

  const buildPayload = (codes: string[]) => {
    const out: any[] = [];
    for (const code of codes) {
      const it = items.find((i) => i.code === code);
      if (!it) continue;
      const assignments: { StageId: string; StageName: string; PersonId: number | null }[] = [];
      for (const st of stages) {
        const k = skey(st);
        const now = vals[code]?.[k] ?? '';
        const was = orig[code]?.[k] ?? '';
        if (now === was) continue;
        assignments.push({ StageId: st.StageId, StageName: st.StageName, PersonId: now === '' ? null : Number(now) }); // null = remove
      }
      if (assignments.length) out.push({ ItemCode: it.code, ItemName: it.name, assignments });
    }
    return out;
  };

  const validate = (codes: string[]): string => {
    for (const code of codes)
      for (const k of keys) {
        const v = vals[code]?.[k] ?? '';
        if (v !== '' && (!/^\d+$/.test(v) || Number(v) <= 0)) return `Invalid person id "${v}" for item ${code}.`;
      }
    return '';
  };

  const saveCodes = async (codes: string[], label: string) => {
    if (!codes.length) return say('Nothing changed to save.', false);
    const bad = validate(codes);
    if (bad) return say(bad, false);
    const payload = buildPayload(codes);
    if (!payload.length) return say('Nothing changed to save.', false);
    setBusy((b) => ({ ...b, ...Object.fromEntries(codes.map((c) => [c, true])) }));
    try {
      for (let i = 0; i < payload.length; i += 200) {
        await saveItemStageAssignments(API, token, { prpcode: PRP_CODE, yearno: stageYearNo(), items: payload.slice(i, i + 200) });
      }
      setOrig((o) => {
        const n = { ...o };
        for (const c of codes) n[c] = { ...(vals[c] || {}) };
        return n;
      });
      say(`${label} saved.`);
    } catch (e: any) {
      say(e?.message || 'Save failed.', false);
    } finally {
      setBusy((b) => {
        const n = { ...b };
        codes.forEach((c) => delete n[c]);
        return n;
      });
    }
  };

  const removeRow = async (code: string) => {
    const it = items.find((i) => i.code === code);
    if (!(await confirmAsk('Delete assignments', `Remove all stage assignments of ${it ? itemLabel(it) : code}?`))) return;
    setBusy((b) => ({ ...b, [code]: true }));
    try {
      await deleteItemStageAssignments(API, token, { prpcode: PRP_CODE, yearno: stageYearNo(), itemcode: code });
      setOrig((o) => ({ ...o, [code]: {} }));
      setVals((v) => ({ ...v, [code]: {} }));
      say('Assignments deleted.');
    } catch (e: any) {
      say(e?.message || 'Delete failed.', false);
    } finally {
      setBusy((b) => {
        const n = { ...b };
        delete n[code];
        return n;
      });
    }
  };

  // All items row -> ONE server call: every distinct DAPDesign item gets these stages (other stages untouched)
  const applyAll = async () => {
    const entries = stages.filter((s) => (allRow[skey(s)] ?? '') !== '');
    if (!entries.length) return say('Enter a person id in the All items row first.', false);
    for (const s of entries) {
      const v = allRow[skey(s)];
      if (!/^\d+$/.test(v) || Number(v) <= 0) return say(`Invalid person id "${v}" for ${s.StageName}.`, false);
    }
    const names = entries.map((s) => s.StageName).join(', ');
    if (!(await confirmAsk('Apply to all items', `Assign these stages for all ${items.length} items?\n${names}`, 'Apply'))) return;
    setBusy((b) => ({ ...b, [ALL]: true }));
    try {
      const r = await bulkSaveItemStageAssignments(API, token, {
        prpcode: PRP_CODE,
        strcode: STR_CODE,
        assignments: entries.map((s) => ({ StageId: s.StageId, StageName: s.StageName, PersonId: Number(allRow[skey(s)]) })),
      });
      const patch = (cur: Record<string, Vals>) => {
        const n = { ...cur };
        for (const it of items) {
          const row = { ...(n[it.code] || {}) };
          for (const s of entries) row[skey(s)] = allRow[skey(s)];
          n[it.code] = row;
        }
        return n;
      };
      setOrig(patch);
      setVals(patch);
      say(`Applied to ${r.items} items (${r.inserted} new, ${r.updated} changed).`);
    } catch (e: any) {
      say(e?.message || 'Apply to all failed.', false);
    } finally {
      setBusy((b) => {
        const n = { ...b };
        delete n[ALL];
        return n;
      });
    }
  };

  /* ------------------------------ render ------------------------------ */

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const wide = width >= WIDE;
  const hasAny = (code: string) => keys.some((k) => (orig[code]?.[k] ?? '') !== '');

  const Box = ({ code, k, placeholder, w }: { code: string; k: string; placeholder: string; w?: number }) => {
    const v = (code === ALL ? allRow[k] : vals[code]?.[k]) ?? '';
    const changed = code !== ALL && (vals[code]?.[k] ?? '') !== (orig[code]?.[k] ?? '');
    return (
      <TextInput
        value={v}
        onChangeText={(t) => setCell(code, k, t)}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={9}
        selectTextOnFocus
        style={[st.input, w ? { width: w } : { flex: 1 }, v !== '' && st.inputOn, changed && st.inputChanged]}
      />
    );
  };

  const RowActions = ({ code }: { code: string }) => {
    const b = !!busy[code];
    const d = isDirty(code);
    return (
      <View style={st.actions}>
        {b ? (
          <ActivityIndicator size="small" color={T.copper} />
        ) : (
          <>
            <Btn label={hasAny(code) ? 'Modify' : 'Save'} icon="save" compact disabled={!d} onPress={() => void saveCodes([code], 'Row')} />
            <TouchableOpacity onPress={() => void removeRow(code)} disabled={!hasAny(code)} style={[st.delBtn, !hasAny(code) && { opacity: 0.35 }]} accessibilityLabel="Delete assignments">
              <Icon name="delete-outline" size={18} color={T.red} />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={st.screen}>
      <ScrollView
        contentContainerStyle={st.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[T.copper]} tintColor={T.copper} />}
      >
        <View style={st.content} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <View style={st.head}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.title}>Who is responsible for each step</Text>
              <Text style={st.sub}>Fill the first row for everyone. Fill an item row only if that item has a different person.</Text>
            </View>
            <Btn label={`Save all${dirtyCodes.length ? ` (${dirtyCodes.length})` : ''}`} icon="done-all" compact disabled={!dirtyCodes.length || Object.keys(busy).length > 0} onPress={() => void saveCodes(dirtyCodes, 'All changes')} />
          </View>

          {toast ? (
            <View style={[st.toast, !toast.ok && st.toastBad]}>
              <Icon name={toast.ok ? 'check-circle' : 'error-outline'} size={16} color={toast.ok ? T.green : T.red} />
              <Text style={[st.toastText, { color: toast.ok ? T.green : T.red }]}>{toast.text}</Text>
            </View>
          ) : null}

          <SearchBox value={search} onChangeText={setSearch} placeholder="Search item…" />

          {loading ? (
            <View style={st.state}>
              <ActivityIndicator size="large" color={T.copper} />
              <Text style={st.stateText}>Loading items and assignments…</Text>
            </View>
          ) : error ? (
            <View style={[st.state, { borderColor: `${T.red}40` }]}>
              <Icon name="error-outline" size={26} color={T.red} />
              <Text style={[st.stateText, { color: T.red }]}>{error}</Text>
              <Btn label="Retry" icon="refresh" compact onPress={() => void load(false)} style={{ marginTop: 10 }} />
            </View>
          ) : stages.length === 0 ? (
            <View style={st.state}>
              <Text style={st.stateText}>No production stages configured.</Text>
            </View>
          ) : wide ? (
            <View style={st.card}>
              <ScrollView horizontal showsHorizontalScrollIndicator bounces={false}>
                <View>
                  <View style={st.trHead}>
                    <Text style={[st.th, { width: 220 }]}>Item</Text>
                    {stages.map((s) => (
                      <Text key={skey(s)} style={[st.th, { width: 132 }]} numberOfLines={1}>{s.StageName}</Text>
                    ))}
                    <Text style={[st.th, { width: 150 }]}>Action</Text>
                  </View>
                  <View style={[st.tr, st.trAll]}>
                    <Text style={[st.itemName, { width: 220, fontWeight: '900' }]}>All items</Text>
                    {stages.map((s) => (
                      <View key={skey(s)} style={{ width: 132, paddingRight: 8 }}>
                        <Box code={ALL} k={skey(s)} placeholder="Not assigned" />
                      </View>
                    ))}
                    <View style={{ width: 150 }}>
                      {busy[ALL] ? <ActivityIndicator size="small" color={T.copper} /> : <Btn label="Apply to all" icon="done-all" compact onPress={() => void applyAll()} />}
                    </View>
                  </View>
                  {shown.map((it, i) => (
                    <View key={it.code} style={[st.tr, i % 2 === 1 && { backgroundColor: T.sub }]}>
                      <View style={{ width: 220, paddingRight: 8 }}>
                        <Text style={st.itemName} numberOfLines={2}>{itemLabel(it)}</Text>
                        <Text style={st.itemCode}>{it.code}</Text>
                      </View>
                      {stages.map((s) => (
                        <View key={skey(s)} style={{ width: 132, paddingRight: 8 }}>
                          <Box code={it.code} k={skey(s)} placeholder="same as above" />
                        </View>
                      ))}
                      <View style={{ width: 150 }}>
                        <RowActions code={it.code} />
                      </View>
                    </View>
                  ))}
                  {shown.length === 0 ? <Text style={st.stateText}>No item found.</Text> : null}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <View style={st.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[st.cardTitle, { flex: 1 }]}>All items</Text>
                  {busy[ALL] ? <ActivityIndicator size="small" color={T.copper} /> : <Btn label="Apply to all" icon="done-all" compact onPress={() => void applyAll()} />}
                </View>
                <View style={st.grid2}>
                  {stages.map((s) => (
                    <View key={skey(s)} style={st.cell2}>
                      <Text style={st.stageLbl}>{s.StageName}</Text>
                      <Box code={ALL} k={skey(s)} placeholder="Not assigned" />
                    </View>
                  ))}
                </View>
              </View>
              {shown.map((it) => (
                <View key={it.code} style={st.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.cardTitle} numberOfLines={2}>{itemLabel(it)}</Text>
                      <Text style={st.itemCode}>{it.code}</Text>
                    </View>
                    <RowActions code={it.code} />
                  </View>
                  <View style={st.grid2}>
                    {stages.map((s) => (
                      <View key={skey(s)} style={st.cell2}>
                        <Text style={st.stageLbl}>{s.StageName}</Text>
                        <Box code={it.code} k={skey(s)} placeholder="same as above" />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              {shown.length === 0 ? <Text style={st.stateText}>No item found.</Text> : null}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 40 },
  content: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  title: { fontFamily: FONT, fontSize: 15, fontWeight: '900', color: T.nav },
  sub: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 10, overflow: 'hidden' },
  cardTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: '900', color: T.nav },
  trHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  th: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase', paddingRight: 8 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  trAll: { backgroundColor: `${T.copper}10` },
  itemName: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.ink },
  itemCode: { fontFamily: FONT, fontSize: 10.5, fontWeight: '600', color: T.muted },
  input: {
    height: 38, borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
    paddingHorizontal: 10, fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.ink,
  },
  inputOn: { borderColor: T.green },
  inputChanged: { borderColor: T.copper, backgroundColor: `${T.copper}10` },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 38 },
  delBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${T.red}40` },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginHorizontal: -4 },
  cell2: { width: '50%', padding: 4 },
  stageLbl: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', marginBottom: 3 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border },
  stateText: { marginTop: 8, fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.muted, textAlign: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: `${T.green}12`, borderWidth: 1, borderColor: `${T.green}40` },
  toastBad: { backgroundColor: `${T.red}0D`, borderColor: `${T.red}40` },
  toastText: { flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: '700' },
});
