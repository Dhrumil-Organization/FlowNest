// FILE: src/components/DtsNEW/Stock.tsx
// DTS stock — internal and external held apart, never added together.
//
//   Internal · our godowns
//     Greige fabric / Finished fabric   the Fabric Stock screen's own API, DTS items only
//         GET /api/get_criterion       { prptype, txntype:'mob_febric_stock', fetch:'prp' }
//         GET /api/appgreyinstockdata  { prpcodes:[...], prptype, txntype:'mob_fabric_stock' }
//         grey = dptcode 'PR', finished = every other row, qty = TOTQTY   (same rules as Fabric Stock)
//   External · at mills and job workers
//     Greige at dyeing mills            GET /api/getDtsDashboard?section=mill_stock     (Mill Hub pending metres)
//     Yarn at job workers               GET /api/getDtsDashboard?section=outsourcing_yarn (yarn job-order balances)
//
// Yarn in our own store is common to both sections, so it is not shown as DTS stock.
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONT } from '../OwnerDashboardNEW/fonts';
import { DtsItem, isDtsCategory, num, pl, secKg, secM, sum } from './model';
import { C, SecHint, st as ui, StateBox } from './ui';

const str = (v: any) => (v == null ? '' : String(v)).trim();

export type FabricStock = { greige: DtsItem[]; finished: DtsItem[]; loading: boolean; error: string; reload: () => void };

/** Fabric stock of DTS items, read exactly as the Fabric Stock screen reads it. */
export function useFabricStock(token: string, API: string, prptype: string, patterns: string[], enabled: boolean, version: number): FabricStock {
  const [state, setState] = useState<{ greige: DtsItem[]; finished: DtsItem[]; loading: boolean; error: string }>({ greige: [], finished: [], loading: enabled, error: '' });
  const [tick, setTick] = useState(0);
  const key = patterns.join('|');
  useEffect(() => {
    if (!enabled || !patterns.length) return;
    let alive = true;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    setState((s) => ({ ...s, loading: true, error: '' }));
    (async () => {
      try {
        const prp = await axios.get(`${API}/api/get_criterion`, { params: { prptype, txntype: 'mob_febric_stock', fetch: 'prp' }, headers });
        const codes: string[] = (prp?.data?.response?.data || []).filter((p: any) => p && p.PrpCode != null).map((p: any) => String(p.PrpCode));
        if (!codes.length) throw new Error('No property is available for fabric stock.');
        const res = await axios.get(`${API}/api/appgreyinstockdata`, { params: { prpcodes: codes, prptype, txntype: 'mob_fabric_stock' }, headers, timeout: 180000 });
        if (res?.data?.success !== true) throw new Error(res?.data?.message || 'No stock data returned.');
        const rows: any[] = Array.isArray(res?.data?.response?.data) ? res.data.response.data : [];
        const greige: DtsItem[] = [], finished: DtsItem[] = [];
        rows.forEach((r, i) => {
          const cat = str(r.ITMNAME), qty = num(r.TOTQTY);
          if (!qty || !isDtsCategory(cat, patterns)) return;
          const grey = str(r.dptcode).toUpperCase() === 'PR';
          const design = str(r.MDSNNAME) || '—', sub = str(r.SDSNNAME), shade = str(r.SHDNAME);
          (grey ? greige : finished).push({
            id: `${grey ? 'g' : 'f'}${i}`, date: '', v: qty,
            d: { where: grey ? 'Grey stock' : 'Finish stock', cat: cat || '—', art: design },
            label: sub || design,
            sub: [cat, design, shade].filter(Boolean).join(' · '),
          });
        });
        if (alive) setState({ greige, finished, loading: false, error: '' });
      } catch (e: any) {
        if (alive) setState({ greige: [], finished: [], loading: false, error: e?.response?.data?.message || e?.message || 'Unable to load fabric stock.' });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, API, prptype, key, enabled, version, tick]);
  return { ...state, reload: useCallback(() => setTick((n) => n + 1), []) };
}

export type StockKind = {
  key: string; side: 'in' | 'out'; lbl: string; fmt: (n: number) => string; items: DtsItem[]; unit: string;
  loading: boolean; error: string; reload: () => void; note?: string;
};

export const stockSub = (k: StockKind) => {
  if (k.loading) return 'loading…';
  if (k.error) return 'could not load — tap to retry';
  if (!k.items.length) return 'none';
  const places = new Set(k.items.map((x) => x.d.where)).size;
  return `${pl(k.items.length, k.unit)} · ${pl(places, 'locations')}${k.note ? ` · ${k.note}` : ''}`;
};

/** the Stock page: internal and external held apart */
export function StockPage({ kinds, onKind }: { kinds: StockKind[]; onKind: (key: string) => void }) {
  const block = (title: string, side: 'in' | 'out', color: string) => (
    <View style={ui.card}>
      <View style={[s.blockHead, { backgroundColor: color }]}><Text style={s.blockTitle}>{title}</Text></View>
      {kinds.filter((k) => k.side === side).map((k) => (
        <Pressable
          key={k.key}
          onPress={() => (k.error ? k.reload() : onKind(k.key))}
          disabled={!k.error && !k.items.length}
          accessibilityRole="button"
          accessibilityLabel={`${k.lbl}, ${k.items.length ? k.fmt(sum(k.items)) : 'none'}`}
          style={({ pressed }) => [s.kind, pressed && { backgroundColor: '#F9F7F4' }]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.kindName}>{k.lbl}</Text>
            <Text style={[s.kindSub, !!k.error && { color: C.over }]} numberOfLines={2}>{stockSub(k)}</Text>
          </View>
          <Text style={s.kindValue}>{k.items.length ? k.fmt(sum(k.items)) : '—'}</Text>
          <Text style={{ width: 10, fontSize: 12, color: C.faint, textAlign: 'right' }}>{k.items.length ? '›' : ''}</Text>
        </Pressable>
      ))}
    </View>
  );
  const anyLoading = kinds.some((k) => k.loading);
  return (
    <View style={{ paddingBottom: 16 }}>
      {block('Internal · our godowns', 'in', C.owner)}
      {block('External · at mills and job workers', 'out', C.out)}
      <Text style={[s.kindSub, { paddingHorizontal: 4, paddingBottom: 6 }]}>Finished fabric at job workers — not applicable: job workers weave greige only.</Text>
      {anyLoading ? <StateBox loading minHeight={40} /> : null}
      <SecHint>
        Only DTS items. External stock is never added to internal stock: greige at dyeing mills is the Mill Hub's pending metres (lots sent
        this financial year); yarn at job workers is the balance of their yarn job orders — the whole account of each job worker who weaves
        DTS fabric, because yarn is common to both sections. Yarn in our own store is common too and is not counted here.
      </SecHint>
    </View>
  );
}

export const STOCK_FMT = { m: secM, kg: secKg };

const s = StyleSheet.create({
  blockHead: { paddingHorizontal: 12, paddingVertical: 9 },
  blockTitle: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.7 },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.hair, minHeight: 48 },
  kindName: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.ink },
  kindSub: { fontFamily: FONT, fontSize: 10.5, color: C.mut, marginTop: 2 },
  kindValue: { fontFamily: FONT, fontSize: 13.5, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
});
