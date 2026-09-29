// FILE: src/screens/inquiryReport/InquiryReportView.tsx
// NEW ERP — Inquiry Report (inquiry conversion report).
// Replaces legacy components/InquiryReport (route `inquiry-report`).
//
// Same data + rules as legacy:
//   POST /api/get_users                      { prptype, yearno (current FY) }        -> users (user_id, user_name1)
//   GET  /api/inquiries/conversion-summary   { fromdate, todate (YYYY-MM-DD), yearno (from selected FY),
//                                              sexe: [user_id…], prptype, txntype:'mob_inquiry_report' }
//   GET  /api/inquiries/conversion-details   same params (of the LAST loaded report)
//                                              + conversion_status (Converted | HOLD | NotConverted)
//                                              + client_type (ExistingClient | NewClient | GrandTotal)
//   prptype = storage 'user_prptype'. Defaults: From = 1st of this month, To = today,
//   FY = current (April start), users = none (= all). FY list = current + 4 previous.
//   Breakdown hides a "NotConverted" row whose total is 0 (legacy rule).
//
// Fixes vs legacy: loads on open (legacy stayed blank until Load), user rows
// toggle one by one (legacy compared a missing field, so a tap cleared ALL),
// null-safe search, filters shown inline on wide screens.
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Btn, Card, DateField, EmptyState, ErrorBox, HIT, Loader, MONO, Pill, useWide, ViewShell } from '../inquiry/ui';

type Props = { token: string; API: string; username?: string };

type ConversionRow = { ConversionStatus: string; ExistingClient: number; NewClient: number; GrandTotal: number; Percentage: number };
type User = { user_id: string | number; user_name1: string };
type ClientType = 'ExistingClient' | 'NewClient' | 'GrandTotal';

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pad = (x: number) => String(x).padStart(2, '0');
const dmyOf = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
const dmyToIso = (dmy: string) => {
  const m = String(dmy).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : dmy;
};
const s = (v: any) => (v === null || v === undefined ? '' : String(v));

/** "2026-2027" — financial year starts in April. */
const currentFY = () => {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
};
const fyOptions = () => {
  const start = Number(currentFY().split('-')[0]);
  return Array.from({ length: 5 }, (_, i) => `${start - i}-${start - i + 1}`);
};
const fyYearNo = (fy: string) => fy.split('-')[1].substring(2);

const STATUS_CFG: Record<string, { icon: any; color: string; label: string }> = {
  Converted: { icon: 'check-circle', color: T.green, label: 'Converted' },
  HOLD: { icon: 'pause-circle-filled', color: T.amber, label: 'Hold' },
  NotConverted: { icon: 'cancel', color: T.red, label: 'Not Converted' },
  'Grand Total': { icon: 'bar-chart', color: T.blue, label: 'Grand Total' },
};
const cfgOf = (status: string) => STATUS_CFG[status] || { icon: 'info', color: T.muted, label: status };

const INQ_STATUS: Record<string, string> = { costed: T.green, pending_costing: T.amber };

