// ─────────────────────────────────────────────────────────────
// FILE: src/components/YarnVendorsNEW/index.tsx
// NEW ERP — Yarn Vendors (AI vendor search → preview → Excel).
//
// The screen has ONLY two inputs:
//   1. Yarn item  (required)   e.g. "150 Denier Polyester FDY"
//   2. City       (optional)   INDIAN cities only — empty = all India
// Both accept several values separated by commas (max 5 each). All items and
// all cities go to the backend in ONE request, which asks Claude ONCE for every
// item in every city. Each party is kept only when it is located in the city it
// is listed under, and a "Results by item and city" table shows how many
// parties each combination gave. An item name may
// contain any characters — only a comma separates two items.
// There is no free chat: these values are the only thing sent
// (POST /api/yarn-vendors-chat { item, city, yarns?, prptype? }, Bearer token — ./api.ts).
// Next to the typed item box, ONE yarn can be SELECTED from the ERP yarn master (./YarnPicker.tsx — the Designs →
// Yarns cards, Spun + Filament in one list: blend → ply → item → sub items). Every detail of the selected yarn
// (Spun / Filament, blend with %, count + count type, ply, denier, type, lustre, other) is shown here; the backend
// reads it again from the master and puts it in the AI question. Typed + selected together: max 5.
// The backend builds the question for Claude with its strict rules, Claude
// searches the web and returns a fixed list: party name, what the party calls
// the item, rate, contact no, address, city, state, remarks, source page.
//
// The result is shown as an Excel preview (the same sheet data that is written
// to the file — ./excel.ts) or as cards, and can be downloaded as .xlsx.
//
// Nothing is stored: the result lives only in this component's state and is
// cleared when the user leaves the screen, logs in again / switches property,
// or runs a new search.
// ─────────────────────────────────────────────────────────────
import { AppAlert } from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useBusinessContext } from '@/src/core/business';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { NavigationContext } from '@react-navigation/native';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { previewStyle } from '../VisitorsReportNEW/xlsxLite';
import { Coverage, loadYarnMaster, SearchError, SearchResult, searchVendors, Vendor, Yarn, YarnMaster } from './api';
import { ITEM_EXAMPLES, MAX_CITIES, MAX_CITY_BOX_CHARS, MAX_ITEM_BOX_CHARS, MAX_ITEMS, splitList } from './config';
import { buildSheet, downloadExcel, excelFileName, HEADER_ROWS, NOTICE, searchedCities, searchedItems } from './excel';
import { YarnPicker, yarnStats } from './YarnPicker';

type Props = { token?: string; API?: string; username?: string };
type View2 = 'excel' | 'cards';

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
const clock = (sec: number) => `${Math.floor(sec / 60)}:${pad(sec % 60)}`;

/** "2026-10-05 16:20:11" -> "05 Oct 2026, 4:20 PM" */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const prettyStamp = (stamp: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(stamp || '');
  if (!m) return stamp || '';
  const h = Number(m[4]);
  return `${m[3]} ${MONTHS[Number(m[2]) - 1] || m[2]} ${m[1]}, ${h % 12 === 0 ? 12 : h % 12}:${m[5]} ${h < 12 ? 'AM' : 'PM'}`;
};

/** First phone number in a contact text, digits and + only (for tel:). */
const dialable = (contact: string) => {
  const first = (contact || '').split(/[,;/]| or /i)[0] || '';
  const digits = first.replace(/[^0-9+]/g, '');
  return digits.replace(/\D/g, '').length >= 8 ? digits : '';
};

