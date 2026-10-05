// FILE: src/components/NewAccountRequestNEW/index.tsx
// NEW ERP — New Account Request (replaces legacy components/NewAccountRequest,
// legacy route app/(tabs)/new-account-request.tsx which passed token, isConnected={true}, username).
//
// Legacy sources ported (nothing is imported from the legacy folders):
//   components/NewAccountRequest/index.tsx                       → index.tsx + api.ts + model.ts
//   components/NewAccountRequest/PartyHistoryModal/…Modal.tsx    → NOT ported: the legacy screen never imports or
//                                                                  renders it (dead file).
//   Shared/PdfViewerScreenMain.tsx (target of legacy router.push('/(tabs)/pdf-view')) → PdfStep.tsx (in-screen step)
//
// Endpoints (host = `API` prop, `Authorization: Bearer <token prop>`), details in api.ts:
//   POST ${API}/api/accountreqauthbrowse     { txntype:'newaccountrequest', referrer:'dashboard' }
//                                            → response.data.response.data (each row gets a random uid)
//   GET  ${API}/api/accountreqauthsingle     row (minus uid) + { CrLimit:<indian format of row.CrLimit>, CrDay:row.CrDay||'0',
//                                            IsAuth: 1 accept / 2 reject, referrer:'dashboard', txntype:'newaccountrequest',
//                                            action:'edit' }  → response.data.success / .message
//   POST ${API}/api/new_account_reuest_print { prpcode, yearno, accname:AccName, printTypes:['new_account_request'],
//                                            printFormat:'one' } → response.data.results.new_account_request (pdf url)
//   GET  ${API}/api/get_criterion            present in api.ts for parity only — unreachable in legacy (no button calls it).
//
// AsyncStorage keys: none.
//
// Behaviour kept exactly as legacy:
//   · load on mount / token change; error → alert 'Error' / 'Server error'; no data → empty list.
//   · search = any value of the row contains the query (case-insensitive).
//   · Credit Days / Credit Limit are editable on the card (limit re-formatted en-IN while typing) but, as in legacy,
//     the edited values are NOT sent: the payload uses the row's own CrLimit / CrDay.
//   · confirm → 'Loading...' → server message for 2 s; on success the card moves to the end of the list stamped
//     APPROVED / REJECTED, is disabled, and the list scrolls to the end after 300 ms; on failure the confirm
//     buttons come back after 2 s (message `response.data.message || 'Success'`, catch → 'Server Error').
//   · PDF button: disabled for every card while a print request runs; error → alert 'Error' / err.message ||
//     'Failed to fetch/preview PDF'; the viewer opens even when the url is missing (shows 'Unable to load PDF').
//
// Deliberate deviations:
//   · No own header / footer; the legacy HeaderBar search became the in-screen search box; the legacy one-option
//     tab bar ("New Account Request") is shown as a count chip.
//   · `isConnected` prop dropped (legacy route always passed true).
//   · PDF preview is an in-screen step (Android hardware back returns to the list) instead of router.push to the
//     legacy '/(tabs)/pdf-view' route.
//   · Display fix: while the confirm request runs legacy printed `Party: {selectedItem.parname}` (a field the browse
//     rows do not show anywhere else → "Party: undefined"); it now falls back to AccName.
//   · Display only: the PDF spinner shows on the pressed card (legacy swapped every card's icon for a spinner).
import { AppAlert } from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Btn, Sheet } from '../erpUi';
import { Api, authAccountRequest, browseAccountRequests, printAccountRequest } from './api';
import { Action, applyEdit, authPayload, EditMap, formatToIndianCurrency, makeUid, Row, searchRows, str } from './model';
import PdfStep from './PdfStep';

type Props = { token: string; API: string; username?: string };

