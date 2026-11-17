// FILE: src/components/RollCutScanner/index.tsx
// NEW ERP — Roll Cut Scanner  (txntype 'roll_cut_scanner').
//
//   SCAN   : [Scan QR] -> Beam No + Taka No text boxes fill from the QR -> [Save] -> POST { prpcode, yearno, scannedString }
//            two ways to scan: phone CAMERA or a SCANNER GUN (USB / Bluetooth / handheld) — see GunScanner.tsx
//   OFFLINE: no network -> Save keeps the scan on the device (offline/queue.ts) and it uploads by itself, one by one,
//            when the network is back. Property + Beam lists come from the copy saved after login (offline/masters.ts).
//   LIST   : filters Property · From date · To date · Beam No  -> how many scans were done + the scanned takas
//            + search box (taka / beam / design / grade ...) and lazy loading (rows are shown PAGE_SIZE at a time while scrolling)
//
// Phone : two tabs (Scan / Scanned List).   Web / tablet (>= 980 px) : both side by side.
// `token` and `API` come from ErpSessionGate (same as every other NEW ERP module).
import AppAlert from '@/common/utils/appAlert';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { createRollCutApi, errMsg, fmtApiDate, fmtShowDate, getCurrentFinancialYear, isNetErr, normalizeQrText, parseQr, str, type Opt, type QrData } from './api';
import { useRollCutCriteria } from './criteria';
import DateField from './DateField';
import GunScanner from './GunScanner';
import { listKey, readList, saveList } from './offline/listCache';
import { fetchRollCutBeams, getMasters, loadMastersStatus, prefetchMasters } from './offline/masters';
import { isOnline, reportReachable, useOnline } from './offline/network';
import { enqueue, initQueue, isQueued, syncNow, useQueue } from './offline/queue';
import { fmtWhen, makeScope, readJson, writeJson } from './offline/storage';
import { OfflineBar, PendingQueue } from './OfflineStatus';
import ScanCamera from './ScanCamera';
import SelectField from './SelectField';

type Props = { token: string; API: string; username?: string };
type ScanMode = 'camera' | 'gun';
const PREFS_KEY = 'rollcut_prefs_v1'; // remembered per device: scan mode + auto save

