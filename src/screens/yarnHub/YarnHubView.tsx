// FILE: src/screens/yarnHub/YarnHubView.tsx
// Yarn Hub (READ-ONLY) — the ERP Designing artifact's "Yarn hub" (YmsHub) as is, on live ERP data.
//
//   hub       Yarn hub card (In stock · Used · month · Designs, search)
//             one widget per category — Linen · Cotton · Polyester · Blends · Other fibres
//             (In stock · Used · month · Designs, 4 most-used yarns, "All N … yarns ›")
//   category  every yarn of the category, most used first
//   yarn      In stock · Used · month · Designs · Latest ₹/kg, then Price trend (party-wise),
//             Designs using this yarn, Stock lots, Consumption, Sub items (blends)
//   A blended yarn's row opens its sub items (blend split table) in place; any other row opens the yarn.
//
// Data: POST /api/yarn_hub/summary once (YarnHubController@summary) and POST /api/yarn_hub/item when a yarn
// is opened (cartons, creel / weft issue rows, purchase rates). Property group + year from the login context.

import AsyncStorage from '@/common/utils/compatibleStorage';
import { YarnHubAPI } from '@/src/api/legacyClient';
import { useBusinessContext } from '@/src/core/business';
import { T } from '@/src/theme';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  blendSubs,
  byScore,
  C,
  CatKey,
  catShort,
  fibreCol,
  fmtKg,
  isBlend,
  IssueRow,
  monthLabel,
  normalizeDetail,
  normalizeSummary,
  rateLbl,
  searchText,
  structure,
  totals,
  unwrap,
  YarnDetail,
  YarnHubData,
  YarnHubDiag,
  diagLines,
  YarnItem,
  ymsDateFull,
  ymsDateLbl,
  ymsFibreShort,
  ymsKg,
  kgExact,
  YMS_CATS,
} from './yarnHubModel';
import { YarnPriceChart } from './YarnPriceChart';

const LOCAL_KEY = 'yarnhub:summary:v1:';
const LOCAL_MAX = 1_800_000; // characters kept on the device (Android storage reads one entry up to ~2 MB)

const MF = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" }) as string;

type View_ = { kind: 'hub' } | { kind: 'cat'; cat: CatKey } | { kind: 'yarn'; id: string; from: View_ };

/* ============================== base widgets (artifact) ============================== */

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[st.dcard, style]}>{children}</View>;
}

function Widget({ icon, title, accent, onTitle, children }: { icon: string; title: string; accent: string; onTitle?: () => void; children: React.ReactNode }) {
  const Head = (
    <View style={[st.wHead, { backgroundColor: accent }]}>
      <Text style={st.wIcon}>{icon}</Text>
      <Text style={st.wTitle} numberOfLines={1}>{title.toUpperCase()}</Text>
      {onTitle && <Text style={st.wFull}>Full report ›</Text>}
    </View>
  );
  return (
    <View style={[st.dcard, { overflow: 'hidden', marginBottom: 12 }]}>
      {onTitle ? <TouchableOpacity activeOpacity={0.8} onPress={onTitle}>{Head}</TouchableOpacity> : Head}
      <View style={st.wBody}>{children}</View>
    </View>
  );
}

function TotRow({ items }: { items: { label: string; value: string; color?: string; sub?: string }[] }) {
  return (
    <View style={st.totRow}>
      {items.map((it, i) => (
        <View key={i} style={st.totCell}>
          <Text style={st.totLbl} numberOfLines={1}>{it.label.toUpperCase()}</Text>
          <Text style={[st.totVal, { color: it.color || C.ink }]} numberOfLines={1} adjustsFontSizeToFit>{it.value}</Text>
          {!!it.sub && <Text style={st.exact} numberOfLines={1}>{it.sub}</Text>}
        </View>
      ))}
    </View>
  );
}

