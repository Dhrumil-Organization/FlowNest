// FILE: src/components/StoreItemMasterNew/StoreItemMasterScreen.tsx
// NEW ERP — Store Item Master (replaces the mock screen; same route 'StoreItemMasterNew').
//
// Modes     view → Add / Modify / Delete / Browse        add / modify → Save / Cancel
// Layout    measured on the screen's OWN width (sidebar excluded):
//             phone < 560   1-column form, make cards, bottom action bar (Add · Modify · Browse · More)
//             tablet ≥ 560  2-column form, compact make grid
//             desktop ≥ 900 3-column form, full make grid, Ctrl+S to save, keyboard-driven browse
// Theme     light tokens T/S only — the app's global dark theme converts them (see ui.tsx).
// Data      ./api.ts (USE_MOCK switch lives there).
import { AppAlert } from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { deleteItem, fetchBrowsePage, fetchItem, fetchLookups, fetchNextCode, fetchStores, fetchYears, saveItem } from './api';
import BrowseSheet from './BrowseSheet';
import MakeSheet from './MakeSheet';
import {
  BrowseRow,
  CONTENT_MAX,
  DP,
  ItemErrors,
  ItemMake,
  Lookups,
  Mode,
  Opt,
  PropertyOpt,
  Scope,
  StoreItem,
  digitsOnly,
  emptyItem,
  emptyMake,
  emptyScope,
  fmt,
  formColumns,
  itemSignature,
  itemStatus,
  labelOf,
  makeStatusLabel,
  sameScope,
  scopeOf,
  validateItem,
  withDefaultUom,
} from './model';
import { NoticeHost, notifyError as showError, notifySuccess as showSuccess } from './Notice';
import { FormSkeleton, ScreenSkeleton, SkeletonField } from './Skeleton';
import { Banner, Btn, Card, Cell, CheckChip, EmptyState, Field, SelectField, Sheet, StatusPill, useContainerWidth, useWebKeys } from './ui';

type Props = { token: string; API: string; username?: string; defaultPrpType?: string; defaultPrpCode?: string; defaultYear?: string };

const LAST_STORE_KEY = 'sim_last_store'; // older builds saved only the store
const LAST_SCOPE_KEY = 'sim_last_scope_v2'; // Property / Year / Store (v2: drops scopes saved by older builds)
const GUT = 14;

/* make-grid column definitions (desktop shows all, tablet a subset) */
type MCol = { k: keyof ItemMake | 'status'; label: string; w?: number; flex?: number; minW?: number; right?: boolean; dp?: keyof typeof DP };
const MAKE_COLS_DESKTOP: MCol[] = [
  { k: 'makeCode', label: 'Make Code', w: 82 },
  { k: 'makeName', label: 'Make name', w: 180 },
  { k: 'model', label: 'Model', flex: 1, minW: 340 },
  { k: 'opQty', label: 'Op. qty', w: 110, right: true, dp: 'opQty' },
  { k: 'rate1', label: 'Rate', w: 100, right: true },
  { k: 'rate2', label: 'Rate 2', w: 100, right: true },
  { k: 'rate3', label: 'Rate 3', w: 100, right: true },
  { k: 'rate4', label: 'Rate 4', w: 100, right: true },
  { k: 'saleRate', label: 'Sale rate', w: 105, right: true, dp: 'saleRate' },
  
  { k: 'status', label: 'Status', w: 100 },
];
const MAKE_COLS_TABLET: MCol[] = [
  { k: 'makeCode', label: 'Make Code', w: 64 },
  { k: 'makeName', label: 'Make', w: 120 },
  { k: 'model', label: 'Model', flex: 1, minW: 220 },
  { k: 'opQty', label: 'Op. qty', w: 84, right: true, dp: 'opQty' },
  { k: 'rate1', label: 'Rate', w: 78, right: true },
  { k: 'rate2', label: 'Rate 2', w: 78, right: true },
  { k: 'rate3', label: 'Rate 3', w: 78, right: true },
  { k: 'rate4', label: 'Rate 4', w: 78, right: true },
  { k: 'saleRate', label: 'Sale rate', w: 84, right: true, dp: 'saleRate' },
  { k: 'status', label: 'Status', w: 84 },
];

