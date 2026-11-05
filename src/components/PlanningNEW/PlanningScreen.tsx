// FILE: src/components/PlanningNEW/PlanningScreen.tsx
// NEW ERP — Yarn Dyeing › Planning (production planning entry).   Route key: 'planning'.
//
// Modes    view → Add / Modify / Delete / Browse          add / modify → Save / Cancel
// Type     Dyeing | Coning | Checking (Grading)
//   Dyeing            Item help (Sales / Job Orders) → Shade help (unique shades of the picked item) → Total Qty → Machine.  NO merge.
//   Coning / Checking same + Merge (stock merges only); the sales-order item-wise remarks are pulled into Remarks.
// Removed  (on purpose, per the requirement) the three check-boxes under Machine (AutoClave, Soft Packaging, Coning With Oil).
// Total    Total Quantity is the live sum of the grid; the (?) button opens the Order · Item · Party · Qty help and checks what is left.
// Browse   list with an Edit icon per row — NO delete in Browse. Delete exists only on the opened plan (and only while Pending).
// Layout   measured on the screen's OWN width (sidebar excluded):  phone < 560 → 1 column, order cards, bottom action bar ·
//          tablet ≥ 560 → 2 columns · desktop ≥ 900 → 3 columns, full table, Ctrl+S.
// Theme    light tokens T only — the app-wide dark theme converts them.   Data  ./api.ts (USE_MOCK = demo data).
import { AppAlert } from '@/common/utils/appAlert';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import RecipeDateField from '../ProcessChemicalsNEW/RecipeDateField';
import { NoticeHost, notifyError, notifyInfo, notifySuccess } from '../StoreItemMasterNew/Notice';
import { FormSkeleton, ScreenSkeleton } from '../StoreItemMasterNew/Skeleton';
import { Banner, Btn, Card, Cell, EmptyState, Field, FieldError, FieldLabel, SelectField, Sheet, StatusPill, u, useContainerWidth, useWebKeys } from '../StoreItemMasterNew/ui';
import { USE_MOCK, deletePlan, fetchLookups, fetchNextNo, fetchPlan, fetchShades, savePlan } from './api';
import {
  BrowseRow, CONTENT_MAX, Lookups, Mode, Opt, PLAN_TYPES, Plan, PlanErrors, PlanLine, PlanType, SourceRow,
  emptyLookups, emptyPlan, fmtDate, fmtDateLong, fmtQty, formColumns, isPending, joinRemarks, planSignature, shadesOf, sourceToLine, totalQty, typeLabel, usesMerge, validatePlan, voucherLabel, withType,
} from './model';
import PlanBrowseSheet from './PlanBrowseSheet';
import PlanGrid from './PlanGrid';
import QtyHelpSheet from './QtyHelpSheet';
import SourceSheet from './SourceSheet';

type Props = { token: string; API: string; username?: string };

/** Permission resource registered in registry/modules/production.module.ts */
export const PLANNING_RESOURCE = 'production.planning';

const confirmBox = (title: string, message: string, yes: string, onYes: () => void, destructive = false, no = 'Cancel') =>
  AppAlert.alert(title, message, [{ text: no, style: 'cancel' }, { text: yes, style: destructive ? 'destructive' : 'default', onPress: onYes }]);

