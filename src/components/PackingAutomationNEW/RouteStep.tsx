// FILE: src/components/PackingAutomationNEW/RouteStep.tsx
// Step 1 — facility + route card picked from the list of cards open for packing.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Btn as SheetBtn, SelectField, Sheet, useYearStore } from '../StockVerificationNEW/ui';
import { fetchProperties } from '../StockVerificationNEW/verificationApi';
import type { Api, Ctx, Row } from './api';
import { ErrorText, LinkBtn, Notice, PickerField, Section, tab, u } from './ui';
import type { Errors, Form } from './usePackingForm';
import { routeRowView, routeSearchText, routeView } from './usePackingForm';

const LIST_LIMIT = 40;

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

function Tile({ label, name, code }: { label: string; name?: string; code?: string }) {
  const main = name || code;
  return (
    <View style={{ width: '50%', padding: 4 }}>
      <View style={{ backgroundColor: T.sub, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: T.muted }}>{label}</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: T.ink, marginTop: 2 }}>{main || '—'}</Text>
        {name && code && code !== name ? <Text style={[u.code, tab]}>{code}</Text> : null}
      </View>
    </View>
  );
}

/** One route card in the list: number + date on the left, item / shade / machine on the right. */
function RouteRow({ row, selected, onPress }: { row: Row; selected: boolean; onPress: () => void }) {
  const v = routeRowView(row);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}
      accessibilityLabel={`Route card ${v.routeNo}, item ${v.itmcode}, shade ${v.shdcode}`}
      style={({ pressed }) => [
        { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, marginBottom: 8 },
        selected && { borderColor: T.copper, backgroundColor: T.copper + '10' },
        pressed && !selected && { backgroundColor: T.sub },
      ]}>
      <View style={{ width: 112 }}>
        <Text style={[{ fontSize: 17, fontWeight: '800', color: T.ink }, tab]}>{v.routeNo || '—'}</Text>
        {v.date ? <Text style={[{ fontSize: 12, color: T.muted, marginTop: 2 }, tab]}>{v.date}</Text> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ fontSize: 15.5, fontWeight: '800', color: T.ink }}>{v.itmname || v.itmcode || '—'}</Text>
        {v.itmname && v.itmcode ? <Text style={[u.code, tab]}>Item {v.itmcode}</Text> : null}
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink }}>
          {v.shdname || v.shdcode}
          {v.shdname && v.shdcode ? <Text style={[u.code, tab]}>{`  ${v.shdcode}`}</Text> : null}
          {v.denier ? <Text style={[{ fontWeight: '600', color: T.muted }, tab]}>{`  ·  ${v.denier} D`}</Text> : null}
          {v.machine ? <Text style={{ fontWeight: '600', color: T.muted }}>{`  ·  ${v.machine}`}</Text> : null}
        </Text>
        {v.subMerge ? (
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink }}>
            Merge {v.subMerge}
            {v.mainMerge && v.mainMerge !== v.subMerge ? <Text style={[u.code, tab]}>{`  main ${v.mainMerge}`}</Text> : null}
          </Text>
        ) : null}
        {v.parname ? <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.ink }}>{v.parname}</Text> : null}
      </View>
      <Icon name={selected ? 'check-circle' : 'chevron-right'} size={22} color={selected ? T.copper : T.muted} style={{ alignSelf: 'center' }} />
    </Pressable>
  );
}

