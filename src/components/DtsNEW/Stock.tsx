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
//     Yarn                              the Yarn Stock screen's own API, only yarns that DTS designs alone use
//         GET /api/appyarninstockdata  { prpcodes:[...], prptype, txntype:'mob_yarn_stock' }      qty = QTY
//         GET /api/getDtsDashboard?section=yarn_usage   -> yarn item => DTS-only | common (recipes)
//     Common yarn (yarns other designs use too) is shown as one separate line and never counted as DTS stock.
import AsyncStorage from '@/common/utils/compatibleStorage';
import { YarnHubAPI } from '@/src/api/legacyClient';
import { useBusinessContext } from '@/src/core/business';
import { unwrap as hubUnwrap } from '@/src/screens/yarnHub/yarnHubModel';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONT } from '../OwnerDashboardNEW/fonts';
import { withRetry } from './api';
import { DtsItem, isDtsCategory, num, pl, secKg, secM, sum } from './model';
import { C, SecHint, st as ui, StateBox } from './ui';

const str = (v: any) => (v == null ? '' : String(v)).trim();
const errText = (e: any, what: string) =>
  e?.response?.data?.message || (e?.code === 'ECONNABORTED' || /timeout/i.test(String(e?.message)) ? `${what} took too long — tap to try again` : e?.message) || `Unable to load ${what}.`;

/* the property list of the stock reports, read once per session (both fabric and yarn used to ask for it) */
let prpCache: { key: string; codes: Promise<string[]> } | null = null;
function stockProperties(API: string, token: string, prptype: string): Promise<string[]> {
  const key = `${API}|${prptype}|${token.slice(-12)}`;
  if (!prpCache || prpCache.key !== key) {
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    const codes = withRetry<any>(() => axios.get(`${API}/api/get_criterion`, { params: { prptype, txntype: 'mob_febric_stock', fetch: 'prp' }, headers, timeout: 60000 }))
      .then((prp) => (prp?.data?.response?.data || []).filter((p: any) => p && p.PrpCode != null).map((p: any) => String(p.PrpCode)));
    codes.catch(() => { prpCache = null; });
    prpCache = { key, codes };
  }
  return prpCache.codes;
}

export type FabricStock = { greige: DtsItem[]; finished: DtsItem[]; loading: boolean; error: string; reload: () => void };

/** Fabric stock of DTS items, read exactly as the Fabric Stock screen reads it (queued + retried, see api.ts). */
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
        const codes = await stockProperties(API, token, prptype);
        if (!codes.length) throw new Error('No property is available for fabric stock.');
        const res = await withRetry<any>(() => axios.get(`${API}/api/appgreyinstockdata`, { params: { prpcodes: codes, prptype, txntype: 'mob_fabric_stock' }, headers, timeout: 180000 }));
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
        if (alive) setState({ greige: [], finished: [], loading: false, error: errText(e, 'fabric stock') });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, API, prptype, key, enabled, version, tick]);
  return { ...state, reload: useCallback(() => setTick((n) => n + 1), []) };
}

/**
 * Yarn in our store — taken from the YARN HUB (POST /api/yarn_hub/summary), the app's own yarn screen:
 *   stock     = the Yarn Stock report's kg per main item (sub items included)
 *   designs   = the designs that use the yarn in warp or weft (Designs module), each with its category
 * A yarn used ONLY by DTS designs (Dress Material / Technical / Sportswear) is DTS stock.
 * A yarn that other designs use too is "common": shown as one separate line, never counted as DTS stock.
 * The hub is cached on the server for 10 minutes and on the device, so it opens at once after the first time.
 * (The previous version matched the old ERP recipe tables, which these designs do not fill — hence "—".)
 */
export type YarnStock = { yarn: DtsItem[]; commonKg: number; usedYarns: number; loading: boolean; error: string; reload: () => void };
const HUB_LOCAL_KEY = 'yarnhub:summary:v1:';

