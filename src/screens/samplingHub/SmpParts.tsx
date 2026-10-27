// FILE: src/screens/samplingHub/SmpParts.tsx
// Small building blocks of the Sampling Hub (same vocabulary as the artifact / Yarn Hub: segs, chips, stat cards,
// rows, widgets) and the QR sticker card (the print server's own preview, shown inline + print).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../yarnHub/yarnHubModel';
import { colourLabel, dateShort, designLabel, Move, PURPOSE, Sample, SMP_TYPE, SmpState } from './samplingHubModel';
import { SamplingHubAPI } from '@/src/api/legacyClient';
import { useErpSession } from '@/src/core/session/erpSession';
import { PrinterSheet } from '../checkingScannerNew/PrinterSheet';
import { errText, unwrap } from './samplingHubModel';
import { loadPrinters, MAX_COPIES, previewSticker, Printer, printErr, printSticker, rememberPrinter, withCopies } from './samplingPrint';
import { SmpPdfInline } from './SmpPdfInline';
import { SmpPdfPreview } from './SmpPdfPreview';

export const MF = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" }) as string;

export function Seg({ on, label, onPress, color, icon, testID }: { on: boolean; label: string; onPress: () => void; color?: string; icon?: string; testID?: string }) {
  const c = color || C.prod;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} testID={testID}
      style={[st.seg, { borderColor: on ? c : C.bd, backgroundColor: on ? c + '14' : '#fff' }]}>
      {icon ? <Icon name={icon as any} size={13} color={on ? c : C.mut} /> : null}
      <Text style={[st.segT, { color: on ? c : C.mut }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}
export const Chip = ({ t, c }: { t: string; c?: string }) => (
  <View style={[st.chip, { backgroundColor: (c || C.mut) + '14', borderColor: (c || C.mut) + '33' }]}><Text style={[st.chipT, { color: c || C.mut }]}>{t}</Text></View>
);
export const StBadge = ({ s }: { s: SmpState }) => (
  <View style={[st.badge, { backgroundColor: s.color }]}><Text style={st.badgeT} numberOfLines={1}>{s.label.toUpperCase()}</Text></View>
);
export const StatCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <View style={st.stat}><Text style={st.statL} numberOfLines={1}>{label}</Text><Text style={[st.statV, { color: color || C.ink }]} numberOfLines={2}>{value}</Text></View>
);
export const Head = ({ t, right }: { t: string; right?: React.ReactNode }) => (
  <View style={st.headRow}><Text style={st.head}>{t}</Text>{right}</View>
);
export function Widget({ icon, title, accent, onTitle, children }: { icon: string; title: string; accent: string; onTitle?: () => void; children: React.ReactNode }) {
  return (
    <View style={[st.card, { borderTopWidth: 3, borderTopColor: accent }]}>
      <Pressable onPress={onTitle} disabled={!onTitle} style={st.wHead} accessibilityRole={onTitle ? 'button' : undefined}>
        <Icon name={icon as any} size={16} color={accent} />
        <Text style={st.wTitle} numberOfLines={1}>{title}</Text>
        {onTitle ? <Text style={[st.more, { color: accent }]}>›</Text> : null}
      </Pressable>
      {children}
    </View>
  );
}
export const Empty = ({ t }: { t: string }) => <Text style={st.empty}>{t}</Text>;

export function TypeIcon({ s, size, photo }: { s: Sample; size: number; photo?: string }) {
  const t = SMP_TYPE[s.type];
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: 10, borderWidth: 1, borderColor: T.border }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: t.color + '18', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={t.icon as any} size={Math.round(size * 0.5)} color={t.color} />
    </View>
  );
}