/** small vibration on phones: the worker looks at the taka, not at the screen */
function feedback(ok: boolean) {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const H = require('expo-haptics');
    void H.notificationAsync(ok ? H.NotificationFeedbackType.Success : H.NotificationFeedbackType.Error).catch(() => undefined);
  } catch {
    /* no haptics on this device */
  }
}
const PAGE_SIZE = 30; // rows rendered per lazy-load step
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function RollCutScanner({ token, API, username }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const api = useMemo(() => createRollCutApi(API, token), [API, token]);

  /* ------------------------------- offline ------------------------------- */
  const scope = useMemo(() => makeScope(API, username || 'User'), [API, username]);
  const online = useOnline();
  const queue = useQueue();
  const pendingCount = queue.items.length;
  const syncQueue = useCallback(() => void syncNow({ API, token }), [API, token]);

  const [tab, setTab] = useState<'scan' | 'list'>('scan');
  const [camOpen, setCamOpen] = useState(false);

  /* ----------------------------- scan state ------------------------------ */
  const [raw, setRaw] = useState('');
  const [qr, setQr] = useState<QrData | null>(null);
  const [saving, setSaving] = useState(false);
  const [failMsg, setFailMsg] = useState('');
  const [lastSaved, setLastSaved] = useState<{ beam: string; taka: string; at: string; offline: boolean } | null>(null);
  const [mode, setMode] = useState<ScanMode>('camera');
  const [autoSave, setAutoSave] = useState(true); // scanner gun: save right after the scan (no Save tap)
  const gunChain = useRef<Promise<any>>(Promise.resolve()); // gun scans are saved strictly one after another

  /* ----------------------------- list state ------------------------------ */
  const [prpCode, setPrpCode] = useState('');
  const [fromDate, setFromDate] = useState(startOfDay(new Date()));
  const [toDate, setToDate] = useState(startOfDay(new Date()));
  const [beamFilter, setBeamFilter] = useState('');
  const [beamList, setBeamList] = useState<Opt[]>([]);
  const [beamLoading, setBeamLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [listNote, setListNote] = useState(''); // "showing the saved list" when offline
  const [loaded, setLoaded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true); // open at start, closes after Show list, tap header to open again
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const c = useRollCutCriteria({ token, API, scope, onAutoProperty: (code) => setPrpCode((p) => p || code) });
  const prptype = c.prptype;

  // The app-level helper (RollCutOfflineBoot) already does this after login; repeating it here makes the
  // screen self-sufficient: queue loaded, waiting scans uploaded, Property + Beam lists refreshed.
  useEffect(() => {
    if (!token || !API) return;
    let alive = true;
    (async () => {
      await initQueue(scope);
      if (!alive) return;
      if (prptype) await loadMastersStatus(scope, prptype);
      if (!alive || !online) return;
      await syncNow({ API, token });
      if (alive && prptype) void prefetchMasters({ API, token, prptype, scope });
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [API, token, scope, prptype, online]);

  // remembered scan mode / auto save
  useEffect(() => {
    let alive = true;
    void readJson<{ mode?: ScanMode; autoSave?: boolean }>(PREFS_KEY, {}).then((p) => {
      if (!alive) return;
      if (p.mode === 'gun' || p.mode === 'camera') setMode(p.mode);
      if (typeof p.autoSave === 'boolean') setAutoSave(p.autoSave);
    });
    return () => {
      alive = false;
    };
  }, []);
  const changeMode = (m: ScanMode) => {
    setMode(m);
    void writeJson(PREFS_KEY, { mode: m, autoSave });
  };
  const changeAutoSave = (v: boolean) => {
    setAutoSave(v);
    void writeJson(PREFS_KEY, { mode, autoSave: v });
  };

  /* ------------------------------ beam list ------------------------------ */
  const loadBeams = useCallback(() => {
    setBeamList([]);
    if (!prpCode || !prptype) return () => {};
    let alive = true;
    setBeamLoading(true);
    (async () => {
      // 1) beams of this property saved on the device -> usable at once, with or without network
      const saved = (await getMasters(scope, prptype)).beams[prpCode];
      if (alive && saved) setBeamList(saved.list);
      // 2) live list when online (also refreshes the saved copy)
      if (!isOnline()) return;
      try {
        const l = await fetchRollCutBeams({ API, token, prptype, scope }, prpCode);
        if (alive) setBeamList(l);
      } catch {
        /* keep the saved copy */
      }
    })().finally(() => alive && setBeamLoading(false));
    return () => {
      alive = false;
    };
    // `online`: reload by itself when the network comes back
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token, scope, prpCode, prptype, online]);
  useEffect(() => loadBeams(), [loadBeams]);

  const beamOpts: Opt[] = useMemo(() => [{ label: 'All beams', value: '' }, ...beamList], [beamList]);

  /* -------------------------------- list --------------------------------- */
  const loadList = useCallback(async () => {
    if (!prpCode) { setListError('Select a property.'); return 0; }
    if (!prptype) { setListError('Property group (prptype) not found for this login — please re-login.'); return 0; }
    setListError('');
    setListNote('');
    setListLoading(true);
    const key = listKey(prpCode, beamFilter, fmtApiDate(fromDate), fmtApiDate(toDate));
    // no network: the same filter, as it was the last time it was opened online
    const fromDevice = async () => {
      const hit = await readList(scope, key);
      if (!hit) {
        setRows([]);
        setLoaded(false);
        setListError('No network — this list was not opened before on this device. Your offline scans are safe under “Offline scans” on the Scan tab.');
        return 0;
      }
      setRows(hit.rows);
      setLoaded(true);
      setListNote(`Offline — list as saved at ${fmtWhen(hit.at)}. Scans made offline appear here after they upload.`);
      return hit.rows.length;
    };
    try {
      if (!isOnline()) return await fromDevice();
      const r = await api.list({ prptype, prpCode, beamNo: beamFilter, from: fromDate, to: toDate });
      reportReachable(true);
      const list = Array.isArray(r) ? r : [];
      setRows(list);
      setLoaded(true);
      void saveList(scope, key, list);
      return list.length; // number of cards that will show
    } catch (e: any) {
      if (isNetErr(e)) {
        reportReachable(false);
        return await fromDevice();
      }
      setRows([]);
      setListError(errMsg(e, 'Could not load the list.'));
      return 0;
    } finally {
      setListLoading(false);
    }
  }, [api, scope, prpCode, prptype, beamFilter, fromDate, toDate]);

  // NOTE: the list API is called ONLY when the user taps 'Show list' (or pulls to refresh) — never automatically.

  const changeFrom = (d: Date) => {
    setFromDate(d);
    if (d > toDate) setToDate(d);
  };
  const changeTo = (d: Date) => {
    setToDate(d);
    if (d < fromDate) setFromDate(d);
  };

  /* ---------------------- search + lazy loading (client side) ---------------------- */
  // debounce typing so 20k+ rows are not re-filtered on every key
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // keep the original serial number (newest = highest) even when the list is filtered
  const numbered = useMemo(() => rows.map((r, i) => ({ r, no: rows.length - i })), [rows]);

  const filtered = useMemo(() => {
    if (!search) return numbered;
    const words = search.split(/\s+/).filter(Boolean);
    return numbered.filter(({ r }) => {
      const hay = [r?.TakaNo, r?.BeamNo, r?.DsnName, r?.OrdDsnName, r?.GrdName, r?.Qty, r?.Wt, r?.ChkDate, r?.ScanDate, r?.EntryDate, r?.CrtDate]
        .map((v) => str(v).toLowerCase())
        .join(' ');
      return words.every((w) => hay.includes(w));
    });
  }, [numbered, search]);

  // new data / new search -> start again from the first page
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [rows, search]);

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);
  const hasMore = visible < filtered.length;
  const loadMore = useCallback(() => {
    setVisible((v) => (v < filtered.length ? v + PAGE_SIZE : v));
  }, [filtered.length]);

  /* ------------------------------- delete -------------------------------- */
  const deleteRow = useCallback(
    async (row: any) => {
      const needNet = () => AppAlert.alert('No network', 'A scan that is already on the server can be deleted only with network. Please try again when you are online.');
      if (!isOnline()) {
        needNet();
        return false;
      }
      try {
        const r = await api.remove({ prpcode: prpCode, yearno: getCurrentFinancialYear(), row });
        if (r?.success !== true) {
          AppAlert.alert('Error', r?.message || 'Delete failed');
          return false;
        }
        setRows((list) => list.filter((x) => x !== row));
        AppAlert.alert('Success', r?.message || 'Delete successfully');
        return true;
      } catch (e: any) {
        if (isNetErr(e)) {
          reportReachable(false);
          needNet();
          return false;
        }
        AppAlert.alert('Error', errMsg(e, 'Delete failed'));
        return false;
      }
    },
    [api, prpCode],
  );

  /* -------------------------------- scan --------------------------------- */
  const clearScan = () => {
    setRaw('');
    setQr(null);
    setFailMsg('');
  };

  /**
   * Save one scan.  online -> server (as before).  no network -> offline queue on the device.
   * `quiet` = scanner gun: no popup that needs a tap, the result is shown on the screen (+ vibration).
   */
  const saveOne = useCallback(
    async (q: QrData, text: string, quiet: boolean) => {
      const stamp = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const item = { raw: text, prpcode: q.prpcode, yearno: q.yearno || getCurrentFinancialYear(), beamno: q.beamno, takano: q.takano };
      const fail = (m: string) => {
        setLastSaved(null);
        setFailMsg(m);
        feedback(false);
        if (!quiet) AppAlert.alert('Error', m);
      };
      const done = (offline: boolean) => {
        setFailMsg('');
        setLastSaved({ beam: q.beamno, taka: q.takano, at: stamp(), offline });
        setRaw('');
        setQr(null);
        feedback(true);
      };
      const keepOnDevice = async () => {
        // the server cannot check this scan now -> check here what it would refuse for sure
        if (!item.prpcode || !str(q.beamuid)) return fail('This QR has no property / beam id — it cannot be saved offline. Scan it again when you are online.');
        const r = await enqueue(item);
        if (r === 'queued') return done(true);
        if (r === 'duplicate') return fail(`Taka ${q.takano} is already saved offline and waiting to upload.`);
        return fail('Could not save on this device (storage full). Please do not scan more until the network is back.');
      };

      setSaving(true);
      setFailMsg('');
      try {
        if (!isOnline()) return await keepOnDevice();
        if (isQueued(item)) return fail(`Taka ${q.takano} is already saved offline and waiting to upload.`);
        const r = await api.save({ prpcode: item.prpcode, yearno: item.yearno, scannedString: text });
        reportReachable(true);
        if (r?.success === true) done(false);
        else fail(r?.message || 'Save failed');
      } catch (e: any) {
        if (isNetErr(e)) {
          // network dropped during the save -> keep it; if the server did receive it, the later upload
          // gets "Duplicate TakaNo" and is simply marked as already on the server (never saved twice)
          reportReachable(false);
          await keepOnDevice();
        } else {
          fail(errMsg(e, 'Save failed'));
        }
      } finally {
        setSaving(false);
      }
    },
    [api],
  );

  const onScan = (value: string, source: ScanMode = 'camera') => {
    setCamOpen(false);
    const clean = normalizeQrText(value);
    const parsed = clean ? parseQr(clean) : null;
    if (!clean || !parsed) {
      clearScan();
      setLastSaved(null);
      if (source === 'gun') {
        setFailMsg('QR format not valid — scan the taka QR again');
        feedback(false);
      } else {
        AppAlert.alert('Invalid QR', 'QR format not valid');
      }
      return;
    }
    setRaw(clean);
    setQr(parsed);
    setFailMsg('');
    if (source === 'gun' && autoSave) {
      gunChain.current = gunChain.current.then(() => saveOne(parsed, clean, true)).catch(() => undefined);
    }
  };

  const onSave = () => {
    if (saving) return;
    if (!qr || !raw) return AppAlert.alert('Scan required', 'Please scan the taka QR first.');
    void saveOne(qr, raw, false);
  };

  /* ------------------------------- panels -------------------------------- */
  const ready = !!qr;
  const gun = mode === 'gun';

  const scanPanel = (
    <View style={st.panelPad}>
      <View style={st.card}>
        <View style={st.modeRow}>
          {([['camera', 'Camera', 'photo-camera'], ['gun', 'Scanner gun', 'barcode-reader']] as const).map(([k, label, icon]) => {
            const on = mode === k;
            return (
              <TouchableOpacity key={k} activeOpacity={0.8} style={[st.modeBtn, on && st.modeBtnOn]} onPress={() => changeMode(k)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Icon name={icon} size={17} color={on ? '#fff' : T.nav} />
                <Text style={[st.modeText, on && { color: '#fff' }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={st.scanTop}>
          <TouchableOpacity
            activeOpacity={gun ? 1 : 0.85}
            style={[st.scanBtn, gun && st.scanBtnGun, ready && st.scanBtnOk, !!failMsg && st.scanBtnFail]}
            onPress={gun ? undefined : () => setCamOpen(true)}
            disabled={gun}
            accessibilityRole={gun ? 'image' : 'button'}
            accessibilityLabel="Scan QR"
          >
            {saving && gun ? <ActivityIndicator color="#fff" size="large" /> : <Icon name={failMsg ? 'close' : ready ? 'check' : gun ? 'barcode-reader' : 'qr-code-scanner'} size={44} color="#fff" />}
          </TouchableOpacity>
          <Text style={st.scanTitle}>{failMsg ? (ready ? 'Save failed' : 'Not saved') : ready ? 'QR scanned' : 'Scan taka QR'}</Text>
          <Text style={st.scanHint}>
            {failMsg
              ? failMsg
              : ready
                ? 'Check the details below and press Save'
                : gun
                  ? autoSave
                    ? 'Scan with the gun — every taka is saved automatically'
                    : 'Scan with the gun, check the details, then press Save'
                  : 'Tap the button and point the camera at the QR code'}
          </Text>
          {!gun ? (
            <TouchableOpacity style={st.rescan} onPress={() => setCamOpen(true)} accessibilityRole="button">
              <Icon name={ready ? 'refresh' : 'photo-camera'} size={15} color={T.copper} />
              <Text style={st.rescanText}>{ready ? 'Scan again' : 'Open camera'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {gun ? (
          <>
            <GunScanner active={!camOpen} onScan={(v) => onScan(v, 'gun')} />
            <View style={st.autoRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.autoTitle}>Auto save</Text>
                <Text style={st.autoSub}>Save right after every gun scan</Text>
              </View>
              <Switch value={autoSave} onValueChange={changeAutoSave} trackColor={{ true: T.green, false: T.border }} thumbColor="#fff" accessibilityLabel="Auto save" />
            </View>
          </>
        ) : null}

        <ReadBox label="Beam No" icon="view-column" value={qr?.beamno || ''} onClear={ready ? clearScan : undefined} />
        <ReadBox label="Taka No" icon="confirmation-number" value={qr?.takano || ''} />

        <TouchableOpacity
          activeOpacity={0.85}
          style={[st.saveBtn, !ready && !saving && st.saveBtnOff, saving && { opacity: 0.8 }]}
          onPress={onSave}
          disabled={!ready || saving}
          accessibilityRole="button"
          accessibilityLabel="Save"
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Icon name={failMsg ? 'cancel' : 'check-circle'} size={22} color={ready ? '#fff' : T.muted} />}
          <Text style={[st.saveText, !ready && !saving && { color: T.muted }]}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      {failMsg ? (
        <View style={st.failBox}>
          <View style={st.failIcon}><Icon name="close" size={18} color="#fff" /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.failTitle}>Not saved</Text>
            <Text style={st.okSub} numberOfLines={2}>{failMsg}</Text>
          </View>
        </View>
      ) : null}

      {lastSaved ? (
        <View style={[st.okBox, lastSaved.offline && st.offBox]}>
          <View style={[st.okIcon, lastSaved.offline && { backgroundColor: T.amber }]}><Icon name={lastSaved.offline ? 'offline-pin' : 'check'} size={18} color="#fff" /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[st.okTitle, lastSaved.offline && { color: T.amber }]}>{lastSaved.offline ? 'Saved offline — uploads automatically' : 'Saved successfully'}</Text>
            <Text style={st.okSub} numberOfLines={1}>Beam {lastSaved.beam} · Taka {lastSaved.taka} · {lastSaved.at}</Text>
          </View>
        </View>
      ) : null}

      <PendingQueue online={online} onSync={syncQueue} />
    </View>
  );

  const listHeader = (
    <View>
      <View style={st.card}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[st.filterHead, !filtersOpen && { marginBottom: 0 }]}
          onPress={() => setFiltersOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: filtersOpen }}
          accessibilityLabel="Toggle filters"
        >
          <Icon name="tune" size={17} color={T.copper} />
          <Text style={st.filterTitle}>Filters</Text>
          {!filtersOpen ? (
            <Text style={st.filterSummary} numberOfLines={1}>
              {fmtShowDate(fromDate)} – {fmtShowDate(toDate)}{beamFilter ? ` · Beam ${beamFilter}` : ''}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Icon name={filtersOpen ? 'expand-less' : 'expand-more'} size={24} color={T.muted} />
        </TouchableOpacity>
        {filtersOpen ? (
        <>
        <View style={st.grid}>
          <SelectField
            label="Property"
            required
            icon="apartment"
            value={prpCode}
            options={c.propOpts}
            loading={c.propLoading}
            onRefresh={c.reloadProps}
            onChange={(v) => {
              setPrpCode(v);
              setBeamFilter('');
            }}
          />
          <SelectField
            label="Beam No"
            icon="view-column"
            value={beamFilter}
            options={beamOpts}
            loading={beamLoading}
            onRefresh={loadBeams}
            disabled={!prpCode}
            disabledHint="Select property first"
            onChange={setBeamFilter}
          />
        </View>
        <View style={[st.grid, { marginTop: 12 }]}>
          <DateField label="From date" value={fromDate} onChange={changeFrom} />
          <DateField label="To date" value={toDate} onChange={changeTo} />
        </View>
        {!online ? (
          <Text style={st.offNote}>
            Offline — Property and Beam lists are the copy saved on this device{c.propsAt ? ` (updated ${fmtWhen(c.propsAt)})` : ''}.
          </Text>
        ) : null}
        {c.prptypeMissing ? <Text style={st.err}>Property group (prptype) not found for this login — please re-login.</Text> : null}
        {listError ? <Text style={st.err}>{listError}</Text> : null}
        <TouchableOpacity activeOpacity={0.85} style={[st.loadBtn, listLoading && { opacity: 0.8 }]} onPress={() => { void loadList().then((n) => { if (n > 0) setFiltersOpen(false); }); }} disabled={listLoading} accessibilityRole="button">
          {listLoading ? <ActivityIndicator color="#fff" /> : <Icon name="search" size={18} color="#fff" />}
          <Text style={st.loadText}>{listLoading ? 'Loading…' : 'Show list'}</Text>
        </TouchableOpacity>
        </>
        ) : null}
      </View>

      {loaded && listNote ? (
        <View style={st.noteBox}>
          <Icon name="cloud-off" size={16} color={T.amber} />
          <Text style={st.noteText}>{listNote}</Text>
        </View>
      ) : null}

      {loaded ? (
        <View style={st.searchBox}>
          <Icon name="search" size={19} color={searchInput ? T.copper : T.muted} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search taka no, beam no, design, grade…"
            placeholderTextColor={T.muted}
            style={st.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search scanned list"
          />
          {searchInput ? (
            <TouchableOpacity onPress={() => setSearchInput('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Clear search">
              <Icon name="cancel" size={18} color={T.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {loaded ? (
        <View style={st.countCard}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.countLabel}>{search ? 'MATCHING SCANS' : 'TOTAL SCANS'}</Text>
            <Text style={st.countRange} numberOfLines={1}>
              {fmtShowDate(fromDate)} – {fmtShowDate(toDate)}{beamFilter ? ` · Beam ${beamFilter}` : ''}
            </Text>
          </View>
          <Text style={st.countValue}>{search ? filtered.length : rows.length}</Text>
        </View>
      ) : null}
    </View>
  );

  const listPanel = (
    <FlatList
      data={shown}
      keyExtractor={({ r, no }) => `${str(r?.UId)}_${str(r?.SrNo)}_${str(r?.TakaNo)}_${no}`}
      contentContainerStyle={[st.panelPad, { paddingBottom: 40 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={listLoading && loaded} onRefresh={loadList} colors={[T.copper]} tintColor={T.copper} />}
      ListHeaderComponent={listHeader}
      renderItem={({ item }) => <ScanRow item={item.r} no={item.no} onDelete={deleteRow} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      removeClippedSubviews={Platform.OS !== 'web'}
      ListFooterComponent={
        loaded && filtered.length > 0 ? (
          <View style={st.footer}>
            {hasMore ? <ActivityIndicator color={T.copper} /> : null}
            <Text style={st.footerText}>
              {hasMore ? `Showing ${shown.length} of ${filtered.length} · scroll for more` : `Showing all ${filtered.length}`}
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        listLoading ? null : (
          <View style={st.empty}>
            <View style={st.emptyIcon}><Icon name="qr-code-2" size={30} color={T.copper} /></View>
            <Text style={st.emptyTitle}>{loaded ? (search ? 'No match found' : 'No scans found') : 'No data yet'}</Text>
            <Text style={st.emptyText}>{loaded ? (search ? `Nothing matches "${searchInput.trim()}".` : 'Nothing was scanned for these filters.') : 'Select a property and tap Show list.'}</Text>
          </View>
        )
      }
    />
  );

  return (
    <View style={st.screen}>
      <OfflineBar online={online} onSync={syncQueue} />
      {wide ? (
        <View style={st.split}>
          <ScrollView style={st.left} keyboardShouldPersistTaps="handled">{scanPanel}</ScrollView>
          <View style={st.right}>{listPanel}</View>
        </View>
      ) : (
        <>
          <View style={st.tabs}>
            {([['scan', 'Scan', 'qr-code-scanner'], ['list', 'Scanned List', 'list-alt']] as const).map(([k, label, icon]) => {
              const on = tab === k;
              return (
                <TouchableOpacity key={k} activeOpacity={0.8} style={[st.tab, on && st.tabOn]} onPress={() => setTab(k)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Icon name={icon} size={18} color={on ? '#fff' : T.nav} />
                  <Text style={[st.tabText, on && { color: '#fff' }]}>{label}</Text>
                  {k === 'list' && loaded ? (
                    <View style={[st.tabBadge, on && { backgroundColor: '#ffffff33' }]}><Text style={[st.tabBadgeText, on && { color: '#fff' }]}>{rows.length}</Text></View>
                  ) : null}
                  {k === 'scan' && pendingCount ? (
                    <View style={[st.tabBadge, { backgroundColor: on ? '#ffffff33' : `${T.amber}22` }]}><Text style={[st.tabBadgeText, { color: on ? '#fff' : T.amber }]}>{pendingCount}</Text></View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
          {tab === 'scan' ? <ScrollView keyboardShouldPersistTaps="handled">{scanPanel}</ScrollView> : <View style={{ flex: 1 }}>{listPanel}</View>}
        </>
      )}

      <ScanCamera visible={camOpen} onClose={() => setCamOpen(false)} onScan={(v) => onScan(v, 'camera')} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function ReadBox({ label, icon, value, onClear }: { label: string; icon: string; value: string; onClear?: () => void }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={st.fieldLabel}>{label}</Text>
      <View style={[st.readBox, !!value && st.readBoxOn]}>
        <Icon name={icon as any} size={19} color={value ? T.copper : T.muted} />
        <TextInput
          value={value}
          editable={false}
          placeholder="Scan to fill"
          placeholderTextColor={T.muted}
          style={st.readInput}
          accessibilityLabel={label}
        />
        {value && onClear ? (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={`Clear ${label}`}>
            <Icon name="cancel" size={18} color={T.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={st.infoK}>{k}</Text>
      <Text style={st.infoV} numberOfLines={1}>{v || '-'}</Text>
    </View>
  );
}

function ScanRow({ item, no, onDelete }: { item: any; no: number; onDelete: (row: any) => Promise<boolean> }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const doDelete = async () => {
    setBusy(true);
    const ok = await onDelete(item);
    if (!ok) {
      setBusy(false);
      setConfirm(false);
    }
  };
  const date = str(item.ChkDate || item.ScanDate || item.EntryDate || item.CrtDate);
  const design = str(item.DsnName || item.OrdDsnName);
  const qty = str(item.Qty);
  const wt = str(item.Wt);
  const grade = str(item.GrdName);
  return (
    <View style={st.row}>
      <View style={st.rowTop}>
        <View style={st.rowNo}><Text style={st.rowNoText}>{no}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.rowLabel}>TAKA NO</Text>
          <Text style={st.rowTaka} numberOfLines={1}>{str(item.TakaNo) || '-'}</Text>
        </View>
        {date ? (
          <View style={st.datePill}>
            <Icon name="event" size={13} color={T.copper} />
            <Text style={st.datePillText}>{date}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.7}
          style={st.delBtn}
          onPress={() => setConfirm(true)}
          disabled={busy}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Delete scan"
        >
          <Icon name="delete-outline" size={19} color={T.red} />
        </TouchableOpacity>
      </View>
      {confirm ? (
        <View style={st.confirmBar}>
          <Text style={st.confirmText} numberOfLines={2}>Delete taka {str(item.TakaNo)}?</Text>
          <TouchableOpacity activeOpacity={0.8} style={st.confirmNo} onPress={() => setConfirm(false)} disabled={busy}>
            <Text style={st.confirmNoText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={st.confirmYes} onPress={doDelete} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.confirmYesText}>Delete</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={st.rowInfo}>
        <Info k="BEAM NO" v={str(item.BeamNo)} />
        {qty ? <Info k="METER" v={qty} /> : null}
        {wt ? <Info k="WEIGHT" v={wt} /> : null}
        {grade ? <Info k="GRADE" v={grade} /> : null}
      </View>
      {design ? <Text style={st.rowDesign} numberOfLines={1}>Design: {design}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },

  tabs: { flexDirection: 'row', gap: 6, margin: 16, marginBottom: 0, padding: 4, borderRadius: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  tab: { flex: 1, minHeight: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabOn: { backgroundColor: T.nav },
  tabText: { fontSize: 13, fontWeight: '900', color: T.nav },
  tabBadge: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontSize: 11, fontWeight: '900', color: T.copper },

  split: { flex: 1, flexDirection: 'row' },
  left: { width: 420, flexGrow: 0, borderRightWidth: 1, borderRightColor: T.hair, backgroundColor: T.bg },
  right: { flex: 1, minWidth: 0 },
  panelPad: { padding: 16, width: '100%', maxWidth: 900, alignSelf: 'center' },

  card: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 12, ...S.card, shadowOpacity: 0.05, elevation: 1 },

  modeRow: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 12, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, marginBottom: 14 },
  modeBtn: { flex: 1, minHeight: 40, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  modeBtnOn: { backgroundColor: T.nav },
  modeText: { fontSize: 13, fontWeight: '900', color: T.nav },
  scanBtnGun: { backgroundColor: T.nav, shadowColor: T.nav },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: T.hair },
  autoTitle: { fontSize: 13, fontWeight: '900', color: T.nav },
  autoSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  offBox: { borderColor: `${T.amber}66`, backgroundColor: `${T.amber}14` },
  offNote: { fontSize: 12, fontWeight: '700', color: T.amber, marginTop: 12 },
  noteBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: `${T.amber}66`, backgroundColor: `${T.amber}12`, marginBottom: 12 },
  noteText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '700', color: T.ink },

  scanTop: { alignItems: 'center', paddingBottom: 16, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: T.hair },
  scanBtn: { width: 96, height: 96, borderRadius: 28, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', shadowColor: T.copper, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  scanBtnOk: { backgroundColor: T.green, shadowColor: T.green },
  scanTitle: { fontSize: 17, fontWeight: '900', color: T.nav, marginTop: 12 },
  scanHint: { fontSize: 12.5, fontWeight: '600', color: T.muted, marginTop: 4, textAlign: 'center' },
  rescan: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, height: 34, paddingHorizontal: 14, borderRadius: 16, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  rescanText: { fontSize: 12.5, fontWeight: '800', color: T.copper },

  fieldLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: T.muted, textTransform: 'uppercase', marginBottom: 6 },
  readBox: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, paddingHorizontal: 12 },
  readBoxOn: { backgroundColor: `${T.copper}0D`, borderColor: `${T.copper}66` },
  readInput: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '900', color: T.ink, fontFamily: MONO, paddingVertical: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null) },

  saveBtn: { height: 56, borderRadius: 14, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 6 },
  saveBtnOff: { backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },

  scanBtnFail: { backgroundColor: T.red, shadowColor: T.red },
  failBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: `${T.red}55`, backgroundColor: `${T.red}12` },
  failIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },
  failTitle: { fontSize: 13.5, fontWeight: '900', color: T.red },
  searchBox: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '700', color: T.ink, paddingVertical: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null) },
  footer: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  footerText: { fontSize: 12, fontWeight: '700', color: T.muted },
  delBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${T.red}12`, alignItems: 'center', justifyContent: 'center' },
  confirmBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: `${T.red}0F`, borderWidth: 1, borderColor: `${T.red}33` },
  confirmText: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: '800', color: T.red },
  confirmNo: { height: 32, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  confirmNoText: { fontSize: 12, fontWeight: '800', color: T.nav },
  confirmYes: { minWidth: 64, height: 32, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: T.red },
  confirmYesText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  okBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: `${T.green}55`, backgroundColor: `${T.green}12` },
  okIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  okTitle: { fontSize: 13.5, fontWeight: '900', color: T.green },
  okSub: { fontSize: 12, fontWeight: '700', color: T.ink, marginTop: 1 },

  filterHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  filterSummary: { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 12, fontWeight: '700', color: T.muted },
  filterTitle: { fontSize: 14, fontWeight: '900', color: T.nav },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 12 },
  err: { fontSize: 12.5, fontWeight: '700', color: T.red, marginTop: 12 },
  loadBtn: { height: 46, borderRadius: 12, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  loadText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },

  countCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: T.nav, marginBottom: 12 },
  countLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: '#ffffffAA' },
  countRange: { fontSize: 12.5, fontWeight: '700', color: '#fff', marginTop: 3 },
  countValue: { fontSize: 22, fontWeight: '900', color: '#fff', fontFamily: MONO },

  row: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, borderLeftColor: T.copper, padding: 12, marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowNo: { minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 13, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  rowNoText: { fontSize: 11, fontWeight: '900', color: T.copper },
  rowLabel: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6, color: T.muted },
  rowTaka: { fontSize: 13.5, fontWeight: '900', color: T.ink, fontFamily: MONO, marginTop: 1 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, height: 26, borderRadius: 13, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  datePillText: { fontSize: 11.5, fontWeight: '800', color: T.nav },
  rowInfo: { flexDirection: 'row', gap: 10, marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  infoK: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4, color: T.muted },
  infoV: { fontSize: 13.5, fontWeight: '800', color: T.ink, fontFamily: MONO, marginTop: 1 },
  rowDesign: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 8 },

  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20, backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border },
  emptyIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: T.nav, marginTop: 12 },
  emptyText: { fontSize: 12.5, fontWeight: '600', color: T.muted, textAlign: 'center', marginTop: 5 },
});
