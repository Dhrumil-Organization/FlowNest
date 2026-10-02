// FILE: src/components/VisitorsReportNEW/ExportPreview.tsx
// Preview before download for the Visitors Report exports (full screen).
//
//   Excel   the sheets (Register / Visitors / Day-wise / Month-wise /
//           Year-wise / Summary) drawn from the
//           SAME data the .xlsx is written from — same colours, columns and
//           order — with sheet tabs like in Excel.   [Download Excel]
//   PDF     desktop browser: the finished PDF inside the page (browser's PDF
//           viewer). Phone browser + Android / iOS app: the report page (same
//           design; in the app expo-print makes the PDF from this very page).
//                                                      [Download PDF] [Print]
//
// Web = the file is downloaded. Android / iOS = the share sheet opens (save to
// Files / Drive, WhatsApp, mail).
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Btn } from '../StockVerificationNEW/ui';
import {
  ExportInput, PreparedExcel, PreparedPdf, prepareExcel, preparePdf, printReport, releasePdf, saveExcel, savePdf,
} from './exportReport';
import { previewStyle, SheetSpec } from './xlsxLite';

export type PreviewKind = 'excel' | 'pdf';

type Props = { kind: PreviewKind | null; input: ExportInput | null; onClose: () => void };

const CHAR_PX = 7.2;      // one Excel "character" of column width on screen
const PREVIEW_ROWS = 80;  // data rows drawn per sheet (the file always has all rows)

