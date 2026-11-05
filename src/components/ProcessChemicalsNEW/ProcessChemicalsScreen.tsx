// FILE: src/components/ProcessChemicalsNEW/ProcessChemicalsScreen.tsx
// NEW ERP — Process Chemicals (Define Recipe).  Route key: 'ProcessChemicals'.
//
// Modes     view → Add / Modify / Delete / Browse        add / modify → Save / Cancel
// Copy      Add and Modify: "Copy recipe" picks an existing recipe and copies its description, process, item,
//           location, page no. and every chemical into the new recipe (number / date / status stay new).
// Removed   (on purpose, per the requirement) Recipe-group All/Selected + "Load Recipe Groups",
//           Temperature Details, Prepared By, Recipe Status, Approval Date, Approved By.
// Layout    measured on the screen's OWN width (sidebar excluded) — same breakpoints as Store Item Master:
//             phone < 560   1-column form, chemical cards, bottom action bar (Add · Modify · Browse · More)
//             tablet ≥ 560  2-column form, compact grid
//             desktop ≥ 900 3-column form, full grid, Ctrl+S to save
// Theme     light tokens T/S only — the app-wide dark theme converts them (see StoreItemMasterNew/ui.tsx).
// Data      ./api.ts (USE_MOCK = demo data until the Laravel controller is live).
import { AppAlert } from '@/common/utils/appAlert';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { USE_MOCK, deleteRecipe, fetchLookups, fetchNextNo, fetchRecipe, saveRecipe } from './api';
import LineSheet from './LineSheet';
import RecipeGrid from './RecipeGrid';
import RecipeHelpSheet from './RecipeHelpSheet';
import {
  BrowseRow, CONTENT_MAX, Lookups, Mode, Recipe, RecipeErrors, RecipeLine,
  copyFromRecipe, emptyLine, emptyLookups, emptyRecipe, fmtCost, fmtDate, fmtDateLong, formColumns, groupLines, recipeSignature, recipeTotals, validateRecipe,
} from './model';
import { NoticeHost, notifyError, notifyInfo, notifySuccess } from '../StoreItemMasterNew/Notice';
import { FormSkeleton, ScreenSkeleton } from '../StoreItemMasterNew/Skeleton';
import RecipeDateField from './RecipeDateField';
import { Banner, Btn, Card, Cell, EmptyState, Field, SelectField, Sheet, StatusPill, useContainerWidth, useWebKeys } from '../StoreItemMasterNew/ui';

type Props = { token: string; API: string; username?: string };

/** Permission resource registered in registry/modules/production.module.ts */
export const PROCESS_CHEMICALS_RESOURCE = 'production.process_chemicals';

const confirmBox = (title: string, message: string, yes: string, onYes: () => void, destructive = false, no = 'Cancel') =>
  AppAlert.alert(title, message, [{ text: no, style: 'cancel' }, { text: yes, style: destructive ? 'destructive' : 'default', onPress: onYes }]);

