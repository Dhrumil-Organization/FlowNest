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
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

type Dialog = { title: string; msg: string; okLabel: string; danger: boolean; open: boolean; res: (ok: boolean) => void };

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
  // in-app confirmation dialog (replaces the browser's native confirm / Alert)
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const askConfirm = (title: string, msg: string, okLabel = 'Delete', danger = true) =>
    new Promise<boolean>((res) => setDialog({ title, msg, okLabel, danger, open: true, res }));
  const closeDialog = (ok: boolean) => {
    dialog?.res(ok);
    setDialog((d) => (d ? { ...d, open: false } : d)); // keep the text/icon so nothing flashes while it closes
  };
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
      let ins = 0, upd = 0, rem = 0;
      for (let i = 0; i < payload.length; i += 200) {
        const r = await saveItemStageAssignments(API, token, { prpcode: PRP_CODE, yearno: stageYearNo(), items: payload.slice(i, i + 200) });
        ins += r.inserted;
        upd += r.updated;
        rem += r.deactivated;
      }
      setOrig((o) => {
        const n = { ...o };
        for (const c of codes) n[c] = Object.fromEntries(Object.entries(vals[c] || {}).map(([k, v]) => [k, norm(v as string)]));
        return n;
      });
      const parts = [ins && `${ins} added`, upd && `${upd} updated`, rem && `${rem} removed`].filter(Boolean);
      say(parts.length ? `${label} saved: ${parts.join(', ')}.` : `${label}: no changes were needed.`);
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
    if (!(await askConfirm('Delete assignments?', `All stage assignments of ${it ? itemLabel(it) : code} will be removed.`))) return;
    setBusy((b) => ({ ...b, [code]: true }));
    try {
      const r = await deleteItemStageAssignments(API, token, { prpcode: PRP_CODE, yearno: stageYearNo(), itemcode: code });
      setOrig((o) => ({ ...o, [code]: {} }));
      setVals((v) => ({ ...v, [code]: {} }));
      say(r.deactivated ? `Assignments deleted (${r.deactivated} stage${r.deactivated > 1 ? 's' : ''} cleared).` : 'Assignments deleted.');
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

  // All items row: typing a name fills that stage in every item on screen (setCell). Nothing is sent until the person
  // clicks Save (every filled stage -> ONE bulk call, every click) or Delete (every assignment of every item removed).
  const filledAll = stages.filter((s) => norm(allRow[skey(s)]) !== '');
  const saveAll = async () => {
    const assignments = filledAll.map((s) => ({ StageId: s.StageId, StageName: s.StageName, PersonName: norm(allRow[skey(s)]) }));
    if (!assignments.length) return say('Fill at least one stage in the All items row first.', false);
    setBusy((b) => ({ ...b, [ALL]: true }));
    try {
      const r = await bulkSaveItemStageAssignments(API, token, { prpcode: PRP_CODE, strcode: STR_CODE, assignments });
      const patch = (cur: Record<string, Vals>) => {
        const n = { ...cur };
        for (const it of items) {
          const row = { ...(n[it.code] || {}) };
          for (const a of filledAll) row[skey(a)] = norm(allRow[skey(a)]);
          n[it.code] = row;
        }
        return n;
      };
      setOrig(patch);
      setVals(patch);
      say(`Saved for all items: ${r.inserted} added, ${r.updated} updated (${assignments.length} stage${assignments.length > 1 ? 's' : ''}).`);
    } catch (e: any) {
      say(e?.message || 'Could not save for all items.', false);
    } finally {
      setBusy((b) => {
        const n = { ...b };
        delete n[ALL];
        return n;
      });
    }
  };

  const deleteAll = async () => {
    const targets = items.filter((it) => hasAny(it.code));
    if (!targets.length) return say('There is nothing to delete.', false);
    if (!(await askConfirm('Delete everything?', `Stage assignments of all ${targets.length} item${targets.length > 1 ? 's' : ''} will be removed.`, 'Delete all'))) return;
    setBusy((b) => ({ ...b, [ALL]: true }));
    try {
      let removed = 0;
      const payload = targets.map((it) => ({
        ItemCode: it.code,
        ItemName: it.name,
        assignments: stages.filter((s) => norm(orig[it.code]?.[skey(s)]) !== '').map((s) => ({ StageId: s.StageId, StageName: s.StageName, PersonName: null })),
      }));
      for (let i = 0; i < payload.length; i += 200) {
        const r = await saveItemStageAssignments(API, token, { prpcode: PRP_CODE, yearno: stageYearNo(), items: payload.slice(i, i + 200) });
        removed += r.deactivated;
      }
      setOrig({});
      setVals({});
      setAllRow({});
      say(`Everything deleted (${removed} assignment${removed === 1 ? '' : 's'} removed).`);
    } catch (e: any) {
      say(e?.message || 'Delete failed.', false);
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
  // names already used anywhere (all stages / all items): offered as a dropdown when a box is focused
  const nameList = useMemo(() => {
    const seen = new Map<string, string>();
    const add = (v?: string) => {
      const n = norm(v);
      if (n && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n);
    };
    Object.values(orig).forEach((row) => Object.values(row || {}).forEach(add));
    Object.values(vals).forEach((row) => Object.values(row || {}).forEach(add));
    Object.values(allRow).forEach(add);
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [orig, vals, allRow]);
  const [focus, setFocus] = useState<{ code: string; key: string } | null>(null);
  const blurTimer = useRef<any>(null);
  const box = (code: string, k: string, placeholder: string) => {
    const v = (code === ALL ? allRow[k] : vals[code]?.[k]) ?? '';
    const changed = code !== ALL && norm(vals[code]?.[k]) !== norm(orig[code]?.[k]);
    const isFocus = focus?.code === code && focus?.key === k;
    const q = norm(v).toLowerCase();
    const options = isFocus ? nameList.filter((n) => n.toLowerCase() !== q && n.toLowerCase().includes(q)).slice(0, 8) : [];
    return (
      <View style={{ position: 'relative', zIndex: isFocus ? 50 : 0 }}>
      <TextInput
        value={v}
        onChangeText={(t) => setCell(code, k, t)}
        onFocus={() => {
          clearTimeout(blurTimer.current);
          setFocus({ code, key: k });
        }}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={50}
        returnKeyType="done"
        onSubmitEditing={() => (code === ALL ? void saveAll() : void saveCodes([code], 'Row'))}
        onBlur={() => {
          clearTimeout(blurTimer.current);
          blurTimer.current = setTimeout(() => setFocus((f) => (f?.code === code && f?.key === k ? null : f)), 200);
        }}
        selectTextOnFocus
        style={[st.input, v !== '' && st.inputOn, changed && st.inputChanged]}
      />
      {options.length ? (
        <View style={st.dd}>
          {options.map((n) => (
            <TouchableOpacity
              key={n}
              style={st.ddItem}
              activeOpacity={0.7}
              onPress={() => {
                setCell(code, k, n);
                setFocus(null);
              }}
            >
              <Text style={st.ddTxt} numberOfLines={1}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      </View>
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

  const anyAssigned = items.some((it) => hasAny(it.code));
  // Clear everything: throws away whatever is typed but not saved (no API call). Saved values stay as they are.
  const hasTyped = dirtyCodes.length > 0 || Object.values(allRow).some((v) => norm(v) !== '');
  const canClear = hasTyped;
  const clearTyped = () => {
    setVals({ ...orig });
    setAllRow({});
    setFocus(null);
    say('Unsaved changes cleared.');
  };
  const allBusy = !!busy[ALL];
  const applyBtn = allBusy ? (
    <View style={st.autoNote}>
      <ActivityIndicator size="small" color={T.copper} />
      <Text style={st.autoTxt}>Working…</Text>
    </View>
  ) : (
    <View style={st.actions}>
      <SmallBtn label="Save" icon="save" tone="copper" disabled={!filledAll.length} onPress={() => void saveAll()} />
      <TouchableOpacity onPress={() => void deleteAll()} disabled={!anyAssigned} style={[st.delBtn, !anyAssigned && { opacity: 0.35 }]} accessibilityLabel="Delete everything">
        <Icon name="delete-outline" size={16} color={T.red} />
      </TouchableOpacity>
    </View>
  );


  return (
    <View style={st.screen}>
      <ScrollView
        contentContainerStyle={st.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[T.copper]} tintColor={T.copper} />}
      >
        <View style={st.content} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <View style={st.head}>
            <View style={st.headIcon}>
              <Icon name="assignment-ind" size={20} color={T.copper} />
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={st.title}>Who is responsible for each step</Text>
              <Text style={st.sub}>Fill the first row to set every item, then click Save. Change an item row only if that item has a different person.</Text>
            </View>
            <TouchableOpacity
              onPress={clearTyped}
              disabled={!canClear || allBusy}
              activeOpacity={0.8}
              style={[st.clearBtn, (!canClear || allBusy) && { opacity: 0.4 }]}
              accessibilityLabel="Clear everything"
            >
              <Icon name="backspace" size={16} color={T.red} />
              <Text style={st.clearTxt}>Clear everything</Text>
            </TouchableOpacity>
            {dirtyCodes.length ? (
              <View style={st.pendingPill}>
                <View style={st.pendingDot} />
                <Text style={st.pendingText}>{dirtyCodes.length} unsaved</Text>
              </View>
            ) : null}
          </View>

          {toast ? (
            <View style={[st.toast, !toast.ok && st.toastBad]}>
              <Icon name={toast.ok ? 'check-circle' : 'error-outline'} size={16} color={toast.ok ? T.green : T.red} />
              <Text style={[st.toastText, { color: toast.ok ? T.green : T.red }]}>{toast.text}</Text>
            </View>
          ) : null}

          <View style={st.searchRow}>
            <SearchBox value={search} onChangeText={setSearch} placeholder="Search item…" style={{ flex: 1, minWidth: 0 }} />
            {!loading && !error && stages.length ? (
              <Text style={st.countText}>{shown.length === items.length ? `${items.length} items` : `${shown.length} of ${items.length}`}</Text>
            ) : null}
          </View>

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
            <View style={[st.card, { padding: 0, overflow: 'visible' }]}>
              <View style={st.trHead}>
                <Text style={[st.th, { width: ITEM_W }]}>Item</Text>
                {stages.map((s) => (
                  <Text key={skey(s)} style={[st.th, { flex: 1, minWidth: 0 }]} numberOfLines={1}>{s.StageName}</Text>
                ))}
                <Text style={[st.th, { width: ACT_W }]}>Action</Text>
              </View>
              <View style={[st.tr, st.trAll, focus?.code === ALL && { zIndex: 40 }]}>
                <View style={{ width: ITEM_W, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="groups" size={16} color={T.copper} />
                  <Text style={[st.itemName, { fontWeight: '900' }]}>All items</Text>
                </View>
                {stages.map((s) => (
                  <View key={skey(s)} style={st.tdStage}>{box(ALL, skey(s), 'Not assigned')}</View>
                ))}
                <View style={{ width: ACT_W }}>{applyBtn}</View>
              </View>
              {shown.map((it, i) => (
                <View key={it.code} style={[st.tr, i % 2 === 1 && { backgroundColor: T.sub }, focus?.code === it.code && { zIndex: 40 }]}>
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
              <View style={[st.card, { overflow: 'visible' }, focus?.code === ALL && { zIndex: 40 }]}>
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
                <View key={it.code} style={[st.card, { overflow: 'visible' }, focus?.code === it.code && { zIndex: 40 }]}>
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

      <Modal visible={!!dialog?.open} transparent animationType="none" onRequestClose={() => closeDialog(false)}>
        <Pressable style={st.overlay} onPress={() => closeDialog(false)}>
          <Pressable style={st.dlg} onPress={() => {}}>
            <View style={st.dlgIcon}>
              <Icon name="delete-outline" size={26} color={T.red} />
            </View>
            <Text style={st.dlgTitle}>{dialog?.title}</Text>
            <Text style={st.dlgMsg}>{dialog?.msg}</Text>
            <View style={st.dlgBtns}>
              <TouchableOpacity style={[st.dlgBtn, st.dlgCancel]} onPress={() => closeDialog(false)} activeOpacity={0.8}>
                <Text style={st.dlgCancelTx}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.dlgBtn, { backgroundColor: dialog?.danger ? T.red : T.nav }]} onPress={() => closeDialog(true)} activeOpacity={0.85}>
                <Text style={st.dlgOkTx}>{dialog?.okLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12 },
  headIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.copper}14` },
  pendingPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: `${T.copper}14`, borderWidth: 1, borderColor: `${T.copper}40` },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.copper },
  pendingText: { fontFamily: FONT, fontSize: 11.5, fontWeight: '800', color: T.copper },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countText: { fontFamily: FONT, fontSize: 11.5, fontWeight: '700', color: T.muted },
  title: { fontFamily: FONT, fontSize: 15.5, fontWeight: '900', color: T.nav },
  sub: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: '900', color: T.nav },
  trHead: { borderTopLeftRadius: 11, borderTopRightRadius: 11, flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, backgroundColor: T.nav },
  th: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase', paddingRight: 8 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: T.hair },
  trAll: { backgroundColor: `${T.copper}10` },
  tdStage: { flex: 1, minWidth: 0, paddingRight: 8 },
  itemName: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.ink },
  itemCode: { fontFamily: FONT, fontSize: 10.5, fontWeight: '600', color: T.muted },
  // fixed height + NO flex (flex:1 inside a column parent was squashing the box to a thin pill) + small radius = square box
  input: {
    width: '100%', height: 38, minHeight: 38, borderRadius: 6, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
    paddingHorizontal: 10, paddingVertical: 0, fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.ink,
  },
  inputOn: { borderColor: T.green },
  inputChanged: { borderColor: T.copper, backgroundColor: `${T.copper}10` },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: T.red, backgroundColor: T.surface },
  clearTxt: { fontFamily: FONT, fontSize: 12.5, fontWeight: '800', color: T.red },
  dd: { position: 'absolute', top: 42, left: 0, right: 0, minWidth: 150, backgroundColor: T.surface, borderRadius: 8, borderWidth: 1, borderColor: T.border, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8, zIndex: 60 },
  ddItem: { paddingHorizontal: 12, paddingVertical: 9 },
  ddTxt: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.ink },
  overlay: { flex: 1, backgroundColor: 'rgba(10,18,32,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dlg: { width: '100%', maxWidth: 380, backgroundColor: T.surface, borderRadius: 16, padding: 22, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  dlgIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.red}14`, marginBottom: 12 },
  dlgTitle: { fontFamily: FONT, fontSize: 17, fontWeight: '900', color: T.nav, textAlign: 'center' },
  dlgMsg: { fontFamily: FONT, fontSize: 13.5, fontWeight: '600', color: T.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  dlgBtns: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  dlgBtn: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dlgCancel: { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border },
  dlgCancelTx: { fontFamily: FONT, fontSize: 13.5, fontWeight: '800', color: T.nav },
  dlgOkTx: { fontFamily: FONT, fontSize: 13.5, fontWeight: '800', color: '#fff' },
  autoNote: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  autoTxt: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: T.copper },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { height: 34, paddingHorizontal: 12, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, alignSelf: 'flex-start' },
  btnOff: { backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  btnShadow: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  btnTxt: { fontFamily: FONT, fontSize: 12, fontWeight: '800' },
  delBtn: { width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${T.red}50` },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginHorizontal: -4 },
  cell: { padding: 4 },
  stageLbl: { fontFamily: FONT, fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border },
  stateText: { marginTop: 8, fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.muted, textAlign: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: `${T.green}12`, borderWidth: 1, borderColor: `${T.green}40` },
  toastBad: { backgroundColor: `${T.red}0D`, borderColor: `${T.red}40` },
  toastText: { flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: '700' },
});