export function SampleRow({ s, state, onPress, right }: { s: Sample; state: SmpState; onPress: () => void; right?: string }) {
  const t = SMP_TYPE[s.type];
  const col = colourLabel(s);
  return (
    <Pressable onPress={onPress} style={st.row} accessibilityRole="button" accessibilityLabel={`Sample ${s.id}`}>
      <TypeIcon s={s} size={34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={st.rowTop}>
          <Text style={st.rowId}>{s.id}</Text>
          <Text style={st.rowName} numberOfLines={1}>{s.name}</Text>
        </View>
        <Text style={st.rowSub} numberOfLines={2}>
          {t.lbl}{s.category ? ' · ' + s.category : ''} · {designLabel(s)}{col ? ' · ' + col : ''}
          {!s.tracked ? ` · ${state.bal} of ${s.qty} ${t.unit}s left` : ''}{right ? ' · ' + right : ''}
        </Text>
      </View>
      <StBadge s={state} />
    </Pressable>
  );
}

export function MoveRow({ m, sample, onPress, onEdit, onDelete }: { m: Move; sample?: Sample | null; onPress?: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const p = PURPOSE[m.purpose];
  const unit = sample ? SMP_TYPE[sample.type].unit : 'pc';
  const isEv = !!p.event;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={st.row} accessibilityLabel={`Movement ${m.no}`}>
      <View style={[st.pBadge, { backgroundColor: p.color }]}><Text style={st.pBadgeT}>{p.short.toUpperCase()}</Text></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.mvTitle} numberOfLines={1}>
          {sample ? <Text style={{ fontFamily: MF }}>{sample.id} </Text> : null}
          {sample ? sample.name : p.lbl}
          {m.party ? <Text style={{ color: C.mut, fontWeight: '600' }}> → {m.party}</Text> : null}
          {isEv ? <Text style={{ color: p.color, fontWeight: '700' }}>{m.purpose === 'event_out' ? ' → ' : ' ← '}{m.event || m.event_id}</Text> : null}
        </Text>
        <Text style={st.rowSub} numberOfLines={2}>
          {dateShort(m.date)} · {isEv ? 'scanned by ' : ''}{m.by}{isEv && m.carrier ? (m.purpose === 'event_out' ? ' · carried by ' : ' · brought back by ') + m.carrier : ''}
          {(sample && !sample.tracked) || m.qty > 1 ? ` · ${m.qty} ${unit}${m.qty !== 1 ? 's' : ''}` : ''}{m.note ? ' · ' + m.note : ''}{m.edited_by ? ` · modified by ${m.edited_by}` : ''}
        </Text>
        {onEdit || onDelete ? (
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 4 }}>
            {onEdit ? <Text onPress={onEdit} style={st.link} accessibilityRole="button" accessibilityLabel={`Modify ${m.no}`}>Modify</Text> : null}
            {onDelete ? <Text onPress={onDelete} style={[st.link, { color: T.red }]} accessibilityRole="button" accessibilityLabel={`Delete ${m.no}`}>Delete</Text> : null}
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[st.singlet, { color: m.singlet ? T.copper : C.mut }]}>{m.singlet ? '#' + m.singlet : '—'}</Text>
        <Text style={st.singletL}>singlet</Text>
      </View>
    </Pressable>
  );
}

/**
 * QR sticker: what the print server will print — "Preview from printer" (POST /api/taka-preview-label, the PDF Node
 * renders) is called by itself when the card opens and again when the copies change, and the PDF is shown right
 * here. Nothing is drawn by the app, so what you see is exactly the label. Print = /api/taka-print-label.
 */
