import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import axios from 'axios';
import { ConversionText as Text, CONVERSION_MONO, ensureConversionWebFonts } from './ConversionTypography';
import { ErpSessionGate } from '../../core/session/erpSession';

/* Weaving conversion — port of the Client Artifact's Weaving Production › Conversion tab.
   Every checking entry is converted at its own design's pool pick rate for the month it was
   checked; groups add those entry values up. An entry with no Table PPI or no rate is shown
   and marked, never counted as ₹0. */

type ApiRow = { d: string; p: string; ds: string; mc: string | null; bm: string | null; rl: string | null; m: number; ppi: number | null; ps: string; rk: string; c: number | null };
type Part = { po: string; qty: number; rate: number | null; basis: string };
type Rate = { rate: number | null; qty: number; parts: Part[]; src: string; no_po: boolean; pool_month: string | null; status: string };
type Payload = { rows: ApiRow[]; designs: Record<string, { code: string | null; cat: string | null }>; machines: Record<string, { loom: string; shed: string | null; width_cm?: number | null }>; rates: Record<string, Rate> };
type E = { id: string; date: string; dkey: string; design: string; cat: string; shed: string; loom: string; beamId: string; roll: string | null; m: number; ppi: number | null; rate: number | null; conv: number | null; pr: Rate; mkey: string; width: number | null };
type Agg = { m: number; conv: number; convM: number; picks: number; ppi: number; rate: number; perM: number; n: number; noPO: number; nc: number; ncM: number; ncPpi: number; ncRate: number; ncBoth: number; any: boolean };
type G = Agg & { k: string; label: string; list: E[]; designs: string[]; looms: string[] };
type Lvl = 'shed' | 'loom' | 'cat' | 'design' | 'day' | 'beamId';
type Mode = 'shed' | 'cat' | 'design';
type Crumb = { k: Lvl; v: string; label: string };
type Preset = 'today' | 'yday' | '7d' | 'month' | 'custom';

