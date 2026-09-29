// FILE: src/components/StockTreeNEW/StockTreeView.tsx
// ONE generic NEW-ERP stock screen used by Fabric Stock and Yarn Stock.
// Everything screen-specific (API endpoint, txntype, qty field, the 4 levels,
// optional Grey/Finish split) comes from a StockConfig.
//
//   ┌ Property [All properties ▾]                          [⟳ Refresh] ┐
//   │ [ GREY STOCK 12,345.000 ] [ FINISH STOCK 6,789.000 ]  (kinds only) │
//   │ TOTAL QTY · <level 1..4 counts>                                     │
//   │ 🔍 search any level   [Qty ↓][Qty ↑][A–Z] [Expand]                  │
//   │ ▸ LEVEL 1 ......................... 4,200.000   34%                │
//   │   ▾ LEVEL 2 ....................... 1,800.000   43%                │
//   │       ▸ LEVEL 3 ...................   900.000   50%                │
//   │           · LEVEL 4 ...............   450.000   50%                │
//   └ TOTAL                                                  12,345.000 ┘
//
// APIs (same as the legacy screens):
//   GET /api/get_criterion        { prptype, txntype: cfg.criterionTxntype, fetch:'prp' }
//   GET /api/<cfg.dataEndpoint>   { prpcodes:[...], prptype, txntype: cfg.txntype }
// prptype is DYNAMIC — the logged-in property group, same as every other NEW
// screen: useBusinessContext().prpGroup, else the stored `user_prptype`.
// Token + host come from ErpSessionGate (screen wrapper).

import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useBusinessContext } from '@/src/core/business';
import SearchableMultiSelectModal from '@/src/components/ui/SearchableMultiSelectModal';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  allIds,
  buildTree,
  countLevels,
  filterTree,
  flatten,
  FlatRow,
  LevelDef,
  qty3,
  qtyShort,
  sortNodes,
  SortMode,
  StockConfig,
  StockRow,
} from './stockTreeModel';

type Props = { token: string; API: string; config: StockConfig };
type Prp = { PrpCode: string; LngName?: string; [k: string]: any };

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" });
const LEVEL_COLOR = [T.nav, T.copper, T.yd, T.green];
const SORTS: { key: SortMode; label: string; icon: any }[] = [
  { key: 'qty_desc', label: 'Qty', icon: 'arrow-downward' },
  { key: 'qty_asc', label: 'Qty', icon: 'arrow-upward' },
  { key: 'name_asc', label: 'A–Z', icon: 'sort-by-alpha' },
];

