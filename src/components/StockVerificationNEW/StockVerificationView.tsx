// FILE: src/components/StockVerificationNEW/StockVerificationView.tsx
// ONE NEW-ERP screen used by Yarn Stock Verification and Fabric Stock
// Verification (config in YarnStockVerificationNEW / FabricStockVerificationNEW).
//
//   ┌ Filter card  Property · Year · Store · Stock type · Update stock      ┐
//   │              6 carton-status toggles (legacy colours)   [Load stock]  │
//   │ KPIs  total · verified · to verify · total wt  + progress              │
//   │ Status chips (tap = filter)   🔍 search every field   [Scan][+Manual] │
//   │ cards (virtualised, 1/2/3 columns)  → Verify (confirm) / Print         │
//   └ phone: sticky bottom bar with Scan / Manual entry                      ┘
//
// Behaviour = legacy screens (see verificationModel / verificationApi):
//   load  POST get_verify_manual_(fabric_)stock
//   verify POST update_verify_manual_(fabric_)stock  (confirm first)
//   print POST PRINTSTICKER
//   manual POST insert_verify_manual_(fabric_)stock → reload, inserted first
//   fabric scan: parseFabricQr → findFabricStockRow → verify / already /
//                not found → prefilled manual entry
// prptype is DYNAMIC (useBusinessContext().prpGroup → stored user_prptype).
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { showError, showSnackbar, showSuccess } from '@/common/utils/snackbar';
import { useBusinessContext } from '@/src/core/business';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import ManualEntrySheet from './ManualEntrySheet';
import QrScanSheet from './QrScanSheet';
import { Api, fetchProperties, insertManual, loadStock, printRow, verifyRow } from './verificationApi';
import {
  canPrint, canVerify, convDate, DEFAULT_FILTER, emptyManual, Filter, findFabricStockRow, FLAGS, fmt3,
  isAlreadyVerified, Manual, manualFromVerifyQr, mergeInserted, num, parseFabricQr, Row, rowKey, searchRows,
  STATUS_META, STATUS_ORDER, statusOf, StatusKey, STOCK_TYPES, str, validateFilter, VerifyConfig,
} from './verificationModel';
import { Btn, Opt, Segment, SelectField, Sheet, toOpts, u, useYearStore } from './ui';

type Props = { token: string; API: string; config: VerifyConfig };

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: "'DM Mono', monospace" });
const nowLabel = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const errText = (e: any) => `Server Error :${e?.message ? ` ${e.message}` : e}`;

