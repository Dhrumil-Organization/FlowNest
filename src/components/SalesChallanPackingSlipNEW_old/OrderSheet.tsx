// FILE: src/components/SalesChallanPackingSlipNEW/OrderSheet.tsx
// Pending orders of the party — replaces PendingOrderSelect + PendingOrderSingleSelect
// (both multi-select on web; the "assign" right only stops the print party being copied).
// Lines already on the slip are shown ticked and cannot be added twice.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Btn as SheetBtn, Sheet } from '../StockVerificationNEW/ui';
import { LinkBtn, Notice, tab, u } from '../PackingAutomationNEW/ui';
import { apiErrorText } from './api';
import type { Row } from './api';
import { d1Key, pendingKey, qty, sum } from './rules';
import { Check, CheckRow, Tag, Tags } from './ui';

const LIST_LIMIT = 60;

export default function OrderSheet({
  open, onClose, partyName, existing, prpType, strDesc, load, onAdd,
}: {
  open: boolean; onClose: () => void; partyName: string; existing: Row[]; prpType: string; strDesc: string;
  load: (linked: boolean) => Promise<Row[]>; onAdd: (rows: Row[]) => void;
}) {
  const [linked, setLinked] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Record<string, Row>>({});

  const fetch = async (lk: boolean) => {
    setBusy(true); setErr('');
    try { setRows(await load(lk)); } catch (e) { setRows([]); setErr(apiErrorText(e, 'Pending orders could not be loaded.')); } finally { setBusy(false); }
  };
  useEffect(() => { if (open) { setSel({}); setQ(''); fetch(linked); } }, [open, linked]); // eslint-disable-line react-hooks/exhaustive-deps

  const have = useMemo(() => new Set(existing.map(d1Key)), [existing]);
  const isHave = (r: Row) => have.has(`${r.UID}|${r.SRNO}|${r.ITMCODE}`);
  const filtered = useMemo(() => {
    const s = q.trim().toUpperCase();
    return s ? rows.filter((r) => [r.SONO, r.ITMNAME, r.SHDNAME, r.GRDNAME, r.DSNNAME, r.PrintPartyName].some((v) => String(v ?? '').toUpperCase().includes(s))) : rows;
  }, [rows, q]);
  const shown = filtered.slice(0, LIST_LIMIT);
  const free = filtered.filter((r) => !isHave(r));
  const picked = Object.values(sel);
  const allOn = free.length > 0 && free.every((r) => sel[pendingKey(r)]);

  const toggle = (r: Row) => setSel((s) => { const n = { ...s }; const k = pendingKey(r); if (n[k]) delete n[k]; else n[k] = r; return n; });
  const toggleAll = () => setSel((s) => { const n = { ...s }; free.forEach((r) => { if (allOn) delete n[pendingKey(r)]; else n[pendingKey(r)] = r; }); return n; });

  return (
    <Sheet open={open} onClose={onClose} eyebrow="PENDING ORDERS" title={partyName || 'Pending orders'}
      footer={<SheetBtn label={picked.length ? `Add ${picked.length} line${picked.length === 1 ? '' : 's'} · ${qty(sum(picked, 'BQTY'))}` : 'Tick the lines to pack'}
        kind="copper" disabled={!picked.length} onPress={() => onAdd(picked)} />}>
      <View style={[u.field, { marginBottom: 10 }]}>
        <Icon name="search" size={20} color={T.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Order no., item, shade, grade…" placeholderTextColor={T.muted}
          autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Search pending orders"
          style={[u.input, { fontSize: 16 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} />
        {q ? <LinkBtn label="Clear" onPress={() => setQ('')} /> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Pressable onPress={toggleAll} disabled={!free.length} accessibilityRole="checkbox" accessibilityState={{ checked: allOn }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
          <Check on={allOn} disabled={!free.length} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.ink }}>Select all ({free.length})</Text>
        </Pressable>
        <Pressable onPress={() => setLinked((v) => !v)} accessibilityRole="switch" accessibilityState={{ checked: linked }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: linked ? T.copper : T.muted }}>Linked party orders</Text>
          <View style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: linked ? T.copper : T.border, padding: 3, alignItems: linked ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
          </View>
        </Pressable>
      </View>

      {err ? <Notice tone="err" text={err} action={{ label: 'Retry', onPress: () => fetch(linked) }} /> : null}
      {busy ? (
        <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}>
          <ActivityIndicator color={T.copper} />
          <Text style={u.hint}>Loading pending orders…</Text>
        </View>
      ) : !shown.length && !err ? (
        <Notice tone="info" text={q ? `No pending order matches “${q}”.` : linked ? 'No linked-party orders for this party.' : 'No pending orders. Turn on “Linked party orders” to include those.'} />
      ) : (
        shown.map((r, i) => {
          const done = isHave(r);
          return (
            <CheckRow key={`${pendingKey(r)}-${i}`} on={done || !!sel[pendingKey(r)]} disabled={done} onPress={() => toggle(r)}
              right={
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: T.muted }}>Bal. qty</Text>
                  <Text style={[{ fontSize: 17, fontWeight: '800', color: T.ink }, tab]}>{qty(r.BQTY)}</Text>
                </View>
              }>
              <Text style={[{ fontSize: 15, fontWeight: '800', color: T.ink }, tab]}>
                SO {r.SONO}<Text style={[u.code, tab]}>{`   ${r.SODATE ?? ''}`}</Text>
              </Text>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.ink, marginTop: 2 }}>{r.ITMNAME}</Text>
              <Tags>
                {r.SHDNAME ? <Tag text={r.SHDNAME} /> : null}
                {r.GRDNAME ? <Tag text={`Grade ${r.GRDNAME}`} /> : null}
                {prpType === 'S' && strDesc === 'G' && r.DSNNAME ? <Tag text={r.DSNNAME} /> : null}
                {done ? <Tag text="On this slip" tone="copper" /> : null}
              </Tags>
              {prpType === 'R' && r.PrintPartyName ? <Text style={[u.code, { marginTop: 4 }]}>Sales party {r.PrintPartyName}</Text> : null}
            </CheckRow>
          );
        })
      )}
      {filtered.length > shown.length ? <Text style={[u.hint, { textAlign: 'center' }]}>{`Showing ${shown.length} of ${filtered.length}. Type to narrow the list.`}</Text> : null}
    </Sheet>
  );
}
