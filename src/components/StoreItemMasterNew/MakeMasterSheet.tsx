// FILE: src/components/StoreItemMasterNew/MakeMasterSheet.tsx
// Make / Model MASTER dialog — add / rename / delete the global make & model records
// (DAPMake) straight from "Add make", exactly like Color Item Master's inline masters
// (Purchase UOM, Sales UOM, Fibre, Dye Brand ...): a small form on top, a browse list below,
// list refreshed from the server after every write.
//
// One list row = one Make + one Model (composite key MakCode + SrNo).
//   • type a NEW make name            -> add-data with MakCode 0 (server assigns the next code)
//   • type an EXISTING make name      -> add-data with that MakCode + SrNo 0 (a new model under it)
//   • tap a list row                  -> edit mode -> modify-data (renaming the make renames all its models)
//   • trash icon on a row             -> delete-data (after confirmation)
// The server's own message (success or error) is shown inside the dialog.
import { AppAlert } from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import {
  addMakeMaster,
  deleteMakeMaster,
  deleteModelMaster,
  fetchMakeMasterList,
  fetchMakeMasterNextCode,
  MakeMasterInput,
  MakeMasterRow,
  MakeModelOption,
  modifyMakeMaster,
  toMakeOption,
} from './api';
import { Scope } from './model';
import { Banner, Btn, Field, SearchBox, SelectField, Sheet } from './ui';

type Form = { makeCode: string; makeName: string; shortName: string; status: string; model: string; srNo: number };
const EMPTY: Form = { makeCode: '', makeName: '', shortName: '', status: 'A', model: '', srNo: 0 };
const up = (v: string) => String(v ?? '').trim().toUpperCase();
const sameRow = (a: { makeCode: string; srNo: number }, b: { makeCode: string; srNo: number }) =>
  String(a.makeCode) === String(b.makeCode) && Number(a.srNo) === Number(b.srNo);
const errText = (e: any, fallback: string) => e?.message || fallback;

