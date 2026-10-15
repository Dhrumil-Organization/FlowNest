// FILE: src/components/TakaHistory/index.tsx
// NEW ERP — Taka History (Finish Taka History).
//
//   [Filters button + summary chips]  ->  Takas (list: cards / grid)  ->  Taka journey
//
// Filters open in a slide-in panel (FilterPanel) so the user can change them any time without going back.
// The list stays mounted under the journey, so going back keeps the search / sort / scroll position.
// `token` and `API` come from ErpSessionGate (same as every other NEW ERP module).
import AsyncStorage from '@/common/utils/compatibleStorage';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PanelHeader } from '../erpUi';
import { createTakaRun } from './api';
import { useTakaCriteria } from './criteria';
import FilterPanel from './FilterPanel';
import type { GridCreate } from './gridApi';
import { TAKA_STR_CODE, todayText, toIso, type TakaRow, type TakaRun } from './model';
import TakaDetailScreen from './TakaDetailScreen';
import TakaGridScreen from './TakaGridScreen';
import TakaListScreen from './TakaListScreen';

type Props = { token: string; API: string };

export default function TakaHistory({ token, API }: Props) {
  const [run, setRun] = useState<TakaRun | null>(null);
  const [open, setOpen] = useState<TakaRow | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<'card' | 'grid'>('card'); // Cards / Grid (remembered)
  const [gridFor, setGridFor] = useState<number | null>(null); // run the grid has been opened for
  const [gridCreate, setGridCreate] = useState<GridCreate | null>(null);

  // filter values live here, so they are kept while the panel is closed
  const [prpCode, setPrpCode] = useState(''); // one or many properties, comma separated ("001,002")
  const [asOn, setAsOn] = useState(todayText());
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState<{ prp: string; asOn: string } | null>(null);

  const c = useTakaCriteria({
    token,
    API,
    onAutoProperty: (code) => setPrpCode((p) => p || code),
  });

  useEffect(() => {
    AsyncStorage.getItem('taka_history_view')
      .then((v: string | null) => {
        if (v === 'grid' || v === 'card') setView(v);
      })
      .catch(() => {});
  }, []);
  const changeView = (v: 'card' | 'grid') => {
    setView(v);
    AsyncStorage.setItem('taka_history_view', v).catch(() => {});
  };
  // the grid snapshot is built only when the Grid view is opened (and kept while switching back and forth)
  useEffect(() => {
    if (run && view === 'grid') setGridFor(run.run_id);
  }, [run, view]);

  // hardware back: journey -> filters panel -> (default)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (open) {
        setOpen(null);
        return true;
      }
      if (filtersOpen && !loading) {
        setFiltersOpen(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [open, filtersOpen, loading]);

  const load = async () => {
    const iso = toIso(asOn);
    if (!prpCode) return setError('Select at least one property.');
    if (!iso) return setError('Enter the date as dd/mm/yyyy.');

    const yearno = ''; // year filter removed: a blank year is sent

    setError('');
    setLoading(true);
    try {
      const r = await createTakaRun(API, token, {
        prp_codes: prpCode,
        str_codes: TAKA_STR_CODE,
        as_on_date: iso,
        yearno,
        refresh,
      });
      setOpen(null);
      setGridCreate({ prp_codes: prpCode, str_codes: TAKA_STR_CODE, as_on_date: iso, yearno, refresh });
      setRun(r);
      setApplied({
        prp: prpCode
          .split(',')
          .filter(Boolean)
          .map((code) => c.propOpts.find((o) => o.value === code)?.label || code)
          .join(', '),
        asOn,
      });
      setFiltersOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Could not load.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={st.screen}>
      {/* top bar: applied filters + Filters button */}
      <View style={st.bar}>
        <View style={st.chips}>
          {applied ? (
            <>
              <Pill icon="apartment" text={String(applied.prp)} />
              <Pill icon="today" text={`As on ${applied.asOn}`} />
            </>
          ) : (
            <Text style={st.barHint} numberOfLines={1}>
              Choose filters to load takas
            </Text>
          )}
        </View>
        <View style={st.actions}>
          {run ? (
            <View style={st.viewToggle}>
              {(['card', 'grid'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.8}
                  onPress={() => changeView(v)}
                  style={[st.vtBtn, view === v && st.vtBtnOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: view === v }}
                >
                  <Icon name={v === 'card' ? 'view-module' : 'view-list'} size={16} color={view === v ? '#fff' : T.nav} />
                  <Text style={[st.vtText, view === v && st.vtTextOn]}>{v === 'card' ? 'Cards' : 'Grid'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <TouchableOpacity activeOpacity={0.85} style={st.filterBtn} onPress={() => setFiltersOpen(true)} accessibilityRole="button">
            <Icon name="tune" size={18} color="#fff" />
            <Text style={st.filterBtnText}>Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {run ? (
          <>
            <View style={[{ flex: 1 }, view === 'grid' && { display: 'none' }]}>
              <TakaListScreen key={run.run_id} token={token} API={API} run={run} onOpen={setOpen} />
            </View>
            {gridFor === run.run_id && gridCreate ? (
              <View style={[{ flex: 1 }, view !== 'grid' && { display: 'none' }]}>
                <TakaGridScreen key={run.run_id} token={token} API={API} create={gridCreate} />
              </View>
            ) : null}
          </>
        ) : (
          <View style={st.emptyWrap}>
            <View style={st.emptyCard}>
              <View style={st.emptyIcon}>
                <Icon name="inventory-2" size={30} color={T.copper} />
              </View>
              <Text style={st.emptyTitle}>No data available</Text>
              <Text style={st.emptyText}>Choose property, then tap Load to see every taka with its full journey.</Text>
              <TouchableOpacity activeOpacity={0.85} style={st.emptyBtn} onPress={() => setFiltersOpen(true)} accessibilityRole="button">
                <Icon name="tune" size={18} color="#fff" />
                <Text style={st.filterBtnText}>Open filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {run && open ? (
        <View style={[st.overlay, { zIndex: 30, elevation: 30 }]}>
          <PanelHeader
            onBack={() => setOpen(null)}
            backLabel="Back to list"
            crumbs={['Takas']}
            title={`Taka ${open.taka_no || ''}`}
            subtitle={open.design || undefined}
          />
          <TakaDetailScreen key={open.key} token={token} API={API} runId={run.run_id} takaKey={open.key} />
        </View>
      ) : null}

      {filtersOpen ? (
        <FilterPanel
          c={c}
          prpCode={prpCode}
          asOn={asOn}
          refresh={refresh}
          onPrp={setPrpCode}
          onAsOn={setAsOn}
          onRefresh={setRefresh}
          loading={loading}
          error={error}
          onLoad={load}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
    </View>
  );
}

function Pill({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={st.pill}>
      <Icon name={icon as any} size={14} color={T.copper} />
      <Text style={st.pillText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: T.bg, zIndex: 20, elevation: 20 },
  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.hair },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewToggle: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, overflow: 'hidden' },
  vtBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 38 },
  vtBtnOn: { backgroundColor: T.nav },
  vtText: { fontSize: 12.5, fontWeight: '700', color: T.nav },
  vtTextOn: { color: '#fff', fontWeight: '800' },
  chips: { flexGrow: 1, flexBasis: 160, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  barHint: { fontSize: 12.5, fontWeight: '600', color: T.muted },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%', paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  pillText: { fontSize: 12, fontWeight: '800', color: T.nav, flexShrink: 1 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: T.nav },
  filterBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  emptyWrap: { flex: 1, padding: 12, justifyContent: 'flex-start' },
  emptyCard: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, ...S.card, shadowOpacity: 0.04, elevation: 1 },
  emptyIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: T.nav, marginTop: 12 },
  emptyText: { fontSize: 12.5, fontWeight: '600', color: T.muted, textAlign: 'center', marginTop: 6, maxWidth: 340, lineHeight: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 20, borderRadius: 10, backgroundColor: T.nav, marginTop: 16 },
});