export function StickerCard({ samples, ctx, canPrint, onDone, onError }: {
  samples: Sample[]; ctx: { prptype: string; yearno: string; prpcode: string }; canPrint: boolean;
  onDone: (msg: string) => void; onError: (msg: string) => void;
}) {
  const { session } = useErpSession();
  const token = session?.token || '';
  const API = session?.API || '';
  const [copies, setCopies] = useState('1');
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printer, setPrinter] = useState('');
  const [pLoading, setPLoading] = useState(false);
  const [pErr, setPErr] = useState('');
  const [sheet, setSheet] = useState(false);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState<'' | 'print'>('');
  const [full, setFull] = useState(false);
  // preview from the print server: { key of what it shows, loading, error, pdf }
  const [pv, setPv] = useState<{ key: string; loading: boolean; error: string; pdf: string }>({ key: '', loading: false, error: '', pdf: '' });
  const [apiNotes, setApiNotes] = useState<Record<string, string>>({});
  const rowsRef = useRef<{ key: string; rows: any[] } | null>(null);
  const reqRef = useRef(0);
  const first = samples[0];
  const idsKey = samples.map((x) => x.id).join(',');
  const n = Math.max(1, Math.min(MAX_COPIES, +copies || 1));
  const total = samples.length * n;

  const reload = async () => {
    if (!API || !token) { setPErr('Login session not ready — reopen the screen.'); return; }
    setPLoading(true); setPErr('');
    try {
      const r = await loadPrinters(API, token);
      setPrinters(r.printers);
      setPrinter((cur) => cur || r.selected);
      if (!r.printers.length) setPErr('No printer found from Laravel print bridge.');
    } catch (e: any) {
      setPErr(printErr(e));
    } finally {
      setPLoading(false);
    }
  };
  useEffect(() => { if (canPrint && token) void reload(); }, [canPrint, token]); // eslint-disable-line react-hooks/exhaustive-deps

  /** the sticker rows from the API (Taka row shape + label from the New Design master), read once per set of samples */
  const rowsFromApi = async () => {
    if (rowsRef.current && rowsRef.current.key === idsKey) return rowsRef.current.rows;
    const r = await SamplingHubAPI.sticker({ ...ctx, ids: samples.map((x) => x.id) });
    const d = unwrap(r);
    if (!Array.isArray(d?.rows) || !d.rows.length) throw new Error('The server returned no sticker rows.');
    setApiNotes(d.notes && typeof d.notes === 'object' ? d.notes : {});
    rowsRef.current = { key: idsKey, rows: d.rows };
    return d.rows as any[];
  };

  /** "Preview from printer" — automatic: on open, and again when the copies change */
  const preview = async (force = false) => {
    if (!canPrint || !first) return;
    if (!API || !token) { setPv({ key: '', loading: false, error: 'Login session not ready — reopen the screen.', pdf: '' }); return; }
    const key = idsKey + '×' + n;
    if (!force && pv.key === key && (pv.pdf || pv.loading)) return;
    const req = ++reqRef.current;
    if (force) rowsRef.current = null;
    setPv({ key, loading: true, error: '', pdf: '' });
    try {
      const rows = withCopies(await rowsFromApi(), n);
      const pdf = await previewSticker(API, rows, token);
      if (req === reqRef.current) setPv({ key, loading: false, error: '', pdf });
    } catch (e: any) {
      if (req === reqRef.current) setPv({ key, loading: false, error: e?.response ? printErr(e) : errText(e, 'Preview failed.'), pdf: '' });
    }
  };
  useEffect(() => {
    const t = setTimeout(() => void preview(), pv.key ? 600 : 0);   // copies typed → wait until the typing stops
    return () => clearTimeout(t);
  }, [idsKey, n, canPrint, token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!first) return null;
  const t = SMP_TYPE[first.type];
  const doPrint = async () => {
    if (!printer) { setPending(true); setSheet(true); return; }
    setBusy('print');
    try {
      const rows = withCopies(await rowsFromApi(), n);
      const r = await printSticker(API, rows, printer, token);
      onDone(r.message);
      setSheet(false); setPending(false);
    } catch (e: any) {
      onError(e?.response ? printErr(e) : errText(e, 'Print failed.'));
    } finally {
      setBusy('');
    }
  };
  const notes = samples.map((x) => (apiNotes[x.id] ? `${x.id}: ${apiNotes[x.id]}` : '')).filter(Boolean);

  return (
    <View style={[st.card, { gap: 10 }]} testID="sticker-card">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[st.head, { flex: 1 }]}>QR STICKER{samples.length > 1 ? ` · ${samples.length} SAMPLES` : ` · ${first.id}`} · {t.lbl.toUpperCase()}{n > 1 ? ` · ${n} COPIES` : ''}</Text>
        {canPrint && pv.pdf ? <Text onPress={() => setFull(true)} style={st.link} accessibilityRole="button" accessibilityLabel="Full screen preview">Full screen</Text> : null}
        {canPrint ? <Text onPress={() => void preview(true)} style={st.link} accessibilityRole="button" accessibilityLabel="Refresh preview">↻ Refresh</Text> : null}
      </View>
      {canPrint ? (
        <View style={st.pvBox} testID="sticker-preview">
          {pv.loading ? (
            <View style={st.pvCenter}><ActivityIndicator color={T.copper} /><Text style={st.note}>Getting the sticker from the print server…</Text></View>
          ) : pv.error ? (
            <View style={st.pvCenter}>
              <Icon name="error-outline" size={28} color={T.red} />
              <Text style={[st.note, { color: T.red, textAlign: 'center' }]}>{pv.error}</Text>
              <Text onPress={() => void preview(true)} style={st.link} accessibilityRole="button">Try again</Text>
            </View>
          ) : pv.pdf ? (
            <SmpPdfInline pdfBase64={pv.pdf} height={total > 1 ? 340 : 260} />
          ) : <View style={st.pvCenter}><Text style={st.note}>No preview yet.</Text></View>}
        </View>
      ) : null}
      {notes.length ? <Text style={[st.note, { color: T.red }]}>Width / GSM / Blend blank — {notes.join(' · ')}</Text> : null}
      {canPrint ? (
        <Text style={st.note}>This is the label exactly as the print server makes it ({total} sticker{total !== 1 ? 's' : ''}{samples.length > 1 ? ': ' + samples.map((x) => x.id).join(', ') : ''}). Design, Width, GSM and Blend come from the New Design master; Name and Remarks from this sample; the QR opens this sample when scanned.</Text>
      ) : null}
      {canPrint ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <Pressable onPress={() => { setPending(false); setSheet(true); if (!printers.length) void reload(); }} style={st.printerBtn} accessibilityRole="button" accessibilityLabel="Choose printer">
              <Icon name="print" size={16} color={T.nav} />
              <Text style={st.printerT} numberOfLines={1}>{printer || (pLoading ? 'Loading printers…' : 'Choose printer')}</Text>
              <Icon name="expand-more" size={18} color={T.muted} />
            </Pressable>
            <Text style={st.lbl}>COPIES</Text>
            <TextInput value={copies} onChangeText={(v) => setCopies(v.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" style={st.copies} accessibilityLabel="Copies" />
          </View>
          {pErr ? <Text style={[st.note, { color: T.red }]}>{pErr}</Text> : null}
          <Pressable onPress={doPrint} disabled={!!busy} style={[st.printBtn, busy === 'print' && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel="Print sticker">
            <Icon name="print" size={18} color="#fff" />
            <Text style={st.printT}>{busy === 'print' ? 'Printing…' : `Print ${total > 1 ? total + ' stickers' : 'sticker'}`}</Text>
          </Pressable>
        </>
      ) : <Text style={st.note}>The sticker preview and printing need the “Print QR sticker” right.</Text>}
      <PrinterSheet
        visible={sheet}
        subtitle={pending ? `Print ${total} sticker${total !== 1 ? 's' : ''}` : 'Sticker printer'}
        printers={printers}
        printer={printer}
        loading={pLoading}
        error={pErr}
        pending={pending}
        printing={busy === 'print'}
        onSelect={(p) => { setPrinter(p.Name); void rememberPrinter(p.Name); }}
        onReload={reload}
        onClose={() => { setSheet(false); setPending(false); }}
        onPrint={doPrint}
      />
      <SmpPdfPreview visible={full} title={first.id + (samples.length > 1 ? ` + ${samples.length - 1}` : '')} printer={printer} loading={pv.loading} error={pv.error} pdfBase64={pv.pdf}
        onRetry={() => void preview(true)} onClose={() => setFull(false)} />
    </View>
  );
}

export const st = StyleSheet.create({
  seg: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5 },
  segT: { fontSize: 11, fontWeight: '800' },
  chip: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1 },
  chipT: { fontSize: 9, fontWeight: '800' },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, maxWidth: 130 },
  badgeT: { color: '#fff', fontSize: 9, fontWeight: '800' },
  stat: { flexGrow: 1, flexBasis: 130, backgroundColor: T.sub, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: T.hair },
  statL: { fontSize: 9, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  statV: { fontSize: 14, fontWeight: '800', marginTop: 3 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 },
  head: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, marginBottom: 12 },
  wHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  wTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: C.ink },
  more: { fontSize: 18, fontWeight: '800' },
  empty: { fontSize: 11.5, color: C.mut, paddingVertical: 10, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: T.hair },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowId: { fontFamily: MF, fontWeight: '700', fontSize: 12, color: C.ink },
  rowName: { fontWeight: '700', fontSize: 12.5, color: C.ink, flexShrink: 1 },
  rowSub: { fontSize: 10.5, color: C.mut, marginTop: 1 },
  pBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  pBadgeT: { color: '#fff', fontSize: 8.5, fontWeight: '800' },
  mvTitle: { fontWeight: '700', fontSize: 12.5, color: C.ink },
  singlet: { fontFamily: MF, fontSize: 12, fontWeight: '800' },
  singletL: { fontSize: 8, color: C.mut, letterSpacing: 0.3 },
  link: { fontSize: 11.5, fontWeight: '800', color: T.nav },
  pvBox: { borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 6, backgroundColor: T.sub, minHeight: 160 },
  pvCenter: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 },
  note: { fontSize: 10.5, color: C.mut },
  lbl: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
  copies: { width: 54, height: 34, borderWidth: 1, borderColor: T.border, borderRadius: 8, textAlign: 'center', fontFamily: MF, fontSize: 14, color: T.ink, backgroundColor: '#fff' },
  printBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: T.nav, borderRadius: 10, paddingVertical: 11 },
  printT: { color: '#fff', fontWeight: '800', fontSize: 13 },
  printerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: T.border, borderRadius: 9, paddingHorizontal: 10, height: 36, backgroundColor: '#fff', maxWidth: 260 },
  printerT: { fontSize: 12.5, fontWeight: '700', color: T.nav, flexShrink: 1 },
});