const C = { ink: '#1A1514', mut: '#7C746C', faint: '#9A9590', hair: '#EFEAE4', border: '#E5E0DA', paper: '#FFFFFF', sub: '#F8F5F1', prod: '#652880', bill: '#3A568A', owner: '#0D1B2A', exec: '#1C567A', amber: '#C98A1A' };
const SHED_LIST = [
  { k: 'MW', lbl: 'M Weaves', n: 48, rng: 'R01–R48', color: '#652880', alias: ['mweaves', 'mweave'] },
  { k: 'S190', lbl: 'S. Rapier (190 cm)', n: 38, rng: 'R49–R74 · R85–R96', color: '#8E44AD', alias: ['srapier190cm', 'srapier190'] },
  { k: 'S230', lbl: 'S. Rapier (230 cm)', n: 10, rng: 'R75–R84', color: '#1C567A', alias: ['srapier230cm', 'srapier230'] },
  { k: 'WJ', lbl: 'Waterjet', n: 30, rng: 'W01–W30', color: '#3A568A', alias: ['waterjet', 'waterjetloom'] },
];
const FLEET = SHED_LIST.reduce((s, g) => s + g.n, 0);
const CLBL: Record<Lvl, string> = { shed: 'Shed', loom: 'Machine', cat: 'Item category', design: 'Design', day: 'Day', beamId: 'Beam' };
const plur = (l: string) => (l === 'Item category' ? 'Item categories' : l + 's');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (n: number) => Math.round(+n || 0).toLocaleString('en-IN');
const M = (n: number) => fmt(n) + ' m';
const R = (n: number) => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
const R4 = (n: number) => '₹' + (+n || 0).toFixed(4);
const fmtD = (d: string) => (d && d.length >= 10 ? `${d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : '—');
const monthLbl = (ym: string) => `${MON[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
const ds = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return ds(x); };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const shedOf = (label: string | null | undefined) => { if (!label || label === '—') return 'Shed not mapped'; const g = SHED_LIST.find(x => x.alias.includes(norm(label)) || norm(x.lbl) === norm(label)); return g ? g.lbl : label; };
const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const PAGE = 200;

function agg(list: E[]): Agg {
  let m = 0, conv = 0, convM = 0, picks = 0, pm = 0, pp = 0, noPO = 0, nc = 0, ncM = 0, ncPpi = 0, ncRate = 0, ncBoth = 0;
  for (const r of list) {
    m += r.m;
    if (r.ppi != null) { pm += r.m; pp += r.m * r.ppi; }
    if (r.conv != null) { conv += r.conv; convM += r.m; picks += r.m * (r.ppi as number); if (r.pr.no_po) noPO++; }
    else {
      nc++; ncM += r.m;
      if (r.ppi == null && r.rate == null) ncBoth++; else if (r.ppi == null) ncPpi++; else ncRate++;
    }
  }
  return { m, conv, convM, picks, ppi: pm > 0 ? pp / pm : 0, rate: picks > 0 ? conv / picks : 0, perM: convM > 0 ? conv / convM : 0, n: list.length, noPO, nc, ncM, ncPpi, ncRate, ncBoth, any: convM > 0 };
}

/* why a group has rolls without ₹: no pick rate, no Table PPI, or a mix */
const ncLabel = (g: Agg) => {
  const why = g.ncPpi === 0 && g.ncBoth === 0 ? 'NO PICK RATE' : g.ncRate === 0 && g.ncBoth === 0 ? 'NO TABLE PPI' : 'NO PPI / PICK RATE';
  return `${fmt(g.ncM)} m · ${why}`;
};

/* Calendar date picker — no text typing, no extra package; works on web and device. */
const WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
function Calendar({ value, min, max, onPick }: { value: string; min?: string; max: string; onPick: (d: string) => void }) {
  const [ym, setYm] = useState(value.slice(0, 7));
  const y = +ym.slice(0, 4), mo = +ym.slice(5, 7);
  const first = new Date(y, mo - 1, 1), days = new Date(y, mo, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)];
  while (cells.length % 7) cells.push(null);
  const shift = (n: number) => { const d = new Date(y, mo - 1 + n, 1); setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };
  const canNext = ym < max.slice(0, 7);
  return (
    <View style={{ ...card, padding: 10, width: 280, maxWidth: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <TouchableOpacity onPress={() => shift(-1)} style={{ padding: 6 }}><Text style={{ fontSize: 16, fontWeight: '800', color: C.prod }}>‹</Text></TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '800', color: C.ink }}>{MON[mo - 1]} {y}</Text>
        <TouchableOpacity disabled={!canNext} onPress={() => shift(1)} style={{ padding: 6, opacity: canNext ? 1 : 0.3 }}><Text style={{ fontSize: 16, fontWeight: '800', color: C.prod }}>›</Text></TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row' }}>{WD.map(w => <Text key={w} style={{ width: `${100 / 7}%`, textAlign: 'center', fontSize: 9.5, fontWeight: '800', color: C.mut }}>{w}</Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
        {cells.map((d, i) => {
          const off = !d || d > max || (!!min && d < min); const on = d === value;
          return (
            <TouchableOpacity key={i} disabled={off} onPress={() => d && onPick(d)} style={{ width: `${100 / 7}%`, height: 32, alignItems: 'center', justifyContent: 'center' }}>
              {d && <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.prod : 'transparent' }}>
                <Text style={{ fontSize: 12, fontWeight: on ? '800' : '500', color: on ? '#fff' : off ? C.faint : C.ink }}>{+d.slice(8, 10)}</Text>
              </View>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Chip({ t, c }: { t: string; c: string }) {
  return <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: c + '33', backgroundColor: c + '14' }}><Text style={{ fontSize: 8.5, fontWeight: '800', color: c }}>{t}</Text></View>;
}
function Bar({ pct, color, detail }: { pct: number; color: string; detail: string }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  return <View style={{ zIndex: hover || pinned ? 20 : 0 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={detail} accessibilityState={{ expanded: pinned }}
      onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
      onPress={event => { event.stopPropagation(); setPinned(v => !v); }} style={{ paddingTop: 2, paddingBottom: 6 }}>
      <View style={{ height: 7, backgroundColor: C.hair, borderRadius: 4, overflow: 'hidden' }}><View style={{ height: 7, width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} /></View>
    </Pressable>
    {(hover || pinned) && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 18, backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 8, elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
      <Text style={{ fontSize: 10, color: C.ink, lineHeight: 15 }}>{detail}</Text>
    </View>}
  </View>;
}
function Rank({ i }: { i: number }) {
  return <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: i < 3 ? C.prod : C.hair, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 9, fontWeight: '800', color: i < 3 ? '#fff' : C.mut }}>{i + 1}</Text></View>;
}
const card = { backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 14, shadowColor: '#141514', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 } as const;

function ConversionBreadcrumbs({ mode, path, records, level, onPath, onBack, footer = false }: {
  mode: Mode; path: Crumb[]; records: boolean; level: Lvl | null;
  onPath: (path: Crumb[]) => void; onBack: () => void; footer?: boolean;
}) {
  const root = mode === 'cat' ? 'Categories' : mode === 'design' ? 'Designs' : 'Sheds';
  const separator = <Text accessible={false} style={{ color: C.mut }}>›</Text>;
  return <View testID={footer ? 'conversion-breadcrumb-bottom' : 'conversion-breadcrumb-top'}
    style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6,
      paddingVertical: 8, marginBottom: footer ? 10 : 8, backgroundColor: '#F5F2EE',
      ...(footer ? { borderTopWidth: 1, borderColor: C.border } : Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 40 } : {}) }}>
    <TouchableOpacity accessibilityRole="button" accessibilityHint="Return to the Conversion overview" onPress={() => onPath([])}>
      <Text style={{ fontSize: 11.5, fontWeight: '800', color: path.length || records ? C.prod : C.ink }}>Conversion</Text>
    </TouchableOpacity>
    {separator}
    <TouchableOpacity accessibilityRole="button" accessibilityHint="Return to this view's first level" onPress={() => onPath([])}>
      <Text style={{ fontSize: 11.5, fontWeight: '800', color: path.length || records ? C.prod : C.ink }}>{root}</Text>
    </TouchableOpacity>
    {path.map((item, index) => <React.Fragment key={item.k + '|' + item.v}>
      {separator}
      <TouchableOpacity accessibilityRole="button" accessibilityHint={`Return to ${CLBL[item.k]} ${item.label}`}
        accessibilityState={{ selected: index === path.length - 1 && !records }} onPress={() => onPath(path.slice(0, index + 1))}>
        <Text style={{ fontSize: 11.5, fontWeight: '800', color: index === path.length - 1 && !records ? C.ink : C.prod }}>{item.label}</Text>
      </TouchableOpacity>
    </React.Fragment>)}
    {(records || path.length > 0) && <>{separator}<Text style={{ fontSize: 10, color: C.mut }}>{records ? 'Records' : level ? plur(CLBL[level]) : 'Rolls'}</Text></>}
    {(path.length > 0 || records) && <TouchableOpacity accessibilityRole="button" onPress={onBack} style={{ marginLeft: 'auto', paddingHorizontal: 4, paddingVertical: 3 }}>
      <Text style={{ color: C.prod, fontWeight: '800', fontSize: 11 }}>‹ back</Text>
    </TouchableOpacity>}
  </View>;
}

function Screen({ API, token, prptype }: { API: string; token: string; prptype?: string }) {
  const { width: windowWidth } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const width = contentWidth || windowWidth;
  const compact = width < 560, xs = width < 440, wide = width >= 900;
  const today = ds(new Date());
  const [preset, setPreset] = useState<Preset>('today');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [mode, setMode] = useState<Mode>('shed');
  const [cPath, setCPath] = useState<Crumb[]>([]);
  const [recs, setRecs] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current++; }, []);

  const range: [string, string] = preset === 'today' ? [today, today] : preset === 'yday' ? [addDays(today, -1), addDays(today, -1)]
    : preset === '7d' ? [addDays(today, -6), today] : preset === 'month' ? [today.slice(0, 8) + '01', today] : [from, to];
  const validRange = /^\d{4}-\d{2}-\d{2}$/.test(range[0]) && /^\d{4}-\d{2}-\d{2}$/.test(range[1]) && range[0] <= range[1];
  const multiDay = range[0] !== range[1];
  const screenRef = useRef<any>(null);
  const revealNavigation = () => {
    if (Platform.OS === 'web') requestAnimationFrame(() => screenRef.current?.scrollIntoView?.({ block: 'start', behavior: 'auto' }));
  };
  const goCPath = (p: Crumb[]) => { setCPath(p); setRecs(false); setShown(PAGE); revealNavigation(); };
  const openRecords = () => { setRecs(true); setShown(PAGE); revealNavigation(); };
  const goBack = () => { if (recs) { setRecs(false); setShown(PAGE); revealNavigation(); } else goCPath(cPath.slice(0, -1)); };

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setData(null); setError(''); setLoading(false);
    if (!prptype) { setError('Select a property group to load Conversion.'); return; }
    if (!validRange) { setError('Invalid date range.'); return; }
    const months: string[] = [];
    for (let ym = range[0].slice(0, 7); ym <= range[1].slice(0, 7);) {
      months.push(ym);
      const y = +ym.slice(0, 4), m = +ym.slice(5, 7);
      ym = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    }
    setLoading(true); setError('');
    try {
      const res: any[] = [];
      // Bound concurrent monthly reads without silently truncating long ranges.
      for (let offset = 0; offset < months.length; offset += 4) {
        if (id !== requestId.current) return;
        res.push(...await Promise.all(months.slice(offset, offset + 4).map(month => {
        const y = +month.slice(0, 4), m = +month.slice(5, 7);
        const mf = month + '-01', mt = addDays(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`, -1);
        return axios.get(`${API}/api/owner/weaving-conversion`, {
          params: { month, yearno: y - 1999 - (m < 4 ? 1 : 0), prptype, from: range[0] > mf ? range[0] : mf, to: range[1] < mt ? range[1] : mt },
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        })));
      }
      if (id !== requestId.current) return;
      const merged: Payload = { rows: [], designs: {}, machines: {}, rates: {} };
      for (const r of res) {
        if (!r.data?.success || !r.data?.response) throw new Error(r.data?.message || 'Unable to load Conversion.');
        const p: Payload = r.data.response;
        merged.rows.push(...(p.rows || []));
        Object.assign(merged.designs, p.designs || {}); Object.assign(merged.machines, p.machines || {}); Object.assign(merged.rates, p.rates || {});
      }
      setData(merged);
    } catch (e: any) {
      if (id !== requestId.current) return;
      setData(null); setError(e?.response?.data?.message || e?.message || 'Unable to load Conversion.');
    } finally { if (id === requestId.current) setLoading(false); }
  }, [API, token, prptype, range[0], range[1], validRange]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { ensureConversionWebFonts(); }, []);

  const rows: E[] = useMemo(() => (data?.rows || []).map((r, i) => {
    const dkey = r.p + '|' + r.ds, di = data!.designs[dkey], mi = r.mc ? data!.machines[r.mc] : undefined;
    const pr = data!.rates[r.rk] || { rate: null, qty: 0, parts: [], src: 'no rate', no_po: true, pool_month: null, status: 'rate_missing' };
    return { id: String(i), date: r.d, dkey, design: di?.code || `Design ${r.ds}`, cat: di?.cat?.trim() || 'Category not mapped', shed: shedOf(mi?.shed), loom: mi?.loom || '—', beamId: r.bm || '—', roll: r.rl, m: +r.m || 0, ppi: r.ppi, rate: pr.rate, conv: r.c, pr, mkey: r.mc || '—', width: typeof mi?.width_cm === 'number' && Number.isFinite(mi.width_cm) && mi.width_cm > 0 ? mi.width_cm : null };
  }), [data]);

  const keyOf = (r: E, k: Lvl) => (k === 'design' ? r.design.trim().replace(/\s+/g, ' ').toLocaleLowerCase() : k === 'cat' ? r.cat.trim().replace(/\s+/g, ' ').toLocaleLowerCase() : k === 'day' ? r.date : k === 'loom' ? r.mkey : String(r[k]));
  const labelOf = (r: E, k: Lvl) => (k === 'design' ? r.design : k === 'cat' ? r.cat : k === 'day' ? fmtD(r.date) : k === 'loom' ? r.loom : String(r[k]));
  const scoped = useMemo(() => rows.filter(r => cPath.every(p => keyOf(r, p.k) === p.v)), [rows, cPath]);
  const TT = agg(scoped);
  const CLV: Lvl[] = mode === 'cat' ? ['cat', 'design', ...(multiDay ? ['day' as Lvl] : []), 'loom', 'beamId'] : mode === 'design' ? ['design', ...(multiDay ? ['day' as Lvl] : []), 'loom', 'beamId'] : ['shed', 'loom'];
  const lvl: Lvl | null = recs ? null : CLV[cPath.length] || null;
  const groups: G[] = useMemo(() => {
    if (!lvl) return [];
    const g: Record<string, { k: string; label: string; list: E[] }> = {};
    scoped.forEach(r => { const k = keyOf(r, lvl); (g[k] || (g[k] = { k, label: labelOf(r, lvl), list: [] })).list.push(r); });
    const out = Object.values(g).map(x => ({ ...x, ...agg(x.list), designs: [...new Set(x.list.map(r => r.design))], looms: [...new Set(x.list.map(r => r.loom).filter(loom => loom !== '—'))] }));
    if (lvl === 'shed') return out.sort((a, b) => (SHED_LIST.findIndex(s => s.lbl === a.k) + 1 || 99) - (SHED_LIST.findIndex(s => s.lbl === b.k) + 1 || 99));
    if (lvl === 'loom') return out.sort((a, b) => natural(a.label, b.label));
    if (lvl === 'day') return out.sort((a, b) => a.k.localeCompare(b.k));
    return out.sort((a, b) => b.conv - a.conv);
  }, [scoped, lvl]);
  const otherSheds = lvl === 'shed' ? groups.filter(g => !SHED_LIST.some(s => s.lbl === g.k)) : [];
  const rankC = groups.slice().sort((a, b) => b.conv - a.conv);
  const rkOf = (g: G) => rankC.indexOf(g);
  const cur = cPath[cPath.length - 1];
  const title = cur ? cur.label : 'Weaving conversion';
  const sub = (cur ? (lvl ? CLBL[lvl] + '-wise · ' : 'Roll-wise · ') + cPath.map(p => p.label).join(' › ') + ' · '
    : (mode === 'cat' ? 'Item category-wise · production and conversion for each category · ' : mode === 'design' ? 'Design-wise · production and conversion for each design · ' : 'Shed-wise · production and conversion for each shed · ') + (recs ? 'roll-wise records · ' : ''))
    + fmtD(range[0]) + (range[1] !== range[0] ? ' – ' + fmtD(range[1]) : '') + ' · checking entries only';
  const srcNote = useMemo(() => {
    const seen: Record<string, { key: string; design: string; month: string; pr: Rate; ppi: number | null; m: number }> = {};
    scoped.forEach(r => { const k = r.dkey + '|' + r.date.slice(0, 7); if (!seen[k]) seen[k] = { key: k, design: r.design, month: r.date.slice(0, 7), pr: r.pr, ppi: r.ppi, m: 0 }; seen[k].m += r.m; });
    return Object.values(seen).sort((a, b) => b.m - a.m);
  }, [scoped]);

  const val = (a: Agg, f: (a: Agg) => string) => (a.any ? f(a) : '—');
  const shedColumns = compact ? 1 : Math.max(1, Math.min(5, Math.floor((width + 10) / 240)));
  const shedCardWidth = (width - 10 * (shedColumns - 1)) / shedColumns;
  const W = compact ? { rank: 18, c: 78 } : { rank: 22, m: 76, ppi: 44, rate: 62, c: 84 };
  const mono = { fontFamily: CONVERSION_MONO, fontVariant: ['tabular-nums'] as any };
  const Head = ({ first }: { first: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: C.border }}>
      <View style={{ width: W.rank }} />
      <Text style={{ flex: 1, fontSize: 9.5, fontWeight: '800', color: C.mut, textTransform: 'uppercase' }}>{first}</Text>
      {!compact && <>
        <Text style={{ width: (W as any).m, textAlign: 'right', fontSize: 9.5, fontWeight: '800', color: C.mut }}>METRES</Text>
        <Text style={{ width: (W as any).ppi, textAlign: 'right', fontSize: 9.5, fontWeight: '800', color: C.mut }}>PPI</Text>
        <Text style={{ width: (W as any).rate, textAlign: 'right', fontSize: 9.5, fontWeight: '800', color: C.mut }}>₹/PICK</Text>
      </>}
      <Text style={{ width: W.c, textAlign: 'right', fontSize: 9.5, fontWeight: '800', color: C.mut }}>CONVERSION</Text>
    </View>
  );
  const numberFont = (text: string, available: number) => Math.min(12, Math.max(9, available / (Math.max(1, text.length) * 0.62)));
  const Cells = ({ g, bold }: { g: Agg; bold?: boolean }) => <>
    {!compact && <>
      <Text style={{ width: (W as any).m, textAlign: 'right', fontSize: numberFont(fmt(g.m), (W as any).m), fontWeight: bold ? '800' : '700', color: C.ink, ...mono }}>{fmt(g.m)}</Text>
      <Text style={{ width: (W as any).ppi, textAlign: 'right', fontSize: 11, fontWeight: bold ? '800' : '400', color: C.ink, ...mono }}>{g.ppi ? g.ppi.toFixed(1) : '—'}</Text>
      <Text style={{ width: (W as any).rate, textAlign: 'right', fontSize: 11, fontWeight: bold ? '800' : '400', color: C.ink, ...mono }}>{val(g, a => a.rate.toFixed(3))}</Text>
    </>}
    <Text style={{ width: W.c, textAlign: 'right', fontSize: numberFont(val(g, a => R(a.conv)), W.c), fontWeight: '800', color: C.prod, ...mono }}>{val(g, a => R(a.conv))}</Text>
  </>;
  const subM = (g: Agg) => `${fmt(g.m)} m · PPI ${g.ppi ? g.ppi.toFixed(1) : '—'} · ${val(g, a => '₹' + a.rate.toFixed(3) + '/pick · ₹' + a.perM.toFixed(2) + '/m')}`;
  const barDetail = (g: G) => `${g.label} · ${M(g.m)} · ${g.n} roll${g.n !== 1 ? 's' : ''} · PPI ${g.ppi ? g.ppi.toFixed(1) : '—'} · ${val(g, a => R(a.conv))} conversion · ${TT.conv ? (g.conv / TT.conv * 100).toFixed(1) : '0.0'}% of conversion · ${val(g, a => R4(a.rate) + '/pick · ₹' + a.perM.toFixed(2) + '/m')}${g.nc ? ' · ' + M(g.ncM) + ' awaiting conversion' : ''}`;
  const flags = (g: Agg) => <>
    {g.noPO > 0 && <Chip t="NO PO" c={C.amber} />}
    {g.nc > 0 && <Chip t={ncLabel(g)} c={C.amber} />}
  </>;
  const Stat = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <View style={{ flexGrow: 1, flexBasis: wide ? 0 : xs ? '47%' : '23%', minWidth: 0, backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
      <Text style={{ fontSize: 8.5, fontWeight: '800', color: C.mut, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color, marginTop: 3, ...mono }}>{value}</Text>
    </View>
  );
  const stats = <>
    <Stat label="Conversion" value={val(TT, a => R(a.conv))} color={C.prod} />
    <Stat label="Metres" value={M(TT.m)} color={C.bill} />
    <Stat label="₹ / metre" value={val(TT, a => '₹' + a.perM.toFixed(2))} color={C.owner} />
    <Stat label="Pick rate · wtd" value={val(TT, a => '₹' + a.rate.toFixed(3))} color={C.exec} />
  </>;
  const TotRow = ({ items }: { items: { label: string; value: string; color?: string }[] }) => (
    <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4, paddingBottom: 8 }}>{items.map(x => (
      <View key={x.label} style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 8.5, fontWeight: '800', color: C.mut, textTransform: 'uppercase' }}>{x.label}</Text>
        <Text style={{ fontSize: numberFont(x.value, (shedCardWidth - 44) / 3), fontWeight: '700', marginTop: 1, color: x.color || C.ink, ...mono }}>{x.value}</Text>
      </View>))}</View>
  );
  const option = (label: string, on: boolean, fn: () => void) => (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: on }} key={label} onPress={fn} style={{ borderWidth: 1.5, borderColor: on ? C.prod : C.border, backgroundColor: on ? '#65288014' : C.paper, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ fontSize: 10.5, fontWeight: '800', color: on ? C.prod : C.ink }}>{label}</Text>
    </TouchableOpacity>
  );

  const shedLevel = () => {
    const gOf = (lbl: string) => groups.find(x => x.k === lbl);
    return <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        {SHED_LIST.map(gr => {
          const g = gOf(gr.lbl); const a = g || agg([]);
          return (
            <TouchableOpacity key={gr.k} disabled={!g} onPress={() => g && goCPath([{ k: 'shed', v: gr.lbl, label: gr.lbl }])}
              style={{ ...card, overflow: 'hidden', width: shedCardWidth, minWidth: 0, opacity: g ? 1 : 0.6 }}>
              <View style={{ backgroundColor: gr.color, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12 }}>🏭</Text>
                <Text style={{ flex: 1, minWidth: 0, color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.1 }}>{gr.lbl} · {gr.n} mc</Text>
                <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '800', ...mono }}>{val(a, x => R(x.conv))}</Text>
              </View>
              <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 }}>
                <Text style={{ fontSize: 9.5, color: C.mut, marginBottom: 4 }}>{gr.rng} · {g ? g.looms.length : 0} of {gr.n} machines ran · {a.n} roll{a.n !== 1 ? 's' : ''}</Text>
                <TotRow items={[{ label: 'Production', value: M(a.m), color: gr.color }, { label: '₹ / m', value: val(a, x => '₹' + x.perM.toFixed(2)) }, { label: 'Pick rate', value: val(a, x => '₹' + x.rate.toFixed(3)) }]} />
                <Text style={{ fontSize: 9.5, color: C.mut, marginTop: 4 }}>{a.m ? 'avg PPI ' + (a.ppi ? a.ppi.toFixed(1) : '—') + ' · tap for machines' : 'nothing checked here in this period'}</Text>
                {(a.noPO > 0 || a.nc > 0) && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>{flags(a)}</View>}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ ...card, overflow: 'hidden', width: shedCardWidth, minWidth: 0, borderWidth: 1.5, borderColor: C.ink }}>
          <View style={{ backgroundColor: C.ink, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#fff', fontSize: 12 }}>Σ</Text>
            <Text style={{ flex: 1, color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.1 }}>Grand total</Text>
            <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '800', ...mono }}>{val(TT, x => R(x.conv))}</Text>
          </View>
          <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 }}>
            <TotRow items={[{ label: 'Production', value: M(TT.m) }, { label: '₹ / m', value: val(TT, x => '₹' + x.perM.toFixed(2)) }, { label: 'Pick rate', value: val(TT, x => '₹' + x.rate.toFixed(3)) }]} />
            <Text style={{ fontSize: 9.5, color: C.mut, marginTop: 4 }}>{TT.n} roll{TT.n !== 1 ? 's' : ''} across {groups.filter(g => g.n && SHED_LIST.some(s => s.lbl === g.k)).length} sheds{otherSheds.length > 0 ? ' · ' + otherSheds.reduce((n, g) => n + g.n, 0) + ' rolls without a mapped shed' : ''} · {FLEET} machines · whole selected period</Text>
          </View>
        </View>
      </View>
      <View style={{ ...card, paddingHorizontal: compact ? 8 : 12, paddingVertical: compact ? 8 : 10, marginBottom: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>Shed-wise conversion</Text>
        <Text style={{ fontSize: 9.5, color: C.mut, marginBottom: 4 }}>Production and conversion ₹ for each shed · every roll converted at its own design’s pick rate</Text>
        <Head first="Shed" />
        {SHED_LIST.map(gr => {
          const g = gOf(gr.lbl);
          if (!g) return (
            <View key={gr.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: C.hair, opacity: 0.6 }}>
              <View style={{ width: W.rank }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><Text style={{ fontWeight: '700', fontSize: 12, color: C.ink }}>{gr.lbl}</Text><Chip t={`0 / ${gr.n} machines`} c={gr.color} /></View>
                <Text style={{ fontSize: 9.5, color: C.mut }}>{gr.rng} · nothing checked here in this period</Text>
              </View>
              <Text style={{ color: C.faint, fontSize: 11 }}>—</Text>
            </View>
          );
          return (
            <TouchableOpacity key={gr.k} onPress={() => goCPath([{ k: 'shed', v: g.k, label: g.k }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: C.hair }}>
              <Rank i={rkOf(g)} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><Text style={{ fontWeight: '700', fontSize: 12, color: C.ink }}>{g.k}</Text><Chip t={`${g.looms.length} / ${gr.n} machines`} c={gr.color} />{flags(g)}</View>
                <Text style={{ fontSize: 9.5, color: C.mut }}>{gr.rng}</Text>
                <Bar pct={TT.conv ? (g.conv / TT.conv) * 100 : 0} color={gr.color} detail={barDetail(g)} />
                <Text style={{ fontSize: 9.5, color: C.mut }}>{compact ? subM(g) : `${g.n} roll${g.n !== 1 ? 's' : ''} · ${val(g, a => '₹' + a.perM.toFixed(2) + '/m')} · tap for machines`}</Text>
              </View>
              <Cells g={g} />
            </TouchableOpacity>
          );
        })}
        {otherSheds.map(g => <TouchableOpacity key={g.k} onPress={() => goCPath([{ k: 'shed', v: g.k, label: g.label }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: C.hair }}>
          <Rank i={rkOf(g)} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>{g.label}</Text>
            <Bar pct={TT.conv ? g.conv / TT.conv * 100 : 0} color={C.mut} detail={barDetail(g)} />
            <Text style={{ fontSize: 9.5, color: C.mut }}>{compact ? subM(g) : `${g.n} roll${g.n !== 1 ? 's' : ''} · ${val(g, a => '₹' + a.perM.toFixed(2) + '/m')} · tap for machines`}</Text>
          </View>
          <Cells g={g} />
        </TouchableOpacity>)}
        {groups.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6 }}>
            <View style={{ width: W.rank }} />
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: C.ink }}>Grand total</Text>{compact && <Text style={{ fontSize: 9.5, color: C.mut }}>{subM(TT)}</Text>}</View>
            <Cells g={TT} bold />
          </View>
        )}
        {groups.length === 0 && <Text style={{ padding: 14, textAlign: 'center', color: C.mut, fontSize: 12 }}>No checking entries in this period.</Text>}
      </View>
    </>;
  };

  const levelTable = (l: Lvl) => (
    <View style={{ ...card, paddingHorizontal: compact ? 8 : 12, paddingVertical: compact ? 8 : 10, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>{CLBL[l]}-wise conversion · {cur ? cur.label : 'all'}</Text>
        <Text style={{ fontSize: 9.5, color: C.mut }}>tap a row → {CLV[cPath.length + 1] ? plur(CLBL[CLV[cPath.length + 1]]).toLowerCase() : 'rolls'}</Text>
        {scoped.length > 0 && <TouchableOpacity onPress={openRecords} style={{ marginLeft: 'auto' }}><Text style={{ fontSize: 10, fontWeight: '800', color: C.prod }}>{scoped.length} records ›</Text></TouchableOpacity>}
      </View>
      <Head first={CLBL[l]} />
      {groups.map(g => (
        <TouchableOpacity key={g.k} onPress={() => goCPath([...cPath, { k: l, v: g.k, label: g.label }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: C.hair }}>
          <Rank i={rkOf(g)} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontWeight: '700', fontSize: 12, color: C.ink, ...(l === 'loom' || l === 'beamId' ? mono : {}) }}>{g.label}</Text>
              {l === 'loom' && mode !== 'shed' && <Chip t={g.list[0].shed} c={SHED_LIST.find(s => s.lbl === g.list[0].shed)?.color || C.mut} />}
              {l === 'loom' && g.list[0].width != null && <Chip t={`${g.list[0].width} cm`} c={C.faint} />}
              {l === 'design' && <Chip t={g.list[0].cat} c={C.owner} />}
              {l === 'beamId' && <Chip t={g.list[0].loom} c={C.faint} />}
              {flags(g)}
            </View>
            <Bar pct={TT.conv ? (g.conv / TT.conv) * 100 : 0} color={(cur && SHED_LIST.find(s => s.lbl === cur.v)?.color) || C.prod} detail={barDetail(g)} />
            <Text numberOfLines={compact ? 3 : 1} style={{ fontSize: 9.5, color: C.mut }}>
              {compact ? subM(g) + '\n' : ''}
              {l === 'cat' ? `${g.designs.length} design${g.designs.length !== 1 ? 's' : ''} · ${g.looms.length} machine${g.looms.length !== 1 ? 's' : ''}`
                : l === 'design' || l === 'day' ? `${g.looms.length} machine${g.looms.length !== 1 ? 's' : ''}${l === 'day' ? ' · ' + g.designs.join(' · ') : ''}`
                : g.designs.join(' · ')}
              {` · ${g.n} roll${g.n !== 1 ? 's' : ''}`}{compact ? '' : ` · ${val(g, a => '₹' + a.perM.toFixed(2) + '/m')}`}
            </Text>
          </View>
          <Cells g={g} />
        </TouchableOpacity>
      ))}
      {groups.length === 0 && <Text style={{ padding: 14, textAlign: 'center', color: C.mut, fontSize: 12 }}>No checking entries in this period here.</Text>}
      {groups.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6 }}>
          <View style={{ width: W.rank }} />
          <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: C.ink }}>Total · {cur ? cur.label : 'all'}</Text>{compact && <Text style={{ fontSize: 9.5, color: C.mut }}>{subM(TT)}</Text>}</View>
          <Cells g={TT} bold />
        </View>
      )}
      <Text style={{ fontSize: 9, color: C.mut, marginTop: 6 }}>PPI and pick rate per row are metre-weighted across the rolls in it; tap a row to go one level deeper, or open the records for the roll-wise working.</Text>
    </View>
  );

  const rollTable = () => {
    const list = scoped.slice().sort((a, b) => b.date.localeCompare(a.date) || natural(b.roll || '', a.roll || ''));
    const RW = compact ? { c: 78 } : { ppi: 40, m: 64, rate: 56, c: 84 };
    return (
      <View style={{ ...card, paddingHorizontal: compact ? 8 : 12, paddingVertical: compact ? 8 : 10, marginBottom: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink, marginBottom: 2 }}>Roll-wise conversion · {cur ? cur.label : 'all'}</Text>
        <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 6, borderBottomWidth: 1, borderColor: C.border }}>
          <Text style={{ flex: 1, fontSize: 9.5, fontWeight: '800', color: C.mut }}>ROLL · DATE · DESIGN · BEAM · MACHINE</Text>
          {!compact && <>
            <Text style={{ width: (RW as any).ppi, textAlign: 'right', fontSize: 9.5, fontWeight: '800', color: C.mut }}>PPI</Text>
            <Text style={{ width: (RW as any).m, textAlign: 'right', fontSize: 9.5, fontWeight: '800', color: C.mut }}>METRES</Text>
            <Text style={{ width: (RW as any).rate, textAlign: 'right', fontSize: 9.5, fontWeight: '800', color: C.mut }}>₹/PICK</Text>
          </>}
          <Text style={{ width: RW.c, textAlign: 'right', fontSize: 9.5, fontWeight: '800', color: C.mut }}>CONVERSION</Text>
        </View>
        {list.slice(0, shown).map(r => (
          <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, borderBottomWidth: 1, borderColor: C.hair }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.ink, ...mono }}>{r.roll ?? '—'}</Text>
                <Text style={{ fontSize: 10, color: C.mut, ...mono }}>{fmtD(r.date)}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.ink }}>{r.design}</Text>
                {r.conv != null && r.pr.no_po && <Chip t="NO PO" c={C.amber} />}
                {r.ppi == null && <Chip t="NO TABLE PPI" c={C.amber} />}
                {r.ppi != null && r.rate == null && <Chip t="NO PICK RATE" c={C.amber} />}
              </View>
              <Text style={{ fontSize: 9.5, color: C.mut, ...mono }}><Text style={{ fontWeight: '800', ...mono }}>{r.beamId}</Text> · {r.loom} · {r.shed}</Text>
              <Text style={{ fontSize: 9, color: C.faint, ...mono }}>{r.ppi ?? '—'} × {fmt(r.m)} × {r.rate != null ? r.rate.toFixed(4) : '—'} · {r.pr.src}</Text>
            </View>
            {!compact && <>
              <Text style={{ width: (RW as any).ppi, textAlign: 'right', fontSize: 11, color: C.ink, ...mono }}>{r.ppi ?? '—'}</Text>
              <Text style={{ width: (RW as any).m, textAlign: 'right', fontSize: 12, fontWeight: '700', color: C.ink, ...mono }}>{fmt(r.m)}</Text>
              <Text style={{ width: (RW as any).rate, textAlign: 'right', fontSize: 11, color: C.ink, ...mono }}>{r.rate != null ? r.rate.toFixed(4) : '—'}</Text>
            </>}
            <Text style={{ width: RW.c, textAlign: 'right', fontSize: 12, fontWeight: '800', color: C.prod, ...mono }}>{r.conv != null ? R(r.conv) : '—'}</Text>
          </View>
        ))}
        {list.length === 0 && <Text style={{ padding: 14, textAlign: 'center', color: C.mut, fontSize: 12 }}>No checking entries in this period here.</Text>}
        {list.length > shown && <TouchableOpacity onPress={() => setShown(shown + PAGE)} style={{ paddingVertical: 10, alignItems: 'center' }}><Text style={{ fontSize: 11, fontWeight: '800', color: C.prod }}>Show {Math.min(PAGE, list.length - shown)} more of {list.length - shown} ›</Text></TouchableOpacity>}
        {list.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: C.ink }}>Total · {list.length} roll{list.length !== 1 ? 's' : ''}</Text>
              {compact && <Text style={{ fontSize: 9.5, color: C.mut, ...mono }}>PPI {TT.ppi ? TT.ppi.toFixed(1) : '—'} · {fmt(TT.m)} m · {val(TT, a => '₹' + a.rate.toFixed(4) + '/pick')}</Text>}
            </View>
            {!compact && <>
              <Text style={{ width: (RW as any).ppi, textAlign: 'right', fontWeight: '800', color: C.ink, ...mono }}>{TT.ppi ? TT.ppi.toFixed(1) : '—'}</Text>
              <Text style={{ width: (RW as any).m, textAlign: 'right', fontWeight: '800', color: C.ink, ...mono }}>{fmt(TT.m)}</Text>
              <Text style={{ width: (RW as any).rate, textAlign: 'right', fontWeight: '800', color: C.ink, ...mono }}>{val(TT, a => a.rate.toFixed(4))}</Text>
            </>}
            <Text style={{ width: RW.c, textAlign: 'right', fontWeight: '800', color: C.prod, ...mono }}>{val(TT, a => R(a.conv))}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View ref={screenRef} onLayout={e => { const w = Math.round(e.nativeEvent.layout.width); if (w > 0) setContentWidth(w); }} style={{ minWidth: 0, paddingBottom: 20 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center', marginBottom: 10 }}>
        {([['today', 'Today'], ['yday', 'Yesterday'], ['7d', compact ? '7 days' : 'Last 7 days'], ['month', compact ? 'Month' : 'This month'], ['custom', 'Date Selection']] as const).map(([id, label]) => option(label, preset === id, () => { if (id === 'custom' && preset !== 'custom') { setFrom(range[0]); setTo(range[1]); } setPreset(id); setPicking(null); goCPath([]); }))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: compact ? 0 : 'auto', borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 3, backgroundColor: C.paper }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: C.mut, marginHorizontal: 5 }}>VIEW BY</Text>
          {([['shed', 'Shed'], ['cat', 'Category'], ['design', 'Design']] as const).map(([id, label]) => (
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: mode === id }} key={id} onPress={() => { setPicking(null); setMode(id); goCPath([]); }} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: mode === id ? C.prod : 'transparent' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: mode === id ? '#fff' : C.mut }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {preset === 'custom' && (
        <View style={{ marginBottom: 10, zIndex: picking ? 100 : 1, elevation: picking ? 15 : 0 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {(['from', 'to'] as const).map((k, i) => (
              <React.Fragment key={k}>
                {i === 1 && <Text style={{ color: C.mut }}>→</Text>}
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={k === 'from' ? 'From date' : 'To date'} onPress={() => setPicking(picking === k ? null : k)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.paper, borderWidth: 1, borderColor: picking === k ? C.prod : C.border, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9 }}>
                  <Text style={{ fontSize: 14 }}>📅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: '800', color: C.mut, textTransform: 'uppercase' }}>{k === 'from' ? 'From' : 'To'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>{fmtD(k === 'from' ? from : to)}</Text>
                  </View>
                  <Text style={{ color: C.mut, fontSize: 11 }}>{picking === k ? '▴' : '▾'}</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
          {picking && (
            <View style={{ position: 'absolute', top: 48, left: picking === 'to' && !compact ? undefined : 0, right: picking === 'to' && !compact ? 0 : undefined, zIndex: 101, elevation: 16, backgroundColor: C.paper, borderRadius: 11, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } }}>
              <Calendar key={picking} value={picking === 'from' ? from : to} min={picking === 'to' ? from : undefined} max={today}
                onPick={d => { if (picking === 'from') { setFrom(d); if (d > to) setTo(d); setPicking(null); } else { setTo(d); setPicking(null); } goCPath([]); }} />
            </View>
          )}
        </View>
      )}
      {loading && <ActivityIndicator color={C.prod} style={{ marginVertical: 12 }} />}
      {!!error && (
        <View style={{ backgroundColor: '#FFF3F1', borderWidth: 1, borderColor: '#E8BDB6', padding: 12, borderRadius: 9, marginBottom: 10 }}>
          <Text style={{ color: '#9D2828' }}>{error}</Text>
          <TouchableOpacity onPress={load}><Text style={{ color: C.prod, fontWeight: '800', marginTop: 8 }}>Retry</Text></TouchableOpacity>
        </View>
      )}
      {data && <>
        <ConversionBreadcrumbs mode={mode} path={cPath} records={recs} level={lvl} onPath={goCPath} onBack={goBack} />
        <View style={{ ...card, paddingHorizontal: compact ? 12 : 14, paddingVertical: compact ? 10 : 12, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: compact ? 38 : 44, height: compact ? 38 : 44, borderRadius: 11, backgroundColor: '#65288018', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: compact ? 19 : 22, color: C.prod }}>{cur ? cPath.length <= 2 ? '🏭' : '⚙️' : '₹'}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: compact ? 15 : 16, fontWeight: '700', color: C.ink }}>{title}</Text>
              <Text style={{ fontSize: 10.5, color: C.mut, marginTop: 2 }}>{sub}</Text>
            </View>
            {wide && <View style={{ width: Math.min(620, Math.max(416, width - 352)), flexShrink: 1, flexDirection: 'row', gap: 6 }}>{stats}</View>}
            <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#65288014', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: C.prod, ...mono }}>{TT.ppi ? TT.ppi.toFixed(1) : '—'}</Text>
              <Text style={{ fontSize: 8, color: C.mut, textTransform: 'uppercase', letterSpacing: 0.4 }}>avg PPI</Text>
            </View>
          </View>
          {!wide && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{stats}</View>}
          <Text style={{ fontSize: 9.5, color: C.mut, marginTop: 7, lineHeight: 15 }}>
            Conversion = table PPI × checked metres × the design’s <Text style={{ fontWeight: '800' }}>pool</Text> pick rate for the month the roll was checked (Σ PO qty × PO pick rate ÷ Σ PO qty). No loom or Datalog figures — checking entries only.
            {TT.noPO > 0 && <Text style={{ color: C.amber, fontWeight: '700' }}> {TT.noPO} roll{TT.noPO !== 1 ? 's' : ''} of a design with no PO in the pool — converted at the rate shown below and marked NO PO.</Text>}
            {TT.nc > 0 && <Text style={{ color: C.amber, fontWeight: '700' }}> {TT.nc} roll{TT.nc !== 1 ? 's' : ''} ({M(TT.ncM)}) await PPI or pick rate. Their metres are included; conversion is unavailable.</Text>}
          </Text>
        </View>

        {lvl === 'shed' && shedLevel()}
        {lvl && lvl !== 'shed' && levelTable(lvl)}
        {lvl === null && rollTable()}
        {(cPath.length > 0 || recs) && <ConversionBreadcrumbs footer mode={mode} path={cPath} records={recs} level={lvl} onPath={goCPath} onBack={goBack} />}

        {srcNote.length > 0 && (
          <View style={{ ...card, paddingHorizontal: compact ? 10 : 12, paddingVertical: compact ? 8 : 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink, marginBottom: 4 }}>Pick rates in use · from the Production Orders in each pool</Text>
            {srcNote.slice(0, 8).map(x => (
              <View key={x.key} style={{ paddingVertical: 5, borderBottomWidth: 1, borderColor: C.hair }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>{x.design}</Text>
                  <Text style={{ fontSize: 9.5, color: C.mut }}>{monthLbl(x.month)} · {fmt(x.m)} m checked · PPI {x.ppi ?? '—'}</Text>
                  <Text style={{ marginLeft: 'auto', fontSize: 12, fontWeight: '800', color: x.pr.no_po || x.pr.rate == null ? C.amber : C.prod, ...mono }}>{x.pr.rate != null ? R4(x.pr.rate) + '/pick' : 'no rate'}</Text>
                </View>
                <Text style={{ fontSize: 9.5, color: C.mut, marginTop: 2, ...mono }}>
                  {x.pr.parts.length
                    ? x.pr.parts.map(p => `${p.po} ${fmt(p.qty)} m × ${p.rate != null ? '₹' + p.rate.toFixed(2) : 'no rate'}`).join(' + ') + ' ÷ ' + fmt(x.pr.qty) + ' m' + (x.pr.no_po ? ' · ' + x.pr.src : '')
                    : x.pr.src}
                </Text>
              </View>
            ))}
            {srcNote.length > 8 && <Text style={{ fontSize: 9.5, color: C.mut, paddingTop: 4 }}>+{srcNote.length - 8} more design-months</Text>}
          </View>
        )}
      </>}
    </View>
  );
}

export default function OwnerWeavingConversionScreen({ prptype }: { prptype?: string }) {
  return <ErpSessionGate>{s => <Screen API={s.API} token={s.token} prptype={prptype} />}</ErpSessionGate>;
}
