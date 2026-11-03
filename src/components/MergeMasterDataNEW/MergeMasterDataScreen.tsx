// FILE: src/components/MergeMasterDataNEW/MergeMasterDataScreen.tsx
// Merge Master Data
//   1. Property dropdown   -> GET  properties   (prpcode=MT, yearno from login, txntype)
//   2. MAIN panel | MERGE panel — show-data, mstcode = selected property (side by side on tablet / desktop, stacked on phone)
//   3. Action dropdown     (Passive / Delete)
//   4. Save / Merge button -> POST merge        (single button, confirmation first)
//
// Production safety:
//   • double-click / double-tap safe (submit lock) · stale responses ignored (request ids)
//   • same record can never be both MAIN and MERGE · Delete needs an extra acknowledgement
//   • permission `production.merge_master_data` → action `merge` is required to submit
//   • server messages are shown exactly as received · state resets after success and the lists reload
import { fetchPropertyGroupDataDCR } from '../../common/API/FunctionsNEW'; // same Property Group API as Daily Collection Report
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ApiError, detailsOf, fetchProperties, fetchRecords, isCancelled, messageOf, postMerge, readLoginPrpType, readLoginYearNo } from './api';
import { MasterPanel } from './MasterPanel';
import {
  ACTION_OPTIONS,
  CONTENT_MAX,
  Column,
  extractList,
  MasterRow,
  MergeAction,
  PERMISSION_RESOURCE,
  PropertyOpt,
  REMOVED_SIDE,
  SIDE_BY_SIDE_MIN,
} from './model';
import { ActionSelect, Banner, BannerState, Btn, Card, ConfirmDialog, PropertySelect, ResultDialog, StepLabel, useContainerWidth } from './ui';

type Props = { token: string; API: string; username?: string };

