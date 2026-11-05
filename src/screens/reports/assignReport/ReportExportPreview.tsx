// FILE: src/screens/reports/assignReport/ReportExportPreview.tsx
// Assign Report → preview before download (full screen), for the report that is loaded on the screen.
//
//   [Excel | PDF]                        switch between the two without closing
//   Excel  the sheet drawn from the SAME data the .xlsx is written from (header, groups, sub totals, TOTAL,
//          colours, number format)                                          [Download Excel]
//   PDF    desktop browser: the finished PDF file inside the page; phone browser + Android / iOS: the same
//          layout as a page (on the phone expo-print makes the PDF from this very page)  [Print] [Download PDF]
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ExportInput } from './reportExportModel';
import { PreparedExcel, PreparedPdf, prepareExcel, preparePdf, printPdf, releasePdf, saveExcel, savePdf } from './reportFiles';
import { previewText, XSheet } from './reportXlsx';

export type ExportKind = 'excel' | 'pdf';

const CHAR_PX = 7.4;       // one Excel "character" of column width on screen
const PREVIEW_LINES = 150; // lines drawn in the Excel preview (the file always has every row)

const say = (title: string, text: string) => {
  if (Platform.OS === 'web') { (globalThis as any).alert?.(`${title}\n\n${text}`); return; }
  Alert.alert(title, text);
};