export default function StoreItemMasterScreen({ token, API, defaultPrpType, defaultYear }: Props) {
  const { bp, onLayout } = useContainerWidth();
  const cols = formColumns(bp);

  /* ------------------------------- state -------------------------------- */
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [scope, setScope] = useState<Scope>(emptyScope());
  const store = scope.store;
  // Property -> Year -> Store lists (stores depend on Property + Year)
  const [properties, setProperties] = useState<PropertyOpt[]>([]);
  const [years, setYears] = useState<Opt[]>([]);
  const [stores, setStores] = useState<Opt[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [yearLoading, setYearLoading] = useState(false);
  const lookupsReq = useRef<Promise<void> | null>(null);
  const storeSeq = useRef(0);
  const [codeLoading, setCodeLoading] = useState(false);
  const [autoCode, setAutoCode] = useState(false);
  const codeSeq = useRef(0);
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState<StoreItem>(emptyItem());
  const [baseline, setBaseline] = useState<StoreItem | null>(null);
  const [errors, setErrors] = useState<ItemErrors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState<'' | 'load' | 'save' | 'delete'>('');
  const [showDead, setShowDead] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [makeEdit, setMakeEdit] = useState<{ make: ItemMake; isNew: boolean } | null>(null);
  const [makeOptions, setMakeOptions] = useState<
    {
      makeCode: string;
      makeName: string;
      model: string;
      makeSrNo: number;
    }[]
  >([]);

  const alive = useRef(true);
  const openSeq = useRef(0);
  const scroller = useRef<ScrollView>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const editing = mode !== 'view';
  const hasItem = !!baseline && !!draft.code;
  const dirty = editing && !!baseline && itemSignature(draft) !== itemSignature(baseline);
  const status = itemStatus(draft);
  const liveMakes = draft.makes.filter((m) => !m.dead).length;
  const visibleMakes = draft.makes.filter((m) => showDead || !m.dead);
  const storeLabel = stores.find((x) => x.id === store)?.label || '';

  /* ------------------------------ lookups -------------------------------- */
  /** Login's property type (what Color Item Master reads via getPrpTypes()). */
  const readLoginPrpType = async () => {
    try {
      const raw = await AsyncStorage.getItem('prptypes');
      if (!raw) return '';
      try {
        const v = JSON.parse(raw);
        return typeof v === 'string' ? v : '';
      } catch {
        return String(raw);
      }
    } catch {
      return '';
    }
  };

  /** Read YearNo from the login response persisted by the app. */
  const readLoginYearNo = async () => {
    const findYearNo = (value: any, depth = 0): string => {
      if (value == null || depth > 6) return '';
      if (Array.isArray(value)) {
        for (const entry of value) {
          const found = findYearNo(entry, depth + 1);
          if (found) return found;
        }
        return '';
      }
      if (typeof value !== 'object') return '';
      // Prefer the active login year object (the login response contains `year: { YearNo: ... }`).
      const directYear = value.YearNo ?? value.yearNo ?? value.yearno;
      if (directYear !== undefined && directYear !== null && String(directYear).trim()) {
        return String(directYear);
      }
      for (const [key, child] of Object.entries(value)) {
        if (key.toLowerCase() === 'year' || key.toLowerCase().includes('login') || typeof child === 'object') {
          const found = findYearNo(child, depth + 1);
          if (found) return found;
        }
      }
      return '';
    };

    // A few app versions use different storage keys for the login/session response.
    // Scan persisted values instead of relying on one guessed key name.
    try {
      const keys = await AsyncStorage.getAllKeys();
      for (const key of keys) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (!raw) continue;
          let value: any = raw;
          try { value = JSON.parse(raw); } catch { /* non-JSON storage value */ }
          const found = findYearNo(value);
          if (found) return found;
        } catch { /* continue with remaining stored values */ }
      }
    } catch { /* getAllKeys may not be supported by a storage adapter */ }

    // Keep compatibility with a parent screen that explicitly supplies the login year.
    return defaultYear ? String(defaultYear) : '';
  };

  const runLookups = useCallback(async () => {
    setLookupError('');
    try {
      let saved: Partial<Scope> = {};
      try {
        const raw = await AsyncStorage.getItem(LAST_SCOPE_KEY);
        if (raw) saved = JSON.parse(raw) || {};
      } catch {
        // storage unavailable — fall back to the first option of each list
      }
      const prpType = saved.prpType || defaultPrpType || (await readLoginPrpType());
      // Property is fixed to MT. Year comes from the login response, not a screen dropdown.
      const loginYearNo = await readLoginYearNo();
      const yearNo = loginYearNo;
      if (!yearNo) throw new Error('Login year (YearNo) was not found. Please log in again.');
      const storeList = await fetchStores(API, token, 'MT', yearNo);
      const first = storeList.find((x) => x.id === saved.store)?.id || storeList[0]?.id || '';
      const next: Scope = { prpType, prpCode: 'MT', yearNo, store: first };
      const l = await fetchLookups(API, token, next);
      if (!alive.current) return;
      // Make/Model options come from the same lookups response as Location.
      // Do not call the separate type=makes API.
      setMakeOptions(l.makes);
      setProperties([]);
      setYears([]);
      setStores(storeList);
      setLookups(l);
      setScope(next);
      setDraft(emptyItem(next));
    } catch (e: any) {
      if (alive.current) setLookupError(e?.message || 'Could not load the item lists.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token, defaultPrpType, defaultYear]);

  /** Never run two loads at once (double mount / re-render must not repeat the APIs). */
  const loadLookups = useCallback(() => {
    if (!lookupsReq.current) {
      lookupsReq.current = runLookups().finally(() => {
        lookupsReq.current = null;
      });
    }
    return lookupsReq.current;
  }, [runLookups]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  /* warn before closing the browser tab with unsaved changes (web) */
  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty || typeof window === 'undefined') return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  /* ------------------------------- helpers -------------------------------- */
  const set = <K extends keyof StoreItem>(k: K, v: StoreItem[K]) => {
    setDraft((p) => ({ ...p, [k]: v }));
    if (errors[k as keyof ItemErrors]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const resetToBlank = (sc: Scope = scope) => {
    codeSeq.current++; // drop any pending next-code response
    setCodeLoading(false);
    setAutoCode(false);
    setMode('view');
    setDraft(emptyItem(sc));
    setBaseline(null);
    setErrors({});
    setFormError('');
  };

  const confirm = (title: string, message: string, yes: string, onYes: () => void, destructive = false, no = 'Keep editing') =>
    AppAlert.alert(title, message, [
      { text: no, style: 'cancel' },
      { text: yes, style: destructive ? 'destructive' : 'default', onPress: onYes },
    ]);

  /* ------------------------------- actions -------------------------------- */
  /**
   * SHOW call with ItmCode = 0 → next item code for this Property / Year / Store.
   * Runs when Add is pressed and again whenever Property / Year / Store changes while adding
   * (previously Add never called the show API, so the code stayed blank).
   */
  const loadNextCode = async (sc: Scope) => {
    const id = ++codeSeq.current;
    setCodeLoading(true);
    setAutoCode(false);
    try {
      const code = await fetchNextCode(API, token, sc);
      if (!alive.current || id !== codeSeq.current) return;
      setDraft((p) => ({ ...p, code }));
      setBaseline((p) => (p ? { ...p, code } : p)); // an auto code is not an "unsaved change"
      setAutoCode(!!code);
    } catch (err: any) {
      if (!alive.current || id !== codeSeq.current) return;
      setDraft((p) => ({ ...p, code: '' }));
      setBaseline((p) => (p ? { ...p, code: '' } : p));
      showError(err?.message || 'Could not get the next item code.');
    } finally {
      if (alive.current && id === codeSeq.current) setCodeLoading(false);
    }
  };

  const rememberScope = (sc: Scope) => {
    void Promise.resolve(AsyncStorage.setItem(LAST_SCOPE_KEY, JSON.stringify(sc))).catch(() => { });
  };

  /** Make `sc` the active scope: View → blank form, Add → keep draft and fetch the next code. */
  const commitScope = (sc: Scope) => {
    setScope(sc);
    rememberScope(sc);
    if (mode === 'add') {
      setDraft((p) => ({ ...p, ...sc, code: '' }));
      setBaseline((p) => (p ? { ...p, ...sc, code: '' } : p));
      setErrors((p) => ({ ...p, prpCode: undefined, yearNo: undefined, store: undefined }));
      setAutoCode(false);
      if (sc.store) void loadNextCode(sc);
    } else {
      resetToBlank(sc);
    }
  };

  /**
   * Property / Year / Store change — each change calls only what depends on it:
   *   Property changed → getyear (for that property) → getmstore (property + year)
   *   Year changed     → getmstore (property + year)
   *   Store changed    → no list call
   * A newer change cancels the older one (storeSeq), so no stale result is applied.
   */
  const changeScope = async (patch: Partial<Scope>) => {
    const next: Scope = { ...scope, ...patch };
    if (sameScope(next, scope)) return;
    const propChanged = patch.prpCode !== undefined && patch.prpCode !== scope.prpCode;
    const yearChanged = patch.yearNo !== undefined && patch.yearNo !== scope.yearNo;
    if (!propChanged && !yearChanged) {
      commitScope(next); // only the store changed
      return;
    }
    const id = ++storeSeq.current;
    setStoreLoading(true);
    if (propChanged) setYearLoading(true);
    commitScope({ ...next, store: '' }); // show the new Property / Year at once; the lists follow
    try {
      let yearNo = next.yearNo;
      if (propChanged) {
        const ys = await fetchYears(API, token, next.prpType, next.prpCode);
        if (!alive.current || id !== storeSeq.current) return;
        setYears(ys);
        yearNo = ys.find((y) => y.id === scope.yearNo)?.id || ys[0]?.id || '';
        setYearLoading(false);
      }
      const list = await fetchStores(API, token, next.prpCode, yearNo);
      if (!alive.current || id !== storeSeq.current) return;
      setStores(list);
      const pick = list.find((x) => x.id === scope.store)?.id || list[0]?.id || '';
      commitScope({ ...next, yearNo, store: pick });
      if (!list.length) showError('No store is available for this property and year.');
    } catch (err: any) {
      if (!alive.current || id !== storeSeq.current) return;
      setStores([]);
      showError(err?.message || 'Could not load the lists.');
    } finally {
      if (alive.current && id === storeSeq.current) {
        setStoreLoading(false);
        setYearLoading(false);
      }
    }
  };
  const onPropertyChange = (id: string) => void changeScope({ prpCode: id, prpType: properties.find((p) => p.id === id)?.type ?? scope.prpType });
  const onYearChange = (id: string) => void changeScope({ yearNo: id });
  const onStoreChange = (id: string) => void changeScope({ store: id });

  const onAdd = () => {
    if (!lookups || busy) return;
    const blank = withDefaultUom(emptyItem(scope), lookups.uoms);
    setDraft(blank);
    setBaseline(blank);
    setErrors({});
    setFormError('');
    setMode('add');
    void loadNextCode(scope);
  };

  const onModify = () => {
    if (!hasItem || busy) return;
    setBaseline(draft);
    setErrors({});
    setFormError('');
    setMode('modify');
  };

  const discard = () => {
    if (mode === 'add') resetToBlank(scopeOf(draft));
    else {
      if (baseline) setDraft(baseline);
      setMode('view');
      setErrors({});
      setFormError('');
    }
  };

  const onCancel = () => {
    if (busy === 'save') return;
    if (dirty) confirm('Discard changes?', 'The changes you made to this item will be lost.', 'Discard', discard, true);
    else discard();
  };

  const onSave = async () => {
    if (!editing || busy || !lookups) return;
    const e = validateItem(draft, mode);
    setErrors(e);
    if (Object.keys(e).length) {
      setFormError(`Fix ${Object.keys(e).length} ${Object.keys(e).length === 1 ? 'field' : 'fields'} before saving.`);
      scroller.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setFormError('');
    setBusy('save');
    try {
      const removedMakeIds = mode === 'modify' && baseline
        ? baseline.makes.filter((oldMake) => !draft.makes.some((currentMake) => currentMake.id === oldMake.id)).map((m) => m.id)
        : [];
      const wasAdd = mode === 'add';
      const { item: saved, message } = await saveItem(API, token, mode, { ...draft, name: draft.name.trim().toUpperCase() }, removedMakeIds);
      if (!alive.current) return;
      // Clear item details after saving, but keep the selected Property / Year / Store.
      const savedScope = scopeOf(saved);
      setScope(savedScope);
      rememberScope(savedScope);
      resetToBlank(savedScope);
      // success:true → show the message the API sent (fallback only when the API sent none)
      showSuccess(message || `Item ${saved.code} saved successfully.`, { title: wasAdd ? 'Item added' : 'Item updated' });
    } catch (err: any) {
      if (!alive.current) return;
      // error:true → show the message the API sent
      showError(err?.message || 'Could not save the item.', { title: 'Could not save' });
      scroller.current?.scrollTo({ y: 0, animated: true });
    } finally {
      if (alive.current) setBusy('');
    }
  };

  const onDelete = () => {
    if (!hasItem || busy || editing) return;
    confirm(
      'Delete this item?',
      `${draft.code} – ${draft.name} will be removed from ${storeLabel || 'this store'}. This cannot be undone.`,
      'Delete item',
      async () => {
        setBusy('delete');
        try {
          const message = await deleteItem(API, token, scopeOf(draft), draft.mItmCode || draft.code);
          if (!alive.current) return;
          showSuccess(message || `Item ${draft.code} deleted successfully.`, { title: 'Item deleted' });
          resetToBlank(scopeOf(draft));
        } catch (err: any) {
          showError(err?.message || 'Could not delete the item.', { title: 'Could not delete' });
        } finally {
          if (alive.current) setBusy('');
        }
      },
      true,
      'Cancel',
    );
  };

  const openItem = useCallback(
    async (storeId: string, code: string) => {
      const sc: Scope = { ...scope, store: storeId || scope.store };
      const id = ++openSeq.current;
      setBusy('load');
      setFormError('');
      try {
        const it = await fetchItem(API, token, sc, code);
        if (!alive.current || id !== openSeq.current) return;
        setScope(scopeOf(it));
        setAutoCode(false);
        setDraft(it);
        setBaseline(it);
        setErrors({});
        setMode('view');
      } catch (err: any) {
        if (alive.current && id === openSeq.current) showError(err?.message || 'Could not open the item.', { title: 'Could not open item' });
      } finally {
        if (alive.current && id === openSeq.current) setBusy('');
      }
    },
    [API, token, scope],
  );

  const onBrowse = () => {
    if (editing || busy || !lookups) return;
    setBrowseOpen(true);
  };
  const onPickRow = useCallback(
    (row: BrowseRow) => {
      setBrowseOpen(false);
      void openItem(row.store || store, row.mItmCode || row.code);
    },
    [openItem, store],
  );
  const fetchPage = useCallback((page: number, perPage: number, search: string) => fetchBrowsePage(API, token, scope, page, perPage, search), [API, token, scope]);

  const onRefreshItem = () => {
    if (hasItem && !editing && !busy) void openItem(scopeOf(draft).store, draft.mItmCode || draft.code);
  };

  /* makes */
  const saveMake = (m: ItemMake) => {
    setDraft((p) => {
      const makes = p.makes.some((x) => x.id === m.id)
        ? p.makes.map((x) => (x.id === m.id ? m : x))
        : [...p.makes, m];
      return { ...p, makes };
    });
    setErrors((p) => ({ ...p, makes: undefined }));
    setMakeEdit(null);
  };

  /** The Make / Model master dialog changed the master -> keep the cached dropdown options in sync. */
  const onMakeOptionsChange = (list: typeof makeOptions) => {
    setMakeOptions(list);
    setLookups((l) => (l ? { ...l, makes: list } : l));
  };

  const openMakeEditor = (make: ItemMake, isNew: boolean) => {
    // Options are preloaded with the screen lookups. Do not call the API
    // every time the user opens Add/Edit make; reuse the cached options.
    setMakeEdit({ make, isNew });
  };

  const removeMake = (id: string) => {
    setDraft((p) => ({ ...p, makes: p.makes.filter((x) => x.id !== id) }));
    setMakeEdit(null);
  };

  /* Ctrl/Cmd + S saves while editing (web) */
  useWebKeys(
    useCallback(
      (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && editing && !browseOpen && !makeEdit) {
          e.preventDefault();
          void onSave();
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [editing, browseOpen, makeEdit, draft, mode, busy],
    ),
    editing,
  );

  /* ------------------------------ derived UI ------------------------------ */
  /* ------------------------------ early states ----------------------------- */
  if (!lookups) {
    if (lookupError) {
      return (
        <View style={s.screen} onLayout={onLayout}>
          <EmptyState icon="cloud-off" title="Could not open Store Item Master" message={lookupError} action={<Btn kind="primary" icon="refresh" label="Try again" onPress={loadLookups} />} />
        </View>
      );
    }
    return <ScreenSkeleton bp={bp} cols={cols} onLayout={onLayout} />;
  }

  const ro = !editing; // read-only fields
  const flowCell = (el: React.ReactNode, span = 1) => (
    <Cell cols={cols} span={span} gutter={GUT}>
      {el}
    </Cell>
  );

  /* ------------------------------- sections ------------------------------- */
  const hero = (
    <View style={s.hero}>
      <View style={[s.heroTop, bp === 'phone' && { flexWrap: 'wrap' }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.heroEyebrow}>{mode === 'add' ? 'New item' : mode === 'modify' ? 'Editing item' : 'Item'}</Text>
          <Text style={s.heroTitle} numberOfLines={2}>
            {draft.name || (hasItem ? '' : 'Untitled item')}
          </Text>
        </View>
        <View style={s.heroTile}>
          <Text style={s.tileLabel}>Code</Text>
          <Text style={s.tileValue}>{draft.code || '—'}</Text>
        </View>
      </View>
      <View style={s.heroTiles}>
        <View style={[s.heroTile, { flex: 1 }]}>
          <Text style={s.tileLabel}>Store</Text>
          <Text style={s.tileValue} numberOfLines={1}>{storeLabel || '—'}</Text>
        </View>
        <View style={[s.heroTile, { flex: 1 }]}>
          <Text style={s.tileLabel}>Makes</Text>
          <Text style={s.tileValue}>{liveMakes}</Text>
        </View>
        <View style={[s.heroTile, { flex: 1 }]}>
          <Text style={s.tileLabel}>Status</Text>
          <Text
            style={[s.tileValue, { color: status.kind === 'active' ? '#4ADE80' : status.kind === 'stopped' ? '#F87171' : '#FBBF24' }]}
            numberOfLines={1}
          >
            {status.label}
          </Text>
        </View>
      </View>
    </View>
  );

  const groupSelect = (
    <SelectField
      label="Item group"
      value={draft.groupId}
      options={lookups.groups}
      disabled={ro}
      required
      error={errors.groupId}
      onChange={(id) => {
        set('groupId', id);
      }}
    />
  );
  const scopeLocked = mode === 'modify' || busy !== '';

  const details = (
    <Card title="Details" subtitle={mode === 'add' ? 'Select Store — the item code is assigned automatically.' : undefined}>
      <View style={[s.grid, { marginHorizontal: -GUT / 2 }]}>
        {flowCell(
          storeLoading ? (
            <SkeletonField labelWidth={50} />
          ) : (
            <SelectField
              label="Store"
              value={scope.store}
              options={stores}
              onChange={onStoreChange}
              disabled={scopeLocked || !scope.prpCode || !scope.yearNo}
              placeholder={scope.prpCode && scope.yearNo && stores.length === 0 ? 'No store available' : 'Select…'}
              required
              error={errors.store}
            />
          ),
          1,
        )}
        {cols > 1 && flowCell(<View />, cols - 1)}
        {flowCell(
          codeLoading ? (
            <SkeletonField labelWidth={66} />
          ) : (
            <Field
              label="Item code"
              value={draft.code}
              readOnly={mode !== 'add' || autoCode}
              onChangeText={(v) => set('code', digitsOnly(v))}
              keyboardType="numeric"
              error={errors.code}
              placeholder={mode === 'add' ? 'Auto' : undefined}
            />
          ),
        )}
        {flowCell(
          <Field label="Item name" value={draft.name} readOnly={ro} required error={errors.name} autoCapitalize="characters" onChangeText={(v) => set('name', v.toUpperCase())} />,
          Math.max(1, cols - 1),
        )}
        {flowCell(groupSelect)}
        {flowCell(<SelectField label="UOM" value={draft.salesUom} options={lookups.uoms} disabled={ro} required error={errors.salesUom} onChange={(id) => set('salesUom', id)} />)}
      </View>
    </Card>
  );

  /* make grid (desktop / tablet) */
  const mcols = bp === 'desktop' ? MAKE_COLS_DESKTOP : MAKE_COLS_TABLET;
  const mcell = (c: MCol) => (c.w ? { width: c.w } : { flex: c.flex ?? 1, minWidth: c.minW ?? 0 });
  // Table is only as wide as its columns (+ row padding, edit icon, delete button); the Model column
  // takes any spare width, so the edit / delete icons sit together at the right edge (no big gap).
  const mTableMinW = mcols.reduce((n, c) => n + (c.w ?? c.minW ?? 0) + 10, 0) + 20 + 28 + 42;
  const mval = (m: ItemMake, c: MCol) => {
    if (c.k === 'status') return m.dead ? 'Dead' : makeStatusLabel(m.status, lookups.status);
    if (c.k === 'location') return labelOf(lookups.locations, m.location);
    const raw = (m as any)[c.k];
    if (c.dp) return fmt(raw, DP[c.dp]);
    return String(raw ?? '');
  };

  const makesTable = (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%' }}>
      <View style={{ flex: 1, minWidth: mTableMinW }}>
        <View style={s.mHead}>
          {mcols.map((c) => (
            <View key={String(c.k)} style={[mcell(c), { paddingRight: 10 }]}>
              <Text style={[s.mTh, c.right && { textAlign: 'right' }]} numberOfLines={1}>{c.label}</Text>
            </View>
          ))}
          <View style={{ width: 28 }} />
        </View>
        {visibleMakes.map((m, i) => (
          <View
            key={m.id}
            style={[
              s.mRow,
              i % 2 === 1 && { backgroundColor: T.sub },
              m.dead && { opacity: 0.65 },
            ]}
          >
            <Pressable
              onPress={() => void openMakeEditor(m, false)}
              accessibilityRole="button"
              accessibilityLabel={`${editing ? 'Edit' : 'View'} make ${m.makeName} ${m.model}`}
              style={({ hovered }: any) => [
                { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
                hovered && Platform.OS === 'web' && { backgroundColor: `${T.copper}10` },
              ]}
            >
              {mcols.map((c) => {
                const v = mval(m, c);
                return (
                  <View key={String(c.k)} style={[mcell(c), { paddingRight: 10 }]}>
                    {c.k === 'status' ? (
                      <StatusPill kind={m.dead ? 'dead' : v === 'Active' ? 'active' : 'passive'} label={v} />
                    ) : (
                      <Text numberOfLines={1} style={[s.mTd, c.right && { textAlign: 'right' }, c.k === 'makeName' && { fontWeight: '700' }, !v && { color: T.muted }]}>
                        {v || '—'}
                      </Text>
                    )}
                  </View>
                );
              })}
              <View style={{ width: 28, alignItems: 'flex-end' }}>
                <Icon name={editing ? 'edit' : 'chevron-right'} size={18} color={T.muted} />
              </View>
            </Pressable>
            {editing ? (
              <Pressable
                onPress={() =>
                  confirm(
                    'Delete make/model?',
                    `Remove ${m.makeName || 'this make'}${m.model ? ` — ${m.model}` : ''} from this item? Save the item to apply this change.`,
                    'Remove',
                    () => removeMake(m.id),
                    true,
                    'Cancel',
                  )
                }
                disabled={!!busy}
                accessibilityRole="button"
                accessibilityLabel={`Delete make ${m.makeName} ${m.model}`}
                hitSlop={8}
                style={({ pressed }: any) => [
                  s.makeDeleteButton,
                  pressed && { backgroundColor: `${T.red}18` },
                  !!busy && { opacity: 0.45 },
                ]}
              >
                <Icon name="delete-outline" size={19} color={T.red} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const makesCards = (
    <View style={{ gap: 10 }}>
      {visibleMakes.map((m) => (
        <View key={m.id} style={[s.mCard, m.dead && { opacity: 0.65 }]}>
          <Pressable
            onPress={() => void openMakeEditor(m, false)}
            accessibilityRole="button"
            accessibilityLabel={`${editing ? 'Edit' : 'View'} make ${m.makeName} ${m.model}`}
            style={({ pressed }) => [pressed && { backgroundColor: T.alt }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.mCardTitle, { flex: 1 }]} numberOfLines={1}>
                {m.makeCode ? `${m.makeCode}  ` : ''}
                {m.makeName}
              </Text>
              {m.dead ? <StatusPill kind="dead" label="Dead" /> : null}
              <Icon name={editing ? 'edit' : 'chevron-right'} size={18} color={T.muted} />
            </View>
            {m.model ? <Text style={s.mCardModel}>{m.model}</Text> : null}
            <View style={s.mStats}>
              {[
                ['Op. qty', fmt(m.opQty, DP.opQty)],
                ['Rate', m.rate1 || '0'],
                ['Rate 2', m.rate2 || '0'],
                ['Rate 3', m.rate3 || '0'],
                ['Rate 4', m.rate4 || '0'],
                ['Sale rate', fmt(m.saleRate, DP.saleRate)],
              ].map(([l, v]) => (
                <View key={l} style={s.mStat}>
                  <Text style={s.mStatL}>{l}</Text>
                  <Text style={s.mStatV}>{v}</Text>
                </View>
              ))}
            </View>
          </Pressable>
          {editing ? (
            <Pressable
              onPress={() =>
                confirm(
                  'Delete make/model?',
                  `Remove ${m.makeName || 'this make'}${m.model ? ` — ${m.model}` : ''} from this item? Save the item to apply this change.`,
                  'Remove',
                  () => removeMake(m.id),
                  true,
                  'Cancel',
                )
              }
              disabled={!!busy}
              accessibilityRole="button"
              accessibilityLabel={`Delete make ${m.makeName} ${m.model}`}
              style={({ pressed }) => [
                s.makeDeleteCardButton,
                pressed && { backgroundColor: `${T.red}18` },
                !!busy && { opacity: 0.45 },
              ]}
            >
              <Icon name="delete-outline" size={18} color={T.red} />
              <Text style={{ color: T.red, fontSize: 13, fontWeight: '700' }}>Delete make</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );

  const makes = (
    <Card
      title="Makes & models"
      subtitle={draft.makes.length ? `${liveMakes} active${draft.makes.length - liveMakes ? `, ${draft.makes.length - liveMakes} dead` : ''}` : undefined}
      stack={bp === 'phone'}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, ...(bp === 'phone' ? { width: '100%' } : { flexWrap: 'wrap' }) } as any}>
          <CheckChip label="Show dead" value={showDead} onChange={setShowDead} />
          <Btn kind="primary" icon="add" label="Add make" flex={bp === 'phone'} disabled={!editing} onPress={() => void openMakeEditor(emptyMake(), true)} />
        </View>
      }
    >
      {errors.makes ? (
        <View style={{ marginBottom: 12 }}>
          <Banner text={errors.makes} />
        </View>
      ) : null}
      {visibleMakes.length === 0 ? (
        <EmptyState
          icon="category"
          title={draft.makes.length ? 'All makes are marked dead' : 'No makes added yet'}
          message={
            draft.makes.length
              ? 'Turn on “Show dead” to see them.'
              : editing
                ? 'Add the makes and models this item is bought in.'
                : hasItem
                  ? 'This item has no makes.'
                  : 'Open an item with Browse, or press Add to create one.'
          }
        />
      ) : bp === 'phone' ? (
        makesCards
      ) : (
        makesTable
      )}
    </Card>
  );

  /* ------------------------------ action bar ------------------------------ */
  const showIcons = bp !== 'phone';
  const actionBar = (
    <View style={s.actions}>
      <View style={[s.actionsInner, { maxWidth: CONTENT_MAX }]}>
        {editing ? (
          <>
            {bp !== 'phone' ? (
              <View style={{ flex: 1, minWidth: 0 }}>
                {dirty ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.amber }} />
                    <Text style={s.actionHint}>Unsaved changes</Text>
                  </View>
                ) : (
                  <Text style={s.actionHint}>No changes yet</Text>
                )}
                {bp === 'desktop' ? <Text style={s.actionHintSub}>Press Ctrl+S to save</Text> : null}
              </View>
            ) : null}
            <Btn label="Cancel" onPress={onCancel} disabled={busy === 'save'} flex={bp === 'phone'} />
            <Btn
              kind="primary"
              icon={showIcons ? 'check' : undefined}
              label={mode === 'add' ? 'Save item' : 'Save changes'}
              onPress={onSave}
              loading={busy === 'save'}
              flex={bp === 'phone'}
            />
          </>
        ) : (
          <>
            <Btn kind="primary" icon={showIcons ? 'add' : undefined} label="Add" onPress={onAdd} disabled={!!busy} flex />
            <Btn icon={showIcons ? 'edit' : undefined} label="Modify" onPress={onModify} disabled={!hasItem || !!busy} flex />
            {bp !== 'phone' ? (
              <Btn kind="danger" icon="delete-outline" label="Delete" onPress={onDelete} disabled={!hasItem || !!busy} loading={busy === 'delete'} flex />
            ) : null}
            <Btn icon={showIcons ? 'search' : undefined} label="Browse" onPress={onBrowse} disabled={!!busy} flex />
            {bp !== 'phone' ? (
              <Btn icon="refresh" iconOnly onPress={onRefreshItem} disabled={!hasItem || !!busy} accessibilityLabel="Reload item" />
            ) : (
              <Btn icon="more-horiz" iconOnly onPress={() => setMoreOpen(true)} accessibilityLabel="More actions" />
            )}
          </>
        )}
      </View>
    </View>
  );

  /* --------------------------------- render -------------------------------- */
  return (
    <View style={s.screen} onLayout={onLayout}>
      <ScrollView
        ref={scroller}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, bp === 'phone' && { padding: 12, gap: 12 }]}
      >
        <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: bp === 'phone' ? 12 : 14 }}>
          {formError ? <Banner text={formError} /> : null}
          {hero}
          {!hasItem && mode === 'view' && !busy ? (
            <Banner tone="info" text="Open an item with Browse, or press Add to create a new one." />
          ) : null}
          {busy === 'load' ? (
            <FormSkeleton bp={bp} cols={cols} />
          ) : (
            <View style={{ gap: bp === 'phone' ? 12 : 14 }}>
              {details}
              {makes}
            </View>
          )}
        </View>
      </ScrollView>

      {actionBar}

      {/* More (phone) */}
      <Sheet visible={moreOpen} title="More actions" onClose={() => setMoreOpen(false)} size="sm">
        <View style={{ gap: 8 }}>
          <Btn icon="refresh" label="Reload item" disabled={!hasItem || !!busy} onPress={() => { setMoreOpen(false); onRefreshItem(); }} />
          <Btn kind="danger" icon="delete-outline" label="Delete item" disabled={!hasItem || !!busy} onPress={() => { setMoreOpen(false); onDelete(); }} />
        </View>
      </Sheet>

      {browseOpen ? (
        <BrowseSheet storeLabel={storeLabel} currentCode={hasItem ? draft.code : undefined} fetchPage={fetchPage} onPick={onPickRow} onClose={() => setBrowseOpen(false)} />
      ) : null}

      <NoticeHost />

      {makeEdit ? (
        <MakeSheet key={makeEdit.make.id} API={API} token={token} scope={scope} onMakeOptionsChange={onMakeOptionsChange} locations={lookups.locations} statuses={lookups.status} rateEditable={lookups.rateEditable} makeOptions={makeOptions} make={makeEdit.make} isNew={makeEdit.isNew} editable={editing} onClose={() => setMakeEdit(null)} onSave={saveMake} onRemove={removeMake} />
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------------ */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 14, flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },

  hero: { backgroundColor: T.nav, borderRadius: 16, padding: 14, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroEyebrow: { fontSize: 12, fontWeight: '700', color: '#E0A56B' },
  heroTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  heroTiles: { flexDirection: 'row', gap: 8 },
  heroTile: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minWidth: 0 },
  tileLabel: { fontSize: 11, fontWeight: '600', color: '#9FB0C6' },
  tileValue: { fontSize: 14.5, fontWeight: '800', color: '#FFFFFF', marginTop: 1 },

  mHead: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.alt, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingHorizontal: 10, minHeight: 38, borderBottomWidth: 1, borderBottomColor: T.border },
  mTh: { fontSize: 12, fontWeight: '800', color: T.muted },
  mRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, minHeight: 48, borderBottomWidth: 1, borderBottomColor: T.hair },
  makeDeleteButton: { width: 38, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginLeft: 4 },
  makeDeleteCardButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 38, paddingHorizontal: 10, marginTop: 8, borderWidth: 1, borderColor: `${T.red}44`, borderRadius: 9 },
  mTd: { fontSize: 13.5, fontWeight: '500', color: T.ink },

  mCard: { borderWidth: 1, borderColor: T.border, borderRadius: 14, padding: 12, backgroundColor: T.sub },
  mCardTitle: { flex: 1, fontSize: 14.5, fontWeight: '800', color: T.ink },
  mCardModel: { fontSize: 13.5, fontWeight: '500', color: T.ink, marginTop: 6 },
  mStats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 10 },
  mStat: { width: '50%' },
  mStatL: { fontSize: 11.5, color: T.muted, fontWeight: '600' },
  mStatV: { fontSize: 14, color: T.ink, fontWeight: '700', marginTop: 1 },

  actions: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, alignItems: 'center' },
  actionsInner: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  actionHint: { fontSize: 13, fontWeight: '700', color: T.ink },
  actionHintSub: { fontSize: 11.5, color: T.muted, marginTop: 1 },

});