export default function MergeMasterDataScreen({ token, API, username }: Props) {
  const { width, bp, onLayout } = useContainerWidth();
  const { height: winH } = useWindowDimensions();
  const permission = usePermission();
  const canMerge = useMemo(() => {
    try { return !!permission.canDo(PERMISSION_RESOURCE, 'merge'); } catch { return false; }
  }, [permission]);

  const [yearNo, setYearNo] = useState('');
  /** prptype = PrpOf of the selected Property Group (same dropdown as Daily Collection Report) */
  const prptypeRef = useRef('');
  const [yearError, setYearError] = useState('');

  const [groups, setGroups] = useState<PropertyOpt[]>([]);
  const [groupLoading, setGroupLoading] = useState(true);
  const [groupError, setGroupError] = useState('');
  /** Selected Property Group's PrpOf (R, S, M ...) -> sent as `prptype` in every API of this screen. */
  const [group, setGroup] = useState('');

  const [properties, setProperties] = useState<PropertyOpt[]>([]);
  const [propLoading, setPropLoading] = useState(true);
  const [propError, setPropError] = useState('');
  const [property, setProperty] = useState('');

  const [rows, setRows] = useState<MasterRow[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState('');

  const [fromCode, setFromCode] = useState('');
  const [toCode, setToCode] = useState('');
  const [action, setAction] = useState<MergeAction | ''>('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [refreshing, setRefreshing] = useState(false);
  /** Outcome of the Save / Merge API — shown in the result dialog (snapshot, so it survives the list reload). */
  const [result, setResult] = useState<null | {
    kind: 'success' | 'error';
    message: string;
    details: string;
    main?: MasterRow;
    merge?: MasterRow;
    property: string;
    actionLabel: string;
    /** false = no answer from the server (network / timeout) -> the merge may or may not have happened. */
    replied?: boolean;
  }>(null);

  const mounted = useRef(true);
  const submitLock = useRef(false);
  const propSeq = useRef(0);
  const rowsSeq = useRef(0);
  const propAbort = useRef<AbortController | null>(null);
  const rowsAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      propAbort.current?.abort();
      rowsAbort.current?.abort();
    };
  }, []);

  const showBanner = useCallback((kind: 'success' | 'error' | 'info', text: string) => {
    if (mounted.current) setBanner({ kind, text, id: Date.now() });
  }, []);
  const closeBanner = useCallback(() => setBanner(null), []);

  /* ------------------------------ lookups -------------------------------- */
  const loadRecords = useCallback(
    async (prop: string, year: string, silent = false) => {
      if (!prop || !year) return;
      rowsAbort.current?.abort();
      const ctl = new AbortController();
      rowsAbort.current = ctl;
      const seq = ++rowsSeq.current;
      if (!silent) setRowsLoading(true);
      setRowsError('');
      try {
        const list = await fetchRecords({ API, token, yearNo: year, prpType: prptypeRef.current, signal: ctl.signal }, prop);
        if (!mounted.current || seq !== rowsSeq.current) return;
        setRows(list.rows);
        setColumns(list.columns);
      } catch (e: any) {
        if (isCancelled(e) || !mounted.current || seq !== rowsSeq.current) return;
        setRows([]);
        setColumns([]);
        setRowsError(messageOf(e, 'Could not load records.'));
      } finally {
        if (mounted.current && seq === rowsSeq.current) setRowsLoading(false);
      }
    },
    [API, token],
  );

  const loadProperties = useCallback(
    async (year: string) => {
      propAbort.current?.abort();
      const ctl = new AbortController();
      propAbort.current = ctl;
      const seq = ++propSeq.current;
      setPropLoading(true);
      setPropError('');
      try {
        const list = await fetchProperties({ API, token, yearNo: year, prpType: prptypeRef.current, signal: ctl.signal });
        if (!mounted.current || seq !== propSeq.current) return;
        setProperties(list);
        if (!list.length) {
          setProperty('');
          setRows([]);
          return;
        }
        // Keep the user's choice if it still exists, otherwise open the first entry (same as the desktop ERP).
        setProperty((cur) => (list.some((x) => x.code === cur) ? cur : list[0].code));
      } catch (e: any) {
        if (isCancelled(e) || !mounted.current || seq !== propSeq.current) return;
        setProperties([]);
        setPropError(messageOf(e, 'Could not load the property list.'));
      } finally {
        if (mounted.current && seq === propSeq.current) setPropLoading(false);
      }
    },
    [API, token],
  );

  // Year comes from the login response; Property Group list comes from the same API as Daily Collection Report.
  useEffect(() => {
    let live = true;
    (async () => {
      const y = await readLoginYearNo();
      if (!live || !mounted.current) return;
      if (!y) {
        setYearError('Login year (YearNo) was not found. Please log out and log in again.');
        setPropLoading(false);
        setGroupLoading(false);
        return;
      }
      setYearError('');
      setYearNo(y);
    })();
    return () => { live = false; };
  }, [API]);

  useEffect(() => {
    if (!token) return;
    let live = true;
    (async () => {
      setGroupLoading(true);
      setGroupError('');
      try {
        const res: any = await fetchPropertyGroupDataDCR(token);
        const list: any[] = Array.isArray(res) ? res : extractList(res);
        const opts: PropertyOpt[] = [];
        for (const g of list) {
          const code = String(g?.PrpOf ?? '').trim();
          if (!code || opts.some((o) => o.code === code)) continue;
          opts.push({ code, name: String(g?.PrpOfFull ?? code).trim() || code, raw: g });
        }
        if (!live || !mounted.current) return;
        setGroups(opts);
        // Default = the group the user logged in with (if it is in the list); otherwise the user picks one.
        const loginType = await readLoginPrpType();
        if (!live || !mounted.current) return;
        setGroup((cur) => cur || (opts.some((o) => o.code === loginType) ? loginType : ''));
      } catch (e: any) {
        if (!live || !mounted.current) return;
        setGroups([]);
        setGroupError(messageOf(e, 'Could not load the property group list.'));
      } finally {
        if (live && mounted.current) setGroupLoading(false);
      }
    })();
    return () => { live = false; };
  }, [token, API]);

  // Property Group changed -> prptype changes -> reload Property dropdown and clear panels.
  useEffect(() => {
    prptypeRef.current = group;
    propAbort.current?.abort();
    rowsAbort.current?.abort();
    propSeq.current++;
    rowsSeq.current++;
    setProperty('');
    setProperties([]);
    setRows([]);
    setColumns([]);
    setRowsError('');
    setPropError('');
    setRowsLoading(false);
    setFromCode('');
    setToCode('');
    if (!group || !yearNo) { setPropLoading(false); return; }
    void loadProperties(yearNo);
  }, [group, yearNo, loadProperties]);

  // New property -> fresh panels.
  useEffect(() => {
    setFromCode('');
    setToCode('');
    setRows([]);
    if (property && yearNo) void loadRecords(property, yearNo);
  }, [property, yearNo, loadRecords]);

  const onRefresh = useCallback(async () => {
    if (!yearNo || !group) return;
    setRefreshing(true);
    await Promise.all([loadProperties(yearNo), property ? loadRecords(property, yearNo, true) : Promise.resolve()]);
    if (mounted.current) setRefreshing(false);
  }, [yearNo, group, property, loadProperties, loadRecords]);

  /* ------------------------------ derived -------------------------------- */
  const fromRow = useMemo(() => rows.find((r) => r.id === fromCode), [rows, fromCode]);
  const toRow = useMemo(() => rows.find((r) => r.id === toCode), [rows, toCode]);
  const propRow = useMemo(() => properties.find((x) => x.code === property), [properties, property]);
  const actionOpt = useMemo(() => ACTION_OPTIONS.find((o) => o.value === action), [action]);
  const same = !!fromRow && !!toRow && fromRow.code === toRow.code && fromRow.strCode === toRow.strCode;
  const ready = !!property && !!fromRow && !!toRow && !!actionOpt && !same;
  const sideBySide = width >= SIDE_BY_SIDE_MIN;
  const padding = bp === 'phone' ? 12 : 20;
  const panelHeight = sideBySide
    ? Math.max(340, Math.min(560, winH - 430))
    : bp === 'phone' ? 320 : 360;

  const missing = !property ? 'Select a property'
    : !fromRow ? 'Select a record in MAIN'
    : !toRow ? 'Select a record in MERGE'
    : same ? 'MAIN and MERGE cannot be the same record'
    : !actionOpt ? 'Select an action (Passive / Delete)'
    : '';

  /* ------------------------------ submit --------------------------------- */
  const askMerge = () => {
    if (!canMerge) { showBanner('error', 'You do not have permission to merge master data.'); return; }
    if (!ready) { showBanner('error', missing || 'Please complete all the fields.'); return; }
    setConfirmOpen(true);
  };

  const doMerge = async () => {
    if (submitLock.current || !ready || !actionOpt) return; // double-tap safe
    submitLock.current = true;
    setSubmitting(true);
    try {
      const msg = await postMerge(
        { API, token, yearNo, prpType: prptypeRef.current },
        {
          property,
          mainCode: fromRow!.code,
          mergeCode: toRow!.code,
          mainStrCode: fromRow!.strCode,
          mergeStrCode: toRow!.strCode,
          action: actionOpt.value,
        },
      );
      if (!mounted.current) return;
      setConfirmOpen(false);
      setResult({ kind: 'success', message: msg, details: '', main: fromRow, merge: toRow, property: propRow ? `${propRow.code} · ${propRow.name}` : property, actionLabel: actionOpt.label });
      setFromCode('');
      setToCode('');
      setAction('');
      void loadRecords(property, yearNo, true); // merged record disappears / turns passive
    } catch (e: any) {
      if (!mounted.current) return;
      setConfirmOpen(false);
      setResult({
        kind: 'error',
        message: e instanceof ApiError ? e.message : messageOf(e, 'Merge failed. Nothing was changed — please try again.'),
        details: detailsOf(e),
        main: fromRow,
        merge: toRow,
        property: propRow ? `${propRow.code} · ${propRow.name}` : property,
        actionLabel: actionOpt.label,
        replied: e instanceof ApiError || !!e?.response,
      });
    } finally {
      submitLock.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  const removedRow = REMOVED_SIDE === 'from' ? fromRow : toRow;
  const keptRow = REMOVED_SIDE === 'from' ? toRow : fromRow;
  const isDelete = actionOpt?.danger === true;
  const locked = submitting;

  /* -------------------------------- UI ----------------------------------- */
  return (
    <View style={s.root} onLayout={onLayout}>
      <ScrollView
        contentContainerStyle={{ padding, paddingBottom: 40, alignItems: 'center' }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.copper} />}
      >
        <View style={{ width: '100%', maxWidth: CONTENT_MAX, gap: 14 }}>
          {/* Title */}
          <View style={s.titleRow}>
            <View style={s.titleIcon}><Icon name="merge-type" size={22} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.title} accessibilityRole="header">Merge Master Data</Text>
              <Text style={s.subtitle}>
                Combine two master records into one. Pick the property, choose the MAIN and MERGE records, then Merge.
              </Text>
            </View>
            {username && bp !== 'phone' ? <Text style={s.user}>{username}</Text> : null}
          </View>

          <Banner banner={banner} onClose={closeBanner} />

          {yearError ? (
            <Card style={{ borderColor: T.red }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Icon name="error-outline" size={22} color={T.red} />
                <Text style={{ flex: 1, color: T.red, fontWeight: '700', fontSize: 13 }}>{yearError}</Text>
              </View>
            </Card>
          ) : null}

          {/* 1 · Property */}
          <Card>
            <StepLabel n={1} text="Property" hint="Everything this API returns is listed here" />
            {/* Property Group + Property (+ refresh) in ONE row; stacks on phone */}
            <View style={{ maxWidth: 900, flexDirection: bp === 'phone' ? 'column' : 'row', alignItems: bp === 'phone' ? 'stretch' : 'flex-end', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <PropertySelect
                  label="Property Group"
                  value={group}
                  options={groups}
                  onChange={setGroup}
                  loading={groupLoading}
                  error={groupError}
                  disabled={locked || !!yearError}
                  placeholder={groups.length ? 'Choose property group...' : 'No property group available'}
                  bp={bp}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PropertySelect
                    label="Master"
                    value={property}
                    options={properties}
                    onChange={setProperty}
                    loading={propLoading}
                    error={propError}
                    onRetry={() => yearNo && group && loadProperties(yearNo)}
                    disabled={locked || !!yearError || !group}
                    placeholder={!group ? 'Select property group first' : properties.length ? 'Select property' : 'No property available'}
                    bp={bp}
                  />
                </View>
                <Pressable
                  onPress={() => { if (property && yearNo) void loadRecords(property, yearNo); }}
                  disabled={!property || !yearNo || rowsLoading || locked}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh records"
                  testID="merge-refresh"
                  style={({ hovered, pressed }: any) => [
                    s.refreshBtn,
                    hovered && { borderColor: T.copper },
                    pressed && { opacity: 0.7 },
                    (!property || !yearNo || locked) && { opacity: 0.45 },
                  ]}
                >
                  {rowsLoading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={22} color={T.copper} />}
                </Pressable>
              </View>
            </View>
          </Card>

          {/* 2 · MAIN | MERGE */}
          <View style={[s.panels, sideBySide ? { flexDirection: 'row' } : { flexDirection: 'column' }]}>
            <MasterPanel
              tone="from"
              title="Main"
              subtitle={REMOVED_SIDE === 'from' ? 'This record is merged and then Passive / Deleted' : 'This record is kept — all data is merged into it'}
              columns={columns}
              rows={rows}
              loading={rowsLoading || (propLoading && !rows.length)}
              error={rowsError}
              onRetry={() => loadRecords(property, yearNo)}
              selectedId={fromCode}
              blockedId={toCode}
              onSelect={setFromCode}
              disabled={locked || !property}
              bp={bp}
              height={panelHeight}
            />
            {sideBySide ? null : (
              <View style={s.arrowV}><Icon name="south" size={22} color={T.muted} /></View>
            )}
            <MasterPanel
              tone="to"
              title="Merge"
              subtitle={REMOVED_SIDE === 'to' ? 'This record is merged and then Passive / Deleted' : 'Merge from this record'}
              columns={columns}
              rows={rows}
              loading={rowsLoading || (propLoading && !rows.length)}
              error={rowsError}
              onRetry={() => loadRecords(property, yearNo)}
              selectedId={toCode}
              blockedId={fromCode}
              onSelect={setToCode}
              disabled={locked || !property}
              bp={bp}
              height={panelHeight}
            />
          </View>

          {/* 3 · Action + 4 · Merge */}
          <Card>
            <View style={sideBySide ? { flexDirection: 'row', gap: 20, alignItems: 'flex-start' } : { gap: 14 }}>
              <View style={sideBySide ? { flex: 1, maxWidth: 420 } : undefined}>
                <StepLabel n={3} text="After merge" hint="What happens to the merged record" />
                <ActionSelect<MergeAction>
                  label="Action"
                  value={action}
                  options={ACTION_OPTIONS}
                  onChange={setAction}
                  disabled={locked}
                />
              </View>

              <View style={{ flex: sideBySide ? 2 : undefined, gap: 12 }}>
                <StepLabel n={4} text="Save / Merge" hint={ready ? 'Review the summary and confirm' : missing} />
                <View style={[s.summary, ready && { borderColor: isDelete ? T.red : T.copper }]}>
                  <SummaryLine label="Main" row={fromRow} />
                  <Icon name="arrow-forward" size={18} color={T.muted} style={{ alignSelf: 'center' }} />
                  <SummaryLine label="Merge" row={toRow} />
                </View>
                <View style={sideBySide ? { flexDirection: 'row', alignItems: 'center', gap: 12 } : { gap: 8 }}>
                  <Btn
                    label="Save / Merge"
                    icon="merge-type"
                    variant={isDelete ? 'danger' : 'primary'}
                    onPress={askMerge}
                    disabled={!ready || locked || !!yearError}
                    loading={submitting}
                    fullWidth={!sideBySide}
                    testID="merge-save"
                  />
                  {!canMerge ? (
                    <Text style={s.noPerm}>You do not have the “merge” permission for this screen.</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      <ResultDialog
        visible={!!result}
        kind={result?.kind ?? 'success'}
        title={result?.kind === 'error' ? 'Merge failed' : 'Merged successfully'}
        message={result?.message ?? ''}
        details={result?.details}
        primaryLabel={result?.kind === 'error' ? 'Close' : 'Done'}
        onPrimary={() => setResult(null)}
        secondaryLabel={result?.kind === 'error' ? 'Try again' : undefined}
        onSecondary={result?.kind === 'error' ? () => { setResult(null); setConfirmOpen(true); } : undefined}
      >
        {result ? (
          <>
            <View style={s.cChip}>
              <Icon name="category" size={16} color={T.muted} />
              <Text style={s.cChipText} numberOfLines={1}>Property: <Text style={s.cStrong}>{result.property}</Text></Text>
            </View>
            <View style={[s.flow, bp === 'phone' ? { flexDirection: 'column' } : { flexDirection: 'row', alignItems: 'stretch' }]}>
              <RecordCard tone="from" label="MAIN" row={result.main} />
              <View style={s.flowArrow}><Icon name={bp === 'phone' ? 'south' : 'east'} size={22} color={T.muted} /></View>
              <RecordCard tone="to" label="MERGE" row={result.merge} />
            </View>
            {result.kind === 'success' ? (
              <View style={s.notice}>
                <Icon name="info-outline" size={20} color={T.copper} style={{ marginTop: 1 }} />
                <Text style={s.noticeText}>
                  <Text style={s.cStrong}>{result.merge?.name}</Text> is now <Text style={s.cStrong}>{result.actionLabel}</Text>; its data is merged into <Text style={s.cStrong}>{result.main?.name}</Text>.
                </Text>
              </View>
            ) : (
              <View style={[s.notice, { borderColor: T.red }]}>
                <Icon name="shield" size={20} color={T.red} style={{ marginTop: 1 }} />
                <Text style={s.noticeText}>
                  {result.replied === false
                    ? 'No reply was received from the server, so the result is unknown. Pull to refresh the list and check before you try again.'
                    : 'The server rejected this merge. Check the message above, then try again.'}
                </Text>
              </View>
            )}
          </>
        ) : null}
      </ResultDialog>

      <ConfirmDialog
        visible={confirmOpen}
        title={isDelete ? 'Merge and DELETE record?' : 'Merge these records?'}
        subtitle="Please review the details below before you continue."
        danger={isDelete}
        yesLabel={isDelete ? 'Yes, Merge & Delete' : 'Yes, Merge'}
        noLabel="No"
        busy={submitting}
        requireAck={isDelete ? 'I understand the record will be deleted permanently and this cannot be undone.' : undefined}
        onConfirm={doMerge}
        onCancel={() => { if (!submitting) setConfirmOpen(false); }}
      >
        <View style={s.cChip}>
          <Icon name="category" size={16} color={T.muted} />
          <Text style={s.cChipText} numberOfLines={1}>
            Property: <Text style={s.cStrong}>{propRow ? `${propRow.code} · ${propRow.name}` : property}</Text>
          </Text>
        </View>

        <View style={[s.flow, bp === 'phone' ? { flexDirection: 'column' } : { flexDirection: 'row', alignItems: 'stretch' }]}>
          <RecordCard tone="from" label="MAIN" row={fromRow} />
          <View style={s.flowArrow}>
            <Icon name={bp === 'phone' ? 'south' : 'east'} size={22} color={T.muted} />
          </View>
          <RecordCard tone="to" label="MERGE" row={toRow} />
        </View>

        <View style={[s.notice, isDelete && { borderColor: T.red }]}>
          <Icon name={isDelete ? 'warning' : 'info-outline'} size={20} color={isDelete ? T.red : T.copper} style={{ marginTop: 1 }} />
          <Text style={s.noticeText}>
            All data of <Text style={s.cStrong}>{removedRow?.name}</Text> will be merged into <Text style={s.cStrong}>{keptRow?.name}</Text>, then{' '}
            <Text style={s.cStrong}>{removedRow?.name}</Text> will be made{' '}
            <Text style={[s.cStrong, isDelete && { color: T.red }]}>{actionOpt?.label}</Text>.
            {isDelete ? ' This cannot be undone.' : ''}
          </Text>
        </View>
      </ConfirmDialog>
    </View>
  );
}

function RecordCard({ tone, label, row }: { tone: 'from' | 'to'; label: string; row?: MasterRow }) {
  const accent = tone === 'from' ? T.amber : T.green;
  return (
    <View style={[s.recCard, { borderLeftColor: accent }]}>
      <View style={[s.recTag, { backgroundColor: accent }]}><Text style={s.recTagText}>{label}</Text></View>
      <Text style={s.recCode} numberOfLines={1}>{row?.code ?? '—'}</Text>
      <Text style={s.recName} numberOfLines={2}>{row?.name ?? '—'}</Text>
    </View>
  );
}

function SummaryLine({ label, row }: { label: string; row?: MasterRow }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={s.sumLabel}>{label}</Text>
      <Text style={[s.sumValue, !row && { color: T.muted, fontWeight: '500' }]} numberOfLines={1}>
        {row ? `${row.code} · ${row.name}` : 'Not selected'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  title: { color: T.ink, fontSize: 20, fontWeight: '900' },
  subtitle: { color: T.muted, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  user: { color: T.muted, fontSize: 12, fontWeight: '700' },
  refreshBtn: { width: 48, height: 48, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  panels: { gap: 14, alignItems: 'stretch' },
  arrowV: { alignItems: 'center', marginVertical: -4 },
  summary: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: T.sub, borderWidth: 1.5, borderColor: T.border },
  sumLabel: { color: T.muted, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  sumValue: { color: T.ink, fontSize: 13, fontWeight: '700', marginTop: 2 },
  noPerm: { color: T.red, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  cChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  cChipText: { flex: 1, color: T.muted, fontSize: 12.5 },
  flow: { gap: 8 },
  flowArrow: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  recCard: { flex: 1, minWidth: 0, padding: 12, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderLeftWidth: 5, gap: 4 },
  recTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  recTagText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.8 },
  recCode: { color: T.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  recName: { color: T.ink, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  notice: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  noticeText: { flex: 1, color: T.ink, fontSize: 13, lineHeight: 19 },
  cText: { color: T.ink, fontSize: 13, lineHeight: 19, marginTop: 8 },
  cStrong: { color: T.ink, fontWeight: '800' },
  cLabel: { color: T.muted, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, marginBottom: 2 },
  cAddr: { color: T.muted, fontSize: 12, marginTop: 2 },
  cBox: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
});