export default function ProcessChemicalsScreen({ token, API }: Props) {
  const { bp, onLayout } = useContainerWidth();
  const cols = formColumns(bp);
  const phone = bp === 'phone';
  // The route guard already checked `view`; the screen only decides which buttons the user may use.
  const { canDo } = usePermission();
  const can = { add: canDo(PROCESS_CHEMICALS_RESOURCE, 'add'), edit: canDo(PROCESS_CHEMICALS_RESOURCE, 'edit'), del: canDo(PROCESS_CHEMICALS_RESOURCE, 'delete') };

  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState<Recipe>(emptyRecipe());
  const [baseSig, setBaseSig] = useState('');
  const [baseline, setBaseline] = useState<Recipe | null>(null);
  const [deletedLines, setDeletedLines] = useState<string[]>([]);
  const [errors, setErrors] = useState<RecipeErrors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState<'' | 'load' | 'save' | 'delete' | 'copy' | 'number'>('');
  const [browseOpen, setBrowseOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [lineEdit, setLineEdit] = useState<{ line: RecipeLine; isNew: boolean } | null>(null);
  const alive = useRef(true);
  const scroller = useRef<ScrollView>(null);
  const numberSeq = useRef(0);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const editing = mode !== 'view';
  const hasRecipe = !!draft.recipeNo && !editing;
  const lk = lookups ?? emptyLookups();
  const dirty = editing && recipeSignature(draft) !== baseSig;
  const totals = recipeTotals(draft.lines);

  /* ---------------------------- initial lookups ---------------------------- */
  const loadLookups = useCallback(async () => {
    setLookupError('');
    try { const l = await fetchLookups(API, token); if (alive.current) setLookups(l); }
    catch (e: any) { if (alive.current) setLookupError(e?.message || 'Could not load the lists.'); }
  }, [API, token]);
  useEffect(() => { loadLookups(); }, [loadLookups]);

  // warn before closing the browser tab with unsaved work (web)
  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty || typeof window === 'undefined') return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  /* -------------------------------- helpers -------------------------------- */
  const set = <K extends keyof Recipe>(k: K, v: Recipe[K]) => {
    setDraft((p) => ({ ...p, [k]: v }));
    if (errors[k as keyof RecipeErrors]) setErrors((p) => ({ ...p, [k]: undefined }));
  };
  const toView = (r: Recipe) => {
    numberSeq.current++;
    setMode('view'); setDraft(r); setBaseline(null); setBaseSig(''); setDeletedLines([]); setErrors({}); setFormError('');
  };
  const resetToBlank = () => toView(emptyRecipe());

  /* -------------------------------- actions -------------------------------- */
  const openRecipe = async (no: string, thenModify = false) => {
    setBusy('load'); setFormError('');
    try {
      const r = await fetchRecipe(API, token, no);
      if (!alive.current) return;
      toView(r);
      if (thenModify) startModify(r);
      scroller.current?.scrollTo({ y: 0, animated: false });
    } catch (e: any) { if (alive.current) notifyError(e?.message || 'Could not open the recipe.', { title: 'Could not open' }); }
    finally { if (alive.current) setBusy(''); }
  };

  const onAdd = async () => {
    if (busy || !can.add) return;
    const id = ++numberSeq.current;
    const fresh = emptyRecipe();
    setMode('add'); setDraft(fresh); setBaseline(null); setBaseSig(recipeSignature(fresh)); setDeletedLines([]); setErrors({}); setFormError('');
    setBusy('number');
    try {
      const no = await fetchNextNo(API, token);
      if (!alive.current || id !== numberSeq.current) return;
      setDraft((p) => ({ ...p, recipeNo: no }));
      setBaseSig(recipeSignature({ ...fresh, recipeNo: no })); // the suggested number is not a "change"
    } catch (e: any) {
      if (alive.current && id === numberSeq.current) notifyError(e?.message || 'Could not get the next recipe number.', { title: 'Recipe number' });
    } finally { if (alive.current && id === numberSeq.current) setBusy(''); }
  };

  const startModify = (r: Recipe = draft) => {
    setBaseline(JSON.parse(JSON.stringify(r)));
    setBaseSig(recipeSignature(r));
    setDeletedLines([]); setErrors({}); setFormError('');
    setMode('modify');
  };
  const onModify = () => { if (hasRecipe && !busy && can.edit) startModify(); };

  const onCancel = () => {
    const leave = () => { if (mode === 'modify' && baseline) toView(baseline); else resetToBlank(); };
    if (!dirty) return leave();
    confirmBox('Discard changes?', 'Your changes to this recipe have not been saved.', 'Discard', leave, true, 'Keep editing');
  };

  const onSave = async () => {
    if (busy) return;
    const e = validateRecipe(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      setFormError(e.lines && Object.keys(e).length === 1 ? e.lines : 'Please fix the highlighted fields.');
      scroller.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setFormError(''); setBusy('save');
    try {
      const { recipe, message } = await saveRecipe(API, token, draft, mode === 'add' ? 'add' : 'modify', deletedLines, lk, mode === 'modify' ? baseline?.recipeNo || '' : '');
      if (!alive.current) return;
      const no = recipe?.recipeNo || draft.recipeNo;
      notifySuccess(message || `Recipe ${no} saved successfully.`, { title: mode === 'add' ? 'Recipe saved' : 'Recipe updated' });
      // server did not echo the saved recipe -> read it back (falls back to what was just saved)
      const shown: Recipe = recipe ?? (await fetchRecipe(API, token, no).catch(() => ({ ...draft, recipeNo: no })));
      if (alive.current) toView(shown);
    } catch (err: any) {
      if (alive.current) { setFormError(err?.message || 'Could not save the recipe.'); notifyError(err?.message || 'Could not save the recipe.', { title: 'Could not save' }); }
    } finally { if (alive.current) setBusy(''); }
  };

  const deleteByNo = (no: string, label: string, lineCount: number, after: () => void) => {
    confirmBox(
      'Delete this recipe?',
      `Recipe ${no}${label ? ` – ${label}` : ''}${lineCount ? ` with ${lineCount} chemical${lineCount === 1 ? '' : 's'}` : ''} will be permanently deleted. This cannot be undone.`,
      'Delete recipe',
      async () => {
        setBusy('delete');
        try {
          const message = await deleteRecipe(API, token, no);
          if (!alive.current) return;
          notifySuccess(message || `Recipe ${no} deleted successfully.`, { title: 'Recipe deleted' });
          after();
        } catch (err: any) { if (alive.current) notifyError(err?.message || 'Could not delete the recipe.', { title: 'Could not delete' }); }
        finally { if (alive.current) setBusy(''); }
      },
      true,
    );
  };
  const onDelete = () => { if (hasRecipe && !busy && can.del) deleteByNo(draft.recipeNo, draft.description, draft.lines.length, resetToBlank); };

  /* -------------------------------- browse --------------------------------- */
  const onPickBrowse = (r: BrowseRow) => { setBrowseOpen(false); openRecipe(r.recipeNo); };
  const onEditBrowse = (r: BrowseRow) => { setBrowseOpen(false); openRecipe(r.recipeNo, true); };

  /* ---------------------------- copy recipe -------------------------------- */
  const doCopy = async (row: BrowseRow) => {
    setCopyOpen(false); setBusy('copy');
    try {
      const src = await fetchRecipe(API, token, row.recipeNo);
      if (!alive.current) return;
      // Modify: chemicals that were already saved are being replaced, so tell the server to delete them
      const replaced = draft.lines.filter((l) => !/^new-/.test(l.id)).map((l) => l.id);
      if (replaced.length) setDeletedLines((d) => Array.from(new Set([...d, ...replaced])));
      setDraft((p) => copyFromRecipe(src, p));
      setErrors({}); setFormError('');
      notifySuccess(`Copied recipe ${src.recipeNo} – ${src.lines.length} chemical${src.lines.length === 1 ? '' : 's'}. Review it and press Save.`, { title: 'Recipe copied' });
      if (!src.lines.length) notifyInfo(`Recipe ${src.recipeNo} has no chemicals yet — add them below.`);
    } catch (e: any) { if (alive.current) notifyError(e?.message || 'Could not copy the recipe.', { title: 'Could not copy' }); }
    finally { if (alive.current) setBusy(''); }
  };
  const onPickCopy = (row: BrowseRow) => {
    if (draft.lines.length) confirmBox('Replace current chemicals?', `The ${draft.lines.length} chemical${draft.lines.length === 1 ? '' : 's'} already in this recipe will be replaced by those of recipe ${row.recipeNo}.`, 'Replace', () => doCopy(row), true);
    else doCopy(row);
  };

  /* ------------------------------ chemicals -------------------------------- */
  const addLine = () => {
    const last = draft.lines[draft.lines.length - 1];
    setLineEdit({ line: { ...emptyLine(), ...(last ? { groupCode: last.groupCode, groupName: last.groupName, calc: last.calc } : {}) }, isNew: true });
  };
  const saveLine = (l: RecipeLine, addNext: boolean) => {
    setDraft((p) => ({ ...p, lines: p.lines.some((x) => x.id === l.id) ? p.lines.map((x) => (x.id === l.id ? l : x)) : [...p.lines, l] }));
    if (errors.lines) setErrors((p) => ({ ...p, lines: undefined }));
    if (addNext) setLineEdit({ line: { ...emptyLine(), groupCode: l.groupCode, groupName: l.groupName, calc: l.calc }, isNew: true });
    else setLineEdit(null);
  };
  const removeLine = (l: RecipeLine) => {
    const wasSaved = !/^new-/.test(l.id);
    setDraft((p) => ({ ...p, lines: p.lines.filter((x) => x.id !== l.id) }));
    if (wasSaved) setDeletedLines((d) => [...d, l.id]);
    notifyInfo(`${l.itemName} removed from the recipe.`, {
      title: 'Chemical removed',
      action: {
        label: 'Undo',
        onPress: () => {
          setDraft((p) => (p.lines.some((x) => x.id === l.id) ? p : { ...p, lines: [...p.lines, l] }));
          if (wasSaved) setDeletedLines((d) => d.filter((x) => x !== l.id));
        },
      },
    });
  };

  useWebKeys(useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && editing && !lineEdit && !copyOpen) { e.preventDefault(); onSave(); }
  }, [editing, lineEdit, copyOpen, draft, deletedLines, mode, busy]), true); // eslint-disable-line react-hooks/exhaustive-deps

  /* --------------------------------- render -------------------------------- */
  if (!lookups && !lookupError) return <View style={st.screen} onLayout={onLayout}><ScreenSkeleton bp={bp} cols={cols} /></View>;
  if (!lookups) {
    return (
      <View style={[st.screen, { padding: 16 }]} onLayout={onLayout}>
        <Banner text={lookupError} action={{ label: 'Retry', onPress: loadLookups }} />
      </View>
    );
  }

  const gap = phone ? 12 : 14;
  const noRecipe = !editing && !draft.recipeNo;
  const statusLabel = lk.status.find((x) => x.id === draft.status)?.label || 'Active';

  const hero = (
    <View style={st.hero}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.eyebrow}>PROCESS CHEMICALS</Text>
          <Text style={st.heroTitle} numberOfLines={2}>
            {mode === 'add' ? `New recipe${draft.recipeNo ? ` #${draft.recipeNo}` : ''}` : draft.recipeNo ? `Recipe #${draft.recipeNo}${draft.description ? ` · ${draft.description}` : ''}` : 'No recipe open'}
          </Text>
          <Text style={st.heroSub}>{fmtDateLong(draft.date)}</Text>
        </View>
        {draft.recipeNo || editing ? <StatusPill kind={draft.status === 'P' ? 'passive' : 'active'} label={statusLabel} /> : null}
      </View>
      <View style={st.tiles}>
        {[['Groups', String(totals.groups)], ['Chemicals', String(totals.chemicals)], ['Total cost', fmtCost(totals.cost)]].map(([l, v]) => (
          <View key={l} style={[st.tile, { flex: 1 }]}><Text style={st.tileL}>{l}</Text><Text style={st.tileV} numberOfLines={1}>{v}</Text></View>
        ))}
      </View>
    </View>
  );

  const details = (
    <Card
      title="Recipe details"
      subtitle={editing ? 'Fields marked * are required' : undefined}
      stack={phone}
      right={editing ? <Btn icon="content-copy" label="Copy recipe" compact={!phone} onPress={() => setCopyOpen(true)} disabled={!!busy} flex={phone} /> : undefined}
    >
      <View style={st.grid}>
        <Cell cols={cols}>
          <Field label="Recipe no." required value={busy === 'number' ? '…' : draft.recipeNo} readOnly={!editing || busy === 'number'} keyboardType="numeric" maxLength={10}
            error={errors.recipeNo} onChangeText={(v) => set('recipeNo', v.replace(/[^0-9]/g, ''))} placeholder="—" />
        </Cell>
        <Cell cols={cols}>
          {editing ? (
            <RecipeDateField value={draft.date} onChange={(v) => set('date', v)} required error={errors.date} />
          ) : (
            <Field label="Date" value={fmtDate(draft.date)} readOnly />
          )}
        </Cell>
        <Cell cols={cols}>
          <SelectField label="Status" value={draft.status} options={lk.status} onChange={(v) => set('status', v)} disabled={!editing} />
        </Cell>
        <Cell cols={cols} span={cols === 3 ? 3 : cols}>
          <Field label="Description" required value={draft.description} readOnly={!editing} onChangeText={(v) => set('description', v)} error={errors.description} placeholder="e.g. 21/11/15 FC LT" autoCapitalize="characters" maxLength={60} />
        </Cell>
        <Cell cols={cols}>
          <SelectField label="Process" required value={draft.processCode} options={lk.processes} disabled={!editing} error={errors.processCode} placeholder="Select process"
            onChange={(v) => { set('processCode', v); set('processName', lk.processes.find((o) => o.id === v)?.label || ''); }} />
        </Cell>
        <Cell cols={cols}>
          <SelectField label="Item" value={draft.itemCode} options={lk.items} disabled={!editing} allowClear placeholder="Select item (optional)"
            onChange={(v) => { set('itemCode', v); set('itemName', lk.items.find((o) => o.id === v)?.label || ''); }} />
        </Cell>
        <Cell cols={cols}>
          <SelectField label="Location" value={draft.location} options={lk.locations} disabled={!editing} allowClear placeholder="Select location (optional)" onChange={(v) => set('location', v)} />
        </Cell>
        <Cell cols={cols}>
          <Field label="Page no." value={draft.pageNo} readOnly={!editing} keyboardType="numeric" error={errors.pageNo} onChangeText={(v) => set('pageNo', v.replace(/[^0-9]/g, '').slice(0, 5))} />
        </Cell>
      </View>
    </Card>
  );

  const chemicals = (
    <Card
      title="Recipe details"
      stack={phone}
      right={editing ? <Btn kind="primary" icon="add" label="Add chemical" compact={!phone} onPress={addLine} disabled={!!busy} flex={phone} /> : undefined}
    >
      {errors.lines ? <View style={{ marginBottom: 12 }}><Banner text={errors.lines} /></View> : null}
      {draft.lines.length ? (
        <RecipeGrid lines={draft.lines} bp={bp} editable={editing} onEdit={(l) => setLineEdit({ line: l, isNew: false })} onDelete={removeLine} />
      ) : (
        <EmptyState icon="science" title={editing ? 'No chemicals added yet' : noRecipe ? 'No recipe open' : 'This recipe has no chemicals'}
          message={editing ? 'Add chemicals and quantities — or copy an existing recipe.' : noRecipe ? `Open a recipe with Browse${can.add ? ', or press Add to create a new one' : ''}.` : 'Press Modify to add chemicals.'}
          action={editing ? <Btn kind="primary" icon="add" label="Add chemical" onPress={addLine} /> : undefined} />
      )}
    </Card>
  );

  const showIcons = !phone;
  const actionBar = (
    <View style={st.actions}>
      <View style={[st.actionsInner, { maxWidth: CONTENT_MAX }]}>
        {editing ? (
          <>
            {!phone ? (
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  {dirty ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.amber }} /> : null}
                  <Text style={st.hint}>{dirty ? 'Unsaved changes' : 'No changes yet'}</Text>
                </View>
                {bp === 'desktop' ? <Text style={st.hintSub}>Press Ctrl+S to save</Text> : null}
              </View>
            ) : null}
            <Btn label="Cancel" onPress={onCancel} disabled={busy === 'save'} flex={phone} />
            <Btn kind="primary" icon={showIcons ? 'check' : undefined} label={mode === 'add' ? 'Save recipe' : 'Save changes'} onPress={onSave} loading={busy === 'save'} disabled={busy === 'number' || busy === 'copy'} flex={phone} />
          </>
        ) : (
          <>
            {can.add ? <Btn kind="primary" icon={showIcons ? 'add' : undefined} label="Add" onPress={onAdd} disabled={!!busy} flex /> : null}
            {can.edit ? <Btn icon={showIcons ? 'edit' : undefined} label="Modify" onPress={onModify} disabled={!hasRecipe || !!busy} flex /> : null}
            {!phone && can.del ? <Btn kind="danger" icon="delete-outline" label="Delete" onPress={onDelete} disabled={!hasRecipe || !!busy} loading={busy === 'delete'} flex /> : null}
            <Btn icon={showIcons ? 'search' : undefined} label="Browse" onPress={() => setBrowseOpen(true)} disabled={!!busy} flex />
            {!phone ? (
              <Btn icon="refresh" iconOnly onPress={() => openRecipe(draft.recipeNo)} disabled={!hasRecipe || !!busy} accessibilityLabel="Reload recipe" />
            ) : (
              <Btn icon="more-horiz" iconOnly onPress={() => setMoreOpen(true)} accessibilityLabel="More actions" />
            )}
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={st.screen} onLayout={onLayout}>
      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={[st.content, phone && { padding: 12, gap: 12 }]}>
        <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap }}>
          {USE_MOCK ? <Banner tone="info" text="Demo data — the Process Chemicals API is not connected yet. Changes live in memory only." /> : null}
          {formError ? <Banner text={formError} /> : null}
          {hero}
          {busy === 'load' ? (
            <FormSkeleton bp={bp} cols={cols} />
          ) : (
            <View style={{ gap }}>
              {details}
              {chemicals}
            </View>
          )}
        </View>
      </ScrollView>

      {actionBar}

      <Sheet visible={moreOpen} title="More actions" onClose={() => setMoreOpen(false)} size="sm">
        <View style={{ gap: 8, padding: 4 }}>
          <Btn icon="refresh" label="Reload recipe" disabled={!hasRecipe || !!busy} onPress={() => { setMoreOpen(false); openRecipe(draft.recipeNo); }} />
          {can.del ? <Btn kind="danger" icon="delete-outline" label="Delete recipe" disabled={!hasRecipe || !!busy} onPress={() => { setMoreOpen(false); onDelete(); }} /> : null}
        </View>
      </Sheet>

      <RecipeHelpSheet visible={browseOpen} mode="browse" API={API} token={token} activeNo={hasRecipe ? draft.recipeNo : undefined}
        onClose={() => setBrowseOpen(false)} onPick={onPickBrowse} onEdit={can.edit ? onEditBrowse : undefined} />
      <RecipeHelpSheet visible={copyOpen} mode="copy" API={API} token={token} activeNo={draft.recipeNo} onClose={() => setCopyOpen(false)} onPick={onPickCopy} />
      <LineSheet visible={!!lineEdit} line={lineEdit?.line ?? null} isNew={!!lineEdit?.isNew} lookups={lk}
        others={draft.lines.filter((x) => x.id !== lineEdit?.line.id)} onSave={saveLine} onClose={() => setLineEdit(null)} />
      <NoticeHost />
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, gap: 14, flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  hero: { backgroundColor: T.nav, borderRadius: 16, padding: 14, gap: 12 },
  eyebrow: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, color: '#E0A56B' },
  heroTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  heroSub: { fontSize: 12.5, color: '#9FB0C6', marginTop: 2 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minWidth: 0 },
  tileL: { fontSize: 11, fontWeight: '600', color: '#9FB0C6' },
  tileV: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginTop: 1 },
  actions: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, alignItems: 'center' },
  actionsInner: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  hint: { fontSize: 13, fontWeight: '700', color: T.ink },
  hintSub: { fontSize: 11.5, color: T.muted, marginTop: 1 },
});
