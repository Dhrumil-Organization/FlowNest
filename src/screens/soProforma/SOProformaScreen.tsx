// FILE: src/screens/soProforma/SOProformaScreen.tsx
// Proforma Invoice: Sales Order cards ⇄ SO detail (its proformas) ⇄ New / Edit proforma.
// Shown as the "Proforma" tab of Sales Order Entry (SalesOrderEntryNEW/ProformaTab.tsx), which passes the
// property / year the other Sales Order tabs use.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { createProformaService } from '../../api/soProformaAPI';
import PdfStep from '../../components/YarnSalesInvoice/PdfStep';
import { usePermission } from '../../core/permissions';
import { confirmAsync, notify } from '../../features/repackingIssue/dialog';
import { C, SP } from '../../features/repackingIssue/theme';
import { ProformaForm, SOCards, SODetail, emptyProforma } from '../../features/soProforma';
import type { PiContext, PiRights, Proforma, ProformaRow, SalesOrder } from '../../features/soProforma';
import { SO_PROFORMA } from '../../features/soProforma/permissions';

type Screen =
  | { kind: 'list' }
  | { kind: 'so'; so: SalesOrder }
  | { kind: 'loading'; so: SalesOrder; title: string }
  | { kind: 'form'; so: SalesOrder; mode: 'add' | 'edit' | 'view'; pi: Proforma; title: string }
  | { kind: 'pdf'; url: string; title: string; back: Screen };

