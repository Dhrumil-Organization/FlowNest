// FILE: src/screens/repacking/RepackingScreen.tsx
// Repacking: Entries list ⇄ entry form (new / view / edit) inside one route.
// The route file wraps this in <PermissionRouteGuard resource="repacking" action="view">.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { createRepackingService } from '../../api/repackingAPI';
import { useBusinessContext } from '../../core/business';
import { usePermission } from '../../core/permissions';
import { RepackingIssueBrowse } from '../../features/repackingIssue';
import type { BrowseLabels, RepackListRow } from '../../features/repackingIssue';
import { notify } from '../../features/repackingIssue/dialog';
import { C, SP } from '../../features/repackingIssue/theme';
import { RepackingForm } from '../../features/repacking';
import type { RepackContext, RpForm, RpRights } from '../../features/repacking';
import { REPACKING } from '../../registry/modules/repacking.module';

const service = createRepackingService();

const LABELS: BrowseLabels = {
  entity: 'repacking',
  lockedBadge: 'Cartons used',
  lockedReason: 'Cartons of this Repacking are already used.',
  deleteNote: 'Only this Repacking is deleted — its Repacking Issue stays and can be repacked again.',
};

type Screen =
  | { kind: 'list' }
  | { kind: 'loading'; row: RepackListRow }
  | { kind: 'form'; mode: 'add' | 'edit' | 'view'; form?: RpForm; title: string };

export default function RepackingScreen() {
  const { prpCode, yearNo, yearName, strCode } = useBusinessContext();
  const { canDo } = usePermission();

  const rights: RpRights = {
    view: canDo(REPACKING.resource, 'view'),
    add: canDo(REPACKING.resource, 'add'),
    edit: canDo(REPACKING.resource, 'edit'),
    delete: canDo(REPACKING.resource, 'delete'),
    cartons: canDo(REPACKING.cartons, 'edit'),
    removeCarton: canDo(REPACKING.cartons, 'remove_carton'),
  };

  const fromSession = (): RepackContext => ({
    prpCode, prpName: prpCode, yearNo: Number(yearNo) || 0, yearLabel: yearName || String(yearNo), strCode, strName: strCode,
  });
  const [ctx, setCtx] = useState<RepackContext>(fromSession);
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
    setView({ kind: 'loading', row });
    try {
      const form = await service.load(ctx, row.uid);
      const locked = (form.meta?.used ?? 0) > 0;
      const m = mode === 'edit' && rights.edit && !locked ? 'edit' : 'view';
      const vou = [form.header.vouPrefix, form.header.vouNo, form.header.vouSuffix].filter(Boolean).join(' / ') || row.vouNo;
      setView({ kind: 'form', mode: m, form, title: `${m === 'edit' ? 'Edit' : 'View'} • ${vou}` });
    } catch (e: any) {
      setView({ kind: 'list' });
      notify('Could not open entry', e?.message || 'Please try again.');
    }
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
        onNew={() => setView({ kind: 'form', mode: 'add', title: 'New repacking' })}
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
        <Text style={st.title} numberOfLines={1}>{view.kind === 'loading' ? `Opening ${view.row.vouNo}…` : view.title}</Text>
      </View>
      {view.kind === 'loading' ? (
        <View style={st.center}><ActivityIndicator size="large" color={C.cta} /></View>
      ) : (
        <RepackingForm
          key={`${view.mode}|${view.form?.meta?.uid ?? 'new'}|${ctx.prpCode}|${ctx.yearNo}|${ctx.strCode}`}
          ctx={ctx}
          service={service}
          rights={rights}
          mode={view.mode}
          initialForm={view.form}
          onSaved={() => backToList(true)}
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
