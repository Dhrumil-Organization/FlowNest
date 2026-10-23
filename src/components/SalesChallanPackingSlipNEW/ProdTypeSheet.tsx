// FILE: src/components/SalesChallanPackingSlipNEW/ProdTypeSheet.tsx
// Production types to take stock from — replaces ProductionTypeSelect (multi-select).
// None chosen = all types (web sends an empty list).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Text, TextInput, View } from 'react-native';
import { Btn as SheetBtn, Sheet } from '../StockVerificationNEW/ui';
import { LinkBtn, Notice, tab, u } from '../PackingAutomationNEW/ui';
import { apiErrorText } from './api';
import type { Row } from './api';
import { CheckRow } from './ui';

export default function ProdTypeSheet({ open, onClose, value, prpType, load, onApply }: {
  open: boolean; onClose: () => void; value: string[]; prpType: string; load: () => Promise<Row[]>; onApply: (codes: string[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const fetch = async () => {
    setBusy(true); setErr('');
    try { setRows(await load()); } catch (e) { setErr(apiErrorText(e, 'Production types could not be loaded.')); } finally { setBusy(false); }
  };
  useEffect(() => { if (open) { setSel(value); setQ(''); if (!rows.length) fetch(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const s = q.trim().toUpperCase();
    return s ? rows.filter((r) => `${r.PrdType} ${r.PrdTypeName}`.toUpperCase().includes(s)) : rows;
  }, [rows, q]);
  const toggle = (c: string) => setSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  return (
    <Sheet open={open} onClose={onClose} eyebrow="STOCK FILTER" title="Production type"
      footer={<SheetBtn label={sel.length ? `Use ${sel.length} type${sel.length === 1 ? '' : 's'}` : 'Use all types'} kind="copper" onPress={() => onApply(sel)} />}>
      <View style={[u.field, { marginBottom: 10 }]}>
        <Icon name="search" size={20} color={T.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Type or name" placeholderTextColor={T.muted} autoCapitalize="characters" autoCorrect={false}
          style={[u.input, { fontSize: 16 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} accessibilityLabel="Search production type" />
        {sel.length ? <LinkBtn label="None" onPress={() => setSel([])} /> : null}
      </View>
      {err ? <Notice tone="err" text={err} action={{ label: 'Retry', onPress: fetch }} /> : null}
      {busy ? <View style={{ paddingVertical: 24, alignItems: 'center' }}><ActivityIndicator color={T.copper} /></View> : null}
      {filtered.map((r) => {
        const c = String(r.PrdType);
        return (
          <CheckRow key={c} on={sel.includes(c)} onPress={() => toggle(c)}
            right={prpType === 'R' && r.ListNo ? <Text style={[u.code, tab]}>#{r.ListNo}</Text> : undefined}>
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: T.ink }}>{r.PrdTypeName || c}</Text>
            <Text style={[u.code, tab]}>{c}</Text>
          </CheckRow>
        );
      })}
    </Sheet>
  );
}