export default function RouteStep({
  f, ctx, facility, onFacility, routes, busy, problem, errors, onChoose, onReload,
}: {
  f: Form; ctx: Ctx; facility: string; onFacility: () => void; routes: Row[];
  busy: { routes?: boolean; defaults?: boolean }; problem: { routes?: string; defaults?: string };
  errors: Errors; onChoose: (row: Row) => Promise<boolean> | boolean; onReload: () => void;
}) {
  const [q, setQ] = useState('');
  const [browsing, setBrowsing] = useState(!f.route);
  useEffect(() => { if (!f.route) setBrowsing(true); }, [f.route]);
  const r = routeView(f);
  const ctxReady = !!(ctx.prpcode && ctx.yearno && ctx.strcode);

  const filtered = useMemo(() => {
    const s = q.trim().toUpperCase();
    if (!s) return routes;
    // Searches every field of the card: route no., date, machine, item, shade, main / sub merge, party…
    return routes.filter((row) => routeSearchText(row).includes(s));
  }, [routes, q]);
  const shown = filtered.slice(0, LIST_LIMIT);

  return (
    <>
      <Section title="Facility">
        <PickerField label="" value={facility || undefined} placeholder="Choose facility" sub={ctxReady ? `FY ${ctx.yearno} · Store ${ctx.strcode}` : undefined}
          onPress={onFacility} icon="business" error={errors.facility} />
        {problem.defaults ? <ErrorText>{problem.defaults}</ErrorText> : null}
      </Section>

      {f.route && !browsing ? (
        <>
          <Section title="Route card" right={<LinkBtn label="Change" icon="swap-horiz" onPress={() => setBrowsing(true)} />}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <Text style={[{ fontSize: 26, fontWeight: '800', color: T.ink }, tab]}>{r.routeNo}</Text>
              <Text style={[{ fontSize: 13, color: T.muted }, tab]}>{[r.date, r.machine].filter(Boolean).join(' · ')}</Text>
            </View>
          </Section>
          <Section title="Route details" right={<Text style={{ fontSize: 12, fontWeight: '800', color: T.green }}>Auto-filled</Text>}>
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: T.ink }}>{r.itmname || r.itmcode || '—'}</Text>
              {r.itmname && r.itmcode ? <Text style={[u.code, tab, { fontSize: 12.5, marginTop: 2 }]}>Item {r.itmcode}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -4 }}>
              <Tile label="Shade" name={r.shdname} code={r.shdcode} />
              <Tile label="Denier" name={r.denier} />
              <Tile label="Paper tube wt." name={r.cheeswt} />
              <Tile label="Stock type" name={r.stkLabel} />
            </View>
          </Section>
        </>
      ) : (
        <Section
          title={busy.routes ? 'Route cards' : `Route cards · ${routes.length} open`}
          right={f.route
            ? <LinkBtn label="Cancel" onPress={() => { setBrowsing(false); setQ(''); }} />
            : <LinkBtn label="Refresh" icon="refresh" onPress={onReload} />}>
          <View style={[u.field, { marginBottom: 10 }]}>
            <Icon name="search" size={20} color={T.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search route no., item, shade, merge, machine…"
              placeholderTextColor={T.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Search route cards"
              style={[u.input, { fontSize: 16 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
            />
            {q ? <LinkBtn label="Clear" onPress={() => setQ('')} /> : null}
          </View>

          {problem.routes ? <Notice tone="err" text={problem.routes} action={{ label: 'Retry', onPress: onReload }} /> : null}
          {busy.routes || busy.defaults ? (
            <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={T.copper} />
              <Text style={u.hint}>Loading route cards…</Text>
            </View>
          ) : !ctxReady ? (
            <Notice tone="info" text="Choose the facility first." />
          ) : shown.length === 0 && !problem.routes ? (
            <Notice tone="info" text={q ? `No route card matches “${q}”.` : 'No route cards are open for packing.'} />
          ) : (
            <>
              {shown.map((row, i) => (
                <RouteRow key={`${row.productionuid ?? ''}-${row.productionvouno ?? i}`} row={row}
                  selected={!!f.route && f.route.productionuid === row.productionuid && f.route.productionvouno === row.productionvouno}
                  onPress={async () => { if (await onChoose(row)) { setBrowsing(false); setQ(''); } }} />
              ))}
              {filtered.length > shown.length ? (
                <Text style={[u.hint, { textAlign: 'center' }]}>{`Showing ${shown.length} of ${filtered.length}. Type to narrow the list.`}</Text>
              ) : null}
            </>
          )}
          <ErrorText>{errors.route}</ErrorText>
        </Section>
      )}
    </>
  );
}
