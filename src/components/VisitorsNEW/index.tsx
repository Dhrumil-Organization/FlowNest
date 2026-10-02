// FILE: src/components/VisitorsNEW/index.tsx
// NEW ERP — Visits (gate register for the watchman).  English / हिन्दी.
//
//   ┌ [English | हिन्दी]                         [? Guide]  [⟳] ┐
//   │ [ ＋  NEW VISITOR ENTRY ]                                  │
//   │ INSIDE NOW 6 · CAME TODAY 14 · WENT OUT 8 · TOO LONG 1     │
//   │ [Inside now] [Today] [Other day]      🔍 search            │
//   │ ┌ photo  Name · Company           [ Mark OUT ] ┐           │
//   │ │        Purpose → whom to meet · IN 10:15 · 1h 20m │       │
//   └────────────────────────────────────────────────────────────┘
//
// What the watchman can do here
//   - New entry: one or many people in one go, any number of photos (face,
//     visiting card, material, other), people who came before auto-fill
//     from the mobile number / name. Everything is optional.    (right: add)
//   - Mark OUT (one person or the whole group), undo a wrong OUT. (right: checkout)
//   - Open an entry, see all photos, correct it.                 (right: edit)
//   - Delete a wrong entry (from the details or inside the form). (right: delete)
//   - Search today's / any day's entries, call the visitor.
//   - Built-in guide in English and Hindi.
//
// Rights: resource 'production.visits' (see production.module.ts). The route
// needs `view`; each button above is hidden when its action is not granted.
// Data: api.ts (Laravel VisitorController; USE_MOCK there switches to sample data).
// Token + host come from ErpSessionGate (screens/production/VisitsScreen.tsx).
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { usePermission } from '@/src/core/permissions';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { DateTimeField } from '../DoffEntryNEW/ui';
import { Btn, Sheet } from '../StockVerificationNEW/ui';
import {
  Api, apiErrorText, checkoutVisits, deleteVisit, fetchSuggestions, fetchVisits, undoCheckout,
} from './api';
import GuideSheet from './GuideSheet';
import { StrKey, t } from './i18n';
import {
  dayKey, displayName, facePhoto, fmtDate, fmtDuration, fmtTime, iconOf, labelOf, Lang, matches, NO_SUGGESTIONS, PURPOSES,
  statusOf, stayMinutes, Visit, VisitorSuggestions, VisitPhoto,
} from './model';
import { Avatar, HIT, LangToggle, PhotoThumbs, PhotoViewer, Tag, TextField, Toast, ToastMsg } from './ui';
import VisitDetailSheet, { STATUS_STYLE } from './VisitDetailSheet';
import VisitForm from './VisitForm';

type Props = { token: string; API: string; username?: string };
type Tab = 'inside' | 'today' | 'date';

export const VISITS_RESOURCE = 'production.visits';
const LANG_KEY = 'visitor_lang';
const GUIDE_KEY = 'visitor_guide_seen';

/** Replace changed rows / add new rows, newest first. */
const upsert = (list: Visit[], changed: Visit[]): Visit[] => {
  const map = new Map(changed.map((x) => [x.id, x]));
  const next = list.map((x) => map.get(x.id) || x);
  const known = new Set(list.map((x) => x.id));
  const added = changed.filter((x) => !known.has(x.id));
  return [...added, ...next].sort((a, b) => (a.inAt < b.inAt ? 1 : a.inAt > b.inAt ? -1 : 0));
};

