// FILE: src/components/StockVerificationNEW/ManualEntrySheet.tsx
// "Add carton" (yarn) / "Physical stock not in system" (fabric) — port of the
// legacy CartonAddDrawer. Same masters (itemdrop / mergedrop / gradedrop /
// shadedrop / designdrop), same required fields, same insert payload.
//   Yarn   : Carton no, Chees, Item (sets Denier), Merge, Grade, Shade,
//            Denier, Gross wt, Net wt, Stock type.
//   Fabric : Taka / Roll no, Item, Design, Grade, Shade (optional),
//            Physical meter (→ GrsWt + NetWt), Stock type; QR fill supported.
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import QrScanSheet from './QrScanSheet';
import { Api, fetchMasters, Masters } from './verificationApi';
import {
  applyManualQr, ENTRY_STOCK_TYPES, Filter, Manual, str, validateManual,
} from './verificationModel';
import { Btn, Opt, Segment, SelectField, Sheet, toOpts, u, useYearStore } from './ui';

type Props = {
  open: boolean;
  api: Api | null;
  filter: Filter;
  propOpts: Opt[];
  propLoading: boolean;
  onReloadProps: () => void;
  value: Manual;
  onChange: Dispatch<SetStateAction<Manual>>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
};

const EMPTY: Masters = { items: [], merges: [], grades: [], shades: [], designs: [] };