export function useYarnStock(token: string, API: string, prptype: string, patterns: string[], enabled: boolean, version: number): YarnStock {
  const { yearNo } = useBusinessContext();
  const [state, setState] = useState<{ yarn: DtsItem[]; commonKg: number; usedYarns: number; loading: boolean; error: string }>({ yarn: [], commonKg: 0, usedYarns: 0, loading: enabled, error: '' });
  const [tick, setTick] = useState(0);
  const key = patterns.join('|');
  useEffect(() => {
    if (!enabled || !patterns.length) return;
    let alive = true;
    const build = (raw: any) => {
      const data = raw;
      const items: any[] = Array.isArray(data?.items) ? data.items : [];
      const yarn: DtsItem[] = [];
      let commonKg = 0, usedYarns = 0;
      items.forEach((m, i) => {
        const designs: any[] = Array.isArray(m.designs) ? m.designs : [];
        const dts = designs.filter((d) => isDtsCategory(str(d.category), patterns));
        if (!dts.length) return;
        usedYarns++;
        const kg = num(m.stockkg);
        if (!(kg > 0)) return;
        if (dts.length < designs.length) { commonKg += kg; return; }
        const name = str(m.name) || str(m.itmcode);
        const cats = Array.from(new Set(dts.map((d) => str(d.category)))).join(' · ');
        yarn.push({
          id: `y${str(m.itmcode) || i}`, date: '', v: kg,
          d: { where: str(m.category) || 'Yarn store', yarn: name, art: name },
          label: name,
          sub: [cats, pl(new Set(dts.map((d) => str(d.id))).size, 'DTS designs'), str(m.yarntype)].filter(Boolean).join(' · '),
        });
      });
      return { yarn, commonKg, usedYarns };
    };
    setState((s) => ({ ...s, loading: true, error: '' }));
    (async () => {
      let shown = false;
      try {
        let yearno = String(yearNo || '').trim();
        if (!yearno) yearno = String((await AsyncStorage.getItem('yno')) || '').trim();
        if (!yearno) throw new Error('Financial year not found in the login — please log in again.');
        const pt = (prptype || 'S').toUpperCase();
        /* draw the Yarn Hub's last copy on this device at once, then replace it with the server's */
        try {
          const saved = await AsyncStorage.getItem(HUB_LOCAL_KEY + pt + '|' + yearno);
          if (saved && alive) { setState({ ...build(JSON.parse(saved)), loading: true, error: '' }); shown = true; }
        } catch { /* nothing saved yet */ }
        const res: any = await withRetry<any>(() => YarnHubAPI.summary({ prptype: pt, yearno, refresh: 0 }));
        if (alive) setState({ ...build(hubUnwrap(res)), loading: false, error: '' });
      } catch (e: any) {
        if (alive) setState((s) => (shown ? { ...s, loading: false } : { yarn: [], commonKg: 0, usedYarns: 0, loading: false, error: errText(e, 'yarn stock') }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, API, prptype, key, enabled, version, tick, yearNo]);
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
export function StockPage({ kinds, onKind, commonKg }: { kinds: StockKind[]; onKind: (key: string) => void; commonKg?: number | null }) {
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
      <Text style={[s.kindSub, { paddingHorizontal: 4, paddingBottom: 4 }]}>Finished fabric at job workers — not applicable: job workers weave greige only.</Text>
      <Text style={[s.kindSub, { paddingHorizontal: 4, paddingBottom: 4 }]}>Greige at job workers — not recorded: the ERP books job-work fabric only when it is received, so there is no "woven, not yet received" figure to show.</Text>
      {commonKg != null ? (
        <Text style={[s.kindSub, { paddingHorizontal: 4, paddingBottom: 6, color: C.ink }]}>
          Common yarn in our store — <Text style={{ fontWeight: '700' }}>{secKg(commonKg)}</Text> of yarns that other designs also use. It is not counted in DTS stock.
        </Text>
      ) : null}
      {anyLoading ? <StateBox loading minHeight={40} /> : null}
      <SecHint>
        DTS designs only. Internal and external stock are never added together. Greige at dyeing mills is the Mill Hub's pending metres (lots sent
        this financial year). Yarn in our store counts only yarns that DTS designs alone use (Yarn Hub: the designs that use each yarn). Yarn at job workers is each supplier's
        yarn balance from the Outsourcing hub — yarn is issued to a supplier, not to a design, so it is the supplier's whole balance.
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