export default function ExportPreview({ kind, input, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [excel, setExcel] = useState<PreparedExcel | null>(null);
  const [pdf, setPdf] = useState<PreparedPdf | null>(null);
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<'' | 'file' | 'print'>('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  // build the file as soon as the preview opens
  useEffect(() => {
    if (!kind || !input) return undefined;
    let alive = true;
    let made: PreparedPdf | null = null;
    setExcel(null);
    setPdf(null);
    setTab(0);
    setError('');
    setDone('');
    setBusy(true);
    (async () => {
      try {
        if (kind === 'excel') {
          const file = prepareExcel(input);
          if (alive) setExcel(file);
        } else {
          made = await preparePdf(input);
          if (alive) setPdf(made); else releasePdf(made);
        }
      } catch (e: any) {
        if (alive) setError(e?.message || 'Could not build the preview. Please try again.');
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; releasePdf(made); };
  }, [kind, input]);

  const download = async () => {
    if (saving) return;
    setSaving('file');
    setDone('');
    try {
      if (kind === 'excel' && excel) { await saveExcel(excel); setDone(Platform.OS === 'web' ? `Downloaded ${excel.fileName}` : ''); }
      if (kind === 'pdf' && pdf) { await savePdf(pdf); setDone(Platform.OS === 'web' ? `Downloaded ${pdf.fileName}` : ''); }
    } catch (e: any) {
      AppAlert.alert('Download failed', e?.message || 'Could not save the file. Please try again.');
    } finally {
      setSaving('');
    }
  };

  const print = async () => {
    if (saving || !input) return;
    setSaving('print');
    try {
      await printReport(input);
    } catch (e: any) {
      AppAlert.alert('Print failed', e?.message || 'Could not print. Please try again.');
    } finally {
      setSaving('');
    }
  };

  const fileName = kind === 'excel' ? excel?.fileName : pdf?.fileName;
  const ready = kind === 'excel' ? !!excel : !!pdf;
  const sheet = excel?.sheets[Math.min(tab, (excel?.sheets.length || 1) - 1)];

  return (
    <Modal visible={!!kind} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={p.root}>
        <View style={[p.header, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
          <TouchableOpacity style={p.headBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close preview">
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={p.eyebrow}>{kind === 'excel' ? 'EXCEL PREVIEW' : 'PDF PREVIEW'}</Text>
            <Text style={p.title} numberOfLines={1}>{fileName || 'Visitors Report'}</Text>
          </View>
          <Icon name={kind === 'excel' ? 'table-view' : 'picture-as-pdf'} size={26} color={kind === 'excel' ? '#7FD1A3' : '#F2A093'} />
        </View>

        {/* Excel sheet tabs */}
        {kind === 'excel' && excel ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={p.tabs}>
            {excel.sheets.map((s, i) => {
              const on = i === tab;
              return (
                <TouchableOpacity key={s.name} style={[p.tab, on && p.tabOn]} onPress={() => setTab(i)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                  <Text style={[p.tabText, on && { color: '#fff' }]}>{s.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={p.body}>
          {busy ? (
            <View style={p.state}><ActivityIndicator size="large" color={T.copper} /><Text style={p.stateText}>Preparing the preview…</Text></View>
          ) : error ? (
            <View style={p.state}><Icon name="error-outline" size={32} color={T.red} /><Text style={[p.stateText, { color: T.red }]}>{error}</Text></View>
          ) : kind === 'excel' && sheet ? (
            <SheetView sheet={sheet} />
          ) : kind === 'pdf' && pdf ? (
            Platform.OS === 'web'
              ? React.createElement('iframe', {
                // desktop browsers show the PDF file itself; phone browsers cannot show a PDF
                // inside a page, so they get the report page (same design)
                ...(pdf.inlinePdf && pdf.url ? { src: pdf.url } : { srcDoc: pdf.html }),
                title: 'PDF preview',
                style: { flex: 1, width: '100%', height: '100%', border: 'none', backgroundColor: pdf.inlinePdf ? '#525659' : '#fff' },
              })
              : <WebView originWhitelist={['*']} source={{ html: pdf.html }} style={{ flex: 1, backgroundColor: '#fff' }} scalesPageToFit />
          ) : null}
        </View>

        <View style={[p.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {done ? (
            <View style={p.done}><Icon name="check-circle" size={17} color={T.green} /><Text style={p.doneText} numberOfLines={1}>{done}</Text></View>
          ) : (
            <Text style={p.note} numberOfLines={2}>
              {kind === 'excel'
                ? 'This is exactly what the Excel file contains: Register, Visitors, Day-wise, Month-wise, Year-wise and Summary sheets.'
                : 'This is exactly the PDF: key numbers, register with photos, month / year / day tables and a summary page.'}
            </Text>
          )}
          <View style={p.footRow}>
            <Btn label="Close" kind="ghost" onPress={onClose} style={p.footBtn} />
            {kind === 'pdf' ? <Btn label="Print" icon="print" kind="ghost" onPress={print} loading={saving === 'print'} disabled={!ready || !!saving} style={p.footBtn} /> : null}
            <Btn
              label={kind === 'excel' ? 'Download Excel' : 'Download PDF'}
              icon="file-download"
              kind="copper"
              onPress={download}
              loading={saving === 'file'}
              disabled={!ready || !!saving}
              style={[p.footBtn, { flex: 1.6 }]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* --------------------------- one sheet, like Excel ------------------------ */

function SheetView({ sheet }: { sheet: SheetSpec }) {
  const widths = sheet.cols.map((w) => Math.round(w * CHAR_PX));
  const total = widths.reduce((s, w) => s + w, 0);
  const headerRows = sheet.freezeRow || 0;
  const limit = headerRows + PREVIEW_ROWS;
  const rows = sheet.rows.slice(0, limit);
  const hidden = sheet.rows.length - rows.length;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[p.sheet, { width: total + 2 }]}>
          {rows.map((row, r) => {
            // a title line: only the first cell has text → drawn across the sheet (merged cell)
            const banner = row.length > 1 && row.slice(1).every((cell) => cell.s === 'blank') && row[0].s !== 'cell';
            if (banner) {
              const st = previewStyle(row[0].s);
              return (
                <View key={r} style={{ minHeight: row[0].v === '' ? 10 : 20, justifyContent: 'center', paddingHorizontal: 6, backgroundColor: st.bg }}>
                  {row[0].v !== '' ? <Text style={{ fontSize: st.size + 1.5, fontWeight: st.bold ? '800' : '500', color: st.color }}>{String(row[0].v)}</Text> : null}
                </View>
              );
            }
            return (
              <View key={r} style={{ flexDirection: 'row' }}>
                {row.map((cell, i) => {
                  const st = previewStyle(cell.s);
                  return (
                    <View
                      key={i}
                      style={[
                        p.cell,
                        { width: widths[i], backgroundColor: st.bg },
                        st.border && { borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#E5E0DA' },
                      ]}
                    >
                      <Text style={{ fontSize: st.size + 1.5, fontWeight: st.bold ? '800' : '500', color: st.color, textAlign: st.align }} numberOfLines={3}>
                        {String(cell.v)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
      {hidden > 0 ? (
        <Text style={p.more}>Preview shows the first {PREVIEW_ROWS} rows. The downloaded file has all {sheet.rows.length - headerRows} rows.</Text>
      ) : null}
    </ScrollView>
  );
}

const p = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: { backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 12 },
  headBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  eyebrow: { color: T.copper, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 1 },

  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingTop: 10 },
  tab: { height: 38, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: T.green, borderColor: T.green },
  tabText: { fontSize: 13, fontWeight: '800', color: T.ink },

  body: { flex: 1, minHeight: 0 },
  sheet: { backgroundColor: '#fff', borderWidth: 1, borderColor: T.border, paddingTop: 6 },
  cell: { paddingHorizontal: 6, paddingVertical: 5, justifyContent: 'center', minHeight: 26 },
  more: { fontSize: 12, color: T.muted, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  stateText: { fontSize: 13.5, color: T.muted, fontWeight: '600', textAlign: 'center' },

  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 12, paddingTop: 9, gap: 8 },
  note: { fontSize: 11.5, color: T.muted, fontWeight: '600' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneText: { flex: 1, fontSize: 12.5, color: T.green, fontWeight: '800' },
  footRow: { flexDirection: 'row', gap: 8 },
  footBtn: { flex: 1, height: 48, borderRadius: 12 },
});
