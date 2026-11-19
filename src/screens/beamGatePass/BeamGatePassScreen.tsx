// FILE: src/screens/beamGatePass/BeamGatePassScreen.tsx
// Beam Gate Pass: Entries ⇄ entry (security) ⇄ print preview, inside one route.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { createGatePassService } from '../../api/beamGatePassAPI';
import PdfStep from '../../components/YarnSalesInvoice/PdfStep';
import { useBusinessContext } from '../../core/business';
import { usePermission } from '../../core/permissions';
import { BeamGatePassForm } from '../../features/beamGatePass/components/BeamGatePassForm';
import type { GatePass, GpContext, GpRights } from '../../features/beamGatePass/types';
import { RepackingIssueBrowse } from '../../features/repackingIssue';
import type { BrowseLabels, RepackListRow } from '../../features/repackingIssue';
import { confirmAsync, notify } from '../../features/repackingIssue/dialog';
import { C, SP } from '../../features/repackingIssue/theme';
import { BEAM_GATE_PASS } from '../../registry/modules/beamGatePass.module';

type Screen =
  | { kind: 'list' }
  | { kind: 'loading'; title: string }
  | { kind: 'form'; mode: 'add' | 'edit' | 'view'; gp?: GatePass; title: string }
  | { kind: 'pdf'; url: string; title: string; back: Screen };

const LABELS: BrowseLabels = {
  entity: 'beam gate pass',
  lockedBadge: '',
  lockedReason: '',
  deleteNote: 'The Beam Outward can then be passed again.',
  searchHint: 'Gate pass, party, outward no., beam no.',
  itemWord: 'outward(s)',
};

export default function BeamGatePassScreen() {
  const { prpCode, yearNo, yearName, strCode } = useBusinessContext();
  const { canDo } = usePermission();
  const service = useMemo(() => createGatePassService(), []);

  const rights: GpRights = {
    view: canDo(BEAM_GATE_PASS.resource, 'view'),
    add: canDo(BEAM_GATE_PASS.resource, 'add'),
    edit: canDo(BEAM_GATE_PASS.resource, 'edit'),
    delete: canDo(BEAM_GATE_PASS.resource, 'delete'),
    print: canDo(BEAM_GATE_PASS.resource, 'print'),
  };

  const fromSession = (): GpContext => ({
    prpCode, prpName: prpCode, yearNo: Number(yearNo) || 0, yearLabel: yearName || String(yearNo), strCode, strName: strCode,
  });
  const [ctx, setCtx] = useState<GpContext>(fromSession);
  useEffect(() => { setCtx(fromSession()); }, [prpCode, yearNo, yearName, strCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const [view, setView] = useState<Screen>({ kind: 'list' });
  const [reloadKey, setReloadKey] = useState(0);
  const [printing, setPrinting] = useState(false);

  const backToList = (reload = false) => {
    setView({ kind: 'list' });
    if (reload) setReloadKey(k => k + 1);
  };

  useEffect(() => {
    if (Platform.OS !== 'android' || view.kind === 'list') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { backToList(); return true; });
    return () => sub.remove();
  }, [view.kind]);

  const print = async (uid: number, no: string, back: Screen) => {
    setPrinting(true);
    try {
      const url = await service.print(ctx, uid);
      setView({ kind: 'pdf', url, title: `Gate Pass ${no}`, back });
    } catch (e: any) {
      notify('Print', e?.message || 'Print failed.');
    } finally {
      setPrinting(false);
    }
  };

  const open = async (row: RepackListRow, mode: 'view' | 'edit') => {
    setView({ kind: 'loading', title: `Opening ${row.vouNo}…` });
    try {
      const gp = await service.load(ctx, row.uid);
      const m = mode === 'edit' && rights.edit ? 'edit' : 'view';
      setView({ kind: 'form', mode: m, gp, title: `${m === 'edit' ? 'Edit' : 'View'} • Gate pass ${gp.no}` });
    } catch (e: any) {
      setView({ kind: 'list' });
      notify('Could not open gate pass', e?.message || 'Please try again.');
    }
  };

  const saved = async (gp: GatePass, message: string) => {
    if (rights.print && (await confirmAsync('Gate pass saved', `${message}\nPrint gate pass ${gp.no} now?`, 'Print', false))) {
      setReloadKey(k => k + 1);
      return print(gp.uid, gp.no, { kind: 'list' });
    }
    notify('Saved', message);
    backToList(true);
  };

  const printingBar = printing ? <View style={st.printing}><ActivityIndicator color={C.cta} /><Text style={st.printTxt}>Preparing print…</Text></View> : null;

  if (view.kind === 'pdf') {
    const back = view.back;
    return <PdfStep pdfUrl={view.url} title={view.title} onBack={() => setView(back)} />;
  }

  if (view.kind === 'list') {
    return (
      <>
        {printingBar}
        <RepackingIssueBrowse
          ctx={ctx}
          onCtxChange={setCtx}
          service={service}
          rights={rights}
          labels={LABELS}
          reloadKey={reloadKey}
          noStore
          onNew={() => setView({ kind: 'form', mode: 'add', title: 'New gate pass' })}
          onOpen={open}
          onPrint={rights.print ? row => print(row.uid, row.vouNo, { kind: 'list' }) : undefined}
        />
      </>
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
      {printingBar}
      {view.kind === 'loading' ? (
        <View style={st.center}><ActivityIndicator size="large" color={C.cta} /></View>
      ) : (
        <BeamGatePassForm
          key={`${view.mode}|${view.gp?.uid ?? 'new'}|${ctx.prpCode}`}
          ctx={ctx}
          service={service}
          rights={rights}
          mode={view.mode}
          initial={view.gp}
          onSaved={saved}
          onCancel={() => backToList()}
          onPrint={gp => print(gp.uid, gp.no, view)}
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
  printing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SP.sm, padding: SP.sm, backgroundColor: C.ctaSoft },
  printTxt: { fontSize: 13, fontWeight: '700', color: C.cta },
});