/** value in t / kg as the artifact shows it; `sub` = the exact kg (1 t = 1,000 kg) */
function StatCard({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <View style={st.stat}>
      <Text style={st.statLbl} numberOfLines={1}>{label.toUpperCase()}</Text>
      <Text style={[st.statVal, { color: color || C.ink }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {!!sub && <Text style={st.exact} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

/** grid row: first column flexes, the rest size to their content (template "1fr auto auto") */
function Row({ onPress, head, children, style }: { onPress?: () => void; head?: boolean; children: React.ReactNode; style?: any }) {
  const base = [st.row, head && st.rowHead, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={(s: any) => [base, (s.hovered || s.pressed) && { backgroundColor: '#f9fafb' }]}>
      {children}
    </Pressable>
  );
}

const HeadTxt = ({ children, right, w }: { children: React.ReactNode; right?: boolean; w?: number }) => (
  <Text style={[st.headTxt, right && { textAlign: 'right' }, w ? { width: w } : null]} numberOfLines={1}>
    {typeof children === 'string' ? children.toUpperCase() : children}
  </Text>
);

/** artifact `.mc2`: 1 column on phones, 2 from 768 px, 3 from 1280 px — widgets fill the shortest column */
function Columns({ items, width }: { items: { key: string; weight: number; node: React.ReactNode }[]; width: number }) {
  const n = width >= 1280 ? 3 : width >= 768 ? 2 : 1;
  if (n === 1) return <View>{items.map((x) => <React.Fragment key={x.key}>{x.node}</React.Fragment>)}</View>;
  const cols: { h: number; list: typeof items }[] = Array.from({ length: n }, () => ({ h: 0, list: [] }));
  items.forEach((x) => {
    const c = cols.reduce((a, b) => (b.h < a.h ? b : a), cols[0]);
    c.list.push(x);
    c.h += x.weight;
  });
  return (
    <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-start' }}>
      {cols.map((c, i) => (
        <View key={i} style={{ flex: 1, minWidth: 0 }}>
          {c.list.map((x) => <React.Fragment key={x.key}>{x.node}</React.Fragment>)}
        </View>
      ))}
    </View>
  );
}

/* ===================================== filters ===================================== */

/**
 * Accurate search: every word typed must match (any order, any case), and a word matches the START of a word in the
 * row — "40" finds 40/1 and 40s but not 140, "lin" finds LINEN, "1201" finds item 1201 but not 11201,
 * "5110" finds carton C5110.
 * A word with / - . (e.g. "40/1", "B-2140", "55/45") is matched as typed anywhere in the row.
 */
const matches = (hay: string, q: string) => {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const h = hay.toLowerCase();
  const raw = h.split(/[^a-z0-9]+/).filter(Boolean);
  // "c5110" also answers to "5110" (carton / creel / beam numbers with a letter prefix)
  const tokens = raw.concat(raw.map((t) => t.replace(/^[a-z]+(?=\d)/, '')).filter((t, i) => t !== raw[i]));
  return words.every((w) => (/[^a-z0-9]/.test(w) ? h.includes(w) : tokens.some((t) => t.startsWith(w))));
};

/** search box + optional chips + "n of m" — used in every list of the hub */
function FilterBar({ value, onChange, placeholder, chips, chip, onChip, shown, total, color }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  chips?: { k: string; l: string }[]; chip?: string; onChip?: (k: string) => void;
  shown?: number; total?: number; color: string;
}) {
  const active = !!value.trim() || (!!chips && !!chip && chip !== chips[0].k);
  return (
    <View style={st.fBar}>
      <View style={st.fRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={T.muted}
          style={[st.fInp, !!value && { borderColor: color }]}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {active ? (
          <Text onPress={() => { onChange(''); if (chips && onChip) onChip(chips[0].k); }} style={[st.fClear, { color }]}>Clear</Text>
        ) : null}
      </View>
      {chips && chips.length ? (
        <View style={st.fChips}>
          {chips.map((c) => {
            const on = (chip || chips[0].k) === c.k;
            return (
              <Text key={c.k} onPress={() => onChip && onChip(c.k)} style={[st.fChip, on && { backgroundColor: color, borderColor: color, color: '#fff' }]}>
                {c.l}
              </Text>
            );
          })}
        </View>
      ) : null}
      {active && total !== undefined ? <Text style={st.fCount}>{(shown ?? 0) + ' of ' + total + ' shown'}</Text> : null}
    </View>
  );
}

/* ===================================== screen ===================================== */

export function YarnHubView() {
  const { prpGroup, yearNo } = useBusinessContext();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<YarnHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState<YarnHubDiag | null>(null);
  const [stamp, setStamp] = useState('');
  const [view, setView] = useState<View_>({ kind: 'hub' });
  const viewRef = useRef<View_>(view);
  viewRef.current = view;
  const loadDetailRef = useRef<((itm: string, fresh?: boolean) => Promise<void>) | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState('');
  // per-list search text / chip, keyed by list (+ yarn id): 'ds:1201', 'ds:1201:side', 'cat:Linen', …
  const [filt, setFilt] = useState<Record<string, string>>({});
  const fv = (k: string) => filt[k] || '';
  const setF = (k: string, v: string) => setFilt((f) => ({ ...f, [k]: v }));
  const [exp, setExp] = useState<Record<string, boolean>>({});
  // long lists open in pages (cartons, issues, designs, yarns) so thousands of rows stay smooth
  const [lim, setLim] = useState<Record<string, number>>({});
  const PAGE = 50;
  const limitOf = (key: string, base: number) => lim[key] ?? base;
  const moreRow = (key: string, base: number, total: number, color: string, what: string) => {
    const n = limitOf(key, base);
    if (total <= base) return null;
    const left = total - n;
    return (
      <View style={st.moreRow}>
        {left > 0 && (
          <Text onPress={() => setLim((l) => ({ ...l, [key]: n + PAGE }))} style={[st.moreLink, { color }]}>
            {'Show ' + Math.min(PAGE, left) + ' more'}
          </Text>
        )}
        {left > PAGE && (
          <Text onPress={() => setLim((l) => ({ ...l, [key]: total }))} style={[st.moreLink, { color }]}>
            {'All ' + total + ' ' + what}
          </Text>
        )}
        <Text style={st.moreInfo}>{Math.min(n, total) + ' of ' + total}</Text>
        {n > base && (
          <Text onPress={() => setLim((l) => ({ ...l, [key]: base }))} style={[st.moreLink, { color: C.mut, marginLeft: 'auto' }]}>Show less</Text>
        )}
      </View>
    );
  };
  const [details, setDetails] = useState<Record<string, YarnDetail | 'loading' | { error: string }>>({});
  const reqId = useRef(0);
  const scrollRef = useRef<any>(null);

  /** property group + year: login context first, else what the other ERP screens store (user_prptype / yno) */
  const ctx = useCallback(async () => {
    let prptype = String(prpGroup || '').trim();
    let yearno = String(yearNo || '').trim();
    try {
      if (!prptype) prptype = String((await AsyncStorage.getItem('user_prptype')) || '').trim();
      if (!yearno) yearno = String((await AsyncStorage.getItem('yno')) || '').trim();
    } catch {
      // storage unavailable — fall through to the defaults below
    }
    return { prptype: (prptype || 'S').toUpperCase(), yearno };
  }, [prpGroup, yearNo]);

  const show = (raw: any) => {
    const next = normalizeSummary(raw);
    setData(next);
    setDiag(next.diag);
    const built = next.diag?.generated_at || '';
    setStamp(built ? 'data ' + built.slice(11, 16) : '');
  };

  /**
   * Opening is instant: the last hub of this property group / year is kept on the device and drawn at once, then
   * the server copy (itself cached 10 min) replaces it in the background. ↻ Refresh (pull) rebuilds the server copy
   * from live ERP data and reloads the yarn on screen too.
   */
  const load = useCallback(async (pull?: boolean) => {
    const id = ++reqId.current;
    setError(null);
    let shown = false;
    try {
      const body = await ctx();
      if (!body.yearno) throw new Error('Financial year not found in the login — please log in again.');
      const localKey = LOCAL_KEY + body.prptype + '|' + body.yearno;
      if (pull) {
        setRefreshing(true);
      } else {
        try {
          const saved = await AsyncStorage.getItem(localKey);
          if (saved && id === reqId.current) {
            show(JSON.parse(saved));
            shown = true;
            setLoading(false);
            setSyncing(true);
          }
        } catch {
          // nothing saved yet
        }
        if (!shown) setLoading(true);
      }
      const response: any = await YarnHubAPI.summary({ ...body, refresh: pull ? 1 : 0 });
      if (id !== reqId.current) return;
      const raw = unwrap(response);
      show(raw);
      try {
        const txt = JSON.stringify(raw);
        if (txt.length < LOCAL_MAX) await AsyncStorage.setItem(localKey, txt);
      } catch {
        // device storage full / unavailable — the hub still works from the server
      }
      if (pull) {
        // every opened yarn's detail is stale now — drop them and reload the one on screen from live data
        setDetails({});
        const cur = viewRef.current;
        if (cur.kind === 'yarn') void loadDetailRef.current?.(cur.id, true);
      }
    } catch (err: any) {
      if (id !== reqId.current) return;
      setError(err?.response?.data?.message || err?.message || 'Unable to load yarn hub.');
      setDiag(err?.response?.data?.diag || null);
    } finally {
      if (id === reqId.current) { setLoading(false); setRefreshing(false); setSyncing(false); }
    }
  }, [ctx]);

  // load on open and whenever property / year changes; keep the data while switching tabs
  const keyRef = useRef('');
  useFocusEffect(useCallback(() => {
    const key = `${prpGroup}|${yearNo}`;
    if (keyRef.current !== key) { keyRef.current = key; setView({ kind: 'hub' }); void load(); }
  }, [load, prpGroup, yearNo]));

  const loadDetail = useCallback(async (itm: string, fresh?: boolean) => {
    setDetails((d) => ({ ...d, [itm]: 'loading' }));
    try {
      const response: any = await YarnHubAPI.item({ ...(await ctx()), itmcode: itm, refresh: fresh ? 1 : 0 });
      setDetails((d) => ({ ...d, [itm]: normalizeDetail(unwrap(response)) }));
    } catch (err: any) {
      setDetails((d) => ({ ...d, [itm]: { error: err?.response?.data?.message || err?.message || 'Unable to load yarn detail.' } }));
    }
  }, [ctx]);
  loadDetailRef.current = loadDetail;

  const go = (v: View_) => {
    setView(v);
    if (v.kind === 'yarn' && !details[v.id]) void loadDetail(v.id);
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  };
  const openYarn = (id: string) => go({ kind: 'yarn', id, from: view });
  const toggle = (id: string) => setExp((e) => ({ ...e, [id]: !e[id] }));

  const items = useMemo(() => data?.items || [], [data]);
  const monthLbl = monthLabel(data?.month || '');
  const byCat = useCallback((k: CatKey) => items.filter((x) => x.cat.k === k).sort(byScore), [items]);
  const cats = useMemo(() => YMS_CATS.filter((c) => c.k !== 'Other' || items.some((x) => x.cat.k === 'Other')), [items]);
  const tAll = useMemo(() => totals(items), [items]);
  const wide = width >= 700;

  /* ------------------------------ pieces ------------------------------ */
  const code = (id: string, dim?: boolean) => <Text style={[st.code, dim && { color: C.mut }]}>{id}</Text>;

  const subTable = (it: YarnItem, q = '') => {
    const subs = blendSubs(it).filter((s) => matches([s.id, s.label, s.ratioKey].join(' '), q));
    const fibres = it.blend;
    const inDesigns: Record<string, string[]> = {};
    it.designs.forEach((d) => { if (d.br) (inDesigns[d.br] = inDesigns[d.br] || []).push(d.code + ' ' + d.side); });
    const usedAs = (key: string) => (key ? inDesigns[key] || [] : []);
    const covered = new Set(subs.map((s) => s.ratioKey));
    const orphan = Object.keys(inDesigns).filter((br) => !covered.has(br));
    const hasStock = subs.some((s) => s.stockKg > 0);
    if (subs.length === 0) {
      return <Text style={st.note}>{q.trim() ? 'No sub item matches the filter.' : 'No sub items yet — add this yarn\'s blend ratios in Yarn Master (+ Sub item).'}</Text>;
    }
    return (
      <View>
        <Row head>
          <HeadTxt w={52}>Sub item</HeadTxt>
          <View style={{ flex: 1 }}><HeadTxt>Name · split</HeadTxt></View>
          {fibres.map((f) => (
            <View key={f} style={[st.fibCol, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }]}>
              <View style={[st.sq, { backgroundColor: fibreCol(f), marginRight: 4 }]} />
              <Text style={st.headTxt}>{ymsFibreShort(f).toUpperCase()}</Text>
            </View>
          ))}
          {hasStock && <HeadTxt right w={62}>Stock</HeadTxt>}
        </Row>
        {subs.map((s) => {
          const u = usedAs(s.ratioKey);
          return (
            <Row key={s.id}>
              <View style={{ width: 52 }}>{code(s.id)}</View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.subName}>{s.label}</Text>
                <View style={st.bar}>
                  {fibres.map((f, i) => {
                    const v = s.ratio[i];
                    return v ? <View key={f} style={{ width: `${v}%` as any, backgroundColor: fibreCol(f) }} /> : null;
                  })}
                </View>
                <Text style={st.subMeta}>
                  {u.length
                    ? 'in ' + u.length + ' design line' + (u.length !== 1 ? 's' : '') + ' · ' + u.slice(0, 3).join(', ') + (u.length > 3 ? ' +' + (u.length - 3) : '')
                    : 'not yet called for by a design'}
                </Text>
              </View>
              {fibres.map((f, i) => {
                const v = s.ratio[i];
                return <Text key={f} style={[st.fibCol, st.fibPct, { color: v != null ? T.ink : C.mut }]}>{v != null ? v + '%' : '—'}</Text>;
              })}
              {hasStock && (
                <Text style={[st.monoR, { width: 62, fontSize: 11.5, color: s.stockKg > 0 ? C.bill : C.mut }]}>
                  {s.stockKg > 0 ? fmtKg(s.stockKg) : '—'}
                </Text>
              )}
            </Row>
          );
        })}
        {orphan.length > 0 && (
          <Text style={[st.subMeta, { paddingTop: 6, paddingBottom: 2 }]}>
            Designs also call for{' '}
            {orphan.map((br, i) => (
              <Text key={br}>
                {i ? ', ' : ''}
                <Text style={{ fontFamily: MF, color: T.ink, fontWeight: '800' }}>{br}</Text>
                {' (' + inDesigns[br].slice(0, 3).join(', ') + (inDesigns[br].length > 3 ? ' +' + (inDesigns[br].length - 3) : '') + ')'}
              </Text>
            ))}
            {' — no sub item for that split yet.'}
          </Text>
        )}
      </View>
    );
  };

  const blendPanel = (it: YarnItem) => (
    <View style={st.panel}>
      <View style={st.panelHead}>
        <Text style={st.panelTitle}>
          {'SUB ITEMS OF '}
          <Text style={{ fontFamily: MF, color: T.copper }}>{it.id}</Text>
          {' · ' + blendSubs(it).length}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 10, color: C.mut }}>blend</Text>
          {it.blend.map((f) => (
            <View key={f} style={st.chip}>
              <View style={[st.sq, { backgroundColor: fibreCol(f) }]} />
              <Text style={st.chipTxt}>{f}</Text>
            </View>
          ))}
        </View>
        <Text onPress={() => openYarn(it.id)} style={st.fullLink}>Full detail ›</Text>
      </View>
      {subTable(it)}
    </View>
  );

  const yarnRow = (it: YarnItem) => {
    const blend = isBlend(it);
    const open = blend && !!exp[it.id];
    const subs = blendSubs(it);
    return (
      <React.Fragment key={it.id}>
        <Row onPress={() => (blend ? toggle(it.id) : openYarn(it.id))}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={st.yTop}>
              {blend && <Text style={st.caret}>{open ? '▾' : '▸'}</Text>}
              {code(it.id)}
              <Text style={st.yName} numberOfLines={1}>{it.mainItem}</Text>
            </View>
            <Text style={st.yMeta} numberOfLines={1}>
              {structure(it)}
              {it.nDesigns ? ' · ' + it.nDesigns + ' design' + (it.nDesigns !== 1 ? 's' : '') : ''}
              {blend ? ' · ' + subs.length + ' sub item' + (subs.length !== 1 ? 's' : '') : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[st.yNum, { color: C.prod }]}>{fmtKg(it.usedKg)}</Text>
            <Text style={st.yUnit}>{kgExact(it.usedKg) || 'used'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', minWidth: 54 }}>
            <Text style={[st.yNum, { color: it.latest ? T.copper : C.mut }]}>{rateLbl(it)}</Text>
            <Text style={st.yUnit}>₹/kg</Text>
          </View>
        </Row>
        {open && blendPanel(it)}
      </React.Fragment>
    );
  };

  const yarnHead = (first: string) => (
    <Row head>
      <View style={{ flex: 1 }}><HeadTxt>{first}</HeadTxt></View>
      <HeadTxt right>Used · all</HeadTxt>
      <View style={{ minWidth: 54 }}><HeadTxt right>Latest</HeadTxt></View>
    </Row>
  );

  const crumbs = (parts: { lbl: string; on?: () => void }[], back: () => void, onRefresh?: () => void) => (
    <View style={st.crumbs}>
      <View style={st.crumbPath}>
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Text style={{ color: C.mut }}>›</Text>}
            <Text onPress={p.on} style={[st.crumb, !p.on && { color: C.ink }, { flexShrink: i === parts.length - 1 ? 1 : 0 }]} numberOfLines={1}>{p.lbl}</Text>
          </React.Fragment>
        ))}
      </View>
      {refreshBtn(onRefresh || (() => void load(true)))}
      <Text onPress={back} style={st.crumb}>‹ back</Text>
    </View>
  );

  /** live refresh: rebuilds the server copy (refresh = 1); on a yarn it also reloads that yarn's detail */
  const refreshBtn = (onPress: () => void) => (
    <TouchableOpacity onPress={() => { if (!refreshing) onPress(); }} style={st.refresh} disabled={refreshing}>
      {refreshing ? <ActivityIndicator size="small" color={C.prod} /> : <Text style={st.refreshTxt}>↻ Refresh</Text>}
      {!!stamp && !refreshing && <Text style={st.stamp}>{syncing ? 'updating…' : stamp}</Text>}
    </TouchableOpacity>
  );

  const badge = (bg: string, fg: string, txt: string, size = 20) => (
    <View style={[st.badge, { backgroundColor: bg + '18' }]}>
      <Text style={{ color: fg, fontSize: size, fontWeight: '800' }}>{txt}</Text>
    </View>
  );

  /* ------------------------------ states ------------------------------ */
  let body: React.ReactNode;
  if (loading && !data) {
    body = (
      <View style={st.center}>
        <ActivityIndicator color={T.copper} />
        <Text style={[st.note, { marginTop: 8 }]}>Loading yarns, stock and consumption…</Text>
      </View>
    );
  } else if (!data) {
    body = (
      <Card style={{ padding: 14 }}>
        <Text style={st.errTxt}>{error || 'No data.'}</Text>
        {diagLines(diag).map((l, i) => <Text key={i} style={st.diag}>{l}</Text>)}
        <Text onPress={() => void load()} style={[st.fullLink, { marginTop: 8 }]}>Retry ›</Text>
      </Card>
    );
  } else if (view.kind === 'yarn') {
    body = renderYarn(view);
  } else if (view.kind === 'cat') {
    body = renderCat(view.cat);
  } else {
    body = renderHub();
  }

  /* ------------------------------ yarn detail ------------------------------ */
  function renderYarn(v: { id: string; from: View_ }) {
    const it = items.find((z) => z.id === v.id);
    if (!it) return <Card style={{ padding: 14 }}><Text style={st.note}>Yarn not found.</Text></Card>;
    const cat = YMS_CATS.find((c) => c.k === it.cat.k) || YMS_CATS[4];
    const det = details[it.id];
    const ready = det && det !== 'loading' && !('error' in det) ? (det as YarnDetail) : null;
    const pending = (
      det === 'loading' || !det
        ? <ActivityIndicator color={T.copper} style={{ paddingVertical: 12 }} />
        : <Text style={st.errTxt}>{(det as any).error}</Text>
    );
    const line = (k: string, left: React.ReactNode, right: string) => (
      <View key={k} style={st.line}>
        <Text style={st.lineL} numberOfLines={1}>{left}</Text>
        <Text style={st.lineR}>{right}</Text>
      </View>
    );
    const issueLine = (r: IssueRow, side: 'creel' | 'weft', i: number) =>
      line(side + i, (
        <>
          <Text style={{ fontWeight: '800' }}>{side === 'creel' ? r.creelid || r.no : r.beamno || r.no}</Text>
          {side === 'creel' ? ' · creel' : ' · weft'}
          {r.kind === 'return' ? ' · return' : ''}
          {r.design ? ' · ' + r.design : ''}
          <Text style={{ color: C.mut }}>{' · ' + ymsDateFull(r.date) + (r.kind === 'return' ? ' · ret ' + r.no : ' · iss ' + r.no)}</Text>
        </>
      ), ymsKg(r.kg));
    const allLots = ready ? ready.cartons : [];
    const chees = allLots.reduce((a, c) => a + c.chees, 0);
    const lotsQ = fv('lots:' + it.id);
    const lots = allLots.filter((c) => matches([c.cartno, c.mername, c.grdname, c.shdname, c.itmcode, c.itmname].join(' '), lotsQ));
    const lotsKg = lots.reduce((a, c) => a + c.wt, 0);
    const consAll = ready ? [...ready.creel.map((r) => ({ r, s: 'creel' as const })), ...ready.weft.map((r) => ({ r, s: 'weft' as const }))].sort((a, b) => b.r.date.localeCompare(a.r.date)) : [];
    const consQ = fv('cons:' + it.id);
    const consK = fv('cons:' + it.id + ':kind') || 'all';
    const consRows = consAll.filter((x) =>
      (consK === 'all' || (consK === 'creel' && x.s === 'creel') || (consK === 'weft' && x.s === 'weft') || (consK === 'ret' && x.r.kind === 'return'))
      && matches([x.r.creelid, x.r.beamno, x.r.design, x.r.no, x.r.issno || '', x.r.machine, x.r.itmcode, x.s, x.r.kind, ymsDateFull(x.r.date), x.r.date].join(' '), consQ));
    const consKg = consRows.reduce((a, x) => a + x.r.kg, 0);
    const consKey = 'cons:' + it.id;
    const cons = consRows.slice(0, limitOf(consKey, 20));
    const lotsKey = 'lots:' + it.id;
    const lotsShown = lots.slice(0, limitOf(lotsKey, 8));
    const dsQ = fv('ds:' + it.id);
    const dsSide = fv('ds:' + it.id + ':side') || 'all';
    const dsList = it.designs.filter((d) => (dsSide === 'all' || d.side === dsSide) && matches([d.code, d.side, d.br, d.category].join(' '), dsQ));
    const dsKey = 'ds:' + it.id;
    const dsShown = dsList.slice(0, limitOf(dsKey, 30));
    const prQ = fv('pr:' + it.id);
    const prP = fv('pr:' + it.id + ':period') || 'all';
    const prFrom = prP === 'all' ? '' : (() => { const d = new Date(); d.setMonth(d.getMonth() - (prP === '6m' ? 6 : prP === '1y' ? 12 : 24)); return d.toISOString().slice(0, 10); })();
    const prices = ready ? ready.prices.filter((p) => (!prFrom || p.date >= prFrom) && matches([p.party, p.inwno, p.itmcode, p.parcode].join(' '), prQ)) : [];

    const widgets = [
      {
        key: 'price', weight: 11,
        node: (
          <Widget icon="₹" title="Price trend" accent={T.copper}>
            {ready && ready.prices.length > 0 && (
              <FilterBar value={prQ} onChange={(v) => setF('pr:' + it.id, v)} placeholder="Party, inward no. or item code…" color={T.copper}
                chips={[{ k: 'all', l: 'All' }, { k: '2y', l: '2 years' }, { k: '1y', l: '1 year' }, { k: '6m', l: '6 months' }]}
                chip={prP} onChip={(k) => setF('pr:' + it.id + ':period', k)} shown={prices.length} total={ready.prices.length} />
            )}
            {!ready ? pending : prices.length === 0 && ready.prices.length > 0
              ? <Text style={st.note}>No purchase rate matches the filter.</Text>
              : <YarnPriceChart key={prQ + prP} points={prices} height={220} title={'Price trend · ' + it.id + ' · ' + it.mainItem} />}
          </Widget>
        ),
      },
      {
        key: 'designs', weight: 2 + dsShown.length * 0.8,
        node: (
          <Widget icon="◳" title="Designs using this yarn" accent={C.owner}>
            {it.designs.length > 0 && (
              <FilterBar value={dsQ} onChange={(v) => setF('ds:' + it.id, v)} placeholder="Design code, blend or category…" color={C.owner}
                chips={[{ k: 'all', l: 'All' }, { k: 'warp', l: 'Warp' }, { k: 'weft', l: 'Weft' }]}
                chip={dsSide} onChip={(k) => setF('ds:' + it.id + ':side', k)} shown={dsList.length} total={it.designs.length} />
            )}
            {it.designs.length === 0 ? (
              <Text style={st.note}>Not used in any design yet.</Text>
            ) : dsList.length === 0 ? (
              <Text style={st.note}>No design matches the filter.</Text>
            ) : (
              dsShown.map((d, i) =>
                line('d' + i, (
                  <>
                    <Text style={{ fontWeight: '800' }}>{d.code}</Text>
                    {' · ' + d.side + (d.br ? ' · ' + d.br : '')}
                    {d.category ? <Text style={{ color: C.mut }}>{' · ' + catShort(d.category)}</Text> : null}
                  </>
                ), d.val ? d.val + (d.side === 'warp' ? ' EPI' : ' PPI') : '—'),
              )
            )}
            {moreRow(dsKey, 30, dsList.length, C.owner, 'design lines')}
          </Widget>
        ),
      },
      {
        key: 'lots', weight: 3 + lotsShown.length * 0.8,
        node: (
          <Widget icon="▩" title="Stock lots" accent={C.bill}>
            <TotRow items={[
              { label: 'Cartons', value: ready ? String(allLots.length) : '…' },
              { label: 'In stock', value: fmtKg(it.stockKg), sub: kgExact(it.stockKg), color: C.bill },
              { label: 'Cheeses', value: ready ? chees.toLocaleString('en-IN') : '…' },
            ]} />
            {ready && allLots.length > 0 && (
              <FilterBar value={lotsQ} onChange={(v) => setF('lots:' + it.id, v)} placeholder="Carton no., merge, grade, shade or item code…" color={C.bill}
                shown={lots.length} total={allLots.length} />
            )}
            {ready && lotsQ.trim() && lots.length > 0 ? <Text style={st.fSum}>{'Filtered: ' + lots.length + (lots.length === 1 ? ' carton · ' : ' cartons · ') + ymsKg(lotsKg)}</Text> : null}
            {!ready ? pending : allLots.length === 0 ? <Text style={st.note}>No cartons in stock.</Text> : lots.length === 0 ? <Text style={st.note}>No carton matches the filter.</Text> : null}
            {lotsShown.map((c, i) =>
              line('c' + i, (
                <>
                  <Text style={{ fontWeight: '800' }}>{c.cartno}</Text>
                  {' · ' + (c.mername || '—') + ' · ' + (c.grdname || '—')}
                  <Text style={{ color: C.mut }}>{(c.shdname ? ' · ' + c.shdname : '') + (c.itmcode !== it.id ? ' · ' + c.itmcode : '') + ' · ' + c.chees + ' chs'}</Text>
                </>
              ), ymsKg(c.wt)),
            )}
            {moreRow(lotsKey, 8, lots.length, C.bill, 'cartons')}
          </Widget>
        ),
      },
      {
        key: 'cons', weight: 3 + Math.min(cons.length, 20) * 0.8,
        node: (
          <Widget icon="⊟" title="Consumption" accent={C.prod}>
            <TotRow items={[
              { label: 'On creels', value: fmtKg(it.creelKg), sub: kgExact(it.creelKg), color: C.prod },
              { label: 'As weft', value: fmtKg(it.weftKg), sub: kgExact(it.weftKg) },
              { label: 'Last used', value: it.lastUsed ? ymsDateLbl(it.lastUsed) : '—' },
            ]} />
            {ready && consAll.length > 0 && (
              <FilterBar value={consQ} onChange={(v) => setF('cons:' + it.id, v)} placeholder="Creel id, beam no., design, voucher no. or date…" color={C.prod}
                chips={[{ k: 'all', l: 'All' }, { k: 'creel', l: 'Creel' }, { k: 'weft', l: 'Weft' }, { k: 'ret', l: 'Returns' }]}
                chip={consK} onChip={(k) => setF('cons:' + it.id + ':kind', k)} shown={consRows.length} total={consAll.length} />
            )}
            {ready && (consQ.trim() || consK !== 'all') && consRows.length > 0 ? <Text style={st.fSum}>{'Filtered net: ' + ymsKg(consKg) + ' in ' + consRows.length + (consRows.length === 1 ? ' line' : ' lines')}</Text> : null}
            {!ready ? pending : consAll.length === 0 ? <Text style={st.note}>No creel or weft issues recorded.</Text> : consRows.length === 0 ? <Text style={st.note}>No issue or return matches the filter.</Text> : null}
            {cons.map((x, i) => issueLine(x.r, x.s, i))}
            {moreRow(consKey, 20, consRows.length, C.prod, 'issues & returns')}
          </Widget>
        ),
      },
    ];
    if (isBlend(it)) {
      widgets.push({
        key: 'subs', weight: 2 + blendSubs(it).length * 1.4,
        node: (
          <Widget icon="≡" title={'Sub items · blend split · ' + blendSubs(it).length} accent={T.copper}>
            {blendSubs(it).length > 3 && (
              <FilterBar value={fv('subs:' + it.id)} onChange={(v) => setF('subs:' + it.id, v)} placeholder="Sub item code, name or split (e.g. 55/45)…" color={T.copper}
                shown={blendSubs(it).filter((x) => matches([x.id, x.label, x.ratioKey].join(' '), fv('subs:' + it.id))).length} total={blendSubs(it).length} />
            )}
            {subTable(it, fv('subs:' + it.id))}
          </Widget>
        ),
      });
    }

    return (
      <View>
        {crumbs(
          [
            { lbl: 'Yarn hub', on: () => go({ kind: 'hub' }) },
            { lbl: cat.lbl, on: () => go({ kind: 'cat', cat: cat.k }) },
            { lbl: it.id + ' · ' + it.mainItem },
          ],
          () => go(v.from || { kind: 'hub' }),
          () => void load(true),
        )}
        <Card style={{ padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {badge(cat.color, cat.color, it.kind === 'filament' ? 'FIL' : 'SPN', 11)}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {code(it.id)}
                <Text style={st.h1}>{it.mainItem}</Text>
              </View>
              <Text style={st.sub}>
                {cat.lbl}
                {it.cat.k === 'Blends' ? ' · ' + it.cat.sub : ''}
                {' · ' + structure(it)}
                {it.filType ? ' · ' + it.filType : ''}
                {it.lustre ? ' · ' + it.lustre.toLowerCase() : ''}
                {it.other ? ' · ' + it.other : ''}
              </Text>
            </View>
          </View>
          <View style={st.stats}>
            <StatCard label="In stock" value={fmtKg(it.stockKg)} sub={kgExact(it.stockKg)} color={C.bill} />
            <StatCard label="Used · FY" value={fmtKg(it.usedKg)} sub={kgExact(it.usedKg) || 'creel + weft'} color={C.prod} />
            <StatCard label="Designs" value={String(it.nDesigns)} color={C.owner} />
            <StatCard label="Latest ₹/kg" value={rateLbl(it)} color={T.copper} />
          </View>
          {it.latest && (
            <Text style={[st.sub, { fontSize: 10, marginTop: 8 }]}>
              {'Latest rate '}
              <Text style={{ color: T.copper, fontFamily: MF, fontWeight: '800' }}>{'₹' + it.latest.rate.toLocaleString('en-IN')}</Text>
              {' · ' + it.latest.party + ' · ' + ymsDateFull(it.latest.date) + ' · last purchase entry'}
            </Text>
          )}
        </Card>
        <Columns items={widgets} width={width} />
      </View>
    );
  }

  /* ------------------------------ category ------------------------------ */
  function renderCat(k: CatKey) {
    const cat = YMS_CATS.find((c) => c.k === k) || YMS_CATS[0];
    const all = byCat(cat.k);
    const t = totals(all);
    const cq = fv('cat:' + cat.k);
    const cs = fv('cat:' + cat.k + ':show') || 'all';
    const list = all
      .filter((x) => matches(searchText(x), cq))
      .filter((x) => cs === 'all' || (cs === 'stock' && x.stockKg > 0) || (cs === 'used' && x.usedKg > 0) || (cs === 'unused' && x.usedKg <= 0) || (cs === 'designs' && x.nDesigns > 0))
      .sort(cs === 'stock' ? (a, b) => b.stockKg - a.stockKg : byScore);
    return (
      <View>
        {crumbs([{ lbl: 'Yarn hub', on: () => go({ kind: 'hub' }) }, { lbl: cat.lbl }], () => go({ kind: 'hub' }))}
        <Card style={{ padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {badge(cat.color, cat.color, cat.icon)}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.h1}>{cat.lbl}</Text>
              <Text style={st.sub}>{t.n + ' yarn' + (t.n !== 1 ? 's' : '') + ' · most used first'}</Text>
            </View>
          </View>
          <View style={st.stats}>
            <StatCard label="In stock" value={fmtKg(t.stock)} sub={kgExact(t.stock)} color={C.bill} />
            <StatCard label={'Used · ' + monthLbl} value={fmtKg(t.used)} sub={kgExact(t.used)} color={C.prod} />
            <StatCard label="Designs" value={String(t.designs)} color={C.owner} />
          </View>
        </Card>
        <Card style={{ paddingTop: 8, paddingHorizontal: 8, paddingBottom: 6, marginBottom: 12 }}>
          <FilterBar value={cq} onChange={(v) => setF('cat:' + cat.k, v)} placeholder={'Search ' + cat.lbl.toLowerCase() + ' yarns — code, count, blend, sub item…'} color={cat.color}
            chips={[{ k: 'all', l: 'All' }, { k: 'stock', l: 'In stock' }, { k: 'used', l: 'Used this FY' }, { k: 'unused', l: 'Not used' }, { k: 'designs', l: 'In designs' }]}
            chip={cs} onChip={(k) => setF('cat:' + cat.k + ':show', k)} shown={list.length} total={all.length} />
          {yarnHead('Yarn')}
          {list.slice(0, limitOf('cat:' + cat.k, PAGE)).map(yarnRow)}
          {moreRow('cat:' + cat.k, PAGE, list.length, cat.color, 'yarns')}
          {list.length === 0 && <Text style={st.empty}>{all.length ? 'No yarn matches the filter.' : 'No yarns in this category.'}</Text>}
        </Card>
      </View>
    );
  }

  /* ------------------------------ hub ------------------------------ */
  function renderHub() {
    const ql = q.trim().toLowerCase();
    const hs = fv('hub:show') || 'all';
    const filtering = !!ql || hs !== 'all';
    const found = filtering
      ? items
        .filter((x) => matches(searchText(x) + ' ' + x.cat.k + ' ' + structure(x), ql))
        .filter((x) => hs === 'all' || (hs === 'stock' && x.stockKg > 0) || (hs === 'used' && x.usedKg > 0) || (hs === 'unused' && x.usedKg <= 0) || (hs === 'filament' && x.kind === 'filament') || (hs === 'spun' && x.kind === 'spun'))
        .sort(hs === 'stock' ? (a, b) => b.stockKg - a.stockKg : (a, b) => b.score - a.score)
      : [];
    return (
      <View>
        <Card style={{ padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {badge(C.prod, C.prod, '▩')}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.h1}>Yarn hub</Text>
              <Text style={st.sub}>
                {tAll.n + ' yarns · ' + cats.length + ' categories · tap a category for its yarns, a yarn for its detail · blended yarns open their sub items in place'}
              </Text>
            </View>
          </View>
          <View style={st.stats}>
            <StatCard label="In stock" value={fmtKg(tAll.stock)} sub={kgExact(tAll.stock)} color={C.bill} />
            <StatCard label={'Used · ' + monthLbl} value={fmtKg(tAll.used)} sub={kgExact(tAll.used)} color={C.prod} />
            <StatCard label="Designs" value={String(tAll.designs)} color={C.owner} />
          </View>
          <View style={{ marginTop: 12 }}>
            <FilterBar value={q} onChange={setQ} placeholder="Search item code, yarn, count, blend, category or sub item…" color={C.prod}
              chips={[{ k: 'all', l: 'All' }, { k: 'stock', l: 'In stock' }, { k: 'used', l: 'Used this FY' }, { k: 'unused', l: 'Not used' }, { k: 'spun', l: 'Spun' }, { k: 'filament', l: 'Filament' }]}
              chip={hs} onChip={(k) => setF('hub:show', k)} shown={found.length} total={items.length} />
          </View>
          {!!error && <Text style={[st.errTxt, { marginTop: 8 }]}>{error}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 }}>
            {!!diag && (
              <Text onPress={() => toggle('diag')} style={[st.diag, { color: C.prod, fontWeight: '700' }]}>
                {(exp.diag ? '▾' : '▸') + ' Data sources' + (Object.keys(diag.errors || {}).length ? ' · ' + Object.keys(diag.errors || {}).length + ' error' : '')}
              </Text>
            )}
            <View style={{ marginLeft: 'auto' }}>{refreshBtn(() => void load(true))}</View>
          </View>
          {(exp.diag || items.length === 0 || Object.keys(diag?.errors || {}).length > 0) && diagLines(diag).map((l, i) => (
            <Text key={i} style={st.diag}>{l}</Text>
          ))}
        </Card>
        {filtering ? (
          <Card style={{ paddingTop: 4, paddingHorizontal: 8, paddingBottom: 6, marginBottom: 12 }}>
            {yarnHead(found.length + ' match' + (found.length !== 1 ? 'es' : ''))}
            {found.slice(0, limitOf('q:' + ql + hs, PAGE)).map(yarnRow)}
            {moreRow('q:' + ql + hs, PAGE, found.length, C.prod, 'matches')}
            {found.length === 0 && <Text style={st.empty}>No yarn matches.</Text>}
          </Card>
        ) : (
          <Columns
            width={width}
            items={cats.map((cat) => {
              const list = byCat(cat.k);
              const t = totals(list);
              const top = list.slice(0, 4);
              const openCat = () => go({ kind: 'cat', cat: cat.k });
              const extra = top.reduce((a, x) => a + (isBlend(x) && exp[x.id] ? 3 + blendSubs(x).length : 0), 0);
              return {
                key: cat.k,
                weight: 4 + top.length + extra,
                node: (
                  <Widget icon={cat.icon} title={cat.lbl + ' · ' + t.n} accent={cat.color} onTitle={openCat}>
                    <TotRow items={[
                      { label: 'In stock', value: fmtKg(t.stock), sub: kgExact(t.stock), color: cat.color },
                      { label: 'Used · ' + monthLbl, value: fmtKg(t.used), sub: kgExact(t.used) },
                      { label: 'Designs', value: String(t.designs) },
                    ]} />
                    {top.length ? (
                      <>
                        {yarnHead('Most used')}
                        {top.map(yarnRow)}
                      </>
                    ) : (
                      <Text style={[st.note, { paddingTop: 4, paddingBottom: 8 }]}>No yarns in this category yet.</Text>
                    )}
                    {list.length > top.length && (
                      <Text onPress={openCat} style={[st.fullLink, { color: cat.color, paddingTop: 7, paddingBottom: 2 }]}>
                        {'All ' + list.length + ' ' + cat.lbl.toLowerCase() + ' yarns ›'}
                      </Text>
                    )}
                  </Widget>
                ),
              };
            })}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={[st.page, wide && st.pageWide]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={T.copper} />}
    >
      {body}
    </ScrollView>
  );
}

/* ===================================== styles ===================================== */

const st = StyleSheet.create({
  page: { padding: 14, paddingBottom: 30 },
  pageWide: { maxWidth: 1440, width: '100%', alignSelf: 'center' },
  center: { paddingVertical: 60, alignItems: 'center' },
  dcard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.bd,
    borderRadius: 14,
    shadowColor: '#141514',
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  wHead: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  wIcon: { fontSize: 13, color: '#fff' },
  wTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9, color: '#fff', flexShrink: 1 },
  wFull: { marginLeft: 'auto', fontSize: 9, fontWeight: '700', color: '#fff', opacity: 0.92 },
  wBody: { paddingHorizontal: 12, paddingVertical: 6 },

  totRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 6, paddingTop: 4, paddingBottom: 8 },
  totCell: { flexGrow: 1, flexBasis: 0, minWidth: 82 },
  exact: { fontSize: 9, color: C.mut, fontFamily: MF, marginTop: 1 },
  totLbl: { fontSize: 8.5, color: C.mut, letterSpacing: 0.4, fontWeight: '700' },
  totVal: { fontSize: 15, fontFamily: MF, fontWeight: '700', marginTop: 1 },

  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  stat: { flexGrow: 1, flexBasis: 0, minWidth: 128, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bd, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  statLbl: { fontSize: 8.5, color: C.mut, letterSpacing: 0.5, fontWeight: '700' },
  statVal: { fontSize: 14, fontFamily: MF, fontWeight: '700', marginTop: 3 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.hair },
  rowHead: {},
  headTxt: { fontSize: 9, color: C.faint, letterSpacing: 0.5, fontWeight: '700' },

  code: { fontFamily: MF, fontSize: 11, fontWeight: '800', color: T.copper },
  yTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  caret: { fontSize: 9, color: T.copper, width: 8 },
  yName: { fontWeight: '700', fontSize: 12.5, color: C.ink, flexShrink: 1 },
  yMeta: { fontSize: 9.5, color: C.mut, marginTop: 1 },
  yNum: { fontFamily: MF, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  yUnit: { fontSize: 8.5, color: C.mut, textAlign: 'right' },
  monoR: { fontFamily: MF, fontWeight: '700', textAlign: 'right' },

  panel: {
    marginTop: 2, marginBottom: 8, marginLeft: 14, paddingHorizontal: 10, paddingVertical: 6,
    borderLeftWidth: 3, borderLeftColor: T.copper, backgroundColor: T.sub, borderTopRightRadius: 8, borderBottomRightRadius: 8,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 4, paddingBottom: 2 },
  panelTitle: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
  },
  chipTxt: { fontSize: 10, fontWeight: '700', color: T.ink },
  sq: { width: 7, height: 7, borderRadius: 2 },
  fullLink: { marginLeft: 'auto', fontSize: 10.5, fontWeight: '800', color: C.prod },

  fibCol: { width: 46, textAlign: 'right' },
  fibPct: { fontFamily: MF, fontSize: 12, fontWeight: '700' },
  subName: { fontWeight: '700', fontSize: 12, lineHeight: 15, color: C.ink },
  bar: { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: T.alt, marginTop: 4, marginBottom: 2, maxWidth: 220 },
  subMeta: { fontSize: 9.5, color: C.mut, lineHeight: 12.5 },

  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  crumbPath: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  refresh: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.prod + '55', backgroundColor: C.prod + '0D',
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, minHeight: 26,
  },
  refreshTxt: { fontSize: 10.5, fontWeight: '800', color: C.prod },
  stamp: { fontSize: 9, color: C.mut, fontFamily: MF },
  crumb: { fontSize: 11.5, fontWeight: '800', color: C.prod },
  badge: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 16, fontWeight: '800', color: C.ink, flexShrink: 1 },
  sub: { fontSize: 11, color: C.mut, marginTop: 2 },

  line: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: T.alt },
  lineL: { flex: 1, minWidth: 0, fontSize: 11.5, color: C.ink },
  lineR: { fontFamily: MF, fontSize: 11.5, color: C.ink },

  fBar: { paddingTop: 2, paddingBottom: 6, gap: 6 },
  fRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fInp: {
    flex: 1, minWidth: 0, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.border, borderRadius: 9,
    paddingHorizontal: 11, paddingVertical: 8, fontSize: 12.5, color: T.ink,
  },
  fClear: { fontSize: 11, fontWeight: '800', paddingHorizontal: 4 },
  fChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fChip: {
    fontSize: 10.5, fontWeight: '800', color: C.ink, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: C.bd, backgroundColor: T.surface, overflow: 'hidden',
  },
  fCount: { fontSize: 9.5, color: C.mut, fontFamily: MF },
  fSum: { fontSize: 10.5, color: C.ink, fontWeight: '700', paddingBottom: 4 },
  inp: {
    marginTop: 12, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.border, borderRadius: 9,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: T.ink,
  },
  note: { fontSize: 11, color: C.mut, paddingVertical: 6 },
  empty: { padding: 16, textAlign: 'center', color: C.mut, fontSize: 12 },
  errTxt: { color: T.red, fontSize: 11.5, fontWeight: '700' },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8, paddingBottom: 2, flexWrap: 'wrap' },
  moreLink: { fontSize: 10.5, fontWeight: '800' },
  moreInfo: { fontSize: 9.5, color: C.mut, fontFamily: MF },
  diag: { fontSize: 10, color: C.mut, marginTop: 4, fontFamily: MF },
});
