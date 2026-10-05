// FILE: src/components/ProductionReportNEW/index.tsx
// NEW ERP — Production Report (replaces the legacy screen).
// Legacy source : components/ProductionReport/index.tsx (repo root — the live one; NOT src/components/ProductionReport)
//                 + common/API/Functions.tsx (fetchPropertyData / fetchAllYeardata / fetchAllStoredata)
// Legacy route  : app/(tabs)/production-report.tsx (passed token, username)
// Endpoints (same as legacy, host = `API` prop, Bearer = `token` prop — full payloads in ./api.ts):
//   GET  /api/getproperty            params null                                  -> response.data   (first row = default property)
//   GET  /api/getyear                { prpcode }                                  -> response.data   (first row = default year)
//   GET  /api/getstore               { prpcode, yearno, txntype:'', prptype }     -> response.data   (first row = default store)
//   GET  /api/get_criterion          fetch 'macgrp' | 'macsgrp' | 'machine', txntype 'mob_production_report'
//                                    -> response.data (MacGrp/MGrpName, MacSGrp/MSGrpName, MacCode/MacName)
//   POST /api/prodproductionreport   action 'report'      -> data (rows: uid, vouno, voudate, mgrpname, msgrpname, macname,
//                                                            itmname, mername, prodorderqty, doffqty, packingqty)
//   POST /api/prodproductionreport   action 'packinginfo' -> data (rows: grdname, qty)
// AsyncStorage keys: get_property (read + write), user_prptype (read).
//
// Behaviour kept exactly as legacy:
//   * Property -> Year -> Store default chain, each step after a 2 s delay; stores reload only when the YEAR NAME changes.
//   * Type default 'running' (All = -1, Running = 0, Closed = 2); dates empty by default (sent as '').
//   * Machine group / sub group / machine lists are fetched every time the field is tapped (validations
//     "Please select property" / "Please select yaer" / "Please select store"), the picker opens even when the
//     fetch fails, and an empty/failed fetch keeps the previously loaded list. Changing a parent selection does
//     not clear the children.
//   * Nothing is loaded on mount — the report loads on the criteria "OK" button, which also closes the sheet
//     (even when a validation fails). Warnings: No Data Found / <server message> / Server Error.
//   * 'report' sends dates built from toISOString(), 'packinginfo' from the local date (as legacy).
//   * (i) on Packing re-fetches the grade split every time it is opened; the open card is tracked by vou no.
// Deliberate deviations (display only):
//   * Legacy top bar / back button removed (global AppHeader); the filter icon is the toolbar "Filters" button.
//   * Balance "NaN" (blank qty) is shown as a number treating blank as 0 — see model.balance.
//   * Legacy compared `expandedId === item.vouno` (string vs raw value) so the grade table never opened when
//     vouno was numeric; compared as strings here.
//   * Multi-select pickers use the shared SearchableMultiSelectModal (Apply / Cancel instead of live toggling +
//     Done; Apply needs >= 1 item, so the field has a clear (x) to empty a selection).
import { PlatformDatePicker } from '@/common/PlatformDatePicker';
import { AppAlert } from '@/common/utils/appAlert';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Btn, EmptyState, PickField, Segment, Sheet, Toolbar } from '../erpUi';
import SearchableMultiSelectModal from '../ui/SearchableMultiSelectModal';
import SearchablePickerModal from '../ui/SearchablePickerModal';
import {
  CriterionBase,
  fetchMachineGroups,
  fetchMachines,
  fetchMachineSubGroups,
  fetchProperties,
  fetchStores,
  fetchYears,
  postPackingInfo,
  postReport,
  ProductionType,
  ReportCriteria,
  Row,
  statusOf,
} from './api';
import { balance, formatDate, formatDateForAPI, formatFull, hasProperty, isoDateForReport, matchesSearch } from './model';

type Props = { token: string; API: string; username?: string };
type PickerKey = 'property' | 'year' | 'store' | 'macgrp' | 'macsgrp' | 'machine';

const LEGACY_DELAY_MS = 2000; // legacy wrapped the property / year / store loads in setTimeout(…, 2000)

const TYPE_OPTS: { value: ProductionType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'closed', label: 'Closed' },
];

const showWarning = (msg: string) => AppAlert.alert('Warning', msg);
const isBlank = (v: any) => typeof v == 'undefined' || v == null || v == '';
const names = (list: Row[], key: string) => (list && list.map((i) => i[key]).join(', ')) || '';

