// FILE: src/screens/beamInOut/BeamInOutScreen.tsx
// Beam Outward / Beam Inward: Entries list ⇄ entry form (new / view / edit) inside one route.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BEAM_PRINT_FORMATS, BEAM_PRINT_TYPE, createBeamService } from '../../api/beamInOutAPI';
import PdfStep from '../../components/YarnSalesInvoice/PdfStep';
import { OptionPicker } from '../../features/repacking/components/OptionPicker';
import { useBusinessContext } from '../../core/business';
import { usePermission } from '../../core/permissions';
import { RepackingIssueBrowse } from '../../features/repackingIssue';
import type { BrowseLabels, RepackListRow } from '../../features/repackingIssue';
import { notify } from '../../features/repackingIssue/dialog';
import { C, SP } from '../../features/repackingIssue/theme';
import { BeamInOutForm } from '../../features/beamInOut';
import type { BeamContext, BeamForm, BeamRights, BeamTxn } from '../../features/beamInOut';
import { txnTitle } from '../../features/beamInOut/logic';
import { BEAM_INWARD, BEAM_OUTWARD } from '../../registry/modules/beamInOut.module';

type Screen =
  | { kind: 'list' }
  | { kind: 'loading'; row: RepackListRow }
  | { kind: 'form'; mode: 'add' | 'edit' | 'view'; form?: BeamForm; title: string }
  | { kind: 'pdf'; url: string; title: string };

export default function BeamInOutScreen({ txn }: { txn: BeamTxn }) {
  const { prpCode, yearNo, yearName, strCode } = useBusinessContext();
  const { canDo } = usePermission();
  const R = txn === 'beam_inward' ? BEAM_INWARD : BEAM_OUTWARD;
  const service = useMemo(() => createBeamService(txn), [txn]);
  const title = txnTitle(txn);

  const labels: BrowseLabels = {
    entity: title.toLowerCase(),
    lockedBadge: txn === 'beam_outward' ? 'Gate pass / received' : 'Received back',
    lockedReason: txn === 'beam_outward' ? 'This voucher has a gate pass or its beams are already received back.' : 'Beams of this voucher are already received back.',
    deleteNote: txn === 'beam_outward' ? 'The beams become in house again.' : 'The linked Beam Outward becomes open again.',
    searchHint: 'Voucher, party, remark',
    itemWord: 'beam(s)',
  };

  const rights: BeamRights = {
    view: canDo(R.resource, 'view'),
    add: canDo(R.resource, 'add'),
    edit: canDo(R.resource, 'edit'),
    delete: canDo(R.resource, 'delete'),
    beams: canDo(R.beams, 'edit'),
    removeBeam: canDo(R.beams, 'remove_beam'),
    tax: canDo(R.tax, 'edit'),
    print: canDo(R.resource, 'print'),
    withoutGate: txn === 'beam_inward' && canDo(R.resource, 'without_gate'),
  };
  const canPrint = rights.print && !!BEAM_PRINT_TYPE[txn];

  const fromSession = (): BeamContext => ({
    prpCode, prpName: prpCode, yearNo: Number(yearNo) || 0, yearLabel: yearName || String(yearNo), strCode, strName: strCode,
  });
  const [ctx, setCtx] = useState<BeamContext>(fromSession);
  useEffect(() => { setCtx(fromSession()); }, [prpCode, yearNo, yearName, strCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const [view, setView] = useState<Screen>({ kind: 'list' });
  const [reloadKey, setReloadKey] = useState(0);
  /** print: the voucher waiting for a format choice */
  const [printRow, setPrintRow] = useState<RepackListRow | null>(null);
  const [printing, setPrinting] = useState(false);

  const doPrint = async (row: RepackListRow, format: string) => {
    setPrintRow(null);
    setPrinting(true);
    try {
      const url = await service.print(ctx, row.uid, format);
      setView({ kind: 'pdf', url, title: `${title} ${row.vouNo}` });
    } catch (e: any) {
      notify('Print', e?.message || 'Print failed.');
    } finally {
      setPrinting(false);
    }
  };

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
      const locked = (form.meta?.received ?? 0) > 0 || !!form.meta?.gatePassNo;
      const m = mode === 'edit' && rights.edit && !locked ? 'edit' : 'view';
      const vou = [form.header.vouNo, form.header.suffix].filter(Boolean).join(' / ') || row.vouNo;
      setView({ kind: 'form', mode: m, form, title: `${m === 'edit' ? 'Edit' : 'View'} • ${vou}` });
    } catch (e: any) {
      setView({ kind: 'list' });
      notify('Could not open entry', e?.message || 'Please try again.');
    }
  };

  const formatPicker = (
    <OptionPicker
      visible={!!printRow}
      title="Print format"
      options={BEAM_PRINT_FORMATS}
      onPick={o => printRow && doPrint(printRow, o.code)}
      onClose={() => setPrintRow(null)}
    />
  );

  if (view.kind === 'pdf') {
    return <PdfStep pdfUrl={view.url} title={view.title} onBack={() => setView({ kind: 'list' })} />;
  }

  if (view.kind === 'list') {
    return (
      <>
      {printing ? <View style={st.printing}><ActivityIndicator color={C.cta} /><Text style={st.printTxt}>Preparing print…</Text></View> : null}
      {formatPicker}
      <RepackingIssueBrowse
        ctx={ctx}
        onCtxChange={setCtx}
        service={service}
        rights={rights}
        labels={labels}
        reloadKey={reloadKey}
        noStore
        onNew={() => setView({ kind: 'form', mode: 'add', title: `New ${title.toLowerCase()}` })}
        onOpen={open}
        onPrint={canPrint ? row => setPrintRow(row) : undefined}
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
        <Text style={st.title} numberOfLines={1}>{view.kind === 'loading' ? `Opening ${view.row.vouNo}…` : view.title}</Text>
      </View>
      {view.kind === 'loading' ? (
        <View style={st.center}><ActivityIndicator size="large" color={C.cta} /></View>
      ) : (
        <BeamInOutForm
          key={`${view.mode}|${view.form?.meta?.uid ?? 'new'}|${ctx.prpCode}|${ctx.yearNo}`}
          ctx={ctx}
          txn={txn}
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
  printing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SP.sm, padding: SP.sm, backgroundColor: C.ctaSoft },
  printTxt: { fontSize: 13, fontWeight: '700', color: C.cta },
});