export default function VisitorsNEW({ token, API, username }: Props) {
  const api: Api = useMemo(() => ({ API, token, username, screen: 'visits' }), [API, token, username]);
  const { canDo } = usePermission();
  const canAdd = canDo(VISITS_RESOURCE, 'add');
  const canEdit = canDo(VISITS_RESOURCE, 'edit');
  const canCheckout = canDo(VISITS_RESOURCE, 'checkout');
  const canDelete = canDo(VISITS_RESOURCE, 'delete');

  const { width } = useWindowDimensions();
  const cols = width >= 1240 ? 3 : width >= 820 ? 2 : 1;
  const wide = width >= 820;

  /* ------------------------------ language ------------------------------- */
  const [lang, setLang] = useState<Lang>('en');
  const [guide, setGuide] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all([AsyncStorage.getItem(LANG_KEY), AsyncStorage.getItem(GUIDE_KEY)])
      .then(([savedLang, seen]: (string | null)[]) => {
        if (!alive) return;
        if (savedLang === 'hi' || savedLang === 'en') setLang(savedLang);
        if (!seen) setGuide(true); // first time on this phone → show the guide
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);
  const changeLang = useCallback((l: Lang) => {
    setLang(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => undefined);
  }, []);
  const closeGuide = () => {
    setGuide(false);
    AsyncStorage.setItem(GUIDE_KEY, '1').catch(() => undefined);
  };
  const tr = useCallback((key: StrKey, vars?: Record<string, string | number>) => t(lang, key, vars), [lang]);

  /* -------------------------------- data --------------------------------- */
  const [suggestions, setSuggestions] = useState<VisitorSuggestions>(NO_SUGGESTIONS); // words used in earlier visits
  const [todaySet, setTodaySet] = useState<Visit[]>([]); // today's visits + everyone still inside
  const [daySet, setDaySet] = useState<Visit[]>([]);     // "Other day" tab
  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('inside');
  const [date, setDate] = useState<Date>(() => new Date(Date.now() - 86400000));
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const listRef = useRef<FlatList<Visit>>(null);

  // durations / "inside too long" refresh every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadToday = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const today = new Date();
      setTodaySet(await fetchVisits(api, today, today, { includeOpen: true }));
      setNow(new Date());
    } catch (e) {
      setError(apiErrorText(e));
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadDay = useCallback(async (d: Date) => {
    setDayLoading(true);
    setError('');
    try {
      setDaySet(await fetchVisits(api, d, d));
    } catch (e) {
      setDaySet([]);
      setError(apiErrorText(e));
    } finally {
      setDayLoading(false);
    }
  }, [api]);

  useEffect(() => { void loadToday(); }, [loadToday]);
  const loadSuggestions = useCallback(() => {
    fetchSuggestions(api).then(setSuggestions).catch(() => undefined);
  }, [api]);
  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);
  useEffect(() => { if (tab === 'date') void loadDay(date); }, [tab, date, loadDay]);

  const refresh = () => {
    void loadToday();
    if (tab === 'date') void loadDay(date);
  };

  /* ------------------------------- derived ------------------------------- */
  const todayKey = dayKey(now);
  const inside = useMemo(() => {
    const rank = (x: Visit) => (statusOf(x, now) === 'overstay' ? 0 : 1);
    return todaySet.filter((x) => !x.outAt).sort((a, b) => rank(a) - rank(b) || (a.inAt < b.inAt ? 1 : -1));
  }, [todaySet, now]);
  const todays = useMemo(() => todaySet.filter((x) => dayKey(x.inAt) === todayKey), [todaySet, todayKey]);
  const overstay = useMemo(() => inside.filter((x) => statusOf(x, now) === 'overstay').length, [inside, now]);
  const wentOut = todays.filter((x) => x.outAt).length;
  const insideMobiles = useMemo(() => new Set(inside.map((x) => x.mobile).filter(Boolean)), [inside]);

  const base = tab === 'inside' ? inside : tab === 'today' ? todays : daySet;
  const rows = useMemo(() => base.filter((x) => matches(x, query)), [base, query]);
  const busyList = tab === 'date' ? dayLoading : loading;

  /* ------------------------------- actions ------------------------------- */
  const [toast, setToast] = useState<ToastMsg>(null);
  const say = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => setToast({ text, kind, id: Date.now() }), []);
  const clearToast = useCallback(() => setToast(null), []);

  const [form, setForm] = useState<{ open: boolean; editing: Visit | null }>({ open: false, editing: null });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [out, setOut] = useState<{ visit: Visit; at: Date; remark: string; group: boolean } | null>(null);
  const [outBusy, setOutBusy] = useState(false);
  const [outError, setOutError] = useState('');
  const [viewer, setViewer] = useState<{ photos: VisitPhoto[]; index: number } | null>(null);

  const all = useMemo(() => {
    const map = new Map<string, Visit>();
    [...daySet, ...todaySet].forEach((x) => map.set(x.id, x));
    return Array.from(map.values());
  }, [daySet, todaySet]);
  const detail = detailId ? all.find((x) => x.id === detailId) || null : null;
  const groupOf = useCallback((x: Visit) => all.filter((y) => y.groupId === x.groupId), [all]);

  const applyChanged = useCallback((changed: Visit[]) => {
    const tk = dayKey(new Date());
    // today set keeps: today's visits + anyone still inside
    setTodaySet((list) => upsert(list, changed).filter((x) => dayKey(x.inAt) === tk || !x.outAt || list.some((y) => y.id === x.id)));
    setDaySet((list) => (list.length ? upsert(list, changed.filter((x) => list.some((y) => y.id === x.id))) : list));
    setNow(new Date());
  }, []);

  const onSaved = (saved: Visit[], keepOpen: boolean) => {
    const wasEdit = !!form.editing;
    applyChanged(saved);
    loadSuggestions(); // the words just typed become suggestions for the next entry
    if (!keepOpen) {
      setForm({ open: false, editing: null });
      say(wasEdit ? tr('updated') : saved.length === 1 ? tr('saved1', { no: saved[0].visitNo }) : tr('savedN', { n: saved.length }));
      if (!wasEdit) {
        setTab('inside');
        setQuery('');
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
    }
  };

  const openCheckout = (x: Visit) => {
    setDetailId(null);
    setOutError('');
    setOut({ visit: x, at: new Date(), remark: '', group: true });
  };

  const confirmCheckout = async () => {
    if (!out || outBusy) return;
    if (out.at.getTime() < new Date(out.visit.inAt).getTime()) { setOutError(tr('outBeforeIn')); return; }
    const mates = groupOf(out.visit).filter((x) => !x.outAt && x.id !== out.visit.id);
    const ids = [out.visit.id, ...(out.group ? mates.map((x) => x.id) : [])];
    setOutBusy(true);
    setOutError('');
    try {
      const changed = await checkoutVisits(api, ids, out.at, out.remark);
      applyChanged(changed);
      say(changed.length > 1 ? tr('outDoneN', { n: changed.length }) : tr('outDone', { name: displayName(out.visit, lang) }));
      setOut(null);
    } catch (e) {
      setOutError(apiErrorText(e));
    } finally {
      setOutBusy(false);
    }
  };

  const askUndo = (x: Visit) => {
    const name = displayName(x, lang);
    AppAlert.alert(tr('undoTitle'), tr('undoMsg', { name }), [
      { text: tr('cancel'), style: 'cancel' },
      {
        text: tr('undoOut'),
        onPress: () => {
          undoCheckout(api, x.id)
            .then((next) => { applyChanged([next]); say(tr('undoDone', { name })); })
            .catch((e) => say(apiErrorText(e), 'error'));
        },
      },
    ]);
  };

  const askDelete = (x: Visit) => {
    AppAlert.alert(tr('deleteTitle'), tr('deleteMsg', { name: displayName(x, lang) }), [
      { text: tr('cancel'), style: 'cancel' },
      {
        text: tr('delete'),
        style: 'destructive',
        onPress: () => {
          deleteVisit(api, x.id)
            .then(() => {
              setDetailId(null);
              setForm({ open: false, editing: null }); // delete can also be pressed inside the edit form
              setTodaySet((list) => list.filter((y) => y.id !== x.id));
              setDaySet((list) => list.filter((y) => y.id !== x.id));
              say(tr('deleted'));
            })
            .catch((e) => say(apiErrorText(e), 'error'));
        },
      },
    ]);
  };

  /* -------------------------------- render ------------------------------- */
  const outMates = out ? groupOf(out.visit).filter((x) => !x.outAt && x.id !== out.visit.id) : [];

  const Header = (
    <View style={st.head}>
      <View style={st.kpis}>
        <Kpi icon="login" label={tr('insideNow')} value={inside.length} color={T.green} on={tab === 'inside'} onPress={() => setTab('inside')} />
        <Kpi icon="today" label={tr('todayTotal')} value={todays.length} color={T.yd} on={tab === 'today'} onPress={() => setTab('today')} />
        <Kpi icon="logout" label={tr('wentOut')} value={wentOut} color="#6B655F" />
        {overstay > 0 ? <Kpi icon="warning-amber" label={tr('overstay')} value={overstay} color={T.red} onPress={() => setTab('inside')} /> : null}
      </View>

      <View style={st.tabs}>
        {([['inside', tr('tabInside'), inside.length], ['today', tr('tabToday'), todays.length], ['date', tr('tabDate'), null]] as [Tab, string, number | null][]).map(([key, label, n]) => {
          const on = tab === key;
          return (
            <TouchableOpacity key={key} style={[st.tab, on && st.tabOn]} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[st.tabText, on && { color: '#fff' }]} numberOfLines={1}>{label}{n !== null ? ` (${n})` : ''}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'date' ? (
        <View style={st.dateRow}>
          <TouchableOpacity style={st.dayBtn} onPress={() => setDate((d) => new Date(d.getTime() - 86400000))} accessibilityLabel="Previous day">
            <Icon name="chevron-left" size={26} color={T.nav} />
          </TouchableOpacity>
          <DateTimeField mode="date" value={date} text={fmtDate(date)} maximumDate={new Date()} onPick={(d) => { setDate(d); }} />
          <TouchableOpacity
            style={[st.dayBtn, dayKey(date) >= todayKey && { opacity: 0.35 }]}
            disabled={dayKey(date) >= todayKey}
            onPress={() => setDate((d) => new Date(d.getTime() + 86400000))}
            accessibilityLabel="Next day"
          >
            <Icon name="chevron-right" size={26} color={T.nav} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={st.search}>
        <Icon name="search" size={22} color={T.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={tr('searchPh')}
          placeholderTextColor={T.muted}
          style={[st.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel={tr('searchPh')}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={HIT} accessibilityLabel="Clear search">
            <Icon name="cancel" size={20} color={T.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const Empty = busyList ? (
    <View style={st.state}><ActivityIndicator color={T.copper} size="large" /><Text style={st.stateText}>{tr('loading')}</Text></View>
  ) : error ? (
    <TouchableOpacity style={st.state} onPress={refresh} accessibilityRole="button">
      <Icon name="cloud-off" size={36} color={T.red} />
      <Text style={[st.stateText, { color: T.red }]}>{tr('loadFailed')}</Text>
      <Text style={st.stateSub}>{error}</Text>
      <Text style={st.stateLink}>{tr('retry')}</Text>
    </TouchableOpacity>
  ) : (
    <View style={st.state}>
      <Icon name={query ? 'search-off' : tab === 'inside' ? 'meeting-room' : 'event-busy'} size={38} color={T.muted} />
      <Text style={st.stateText}>
        {query ? tr('emptySearch', { q: query.trim() }) : tab === 'inside' ? tr('emptyInside') : tr('emptyDay')}
      </Text>
    </View>
  );

  return (
    <View style={st.root}>
      {/* fixed top: language, guide, refresh, new entry */}
      <View style={[st.top, wide && st.topWide]}>
        <View style={st.topRow}>
          <LangToggle lang={lang} onChange={changeLang} />
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={st.topBtn} onPress={() => setGuide(true)} accessibilityRole="button" accessibilityLabel={tr('guide')}>
            <Icon name="help-outline" size={20} color={T.nav} />
            <Text style={st.topBtnText}>{tr('guide')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.topBtn, { paddingHorizontal: 11 }]} onPress={refresh} disabled={loading} accessibilityRole="button" accessibilityLabel={tr('refresh')}>
            {loading ? <ActivityIndicator size="small" color={T.nav} /> : <Icon name="refresh" size={22} color={T.nav} />}
          </TouchableOpacity>
        </View>
        {canAdd ? (
          <TouchableOpacity style={st.newBtn} onPress={() => setForm({ open: true, editing: null })} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={tr('newEntry')}>
            <View style={st.newIcon}><Icon name="person-add" size={26} color={T.copper} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.newText}>{tr('newEntry')}</Text>
              <Text style={st.newSub} numberOfLines={2}>{tr('newEntrySub')}</Text>
            </View>
            <Icon name="chevron-right" size={28} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        key={`cols-${cols}`}
        data={busyList ? [] : rows}
        numColumns={cols}
        keyExtractor={(x: Visit) => x.id}
        columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
        renderItem={({ item }: { item: Visit }) => (
          <VisitCard
            visit={item}
            lang={lang}
            now={now}
            flex={cols > 1}
            onOpen={() => setDetailId(item.id)}
            onOut={canCheckout && !item.outAt ? () => openCheckout(item) : undefined}
            onPhoto={(index) => setViewer({ photos: item.photos, index })}
          />
        )}
        ListHeaderComponent={Header}
        ListEmptyComponent={Empty}
        contentContainerStyle={[st.list, wide && st.listWide]}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        onRefresh={Platform.OS === 'web' ? undefined : refresh}
        refreshing={false}
      />

      <VisitForm
        open={form.open}
        api={api}
        lang={lang}
        onLang={changeLang}
        suggestions={suggestions}
        editing={form.editing}
        insideMobiles={insideMobiles}
        onClose={() => setForm({ open: false, editing: null })}
        onSaved={onSaved}
        onDelete={canDelete ? askDelete : undefined}
      />

      {detail ? (
        <VisitDetailSheet
          visit={detail}
          lang={lang}
          now={now}
          group={groupOf(detail)}
          onClose={() => setDetailId(null)}
          onOpenVisit={(x) => setDetailId(x.id)}
          onEdit={canEdit ? (x) => { setDetailId(null); setForm({ open: true, editing: x }); } : undefined}
          onCheckout={canCheckout ? openCheckout : undefined}
          onUndoOut={canCheckout ? askUndo : undefined}
          onDelete={canDelete ? askDelete : undefined}
        />
      ) : null}

      {/* Mark OUT */}
      <Sheet
        open={!!out}
        onClose={() => { if (!outBusy) setOut(null); }}
        eyebrow={tr('outEyebrow')}
        title={out ? displayName(out.visit, lang) : ''}
        wideMax={520}
        footer={(
          <>
            <Btn label={tr('cancel')} kind="ghost" onPress={() => setOut(null)} disabled={outBusy} style={{ flex: 1, height: 50 }} />
            <Btn label={tr('confirmOut')} icon="logout" kind="copper" onPress={confirmCheckout} loading={outBusy} style={{ flex: 2, height: 50 }} />
          </>
        )}
      >
        {out ? (
          <>
            <View style={st.outInfo}>
              <Avatar uri={facePhoto(out.visit)} name={displayName(out.visit, lang)} size={46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.outName} numberOfLines={1}>{out.visit.company || out.visit.visitNo}</Text>
                <Text style={st.outSub}>{tr('inTime')} {fmtTime(out.visit.inAt)} · {fmtDate(out.visit.inAt)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <DateTimeField
                label={tr('outDate')}
                mode="date"
                value={out.at}
                text={fmtDate(out.at)}
                minimumDate={new Date(out.visit.inAt)}
                maximumDate={new Date()}
                onPick={(d) => { setOutError(''); setOut((o) => (o ? { ...o, at: d } : o)); }}
                style={{ flexGrow: 1, flexBasis: 140 }}
              />
              <DateTimeField
                label={tr('outClock')}
                mode="time"
                value={out.at}
                text={fmtTime(out.at)}
                onPick={(d) => { setOutError(''); setOut((o) => (o ? { ...o, at: d } : o)); }}
                style={{ flexGrow: 1, flexBasis: 140 }}
              />
            </View>
            <TextField
              label={tr('outRemark')}
              value={out.remark}
              onChangeText={(x) => setOut((o) => (o ? { ...o, remark: x } : o))}
              placeholder={tr('outRemarkPh')}
              style={{ flexBasis: 'auto', flexGrow: 0 }}
            />
            {outMates.length ? (
              <TouchableOpacity
                style={[st.check, out.group && st.checkOn]}
                onPress={() => setOut((o) => (o ? { ...o, group: !o.group } : o))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: out.group }}
              >
                <Icon name={out.group ? 'check-box' : 'check-box-outline-blank'} size={26} color={out.group ? T.green : T.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={st.checkText}>{tr('outGroup', { n: outMates.length })}</Text>
                  <Text style={st.checkSub} numberOfLines={2}>{outMates.map((m) => displayName(m, lang)).join(', ')}</Text>
                </View>
              </TouchableOpacity>
            ) : null}
            {outError ? (
              <View style={st.errBox}><Icon name="error-outline" size={18} color={T.red} /><Text style={st.errText}>{outError}</Text></View>
            ) : null}
          </>
        ) : null}
      </Sheet>

      <PhotoViewer photos={viewer?.photos || []} index={viewer ? viewer.index : null} onClose={() => setViewer(null)} lang={lang} />
      <GuideSheet open={guide} lang={lang} onLang={changeLang} onClose={closeGuide} />
      <Toast msg={toast} onDone={clearToast} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function Kpi({ icon, label, value, color, on, onPress }: { icon: string; label: string; value: number; color: string; on?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[st.kpi, { borderTopColor: color }, on && { borderColor: color, backgroundColor: '#FDFCFA' }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name={icon as any} size={15} color={color} />
        <Text style={st.kpiLbl} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[st.kpiVal, { color }]}>{value}</Text>
    </TouchableOpacity>
  );
}

function VisitCard({ visit, lang, now, flex, onOpen, onOut, onPhoto }: {
  visit: Visit; lang: Lang; now: Date; flex: boolean; onOpen: () => void; onOut?: () => void; onPhoto: (index: number) => void;
}) {
  const status = statusOf(visit, now);
  const ss = STATUS_STYLE[status];
  const name = displayName(visit, lang);
  const mins = stayMinutes(visit, now);
  const where = visit.company;
  const purpose = labelOf(PURPOSES, visit.purpose, lang);
  const sameDay = dayKey(visit.inAt) === dayKey(now);

  return (
    <TouchableOpacity
      style={[st.card, flex && { flex: 1 }, status === 'overstay' && st.cardRed]}
      onPress={onOpen}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${t(lang, 'details')}`}
    >
      <View style={[st.rail, { backgroundColor: ss.color }]} />
      <View style={st.cardTop}>
        <Avatar uri={facePhoto(visit)} name={name} size={50} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.name} numberOfLines={1}>{name}</Text>
          {where ? <Text style={st.where} numberOfLines={1}>{where}</Text> : null}
          <View style={st.tagRow}>
            <Tag label={t(lang, ss.key)} icon={ss.icon} color={ss.color} bg={ss.bg} />
            {visit.groupSize > 1 ? <Tag label={t(lang, 'together', { n: visit.groupSize })} icon="groups" color={T.yd} bg="#E9F1F6" /> : null}
            {visit.extraPersons > 0 ? <Tag label={t(lang, 'plusOthers', { n: visit.extraPersons })} /> : null}
          </View>
        </View>
        {visit.mobile ? (
          <TouchableOpacity
            style={st.callBtn}
            onPress={() => { void Linking.openURL(`tel:${visit.mobile}`); }}
            hitSlop={HIT}
            accessibilityRole="button"
            accessibilityLabel={`${t(lang, 'call')} ${name}`}
          >
            <Icon name="call" size={20} color={T.green} />
          </TouchableOpacity>
        ) : null}
      </View>

      {purpose || visit.hostName ? (
        <View style={st.line}>
          <Icon name={iconOf(PURPOSES, visit.purpose, 'label-outline') as any} size={17} color={T.copper} />
          <Text style={st.lineText} numberOfLines={2}>
            {purpose}{purpose && visit.hostName ? '  →  ' : ''}
            {visit.hostName ? <Text style={st.host}>{visit.hostName}</Text> : null}
          </Text>
        </View>
      ) : null}

      {visit.photos.length ? (
        <View style={st.photoRow}>
          <PhotoThumbs photos={visit.photos} onOpen={onPhoto} max={5} size={42} />
        </View>
      ) : null}

      <View style={st.cardFoot}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.time} numberOfLines={1}>
            {t(lang, 'inTime')} <Text style={st.timeStrong}>{fmtTime(visit.inAt)}</Text>
            {!sameDay ? ` · ${fmtDate(visit.inAt)}` : ''}
            {visit.outAt ? <Text>{`   ${t(lang, 'outTime')} `}<Text style={st.timeStrong}>{fmtTime(visit.outAt)}</Text></Text> : null}
          </Text>
          <Text style={[st.dur, { color: ss.color }]} numberOfLines={1}>
            {visit.outAt ? t(lang, 'stayed', { d: fmtDuration(mins, lang) }) : t(lang, 'since', { d: fmtDuration(mins, lang) })}
          </Text>
        </View>
        {onOut ? (
          <TouchableOpacity style={st.outBtn} onPress={onOut} accessibilityRole="button" accessibilityLabel={`${t(lang, 'markOut')}: ${name}`}>
            <Icon name="logout" size={20} color="#fff" />
            <Text style={st.outBtnText}>{t(lang, 'markOut')}</Text>
          </TouchableOpacity>
        ) : (
          <Icon name="chevron-right" size={24} color={T.muted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  top: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, gap: 10, backgroundColor: T.bg },
  topWide: { maxWidth: 1240, width: '100%', alignSelf: 'center', paddingHorizontal: 18 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingHorizontal: 13, borderRadius: 22,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
  },
  topBtnText: { fontSize: 13.5, fontWeight: '800', color: T.nav },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, borderRadius: 16, backgroundColor: T.copper,
    paddingHorizontal: 14, paddingVertical: 10, ...S.card,
  },
  newIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  newText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  newSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, fontWeight: '600', marginTop: 1 },

  list: { paddingHorizontal: 12, paddingBottom: 90, gap: 10 },
  listWide: { maxWidth: 1240, width: '100%', alignSelf: 'center', paddingHorizontal: 18 },
  head: { gap: 10, paddingTop: 2 },

  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: {
    flexGrow: 1, flexBasis: 100, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    borderTopWidth: 3, paddingHorizontal: 10, paddingVertical: 8,
  },
  kpiLbl: { flex: 1, fontSize: 11.5, fontWeight: '800', color: '#5E5852' },
  kpiVal: { fontSize: 24, fontWeight: '900', marginTop: 1 },

  tabs: { flexDirection: 'row', backgroundColor: T.alt, borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  tabOn: { backgroundColor: T.nav },
  tabText: { fontSize: 13.5, fontWeight: '800', color: T.nav },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayBtn: { width: 44, height: 42, borderRadius: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, backgroundColor: T.surface, borderWidth: 1.5,
    borderColor: T.border, borderRadius: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, color: T.ink, paddingVertical: 0, height: 44 },

  card: {
    backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, paddingLeft: 15,
    gap: 9, overflow: 'hidden', ...S.card,
  },
  cardRed: { borderColor: '#E3B4AC', backgroundColor: '#FFFAF9' },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardTop: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  name: { fontSize: 16.5, fontWeight: '800', color: T.ink },
  where: { fontSize: 13, color: '#5E5852', fontWeight: '600', marginTop: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E6F1EA', alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  lineText: { flex: 1, fontSize: 13.5, color: T.ink, fontWeight: '600', lineHeight: 19 },
  host: { fontWeight: '800', color: T.nav },
  dept: { color: T.muted, fontWeight: '600' },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 9 },
  time: { fontSize: 12.5, color: '#5E5852', fontWeight: '600' },
  timeStrong: { fontWeight: '800', color: T.ink },
  dur: { fontSize: 13.5, fontWeight: '800', marginTop: 2 },
  outBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 46, paddingHorizontal: 16, borderRadius: 12, backgroundColor: T.green },
  outBtnText: { color: '#fff', fontSize: 14.5, fontWeight: '900' },

  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 24, gap: 9 },
  stateText: { fontSize: 15, color: '#5E5852', textAlign: 'center', fontWeight: '700' },
  stateSub: { fontSize: 12.5, color: T.muted, textAlign: 'center' },
  stateLink: { fontSize: 13.5, color: T.copper, fontWeight: '800' },

  outInfo: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: T.sub, borderRadius: 12, padding: 10 },
  outName: { fontSize: 14, fontWeight: '700', color: T.ink },
  outSub: { fontSize: 12.5, color: T.muted, marginTop: 1 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: T.border },
  checkOn: { borderColor: T.green, backgroundColor: '#F1F8F4' },
  checkText: { fontSize: 14, fontWeight: '800', color: T.ink },
  checkSub: { fontSize: 12.5, color: T.muted, marginTop: 1 },
  errBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FCEDEA', borderRadius: 10, padding: 10 },
  errText: { flex: 1, color: T.red, fontSize: 13.5, fontWeight: '700' },
});
