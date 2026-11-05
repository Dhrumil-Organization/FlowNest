// FILE: src/components/DesignAuthorizationNEW/PartyHistorySheet.tsx
// NEW-theme port of legacy DesignAuthorization/PartyHistoryModal/PartyHistoryModal.tsx:
// two tabs — Parties (n) / History (n) — each with its own search (any field),
// party name header on history, credit-limit history cards with
// AUTHORISED / REJECTED / PENDING stamp.
// Legacy detail kept: only the History search is reset (when the Parties tab is
// opened); the Parties search is never reset (legacy compares against 'Active history').
import { TruncText } from '@/src/components/ui/TruncText';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Segment, Sheet } from '../StockVerificationNEW/ui';
import { authTone, PartyTab, Row, searchRows, str } from './model';

type Props = {
  visible: boolean;
  onClose: () => void;
  partyList: Row[];
  historyData: Row[];
  partyLoading: boolean;
  historyLoading: boolean;
  activeTab: PartyTab;
  setActiveTab: (t: PartyTab) => void;
  parname: string;
};

const TONE = {
  ok: { c: T.green, label: 'AUTHORISED' },
  rej: { c: T.red, label: 'REJECTED' },
  pend: { c: T.amber, label: 'PENDING' },
};

function KV({ k, v, color }: { k: string; v: any; color?: string }) {
  return (
    <View style={p.kvItem}>
      <TruncText style={p.kvK} numberOfLines={1}>{k}</TruncText>
      <Text style={[p.kvV, color ? { color } : null]}>{str(v) || '—'}</Text>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={p.empty}>
      <Icon name="inbox" size={30} color={T.muted} />
      <Text style={p.emptyText}>{text}</Text>
    </View>
  );
}

export default function PartyHistorySheet({
  visible, onClose, partyList, historyData, partyLoading, historyLoading, activeTab, setActiveTab, parname,
}: Props) {
  const [partyQ, setPartyQ] = useState('');
  const [historyQ, setHistoryQ] = useState('');

  useEffect(() => {
    if (activeTab === 'party') setHistoryQ('');
  }, [activeTab]);

  const parties = useMemo(() => searchRows(partyList, partyQ), [partyList, partyQ]);
  const history = useMemo(() => searchRows(historyData, historyQ), [historyData, historyQ]);
  const q = activeTab === 'party' ? partyQ : historyQ;
  const setQ = activeTab === 'party' ? setPartyQ : setHistoryQ;

  return (
    <Sheet open={visible} onClose={onClose} eyebrow="PARTY HISTORY" title={parname || 'Party history'} wideMax={760}>
      <Segment
        value={activeTab}
        onChange={(v) => setActiveTab(v as PartyTab)}
        options={[
          { value: 'party', label: `Parties (${partyList.length})` },
          { value: 'history', label: `History (${historyData.length})` },
        ]}
      />
      <View style={p.search}>
        <Icon name="search" size={18} color={T.muted} />
        <TextInput
          style={p.searchInput}
          placeholder={activeTab === 'party' ? 'Search Parties...' : 'Search History...'}
          placeholderTextColor={T.muted}
          value={q}
          onChangeText={setQ}
        />
      </View>

      {activeTab === 'party' ? (
        partyLoading ? (
          <ActivityIndicator size="large" color={T.copper} style={{ paddingVertical: 32 }} />
        ) : parties.length > 0 ? (
          parties.map((item, i) => (
            <View key={`${str(item.ParCode)}-${i}`} style={p.card}>
              <Text style={p.title}>{str(item.ParName)}</Text>
              <Text style={p.kvK}>Address</Text>
              <Text style={p.kvV}>{str(item.Address) || '—'}</Text>
            </View>
          ))
        ) : (
          <Empty text="No parties found!" />
        )
      ) : historyLoading ? (
        <ActivityIndicator size="large" color={T.copper} style={{ paddingVertical: 32 }} />
      ) : history.length > 0 ? (
        <>
          <TruncText style={p.parHead} numberOfLines={2}>{parname}</TruncText>
          {history.map((item, i) => {
            const tone = TONE[authTone(item.isauth)];
            const st = str(item.status);
            const stColor = st === 'Authorised' ? T.green : st === 'Rejected' ? T.red : undefined;
            return (
              <View key={`${str(item.uid)}-${i}`} style={[p.card, { borderLeftWidth: 4, borderLeftColor: item.isauth ? tone.c : T.border }]}>
                <View style={p.headRow}>
                  <TruncText style={[p.title, { flex: 1, minWidth: 0 }]} numberOfLines={1}>{str(item.prptypename)}</TruncText>
                  <Text style={p.date}>{str(item.date)}</Text>
                </View>
                {item.isauth ? (
                  <View style={[p.badge, { backgroundColor: `${tone.c}14`, borderColor: tone.c }]}>
                    <Text style={[p.badgeText, { color: tone.c }]}>{tone.label}</Text>
                  </View>
                ) : null}
                <View style={p.kv}>
                  <KV k="Old Limit" v={item.limit1} color={T.green} />
                  <KV k="Req. Limit" v={item.limit2} />
                  <KV k="Auth. Limit" v={item.limit3} color={T.blue} />
                  <KV k="Auth. Days" v={item.crday3} color={T.blue} />
                  <KV k="Old Cr. Days" v={item.crday1} color={T.green} />
                  <KV k="Req. Cr. Days" v={item.crday2} />
                  <KV k="Authorised Date" v={item.adate || 'N/A'} />
                  <KV k="Authorised By" v={item.ausrname || 'N/A'} />
                  <KV k="Status" v={item.status} color={stColor} />
                  <KV k="Revert Date" v={item.revertdate || 'N/A'} />
                </View>
                <View style={p.full}><Text style={p.kvK}>Remark</Text><Text style={p.kvV}>{str(item.remark) || '—'}</Text></View>
                <View style={p.full}><Text style={p.kvK}>Broker</Text><Text style={p.kvV}>{str(item.BrkAccName) || '—'}</Text></View>
                <View style={p.full}><Text style={p.kvK}>SExe</Text><Text style={p.kvV}>{str(item.sexename) || '—'}</Text></View>
              </View>
            );
          })}
        </>
      ) : (
        <Empty text="No history found!" />
      )}
    </Sheet>
  );
}

const p = StyleSheet.create({
  search: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: T.ink, height: 42 },
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: '800', color: T.nav },
  date: { fontSize: 11, fontWeight: '700', color: T.muted, backgroundColor: T.sub, borderWidth: 1, borderColor: T.hair, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  parHead: { fontSize: 13, fontWeight: '800', color: T.yd },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  kv: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  kvItem: { width: '50%', paddingRight: 8 },
  kvK: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kvV: { fontSize: 13, fontWeight: '700', color: T.ink, marginTop: 1 },
  full: { gap: 1 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyText: { fontSize: 13, color: T.muted },
});
