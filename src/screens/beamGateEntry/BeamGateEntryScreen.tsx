// FILE: src/screens/beamGateEntry/BeamGateEntryScreen.tsx
// Beam Gate Entry: Entries ⇄ entry (security), inside one route. Beam Inward picks these entries.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { createGateEntryService } from '../../api/beamGateEntryAPI';
import { useBusinessContext } from '../../core/business';
import { usePermission } from '../../core/permissions';
import { BeamGateEntryForm } from '../../features/beamGateEntry/components/BeamGateEntryForm';
import type { GateEntry, GeContext, GeRights } from '../../features/beamGateEntry/types';
import { RepackingIssueBrowse } from '../../features/repackingIssue';
import type { BrowseLabels, RepackListRow } from '../../features/repackingIssue';
import { notify } from '../../features/repackingIssue/dialog';
import { C, SP } from '../../features/repackingIssue/theme';
import { BEAM_GATE_ENTRY } from '../../registry/modules/beamGateEntry.module';

type Screen =
  | { kind: 'list' }
  | { kind: 'loading'; title: string }
  | { kind: 'form'; mode: 'add' | 'edit' | 'view'; entry?: GateEntry; title: string };

const LABELS: BrowseLabels = {
  entity: 'beam gate entry',
  lockedBadge: 'Inwarded',
  lockedReason: 'Beams of this gate entry are already taken in by Beam Inward - delete the Beam Inward first.',
  deleteNote: 'Its beams can then be entered on another gate entry.',
  searchHint: 'Gate entry, party, outward no., beam no.',
  itemWord: 'entry(s)',
};

export default function BeamGateEntryScreen() {
  const { prpCode, yearNo, yearName, strCode } = useBusinessContext();
  const { canDo } = usePermission();
  const service = useMemo(() => createGateEntryService(), []);

  const rights: GeRights = {
    view: canDo(BEAM_GATE_ENTRY.resource, 'view'),
    add: canDo(BEAM_GATE_ENTRY.resource, 'add'),
    edit: canDo(BEAM_GATE_ENTRY.resource, 'edit'),
    delete: canDo(BEAM_GATE_ENTRY.resource, 'delete'),
  };

  const fromSession = (): GeContext => ({
    prpCode, prpName: prpCode, yearNo: Number(yearNo) || 0, yearLabel: yearName || String(yearNo), strCode, strName: strCode,
  });
  const [ctx, setCtx] = useState<GeContext>(fromSession);
  useEffect(() => { setCtx(fromSession()); }, [prpCode, yearNo, yearName, strCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const [view, setView] = useState<Screen>({ kind: 'list' });
  const [reloadKey, setReloadKey] = useState(0);

  const backToList = (reload = false) => {
    setView({ kind: 'list' });
    if (reload) setReloadKey(k => k + 1);
  };

  useEffect(() => {
    if (Platform.OS !== 'android' || view.kind === 'list') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { backToList(); return true; });
    return () => sub.remove();
  }, [view.kind]);

  const open = async (row: RepackListRow, mode: 'view' | 'edit') => {
    setView({ kind: 'loading', title: `Opening ${row.vouNo}…` });
    try {
      const entry = await service.load(ctx, row.uid);
      const m = mode === 'edit' && rights.edit && !entry.inwarded ? 'edit' : 'view';
      setView({ kind: 'form', mode: m, entry, title: `${m === 'edit' ? 'Edit' : 'View'} • Gate entry ${entry.no}` });
    } catch (e: any) {
      setView({ kind: 'list' });
      notify('Could not open gate entry', e?.message || 'Please try again.');
    }
  };

  const saved = (_e: GateEntry, message: string) => {
    notify('Saved', message);
    backToList(true);
  };

  if (view.kind === 'list') {
    return (
      <RepackingIssueBrowse
        ctx={ctx}
        onCtxChange={setCtx}
        service={service}
        rights={rights}
        labels={LABELS}
        reloadKey={reloadKey}
        noStore
        onNew={() => setView({ kind: 'form', mode: 'add', title: 'New gate entry' })}
        onOpen={open}
      />
    );
  }

  return (
    <View style={st.root}>
      <View style={st.bar}>
        <Pressable onPress={() => backToList()} style={st.back} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back to entries">
          <Icon name="arrow-back" size={20} color={C.nav} />
          <Text style={st.backTxt}>Entries</Text>
        </Pressable>
        <Text style={st.title} numberOfLines={1}>{view.title}</Text>
      </View>
      {view.kind === 'loading' ? (
        <View style={st.center}><ActivityIndicator size="large" color={C.cta} /></View>
      ) : (
        <BeamGateEntryForm
          key={`${view.mode}|${view.entry?.uid ?? 'new'}|${ctx.prpCode}`}
          ctx={ctx}
          service={service}
          rights={rights}
          mode={view.mode}
          initial={view.entry}
          onSaved={saved}
          onCancel={() => backToList()}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  bar: { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingHorizontal: SP.md, paddingVertical: SP.sm, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.line },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingRight: SP.sm },
  backTxt: { fontSize: 14, fontWeight: '800', color: C.nav },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: C.muted, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
