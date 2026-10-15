// FILE: src/components/PackingAutomationNEW/RouteStep.tsx
// Step 1 — facility + route card. Scan first, typing as the fallback.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { Btn as SheetBtn, SelectField, Sheet, useYearStore } from '../StockVerificationNEW/ui';
import { fetchProperties } from '../StockVerificationNEW/verificationApi';
import type { Api, Ctx, Row } from './api';
import ScanSheet from './ScanSheet';
import { Btn, ErrorText, Notice, PickerField, Section, TextField, tab, u } from './ui';
import type { Errors, Form } from './usePackingForm';
import { routeView } from './usePackingForm';

/** Property / year / store sheet — same sources as Production Orders' context bar. */
export function FacilitySheet({ open, onClose, ctx, onApply, api, prptype }: {
  open: boolean; onClose: () => void; ctx: Ctx; onApply: (c: Ctx, name: string) => void; api: Api; prptype: string;
}) {
  const [d, setD] = useState<Ctx>(ctx);
  const [props, setProps] = useState<Row[]>([]);
  const vApi: any = useMemo(() => ({ ...api, prptype, cfg: {} }), [api, prptype]);
  const ys = useYearStore(open ? vApi : null, d.prpcode, d.yearno, (y: string) => setD((v) => ({ ...v, yearno: y })), (s: string) => setD((v) => ({ ...v, strcode: s })));
  useEffect(() => { if (open) { setD(ctx); fetchProperties(vApi).then(setProps).catch(() => setProps([])); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const propOpts = props
    .map((r) => ({ value: String(r.PrpCode ?? r.prpcode ?? ''), label: String(r.PrpName ?? r.prpname ?? r.PrpCode ?? '') }))
    .filter((o) => o.value);
  const name = propOpts.find((o) => o.value === d.prpcode)?.label || d.prpcode;
  return (
    <Sheet open={open} onClose={onClose} eyebrow="PACKING" title="Facility, year & store"
      footer={<SheetBtn label="Apply" kind="copper" disabled={!d.prpcode || !d.yearno || !d.strcode} onPress={() => onApply(d, name)} />}>
      <SelectField label="Property" required value={d.prpcode} options={propOpts} onChange={(v: string) => setD({ prpcode: v, yearno: '', strcode: '' })} />
      <SelectField label="Year" required value={d.yearno} options={ys.yearOpts} loading={ys.yLoading} disabled={!d.prpcode} onChange={(v: string) => setD((c) => ({ ...c, yearno: v, strcode: '' }))} />
      <SelectField label="Store" required value={d.strcode} options={ys.storeOpts} loading={ys.sLoading} disabled={!d.yearno} onChange={(v: string) => setD((c) => ({ ...c, strcode: v }))} />
    </Sheet>
  );
}

function Tile({ label, value, unit }: { label: string; value?: string; unit?: string }) {
  return (
    <View style={{ width: '50%', padding: 4 }}>
      <View style={{ backgroundColor: T.sub, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: T.muted }}>{label}</Text>
        <Text numberOfLines={1} style={[{ fontSize: 18, fontWeight: '800', color: T.ink, marginTop: 2 }, tab]}>{value || '—'}</Text>
        {unit ? <Text numberOfLines={1} style={{ fontSize: 12.5, color: T.muted }}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export default function RouteStep({
  f, ctx, facility, onFacility, busy, problem, errors, onRouteNo, onLookup,
}: {
  f: Form; ctx: Ctx; facility: string; onFacility: () => void;
  busy: { route?: boolean; defaults?: boolean }; problem: { route?: string; defaults?: string };
  errors: Errors; onRouteNo: (v: string) => void; onLookup: (no?: string) => Promise<boolean>;
}) {
  const [scan, setScan] = useState(false);
  const input = useRef<TextInput>(null);
  const r = routeView(f);
  const found = !!f.route && !busy.route;
  const canCamera = Platform.OS !== 'web';
  const ctxReady = !!(ctx.prpcode && ctx.yearno && ctx.strcode);

  return (
    <>
      <Section title="Facility">
        <PickerField label="" value={facility || undefined} placeholder="Choose facility" sub={ctxReady ? `FY ${ctx.yearno} · Store ${ctx.strcode}` : undefined}
          onPress={onFacility} icon="business" error={errors.facility} />
        {problem.defaults ? <ErrorText>{problem.defaults}</ErrorText> : null}
      </Section>

      <Section title="Route card">
        {canCamera ? (
          <>
            <Btn label="Scan route card" icon="qr-code-scanner" kind="copper" onPress={() => setScan(true)} disabled={!ctxReady || busy.defaults} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: T.border }} />
              <Text style={{ fontSize: 13, color: T.muted }}>or type / use a scanner</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: T.border }} />
            </View>
          </>
        ) : null}
        <TextField
          label=""
          inputRef={input}
          value={f.routeNo}
          onChangeText={(v) => onRouteNo(v.trim())}
          onSubmitEditing={() => onLookup()}
          autoFocus={Platform.OS === 'web'}
          editable={ctxReady && !busy.defaults}
          placeholder="Route card no."
          numeric
          big
          error={problem.route || errors.route}
          hint={canCamera ? undefined : 'Type the number or scan with a USB / Bluetooth scanner, then press Enter.'}
          right={
            busy.route ? <Text style={u.hint}>Finding…</Text>
              : found ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="check-circle" size={18} color={T.green} /><Text style={{ color: T.green, fontWeight: '800', fontSize: 13 }}>Found</Text></View>
                : <Btn label="Find" kind="ghost" onPress={() => onLookup()} disabled={!f.routeNo || !ctxReady} style={{ height: 40, paddingHorizontal: 14 }} />
          }
        />
      </Section>

      {f.route ? (
        <Section title="Route details" right={<Text style={{ fontSize: 12, fontWeight: '800', color: T.green }}>Auto-filled</Text>}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <Text style={[{ fontSize: 24, fontWeight: '800', color: T.ink }, tab]}>{r.itmcode || '—'}</Text>
            <Text style={{ fontSize: 15, color: T.muted, flexShrink: 1 }}>{r.itmname}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -4 }}>
            <Tile label="Shade" value={r.shdcode} unit={r.shdname} />
            <Tile label="Denier" value={r.denier} />
            <Tile label="Paper tube wt." value={r.cheeswt} />
            <Tile label="Stock type" value={r.stkLabel} />
          </View>
        </Section>
      ) : !busy.route && !problem.route ? (
        <Notice tone="info" text="Scan or type a route card to see its item, shade and denier." />
      ) : null}

      {canCamera ? (
        <ScanSheet open={scan} onClose={() => setScan(false)} onScanned={(code) => { setScan(false); onLookup(code); }} />
      ) : null}
    </>
  );
}