export default function SOProformaScreen({ prpCode, yearNo, prpName }: { prpCode: string; yearNo: string | number; prpName?: string }) {
  const { canDo } = usePermission();
  const service = useMemo(() => createProformaService(), []);

  const rights: PiRights = {
    view: canDo(SO_PROFORMA.resource, 'view'),
    add: canDo(SO_PROFORMA.resource, 'add'),
    edit: canDo(SO_PROFORMA.resource, 'edit'),
    delete: canDo(SO_PROFORMA.resource, 'delete'),
    print: canDo(SO_PROFORMA.resource, 'print'),
  };

  const ctx: PiContext = useMemo(
    () => ({ prpCode, prpName: prpName || prpCode, yearNo: Number(String(yearNo).slice(-2)) || 0, yearLabel: String(yearNo), strCode: '012', strName: 'Grey' }),
    [prpCode, yearNo, prpName],
  );

  const [view, setView] = useState<Screen>({ kind: 'list' });
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState<ProformaRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => { setView({ kind: 'list' }); }, [prpCode, yearNo]);

  /** opens an SO and (re)loads its proformas + proformed qty */
  const openSO = async (so: SalesOrder) => {
    setView({ kind: 'so', so });
    setBusy(true);
    try {
      const r = await service.proformas(ctx, so);
      setList(r.list);
      setView(v => (v.kind === 'so' && v.so.uid === so.uid ? { kind: 'so', so: r.so } : v));
      return r.so;
    } catch (e: any) {
      notify('Proformas', e?.message || 'Could not load the proformas.');
      return so;
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    if (view.kind === 'form' || view.kind === 'loading') return setView({ kind: 'so', so: view.so });
    if (view.kind === 'pdf') return setView(view.back);
    setView({ kind: 'list' });
    setReloadKey(k => k + 1);
  };

  useEffect(() => {
    if (Platform.OS !== 'android' || view.kind === 'list') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  }); // eslint-disable-line react-hooks/exhaustive-deps

  /** server print (same layout as the Sales Order print format 2) → PDF viewer, Back returns to the SO */
  const printPi = async (so: SalesOrder, uid: number, no: string) => {
    setPrinting(true);
    try {
      const url = await service.printPI(ctx, so, uid);
      setView({ kind: 'pdf', url, title: `Proforma ${no}`, back: { kind: 'so', so } });
    } catch (e: any) {
      notify('Print', e?.message || 'Print failed.');
    } finally {
      setPrinting(false);
    }
  };

  const openPi = async (so: SalesOrder, row: ProformaRow, mode: 'view' | 'edit') => {
    setView({ kind: 'loading', so, title: `Opening PI ${row.no}…` });
    try {
      const pi = await service.load(ctx, so, row.uid);
      const m = mode === 'edit' && rights.edit ? 'edit' : 'view';
      setView({ kind: 'form', so, mode: m, pi, title: `${m === 'edit' ? 'Edit' : 'View'} • PI ${pi.no}` });
    } catch (e: any) {
      setView({ kind: 'so', so });
      notify('Could not open proforma', e?.message || 'Please try again.');
    }
  };

  const printRow = (so: SalesOrder, row: ProformaRow) => printPi(so, row.uid, row.no);

  const deleteRow = async (so: SalesOrder, row: ProformaRow) => {
    if (!(await confirmAsync('Delete proforma', `Delete proforma ${row.no} (qty ${row.qty})? Its qty goes back to the Sales Order balance.`, 'Delete', true))) return;
    const r = await service.remove(ctx, row.uid);
    if (!r.ok) return notify('Delete', r.message);
    notify('Deleted', r.message);
    openSO(so);
  };

  const printSO = async (so: SalesOrder) => {
    setPrinting(true);
    try {
      const url = await service.printSO(ctx, so);
      setView({ kind: 'pdf', url, title: `Sales Order ${so.soNo}`, back: { kind: 'so', so } });
    } catch (e: any) {
      notify('Print', e?.message || 'Print failed.');
    } finally {
      setPrinting(false);
    }
  };

  const saved = async (so: SalesOrder, p: Proforma, message: string, print: boolean) => {
    const fresh = await openSO(so);
    if (print) return printPi(fresh, p.uid, p.no);
    notify('Saved', message);
  };

  const printingBar = printing ? <View style={st.printing}><ActivityIndicator color={C.cta} /><Text style={st.printTxt}>Preparing print…</Text></View> : null;

  if (view.kind === 'pdf') {
    const b = view.back;
    return <PdfStep pdfUrl={view.url} title={view.title} onBack={() => setView(b)} />;
  }

  if (view.kind === 'list') {
    return <SOCards ctx={ctx} service={service} reloadKey={reloadKey} onOpen={openSO} />;
  }

  const so = view.so;
  const title = view.kind === 'so' ? `SO ${so.soNo} • ${so.party || so.parCode}` : view.title;
  const backLabel = view.kind === 'so' ? 'Sales Orders' : `SO ${so.soNo}`;

  return (
    <View style={st.root}>
      <View style={st.bar}>
        <Pressable onPress={back} style={st.back} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Back to ${backLabel}`}>
          <Icon name="arrow-back" size={20} color={C.nav} />
          <Text style={st.backTxt}>{backLabel}</Text>
        </Pressable>
        <Text style={st.title} numberOfLines={1}>{title}</Text>
      </View>
      {printingBar}
      {view.kind === 'loading' ? (
        <View style={st.center}><ActivityIndicator size="large" color={C.cta} /></View>
      ) : view.kind === 'so' ? (
        <SODetail
          so={so}
          list={list}
          busy={busy}
          rights={rights}
          onNew={() => setView({ kind: 'form', so, mode: 'add', pi: emptyProforma(so), title: 'New proforma' })}
          onView={row => openPi(so, row, 'view')}
          onEdit={row => openPi(so, row, 'edit')}
          onDelete={row => deleteRow(so, row)}
          onPrint={row => printRow(so, row)}
          onPrintSO={rights.print ? () => printSO(so) : undefined}
        />
      ) : (
        <ProformaForm
          key={`${view.mode}|${view.pi.uid}|${so.uid}`}
          ctx={ctx}
          so={so}
          service={service}
          rights={rights}
          mode={view.mode}
          initial={view.pi}
          onCancel={back}
          onSaved={(p, message, print) => saved(so, p, message, print)}
          onPrint={p => printPi(so, p.uid, p.no)}
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