export default function ManualEntrySheet({
  open, api, filter, propOpts, propLoading, onReloadProps, value: m, onChange, saving, onSave, onClose,
}: Props) {
  const fabric = api?.cfg.kind === 'fabric';
  const cfg = api?.cfg;
  const { width } = useWindowDimensions();
  const two = width >= 560;
  const set = (patch: Partial<Manual>) => onChange((prev) => ({ ...prev, ...patch }));

  const ys = useYearStore(open ? api : null, m.PrpCode, m.YearNo,
    (y) => onChange((prev) => (prev.YearNo ? prev : { ...prev, YearNo: y })),
    (s) => onChange((prev) => (prev.StrCode ? prev : { ...prev, StrCode: s })));

  // masters load once property + year + store are known (legacy)
  const [masters, setMasters] = useState<Masters>(EMPTY);
  const [mLoading, setML] = useState(false);
  const [mTick, setMTick] = useState(0);
  useEffect(() => {
    if (!open || !api || !m.PrpCode || !m.YearNo || !m.StrCode) { setMasters(EMPTY); return; }
    let alive = true;
    setML(true);
    fetchMasters(api, m)
      .then((r) => alive && setMasters(r))
      .finally(() => alive && setML(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, api?.API, api?.token, m.PrpCode, m.YearNo, m.StrCode, mTick]);

  const itemOpts = useMemo(() => toOpts(masters.items, 'ItmCode', 'ItmName', (r) => `${str(r.ItmCode)} ${str(r.Denier)}`), [masters.items]);
  const mergeOpts = useMemo(() => toOpts(masters.merges, 'MerCode', 'MerName'), [masters.merges]);
  const gradeOpts = useMemo(() => toOpts(masters.grades, 'GrdCode', 'GrdName'), [masters.grades]);
  const shadeOpts = useMemo(() => toOpts(masters.shades, 'ShdCode', 'ShdName'), [masters.shades]);
  const designOpts = useMemo(() => toOpts(masters.designs, 'DsnCode', 'DsnName'), [masters.designs]);

  const ctxReady = !!(m.PrpCode && m.YearNo && m.StrCode);
  const needCtx = 'Select property, year & store first';

  const [scan, setScan] = useState(false);
  const onScanned = (v: string) => {
    try {
      onChange((prev) => applyManualQr(v, prev, filter));
      setScan(false);
    } catch (_) {
      setScan(false);
      AppAlert.alert('Invalid QR', 'QR format is not valid.');
    }
  };

  // validation shown inside the sheet (a root snackbar would sit behind the modal)
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setErr(null); }, [m, open]);
  const save = () => {
    const e = validateManual(fabric ? 'fabric' : 'yarn', m);
    setErr(e);
    if (!e) onSave();
  };

  const row = (children: React.ReactNode) => <View style={[ms.row, !two && { flexDirection: 'column' }]}>{children}</View>;
  const input = (label: string, key: keyof Manual, opts: { required?: boolean; numeric?: boolean; placeholder?: string } = {}) => (
    <View style={{ flex: 1, minWidth: 140 }}>
      <Text style={u.label}>{label}{opts.required ? <Text style={{ color: T.red }}> *</Text> : null}</Text>
      <TextInput
        value={String(m[key] ?? '')}
        onChangeText={(t: string) => set({ [key]: opts.numeric ? t.replace(/[^0-9.]/g, '') : t } as Partial<Manual>)}
        keyboardType={opts.numeric ? 'decimal-pad' : 'default'}
        placeholder={opts.placeholder}
        placeholderTextColor={T.muted}
        style={u.input}
      />
    </View>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={fabric ? 'MANUAL ENTRY' : 'ADD CARTON'}
      title={cfg?.manualTitle || 'Manual entry'}
      notice={err ? (
        <View style={ms.err} accessibilityLiveRegion="polite">
          <Icon name="error-outline" size={18} color={T.red} />
          <Text style={ms.errText}>{err}</Text>
        </View>
      ) : null}
      footer={(
        <>
          <Btn label="Cancel" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Btn label={fabric ? 'Save taka' : 'Save carton'} icon="save" kind="copper" onPress={save} loading={saving} style={{ flex: 2 }} />
        </>
      )}
    >
      {fabric ? (
        <View style={ms.scanBar}>
          <Icon name="qr-code-2" size={22} color={T.copper} />
          <Text style={ms.scanText}>Scan the taka label to fill the form, then check and save.</Text>
          <Btn label="Scan QR" icon="qr-code-scanner" compact onPress={() => setScan(true)} />
        </View>
      ) : null}

      <Text style={ms.section}>LOCATION</Text>
      {row(<>
        <SelectField label="Property" required value={m.PrpCode} options={propOpts} loading={propLoading} onRefresh={onReloadProps}
          onChange={(v) => set({ PrpCode: v, YearNo: '', StrCode: '' })} />
        <SelectField label="Year" required value={m.YearNo} options={ys.yearOpts} loading={ys.yLoading} onRefresh={ys.reloadYears}
          disabled={!m.PrpCode} disabledHint="Select property first" onChange={(v) => set({ YearNo: v, StrCode: '' })} />
      </>)}
      {row(<>
        <SelectField label="Store" required value={m.StrCode} options={ys.storeOpts} loading={ys.sLoading} onRefresh={ys.reloadStores}
          disabled={!m.YearNo} disabledHint="Select year first" onChange={(v) => set({ StrCode: v })} />
        <Segment label="Stock type" required value={m.StkType} options={ENTRY_STOCK_TYPES} onChange={(v) => set({ StkType: v })} />
      </>)}

      <Text style={ms.section}>{fabric ? 'TAKA' : 'CARTON'}</Text>
      {fabric ? (
        <>
          {row(<>
            {input('Taka / Roll No.', 'CartNo', { required: true, placeholder: 'Enter or scan taka number' })}
            {input('Physical meter', 'netWt', { required: true, numeric: true, placeholder: '0.000' })}
          </>)}
          {row(<>
            <SelectField label="Item" required value={m.ItmCode} options={itemOpts} loading={mLoading} disabled={!ctxReady} disabledHint={needCtx}
              onRefresh={() => setMTick((t) => t + 1)} onChange={(v) => set({ ItmCode: v })} />
            <SelectField label="Design" value={m.DsnCode} options={designOpts} loading={mLoading} disabled={!ctxReady} disabledHint={needCtx} clearable
              placeholder="Optional" onRefresh={() => setMTick((t) => t + 1)} onChange={(v) => set({ DsnCode: v })} />
          </>)}
          {row(<>
            <SelectField label="Grade" value={m.GrdCode} options={gradeOpts} loading={mLoading} disabled={!ctxReady} disabledHint={needCtx} clearable
              placeholder="Optional" onRefresh={() => setMTick((t) => t + 1)} onChange={(v) => set({ GrdCode: v })} />
            <SelectField label="Shade" value={m.ShdCode} options={shadeOpts} loading={mLoading} disabled={!ctxReady} disabledHint={needCtx} clearable
              placeholder="Optional" onRefresh={() => setMTick((t) => t + 1)} onChange={(v) => set({ ShdCode: v })} />
          </>)}
          <View style={ms.note}>
            <Icon name="info-outline" size={16} color={T.yd} />
            <Text style={ms.noteText}>Physical meter is saved as both gross and net. Existing system stock is not changed.</Text>
          </View>
        </>
      ) : (
        <>
          {row(<>
            {input('Carton no.', 'CartNo', { required: true, placeholder: 'Carton number' })}
            {input('Chees', 'Chees', { required: true, numeric: true, placeholder: '0' })}
          </>)}
          {row(<>
            <SelectField label="Item" required value={m.ItmCode} options={itemOpts} loading={mLoading} disabled={!ctxReady} disabledHint={needCtx}
              onRefresh={() => setMTick((t) => t + 1)}
              onChange={(v) => {
                const it = masters.items.find((x) => str(x.ItmCode) === v);
                set({ ItmCode: v, Denier: str(it?.Denier) });
              }} />
            <SelectField label="Merge" required value={m.MerCode} options={mergeOpts} loading={mLoading} disabled={!ctxReady} disabledHint={needCtx}
              onRefresh={() => setMTick((t) => t + 1)} onChange={(v) => set({ MerCode: v })} />
          </>)}
          {row(<>
            <SelectField label="Grade" required value={m.GrdCode} options={gradeOpts} loading={mLoading} disabled={!ctxReady} disabledHint={needCtx}
              onRefresh={() => setMTick((t) => t + 1)} onChange={(v) => set({ GrdCode: v })} />
            <SelectField label="Shade" required value={m.ShdCode} options={shadeOpts} loading={mLoading} disabled={!ctxReady} disabledHint={needCtx}
              onRefresh={() => setMTick((t) => t + 1)} onChange={(v) => set({ ShdCode: v })} />
          </>)}
          {row(<>
            {input('Denier', 'Denier', { placeholder: 'From item' })}
            {input('Gross wt.', 'grsWt', { numeric: true, placeholder: '0.000' })}
            {input('Net wt.', 'netWt', { required: true, numeric: true, placeholder: '0.000' })}
          </>)}
        </>
      )}

      {fabric ? (
        <QrScanSheet
          visible={scan}
          title="Scan taka for manual entry"
          subtitle="Place the taka QR inside the frame"
          footer="Scanning only fills the form. Nothing is saved until you press Save."
          manualPlaceholder="Type / paste QR text"
          onClose={() => setScan(false)}
          onScanned={onScanned}
        />
      ) : null}
    </Sheet>
  );
}

const ms = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  section: { fontSize: 10.5, fontWeight: '800', color: T.copper, letterSpacing: 1.2, marginTop: 4 },
  scanBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: T.sub, borderWidth: 1, borderColor: T.hair },
  scanText: { flex: 1, fontSize: 12.5, color: T.ink, lineHeight: 17 },
  err: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, borderRadius: 10, backgroundColor: '#FBEDEA', borderWidth: 1, borderColor: '#EBC3BC' },
  errText: { flex: 1, fontSize: 13, fontWeight: '700', color: T.red },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 10, borderRadius: 10, backgroundColor: '#EEF4F8' },
  noteText: { flex: 1, fontSize: 12, color: T.yd, lineHeight: 17 },
});