export default function StockVerificationView({ token, API, config: cfg }: Props) {
  const fabric = cfg.kind === 'fabric';
  const { width } = useWindowDimensions();
  const phone = width < 720;
  const cols = width >= 1200 ? 3 : width >= 760 ? 2 : 1;

  /* ------------------------- dynamic prptype ----------------------------- */
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
  const prptypeResolved = !!prpGroup || storedPrptype !== null;

  const api: Api | null = useMemo(
    () => (token && API && prptype ? { API, token, prptype, cfg } : null),
    [API, token, prptype, cfg],
  );

  /* ---------------------------- properties ------------------------------- */
  const [props, setProps] = useState<Row[]>([]);
  const [propLoading, setPropLoading] = useState(false);
  const [propTick, setPropTick] = useState(0);
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const patchFilter = useCallback((p: Partial<Filter>) => setFilter((f) => ({ ...f, ...p })), []);

  useEffect(() => {
    if (!api) return;
    let alive = true;
    setPropLoading(true);
    fetchProperties(api)
      .then((r) => {
        if (!alive) return;
        setProps(r);
        const opts = r.filter((x) => str(x?.PrpCode) !== '');
        if (opts.length === 1) setFilter((f) => (f.PrpCode ? f : { ...f, PrpCode: str(opts[0].PrpCode) }));
      })
      .catch((e: any) => { if (alive) { setProps([]); console.log(`[${cfg.title}] get_criterion error`, e?.message); } })
      .finally(() => alive && setPropLoading(false));
    return () => { alive = false; };
  }, [api, propTick, cfg.title]);
  const propOpts: Opt[] = useMemo(() => toOpts(props, 'PrpCode', 'LngName'), [props]);
  const propName = (code: string) => propOpts.find((o) => o.value === code)?.label || code;

  const ys = useYearStore(api, filter.PrpCode, filter.YearNo,
    (y) => setFilter((f) => (f.YearNo ? f : { ...f, YearNo: y })),
    (s) => setFilter((f) => (f.StrCode ? f : { ...f, StrCode: s })));

  /* ------------------------------- stock --------------------------------- */
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState<Filter | null>(null); // filter the list was loaded with
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(true);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [inserted, setInserted] = useState<Row[]>([]);
  const [status, setStatus] = useState<StatusKey | 'all'>('all');
  const [query, setQuery] = useState('');

  const doLoad = useCallback(async () => {
    if (!api) return;
    const err = validateFilter(filter);
    if (err) { AppAlert.alert(err); return; }
    setLoading(true);
    setRows([]);
    try {
      const r = await loadStock(api, filter);
      if (r.ok) {
        setRows(r.data);
        setLoaded(filter);
        setLoadedAt(nowLabel());
        setFilterOpen(false);
        setStatus('all');
      } else {
        setLoaded(filter);
        AppAlert.alert(r.message);
      }
    } catch (e) {
      AppAlert.alert(errText(e));
    } finally {
      setLoading(false);
    }
  }, [api, filter]);

  /* ------------------------------- verify -------------------------------- */
  const [confirmRow, setConfirmRow] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);

  const doVerify = async () => {
    const row = confirmRow;
    if (!api || !row || !loaded) return;
    setBusy(true);
    try {
      const r = await verifyRow(api, loaded, row);
      if (r.ok) {
        setSaved((s) => {
          const n = new Set(s);
          if (str(r.data?.UId)) n.add(str(r.data.UId));
          if (str(row.UId)) n.add(str(row.UId));
          return n;
        });
        setRows((list) => list.map((x) => (x === row ? { ...x, Chk: '1' } : x)));
        setConfirmRow(null);
        showSuccess(cfg.verifiedMsg, { text: 'OK', onPress: () => {} });
      } else {
        setConfirmRow(null);
        AppAlert.alert(r.message);
      }
    } catch (e) {
      setConfirmRow(null);
      AppAlert.alert(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const doPrint = useCallback(async (row: Row, key: string) => {
    if (!api || !loaded) return;
    if (!row || !Object.keys(row).length) { showError('printing sticker data is empty', { text: 'OK', onPress: () => {} }); return; }
    setPrinting(key);
    const r = await printRow(api, loaded, row);
    setPrinting(null);
    if (r.ok) showSnackbar(`✅ ${r.data} label(s) sent to printer.`, 'success', { text: 'OK', onPress: () => {} });
    else showError(r.message, { text: 'OK', onPress: () => {} });
  }, [api, loaded]);

  /* ---------------------------- manual entry ----------------------------- */
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState<Manual>(emptyManual());
  const [savingManual, setSavingManual] = useState(false);

  const openManual = () => {
    setManual((m) => (m.PrpCode ? m : {
      ...m,
      PrpCode: filter.PrpCode, YearNo: filter.YearNo, StrCode: filter.StrCode,
      StkType: filter.StkType === 'P' ? 'P' : 'I',
    }));
    setManualOpen(true);
  };

  const doSaveManual = async () => {
    if (!api) return;
    setSavingManual(true);
    try {
      const r = await insertManual(api, manual);
      if (!r.ok) { AppAlert.alert(r.message); return; }
      const nextInserted = r.data.concat(inserted);
      setInserted(nextInserted);
      const ctx = { PrpCode: manual.PrpCode, YearNo: manual.YearNo, StrCode: manual.StrCode };
      const nextFilter: Filter = { ...filter, ...ctx };
      try {
        const fresh = await loadStock(api, filter, ctx);
        if (fresh.ok) setRows(mergeInserted(nextInserted, fresh.data));
        else {
          setRows(nextInserted);
          if (!fresh.empty) AppAlert.alert(fresh.message);
        }
      } catch (e) {
        setRows(nextInserted);
        AppAlert.alert(errText(e));
      }
      setFilter(nextFilter);
      setLoaded(nextFilter);
      setLoadedAt(nowLabel());
      setFilterOpen(false);
      setStatus('all');
      setQuery('');
      setManual(emptyManual({ ...ctx, StkType: manual.StkType }));
      setManualOpen(false);
      showSuccess(`${cfg.unit} ${manual.CartNo} saved.`, { text: 'OK', onPress: () => {} });
    } catch (e) {
      AppAlert.alert(errText(e));
    } finally {
      setSavingManual(false);
    }
  };

  /* ---------------------------- fabric scan ------------------------------ */
  const [scanOpen, setScanOpen] = useState(false);
  const openScan = () => {
    if (!rows.length) {
      AppAlert.alert('Load Stock First', 'Select property/year and load fabric stock before scanning a taka.');
      return;
    }
    setScanOpen(true);
  };
  const onVerifyScan = (raw: string) => {
    try {
      const qr = parseFabricQr(raw);
      const match = findFabricStockRow(rows, qr);
      setScanOpen(false);
      if (match) {
        if (isAlreadyVerified(match, saved)) {
          AppAlert.alert('Already Verified', `Taka ${match?.CartNo || qr.CartNo || ''} is already verified.`);
          return;
        }
        setConfirmRow(match);
        return;
      }
      setManual((prev) => manualFromVerifyQr(qr, prev, filter));
      AppAlert.alert(
        'Taka Not Found in System Stock',
        `Taka ${qr.CartNo || raw} is not in the loaded stock. Review the details and create a manual stock entry only if it is physically present.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Manual Entry', onPress: () => setManualOpen(true) },
        ],
      );
    } catch (_) {
      setScanOpen(false);
      AppAlert.alert('Invalid QR', 'This QR could not be read as a fabric/taka QR code.');
    }
  };

  /* ------------------------------ derived -------------------------------- */
  const stats = useMemo(() => {
    const c: Record<StatusKey, number> = { pending: 0, found: 0, manual: 0, repack: 0, notfound: 0, other: 0 };
    let wt = 0;
    rows.forEach((r) => { c[statusOf(r, saved)] += 1; wt += num(r.Wt); });
    return { c, wt, total: rows.length };
  }, [rows, saved]);

  const visible = useMemo(() => {
    const byStatus = status === 'all' ? rows : rows.filter((r) => statusOf(r, saved) === status);
    return searchRows(byStatus, query);
  }, [rows, saved, status, query]);

  const visibleWt = useMemo(() => visible.reduce((s, r) => s + num(r.Wt), 0), [visible]);
  const pct = stats.total ? Math.round((stats.c.found / stats.total) * 100) : 0;

  /* -------------------------------- UI ----------------------------------- */
  const filterReady = !validateFilter(filter);
  const loadedLabel = loaded
    ? `${propName(loaded.PrpCode)} · ${ys.yearOpts.find((o) => o.value === loaded.YearNo)?.label || loaded.YearNo} · ${ys.storeOpts.find((o) => o.value === loaded.StrCode)?.label || loaded.StrCode}`
    : '';

  const filterCard = (
    <View style={s.card}>
      <TouchableOpacity style={s.cardHead} onPress={() => setFilterOpen((o) => !o)} disabled={!loaded} accessibilityRole="button">
        <View style={s.headIcon}><Icon name="tune" size={18} color={T.copper} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>{filterOpen || !loaded ? 'SELECT STOCK TO VERIFY' : 'VERIFYING'}</Text>
          <Text style={s.cardTitle} numberOfLines={1}>
            {filterOpen || !loaded ? 'Property, year & store' : loadedLabel}
          </Text>
          {!filterOpen && loaded ? (
            <Text style={s.cardSub} numberOfLines={1}>
              {STOCK_TYPES.find((x) => x.value === loaded.StkType)?.label} · Update stock {loaded.updateStock === '1' ? 'ON' : 'OFF'}
              {loadedAt ? ` · loaded ${loadedAt}` : ''}
            </Text>
          ) : null}
        </View>
        {loaded && !filterOpen ? (
          <TouchableOpacity style={s.iconBtn} onPress={doLoad} disabled={loading} accessibilityLabel="Reload">
            {loading ? <ActivityIndicator size="small" color={T.nav} /> : <Icon name="refresh" size={20} color={T.nav} />}
          </TouchableOpacity>
        ) : null}
        {loaded ? <Icon name={filterOpen ? 'expand-less' : 'edit'} size={20} color={T.muted} /> : null}
      </TouchableOpacity>

      {filterOpen || !loaded ? (
        <View style={s.cardBody}>
          <View style={s.grid}>
            <SelectField label="Property" required value={filter.PrpCode} options={propOpts} loading={propLoading}
              onRefresh={() => setPropTick((t) => t + 1)}
              onChange={(v) => patchFilter({ PrpCode: v, YearNo: '', StrCode: '' })} />
            <SelectField label="Year" required value={filter.YearNo} options={ys.yearOpts} loading={ys.yLoading}
              onRefresh={ys.reloadYears} disabled={!filter.PrpCode} disabledHint="Select property first"
              onChange={(v) => patchFilter({ YearNo: v, StrCode: '' })} />
            <SelectField label="Store" required value={filter.StrCode} options={ys.storeOpts} loading={ys.sLoading}
              onRefresh={ys.reloadStores} disabled={!filter.YearNo} disabledHint="Select year first"
              onChange={(v) => patchFilter({ StrCode: v })} />
          </View>
          <View style={s.grid}>
            <Segment label="Stock type" required value={filter.StkType} options={STOCK_TYPES} onChange={(v) => patchFilter({ StkType: v })} />
            <View style={s.switchBox}>
              <View style={{ flex: 1 }}>
                <Text style={s.switchTitle}>Update stock?</Text>
                <Text style={s.switchSub}>{filter.updateStock === '1' ? 'Yes — verification updates stock' : 'No — only mark verification'}</Text>
              </View>
              <Switch
                value={filter.updateStock === '1'}
                onValueChange={(v: boolean) => patchFilter({ updateStock: v ? '1' : '0' })}
                trackColor={{ false: T.border, true: T.copper }}
                thumbColor="#fff"
              />
            </View>
          </View>
          <Text style={u.label}>{cfg.unit} status to include</Text>
          <View style={s.flags}>
            {FLAGS.map((fl) => {
              const on = filter[fl.key] === '1';
              return (
                <TouchableOpacity key={fl.key} style={[s.flag, on && s.flagOn]} onPress={() => patchFilter({ [fl.key]: on ? '0' : '1' } as Partial<Filter>)}
                  accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                  <View style={[s.flagDot, { backgroundColor: fl.color }]} />
                  <Text style={[s.flagText, on && { color: T.nav }]} numberOfLines={1}>{fl.label}</Text>
                  <Icon name={on ? 'check-box' : 'check-box-outline-blank'} size={18} color={on ? T.nav : T.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={s.loadRow}>
            {loaded ? <Btn label="Cancel" kind="ghost" onPress={() => { setFilter(loaded); setFilterOpen(false); }} style={{ flex: 1 }} /> : null}
            <Btn label={loading ? 'Loading…' : 'Load stock'} icon="cloud-download" onPress={doLoad} loading={loading} disabled={!api || !filterReady} style={{ flex: 2 }} />
          </View>
          {prptypeResolved && !prptype ? (
            <Text style={s.warn}>Property group (prptype) not found for this login — please re-login.</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const kpis = loaded ? (
    <View style={s.kpiWrap}>
      <View style={s.kpiRow}>
        <Kpi label={`${cfg.unit}s`} value={String(stats.total)} color={T.nav} />
        <Kpi label="Verified" value={String(stats.c.found)} color={STATUS_META.found.color} />
        <Kpi label="To verify" value={String(stats.c.pending)} color={STATUS_META.pending.color} />
        <Kpi label={`Total ${cfg.wtUnit}`} value={fmt3(stats.wt)} color={T.copper} mono />
      </View>
      <View style={s.progress}>
        <View style={[s.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={s.progressText}>{pct}% of loaded {cfg.unit.toLowerCase()}s found / verified</Text>
    </View>
  ) : null;

  const chips = loaded ? (
    <View style={s.chips}>
      <Chip label="All" count={stats.total} active={status === 'all'} color={T.nav} onPress={() => setStatus('all')} />
      {STATUS_ORDER.filter((k) => stats.c[k] > 0 || k === 'pending' || k === 'found').map((k) => (
        <Chip key={k} label={STATUS_META[k].short} count={stats.c[k]} active={status === k} color={STATUS_META[k].color}
          onPress={() => setStatus(status === k ? 'all' : k)} />
      ))}
    </View>
  ) : null;

  const actions = (
    <>
      {fabric ? <Btn label="Scan taka" icon="qr-code-scanner" onPress={openScan} style={phone ? { flex: 1 } : undefined} /> : null}
      <Btn label={fabric ? 'Manual entry' : 'Add carton'} icon="add-box" kind="copper" onPress={openManual} style={phone ? { flex: 1 } : undefined} />
    </>
  );

  const toolbar = loaded || !phone ? (
    <View style={s.toolbar}>
      {loaded ? <View style={s.search}>
        <Icon name="search" size={18} color={T.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={cfg.searchPlaceholder}
          placeholderTextColor={T.muted}
          style={s.searchInput}
          autoCorrect={false}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={18} color={T.muted} />
          </TouchableOpacity>
        ) : null}
      </View> : <View style={{ flex: 1 }} />}
      {!phone ? actions : null}
    </View>
  ) : null;

  const listInfo = loaded ? (
    <View style={s.listInfo}>
      <Text style={s.listInfoText}>
        {visible.length} of {stats.total} {cfg.unit.toLowerCase()}s · {fmt3(visibleWt)} {cfg.wtUnit}
      </Text>
      <View style={s.legend}>
        <Icon name="info-outline" size={14} color={T.muted} />
        <Text style={s.legendText}>Verify = {STATUS_META.pending.short.toLowerCase()} only · Print = verified</Text>
      </View>
    </View>
  ) : null;

  const header = (
    <View style={{ gap: 12 }}>
      {filterCard}
      {kpis}
      {chips}
      {toolbar}
      {listInfo}
    </View>
  );

  const empty = loading ? (
    <View style={s.empty}><ActivityIndicator color={T.copper} /><Text style={s.emptyText}>Loading stock…</Text></View>
  ) : !loaded ? (
    <View style={s.empty}>
      <Icon name="fact-check" size={42} color={T.border} />
      <Text style={s.emptyTitle}>Select property, year & store</Text>
      <Text style={s.emptyText}>Then press Load stock to start verifying {cfg.unit.toLowerCase()}s.</Text>
      {!phone ? null : <View style={{ height: 8 }} />}
    </View>
  ) : (
    <View style={s.empty}>
      <Icon name="inventory-2" size={42} color={T.border} />
      <Text style={s.emptyTitle}>{rows.length ? 'No match' : 'No Data Found'}</Text>
      <Text style={s.emptyText}>{rows.length ? 'Change the status chip or search text.' : `No ${cfg.unit.toLowerCase()}s for this selection. You can still add one manually.`}</Text>
    </View>
  );

  return (
    <View style={s.root}>
      <FlatList
        key={`cols-${cols}`}
        data={visible}
        numColumns={cols}
        keyExtractor={(r: Row, i: number) => rowKey(r, i)}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: 10 }}
        ListEmptyComponent={empty}
        columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
        contentContainerStyle={[s.content, phone && { paddingBottom: 96 }]}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item, index }: { item: Row; index: number }) => {
          const key = rowKey(item, index);
          return (
            <View style={{ flex: 1 / cols, marginBottom: 10 }}>
              <StockCard
                row={item}
                cfg={cfg}
                st={statusOf(item, saved)}
                verify={canVerify(item, saved)}
                print={canPrint(item, saved)}
                printing={printing === key}
                onVerify={() => setConfirmRow(item)}
                onPrint={() => doPrint(item, key)}
              />
            </View>
          );
        }}
      />

      {phone ? <View style={s.bottomBar}>{actions}</View> : null}

      {/* verify confirm */}
      <Sheet
        open={!!confirmRow}
        onClose={() => !busy && setConfirmRow(null)}
        eyebrow="CONFIRM"
        title={fabric ? 'Mark taka verified?' : 'Verify carton?'}
        wideMax={520}
        footer={(
          <>
            <Btn label="Cancel" kind="ghost" onPress={() => setConfirmRow(null)} disabled={busy} style={{ flex: 1 }} />
            <Btn label={fabric ? 'Mark verified' : 'Verify'} icon="verified" kind="copper" onPress={doVerify} loading={busy} style={{ flex: 2 }} />
          </>
        )}
      >
        {confirmRow ? (
          <>
            <View style={s.confirmHead}>
              <Text style={s.confirmNo}>{str(confirmRow.CartNo) || '—'}</Text>
              <Text style={s.confirmWt}>{fmt3(confirmRow.Wt)} {cfg.wtUnit}</Text>
            </View>
            <View style={s.kv}>
              <KV k="Item" v={confirmRow.ItmName} />
              {fabric ? <KV k="Design" v={confirmRow.DsnName} /> : <KV k="Merge" v={confirmRow.MerName} />}
              <KV k="Grade" v={confirmRow.GrdName} />
              <KV k="Shade" v={confirmRow.ShdName} />
              {!fabric ? <KV k="Chees" v={confirmRow.Chees} /> : null}
              <KV k={cfg.wtLabel} v={fmt3(confirmRow.Wt)} />
              <KV k="Stock type" v={confirmRow.StkType} />
            </View>
            {fabric ? (
              <View style={s.note}>
                <Icon name="info-outline" size={16} color={T.yd} />
                <Text style={s.noteText}>Marks this taka as physically found. System meter is not changed.</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </Sheet>

      <ManualEntrySheet
        open={manualOpen}
        api={api}
        filter={filter}
        propOpts={propOpts}
        propLoading={propLoading}
        onReloadProps={() => setPropTick((t) => t + 1)}
        value={manual}
        onChange={setManual}
        saving={savingManual}
        onSave={doSaveManual}
        onClose={() => !savingManual && setManualOpen(false)}
      />

      {fabric ? (
        <QrScanSheet
          visible={scanOpen}
          title="Scan taka to verify"
          subtitle="Place the taka QR inside the frame"
          footer="Scan only identifies the taka. Verification or manual stock entry still needs your confirmation."
          manualPlaceholder="Type taka no. / paste QR"
          onClose={() => setScanOpen(false)}
          onScanned={onVerifyScan}
        />
      ) : null}
    </View>
  );
}

/* ------------------------------ pieces ----------------------------------- */

function Kpi({ label, value, color, mono }: { label: string; value: string; color: string; mono?: boolean }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel} numberOfLines={1}>{label}</Text>
      <Text style={[s.kpiValue, { color }, mono && { fontFamily: MONO, fontSize: 15 }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function Chip({ label, count, active, color, onPress }: { label: string; count: number; active: boolean; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, active && { backgroundColor: color, borderColor: color }]} accessibilityState={{ selected: active }}>
      <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
      <View style={[s.chipCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
        <Text style={[s.chipCountText, active && { color: '#fff' }]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return (
    <View style={s.kvItem}>
      <Text style={s.kvK}>{k}</Text>
      <Text style={s.kvV} numberOfLines={2}>{str(v) || '—'}</Text>
    </View>
  );
}

const StockCard = memo(function StockCard({ row, cfg, st, verify, print, printing, onVerify, onPrint }: {
  row: Row; cfg: VerifyConfig; st: StatusKey; verify: boolean; print: boolean; printing: boolean;
  onVerify: () => void; onPrint: () => void;
}) {
  const meta = STATUS_META[st];
  const fabric = cfg.kind === 'fabric';
  const date = convDate(row.TranDate);
  const facts: [string, any][] = fabric
    ? [['Stk', row.StkType], ['Date', date], ['User', row.UsrCode], ['Auto', row.IsAuto]]
    : [['Chees', row.Chees], ['Denier', row.Denier], ['Stk', row.StkType], ['Date', date], ['User', row.UsrCode], ['Auto', row.IsAuto]];
  return (
    <View style={[s.item, { borderLeftColor: meta.border }]}>
      <View style={s.itemTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.itemEyebrow}>{cfg.unitNo.toUpperCase()}</Text>
          <Text style={s.itemNo} numberOfLines={1}>{str(row.CartNo) || '—'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[s.pill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
            <Icon name={meta.icon as any} size={12} color={meta.color} />
            <Text style={[s.pillText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={s.itemWt}>{fmt3(row.Wt)} <Text style={s.itemWtUnit}>{cfg.wtUnit}</Text></Text>
        </View>
      </View>

      <Text style={s.itemName} numberOfLines={2}>{str(row.ItmName) || '—'}</Text>
      <View style={s.tags}>
        {fabric ? <Tag k="Design" v={row.DsnName} /> : <Tag k="Merge" v={row.MerName} />}
        <Tag k="Grade" v={row.GrdName} />
        <Tag k="Shade" v={row.ShdName} />
      </View>
      <View style={s.facts}>
        {facts.map(([k, v]) => (str(v) ? (
          <Text key={k} style={s.fact}><Text style={s.factK}>{k} </Text>{str(v)}</Text>
        ) : null))}
      </View>
      {!fabric && str(row.TranName) ? <Text style={s.tran} numberOfLines={1}>{str(row.TranName)}</Text> : null}

      {verify || print ? (
        <View style={s.itemActions}>
          {verify ? <Btn label={fabric ? 'Mark verified' : 'Verify'} icon="verified" compact kind="copper" onPress={onVerify} style={{ flex: 1 }} /> : null}
          {print ? <Btn label="Print label" icon="print" compact kind="ghost" onPress={onPrint} loading={printing} style={{ flex: 1 }} /> : null}
        </View>
      ) : null}
    </View>
  );
});

function Tag({ k, v }: { k: string; v: any }) {
  if (!str(v)) return null;
  return (
    <View style={s.tag}>
      <Text style={s.tagK}>{k}</Text>
      <Text style={s.tagV} numberOfLines={1}>{str(v)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, width: '100%', maxWidth: 1400, alignSelf: 'center' },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  headIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FBF1E8', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: T.nav },
  cardSub: { fontSize: 12, color: T.muted, marginTop: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  cardBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 12, borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  switchBox: { flex: 1, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-end' },
  switchTitle: { fontSize: 13, fontWeight: '800', color: T.nav },
  switchSub: { fontSize: 11.5, color: T.muted, marginTop: 1 },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flag: { flexGrow: 1, flexBasis: 150, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 10, height: 40, backgroundColor: T.sub },
  flagOn: { backgroundColor: T.surface, borderColor: T.nav },
  flagDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)' },
  flagText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: T.muted },
  loadRow: { flexDirection: 'row', gap: 10 },
  warn: { fontSize: 12, color: T.red, fontWeight: '700' },
  kpiWrap: { backgroundColor: T.nav, borderRadius: 14, padding: 12, gap: 8 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.6, textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  progress: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: T.copper },
  progressText: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingLeft: 12, paddingRight: 6, borderRadius: 17, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  chipText: { fontSize: 12.5, fontWeight: '700', color: T.nav },
  chipCount: { minWidth: 24, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  chipCountText: { fontSize: 11.5, fontWeight: '800', color: T.nav },
  toolbar: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  search: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14, color: T.ink, height: 42 },
  listInfo: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  listInfoText: { fontSize: 12, fontWeight: '700', color: T.nav },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 11.5, color: T.muted },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: T.nav },
  emptyText: { fontSize: 13, color: T.muted, textAlign: 'center' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 12, backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  item: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 5, padding: 12, gap: 8 },
  itemTop: { flexDirection: 'row', gap: 10 },
  itemEyebrow: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 1 },
  itemNo: { fontSize: 20, fontWeight: '900', color: T.nav, fontFamily: MONO },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  pillText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4 },
  itemWt: { fontSize: 15, fontWeight: '800', color: T.copper, fontFamily: MONO },
  itemWtUnit: { fontSize: 11, color: T.muted },
  itemName: { fontSize: 14, fontWeight: '800', color: T.ink },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.sub, borderWidth: 1, borderColor: T.hair, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, maxWidth: '100%' },
  tagK: { fontSize: 10, fontWeight: '800', color: T.muted, textTransform: 'uppercase' },
  tagV: { fontSize: 12, fontWeight: '700', color: T.nav, flexShrink: 1 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
  fact: { fontSize: 12, color: T.ink, fontWeight: '600' },
  factK: { color: T.muted, fontWeight: '700' },
  tran: { fontSize: 11.5, color: T.muted, fontStyle: 'italic' },
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  confirmHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  confirmNo: { fontSize: 24, fontWeight: '900', color: T.nav, fontFamily: MONO },
  confirmWt: { fontSize: 16, fontWeight: '800', color: T.copper, fontFamily: MONO },
  kv: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  kvItem: { width: '50%', paddingRight: 8 },
  kvK: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kvV: { fontSize: 14, fontWeight: '700', color: T.ink, marginTop: 1 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 10, borderRadius: 10, backgroundColor: '#EEF4F8' },
  noteText: { flex: 1, fontSize: 12, color: T.yd, lineHeight: 17 },
});