export default function NewAccountRequestNEW({ token, API }: Props) {
  const api: Api = useMemo(() => ({ API, token }), [API, token]);
  const { width } = useWindowDimensions();
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;

  /* ------------------------------ state -------------------------------- */
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<Row[]>([]);
  const [editableValues, setEditableValues] = useState<EditMap>({});

  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [selectedItem, setSelectedItem] = useState<Row | null>(null);
  const [getSuccess, setSuccess] = useState(false);
  const [responsemessage, setresponsemessage] = useState('');

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUid, setPdfUid] = useState('');
  const [pdfStep, setPdfStep] = useState<{ url: string } | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; timers.current.forEach(clearTimeout); };
  }, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  /* ----------------------------- browse -------------------------------- */
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const rows = await browseAccountRequests(api);
      if (!alive.current) return;
      setData(rows.map((item: Row) => ({ ...item, uid: makeUid() })));
    } catch (error) {
      if (alive.current) AppAlert.alert('Error', 'Server error');
    } finally {
      if (alive.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredData = useMemo(() => searchRows(data, searchQuery), [data, searchQuery]);

  /* ---------------------------- actions -------------------------------- */
  const handleEdit = (uid: string, field: 'CrLimit' | 'CrDay', text: string) =>
    setEditableValues((prev) => applyEdit(prev, uid, field, text));

  const handleIconPress = (item: Row, action: Action) => {
    setSelectedItem(item);
    setSelectedAction(action);
    setShowOverlay(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedItem || !selectedAction) return;
    const payload = authPayload(selectedItem, selectedAction);

    setSuccess(true);
    setresponsemessage('Loading...');

    try {
      const response = await authAccountRequest(api, payload);
      if (response.data.success) {
        setresponsemessage(response.data.message || 'Success');
        later(() => {
          setSuccess(false);
          setShowOverlay(false);
        }, 2000);
        setData((prevData) => {
          const newData = prevData.filter((item) => item.uid !== selectedItem.uid);
          newData.push({ ...selectedItem, isProcessed: true, actionType: selectedAction });
          return newData;
        });
        later(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
      } else {
        setresponsemessage(response.data.message || 'Success');
        later(() => setSuccess(false), 2000);
      }
    } catch (error) {
      setresponsemessage('Server Error');
      later(() => setSuccess(false), 2000);
    }
  };

  // legacy handleCallURL
  const handleCallURL = async (item: Row) => {
    setSelectedItem(item);
    setPdfUid(str(item.uid));
    setPdfLoading(true);
    try {
      const pdfUrl = await printAccountRequest(api, item);
      if (alive.current) setPdfStep({ url: str(pdfUrl) });
    } catch (err: any) {
      console.error('handleCallURL error:', err);
      AppAlert.alert('Error', err?.message || 'Failed to fetch/preview PDF');
    } finally {
      if (alive.current) setPdfLoading(false);
    }
  };

  // Android hardware back: leave the PDF step first
  useEffect(() => {
    if (!pdfStep) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPdfStep(null);
      return true;
    });
    return () => sub.remove();
  }, [pdfStep]);

  /* ----------------------------- render -------------------------------- */
  const processed = useMemo(() => data.filter((r) => r.isProcessed).length, [data]);

  const renderCard = ({ item }: { item: Row }) => {
    const uid = str(item.uid);
    const done = !!item.isProcessed;
    const accepted = item.actionType === 'accept';
    const rejected = item.actionType === 'reject';
    const accent = accepted ? T.green : rejected ? T.red : T.border;
    const pdfBusy = pdfLoading && pdfUid === uid;
    return (
      <View style={{ width: `${100 / cols}%` as any, padding: 6 }}>
        <View style={[s.card, { borderLeftColor: accent }, done && { borderColor: `${accent}66`, borderLeftColor: accent }]}>
          <View style={s.cardTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.eyebrow} numberOfLines={1}>{str(item.prptypename)}</Text>
              <Text style={s.title} numberOfLines={3}>{str(item.AccName)}</Text>
            </View>
            {done ? (
              <View style={[s.badge, { backgroundColor: `${accepted ? T.green : T.red}14`, borderColor: accepted ? T.green : T.red }]}>
                <Text style={[s.badgeText, { color: accepted ? T.green : T.red }]} numberOfLines={1}>
                  {accepted ? 'APPROVED' : 'REJECTED'}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={s.kv}>
            <KV k="Main Head" v={item.MLngName || 'N/A'} />
            <KV k="Sub Head" v={item.SLngName || 'N/A'} />
            <KV k="UsrCode" v={item.UsrCode || 'N/A'} />
            <KV k="Group" v={item.GrpCode || 'N/A'} />
            <View style={s.kvItem}>
              <Text style={s.kvK} numberOfLines={1}>Credit Days</Text>
              <TextInput
                style={s.input}
                value={editableValues[uid]?.CrDay !== undefined ? editableValues[uid].CrDay : str(item.CrDay)}
                onChangeText={(text) => handleEdit(uid, 'CrDay', text)}
                keyboardType="numeric"
                placeholder={String(item.CrDay)}
                placeholderTextColor={T.muted}
              />
            </View>
            <View style={s.kvItem}>
              <Text style={s.kvK} numberOfLines={1}>Credit Limit</Text>
              <TextInput
                style={s.input}
                value={
                  editableValues[uid]?.CrLimit !== undefined
                    ? editableValues[uid].CrLimit
                    : formatToIndianCurrency(item.CrLimit || '0')
                }
                onChangeText={(text) => handleEdit(uid, 'CrLimit', text)}
                keyboardType="numeric"
              />
            </View>
            <KV k="Sales Executive" v={item.SExeName || 'N/A'} />
            <KV k="Collection Executive" v={item.CExeNam || 'N/A'} />
          </View>

          <View>
            <Text style={s.kvK}>Address</Text>
            <Text style={s.kvV}>{str(item.Address)}</Text>
          </View>

          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actBtn, s.approve, done && s.disabled]}
              disabled={done}
              onPress={() => handleIconPress(item, 'accept')}
              accessibilityRole="button"
              accessibilityLabel="Accept"
            >
              <Icon name="check" size={16} color="#fff" />
              <Text style={[s.actText, { color: '#fff' }]} numberOfLines={1}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actBtn, s.reject, done && s.disabled]}
              disabled={done}
              onPress={() => handleIconPress(item, 'reject')}
              accessibilityRole="button"
              accessibilityLabel="Reject"
            >
              <Icon name="close" size={16} color={T.red} />
              <Text style={[s.actText, { color: T.red }]} numberOfLines={1}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.pdfBtn, (done || (pdfLoading && !pdfBusy)) && s.disabled]}
              disabled={done || pdfLoading}
              onPress={() => { if (!done) handleCallURL(item); }}
              accessibilityRole="button"
              accessibilityLabel="View PDF"
            >
              {pdfBusy ? <ActivityIndicator size="small" color={T.blue} /> : <Icon name="file-present" size={20} color={T.blue} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const isAccept = selectedAction === 'accept';
  const partyName = getSuccess
    ? str(selectedItem?.parname) || str(selectedItem?.AccName)
    : str(selectedItem?.AccName);

  return (
    <View style={s.root}>
      <View style={s.top}>
        <View style={s.search}>
          <Icon name="search" size={18} color={T.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search account request..."
            placeholderTextColor={T.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Clear search">
              <Icon name="close" size={16} color={T.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={s.chips}>
          <View style={s.chip}>
            <Text style={s.chipText} numberOfLines={1}>New Account Request</Text>
            <View style={s.chipCount}>
              <Text style={s.chipCountText}>{searchQuery ? `${filteredData.length}/${data.length}` : data.length}</Text>
            </View>
          </View>
          {processed ? (
            <View style={s.chip}>
              <Icon name="done-all" size={14} color={T.green} />
              <Text style={s.chipText} numberOfLines={1}>Processed</Text>
              <View style={s.chipCount}><Text style={s.chipCountText}>{processed}</Text></View>
            </View>
          ) : null}
        </View>
      </View>

      <FlatList
        key={`cols-${cols}`}
        ref={flatListRef}
        data={filteredData}
        numColumns={cols}
        renderItem={renderCard}
        keyExtractor={(item, i) => str(item.uid) || `row-${i}`}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <Icon name="person-add-alt-1" size={34} color={T.muted} />
              <Text style={s.emptyText}>No account request data found!</Text>
            </View>
          ) : null
        }
      />

      {isLoading ? (
        <View style={s.loader} pointerEvents="auto">
          <View style={s.loaderBox}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={s.loaderText}>Loading...</Text>
          </View>
        </View>
      ) : null}

      {/* legacy confirm overlay: buttons, or the running / result message for 2 s */}
      <Sheet
        open={showOverlay}
        onClose={() => setShowOverlay(false)}
        eyebrow="NEW ACCOUNT REQUEST"
        title={isAccept ? 'Confirm Accept' : 'Confirm Reject'}
        wideMax={460}
        footer={
          getSuccess ? null : (
            <>
              <Btn label="Cancel" icon="close" kind="ghost" onPress={() => setShowOverlay(false)} style={{ flex: 1 }} />
              <Btn
                label={isAccept ? 'Accept' : 'Reject'}
                icon="check"
                kind={isAccept ? 'primary' : 'danger'}
                onPress={handleConfirmAction}
                style={[{ flex: 1 }, isAccept && { backgroundColor: T.green }]}
              />
            </>
          )
        }
      >
        <View>
          <Text style={s.kvK}>Party</Text>
          <Text style={s.confirmName}>{partyName || '-'}</Text>
        </View>
        {getSuccess ? (
          responsemessage === 'Loading...' ? (
            <View style={s.respRow}>
              <ActivityIndicator size="small" color={T.copper} />
              <Text style={s.respText}>{responsemessage}</Text>
            </View>
          ) : (
            <Text style={s.respText}>{responsemessage}</Text>
          )
        ) : null}
      </Sheet>

      {pdfStep ? <PdfStep pdfUrl={pdfStep.url} title="New Account Request" onBack={() => setPdfStep(null)} /> : null}
    </View>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return (
    <View style={s.kvItem}>
      <Text style={s.kvK} numberOfLines={1}>{k}</Text>
      <Text style={s.kvV} numberOfLines={2}>{str(v)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  top: { padding: 12, paddingBottom: 6, gap: 10, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  search: {
    minWidth: 0, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1,
    borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: T.ink, height: 42 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 10, borderRadius: 16,
    borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, maxWidth: '100%',
  },
  chipText: { fontSize: 12.5, fontWeight: '700', color: T.nav, flexShrink: 1 },
  chipCount: { minWidth: 24, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  chipCountText: { fontSize: 11.5, fontWeight: '800', color: T.nav },
  list: { paddingHorizontal: 6, paddingBottom: 24, width: '100%', maxWidth: 1212, alignSelf: 'center', flexGrow: 1 },
  card: {
    flex: 1, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4,
    padding: 12, gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 14.5, fontWeight: '800', color: T.nav, marginTop: 1 },
  badge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, maxWidth: '40%' },
  badgeText: { fontSize: 10.5, fontWeight: '800' },
  kv: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  kvItem: { width: '50%', paddingRight: 8, minWidth: 0 },
  kvK: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kvV: { fontSize: 13, fontWeight: '600', color: T.ink, marginTop: 1 },
  input: {
    height: 40, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.sub, paddingHorizontal: 10,
    paddingVertical: 0, fontSize: 14, fontWeight: '700', color: T.blue, marginTop: 4, minWidth: 0,
  },
  actions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 10 },
  actBtn: { flex: 1, minWidth: 0, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approve: { backgroundColor: T.green },
  reject: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.red },
  pdfBtn: {
    width: 44, height: 40, borderRadius: 10, borderWidth: 1, borderColor: `${T.blue}55`, backgroundColor: `${T.blue}10`,
    alignItems: 'center', justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  actText: { fontSize: 13, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyText: { fontSize: 13.5, color: T.muted, textAlign: 'center', fontWeight: '600' },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.bg}8C` },
  loaderBox: {
    backgroundColor: T.surface, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 26, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: T.border,
  },
  loaderText: { fontSize: 13, fontWeight: '700', color: T.nav },
  confirmName: { fontSize: 16, fontWeight: '800', color: T.nav, marginTop: 2 },
  respRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  respText: { fontSize: 14, fontWeight: '700', color: T.nav },
});
