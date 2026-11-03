// FILE: src/components/YarnSalesOrderNEW/PartyStep.tsx
// Select Party (legacy components/YarnSalesOrder/PartyListScreen.tsx).
//   GET /api/accountbasic  -> party list (filtered on screen by code / name, as legacy)
//   GET /api/get_criterion fetch:'salesexe' -> executive names for parties without SExeName
// purpose 'new'     : the picked party starts a new order (opens the order summary)
// purpose 'replace' : the picked party goes back to the open order (rows are kept)
//                     — also used for the order's Sales Party (title 'Select Sales Party')
import { AppAlert } from '@/common/utils/appAlert';
import { Avatar, EmptyState, PanelHeader } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { errorMessage, fetchExecutives, fetchParties } from './api';
import { buildSelectedParty, filterParties, OrderCtx, Row } from './model';
import { Nav } from './nav';
import { CONTENT, ListSkeleton, PropertyChip, SearchInput, useCols } from './ui';

export type PartyParams = {
  ctx: OrderCtx;
  purpose: 'new' | 'replace';
  /** purpose 'replace': receives the picked party. */
  onPick?: (party: Row) => void;
  /** Header title / breadcrumb (default 'Select Party' / 'Change party'). */
  title?: string;
  crumb?: string;
};

type Props = { token: string; API: string; nav: Nav; params: PartyParams };

export default function PartyStep({ token, API, nav, params }: Props) {
  const { ctx, purpose, onPick, title, crumb } = params;
  const { cols } = useCols();
  const [search, setSearch] = useState('');
  const [parties, setParties] = useState<Row[]>([]);
  const [executives, setExecutives] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const loadParties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchParties(API, token, ctx);
      if (aliveRef.current) setParties(data);
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] party list error', error?.response?.data || error?.message);
      if (aliveRef.current) AppAlert.alert('Error', errorMessage(error, 'Unable to load party list'));
    } finally {
      if (aliveRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token]);

  const loadExecutive = useCallback(async () => {
    try {
      const data = await fetchExecutives(API, token, ctx);
      if (aliveRef.current) setExecutives(data);
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] executive list error', error?.response?.data || error?.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token]);

  useEffect(() => {
    if (!token) return;
    loadParties();
    loadExecutive();
  }, [token, loadParties, loadExecutive]);

  const filteredParties = useMemo(() => filterParties(parties, search), [parties, search]);

  const selectParty = (party: Row) => {
    const selectedPartyData = buildSelectedParty(party, executives);
    if (purpose === 'replace') {
      onPick?.(selectedPartyData);
      nav.forceBack();
      return;
    }
    nav.push('summary', { ctx, initialMode: 'ADD', uid: '0', party: selectedPartyData });
  };

  const renderItem = ({ item }: { item: Row }) => (
    <View style={[st.cell, cols > 1 && { width: `${100 / cols}%` as any }]}>
      <TouchableOpacity
        style={st.card}
        onPress={() => selectParty(item)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Party ${item.accountname}`}
      >
        <Avatar name={item.accountname} size={42} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.name} numberOfLines={2}>{item.accountname}</Text>
          <Text style={st.code} numberOfLines={1}>Party Code : {item.acccode}</Text>
          {item.Address ? <Text style={st.sub} numberOfLines={2}>{item.Address}</Text> : null}
          {item.SExeName ? (
            <View style={st.exe}>
              <Icon name="person-outline" size={13} color={T.muted} />
              <Text style={st.sub} numberOfLines={1}>{item.SExeName}</Text>
            </View>
          ) : null}
        </View>
        <Icon name="chevron-right" size={22} color={T.muted} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={st.root}>
      <PanelHeader
        onBack={nav.back}
        crumbs={['Yarn Sales Order', crumb || (purpose === 'replace' ? 'Change party' : 'New order')]}
        title={title || 'Select Party'}
        subtitle={loading ? undefined : `${filteredParties.length} of ${parties.length} parties`}
        right={<PropertyChip name={ctx.prpname} />}
      />
      <View style={[CONTENT, st.searchWrap]}>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search party name or code"
          onRefresh={loadParties}
          loading={loading}
        />
      </View>
      {loading && parties.length === 0 ? (
        <View style={[CONTENT, { paddingHorizontal: 12 }]}>
          <ListSkeleton rows={6} />
        </View>
      ) : (
        <FlatList
          key={`cols-${cols}`}
          data={filteredParties}
          numColumns={cols}
          keyExtractor={(item, index) => `${item.acccode}_${index}`}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadParties();
              }}
              tintColor={T.copper}
            />
          }
          contentContainerStyle={[CONTENT, st.listContent]}
          ListEmptyComponent={<EmptyState icon="groups" title="No party found" text="Try another name or party code." />}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  searchWrap: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6 },
  listContent: { paddingHorizontal: 7, paddingBottom: 28 },
  cell: { width: '100%', padding: 5 },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  name: { fontSize: 14.5, fontWeight: '800', color: T.ink },
  code: { fontSize: 12.5, fontWeight: '700', color: T.copper, marginTop: 2 },
  sub: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
  exe: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