export default function MakeMasterSheet({
  API,
  token,
  scope,
  onClose,
  onChanged,
  onPick,
}: {
  API: string;
  token: string;
  scope: Scope;
  onClose: () => void;
  /** Fresh make/model options after every successful add / update / delete. */
  onChanged: (options: MakeModelOption[]) => void;
  /** The row that was just added / updated — the Make sheet selects it. */
  onPick: (option: MakeModelOption) => void;
}) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isPhone = viewportWidth < 420;
  // Preferred height of the model list; it is further capped to the space really available inside the sheet.
  const modelListHeight = Math.max(140, Math.min(280, Math.round(viewportHeight * (isPhone ? 0.30 : 0.34))));
  const [rows, setRows] = useState<MakeMasterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  // 'make' = edit opened from the make grid (make fields only, model field stays empty); 'model' = a specific model row
  const [editKind, setEditKind] = useState<'make' | 'model'>('model');
  const [nextCode, setNextCode] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [qInput, setQInput] = useState(''); // what the person is typing (input stays instant)
  const [q, setQ] = useState('');           // what the grid filters by (debounced, so typing never freezes the grid)
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 250);
    return () => clearTimeout(t);
  }, [qInput]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  // Position of the dropdown RELATIVE to the sheet body (not the window) — measured on open / resize.
  const [modelDropdownPosition, setModelDropdownPosition] = useState({ top: 0, left: 0, width: 320, maxHeight: 240 });
  const modelFieldRef = useRef<View>(null);
  const bodyRef = useRef<View>(null);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /* ------------------------------ loading ------------------------------ */
  const loadNextCode = useCallback(async () => {
    try {
      const code = await fetchMakeMasterNextCode(API, token, scope);
      if (alive.current) setNextCode(code);
    } catch {
      if (alive.current) setNextCode(''); // not fatal — add-data assigns the code
    }
  }, [API, token, scope]);

  const reload = useCallback(async () => {
    const list = await fetchMakeMasterList(API, token, scope);
    if (alive.current) setRows(list);
    return list;
  }, [API, token, scope]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([reload(), loadNextCode()]);
      } catch (e: any) {
        if (alive.current) setError(errText(e, 'Could not load the make / model list.'));
      } finally {
        if (alive.current) setLoading(false);
      }
    })();
  }, [reload, loadNextCode]);

  /* ----------------------------- derived data ---------------------------- */
  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.makeName.localeCompare(b.makeName, undefined, { numeric: true }) || a.model.localeCompare(b.model, undefined, { numeric: true })),
    [rows],
  );
  // Group rows only when API data changes, not on every search keystroke.
  const groups = useMemo(() => {
    const grouped = new Map<string, { makeCode: string; makeName: string; rows: MakeMasterRow[]; rowText: string[]; totalModels: number; searchText: string }>();
    sorted.forEach((r) => {
      const key = String(r.makeCode || r.makeName);
      let group = grouped.get(key);
      if (!group) {
        group = { makeCode: r.makeCode, makeName: r.makeName, rows: [], rowText: [], totalModels: 0, searchText: `${r.makeCode} ${r.makeName}`.toLowerCase() };
        grouped.set(key, group);
      }
      group.rows.push(r);
      group.rowText.push(`${r.model} ${r.srNo}`.toLowerCase());
      if (r.model.trim()) group.totalModels += 1;
      group.searchText += ` ${r.shortName || ''} ${r.status || ''}`.toLowerCase();
    });
    return Array.from(grouped.values());
  }, [sorted]);

  // Searching a make shows its parent row collapsed first, avoiding a large child-row render.
  // Searching a model shows only matching model rows beneath their parent.
  const visibleGroups = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return groups.map((g) => ({ ...g, matchedMake: false }));
    const result: Array<(typeof groups)[number] & { matchedMake: boolean }> = [];
    groups.forEach((g) => {
      if (g.searchText.includes(n)) {
        result.push({ ...g, matchedMake: true });
        return;
      }
      const idx: number[] = [];
      for (let i = 0; i < g.rowText.length; i++) if (g.rowText[i].includes(n)) idx.push(i);
      if (idx.length) result.push({ ...g, rows: idx.map((i) => g.rows[i]), rowText: idx.map((i) => g.rowText[i]), matchedMake: false });
    });
    return result;
  }, [groups, q]);

  const toggleExpanded = (code: string) => setExpandedCodes((prev) => {
    const next = new Set(prev);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });

  // typing a make name that already exists = adding another model to that make
  const existingMake = mode === 'add' && form.makeName.trim() ? rows.find((r) => up(r.makeName) === up(form.makeName)) : undefined;
  const shownCode = mode === 'edit' ? form.makeCode : existingMake ? existingMake.makeCode : nextCode;
  const modelOptions = useMemo(() => {
    const makeName = up(form.makeName);
    if (!makeName) return [];
    return rows.filter((r) => up(r.makeName) === makeName && !!r.model.trim())
      .sort((a, b) => a.model.localeCompare(b.model, undefined, { numeric: true }));
  }, [rows, form.makeName]);


  /* --------------------- model dropdown (overlay) ---------------------- */
  // The list is an ABSOLUTE layer rendered as the LAST child of the sheet body, so it paints above the
  // make grid (DOM order + zIndex) and never takes part in layout: the grid keeps its full height.
  // No nested <Modal>: on web a nested Modal is not guaranteed to stack above its parent sheet.
  const measureModelDropdown = useCallback(() => {
    const field = modelFieldRef.current as any;
    const body = bodyRef.current as any;
    if (!field?.measureInWindow || !body?.measureInWindow) return;
    body.measureInWindow((bx: number, by: number, bw: number, bh: number) => {
      field.measureInWindow((fx: number, fy: number, fw: number, fh: number) => {
        if (!alive.current) return;
        const top = fy - by + fh + 4;
        const room = bh - top - 8;
        const left = Math.max(0, Math.min(fx - bx, bw - Math.min(fw, bw)));
        const maxHeight = Math.max(110, Math.min(modelListHeight, room));
        // not enough room below the field (tiny screens) -> open above it instead
        const flipUp = room < 130 && fy - by > room;
        const h = flipUp ? Math.max(110, Math.min(modelListHeight, fy - by - 8)) : maxHeight;
        setModelDropdownPosition({ top: flipUp ? Math.max(4, fy - by - h - 4) : top, left, width: Math.min(fw, bw), maxHeight: h });
      });
    });
  }, [modelListHeight]);

  const openModelDropdown = useCallback(() => {
    measureModelDropdown();
    setModelDropdownOpen(true);
  }, [measureModelDropdown]);

  // keep the overlay glued to the field when the window / device orientation changes
  useEffect(() => {
    if (modelDropdownOpen) measureModelDropdown();
  }, [modelDropdownOpen, viewportWidth, viewportHeight, measureModelDropdown]);

  // typing in "Model name" filters the list; an exact match shows everything again
  const filteredModelOptions = useMemo(() => {
    const n = form.model.trim().toLowerCase();
    if (!n) return modelOptions;
    if (modelOptions.some((o) => o.model.trim().toLowerCase() === n)) return modelOptions;
    return modelOptions.filter((o) => o.model.toLowerCase().includes(n));
  }, [modelOptions, form.model]);

  const pickModel = useCallback((option: MakeMasterRow) => {
    setForm((p) => ({ ...p, makeCode: option.makeCode, makeName: option.makeName, shortName: option.shortName || p.shortName, status: option.status || p.status, model: option.model, srNo: option.srNo }));
    setMode('edit');
    setEditKind('model');
    setModelDropdownOpen(false);
    setError('');
  }, []);

  /* ------------------------------- actions ------------------------------- */
  const resetForm = () => {
    setForm(EMPTY);
    setMode('add');
    setEditKind('model');
    setError('');
  };

  /** Pencil on a make row of the grid: load the MAKE only — model stays empty, nothing is pre-selected in the model list. */
  const startEditMake = (r: MakeMasterRow) => {
    setForm({ makeCode: r.makeCode, makeName: r.makeName, shortName: r.shortName || '', status: r.status || 'A', model: '', srNo: 0 });
    setMode('edit');
    setEditKind('make');
    setModelDropdownOpen(false);
    setError('');
    setDone('');
  };

  /** Pencil on a model inside the model dropdown: load that exact model. */
  const startEdit = (r: MakeMasterRow) => {
    setForm({ makeCode: r.makeCode, makeName: r.makeName, shortName: r.shortName || '', status: r.status || 'A', model: r.model, srNo: r.srNo });
    setMode('edit');
    setEditKind('model');
    setError('');
    setDone('');
  };

  /** After a write: reload from the server, tell the Make sheet, select the touched row. */
  const afterWrite = async (message: string, target: (r: MakeMasterRow) => boolean, fallback: string) => {
    const fresh = await reload();
    if (!alive.current) return;
    onChanged(fresh.map(toMakeOption));
    const hit = fresh.find(target);
    if (hit) onPick(toMakeOption(hit));
    setDone(message || fallback);
    resetForm();
    void loadNextCode();
  };

  /** Several models can be typed in one go, separated by comma / semicolon / new line. */
  const parsedModels = useMemo(
    () => Array.from(new Set(form.model.split(/[,;\n]+/).map(up).filter(Boolean))),
    [form.model],
  );

  const submit = async () => {
    if (busy) return;
    const name = up(form.makeName);
    if (!name) return setError('Enter the make name.');

    // ---------------------------- ADD (one or many models) ----------------------------
    if (mode === 'add') {
      const list = parsedModels.length ? parsedModels : [''];
      const dup = list.find((mdl) => rows.some((r) => up(r.makeName) === name && up(r.model) === mdl));
      if (dup !== undefined) return setError(`${name}${dup ? ` — ${dup}` : ''} already exists.`);

      setBusy(true);
      setError('');
      setDone('');
      let added = 0;
      try {
        // Existing make  -> its own MakCode.  Brand-new make -> next MakCode from show-data (re-read right before saving).
        let code = existingMake ? existingMake.makeCode : nextCode;
        if (!existingMake) {
          try { code = (await fetchMakeMasterNextCode(API, token, scope)) || nextCode; } catch { /* keep the code already shown */ }
        }
        const makeCode = String(Number(code) > 0 ? code : '0');
        // SrNo: first model of a new make = 1; under an existing make = highest SrNo + 1; then +1 for every extra model.
        const lastSrNo = existingMake ? Math.max(0, ...rows.filter((r) => String(r.makeCode) === String(existingMake.makeCode)).map((r) => Number(r.srNo) || 0)) : 0;
        // ONE add-data call; payload.models = [ {PrpCode, MakCode, SrNo, Model}, ... ] holds every model.
        const modelsPayload = list.map((mdl, i) => ({ model: mdl, srNo: lastSrNo + 1 + i }));
        const msg = await addMakeMaster(API, token, scope, { makeCode, makeName: name, shortName: form.shortName, status: form.status, model: modelsPayload[0].model, srNo: modelsPayload[0].srNo, models: modelsPayload });
        added = list.length;
        const fresh = await reload();
        if (!alive.current) return;
        onChanged(fresh.map(toMakeOption));
        const hit = fresh.find((r) => up(r.makeName) === name && up(r.model) === list[list.length - 1]);
        if (hit) onPick(toMakeOption(hit));
        setDone(list.length > 1 ? `${list.length} models added to ${name}. Type the next model to add more.` : (msg || 'Saved.') + ' Type the next model to add more.');
        // KEEP the make, clear only the model -> the next model goes under the same make with the next SrNo.
        setForm((p) => ({ ...EMPTY, makeName: name, shortName: p.shortName, status: p.status }));
        void loadNextCode();
      } catch (e: any) {
        if (alive.current) {
          setError(errText(e, 'Could not save the make.'));
          void reload().then((l) => alive.current && onChanged(l.map(toMakeOption))).catch(() => undefined);
        }
      } finally {
        if (alive.current) setBusy(false);
      }
      return;
    }

    // ------------------------------ EDIT / UPDATE ------------------------------
    // ONE modify-data call. payload.models = [ {PrpCode, MakCode, SrNo, Model}, ... ] carries EVERY model of this make
    // (existing ones unchanged) + any new model typed in "Model name" (SrNo = last + 1, +2 ...).
    //   editKind 'make'  : existing models as they are + new models typed in the model field.
    //   editKind 'model' : existing models, with the picked model renamed to what is typed.
    const isMakeEdit = editKind === 'make';
    const makeRows = rows.filter((r) => String(r.makeCode) === String(form.makeCode));
    const lastSr = Math.max(0, ...makeRows.map((r) => Number(r.srNo) || 0));

    let list: Array<{ model: string; srNo: number }>;
    if (isMakeEdit) {
      const existing = makeRows.filter((r) => r.model.trim()).map((r) => ({ model: r.model, srNo: Number(r.srNo) || 0 }));
      const fresh = parsedModels;
      const dupNew = fresh.find((mdl) => makeRows.some((r) => up(r.model) === mdl));
      if (dupNew !== undefined) return setError(`${name} — ${dupNew} already exists.`);
      list = [...existing, ...fresh.map((mdl, i) => ({ model: mdl, srNo: lastSr + 1 + i }))];
    } else {
      const model = up(form.model);
      const clash = rows.some((r) => up(r.makeName) === name && up(r.model) === model && !sameRow(r, form));
      if (clash) return setError(`${name}${model ? ` — ${model}` : ''} already exists.`);
      list = makeRows.filter((r) => r.model.trim() || sameRow(r, form)).map((r) => ({ model: sameRow(r, form) ? model : r.model, srNo: Number(r.srNo) || 0 }));
    }
    if (!list.length) list = [{ model: '', srNo: Number(makeRows[0]?.srNo) || 0 }]; // a make that has no model yet

    setBusy(true);
    setError('');
    setDone('');
    try {
      const msg = await modifyMakeMaster(API, token, scope, {
        makeCode: form.makeCode, makeName: name, shortName: form.shortName, status: form.status,
        model: list[0].model, srNo: list[0].srNo, models: list,
      });
      const added = isMakeEdit ? parsedModels.length : 0;
      await afterWrite(added ? `${msg || 'Make updated.'} ${added} new model${added > 1 ? 's' : ''} added.` : msg, (r) => String(r.makeCode) === String(form.makeCode), 'Make updated.');
    } catch (e: any) {
      if (alive.current) {
        setError(errText(e, 'Could not save the make.'));
        void reload().then((l) => alive.current && onChanged(l.map(toMakeOption))).catch(() => undefined);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const remove = (r: MakeMasterRow) => {
    if (busy) return;
    AppAlert.alert('Delete make / model?', `${r.makeName}${r.model ? ` — ${r.model}` : ''} will be removed from the make master.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          setError('');
          setDone('');
          try {
            const msg = await deleteModelMaster(API, token, scope, { makeCode: r.makeCode, makeName: r.makeName, shortName: r.shortName, status: r.status, model: r.model, srNo: r.srNo });
            const fresh = await reload();
            if (!alive.current) return;
            onChanged(fresh.map(toMakeOption));
            setDone(msg || 'Make deleted.');
            if (mode === 'edit' && sameRow(r, form)) resetForm();
            void loadNextCode();
          } catch (e: any) {
            if (alive.current) setError(errText(e, 'Could not delete the make.'));
          } finally {
            if (alive.current) setBusy(false);
          }
        },
      },
    ]);
  };

  const removeMake = (makeCode: string, makeName: string) => {
    if (busy) return;
    const makeRows = rows.filter((r) => String(r.makeCode) === String(makeCode));
    AppAlert.alert('Delete make?', `Delete ${makeName} and its ${makeRows.length} model record(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusy(true); setError(''); setDone('');
        try {
          await deleteMakeMaster(API, token, scope, {
            makeCode, makeName, shortName: '', status: 'A', model: '', srNo: 0,
          });
          const fresh = await reload();
          if (!alive.current) return;
          onChanged(fresh.map(toMakeOption));
          if (String(form.makeCode) === String(makeCode)) resetForm();
          setDone(`${makeName} deleted.`);
          void loadNextCode();
        } catch (e: any) {
          if (alive.current) setError(errText(e, 'Could not delete the make.'));
          void reload().catch(() => undefined);
        } finally { if (alive.current) setBusy(false); }
      }},
    ]);
  };

  /* -------------------------------- render ------------------------------- */
  // Wide screens: one line per row. Phones / narrow tablets: two lines, so no label is ever cut off.
  const wideGrid = viewportWidth >= 700;
  // ONE column spec shared by the header row and every data row, so labels always sit exactly over their values.
  const ACT_W = 44;
  const COL = {
    toggle: { width: 22 },
    code: { width: 70 },
    name: { flex: 1.5, minWidth: 0 },
    short: { flex: 0.9, minWidth: 0 },
    status: { width: 70 },
    acts: { width: ACT_W * 2, flexDirection: 'row' as const },
    mCode: { width: 80 },
    mMake: { flex: 1, minWidth: 0 },
    mModel: { flex: 2, minWidth: 0 },
  };
  const ROW_GAP = 12;
  const HEAD = { fontSize: 10.5, fontWeight: '800', color: T.muted } as const;
  const LBL = { fontSize: isPhone ? 10 : 10.5, fontWeight: '700', color: T.muted, marginBottom: 2 } as const;
  const VAL = { fontSize: isPhone ? 12 : 12.5, color: T.ink } as const;

  // NOTE: these are plain helper FUNCTIONS (not components). Defining components inside render makes React
  // remount every cell on every render — that was the main reason expand / search felt stuck.
  const cell = (label: string, child: React.ReactNode, style?: any) => (
    <View style={[{ minWidth: 0, justifyContent: 'center' }, style]}>
      <Text style={LBL}>{label}</Text>
      {child}
    </View>
  );
  const iconAct = (label: string, icon: string, color: string, onPress: () => void, compact: boolean, disabled?: boolean) => (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={{ minWidth: compact ? ACT_W : 40, width: compact ? ACT_W : undefined, height: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      {compact ? null : <Text style={{ ...LBL, marginBottom: 0 }}>{label.split(' ')[0]}</Text>}
      <Icon name={icon as any} size={18} color={color} />
    </Pressable>
  );
  const statusEl = (s: string) => <Text style={{ ...VAL, fontWeight: '700', color: s === 'A' ? '#16803D' : T.red }}>{s === 'A' ? 'Active' : 'Inactive'}</Text>;

  // ONE flat, virtualized list (make rows + their model rows). Expanding a make with thousands of models
  // no longer renders them all at once — only what is on screen.
  type Flat =
    | { k: 'g'; id: string; g: (typeof visibleGroups)[number]; open: boolean }
    | { k: 'h'; id: string }
    | { k: 'm'; id: string; r: MakeMasterRow };
  const flatRows = useMemo<Flat[]>(() => {
    const out: Flat[] = [];
    for (const g of visibleGroups) {
      const code = String(g.makeCode || g.makeName);
      // a make opens ONLY when the user expands it (search results stay collapsed)
      const open = expandedCodes.has(code);
      out.push({ k: 'g', id: `g-${code}`, g, open });
      if (open) {
        if (wideGrid) out.push({ k: 'h', id: `h-${code}` });
        for (const r of g.rows) out.push({ k: 'm', id: `m-${code}-${r.key}`, r });
      }
    }
    return out;
  }, [visibleGroups, expandedCodes, wideGrid]);

  const renderGroupRow = (item: (typeof visibleGroups)[number], expanded: boolean) => {
    const code = String(item.makeCode || item.makeName);
    const selected = mode === 'edit' && String(form.makeCode) === String(item.makeCode);
    const first = item.rows[0];
    const actions = (
      <View style={{ flexDirection: 'row' }}>
        {iconAct('Edit make', 'edit', T.muted, () => startEditMake(first), wideGrid)}
        {iconAct('Delete make', 'delete-outline', T.red, () => removeMake(item.makeCode, item.makeName), wideGrid, busy)}
      </View>
    );
    return (
      <View style={{ borderBottomWidth: 1, borderBottomColor: T.hair }}>
        <Pressable
          onPress={() => toggleExpanded(code)}
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${item.makeName}, ${item.totalModels} models`}
          style={(st: any) => [
            { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: selected ? `${T.copper}12` : T.surface },
            st.hovered && { backgroundColor: T.alt },
          ]}
        >
          {wideGrid ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ROW_GAP }}>
              <View style={COL.toggle}><Icon name={expanded ? 'keyboard-arrow-down' : 'keyboard-arrow-right'} size={22} color={T.copper} /></View>
              <View style={COL.code}><Text style={{ ...VAL, color: T.muted }} numberOfLines={1}>{item.makeCode}</Text></View>
              <View style={COL.name}>
                <Text style={{ ...VAL, fontWeight: '800' }} numberOfLines={1}>{item.makeName || '—'}</Text>
                <Text style={{ fontSize: 10.5, color: T.muted }}>{item.totalModels} models</Text>
              </View>
              <View style={COL.short}><Text style={VAL} numberOfLines={1}>{first?.shortName || '—'}</Text></View>
              <View style={COL.status}>{statusEl(first?.status)}</View>
              <View style={COL.acts}>{actions}</View>
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name={expanded ? 'keyboard-arrow-down' : 'keyboard-arrow-right'} size={22} color={T.copper} />
                {cell('Make name', (
                  <>
                    <Text style={{ ...VAL, fontSize: 13.5, fontWeight: '800' }} numberOfLines={2}>{item.makeName || '—'}</Text>
                    <Text style={{ fontSize: 10.5, color: T.muted }}>{item.totalModels} models</Text>
                  </>
                ), { flex: 1 })}
                {actions}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 6, paddingLeft: 28 }}>
                {cell('Make code', <Text style={{ ...VAL, color: T.muted }}>{item.makeCode}</Text>)}
                {cell('Short name', <Text style={VAL}>{first?.shortName || '—'}</Text>)}
                {cell('Status', statusEl(first?.status))}
              </View>
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  // model rows: NO status column
  const renderModelRow = (r: MakeMasterRow) => (
    <View style={{ backgroundColor: T.sub, borderTopWidth: 1, borderTopColor: T.hair, paddingVertical: 8, paddingRight: 10, paddingLeft: wideGrid ? 44 : 38 }}>
      {wideGrid ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ROW_GAP }}>
          <View style={COL.mCode}><Text style={{ ...VAL, color: T.muted }} numberOfLines={1}>{r.srNo || '—'}</Text></View>
          <View style={COL.mMake}><Text style={VAL} numberOfLines={1}>{r.makeName || '—'}</Text></View>
          <View style={COL.mModel}><Text style={VAL} numberOfLines={2}>{r.model || '— (no model)'}</Text></View>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          {cell('Model name', <Text style={{ ...VAL, fontWeight: '700' }}>{r.model || '— (no model)'}</Text>)}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 6 }}>
            {cell('Model code', <Text style={{ ...VAL, color: T.muted }}>{r.srNo || '—'}</Text>)}
            {cell('Make name', <Text style={VAL}>{r.makeName || '—'}</Text>)}
          </View>
        </View>
      )}
    </View>
  );

  const renderFlat = ({ item }: { item: Flat }) => {
    if (item.k === 'g') return renderGroupRow(item.g, item.open);
    if (item.k === 'h') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ROW_GAP, minHeight: 28, paddingLeft: 44, paddingRight: 10, borderTopWidth: 1, borderTopColor: T.hair, backgroundColor: T.alt }}>
          <Text style={[HEAD, COL.mCode]}>Model code</Text>
          <Text style={[HEAD, COL.mMake]}>Make name</Text>
          <Text style={[HEAD, COL.mModel]}>Model name</Text>
        </View>
      );
    }
    return renderModelRow(item.r);
  };

  return (
    <Sheet
      visible
      fill
      scroll={false}
      title={mode === 'add' ? 'Add make / model' : 'Edit make / model'}
      subtitle="Saved to the make master — available to every item"
      onClose={onClose}
      footer={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn label="Clear" onPress={resetForm} disabled={busy} />
          <Btn label="Close" onPress={onClose} disabled={busy} flex />
          <Btn kind="primary" label={mode === 'add' ? (parsedModels.length > 1 ? `Add ${parsedModels.length} models` : existingMake ? 'Add model' : 'Add make') : (editKind === 'make' && parsedModels.length ? `Update + add ${parsedModels.length} model${parsedModels.length > 1 ? 's' : ''}` : 'Update')} onPress={() => void submit()} loading={busy} flex />
        </View>
      }
    >
      <View ref={bodyRef} collapsable={false} style={{ flex: 1, minHeight: 0 }}>
        <View style={{
          padding: isPhone ? 10 : 16,
          paddingBottom: 8,
          gap: isPhone ? 8 : 10,
          // Keep the entire form section above following siblings. On React Native Web,
          // zIndex on the dropdown alone is not enough because sibling search/grid
          // containers otherwise paint over the dropdown.
          position: 'relative',
          zIndex: 1,
          overflow: 'visible',
        }}>
          {error ? <Banner text={error} /> : null}
          {!error && done ? <Banner tone="info" text={done} /> : null}
          <Text style={{ fontSize: 11, fontWeight: '800', color: T.copper, marginBottom: -4 }}>MAKE DETAILS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flexGrow: 1, flexBasis: isPhone ? 82 : 100, minWidth: isPhone ? 82 : 100, maxWidth: isPhone ? 110 : 160 }}>
              <Field label="Make code" value={shownCode} readOnly placeholder="Auto" />
            </View>
            <View style={{ flexGrow: 2, flexBasis: isPhone ? 145 : 180, minWidth: isPhone ? 135 : 160 }}>
              <Field label="Make name" required value={form.makeName} onChangeText={(v) => { setForm((p) => ({ ...p, makeName: v.toUpperCase() })); setError(''); }} autoCapitalize="characters" hint={existingMake ? 'Existing make — model will be added under it' : undefined} onSubmitEditing={() => void submit()} />
            </View>
            <View style={{ flexGrow: 1, flexBasis: isPhone ? 112 : 130, minWidth: isPhone ? 105 : 120 }}>
              <Field label="Short name" value={form.shortName} onChangeText={(v) => setForm((p) => ({ ...p, shortName: v.toUpperCase() }))} autoCapitalize="characters" />
            </View>
            <View style={{ flexGrow: 1, flexBasis: isPhone ? 112 : 130, minWidth: isPhone ? 105 : 120 }}>
              <SelectField label="Status" value={form.status} options={[{ id: 'A', label: 'Active' }, { id: 'I', label: 'Inactive' }]} onChange={(v) => setForm((p) => ({ ...p, status: v }))} />
            </View>
          </View>
          <Text style={{ fontSize: 11, fontWeight: '800', color: T.copper, marginTop: 2, marginBottom: -4 }}>MODEL DETAILS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flexGrow: 1, flexBasis: '100%', minWidth: 0 }}>
              {/* input + open/close button always share ONE line */}
              <View ref={modelFieldRef} collapsable={false} style={{ flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'flex-end', gap: 6 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Field
                    label={modelOptions.length ? `Model name (${modelOptions.length} available)` : 'Model name'}
                    value={form.model}
                    onChangeText={(v) => { setForm((p) => ({ ...p, model: v.toUpperCase() })); setError(''); if (modelOptions.length && !modelDropdownOpen) openModelDropdown(); }}
                    onFocus={() => { if (modelOptions.length && !modelDropdownOpen) openModelDropdown(); }}
                    autoCapitalize="characters"
                    placeholder={mode === 'add' ? 'Model — or several, separated by comma' : 'Enter or select model'}
                    onSubmitEditing={() => { if (modelDropdownOpen) setModelDropdownOpen(false); else void submit(); }}
                  />
                </View>
                <Pressable
                  onPress={() => (modelDropdownOpen ? setModelDropdownOpen(false) : openModelDropdown())}
                  accessibilityRole="button"
                  accessibilityLabel={modelDropdownOpen ? 'Hide model list' : 'Show model list'}
                  accessibilityState={{ expanded: modelDropdownOpen }}
                  style={(st: any) => [
                    { height: 46, width: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: modelDropdownOpen ? T.copper : T.hair, borderRadius: 10, backgroundColor: modelDropdownOpen ? `${T.copper}12` : T.surface },
                    st.hovered && { backgroundColor: T.alt },
                  ]}
                >
                  <Icon name={modelDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color={modelDropdownOpen ? T.copper : T.muted} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: isPhone ? 10 : 16, paddingBottom: 8, position: 'relative', zIndex: 0, elevation: 0 }}>
          <SearchBox value={qInput} onChangeText={setQInput} placeholder="Search make or model" />
        </View>

        {loading ? (
          <Text style={{ padding: 24, textAlign: 'center', color: T.muted }}>Loading makes…</Text>
        ) : (
          <FlatList
            data={flatRows}
            keyExtractor={(it) => it.id}
            renderItem={renderFlat}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={wideGrid ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: ROW_GAP, minHeight: 34, paddingHorizontal: 10, backgroundColor: T.sub, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hair }}>
                <View style={COL.toggle} />
                <Text style={[HEAD, COL.code]}>Make code</Text>
                <Text style={[HEAD, COL.name]}>Make name</Text>
                <Text style={[HEAD, COL.short]}>Short name</Text>
                <Text style={[HEAD, COL.status]}>Status</Text>
                <View style={COL.acts}>
                  <Text style={[HEAD, { width: ACT_W, textAlign: 'center' }]}>Edit</Text>
                  <Text style={[HEAD, { width: ACT_W, textAlign: 'center' }]}>Delete</Text>
                </View>
              </View>
            ) : null}
            stickyHeaderIndices={wideGrid ? [0] : undefined}
            style={{ flex: 1, minHeight: 120, position: 'relative', zIndex: 0, elevation: 0 }}
            initialNumToRender={14}
            maxToRenderPerBatch={14}
            updateCellsBatchingPeriod={40}
            windowSize={9}
            ListEmptyComponent={<Text style={{ padding: 24, textAlign: 'center', color: T.muted }}>{qInput ? `Nothing matches “${qInput}”.` : 'No makes yet — add the first one above.'}</Text>}
          />
        )}
        {modelDropdownOpen ? (
          <>
            {/* outside tap closes the list. Starts at the list's top edge, so the Model input + button above stay usable while typing. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close model list"
              onPress={() => setModelDropdownOpen(false)}
              style={{ position: 'absolute', top: modelDropdownPosition.top, left: 0, right: 0, bottom: 0, zIndex: 900, backgroundColor: 'transparent' }}
            />
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                top: modelDropdownPosition.top,
                left: modelDropdownPosition.left,
                width: modelDropdownPosition.width,
                maxHeight: modelDropdownPosition.maxHeight,
                zIndex: 1000,
                elevation: 30,
                borderWidth: 1,
                borderColor: T.copper,
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: T.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 14,
              }}
            >
              {filteredModelOptions.length ? (
                <FlatList
                  data={filteredModelOptions}
                  keyExtractor={(option) => option.key}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  persistentScrollbar
                  initialNumToRender={12}
                  maxToRenderPerBatch={16}
                  windowSize={7}
                  removeClippedSubviews={false}
                  style={{ backgroundColor: T.surface, maxHeight: modelDropdownPosition.maxHeight }}
                  renderItem={({ item: option }) => {
                    const active = mode === 'edit' && sameRow(option, form);
                    return (
                      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingLeft: 12, backgroundColor: active ? `${T.copper}14` : T.surface, borderBottomWidth: 1, borderBottomColor: T.hair }}>
                        <Pressable
                          onPress={() => pickModel(option)}
                          accessibilityRole="button"
                          accessibilityLabel={`Select model ${option.model}`}
                          style={(st: any) => [{ flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' }, st.hovered && { opacity: 0.75 }]}
                        >
                          <Text numberOfLines={1} style={{ color: T.ink, fontSize: 13, fontWeight: active ? '800' : '500' }}>{option.model}</Text>
                        </Pressable>
                        <Pressable onPress={() => { startEdit(option); setModelDropdownOpen(false); }} hitSlop={4} accessibilityRole="button" accessibilityLabel={`Edit model ${option.model}`} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="edit" size={18} color={T.muted} />
                        </Pressable>
                        <Pressable onPress={() => { setModelDropdownOpen(false); remove(option); }} disabled={busy} hitSlop={4} accessibilityRole="button" accessibilityLabel={`Delete model ${option.model}`} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.4 : 1 }}>
                          <Icon name="delete-outline" size={18} color={T.red} />
                        </Pressable>
                      </View>
                    );
                  }}
                />
              ) : (
                <Text style={{ padding: 14, color: T.muted, fontSize: 12, backgroundColor: T.surface }}>
                  {!form.makeName.trim()
                    ? 'Enter a make name to see its models.'
                    : modelOptions.length
                      ? `No model matches “${form.model.trim()}” — it will be added as a new model.`
                      : 'No models yet for this make — type a name to add the first one.'}
                </Text>
              )}
            </View>
          </>
        ) : null}
      </View>
    </Sheet>
  );
}