const nowLabel = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function StockTreeView({ token, API, config }: Props) {
  const { levels, kinds } = config;

  // prptype of the logged-in property (no hard-coded 'S')
  const { prpGroup } = useBusinessContext();
  const [storedPrptype, setStoredPrptype] = useState<string | null>(null);
  useEffect(() => {
    if (prpGroup) return;
    let alive = true;
    AsyncStorage.getItem('user_prptype')
      .then((v: string | null) => { if (alive) setStoredPrptype(String(v || '').trim()); })
      .catch(() => { if (alive) setStoredPrptype(''); });
    return () => { alive = false; };
  }, [prpGroup]);
  const prptype = String(prpGroup || storedPrptype || '').trim();
  // resolved = we know the prptype (or know there is none)
  const prptypeResolved = !!prpGroup || storedPrptype !== null;
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const indent = wide ? 26 : 16;

  // property criterion
  const [prps, setPrps] = useState<Prp[]>([]);
  const [prpLoading, setPrpLoading] = useState(false);
  const [prpError, setPrpError] = useState<string | null>(null);
  const [selectedPrps, setSelectedPrps] = useState<string[]>([]);
  const [prpModal, setPrpModal] = useState(false);

  // stock data
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [loadedPrps, setLoadedPrps] = useState<string[]>([]);

  // view
  const [kind, setKind] = useState<string | null>(kinds?.[0]?.key ?? null);
  const [sort, setSort] = useState<SortMode>('qty_desc');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set()); // search-opened rows the user closed
  const listRef = useRef<FlatList<FlatRow>>(null);

  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }), [token]);

  /* ------------------------------- API ----------------------------------- */

  const loadStock = useCallback(async (codes: string[]) => {
    if (!token || !codes.length || !prptype) return;
    setLoading(true);
    setError(null);
    try {
      const params = { prpcodes: codes, prptype, txntype: config.txntype };
      console.log(`[${config.title}] ${config.dataEndpoint} ->`, params);
      const response = await axios.get(`${API}/api/${config.dataEndpoint}`, { params, headers });
      if (response?.data?.success === true) {
        const data: StockRow[] = response?.data?.response?.data || [];
        setRows(Array.isArray(data) ? data : []);
        setLoadedPrps(codes);
        setLoadedAt(nowLabel());
        setExpanded(new Set());
        setCollapsed(new Set());
      } else {
        setRows([]);
        setError(response?.data?.message || 'No stock data returned.');
      }
    } catch (err: any) {
      setRows([]);
      setError(err?.response?.data?.message || 'Server error — unable to load stock.');
    } finally {
      setLoading(false);
    }
  }, [API, headers, token, prptype, config.txntype, config.dataEndpoint, config.title]);

  const loadProperties = useCallback(async (autoLoad: boolean) => {
    if (!token) return;
    if (!prptype) {
      setPrpError('Property group (prptype) not found for this login — please log in again.');
      return;
    }
    setPrpLoading(true);
    setPrpError(null);
    try {
      const response = await axios.get(`${API}/api/get_criterion`, {
        params: { prptype, txntype: config.criterionTxntype, fetch: 'prp' },
        headers,
      });
      const list: Prp[] = (response?.data?.response?.data || []).filter((p: Prp) => p && p.PrpCode != null);
      setPrps(list);
      if (autoLoad && list.length) {
        // user friendly: open with every property selected and loaded
        const codes = list.map((p) => String(p.PrpCode));
        setSelectedPrps(codes);
        void loadStock(codes);
      }
    } catch (err: any) {
      setPrpError(err?.response?.data?.message || 'Unable to load properties.');
    } finally {
      setPrpLoading(false);
    }
  }, [API, headers, token, prptype, loadStock, config.criterionTxntype]);

  // load once the prptype is known (and again if the property group changes)
  useEffect(() => {
    if (!prptypeResolved) return;
    void loadProperties(true);
  }, [prptypeResolved, loadProperties]);

  /* ------------------------------ derived -------------------------------- */

  // one tree per kind (Grey / Finish), or a single tree
  const trees = useMemo(() => {
    const out: Record<string, ReturnType<typeof buildTree>> = {};
    if (kinds?.length) kinds.forEach((k) => { out[k.key] = buildTree(rows, config, k.match); });
    else out.all = buildTree(rows, config);
    return out;
  }, [rows, kinds, config]);
  const kindDef = kinds?.find((k) => k.key === kind) ?? null;
  const accent = kindDef?.color ?? T.nav;
  const scopeLabel = kindDef ? kindDef.label : config.title.toUpperCase();
  const scopeShort = kindDef ? kindDef.short : config.title.toLowerCase();
  const tree = trees[kind ?? 'all'] ?? { nodes: [], total: 0 };
  const sorted = useMemo(() => sortNodes(tree.nodes, sort), [tree.nodes, sort]);
  const filtered = useMemo(() => filterTree(sorted, query), [sorted, query]);
  const shownTotal = useMemo(() => filtered.nodes.reduce((s, n) => s + n.qty, 0), [filtered.nodes]);
  const counts = useMemo(() => countLevels(filtered.nodes), [filtered.nodes]);
  const effectiveExpanded = useMemo(() => {
    const s = new Set(expanded);
    filtered.expand.forEach((id) => s.add(id));
    collapsed.forEach((id) => s.delete(id));
    return s;
  }, [expanded, filtered.expand, collapsed]);

  // new search -> search decides again what is open
  useEffect(() => { setCollapsed(new Set()); }, [query]);
  const flat = useMemo(() => flatten(filtered.nodes, effectiveExpanded, shownTotal), [filtered.nodes, effectiveExpanded, shownTotal]);
  const allOpen = flat.length > 0 && flat.every((r) => !r.node.children.length || r.open);

  const toggle = (id: string) => {
    const isOpen = effectiveExpanded.has(id);
    setExpanded((cur) => {
      const next = new Set(cur);
      if (isOpen) next.delete(id); else next.add(id);
      return next;
    });
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (isOpen) next.add(id); else next.delete(id);
      return next;
    });
  };

  const switchKind = (k: string) => {
    setKind(k);
    setExpanded(new Set());
    setCollapsed(new Set());
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const prpLabel = useMemo(() => {
    if (!selectedPrps.length) return 'Select property';
    if (prps.length && selectedPrps.length === prps.length) return `All properties (${prps.length})`;
    if (selectedPrps.length === 1) {
      const p = prps.find((x) => String(x.PrpCode) === selectedPrps[0]);
      return p?.LngName || selectedPrps[0];
    }
    return `${selectedPrps.length} properties`;
  }, [selectedPrps, prps]);

  const dirty = selectedPrps.join('|') !== loadedPrps.join('|');

  const onLoad = () => {
    if (!selectedPrps.length) {
      AppAlert.alert('Select at least one property.');
      setPrpModal(true);
      return;
    }
    void loadStock(selectedPrps);
  };

  /* ------------------------------- render -------------------------------- */

  const Header = (
    <View style={st.headWrap}>
      {/* property + load */}
      <View style={st.filterCard}>
        <TouchableOpacity style={st.prpBtn} onPress={() => setPrpModal(true)} activeOpacity={0.75}>
          <Icon name="domain" size={18} color={T.copper} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.prpEyebrow}>PROPERTY</Text>
            <Text style={st.prpValue} numberOfLines={1}>{prpLoading ? 'Loading…' : prpLabel}</Text>
          </View>
          <Icon name="expand-more" size={20} color={T.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.loadBtn, dirty && st.loadBtnDirty, (loading || !selectedPrps.length) && { opacity: 0.6 }]}
          onPress={onLoad}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name={dirty ? 'play-arrow' : 'refresh'} size={18} color="#fff" />}
          <Text style={st.loadText}>{dirty ? 'Load' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>
      {!!prpError && (
        <TouchableOpacity onPress={() => loadProperties(true)} style={st.errBox}>
          <Icon name="error-outline" size={15} color={T.red} />
          <Text style={st.errText}>{prpError} — tap to retry</Text>
        </TouchableOpacity>
      )}
      {!!loadedAt && !loading && (
        <Text style={st.meta}>
          Loaded {loadedAt} · {loadedPrps.length} propert{loadedPrps.length === 1 ? 'y' : 'ies'} · {rows.length.toLocaleString('en-IN')} rows
          {dirty ? ' · property changed — tap Load' : ''}
        </Text>
      )}

      {/* kinds (e.g. Grey / Finish) */}
      {!!kinds?.length && (
        <View style={st.segment}>
          {kinds.map((k) => {
            const on = kind === k.key;
            return (
              <TouchableOpacity
                key={k.key}
                onPress={() => switchKind(k.key)}
                style={[st.segBtn, on && { backgroundColor: k.color, borderColor: k.color }]}
                activeOpacity={0.8}
              >
                <Text style={[st.segLbl, on && { color: 'rgba(255,255,255,0.85)' }]}>{k.label}</Text>
                <Text style={[st.segVal, on && { color: '#fff' }]} numberOfLines={1}>{qty3(trees[k.key]?.total ?? 0)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* KPIs */}
      <View style={st.kpiRow}>
        <Kpi label={query ? 'QTY (SEARCH)' : 'TOTAL QTY'} value={qtyShort(shownTotal)} sub={qty3(shownTotal)} color={accent} />
        {[0, 1, 2, 3].map((lv) => (
          <Kpi key={lv} label={levels[lv].plural.toUpperCase()} value={counts[lv].toLocaleString('en-IN')} color={LEVEL_COLOR[lv]} />
        ))}
      </View>

      {/* search + sort + expand */}
      <View style={st.toolRow}>
        <View style={st.search}>
          <Icon name="search" size={18} color={T.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={config.searchPlaceholder || `Search ${levels.map((l) => l.label.toLowerCase()).join(', ')}…`}
            placeholderTextColor={T.muted}
            style={st.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={HIT}>
              <Icon name="cancel" size={17} color={T.muted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={st.sortRow}>
          {SORTS.map((s) => {
            const on = sort === s.key;
            return (
              <TouchableOpacity key={s.key} onPress={() => setSort(s.key)} style={[st.sortChip, on && st.sortChipOn]}>
                <Text style={[st.sortText, on && { color: '#fff' }]}>{s.label}</Text>
                <Icon name={s.icon} size={13} color={on ? '#fff' : T.muted} />
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => {
              if (allOpen) {
                setExpanded(new Set());
                setCollapsed(new Set(filtered.expand));
              } else {
                setExpanded(allIds(filtered.nodes));
                setCollapsed(new Set());
              }
            }}
            style={st.sortChip}
            disabled={!flat.length}
          >
            <Icon name={allOpen ? 'unfold-less' : 'unfold-more'} size={15} color={T.ink} />
            <Text style={st.sortText}>{allOpen ? 'Collapse' : 'Expand'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* legend / column head */}
      {flat.length > 0 && (
        <View style={st.colHead}>
          <View style={st.legend}>
            {levels.map((l, i) => (
              <View key={l.label} style={st.legendItem}>
                <View style={[st.legendDot, { backgroundColor: LEVEL_COLOR[i] }]} />
                <Text style={st.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
          <Text style={st.colQty}>QTY</Text>
          {wide && <Text style={st.colShare}>SHARE</Text>}
        </View>
      )}
    </View>
  );

  const Empty = loading || prpLoading ? (
    <View style={st.state}><ActivityIndicator color={T.copper} /><Text style={st.stateText}>Loading stock…</Text></View>
  ) : error ? (
    <TouchableOpacity style={st.state} onPress={onLoad}>
      <Icon name="cloud-off" size={30} color={T.red} />
      <Text style={[st.stateText, { color: T.red }]}>{error}</Text>
      <Text style={st.stateLink}>Tap to retry</Text>
    </TouchableOpacity>
  ) : !loadedAt ? (
    <View style={st.state}>
      <Icon name="inventory" size={30} color={T.muted} />
      <Text style={st.stateText}>{config.emptyHint || `Select property and tap Load to see ${config.title.toLowerCase()}.`}</Text>
    </View>
  ) : (
    <View style={st.state}>
      <Icon name="search-off" size={30} color={T.muted} />
      <Text style={st.stateText}>
        {query ? `Nothing matches "${query.trim()}" in ${scopeShort}.` : `No ${scopeShort} for the selected property.`}
      </Text>
    </View>
  );

  return (
    <View style={st.root}>
      <FlatList
        ref={listRef}
        data={flat}
        keyExtractor={(r: FlatRow) => r.node.id}
        renderItem={({ item }: { item: FlatRow }) => (
          <TreeRow row={item} levels={levels} indent={indent} wide={wide} onPress={() => item.node.children.length && toggle(item.node.id)} />
        )}
        ListHeaderComponent={Header}
        ListEmptyComponent={Empty}
        contentContainerStyle={[st.list, wide && st.listWide]}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={30}
        windowSize={11}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {flat.length > 0 && (
        <View style={[st.totalBar, { backgroundColor: accent }]}>
          <View style={[st.totalInner, wide && { maxWidth: 1100 }]}>
            <View style={{ flex: 1 }}>
              <Text style={st.totalLbl}>TOTAL · {scopeLabel}{query ? ' · SEARCH' : ''}</Text>
              <Text style={st.totalSub}>
                {counts[0]} {levels[0].plural} · {counts[1]} {levels[1].plural} · {counts[3]} {levels[3].plural}
              </Text>
            </View>
            <Text style={st.totalVal}>{qty3(shownTotal)}</Text>
          </View>
        </View>
      )}

      <SearchableMultiSelectModal
        visible={prpModal}
        title="Property"
        placeholder="Search property…"
        options={prps.map((p) => ({ value: String(p.PrpCode), label: p.LngName ? `${p.LngName}` : String(p.PrpCode), searchText: String(p.PrpCode) }))}
        selectedValues={selectedPrps}
        loading={prpLoading}
        onClose={() => setPrpModal(false)}
        onRefresh={() => loadProperties(false)}
        onApply={(values: string[]) => {
          setPrpModal(false);
          setSelectedPrps(values.map(String));
          if (values.length) void loadStock(values.map(String));
        }}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <View style={[st.kpi, { borderTopColor: color }]}>
      <Text style={st.kpiLbl} numberOfLines={1}>{label}</Text>
      <Text style={[st.kpiVal, { color }]} numberOfLines={1}>{value}</Text>
      {!!sub && <Text style={st.kpiSub} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

function TreeRow({ row, levels, indent, wide, onPress }: {
  row: FlatRow; levels: LevelDef[]; indent: number; wide: boolean; onPress: () => void;
}) {
  const { node, parentQty, open } = row;
  const color = LEVEL_COLOR[node.level];
  const share = parentQty > 0 ? (node.qty / parentQty) * 100 : 0;
  const hasKids = node.children.length > 0;
  // children can skip a level (row without sub design -> shade directly), so
  // name them by their own level; mixed levels -> "entries"
  const kidLevels = new Set(node.children.map((c) => c.level));
  const kidDef = kidLevels.size === 1 ? levels[node.children[0].level] : null;
  const childLabel = hasKids
    ? `${node.children.length} ${kidDef ? (node.children.length === 1 ? kidDef.label.toLowerCase() : kidDef.plural) : 'entries'}`
      + (node.level < 2 && node.leafCount > 0 && kidDef !== levels[3]
        ? ` · ${node.leafCount} ${node.leafCount === 1 ? levels[3].label.toLowerCase() : levels[3].plural}` : '')
      + (node.ownQty > 0.0005 ? ` · ${qty3(node.ownQty)} without ${(kidDef ?? levels[Math.min(3, node.level + 1)]).label.toLowerCase()}` : '')
    : '';
  const isTop = node.level === 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={hasKids ? 0.65 : 1}
      style={[st.row, isTop && st.rowTop, open && isTop && st.rowTopOpen, { paddingLeft: 10 + node.level * indent }]}
    >
      <View style={[st.rail, { backgroundColor: color }]} />
      <View style={st.chevron}>
        {hasKids
          ? <Icon name={open ? 'expand-more' : 'chevron-right'} size={20} color={open ? color : T.muted} />
          : <View style={[st.leafDot, { backgroundColor: color }]} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[st.name, isTop && st.nameTop, node.level === 3 && st.nameLeaf]} numberOfLines={2}>{node.name}</Text>
        <Text style={st.sub} numberOfLines={1}>
          <Text style={{ color, fontWeight: '800' }}>{levels[node.level].label.toUpperCase()}</Text>
          {childLabel ? ` · ${childLabel}` : ''}
          {!wide ? ` · ${share.toFixed(1)}%` : ''}
        </Text>
        {!wide && (
          <View style={st.barTrack}><View style={[st.barFill, { width: `${Math.min(100, share)}%`, backgroundColor: color }]} /></View>
        )}
      </View>
      <Text style={[st.qty, isTop && st.qtyTop]} numberOfLines={1}>{qty3(node.qty)}</Text>
      {wide && (
        <View style={st.shareCell}>
          <View style={st.barTrack}><View style={[st.barFill, { width: `${Math.min(100, share)}%`, backgroundColor: color }]} /></View>
          <Text style={st.shareText}>{share.toFixed(1)}%</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  list: { padding: 12, paddingBottom: 96 },
  listWide: { maxWidth: 1100, width: '100%', alignSelf: 'center', paddingHorizontal: 18 },
  headWrap: { gap: 10, marginBottom: 8 },

  filterCard: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  prpBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 50,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 12,
  },
  prpEyebrow: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.6 },
  prpValue: { fontSize: 13.5, fontWeight: '800', color: T.ink, marginTop: 1 },
  loadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: T.nav, borderRadius: 12, paddingHorizontal: 16, minHeight: 50,
  },
  loadBtnDirty: { backgroundColor: T.copper },
  loadText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  meta: { fontSize: 10.5, color: T.muted, fontWeight: '600', marginTop: -4 },
  errBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FCEDEA', borderRadius: 9, padding: 9 },
  errText: { flex: 1, color: T.red, fontSize: 11.5, fontWeight: '700' },

  segment: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  segLbl: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.6 },
  segVal: { fontSize: 16, fontWeight: '800', color: T.ink, fontFamily: MONO, marginTop: 2 },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: {
    flexGrow: 1, flexBasis: 110, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border,
    borderTopWidth: 3, paddingHorizontal: 10, paddingVertical: 8,
  },
  kpiLbl: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.4 },
  kpiVal: { fontSize: 17, fontWeight: '800', fontFamily: MONO, marginTop: 2 },
  kpiSub: { fontSize: 9.5, color: T.muted, fontFamily: MONO, marginTop: 1 },

  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  search: {
    flexGrow: 1, flexBasis: 260, flexDirection: 'row', alignItems: 'center', gap: 7, height: 42,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 11,
  },
  searchInput: { flex: 1, fontSize: 13, color: T.ink, paddingVertical: 0 },
  sortRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3, height: 36, paddingHorizontal: 10,
    borderRadius: 9, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
  },
  sortChipOn: { backgroundColor: T.nav, borderColor: T.nav },
  sortText: { fontSize: 11.5, fontWeight: '800', color: T.ink },

  colHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginTop: 2 },
  legend: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '700', color: T.muted },
  colQty: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.4, width: 120, textAlign: 'right' },
  colShare: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.4, width: 130, textAlign: 'right' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 52, paddingRight: 12, paddingVertical: 8,
    backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.hair, overflow: 'hidden',
  },
  rowTop: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: T.border, minHeight: 58 },
  rowTopOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, backgroundColor: '#FBF8F4' },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  chevron: { width: 22, alignItems: 'center', justifyContent: 'center' },
  leafDot: { width: 7, height: 7, borderRadius: 4 },
  name: { fontSize: 13, fontWeight: '700', color: T.ink },
  nameTop: { fontSize: 14, fontWeight: '900' },
  nameLeaf: { fontWeight: '600' },
  sub: { fontSize: 10, color: T.muted, marginTop: 2 },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: T.alt, marginTop: 5, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  qty: { width: 120, textAlign: 'right', fontSize: 13, fontWeight: '700', color: T.ink, fontFamily: MONO },
  qtyTop: { fontSize: 14, fontWeight: '900' },
  shareCell: { width: 130, paddingLeft: 14 },
  shareText: { fontSize: 10, fontWeight: '700', color: T.muted, textAlign: 'right', marginTop: 2, fontFamily: MONO },

  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, paddingHorizontal: 24, gap: 8 },
  stateText: { fontSize: 13, color: T.muted, textAlign: 'center', fontWeight: '600' },
  stateLink: { fontSize: 12, color: T.copper, fontWeight: '800' },

  totalBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingVertical: 11, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  totalInner: { flexDirection: 'row', alignItems: 'center', width: '100%', alignSelf: 'center' },
  totalLbl: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  totalSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 1 },
  totalVal: { color: '#fff', fontSize: 17, fontWeight: '900', fontFamily: MONO },
});