export function ReportExportPreview({ kind, input, onClose }: { kind: ExportKind | null; input: ExportInput | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ExportKind>('excel');
  const [excel, setExcel] = useState<PreparedExcel | null>(null);
  const [pdf, setPdf] = useState<PreparedPdf | null>(null);
  const [busy, setBusy] = useState<'' | ExportKind>('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<'' | 'file' | 'print'>('');
  const [done, setDone] = useState('');

  // a new export (opened from the screen) → start on the asked tab with fresh files
  useEffect(() => {
    if (!kind || !input) return;
    setTab(kind);
    setExcel(null);
    setPdf((old) => { releasePdf(old); return null; });
    setError('');
    setDone('');
  }, [kind, input]);

  // build the file of the open tab once
  useEffect(() => {
    if (!kind || !input) return undefined;
    if ((tab === 'excel' && excel) || (tab === 'pdf' && pdf)) return undefined;
    let alive = true;
    setBusy(tab);
    setError('');
    (async () => {
      try {
        if (tab === 'excel') { const f = await prepareExcel(input); if (alive) setExcel(f); } else {
          const f = await preparePdf(input);
          if (alive) setPdf(f); else releasePdf(f);
        }
      } catch (e: any) {
        if (alive) setError(e?.message || 'Could not build the file. Please try again.');
      } finally {
        if (alive) setBusy('');
      }
    })();
    return () => { alive = false; };
  }, [kind, input, tab, excel, pdf]);

  // free the PDF preview URL when the screen goes away
  const pdfRef = useRef<PreparedPdf | null>(null);
  pdfRef.current = pdf;
  useEffect(() => () => releasePdf(pdfRef.current), []);

  const title = input ? `${input.reportName}${input.settingName ? ` · ${input.settingName}` : ''}` : 'Report';
  const fileName = tab === 'excel' ? excel?.fileName : pdf?.fileName;
  const ready = tab === 'excel' ? !!excel : !!pdf;

  const download = async () => {
    if (saving || !ready) return;
    setSaving('file');
    setDone('');
    try {
      if (tab === 'excel' && excel) await saveExcel(excel, title);
      if (tab === 'pdf' && pdf) await savePdf(pdf, title);
      setDone(Platform.OS === 'web' ? `Downloaded ${fileName}` : `${fileName} is ready`);
    } catch (e: any) {
      say('Download failed', e?.message || 'Could not save the file. Please try again.');
    } finally {
      setSaving('');
    }
  };
  const print = async () => {
    if (saving || !pdf) return;
    setSaving('print');
    try { await printPdf(pdf); } catch (e: any) { say('Print failed', e?.message || 'Could not print. Please try again.'); } finally { setSaving(''); }
  };

  return (
    <Modal visible={!!kind} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={p.root}>
        <View style={[p.header, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
          <TouchableOpacity style={p.headBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close preview">
            <Icon name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={p.eyebrow}>EXPORT PREVIEW · GRID</Text>
            <Text style={p.title} numberOfLines={1}>{title}</Text>
          </View>
          <View style={p.seg}>
            {(['excel', 'pdf'] as ExportKind[]).map((k) => {
              const on = tab === k;
              return (
                <TouchableOpacity key={k} onPress={() => { setTab(k); setDone(''); }} style={[p.segBtn, on && (k === 'excel' ? p.segExcel : p.segPdf)]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                  <Icon name={k === 'excel' ? 'table-view' : 'picture-as-pdf'} size={16} color={on ? '#fff' : 'rgba(255,255,255,0.75)'} />
                  <Text style={[p.segText, on && { color: '#fff' }]}>{k === 'excel' ? 'Excel' : 'PDF'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={p.body}>
          {busy ? (
            <View style={p.state}>
              <ActivityIndicator size="large" color={T.copper} />
              <Text style={p.stateTitle}>{busy === 'excel' ? 'Preparing the Excel file…' : 'Preparing the PDF…'}</Text>
              <Text style={p.stateText}>{input ? `${input.rows.length} rows · ${input.cols.length} columns` : ''}</Text>
            </View>
          ) : error ? (
            <View style={p.state}><Icon name="error-outline" size={32} color={T.red} /><Text style={[p.stateText, { color: T.red }]}>{error}</Text></View>
          ) : tab === 'excel' && excel ? (
            <SheetView sheet={excel.sheet} />
          ) : tab === 'pdf' && pdf ? (
            Platform.OS === 'web'
              ? React.createElement('iframe', {
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
              {input ? `${input.rows.length} row${input.rows.length !== 1 ? 's' : ''} · ${input.cols.length} column${input.cols.length !== 1 ? 's' : ''}${input.groups.length ? ' · grouped with sub totals' : ''}${input.hasTotals ? ' · grand total' : ''} — exactly what the screen shows, as a grid.` : ''}
            </Text>
          )}
          <View style={p.footRow}>
            <FootBtn label="Close" kind="ghost" onPress={onClose} />
            {tab === 'pdf' ? <FootBtn label="Print" icon="print" kind="ghost" onPress={print} loading={saving === 'print'} disabled={!ready || !!saving} /> : null}
            <FootBtn
              label={tab === 'excel' ? 'Download Excel' : 'Download PDF'}
              icon="file-download"
              kind={tab === 'excel' ? 'excel' : 'pdf'}
              onPress={download}
              loading={saving === 'file'}
              disabled={!ready || !!saving}
              grow
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FootBtn({ label, icon, kind, onPress, loading, disabled, grow }: {
  label: string; icon?: string; kind: 'ghost' | 'excel' | 'pdf'; onPress: () => void; loading?: boolean; disabled?: boolean; grow?: boolean;
}) {
  const bg = kind === 'excel' ? '#1D6F42' : kind === 'pdf' ? '#B23A2A' : T.surface;
  const fg = kind === 'ghost' ? T.ink : '#fff';
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.8} accessibilityRole="button"
      style={[p.footBtn, { backgroundColor: bg, flex: grow ? 1.6 : 1 }, kind === 'ghost' && { borderWidth: 1, borderColor: T.border }, (disabled || loading) && { opacity: 0.55 }]}>
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon as any} size={18} color={fg} /> : null}
      <Text style={[p.footText, { color: fg }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ------------------------- the sheet, drawn like Excel ------------------------ */

function SheetView({ sheet }: { sheet: XSheet }) {
  const widths = useMemo(() => sheet.cols.map((w) => Math.round(w * CHAR_PX)), [sheet]);
  const total = widths.reduce((s, w) => s + w, 0);
  const limit = sheet.headIndex + 1 + PREVIEW_LINES;
  const rows = sheet.rows.slice(0, limit);
  const more = sheet.rows.length - rows.length;
  const merged = useMemo(() => new Set(sheet.merges.map((m) => parseInt(m.replace(/^A(\d+):.*/, '$1'), 10) - 1)), [sheet]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[p.sheet, { width: total + 2 }]}>
          {rows.map((row, r) => {
            if (merged.has(r)) {
              const cell = row[0];
              const s = cell.s;
              return (
                <View key={r} style={[{ minHeight: cell.v === '' ? 10 : (sheet.heights[r] || 18) + 2, justifyContent: 'center', paddingHorizontal: 6, backgroundColor: s.bg ? `#${s.bg}` : 'transparent' }, s.border && p.bb]}>
                  {cell.v !== '' ? <Text style={{ fontSize: (s.sz || 10) + 1.5, fontWeight: s.b ? '800' : '500', color: `#${s.fg || '1A1514'}` }}>{String(cell.v)}</Text> : null}
                </View>
              );
            }
            return (
              <View key={r} style={{ flexDirection: 'row', minHeight: sheet.heights[r] ? sheet.heights[r] + 4 : 24 }}>
                {row.map((cell, i) => {
                  const s = cell.s;
                  return (
                    <View key={i} style={[p.cell, { width: widths[i], backgroundColor: s.bg ? `#${s.bg}` : '#fff', justifyContent: s.v === 'center' ? 'center' : 'flex-start' }, s.border && p.cellLine]}>
                      <Text numberOfLines={3} style={{ fontSize: (s.sz || 10) + 1.5, fontWeight: s.b ? '800' : '500', color: `#${s.fg || '1A1514'}`, textAlign: s.h || (typeof cell.v === 'number' ? 'right' : 'left'), fontVariant: ['tabular-nums'] }}>
                        {previewText(cell)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
      {more > 0 ? <Text style={p.more}>The preview shows the first {PREVIEW_LINES} lines — the downloaded file has all {sheet.rows.length - sheet.headIndex - 1} lines.</Text> : null}
    </ScrollView>
  );
}

const p = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: { backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 12, flexWrap: 'wrap' },
  headBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  eyebrow: { color: T.copper, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#fff', fontSize: 15.5, fontWeight: '800', marginTop: 1 },
  seg: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 10, padding: 3, gap: 3 },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 8 },
  segExcel: { backgroundColor: '#1D6F42' },
  segPdf: { backgroundColor: '#B23A2A' },
  segText: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, fontWeight: '800' },

  body: { flex: 1, minHeight: 0 },
  sheet: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D3CC', paddingTop: 4 },
  cell: { paddingHorizontal: 5, paddingVertical: 4 },
  cellLine: { borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#D9D3CC' },
  bb: { borderBottomWidth: 1, borderColor: '#D9D3CC' },
  more: { fontSize: 12, color: T.muted, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  stateTitle: { fontSize: 15, color: T.ink, fontWeight: '800', textAlign: 'center' },
  stateText: { fontSize: 12.5, color: T.muted, fontWeight: '600', textAlign: 'center' },

  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 12, paddingTop: 9, gap: 8 },
  note: { fontSize: 11.5, color: T.muted, fontWeight: '600' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneText: { flex: 1, fontSize: 12.5, color: T.green, fontWeight: '800' },
  footRow: { flexDirection: 'row', gap: 8 },
  footBtn: { height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 },
  footText: { fontSize: 13.5, fontWeight: '800' },
});