const hostOf = (url: string) => {
  const m = /^https?:\/\/(?:www\.)?([^/?#]+)/i.exec(url || '');
  return m ? m[1] : '';
};

const open = (url: string) => {
  if (!url) return;
  Linking.openURL(url).catch(() => AppAlert.alert('Could not open', 'This link could not be opened on this device.'));
};

export default function YarnVendorsNEW({ token, API, username }: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 768;

  const [item, setItem] = useState('');
  const [city, setCity] = useState('');
  // yarns selected from the ERP yarn master (Designs → Yarns)
  const { prpGroup } = useBusinessContext();
  // the ONE yarn selected from the master (kept as a list of 0 or 1 so the counts below stay simple)
  const [picked, setPicked] = useState<Yarn[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [master, setMaster] = useState<YarnMaster | null>(null);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterErr, setMasterErr] = useState('');
  const prptypeRef = useRef('');
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');
  const [itemError, setItemError] = useState('');
  const [cityError, setCityError] = useState('');
  const [view, setView] = useState<View2 | null>(null); // null = default for the screen size
  const [saving, setSaving] = useState(false);
  /** What is being searched right now (shown in the progress panel). */
  const [searching, setSearching] = useState<{ item: string; area: string } | null>(null);

  const abortRef = useRef<any>(null);
  const runRef = useRef(0);
  const mountedRef = useRef(true);
  const cityRef = useRef<any>(null);

  const signedIn = Boolean(token && API);
  // What the two boxes currently hold, split on commas (shown as chips).
  const itemList = useMemo(() => splitList(item), [item]);
  const room = MAX_ITEMS - itemList.length - picked.length;   // typed + selected together
  const cityList = useMemo(() => splitList(city), [city]);
  const activeView: View2 = view || (phone ? 'cards' : 'excel');

  /* ------------------------------ lifecycle ------------------------------ */
  const resetAll = useCallback(() => {
    runRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setSearching(null);
    setResult(null);
    setError('');
    setItemError('');
    setCityError('');
    setItem('');
    setCity('');
    setPicked([]);
    setPickerOpen(false);
    setMaster(null);   // read again next time (the login group / the master may have changed)
    setMasterErr('');
    setView(null);
  }, []);

  /** the login group, read the same way as Designs → Yarns (AsyncStorage user_prptype), else the header group */
  const prptypeOf = useCallback(async () => {
    let p = '';
    try { p = String((await AsyncStorage.getItem('user_prptype')) || ''); } catch { p = ''; }
    prptypeRef.current = p || String(prpGroup || '');
    return prptypeRef.current;
  }, [prpGroup]);

  const loadMaster = useCallback(async () => {
    setMasterLoading(true);
    setMasterErr('');
    try {
      const m = await loadYarnMaster(API || '', token || '', await prptypeOf());
      if (mountedRef.current) setMaster(m);
    } catch (e: any) {
      if (mountedRef.current) setMasterErr(e?.message || 'The yarn master could not be loaded.');
    } finally {
      if (mountedRef.current) setMasterLoading(false);
    }
  }, [API, token, prptypeOf]);

  const openPicker = useCallback(() => {
    setPickerOpen(true);
    if (!master && !masterLoading) void loadMaster();
  }, [master, masterLoading, loadMaster]);

  /** single select: another yarn replaces the selected one; null clears it */
  const selectYarn = useCallback((y: Yarn | null) => {
    setItemError('');
    setPicked(y ? [y] : []);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runRef.current++;
      abortRef.current?.abort();
    };
  }, []);

  // Leaving the screen clears everything (tabs keep screens mounted).
  const navigation = useContext(NavigationContext);
  useEffect(() => {
    if (!navigation) return undefined;
    return navigation.addListener('blur', () => resetAll());
  }, [navigation, resetAll]);

  // Seconds counter while a search is running.
  useEffect(() => {
    if (!loading) return undefined;
    setElapsed(0);
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [loading]);

  /* -------------------------------- search ------------------------------- */
  /** fresh = "Search the web again": a new web search, its new parties are added to the saved list */
  const runSearch = useCallback(async (rawItem?: string, fresh = false) => {
    if (loading) return;
    // Both boxes may hold several comma separated values.
    const itemList = splitList(rawItem ?? item);
    const cityList = splitList(city);
    const it = itemList.join(', ');
    const ct = cityList.join(', ');
    const sel = rawItem !== undefined ? [] : picked;   // an example chip searches only that example
    if (itemList.length === 0 && sel.length === 0) {
      setItemError('Enter a yarn item name or select a yarn from the yarn master.');
      return;
    }
    if (itemList.length + sel.length > MAX_ITEMS) {
      setItemError(`Enter / select at most ${MAX_ITEMS} yarn items at a time (typed + selected together).`);
      return;
    }
    if (cityList.length > MAX_CITIES) {
      setCityError(`Enter at most ${MAX_CITIES} cities at a time.`);
      return;
    }
    Keyboard.dismiss();
    setItemError('');
    setCityError('');
    setError('');
    setResult(null);
    setView(null);
    if (rawItem !== undefined) setItem(it);

    const run = ++runRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching({ item: [it, ...sel.map((y) => y.label)].filter(Boolean).join(', '), area: ct || 'All India' });
    setLoading(true);
    try {
      const prptype = sel.length ? prptypeRef.current || (await prptypeOf()) : '';
      const r = await searchVendors(API || '', token || '', it, ct, controller.signal,
        sel.length ? { yarns: sel.map((y) => y.itmcode), prptype } : undefined, fresh);
      if (!mountedRef.current || run !== runRef.current) return;
      setResult(r);
    } catch (e: any) {
      if (!mountedRef.current || run !== runRef.current) return;
      const err = e instanceof SearchError ? e : new SearchError('server', e?.message || 'Something went wrong.');
      if (err.kind === 'invalid') {
        if (/cit(y|ies)/i.test(err.message)) setCityError(err.message);
        else setItemError(err.message);
      }
      else if (err.kind !== 'cancelled') setError(err.message);
    } finally {
      if (mountedRef.current && run === runRef.current) {
        abortRef.current = null;
        setLoading(false);
        setSearching(null);
      }
    }
  }, [API, city, item, loading, token, picked, prptypeOf]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const save = useCallback(async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      await downloadExcel(result, username || '');
    } catch (e: any) {
      AppAlert.alert('Excel', e?.message || 'The Excel file could not be saved.');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [result, saving, username]);

  const sheet = useMemo(() => (result && result.status === 'ok' ? buildSheet(result, username || '') : null), [result, username]);

  /* -------------------------------- render ------------------------------- */
  const onEnter = (e: any, action: () => void) => {
    if (e?.nativeEvent?.key === 'Enter') {
      e.preventDefault?.();
      action();
    }
  };

  const form = (
    <View style={[s.card, S.card]}>
      <View style={[s.fields, phone && { flexDirection: 'column' }]}>
        <View style={[s.field, !phone && { flex: 3 }]}>
          <Text style={s.label}>Yarn item <Text style={{ color: T.red }}>*</Text></Text>
          <View style={[s.inputBox, !!itemError && { borderColor: T.red }]}>
            <Icon name="grain" size={18} color={T.muted} />
            <TextInput
              value={item}
              onChangeText={(t) => { setItem(t.replace(/[\r\n]+/g, ' ').slice(0, MAX_ITEM_BOX_CHARS)); if (itemError) setItemError(''); }}
              placeholder="e.g. 150 Denier Polyester FDY"
              placeholderTextColor={T.muted}
              style={s.input}
              maxLength={MAX_ITEM_BOX_CHARS}
              editable={!loading && signedIn}
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => cityRef.current?.focus?.()}
              onKeyPress={(e: any) => { if (Platform.OS === 'web') onEnter(e, () => void runSearch()); }}
              accessibilityLabel="Yarn item name"
            />
            {item.length > 0 && !loading ? (
              <TouchableOpacity onPress={() => setItem('')} hitSlop={HIT} accessibilityLabel="Clear item">
                <Icon name="close" size={18} color={T.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          {itemError
            ? <Text style={s.fieldError}>{itemError}</Text>
            : <Text style={s.hint}>Any name or symbols are fine. A comma starts the next item (max {MAX_ITEMS}).</Text>}
          <ValueChips values={itemList} max={MAX_ITEMS} />
          <TouchableOpacity
            style={[s.pickBtn, (loading || !signedIn) && { opacity: 0.55 }]}
            onPress={openPicker}
            disabled={loading || !signedIn}
            accessibilityRole="button"
            accessibilityLabel="Select from yarn master"
          >
            <Icon name="playlist-add-check" size={18} color={T.copper} />
            <Text style={s.pickBtnText}>{picked.length ? 'Change yarn (yarn master)' : 'Select from yarn master'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.field, !phone && { flex: 2 }]}>
          <Text style={s.label}>City in India <Text style={s.optional}>(optional)</Text></Text>
          <View style={[s.inputBox, !!cityError && { borderColor: T.red }]}>
            <Icon name="place" size={18} color={T.muted} />
            <TextInput
              ref={cityRef}
              value={city}
              onChangeText={(t) => { setCity(t.replace(/[\r\n]+/g, ' ').slice(0, MAX_CITY_BOX_CHARS)); if (cityError) setCityError(''); }}
              placeholder="e.g. Surat, Mumbai"
              placeholderTextColor={T.muted}
              style={s.input}
              maxLength={MAX_CITY_BOX_CHARS}
              editable={!loading && signedIn}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              onSubmitEditing={() => void runSearch()}
              onKeyPress={(e: any) => { if (Platform.OS === 'web') onEnter(e, () => void runSearch()); }}
              accessibilityLabel="City"
            />
            {city.length > 0 && !loading ? (
              <TouchableOpacity onPress={() => setCity('')} hitSlop={HIT} accessibilityLabel="Clear city">
                <Icon name="close" size={18} color={T.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          {cityError
            ? <Text style={s.fieldError}>{cityError}</Text>
            : <Text style={s.hint}>Only cities of India. For several cities put a comma between them (max {MAX_CITIES}). Empty = all India.</Text>}
          <ValueChips values={cityList} max={MAX_CITIES} />
        </View>

        <TouchableOpacity
          style={[s.searchBtn, phone && { alignSelf: 'stretch', marginTop: 0 }, (loading || !signedIn) && { opacity: 0.55 }]}
          onPress={() => void runSearch()}
          disabled={loading || !signedIn}
          accessibilityRole="button"
          accessibilityLabel="Find vendors"
        >
          <Icon name="travel-explore" size={19} color="#fff" />
          <Text style={s.searchBtnText}>Find vendors</Text>
        </TouchableOpacity>
      </View>

      {picked.length ? (
        <View style={s.pickedWrap} testID="picked-yarns">
          <Text style={s.examplesLabel}>SELECTED FROM THE YARN MASTER · every detail below goes to the AI</Text>
          {picked.map((y) => (
            <View key={y.itmcode} style={s.picked}>
              <View style={s.pickedHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.pickedName} numberOfLines={2}>{y.name}</Text>
                  <Text style={s.pickedCode}>#{y.itmcode} · {y.kind}{y.is_sub ? ' · sub item' : ''}</Text>
                </View>
                {!loading ? (
                  <TouchableOpacity onPress={openPicker} hitSlop={HIT} accessibilityLabel="Change yarn">
                    <Text style={s.pickedLink}>Change</Text>
                  </TouchableOpacity>
                ) : null}
                {!loading ? (
                  <TouchableOpacity onPress={() => selectYarn(null)} hitSlop={HIT} accessibilityLabel={`Remove ${y.name}`}>
                    <Icon name="close" size={18} color={T.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={s.pickedStats}>
                {yarnStats(y).map(([k, v]) => (
                  <Text key={k} style={s.pickedStat}><Text style={s.pickedK}>{k}: </Text>{v}</Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {(itemList.length + picked.length) * Math.max(1, cityList.length) > 1 && !loading ? (
        <Text style={s.pairs}>
          {itemList.length + picked.length} {itemList.length + picked.length === 1 ? 'item' : 'items'} x {cityList.length || 1} {cityList.length > 1 ? 'cities' : cityList.length === 1 ? 'city' : 'area (all India)'} = {(itemList.length + picked.length) * Math.max(1, cityList.length)} combinations in one search. Fewer combinations give more parties for each.
        </Text>
      ) : null}

      {!result && !loading ? (
        <View style={s.examples}>
          <Text style={s.examplesLabel}>Try</Text>
          {ITEM_EXAMPLES.map((ex) => (
            <TouchableOpacity key={ex} style={s.example} onPress={() => { setItem(ex); setItemError(''); }} disabled={!signedIn}>
              <Text style={s.exampleText}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {!signedIn ? (
        <View style={s.warn}>
          <Icon name="link-off" size={18} color={T.pd} />
          <Text style={s.warnText}>Your login session was not found. Please sign in again.</Text>
        </View>
      ) : null}
    </View>
  );

  const progress = loading && searching ? (
    <View style={[s.card, S.card, s.centerCard]}>
      <ActivityIndicator size="large" color={T.copper} />
      <Text style={s.bigTitle}>Searching the web…</Text>
      <Text style={s.centerText}>
        Finding parties that sell <Text style={s.bold}>{searching.item}</Text> in <Text style={s.bold}>{searching.area}</Text>.{searching.item.includes(',') || searching.area.includes(',') ? ' Every item is covered in every city.' : ''}
      </Text>
      <Text style={s.timer}>{clock(elapsed)}</Text>
      <Text style={s.hintCenter}>This usually takes 30 seconds to 2 minutes. Keep this screen open.</Text>
      <TouchableOpacity style={s.ghostBtn} onPress={cancel} accessibilityRole="button" accessibilityLabel="Cancel search">
        <Icon name="close" size={16} color={T.red} />
        <Text style={[s.ghostBtnText, { color: T.red }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const errorBox = error && !loading ? (
    <View style={[s.card, s.errorCard]}>
      <Icon name="error-outline" size={22} color={T.red} />
      <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity style={[s.ghostBtn, { alignSelf: 'flex-start', borderColor: T.red }]} onPress={() => void runSearch()}>
          <Icon name="refresh" size={16} color={T.red} />
          <Text style={[s.ghostBtnText, { color: T.red }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

  const emptyResult = result && result.status !== 'ok' ? (
    <View style={[s.card, S.card, s.centerCard]}>
      <Icon name={result.status === 'no_results' ? 'search-off' : 'block'} size={40} color={T.border} />
      <Text style={s.bigTitle}>
        {result.status === 'not_yarn_item' ? 'Not a yarn item'
          : result.status === 'invalid_city' ? 'City not recognised'
            : 'No parties found'}
      </Text>
      <Text style={s.centerText}>
        {result.status === 'not_yarn_item'
          ? `"${result.item}" ${result.items.length > 1 ? 'do' : 'does'} not look like ${result.items.length > 1 ? 'yarn items' : 'a yarn item'}. This screen only finds vendors of yarn items.`
          : result.status === 'invalid_city'
            ? `"${result.city}" ${result.cities.length > 1 ? 'were' : 'was'} not recognised as ${result.cities.length > 1 ? 'places' : 'a place'} in India. Only Indian cities can be searched — check the spelling, or leave the city empty for all India.`
            : `No party with a traceable web listing was found for "${result.item}" in ${result.area}. Try a more common item name${result.city ? ', or leave the city empty' : ''}.`}
      </Text>
      {result.status === 'no_results' ? <View style={{ alignSelf: 'stretch', gap: 10 }}><SpecsSent result={result} /><PromptBox result={result} /><SkippedNotes result={result} /><CoverageTable result={result} /></View> : null}
    </View>
  ) : null;

  const okResult = result && result.status === 'ok' && sheet ? (
    <View style={{ gap: 10 }}>
      {/* summary + actions */}
      <View style={[s.card, S.card]}>
        <View style={[s.summary, phone && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.eyebrow}>{result.vendors.length} {result.vendors.length === 1 ? 'PARTY' : 'PARTIES'} · {(searchedCities(result).join(', ') || result.area).toUpperCase()}</Text>
            <Text style={s.summaryTitle} numberOfLines={3}>{searchedItems(result).join(', ') || result.item}</Text>
            <Text style={s.summaryMeta}>{result.searchedAt ? `Searched ${prettyStamp(result.searchedAt)}` : ''}{result.firstSearchedAt && result.firstSearchedAt !== result.searchedAt ? ` · list started ${prettyStamp(result.firstSearchedAt)}` : ''}</Text>
          </View>
          <TouchableOpacity
            style={[s.downloadBtn, saving && { opacity: 0.6 }]}
            onPress={() => void save()}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Download Excel"
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="file-download" size={19} color="#fff" />}
            <Text style={s.downloadText}>{Platform.OS === 'web' ? 'Download Excel' : 'Save / share Excel'}</Text>
          </TouchableOpacity>
        </View>

        <SavedNote result={result} onAgain={() => void runSearch(undefined, true)} busy={loading} />
        <SpecsSent result={result} />
        {/* <PromptBox result={result} /> */}
        <SkippedNotes result={result} />
        <CoverageTable result={result} />

        {result.note ? <Text style={s.note}>{result.note}</Text> : null}

        <View style={s.notice}>
          <Icon name="info-outline" size={16} color={T.pd} />
          <Text style={s.noticeText}>{NOTICE}</Text>
        </View>

        <View style={s.toggleRow}>
          <View style={s.toggle}>
            {(['excel', 'cards'] as View2[]).map((v) => (
              <TouchableOpacity key={v} style={[s.toggleBtn, activeView === v && s.toggleOn]} onPress={() => setView(v)} accessibilityRole="button">
                <Icon name={v === 'excel' ? 'grid-on' : 'view-agenda'} size={15} color={activeView === v ? '#fff' : T.nav} />
                <Text style={[s.toggleText, activeView === v && { color: '#fff' }]}>{v === 'excel' ? 'Excel preview' : 'Cards'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fileName} numberOfLines={1}>{excelFileName(result)}</Text>
        </View>
      </View>

      {activeView === 'excel' ? <SheetPreview sheet={sheet} /> : (
        <View style={[s.cardGrid, !phone && { flexDirection: 'row', flexWrap: 'wrap' }]}>
          {result.vendors.map((v, i) => (
            <View key={`${v.party_name}-${i}`} style={phone ? null : { width: width >= 1180 ? '33.33%' : '50%', padding: 5 }}>
              <VendorCard vendor={v} index={i} showItem={searchedItems(result).length > 1} showArea={searchedCities(result).length > 1} />
            </View>
          ))}
        </View>
      )}
    </View>
  ) : null;

  const intro = !result && !loading && !error ? (
    <View style={s.intro}>
      <View style={s.introIcon}><Icon name="travel-explore" size={26} color="#fff" /></View>
      <Text style={s.bigTitle}>Find yarn vendors</Text>
      <Text style={s.centerText}>
        Enter a yarn item and, if you want, a city of India. You get a list of parties selling it — party name, what
        they call the item, rate, contact and address — as an Excel sheet you can preview and download. Several items
        or cities: put a comma between them.
      </Text>
      <Text style={s.hintCenter}>Nothing is saved. The list clears when you leave this screen.</Text>
    </View>
  ) : null;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.page}>
          {form}
          {progress}
          {errorBox}
          {emptyResult}
          {okResult}
          {intro}
        </View>
      </ScrollView>
      <YarnPicker
        visible={pickerOpen}
        master={master}
        loading={masterLoading}
        error={masterErr}
        onReload={() => void loadMaster()}
        selected={picked[0] || null}
        canAdd={picked.length > 0 || room > 0}
        onSelect={selectYarn}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

/* ------------------------------ small pieces ------------------------------ */
/** The values a box currently holds, shown as chips once there is more than one. */
function ValueChips({ values, max }: { values: string[]; max: number }) {
  if (values.length < 2) return null;
  return (
    <View style={s.chips}>
      {values.map((v, i) => (
        <Text key={`${v}-${i}`} style={[s.chip, i >= max && s.chipOver]} numberOfLines={1}>{v}</Text>
      ))}
    </View>
  );
}

/** Values that were entered but not searched, and items whose search failed. */
/** the same search returns its saved list (a web search finds different pages each time); "again" adds new parties */
function SavedNote({ result, onAgain, busy }: { result: SearchResult; onAgain: () => void; busy: boolean }) {
  return (
    <View style={s.savedBox}>
      <Text style={s.savedText}>
        {result.fromSaved
          ? `Saved list of ${prettyStamp(result.searchedAt)} — the same search always shows this same list. `
          : result.added > 0 ? `${result.added} new ${result.added === 1 ? 'party' : 'parties'} added to the saved list. ` : 'This list is saved: the same search shows it again. '}
        "Search the web again" runs a new web search and only ADDS the new parties — nothing found earlier is dropped.
      </Text>
      <TouchableOpacity onPress={onAgain} disabled={busy} style={[s.ghostBtn, { alignSelf: 'flex-start' }, busy && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel="Search the web again">
        <Icon name="travel-explore" size={16} color={T.nav} />
        <Text style={s.ghostBtnText}>Search the web again</Text>
      </TouchableOpacity>
    </View>
  );
}

/** the whole question the AI got — to check what was asked */
function PromptBox({ result }: { result: SearchResult }) {
  const [open, setOpen] = useState(false);
  if (!result.prompt) return null;
  return (
    <View style={s.promptBox} testID="ai-prompt">
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityRole="button" accessibilityLabel="AI prompt">
        <Icon name={open ? 'expand-less' : 'expand-more'} size={18} color={T.nav} />
        <Text style={s.specHead}>AI PROMPT · WHAT WAS ASKED{result.prompt.model ? ` · ${result.prompt.model}` : ''}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={{ gap: 8, marginTop: 6 }}>
          <Text style={s.promptLbl}>MESSAGE (items, cities, yarn details)</Text>
          <Text style={s.promptText} selectable>{result.prompt.user}</Text>
          <Text style={s.promptLbl}>RULES (system prompt of the server)</Text>
          <Text style={s.promptText} selectable>{result.prompt.system}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** what the AI got for a yarn selected from the master — every detail, as the server read it from the master */
function SpecsSent({ result }: { result: SearchResult }) {
  if (!result.specs.length) return null;
  return (
    <View style={s.specBox} testID="specs-sent">
      <Text style={s.specHead}>SENT TO THE AI · FROM THE YARN MASTER</Text>
      {result.specs.map((x) => (
        <Text key={x.item} style={s.specText}><Text style={{ fontWeight: '800' }}>{x.item}: </Text>{x.spec}</Text>
      ))}
    </View>
  );
}

function SkippedNotes({ result }: { result: SearchResult }) {
  const lines: string[] = [];
  if (result.skippedItems.length) lines.push(`Not searched — not a yarn item: ${result.skippedItems.join(', ')}`);
  if (result.skippedCities.length) lines.push(`Not searched — not a city of India: ${result.skippedCities.join(', ')}`);
  if (result.failedItems.length) lines.push(`Search could not be completed for: ${result.failedItems.join(', ')}. Search these again.`);
  if (!lines.length) return null;
  return (
    <View style={s.skipped}>
      <Icon name="error-outline" size={16} color={T.red} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {lines.map((line) => <Text key={line} style={s.skippedText}>{line}</Text>)}
      </View>
    </View>
  );
}

/**
 * Results by item and city: one row per item, one column per city, the number
 * of parties each combination gave — so it is clear every item was searched in
 * every city. Shown only when more than one combination was asked for.
 */
function CoverageTable({ result }: { result: SearchResult }) {
  const cov = result.coverage;
  if (cov.length < 2) return null;
  const items = Array.from(new Set(cov.map((x) => x.item)));
  const areas = Array.from(new Set(cov.map((x) => x.area)));
  const find = (item: string, area: string): Coverage | undefined => cov.find((x) => x.item === item && x.area === area);
  const cellOf = (x?: Coverage) => {
    if (!x) return { text: '', color: T.muted, bg: 'transparent' };
    if (x.status === 'ok') return { text: String(x.count), color: T.green, bg: `${T.green}14` };
    if (x.status === 'no_results') return { text: '0', color: T.muted, bg: T.alt };
    if (x.status === 'failed') return { text: 'Failed', color: T.red, bg: `${T.red}14` };
    if (x.status === 'invalid_city') return { text: 'Not India', color: T.red, bg: `${T.red}0D` };
    return { text: 'Not yarn', color: T.red, bg: `${T.red}0D` };
  };
  const ITEM_W = 170;
  const CELL_W = 96;
  return (
    <View style={s.cov}>
      <Text style={s.covTitle}>RESULTS BY ITEM AND CITY (parties found)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
        <View>
          <View style={s.covRow}>
            <View style={[s.covCell, { width: ITEM_W, alignItems: 'flex-start' }]}><Text style={s.covHead}>Yarn item</Text></View>
            {areas.map((a) => (
              <View key={a} style={[s.covCell, { width: CELL_W }]}><Text style={s.covHead} numberOfLines={2}>{a}</Text></View>
            ))}
          </View>
          {items.map((it) => (
            <View key={it} style={s.covRow}>
              <View style={[s.covCell, { width: ITEM_W, alignItems: 'flex-start' }]}><Text style={s.covItem} numberOfLines={2}>{it}</Text></View>
              {areas.map((a) => {
                const cell = cellOf(find(it, a));
                return (
                  <View key={a} style={[s.covCell, { width: CELL_W }]}>
                    <Text style={[s.covValue, { color: cell.color, backgroundColor: cell.bg }]} numberOfLines={1}>{cell.text}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------ Excel preview ----------------------------- */
// Draws the same SheetSpec that is written to the .xlsx (cell styles included).
const CHAR_W = 7.4;

function SheetPreview({ sheet }: { sheet: ReturnType<typeof buildSheet> }) {
  const widths = sheet.cols.map((w) => Math.round(w * CHAR_W));
  const total = widths.reduce((a, b) => a + b, 0);
  const sourceCol = sheet.cols.length - 1;
  return (
    <View style={[s.sheetWrap, S.card]}>
      <ScrollView horizontal showsHorizontalScrollIndicator persistentScrollbar nestedScrollEnabled>
        <View style={{ width: total }}>
          {sheet.rows.map((row, r) => {
            const titleRow = r < HEADER_ROWS - 1; // merged title / meta rows
            if (titleRow) {
              const st = previewStyle(row[0].s);
              return (
                <View key={r} style={[s.sheetTitleRow, r === HEADER_ROWS - 2 && { height: 8 }]}>
                  {row[0].v !== '' ? (
                    <Text style={{ color: st.color, fontSize: st.size + 1.5, fontWeight: st.bold ? '800' : '500' }} numberOfLines={2}>{String(row[0].v)}</Text>
                  ) : null}
                </View>
              );
            }
            return (
              <View key={r} style={{ flexDirection: 'row' }}>
                {row.map((cell, ci) => {
                  const st = previewStyle(cell.s);
                  const isLink = ci === sourceCol && r >= HEADER_ROWS && typeof cell.v === 'string' && /^https?:\/\//i.test(cell.v);
                  const text = (
                    <Text
                      style={{ color: isLink ? T.blue : st.color, fontSize: st.size + 2, fontWeight: st.bold ? '700' : '400', textAlign: st.align }}
                      numberOfLines={r === HEADER_ROWS - 1 ? 1 : 4}
                    >
                      {String(cell.v)}
                    </Text>
                  );
                  return (
                    <View key={ci} style={[s.sheetCell, { width: widths[ci], backgroundColor: st.bg }]}>
                      {isLink ? <TouchableOpacity onPress={() => open(String(cell.v))}>{text}</TouchableOpacity> : text}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

/* --------------------------------- card ---------------------------------- */
function Line({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <View style={s.line}>
      <Icon name={icon as any} size={15} color={T.muted} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}

function VendorCard({ vendor, index, showItem, showArea }: { vendor: Vendor; index: number; showItem: boolean; showArea: boolean }) {
  const tel = dialable(vendor.contact_no);
  const place = [vendor.city, vendor.state].filter(Boolean).join(', ');
  return (
    <View style={[s.vCard, S.card]}>
      <View style={s.vHead}>
        <View style={s.vNo}><Text style={s.vNoText}>{index + 1}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.vName} numberOfLines={2}>{vendor.party_name}</Text>
          {place ? <Text style={s.vPlace} numberOfLines={1}>{place}</Text> : null}
        </View>
        <View style={[s.rate, !vendor.rate && { backgroundColor: T.alt }]}>
          <Text style={s.rateLabel}>RATE</Text>
          <Text style={[s.rateText, !vendor.rate && { color: T.muted }]} numberOfLines={2}>{vendor.rate || 'Not listed'}</Text>
        </View>
      </View>

      <View style={s.vBody}>
        {(showItem && vendor.searched_item) || (showArea && vendor.searched_area) ? (
          <View style={s.tags}>
            {showItem && vendor.searched_item ? <Text style={s.tag} numberOfLines={1}>{vendor.searched_item}</Text> : null}
            {showArea && vendor.searched_area ? <Text style={[s.tag, s.tagArea]} numberOfLines={1}>{vendor.searched_area}</Text> : null}
          </View>
        ) : null}
        {vendor.party_item_name ? (
          <Line icon="label-outline">
            <Text style={s.k}>Party calls it</Text>
            <Text style={s.v}>{vendor.party_item_name}</Text>
          </Line>
        ) : null}
        <Line icon="call">
          <Text style={s.k}>Contact</Text>
          {vendor.contact_no ? (
            tel ? (
              <TouchableOpacity onPress={() => open(`tel:${tel}`)} accessibilityRole="link" accessibilityLabel={`Call ${vendor.contact_no}`}>
                <Text style={[s.v, { color: T.blue }]}>{vendor.contact_no}</Text>
              </TouchableOpacity>
            ) : <Text style={s.v}>{vendor.contact_no}</Text>
          ) : <Text style={[s.v, { color: T.muted }]}>Not shown on the listing</Text>}
        </Line>
        {vendor.address ? (
          <Line icon="place">
            <Text style={s.k}>Address</Text>
            <Text style={s.v}>{vendor.address}</Text>
          </Line>
        ) : null}
        {vendor.remarks ? (
          <Line icon="notes">
            <Text style={s.k}>Remarks</Text>
            <Text style={s.v}>{vendor.remarks}</Text>
          </Line>
        ) : null}
      </View>

      {vendor.source_url ? (
        <TouchableOpacity style={s.source} onPress={() => open(vendor.source_url)} accessibilityRole="link">
          <Icon name="open-in-new" size={14} color={T.blue} />
          <Text style={s.sourceText} numberOfLines={1}>Source: {hostOf(vendor.source_url) || vendor.source_url}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

const s = StyleSheet.create({
  savedBox: { marginTop: 10, gap: 8, borderWidth: 1, borderColor: T.border, borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  savedText: { fontSize: 12, color: T.ink, lineHeight: 17 },
  promptBox: { marginTop: 10, borderWidth: 1, borderColor: T.border, borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  promptLbl: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
  promptText: { fontSize: 11.5, color: T.ink, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), backgroundColor: T.sub, borderRadius: 6, padding: 8, lineHeight: 16 },
  specBox: { marginTop: 10, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, borderLeftColor: T.copper, borderRadius: 8, padding: 10, backgroundColor: T.sub, gap: 3 },
  specHead: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 0.6 },
  specText: { fontSize: 12.5, color: T.ink, lineHeight: 18 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, borderWidth: 1, borderColor: T.copper, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  pickBtnText: { color: T.copper, fontWeight: '800', fontSize: 12.5 },
  pickedWrap: { marginTop: 12, gap: 8 },
  picked: { borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, borderLeftColor: T.copper, borderRadius: 10, padding: 10, backgroundColor: T.sub, gap: 6 },
  pickedHead: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  pickedName: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  pickedCode: { fontSize: 11, color: T.muted, marginTop: 1 },
  pickedStats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 3 },
  pickedStat: { fontSize: 12, color: T.ink },
  pickedK: { color: T.muted, fontWeight: '700' },
  pickedLink: { color: T.copper, fontWeight: '800', fontSize: 12 },
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, flexGrow: 1 },
  page: { width: '100%', maxWidth: 1200, alignSelf: 'center', gap: 10 },

  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14, gap: 12 },
  centerCard: { alignItems: 'center', paddingVertical: 28, gap: 8 },

  fields: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  field: { minWidth: 0, alignSelf: 'stretch' },
  label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 },
  optional: { fontWeight: '600', textTransform: 'none', letterSpacing: 0 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  input: { flex: 1, minWidth: 0, height: 44, fontSize: 15, color: T.ink, ...(noOutline || {}) },
  hint: { fontSize: 11.5, color: T.muted, marginTop: 4 },
  fieldError: { fontSize: 12, fontWeight: '600', color: T.red, marginTop: 4 },
  searchBtn: { height: 46, marginTop: 20, paddingHorizontal: 18, borderRadius: 10, backgroundColor: T.copper, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  searchBtnText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },

  pairs: { fontSize: 12, lineHeight: 17, fontWeight: '600', color: T.muted },
  cov: { borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.sub, padding: 10, gap: 6 },
  covTitle: { fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  covRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.hair },
  covCell: { paddingHorizontal: 6, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  covHead: { fontSize: 11.5, fontWeight: '800', color: T.nav, textAlign: 'center' },
  covItem: { fontSize: 12.5, fontWeight: '700', color: T.ink },
  covValue: { minWidth: 44, textAlign: 'center', fontSize: 12.5, fontWeight: '800', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  chip: { maxWidth: '100%', fontSize: 11.5, fontWeight: '700', color: T.nav, backgroundColor: T.alt, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, overflow: 'hidden' },
  chipOver: { color: T.red, backgroundColor: `${T.red}14` },
  skipped: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, backgroundColor: `${T.red}0D`, borderWidth: 1, borderColor: `${T.red}44` },
  skippedText: { fontSize: 12.5, lineHeight: 18, color: T.red, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: { maxWidth: '100%', fontSize: 11, fontWeight: '800', color: T.yd, backgroundColor: `${T.yd}14`, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, overflow: 'hidden' },
  tagArea: { color: T.pd, backgroundColor: `${T.amber}1F` },
  examples: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  examplesLabel: { fontSize: 11.5, fontWeight: '700', color: T.muted, marginRight: 2 },
  example: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 16, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub },
  exampleText: { fontSize: 12.5, fontWeight: '600', color: T.nav },

  warn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: `${T.amber}66`, backgroundColor: `${T.amber}14` },
  warnText: { flex: 1, minWidth: 0, fontSize: 12.5, color: T.pd, fontWeight: '600' },

  bigTitle: { fontSize: 17, fontWeight: '800', color: T.nav, textAlign: 'center', marginTop: 4 },
  centerText: { fontSize: 13.5, lineHeight: 20, color: T.muted, textAlign: 'center', maxWidth: 560 },
  bold: { fontWeight: '800', color: T.ink },
  timer: { fontSize: 22, fontWeight: '800', color: T.copper, marginTop: 4 },
  hintCenter: { fontSize: 12, color: T.muted, textAlign: 'center', maxWidth: 520 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, marginTop: 6 },
  ghostBtnText: { fontSize: 13, fontWeight: '700' },

  errorCard: { flexDirection: 'row', alignItems: 'flex-start', borderColor: `${T.red}66`, backgroundColor: `${T.red}0D` },
  errorText: { fontSize: 13.5, lineHeight: 19, fontWeight: '600', color: T.red },

  intro: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 30, gap: 6 },
  introIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },

  summary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: T.copper, letterSpacing: 0.8 },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: T.nav, marginTop: 2 },
  summaryMeta: { fontSize: 12, color: T.muted, marginTop: 2 },
  downloadBtn: { height: 46, paddingHorizontal: 18, borderRadius: 10, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  downloadText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  note: { fontSize: 13, lineHeight: 19, color: T.ink },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, backgroundColor: `${T.amber}14`, borderWidth: 1, borderColor: `${T.amber}55` },
  noticeText: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 17, color: T.pd, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  toggle: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: 11, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 8 },
  toggleOn: { backgroundColor: T.nav },
  toggleText: { fontSize: 12.5, fontWeight: '700', color: T.nav },
  fileName: { flex: 1, minWidth: 120, fontSize: 11.5, color: T.muted, textAlign: 'right' },

  sheetWrap: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  sheetTitleRow: { paddingHorizontal: 10, paddingVertical: 4, justifyContent: 'center' },
  sheetCell: { paddingHorizontal: 7, paddingVertical: 6, borderRightWidth: 1, borderBottomWidth: 1, borderColor: T.border, justifyContent: 'flex-start' },

  cardGrid: { gap: 10 },
  vCard: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden', flex: 1 },
  vHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.hair },
  vNo: { width: 26, height: 26, borderRadius: 13, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  vNoText: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
  vName: { fontSize: 14.5, fontWeight: '800', color: T.ink },
  vPlace: { fontSize: 12, color: T.muted, marginTop: 1 },
  rate: { maxWidth: 130, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: `${T.green}14`, alignItems: 'flex-end' },
  rateLabel: { fontSize: 9, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  rateText: { fontSize: 13, fontWeight: '800', color: T.green, textAlign: 'right' },
  vBody: { padding: 12, gap: 9 },
  line: { flexDirection: 'row', gap: 8 },
  k: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  v: { fontSize: 13.5, lineHeight: 19, fontWeight: '600', color: T.ink, marginTop: 1 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: T.hair },
  sourceText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '600', color: T.blue },
});