export default function InquiryReportView({ token, API }: Props) {
  const { wide } = useWide();
  const client = useMemo(() => axios.create({
    baseURL: String(API || '').replace(/\/+$/, ''),
    timeout: 120000,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  }), [API, token]);

  const [prptype, setPrptype] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(dmyOf(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [toDate, setToDate] = useState(dmyOf(today));
  const [fy, setFy] = useState(currentFY());
  const [picked, setPicked] = useState<User[]>([]);
  const [userSheet, setUserSheet] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [rows, setRows] = useState<ConversionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ params: any; people: string; from: string; to: string } | null>(null);

  const [summary, setSummary] = useState<ConversionRow | null>(null);
  const [detail, setDetail] = useState<{ status: string; type: ClientType } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('user_prptype').then((v) => setPrptype(String(v || '').trim())).catch(() => setPrptype(''));
  }, []);

  // users (legacy: yearno = current FY, not the selected one)
  useEffect(() => {
    if (prptype === null || !token) return;
    let alive = true;
    setUsersLoading(true);
    client.post('/api/get_users', { prptype, yearno: fyYearNo(currentFY()) }, { headers: { 'X-Requested-with': 'XMLHttpRequest' } })
      .then((res) => { if (alive) setUsers(res.data?.success ? (res.data?.response?.data ?? []) : []); })
      .catch((e) => { if (alive) AppAlert.alert('Error', `Server error: ${e?.message}`); })
      .finally(() => { if (alive) setUsersLoading(false); });
    return () => { alive = false; };
  }, [client, prptype, token]);

  const reqId = useRef(0);
  const load = useCallback(async () => {
    if (prptype === null) return;
    const id = ++reqId.current;
    const params = {
      fromdate: dmyToIso(fromDate),
      todate: dmyToIso(toDate),
      yearno: fyYearNo(fy),
      sexe: picked.map((u) => u.user_id),
      prptype,
      txntype: 'mob_inquiry_report',
    };
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/api/inquiries/conversion-summary', { params });
      if (id !== reqId.current) return;
      if (res.data?.success === true) {
        setRows(Array.isArray(res.data?.data) ? res.data.data : []);
        setLoaded({ params, people: picked.map((u) => u.user_name1).join(', ') || 'All', from: fromDate, to: toDate });
        setFiltersOpen(false);
      } else {
        setError(res.data?.message || 'Unable to load report');
      }
    } catch (e: any) {
      if (id === reqId.current) setError(`Server error: ${e?.message}`);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [client, fromDate, toDate, fy, picked, prptype]);

  // load once on open with the default filters
  const first = useRef(true);
  useEffect(() => {
    if (prptype !== null && token && first.current) { first.current = false; void load(); }
  }, [prptype, token, load]);

  const grand = rows.find((r) => r.ConversionStatus === 'Grand Total');
  const byStatus = (k: string) => rows.find((r) => r.ConversionStatus === k);
  const breakdown = rows.filter((r) => r.ConversionStatus !== 'Grand Total' && !(r.ConversionStatus === 'NotConverted' && n(r.GrandTotal) === 0));

  const filters = (
    <Card title="Filters" style={wide ? s2.filterCardWide : undefined}>
      <View style={s2.filterGrid}>
        <View style={s2.fCol}><DateField label="From Date" value={fromDate} onChange={setFromDate} minToday={false} /></View>
        <View style={s2.fCol}><DateField label="To Date" value={toDate} onChange={setToDate} minToday={false} /></View>
      </View>
      <Text style={s2.label}>Financial Year</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
        {fyOptions().map((y) => (
          <TouchableOpacity key={y} onPress={() => setFy(y)} style={[s2.chip, fy === y && s2.chipOn]} activeOpacity={0.75}>
            <Text style={[s2.chipText, fy === y && { color: '#fff' }]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={s2.label}>Users</Text>
      <TouchableOpacity onPress={() => setUserSheet(true)} style={s2.userBox} activeOpacity={0.75}>
        <Icon name="people-outline" size={17} color={T.muted} />
        <Text style={[s2.userText, !picked.length && { color: T.muted }]} numberOfLines={1}>
          {picked.length ? picked.map((u) => u.user_name1).join(', ') : 'All users'}
        </Text>
        {picked.length > 0 && <Text style={s2.userCount}>{picked.length}</Text>}
        <Icon name="expand-more" size={18} color={T.muted} />
      </TouchableOpacity>
      <Btn title="Load Report" icon="refresh" variant="accent" onPress={load} loading={loading} style={{ marginTop: 10 }} />
    </Card>
  );

  const monthLabel = loaded
    ? (() => {
      const [dd, mm, yy] = loaded.from.split('-').map(Number);
      const d = new Date(yy, (mm || 1) - 1, dd || 1);
      return `${d.toLocaleString('en-IN', { month: 'long' }).toUpperCase()} ${d.getFullYear()}`;
    })()
    : '';

  return (
    <ViewShell
      title="Conversion Report"
      subtitle={loaded ? `${loaded.from.replace(/-/g, '/')} – ${loaded.to.replace(/-/g, '/')} · ${loaded.people}` : 'Inquiry conversion by status'}
      hideBack
      maxWidth={1200}
      right={!wide ? (
        <TouchableOpacity onPress={() => setFiltersOpen((v) => !v)} style={[s2.tune, filtersOpen && { backgroundColor: T.nav }]} hitSlop={HIT}>
          <Icon name="tune" size={18} color={filtersOpen ? '#fff' : T.ink} />
        </TouchableOpacity>
      ) : null}
    >
      <View style={[wide && s2.cols]}>
        {(wide || filtersOpen) && <View style={[wide && s2.side]}>{filters}</View>}

        <View style={[wide && s2.main]}>
          {!!error && <ErrorBox text={error} onRetry={load} />}
          {loading && !rows.length ? <Loader label="Loading report…" /> : !loaded ? (
            <EmptyState icon="insights" title="No report loaded" subtitle="Choose filters and tap Load Report" />
          ) : (
            <>
              <View style={s2.hero}>
                <View style={{ flex: 1 }}>
                  <Text style={s2.heroEyebrow}>{monthLabel}</Text>
                  <Text style={s2.heroTitle}>{n(grand?.GrandTotal)} inquiries</Text>
                  <Text style={s2.heroSub} numberOfLines={2}>Sales person: {loaded.people}</Text>
                </View>
                <Icon name="groups" size={34} color="rgba(255,255,255,0.35)" />
              </View>

              <View style={s2.kpiRow}>
                <Kpi label="CONVERTED" value={n(byStatus('Converted')?.GrandTotal)} color={T.green} />
                <Kpi label="TOTAL" value={n(grand?.GrandTotal)} color={T.blue} />
                <Kpi label="NOT CONVERTED" value={n(byStatus('NotConverted')?.GrandTotal)} color={T.red} />
                <Kpi label="HOLD" value={n(byStatus('HOLD')?.GrandTotal)} color={T.amber} />
              </View>

              <Text style={s2.section}>Breakdown</Text>
              {breakdown.length === 0 ? (
                <EmptyState icon="insights" title="No data" subtitle="Nothing found for these filters" />
              ) : (
                <View style={[wide && s2.grid]}>
                  {breakdown.map((r) => {
                    const c = cfgOf(r.ConversionStatus);
                    return (
                      <TouchableOpacity
                        key={r.ConversionStatus}
                        style={[s2.bCard, { borderLeftColor: c.color }, wide && s2.gridItem]}
                        onPress={() => setSummary(r)}
                        activeOpacity={0.8}
                      >
                        <View style={s2.bHead}>
                          <View style={[s2.bIcon, { backgroundColor: `${c.color}1A` }]}><Icon name={c.icon} size={20} color={c.color} /></View>
                          <View style={{ flex: 1 }}>
                            <Text style={s2.bTitle}>{c.label}</Text>
                            <Text style={s2.bHint}>Tap card for summary</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[s2.bTotal, { color: c.color }]}>{n(r.GrandTotal)}</Text>
                            <Pill label={`${n(r.Percentage)}%`} fg={c.color} bg={`${c.color}1A`} />
                          </View>
                        </View>
                        <View style={s2.track}><View style={[s2.fill, { width: `${Math.min(n(r.Percentage), 100)}%`, backgroundColor: c.color }]} /></View>
                        <View style={s2.cats}>
                          <CatChip label="Existing" value={n(r.ExistingClient)} color={T.blue} onPress={() => setDetail({ status: r.ConversionStatus, type: 'ExistingClient' })} />
                          <CatChip label="New" value={n(r.NewClient)} color={T.green} onPress={() => setDetail({ status: r.ConversionStatus, type: 'NewClient' })} />
                          <CatChip label="Total" value={n(r.GrandTotal)} color={T.nav} onPress={() => setDetail({ status: r.ConversionStatus, type: 'GrandTotal' })} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {!!grand && (
                <View style={s2.grand}>
                  <View style={{ flex: 1 }}>
                    <Text style={s2.grandLbl}>GRAND TOTAL</Text>
                    <Text style={s2.grandVal}>{n(grand.GrandTotal)} <Text style={s2.grandPct}>· {n(grand.Percentage)}%</Text></Text>
                  </View>
                  <View style={s2.grandChips}>
                    <Mini label="Existing" value={String(n(grand.ExistingClient))} />
                    <Mini label="New" value={String(n(grand.NewClient))} />
                    <Mini
                      label="Existing share"
                      value={n(grand.GrandTotal) ? `${((n(grand.ExistingClient) / n(grand.GrandTotal)) * 100).toFixed(1)}%` : '0%'}
                    />
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      <UserSheet
        visible={userSheet}
        users={users}
        loading={usersLoading}
        picked={picked}
        onChange={setPicked}
        onClose={() => setUserSheet(false)}
      />
      <SummaryModal row={summary} onClose={() => setSummary(null)} onOpen={(type) => { const r = summary!; setSummary(null); setDetail({ status: r.ConversionStatus, type }); }} />
      <DetailModal client={client} base={loaded?.params} target={detail} onClose={() => setDetail(null)} />
    </ViewShell>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[s2.kpi, { borderTopColor: color }]}>
      <Text style={s2.kpiLbl}>{label}</Text>
      <Text style={[s2.kpiVal, { color }]}>{value}</Text>
    </View>
  );
}

function CatChip({ label, value, color, onPress }: { label: string; value: number; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={(e: any) => { e?.stopPropagation?.(); onPress(); }} style={[s2.cat, { borderColor: `${color}55`, backgroundColor: `${color}0F` }]} activeOpacity={0.75}>
      <Text style={[s2.catLbl, { color }]}>{label}</Text>
      <Text style={[s2.catVal, { color }]}>{value}</Text>
      <Icon name="chevron-right" size={14} color={color} />
    </TouchableOpacity>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={s2.mini}>
      <Text style={s2.miniLbl}>{label}</Text>
      <Text style={s2.miniVal}>{value}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function UserSheet({ visible, users, loading, picked, onChange, onClose }: {
  visible: boolean; users: User[]; loading: boolean; picked: User[]; onChange: (u: User[]) => void; onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? users.filter((u) => s(u.user_name1).toLowerCase().includes(t) || s(u.user_id).toLowerCase().includes(t)) : users;
  }, [users, q]);
  const isOn = (u: User) => picked.some((p) => s(p.user_id) === s(u.user_id));
  const toggle = (u: User) => onChange(isOn(u) ? picked.filter((p) => s(p.user_id) !== s(u.user_id)) : [...picked, u]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s2.overlay}>
        <View style={[s2.sheet, { maxHeight: Math.round(height * 0.88) }, width >= 760 && { maxWidth: 560 }]}>
          <View style={s2.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={s2.sheetTitle}>Select Users</Text>
              <Text style={s2.sheetSub}>{picked.length ? `${picked.length} selected` : 'None selected = all users'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={21} color={T.muted} /></TouchableOpacity>
          </View>
          <View style={s2.search}>
            <Icon name="search" size={16} color={T.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search user…" placeholderTextColor={T.muted} style={s2.searchInput} autoCorrect={false} autoCapitalize="none" />
          </View>
          <View style={s2.sheetActions}>
            <TouchableOpacity onPress={() => onChange(list)} style={s2.linkBtn}><Icon name="done-all" size={15} color={T.blue} /><Text style={s2.linkText}>Select all{q ? ' (filtered)' : ''}</Text></TouchableOpacity>
            {picked.length > 0 && (
              <TouchableOpacity onPress={() => onChange([])} style={s2.linkBtn}><Icon name="clear-all" size={15} color={T.red} /><Text style={[s2.linkText, { color: T.red }]}>Clear</Text></TouchableOpacity>
            )}
          </View>
          {loading ? <Loader /> : (
            <FlatList
              data={list}
              keyExtractor={(u, i) => `${s(u.user_id)}-${i}`}
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
              initialNumToRender={25}
              ListEmptyComponent={<Text style={s2.emptyTxt}>No users found</Text>}
              renderItem={({ item }) => {
                const on = isOn(item);
                return (
                  <TouchableOpacity onPress={() => toggle(item)} style={[s2.uRow, on && { backgroundColor: `${T.copper}12` }]} activeOpacity={0.7}>
                    <Icon name={on ? 'check-box' : 'check-box-outline-blank'} size={20} color={on ? T.copper : T.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={s2.uName}>{item.user_name1}</Text>
                      <Text style={s2.uId}>{s(item.user_id)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
          <View style={{ padding: 12 }}><Btn title="Done" icon="check" onPress={onClose} /></View>
        </View>
      </View>
    </Modal>
  );
}

function SummaryModal({ row, onClose, onOpen }: { row: ConversionRow | null; onClose: () => void; onOpen: (t: ClientType) => void }) {
  if (!row) return null;
  const c = cfgOf(row.ConversionStatus);
  const total = n(row.GrandTotal);
  const ex = total ? (n(row.ExistingClient) / total) * 100 : 0;
  const nw = total ? (n(row.NewClient) / total) * 100 : 0;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s2.overlay}>
        <View style={[s2.sheet, { maxWidth: 460, padding: 16 }]}>
          <View style={[s2.bHead, { marginBottom: 12 }]}>
            <View style={[s2.bIcon, { backgroundColor: `${c.color}1A` }]}><Icon name={c.icon} size={22} color={c.color} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s2.bTitle}>{c.label}</Text>
              <Text style={s2.bHint}>Conversion summary</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={21} color={T.muted} /></TouchableOpacity>
          </View>
          <View style={s2.sumRow}>
            <View style={s2.sumBox}><Text style={s2.miniLbl}>Total Clients</Text><Text style={[s2.sumVal, { color: c.color }]}>{total}</Text></View>
            <View style={s2.sumBox}><Text style={s2.miniLbl}>Share of total</Text><Text style={[s2.sumVal, { color: c.color }]}>{n(row.Percentage)}%</Text></View>
          </View>
          <Text style={[s2.label, { marginTop: 12 }]}>Existing vs New</Text>
          <View style={s2.stack}>
            <View style={{ width: `${ex}%`, backgroundColor: T.blue }} />
            <View style={{ width: `${nw}%`, backgroundColor: T.green }} />
          </View>
          <View style={s2.cats}>
            <CatChip label="Existing" value={n(row.ExistingClient)} color={T.blue} onPress={() => onOpen('ExistingClient')} />
            <CatChip label="New" value={n(row.NewClient)} color={T.green} onPress={() => onOpen('NewClient')} />
            <CatChip label="All" value={total} color={T.nav} onPress={() => onOpen('GrandTotal')} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailModal({ client, base, target, onClose }: {
  client: any; base: any; target: { status: string; type: ClientType } | null; onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!target || !base) return;
    let alive = true;
    setData([]); setQ(''); setError(null); setLoading(true);
    client.get('/api/inquiries/conversion-details', {
      params: { ...base, conversion_status: target.status, client_type: target.type },
    })
      .then((res: any) => { if (!alive) return; if (res.data?.success) setData(res.data?.data ?? []); else setError(res.data?.message || 'No data'); })
      .catch((e: any) => { if (alive) setError(`Server error: ${e?.message}`); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [client, base, target]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return data;
    return data.filter((i) => [i.companyname, i.inquiry_no, i.status, i.city].some((v) => s(v).toLowerCase().includes(t)));
  }, [data, q]);

  if (!target) return null;
  const c = cfgOf(target.status);
  const typeLabel = { ExistingClient: 'Existing clients', NewClient: 'New clients', GrandTotal: 'All clients' }[target.type];
  const cols = width >= 1100 ? 3 : width >= 760 ? 2 : 1;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={s2.dTop}>
          <TouchableOpacity onPress={onClose} hitSlop={HIT} style={s2.dBack}><Icon name="arrow-back" size={20} color={T.ink} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s2.dTitle}>Inquiry Details</Text>
            <Text style={s2.dSub}>{c.label} · {typeLabel} · {list.length}</Text>
          </View>
        </View>
        <View style={[s2.search, { marginHorizontal: 12, marginTop: 10 }]}>
          <Icon name="search" size={16} color={T.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search company, inquiry no, status, city…" placeholderTextColor={T.muted} style={s2.searchInput} autoCorrect={false} />
        </View>
        {loading ? <Loader label="Loading inquiries…" /> : (
          <FlatList
            key={`c${cols}`}
            data={list}
            numColumns={cols}
            columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
            keyExtractor={(i, idx) => `${s(i.id)}-${idx}`}
            contentContainerStyle={{ padding: 12, paddingBottom: 40, maxWidth: 1200, width: '100%', alignSelf: 'center' }}
            ListHeaderComponent={error ? <ErrorBox text={error} /> : null}
            ListEmptyComponent={!error ? <EmptyState icon="inbox" title="No inquiries found" /> : null}
            renderItem={({ item }) => {
              const sc = INQ_STATUS[s(item.status)] || T.red;
              return (
                <View style={[s2.iCard, { flex: 1 / cols }]}>
                  <View style={s2.iHead}>
                    <Text style={s2.iNo}>{s(item.inquiry_no)}</Text>
                    <Pill label={s(item.status).replace(/_/g, ' ')} fg={sc} bg={`${sc}1A`} />
                  </View>
                  {!!item.ConversionStatus && <View style={{ marginBottom: 6 }}><Pill label={s(item.ConversionStatus).replace(/_/g, ' ')} fg="#fff" bg={T.yd} /></View>}
                  <Text style={s2.iCompany}>{s(item.companyname)}</Text>
                  {!!item.ClientType && <Text style={s2.iType}>{s(item.ClientType)}</Text>}
                  <Line icon="location-on" text={item.city} />
                  <Line icon="phone" text={item.Contact} />
                  <Line icon="person" text={item.executive} />
                  <Line icon="event" text={item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : ''} />
                  <Line icon="email" text={item.Email} />
                  <Line icon="description" text={item.requirements} />
                  <Line icon="notes" text={item.Notes} />
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

function Line({ icon, text }: { icon: any; text: any }) {
  if (!text) return null;
  return (
    <View style={s2.line}>
      <Icon name={icon} size={14} color={T.muted} />
      <Text style={s2.lineText}>{s(text)}</Text>
    </View>
  );
}

const s2 = StyleSheet.create({
  cols: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  side: { width: 320 },
  main: { flex: 1, minWidth: 0 },
  filterCardWide: {},
  filterGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  fCol: { flex: 1, minWidth: 130 },
  label: { fontSize: 11, fontWeight: '800', color: T.ink, marginBottom: 5 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, justifyContent: 'center' },
  chipOn: { backgroundColor: T.nav, borderColor: T.nav },
  chipText: { fontSize: 12, fontWeight: '800', color: T.ink, fontFamily: MONO },
  userBox: {
    flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 42, borderWidth: 1, borderColor: T.border,
    borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 11,
  },
  userText: { flex: 1, fontSize: 13, fontWeight: '700', color: T.ink },
  userCount: { fontSize: 11, fontWeight: '900', color: '#fff', backgroundColor: T.copper, borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  tune: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },

  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.nav, borderRadius: 14, padding: 16, marginBottom: 10 },
  heroEyebrow: { fontSize: 10.5, fontWeight: '900', color: T.copper, letterSpacing: 0.8 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', fontFamily: MONO, marginTop: 2 },
  heroSub: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpi: { flexGrow: 1, flexBasis: 130, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, borderTopWidth: 3, padding: 10 },
  kpiLbl: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.5 },
  kpiVal: { fontSize: 22, fontWeight: '900', fontFamily: MONO, marginTop: 2 },
  section: { fontSize: 12, fontWeight: '900', color: T.ink, marginBottom: 8, letterSpacing: 0.3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { flexBasis: '48%', flexGrow: 1 },
  bCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderLeftWidth: 5, borderRadius: 12, padding: 12, marginBottom: 10 },
  bHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  bTitle: { fontSize: 15, fontWeight: '900', color: T.ink },
  bHint: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  bTotal: { fontSize: 20, fontWeight: '900', fontFamily: MONO, marginBottom: 3 },
  track: { height: 6, borderRadius: 3, backgroundColor: T.alt, overflow: 'hidden', marginVertical: 10 },
  fill: { height: 6, borderRadius: 3 },
  cats: { flexDirection: 'row', gap: 6 },
  cat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 9, borderWidth: 1 },
  catLbl: { fontSize: 11.5, fontWeight: '800' },
  catVal: { fontSize: 13, fontWeight: '900', fontFamily: MONO },
  grand: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.blue, borderRadius: 12, padding: 12 },
  grandLbl: { fontSize: 10, fontWeight: '900', color: T.blue, letterSpacing: 0.6 },
  grandVal: { fontSize: 20, fontWeight: '900', color: T.ink, fontFamily: MONO },
  grandPct: { fontSize: 14, color: T.muted },
  grandChips: { flexDirection: 'row', gap: 6 },
  mini: { backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 74 },
  miniLbl: { fontSize: 9.5, fontWeight: '900', color: T.muted },
  miniVal: { fontSize: 14, fontWeight: '900', color: T.ink, fontFamily: MONO, marginTop: 1 },

  overlay: { flex: 1, backgroundColor: 'rgba(13,27,42,0.5)', justifyContent: 'center', padding: 14 },
  sheet: { backgroundColor: T.bg, borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 560, alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontSize: 15, fontWeight: '900', color: T.ink },
  sheetSub: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 42, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 10, margin: 12, marginBottom: 6 },
  searchInput: { flex: 1, fontSize: 13, color: T.ink, paddingVertical: 0 },
  sheetActions: { flexDirection: 'row', gap: 14, paddingHorizontal: 14, paddingBottom: 6 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  linkText: { fontSize: 12, fontWeight: '900', color: T.blue },
  uRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.hair, borderRadius: 6 },
  uName: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  uId: { fontSize: 11, fontWeight: '600', color: T.muted, fontFamily: MONO },
  emptyTxt: { textAlign: 'center', color: T.muted, fontWeight: '600', paddingVertical: 20 },
  sumRow: { flexDirection: 'row', gap: 8 },
  sumBox: { flex: 1, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 10 },
  sumVal: { fontSize: 22, fontWeight: '900', fontFamily: MONO, marginTop: 2 },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: T.alt, marginBottom: 10 },

  dTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingTop: 16, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  dBack: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
  dTitle: { fontSize: 15.5, fontWeight: '900', color: T.ink },
  dSub: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  iCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  iHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  iNo: { fontSize: 14, fontWeight: '900', color: T.ink, fontFamily: MONO },
  iCompany: { fontSize: 14, fontWeight: '900', color: T.yd },
  iType: { fontSize: 11.5, fontWeight: '700', color: T.muted, marginBottom: 4 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  lineText: { flex: 1, fontSize: 12, fontWeight: '600', color: T.ink },
});