export default function ProductionReportNEW({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [picker, setPicker] = useState<PickerKey | null>(null);
  const [fetching, setFetching] = useState<PickerKey | null>(null);

  const [propertyData, setPropertyData] = useState<Row[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Row | null>(null);
  const [yearOptions, setYearOptions] = useState<Row[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [storeData, setStoreData] = useState<Row[]>([]);
  const [selectedStore, setSelectedStore] = useState<Row | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [productionType, setProductionType] = useState<ProductionType>('running');

  const [machineGroups, setMachineGroups] = useState<Row[]>([]);
  const [machineSubGroups, setMachineSubGroups] = useState<Row[]>([]);
  const [machines, setMachines] = useState<Row[]>([]);
  const [selectedMachineGroups, setSelectedMachineGroups] = useState<Row[]>([]);
  const [selectedMachineSubGroups, setSelectedMachineSubGroups] = useState<Row[]>([]);
  const [selectedMachines, setSelectedMachines] = useState<Row[]>([]);

  const [allData, setAllData] = useState<Row[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [infoData, setInfoData] = useState<Record<string, Row[]>>({});

  /* ----------------------- property -> year -> store chain ----------------------- */
  useEffect(() => {
    if (!token) return;
    let dead = false;
    const t = setTimeout(async () => {
      const data = await fetchProperties(API, token);
      if (dead) return;
      setPropertyData(data || []);
      if (data?.length) setSelectedProperty(data[0]);
    }, LEGACY_DELAY_MS);
    return () => { dead = true; clearTimeout(t); };
  }, [token, API]);

  useEffect(() => {
    if (!token) return;
    if (!hasProperty(selectedProperty)) return;
    let dead = false;
    const t = setTimeout(async () => {
      const allyeardata = await fetchYears(API, token, selectedProperty?.PrpCode);
      if (dead) return;
      setYearOptions(allyeardata);
      // legacy: setSelectedYear(allyeardata[0].YearName) — threw on an empty list, leaving the year unchanged
      if (allyeardata[0]) setSelectedYear(allyeardata[0].YearName);
    }, LEGACY_DELAY_MS);
    return () => { dead = true; clearTimeout(t); };
  }, [selectedProperty, token, API]);

  useEffect(() => {
    if (!token) return;
    if (!hasProperty(selectedProperty) || isBlank(selectedYear)) return;
    let dead = false;
    const t = setTimeout(async () => {
      const yearno = selectedYear?.slice(-2);
      const allstoredata = await fetchStores(API, token, selectedProperty?.PrpCode, yearno);
      if (dead) return;
      setStoreData(allstoredata);
      setSelectedStore(allstoredata[0] ?? null);
    }, LEGACY_DELAY_MS);
    return () => { dead = true; clearTimeout(t); };
    // legacy dependency list: [selectedYear, token] — a property change alone does NOT reload the stores
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, token]);

  /* ------------------------------ criteria values -------------------------------- */
  const prpCode = selectedProperty ? selectedProperty?.PrpCode : '';
  const yearNo = selectedYear?.slice(-2) ? selectedYear?.slice(-2) : '';
  const strCode = selectedStore ? selectedStore?.StrCode : '';
  const macGrp = selectedMachineGroups && selectedMachineGroups.length > 0 ? selectedMachineGroups.map((i) => i.MacGrp) : [];
  const macSGrp = selectedMachineSubGroups && selectedMachineSubGroups.length > 0 ? selectedMachineSubGroups.map((i) => i.MacSGrp) : [];
  const macCode = selectedMachines && selectedMachines.length > 0 ? selectedMachines.map((i) => i.MacCode) : [];

  /** legacy validation order + messages (shared by the 3 criterion loaders and the report) */
  const validate = () => {
    if (isBlank(prpCode)) { showWarning('Please select property'); return false; }
    if (isBlank(yearNo)) { showWarning('Please select yaer'); return false; }
    if (isBlank(strCode)) { showWarning('Please select store'); return false; }
    return true;
  };

  const base = (): CriterionBase => ({ prpcode: prpCode, yearno: yearNo, strcode: strCode, productiontype: statusOf(productionType) });

  const openMachineGroups = async () => {
    if (fetching) return;
    if (!validate()) return;
    setFetching('macgrp');
    const list = await fetchMachineGroups(API, token, base());
    if (list) setMachineGroups(list);
    setFetching(null);
    setPicker('macgrp');
  };

  const openMachineSubGroups = async () => {
    if (fetching) return;
    if (!validate()) return;
    setFetching('macsgrp');
    const list = await fetchMachineSubGroups(API, token, base(), macGrp);
    if (list) setMachineSubGroups(list);
    setFetching(null);
    setPicker('macsgrp');
  };

  const openMachines = async () => {
    if (fetching) return;
    if (!validate()) return;
    setFetching('machine');
    const list = await fetchMachines(API, token, base(), macGrp, macSGrp);
    if (list) setMachines(list);
    setFetching(null);
    setPicker('machine');
  };

  const criteria = (fromdate: string, todate: string): ReportCriteria => ({
    prpcode: prpCode,
    yearno: selectedYear ? selectedYear?.slice(-2) : '',
    strcode: strCode,
    macgrp: macGrp,
    macsgrp: macSGrp,
    maccode: macCode,
    fromdate,
    todate,
    productiontype: statusOf(productionType),
  });

  /* ---------------------------------- report ------------------------------------- */
  const fetchData = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await postReport(API, token, criteria(isoDateForReport(fromDate), isoDateForReport(toDate)));
      if (data.success === true && data.data.length === 0) {
        showWarning('No Data Found');
        setAllData([]);
      } else if (data.success === true && data.data.length > 0) {
        setAllData(data.data);
      } else {
        showWarning(`${data.message}`);
        setAllData([]);
      }
    } catch (error) {
      setAllData([]);
      showWarning('Server Error');
    } finally {
      setLoading(false);
    }
  };

  const getInfoData = async (row: Row = {}): Promise<Row[]> => {
    try {
      const data = await postPackingInfo(API, token, criteria(formatDateForAPI(fromDate), formatDateForAPI(toDate)), row);
      if (data.success === true && data.data.length > 0) return data.data;
      return [];
    } catch (error) {
      return [];
    } finally {
      setLoading(false); // as legacy
    }
  };

  const handleInfoPress = async (item: Row) => {
    const id = String(item.vouno);
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setLoadingId(id);
    const result = await getInfoData(item);
    setInfoData((prev) => ({ ...prev, [id]: result }));
    setLoadingId(null);
    setExpandedId(id);
  };

  /* --------------------------------- derived ------------------------------------- */
  const filteredData = useMemo(() => allData.filter((item) => matchesSearch(item, search)), [allData, search]);

  const propertyOpts = useMemo(
    () => (propertyData || []).map((p) => ({ value: String(p.PrpCode ?? ''), label: String(p.LngName ?? '') })),
    [propertyData],
  );
  const yearOpts = useMemo(() => (yearOptions || []).map((y) => ({ value: String(y.YearName ?? ''), label: String(y.YearName ?? '') })), [yearOptions]);
  const storeOpts = useMemo(() => (storeData || []).map((x) => ({ value: String(x.StrCode ?? ''), label: String(x.StrName ?? '') })), [storeData]);
  const grpOpts = useMemo(() => (machineGroups || []).map((x) => ({ value: String(x.MacGrp), label: String(x.MGrpName ?? '') })), [machineGroups]);
  const sgrpOpts = useMemo(() => (machineSubGroups || []).map((x) => ({ value: String(x.MacSGrp), label: String(x.MSGrpName ?? '') })), [machineSubGroups]);
  const macOpts = useMemo(() => (machines || []).map((x) => ({ value: String(x.MacCode), label: String(x.MacName ?? '') })), [machines]);

  const grpValues = useMemo(() => selectedMachineGroups.map((i) => String(i.MacGrp)), [selectedMachineGroups]);
  const sgrpValues = useMemo(() => selectedMachineSubGroups.map((i) => String(i.MacSGrp)), [selectedMachineSubGroups]);
  const macValues = useMemo(() => selectedMachines.map((i) => String(i.MacCode)), [selectedMachines]);

  /** picked codes -> row objects (from the loaded list, else the rows that were already selected) */
  const resolve = (values: string[], list: Row[], prev: Row[], key: string) =>
    values
      .map((v) => list.find((x) => String(x[key]) === v) || prev.find((x) => String(x[key]) === v))
      .filter(Boolean) as Row[];

  const chips = [
    { icon: 'business', text: selectedProperty?.LngName || 'Select property' },
    { icon: 'event-note', text: selectedYear || 'Year' },
    { icon: 'store', text: selectedStore?.StrName || 'Select Store' },
    { icon: 'tune', text: TYPE_OPTS.find((o) => o.value === productionType)?.label || '' },
    ...(fromDate ? [{ icon: 'event', text: `From ${formatFull(fromDate)}` }] : []),
    ...(toDate ? [{ icon: 'event', text: `To ${formatFull(toDate)}` }] : []),
  ];
  const filterCount = selectedMachineGroups.length + selectedMachineSubGroups.length + selectedMachines.length;

  const dateField = (label: string, value: Date | null, onChange: (d: Date) => void) => (
    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      {Platform.OS === 'web' ? (
        <PlatformDatePicker value={value} onChange={onChange} placeholder={label} formatFull={formatFull} />
      ) : (
        <View style={s.dateBox}>
          <Icon name="event" size={17} color={T.copper} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <PlatformDatePicker
              value={value}
              onChange={onChange}
              placeholder={label}
              style={s.dateTouch}
              textStyle={[s.dateText, !value && { color: T.muted, fontWeight: '600' }]}
              formatFull={formatFull}
            />
          </View>
        </View>
      )}
    </View>
  );

  const empty = loading ? (
    <View style={s.loadingBox}>
      <ActivityIndicator color={T.copper} />
      <Text style={s.loadingText}>Loading report…</Text>
    </View>
  ) : (
    <EmptyState
      icon="assessment"
      title="No data found"
      text={allData.length ? 'Change the search text.' : 'Open Filters, choose the criteria and press OK to load the report.'}
      action={allData.length ? undefined : <Btn label="Filters" icon="tune" kind="copper" onPress={() => setFilterVisible(true)} />}
    />
  );

  return (
    <View style={s.root}>
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search here..."
        onFilters={() => setFilterVisible(true)}
        filterCount={filterCount}
        chips={chips}
        onChipPress={() => setFilterVisible(true)}
      />

      <FlatList
        key={`cols-${cols}`}
        data={filteredData}
        numColumns={cols}
        keyExtractor={(_: Row, index: number) => index.toString()}
        columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          allData.length > 0 ? (
            <View style={s.listHead}>
              <Text style={s.listInfo} numberOfLines={1}>
                {search ? `${filteredData.length} of ${allData.length} records` : `${allData.length} records`}
              </Text>
              {loading ? <ActivityIndicator size="small" color={T.copper} /> : null}
            </View>
          ) : null
        }
        ListEmptyComponent={empty}
        renderItem={({ item }: { item: Row }) => {
          const id = String(item.vouno);
          return (
            <View style={{ flex: 1 / cols, marginBottom: 10, minWidth: 0 }}>
              <ReportCard
                item={item}
                busy={loadingId === id}
                open={expandedId === id}
                grades={infoData[id]}
                onInfo={() => handleInfoPress(item)}
              />
            </View>
          );
        }}
      />

      {/* ------------------------------ criteria sheet ------------------------------ */}
      <Sheet
        open={filterVisible}
        onClose={() => setFilterVisible(false)}
        eyebrow="CRITERIA"
        title="Production report"
        wideMax={560}
        footer={
          <Btn
            label="OK"
            icon="check"
            kind="copper"
            style={{ flex: 1 }}
            onPress={() => {
              fetchData();
              setFilterVisible(false);
            }}
          />
        }
      >
        <PickField
          label="Property"
          icon="business"
          value={selectedProperty?.LngName}
          placeholder="Select property"
          onPress={() => setPicker('property')}
        />

        <View style={[s.pair, phone && width < 380 && { flexDirection: 'column' }]}>
          <PickField
            label="Year"
            value={selectedYear}
            placeholder="Year"
            onPress={() => setPicker('year')}
            style={{ flex: 0.4, minWidth: 0 }}
          />
          <PickField
            label="Store"
            value={selectedStore?.StrName}
            placeholder="Select Store"
            onPress={() => setPicker('store')}
            style={{ flex: 0.6, minWidth: 0 }}
          />
        </View>

        <View style={[s.pair, phone && width < 380 && { flexDirection: 'column' }]}>
          {dateField('From date', fromDate, setFromDate)}
          {dateField('To date', toDate, setToDate)}
        </View>

        <Segment label="Select type" value={productionType} options={TYPE_OPTS} onChange={setProductionType} />

        <PickField
          label="Machine group"
          value={names(selectedMachineGroups, 'MGrpName')}
          placeholder="Select machine group"
          onPress={openMachineGroups}
          loading={fetching === 'macgrp'}
          onClear={() => setSelectedMachineGroups([])}
        />
        <PickField
          label="Machine sub group"
          value={names(selectedMachineSubGroups, 'MSGrpName')}
          placeholder="Select machine sub group"
          onPress={openMachineSubGroups}
          loading={fetching === 'macsgrp'}
          onClear={() => setSelectedMachineSubGroups([])}
        />
        <View>
          <PickField
            label="Machine"
            value={names(selectedMachines, 'MacName')}
            placeholder="Select machine"
            onPress={openMachines}
            loading={fetching === 'machine'}
            onClear={() => setSelectedMachines([])}
          />

          {/* pickers live inside the sheet so they stack above it on iOS / Android / web */}
          <SearchablePickerModal
            visible={picker === 'property'}
            title="Select Property"
            placeholder="Search property..."
            options={propertyOpts}
            selectedValue={String(selectedProperty?.PrpCode ?? '')}
            onClose={() => setPicker(null)}
            onSelect={(o) => {
              const row = propertyData.find((p) => String(p.PrpCode ?? '') === o.value);
              if (row) setSelectedProperty(row);
            }}
          />
          <SearchablePickerModal
            visible={picker === 'year'}
            title="Select Year"
            placeholder="Search year..."
            options={yearOpts}
            selectedValue={selectedYear}
            onClose={() => setPicker(null)}
            onSelect={(o) => {
              const row = yearOptions.find((y) => String(y.YearName ?? '') === o.value);
              if (row) setSelectedYear(row.YearName);
            }}
          />
          <SearchablePickerModal
            visible={picker === 'store'}
            title="Select Store"
            placeholder="Search store..."
            options={storeOpts}
            selectedValue={String(selectedStore?.StrCode ?? '')}
            onClose={() => setPicker(null)}
            onSelect={(o) => {
              const row = storeData.find((x) => String(x.StrCode ?? '') === o.value);
              if (row) setSelectedStore(row);
            }}
          />
          <SearchableMultiSelectModal
            visible={picker === 'macgrp'}
            title="Select machine group"
            placeholder="Search machine group..."
            options={grpOpts}
            selectedValues={grpValues}
            onClose={() => setPicker(null)}
            onApply={(v) => setSelectedMachineGroups(resolve(v, machineGroups, selectedMachineGroups, 'MacGrp'))}
          />
          <SearchableMultiSelectModal
            visible={picker === 'macsgrp'}
            title="Select machine sub group"
            placeholder="Search machine sub group..."
            options={sgrpOpts}
            selectedValues={sgrpValues}
            onClose={() => setPicker(null)}
            onApply={(v) => setSelectedMachineSubGroups(resolve(v, machineSubGroups, selectedMachineSubGroups, 'MacSGrp'))}
          />
          <SearchableMultiSelectModal
            visible={picker === 'machine'}
            title="Select machine"
            placeholder="Search machine..."
            options={macOpts}
            selectedValues={macValues}
            onClose={() => setPicker(null)}
            onApply={(v) => setSelectedMachines(resolve(v, machines, selectedMachines, 'MacCode'))}
          />
        </View>
      </Sheet>
    </View>
  );
}

/* ------------------------------------------------------------------------------- */

function Stat({ label, value, color, right }: { label: string; value: any; color?: string; right?: React.ReactNode }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
      <View style={s.statValueRow}>
        <Text style={[s.statValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        {right}
      </View>
    </View>
  );
}

function ReportCard({
  item, busy, open, grades, onInfo,
}: {
  item: Row; busy: boolean; open: boolean; grades?: Row[]; onInfo: () => void;
}) {
  const leftTotal = balance(item.prodorderqty, item.doffqty);
  const rightTotal = balance(item.prodorderqty, item.packingqty);
  return (
    <View style={[s.card, S.card]}>
      <View style={s.cardTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.quality} numberOfLines={2}>{item.itmname}</Text>
          {item.mername ? <Text style={s.merge} numberOfLines={1}>{item.mername}</Text> : null}
        </View>
        <View style={s.badge}>
          <Text style={s.badgeText} numberOfLines={1}>{item.vouno}</Text>
        </View>
      </View>

      <View style={s.body}>
        <View>
          <Text style={s.machine} numberOfLines={2}>{item.macname}</Text>
          <Text style={s.group} numberOfLines={2}>
            GROUP : {item.mgrpname} | SUB GROUP : {item.msgrpname}
          </Text>
        </View>

        <View style={s.statsRow}>
          <Stat label="Order" value={item.prodorderqty} />
          <Stat label="Doff" value={item.doffqty} />
          <Stat
            label="Packing"
            value={item.packingqty || 0}
            right={
              <TouchableOpacity
                onPress={onInfo}
                style={[s.infoBtn, open && { backgroundColor: T.nav, borderColor: T.nav }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Packing grade details"
              >
                <Icon name="info-outline" size={18} color={open ? '#fff' : T.nav} />
              </TouchableOpacity>
            }
          />
        </View>

        <View style={s.statsRow}>
          <Stat label="Order − Doff" value={leftTotal} color={parseFloat(leftTotal) < 0 ? T.red : T.green} />
          <View style={{ flex: 1 }} />
          <Stat label="Order − Packing" value={rightTotal} color={parseFloat(rightTotal) < 0 ? T.red : T.green} />
        </View>

        <View style={s.footer}>
          <Icon name="event" size={14} color={T.muted} />
          <Text style={s.footerDate}>{formatDate(item.voudate)}</Text>
        </View>

        {open ? (
          <View style={s.table}>
            {grades && grades.length > 0 ? (
              <>
                <View style={s.thRow}>
                  <Text style={[s.th, { flex: 1 }]}>Grade</Text>
                  <Text style={[s.th, { width: 100, textAlign: 'right' }]}>Qty</Text>
                </View>
                {grades.map((row, index) => (
                  <View key={index} style={[s.tdRow, index % 2 === 0 && { backgroundColor: T.sub }]}>
                    <Text style={[s.td, { flex: 1, minWidth: 0 }]}>{row.grdname}</Text>
                    <Text style={[s.td, { width: 100, textAlign: 'right', fontWeight: '800' }]} numberOfLines={1}>{row.qty}</Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={s.noData}>No grade details found</Text>
            )}
          </View>
        ) : null}

        {busy ? (
          <View style={s.cardLoader}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={s.cardLoaderText}>Loading details...</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, width: '100%', maxWidth: 1200, alignSelf: 'center', flexGrow: 1 },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  listInfo: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '700', color: T.nav },
  loadingBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  loadingText: { fontSize: 13, fontWeight: '700', color: T.muted },

  // criteria sheet
  pair: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  dateBox: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  dateTouch: { minHeight: 42, justifyContent: 'center' },
  dateText: { fontSize: 14, fontWeight: '700', color: T.ink },

  // card
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.nav, paddingHorizontal: 12, paddingVertical: 10 },
  quality: { fontSize: 14.5, fontWeight: '800', color: '#fff' },
  merge: { fontSize: 12, fontWeight: '600', color: T.border, marginTop: 2 },
  badge: { maxWidth: '45%', backgroundColor: T.copper, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11.5, fontWeight: '800', color: '#fff' },
  body: { padding: 12, gap: 10 },
  machine: { fontSize: 15, fontWeight: '800', color: T.ink },
  group: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minWidth: 0, backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.hair, paddingHorizontal: 8, paddingVertical: 7 },
  statLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, marginTop: 2 },
  statValue: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '800', color: T.nav },
  infoBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 8 },
  footerDate: { fontSize: 12, fontWeight: '700', color: T.muted },

  // grade table
  table: { borderWidth: 1, borderColor: T.border, borderRadius: 10, overflow: 'hidden', backgroundColor: T.surface },
  thRow: { flexDirection: 'row', backgroundColor: T.nav, paddingVertical: 9 },
  th: { color: '#fff', fontWeight: '800', fontSize: 12, paddingHorizontal: 10, letterSpacing: 0.3 },
  tdRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.hair },
  td: { fontSize: 13, fontWeight: '600', color: T.ink, paddingHorizontal: 10 },
  noData: { textAlign: 'center', paddingVertical: 18, fontSize: 13, color: T.muted },
  cardLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: `${T.surface}CC`, alignItems: 'center', justifyContent: 'center', gap: 8 },
  cardLoaderText: { fontSize: 13, fontWeight: '800', color: T.nav },
});