/** A field that looks like the other inputs but opens a help sheet (legacy "?" button). */
function HelpBox({ label, value, placeholder, icon = 'search', onPress, disabled, required, error }: {
  label: string; value: string; placeholder: string; icon?: string; onPress: () => void; disabled?: boolean; required?: boolean; error?: string;
}) {
  return (
    <View>
      <FieldLabel label={label} required={required} />
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label}: ${value || placeholder}. Open help`}
        style={(p: any) => [u.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, disabled && { backgroundColor: T.sub }, !!error && { borderColor: T.red }, p.hovered && !disabled && { borderColor: T.copper }]}>
        <Text style={{ flex: 1, fontSize: 15, color: value ? T.ink : T.muted }} numberOfLines={1}>{value || placeholder}</Text>
        {!disabled ? <Icon name={icon} size={20} color={T.copper} /> : null}
      </Pressable>
      <FieldError text={error} />
    </View>
  );
}

export default function PlanningScreen({ token, API }: Props) {
  const { bp, onLayout } = useContainerWidth();
  const cols = formColumns(bp);
  const phone = bp === 'phone';
  const { canDo } = usePermission();
  const can = { add: canDo(PLANNING_RESOURCE, 'add'), edit: canDo(PLANNING_RESOURCE, 'edit'), del: canDo(PLANNING_RESOURCE, 'delete') };

  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState<Plan>(emptyPlan());
  const [baseSig, setBaseSig] = useState('');
  const [baseline, setBaseline] = useState<Plan | null>(null);
  const [deletedLines, setDeletedLines] = useState<string[]>([]);
  const [errors, setErrors] = useState<PlanErrors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState<'' | 'load' | 'save' | 'delete' | 'number'>('');
  const [browseOpen, setBrowseOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shadeOpts, setShadeOpts] = useState<Opt[]>([]);
  const alive = useRef(true);
  const scroller = useRef<ScrollView>(null);
  const numberSeq = useRef(0);
  const autoRemark = useRef('');

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const editing = mode !== 'view';
  const hasPlan = !!draft.voucherNo && !editing;
  const lk = lookups ?? emptyLookups();
  const dirty = editing && planSignature(draft) !== baseSig;
  const total = totalQty(draft.lines);
  const pending = isPending(draft);
  const merge = usesMerge(draft.type);
  const stockMerges = useMemo(() => lk.merges.filter((m) => m.stock), [lk.merges]);

  /* ---------------------------- initial lookups ---------------------------- */
  const loadLookups = useCallback(async () => {
    setLookupError('');
    try { const l = await fetchLookups(API, token); if (alive.current) setLookups(l); }
    catch (e: any) { if (alive.current) setLookupError(e?.message || 'Could not load the lists.'); }
  }, [API, token]);
  useEffect(() => { loadLookups(); }, [loadLookups]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty || typeof window === 'undefined') return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // Shade help = the UNIQUE shades of the item(s) currently in the grid
  const itemSig = useMemo(() => Array.from(new Set(draft.lines.map((l) => l.itemCode))).join(','), [draft.lines]);
  useEffect(() => {
    if (!editing || !itemSig) { setShadeOpts([]); return; }
    let live = true;
    const local = shadesOf(draft.lines);
    setShadeOpts(local);
    fetchShades(API, token, itemSig.split(',')).then((o) => { if (live && o.length) setShadeOpts(o); }).catch(() => { /* keep the local list */ });
    return () => { live = false; };
  }, [editing, itemSig, API, token]); // eslint-disable-line react-hooks/exhaustive-deps
  const shadeOptions = useMemo(() => (draft.shadeCode && !shadeOpts.some((o) => o.id === draft.shadeCode) ? [{ id: draft.shadeCode, label: draft.shadeName || draft.shadeCode }, ...shadeOpts] : shadeOpts), [shadeOpts, draft.shadeCode, draft.shadeName]);
  const machineOptions = useMemo(() => lk.machines.map((m) => ({ id: m.id, label: m.group ? `${m.label}  ·  ${m.group}` : m.label })), [lk.machines]);

  /* -------------------------------- helpers -------------------------------- */
  const set = <K extends keyof Plan>(k: K, v: Plan[K]) => {
    setDraft((p) => ({ ...p, [k]: v }));
    if (errors[k as keyof PlanErrors]) setErrors((p) => ({ ...p, [k]: undefined }));
  };
  const toView = (p: Plan) => {
    numberSeq.current++; autoRemark.current = '';
    setMode('view'); setDraft(p); setBaseline(null); setBaseSig(''); setDeletedLines([]); setErrors({}); setFormError('');
  };
  const resetToBlank = () => toView(emptyPlan());

  /* -------------------------------- actions -------------------------------- */
  const startModify = (p: Plan = draft) => {
    setBaseline(JSON.parse(JSON.stringify(p))); setBaseSig(planSignature(p)); setDeletedLines([]); setErrors({}); setFormError(''); autoRemark.current = '';
    setMode('modify');
  };
  const openPlan = async (no: string, thenModify = false) => {
    setBusy('load'); setFormError('');
    try {
      const p = await fetchPlan(API, token, no);
      if (!alive.current) return;
      toView(p);
      if (thenModify) {
        if (!isPending(p)) notifyInfo(`Planning ${voucherLabel(p)} is already ${String(p.status).toLowerCase()} and cannot be modified.`, { title: 'Not editable' });
        else startModify(p);
      }
      scroller.current?.scrollTo({ y: 0, animated: false });
    } catch (e: any) { if (alive.current) notifyError(e?.message || 'Could not open the plan.', { title: 'Could not open' }); }
    finally { if (alive.current) setBusy(''); }
  };

  const onAdd = async () => {
    if (busy || !can.add) return;
    const id = ++numberSeq.current;
    const fresh = emptyPlan();
    autoRemark.current = '';
    setMode('add'); setDraft(fresh); setBaseline(null); setBaseSig(planSignature(fresh)); setDeletedLines([]); setErrors({}); setFormError('');
    setBusy('number');
    try {
      const n = await fetchNextNo(API, token);
      if (!alive.current || id !== numberSeq.current) return;
      setDraft((p) => ({ ...p, prefix: n.prefix, voucherNo: n.no }));
      setBaseSig(planSignature({ ...fresh, voucherNo: n.no }));
    } catch (e: any) {
      if (alive.current && id === numberSeq.current) notifyError(e?.message || 'Could not get the next voucher number.', { title: 'Voucher number' });
    } finally { if (alive.current && id === numberSeq.current) setBusy(''); }
  };

  const onModify = () => {
    if (!hasPlan || busy || !can.edit) return;
    if (!pending) { notifyInfo(`Planning ${voucherLabel(draft)} is already ${String(draft.status).toLowerCase()} and cannot be modified.`, { title: 'Not editable' }); return; }
    startModify();
  };
  const onCancel = () => {
    const leave = () => { if (mode === 'modify' && baseline) toView(baseline); else resetToBlank(); };
    if (!dirty) return leave();
    confirmBox('Discard changes?', 'Your changes to this plan have not been saved.', 'Discard', leave, true, 'Keep editing');
  };

  const onSave = async () => {
    if (busy) return;
    const e = validatePlan(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      setFormError(e.lines && Object.keys(e).length === 1 ? e.lines : 'Please fix the highlighted fields.');
      scroller.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setFormError(''); setBusy('save');
    try {
      const { plan, message } = await savePlan(API, token, { ...draft, remarks: draft.remarks }, mode === 'add' ? 'add' : 'modify', deletedLines, mode === 'modify' ? baseline?.voucherNo || '' : '');
      if (!alive.current) return;
      const no = plan?.voucherNo || draft.voucherNo;
      notifySuccess(message || `Planning ${no} saved successfully.`, { title: mode === 'add' ? 'Plan saved' : 'Plan updated' });
      const shown: Plan = plan ?? (await fetchPlan(API, token, no).catch(() => ({ ...draft, voucherNo: no })));
      if (alive.current) toView(shown);
    } catch (err: any) {
      if (alive.current) { setFormError(err?.message || 'Could not save the plan.'); notifyError(err?.message || 'Could not save the plan.', { title: 'Could not save' }); }
    } finally { if (alive.current) setBusy(''); }
  };

  const onDelete = () => {
    if (!hasPlan || busy || !can.del) return;
    if (!pending) { notifyInfo(`Planning ${voucherLabel(draft)} is already ${String(draft.status).toLowerCase()} and cannot be deleted.`, { title: 'Not deletable' }); return; }
    confirmBox('Delete this plan?', `Planning ${voucherLabel(draft)} (${typeLabel(draft.type)}, ${fmtQty(total)}) will be permanently deleted. This cannot be undone.`, 'Delete plan', async () => {
      setBusy('delete');
      try {
        const message = await deletePlan(API, token, draft.voucherNo);
        if (!alive.current) return;
        notifySuccess(message || `Planning ${voucherLabel(draft)} deleted successfully.`, { title: 'Plan deleted' });
        resetToBlank();
      } catch (err: any) { if (alive.current) notifyError(err?.message || 'Could not delete the plan.', { title: 'Could not delete' }); }
      finally { if (alive.current) setBusy(''); }
    }, true);
  };

  /* -------------------------------- browse --------------------------------- */
  const onPickBrowse = (r: BrowseRow) => { setBrowseOpen(false); openPlan(r.voucherNo); };
  const onEditBrowse = (r: BrowseRow) => { setBrowseOpen(false); openPlan(r.voucherNo, true); };

  /* ----------------------------- type / orders ----------------------------- */
  const changeType = (t: string) => {
    const next = t as PlanType;
    if (next === draft.type) return;
    const apply = () => {
      autoRemark.current = '';
      const saved = draft.lines.filter((l) => !/^new-/.test(l.id)).map((l) => l.id);
      if (saved.length) setDeletedLines((d) => Array.from(new Set([...d, ...saved])));
      setDraft((p) => ({ ...withType(p, next), lines: [], itemCode: '', itemName: '', shadeCode: '', shadeName: '', remarks: '' }));
      setErrors({});
    };
    if (draft.lines.length) confirmBox('Change plan type?', `The ${draft.lines.length} selected order${draft.lines.length === 1 ? '' : 's'} will be cleared because each type has its own order list.`, 'Change type', apply, true, 'Keep');
    else setDraft((p) => withType(p, next));
  };

  const applySources = (rows: SourceRow[]) => {
    setSourceOpen(false);
    const added = rows.map(sourceToLine);
    const lines = [...draft.lines, ...added];
    const first = lines[0];
    const patch: Partial<Plan> = { lines, itemCode: first.itemCode, itemName: first.itemName };
    // one shade for the item → pick it for the user; several → the user chooses from the Shade help
    const shades = shadesOf(lines);
    if (!draft.shadeCode && shades.length === 1) { patch.shadeCode = shades[0].id; patch.shadeName = shades[0].label; }
    // Coning / Checking: pull the sales-order item-wise remarks into Remarks (unless the user wrote their own)
    if (merge) {
      const pulled = joinRemarks(lines);
      if (pulled && (!draft.remarks.trim() || draft.remarks === autoRemark.current)) { patch.remarks = pulled; autoRemark.current = pulled; }
    }
    setDraft((p) => ({ ...p, ...patch }));
    setErrors((p) => ({ ...p, lines: undefined, qty: undefined, shadeCode: patch.shadeCode ? undefined : p.shadeCode }));
    if (patch.remarks) notifyInfo('Sales order remarks were copied into Remarks.', { title: 'Remarks' });
  };

  const setQty = (id: string, qty: string) => {
    setDraft((p) => ({ ...p, lines: p.lines.map((l) => (l.id === id ? { ...l, qty } : l)) }));
    if (errors.qty?.[id]) setErrors((p) => ({ ...p, qty: { ...p.qty, [id]: '' } }));
  };
  const applyQtys = (m: Record<string, string>) => {
    setQtyOpen(false);
    setDraft((p) => ({ ...p, lines: p.lines.map((l) => (m[l.id] !== undefined ? { ...l, qty: m[l.id] } : l)) }));
    setErrors((p) => ({ ...p, qty: undefined }));
  };
  const removeLine = (l: PlanLine) => {
    const wasSaved = !/^new-/.test(l.id);
    const left = draft.lines.filter((x) => x.id !== l.id);
    setDraft((p) => ({
      ...p, lines: left, ...(left.length ? {} : { itemCode: '', itemName: '', shadeCode: '', shadeName: '' }),
      ...(left.length && p.shadeCode && !shadesOf(left).some((s) => s.id === p.shadeCode) ? { shadeCode: '', shadeName: '' } : {}),
    }));
    if (wasSaved) setDeletedLines((d) => [...d, l.id]);
    notifyInfo(`Order ${l.orderNo} removed from the plan.`, {
      title: 'Order removed',
      action: { label: 'Undo', onPress: () => { setDraft((p) => (p.lines.some((x) => x.id === l.id) ? p : { ...p, lines: [...p.lines, l], itemCode: l.itemCode, itemName: l.itemName })); if (wasSaved) setDeletedLines((d) => d.filter((x) => x !== l.id)); } },
    });
  };

  useWebKeys(useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && editing && !sourceOpen && !qtyOpen) { e.preventDefault(); onSave(); }
  }, [editing, sourceOpen, qtyOpen, draft, deletedLines, mode, busy]), true); // eslint-disable-line react-hooks/exhaustive-deps

  /* --------------------------------- render -------------------------------- */
  if (!lookups && !lookupError) return <View style={st.screen} onLayout={onLayout}><ScreenSkeleton bp={bp} cols={cols} /></View>;
  if (!lookups) return <View style={[st.screen, { padding: 16 }]} onLayout={onLayout}><Banner text={lookupError} action={{ label: 'Retry', onPress: loadLookups }} /></View>;

  const gap = phone ? 12 : 14;
  const noPlan = !editing && !draft.voucherNo;

  const hero = (
    <View style={st.hero}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.eyebrow}>YARN DYEING  ·  PLANNING</Text>
          <Text style={st.heroTitle} numberOfLines={2}>
            {mode === 'add' ? `New plan${draft.voucherNo ? ` #${voucherLabel(draft)}` : ''}` : draft.voucherNo ? `Plan #${voucherLabel(draft)} · ${typeLabel(draft.type)}` : 'No plan open'}
          </Text>
          <Text style={st.heroSub}>{fmtDateLong(draft.date)}</Text>
        </View>
        {draft.voucherNo || editing ? <StatusPill kind={pending ? 'noInward' : 'active'} label={editing ? (mode === 'add' ? 'New' : 'Editing') : String(draft.status || 'Pending')} /> : null}
      </View>
      <View style={st.tiles}>
        {[['Orders', String(draft.lines.length)], ['Total qty', fmtQty(total)], ['Machine', draft.machineName || '—']].map(([l, v]) => (
          <View key={l} style={[st.tile, { flex: 1 }]}><Text style={st.tileL}>{l}</Text><Text style={st.tileV} numberOfLines={1}>{v}</Text></View>
        ))}
      </View>
    </View>
  );

  const details = (
    <Card title="Planning details" subtitle={editing ? 'Fields marked * are required' : undefined} stack={phone}>
      <View style={st.grid}>
        <Cell cols={cols}>
          {editing ? <RecipeDateField label="Voucher date" value={draft.date} onChange={(v) => set('date', v)} required error={errors.date} /> : <Field label="Voucher date" value={fmtDate(draft.date)} readOnly />}
        </Cell>
        <Cell cols={cols}><Field label="Voucher no." value={busy === 'number' ? '…' : voucherLabel(draft)} placeholder="—" /></Cell>
        <Cell cols={cols}>
          <SelectField label="Type" required value={draft.type} options={PLAN_TYPES.map((t) => ({ id: t.id, label: t.label }))} onChange={changeType} disabled={mode === 'view'} error={errors.type} />
        </Cell>
        <Cell cols={cols}>
          <SelectField label="Process" required value={draft.processCode} options={lk.processes} disabled={!editing} error={errors.processCode} placeholder="Select process"
            onChange={(v) => { set('processCode', v); set('processName', lk.processes.find((o) => o.id === v)?.label || ''); }} />
        </Cell>
        <Cell cols={cols}>
          <HelpBox label="Item" required value={draft.itemName ? `${draft.itemCode} · ${draft.itemName}` : ''} placeholder={editing ? 'Pick from Sales / Job Orders' : '—'} disabled={!editing}
            onPress={() => setSourceOpen(true)} error={errors.lines && !draft.lines.length ? 'Pick at least one order.' : undefined} />
        </Cell>
        <Cell cols={cols}>
          <SelectField label="Shade" required value={draft.shadeCode} options={shadeOptions} disabled={!editing || !draft.lines.length} error={errors.shadeCode}
            placeholder={draft.lines.length ? 'Select shade' : 'Pick the item first'} onChange={(v) => { set('shadeCode', v); set('shadeName', shadeOptions.find((o) => o.id === v)?.label || ''); }} />
        </Cell>
        {merge ? (
          <Cell cols={cols}>
            <SelectField label="Merge (stock)" value={draft.mergeCode} options={stockMerges} disabled={!editing} allowClear error={errors.mergeCode} placeholder="Select stock merge"
              onChange={(v) => { set('mergeCode', v); set('mergeName', stockMerges.find((o) => o.id === v)?.label || ''); }} />
          </Cell>
        ) : null}
        <Cell cols={cols}>
          <HelpBox label="Total quantity" icon="help-outline" value={draft.lines.length ? fmtQty(total) : ''} placeholder="0.000" onPress={() => setQtyOpen(true)} disabled={!draft.lines.length} />
        </Cell>
        <Cell cols={cols}>
          <SelectField label="Machine" required value={draft.machineCode} options={machineOptions} disabled={!editing} error={errors.machineCode} placeholder="Select machine"
            onChange={(v) => { set('machineCode', v); set('machineName', lk.machines.find((o) => o.id === v)?.label || ''); }} />
        </Cell>
        <Cell cols={cols} span={cols === 3 ? 3 : cols}>
          <Field label="Remarks" value={draft.remarks} readOnly={!editing} onChangeText={(v) => set('remarks', v)} placeholder={merge ? 'Sales order remarks are pulled here' : 'Optional'} maxLength={250} />
        </Cell>
      </View>
    </Card>
  );

  const orders = (
    <Card title="Orders to plan" subtitle={draft.lines.length ? `${draft.lines.length} order${draft.lines.length === 1 ? '' : 's'} · total ${fmtQty(total)}` : undefined} stack={phone}
      right={editing ? <Btn kind="primary" icon="playlist-add" label="Pick orders" compact={!phone} onPress={() => setSourceOpen(true)} disabled={!!busy} flex={phone} /> : undefined}>
      {errors.lines ? <View style={{ marginBottom: 12 }}><Banner text={errors.lines} /></View> : null}
      {draft.lines.length ? (
        <PlanGrid lines={draft.lines} bp={bp} editable={editing} qtyErrors={Object.fromEntries(Object.entries(errors.qty ?? {}).filter(([, v]) => v))} onQty={setQty} onRemove={removeLine} />
      ) : (
        <EmptyState icon="event-note" title={editing ? 'No orders picked yet' : noPlan ? 'No plan open' : 'This plan has no orders'}
          message={editing ? 'Use Item help to pick pending Sales Orders / Job Orders for this plan.' : noPlan ? `Open a plan with Browse${can.add ? ', or press Add to create a new one' : ''}.` : 'Press Modify to add orders.'}
          action={editing ? <Btn kind="primary" icon="playlist-add" label="Pick orders" onPress={() => setSourceOpen(true)} /> : undefined} />
      )}
    </Card>
  );

  const showIcons = !phone;
  const notEditable = hasPlan && !pending;
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
            <Btn kind="primary" icon={showIcons ? 'check' : undefined} label={mode === 'add' ? 'Save plan' : 'Save changes'} onPress={onSave} loading={busy === 'save'} disabled={busy === 'number'} flex={phone} />
          </>
        ) : (
          <>
            {can.add ? <Btn kind="primary" icon={showIcons ? 'add' : undefined} label="Add" onPress={onAdd} disabled={!!busy} flex /> : null}
            {can.edit ? <Btn icon={showIcons ? 'edit' : undefined} label="Modify" onPress={onModify} disabled={!hasPlan || !!busy || notEditable} flex /> : null}
            {!phone && can.del ? <Btn kind="danger" icon="delete-outline" label="Delete" onPress={onDelete} disabled={!hasPlan || !!busy || notEditable} loading={busy === 'delete'} flex /> : null}
            <Btn icon={showIcons ? 'search' : undefined} label="Browse" onPress={() => setBrowseOpen(true)} disabled={!!busy} flex />
            {!phone ? <Btn icon="refresh" iconOnly onPress={() => openPlan(draft.voucherNo)} disabled={!hasPlan || !!busy} accessibilityLabel="Reload plan" />
              : <Btn icon="more-horiz" iconOnly onPress={() => setMoreOpen(true)} accessibilityLabel="More actions" />}
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={st.screen} onLayout={onLayout}>
      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={[st.content, phone && { padding: 12, gap: 12 }]}>
        <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap }}>
          {USE_MOCK ? <Banner tone="info" text="Demo data — the Planning API is not connected yet. Changes live in memory only." /> : null}
          {notEditable ? <Banner tone="info" text={`This plan is ${String(draft.status).toLowerCase()} — it can no longer be modified or deleted.`} /> : null}
          {formError ? <Banner text={formError} /> : null}
          {hero}
          {busy === 'load' ? <FormSkeleton bp={bp} cols={cols} /> : <View style={{ gap }}>{details}{orders}</View>}
        </View>
      </ScrollView>
      {actionBar}

      <Sheet visible={moreOpen} title="More actions" onClose={() => setMoreOpen(false)} size="sm">
        <View style={{ gap: 8, padding: 4 }}>
          <Btn icon="refresh" label="Reload plan" disabled={!hasPlan || !!busy} onPress={() => { setMoreOpen(false); openPlan(draft.voucherNo); }} />
          {can.del ? <Btn kind="danger" icon="delete-outline" label="Delete plan" disabled={!hasPlan || !!busy || notEditable} onPress={() => { setMoreOpen(false); onDelete(); }} /> : null}
        </View>
      </Sheet>

      <PlanBrowseSheet visible={browseOpen} API={API} token={token} activeNo={hasPlan ? draft.voucherNo : undefined} onClose={() => setBrowseOpen(false)} onPick={onPickBrowse} onEdit={can.edit ? onEditBrowse : undefined} />
      <SourceSheet visible={sourceOpen} API={API} token={token} type={draft.type} processCode={draft.processCode} lockedItem={draft.lines[0]?.itemCode ?? ''}
        taken={draft.lines.map((l) => `${l.kind}|${l.orderNo}|${l.itemCode}|${l.shadeCode}`)} onClose={() => setSourceOpen(false)} onApply={applySources} />
      <QtyHelpSheet visible={qtyOpen} lines={draft.lines} editable={editing} onClose={() => setQtyOpen(false)} onApply={applyQtys} />
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
