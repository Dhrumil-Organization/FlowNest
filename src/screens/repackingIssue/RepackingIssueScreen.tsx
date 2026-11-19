// FILE: src/screens/repackingIssue/RepackingIssueScreen.tsx
// Repacking Issue: Entries list (browse) ⇄ entry form (new / view / edit) inside one route.
// The route file wraps this in <PermissionRouteGuard resource="repacking_issue" action="view">.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { createRepackingIssueService } from '../../api/repackingIssueAPI';
import { useBusinessContext } from '../../core/business';
import { usePermission } from '../../core/permissions';
import { RepackingIssueBrowse, RepackingIssueForm } from '../../features/repackingIssue';
import type { RepackContext, RepackForm, RepackListRow, RepackRights } from '../../features/repackingIssue';
import { notify } from '../../features/repackingIssue/dialog';
import { C, SP } from '../../features/repackingIssue/theme';
import { REPACKING_ISSUE } from '../../registry/modules/repackingIssue.module';

const service = createRepackingIssueService();

type View_ =
  | { kind: 'list' }
  | { kind: 'loading'; row: RepackListRow }
  | { kind: 'form'; mode: 'add' | 'edit' | 'view'; form?: RepackForm; title: string };

export default function RepackingIssueScreen() {
  const { prpCode, yearNo, yearName, strCode } = useBusinessContext();
  const { canDo } = usePermission();

  const rights: RepackRights = {
    view: canDo(REPACKING_ISSUE.resource, 'view'),
    add: canDo(REPACKING_ISSUE.resource, 'add'),
    edit: canDo(REPACKING_ISSUE.resource, 'edit'),
    delete: canDo(REPACKING_ISSUE.resource, 'delete'),
    scan: canDo(REPACKING_ISSUE.cartons, 'scan'),
    removeCarton: canDo(REPACKING_ISSUE.cartons, 'remove_carton'),
  };

  // Property / Year / Store of the list — starts from the session, changeable on the list.
  const [ctx, setCtx] = useState<RepackContext>(() => ({
    prpCode, prpName: prpCode, yearNo: Number(yearNo) || 0, yearLabel: yearName || String(yearNo), strCode, strName: strCode,
  }));
  useEffect(() => {
    // session changed from the app header → follow it
    setCtx({ prpCode, prpName: prpCode, yearNo: Number(yearNo) || 0, yearLabel: yearName || String(yearNo), strCode, strName: strCode });
  }, [prpCode, yearNo, yearName, strCode]);

  const [view, setView] = useState<View_>({ kind: 'list' });
  const [reloadKey, setReloadKey] = useState(0);

  const backToList = (reload = false) => {
    setView({ kind: 'list' });
    if (reload) setReloadKey(k => k + 1);
  };

  // Android back button: form → list
  useEffect(() => {
    if (Platform.OS !== 'android' || view.kind === 'list') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { backToList(); return true; });
    return () => sub.remove();
  }, [view.kind]);

  const open = async (row: RepackListRow, mode: 'view' | 'edit') => {
    setView({ kind: 'loading', row });
    try {
      const form = await service.load(ctx, row.uid);
      const locked = (form.meta?.isRepack ?? 0) > 0;
      const m = mode === 'edit' && rights.edit && !locked ? 'edit' : 'view';
      setView({ kind: 'form', mode: m, form, title: `${m === 'edit' ? 'Edit' : 'View'} • ${form.header.vouNo || row.vouNo}` });
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
        reloadKey={reloadKey}
        onNew={() => setView({ kind: 'form', mode: 'add', title: 'New entry' })}
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
        <Text style={st.title} numberOfLines={1}>
          {view.kind === 'loading' ? `Opening ${view.row.vouNo}…` : view.title}
        </Text>
      </View>

      {view.kind === 'loading' ? (
        <View style={st.center}><ActivityIndicator size="large" color={C.cta} /></View>
      ) : (
        <RepackingIssueForm
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
