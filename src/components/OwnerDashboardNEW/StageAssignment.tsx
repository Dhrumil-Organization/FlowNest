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
import { CONTENT_MAX, SearchBox } from '../erpUi';
import {
  bulkSaveItemStageAssignments,
  deleteItemStageAssignments,
  getItemStageAssignments,
  getStageSetupItems,
  saveItemStageAssignments,
  type AssignItem,
  type AssignStage,
} from './api';
import { FONT } from './fonts';
import { PRP_CODE, stageYearNo } from './prodOrderModel';

type Props = { token: string; API: string; refreshTick?: number };
type Vals = Record<string, string>; // stageKey -> person NAME ('' = not assigned)

const ALL = '__all';
const STR_CODE = '012';
const itemLabel = (i: { code: string; name: string }) => i.name || `Item ${i.code}`;
// table layout needs: item col + N stage cols + action col. Below that the screen switches to cards (no sideways scroll).
const ITEM_W = 200;
const ACT_W = 150;
const STAGE_MIN = 96;
const skey = (s: AssignStage) => `${s.StageId}|${s.StageName}`;
const cleanName = (v: string) => v.replace(/[<>]/g, ''); // letters + numbers both allowed (only < > blocked)
const norm = (v?: string) => (v ?? '').trim().replace(/\s+/g, ' ');
const same = (a: Vals | undefined, b: Vals | undefined, keys: string[]) => keys.every((k) => norm(a?.[k]) === norm(b?.[k]));

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
          (o[r.ItemCode] ||= {})[k] = String(r.PersonName ?? r.PersonId ?? '');
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
    const v = cleanName(raw);
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
      const assignments: { StageId: string; StageName: string; PersonName: string | null }[] = [];
      for (const st of stages) {
        const k = skey(st);
        const now = norm(vals[code]?.[k]);
        const was = norm(orig[code]?.[k]);
        if (now === was) continue;
        assignments.push({ StageId: st.StageId, StageName: st.StageName, PersonName: now === '' ? null : now }); // null = remove
      }
      if (assignments.length) out.push({ ItemCode: it.code, ItemName: it.name, assignments });
    }
    return out;
  };

  const validate = (codes: string[]): string => {
    // names can be letters and/or numbers; nothing to reject on the client (server limits length to 100)
    void codes;
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
        for (const c of codes) n[c] = Object.fromEntries(Object.entries(vals[c] || {}).map(([k, v]) => [k, norm(v as string)]));
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
    const entries = stages.filter((s) => norm(allRow[skey(s)]) !== '');
    if (!entries.length) return say('Enter a person name in the All items row first.', false);
    const names = entries.map((s) => s.StageName).join(', ');
    if (!(await confirmAsk('Apply to all items', `Assign these stages for all ${items.length} items?\n${names}`, 'Apply'))) return;
    setBusy((b) => ({ ...b, [ALL]: true }));
    try {
      const r = await bulkSaveItemStageAssignments(API, token, {
        prpcode: PRP_CODE,
        strcode: STR_CODE,
        assignments: entries.map((s) => ({ StageId: s.StageId, StageName: s.StageName, PersonName: norm(allRow[skey(s)]) })),
      });
      const patch = (cur: Record<string, Vals>) => {
        const n = { ...cur };
        for (const it of items) {
          const row = { ...(n[it.code] || {}) };
          for (const s of entries) row[skey(s)] = norm(allRow[skey(s)]);
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

  const need = ITEM_W + stages.length * STAGE_MIN + ACT_W + 24;
  const wide = width >= need;
  const cols = width >= 640 ? 4 : width >= 420 ? 3 : 2; // stage boxes per row in card layout
  const hasAny = (code: string) => keys.some((k) => norm(orig[code]?.[k]) !== '');

  // NOTE: these are plain render functions (called like box(...)), NOT inner components.
  // An inner component gets a new identity on every render, which remounts the TextInput and drops focus after each key.
  const box = (code: string, k: string, placeholder: string) => {
    const v = (code === ALL ? allRow[k] : vals[code]?.[k]) ?? '';
    const changed = code !== ALL && norm(vals[code]?.[k]) !== norm(orig[code]?.[k]);
    return (
      <TextInput
        value={v}
        onChangeText={(t) => setCell(code, k, t)}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={50}
        returnKeyType="done"
        onSubmitEditing={code === ALL ? undefined : () => void saveCodes([code], 'Row')}
        selectTextOnFocus
        style={[st.input, v !== '' && st.inputOn, changed && st.inputChanged]}
      />
    );
  };

  const rowActions = (code: string) => {
    const b = !!busy[code];
    const d = isDirty(code);
    const any = hasAny(code);
    return (
      <View style={st.actions}>
        {b ? (
          <ActivityIndicator size="small" color={T.copper} />
        ) : (
          <>
            <SmallBtn label={any ? 'Modify' : 'Save'} icon={any ? 'edit' : 'save'} tone={any ? 'outline' : 'copper'} disabled={!d} onPress={() => void saveCodes([code], 'Row')} />
            <TouchableOpacity onPress={() => void removeRow(code)} disabled={!any} style={[st.delBtn, !any && { opacity: 0.35 }]} accessibilityLabel="Delete assignments">
              <Icon name="delete-outline" size={16} color={T.red} />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const applyBtn = busy[ALL] ? <ActivityIndicator size="small" color={T.copper} /> : <SmallBtn label="Apply to all" icon="playlist-add-check" tone="nav" onPress={() => void applyAll()} />;

  return (
    <View style={st.screen}>
      <ScrollView
        contentContainerStyle={st.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[T.copper]} tintColor={T.copper} />}
      >
        <View style={st.content} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <View style={st.head}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={st.title}>Who is responsible for each step</Text>
              <Text style={st.sub}>Fill the first row for everyone. Fill an item row only if that item has a different person.</Text>
            </View>
            <SmallBtn label={`Save all${dirtyCodes.length ? ` (${dirtyCodes.length})` : ''}`} icon="cloud-upload" tone="green" disabled={!dirtyCodes.length || Object.keys(busy).length > 0} onPress={() => void saveCodes(dirtyCodes, 'All changes')} />
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
              <SmallBtn label="Retry" icon="refresh" onPress={() => void load(false)} style={{ marginTop: 10 }} />
            </View>
          ) : stages.length === 0 ? (
            <View style={st.state}>
              <Text style={st.stateText}>No production stages configured.</Text>
            </View>
          ) : wide ? (
            /* ---------- wide: table that fills the width (columns stretch, no sideways scroll) ---------- */
            <View style={st.card}>
              <View style={st.trHead}>
                <Text style={[st.th, { width: ITEM_W }]}>Item</Text>
                {stages.map((s) => (
                  <Text key={skey(s)} style={[st.th, { flex: 1, minWidth: 0 }]} numberOfLines={1}>{s.StageName}</Text>
                ))}
                <Text style={[st.th, { width: ACT_W }]}>Action</Text>
              </View>
              <View style={[st.tr, st.trAll]}>
                <Text style={[st.itemName, { width: ITEM_W, fontWeight: '900' }]}>All items</Text>
                {stages.map((s) => (
                  <View key={skey(s)} style={st.tdStage}>{box(ALL, skey(s), 'Not assigned')}</View>
                ))}
                <View style={{ width: ACT_W }}>{applyBtn}</View>
              </View>
              {shown.map((it, i) => (
                <View key={it.code} style={[st.tr, i % 2 === 1 && { backgroundColor: T.sub }]}>
                  <View style={{ width: ITEM_W, paddingRight: 8 }}>
                    <Text style={st.itemName} numberOfLines={2}>{itemLabel(it)}</Text>
                    <Text style={st.itemCode}>{it.code}</Text>
                  </View>
                  {stages.map((s) => (
                    <View key={skey(s)} style={st.tdStage}>{box(it.code, skey(s), 'same as above')}</View>
                  ))}
                  <View style={{ width: ACT_W }}>{rowActions(it.code)}</View>
                </View>
              ))}
              {shown.length === 0 ? <Text style={st.stateText}>No item found.</Text> : null}
            </View>
          ) : (
            /* ---------- phone / tablet / narrow web: one card per item, stage boxes in a grid ---------- */
            <View style={{ gap: 10 }}>
              <View style={st.card}>
                <View style={st.cardHead}>
                  <Text style={[st.cardTitle, { flex: 1 }]}>All items</Text>
                  {applyBtn}
                </View>
                <View style={st.grid}>
                  {stages.map((s) => (
                    <View key={skey(s)} style={[st.cell, { width: `${100 / cols}%` }]}>
                      <Text style={st.stageLbl} numberOfLines={1}>{s.StageName}</Text>
                      {box(ALL, skey(s), 'Not assigned')}
                    </View>
                  ))}
                </View>
              </View>
              {shown.map((it) => (
                <View key={it.code} style={st.card}>
                  <View style={st.cardHead}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.cardTitle} numberOfLines={2}>{itemLabel(it)}</Text>
                      <Text style={st.itemCode}>{it.code}</Text>
                    </View>
                    {rowActions(it.code)}
                  </View>
                  <View style={st.grid}>
                    {stages.map((s) => (
                      <View key={skey(s)} style={[st.cell, { width: `${100 / cols}%` }]}>
                        <Text style={st.stageLbl} numberOfLines={1}>{s.StageName}</Text>
                        {box(it.code, skey(s), 'same as above')}
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

/* small square-ish button used only on this screen (the shared Btn was too tall/rounded here) */
function SmallBtn({ label, icon, onPress, disabled, style, tone = 'nav' }: { label: string; icon: React.ComponentProps<typeof Icon>['name']; onPress: () => void; disabled?: boolean; style?: any; tone?: 'nav' | 'copper' | 'green' | 'outline' }) {
  const bg = tone === 'copper' ? T.copper : tone === 'green' ? T.green : tone === 'outline' ? T.surface : T.nav;
  const fg = tone === 'outline' ? T.copper : '#fff';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[st.btn, { backgroundColor: bg }, tone === 'outline' && { borderWidth: 1.5, borderColor: T.copper }, !disabled && st.btnShadow, disabled && st.btnOff, style]}
    >
      <Icon name={icon} size={15} color={disabled ? T.muted : fg} />
      <Text style={[st.btnTxt, { color: disabled ? T.muted : fg }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 40 },
  content: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  title: { fontFamily: FONT, fontSize: 15, fontWeight: '900', color: T.nav },
  sub: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
  card: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 10, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: '900', color: T.nav },
  trHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  th: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase', paddingRight: 8 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  trAll: { backgroundColor: `${T.copper}10` },
  tdStage: { flex: 1, minWidth: 0, paddingRight: 8 },
  itemName: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.ink },
  itemCode: { fontFamily: FONT, fontSize: 10.5, fontWeight: '600', color: T.muted },
  // fixed height + NO flex (flex:1 inside a column parent was squashing the box to a thin pill) + small radius = square box
  input: {
    width: '100%', height: 40, minHeight: 40, borderRadius: 4, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
    paddingHorizontal: 10, paddingVertical: 0, fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.ink,
  },
  inputOn: { borderColor: T.green },
  inputChanged: { borderColor: T.copper, backgroundColor: `${T.copper}10` },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { height: 34, paddingHorizontal: 12, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, alignSelf: 'flex-start' },
  btnOff: { backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  btnShadow: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  btnTxt: { fontFamily: FONT, fontSize: 12, fontWeight: '800' },
  delBtn: { width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${T.red}50` },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginHorizontal: -4 },
  cell: { padding: 4 },
  stageLbl: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', marginBottom: 3 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border },
  stateText: { marginTop: 8, fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.muted, textAlign: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: `${T.green}12`, borderWidth: 1, borderColor: `${T.green}40` },
  toastBad: { backgroundColor: `${T.red}0D`, borderColor: `${T.red}40` },
  toastText: { flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: '700' },
});
